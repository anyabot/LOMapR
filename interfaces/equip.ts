import { SkillBuff } from './skill';

// One unit-applied stat on an equip at a given level. value is flat for
// ATK/DEF/HP/MaxHP/SPD; percent (×100) when pct is true (EVA/CRIT/ACC/RES).
export interface EquipStat {
  attr: string;
  value: number;
  pct: boolean;
}

// One equip level (0..10): the unit-applied stats + the on-equip buff effects
// (same SkillBuff shape as skills, so the buff renderer is reused).
export interface EquipLevel {
  stats: EquipStat[];
  buffs: SkillBuff[];
}

// One rank (tier) of an equip family — a single Table_ItemEquip row.
// Restriction labels: classLimit Light/Heavy/Air, roleLimit Defender/Attacker/
// Supporter (null = no limit / all); pcLimit = a Char_* key the equip is locked to.
export interface EquipRank {
  key: string;          // row id (Equip_..._T<n>) — used to match drop sources
  tier: number;
  grade: number;        // 2=B, 3=A, 4=S, 5=SS, 6=SSS
  name: string;         // loc id (resolve with t())
  desc: string;         // loc id
  detail: string;       // loc id (long description)
  icon: string;         // sprite key — PNG at /images/icons/<icon>.png
  classLimit: string | null;
  roleLimit: string | null;
  pcLimit: string;
  levelLimit: number;
  levels: EquipLevel[]; // 11 entries, level 0..10
  // where THIS rank drops: worldId -> [zoneNum, stageTitle, farm][]. farm=true =>
  // repeatable wave drop; false => one-time clear/mission reward. Absent => the
  // frontend falls back to a lower rank's source (shown with a note).
  source?: { [worldId: string]: [number, string, boolean][] };
}

// Light list entry (equip.json) — what the equipment list page shows. The full
// per-rank/level data lives in split/equip/<id>.json (EquipFull).
export interface EquipData {
  id: string;
  name: string;         // highest-rank name (loc id)
  icon: string;         // highest-rank icon
  grade: number;        // highest grade
  slot: 'Chip' | 'OS' | 'Item';   // from ItemType (not the key prefix)
  classLimit: string | null;
  roleLimit: string | null;
  pcLimit: string;
  rankCount: number;
  levelLimit: number;
  exchange: 'Sanctum' | 'IW' | null;   // exchange-shop source (badge/filter), else null
}

// Full equip family (split/equip/<id>.json): all ranks, ascending by grade.
export interface EquipFull {
  id: string;
  name: string;
  icon: string;
  grade: number;
  slot: 'Chip' | 'OS' | 'Item';
  classLimit: string | null;
  roleLimit: string | null;
  pcLimit: string;
  exchange?: 'Sanctum' | 'IW' | null;   // exchange-shop source (Sanctum / Infinite War)
  ranks: EquipRank[];   // ascending; UI defaults to the last (highest)
}
