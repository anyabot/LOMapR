// Client-side data layer: the browser fetches JSON straight from Cloudflare R2's
// public URL (edge-cached, free egress), so reads never invoke a Pages Function.
//
// This ports the shaping the old /api/* routes did:
//   • KR → global fallback (a region file falls back to global when absent)
//   • Images: MERGE region over global, then rewrite to bundled /public art
//   • array-shaping: fill empty arrays Firebase/generation may have dropped
//   • id-stamping: copy each record's key onto record.id
//
// Public env var (exposed to the browser): NEXT_PUBLIC_R2_PUBLIC_URL.

import PUBLIC_IMAGES from './publicImages.json';

// Data source base URL. Default: R2 public URL (production + "bucket" dev mode).
// When NEXT_PUBLIC_DATA_SOURCE=local, read on-disk data/ files served statically
// from /public/local-data (populated by `npm run dev:local`, which copies data/
// there). The R2 key layout maps 1:1 to data/<key>, so the same keys work
// against either base — local mode just swaps the base URL, no other changes.
const LOCAL = process.env.NEXT_PUBLIC_DATA_SOURCE === 'local';
const R2 = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? '').replace(/\/$/, '');
const BASE = LOCAL ? '/local-data' : R2;

export type Region = 'global' | 'kr';

