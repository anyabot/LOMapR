// Writes tile-sized WebP copies of the icon PNGs to public/images/_w (gitignored); see lib/imageSrc.ts.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const images = path.join(__dirname, '..', 'public', 'images');
const out = path.join(images, '_w');
const DIRS = ['icons', 'tbaricon'];
const MAX_SIZE = 192;
const PARALLEL = 8;

const jobs = [];
for (const dir of DIRS) {
  (function walk(d) {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith('.png')) jobs.push(full);
    }
  })(path.join(images, dir));
}

// An up-to-date copy is left alone, so a rebuild writes only what changed.
const stale = jobs.filter((src) => {
  const dest = path.join(out, path.relative(images, src)).replace(/\.png$/, '.webp');
  return !fs.existsSync(dest) || fs.statSync(dest).mtimeMs < fs.statSync(src).mtimeMs;
});

let written = 0;
let failed = 0;
async function convert(src) {
  const dest = path.join(out, path.relative(images, src)).replace(/\.png$/, '.webp');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  try {
    await sharp(src)
      .resize({ width: MAX_SIZE, height: MAX_SIZE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80, alphaQuality: 90 })
      .toFile(dest);
    written++;
  } catch (err) {
    failed++;
    console.error(`skipped ${path.relative(images, src)}: ${err.message}`);
  }
}

(async () => {
  let next = 0;
  await Promise.all(Array.from({ length: PARALLEL }, async () => {
    while (next < stale.length) await convert(stale[next++]);
  }));
  console.log(`image variants: ${written} written, ${jobs.length - stale.length} up to date, ${failed} failed`);
})();
