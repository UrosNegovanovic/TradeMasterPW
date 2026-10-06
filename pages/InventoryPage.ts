import { Locator, expect } from '@playwright/test';
import { copy } from '../test-data/copy';
import { BasePage } from './BasePage';

export interface ProductFormData {
  name: string;
  sku: string;
  quantity?: number | string;
  /** Selling price (optional in the app). */
  price?: number | string;
  costPrice?: number | string;
  zeroReason?: string;
  description?: string;
}

export class InventoryPage extends BasePage {
  readonly heading = () => this.page.getByRole('heading', { level: 1, name: 'Asortiman' });
  readonly addButton = () => this.page.getByRole('button', { name: copy.inventory.addButton, exact: true });
  readonly searchBox = () => this.page.getByRole('textbox', { name: copy.inventory.search });
  readonly dialog = () => this.page.getByRole('dialog');

  // Product form (shared by create and edit)
  readonly nameInput = () => this.dialog().getByRole('textbox', { name: copy.productForm.name });
  readonly skuInput = () => this.dialog().getByRole('textbox', { name: copy.productForm.sku });
  readonly quantityInput = () => this.dialog().getByRole('spinbutton', { name: copy.productForm.quantity });
  readonly priceInput = () => this.dialog().getByRole('spinbutton', { name: copy.productForm.price });
  readonly costPriceInput = () => this.dialog().getByRole('spinbutton', { name: copy.productForm.costPrice });
  readonly descriptionInput = () => this.dialog().getByRole('textbox', { name: copy.productForm.description, exact: true });
  readonly zeroReasonInput = () => this.dialog().getByLabel(copy.productForm.zeroReason);
  readonly submitButton = () => this.dialog().getByRole('button', { name: copy.productForm.submit });

  async navigate() {
    await this.goto('/inventory');
    await this.waitForLoadState();
    await expect(this.heading()).toBeVisible();
  }

  async openCreateDialog() {
    await this.addButton().click();
    await expect(this.dialog()).toBeVisible();
  }

  async fillProductForm(data: ProductFormData) {
    await this.nameInput().fill(data.name);
    await this.skuInput().fill(data.sku);
    if (data.quantity !== undefined) await this.quantityInput().fill(String(data.quantity));
    if (data.price !== undefined) await this.priceInput().fill(String(data.price));
    if (data.costPrice !== undefined) await this.costPriceInput().fill(String(data.costPrice));
    if (data.zeroReason !== undefined) await this.zeroReasonInput().fill(data.zeroReason);
    if (data.description !== undefined) await this.descriptionInput().fill(data.description);
  }

  /** Full happy path: open dialog, fill, submit and wait for it to close. */
  async createProduct(data: ProductFormData) {
    await this.openCreateDialog();
    await this.fillProductForm(data);
    await this.submitButton().click();
    await expect(this.dialog()).toBeHidden();
  }

  /** The list can be long and shared with parallel tests, so always narrow it down by SKU first. */
  async findRow(sku: string): Promise<Locator> {
    await this.searchBox().fill(sku);
    return this.page.getByRole('row').filter({ hasText: sku });
  }

  /** Native HTML validation (required/min/max) keeps the dialog open without rendering text. */
  async expectBrowserValidationBlocks(input: Locator) {
    await expect(this.dialog()).toBeVisible();
    await expect.poll(() => input.evaluate((el: HTMLInputElement) => el.validity.valid)).toBe(false);
  }
}
