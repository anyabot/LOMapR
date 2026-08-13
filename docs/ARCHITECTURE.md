# lomapr — system architecture

> **MAINTENANCE POLICY: this doc (and the docs it links) must be updated at the
> end of any task that changes project structure** — new/moved pages, slices,
> components, data files, or deploy behavior. Verify claims against the code,
> never copy them from another doc.
>
> Last verified against code: **2026-08-12**.

## What this is

**LOMapR — Last Origin Information & Resources** — a community database site
for the game.

```
┌────────────────────────────┐   fetch at runtime   ┌──────────────────────────────────────┐
│  R2 bucket (JSON + skins)  │ ◀─────────────────── │ Next.js SPA (this repo)              │
│  lo-assets.altterisk.cc    │                      │ pages/, components/, store/, lib/, … │
└────────────────────────────┘                      └──────────────────────────────────────┘
        ▲  /models/* /rebuilt/* proxy rewrites                  │ deploy (OpenNext)
        │                                                       ▼
        │                                     ┌─────────────────────────────────┐
        └──────────────────────────────────── │ Cloudflare Worker               │
                                              │ lo.altterisk.cc                 │
                                              │ (asset-first: prerendered HTML  │
                                              │  + static files bypass Worker)  │
                                              └─────────────────────────────────┘
```

- **Web app** (repo root, tracked) — Next.js **pages router**, deployed as a
  Cloudflare **Worker** via `@opennextjs/cloudflare` (`wrangler.jsonc`,
  `open-next.config.ts`). Still functionally a client-rendered SPA: every page
  prerenders at build time and is served as a static asset **without invoking
  the Worker** (selective asset-first routing); unknown paths use the static
  `404.html`, while the Worker-first allowlist
  handles the `/models|/rebuilt|/skins` proxy rewrites (skin archives and Unity fallback)
  and `/api` routes. Dynamic Worker traffic is protected by a
  native Cloudflare per-client rate-limit binding in `middleware.ts` (120
  requests/minute; no browser challenge). Chakra UI + Redux Toolkit. All game
  data is fetched as
  JSON **at runtime in the browser** from the R2 custom domain (or from
  `public/local-data/` in `dev:local` mode). Route params are query strings
  (`?id=`, `?zone=`, `?equip=`), never dynamic routes.
- **Data** (`data/<region>/`, gitignored) — the JSON the app reads, keyed per
  region (`global/`, `kr/`). Mirrored 1:1 to the R2 bucket keys. Not part of a
  clone; the repo ships the app, not the data. Local release tooling can wait
  for both regions to become available, complete generation, and only then
  publish the generated data and skin assets.

Data updates need **no app redeploy** — the browser fetches JSON at runtime.
App deploys go through `npm run cf:deploy` (OpenNext build → `.open-next/` →
`wrangler deploy`); see [DEPLOY.md](../DEPLOY.md). Runtime env vars (public,
baked at build time): `NEXT_PUBLIC_R2_PUBLIC_URL`,
`NEXT_PUBLIC_SKIN_ARCHIVE_BASE`; `NEXT_PUBLIC_DATA_SOURCE=local` switches to
`public/local-data/`.

## Repo top-level map (tracked content)

| path | what |
|---|---|
| `pages/`, `components/`, `store/` + `store.ts`, `lib/`, `interfaces/`, `styles/` | the web app — see [docs/WEB.md](WEB.md) |
| `scripts/` | node build helpers: image-manifest generation, local-data sync, and copying prerendered HTML into OpenNext static assets |
| `public/images/` | sliced game sprite PNGs (icons, skill icons, tbar, world, common, events) — the one generated artifact that IS committed |
| `public/unity-viewer/` | compiled Unity WebGL fallback for skinned models whose Pixi archive is unavailable |
| `docs/` | this folder — durable architecture/structure docs |
| `README.md` / `DEPLOY.md` | quick start / Cloudflare Workers (OpenNext) + R2 deployment |
| `wrangler.jsonc` / `open-next.config.ts` / `middleware.ts` | Worker + OpenNext adapter config and dynamic-request rate limiting |

Gitignored (never in a clone): `tools/`, `data/`, `public/local-data/`, `OLD/`.

## Doc index

| doc | scope |
|---|---|
| [docs/WEB.md](WEB.md) | frontend structure: pages, components, store, lib, data contracts |
| [README.md](../README.md) | quick start + page overview |
| [DEPLOY.md](../DEPLOY.md) | Cloudflare Workers (OpenNext) + R2 deployment |
