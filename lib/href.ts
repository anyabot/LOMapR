import type { NextRouter } from 'next/router';
import type { UrlObject } from 'url';

// skipTrailingSlashRedirect turns off Next's own slash normalization of link hrefs.
export function withSlash(href: string): string {
  if (!href.startsWith('/') || href.startsWith('//')) return href;
  const cut = href.search(/[?#]/);
  const path = cut < 0 ? href : href.slice(0, cut);
  if (path.endsWith('/') || /\.[^/]+$/.test(path)) return href;
  return `${path}/${cut < 0 ? '' : href.slice(cut)}`;
}

export function withSlashUrl(href: string | UrlObject): string | UrlObject {
  if (typeof href === 'string') return withSlash(href);
  return href.pathname ? { ...href, pathname: withSlash(href.pathname) } : href;
}

const seg = (s: string | number) => encodeURIComponent(String(s));
export const unitHref = (id: string) => `/units/${seg(id)}/`;
export const worldHref = (id: string) => `/world/${seg(id)}/`;
export const zoneHref = (id: string, zone: string | number) => `/world/${seg(id)}/${seg(zone)}/`;
export const stageHref = (id: string, zone: string | number, stage: string) => `${zoneHref(id, zone)}${seg(stage)}/`;
export const iwHref = (id: string) => `/iw/${seg(id)}/`;

export function withQuery(path: string, query: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== '') params.set(k, String(v));
  const s = params.toString();
  return s ? `${path}?${s}` : path;
}

// Path form of a legacy query-routed URL; null when the query does not name an entity.
export function legacyEntityPath(route: string, query: Record<string, string | string[] | undefined>): string | null {
  const q = (k: string) => (typeof query[k] === 'string' ? (query[k] as string) : '');
  const id = q('id');
  if (!id) return null;
  switch (route) {
    case '/units/detail': return unitHref(id);
    case '/world/detail': return worldHref(id);
    case '/iw/detail': return iwHref(id);
    case '/world/stage':
      if (!q('zone')) return null;
      return q('stage') ? stageHref(id, q('zone'), q('stage')) : zoneHref(id, q('zone'));
    default: return null;
  }
}

export const LEGACY_IDENTITY: Record<string, string[]> = {
  '/units/detail': ['id'],
  '/world/detail': ['id'],
  '/world/stage': ['id', 'zone', 'stage'],
  '/iw/detail': ['id'],
};

export function dropQueryParams(router: NextRouter, keys: string[]) {
  const [path, search = ''] = router.asPath.split('#')[0].split('?');
  const params = new URLSearchParams(search);
  if (!keys.some((k) => params.has(k))) return;
  keys.forEach((k) => params.delete(k));
  const query = params.toString();
  router.replace(query ? `${path}?${query}` : path, undefined, { shallow: true, scroll: false });
}
