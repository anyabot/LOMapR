export interface SkillBuff {
  group: number;   // LBEI entry index — all slots from the same entry share this
  effectKey?: string; // LBEI Key field (e.g. "Effect_DS_GraveSong_N_34"), used for cond64 linking
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
  applyCondCount: number; // BETV_Sub[0]: threshold for count-of-buff conds (e.g. applyCond 20 = have >= N of applyCondVals); 0 if n/a
  applyCondSubs?: number[]; // cond 64 only: per-entry apply chances (parallel to applyCondVals)
  condAttr: number;    // BETBAT: attr type constraint (BUFF_ATTR_TYPE: 0=Buff,1=Debuff,3=Etc,6=Any)
  // optional SECOND apply-condition, AND-combined with the first
  applyCond2?: number;
  applyCondVals2?: string[];
  applyCondNames2?: string[];
  applyCondAttrs2?: number[];
  applyCondCount2?: number;
  condAttr2?: number;
  turns: number;   // 0 = instant/no duration
  rate: number;    // application chance multiplier (normally 0..1; can exceed 1)
  val: number;     // effect value at skill level 1 — interpret per fmt
  gain: number;    // per-(skill/buff-debuff)-level increment of val; value@L = val + gain*(L-1)
  vals?: number[]; // per-level values when non-linear (gain alone can't reproduce them); index 0 = lv1
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
  // 9-cell damage-rate grid (row-major); 0 = not hit, >0 = that cell's multiplier
  area: number[];
  center: number;
  description: string;
  attr: string | undefined;
  leastRank: number;
  // additive ACC correction for this skill, and whether it ignores Protect
  accuracy: number;
  guardPierce: boolean;
  // SkillAttackRate, filling {0} in the official description. `rate` is level 1 and
  // `rateGain` the per-level increment (player skills 1..10); monsters are 0.
  rate: number;
  rateGain?: number;
  buffs: SkillBuff[];
  // significant per-level changes (player skills only), keyed by effective level
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
