import percySnapshot from '@percy/playwright';
import { test, expect } from '../../fixtures/test';
import { copy } from '../../test-data/copy';

test.describe('Landing page', () => {
  test('SM-01 shows title, hero heading and sign-in link', async ({ homePage, page }) => {
    await homePage.navigate();
    await expect(page).toHaveTitle(copy.landing.title);
    await homePage.verifyLandingPageLoaded();
    await percySnapshot(page, 'Home – hero');
  });

  test('LA-01 header links lead to sign-in and sign-up', async ({ homePage, page }) => {
    await homePage.navigate();
    await homePage.signInLink().click();
    await expect(page).toHaveURL(/\/sign-in/);

    await homePage.navigate();
    await homePage.signUpLink().click();
    await expect(page).toHaveURL(/\/sign-up/);
  });
});
