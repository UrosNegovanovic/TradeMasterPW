import { test, expect } from '../fixture/test';

const TEST_EMAIL = 'uros.negovanovic35+clerk_test@gmail.com';
const TEST_PASSWORD = 'Qat456123!';
const FIXED_OTP = '424242';

test.describe('TradeMaster Authentication', () => {
  test('should login successfully with Clerk Test Mode', async ({ homePage, signInPage }) => {
    // Čekamo API response pre performLogin – mora biti postavljen pre akcije
    const responsePromise = signInPage.page.waitForResponse(
      (response) =>
        (response.url().includes('clerk') || response.url().includes('session')) &&
        response.status() === 200,
      { timeout: 15000 }
    );

    await homePage.navigate();
    await (await homePage.getSignInButton()).click();
    await signInPage.performLogin(TEST_EMAIL, TEST_PASSWORD, FIXED_OTP);

    // Čekamo API response posle logina
    const response = await responsePromise;
    const responseUrl = response.url();
    const responseStatus = response.status();

    // Print – vidljivo u test output (npx playwright test)
    console.log('[Login API] URL:', responseUrl);
    console.log('[Login API] Status:', responseStatus);

    // Assert: API uspešan
    expect(responseStatus).toBe(200);

    // Assert: redirect na dashboard
    await expect(signInPage.page).toHaveURL(/dashboard/);
  });
});