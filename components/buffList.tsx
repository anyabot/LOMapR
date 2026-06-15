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
  9: "If self has [buff] stacks", 10: "If target has [buff type]",
  11: "If target has [buff]", 12: "If target HP ≥ {0}%", 13: "If target HP ≤ {0}%",
  14: "If target is [char]", 15: "If [char] in battle", 16: "If target in front row",
  17: "If target in mid row", 18: "If target in back row",
  19: "If self has [buff] (joint)", 20: "If self has ≥ {0} [buff]",
  21: "If self HP in range", 22: "If self missing [buff]",
  23: "If target has ≥ {0} stacks", 24: "If self missing [buff] (joint)",
  25: "If ≥ {0} other allies alive", 26: "If ≥ {0} allies alive",
  27: "If ≥ {0} units alive", 28: "On round {0} and after",
  29: "On round {0} and before", 30: "If [char] not in battle",
  31: "If self has ≥ {0} buffs", 32: "On round {0}", 33: "If ≥ {0} Bio allies",
  34: "If ≥ {0} AGS allies", 35: "If ≥ {0} Bio enemies", 36: "If ≥ {0} AGS enemies",
  37: "If ally has [buff]", 38: "If ≥ {0} allies of class",
  39: "If ≥ {0} allies of role", 40: "If self is troop type",
  41: "On even round", 42: "On odd round", 43: "If target missing any [buff]",
  44: "If target missing [buff]", 45: "If ≥ {0} enemies of class",
  46: "If ≥ {0} enemies of role", 47: "If self ATK > self DEF",
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

function resolveCondVal(v: string, nam: string): string {
  const tr = (id: string) => { const r = t(id); return r !== id ? r : ""; };
  const numV = parseInt(v, 10);
  const isNumeric = !isNaN(numV) && String(numV) === v;
  return isNumeric
    ? (BUFF_TYPE_NAMES[numV] ?? String(numV))
    : v ? (tr(nam) || tr(`BuffName_${v}`) || v.replace(/^Effect_[^_]+_/, "").replace(/^Char_[^_]+_/, "").replace(/_/g, " ")) : "";
}

