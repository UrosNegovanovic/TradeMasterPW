import { Page, expect } from '@playwright/test';
import { copy, NavItem } from '../test-data/copy';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  /** Desktop sidebar is a plain <nav>; the mobile tab bar is <nav aria-label="Glavna navigacija">. */
  readonly sidebar = () => this.page.getByRole('navigation').first();
  readonly tabBar = () => this.page.getByRole('navigation', { name: copy.sidebarLabel });
  readonly signOutButton = () => this.page.getByRole('button', { name: copy.signOut });
  readonly main = () => this.page.getByRole('main');
  readonly onboardingHeading = () => this.page.getByRole('heading', { level: 3, name: 'Prvi koraci' });
  readonly pageHeading = () => this.page.getByRole('main').getByRole('heading', { level: 1 });

  async navigate() {
    await this.goto('/dashboard');
    await this.waitForLoadState();
  }

  /** Opens a page through the navigation that is visible for the current viewport. */
  async openFromNav(item: NavItem, isMobile: boolean) {
    if (!isMobile) {
      await this.sidebar().getByRole('link', { name: item.label, exact: true }).click();
      return;
    }
    if (item.primary) {
      await this.tabBar().getByRole('link', { name: item.label, exact: true }).click();
      return;
    }
    await this.tabBar().getByRole('button', { name: copy.more }).click();
    await this.page.getByRole('dialog').getByRole('link', { name: item.label, exact: true }).click();
  }

  async expectOn(item: NavItem) {
    await expect(this.page).toHaveURL(new RegExp(`${item.path}(\\?|$)`));
    await expect(this.pageHeading()).toBeVisible();
  }
}

export type { Page };
