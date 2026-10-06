import { expect } from '@playwright/test';
import { copy } from '../test-data/copy';
import { BasePage } from './BasePage';

export class InvoiceDetailPage extends BasePage {
  readonly main = () => this.page.getByRole('main');
  readonly heading = (invoiceNumber: string) => this.page.getByRole('heading', { level: 1, name: invoiceNumber });
  readonly payButton = () => this.page.getByRole('button', { name: copy.invoices.pay });
  readonly pdfButton = () => this.page.getByRole('button', { name: copy.invoices.downloadPdf });
  readonly shareRegion = () => this.page.getByRole('region', { name: 'Deljenje fakture' });
  readonly itemsTable = () => this.page.getByRole('table');

  async navigate(invoiceId: string, invoiceNumber: string) {
    await this.goto(`/invoices/${invoiceId}`);
    await this.waitForLoadState();
    await expect(this.heading(invoiceNumber)).toBeVisible();
  }
}
