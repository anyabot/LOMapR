// Team-builder core logic: level/slot gating, stat computation (points +
// equipment + core links), skill scaling, ally-AoE tile mapping, equip
// eligibility, and the shareable team code.

import { FullUnitData, UnitData, LinkBonus, UnitStat } from '@/interfaces/unit';
import { EquipStat, EquipFull } from '@/interfaces/equip';
import { Skill } from '@/interfaces/skill';
import { Team, TeamSlot, TeamEquipSel, StatKey, StatMap, ComputedStats } from '@/interfaces/team';
import { t } from '@/lib/strings';
import skillUnlockRanks from '@/lib/skillUnlockRanks.json';
import teamCodeIds from '@/lib/teamCodeIds.json';

// ── level / slot gating ───────────────────────────────────────────────────────

export const LV_DEFAULT = 100;   // base level cap (limit-break extends to 120)
export const LV_MAX = 120;
export const POINTS_PER_LEVEL = 3;

// Link slots unlock at these unit levels (5 slots = 500% max link).
export const LINK_UNLOCK_LEVELS = [10, 30, 50, 70, 90];
// Equip slots unlock at these levels (per-slot levels also ride in unit.equip).
export const EQUIP_UNLOCK_LEVELS = [20, 40, 60, 80];

export const maxLinksAt = (level: number): number =>
  LINK_UNLOCK_LEVELS.filter((l) => level >= l).length;

// A squad fields at most 5 units on the 3x3 grid.
export const MAX_UNITS = 5;

// Bundled fallback keeps rank gating correct against older remote data snapshots
// whose generated Skill.leastRank was always 0. Freshly transformed data carries
// SAV directly, so that value wins when present.
export function skillUnlockRank(skillKey: string, leastRank: number, region: string): number {
  const byRegion = skillUnlockRanks as Record<string, Record<string, number>>;
  return leastRank || byRegion[region]?.[skillKey] || 0;
}

export const totalPointsAt = (level: number): number => level * POINTS_PER_LEVEL;

// ── stat points ───────────────────────────────────────────────────────────────

// Allocation order in TeamSlot.points.
export const POINT_STATS = ['ATK', 'DEF', 'HP', 'ACC', 'EVA', 'CRIT'] as const;
export type PointStat = (typeof POINT_STATS)[number];

// Stat-point conversion: how much of each stat one allocation point grants, in
// the stat's STORED units (fractions for the percent stats: ACC 0.015 = +1.5%).
// Shared with the equipment modal's point-worth badge — keep the two in sync.
export const STAT_PER_POINT: Record<string, number> = {
  ATK: 1.5, DEF: 1.25, HP: 8,
  ACC: 0.015, EVA: 0.004, CRIT: 0.004,
};

// ── slot factory ──────────────────────────────────────────────────────────────

export function makeSlot(unit: UnitData): TeamSlot {
  return {
    unitId: unit.id,
    level: LV_DEFAULT,
    gradeIdx: Math.max(0, (unit.maxGrade ?? unit.rarity) - unit.rarity),
    links: 0,
    fullLink: -1,
    points: [0, 0, 0, 0, 0, 0],
    equips: [null, null, null, null],
    skillLv: [],
    form: 0,
    maxAffection: false,
    currentHp: 0,
  };
}

// ── base stat growth ──────────────────────────────────────────────────────────

// HP/ATK/DEF grow linearly from [lv1, lv100]; past 100 (limit break) the same
// per-level growth continues.
function rawStatAt(pair: [number, number], level: number): number {
  const lv = Math.min(Math.max(level, 1), LV_MAX);
  const perLevel = (pair[1] - pair[0]) / (LV_DEFAULT - 1);
  return pair[0] + perLevel * (lv - 1);
}

export function statAt(pair: [number, number], level: number): number {
  return Math.ceil(rawStatAt(pair, level));
}

export function baseStats(st: UnitStat, level: number): StatMap {
  return {
    HP: statAt(st.HP, level),
    ATK: statAt(st.ATK, level),
    DEF: statAt(st.DEF, level),
    SPD: st.SPD,
    CRI: st.CRI,
    ACC: st.ACC,
    EVA: st.EVA,
    fireRes: st.resist.fire,
    iceRes: st.resist.ice,
    lightningRes: st.resist.lightning,
  };
}

