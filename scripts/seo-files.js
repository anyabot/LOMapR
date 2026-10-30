// Post-build step (end of `npm run cf:build`): writes sitemap.xml and robots.txt into .open-next/assets.
const fs = require('fs');
const path = require('path');
const { loadEnvConfig } = require('@next/env');

const root = path.join(__dirname, '..');
loadEnvConfig(root);
const assets = path.join(root, '.open-next', 'assets');
const pagesDir = path.join(root, '.open-next', 'server-functions', 'default', '.next', 'server', 'pages');
const R2 = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? '').replace(/\/$/, '');
const REGIONS = ['global', 'kr'];
const QUERY_ROUTED = new Set(['/units/detail/', '/world/detail/', '/world/stage/', '/iw/detail/']);

function* htmlPages(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlPages(full);
    else if (entry.name.endsWith('.html')) yield full;
  }
}

async function liveKeys(file, pick) {
  const keys = new Set();
  for (const region of REGIONS) {
    const res = await fetch(`${R2}/${region}/${file}`);
    if (!res.ok) throw new Error(`${region}/${file}: HTTP ${res.status}`);
    for (const k of Object.keys(pick(await res.json()) ?? {})) keys.add(k);
  }
  return [...keys];
}

const xml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

(async () => {
  const urls = new Set();
  const home = fs.readFileSync(path.join(assets, 'index.html'), 'utf8').match(/<link rel="canonical" href="([^"]+)"/);
  if (!home) throw new Error('no canonical link in .open-next/assets/index.html');
  const site = new URL(home[1]).origin;
  for (const file of htmlPages(pagesDir)) {
    const route = path.relative(pagesDir, file).replace(/\\/g, '/').replace(/\.html$/, '');
    if (route === '404' || route === '500') continue;
    const url = route === 'index' ? '/' : `/${route}/`;
    if (!QUERY_ROUTED.has(url)) urls.add(`${site}${url}`);
  }

  if (R2) {
    const entity = (route, id) => `${site}${route}?id=${encodeURIComponent(id)}`;
    for (const id of await liveKeys('split/units/unit_list.json', (d) => d)) urls.add(entity('/units/detail/', id));
    for (const id of await liveKeys('world.json', (d) => d)) urls.add(entity('/world/detail/', id));
    for (const id of await liveKeys('iw.json', (d) => d.bosses)) urls.add(entity('/iw/detail/', id));
  } else {
    console.warn('NEXT_PUBLIC_R2_PUBLIC_URL unset: sitemap lists static routes only');
  }

  const body = [...urls].sort().map((u) => `  <url><loc>${xml(u)}</loc></url>`).join('\n');
  fs.writeFileSync(path.join(assets, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
  fs.writeFileSync(path.join(assets, 'robots.txt'),
    ['User-agent: *', 'Allow: /', 'Disallow: /api/', '', `Sitemap: ${site}/sitemap.xml`, ''].join('\n'));
  console.log(`sitemap: ${urls.size} urls`);
})().catch((e) => { console.error(e); process.exit(1); });
