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

async function liveKeys(file, pick) {
  const keys = new Set();
  for (const region of REGIONS) {
    const res = await fetch(`${R2}/${region}/${file}`);
    if (!res.ok) throw new Error(`${region}/${file}: HTTP ${res.status}`);
    for (const k of Object.keys(pick(await res.json()) ?? {})) keys.add(k);
  }
  return [...keys];
}

(async () => {
  const { htmlRoutes, robotsTxt, sitemapXml } = await import('@altterisk/game-hub/build');
  const home = fs.readFileSync(path.join(assets, 'index.html'), 'utf8').match(/<link rel="canonical" href="([^"]+)"/);
  if (!home) throw new Error('no canonical link in .open-next/assets/index.html');
  const site = new URL(home[1]).origin;
  const urls = new Set(htmlRoutes(pagesDir, { exclude: (r) => SKIP.has(r) }).map((r) => `${site}${r}`));

  if (R2) {
    const entity = (route, id) => `${site}${route}?id=${encodeURIComponent(id)}`;
    for (const id of await liveKeys('split/units/unit_list.json', (d) => d)) urls.add(entity('/units/detail/', id));
    for (const id of await liveKeys('world.json', (d) => d)) urls.add(entity('/world/detail/', id));
    for (const id of await liveKeys('iw.json', (d) => d.bosses)) urls.add(entity('/iw/detail/', id));
  } else {
    console.warn('NEXT_PUBLIC_R2_PUBLIC_URL unset: sitemap lists static routes only');
  }

  fs.writeFileSync(path.join(assets, 'sitemap.xml'), sitemapXml([...urls].sort()));
  fs.writeFileSync(path.join(assets, 'robots.txt'), robotsTxt(site, { disallow: ['/api/'] }));
  console.log(`sitemap: ${urls.size} urls`);
})().catch((e) => { console.error(e); process.exit(1); });
