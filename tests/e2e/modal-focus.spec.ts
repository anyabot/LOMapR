import { test, expect } from '@playwright/test';

// A modal must open with focus on the dialog, never on a control: a focused Share link
// button shows a focus ring and pops its tooltip on every open.
const CASES = [
  { name: 'enemy', url: '/enemies?enemy=NightChick_N' },
  { name: 'equipment', url: '/equipment?equip=Equip_Chip_Atk' },
] as const;

test.describe('modal initial focus', () => {
  for (const { name, url } of CASES) {
    test(`${name} modal opens with no control focused`, async ({ page }) => {
      await page.goto(url);
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: 20_000 });
      const share = dialog.getByRole('button', { name: /Share link/i });
      await expect(share).toBeVisible({ timeout: 20_000 });

      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tag: el?.tagName ?? '',
          inDialog: !!el?.closest('.chakra-modal__content-container, .chakra-modal__content'),
        };
      });
      expect(focused.tag).not.toBe('BUTTON');
      expect(focused.inDialog).toBe(true);

      await expect(share).not.toBeFocused();
      await expect(share).toHaveCSS('box-shadow', 'none');
      // the tooltip opens on hover/focus, so it must not be showing
      await expect(page.getByText('Copy link', { exact: true })).toHaveCount(0);
    });

    test(`${name} modal stays keyboard operable`, async ({ page }) => {
      await page.goto(url);
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByRole('dialog').getByRole('button', { name: /Share link/i }))
        .toBeVisible({ timeout: 20_000 });

      // focus starts on the dialog, so Tab must reach the controls inside it
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('BUTTON');

      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10_000 });
    });
  }
});
