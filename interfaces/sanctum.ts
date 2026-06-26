import { EnemyIndex } from "./world";
import { SkillBuff } from "./skill";

// Sanctum (EW) follows Table_MapStageEW. A "floor" is one Stage_Num within a
// chapter; each floor has up to 3 difficulty variants (Stage_Difficulty).

export interface Wave {
  // 9-cell enemy grid (row-major), null = empty cell.
  e: (EnemyIndex | null)[];
}

// Per-floor resource gain (Sanctum minerals). ChargeUP = regen/turn increase,
// MAXUP = max capacity increase.
export interface SanctumGain {
  mineralCharge: number;
  mineralMax: number;
  refinedCharge: number;
  refinedMax: number;
}

// A squad (Table_TroopCategory) resolved to its members — used by both suitable
// and squad-based banned groups.
export interface SquadGroup {
  key: string;
  name: string;    // loc id
  icon: string;    // squad icon key (UI_TroopIcon_*)
  units: string[]; // member Char_* ids (max 5)
}

// A banned-unit rule (Table_ProhibitionEW). Attribute bans (body/type/role) stay
// descriptive; squad bans resolve to the squad's units. `desc` is a loc id.
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
