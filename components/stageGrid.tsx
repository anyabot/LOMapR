import { useEffect, useRef, useState } from 'react';
import { Stage, StageSubType, STAGE_ICON_SRC } from '@/interfaces/world';
import { t } from '@/lib/strings';
import { useTranslationVersion } from '@/lib/translationVersion';
import { accentScale, getGame, tokens } from '@altterisk/game-hub';

const ACCENT = accentScale(getGame('lo').accent);

const ICON = 46;
const BANNER_H = 30;
const BANNER_W = 132;
const OVERLAP = 18;
const CELL_W = ICON + BANNER_W - OVERLAP + 22;
const ROW_H = 78;
const PAD = 16;
const GUTTER = 22;

const ROWS: { label: string; subs: StageSubType[] }[] = [
  { label: 'SIDE', subs: ['Side'] },
  { label: 'MAIN', subs: ['Main', 'Story'] },
  { label: 'EX', subs: ['Ex'] },
];

const TINT: Record<StageSubType, string> = {
  Main: '#4fd1c5',
  Story: '#b794f4',
  Side: '#63b3ed',
  Ex: '#fc8181',
};

interface Placed {
  stage: Stage;
  row: number;
  col: number;
  x: number;
  y: number;
}

interface Layout {
  placed: Placed[];
  edges: [Placed, Placed][];
  lanes: { label: string; y: number; tint: string }[];
  width: number;
  height: number;
}

interface Props {
  stages: Stage[];
  selected: string;
  onSelect: (title: string) => void;
}

// Side/Ex chains start half a cell after the stage that unlocks them, kept within the main row's span.
function layout(stages: Stage[]): Layout {
  const rows = ROWS
    .map((r) => ({ ...r, stages: stages.filter((s) => r.subs.includes(s.subtype)).sort((a, b) => a.pos - b.pos) }))
    .filter((r) => r.stages.length > 0);
  const titles = new Set(stages.map((s) => s.title));
  const parentsOf = (s: Stage) => (s.unlock?.clearStages ?? []).filter((p) => titles.has(p));
  const byNext = new Map(stages.filter((s) => s.next).map((s) => [s.next, s.title]));
  const parentOf = (s: Stage) => parentsOf(s)[0] ?? byNext.get(s.title);

  const mainIdx = rows.findIndex((r) => r.subs.includes('Main'));
  const mainLen = mainIdx >= 0 ? rows[mainIdx].stages.length : 0;
  const col = new Map<string, number>();
  if (mainIdx >= 0) rows[mainIdx].stages.forEach((s, i) => col.set(s.title, i));

  rows.forEach((r, ri) => {
    if (ri === mainIdx) return;
    const inRow = new Set(r.stages.map((s) => s.title));
    const chains: Stage[][] = [];
    r.stages.forEach((s) => {
      const p = parentOf(s);
      const chain = p && inRow.has(p) ? chains.find((c) => c[c.length - 1].title === p) : undefined;
      if (chain) chain.push(s); else chains.push([s]);
    });
    let cursor = mainLen ? 0.5 : 0;
    chains.forEach((chain) => {
      const p = parentOf(chain[0]);
      const pc = p !== undefined ? col.get(p) : undefined;
      let start = cursor;
      if (pc !== undefined) {
        const maxStart = Math.max(0, mainLen - chain.length) + 0.5;
        start = Math.max(cursor, Math.min(pc + 0.5, maxStart));
      }
      chain.forEach((s, i) => col.set(s.title, start + i));
      cursor = start + chain.length;
    });
  });

  const placed: Placed[] = [];
  rows.forEach((r, ri) => r.stages.forEach((s) => {
    const c = col.get(s.title) ?? 0;
    placed.push({ stage: s, row: ri, col: c, x: GUTTER + PAD + c * CELL_W, y: PAD + ri * ROW_H });
  }));

  const byTitle = new Map(placed.map((p) => [p.stage.title, p]));
  const seen = new Set<string>();
  const edges: [Placed, Placed][] = [];
  const link = (from?: Placed, to?: Placed) => {
    if (!from || !to || from === to) return;
    const k = `${from.stage.title}>${to.stage.title}`;
    if (seen.has(k)) return;
    seen.add(k);
    edges.push([from, to]);
  };
  placed.forEach((p) => {
    parentsOf(p.stage).forEach((title) => link(byTitle.get(title), p));
    if (p.stage.next) link(p, byTitle.get(p.stage.next));
  });

  const maxRight = Math.max(0, ...placed.map((p) => p.x + ICON + BANNER_W - OVERLAP));
  return {
    placed,
    edges,
    lanes: rows.map((r, ri) => ({ label: r.label, y: PAD + ri * ROW_H, tint: TINT[r.subs[0]] })),
    width: maxRight + PAD,
    height: PAD * 2 + rows.length * ROW_H - (ROW_H - ICON),
  };
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (ctx.measureText(`${text.slice(0, mid)}…`).width <= max) lo = mid; else hi = mid - 1;
  }
  return `${text.slice(0, lo)}…`;
}

