export interface SkillBuff {
  group: number;   // LBEI entry index — all slots from the same entry share this
  icon: string;    // BuffIcon key (without "BuffIcon_" prefix)
  name: string;    // loc ID for buff name (resolve with t())
  attr: number;    // BUFF_ATTR_TYPE: 0=BUFF,1=DEBUFF,2=SKILLBUFF,3=ETC,4=ROGUEBUFF,5=ROGUEDEBUFF
  trigger: number;     // BUFFEFFECT_TRIGGER_TYPE ordinal (BETT3)
  targetType: number;  // TARGET_TYPE (BETT2): 0=SELF,1=OUR,2=OUR_GRID,3=ENEMY,4=ENEMY_GRID,5=ALL_UNIT,6=ALL_GRID,7=SYSTEM,8=OUR_ALL,9=ENEMY_ALL
  triggerVal: number;  // trigger threshold (e.g. HP% for HP_DOWN/HP_UP triggers)
  triggerKey: string;  // raw BETV2 string key when not numeric (Effect_ or char ID)
  triggerName: string; // resolved loc ID for triggerKey if it's an Effect_
  applyCond: number;     // BUFFEFFECT_TRIGGER_APPLY_CONDITION ordinal (63 = NONE)
  applyCondVals: string[];  // condition parameters (count/effect/char keys); multiple when BETAC=NONE
  applyCondNames: string[]; // resolved loc IDs for each applyCondVals entry
  applyCondAttrs: number[]; // per-entry attr of the referenced effect (-1=unknown); uses BUFF_ATTR_TYPE
  condAttr: number;    // BETBAT: attr type constraint (BUFF_ATTR_TYPE: 0=Buff,1=Debuff,3=Etc,6=Any)
  turns: number;   // 0 = instant/no duration
  rate: number;    // 0..1 application chance
  val: number;     // effect value at skill level 1 — interpret per fmt
  gain: number;    // per-(skill/buff-debuff)-level increment of val; value@L = val + gain*(L-1)
  fmt: string;     // "pct" (val*100%), "flat" (raw num), "tid" (val=target type ID), "none"
  desc: string;    // loc ID for per-effect description (resolve with t())
  type: number;    // BUFFEFFECT_TYPE ordinal
  eraseType: number;   // BUFFEFFECT_ERASE_TYPE (0=ROUND,1=COUNT,2=TRIGGER,3=PERMANENT,4=PRESERVE)
  eraseVal: number;    // erase threshold (e.g. trigger count for COUNT type)
  overlapType: number; // BUFF_OVERLAP_TYPE (0=NONE,1=RENEW,2=ADDTURN,3=OVERLAP,4=UPDATE)
  overlapMax: number;  // max stacks when overlapType=OVERLAP (0=unlimited)
  filterBody: number[];  // AABT: body types this applies to (0=Bioroid,1=AGS); empty=all
  filterClass: number[]; // AACT: class types (0=Light,1=Heavy,2=Flying); empty=all
  filterRole: number[];  // AART: roles (0=Defender,1=Attacker,2=Supporter); empty=all
}

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
  // official description; the old hand text embedded it inline as $(rate). `rate`
  // is the skill-level-1 base; `rateGain` is the per-level increment (player skills
  // scale 1..10 — skill power at level L = rate + rateGain*(L-1)). Monsters: 0.
  rate: number;
  rateGain?: number;
  buffs: SkillBuff[];
  // significant per-level changes (player skills only): AP drops, AoE (grid)
  // shifts, buff-duration changes — keyed by the level they take effect.
  levelChanges?: SkillLevelChange[];
}

// A per-level change to a skill (only levels where something significant changes).
export interface SkillLevelChange {
  level: number;
  ap?: number;          // new NeedActionPoint at this level
  area?: number[];      // new 9-cell AoE grid
  center?: number;      // new AoE center cell
  turns?: number[];     // new per-slot buff durations
}
