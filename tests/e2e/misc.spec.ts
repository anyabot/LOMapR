import { test, expect } from './test';

test.describe('/misc', () => {
  test('all three categorization tabs render content', async ({ page }) => {
    await page.goto('/misc');
    await expect(page.getByRole('heading', { name: 'Misc Categorization' })).toBeVisible({ timeout: 15_000 });

    for (const name of ['Buff Lookup', 'AoE Skills', 'Damage Types']) {
      const tab = page.getByRole('tab', { name });
      await expect(tab).toBeVisible({ timeout: 15_000 });
      await tab.click();
      await expect(tab).toHaveAttribute('aria-selected', 'true');
      // the active panel must render something (isLazy mounts on demand)
      const panel = page.getByRole('tabpanel');
      await expect(panel).not.toBeEmpty();
    }
  });

  test('selecting an effect lists its units and filtering narrows them', async ({ page }) => {
    await page.goto('/misc');
    await expect(page.getByPlaceholder('Filter effects')).toBeVisible({ timeout: 15_000 });

    await page.getByRole('tabpanel').getByRole('button').filter({ hasText: /\d/ }).first().click();
    await expect(page.getByPlaceholder('Filter units')).toBeVisible();
    const rows = page.locator('[data-label="Unit"]');
    await expect(rows.first()).toBeVisible({ timeout: 15_000 });

    const before = await rows.count();
    await page.getByPlaceholder('Filter units').fill('zzzz-no-such-unit');
    await expect.poll(() => rows.count()).toBeLessThan(before);
  });
});
