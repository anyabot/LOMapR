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

// One skin entry (Table_CharSkin row, or the unit's own base look when key === '').
// model/modelDam are 2D-model asset keys (PC2DModelID*) — lowercase them to match
// the skin-viewer archive name (<key>.tar.br, or <key>__global.tar.br/<key>__kr.tar.br
// when that specific asset is diverged). viewerKind is which export pipeline (if any)
// can render it; undefined means mass_pipeline.py hasn't processed this asset yet.
export interface UnitSkin {
  key: string;
  name: string;      // loc id — SkinPackName_* (pack/event title, from CharSkin table)
  desc: string;      // loc id — SkinDesc_* (description)
  itemName: string;  // loc id — SkinName_* (individual skin name from consumable item)
  packName: string;  // loc id — SkinPackName_* (shop package name, same source as name)
  category: string[];
  unlockItem: string;
  reqGrade: number;
  sensitive: boolean;
  price: number | null;
  parts: string[];   // SKIN_IN_PARTS_TYPE names (VOICE, SD_EFFECT, ...)
  model: string;      // 2D-model asset key (base look)
  modelDam: string;   // 2D-model asset key (damaged look), '' if none
  faceKey: string;
  faceDamKey: string;
  bgUse: boolean;
  bgDamUse: boolean;
  modelDiverged?: boolean;     // model asset: global/kr render genuinely different art
  modelDamDiverged?: boolean;  // modelDam asset: global/kr render genuinely different art
  viewerKind?: 'fixed' | 'spine' | 'skinned';  // 'skinned' = old animated rig, not supported by the viewer yet
}

// A unit record. The build splits each unit into a LIGHT list record (the always-
// present fields below, in split/units/unit_list.json — grid + hover card) and a
// per-unit bundle split/units/<id>.json = { skills, detail } that carries the HEAVY
// detail fields (marked optional here). selectUnitFull merges the two; on the list /
// hover card only the light fields exist, so detail fields read as undefined until
// the bundle loads. In the light list, `profile` is trimmed to {engName, number};
// the full UnitProfile arrives with the detail bundle.
export interface UnitData {
  // ── light list fields (always present) ──────────────────────────────────────
  id: string;
  name: string;        // loc id (resolve with t())
  canonName: string;   // canonical hand-curated English display name (from unit_names.json)
  rarity: number;      // StartGrade (2=B, 3=A, 4=S, 5=SS, 6=SSS)
  maxGrade: number;    // highest attainable grade via promotion
  type: string;        // Light / Heavy / Air (ActorClassType; MOBILITY shows as Air)
  role: string;        // Defender / Attacker / Supporter (RoleType)
  body: string;        // AGS / Bioroid (ActorBodyType)
  icon: string;        // FormationIcon_* portrait key — PNG at /images/icons/<icon>.png
  invenIcon: string;   // InvenIcon_* fallback (used when the portrait is missing)
  // collection profile (Table_CharCollection); null if none. In the LIGHT list only
  // {engName, number} are populated — the full profile rides in the detail bundle.
  profile: UnitProfile | null;
  // squad/faction this unit belongs to (Table_TroopCategory); null if squad-less.
  // name/desc are loc ids (resolve with t()); icon is a UI_TroopIcon_* key
  // (PNG at /images/common/<icon>.png).
  faction: { name: string; desc: string; icon: string } | null;
  // exclusive gear locked to this unit (equip family ids, via the equip's pcLimit).
  exclusiveEquip?: string[];

  // ── heavy detail fields (present only after the per-unit bundle merges) ──────
  skills?: string[];    // skill keys (resolve via the unit skill bundle)
  // second ("change") form's skill set — a transform with its own active skills,
  // sharing the base unit's stats/grade. Empty for single-form units.
  skillsCh?: string[];
  favor?: {             // favor-gain ratios for the various sources
    clear: number;
    death: number;
    assistant: number;
    present: number;
  };
  craft?: number;       // making time (seconds)
  marriage?: boolean;   // marriage content available (MarriageKey in Table_Marriage)
  affection?: boolean;  // can gain affection (Gender 1) → can reach 200 (+1 buff/debuff lv)
  secretRoom?: string;  // secret-room CG type: 'Adult' | 'Child' | 'AGS' | 'Sengoku' | ''
  // the 4 equipment slots (lv 20/40/60/80 unlocks), each Chip / OS / Item.
  equip?: { type: 'Chip' | 'OS' | 'Item'; level: number }[];
  // core-link bonuses. linkBonus = normal bonuses applied per link (stack up to
  // 5×); fullLinkBonus = the 5 options selectable at 500% link. Each entry's
  // `desc` is a loc-id template ("HP+{0}%"); fill {0} with value*100 when pct,
  // else the flat value.
  linkBonus?: LinkBonus[];
  fullLinkBonus?: LinkBonus[];
  stat?: UnitStat[];    // one block per attainable grade (rarity..maxGrade)
  promotions?: UnitPromotion[];
  lvLimits?: UnitLvLimit[];
  // worldId -> [[zoneNum, stageTitle, farm], ...] stages that grant this unit.
  // farm=true: drops from a wave (repeatable); farm=false: one-time clear reward.
  source?: { [worldId: string]: [number, string, boolean][] };
  // [base look, ...purchasable skins]. base.key === ''.
  skins?: UnitSkin[];
}

// A unit with its detail bundle merged in — every heavy field guaranteed present.
// Use as the prop type for detail-page sub-components rendered only after the bundle
// loads (selectUnitFull + the detailLoaded gate guarantee this at runtime).
export type FullUnitData = UnitData & Required<Pick<UnitData,
  'skills' | 'skillsCh' | 'favor' | 'craft' | 'marriage' | 'affection' |
  'secretRoom' | 'equip' | 'linkBonus' | 'fullLinkBonus' | 'stat' |
  'promotions' | 'lvLimits' | 'source' | 'skins'>>;
