import { test, expect, Page } from '@playwright/test';

// These stream archives from the live CDN, so unlike the rest of the suite they need
// network access. One skin per PixiJS layout kind; the Unity kind is not covered.

const FIXED = { unit: 'Constantia S2', skin: 'Guardsman Waiting Only for You' };
const SPINE = { unit: 'Lindwurm', skin: '520 520 Wo Ai Ni: Black & White Qipao' };

async function openSkin(page: Page, search: string, skinName: string) {
  await page.goto('/skins');
  await expect(page.getByRole('heading', { name: 'Skins', exact: true })).toBeVisible({ timeout: 15_000 });
  await page.getByPlaceholder('Search skin or unit name').fill(search);
  await page.getByText(skinName, { exact: true }).first().click();
  // viewer panel opens with the info table; Name row echoes the skin name
  await expect(page.getByRole('cell', { name: skinName })).toBeVisible();
}

test.describe('skin viewer (fetches archives from the live CDN)', () => {
  test.setTimeout(120_000);

  test('fixed-layout skin downloads and renders on a canvas', async ({ page }) => {
    await openSkin(page, FIXED.unit, FIXED.skin);
    // archive fetched, unpacked and composed -> PixiJS canvas attached
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText(/^Error:/)).toBeHidden();
  });

  test('spine skin downloads and renders on a canvas', async ({ page }) => {
    await openSkin(page, SPINE.unit, SPINE.skin);
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText(/^Error:/)).toBeHidden();
  });
});
