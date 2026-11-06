import type { FullUnitData, UnitStat } from '@/interfaces/unit';
import type { Skill, SkillBuff } from '@/interfaces/skill';
import type { TeamSlot, StatMap } from '@/interfaces/team';
import type { SimUnitInput } from '@/lib/simulate';
import { computeStats, makeSlot } from '@/lib/team';

export const STAT: UnitStat = {
  HP: [100, 1090], ATK: [10, 109], DEF: [5, 104],
  SPD: 3.5, CRI: 5, ACC: 95, EVA: 10,
  resist: { fire: 0, ice: 10, lightning: -5 },
};

export function makeUnit(over: Partial<FullUnitData> = {}): FullUnitData {
  return {
    id: 'Char_Test_N', name: 'Test', canonName: 'Test', rarity: 3, maxGrade: 5,
    type: 'Light', role: 'Attacker', body: 'Bioroid', icon: '', invenIcon: '',
    profile: null, faction: null,
    skills: [], skillsCh: [], favor: { clear: 0, death: 0, assistant: 0, present: 0 },
    craft: 0, marriage: false, affection: false, secretRoom: '',
    equip: [{ type: 'Chip', level: 20 }, { type: 'Chip', level: 40 }, { type: 'OS', level: 60 }, { type: 'Item', level: 80 }],
    linkBonus: [], fullLinkBonus: [], stat: [STAT, STAT, STAT],
    promotions: [], lvLimits: [], source: {}, skins: [],
    ...over,
  } as FullUnitData;
}

export function makeBuff(over: Partial<SkillBuff> = {}): SkillBuff {
  return {
    group: 0, icon: '', name: 'Buff', attr: 0, trigger: 12, targetType: 0,
    triggerVal: 0, triggerKey: '', triggerName: '',
    applyCond: 63, applyCondVals: [], applyCondNames: [], applyCondAttrs: [], applyCondCount: 0,
    condAttr: 6, turns: 0, rate: 1, val: 0, gain: 0, fmt: 'flat', desc: '', type: 0,
    eraseType: 3, overlapType: 0, overlapMax: 0, filterBody: [], filterClass: [], filterRole: [],
    ...over,
  };
}

export function makeSkill(buffs: SkillBuff[], over: Partial<Skill> = {}): Skill {
  return {
    title: '', name: 'Skill', type: 'passive', img: '', range: 0, AP: 0,
    area: [0, 0, 0, 0, 1, 0, 0, 0, 0], center: 0, description: '', attr: undefined,
    leastRank: 0, accuracy: 0, guardPierce: false, rate: 1, buffs,
    ...over,
  };
}

export function simInput(tile: number, opts: {
  unit?: FullUnitData; slot?: Partial<TeamSlot>; buffs?: SkillBuff[]; skill?: Partial<Skill>; total?: Partial<StatMap>;
} = {}): SimUnitInput {
  const unit = opts.unit ?? makeUnit({ id: `Char_Tile${tile}_N` });
  const slot = { ...makeSlot(unit), ...opts.slot };
  const stats = computeStats(unit, slot, []);
  if (opts.total) stats.total = { ...stats.total, ...opts.total };
  const passives = opts.buffs ? [{ key: 'P', name: 'Passive', skill: makeSkill(opts.buffs, opts.skill) }] : [];
  return { tile, unit, slot, stats, passives, equips: [] };
}
