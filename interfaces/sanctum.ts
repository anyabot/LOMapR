import { EnemyIndex } from "./world";

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

export interface Floor {
  stage: number;        // Stage_Num
  difficulty: number;   // Stage_Difficulty (0/1/2)
  name: string;         // loc id
  waves: Wave[][];      // [waveIndex][?] — kept nested for the existing UI
  gain: SanctumGain;
  // group IDs (resolve to member lists later — fill-later info table)
  prohibition: string[];   // banned unit groups
  suitability: string[];   // recommended unit groups
  prohibitionDesc: string; // loc id
  suitabilityDesc: string; // loc id
}