// ── link-bonus classification ─────────────────────────────────────────────────

// Resolve a link bonus to the stat it feeds via its template text (null =
// non-stat: Skill Power / EXP / Sortie / Range / Buff-Debuff Lv).
export interface LinkStatBonus {
  stat: StatKey | null;
  pct: boolean;     // true: value is a fraction of the stat; false: flat add
  value: number;
}

export function classifyLinkBonus(b: LinkBonus): LinkStatBonus {
  const tpl = t(b.desc).toUpperCase();
  const isPct = tpl.includes('%');
  let stat: StatKey | null = null;
  if (/SKILL POWER|EXP|SORTIE|BUFF|RANGE|INTERSECTION/.test(tpl)) stat = null;
  else if (tpl.includes('HP')) stat = 'HP';
  else if (tpl.includes('ATK')) stat = 'ATK';
  else if (tpl.includes('DEF')) stat = 'DEF';
  else if (tpl.includes('ACC')) stat = 'ACC';
  else if (tpl.includes('EVA')) stat = 'EVA';
  else if (tpl.includes('CRI')) stat = 'CRI';
  else if (/\bAP\b|ACTION POWER|SPD|SPEED/.test(tpl)) stat = 'SPD';
  return { stat, pct: isPct, value: b.value };
}

// ── stat computation ──────────────────────────────────────────────────────────

