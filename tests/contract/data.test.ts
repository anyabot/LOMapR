import { describe, it, expect, beforeAll } from 'vitest';
import type { z } from 'zod';
import * as S from './schemas';
import { load, missing, sourceLabel, type Region } from './source';
import { SAMPLE } from '../e2e/fixtures';

const SAMPLE_SIZE = 15;
const EMPTY_SLOT = '0';

function check<T extends z.ZodType>(schema: T, value: unknown, label: string): z.infer<T> {
  expect(value, `${label} is missing`).toBeDefined();
  const r = schema.safeParse(value);
  if (!r.success) {
    const issues = r.error.issues.slice(0, 5).map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`${label} (${sourceLabel}) does not match its schema:\n${issues}`);
  }
  return r.data;
}

const sample = (ids: string[], fixed: string[]) =>
  Array.from(new Set([...fixed.filter((id) => ids.includes(id)), ...ids.slice(0, SAMPLE_SIZE)]));

describe.each<Region>(['global', 'kr'])('%s data', (region) => {
  let units: z.infer<typeof S.unitList>;
  let enemies: z.infer<typeof S.enemyList>;
  let globalEnemies: z.infer<typeof S.enemyList>;
  let worlds: z.infer<typeof S.worldIndex>;
  let equips: z.infer<typeof S.equipList>;

  beforeAll(async () => {
    units = check(S.unitList, await load(region, 'split/units/unit_list.json'), 'unit_list');
    enemies = check(S.enemyList, await load(region, 'split/enemy_list.json'), 'enemy_list');
    globalEnemies = region === 'global' ? enemies : check(S.enemyList, await load('global', 'split/enemy_list.json'), 'global enemy_list');
    worlds = check(S.worldIndex, await load(region, 'world.json'), 'world.json');
    equips = check(S.equipList, await load(region, 'equip.json'), 'equip.json');
  });

  it('list files are non-empty', () => {
    expect(Object.keys(units).length).toBeGreaterThan(0);
    expect(Object.keys(enemies).length).toBeGreaterThan(0);
    expect(Object.keys(worlds).length).toBeGreaterThan(0);
    expect(Object.keys(equips).length).toBeGreaterThan(0);
  });

  it('every listed unit, equip and world has its split file', async () => {
    expect(await missing(region, Object.keys(units).map((id) => `split/units/${id}.json`))).toEqual([]);
    expect(await missing(region, Object.keys(equips).map((id) => `split/equip/${id}.json`))).toEqual([]);
    expect(await missing(region, Object.keys(worlds).map((id) => `split/world/${id}.json`))).toEqual([]);
  });

  it('every enemy skillsRef / aiRef resolves', async () => {
    const recs = Object.values(enemies);
    const skillRefs = Array.from(new Set(recs.flatMap((e) => (e.skillsRef ? [e.skillsRef] : []))));
    const aiRefs = Array.from(new Set(recs.flatMap((e) => (e.aiRef ? [e.aiRef] : []))));
    expect(await missing(region, skillRefs.map((r) => `split/skills/${r}.json`))).toEqual([]);
    expect(await missing(region, aiRefs.map((r) => `split/ai/${r}.json`))).toEqual([]);
  });

  it('sampled unit bundles match the schema', async () => {
    for (const id of sample(Object.keys(units), [SAMPLE.unit.id])) {
      const b = check(S.unitBundle, await load(region, `split/units/${id}.json`), `split/units/${id}.json`);
      for (const key of b.detail.skills) expect(b.skills, `${id} skill ${key}`).toHaveProperty([key]);
    }
  });

  it('sampled equip records match the schema', async () => {
    for (const id of sample(Object.keys(equips), [SAMPLE.equip.id]))
      check(S.equipFull, await load(region, `split/equip/${id}.json`), `split/equip/${id}.json`);
  });

  it('every world parses and its wave enemies exist', async () => {
    const unknown = new Set<string>();
    for (const id of Object.keys(worlds)) {
      const w = check(S.world, await load(region, `split/world/${id}.json`), `split/world/${id}.json`);
      for (const z of w.zones)
        for (const st of [...(z.stages ?? []), ...(z.subzones ?? []).flat()])
          for (const wave of st.waves ?? [])
            for (const e of wave.enemies)
              if (e && e.id !== EMPTY_SLOT && !enemies[e.id] && !globalEnemies[e.id]) unknown.add(`${id}/${st.id}: ${e.id}`);
    }
    expect(Array.from(unknown)).toEqual([]);
  });

  it('skin list matches the schema and points at listed units', async () => {
    const skins = check(S.skinList, await load(region, 'split/skins/skin_list.json'), 'skin_list');
    expect(skins.length).toBeGreaterThan(0);
    expect(Array.from(new Set(skins.filter((s) => !units[s.unitId]).map((s) => s.unitId)))).toEqual([]);
  });

  it('gacha pools match the schema', async () => {
    check(S.gacha, await load(region, 'split/gacha/gacha.json'), 'gacha.json');
  });

  it.each(['common', 'skill', 'buff', 'stage', 'item', 'shop', 'voice'])('strings.%s matches the schema', async (chunk) => {
    const table = check(S.strings, await load(region, `split/strings/strings.${chunk}.json`), `strings.${chunk}`);
    expect(Object.keys(table).length).toBeGreaterThan(0);
  });

  it('images.json maps keys to URLs', async () => {
    check(S.images, await load(region, 'images.json'), 'images.json');
  });
});
