import { test, expect, Page } from '@playwright/test';

// Smoke tests: every page renders its title and, where static, its main heading; a
// data-driven heading also proves public/local-data is being served.

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

    // a global-data 404 or any 5xx means content is silently missing; kr/ misses are
    // legitimate (KR->global fallback)
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

    // mobile-first rule: wide content belongs in its own overflowX="auto" wrapper
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
