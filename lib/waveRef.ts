// Enemy-wave reference codecs: compact `~`-joined strings used by /team?w=
// links (the "Simulate in Team Builder" buttons) and to sanitize the per-slot
// localStorage entries. Sources: world stages, Sanctum floors, IW boss stages.

import { WaveRef } from '@/interfaces/team';

export function encodeWaveRef(w: WaveRef): string {
  switch (w.src) {
    case 'world': return ['world', w.world, w.stage, w.wave].join('~');
    case 'sanctum': return ['sanctum', w.area, w.floor, w.diff, w.wave].join('~');
    case 'iw': return ['iw', w.boss, w.stage].join('~');
  }
}

const toIdx = (v: unknown): number | null => {
  const n = typeof v === 'string' ? parseInt(v, 10) : typeof v === 'number' ? v : NaN;
  return Number.isInteger(n) && n >= 0 ? n : null;
};

export function decodeWaveRef(s: string): WaveRef | null {
  const p = (s || '').split('~');
  if (p[0] === 'world' && p.length === 4) {
    const wave = toIdx(p[3]);
    return p[1] && p[2] && wave != null
      ? { src: 'world', world: p[1], stage: p[2], wave } : null;
  }
  if (p[0] === 'sanctum' && p.length === 5) {
    const floor = toIdx(p[2]), diff = toIdx(p[3]), wave = toIdx(p[4]);
    return p[1] && floor != null && diff != null && wave != null
      ? { src: 'sanctum', area: p[1], floor, diff, wave } : null;
  }
  if (p[0] === 'iw' && p.length === 3) {
    const stage = toIdx(p[2]);
    return p[1] && stage != null ? { src: 'iw', boss: p[1], stage } : null;
  }
  return null;
}

// Sanitize a stored (JSON-parsed) wave entry; legacy entries have no `src`
// and are world refs.
export function sanitizeWaveRef(w: unknown): WaveRef | null {
  if (!w || typeof w !== 'object') return null;
  const v = w as Record<string, unknown>;
  const src = v.src ?? 'world';
  if (src === 'world' && typeof v.world === 'string' && typeof v.stage === 'string') {
    const wave = toIdx(v.wave);
    return wave != null ? { src: 'world', world: v.world, stage: v.stage, wave } : null;
  }
  if (src === 'sanctum' && typeof v.area === 'string') {
    const floor = toIdx(v.floor), diff = toIdx(v.diff), wave = toIdx(v.wave);
    return floor != null && diff != null && wave != null
      ? { src: 'sanctum', area: v.area, floor, diff, wave } : null;
  }
  if (src === 'iw' && typeof v.boss === 'string') {
    const stage = toIdx(v.stage);
    return stage != null ? { src: 'iw', boss: v.boss, stage } : null;
  }
  return null;
}
