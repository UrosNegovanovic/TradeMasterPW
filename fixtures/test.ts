import { test as base } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { SignInPage } from '../pages/SignInPage';
import { SignUpPage } from '../pages/SignUpPage';
import { DashboardPage } from '../pages/DashboardPage';
import { InventoryPage } from '../pages/InventoryPage';
import { WarehousePage } from '../pages/WarehousePage';
import { InvoicesPage } from '../pages/InvoicesPage';
import { InvoiceFormPage } from '../pages/InvoiceFormPage';
import { InvoiceDetailPage } from '../pages/InvoiceDetailPage';
import { CatalogsPage } from '../pages/CatalogsPage';
import { CatalogFormPage } from '../pages/CatalogFormPage';
import { CatalogDetailPage } from '../pages/CatalogDetailPage';
import { PublicCatalogPage } from '../pages/PublicCatalogPage';
import { FinancePage } from '../pages/FinancePage';
import { ClientsPage } from '../pages/ClientsPage';
import { SettingsPage } from '../pages/SettingsPage';

type CustomFixtures = {
    homePage: HomePage;
    signInPage: SignInPage;
    signUpPage: SignUpPage;
    dashboardPage: DashboardPage;
    inventoryPage: InventoryPage;
    warehousePage: WarehousePage;
    invoicesPage: InvoicesPage;
    invoiceFormPage: InvoiceFormPage;
    invoiceDetailPage: InvoiceDetailPage;
    catalogsPage: CatalogsPage;
    catalogFormPage: CatalogFormPage;
    catalogDetailPage: CatalogDetailPage;
    publicCatalogPage: PublicCatalogPage;
    financePage: FinancePage;
    clientsPage: ClientsPage;
    settingsPage: SettingsPage;
};
export const test = base.extend<CustomFixtures>({
    homePage: async ({ page }, use) => {
        const homePage = new HomePage(page);
        await use(homePage);
    },

    signInPage: async ({ page }, use) => {
        const signInPage = new SignInPage(page);
        await use(signInPage);
    },

    signUpPage: async ({ page }, use) => {
        const signUpPage = new SignUpPage(page);
        await use(signUpPage);
    },

    inventoryPage: async ({ page }, use) => {
        await use(new InventoryPage(page));
    },

    catalogsPage: async ({ page }, use) => {
        await use(new CatalogsPage(page));
    },

    catalogFormPage: async ({ page }, use) => {
        await use(new CatalogFormPage(page));
    },

    catalogDetailPage: async ({ page }, use) => {
        await use(new CatalogDetailPage(page));
    },

    clientsPage: async ({ page }, use) => {
        await use(new ClientsPage(page));
    },

    settingsPage: async ({ page }, use) => {
        await use(new SettingsPage(page));
    },

    financePage: async ({ page }, use) => {
        await use(new FinancePage(page));
    },

    publicCatalogPage: async ({ page }, use) => {
        await use(new PublicCatalogPage(page));
    },

    invoicesPage: async ({ page }, use) => {
        await use(new InvoicesPage(page));
    },

    invoiceFormPage: async ({ page }, use) => {
        await use(new InvoiceFormPage(page));
    },

    invoiceDetailPage: async ({ page }, use) => {
        await use(new InvoiceDetailPage(page));
    },

    warehousePage: async ({ page }, use) => {
        await use(new WarehousePage(page));
    },

    dashboardPage: async ({ page }, use) => {
        const dashboardPage = new DashboardPage(page);
        await use(dashboardPage);
    },
});
export { expect } from '@playwright/test';