import { test, expect, devices } from '@playwright/test';
import { copy } from '../../test-data/copy';

const { landing } = copy;

// Top level on purpose: `devices` carries defaultBrowserType, which cannot be set inside describe.
test.use({ ...devices['Pixel 5'], locale: 'sr-RS' });

test('LA-04 hero fits the viewport and the sticky sign-up CTA stays visible while scrolling', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: landing.heroHeading })).toBeInViewport();

  const noHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(noHorizontalScroll).toBe(true);

  // Header and footer also link to sign-up; the fixed bottom bar is the one that must follow the scroll.
  const stickyCta = page.locator('div.fixed.bottom-0').getByRole('link', { name: landing.signUp, exact: true });
  await expect(stickyCta).toBeInViewport();
  await page.locator('#pitanja').scrollIntoViewIfNeeded();
  await expect(stickyCta).toBeInViewport();
  await stickyCta.click();
  await expect(page).toHaveURL(/\/sign-up/);
});
