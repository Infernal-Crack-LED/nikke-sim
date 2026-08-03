# Character landing pages — implementation plan (2026-08-02)

Branch: `character-pages` · worktree `../nikke-sim-wt-character-pages`

## Goal

One indexable landing page per character so long-tail searches (e.g. "best overload
`scarlet-black-shadow`", "`maiden-ice-rose` kit", "nikke `crown` dps" — the owner's
motivating example was a bare-name query like "best overload scarlet", which is
exactly the ambiguous case the page title has to disambiguate, since `scarlet`
(AR/Electric) and `scarlet-black-shadow` (RL/Wind) are different units) land on
nikkesim.app. The page
must carry enough unique, genuinely useful content to outrank a wiki stub — the
sim's own numbers are the differentiator (nobody else publishes a frame-tick OL
ranking per unit).

## What already exists (do not rebuild)

| Piece                    | Where                                                                     | State                                                                        |
| ------------------------ | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `/unit/:slug` route      | `web/src/router.ts` (`unitSlugFromPath`), `main.tsx`                      | live                                                                         |
| Minimal unit page        | `web/src/UnitPage.tsx` (213 lines)                                        | portrait + pills + OL picks + tool links — the stub this plan replaces        |
| Server-side meta + HTML  | `src/server/static.ts` (`TAB_META`, `unitStaticHtml`)                     | per-unit title/desc/OG built from `characters.json` at boot; no-JS body       |
| Landscape "Nikke card"   | `src/infographics/core/unitCard.ts`, prerendered by `build-infographics`  | 1200×600 `discord` variant, hashed into `dist/img/`, keyed `unit/<slug>.discord` |
| Card data builder        | `src/infographics/core/unitCardData.ts`                                   | rank tiles + neighbour rows + OL floor, from the board artifacts             |
| Portrait grid + filters  | `web/src/components/CharacterGrid.tsx`                                    | `useCharacterFilter` / `CharacterFilters` / `CharacterCards`                  |
| Sitemap                  | `scripts/build-sitemap.ts` → `web/public/sitemap.xml`                     | already emits all 196 `/unit/<slug>` URLs                                     |
| Kit prose                | `data/characters.json` → `skills.{skill1,skill2,burst}`                   | blablalink SSOT                                                              |
| Kit-role tags            | `data/archetype-tags.json`                                                | tag ids + player-facing `label`/`blurb`                                       |
| Model status             | `data/kit-status.json`                                                    | `tier`, `tuned`, `graded`, `unmodeled`, `caveats` per unit                    |
| Best OL picks            | `data/ol-optimal.json`                                                    | the 4 free lines only — no ranking, no gain %                                 |

So the work is **filling the page in**, plus a Characters index and one new
artifact. The routing, meta, OG image and sitemap plumbing is already done.

## Gaps to close

1. **No Characters tab.** `/characters` doesn't exist; the only way to a unit page
   is a direct URL. Crawlers therefore find `/unit/*` only via the sitemap, with
   zero internal link equity.
2. **The unit page has almost no content.** ~40 words. Not competitive.
3. **No per-unit OL ranking artifact.** `ol-optimal.json` stores the winning picks
   but not the ranked table with gain percentages, which is the single most
   search-valuable thing the sim can publish.
4. **The grid's cards are `<button>`s**, not `<a href>`s — a crawler can't follow them.

## Design

### Routing / nav

- New top-level route `characters` → `/characters`, added to `Route`, `ROUTES`,
  `PAGE_ROUTES` (`web/src/router.ts`), the `NAV` array (`SiteChrome.tsx`), the lazy
  route map (`main.tsx`), `TAB_META` (`src/server/static.ts`), and `build-sitemap.ts`.
- `/unit/:slug` keeps its existing route and slug parsing — unchanged.
- `CharacterCards` gains an optional `linkFor?: (slug) => string`. When present each
  card renders as `<a href>` with `onSpaLinkClick` instead of `<button>`, so the
  index is a real crawlable hub and middle-click/⌘-click open in a new tab. Every
  existing caller (team builder, pickers) is untouched.

### `/characters` index

