import { Locator, expect } from '@playwright/test';
import { copy } from '../test-data/copy';
import { BasePage } from './BasePage';

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export interface StockMovementForm {
  sku: string;
  quantity: number | string;
  reason?: string;
  costPrice?: number | string;
}

export class WarehousePage extends BasePage {
  readonly heading = () => this.page.getByRole('heading', { level: 1, name: 'Magacin' });
  readonly dialog = () => this.page.getByRole('dialog');
  readonly entryButton = () => this.page.getByRole('button', { name: copy.warehouse.entryButton, exact: true });
  readonly exitButton = () => this.page.getByRole('button', { name: copy.warehouse.exitButton });
  readonly toast = () => this.page.locator('[data-sonner-toast]');

  // Dialog controls
  readonly quantityInput = () => this.dialog().getByRole('spinbutton', { name: copy.warehouse.quantity });
  readonly reasonInput = () => this.dialog().getByRole('textbox', { name: copy.warehouse.reason });
  readonly entrySubmit = () => this.dialog().getByRole('button', { name: copy.warehouse.entrySubmit });
  readonly exitSubmit = () => this.dialog().getByRole('button', { name: copy.warehouse.exitSubmit });

  // The page has two tables: current stock first, movement history second. Each has its own search box.
  private readonly stockTable = () => this.page.getByRole('table').first();
  private readonly historyTable = () => this.page.getByRole('table').last();
  private readonly searchBoxes = () => this.page.getByRole('textbox', { name: copy.warehouse.search });

  async navigate() {
    await this.goto('/warehouse');
    await this.waitForLoadState();
    await expect(this.heading()).toBeVisible();
  }

  async openEntryDialog() {
    await this.entryButton().click();
    await expect(this.dialog()).toBeVisible();
  }

  async openExitDialog() {
    await this.exitButton().click();
    await expect(this.dialog()).toBeVisible();
  }

  /** Entry dialog uses a Radix Select: option text is "name (sku) - Stanje: N". */
  async chooseEntryProduct(sku: string) {
    await this.dialog().getByRole('combobox').click();
    await this.page.getByRole('option', { name: new RegExp(`\\(${escapeRegExp(sku)}\\)`) }).click();
  }

  /** Exit dialog uses a searchable list (cmdk) whose items are plain text, not options. */
  async chooseExitProduct(sku: string) {
    await this.dialog().getByRole('button', { name: copy.warehouse.pickProduct }).click();
    await this.dialog().getByRole('textbox', { name: copy.warehouse.pickerSearch }).fill(sku);
    await this.dialog().getByText(new RegExp(`SKU: ${escapeRegExp(sku)} •`)).click();
  }

  async recordEntry(form: StockMovementForm) {
    await this.openEntryDialog();
    await this.chooseEntryProduct(form.sku);
    await this.quantityInput().fill(String(form.quantity));
    if (form.costPrice !== undefined) await this.dialog().getByRole('spinbutton', { name: copy.warehouse.costPrice }).fill(String(form.costPrice));
    await this.reasonInput().fill(form.reason ?? 'E2E ulaz');
    await this.entrySubmit().click();
  }

  async recordExit(form: StockMovementForm) {
    await this.openExitDialog();
    await this.chooseExitProduct(form.sku);
    await this.quantityInput().fill(String(form.quantity));
    await this.reasonInput().fill(form.reason ?? 'E2E izlaz');
    await this.exitSubmit().click();
  }

  async stockRow(sku: string): Promise<Locator> {
    await this.searchBoxes().first().fill(sku);
    return this.stockTable().getByRole('row').filter({ hasText: sku });
  }

  /** Stock cell reads "N kom". */
  async expectStock(sku: string, quantity: number) {
    const row = await this.stockRow(sku);
    await expect(row.getByRole('cell').nth(3)).toHaveText(`${quantity} kom`);
  }

  async movementRows(sku: string): Promise<Locator> {
    await this.searchBoxes().last().fill(sku);
    return this.historyTable().getByRole('row').filter({ hasText: sku });
  }
}
