import { test, expect } from '@playwright/test';

// KR data is ahead of global, so a KR-only unit must appear only under the KR region.
const KR_ONLY = { id: 'Char_BR_MariaGrace_N', name: 'Maria Grace' };

test.describe('region switching', () => {
  test('KR-only unit is hidden on the global server', async ({ page }) => {
    await page.goto('/units');
    await expect(page.getByRole('heading', { name: 'Units', exact: true })).toBeVisible({ timeout: 15_000 });
    await page.getByPlaceholder('Search name or code').fill(KR_ONLY.name);
    await expect(page.getByText('No units match the current filters.')).toBeVisible();
  });

  test('?server=kr forces the KR region and reveals the unit', async ({ page }) => {
    await page.goto('/units?server=kr');
    await expect(page.getByRole('heading', { name: 'Units', exact: true })).toBeVisible({ timeout: 15_000 });
    await page.getByPlaceholder('Search name or code').fill(KR_ONLY.name);
    const tile = page.getByText(KR_ONLY.name, { exact: true }).first();
    await expect(tile).toBeVisible({ timeout: 15_000 });

    await tile.click();
    await expect(page).toHaveURL(new RegExp(`/units/detail\\?id=${KR_ONLY.id}`));
    await expect(page.getByRole('heading', { name: KR_ONLY.name, exact: true })).toBeVisible({ timeout: 15_000 });
  });

  test('navbar region select refetches units for KR', async ({ page }) => {
    await page.goto('/units');
    await expect(page.getByRole('heading', { name: 'Units', exact: true })).toBeVisible({ timeout: 15_000 });
    await page.getByPlaceholder('Search name or code').fill(KR_ONLY.name);
    await expect(page.getByText('No units match the current filters.')).toBeVisible();

    // the navbar region select is the page's combobox showing "Global"
    await page.getByRole('combobox').filter({ hasText: 'Global' }).selectOption('kr');
    await expect(page.getByText(KR_ONLY.name, { exact: true }).first()).toBeVisible({ timeout: 15_000 });

    // switching back to global hides it again
    await page.getByRole('combobox').filter({ hasText: 'Global' }).selectOption('global');
    await expect(page.getByText('No units match the current filters.')).toBeVisible({ timeout: 15_000 });
  });

  // a region switch wipes the bundle cache, so the open page must refetch, not hang
  test('region switch on an open unit detail refetches instead of hanging', async ({ page }) => {
    await page.goto('/units/detail?id=Char_3P_ConstantiaS2_N');
    await expect(page.getByRole('heading', { name: 'Constantia S2', exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Stats', exact: true })).toBeVisible({ timeout: 15_000 });

    await page.getByRole('combobox').filter({ hasText: 'Global' }).selectOption('kr');

    // the page must come back with KR data, not sit on the loading spinner
    await expect(page.getByRole('heading', { name: 'Constantia S2', exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Stats', exact: true })).toBeVisible({ timeout: 15_000 });
    // and the region-transition overlay must be gone
    await expect(page.locator('[style*="z-index: 9999"]')).toHaveCount(0);
  });

  // KR-only units have empty `en`, and no raw numeric loc-id may reach the grid
  test('no raw loc-ids leak on the KR unit grid', async ({ page }) => {
    await page.goto('/units?server=kr');
    await expect(page.getByRole('heading', { name: 'Units', exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(KR_ONLY.name, { exact: true }).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/^\d{10}$/)).toHaveCount(0);
  });

  test('region persists across reloads and ?server= overrides it', async ({ page }) => {
    await page.goto('/units');
    await expect(page.getByRole('heading', { name: 'Units', exact: true })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('combobox').filter({ hasText: 'Global' }).selectOption('kr');
    await page.getByPlaceholder('Search name or code').fill(KR_ONLY.name);
    await expect(page.getByText(KR_ONLY.name, { exact: true }).first()).toBeVisible({ timeout: 15_000 });

    // reload: the persisted KR choice is restored
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Units', exact: true })).toBeVisible({ timeout: 15_000 });
    await page.getByPlaceholder('Search name or code').fill(KR_ONLY.name);
    await expect(page.getByText(KR_ONLY.name, { exact: true }).first()).toBeVisible({ timeout: 15_000 });

    // ?server=global beats the persisted KR region
    await page.goto('/units?server=global');
    await expect(page.getByRole('heading', { name: 'Units', exact: true })).toBeVisible({ timeout: 15_000 });
    await page.getByPlaceholder('Search name or code').fill(KR_ONLY.name);
    await expect(page.getByText('No units match the current filters.')).toBeVisible({ timeout: 15_000 });
  });

  test('KR-only unit detail: not found on global, resolves on KR', async ({ page }) => {
    await page.goto(`/units/detail?id=${KR_ONLY.id}`);
    await expect(page.getByText('Unit not found.')).toBeVisible({ timeout: 15_000 });

    await page.goto(`/units/detail?id=${KR_ONLY.id}&server=kr`);
    await expect(page.getByRole('heading', { name: KR_ONLY.name, exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Unit not found.')).toBeHidden();
  });
});
