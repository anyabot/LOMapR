import { SkillBuff } from './skill';

// Entries produced by tools/transform/build/misc.py (data/<region>/misc.json +
// split/misc/buff_<type>.json). All name fields are raw loc IDs (resolve via t()).

export interface MiscSkillMeta {
  unit: string;       // unit id (Char_*) — resolve name/icon via the unit list
  skill: string;      // skill key
  name: string;       // skill name loc id
  img: string;        // skill icon short-key (/images/SkillIcon/<img>_<skillType>.png)
  skillType: string;  // "active" | "passive"
}

export interface MiscAoeEntry extends MiscSkillMeta {
  area: number[];     // 9-cell damage grid (see interfaces/skill.ts)
  center: number;
  cells: number;      // number of hit cells (>= 2 by construction)
  ap: number;
  range: number;
}

export interface MiscDamageEntry extends MiscSkillMeta {
  rate: number;       // SkillAttackRate at skill level 1
}

export interface MiscBuffEntry extends MiscSkillMeta {
  buff: SkillBuff;
  // the owning skill's AoE — present only when the skill hits >= 2 cells
  area?: number[];
  center?: number;
}

export interface MiscBuffTypeMeta {
  count: number;      // total entries of this BUFFEFFECT_TYPE ordinal
  attrs: number[];    // BUFF_ATTR_TYPEs seen among the entries
  units: number;      // distinct units applying it
  // compact per-entry signature [unitIdx, attr, targetType] — unitIdx indexes
  // MiscIndex.units. Lets the picker compute filter-aware counts client-side.
  sig: [number, number, number][];
}

export interface MiscIndex {
  buffTypes: Record<string, MiscBuffTypeMeta>;   // key = BUFFEFFECT_TYPE ordinal
  units: string[];                               // unit ids referenced by sig
  aoe: MiscAoeEntry[];
  damage: Record<string, MiscDamageEntry[]>;     // physical | fire | ice | electric
}
