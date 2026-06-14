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
