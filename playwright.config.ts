import { defineConfig, devices } from '@playwright/test';
import { env } from './config/env';

export const STORAGE_STATE = 'playwright/.auth/user.json';
export const STORAGE_STATE_B = 'playwright/.auth/user-b.json';
export const STORAGE_STATE_VAT = 'playwright/.auth/user-vat.json';

export default defineConfig({
  testDir: './tests',
  globalSetup: './global.setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Shared per-user state (stock, invoice numbers): 1 worker on CI until there is a user per worker.
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'test-results/results.json' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: env.baseURL,
    locale: 'sr-RS',
    timezoneId: 'Europe/Belgrade',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { name: 'setup', testMatch: /setup\/.*\.setup\.ts/ },
    {
      // Logged-out UI flows: landing, sign-in, sign-up, public smoke.
      name: 'chromium-public',
      testMatch: ['public/**/*.spec.ts', 'smoke/public.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Logged-in UI flows reuse the session saved by the setup project.
      name: 'chromium-desktop',
      testMatch: ['app/**/*.spec.ts', 'smoke/app.spec.ts'],
      testIgnore: ['**/*.mobile.spec.ts'],
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
    },
    {
      name: 'chromium-mobile',
      testMatch: ['app/dashboard-nav.spec.ts', 'app/**/*.mobile.spec.ts'],
      dependencies: ['setup'],
      use: { ...devices['Pixel 5'], storageState: STORAGE_STATE },
    },
    {
      // Request-only tests. `request` is anonymous; authenticated clients come from fixtures/api.ts.
      name: 'api',
      testMatch: ['api/**/*.spec.ts'],
      dependencies: ['setup'],
    },
  ],
});
