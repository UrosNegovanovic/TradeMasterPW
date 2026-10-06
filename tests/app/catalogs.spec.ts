import { test, expect } from '../../fixtures';
import { copy } from '../../test-data/copy';
import { formatMoney } from '../../utils/money';
import { uniqueId } from '../../utils/seed';

const { catalogs } = copy;

test.describe('Katalozi – owner flows', { tag: ['@regression', '@p0'] }, () => {
  test('CA-01 creates a catalog from two products with a discount; "Cena na upit" for a product without price (CA-08)', async ({ catalogFormPage, catalogsPage, page, seed }) => {
    const priced = await seed.product({ price: 200, costPrice: 100 });
    const unpriced = await seed.product({ price: 0, costPrice: 100 });
    const name = `${uniqueId()} katalog`;
    seed.trackCatalogsByName(name);

    await catalogFormPage.navigateNew();
    await catalogFormPage.name().fill(name);
    await catalogFormPage.client().fill('E2E Kupac');
    await catalogFormPage.discount().fill('10');
    await catalogFormPage.selectProducts([priced.name, unpriced.name]);
    await catalogFormPage.createButton().click();

    await expect(catalogsPage.toast().filter({ hasText: catalogs.toasts.created })).toBeVisible();
    const card = catalogsPage.card(name);
    await expect(card).toContainText('10.00%');
    await expect(card).toContainText('2 proizvoda');
    await expect(card).toContainText('E2E Kupac');

    await card.getByRole('link', { name: 'Pregled' }).click();
    const main = page.getByRole('main');
    await expect(main).toContainText(formatMoney(200));
    await expect(main).toContainText(formatMoney(180));
    await expect(main).toContainText(catalogs.priceOnRequest);
  });

  test('CA-02a the catalog name is required', async ({ catalogFormPage, seed }) => {
    const product = await seed.product();

    await catalogFormPage.navigateNew();
    await catalogFormPage.selectProducts([product.name]);
    await catalogFormPage.createButton().click();

    await expect(catalogFormPage.page).toHaveURL(/\/catalogs\/new/);
    await expect(catalogFormPage.main().getByText(catalogs.errors.nameRequired)).toBeVisible();
  });

  test('CA-02b a catalog without products is not created', async ({ catalogFormPage, catalogsPage, seed }) => {
    const name = `${uniqueId()} katalog`;
    seed.trackCatalogsByName(name);

    await catalogFormPage.navigateNew();
    await catalogFormPage.name().fill(name);
    await catalogFormPage.createButton().click();

    await expect(catalogFormPage.page).toHaveURL(/\/catalogs\/new/);
    await expect(catalogsPage.toast().filter({ hasText: catalogs.toasts.created })).toHaveCount(0);
    await catalogsPage.navigate();
    await expect(catalogsPage.card(name)).toHaveCount(0);
  });

  test('CA-02c a discount above 100 is rejected', async ({ catalogFormPage, seed }) => {
    const product = await seed.product();
    const name = `${uniqueId()} katalog`;
    seed.trackCatalogsByName(name);

    await catalogFormPage.navigateNew();
    await catalogFormPage.name().fill(name);
    await catalogFormPage.discount().fill('101');
    await catalogFormPage.selectProducts([product.name]);
    await catalogFormPage.createButton().click();

    await expect(catalogFormPage.page).toHaveURL(/\/catalogs\/new/);
  });

  test('CA-11 edits the name and deletes the catalog after confirming', async ({ catalogFormPage, catalogsPage, seed }) => {
    const product = await seed.product();
    const catalog = await seed.catalog([product.id], { discount: 5 });
    const renamed = `${uniqueId()} preimenovan`;
    seed.trackCatalogsByName(renamed);

    await catalogFormPage.navigateEdit(catalog.id);
    await catalogFormPage.name().fill(renamed);
    await catalogFormPage.saveButton().click();

    await catalogsPage.navigate();
    await expect(catalogsPage.card(renamed)).toBeVisible();

    await catalogsPage.deleteCatalog(renamed);
    await expect(catalogsPage.card(renamed)).toHaveCount(0);
  });
});

test.describe('Katalozi – sharing', { tag: ['@regression', '@p0'] }, () => {
  test('CA-07c the owner turns the link on and off from the detail page', async ({ catalogDetailPage, seed, api }) => {
    const product = await seed.product();
    const catalog = await seed.catalog([product.id]);
    await catalogDetailPage.navigate(catalog.id);
    await expect(catalogDetailPage.shareRegion()).toContainText(catalogs.share.disabled);

    await catalogDetailPage.shareOn().click();
    await expect(catalogDetailPage.preview()).toBeVisible();
    expect((await (await api.get(`/api/catalogs/${catalog.id}`)).json()).shareEnabled).toBe(true);

    await catalogDetailPage.shareOff().click();
    await expect(catalogDetailPage.shareRegion()).toContainText(catalogs.share.revoked);
    expect((await (await api.get(`/api/catalogs/${catalog.id}`)).json()).shareEnabled).toBe(false);
  });

  test('CA-12 WhatsApp, Viber and e-mail buttons carry the share link (hrefs only, no app is opened)', async ({ catalogDetailPage, seed, api }) => {
    const product = await seed.product();
    const catalog = await seed.catalog([product.id], { name: `${uniqueId()} katalog za slanje` });
    const { url } = await (await api.post(`/api/catalogs/${catalog.id}/share`)).json();
    const token = url.split('/').pop() as string;

    await catalogDetailPage.navigate(catalog.id);

    await expect(catalogDetailPage.whatsApp()).toHaveAttribute('href', new RegExp(`^https://wa\\.me/\\?text=.*${token}`));
    await expect(catalogDetailPage.viber()).toHaveAttribute('href', new RegExp(`^viber://forward\\?text=.*${token}`));
    await expect(catalogDetailPage.mail()).toHaveAttribute('href', new RegExp(`^mailto:\\?subject=.*&body=.*${token}`));
  });

  test('CA-10 the detail page downloads a PDF', async ({ catalogDetailPage, seed, page }) => {
    const product = await seed.product({ description: 'Opis sa č ć đ š ž' });
    const catalog = await seed.catalog([product.id]);
    await catalogDetailPage.navigate(catalog.id);

    const download = page.waitForEvent('download');
    await catalogDetailPage.pdfButton().click();
    const file = await download;

    expect(file.suggestedFilename()).toMatch(/\.pdf$/i);
    const { readFile } = await import('fs/promises');
    const bytes = await readFile(await file.path());
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(1500);
  });
});
