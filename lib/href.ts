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

export function dropQueryParams(router: NextRouter, keys: string[]) {
  const [path, search = ''] = router.asPath.split('#')[0].split('?');
  const params = new URLSearchParams(search);
  if (!keys.some((k) => params.has(k))) return;
  keys.forEach((k) => params.delete(k));
  const query = params.toString();
  router.replace(query ? `${path}?${query}` : path, undefined, { shallow: true, scroll: false });
}
