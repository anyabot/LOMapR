import { test, expect, Page } from './test';
import { SAMPLE } from './fixtures';

const KR_ONLY_UNIT = 'Char_BR_MariaGrace_N';
const unitPath = `/units/${encodeURIComponent(SAMPLE.unit.id)}/`;

const canonicalOf = async (page: Page) => {
  const link = page.locator('link[rel="canonical"]');
  await expect(link).toHaveCount(1, { timeout: 15_000 });
  return new URL((await link.getAttribute('href'))!);
};

test.describe('SEO', () => {
  const H1_ROUTES = [
    '/', '/units', '/npcs', '/equipment', '/enemies', '/skins', '/gacha', '/team', '/misc',
    '/sanctum', '/world', '/story', '/iw', '/exchange', unitPath,
    `/world/${SAMPLE.world.id}/`, `/world/${SAMPLE.world.id}/1/`,
    `/iw/${SAMPLE.iw.seasonKey}/`,
  ];
  for (const route of H1_ROUTES) {
    test(`${route} has exactly one h1`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator('h1').first()).toBeAttached({ timeout: 15_000 });
      await expect(page.locator('h1')).toHaveCount(1);
    });
  }

  test('unit canonical is the path page without UI state', async ({ page }) => {
    await page.goto(`${unitPath}?tab=skills`);
    await expect(page.getByRole('heading', { name: SAMPLE.unit.name, exact: true })).toBeVisible({ timeout: 15_000 });
    const url = await canonicalOf(page);
    expect(url.pathname).toBe(unitPath);
    expect(url.search).toBe('');
  });

  test('KR-only unit canonical is its bare path page', async ({ page }) => {
    await page.goto(`/units/${KR_ONLY_UNIT}/?server=kr`);
    await expect(page.getByRole('heading', { name: 'Maria Grace', exact: true })).toBeVisible({ timeout: 15_000 });
    const url = await canonicalOf(page);
    expect(url.pathname).toBe(`/units/${KR_ONLY_UNIT}/`);
    expect(url.search).toBe('');
  });

  test('legacy query link moves to the path page and keeps UI state', async ({ page }) => {
    await page.goto(`/units/detail?id=${encodeURIComponent(SAMPLE.unit.id)}&tab=skills`);
    await expect(page).toHaveURL(`${unitPath}?tab=skills`, { timeout: 15_000 });
    await expect(page.getByRole('tab', { name: 'Skills', exact: true })).toHaveAttribute('aria-selected', 'true', { timeout: 15_000 });
  });

  test('entity pages carry their own title and canonical before any script runs', async ({ request }) => {
    const cases: [string, string][] = [
      [unitPath, `<title[^>]*>${SAMPLE.unit.name} — `],
      [`/world/${SAMPLE.world.id}/1/`, `<title[^>]*>${SAMPLE.world.zone1Title} — `],
      [`/iw/${SAMPLE.iw.seasonKey}/`, '<title[^>]*>[^<]* - Raid Boss — '],
    ];
    for (const [path, title] of cases) {
      const html = await (await request.get(path)).text();
      expect(html).toMatch(new RegExp(title));
      expect(html).toMatch(new RegExp(`<link rel="canonical" href="https://[^/"]+${path}"`));
    }
  });

  test('NPC selection canonicalizes to the bare page', async ({ page }) => {
    await page.goto('/npcs?id=lemonade-omega');
    await expect(page.getByRole('heading', { name: 'Lemonade Omega', exact: true })).toBeVisible({ timeout: 15_000 });
    const url = await canonicalOf(page);
    expect(url.pathname.replace(/\/$/, '')).toBe('/npcs');
    expect(url.search).toBe('');
  });

  test('Infinite War rerun canonicalizes to its earliest identical season', async ({ page }) => {
    await page.goto('/iw/Colossus_02/');
    await expect(page).toHaveTitle(/Raid Boss/, { timeout: 15_000 });
    expect((await canonicalOf(page)).pathname).toBe('/iw/Colossus_01/');
  });

  test('unit page has its own description and no noindex', async ({ page }) => {
    await page.goto(unitPath);
    await expect(page.getByRole('heading', { name: SAMPLE.unit.name, exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', new RegExp(`^${SAMPLE.unit.name} is a`));
    await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0);
  });

  test('unit tiles are real links a crawler can follow', async ({ page }) => {
    await page.goto('/units');
    await expect(page.locator(`a[href="/units/${SAMPLE.unit.id}/"]`).first()).toBeAttached({ timeout: 15_000 });
  });

  test('skills and profile panels stay in the DOM on the Stats tab', async ({ page }) => {
    await page.goto(unitPath);
    await expect(page.getByRole('heading', { name: 'Stats', exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[role="tabpanel"] > div[hidden]')).toHaveCount(2);
  });

  const LOADED: [string, string][] = [
    ['/enemies', SAMPLE.enemy.name],
    [unitPath, 'Lore Groups'],
    [`/world/${SAMPLE.world.id}/`, SAMPLE.world.zone1Title],
  ];
  for (const [route, ready] of LOADED) {
    test(`${route} repeats no heading text`, async ({ page }) => {
      await page.goto(route);
      await expect(page.getByText(ready, { exact: true }).first()).toBeVisible({ timeout: 15_000 });
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
      const seen = new Set<string>();
      const repeated = headings.map((h) => h.trim()).filter((h) => h && (seen.has(h) || !seen.add(h)));
      expect(repeated).toEqual([]);
    });
  }
});
