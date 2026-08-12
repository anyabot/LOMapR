export type DynamicBoneDef = {
  node: number;
  root: number;
  enabled: boolean;
  updateRate: number;
  updateMode: number;
  damping: number;
  elasticity: number;
  stiffness: number;
  inert: number;
  radius: number;
  endLength: number;
  endOffset: [number, number, number];
  gravity: [number, number, number];
  force: [number, number, number];
  exclusions: number[];
  freezeAxis: number;
  weight: number;
  colliders: DynamicBoneColliderDef[];
};

export type DynamicBoneColliderDef = {
  node: number;
  enabled: boolean;
  direction: number;
  center: [number, number, number];
  bound: number;
  radius: number;
  height: number;
};

type Particle = {
  node: number;
  parent: number;
  offset: [number, number, number] | null;
  x: number; y: number; z: number;
  px: number; py: number; pz: number;
};

export type Chain = {
  def: DynamicBoneDef;
  particles: Particle[];
  time: number;
  objectScale: number;
  prevRootX: number; prevRootY: number; prevRootZ: number;
  started: boolean;
};

export type RigView = {
  /** Animated world matrix of a node, row-major 4x4. */
  world: (node: number) => Float32Array;
  /** Animated local position of a node. */
  localPos: (node: number) => [number, number, number];
  parent: (node: number) => number;
  childCount: (node: number) => number;
  children: (node: number) => number[];
};

export function buildChains(defs: DynamicBoneDef[], view: RigView): Chain[] {
  return defs.filter((def) => def.root >= 0).map((def) => {
    const excluded = new Set(def.exclusions.filter((n) => n >= 0));
    const particles: Particle[] = [];
    const inverseVector = (m: Float32Array, v: number[]): [number, number, number] => {
      const a = m[0], b = m[1], c = m[2], d = m[4], e = m[5], f = m[6];
      const g = m[8], h = m[9], i = m[10];
      const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
      if (Math.abs(det) < 1e-12) return [0, 0, 0];
      return [
        ((e * i - f * h) * v[0] + (c * h - b * i) * v[1] + (b * f - c * e) * v[2]) / det,
        ((f * g - d * i) * v[0] + (a * i - c * g) * v[1] + (c * d - a * f) * v[2]) / det,
        ((d * h - e * g) * v[0] + (b * g - a * h) * v[1] + (a * e - b * d) * v[2]) / det,
      ];
    };
    const appendEnd = (node: number, parent: number) => {
      const m = view.world(node);
      let offset: [number, number, number];
      if (def.endLength > 0) {
        const transformParent = view.parent(node);
        if (transformParent < 0) offset = [def.endLength, 0, 0];
        else {
          const pm = view.world(transformParent);
          const direction = [m[3] - pm[3], m[7] - pm[7], m[11] - pm[11]];
          offset = inverseVector(m, direction).map((v) => v * def.endLength) as [number, number, number];
        }
      } else {
        const owner = view.world(def.node);
        const direction = [
          owner[0] * def.endOffset[0] + owner[1] * def.endOffset[1] + owner[2] * def.endOffset[2],
          owner[4] * def.endOffset[0] + owner[5] * def.endOffset[1] + owner[6] * def.endOffset[2],
          owner[8] * def.endOffset[0] + owner[9] * def.endOffset[1] + owner[10] * def.endOffset[2],
        ];
        offset = inverseVector(m, direction);
      }
      const x = m[0] * offset[0] + m[1] * offset[1] + m[2] * offset[2] + m[3];
      const y = m[4] * offset[0] + m[5] * offset[1] + m[6] * offset[2] + m[7];
      const z = m[8] * offset[0] + m[9] * offset[1] + m[10] * offset[2] + m[11];
      particles.push({ node: -1, parent, offset, x, y, z, px: x, py: y, pz: z });
    };
    const walk = (node: number, parent: number) => {
      if (excluded.has(node)) return;
      const index = particles.length;
      const m = view.world(node);
      particles.push({
        node, parent, offset: null,
        x: m[3], y: m[7], z: m[11],
        px: m[3], py: m[7], pz: m[11],
      });
      let appended = false;
      for (const child of view.children(node)) {
        if (excluded.has(child)) {
          if (def.endLength > 0 || def.endOffset.some((v) => v !== 0)) {
            appendEnd(node, index);
            appended = true;
          }
        } else walk(child, index);
      }
      if (!appended && view.childCount(node) === 0
          && (def.endLength > 0 || def.endOffset.some((v) => v !== 0))) appendEnd(node, index);
    };
    walk(def.root, -1);
    return {
      def, particles, time: 0, objectScale: 1,
      prevRootX: 0, prevRootY: 0, prevRootZ: 0, started: false,
    };
  });
}

export function resetChain(chain: Chain, view: RigView) {
  for (const p of chain.particles) {
    const m = view.world(p.node >= 0 ? p.node : chain.particles[p.parent].node);
    if (p.offset) {
      p.x = m[0] * p.offset[0] + m[1] * p.offset[1] + m[2] * p.offset[2] + m[3];
      p.y = m[4] * p.offset[0] + m[5] * p.offset[1] + m[6] * p.offset[2] + m[7];
      p.z = m[8] * p.offset[0] + m[9] * p.offset[1] + m[10] * p.offset[2] + m[11];
    } else { p.x = m[3]; p.y = m[7]; p.z = m[11]; }
    p.px = p.x; p.py = p.y; p.pz = p.z;
  }
  chain.time = 0;
  chain.started = false;
}

