/**
 * Real-device smoke test for BrowserStack: Galaxy S24, Android 14.
 * Run with: npm run test:browserstack -- tests/browserstack-galaxy-s24.spec.ts
 * Opens the app, takes a screenshot (proof), and asserts the home page loads.
 */
import { test, expect } from '../../fixtures/test';

test.describe('TradeMaster on Galaxy S24 (Android 14) – real device smoke', () => {
  test('app opens correctly and home page loads', async ({ page, homePage }, testInfo) => {
    await homePage.navigate();

    // Proof: take screenshot (saved to test-results and attached to report)
    const screenshotPath = testInfo.outputPath('galaxy-s24-home.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    await testInfo.attach('galaxy-s24-proof', { path: screenshotPath });

    // Assert app opened correctly
    await expect(page).toHaveTitle(/TradeMaster/i);
    const signInButton = homePage.signInLink();
    await expect(signInButton).toBeVisible();
  });
});
