import { describe, it, expect, beforeEach, vi } from 'vitest';

let s: typeof import('@/lib/strings');

beforeEach(async () => {
  vi.resetModules();
  s = await import('@/lib/strings');
  s.setChunkData('global', 'common', { A: { en: 'A-global', ko: 'A-ko' }, G: { en: 'G-only' } });
  s.setChunkData('kr', 'common', { A: { ko: 'A-ko' }, K: { ko: 'K-ko' }, D: { ko: 'D-changed' } });
  s.setChunkData('global', 'skill', { D: { en: 'D-global', ko: 'D-ko' } });
});

describe('t()', () => {
  it('returns the key itself on a miss and "" for empty input', () => {
    expect(s.t('Missing')).toBe('Missing');
    expect(s.t(undefined)).toBe('');
    expect(s.tOrEmpty('Missing')).toBe('');
  });

  it('looks across every loaded chunk', () => {
    expect(s.t('D')).toBe('D-global');
    expect(s.isChunkLoaded('global', 'skill')).toBe(true);
    expect(s.isChunkLoaded('global', 'voice')).toBe(false);
  });

  it('ignores empty tables', () => {
    s.setChunkData('global', 'voice', {});
    expect(s.isChunkLoaded('global', 'voice')).toBe(false);
  });

  it('on KR, borrows global English only when the Korean text matches', () => {
    s.setStringsRegion('kr');
    expect(s.t('A')).toBe('A-global');
    expect(s.t('D')).toBe('D-changed');
    expect(s.t('K')).toBe('K-ko');
    expect(s.t('G')).toBe('G-only');
    expect(s.t('A', 'ko')).toBe('A-ko');
  });

  it('applies overlay layers in order: community, then region MTL', () => {
    s.setCommunityData({ A: { en: 'A-community' } });
    s.setMtlData({ A: { en: 'A-mtl' }, G: { en: 'G-mtl' } });
    s.setKrMtlData({ G: { en: 'G-krmtl' } });
    s.setStringsLayers({ mtl: true, krMtl: true, community: true });
    expect(s.t('A')).toBe('A-community');
    expect(s.t('G')).toBe('G-mtl');
    s.setStringsRegion('kr');
    expect(s.t('G')).toBe('G-krmtl');
    s.setStringsLayers({ mtl: false, krMtl: false, community: false });
    expect(s.t('A')).toBe('A-global');
  });

  it('never applies overlays to Korean lookups', () => {
    s.setCommunityData({ A: { en: 'A-community', ko: 'X' } });
    s.setStringsLayers({ mtl: false, krMtl: false, community: true });
    expect(s.t('A', 'ko')).toBe('A-ko');
  });
});
