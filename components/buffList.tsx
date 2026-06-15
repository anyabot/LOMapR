/**
 * BuffList — shared component for rendering SkillBuff arrays.
 * Extracted from skillTab.tsx so it can be reused in equipModal and elsewhere.
 *
 * Usage:
 *   import BuffList from '@/components/buffList';
 *   <BuffList buffs={lvl.buffs} />
 */

import { Box, Flex, HStack, Image, Text, VStack } from "@chakra-ui/react";
import React from "react";
import { SkillBuff } from "@/interfaces/skill";
import { t } from "@/lib/strings";
import UnitHoverCard from "./unitHoverCard";

// ─── lookup tables (kept local; import from a shared constants file if preferred) ────

const TARGET_LABELS: Record<number, string> = {
  1: "→ ally", 2: "→ ally (grid)", 3: "→ enemy", 4: "→ enemy (grid)",
  5: "→ all units", 6: "→ all (grid)", 8: "→ all allies", 9: "→ all enemies",
};

const TRIGGER_LABELS: Record<number, string> = {
  0: "On skill use", 1: "When hit", 2: "On hit", 3: "When target is buffed",
  4: "Based on grid position", 5: "HP ≤ {0}%", 6: "HP ≥ {0}%",
  7: "Targeting ally", 8: "When enemy present (wave start)", 9: "On ally death",
  10: "On death", 11: "On enemy kill", 12: "Always", 13: "Battle start",
  14: "After using specific skill", 15: "On attack", 16: "When attacked",
  17: "On wait", 18: "On move", 19: "On evade", 20: "After wave",
  21: "If buffed: {key}", 22: "On kill", 23: "On hit + if buffed",
  24: "On kill (passive)", 25: "HP ≤ {0}%", 26: "HP ≥ {0}%",
  27: "If self in front row", 28: "If self in mid row", 29: "If self in back row",
  30: "Round start", 31: "On critical hit", 32: "If self buffed: {key}",
  33: "If self debuffed: {key}", 34: "If {key} in grid", 35: "When enemy uses skill",
  36: "On hit (passive)", 37: "On resurrect", 38: "When hit (physical)",
  39: "When hit (fire)", 40: "When hit (ice)", 41: "When hit (lightning)",
  42: "After counter-attack", 43: "After being attacked", 44: "When hit by active skill",
  45: "When damaged by active skill", 46: "On evade (active skill)", 47: "On summon",
  48: "On hit (active skill)", 49: "When hit by specific active skill",
  50: "On use skill 1", 51: "On use skill 2", 52: "After support attack",
  53: "After joint attack", 54: "On skill miss (self)", 55: "When active skill misses",
  56: "On kill + counter-kill", 57: "When ally is hit", 58: "When ally hit (physical)",
  59: "When ally hit (fire)", 60: "When ally hit (ice)", 61: "When ally hit (lightning)",
  62: "When ally hit (active skill)", 63: "When ally hits", 64: "When ally uses skill",
};

const APPLY_COND_LABELS: Record<number, string> = {
  0: "If self has [buff type]", 1: "If self has [buff]", 2: "If self in front row",
  3: "If self in mid row", 4: "If self in back row", 5: "If self HP ≥ {0}%",
  6: "If self HP ≤ {0}%", 7: "If self HP < {0}%", 8: "If self HP > {0}%",
  9: "If self has ≥ {0} stacks of [buff]", 10: "If target has [buff type]",
  11: "If target has [buff]", 12: "If target HP ≥ {0}%", 13: "If target HP ≤ {0}%",
  14: "If target is [char]", 15: "If [char] in battle", 16: "If target in front row",
  17: "If target in mid row", 18: "If target in back row",
  19: "If self has [buff] (joint)", 20: "If self has ≥ {0} [buff]",
  21: "If self HP in range", 22: "If self missing [buff]",
  23: "If target has ≥ {0} stacks", 24: "If self missing [buff] (joint)",
  // CHECK_COUNT_* compare a counted group size against {0} (e.g. 27 = total units
  // on both sides ≤ {0}).
  25: "If enemy party ≤ {0}", 26: "If allies ≤ {0}",
  27: "If total units ≤ {0}", 28: "On round {0} and after",
  29: "On round {0} and before", 30: "If [char] not in battle",
  31: "If self has ≥ {0} of [buff]", 32: "On round {0}", 33: "If Bio allies ≤ {0}",
  34: "If AGS allies ≤ {0}", 35: "If Bio enemies ≤ {0}", 36: "If AGS enemies ≤ {0}",
  37: "If ally has [buff]", 38: "If allies are [class]",
  39: "If allies are [role]", 40: "If self is [class]",
  41: "On even round", 42: "On odd round", 43: "If target missing any [buff]",
  44: "If target missing [buff]", 45: "If enemies are [class]",
  46: "If enemies are [role]", 47: "If self ATK > self DEF",
  48: "If self ATK < self DEF", 49: "If self ATK > target ATK",
  50: "If self ATK < target ATK", 51: "If self DEF > target DEF",
  52: "If self DEF < target DEF", 53: "If self EVD > target EVD",
  54: "If self EVD < target EVD", 55: "If self SPD > target SPD",
  56: "If self SPD < target SPD", 57: "If self missing [buff type]",
  58: "If target missing [buff type]", 59: "If ally nearby",
  60: "If no ally nearby", 61: "If target has ≥ {0} [buff]",
  62: "If target missing [buff] (joint)", 64: "Random: if target has [buff]",
  65: "If ≥ {0} of [char] in battle", 66: "If enemy has [buff]",
  67: "If ≥ {0} of ally [buff]", 68: "If ≥ {0} of enemy [buff]",
};

