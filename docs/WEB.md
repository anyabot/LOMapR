# lomapr — web app structure

> **MAINTENANCE POLICY: update this doc at the end of any task that adds/moves/
> removes a page, slice, component, lib module, or data contract.** Verify
> against the code, don't assume. Last verified against code: **2026-07-19**.

Next.js **pages router**, deployed to Cloudflare Workers via OpenNext (all
pages prerendered and served as static assets; the Worker only handles the
`/models|/rebuilt|/skins` proxy rewrites — see `DEPLOY.md`). Chakra UI for all
UI, Redux Toolkit for data state. TypeScript throughout. No app backend:
every data read is a runtime `fetch` from the R2 asset domain or `/local-data`
(see `lib/fetchData.ts`).

## Pages (all nav links, verified in `components/layout/navcontent.tsx`)

| route | file | what |
|---|---|---|
| `/` | `pages/index.tsx` | home |
| `/units`, `/units/detail?id=` | `pages/units.tsx`, `pages/units/detail.tsx` | unit grid (class/role/grade filter, search) → detail: stats calculator, skills, profile, drops, promotion, limit break, exclusive equip, an official faction roster grouped into max-five-member squads, and overlapping lore groups referenced by story/skill effects |
| `/skins` | `pages/skins.tsx` | skin browser + viewer entry (PixiJS / Unity iframe) |
| `/npcs?id=&model=` | `pages/npcs.tsx` | selectable non-playable-character and enemy 2D-model catalog; supports model-variant deep links and the shared PixiJS viewer |
| `/equipment` | `pages/equipment.tsx` | equip list (type/grade/exchange filters); modal deep-link `?equip=<id>` |
| `/team` | `pages/team.tsx` | team builder: 3x3 formation (ten-key layout, max 5 units), per-unit level/grade/links/equipment/skill levels, game-style stat tiles with inline point inputs + auto-stat (round-1 CRIT 100% / ACC floor, or ACC derived from the enemy wave's highest EVA), ally-AoE tile highlight, share code (`?t=`), downloadable PNG team summary, multiple localStorage team slots (`lomapr.teams.v1`, incl. a per-slot enemy-wave pick; codes load into their own slot), round-1 battle simulation of both sides (enemy wave via world→stage→wave picker; simulator unit links open details and enemy links open the global popup) |
| `/world`, `/world/detail`, `/world/stage` | `pages/world/*.tsx` | chapters → zones → stages → waves/rewards/missions |
| `/sanctum` | `pages/sanctum.tsx` | EW stages (suitability/prohibition) |
| `/enemies` | `pages/enemies.tsx` | enemy list; modal deep-link `?enemy=<id>` (stats, skills, AI graph) |
| `/iw`, `/iw/detail` | `pages/iw/*.tsx` | Infinite War |
| `/gacha` | `pages/gacha.tsx` | gacha simulator |
| `/misc` | `pages/misc.tsx` | cross-unit categorization: AoE skills, damage types, buff/debuff reverse lookup |

Equip and enemy modals are mounted globally in `components/layout.tsx`, so any
drop chip / gear tile anywhere opens them in place. Unit references share
`components/unitHoverCard.tsx`.

**Mobile rule:** every page must handle mobile by default — wide tables get an
`overflowX="auto"` wrapper + `minW`; toolbars wrap.

## Components

| file / dir | what |
|---|---|
| `layout.tsx` + `layout/` (`navbar`, `navcontent`, `navlink`, `footer`, `scrollTop`) | app shell, nav, region switch, global modals, footer (GitHub links), scroll-to-top |
| `enemyTab/` (`enemyModal`, `skillTab(+List)`, `skillArea`, `appearance(+List)`, `aiGraph`) | enemy modal internals; AI graph uses dagre |
| `skinViewer.tsx` + `skinViewer/` (`chrome.tsx`, `types.ts`) | skin viewer: PixiJS (fixed/spine, spine-pixi-v8, brotli-dec-wasm archives via `lib/skinArchive.ts`) + Unity WebGL iframe (skinned) with postMessage variant API |
| `buffList.tsx` | buff/effect rendering; exports `buffValue`, `BuffCondTags`, `TARGET_LABELS` (reused by misc page) |
| `statBlock.tsx`, `rewardList.tsx`, `stageGrid.tsx`, `stageTabs.tsx`, `enemyGrid.tsx` | stat tables, reward chips, stage wave grids |
| `equipModal.tsx`, `unitHoverCard.tsx`, `gameText.tsx`, `eventImage.tsx`, `copyLink.tsx`, `simpleCard.tsx`, `globalLoader.tsx` | equip modal, unit hover card, loc-string renderer, misc UI |
| `team/` (`formationGrid`, `unitPicker`, `equipPicker`, `unitConfig`, `simulatePanel`, `wavePicker`) | team-builder internals: formation map, pickers, per-unit config panel, round-1 sim output (both sides), enemy-wave picker (three sources — World stages / Sanctum floors / Infinite War boss stages — with EnemyGrid preview) |

## Store (`store.ts` — 14 slices in `store/`)

`ai, enemy, image, item, iw, region, translation, strings, sanctum, skill,
unit, equip, misc, world`. `regionSlice` holds the active region
(`global | kr`); slices lazily fetch via `lib/fetchData.ts` thunks.

## Lib

| file | what |
|---|---|
| `fetchData.ts` | THE data layer. Base URL = R2 (`NEXT_PUBLIC_R2_PUBLIC_URL`) or `/local-data` (`NEXT_PUBLIC_DATA_SOURCE=local`). KR→global fallback per file; shapers (fill dropped empty arrays), id-stamping, image-URL rewrite to bundled `/public` art (`publicImages.json` manifest). Exports `fetchWorld(Stage)`, `fetchSkills`, `fetchSanctum`, `fetchIW`, `fetchStrings(Chunk)`, `fetchItems`, `fetchCommunity`, `fetchMtl`/`fetchKrMtl`, `fetchImages`, `fetchEnemyList`/`fetchEnemy`, `fetchSplitSkills`/`fetchSplitAI`, `fetchUnitList`/`fetchUnitBundle`, `fetchSkinList`, `fetchGachaPools`, `fetchMisc`/`fetchMiscBuff`, `fetchEquipList`/`fetchEquip` |
| `strings.ts` | `t()` loc-id resolution against strings.json (raw loc ids are what the data carries) |
| `rank.ts` | icon resolvers: `roleRankIcon`, `typeIcon`, `roleIcon`, `factionIcon`, `equipIcon` |
| `buffIcons.ts` | buff icon mapping |
| `skinArchive.ts` | fetch + brotli-decompress `.tar.br` skin archives |
| `translationVersion.tsx` | community-translation versioning |
| `team.ts` | team-builder logic: level/slot gating, stat computation (points + equipment + core links), skill scaling, ally-AoE tile mapping, equip eligibility, share-code encode/decode |
| `teamImage.ts` | canvas PNG exporter for the team formation and per-unit portrait/level, total stats + allocated points, and equipment + levels |
| `simulate.ts` | round-1 battle simulation, optionally two-sided (`simulateRound1(inputs, enemyInputs?)`): fixpoint application of battle/round-start effects with side-relative condition/target evaluation (enemy conds/targets resolve when a wave is simulated, else surface as notes), in-battle stat recompute, pooled AP/action order, review notes |
| `simInputs.ts` | `buildSimInputs(team, state)` + `buildEnemySimInputs(wave, state)` / `enemyStatsAt` — build `SimUnitInput[]` / `SimEnemyInput[]` from the store (shared by simulatePanel and the auto-stat solver), reporting loading/unavailable entries |
| `autoStats.ts` | `solveAutoPoints` — fixpoint solver for stat points hitting 100% round-1 in-battle CRIT + an ACC floor (manual, or 100 + highest enemy EVA when `accFromEnemies`); other stats untouched, surplus left unspent |
| `waveRef.ts` | `encodeWaveRef`/`decodeWaveRef`/`sanitizeWaveRef` — compact `~`-joined enemy-wave refs (world / sanctum / iw) for `/team?w=` links ("Simulate this wave" buttons on stage, sanctum, IW pages) and localStorage sanitizing |
| `publicImages.json` | generated manifest of `public/images/**` (rebuild: `npm run gen:images`; auto via `prebuild`) |

`interfaces/` holds the TS types per domain (`ai, enemy, equip, iw, misc,
sanctum, skill, team, unit, world`).

## Data contracts (what the app expects on R2 / `public/local-data`)

Per region (`global/`, `kr/`; KR falls back to global per-file):
`world.json, enemy.json, skill.json, sanctum.json, iw.json, item.json,
unit.json, equip.json, misc.json, strings.json, images.json` plus
`split/` bundles: `enemy_list.json`, `unit_list.json`, `units/<id>.json`,
`equip/<fam>.json`, `skills/`, `ai/`, `world/`, `skins/`, `misc/`, `strings/`,
`gacha/`, `enemy_appearances.json`. Name/desc fields are **raw loc ids**
resolved at render time via `t()`.

## npm scripts (package.json, verified)

| script | what |
|---|---|
| `dev` / `dev:bucket` | dev server against remote R2 |
| `dev:local` | `sync:local-data` then dev with `NEXT_PUBLIC_DATA_SOURCE=local` |
| `sync:local-data` | copy `data/` → `public/local-data/` |
| `build` | `next build` (prebuild regenerates `publicImages.json`) |
| `cf:build` | clean local-data + OpenNext Cloudflare build → `.open-next/` |
| `cf:preview` / `cf:deploy` | local Worker preview (workerd) / `wrangler deploy` |
| `gen:images` | rebuild `lib/publicImages.json` |
| `test:e2e` / `test:e2e:ui` | Playwright smoke tests (`tests/e2e/`, chromium; auto-starts `dev:local`) |

## Tests (`tests/e2e/`, `playwright.config.ts`)

Playwright (`@playwright/test`). Two projects: `chromium` (desktop, all specs)
and `mobile` (Pixel 5 viewport, runs the `pages.spec.ts` route table only —
enforces the mobile-first rule). `playwright.config.ts` auto-starts
`npm run dev:local` on :3000 (reused if already running), so tests read data
from `public/local-data` with no network. `pages.spec.ts` is a smoke table over
every route asserting: HTTP < 400, expected `<title>`, main heading visible
where static (proves the data fetch ran), no uncaught page errors, **no
horizontal body scroll** (scrollWidth − clientWidth ≤ 1, both viewports), and
**no failed data requests** (any 5xx, or 404 on `/local-data/global/` — kr/
404s are the legitimate KR→global fallback). Detail pages are visited without
query params and must show their fallback state.

Per-page functional specs (one file per page): `units` (search/type filter/
tri-state exclude mode/tile → detail, detail stats + not-found fallback,
CopyLink copies the canonical deep link), `equipment` (search, slot filter,
tile → modal, `?equip=` deep link), `enemies` (search, card → modal, `?enemy=`
+ `&lv=` deep links), `skins` (search, category chips), `gacha` (pull →
results/history, multi-pull count > 1, tabs), `misc` (three tabs render),
`world` (list → chapter → zone → stage drill-down, `?stage=` deep link, 404),
`sanctum` (area/floor/difficulty, share deep link restores all three),
`iw` (season → raid boss detail), `team` (picker → tile, 5-unit cap toast,
no-duplicate picker, team-code copy→clear→load round-trip into a new slot,
localStorage reload survival, PNG image export via download event, slot bar,
simulate tab; clipboard permissions granted), `home` (quick-nav cards,
external links), `region` (KR-only unit — Maria Grace — hidden on global,
revealed via `?server=kr` and the navbar region select, unit-detail not-found
vs. resolves per region, region persists across reload + `?server=` override
wins, no raw numeric loc-ids on the KR grid, and the past-bug regression:
switching region on an open unit detail must refetch, not hang on the
spinner/overlay), `skin-viewer` (one fixed + one spine skin fetched from the
live R2 CDN and rendered to a PixiJS canvas — the ONLY specs needing network;
skinned/Unity kind not covered). `fixtures.ts` holds known-good
sample ids/names from the committed local data (Constantia S2, Attack Chip EX,
Knight Chick, Story zone 1, Colossus_01) — update it if a data rename breaks it.

Selector gotchas baked into the specs: `Button as={Link}` renders an `<a>`
(use `getByRole('link')`); `getByRole` name matching is substring by default
(pass `exact: true` when a share-label contains the word); the navbar has its
own `LOMapR` heading and region `<select>`; the gacha page opens on the Rates
tab; the stage map is a canvas (drive it via the `?stage=` query instead of
clicks).
