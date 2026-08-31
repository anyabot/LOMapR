import { test, expect } from '@playwright/test';

test.describe('/sanctum', () => {
  test('area buttons, floor select and difficulty toggles work', async ({ page }) => {
    await page.goto('/sanctum');
    await expect(page.getByText('Sanctum of Alteration').first()).toBeVisible({ timeout: 15_000 });

    // area buttons render once data is loaded
    const area1 = page.getByRole('button', { name: 'Sanctum 1', exact: true });
    await expect(area1).toBeVisible({ timeout: 15_000 });

    // difficulty: EASY always exists
    await expect(page.getByRole('button', { name: 'EASY', exact: true })).toBeVisible();

    // the navbar has its own select, so pick the combobox whose options are floors
    const floorSelect = page.getByRole('combobox').filter({ hasText: 'Floor' });
    await floorSelect.selectOption({ index: 1 });
    await expect(page.getByText(/Share — .*Floor/)).toBeVisible();

    // switching area keeps the page functional
    const area2 = page.getByRole('button', { name: 'Sanctum 2', exact: true });
    if (await area2.isVisible()) {
      await area2.click();
      await expect(page.getByRole('button', { name: 'EASY', exact: true })).toBeVisible();
    }
  });

  test('share deep link restores area, floor and difficulty', async ({ page }) => {
    // EW02 floor index 1 (stage 2) has a NORMAL difficulty in the data
    await page.goto('/sanctum?area=EW02&floor=1&diff=1');
    await expect(
      page.getByRole('button', { name: /Share — EW02 Floor 2 \(Normal\)/ }),
    ).toBeVisible({ timeout: 15_000 });
  });
});