export default function StageGrid({ stages, selected, onSelect }: Props) {
  useTranslationVersion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<string>('');
  const imagesRef = useRef<Record<string, HTMLImageElement>>({});
  const [imgReady, setImgReady] = useState(0);

  useEffect(() => {
    Object.values(STAGE_ICON_SRC).forEach((src) => {
      if (imagesRef.current[src]) return;
      const img = new window.Image();
      img.src = src;
      img.onload = () => setImgReady((n) => n + 1);
      imagesRef.current[src] = img;
    });
  }, []);

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { placed, edges, lanes, width, height } = layout(stages);

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const rr = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };

    lanes.forEach((lane) => {
      const top = lane.y - (ROW_H - ICON) / 2 + 4;
      const h = ROW_H - 8;
      ctx.save();
      rr(4, top, width - 8, h, 12);
      ctx.fillStyle = `${lane.tint}0d`;
      ctx.fill();
      ctx.fillStyle = lane.tint;
      ctx.globalAlpha = 0.55;
      rr(4, top, 3, h, 1.5);
      ctx.fill();
      ctx.globalAlpha = 0.8;
      ctx.translate(GUTTER / 2 + 4, top + h / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.font = '700 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lane.label, 0, 0);
      ctx.restore();
    });

    const cx = (p: Placed) => p.x + ICON / 2;
    const cy = (p: Placed) => p.y + ICON / 2;
    const isActive = (p: Placed) => p.stage.title === selected || p.stage.title === hover;

    edges.forEach(([a, b]) => {
      const hot = isActive(a) || isActive(b);
      ctx.save();
      ctx.lineWidth = hot ? 2.5 : 2;
      ctx.strokeStyle = hot ? ACCENT[300] : 'rgba(255,255,255,0.22)';
      ctx.beginPath();
      ctx.moveTo(cx(a), cy(a));
      if (a.row === b.row) {
        ctx.lineTo(cx(b), cy(b));
      } else {
        ctx.setLineDash([5, 4]);
        const mid = (cy(a) + cy(b)) / 2;
        ctx.bezierCurveTo(cx(a), mid, cx(b), mid, cx(b), cy(b));
      }
      ctx.stroke();
      ctx.restore();
    });

    placed.forEach((p) => {
      const { stage, x, y } = p;
      const isSel = stage.title === selected;
      const isHover = stage.title === hover;
      const tint = TINT[stage.subtype] ?? TINT.Main;
      const bx = x + ICON - OVERLAP;
      const by = y + (ICON - BANNER_H) / 2;

      ctx.save();
      rr(bx, by, BANNER_W, BANNER_H, 7);
      ctx.fillStyle = 'rgb(16,21,33)';
      ctx.fill();
      const grad = ctx.createLinearGradient(bx, by, bx, by + BANNER_H);
      grad.addColorStop(0, isSel ? `${ACCENT[300]}40` : 'rgba(30,38,56,0.96)');
      grad.addColorStop(1, isSel ? `${ACCENT[300]}26` : 'rgba(16,21,33,0.96)');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.lineWidth = isSel ? 2 : 1;
      ctx.strokeStyle = isSel ? ACCENT[300] : isHover ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.14)';
      ctx.stroke();
      ctx.clip();
      ctx.fillStyle = tint;
      ctx.globalAlpha = isSel ? 0.9 : 0.6;
      ctx.fillRect(bx, by + BANNER_H - 2, BANNER_W, 2);
      ctx.restore();

      const name = t(stage.name) || stage.title;
      const textL = x + ICON + 6;
      const textR = bx + BANNER_W - 8;
      ctx.save();
      ctx.font = '600 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isSel ? ACCENT[200] : tokens.color.text;
      ctx.fillText(ellipsize(ctx, name, textR - textL), textL, by + BANNER_H / 2 - 1);
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.arc(x + ICON / 2, y + ICON / 2, ICON / 2 + 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(10,14,22,0.85)';
      ctx.fill();
      ctx.lineWidth = isSel ? 3 : 1.5;
      ctx.strokeStyle = isSel ? ACCENT[300] : isHover ? 'rgba(255,255,255,0.7)' : `${tint}99`;
      if (isSel) {
        ctx.shadowColor = ACCENT[300];
        ctx.shadowBlur = 12;
      }
      ctx.stroke();
      ctx.restore();

      const iconSrc = STAGE_ICON_SRC[stage.subtype] ?? STAGE_ICON_SRC.Main;
      const img = imagesRef.current[iconSrc];
      const grow = isHover && !isSel ? 2 : 0;
      if (img && img.complete && img.naturalWidth) {
        ctx.drawImage(img, x - grow, y - grow, ICON + grow * 2, ICON + grow * 2);
      }

      const label = stage.title;
      ctx.save();
      ctx.font = `bold ${label.length > 5 ? 10 : label.length > 4 ? 11 : 13}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.strokeText(label, x + ICON / 2, y + ICON - 9);
      ctx.fillStyle = '#fff';
      ctx.fillText(label, x + ICON / 2, y + ICON - 9);
      ctx.restore();
    });
  }

  function hitTest(mx: number, my: number): string {
    for (const p of layout(stages).placed) {
      const right = p.x + ICON + (BANNER_W - OVERLAP);
      if (mx >= p.x - 3 && mx <= right && my >= p.y - 3 && my <= p.y + ICON + 3) return p.stage.title;
    }
    return '';
  }

  // `maxWidth: 100%` can scale the canvas, so map the pointer back into layout coordinates.
  function toLocal(e: React.MouseEvent): [number, number] {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const { width, height } = layout(stages);
    return [(e.clientX - rect.left) * (width / rect.width), (e.clientY - rect.top) * (height / rect.height)];
  }

  useEffect(draw, [stages, selected, hover, imgReady]);   // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <canvas
      ref={canvasRef}
      style={{ cursor: hover ? 'pointer' : 'default', display: 'block' }}
      onClick={(e) => {
        const hit = hitTest(...toLocal(e));
        if (hit) onSelect(hit);
      }}
      onMouseMove={(e) => setHover(hitTest(...toLocal(e)))}
      onMouseLeave={() => setHover('')}
    />
  );
}
