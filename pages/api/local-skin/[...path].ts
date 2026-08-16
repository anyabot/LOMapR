import fs from 'fs';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';

// Dev-only: serve packed skin archives straight from the local pipeline output so
// `dev:local` reflects a fresh export instead of whatever is published on R2.
// Anything not built locally falls back to the remote archive base.
const LOCAL_DIRS = [
  path.join(process.cwd(), 'tools', 'skin_test', 'pixi_dist'),
  path.join(process.cwd(), 'tools', 'skin_test', 'dist'),
];

// dev:local overrides NEXT_PUBLIC_SKIN_ARCHIVE_BASE, so the remote falls back to the
// bucket URL, which it does not touch.
const REMOTE = process.env.NEXT_PUBLIC_R2_PUBLIC_URL
  ? `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL.replace(/\/$/, '')}/skins`
  : '';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).end();
    return;
  }
  const parts = ([] as string[]).concat(req.query.path ?? []);
  const name = parts.join('/');
  // Archive names are flat filenames; refuse anything that could escape the dirs.
  if (!/^[A-Za-z0-9_.-]+$/.test(name)) {
    res.status(400).end();
    return;
  }
  for (const dir of LOCAL_DIRS) {
    const file = path.join(dir, name);
    if (fs.existsSync(file)) {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Skin-Source', path.basename(dir));
      fs.createReadStream(file).pipe(res);
      return;
    }
  }
  if (REMOTE) {
    res.redirect(307, `${REMOTE}/${name}`);
    return;
  }
  res.status(404).end();
}
