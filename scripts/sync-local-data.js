// DEV-ONLY: copy data/ -> public/local-data/ so `npm run dev:local` can serve
// on-disk JSON as static files (the client reads /local-data/<key>, mirroring the
// R2 key layout). public/local-data is gitignored and never deployed.

const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'data');
const dest = path.join(__dirname, '..', 'public', 'local-data');

// `--clean` removes the dev copy so it never ships in a production build.
if (process.argv.includes('--clean')) {
  fs.rmSync(dest, { recursive: true, force: true });
  console.log('removed public/local-data/');
  process.exit(0);
}

if (!fs.existsSync(src)) {
  console.error('No data/ directory found — nothing to sync.');
  process.exit(0);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });

let count = 0;
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.isDirectory()) walk(path.join(d, e.name));
    else count++;
  }
})(dest);

console.log(`synced data/ -> public/local-data/ (${count} files)`);
