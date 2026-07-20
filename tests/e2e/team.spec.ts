import { test, expect, Page } from '@playwright/test';
import { SAMPLE } from './fixtures';

// Five distinct global units for filling a squad (canonNames from unit.json).
const FIVE_UNITS = [
  'Constantia S2',
  'P/A-00 Griffon',
  'Prester Johanna',
  'SD3M Pupp Head',
  'Amy the Razor',
];

// Open the picker on the first empty tile and pick the named unit.
async function addUnit(page: Page, name: string) {
  await page.getByRole('button', { name: 'Add unit' }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByPlaceholder('Search name…').fill(name);
  await dialog.getByText(name, { exact: true }).first().click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: `Configure ${name}` })).toBeVisible();
}

test.describe('/team', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test.beforeEach(async ({ page }) => {
    await page.goto('/team');
    await expect(page.getByRole('heading', { name: 'Team Builder' })).toBeVisible({ timeout: 15_000 });
    // the formation tiles need the unit list before the picker works
    await expect(page.getByRole('button', { name: 'Add unit' }).first()).toBeVisible({ timeout: 15_000 });
  });

  test('adding a unit via the picker fills a formation tile', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Copy team code' })).toBeDisabled();
    await addUnit(page, SAMPLE.unit.name);
    await expect(page.getByRole('button', { name: 'Copy team code' })).toBeEnabled();

    await page.getByRole('button', { name: 'Clear team' }).click();
    await expect(page.getByRole('button', { name: `Configure ${SAMPLE.unit.name}` })).toBeHidden();
  });

  test('a squad fields at most five units', async ({ page }) => {
    for (const name of FIVE_UNITS) await addUnit(page, name);
    // the sixth tile refuses with a toast instead of opening the picker
    await page.getByRole('button', { name: 'Add unit' }).first().click();
    await expect(page.getByText('A squad fields at most 5 units.')).toBeVisible();
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('a unit already on the team is not offered again', async ({ page }) => {
    await addUnit(page, SAMPLE.unit.name);
    await page.getByRole('button', { name: 'Add unit' }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder('Search name…').fill(SAMPLE.unit.name);
    await expect(dialog.getByText('No units match.')).toBeVisible();
  });

  test('team code round-trips through copy, clear and load', async ({ page }) => {
    await addUnit(page, SAMPLE.unit.name);

    await page.getByRole('button', { name: 'Copy team code' }).click();
    const code = await page.evaluate(() => navigator.clipboard.readText());
    expect(code.length).toBeGreaterThan(0);

    await page.getByRole('button', { name: 'Clear team' }).click();
    await expect(page.getByRole('button', { name: `Configure ${SAMPLE.unit.name}` })).toBeHidden();

    await page.getByPlaceholder('Paste a team code…').fill(code);
    await page.getByRole('button', { name: 'Load', exact: true }).click();
    // a loaded code lands in its own new slot with the team restored
    await expect(page.getByRole('button', { name: `Configure ${SAMPLE.unit.name}` })).toBeVisible();
    await expect(page.getByRole('button', { name: '2', exact: true })).toBeVisible();
  });

  test('the team survives a page reload', async ({ page }) => {
    await addUnit(page, SAMPLE.unit.name);
    await page.reload();
    await expect(page.getByRole('button', { name: `Configure ${SAMPLE.unit.name}` })).toBeVisible({ timeout: 15_000 });
  });

  test('export image downloads a PNG of the team', async ({ page }) => {
    await addUnit(page, SAMPLE.unit.name);
    const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
    await page.getByRole('button', { name: 'Export image' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.png$/);
  });

  test('simulate tab is reachable', async ({ page }) => {
    const tab = page.getByRole('tab', { name: 'Simulate (Round 1)' });
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
  });

  test('team slot bar allows adding a new slot', async ({ page }) => {
    await page.getByRole('button', { name: '+ New' }).click();
    await expect(page.getByRole('button', { name: '2', exact: true })).toBeVisible();
  });
});
