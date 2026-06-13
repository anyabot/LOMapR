# Deploying lomapr to Cloudflare Pages

The app is a **fully static SPA**. There is no backend: every data read happens
in the browser, fetched directly from Cloudflare R2's public URL. The build
produces only static HTML/JS/assets — **zero Pages Functions**, so it never
touches the Workers request quota and runs entirely on the free tier.

```
browser ──▶ *.pages.dev  (static HTML/JS, Pages CDN, unlimited bandwidth)
browser ──▶ pub-….r2.dev (JSON data + images, browser-cached 1h, free egress)
```

## One-time Cloudflare setup

1. **R2 public access** — R2 → `lomapr-data` bucket → Settings → Public access →
   enable the **r2.dev** subdomain. Copy the `https://pub-….r2.dev` URL.
2. **Push data to R2** — from your machine (Python tooling, not the app):
   ```
   python tools/admin/push_r2.py --region all
   ```
3. **Create the Pages project** — two options below.

## Deploy option A — direct from your machine (Wrangler)

`@cloudflare/next-on-pages` does not run on Windows (it can't spawn `vercel`),
so locally we build with `vercel build` and deploy the static output:

```
npm run pages:deploy        # = vercel build --prod  →  wrangler pages deploy
```

(First run will prompt `wrangler login`.)

## Deploy option B — Git integration (cloud build, recommended)

Connect the repo in the Cloudflare dashboard (Workers & Pages → Create →
Pages → Connect to Git) with these **build settings**:

| Setting | Value |
|---|---|
| Framework preset | Next.js (or None — the command overrides it) |
| Build command | `npx @cloudflare/next-on-pages@1` |
| Build output directory | `.vercel/output/static` |
| Root directory | *(blank)* |
| Production branch | `main` (push other branches → preview deploys) |

Cloudflare builds on Linux, where `next-on-pages` works fine (the local
`vercel build` path in package.json exists only because the adapter can't run on
Windows). The build runs `next build`, whose `prebuild` hook regenerates
`lib/publicImages.json` — no manual step needed.

## Environment variables

Set in **both** the Production and Preview scopes (Pages → Settings →
Environment variables). Missing this builds fine but shows NO data — the #1
gotcha.

| Var | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_R2_PUBLIC_URL` | `https://pub-….r2.dev` | The browser reads data from here. Baked in at build time. **Public** value. |

Locally these live in `.env.local` (gitignored). See `.env.example`. No secrets
are needed in Cloudflare — the old backend (firebase-admin, R2 S3 keys) is gone;
the R2 push runs on your machine via `tools/admin/push_r2.py`.

## Preview vs production

- Push to a non-production branch (e.g. `cloudflare`) → preview at
  `<branch>.lomapr.pages.dev`. Test there.
- Merge to `main` → production at `lomapr.pages.dev`.
- Both read the SAME R2 bucket, so data is identical across them.

## Updating data

Re-run the Python push whenever data changes — no redeploy of the app needed,
since data is fetched at runtime:

```
python tools/admin/push_r2.py --region all
```

Regenerate the bundled-image manifest if you add/remove files under
`public/images/` (the app rewrites image URLs to these when present):

```
npm run gen:images   # rewrites lib/publicImages.json
```

## Later: custom domain (optional)

r2.dev has a soft rate limit and no configurable edge cache. If you ever buy a
domain, connect it to the R2 bucket and change one value —
`NEXT_PUBLIC_R2_PUBLIC_URL` → `https://data.yourdomain.com`. No code changes.
