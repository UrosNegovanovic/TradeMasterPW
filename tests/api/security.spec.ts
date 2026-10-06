import { test as anonTest, expect } from '@playwright/test';
import { test } from '../../fixtures/api';

const PROTECTED_GET = [
  '/api/profile',
  '/api/products',
  '/api/categories',
  '/api/stock-movements',
  '/api/warehouse/low-stock',
  '/api/clients',
  '/api/catalogs',
  '/api/invoices',
  '/api/invoices/export?from=2026-01-01&to=2026-12-31&format=csv',
  '/api/products/lookup?sku=E2E-none',
  '/api/products/fetch-by-barcode?barcode=5000112637922',
];

const PROTECTED_POST = [
  '/api/products',
  '/api/products/bulk-adjust',
  '/api/stock-movements',
  '/api/categories',
  '/api/clients',
  '/api/catalogs',
  '/api/invoices',
  '/api/uploads',
];

anonTest.describe('SEC-01 protected endpoints reject anonymous requests', { tag: ['@smoke', '@api', '@p0'] }, () => {
  for (const path of PROTECTED_GET) {
    anonTest(`GET ${path} -> 401`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.status()).toBe(401);
      expect(await response.json()).toEqual({ error: 'Unauthorized' });
    });
  }
  for (const path of PROTECTED_POST) {
    anonTest(`POST ${path} -> 401`, async ({ request }) => {
      const response = await request.post(path, { data: {} });
      expect(response.status()).toBe(401);
      expect(await response.json()).toEqual({ error: 'Unauthorized' });
    });
  }
  anonTest('a garbage Bearer token is rejected too', async ({ request }) => {
    const response = await request.get('/api/products', { headers: { Authorization: 'Bearer not-a-real-token' } });
    expect(response.status()).toBe(401);
  });
});

anonTest.describe('SEC-05 no debug or ingest routes', { tag: ['@smoke', '@api'] }, () => {
  for (const path of ['/api/debug', '/api/debug-env', '/api/debug/env', '/api/ingest', '/api/ingest/events']) {
    anonTest(`${path} -> 404`, async ({ request }) => {
      expect((await request.get(path)).status()).toBe(404);
    });
  }
});

// Cross-tenant access answers 403 or 404 depending on the resource; both mean "not yours".
const DENIED = [403, 404];

test.describe('SEC-02 tenant isolation (user B against user A data)', { tag: ['@api', '@p0'] }, () => {
  test('B cannot modify or delete A product, A data stays intact', async ({ seed, api, apiB }) => {
    const product = await seed.product({ name: 'E2E original' });

    const put = await apiB.put(`/api/products/${product.id}`, { data: { name: 'HACKED', sku: product.sku, costPrice: 1 } });
    expect(DENIED).toContain(put.status());
    expect(DENIED).toContain((await apiB.delete(`/api/products/${product.id}`)).status());

    const owned = await (await api.get('/api/products')).json();
    expect(owned.find((p: { id: string }) => p.id === product.id)?.name).toBe('E2E original');

    const seenByB = await (await apiB.get('/api/products')).json();
    expect(seenByB.map((p: { id: string }) => p.id)).not.toContain(product.id);
  });

  test('B cannot modify or delete an A client', async ({ seed, api, apiB }) => {
    const client = await seed.client();

    expect(DENIED).toContain((await apiB.put(`/api/clients/${client.id}`, { data: { name: 'HACKED', pib: '123456789' } })).status());
    expect(DENIED).toContain((await apiB.delete(`/api/clients/${client.id}`)).status());

    const owned = await (await api.get('/api/clients')).json();
    expect(owned.find((c: { id: string }) => c.id === client.id)?.name).toBe(client.name);
    const seenByB = await (await apiB.get('/api/clients')).json();
    expect(seenByB.map((c: { id: string }) => c.id)).not.toContain(client.id);
  });

  test('B cannot read, edit or delete an A catalog, nor build one from A products', async ({ seed, api, apiB }) => {
    const product = await seed.product();
    const catalog = await seed.catalog([product.id]);

    expect(DENIED).toContain((await apiB.get(`/api/catalogs/${catalog.id}`)).status());
    expect(DENIED).toContain((await apiB.patch(`/api/catalogs/${catalog.id}`, { data: { name: 'HACKED', discount: 0, productIds: [product.id] } })).status());
    expect(DENIED).toContain((await apiB.delete(`/api/catalogs/${catalog.id}`)).status());

    const stolen = await apiB.post('/api/catalogs', { data: { name: 'E2E steal', discount: 0, productIds: [product.id] } });
    expect(stolen.status()).toBe(400);

    const owned = await (await api.get(`/api/catalogs/${catalog.id}`)).json();
    expect(owned.name).toBe(catalog.name);
  });
});
