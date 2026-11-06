import { describe, it, expect } from 'vitest';
import type { Team, TeamSlot } from '@/interfaces/team';
import type { EquipFull } from '@/interfaces/equip';
import {
  statAt, baseStats, maxLinksAt, totalPointsAt, skillUnlockRank, makeSlot, computeStats,
  classifyLinkBonus, scaleSkillLevel, mapAreaToTiles, allyAffectedTiles, canEquip,
  equipSlotUnlocked, equippedStats, encodeTeam, decodeTeam, LV_MAX,
} from '@/lib/team';
import { adjacentTiles } from '@/lib/simulate';
import { STAT, makeUnit, makeBuff, makeSkill } from './fixtures';

const unit = makeUnit();

describe('level gating', () => {
  it('grows stats linearly to level 100 and extrapolates past it', () => {
    expect(statAt([100, 1090], 1)).toBe(100);
    expect(statAt([100, 1090], 100)).toBe(1090);
    expect(statAt([100, 1090], 120)).toBe(1290);
    expect(statAt([100, 1090], 0)).toBe(100);
    expect(statAt([100, 1090], 999)).toBe(statAt([100, 1090], LV_MAX));
  });

  it('copies flat stats and resists into the base map', () => {
    expect(baseStats(STAT, 100)).toMatchObject({ HP: 1090, SPD: 3.5, CRI: 5, iceRes: 10, lightningRes: -5 });
  });

  it('unlocks link slots at 10/30/50/70/90', () => {
    expect([9, 10, 29, 30, 89, 90, 120].map(maxLinksAt)).toEqual([0, 1, 1, 2, 4, 5, 5]);
  });

  it('gives three points per level', () => {
    expect(totalPointsAt(100)).toBe(300);
  });

  it('prefers the data leastRank and falls back to the bundled table', () => {
    expect(skillUnlockRank('Skill_3P_Ajax_N_3', 5, 'global')).toBe(5);
    expect(skillUnlockRank('Skill_3P_Ajax_N_3', 0, 'global')).toBe(3);
    expect(skillUnlockRank('Skill_Unknown', 0, 'global')).toBe(0);
  });
});

describe('makeSlot', () => {
  it('defaults to level 100, max grade and five links', () => {
    expect(makeSlot(unit)).toMatchObject({ unitId: unit.id, level: 100, gradeIdx: 2, links: 5, fullLink: -1 });
  });
});

describe('computeStats', () => {
  const slot = (over: Partial<TeamSlot> = {}): TeamSlot => ({ ...makeSlot(unit), gradeIdx: 0, links: 0, ...over });

  it('returns base stats when nothing is allocated', () => {
    const s = computeStats(unit, slot(), []);
    expect(s.total).toEqual(s.base);
    expect(Object.values(s.bonus).every((v) => v === 0)).toBe(true);
  });

  it('adds stat points, flat equipment and percent equipment', () => {
    const s = computeStats(unit, slot({ points: [10, 0, 0, 0, 0, 10] }), [
      { attr: 'ATK', value: 20, pct: false },
      { attr: 'CRIT', value: 0.05, pct: true },
    ]);
    expect(s.total.ATK).toBe(109 + 15 + 20);
    expect(s.total.CRI).toBe(5 + 4 + 5);
    expect(s.bonus.ATK).toBe(35);
  });

  it('multiplies HP/ATK/DEF by per-link percent bonuses', () => {
    const linked = makeUnit({ linkBonus: [{ desc: 'ATK +%', value: 0.02, pct: true }] });
    const s = computeStats(linked, { ...makeSlot(linked), gradeIdx: 0, links: 5 }, []);
    expect(s.linkPct.ATK).toBeCloseTo(0.1);
    expect(s.total.ATK).toBe(Math.floor(109 * 1.1));
  });

  it('classifies non-stat link bonuses as stat null', () => {
    expect(classifyLinkBonus({ desc: 'Skill Power +%', value: 0.1, pct: true }).stat).toBeNull();
    expect(classifyLinkBonus({ desc: 'SPD +', value: 0.1, pct: false })).toEqual({ stat: 'SPD', pct: false, value: 0.1 });
  });
});

describe('scaleSkillLevel', () => {
  it('scales rate, applies level changes and linear buff values', () => {
    const skill = makeSkill([makeBuff({ val: 0.1, gain: 0.01 })], {
      rate: 1, rateGain: 0.1, AP: 6, levelChanges: [{ level: 5, ap: 5 }, { level: 9, ap: 4 }],
    });
    const s = scaleSkillLevel(skill, 5, 0, 0);
    expect(s.rate).toBe(1.4);
    expect(s.AP).toBe(5);
    expect(s.buffs[0].val).toBe(0.14);
    expect(scaleSkillLevel(skill, 5, 0, 2).buffs[0].val).toBe(0.16);
  });

  it('uses per-level vals when present and clamps level to 1..10', () => {
    const skill = makeSkill([makeBuff({ vals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] })]);
    expect(scaleSkillLevel(skill, 99, 0, 0).buffs[0].val).toBe(10);
    expect(scaleSkillLevel(skill, 0, 0, 0).buffs[0].val).toBe(1);
  });
});

