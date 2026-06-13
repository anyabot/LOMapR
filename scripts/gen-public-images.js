// Regenerate lib/publicImages.json — the build-time manifest of image files
// under public/images, used by lib/fetchData.ts to rewrite image URLs to bundled
// /public art (edge-safe; no filesystem access at request time).
//
// Walks the filesystem (no git dependency, so it works in any CI/build env).
// Run after adding/removing files under public/images:  npm run gen:images

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'public');
const imagesDir = path.join(root, 'images');

const files = [];
(function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else files.push(path.relative(root, full).split(path.sep).join('/'));
  }
})(imagesDir);

files.sort();
const out = path.join(__dirname, '..', 'lib', 'publicImages.json');
fs.writeFileSync(out, JSON.stringify(files));
console.log(`wrote ${files.length} entries to lib/publicImages.json`);
