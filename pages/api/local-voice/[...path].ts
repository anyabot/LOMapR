import fs from 'fs';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';

// Dev-only: serve voice packs from the local pipeline output, falling back to the remote base.
const LOCAL_DIR = path.join(process.cwd(), 'tools', 'voice', 'dist');

const REMOTE = process.env.NEXT_PUBLIC_R2_PUBLIC_URL
  ? `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL.replace(/\/$/, '')}/voice`
  : '';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).end();
    return;
  }
  const name = ([] as string[]).concat(req.query.path ?? []).join('/');
  if (!/^(jp|kr)\/[a-z0-9_-]+\.tar$/.test(name)) {
    res.status(400).end();
    return;
  }
  const file = path.join(LOCAL_DIR, name);
  if (fs.existsSync(file)) {
    res.setHeader('Content-Type', 'application/x-tar');
    res.setHeader('Cache-Control', 'no-store');
    fs.createReadStream(file).pipe(res);
    return;
  }
  if (REMOTE) {
    res.redirect(307, `${REMOTE}/${name}`);
    return;
  }
  res.status(404).end();
}
