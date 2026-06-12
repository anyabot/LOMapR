import { TabPanel, Text, Image, Box, Flex, VStack, HStack, Tag, Wrap, WrapItem, Tooltip } from "@chakra-ui/react";

// TARGET_TYPE ordinal -> label (BETT2); 0=SELF omitted (self is default/obvious)
const TARGET_LABELS: Record<number, string> = {
  1: "→ ally",
  2: "→ ally (grid)",
  3: "→ enemy",
  4: "→ enemy (grid)",
  5: "→ all units",
  6: "→ all (grid)",
  8: "→ all allies",
  9: "→ all enemies",
};

// BUFFEFFECT_TRIGGER_TYPE ordinal -> human-readable activation condition
// {0} in the label is replaced with triggerVal (e.g. HP threshold)
const TRIGGER_LABELS: Record<number, string> = {
  0:  "On skill use",
  1:  "When hit",
  2:  "On hit",
  3:  "When target is buffed",
  4:  "Based on grid position",
  5:  "HP ≤ {0}%",
  6:  "HP ≥ {0}%",
  7:  "Targeting ally",
  8:  "When enemy present (wave start)",
  9:  "On ally death",
  10: "On death",
  11: "On enemy kill",
  12: "Always",
  13: "Battle start",
  14: "After using specific skill",
  15: "On attack",
  16: "When attacked",
  17: "On wait",
  18: "On move",
  19: "On evade",
  20: "After wave",
  21: "If buffed: {key}",
  22: "On kill",
  23: "On hit + if buffed",
  24: "On kill (passive)",
  25: "HP ≤ {0}%",
  26: "HP ≥ {0}%",
  27: "If self in front row",
  28: "If self in mid row",
  29: "If self in back row",
  30: "Round start",
  31: "On critical hit",
  32: "If self buffed: {key}",
  33: "If self debuffed: {key}",
  34: "If {key} in grid",
  35: "When enemy uses skill",
  36: "On hit (passive)",
  37: "On resurrect",
  38: "When hit (physical)",
  39: "When hit (fire)",
  40: "When hit (ice)",
  41: "When hit (lightning)",
  42: "After counter-attack",
  43: "After being attacked",
  44: "When hit by active skill",
  45: "When damaged by active skill",
  46: "On evade (active skill)",
  47: "On summon",
  48: "On hit (active skill)",
  49: "When hit by specific active skill",
  50: "On use skill 1",
  51: "On use skill 2",
  52: "After support attack",
  53: "After joint attack",
  54: "On skill miss (self)",
  55: "When active skill misses",
  56: "On kill + counter-kill",
  57: "When ally is hit",
  58: "When ally hit (physical)",
  59: "When ally hit (fire)",
  60: "When ally hit (ice)",
  61: "When ally hit (lightning)",
  62: "When ally hit (active skill)",
  63: "When ally hits",
  64: "When ally uses skill",
};

// BUFFEFFECT_TRIGGER_APPLY_CONDITION ordinal -> label template
// {0} = applyCondVal (count or key); 63 = NONE (omit)
const APPLY_COND_LABELS: Record<number, string> = {
  0:  "If self has [buff type]",
  1:  "If self has [buff]",
  2:  "If self in front row",
  3:  "If self in mid row",
  4:  "If self in back row",
  5:  "If self HP ≥ {0}%",
  6:  "If self HP ≤ {0}%",
  7:  "If self HP < {0}%",
  8:  "If self HP > {0}%",
  9:  "If self has [buff] stacks",
  10: "If target has [buff type]",
  11: "If target has [buff]",
  12: "If target HP ≥ {0}%",
  13: "If target HP ≤ {0}%",
  14: "If target is [char]",
  15: "If [char] in battle",
  16: "If target in front row",
  17: "If target in mid row",
  18: "If target in back row",
  19: "If self has [buff] (joint)",
  20: "If self has ≥ {0} [buff]",
  21: "If self HP in range",
  22: "If self missing [buff]",
  23: "If target has ≥ {0} stacks",
  24: "If self missing [buff] (joint)",
  25: "If ≥ {0} other allies alive",
  26: "If ≥ {0} allies alive",
  27: "If ≥ {0} units alive",
  28: "On round {0} and after",
  29: "On round {0} and before",
  30: "If [char] not in battle",
  31: "If self has ≥ {0} buffs",
  32: "On round {0}",
  33: "If ≥ {0} Bio allies",
  34: "If ≥ {0} AGS allies",
  35: "If ≥ {0} Bio enemies",
  36: "If ≥ {0} AGS enemies",
  37: "If ally has [buff]",
  38: "If ≥ {0} allies of class",
  39: "If ≥ {0} allies of role",
  40: "If self is troop type",
  41: "On even round",
  42: "On odd round",
  43: "If target missing any [buff]",
  44: "If target missing [buff]",
  45: "If ≥ {0} enemies of class",
  46: "If ≥ {0} enemies of role",
  47: "If self ATK > self DEF",
  48: "If self ATK < self DEF",
  49: "If self ATK > target ATK",
  50: "If self ATK < target ATK",
  51: "If self DEF > target DEF",
  52: "If self DEF < target DEF",
  53: "If self EVD > target EVD",
  54: "If self EVD < target EVD",
  55: "If self SPD > target SPD",
  56: "If self SPD < target SPD",
  57: "If self missing [buff type]",
  58: "If target missing [buff type]",
  59: "If ally nearby",
  60: "If no ally nearby",
  61: "If target has ≥ {0} [buff]",
  62: "If target missing [buff] (joint)",
  64: "Random: if target has [buff]",
  65: "If ≥ {0} of [char] in battle",
  66: "If enemy has [buff]",
  67: "If ≥ {0} of ally [buff]",
  68: "If ≥ {0} of enemy [buff]",
};
const BODY_NAMES:  Record<number, string> = { 0: "AGS", 1: "Bioroid" };
const CLASS_NAMES: Record<number, string> = { 0: "Light", 1: "Heavy", 2: "Flying" };
const ROLE_NAMES:  Record<number, string> = { 0: "Defender", 1: "Attacker", 2: "Supporter" };

