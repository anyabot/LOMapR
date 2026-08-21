export type SkinnedCurve = { v: number } | { t: number[]; c: number[][] };

export type SkinnedNode = {
  name: string;
  parent: number;
  pos: [number, number, number];
  rot: [number, number, number, number];
  scale: [number, number, number];
  active: boolean;
};

export type BlendShape = {
  name: string; hash: number; full: number; weight: number;
  deltas: number[];
};

export type SkinnedMesh = {
  verts: number[];
  uvs: number[];
  tris: number[];
  boneIdx: number[];
  boneWeights: number[];
  bones: number[];
  bindposes: number[];
  shapes?: BlendShape[];
};

export type SpriteMesh = { verts: number[]; uvs: number[]; tris: number[] };

export type BlendMode = 'add' | 'multiply' | 'screen' | 'normal';

export type SkinnedRenderer =
  | {
      kind: 'skinned';
      name: string; node: number; tex: string; material: string | null;
      blend?: BlendMode; color?: [number, number, number, number];
      enabled: boolean; order: number; layer?: number; mesh: SkinnedMesh;
    }
  | {
      kind: 'sprite';
      name: string; node: number; tex: string; blend?: BlendMode;
      enabled: boolean; order: number; layer?: number;
      color: [number, number, number, number]; flip: [boolean, boolean];
      ppu: number; mesh: SpriteMesh;
    }
  | {
      kind: 'mesh';
      name: string; node: number; tex: string; material: string | null;
      blend?: BlendMode; color?: [number, number, number, number];
      enabled: boolean; order: number; layer?: number; mesh: RigidMesh;
    };

export type RigidMesh = { verts: number[]; uvs: number[]; tris: number[] };

export type SkinnedTrack = {
  node: number;
  pos?: SkinnedCurve[];
  euler?: SkinnedCurve[];
  quat?: SkinnedCurve[];
  scale?: SkinnedCurve[];
};

export type RendererTrack = {
  renderer: number;
  alpha?: SkinnedCurve;
  red?: SkinnedCurve;
  green?: SkinnedCurve;
  blue?: SkinnedCurve;
  order?: SkinnedCurve;
  flipX?: SkinnedCurve;
  enabled?: SkinnedCurve;
  shapes?: { slot: number; curve: SkinnedCurve }[];
  object?: { t: number[]; frames: ({ tex?: string; mesh?: SpriteMesh } | null)[] };
};

export type SkinnedClip = {
  name: string;
  length: number;
  loop: boolean;
  events?: { t: number; chain: string }[];
  tracks: SkinnedTrack[];
  toggles: { node: number; curve: SkinnedCurve }[];
  renderers: RendererTrack[];
  dynamic?: DynamicTrack[];
};

export type DynamicTrack = {
  bone: number;
  enabled?: SkinnedCurve;
  damping?: SkinnedCurve;
  elasticity?: SkinnedCurve;
  stiffness?: SkinnedCurve;
  inert?: SkinnedCurve;
  weight?: SkinnedCurve;
};

export type SkinnedDoc = {
  name: string;
  animatorRoot: number;
  nodes: SkinnedNode[];
  renderers: SkinnedRenderer[];
  textures: string[];
  animators: SkinnedAnimator[];
  mainAnimator: number;
  dynamicBones?: DynamicBoneDef[];
  puppetIk?: PuppetIkDef[];
  puppetSpline?: PuppetSplineDef[];
  particles?: EmitterDef[];
  particleMeshes?: Record<string, { verts: number[]; uvs: number[]; tris: number[] }>;
  colliders?: SkinnedCollider[];
  toggles?: SkinnedToggle[];
  variants?: Record<string, SkinnedVariant>;
  faces?: SkinnedFace[];
};

export type SkinnedToggle = {
  key: 'parts' | 'parts2' | 'bg';
  default: boolean;
  kind?: 'swap';
  members?: number[];
  swapOn?: number[];
  swapOff?: number[];
};

export type SkinnedVariant = {
  archive?: string;
  textures?: Record<string, string>;
  meshes?: Record<string, SkinnedMesh>;
  active?: { node: number; value: boolean }[];
};

export type SkinnedFace = {
  key: string;
  node: number;
  tex: string;
  order: number;
  color: [number, number, number, number];
  flip: [boolean, boolean];
  mesh: SpriteMesh;
};

export type PuppetIkDef = {
  node: number;
  enabled: boolean;
  flip: boolean;
  squash: boolean;
  scale: boolean;
  top: number;
  middle: number;
  bottom: number;
  mode: number;
  iterations: number;
  damping: number;
  end: number;
  start: number;
  scaleStart: [number, number, number][];
  aim: [number, number, number];
  up: [number, number, number];
  offsetScale: [number, number, number];
  offset: [number, number, number, number];
};

export type PuppetSplineDef = {
  node: number;
  enabled: boolean;
  ctrls: number[];
  samples: number;
  bones: number[];
};

export type AnimatorState = {
  name: string; clip: string | null; loop: boolean; exit: number | null;
  speed?: number; cycleOffset?: number; exitTime?: number | null; fade?: number;
};

export type SkinnedAnimator = {
  node: number;
  name: string;
  layer: number;
  weight?: number;
  additive?: boolean;
  clips: SkinnedClip[];
  default: string | null;
  defaultState: number | null;
  states: Record<string, AnimatorState>;
  triggers: Record<string, Record<string, number>>;
};

export type SkinnedCollider = {
  node: number;
  name: string;
  key: 'body' | 'special';
  center: [number, number, number];
  size: [number, number, number];
};

import { buildChains, resetChain, stepChain, type Chain, type DynamicBoneDef, type RigView }
  from './dynamicBone';
import type { EmitterDef } from './skinnedParticles';

const DEG = Math.PI / 180;

// Row-major 4x4, column-vector convention: out = a * b.
function multiply(out: Float32Array, a: Float32Array, ao: number,
                  b: Float32Array, bo: number) {
  for (let r = 0; r < 4; r += 1) {
    const a0 = a[ao + r * 4], a1 = a[ao + r * 4 + 1];
    const a2 = a[ao + r * 4 + 2], a3 = a[ao + r * 4 + 3];
    for (let c = 0; c < 4; c += 1) {
      out[r * 4 + c] = a0 * b[bo + c] + a1 * b[bo + 4 + c]
        + a2 * b[bo + 8 + c] + a3 * b[bo + 12 + c];
    }
  }
}

// Row-major 3x3, column-vector convention: out = a * b. Never aliased.
function multiply3(out: Float32Array, oo: number, a: Float32Array, ao: number,
                   b: Float32Array, bo: number) {
  for (let r = 0; r < 3; r += 1) {
    const a0 = a[ao + r * 3], a1 = a[ao + r * 3 + 1], a2 = a[ao + r * 3 + 2];
    for (let c = 0; c < 3; c += 1) {
      out[oo + r * 3 + c] = a0 * b[bo + c] + a1 * b[bo + 3 + c] + a2 * b[bo + 6 + c];
    }
  }
}