const EQUIP_ATTR_TO_KEY: Record<string, StatKey> = {
  ATK: 'ATK', DEF: 'DEF', HP: 'HP', MaxHP: 'HP', SPD: 'SPD',
  ACC: 'ACC', EVA: 'EVA', CRIT: 'CRI',
  'Fire RES': 'fireRes', 'Ice RES': 'iceRes', 'Lightning RES': 'lightningRes',
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

// Out-of-battle stats: link % multiplies (base + points + equip flat) for
// HP/ATK/DEF; percent stats (ACC/EVA/CRIT/RES) are additive.
export function computeStats(
  unit: FullUnitData, slot: TeamSlot, equipStats: EquipStat[],
): ComputedStats {
  const st = unit.stat[Math.min(slot.gradeIdx, unit.stat.length - 1)];
  const base = baseStats(st, slot.level);
  const raw = {
    HP: rawStatAt(st.HP, slot.level),
    ATK: rawStatAt(st.ATK, slot.level),
    DEF: rawStatAt(st.DEF, slot.level),
  };

  // stat-point allocation, in stored units (fractions for percent stats)
  const pts: Record<PointStat, number> = {
    ATK: slot.points[0] ?? 0, DEF: slot.points[1] ?? 0, HP: slot.points[2] ?? 0,
    ACC: slot.points[3] ?? 0, EVA: slot.points[4] ?? 0, CRIT: slot.points[5] ?? 0,
  };

  // equipment sums: flat (ATK/DEF/HP/SPD) and percent (fractions)
  const eq: Partial<Record<StatKey, number>> = {};
  for (const s of equipStats) {
    const key = EQUIP_ATTR_TO_KEY[s.attr];
    if (!key) continue;
    eq[key] = (eq[key] ?? 0) + s.value;
  }

  // link bonuses: per-link entries stack `links` times; the full-link pick adds once
  const linkPct: Partial<Record<StatKey, number>> = {};
  let linkSpdFlat = 0;
  const addLink = (b: LinkBonus, mult: number) => {
    const c = classifyLinkBonus(b);
    if (!c.stat) return;
    if (c.stat === 'SPD' && !c.pct) { linkSpdFlat += c.value * mult; return; }
    linkPct[c.stat] = (linkPct[c.stat] ?? 0) + c.value * mult;
  };
  if (slot.links > 0) for (const b of unit.linkBonus) addLink(b, slot.links);
  if (slot.links >= 5 && slot.fullLink >= 0 && unit.fullLinkBonus[slot.fullLink])
    addLink(unit.fullLinkBonus[slot.fullLink], 1);

  const flatStat = (key: 'HP' | 'ATK' | 'DEF', ptAdd: number) => {
    const preLink = raw[key] + ptAdd + (eq[key] ?? 0);
    return Math.floor(preLink * (1 + (linkPct[key] ?? 0)));
  };
  // percent stats: base (whole %) + points + equip + link, all additive
  const pctStat = (key: 'CRI' | 'ACC' | 'EVA', ptFrac: number) =>
    round1(base[key] + ptFrac * 100 + (eq[key] ?? 0) * 100 + (linkPct[key] ?? 0) * 100);

  const total: StatMap = {
    HP: flatStat('HP', pts.HP * STAT_PER_POINT.HP),
    ATK: flatStat('ATK', pts.ATK * STAT_PER_POINT.ATK),
    DEF: flatStat('DEF', pts.DEF * STAT_PER_POINT.DEF),
    SPD: round2(base.SPD + (eq.SPD ?? 0) + linkSpdFlat),
    CRI: pctStat('CRI', pts.CRIT * STAT_PER_POINT.CRIT),
    ACC: pctStat('ACC', pts.ACC * STAT_PER_POINT.ACC),
    EVA: pctStat('EVA', pts.EVA * STAT_PER_POINT.EVA),
    fireRes: round1(base.fireRes + (eq.fireRes ?? 0) * 100),
    iceRes: round1(base.iceRes + (eq.iceRes ?? 0) * 100),
    lightningRes: round1(base.lightningRes + (eq.lightningRes ?? 0) * 100),
  };

  const bonus = Object.fromEntries(
    (Object.keys(total) as StatKey[]).map((k) => [k, round2(total[k] - base[k])]),
  ) as StatMap;

  return { base, total, bonus, linkPct };
}

// ── skill scaling (same rules as the unit detail page) ────────────────────────

// Return a level-scaled copy of a skill:
//   skillLv  1..10 — scales rate and buff values, applies levelChanges (AP/AoE).
//   spAdd    flat skill-power add (full-link Skill Power option).
//   buffLv   extra buff/debuff levels for buff VALUES only (full-link option +2).
export function scaleSkillLevel(skill: Skill, skillLv: number, spAdd: number, buffLv: number): Skill {
  const lv = Math.min(Math.max(skillLv, 1), 10);
  const rate = skill.rate + (skill.rateGain ?? 0) * (lv - 1) + spAdd;

  let AP = skill.AP, area = skill.area, center = skill.center;
  for (const c of skill.levelChanges ?? []) {
    if (c.level > lv) break;
    if (c.ap != null) AP = c.ap;
    if (c.area) { area = c.area; center = c.center ?? center; }
  }

  const effLv = lv + buffLv;
  const buffs = skill.buffs.map((b) => {
    const val = b.vals
      ? b.vals[Math.min(lv - 1, b.vals.length - 1)]
      : Math.round((b.val + b.gain * (effLv - 1)) * 10000) / 10000;
    return { ...b, val, vals: undefined };
  });

  return { ...skill, rate: Math.round(rate * 10000) / 10000, AP, area, center, buffs };
}

// full-link helpers (template-detected, like the unit detail page)
export function fullLinkSkillPowerValue(unit: FullUnitData, fullLink: number): number {
  const b = fullLink >= 0 ? unit.fullLinkBonus[fullLink] : undefined;
  return b && t(b.desc).toLowerCase().includes('skill power') ? b.value : 0;
}
export function fullLinkBuffLv(unit: FullUnitData, fullLink: number): number {
  const b = fullLink >= 0 ? unit.fullLinkBonus[fullLink] : undefined;
  return b && /buff\/debuff effect lv/i.test(t(b.desc)) ? 2 : 0;
}

// ── ally-AoE tile mapping ─────────────────────────────────────────────────────

// Map a skill's 9-cell AoE grid onto the ally board: center > 0 anchors the
// grid's center cell on the caster's tile; center === 0 is a fixed grid.
export function mapAreaToTiles(area: number[], center: number, casterTile: number): number[] {
  const hit: number[] = [];
  if (!center) {
    area.forEach((v, i) => { if (v > 0) hit.push(i); });
    return hit;
  }
  const r0 = Math.floor((center - 1) / 3), c0 = (center - 1) % 3;
  const dr = Math.floor(casterTile / 3) - r0, dc = (casterTile % 3) - c0;
  area.forEach((v, i) => {
    if (v <= 0) return;
    const r = Math.floor(i / 3) + dr, c = (i % 3) + dc;
    if (r >= 0 && r < 3 && c >= 0 && c < 3) hit.push(r * 3 + c);
  });
  return hit;
}

// Ally-side target types: SELF / OUR / OUR_GRID / ALL_UNIT / ALL_GRID / OUR_ALL.
export const ALLY_TARGETS = new Set([0, 1, 2, 5, 6, 8]);

// Tiles an ally-affecting skill reaches from casterTile; null = no ally buff.
export function allyAffectedTiles(skill: Skill, casterTile: number): number[] | null {
  const targets = new Set(skill.buffs.map((b) => b.targetType));
  const hasAlly = Array.from(targets).some((tt) => ALLY_TARGETS.has(tt));
  if (!hasAlly) return null;
  const tiles = new Set<number>();
  if (targets.has(0)) tiles.add(casterTile);
  if (targets.has(2) || targets.has(6))
    for (const c of mapAreaToTiles(skill.area, skill.center, casterTile)) tiles.add(c);
  if (targets.has(1) || targets.has(5) || targets.has(8))
    for (let i = 0; i < 9; i++) tiles.add(i);
  return Array.from(tiles);
}

// ── equip eligibility ─────────────────────────────────────────────────────────

// Can the unit wear this equip in a slot of `slotType`? Checks the slot type and
// the class/role/unit locks.
export function canEquip(
  e: { slot: string; classLimit: string | null; roleLimit: string | null; pcLimit: string },
  unit: UnitData, slotType: string,
): boolean {
  if (e.slot !== slotType) return false;
  if (e.classLimit && e.classLimit !== unit.type) return false;
  if (e.roleLimit && e.roleLimit !== unit.role) return false;
  if (e.pcLimit && e.pcLimit !== unit.id) return false;
  return true;
}

// Is equip slot `idx` unlocked at `level`? Uses the unit's own slot metadata
// when the detail bundle is loaded, else the standard 20/40/60/80 ladder.
export function equipSlotUnlocked(unit: UnitData, idx: number, level: number): boolean {
  const need = unit.equip?.[idx]?.level ?? EQUIP_UNLOCK_LEVELS[idx] ?? 999;
  return level >= need;
}

// Flatten the stats of everything a slot has equipped (locked slots excluded),
// resolving each selection through the lazily-fetched full equip records.
export function equippedStats(
  slot: TeamSlot, unit: UnitData,
  getFull: (id: string) => EquipFull | null,
): EquipStat[] {
  const out: EquipStat[] = [];
  slot.equips.forEach((sel, i) => {
    if (!sel || !equipSlotUnlocked(unit, i, slot.level)) return;
    const full = getFull(sel.id);
    const rank = full?.ranks[Math.min(sel.rank, (full?.ranks.length ?? 1) - 1)];
    const lvl = rank?.levels[Math.min(sel.level, (rank?.levels.length ?? 1) - 1)];
    if (lvl) out.push(...lvl.stats);
  });
  return out;
}

// ── share code ────────────────────────────────────────────────────────────────
// v2 is a compact binary payload encoded as base64url. Unit/equipment IDs use
// stable dictionaries; unknown IDs fall back to inline UTF-8 so future data is
// still shareable. v1 delimiter codes remain readable below.
const CODE_PREFIX = '4.';
const V3_PREFIX = '3.';
const V2_PREFIX = '2.';
const LEGACY_VERSION = '1';
const UNIT_IDS = teamCodeIds.units as string[];
const EQUIP_IDS = teamCodeIds.equips as string[];
const UNIT_INDEX = new Map(UNIT_IDS.map((id, i) => [id, i + 1]));
const EQUIP_INDEX = new Map(EQUIP_IDS.map((id, i) => [id, i + 1]));

class ByteWriter {
  bytes: number[] = [];
  byte(n: number) { this.bytes.push(n & 0xff); }
  varint(n: number) {
    n = Math.max(0, Math.floor(n));
    while (n >= 0x80) { this.byte((n & 0x7f) | 0x80); n = Math.floor(n / 128); }
    this.byte(n);
  }
  text(value: string) {
    const encoded = new TextEncoder().encode(value);
    this.varint(encoded.length);
    for (let i = 0; i < encoded.length; i++) this.byte(encoded[i]);
  }
  id(value: string, index: Map<string, number>) {
    const ref = index.get(value) ?? 0;
    this.varint(ref);
    if (!ref) this.text(value);
  }
}

class ByteReader {
  pos = 0;
  constructor(private bytes: Uint8Array) {}
  byte(): number {
    if (this.pos >= this.bytes.length) throw new Error('team code ended early');
    return this.bytes[this.pos++];
  }
  varint(): number {
    let value = 0, mul = 1;
    for (let i = 0; i < 5; i++) {
      const b = this.byte();
      value += (b & 0x7f) * mul;
      if (!(b & 0x80)) return value;
      mul *= 128;
    }
    throw new Error('invalid team-code varint');
  }
  text(): string {
    const length = this.varint();
    if (length > this.bytes.length - this.pos) throw new Error('invalid team-code string');
    const value = new TextDecoder().decode(this.bytes.subarray(this.pos, this.pos + length));
    this.pos += length;
    return value;
  }
  id(ids: string[]): string {
    const ref = this.varint();
    if (!ref) return this.text();
    const value = ids[ref - 1];
    if (!value) throw new Error('unknown team-code ID');
    return value;
  }
}

function base64UrlEncode(bytes: number[]): string {
  const raw = String.fromCharCode(...bytes);
  return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64 + '='.repeat((4 - base64.length % 4) % 4));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function encodeTeam(team: Team): string {
  const w = new ByteWriter();
  w.byte(4);
  const mask = team.slice(0, 9).reduce((m, slot, i) => slot ? m | (1 << i) : m, 0);
  w.byte(mask); w.byte(mask >> 8);
  for (let tile = 0; tile < 9; tile++) {
    const s = team[tile];
    if (!s) continue;
    w.id(s.unitId, UNIT_INDEX);
    w.byte(Math.min(Math.max(s.level, 1), LV_MAX));
    w.byte((s.gradeIdx & 7) | ((s.links & 7) << 3) | ((s.form & 1) << 6));
    w.byte(Math.min(Math.max(s.fullLink + 1, 0), 255));
    for (let i = 0; i < 6; i++) w.varint(s.points[i] ?? 0);
    const equipMask = s.equips.slice(0, 4).reduce((m, e, i) => e ? m | (1 << i) : m, 0);
    w.byte(equipMask);
    for (let i = 0; i < 4; i++) {
      const e = s.equips[i];
      if (!e) continue;
      w.id(e.id, EQUIP_INDEX);
      w.byte((e.rank & 0x0f) | ((Math.min(Math.max(e.level, 0), 10) & 0x0f) << 4));
    }
    const skillLv = s.skillLv.slice(0, 15);
    w.byte(skillLv.length);
    for (let i = 0; i < skillLv.length; i += 2) {
      const a = Math.min(Math.max(skillLv[i] ?? 10, 1), 10) - 1;
      const b = Math.min(Math.max(skillLv[i + 1] ?? 1, 1), 10) - 1;
      w.byte(a | (b << 4));
    }
    w.byte(s.maxAffection ? 1 : 0);
    w.varint(Math.max(s.currentHp ?? 0, 0));
  }
  return CODE_PREFIX + base64UrlEncode(w.bytes);
}

const toInt = (v: string, dflt: number) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : dflt;
};

