import { test, expect } from '@playwright/test';
import { SAMPLE } from './fixtures';

test.describe('/units', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/units');
    await expect(page.getByRole('heading', { name: 'Units', exact: true })).toBeVisible({ timeout: 15_000 });
  });

  test('search narrows the grid to matching units', async ({ page }) => {
    await page.getByPlaceholder('Search name or code').fill(SAMPLE.unit.name);
    await expect(page.getByText(SAMPLE.unit.name, { exact: true }).first()).toBeVisible();
    // a nonsense query empties the grid
    await page.getByPlaceholder('Search name or code').fill('zzz-no-such-unit');
    await expect(page.getByText('No units match the current filters.')).toBeVisible();
    // the clear button restores the full grid
    await page.getByRole('button', { name: 'Clear' }).click();
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
    // filter buttons cycle off -> include -> exclude; the exclude state must
    // drop ONLY that section while the others stay.
    await page.getByRole('button', { name: 'Heavy', exact: true }).click();
    await page.getByRole('button', { name: 'Heavy', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Heavy', exact: true })).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Light', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Air', exact: true })).toBeVisible();
    // third click returns to off: all sections back
    await page.getByRole('button', { name: 'Heavy', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Heavy', exact: true })).toBeVisible();
  });

  test('clicking a unit tile opens its detail page', async ({ page }) => {
    await page.getByPlaceholder('Search name or code').fill(SAMPLE.unit.name);
    await page.getByText(SAMPLE.unit.name, { exact: true }).first().click();
    await expect(page).toHaveURL(new RegExp(`/units/detail\\?id=${SAMPLE.unit.id}`));
    await expect(page.getByRole('heading', { name: SAMPLE.unit.name, exact: true })).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('/units/detail', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('share button copies the canonical deep link', async ({ page }) => {
    await page.goto(`/units/detail?id=${encodeURIComponent(SAMPLE.unit.id)}`);
    await expect(page.getByRole('heading', { name: SAMPLE.unit.name, exact: true })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Share link' }).click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toBe(`http://localhost:3000/units/detail?id=${encodeURIComponent(SAMPLE.unit.id)}`);
  });

  test('shows stats, skills and a back link for a valid unit', async ({ page }) => {
    await page.goto(`/units/detail?id=${encodeURIComponent(SAMPLE.unit.id)}`);
    await expect(page.getByRole('heading', { name: SAMPLE.unit.name, exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveTitle(`${SAMPLE.unit.name} — Unit`);
    await expect(page.getByRole('heading', { name: 'Stats', exact: true })).toBeVisible();
    // back button (a link-styled button) returns to the unit grid
    await page.getByRole('link', { name: 'Units', exact: true }).first().click();
    await expect(page).toHaveURL(/\/units$/);
  });

  test('unknown id shows the not-found fallback', async ({ page }) => {
    await page.goto('/units/detail?id=Char_No_Such_Unit');
    await expect(page.getByText('Unit not found.')).toBeVisible({ timeout: 15_000 });
    await page.getByRole('link', { name: 'Back to units' }).click();
    await expect(page).toHaveURL(/\/units$/);
  });
});
