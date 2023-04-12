import { EnemyIndex } from "./world";

export interface Wave {
  r: number;
  e: EnemyIndex[];
}

export interface Floor {
  reward: any;
  rewards: any;
  waves: Wave[][];
}