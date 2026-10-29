import { FullUnitData } from '@/interfaces/unit';
import { EnemyData } from '@/interfaces/enemy';
import { Skill, SkillBuff } from '@/interfaces/skill';
import { TeamSlot, StatKey, StatMap, ComputedStats } from '@/interfaces/team';
import { mapAreaToTiles } from '@/lib/team';

// ── inputs / outputs ─────────────────────────────────────────────────────────

export type Side = 0 | 1;   // 0 = player squad, 1 = enemy wave

export interface SimSkillSource {
  key: string;
  name: string;       // loc id (resolve with t() in the UI)
  skill: Skill;       // already scaled to its configured level
}

export interface SimEquipSource {
  id: string;         // equip family id
  name: string;       // loc id
  buffs: SkillBuff[]; // at the selected rank + level
}

export interface SimUnitInput {
  tile: number;                 // 0..8
  unit: FullUnitData;
  slot: TeamSlot;
  stats: ComputedStats;         // out-of-battle stats (points + equip + links)
  passives: SimSkillSource[];   // the active form's passive skills
  equips: SimEquipSource[];
}

// One enemy on the opposing 3x3 board, stats already computed at its level.
export interface SimEnemyInput {
  tile: number;                 // 0..8 on the enemy board
  enemy: EnemyData;
  lv: number;
  stats: StatMap;
  passives: SimSkillSource[];   // monster passives (no level scaling)
}

// One buff instance applied to a unit during the simulation.
export interface AppliedBuff {
  buff: SkillBuff;
  sourceSide: Side;
  sourceTile: number;
  sourceName: string;   // loc id of the skill / equip it came from
  sourceKind: 'skill' | 'equip';
  pass: number;         // which pass it activated on (1-based)
  chance: boolean;      // rate < 100% — applied optimistically, flagged in the UI
}

// A buff the engine did not auto-apply, with everything needed to review it.
export type NoteKind =
  | 'enemy-target'   // single-enemy target, or enemy-side target without a wave
  | 'ally-target'    // single-ally target: the trigger's or skill's target, unknown pre-combat
  | 'event'          // fires on a mid-battle event, not at battle/round start
  | 'enemy-cond'     // condition reads enemy-side state that is not available
  | 'random'         // cond-64 random-pick group
  | 'unknown'        // semantics unclear — needs manual review
  | 'cond-failed';   // evaluated fine, condition simply not met round 1

export interface SimNote {
  kind: NoteKind;
  side: Side;
  tile: number;
  unitId: string;
  sourceName: string;   // loc id
  sourceKind: 'skill' | 'equip';
  buff: SkillBuff;
  detail: string;       // short machine-ish reason ("trigger 15", "cond 25", ...)
}

export interface SimUnitResult {
  side: Side;
  tile: number;
  unitId: string;
  applied: AppliedBuff[];
  battle: StatMap;      // in-battle stats after all applied buffs
  delta: StatMap;       // battle - out-of-battle total
  spd: number;
  cycles: number;       // absolute pre-combat cycle at which this unit first reaches 10 AP
  readyRound: number;   // combat round in which this unit first becomes actionable
  ap: number;           // AP at the start of the first combat round (capped at 20)
  readyAp: number;      // projected AP when the unit first becomes actionable
}

export interface SimTimelineEntry { side: Side; tile: number }

export interface SimTimelineGroup {
  round: number;        // combat round, 1-based
  cycle: number;        // absolute cycle (firstCycle + round - 1)
  entries: SimTimelineEntry[];  // action order inside this round (both sides)
}

// Combat v2 estimate: one entry per turn, `time` in gauge units (100% gauge / SPD).
export interface SimTurnEntry { side: Side; tile: number; turn: number; time: number }

export interface SimResult {
  version: 1 | 2;
  turns: SimTurnEntry[];        // v2 only; [] for v1
  units: SimUnitResult[];       // player side
  enemyUnits: SimUnitResult[];  // enemy side ([] when no wave is simulated)
  order: number[];      // player tiles actionable in combat round 1, in action order
  timeline: SimTimelineGroup[];
  firstCycle: number;
  notes: SimNote[];
  passes: number;
}

// ── buff-type → stat effect tables ───────────────────────────────────────────

