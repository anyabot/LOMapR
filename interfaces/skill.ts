export interface Skill {
  title: string;
  name: string;
  type: string;
  img: string;
  range: number;
  AP: number;
  // 9-cell damage-rate grid (row-major, cells 1..9). 0 = not hit; >0 = damage
  // multiplier for that cell (drives both hit-area and color). Parsed from the
  // table GridIndex, which is richer than the old binary area.
  area: number[];
  center: number;
  description: string;
  attr: string | undefined;
  leastRank: number;
  // corrective accuracy for this specific skill (additive ACC), and whether the
  // skill ignores Protect. Surfaced in the UI later.
  accuracy: number;
  guardPierce: boolean;
  // damage multiplier (SkillAttackRate) that fills the {0} placeholder in the
  // official description; the old hand text embedded it inline as $(rate).
  rate: number;
}
