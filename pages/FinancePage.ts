import { expect } from '@playwright/test';
import { amountPattern, escapeRegExp } from '../utils/money';
import { BasePage } from './BasePage';

export class FinancePage extends BasePage {
  readonly main = () => this.page.getByRole('main');
  readonly heading = () => this.page.getByRole('heading', { level: 1, name: 'Finansije' });
  readonly emptyState = () => this.main().getByRole('heading', { level: 3, name: 'Još nema prometa' });

  async navigate() {
    await this.goto('/finance');
    await this.waitForLoadState();
    await expect(this.heading()).toBeVisible();
  }

  /**
   * Cards are plain blocks (title, subtitle, amount, note), so the check reads the text in that order:
   * the amount must follow the title within one card. 90 characters never reaches the next card's amount.
   */
  async expectMetric(title: string, amount: number, note?: string | RegExp) {
    await expect(this.main()).toContainText(new RegExp(`${escapeRegExp(title)}[\\s\\S]{0,90}?${amountPattern(amount)}`));
    if (note) await expect(this.main()).toContainText(note);
  }
}