// flat adds (raw val); percent stats take the val as percentage points
const FLAT_STAT: Record<number, StatKey> = {
  0: 'ATK', 2: 'DEF', 4: 'HP', 104: 'HP', 12: 'SPD',
  6: 'ACC', 8: 'CRI', 10: 'EVA', 14: 'fireRes', 16: 'iceRes', 18: 'lightningRes',
};
// ratio buffs: ATK/DEF/HP/SPD multiply; percent stats add val*100 points
const PCT_STAT: Record<number, StatKey> = {
  1: 'ATK', 3: 'DEF', 5: 'HP', 105: 'HP', 13: 'SPD',
  7: 'ACC', 9: 'CRI', 11: 'EVA', 15: 'fireRes', 17: 'iceRes', 19: 'lightningRes',
};
const MULT_KEYS = new Set<StatKey>(['ATK', 'DEF', 'HP', 'SPD']);

const AP_ADD = 20, AP_SET = 21;
const trunc2 = (n: number): number => Math.floor((n + Number.EPSILON) * 100) / 100;
const capAp = (n: number): number => trunc2(Math.min(n, 20));

// ── helpers over the running state ───────────────────────────────────────────

interface UnitState {
  side: Side;
  tile: number;
  id: string;           // Char_/enemy site id
  klass: string;        // Light/Heavy/Air/Flying
  role: string;         // Defender/Attacker/Supporter
  body: string | null;  // Bioroid/AGS; null = unknown (enemy data has none)
  total: StatMap;       // out-of-battle totals
  applied: AppliedBuff[];
  battle: StatMap;      // recomputed after every pass
  rawSpd: number;       // full precision for SPD conditions and AP mechanics
  hpFrac: number;       // configured current HP, 0..1 (enemies: 1)
}

type Sides = [Map<number, UnitState>, Map<number, UnitState>];

// The enemy board faces the player, so its front column is mirrored.
const depthOf = (u: UnitState) => (u.side === 0 ? u.tile % 3 : 2 - (u.tile % 3));

// mirror a tile across the column axis (cross-board relative AoE anchor)
const mirrorTile = (tile: number) => tile - (tile % 3) + (2 - (tile % 3));

// composite key for per-target bookkeeping across both boards
const sideTileKey = (side: Side, tile: number) => side * 9 + tile;

// 8-neighborhood adjacency on the 3x3 grid ("nearby"/"in grid" checks).
export function adjacentTiles(tile: number): number[] {
  const r = Math.floor(tile / 3), c = tile % 3;
  const out: number[] = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue;
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < 3 && nc >= 0 && nc < 3) out.push(nr * 3 + nc);
  }
  return out;
}

const CLASS_ORD: Record<string, number> = { Light: 0, Heavy: 1, Air: 2, Flying: 2 };
const ROLE_ORD: Record<string, number> = { Defender: 0, Attacker: 1, Supporter: 2 };
const BODY_ORD: Record<string, number> = { Bioroid: 0, AGS: 1 };

// paired flat/pct buff-type ordinal (0<->1, 2<->3, ... 18<->19, 104<->105)
const pairType = (t: number): number =>
  (t < 20 || t === 104 || t === 105) ? (t % 2 === 0 ? t + 1 : t - 1) : t;

// `val` is an Effect_ key or a buff-type ordinal; condAttr 0 buff / 1 debuff / 6 any.
function buffMatches(a: AppliedBuff, val: string, name: string, condAttr: number): boolean {
  if (condAttr !== 6 && condAttr >= 0 && a.buff.attr !== condAttr) return false;
  const num = parseInt(val, 10);
  if (!isNaN(num) && String(num) === val) {
    return a.buff.type === num || a.buff.type === pairType(num);
  }
  // Names collide across levels of a buff family, so a key always wins.
  if (val) {
    return !!a.buff.effectKey &&
      (a.buff.effectKey === val || a.buff.effectKey.startsWith(val + '_'));
  }
  return !!name && a.buff.name === name;
}

function countMatching(u: UnitState, vals: string[], names: string[], condAttr: number): number {
  let n = 0;
  for (const a of u.applied)
    if (vals.some((v, i) => buffMatches(a, v, names[i] ?? '', condAttr))) n++;
  return n;
}

// ── condition evaluation ─────────────────────────────────────────────────────

interface CondSpec {
  cond: number;
  vals: string[];
  names: string[];
  count: number;
  counts: number[];
  condAttr: number;
}

type CondVerdict = true | false | { note: NoteKind; detail: string };

