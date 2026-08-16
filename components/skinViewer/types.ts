// Types + pure helpers shared by the PixiJS skin viewers.

// A sprite's tight mesh drawn against a shared atlas texture.
export type Mesh = {
  tex: string; // atlas PNG filename
  verts: number[]; // pixel-local, pivot at origin (+y down)
  uvs: number[]; // top-left-origin normalized
  indices: number[];
};
export type SpriteInfo = Mesh & {
  order: number;
  enabled: boolean;
  flipX: boolean;
  flipY: boolean;
  color?: [number, number, number, number]; // m_Color [r,g,b,a] when non-white
  shader?: 'multiply' | 'add' | 'screen' | 'mask'; // non-default Unity material
  rplus?: Mesh; // R+ twin
  kr?: Mesh;    // KR-censored variant
  sfw?: Mesh;   // Google Play SFW variant
};
export type SkinNode = {
  id: string; // stable GameObject id (toggles reference these)
  name: string;
  pos: [number, number];
  scale: [number, number];
  rot: [number, number, number, number]; // quaternion xyzw
  active: boolean;
  sprite?: SpriteInfo;
  children: SkinNode[];
  faceAnchor?: boolean; // empty face node — overlay the chosen face mesh here
  faceOrder?: number;   // sorting order for the face overlay
};
// A fixed-model face expression overlay (mesh against its own face PNG).
export type FixedFace = { key: string; tex: string; verts: number[]; uvs: number[]; indices: number[] };
// An in-game parts/costume toggle: shows/hides a set of nodes (ActorPartsView).
// kind "swap": mutually exclusive — swapOn visible when ON, swapOff when OFF.
export type Toggle = { key: string; default: boolean } & (
  | { kind?: undefined; members: string[] }
  | { kind: 'swap'; swapOn: string[]; swapOff: string[] }
);
export type SpineActor = {
  id: string;
  name: string;
  active: boolean;
  skel: string;
  atlas: string;
  spine?: string;
  animations?: string[];
  skins?: string[];
  skinGroups?: { base?: string; faces?: string[]; parts?: string[]; defaultFace?: string };
  animator?: Layout['animator'];
  world: { x: number; y: number; scale: number; dataScale?: number };
};
export type Layout = {
  skin: string;
  kind: string; // "fixed" | "spine"
  ppu: number;
  nodes?: SkinNode[]; // fixed
  faces?: FixedFace[]; // fixed: optional face-expression overlays (default = none)
  toggles?: Toggle[];
  // spine case (export_spine.py): Spine runtime assets + metadata.
  skel?: string; atlas?: string; animations?: string[]; skins?: string[];
  actors?: SpineActor[]; // multi-SkeletonMecanim bundles; absent for the common single-actor case
  skinGroups?: { base?: string; faces?: string[]; parts?: string[]; defaultFace?: string };
  sfw?: { textures?: Record<string, string>; atlas?: string; skel?: string };
  animator?: {
    states: Record<string, { name: string; clip: string | null; loop: boolean; exit: number | null }>;
    default: number;
    triggers: Record<string, Record<string, number>>;
  };
  world?: {
    skeleton?: { x: number; y: number; scale: number; dataScale?: number };
    bg?: { tex: string; x: number; y: number; w: number; h: number };
    zones?: { key: string; x: number; y: number; w: number; h: number; rot?: number; anims: string[] }[];
  };
};

// region-diverged skins are packed as two archives (<key>__global / <key>__kr,
// see tools/skin_test/pack.py) but layout.json's embedded `skin` field always
// carries the bare, un-suffixed key (the exporter doesn't know about regions) —
// strip the suffix before comparing so the stale-layout guard doesn't always
// reject a freshly loaded diverged skin.
export function baseSkinKey(skin: string): string {
  return skin.replace(/__(global|kr)$/, '');
}

// whether any fixed-skin node has a given variant key (rplus / kr / sfw)
export function layoutHasVariant(layout: Layout, key: 'rplus' | 'kr' | 'sfw'): boolean {
  if (layout.kind !== 'fixed') return false;
  const walk = (n: SkinNode): boolean =>
    !!n.sprite?.[key] || n.children.some(walk);
  return (layout.nodes ?? []).some(walk);
}

// Z rotation (radians) from a Unity quaternion — fixed-skin nodes are 2D, so
// only the z component of the rotation matters.
export function zAngle(q: [number, number, number, number]): number {
  const [x, y, z, w] = q;
  return Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z));
}

