// Team-builder state: a 3x3 formation of configured units (max 5 per squad).
// Tiles 0..8 row-major = ten-key positions [7,8,9/4,5,6/1,2,3]; depth = column.

// One equipped item: an equip FAMILY id plus the chosen rank (index into
// EquipFull.ranks) and enhancement level (0..10).
export interface TeamEquipSel {
  id: string;
  rank: number;
  level: number;
}

// One configured unit on a tile.
export interface TeamSlot {
  unitId: string;
  level: number;        // 1..120 (past 100 needs limit-break in game; growth extrapolates)
  gradeIdx: number;     // index into unit.stat (0 = StartGrade)
  links: number;        // core links 0..5 (each = 100%; slots unlock at lv 10/30/50/70/90)
  fullLink: number;     // -1 = none; else index into unit.fullLinkBonus (needs links === 5)
  points: number[];     // allocated stat points [ATK, DEF, HP, ACC, EVA, CRIT]
  equips: (TeamEquipSel | null)[];   // 4 slots (unlock at lv 20/40/60/80, types from unit.equip)
  skillLv: number[];    // per-skill level 1..10, parallel to the active form's skill keys
  form: number;         // 0 = base form, 1 = change form (two-form units only)
  maxAffection: boolean; // 200 affection / married: buff/debuff effect level +1
  currentHp: number;    // absolute current HP; 0 means use the computed maximum
  hpPercent?: number;   // legacy v3 share-code value; converted at use time
}

// The whole team: 9 tiles, null = empty.
export type Team = (TeamSlot | null)[];

// Keys of the displayed stat block (percent stats are stored as whole percents,
// matching UnitStat).
export type StatKey =
  | 'HP' | 'ATK' | 'DEF' | 'SPD' | 'CRI' | 'ACC' | 'EVA'
  | 'fireRes' | 'iceRes' | 'lightningRes';

export type StatMap = Record<StatKey, number>;

// Stat breakdown for one configured unit (before battle simulation).
export interface ComputedStats {
  base: StatMap;    // grade + level growth only
  total: StatMap;   // after stat points + equipment + link bonuses
  bonus: StatMap;   // total - base (shown in yellow)
  // summed link-bonus percentages per flat stat (HP/ATK/DEF), kept for the
  // simulation's ordering rule (flat buffs land after the link multiplier).
  linkPct: Partial<Record<StatKey, number>>;
}
