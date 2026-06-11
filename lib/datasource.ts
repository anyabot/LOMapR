// Central data-source for API routes.
//
// Mode is chosen by the DATA_SOURCE env var:
//   • local    — read generated JSON from /data/<region>/<file>.json (local dev)
//   • firebase — read the Firebase RTDB at LOMapInfo/<region>/<Node> (test/prod)
// When DATA_SOURCE is unset we default to 'firebase', so a plain production build
// reads Firebase. Local dev sets DATA_SOURCE=local in .env.local.
//
// Images are a special case in BOTH modes: any image whose path also exists as a
// static file under /public is rewritten to that local path, so the app serves
// bundled art from /public when present and only falls back to the (Firebase
// Storage) URL for images we don't have locally yet.

import fs from 'fs';
import path from 'path';

// Firebase node name  ->  local file under /data/<region>
const NODE_TO_FILE: { [node: string]: string } = {
  EnemyData: 'enemy',
  Skills: 'skill',
  World: 'world',
  Sanctum: 'sanctum',
  Images: 'images',
  EnemyImage: 'enemyImage',
  InfiniteWar: 'iw',
  AI: 'ai',
};

export const REGIONS = ['global', 'kr'] as const;
export type Region = (typeof REGIONS)[number];

// Root path under which the admin panel pushes each node, per region.
const ROOT = 'LOMapInfo';

type DataSource = 'local' | 'firebase';

function dataSource(): DataSource {
  return process.env.DATA_SOURCE === 'local' ? 'local' : 'firebase';
}

export function isLocal(): boolean {
  return dataSource() === 'local';
}

export function normalizeRegion(r: unknown): Region {
  return REGIONS.includes(r as Region) ? (r as Region) : 'global';
}

// ── local files ──────────────────────────────────────────────────────────────

function readFile(region: Region, file: string): any | null {
  const p = path.join(process.cwd(), 'data', region, `${file}.json`);
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return null;
  }
}

function readLocal(node: string, region: Region): any | null {
  const file = NODE_TO_FILE[node];
  if (!file) return null;

  const local = readFile(region, file);
  if (region === 'global') return local;

  const global = readFile('global', file);
  // Images: MERGE region over global — a region only generates its own world
  // icons but still needs global's enemy/profile images. Region keys win.
  if (node === 'Images' && global && local) {
    return { ...global, ...local };
  }
  // Other nodes: region data if present, else fall back to global.
  return local ?? global;
}

// ── firebase ─────────────────────────────────────────────────────────────────

// Firebase RTDB does not store empty arrays — a field set to [] locally comes
// back undefined. Per node we coerce the data back into the exact shape the app
// expects, filling any missing array with []. These shapers only touch the
// records they own, so container objects (e.g. the sanctum area map) are left
// untouched — no phantom keys.
const arr = (v: any): any[] => (Array.isArray(v) ? v : []);

// Sanctum: { area: Floor[][] } — each Floor needs prohibition/suitability/waves.
function shapeSanctum(data: any): any {
  if (!data || typeof data !== 'object') return data;
  for (const area of Object.keys(data)) {
    for (const floors of arr(data[area])) {        // floors = Floor[] (difficulties)
      for (const f of arr(floors)) {
        if (f && typeof f === 'object') {
          f.prohibition = arr(f.prohibition);
          f.suitability = arr(f.suitability);
          f.waves = arr(f.waves);
        }
      }
    }
  }
  return data;
}

// World: { id: World } — each World has zones; each zone has stages/subzones;
// each stage has waves.
function shapeWorld(data: any): any {
  if (!data || typeof data !== 'object') return data;
  const fixStage = (s: any) => { if (s && typeof s === 'object') s.waves = arr(s.waves); };
  for (const id of Object.keys(data)) {
    const w = data[id];
    if (!w || typeof w !== 'object') continue;
    for (const z of arr(w.zones)) {
      if (!z || typeof z !== 'object') continue;
      z.stages = arr(z.stages);
      z.stages.forEach(fixStage);
      if (Array.isArray(z.subzones)) z.subzones.forEach((sz: any) => arr(sz).forEach(fixStage));
    }
  }
  return data;
}

// Enemy: { id: EnemyData } — each enemy needs skills[].
function shapeEnemy(data: any): any {
  if (!data || typeof data !== 'object') return data;
  for (const id of Object.keys(data)) {
    const e = data[id];
    if (e && typeof e === 'object') e.skills = arr(e.skills);
  }
  return data;
}

const SHAPERS: { [node: string]: (data: any) => any } = {
  Sanctum: shapeSanctum,
  World: shapeWorld,
  EnemyData: shapeEnemy,
};

// Read a node from Firebase RTDB at LOMapInfo/<region>/<Node> via firebase-admin,
// coercing it back into the shape the app expects (Firebase drops empty arrays).
async function readFirebase(node: string, region: Region): Promise<any | null> {
  const { db } = await import('@/firebaseConfigs');
  const snapshot = await db.ref(`${ROOT}/${region}/${node}`).once('value');
  if (!snapshot.exists()) return null;
  const data = snapshot.val();
  const shaper = SHAPERS[node];
  return shaper ? shaper(data) : data;
}

// ── images: prefer /public ───────────────────────────────────────────────────

// Swap any image value to a local /public path when that file exists on disk.
// Accepts either a "/images/..." path or a Firebase Storage URL whose object key
// mirrors the public/ layout (images/profile/<x>.png, etc.).
function preferPublicImages(map: { [key: string]: string }): { [key: string]: string } {
  const pub = path.join(process.cwd(), 'public');
  const out: { [key: string]: string } = {};
  for (const [key, value] of Object.entries(map)) {
    out[key] = value;
    if (typeof value !== 'string') continue;

    let rel: string | null = null;
    if (value.startsWith('/images/')) {
      rel = value.slice(1);                       // already a local path
    } else if (value.startsWith('http')) {
      const m = /\/o\/([^?]+)/.exec(value);       // Firebase Storage object key
      if (m) rel = decodeURIComponent(m[1]);      // e.g. images/profile/AMG11.png
    }
    if (rel && fs.existsSync(path.join(pub, rel))) {
      out[key] = '/' + rel.replace(/\\/g, '/');
    }
  }
  return out;
}

// ── entry point ──────────────────────────────────────────────────────────────

// Fetch one node's data for a region. Images get the public-path rewrite in both
// modes. Returns null when the node has no data, letting the caller 404.
export async function getNode(node: string, region: Region = 'global'): Promise<any | null> {
  const data = isLocal() ? readLocal(node, region) : await readFirebase(node, region);
  if (data && node === 'Images') {
    return preferPublicImages(data as { [key: string]: string });
  }
  return data;
}