const BUFF_TYPE_NAMES: Record<number, string> = {
  0:  "ATK",              // STAT_ATK_VALUE
  1:  "ATK",              // STAT_ATK_RATIO
  2:  "DEF",              // STAT_DEF_VALUE
  3:  "DEF",              // STAT_DEF_RATIO
  4:  "HP",               // STAT_HP_VALUE
  5:  "HP",               // STAT_HP_RATIO
  6:  "ACC",              // STAT_RATING_VALUE
  7:  "ACC",              // STAT_RATING_RATIO
  8:  "CRIT",             // STAT_CRITICAL_VALUE
  9:  "CRIT",             // STAT_CRITICAL_RATIO
  10: "EVA",              // STAT_AVOID_VALUE
  11: "EVA",              // STAT_AVOID_RATIO
  12: "SPD",              // STAT_SPEED_VALUE
  13: "SPD",              // STAT_SPEED_RATIO
  14: "Fire RES",         // STAT_RESFIRE_VALUE
  15: "Fire RES",         // STAT_RESFIRE_RATIO
  16: "Ice RES",          // STAT_RESICE_VALUE
  17: "Ice RES",          // STAT_RESICE_RATIO
  18: "Lightning RES",    // STAT_RESLIGHTNING_VALUE
  19: "Lightning RES",    // STAT_RESLIGHTNING_RATIO
  20: "AP",               // STAGE_AP_VALUE
  21: "Set AP",               // STAGE_AP_SHIFT
  22: "Stun",             // STAGE_AP_STOP
  23: "Recon",  // UI_INFO_NEXTENEMY
  24: "Thorns",           // STAGE_THORNS_RATIO
  25: "Phys Reflect",     // STAGE_REFLECTPHYSICS_VALUE
  26: "Fire Reflect",     // STAGE_REFLECTFIRE_VALUE
  27: "Ice Reflect",      // STAGE_REFLECTICE_VALUE
  28: "Lightning Reflect",// STAGE_REFLECTLIGHTNIG_VALUE
  29: "Counterattack",    // STAGE_REFLECTPHYSICS_RATIO_DEFENDER
  30: "Fire Reflect",     // STAGE_REFLECTFIRE_RATIO_DEFENDER
  31: "Ice Reflect",      // STAGE_REFLECTICE_RATIO_DEFENDER
  32: "Lightning Reflect",// STAGE_REFLECTLIGHTNIG_RATIO_DEFENDER
  33: "Damage Nullify",   // STAGE_IMMUNESHIELD_TIME  (val = count of hits nullified)
  34: "Damage Minimize",  // STAGE_SHIELD_VALUE       (val = damage threshold)
  35: "Damage Minimize",  // STAGE_SHIELD_VALUE_LIMITED
  36: "DMG Reduction",       // STAGE_SHIELD_RATIO       (val = ratio)
  37: "DMG Reduction",       // STAGE_SHIELD_RATIO_LIMITED
  38: "Barrier",           // STAGE_IMMUNESHIELD_VALUE  (val = flat HP absorbed)
  39: "Phys DMG Taken",   // STAGE_DAMAGEPHYSICS_RATIO
  40: "Phys DMG Taken",   // STAGE_DAMAGEPHYSICS_VALUE
  41: "Fire DMG Taken",   // STAGE_DAMAGEFIRE_RATIO
  42: "Fire DMG Taken",   // STAGE_DAMAGEFIRE_VALUE
  43: "Ice DMG Taken",    // STAGE_DAMAGEICE_RATIO
  44: "Ice DMG Taken",    // STAGE_DAMAGEICE_VALUE
  45: "Lightning DMG Taken", // STAGE_DAMAGELIGHTNING_RATIO
  46: "Lightning DMG Taken", // STAGE_DAMAGELIGHTNING_VALUE
  47: "Marked",          // STAGE_LOCKON01_TIME
  48: "DMG Taken Increased",          // STAGE_ADDDAMAGE_RATIO
  49: "DMG Taken Increased",          // STAGE_ADDDAMAGE_VALUE
  50: "Column Protect",   // STAGE_BLOCK_LINE
  51: "Row Protect",     // STAGE_BLOCK_GRID
  52: "Push Back",        // STAGE_MOVE_BACK
  53: "Pull Forward",     // STAGE_MOVE_FRONT
  54: "CRIT (Next Attack)",      // STAGE_CRITICAL_NEXTATTACK
  55: "Range",            // STAT_RANGE_VALUE
  56: "Aggro",            // STAGE_AGRO_VALUE
  57: "DEF Penetration",       // STAGE_DEFPIERCE_VALUE
  58: "DEF Penetration",       // STAGE_DEFPIERCE_RATIO
  59: "Grid Change",      // STAGE_GRID_CHANGE
  60: "Anti-Light DMG",   // STAGE_TROOPERTYPEDMGBONUS_RATIO
  61: "Anti-Heavy DMG",   // STAGE_ARMOREDTYPEDMGBONUS_RATIO
  62: "Anti-Air DMG",     // STAGE_MOBILITYTYPEDMGBONUS_RATIO
  63: "Change Form",      // STAGE_CHARCHANGE_PERMANENT
  64: "Change Form",// STAGE_CHARCHANGE_LIMITED
  65: "Phys DoT",         // STAGE_PHYSICS_DOT
  66: "Fire DoT",         // STAGE_FIRE_DOT
  67: "Ice DoT",          // STAGE_ICE_DOT
  68: "Lightning DoT",    // STAGE_LIGHTNING_DOT
  69: "Remove Buff (type)",// STAGE_REMOVE_BUFF_ENUM
  70: "Fixed Phys DMG",         // STAGE_PHYSICS_DAMAGE_APPLY
  71: "Fixed Fire DMG",         // STAGE_FIRE_DAMAGE_APPLY
  72: "Fixed Ice DMG",          // STAGE_ICE_DAMAGE_APPLY
  73: "Fixed Lightning DMG",    // STAGE_LIGHTNING_DAMAGE_APPLY
  74: "Provoked",            // STAGE_PROVOKE
  75: "Row Protect",      // STAGE_BLOCK_ROW
  76: "Target Protect",   // STAGE_BLOCK_CHARACTER
  77: "Follow-up Attack",        // STAGE_SUPPORT_ATTACK
  78: "Rooted",             // STAGE_SNARE
  79: "Silenced",          // STAGE_SEAL_SKILL
  80: "DMG Amp (by own HP)", // STAGE_DAMAGEAMP_BYHP_ME
  81: "DMG Amp (by target HP)", // STAGE_DAMAGEAMP_BYHP_OPP
  82: "Battle Continuation",           // STAGE_RESURRECT
  83: "Additional Phys DMG",   // STAGE_DAMAGEPHYSICS_RATIO_INS
  84: "Additional Fire DMG",   // STAGE_DAMAGEFIRE_RATIO_INS
  85: "Additional Ice DMG",    // STAGE_DAMAGEICE_RATIO_INS
  86: "Additional Lightning DMG", // STAGE_DAMAGELIGHTNING_RATIO_INS
  87: "Marked",             // STAGE_MARKING
  88: "Remove Buff",      // STAGE_REMOVE_BUFF
  89: "Remove Debuff",    // STAGE_REMOVE_DEBUFF
  90: "Status Resist",      // STAGE_DEBUFF_RATEUP
  91: "Status Resist",    // STAGE_DEBUFF_PERDOWN
  92: "Buff Rate", // STAGE_BUFFEFFECTRATE_CHANGE
  93: "Remove Summon",    // REMOVE_SUMMON_INSTENV
  94: "Ignore Barrier / DMG Reduction",   // BARRIER_PIERCE
  95: "EXP Up",           // STAGE_EXP_UP
  96: "Analyze",          // STAGE_ANALYZE
  97: "Remove ALL Effects",// STAGE_REMOVE_BUFF_KEY_ALL_ATTRTYPE
  98: "Battle Continuation",        // STAGE_RESURRECT_RATIO
  99: "Remove All Buffs", // STAGE_REMOVE_ALL_BUFF
  100: "Remove All Debuffs", // STAGE_REMOVE_ALL_DEBUFF
  101: "Debuff Immunity",  // STAGE_IMMUNITY_DEBUFF
  102: "Cooperative Attack with Active Skill 1", // STAGE_TOGETHER_ATTACK_ACTIVE_SKILL_1
  103: "Cooperative Attack with Active Skill 2", // STAGE_TOGETHER_ATTACK_ACTIVE_SKILL_2
  104: "Max HP",           // STAT_MAXHP_VALUE
  105: "Max HP",           // STAT_MAXHP_RATIO
  106: "Skill Power",        // STAT_SKILL_RATIO
  107: "Range (skill 1)",  // STAT_RANGE_VALUE_ACTIVE_SKILL_1
  108: "Range (skill 2)",  // STAT_RANGE_VALUE_ACTIVE_SKILL_2
  109: "Area DMG Focus",   // FOCUSED_ATTACK
  110: "Area DMG Dispersion", // DAMAGE_DISPERSE
  111: "Skill Power Proportional to Own EVA", // EVADE_SKILLDMGUP_ME
  112: "Skill Power Resist Proportional to Own EVA", // EVADE_SKILLDMGDOWN
  113: "Skill Power Proportional to Own DEF", // DEF_SKILLDMGUP_ME
  114: "CRIT Resist Proportional to Own DEF",  // DEF_CRTDOWN
  115: "Proportional ATK Up", // BUFFER_ATK_ATKUP
  116: "Min Fire RES",     // RESFIRE_VALUE_MIN
  117: "Min Ice RES",      // RESICE_VALUE_MIN
  118: "Min Lightning RES",// RESLIGHTNING_VALUE_MIN
  119: "Fire RES Fix",     // RESFIRE_VALUE_FIX
  120: "Ice RES Fix",      // RESICE_VALUE_FIX
  121: "Lightning RES Fix",// RESLIGHTNING_VALUE_FIX
  122: "Reverse Fire RES Debuff",       // RESFIRE_DEBUFF_REVERSE
  123: "Reverse Ice RES Debuff",        // RESICE_DEBUFF_REVERSE
  124: "Reverse Lightning RES Debuff",  // RESLIGHTNING_DEBUFF_REVERSE
  125: "Buff Prevention",  // BUFF_DISALLOW
  126: "Buff Removal Resist", // REMOVE_BUFF_RESIST
  127: "Max Action Count",     // ACTION_NUMBER_CHANGE
  128: "Taunt (attacker)", // PROVOKE_ATTACKER
  129: "DEF Penetration Resist Proportional to Own current HP", // CURRENT_HP_PIERCEDOWN
  130: "Ignore Protection Activated", // GUARDPIERCE_APPLY
  131: "Ignore Protection Disabled",    // GUARDPIERCE_NO_APPLY
  132: "DMG Recovery (round)", // DAMAGE_RECOVER_THISROUND
  133: "Same Skill DMG Reduce", // SAME_SKILL_HIT_DAMAGE_REDUCE
  134: "Silenced (skill 1)", // STAGE_SEAL_SKILL_ACTIVE_1
  135: "Silenced (skill 2)", // STAGE_SEAL_SKILL_ACTIVE_2
  136: "Silenced (passive)", // STAGE_SEAL_SKILL_PASSIVE
  137: "Add Role Type",    // ADD_ROLE_TYPE
  138: "Area Skill Power", // WIDE_SKILL_RATIO
  139: "Area DMG",         // WIDE_DAMAGE_RATIO
  140: "Double Attack",    // STAGE_DOUBLE_ATTACK_RATIO
  141: "Resist Check ATK", // RESIST_CHECK_ATTACK_POWER
  142: "DEF DMG Reduce",   // DEF_DAMAGE_REDUCE
  143: "DEF DMG Add",      // DEF_DMG_ADD
  144: "DMG (% giver max HP)",     // RATIO_DMG_GIVER_MAX_HP
  145: "DMG (% giver cur HP)",     // RATIO_DMG_GIVER_CURRENT_HP
  146: "DMG (% target max HP)",    // RATIO_DMG_TARGET_MAX_HP
  147: "DMG (% target cur HP)",    // RATIO_DMG_TARGET_CURRENT_HP
  148: "AP Cost Adjust (skill 1)", // ADJUST_AP_ACTIVE_SKILL_1
  149: "AP Cost Adjust (skill 2)", // ADJUST_AP_ACTIVE_SKILL_2
  150: "Buff Prevention (specific)", // BUFF_DISALLOW_SPECIFIC
  151: "All Effect Prevention (specific)", // ENUM_DISALLOW_SPECIFIC
  // 152: __MAX__
};

const NOTE_EXPLANATIONS: Record<string, string> = {
  Instant: "Applied immediately and does not persist.",
  Renew: "Removes all existing stacks of this effect and replaces them with a new one.",
  Single: "Only applied if no instance of this effect already exists.",
  Update: "Adds a new stack until the limit is reached; once at the limit, removes the oldest stack and adds a new one.",
};
import { Skill, SkillBuff } from "@/interfaces/skill";
import { t } from "@/lib/strings";
import EffectTooltip from "./effectTooltip";
import SkillArea from "./skillArea";
import React, { useCallback } from "react";

