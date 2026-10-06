import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const DEFAULT_BASE_URL = 'https://trade-master-seven.vercel.app';

/**
 * Hosts where tests may only read (never create data). Comma-separated PRODUCTION_HOSTS env;
 * empty while the app only has a test deployment. Add the purchased domain here at launch.
 */
const PRODUCTION_HOSTS = (process.env.PRODUCTION_HOSTS ?? '').split(',').map((h) => h.trim()).filter(Boolean);

const optional = (name: string): string | undefined => process.env[name] || undefined;

export const env = {
  baseURL: (optional('BASE_URL') ?? DEFAULT_BASE_URL).replace(/\/$/, ''),
  clerkPublishableKey: optional('CLERK_PUBLISHABLE_KEY') ?? optional('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'),
  clerkSecretKey: optional('CLERK_SECRET_KEY'),
  userEmail: optional('E2E_USER_EMAIL'),
  userPassword: optional('E2E_USER_PASSWORD'),
  otp: optional('E2E_OTP') ?? '424242',
  /** Second tenant for isolation (IDOR) tests; created through the Clerk Backend API if missing. */
  userBEmail: optional('E2E_USER_B_EMAIL') ?? 'e2e-user-b+clerk_test@example.com',
  /** Third tenant: company in the VAT system (PIB + inVatSystem set by the fixture). */
  userVatEmail: optional('E2E_USER_VAT_EMAIL') ?? 'e2e-user-vat+clerk_test@example.com',
  testDatabaseUrl: optional('TEST_DATABASE_URL'),
};

export const isProductionTarget = (): boolean =>
  PRODUCTION_HOSTS.includes(new URL(env.baseURL).host);

export const hasClerkKeys = (): boolean => !!(env.clerkPublishableKey && env.clerkSecretKey);
export const hasUserCredentials = (): boolean => !!(env.userEmail && env.userPassword);

/** Throws with a clear message when a required variable is missing. */
export function requireEnv<K extends keyof typeof env>(key: K): NonNullable<(typeof env)[K]> {
  const value = env[key];
  if (!value) throw new Error(`Missing required env var for "${String(key)}". See .env.example.`);
  return value as NonNullable<(typeof env)[K]>;
}

/** Guard for tests that create or mutate data: refuse to run against production. */
export function assertNotProduction(reason = 'This test creates or mutates data'): void {
  if (isProductionTarget()) {
    throw new Error(`${reason}; refusing to run against production (${env.baseURL}). Set BASE_URL to a dev/preview/local URL.`);
  }
}
