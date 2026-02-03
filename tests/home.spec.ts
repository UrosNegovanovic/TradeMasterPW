import { test, expect } from '../fixture/test';

test.describe('TradeMaster Home Page', () => {
  test('should display correct title and Sign In button', async ({ homePage }) => {
    await homePage.navigate();
    const title = await homePage.getTitle();
    expect(title).toContain('TradeMaster');
    const signInButton = await homePage.getSignInButton();
    await expect(signInButton).toBeVisible();
  });
  test('should display hero heading "Simplify Your Wholesale Business"', async ({ homePage }) => {
    await homePage.navigate();
    const heroHeading = await homePage.getHeroHeading();
    await expect(heroHeading).toBeVisible();
    await expect(heroHeading).toHaveText('Simplify Your Wholesale Business');
  });
});

