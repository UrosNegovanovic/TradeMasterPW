import { test, expect } from '../../fixtures';
import { copy } from '../../test-data/copy';
import { expectRejected } from '../../utils/validation';

const { warehouse } = copy;

test.describe('Magacin – stock movements', { tag: ['@regression', '@p0'] }, () => {
  test('WH-01 entry raises stock and writes an IN movement', async ({ warehousePage, seed }) => {
    const product = await seed.product({ quantity: 5 });
    await warehousePage.navigate();

    await warehousePage.recordEntry({ sku: product.sku, quantity: 3, reason: 'E2E nabavka' });

    await expect(warehousePage.toast().filter({ hasText: warehouse.toasts.entry })).toBeVisible();
    await warehousePage.expectStock(product.sku, 8);
    const movement = (await warehousePage.movementRows(product.sku)).first();
    await expect(movement).toContainText('IN');
    await expect(movement).toContainText('+3');
    await expect(movement).toContainText('E2E nabavka');
  });

  test('WH-02 exit lowers stock and writes an OUT movement', async ({ warehousePage, seed }) => {
    const product = await seed.product({ quantity: 5 });
    await warehousePage.navigate();

    await warehousePage.recordExit({ sku: product.sku, quantity: 2, reason: 'E2E prodaja' });

    await expect(warehousePage.toast().filter({ hasText: warehouse.toasts.exit })).toBeVisible();
    await warehousePage.expectStock(product.sku, 3);
    const movement = (await warehousePage.movementRows(product.sku)).first();
    await expect(movement).toContainText('OUT');
    await expect(movement).toContainText('-2');
    await expect(movement).toContainText('E2E prodaja');
  });

  test('WH-03 exit above current stock is blocked and stock is unchanged', async ({ warehousePage, seed, api }) => {
    const product = await seed.product({ quantity: 4 });
    await warehousePage.navigate();

    await warehousePage.openExitDialog();
    await warehousePage.chooseExitProduct(product.sku);
    await warehousePage.quantityInput().fill('5');
    await warehousePage.reasonInput().fill('E2E previše');
    await warehousePage.exitSubmit().click();

    await expect(warehousePage.dialog()).toBeVisible();
    await expect(warehousePage.toast().filter({ hasText: warehouse.toasts.exit })).toHaveCount(0);

    const stock = (await (await api.get('/api/products')).json()).find((p: { id: string }) => p.id === product.id).quantity;
    expect(stock).toBe(4);
  });

  test('WH-04a entry dialog validates product, quantity and reason', async ({ warehousePage, seed }) => {
    // Ulaz/Izlaz buttons only exist when the tenant has products.
    await seed.product();
    await warehousePage.navigate();
    await warehousePage.openEntryDialog();
    await warehousePage.entrySubmit().click();

    await expect(warehousePage.dialog().getByText(warehouse.errors.pickProduct).first()).toBeVisible();
    await expect(warehousePage.dialog().getByText(warehouse.errors.reason)).toBeVisible();
  });

  test('WH-04b entry quantity must be positive', async ({ warehousePage, seed }) => {
    const product = await seed.product();
    await warehousePage.navigate();
    await warehousePage.openEntryDialog();
    await warehousePage.chooseEntryProduct(product.sku);
    await warehousePage.quantityInput().fill('0');
    await warehousePage.reasonInput().fill('E2E nula');
    await warehousePage.entrySubmit().click();

    await expectRejected(warehousePage.dialog(), warehousePage.quantityInput(), warehouse.errors.quantity);
  });

  test('WH-04c exit dialog validates product and reason', async ({ warehousePage, seed }) => {
    // Ulaz/Izlaz buttons only exist when the tenant has products.
    await seed.product();
    await warehousePage.navigate();
    await warehousePage.openExitDialog();
    await warehousePage.exitSubmit().click();

    await expect(warehousePage.dialog().getByText(warehouse.errors.pickProduct).first()).toBeVisible();
    await expect(warehousePage.dialog().getByText(warehouse.errors.reason)).toBeVisible();
  });

  test('WH-07 the same quantity is shown in Asortiman, Magacin and the API', async ({ inventoryPage, warehousePage, seed, api }) => {
    const product = await seed.product({ quantity: 6 });

    await inventoryPage.navigate();
    const inventoryRow = await inventoryPage.findRow(product.sku);
    await expect(inventoryRow.getByRole('cell').nth(4)).toHaveText('6');

    await warehousePage.navigate();
    await warehousePage.expectStock(product.sku, 6);

    const fromApi = (await (await api.get('/api/products')).json()).find((p: { id: string }) => p.id === product.id);
    expect(fromApi.quantity).toBe(6);
  });
});
