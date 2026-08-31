// Regenerates lib/publicImages.json, the build-time manifest of public/images that
// lib/fetchData.ts uses to rewrite image URLs. Run via `npm run gen:images`.


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
