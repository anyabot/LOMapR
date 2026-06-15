// Official unit rank (StartGrade) tags + colors, shared by the unit list/detail.
// Grade enum: 2=B, 3=A, 4=S, 5=SS, 6=SSS (no SSS units exist yet, kept for safety).

export const RANK_TAG: Record<number, string> = { 2: 'B', 3: 'A', 4: 'S', 5: 'SS', 6: 'SSS' };

// The game's official rank colors:
//   B  green/brown   A  light blue   S  orange   SS  gold/yellow   SSS  red
export const RANK_COLOR: Record<number, string> = {
  2: '#5bbf6a', // B  — green
  3: '#5bb8e6', // A  — light blue
  4: '#f08a3c', // S  — orange
  5: '#f2c83c', // SS — gold/yellow
  6: '#e0524a', // SSS — red
};

export const rankTag = (g: number): string => RANK_TAG[g] ?? String(g);
export const rankColor = (g: number): string => RANK_COLOR[g] ?? '#9aa0aa';

// Official combined role+rank badge sprite (UI_Icon_CHA_<Class><Rank>_Big), sliced
// to /images/icons/. The class symbol encodes the role — Sword=Attacker,
// Shield=Defender, Gear=Supporter — and the rank (B/A/S/SS) is baked into the art
// with its official color. Returns null for roles/ranks with no badge (e.g. SSS).
const ROLE_SYMBOL: Record<string, string> = {
  Attacker: 'Sword',
  Defender: 'Shield',
  Supporter: 'Gear',
};

export function roleRankIcon(role: string, grade: number): string | null {
  const sym = ROLE_SYMBOL[role];
  const tag = RANK_TAG[grade];
  if (!sym || !tag || grade > 5) return null;   // no SSS badge in the set
  return `UI_Icon_CHA_${sym}${tag}_Big`;
}

// Plain class-type / role icons in public/images/common/ (shared by unit + enemy
// pages). Type covers Light / Heavy / Air (ActorClassType; MOBILITY shows as Air).
const TYPE_FILE: Record<string, string> = { Light: 'Type_Light', Heavy: 'Type_Heavy', Air: 'Type_Air' };
const ROLE_FILE: Record<string, string> = {
  Attacker: 'Role_Attacker', Defender: 'Role_Defender', Supporter: 'Role_Supporter',
};

export const typeIcon = (type: string): string | null =>
  TYPE_FILE[type] ? `/images/common/${TYPE_FILE[type]}.png` : null;
export const roleIcon = (role: string): string | null =>
  ROLE_FILE[role] ? `/images/common/${ROLE_FILE[role]}.png` : null;

// Equipment-slot type icons in public/images/common/ (Chip / OS / Item).
const EQUIP_FILE: Record<string, string> = { Chip: 'Equip_Chip', OS: 'Equip_OS', Item: 'Equip_Item' };
export const equipIcon = (kind: string): string | null =>
  EQUIP_FILE[kind] ? `/images/common/${EQUIP_FILE[kind]}.png` : null;

// Faction (squad) icon: the Squad_Icon key is a UI_TroopIcon_* sprite sliced to
// public/images/common/. Pass the raw key; returns its public path.
export const factionIcon = (key: string): string | null =>
  key ? `/images/common/${key}.png` : null;

// Equip exchange-shop source -> display label + badge color (Sanctum / Infinite War).
export const EXCHANGE_META: Record<'Sanctum' | 'IW', { label: string; color: string }> = {
  Sanctum: { label: 'Sanctum', color: 'blue' },
  IW:      { label: 'Infinite War', color: 'orange' },
};
