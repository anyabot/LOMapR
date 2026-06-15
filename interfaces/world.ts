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

// One reward entry — a flat object keyed by what it grants:
//   currency: { cash: 2 } / { metal: 500 } / { exp, accountExp, skillExp, ... }
//   item:     { item: "ResourcePack_500", count?: 1 }
//   char:     { char: "Char_DS_Johanna_N" }
// Item/char ids are raw game keys; display names + icons resolved later.
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

// A star-clear condition. `desc` is the game's loc id (resolve with t()) — often
// poor or absent — so the parsed structured fields below say what must actually be
// done (from Table_MissionObject, see build_world._mission_cond):
//   object  the goal: 'STAGE_CLEAR' | 'KILL_ENEMY' | 'KILL_SPCENEMY'.
//   trigger the clear constraint (MISSION_TRIGGER_TYPE name), absent when none.
//   value   the trigger's numeric parameter (round/death/hit/squad limit, type
//           count, recorded damage). 0 is meaningful ("0 deaths", "take 0 hits").
//   unit    the trigger's required unit (Char_ key) — use/keep-alive/clear-with it.
//   skill   the trigger's required/forbidden skill (Skill_ key).
//   count   KILL_ENEMY: number of enemies to defeat.
//   enemy   KILL_SPCENEMY: the specific enemy (site id) to defeat.
export interface StageMission {
  desc?: string;
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

// Exploration (Search) info. time is in seconds; metal/nutrient/power are the
// resource yields; units/unitsLv are the dispatch-squad requirement.
export interface StageSearch {
  metal?: number;
  nutrient?: number;
  power?: number;
  time?: number;
  units?: number;
  unitsLv?: number;
}

// Full per-wave rank drops (B/A/S clear rank). Index matches `waves`. Each rank
// is a flat RewardEntry list (items, chars, and exp/skillExp). The UI aggregates
// / splits / hides as needed — the table keeps the complete data.
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
  waves: Wave[];       // battle waves; empty for story-only stages
  rewards?: StageRewards;   // clear / first-clear / all-mission rewards
  missions?: StageMission[]; // star-clear conditions
  unlock?: StageUnlock;     // prior-stage clear requirement
  squad?: StageSquad;       // squad rules
  search?: StageSearch;     // exploration info
  drops?: WaveDrop[];       // full per-wave rank drops (parallel to waves)
}

export interface Zone {
  title: string;       // display name (loc id, resolve with t())
  img: string;         // image key
  // A zone is either a flat stage list, or (for multi-part chapters like 12/13)
  // several sub-maps. When `subzones` is set, render those instead of `stages`.
  stages: Stage[];
  subzones?: Stage[][];
}

export interface World {
  id: string;
  title: string;       // display name (loc id, resolve with t())
  img: string;         // square icon key
  banner?: string;     // wide banner key (permanent events only)
  type: string;        // 'story' | 'current' | 'permanent' | 'past' | 'sanctum' | ...
  zones: Zone[];
}
