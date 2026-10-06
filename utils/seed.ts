import { randomBytes } from 'crypto';
import { expect } from '@playwright/test';
import { ApiClient } from './api-client';

export interface SeededProduct { id: string; sku: string; name: string; quantity: number }
export interface SeededClient { id: string; name: string }
export interface SeededCatalog { id: string; name: string }
export interface SeededInvoice { id: string; invoiceNumber: string; status: string; totalAmount: string; vatAmount: string; items: Array<Record<string, string | number>> }

export interface InvoiceItemInput {
  product: Pick<SeededProduct, 'id' | 'name'>;
  quantity?: number;
  unitPrice?: number;
  discount?: number;
  vatRate?: 0 | 10 | 20;
}

let counter = 0;
/**
 * Unique, recognisable test identifier: E2E-<timestamp>-<random>-<n>.
 * The random part matters: two parallel workers can hit the same millisecond with the same counter, and
 * POST /api/products merges a repeated SKU into the existing product instead of creating a new one.
 */
export const uniqueId = (prefix = 'E2E') => `${prefix}-${Date.now()}-${randomBytes(3).toString('hex')}-${++counter}`;

/** Creates test data through the API and removes it on cleanup, children before parents. */
export class Seeder {
  private readonly cleanups: Array<() => Promise<unknown>> = [];
  // Invoices go first: deleting an issued invoice returns its stock, and products cannot be removed while referenced.
  private readonly invoiceCleanups: Array<() => Promise<unknown>> = [];
  // Catalogs reference products too, so they are removed before the products.
  private readonly catalogCleanups: Array<() => Promise<unknown>> = [];

  constructor(private readonly api: ApiClient) {}

  async product(overrides: Record<string, unknown> = {}): Promise<SeededProduct> {
    const sku = uniqueId();
    const response = await this.api.post('/api/products', {
      data: { name: `${sku} proizvod`, sku, quantity: 5, costPrice: 10, price: 20, ...overrides },
    });
    expect(response.status(), await response.text()).toBe(201);
    const product = await response.json();
    this.cleanups.push(() => this.api.delete(`/api/products/${product.id}`));
    return product;
  }

  /** For products created through the UI: remove them by SKU after the test, even if creation failed half-way. */
  trackProductBySku(sku: string) {
    this.cleanups.push(async () => {
      const list = await (await this.api.get('/api/products')).json();
      for (const p of list.filter((x: { sku: string }) => x.sku === sku)) await this.api.delete(`/api/products/${p.id}`);
    });
  }

  /** Creates an invoice through the API (status DRAFT, UNPAID or PAID is set by the caller; default UNPAID). */
  async invoice(items: InvoiceItemInput[], overrides: Record<string, unknown> = {}): Promise<SeededInvoice> {
    const dueDate = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
    const response = await this.api.post('/api/invoices', {
      data: {
        clientName: `${uniqueId()} kupac`,
        clientPib: '111222333',
        clientAddress: 'Test 1',
        dueDate,
        status: 'UNPAID',
        items: items.map((i) => ({
          productId: i.product.id,
          productName: i.product.name,
          quantity: i.quantity ?? 1,
          unitPrice: i.unitPrice ?? 100,
          discount: i.discount ?? 0,
          vatRate: i.vatRate ?? 0,
        })),
        ...overrides,
      },
    });
    expect(response.status(), await response.text()).toBe(201);
    const invoice = await response.json();
    this.invoiceCleanups.push(() => this.api.delete(`/api/invoices/${invoice.id}`));
    return invoice;
  }

  /** For invoices created through the UI: delete every invoice of this test's unique customer name. */
  trackInvoicesByClient(clientName: string) {
    this.invoiceCleanups.push(async () => {
      const list = await (await this.api.get('/api/invoices')).json();
      for (const i of list.filter((x: { clientName: string }) => x.clientName === clientName)) await this.api.delete(`/api/invoices/${i.id}`);
    });
  }

  async client(overrides: Record<string, unknown> = {}): Promise<SeededClient> {
    const response = await this.api.post('/api/clients', {
      data: { name: `${uniqueId()} kupac`, pib: '123456789', address: 'Test 1', ...overrides },
    });
    expect(response.status(), await response.text()).toBe(201);
    const client = await response.json();
    this.cleanups.push(() => this.api.delete(`/api/clients/${client.id}`));
    return client;
  }

  async catalog(productIds: string[], overrides: Record<string, unknown> = {}): Promise<SeededCatalog> {
    const response = await this.api.post('/api/catalogs', {
      data: { name: `${uniqueId()} katalog`, discount: 0, productIds, ...overrides },
    });
    expect(response.ok(), await response.text()).toBeTruthy();
    const catalog = await response.json();
    this.catalogCleanups.push(() => this.api.delete(`/api/catalogs/${catalog.id}`));
    return catalog;
  }

  /** For customers created through the UI: delete every customer with this exact name. */
  trackClientsByName(name: string) {
    this.cleanups.push(async () => {
      const list = await (await this.api.get('/api/clients')).json();
      for (const c of list.filter((x: { name: string }) => x.name === name)) await this.api.delete(`/api/clients/${c.id}`);
    });
  }

  /** For catalogs created through the UI: delete every catalog with this exact name. */
  trackCatalogsByName(name: string) {
    this.catalogCleanups.push(async () => {
      const list = await (await this.api.get('/api/catalogs')).json();
      for (const c of list.filter((x: { name: string }) => x.name === name)) await this.api.delete(`/api/catalogs/${c.id}`);
    });
  }

  async cleanup() {
    for (const run of this.invoiceCleanups.reverse()) await run().catch(() => undefined);
    for (const run of this.catalogCleanups.reverse()) await run().catch(() => undefined);
    for (const run of this.cleanups.reverse()) await run().catch(() => undefined);
    this.invoiceCleanups.length = 0;
    this.catalogCleanups.length = 0;
    this.cleanups.length = 0;
  }
}
