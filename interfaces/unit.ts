// Playable unit (character) combat data, built from the Table_PC* tables by
// tools/transform/build_data.py (build_unit). Profile fields (height/weapon/
// country/cv/...) aren't carried yet — this is the combat-data pass.

// One material requirement: a raw item/consumable id + quantity. Display name +
// icon resolve through the item lookup table (selectItems), same as RewardEntry.
export interface UnitReq {
  id: string;
  count: number;
}

// One promotion step (grade-up): the target grade and what it costs.
export interface UnitPromotion {
  to: number;        // target PromotionGrade (3=A, 4=S, 5=SS, 6=SSS)
  level: number;     // required unit level
  favor: number;     // required favor (affection) points
  req: UnitReq[];    // material costs
}

// One level-cap unlock (level 101..120) and its material costs.
export interface UnitLvLimit {
  level: number;
  items: UnitReq[];
}

// One core-link bonus. `desc` is a loc-id template with a {0} placeholder; fill it
// with value*100 (a percent) when pct, else the flat value.
export interface LinkBonus {
  desc: string;
  value: number;
  pct: boolean;
}

// Collection/profile info (Table_CharCollection). engName/height/weight are
// literals; weapons & desc are loc ids (resolve with t()). chart = the in-game
// radar-hexagon values [ATK, ATK rate, SPD, HP, DEF, Assist].
export interface UnitProfile {
  engName: string;
  number: number;
  height: string;
  weight: string;
  weapons: string[];
  desc: string;
  chart: number[];
}

// One grade's stat block. HP/ATK/DEF are [base@lv1, max@lv100]; the rest are
// scalars at lv1 (level growth only affects HP/ATK/DEF). resist is whole-percent.
export interface UnitStat {
  HP: [number, number];
  ATK: [number, number];
  DEF: [number, number];
  SPD: number;
  CRI: number;
  ACC: number;
  EVA: number;
  resist: { fire: number; ice: number; lightning: number };
}

export interface UnitData {
  id: string;
  name: string;        // loc id (resolve with t())
  rarity: number;      // StartGrade (2=B, 3=A, 4=S, 5=SS, 6=SSS)
  maxGrade: number;    // highest attainable grade via promotion
  type: string;        // Light / Heavy / Air (ActorClassType; MOBILITY shows as Air)
  role: string;        // Defender / Attacker / Supporter (RoleType)
  body: string;        // AGS / Bioroid (ActorBodyType)
  icon: string;        // FormationIcon_* portrait key — PNG at /images/icons/<icon>.png
  invenIcon: string;   // InvenIcon_* fallback (used when the portrait is missing)
  skills: string[];    // skill keys (resolve via the unit skill bundle)
  // second ("change") form's skill set — a transform with its own active skills,
  // sharing the base unit's stats/grade. Empty for single-form units.
  skillsCh: string[];
  favor: {             // favor-gain ratios for the various sources
    clear: number;
    death: number;
    assistant: number;
    present: number;
  };
  craft: number;       // making time (seconds)
  marriage: boolean;   // marriage content available (MarriageKey in Table_Marriage)
  affection: boolean;  // can gain affection (Gender 1) → can reach 200 (+1 buff/debuff lv)
  secretRoom: string;  // secret-room CG type: 'Adult' | 'Child' | 'AGS' | 'Sengoku' | ''
  profile: UnitProfile | null;  // collection profile (Table_CharCollection); null if none
  // squad/faction this unit belongs to (Table_TroopCategory); null if squad-less.
  // name/desc are loc ids (resolve with t()); icon is a UI_TroopIcon_* key
  // (PNG at /images/common/<icon>.png).
  faction: { name: string; desc: string; icon: string } | null;
  // the 4 equipment slots (lv 20/40/60/80 unlocks), each Chip / OS / Item.
  equip: { type: 'Chip' | 'OS' | 'Item'; level: number }[];
  // core-link bonuses. linkBonus = normal bonuses applied per link (stack up to
  // 5×); fullLinkBonus = the 5 options selectable at 500% link. Each entry's
  // `desc` is a loc-id template ("HP+{0}%"); fill {0} with value*100 when pct,
  // else the flat value.
  linkBonus: LinkBonus[];
  fullLinkBonus: LinkBonus[];
  stat: UnitStat[];    // one block per attainable grade (rarity..maxGrade)
  promotions: UnitPromotion[];
  lvLimits: UnitLvLimit[];
  // worldId -> [[zoneNum, stageTitle, farm], ...] stages that grant this unit.
  // farm=true: drops from a wave (repeatable); farm=false: one-time clear reward.
  source: { [worldId: string]: [number, string, boolean][] };
  // pointer to the unit id that OWNS this unit's deduped skill bundle
  // (split/units/<ownerId>.json); absent means it owns its own file (use id).
  skillsRef?: string;
}
