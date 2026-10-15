// Browser-side data layer. Shaping applied here: KR to global fallback, image merge
// and rewrite to bundled /public art, empty-array fill, and id-stamping from the key.
import { createJsonLoader } from '@altterisk/game-hub/data';
import PUBLIC_IMAGES from './publicImages.json';
import type { UnitVoice } from '@/interfaces/voice';
import type { CharStoryIndex, StoryIndex, StoryZoneText } from '@/interfaces/story';

// The key layout maps 1:1 to data/<key>, so local mode only swaps the base URL.
const LOCAL = process.env.NEXT_PUBLIC_DATA_SOURCE === 'local';
const R2 = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? '').replace(/\/$/, '');
const BASE = LOCAL ? '/local-data' : R2;

export type Region = 'global' | 'kr';

// A `kr/<file>` key falls back to `global/<file>`.
const loader = createJsonLoader({
  urls: (key) => {
    if (!BASE) return [];
    const kr = /^kr\/(.+)$/.exec(key);
    return kr ? [`${BASE}/${key}`, `${BASE}/global/${kr[1]}`] : [`${BASE}/${key}`];
  },
});

// Cached results are shared and may be frozen by the store, so shapers below write only on change.
function get(key: string): Promise<any | null> {
  return loader.load(key).catch(() => null);
}

function getWithFallback(region: Region, file: string): Promise<any | null> {
  return get(`${region}/${file}`);
}

// ── shapers ──────────────────────────────────────────────────────────────────
const arr = (v: any): any[] => (Array.isArray(v) ? v : []);
function ensureArr(obj: any, key: string) {
  if (!Array.isArray(obj[key])) obj[key] = [];
}

function shapeSanctum(data: any): any {
  if (!data || typeof data !== 'object') return data;
  for (const area of Object.keys(data))
    for (const floors of arr(data[area]))
      for (const f of arr(floors))
        if (f && typeof f === 'object') {
          ensureArr(f, 'prohibition');
          ensureArr(f, 'suitability');
          ensureArr(f, 'waves');
        }
  return data;
}

function shapeWorld(data: any): any {
  if (!data || typeof data !== 'object') return data;
  const fixStage = (s: any) => { if (s && typeof s === 'object') ensureArr(s, 'waves'); };
  for (const id of Object.keys(data)) {
    const w = data[id];
    if (!w || typeof w !== 'object') continue;
    for (const z of arr(w.zones)) {
      if (!z || typeof z !== 'object') continue;
      ensureArr(z, 'stages');
      z.stages.forEach(fixStage);
      if (Array.isArray(z.subzones)) z.subzones.forEach((sz: any) => arr(sz).forEach(fixStage));
    }
  }
  return data;
}

function shapeEnemy(data: any): any {
  if (!data || typeof data !== 'object') return data;
  for (const id of Object.keys(data)) {
    const e = data[id];
    if (e && typeof e === 'object') ensureArr(e, 'skills');
  }
  return data;
}

// Copy each top-level key onto record.id (the old routes did temp[k].id = k).
function stampId<T extends Record<string, any>>(data: T | null): T {
  if (!data || typeof data !== 'object') return (data ?? {}) as T;
  for (const k of Object.keys(data)) if (data[k] && typeof data[k] === 'object' && data[k].id !== k) data[k].id = k;
  return data;
}

// ── images: prefer bundled /public art ───────────────────────────────────────
const PUBLIC_SET = new Set(PUBLIC_IMAGES as string[]);

function preferPublicImages(map: { [key: string]: string }): { [key: string]: string } {
  const out: { [key: string]: string } = {};
  for (const [key, value] of Object.entries(map)) {
    out[key] = value;
    if (typeof value !== 'string') continue;
    let rel: string | null = null;
    if (value.startsWith('/images/')) rel = value.slice(1);
    else if (value.startsWith('http')) {
      const m = /\/o\/([^?]+)/.exec(value);
      if (m) rel = decodeURIComponent(m[1]);
    }
    if (rel && PUBLIC_SET.has(rel)) out[key] = '/' + rel.replace(/\\/g, '/');
  }
  return out;
}

