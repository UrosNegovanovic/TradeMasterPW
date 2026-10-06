import { test, expect } from '../../fixtures/api';
import { ApiClient } from '../../utils/api-client';

type Movement = { type: 'IN' | 'OUT'; quantity: number; reason: string; source: string };

const quantityOf = async (api: ApiClient, id: string) =>
  ((await (await api.get('/api/products')).json()) as Array<{ id: string; quantity: number }>).find((p) => p.id === id)?.quantity;

const movementsOf = async (api: ApiClient, productId: string) =>
  (await (await api.get(`/api/stock-movements?productId=${productId}`)).json()) as Movement[];

test.describe('Stock movements API', { tag: ['@api', '@regression', '@p0'] }, () => {
  test('WH-01 IN raises stock and is recorded', async ({ api, seed }) => {
    const product = await seed.product({ quantity: 5 });

    const response = await api.post('/api/stock-movements', { data: { productId: product.id, type: 'IN', quantity: 3, reason: 'E2E ulaz' } });

    expect(response.status()).toBe(201);
    expect(await quantityOf(api, product.id)).toBe(8);
    expect(await movementsOf(api, product.id)).toContainEqual(expect.objectContaining({ type: 'IN', quantity: 3, reason: 'E2E ulaz', source: 'MANUAL' }));
  });

  test('WH-02 OUT lowers stock and is recorded', async ({ api, seed }) => {
    const product = await seed.product({ quantity: 5 });

    const response = await api.post('/api/stock-movements', { data: { productId: product.id, type: 'OUT', quantity: 2, reason: 'E2E izlaz' } });

    expect(response.status()).toBe(201);
    expect(await quantityOf(api, product.id)).toBe(3);
    expect(await movementsOf(api, product.id)).toContainEqual(expect.objectContaining({ type: 'OUT', quantity: 2, reason: 'E2E izlaz' }));
  });

  test('WH-03 OUT above stock -> 400 Insufficient stock, nothing changes', async ({ api, seed }) => {
    const product = await seed.product({ quantity: 4 });

    const response = await api.post('/api/stock-movements', { data: { productId: product.id, type: 'OUT', quantity: 5, reason: 'E2E previše' } });

    expect(response.status()).toBe(400);
    expect((await response.json()).error).toBe('Insufficient stock');
    expect(await quantityOf(api, product.id)).toBe(4);
    expect(await movementsOf(api, product.id)).not.toContainEqual(expect.objectContaining({ type: 'OUT' }));
  });

  test('WH-03b taking exactly the whole stock is allowed and never goes negative', async ({ api, seed }) => {
    const product = await seed.product({ quantity: 3 });

    expect((await api.post('/api/stock-movements', { data: { productId: product.id, type: 'OUT', quantity: 3, reason: 'E2E sve' } })).status()).toBe(201);
    expect(await quantityOf(api, product.id)).toBe(0);

    const extra = await api.post('/api/stock-movements', { data: { productId: product.id, type: 'OUT', quantity: 1, reason: 'E2E minus' } });
    expect(extra.status()).toBe(400);
    expect(await quantityOf(api, product.id)).toBe(0);
  });

  const INVALID: Array<{ title: string; body: (id: string) => Record<string, unknown> }> = [
    { title: 'quantity 0', body: (id) => ({ productId: id, type: 'IN', quantity: 0, reason: 'E2E' }) },
    { title: 'negative quantity', body: (id) => ({ productId: id, type: 'IN', quantity: -2, reason: 'E2E' }) },
    { title: 'missing reason', body: (id) => ({ productId: id, type: 'IN', quantity: 1 }) },
    { title: 'unknown type', body: (id) => ({ productId: id, type: 'SIDEWAYS', quantity: 1, reason: 'E2E' }) },
  ];
  for (const { title, body } of INVALID) {
    test(`WH-04 validation: ${title} -> 400`, async ({ api, seed }) => {
      const product = await seed.product({ quantity: 5 });

      const response = await api.post('/api/stock-movements', { data: body(product.id) });

      expect(response.status()).toBe(400);
      expect(await quantityOf(api, product.id)).toBe(5);
    });
  }

  test('WH-05 user B cannot move stock of user A product', async ({ api, apiB, seed }) => {
    const product = await seed.product({ quantity: 5 });

    const response = await apiB.post('/api/stock-movements', { data: { productId: product.id, type: 'IN', quantity: 100, reason: 'E2E napad' } });

    expect([400, 403, 404]).toContain(response.status());
    expect(await quantityOf(api, product.id)).toBe(5);
  });
});
