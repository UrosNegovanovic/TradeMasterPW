import { test, expect } from '../../fixtures';
import { uniqueId } from '../../utils/seed';

test.describe('Kupci', { tag: ['@regression', '@p1'] }, () => {
  test('CL-01 adds a customer and finds it in the list', async ({ clientsPage, api, seed }) => {
    const name = `${uniqueId()} kupac doo`;
    seed.trackClientsByName(name);
    await clientsPage.navigate();

    await clientsPage.addClient({ name, pib: '123456789', address: 'Ulica 5, Niš' });

    await expect(clientsPage.toast().filter({ hasText: 'Kupac je dodat' })).toBeVisible();
    // Customers of parallel tests share the same list (same PIB), so look at this customer's own row.
    await expect(clientsPage.row(name)).toContainText('PIB: 123456789');
    await expect(clientsPage.row(name)).toContainText('Ulica 5, Niš');
    const stored = (await (await api.get('/api/clients')).json()).find((c: { name: string }) => c.name === name);
    expect(stored).toMatchObject({ pib: '123456789', address: 'Ulica 5, Niš' });
  });

  test('CL-01b the customer PIB must have exactly 9 digits', async ({ clientsPage, api, seed }) => {
    const name = `${uniqueId()} kupac doo`;
    seed.trackClientsByName(name);
    await clientsPage.navigate();

    await clientsPage.addClient({ name, pib: '12345' });

    await expect(clientsPage.page.getByText('PIB kupca mora imati tačno 9 cifara')).toBeVisible();
    await expect(clientsPage.toast().filter({ hasText: 'Kupac je dodat' })).toHaveCount(0);
    expect((await (await api.get('/api/clients')).json()).some((c: { name: string }) => c.name === name)).toBe(false);
  });

  test('CL-01c the customer name is required', async ({ clientsPage }) => {
    await clientsPage.navigate();
    await clientsPage.addButton().click();

    await clientsPage.pibInput().fill('123456789');
    await clientsPage.saveButton().click();

    await expect.poll(() => clientsPage.nameInput().evaluate((el: HTMLInputElement) => el.validity.valid)).toBe(false);
  });

  test('CL-01d a saved customer is edited and deleted', async ({ clientsPage, seed }) => {
    const client = await seed.client({ pib: '123456789' });
    const renamed = `${uniqueId()} preimenovan doo`;
    seed.trackClientsByName(renamed);
    await clientsPage.navigate();

    await clientsPage.editButton(client.name).click();
    await clientsPage.nameInput().fill(renamed);
    await clientsPage.saveButton().click();
    await expect(clientsPage.row(renamed)).toBeVisible();

    await clientsPage.deleteButton(renamed).click();
    await clientsPage.confirmDelete();
    await expect(clientsPage.row(renamed)).toHaveCount(0);
  });

  test('CL-02 a saved customer fills name, PIB and address on a new invoice', async ({ invoiceFormPage, seed }) => {
    await seed.product(); // the form is replaced by an empty state while there are no products
    const client = await seed.client({ pib: '123456789', address: 'Bulevar 7, Beograd' });

    await invoiceFormPage.navigateNew();
    await invoiceFormPage.savedClient().selectOption({ label: `${client.name} (123456789)` });

    await expect(invoiceFormPage.clientName()).toHaveValue(client.name);
    await expect(invoiceFormPage.clientPib()).toHaveValue('123456789');
    await expect(invoiceFormPage.clientAddress()).toHaveValue('Bulevar 7, Beograd');
  });

  test('CL-03 the same picker fills the client name in a new catalog', async ({ catalogFormPage, seed }) => {
    await seed.product();
    const client = await seed.client({ pib: '123456789' });

    await catalogFormPage.navigateNew();
    await catalogFormPage.savedClient().selectOption({ label: `${client.name} (123456789)` });

    await expect(catalogFormPage.client()).toHaveValue(client.name);
  });
});