Reuses `useCharacterFilter` + `CharacterFilters` + `CharacterCards` with
`allowUnsupported` on (unmodeled units still deserve a page — they carry kit,
tags and the "not in the sim yet" status honestly). ~196 internal links from one
page; each card links to `/unit/<slug>`.

### `/unit/:slug` page sections

Ordered by what a searcher wants first, and by what is unique to this site.

1. **Breadcrumb** — Characters → `<Name>` (the server already injects a
   `BreadcrumbList` JSON-LD; the visible trail matches it).
2. **Hero** — the prerendered landscape Nikke card (`unit/<slug>.discord` resolved
   through `/api/v1/img/manifest.json`), with the portrait as fallback when the
   manifest is absent (dev, or a deploy predating `build-infographics`). Static
   `<img>`, not a canvas render — free, cached, and it is already the OG image so
   the page and the share card can never disagree.
3. **Identity strip** — element / weapon / burst / class / manufacturer / release
   date, plus the archetype tags with their `blurb` as the tooltip.
4. **Sim status** — tier (`MEASURED` / `CALIBRATED` / …), whether the unit is
   hand-tuned, how many graded comps it has and how many are within ±3%, and the
   kit lines that are **not** modeled yet. This is a trust surface: it states what
   the sim does and doesn't know. It uses only the structured fields of
   `kit-status.json` — never the `evidence` / `residual` / `findings` prose, which
   is internal shorthand.
5. **Best overload lines** — the recommended 4 free lines, then the full ranked
   table (label, gain % vs the 8/12 floor). **This is the SEO payload.**
6. **Kit** — the three skill blocks from `characters.json`, split on the `■`
   bullets so each trigger/effect pair is its own line. Verbatim game text.
7. **DPS ranking** — lazy-loaded from `dpschart.json`: the unit's rank in the solo
   headline cells, with a link to `/ranks`. (Lazy because the artifact is a
   gitignored build output and large.)
8. **Tools row** — deep links into the Overload Optimizer, Team Builder, DPS
   Rankings, Card Builder, prefilled with this unit where the tab supports it.
9. **JSON-LD** — `WebPage` + `BreadcrumbList` (server) and a page-level
   `FAQPage`-style block is deliberately *not* used; the unit page gets a plain
   `WebPage` with `about` naming the character.

### New artifact — `data/unit-pages.json`

`scripts/build-unit-pages.ts` (npm: `build-unit-pages`, wired into `build:deploy`
right after `build-ol-optimal`). One artifact, two payloads, because both are
per-unit page data with the same regeneration trigger:

**`ol`** — runs `rankFreeLineConfigs` (`src/olconfigs.ts`) per eligible unit in the
same Solo cell as `build-ol-optimal` (`solo.eleweak.c100.12of12`) at **T11**, top 10
rows. 73 units, ~37 s for the whole roster.

**`status`** — a slim public projection of `data/kit-status.json`: `tier`, `tuned`,
`graded`, `unmodeled`, and nothing else. This is not tidiness, it is a measured fix:
importing `kit-status.json` into the page put **366 kB** into the UnitPage chunk,
almost all of it AI-facing prose (`evidence`, `residual`, `kitParse.findings`) the
page never renders. The projection is ~49 kB. **UnitPage chunk: 366 kB → 96 kB
(gzip 106 → 22 kB).** The projection also means a future verbose finding can't
silently re-inflate the bundle.

Cost is small: the free-line pool is 3 types (non-charge weapons) or 5 (RL/SR), so
the exhaustive search is `C(6,4)=15` or `C(8,4)=70` sims per unit — ~5k sims for
the whole roster, seconds not minutes.

Shape:

```json
{
  "framework": "solo", "tier": 11,
  "units": {
    "maiden-ice-rose": {
      "baseline": 123456789,
      "rows": [{ "label": "2× Charge Speed + 2× Max Ammo", "gainPct": 12.3 }]
    }
  }
}
```

Absolute damage is **not** published per row — only the gain over the 8/12
baseline. The absolute number is basis-specific (Base 5 gear, sync 400, this boss)
and would read as a claim about the player's own damage.

`build:deploy` gains `npm run build-ol-table` right after `build-ol-optimal`.

