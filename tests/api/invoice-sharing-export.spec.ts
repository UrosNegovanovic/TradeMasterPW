import { test as anon, expect as anonExpect } from '@playwright/test';
import { test, expect } from '../../fixtures/api';
import { invoiceBody, invoiceLine, isoDate } from '../../utils/api-helpers';

const tokenFrom = (shareUrl: string) => shareUrl.split('/').pop() as string;

test.describe('Invoice sharing API', { tag: ['@api', '@regression', '@p0'] }, () => {
  test('IN-11 a shared invoice is public, hides costs, and stops working when the link is revoked', async ({ api, seed, request }) => {
    const product = await seed.product({ quantity: 10, price: 100, costPrice: 60 });
    const invoice = await seed.invoice([{ product, quantity: 2, unitPrice: 100 }]);

    const share = await api.post(`/api/invoices/${invoice.id}/share`);
    expect(share.status()).toBe(200);
    const { url } = await share.json();
    expect(url).toMatch(/^\/shared\/invoice\/[0-9a-f]{64}$/);
    const token = tokenFrom(url);

    // `request` carries no session: this is what the customer sees.
    const publicView = await request.get(`/api/shared/invoice/${token}`);
    expect(publicView.status()).toBe(200);
    const text = await publicView.text();
    expect(text).toContain(invoice.invoiceNumber);
    expect(text).not.toMatch(/unitCost|costPrice|"profileId"|clerkUserId/);
    expect(JSON.stringify(JSON.parse(text))).not.toContain(product.sku.replace('E2E-', 'NEMA-'));

    expect((await api.delete(`/api/invoices/${invoice.id}/share`)).ok()).toBeTruthy();
    const revoked = await request.get(`/api/shared/invoice/${token}`);
    expect([404, 410]).toContain(revoked.status());
  });

  test('IN-11c a draft cannot be shared', async ({ api, seed }) => {
    const product = await seed.product({ quantity: 10 });
    const draft = await seed.invoice([{ product }], { status: 'DRAFT' });

    const response = await api.post(`/api/invoices/${draft.id}/share`);

    expect(response.ok()).toBe(false);
    expect(response.status()).toBeLessThan(500);
  });

  test('IN-11d an unknown token is not found', async ({ request }) => {
    const response = await request.get(`/api/shared/invoice/${'0'.repeat(64)}`);
    expect([404, 410]).toContain(response.status());
  });
});

test.describe('Invoice export API', { tag: ['@api', '@regression'] }, () => {
  const range = () => `from=${isoDate(-1)}&to=${isoDate(1)}`;
  const CSV_HEADER = 'Broj fakture;Datum izdavanja;Rok plaćanja;Kupac;PIB;Status;Osnovica;PDV;Ukupno;Datum plaćanja';

  test('IN-13 CSV contains issued invoices with the agreed columns and no drafts', async ({ api, seed }) => {
    const product = await seed.product({ quantity: 10 });
    const issued = await seed.invoice([{ product, quantity: 1, unitPrice: 100 }]);
    const draft = await seed.invoice([{ product, quantity: 1 }], { status: 'DRAFT' });

    const response = await api.get(`/api/invoices/export?${range()}&format=csv`);

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('csv');
    const csv = (await response.text()).replace(/^﻿/, '');
    const [header, ...rows] = csv.trim().split(/\r?\n/);
    expect(header).toBe(CSV_HEADER);
    expect(rows.some((r) => r.startsWith(`${issued.invoiceNumber};`))).toBe(true);
    expect(rows.some((r) => r.startsWith(`${draft.invoiceNumber};`))).toBe(false);
  });

  test('IN-13b XLSX is served as a spreadsheet', async ({ api }) => {
    const response = await api.get(`/api/invoices/export?${range()}&format=xlsx`);

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toMatch(/spreadsheetml|excel|octet-stream/);
    // .xlsx is a zip: starts with "PK"
    expect((await response.body()).subarray(0, 2).toString()).toBe('PK');
  });

  test('IN-13c a reversed range is rejected', async ({ api }) => {
    const response = await api.get(`/api/invoices/export?from=${isoDate(1)}&to=${isoDate(-1)}&format=csv`);

    expect(response.status()).toBe(400);
    expect((await response.json()).error).toBe('Početni datum ne može biti posle krajnjeg.');
  });
});

test.describe('SEC-02 invoices: tenant isolation', { tag: ['@api', '@p0'] }, () => {
  test('B cannot read, edit, change status, share or delete an A invoice', async ({ api, apiB, seed }) => {
    const product = await seed.product({ quantity: 10 });
    const invoice = await seed.invoice([{ product, quantity: 2 }]);
    const DENIED = [403, 404];

    expect(DENIED).toContain((await apiB.get(`/api/invoices/${invoice.id}`)).status());
    expect(DENIED).toContain((await apiB.patch(`/api/invoices/${invoice.id}`, { data: { status: 'PAID' } })).status());
    expect(DENIED).toContain((await apiB.put(`/api/invoices/${invoice.id}`, { data: invoiceBody([invoiceLine(product)], { clientName: 'HACK', invoiceNumber: invoice.invoiceNumber }) })).status());
    expect(DENIED).toContain((await apiB.post(`/api/invoices/${invoice.id}/share`)).status());
    expect(DENIED).toContain((await apiB.delete(`/api/invoices/${invoice.id}`)).status());

    const stillThere = await (await api.get(`/api/invoices/${invoice.id}`)).json();
    expect(stillThere.status).toBe('UNPAID');
    expect(stillThere.shareEnabled).toBe(false);
    const seenByB = await (await apiB.get('/api/invoices')).json();
    expect(seenByB.map((i: { id: string }) => i.id)).not.toContain(invoice.id);
  });
});

// Anonymous access to invoice endpoints is covered in security.spec.ts; keep a direct check on the by-id routes too.
anon.describe('Invoice endpoints reject anonymous requests', { tag: ['@api', '@smoke'] }, () => {
  for (const [method, path] of [['GET', '/api/invoices/any-id'], ['PATCH', '/api/invoices/any-id'], ['DELETE', '/api/invoices/any-id'], ['POST', '/api/invoices/any-id/share']] as const) {
    anon(`${method} ${path} -> 401`, async ({ request }) => {
      const response = await request.fetch(path, { method, data: {} });
      anonExpect(response.status()).toBe(401);
    });
  }
});
