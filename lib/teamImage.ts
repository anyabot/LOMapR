import { RootState } from '@/store';
import { Team, StatMap } from '@/interfaces/team';
import { FullUnitData } from '@/interfaces/unit';
import { selectUnitFull } from '@/store/unitSlice';
import { selectEquipFull } from '@/store/equipSlice';
import { computeStats, equippedStats } from '@/lib/team';
import { unitDisplayName } from '@/lib/rank';
import { t } from '@/lib/strings';

interface ExportEquip {
  name: string;
  icon: string;
  level: number;
}

interface ExportUnit {
  tile: number;
  name: string;
  icon: string;
  level: number;
  links: number;
  points: number[];
  stats: StatMap;
  equips: Array<ExportEquip | null>;
}

const COLORS = {
  bg: '#101318', panel: '#181d25', cell: '#11161d', border: '#343c49',
  text: '#f4f6f8', muted: '#98a2b3', yellow: '#f2c83c', teal: '#39c6bd',
};

const TILE_POSITION = [7, 8, 9, 4, 5, 6, 1, 2, 3];
const POINT_INDEX: Record<string, number | undefined> = {
  ATK: 0, DEF: 1, HP: 2, ACC: 3, EVA: 4, CRI: 5,
};
const STAT_ROWS: Array<[keyof StatMap, string, string]> = [
  ['HP', 'HP', ''], ['ATK', 'ATK', ''], ['DEF', 'DEF', ''], ['SPD', 'SPD', ''],
  ['ACC', 'ACC', '%'], ['EVA', 'EVA', '%'], ['CRI', 'CRIT', '%'],
];

function roundedRect(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  radius: number, fill: string, stroke = COLORS.border,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function fitText(ctx: CanvasRenderingContext2D, value: string, maxWidth: number): string {
  if (ctx.measureText(value).width <= maxWidth) return value;
  let out = value;
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) out = out.slice(0, -1);
  return `${out}…`;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawCover(
  ctx: CanvasRenderingContext2D, img: HTMLImageElement,
  x: number, y: number, w: number, h: number,
) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / scale, sh = h / scale;
  const sx = (img.naturalWidth - sw) / 2, sy = (img.naturalHeight - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function collectUnits(team: Team, state: RootState): ExportUnit[] {
  const missing = new Set<string>();
  const out: ExportUnit[] = [];
  team.forEach((slot, tile) => {
    if (!slot) return;
    const unit = selectUnitFull(state, slot.unitId) as FullUnitData | null;
    if (!unit?.stat) { missing.add(slot.unitId); return; }
    for (const eq of slot.equips) {
      if (eq && !selectEquipFull(state, eq.id)) missing.add(eq.id);
    }
    const getFull = (id: string) => selectEquipFull(state, id);
    const stats = computeStats(unit, slot, equippedStats(slot, unit, getFull)).total;
    const equips = slot.equips.map((sel) => {
      if (!sel) return null;
      const full = getFull(sel.id);
      if (!full) return null;
      const rank = full.ranks[Math.min(sel.rank, full.ranks.length - 1)];
      return rank ? { name: t(rank.name), icon: rank.icon, level: sel.level } : null;
    });
    out.push({
      tile, name: unitDisplayName(unit), icon: unit.icon, level: slot.level, links: slot.links,
      points: slot.points, stats, equips,
    });
  });
  if (missing.size) throw new Error(`Still loading: ${Array.from(missing).join(', ')}`);
  return out;
}

async function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not create PNG.')), 'image/png');
  });
}