export const BUFF_TYPE_NAMES: Record<number, string> = {
  0: "ATK", 1: "ATK", 2: "DEF", 3: "DEF", 4: "HP", 5: "HP",
  6: "ACC", 7: "ACC", 8: "CRIT", 9: "CRIT", 10: "EVA", 11: "EVA",
  12: "SPD", 13: "SPD", 14: "Fire RES", 15: "Fire RES", 16: "Ice RES", 17: "Ice RES",
  18: "Lightning RES", 19: "Lightning RES", 20: "AP", 21: "Set AP", 22: "Stun",
  23: "Recon", 24: "Thorns", 25: "Phys Reflect", 26: "Fire Reflect",
  27: "Ice Reflect", 28: "Lightning Reflect", 29: "Counterattack",
  30: "Fire Reflect", 31: "Ice Reflect", 32: "Lightning Reflect",
  33: "Damage Nullify", 34: "Damage Minimize", 35: "Damage Minimize",
  36: "DMG Reduction", 37: "DMG Reduction", 38: "Barrier",
  39: "Phys DMG Taken", 40: "Phys DMG Taken", 41: "Fire DMG Taken",
  42: "Fire DMG Taken", 43: "Ice DMG Taken", 44: "Ice DMG Taken",
  45: "Lightning DMG Taken", 46: "Lightning DMG Taken", 47: "Marked",
  48: "DMG Taken Increased", 49: "DMG Taken Increased", 50: "Column Protect",
  51: "Row Protect", 52: "Push Back", 53: "Pull Forward",
  54: "CRIT (Next Attack)", 55: "Range", 56: "Aggro", 57: "DEF Penetration",
  58: "DEF Penetration", 59: "Grid Change", 60: "Anti-Light DMG",
  61: "Anti-Heavy DMG", 62: "Anti-Air DMG", 63: "Change Form", 64: "Change Form",
  65: "Phys DoT", 66: "Fire DoT", 67: "Ice DoT", 68: "Lightning DoT",
  69: "Remove Buff (type)", 70: "Fixed Phys DMG", 71: "Fixed Fire DMG",
  72: "Fixed Ice DMG", 73: "Fixed Lightning DMG", 74: "Provoked",
  75: "Row Protect", 76: "Target Protect", 77: "Follow-up Attack",
  78: "Rooted", 79: "Silenced", 80: "DMG Amp (by own HP)",
  81: "DMG Amp (by target HP)", 82: "Battle Continuation",
  83: "Additional Phys DMG", 84: "Additional Fire DMG", 85: "Additional Ice DMG",
  86: "Additional Lightning DMG", 87: "Marked", 88: "Remove Buff",
  89: "Remove Debuff", 90: "Status Resist", 91: "Status Resist",
  92: "Buff Rate", 93: "Remove Summon", 94: "Ignore Barrier / DMG Reduction",
  95: "EXP Up", 96: "Analyze", 97: "Remove ALL Effects",
  98: "Battle Continuation", 99: "Remove All Buffs", 100: "Remove All Debuffs",
  101: "Debuff Immunity", 102: "Cooperative Attack with Active Skill 1",
  103: "Cooperative Attack with Active Skill 2", 104: "Max HP", 105: "Max HP",
  106: "Skill Power", 107: "Range (skill 1)", 108: "Range (skill 2)",
  109: "Area DMG Focus", 110: "Area DMG Dispersion",
  111: "Skill Power Proportional to Own EVA",
  112: "Skill Power Resist Proportional to Own EVA",
  113: "Skill Power Proportional to Own DEF",
  114: "CRIT Resist Proportional to Own DEF", 115: "Proportional ATK Up",
  116: "Min Fire RES", 117: "Min Ice RES", 118: "Min Lightning RES",
  119: "Fire RES Fix", 120: "Ice RES Fix", 121: "Lightning RES Fix",
  122: "Reverse Fire RES Debuff", 123: "Reverse Ice RES Debuff",
  124: "Reverse Lightning RES Debuff", 125: "Buff Prevention",
  126: "Buff Removal Resist", 127: "Max Action Count", 128: "Taunt (attacker)",
  129: "DEF Penetration Resist Proportional to Own current HP",
  130: "Ignore Protection Activated", 131: "Ignore Protection Disabled",
  132: "DMG Recovery (round)", 133: "Same Skill DMG Reduce",
  134: "Silenced (skill 1)", 135: "Silenced (skill 2)", 136: "Silenced (passive)",
  137: "Add Role Type", 138: "Area Skill Power", 139: "Area DMG",
  140: "Double Attack", 141: "Resist Check ATK", 142: "DEF DMG Reduce",
  143: "DEF DMG Add", 144: "DMG (% giver max HP)", 145: "DMG (% giver cur HP)",
  146: "DMG (% target max HP)", 147: "DMG (% target cur HP)",
  148: "AP Cost Adjust (skill 1)", 149: "AP Cost Adjust (skill 2)",
  150: "Buff Prevention (specific)", 151: "All Effect Prevention (specific)",
};

const NOTE_EXPLANATIONS: Record<string, string> = {
  Instant: "Applied immediately and does not persist.",
  Renew: "Removes all existing stacks of this effect and replaces them with a new one.",
  Single: "Only applied if no instance of this effect already exists.",
  Update: "Adds a new stack until the limit is reached; once at the limit, removes the oldest stack and adds a new one.",
};

