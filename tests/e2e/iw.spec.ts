import { test, expect } from '@playwright/test';
import { SAMPLE } from './fixtures';

test.describe('/iw', () => {
  test('season card opens the raid boss detail', async ({ page }) => {
    await page.goto('/iw');
    const season = page.getByRole('heading', { name: SAMPLE.iw.seasonLabel, exact: true });
    await expect(season).toBeVisible({ timeout: 15_000 });

    await season.click();
    await expect(page).toHaveURL(new RegExp(`/iw/detail\\?id=${SAMPLE.iw.seasonKey}`));
    // the boss page titles itself "Raid Boss - <name>"
    await expect(page).toHaveTitle(/Raid Boss/, { timeout: 15_000 });
  });
});
