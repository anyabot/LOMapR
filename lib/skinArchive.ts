import { cacheArchive, loadArchive, type ArchiveFiles } from '@altterisk/game-hub/archive';

const ARCHIVE_BASE = (process.env.NEXT_PUBLIC_SKIN_ARCHIVE_BASE ?? '').replace(/\/$/, '');
const LOCAL_SKIN_DIR = process.env.NEXT_PUBLIC_LOCAL_SKIN_DIR === '1';

function loadPacked(cacheName: string, skin: string): Promise<ArchiveFiles> {
  return loadArchive(cacheName, () => [`${ARCHIVE_BASE}/${skin}.tar.br`]);
}

// The unpacked-directory override is opt-in so ordinary dev sessions do not generate one 404 per archived skin.
export function loadSkinArchive(skin: string): Promise<ArchiveFiles> {
  if (process.env.NODE_ENV !== 'production' && LOCAL_SKIN_DIR) {
    return cacheArchive(skin, () => loadLocalSkinDir(skin).catch(() => loadPacked(`${skin}#packed`, skin)));
  }
  return loadPacked(skin, skin);
}

// Reads spine.json/layout.json to discover filenames, then builds the same Map.
async function loadLocalSkinDir(skin: string): Promise<ArchiveFiles> {
  const base = `/skin_test/${skin}`;
  const files: ArchiveFiles = new Map();
  let meta: any = null;
  for (const name of ['spine.json', 'layout.json']) {
    const r = await fetch(`${base}/${name}`);
    if (r.ok) { meta = await r.json(); files.set(name, new Blob([JSON.stringify(meta)], { type: 'application/json' })); break; }
  }
  if (!meta) throw new Error(`no spine/layout.json in /skin_test/${skin}/`);
  const names = new Set<string>();
  if (meta.kind === 'spine') {
    if (meta.skel) names.add(meta.skel);
    if (meta.atlas) names.add(meta.atlas);
    if (meta.world?.bg?.tex) names.add(meta.world.bg.tex);
  } else {
    const walk = (n: any) => { if (n.sprite?.tex) names.add(n.sprite.tex); if (n.sprite?.rplus?.tex) names.add(n.sprite.rplus.tex); (n.children ?? []).forEach(walk); };
    (meta.nodes ?? []).forEach(walk);
    (meta.meshes ?? []).forEach((m: any) => { if (m.tex) names.add(m.tex); if (m.rplusTex) names.add(m.rplusTex); });
    (meta.faces ?? []).forEach((f: any) => { if (f.tex) names.add(f.tex); });
  }
  await Promise.all(Array.from(names).map(async (name) => {
    const r = await fetch(`${base}/${encodeURIComponent(name)}`);
    if (r.ok) files.set(name, await r.blob());
  }));
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
}
