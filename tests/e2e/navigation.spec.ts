import { test, expect, Page } from './test';

const openMenuIfCollapsed = async (page: Page) => {
  const toggle = page.getByRole('button', { name: 'Toggle menu' });
  if (await toggle.isVisible()) await toggle.click();
};

test.describe('site navigation', () => {
  const LINKS: [string, RegExp][] = [
    ['Units', /\/units\/$/],
    ['Skins', /\/skins\/$/],
    ['Equipment', /\/equipment\/$/],
    ['World', /\/world\/$/],
    ['Story', /\/story\/$/],
    ['Sanctum', /\/sanctum\/$/],
    ['Enemies', /\/enemies\/$/],
    ['Infinite War', /\/iw\/$/],
  ];
  for (const [name, url] of LINKS) {
    test(`nav link ${name} navigates without a reload`, async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => { (window as any).__spa = true; });
      await openMenuIfCollapsed(page);
      await page.getByRole('link', { name, exact: true }).first().click();
      await expect(page).toHaveURL(url);
      expect(await page.evaluate(() => (window as any).__spa)).toBe(true);
    });
  }

  test('back returns to the previous page', async ({ page }) => {
    await page.goto('/');
    await openMenuIfCollapsed(page);
    await page.getByRole('link', { name: 'Units', exact: true }).first().click();
    await expect(page).toHaveURL(/\/units\/$/);
    await page.goBack();
    await expect(page.getByRole('heading', { name: 'LOMapR', exact: true }).first()).toBeVisible({ timeout: 15_000 });
  });

  test('unknown path renders the 404 page', async ({ page }) => {
    const response = await page.goto('/no-such-page');
    expect(response?.status()).toBe(404);
    await expect(page.getByText('404').first()).toBeVisible();
  });
});
