/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Deployed to Cloudflare Workers via @opennextjs/cloudflare (see DEPLOY.md).
  // The app is still a client-rendered SPA (data fetched in-browser from the
  // asset domain, route params read from ?id=/&zone=/&stage= query strings);
  // pages are prerendered at build time and served as static assets, so normal
  // page views don't invoke the Worker. The Worker gives us a real Next server:
  // rewrites below work in production, and API routes are possible again.
  trailingSlash: true,
  // Don't let the Next server 308 /models/<file> -> /models/<file>/ before the
  // rewrites run (the appended slash would miss the R2 key). Page URLs are
  // normalized by the Workers assets layer (auto-trailing-slash), so the
  // server-side redirect is redundant anyway.
  skipTrailingSlashRedirect: true,
  images: { unoptimized: true },
  // Proxy Unity-viewer bundle paths to the asset domain (the Unity app builds
  // /models/* and /rebuilt/* URLs relative to its own origin, so they must be
  // resolved server-side). /skins/* is proxied for dev convenience only — the
  // browser fetches skin archives from NEXT_PUBLIC_SKIN_ARCHIVE_BASE directly.
  async rewrites() {
    // Derive from the bucket URL: dev:local repoints the archive base at a local
    // route, and stripping /skins off that would break the model proxies.
    const base = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL
      ?? (process.env.NEXT_PUBLIC_SKIN_ARCHIVE_BASE ?? '').replace(/\/skins\/?$/, ''))
      .replace(/\/$/, '');
    if (!base) return [];
    return [
      { source: '/models/:path*',  destination: `${base}/models/:path*`  },
      { source: '/rebuilt/:path*', destination: `${base}/rebuilt/:path*` },
      { source: '/skins/:path*',   destination: `${base}/skins/:path*`   },
    ];
  },
}

module.exports = nextConfig
