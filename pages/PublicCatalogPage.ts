import { expect } from '@playwright/test';
import { copy } from '../test-data/copy';
import { BasePage } from './BasePage';

const { public: pub } = copy.catalogs;

/** The customer-facing page /shared/catalog/<token>; works without a session. */
export class PublicCatalogPage extends BasePage {
  readonly search = () => this.page.getByRole('searchbox', { name: pub.search });
  /** Radix Select: open it, then pick the option, e.g. "24 po strani". */
  readonly perPage = () => this.page.getByRole('combobox').first();
  async choosePageSize(label: string) {
    await this.perPage().click();
    await this.page.getByRole('option', { name: label }).click();
  }
  readonly notFoundHeading = () => this.page.getByText(pub.notFound.title);
  readonly productNames = () => this.page.getByRole('main').getByRole('heading', { level: 4 });
  readonly pagination = () => this.page.getByRole('navigation', { name: pub.pagination });
  readonly next = () => this.pagination().getByRole('button', { name: pub.next });
  readonly previous = () => this.pagination().getByRole('button', { name: pub.previous });
  readonly noMatch = () => this.page.getByText(pub.noMatch);

  async navigate(shareUrl: string) {
    await this.goto(shareUrl);
    await this.waitForLoadState();
    await expect(this.search()).toBeVisible();
  }
}
