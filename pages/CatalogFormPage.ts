import { Locator, expect } from '@playwright/test';
import { copy } from '../test-data/copy';
import { BasePage } from './BasePage';

const { form } = copy.catalogs;

export interface CatalogDisplay {
  layout?: 'GRID_4' | 'GRID_12' | 'LIST';
  sortMode?: 'MANUAL' | 'NAME' | 'PRICE_ASC' | 'PRICE_DESC';
  groupByCategory?: boolean;
  showSku?: boolean;
  showDescription?: boolean;
  showOriginalPrice?: boolean;
}

export class CatalogFormPage extends BasePage {
  readonly main = () => this.page.getByRole('main');
  readonly name = () => this.page.getByRole('textbox', { name: form.name });
  readonly savedClient = () => this.page.getByLabel('Sačuvani kupac');
  readonly client = () => this.page.getByRole('textbox', { name: form.client });
  readonly discount = () => this.page.getByRole('spinbutton', { name: form.discount });
  readonly notes = () => this.page.getByRole('textbox', { name: form.notes });
  readonly productSearch = () => this.page.getByRole('textbox', { name: form.search });
  readonly createButton = () => this.page.getByRole('button', { name: form.create });
  readonly saveButton = () => this.page.getByRole('button', { name: form.save });
  readonly layout = () => this.page.getByRole('combobox', { name: form.layout });
  readonly sort = () => this.page.getByRole('combobox', { name: form.sort });
  readonly groupByCategory = () => this.page.getByRole('checkbox', { name: form.groupByCategory });
  readonly showSku = () => this.page.getByRole('checkbox', { name: form.showSku });
  readonly showDescription = () => this.page.getByRole('checkbox', { name: form.showDescription });
  readonly showOriginalPrice = () => this.page.getByRole('checkbox', { name: form.showOriginalPrice });

  async navigateNew() {
    await this.goto('/catalogs/new');
    await this.waitForLoadState();
    await expect(this.page.getByRole('heading', { level: 1, name: copy.catalogs.newCatalog })).toBeVisible();
  }

  async navigateEdit(catalogId: string) {
    await this.goto(`/catalogs/${catalogId}/edit`);
    await this.waitForLoadState();
    await expect(this.name()).toBeVisible();
  }

  /** The product list has unnamed checkboxes; the product card is the innermost block holding its heading and a checkbox. */
  productCard(productName: string): Locator {
    return this.page
      .locator('div')
      .filter({ has: this.page.getByRole('heading', { level: 4, name: productName, exact: true }) })
      .filter({ has: this.page.getByRole('checkbox') })
      .last();
  }

  /** Picks products one by one through the search box so that products of parallel tests never interfere. */
  async selectProducts(productNames: string[]) {
    for (const name of productNames) {
      await this.productSearch().fill(name);
      await this.productCard(name).getByRole('checkbox').check();
    }
    await this.productSearch().fill('');
  }

  async setDisplay(display: CatalogDisplay) {
    if (display.layout) await this.layout().selectOption(display.layout);
    if (display.sortMode) await this.sort().selectOption(display.sortMode);
    if (display.groupByCategory !== undefined) await this.groupByCategory().setChecked(display.groupByCategory);
    if (display.showSku !== undefined) await this.showSku().setChecked(display.showSku);
    if (display.showDescription !== undefined) await this.showDescription().setChecked(display.showDescription);
    if (display.showOriginalPrice !== undefined) await this.showOriginalPrice().setChecked(display.showOriginalPrice);
  }
}
