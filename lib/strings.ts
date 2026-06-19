// Localization-string resolver — optional layers on top of official game text.
//
// Layers (all keyed by localization ID):
//   official    game text from Table_Localization_en/ko — always active.
//   mtl         Global MTL: machine-translated global skill text.
//   krMtl       Missing KR MTL: KR-only skills not present in global.
//   community   Community fan-translation overlay.
//
// Precedence (highest wins): community > krMtl > mtl > official.
// Each overlay layer is independently togglable; official is always on.
//
// Tables start empty and are filled at runtime via the set* functions (see
// _app.tsx). They are NOT bundled statically — each is fetched from R2.

export type Lang = 'en' | 'ko';
export type Region = 'global' | 'kr';

type StringTable = { [id: string]: { en?: string; ko?: string } };

const official: Record<Region, StringTable> = { global: {}, kr: {} };
let mtl:       StringTable = {};
let krMtl:     StringTable = {};
let community: StringTable = {};

export function setStringsData(region: Region, table: StringTable) {
  if (table && Object.keys(table).length) official[region] = table;
}
export function setMtlData(table: StringTable) {
  if (table && Object.keys(table).length) mtl = table;
}
export function setKrMtlData(table: StringTable) {
  if (table && Object.keys(table).length) krMtl = table;
}
export function setCommunityData(table: StringTable) {
  if (table && Object.keys(table).length) community = table;
}

let activeRegion: Region = 'global';
export function setStringsRegion(region: Region) {
  activeRegion = region;
}

let activeMtl       = false;
let activeKrMtl     = false;
let activeCommunity = false;
export function setStringsLayers(opts: { mtl: boolean; krMtl: boolean; community: boolean }) {
  activeMtl       = opts.mtl;
  activeKrMtl     = opts.krMtl;
  activeCommunity = opts.community;
}

// Resolve one localization id for the active region + active layers.
// Korean always uses official text. Unknown ids pass through unchanged.
//
// MTL precedence is region-aware:
//   KR region:     community > krMtl > mtl > official
//   global region: community > mtl > krMtl > official
export function t(value: string | undefined | null, lang: Lang = 'en'): string {
  if (value == null) return '';

  if (lang === 'en') {
    if (activeCommunity) {
      const o = community[value];
      if (o?.en) return o.en;
    }
    if (activeRegion === 'kr') {
      if (activeKrMtl) {
        const o = krMtl[value];
        if (o?.en) return o.en;
      }
      if (activeMtl) {
        const o = mtl[value];
        if (o?.en) return o.en;
      }
    } else {
      if (activeMtl) {
        const o = mtl[value];
        if (o?.en) return o.en;
      }
      if (activeKrMtl) {
        const o = krMtl[value];
        if (o?.en) return o.en;
      }
    }
  }

  const e = official[activeRegion][value];
  if (e) return e[lang] || e.en || e.ko || value;

  return value;
}

// Resolve a loc ID that originated from KR data, validating against KR Korean text
// before returning English. Prevents wrong global strings from showing when a loc ID
// is reused across regions with different content (e.g. BuffName_* / BuffDesc*_ refs).
// Always reads KR ko as the ground truth; returns English from the active region/layers
// only if KR ko matches — otherwise falls back to KR ko itself (so something shows).
export function tKr(value: string | undefined | null): string {
  if (!value) return '';
  const krEntry = official['kr'][value];
  if (!krEntry) return '';
  const krKo = (krEntry.ko ?? '').trim();
  // Check active region's en — but only trust it if KR ko matches (same content).
  const activeEntry = official[activeRegion][value];
  if (activeEntry?.en && activeRegion === 'kr') return activeEntry.en;
  if (activeEntry?.en && activeRegion !== 'kr') {
    // global: only use global en if KR ko matches global ko (same string, just translated)
    const globalKo = (activeEntry.ko ?? '').trim();
    if (globalKo && globalKo === krKo) return activeEntry.en;
  }
  // Check overlay layers (MTL etc.) — these are keyed by ID so ko-match is implicit
  if (activeCommunity) { const o = community[value]; if (o?.en) return o.en; }
  if (activeKrMtl)     { const o = krMtl[value];     if (o?.en) return o.en; }
  if (activeMtl)       { const o = mtl[value];        if (o?.en) return o.en; }
  // Fall back to KR ko so something meaningful shows rather than the raw ID
  return krKo || value;
}