// ── public API (mirrors the old /api/* routes) ───────────────────────────────

// Light world container: per-world metadata + zone titles/imgs, no stages.
export async function fetchWorld(region: Region) {
  return stampId(shapeWorld(await getWithFallback(region, 'world.json')));
}

// One world's full record, fetched lazily when a stage page opens that world.
export async function fetchWorldStage(id: string, region: Region) {
  const data = await getWithFallback(region, `split/world/${id}.json`);
  if (!data) return null;
  const shaped = shapeWorld({ [id]: data });   // reuse the stage-array shaper
  return { ...shaped[id], id };
}

export async function fetchSkills(region: Region) {
  return stampId(await getWithFallback(region, 'skill.json'));
}

export async function fetchSanctum(region: Region) {
  return stampId(shapeSanctum(await getWithFallback(region, 'sanctum.json')));
}

export async function fetchIW(region: Region) {
  return stampId(await getWithFallback(region, 'iw.json'));
}

export async function fetchStrings(region: Region) {
  return getWithFallback(region, 'strings.json');
}

export type StringChunk = 'common' | 'skill' | 'buff' | 'stage' | 'item' | 'shop' | 'voice';

export async function fetchStringChunk(region: Region, chunk: StringChunk) {
  return getWithFallback(region, `split/strings/strings.${chunk}.json`);
}

export async function fetchUnitVoice(region: Region, unitId: string): Promise<UnitVoice | null> {
  return getWithFallback(region, `split/voice/${unitId}.json`);
}

export async function fetchStoryIndex(region: Region): Promise<StoryIndex | null> {
  return getWithFallback(region, 'split/story/index.json');
}

export async function fetchStoryZone(region: Region, world: string, zone: number): Promise<StoryZoneText | null> {
  return getWithFallback(region, `split/story/${world}/${zone}.json`);
}

export async function fetchCharStories(region: Region): Promise<CharStoryIndex | null> {
  return getWithFallback(region, 'split/story/chars.json');
}

export async function fetchCharStoryText(region: Region, group: string): Promise<StoryZoneText | null> {
  return getWithFallback(region, `split/story/char/${group}.json`);
}

// Item / unit lookup (id -> {name, icon, grade, kind}) for reward & drop display.
export async function fetchItems(region: Region) {
  return getWithFallback(region, 'item.json');
}

export async function fetchCommunity() {
  return get('community_translation.json');
}

export async function fetchMtl() {
  return get('mtl_translation.json');
}

export async function fetchKrMtl() {
  return get('kr_mtl_translation.json');
}

// Images: merge region over global, then prefer bundled /public art.
export async function fetchImages(region: Region) {
  const local = await getWithFallback(region, 'images.json');
  const global = region === 'global' ? null : await get('global/images.json');
  let merged: any = global && local ? { ...global, ...local } : (local ?? global);
  if (!merged) return {};
  return preferPublicImages(merged);
}

// Full enemy list (records carry all fields). split/enemy_list.json.
export async function fetchEnemyList(region: Region) {
  const data = await getWithFallback(region, 'split/enemy_list.json');
  return data ? stampId(shapeEnemy(data)) : {};
}

// A single enemy's full record, pulled from the list.
export async function fetchEnemy(id: string, region: Region) {
  const regions: Region[] = region === 'global' ? ['global'] : [region, 'global'];
  for (const r of regions) {
    const all = await get(`${r}/split/enemy_list.json`);
    if (all?.[id]) return { ...all[id], id };
  }
  return null;
}

// Split skill/AI bundles are content-deduplicated at build time and named after the
// owning enemy id, so callers pass skillsRef/aiRef when the record carries one.
export async function fetchSplitSkills(ref: string | undefined, region: Region) {
  return ref ? getWithFallback(region, `split/skills/${ref}.json`) : null;
}