// "Allies" is always the caster's own side; the opposing side is empty with no wave.
function evalCond(
  c: CondSpec, self: UnitState, target: UnitState | null,
  sides: Sides, round: number,
): CondVerdict {
  const cond = c.cond;
  const threshold = c.count > 0 ? c.count : parseFloat(c.vals[0] ?? '');
  const frac = parseFloat(c.vals[0] ?? '');    // HP-style fraction threshold
  const tgt = target ?? self;
  const own = sides[self.side];
  const allies = Array.from(own.values());
  const enemies = Array.from(sides[(1 - self.side) as Side].values());
  const enemySim = enemies.length > 0;
  const need = (n: number) => (Number.isFinite(n) ? n : NaN);
  // Client CheckTriggetApplyCondition: unit/round counts match if equal to ANY listed value.
  const listed = c.vals.map(Number).filter(Number.isFinite);
  const inVals = (n: number) => listed.includes(n);
  const inCounts = (n: number) => c.counts.includes(n);

  switch (cond) {
    case 63: return true;
    // 66: NONE sentinel in global (no params); real "enemy has [buff]" in KR
    case 66:
      if (c.vals.length === 0) return true;
      if (!enemySim) return { note: 'enemy-cond', detail: 'cond 66: enemy has buff (no wave)' };
      return enemies.some((u) => countMatching(u, c.vals, c.names, c.condAttr) > 0);

    case 0:  return countMatching(self, c.vals, c.names, c.condAttr) > 0;   // self has [buff type]
    case 1: case 19:                                                        // self has [buff]
      return countMatching(self, c.vals, c.names, c.condAttr) > 0;
    case 2:  return depthOf(self) === 2;   // front line
    case 3:  return depthOf(self) === 1;   // mid line
    case 4:  return depthOf(self) === 0;   // back line
    case 5:  return Number.isFinite(frac) ? self.hpFrac >= frac : true;  // HP ≥ x
    case 6:  return Number.isFinite(frac) ? self.hpFrac <= frac : false; // HP ≤ x
    case 7: case 8:                    // own HP ratio below / above the attacker's
      return { note: 'event', detail: `cond ${cond}: compares HP with the attacker` };
    case 9: case 20:                                             // self has ≥ N of [buff]
      return countMatching(self, c.vals, c.names, c.condAttr) >= need(threshold);
    case 31:                                                     // self has exactly N of [buff]
      return countMatching(self, c.vals, c.names, c.condAttr) === need(threshold);
    case 10: case 11:                                            // target has [buff type]/[buff]
      return countMatching(tgt, c.vals, c.names, c.condAttr) > 0;
    case 12: return Number.isFinite(frac) ? tgt.hpFrac >= frac : true;  // target HP ≥
    case 13: return Number.isFinite(frac) ? tgt.hpFrac <= frac : false; // target HP ≤
    case 14: return c.vals.includes(tgt.id);                     // target is [char]
    case 15: return c.vals.some((v) => allies.some((u) => u.id === v)); // [char] in battle
    case 16: return depthOf(tgt) === 2;
    case 17: return depthOf(tgt) === 1;
    case 18: return depthOf(tgt) === 0;
    case 21: {                                                   // self HP in range
      const lo = parseFloat(c.vals[0] ?? ''), hi = parseFloat(c.vals[1] ?? '');
      if (Number.isFinite(lo) && Number.isFinite(hi)) return lo <= self.hpFrac && self.hpFrac <= hi;
      return { note: 'unknown', detail: 'cond 21: HP range (unparsed values)' };
    }
    case 22: case 24: case 44: case 62: {                        // self/target missing [buff]
      const who = cond === 44 || cond === 62 ? tgt : self;
      return countMatching(who, c.vals, c.names, c.condAttr) === 0;
    }
    case 23: case 61:                                            // target has ≥ N stacks/[buff]
      return countMatching(tgt, c.vals, c.names, c.condAttr) >= need(threshold);
    case 25:                                                     // enemy count is one of
      return enemySim ? inVals(enemies.length)
        : { note: 'enemy-cond', detail: 'cond 25: enemy count (no wave)' };
    case 26: return inVals(allies.length);                       // ally count is one of
    case 27:                                                     // total unit count is one of
      return enemySim ? inVals(allies.length + enemies.length)
        : { note: 'enemy-cond', detail: 'cond 27: total unit count needs the enemy side' };
    case 28: return listed.some((v) => round >= v);
    case 29: return listed.some((v) => round <= v);
    case 30: return !c.vals.some((v) => allies.some((u) => u.id === v)); // [char] NOT in battle
    case 32: return inVals(round);
    case 33: case 34: {                                          // allies of body = N
      if (allies.some((u) => u.body == null))
        return { note: 'unknown', detail: `cond ${cond}: body data unavailable for this side` };
      const ord = cond === 33 ? 0 : 1;
      return inVals(allies.filter((u) => BODY_ORD[u.body!] === ord).length);
    }
    case 35: case 36:                                            // enemy body count — no body data
      return { note: 'enemy-cond', detail: `cond ${cond}: enemy body count (enemies carry no body type)` };
    case 37: return allies.some((u) => countMatching(u, c.vals, c.names, c.condAttr) > 0); // ally has [buff]
    case 38: {                                                   // count of [class] allies is one of
      const ord = Number(c.vals[0]);
      return inCounts(allies.filter((u) => CLASS_ORD[u.klass] === ord).length);
    }
    case 39: {                                                   // count of [role] allies is one of
      const ord = Number(c.vals[0]);
      return inCounts(allies.filter((u) => ROLE_ORD[u.role] === ord).length);
    }
    case 40: return c.vals.map(Number).includes(CLASS_ORD[self.klass]); // self is [class]
    case 41: return round % 2 === 0;   // even round
    case 42: return round % 2 === 1;   // odd round
    case 43: case 58:                  // target missing any [buff]/[buff type]
      return countMatching(tgt, c.vals, c.names, c.condAttr) === 0;
    case 45: {                                                   // count of [class] enemies is one of
      if (!enemySim) return { note: 'enemy-cond', detail: 'cond 45: enemy class count (no wave)' };
      const ord = Number(c.vals[0]);
      return inCounts(enemies.filter((u) => CLASS_ORD[u.klass] === ord).length);
    }
    case 46: {                                                   // count of [role] enemies is one of
      if (!enemySim) return { note: 'enemy-cond', detail: 'cond 46: enemy role count (no wave)' };
      const ord = Number(c.vals[0]);
      return inCounts(enemies.filter((u) => ROLE_ORD[u.role] === ord).length);
    }
    case 47: return self.battle.ATK > self.battle.DEF;
    case 48: return self.battle.ATK < self.battle.DEF;
    case 49: return self.battle.ATK > tgt.battle.ATK;
    case 50: return self.battle.ATK < tgt.battle.ATK;
    case 51: return self.battle.DEF > tgt.battle.DEF;
    case 52: return self.battle.DEF < tgt.battle.DEF;
    case 53: return self.battle.EVA > tgt.battle.EVA;
    case 54: return self.battle.EVA < tgt.battle.EVA;
    case 55: return self.rawSpd > tgt.rawSpd;
    case 56: return self.rawSpd < tgt.rawSpd;
    case 57: return countMatching(self, c.vals, c.names, c.condAttr) === 0; // self missing [buff type]
    case 59: {                                                   // ≥ N ally nearby
      const adj = adjacentTiles(self.tile).filter((t2) => own.has(t2)).length;
      return adj >= (Number.isFinite(threshold) ? threshold : 1);
    }
    case 60: return adjacentTiles(self.tile).every((t2) => !own.has(t2)); // no ally nearby
    case 64: return { note: 'random', detail: 'cond 64: randomly picks one effect' };
    case 65: {                                                   // ≥ N of [char set] in battle
      const present = c.vals.filter((v) => allies.some((u) => u.id === v)).length;
      return present >= need(threshold);
    }
    case 67:                                                     // count of allies with [buff] is one of
      return inCounts(allies.filter((u) => countMatching(u, c.vals, c.names, c.condAttr) > 0).length);
    case 68:                                                     // count of enemies with [buff] is one of
      if (!enemySim) return { note: 'enemy-cond', detail: 'cond 68: enemy buff count (no wave)' };
      return inCounts(enemies.filter((u) => countMatching(u, c.vals, c.names, c.condAttr) > 0).length);
    default:
      return cond > 68 ? true    // past-enum ordinals mean "no condition"
        : { note: 'unknown', detail: `cond ${cond}: no evaluator` };
  }
}

