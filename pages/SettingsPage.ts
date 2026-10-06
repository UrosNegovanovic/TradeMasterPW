import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

export interface CompanyForm {
  companyName?: string;
  pib?: string;
  email?: string;
  phone?: string;
  giroAccount?: string;
  address?: string;
}

export class SettingsPage extends BasePage {
  readonly main = () => this.page.getByRole('main');
  readonly heading = () => this.page.getByRole('heading', { level: 1, name: 'Podešavanja' });
  readonly companyName = () => this.page.getByRole('textbox', { name: 'Naziv firme', exact: true });
  readonly pib = () => this.page.getByRole('textbox', { name: 'PIB', exact: true });
  readonly email = () => this.page.getByRole('textbox', { name: 'Email', exact: true });
  readonly phone = () => this.page.getByRole('textbox', { name: 'Telefon', exact: true });
  readonly giroAccount = () => this.page.getByRole('textbox', { name: 'Žiro-račun', exact: true });
  readonly address = () => this.page.getByRole('textbox', { name: 'Adresa', exact: true });
  readonly vatCheckbox = () => this.page.getByRole('checkbox', { name: /Firma je u sistemu PDV-a/ });
  readonly saveButton = () => this.page.getByRole('button', { name: 'Sačuvaj', exact: true });
  readonly toast = () => this.page.locator('[data-sonner-toast]');

  async navigate() {
    await this.goto('/settings');
    await this.waitForLoadState();
    await expect(this.heading()).toBeVisible();
  }

  async fill(form: CompanyForm) {
    if (form.companyName !== undefined) await this.companyName().fill(form.companyName);
    if (form.pib !== undefined) await this.pib().fill(form.pib);
    if (form.email !== undefined) await this.email().fill(form.email);
    if (form.phone !== undefined) await this.phone().fill(form.phone);
    if (form.giroAccount !== undefined) await this.giroAccount().fill(form.giroAccount);
    if (form.address !== undefined) await this.address().fill(form.address);
  }
}