export async function fetchSplitAI(ref: string | undefined, region: Region) {
  return ref ? getWithFallback(region, `split/ai/${ref}.json`) : null;
}

// ── units (playable characters) ───────────────────────────────────────────────

// Light unit list for the grid and hover card; heavy fields ride in the per-unit bundle.
export async function fetchUnitList(region: Region) {
  const data = await getWithFallback(region, 'split/units/unit_list.json');
  return data ? stampId(data) : {};
}

// `skills` holds BOTH forms (base + skillsCh); `detail` carries the heavy fields.
export async function fetchUnitBundle(id: string | undefined, region: Region) {
  return id ? getWithFallback(region, `split/units/${id}.json`) : null;
}

// One entry per purchasable skin, with unit context + gallery/filter fields.
export async function fetchSkinList(region: Region) {
  return ((await getWithFallback(region, 'split/skins/skin_list.json')) ?? []) as SkinEntry[];
}

export interface SkinEntry {
  unitId: string;
  unitName: string;        // loc id
  unitEngName: string;
  unitIcon: string;
  key: string;
  name: string;            // loc id — SkinPackName_* (from CharSkin table)
  itemName: string;        // loc id — SkinName_* (individual item name)
  packName: string;        // loc id — SkinPackName_* (shop package name)
  desc: string;            // loc id — SkinDesc_*
  category: string[];      // resolved category names (e.g. 'Premium', 'Maid')
  parts: string[];         // SKIN_IN_PARTS_TYPE names
  price: number | null;
  sensitive: boolean;
  reqGrade: number;
  model: string;
  modelDam: string;
  faceKey: string;
  faceDamKey: string;
  bgUse: boolean;
  bgDamUse: boolean;
  viewerKind?: 'fixed' | 'spine' | 'skinned';
  modelDiverged?: boolean;
  modelDamDiverged?: boolean;
}

// ── gacha simulator ───────────────────────────────────────────────────────────

export type GachaEntry =
  | {
      kind: 'skin';
      id: string;
      key: string;
      rate: number;
      unitId: string;
      unitEngName: string;
      unitIcon: string;
      nameId: string;      // raw loc ID — resolve via tAny at runtime
      packNameId: string;
      itemNameId: string;
      category: string[];
      price?: number;
    }
  | {
      kind: 'item';
      id: string;
      key: string;
      rate: number;
      qty: number;
      icon: string;
      grade: number;
      name: { en: string; ko: string };  // pre-resolved at build time
    };

export interface GachaPools {
  skin_1x:       GachaEntry[];
  skin_11x:      GachaEntry[];
  n_1x:          GachaEntry[];
  n_11x:         GachaEntry[];
  n_event_11x:   GachaEntry[];
  praemium_1x:   GachaEntry[];
  praemium_11x:  GachaEntry[];
  quest_1x:      GachaEntry[];
  quest_10x:     GachaEntry[];
}

export async function fetchGachaPools(region: Region): Promise<GachaPools | null> {
  return getWithFallback(region, 'split/gacha/gacha.json');
}

// ── misc categorization (/misc page) ──────────────────────────────────────────

// Light index: buff-type counts + AoE + damage-type lists. misc.json.
export async function fetchMisc(region: Region) {
  return getWithFallback(region, 'misc.json');
}

// All (unit, skill, buff) entries for ONE buff-type ordinal.
export async function fetchMiscBuff(type: number, region: Region) {
  return getWithFallback(region, `split/misc/buff_${type}.json`);
}

// ── equipment ─────────────────────────────────────────────────────────────────

// Light equip LIST (per-family meta). split/equip/<id>.json holds the full data.
export async function fetchEquipList(region: Region) {
  return stampId(await getWithFallback(region, 'equip.json'));
}

// One equip family's FULL record (all ranks × levels), loaded when its modal opens.
export async function fetchEquip(id: string, region: Region) {
  const data = await getWithFallback(region, `split/equip/${id}.json`);
  return data ? { ...data, id } : null;
}
