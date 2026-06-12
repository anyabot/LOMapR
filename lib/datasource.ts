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
  Strings: 'strings',
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

type DataSource = 'local' | 'firebase' | 'blob';

function dataSource(): DataSource {
  const v = process.env.DATA_SOURCE;
  if (v === 'local') return 'local';
  if (v === 'blob') return 'blob';
  return 'firebase';
}

export function isLocal(): boolean { return dataSource() === 'local'; }
export function isBlob(): boolean {
  return dataSource() === 'blob' && !!(process.env.R2_PUBLIC_URL ?? '');
}

// In-process cache: survives across requests on a warm serverless instance.
// Prevents redundant R2 reads when multiple requests hit the same instance
// before Vercel's CDN has cached the API route response.
const _blobCache = new Map<string, { data: any; exp: number }>();
const BLOB_TTL_MS = 3600 * 1000; // 1 hour

// Fetch a split file from R2 using the S3 client (server-side, authenticated).
async function fetchBlobJson(pathname: string): Promise<any | null> {
  const cached = _blobCache.get(pathname);
  if (cached && cached.exp > Date.now()) return cached.data;

  try {
    const { r2Client, R2_BUCKET } = await import('@/lib/r2');
    if (!R2_BUCKET) return null;
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const client = r2Client();
    const resp = await client.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: pathname }));
    const body = resp.Body;
    if (!body) return null;
    // Body is a ReadableStream (Node.js); collect chunks and parse.
    const chunks: Uint8Array[] = [];
    for await (const chunk of body as AsyncIterable<Uint8Array>) chunks.push(chunk);
    const text = Buffer.concat(chunks).toString('utf-8');
    const data = JSON.parse(text);
    _blobCache.set(pathname, { data, exp: Date.now() + BLOB_TTL_MS });
    return data;
  } catch {
    return null;
  }
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

function readSplitFile(region: Region, name: string): any | null {
  const p = path.join(process.cwd(), 'data', region, 'split', `${name}.json`);
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return null; }
}

