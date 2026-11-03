import { test, expect, Page } from './test';

const tab = (page: Page, name: RegExp) => page.getByRole('tab', { name });

test.describe('/exchange', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/exchange');
    await expect(tab(page, /^Enhancement/)).toBeVisible({ timeout: 15_000 });
  });

  test('selecting a tab updates the URL and survives a reload', async ({ page }) => {
    await tab(page, /^Costumes/).click();
    await expect(page).toHaveURL(/tab=costume/);
    await page.reload();
    await expect(tab(page, /^Costumes/)).toHaveAttribute('aria-selected', 'true', { timeout: 15_000 });
  });

  test('nonsense search empties the list', async ({ page }) => {
    await page.getByPlaceholder('Search items or units').fill('zzzz-no-such-item');
    await expect(page.getByText('No items match.')).toBeVisible();
  });

  test('purchase limit filter separates monthly from permanent items', async ({ page }) => {
    const group = page.getByRole('group', { name: 'Purchase limit reset' });
    await group.getByRole('button', { name: 'Monthly', exact: true }).click();
    await tab(page, /^Costumes/).click();
    await expect(page.getByText('No items match.')).toBeVisible();

    await group.getByRole('button', { name: 'Permanent', exact: true }).click();
    await expect(page.getByText('No items match.')).toBeHidden();
  });
});
