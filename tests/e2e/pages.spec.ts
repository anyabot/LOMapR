import { test, expect, Page } from '@playwright/test';

// Smoke tests: every page renders its title and (where static) its main heading.
// Data-driven pages render their heading only after the local-data fetch, so a
// visible heading also proves the data pipeline (public/local-data) is serving.
//
// Detail pages are visited without query params and must show their no-selection
// fallback rather than crash; deeper per-page functionality gets its own spec later.

type PageCase = {
  path: string;
  title: string | RegExp;   // expected document title
  heading?: string;         // main on-page heading (exact match), if stable
  text?: string;            // fallback: any stable visible text
};

const CASES: PageCase[] = [
  { path: '/',             title: /LOMapR/,                 heading: 'LOMapR' },
  { path: '/units',        title: 'Units',                  heading: 'Units' },
  { path: '/npcs',         title: 'NPC Viewer - LOMapR',    heading: 'NPC Viewer' },
  { path: '/equipment',    title: 'Equipment',              heading: 'Equipment' },
  { path: '/enemies',      title: 'Enemy List',             heading: 'Enemies' },
  { path: '/skins',        title: 'Skins',                  heading: 'Skins' },
  { path: '/gacha',        title: /Gacha Simulator/,        heading: 'Gacha Simulator' },
  { path: '/team',         title: /Team Builder/,           heading: 'Team Builder' },
  { path: '/misc',         title: 'Misc Categorization',    heading: 'Misc Categorization' },
  { path: '/sanctum',      title: 'Sanctum of Alteration' },
  { path: '/world',        title: 'World List' },
  { path: '/iw',           title: 'Infinite War' },
  // detail pages without params fall back to their list/empty state
  { path: '/units/detail', title: /./,                      text: 'Unit not found.' },
  { path: '/world/detail', title: 'Zone List' },
  { path: '/world/stage',  title: 'Stage List' },
  { path: '/iw/detail',    title: 'Infinite War' },
];

// Fail the test on an uncaught page error (React render crash, etc.).
function failOnPageError(page: Page) {
  const errors: Error[] = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

for (const c of CASES) {
  test(`page ${c.path} renders`, async ({ page }) => {
    const errors = failOnPageError(page);

    // a 404 on global data or any 5xx means content is silently missing —
    // fail loudly instead. (kr/ misses are legitimate: KR→global fallback.)
    const badResponses: string[] = [];
    page.on('response', (r) => {
      const failed = r.status() >= 500
        || (r.status() >= 400 && r.url().includes('/local-data/global/'));
      if (failed) badResponses.push(`${r.status()} ${r.url()}`);
    });

    const response = await page.goto(c.path);
    expect(response?.status()).toBeLessThan(400);

    await expect(page).toHaveTitle(c.title);
    if (c.heading) {
      await expect(
        page.getByRole('heading', { name: c.heading, exact: true }).first(),
      ).toBeVisible({ timeout: 15_000 });
    }
    if (c.text) {
      await expect(page.getByText(c.text).first()).toBeVisible({ timeout: 15_000 });
    }

    // mobile-first rule: the page body must never scroll horizontally — wide
    // content belongs in its own overflowX="auto" wrapper. Runs on both the
    // desktop and the mobile (Pixel 5) project.
    const overflow = await page.evaluate(() => {
      const el = document.documentElement;
      return el.scrollWidth - el.clientWidth;
    });
    expect(overflow, 'page body scrolls horizontally').toBeLessThanOrEqual(1);

    expect(errors, errors.map((e) => e.message).join('\n')).toHaveLength(0);
    expect(badResponses, badResponses.join('\n')).toHaveLength(0);
  });
}

test('Etc navigation groups secondary tools', async ({ page }) => {
  await page.goto('/');
  const mobileToggle = page.getByRole('button', { name: 'Toggle menu' });
  if (await mobileToggle.isVisible()) await mobileToggle.click();

  await page.getByRole('button', { name: 'Etc' }).click();
  await expect(page.getByRole('menuitem', { name: 'NPC Viewer', exact: true })).toHaveAttribute('href', '/npcs');
  await expect(page.getByRole('menuitem', { name: 'Gacha Simulator', exact: true })).toHaveAttribute('href', '/gacha');
  await expect(page.getByRole('menuitem', { name: 'Team Builder', exact: true })).toHaveAttribute('href', '/team');
  await expect(page.getByRole('menuitem', { name: 'Misc Categories', exact: true })).toHaveAttribute('href', '/misc');
});
