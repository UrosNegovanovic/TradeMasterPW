import { test, expect } from '../../fixtures';
import { tenantStorageState } from '../../config/tenants';
import { isoDate, purgeTenant } from '../../utils/api-helpers';
import { amountPattern } from '../../utils/money';

// Dedicated company without VAT; each test starts from an empty tenant, so card values are exact.
test.use({ storageState: tenantStorageState('dash') });
test.describe.configure({ mode: 'serial' });

test.describe('Početna – cards and onboarding', { tag: ['@regression', '@p1'] }, () => {
  test('DB-02 "Prvi koraci" ticks off the steps and disappears when all three are done', async ({ dashboardPage, as }) => {
    const { api, seed } = await as('dash');
    await purgeTenant(api);

    await dashboardPage.navigate();
    await expect(dashboardPage.onboardingHeading()).toBeVisible();
    await expect(dashboardPage.main()).toContainText('Završeno 1 od 3');
    await expect(dashboardPage.main()).toContainText(/Podaci firme\s*\(završeno\)/);
    await expect(dashboardPage.main()).toContainText(/Prvi proizvod\s*\(nije završeno\)/);

    const product = await seed.product({ quantity: 5, price: 100 });
    await dashboardPage.navigate();
    await expect(dashboardPage.main()).toContainText('Završeno 2 od 3');
    await expect(dashboardPage.main()).toContainText(/Prvi proizvod\s*\(završeno\)/);

    await seed.invoice([{ product, quantity: 1 }]);
    await dashboardPage.navigate();
    await expect(dashboardPage.onboardingHeading()).toHaveCount(0);
  });

  test('DB-01a stock card shows the total quantity and the selling value', async ({ dashboardPage, as }) => {
    const { api, seed } = await as('dash');
    await purgeTenant(api);
    await seed.product({ quantity: 3, price: 100 });
    await seed.product({ quantity: 2, price: 50 });

    await dashboardPage.navigate();

    await expect(dashboardPage.main()).toContainText(/Ukupna količina\s*5 komada/);
    await expect(dashboardPage.main()).toContainText(new RegExp(`Prodajna vrednost lagera\\s*${amountPattern(400)}`));
  });

  test('DB-01b open invoices card lists the invoice and the amount', async ({ dashboardPage, as }) => {
    const { api, seed } = await as('dash');
    await purgeTenant(api);
    const product = await seed.product({ quantity: 5, price: 100 });
    const invoice = await seed.invoice([{ product, quantity: 1, unitPrice: 100 }]);

    await dashboardPage.navigate();

    await expect(dashboardPage.main()).toContainText('1 otvorenih');
    await expect(dashboardPage.main()).toContainText(invoice.invoiceNumber);
    await expect(dashboardPage.main()).toContainText(new RegExp(amountPattern(100)));
  });

  test('DB-01c low stock card lists products at or below the minimum (2) and nothing else', async ({ dashboardPage, as }) => {
    const { api, seed } = await as('dash');
    await purgeTenant(api);
    const low = await seed.product({ quantity: 2 });
    const fine = await seed.product({ quantity: 9 });

    await dashboardPage.navigate();

    await expect(dashboardPage.main()).toContainText('1 proizvod je na minimumu');
    await expect(dashboardPage.main()).toContainText(`SKU: ${low.sku}`);
    await expect(dashboardPage.main()).toContainText('2 / 2 kom');
    await expect(dashboardPage.main().getByText(`SKU: ${fine.sku}`)).toHaveCount(0);
  });

  test('DB-01d today\'s entries and movements follow the stock changes', async ({ dashboardPage, as }) => {
    const { api, seed } = await as('dash');
    await purgeTenant(api);
    const product = await seed.product({ quantity: 6, price: 100 });
    await seed.invoice([{ product, quantity: 2 }]);

    await dashboardPage.navigate();

    const main = dashboardPage.main();
    await expect(main).toContainText(/1 ulaz\s*6 komada/);
    await expect(main).toContainText('1 izlaz · −2');
    await expect(main).toContainText(/Faktura \d{2,}\/\d{4}/);
  });

  test('DB-03 an open invoice past its due date shows up as overdue with the days late', async ({ dashboardPage, as }) => {
    const { api, seed } = await as('dash');
    await purgeTenant(api);
    const product = await seed.product({ quantity: 5, price: 50 });
    const late = await seed.invoice([{ product, quantity: 1, unitPrice: 50 }], { dueDate: isoDate(-10), clientName: 'E2E kasni kupac' });

    await dashboardPage.navigate();

    const main = dashboardPage.main();
    await expect(main).toContainText('Kasni naplata');
    await expect(main).toContainText(/1 faktura je van roka/);
    await expect(main).toContainText(late.invoiceNumber);
    // 9-11: the due date is cut at midnight in Europe/Belgrade while the test computes it in UTC.
    await expect(main).toContainText(/Kasni (9|10|11) dana/);

    await api.patch(`/api/invoices/${late.id}`, { data: { status: 'PAID' } });
    await dashboardPage.navigate();
    await expect(main.getByText('Kasni naplata')).toHaveCount(0);
  });
});