/** Build and download a PNG summary of the current team. */
export async function exportTeamImage(team: Team, state: RootState): Promise<void> {
  const units = collectUnits(team, state);
  if (!units.length) throw new Error('Add at least one unit before exporting.');

  const width = 1760;
  const top = 32;
  const rowH = 200;
  const height = Math.max(680, top + units.length * rowH + 28);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable.');

  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, width, height);
  const imageUrls = new Set<string>();
  for (const unit of units) {
    if (unit.icon) imageUrls.add(`/images/icons/${unit.icon}.png`);
    for (const eq of unit.equips) if (eq?.icon) imageUrls.add(`/images/icons/${eq.icon}.png`);
  }
  const loaded = new Map<string, HTMLImageElement>();
  await Promise.all(Array.from(imageUrls).map(async (url) => {
    const img = await loadImage(url);
    if (img) loaded.set(url, img);
  }));

  // Formation panel.
  const fx = 36, fy = 54, cell = 142, gap = 10;
  roundedRect(ctx, fx, fy, cell * 3 + gap * 2 + 32, cell * 3 + gap * 2 + 76, 18, COLORS.panel);
  ctx.fillStyle = COLORS.text;
  ctx.font = '700 22px system-ui, sans-serif';
  ctx.fillText('Formation', fx + 16, fy + 32);
  ctx.font = '600 14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ['BACK', 'MID', 'FRONT'].forEach((label, i) => {
    ctx.fillStyle = COLORS.muted;
    ctx.fillText(label, fx + 16 + i * (cell + gap) + cell / 2, fy + 57);
  });
  const byTile = new Map(units.map((unit) => [unit.tile, unit]));
  for (let tile = 0; tile < 9; tile++) {
    const x = fx + 16 + (tile % 3) * (cell + gap);
    const y = fy + 68 + Math.floor(tile / 3) * (cell + gap);
    roundedRect(ctx, x, y, cell, cell, 12, COLORS.cell);
    const unit = byTile.get(tile);
    const img = unit?.icon ? loaded.get(`/images/icons/${unit.icon}.png`) : null;
    if (unit && img) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, cell - 4, cell - 4, 10);
      ctx.clip();
      drawCover(ctx, img, x + 2, y + 2, cell - 4, cell - 4);
      ctx.restore();
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = unit ? COLORS.text : '#586273';
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.fillText(String(TILE_POSITION[tile]), x + 8, y + 19);
    ctx.textAlign = 'center';
  }
  ctx.textAlign = 'left';

  // Unit list.
  const ux = 524, uw = width - ux - 36;
  units.forEach((unit, index) => {
    const y = top + index * rowH;
    roundedRect(ctx, ux, y, uw, rowH - 12, 16, COLORS.panel);

    const portraitX = ux + 16, portraitY = y + 18, portrait = 112;
    roundedRect(ctx, portraitX, portraitY, portrait, portrait, 12, COLORS.cell);
    const unitImg = unit.icon ? loaded.get(`/images/icons/${unit.icon}.png`) : null;
    if (unitImg) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(portraitX + 2, portraitY + 2, portrait - 4, portrait - 4, 10);
      ctx.clip();
      drawCover(ctx, unitImg, portraitX + 2, portraitY + 2, portrait - 4, portrait - 4);
      ctx.restore();
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.yellow;
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.fillText(`Lv. ${unit.level}`, portraitX + portrait / 2, portraitY + portrait + 22);
    ctx.fillStyle = COLORS.teal;
    ctx.font = '700 14px system-ui, sans-serif';
    ctx.fillText(`Link ${unit.links * 100}%`, portraitX + portrait / 2, portraitY + portrait + 42);
    ctx.textAlign = 'left';

    const statsX = ux + 148;
    ctx.fillStyle = COLORS.text;
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.fillText(fitText(ctx, unit.name, 430), statsX, y + 31);
    ctx.fillStyle = COLORS.muted;
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.fillText('TOTAL STATS (ALLOCATED POINTS)', statsX, y + 55);
    STAT_ROWS.forEach(([key, label, suffix], i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = statsX + col * 220, sy = y + 81 + row * 25;
      const pointIdx = POINT_INDEX[key];
      const pts = pointIdx == null ? '—' : `${unit.points[pointIdx] ?? 0} pt`;
      ctx.fillStyle = COLORS.muted;
      ctx.font = '600 14px system-ui, sans-serif';
      ctx.fillText(label, x, sy);
      ctx.fillStyle = COLORS.text;
      ctx.font = '700 15px system-ui, sans-serif';
      ctx.fillText(`${unit.stats[key].toLocaleString()}${suffix}`, x + 53, sy);
      ctx.fillStyle = COLORS.yellow;
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.fillText(`(${pts})`, x + 137, sy);
    });

    const equipX = ux + 610;
    ctx.fillStyle = COLORS.muted;
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.fillText('EQUIPMENT', equipX, y + 31);
    for (let i = 0; i < 4; i++) {
      const eq = unit.equips[i];
      const col = i % 2, row = Math.floor(i / 2);
      const x = equipX + col * 292, ey = y + 46 + row * 62;
      roundedRect(ctx, x, ey, 278, 53, 9, COLORS.cell);
      if (!eq) {
        ctx.fillStyle = '#586273';
        ctx.font = '600 14px system-ui, sans-serif';
        ctx.fillText('Empty', x + 64, ey + 32);
        continue;
      }
      const eqImg = eq.icon ? loaded.get(`/images/icons/${eq.icon}.png`) : null;
      if (eqImg) drawCover(ctx, eqImg, x + 5, ey + 5, 43, 43);
      ctx.fillStyle = COLORS.text;
      ctx.font = '600 13px system-ui, sans-serif';
      ctx.fillText(fitText(ctx, eq.name, 192), x + 57, ey + 22);
      ctx.fillStyle = COLORS.teal;
      ctx.font = '700 12px system-ui, sans-serif';
      ctx.fillText(`Lv. ${eq.level}`, x + 57, ey + 41);
    }
  });

  const blob = await canvasBlob(canvas);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `lomapr-team-${new Date().toISOString().slice(0, 10)}.png`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
