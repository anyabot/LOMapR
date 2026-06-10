// Infinite War (IW): seasons of escalating boss-rush stages. Follows the
// table_*iw tables (season / mapstage / phase / mobgroup / monster).

export interface Phase {
  id: string;       // boss monster site-key for this phase
  damage: number;   // cumulative damage to enter this phase (-1 = from start)
  form: number;     // boss form index
}

export interface IWStage {
  key: string;
  lv: number;            // stage level (escalation step)
  next: string;          // next stage key, "" if last
  model: string;         // boss model id
  monster: {
    group: (string | null)[];   // 9-cell group (site-keys), null = empty
    lv: number;                  // boss level
    maxHP: number;
  };
  phase: Phase[];
  clearScore: number;
  roundLimit: number;
  roundScore: number;
  rankCriteria: number;
}

export interface Season {
  key: string;
  monster: string;       // boss name (loc id)
  date: [string, string];   // [start, end]
}

export interface InfiniteWar {
  seasons: Season[];
  bosses: { [seasonKey: string]: IWStage[] };
}
