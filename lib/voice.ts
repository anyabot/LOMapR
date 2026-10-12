import { useEffect, useState, useSyncExternalStore } from 'react';
import { loadArchive, type ArchiveFiles } from '@altterisk/game-hub/archive';
import { createPersisted } from '@altterisk/game-hub/persist';
import type { Dub, UnitVoice, VoiceEntry, VoiceLine } from '@/interfaces/voice';
import { fetchStringChunk, fetchUnitVoice, type Region } from './fetchData';
import { isChunkLoaded, setChunkData } from './strings';

const R2 = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? '').replace(/\/$/, '');
const VOICE_BASE = (process.env.NEXT_PUBLIC_VOICE_BASE ?? (R2 ? `${R2}/voice` : '')).replace(/\/$/, '');

export const DUB_OPTIONS: { value: Dub; label: string }[] = [
  { value: 'jp', label: 'JP' },
  { value: 'kr', label: 'KR' },
];

const EVENT_LABEL: Record<string, string> = {
  SquadJoin: 'Squad join', Leader: 'Squad leader', SortiePick: 'Sortie', StageStart: 'Stage start',
  SearchStart: 'Exploration start', SearchEnd: 'Exploration end', Reinforce: 'Enhance', CoreLink: 'Core link',
  ItemEquip: 'Equip', PresentGet: 'Gift',
};

export function eventLabel(name: string): string {
  return EVENT_LABEL[name] ?? name.replace(/([a-z])([A-Z])/g, '$1 $2');
}

// ── preferred dub, shared by every voice surface ─────────────────────────────
const dubStore = createPersisted<Dub | null>({
  key: 'lomapr.voiceDub',
  version: 1,
  empty: () => null,
  sanitize: (raw) => (raw === 'jp' || raw === 'kr' ? raw : null),
});
let preferred: Dub | null = null;
const dubListeners = new Set<() => void>();

function readDub(): Dub {
  if (preferred === null) preferred = dubStore.load() ?? 'jp';
  return preferred;
}

export function setPreferredDub(dub: Dub) {
  preferred = dub;
  dubStore.save(dub);
  dubListeners.forEach((fn) => fn());
}

export function usePreferredDub(): Dub {
  return useSyncExternalStore(
    (fn) => { dubListeners.add(fn); return () => { dubListeners.delete(fn); }; },
    readDub,
    () => 'jp',
  );
}

export function entryDubs(entry: VoiceEntry | null | undefined): Dub[] {
  return DUB_OPTIONS.map((o) => o.value).filter((d) => (entry?.packs[d]?.length ?? 0) > 0);
}

export function dubFor(entry: VoiceEntry | null | undefined, wanted: Dub): Dub | null {
  const dubs = entryDubs(entry);
  return dubs.includes(wanted) ? wanted : dubs[0] ?? null;
}

// ── data ─────────────────────────────────────────────────────────────────────
const voiceStrings = new Map<Region, Promise<void>>();

function ensureVoiceStrings(region: Region): Promise<void> {
  let pending = voiceStrings.get(region);
  if (!pending) {
    const regions: Region[] = region === 'global' ? ['global'] : ['global', region];
    pending = Promise.all(regions.map(async (r) => {
      if (isChunkLoaded(r, 'voice')) return;
      const table = await fetchStringChunk(r, 'voice');
      if (table) setChunkData(r, 'voice', table);
    })).then(() => undefined);
    pending.catch(() => voiceStrings.delete(region));
    voiceStrings.set(region, pending);
  }
  return pending;
}

