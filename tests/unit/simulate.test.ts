import { describe, it, expect } from 'vitest';
import type { EnemyData } from '@/interfaces/enemy';
import type { StatMap } from '@/interfaces/team';
import { simulateRound1, type SimEnemyInput } from '@/lib/simulate';
import { makeBuff, simInput } from './fixtures';

const enemy = (tile: number, over: Partial<StatMap> = {}): SimEnemyInput => ({
  tile,
  enemy: { id: `Enemy_${tile}`, type: 'Light', role: 'Attacker' } as EnemyData,
  lv: 1,
  stats: { HP: 1000, ATK: 100, DEF: 50, SPD: 3, CRI: 5, ACC: 100, EVA: 20, fireRes: 0, iceRes: 0, lightningRes: 0, ...over },
  passives: [],
});

describe('simulateRound1', () => {
  it('leaves stats untouched without passives', () => {
    const inp = simInput(4);
    const r = simulateRound1([inp]);
    expect(r.units[0].battle).toEqual(inp.stats.total);
    expect(Object.values(r.units[0].delta).every((v) => v === 0)).toBe(true);
    expect(r.notes).toEqual([]);
    expect(r.order).toEqual([4]);
  });

  it('applies flat before percent buffs on multiplied stats', () => {
    const inp = simInput(4, { buffs: [makeBuff({ type: 0, val: 10 }), makeBuff({ type: 1, val: 0.1 })] });
    const atk = inp.stats.total.ATK;
    const r = simulateRound1([inp]);
    expect(r.units[0].battle.ATK).toBe(Math.floor((atk + 10) * 1.1));
    expect(r.units[0].applied).toHaveLength(2);
  });

  it('adds percent-stat ratio buffs as percentage points', () => {
    const inp = simInput(4, { buffs: [makeBuff({ type: 9, val: 0.2 })] });
    const r = simulateRound1([inp]);
    expect(r.units[0].delta.CRI).toBe(20);
  });

  it('spreads a centered grid buff to allies in its area', () => {
    const area = [0, 0, 0, 0, 1, 1, 0, 0, 0];
    const caster = simInput(4, { buffs: [makeBuff({ targetType: 2, type: 0, val: 7 })], skill: { area, center: 5 } });
    const r = simulateRound1([caster, simInput(5), simInput(0)]);
    const atkDelta = Object.fromEntries(r.units.map((u) => [u.tile, u.delta.ATK]));
    expect(atkDelta).toEqual({ 0: 0, 4: 7, 5: 7 });
  });

  it('filters targets by class', () => {
    const caster = simInput(4, { buffs: [makeBuff({ targetType: 8, type: 0, val: 5, filterClass: [1] })] });
    const r = simulateRound1([caster, simInput(0, { unit: { ...simInput(0).unit, type: 'Heavy' } })]);
    expect(r.units.find((u) => u.tile === 0)!.delta.ATK).toBe(5);
    expect(r.units.find((u) => u.tile === 4)!.delta.ATK).toBe(0);
  });

  it('notes buffs whose target is decided in battle instead of applying them', () => {
    const r = simulateRound1([simInput(4, { buffs: [makeBuff({ targetType: 1, val: 5 }), makeBuff({ targetType: 3, val: 5 })] })]);
    expect(r.notes.map((n) => n.kind).sort()).toEqual(['ally-target', 'enemy-target']);
    expect(r.units[0].applied).toEqual([]);
  });

  it('notes mid-battle triggers as events', () => {
    const r = simulateRound1([simInput(4, { buffs: [makeBuff({ trigger: 1 })] })]);
    expect(r.notes[0]).toMatchObject({ kind: 'event', detail: 'trigger 1: mid-battle event' });
  });

  it('evaluates front-line triggers per position', () => {
    const buffs = [makeBuff({ trigger: 27, type: 0, val: 3 })];
    const r = simulateRound1([simInput(2, { buffs }), simInput(0, { buffs })]);
    expect(r.units.find((u) => u.tile === 2)!.delta.ATK).toBe(3);
    expect(r.units.find((u) => u.tile === 0)!.delta.ATK).toBe(0);
    expect(r.notes).toEqual([expect.objectContaining({ kind: 'cond-failed', tile: 0 })]);
  });

  it('reads configured current HP for HP-threshold triggers', () => {
    const buffs = [makeBuff({ trigger: 5, triggerVal: 0.5, type: 0, val: 4 })];
    const full = simInput(4, { buffs });
    const hurt = simInput(4, { buffs, slot: { currentHp: Math.floor(full.stats.total.HP / 4) } });
    expect(simulateRound1([full]).units[0].delta.ATK).toBe(0);
    expect(simulateRound1([hurt]).units[0].delta.ATK).toBe(4);
  });

  it('applies a buff-presence trigger on a later pass', () => {
    const r = simulateRound1([simInput(4, { buffs: [
      makeBuff({ trigger: 21, triggerKey: 'Effect_Late', type: 0, val: 2 }),
      makeBuff({ effectKey: 'Effect_Late', type: 2, val: 1 }),
    ] })]);
    expect(r.units[0].delta).toMatchObject({ ATK: 2, DEF: 1 });
    expect(r.units[0].applied.map((a) => a.pass)).toEqual([1, 2]);
  });

  it('orders round 1 by readiness, then SPD', () => {
    const r = simulateRound1([simInput(0, { total: { SPD: 4 } }), simInput(1, { total: { SPD: 5 } })]);
    expect(r.order).toEqual([1]);
    expect(r.timeline.flatMap((g) => g.entries.map((e) => e.tile))).toEqual([1, 0]);
  });

  it('starts units with AP buffs earlier', () => {
    const r = simulateRound1([simInput(0, { total: { SPD: 4 }, buffs: [makeBuff({ type: 20, val: 4 })] }), simInput(1, { total: { SPD: 5 } })]);
    expect(r.order).toEqual([0, 1]);
  });

  it('only hits the enemy side when a wave is simulated', () => {
    const buffs = [makeBuff({ targetType: 9, type: 2, val: -10 })];
    const noWave = simulateRound1([simInput(4, { buffs })]);
    expect(noWave.notes[0]).toMatchObject({ kind: 'enemy-target' });
    const withWave = simulateRound1([simInput(4, { buffs })], [enemy(0), enemy(1)]);
    expect(withWave.enemyUnits.map((e) => e.delta.DEF)).toEqual([-10, -10]);
  });

  it('projects v2 turns by gauge time', () => {
    const r = simulateRound1([simInput(0, { total: { SPD: 5 } }), simInput(1, { total: { SPD: 10 } })], [], 2);
    expect(r.turns).toHaveLength(6);
    expect(r.turns.slice(0, 3).map((t) => t.tile)).toEqual([1, 1, 0]);
    expect(r.order).toEqual([1, 0]);
  });
});