function quatMat3(out: Float32Array, o: number,
                  qx: number, qy: number, qz: number, qw: number) {
  const x2 = qx + qx, y2 = qy + qy, z2 = qz + qz;
  const xx = qx * x2, xy = qx * y2, xz = qx * z2;
  const yy = qy * y2, yz = qy * z2, zz = qz * z2;
  const wx = qw * x2, wy = qw * y2, wz = qw * z2;
  out[o] = 1 - (yy + zz); out[o + 1] = xy - wz; out[o + 2] = xz + wy;
  out[o + 3] = xy + wz; out[o + 4] = 1 - (xx + zz); out[o + 5] = yz - wx;
  out[o + 6] = xz - wy; out[o + 7] = yz + wx; out[o + 8] = 1 - (xx + yy);
}

// Unity composes a transform as translate * rotate * scale.
function compose(out: Float32Array, o: number,
                 px: number, py: number, pz: number,
                 qx: number, qy: number, qz: number, qw: number,
                 sx: number, sy: number, sz: number) {
  const x2 = qx + qx, y2 = qy + qy, z2 = qz + qz;
  const xx = qx * x2, xy = qx * y2, xz = qx * z2;
  const yy = qy * y2, yz = qy * z2, zz = qz * z2;
  const wx = qw * x2, wy = qw * y2, wz = qw * z2;
  out[o] = (1 - (yy + zz)) * sx;
  out[o + 1] = (xy - wz) * sy;
  out[o + 2] = (xz + wy) * sz;
  out[o + 3] = px;
  out[o + 4] = (xy + wz) * sx;
  out[o + 5] = (1 - (xx + zz)) * sy;
  out[o + 6] = (yz - wx) * sz;
  out[o + 7] = py;
  out[o + 8] = (xz - wy) * sx;
  out[o + 9] = (yz + wx) * sy;
  out[o + 10] = (1 - (xx + yy)) * sz;
  out[o + 11] = pz;
  out[o + 12] = 0; out[o + 13] = 0; out[o + 14] = 0; out[o + 15] = 1;
}

// Unity's Euler order applies Z, then X, then Y.
function eulerToQuat(x: number, y: number, z: number): [number, number, number, number] {
  const hx = x * DEG * 0.5, hy = y * DEG * 0.5, hz = z * DEG * 0.5;
  const cx = Math.cos(hx), sx = Math.sin(hx);
  const cy = Math.cos(hy), sy = Math.sin(hy);
  const cz = Math.cos(hz), sz = Math.sin(hz);
  return [
    cy * sx * cz + sy * cx * sz,
    sy * cx * cz - cy * sx * sz,
    cy * cx * sz - sy * sx * cz,
    cy * cx * cz + sy * sx * sz,
  ];
}

// Each segment stores the cubic Unity evaluates over it.
export function evalCurve(curve: SkinnedCurve | undefined, time: number): number {
  if (!curve) return 0;
  if ('v' in curve) return curve.v;
  const { t, c } = curve;
  if (!t.length) return 0;
  if (time <= t[0]) return c[0][3];
  if (time >= t[t.length - 1]) return c[c.length - 1][3];
  let lo = 0;
  let hi = t.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (t[mid] <= time) lo = mid; else hi = mid;
  }
  const seg = c[lo];
  const x = time - t[lo];
  return ((seg[0] * x + seg[1]) * x + seg[2]) * x + seg[3];
}

function evalObjectCurve<T>(curve: { t: number[]; frames: T[] }, time: number): T | undefined {
  if (!curve.t.length) return undefined;
  let index = 0;
  for (let i = 1; i < curve.t.length && curve.t[i] <= time; i += 1) index = i;
  return curve.frames[index];
}

export type Rig = ReturnType<typeof createRig>;

