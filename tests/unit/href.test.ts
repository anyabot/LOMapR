import { describe, it, expect, vi } from 'vitest';
import type { NextRouter } from 'next/router';
import { withSlash, withSlashUrl, dropQueryParams } from '@/lib/href';

describe('withSlash', () => {
  it.each([
    ['/units', '/units/'],
    ['/units/detail?id=X#top', '/units/detail/?id=X#top'],
    ['/units/', '/units/'],
    ['/', '/'],
    ['/images/a.png', '/images/a.png'],
    ['https://example.com/a', 'https://example.com/a'],
    ['//cdn/a', '//cdn/a'],
    ['#anchor', '#anchor'],
  ])('%s -> %s', (input, out) => {
    expect(withSlash(input)).toBe(out);
  });

  it('fixes the pathname of a UrlObject', () => {
    expect(withSlashUrl({ pathname: '/team', query: { a: '1' } })).toEqual({ pathname: '/team/', query: { a: '1' } });
    expect(withSlashUrl({ query: { a: '1' } })).toEqual({ query: { a: '1' } });
  });
});

describe('dropQueryParams', () => {
  const router = (asPath: string) => {
    const replace = vi.fn();
    return { r: { asPath, replace } as unknown as NextRouter, replace };
  };

  it('removes the keys and keeps the rest with a shallow replace', () => {
    const { r, replace } = router('/team/?w=abc&code=4.x#frag');
    dropQueryParams(r, ['w']);
    expect(replace).toHaveBeenCalledWith('/team/?code=4.x', undefined, { shallow: true, scroll: false });
  });

  it('drops the ? entirely when nothing is left', () => {
    const { r, replace } = router('/team/?w=abc');
    dropQueryParams(r, ['w']);
    expect(replace).toHaveBeenCalledWith('/team/', undefined, { shallow: true, scroll: false });
  });

  it('does nothing when none of the keys are present', () => {
    const { r, replace } = router('/team/?code=1');
    dropQueryParams(r, ['w']);
    expect(replace).not.toHaveBeenCalled();
  });
});
