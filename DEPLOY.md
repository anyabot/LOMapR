# Deploying lomapr to Cloudflare Workers (OpenNext)

The app deploys as a **Cloudflare Worker** via the
[OpenNext Cloudflare adapter](https://opennext.js.org/cloudflare)
(`@opennextjs/cloudflare`). It is still, functionally, a client-rendered SPA:
every page is prerendered at build time, all game data is fetched in the
browser from the asset domain, and route params come from `?id=`/`&zone=`/
`&stage=` query strings.

**Request accounting** (the thing that matters for the free tier): the Worker
uses **asset-first routing** (`run_worker_first: false` in `wrangler.jsonc`).
Anything matching a file in `.open-next/assets` — all `_next/static/*`, every
`public/` file, and **every prerendered page's HTML** — is served directly by
Cloudflare as a static asset: the Worker is never invoked and the request is
free and unmetered. The Worker only runs for paths that are *not* assets:

```
browser ──▶ lo.altterisk.cc         static assets (HTML/JS/images/wasm) — free, no Worker
browser ──▶ lo.altterisk.cc/models/*, /rebuilt/*
                                    Worker rewrite ──▶ lo-assets.altterisk.cc (R2)
browser ──▶ lo-assets.altterisk.cc  JSON data + skin .tar.br — direct, free egress
```

So Worker invocations ≈ Unity skinned-model loads (a few requests each), 404s,
and any future API routes. Everything else is static.

## Domains

| Domain | What | Where configured |
|---|---|---|
| `lo.altterisk.cc` | the site (Worker custom domain) | `wrangler.jsonc` `routes` |
| `lo-assets.altterisk.cc` | R2 bucket `lomapr-data` custom domain | R2 → bucket → Settings → Custom Domains |

The old `pub-….r2.dev` URL still works as a fallback but nothing references it
anymore. The Unity viewer's client-side fetch/XHR rewrite hack and the Pages
`_redirects` file are **gone** — `/models/*` and `/rebuilt/*` are proxied by
Next server rewrites (`next.config.js`), which work in production now that
there is a real server.

## One-time Cloudflare setup

1. **R2 custom domain** — R2 → `lomapr-data` → Settings → Custom Domains →
   add `lo-assets.altterisk.cc` (done).
2. **Bucket CORS** — the browser on `lo.altterisk.cc` fetches JSON/archives
   cross-origin from `lo-assets.altterisk.cc`, so the bucket CORS policy must
   allow GET from `https://lo.altterisk.cc` (or `*`). The same policy covers
   both r2.dev and the custom domain.
3. **Move the site domain to the Worker** — if `lo.altterisk.cc` is still
   attached to the old Pages project, detach it there first
   (Pages project → Custom domains → remove). The first `npm run cf:deploy`
   then attaches it to the Worker (declared in `wrangler.jsonc`).
4. `wrangler login` on first use.

## Deploy

```
npm run cf:build     # sync-local-data --clean → next build (prebuild regenerates
                     # lib/publicImages.json) → OpenNext transform → .open-next/
                     # → scripts/copy-prerendered-assets.js
npm run cf:preview   # cf:build + run the real Worker locally (workerd)
npm run cf:deploy    # cf:build + wrangler deploy
```

`scripts/copy-prerendered-assets.js` is the step that makes asset-first serving
actually cover pages: stock OpenNext keeps prerendered HTML inside the server
function (every page view would invoke the Worker), so the script copies each
prerendered page into `.open-next/assets/<route>/index.html` and prunes
local-only dirs (`local-data*`, `skin_test`) from the deploy. SSR/API routes
added later emit no prerendered HTML and are naturally left to the Worker.

`NEXT_PUBLIC_*` values are baked in at build time from `.env.local`
(gitignored; see `.env.example`):

| Var | Value |
|---|---|
| `NEXT_PUBLIC_R2_PUBLIC_URL` | `https://lo-assets.altterisk.cc` |
| `NEXT_PUBLIC_SKIN_ARCHIVE_BASE` | `https://lo-assets.altterisk.cc/skins` |

No secrets are needed in Cloudflare — data pushes run locally via
`tools/admin/push_r2.py` / `push_skins_r2.py`.

## Updating data

Unchanged: re-run the Python push when data changes — no redeploy needed,
data is fetched at runtime:

```
python tools/admin/push_r2.py --region all
```

Regenerate the bundled-image manifest when files under `public/images/`
change (also runs automatically as `prebuild`):

```
npm run gen:images
```

## Gotchas

- **Never** set `run_worker_first` to `true`/a catch-all in `wrangler.jsonc` —
  that routes every static asset through the Worker and burns the request
  quota for nothing (the failure mode of the old backend setup).
- `global_fetch_strictly_public` compatibility flag is required: the Worker's
  rewrite proxy fetches `lo-assets.altterisk.cc`, which is on the **same zone**
  as the Worker's domain; without the flag same-zone subrequests try to hit a
  nonexistent "origin server" instead of the R2 route.
- Missing `NEXT_PUBLIC_R2_PUBLIC_URL` at build time builds fine but shows NO
  data — still the #1 gotcha.
- `patches/react-dom+18.3.1.patch` (applied by patch-package on install) adds
  a `react-dom/server.edge` shim (alias of `server.browser`). React 18 has no
  `server.edge` entry (React 19 only) and the bundled Worker can't express
  Next's normal fallback, so Worker-side renders (the 404 page) 500 without
  it. Keep the patch until React is bumped to 19.
- OpenNext warns it isn't fully supported on Windows (recommends WSL); build,
  preview, and deploy all worked from this Windows machine (verified
  2026-07-14). If a future version misbehaves, build from WSL.
