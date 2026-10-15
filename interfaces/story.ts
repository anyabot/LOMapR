import type { StageRewards, StageSubType } from './world';

export interface StoryText {
  en?: string;
  ko?: string;
}

export interface StoryScene {
  id: string;
  at: 'story' | 'start' | 'mid' | 'end';
  wave?: number;
}

export interface StoryStage {
  id: string;
  title: string;
  name: string;           // loc id, resolve with t()
  subtype: StageSubType;
  scenes: StoryScene[];
}

export interface SubStory {
  no: number;
  name: StoryText;
  scene: string;
  icon?: string;
}

export interface SubStoryGroup {
  name: StoryText;
  icon?: string;
  stories: SubStory[];
}

export interface StoryZone {
  stages: StoryStage[];
  sub?: SubStoryGroup[];
}

// Keyed by world id; zones are parallel to the world's zones, null where a zone has no story.
export type StoryIndex = Record<string, (StoryZone | null)[]>;

export interface StoryChoice extends StoryText {
  l: StoryLine[];
}

// k: l speech, n narration, p player reply, c choice, b place caption.
export type StoryLine =
  | ({ k: 'l'; n?: string; a?: string } & StoryText)
  | ({ k: 'n' } & StoryText)
  | ({ k: 'p' } & StoryText)
  | ({ k: 'b' } & StoryText)
  | { k: 'c'; o: StoryChoice[] };

export interface StoryZoneText {
  names: Record<string, StoryText>;
  scenes: Record<string, StoryLine[]>;
}

export interface CharStory {
  key: string;
  no?: string;
  name: StoryText;
  desc: StoryText;
  icon?: string;
  unlock?: StoryText[];
  scenes: StoryScene[];
  stage?: { id: string; title: string; name: StoryText; rewards?: StageRewards };
}

export interface CharStoryGroup {
  type: 'pc' | 'squad';
  no?: number;
  name: StoryText;
  unit: StoryText;
  icon?: string;
  stories: CharStory[];
}

export interface CharStorySquad {
  key: string;
  name: StoryText;
  desc?: StoryText;
  icon?: string;
  groups: string[];
}

export interface CharStoryIndex {
  squads: CharStorySquad[];
  groups: Record<string, CharStoryGroup>;
}
