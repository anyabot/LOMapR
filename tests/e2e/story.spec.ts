import { test, expect } from './test';
import { SAMPLE } from './fixtures';

const W = SAMPLE.world;
const SQUAD = { key: 'Story_Troop_Group_Squad_BettleMaid', name: 'Battle Maid Project' };
const zoneUrl = `/story?world=${W.id}&zone=1`;

test.describe('/story', () => {
  test('main story tile opens the chapter reader', async ({ page }) => {
    await page.goto('/story');
    await page.getByRole('link', { name: new RegExp(W.zone1Title) }).first().click();
    await expect(page).toHaveURL(new RegExp(`/story/\\?world=${W.id}&zone=1`));
    await expect(page.getByRole('heading', { name: W.zone1Title, exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Story', exact: true })).toBeVisible();
  });

  test('expanding a stage loads its text', async ({ page }) => {
    await page.goto(zoneUrl);
    const stage = page.getByRole('button', { name: /\b1-1\b/ });
    await expect(stage).toBeVisible({ timeout: 15_000 });
    await expect(stage).toHaveAttribute('aria-expanded', 'false');
    await stage.click();
    await expect(stage).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('region')).toContainText('Before battle', { ignoreCase: true, timeout: 15_000 });
  });

  test('chapter buttons step between zones', async ({ page }) => {
    await page.goto(zoneUrl);
    await expect(page.getByRole('link', { name: 'Next chapter' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('link', { name: 'Previous chapter' })).toBeHidden();
    await page.getByRole('link', { name: 'Next chapter' }).click();
    await expect(page).toHaveURL(new RegExp(`world=${W.id}&zone=2`));
    await expect(page.getByRole('link', { name: 'Previous chapter' })).toBeVisible({ timeout: 15_000 });
  });

  test('text language choice survives a reload', async ({ page }) => {
    await page.goto('/story');
    const ko = page.getByRole('group', { name: 'Text language' }).getByRole('button', { name: 'KO', exact: true });
    await ko.click();
    await expect(ko).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await expect(ko).toHaveAttribute('aria-pressed', 'true', { timeout: 15_000 });
  });

  test('squad deep link opens character stories', async ({ page }) => {
    await page.goto(`/story?squad=${SQUAD.key}`);
    await expect(page.getByRole('heading', { name: SQUAD.name, exact: true })).toBeVisible({ timeout: 15_000 });
  });

  test('unknown world falls back to the story list', async ({ page }) => {
    await page.goto('/story?world=NoSuchWorld');
    await expect(page.getByRole('heading', { name: 'Story', exact: true, level: 1 })).toBeVisible({ timeout: 15_000 });
  });
});
