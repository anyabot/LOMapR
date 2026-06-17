/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Static export: the app is a client-rendered SPA (data fetched in-browser
  // from R2, route params read from ?id=/&zone=/&stage= query strings), so there
  // are no dynamic routes and no server. `next build` emits plain static files to
  // /out with NO _worker.js — nothing counts against Cloudflare's request quota.
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  // In dev, proxy /models/* and /skins/* to R2 (prod uses _redirects instead).
  async rewrites() {
    const base = (process.env.NEXT_PUBLIC_SKIN_ARCHIVE_BASE ?? '').replace(/\/skins\/?$/, '').replace(/\/$/, '');
    if (!base) return [];
    return [
      { source: '/models/:path*', destination: `${base}/models/:path*` },
      { source: '/skins/:path*',  destination: `${base}/skins/:path*`  },
    ];
  },
}

module.exports = nextConfig
