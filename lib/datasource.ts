// Central data-source switch for API routes.
//
// In LOCAL dev mode (DEV_LOCAL=1) we read generated/exported JSON from /data,
// so the app runs without Firebase and off the locally extracted game data.
// Otherwise we read the live Firebase Realtime Database node, exactly as before.
//
// Each Firebase node maps to one /data/<file>.json. The response shape is
// identical in both modes, so API routes, Redux slices, and components are
// unchanged — only where the bytes come from differs.

import fs from 'fs';
import path from 'path';

// Firebase node name  ->  local file under /data
const NODE_TO_FILE: { [node: string]: string } = {
  EnemyData: 'enemy',
  Skills: 'skill',
  World: 'world',
  Sanctum: 'sanctum',
  Images: 'images',
  EnemyImage: 'enemyImage',
  InfiniteWar: 'iw',
};

export const REGIONS = ['global', 'kr'] as const;
export type Region = (typeof REGIONS)[number];

export function isLocal(): boolean {
  return process.env.DEV_LOCAL === '1';
}

export function normalizeRegion(r: unknown): Region {
  return REGIONS.includes(r as Region) ? (r as Region) : 'global';
}

// Read a node locally from /data/<region>/<file>.json. Returns null if the file
// is absent (so the route can 404 just like a missing Firebase node).
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
  // Fall back to global for shared nodes a region doesn't generate (e.g. images
  // are the same Firebase storage links across regions).
  return readFile(region, file) ?? (region !== 'global' ? readFile('global', file) : null);
}

// Read a node from Firebase (live mode). Imported lazily so local dev never
// needs Firebase credentials loaded.
async function readFirebase(node: string): Promise<any | null> {
  const { db } = await import('@/firebaseConfigs');
  const { ref, child, get } = await import('firebase/database');
  const snapshot = await get(child(ref(db), `${node}/`));
  return snapshot.exists() ? snapshot.val() : null;
}

// Fetch one node's data in whichever mode is active. In local dev the region
// selects the data/<region>/ folder; Firebase mode ignores region for now.
// Returns null when the node has no data, letting the caller send a 404.
export async function getNode(node: string, region: Region = 'global'): Promise<any | null> {
  return isLocal() ? readLocal(node, region) : readFirebase(node);
}
