export interface EnemyIndex {
  id: string;
  lv: number;
}

export interface Wave {
  title: string;
  enemylist: EnemyIndex[];
}

export interface Stage {
  name: string;
  title: string;
  grid: [number, number];
  type: string;
  wave: Wave[];
}

export interface Zone {
  img: string;
  title: string;
  gridsize: [number, number];
  stages: Stage[];
}

export interface World {
  img: string;
  title: string;
  type: string;
  id: string;
  zones: Zone[];
}