function decodeLegacyTeam(code: string): Team | null {
  const parts = (code || '').trim().split('*');
  if (parts.length !== 10 || parts[0] !== LEGACY_VERSION) return null;
  const team: Team = [];
  for (let i = 1; i <= 9; i++) {
    const raw = parts[i];
    if (!raw) { team.push(null); continue; }
    const f = raw.split('~');
    if (f.length < 9 || !f[0]) return null;
    const points = (f[5] ? f[5].split('.') : []).map((v) => toInt(v, 0));
    while (points.length < 6) points.push(0);
    const equips: (TeamEquipSel | null)[] = (f[6] ? f[6].split('!') : []).map((e) => {
      if (!e) return null;
      const seg = e.split('.');
      if (seg.length < 3) return null;
      return {
        id: `Equip_${seg[0]}`,
        rank: toInt(seg[1], 0),
        level: Math.min(Math.max(toInt(seg[2], 10), 0), 10),
      };
    });
    while (equips.length < 4) equips.push(null);
    const skillLv = (f[7] ? f[7].split('.') : [])
      .map((v) => Math.min(Math.max(toInt(v, 10), 1), 10));
    team.push({
      unitId: `Char_${f[0]}`,
      level: Math.min(Math.max(toInt(f[1], LV_DEFAULT), 1), LV_MAX),
      gradeIdx: Math.max(toInt(f[2], 0), 0),
      links: Math.min(Math.max(toInt(f[3], 0), 0), 5),
      fullLink: Math.max(toInt(f[4], -1), -1),
      points: points.slice(0, 6),
      equips: equips.slice(0, 4),
      skillLv,
      form: toInt(f[8], 0) === 1 ? 1 : 0,
      maxAffection: false,
      currentHp: 0,
    });
  }
  return team;
}

