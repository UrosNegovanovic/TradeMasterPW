import { test, expect } from '../../fixtures/test';

test.describe('Public smoke', { tag: ['@smoke', '@p0'] }, () => {
  test('SM-01 landing loads without console errors', async ({ homePage, page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));

    await homePage.navigate();
    await homePage.verifyLandingPageLoaded();
    await expect(homePage.signUpLink()).toBeVisible();
    await page.waitForLoadState('networkidle');

    expect(errors).toEqual([]);
  });

  for (const [path, heading] of [['/privatnost', /privatnost/i], ['/uslovi', /uslov/i]] as const) {
    test(`SM-02 ${path} opens`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
    });
  }

  test('SM-03 anonymous /dashboard redirects to sign-in', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test('SM-04 anonymous API call returns 401 JSON', async ({ request }) => {
    const response = await request.get('/api/products');
    expect(response.status()).toBe(401);
    expect(response.headers()['content-type']).toContain('application/json');
  });

  const SEO_FILES: Array<[string, string]> = [
    ['/robots.txt', 'text/plain'],
    ['/sitemap.xml', 'xml'],
    ['/manifest.webmanifest', 'json'],
  ];
  for (const [path, type] of SEO_FILES) {
    test(`SM-07 ${path} is served`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain(type);
    });
  }
});
