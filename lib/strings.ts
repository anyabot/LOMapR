// Localization-string resolver.
//
// Strings are split into chunks loaded independently:
//   common   unit/enemy/faction names — loaded eagerly on app start
//   skill    skill names + descriptions — lazy, loaded when skill tab opens
//   buff     buff names + descriptions — lazy, loaded when skill tab opens
//   stage    stage/chapter/mission names — lazy, loaded when world pages open
//   item     equip/consumable names — lazy, loaded when item UI opens
//   shop     skin/pack names — lazy, loaded on skins page
//
// Overlay layers (all chunks):
//   official    game text from Table_Localization_en/ko — always active
//   mtl         Global MTL: machine-translated global skill text
//   krMtl       Missing KR MTL: KR-only skills not in global
//   community   Community fan-translation overlay
//
// Resolution rule: community > mtl > krMtl > official (global region)
//                  community > krMtl > mtl > official (kr region)
// Official: try active region first, fall back to other region.
// KR English: only returned when KR Korean matches global Korean.

export type Lang = 'en' | 'ko';
export type Region = 'global' | 'kr';
export type StringChunk = 'common' | 'skill' | 'buff' | 'stage' | 'item' | 'shop';

type StringTable = { [id: string]: { en?: string; ko?: string } };

// Per-region, per-chunk official strings
const official: Record<Region, Partial<Record<StringChunk, StringTable>>> = {
  global: {},
  kr: {},
};

// Which chunks have been loaded per region
const loaded: Record<Region, Set<StringChunk>> = { global: new Set(), kr: new Set() };

let mtl:       StringTable = {};
let krMtl:     StringTable = {};
let community: StringTable = {};

let activeRegion: Region = 'global';
let activeMtl       = false;
let activeKrMtl     = false;
let activeCommunity = false;

export function setStringsRegion(region: Region) { activeRegion = region; }
export function setStringsLayers(opts: { mtl: boolean; krMtl: boolean; community: boolean }) {
  activeMtl = opts.mtl; activeKrMtl = opts.krMtl; activeCommunity = opts.community;
}

export function setChunkData(region: Region, chunk: StringChunk, table: StringTable) {
  if (table && Object.keys(table).length) {
    official[region][chunk] = table;
    loaded[region].add(chunk);
  }
}

export function isChunkLoaded(region: Region, chunk: StringChunk): boolean {
  return loaded[region].has(chunk);
}

export function setMtlData(table: StringTable)       { if (table && Object.keys(table).length) mtl = table; }
export function setKrMtlData(table: StringTable)     { if (table && Object.keys(table).length) krMtl = table; }
export function setCommunityData(table: StringTable) { if (table && Object.keys(table).length) community = table; }

// Legacy setters used by _app.tsx during migration — maps a full flat table
// (old strings.json shape) to the common chunk so existing loaders still work.
export function setStringsData(region: Region, table: StringTable) {
  setChunkData(region, 'common', table);
}

// Look up a single ID across all loaded chunks for a given region.
function officialLookup(region: Region, id: string): { en?: string; ko?: string } | undefined {
  for (const chunk of Object.values(official[region])) {
    const e = chunk?.[id];
    if (e) return e;
  }
  return undefined;
}

// Resolve one localization id.
//
// Rule: community > (krMtl > mtl when KR, mtl > krMtl when global) > official.
// Official: try active region first; if not found, try the other region.
// KR English: only used when KR Korean matches global Korean (same content).
export function t(value: string | undefined | null, lang: Lang = 'en'): string {
  if (!value) return '';

  if (lang === 'en') {
    if (activeCommunity) { const o = community[value]; if (o?.en) return o.en; }
    if (activeRegion === 'kr') {
      if (activeKrMtl) { const o = krMtl[value]; if (o?.en) return o.en; }
      if (activeMtl)   { const o = mtl[value];   if (o?.en) return o.en; }
    } else {
      if (activeMtl)   { const o = mtl[value];   if (o?.en) return o.en; }
      if (activeKrMtl) { const o = krMtl[value]; if (o?.en) return o.en; }
    }
  }

  // Try active region first
  const primary = officialLookup(activeRegion, value);
  if (primary) {
    if (lang !== 'en') return primary[lang] || primary.ko || value;
    if (primary.en) return primary.en;
    // Active region entry has no English — validate via KR ko vs global ko
    if (activeRegion === 'kr') {
      const g = officialLookup('global', value);
      if (g?.en && g.ko && g.ko.trim() === (primary.ko ?? '').trim()) return g.en;
    }
    return primary.ko || value;
  }

  // Fall back to other region
  const other: Region = activeRegion === 'kr' ? 'global' : 'kr';
  const secondary = officialLookup(other, value);
  if (secondary) {
    if (lang !== 'en') return secondary[lang] || secondary.ko || value;
    if (secondary.en) return secondary.en;
    return secondary.ko || value;
  }

  return value;
}

// Kept as aliases so import sites compile without mass-renaming.
// Both collapse to t() — the single resolution rule covers all cases.
export const tKr  = t;
export const tAny = t;
