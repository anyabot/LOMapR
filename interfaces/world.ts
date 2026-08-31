// A single enemy occupying one of the 9 grid cells of a wave. null = empty cell.
export interface EnemyIndex {
  id: string;   // enemy site-key (matches EnemyData keys)
  lv: number;
}

export interface Wave {
  title: string;
  // 9 cells (row-major, top-left .. bottom-right). null = no enemy in that cell.
  enemies: (EnemyIndex | null)[];
}

// From the game's STAGE_SUB_TYPE enum: NORMAL / SIDE / EX / STORYONLY.
export type StageSubType = "Main" | "Side" | "Ex" | "Story";

export const STAGE_ICON_SRC: Record<StageSubType, string> = {
  Side: "/images/SideStage.png",
  Main: "/images/Main_Stage.png",
  Ex: "/images/EX_Stage.png",
  Story: "/images/StoryStage.png",
};

// Exactly one grant per entry: a currency amount, `item` + `count`, or `char`.
export interface RewardEntry {
  accountExp?: number;
  exp?: number;
  skillExp?: number;
  cash?: number;
  metal?: number;
  nutrient?: number;
  power?: number;
  item?: string;
  count?: number;
  char?: string;
}

export interface StageRewards {
  clear?: RewardEntry[];     // base stage-clear reward (RewardIndex)
  reward_f?: RewardEntry[];  // one-time first-clear bonus
  reward_am?: RewardEntry[]; // all star-missions completed
}

// `desc` (loc id) is often poor or absent — render the structured fields instead.
export interface StageMission {
  desc?: string;      // loc id, resolve with t()
  // trigger/value/unit/skill semantics: .ai/knowledge/schemas.md
  object: 'STAGE_CLEAR' | 'KILL_ENEMY' | 'KILL_SPCENEMY';
  trigger?: string;
  value?: number;
  unit?: string;
  skill?: string;
  count?: number;
  enemy?: string;
}

// Unlock requirement: the prior stage label(s) that must be cleared first.
export interface StageUnlock {
  clearStages: string[];
}

export interface StageSquad {
  count?: number;    // number of squads allowed
  shift?: number;    // squad-shift limit
  friend: boolean;   // friend squad allowed
  fixed?: string[];  // forced squad members (raw Char_ ids)
}

export interface StageSearch {
  metal?: number;
  nutrient?: number;
  power?: number;
  time?: number;      // seconds
  units?: number;     // dispatch-squad size
  unitsLv?: number;   // dispatch-squad level
}

// Drops per clear rank, for one wave.
export interface WaveDrop {
  B?: RewardEntry[];
  A?: RewardEntry[];
  S?: RewardEntry[];
}

export interface Stage {
  id: string;          // table stage key
  title: string;       // short label, e.g. "1-1"
  name: string;        // display name (loc id, resolve with t())
  pos: number;         // Stage_Pos, used to order stages within their subtype row
  subtype: StageSubType;
  next: string;        // title of the next stage (progression), "" if none
  waves: Wave[];       // may be non-empty on Story stages — gate on isBattleStage
  rewards?: StageRewards;   // clear / first-clear / all-mission rewards
  missions?: StageMission[]; // star-clear conditions
  unlock?: StageUnlock;     // prior-stage clear requirement
  squad?: StageSquad;       // squad rules
  search?: StageSearch;     // exploration info
  drops?: WaveDrop[];       // parallel to `waves`
}

// Story-only stages can carry leftover wave/drop rows for a battle the game never runs.
export const isBattleStage = (s: Stage): boolean => s.subtype !== 'Story' && s.waves.length > 0;

export interface Zone {
  title: string;       // display name (loc id, resolve with t())
  img: string;         // image key
  stages: Stage[];
  subzones?: Stage[][];  // multi-part chapters (12/13); when set, render these instead
}

export interface World {
  id: string;
  title: string;       // display name (loc id, resolve with t())
  img: string;         // square icon key
  banner?: string;     // wide banner key (permanent events only)
  type: string;        // 'story' | 'current' | 'permanent' | 'past' | 'sanctum' | ...
  zones: Zone[];
}
