import { BasePage } from "./BasePage";

export class SignInPage extends BasePage {
    readonly emailInput = () => this.page.getByLabel(/email/i);
    // exact: true – isključuje "Sign in with Google Continue"; traži samo form Continue dugme
    readonly continueButton = () => this.page.getByRole('button', { name: 'Continue', exact: true });
    // getByRole('textbox') – samo input; getByLabel(/password/i) hvata i "Show password" dugme
    readonly passwordInput = () => this.page.getByRole('textbox', { name: 'Password' });
    // OTP input – Clerk Test Mode: fiksni kod 424242; getByRole('textbox') cilja samo input
    readonly otpInput = () => this.page.getByRole('textbox', { name: /verification code/i });

    async navigate() {
        await this.goto('/sign-in');
        await this.waitForLoadState();
    }
    async performLogin(email: string, password: string, otp: string) {
        await this.emailInput().fill(email);
        await this.continueButton().click();
        await this.passwordInput().fill(password);
        await this.continueButton().click();
        await this.otpInput().fill(otp);
        //await this.continueButton().click();
        // Čeka redirect na dashboard – success poruka se prikaže pre redirect-a
        await this.page.waitForURL(/dashboard/, { timeout: 15000 });
    }
}