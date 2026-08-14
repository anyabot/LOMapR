export type PCurve = { m: number; s: number; n?: number; k?: PKey[]; j?: PKey[] };
export type PKey = [number, number, number | null, number | null];
export type PStops = { c: [number, number, number, number][]; a: [number, number][]; f: number };
export type PGradient = {
  m: number;
  c?: [number, number, number, number];
  d?: [number, number, number, number];
  g?: PStops; h?: PStops;
};

export type EmitterDef = {
  name: string;
  node: number;
  tex: string | null;
  order: number;
  blend: 'add' | 'normal';
  tiles: [number, number];
  duration: number;
  looping: boolean;
  playOnAwake: boolean;
  simulationSpeed: number;
  maxParticles: number;
  startDelay: PCurve;
  align: number;
  // ParticleSystemRenderMode: 0 billboard, 4 mesh (draws `mesh`), 5 none.
  renderMode?: number;
  mesh?: string;
  pivot?: [number, number, number];
  start: {
    lifetime: PCurve; speed: PCurve; size: PCurve; sizeY: PCurve | null;
    rotation: PCurve; color: PGradient; gravity: PCurve; flipRotation: number;
  };
  emission?: { rate: PCurve; bursts: { t: number; n: PCurve; cycles: number; interval: number; probability: number }[] };
  shape?: {
    type: number; radius: number; radiusThickness: number; arc: number;
    arcMode: number; angle: number; length: number;
    position: [number, number, number]; rotation: [number, number, number];
    scale: [number, number, number];
    randomDirection: number; sphericalDirection: number; alignToDirection: boolean;
  };
  size?: { curve: PCurve; y: PCurve; separateAxes: boolean };
  color?: { gradient: PGradient };
  velocity?: { x: PCurve; y: PCurve; radial: PCurve; speedModifier: PCurve; inWorldSpace: boolean };
  spin?: { curve: PCurve };
  force?: { x: PCurve; y: PCurve; randomizePerFrame: boolean };
  uv?: { frame: PCurve; startFrame: PCurve; cycles: number; animationType: number; rowMode: number; rowIndex: number };
};

export type Particle = {
  x: number; y: number; z: number;
  size: number; sizeY: number;
  angle: number;
  r: number; g: number; b: number; a: number;
  frame: number;
};

type Live = Particle & {
  age: number; lifetime: number;
  vx: number; vy: number; vz: number;
  ax: number; ay: number; az: number;
  size0: number; sizeY0: number; spin: number; frame0: number;
  color0: [number, number, number, number];
  rolls: number[];
};

const ROLL_LIFETIME = 0, ROLL_SPEED = 1, ROLL_SIZE = 2, ROLL_ROTATION = 3;
const ROLL_COLOR = 4, ROLL_SIZE_OL = 5, ROLL_COLOR_OL = 6, ROLL_VELOCITY = 7;
const ROLL_SPIN = 8, ROLL_FORCE = 9, ROLL_FRAME = 10, ROLL_GRAVITY = 11;
const ROLLS = 12;

const GRAVITY = 9.81;
const DEG = Math.PI / 180;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Cubic Hermite between keys, clamped outside, stepped on an infinite tangent.
function curveAt(keys: PKey[] | undefined, time: number): number {
  if (!keys || !keys.length) return 0;
  if (keys.length === 1) return keys[0][1];
  if (time <= keys[0][0]) return keys[0][1];
  const last = keys[keys.length - 1];
  if (time >= last[0]) return last[1];
  let index = 0;
  while (index < keys.length - 2 && keys[index + 1][0] <= time) index += 1;
  const [t0, v0, , out0] = keys[index];
  const [t1, v1, in1] = keys[index + 1];
  const span = t1 - t0;
  if (span <= 0) return v1;
  if (out0 === null || in1 === null || in1 === undefined) return v0;
  const u = (time - t0) / span;
  const uu = u * u;
  const uuu = uu * u;
  return (2 * uuu - 3 * uu + 1) * v0 + (uuu - 2 * uu + u) * out0 * span
    + (-2 * uuu + 3 * uu) * v1 + (uuu - uu) * in1 * span;
}

