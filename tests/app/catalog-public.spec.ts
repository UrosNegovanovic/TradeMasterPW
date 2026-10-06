import { test, expect } from '../../fixtures';
import { copy } from '../../test-data/copy';
import { uniqueId } from '../../utils/seed';

const { catalogs } = copy;

// The customer opens the link without any session.
test.use({ storageState: { cookies: [], origins: [] } });

const shareUrlOf = async (api: { post: (p: string) => Promise<{ json: () => Promise<{ url: string }> }> }, catalogId: string) =>
  (await (await api.post(`/api/catalogs/${catalogId}/share`)).json()).url;

test.describe('Javni katalog – customer view', { tag: ['@regression', '@p0'] }, () => {
  test('CA-09a search narrows the list; no match shows the empty message', async ({ publicCatalogPage, seed, api }) => {
    const prefix = uniqueId('Q');
    const products = [await seed.product({ name: `${prefix} Jabuka` }), await seed.product({ name: `${prefix} Kruska` })];
    const catalog = await seed.catalog(products.map((p) => p.id));

    await publicCatalogPage.navigate(await shareUrlOf(api, catalog.id));
    await expect(publicCatalogPage.productNames()).toHaveCount(2);

    await publicCatalogPage.search().fill('Kruska');
    await expect(publicCatalogPage.productNames()).toHaveText([`${prefix} Kruska`]);

    await publicCatalogPage.search().fill('nema-takvog-proizvoda');
    await expect(publicCatalogPage.noMatch()).toBeVisible();
    await expect(publicCatalogPage.productNames()).toHaveCount(0);
  });

  test('CA-09b pagination: 12 per page, the rest on page 2, and a larger page size shows everything', async ({ publicCatalogPage, seed, api }) => {
    const prefix = uniqueId('P');
    const products = await Promise.all(Array.from({ length: 14 }, (_, i) => seed.product({ name: `${prefix} ${String(i + 1).padStart(2, '0')}` })));
    const catalog = await seed.catalog(products.map((p) => p.id));

    await publicCatalogPage.navigate(await shareUrlOf(api, catalog.id));

    await expect(publicCatalogPage.productNames()).toHaveCount(12);
    await expect(publicCatalogPage.pagination()).toContainText('od 14 proizvoda');
    await expect(publicCatalogPage.previous()).toBeDisabled();

    await publicCatalogPage.next().click();
    await expect(publicCatalogPage.productNames()).toHaveCount(2);
    await expect(publicCatalogPage.next()).toBeDisabled();

    await publicCatalogPage.choosePageSize('24 po strani');
    await expect(publicCatalogPage.productNames()).toHaveCount(14);
  });

  test('CA-05c a hidden SKU and description are not in the page either', async ({ publicCatalogPage, seed, api }) => {
    const product = await seed.product({ name: 'Zelena lampa', description: 'Tajni opis lampe' });
    const catalog = await seed.catalog([product.id], { showSku: false, showDescription: false });

    await publicCatalogPage.navigate(await shareUrlOf(api, catalog.id));

    await expect(publicCatalogPage.productNames()).toHaveText(['Zelena lampa']);
    await expect(publicCatalogPage.page.getByText(product.sku)).toHaveCount(0);
    await expect(publicCatalogPage.page.getByText('Tajni opis lampe')).toHaveCount(0);
  });

  test('CA-05d with SKU and description enabled both are shown', async ({ publicCatalogPage, seed, api }) => {
    const product = await seed.product({ name: 'Crvena lampa', description: 'Vidljiv opis lampe' });
    const catalog = await seed.catalog([product.id], { showSku: true, showDescription: true });

    await publicCatalogPage.navigate(await shareUrlOf(api, catalog.id));

    await expect(publicCatalogPage.page.getByText(product.sku)).toBeVisible();
    await expect(publicCatalogPage.page.getByText('Vidljiv opis lampe')).toBeVisible();
  });

  test('CA-08 a product with price 0 shows "Cena na upit" to the customer', async ({ publicCatalogPage, seed, api }) => {
    const product = await seed.product({ name: 'Cena po dogovoru', price: 0 });
    const catalog = await seed.catalog([product.id]);

    await publicCatalogPage.navigate(await shareUrlOf(api, catalog.id));

    await expect(publicCatalogPage.page.getByText(catalogs.priceOnRequest)).toBeVisible();
  });

  test('CA-07d a revoked link shows an unavailable page instead of the catalog', async ({ publicCatalogPage, seed, api, page }) => {
    const product = await seed.product({ name: 'Opozvan proizvod' });
    const catalog = await seed.catalog([product.id]);
    const url = await shareUrlOf(api, catalog.id);
    await publicCatalogPage.navigate(url);
    await expect(publicCatalogPage.productNames()).toHaveCount(1);

    await api.delete(`/api/catalogs/${catalog.id}/share`);
    await page.goto(url);

    // The page retries the failing request a few times before it gives up, so the message takes several seconds.
    await expect(publicCatalogPage.notFoundHeading()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(catalogs.public.notFound.text)).toBeVisible();
    await expect(page.getByText('Opozvan proizvod')).toHaveCount(0);
  });
});

test.describe('Javni katalog – display settings (CA-03)', { tag: ['@regression', '@p0'] }, () => {
  const NAMES = { banana: 'Banana', cvekla: 'Cvekla', ananas: 'Ananas' };

  /** Same catalog, one sort mode: the customer link and the owner preview must show the same order. */
  const MODES: Array<{ sortMode: 'MANUAL' | 'NAME' | 'PRICE_ASC' | 'PRICE_DESC'; expected: string[] }> = [
    { sortMode: 'MANUAL', expected: [NAMES.banana, NAMES.cvekla, NAMES.ananas] },
    { sortMode: 'NAME', expected: [NAMES.ananas, NAMES.banana, NAMES.cvekla] },
    { sortMode: 'PRICE_ASC', expected: [NAMES.cvekla, NAMES.ananas, NAMES.banana] },
    { sortMode: 'PRICE_DESC', expected: [NAMES.banana, NAMES.ananas, NAMES.cvekla] },
  ];

  for (const { sortMode, expected } of MODES) {
    test(`CA-03 ${sortMode}: public link and owner preview agree on the order`, async ({ publicCatalogPage, catalogDetailPage, seed, api, browser, baseURL }) => {
      const prefix = uniqueId('S');
      const banana = await seed.product({ name: `${prefix} ${NAMES.banana}`, price: 300 });
      const cvekla = await seed.product({ name: `${prefix} ${NAMES.cvekla}`, price: 100 });
      const ananas = await seed.product({ name: `${prefix} ${NAMES.ananas}`, price: 200 });
      // The manual order is the order the ids are given in.
      const catalog = await seed.catalog([banana.id, cvekla.id, ananas.id], { sortMode });
      const expectedNames = expected.map((n) => `${prefix} ${n}`);

      await publicCatalogPage.navigate(await shareUrlOf(api, catalog.id));
      await expect(publicCatalogPage.productNames()).toHaveText(expectedNames);

      // Owner preview needs the signed-in session, so it runs in its own context.
      const owner = await browser.newContext({ baseURL, storageState: 'playwright/.auth/user.json' });
      try {
        const ownerPage = await owner.newPage();
        const detail = new (catalogDetailPage.constructor as typeof import('../../pages/CatalogDetailPage').CatalogDetailPage)(ownerPage);
        await detail.navigate(catalog.id);
        await expect(detail.productNames()).toHaveText(expectedNames);
      } finally {
        await owner.close();
      }
    });
  }
});
