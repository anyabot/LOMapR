export type NpcCategory = 'character' | 'enemy' | 'other';

export interface NpcModelVariant {
  key: string;
  name: string;
  asset: string;
  thumbnail?: string;
  hasCensoredVariant?: boolean;
}

export interface NpcEntry {
  id: string;
  name: string;
  category: NpcCategory;
  thumbnail: string;
  models: NpcModelVariant[];
  loreGroups?: string[];
}

const npc = (
  id: string,
  name: string,
  category: NpcCategory,
  asset: string,
  extra: Partial<Omit<NpcEntry, 'id' | 'name' | 'category' | 'models'>> &
    { models?: NpcModelVariant[] } = {},
): NpcEntry => ({
  id,
  name,
  category,
  thumbnail: extra.thumbnail || `/images/npcs/${id}.webp`,
  models: extra.models || [{ key: 'default', name: 'Default', asset }],
  loreGroups: extra.loreGroups,
});

// Complete, non-NDL, non-prop renders only. MP Vargr is deliberately absent: its
// textures are the playable BR Vargr art with only a small face-region difference.
export const NPCS: NpcEntry[] = [
  npc('phatima', 'NPC_NAME_PHATIMA', 'character', '2dmodel_3p_phatima_n'),
  npc('mr-alfred', 'NPC_NAME_MR_ALFRED', 'character', '2dmodel_ags_mralfred_n'),
  npc('false-night-angel', 'NPC_NAME_FALSE_NIGHT_ANGEL', 'character', '2dmodel_br_nightangelfake_n'),
  npc('tomoe-kin', 'NPC_NAME_TOMOE_KIN', 'character', '2dmodel_br_tomoekin_n', {
    thumbnail: '/images/icons/FormationIcon_BR_Tomoe_N.png',
  }),
  npc('eva', 'NPC_NAME_EVA', 'character', '2dmodel_eva_n'),
  npc('kasasagi', 'NPC_NAME_KASASAGI', 'character', '2dmodel_kasasagi_n'),
  npc('kirishima', 'NPC_NAME_KIRISHIMA', 'character', '2dmodel_kirishima_n'),
  npc('azazel-alter', 'NPC_NAME_AZAZEL_ALTER', 'character', '2dmodel_mp_azazelalter_n'),
  npc('lemonade-omega', 'NPC_NAME_LEMONADE_OMEGA', 'character', '2dmodel_mp_lemonadeomega_n', {
    loreGroups: ['secretary-lemonades'],
  }),
  npc('lemonade-zeta-mechanical', 'NPC_NAME_LEMONADE_ZETA_MECHANICAL', 'character',
    '2dmodel_mp_lemonadezeta_n', {
    thumbnail: '/images/npcs/lemonade-zeta.webp',
  }),
  npc('lemonade-zeta-humanoid', 'NPC_NAME_LEMONADE_ZETA_HUMANOID', 'character',
    '2dmodel_pecs_lemonadezeta_n_dl', {
    thumbnail: '/images/npcs/lemonade-zeta-human.webp',
    loreGroups: ['secretary-lemonades'],
    models: [
      {
        key: 'default', name: 'Humanoid', asset: '2dmodel_pecs_lemonadezeta_n_dl',
        thumbnail: '/images/npcs/lemonade-zeta-human.webp',
        hasCensoredVariant: true,
      },
    ],
  }),
  npc('helmet-wristcut', 'NPC_NAME_HELMET_WRISTCUT', 'character', '2dmodel_pecs_helmetwristcut_n'),
  npc('lemonade-delta', 'NPC_NAME_LEMONADE_DELTA', 'character', '2dmodel_pecs_lemonadedelta_n', {
    loreGroups: ['secretary-lemonades'],
  }),
  npc('secretary-yumi', 'NPC_NAME_SECRETARY_YUMI', 'character', '2dmodel_pecs_secretaryyumi_n'),
  npc('wristcut', 'NPC_NAME_WRISTCUT', 'character', '2dmodel_pecs_wristcut_n'),
  npc('sherlock', 'NPC_NAME_SHERLOCK', 'character', '2dmodel_sherlock_n'),
  npc('simon', 'NPC_NAME_SIMON', 'character', '2dmodel_simon_n'),
  npc('simon-2', 'NPC_NAME_SIMON_2', 'character', '2dmodel_simon2_n'),

  npc('iron-prince', 'NPC_NAME_IRON_PRINCE', 'enemy', '2dmodel_mp_ironprince_n'),
  npc('kidnapper', 'NPC_NAME_KIDNAPPER', 'enemy', '2dmodel_mp_kidnapper_n'),
  npc('metal-parasite', 'NPC_NAME_METAL_PARASITE', 'enemy', '2dmodel_mp_metal_parasite_n'),
  npc('metal-guard', 'NPC_NAME_METAL_GUARD', 'enemy', '2dmodel_mp_metalguard_n'),
  npc('night-chick', 'NPC_NAME_NIGHT_CHICK', 'enemy', '2dmodel_mp_nightchick_n'),
  npc('speaker', 'NPC_NAME_SPEAKER', 'enemy', '2dmodel_mp_speaker_n'),
  npc('stalker-jp', 'NPC_NAME_STALKER_JP', 'enemy', '2dmodel_mp_stalker_ev_jp_n'),
  npc('stalker', 'NPC_NAME_STALKER', 'enemy', '2dmodel_mp_stalker_n'),
];

export const NPCS_BY_ID = new Map(NPCS.map((entry) => [entry.id, entry]));
// Keep old shared-form links useful; the story/faction-facing form is humanoid.
NPCS_BY_ID.set('lemonade-zeta', NPCS_BY_ID.get('lemonade-zeta-humanoid')!);