export function valueAt(curve: PCurve | undefined | null, t: number, roll: number): number {
  if (!curve) return 0;
  switch (curve.m) {
    case 1: return curveAt(curve.k, t) * curve.s;
    case 2: return lerp(curveAt(curve.j, t), curveAt(curve.k, t), roll) * curve.s;
    case 3: return lerp(curve.n ?? curve.s, curve.s, roll);
    default: return curve.s;
  }
}

type Rgba = [number, number, number, number];

function gradientAt(stops: PStops | undefined, t: number): Rgba {
  if (!stops) return [1, 1, 1, 1];
  const step = stops.f === 1;
  const out: Rgba = [1, 1, 1, 1];
  if (stops.c.length) {
    let i = 0;
    while (i < stops.c.length - 1 && stops.c[i + 1][0] <= t) i += 1;
    const key = stops.c[i];
    const next = stops.c[Math.min(i + 1, stops.c.length - 1)];
    const span = next[0] - key[0];
    const u = step || span <= 0 ? 0 : clamp01((t - key[0]) / span);
    out[0] = lerp(key[1], next[1], u);
    out[1] = lerp(key[2], next[2], u);
    out[2] = lerp(key[3], next[3], u);
  }
  if (stops.a.length) {
    let i = 0;
    while (i < stops.a.length - 1 && stops.a[i + 1][0] <= t) i += 1;
    const key = stops.a[i];
    const next = stops.a[Math.min(i + 1, stops.a.length - 1)];
    const span = next[0] - key[0];
    const u = step || span <= 0 ? 0 : clamp01((t - key[0]) / span);
    out[3] = lerp(key[1], next[1], u);
  }
  return out;
}

export function colorAt(gradient: PGradient | undefined, t: number, roll: number): Rgba {
  if (!gradient) return [1, 1, 1, 1];
  switch (gradient.m) {
    case 1: return gradientAt(gradient.g, t);
    case 2: {
      const min = gradient.d ?? [1, 1, 1, 1];
      const max = gradient.c ?? [1, 1, 1, 1];
      return [lerp(min[0], max[0], roll), lerp(min[1], max[1], roll),
        lerp(min[2], max[2], roll), lerp(min[3], max[3], roll)];
    }
    case 3: {
      const min = gradientAt(gradient.h, t);
      const max = gradientAt(gradient.g, t);
      return [lerp(min[0], max[0], roll), lerp(min[1], max[1], roll),
        lerp(min[2], max[2], roll), lerp(min[3], max[3], roll)];
    }
    case 4: return gradientAt(gradient.g, roll);
    default: return gradient.c ?? [1, 1, 1, 1];
  }
}

// Shape types: 4 cone, 10 circle, 12 edge.
function spawnPoint(def: EmitterDef, index: number, count: number, roll: () => number) {
  const shape = def.shape;
  if (!shape) return { x: 0, y: 0, z: 0, dx: 0, dy: 0, dz: 1 };
  const arc = shape.arc * DEG;
  const spread = shape.arcMode === 3 && count > 1 ? index / count : roll();
  const theta = arc * spread;
  let x = 0, y = 0, z = 0, dx = 0, dy = 0, dz = 1;

  if (shape.type === 12) {
    const along = (spread - 0.5) * 2 * shape.radius;
    x = along; y = 0; z = 0;
    dx = 0; dy = 1; dz = 0;
  } else {
    const inner = 1 - clamp01(shape.radiusThickness);
    const radius = shape.radius * Math.sqrt(lerp(inner * inner, 1, roll()));
    x = Math.cos(theta) * radius;
    y = Math.sin(theta) * radius;
    if (shape.type === 4) {
      // Cone: outward tilt grows with the half-angle.
      const tilt = Math.tan(shape.angle * DEG);
      dx = Math.cos(theta) * tilt;
      dy = Math.sin(theta) * tilt;
      dz = 1;
    } else {
      dx = Math.cos(theta); dy = Math.sin(theta); dz = 0;
    }
  }

  const amount = clamp01(shape.randomDirection);
  if (amount > 0) {
    const a = roll() * Math.PI * 2;
    const b = roll() * 2 - 1;
    const s = Math.sqrt(1 - b * b);
    dx = lerp(dx, Math.cos(a) * s, amount);
    dy = lerp(dy, Math.sin(a) * s, amount);
    dz = lerp(dz, b, amount);
  }
  const len = Math.hypot(dx, dy, dz) || 1;

  const [rx, ry, rz] = shape.rotation;
  const cz = Math.cos(rz * DEG), sz = Math.sin(rz * DEG);
  const cx = Math.cos(rx * DEG), sx = Math.sin(rx * DEG);
  const cy = Math.cos(ry * DEG), sy = Math.sin(ry * DEG);
  const rotate = (px: number, py: number, pz: number) => {
    let a = px * cz - py * sz, b = px * sz + py * cz, c = pz;
    const b2 = b * cx - c * sx; c = b * sx + c * cx; b = b2;
    const a2 = a * cy + c * sy; c = -a * sy + c * cy; a = a2;
    return [a, b, c];
  };
  const p = rotate(x * shape.scale[0], y * shape.scale[1], z * shape.scale[2]);
  const d = rotate(dx / len, dy / len, dz / len);
  return {
    x: p[0] + shape.position[0], y: p[1] + shape.position[1], z: p[2] + shape.position[2],
    dx: d[0], dy: d[1], dz: d[2],
  };
}

