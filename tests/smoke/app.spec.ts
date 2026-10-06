import { test, expect } from '../../fixtures/test';

test.describe('Authenticated smoke', { tag: ['@smoke', '@p0'] }, () => {
  test('SM-05 logged-in user reaches the dashboard', async ({ dashboardPage, page }) => {
    await dashboardPage.navigate();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(dashboardPage.pageHeading()).toHaveText('Početna');
    await expect(dashboardPage.signOutButton()).toBeVisible();
  });
});
