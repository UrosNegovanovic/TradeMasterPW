import { test, expect } from '../../fixtures/index';
import { NAV_ITEMS } from '../../test-data/copy';
import { expectNoSeriousA11yViolations } from '../../utils/a11y';

// Confirmed app defects (see BUGS.md). `test.fail` keeps the suite green and flips to red once the app is fixed, so the marker gets removed.
const KNOWN_ISSUES: Record<string, string> = {
  Asortiman: 'BUG-020 icon button without accessible name',
  Magacin: 'BUG-021 destructive button fails colour contrast',
  Katalozi: 'BUG-022 Radix select trigger without accessible name',
};

test.describe('AX-01 accessibility (logged in)', () => {
  for (const item of NAV_ITEMS) {
    test(`${item.label} has no critical/serious axe violations`, async ({ page }, testInfo) => {
      test.fail(item.label in KNOWN_ISSUES, KNOWN_ISSUES[item.label]);
      await page.goto(item.path);
      await expect(page.getByRole('main')).toBeVisible();
      await page.waitForLoadState('networkidle');
      await expectNoSeriousA11yViolations(page, testInfo);
    });
  }

  test('product dialog has no critical/serious axe violations', async ({ inventoryPage, page }, testInfo) => {
    test.fail(true, 'BUG-022 Radix select trigger without accessible name');
    await inventoryPage.navigate();
    await inventoryPage.openCreateDialog();
    await expectNoSeriousA11yViolations(page, testInfo, { include: '[role="dialog"]' });
  });

  test('new invoice form has no critical/serious axe violations', async ({ invoiceFormPage, page }, testInfo) => {
    await invoiceFormPage.navigateNew();
    await expectNoSeriousA11yViolations(page, testInfo);
  });
});
