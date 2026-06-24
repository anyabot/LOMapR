/**
 * Skin viewer: loads a packed skin archive (<skin>.tar.br, see tools/skin_test/
 * pack.py) and composes it with PixiJS. Three layout kinds:
 *   - "fixed"        (export_skin.py): a Unity transform tree of sprite parts;
 *                     rebuilt as a Container tree so parent offsets compose.
 *                     Supports the R+ variant and ActorPartsView part toggles.
 *   - "spine"         (export_spine.py): a Spine 4.x runtime skeleton.
 *   - "skinned-anim"  (export_skin_anim.py): old self-rigged bones + per-vertex
 *                     skinning + clips, CPU-skinned each frame.
 *
 * Shared by pages/skin-viewer.tsx (standalone dev page) and the unit-detail
 * Skin tab (components/enemyTab-style per-unit embed).
 */
import { useEffect, useRef, useState } from 'react';
import { Box, Center, HStack, Image, Select, Spinner, Switch, Text, Tooltip, VStack } from '@chakra-ui/react';
import { loadSkinArchive, revokeSkinUrls, readText, loadTexture, urlFor } from '../lib/skinArchive';

// Icon-button used in the canvas overlay panel (top-right / bottom-right).
// `active` = highlighted/full-opacity; `inactive` = dimmed with slash.
function IconBtn({ src, alt, label, active, onClick, placement = 'left' }: {
  src: string; alt: string; label: string; active: boolean;
  onClick: () => void; placement?: 'left' | 'top';
}) {
  return (
    <Tooltip label={label} fontSize="xs" hasArrow placement={placement}>
      <Box as="button" onClick={onClick} position="relative" boxSize="36px"
        opacity={active ? 1 : 0.4} transition="opacity 0.15s"
        _hover={{ opacity: active ? 0.8 : 0.65 }}>
        <Image src={src} alt={alt} boxSize="36px" objectFit="contain" />
        {!active && (
          <Box position="absolute" inset={0} display="flex" alignItems="center" justifyContent="center" pointerEvents="none">
            <Box w="80%" h="2px" bg="red.400" transform="rotate(-45deg)" borderRadius="full" />
          </Box>
        )}
      </Box>
    </Tooltip>
  );
}

