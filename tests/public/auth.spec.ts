import percySnapshot from '@percy/playwright';
import { test, expect } from '../../fixtures/test';
import { env, hasUserCredentials, requireEnv } from '../../config/env';

test.describe('Authentication', () => {
  test.skip(!hasUserCredentials(), 'E2E_USER_EMAIL / E2E_USER_PASSWORD not set (see .env.example)');
  // Both tests sign in as the same user through the "new device" OTP step; running them one after the other
  // avoids two simultaneous verifications (intermittent stall on /sign-in/factor-two was seen when parallel).
  test.describe.configure({ mode: 'serial' });

  test('AU-01 logs in via UI and the session survives a reload', async ({ signInPage, dashboardPage, page }) => {
    await signInPage.navigate();
    await signInPage.performLogin(requireEnv('userEmail'), requireEnv('userPassword'), env.otp);
    await expect(dashboardPage.pageHeading()).toBeVisible();
    await percySnapshot(page, 'Dashboard – after login');

    await page.reload();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(dashboardPage.pageHeading()).toBeVisible();
  });

  // Signs in through the UI on purpose: signing out would revoke the shared storageState session.
  test('AU-02 sign-out returns to the public site and protects dashboard', async ({ signInPage, dashboardPage, page }) => {
    await signInPage.navigate();
    await signInPage.performLogin(requireEnv('userEmail'), requireEnv('userPassword'), env.otp);

    await dashboardPage.signOutButton().click();
    await expect(page).not.toHaveURL(/\/dashboard/);

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/sign-in|\/$/);
    await expect(page).not.toHaveURL(/\/dashboard$/);
  });
});
