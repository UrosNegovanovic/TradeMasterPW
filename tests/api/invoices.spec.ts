import { test, expect } from '../../fixtures/api';
import { INVOICE_NUMBER, invoiceBody, invoiceLine, invoicesOf, quantityOf, sequenceOf } from '../../utils/api-helpers';
import { uniqueId } from '../../utils/seed';

const body = invoiceBody;
const line = invoiceLine;

test.describe('Invoices API – creation and numbering', { tag: ['@api', '@regression', '@p0'] }, () => {
  test('IN-01 issuing returns a numbered UNPAID invoice with a price/cost snapshot', async ({ api, seed }) => {
    const product = await seed.product({ quantity: 10, price: 100, costPrice: 60 });
    const invoice = await seed.invoice([{ product, quantity: 2, unitPrice: 100 }]);

    expect(invoice.invoiceNumber).toMatch(INVOICE_NUMBER);
    expect(invoice.invoiceNumber.endsWith(`/${new Date().getFullYear()}`)).toBe(true);
    expect(invoice.status).toBe('UNPAID');
    expect(Number(invoice.totalAmount)).toBe(200);
    expect(invoice.items[0]).toMatchObject({ productName: product.name, quantity: 2, unitPrice: '100', unitCost: '60', total: '200' });

    const fetched = await (await api.get(`/api/invoices/${invoice.id}`)).json();
    expect(fetched.invoiceNumber).toBe(invoice.invoiceNumber);
  });

  test('IN-01b numbers increase for the next invoice of the same company', async ({ seed }) => {
    const product = await seed.product({ quantity: 10 });
    const first = await seed.invoice([{ product }], { status: 'DRAFT' });
    const second = await seed.invoice([{ product }], { status: 'DRAFT' });

    expect(sequenceOf(second.invoiceNumber)).toBeGreaterThan(sequenceOf(first.invoiceNumber));
  });

  // Dedicated tenant (VAT company): parallel suites on user A would also consume numbers.
  test('IN-15 five parallel creations get five unique numbers', async ({ apiVat, seedVat }) => {
    const product = await seedVat.product({ quantity: 10 });

    const responses = await Promise.all(
      [1, 2, 3, 4, 5].map(() => apiVat.post('/api/invoices', { data: body([line(product, { quantity: 1 })], { status: 'DRAFT' }) })),
    );
    const created = await Promise.all(responses.map(async (r) => ({ status: r.status(), json: await r.json() })));
    const ids = created.map((c) => c.json.id as string);
    seedVat.trackInvoicesByClient('__none__'); // keep cleanup order explicit: invoices before products
    try {
      expect(created.map((c) => c.status)).toEqual([201, 201, 201, 201, 201]);
      const numbers = created.map((c) => c.json.invoiceNumber as string);
      expect(new Set(numbers).size).toBe(5);
      numbers.forEach((n) => expect(n).toMatch(INVOICE_NUMBER));
    } finally {
      for (const id of ids) await apiVat.delete(`/api/invoices/${id}`);
    }
  });
});

