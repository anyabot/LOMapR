import fs from 'node:fs/promises';
import path from 'node:path';

export type Region = 'global' | 'kr';

const MODE = process.env.CONTRACT_SOURCE === 'r2' ? 'r2' : 'local';
const R2 = (process.env.CONTRACT_BASE ?? 'https://lo-assets.altterisk.cc').replace(/\/$/, '');
const LOCAL = path.resolve(process.cwd(), 'data');

export const sourceLabel = MODE === 'r2' ? R2 : LOCAL;

async function request(key: string, method: 'GET' | 'HEAD', attempts = 4): Promise<Response> {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(`${R2}/${key}`, { method });
      if (res.status < 500 || i === attempts) return res;
    } catch (e) {
      if (i === attempts) throw e;
    }
    await new Promise((r) => setTimeout(r, 500 * 2 ** i));
  }
}

async function readRaw(key: string): Promise<unknown | undefined> {
  if (MODE === 'local') {
    try { return JSON.parse(await fs.readFile(path.join(LOCAL, key), 'utf8')); } catch (e: any) {
      if (e.code === 'ENOENT') return undefined;
      throw e;
    }
  }
  const res = await request(key, 'GET');
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(`${key}: HTTP ${res.status}`);
  return res.json();
}

async function existsRaw(key: string): Promise<boolean> {
  if (MODE === 'local') return fs.access(path.join(LOCAL, key)).then(() => true, () => false);
  const res = await request(key, 'HEAD');
  if (res.status === 404) return false;
  if (!res.ok) throw new Error(`${key}: HTTP ${res.status}`);
  return true;
}

const keysFor = (region: Region, file: string) => (region === 'kr' ? [`kr/${file}`, `global/${file}`] : [`global/${file}`]);

// Mirrors lib/fetchData.ts: a kr/<file> miss falls back to global/<file>.
export async function load<T = any>(region: Region, file: string): Promise<T | undefined> {
  for (const key of keysFor(region, file)) {
    const v = await readRaw(key);
    if (v !== undefined) return v as T;
  }
  return undefined;
}

export async function exists(region: Region, file: string): Promise<boolean> {
  for (const key of keysFor(region, file)) if (await existsRaw(key)) return true;
  return false;
}

export async function missing(region: Region, files: string[], concurrency = MODE === 'r2' ? 6 : 16): Promise<string[]> {
  const out: string[] = [];
  let i = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (i < files.length) {
      const f = files[i++];
      if (!(await exists(region, f))) out.push(f);
    }
  }));
  return out.sort();
}
