import { test, expect } from './test';
import { SAMPLE } from './fixtures';

test.describe('/units', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/units');
    await expect(page.getByRole('heading', { name: 'Units', exact: true })).toBeVisible({ timeout: 15_000 });
  });

  test('unit tiles are plain links with small lazy WebP portraits', async ({ page }) => {
    const tile = page.locator(`a[href*="${SAMPLE.unit.id}"]`).first();
    await expect(tile).toBeAttached({ timeout: 15_000 });
    await expect(page.locator('a[role="group"]')).toHaveCount(0);
    const portrait = tile.locator('img').first();
    await expect(portrait).toHaveAttribute('src', /^\/images\/_w\/icons\/.+\.webp$/);
    await expect(portrait).toHaveAttribute('loading', 'lazy');
    const loaded = await portrait.evaluate(async (img: HTMLImageElement) => {
      img.scrollIntoView();
      await img.decode().catch(() => {});
      return img.naturalWidth;
    });
    expect(loaded).toBeGreaterThan(0);
  });

  test('search narrows the grid to matching units', async ({ page }) => {
    await page.getByPlaceholder('Search name or code').fill(SAMPLE.unit.name);
    await expect(page.getByText(SAMPLE.unit.name, { exact: true }).first()).toBeVisible();
    // a nonsense query empties the grid
    await page.getByPlaceholder('Search name or code').fill('zzz-no-such-unit');
    await expect(page.getByText('No units match the current filters.')).toBeVisible();
    // the clear button restores the full grid
    await page.getByRole('button', { name: 'Clear search' }).click();
    await expect(page.getByText('No units match the current filters.')).toBeHidden();
  });

  test('type filter hides the other class-type sections', async ({ page }) => {
    // section headers exist for all three types before filtering
    await expect(page.getByRole('heading', { name: 'Light', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Heavy', exact: true })).toBeVisible();
    // include-mode on Heavy -> only the Heavy table remains
    await page.getByRole('button', { name: 'Heavy', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Heavy', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Light', exact: true })).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Air', exact: true })).toBeHidden();
  });

  test('second click on a filter switches it to exclude mode', async ({ page }) => {
    // filter buttons cycle off -> include -> exclude; exclude drops only that section
    await page.getByRole('button', { name: 'Heavy', exact: true }).click();
    await page.getByRole('button', { name: 'Heavy', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Heavy', exact: true })).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Light', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Air', exact: true })).toBeVisible();
    // third click returns to off: all sections back
    await page.getByRole('button', { name: 'Heavy', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Heavy', exact: true })).toBeVisible();
  });

  test('clicking a unit tile opens its detail page', { tag: '@smoke' }, async ({ page }) => {
    await page.getByPlaceholder('Search name or code').fill(SAMPLE.unit.name);
    await page.getByText(SAMPLE.unit.name, { exact: true }).first().click();
    await expect(page).toHaveURL(new RegExp(`/units/detail/\\?id=${SAMPLE.unit.id}`));
    await expect(page.getByRole('heading', { name: SAMPLE.unit.name, exact: true })).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('/units/detail', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('share button copies the canonical deep link', async ({ page, baseURL }) => {
    await page.goto(`/units/detail?id=${encodeURIComponent(SAMPLE.unit.id)}`);
    await expect(page.getByRole('heading', { name: SAMPLE.unit.name, exact: true })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Share link' }).click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toBe(`${baseURL}/units/detail/?id=${encodeURIComponent(SAMPLE.unit.id)}`);
  });

  test('shows stats, skills and a back link for a valid unit', { tag: '@smoke' }, async ({ page }) => {
    await page.goto(`/units/detail?id=${encodeURIComponent(SAMPLE.unit.id)}`);
    await expect(page.getByRole('heading', { name: SAMPLE.unit.name, exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveTitle(`${SAMPLE.unit.name} — Last Origin | LOMapR`);
    await expect(page.getByRole('heading', { name: 'Stats', exact: true })).toBeVisible();
    // back button (a link-styled button) returns to the unit grid
    await page.getByRole('link', { name: 'Units', exact: true }).first().click();
    await expect(page).toHaveURL(/\/units\/$/);
  });

  test('unknown id shows the not-found fallback', async ({ page }) => {
    await page.goto('/units/detail?id=Char_No_Such_Unit');
    await expect(page.getByText('Unit not found.')).toBeVisible({ timeout: 15_000 });
    await page.getByRole('link', { name: 'Back to units' }).click();
    await expect(page).toHaveURL(/\/units\/$/);
  });

  test('shows faction squads and lore groups with member links', async ({ page }) => {
    await page.goto(`/units/detail?id=${encodeURIComponent(SAMPLE.unit.id)}`);
    await expect(page.getByRole('heading', { name: SAMPLE.unit.name, exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Faction', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Battle Maid Project', exact: true, level: 2 })).toBeVisible();
    await expect(page.getByText('5/5', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Lore Groups', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Squad 21', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'View Invincible Dragon', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'View Vanilla A1', exact: true }).click();
    await expect(page).toHaveURL(/\/units\/detail\/\?id=Char_3P_Vanilla_N/);
  });

  test('links NPC Lemonades from the Secretary Lemonades lore group', async ({ page }) => {
    await page.goto('/units/detail?id=Char_PECS_LemonadeAlpha_N');
    await expect(page.getByRole('heading', { name: 'Secretary Lemonades', exact: true })).toBeVisible({ timeout: 15_000 });
    const zeta = page.getByRole('link', { name: 'View Lemonade Zeta (Humanoid)', exact: true });
    await expect(zeta).toBeVisible();
    await zeta.click();
    await expect(page).toHaveURL(/\/npcs\/\?id=lemonade-zeta-humanoid/);
  });

  test('?tab= deep link opens that section and tabs update the URL', async ({ page }) => {
    await page.goto(`/units/detail?id=${encodeURIComponent(SAMPLE.unit.id)}&tab=skills`);
    await expect(page.getByRole('tab', { name: 'Skills', exact: true })).toHaveAttribute('aria-selected', 'true', { timeout: 15_000 });

    await page.getByRole('tab', { name: 'Profile', exact: true }).click();
    await expect(page).toHaveURL(/tab=profile/);
    await expect(page.getByRole('tab', { name: 'Profile', exact: true })).toHaveAttribute('aria-selected', 'true');
  });

  for (const tab of ['Drop Location', 'Promotion', 'Limit Break', 'Skin', 'Voice']) {
    test(`${tab} tab renders without a page error`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));
      await page.goto(`/units/detail?id=${encodeURIComponent(SAMPLE.unit.id)}`);
      const control = page.getByRole('tab', { name: tab, exact: true });
      await expect(control).toBeVisible({ timeout: 15_000 });
      await control.click();
      await expect(control).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByRole('tabpanel')).not.toBeEmpty();
      expect(errors).toEqual([]);
    });
  }
});