function updateParticles1(chain: Chain, moveX: number, moveY: number, moveZ: number,
                          view: RigView) {
  const { def, particles } = chain;
  const scale = chain.objectScale;
  const fx = (def.gravity[0] + def.force[0]) * scale;
  const fy = (def.gravity[1] + def.force[1]) * scale;
  const fz = (def.gravity[2] + def.force[2]) * scale;
  for (const p of particles) {
    if (p.parent < 0) {
      const m = view.world(p.node);
      p.px = p.x; p.py = p.y; p.pz = p.z;
      p.x = m[3]; p.y = m[7]; p.z = m[11];
      continue;
    }
    const vx = p.x - p.px;
    const vy = p.y - p.py;
    const vz = p.z - p.pz;
    const rx = moveX * def.inert;
    const ry = moveY * def.inert;
    const rz = moveZ * def.inert;
    p.px = p.x + rx; p.py = p.y + ry; p.pz = p.z + rz;
    const keep = 1 - def.damping;
    p.x += vx * keep + fx + rx;
    p.y += vy * keep + fy + ry;
    p.z += vz * keep + fz + rz;
  }
}

function updateParticles2(chain: Chain, view: RigView) {
  const { def, particles } = chain;
  for (let i = 1; i < particles.length; i += 1) {
    const p = particles[i];
    const parent = particles[p.parent];
    // Rest length is the current animated distance, not a baked one.
    const pm = view.world(parent.node);
    const cm = p.node >= 0 ? view.world(p.node) : null;
    const ox = p.offset
      ? pm[0] * p.offset[0] + pm[1] * p.offset[1] + pm[2] * p.offset[2]
      : (cm![3] - pm[3]);
    const oy = p.offset
      ? pm[4] * p.offset[0] + pm[5] * p.offset[1] + pm[6] * p.offset[2]
      : (cm![7] - pm[7]);
    const oz = p.offset
      ? pm[8] * p.offset[0] + pm[9] * p.offset[1] + pm[10] * p.offset[2]
      : (cm![11] - pm[11]);
    const restLen = Math.hypot(ox, oy, oz);

    const stiffness = 1 + (def.stiffness - 1) * def.weight;
    if (stiffness > 0 || def.elasticity > 0) {
      const [lx, ly, lz] = p.offset ?? view.localPos(p.node);
      const rx = pm[0] * lx + pm[1] * ly + pm[2] * lz + parent.x;
      const ry = pm[4] * lx + pm[5] * ly + pm[6] * lz + parent.y;
      const rz = pm[8] * lx + pm[9] * ly + pm[10] * lz + parent.z;
      let dx = rx - p.x;
      let dy = ry - p.y;
      let dz = rz - p.z;
      p.x += dx * def.elasticity;
      p.y += dy * def.elasticity;
      p.z += dz * def.elasticity;
      if (stiffness > 0) {
        dx = rx - p.x; dy = ry - p.y; dz = rz - p.z;
        const len = Math.hypot(dx, dy, dz);
        const maxLen = restLen * (1 - stiffness) * 2;
        if (len > maxLen && len > 0) {
          const k = (len - maxLen) / len;
          p.x += dx * k; p.y += dy * k; p.z += dz * k;
        }
      }
    }

    for (const collider of def.colliders ?? []) {
      if (!collider.enabled || collider.node < 0) continue;
      collide(p, def.radius * chain.objectScale, collider, view);
    }

    if (def.freezeAxis) {
      const axis = def.freezeAxis - 1;
      const m = view.world(parent.node);
      let nx = m[axis], ny = m[4 + axis], nz = m[8 + axis];
      const nl = Math.hypot(nx, ny, nz) || 1;
      nx /= nl; ny /= nl; nz /= nl;
      const distance = (p.x - parent.x) * nx + (p.y - parent.y) * ny
        + (p.z - parent.z) * nz;
      p.x -= nx * distance; p.y -= ny * distance; p.z -= nz * distance;
    }

    const dx = parent.x - p.x;
    const dy = parent.y - p.y;
    const dz = parent.z - p.z;
    const len = Math.hypot(dx, dy, dz);
    if (len > 0) {
      const k = (len - restLen) / len;
      p.x += dx * k; p.y += dy * k; p.z += dz * k;
    }
  }
}

