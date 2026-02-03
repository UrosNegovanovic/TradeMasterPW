import { Page } from "@playwright/test";

export class BasePage {
    readonly page: Page;
    readonly baseURL: string;

    constructor(page: Page, baseURL: string) {
        this.page = page;
        this.baseURL = baseURL;
    }

    async goto(path: string = '') {
        await this.page.goto(`${this.baseURL}${path}`);
    }

    async getTitle(): Promise<string> {
        return await this.page.title();
    }

    async waitForLoadState(state: 'load' | 'domcontentloaded' | 'networkidle' = 'domcontentloaded') {
        await this.page.waitForLoadState(state);
    }
}