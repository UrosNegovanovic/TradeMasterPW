import { expect } from '@playwright/test';
import { copy } from '../test-data/copy';
import { BasePage } from './BasePage';

const { form } = copy.invoices;
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export interface InvoiceItemForm {
  sku: string;
  quantity?: number | string;
  unitPrice?: number | string;
  discount?: number | string;
  /** Only on companies in the VAT system: '20' | '10' | '0'. */
  vatRate?: '20' | '10' | '0';
}

export class InvoiceFormPage extends BasePage {
  readonly main = () => this.page.getByRole('main');
  readonly invoiceNumber = () => this.page.getByRole('textbox', { name: form.number });
  readonly dueDate = () => this.page.getByRole('textbox', { name: form.dueDate });
  readonly clientName = () => this.page.getByRole('textbox', { name: form.clientName });
  readonly clientPib = () => this.page.getByRole('textbox', { name: form.clientPib });
  readonly savedClient = () => this.page.getByLabel('Sačuvani kupac');
  readonly clientAddress = () => this.page.getByRole('textbox', { name: form.clientAddress });
  readonly addItemButton = () => this.page.getByRole('button', { name: form.addItem });
  readonly saveButton = () => this.page.getByRole('button', { name: copy.invoices.save });
  readonly toast = () => this.page.locator('[data-sonner-toast]');

  // Item row controls: every row repeats the same labels, so rows are addressed by index.
  readonly quantity = (row = 0) => this.page.getByRole('textbox', { name: form.quantity }).nth(row);
  readonly unitPrice = (row = 0) => this.page.getByRole('textbox', { name: form.unitPrice }).nth(row);
  readonly discount = (row = 0) => this.page.getByRole('textbox', { name: form.discount }).nth(row);
  readonly vatRate = (row = 0) => this.page.getByRole('combobox', { name: form.vatRate }).nth(row);
  readonly stockHint = (row = 0) => this.main().getByText(/Na stanju: \d+ kom/).nth(row);

  async navigateNew() {
    await this.goto('/invoices/new');
    await this.waitForLoadState();
    await expect(this.page.getByRole('heading', { level: 1, name: copy.invoices.newInvoice })).toBeVisible();
  }

  async navigateEdit(invoiceId: string) {
    await this.goto(`/invoices/${invoiceId}/edit`);
    await this.waitForLoadState();
    await expect(this.page.getByRole('heading', { level: 1, name: 'Izmena fakture' })).toBeVisible();
  }

  async fillCustomer(name: string, pib?: string, address?: string) {
    await this.clientName().fill(name);
    if (pib !== undefined) await this.clientPib().fill(pib);
    if (address !== undefined) await this.clientAddress().fill(address);
  }

  /** One picker button per row: "Izaberi proizvod" while empty, "name, SKU x, na stanju N kom" once chosen. */
  private readonly pickerButtons = () =>
    this.page.getByRole('button', { name: new RegExp(`^${escapeRegExp(form.pickProduct)}$|, SKU .+, na stanju \\d+ kom$`) });

  /** The picker opens a listbox; its options read "name, SKU x, na stanju N kom". */
  async chooseProduct(row: number, sku: string) {
    await this.pickerButtons().nth(row).click();
    await this.page.getByRole('option', { name: new RegExp(`SKU ${escapeRegExp(sku)},`) }).click();
  }

  async fillItem(row: number, item: InvoiceItemForm) {
    await this.chooseProduct(row, item.sku);
    if (item.quantity !== undefined) await this.quantity(row).fill(String(item.quantity));
    if (item.unitPrice !== undefined) await this.unitPrice(row).fill(String(item.unitPrice));
    if (item.discount !== undefined) await this.discount(row).fill(String(item.discount));
    if (item.vatRate !== undefined) await this.vatRate(row).selectOption(item.vatRate);
  }

  /** Saving issues the invoice (status "Otvoreno") and returns to the list; the toast names the new number. */
  async save(): Promise<string> {
    await this.saveButton().click();
    const toast = this.toast().filter({ hasText: copy.invoices.toasts.saved });
    await expect(toast).toBeVisible();
    const match = (await toast.innerText()).match(/(\d{2,}\/\d{4})/);
    expect(match, 'invoice number in the success toast').not.toBeNull();
    return match![1];
  }
}