function collide(p: Particle, particleRadius: number, def: DynamicBoneColliderDef,
                 view: RigView) {
  const m = view.world(def.node);
  const point = (v: [number, number, number]) => [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2] + m[3],
    m[4] * v[0] + m[5] * v[1] + m[6] * v[2] + m[7],
    m[8] * v[0] + m[9] * v[1] + m[10] * v[2] + m[11],
  ];
  const scale = Math.hypot(m[0], m[4], m[8]);
  const radius = def.radius * scale;
  const half = def.height * 0.5 - def.radius;
  const a: [number, number, number] = [...def.center];
  const b: [number, number, number] = [...def.center];
  if (half > 0) { a[def.direction] -= half; b[def.direction] += half; }
  const p0 = point(a), p1 = point(b);
  const vx = p1[0] - p0[0], vy = p1[1] - p0[1], vz = p1[2] - p0[2];
  const length2 = vx * vx + vy * vy + vz * vz;
  const t = length2 > 0 ? Math.max(0, Math.min(1,
    ((p.x - p0[0]) * vx + (p.y - p0[1]) * vy + (p.z - p0[2]) * vz) / length2)) : 0;
  const cx = p0[0] + vx * t, cy = p0[1] + vy * t, cz = p0[2] + vz * t;
  const dx = p.x - cx, dy = p.y - cy, dz = p.z - cz;
  const distance = Math.hypot(dx, dy, dz);
  const target = def.bound === 0 ? radius + particleRadius : radius - particleRadius;
  const blocked = def.bound === 0 ? distance < target : distance > target;
  if (!blocked || distance <= 1e-9) return;
  const k = target / distance;
  p.x = cx + dx * k; p.y = cy + dy * k; p.z = cz + dz * k;
}

function skipUpdateParticles(chain: Chain, moveX: number, moveY: number, moveZ: number,
                             view: RigView) {
  const { def, particles } = chain;
  for (let index = 0; index < particles.length; index += 1) {
    const p = particles[index];
    if (p.parent < 0) {
      const m = view.world(p.node);
      const dx = m[3] - p.x, dy = m[7] - p.y, dz = m[11] - p.z;
      p.px += dx; p.py += dy; p.pz += dz;
      p.x = m[3]; p.y = m[7]; p.z = m[11];
      continue;
    }
    p.px += moveX; p.py += moveY; p.pz += moveZ;
    p.x += moveX; p.y += moveY; p.z += moveZ;
    const parent = particles[p.parent];
    const pm = view.world(parent.node);
    const cm = p.node >= 0 ? view.world(p.node) : null;
    const [lx, ly, lz] = p.offset ?? view.localPos(p.node);
    const vx = p.offset ? pm[0] * lx + pm[1] * ly + pm[2] * lz : cm![3] - pm[3];
    const vy = p.offset ? pm[4] * lx + pm[5] * ly + pm[6] * lz : cm![7] - pm[7];
    const vz = p.offset ? pm[8] * lx + pm[9] * ly + pm[10] * lz : cm![11] - pm[11];
    const restLen = Math.hypot(vx, vy, vz);
    const stiffness = 1 + (def.stiffness - 1) * def.weight;
    if (stiffness > 0) {
      const rx = pm[0] * lx + pm[1] * ly + pm[2] * lz + parent.x;
      const ry = pm[4] * lx + pm[5] * ly + pm[6] * lz + parent.y;
      const rz = pm[8] * lx + pm[9] * ly + pm[10] * lz + parent.z;
      const dx = rx - p.x, dy = ry - p.y, dz = rz - p.z;
      const len = Math.hypot(dx, dy, dz);
      const maxLen = restLen * (1 - stiffness) * 2;
      if (len > maxLen && len > 0) {
        const k = (len - maxLen) / len;
        p.x += dx * k; p.y += dy * k; p.z += dz * k;
      }
    }
    const dx = parent.x - p.x, dy = parent.y - p.y, dz = parent.z - p.z;
    const len = Math.hypot(dx, dy, dz);
    if (len > 0) {
      const k = (len - restLen) / len;
      p.x += dx * k; p.y += dy * k; p.z += dz * k;
    }
  }
}

/** Fixed-rate stepping, at most three iterations per frame. */
export function stepChain(chain: Chain, dt: number, view: RigView) {
  const { def } = chain;
  const rootMatrix = view.world(def.node >= 0 ? def.node : def.root);
  chain.objectScale = Math.abs(Math.hypot(rootMatrix[0], rootMatrix[4], rootMatrix[8])) || 1;
  const rx = rootMatrix[3], ry = rootMatrix[7], rz = rootMatrix[11];
  let moveX = 0;
  let moveY = 0;
  let moveZ = 0;
  if (chain.started) {
    moveX = rx - chain.prevRootX;
    moveY = ry - chain.prevRootY;
    moveZ = rz - chain.prevRootZ;
  }
  chain.prevRootX = rx; chain.prevRootY = ry; chain.prevRootZ = rz;
  chain.started = true;

  let loops = 1;
  if (def.updateRate > 0) {
    const step = 1 / def.updateRate;
    chain.time += dt;
    loops = 0;
    while (chain.time >= step) {
      chain.time -= step;
      loops += 1;
      if (loops >= 3) { chain.time = 0; break; }
    }
  }
  if (loops > 0) {
    for (let i = 0; i < loops; i += 1) {
      updateParticles1(chain, moveX, moveY, moveZ, view);
      updateParticles2(chain, view);
      moveX = 0; moveY = 0; moveZ = 0;
    }
  } else {
    skipUpdateParticles(chain, moveX, moveY, moveZ, view);
  }
}
