// Localization-string resolver (two layers, both keyed by localization id),
// region-aware.
//
//   strings.json      official game text (Table_Localization_en/ko) — DEFAULT.
//   strings_old.json  legacy hand-translation overlay (the pre-global KR fan
//                     translation); applied on top when the toggle is on.
//
// Base data stores raw localization ids in text fields; t() resolves them for
// the ACTIVE region. The region is set once (by the region toggle) so the many
// `t(id)` call sites don't each need to pass it. Unknown ids pass through.
//
// All JSON is local-only (gitignored) and may be absent until the transform has
// produced it; the requires are guarded.

export type Lang = 'en' | 'ko';
export type Region = 'global' | 'kr';

type StringTable = { [id: string]: { en?: string; ko?: string } };

function tryRequire(path: string): StringTable {
  try {
    return require(`@/data/${path}`);
  } catch {
    return {};
  }
}

// Official game text per region. Seeded from the local /data files when present
// (dev), and overwritten at runtime by setStringsData() once the app fetches the
// tables from the API (which serves them from Firebase in production, where the
// /data files are not deployed).
const official: Record<Region, StringTable> = {
  global: tryRequire('global/strings.json'),
  kr: tryRequire('kr/strings.json'),
};
// Community translation overlay — a single SHARED, region-agnostic file.
let community: StringTable = tryRequire('community_translation.json');

// Populate a region's official table at runtime (from the /api/strings fetch).
export function setStringsData(region: Region, table: StringTable) {
  if (table && Object.keys(table).length) official[region] = table;
}
// Populate the shared community overlay at runtime (from /api/community).
export function setCommunityData(table: StringTable) {
  if (table && Object.keys(table).length) community = table;
}

let activeRegion: Region = 'global';
export function setStringsRegion(region: Region) {
  activeRegion = region;
}

// 'community' prefers the OLD hand-translation overlay; 'official' uses only the
// official in-game text. Set by the navbar toggle so t() call sites stay simple.
let activeTranslation: 'community' | 'official' = 'community';
export function setStringsTranslation(mode: 'community' | 'official') {
  activeTranslation = mode;
}

// Resolve one localization id to text for the active region.
//   lang   'en' | 'ko'
//
// Precedence depends on the active translation mode (navbar toggle):
//   'community' (default): OLD hand-translation overlay FIRST, then official.
//   'official':            official game text only.
// Korean always uses official text (OLD has no KO). Unknown ids pass through.
export function t(value: string | undefined | null, lang: Lang = 'en'): string {
  if (value == null) return '';

  if (activeTranslation === 'community' && lang === 'en') {
    const o = community[value];
    if (o?.en) return o.en;
  }

  const e = official[activeRegion][value];
  if (e) {
    // requested language -> English -> Korean fallback. Never surface the raw
    // localization id when KO text exists for it.
    return e[lang] || e.en || e.ko || value;
  }

  return value; // not a known id: pass through (already-resolved text)
}
