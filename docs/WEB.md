# lomapr — web app structure

> **MAINTENANCE POLICY: update this doc at the end of any task that adds/moves/
> removes a page, slice, component, lib module, or data contract.** Verify
> against the code, don't assume. Last verified against code: **2026-07-15**.

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
| `/units`, `/units/detail?id=` | `pages/units.tsx`, `pages/units/detail.tsx` | unit grid (class/role/grade filter, search) → detail: stats calculator, skills, profile, drops, promotion, limit break, exclusive equip |
| `/skins` | `pages/skins.tsx` | skin browser + viewer entry (PixiJS / Unity iframe) |
| `/equipment` | `pages/equipment.tsx` | equip list (type/grade/exchange filters); modal deep-link `?equip=<id>` |
| `/team` | `pages/team.tsx` | team builder: 3x3 formation (ten-key layout, max 5 units), per-unit level/grade/links/equipment/skill levels, game-style stat tiles with inline point inputs + auto-stat (round-1 CRIT 100% / ACC floor), ally-AoE tile highlight, share code (`?t=`), multiple localStorage team slots (`lomapr.teams.v1`; codes load into their own slot), round-1 battle simulation |
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
| `team/` (`formationGrid`, `unitPicker`, `equipPicker`, `unitConfig`, `simulatePanel`) | team-builder internals: formation map, pickers, per-unit config panel, round-1 sim output |

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
| `simulate.ts` | round-1 battle simulation: fixpoint application of battle/round-start effects with condition evaluation, in-battle stat recompute, AP/action order, review notes for effects not auto-applied |
| `simInputs.ts` | `buildSimInputs(team, state)` — builds `SimUnitInput[]` from the store (shared by simulatePanel and the auto-stat solver), reporting loading/unavailable units |
| `autoStats.ts` | `solveAutoPoints` — fixpoint solver for stat points hitting 100% round-1 in-battle CRIT + optional ACC floor (other stats untouched, surplus left unspent) |
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
