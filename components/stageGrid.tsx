import { useEffect, useRef, useState } from 'react';
import { Stage, StageSubType } from '@/interfaces/world';
import { t } from '@/lib/strings';

// Canvas-rendered stage map. Stages are laid out in rows by subtype
// (Side / Main / Ex), ordered by `pos` within each row. Each stage is a small
// icon sitting over a short banner that carries the stage name. Progression
// links (`next`) are drawn as connector lines behind the icons. Click selects a
// stage; hover highlights it. Fixed cell size with horizontal scroll.

const ICON = 40;          // stage icon size (px) — smaller than the cell
const BANNER_H = 28;       // banner height (px)
const BANNER_W = 120;      // banner width (px)
const OVERLAP = 16;        // how much the icon overlaps the banner's left end
const CELL_W = ICON + BANNER_W - OVERLAP + 24;   // horizontal cell pitch
const ROW_H = 70;          // vertical row pitch
const PAD = 20;            // canvas padding

// Row order (top -> bottom) and the subtypes each row holds.
const ROWS: StageSubType[][] = [["Side"], ["Main", "Story"], ["Ex"]];

// Side and Ex rows are shifted half a cell to the right so they sit between the
// Main stages rather than directly above/below them.
const ROW_X_OFFSET = [CELL_W / 2, 0, CELL_W / 2];

// Stage-map icon art per subtype (the art from the old version).
const ICON_SRC: Record<StageSubType, string> = {
  Side: "/images/SideStage.png",
  Main: "/images/Main_Stage.png",
  Ex: "/images/EX_Stage.png",
  Story: "/images/StoryStage.png",
};

interface Placed {
  stage: Stage;
  x: number;   // tile top-left
  y: number;
}

interface Props {
  stages: Stage[];
  selected: string;                 // selected stage title
  onSelect: (title: string) => void;
}

