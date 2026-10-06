import { Locator, expect } from '@playwright/test';
import { copy } from '../test-data/copy';
import { BasePage } from './BasePage';

const { catalogs } = copy;

export class CatalogsPage extends BasePage {
  readonly heading = () => this.page.getByRole('heading', { level: 1, name: 'Katalozi' });
  readonly newCatalogLink = () => this.page.getByRole('link', { name: catalogs.newCatalog }).first();
  readonly toast = () => this.page.locator('[data-sonner-toast]');

  async navigate() {
    await this.goto('/catalogs');
    await this.waitForLoadState();
    await expect(this.heading()).toBeVisible();
  }

  /** Card heading reads "<name> <discount>%": the innermost block with that heading and an "Izmeni" link is the card. */
  card(name: string): Locator {
    return this.page
      .locator('div')
      .filter({ has: this.page.getByRole('heading', { level: 3, name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }) })
      .filter({ has: this.page.getByRole('link', { name: 'Izmeni' }) })
      .last();
  }

  /** The delete control is an icon button without an accessible name; it is the last button on the card. */
  async deleteCatalog(name: string) {
    await this.card(name).getByRole('button').last().click();
    await expect(this.page.getByText(catalogs.confirmDelete)).toBeVisible();
    await this.page.getByRole('button', { name: 'Obriši', exact: true }).click();
  }
}