const BODY_NAMES:  Record<number, string> = { 0: "Bioroid", 1: "AGS" };
const CLASS_NAMES: Record<number, string> = { 0: "Light", 1: "Heavy", 2: "Air" };
const ROLE_NAMES:  Record<number, string> = { 0: "Defender", 1: "Attacker", 2: "Supporter" };

// ─── helpers ────────────────────────────────────────────────────────────────

function attrStyle(attr: number) {
  return {
    label: ["Buff", "Debuff", "Skill Buff", "Normal Effect", "Rogue Buff", "Rogue Debuff"][attr] ?? "Normal Effect",
    bg:     attr === 0 ? "#276749" : attr === 1 ? "#9b2c2c" : attr === 2 ? "#2c5282" : attr === 4 ? "#9c4221" : attr === 5 ? "#702459" : "#2d3748",
    fg:     attr === 0 ? "#9ae6b4" : attr === 1 ? "#feb2b2" : attr === 2 ? "#90cdf4" : attr === 4 ? "#fbd38d" : attr === 5 ? "#fbb6ce" : "#e2e8f0",
    border: attr === 0 ? "#38a169" : attr === 1 ? "#e53e3e" : attr === 2 ? "#3182ce" : attr === 4 ? "#dd6b20" : attr === 5 ? "#d53f8c" : "#4a5568",
  };
}

// Buff strings are "Name: Description". Take the name = everything up to the first
// separator colon, ignoring colons inside <...> so a bracketed name that itself has a
// colon ("<True Ancestor's Authority: Fate Manipulation> : ...") isn't truncated.
function buffName(s: string): string {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "<") depth++;
    else if (c === ">") depth = Math.max(0, depth - 1);
    else if (c === ":" && depth === 0) return s.slice(0, i).trim();
  }
  return s.trim();
}

function resolveCondVal(v: string, nam: string): string {
  const tr = (id: string) => { const r = t(id); return r !== id ? r : ""; };
  const numV = parseInt(v, 10);
  const isNumeric = !isNaN(numV) && String(numV) === v;
  return isNumeric
    ? (BUFF_TYPE_NAMES[numV] ?? String(numV))
    : v ? buffName(tr(nam) || tr(`BuffName_${v}`) || v.replace(/^Effect_[^_]+_/, "").replace(/^Char_[^_]+_/, "").replace(/_/g, " ")) : "";
}

// one apply-condition's data (a buff has a primary + an optional secondary).
interface CondData { cond: number; vals: string[]; names: string[]; count: number; }

const primaryCond = (b: SkillBuff): CondData =>
  ({ cond: b.applyCond, vals: b.applyCondVals, names: b.applyCondNames, count: b.applyCondCount });
const secondaryCond = (b: SkillBuff): CondData | null =>
  b.applyCond2 != null && b.applyCond2 !== 63
    ? { cond: b.applyCond2, vals: b.applyCondVals2 ?? [], names: b.applyCondNames2 ?? [], count: b.applyCondCount2 ?? 0 }
    : null;

