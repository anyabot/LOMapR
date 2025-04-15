export interface Skill {
  title: string;
  name: string;
  type: string;
  img: string;
  range: number;
  AP: number;
  area: [number, number, number, number, number, number, number, number, number];
  center: number;
  description: string;
  attr: string | undefined;
  leastRank: number;
}
