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
// Precedence (highest wins): community > krMtl > mtl > official.

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
// opts.region  — override the active region for this lookup (used for cross-region checks)
// opts.lang    — 'en' (default) or 'ko'
// opts.strict  — when true and active region is 'kr', validate that the KR Korean
//                matches before returning global English (tKr behaviour)
export function t(
  value: string | undefined | null,
  opts?: Lang | { lang?: Lang; region?: Region; strict?: boolean },
): string {
  if (value == null) return '';

  const lang:   Lang   = typeof opts === 'string' ? opts : (opts?.lang   ?? 'en');
  const region: Region = typeof opts === 'string' ? activeRegion : (opts?.region ?? activeRegion);
  const strict          = typeof opts === 'string' ? false        : (opts?.strict ?? false);

  if (lang === 'en') {
    if (activeCommunity) {
      const o = community[value];
      if (o?.en) return o.en;
    }
    if (region === 'kr') {
      if (activeKrMtl) { const o = krMtl[value]; if (o?.en) return o.en; }
      if (activeMtl)   { const o = mtl[value];   if (o?.en) return o.en; }
    } else {
      if (activeMtl)   { const o = mtl[value];   if (o?.en) return o.en; }
      if (activeKrMtl) { const o = krMtl[value]; if (o?.en) return o.en; }
    }
  }

  const e = officialLookup(region, value);
  if (e) {
    if (lang !== 'en') return e[lang] || e.ko || value;
    if (e.en) {
      // strict mode: only return English if KR Korean matches global Korean
      if (strict && region === 'kr') {
        const krKo = (e.ko ?? '').trim();
        const g = officialLookup('global', value);
        if (g?.en && g.ko && g.ko.trim() === krKo) return g.en;
        return krKo || value;
      }
      return e.en;
    }
    // KR entry has no English — try global if Korean content matches
    if (region === 'kr') {
      const g = officialLookup('global', value);
      if (g?.en && g.ko && g.ko.trim() === (e.ko ?? '').trim()) return g.en;
    }
    return e.ko || value;
  }

  return value;
}

// Resolve a loc ID from either region (tries active first, then the other).
// Replaces tAny() — call as t(id, { region: 'any' }) or use this alias.
export function tAny(value: string | undefined | null): string {
  if (!value) return '';
  const res = t(value);
  if (res && res !== value) return res;
  const other: Region = activeRegion === 'kr' ? 'global' : 'kr';
  const e = officialLookup(other, value);
  if (e?.en) return e.en;
  return res || value;
}

// Resolve a loc ID that originated from KR data, validating KR Korean as ground
// truth before returning English. Replaces tKr() — now a thin alias over t().
export function tKr(value: string | undefined | null): string {
  if (!value) return '';
  const krEntry = officialLookup('kr', value);
  if (!krEntry) return '';
  const krKo = (krEntry.ko ?? '').trim();

  if (activeCommunity) { const o = community[value]; if (o?.en) return o.en; }
  if (activeRegion === 'kr') {
    if (activeKrMtl) { const o = krMtl[value]; if (o?.en) return o.en; }
    if (activeMtl)   { const o = mtl[value];   if (o?.en) return o.en; }
  } else {
    if (activeMtl)   { const o = mtl[value];   if (o?.en) return o.en; }
    if (activeKrMtl) { const o = krMtl[value]; if (o?.en) return o.en; }
  }

  if (krEntry.en) return krEntry.en;
  const g = officialLookup('global', value);
  if (g?.en && g.ko && g.ko.trim() === krKo) return g.en;
  return krKo || value;
}
