import { useEffect } from 'react';
import Error from 'next/error';

// Entities added to the data after the last build have no path page yet; their query page still works.
const FALLBACK: [RegExp, (m: RegExpExecArray) => string][] = [
  [/^\/units\/([^/]+)\/?$/, (m) => `/units/detail/?id=${m[1]}`],
  [/^\/iw\/([^/]+)\/?$/, (m) => `/iw/detail/?id=${m[1]}`],
  [/^\/world\/([^/]+)\/(\d+)\/([^/]+)\/?$/, (m) => `/world/stage/?id=${m[1]}&zone=${m[2]}&stage=${m[3]}`],
  [/^\/world\/([^/]+)\/(\d+)\/?$/, (m) => `/world/stage/?id=${m[1]}&zone=${m[2]}`],
  [/^\/world\/([^/]+)\/?$/, (m) => `/world/detail/?id=${m[1]}`],
];

export default function NotFound() {
  useEffect(() => {
    const { pathname, search } = window.location;
    for (const [re, to] of FALLBACK) {
      const m = re.exec(pathname);
      if (m) {
        window.location.replace(`${to(m)}${search ? `&${search.slice(1)}` : ''}`);
        return;
      }
    }
  }, []);
  return <Error statusCode={404} />;
}
