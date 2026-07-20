import { test, expect } from '@playwright/test';
import { SAMPLE } from './fixtures';

test.describe('/skins', () => {
  test('search filters the skin row', async ({ page }) => {
    await page.goto('/skins');
    await expect(page.getByRole('heading', { name: 'Skins', exact: true })).toBeVisible({ timeout: 15_000 });

    const search = page.getByPlaceholder('Search skin or unit name');
    await search.fill(SAMPLE.unit.name);
    // every card shows the owning unit's name; at least one match must remain
    await expect(page.getByText(SAMPLE.unit.name, { exact: true }).first()).toBeVisible();

    await search.fill('zzz-no-such-skin');
    await expect(page.getByText('No skins match the current filters.')).toBeVisible();
  });

  test('category filter toggles on and clears', async ({ page }) => {
    await page.goto('/skins');
    await expect(page.getByRole('heading', { name: 'Skins', exact: true })).toBeVisible({ timeout: 15_000 });
    // wait for the filter bar (built from the loaded list)
    await expect(page.getByText('Category', { exact: true })).toBeVisible({ timeout: 15_000 });

    // toggle the first category chip; a Clear button appears next to it
    const categoryRow = page.getByText('Category', { exact: true }).locator('..');
    await categoryRow.getByRole('button').first().click();
    await expect(categoryRow.getByRole('button', { name: 'Clear' })).toBeVisible();
    await categoryRow.getByRole('button', { name: 'Clear' }).click();
    await expect(categoryRow.getByRole('button', { name: 'Clear' })).toBeHidden();
  });
});
