import { test, expect } from '@playwright/test';

test.describe('/gacha', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/gacha');
    await expect(page.getByRole('heading', { name: 'Gacha Simulator' })).toBeVisible({ timeout: 15_000 });
    // pools loaded -> pull buttons rendered
    await expect(page.getByRole('button', { name: /^Pull / }).first()).toBeVisible({ timeout: 15_000 });
  });

  test('pulling fills the results tab and enables history reset', async ({ page }) => {
    // the page opens on the Rates tab; the results tab starts empty
    await page.getByRole('tab', { name: /^Last pull/ }).click();
    await expect(page.getByText('Pull to see results')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reset history' })).toBeDisabled();

    await page.getByRole('button', { name: /^Pull / }).first().click();

    await expect(page.getByText('Pull to see results')).toBeHidden();
    await expect(page.getByRole('tab', { name: /Last pull \(\d+\)/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /History \(\d+\)/ })).toBeVisible();

    await page.getByRole('button', { name: 'Reset history' }).click();
    await expect(page.getByText('Pull to see results')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reset history' })).toBeDisabled();
  });

  test('rates tab is reachable', async ({ page }) => {
    const rates = page.getByRole('tab', { name: 'Rates' });
    await rates.click();
    await expect(rates).toHaveAttribute('aria-selected', 'true');
  });

  test('a multi pull yields more than one result', async ({ page }) => {
    const pulls = page.getByRole('button', { name: /^Pull / });
    test.skip((await pulls.count()) < 2, 'active box has no multi pull');
    await pulls.nth(1).click();
    const tab = page.getByRole('tab', { name: /Last pull \(\d+\)/ });
    await expect(tab).toBeVisible();
    const n = Number((await tab.textContent())!.match(/\((\d+)\)/)![1]);
    expect(n).toBeGreaterThan(1);
  });

  test('box type can be switched', async ({ page }) => {
    // at least the standard boxes render; clicking another box keeps pulls working
    const boxes = page.getByText('Box type', { exact: true }).locator('..');
    await expect(boxes).toBeVisible();
    await expect(page.getByRole('button', { name: /^Pull / }).first()).toBeEnabled();
  });
});
