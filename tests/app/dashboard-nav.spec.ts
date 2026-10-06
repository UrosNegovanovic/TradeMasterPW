import percySnapshot from '@percy/playwright';
import { test, expect } from '../../fixtures/test';
import { NAV_ITEMS } from '../../test-data/copy';

test.describe('SM-06 Dashboard navigation', { tag: ['@smoke', '@p0'] }, () => {
  for (const item of NAV_ITEMS) {
    test(`opens ${item.label} (${item.path})`, async ({ dashboardPage, page, isMobile }) => {
      const failedApi: string[] = [];
      page.on('response', (r) => {
        if (r.url().includes('/api/') && r.status() >= 400) failedApi.push(`${r.status()} ${r.url()}`);
      });

      await dashboardPage.navigate();
      if (item.path !== '/dashboard') await dashboardPage.openFromNav(item, isMobile);
      await dashboardPage.expectOn(item);
      await page.waitForLoadState('networkidle');

      expect(failedApi, 'API calls that failed while loading the page').toEqual([]);
      await percySnapshot(page, `${isMobile ? 'Mobile' : 'Desktop'} – ${item.label}`);
    });
  }
});
