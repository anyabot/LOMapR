import { test, expect } from './test';
import { SAMPLE } from './fixtures';

test.describe('/iw', () => {
  test('season card opens the raid boss detail', async ({ page }) => {
    await page.goto('/iw');
    const season = page.getByText(SAMPLE.iw.seasonLabel, { exact: true });
    await expect(season).toBeVisible({ timeout: 15_000 });

    await season.click();
    await expect(page).toHaveURL(new RegExp(`/iw/detail/\\?id=${SAMPLE.iw.seasonKey}`));
    // the boss page titles itself "Raid Boss - <name>"
    await expect(page).toHaveTitle(/Raid Boss/, { timeout: 15_000 });
  });

  test('stage stepper moves between stages and stops at the ends', async ({ page }) => {
    await page.goto(`/iw/detail?id=${SAMPLE.iw.seasonKey}`);
    const min = page.getByRole('button', { name: '« Min' });
    await expect(min).toBeDisabled({ timeout: 15_000 });
    const stage = page.getByRole('textbox').or(page.getByRole('spinbutton')).first();
    await expect(stage).toHaveValue('1');

    await page.getByRole('button', { name: '+', exact: true }).click();
    await expect(stage).toHaveValue('2');
    await expect(min).toBeEnabled();

    await page.getByRole('button', { name: /Max/ }).click();
    await expect(page.getByRole('button', { name: /Max/ })).toBeDisabled();
    await min.click();
    await expect(stage).toHaveValue('1');
  });

  test('unknown boss offers a way back', async ({ page }) => {
    await page.goto('/iw/detail?id=NoSuchBoss');
    await expect(page.getByText("This raid boss isn't available in the selected region.")).toBeVisible({ timeout: 15_000 });
    await page.getByRole('link', { name: 'Back to Infinite War' }).click();
    await expect(page).toHaveURL(/\/iw\/$/);
  });
});
