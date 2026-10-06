import { test, expect } from '../../fixtures';
import { copy } from '../../test-data/copy';
import { INVOICE_NUMBER, invoicesOf, quantityOf } from '../../utils/api-helpers';
import { formatMoney } from '../../utils/money';
import { uniqueId } from '../../utils/seed';

const { invoices } = copy;

test.describe('Fakture – create (company outside the VAT system)', { tag: ['@regression', '@p0'] }, () => {
  test('IN-01 creates an invoice from the form: auto number, issued as "Otvoreno", stock reduced', async ({ invoiceFormPage, invoicesPage, seed, api }) => {
    const product = await seed.product({ quantity: 10, price: 100, costPrice: 60 });
    const customer = `${uniqueId()} kupac`;
    seed.trackInvoicesByClient(customer);

    await invoiceFormPage.navigateNew();
    await expect(invoiceFormPage.invoiceNumber()).toHaveValue(invoices.form.numberPlaceholder);
    await invoiceFormPage.fillCustomer(customer, '111222333', 'Ulica 1');
    await invoiceFormPage.fillItem(0, { sku: product.sku, quantity: 2 });
    await expect(invoiceFormPage.unitPrice()).toHaveValue('100');
    const number = await invoiceFormPage.save();

    expect(number).toMatch(INVOICE_NUMBER);
    await expect(invoicesPage.heading()).toBeVisible();
    const card = invoicesPage.card(number);
    await expect(card).toContainText(customer);
    await expect(card).toContainText(invoices.status.open);
    await expect(card).toContainText(formatMoney(200));
    expect(await quantityOf(api, product.id)).toBe(8);
  });

  test('IN-01b the form of a company outside the VAT system has no VAT column or totals', async ({ invoiceFormPage, seed }) => {
    const product = await seed.product({ quantity: 10 });

    await invoiceFormPage.navigateNew();
    await invoiceFormPage.fillItem(0, { sku: product.sku, quantity: 1 });

    await expect(invoiceFormPage.vatRate()).toHaveCount(0);
    await expect(invoiceFormPage.main().getByText(invoices.totals.base)).toHaveCount(0);
  });

  test('IN-02 the form shows the available stock of the chosen product', async ({ invoiceFormPage, seed }) => {
    const product = await seed.product({ quantity: 7 });

    await invoiceFormPage.navigateNew();
    await invoiceFormPage.fillItem(0, { sku: product.sku });

    await expect(invoiceFormPage.stockHint()).toHaveText('Na stanju: 7 kom');
  });

  test('IN-03 more than the stock: the form shows the shortage and will not save, nothing is issued', async ({ invoiceFormPage, seed, api }) => {
    const product = await seed.product({ quantity: 3 });
    const customer = `${uniqueId()} kupac`;
    seed.trackInvoicesByClient(customer);

    await invoiceFormPage.navigateNew();
    await invoiceFormPage.fillCustomer(customer);
    await invoiceFormPage.fillItem(0, { sku: product.sku, quantity: 5 });

    await expect(invoiceFormPage.main()).toContainText(invoices.errors.shortage(2, 3));
    await expect(invoiceFormPage.main().getByText(invoices.errors.shortageBanner)).toBeVisible();
    await expect(invoiceFormPage.saveButton()).toBeDisabled();
    expect((await invoicesOf(api)).some((i) => i.clientName === customer)).toBe(false);
    expect(await quantityOf(api, product.id)).toBe(3);

    await invoiceFormPage.quantity().fill('3');
    await expect(invoiceFormPage.saveButton()).toBeEnabled();
  });

  test('IN-04a a customer PIB that is not 9 digits is rejected', async ({ invoiceFormPage, seed, api }) => {
    const product = await seed.product({ quantity: 5 });
    const customer = `${uniqueId()} kupac`;
    seed.trackInvoicesByClient(customer);

    await invoiceFormPage.navigateNew();
    await invoiceFormPage.fillCustomer(customer, '12345');
    await invoiceFormPage.fillItem(0, { sku: product.sku });
    await invoiceFormPage.saveButton().click();

    await expect(invoiceFormPage.page.getByText(invoices.errors.clientPib).first()).toBeVisible();
    await expect(invoiceFormPage.page).toHaveURL(/\/invoices\/new/);
    expect((await invoicesOf(api)).some((i) => i.clientName === customer)).toBe(false);
  });

  test('IN-04b the customer name is required', async ({ invoiceFormPage, seed }) => {
    const product = await seed.product({ quantity: 5 });

    await invoiceFormPage.navigateNew();
    await invoiceFormPage.fillItem(0, { sku: product.sku });
    await invoiceFormPage.saveButton().click();

    await expect(invoiceFormPage.page).toHaveURL(/\/invoices\/new/);
    await expect.poll(() => invoiceFormPage.clientName().evaluate((el: HTMLInputElement) => el.validity.valid)).toBe(false);
  });

  test('IN-16 leaving a changed form asks for confirmation', async ({ invoiceFormPage, page, seed }) => {
    // The form renders an empty state instead of the fields when the tenant has no products.
    await seed.product();

    await invoiceFormPage.navigateNew();
    await invoiceFormPage.clientName().fill('E2E nesačuvano');

    await page.getByRole('link', { name: 'Nazad na fakture' }).click();

    await expect(page.getByText('Odbaciti nesačuvane izmene?')).toBeVisible();
  });
});

