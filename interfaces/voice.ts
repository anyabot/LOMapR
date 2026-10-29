export type Dub = 'jp' | 'kr';

// [subtitle loc id, clip name]
export type VoiceLine = [string, string];

export interface VoiceEntry {
  prefab: string;
  // '' is the unit's base look; empty with `marriage` set is the oath set.
  skins: string[];
  marriage?: boolean;
  // Skin keys whose MarriageKey resolves to this oath set.
  oathFor?: string[];
  events: [string, string][];
  joinText?: string;
  tiers?: VoiceLine[][];
  special?: VoiceLine[][];
  oath?: VoiceLine[];
  // Clips the pack ships that no prefab field or lobby row names.
  extra?: string[];
  packs: Partial<Record<Dub, string[]>>;
}

export interface FixedTouchZone {
  key: string;
  node: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface UnitVoice {
  entries: VoiceEntry[];
  zones?: Record<string, FixedTouchZone[]>;
}
