import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

export interface ClientForm {
  name: string;
  pib?: string;
  address?: string;
}

export class ClientsPage extends BasePage {
  readonly heading = () => this.page.getByRole('heading', { level: 1, name: 'Kupci' });
  readonly addButton = () => this.page.getByRole('button', { name: 'Dodaj kupca' });
  readonly nameInput = () => this.page.getByRole('textbox', { name: 'Naziv kupca *' });
  readonly pibInput = () => this.page.getByRole('textbox', { name: 'PIB', exact: true });
  readonly addressInput = () => this.page.getByRole('textbox', { name: 'Adresa', exact: true });
  readonly saveButton = () => this.page.getByRole('button', { name: 'Sačuvaj', exact: true });
  readonly toast = () => this.page.locator('[data-sonner-toast]');
  readonly editButton = (name: string) => this.page.getByRole('button', { name: `Izmeni kupca ${name}` });
  readonly deleteButton = (name: string) => this.page.getByRole('button', { name: `Obriši kupca ${name}` });

  /** One block per customer: the innermost block that holds the name and the edit button. */
  row(name: string) {
    return this.page
      .locator('div')
      .filter({ has: this.page.getByText(name, { exact: true }) })
      .filter({ has: this.editButton(name) })
      .last();
  }

  /** The confirmation button repeats the card's "Obriši" label; it is the last matching button on the page. */
  async confirmDelete() {
    await this.page.getByRole('button', { name: /^(Obriši|Obrisati|Da)$/ }).last().click();
  }

  async navigate() {
    await this.goto('/clients');
    await this.waitForLoadState();
    await expect(this.heading()).toBeVisible();
  }

  async fill(form: ClientForm) {
    await this.nameInput().fill(form.name);
    if (form.pib !== undefined) await this.pibInput().fill(form.pib);
    if (form.address !== undefined) await this.addressInput().fill(form.address);
  }

  async addClient(form: ClientForm) {
    await this.addButton().click();
    await this.fill(form);
    await this.saveButton().click();
  }
}
