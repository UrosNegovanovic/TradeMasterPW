import { expect } from '@playwright/test';
import { copy } from '../test-data/copy';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  readonly heroHeading = () => this.page.getByRole('heading', { level: 1, name: copy.landing.heroHeading });
  // Header and footer both link to sign-in/up; the header link comes first in DOM order.
  readonly signInLink = () => this.page.getByRole('link', { name: copy.landing.signIn, exact: true }).first();
  readonly signUpLink = () => this.page.getByRole('link', { name: copy.landing.signUp, exact: true }).first();

  async navigate() {
    await this.goto('/');
    await this.waitForLoadState();
  }

  async verifyLandingPageLoaded() {
    await expect(this.heroHeading()).toBeVisible();
    await expect(this.signInLink()).toBeVisible();
  }
}