// Largest root-local distance covered by one source-texture pixel for a mesh.
// Sprite meshes can have a pixels-per-unit ratio that compensates for very
// large Unity transforms, so transform scale alone is not a native-resolution
// measurement. Measure every non-degenerate triangle because weighted Spine
// meshes can have a different affine mapping across the current pose.
export function mappedSourcePixelScale(
  verts: ArrayLike<number>,
  uvs: ArrayLike<number>,
  indices: ArrayLike<number>,
  textureWidth: number,
  textureHeight: number,
  transform: { a: number; b: number; c: number; d: number },
): number {
  let maxScale = 0;
  for (let i = 0; i + 2 < indices.length; i += 3) {
    const i0 = indices[i] * 2, i1 = indices[i + 1] * 2, i2 = indices[i + 2] * 2;
    const sx1 = (uvs[i1] - uvs[i0]) * textureWidth;
    const sy1 = (uvs[i1 + 1] - uvs[i0 + 1]) * textureHeight;
    const sx2 = (uvs[i2] - uvs[i0]) * textureWidth;
    const sy2 = (uvs[i2 + 1] - uvs[i0 + 1]) * textureHeight;
    const det = sx1 * sy2 - sx2 * sy1;
    if (Math.abs(det) < 1e-8) continue;

    const vx1 = verts[i1] - verts[i0], vy1 = verts[i1 + 1] - verts[i0 + 1];
    const vx2 = verts[i2] - verts[i0], vy2 = verts[i2 + 1] - verts[i0 + 1];
    const dx1 = transform.a * vx1 + transform.c * vy1;
    const dy1 = transform.b * vx1 + transform.d * vy1;
    const dx2 = transform.a * vx2 + transform.c * vy2;
    const dy2 = transform.b * vx2 + transform.d * vy2;

    // [dx1 dx2; dy1 dy2] * inverse([sx1 sx2; sy1 sy2])
    const a = (dx1 * sy2 - dx2 * sy1) / det;
    const c = (-dx1 * sx2 + dx2 * sx1) / det;
    const b = (dy1 * sy2 - dy2 * sy1) / det;
    const d = (-dy1 * sx2 + dy2 * sx1) / det;
    const sumSq = a * a + b * b + c * c + d * d;
    const mapDet = a * d - b * c;
    const discriminant = Math.max(0, sumSq * sumSq - 4 * mapDet * mapDet);
    maxScale = Math.max(
      maxScale,
      Math.sqrt((sumSq + Math.sqrt(discriminant)) / 2),
    );
  }
  return maxScale;
}

export function meshSourcePixelScale(
  mesh: Mesh,
  textureWidth: number,
  textureHeight: number,
  transform: { a: number; b: number; c: number; d: number },
): number {
  return mappedSourcePixelScale(
    mesh.verts, mesh.uvs, mesh.indices, textureWidth, textureHeight, transform,
  );
}

// Wire wheel-zoom + drag-pan + two-finger pinch on a PixiJS canvas, panning/
// scaling `root` (and an optional `zoneLayer` kept in lockstep). Returns a
// cleanup that removes the listeners. Shared by the fixed and spine viewers.
export function attachPanZoom(canvas: HTMLCanvasElement, root: any, zoneLayer?: any): () => void {
  const pointers = new Map<number, { x: number; y: number }>();
  let dragging = false;
  let dragStart = { x: 0, y: 0 };
  let rootStart = { x: 0, y: 0 };
  let pinchDist0 = 0;
  let pinchScale0 = 1;
  let pinchMid = { x: 0, y: 0 };
  const applyScale = (factor: number, mx: number, my: number) => {
    const s = root.scale.x * factor;
    root.position.set(mx + (root.position.x - mx) * factor, my + (root.position.y - my) * factor);
    root.scale.set(s);
    if (zoneLayer) { zoneLayer.scale.set(s); zoneLayer.position.copyFrom(root.position); }
  };
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const rect = canvas.getBoundingClientRect();
    applyScale(factor, e.clientX - rect.left, e.clientY - rect.top);
  };
  const onPointerDown = (e: PointerEvent) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const pts = Array.from(pointers.values());
      pinchDist0 = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      pinchScale0 = root.scale.x;
      const rect = canvas.getBoundingClientRect();
      pinchMid = { x: (pts[0].x + pts[1].x) / 2 - rect.left, y: (pts[0].y + pts[1].y) / 2 - rect.top };
      dragging = false;
    } else if (pointers.size === 1) {
      dragging = false;
      dragStart = { x: e.clientX, y: e.clientY };
      rootStart = { x: root.position.x, y: root.position.y };
    }
  };
  const onPointerMove = (e: PointerEvent) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const pts = Array.from(pointers.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      if (pinchDist0 > 0) {
        const s = (pinchScale0 * dist) / pinchDist0;
        const factor = s / root.scale.x;
        applyScale(factor, pinchMid.x, pinchMid.y);
      }
      return;
    }
    if (e.buttons === 0) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    if (!dragging && Math.hypot(dx, dy) < 4) return;
    dragging = true;
    root.position.set(rootStart.x + dx, rootStart.y + dy);
    if (zoneLayer) zoneLayer.position.copyFrom(root.position);
  };
  const onPointerUp = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    if (pointers.size < 2) { pinchDist0 = 0; dragging = false; }
    if (pointers.size === 1) {
      const pt = pointers.values().next().value as { x: number; y: number };
      dragStart = { x: pt.x, y: pt.y };
      rootStart = { x: root.position.x, y: root.position.y };
    }
  };
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  return () => {
    canvas.removeEventListener('wheel', onWheel);
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerUp);
  };
}

// Only straight compositing may write coverage. The canvas is premultiplied and
// transparent, so the page shows `canvas.rgb + page.rgb * (1 - canvas.a)`: a
// light/tint blend has to change rgb and leave alpha alone, which reproduces what
// Unity gets against its opaque camera target and makes a zero-contribution draw a
// true no-op. Pixi ships `add` as the two-argument `blendFunc(ONE, ONE)`, so its
// alpha accumulates and an emitter the animation has tinted to black paints opaque
// black; `multiply` and `screen` write coverage too and blacken the empty canvas
// they extend over.
export function fixBlendAlpha(renderer: unknown) {
  const gl = (renderer as { gl?: WebGLRenderingContext })?.gl;
  const map = (renderer as { state?: { blendModesMap?: Record<string, number[]> } })
    ?.state?.blendModesMap;
  if (!gl || !map) return;
  for (const mode of ['add', 'add-npm', 'multiply', 'screen', 'screen-npm']) {
    const factors = map[mode];
    if (factors) map[mode] = [factors[0], factors[1], gl.ZERO, gl.ONE];
  }
}
