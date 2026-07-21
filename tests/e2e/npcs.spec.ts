import { expect, test } from '@playwright/test';

test.describe('NPC viewer', () => {
  test.setTimeout(120_000);

  test('keeps Zeta mechanical and humanoid forms as separate NPCs', async ({ page }) => {
    await page.goto('/npcs?id=lemonade-zeta-mechanical');
    await expect(page.getByRole('heading', { name: 'Lemonade Zeta (Mechanical)', exact: true })).toBeVisible();
    await expect(page.getByText('2dmodel_mp_lemonadezeta_n', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: /Lemonade Zeta \(Humanoid\)/ }).click();
    await expect(page).toHaveURL(/\/npcs\?id=lemonade-zeta-humanoid/);
    await expect(page.getByText('2dmodel_pecs_lemonadezeta_n_dl', { exact: true })).toBeVisible();
    await expect(page.getByText('Google Play variation', { exact: true })).toBeVisible();
  });

  test('filters and selects NPC cards', async ({ page }) => {
    await page.goto('/npcs?id=lemonade-delta');
    await page.getByPlaceholder('Search NPC or model key').fill('omega');
    await page.getByRole('button', { name: /Lemonade Omega/ }).click();
    await expect(page).toHaveURL(/\/npcs\?id=lemonade-omega/);
    await expect(page.getByRole('heading', { name: 'Lemonade Omega', exact: true })).toBeVisible();
  });
});
