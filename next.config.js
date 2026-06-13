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
}

module.exports = nextConfig
