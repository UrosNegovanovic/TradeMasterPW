import { Page } from "@playwright/test";

export class BasePage {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    async goto(path: string = '') {
        await this.page.goto(path || '/');
    }

    async getTitle(): Promise<string> {
        return await this.page.title();
    }

    async waitForLoadState(state: 'load' | 'domcontentloaded' | 'networkidle' = 'domcontentloaded') {
        await this.page.waitForLoadState(state);
    }
}