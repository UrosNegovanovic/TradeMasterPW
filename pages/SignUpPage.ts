import { expect } from '@playwright/test';
import { copy } from '../test-data/copy';
import { BasePage } from './BasePage';

export class SignUpPage extends BasePage {
  readonly heading = () => this.page.getByRole('heading', { level: 1, name: copy.signUp.heading });
  readonly firstNameInput = () => this.page.getByRole('textbox', { name: copy.signUp.firstName, exact: true });
  readonly lastNameInput = () => this.page.getByRole('textbox', { name: copy.signUp.lastName, exact: true });
  readonly emailInput = () => this.page.getByRole('textbox', { name: copy.signIn.email });
  readonly passwordInput = () => this.page.getByRole('textbox', { name: copy.signIn.password });
  readonly submitButton = () => this.page.getByRole('button', { name: copy.signIn.submit, exact: true });
  readonly otpInput = () => this.page.getByRole('textbox', { name: copy.otpLabel });

  async navigate() {
    await this.goto('/sign-up');
    await this.waitForLoadState();
  }

  /** Unique Clerk test address: the "+clerk_test" subaddress accepts the fixed OTP in Development. */
  generateTestEmail(): string {
    return `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}+clerk_test@example.com`;
  }

  /** Bot protection is bypassed by setupClerkTestingToken({ page }) in the test. */
  async performSignUp(firstName: string, lastName: string, email: string, password: string, otp: string) {
    await this.firstNameInput().fill(firstName);
    await this.lastNameInput().fill(lastName);
    await this.emailInput().fill(email);
    await this.passwordInput().fill(password);
    await this.submitButton().click();
    await this.otpInput().fill(otp);
    // A new user is sent to /settings (company data) first, existing flow lands on /dashboard.
    await expect(this.page).toHaveURL(/\/(dashboard|settings)/);
  }
}
