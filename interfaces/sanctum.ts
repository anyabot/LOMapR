import { EnemyIndex } from "./world";
import { SkillBuff } from "./skill";

// Table_MapStageEW: a "floor" is one Stage_Num within a chapter, with up to 3
// difficulty variants.

export interface Wave {
  // 9-cell enemy grid (row-major), null = empty cell.
  e: (EnemyIndex | null)[];
}

// ChargeUP raises regen per turn, MAXUP raises capacity.
export interface SanctumGain {
  mineralCharge: number;
  mineralMax: number;
  refinedCharge: number;
  refinedMax: number;
}

// A Table_TroopCategory squad resolved to its members.
export interface SquadGroup {
  key: string;
  name: string;    // loc id
  icon: string;    // squad icon key (UI_TroopIcon_*)
  units: string[]; // member Char_* ids (max 5)
}

// Table_ProhibitionEW: attribute bans stay descriptive, squad bans resolve to units.
export interface Prohibition {
  filter: {
    body?: string;          // 'Bioroid' | 'AGS'
    type?: string;          // 'Light' | 'Heavy' | 'Air'
    role?: string;          // 'Attacker' | 'Defender' | 'Supporter'
    squads?: SquadGroup[];  // squad bans, resolved to members
  };
  desc: string;             // loc id
}

// A suitable group + the buff its units receive.
export interface Suitability {
  squads: SquadGroup[];
  units: string[];   // all suitable Char_* ids (squad members + direct chars)
  buffLevel: number;
  buffs: SkillBuff[];  // parsed BuffEffectIndex (skill-style buff entries)
}

export interface Floor {
  stage: number;        // Stage_Num
  difficulty: number;   // Stage_Difficulty (0/1/2)
  name: string;         // loc id
  waves: Wave[][];      // [waveIndex][?] — kept nested for the existing UI
  gain: SanctumGain;
  prohibition: Prohibition[];  // banned-unit rules
  suitability: Suitability[];  // suitable groups + buffs
  suitabilityDesc: string;     // loc id (e.g. "effect applies permanently")
}
