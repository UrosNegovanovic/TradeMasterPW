import { BasePage } from './BasePage';

export class SignUpPage extends BasePage {
    readonly firstNameInput = () => this.page.getByRole('textbox', { name: /first name/i });
    readonly lastNameInput = () => this.page.getByRole('textbox', { name: /last name/i });
    readonly emailInput = () => this.page.getByRole('textbox', { name: /email/i });
    readonly passwordInput = () => this.page.getByRole('textbox', { name: /password/i });
    // exact: true – isključuje "Continue with Google"; samo form Continue
    readonly continueButton = () => this.page.getByRole('button', { name: 'Continue', exact: true });
    // Verify you are human – tačan tekst iz labela (može biti u main doc ili u iframe-u)
    readonly verifyHumanCheckbox = () => this.page.getByLabel('Verify you are human');
    readonly verifyHumanCheckboxByRole = () => this.page.getByRole('checkbox', { name: 'Verify you are human' });
    // Turnstile iframe je unutar Shadow DOM – Clerk koristi #clerk-captcha >> iframe (>> probija shadow)
    readonly turnstileFrame = () => this.page.frameLocator('#clerk-captcha >> iframe');
    // Verifikacija emaila – isto kao login; Clerk Test Mode: fiksni kod 424242
    readonly otpInput = () => this.page.getByRole('textbox', { name: /verification code/i });

    async navigate() {
        await this.goto('/Get Started');
        await this.waitForLoadState();
    }

    generateRandomEmail() : string {
        const randomDigits = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
        return `uros.negovanovic35+clerk_test${randomDigits}@gmail.com`;
    }

    async performSignUp(firstName: string, lastName: string, email: string, password: string, otp: string) {
        await this.firstNameInput().fill(firstName);
        await this.lastNameInput().fill(lastName);
        await this.emailInput().fill(email);
        await this.passwordInput().fill(password);
        await this.continueButton().click();  // 1. Continue
        // 2. Sa Clerk Testing Token Turnstile može biti bypass-ovan; inače čekamo widget i checkbox
        await this.waitForTurnstileWidget();
        if (this.page.url().includes('/dashboard')) return; // token bypass – već na dashboardu
        const clicked = await this.clickVerifyHumanCheckbox();
        if (clicked) {
            await this.continueButton().click();
        } else {
            // Token bypass – widget se možda ne prikaže; ipak kliknemo Continue (backend prihvata)
            await this.continueButton().click();
        }
        // 3. Verify your mail – unesi OTP (Clerk Test Mode: 424242)
        const otpBox = this.otpInput();
        await otpBox.waitFor({ state: 'visible', timeout: 15000 });
        await otpBox.fill(otp);
        await this.page.waitForURL(/dashboard/, { timeout: 15000 });
    }

    private delay(ms: number): Promise<void> {
        return new Promise((r) => setTimeout(r, ms));
    }

    /** Čeka da se #clerk-captcha pojavi (~1s posle Continue), pa pauza za iframe. Sa tokenom može da ne bude. */
    private async waitForTurnstileWidget(): Promise<void> {
        const clerkCaptcha = this.page.locator('#clerk-captcha');
        try {
            await clerkCaptcha.waitFor({ state: 'visible', timeout: 6000 });
            console.log('[Turnstile] #clerk-captcha visible:', await clerkCaptcha.isVisible());
            await this.delay(2000);
        } catch {
            // Token bypass – widget se ne prikaže; nastavljamo
        }
    }

    private async clickVerifyHumanCheckbox(): Promise<boolean> {
        const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

        // Strategija 1: Frame objekat preko contentFrame() – pouzdanije za cross-origin iframe
        const iframeEl = this.page.locator('#clerk-captcha >> iframe');
        try {
            await iframeEl.waitFor({ state: 'attached', timeout: 5000 });
        } catch {
            return false; // nema iframe (npr. token bypass)
        }
        const frame = await iframeEl.elementHandle().then((h) => h?.contentFrame()).catch(() => null);
        if (frame) {
            try {
                const checkbox = frame.locator('input[type="checkbox"]');
                await checkbox.waitFor({ state: 'visible', timeout: 5000 });
                const visible = await checkbox.isVisible();
                console.log('[Checkbox] frame.locator(input[type=checkbox]) visible:', visible);
                await delay(500);
                await checkbox.click({ force: true });
                console.log('[Checkbox] clicked input[type=checkbox] via Frame');
                return true;
            } catch (e) {
                console.log('[Checkbox] Frame input not visible, trying evaluate:', (e as Error).message);
                const clicked = await frame.evaluate(() => {
                    const cb = document.querySelector('input[type="checkbox"]');
                    if (cb && cb instanceof HTMLInputElement) {
                        cb.click();
                        return true;
                    }
                    const label = Array.from(document.querySelectorAll('label')).find((l) => l.textContent?.includes('Verify you are human'));
                    if (label) {
                        label.click();
                        return true;
                    }
                    return false;
                });
                if (clicked) {
                    console.log('[Checkbox] clicked via frame.evaluate()');
                    return true;
                }
            }
        } else {
            console.log('[Checkbox] could not get Frame from iframe element');
        }

        // Strategija 2: Human-like pomeranje miša + klik – Turnstile često reaguje na “ljudski” pokret
        try {
            const box = await iframeEl.boundingBox();
            if (box) {
                const targetX = box.x + box.width * 0.25;
                const targetY = box.y + box.height / 2;
                const steps = 8;
                const startX = box.x + box.width / 2;
                const startY = box.y + box.height / 2;
                await this.page.mouse.move(startX, startY);
                for (let i = 1; i <= steps; i++) {
                    const x = startX + (targetX - startX) * (i / steps);
                    const y = startY + (targetY - startY) * (i / steps);
                    await this.page.mouse.move(x, y, { steps: 2 });
                    await delay(50);
                }
                await delay(200);
                await this.page.mouse.click(targetX, targetY);
                console.log('[Checkbox] clicked Turnstile area (human-like move + click)');
                return true;
            }
        } catch (e) {
            console.log('[Checkbox] coordinate click failed:', (e as Error).message);
        }

        // Strategija 3: frameLocator fallback
        try {
            const frameLoc = this.turnstileFrame();
            const loc = frameLoc.locator('input[type="checkbox"]');
            await loc.waitFor({ state: 'visible', timeout: 5000 });
            await loc.click({ force: true });
            console.log('[Checkbox] clicked via frameLocator');
            return true;
        } catch {
            // skip
        }

        console.log('[Checkbox] no checkbox found/visible – returning false');
        return false;
    }
}