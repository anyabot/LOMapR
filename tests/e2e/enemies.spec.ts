import { test, expect } from './test';
import { SAMPLE } from './fixtures';

test.describe('/enemies', () => {
  test('search narrows the list and a card opens the enemy modal', async ({ page }) => {
    await page.goto('/enemies');
    await expect(page.getByRole('heading', { name: 'Enemies', exact: true })).toBeVisible({ timeout: 15_000 });

    await page.getByPlaceholder('Search name').fill(SAMPLE.enemy.name);
    await expect(page.getByText(SAMPLE.enemy.name, { exact: true }).first()).toBeVisible();

    await page.getByText(SAMPLE.enemy.name, { exact: true }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(SAMPLE.enemy.name).first()).toBeVisible();
  });

  test('nonsense search shows the empty state', async ({ page }) => {
    await page.goto('/enemies');
    await expect(page.getByRole('heading', { name: 'Enemies', exact: true })).toBeVisible({ timeout: 15_000 });
    await page.getByPlaceholder('Search name').fill('zzz-no-such-enemy');
    await expect(page.getByText('No enemies match the current filters.')).toBeVisible();
  });

  test('?enemy= deep link opens the modal on load', async ({ page }) => {
    await page.goto(`/enemies?enemy=${encodeURIComponent(SAMPLE.enemy.id)}`);
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await expect(dialog.getByText(SAMPLE.enemy.name).first()).toBeVisible();
  });

  test('?lv= deep link opens the modal at that level', async ({ page }) => {
    await page.goto(`/enemies?enemy=${encodeURIComponent(SAMPLE.enemy.id)}&lv=30`);
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await expect(dialog.getByRole('spinbutton')).toHaveValue('30');
  });

  test('closing a deep-linked modal clears the URL so a reload keeps it closed', async ({ page }) => {
    await page.goto(`/enemies?enemy=${encodeURIComponent(SAMPLE.enemy.id)}`);
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(dialog).toBeHidden();
    await expect(page).not.toHaveURL(/enemy=/);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });
    await expect(dialog).toBeHidden();
  });
});
