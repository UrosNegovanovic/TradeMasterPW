import { expect } from '@playwright/test';
import { copy } from '../test-data/copy';
import { BasePage } from './BasePage';

export class SignInPage extends BasePage {
  readonly heading = () => this.page.getByRole('heading', { level: 1, name: copy.signIn.heading });
  readonly emailInput = () => this.page.getByRole('textbox', { name: copy.signIn.email });
  // textbox role excludes the "Show password" button
  readonly passwordInput = () => this.page.getByRole('textbox', { name: copy.signIn.password });
  // exact: excludes "Nastavi sa Google"
  readonly submitButton = () => this.page.getByRole('button', { name: copy.signIn.submit, exact: true });
  readonly otpInput = () => this.page.getByRole('textbox', { name: copy.otpLabel });

  async navigate() {
    await this.goto('/sign-in');
    await this.waitForLoadState();
  }

  /** Clerk Development "new device" verification always asks for the fixed test code after the password. */
  async performLogin(email: string, password: string, otp: string) {
    await this.emailInput().fill(email);
    await this.passwordInput().fill(password);
    await this.submitButton().click();
    await this.otpInput().fill(otp);
    await expect(this.page).toHaveURL(/\/dashboard/);
  }
}
