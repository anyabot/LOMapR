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
const SKIP = new Set(['/404/', '/500/', '/units/detail/', '/world/detail/', '/world/stage/', '/iw/detail/']);

async function liveData(file) {
  const out = {};
  for (const region of REGIONS) {
    const res = await fetch(`${R2}/${region}/${file}`);
    if (!res.ok) throw new Error(`${region}/${file}: HTTP ${res.status}`);
    out[region] = await res.json();
  }
  return out;
}

// Global ids, then KR-only ids with ?server=kr, the same form the page's canonical takes.
function entityUrls(site, route, byRegion, keep = () => true) {
  const urls = [];
  const seen = new Set(Object.keys(byRegion.global ?? {}));
  for (const region of REGIONS) {
    const data = byRegion[region] ?? {};
    for (const id of Object.keys(data)) {
      if (region !== 'global' && seen.has(id)) continue;
      if (!keep(data, id)) continue;
      urls.push(`${site}${route}?id=${encodeURIComponent(id)}${region === 'global' ? '' : `&server=${region}`}`);
    }
  }
  return urls;
}

(async () => {
  const { htmlRoutes, robotsTxt, sitemapXml } = await import('@altterisk/game-hub/build');
  const home = fs.readFileSync(path.join(assets, 'index.html'), 'utf8').match(/<link rel="canonical" href="([^"]+)"/);
  if (!home) throw new Error('no canonical link in .open-next/assets/index.html');
  const site = new URL(home[1]).origin;
  const urls = new Set(htmlRoutes(pagesDir, { exclude: (r) => SKIP.has(r) }).map((r) => `${site}${r}`));

  if (R2) {
    const { iwCanonicalId } = await import('../lib/iwCanonical.mjs');
    const iw = await liveData('iw.json');
    const bosses = Object.fromEntries(Object.entries(iw).map(([r, d]) => [r, d.bosses]));
    const add = (list) => list.forEach((u) => urls.add(u));
    add(entityUrls(site, '/units/detail/', await liveData('split/units/unit_list.json')));
    add(entityUrls(site, '/world/detail/', await liveData('world.json')));
    add(entityUrls(site, '/iw/detail/', bosses, (data, id) => iwCanonicalId(data, id) === id));
  } else {
    console.warn('NEXT_PUBLIC_R2_PUBLIC_URL unset: sitemap lists static routes only');
  }

  fs.writeFileSync(path.join(assets, 'sitemap.xml'), sitemapXml([...urls].sort()));
  fs.writeFileSync(path.join(assets, 'robots.txt'), robotsTxt(site, { disallow: ['/api/'] }));
  console.log(`sitemap: ${urls.size} urls`);
})().catch((e) => { console.error(e); process.exit(1); });