const keyword = (count: number, e: string) => {
  switch (e.toLowerCase()) {
    case "stunned":
      return <EffectTooltip label="Stunned" count={count} e={e} icon="Stunned" type="debuff"/>
    case "minimize damage x":
      return <EffectTooltip label="Minimize Damage below 999999" count={count} e={e} icon="DR" type="buff"/>
    case "row protect":
      return <EffectTooltip label="Row Protect" count={count} e={e} icon="Row_Protect" type="buff"/>
    case "column protect":
      return <EffectTooltip label="Column Protect" count={count} e={e} icon="Column_Protect" type="buff"/>
    case "target protect":
      return <EffectTooltip label="Target Protect" count={count} e={e} icon="Target_Protect" type="buff"/>
    case "effect removal":
      return <EffectTooltip label="Temp" count={count} e={e} icon="Buff_Removal" type="unknown"/>
    case "buff removal":
      return <EffectTooltip label="Remove a specific buff" count={count} e={e} icon="Buff_Removal" type="debuff"/>
    case "debuff removal":
      return <EffectTooltip label="Remove a specific deuff" count={count} e={e} icon="Debuff_Removal" type="normal"/>
    case "enhancement removal":
      return <EffectTooltip label="Temp" count={count} e={e} icon="Buff_Removal" type="unknown"/>
    case "charged":
      return <EffectTooltip label="Next attack always Crits" count={count} e={e} icon="Charged" type="buff"/>
    case "provoked":
      return <EffectTooltip label="Provoked" count={count} e={e} icon="Provoked" type="debuff"/>
    case "follow-up attack":
      return <EffectTooltip label="Follow-Up Attack" count={count} e={e} icon="Follow_Up_Attack" type="buff"/>
    case "rooted":
      return <EffectTooltip label="Rooted" count={count} e={e} icon="Rooted" type="debuff"/>
    case "silenced":
      return <EffectTooltip label="Silenced" count={count} e={e} icon="Silenced" type="debuff"/>
    case "marked":
      return <EffectTooltip label="Marked" count={count} e={e} icon="Marked" type="debuff"/>
    case "piercing":
      return <EffectTooltip label="Ignore Barrier / Damage Reduction" count={count} e={e} icon="Ignore_Barrier_DR" type="buff"/>
    case "disarm":
      return <EffectTooltip label="Remove all buffs" count={count} e={e} icon="Buff_Removal" type="debuff"/>
    case "neutralize":
      return <EffectTooltip label="Remove all debuffs" count={count} e={e} icon="Debuff_Removal" type="normal"/>
    case "immunity":
      return <EffectTooltip label="Immunity to certain effects" count={count} e={e} icon="Immunity" type="unknown"/>
    case "fire counteraction":
      return <EffectTooltip label="Fire Resist Reversal" count={count} e={e} icon="Fire_Resist_Reversal" type="buff"/>
    case "ice counteraction":
      return <EffectTooltip label="Ice Resist Reversal" count={count} e={e} icon="Ice_Resist_Reversal" type="buff"/>
    case "electric counteraction":
      return <EffectTooltip label="Electric Resist Reversal" count={count} e={e} icon="Electric_Resist_Reversal" type="buff"/>
    case "lockdown":
      return <EffectTooltip label="Buff Prevention" count={count} e={e} icon="Buff_Prevention" type="debuff"/>
    case "bypass":
      return <EffectTooltip label="Ignore Protect Activated" count={count} e={e} icon="Ignore_Protect_Activated" type="buff"/>
    case "cover":
      return <EffectTooltip label="Ignore Protect Disabled" count={count} e={e} icon="Ignore_Protect_Disabled" type="debuff"/>
    case "def up x":
      return <EffectTooltip label="DEF +500%" count={count} e={e} icon="Def_Up" type="buff"/>
    case "def up 1":
      return <EffectTooltip label="DEF +10%" count={count} e={e} icon="Def_Up" type="buff"/>
    case "def up 2":
      return <EffectTooltip label="DEF +20%" count={count} e={e} icon="Def_Up" type="buff"/>
    case "def up 3":
      return <EffectTooltip label="DEF +30%" count={count} e={e} icon="Def_Up" type="buff"/>
    case "def up 4":
      return <EffectTooltip label="DEF +40%" count={count} e={e} icon="Def_Up" type="buff"/>
    case "def up 5":
      return <EffectTooltip label="DEF +50%" count={count} e={e} icon="Def_Up" type="buff"/>
    case "def down 1":
      return <EffectTooltip label="DEF -10%" count={count} e={e} icon="Def_Down" type="debuff"/>
    case "def down 2":
      return <EffectTooltip label="DEF -20%" count={count} e={e} icon="Def_Down" type="debuff"/>
    case "def down 3":
      return <EffectTooltip label="DEF -30%" count={count} e={e} icon="Def_Down" type="debuff"/>
    case "def down 4":
      return <EffectTooltip label="DEF -40%" count={count} e={e} icon="Def_Down" type="debuff"/>
    case "def down 5":
      return <EffectTooltip label="DEF -50%" count={count} e={e} icon="Def_Down" type="debuff"/>
    case "eva up x":
      return <EffectTooltip label="EVA +500%" count={count} e={e} icon="Eva_Up" type="buff"/>
    case "eva up 1":
      return <EffectTooltip label="EVA +10%" count={count} e={e} icon="Eva_Up" type="buff"/>
    case "eva up 2":
      return <EffectTooltip label="EVA +20%" count={count} e={e} icon="Eva_Up" type="buff"/>
    case "eva up 3":
      return <EffectTooltip label="EVA +30%" count={count} e={e} icon="Eva_Up" type="buff"/>
    case "eva up 4":
      return <EffectTooltip label="EVA +40%" count={count} e={e} icon="Eva_Up" type="buff"/>
    case "eva up 5":
      return <EffectTooltip label="EVA +50%" count={count} e={e} icon="Eva_Up" type="buff"/>
    case "eva down 1":
      return <EffectTooltip label="EVA -10%" count={count} e={e} icon="Eva_Down" type="debuff"/>
    case "eva down 2":
      return <EffectTooltip label="EVA -20%" count={count} e={e} icon="Eva_Down" type="debuff"/>
    case "eva down 3":
      return <EffectTooltip label="EVA -30%" count={count} e={e} icon="Eva_Down" type="debuff"/>
    case "eva down 4":
      return <EffectTooltip label="EVA -40%" count={count} e={e} icon="Eva_Down" type="debuff"/>
    case "eva down 5":
      return <EffectTooltip label="EVA -50%" count={count} e={e} icon="Eva_Down" type="debuff"/>
    case "atk up 1":
      return <EffectTooltip label="ATK +10%" count={count} e={e} icon="Atk_Up" type="buff"/>
    case "atk up 2":
      return <EffectTooltip label="ATK +20%" count={count} e={e} icon="Atk_Up" type="buff"/>
    case "atk up 3":
      return <EffectTooltip label="ATK +30%" count={count} e={e} icon="Atk_Up" type="buff"/>
    case "atk up 4":
      return <EffectTooltip label="ATK +40%" count={count} e={e} icon="Atk_Up" type="buff"/>
    case "atk up 5":
      return <EffectTooltip label="ATK +50%" count={count} e={e} icon="Atk_Up" type="buff"/>
    case "atk down 1":
      return <EffectTooltip label="ATK -10%" count={count} e={e} icon="Atk_Down" type="debuff"/>
    case "atk down 2":
      return <EffectTooltip label="ATK -20%" count={count} e={e} icon="Atk_Down" type="debuff"/>
    case "atk down 3":
      return <EffectTooltip label="ATK -30%" count={count} e={e} icon="Atk_Down" type="debuff"/>
    case "atk down 4":
      return <EffectTooltip label="ATK -40%" count={count} e={e} icon="Atk_Down" type="debuff"/>
    case "atk down 5":
      return <EffectTooltip label="ATK -50%" count={count} e={e} icon="Atk_Down" type="debuff"/>
    case "acc up 1":
      return <EffectTooltip label="ACC +10%" count={count} e={e} icon="Acc_Up" type="buff"/>
    case "acc up 2":
      return <EffectTooltip label="ACC +20%" count={count} e={e} icon="Acc_Up" type="buff"/>
    case "acc up 3":
      return <EffectTooltip label="ACC +30%" count={count} e={e} icon="Acc_Up" type="buff"/>
    case "acc up 4":
      return <EffectTooltip label="ACC +40%" count={count} e={e} icon="Acc_Up" type="buff"/>
    case "acc up 5":
      return <EffectTooltip label="ACC +50%" count={count} e={e} icon="Acc_Up" type="buff"/>
    case "acc down 1":
      return <EffectTooltip label="ACC -10%" count={count} e={e} icon="Acc_Down" type="debuff"/>
    case "acc down 2":
      return <EffectTooltip label="ACC -20%" count={count} e={e} icon="Acc_Down" type="debuff"/>
    case "acc down 3":
      return <EffectTooltip label="ACC -30%" count={count} e={e} icon="Acc_Down" type="debuff"/>
    case "acc down 4":
      return <EffectTooltip label="ACC -40%" count={count} e={e} icon="Acc_Down" type="debuff"/>
    case "acc down 5":
      return <EffectTooltip label="ACC -50%" count={count} e={e} icon="Acc_Down" type="debuff"/>
    case "crit up 1":
      return <EffectTooltip label="CRIT +10%" count={count} e={e} icon="Crit_Up" type="buff"/>
    case "crit up 2":
      return <EffectTooltip label="CRIT +20%" count={count} e={e} icon="Crit_Up" type="buff"/>
    case "crit up 3":
      return <EffectTooltip label="CRIT +30%" count={count} e={e} icon="Crit_Up" type="buff"/>
    case "crit up 4":
      return <EffectTooltip label="CRIT +40%" count={count} e={e} icon="Crit_Up" type="buff"/>
    case "crit up 5":
      return <EffectTooltip label="CRIT +50%" count={count} e={e} icon="Crit_Up" type="buff"/>
    case "crit down 1":
      return <EffectTooltip label="CRIT -10%" count={count} e={e} icon="Crit_Down" type="debuff"/>
    case "crit down 2":
      return <EffectTooltip label="CRIT -20%" count={count} e={e} icon="Crit_Down" type="debuff"/>
    case "crit down 3":
      return <EffectTooltip label="CRIT -30%" count={count} e={e} icon="Crit_Down" type="debuff"/>
    case "crit down 4":
      return <EffectTooltip label="CRIT -40%" count={count} e={e} icon="Crit_Down" type="debuff"/>
    case "crit down 5":
      return <EffectTooltip label="CRIT -50%" count={count} e={e} icon="Crit_Down" type="debuff"/>
    case "spd up 1":
      return <EffectTooltip label="SPD +10%" count={count} e={e} icon="Spd_Up" type="buff"/>
    case "spd up 2":
      return <EffectTooltip label="SPD +20%" count={count} e={e} icon="Spd_Up" type="buff"/>
    case "spd up 3":
      return <EffectTooltip label="SPD +30%" count={count} e={e} icon="Spd_Up" type="buff"/>
    case "spd up 4":
      return <EffectTooltip label="SPD +40%" count={count} e={e} icon="Spd_Up" type="buff"/>
    case "spd up 5":
      return <EffectTooltip label="SPD +50%" count={count} e={e} icon="Spd_Up" type="buff"/>
    case "spd down 1":
      return <EffectTooltip label="SPD -10%" count={count} e={e} icon="Spd_Down" type="debuff"/>
    case "spd down 2":
      return <EffectTooltip label="SPD -20%" count={count} e={e} icon="Spd_Down" type="debuff"/>
    case "spd down 3":
      return <EffectTooltip label="SPD -30%" count={count} e={e} icon="Spd_Down" type="debuff"/>
    case "spd down 4":
      return <EffectTooltip label="SPD -40%" count={count} e={e} icon="Spd_Down" type="debuff"/>
    case "spd down 5":
      return <EffectTooltip label="SPD -50%" count={count} e={e} icon="Spd_Down" type="debuff"/>
    case "acceleration 1":
      return <EffectTooltip label="AP +1" count={count} e={e} icon="Spd_Up" type="buff"/>
    case "acceleration 2":
      return <EffectTooltip label="AP +2" count={count} e={e} icon="Spd_Up" type="buff"/>
    case "acceleration 3":
      return <EffectTooltip label="AP +3" count={count} e={e} icon="Spd_Up" type="buff"/>
    case "acceleration 4":
      return <EffectTooltip label="AP +4" count={count} e={e} icon="Spd_Up" type="buff"/>
    case "acceleration 5":
      return <EffectTooltip label="AP +5" count={count} e={e} icon="Spd_Up" type="buff"/>
    case "deceleration 1":
      return <EffectTooltip label="AP -1" count={count} e={e} icon="Spd_Down" type="debuff"/>
    case "deceleration 2":
      return <EffectTooltip label="AP -2" count={count} e={e} icon="Spd_Down" type="debuff"/>
    case "deceleration 3":
      return <EffectTooltip label="AP -3" count={count} e={e} icon="Spd_Down" type="debuff"/>
    case "deceleration 4":
      return <EffectTooltip label="AP -4" count={count} e={e} icon="Spd_Down" type="debuff"/>
    case "deceleration 5":
      return <EffectTooltip label="AP -5" count={count} e={e} icon="Spd_Down" type="debuff"/>
    case "heat resistance up 1":
      return <EffectTooltip label="Fire Resist +10%" count={count} e={e} icon="Fire_Resist_Up" type="buff"/>
    case "heat resistance up 2":
      return <EffectTooltip label="Fire Resist +20%" count={count} e={e} icon="Fire_Resist_Up" type="buff"/>
    case "heat resistance up 3":
      return <EffectTooltip label="Fire Resist +30%" count={count} e={e} icon="Fire_Resist_Up" type="buff"/>
    case "heat resistance up 4":
      return <EffectTooltip label="Fire Resist +40%" count={count} e={e} icon="Fire_Resist_Up" type="buff"/>
    case "heat resistance up 5":
      return <EffectTooltip label="Fire Resist +50%" count={count} e={e} icon="Fire_Resist_Up" type="buff"/>
    case "heat resistance down 1":
      return <EffectTooltip label="Fire Resist -10%" count={count} e={e} icon="Fire_Resist_Down" type="debuff"/>
    case "heat resistance down 2":
      return <EffectTooltip label="Fire Resist -20%" count={count} e={e} icon="Fire_Resist_Down" type="debuff"/>
    case "heat resistance down 3":
      return <EffectTooltip label="Fire Resist -30%" count={count} e={e} icon="Fire_Resist_Down" type="debuff"/>
    case "heat resistance down 4":
      return <EffectTooltip label="Fire Resist -40%" count={count} e={e} icon="Fire_Resist_Down" type="debuff"/>
    case "heat resistance down 5":
      return <EffectTooltip label="Fire Resist -50%" count={count} e={e} icon="Fire_Resist_Down" type="debuff"/>
    case "cold resistance up 1":
      return <EffectTooltip label="Ice Resist +10%" count={count} e={e} icon="Ice_Resist_Up" type="buff"/>
    case "cold resistance up 2":
      return <EffectTooltip label="Ice Resist +20%" count={count} e={e} icon="Ice_Resist_Up" type="buff"/>
    case "cold resistance up 3":
      return <EffectTooltip label="Ice Resist +30%" count={count} e={e} icon="Ice_Resist_Up" type="buff"/>
    case "cold resistance up 4":
      return <EffectTooltip label="Ice Resist +40%" count={count} e={e} icon="Ice_Resist_Up" type="buff"/>
    case "cold resistance up 5":
      return <EffectTooltip label="Ice Resist +50%" count={count} e={e} icon="Ice_Resist_Up" type="buff"/>
    case "cold resistance down 1":
      return <EffectTooltip label="Ice Resist -10%" count={count} e={e} icon="Ice_Resist_Down" type="debuff"/>
    case "cold resistance down 2":
      return <EffectTooltip label="Ice Resist -20%" count={count} e={e} icon="Ice_Resist_Down" type="debuff"/>
    case "cold resistance down 3":
      return <EffectTooltip label="Ice Resist -30%" count={count} e={e} icon="Ice_Resist_Down" type="debuff"/>
    case "cold resistance down 4":
      return <EffectTooltip label="Ice Resist -40%" count={count} e={e} icon="Ice_Resist_Down" type="debuff"/>
    case "cold resistance down 5":
      return <EffectTooltip label="Ice Resist -50%" count={count} e={e} icon="Ice_Resist_Down" type="debuff"/>
    case "insulation up 1":
      return <EffectTooltip label="Electric Resist +10%" count={count} e={e} icon="Electric_Resist_Up" type="buff"/>
    case "insulation up 2":
      return <EffectTooltip label="Electric Resist +20%" count={count} e={e} icon="Electric_Resist_Up" type="buff"/>
    case "insulation up 3":
      return <EffectTooltip label="Electric Resist +30%" count={count} e={e} icon="Electric_Resist_Up" type="buff"/>
    case "insulation up 4":
      return <EffectTooltip label="Electric Resist +40%" count={count} e={e} icon="Electric_Resist_Up" type="buff"/>
    case "insulation up 5":
      return <EffectTooltip label="Electric Resist +50%" count={count} e={e} icon="Electric_Resist_Up" type="buff"/>
    case "insulation down 1":
      return <EffectTooltip label="Electric Resist -10%" count={count} e={e} icon="Electric_Resist_Down" type="debuff"/>
    case "insulation down 2":
      return <EffectTooltip label="Electric Resist -20%" count={count} e={e} icon="Electric_Resist_Down" type="debuff"/>
    case "insulation down 3":
      return <EffectTooltip label="Electric Resist -30%" count={count} e={e} icon="Electric_Resist_Down" type="debuff"/>
    case "insulation down 4":
      return <EffectTooltip label="Electric Resist -40%" count={count} e={e} icon="Electric_Resist_Down" type="debuff"/>
    case "insulation down 5":
      return <EffectTooltip label="Electric Resist -50%" count={count} e={e} icon="Electric_Resist_Down" type="debuff"/>
    case "iron wall":
      return <EffectTooltip label="Nullify Damage" count={count} e={e} icon="Nullify_Damage" type="buff"/>
    case "iron wall 1":
      return <EffectTooltip label="Nullify Damage 1 time" count={count} e={e} icon="Nullify_Damage" type="buff"/>
    case "iron wall 2":
      return <EffectTooltip label="Nullify Damage 2 times" count={count} e={e} icon="Nullify_Damage" type="buff"/>
    case "iron wall 3":
      return <EffectTooltip label="Nullify Damage 3 times" count={count} e={e} icon="Nullify_Damage" type="buff"/>
    case "iron wall 4":
      return <EffectTooltip label="Nullify Damage 4 times" count={count} e={e} icon="Nullify_Damage" type="buff"/>
    case "iron wall 5":
      return <EffectTooltip label="Nullify Damage 5 times" count={count} e={e} icon="Nullify_Damage" type="buff"/>
    case "counterstrike":
      return <EffectTooltip label="Counterattack" count={count} e={e} icon="Counterattack" type="buff"/>
    case "counterstrike 1":
      return <EffectTooltip label="Counterattack with 20% Power" count={count} e={e} icon="Counterattack" type="buff"/>
    case "counterstrike 2":
      return <EffectTooltip label="Counterattack with 40% Power" count={count} e={e} icon="Counterattack" type="buff"/>
    case "counterstrike 3":
      return <EffectTooltip label="Counterattack with 60% Power" count={count} e={e} icon="Counterattack" type="buff"/>
    case "counterstrike 4":
      return <EffectTooltip label="Counterattack with 80% Power" count={count} e={e} icon="Counterattack" type="buff"/>
    case "counterstrike 5":
      return <EffectTooltip label="Counterattack with 100% Power" count={count} e={e} icon="Counterattack" type="buff"/>
    case "deflect":
      return <EffectTooltip label="Minimize Damage" count={count} e={e} icon="DR" type="buff"/>
    case "deflect 1":
      return <EffectTooltip label="Minimize Damage below 1000" count={count} e={e} icon="DR" type="buff"/>
    case "deflect 2":
      return <EffectTooltip label="Minimize Damage below 2000" count={count} e={e} icon="DR" type="buff"/>
    case "deflect 3":
      return <EffectTooltip label="Minimize Damage below 3000" count={count} e={e} icon="DR" type="buff"/>
    case "deflect 4":
      return <EffectTooltip label="Minimize Damage below 4000" count={count} e={e} icon="DR" type="buff"/>
    case "deflect 5":
      return <EffectTooltip label="Minimize Damage below 5000" count={count} e={e} icon="DR" type="buff"/>
    case "damage reduction":
      return <EffectTooltip label="Damage Reduction" count={count} e={e} icon="DR" type="buff"/>
    case "damage reduction 1":
      return <EffectTooltip label="Damage Reduction +10%" count={count} e={e} icon="DR" type="buff"/>
    case "damage reduction 2":
      return <EffectTooltip label="Damage Reduction +20%" count={count} e={e} icon="DR" type="buff"/>
    case "damage reduction 3":
      return <EffectTooltip label="Damage Reduction +30%" count={count} e={e} icon="DR" type="buff"/>
    case "damage reduction 4":
      return <EffectTooltip label="Damage Reduction +40%" count={count} e={e} icon="DR" type="buff"/>
    case "damage reduction 5":
      return <EffectTooltip label="Damage Reduction +50%" count={count} e={e} icon="DR" type="buff"/>
    case "damage absorption":
      return <EffectTooltip label="Barrier" count={count} e={e} icon="Barrier" type="buff"/>
    case "damage absorption 1":
      return <EffectTooltip label="Barrier +1000" count={count} e={e} icon="Barrier" type="buff"/>
    case "damage absorption 2":
      return <EffectTooltip label="Barrier +2000" count={count} e={e} icon="Barrier" type="buff"/>
    case "damage absorption 3":
      return <EffectTooltip label="Barrier +3000" count={count} e={e} icon="Barrier" type="buff"/>
    case "damage absorption 4":
      return <EffectTooltip label="Barrier +4000" count={count} e={e} icon="Barrier" type="buff"/>
    case "damage absorption 5":
      return <EffectTooltip label="Barrier +5000" count={count} e={e} icon="Barrier" type="buff"/>
    case "damage amplification":
      return <EffectTooltip label="Damage Taken Increased" count={count} e={e} icon="Damage_Taken_Increased" type="debuff"/>
    case "damage amplification 1":
      return <EffectTooltip label="Damage Taken Increased +10%" count={count} e={e} icon="Damage_Taken_Increased" type="debuff"/>
    case "damage amplification 2":
      return <EffectTooltip label="Damage Taken Increased +20%" count={count} e={e} icon="Damage_Taken_Increased" type="debuff"/>
    case "damage amplification 3":
      return <EffectTooltip label="Damage Taken Increased +30%" count={count} e={e} icon="Damage_Taken_Increased" type="debuff"/>
    case "damage amplification 4":
      return <EffectTooltip label="Damage Taken Increased +40%" count={count} e={e} icon="Damage_Taken_Increased" type="debuff"/>
    case "damage amplification 5":
      return <EffectTooltip label="Damage Taken Increased +50%" count={count} e={e} icon="Damage_Taken_Increased" type="debuff"/>
    case "knockback 1":
      return <EffectTooltip label="Push Back 1 space" count={count} e={e} icon="Push" type="debuff"/>
    case "knockback 2":
      return <EffectTooltip label="Push Back 2 spaces" count={count} e={e} icon="Push" type="debuff"/>
    case "pull 1":
      return <EffectTooltip label="Pull Forward 1 space" count={count} e={e} icon="Pull" type="debuff"/>
    case "pull 2":
      return <EffectTooltip label="Pull Forward 2 spaces" count={count} e={e} icon="Pull" type="debuff"/>
    case "targeting support 1":
      return <EffectTooltip label="Range +1" count={count} e={e} icon="Range_Up" type="buff"/>
    case "targeting support 2":
      return <EffectTooltip label="Range +2" count={count} e={e} icon="Range_Up" type="buff"/>
    case "targeting support 3":
      return <EffectTooltip label="Range +3" count={count} e={e} icon="Range_Up" type="buff"/>
    case "targeting support 4":
      return <EffectTooltip label="Range +4" count={count} e={e} icon="Range_Up" type="buff"/>
    case "targeting support 5":
      return <EffectTooltip label="Range +5" count={count} e={e} icon="Range_Up" type="buff"/>
    case "targeting interference 1":
      return <EffectTooltip label="Range -1" count={count} e={e} icon="Range_Down" type="debuff"/>
    case "targeting interference 2":
      return <EffectTooltip label="Range -2" count={count} e={e} icon="Range_Down" type="debuff"/>
    case "targeting interference 3":
      return <EffectTooltip label="Range -3" count={count} e={e} icon="Range_Down" type="debuff"/>
    case "targeting interference 4":
      return <EffectTooltip label="Range -4" count={count} e={e} icon="Range_Down" type="debuff"/>
    case "targeting interference 5":
      return <EffectTooltip label="Range -5" count={count} e={e} icon="Range_Down" type="debuff"/>
    case "sharpness 1":
      return <EffectTooltip label="Defense Penetration +10%" count={count} e={e} icon="Defense_Penetration" type="buff"/>
    case "sharpness 2":
      return <EffectTooltip label="Defense Penetration +20%" count={count} e={e} icon="Defense_Penetration" type="buff"/>
    case "sharpness 3":
      return <EffectTooltip label="Defense Penetration +30%" count={count} e={e} icon="Defense_Penetration" type="buff"/>
    case "sharpness 4":
      return <EffectTooltip label="Defense Penetration +40%" count={count} e={e} icon="Defense_Penetration" type="buff"/>
    case "sharpness 5":
      return <EffectTooltip label="Defense Penetration +50%" count={count} e={e} icon="Defense_Penetration" type="buff"/>
    case "dullness 1":
      return <EffectTooltip label="Defense Penetration -10%" count={count} e={e} icon="Defense_Penetration" type="debuff"/>
    case "dullness 2":
      return <EffectTooltip label="Defense Penetration -20%" count={count} e={e} icon="Defense_Penetration" type="debuff"/>
    case "dullness 3":
      return <EffectTooltip label="Defense Penetration -30%" count={count} e={e} icon="Defense_Penetration" type="debuff"/>
    case "dullness 4":
      return <EffectTooltip label="Defense Penetration -40%" count={count} e={e} icon="Defense_Penetration" type="debuff"/>
    case "dullness 5":
      return <EffectTooltip label="Defense Penetration -50%" count={count} e={e} icon="Defense_Penetration" type="debuff"/>
    case "strategic development (light) 1":
      return <EffectTooltip label="Anti-Light DMG +10%" count={count} e={e} icon="Anti_Light" type="buff"/>
    case "strategic development (light) 2":
      return <EffectTooltip label="Anti-Light DMG +20%" count={count} e={e} icon="Anti_Light" type="buff"/>
    case "strategic development (light) 3":
      return <EffectTooltip label="Anti-Light DMG +30%" count={count} e={e} icon="Anti_Light" type="buff"/>
    case "strategic development (light) 4":
      return <EffectTooltip label="Anti-Light DMG +40%" count={count} e={e} icon="Anti_Light" type="buff"/>
    case "strategic development (light) 5":
      return <EffectTooltip label="Anti-Light DMG +50%" count={count} e={e} icon="Anti_Light" type="buff"/>
    case "strategic disruption (light) 1":
      return <EffectTooltip label="Anti-Light DMG -10%" count={count} e={e} icon="Anti_Light" type="debuff"/>
    case "strategic disruption (light) 2":
      return <EffectTooltip label="Anti-Light DMG -20%" count={count} e={e} icon="Anti_Light" type="debuff"/>
    case "strategic disruption (light) 3":
      return <EffectTooltip label="Anti-Light DMG -30%" count={count} e={e} icon="Anti_Light" type="debuff"/>
    case "strategic disruption (light) 4":
      return <EffectTooltip label="Anti-Light DMG -40%" count={count} e={e} icon="Anti_Light" type="debuff"/>
    case "strategic disruption (light) 5":
      return <EffectTooltip label="Anti-Flying DMG -50%" count={count} e={e} icon="Anti_Flying" type="debuff"/>
    case "strategic development (flying) 1":
      return <EffectTooltip label="Anti-Flying DMG +10%" count={count} e={e} icon="Anti_Flying" type="buff"/>
    case "strategic development (flying) 2":
      return <EffectTooltip label="Anti-Flying DMG +20%" count={count} e={e} icon="Anti_Flying" type="buff"/>
    case "strategic development (flying) 3":
      return <EffectTooltip label="Anti-Flying DMG +30%" count={count} e={e} icon="Anti_Flying" type="buff"/>
    case "strategic development (flying) 4":
      return <EffectTooltip label="Anti-Flying DMG +40%" count={count} e={e} icon="Anti_Flying" type="buff"/>
    case "strategic development (flying) 5":
      return <EffectTooltip label="Anti-Flying DMG +50%" count={count} e={e} icon="Anti_Flying" type="buff"/>
    case "strategic disruption (flying) 1":
      return <EffectTooltip label="Anti-Flying DMG -10%" count={count} e={e} icon="Anti_Flying" type="debuff"/>
    case "strategic disruption (flying) 2":
      return <EffectTooltip label="Anti-Flying DMG -20%" count={count} e={e} icon="Anti_Flying" type="debuff"/>
    case "strategic disruption (flying) 3":
      return <EffectTooltip label="Anti-Flying DMG -30%" count={count} e={e} icon="Anti_Flying" type="debuff"/>
    case "strategic disruption (flying) 4":
      return <EffectTooltip label="Anti-Flying DMG -40%" count={count} e={e} icon="Anti_Flying" type="debuff"/>
    case "strategic disruption (flying) 5":
      return <EffectTooltip label="Anti-Flying DMG -50%" count={count} e={e} icon="Anti_Flying" type="debuff"/>
    case "strategic development (heavy) 1":
      return <EffectTooltip label="Anti-Heavy DMG +10%" count={count} e={e} icon="Anti_Heavy" type="buff"/>
    case "strategic development (heavy) 2":
      return <EffectTooltip label="Anti-Heavy DMG +20%" count={count} e={e} icon="Anti_Heavy" type="buff"/>
    case "strategic development (heavy) 3":
      return <EffectTooltip label="Anti-Heavy DMG +30%" count={count} e={e} icon="Anti_Heavy" type="buff"/>
    case "strategic development (heavy) 4":
      return <EffectTooltip label="Anti-Heavy DMG +40%" count={count} e={e} icon="Anti_Heavy" type="buff"/>
    case "strategic development (heavy) 5":
      return <EffectTooltip label="Anti-Heavy DMG +50%" count={count} e={e} icon="Anti_Heavy" type="buff"/>
    case "strategic disruption (heavy) 1":
      return <EffectTooltip label="Anti-Heavy DMG -10%" count={count} e={e} icon="Anti_Heavy" type="debuff"/>
    case "strategic disruption (heavy) 2":
      return <EffectTooltip label="Anti-Heavy DMG -20%" count={count} e={e} icon="Anti_Heavy" type="debuff"/>
    case "strategic disruption (heavy) 3":
      return <EffectTooltip label="Anti-Heavy DMG -30%" count={count} e={e} icon="Anti_Heavy" type="debuff"/>
    case "strategic disruption (heavy) 4":
      return <EffectTooltip label="Anti-Heavy DMG -40%" count={count} e={e} icon="Anti_Heavy" type="debuff"/>
    case "strategic disruption (heavy) 5":
      return <EffectTooltip label="Anti-Heavy DMG -50%" count={count} e={e} icon="Anti_Heavy" type="debuff"/>
    case "erosion":
      return <EffectTooltip label="Physical DoT Damage at the end of round" count={count} e={e} icon="Corrosion" type="debuff"/>
    case "erosion 1":
      return <EffectTooltip label="200 Physical DoT Damage at the end of round" count={count} e={e} icon="Corrosion" type="debuff"/>
    case "erosion 2":
      return <EffectTooltip label="400 Physical DoT Damage at the end of round" count={count} e={e} icon="Corrosion" type="debuff"/>
    case "erosion 3":
      return <EffectTooltip label="600 Physical DoT Damage at the end of round" count={count} e={e} icon="Corrosion" type="debuff"/>
    case "erosion 4":
      return <EffectTooltip label="800 Physical DoT Damage at the end of round" count={count} e={e} icon="Corrosion" type="debuff"/>
    case "erosion 5":
      return <EffectTooltip label="1000 Physical DoT Damage at the end of round" count={count} e={e} icon="Corrosion" type="debuff"/>
    case "ignited":
      return <EffectTooltip label="Fire DoT Damage at the end of round" count={count} e={e} icon="Fire_DoT_Damage" type="debuff"/>
    case "ignited 1":
      return <EffectTooltip label="200 Fire DoT Damage at the end of round" count={count} e={e} icon="Fire_DoT_Damage" type="debuff"/>
    case "ignited 2":
      return <EffectTooltip label="400 Fire DoT Damage at the end of round" count={count} e={e} icon="Fire_DoT_Damage" type="debuff"/>
    case "ignited 3":
      return <EffectTooltip label="600 Fire DoT Damage at the end of round" count={count} e={e} icon="Fire_DoT_Damage" type="debuff"/>
    case "ignited 4":
      return <EffectTooltip label="800 Fire DoT Damage at the end of round" count={count} e={e} icon="Fire_DoT_Damage" type="debuff"/>
    case "ignited 5":
      return <EffectTooltip label="1000 Fire DoT Damage at the end of round" count={count} e={e} icon="Fire_DoT_Damage" type="debuff"/>
    case "freezing":
      return <EffectTooltip label="Ice DoT Damage at the end of round" count={count} e={e} icon="Ice_DoT_Damage" type="debuff"/>
    case "freezing 1":
      return <EffectTooltip label="200 Ice DoT Damage at the end of round" count={count} e={e} icon="Ice_DoT_Damage" type="debuff"/>
    case "freezing 2":
      return <EffectTooltip label="400 Ice DoT Damage at the end of round" count={count} e={e} icon="Ice_DoT_Damage" type="debuff"/>
    case "freezing 3":
      return <EffectTooltip label="600 Ice DoT Damage at the end of round" count={count} e={e} icon="Ice_DoT_Damage" type="debuff"/>
    case "freezing 4":
      return <EffectTooltip label="800 Ice DoT Damage at the end of round" count={count} e={e} icon="Ice_DoT_Damage" type="debuff"/>
    case "freezing 5":
      return <EffectTooltip label="1000 Ice DoT Damage at the end of round" count={count} e={e} icon="Ice_DoT_Damage" type="debuff"/>
    case "electrocuted":
      return <EffectTooltip label="Electric DoT Damage at the end of round" count={count} e={e} icon="Electric_DoT_Damage" type="debuff"/>
    case "electrocuted 1":
      return <EffectTooltip label="200 Electric DoT Damage at the end of round" count={count} e={e} icon="Electric_DoT_Damage" type="debuff"/>
    case "electrocuted 2":
      return <EffectTooltip label="400 Electric DoT Damage at the end of round" count={count} e={e} icon="Electric_DoT_Damage" type="debuff"/>
    case "electrocuted 3":
      return <EffectTooltip label="600 Electric DoT Damage at the end of round" count={count} e={e} icon="Electric_DoT_Damage" type="debuff"/>
    case "electrocuted 4":
      return <EffectTooltip label="800 Electric DoT Damage at the end of round" count={count} e={e} icon="Electric_DoT_Damage" type="debuff"/>
    case "electrocuted 5":
      return <EffectTooltip label="1000 Electric DoT Damage at the end of round" count={count} e={e} icon="Electric_DoT_Damage" type="debuff"/>
    case "enmity 1":
      return <EffectTooltip label="Increase damage proportional to attacker's lost HP, upto +10%" count={count} e={e} icon="Enmity" type="buff"/>
    case "enmity 2":
      return <EffectTooltip label="Increase damage proportional to attacker's lost HP, upto +20%" count={count} e={e} icon="Enmity" type="buff"/>
    case "enmity 3":
      return <EffectTooltip label="Increase damage proportional to attacker's lost HP, upto +30%" count={count} e={e} icon="Enmity" type="buff"/>
    case "enmity 4":
      return <EffectTooltip label="Increase damage proportional to attacker's lost HP, upto +40%" count={count} e={e} icon="Enmity" type="buff"/>
    case "enmity 5":
      return <EffectTooltip label="Increase damage proportional to attacker's lost HP, upto +50%" count={count} e={e} icon="Enmity" type="buff"/>
    case "finisher 1":
      return <EffectTooltip label="Increase damage proportional to target's lost HP, upto +10%" count={count} e={e} icon="Merciless" type="buff"/>
    case "finisher 2":
      return <EffectTooltip label="Increase damage proportional to target's lost HP, upto +20%" count={count} e={e} icon="Merciless" type="buff"/>
    case "finisher 3":
      return <EffectTooltip label="Increase damage proportional to target's lost HP, upto +30%" count={count} e={e} icon="Merciless" type="buff"/>
    case "finisher 4":
      return <EffectTooltip label="Increase damage proportional to target's lost HP, upto +40%" count={count} e={e} icon="Merciless" type="buff"/>
    case "finisher 5":
      return <EffectTooltip label="Increase damage proportional to target's lost HP, upto +50%" count={count} e={e} icon="Merciless" type="buff"/>
    case "battle continuation":
      return <EffectTooltip label="Battle Continuation" count={count} e={e} icon="Battle_Continuation" type="normal"/>
    case "temporary restoration 1":
      return <EffectTooltip label="Battle Continuation with 100 HP" count={count} e={e} icon="Battle_Continuation" type="normal"/>
    case "temporary restoration 2":
      return <EffectTooltip label="Battle Continuation with 200 HP" count={count} e={e} icon="Battle_Continuation" type="normal"/>
    case "temporary restoration 3":
      return <EffectTooltip label="Battle Continuation with 300 HP" count={count} e={e} icon="Battle_Continuation" type="normal"/>
    case "temporary restoration 4":
      return <EffectTooltip label="Battle Continuation with 400 HP" count={count} e={e} icon="Battle_Continuation" type="normal"/>
    case "temporary restoration 5":
      return <EffectTooltip label="Battle Continuation with 500 HP" count={count} e={e} icon="Battle_Continuation" type="normal"/>
    case "rapid restoration 1":
      return <EffectTooltip label="Battle Continuation with 20% HP" count={count} e={e} icon="Battle_Continuation" type="normal"/>
    case "rapid restoration 2":
      return <EffectTooltip label="Battle Continuation with 40% HP" count={count} e={e} icon="Battle_Continuation" type="normal"/>
    case "rapid restoration 3":
      return <EffectTooltip label="Battle Continuation with 60% HP" count={count} e={e} icon="Battle_Continuation" type="normal"/>
    case "rapid restoration 4":
      return <EffectTooltip label="Battle Continuation with 80% HP" count={count} e={e} icon="Battle_Continuation" type="normal"/>
    case "rapid restoration 5":
      return <EffectTooltip label="Battle Continuation with 100% HP" count={count} e={e} icon="Battle_Continuation" type="normal"/>
    case "all-out attack 1":
      return <EffectTooltip label="Additional DMG +20%" count={count} e={e} icon="Additional_Damage" type="normal"/>
    case "all-out attack 2":
      return <EffectTooltip label="Additional DMG +40%" count={count} e={e} icon="Additional_Damage" type="normal"/>
    case "all-out attack 3":
      return <EffectTooltip label="Additional DMG +60%" count={count} e={e} icon="Additional_Damage" type="normal"/>
    case "all-out attack 4":
      return <EffectTooltip label="Additional DMG +80%" count={count} e={e} icon="Additional_Damage" type="normal"/>
    case "all-out attack 5":
      return <EffectTooltip label="Additional DMG +100%" count={count} e={e} icon="Additional_Damage" type="normal"/>
    case "resistance up 1":
      return <EffectTooltip label="Status Resist +20%" count={count} e={e} icon="Status_Resist_Up" type="buff"/>
    case "resistance up 2":
      return <EffectTooltip label="Status Resist +40%" count={count} e={e} icon="Status_Resist_Up" type="buff"/>
    case "resistance up 3":
      return <EffectTooltip label="Status Resist +60%" count={count} e={e} icon="Status_Resist_Up" type="buff"/>
    case "resistance up 4":
      return <EffectTooltip label="Status Resist +80%" count={count} e={e} icon="Status_Resist_Up" type="buff"/>
    case "resistance up 5":
      return <EffectTooltip label="Status Resist +100%" count={count} e={e} icon="Status_Resist_Up" type="buff"/>
    case "super resistance up 1":
      return <EffectTooltip label="Buff Removal Resist +20%" count={count} e={e} icon="Buff_Removal_Resist_Up" type="normal"/>
    case "super resistance up 2":
      return <EffectTooltip label="Buff Removal Resist +40%" count={count} e={e} icon="Buff_Removal_Resist_Up" type="normal"/>
    case "super resistance up 3":
      return <EffectTooltip label="Buff Removal Resist +60%" count={count} e={e} icon="Buff_Removal_Resist_Up" type="normal"/>
    case "super resistance up 4":
      return <EffectTooltip label="Buff Removal Resist +80%" count={count} e={e} icon="Buff_Removal_Resist_Up" type="normal"/>
    case "super resistance up 5":
      return <EffectTooltip label="Buff Removal Resist +100%" count={count} e={e} icon="Buff_Removal_Resist_Up" type="normal"/>
    case "resistance down 1":
      return <EffectTooltip label="Status Resist -20%" count={count} e={e} icon="Status_Resist_Down" type="debuff"/>
    case "resistance down 2":
      return <EffectTooltip label="Status Resist -40%" count={count} e={e} icon="Status_Resist_Down" type="debuff"/>
    case "resistance down 3":
      return <EffectTooltip label="Status Resist -60%" count={count} e={e} icon="Status_Resist_Down" type="debuff"/>
    case "resistance down 4":
      return <EffectTooltip label="Status Resist -80%" count={count} e={e} icon="Status_Resist_Down" type="debuff"/>
    case "resistance down 5":
      return <EffectTooltip label="Status Resist -100%" count={count} e={e} icon="Status_Resist_Down" type="debuff"/>
    case "power up 1":
      return <EffectTooltip label="Skill Multiplier +10%" count={count} e={e} icon="Skill_Multiplier_Up" type="buff"/>
    case "power up 2":
      return <EffectTooltip label="Skill Multiplier +20%" count={count} e={e} icon="Skill_Multiplier_Up" type="buff"/>
    case "power up 3":
      return <EffectTooltip label="Skill Multiplier +30%" count={count} e={e} icon="Skill_Multiplier_Up" type="buff"/>
    case "power up 4":
      return <EffectTooltip label="Skill Multiplier +40%" count={count} e={e} icon="Skill_Multiplier_Up" type="buff"/>
    case "power up 5":
      return <EffectTooltip label="Skill Multiplier +50%" count={count} e={e} icon="Skill_Multiplier_Up" type="buff"/>
    case "power down 1":
      return <EffectTooltip label="Skill Multiplier -10%" count={count} e={e} icon="Skill_Multiplier_Down" type="debuff"/>
    case "power down 2":
      return <EffectTooltip label="Skill Multiplier -20%" count={count} e={e} icon="Skill_Multiplier_Down" type="debuff"/>
    case "power down 3":
      return <EffectTooltip label="Skill Multiplier -30%" count={count} e={e} icon="Skill_Multiplier_Down" type="debuff"/>
    case "power down 4":
      return <EffectTooltip label="Skill Multiplier -40%" count={count} e={e} icon="Skill_Multiplier_Down" type="debuff"/>
    case "power down 5":
      return <EffectTooltip label="Skill Multiplier -50%" count={count} e={e} icon="Skill_Multiplier_Down" type="debuff"/>
    case "focus 1":
      return <EffectTooltip label="Area Damage Focus +20%" count={count} e={e} icon="Atk_Up" type="buff"/>
    case "focus 2":
      return <EffectTooltip label="Area Damage Focus +40%" count={count} e={e} icon="Atk_Up" type="buff"/>
    case "focus 3":
      return <EffectTooltip label="Area Damage Focus +60%" count={count} e={e} icon="Atk_Up" type="buff"/>
    case "focus 4":
      return <EffectTooltip label="Area Damage Focus +80%" count={count} e={e} icon="Atk_Up" type="buff"/>
    case "focus 5":
      return <EffectTooltip label="Area Damage Focus +100%" count={count} e={e} icon="Atk_Up" type="buff"/>
    case "dispersal 1":
      return <EffectTooltip label="Area Damage Dispersion +20%" count={count} e={e} icon="Def_Up" type="buff"/>
    case "dispersal 2":
      return <EffectTooltip label="Area Damage Dispersion +40%" count={count} e={e} icon="Def_Up" type="buff"/>
    case "dispersal 3":
      return <EffectTooltip label="Area Damage Dispersion +60%" count={count} e={e} icon="Def_Up" type="buff"/>
    case "dispersal 4":
      return <EffectTooltip label="Area Damage Dispersion +80%" count={count} e={e} icon="Def_Up" type="buff"/>
    case "dispersal 5":
      return <EffectTooltip label="Area Damage Dispersion +100%" count={count} e={e} icon="Def_Up" type="buff"/>
    case "fire adaptation 1":
      return <EffectTooltip label="Minimum Fire Resist +20%" count={count} e={e} icon="Minimum_Fire_Resist_Up" type="buff"/>
    case "fire adaptation 2":
      return <EffectTooltip label="Minimum Fire Resist +40%" count={count} e={e} icon="Minimum_Fire_Resist_Up" type="buff"/>
    case "fire adaptation 3":
      return <EffectTooltip label="Minimum Fire Resist +60%" count={count} e={e} icon="Minimum_Fire_Resist_Up" type="buff"/>
    case "fire adaptation 4":
      return <EffectTooltip label="Minimum Fire Resist +80%" count={count} e={e} icon="Minimum_Fire_Resist_Up" type="buff"/>
    case "fire adaptation 5":
      return <EffectTooltip label="Minimum Fire Resist +100%" count={count} e={e} icon="Minimum_Fire_Resist_Up" type="buff"/>
    case "ice adaptation 1":
      return <EffectTooltip label="Minimum Ice Resist +20%" count={count} e={e} icon="Minimum_Ice_Resist_Up" type="buff"/>
    case "ice adaptation 2":
      return <EffectTooltip label="Minimum Ice Resist +40%" count={count} e={e} icon="Minimum_Ice_Resist_Up" type="buff"/>
    case "ice adaptation 3":
      return <EffectTooltip label="Minimum Ice Resist +60%" count={count} e={e} icon="Minimum_Ice_Resist_Up" type="buff"/>
    case "ice adaptation 4":
      return <EffectTooltip label="Minimum Ice Resist +80%" count={count} e={e} icon="Minimum_Ice_Resist_Up" type="buff"/>
    case "ice adaptation 5":
      return <EffectTooltip label="Minimum Ice Resist +100%" count={count} e={e} icon="Minimum_Ice_Resist_Up" type="buff"/>
    case "electric adaptation 1":
      return <EffectTooltip label="Minimum Electric Resist +20%" count={count} e={e} icon="Minimum_Electric_Resist_Up" type="buff"/>
    case "electric adaptation 2":
      return <EffectTooltip label="Minimum Electric Resist +40%" count={count} e={e} icon="Minimum_Electric_Resist_Up" type="buff"/>
    case "electric adaptation 3":
      return <EffectTooltip label="Minimum Electric Resist +60%" count={count} e={e} icon="Minimum_Electric_Resist_Up" type="buff"/>
    case "electric adaptation 4":
      return <EffectTooltip label="Minimum Electric Resist +80%" count={count} e={e} icon="Minimum_Electric_Resist_Up" type="buff"/>
    case "electric adaptation 5":
      return <EffectTooltip label="Minimum Electric Resist +100%" count={count} e={e} icon="Minimum_Electric_Resist_Up" type="buff"/>
    case "penetration resistance 1":
      return <EffectTooltip label="Defense Penetration Resist +10%" count={count} e={e} icon="Defense_Penetration_Resist_Up" type="buff"/>
    case "penetration resistance 2":
      return <EffectTooltip label="Defense Penetration Resist +20%" count={count} e={e} icon="Defense_Penetration_Resist_Up" type="buff"/>
    case "penetration resistance 3":
      return <EffectTooltip label="Defense Penetration Resist +30%" count={count} e={e} icon="Defense_Penetration_Resist_Up" type="buff"/>
    case "penetration resistance 4":
      return <EffectTooltip label="Defense Penetration Resist +40%" count={count} e={e} icon="Defense_Penetration_Resist_Up" type="buff"/>
    case "penetration resistance 5":
      return <EffectTooltip label="Defense Penetration Resist +50%" count={count} e={e} icon="Defense_Penetration_Resist_Up" type="buff"/>
    case "swiftness 1":
      return <EffectTooltip label="Max Action Count +1" count={count} e={e} icon="Max_Action Count_Up" type="buff"/>
    case "swiftness 2":
      return <EffectTooltip label="Max Action Count +2" count={count} e={e} icon="Max_Action Count_Up" type="buff"/>
    case "swiftness 3":
      return <EffectTooltip label="Max Action Count +3" count={count} e={e} icon="Max_Action Count_Up" type="buff"/>
    case "swiftness 4":
      return <EffectTooltip label="Max Action Count +4" count={count} e={e} icon="Max_Action Count_Up" type="buff"/>
    case "swiftness 5":
      return <EffectTooltip label="Max Action Count +5" count={count} e={e} icon="Max_Action Count_Up" type="buff"/>
    default:
      return (
        <Text as="b" bg="gray.300" color="gray.800" px={1} py={0.5} rounded={6} key={count}>
          {e}
        </Text>
      );
  }
}




