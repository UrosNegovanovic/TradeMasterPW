import { Locator, expect } from '@playwright/test';

/**
 * A form field can be rejected in two ways: natively by the browser (required/min/max/step, no text rendered)
 * or by the app's zod message once the form has been submitted. Which one fires first depends on the field state,
 * so a test asserts "the dialog stays open and the input is rejected by either mechanism".
 */
export async function expectRejected(dialog: Locator, input: Locator, message: string | RegExp) {
  await expect(dialog).toBeVisible();
  await expect
    .poll(async () => {
      const blockedByBrowser = !(await input.evaluate((el: HTMLInputElement) => el.validity.valid));
      const messageShown = (await dialog.getByText(message).count()) > 0;
      return blockedByBrowser || messageShown;
    }, { message: `input should be rejected (browser validation or "${message}")` })
    .toBe(true);
}
