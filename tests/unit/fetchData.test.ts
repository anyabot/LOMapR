import { describe, it, expect, beforeEach, vi } from 'vitest';

const BASE = 'https://r2.test';
let routes: Record<string, unknown>;
let calls: string[];
let f: typeof import('@/lib/fetchData');

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
const status = (code: number) => ({ ok: false, status: code, json: async () => null });

beforeEach(async () => {
  routes = {};
  calls = [];
  vi.stubEnv('NEXT_PUBLIC_DATA_SOURCE', '');
  vi.stubEnv('NEXT_PUBLIC_R2_PUBLIC_URL', `${BASE}/`);
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    calls.push(url.slice(BASE.length));
    const r = routes[url.slice(BASE.length)];
    if (r instanceof Error) throw r;
    if (typeof r === 'number') return status(r);
    return r === undefined ? status(404) : ok(structuredClone(r));
  }));
  vi.resetModules();
  f = await import('@/lib/fetchData');
});

describe('fetchData', () => {
  it('falls back from kr/<file> to global/<file>', async () => {
    routes['/global/skill.json'] = { S1: { name: 'x' } };
    expect(await f.fetchSkills('kr')).toEqual({ S1: { name: 'x', id: 'S1' } });
    expect(calls).toEqual(['/kr/skill.json', '/global/skill.json']);
  });

  it('never falls back from global to kr', async () => {
    routes['/kr/skill.json'] = { S1: {} };
    expect(await f.fetchSkills('global')).toEqual({});
    expect(calls).toEqual(['/global/skill.json']);
  });

  it('shares one request per key and caches the result', async () => {
    routes['/global/iw.json'] = { B: {} };
    await Promise.all([f.fetchIW('global'), f.fetchIW('global')]);
    await f.fetchIW('global');
    expect(calls).toEqual(['/global/iw.json']);
  });

  it('retries once on 5xx', async () => {
    let n = 0;
    (fetch as any).mockImplementation(async (url: string) => {
      calls.push(url);
      return n++ === 0 ? status(503) : ok({ v: 1 });
    });
    expect(await f.fetchCombat('global')).toEqual({ v: 1 });
    expect(calls).toHaveLength(2);
  });

  it('refetches after a failure instead of caching it', async () => {
    routes['/global/misc.json'] = new Error('offline');
    expect(await f.fetchMisc('global')).toBeNull();
    routes['/global/misc.json'] = { ok: 1 };
    expect(await f.fetchMisc('global')).toEqual({ ok: 1 });
  });

  it('fills missing stage and wave arrays in world data', async () => {
    routes['/global/world.json'] = { Story: { zones: [{ stages: [{}] }, {}] } };
    const w = await f.fetchWorld('global');
    expect(w.Story).toEqual({ id: 'Story', zones: [{ stages: [{ waves: [] }] }, { stages: [] }] });
  });

  it('fills sanctum floor arrays', async () => {
    routes['/global/sanctum.json'] = { EW01: [[{ name: 'f' }]] };
    const s = await f.fetchSanctum('global');
    expect(s.EW01[0][0]).toEqual({ name: 'f', prohibition: [], suitability: [], waves: [] });
  });

  it('looks a single enemy up in its region, then global', async () => {
    routes['/global/split/enemy_list.json'] = { E1: { name: 'g' } };
    routes['/kr/split/enemy_list.json'] = { E2: { name: 'k' } };
    expect(await f.fetchEnemy('E1', 'kr')).toEqual({ name: 'g', id: 'E1' });
    expect(await f.fetchEnemy('E2', 'kr')).toEqual({ name: 'k', id: 'E2' });
    expect(await f.fetchEnemy('E2', 'global')).toBeNull();
  });

  it('merges KR images over global and prefers bundled art', async () => {
    routes['/global/images.json'] = { a: '/images/icons/Ev_Chocolate_3P_Aurora.png', b: 'g' };
    routes['/kr/images.json'] = { b: 'k', c: `${BASE}/o/images%2Ficons%2FEv_Chocolate_3P_Aurora.png?x=1` };
    expect(await f.fetchImages('kr')).toEqual({
      a: '/images/_w/icons/Ev_Chocolate_3P_Aurora.webp',
      b: 'k',
      c: '/images/_w/icons/Ev_Chocolate_3P_Aurora.webp',
    });
  });

  it('skips the request entirely for a missing ref', async () => {
    expect(await f.fetchSplitSkills(undefined, 'global')).toBeNull();
    expect(calls).toEqual([]);
  });
});
