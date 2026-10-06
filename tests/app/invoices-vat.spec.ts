import { test, expect } from '../../fixtures';
import { copy } from '../../test-data/copy';
import { STORAGE_STATE_VAT } from '../../playwright.config';
import { invoicesOf, quantityOf } from '../../utils/api-helpers';
import { formatMoney, labelledAmount } from '../../utils/money';
import { uniqueId } from '../../utils/seed';

const { invoices } = copy;

// This company is in the VAT system (set by the setup project); the default user is not.
test.use({ storageState: STORAGE_STATE_VAT });

test.describe('Fakture – company in the VAT system', { tag: ['@regression', '@p0'] }, () => {
  test('IN-05a the form defaults to 20% and shows base, VAT and total payable', async ({ invoiceFormPage, seedVat }) => {
    const product = await seedVat.product({ quantity: 10, price: 1000, costPrice: 600 });

    await invoiceFormPage.navigateNew();
    await invoiceFormPage.fillItem(0, { sku: product.sku, quantity: 2 });

    await expect(invoiceFormPage.vatRate()).toHaveValue('20');
    const main = invoiceFormPage.main();
    await expect(main).toContainText(labelledAmount(invoices.totals.base, 2000));
    await expect(main).toContainText(labelledAmount('PDV 20%', 400));
    await expect(main).toContainText(labelledAmount(invoices.totals.payable, 2400));
  });

  test('IN-05b changing the rate to 10% recalculates the totals', async ({ invoiceFormPage, seedVat }) => {
    const product = await seedVat.product({ quantity: 10, price: 1000, costPrice: 600 });

    await invoiceFormPage.navigateNew();
    await invoiceFormPage.fillItem(0, { sku: product.sku, quantity: 2, vatRate: '10' });

    const main = invoiceFormPage.main();
    await expect(main).toContainText(labelledAmount('PDV 10%', 200));
    await expect(main).toContainText(labelledAmount(invoices.totals.payable, 2200));
  });

  test('IN-05c mixed rates and a discount give separate VAT lines', async ({ invoiceFormPage, seedVat }) => {
    const first = await seedVat.product({ quantity: 10, price: 1000, costPrice: 600 });
    const second = await seedVat.product({ quantity: 10, price: 500, costPrice: 300 });

    await invoiceFormPage.navigateNew();
    await invoiceFormPage.fillItem(0, { sku: first.sku, quantity: 1, vatRate: '20' });
    await invoiceFormPage.addItemButton().click();
    await invoiceFormPage.fillItem(1, { sku: second.sku, quantity: 2, discount: 10, vatRate: '10' });

    const main = invoiceFormPage.main();
    await expect(main).toContainText(labelledAmount('PDV 20%', 200));
    await expect(main).toContainText(labelledAmount('PDV 10%', 90));
    await expect(main).toContainText(labelledAmount(invoices.totals.payable, 2190));
  });

  test('IN-05d the issued invoice shows the amount payable (with VAT) in the list and stock is reduced', async ({ invoiceFormPage, invoicesPage, seedVat, apiVat }) => {
    const product = await seedVat.product({ quantity: 10, price: 1000, costPrice: 600 });
    const customer = `${uniqueId()} kupac`;
    seedVat.trackInvoicesByClient(customer);

    await invoiceFormPage.navigateNew();
    await invoiceFormPage.fillCustomer(customer);
    await invoiceFormPage.fillItem(0, { sku: product.sku, quantity: 2 });
    const number = await invoiceFormPage.save();

    await expect(invoicesPage.card(number)).toContainText(formatMoney(2400));
    const stored = (await invoicesOf(apiVat)).find((i) => i.clientName === customer);
    expect(stored?.status).toBe('UNPAID');
    expect(await quantityOf(apiVat, product.id)).toBe(8);
  });
});
