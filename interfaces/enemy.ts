
export interface EnemyData {
  id: string;
  name: string;
  img: string;
  type: string;
  role: string;
  rank: string;
  used: {[key: string]: [number, string][]};
  usedSanctum: boolean;
  HP: [number, number];
  ATK: [number, number];
  DEF: [number, number];
  CRIT: number;
  ACC: number;
  EVA: number;
  SPD: number;
  resist: [number, number, number];
  info: string;
  skills: string[];
  // owner of this enemy's deduped skill/AI bundle; absent means it owns its own file
  skillsRef?: string;
  aiRef?: string;
}

// EnemyFull is the same shape — kept as an alias so existing call sites compile.
export type EnemyFull = EnemyData;