function readLocal(node: string, region: Region): any | null {
  // EnemyData: read from split/enemy_list.json (full records).
  if (node === 'EnemyData') {
    const regions = region === 'global' ? ['global'] : [region, 'global'];
    for (const r of regions as Region[]) {
      const data = readSplitFile(r, 'enemy_list');
      if (data) return data;
    }
    return null;
  }

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

// ── blob: full-node helpers ──────────────────────────────────────────────────

// Fetch EnemyData in blob mode from split/enemy_list.json (full records).
async function fetchBlobEnemyData(region: Region): Promise<any | null> {
  const data = await fetchBlobJson(`${region}/split/enemy_list.json`);
  if (!data) return null;
  return shapeEnemy(data);
}

// ── per-enemy split helpers ──────────────────────────────────────────────────

function readSplitLocal(kind: string, id: string, region: Region): any | null {
  for (const r of region === 'global' ? ['global'] : [region, 'global']) {
    try {
      const p = path.join(process.cwd(), 'data', r, 'split', kind, `${id}.json`);
      return JSON.parse(fs.readFileSync(p, 'utf-8'));
    } catch {}
  }
  return null;
}

// Read a single enemy's full record. enemy_list.json holds all fields.
export async function getSplitEnemy(id: string, region: Region): Promise<any | null> {
  if (isLocal()) {
    const regions = region === 'global' ? ['global'] : [region, 'global'];
    for (const r of regions as Region[]) {
      const all = readSplitFile(r, 'enemy_list');
      if (all?.[id]) return all[id];
    }
    return null;
  }
  if (isBlob()) {
    const regions = region === 'global' ? ['global'] : [region, 'global'];
    for (const r of regions as Region[]) {
      const all = await fetchBlobJson(`${r}/split/enemy_list.json`);
      if (all?.[id]) return all[id];
    }
    // Fall back to Firebase.
    const allEnemy = await readFirebase('EnemyData', region);
    return allEnemy?.[id] ?? null;
  }
  const allEnemy = await readFirebase('EnemyData', region);
  return allEnemy?.[id] ?? null;
}

// Return the skill subset for a single enemy.
export async function getSplitSkills(id: string, region: Region): Promise<any | null> {
  if (isLocal()) {
    const split = readSplitLocal('skills', id, region);
    if (split) return split;
    // Fallback: derive from enemy_list + full skills file.
    const allSkills = readLocal('Skills', region);
    const regions = region === 'global' ? ['global'] : [region, 'global'];
    let keys: string[] = [];
    for (const r of regions as Region[]) {
      const all = readSplitFile(r, 'enemy_list');
      if (all?.[id]?.skills) { keys = all[id].skills; break; }
    }
    if (!allSkills || !keys.length) return null;
    return Object.fromEntries(keys.filter(k => k in allSkills).map(k => [k, allSkills[k]]));
  }
  if (isBlob()) {
    const data = await fetchBlobJson(`${region}/split/skills/${id}.json`);
    if (data) return data;
    // KR file wasn't pushed (identical to global) — fall back to global
    if (region !== 'global') return fetchBlobJson(`global/split/skills/${id}.json`);
    return null;
  }
  const [allEnemy, allSkills] = await Promise.all([
    readFirebase('EnemyData', region),
    readFirebase('Skills', region),
  ]);
  const keys: string[] = allEnemy?.[id]?.skills ?? [];
  if (!allSkills || !keys.length) return null;
  return Object.fromEntries(keys.filter(k => k in allSkills).map(k => [k, allSkills[k]]));
}

export async function getSplitAI(id: string, region: Region): Promise<any | null> {
  if (isLocal()) {
    const split = readSplitLocal('ai', id, region);
    if (split) return split;
    return readLocal('AI', region)?.[id] ?? null;
  }
  if (isBlob()) {
    const data = await fetchBlobJson(`${region}/split/ai/${id}.json`);
    if (data) return data;
    if (region !== 'global') return fetchBlobJson(`global/split/ai/${id}.json`);
    return null;
  }
  const all = await readFirebase('AI', region);
  return all?.[id] ?? null;
}

// ── entry point ──────────────────────────────────────────────────────────────

// Fetch one node's data for a region. In local mode we read the generated /data
// files, but those are NOT committed/deployed — so if they're absent (e.g. on a
// hosted build that happens to have DATA_SOURCE=local) we fall back to Firebase
// instead of returning nothing. Images get the public-path rewrite in both modes.
export async function getNode(node: string, region: Region = 'global'): Promise<any | null> {
  let data: any | null = null;
  if (isLocal()) {
    data = readLocal(node, region);
    if (data == null) data = await readFirebase(node, region);   // files missing -> Firebase
  } else if (isBlob()) {
    if (node === 'EnemyData') {
      data = await fetchBlobEnemyData(region);
    } else if (node === 'Strings') {
      // strings.json is pushed to R2 (includes numeric buff-name IDs missing from Firebase)
      data = await fetchBlobJson(`${region}/strings.json`);
      if (data == null && region !== 'global') data = await fetchBlobJson(`global/strings.json`);
    }
    // Other nodes not yet in blob — fall back to Firebase.
    if (data == null) data = await readFirebase(node, region);
  } else {
    data = await readFirebase(node, region);
  }
  if (data && node === 'Images') {
    return preferPublicImages(data as { [key: string]: string });
  }
  return data;
}

// Fetch a region-agnostic node stored at LOMapInfo/<node> (e.g. Community).
// `localFile` is its path under /data for local mode. Falls back to Firebase if
// the local file is missing.
export async function getShared(node: string, localFile: string): Promise<any | null> {
  const fbRead = async () => {
    const { db } = await import('@/firebaseConfigs');
    const snap = await db.ref(`${ROOT}/${node}`).once('value');
    return snap.exists() ? snap.val() : null;
  };
  if (isLocal()) {
    try {
      const p = path.join(process.cwd(), 'data', localFile);
      return JSON.parse(fs.readFileSync(p, 'utf-8'));
    } catch {
      return await fbRead();
    }
  }
  if (isBlob()) {
    const data = await fetchBlobJson(localFile);
    if (data != null) return data;
  }
  return await fbRead();
}
