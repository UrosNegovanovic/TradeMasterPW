import { test, expect } from '../../fixtures';
import { copy } from '../../test-data/copy';
import { uniqueId } from '../../utils/seed';
import { expectRejected } from '../../utils/validation';

const { productForm } = copy;

test.describe('Asortiman – create product', { tag: ['@regression', '@p0'] }, () => {
  test.beforeEach(async ({ inventoryPage }) => {
    await inventoryPage.navigate();
  });

  test('PR-01 creates a product with all fields and shows it in Asortiman and Magacin', async ({ inventoryPage, warehousePage, seed }) => {
    const sku = uniqueId();
    seed.trackProductBySku(sku);

    await inventoryPage.createProduct({
      name: `${sku} proizvod`,
      sku,
      quantity: 7,
      price: 25.5,
      costPrice: 12.25,
      description: 'E2E opis proizvoda',
    });

    const row = await inventoryPage.findRow(sku);
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(`${sku} proizvod`);
    await expect(row).toContainText(copy.inventory.uncategorized);
    // columns: Slika, Naziv, SKU, Kategorija, Količina, Cena, Dodato, Akcije
    await expect(row.getByRole('cell').nth(4)).toHaveText('7');

    await warehousePage.navigate();
    await warehousePage.expectStock(sku, 7);
  });

  test('PR-02a cost price is required (browser validation blocks submit)', async ({ inventoryPage }) => {
    const sku = uniqueId();
    await inventoryPage.openCreateDialog();
    await inventoryPage.fillProductForm({ name: `${sku} proizvod`, sku });
    await inventoryPage.submitButton().click();

    await inventoryPage.expectBrowserValidationBlocks(inventoryPage.costPriceInput());
  });

  test('PR-02b cost price 0 needs a reason, and passes with one', async ({ inventoryPage, seed, api }) => {
    const sku = uniqueId();
    seed.trackProductBySku(sku);
    await inventoryPage.openCreateDialog();
    await inventoryPage.fillProductForm({ name: `${sku} proizvod`, sku, costPrice: 0 });
    await inventoryPage.submitButton().click();

    await expect(inventoryPage.dialog().getByText(productForm.errors.zeroReasonRequired)).toBeVisible();
    await expect(inventoryPage.dialog()).toBeVisible();

    await inventoryPage.zeroReasonInput().fill('Promo uzorak');
    await inventoryPage.submitButton().click();
    await expect(inventoryPage.dialog()).toBeHidden();

    const saved = (await (await api.get('/api/products')).json()).find((p: { sku: string }) => p.sku === sku);
    expect(saved.costPrice).toBe('0');
    expect(saved.costPriceZeroReason).toBe('Promo uzorak');
  });

  test('PR-03 selling price is optional: empty is saved as 0 and flagged "Nedostaje cena"', async ({ inventoryPage, seed, api }) => {
    const sku = uniqueId();
    seed.trackProductBySku(sku);
    await inventoryPage.createProduct({ name: `${sku} proizvod`, sku, quantity: 2, costPrice: 8 });

    const row = await inventoryPage.findRow(sku);
    await expect(row).toContainText(copy.inventory.missingPrice);

    const saved = (await (await api.get('/api/products')).json()).find((p: { sku: string }) => p.sku === sku);
    expect(saved.price).toBe('0');
    expect(saved.costPrice).toBe('8');
  });

  test('PR-03b a product with a selling price is not flagged', async ({ inventoryPage, seed }) => {
    const sku = uniqueId();
    seed.trackProductBySku(sku);
    await inventoryPage.createProduct({ name: `${sku} proizvod`, sku, quantity: 2, price: 30, costPrice: 8 });

    await expect(await inventoryPage.findRow(sku)).not.toContainText(copy.inventory.missingPrice);
  });

  test('PR-04a money accepts two decimals (19.99)', async ({ inventoryPage, seed, api }) => {
    const sku = uniqueId();
    seed.trackProductBySku(sku);
    await inventoryPage.createProduct({ name: `${sku} proizvod`, sku, price: 19.99, costPrice: 19.99 });

    const saved = (await (await api.get('/api/products')).json()).find((p: { sku: string }) => p.sku === sku);
    expect(saved.costPrice).toBe('19.99');
    expect(saved.price).toBe('19.99');
  });

  const REJECTED: Array<{ value: string; message: string }> = [
    { value: '19.999', message: productForm.errors.costDecimals },
    { value: '-1', message: productForm.errors.costNegative },
  ];
  for (const { value, message } of REJECTED) {
    test(`PR-04b cost price ${value} is rejected with "${message}"`, async ({ inventoryPage }) => {
      const sku = uniqueId();
      await inventoryPage.openCreateDialog();
      await inventoryPage.fillProductForm({ name: `${sku} proizvod`, sku, costPrice: value });
      await inventoryPage.submitButton().click();

      await expectRejected(inventoryPage.dialog(), inventoryPage.costPriceInput(), message);
    });
  }

  test('PR-04c quantity 0 is rejected', async ({ inventoryPage }) => {
    const sku = uniqueId();
    await inventoryPage.openCreateDialog();
    await inventoryPage.fillProductForm({ name: `${sku} proizvod`, sku, quantity: 0, costPrice: 5 });
    await inventoryPage.submitButton().click();

    await expectRejected(inventoryPage.dialog(), inventoryPage.quantityInput(), productForm.errors.quantityMin);
  });
});
