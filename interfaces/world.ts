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

export interface Stage {
  id: string;          // table stage key
  title: string;       // short label, e.g. "1-1"
  name: string;        // display name (loc id, resolve with t())
  pos: number;         // Stage_Pos, used to order stages within their subtype row
  subtype: StageSubType;
  next: string;        // title of the next stage (progression), "" if none
  waves: Wave[];       // battle waves; empty for story-only stages
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