export default function StageGrid({ stages, selected, onSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<string>("");
  const imagesRef = useRef<Record<string, HTMLImageElement>>({});
  const [imgReady, setImgReady] = useState(0);   // bump to trigger redraw on load

  // preload the subtype icons once
  useEffect(() => {
    Object.values(ICON_SRC).forEach((src) => {
      if (imagesRef.current[src]) return;
      const img = new window.Image();
      img.src = src;
      img.onload = () => setImgReady((n) => n + 1);
      imagesRef.current[src] = img;
    });
  }, []);

  // Lay stages into rows. Each ROW band gets the stages whose subtype is in it,
  // ordered by pos; Side/Ex rows are nudged right by ROW_X_OFFSET. `x`/`y` is the
  // icon top-left. Returns placements + canvas dimensions.
  function layout(): { placed: Placed[]; width: number; height: number } {
    const placed: Placed[] = [];
    let maxRight = 0;
    ROWS.forEach((subs, row) => {
      const inRow = stages
        .filter((s) => subs.includes(s.subtype))
        .sort((a, b) => a.pos - b.pos);
      inRow.forEach((stage, col) => {
        const x = PAD + ROW_X_OFFSET[row] + col * CELL_W;
        placed.push({ stage, x, y: PAD + row * ROW_H });
        maxRight = Math.max(maxRight, x + ICON + (BANNER_W - OVERLAP));
      });
    });
    const width = maxRight + PAD;
    const height = PAD * 2 + ROWS.length * ROW_H - (ROW_H - ICON);
    return { placed, width, height };
  }

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { placed, width, height } = layout();

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const byTitle = new Map(placed.map((p) => [p.stage.title, p]));
    const cx = (p: Placed) => p.x + ICON / 2;     // icon center
    const cy = (p: Placed) => p.y + ICON / 2;

    // connectors first (behind everything), icon-center to icon-center
    ctx.strokeStyle = "rgba(255,255,255,0.30)";
    ctx.lineWidth = 2;
    placed.forEach((p) => {
      const nxt = p.stage.next && byTitle.get(p.stage.next);
      if (!nxt) return;
      ctx.beginPath();
      ctx.moveTo(cx(p), cy(p));
      ctx.lineTo(cx(nxt), cy(nxt));
      ctx.stroke();
    });

    // rounded-rect helper
    const rr = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };

    placed.forEach((p) => {
      const { stage, x, y } = p;
      const isSel = stage.title === selected;
      const isHover = stage.title === hover;

      // banner sits to the right, its left end tucked under the icon
      const bx = x + ICON - OVERLAP;
      const by = y + (ICON - BANNER_H) / 2;

      // banner background (drawn before the icon so the icon overlaps it)
      ctx.save();
      rr(bx, by, BANNER_W, BANNER_H, 6);
      ctx.fillStyle = isSel ? "rgba(255,212,0,0.20)" : "rgba(18,20,26,0.92)";
      ctx.fill();
      ctx.lineWidth = isSel ? 2 : 1;
      ctx.strokeStyle = isSel ? "#ffd400" : isHover ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.18)";
      ctx.stroke();
      ctx.restore();

      // stage name on the banner (clipped to the visible area right of the icon)
      const name = t(stage.name) || stage.title;
      const textL = x + ICON + 6;                 // start clear of the icon's right edge
      const textR = bx + BANNER_W - 8;
      ctx.save();
      ctx.beginPath();
      ctx.rect(textL, by, textR - textL, BANNER_H);
      ctx.clip();
      ctx.font = "600 12px sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = isSel ? "#ffe680" : "#e8eaed";
      ctx.fillText(name, textL + 4, by + BANNER_H / 2);
      ctx.restore();

      // selection / hover ring behind the icon
      if (isSel || isHover) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x + ICON / 2, y + ICON / 2, ICON / 2 + 3, 0, Math.PI * 2);
        ctx.fillStyle = isSel ? "rgba(255,212,0,0.30)" : "rgba(255,255,255,0.16)";
        ctx.fill();
        if (isSel) {
          ctx.lineWidth = 3;
          ctx.strokeStyle = "#ffd400";
          ctx.shadowColor = "#ffd400";
          ctx.shadowBlur = 10;
          ctx.stroke();
        }
        ctx.restore();
      }

      // stage-map icon art: story (no-battle) stages always get the Story icon,
      // otherwise use the subtype's art
      const iconSrc = stage.waves.length ? (ICON_SRC[stage.subtype] ?? ICON_SRC.Main) : ICON_SRC.Story;
      const img = imagesRef.current[iconSrc];
      if (img && img.complete && img.naturalWidth) {
        ctx.drawImage(img, x, y, ICON, ICON);
      }

      // stage label (e.g. "12-1", "Ev-1B") centered on the icon
      const label = stage.title;
      ctx.font = `bold ${label.length > 4 ? 11 : 13}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0,0,0,0.8)";
      ctx.strokeText(label, x + ICON / 2, y + ICON - 9);
      ctx.fillStyle = "#fff";
      ctx.fillText(label, x + ICON / 2, y + ICON - 9);
    });
  }

  // hit-test a mouse position to a stage title (icon OR its banner)
  function hitTest(mx: number, my: number): string {
    const { placed } = layout();
    for (const p of placed) {
      const left = p.x;
      const right = p.x + ICON + (BANNER_W - OVERLAP);
      const top = p.y + (ICON - BANNER_H) / 2;
      const bottom = top + Math.max(ICON, BANNER_H);
      if (mx >= left && mx <= right && my >= p.y && my <= Math.max(p.y + ICON, bottom)) {
        return p.stage.title;
      }
    }
    return "";
  }

  function toLocal(e: React.MouseEvent): [number, number] {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    // The canvas may be scaled down by `maxWidth: 100%`, so its displayed size
    // (rect) differs from its layout coordinate size. Map the pointer back into
    // layout coordinates so hit-testing lines up with what's drawn.
    const { width: layoutW, height: layoutH } = layout();
    const sx = layoutW / rect.width;
    const sy = layoutH / rect.height;
    return [(e.clientX - rect.left) * sx, (e.clientY - rect.top) * sy];
  }

  useEffect(draw, [stages, selected, hover, imgReady]);   // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <canvas
      ref={canvasRef}
      style={{ cursor: hover ? "pointer" : "default", maxWidth: "100%" }}
      onClick={(e) => {
        const hit = hitTest(...toLocal(e));
        if (hit) onSelect(hit);
      }}
      onMouseMove={(e) => setHover(hitTest(...toLocal(e)))}
      onMouseLeave={() => setHover("")}
    />
  );
}