function resolveApplyCondParts(c: CondData): { before: string; name: string; after: string } | null {
  const applyCondRaw = c.cond !== 63 ? APPLY_COND_LABELS[c.cond] : null;
  if (!applyCondRaw) return null;
  const tr = (id: string) => { const r = t(id); return r !== id ? r : ""; };

  const v   = c.vals[0] ?? "";

  const nameToken = /\[buff type\]/.test(applyCondRaw) ? "[buff type]"
    : /\[buff\]/.test(applyCondRaw) ? "[buff]"
    : /\[char\]/.test(applyCondRaw) ? "[char]"
    : /\[class\]/.test(applyCondRaw) ? "[class]"
    : /\[role\]/.test(applyCondRaw) ? "[role]"
    : /\[body\]/.test(applyCondRaw) ? "[body]"
    : null;

  // class/role/body conditions encode the type as the applyCondVals ordinal(s).
  const TYPE_MAP: Record<string, Record<number, string>> =
    { "[class]": CLASS_NAMES, "[role]": ROLE_NAMES, "[body]": BODY_NAMES };

  const has0 = /\{0\}/.test(applyCondRaw);
  const isHp = has0 && /\{0\}%/.test(applyCondRaw);

  // de-duplicate while preserving order, dropping empties.
  const uniq = (xs: string[]) => xs.filter((x, i) => x && xs.indexOf(x) === i);

  let nameVal = "";
  if (nameToken === "[buff type]") {
    // a single condition can list several buff-type ordinals (e.g. EVA / Rooted);
    // map them all, not just the first.
    const names = c.vals.map((val) => {
      const numV = parseInt(val, 10);
      return !isNaN(numV) ? (BUFF_TYPE_NAMES[numV] ?? String(numV)) : val;
    });
    nameVal = uniq(names).join(" / ");
  } else if (nameToken === "[buff]" || nameToken === "[char]") {
    if (!v) return null;
    // a single condition can list several buffs/chars (e.g. "target is A / B / C");
    // resolve every entry and dedup by display name, not just the first.
    const names = c.vals.map((val, i) => {
      const nm2 = c.names[i] ?? "";
      const resolved = tr(nm2) || tr(`BuffName_${val}`)
        || val.replace(/^Effect_[^_]+_/, "").replace(/^Char_[^_]+_/, "").replace(/_/g, " ");
      return buffName(resolved);   // cut the ": description" tail, like the group header
    });
    nameVal = uniq(names).join(" / ");
  } else if (nameToken && TYPE_MAP[nameToken]) {
    // [class]/[role]/[body]: the value(s) are type ordinals (e.g. 0=Light).
    if (!v) return null;
    const map = TYPE_MAP[nameToken];
    const names = c.vals.map((val) => {
      const numV = parseInt(val, 10);
      return !isNaN(numV) ? (map[numV] ?? String(numV)) : val;
    });
    nameVal = uniq(names).join(" / ");
  }

  let val0 = "";
  if (has0) {
    if (c.count > 0) {
      // stack/count conditions (applyCond 9/20/23/31) keep their {0} threshold in
      // the dedicated count field, not in vals.
      val0 = String(c.count);
    } else if (nameToken && v && !v.match(/^\d/)) {
      // a token condition whose value is a key, with no count → drop the {0}.
      val0 = "";
    } else {
      // a no-token {0} condition (e.g. "If ≥ {0} allies alive") can list several
      // thresholds — one per skill level. They're contiguous, so collapse to a
      // min–max range (single value when min == max).
      const nums = c.vals.map((x) => parseFloat(x)).filter((n) => !isNaN(n));
      if (nums.length === 0) {
        val0 = v || "?";
      } else {
        const fmt = (n: number) => (isHp ? Math.round(n * 100) : Math.round(n));
        const lo = fmt(Math.min(...nums));
        const hi = fmt(Math.max(...nums));
        val0 = lo === hi ? String(lo) : `${lo}-${hi}`;
      }
    }
  }

  let template = applyCondRaw;
  if (has0) template = template.replace("{0}", val0 || "?");
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

function resolveExtraCondTags(buff: SkillBuff): string[] {
  if (buff.applyCond !== 63 || buff.applyCondVals.length === 0) return [];
  return buff.applyCondVals.map((v, i) => resolveCondVal(v, buff.applyCondNames[i] ?? "")).filter(Boolean);
}

// ─── sub-components ─────────────────────────────────────────────────────────

const Pill = ({ bg, color, children }: { bg: string; color: string; children: React.ReactNode }) => (
  <Box as="span" display="inline-block" px="6px" py="1px" borderRadius="3px"
    bg={bg} color={color} fontSize="11px" lineHeight="18px" whiteSpace="nowrap">
    {children}
  </Box>
);

// a buff's value string + sign/color, by its type/fmt.
function buffValue(buff: SkillBuff): { str: string; color: string } {
  let valStr = "", valPositive = true;
  if (buff.type === 33 && buff.val !== 0) valStr = `×${buff.val}`;
  else if ((buff.type === 34 || buff.type === 35) && buff.val !== 0) valStr = `< ${buff.val}`;
  else if (buff.fmt === "pct" && buff.val !== 0) {
    valStr = `${buff.val > 0 ? "+" : ""}${Math.round(buff.val * 100)}%`; valPositive = buff.val > 0;
  } else if (buff.type === 21 && buff.val !== 0) valStr = String(buff.val);
  else if (buff.fmt === "flat" && buff.val !== 0) {
    valStr = `${buff.val > 0 ? "+" : ""}${buff.val}`; valPositive = buff.val > 0;
  } else if (buff.fmt === "tid" && buff.val !== 0) valStr = BUFF_TYPE_NAMES[buff.val] ?? String(buff.val);
  const color = buff.fmt === "tid" || [21, 33, 34, 35].includes(buff.type)
    ? "gray.200" : valPositive ? "green.300" : "red.300";
  return { str: valStr, color };
}

// One full buff effect line: icon + name + value, plus description and the
// duration/stack/note column. Used by both the normal groups and the 65 tier table.
function BuffEffectRow({ buff, topBorder = false, extraCondNode }: { buff: SkillBuff; topBorder?: boolean; extraCondNode?: React.ReactNode }) {
  if (!buff.icon && !BUFF_TYPE_NAMES[buff.type]) return null;
  const { str: valStr, color: valColor } = buffValue(buff);
  const descFill = valStr.replace(/^[+×<]\s?/, "").replace(/%$/, "");
  const as = attrStyle(buff.attr);

  const name = (
    <HStack spacing={1.5} flexWrap="wrap">
      {buff.rate < 1 ? <Box px="5px" py="1px" borderRadius="3px" bg="yellow.900" color="yellow.300" fontSize="11px" lineHeight="16px">{Math.round(buff.rate * 100)}%</Box> : null}
      {buff.icon ? <Image src={`/images/effects/BuffIcon_${buff.icon}.png`} boxSize="16px" alt={buff.icon} display="inline-block" /> : null}
      <Text as="span" fontSize="sm" fontWeight="bold" textDecoration="underline" color="gray.200">{BUFF_TYPE_NAMES[buff.type]}</Text>
      {valStr ? <Text as="span" fontSize="sm" fontWeight="bold" color={valColor}>{valStr}</Text> : null}
    </HStack>
  );

  let durStr = "";
  if (buff.eraseType === 3) durStr = "Permanent";
  else if (buff.eraseType === 0 && buff.turns > 0) durStr = `${buff.turns} rounds`;
  else if (buff.eraseType === 1) durStr = buff.turns > 1 ? `×${buff.turns}` : "×1";

  const stackStr = buff.eraseType === 2 ? ""
    : buff.overlapType === 4 && buff.overlapMax === 0 ? "Unlimited stacks"
    : buff.overlapType === 4 ? ` Max ${buff.overlapMax} stacks`
    : buff.overlapType === 2 ? "+duration" : "";

  const rawDesc = t(buff.desc);
  const filledDesc = descFill ? rawDesc.replace("{0}", descFill) : rawDesc;
  const descResolved = rawDesc && rawDesc !== buff.desc;

  let noteStr = "";
  if (buff.eraseType === 0 && buff.turns === 0) noteStr = "Instant";
  else if (buff.overlapType === 1) noteStr = "Renew";
  else if (buff.overlapType === 3) noteStr = "Single";
  else if (buff.overlapType === 4 && buff.overlapMax !== 0) noteStr = "Update";

  return (
    <Box borderTopWidth={topBorder ? "1px" : "0"} borderTopColor="whiteAlpha.100">
      {extraCondNode ? <Box px={2} pt={1.5} pb={0}>{extraCondNode}</Box> : null}
      <Flex px={2} py={1.5} gap={2} align="flex-start">
      <Box flex={1} minW={0}>
        {name}
        {descResolved ? <Text fontSize="xs" color="gray.500" mt="2px" lineHeight="short">{filledDesc}</Text> : null}
      </Box>
      <HStack spacing={1} flexShrink={0} mt="2px">
        <Box px="6px" py="1px" borderRadius="3px" bg={as.bg} color={as.fg} fontSize="11px" fontWeight="bold" lineHeight="16px">{as.label}</Box>
        {durStr   ? <Box px="5px" py="1px" borderRadius="3px" bg="gray.700" color="gray.300" fontSize="11px" lineHeight="16px">{durStr}</Box>   : null}
        {stackStr ? <Box px="5px" py="1px" borderRadius="3px" bg="gray.700" color="cyan.300"  fontSize="11px" lineHeight="16px">{stackStr}</Box> : null}
        {noteStr ? (
          <Box as="span" position="relative" display="inline-flex" alignItems="center"
            gap="3px" px="5px" py="1px" borderRadius="3px" bg="gray.700"
            color="yellow.300" fontSize="11px" lineHeight="16px" cursor="help" role="group">
            {noteStr}
            <Box as="span" opacity={0.6} fontSize="10px">?</Box>
            <Box as="span" position="absolute" bottom="calc(100% + 4px)" right="0"
              px="8px" py="5px" borderRadius="md" bg="gray.900" color="gray.100"
              fontSize="11px" lineHeight="1.4" whiteSpace="nowrap"
              pointerEvents="none" boxShadow="md" borderWidth="1px"
              borderColor="whiteAlpha.200" display="none"
              _groupHover={{ display: "block" }} zIndex={9999}>
              {NOTE_EXPLANATIONS[noteStr]}
            </Box>
          </Box>
        ) : null}
      </HStack>
      </Flex>
    </Box>
  );
}

// The trigger / target / apply-condition / filter pill row for a buff. `skipCond65`
// drops the 65 ("count of <char set>") pill, used inside the 65 tier table where the
// count is already the row label. Returns null if there are no tags to show.
function BuffCondTags({ rep, skipCond65 = false }: { rep: SkillBuff; skipCond65?: boolean }) {
  const tr  = (id: string) => { const r = t(id); return r !== id ? r : ""; };
  const trg = (id: string) => { const r = tr(id); return r ? buffName(r) : ""; };

  const triggerRaw = TRIGGER_LABELS[rep.trigger];
  const triggerLabel = triggerRaw
    ? triggerRaw
        .replace("{0}", rep.triggerVal ? String(Math.round(rep.triggerVal * 100)) : "?")
        .replace("{key}", rep.triggerName ? (trg(rep.triggerName) || rep.triggerName) : rep.triggerKey || "?")
    : null;
  const targetLabel = TARGET_LABELS[rep.targetType] ?? null;

  // resolve both apply-conditions; optionally drop the 65 one.
  const prim = primaryCond(rep);
  const sec  = secondaryCond(rep);
  const p1 = (skipCond65 && prim.cond === COND65) ? null : resolveApplyCondParts(prim);
  const p2 = sec ? ((skipCond65 && sec.cond === COND65) ? null : resolveApplyCondParts(sec)) : null;
  const extraCondTags = resolveExtraCondTags(rep);

  const effectiveCondAttr = rep.condAttr !== 6
    ? rep.condAttr
    : ((rep.applyCondAttrs ?? []).find((a: number) => a >= 0) ?? 6);
  const condIsBuff = p1 !== null && /\[buff|\[char/.test(APPLY_COND_LABELS[rep.applyCond] ?? "");
  const condAttrLabel = effectiveCondAttr === 0 ? " (buff)"
    : effectiveCondAttr === 1 ? " (debuff)"
    : effectiveCondAttr >= 2 && effectiveCondAttr !== 6 ? " (all)"
    : (condIsBuff || extraCondTags.length > 0) ? " (all)"
    : "";

  const hasAny = triggerLabel || targetLabel || p1 || p2 || extraCondTags.length
    || rep.eraseType === 2 || rep.eraseType === 4
    || (rep.filterBody?.length ?? 0) || (rep.filterClass?.length ?? 0) || (rep.filterRole?.length ?? 0);
  if (!hasAny) return null;

  return (
    <Flex gap={1.5} flexWrap="wrap" align="center">
      {triggerLabel ? <Pill bg="purple.900" color="purple.200">{triggerLabel}</Pill> : null}
      {targetLabel  ? <Pill bg="gray.700"   color="gray.300">{targetLabel}</Pill>  : null}
      {p1 ? (
        <Pill bg="teal.900" color="teal.200">
          {p1.before}
          {p1.name ? <Box as="span" fontWeight="semibold" color="teal.100">{p1.name}</Box> : null}
          {p1.after}
          {condAttrLabel ? <Box as="span" color="teal.400">{condAttrLabel}</Box> : null}
        </Pill>
      ) : extraCondTags.length > 0 ? (
        <Pill bg="teal.900" color="teal.200">
          if: {extraCondTags.join(" / ")}
          {condAttrLabel ? <Box as="span" color="teal.400">{condAttrLabel}</Box> : null}
        </Pill>
      ) : null}
      {p2 ? (
        <Pill bg="teal.900" color="teal.200">
          {p2.before}
          {p2.name ? <Box as="span" fontWeight="semibold" color="teal.100">{p2.name}</Box> : null}
          {p2.after}
        </Pill>
      ) : null}
      {rep.eraseType === 2 ? <Pill bg="orange.900" color="orange.300">on trigger</Pill> : null}
      {rep.eraseType === 4 ? <Pill bg="orange.900" color="orange.300">preserved</Pill>  : null}
      {(rep.filterBody?.length  ?? 0) > 0 ? <Pill bg="cyan.900"  color="cyan.200" >{rep.filterBody.map((v: number)  => BODY_NAMES[v]  ?? v).join("/")} only</Pill> : null}
      {(rep.filterClass?.length ?? 0) > 0 ? <Pill bg="blue.900"  color="blue.200" >{rep.filterClass.map((v: number) => CLASS_NAMES[v] ?? v).join("/")} only</Pill> : null}
      {(rep.filterRole?.length  ?? 0) > 0 ? <Pill bg="green.900" color="green.200">{rep.filterRole.map((v: number)  => ROLE_NAMES[v]  ?? v).join("/")} only</Pill> : null}
    </Flex>
  );
}

function BuffGroup({ group, groupIdx }: { group: SkillBuff[]; groupIdx: number }) {
  const rep = group[0];
  const uniformAttr = group.every((b) => b.attr === rep.attr);
  const attrBorder  = uniformAttr ? attrStyle(rep.attr).border : "#4a5568";
  const tr  = (id: string) => { const r = t(id); return r !== id ? r : ""; };
  const trg = (id: string) => { const r = tr(id); return r ? buffName(r) : ""; };
  // global sometimes stores "0" for an unnamed buff instead of an empty string;
  // treat both as "no name" so the header shows "???" rather than the attr label.
  const rawName = trg(rep.name);
  const groupName = rawName && rawName !== "0" ? rawName : "";

  const resolveTriggerLabel = (triggerType: number) => {
    const raw = TRIGGER_LABELS[triggerType];
    if (!raw) return null;
    const valStr = rep.triggerVal ? String(Math.round(rep.triggerVal * 100)) : "?";
    const keyStr = rep.triggerName ? (trg(rep.triggerName) || rep.triggerName) : rep.triggerKey || "?";
    return raw.replace("{0}", valStr).replace("{key}", keyStr);
  };

  const triggerLabel  = resolveTriggerLabel(rep.trigger);
  const targetLabel   = TARGET_LABELS[rep.targetType] ?? null;
  const applyCondParts = resolveApplyCondParts(primaryCond(rep));
  const sec = secondaryCond(rep);
  const applyCondParts2 = sec ? resolveApplyCondParts(sec) : null;
  const extraCondTags  = resolveExtraCondTags(rep);
  const condIsBuff = applyCondParts !== null && /\[buff|\[char/.test(APPLY_COND_LABELS[rep.applyCond] ?? "");
  const effectiveCondAttr = rep.condAttr !== 6
    ? rep.condAttr
    : ((rep.applyCondAttrs ?? []).find((a: number) => a >= 0) ?? 6);
  const condAttrLabel = effectiveCondAttr === 0 ? " (buff)"
    : effectiveCondAttr === 1 ? " (debuff)"
    : effectiveCondAttr >= 2 && effectiveCondAttr !== 6 ? " (all)"
    : (condIsBuff || extraCondTags.length > 0) ? " (all)"
    : "";

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
      {/* header */}
      <Box px={2} pt={1.5} pb={1} bg="blackAlpha.300" borderBottomWidth="1px" borderBottomColor="whiteAlpha.100">
        <Flex align="center" w="100%" mb={1}>
          <Text fontSize="sm" color="gray.100" fontWeight="bold" textDecoration="underline" flexShrink={1} minW={0}>
            {groupName || "???"}
          </Text>
        </Flex>
        <Flex gap={1.5} flexWrap="wrap" align="center">
          {triggerLabel ? <Pill bg="purple.900" color="purple.200">{triggerLabel}</Pill> : null}
          {targetLabel  ? <Pill bg="gray.700"   color="gray.300">{targetLabel}</Pill>  : null}
          {applyCondParts ? (
            <Pill bg="teal.900" color="teal.200">
              {applyCondParts.before}
              {applyCondParts.name ? <Box as="span" fontWeight="semibold" color="teal.100">{applyCondParts.name}</Box> : null}
              {applyCondParts.after}
              {condAttrLabel ? <Box as="span" color="teal.400">{condAttrLabel}</Box> : null}
            </Pill>
          ) : extraCondTags.length > 0 ? (
            <Pill bg="teal.900" color="teal.200">
              if: {extraCondTags.join(" / ")}
              {condAttrLabel ? <Box as="span" color="teal.400">{condAttrLabel}</Box> : null}
            </Pill>
          ) : null}
          {applyCondParts2 ? (
            <Pill bg="teal.900" color="teal.200">
              {applyCondParts2.before}
              {applyCondParts2.name ? <Box as="span" fontWeight="semibold" color="teal.100">{applyCondParts2.name}</Box> : null}
              {applyCondParts2.after}
            </Pill>
          ) : null}
          {rep.eraseType === 2 ? <Pill bg="orange.900" color="orange.300">on trigger</Pill>   : null}
          {rep.eraseType === 4 ? <Pill bg="orange.900" color="orange.300">preserved</Pill>    : null}
          {(rep.filterBody?.length  ?? 0) > 0 ? <Pill bg="cyan.900"  color="cyan.200"  >{rep.filterBody.map((v: number)  => BODY_NAMES[v]  ?? v).join("/")} only</Pill> : null}
          {(rep.filterClass?.length ?? 0) > 0 ? <Pill bg="blue.900"  color="blue.200"  >{rep.filterClass.map((v: number) => CLASS_NAMES[v] ?? v).join("/")} only</Pill> : null}
          {(rep.filterRole?.length  ?? 0) > 0 ? <Pill bg="green.900" color="green.200" >{rep.filterRole.map((v: number)  => ROLE_NAMES[v]  ?? v).join("/")} only</Pill> : null}
        </Flex>
      </Box>

      {/* effect rows */}
      <VStack spacing={0} align="stretch">
        {group.map((buff, i) => (
          <BuffEffectRow key={`${groupIdx}-${i}`} buff={buff} topBorder={i > 0} />
        ))}
      </VStack>
    </Box>
  );
}

// ── applyCond=65 "count of <char set>" tier table ────────────────────────────
// 65 is an EXACT-count gate: as N of a fixed char set are in battle, a different
// tier of buffs applies. Rather than render each tier as a disconnected block, we
// cluster all 65-groups that share a char set into one table: one row per count.

const COND65 = 65;

// the 65 condition on a buff (it can sit in either condition slot); null if none.
function cond65(b: SkillBuff): { count: number; vals: string[] } | null {
  if (b.applyCond === COND65) return { count: b.applyCondCount, vals: b.applyCondVals };
  if (b.applyCond2 === COND65) return { count: b.applyCondCount2 ?? 0, vals: b.applyCondVals2 ?? [] };
  return null;
}
const setKey = (vals: string[]) => vals.join("|");

// a clickable unit reference (hover card + link to the detail page), inline so it
// sits inside the requirement sentence without breaking onto its own line.
const shortKey = (k: string) =>
  k.replace(/^Char_[A-Za-z0-9]+_/, '').replace(/_(N|EW\d*|TU\d+|CH)$/, '').replace(/_/g, ' ');

function CharSetName({ vals }: { vals: string[] }) {
  return (
    <>
      {vals.map((v, i) => {
        const label = (() => { const r = t(`PCName_${v}`); return r !== `PCName_${v}` ? r : shortKey(v); })();
        return (
          <React.Fragment key={v}>
            {i > 0 && <Box as="span" color="gray.400"> / </Box>}
            <UnitHoverCard unitId={v} inline>
              <Box as="span" color="yellow.100" fontWeight="semibold" cursor="pointer"
                textDecoration='underline'>{label}</Box>
            </UnitHoverCard>
          </React.Fragment>
        );
      })}
    </>
  );
}

// Derive conditions shared across ALL buffs in a cond65 group so they can be
// shown once in the header. Checks: trigger, targetType, and the non-65 applyCond.
// Returns { rep, sharedTrigger, sharedTarget, sharedCond } — all optional.
function sharedCond65Context(tiers: Map<number, SkillBuff[]>): {
  rep: SkillBuff | null;
  sharedTrigger: boolean;
  sharedTarget: boolean;
  sharedApplyCond: number | null;
} {
  const allBuffs = Array.from(tiers.values()).flat();
  if (allBuffs.length === 0) return { rep: null, sharedTrigger: false, sharedTarget: false, sharedApplyCond: null };
  const first = allBuffs[0];

  const sharedTrigger = allBuffs.every((b) => b.trigger === first.trigger);
  const sharedTarget  = allBuffs.every((b) => b.targetType === first.targetType);

  // non-65 applyCond: the cond slot that isn't 65 and isn't "always" (63)
  const getNonCond65Cond = (b: SkillBuff): number | null => {
    if (b.applyCond !== COND65 && b.applyCond !== 63 && b.applyCond != null) return b.applyCond;
    if (b.applyCond2 !== COND65 && b.applyCond2 !== 63 && b.applyCond2 != null) return b.applyCond2;
    return null;
  };
  const firstCond = getNonCond65Cond(first);
  const sharedApplyCond = firstCond !== null && allBuffs.every((b) => getNonCond65Cond(b) === firstCond)
    ? firstCond : null;

  const hasAnything = sharedTrigger || sharedTarget || sharedApplyCond !== null;
  return { rep: hasAnything ? first : null, sharedTrigger, sharedTarget, sharedApplyCond };
}

// Returns a BuffCondTags node for the non-shared conditions on a specific buff,
// or null if everything is already covered by the shared header.
function extraCondNode(
  bf: SkillBuff,
  ctx: ReturnType<typeof sharedCond65Context>,
): React.ReactNode | null {
  // Build a synthetic "rep" that zeroes out whatever is already in the shared header.
  const synthetic: SkillBuff = {
    ...bf,
    trigger:    ctx.sharedTrigger ? 12 : bf.trigger,   // 12 = "Always" (no pill)
    targetType: ctx.sharedTarget  ? 0  : bf.targetType, // 0 has no label
  };
  // Also null out the shared applyCond slot
  if (ctx.sharedApplyCond !== null) {
    if (synthetic.applyCond !== COND65 && synthetic.applyCond === ctx.sharedApplyCond) {
      synthetic.applyCond = 63; // treat as "always" → no pill
    } else if (synthetic.applyCond2 !== COND65 && synthetic.applyCond2 === ctx.sharedApplyCond) {
      synthetic.applyCond2 = 63;
    }
  }
  const node = <BuffCondTags rep={synthetic} skipCond65 />;
  // Check if there's anything left to show after nulling out shared parts.
  const hasExtra =
    (!ctx.sharedTrigger && TRIGGER_LABELS[bf.trigger] != null) ||
    (!ctx.sharedTarget  && TARGET_LABELS[bf.targetType] != null) ||
    (ctx.sharedApplyCond === null && (
      (bf.applyCond  !== COND65 && bf.applyCond  !== 63 && bf.applyCond  != null) ||
      (bf.applyCond2 !== COND65 && bf.applyCond2 !== 63 && bf.applyCond2 != null)
    ));
  return hasExtra ? node : null;
}

// One tier table for a char set: header = the set, rows = count → its buff effects.
function Cond65Group({ tiers, setVals }: { tiers: Map<number, SkillBuff[]>; setVals: string[] }) {
  const counts = Array.from(tiers.keys()).sort((a, b) => a - b);
  const ctx = sharedCond65Context(tiers);
  
  const group = tiers.get(counts[0])!;
  const rep = group[0];
  const tr  = (id: string) => { const r = t(id); return r !== id ? r : ""; };
  const trg = (id: string) => { const r = tr(id); return r ? buffName(r) : ""; };
  // global sometimes stores "0" for an unnamed buff instead of an empty string;
  // treat both as "no name" so the header shows "???" rather than the attr label.
  const rawName = trg(rep.name);
  const groupName = rawName && rawName !== "0" ? rawName : "";

  return (
    <Box w="100%" borderLeftWidth="3px" borderLeftColor="#3182ce" borderRadius="4px" overflow="clip" bg="gray.800">
      <Box px={2} pt={1.5} pb={1.5} bg="blackAlpha.300" borderBottomWidth="1px" borderBottomColor="whiteAlpha.100">
        <Text fontSize="sm" color="gray.100" fontWeight="bold">
          { groupName } — <Box as="span" color="teal.100"><CharSetName vals={setVals} /></Box>
        </Text>
        <Text fontSize="xs" color="gray.500">scales with how many of these units are in battle</Text>
        {/* shared trigger / target / applyCond shown once under the title */}
        {ctx.rep ? (
          <Box mt={1}>
            <BuffCondTags rep={ctx.rep} skipCond65 />
          </Box>
        ) : null}
      </Box>
      <VStack spacing={0} align="stretch" divider={<Box h="1px" bg="whiteAlpha.200" />}>
        {counts.map((n) => (
          <Flex key={n} align="stretch">
            <Flex flexShrink={0} w="84px" px={2} py={1.5} align="flex-start" justify="center"
              bg="blackAlpha.300" borderRightWidth="1px" borderRightColor="whiteAlpha.100">
              <Pill bg="blue.900" color="blue.200">{n} in battle</Pill>
            </Flex>
            <VStack flex={1} minW={0} spacing={0} align="stretch">
              {tiers.get(n)!.map((bf, i) => (
                <BuffEffectRow key={i} buff={bf} topBorder={i > 0} extraCondNode={extraCondNode(bf, ctx)} />
              ))}
            </VStack>
          </Flex>
        ))}
      </VStack>
    </Box>
  );
}

// ─── public API ─────────────────────────────────────────────────────────────

interface BuffListProps {
  buffs: SkillBuff[];
}

export default function BuffList({ buffs }: BuffListProps) {
  // Group consecutive buffs that share the same group index.
  const groups: SkillBuff[][] = [];
  for (const buff of buffs) {
    if (!buff.icon && !BUFF_TYPE_NAMES[buff.type]) continue;
    const last = groups[groups.length - 1];
    const rep  = last?.[0];
    if (rep && rep.group === buff.group) {
      last.push(buff);
    } else {
      groups.push([buff]);
    }
  }

  if (!groups.length) return null;

  // Split groups into normal blocks and 65 tier-tables (clustered by char set).
  // 65-table position is anchored to where its char set first appears, so order is
  // preserved relative to the surrounding buffs.
  type Item =
    | { kind: "group"; group: SkillBuff[]; idx: number }
    | { kind: "cond65"; setVals: string[]; tiers: Map<number, SkillBuff[]> };
  const items: Item[] = [];
  const tableBySet = new Map<string, Extract<Item, { kind: "cond65" }>>();

  groups.forEach((g, idx) => {
    const c = cond65(g[0]);
    if (!c) { items.push({ kind: "group", group: g, idx }); return; }
    const key = setKey(c.vals);
    let tbl = tableBySet.get(key);
    if (!tbl) {
      tbl = { kind: "cond65", setVals: c.vals, tiers: new Map() };
      tableBySet.set(key, tbl);
      items.push(tbl);          // anchor the table where this set first appears
    }
    const row = tbl.tiers.get(c.count) ?? [];
    row.push(...g);
    tbl.tiers.set(c.count, row);
  });

  return (
    <VStack spacing={2} align="stretch">
      {items.map((it, i) =>
        it.kind === "group"
          ? <BuffGroup key={`g${it.idx}`} group={it.group} groupIdx={it.idx} />
          : <Cond65Group key={`c${i}`} setVals={it.setVals} tiers={it.tiers} />,
      )}
    </VStack>
  );
}