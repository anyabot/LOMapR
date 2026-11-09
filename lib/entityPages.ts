import { rankTag } from '@/lib/rank';
import { iwHref, stageHref, unitHref, worldHref, zoneHref } from '@/lib/href';
import { iwCanonicalId } from '@/lib/iwCanonical.mjs';

type Region = 'global' | 'kr';
type Table = Record<string, { en?: string; ko?: string }>;
const REGIONS: Region[] = ['global', 'kr'];

export interface StaticSeo {
  title: string;
  description: string;
  image?: string;
  canonicalPath?: string;
}
export interface EntityPageProps {
  seo: StaticSeo;
  region?: Region;
}

// Live R2 only: local data/ may hold unreleased preview data, and reading it from disk makes file tracing pull in the whole project.
const R2 = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? '').replace(/\/$/, '');
const cache = new Map<string, Promise<any | null>>();

async function fetchKey(key: string): Promise<any | null> {
  if (!R2) return null;
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(`${R2}/${key}`);
      if (res.status === 404) return null;
      if (res.ok) return await res.json();
      throw new Error(`${key}: HTTP ${res.status}`);
    } catch (e) {
      if (attempt >= 4) throw e;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
  }
}

function load(key: string): Promise<any | null> {
  if (!cache.has(key)) cache.set(key, fetchKey(key));
  return cache.get(key)!;
}

async function regional(region: Region, file: string): Promise<any | null> {
  return (await load(`${region}/${file}`)) ?? (region === 'kr' ? load(`global/${file}`) : null);
}

async function strings(): Promise<Record<Region, Table>> {
  const out = {} as Record<Region, Table>;
  for (const region of REGIONS) {
    const chunks = await Promise.all(['common', 'stage'].map((c) => regional(region, `split/strings/strings.${c}.json`)));
    out[region] = Object.assign({}, ...chunks.filter(Boolean));
  }
  return out;
}

// Mirrors lib/strings t() with the translation layers off (their default).
async function translator(region: Region) {
  const tables = await strings();
  const other: Region = region === 'kr' ? 'global' : 'kr';
  return (id: string | undefined | null): string => {
    if (!id) return '';
    const p = tables[region][id];
    if (p) {
      if (p.en) return p.en;
      const g = tables.global[id];
      if (region === 'kr' && g?.en && g.ko && g.ko.trim() === (p.ko ?? '').trim()) return g.en;
      return p.ko || id;
    }
    const s = tables[other][id];
    return s ? s.en || s.ko || id : id;
  };
}

const keyed = async (file: string, pick: (d: any) => Record<string, any> = (d) => d ?? {}) => {
  const out = {} as Record<Region, Record<string, any>>;
  for (const region of REGIONS) out[region] = pick(await regional(region, file)) ?? {};
  return out;
};

// Global first; an entity only in KR is rendered with the KR region forced.
function homeRegion<T>(byRegion: Record<Region, Record<string, T>>, id: string): Region | null {
  if (id in byRegion.global) return 'global';
  return id in byRegion.kr ? 'kr' : null;
}

const props = (seo: StaticSeo, region: Region): EntityPageProps =>
  region === 'kr' ? { seo, region } : { seo };

// ── units ────────────────────────────────────────────────────────────────────
const unitLists = () => keyed('split/units/unit_list.json');

export async function unitIds(): Promise<string[]> {
  const lists = await unitLists();
  return Array.from(new Set([...Object.keys(lists.global), ...Object.keys(lists.kr)]));
}

export async function unitProps(id: string): Promise<EntityPageProps | null> {
  const lists = await unitLists();
  const region = homeRegion(lists, id);
  if (!region) return null;
  const u = lists[region][id];
  const t = await translator(region);
  const name = u.canonName || u.profile?.engName || t(u.name);
  const rank = rankTag(u.rarity);
  const faction = u.faction ? ` of ${t(u.faction.name).replace(/\s+(?:II|III|IV|V)$/i, '')}` : '';
  return props({
    title: name,
    description: `${name} is a${/^[AS]/.test(rank) ? 'n' : ''} ${rank}-rank ${u.type} ${u.role}${u.body ? ` ${u.body}` : ''}${faction} in Last Origin: stats, skills and skins.`,
    ...(u.icon ? { image: `/images/icons/${u.icon}.png` } : {}),
    canonicalPath: unitHref(id),
  }, region);
}

// ── worlds, zones, stages ────────────────────────────────────────────────────
const worlds = () => keyed('world.json');

export async function worldIds(): Promise<string[]> {
  const w = await worlds();
  return Array.from(new Set([...Object.keys(w.global), ...Object.keys(w.kr)]));
}

