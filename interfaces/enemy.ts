
export interface EnemyData {
  id: string;
  HP: [number, number];
  ATK: [number, number];
  DEF: [number, number];
  CRIT: number;
  ACC: number;
  EVA: number;
  SPD: number;
  resist: [number, number, number];
  img: string;
  info: string;
  name: string;
  rank: string;
  role: string;
  type: string;
  skills: string[];
  used: {[key: string]: [number, string][]};
  usedSanctum: boolean;
}