test.describe('Fakture – status flow and deletion', { tag: ['@regression', '@p0'] }, () => {
  test('IN-07 open -> paid -> back to open, stock untouched by the status changes', async ({ invoicesPage, seed, api }) => {
    const product = await seed.product({ quantity: 10 });
    const invoice = await seed.invoice([{ product, quantity: 3 }]);
    expect(await quantityOf(api, product.id)).toBe(7);

    await invoicesPage.navigate();
    await invoicesPage.markPaid(invoice.invoiceNumber);
    await invoicesPage.paidTab().click();
    await expect(invoicesPage.card(invoice.invoiceNumber)).toContainText(invoices.status.paid);
    expect(await quantityOf(api, product.id)).toBe(7);

    await invoicesPage.revertToOpen(invoice.invoiceNumber);
    await invoicesPage.openTab().click();
    await expect(invoicesPage.card(invoice.invoiceNumber)).toContainText(invoices.status.open);
    expect(await quantityOf(api, product.id)).toBe(7);
  });

  test('IN-08 deleting an issued invoice asks for confirmation and returns the stock', async ({ invoicesPage, seed, api }) => {
    const product = await seed.product({ quantity: 10 });
    const invoice = await seed.invoice([{ product, quantity: 4 }]);
    expect(await quantityOf(api, product.id)).toBe(6);

    await invoicesPage.navigate();
    await invoicesPage.deleteInvoice(invoice.invoiceNumber);

    await expect(invoicesPage.card(invoice.invoiceNumber)).toHaveCount(0);
    expect(await quantityOf(api, product.id)).toBe(10);
  });
});

test.describe('Fakture – public link and PDF', { tag: ['@regression', '@p0'] }, () => {
  test('IN-11 the customer sees the invoice without signing in; a revoked link says it is unavailable', async ({ browser, api, seed, baseURL }) => {
    const product = await seed.product({ quantity: 10 });
    const invoice = await seed.invoice([{ product, quantity: 1 }]);
    const { url } = await (await api.post(`/api/invoices/${invoice.id}/share`)).json();

    const customerContext = await browser.newContext({ baseURL });
    const customerPage = await customerContext.newPage();
    try {
      await customerPage.goto(url);
      await expect(customerPage.getByText(invoice.invoiceNumber).first()).toBeVisible();

      await api.delete(`/api/invoices/${invoice.id}/share`);
      await customerPage.goto(url);
      await expect(customerPage.getByRole('heading', { level: 1, name: invoices.unavailable.heading })).toBeVisible();
      await expect(customerPage.getByText(invoices.unavailable.text)).toBeVisible();
    } finally {
      await customerContext.close();
    }
  });

  test('IN-12 the detail page downloads a PDF', async ({ invoiceDetailPage, seed, page }) => {
    const product = await seed.product({ quantity: 10 });
    const invoice = await seed.invoice([{ product, quantity: 1 }]);
    await invoiceDetailPage.navigate(invoice.id, invoice.invoiceNumber);

    // @react-pdf is loaded lazily: the first click prepares the file, the download starts afterwards.
    const download = page.waitForEvent('download');
    await invoiceDetailPage.pdfButton().click();
    const file = await download;

    expect(file.suggestedFilename()).toMatch(/\.pdf$/i);
    const path = await file.path();
    const { readFile } = await import('fs/promises');
    const bytes = await readFile(path);
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(1500);
  });
});
