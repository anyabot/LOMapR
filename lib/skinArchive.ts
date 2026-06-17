// Fetches a packed skin archive (<skin>.tar.br: a tar of the exported skin
// folder, brotli-compressed as one solid stream — see tools/skin_test/pack.py),
// decompresses it client-side, and untars it into a Map<filename, Blob> the
// viewer can build blob: URLs from. Brotli has no reliable native browser
// decoder (DecompressionStream doesn't support it), so we use a small WASM
// decoder (brotli-dec-wasm) instead.

const ARCHIVE_BASE = (process.env.NEXT_PUBLIC_SKIN_ARCHIVE_BASE ?? '').replace(/\/$/, '');

let brotliModPromise: Promise<{ decompress: (data: Uint8Array) => Uint8Array }> | null = null;
function loadBrotli(): Promise<{ decompress: (data: Uint8Array) => Uint8Array }> {
  if (!brotliModPromise) {
    brotliModPromise = import('brotli-dec-wasm').then((m) => m.default) as any;
  }
  return brotliModPromise!;
}

// Minimal USTAR reader: fixed 512-byte header records (name @0 len100, size as
// octal ASCII @124 len12), content padded to the next 512-byte boundary, two
// all-zero blocks terminate the archive. We control both producer (Python
// stdlib tarfile) and consumer, so this covers everything pack.py emits.
function untar(bytes: Uint8Array): Map<string, Blob> {
  const files = new Map<string, Blob>();
  const BLOCK = 512;
  let offset = 0;
  const decoder = new TextDecoder('utf-8');
  while (offset + BLOCK <= bytes.length) {
    const header = bytes.subarray(offset, offset + BLOCK);
    if (header.every((b) => b === 0)) break; // terminator block
    const name = decoder.decode(header.subarray(0, 100)).replace(/\0.*$/, '');
    const sizeStr = decoder.decode(header.subarray(124, 124 + 12)).replace(/\0.*$/, '').trim();
    const size = parseInt(sizeStr, 8) || 0;
    const dataStart = offset + BLOCK;
    if (name) {
      files.set(name, new Blob([bytes.subarray(dataStart, dataStart + size)]));
    }
    offset = dataStart + Math.ceil(size / BLOCK) * BLOCK;
  }
  return files;
}

const archiveCache = new Map<string, Promise<Map<string, Blob>>>();

// Fetch + decompress + untar a skin's archive (cached per skin name).
// If /skin_test/<skin>/layout.json exists (local dev override), use that instead.
export function loadSkinArchive(skin: string): Promise<Map<string, Blob>> {
  let p = archiveCache.get(skin);
  if (!p) {
    p = (async () => {
      const [res, brotli] = await Promise.all([
        fetch(`${ARCHIVE_BASE}/${skin}.tar.br`),
        loadBrotli(),
      ]);
      if (!res.ok) throw new Error(`failed to fetch ${skin}.tar.br: ${res.status}`);
      const compressed = new Uint8Array(await res.arrayBuffer());
      const tar = brotli.decompress(compressed);
      return untar(tar);
    })();
    archiveCache.set(skin, p);
  }
  return p;
}

// Blob URLs created per archive, so they can all be revoked together when a
// skin is no longer needed (see revokeSkinUrls).
const urlCache = new Map<string, Map<string, string>>();

export function urlFor(skin: string, files: Map<string, Blob>, filename: string): string {
  let urls = urlCache.get(skin);
  if (!urls) {
    urls = new Map();
    urlCache.set(skin, urls);
  }
  let url = urls.get(filename);
  if (!url) {
    const blob = files.get(filename);
    if (!blob) throw new Error(`${filename} not found in ${skin} archive`);
    url = URL.createObjectURL(blob);
    urls.set(filename, url);
  }
  return url;
}

// Load a skin from a local /skin_test/<skin>/ static directory instead of a
// .tar.br archive. Reads spine.json/layout.json to discover filenames, then
// fetches each file and builds the same Map<string, Blob> the viewer expects.
const localCache = new Map<string, Promise<Map<string, Blob>>>();
export function loadLocalSkinDir(skin: string): Promise<Map<string, Blob>> {
  let p = localCache.get(skin);
  if (!p) {
    p = (async () => {
      const base = `/skin_test/${skin}`;
      const files = new Map<string, Blob>();
      // fetch the manifest first (spine.json or layout.json)
      let meta: any = null;
      for (const name of ['spine.json', 'layout.json']) {
        const r = await fetch(`${base}/${name}`);
        if (r.ok) { meta = await r.json(); files.set(name, new Blob([JSON.stringify(meta)], { type: 'application/json' })); break; }
      }
      if (!meta) throw new Error(`no spine/layout.json in /skin_test/${skin}/`);
      // collect all referenced filenames
      const names = new Set<string>();
      if (meta.kind === 'spine') {
        if (meta.skel) names.add(meta.skel);
        if (meta.atlas) names.add(meta.atlas);
        if (meta.world?.bg?.tex) names.add(meta.world.bg.tex);
      } else {
        // fixed/skinned: collect tex names from nodes
        const walk = (n: any) => { if (n.sprite?.tex) names.add(n.sprite.tex); if (n.sprite?.rplus?.tex) names.add(n.sprite.rplus.tex); (n.children ?? []).forEach(walk); };
        (meta.nodes ?? []).forEach(walk);
        (meta.meshes ?? []).forEach((m: any) => { if (m.tex) names.add(m.tex); if (m.rplusTex) names.add(m.rplusTex); });
      }
      // fetch all files in parallel
      await Promise.all(Array.from(names).map(async (name) => {
        const r = await fetch(`${base}/${encodeURIComponent(name)}`);
        if (r.ok) files.set(name, await r.blob());
      }));
      // for spine: also fetch atlas page textures referenced inside the atlas text
      if (meta.atlas && files.has(meta.atlas)) {
        const atlasText = await files.get(meta.atlas)!.text();
        const pageNames = atlasText.split('\n').filter((l) => l && !l.startsWith('\t') && l.includes('.')).map((l) => l.trim());
        await Promise.all(pageNames.map(async (name) => {
          if (!files.has(name)) {
            const r = await fetch(`${base}/${encodeURIComponent(name)}`);
            if (r.ok) files.set(name, await r.blob());
          }
        }));
      }
      return files;
    })();
    localCache.set(skin, p);
  }
  return p;
}

export function revokeSkinUrls(skin: string) {
  const urls = urlCache.get(skin);
  if (!urls) return;
  for (const url of Array.from(urls.values())) URL.revokeObjectURL(url);
  urlCache.delete(skin);
}

// Read a text/JSON file straight from the blob map (skeleton/layout json).
export async function readText(files: Map<string, Blob>, filename: string): Promise<string> {
  const blob = files.get(filename);
  if (!blob) throw new Error(`${filename} not found in archive`);
  return blob.text();
}

// PIXI's texture loader picks a parser by file extension (PIXI.Assets.load),
// but blob: URLs have none, so the default dispatch finds no matching parser
// and silently returns no texture. Force the image-texture parser explicitly.
export async function loadTexture(PIXI: any, skin: string, files: Map<string, Blob>, filename: string): Promise<any> {
  return PIXI.Assets.load({ src: urlFor(skin, files, filename), loadParser: 'loadTextures' });
}