test.describe('Invoices API – stock rules', { tag: ['@api', '@regression', '@p0'] }, () => {
  test('IN-02 draft does not touch stock; issuing takes it; paid/unpaid toggles do not; back to draft returns it', async ({ api, seed }) => {
    const product = await seed.product({ quantity: 10 });
    const invoice = await seed.invoice([{ product, quantity: 3 }], { status: 'DRAFT' });
    const patch = (status: string) => api.patch(`/api/invoices/${invoice.id}`, { data: { status } });

    await test.step('draft leaves stock alone', async () => expect(await quantityOf(api, product.id)).toBe(10));
    await test.step('DRAFT -> UNPAID takes 3', async () => {
      expect((await patch('UNPAID')).status()).toBe(200);
      expect(await quantityOf(api, product.id)).toBe(7);
    });
    await test.step('UNPAID -> PAID does not take again', async () => {
      expect((await patch('PAID')).status()).toBe(200);
      expect(await quantityOf(api, product.id)).toBe(7);
    });
    await test.step('PAID -> UNPAID does not take again', async () => {
      expect((await patch('UNPAID')).status()).toBe(200);
      expect(await quantityOf(api, product.id)).toBe(7);
    });
    await test.step('UNPAID -> DRAFT returns the stock', async () => {
      expect((await patch('DRAFT')).status()).toBe(200);
      expect(await quantityOf(api, product.id)).toBe(10);
    });
  });

  test('IN-02b issuing directly takes stock, a second PATCH to the same status does not take it twice', async ({ api, seed }) => {
    const product = await seed.product({ quantity: 10 });
    const invoice = await seed.invoice([{ product, quantity: 4 }]);
    expect(await quantityOf(api, product.id)).toBe(6);

    await api.patch(`/api/invoices/${invoice.id}`, { data: { status: 'UNPAID' } });
    expect(await quantityOf(api, product.id)).toBe(6);
  });

  test('IN-03 not enough stock: 400 with the exact numbers, no invoice, stock unchanged', async ({ api, seed }) => {
    const product = await seed.product({ quantity: 3 });
    const client = `${uniqueId()} kupac`;

    const response = await api.post('/api/invoices', { data: body([line(product, { quantity: 5 })], { clientName: client }) });

    expect(response.status()).toBe(400);
    expect((await response.json()).error).toBe(`Nema dovoljno na stanju za „${product.name}“. Traženo: 5 kom, na stanju: 3 kom.`);
    expect((await invoicesOf(api)).some((i) => i.clientName === client)).toBe(false);
    expect(await quantityOf(api, product.id)).toBe(3);
  });

  test('IN-03b a draft may exceed stock; issuing it later is what is blocked', async ({ api, seed }) => {
    const product = await seed.product({ quantity: 2 });
    const draft = await seed.invoice([{ product, quantity: 5 }], { status: 'DRAFT' });

    const issue = await api.patch(`/api/invoices/${draft.id}`, { data: { status: 'UNPAID' } });

    expect(issue.status()).toBe(400);
    expect(await quantityOf(api, product.id)).toBe(2);
  });

  test('IN-08 deleting an issued invoice returns its stock', async ({ api, seed }) => {
    const product = await seed.product({ quantity: 10 });
    const invoice = await seed.invoice([{ product, quantity: 4 }]);
    expect(await quantityOf(api, product.id)).toBe(6);

    expect((await api.delete(`/api/invoices/${invoice.id}`)).status()).toBe(200);

    expect(await quantityOf(api, product.id)).toBe(10);
    expect((await api.get(`/api/invoices/${invoice.id}`)).status()).toBe(404);
  });

  test('IN-10 editing an issued invoice reconciles stock for the difference (up and down)', async ({ api, seed }) => {
    const product = await seed.product({ quantity: 20 });
    const invoice = await seed.invoice([{ product, quantity: 2 }]);
    expect(await quantityOf(api, product.id)).toBe(18);
    const edit = (quantity: number) =>
      api.put(`/api/invoices/${invoice.id}`, {
        data: body([line(product, { quantity })], { invoiceNumber: invoice.invoiceNumber, clientName: 'E2E izmena' }),
      });

    expect((await edit(5)).status()).toBe(200);
    expect(await quantityOf(api, product.id)).toBe(15);

    expect((await edit(1)).status()).toBe(200);
    expect(await quantityOf(api, product.id)).toBe(19);
  });
});

test.describe('Invoices API – validation', { tag: ['@api', '@regression', '@p0'] }, () => {
  const CASES: Array<{ title: string; make: (p: { id: string; name: string }) => Record<string, unknown>; path: string; message: string | RegExp }> = [
    { title: 'no items', make: () => body([]), path: 'items', message: 'Invoice must have at least one item' },
    { title: 'customer without a name', make: (p) => body([line(p)], { clientName: '' }), path: 'clientName', message: 'clientName is required' },
    { title: 'customer PIB with 8 digits', make: (p) => body([line(p)], { clientPib: '12345678' }), path: 'clientPib', message: 'PIB kupca mora imati tačno 9 cifara' },
    { title: 'customer PIB with letters', make: (p) => body([line(p)], { clientPib: '12345678a' }), path: 'clientPib', message: 'PIB kupca mora imati tačno 9 cifara' },
    { title: 'quantity 0', make: (p) => body([line(p, { quantity: 0 })]), path: 'items.0.quantity', message: 'quantity must be a positive integer' },
    { title: 'fractional quantity', make: (p) => body([line(p, { quantity: 1.5 })]), path: 'items.0.quantity', message: 'quantity must be an integer' },
    { title: 'discount above 100', make: (p) => body([line(p, { discount: 101 })]), path: 'items.0.discount', message: 'discount is outside the supported range' },
    { title: 'VAT rate 15', make: (p) => body([line(p, { vatRate: 15 })]), path: 'items.0.vatRate', message: 'vatRate must be 0, 10 or 20' },
    { title: 'negative unit price', make: (p) => body([line(p, { unitPrice: -1 })]), path: 'items.0.unitPrice', message: 'unitPrice must be greater than or equal to 0' },
  ];

  for (const { title, make, path, message } of CASES) {
    test(`IN-04 ${title} -> 400`, async ({ api, seed }) => {
      const product = await seed.product({ quantity: 10 });

      const response = await api.post('/api/invoices', { data: make(product) });

      expect(response.status()).toBe(400);
      const payload = await response.json();
      expect(payload.error).toBe('Validation error');
      expect(payload.details).toContainEqual(expect.objectContaining({ path, message }));
      expect(await quantityOf(api, product.id)).toBe(10);
    });
  }

  test('IN-04 a due date is required', async ({ api, seed }) => {
    const product = await seed.product();
    const { dueDate: _omitted, ...withoutDueDate } = body([line(product)]);

    const response = await api.post('/api/invoices', { data: withoutDueDate });

    expect(response.status()).toBe(400);
    expect((await response.json()).details).toContainEqual(expect.objectContaining({ path: 'dueDate' }));
  });
});

