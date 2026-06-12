import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const REPO = process.cwd();
const HASH_FILE = path.join(REPO, 'tools', 'admin', '_blob_hashes.json');

function loadHashes(): Record<string, string> {
  try { return JSON.parse(fs.readFileSync(HASH_FILE, 'utf-8')); } catch { return {}; }
}

function splitFiles(region: string): { pathname: string; localPath: string }[] {
  const dataDir = path.join(REPO, 'data', region);
  if (!fs.existsSync(dataDir)) return [];
  const results: { pathname: string; localPath: string }[] = [];
  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!entry.name.endsWith('.json')) continue;
      const rel = path.relative(path.join(REPO, 'data', region), full).replace(/\\/g, '/');
      results.push({ pathname: `${region}/${rel}`, localPath: full });
    }
  }
  walk(dataDir);
  return results;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const region = (req.query.region as string) || 'global';
  const files = splitFiles(region);
  const hashes = loadHashes();
  let stale = 0, fresh = 0, deduped = 0;

  for (const { pathname, localPath } of files) {
    const content = fs.readFileSync(localPath);
    const digest = crypto.createHash('sha256').update(content).digest('hex');

    if (region === 'kr') {
      const globalPath = localPath.replace(`${path.sep}kr${path.sep}`, `${path.sep}global${path.sep}`);
      if (fs.existsSync(globalPath)) {
        try {
          const krNorm = JSON.stringify(JSON.parse(content.toString('utf-8')));
          const glNorm = JSON.stringify(JSON.parse(fs.readFileSync(globalPath, 'utf-8')));
          if (krNorm === glNorm) { deduped++; continue; }
        } catch {}
      }
    }

    if (hashes[pathname] === digest) fresh++; else stale++;
  }

  res.json({ total: files.length, stale, fresh, deduped });
}
