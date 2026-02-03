import { test as base } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { SignInPage } from '../pages/SignInPage';
import { SignUpPage } from '../pages/SignUpPage';

const BASE_URL = 'https://trade-master-seven.vercel.app';

type CustomFixtures = {
    homePage: HomePage;
    signInPage: SignInPage;
    signUpPage: SignUpPage;
};
export const test = base.extend<CustomFixtures>({
    homePage: async ({ page }, use) => {
        const homePage = new HomePage(page, BASE_URL);
        await use(homePage);
    },

    signInPage: async ({ page }, use) => {
        const signInPage = new SignInPage(page, BASE_URL);
        await use(signInPage);
    },

    signUpPage: async ({ page }, use) => {
        const signUpPage = new SignUpPage(page, BASE_URL);
        await use(signUpPage);
    },
});
export { expect } from '@playwright/test';