function resolveApplyCondParts(buff: SkillBuff): { before: string; name: string; after: string } | null {
  const applyCondRaw = buff.applyCond !== 63 ? APPLY_COND_LABELS[buff.applyCond] : null;
  if (!applyCondRaw) return null;
  const tr = (id: string) => { const r = t(id); return r !== id ? r : ""; };

  const v   = buff.applyCondVals[0] ?? "";
  const nam = buff.applyCondNames[0] ?? "";

  const nameToken = /\[buff type\]/.test(applyCondRaw) ? "[buff type]"
    : /\[buff\]/.test(applyCondRaw) ? "[buff]"
    : /\[char\]/.test(applyCondRaw) ? "[char]"
    : null;

  const has0 = /\{0\}/.test(applyCondRaw);
  const isHp = has0 && /\{0\}%/.test(applyCondRaw);

  let nameVal = "";
  if (nameToken === "[buff type]") {
    const numV = parseInt(v, 10);
    nameVal = !isNaN(numV) ? (BUFF_TYPE_NAMES[numV] ?? String(numV)) : v;
  } else if (nameToken === "[buff]" || nameToken === "[char]") {
    if (!v) return null;
    nameVal = tr(nam) || tr(`BuffName_${v}`) || v.replace(/^Effect_[^_]+_/, "").replace(/^Char_[^_]+_/, "").replace(/_/g, " ");
  }

  let val0 = "";
  if (has0) {
    if (nameToken && v && !v.match(/^\d/)) {
      val0 = "";
    } else {
      const numV = parseFloat(v);
      val0 = isNaN(numV) ? (v || "?") : (isHp ? String(Math.round(numV * 100)) : String(Math.round(numV)));
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

function BuffGroup({ group, groupIdx }: { group: SkillBuff[]; groupIdx: number }) {
  const rep = group[0];
  const uniformAttr = group.every((b) => b.attr === rep.attr);
  const attrBorder  = uniformAttr ? attrStyle(rep.attr).border : "#4a5568";
  const tr  = (id: string) => { const r = t(id); return r !== id ? r : ""; };
  const trg = (id: string) => { const r = tr(id); return r ? r.split(":")[0].trim() : ""; };
  const groupName = trg(rep.name);

  const resolveTriggerLabel = (triggerType: number) => {
    const raw = TRIGGER_LABELS[triggerType];
    if (!raw) return null;
    const valStr = rep.triggerVal ? String(Math.round(rep.triggerVal * 100)) : "?";
    const keyStr = rep.triggerName ? (trg(rep.triggerName) || rep.triggerName) : rep.triggerKey || "?";
    return raw.replace("{0}", valStr).replace("{key}", keyStr);
  };

  const triggerLabel  = resolveTriggerLabel(rep.trigger);
  const targetLabel   = TARGET_LABELS[rep.targetType] ?? null;
  const applyCondParts = resolveApplyCondParts(rep);
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
            {groupName || attrStyle(rep.attr).label}
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
          {rep.eraseType === 2 ? <Pill bg="orange.900" color="orange.300">on trigger</Pill>   : null}
          {rep.eraseType === 4 ? <Pill bg="orange.900" color="orange.300">preserved</Pill>    : null}
          {(rep.filterBody?.length  ?? 0) > 0 ? <Pill bg="cyan.900"  color="cyan.200"  >{rep.filterBody.map((v: number)  => BODY_NAMES[v]  ?? v).join("/")} only</Pill> : null}
          {(rep.filterClass?.length ?? 0) > 0 ? <Pill bg="blue.900"  color="blue.200"  >{rep.filterClass.map((v: number) => CLASS_NAMES[v] ?? v).join("/")} only</Pill> : null}
          {(rep.filterRole?.length  ?? 0) > 0 ? <Pill bg="green.900" color="green.200" >{rep.filterRole.map((v: number)  => ROLE_NAMES[v]  ?? v).join("/")} only</Pill> : null}
        </Flex>
      </Box>

      {/* effect rows */}
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
          else if (buff.overlapType === 1) noteStr = "Renew";
          else if (buff.overlapType === 3) noteStr = "Single";
          else if (buff.overlapType === 4 && buff.overlapMax !== 0) noteStr = "Update";

          const valColor = buff.fmt === "tid" || buff.type === 21 || buff.type === 33 || buff.type === 34 || buff.type === 35
            ? "gray.200" : valPositive ? "green.300" : "red.300";

          const as = attrStyle(buff.attr);

          return (
            <Flex key={`${groupIdx}-${i}`} px={2} py={1.5} gap={2} align="flex-start"
              borderTopWidth={i > 0 ? "1px" : "0"} borderTopColor="whiteAlpha.100">
              <Box flexShrink={0} w="18px" h="18px" mt="1px">
                {buff.icon ? <Image src={`/images/effects/BuffIcon_${buff.icon}.png`} boxSize="18px" alt={buff.icon} /> : null}
              </Box>
              <Box flex={1} minW={0}>
                <HStack spacing={1.5} flexWrap="wrap">
                  {buff.rate < 1 ? <Box px="5px" py="1px" borderRadius="3px" bg="yellow.900" color="yellow.300" fontSize="11px" lineHeight="16px">{Math.round(buff.rate * 100)}%</Box> : null}
                  <Text fontSize="sm" fontWeight="bold" textDecoration="underline" color="gray.200">{BUFF_TYPE_NAMES[buff.type]}</Text>
                  {valStr ? <Text fontSize="sm" fontWeight="bold" color={valColor}>{valStr}</Text> : null}
                </HStack>
                {descResolved
                  ? <Text fontSize="xs" color="gray.500" mt="2px" lineHeight="short">{filledDesc}</Text>
                  : null}
              </Box>
              <HStack spacing={1} flexShrink={0} mt="2px">
                <Box px="6px" py="1px" borderRadius="3px" bg={as.bg} color={as.fg} fontSize="11px" fontWeight="bold" lineHeight="16px">{as.label}</Box>
                {durStr   ? <Box px="5px" py="1px" borderRadius="3px" bg="gray.700" color="gray.300" fontSize="11px" lineHeight="16px">{durStr}</Box>   : null}
                {stackStr ? <Box px="5px" py="1px" borderRadius="3px" bg="gray.700" color="cyan.300"  fontSize="11px" lineHeight="16px">{stackStr}</Box> : null}
                {noteStr ? (
                  <Box
                    as="span" position="relative" display="inline-flex" alignItems="center"
                    gap="3px" px="5px" py="1px" borderRadius="3px" bg="gray.700"
                    color="yellow.300" fontSize="11px" lineHeight="16px" cursor="help" role="group"
                  >
                    {noteStr}
                    <Box as="span" opacity={0.6} fontSize="10px">?</Box>
                    <Box
                      as="span" position="absolute" bottom="calc(100% + 4px)" right="0"
                      px="8px" py="5px" borderRadius="md" bg="gray.900" color="gray.100"
                      fontSize="11px" lineHeight="1.4" whiteSpace="nowrap"
                      pointerEvents="none" boxShadow="md" borderWidth="1px"
                      borderColor="whiteAlpha.200" display="none"
                      _groupHover={{ display: "block" }} zIndex={9999}
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

// ─── public API ─────────────────────────────────────────────────────────────

interface BuffListProps {
  buffs: SkillBuff[];
}

export default function BuffList({ buffs }: BuffListProps) {
  // Group consecutive buffs that share the same group index
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

  return (
    <VStack spacing={2} align="stretch">
      {groups.map((g, i) => <BuffGroup key={i} group={g} groupIdx={i} />)}
    </VStack>
  );
}