// A sprite's tight mesh drawn against a shared atlas texture.
type Mesh = {
  tex: string; // atlas PNG filename
  verts: number[]; // pixel-local, pivot at origin (+y down)
  uvs: number[]; // top-left-origin normalized
  indices: number[];
};
type SpriteInfo = Mesh & {
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
type SkinNode = {
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
type FixedFace = { key: string; tex: string; verts: number[]; uvs: number[]; indices: number[] };
// An in-game parts/costume toggle: shows/hides a set of nodes (ActorPartsView).
// kind "swap": mutually exclusive — swapOn visible when ON, swapOff when OFF.
type Toggle = { key: string; default: boolean } & (
  | { kind?: undefined; members: string[] }
  | { kind: 'swap'; swapOn: string[]; swapOff: string[] }
);
// Skinned-mesh case: a flat list of meshes drawn against shared atlases, in
// sorting order. (Bind pose — no skeleton transforms needed at rest.)
type SkinnedMesh = Mesh & { id: string; name: string; order: number; rplusTex?: string };
// Skinned-ANIM case (export_skin_anim.py): bones + per-vertex skinning + a clip.
type Bone = {
  name: string;
  parent: number; // index into bones, -1 = root
  t: [number, number, number];
  r: [number, number, number, number]; // quaternion xyzw
  s: [number, number, number];
};
type AnimMesh = {
  id: string; name: string; tex: string; order: number; rplusTex?: string;
  active?: boolean; // initial visibility (clips can toggle via active tracks)
  verts3: number[]; // mesh-local x,y,z per vertex
  uvs: number[];
  indices: number[];
  skin: number[]; // [w0,i0,w1,i1,w2,i2,w3,i3] per vertex (4 influences); i -> `bones`
  bones: number[]; // mesh blend-index -> skeleton bone index
  bindposes: number[][]; // inverse bind matrix (row-major 16) per mesh bone
  shapes?: Record<string, [number, number, number, number][]>; // chanIdx -> [vertIdx,dx,dy,dz][]
  shapeNames?: string[];
  shapeWeights?: number[]; // default weight per channel
  smrPath?: string;
};
type Clip = {
  name: string; fps: number; frameCount: number; loop?: boolean;
  tracks: { bone: number; attr: 't' | 'r' | 's'; frames: number[][] }[];
  blend?: Record<string, Record<string, number[]>>;
  active?: Record<string, number[]>;
};
// A clickable touch zone: rect [cx,cy,w,h] in px -> clip key to play.
type Zone = { name: string; rect: [number, number, number, number]; clip: string };
type Layout = {
  skin: string;
  kind: string; // "fixed" | "skinned" | "skinned-anim"
  ppu: number;
  nodes?: SkinNode[]; // fixed
  faces?: FixedFace[]; // fixed: optional face-expression overlays (default = none)
  toggles?: Toggle[];
  meshes?: (SkinnedMesh | AnimMesh)[]; // skinned / skinned-anim
  bones?: Bone[]; // skinned-anim
  clip?: Clip | null; // skinned-anim default (idle)
  clips?: Record<string, Clip>; // skinned-anim: idle + touch reactions
  zones?: Zone[]; // skinned-anim touch zones
  splines?: { ctrls: number[]; bones: number[] }[];
  // spine case (export_spine.py): Spine runtime assets + metadata.
  skel?: string; atlas?: string; animations?: string[]; skins?: string[];
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
// strip the suffix before comparing so the stale-layout guard below doesn't
// always reject a freshly loaded diverged skin.
function baseSkinKey(skin: string): string {
  return skin.replace(/__(global|kr)$/, '');
}

// whether any fixed-skin node has a given variant key (rplus / kr / sfw)
function layoutHasVariant(layout: Layout, key: 'rplus' | 'kr' | 'sfw'): boolean {
  if (layout.kind === 'fixed') {
    const walk = (n: SkinNode): boolean =>
      !!n.sprite?.[key] || n.children.some(walk);
    return (layout.nodes ?? []).some(walk);
  }
  if (key === 'rplus' && (layout.kind === 'skinned' || layout.kind === 'skinned-anim')) {
    return (layout.meshes ?? []).some((m) => !!(m as SkinnedMesh | AnimMesh).rplusTex);
  }
  return false;
}

function layoutHasRplus(layout: Layout): boolean {
  return layoutHasVariant(layout, 'rplus');
}

// --- 4x4 matrix math (row-major, column vectors) for skeletal skinning ------
type M16 = Float64Array;
function matMul(a: M16, b: M16): M16 {
  const r = new Float64Array(16);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++)
      r[i * 4 + j] = a[i * 4] * b[j] + a[i * 4 + 1] * b[4 + j] + a[i * 4 + 2] * b[8 + j] + a[i * 4 + 3] * b[12 + j];
  return r;
}
function matTRS(t: number[], q: number[], s: number[]): M16 {
  const [x, y, z, w] = q;
  const sx = s[0] || 1e-6, sy = s[1] || 1e-6, sz = s[2] || 1;
  const xx = x * x, yy = y * y, zz = z * z, xy = x * y, xz = x * z, yz = y * z, wx = w * x, wy = w * y, wz = w * z;
  return new Float64Array([
    (1 - 2 * (yy + zz)) * sx, 2 * (xy - wz) * sy, 2 * (xz + wy) * sz, t[0],
    2 * (xy + wz) * sx, (1 - 2 * (xx + zz)) * sy, 2 * (yz - wx) * sz, t[1],
    2 * (xz - wy) * sx, 2 * (yz + wx) * sy, (1 - 2 * (xx + yy)) * sz, t[2],
    0, 0, 0, 1,
  ]);
}
function catmull(p0: number[], p1: number[], p2: number[], p3: number[], t: number): number[] {
  const t2 = t * t, t3 = t2 * t;
  const out = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    out[i] = 0.5 * (
      2 * p1[i] +
      (-p0[i] + p2[i]) * t +
      (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 +
      (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3);
  }
  return out;
}
function catmullSample(pts: number[][], count: number): number[][] {
  const n = pts.length;
  if (n < 2) return pts.slice();
  const segs = n - 1;
  const res: number[][] = [];
  for (let i = 0; i < count; i++) {
    const u = count > 1 ? (i / (count - 1)) * segs : 0;
    const seg = Math.min(Math.floor(u), segs - 1);
    const t = u - seg;
    const p0 = pts[Math.max(seg - 1, 0)];
    const p1 = pts[seg];
    const p2 = pts[seg + 1];
    const p3 = pts[Math.min(seg + 2, n - 1)];
    res.push(catmull(p0, p1, p2, p3, t));
  }
  return res;
}
function slerp(a: number[], b: number[], f: number): number[] {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  const bb = d < 0 ? b.map((v) => -v) : b;
  d = Math.abs(d);
  if (d > 0.9995) return a.map((v, i) => v + (bb[i] - v) * f);
  const th = Math.acos(d), s = Math.sin(th);
  const wa = Math.sin((1 - f) * th) / s, wb = Math.sin(f * th) / s;
  return a.map((v, i) => v * wa + bb[i] * wb);
}
function zAngle(q: [number, number, number, number]): number {
  const [x, y, z, w] = q;
  return Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z));
}

function buildSkinnedAnim(
  PIXI: any, layout: Layout, root: any, textures: Record<string, any>,
  rplus: boolean, meshById: Record<string, any>,
  setTick: (fn: (t: number) => void) => void, _isPlaying: () => boolean, ppu: number,
  setPlayClip: (fn: (key: string) => void) => void,
) {
  const bones = layout.bones ?? [];
  const clips = layout.clips ?? (layout.clip ? { idle: layout.clip } : {});
  const meshes = (layout.meshes ?? []) as AnimMesh[];
  const splines = layout.splines ?? [];
  const restT = bones.map((b) => b.t);
  const restR = bones.map((b) => b.r);
  const restS = bones.map((b) => b.s);

  type Prepared = {
    clip: Clip;
    byBone: Record<number, { t?: number[][]; r?: number[][]; s?: number[][] }>;
    loopLen: number;
  };
  const prepared: Record<string, Prepared> = {};
  for (const [key, c] of Object.entries(clips)) {
    if (!c) continue;
    const byBone: Prepared['byBone'] = {};
    for (const tr of c.tracks) (byBone[tr.bone] ??= {})[tr.attr] = tr.frames;
    prepared[key] = { clip: c, byBone, loopLen: c.loop ? Math.max(1, c.frameCount - 1) : c.frameCount };
  }

  const order = bones.map((_, i) => i);
  order.sort((a, b) => depth(bones, a) - depth(bones, b));

  const parts = meshes.map((m) => {
    const tex = rplus && m.rplusTex ? m.rplusTex : m.tex;
    const nv = m.verts3.length / 3;
    const verts = new Float32Array(nv * 2);
    const mesh = new PIXI.MeshSimple({
      texture: textures[tex],
      vertices: verts,
      uvs: new Float32Array(m.uvs),
      indices: new Uint32Array(m.indices),
    });
    mesh.zIndex = m.order;
    meshById[m.id] = mesh;
    root.addChild(mesh);
    const morphed = new Float32Array(m.verts3.length);
    const nInf = m.skin.length / nv / 2;
    return { m, mesh, verts, morphed, nInf };
  });

  const world: M16[] = new Array(bones.length);

  let activeKey = 'idle' in prepared ? 'idle' : Object.keys(prepared)[0];
  let startT = 0;
  let lastT = 0;
  const FADE = 0.3;
  let fadeStart = -1;
  const snapT = bones.map((b) => b.t.slice());
  const snapR = bones.map((b) => b.r.slice());
  const snapS = bones.map((b) => b.s.slice());
  const startFade = () => { fadeStart = lastT; };
  setPlayClip((key: string) => {
    if (prepared[key] && key !== activeKey) { activeKey = key; startT = lastT; startFade(); }
  });

  const tick = (time: number) => {
    lastT = time;
    let p = prepared[activeKey];
    if (!p) return;
    let local = (time - startT) * p.clip.fps;
    if (p.clip.loop) {
      local %= p.loopLen;
    } else if (local >= p.clip.frameCount - 1) {
      const idle = 'idle' in prepared ? 'idle' : activeKey;
      if (idle !== activeKey) startFade();
      activeKey = idle;
      startT = time;
      p = prepared[activeKey];
      local = 0;
    }
    const fc = p.clip.frameCount;
    const f0 = Math.min(Math.floor(local), fc - 1);
    const f1 = p.clip.loop ? (f0 + 1) % fc : Math.min(f0 + 1, fc - 1);
    const lf = local - Math.floor(local);
    const byBone = p.byBone;

    let fade = fadeStart >= 0 ? (time - fadeStart) / FADE : 1;
    if (fade >= 1) { fade = 1; fadeStart = -1; }
    fade = fade * fade * (3 - 2 * fade);

    for (const i of order) {
      const tk = byBone[i];
      let t: number[] = restT[i], r: number[] = restR[i], s: number[] = restS[i];
      if (tk?.t) t = lerp3(tk.t[f0], tk.t[f1], lf);
      if (tk?.r) r = slerp(tk.r[f0], tk.r[f1], lf);
      if (tk?.s) s = lerp3(tk.s[f0], tk.s[f1], lf);
      if (fade < 1) {
        t = lerp3(snapT[i], t, fade);
        r = slerp(snapR[i], r, fade);
        s = lerp3(snapS[i], s, fade);
      }
      snapT[i] = t; snapR[i] = r; snapS[i] = s;
      const local2 = matTRS(t, r, s);
      const par = bones[i].parent;
      world[i] = par >= 0 && world[par] ? matMul(world[par], local2) : local2;
    }

    for (const sp of splines) {
      const pts = sp.ctrls.map((bi) => {
        const m = world[bi] || IDENTITY;
        return [m[3], m[7], m[11]];
      });
      const sampled = catmullSample(pts, sp.bones.length);
      for (let k = 0; k < sp.bones.length; k++) {
        const bi = sp.bones[k];
        const m = world[bi];
        if (!m) continue;
        m[3] = sampled[k][0]; m[7] = sampled[k][1]; m[11] = sampled[k][2];
      }
    }

    const blendByPath = p.clip.blend;
    const activeByMesh = p.clip.active;

    for (const { m, mesh, verts, morphed, nInf } of parts) {
      const act = activeByMesh?.[m.id];
      mesh.visible = act ? act[f0] !== 0 : (m.active ?? true);
      if (!mesh.visible) continue;
      const skin = m.skin, mb = m.bones, bp = m.bindposes;
      const sm: M16[] = mb.map((skelIdx, k) => {
        const bw = skelIdx >= 0 && world[skelIdx] ? world[skelIdx] : IDENTITY;
        return bp[k] ? matMul(bw, Float64Array.from(bp[k])) : bw;
      });
      const n = m.verts3.length / 3;

      morphed.set(m.verts3);
      if (m.shapes && m.shapeNames) {
        const animShapes = m.smrPath ? blendByPath?.[m.smrPath] : undefined;
        for (let ci = 0; ci < m.shapeNames.length; ci++) {
          const deltas = m.shapes[ci];
          if (!deltas) continue;
          const name = m.shapeNames[ci];
          const wframes = animShapes?.[name];
          const w = wframes
            ? wframes[f0] + (wframes[f1] - wframes[f0]) * lf
            : (m.shapeWeights?.[ci] ?? 0);
          if (Math.abs(w) < 1e-3) continue;
          const f = w / 100;
          for (const [vi, dx, dy, dz] of deltas) {
            morphed[vi * 3] += dx * f;
            morphed[vi * 3 + 1] += dy * f;
            morphed[vi * 3 + 2] += dz * f;
          }
        }
      }

      const stride = nInf * 2;
      for (let vi = 0; vi < n; vi++) {
        const x = morphed[vi * 3], y = morphed[vi * 3 + 1], z = morphed[vi * 3 + 2];
        let ax = 0, ay = 0;
        for (let k = 0; k < nInf; k++) {
          const w = skin[vi * stride + k * 2];
          if (w <= 0) continue;
          const bi = skin[vi * stride + k * 2 + 1];
          const M = sm[bi];
          if (!M) continue;
          const px = M[0] * x + M[1] * y + M[2] * z + M[3];
          const py = M[4] * x + M[5] * y + M[6] * z + M[7];
          ax += px * w; ay += py * w;
        }
        verts[vi * 2] = ax * ppu;
        verts[vi * 2 + 1] = -ay * ppu;
      }
      const buf = mesh.geometry.getBuffer('aPosition');
      buf.data = verts;
      buf.update();
    }
  };
  setTick(tick);
}

const IDENTITY: M16 = new Float64Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
function depth(bones: Bone[], i: number): number {
  let d = 0, p = bones[i].parent;
  while (p >= 0) { d++; p = bones[p].parent; }
  return d;
}
function lerp3(a: number[], b: number[], f: number): number[] {
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

// Unity WebGL iframe viewer for the old skinned-mesh animation rig (the 144
// skipped skins). The iframe loads /unity-viewer/?model=<skin> and communicates
// via postMessage. Model bundles are fetched by the Unity app at /models/<skin>
// relative to the iframe origin (NEXT_PUBLIC_UNITY_VIEWER_URL controls this).
const UNITY_VIEWER_BASE = (
  typeof process !== 'undefined'
    ? process.env.NEXT_PUBLIC_UNITY_VIEWER_URL ?? '/unity-viewer/'
    : '/unity-viewer/'
).replace(/\/$/, '');

function UnityViewer({ skin, height, parts, hasRplus, hasKr, hasBg, hasDam, showDam, onToggleDam }: {
  skin: string; height: string | number; parts: string[]; hasRplus?: boolean; hasKr?: boolean; hasBg?: boolean;
  hasDam?: boolean; showDam?: boolean; onToggleDam?: () => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [faceList, setFaceList] = useState<string[]>([]);
  const [hasParts, setHasParts] = useState(false);
  const [face, setFace] = useState('');
  const [showParts, setShowParts] = useState(true);
  const [showBg, setShowBg] = useState(true);
  const [showZones, setShowZones] = useState(false);
  const [variant, setVariant] = useState<string>('base');
  const [availableVariants, setAvailableVariants] = useState<string[]>([]);

  // base skin name without region suffix
  const baseSkin = skin.replace(/__kr$/, '');

  const send = (msg: object) => {
    iframeRef.current?.contentWindow?.postMessage(msg, '*');
  };

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== 'object') return;
      switch (e.data.type) {
        case 'facelist':
          setFaceList(e.data.data ?? []);
          setFace(''); // default: no face applied (its own option)
          break;
        case 'part': setHasParts(!!e.data.data); break;
        case 'variants': setAvailableVariants(e.data.data ?? []); break;
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  useEffect(() => {
    setFaceList([]); setHasParts(false); setAvailableVariants([]);
    setFace(''); setShowParts(true); setShowBg(true); setShowZones(false); setVariant('base');
  }, [skin]);

  useEffect(() => { send({ type: 'bg', active: showBg }); }, [skin, showBg]);
  useEffect(() => { send({ type: 'face', face }); }, [face]);
  useEffect(() => { send({ type: 'part', active: showParts }); }, [showParts]);
  useEffect(() => { send({ type: 'collider', active: showZones }); }, [showZones]);
  useEffect(() => {
    send({ type: 'variant', variant: variant === 'base' ? '' : variant });
  }, [variant]);

  const iframeSrc = `${UNITY_VIEWER_BASE}/index.html?model=${encodeURIComponent(baseSkin)}`;
  const faceName = face.replace(/^face\/.*_/, '');

  return (
    <Box>
      <Box h={height} bg="gray.800" borderRadius="md" overflow="hidden" position="relative"
        border="1px solid" borderColor="whiteAlpha.200">
        <Box
          as="iframe"
          ref={iframeRef}
          src={iframeSrc}
          position="absolute" inset={0} w="100%" h="100%"
          border="none"
          allow="autoplay"
          sx={{ colorScheme: 'none' }}
        />

        {/* Bottom-left: PARTS_META info icons */}
        {parts.length > 0 && (
          <HStack position="absolute" bottom={2} left={2} spacing={1} pointerEvents="none"
            bg="blackAlpha.500" borderRadius="md" px={1} py={1}>
            {parts.map((p) => {
              const meta = PARTS_META[p];
              if (!meta) return null;
              return (
                <Tooltip key={p} label={meta.label} fontSize="xs" hasArrow placement="top">
                  <Image src={meta.icon} alt={meta.label} boxSize="32px" pointerEvents="auto" />
                </Tooltip>
              );
            })}
          </HStack>
        )}

        {/* Top-left: face selector */}
        {faceList.length > 0 && (
          <Box position="absolute" top={2} left={2} bg="blackAlpha.700" borderRadius="md" display="inline-flex">
            <Box position="relative" display="inline-flex" alignItems="center" px={2} py={1} minW="120px">
              <Image src="/images/shop/UI_ICON_EditFace.png" alt="Face"
                boxSize="22px" objectFit="contain" flexShrink={0} pointerEvents="none" mr={1} />
              <Text fontSize="xs" color="gray.200" whiteSpace="nowrap" pointerEvents="none">{face || '(none)'}</Text>
              <Select position="absolute" inset={0} w="100%" h="100%"
                opacity={0} cursor="pointer" size="xs"
                value={face}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFace(e.target.value)}
                sx={{ appearance: 'none', WebkitAppearance: 'none' }}>
                <option value="">(none)</option>
                {faceList.map((f) => (
                  <option key={f} value={f}>{f.replace(/^face\/.*_/, '')}</option>
                ))}
              </Select>
            </Box>
          </Box>
        )}

        {/* Bottom-right: props/bg group + variant radio group + dam toggle */}
        <HStack position="absolute" bottom={2} right={2} spacing={1} align="flex-end">
          {/* Variant radio: base / kr / sfw / kr_sfw / rplus */}
          {availableVariants.length > 0 && (
            <HStack bg="blackAlpha.500" borderRadius="md" px={1} py={1} spacing={1}>
              {(['base', ...availableVariants] as string[]).map((v) => {
                const hasKrVariant = availableVariants.includes('kr');
                const icons: Record<string, string> = {
                  base:  hasKrVariant ? '/images/shop/icon-platform-vfun.png' : '/images/shop/icon-platform-onestore.png',
                  kr:    '/images/shop/icon-platform-onestore.png',
                  sfw:   '/images/shop/icon-platform-google.png',
                  rplus: '/images/shop/icon-secret-marks.png',
                };
                const tips: Record<string, string> = {
                  base:  'Uncensored',
                  kr:    'KR (Uncensored)',
                  sfw:   'Censored (Google Play)',
                  rplus: 'R+ (Uncensored)',
                };
                const active = variant === v;
                const icon = icons[v];
                return (
                  <Tooltip key={v} label={tips[v] ?? v} fontSize="xs" hasArrow placement="top">
                    <Box as="button" onClick={() => { if (!active) setVariant(v); }}
                      position="relative" boxSize="36px"
                      opacity={active ? 1 : 0.4} transition="opacity 0.15s"
                      _hover={{ opacity: active ? 0.8 : 0.65 }}
                      outline={active ? '2px solid' : 'none'}
                      outlineColor="yellow.400"
                      borderRadius="sm">
                      <Image src={icon} alt={tips[v] ?? v} boxSize="36px" objectFit="contain" />
                    </Box>
                  </Tooltip>
                );
              })}
            </HStack>
          )}
          {/* Props/bg/dam group */}
          {(hasParts || hasBg || hasDam) && (
            <VStack bg="blackAlpha.500" borderRadius="md" px={1} py={1} spacing={1}>
              {hasParts && (
                <IconBtn src="/images/shop/UI_SkinProp_Parts_N.png" alt="Parts"
                  label={showParts ? 'Hide parts' : 'Show parts'} active={showParts}
                  onClick={() => setShowParts((v) => !v)} />
              )}
              {hasBg && (
                <IconBtn src="/images/UI_Lobby_Icon_Props_1.png" alt="BG"
                  label={showBg ? 'Hide BG' : 'Show BG'} active={showBg}
                  onClick={() => setShowBg((v) => !v)} />
              )}
              {hasDam && onToggleDam && (
                <IconBtn src="/images/shop/UI_Icon_ClothBroken.png" alt="Damaged"
                  label={showDam ? 'Damaged — click for normal' : 'Normal — click for damaged'} active={!!showDam}
                  onClick={onToggleDam} />
              )}
            </VStack>
          )}
        </HStack>
      </Box>

      {/* Control bar below canvas — zones toggle, matching PixiJS spine viewer */}
      <HStack mt={2} spacing={3} px={1} justify="space-between">
        <HStack spacing={2}>
          <Switch id="uv-zones" isChecked={showZones} size="sm"
            onChange={(e) => setShowZones(e.target.checked)} />
          <Text as="label" htmlFor="uv-zones" fontSize="xs" color="gray.300" cursor="pointer">
            Zones
          </Text>
        </HStack>
        <Text fontSize="xs" color="whiteAlpha.400">
          Viewer by{' '}
          <Box as="a" href="https://lo.swaytwig.com" target="_blank" rel="noopener noreferrer"
            color="whiteAlpha.500" textDecoration="underline" _hover={{ color: 'whiteAlpha.700' }}>
            Wolfgang
          </Box>
        </Text>
      </HStack>
    </Box>
  );
}

// height defaults to a tall fill (standalone page usage); pass a smaller fixed
// height for compact embeds (e.g. the unit-detail Skin tab).
const PARTS_META: Record<string, { icon: string; label: string }> = {
  LOBBY_ANIMATION:        { icon: '/images/shop/UI_ShopL2DIcon.png',        label: 'Live 2D lobby animation' },
  VOICE:                  { icon: '/images/shop/UI_ShopVoiceIcon.png',       label: 'Voice' },
  SD_EFFECT:              { icon: '/images/shop/UI_ShopFxIcon.png',          label: 'SD battle effects' },
  SD_ANIMATION:           { icon: '/images/shop/UI_ShopSDAnimIcon.png',      label: 'SD battle animation' },
  PROPS:                  { icon: '/images/shop/UI_ShopObjectIcon.png',      label: 'Props / objects' },
  DAMAGE_IMAGE:           { icon: '/images/shop/UI_ShopDamagedIcon.png',     label: 'Damaged skin image' },
  DAMAGE_LOBBY_ANIMATION: { icon: '/images/shop/UI_ShopDamagedL2DIcon.png', label: 'Damaged Live 2D animation' },
};

type SkinViewerProps = {
  skin: string; height?: string | number; parts?: string[];
  hasDam?: boolean; showDam?: boolean; onToggleDam?: () => void;
  unavailable?: string; viewerKind?: string; hasRplus?: boolean; hasBg?: boolean;
  hasKr?: boolean; viewRegion?: 'global' | 'kr'; onToggleRegion?: () => void;
};

export default function SkinViewer(props: SkinViewerProps) {
  if (props.viewerKind === 'skinned') {
    return <UnityViewer skin={props.skin} height={props.height ?? '70vh'} parts={props.parts ?? []}
      hasRplus={props.hasRplus} hasKr={props.hasKr} hasBg={props.hasBg}
      hasDam={props.hasDam} showDam={props.showDam} onToggleDam={props.onToggleDam} />;
  }
  return <PixiSkinViewer {...props} />;
}

function PixiSkinViewer({ skin, height = '70vh', parts = [], hasDam = false, showDam = false, onToggleDam, unavailable, viewerKind, hasRplus, hasBg, hasKr, viewRegion, onToggleRegion }: SkinViewerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<any>(null);
  const rootRef = useRef<any>(null);
  const pixiRef = useRef<any>(null);
  const u2pxRef = useRef<number>(1);
  const [variant, setVariant] = useState<'base' | 'kr' | 'sfw' | 'rplus'>('base');
  const [error, setError] = useState<string | null>(null);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const [spineAnim, setSpineAnim] = useState<string>('');
  const [spineFace, setSpineFace] = useState<string>('');
  const [fixedFace, setFixedFace] = useState<string>(''); // '' = no face (default)
  const [spineParts, setSpineParts] = useState<Record<string, boolean>>({});
  const [spineBreast, setSpineBreast] = useState<string>('');
  const [spineAvailableSkins, setSpineAvailableSkins] = useState<Set<string> | null>(null);
  const showBg = toggles['bg'] ?? true;
  const [showZones, setShowZones] = useState(false);
  const zoneOverlayRef = useRef<any>(null);

  const [playing, setPlaying] = useState(true);
  const [loadState, setLoadState] = useState<'fetching' | 'unpacking' | 'ready' | 'error'>('fetching');
  const [canvasReady, setCanvasReady] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const filesRef = useRef<Map<string, Blob> | null>(null);

  useEffect(() => {
    if (unavailable && !showDam) return; // unsupported variant — don't fetch
    let cancelled = false;
    setError(null);
    setLayout(null);
    filesRef.current = null;
    setLoadState('fetching');
    setCanvasReady(false);
    (async () => {
      const files = await loadSkinArchive(skin);
      if (cancelled) throw new Error('cancelled');
      setLoadState('unpacking');
      filesRef.current = files;
      for (const file of ['spine.json', 'layout.json']) {
        if (files.has(file)) return JSON.parse(await readText(files, file)) as Layout;
      }
      throw new Error('no spine/layout json in archive');
    })()
      .then((l: Layout) => {
        if (cancelled) return;
        setLayout(l);
        setLoadState('ready');
        setVariant('base');
        setToggles(Object.fromEntries((l.toggles ?? []).map((t) => [t.key, t.default])));
        setFixedFace(''); // fixed faces default to none
        if (l.kind === 'spine') {
          setSpineAnim((l.animations ?? []).includes('Idle_1') ? 'Idle_1' : (l.animations?.[0] ?? ''));
          setSpineFace(l.skinGroups?.defaultFace ?? '');
          const parts = l.skinGroups?.parts ?? [];
          setSpineParts(Object.fromEntries(parts.filter((p) => !p.startsWith('breast/')).map((p) => [p, p === 'default' || p.startsWith('decorations/')])));
          const breastOptions = parts.filter((p) => p.startsWith('breast/'));
          const defaultBreast = breastOptions.find((p) => p === 'breast/Unedited') ?? breastOptions[0] ?? '';
          setSpineBreast(defaultBreast);
          setSpineAvailableSkins(null);
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setError(String(e));
        setLoadState('error');
      });
    return () => {
      cancelled = true;
      revokeSkinUrls(skin);
    };
  }, [skin, resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const nodesByIdRef = useRef<Record<string, any>>({});
  const meshByIdRef = useRef<Record<string, any>>({});
  const fixedFaceRef = useRef<string>('');
  fixedFaceRef.current = fixedFace;
  const setFixedFaceRef = useRef<((key: string | null) => void) | null>(null);
  // fixed-kind leaf meshes, flattened out of the transform tree for global
  // draw-order sorting (see the comment above `flatMeshes` in the build
  // effect) — toggle visibility must therefore drive mesh.renderable
  // directly instead of the (now-empty) anchor container's `visible`.
  const flatMeshesRef = useRef<{ mesh: any; wrapper: any; order: number; chain: string[]; sprite: SpriteInfo }[]>([]);
  const texturesRef = useRef<Record<string, any>>({});
  const togglesRef = useRef<Record<string, boolean>>({});
  togglesRef.current = toggles;
  const animTickRef = useRef<((t: number) => void) | null>(null);
  const playClipRef = useRef<((key: string) => void) | null>(null);
  const playingRef = useRef(true);
  playingRef.current = playing;
  useEffect(() => {
    if (!layout || layout.kind === 'spine' || layout.skin !== baseSkinKey(skin)) return;
    let destroyed = false;
    let app: any = null;
    let appReady = false;

    (async () => {
      const PIXI = await import('pixi.js');
      pixiRef.current = PIXI;
      const files = filesRef.current;
      if (!files) return;

      const texNames = new Set<string>();
      const collect = (n: SkinNode) => {
        if (n.sprite) {
          texNames.add(n.sprite.tex);
          if (n.sprite.rplus) texNames.add(n.sprite.rplus.tex);
          if (n.sprite.kr) texNames.add(n.sprite.kr.tex);
          if (n.sprite.sfw) texNames.add(n.sprite.sfw.tex);
        }
        n.children.forEach(collect);
      };
      (layout.nodes ?? []).forEach(collect);
      (layout.meshes ?? []).forEach((m) => {
        texNames.add(m.tex);
        if (m.rplusTex) texNames.add(m.rplusTex);
      });
      (layout.faces ?? []).forEach((f) => texNames.add(f.tex));

      const textures: Record<string, any> = {};
      await Promise.all(
        Array.from(texNames).map(async (tex) => {
          textures[tex] = await loadTexture(PIXI, skin, files, tex);
        }),
      );
      texturesRef.current = textures;
      if (destroyed) return;

      app = new PIXI.Application();
      await app.init({ backgroundAlpha: 0, antialias: true, resizeTo: hostRef.current! });
      appReady = true;
      if (destroyed) {
        app.destroy(true);
        return;
      }
      appRef.current = app;
      hostRef.current!.replaceChildren(app.canvas);

      const ppu = layout.ppu || 100;
      const byId: Record<string, any> = {};
      // Unity's SortingOrder is compared scene-wide across every sprite, not
      // just among direct siblings — PixiJS zIndex only sorts within one
      // parent's children, so two sprites at different nesting depths (e.g.
      // "BG/Part1" vs "Parts/Part1") can never be ordered correctly via
      // container nesting alone. Build the transform tree as normal (so
      // position/scale/rotation compose, and toggle visibility still works
      // via each node's own container), but draw every leaf mesh through a
      // flat, globally-sorted layer instead of leaving it parented in place.
      // Each flat entry carries: the mesh itself (with flipX/Y already on it),
      // the wrapper container that will be added to root (holding the composed
      // world matrix so the mesh renders in the right place/scale/rotation),
      // the sort order, and the ancestor chain for visibility recompute.
      const flatMeshes: { mesh: any; wrapper: any; order: number; chain: string[]; sprite: SpriteInfo }[] = [];
      // Captured during build: the empty face node's world matrix + ancestor chain,
      // so we can overlay the chosen face-expression mesh at that exact spot.
      let faceAnchorMat: any = null;
      let faceAnchorChain: string[] = [];
      let faceAnchorOrder = 0;

      // Build a container tree for visibility/toggle tracking, and compute each
      // node's world matrix explicitly (parentMat × nodeLocalMat) so we don't
      // depend on PixiJS's lazy worldTransform (only valid after a render pass).
      const build = (n: SkinNode, ancestorChain: string[], parentMat: any): any => {
        const node = new PIXI.Container();
        node.label = n.name;
        node.position.set(n.pos[0] * ppu, -n.pos[1] * ppu);
        node.scale.set(n.scale[0], n.scale[1]);
        node.rotation = -zAngle(n.rot);
        node.visible = n.active;
        byId[n.id] = node;
        const chain = [...ancestorChain, n.id];

        // Compose this node's local matrix with the parent's world matrix.
        node.updateLocalTransform();
        const worldMat = parentMat.clone().append(node.localTransform);

        if (n.sprite) {
          const mesh = new PIXI.MeshSimple({
            texture: textures[n.sprite.tex],
            vertices: new Float32Array(n.sprite.verts),
            uvs: new Float32Array(n.sprite.uvs),
            indices: new Uint32Array(n.sprite.indices),
          });
          if (n.sprite.flipX) mesh.scale.x = -1;
          if (n.sprite.flipY) mesh.scale.y = -1;
          if (n.sprite.color) {
            const [r, g, b, a] = n.sprite.color;
            console.log('[color]', n.name, n.sprite.color);
            mesh.tint = (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
            mesh.alpha = a;
          }
          if (n.sprite.shader === 'multiply') { mesh.blendMode = 'multiply'; console.log('[shader]', n.name, 'multiply'); }
          else if (n.sprite.shader === 'add') { mesh.blendMode = 'add'; console.log('[shader]', n.name, 'add'); }
          else if (n.sprite.shader === 'screen') { mesh.blendMode = 'screen'; console.log('[shader]', n.name, 'screen'); }
          else if (n.sprite.shader === 'mask') { console.log('[shader]', n.name, 'mask (unhandled)'); }
          // 'mask' (Smile_Mark stencil) — no PixiJS equivalent; rendered normally
          // Wrapper placed under root; its local matrix = the node's world
          // matrix so the mesh (a child of wrapper) renders at the right
          // world-space position/scale/rotation. The mesh keeps its own flip
          // since setFromMatrix on the wrapper (not the mesh) is never called.
          const wrapper = new PIXI.Container();
          wrapper.setFromMatrix(worldMat);
          wrapper.addChild(mesh);
          flatMeshes.push({ mesh, wrapper, order: n.sprite.order, chain, sprite: n.sprite });
        }
        if (n.faceAnchor) {
          faceAnchorMat = worldMat.clone();
          faceAnchorChain = chain;
          faceAnchorOrder = n.faceOrder ?? n.sprite?.order ?? 0;
        }
        n.children.forEach((c) => node.addChild(build(c, chain, worldMat)));
        return node;
      };

      const root = new PIXI.Container();
      const meshById: Record<string, any> = {};
      let zoneLayer: any = null;
      if (layout.kind === 'skinned-anim') {
        buildSkinnedAnim(PIXI, layout, root, textures, variant === 'rplus', meshById,
                         (fn) => { animTickRef.current = fn; },
                         () => playingRef.current, ppu,
                         (fn) => { playClipRef.current = fn; });
        zoneLayer = new PIXI.Container();
        const zones = layout.zones ?? [];
        if (zones.length) {
          let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
          for (const z of zones) {
            const [cx, cy, w, h] = z.rect;
            minx = Math.min(minx, cx - w / 2); maxx = Math.max(maxx, cx + w / 2);
            miny = Math.min(miny, cy - h / 2); maxy = Math.max(maxy, cy + h / 2);
          }
          const hit = new PIXI.Graphics()
            .rect(minx, miny, maxx - minx, maxy - miny)
            .fill({ color: 0xffffff, alpha: 0.001 });
          hit.eventMode = 'static';
          hit.cursor = 'pointer';
          const ranked = [...zones].sort(
            (a, b) => a.rect[2] * a.rect[3] - b.rect[2] * b.rect[3]);
          hit.on('pointertap', (e: any) => {
            const p = zoneLayer.toLocal(e.global);
            const z = ranked.find(({ rect: [cx, cy, w, h] }) =>
              Math.abs(p.x - cx) <= w / 2 && Math.abs(p.y - cy) <= h / 2);
            if (z) playClipRef.current?.(z.clip);
          });
          zoneLayer.addChild(hit);
        }
      } else if (layout.kind === 'skinned') {
        for (const m of (layout.meshes ?? []) as SkinnedMesh[]) {
          const tex = variant === 'rplus' && m.rplusTex ? m.rplusTex : m.tex;
          const mesh = new PIXI.MeshSimple({
            texture: textures[tex],
            vertices: new Float32Array(m.verts),
            uvs: new Float32Array(m.uvs),
            indices: new Uint32Array(m.indices),
          });
          mesh.zIndex = m.order;
          meshById[m.id] = mesh;
          root.addChild(mesh);
        }
      } else {
        const identity = new PIXI.Matrix();
        (layout.nodes ?? []).forEach((n) => root.addChild(build(n, [], identity)));
      }
      app.stage.addChild(root);
      rootRef.current = root;
      // _root node applies the Unity global scale-down (~0.13); invert it to get atlas-pixel scale.
      const rootNode = Object.values(byId).find((c: any) => c.label?.endsWith('_root')) as any;
      u2pxRef.current = rootNode ? 1 / Math.abs(rootNode.scale.x) : 1;
      nodesByIdRef.current = byId;
      meshByIdRef.current = meshById;
      flatMeshesRef.current = flatMeshes;

      // Add every wrapper (holding a leaf mesh at its correct world-space
      // transform) directly under root, sorted by Unity's scene-wide order.
      // Apply the current toggle state now so initial visibility is correct
      // even though the toggle useEffect fired before this async build finished.
      if (flatMeshes.length) {
        root.sortableChildren = true;
        // Recompute byId visibility with the current toggle state.
        const curToggles = togglesRef.current;
        const initHidden = new Set<string>();
        const initForced = new Set<string>();
        for (const t of layout.toggles ?? []) {
          const on = curToggles[t.key] ?? t.default;
          if (t.kind === 'swap') {
            (on ? t.swapOff : t.swapOn).forEach((id) => initHidden.add(id));
            (on ? t.swapOn : t.swapOff).forEach((id) => initForced.add(id));
          } else {
            if (on) t.members.forEach((id) => initForced.add(id));
            else t.members.forEach((id) => initHidden.add(id));
          }
        }
        const applyInit = (n: SkinNode) => {
          const node = byId[n.id];
          if (node) node.visible = (initForced.has(n.id) || n.active) && !initHidden.has(n.id);
          n.children.forEach(applyInit);
        };
        (layout.nodes ?? []).forEach(applyInit);
        for (const { wrapper, order, chain } of flatMeshes) {
          wrapper.zIndex = order;
          wrapper.renderable = chain.every((id) => byId[id].visible);
          root.addChild(wrapper);
        }
        root.sortChildren();
      }

      // Fixed-model face overlay: render the chosen face-expression mesh at the
      // empty face node. Default = none. applyFace(null) clears it.
      if (faceAnchorMat && (layout.faces?.length ?? 0) > 0) {
        const faceByKey: Record<string, FixedFace> = {};
        for (const f of layout.faces!) faceByKey[f.key] = f;
        let faceWrapper: any = null;
        const applyFace = (key: string | null) => {
          if (faceWrapper) { faceWrapper.destroy({ children: true }); faceWrapper = null; }
          if (!key) return;
          const f = faceByKey[key];
          if (!f || !textures[f.tex]) return;
          const mesh = new PIXI.MeshSimple({
            texture: textures[f.tex],
            vertices: new Float32Array(f.verts),
            uvs: new Float32Array(f.uvs),
            indices: new Uint32Array(f.indices),
          });
          const wrapper = new PIXI.Container();
          wrapper.setFromMatrix(faceAnchorMat);
          wrapper.zIndex = faceAnchorOrder;
          wrapper.renderable = faceAnchorChain.every((id) => byId[id]?.visible ?? true);
          wrapper.addChild(mesh);
          root.addChild(wrapper);
          root.sortChildren();
          faceWrapper = wrapper;
        };
        setFixedFaceRef.current = applyFace;
        applyFace(fixedFaceRef.current || null);
      }

      if (zoneLayer) app.stage.addChild(zoneLayer);
      const fit = () => {
        const b = root.getLocalBounds();
        if (!b.width || !b.height) return;
        const pad = 40;
        const s = Math.min((app.screen.width - pad) / b.width, (app.screen.height - pad) / b.height);
        root.scale.set(s);
        root.position.set(
          app.screen.width / 2 - (b.x + b.width / 2) * s,
          app.screen.height / 2 - (b.y + b.height / 2) * s,
        );
        if (zoneLayer) {
          zoneLayer.scale.set(s);
          zoneLayer.position.copyFrom(root.position);
        }
      };
      let elapsed = 0;
      if (animTickRef.current) {
        animTickRef.current(0);
        fit();
        app.ticker.add((tk: any) => {
          if (!playingRef.current) return;
          elapsed += tk.deltaMS / 1000;
          animTickRef.current!(elapsed);
        });
      } else {
        fit();
      }
      app.renderer.on('resize', fit);

      const canvas = app.canvas as HTMLCanvasElement;
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
    })().catch((e) => !destroyed && setError(String(e)));

    return () => {
      destroyed = true;
      nodesByIdRef.current = {};
      meshByIdRef.current = {};
      flatMeshesRef.current = [];
      texturesRef.current = {};
      animTickRef.current = null;
      playClipRef.current = null;
      appRef.current = null;
      if (app && appReady) app.destroy(true);
    };
  }, [layout, skin, resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Swap textures on existing fixed-skin meshes when variant changes — no rebuild needed.
  useEffect(() => {
    if (!layout || layout.kind === 'spine') return;
    if (variant !== 'base' && !layoutHasVariant(layout, variant as 'rplus' | 'kr' | 'sfw')) { setVariant('base'); return; }
    const textures = texturesRef.current;
    for (const { mesh, sprite } of flatMeshesRef.current) {
      const vkey = (variant === 'rplus' && sprite.rplus) ? sprite.rplus
                 : (variant === 'kr'    && sprite.kr)    ? sprite.kr
                 : (variant === 'sfw'   && sprite.sfw)   ? sprite.sfw
                 : null;
      mesh.texture = textures[(vkey ?? sprite).tex] ?? textures[sprite.tex];
    }
  }, [layout, variant]);

  const spineRef = useRef<any>(null);
  const spineSfwRef = useRef<any>(null); // second Spine object for skel-differs case
  const bgSpriteRef = useRef<any>(null);
  const bgSpriteSfwRef = useRef<any>(null); // second BG sprite for skel-differs case
  // Per atlas page: base and sfw SpineTexture objects for texture-swap case
  const spinePageTexRef = useRef<{ page: any; base: any; sfw: any }[]>([]);
  const spineBgTexRef = useRef<{ base: any; sfw: any } | null>(null);
  const composeSkinRef = useRef<((face: string, breast: string, parts: Record<string, boolean>) => void) | null>(null);
  const spineStateRef = useRef<number>(0);
  const reactThenRef = useRef<((trigger: 'breast' | 'Tep_1') => void) | null>(null);
  const spineFaceRef = useRef(spineFace);
  spineFaceRef.current = spineFace;
  const spineBreastRef = useRef(spineBreast);
  spineBreastRef.current = spineBreast;
  const spinePartsRef = useRef(spineParts);
  spinePartsRef.current = spineParts;
  const variantRef = useRef(variant);
  variantRef.current = variant;
  useEffect(() => {
    if (!layout || layout.kind !== 'spine' || layout.skin !== baseSkinKey(skin)) return;
    let destroyed = false;
    let app: any = null;
    let appReady = false;
    // Clear refs immediately so the swap effect can't act on stale objects from a prior skin
    spineRef.current = null;
    spineSfwRef.current = null;
    spinePageTexRef.current = [];
    spineBgTexRef.current = null;

    (async () => {
      const PIXI = await import('pixi.js');
      pixiRef.current = PIXI;
      const { Spine, SkeletonJson, AtlasAttachmentLoader, Skin, Physics, TextureAtlas, SpineTexture } =
        await import('@esotericsoftware/spine-pixi-v8') as any;
      const files = filesRef.current;
      if (!files) return;

      if (!layout.atlas || !layout.skel) return;
      const sfwMeta = layout.sfw ?? null;
      const sfwHasSkel = !!(sfwMeta?.skel);

      // Helper: load a TextureAtlas with base textures, and optionally pre-load sfw textures
      const loadAtlas = async (atlasName: string, texOverrides: Record<string, string> = {}) => {
        const atlasText = await readText(files, atlasName);
        const ta = new TextureAtlas(atlasText);
        await Promise.all(ta.pages.map(async (page: any) => {
          const overrideName = texOverrides[page.name];
          const blobUrl = urlFor(skin, files, overrideName ?? page.name);
          const texture = await PIXI.Assets.load({
            src: blobUrl,
            loadParser: 'loadTextures',
            data: { alphaMode: page.pma ? 'premultiplied-alpha' : 'premultiply-alpha-on-upload' },
          });
          page.setTexture(SpineTexture.from(texture.source));
        }));
        return ta;
      };

      // Always load base atlas/skel
      const baseAtlas = await loadAtlas(layout.atlas);
      if (destroyed) return;

      // If sfw textures differ but skel is same, pre-load sfw textures for instant swap
      // If sfw skel differs, load a full separate atlas for it
      let sfwAtlas: any = null;
      if (sfwMeta) {
        if (sfwMeta.atlas) {
          // sfw atlas already has correct page names baked in — no overrides needed
          sfwAtlas = await loadAtlas(sfwMeta.atlas);
        } else {
          // same atlas structure, just different texture files
          sfwAtlas = await loadAtlas(layout.atlas, sfwMeta.textures ?? {});
        }
        if (destroyed) return;
      }

      // Build page texture swap table (texture-only sfw case)
      if (!sfwHasSkel && sfwMeta) {
        spinePageTexRef.current = baseAtlas.pages.map((page: any, i: number) => ({
          page,
          base: page.texture, // SpineTexture set above
          sfw: sfwAtlas?.pages[i]?.texture ?? page.texture,
        }));
      } else {
        spinePageTexRef.current = [];
      }

      const baseSkelJson = JSON.parse(await readText(files, layout.skel));
      if (destroyed) return;
      const sjson = new SkeletonJson(new AtlasAttachmentLoader(baseAtlas));
      const skeletonData = sjson.readSkeletonData(baseSkelJson);

      // If sfw has a different skeleton, build it too
      let sfwSkeletonData: any = null;
      if (sfwHasSkel && sfwMeta?.skel && sfwAtlas) {
        const sfwSkelJson = JSON.parse(await readText(files, sfwMeta.skel));
        if (destroyed) return;
        const sfwSjson = new SkeletonJson(new AtlasAttachmentLoader(sfwAtlas));
        sfwSkeletonData = sfwSjson.readSkeletonData(sfwSkelJson);
      }

      app = new PIXI.Application();
      await app.init({ backgroundAlpha: 0, antialias: true, resizeTo: hostRef.current! });
      appReady = true;
      if (destroyed) { app.destroy(true); return; }
      appRef.current = app;
      hostRef.current!.replaceChildren(app.canvas);

      const W = layout.world ?? {};

      // Load BG textures (base + sfw if different)
      let bgTexBase: any = null;
      let bgTexSfw: any = null;
      if (W.bg) {
        bgTexBase = await loadTexture(PIXI, skin, files, W.bg.tex);
        const sfwBgName = sfwMeta?.textures?.[W.bg.tex];
        bgTexSfw = sfwBgName ? await loadTexture(PIXI, skin, files, sfwBgName) : null;
      }
      if (destroyed) { if (appReady) app?.destroy(true); return; }

      spineBgTexRef.current = bgTexBase ? { base: bgTexBase, sfw: bgTexSfw ?? bgTexBase } : null;

      const isSfw = variantRef.current === 'sfw';

      const spine = new Spine({ skeletonData });
      spineRef.current = spine;
      const startAnim = (layout.animations ?? []).includes('Idle_1')
        ? 'Idle_1' : layout.animations?.[0];
      if (startAnim) spine.state.setAnimation(0, startAnim, true);
      spine.visible = !sfwHasSkel || !isSfw;

      // sfw spine (only when skeleton differs)
      let spineSfw: any = null;
      if (sfwSkeletonData) {
        spineSfw = new Spine({ skeletonData: sfwSkeletonData });
        spineSfwRef.current = spineSfw;
        if (startAnim) spineSfw.state.setAnimation(0, startAnim, true);
        spineSfw.visible = isSfw;
      } else {
        spineSfwRef.current = null;
      }

      // Apply texture swap immediately if already in sfw mode (texture-only case)
      if (!sfwHasSkel && isSfw) {
        for (const { page, sfw } of spinePageTexRef.current) page.setTexture(sfw);
      }

      const makeCompose = (skel: any, sp: any) =>
        (face: string, breast: string, parts: Record<string, boolean>) => {
          const names = [
            layout.skinGroups?.base,
            face,
            breast || undefined,
            ...Object.entries(parts).filter(([, on]) => on).map(([n]) => n),
          ].filter(Boolean) as string[];
          const result = new Skin('viewer-skin');
          for (const n of names) {
            const s = skel.findSkin(n);
            if (s) result.addSkin(s);
          }
          const wasRunning = app.ticker.started;
          if (wasRunning) app.ticker.stop();
          sp.skeleton.setSkin(result);
          sp.skeleton.setToSetupPose();
          sp.skeleton.setSlotsToSetupPose();
          sp.skeleton.updateWorldTransform(Physics.update);
          sp.update(0);
          if (wasRunning) app.ticker.start();
        };

      const composeBase = makeCompose(skeletonData, spine);
      const composeSfw  = spineSfw ? makeCompose(sfwSkeletonData, spineSfw) : null;

      // composeSkinRef always targets the active skeleton
      const activeSkeletonData = () => isSfw && sfwSkeletonData ? sfwSkeletonData : skeletonData;
      composeSkinRef.current = (face, breast, parts) => {
        composeBase(face, breast, parts);
        composeSfw?.(face, breast, parts);
      };

      // Expose available skins from the active skeleton for UI filtering
      const availSkins = new Set<string>(
        (activeSkeletonData().skins as any[]).map((s: any) => s.name as string)
      );
      setSpineAvailableSkins(availSkins);
      // sfw skeleton may not have all breast groups — fall back to first available
      let activeBreast = spineBreastRef.current;
      if (activeBreast && !availSkins.has(activeBreast)) {
        const parts = layout.skinGroups?.parts ?? [];
        const fallback = parts.find((p) => p.startsWith('breast/') && availSkins.has(p));
        activeBreast = fallback ?? '';
        if (activeBreast !== spineBreastRef.current) setSpineBreast(activeBreast);
      }
      // sfw skeleton may not have all prop parts — turn off missing ones
      const currentParts = spinePartsRef.current;
      const fixedParts: Record<string, boolean> = {};
      let partsChanged = false;
      for (const [k, v] of Object.entries(currentParts)) {
        if (v && !availSkins.has(k)) { fixedParts[k] = false; partsChanged = true; }
        else fixedParts[k] = v;
      }
      if (partsChanged) setSpineParts(fixedParts);
      composeSkinRef.current(spineFaceRef.current, activeBreast, partsChanged ? fixedParts : spinePartsRef.current);

      const root = new PIXI.Container();
      root.sortableChildren = true;

      const sk = W.skeleton ?? { x: 0, y: 0, scale: 1, dataScale: 1 };
      const u2px = 1 / ((sk.scale || 1) * (sk.dataScale ?? 1));
      u2pxRef.current = u2px;

      if (W.bg) {
        const activeBgTex = isSfw ? (bgTexSfw ?? bgTexBase) : bgTexBase;
        const bg = new PIXI.Sprite(activeBgTex);
        bg.anchor.set(0.5);
        bg.position.set(W.bg.x * u2px, -W.bg.y * u2px);
        bg.width = W.bg.w * u2px;
        bg.height = W.bg.h * u2px;
        bg.zIndex = -10;
        root.addChild(bg);
        bgSpriteRef.current = bg;
      }

      spine.scale.set(1);
      spine.position.set(sk.x * u2px, -sk.y * u2px);
      spine.zIndex = 0;
      root.addChild(spine);

      if (spineSfw) {
        spineSfw.scale.set(1);
        spineSfw.position.set(sk.x * u2px, -sk.y * u2px);
        spineSfw.zIndex = 0;
        root.addChild(spineSfw);
      }
      app.stage.addChild(root);
      rootRef.current = root;

      const animSet = new Set(layout.animations ?? []);
      const animator = layout.animator;
      const states = animator?.states ?? {};
      const triggers = animator?.triggers ?? {};
      if (animator) spineStateRef.current = animator.default;
      const idleFor = (): string => {
        const st = states[String(spineStateRef.current)];
        return (st?.clip && animSet.has(st.clip)) ? st.clip : (layout.animations?.[0] ?? '');
      };
      const reactThen = (trigger: 'breast' | 'Tep_1') => {
        const fromIdx = spineStateRef.current;
        const destIdx = triggers[String(fromIdx)]?.[trigger];
        if (destIdx == null) return;
        const destState = states[String(destIdx)];
        const reaction = destState?.clip;
        if (!reaction || !animSet.has(reaction)) return;
        spineStateRef.current = destState.exit ?? destIdx;
        // Target the currently visible spine (base or sfw)
        const activeSpine = spineSfwRef.current?.visible ? spineSfwRef.current : spine;
        const entry = activeSpine.state.setAnimation(0, reaction, false);
        entry.mixDuration = 0.2;
        activeSpine.state.addAnimation(0, idleFor(), true, 0);
      };
      reactThenRef.current = reactThen;

      const zones = W.zones ?? [];
      let zoneLayer: any = null;
      if (zones.length || Object.keys(triggers).length) {
        zoneLayer = new PIXI.Container();
        const hit = new PIXI.Graphics();
        hit.eventMode = 'static';
        hit.cursor = 'pointer';
        zoneLayer.addChild(hit);
        hit.on('pointertap', (e: any) => {
          const p = zoneLayer.toLocal(e.global);
          // Find which zone the tap landed in. Body is the large zone; special
          // zones are smaller and sit inside it. Pick the smallest hit zone so
          // that tapping the special area doesn't also count as body. Only fire
          // if the tap actually lands inside a zone (no reaction outside all zones).
          let best: typeof zones[number] | null = null;
          for (const z of zones) {
            const halfW = (z.w * u2px) / 2, halfH = (z.h * u2px) / 2;
            const zx = z.x * u2px, zy = -z.y * u2px;
            const rot = -(z.rot ?? 0) * Math.PI / 180;
            const cos = Math.cos(-rot), sin = Math.sin(-rot);
            const dx = p.x - zx, dy = p.y - zy;
            const lx = dx * cos - dy * sin, ly = dx * sin + dy * cos;
            if (Math.abs(lx) <= halfW && Math.abs(ly) <= halfH) {
              if (!best || z.w * z.h < best.w * best.h) best = z;
            }
          }
          if (!best) return; // outside all zones — no reaction
          reactThen(best.key === 'body' ? 'Tep_1' : 'breast');
        });
        if (zones.length) {
          const overlay = new PIXI.Graphics();
          overlay.visible = false;
          for (const z of zones) {
            const isSpecial = z.key !== 'body';
            const zx = z.x * u2px, zy = -z.y * u2px;
            const hw = (z.w * u2px) / 2, hh = (z.h * u2px) / 2;
            const rot = -(z.rot ?? 0) * Math.PI / 180;
            const cos = Math.cos(rot), sin = Math.sin(rot);
            const corners = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(
              ([dx, dy]) => [zx + dx * cos - dy * sin, zy + dx * sin + dy * cos]
            );
            overlay.poly(corners.flat()).stroke({ color: isSpecial ? 0xff4444 : 0x4488ff, width: 20, alpha: 0.8 });
          }
          zoneLayer.addChild(overlay);
          zoneOverlayRef.current = overlay;
        }
        app.stage.addChild(zoneLayer);
      }

      const fit = () => {
        const b = root.getLocalBounds();
        if (!b.width || !b.height) return;
        const pad = 40;
        const s = Math.min((app.screen.width - pad) / b.width, (app.screen.height - pad) / b.height);
        root.scale.set(s);
        root.position.set(
          app.screen.width / 2 - (b.x + b.width / 2) * s,
          app.screen.height / 2 - (b.y + b.height / 2) * s,
        );
        if (zoneLayer) {
          zoneLayer.scale.set(s);
          zoneLayer.position.copyFrom(root.position);
          // Rebuild hit areas as individual zone rects (not full figure bounds)
          // so cursor/events only fire when the pointer is actually over a zone.
          const g = zoneLayer.children[0] as any;
          g.clear();
          for (const z of zones) {
            const hw = (z.w * u2px) / 2, hh = (z.h * u2px) / 2;
            const zx = z.x * u2px, zy = -z.y * u2px;
            const rot = -(z.rot ?? 0) * Math.PI / 180;
            const cos = Math.cos(rot), sin = Math.sin(rot);
            const corners = [[-hw,-hh],[hw,-hh],[hw,hh],[-hw,hh]].map(
              ([dx,dy]) => [zx + dx*cos - dy*sin, zy + dx*sin + dy*cos]
            );
            g.poly(corners.flat()).fill({ color: 0xffffff, alpha: 0.0001 });
          }
        }
      };
      spine.update(0);
      fit();
      // After one update pass, local bounds are valid. Compute true pixel scale from atlas page size.
      const atlasPage = baseAtlas.pages[0];
      const localB = root.getLocalBounds();
      if (localB.width && atlasPage?.width) {
        u2pxRef.current = atlasPage.width / localB.width;
      }
      app.renderer.on('resize', fit);

      // Zoom (wheel + pinch) and drag (pointer) on the canvas.
      const canvas = app.canvas as HTMLCanvasElement;
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
    })().catch((e) => !destroyed && setError(String(e)));

    return () => {
      destroyed = true;
      spineRef.current = null;
      spineSfwRef.current = null;
      spinePageTexRef.current = [];
      spineBgTexRef.current = null;
      composeSkinRef.current = null;
      reactThenRef.current = null;
      spineStateRef.current = 0;
      zoneOverlayRef.current = null;
      appRef.current = null;
      if (app && appReady) app.destroy(true);
    };
  }, [layout, skin]);

  useEffect(() => {
    const app = appRef.current;
    const spine = spineRef.current;
    // Spine-pixi v8 auto-updates via its own ticker listener; pause by setting timeScale.
    // For skinned-anim the playingRef is already checked in the ticker callback.
    if (spine) {
      spine.state.timeScale = playing ? 1 : 0;
      if (spineSfwRef.current) spineSfwRef.current.state.timeScale = playing ? 1 : 0;
    } else if (app) app.ticker.speed = playing ? 1 : 0;
  }, [playing]);

  useEffect(() => {
    const spine = spineRef.current;
    if (!spine || !spineAnim) return;
    const states = layout?.animator?.states;
    if (states) {
      const idx = Object.keys(states).find((k) => states[k].loop && states[k].clip === spineAnim);
      if (idx != null) spineStateRef.current = Number(idx);
    }
    spine.state.setAnimation(0, spineAnim, true);
    spineSfwRef.current?.state.setAnimation(0, spineAnim, true);
  }, [spineAnim, layout]);

  useEffect(() => {
    composeSkinRef.current?.(spineFace, spineBreast, spineParts);
  }, [spineFace, spineBreast, spineParts]);

  // Fixed-model face overlay swap (instant — no rebuild). '' = no face.
  useEffect(() => {
    setFixedFaceRef.current?.(fixedFace || null);
  }, [fixedFace]);

  // Instant sfw/base swap for spine — no rebuild
  useEffect(() => {
    if (!layout || layout.kind !== 'spine') return;
    const isSfw = variant === 'sfw';
    const spine = spineRef.current;
    const spineSfw = spineSfwRef.current;
    if (spineSfw) {
      // Skel differs: just toggle visibility + mirror animation
      if (spine) spine.visible = !isSfw;
      spineSfw.visible = isSfw;
      // Sync animation state to the now-visible spine
      const active = isSfw ? spineSfw : spine;
      const hidden  = isSfw ? spine : spineSfw;
      if (active && hidden) {
        const track = hidden.state.getCurrent(0);
        if (track) {
          const entry = active.state.setAnimation(0, track.animation.name, track.loop);
          entry.trackTime = track.trackTime;
        }
      }
    } else if (spinePageTexRef.current.length > 0) {
      // Texture-only: swap page textures in-place
      for (const { page, base, sfw } of spinePageTexRef.current) {
        page.setTexture(isSfw ? sfw : base);
      }
    }
    // BG sprite texture swap
    const bg = bgSpriteRef.current;
    const bgTex = spineBgTexRef.current;
    if (bg && bgTex) bg.texture = isSfw ? bgTex.sfw : bgTex.base;
    // Update available skins for UI (sfw skel may have different groups)
    const activeSkelData = isSfw && spineSfw
      ? (spineSfw as any).skeleton?.data
      : spine ? (spine as any).skeleton?.data : null;
    if (activeSkelData?.skins) {
      setSpineAvailableSkins(new Set<string>(
        (activeSkelData.skins as any[]).map((s: any) => s.name as string)
      ));
    }
  }, [layout, variant]);


  useEffect(() => {
    if (zoneOverlayRef.current) zoneOverlayRef.current.visible = showZones;
  }, [showZones]);

  useEffect(() => {
    if (!layout) return;
    const byId = nodesByIdRef.current;

    const hidden = new Set<string>();
    // swap-toggle "active" side: force visible even if n.active=false in scene.
    // plain toggle ON also forces members visible (they may have active=false in scene).
    const forced = new Set<string>();
    for (const t of layout.toggles ?? []) {
      const on = toggles[t.key] ?? t.default;
      if (t.kind === 'swap') {
        (on ? t.swapOff : t.swapOn).forEach((id) => hidden.add(id));
        (on ? t.swapOn : t.swapOff).forEach((id) => forced.add(id));
      } else {
        if (on) t.members.forEach((id) => forced.add(id));
        else t.members.forEach((id) => hidden.add(id));
      }
    }

    if (layout.kind === 'skinned' || layout.kind === 'skinned-anim') {
      const byMeshId = meshByIdRef.current;
      for (const [id, mesh] of Object.entries(byMeshId)) {
        mesh.visible = !hidden.has(id);
      }
    } else {
      const apply = (n: SkinNode) => {
        const node = byId[n.id];
        if (node) node.visible = (forced.has(n.id) || n.active) && !hidden.has(n.id);
        n.children.forEach(apply);
      };
      (layout.nodes ?? []).forEach(apply);
      // leaf meshes were flattened out of the transform tree for global
      // draw-order sorting (see the build effect) — their anchor's `visible`
      // no longer cascades to them since they're no longer its child, so
      // recompute renderable directly from each ancestor's visibility
      // (just set above by `apply`, which already folds in n.active + hidden).
      for (const { wrapper, chain } of flatMeshesRef.current) {
        wrapper.renderable = chain.every((id) => byId[id]?.visible);
      }
    }
    if (bgSpriteRef.current) {
      bgSpriteRef.current.visible = toggles['bg'] ?? true;
    }
  }, [layout, toggles]);

  // Save at full skeleton-native resolution (tight-crop, transparent BG).
  const handleSave = () => {
    try {
      const app = appRef.current;
      const root = rootRef.current;
      if (!app || !root) return;
      const PIXI = pixiRef.current;
      if (!PIXI) return;

      // Hide zone overlay temporarily.
      const overlayWasVisible = zoneOverlayRef.current?.visible ?? false;
      if (zoneOverlayRef.current) zoneOverlayRef.current.visible = false;

      // fitScale: how many screen-px per skeleton unit (set by fit()).
      // u2px: how many atlas-pixels per skeleton unit.
      // exportScale = u2px / fitScale scales the screen render up to atlas resolution.
      const fitScale = root.scale.x;
      const u2px = u2pxRef.current;
      const exportScale = u2px / fitScale;
      const screenBounds = root.getBounds(); // screen-pixel bounding box of content
      const natW = Math.ceil(screenBounds.width * exportScale);
      const natH = Math.ceil(screenBounds.height * exportScale);
      console.log('[save] fitScale', fitScale, 'u2px', u2px, 'exportScale', exportScale, 'size', natW, natH, 'screenBounds', screenBounds.x, screenBounds.y, screenBounds.width, screenBounds.height);
      if (!natW || !natH || natW > 16384 || natH > 16384) { console.warn('[save] bad size', natW, natH); return; }

      // Render stage into a RenderTexture at atlas resolution.
      const rt = PIXI.RenderTexture.create({ width: natW, height: natH });
      const matrix = new PIXI.Matrix(exportScale, 0, 0, exportScale, -screenBounds.x * exportScale, -screenBounds.y * exportScale);
      app.renderer.render({ container: app.stage, target: rt, transform: matrix, clear: true });

      if (zoneOverlayRef.current) zoneOverlayRef.current.visible = overlayWasVisible;

      // canvas() is synchronous in PixiJS v8.
      const src = app.renderer.extract.canvas({ target: rt }) as HTMLCanvasElement;
      rt.destroy(true);

      const w = src.width, h = src.height;
      const ctx = src.getContext('2d')!;
      const px = ctx.getImageData(0, 0, w, h).data;
      let minX = w, minY = h, maxX = 0, maxY = 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (px[(y * w + x) * 4 + 3] > 0) {
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
          }
        }
      }
      if (maxX < minX || maxY < minY) return;
      const cw = maxX - minX + 1, ch = maxY - minY + 1;
      const out = document.createElement('canvas');
      out.width = cw; out.height = ch;
      out.getContext('2d')!.drawImage(src, minX, minY, cw, ch, 0, 0, cw, ch);
      const a = document.createElement('a');
      a.href = out.toDataURL('image/png');
      a.download = `${skin}.png`;
      a.click();
      console.log('[save] done', cw, ch);
    } catch (e) {
      console.error('[save] error', e);
    }
  };

  return (
    <Box>
      {error && <Text color="red.400" fontSize="sm" mb={1}>{error}</Text>}
      <Box h={height} bg="gray.800" borderRadius="md" overflow="hidden" position="relative" border="1px solid" borderColor="whiteAlpha.200">
        <Box ref={hostRef} position="absolute" inset={0} opacity={loadState === 'ready' ? 1 : 0} />
        {loadState !== 'ready' && !error && (
          <Center position="absolute" inset={0} color="gray.500" pointerEvents="none" flexDirection="column" gap={2}>
            <Spinner />
            <Text fontSize="sm">{loadState === 'unpacking' ? 'unpacking…' : 'fetching…'}</Text>
          </Center>
        )}

        {/* Bottom-left: PARTS_META info icons (VOICE, SD_EFFECT, etc.) */}
        {parts.length > 0 && (
          <HStack position="absolute" bottom={2} left={2} spacing={1} pointerEvents="none"
            bg="blackAlpha.500" borderRadius="md" px={1} py={1}>
            {parts.map((p) => {
              const meta = PARTS_META[p];
              if (!meta) return null;
              return (
                <Tooltip key={p} label={meta.label} fontSize="xs" hasArrow placement="top">
                  <Image src={meta.icon} alt={meta.label} boxSize="32px" pointerEvents="auto" />
                </Tooltip>
              );
            })}
          </HStack>
        )}

        {/* Top-left: face selector (spine only) */}
        {layout?.kind === 'spine' && (layout.skinGroups?.faces?.length ?? 0) > 0 && (() => {
          const faces = layout.skinGroups!.faces!;
          const faceName = (spineFace || faces[0] || '').replace(/^face\/.*_/, '');
          return (
            <Box position="absolute" top={2} left={2} bg="blackAlpha.700" borderRadius="md" display="inline-flex">
              <Box position="relative" display="inline-flex" alignItems="center" px={2} py={1} minW="120px">
                <Image src="/images/shop/UI_ICON_EditFace.png" alt="Face"
                  boxSize="22px" objectFit="contain" flexShrink={0} pointerEvents="none" mr={1} />
                <Text fontSize="xs" color="gray.200" whiteSpace="nowrap" pointerEvents="none">{faceName}</Text>
                <Select position="absolute" inset={0} w="100%" h="100%"
                  opacity={0} cursor="pointer" size="xs"
                  value={spineFace}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSpineFace(e.target.value)}
                  sx={{ appearance: 'none', WebkitAppearance: 'none' }}>
                  {faces.map((f) => (
                    <option key={f} value={f}>{f.replace(/^face\/.*_/, '')}</option>
                  ))}
                </Select>
              </Box>
            </Box>
          );
        })()}

        {/* Top-left: face selector (fixed only) — default "(none)", its own entry */}
        {layout?.kind === 'fixed' && (layout.faces?.length ?? 0) > 0 && (() => {
          const faces = layout.faces!;
          const faceName = fixedFace || '(none)';
          return (
            <Box position="absolute" top={2} left={2} bg="blackAlpha.700" borderRadius="md" display="inline-flex">
              <Box position="relative" display="inline-flex" alignItems="center" px={2} py={1} minW="120px">
                <Image src="/images/shop/UI_ICON_EditFace.png" alt="Face"
                  boxSize="22px" objectFit="contain" flexShrink={0} pointerEvents="none" mr={1} />
                <Text fontSize="xs" color="gray.200" whiteSpace="nowrap" pointerEvents="none">{faceName}</Text>
                <Select position="absolute" inset={0} w="100%" h="100%"
                  opacity={0} cursor="pointer" size="xs"
                  value={fixedFace}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFixedFace(e.target.value)}
                  sx={{ appearance: 'none', WebkitAppearance: 'none' }}>
                  <option value="">(none)</option>
                  {faces.map((f) => (
                    <option key={f.key} value={f.key}>{f.key}</option>
                  ))}
                </Select>
              </Box>
            </Box>
          );
        })()}

        {/* Top-right: breast variants (spine only) + save button */}
        {(() => {
          const isSpine = layout?.kind === 'spine';
          const spineParts_ = layout?.skinGroups?.parts ?? [];
          const skinAvail = (k: string) => !spineAvailableSkins || spineAvailableSkins.has(k);
          const hasCensored = isSpine && spineParts_.includes('breast/Censorship') && skinAvail('breast/Censorship');
          const hasUnedited = isSpine && spineParts_.includes('breast/Unedited') && skinAvail('breast/Unedited');
          const hasRplusBreast = isSpine && spineParts_.includes('breast/RPlus') && skinAvail('breast/RPlus');
          const breastVariants = [
            hasCensored && { key: 'breast/Censorship', icon: '/images/shop/icon-platform-google.png', label: 'Censored' },
            hasUnedited && { key: 'breast/Unedited', icon: hasKr ? '/images/shop/icon-platform-vfun.png' : '/images/shop/icon-platform-onestore.png', label: 'Unedited' },
            hasRplusBreast && { key: 'breast/RPlus', icon: '/images/shop/icon-secret-marks.png', label: 'R+' },
          ].filter(Boolean) as { key: string; icon: string; label: string }[];
          return (
            <VStack position="absolute" top={2} right={2} spacing={1} align="flex-end"
              bg="blackAlpha.500" borderRadius="md" px={1} py={1}>
              {breastVariants.map((v) => (
                <IconBtn key={v.key} src={v.icon} alt={v.label} label={v.label}
                  active={spineBreast === v.key} placement="left"
                  onClick={() => setSpineBreast(v.key)} />
              ))}
              {isSpine && (
                <Tooltip label="Reload skin" fontSize="xs" hasArrow placement="left">
                  <Box as="button" onClick={() => setResetKey((k) => k + 1)} boxSize="36px" display="flex"
                    alignItems="center" justifyContent="center" opacity={0.7} _hover={{ opacity: 1 }} transition="opacity 0.15s">
                    <Text fontSize="lg" lineHeight="1">↺</Text>
                  </Box>
                </Tooltip>
              )}
              <Tooltip label="Save visible area as PNG" fontSize="xs" hasArrow placement="left">
                <Box as="button" onClick={handleSave} boxSize="36px" display="flex" alignItems="center"
                  justifyContent="center" opacity={0.8} _hover={{ opacity: 1 }} transition="opacity 0.15s">
                  <Image src="/images/shop/UI_Common_Icon_Save_1.png" alt="Save" boxSize="24px" objectFit="contain" />
                </Box>
              </Tooltip>
            </VStack>
          );
        })()}

        {/* Bottom-right: platform variant toggle + parts toggles + damaged/broken toggle */}
        {(() => {
          const fixedToggles = layout?.toggles ?? [];
          const isSpine = layout?.kind === 'spine';
          const isFixed = layout?.kind === 'fixed' || layout?.kind === 'skinned' || layout?.kind === 'skinned-anim';
          const spinePropParts = isSpine
            ? (layout!.skinGroups?.parts ?? []).filter(
                (p) => p !== 'default' && !p.startsWith('breast/')
                && (!spineAvailableSkins || spineAvailableSkins.has(p))
              )
            : [];

          // Platform/sfw variants only (breast handled top-right for spine)
          const hasSpineSfw = isSpine && !!layout?.sfw;
          const spineVariants = [
            hasSpineSfw && { key: 'base', icon: hasKr ? '/images/shop/icon-platform-vfun.png' : '/images/shop/icon-platform-onestore.png', label: 'Uncensored', isBreast: false },
            hasSpineSfw && { key: 'sfw', icon: '/images/shop/icon-platform-google.png', label: 'Censored (Google Play)', isBreast: false },
          ].filter(Boolean) as { key: string; icon: string; label: string; isBreast: boolean }[];
          const fixedHasKr    = isFixed && layout ? layoutHasVariant(layout, 'kr') : false;
          const fixedHasSfw   = isFixed && layout ? layoutHasVariant(layout, 'sfw') : false;
          const fixedHasRplus = isFixed && layout ? layoutHasVariant(layout, 'rplus') : false;
          const fixedVariants = (fixedHasKr || fixedHasSfw || fixedHasRplus) ? [
            { key: 'base',  icon: fixedHasKr ? '/images/shop/icon-platform-vfun.png' : '/images/shop/icon-platform-onestore.png', label: 'Uncensored', isBreast: false },
            fixedHasKr    && { key: 'kr',    icon: '/images/shop/icon-platform-onestore.png',    label: 'KR (Uncensored)', isBreast: false },
            fixedHasSfw   && { key: 'sfw',   icon: '/images/shop/icon-platform-google.png',      label: 'Censored (Google Play)', isBreast: false },
            fixedHasRplus && { key: 'rplus', icon: '/images/shop/icon-secret-marks.png',         label: 'R+ (Uncensored)', isBreast: false },
          ].filter(Boolean) as { key: string; icon: string; label: string; isBreast: boolean }[] : [];
          const variants = isSpine ? spineVariants : fixedVariants;

          const hasProps = fixedToggles.length > 0 || spinePropParts.length > 0 || hasDam || hasKr;
          const showRightPanel = variants.length > 0 || hasProps;
          if (!showRightPanel) return null;
          const multiFixed = fixedToggles.length > 1;
          const multiSpine = spinePropParts.length > 1;
          return (
            <HStack position="absolute" bottom={2} right={2} spacing={1} align="flex-end">
              {variants.length > 0 && (
                <HStack bg="blackAlpha.500" borderRadius="md" px={1} py={1} spacing={1}>
                  {variants.map((v) => {
                    const isActive = isSpine
                      ? (v.isBreast ? spineBreast === v.key : variant === v.key)
                      : variant === v.key;
                    return (
                      <Tooltip key={v.key} label={v.label} fontSize="xs" hasArrow placement="top">
                        <Box as="button"
                          onClick={() => {
                            if (isSpine && v.isBreast) setSpineBreast(v.key);
                            else setVariant(v.key as 'base' | 'kr' | 'sfw' | 'rplus');
                          }}
                          position="relative" boxSize="36px"
                          opacity={isActive ? 1 : 0.4} transition="opacity 0.15s"
                          _hover={{ opacity: isActive ? 0.8 : 0.65 }}
                          outline={isActive ? '2px solid' : 'none'}
                          outlineColor="yellow.400"
                          borderRadius="sm">
                          <Image src={v.icon} alt={v.label} boxSize="36px" objectFit="contain" />
                        </Box>
                      </Tooltip>
                    );
                  })}
                </HStack>
              )}
              {hasProps && (
              <VStack bg="blackAlpha.500" borderRadius="md" px={1} py={1} spacing={1}>
              {fixedToggles.map((t, i) => {
                const on = toggles[t.key] ?? t.default;
                const KEY_ICONS: Record<string, string> = {
                  bg: '/images/UI_Lobby_Icon_Props_1.png',
                };
                const icon = KEY_ICONS[t.key] ?? (multiFixed ? `/images/shop/UI_SkinProp_Parts_${i + 1}.png` : '/images/shop/UI_SkinProp_Parts_N.png');
                return (
                  <IconBtn key={t.key} src={icon} alt={t.key}
                    label={on ? `Hide ${t.key}` : `Show ${t.key}`} active={on}
                    onClick={() => setToggles((s) => ({ ...s, [t.key]: !on }))} />
                );
              })}
              {spinePropParts.map((p, i) => {
                const on = spineParts[p] ?? false;
                const icon = multiSpine ? `/images/shop/UI_SkinProp_Parts_${i + 1}.png` : '/images/shop/UI_SkinProp_Parts_N.png';
                const label = p.replace(/^.*\//, '');
                return (
                  <IconBtn key={p} src={icon} alt={label}
                    label={on ? `Hide ${label}` : `Show ${label}`} active={on}
                    onClick={() => setSpineParts((s) => ({ ...s, [p]: !on }))} />
                );
              })}
              {hasDam && onToggleDam && (
                <IconBtn src="/images/shop/UI_Icon_ClothBroken.png" alt="Damaged"
                  label={showDam ? 'Damaged — click for normal' : 'Normal — click for damaged'} active={showDam}
                  onClick={onToggleDam} />
              )}
              {hasKr && onToggleRegion && (
                <Box as="button" onClick={onToggleRegion}
                  px={2} py={1} borderRadius="md" fontSize="xs" fontWeight="bold"
                  bg={viewRegion === 'kr' ? 'yellow.500' : 'whiteAlpha.200'}
                  color={viewRegion === 'kr' ? 'gray.900' : 'gray.300'}
                  _hover={{ bg: viewRegion === 'kr' ? 'yellow.400' : 'whiteAlpha.300' }}
                  transition="background 0.15s" lineHeight="1">
                  {viewRegion === 'kr' ? 'KR' : 'GL'}
                </Box>
              )}
              </VStack>
              )}
            </HStack>
          );
        })()}

        {unavailable && (
          <Box position="absolute" bottom={2} left="50%" transform="translateX(-50%)"
            bg="blackAlpha.700" borderRadius="md" px={3} py={1} pointerEvents="none" maxW="80%" textAlign="center">
            <Text fontSize="xs" color="gray.400">{unavailable}</Text>
          </Box>
        )}
      </Box>

      {/* Control bar below canvas */}
      {layout && (() => {
        const isSpine = layout.kind === 'spine';
        const isAnim = layout.kind === 'skinned-anim' || isSpine;
        const hasZones = isSpine && (layout.world?.zones?.length ?? 0) > 0;
        if (!isAnim && !hasZones) return null;
        return (
          <HStack mt={2} spacing={3} px={1}>
            {isAnim && (
              <HStack spacing={2}>
                <Switch id="sv-play" isChecked={playing} size="sm"
                  onChange={(e) => setPlaying(e.target.checked)} />
                <Text as="label" htmlFor="sv-play" fontSize="xs" color="gray.300" cursor="pointer">
                  {playing ? 'Playing' : 'Paused'}
                </Text>
              </HStack>
            )}
            {hasZones && (
              <HStack spacing={2}>
                <Switch id="sv-zones" isChecked={showZones} size="sm"
                  onChange={(e) => setShowZones(e.target.checked)} />
                <Text as="label" htmlFor="sv-zones" fontSize="xs" color="gray.300" cursor="pointer">
                  Zones
                </Text>
              </HStack>
            )}
          </HStack>
        );
      })()}
    </Box>
  );
}
