import { test, expect } from '@playwright/test';
import { copy } from '../../test-data/copy';

const { landing } = copy;

test.describe('Landing page content', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('LA-01 FAQ items open and close', async ({ page }) => {
    const faq = page.locator('#pitanja details');
    const first = faq.first();
    await expect(first).toBeVisible();
    await expect(first).not.toHaveAttribute('open', '');
    await first.locator('summary').click();
    await expect(first).toHaveAttribute('open', '');
    await first.locator('summary').click();
    await expect(first).not.toHaveAttribute('open', '');
  });

  test('LA-01 pricing call to action leads to sign-up', async ({ page }) => {
    await page.locator('#cena').getByRole('link', { name: landing.pricingCta }).click();
    await expect(page).toHaveURL(/\/sign-up/);
  });

  test('LA-02 pricing states the offer and promises no checkout', async ({ page }) => {
    const pricing = page.locator('#cena');
    await expect(pricing).toContainText(landing.price);
    await expect(pricing).toContainText(landing.priceNote);
    await expect(pricing).not.toContainText(landing.noCheckoutPromises);
  });

  test('LA-03 demo video has Serbian captions', async ({ page, request }) => {
    const track = page.locator('video track[kind="captions"]');
    await expect(track).toHaveAttribute('srclang', 'sr');
    const response = await request.get('/landing-demo-captions.vtt');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/vtt');
    expect(await response.text()).toMatch(/^WEBVTT/);
  });

  test('LA-05 meta tags, canonical and language', async ({ page, request }) => {
    await expect(page.locator('html')).toHaveAttribute('lang', 'sr');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.{40,}/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /^https?:\/\/[^/]+\/?$/);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', landing.title);
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'sr_RS');
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');

    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(ogImage, 'og:image is set').toBeTruthy();
    // The tag holds the production origin, the file is checked on the environment under test.
    const image = await request.get(new URL(ogImage!).pathname);
    expect(image.status()).toBe(200);
    expect(image.headers()['content-type']).toContain('image/');
  });

  for (const [name, path] of [['privacy', '/privatnost'], ['terms', '/uslovi']] as const) {
    test(`LA-06 ${name} page names the operator without placeholders`, async ({ page }) => {
      // The operator's address is still the literal "test" (src/lib/operator.ts). Remove fixme once the owner enters real data.
      test.fixme(true, 'BUG-023 operator address is the placeholder "test"');
      await page.goto(path);
      await expect(page.getByRole('main')).not.toContainText(landing.operatorPlaceholder);
    });
  }
});
