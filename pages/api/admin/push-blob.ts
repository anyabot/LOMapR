import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET } from '@/lib/r2';

export const config = { api: { responseLimit: false } };

const REPO = process.cwd();
const HASH_FILE = path.join(REPO, 'tools', 'admin', '_blob_hashes.json');

function loadHashes(): Record<string, string> {
  try { return JSON.parse(fs.readFileSync(HASH_FILE, 'utf-8')); } catch { return {}; }
}
function saveHashes(h: Record<string, string>) {
  fs.mkdirSync(path.dirname(HASH_FILE), { recursive: true });
  fs.writeFileSync(HASH_FILE, JSON.stringify(h, null, 2), 'utf-8');
}

function splitFiles(region: string): { key: string; localPath: string }[] {
  const dataDir = path.join(REPO, 'data', region);
  if (!fs.existsSync(dataDir)) return [];
  const results: { key: string; localPath: string }[] = [];
  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!entry.name.endsWith('.json')) continue;
      const rel = path.relative(path.join(REPO, 'data', region), full).replace(/\\/g, '/');
      results.push({ key: `${region}/${rel}`, localPath: full });
    }
  }
  walk(dataDir);
  return results;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!R2_BUCKET) {
    res.status(500).end('R2_BUCKET_NAME not set\n');
    return;
  }

  const { region = 'global', force = false } = req.body ?? {};

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('Cache-Control', 'no-cache');

  const emit = (line: string) => {
    console.log(line);
    res.write(line + '\n');
  };

  const files = splitFiles(region as string);
  if (!files.length) {
    emit(`No split files found in data/${region}/split/ — run build_data.py first`);
    return res.end();
  }

  emit(`Found ${files.length} files in data/${region}/split/`);

  const client = r2Client();
  const hashes = loadHashes();
  let pushed = 0, skipped = 0, deduped = 0, errors = 0;

  for (const { key, localPath } of files) {
    const content = fs.readFileSync(localPath);
    const digest = crypto.createHash('sha256').update(content).digest('hex');

    if (!force && hashes[key] === digest) {
      emit(`SKIP  ${key}`);
      skipped++;
      continue;
    }

    // For KR: if content is logically identical to the global equivalent, skip —
    // parse both to normalize whitespace/key order before comparing.
    if (region === 'kr') {
      const globalPath = localPath.replace(`${path.sep}kr${path.sep}`, `${path.sep}global${path.sep}`);
      if (fs.existsSync(globalPath)) {
        try {
          const krNorm   = JSON.stringify(JSON.parse(content.toString('utf-8')));
          const glNorm   = JSON.stringify(JSON.parse(fs.readFileSync(globalPath, 'utf-8')));
          if (krNorm === glNorm) {
            emit(`SAME  ${key}`);
            deduped++;
            continue;
          }
        } catch { /* unparseable — fall through and push */ }
      }
    }

    try {
      await client.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: content,
        ContentType: 'application/json',
        CacheControl: 'public, max-age=3600',
      }));
      hashes[key] = digest;
      emit(`OK    ${key}`);
      pushed++;
    } catch (e: any) {
      emit(`ERR   ${key}: ${e?.message ?? e}`);
      errors++;
    }
  }

  saveHashes(hashes);
  emit('');
  emit(`Done — pushed ${pushed}, skipped ${skipped}, deduped ${deduped} (same as global), errors ${errors} (${files.length} total)`);
  res.end();
}
