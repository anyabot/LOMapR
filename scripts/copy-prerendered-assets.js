// Post-OpenNext-build step (runs at the end of `npm run cf:build`).
//
// Stock OpenNext keeps prerendered page HTML inside the server function, so
// every page view would invoke the Worker (and count against the request
// quota). This app is 100% prerendered, so instead:
//   1. copy each prerendered page's HTML (and its getStaticProps data JSON,
//      if any) into .open-next/assets — with asset-first routing
//      (run_worker_first: false) Cloudflare then serves pages as free static
//      assets without ever invoking the Worker;
//   2. prune local-only public/ dirs (gitignored dev data) from the deploy.
// The Worker still handles everything that is NOT a static asset: the
// /models|/rebuilt|/skins proxy rewrites, 404s, future API/SSR routes
// (SSR pages emit no .html, so they are naturally left to the Worker).
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
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
    // 404/500 stay at the root as plain .html; everything else becomes
    // <route>/index.html to match the trailingSlash: true URL shape.
    const dest =
      route === '404' || route === '500' ? path.join(assets, `${route}.html`)
      : route === 'index' ? path.join(assets, 'index.html')
      : path.join(assets, route, 'index.html');
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(full, dest);
    const json = full.replace(/\.html$/, '.json');
    if (fs.existsSync(json)) {
      const jdest = path.join(assets, '_next', 'data', buildId, `${route}.json`);
      fs.mkdirSync(path.dirname(jdest), { recursive: true });
      fs.copyFileSync(json, jdest);
    }
    pages++;
  }
})(pagesDir);
console.log(`copied ${pages} prerendered pages into .open-next/assets (worker-free static serving)`);