export async function worldProps(id: string): Promise<EntityPageProps | null> {
  const w = await worlds();
  const region = homeRegion(w, id);
  if (!region) return null;
  const t = await translator(region);
  const title = t(w[region][id].title);
  return props({ title, description: `${title} in Last Origin: stages, story and rewards.`, canonicalPath: worldHref(id) }, region);
}

export async function zoneKeys(): Promise<{ id: string; zone: string }[]> {
  const w = await worlds();
  const seen = new Set<string>();
  const out: { id: string; zone: string }[] = [];
  for (const region of REGIONS) {
    for (const [id, world] of Object.entries(w[region])) {
      (world.zones ?? []).forEach((_: unknown, i: number) => {
        const k = `${id}/${i + 1}`;
        if (!seen.has(k)) { seen.add(k); out.push({ id, zone: String(i + 1) }); }
      });
    }
  }
  return out;
}

function zoneRegion(w: Record<Region, Record<string, any>>, id: string, zone: number): Region | null {
  for (const region of REGIONS) if (w[region][id]?.zones?.[zone - 1]) return region;
  return null;
}

export async function zoneProps(id: string, zoneParam: string): Promise<EntityPageProps | null> {
  const w = await worlds();
  const zone = Number(zoneParam);
  const region = zoneRegion(w, id, zone);
  if (!region) return null;
  const t = await translator(region);
  const title = t(w[region][id].zones[zone - 1].title);
  return props({ title, description: `${title} stages in Last Origin: enemy waves, rewards and missions.`, canonicalPath: zoneHref(id, zone) }, region);
}

const stagesOf = (z: any): any[] => (z?.subzones ? z.subzones.flat() : z?.stages ?? []);

async function findStage(region: Region, id: string, zone: number, stage: string) {
  const split = await regional(region, `split/world/${id}.json`);
  const z = split?.zones?.[zone - 1];
  const s = stagesOf(z).find((x) => x.title.toLowerCase() === stage.toLowerCase());
  return s ? { split, z, s } : null;
}

export async function stageKeys(): Promise<{ id: string; zone: string; stage: string }[]> {
  const w = await worlds();
  const seen = new Set<string>();
  const out: { id: string; zone: string; stage: string }[] = [];
  for (const region of REGIONS) {
    for (const id of Object.keys(w[region])) {
      const split = await regional(region, `split/world/${id}.json`);
      (split?.zones ?? []).forEach((z: any, i: number) => {
        for (const s of stagesOf(z)) {
          const k = `${id}/${i + 1}/${s.title.toLowerCase()}`;
          if (!seen.has(k)) { seen.add(k); out.push({ id, zone: String(i + 1), stage: s.title }); }
        }
      });
    }
  }
  return out;
}

export async function stageProps(id: string, zoneParam: string, stage: string): Promise<EntityPageProps | null> {
  const zone = Number(zoneParam);
  for (const region of REGIONS) {
    const hit = await findStage(region, id, zone, stage);
    if (!hit) continue;
    const t = await translator(region);
    const { split, z, s } = hit;
    const name = s.name && t(s.name) !== s.title ? ` ${t(s.name)}` : '';
    const zoneTitle = t(z.title);
    const battle = s.subtype !== 'Story' && (s.waves ?? []).length > 0;
    return props({
      title: `${s.title}${name} · ${zoneTitle}`,
      description: `${s.title}${name} in ${zoneTitle} (${t(split.title)}), Last Origin: ${battle ? 'enemy waves, drops, rewards and missions' : 'story stage and rewards'}.`,
      canonicalPath: stageHref(id, zone, s.title),
    }, region);
  }
  return null;
}

// ── infinite war ─────────────────────────────────────────────────────────────
const bosses = () => keyed('iw.json', (d) => d?.bosses ?? {});

export async function iwIds(): Promise<string[]> {
  const b = await bosses();
  return Array.from(new Set([...Object.keys(b.global), ...Object.keys(b.kr)]));
}

export async function iwProps(id: string): Promise<EntityPageProps | null> {
  const b = await bosses();
  const region = homeRegion(b, id);
  if (!region) return null;
  const t = await translator(region);
  const boss = b[region][id];
  const enemies = (await regional(region, 'split/enemy_list.json')) ?? {};
  const enemy = enemies[boss?.[0]?.phase?.[0]?.id];
  const title = enemy ? `${t(enemy.name)} ${id.split('_').pop()}` : id.replace(/_/g, ' ');
  return props({
    title: `${title} - Raid Boss`,
    description: `${title}, a Last Origin Infinite War raid boss: phases, stats and skills across all ${boss.length} stages.`,
    canonicalPath: iwHref(iwCanonicalId(b[region], id)),
  }, region);
}