// primary + secondary condition specs of a buff
function condSpecs(b: SkillBuff): CondSpec[] {
  const specs: CondSpec[] = [{
    cond: b.applyCond, vals: b.applyCondVals ?? [], names: b.applyCondNames ?? [],
    count: b.applyCondCount ?? 0, counts: b.applyCondCounts ?? (b.applyCondCount ? [b.applyCondCount] : []),
    condAttr: b.condAttr ?? 6,
  }];
  if (b.applyCond2 != null) specs.push({
    cond: b.applyCond2, vals: b.applyCondVals2 ?? [], names: b.applyCondNames2 ?? [],
    count: b.applyCondCount2 ?? 0, counts: b.applyCondCounts2 ?? (b.applyCondCount2 ? [b.applyCondCount2] : []),
    condAttr: b.condAttr2 ?? 6,
  });
  return specs;
}

// does the condition read TARGET state (must be evaluated per target)?
const TARGET_CONDS = new Set([10, 11, 12, 13, 14, 16, 17, 18, 23, 43, 44, 49, 50, 51, 52, 53, 54, 55, 56, 58, 61, 62]);

// ── trigger evaluation (static round-1 view) ─────────────────────────────────

function evalTrigger(b: SkillBuff, self: UnitState, sides: Sides): CondVerdict {
  switch (b.trigger) {
    case 12: case 13: case 30: case 65: case 71: return true;
    case 27: return depthOf(self) === 2;   // front line
    case 28: return depthOf(self) === 1;   // mid line
    case 29: return depthOf(self) === 0;   // back line
    case 5:  return b.triggerVal ? self.hpFrac <= b.triggerVal : false; // HP ≤ x
    case 6:  return b.triggerVal ? self.hpFrac >= b.triggerVal : true;  // HP ≥ x
    case 25: return b.triggerVal ? self.hpFrac <= b.triggerVal : false;
    case 26: return b.triggerVal ? self.hpFrac >= b.triggerVal : true;
    case 7: case 34: {   // {key} in allied squad / in grid (= sortied on the board)
      const key = b.triggerKey || '';
      if (!key) return { note: 'unknown', detail: `trigger ${b.trigger}: no key` };
      return Array.from(sides[self.side].values()).some((u) => u.id === key);
    }
    case 21: case 32:    // if (self) buffed: {key}
      return Array.from(self.applied).some((a) =>
        buffMatches(a, b.triggerKey || '', b.triggerName || '', 0));
    case 33:             // if self debuffed: {key}
      return Array.from(self.applied).some((a) =>
        buffMatches(a, b.triggerKey || '', b.triggerName || '', 1));
    default:
      return { note: 'event', detail: `trigger ${b.trigger}: mid-battle event` };
  }
}

