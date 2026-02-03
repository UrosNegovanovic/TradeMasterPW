import { setupClerkTestingToken } from '@clerk/testing/playwright';
import { test, expect } from '../fixture/test';

const TEST_PASSWORD = 'Qat456123!';
const TEST_FIRST_NAME = 'Uros';
const TEST_LAST_NAME = 'Uzelac';
const FIXED_OTP = '424242';  // Clerk Test Mode – isti kao za login

test.describe('TradeMaster Registration', () => {
    test('should register successfully', async ({ page, homePage, signUpPage }) => {
        test.skip(
            !process.env.CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY,
            'CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY required (set in .env or GitHub Secrets for CI)'
        );
        await setupClerkTestingToken({ page });

        await homePage.navigate();
        const getStartedBtn = await homePage.getGetStartedButton();
        await getStartedBtn.click();

        const email = signUpPage.generateRandomEmail();
        console.log('[Registration] email:', email);

        await signUpPage.performSignUp(TEST_FIRST_NAME, TEST_LAST_NAME, email, TEST_PASSWORD, FIXED_OTP);

        // Uspešna registracija – redirect na dashboard
        await expect(signUpPage.page).toHaveURL(/dashboard/);
    });
});