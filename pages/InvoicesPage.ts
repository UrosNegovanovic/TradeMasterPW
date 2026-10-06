import { Locator, expect } from '@playwright/test';
import { copy } from '../test-data/copy';
import { BasePage } from './BasePage';

const { invoices } = copy;

export class InvoicesPage extends BasePage {
  readonly heading = () => this.page.getByRole('heading', { level: 1, name: 'Fakture' });
  readonly openTab = () => this.page.getByRole('button', { name: invoices.tabs.open });
  readonly paidTab = () => this.page.getByRole('button', { name: invoices.tabs.paid });
  readonly proformaTab = () => this.page.getByRole('button', { name: invoices.tabs.proforma });
  readonly toast = () => this.page.locator('[data-sonner-toast]');

  async navigate() {
    await this.goto('/invoices');
    await this.waitForLoadState();
    await expect(this.heading()).toBeVisible();
  }

  /**
   * One card per invoice, no role or test id. The innermost block holding both the number heading and a
   * "Obriši" button is that invoice's card, so actions never hit a neighbour created by a parallel test.
   */
  card(invoiceNumber: string): Locator {
    const heading = this.page.getByRole('heading', { level: 3, name: invoiceNumber, exact: true });
    return this.page
      .locator('div')
      .filter({ has: heading })
      .filter({ has: this.page.getByRole('button', { name: invoices.delete }) })
      .last();
  }

  async markPaid(invoiceNumber: string) {
    await this.card(invoiceNumber).getByRole('button', { name: invoices.pay }).click();
    await expect(this.toast().filter({ hasText: invoices.toasts.paid })).toBeVisible();
  }

  async revertToOpen(invoiceNumber: string) {
    await this.paidTab().click();
    await this.card(invoiceNumber).getByRole('button', { name: invoices.revert }).click();
    await expect(this.page.getByText(invoices.confirm.revert)).toBeVisible();
    await this.page.getByRole('button', { name: invoices.revertConfirm, exact: true }).click();
    await expect(this.toast().filter({ hasText: invoices.toasts.reopened })).toBeVisible();
  }

  /** Delete confirmation is an app dialog; the confirm button shares its label with the card button, so it is the last one. */
  async deleteInvoice(invoiceNumber: string) {
    await this.card(invoiceNumber).getByRole('button', { name: invoices.delete }).click();
    await expect(this.page.getByText(invoices.confirm.delete)).toBeVisible();
    await this.page.getByRole('button', { name: invoices.delete, exact: true }).last().click();
    await expect(this.toast().filter({ hasText: invoices.toasts.deleted })).toBeVisible();
  }

  async openDetail(invoiceNumber: string) {
    await this.card(invoiceNumber).getByRole('link', { name: 'PDF' }).click();
  }
}
