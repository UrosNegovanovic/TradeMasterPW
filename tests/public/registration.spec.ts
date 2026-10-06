import { setupClerkTestingToken } from '@clerk/testing/playwright';
import { test, expect } from '../../fixtures/test';
import { env, hasClerkKeys } from '../../config/env';

test.describe('Registration', () => {
  test.skip(!hasClerkKeys(), 'Clerk publishable and secret keys are required (see .env.example)');

  test('AU-03 new user signs up and is asked for company data with a 60-day trial', async ({ page, homePage, signUpPage, dashboardPage }) => {
    await setupClerkTestingToken({ page });

    await homePage.navigate();
    await homePage.signUpLink().click();
    await expect(signUpPage.heading()).toBeVisible();

    await signUpPage.performSignUp('E2E', 'Korisnik', signUpPage.generateTestEmail(), 'E2e-Pass-4821!x', env.otp);

    // [PROVERI] with product: redirect to /settings for a new profile is current behaviour.
    await expect(page).toHaveURL(/\/settings/);
    await expect(dashboardPage.pageHeading()).toHaveText('Podešavanja');
    await expect(page.getByText(/Prvih 60 dana besplatno/)).toBeVisible();
  });
});