export default function SkillTab({
  skill,
  atk,
  showBuffs,
}: {
  skill: Skill;
  atk: number;
  showBuffs: boolean;
}) {

  const splitTag = (str: string) => {
    var count = 0;
    let r = str
      .split(/(<li>.+?<\/li>|<[^<]+?>|\[[^\]]+?\]|<br>|<br\/>|<br \/>)/)
      .map((e) => {
        if (e.match(/<li>(.+?)<\/li>/)) {
          let liContent = e.replace(/<li>(.+?)<\/li>/, "$1")
          return <li key={count++}>{splitTag(liContent)}</li>;
        }

        else if (e.match(/<br>|<br\/>|<br \/>/)) return <br key={count++} />;
        else if (e.match(/^<[^<]+?>$/)) {
          // <keyword> -> plain emphasised text (chip/icon highlight removed)
          return <b key={count++}>{e.replace(/<([^<]+?)>/, "$1")}</b>;
        }
        else if (e.match(/^\[[^\]]+?\]$/)) {
          // [skill / effect reference] -> highlighted in the accent color
          return <Text as="b" color="yellow.300" key={count++}>{e}</Text>;
        }

        else return e;
      });
    return r;
  }

  // Render a damage value for a given multiplier: "<atk*rate> (xrate ATK)".
  function dmg(rate: number) {
    return `${Math.floor(atk * rate).toString()} (x${rate} ATK)`;
  }

  function renderDescription() {
    let copy = t(skill.description);
    // Hand-translated text embeds the multiplier inline as $(1.5).
    const inline = copy.match(/\$\((\d+\.*\d*)\)/);
    if (inline && inline[1]) {
      copy = copy.replace(/\$\(\d+\.*\d*\)/g, dmg(parseFloat(inline[1])));
    }
    // Official table text uses a positional {0} placeholder; fill it with the
    // skill's SkillAttackRate.
    if (skill.rate) {
      copy = copy.replace(/\{0\}/g, dmg(skill.rate));
    }
    var count = 0;
    let r = splitTag(copy)
    return r;
  }

  const tr = (id: string) => { const r = t(id); return (r && r !== id) ? r.split(":")[0].trim() : ""; };

  // resolveCondVal: used only for applyCond=NONE extra tags (BUFFEFFECT_TYPE ordinals + Effect_ keys).
  function resolveCondVal(v: string, nam: string): string {
    const numV = v ? parseInt(v, 10) : NaN;
    const isNumeric = !isNaN(numV) && String(numV) === v;
    return isNumeric
      ? (BUFF_TYPE_NAMES[numV] ?? String(numV))
      : v
        ? (tr(nam) || tr(`BuffName_${v}`) || v.replace(/^Effect_[^_]+_/, "").replace(/^Char_[^_]+_/, "").replace(/_/g, " "))
        : "";
  }

  // Resolve a [buff type] token value: integer → BUFF_TYPE_NAMES.
  function resolveBuffTypeName(v: string): string {
    const numV = parseInt(v, 10);
    return !isNaN(numV) ? (BUFF_TYPE_NAMES[numV] ?? String(numV)) : v;
  }

  // Resolve a [buff] or [char] token value: Effect_/Char_ key → display name.
  function resolveKeyName(v: string, nam: string): string {
    return tr(nam) || tr(`BuffName_${v}`) || v.replace(/^Effect_[^_]+_/, "").replace(/^Char_[^_]+_/, "").replace(/_/g, " ");
  }

  // Resolve a {0} placeholder that is a count or HP threshold — never a type ID.
  // HP conditions (labels containing "%") store a float (0.5 = 50%); counts are integers.
  function resolveCountVal(v: string, isHp: boolean): string {
    const numV = parseFloat(v);
    if (isNaN(numV)) return v || "?";
    return isHp ? String(Math.round(numV * 100)) : String(Math.round(numV));
  }

  // Returns { before, name, after } so the caller can underline the name fragment.
  // Each condition type expects a specific kind of value in applyCondVals[0]:
  //   [buff type] → BUFF_TYPE_NAMES lookup (integer type ordinal)
  //   [buff]      → Effect_/Skill_ key → display name
  //   [char]      → Char_/MOB_ key → display name
  //   {0}         → count (integer) or HP% (float×100) — never BUFF_TYPE_NAMES
  function resolveApplyCondParts(buff: SkillBuff): { before: string; name: string; after: string } | null {
    const applyCondRaw = buff.applyCond !== 63 ? APPLY_COND_LABELS[buff.applyCond] : null;
    if (!applyCondRaw) return null;

    const v   = buff.applyCondVals[0] ?? "";
    const nam = buff.applyCondNames[0] ?? "";

    const nameToken = /\[buff type\]/.test(applyCondRaw) ? "[buff type]"
      : /\[buff\]/.test(applyCondRaw) ? "[buff]"
      : /\[char\]/.test(applyCondRaw) ? "[char]"
      : null;

    const has0  = /\{0\}/.test(applyCondRaw);
    const isHp  = has0 && /\{0\}%/.test(applyCondRaw);

    // Resolve the named token (underlined in UI).
    let nameVal = "";
    if (nameToken === "[buff type]") {
      nameVal = resolveBuffTypeName(v);
    } else if (nameToken === "[buff]") {
      if (!v) return null;
      nameVal = resolveKeyName(v, nam);
    } else if (nameToken === "[char]") {
      if (!v) return null;
      nameVal = resolveKeyName(v, nam);
    }

    // Resolve the {0} count/threshold — only when there is no named token consuming
    // the same value, or when the label has both (e.g. "If ≥ {0} [buff]").
    let val0 = "";
    if (has0) {
      // When the named token also uses v, {0} count isn't in CV2; show nothing.
      if (nameToken && v && !v.match(/^\d/)) {
        val0 = "";  // Effect_/Char_ key — count unknown, omit
      } else {
        val0 = resolveCountVal(v, isHp);
      }
    }

    // Build the template.
    let template = applyCondRaw;
    if (has0) template = template.replace("{0}", val0 || "?");

    // Reject if unresolved [tokens] remain (besides the known nameToken).
    if (/\[|\]/.test(template.replace(nameToken ?? "$$NOMATCH$$", ""))) return null;

    if (nameToken) {
      const idx = template.indexOf(nameToken);
      const before = template.slice(0, idx).replace(/\s{2,}/g, " ").trimStart();
      const after  = template.slice(idx + nameToken.length).replace(/\s{2,}/g, " ").trimEnd();
      return { before, name: nameVal, after };
    }
    const label = template.replace(/\s{2,}/g, " ").trim();
    return label ? { before: label, name: "", after: "" } : null;
  }

  // For buffs where applyCond=NONE but applyCondVals has entries: each val is a
  // standalone condition ordinal or buff-type reference (e.g. Phys DoT checking
  // multiple elemental effect types).
  function resolveExtraCondTags(buff: SkillBuff): string[] {
    if (buff.applyCond !== 63 || buff.applyCondVals.length === 0) return [];
    // When applyCond=NONE, each value is a BUFFEFFECT_TYPE ordinal or effect key,
    // not an apply-condition ordinal — resolve via BUFF_TYPE_NAMES / effect name.
    return buff.applyCondVals.map((v, i) => {
      return resolveCondVal(v, buff.applyCondNames[i] ?? "") || v;
    }).filter(Boolean);
  }

  function renderBuffGroup(group: SkillBuff[], groupIdx: number) {
    const rep = group[0];
    const attrLabel = ["Buff", "Debuff", "Skill Buff", "Normal Effect", "Rogue Buff", "Rogue Debuff"][rep.attr] ?? "Normal Effect";
    const attrBg   = rep.attr === 0 ? "#276749" : rep.attr === 1 ? "#9b2c2c" : rep.attr === 2 ? "#2c5282" : rep.attr === 4 ? "#9c4221" : rep.attr === 5 ? "#702459" : "#2d3748";
    const attrFg   = rep.attr === 0 ? "#9ae6b4" : rep.attr === 1 ? "#feb2b2" : rep.attr === 2 ? "#90cdf4" : rep.attr === 4 ? "#fbd38d" : rep.attr === 5 ? "#fbb6ce" : "#e2e8f0";
    const attrBorder = rep.attr === 0 ? "#38a169" : rep.attr === 1 ? "#e53e3e" : rep.attr === 2 ? "#3182ce" : rep.attr === 4 ? "#dd6b20" : rep.attr === 5 ? "#d53f8c" : "#4a5568";
    const trg = (id: string) => { const r = t(id); return r ? r.split(":")[0].trim() : ""; };
    const groupName = trg(rep.name);

    const resolveTriggerLabel = (triggerType: number) => {
      const raw = TRIGGER_LABELS[triggerType];
      if (!raw) return null;
      const valStr = rep.triggerVal ? String(Math.round(rep.triggerVal * 100)) : "?";
      const keyStr = rep.triggerName
        ? (trg(rep.triggerName) || rep.triggerName)
        : rep.triggerKey || "?";
      return raw.replace("{0}", valStr).replace("{key}", keyStr);
    };
    const triggerLabel = resolveTriggerLabel(rep.trigger);
    const targetLabel  = TARGET_LABELS[rep.targetType] ?? null;
    const applyCondParts = resolveApplyCondParts(rep);
    const extraCondTags  = resolveExtraCondTags(rep);
    const condIsBuff = applyCondParts !== null && /\[buff|\[char/.test(APPLY_COND_LABELS[rep.applyCond] ?? "");
    const effectiveCondAttr = rep.condAttr !== 6
      ? rep.condAttr
      : ((rep.applyCondAttrs ?? []).find(a => a >= 0) ?? 6);
    const condAttrLabel = effectiveCondAttr === 0 ? " (buff)"
      : effectiveCondAttr === 1 ? " (debuff)"
      : effectiveCondAttr >= 2 && effectiveCondAttr !== 6 ? " (all)"
      : (condIsBuff || extraCondTags.length > 0) ? " (all)"
      : "";

    // ── small pill helper ────────────────────────────────────────────────────
    const Pill = ({ bg, color, children }: { bg: string; color: string; children: React.ReactNode }) => (
      <Box as="span" display="inline-block" px="6px" py="1px" borderRadius="3px"
        bg={bg} color={color} fontSize="11px" lineHeight="18px" whiteSpace="nowrap">
        {children}
      </Box>
    );

    return (
      <Box
        key={groupIdx}
        w="100%"
        borderLeftWidth="3px"
        borderLeftColor={attrBorder}
        borderRadius="4px"
        overflow="clip"
        bg="gray.800"
      >
        {/* ── header ── */}
        <Box px={2} pt={1.5} pb={1} bg="blackAlpha.300" borderBottomWidth="1px" borderBottomColor="whiteAlpha.100">
          {/* name row — full width, attr badge right-aligned */}
          <Flex align="center" justify="space-between" w="100%" mb={1}>
            <Text fontSize="sm" color="gray.100" fontWeight="bold" textDecoration="underline" flexShrink={1} minW={0}>
              {groupName || attrLabel}
            </Text>
            <Box ml={2} px="7px" py="1px" borderRadius="3px" bg={attrBg} color={attrFg}
              fontSize="11px" fontWeight="bold" lineHeight="18px" flexShrink={0}>
              {attrLabel}
            </Box>
          </Flex>

          {/* pills row */}
          <Flex gap={1.5} flexWrap="wrap" align="center">
            {triggerLabel ? <Pill bg="purple.900" color="purple.200">{triggerLabel}</Pill> : null}
            {targetLabel  ? <Pill bg="gray.700"   color="gray.300">{targetLabel}</Pill>  : null}

            {applyCondParts ? (
              <Pill bg="teal.900" color="teal.200">
                {applyCondParts.before}
                {applyCondParts.name
                  ? <Box as="span" fontWeight="semibold" color="teal.100">{applyCondParts.name}</Box>
                  : null}
                {applyCondParts.after}
                {condAttrLabel ? <Box as="span" color="teal.400">{condAttrLabel}</Box> : null}
              </Pill>
            ) : extraCondTags.length > 0 ? (
              <Pill bg="teal.900" color="teal.200">
                if: {extraCondTags.join(" / ")}
                {condAttrLabel ? <Box as="span" color="teal.400">{condAttrLabel}</Box> : null}
              </Pill>
            ) : null}

            {rep.rate < 1 ? <Pill bg="yellow.900" color="yellow.300">{Math.round(rep.rate * 100)}% chance</Pill> : null}
            {rep.eraseType === 2 ? <Pill bg="orange.900" color="orange.300">on trigger</Pill>   : null}
            {rep.eraseType === 4 ? <Pill bg="orange.900" color="orange.300">preserved</Pill>    : null}

            {(rep.filterBody?.length  ?? 0) > 0 ? <Pill bg="cyan.900"   color="cyan.200"  >{rep.filterBody.map(v  => BODY_NAMES[v]  ?? v).join("/")} only</Pill> : null}
            {(rep.filterClass?.length ?? 0) > 0 ? <Pill bg="blue.900"   color="blue.200"  >{rep.filterClass.map(v => CLASS_NAMES[v] ?? v).join("/")} only</Pill> : null}
            {(rep.filterRole?.length  ?? 0) > 0 ? <Pill bg="green.900"  color="green.200" >{rep.filterRole.map(v  => ROLE_NAMES[v]  ?? v).join("/")} only</Pill> : null}
          </Flex>
        </Box>

        {/* ── effect rows ── */}
        <VStack spacing={0} align="stretch">
          {group.map((buff, i) => {
            if (!buff.icon && !BUFF_TYPE_NAMES[buff.type]) return null;

            let valStr = "";
            let descFill = "";
            let valPositive = true;
            if (buff.type === 33 && buff.val !== 0) {
              valStr = `×${buff.val}`; descFill = String(buff.val);
            } else if ((buff.type === 34 || buff.type === 35) && buff.val !== 0) {
              valStr = `< ${buff.val}`; descFill = String(buff.val);
            } else if (buff.fmt === "pct" && buff.val !== 0) {
              const pct = Math.round(buff.val * 100);
              valStr = `${buff.val > 0 ? "+" : ""}${pct}%`;
              descFill = String(pct); valPositive = buff.val > 0;
            } else if (buff.type === 21 && buff.val !== 0) {
              valStr = String(buff.val); descFill = String(buff.val);
            } else if (buff.fmt === "flat" && buff.val !== 0) {
              valStr = `${buff.val > 0 ? "+" : ""}${buff.val}`;
              descFill = String(buff.val); valPositive = buff.val > 0;
            } else if (buff.fmt === "tid" && buff.val !== 0) {
              const n = BUFF_TYPE_NAMES[buff.val] ?? String(buff.val);
              valStr = n; descFill = n;
            }

            let durStr = "";
            if (buff.eraseType === 3) durStr = "Permanent";
            else if (buff.eraseType === 0 && buff.turns > 0) durStr = `${buff.turns} rounds`;
            else if (buff.eraseType === 1) durStr = buff.turns > 1 ? `×${buff.turns}` : "×1";

            const stackStr = buff.eraseType === 2 ? ""
              : buff.overlapType === 4 && buff.overlapMax === 0 ? "Unlimited stacks"
              : buff.overlapType === 4 ? ` Max ${buff.overlapMax} stacks`
              : buff.overlapType === 2 ? "+duration"
              : "";

            const rawDesc = t(buff.desc);
            const filledDesc = descFill ? rawDesc.replace("{0}", descFill) : rawDesc;
            const descResolved = rawDesc && rawDesc !== buff.desc;

            let noteStr = "";
            if (buff.eraseType === 0 && buff.turns === 0) noteStr = "Instant";
            else if (buff.overlapType == 1) noteStr = "Renew";
            else if (buff.overlapType == 3) noteStr = "Single";
            else if (buff.overlapType == 4  && buff.overlapMax != 0) noteStr = "Update";

            const valColor = buff.fmt === "tid" || buff.type === 21 || buff.type === 33 || buff.type === 34 || buff.type === 35
              ? "gray.200" : valPositive ? "green.300" : "red.300";

            return (
              <Flex key={`${groupIdx}-${i}`} px={2} py={1.5} gap={2} align="flex-start"
                borderTopWidth={i > 0 ? "1px" : "0"} borderTopColor="whiteAlpha.100">
                <Box flexShrink={0} w="18px" h="18px" mt="1px">
                  {buff.icon ? <Image src={`/images/effects/BuffIcon_${buff.icon}.png`} boxSize="18px" /> : null}
                </Box>
                <Box flex={1} minW={0}>
                  <HStack spacing={1.5} flexWrap="wrap">
                    <Text fontSize="sm" fontWeight="bold" textDecoration="underline" color="gray.200">{BUFF_TYPE_NAMES[buff.type]}</Text>
                    {valStr ? <Text fontSize="sm" fontWeight="bold" color={valColor}>{valStr}</Text> : null}
                  </HStack>
                  {descResolved
                    ? <Text fontSize="xs" color="gray.500" mt="2px" lineHeight="short">{filledDesc}</Text>
                    : null}
                </Box>
                <HStack spacing={1} flexShrink={0} mt="2px">
                  {durStr   ? <Box px="5px" py="1px" borderRadius="3px" bg="gray.700" color="gray.300" fontSize="11px" lineHeight="16px">{durStr}</Box>   : null}
                  {stackStr ? <Box px="5px" py="1px" borderRadius="3px" bg="gray.700" color="cyan.300"  fontSize="11px" lineHeight="16px">{stackStr}</Box> : null}
                  {noteStr ? (
                    <Box
                      as="span"
                      position="relative"
                      display="inline-flex"
                      alignItems="center"
                      gap="3px"
                      px="5px"
                      py="1px"
                      borderRadius="3px"
                      bg="gray.700"
                      color="yellow.300"
                      fontSize="11px"
                      lineHeight="16px"
                      cursor="help"
                      role="group"
                    >
                      {noteStr}
                      <Box as="span" opacity={0.6} fontSize="10px">?</Box>
                      <Box
                        as="span"
                        position="absolute"
                        bottom="calc(100% + 4px)"
                        right="0"
                        px="8px"
                        py="5px"
                        borderRadius="md"
                        bg="gray.900"
                        color="gray.100"
                        fontSize="11px"
                        lineHeight="1.4"
                        whiteSpace="nowrap"
                        pointerEvents="none"
                        boxShadow="md"
                        borderWidth="1px"
                        borderColor="whiteAlpha.200"
                        display="none"
                        _groupHover={{ display: "block" }}
                        zIndex={9999}
                      >
                        {NOTE_EXPLANATIONS[noteStr]}
                      </Box>
                    </Box>
                  ) : null}
                </HStack>
              </Flex>
            );
          })}
        </VStack>
      </Box>
    );
  }

  function renderBuffs(buffs: SkillBuff[]) {
    // Group consecutive buffs that share the same LBEI entry (same group index)
    const groups: SkillBuff[][] = [];
    for (const buff of buffs) {
      if (!buff.icon && !BUFF_TYPE_NAMES[buff.type]) continue;
      const last = groups[groups.length - 1];
      const rep = last?.[0];
      if (rep && rep.group === buff.group) {
        last.push(buff);
      } else {
        groups.push([buff]);
      }
    }
    return groups.map((g, i) => renderBuffGroup(g, i));
  }

  const hasArea = skill.area.some((v) => v > 0);

  return (
    <TabPanel key={skill.title} px={0} py={3}>
      <Flex
        gap={4}
        align="flex-start"
        minH="180px"
        direction={{ base: "column", md: "row" }}
      >
        {/* left: name + description */}
        <Box flex={1} minW={0}>
          <Text as="b" fontSize={["lg", "lg", "xl"]}>
            <Image
              alt={skill.attr ? skill.attr : "normal"}
              src={`/images/${skill.attr ? skill.attr : "normal"}.png`}
              boxSize={{ base: "16px", md: "18px" }}
              display="inline"
              mr={2}
            />
            {t(skill.name)}
          </Text>

          {/* property badges */}
          {skill.accuracy || skill.guardPierce || (skill.center === 0 && hasArea) ? (
            <Wrap mt={2} spacing={2}>
              {skill.accuracy ? (
                <WrapItem>
                  <Tag size="sm" colorScheme="green" variant="solid" borderRadius="full">
                    ACC Correction {skill.accuracy > 0 ? '+' : ''}{skill.accuracy}%
                  </Tag>
                </WrapItem>
              ) : null}
              {skill.guardPierce ? (
                <WrapItem>
                  <Tag size="sm" colorScheme="red" variant="solid" borderRadius="full">Ignore Protect</Tag>
                </WrapItem>
              ) : null}
              {skill.center === 0 && hasArea ? (
                <WrapItem>
                  <Tag size="sm" colorScheme="purple" variant="solid" borderRadius="full">Fixed Grid</Tag>
                </WrapItem>
              ) : null}
            </Wrap>
          ) : null}

          <Text fontSize={["sm", "md"]} mt={2} color="gray.300">
            {renderDescription()}
          </Text>
        </Box>

        {/* right: AoE grid + stats */}
        {hasArea || skill.range || skill.AP ? (
          <VStack
            spacing={2}
            flexShrink={0}
            align="center"
            alignSelf={{ base: "center", md: "flex-start" }}
          >
            {hasArea ? <SkillArea area={skill.area} center={skill.center} /> : null}
            {skill.range || skill.AP ? (
              <HStack spacing={2}>
                <Tag size="sm" colorScheme="teal" variant="subtle" borderRadius="full">Range {skill.range}</Tag>
                <Tag size="sm" colorScheme="blue" variant="subtle" borderRadius="full">AP {skill.AP}</Tag>
              </HStack>
            ) : null}
          </VStack>
        ) : null}
      </Flex>

      {skill.buffs?.length && showBuffs ? (
        <VStack mt={3} spacing={2} align="stretch">
          {renderBuffs(skill.buffs)}
        </VStack>
      ) : null}
    </TabPanel>
  );
}