**Consistency check vs `data/ol-optimal.json`.** Row 0 of the table should name the
same line multiset as the greedy `bestOl` pass. It does for **32 of 73** units. The
`--tier` flag on the build script exists to isolate why; the measured split:

| Cause                                                              | Units | Status |
| ------------------------------------------------------------------ | ----- | ------ |
| Agree                                                               | 32    | —      |
| **Tier basis**: `build-ol-optimal` passes no tier values → optimizes at MAX ROLL; this table is T11 | 23 | open |
| Genuine **greedy local optimum** — differs at the same tier and pool | 18   | open   |
| ~~Hit Rate excluded from the free-line pool~~                        | 0     | **FIXED** |

**Hit Rate — owner ruling 2026-08-02, LANDED.** `src/olconfigs.ts`'s free-line pool
excluded Hit Rate for every weapon, on the comment *"hit/def are dead for damage"*.
That was true when written and stale from the moment `HRCORE` landed (2026-07-17).
The pool now offers Hit Rate for **AR/SMG/SG** and withholds it for **RL/SR/MG**
(and Pistol) — which is not a new policy but a restatement of the engine:
`HR_CORE_CIRCLE = { AR: 75, SMG: 110, SG: 250 }` in `sim.ts`, and for every other
weapon `hrCoreExp` returns 0 → `hrCoreMult` returns 1 → the line is inert.

`bestOl` needed no change: all 24 of its Hit Rate picks were already AR/SMG/SG, so
the greedy side was right and the exhaustive pool was the stale one. Agreement moved
20 → 32; Hit Rate now appears in the #1 row for 26 units (SG 10, SMG 8, AR 8) and on
**zero** RL/SR/MG units.

Pinned by `scripts/tests/engine/ol-hitrate-pool.test.ts`, which asserts the pool
against MEASURED engine behaviour rather than a hardcoded list — for each weapon
class it checks whether a `hitRatePct` buff actually moves the resolved core rate,
and requires the pool to offer Hit Rate exactly when it does. Verified to bite: it
fails 3/8 against the old pool (AR core rate 0.214 → 0.461, SMG 0.164 → 0.323, SG
0.026 → 0.061 under a 40pt buff; RL/SR/MG unmoved). A hardcoded assertion would have
gone stale exactly the way the original comment did.

Note the greedy-local-optimum count rose 11 → 18. That is not a regression: widening
the exhaustive pool gives it more room to beat greedy, so more units now have a
better combo than greedy finds.

**Still open, findings-only** (batch-and-stop — one owner decision, not three fixes):
`build-ol-optimal` optimizes at max roll while the web applies its picks at T11; and
greedy lands on a local optimum for 18 units where the exhaustive search does better.
Neither is touched by this branch.

**Consequence for the page (decided):** the page's "best lines" recommendation is
**row 1 of this table**, not `ol-optimal.json`. The table is the self-consistent
artifact and it matches what a visitor sees if they re-run the Optimize Overload tab,
which is the trust-critical property for a page whose pitch is "these are the sim's
numbers".

## Previewing this locally (a fresh worktree shows a broken-looking page)

Three of the page's surfaces read BUILD ARTIFACTS that are gitignored, so a fresh
worktree renders without the hero card and without DPS ranks — which looks like a
bug and isn't. Full sequence:

```bash
npm run dpschart && npm run ranks:all   # web/public/*.json — ~30 s total
npm run web:build                       # vite → dist/   (EMPTIES dist/ first)
npx tsx scripts/build-infographics.ts   # dist/img/ + manifest.json — MUST be after the vite build
PORT=<free> SHOTS=unit- OUT=/tmp/unit-shots node scripts/ui-shot.mjs
```

Three traps, all of which cost time here:

1. **`npm run build` empties `dist/`**, taking `dist/img` with it. Run
   `build-infographics` AFTER it or the hero card silently disappears.
2. **Don't symlink `web/public/*.json` from the main worktree.** It works until
   main moves ahead of the branch, and then the artifact is newer than the code
   reading it: `scripts/tests/share/unit-card-data.test.ts` went red on a `crown`
   neighbourhood assertion purely from that skew. Generate them in the worktree.
