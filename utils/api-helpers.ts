import { ApiClient } from './api-client';
import { uniqueId } from './seed';

export const quantityOf = async (api: ApiClient, productId: string): Promise<number | undefined> =>
  ((await (await api.get('/api/products')).json()) as Array<{ id: string; quantity: number }>).find((p) => p.id === productId)?.quantity;

export const invoicesOf = async (api: ApiClient) =>
  (await (await api.get('/api/invoices')).json()) as Array<{ id: string; invoiceNumber: string; clientName: string; status: string }>;

/** Invoice numbers look like "01/2026": sequence per company and year. */
export const INVOICE_NUMBER = /^\d{2,}\/\d{4}$/;

export const sequenceOf = (invoiceNumber: string) => Number(invoiceNumber.split('/')[0]);

/** Local calendar date as YYYY-MM-DD with an offset in days (the app cuts days in Europe/Belgrade). */
export const isoDate = (offsetDays = 0) => new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

/** Valid invoice payload (status UNPAID by default); callers override what the test is about. */
export const invoiceBody = (items: unknown[], overrides: Record<string, unknown> = {}) => ({
  clientName: `${uniqueId()} kupac`,
  clientPib: '111222333',
  clientAddress: 'Test 1',
  dueDate: isoDate(7),
  status: 'UNPAID',
  items,
  ...overrides,
});

export const invoiceLine = (product: { id: string; name: string }, overrides: Record<string, unknown> = {}) => ({
  productId: product.id,
  productName: product.name,
  quantity: 2,
  unitPrice: 100,
  discount: 0,
  vatRate: 0,
  ...overrides,
});

/**
 * Empties a dedicated tenant so a test starts from a known state (exact totals, empty states).
 * Order matters: invoices and catalogs reference products. Never call this on a shared tenant.
 */
export async function purgeTenant(api: ApiClient) {
  const list = async (path: string) => (await (await api.get(path)).json()) as Array<{ id: string }>;
  for (const [path, base] of [['/api/invoices', '/api/invoices'], ['/api/catalogs', '/api/catalogs'], ['/api/clients', '/api/clients'], ['/api/products', '/api/products']] as const) {
    for (const item of await list(path)) await api.delete(`${base}/${item.id}`);
  }
}
