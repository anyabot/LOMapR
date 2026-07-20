// Known-good sample records from the committed local data (public/local-data).
// If a rename in the game data breaks one of these, update the constant —
// the values are display names resolved through strings.json (en).
export const SAMPLE = {
  unit: { id: 'Char_3P_ConstantiaS2_N', name: 'Constantia S2' },
  equip: { id: 'Equip_Chip_Atk', name: 'Attack Chip EX' },
  enemy: { id: 'NightChick_N', name: 'Knight Chick' },
  world: {
    id: 'Story',
    title: 'Main Story',
    zones: 13,
    zone1Title: 'The Last Human on Earth',
    stage: '1-3B', // battle stage in Story zone 1
  },
  iw: { seasonKey: 'Colossus_01', seasonLabel: 'Colossus 01' },
};
