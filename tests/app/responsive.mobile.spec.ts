import { test, expect } from '../../fixtures';
import { NAV_ITEMS } from '../../test-data/copy';
import { uniqueId } from '../../utils/seed';

// Runs only in the chromium-mobile project (Pixel 5), see playwright.config.ts.
test.describe('RS-01 mobile layout and core flows', { tag: ['@mobile', '@p0'] }, () => {
  for (const item of NAV_ITEMS) {
    test(`${item.label} has no horizontal scroll`, async ({ page }) => {
      await page.goto(item.path);
      await expect(page.getByRole('main')).toBeVisible();
      await page.waitForLoadState('networkidle');

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, 'horizontal overflow in px').toBeLessThanOrEqual(0);
    });
  }

  test('creates a product from the phone and sees it in Asortiman', async ({ inventoryPage, page, seed }) => {
    const sku = uniqueId();
    seed.trackProductBySku(sku);

    await inventoryPage.navigate();
    await inventoryPage.createProduct({ name: `${sku} proizvod`, sku, quantity: 3, price: 10, costPrice: 5 });

    // On a phone the table becomes a list of cards, so rows do not exist.
    await inventoryPage.searchBox().fill(sku);
    await expect(page.getByRole('listitem').filter({ hasText: sku })).toHaveCount(1);
  });
});
