import { useEffect, useRef } from 'react';

// Canvas render of a skill's area of effect as TWO stacked, skewed 3x3 grids.
// The whole grid is skewed (skewX) so the CELLS themselves shear into
// parallelograms — one cohesive leaning shape, like the original CSS
// `transform: skewX(-10deg)` table. Cell numbering is row-major from the TOP
// (phone-keypad): 1-3 = top/back row, 7-9 = bottom/front row, center = cell 5
// (verified in-game: Salamancer A2 hits cells 2/3/5/6 = numpad 8/9/5/6).
//   - base grid: all 9 cells dark, center highlighted teal
//   - AoE grid: the hit cells (colored by damage), offset to the LEFT of center
interface Props {
  area: number[];
  center: number;
  size?: number;   // cell size in px
}

const SKEW = 0.26;   // skewX amount (rightward lean)

export default function SkillArea({ area, center, size = 28 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gap = 4;
    const grid = size * 3 + gap * 2;
    const off = Math.round(size * 0.1);           // AoE layer offset (left + up)
    const skewPad = Math.ceil(grid * SKEW);
    const w = grid + skewPad + off + 4;
    const h = grid + off + 4;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    // local cell rect (axis-aligned); the skew transform shears it.
    const cellRect = (i: number) => {
      const col = (i - 1) % 3;
      const row = Math.floor((i - 1) / 3);        // 0 top .. 2 bottom (cells 1-3 = top)
      return { x: col * (size + gap), y: row * (size + gap) };
    };

    // draw one 3x3 grid at (originX, originY) under a skewX shear
    const drawGrid = (
      originX: number, originY: number,
      fill: (i: number) => string | null,
      stroke: string,
    ) => {
      ctx.save();
      // skewX: x' = x + SKEW*(gridHeight - y) so upper rows shift further right
      ctx.transform(1, 0, -SKEW, 1, originX + grid * SKEW, originY);
      for (let i = 1; i <= 9; i++) {
        const c = fill(i);
        if (!c) continue;
        const { x, y } = cellRect(i);
        roundRect(ctx, x, y, size, size, 5);
        ctx.fillStyle = c;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = stroke;
        ctx.stroke();
      }
      ctx.restore();
    };

    // base grid (lower)
    drawGrid(off, off, (i) => (center === i ? 'rgb(34,160,160)' : 'rgb(46,50,58)'),
      'rgba(255,255,255,0.06)');

    // AoE grid offset to the LEFT (and up) of the base, hit cells only
    drawGrid(0, 0, (i) => {
      const rate = area[i - 1] ?? 0;
      if (rate <= 0) return null;
      const g = Math.max(0, Math.min(255, Math.round(((200 - 128) / 0.5) * (rate - 0.5) + 128)));
      return `rgba(220, ${g}, 0, 0.92)`;
    }, 'rgba(0,0,0,0.4)');
  }, [area, center, size]);

  return <canvas ref={ref} style={{ display: 'block' }} />;
}

function roundRect(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
