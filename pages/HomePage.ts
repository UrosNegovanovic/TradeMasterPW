import { expect } from '@playwright/test';
import { BasePage } from './BasePage';
export class HomePage extends BasePage {
    readonly heroHeading = () => this.page.getByRole('heading', { name: 'Simplify Your Wholesale Business' });
    readonly signInButton = () => this.page.getByRole('link', { name: 'Sign In' });
    readonly getStartedButton = () => this.page.getByRole('link', { name: 'Get Started' });

    async navigate() {
        await this.goto('/');
        await this.waitForLoadState();
    }
    async getHeroHeading() {
        return this.heroHeading();
    }
    async getSignInButton() {
        return this.signInButton();
    }
    async getGetStartedButton() {
        return this.getStartedButton();
    }
    async verifyLandingPageLoaded() {
        await expect(this.heroHeading()).toBeVisible();
        await expect(this.signInButton()).toBeVisible();
    }
}