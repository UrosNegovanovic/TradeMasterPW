import { test, expect } from '../../fixtures/api';

type Json = Record<string, unknown>;
const tokenFrom = (shareUrl: string) => shareUrl.split('/').pop() as string;

/** Every key anywhere in a JSON document, so a leaked field is found however deep it sits. */
function allKeys(value: unknown, keys = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((v) => allKeys(v, keys));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      keys.add(k);
      allKeys(v, keys);
    }
  }
  return keys;
}

const FORBIDDEN_KEYS = ['costPrice', 'costPriceZeroReason', 'unitCost', 'quantity', 'minStock', 'profileId', 'clerkUserId', 'shareToken', 'shareEnabled', 'accessExpiresAt', 'pib', 'giroAccount'];

test.describe('Catalogs API – creation and editing', { tag: ['@api', '@regression', '@p0'] }, () => {
  test('CA-01 a catalog of two products applies the discount to every price', async ({ api, seed }) => {
    const a = await seed.product({ price: 200, costPrice: 100 });
    const b = await seed.product({ price: 1000, costPrice: 400 });

    const catalog = await seed.catalog([a.id, b.id], { discount: 10 });

    const full = (await (await api.get(`/api/catalogs/${catalog.id}`)).json()) as { items: Array<{ productId: string; originalPrice: string; discountedPrice: string }> };
    const price = (id: string) => full.items.find((i) => i.productId === id)!;
    expect(price(a.id)).toMatchObject({ originalPrice: '200', discountedPrice: '180' });
    expect(price(b.id)).toMatchObject({ originalPrice: '1000', discountedPrice: '900' });
  });

  const INVALID: Array<{ title: string; make: (id: string) => Json; path: string }> = [
    { title: 'missing name', make: (id) => ({ discount: 0, productIds: [id] }), path: 'name' },
    { title: 'missing discount', make: (id) => ({ name: 'E2E', productIds: [id] }), path: 'discount' },
    { title: 'discount above 100', make: (id) => ({ name: 'E2E', discount: 101, productIds: [id] }), path: 'discount' },
    { title: 'negative discount', make: (id) => ({ name: 'E2E', discount: -1, productIds: [id] }), path: 'discount' },
    { title: 'no products', make: () => ({ name: 'E2E', discount: 0, productIds: [] }), path: 'productIds' },
    { title: 'the same product twice', make: (id) => ({ name: 'E2E', discount: 0, productIds: [id, id] }), path: 'productIds' },
    { title: 'notes longer than 1000 characters', make: (id) => ({ name: 'E2E', discount: 0, productIds: [id], notes: 'x'.repeat(1001) }), path: 'notes' },
  ];
  for (const { title, make, path } of INVALID) {
    test(`CA-02 validation: ${title} -> 400`, async ({ api, seed }) => {
      const product = await seed.product();

      const response = await api.post('/api/catalogs', { data: make(product.id) });

      expect(response.status()).toBe(400);
      const payload = await response.json();
      expect(JSON.stringify(payload.details)).toContain(path);
    });
  }

  test('CA-04 the manual order is stored and can be changed', async ({ api, seed }) => {
    const [a, b, c] = [await seed.product(), await seed.product(), await seed.product()];
    const catalog = await seed.catalog([b.id, a.id, c.id], { sortMode: 'MANUAL' });
    const order = async () =>
      ((await (await api.get(`/api/catalogs/${catalog.id}`)).json()) as { items: Array<{ productId: string; sortOrder: number }> }).items
        .sort((x, y) => x.sortOrder - y.sortOrder)
        .map((i) => i.productId);

    expect(await order()).toEqual([b.id, a.id, c.id]);

    const edit = await api.patch(`/api/catalogs/${catalog.id}`, { data: { name: catalog.name, discount: 0, productIds: [c.id, b.id, a.id], sortMode: 'MANUAL' } });
    expect(edit.status()).toBe(200);
    expect(await order()).toEqual([c.id, b.id, a.id]);
  });

  test('CA-11 a catalog can be edited and deleted', async ({ api, seed }) => {
    const product = await seed.product();
    const catalog = await seed.catalog([product.id]);

    const edit = await api.patch(`/api/catalogs/${catalog.id}`, { data: { name: 'E2E preimenovan', discount: 15, productIds: [product.id], notes: 'nova napomena' } });
    expect(edit.status()).toBe(200);
    expect(await (await api.get(`/api/catalogs/${catalog.id}`)).json()).toMatchObject({ name: 'E2E preimenovan', discount: '15', notes: 'nova napomena' });

    expect((await api.delete(`/api/catalogs/${catalog.id}`)).status()).toBe(200);
    expect((await api.get(`/api/catalogs/${catalog.id}`)).status()).toBe(404);
  });
});

