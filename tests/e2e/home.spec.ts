import { test, expect } from '@playwright/test';

test.describe('/', () => {
  test('section cards navigate to their pages', async ({ page }) => {
    await page.goto('/');
    // navbar brand and hero are both "LOMapR" headings — either proves the page rendered
    await expect(page.getByRole('heading', { name: 'LOMapR', exact: true }).first()).toBeVisible({ timeout: 15_000 });

    // quick-nav card (a heading inside a link card, distinct from the navbar links)
    await page.getByRole('heading', { name: 'Units', exact: true }).click();
    await expect(page).toHaveURL(/\/units$/);
    await expect(page.getByRole('heading', { name: 'Units', exact: true })).toBeVisible({ timeout: 15_000 });
  });

  test('related sites section lists external links', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Related Sites' })).toBeVisible({ timeout: 15_000 });
    const wiki = page.getByRole('link', { name: /English Last Origin Wiki/ });
    await expect(wiki).toBeVisible();
    await expect(wiki).toHaveAttribute('href', /lastorigin\.fandom\.com/);
  });
});
