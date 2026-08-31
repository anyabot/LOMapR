// Localization-string resolver. Chunks load independently; overlay layers and the
// resolution order are recorded in .ai/knowledge/project.md.

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

// Maps a full flat table (old strings.json shape) onto the common chunk.
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

// Resolution order: .ai/knowledge/project.md
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

// Aliases kept so import sites compile without mass-renaming; both collapse to t().
export const tKr  = t;
export const tAny = t;

/** Like t() but returns "" when the key has no entry (t() returns the key itself on miss). */
export function tOrEmpty(key: string | undefined | null, lang: Lang = 'en'): string {
  if (!key) return '';
  const r = t(key, lang);
  return r === key ? '' : r;
}
