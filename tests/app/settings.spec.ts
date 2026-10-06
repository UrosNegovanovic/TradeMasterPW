import { test, expect } from '../../fixtures';
import { tenantStorageState } from '../../config/tenants';
import { uniqueId } from '../../utils/seed';

// A dedicated tenant: these tests rewrite the company profile.
test.use({ storageState: tenantStorageState('settings') });
test.describe.configure({ mode: 'serial' });

test.describe('Podešavanja', { tag: ['@regression', '@p1'] }, () => {
  test('SE-01 company data is saved and survives a reload', async ({ settingsPage }) => {
    const name = `${uniqueId('E2E')} doo`;
    await settingsPage.navigate();

    await settingsPage.fill({ companyName: name, pib: '333333334', email: 'kontakt@firma.rs', phone: '+381 11 123 4567', giroAccount: '160-0000000000000-00', address: 'Ulica 1, Beograd' });
    await settingsPage.saveButton().click();
    await expect(settingsPage.toast().filter({ hasText: 'Podaci su sačuvani' })).toBeVisible();

    await settingsPage.page.reload();
    await expect(settingsPage.companyName()).toHaveValue(name);
    await expect(settingsPage.pib()).toHaveValue('333333334');
    await expect(settingsPage.email()).toHaveValue('kontakt@firma.rs');
    await expect(settingsPage.phone()).toHaveValue('+381 11 123 4567');
    await expect(settingsPage.giroAccount()).toHaveValue('160-0000000000000-00');
    await expect(settingsPage.address()).toHaveValue('Ulica 1, Beograd');
  });

  test('SE-01b an invalid e-mail is blocked and nothing is saved', async ({ settingsPage, as }) => {
    const { api } = await as('settings');
    const before = await (await api.get('/api/profile')).json();
    await settingsPage.navigate();

    await settingsPage.fill({ email: 'nije-email' });
    await settingsPage.saveButton().click();

    await expect.poll(() => settingsPage.email().evaluate((el: HTMLInputElement) => el.validity.valid)).toBe(false);
    await expect(settingsPage.toast().filter({ hasText: 'Podaci su sačuvani' })).toHaveCount(0);
    expect((await (await api.get('/api/profile')).json()).contactEmail).toBe(before.contactEmail);
  });

  test('SE-01c a PIB that is not 9 digits is not saved', async ({ settingsPage, as }) => {
    const { api } = await as('settings');
    await settingsPage.navigate();
    await settingsPage.fill({ pib: '333333334' });
    await settingsPage.saveButton().click();
    await expect(settingsPage.toast().filter({ hasText: 'Podaci su sačuvani' })).toBeVisible();

    await settingsPage.fill({ pib: '123' });
    await settingsPage.saveButton().click();

    await expect(settingsPage.toast().filter({ hasText: 'Podaci su sačuvani' })).toHaveCount(1);
    expect((await (await api.get('/api/profile')).json()).pib).toBe('333333334');
  });

  test('SE-05 the access card shows when the free period ends', async ({ settingsPage }) => {
    await settingsPage.navigate();

    await expect(settingsPage.main()).toContainText(/Pristup važi do \d{2}\.\d{2}\.\d{4}\.\s*\(ističe za \d+ dana\)/);
  });

  test('SE-03 switching VAT on changes the form of new invoices, not the issued ones', async ({ settingsPage, invoiceFormPage, as }) => {
    const { api, seed } = await as('settings');
    await api.put('/api/profile', { data: { companyName: 'E2E Podesavanja doo', pib: '333333334', inVatSystem: false } });
    const product = await seed.product({ quantity: 10, price: 1000, costPrice: 600 });
    const issued = await seed.invoice([{ product, quantity: 2, unitPrice: 1000, vatRate: 20 }]);
    expect(issued.vatAmount).toBe('0');

    await settingsPage.navigate();
    await settingsPage.vatCheckbox().check();
    await settingsPage.saveButton().click();
    await expect(settingsPage.toast().filter({ hasText: 'Podaci su sačuvani' })).toBeVisible();

    await invoiceFormPage.navigateNew();
    await invoiceFormPage.fillItem(0, { sku: product.sku, quantity: 1 });
    await expect(invoiceFormPage.vatRate()).toHaveValue('20');

    const unchanged = await (await api.get(`/api/invoices/${issued.id}`)).json();
    expect(unchanged).toMatchObject({ vatEnabled: false, vatAmount: '0', totalAmount: issued.totalAmount });

    // leave the tenant as the other tests expect it
    await api.put('/api/profile', { data: { companyName: 'E2E Podesavanja doo', pib: '333333334', inVatSystem: false } });
  });
});
