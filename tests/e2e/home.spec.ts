import { test, expect } from './test';

test.describe('/', () => {
  test('section cards navigate to their pages', { tag: '@smoke' }, async ({ page }) => {
    await page.goto('/');
    // navbar brand and hero are both "LOMapR" headings — either proves the page rendered
    await expect(page.getByRole('heading', { name: 'LOMapR', exact: true }).first()).toBeVisible({ timeout: 15_000 });

    // quick-nav card (a heading inside a link card, distinct from the navbar links)
    await page.getByRole('heading', { name: 'Units', exact: true }).click();
    await expect(page).toHaveURL(/\/units\/$/);
    await expect(page.getByRole('heading', { name: 'Units', exact: true })).toBeVisible({ timeout: 15_000 });
  });

  test('related sites section lists external links', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Related Sites' })).toBeVisible({ timeout: 15_000 });
    const wiki = page.getByRole('link', { name: /English Last Origin Wiki/ });
    await expect(wiki).toBeVisible();
    await expect(wiki).toHaveAttribute('href', /lastorigin\.fandom\.com/);
  });

  test('the current event banner does not push the section cards down', async ({ page }) => {
    let release!: () => void;
    const loaded = new Promise<void>((resolve) => { release = resolve; });
    await page.route('**/global/world.json', async (route) => { await loaded; await route.continue(); });
    await page.goto('/');
    const card = page.getByRole('heading', { name: 'Units', level: 2 });
    await expect(card).toBeVisible();
    const before = (await card.boundingBox())!.y;
    release();
    const banner = page.getByText('Current Event', { exact: true });
    await banner.waitFor({ timeout: 15_000 }).catch(() => {});
    test.skip(!(await banner.isVisible()), 'no current event in the data');
    expect((await card.boundingBox())!.y).toBe(before);
  });
});
