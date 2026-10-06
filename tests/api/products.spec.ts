import { test, expect } from '../../fixtures/api';
import { uniqueId } from '../../utils/seed';

type ProductDto = { id: string; sku: string; quantity: number; price: string; costPrice: string | null };

const listBySku = async (api: { get: (p: string) => Promise<{ json: () => Promise<unknown> }> }, sku: string) =>
  ((await (await api.get('/api/products')).json()) as ProductDto[]).filter((p) => p.sku === sku);

test.describe('Products API', { tag: ['@api', '@regression', '@p0'] }, () => {
  test('PR-10 Idempotency-Key: replaying the same request has one effect', async ({ api, seed }) => {
    const sku = uniqueId();
    seed.trackProductBySku(sku);
    const key = `e2e-${sku}`;
    const body = { name: `${sku} proizvod`, sku, quantity: 5, costPrice: 10, price: 20 };

    const first = await api.post('/api/products', { data: body, headers: { 'Idempotency-Key': key } });
    const replay = await api.post('/api/products', { data: body, headers: { 'Idempotency-Key': key } });

    expect(first.status()).toBe(201);
    expect(replay.status()).toBe(201);
    expect((await replay.json()).id).toBe((await first.json()).id);

    const stored = await listBySku(api, sku);
    expect(stored).toHaveLength(1);
    expect(stored[0].quantity).toBe(5);
  });

  test('PR-10b an invalid Idempotency-Key is rejected', async ({ api }) => {
    const response = await api.post('/api/products', {
      data: { name: 'E2E bad key', sku: uniqueId(), quantity: 1, costPrice: 1 },
      headers: { 'Idempotency-Key': '!!' },
    });
    expect(response.status()).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid idempotency key' });
  });

  // Brief claimed 409; the live intake path merges into the existing product instead.
  test('PR-11 posting an existing SKU adds to the stock instead of creating a duplicate', async ({ api, seed }) => {
    const product = await seed.product({ quantity: 5 });

    const again = await api.post('/api/products', {
      data: { name: product.name, sku: product.sku, quantity: 5, costPrice: 10, price: 20 },
    });

    expect(again.status()).toBe(200);
    const stored = await listBySku(api, product.sku);
    expect(stored).toHaveLength(1);
    expect(stored[0].quantity).toBe(10);
  });

  test('PR-12 quick scan may save a product without cost price', async ({ api, seed }) => {
    const sku = uniqueId();
    seed.trackProductBySku(sku);
    const response = await api.post('/api/products', { data: { name: `${sku} sken`, sku, quantity: 1 } });

    expect(response.status()).toBe(201);
    const [stored] = await listBySku(api, sku);
    expect(stored.costPrice).toBeNull();
    expect(stored.price).toBe('0');
  });

  const INVALID: Array<{ title: string; body: Record<string, unknown>; field: string; message?: string }> = [
    { title: 'missing name', body: { sku: 'x', quantity: 1, costPrice: 1 }, field: 'name' },
    { title: 'quantity 0', body: { name: 'x', sku: 'x', quantity: 0, costPrice: 1 }, field: 'quantity' },
    { title: 'negative cost price', body: { name: 'x', sku: 'x', quantity: 1, costPrice: -1 }, field: 'costPrice', message: 'Nabavna cena ne može biti negativna' },
    { title: 'cost price with 3 decimals', body: { name: 'x', sku: 'x', quantity: 1, costPrice: 19.999 }, field: 'costPrice', message: 'Nabavna cena može imati najviše 2 decimale' },
  ];
  for (const { title, body, field, message } of INVALID) {
    test(`PR-04 validation: ${title} -> 400`, async ({ api }) => {
      const sku = uniqueId();
      const response = await api.post('/api/products', { data: { ...body, sku: `${sku}-${field}` } });
      expect(response.status()).toBe(400);

      const payload = await response.json();
      expect(payload.error).toBe('Validation error');
      const issues = payload.details.issues as Array<{ path: string[]; message: string }>;
      expect(issues.some((i) => i.path.includes(field))).toBe(true);
      if (message) expect(issues.map((i) => i.message)).toContain(message);
    });
  }

  test('PR-04 money with two decimals is stored exactly', async ({ api, seed }) => {
    const sku = uniqueId();
    seed.trackProductBySku(sku);
    const response = await api.post('/api/products', { data: { name: `${sku} cena`, sku, quantity: 1, costPrice: 19.99, price: 99999999.99 } });

    expect(response.status()).toBe(201);
    const [stored] = await listBySku(api, sku);
    expect(stored.costPrice).toBe('19.99');
    expect(stored.price).toBe('99999999.99');
  });

  test('PR-02 editing a product requires the cost price', async ({ api, seed }) => {
    const product = await seed.product();
    const response = await api.put(`/api/products/${product.id}`, { data: { name: product.name, sku: product.sku } });

    expect(response.status()).toBe(400);
    expect(JSON.stringify(await response.json())).toContain('Nabavna cena je obavezna');
  });
});
