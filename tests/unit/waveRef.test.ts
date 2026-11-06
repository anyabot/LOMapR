import { describe, it, expect } from 'vitest';
import type { WaveRef } from '@/interfaces/team';
import { encodeWaveRef, decodeWaveRef, sanitizeWaveRef } from '@/lib/waveRef';

const refs: WaveRef[] = [
  { src: 'world', world: 'Story', stage: '1-3B', wave: 2 },
  { src: 'sanctum', area: 'EW01', floor: 3, diff: 1, wave: 0 },
  { src: 'iw', boss: 'Colossus_01', stage: 4 },
];

describe('wave refs', () => {
  it.each(refs)('round-trips $src', (ref) => {
    expect(decodeWaveRef(encodeWaveRef(ref))).toEqual(ref);
  });

  it.each(['', 'world~Story~1-3B', 'world~Story~1-3B~-1', 'sanctum~EW01~x~0~0', 'iw~~1', 'other~a~b'])('rejects %j', (s) => {
    expect(decodeWaveRef(s)).toBeNull();
  });

  it('treats legacy stored entries without src as world refs', () => {
    expect(sanitizeWaveRef({ world: 'Story', stage: '1-1', wave: 0 })).toEqual({ src: 'world', world: 'Story', stage: '1-1', wave: 0 });
  });

  it('drops malformed stored entries', () => {
    expect(sanitizeWaveRef(null)).toBeNull();
    expect(sanitizeWaveRef('world~a~b~0')).toBeNull();
    expect(sanitizeWaveRef({ src: 'sanctum', area: 'EW01', floor: 1.5, diff: 0, wave: 0 })).toBeNull();
    expect(sanitizeWaveRef({ src: 'iw', boss: 'X', stage: '2' })).toEqual({ src: 'iw', boss: 'X', stage: 2 });
  });
});
