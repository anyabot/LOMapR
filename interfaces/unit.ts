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
  type: string;        // Light / Heavy / Flying (ActorClassType)
  role: string;        // Defender / Attacker / Supporter (RoleType)
  body: string;        // AGS / Bioroid (ActorBodyType)
  icon: string;        // FormationIcon_* portrait key — PNG at /images/icons/<icon>.png
  invenIcon: string;   // InvenIcon_* fallback (used when the portrait is missing)
  skills: string[];    // skill keys (resolve via the unit skill bundle)
  favor: {             // favor-gain ratios for the various sources
    clear: number;
    death: number;
    assistant: number;
    present: number;
  };
  craft: number;       // making time (seconds)
  stat: UnitStat[];    // one block per attainable grade (rarity..maxGrade)
  promotions: UnitPromotion[];
  lvLimits: UnitLvLimit[];
  // worldId -> [[zoneNum, stageTitle], ...] stages that can drop/award this unit.
  source: { [worldId: string]: [number, string][] };
  // pointer to the unit id that OWNS this unit's deduped skill bundle
  // (split/units/<ownerId>.json); absent means it owns its own file (use id).
  skillsRef?: string;
}