export function decodeTeam(code: string): Team | null {
  const clean = (code || '').trim();
  const isV4 = clean.startsWith(CODE_PREFIX);
  const isV3 = clean.startsWith(V3_PREFIX);
  const isV2 = clean.startsWith(V2_PREFIX);
  if (!isV4 && !isV3 && !isV2) return decodeLegacyTeam(clean);
  try {
    const prefix = isV4 ? CODE_PREFIX : isV3 ? V3_PREFIX : V2_PREFIX;
    const r = new ByteReader(base64UrlDecode(clean.slice(prefix.length)));
    const version = r.byte();
    if (version !== (isV4 ? 4 : isV3 ? 3 : 2)) return null;
    const mask = r.byte() | (r.byte() << 8);
    const team: Team = [];
    for (let tile = 0; tile < 9; tile++) {
      if (!(mask & (1 << tile))) { team.push(null); continue; }
      const unitId = r.id(UNIT_IDS);
      const level = Math.min(Math.max(r.byte(), 1), LV_MAX);
      const config = r.byte();
      const fullLink = r.byte() - 1;
      const points = Array.from({ length: 6 }, () => r.varint());
      const equipMask = r.byte();
      const equips: (TeamEquipSel | null)[] = [];
      for (let i = 0; i < 4; i++) {
        if (!(equipMask & (1 << i))) { equips.push(null); continue; }
        const id = r.id(EQUIP_IDS);
        const packed = r.byte();
        equips.push({ id, rank: packed & 0x0f, level: Math.min(packed >> 4, 10) });
      }
      const skillCount = r.byte();
      if (skillCount > 15) return null;
      const skillLv: number[] = [];
      for (let i = 0; i < skillCount; i += 2) {
        const packed = r.byte();
        skillLv.push((packed & 0x0f) + 1);
        if (i + 1 < skillCount) skillLv.push((packed >> 4) + 1);
      }
      const maxAffection = version >= 3 ? !!(r.byte() & 1) : false;
      const currentHp = version >= 4 ? r.varint() : 0;
      const hpPercent = version === 3 ? Math.min(Math.max(r.byte(), 1), 100) : undefined;
      team.push({
        unitId, level,
        gradeIdx: config & 7,
        links: Math.min((config >> 3) & 7, 5),
        fullLink: Math.max(fullLink, -1),
        points, equips, skillLv,
        form: (config >> 6) & 1,
        maxAffection,
        currentHp,
        hpPercent,
      });
    }
    return team;
  } catch {
    return null;
  }
}