describe('grid mapping', () => {
  it('returns fixed cells when center is 0', () => {
    expect(mapAreaToTiles([1, 0, 0, 0, 1, 0, 0, 0, 1], 0, 7)).toEqual([0, 4, 8]);
  });

  it('re-anchors a centered area on the caster and clips the board edge', () => {
    expect(mapAreaToTiles([1, 0, 0, 0, 1, 0, 0, 0, 1], 5, 0)).toEqual([0, 4]);
  });

  it('lists 8-neighbourhood adjacency', () => {
    expect(adjacentTiles(0)).toEqual([1, 3, 4]);
    expect(adjacentTiles(4)).toHaveLength(8);
  });

  it('reports ally-affected tiles only for ally-side targets', () => {
    expect(allyAffectedTiles(makeSkill([makeBuff({ targetType: 3 })]), 4)).toBeNull();
    expect(allyAffectedTiles(makeSkill([makeBuff({ targetType: 0 })]), 4)).toEqual([4]);
    expect(allyAffectedTiles(makeSkill([makeBuff({ targetType: 8 })]), 4)).toHaveLength(9);
  });
});

describe('equipment', () => {
  const chip = { slot: 'Chip', classLimit: null, roleLimit: null, pcLimit: '' };

  it('checks slot type and class/role/unit locks', () => {
    expect(canEquip(chip, unit, 'Chip')).toBe(true);
    expect(canEquip(chip, unit, 'OS')).toBe(false);
    expect(canEquip({ ...chip, classLimit: 'Heavy' }, unit, 'Chip')).toBe(false);
    expect(canEquip({ ...chip, roleLimit: 'Attacker' }, unit, 'Chip')).toBe(true);
    expect(canEquip({ ...chip, pcLimit: 'Char_Other_N' }, unit, 'Chip')).toBe(false);
  });

  it('unlocks slots from unit metadata, else the 20/40/60/80 ladder', () => {
    expect(equipSlotUnlocked(unit, 0, 19)).toBe(false);
    expect(equipSlotUnlocked(unit, 0, 20)).toBe(true);
    const bare = makeUnit({ equip: undefined as any });
    expect(equipSlotUnlocked(bare, 3, 79)).toBe(false);
    expect(equipSlotUnlocked(bare, 3, 80)).toBe(true);
  });

  it('sums stats of unlocked slots only, clamping rank and level', () => {
    const full = {
      ranks: [{ levels: Array.from({ length: 11 }, (_, i) => ({ stats: [{ attr: 'ATK', value: i, pct: false }], buffs: [] })) }],
    } as unknown as EquipFull;
    const slot = { ...makeSlot(unit), level: 30, equips: [{ id: 'E', rank: 5, level: 99 }, null, null, { id: 'E', rank: 0, level: 3 }] };
    expect(equippedStats(slot, unit, () => full)).toEqual([{ attr: 'ATK', value: 10, pct: false }]);
  });
});

describe('share code', () => {
  const slot = (unitId: string, over: Partial<TeamSlot> = {}): TeamSlot => ({
    unitId, level: 110, gradeIdx: 2, links: 5, fullLink: 1,
    points: [1, 2, 3, 4, 5, 300], equips: [{ id: 'Equip_Chip_Acc', rank: 3, level: 10 }, null, null, null],
    skillLv: [10, 5, 1], form: 1, maxAffection: true, currentHp: 4321, ...over,
  });

  it('round-trips known and unknown ids through v4', () => {
    const team: Team = [slot('Char_3P_Ajax_N'), null, null, null, slot('Char_Not_In_Table_N', {
      equips: [null, { id: 'Equip_Not_In_Table', rank: 1, level: 0 }, null, null],
    }), null, null, null, null];
    const code = encodeTeam(team);
    expect(code.startsWith('4.')).toBe(true);
    expect(decodeTeam(code)).toEqual(team.map((s) => (s ? { ...s, hpPercent: undefined } : null)));
  });

  it('clamps out-of-range values on encode', () => {
    const decoded = decodeTeam(encodeTeam([slot('Char_3P_Ajax_N', { level: 500, skillLv: [0, 99] })]))!;
    expect(decoded[0]).toMatchObject({ level: LV_MAX, skillLv: [1, 10] });
  });

  it('decodes the legacy * format', () => {
    const tile = '3P_Ajax_N~100~0~5~-1~1.2~Chip_Acc.3.10~10.10~0';
    const team = decodeTeam(['1', tile, '', '', '', '', '', '', '', ''].join('*'))!;
    expect(team[0]).toMatchObject({
      unitId: 'Char_3P_Ajax_N', level: 100, links: 5, points: [1, 2, 0, 0, 0, 0],
      equips: [{ id: 'Equip_Chip_Acc', rank: 3, level: 10 }, null, null, null], skillLv: [10, 10],
    });
    expect(team.slice(1).every((s) => s === null)).toBe(true);
  });

  it.each(['', 'garbage', '4.', '4.!!!!', '2.AAAA', '1*a*b'])('rejects %j', (code) => {
    expect(decodeTeam(code)).toBeNull();
  });

  it('rejects a truncated payload', () => {
    const code = encodeTeam([slot('Char_3P_Ajax_N')]);
    expect(decodeTeam(code.slice(0, -6))).toBeNull();
  });
});