3. **Those board tests are `it.runIf(haveBoards)`** — they SKIP silently when the
   artifacts are absent, which is the default state of a fresh worktree. A green
   `verify.sh` there is weaker than it looks; generate the artifacts and ~16 more
   tests actually run.

## Phasing

| Phase | Content                                                                                     | Status |
| ----- | ------------------------------------------------------------------------------------------- | ------ |
| 1     | `build-unit-pages.ts` + `data/unit-pages.json`                                                | ✅ landed |
| 2     | Rewrite `UnitPage.tsx` (all sections above) + styles                                          | ✅ landed |
| 3     | `/characters` index + nav + `linkFor` on `CharacterCards` + `TAB_META` (BOTH servers) + sitemap | ✅ landed |
| 3b    | Profile entry point on the roster grids (see below)                                           | ✅ landed |
| 3c    | `ui-shot` coverage for the new pages + a `SHOTS=` filter                                      | ✅ landed |
| 4     | **Owner design iteration on `/unit/maiden-ice-rose`** — layout, density, section order        | next   |
| 5     | Roll-out checks: spot-check a spread of units (untuned, no-OL-data, unsupported, Λ burst)      | next   |
| 6     | Prerender `/unit/*` into static HTML (`scripts/prerender.ts` currently covers /howto,/mechanics only) | next   |
| 7     | Extend `unitStaticHtml` (both servers) to emit the new sections for no-JS crawlers            | next   |

### Entry point from the roster grids (owner ask, 2026-08-02)

The Team Builder page and the four Browse Nikkes modals share `CharacterCards`.
The constraint the owner set: **clicking the portrait must keep meaning "put her on
my team"** — that is the whole job of those surfaces, and hijacking the tap would
break it.

**Landed:** a `profileHref` prop puts a small round **ⓘ** badge in each card's
top-right corner, as a SIBLING of the card button (an `<a>` inside a `<button>` is
invalid HTML), inside a `.teambuilder-card-wrap`. The wrapper is only emitted when a
badge was asked for, so every existing caller's DOM is byte-identical.

Two decisions worth keeping:

- **It opens in a new tab** (`target="_blank"`). These are mid-task surfaces: the
  Browse modals hold a STAGED team that an SPA navigation would discard, and the
  Team Builder holds a team in progress. A new tab is the only variant that
  provably cannot interrupt the task, which is exactly the constraint.
- **Hover-revealed on pointer devices, always visible on touch**
  (`@media (hover: hover) and (pointer: fine)`). A 196-card grid with a permanent
  badge on every card is visual noise on desktop; touch has no hover, so hiding it
  there would make it undiscoverable.

Alternatives considered and rejected: long-press (undiscoverable, and it fights the
existing drag-to-slot gesture), right-click menu (no touch equivalent), making the
name text the link (too small a target, and it sits inside the button).

**Open for the design pass:** the ⓘ glyph is a placeholder — an outward arrow (↗)
reads as "opens elsewhere" more honestly than an info glyph. Worth deciding with
the rest of the visual pass.

## Risks / open items

- **`data/` is a protected path.** `data/unit-pages.json` is a NEW generated
  artifact, not a change to any existing source of truth — but it lands in a
  protected dir and needs owner sign-off before merge. No existing `data/` file was
  touched.
- **`scripts/serve.mjs` duplicates `src/server/static.ts`'s route table** by hand.
  Adding `/characters` to only one of them 404s the route; the
  `serve-headers.test.ts` route-parity test catches it (it did). Both are updated.
- **Units with no data.** 196 characters, 111 `simSupported`, 74 `generatorSupported`.
  A page for an unmodeled unit must degrade to kit + identity + "not in the sim yet"
  without empty tables. Fixed-geometry-style: sections that have no data say so
  rather than vanishing, so the page never looks broken.
- **Thin-content risk at scale.** ~85 units will have kit + identity only. If Search
  Console shows those as soft-404s, gate `/unit/*` sitemap entries on `simSupported`
  and `noindex` the rest. Decide after the first crawl, not now.
- **Bundle size.** `ol-table.json` is a static import in the `UnitPage` chunk
  (~70KB raw / ~15KB gzipped for the whole roster). Acceptable in a lazy route
  chunk; revisit if it grows a per-row breakdown.
