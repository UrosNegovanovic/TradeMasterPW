import { test as setup, expect, Page } from '@playwright/test';
import { clerk } from '@clerk/testing/playwright';
import { createClerkClient } from '@clerk/backend';
import { env, hasClerkKeys, hasUserCredentials, requireEnv } from '../../config/env';
import { STORAGE_STATE, STORAGE_STATE_B, STORAGE_STATE_VAT } from '../../playwright.config';
import { TENANT_COMPANY, TENANT_NAMES, tenantEmail, tenantStorageState } from '../../config/tenants';

setup.skip(!hasClerkKeys() || !hasUserCredentials(), 'Clerk keys and E2E_USER_EMAIL/E2E_USER_PASSWORD are required (see .env.example)');

/** Creates the Clerk user when missing (Development instance only), without a password. */
async function ensureClerkUser(email: string, lastName: string) {
  const clerkApi = createClerkClient({ secretKey: requireEnv('clerkSecretKey') });
  const { data } = await clerkApi.users.getUserList({ emailAddress: [email] });
  if (data.length === 0) {
    await clerkApi.users.createUser({ emailAddress: [email], firstName: 'E2E', lastName, skipPasswordRequirement: true });
  }
}

// emailAddress flow: Clerk Backend API creates a sign-in ticket (needs CLERK_SECRET_KEY),
// so the password + OTP (client trust) steps of the UI flow are not needed.
async function signInAndSave(page: Page, email: string, storagePath: string) {
  await page.goto('/');
  await clerk.signIn({ page, emailAddress: email });
  // /settings is where a brand-new profile is redirected anyway; going there directly avoids an aborted navigation.
  await page.goto('/settings');
  await expect(page).toHaveURL(/\/settings/);
  await page.context().storageState({ path: storagePath });
}

/** Makes the company profile deterministic: invoice tests need a PIB, and VAT tests need inVatSystem. */
async function configureCompany(page: Page, data: Record<string, unknown>) {
  await page.goto('/settings');
  await page.waitForFunction(() => (window as any).Clerk?.session);
  const status = await page.evaluate(async (body) => {
    const token = await (window as any).Clerk.session.getToken();
    // GET first: the profile is created lazily and PUT 404s until it exists.
    await fetch('/api/profile', { headers: { Authorization: `Bearer ${token}` } });
    const response = await fetch('/api/profile', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return response.status;
  }, data);
  expect(status).toBe(200);
}

setup('authenticate user A (company without VAT)', async ({ page }) => {
  await signInAndSave(page, requireEnv('userEmail'), STORAGE_STATE);
  await configureCompany(page, { companyName: 'E2E Firma doo', pib: '987654321', inVatSystem: false });
});

setup('authenticate user B (second tenant)', async ({ page }) => {
  await ensureClerkUser(env.userBEmail, 'UserB');
  await signInAndSave(page, env.userBEmail, STORAGE_STATE_B);
});

setup('authenticate VAT user (third tenant)', async ({ page }) => {
  await ensureClerkUser(env.userVatEmail, 'UserVat');
  await signInAndSave(page, env.userVatEmail, STORAGE_STATE_VAT);
  await configureCompany(page, { companyName: 'E2E PDV doo', pib: '123456789', inVatSystem: true });
});

for (const name of TENANT_NAMES) {
  setup(`authenticate tenant "${name}"`, async ({ page }) => {
    await ensureClerkUser(tenantEmail(name), `Tenant${name}`);
    await signInAndSave(page, tenantEmail(name), tenantStorageState(name));
    const company = TENANT_COMPANY[name];
    if (company) await configureCompany(page, company);
  });
}
