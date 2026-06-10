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

function tryRequire(region: Region, file: string): StringTable {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    return require(`@/data/${region}/${file}`);
  } catch {
    return {};
  }
}

const official: Record<Region, StringTable> = {
  global: tryRequire('global', 'strings.json'),
  kr: tryRequire('kr', 'strings.json'),
};
const handTranslation: Record<Region, StringTable> = {
  global: tryRequire('global', 'strings_old.json'),
  kr: tryRequire('kr', 'strings_old.json'),
};

let activeRegion: Region = 'global';
export function setStringsRegion(region: Region) {
  activeRegion = region;
}

// Resolve one localization id to text for the active region.
//   lang    'en' | 'ko'
//   useOld  when true, the hand-translation overlay wins over official text.
// Unknown ids pass through unchanged (already-resolved strings, or untranslated).
export function t(
  value: string | undefined | null,
  lang: Lang = 'en',
  useOld = false,
): string {
  if (value == null) return '';

  if (useOld) {
    const o = handTranslation[activeRegion][value];
    const ot = o?.[lang] ?? o?.en;
    if (ot) return ot;
  }

  const e = official[activeRegion][value];
  if (e) return e[lang] ?? e.en ?? value;

  return value; // pass-through: already text, or no translation yet
}
