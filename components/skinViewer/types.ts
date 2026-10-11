import { mappedSourcePixelScale } from '@altterisk/game-hub/spine';
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
// An ActorPartsView toggle. kind "swap": swapOn visible when ON, swapOff when OFF.
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

// layout.json's embedded `skin` is always the bare key, so strip any region suffix
// before comparing, or the stale-layout guard rejects a freshly loaded diverged skin.
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

// Fixed-skin nodes are 2D, so only the z component of the rotation matters.
export function zAngle(q: [number, number, number, number]): number {
  const [x, y, z, w] = q;
  return Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z));
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