export function useUnitVoice(region: Region, unitId: string | undefined): { voice: UnitVoice | null; loaded: boolean } {
  const [state, setState] = useState<{ key: string; voice: UnitVoice | null } | null>(null);
  const key = `${region}/${unitId ?? ''}`;
  useEffect(() => {
    if (!unitId) return;
    let cancelled = false;
    Promise.all([fetchUnitVoice(region, unitId), ensureVoiceStrings(region).catch(() => undefined)])
      .then(([voice]) => { if (!cancelled) setState({ key, voice: voice?.entries?.length ? voice : null }); })
      .catch(() => { if (!cancelled) setState({ key, voice: null }); });
    return () => { cancelled = true; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const current = state?.key === key ? state : null;
  return { voice: current?.voice ?? null, loaded: !!current };
}

export function entryForSkin(voice: UnitVoice | null, skinKey: string): VoiceEntry | null {
  return voice?.entries.find((e) => e.skins.includes(skinKey)) ?? null;
}

// ── packs ────────────────────────────────────────────────────────────────────
function loadPack(dub: Dub, pack: string): Promise<ArchiveFiles> {
  return loadArchive(`voice/${dub}/${pack}`, () => (VOICE_BASE ? [`${VOICE_BASE}/${dub}/${pack}.tar`] : []),
    { decompress: (bytes) => bytes });
}

async function clipBlob(entry: VoiceEntry, dub: Dub, clip: string): Promise<Blob | null> {
  for (const pack of entry.packs[dub] ?? []) {
    const blob = (await loadPack(dub, pack)).get(`${clip}.ogg`);
    if (blob) return blob;
  }
  return null;
}

// Resolves to the clips the entry's packs hold, or an empty set when none could be fetched.
export function useEntryClips(entry: VoiceEntry | null, dub: Dub | null): Set<string> | null {
  const [state, setState] = useState<{ key: string; clips: Set<string> } | null>(null);
  const key = entry && dub ? `${dub}:${(entry.packs[dub] ?? []).join(',')}` : '';
  useEffect(() => {
    if (!entry || !dub) return;
    let cancelled = false;
    Promise.all((entry.packs[dub] ?? []).map((p) => loadPack(dub, p).catch(() => new Map() as ArchiveFiles)))
      .then((all) => {
        if (cancelled) return;
        const clips = new Set<string>();
        for (const files of all) for (const name of Array.from(files.keys())) clips.add(name.replace(/\.ogg$/, ''));
        setState({ key, clips });
      });
    return () => { cancelled = true; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return state?.key === key ? state.clips : null;
}

// ── playback: one line at a time, a new line replaces the current one ───────
let audio: HTMLAudioElement | null = null;
let token = 0;
let playing: string | null = null;
const playListeners = new Set<() => void>();
const objectUrls = new Map<string, string>();
const MAX_URLS = 200;

function setPlaying(id: string | null) {
  playing = id;
  playListeners.forEach((fn) => fn());
}

export function useNowPlaying(): string | null {
  return useSyncExternalStore(
    (fn) => { playListeners.add(fn); return () => { playListeners.delete(fn); }; },
    () => playing,
    () => null,
  );
}

export function clipId(dub: Dub, clip: string): string {
  return `${dub}/${clip}`;
}

export function stopVoice() {
  token += 1;
  if (audio) {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  }
  setPlaying(null);
}

export async function playClip(entry: VoiceEntry, dub: Dub, clip: string): Promise<boolean> {
  const mine = ++token;
  const id = clipId(dub, clip);
  let url = objectUrls.get(id);
  if (!url) {
    const blob = await clipBlob(entry, dub, clip).catch(() => null);
    if (mine !== token) return false;
    if (!blob) return false;
    url = URL.createObjectURL(new Blob([blob], { type: 'audio/ogg' }));
    objectUrls.set(id, url);
    if (objectUrls.size > MAX_URLS) {
      const [oldId, oldUrl] = objectUrls.entries().next().value as [string, string];
      URL.revokeObjectURL(oldUrl);
      objectUrls.delete(oldId);
    }
  }
  if (!audio) {
    audio = new Audio();
    audio.addEventListener('ended', () => setPlaying(null));
    audio.addEventListener('error', () => setPlaying(null));
  }
  audio.src = url;
  audio.currentTime = 0;
  setPlaying(id);
  try {
    await audio.play();
    return true;
  } catch {
    if (mine === token) setPlaying(null);
    return false;
  }
}

// ── touch: pick the line a lobby touch would say ─────────────────────────────
export interface TouchMemory { last?: string; special: number }

function pick(lines: VoiceLine[], memory: TouchMemory): VoiceLine | null {
  if (!lines.length) return null;
  const pool = lines.length > 1 ? lines.filter((l) => l[1] !== memory.last) : lines;
  const line = pool[Math.floor(Math.random() * pool.length)];
  memory.last = line[1];
  return line;
}

export function touchLine(entry: VoiceEntry, zone: string, tier: number, memory: TouchMemory): VoiceLine | null {
  if (zone === 'body') {
    const tiers = entry.tiers ?? [];
    for (let t = Math.min(tier, tiers.length) - 1; t >= 0; t -= 1) if (tiers[t]?.length) return pick(tiers[t], memory);
    return pick(tiers.find((t) => t.length) ?? [], memory);
  }
  const sets = (entry.special ?? []).filter((s) => s.length);
  if (!sets.length) return null;
  if (zone === 'special2' && (entry.special?.[1]?.length ?? 0) > 0) return pick(entry.special![1], memory);
  const set = sets[memory.special % sets.length];
  memory.special += 1;
  return pick(set, memory);
}