export type EmitterRun = {
  def: EmitterDef;
  particles: Particle[];
  advance: (dt: number) => void;
  reset: () => void;
  finished: () => boolean;
};

export function createEmitter(def: EmitterDef, seed: number): EmitterRun {
  let roll = random(seed);
  let live: Live[] = [];
  const out: Particle[] = [];
  const tiles = Math.max(1, def.tiles[0] * def.tiles[1]);
  let time = -valueAt(def.startDelay, 0, roll());
  let fired = new Set<string>();
  let emissionCarry = 0;

  const spawn = (index: number, count: number, at: number) => {
    if (live.length >= def.maxParticles) return;
    const rolls: number[] = [];
    for (let i = 0; i < ROLLS; i += 1) rolls.push(roll());
    const t01 = def.duration > 0 ? clamp01(at / def.duration) : 0;
    const point = spawnPoint(def, index, count, roll);
    const speed = valueAt(def.start.speed, t01, rolls[ROLL_SPEED]);
    const size = valueAt(def.start.size, t01, rolls[ROLL_SIZE]);
    const sizeY = def.start.sizeY ? valueAt(def.start.sizeY, t01, rolls[ROLL_SIZE]) : size;
    const color = colorAt(def.start.color, t01, rolls[ROLL_COLOR]);
    const flip = def.start.flipRotation > 0 && roll() < def.start.flipRotation ? -1 : 1;
    live.push({
      x: point.x, y: point.y, z: point.z,
      age: 0,
      lifetime: Math.max(0.0001, valueAt(def.start.lifetime, t01, rolls[ROLL_LIFETIME])),
      vx: point.dx * speed, vy: point.dy * speed, vz: point.dz * speed,
      ax: 0, ay: 0, az: 0,
      size, sizeY, size0: size, sizeY0: sizeY,
      angle: valueAt(def.start.rotation, t01, rolls[ROLL_ROTATION]) * flip,
      spin: flip,
      r: color[0], g: color[1], b: color[2], a: color[3],
      color0: color,
      frame: 0,
      frame0: def.uv ? valueAt(def.uv.startFrame, t01, rolls[ROLL_FRAME]) : 0,
      rolls,
    });
  };

  const emit = (from: number, to: number) => {
    const emission = def.emission;
    if (!emission) return;
    emission.bursts.forEach((burst, bi) => {
      for (let cycle = 0; cycle < Math.max(1, burst.cycles); cycle += 1) {
        const at = burst.t + cycle * burst.interval;
        if (at > def.duration) break;
        const key = `${bi}:${cycle}`;
        if (fired.has(key) || at < from || at > to) continue;
        fired.add(key);
        if (burst.probability < 1 && roll() > burst.probability) continue;
        const t01 = def.duration > 0 ? clamp01(at / def.duration) : 0;
        const count = Math.round(valueAt(burst.n, t01, roll()));
        for (let i = 0; i < count; i += 1) spawn(i, count, at);
      }
    });
    const rate = valueAt(emission.rate, def.duration > 0 ? clamp01(to / def.duration) : 0, 0.5);
    if (rate > 0) {
      emissionCarry += rate * Math.max(0, to - from);
      const count = Math.floor(emissionCarry);
      emissionCarry -= count;
      for (let i = 0; i < count; i += 1) spawn(i, count, to);
    }
  };

  const advance = (dt: number) => {
    const step = dt * (def.simulationSpeed || 1);
    const from = time;
    time += step;
    if (def.looping && def.duration > 0 && time > def.duration) {
      time -= def.duration;
      fired = new Set();
      emit(0, time);
    } else if (time >= 0) {
      emit(Math.max(0, from), time);
    }

    out.length = 0;
    for (let i = live.length - 1; i >= 0; i -= 1) {
      const p = live[i];
      p.age += step;
      if (p.age >= p.lifetime) { live.splice(i, 1); continue; }
      const t = clamp01(p.age / p.lifetime);

      let vx = p.vx, vy = p.vy, vz = p.vz;
      if (def.velocity) {
        vx += valueAt(def.velocity.x, t, p.rolls[ROLL_VELOCITY]);
        vy += valueAt(def.velocity.y, t, p.rolls[ROLL_VELOCITY]);
        const radial = valueAt(def.velocity.radial, t, p.rolls[ROLL_VELOCITY]);
        if (radial !== 0) {
          const len = Math.hypot(p.x, p.y, p.z);
          if (len > 0) { vx += (p.x / len) * radial; vy += (p.y / len) * radial; vz += (p.z / len) * radial; }
        }
        const modifier = valueAt(def.velocity.speedModifier, t, p.rolls[ROLL_VELOCITY]);
        if (modifier !== 0) { vx *= modifier; vy *= modifier; vz *= modifier; }
      }
      if (def.force) {
        p.ax += valueAt(def.force.x, t, p.rolls[ROLL_FORCE]) * step;
        p.ay += valueAt(def.force.y, t, p.rolls[ROLL_FORCE]) * step;
      }
      const gravity = valueAt(def.start.gravity, t, p.rolls[ROLL_GRAVITY]);
      if (gravity !== 0) p.ay -= gravity * GRAVITY * step;

      p.x += (vx + p.ax) * step;
      p.y += (vy + p.ay) * step;
      p.z += (vz + p.az) * step;

      if (def.size) {
        const scale = valueAt(def.size.curve, t, p.rolls[ROLL_SIZE_OL]);
        p.size = p.size0 * scale;
        p.sizeY = p.sizeY0 * (def.size.separateAxes
          ? valueAt(def.size.y, t, p.rolls[ROLL_SIZE_OL]) : scale);
      }
      if (def.spin) p.angle += valueAt(def.spin.curve, t, p.rolls[ROLL_SPIN]) * p.spin * step;
      if (def.color) {
        const tint = colorAt(def.color.gradient, t, p.rolls[ROLL_COLOR_OL]);
        p.r = p.color0[0] * tint[0];
        p.g = p.color0[1] * tint[1];
        p.b = p.color0[2] * tint[2];
        p.a = p.color0[3] * tint[3];
      }
      if (def.uv) {
        const value = valueAt(def.uv.frame, t, p.rolls[ROLL_FRAME]) * def.uv.cycles;
        const index = Math.floor((p.frame0 + value) * tiles);
        p.frame = ((index % tiles) + tiles) % tiles;
      }
      out.push(p);
    }
  };

  return {
    def,
    particles: out,
    advance,
    reset() {
      roll = random(seed);
      live = [];
      out.length = 0;
      fired = new Set();
      emissionCarry = 0;
      time = -valueAt(def.startDelay, 0, roll());
    },
    finished: () => !def.looping && time > def.duration && live.length === 0,
  };
}

export function createEmitters(defs: EmitterDef[], seed = 12345): EmitterRun[] {
  return defs.map((def, i) => createEmitter(def, seed + i * 7919));
}
