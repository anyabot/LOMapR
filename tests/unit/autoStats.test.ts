import { describe, it, expect } from 'vitest';
import { solveAutoPoints } from '@/lib/autoStats';
import { makeBuff, simInput } from './fixtures';

const solve = (inp: ReturnType<typeof simInput>, accTarget = 0) =>
  solveAutoPoints({ inputs: [inp], tile: inp.tile, unit: inp.unit, slot: inp.slot, getFull: () => null, accTarget })!;

describe('solveAutoPoints', () => {
  it('spends the fewest CRIT points reaching 100% and leaves the rest', () => {
    const s = solve(simInput(4));
    expect(s).toMatchObject({ possible: true, critPts: 238, accPts: 0, needed: 238, leftover: 62 });
    expect(s.points).toEqual([0, 0, 0, 0, 0, 238]);
  });

  it('adds ACC points for an ACC floor', () => {
    expect(solve(simInput(4), 100)).toMatchObject({ critPts: 238, accPts: 4, leftover: 58 });
  });

  it('counts round-1 CRIT passives', () => {
    expect(solve(simInput(4, { buffs: [makeBuff({ type: 9, val: 0.5 })] })).critPts).toBe(113);
  });

  it('never allocates more than the level allows', () => {
    const s = solve(simInput(4, { slot: { level: 50 } }), 100);
    expect(s).toMatchObject({ possible: false, critPts: 150, accPts: 0, leftover: 0 });
  });

  it('returns null when the tile is not on the team', () => {
    const inp = simInput(4);
    expect(solveAutoPoints({ inputs: [inp], tile: 0, unit: inp.unit, slot: inp.slot, getFull: () => null, accTarget: 0 })).toBeNull();
  });
});