export function createRig(doc: SkinnedDoc) {
  const count = doc.nodes.length;
  const local = new Float32Array(count * 16);
  const world = new Float32Array(count * 16);
  // Unity's Transform.rotation: the product of local rotations, free of the
  // hierarchy's scale. TransformDirection uses this, never the world matrix.
  const localRot = new Float32Array(count * 9);
  const worldRot = new Float32Array(count * 9);
  const rot3 = new Float32Array(9);
  const selfActive = new Uint8Array(count);
  const visible = new Uint8Array(count);
  const nodeOverrides = new Int8Array(count);
  nodeOverrides.fill(-1);

  const pos = new Float32Array(count * 3);
  const quat = new Float32Array(count * 4);
  const scale = new Float32Array(count * 3);

  const alpha = new Float32Array(doc.renderers.length);
  const tint = new Float32Array(doc.renderers.length * 3);
  const sortOrder = new Float32Array(doc.renderers.length);
  const enabled = new Uint8Array(doc.renderers.length);
  const objectVisible = new Uint8Array(doc.renderers.length);
  const objectTexture: (string | null)[] = doc.renderers.map(() => null);
  const dynamicBase = doc.dynamicBones ?? [];
  const dynamicDefs = dynamicBase.map((def) => ({ ...def, colliders: def.colliders ?? [] }));
  const shapeWeights = doc.renderers.map((r) =>
    (r.kind === 'skinned' && r.mesh.shapes
      ? Float32Array.from(r.mesh.shapes, (s) => s.weight) : null));

  const resetPose = () => {
    doc.renderers.forEach((r, i) => {
      alpha[i] = r.color ? r.color[3] : 1;
      tint[i * 3] = r.color ? r.color[0] : 1;
      tint[i * 3 + 1] = r.color ? r.color[1] : 1;
      tint[i * 3 + 2] = r.color ? r.color[2] : 1;
      sortOrder[i] = r.order;
      enabled[i] = r.enabled ? 1 : 0;
      objectVisible[i] = 1;
      objectTexture[i] = null;
      const shapes = shapeWeights[i];
      if (shapes && r.kind === 'skinned' && r.mesh.shapes) {
        r.mesh.shapes.forEach((s, k) => { shapes[k] = s.weight; });
      }
    });
    doc.nodes.forEach((n, i) => {
      pos[i * 3] = n.pos[0]; pos[i * 3 + 1] = n.pos[1]; pos[i * 3 + 2] = n.pos[2];
      quat[i * 4] = n.rot[0]; quat[i * 4 + 1] = n.rot[1];
      quat[i * 4 + 2] = n.rot[2]; quat[i * 4 + 3] = n.rot[3];
      scale[i * 3] = n.scale[0]; scale[i * 3 + 1] = n.scale[1];
      scale[i * 3 + 2] = n.scale[2];
      selfActive[i] = n.active ? 1 : 0;
    });
    dynamicDefs.forEach((def, i) => Object.assign(def, dynamicBase[i]));
  };
  resetPose();

  // Every Animator plays at once: the model rig plus the looping effect rigs,
  // each over its own subtree.
  type Playing = {
    def: SkinnedAnimator;
    byName: Map<string, SkinnedClip>;
    clip: SkinnedClip | null;
    time: number;
    returnTo: string | null;
    state: number | null;
    from: SkinnedClip | null;
    fromTime: number;
  };

  const players: Playing[] = doc.animators.map((def) => {
    const byName = new Map(def.clips.map((clip) => [clip.name, clip]));
    return {
      def,
      byName,
      clip: (def.default ? byName.get(def.default) : null) ?? def.clips[0] ?? null,
      time: 0,
      returnTo: null,
      state: def.defaultState ?? null,
      from: null,
      fromTime: 0,
    };
  });
  const main = players[doc.mainAnimator] ?? players[0];
  // Layers on the same Animator play together and share triggers.
  const mainLayers = players.filter((p) => p.def.node === main?.def.node);
  const transitionDuration = 0.18;
  const sourcePos = new Float32Array(count * 3);
  const sourceQuat = new Float32Array(count * 4);
  const sourceScale = new Float32Array(count * 3);
  let transition: { elapsed: number } | null = null;

  const clearTransition = () => {
    transition = null;
    for (const player of players) player.from = null;
  };

  // The outgoing clips keep playing through the fade, the way Mecanim
  // crossfades; a frozen source pose reads as a stall.
  const beginTransition = () => {
    if (transition) return;
    for (const player of players) {
      player.from = player.clip;
      player.fromTime = player.time;
    }
    transition = { elapsed: 0 };
  };

  const stepSource = (dt: number) => {
    for (const player of players) {
      const clip = player.from;
      if (!clip || clip.length <= 0) continue;
      player.fromTime += dt;
      if (player.fromTime < clip.length) continue;
      player.fromTime = clip.loop ? player.fromTime % clip.length : clip.length;
    }
  };

  const blendTransition = () => {
    if (!transition) return;
    const t = Math.min(1, transition.elapsed / transitionDuration);
    const smooth = t * t * (3 - 2 * t);
    for (let i = 0; i < pos.length; i += 1) {
      pos[i] = sourcePos[i] + (pos[i] - sourcePos[i]) * smooth;
    }
    for (let i = 0; i < scale.length; i += 1) {
      scale[i] = sourceScale[i] + (scale[i] - sourceScale[i]) * smooth;
    }
    for (let i = 0; i < quat.length; i += 4) {
      const dot = sourceQuat[i] * quat[i] + sourceQuat[i + 1] * quat[i + 1]
        + sourceQuat[i + 2] * quat[i + 2] + sourceQuat[i + 3] * quat[i + 3];
      const sign = dot < 0 ? -1 : 1;
      const x = sourceQuat[i] + (quat[i] * sign - sourceQuat[i]) * smooth;
      const y = sourceQuat[i + 1] + (quat[i + 1] * sign - sourceQuat[i + 1]) * smooth;
      const z = sourceQuat[i + 2] + (quat[i + 2] * sign - sourceQuat[i + 2]) * smooth;
      const w = sourceQuat[i + 3] + (quat[i + 3] * sign - sourceQuat[i + 3]) * smooth;
      const length = Math.hypot(x, y, z, w) || 1;
      quat[i] = x / length; quat[i + 1] = y / length;
      quat[i + 2] = z / length; quat[i + 3] = w / length;
    }
    if (t >= 1) clearTransition();
  };

  const applyPlayer = (clip: SkinnedClip | null, time: number) => {
    if (!clip) return;
    for (const track of clip.tracks) {
      const i = track.node;
      if (track.pos) {
        pos[i * 3] = evalCurve(track.pos[0], time);
        pos[i * 3 + 1] = evalCurve(track.pos[1], time);
        pos[i * 3 + 2] = evalCurve(track.pos[2], time);
      }
      if (track.scale) {
        scale[i * 3] = evalCurve(track.scale[0], time);
        scale[i * 3 + 1] = evalCurve(track.scale[1], time);
        scale[i * 3 + 2] = evalCurve(track.scale[2], time);
      }
      if (track.quat) {
        const x = evalCurve(track.quat[0], time);
        const y = evalCurve(track.quat[1], time);
        const z = evalCurve(track.quat[2], time);
        const w = evalCurve(track.quat[3], time);
        const len = Math.hypot(x, y, z, w) || 1;
        quat[i * 4] = x / len; quat[i * 4 + 1] = y / len;
        quat[i * 4 + 2] = z / len; quat[i * 4 + 3] = w / len;
      } else if (track.euler) {
        const q = eulerToQuat(evalCurve(track.euler[0], time),
                              evalCurve(track.euler[1], time),
                              evalCurve(track.euler[2], time));
        quat[i * 4] = q[0]; quat[i * 4 + 1] = q[1];
        quat[i * 4 + 2] = q[2]; quat[i * 4 + 3] = q[3];
      }
    }
    for (const toggle of clip.toggles) {
      selfActive[toggle.node] = evalCurve(toggle.curve, time) > 0.5 ? 1 : 0;
    }
    for (const track of clip.renderers) {
      if (track.alpha) alpha[track.renderer] = evalCurve(track.alpha, time);
      if (track.red) tint[track.renderer * 3] = evalCurve(track.red, time);
      if (track.green) tint[track.renderer * 3 + 1] = evalCurve(track.green, time);
      if (track.blue) tint[track.renderer * 3 + 2] = evalCurve(track.blue, time);
      if (track.order) sortOrder[track.renderer] = evalCurve(track.order, time);
      if (track.enabled) {
        enabled[track.renderer] = evalCurve(track.enabled, time) > 0.5 ? 1 : 0;
      }
      if (track.object) {
        const frame = evalObjectCurve(track.object, time);
        objectVisible[track.renderer] = frame === null ? 0 : 1;
        objectTexture[track.renderer] = frame?.tex ?? null;
      }
      const weights = shapeWeights[track.renderer];
      if (weights && track.shapes) {
        for (const shape of track.shapes) {
          weights[shape.slot] = evalCurve(shape.curve, time);
        }
      }
    }
    for (const track of clip.dynamic ?? []) {
      const def = dynamicDefs[track.bone];
      if (!def) continue;
      if (track.enabled) def.enabled = evalCurve(track.enabled, time) > 0.5;
      if (track.damping) def.damping = evalCurve(track.damping, time);
      if (track.elasticity) def.elasticity = evalCurve(track.elasticity, time);
      if (track.stiffness) def.stiffness = evalCurve(track.stiffness, time);
      if (track.inert) def.inert = evalCurve(track.inert, time);
      if (track.weight) def.weight = evalCurve(track.weight, time);
    }
  };

  // Unity skips a zero-weight layer entirely, blends a fractional one toward the
  // pose beneath it, and adds an additive layer's delta from its own first frame.
  const layerPos = new Float32Array(pos.length);
  const layerQuat = new Float32Array(quat.length);
  const layerScale = new Float32Array(scale.length);

  const applyClip = () => {
    for (const player of players) {
      const weight = player.def.weight ?? 1;
      if (weight <= 0) continue;
      const additive = player.def.additive === true;
      if (weight >= 1 && !additive) { applyPlayer(player.clip, player.time); continue; }
      layerPos.set(pos); layerQuat.set(quat); layerScale.set(scale);
      if (additive) {
        applyPlayer(player.clip, 0);
        const basePos = pos.slice(), baseQuat = quat.slice(), baseScale = scale.slice();
        pos.set(layerPos); quat.set(layerQuat); scale.set(layerScale);
        applyPlayer(player.clip, player.time);
        for (let i = 0; i < pos.length; i += 1) {
          pos[i] = layerPos[i] + (pos[i] - basePos[i]) * weight;
          scale[i] = layerScale[i] + (scale[i] - baseScale[i]) * weight;
        }
        for (let i = 0; i < quat.length; i += 1) {
          quat[i] = layerQuat[i] + (quat[i] - baseQuat[i]) * weight;
        }
      } else {
        applyPlayer(player.clip, player.time);
        for (let i = 0; i < pos.length; i += 1) {
          pos[i] = layerPos[i] + (pos[i] - layerPos[i]) * weight;
          scale[i] = layerScale[i] + (scale[i] - layerScale[i]) * weight;
        }
        for (let i = 0; i < quat.length; i += 1) {
          quat[i] = layerQuat[i] + (quat[i] - layerQuat[i]) * weight;
        }
      }
      for (let i = 0; i < quat.length; i += 4) {
        const len = Math.hypot(quat[i], quat[i + 1], quat[i + 2], quat[i + 3]) || 1;
        quat[i] /= len; quat[i + 1] /= len; quat[i + 2] /= len; quat[i + 3] /= len;
      }
    }
  };

  const captureSource = () => {
    resetPose();
    for (const player of players) {
      if (player.from) applyPlayer(player.from, player.fromTime);
      else applyPlayer(player.clip, player.time);
    }
    sourcePos.set(pos);
    sourceQuat.set(quat);
    sourceScale.set(scale);
  };

  const composePose = () => {
    if (transition) captureSource();
    resetPose();
    applyClip();
    blendTransition();
    updateWorld();
    applySpline();
    applyIk();
  };

  // A finished one-shot state follows its unconditional exit transition, the
  // way the controller settles an intro into the lobby loop.
  const advanceState = (player: Playing) => {
    if (player.returnTo) {
      const next = player.byName.get(player.returnTo);
      player.returnTo = null;
      if (next) { beginTransition(); player.clip = next; player.time = 0; return true; }
    }
    const state = player.def.states?.[String(player.state)];
    const exit = state?.exit;
    if (exit == null) return false;
    const target = player.def.states?.[String(exit)];
    const next = target?.clip ? player.byName.get(target.clip) : null;
    if (!next) return false;
    beginTransition();
    player.state = exit;
    player.clip = next;
    player.time = 0;
    return true;
  };

  // Every animation event in the catalogue is EventDynamicBone(<chain name>),
  // which re-seeds the named chain at that point in the clip.
  const fireEvents = (clip: SkinnedClip, from: number, to: number) => {
    if (!clip.events?.length) return;
    for (const event of clip.events) {
      if (event.t <= from || event.t > to) continue;
      for (const chain of chains) {
        if (chain.def.name === event.chain) resetChain(chain, view);
      }
    }
  };

  const stateOf = (player: Playing) =>
    (player.state == null ? undefined : player.def.states?.[String(player.state)]);

  const stepPlayer = (player: Playing, dt: number) => {
    const { clip } = player;
    if (!clip || clip.length <= 0) return;
    const previous = player.time;
    player.time += dt * (stateOf(player)?.speed ?? 1);
    fireEvents(clip, previous, player.time);
    // The exit fade starts before the last frame, so the outgoing clip is still
    // moving while it crossfades; a clip that has already ended cannot fade.
    const state = stateOf(player);
    // Unity's authored exit time is normalised; the fade is already in seconds.
    const exitAt = state?.exitTime != null
      ? state.exitTime * clip.length
      : clip.length - Math.min(transitionDuration, clip.length / 2);
    const fade = state?.fade ?? transitionDuration;
    const lead = Math.min(Math.max(fade, 0), clip.length / 2);
    if (player.time >= Math.min(exitAt, clip.length - lead) && advanceState(player)) return;
    if (player.time < clip.length) return;
    if (clip.loop) player.time %= clip.length;
    else player.time = clip.length;
  };

  const updateWorld = () => {
    for (let i = 0; i < count; i += 1) {
      compose(local, i * 16, pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2],
              quat[i * 4], quat[i * 4 + 1], quat[i * 4 + 2], quat[i * 4 + 3],
              scale[i * 3], scale[i * 3 + 1], scale[i * 3 + 2]);
      quatMat3(localRot, i * 9, quat[i * 4], quat[i * 4 + 1],
               quat[i * 4 + 2], quat[i * 4 + 3]);
      const parent = doc.nodes[i].parent;
      if (parent < 0) {
        world.set(local.subarray(i * 16, i * 16 + 16), i * 16);
        worldRot.set(localRot.subarray(i * 9, i * 9 + 9), i * 9);
        visible[i] = nodeOverrides[i] >= 0 ? nodeOverrides[i] : selfActive[i];
      } else {
        const out = new Float32Array(16);
        multiply(out, world, parent * 16, local, i * 16);
        world.set(out, i * 16);
        multiply3(worldRot, i * 9, worldRot, parent * 9, localRot, i * 9);
        const active = nodeOverrides[i] >= 0 ? nodeOverrides[i] : selfActive[i];
        visible[i] = active && visible[parent] ? 1 : 0;
      }
    }
  };

  const childrenOf: number[][] = doc.nodes.map(() => []);
  doc.nodes.forEach((n, i) => { if (n.parent >= 0) childrenOf[n.parent].push(i); });

  const refreshChildren = (node: number) => {
    for (const child of childrenOf[node]) {
      const out = new Float32Array(16);
      multiply(out, world, node * 16, local, child * 16);
      world.set(out, child * 16);
      multiply3(worldRot, child * 9, worldRot, node * 9, localRot, child * 9);
      refreshChildren(child);
    }
  };

  const refreshNode = (node: number) => {
    compose(local, node * 16, pos[node * 3], pos[node * 3 + 1], pos[node * 3 + 2],
            quat[node * 4], quat[node * 4 + 1], quat[node * 4 + 2], quat[node * 4 + 3],
            scale[node * 3], scale[node * 3 + 1], scale[node * 3 + 2]);
    quatMat3(localRot, node * 9, quat[node * 4], quat[node * 4 + 1],
             quat[node * 4 + 2], quat[node * 4 + 3]);
    const parent = doc.nodes[node].parent;
    if (parent < 0) {
      world.set(local.subarray(node * 16, node * 16 + 16), node * 16);
      worldRot.set(localRot.subarray(node * 9, node * 9 + 9), node * 9);
    } else {
      const out = new Float32Array(16);
      multiply(out, world, parent * 16, local, node * 16);
      world.set(out, node * 16);
      multiply3(worldRot, node * 9, worldRot, parent * 9, localRot, node * 9);
    }
    refreshChildren(node);
  };

  const rotateWorldZ = (node: number, angle: number) => {
    const o = node * 16;
    const c = Math.cos(angle), s = Math.sin(angle);
    for (let column = 0; column < 3; column += 1) {
      const x = world[o + column], y = world[o + 4 + column];
      world[o + column] = c * x - s * y;
      world[o + 4 + column] = s * x + c * y;
      const rx = worldRot[node * 9 + column], ry = worldRot[node * 9 + 3 + column];
      worldRot[node * 9 + column] = c * rx - s * ry;
      worldRot[node * 9 + 3 + column] = s * rx + c * ry;
    }
    refreshChildren(node);
  };

  const aimNode = (node: number, end: number, target: number, damping = 1) => {
    const n = node * 16, e = end * 16, t = target * 16;
    const current = Math.atan2(world[e + 7] - world[n + 7], world[e + 3] - world[n + 3]);
    const wanted = Math.atan2(world[t + 7] - world[n + 7], world[t + 3] - world[n + 3]);
    let delta = wanted - current;
    delta = Math.atan2(Math.sin(delta), Math.cos(delta)) * damping;
    rotateWorldZ(node, delta);
  };

  const copyWorldRotation = (node: number, source: number,
                             offset: [number, number, number, number]) => {
    const n = node * 16, s = source * 16;
    const sourceScale = [
      Math.hypot(world[s], world[s + 4], world[s + 8]) || 1,
      Math.hypot(world[s + 1], world[s + 5], world[s + 9]) || 1,
      Math.hypot(world[s + 2], world[s + 6], world[s + 10]) || 1,
    ];
    const targetScale = [
      Math.hypot(world[n], world[n + 4], world[n + 8]),
      Math.hypot(world[n + 1], world[n + 5], world[n + 9]),
      Math.hypot(world[n + 2], world[n + 6], world[n + 10]),
    ];
    const rotation = new Float32Array(16);
    compose(rotation, 0, 0, 0, 0, offset[0], offset[1], offset[2], offset[3], 1, 1, 1);
    const basis = new Float32Array([
      world[s] / sourceScale[0], world[s + 1] / sourceScale[1], world[s + 2] / sourceScale[2],
      world[s + 4] / sourceScale[0], world[s + 5] / sourceScale[1], world[s + 6] / sourceScale[2],
      world[s + 8] / sourceScale[0], world[s + 9] / sourceScale[1], world[s + 10] / sourceScale[2],
    ]);
    const turn = new Float32Array([
      rotation[0], rotation[1], rotation[2], rotation[4], rotation[5], rotation[6],
      rotation[8], rotation[9], rotation[10],
    ]);
    const result = new Float32Array(9);
    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 3; column += 1) {
        result[row * 3 + column] = basis[row * 3] * turn[column]
          + basis[row * 3 + 1] * turn[3 + column]
          + basis[row * 3 + 2] * turn[6 + column];
        world[n + row * 4 + column] = result[row * 3 + column] * targetScale[column];
      }
    }
    worldRot.set(result, node * 9);
    refreshChildren(node);
  };

  type Quat = [number, number, number, number];

  const quatMul = (a: Quat, b: Quat): Quat => [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ];

  const angleAxis = (degrees: number, axis: [number, number, number]): Quat => {
    const length = Math.hypot(axis[0], axis[1], axis[2]);
    if (length < 1e-9) return [0, 0, 0, 1];
    const half = degrees * DEG * 0.5;
    const s = Math.sin(half) / length;
    return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(half)];
  };

  const matrixQuat = (m: number[]): Quat => {
    const trace = m[0] + m[4] + m[8];
    let x: number, y: number, z: number, w: number;
    if (trace > 0) {
      const s = Math.sqrt(trace + 1) * 2;
      w = 0.25 * s; x = (m[7] - m[5]) / s;
      y = (m[2] - m[6]) / s; z = (m[3] - m[1]) / s;
    } else if (m[0] > m[4] && m[0] > m[8]) {
      const s = Math.sqrt(1 + m[0] - m[4] - m[8]) * 2;
      w = (m[7] - m[5]) / s; x = 0.25 * s;
      y = (m[1] + m[3]) / s; z = (m[2] + m[6]) / s;
    } else if (m[4] > m[8]) {
      const s = Math.sqrt(1 + m[4] - m[0] - m[8]) * 2;
      w = (m[2] - m[6]) / s; x = (m[1] + m[3]) / s;
      y = 0.25 * s; z = (m[5] + m[7]) / s;
    } else {
      const s = Math.sqrt(1 + m[8] - m[0] - m[4]) * 2;
      w = (m[3] - m[1]) / s; x = (m[2] + m[6]) / s;
      y = (m[5] + m[7]) / s; z = 0.25 * s;
    }
    const length = Math.hypot(x, y, z, w) || 1;
    return [x / length, y / length, z / length, w / length];
  };

  const lookRotation = (forward: number[], up: [number, number, number]): Quat => {
    const fl = Math.hypot(forward[0], forward[1], forward[2]);
    if (fl < 1e-9) return [0, 0, 0, 1];
    const z = [forward[0] / fl, forward[1] / fl, forward[2] / fl];
    let x = [up[1] * z[2] - up[2] * z[1],
             up[2] * z[0] - up[0] * z[2],
             up[0] * z[1] - up[1] * z[0]];
    let xl = Math.hypot(x[0], x[1], x[2]);
    if (xl < 1e-9) {
      const fallback = Math.abs(z[1]) < 0.99 ? [0, 1, 0] : [1, 0, 0];
      x = [fallback[1] * z[2] - fallback[2] * z[1],
           fallback[2] * z[0] - fallback[0] * z[2],
           fallback[0] * z[1] - fallback[1] * z[0]];
      xl = Math.hypot(x[0], x[1], x[2]);
    }
    x = x.map((v) => v / xl);
    const y = [z[1] * x[2] - z[2] * x[1],
               z[2] * x[0] - z[0] * x[2],
               z[0] * x[1] - z[1] * x[0]];
    return matrixQuat([x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]]);
  };

  const worldQuat = (node: number): Quat => {
    const o = node * 16;
    const sx = Math.hypot(world[o], world[o + 4], world[o + 8]) || 1;
    const sy = Math.hypot(world[o + 1], world[o + 5], world[o + 9]) || 1;
    const sz = Math.hypot(world[o + 2], world[o + 6], world[o + 10]) || 1;
    return matrixQuat([
      world[o] / sx, world[o + 1] / sy, world[o + 2] / sz,
      world[o + 4] / sx, world[o + 5] / sy, world[o + 6] / sz,
      world[o + 8] / sx, world[o + 9] / sy, world[o + 10] / sz,
    ]);
  };

  const setWorldQuat = (node: number, rotation: Quat) => {
    const o = node * 16;
    const sx = Math.hypot(world[o], world[o + 4], world[o + 8]);
    const sy = Math.hypot(world[o + 1], world[o + 5], world[o + 9]);
    const sz = Math.hypot(world[o + 2], world[o + 6], world[o + 10]);
    const matrix = new Float32Array(16);
    compose(matrix, 0, 0, 0, 0, rotation[0], rotation[1], rotation[2], rotation[3], sx, sy, sz);
    world[o] = matrix[0]; world[o + 1] = matrix[1]; world[o + 2] = matrix[2];
    world[o + 4] = matrix[4]; world[o + 5] = matrix[5]; world[o + 6] = matrix[6];
    world[o + 8] = matrix[8]; world[o + 9] = matrix[9]; world[o + 10] = matrix[10];
    quatMat3(worldRot, node * 9, rotation[0], rotation[1], rotation[2], rotation[3]);
    refreshChildren(node);
  };

  const setWorldPos = (node: number, point: number[]) => {
    const o = node * 16;
    world[o + 3] = point[0]; world[o + 7] = point[1]; world[o + 11] = point[2];
    refreshChildren(node);
  };

  const worldPos = (node: number): number[] =>
    [world[node * 16 + 3], world[node * 16 + 7], world[node * 16 + 11]];

  // Puppet2D's Catmull-Rom basis, evaluated per axis.
  const pointOnCurve = (p0: number[], p1: number[], p2: number[], p3: number[],
                        t: number): number[] => {
    const t0 = ((-t + 2) * t - 1) * t * 0.5;
    const t1 = (((3 * t - 5) * t) * t + 2) * 0.5;
    const t2 = ((-3 * t + 4) * t + 1) * t * 0.5;
    const t3 = ((t - 1) * t * t) * 0.5;
    return [0, 1, 2].map((k) => p0[k] * t0 + p1[k] * t1 + p2[k] * t2 + p3[k] * t3);
  };

  // Puppet2D_SplineControl.Run: bones are placed along a Catmull-Rom through the
  // control transforms, so a strap skinned to them is dead geometry without it.
  const applySpline = () => {
    for (const spline of doc.puppetSpline ?? []) {
      const ctrls = spline.ctrls ?? [];
      if (!spline.enabled || ctrls.length < 4 || ctrls.some((c) => c < 0)) continue;
      const samples = Math.max(1, spline.samples);
      const points: number[][] = [];
      for (let n = 1; n < ctrls.length - 2; n += 1) {
        for (let i = 0; i < samples; i += 1) {
          points.push(pointOnCurve(worldPos(ctrls[n - 1]), worldPos(ctrls[n]),
                                   worldPos(ctrls[n + 1]), worldPos(ctrls[n + 2]),
                                   i / samples));
        }
      }
      points.push(worldPos(ctrls[ctrls.length - 2]));
      // Unity's eulerAngles decompose as Y * X * Z, so Y is the matrix's XZ turn.
      const o = spline.node >= 0 ? spline.node * 9 : -1;
      const yaw = o < 0 ? 0 : Math.atan2(worldRot[o + 2], worldRot[o + 8]);
      const angleOffset: Quat = [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)];
      const last = points.length - 1;
      for (let i = 0; i < points.length; i += 1) {
        const bone = spline.bones[i];
        if (bone == null || bone < 0) continue;
        setWorldPos(bone, points[i]);
        if (i === last) {
          setWorldQuat(bone, worldQuat(ctrls[ctrls.length - 2]));
        } else if (i === 0 && points.length > 2) {
          setWorldQuat(bone, worldQuat(ctrls[1]));
        } else {
          const aim = [points[i][0] - points[i + 1][0],
                       points[i][1] - points[i + 1][1],
                       points[i][2] - points[i + 1][2]];
          setWorldQuat(bone, quatMul(quatMul(
            lookRotation(aim, [0, 0, 1]), angleAxis(90, [-1, 0, 0])), angleOffset));
        }
      }
    }
  };

  const applyIk = () => {
    for (const ik of doc.puppetIk ?? []) {
      if (!ik.enabled || ik.node < 0) continue;
      if (ik.mode === 1 && ik.end >= 0 && ik.start >= 0) {
        for (let pass = 0; pass < Math.max(1, ik.iterations); pass += 1) {
          let node = doc.nodes[ik.end].parent;
          while (node >= 0) {
            aimNode(node, ik.end, ik.node, ik.damping);
            if (node === ik.start) break;
            node = doc.nodes[node].parent;
          }
        }
        continue;
      }
      if (ik.top < 0 || ik.middle < 0 || ik.bottom < 0) continue;
      const a = ik.top * 16, b = ik.middle * 16, c = ik.bottom * 16, t = ik.node * 16;
      let l1 = Math.hypot(world[b + 3] - world[a + 3], world[b + 7] - world[a + 7],
                          world[b + 11] - world[a + 11]);
      let l2 = Math.hypot(world[c + 3] - world[b + 3], world[c + 7] - world[b + 7],
                          world[c + 11] - world[b + 11]);
      const target = [world[t + 3], world[t + 7], world[t + 11]];
      const targetVector = [target[0] - world[a + 3], target[1] - world[a + 7],
                            target[2] - world[a + 11]];
      const targetDistance = Math.hypot(...targetVector);
      if (ik.squash && targetDistance > l1 + l2 && ik.scaleStart[0]) {
        scale[ik.top * 3] = ik.scaleStart[0][0];
        scale[ik.top * 3 + 1] = ik.scaleStart[0][1] * targetDistance / (l1 + l2);
        scale[ik.top * 3 + 2] = ik.scaleStart[0][2];
        refreshNode(ik.top);
        l1 = Math.hypot(world[b + 3] - world[a + 3], world[b + 7] - world[a + 7],
                        world[b + 11] - world[a + 11]);
        l2 = Math.hypot(world[c + 3] - world[b + 3], world[c + 7] - world[b + 7],
                        world[c + 11] - world[b + 11]);
      }
      const distance = Math.max(1e-6, Math.min(targetDistance, l1 + l2 - 1e-4));
      const cosine = Math.max(-1, Math.min(1,
        (l1 * l1 + distance * distance - l2 * l2) / (2 * l1 * distance)));
      const angle = Math.acos(cosine) / DEG;
      const flipRotation = ik.flip ? 1 : -1;
      const topRotation = quatMul(quatMul(
        lookRotation(targetVector, ik.aim), angleAxis(90, ik.up)),
        angleAxis(angle * flipRotation, [0, 0, 1]));
      setWorldQuat(ik.top, topRotation);
      const middleVector = [target[0] - world[b + 3], target[1] - world[b + 7],
                            target[2] - world[b + 11]];
      setWorldQuat(ik.middle, quatMul(lookRotation(middleVector, ik.aim), angleAxis(90, ik.up)));
      setWorldQuat(ik.bottom, quatMul(worldQuat(ik.node), ik.offset));
      if (ik.scale && ik.offsetScale) {
        scale[ik.bottom * 3] = scale[ik.node * 3] * ik.offsetScale[0];
        scale[ik.bottom * 3 + 1] = scale[ik.node * 3 + 1] * ik.offsetScale[1];
        scale[ik.bottom * 3 + 2] = scale[ik.node * 3 + 2] * ik.offsetScale[2];
      }
    }
  };

  const view: RigView = {
    world: (node) => world.subarray(node * 16, node * 16 + 16),
    dir: (node, v) => {
      const o = node * 9;
      return [
        worldRot[o] * v[0] + worldRot[o + 1] * v[1] + worldRot[o + 2] * v[2],
        worldRot[o + 3] * v[0] + worldRot[o + 4] * v[1] + worldRot[o + 5] * v[2],
        worldRot[o + 6] * v[0] + worldRot[o + 7] * v[1] + worldRot[o + 8] * v[2],
      ];
    },
    localPos: (node) => [pos[node * 3], pos[node * 3 + 1], pos[node * 3 + 2]],
    parent: (node) => doc.nodes[node].parent,
    childCount: (node) => childrenOf[node].length,
    children: (node) => childrenOf[node],
  };

  applyClip();
  updateWorld();
  applySpline();
  applyIk();
  let chains: Chain[] = buildChains(dynamicDefs, view);
  let physicsEnabled = chains.length > 0;

  const accum = new Map<number, Float32Array>();

  // Rotation taking v0 onto v1, as a row-major 3x3.
  const fromTo = (out: Float32Array, v0: number[], v1: number[]): Float32Array => {
    const l0 = Math.hypot(v0[0], v0[1], v0[2]);
    const l1 = Math.hypot(v1[0], v1[1], v1[2]);
    out.set([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    if (l0 < 1e-9 || l1 < 1e-9) return out;
    const ax = v0[0] / l0, ay = v0[1] / l0, az = v0[2] / l0;
    const bx = v1[0] / l1, by = v1[1] / l1, bz = v1[2] / l1;
    const cx = ay * bz - az * by;
    const cy = az * bx - ax * bz;
    const cz = ax * by - ay * bx;
    const dot = Math.max(-1, Math.min(1, ax * bx + ay * by + az * bz));
    const s = Math.hypot(cx, cy, cz);
    if (s < 1e-9) {
      if (dot > 0) return out;
      // Opposed: turn a half circle about any perpendicular axis.
      const px = Math.abs(ax) < 0.9 ? 1 : 0;
      return fromTo(out, [ax, ay, az], [ax + px, ay + (px ? 0 : 1), az]);
    }
    const nx = cx / s, ny = cy / s, nz = cz / s;
    const angle = Math.atan2(s, dot);
    const c = Math.cos(angle), si = Math.sin(angle), t = 1 - c;
    out[0] = t * nx * nx + c;      out[1] = t * nx * ny - si * nz; out[2] = t * nx * nz + si * ny;
    out[3] = t * nx * ny + si * nz; out[4] = t * ny * ny + c;      out[5] = t * ny * nz - si * nx;
    out[6] = t * nx * nz - si * ny; out[7] = t * ny * nz + si * nx; out[8] = t * nz * nz + c;
    return out;
  };

  // Unity's ApplyParticlesToTransforms writes a scale-free world rotation, so the
  // turn accumulates on Transform.rotation and the world matrix is recomposed
  // from the parent's basis. Left-multiplying the world matrix instead skews any
  // rig whose root carries a non-uniform (flattening) scale.
  const applyChain = (chain: Chain) => {
    const { particles } = chain;
    const identity = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    const kids: number[][] = particles.map(() => []);
    particles.forEach((p, i) => { if (p.parent >= 0) kids[p.parent].push(i); });
    accum.clear();
    const turns = new Map<number, Float32Array>();

    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      if (p.node < 0) continue;
      const carry = accum.get(i) ?? identity;
      const turned = new Float32Array(9);
      multiply3(turned, 0, carry, 0, worldRot, p.node * 9);

      let childCarry = carry;
      if (kids[i].length === 1 && childrenOf[p.node].length <= 1) {
        const child = particles[kids[i][0]];
        const [lx, ly, lz] = child.offset ?? view.localPos(child.node);
        const v0 = [
          turned[0] * lx + turned[1] * ly + turned[2] * lz,
          turned[3] * lx + turned[4] * ly + turned[5] * lz,
          turned[6] * lx + turned[7] * ly + turned[8] * lz,
        ];
        const v1 = [child.x - p.x, child.y - p.y, child.z - p.z];
        const rot = fromTo(new Float32Array(9), v0, v1);
        multiply3(rot3, 0, rot, 0, turned, 0);
        turned.set(rot3);
        childCarry = new Float32Array(9);
        multiply3(childCarry, 0, rot, 0, carry, 0);
      }
      for (const k of kids[i]) accum.set(k, childCarry);
      turns.set(p.node, turned);

      const tp = doc.nodes[p.node].parent;
      const parentTurn = tp >= 0 ? turns.get(tp) : undefined;
      const q = parentTurn ?? (tp >= 0
        ? worldRot.subarray(tp * 9, tp * 9 + 9) : identity);
      // localRotation = inverse(parent world rotation) * world rotation
      for (let r = 0; r < 3; r += 1) {
        for (let c = 0; c < 3; c += 1) {
          rot3[r * 3 + c] = q[r] * turned[c] + q[3 + r] * turned[3 + c]
            + q[6 + r] * turned[6 + c];
        }
      }
      const m = p.node * 16;
      const sx = scale[p.node * 3], sy = scale[p.node * 3 + 1], sz = scale[p.node * 3 + 2];
      for (let r = 0; r < 3; r += 1) {
        for (let c = 0; c < 3; c += 1) {
          let sum = 0;
          if (tp >= 0) {
            const t = tp * 16;
            sum = world[t + r * 4] * rot3[c] + world[t + r * 4 + 1] * rot3[3 + c]
              + world[t + r * 4 + 2] * rot3[6 + c];
          } else sum = rot3[r * 3 + c];
          world[m + r * 4 + c] = sum * (c === 0 ? sx : c === 1 ? sy : sz);
        }
      }
      world[m + 3] = p.x; world[m + 7] = p.y; world[m + 11] = p.z;
      for (const child of childrenOf[p.node]) {
        if (chain.nodes.has(child)) continue;
        const out = new Float32Array(16);
        multiply(out, world, m, local, child * 16);
        world.set(out, child * 16);
        refreshChildren(child);
      }
    }
  };

  const stepPhysics = (dt: number) => {
    if (!physicsEnabled || dt <= 0) return;
    for (const chain of chains) {
      if (!chain.def.enabled) { resetChain(chain, view); continue; }
      stepChain(chain, dt, view);
      applyChain(chain);
    }
  };

  const skinMats = doc.renderers.map((r) =>
    (r.kind === 'skinned' ? new Float32Array(r.mesh.bones.length * 16) : null));
  const outputs = doc.renderers.map((r) =>
    new Float32Array((r.kind === 'sprite'
      ? r.mesh.verts.length / 2 : r.mesh.verts.length / 3) * 2));
  const depths = new Float32Array(doc.renderers.length);
  const morphBuffers: (Float32Array | null)[] = doc.renderers.map(() => null);
  const meshOverrides: (SkinnedMesh | null)[] = doc.renderers.map(() => null);
  const bindScratch = new Float32Array(16);
  const matScratch = new Float32Array(16);
  const IDENTITY = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

  const buildVertices = (index: number) => {
    const renderer = doc.renderers[index];
    const out = outputs[index];
    if (renderer.kind === 'sprite') {
      const m = renderer.node * 16;
      const v = renderer.mesh.verts;
      // SpriteRenderer mirrors about the sprite's own axes before the transform.
      const fx = renderer.flip[0] ? -1 : 1;
      const fy = renderer.flip[1] ? -1 : 1;
      for (let i = 0, n = v.length / 2; i < n; i += 1) {
        const x = v[i * 2] * fx;
        const y = v[i * 2 + 1] * fy;
        out[i * 2] = world[m] * x + world[m + 1] * y + world[m + 3];
        out[i * 2 + 1] = -(world[m + 4] * x + world[m + 5] * y + world[m + 7]);
      }
      return out;
    }
    if (renderer.kind === 'mesh') {
      // A MeshRenderer prop is rigid: its mesh rides its node's transform whole.
      const m = renderer.node * 16;
      const v = renderer.mesh.verts;
      for (let i = 0, n = v.length / 3; i < n; i += 1) {
        const x = v[i * 3], y = v[i * 3 + 1], z = v[i * 3 + 2];
        out[i * 2] = world[m] * x + world[m + 1] * y + world[m + 2] * z + world[m + 3];
        out[i * 2 + 1] = -(world[m + 4] * x + world[m + 5] * y + world[m + 6] * z
          + world[m + 7]);
      }
      return out;
    }
    const activeMesh = meshOverrides[index] ?? renderer.mesh;
    const { bones, bindposes, boneIdx, boneWeights, verts, shapes } = activeMesh;
    const count3 = verts.length / 3;

    // Blendshape deltas are sparse and apply before skinning.
    let morphed: Float32Array | number[] = verts;
    const weights = shapeWeights[index];
    if (shapes && weights && weights.some((w) => w !== 0)) {
      let buffer = morphBuffers[index];
      if (!buffer) { buffer = new Float32Array(verts.length); morphBuffers[index] = buffer; }
      buffer.set(verts);
      shapes.forEach((shape, k) => {
        const amount = weights[k] / (shape.full || 100);
        if (amount === 0) return;
        const { deltas } = shape;
        for (let d = 0; d < deltas.length; d += 4) {
          const v = deltas[d] * 3;
          buffer![v] += deltas[d + 1] * amount;
          buffer![v + 1] += deltas[d + 2] * amount;
          buffer![v + 2] += deltas[d + 3] * amount;
        }
      });
      morphed = buffer;
    }

    // A bone-less SkinnedMeshRenderer draws through its own transform.
    if (!bones.length) {
      const m = renderer.node * 16;
      for (let i = 0; i < count3; i += 1) {
        const x = morphed[i * 3], y = morphed[i * 3 + 1], z = morphed[i * 3 + 2];
        out[i * 2] = world[m] * x + world[m + 1] * y + world[m + 2] * z + world[m + 3];
        out[i * 2 + 1] = -(world[m + 4] * x + world[m + 5] * y
          + world[m + 6] * z + world[m + 7]);
      }
      return out;
    }

    const mats = skinMats[index]!;
    for (let b = 0; b < bones.length; b += 1) {
      const node = bones[b];
      if (node < 0) { mats.set(IDENTITY, b * 16); continue; }
      for (let k = 0; k < 16; k += 1) bindScratch[k] = bindposes[b * 16 + k];
      multiply(matScratch, world, node * 16, bindScratch, 0);
      mats.set(matScratch, b * 16);
    }
    for (let i = 0; i < count3; i += 1) {
      const x = morphed[i * 3], y = morphed[i * 3 + 1], z = morphed[i * 3 + 2];
      let px = 0;
      let py = 0;
      for (let k = 0; k < 4; k += 1) {
        const w = boneWeights[i * 4 + k];
        if (w === 0) continue;
        const m = boneIdx[i * 4 + k] * 16;
        px += w * (mats[m] * x + mats[m + 1] * y + mats[m + 2] * z + mats[m + 3]);
        py += w * (mats[m + 4] * x + mats[m + 5] * y + mats[m + 6] * z + mats[m + 7]);
      }
      out[i * 2] = px;
      out[i * 2 + 1] = -py;
    }
    return out;
  };

  // Unity's orthographic sort: larger world z is farther, so it draws first.
  const drawOrder = () => {
    const order: number[] = [];
    doc.renderers.forEach((renderer, i) => {
      depths[i] = world[renderer.node * 16 + 11];
      order.push(i);
    });
    order.sort((a, b) => {
      // Unity sorts by sorting layer before sorting order.
      const band = (doc.renderers[a].layer ?? 0) - (doc.renderers[b].layer ?? 0);
      if (band !== 0) return band;
      const layer = sortOrder[a] - sortOrder[b];
      if (layer !== 0) return layer;
      if (depths[a] !== depths[b]) return depths[b] - depths[a];
      return a - b;
    });
    return order;
  };

  return {
    doc,
    world,
    worldRot,
    visible,
    get clipName() { return main?.clip?.name ?? null; },
    get time() { return main?.time ?? 0; },
    get length() { return main?.clip?.length ?? 0; },
    clipNames: () => main?.def.clips.map((c) => c.name) ?? [],
    setClip(name: string, restart = true) {
      const next = main?.byName.get(name);
      if (!main || !next) return false;
      beginTransition();
      main.clip = next;
      main.returnTo = null;
      if (restart) main.time = 0;
      composePose();
      for (const chain of chains) resetChain(chain, view);
      return true;
    },
    seek(seconds: number) {
      clearTransition();
      for (const player of players) player.time = seconds;
      composePose();
      for (const chain of chains) resetChain(chain, view);
    },
    advance(dt: number) {
      if (transition) { transition.elapsed += dt; stepSource(dt); }
      for (const player of players) stepPlayer(player, dt);
      composePose();
      stepPhysics(dt);
    },
    playOnce(name: string, then?: string) {
      const next = main?.byName.get(name);
      if (!main || !next) return false;
      beginTransition();
      main.returnTo = then ?? null;
      main.clip = next;
      main.time = 0;
      composePose();
      for (const chain of chains) resetChain(chain, view);
      return true;
    },
    get physics() { return physicsEnabled; },
    setPhysics(on: boolean) {
      physicsEnabled = on;
      if (on) for (const chain of chains) resetChain(chain, view);
    },
    chainCount: () => chains.length,
    colliders: doc.colliders ?? [],
    // Walks the AnimatorController graph: `Tep_1` is a body touch, `breast` a
    // special-zone touch.
    trigger(name: string) {
      const firing: { player: Playing; dest: number; clip: SkinnedClip }[] = [];
      for (const player of mainLayers) {
        if (player.state == null) continue;
        const dest = player.def.triggers?.[String(player.state)]?.[name];
        if (dest == null) continue;
        const clip = player.def.states?.[String(dest)]?.clip;
        const next = clip ? player.byName.get(clip) : undefined;
        if (next) firing.push({ player, dest, clip: next });
      }
      if (!firing.length) return false;
      beginTransition();
      for (const { player, dest, clip } of firing) {
        player.state = dest;
        player.returnTo = null;
        player.clip = clip;
        player.time = 0;
      }
      composePose();
      for (const chain of chains) resetChain(chain, view);
      return true;
    },
    triggerNames: () => {
      const names = new Set<string>();
      for (const map of Object.values(main?.def.triggers ?? {})) {
        for (const key of Object.keys(map)) names.add(key);
      }
      return Array.from(names);
    },
    /** Zone under a point in the same space `buildVertices` returns. */
    hitZone(x: number, y: number) {
      let best: SkinnedCollider | null = null;
      let bestArea = Infinity;
      for (const zone of doc.colliders ?? []) {
        if (zone.node < 0) continue;
        const m = zone.node * 16;
        const [cx, cy, cz] = zone.center;
        const px = world[m] * cx + world[m + 1] * cy + world[m + 2] * cz + world[m + 3];
        const py = -(world[m + 4] * cx + world[m + 5] * cy + world[m + 6] * cz + world[m + 7]);
        const sx = Math.hypot(world[m], world[m + 4], world[m + 8]);
        const sy = Math.hypot(world[m + 1], world[m + 5], world[m + 9]);
        const halfW = (zone.size[0] * sx) / 2;
        const halfH = (zone.size[1] * sy) / 2;
        if (Math.abs(x - px) <= halfW && Math.abs(y - py) <= halfH) {
          const area = halfW * halfH;
          if (area < bestArea) { best = zone; bestArea = area; }
        }
      }
      return best;
    },
    alpha,
    tint,
    setNodeOverride(node: number, value: boolean | null) {
      if (node < 0 || node >= count) return;
      nodeOverrides[node] = value == null ? -1 : value ? 1 : 0;
    },
    refreshWorld() { updateWorld(); applySpline(); applyIk(); },
    setMeshVariant(index: number, mesh: SkinnedMesh | null) {
      meshOverrides[index] = mesh;
      morphBuffers[index] = null;
    },
    isVisible: (index: number) => visible[doc.renderers[index].node] === 1
      && enabled[index] === 1 && objectVisible[index] === 1 && alpha[index] > 0.001,
    textureName: (index: number) => objectTexture[index] ?? doc.renderers[index].tex,
    buildVertices,
    drawOrder,
  };
}
