import { test, expect } from './test';
import { SAMPLE } from './fixtures';

test.describe('/equipment', () => {
  test('search narrows the list', async ({ page }) => {
    await page.goto('/equipment');
    await expect(page.getByRole('heading', { name: 'Equipment', exact: true })).toBeVisible({ timeout: 15_000 });
    await page.getByPlaceholder('Search name or code').fill(SAMPLE.equip.name);
    await expect(page.getByText(SAMPLE.equip.name, { exact: true }).first()).toBeVisible();
    await page.getByPlaceholder('Search name or code').fill('zzz-no-such-equip');
    await expect(page.getByText('No equipment matches the current filters.')).toBeVisible();
  });

  test('type filter keeps only that slot section', async ({ page }) => {
    await page.goto('/equipment');
    await expect(page.getByRole('heading', { name: 'OS', exact: true })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Chip', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Chip', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'OS', exact: true })).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Item', exact: true })).toBeHidden();
  });

  test('clicking a tile opens the equip modal', async ({ page }) => {
    await page.goto('/equipment');
    await expect(page.getByRole('heading', { name: 'Equipment', exact: true })).toBeVisible({ timeout: 15_000 });
    await page.getByPlaceholder('Search name or code').fill(SAMPLE.equip.name);
    await page.getByText(SAMPLE.equip.name, { exact: true }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(SAMPLE.equip.name).first()).toBeVisible();
    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(dialog).toBeHidden();
  });

  test('?equip= deep link opens the modal on load', async ({ page }) => {
    await page.goto(`/equipment?equip=${encodeURIComponent(SAMPLE.equip.id)}`);
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await expect(dialog.getByText(SAMPLE.equip.name).first()).toBeVisible();
  });

  test('rank buttons switch rank and the source tab opens', async ({ page }) => {
    await page.goto(`/equipment?equip=${encodeURIComponent(SAMPLE.equip.id)}`);
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    const stat = dialog.getByText(/^\+\d/).first();
    await expect(stat).toBeVisible({ timeout: 15_000 });
    const topRank = await stat.innerText();
    await dialog.getByRole('button', { name: 'S', exact: true }).click();
    await expect(stat).not.toHaveText(topRank);

    await dialog.getByRole('tab', { name: 'Source', exact: true }).click();
    await expect(dialog.getByRole('tab', { name: 'Source', exact: true })).toHaveAttribute('aria-selected', 'true');
  });

  test('closing a deep-linked modal clears the URL so a reload keeps it closed', async ({ page }) => {
    await page.goto(`/equipment?equip=${encodeURIComponent(SAMPLE.equip.id)}`);
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(dialog).toBeHidden();
    await expect(page).not.toHaveURL(/equip=/);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });
    await expect(dialog).toBeHidden();
  });
});