// ── in-battle stat recompute ─────────────────────────────────────────────────

// Flat buffs land after the link multiplier (already in `total`), before percent ones.
function recomputeBattle(u: UnitState): {
  battle: StatMap; apSpd: number; apAdd: number; roundAp: number; apSet: number | null;
} {
  const t0 = u.total;
  const flat: Partial<Record<StatKey, number>> = {};
  const pct: Partial<Record<StatKey, number>> = {};
  let apAdd = 0; let roundAp = 0; let apSet: number | null = null;

  for (const a of u.applied) {
    const b = a.buff;
    if (b.type === AP_ADD) {
      apAdd += b.val;
      if (b.trigger === 30 || b.trigger === 65) roundAp += b.val;
      continue;
    }
    if (b.type === AP_SET) { apSet = b.val; continue; }
    const fk = FLAT_STAT[b.type];
    if (fk) { flat[fk] = (flat[fk] ?? 0) + b.val; continue; }
    const pk = PCT_STAT[b.type];
    if (pk) { pct[pk] = (pct[pk] ?? 0) + b.val; continue; }
  }

  const battle = { ...t0 };
  let apSpd = t0.SPD;
  for (const k of Object.keys(battle) as StatKey[]) {
    const f = flat[k] ?? 0, p = pct[k] ?? 0;
    if (MULT_KEYS.has(k)) {
      const v = (t0[k] + f) * (1 + p);
      if (k === 'SPD') apSpd = v;   // AP accumulates on the untruncated value
      battle[k] = k === 'SPD' ? trunc2(v) : Math.floor(v);
    } else {
      battle[k] = Math.round((t0[k] + f + p * 100) * 10) / 10;
    }
  }
  return { battle, apSpd, apAdd, roundAp, apSet };
}

// ── combat v2 turn projection: SPD fills a 0–100 gauge, the actor resets to 0, AP adds gauge points ──

const V2_GAUGE = 100;

interface GaugeUnit { side: Side; tile: number; spd: number; startAp: number; turnAp: number }

function projectTurns(units: GaugeUnit[], count: number): SimTurnEntry[] {
  const numpad = [7, 8, 9, 4, 5, 6, 1, 2, 3];
  const next = units.map((u) => ({ u, turn: 1, time: Math.max(0, V2_GAUGE - u.startAp) / u.spd }));
  const out: SimTurnEntry[] = [];
  while (next.length && out.length < count) {
    next.sort((a, b) => (a.time - b.time) || (b.u.spd - a.u.spd) || (a.u.side - b.u.side)
      || (numpad[b.u.tile] - numpad[a.u.tile]));
    const n = next[0];
    out.push({ side: n.u.side, tile: n.u.tile, turn: n.turn, time: Math.round(n.time * 100) / 100 });
    n.turn += 1;
    n.time += Math.max(V2_GAUGE - n.u.turnAp, 1) / n.u.spd;
  }
  return out;
}

