import { test, expect } from '@playwright/test';

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
});
