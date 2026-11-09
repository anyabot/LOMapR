// Post-build step (end of `npm run cf:build`): writes sitemap.xml and robots.txt into .open-next/assets.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const assets = path.join(root, '.open-next', 'assets');
const pagesDir = path.join(root, '.open-next', 'server-functions', 'default', '.next', 'server', 'pages');

const SKIP = new Set(['/404/', '/500/', '/units/detail/', '/world/detail/', '/world/stage/', '/iw/detail/']);
const canonicalOf =(html) => /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1] ?? null;

(async () => {
  const { htmlRoutes, robotsTxt, sitemapXml } = await import('@altterisk/game-hub/build');
  const home = canonicalOf(fs.readFileSync(path.join(assets, 'index.html'), 'utf8'));
  if (!home) throw new Error('no canonical link in .open-next/assets/index.html');
  const site = new URL(home).origin;

  // A page that names another URL as canonical (an IW rerun) is left out.
  const urls = [];
  for (const route of htmlRoutes(pagesDir, { exclude: (r) => SKIP.has(r) })) {
    const file = path.join(assets, route === '/' ? 'index.html' : path.join(route, 'index.html'));
    if (!fs.existsSync(file)) continue;
    const url = `${site}${route.split('/').map((s) => encodeURIComponent(decodeURIComponent(s))).join('/')}`;
    const canonical = canonicalOf(fs.readFileSync(file, 'utf8'));
    if (canonical === null || canonical === url) urls.push(url);
  }

  fs.writeFileSync(path.join(assets, 'sitemap.xml'), sitemapXml(urls.sort()));
  fs.writeFileSync(path.join(assets, 'robots.txt'), robotsTxt(site, { disallow: ['/api/'] }));
  console.log(`sitemap: ${urls.length} urls`);
})().catch((e) => { console.error(e); process.exit(1); });
