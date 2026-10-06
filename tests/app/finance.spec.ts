import { test, expect } from '../../fixtures';
import { tenantStorageState } from '../../config/tenants';
import { purgeTenant } from '../../utils/api-helpers';
import { uniqueId } from '../../utils/seed';

// Dedicated VAT company: totals are exact because nothing else writes to it.
test.use({ storageState: tenantStorageState('fin') });
test.describe.configure({ mode: 'serial' });

const THIS_MONTH_RECEIVABLES = 'Potraživanja';
const REVENUE_MONTH = 'Prihod ovog meseca';
const PROFIT_MONTH = 'Profit ovog meseca';
const REVENUE_YEAR = 'Prihod ove godine';

test.describe('Finansije', { tag: ['@regression', '@p1'] }, () => {
  test('FI-03 a company without turnover sees the empty state', async ({ financePage, as }) => {
    const { api } = await as('fin');
    await purgeTenant(api);

    await financePage.navigate();

    await expect(financePage.emptyState()).toBeVisible();
  });

  test('FI-02 an open invoice is a receivable at the full amount (with VAT), not revenue', async ({ financePage, as }) => {
    const { api, seed } = await as('fin');
    await purgeTenant(api);
    const product = await seed.product({ quantity: 10, price: 1000, costPrice: 600 });
    await seed.invoice([{ product, quantity: 2, unitPrice: 1000, vatRate: 20 }]);

    await financePage.navigate();

    await financePage.expectMetric(THIS_MONTH_RECEIVABLES, 2400, '1 otvorenih faktura');
    await financePage.expectMetric(REVENUE_MONTH, 0, '0 plaćenih faktura');
  });

  test('FI-01 a paid invoice books revenue and profit on the amount without VAT', async ({ financePage, as }) => {
    const { api, seed } = await as('fin');
    await purgeTenant(api);
    const product = await seed.product({ quantity: 10, price: 1000, costPrice: 600 });
    const invoice = await seed.invoice([{ product, quantity: 2, unitPrice: 1000, vatRate: 20 }]);
    expect((await api.patch(`/api/invoices/${invoice.id}`, { data: { status: 'PAID' } })).status()).toBe(200);

    await financePage.navigate();

    await financePage.expectMetric(THIS_MONTH_RECEIVABLES, 0, '0 otvorenih faktura');
    await financePage.expectMetric(REVENUE_MONTH, 2000, '1 plaćenih faktura');
    await financePage.expectMetric(PROFIT_MONTH, 800, /Trošak\s*1\.200,00\s*RSD\s*·\s*Marža\s*40\.00%/);
    await financePage.expectMetric(REVENUE_YEAR, 2000, /Ukupno naplaćeno:\s*2\.000,00\s*RSD/);
    await expect(financePage.main()).toContainText(invoice.invoiceNumber);
  });

  test('FI-01b mixed VAT rates and a discount: revenue is the base, profit uses the unit cost snapshot', async ({ financePage, as }) => {
    const { api, seed } = await as('fin');
    await purgeTenant(api);
    const first = await seed.product({ quantity: 10, price: 1000, costPrice: 600 });
    const second = await seed.product({ quantity: 10, price: 500, costPrice: 300 });
    const invoice = await seed.invoice([
      { product: first, quantity: 1, unitPrice: 1000, vatRate: 20 },
      { product: second, quantity: 2, unitPrice: 500, vatRate: 10, discount: 10 },
    ]);
    await api.patch(`/api/invoices/${invoice.id}`, { data: { status: 'PAID' } });

    await financePage.navigate();

    // base 1.000 + 900 = 1.900; cost 600 + 2 x 300 = 1.200; profit 700 (36.84%); paid with VAT 2.190
    await financePage.expectMetric(REVENUE_MONTH, 1900);
    await financePage.expectMetric(PROFIT_MONTH, 700, /Trošak\s*1\.200,00\s*RSD\s*·\s*Marža\s*36\.84%/);
  });

  test('FI-04 a paid invoice without a recorded cost price is flagged', async ({ financePage, as }) => {
    const { api, seed } = await as('fin');
    await purgeTenant(api);
    // Quick scan may save a product without a cost price; such lines have no unit cost on the invoice.
    const sku = uniqueId("E2E-nocost");
    const created = await api.post('/api/products', { data: { name: `${sku} proizvod`, sku, quantity: 5, price: 100 } });
    const product = await created.json();
    seed.trackProductBySku(sku);
    const invoice = await seed.invoice([{ product, quantity: 1, unitPrice: 100, vatRate: 20 }]);
    await api.patch(`/api/invoices/${invoice.id}`, { data: { status: 'PAID' } });

    await financePage.navigate();

    await expect(financePage.main()).toContainText(/Nedostaje nabavna cena/);
  });
});
