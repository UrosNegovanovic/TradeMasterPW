import { test } from '../../fixtures/test';
import { expectNoSeriousA11yViolations } from '../../utils/a11y';

test.describe('AX-01 accessibility (logged out)', () => {
  const pages = [
    ['landing', '/'],
    ['sign-in', '/sign-in'],
    ['sign-up', '/sign-up'],
    ['privacy', '/privatnost'],
    ['terms', '/uslovi'],
  ] as const;

  for (const [name, path] of pages) {
    test(`${name} has no critical/serious axe violations`, async ({ page }, testInfo) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await expectNoSeriousA11yViolations(page, testInfo);
    });
  }
});