test.describe('Catalogs API – public link', { tag: ['@api', '@regression', '@p0'] }, () => {
  test('CA-07 the public id link: 410 until shared, 200 while shared, 410 after revoking, 404 when unknown', async ({ api, seed, request }) => {
    const product = await seed.product();
    const catalog = await seed.catalog([product.id]);

    expect((await request.get(`/api/public/catalogs/${catalog.id}`)).status()).toBe(410);

    expect((await api.post(`/api/catalogs/${catalog.id}/share`)).status()).toBe(200);
    expect((await request.get(`/api/public/catalogs/${catalog.id}`)).status()).toBe(200);

    expect((await api.delete(`/api/catalogs/${catalog.id}/share`)).status()).toBe(200);
    expect((await request.get(`/api/public/catalogs/${catalog.id}`)).status()).toBe(410);

    expect((await request.get('/api/public/catalogs/cnonexistent000000000000000')).status()).toBe(404);
  });

  test('CA-07b the token link stops working when revoked, and a new link invalidates the old one', async ({ api, seed, request }) => {
    const product = await seed.product();
    const catalog = await seed.catalog([product.id]);
    const first = tokenFrom((await (await api.post(`/api/catalogs/${catalog.id}/share`)).json()).url);
    expect((await request.get(`/api/shared/catalog/${first}`)).status()).toBe(200);

    // Sharing again issues a new token (the UI calls it "Napravi novi link").
    await api.delete(`/api/catalogs/${catalog.id}/share`);
    const second = tokenFrom((await (await api.post(`/api/catalogs/${catalog.id}/share`)).json()).url);

    expect(second).not.toBe(first);
    expect((await request.get(`/api/shared/catalog/${first}`)).status()).toBe(404);
    expect((await request.get(`/api/shared/catalog/${second}`)).status()).toBe(200);

    await api.delete(`/api/catalogs/${catalog.id}/share`);
    expect((await request.get(`/api/shared/catalog/${second}`)).status()).toBe(404);
  });

  test('CA-06 the public data never contains cost price, stock or owner ids (both endpoints)', async ({ api, seed, request }) => {
    const product = await seed.product({ quantity: 7, price: 200, costPrice: 123, description: 'Javni opis' });
    const catalog = await seed.catalog([product.id], { discount: 10 });
    const token = tokenFrom((await (await api.post(`/api/catalogs/${catalog.id}/share`)).json()).url);

    const byId = await (await request.get(`/api/public/catalogs/${catalog.id}`)).json();
    const byToken = await (await request.get(`/api/shared/catalog/${token}`)).json();

    for (const [label, dto] of [['by id', byId], ['by token', byToken]] as const) {
      const keys = allKeys(dto);
      for (const forbidden of FORBIDDEN_KEYS) expect(keys.has(forbidden), `${label}: leaked key "${forbidden}"`).toBe(false);
      // The cost value itself must not appear under any other name either.
      expect(JSON.stringify(dto), `${label}: cost value`).not.toContain('"123"');
    }
  });

  // An allow-list catches a new, unreviewed field the moment someone adds it to the public response.
  test('CA-06b the public response contains only the agreed fields', async ({ api, seed, request }) => {
    const product = await seed.product({ description: 'Javni opis' });
    const catalog = await seed.catalog([product.id]);
    const token = tokenFrom((await (await api.post(`/api/catalogs/${catalog.id}/share`)).json()).url);

    const dto = (await (await request.get(`/api/shared/catalog/${token}`)).json()) as Json;

    expect(Object.keys(dto).sort()).toEqual(['clientName', 'discount', 'display', 'items', 'name', 'notes', 'profile']);
    expect(Object.keys(dto.display as Json).sort()).toEqual(['groupByCategory', 'layout', 'showDescription', 'showOriginalPrice', 'showSku', 'sortMode']);
    expect(Object.keys(dto.profile as Json).sort()).toEqual(['address', 'companyName', 'contactEmail', 'contactPhone', 'logoUrl']);
    const [item] = dto.items as Array<Json>;
    expect(Object.keys(item).sort()).toEqual(['discountedPrice', 'id', 'originalPrice', 'product', 'sortOrder']);
    expect(Object.keys(item.product as Json).sort()).toEqual(['categoryName', 'description', 'imageUrl', 'name', 'sku']);
  });

  test('CA-05 a hidden SKU and description are absent from the public JSON', async ({ api, seed, request }) => {
    // The default product name embeds the SKU, so give it a name of its own to test the SKU alone.
    const product = await seed.product({ name: 'Plava stolica', description: 'Tajni opis proizvoda' });
    const catalog = await seed.catalog([product.id], { showSku: false, showDescription: false });
    const token = tokenFrom((await (await api.post(`/api/catalogs/${catalog.id}/share`)).json()).url);

    const text = await (await request.get(`/api/shared/catalog/${token}`)).text();

    expect(text).not.toContain(product.sku);
    expect(text).not.toContain('Tajni opis proizvoda');
    expect(JSON.parse(text).items[0].product).toMatchObject({ name: 'Plava stolica', sku: null, description: null });
    expect(JSON.parse(text).display).toMatchObject({ showSku: false, showDescription: false });
  });

  test('CA-05b with SKU and description enabled they are present', async ({ api, seed, request }) => {
    const product = await seed.product({ description: 'Vidljiv opis' });
    const catalog = await seed.catalog([product.id], { showSku: true, showDescription: true });
    const token = tokenFrom((await (await api.post(`/api/catalogs/${catalog.id}/share`)).json()).url);

    const text = await (await request.get(`/api/shared/catalog/${token}`)).text();

    expect(text).toContain(product.sku);
    expect(text).toContain('Vidljiv opis');
  });

  test('CA-08 a product without a selling price is exported with price 0 (shown as "Cena na upit")', async ({ api, seed, request }) => {
    const product = await seed.product({ price: 0, costPrice: 50 });
    const catalog = await seed.catalog([product.id], { discount: 10 });
    const token = tokenFrom((await (await api.post(`/api/catalogs/${catalog.id}/share`)).json()).url);

    const dto = await (await request.get(`/api/shared/catalog/${token}`)).json();

    expect(Number(dto.items[0].originalPrice)).toBe(0);
    expect(Number(dto.items[0].discountedPrice)).toBe(0);
  });
});
