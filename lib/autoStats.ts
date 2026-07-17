// Auto stat allocation: the fewest points that reach 100% round-1 in-battle
// CRIT (and an optional round-1 ACC floor). Other stats are left at zero and
// surplus points stay unspent. Solved by fixpoint iteration because round-1
// deltas can depend on the allocation itself (HP fractions, ATK-vs-DEF
// conditions, …).

import { FullUnitData } from '@/interfaces/unit';
import { TeamSlot } from '@/interfaces/team';
import { EquipFull } from '@/interfaces/equip';
import { SimUnitInput, simulateRound1 } from '@/lib/simulate';
import { computeStats, equippedStats, totalPointsAt, STAT_PER_POINT } from '@/lib/team';

const CRIT_TARGET = 100;
const MAX_ITER = 10;

// points indices in TeamSlot.points
const IDX_ACC = 3;
const IDX_CRIT = 5;

export interface AutoStatSolution {
  points: number[];   // [ATK, DEF, HP, ACC, EVA, CRIT]
  possible: boolean;
  needed: number;     // points required to hit the CRIT/ACC targets
  critPts: number;
  accPts: number;
  leftover: number;   // points left unspent for the user
}

export function solveAutoPoints(opts: {
  inputs: SimUnitInput[];           // whole team, any allocation for `tile`
  tile: number;
  unit: FullUnitData;
  slot: TeamSlot;
  getFull: (id: string) => EquipFull | null;
  accTarget: number;                // round-1 ACC floor in %, 0 = ignore ACC
}): AutoStatSolution | null {
  const { inputs, tile, unit, slot, getFull, accTarget } = opts;
  if (!inputs.some((i) => i.tile === tile)) return null;
  const totalPts = totalPointsAt(slot.level);
  const critPer = STAT_PER_POINT.CRIT * 100;   // percentage points per point spent
  const accPer = STAT_PER_POINT.ACC * 100;

  let pts = [0, 0, 0, 0, 0, 0];
  let out: AutoStatSolution = {
    points: pts, possible: false, needed: 0, critPts: 0, accPts: 0, leftover: totalPts,
  };
  for (let iter = 0; iter < MAX_ITER; iter++) {
    const candSlot: TeamSlot = { ...slot, points: pts };
    const stats = computeStats(unit, candSlot, equippedStats(candSlot, unit, getFull));
    const simInputs = inputs.map((i) => (i.tile === tile ? { ...i, slot: candSlot, stats } : i));
    const r = simulateRound1(simInputs).units.find((u) => u.tile === tile);
    if (!r) return null;
    // Each point moves the battle value linearly, so re-anchor on the candidate.
    const critNeed = Math.max(0, pts[IDX_CRIT] + Math.ceil((CRIT_TARGET - r.battle.CRI) / critPer - 1e-9));
    const accNeed = accTarget > 0
      ? Math.max(0, pts[IDX_ACC] + Math.ceil((accTarget - r.battle.ACC) / accPer - 1e-9))
      : 0;
    const needed = critNeed + accNeed;
    const critPts = Math.min(critNeed, totalPts);          // CRIT first when short
    const accPts = Math.min(accNeed, totalPts - critPts);
    const next = [0, 0, 0, 0, 0, 0];
    next[IDX_CRIT] = critPts;
    next[IDX_ACC] = accPts;
    out = {
      points: next, possible: needed <= totalPts, needed,
      critPts, accPts, leftover: totalPts - critPts - accPts,
    };
    if (next.every((v, i) => v === pts[i])) break;    // may oscillate; MAX_ITER caps it
    pts = next;
  }
  return out;
}
