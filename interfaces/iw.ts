export interface Phase {
  damage: number;
  form: number;
  id: string
}

export interface Stage {
  monster: {
    lv: number,
    maxHP: number
  };
  phase: Phase[]
}

export interface Season {
  key: string;
  monster: string;
  date: [string, string];
}

export interface InfiniteWar {
  seasons: Season[];
  bosses: {[key: string]: Stage[]};
}