// Fetch one JSON key from the active source. Returns null on any miss/error.
async function get(key: string): Promise<any | null> {
  if (!BASE) return null;
  try {
    const res = await fetch(`${BASE}/${key}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Fetch `<region>/<file>`, falling back to `global/<file>` for non-global regions.
async function getWithFallback(region: Region, file: string): Promise<any | null> {
  const data = await get(`${region}/${file}`);
  if (data != null || region === 'global') return data;
  return get(`global/${file}`);
}

// ── shapers ──────────────────────────────────────────────────────────────────
const arr = (v: any): any[] => (Array.isArray(v) ? v : []);

function shapeSanctum(data: any): any {
  if (!data || typeof data !== 'object') return data;
  for (const area of Object.keys(data))
    for (const floors of arr(data[area]))
      for (const f of arr(floors))
        if (f && typeof f === 'object') {
          f.prohibition = arr(f.prohibition);
          f.suitability = arr(f.suitability);
          f.waves = arr(f.waves);
        }
  return data;
}

function shapeWorld(data: any): any {
  if (!data || typeof data !== 'object') return data;
  const fixStage = (s: any) => { if (s && typeof s === 'object') s.waves = arr(s.waves); };
  for (const id of Object.keys(data)) {
    const w = data[id];
    if (!w || typeof w !== 'object') continue;
    for (const z of arr(w.zones)) {
      if (!z || typeof z !== 'object') continue;
      z.stages = arr(z.stages);
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
    if (e && typeof e === 'object') e.skills = arr(e.skills);
  }
  return data;
}

// Copy each top-level key onto record.id (the old routes did temp[k].id = k).
function stampId<T extends Record<string, any>>(data: T | null): T {
  if (!data || typeof data !== 'object') return (data ?? {}) as T;
  for (const k of Object.keys(data)) if (data[k] && typeof data[k] === 'object') data[k].id = k;
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

// World CONTAINER: per-world metadata + zone titles/imgs only (no stages). Light
// — used by the World index/detail and unit name-lookup. The heavy stage data is
// fetched per-world via fetchWorldStage().
export async function fetchWorld(region: Region) {
  return stampId(shapeWorld(await getWithFallback(region, 'world.json')));
}

// One world's FULL record (zones→stages→waves/rewards/drops) from
// split/world/<id>.json. Fetched lazily when a stage page opens that world.
export async function fetchWorldStage(id: string, region: Region) {
  const regions: Region[] = region === 'global' ? ['global'] : [region, 'global'];
  for (const r of regions) {
    const data = await get(`${r}/split/world/${id}.json`);
    if (data) {
      const shaped = shapeWorld({ [id]: data });   // reuse the stage-array shaper
      return { ...shaped[id], id };
    }
  }
  return null;
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
  const local = await get(`${region}/images.json`);
  const global = region === 'global' ? null : await get('global/images.json');
  let merged: any = global && local ? { ...global, ...local } : (local ?? global);
  if (!merged) return {};
  return preferPublicImages(merged);
}

// Full enemy list (records carry all fields). split/enemy_list.json.
export async function fetchEnemyList(region: Region) {
  const regions: Region[] = region === 'global' ? ['global'] : [region, 'global'];
  for (const r of regions) {
    const data = await get(`${r}/split/enemy_list.json`);
    if (data) return stampId(shapeEnemy(data));
  }
  return {};
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

// Split skill/AI bundles are content-deduplicated at build time: identical
// payloads (most same-variant enemies share one) are stored once, named after
// the owning enemy id (split/<sub>/<ownerId>.json — greppable, not hashed). The
// caller passes the bundle ref, which is the enemy's own id unless its record
// carries a skillsRef/aiRef pointing at the shared owner. ref absent -> no bundle.
export async function fetchSplitSkills(ref: string | undefined, region: Region) {
  if (!ref) return null;
  const data = await get(`${region}/split/skills/${ref}.json`);
  if (data || region === 'global') return data;
  return get(`global/split/skills/${ref}.json`);
}

export async function fetchSplitAI(ref: string | undefined, region: Region) {
  if (!ref) return null;
  const data = await get(`${region}/split/ai/${ref}.json`);
  if (data || region === 'global') return data;
  return get(`global/split/ai/${ref}.json`);
}

// ── units (playable characters) ───────────────────────────────────────────────

// LIGHT unit list (grid + hover card only): name/rarity/grade/type/role/body/icon/
// faction + trimmed profile{engName,number}. Heavy fields live in the per-unit
// bundle. split/units/unit_list.json.
export async function fetchUnitList(region: Region) {
  const regions: Region[] = region === 'global' ? ['global'] : [region, 'global'];
  for (const r of regions) {
    const data = await get(`${r}/split/units/unit_list.json`);
    if (data) return stampId(data);
  }
  return {};
}

// A single unit's full bundle: { skills, detail }. Not content-deduped (units don't
// share skills) — the file is named after its own unit id. `skills` holds BOTH forms'
// skills (base + skillsCh); `detail` carries the heavy fields kept out of the light
// list (stats, promotions, lvLimits, linkBonus, full profile, source, …).
export async function fetchUnitBundle(id: string | undefined, region: Region) {
  if (!id) return null;
  const data = await get(`${region}/split/units/${id}.json`);
  if (data || region === 'global') return data;
  return get(`global/split/units/${id}.json`);
}

// Flat skin gallery list. split/skins/skin_list.json — one entry per purchasable
// skin, with unit context + gallery/filter fields. Region-aware with global fallback.
export async function fetchSkinList(region: Region) {
  const regions: Region[] = region === 'global' ? ['global'] : [region, 'global'];
  for (const r of regions) {
    const data = await get(`${r}/split/skins/skin_list.json`);
    if (data) return data as SkinEntry[];
  }
  return [] as SkinEntry[];
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

// ── equipment ─────────────────────────────────────────────────────────────────

// Light equip LIST (per-family meta). split/equip/<id>.json holds the full data.
export async function fetchEquipList(region: Region) {
  return stampId(await getWithFallback(region, 'equip.json'));
}

// One equip family's FULL record (all ranks × levels), loaded when its modal opens.
export async function fetchEquip(id: string, region: Region) {
  const regions: Region[] = region === 'global' ? ['global'] : [region, 'global'];
  for (const r of regions) {
    const data = await get(`${r}/split/equip/${id}.json`);
    if (data) return { ...data, id };
  }
  return null;
}
