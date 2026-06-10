import { useEffect, useRef, useState } from 'react';
import { Stage, StageSubType } from '@/interfaces/world';

// Canvas-rendered stage map. Stages are laid out in rows by subtype
// (Side / Main / Ex), ordered by `pos` within each row. Progression links
// (`next`) are drawn as connector lines behind the tiles. Click selects a
// stage; hover highlights it. Fixed tile size with horizontal scroll.

const TILE = 72;          // tile size (px)
const GAP_X = 28;         // horizontal gap between tiles
const GAP_Y = 34;         // vertical gap between rows
const PAD = 20;           // canvas padding

// Row order (top -> bottom) and the subtypes each row holds.
const ROWS: StageSubType[][] = [["Side"], ["Main", "Story"], ["Ex"]];

// Stage-map tile icon per subtype (the art from the old version).
const ICON: Record<StageSubType, string> = {
  Side: "/images/Side Stage.png",
  Main: "/images/Main Stage.png",
  Ex: "/images/EX Stage.png",
  Story: "/images/Story Stage.png",
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

  // preload the subtype tile icons once
  useEffect(() => {
    Object.values(ICON).forEach((src) => {
      if (imagesRef.current[src]) return;
      const img = new window.Image();
      img.src = src;
      img.onload = () => setImgReady((n) => n + 1);
      imagesRef.current[src] = img;
    });
  }, []);

  // Lay stages into rows. Each ROW band gets the stages whose subtype is in it,
  // ordered by pos. Returns placements + canvas dimensions.
  function layout(): { placed: Placed[]; width: number; height: number } {
    const placed: Placed[] = [];
    let maxCols = 0;
    ROWS.forEach((subs, row) => {
      const inRow = stages
        .filter((s) => subs.includes(s.subtype))
        .sort((a, b) => a.pos - b.pos);
      maxCols = Math.max(maxCols, inRow.length);
      inRow.forEach((stage, col) => {
        placed.push({
          stage,
          x: PAD + col * (TILE + GAP_X),
          y: PAD + row * (TILE + GAP_Y),
        });
      });
    });
    const width = PAD * 2 + Math.max(1, maxCols) * (TILE + GAP_X) - GAP_X;
    const height = PAD * 2 + ROWS.length * (TILE + GAP_Y) - GAP_Y;
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

    // connectors first (behind tiles)
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 2;
    placed.forEach((p) => {
      const nxt = p.stage.next && byTitle.get(p.stage.next);
      if (!nxt) return;
      ctx.beginPath();
      ctx.moveTo(p.x + TILE / 2, p.y + TILE / 2);
      ctx.lineTo(nxt.x + TILE / 2, nxt.y + TILE / 2);
      ctx.stroke();
    });

    // tiles
    placed.forEach((p) => {
      const { stage, x, y } = p;
      const isSel = stage.title === selected;
      const isHover = stage.title === hover;

      // selection / hover highlight ring behind the icon
      if (isSel || isHover) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x + TILE / 2, y + TILE / 2, TILE / 2 + 4, 0, Math.PI * 2);
        ctx.fillStyle = isSel ? "rgba(255,212,0,0.30)" : "rgba(255,255,255,0.18)";
        ctx.fill();
        if (isSel) {
          ctx.lineWidth = 3;
          ctx.strokeStyle = "#ffd400";
          ctx.shadowColor = "#ffd400";
          ctx.shadowBlur = 12;
          ctx.stroke();
        }
        ctx.restore();
      }

      // stage-map icon art for this subtype
      const img = imagesRef.current[ICON[stage.subtype] ?? ICON.Main];
      if (img && img.complete && img.naturalWidth) {
        ctx.drawImage(img, x, y, TILE, TILE);
      }

      // stage number (strip the chapter prefix, keep the "-N" part if present)
      const label = stage.title.includes("-")
        ? stage.title.slice(stage.title.indexOf("-") + 1)
        : stage.title;
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // readable on any art: dark outline + white fill
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0,0,0,0.75)";
      ctx.strokeText(label, x + TILE / 2, y + TILE - 12);
      ctx.fillStyle = "#fff";
      ctx.fillText(label, x + TILE / 2, y + TILE - 12);
    });
  }

  // hit-test a mouse position to a stage title
  function hitTest(mx: number, my: number): string {
    const { placed } = layout();
    for (const p of placed) {
      if (mx >= p.x && mx <= p.x + TILE && my >= p.y && my <= p.y + TILE) {
        return p.stage.title;
      }
    }
    return "";
  }

  function toLocal(e: React.MouseEvent): [number, number] {
    const rect = canvasRef.current!.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
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
