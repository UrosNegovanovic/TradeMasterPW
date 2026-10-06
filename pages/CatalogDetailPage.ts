import { expect } from '@playwright/test';
import { copy } from '../test-data/copy';
import { BasePage } from './BasePage';

const { share } = copy.catalogs;

export class CatalogDetailPage extends BasePage {
  readonly pdfButton = () => this.page.getByRole('button', { name: copy.invoices.downloadPdf });
  readonly shareRegion = () => this.page.getByRole('region', { name: share.region });
  readonly shareOn = () => this.shareRegion().getByRole('button', { name: share.on });
  readonly shareOff = () => this.shareRegion().getByRole('button', { name: share.off });
  readonly newLink = () => this.shareRegion().getByRole('button', { name: share.newLink });
  readonly preview = () => this.shareRegion().getByRole('link', { name: share.preview });
  readonly whatsApp = () => this.shareRegion().getByRole('link', { name: 'WhatsApp' });
  readonly viber = () => this.shareRegion().getByRole('link', { name: 'Viber' });
  readonly mail = () => this.shareRegion().getByRole('link', { name: 'Mejl' });
  /** Product names on the owner's preview, in the order they are rendered. */
  readonly productNames = () => this.page.getByRole('main').getByRole('heading', { level: 4 });

  async navigate(catalogId: string) {
    await this.goto(`/catalogs/${catalogId}`);
    await this.waitForLoadState();
    await expect(this.shareRegion()).toBeVisible();
  }
}
