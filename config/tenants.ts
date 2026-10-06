/**
 * Extra Clerk Development users with a dedicated company each. Tests that assert exact totals
 * (finance, dashboard cards) or change the company profile (settings) must not share a tenant
 * with parallel suites, so each area gets its own.
 */
export type TenantName = 'fin' | 'dash' | 'settings';

export const TENANT_NAMES: TenantName[] = ['fin', 'dash', 'settings'];

export const tenantEmail = (name: TenantName): string =>
  process.env[`E2E_USER_${name.toUpperCase()}_EMAIL`] || `e2e-${name}+clerk_test@example.com`;

export const tenantStorageState = (name: TenantName): string => `playwright/.auth/user-${name}.json`;

/** Company profile applied by the setup project; null = leave the profile empty (new company). */
export const TENANT_COMPANY: Record<TenantName, Record<string, unknown> | null> = {
  fin: { companyName: 'E2E Finansije doo', pib: '111111118', inVatSystem: true },
  dash: { companyName: 'E2E Pocetna doo', pib: '222222226', inVatSystem: false },
  settings: null,
};