test.describe('Invoices API – company data and VAT', { tag: ['@api', '@regression', '@p0'] }, () => {
  test('IN-06 a company without PIB cannot create invoices (drafts are blocked too)', async ({ apiB, seedB }) => {
    const product = await seedB.product({ quantity: 5 });

    for (const status of ['UNPAID', 'DRAFT']) {
      const response = await apiB.post('/api/invoices', { data: body([line(product)], { status }) });
      expect(response.status(), status).toBe(400);
      expect((await response.json()).error).toBe('Unesite važeći PIB firme od 9 cifara pre izdavanja fakture.');
    }
    expect(await quantityOf(apiB, product.id)).toBe(5);
  });

  const VAT_CASES = [
    { title: '2 x 1000 at 20%', items: [{ q: 2, price: 1000, vat: 20 as const, discount: 0 }], vatAmount: 400, total: 2400 },
    { title: '2 x 1000 at 10%', items: [{ q: 2, price: 1000, vat: 10 as const, discount: 0 }], vatAmount: 200, total: 2200 },
    { title: '2 x 1000 at 0%', items: [{ q: 2, price: 1000, vat: 0 as const, discount: 0 }], vatAmount: 0, total: 2000 },
    {
      title: 'mixed 10% and 20% with a 10% discount',
      items: [
        { q: 1, price: 1000, vat: 20 as const, discount: 0 },
        { q: 2, price: 500, vat: 10 as const, discount: 10 },
      ],
      vatAmount: 290,
      total: 2190,
    },
  ];
  for (const c of VAT_CASES) {
    test(`IN-05 VAT company: ${c.title} -> VAT ${c.vatAmount}, total ${c.total}`, async ({ seedVat, apiVat }) => {
      const product = await seedVat.product({ quantity: 20, price: 1000, costPrice: 600 });

      const invoice = await seedVat.invoice(c.items.map((i) => ({ product, quantity: i.q, unitPrice: i.price, vatRate: i.vat, discount: i.discount })));

      expect(invoice).toMatchObject({ vatEnabled: true });
      expect(Number(invoice.vatAmount)).toBe(c.vatAmount);
      expect(Number(invoice.totalAmount)).toBe(c.total);
      // unitPrice / total stay VAT-exclusive: base = total payable - VAT
      const base = c.items.reduce((sum, i) => sum + i.q * i.price * (1 - i.discount / 100), 0);
      expect(Number(invoice.totalAmount) - Number(invoice.vatAmount)).toBeCloseTo(base, 2);
      expect(await quantityOf(apiVat, product.id)).toBe(20 - c.items.reduce((s, i) => s + i.q, 0));
    });
  }

  test('IN-05b a company outside the VAT system ignores the VAT rate', async ({ seed }) => {
    const product = await seed.product({ quantity: 10, price: 1000, costPrice: 600 });

    const invoice = await seed.invoice([{ product, quantity: 2, unitPrice: 1000, vatRate: 20 }]);

    expect(invoice).toMatchObject({ vatEnabled: false });
    expect(Number(invoice.vatAmount)).toBe(0);
    expect(Number(invoice.totalAmount)).toBe(2000);
    expect(invoice.items[0].vatRate).toBe('0');
  });
});

test.describe('Invoices API – snapshot', { tag: ['@api', '@regression', '@p0'] }, () => {
  test('IN-09 changing the product afterwards does not change an issued invoice', async ({ api, seed }) => {
    const product = await seed.product({ quantity: 10, price: 100, costPrice: 60 });
    const invoice = await seed.invoice([{ product, quantity: 2, unitPrice: 100 }]);

    // quantity is sent on purpose: PUT without it resets the stock to 1 (see ROADMAP findings).
    const edit = await api.put(`/api/products/${product.id}`, {
      data: { name: 'PROMENJEN NAZIV', sku: product.sku, quantity: 8, price: 999, costPrice: 500 },
    });
    expect(edit.status()).toBe(200);

    const after = await (await api.get(`/api/invoices/${invoice.id}`)).json();
    expect(after.totalAmount).toBe(invoice.totalAmount);
    expect(after.items[0]).toMatchObject({ productName: product.name, unitPrice: '100', unitCost: '60', total: '200' });
  });
});
