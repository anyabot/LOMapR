import { z } from 'zod';

const str = z.string();
const num = z.number();
const pair = z.tuple([num, num]);
const record = <T extends z.ZodType>(v: T) => z.record(str, v);
const klass = z.enum(['Light', 'Heavy', 'Air']);
const role = z.enum(['Defender', 'Attacker', 'Supporter']);

export const buff = z.object({
  trigger: num, targetType: num, applyCond: num, type: num, rate: num, val: num, gain: num,
  turns: num, attr: num, name: str, desc: str, fmt: str,
  filterBody: z.array(num), filterClass: z.array(num), filterRole: z.array(num),
  vals: z.array(num).optional(),
});

export const skill = z.object({
  name: str, type: str, AP: num, range: num, center: num, rate: num, leastRank: num,
  area: z.array(num).length(9),
  buffs: z.array(buff),
});

export const unitList = record(z.object({
  name: str, canonName: str, rarity: z.number().int().min(2).max(6), maxGrade: num,
  type: klass, role, body: z.enum(['Bioroid', 'AGS']), icon: str, invenIcon: str,
}));

const unitStat = z.object({
  HP: pair, ATK: pair, DEF: pair, SPD: num, CRI: num, ACC: num, EVA: num,
  resist: z.object({ fire: num, ice: num, lightning: num }),
});
const linkBonus = z.object({ desc: str, value: num, pct: z.boolean() });

export const unitBundle = z.object({
  skills: record(skill),
  detail: z.object({
    skills: z.array(str), skillsCh: z.array(str),
    stat: z.array(unitStat).min(1),
    linkBonus: z.array(linkBonus), fullLinkBonus: z.array(linkBonus),
    equip: z.array(z.object({ type: z.enum(['Chip', 'OS', 'Item']), level: num })),
    skins: z.array(z.object({ key: str, model: str })),
  }),
});

export const enemyList = record(z.object({
  name: str, img: str, type: klass, role, rank: str,
  HP: pair, ATK: pair, DEF: pair, CRIT: num, ACC: num, EVA: num, SPD: num,
  skills: z.array(str), used: record(z.array(z.tuple([num, str]))), usedSanctum: z.boolean(),
  skillsRef: str.optional(), aiRef: str.optional(),
}));

export const worldIndex = record(z.object({
  title: str, img: str, type: str,
  zones: z.array(z.object({ title: str, img: str })),
}));

export const waveEnemy = z.object({ id: str, lv: num }).nullable();
const stage = z.object({
  id: str, title: str,
  waves: z.array(z.object({ enemies: z.array(waveEnemy) })).optional(),
});
export const world = z.object({
  title: str, type: str,
  zones: z.array(z.object({
    title: str,
    stages: z.array(stage).optional(),
    subzones: z.array(z.array(stage)).optional(),
  })),
});

const equipBase = {
  name: str, icon: str, grade: num, slot: z.enum(['Chip', 'OS', 'Item']),
  classLimit: str.nullable(), roleLimit: str.nullable(), pcLimit: str,
};
export const equipList = record(z.object({
  ...equipBase, rankCount: num, levelLimit: num, exchange: z.enum(['Sanctum', 'IW']).nullable(),
}));
export const equipFull = z.object({
  ...equipBase,
  ranks: z.array(z.object({
    key: str, grade: num, name: str, icon: str,
    levels: z.array(z.object({
      stats: z.array(z.object({ attr: str, value: num, pct: z.boolean() })),
      buffs: z.array(buff),
    })).length(11),
  })).min(1),
});

export const skinList = z.array(z.object({
  unitId: str, key: str, name: str, model: str, modelDam: str,
  category: z.array(str), parts: z.array(str), price: num.nullable(), sensitive: z.boolean(),
  viewerKind: z.enum(['fixed', 'spine', 'skinned']).optional(),
}));

const gachaEntry = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('skin'), id: str, key: str, rate: num, unitId: str, nameId: str }),
  z.object({ kind: z.literal('item'), id: str, key: str, rate: num, qty: num, icon: str, grade: num, name: z.object({ en: str, ko: str }) }),
]);
export const gacha = z.object(Object.fromEntries(
  ['skin_1x', 'skin_11x', 'n_1x', 'n_11x', 'n_event_11x', 'praemium_1x', 'praemium_11x', 'quest_1x', 'quest_10x']
    .map((k) => [k, z.array(gachaEntry)]),
));

export const strings = record(z.object({ en: str.optional(), ko: str.optional() }));

export const images = record(str);