// ── the engine ───────────────────────────────────────────────────────────────

interface Candidate {
  id: number;
  side: Side;                // caster side
  caster: number;            // tile on the caster's board
  sourceName: string;
  sourceKind: 'skill' | 'equip';
  buff: SkillBuff;
  area: number[];
  center: number;
  appliedTo: Set<number>;    // sideTileKey()s already granted this buff
  dead: boolean;             // permanently resolved (note emitted / fully applied)
}

const MAX_PASSES = 12;

export function simulateRound1(
  inputs: SimUnitInput[], enemyInputs: SimEnemyInput[] = [], version: 1 | 2 = 1,
): SimResult {
  const round = 1;
  const sides: Sides = [new Map(), new Map()];
  for (const inp of inputs) {
    sides[0].set(inp.tile, {
      side: 0, tile: inp.tile, id: inp.unit.id,
      klass: inp.unit.type, role: inp.unit.role, body: inp.unit.body ?? null,
      total: inp.stats.total,
      applied: [], battle: { ...inp.stats.total },
      rawSpd: inp.stats.total.SPD,
      hpFrac: Math.min(Math.max(
        inp.slot.currentHp > 0
          ? inp.slot.currentHp / inp.stats.total.HP
          : (inp.slot.hpPercent ?? 100) / 100,
        0.01,
      ), 1),
    });
  }
  for (const inp of enemyInputs) {
    sides[1].set(inp.tile, {
      side: 1, tile: inp.tile, id: inp.enemy.id,
      klass: inp.enemy.type, role: inp.enemy.role, body: null,
      total: inp.stats,
      applied: [], battle: { ...inp.stats },
      rawSpd: inp.stats.SPD,
      hpFrac: 1,
    });
  }

  const notes: SimNote[] = [];
  const noteOnce = (cand: Candidate, kind: NoteKind, detail: string) => {
    const u = sides[cand.side].get(cand.caster)!;
    notes.push({
      kind, side: cand.side, tile: cand.caster, unitId: u.id,
      sourceName: cand.sourceName, sourceKind: cand.sourceKind, buff: cand.buff, detail,
    });
  };

  // ── build candidates (both sides) ──
  const candidates: Candidate[] = [];
  let cid = 0;
  const addSource = (
    side: Side, tile: number, unitId: string,
    passives: SimSkillSource[], equips: SimEquipSource[],
  ) => {
    // a cond-64 marker claims its child effect keys in applyCondVals
    const claimed = new Set<string>();
    for (const src of passives)
      for (const b of src.skill.buffs)
        if (b.applyCond === 64) (b.applyCondVals ?? []).forEach((k) => claimed.add(k));

    const push = (sourceName: string, sourceKind: 'skill' | 'equip',
                  b: SkillBuff, area: number[], center: number) => {
      candidates.push({
        id: cid++, side, caster: tile, sourceName, sourceKind, buff: b,
        area, center, appliedTo: new Set(), dead: false,
      });
    };
    for (const src of passives) {
      for (const b of src.skill.buffs) {
        if (b.applyCond !== 64 && b.effectKey && claimed.has(b.effectKey)) {
          notes.push({
            kind: 'random', side, tile, unitId,
            sourceName: src.name, sourceKind: 'skill', buff: b,
            detail: 'member of a random-pick (cond 64) group',
          });
          continue;
        }
        push(src.name, 'skill', b, src.skill.area, src.skill.center);
      }
    }
    for (const eq of equips)
      for (const b of eq.buffs) push(eq.name, 'equip', b, [], 0);
  };
  for (const inp of inputs) addSource(0, inp.tile, inp.unit.id, inp.passives, inp.equips);
  for (const inp of enemyInputs) addSource(1, inp.tile, inp.enemy.id, inp.passives, []);

  // ── fixpoint passes ──
  let pass = 0;
  for (pass = 1; pass <= MAX_PASSES; pass++) {
    let appliedThisPass = 0;

    for (const cand of candidates) {
      if (cand.dead) continue;
      const self = sides[cand.side].get(cand.caster)!;
      const b = cand.buff;
      const own = sides[cand.side];
      const opp = sides[(1 - cand.side) as Side];
      const oppActive = opp.size > 0;

      // the victim of a single-target attack is not deterministic pre-combat
      if (b.targetType === 3) {
        noteOnce(cand, 'enemy-target', oppActive
          ? 'target 3: single enemy — victim not deterministic'
          : 'target 3: enemy side');
        cand.dead = true;
        continue;
      }
      // Client applies OUR(1) only to the trigger target or the skill's targeted allies.
      if (b.targetType === 1) {
        noteOnce(cand, 'ally-target', 'target 1: single ally — which ally is decided in battle');
        cand.dead = true;
        continue;
      }
      // enemy-side grid/all targets need a simulated opposing side
      if ((b.targetType === 4 || b.targetType === 9) && !oppActive) {
        noteOnce(cand, 'enemy-target', `target ${b.targetType}: no enemy wave simulated`);
        cand.dead = true;
        continue;
      }
      // random-pick marker
      if (b.applyCond === 64) {
        noteOnce(cand, 'random', 'cond 64: randomly applies one of its effects');
        cand.dead = true;
        continue;
      }
      // trigger
      {
        const v = evalTrigger(b, self, sides);
        if (v !== true) {
          if (typeof v === 'object') { noteOnce(cand, v.note, v.detail); cand.dead = true; }
          continue;   // false → retry next pass (buff-presence triggers can turn true)
        }
      }

      // caster-side conditions (target conds deferred to per-target check)
      const specs = condSpecs(b);
      let casterOk = true;
      for (const spec of specs) {
        if (TARGET_CONDS.has(spec.cond)) continue;
        const v = evalCond(spec, self, null, sides, round);
        if (v === true) continue;
        casterOk = false;
        if (typeof v === 'object') { noteOnce(cand, v.note, v.detail); cand.dead = true; }
        break;
      }
      if (!casterOk) continue;   // false → retry next pass

      // resolve targets (side-relative)
      let targets: UnitState[] = [];
      switch (b.targetType) {
        case 0: targets = [self]; break;
        case 2: case 6:
          targets = mapAreaToTiles(cand.area, cand.center, cand.caster)
            .map((t2) => own.get(t2))
            .filter((u): u is UnitState => !!u);
          break;
        case 8: targets = Array.from(own.values()); break;
        case 5:   // ALL_UNIT: both sides when the enemy wave is simulated
          targets = [...Array.from(own.values()), ...Array.from(opp.values())];
          break;
        case 4: {
          // relative grids anchor on the caster tile mirrored across columns
          const anchor = cand.center ? mirrorTile(cand.caster) : 0;
          targets = mapAreaToTiles(cand.area, cand.center, anchor)
            .map((t2) => opp.get(t2))
            .filter((u): u is UnitState => !!u);
          break;
        }
        case 9: targets = Array.from(opp.values()); break;
        default: targets = [self];
      }
      // body/class/role filters (no body data for enemies → body filter passes)
      targets = targets.filter((tu) => {
        if (b.filterBody?.length && tu.body != null && !b.filterBody.includes(BODY_ORD[tu.body])) return false;
        if (b.filterClass?.length && !b.filterClass.includes(CLASS_ORD[tu.klass])) return false;
        if (b.filterRole?.length && !b.filterRole.includes(ROLE_ORD[tu.role])) return false;
        return true;
      });

      for (const tu of targets) {
        const key = sideTileKey(tu.side, tu.tile);
        if (cand.appliedTo.has(key)) continue;
        // per-target conditions
        let ok = true;
        for (const spec of specs) {
          if (!TARGET_CONDS.has(spec.cond)) continue;
          const v = evalCond(spec, self, tu, sides, round);
          if (v === true) continue;
          ok = false;
          if (typeof v === 'object') { noteOnce(cand, v.note, v.detail); cand.dead = true; }
          break;
        }
        if (!ok || cand.dead) continue;
        // overlap SINGLE: skip if an identical effect already sits on the target
        if (b.overlapType === 3 && b.effectKey &&
            tu.applied.some((a) => a.buff.effectKey === b.effectKey)) {
          cand.appliedTo.add(key);
          continue;
        }
        tu.applied.push({
          buff: b, sourceSide: cand.side, sourceTile: cand.caster,
          sourceName: cand.sourceName, sourceKind: cand.sourceKind,
          pass, chance: b.rate < 1,
        });
        cand.appliedTo.add(key);
        appliedThisPass++;
      }
    }

    // recompute in-battle stats so later passes see updated values
    for (const side of sides) for (const u of Array.from(side.values())) {
      const recomputed = recomputeBattle(u);
      u.battle = recomputed.battle;
      u.rawSpd = recomputed.apSpd;
    }
    if (appliedThisPass === 0) break;
  }

  // candidates that stayed pending (condition never met) → informational note
  for (const cand of candidates) {
    if (cand.dead || cand.appliedTo.size > 0) continue;
    noteOnce(cand, 'cond-failed', 'condition not met in round 1');
  }

  // ── final stats + AP / action timeline (both sides pooled) ──
  // Round 1 begins when any unit first reaches 10 AP; every unit gets >= 1 cycle.
  const apMeta = new Map<number, {
    battle: StatMap; startAp: number; roundAp: number;
    spd: number; cycles: number;
  }>();
  const allStates: UnitState[] = [
    ...Array.from(sides[0].values()), ...Array.from(sides[1].values()),
  ];
  for (const u of allStates) {
    const { battle, apSpd, apAdd, roundAp, apSet } = recomputeBattle(u);
    const spd = Math.max(apSpd, 0.1);
    const startAp = version === 2 ? (apSet ?? 0) + apAdd : Math.min((apSet ?? 0) + apAdd, 20);
    const cycles = Math.max(1, Math.ceil((10 - startAp) / spd));
    apMeta.set(sideTileKey(u.side, u.tile), { battle, startAp, roundAp, spd, cycles });
  }
  const firstCycle = Math.min(...Array.from(apMeta.values()).map((m) => m.cycles));
  const results: SimUnitResult[] = [];
  for (const u of allStates) {
    const { battle, startAp, roundAp, spd, cycles } = apMeta.get(sideTileKey(u.side, u.tile))!;
    const ap = capAp(startAp + spd * firstCycle);
    const perRound = Math.max(spd + roundAp, 0.1);
    const readyRound = ap >= 10 ? 1 : 1 + Math.ceil((10 - ap) / perRound);
    const readyAp = capAp(ap + perRound * (readyRound - 1));
    const t0 = u.total;
    const delta = Object.fromEntries(
      (Object.keys(battle) as StatKey[]).map((k) => [k, Math.round((battle[k] - t0[k]) * 100) / 100]),
    ) as StatMap;
    results.push({
      side: u.side, tile: u.tile, unitId: u.id, applied: u.applied,
      battle, delta, spd: battle.SPD, cycles, readyRound, ap, readyAp,
    });
  }
  results.sort((a, b) => (a.side - b.side) || (a.tile - b.tile));

  if (version === 2) {
    const v2 = results.map((r) => {
      const m = apMeta.get(sideTileKey(r.side, r.tile))!;
      return { ...r, cycles: 0, readyRound: 1, ap: m.startAp, readyAp: m.startAp };
    });
    const turns = projectTurns(v2.map((r) => {
      const m = apMeta.get(sideTileKey(r.side, r.tile))!;
      return { side: r.side, tile: r.tile, spd: m.spd, startAp: m.startAp, turnAp: m.roundAp };
    }), Math.min(30, v2.length * 3));
    const firsts = turns.filter((x) => x.turn === 1).map((x) => ({ side: x.side, tile: x.tile }));
    return {
      version, turns,
      units: v2.filter((r) => r.side === 0),
      enemyUnits: v2.filter((r) => r.side === 1),
      order: firsts.filter((e) => e.side === 0).map((e) => e.tile),
      timeline: [{ round: 1, cycle: 0, entries: firsts }],
      firstCycle: 0, notes, passes: pass,
    };
  }

  const numpad = [7, 8, 9, 4, 5, 6, 1, 2, 3];
  const actionSort = (a: SimUnitResult, b: SimUnitResult) =>
    (b.readyAp - a.readyAp) || (b.spd - a.spd) ||
    (a.side - b.side) || (numpad[b.tile] - numpad[a.tile]);
  const rounds = Array.from(new Set(results.map((r) => r.readyRound))).sort((a, b) => a - b);
  const timeline = rounds.map((readyRound) => ({
    round: readyRound,
    cycle: firstCycle + readyRound - 1,
    entries: results.filter((r) => r.readyRound === readyRound).sort(actionSort)
      .map((r) => ({ side: r.side, tile: r.tile })),
  }));
  const order = (timeline.find((g) => g.round === 1)?.entries ?? [])
    .filter((e) => e.side === 0).map((e) => e.tile);

  return {
    version, turns: [],
    units: results.filter((r) => r.side === 0),
    enemyUnits: results.filter((r) => r.side === 1),
    order, timeline, firstCycle, notes, passes: pass,
  };
}
