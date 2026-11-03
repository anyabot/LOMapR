// Post-OpenNext-build step (end of `npm run cf:build`): copies prerendered HTML into
// .open-next/assets, prunes local-only public/ dirs and writes the static _headers. Full rationale: DEPLOY.md.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { loadEnvConfig } = require('@next/env');

const root = path.join(__dirname, '..');
loadEnvConfig(root);
const DATA = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '').replace(/\/$/, '');
const IMAGE_HOSTS = 'https://hub.altterisk.cc https://firebasestorage.googleapis.com';

// Inline scripts are allowed by hash, so each page carries its own policy.
function csp(html) {
  const hashes = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
    .filter(([, attrs]) => !/\bsrc=/.test(attrs) && !/\btype="(?!text\/javascript|module)/.test(attrs))
    .map(([, , body]) => `'sha256-${crypto.createHash('sha256').update(body).digest('base64')}'`);
  return [
    "default-src 'self'",
    `script-src 'self' 'wasm-unsafe-eval' ${hashes.join(' ')}`.trim(),
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${DATA} ${IMAGE_HOSTS}`,
    "font-src 'self' data:",
    `connect-src 'self' data: blob: ${DATA}`,
    `media-src 'self' data: blob: ${DATA}`,
    "worker-src 'self' blob:",
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ].join('; ');
}

const headers = ['/*', '  Strict-Transport-Security: max-age=31536000', '  Cross-Origin-Opener-Policy: same-origin'];
const assets = path.join(root, '.open-next', 'assets');
const pagesDir = path.join(root, '.open-next', 'server-functions', 'default', '.next', 'server', 'pages');
const buildId = fs.readFileSync(path.join(assets, 'BUILD_ID'), 'utf8').trim();

for (const dir of ['local-data', 'local-data-rates', 'skin_test']) {
  fs.rmSync(path.join(assets, dir), { recursive: true, force: true });
}

let pages = 0;
(function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) { walk(full); continue; }
    if (!ent.name.endsWith('.html')) continue;
    const route = path.relative(pagesDir, full).replace(/\\/g, '/').replace(/\.html$/, '');
    // 404/500 stay at the root as plain .html; the rest become <route>/index.html
    // to match the trailingSlash: true URL shape.
    const dest =
      route === '404' || route === '500' ? path.join(assets, `${route}.html`)
      : route === 'index' ? path.join(assets, 'index.html')
      : path.join(assets, route, 'index.html');
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(full, dest);
    if (route !== '404' && route !== '500') {
      headers.push(route === 'index' ? '/' : `/${route}/`, `  Content-Security-Policy: ${csp(fs.readFileSync(full, 'utf8'))}`);
    }
    const json = full.replace(/\.html$/, '.json');
    if (fs.existsSync(json)) {
      const jdest = path.join(assets, '_next', 'data', buildId, `${route}.json`);
      fs.mkdirSync(path.dirname(jdest), { recursive: true });
      fs.copyFileSync(json, jdest);
    }
    pages++;
  }
})(pagesDir);
fs.writeFileSync(path.join(assets, '_headers'), headers.join('\n') + '\n');
console.log(`copied ${pages} prerendered pages into .open-next/assets (worker-free static serving)`);
