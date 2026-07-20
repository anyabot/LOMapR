import { test, expect } from '@playwright/test';
import { SAMPLE } from './fixtures';

const W = SAMPLE.world;

test.describe('world drill-down', () => {
  test('world list -> chapter -> zone -> stage', async ({ page }) => {
    await page.goto('/world');
    await expect(page.getByRole('heading', { name: 'Story', exact: true })).toBeVisible({ timeout: 15_000 });

    // chapter card -> zone list
    await page.getByText(W.title, { exact: true }).first().click();
    await expect(page).toHaveURL(new RegExp(`/world/detail\\?id=${W.id}`));
    await expect(page.getByRole('heading', { name: W.title, exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(`${W.zones} zones`)).toBeVisible();

    // zone card -> stage map
    await page.getByText(W.zone1Title, { exact: true }).first().click();
    await expect(page).toHaveURL(new RegExp(`/world/stage\\?id=${W.id}&zone=1`));
    await expect(page.getByRole('heading', { name: W.zone1Title, exact: true })).toBeVisible({ timeout: 15_000 });

    // back button (a link-styled button) returns to the zone list
    await page.getByRole('link', { name: 'Back', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/world/detail\\?id=${W.id}`));
  });

  test('?stage= deep link selects the stage', async ({ page }) => {
    await page.goto(`/world/stage?id=${W.id}&zone=1&stage=${encodeURIComponent(W.stage)}`);
    await expect(page.getByRole('heading', { name: W.zone1Title, exact: true })).toBeVisible({ timeout: 15_000 });
    // the stage header card shows the stage code and its Battle badge
    await expect(page.getByRole('heading', { name: W.stage, exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Battle', { exact: true }).first()).toBeVisible();
  });

  test('unknown world id 404s', async ({ page }) => {
    await page.goto('/world/detail?id=NoSuchWorld');
    await expect(page.getByText('404')).toBeVisible({ timeout: 15_000 });
  });
});
