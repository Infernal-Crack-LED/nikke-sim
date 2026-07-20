# UX audit — nikkesim.app

> Scope: full front-end (`web/src/`), all 9 routes and 12 tool tabs. Method: static
> read of every page component, copy source (`*-data.ts`, `patch-notes.json`),
> `styles.css`, router, and the production build output (`dist/`). No engine or
> data files were modified. Date: 2026-07-20.
>
> Severity: **P0** = actively misleads users or leaks dev-facing content ·
> **P1** = measurable UX/performance cost · **P2** = polish, clarity, accessibiity ·
> **P3** = nice-to-have.

## Executive summary

| #   | Finding                                                                                                                         | Sev | Section | Status                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | --- | ------- | ----------------------------------- |
| 1   | How-to page describes a nav and tab layout that no longer exists                                                                | P0  | A1      | ✅ 2026-07-20                       |
| 2   | DPS Rankings error state tells end users to run `npm run dpschart`                                                              | P0  | B4      | ✅ 2026-07-20                       |
| 3   | Internal roadmap language ("pending backend task") on the public DPS page                                                       | P0  | C1      | ✅ 2026-07-20                       |
| 4   | Single 2.5 MB JS bundle (~510 KB gzip); `characters.json` (2.4 MB) inlined, paid on every route including `/credits`            | P1  | D1      | ✅ 2026-07-20                       |
| 5   | The three Overload tools are split across two tab groups; generators sit in Tools but consume the Sim page's boss-options row   | P1  | A2      | ✅ 2026-07-20                       |
| 6   | Desktop Tools tab bar scrolls horizontally with a _hidden_ scrollbar — off-screen tabs have no visual affordance                | P1  | A4      | ✅ 2026-07-20 (moot after reorg)    |
| 7   | All 192 portraits fetched full-res from a third-party CDN and canvas-downscaled at runtime (Team Builder does all 192 on mount) | P1  | D2      | ✅ 2026-07-20                       |
| 8   | Editorial/AI-flavored prose in Credits intro, patch notes, and a few tool blurbs                                                | P2  | C       | ✅ 2026-07-20 (C7 owner-ruled keep) |
| 9   | No `:focus-visible` styles, no `prefers-reduced-motion` handling, results table has no mobile scroll wrapper                    | P2  | E2      | ✅ 2026-07-20                       |
| 10  | Tab naming inconsistencies (label vs `<h1>` vs How-to name for the same tool)                                                   | P2  | A3      | ✅ 2026-07-20                       |

The site's strongest surfaces, for reference: the **Mechanics page** (tiered
evidence badges, factual bullets — the copy model the rest of the site should
match), the **Resource Calculator** (stat tiles + ladder table + "How to read
this" is the best data presentation on the site), and the **Roster Sync** error
handling (502 → unprivate instructions with a screenshot is exactly right).

---

## A. Information architecture & tab grouping

### A1. How-to page is stale — describes a layout that no longer exists (P0)

> **Resolved 2026-07-20:** both stale sections rewritten against the new
> four-section layout; the tab list now names every tool.

`web/src/howto-data.ts` had drifted from the shipped UI:

- **"The tabs across the top"** (`howto-data.ts:36`) lists Sim / Mechanics /
  Patch Notes / Testing Requested / Meet the dev. The actual top nav is
  Sim / Tools / How to / Mechanics + a permanent "Testing Requested" link + a
  hamburger (Sync my roster, Patch Notes, Meet the dev, Credits)
  (`SiteChrome.tsx` `NAV` + menu). Tools, How to, and roster sync are missing.
- **"The seven tools on the Sim page"** (`howto-data.ts:62`) — the Sim group
  now has 5 tabs and Tools has 7 (`App.tsx:380` `CALC_TABS`). The section
  doesn't mention Roster Sim, Team Builder, Doll Leveling, Resource
  Calculator, or Overload Rolling at all, and still calls the breakpoints tool
  "Charge Speed Breakpoints" (now "Overload Breakpoints").
- The "Saving and sharing" section doesn't mention the saved-teams modal or
  roster saving.

This is the onboarding page; a new user reads it and then can't find half the
described controls. **Fix:** regenerate the section from `CALC_TABS` (ideally
render the tab list from the same source of truth so it can't drift again),
and update the top-nav description.

### A2. Tab grouping: the Overload tools and the generators are split awkwardly (P1)

> **Resolved 2026-07-20:** reorganized into four sections — Sim (Team Sim,
> Roster Sim, Team Generator, Roster Generator), Rankings (DPS Rankings, Unit
> Comparison — renamed from Custom DPS Rankings), Overload (Optimize, Rolling,
> Breakpoints), Tools (Team Builder, Doll Leveling, Resource Calculator). Top
> nav mirrors the sections (`router.ts`, `SiteChrome.tsx`).
> Team Sim and Roster Sim also gained a "Browse Nikkes" modal — the Team
> Builder grid as a staged picker (a 5-slot strip with Save Team; a full 5×5
> roster with Save Roster), pre-populated from the page and persistent across
> dismissal. Team Builder keeps its dedicated page with both copy buttons, a
> +/− 5×5 expand toggle, and clickable Not-In-Sim units (copy buttons warn).
> Patch note added.

Original finding — current groups (`App.tsx:380`):

- **Sim:** Team Sim, Roster Sim, DPS Rankings, Custom DPS Rankings, Optimize Overload
- **Tools:** Overload Rolling, Doll Leveling, Resource Calculator, Overload
  Breakpoints, Team Builder, Optimal Team Generator, Solo-Raid Roster Generator

Frictions:

1. **Three Overload tools in two groups.** Optimize Overload (which lines to
   want) → Overload Rolling (what it costs to roll them) → Overload
   Breakpoints (where the tiers pay off) are one workflow, but the first lives
   under Sim and the other two under Tools. The Optimize Overload result even
   says "Module estimate → **Roll from Current** tab" — a cross-group hop.
2. **Generators in Tools, but they read Sim's controls.** Optimal Team
   Generator and Solo-Raid Roster Generator consume the boss-options +
   "Apply to all" loadout row that only renders on Sim-group tabs
   (`App.tsx:5246` block), and their output feeds Roster Sim (a Sim tab) via
   "✎ Copy to Roster Sim". Users must cross groups mid-workflow in both
   directions.
3. **Team Builder (Tools) vs Team Sim (Sim).** Building a team and simming it
   are one task; the "✎ Copy to Sim" handoff works but the split forces it.
4. **"DPS Rankings" vs "Custom DPS Rankings".** Near-identical names, different
   models (precomputed artifact vs live lab), and Custom's "Matrix" mode
   duplicates the Rankings grid. The distinction isn't legible from the labels.

A regrouping that follows the actual workflows (one option, not prescriptive):

- **Sim:** Team Sim (+ Team Builder merged as its picker), Roster Sim
- **Rankings:** DPS Rankings, Custom DPS Rankings (rename → "Head-to-head" or
  "Unit comparison")
- **Overload:** Optimize, Rolling, Breakpoints
- **Tools:** Doll Leveling, Resource Calculator, Team Generator, Roster Generator

Minimum viable version without a reshuffle: move Optimize Overload into Tools
next to the other two Overload tools, and move the two generators into Sim
next to the boss-options row they consume.

### A3. Naming inconsistencies for the same tool (P2)

> **Resolved 2026-07-20:** one name per tool now used across `CALC_TABS`,
> `TAB_H1`, the in-tab `<h2>`, and `howto-data.ts` (Unit Comparison, Team
> Generator, Roster Generator, Overload Rolling, Overload Breakpoints);
> `useDocumentHead.ts` keeps its own keyword-rich SEO titles.

Original finding:

| Tab label (`CALC_TABS`)    | `<h1>` (`TAB_H1`, `App.tsx:5105`) | How-to name                                                       |
| -------------------------- | --------------------------------- | ----------------------------------------------------------------- |
| Optimize Overload          | Overload Optimizer                | Optimize Overload                                                 |
| Overload Rolling           | Overload Rolling                  | (absent) — "Overload Roll Sim" in its own `<h2>` (`App.tsx:4660`) |
| Solo-Raid Roster Generator | Roster Generator                  | Solo-Raid Roster Generator                                        |
| Optimal Team Generator     | Optimal Team Generator            | "Optimal Team"                                                    |

Pick one name per tool and use it in `CALC_TABS`, `TAB_H1`, the in-tab `<h2>`,
and `howto-data.ts`. (SEO titles in `useDocumentHead.ts` can stay keyword-rich
separately.)

### A4. Tools tab bar hides its overflow (P1)

> **Resolved 2026-07-20 (moot):** no section has more than four tabs after the
> reorg, so the bar no longer overflows at desktop widths. The hidden-scrollbar
> CSS itself is still there — worth removing or adding a fade if tab counts grow.

Original finding:

`.tabs-bar` sets `overflow-x: auto` with `scrollbar-width: none` and
`::-webkit-scrollbar { display: none }` (`styles.css:587-600`). Seven Tools
tabs don't fit on most laptop widths; the last tabs ("Team Builder", "Optimal
Team Generator", "Solo-Raid Roster Generator") are simply invisible with no
fade, arrow, or scrollbar to hint there's more. Mobile avoids this via the
dropdown (`TabDropdown`), but desktop doesn't.

**Fix options:** edge fade + scroll buttons; a "more ▾" overflow menu past a
width breakpoint; or shorter tab labels ("Roster Gen", "Team Gen") so seven
fit. Whichever: never scroll-without-affordance.

### A5. Smaller IA notes (P3)

> **Partly resolved 2026-07-20 (owner-directed):** the Discord login/account
> control moved to the top nav (icon + label, icon-only on mobile) and
> Testing Requested moved into the hamburger menu. The soft-404 banner for
> unknown URLs remains a deferred follow-up.

- **Unknown URLs silently resolve to Sim** (`router.ts` `routeFromPath`).
  `/typo` shows the sim with no 404 signal. Cheap fix: keep the fallback but
  show a one-line "no such page — showing the Sim" banner.
- **"Testing Requested" is permanent in the top nav** while Patch Notes and
  roster sync are behind the hamburger. Testing Requested is a contributor
  page; Patch Notes is what returning users actually look for. Consider
  swapping.
- **Login is inside the hamburger**, but team saving and roster sync both
  depend on it. First-time users have no reason to open the menu. A "Log in"
  text button on the nav right (Discord icon + label, as it already renders in
  the menu) would surface it.

---

## B. Data display

### B1. Sim results table (P2)

> **Resolved 2026-07-20:** legend line under the table (▲ / ⚠️), tooltip on
> "s stalled", an explicit stale-inputs chip (alongside the 55% dim), the
> table wrapped for horizontal scroll on narrow screens, and tabular-nums on
> all tables. The normal/skill/burst cell stays one column (splitting would
> widen the table on mobile).

The table itself is solid (damage / share / DPS / breakdown / bursts). Gaps:

- **No legend near the table.** `▲` (elemental advantage) and `⚠️` (partially
  modeled) are explained only via `title` tooltips and the (stale) How-to
  page. A one-line legend under the table would remove the hover dependency
  (tooltips don't exist on touch).
- **"…s stalled" in the summary is unexplained jargon.** `0.0s stalled` means
  rotation stall, which the Mechanics page never defines either. Either
  tooltip it ("time a burst stage window expired with no ready caster") or
  drop it from the summary when it's 0.
- **Stale results are dimmed to 55% opacity with no message**
  (`App.tsx:5766`). Users can easily miss that the numbers no longer match
  their inputs. Add an explicit "inputs changed — re-run sim" chip above the
  table when `simStale`.
- **The `normal / skill / burst` triple is one muted cell.** Three numbers in
  one right-aligned cell are hard to compare down a column. If width allows,
  three narrow columns; otherwise keep it but tabular-nums align it.
- **No horizontal scroll wrapper on mobile.** `.table-scroll` exists but is
  only applied to the breakpoint ladders; the 7-column results table on a
  360 px screen will crush columns. Wrap it.

### B2. DPS Rankings (P2)

> **Resolved 2026-07-20:** raw DPS now shows as a small muted figure beside
> the normalized score on every bar and the compare row (no hover needed),
> and the compare-unit select is grouped by element with `<optgroup>`.

- **Relative score is primary, raw DPS is hover-only** ("hover a score for the
  raw DPS", `DpsChartTab.tsx`). For the share-infographic use case relative is
  right, but on touch devices the raw number is unreachable. Show raw DPS as a
  small secondary figure, or at least put it in visible text on the compare
  row.
- **"Custom profiles" `<details>`** mixes user-facing modeling notes with
  roadmap state — see C1 for the Diesel: Winter Sweets item.
- **"Control frameworks" `<details>`** is good; the dense "Elements / Core /
  Investment" paragraph inside it would read better as the same 3-column
  definition list used above it.
- The **compare-unit `<select>`** lists ~190 units in flat alphabetical order.
  `<optgroup>` by element (or a search input) would cut hunt time.

### B3. Other tools (P2–P3)

> **P2 items resolved 2026-07-20:** "details table" summaries renamed
> ("full comparison table", "full line ranking"); FAQ questions de-numbered
> (Overload Rolling + Doll Leveling). Remaining P3s (FAQ-as-accordion,
> single-pill Resource tab) stay open.

- **Optimize Overload:** the ranked table sits behind a `<details>` labeled
  "details table" (`App.tsx:3857`) — label says nothing. "Ranked line
  combinations" or "Full ranking table" is free.
- **Overload Roll Sim FAQ:** the questions are numbered 1–5, implying a
  sequence that doesn't exist. Drop the numbers or convert to an accordion.
  Content-wise the FAQ is the most useful cost guidance on the site — keep it,
  tighten the tone (C4).
- **Team Builder:**
  - The intro sentence "multiple selections within a row are OR'd together;
    rows are AND'd" is developer-speak (C6).
  - Filter rows are icon-only buttons with `title` tooltips
    (`TeamBuilderPage.tsx` `FilterRow`). Weapon/element icons are fluent for
    this audience; class and manufacturer less so. A text fallback on hover
    (small label under the row when any icon in it is active) would help.
  - "Not In Sim" badge on unsupported units — good, keep.
- **Saved teams modal:** delete is a bare `×` chip (`title='delete'`,
  `App.tsx:5953`) with no confirmation — a destructive action with the weakest
  affordance in the app. Use a "Delete" text button or a confirm step.
- **`window.prompt` / `window.alert`** for team naming and share-link fallback
  (`App.tsx:1731,1749,1806,1933,2038,5043`, `TeamBuilderPage.tsx:373`).
  Functional but jarring and unthemeable; a small inline name input in the
  save flow is the upgrade.
- **Resource Calculator:** no changes needed beyond growth — when a second
  resource family lands, the single-pill `RES_TABS` row will make sense;
  today the lone "Anomaly Interception" pill is a control with one option.
  Consider hiding the pill row until there are ≥2 families.

### B4. DPS Rankings error state leaks dev instructions (P0)

> **Resolved 2026-07-20:** the message now tells users to refresh and report
> in the Discord; the `npm run dpschart` hint survives as a code comment.

```
Couldn't load chart data ({err}). Regenerate it with `npm run dpschart`.
```

(`DpsChartTab.tsx:58`). End users can't run npm. User-facing message should be
"The DPS rankings data failed to load — try refreshing; if it persists, report
it in the Discord." Keep the npm hint in a code comment.

---

## C. Copy: editorial / AI-flavored prose → factual rewrites

The site's default register (Mechanics, Resource Calculator, Roster Sync
errors) is already factual and specific. The items below are the outliers.
Suggested rewrites keep every fact and drop the editorializing.

### C1. Internal roadmap language on a public page (P0)

> **Resolved 2026-07-20:** rewritten to "…but burst-order modeling isn't
> implemented yet, so her chart score still uses the Intro (bursts-first)
> numbers" — same facts, no internal status.

`DpsChartTab.tsx:141` (Custom profiles):

> **Current:** "Not yet reflected in her chart score — proper burst-order/Highlight
> modeling is a pending backend task, so her ranking still uses the Intro
> (bursts-first) numbers for now."

"Pending backend task" is an internal status, not a user fact.

> **Suggested:** "Her score currently assumes she bursts first (Intro state).
> Burst-second (Highlight) modeling is not implemented yet."

### C2. Credits intro (P2)

> **Resolved 2026-07-20:** rewritten to the suggested four lines (keeps the
> Tsareena thank-you, drops the min-maxing digression).

`CreditsPage.tsx` — 130 words, three run-on sentences, self-deprecating filler:

> **Current (abridged):** "…had a heavy influence on the overall feasibility of this
> project in addition to serving as external validation I could measure my own
> testing tools against… I've long consumed data in my obsessive min-maxing
> career over my long gaming history, I am happy to finally contribute my own
> tool to a gaming community that I love. And Lastly, a special thank you to
> Tsareena from Maiden's Bakery for cursing me with the idea for this insane
> project."

> **Suggested:** "This sim is built on community research, datamines, and
> companion tools — listed below with what each one contributes — validated
> against frame-by-frame recordings of real fights. Thanks to everyone whose
> work is cited here, and a special thanks to Tsareena from Maiden's Bakery
> for the idea that started this project."

Keeps the genuine thanks, drops "obsessive min-maxing career", "cursing me",
"insane project" — the gratitude lands better when it's plain.

### C3. Patch notes metaphors (P2)

> **Resolved 2026-07-20:** the 2026-07-19 "cool off / warm up" bullet
> rewritten to state the direction of change plainly.

`patch-notes.json` 2026-07-19:

> **Current:** "Net effect: units that were slightly over-credited for core hits at
> long range **cool off**, high-Hit-Rate close-range shooters **warm up**, and
> overall board accuracy improved."

> **Suggested:** "Net effect: predicted damage drops slightly for long-range
> core-heavy units and rises for high-Hit-Rate close-range shooters; overall
> board accuracy improved. Rotation and Full Burst counts are unchanged."

Same entry, earlier line: "shots now land in an aim cone that tightens onto
the core the closer the boss is" — this half is good; concrete and visual
without being editorial. The pattern to apply everywhere: **state what changed
and in which direction, not how it feels.**

### C4. Overload Roll FAQ tone (P2)

> **Resolved 2026-07-20:** the "jackpot" lines rewritten factually ("a
> specific stat rolling T15 is roughly a 1-in-1,000 event — rerolling it
> costs more than keeping it"); the FAQ's teaching voice otherwise kept.

`App.tsx:4610`:

> **Current:** "Yes, lock it. A T15 is basically the jackpot — you almost never want
> to throw it back."

> **Suggested:** "Yes, lock it. A specific stat rolling T15 is roughly a 1-in-1,000
> event; rerolling it costs more than keeping it in every scenario we tested."

The FAQ's conversational voice is mostly a strength (it's teaching, not
narrating), so only the metaphor-heavy lines need this treatment. Also
`App.tsx:4628` "Bottom line: keep the jackpot line." → "Bottom line: keep a
T15 Line 1."

### C5. How-to defensiveness (P2)

> **Resolved 2026-07-20:** now "It models actual firing and burst timing, not
> averaged rates."

`howto-data.ts` "How the numbers are made":

> **Current:** "It is not a spreadsheet of averages; it models the actual firing and
> burst timing."

Defensive framing ("it is not X") spends a sentence on what the sim _isn't_.

> **Suggested:** "It models actual firing and burst timing, not averaged rates."

### C6. Team Builder boolean-speak (P2)

> **Resolved 2026-07-20:** the boolean-speak intro is gone — the grid now also
> renders in the Browse Nikkes modal, whose hint line is factual ("Click a
> card to add it to the next open slot; click × on a portrait to remove it."),
> and the Team Builder page intro was rewritten the same way.

Original finding — `TeamBuilderPage.tsx` intro:

> **Current:** "Tap an icon or role pill to toggle it on — multiple selections within
> a row are OR'd together; rows are AND'd."

> **Suggested:** "Tap an icon or role pill to filter by it. Within a row, a unit
> matching any selected icon passes; across rows, a unit must match every row
> you've filtered."

### C7. Unsupported-unit warning filler (P2)

> **Owner-ruled 2026-07-20: keep the original message.** The Team Builder's
> Copy-to-Sim warning stays verbatim by explicit owner decision.

`App.tsx:5079`:

> **Current:** "…currently unsupported for the sim. We're constantly updating the
> backlog of unsupported Nikkes, check back soon."

> **Suggested:** "…not modeled in the sim yet, so the team can't be simmed with
> them." (Optionally link to Testing Requested, which is where the backlog
> actually lives.)

### C8. Testing Requested intro (P3)

> **Follow-up (deferred by owner 2026-07-20).**

> **Current:** "…every verified run helps close the gap between prediction and
> reality."

> **Suggested:** "…every verified run tightens the sim's per-unit accuracy."

**Not flagged, deliberately:** the Mechanics page, Resource Calculator
("How to read this"), Roster Sync error strings, the dev bio, and the
Guided Roll step text — these are already factual and specific.

---

## D. Performance & load

### D1. One 2.5 MB bundle, everything inlined (P1)

> **Resolved 2026-07-20:** every route is now `React.lazy` in `main.tsx` with
> a Suspense fallback, and `manualChunks` pins react/react-dom to a shared
> chunk. Build output: entry **28 KB** + react **140 KB** + per-page chunks
> 4–16 KB; static pages (How to, Mechanics, Credits, …) no longer download
> the sim. The sim chunk (784 KB) + the `characters.json` chunk (1.6 MB,
> shared with Roster Sync) load only on sim-family routes. Overrides +
> skill-levels still ride in the sim chunk — fetching them on demand (item 2
> below) remains a future option; it needs a "sim not ready" gate so a run
> can never execute before overrides land. Both JSDOM smoke harnesses were
> updated for split chunks (entry selection, Suspense wait, modulepreload
> fetch shim, SPA navigation instead of re-import).

Original finding — production build: `dist/assets/index-*.js` = **2.5 MB raw
/ ~510 KB gzip**, single chunk, no code splitting. Drivers:

| Payload                                  | Size   | How it's loaded                                                        |
| ---------------------------------------- | ------ | ---------------------------------------------------------------------- |
| `data/characters.json`                   | 2.4 MB | static import (`App.tsx`, `TeamBuilderPage.tsx`, `RosterSyncPage.tsx`) |
| `src/skills/overrides/*.json` (75 files) | 592 KB | `import.meta.glob(..., { eager: true })` (`App.tsx`)                   |
| `data/skill-levels.json`                 | 112 KB | static import                                                          |
| engine + doll/overload models            | —      | static imports                                                         |

Every route pays this — `/credits` and `/howto` ship the entire sim. The site
already has the right pattern in-house: `dpschart.json` (104 KB) is a lazy
fetched artifact (`dpschartData.ts loadDpsChart`).

**Recommended, in order of payoff:**

1. **Split `characters.json` into its own chunk** (Vite does this automatically
   once it's fetched or dynamically imported) and lazy-mount the sim App with
   `React.lazy` per route in `main.tsx`. Static pages then cost ~tens of KB.
2. **Fetch overrides + skill-levels on demand** (they're only read when a sim
   runs) or move them into the dpschart-style artifact pipeline.
3. Add `manualChunks` for react/react-dom so the framework chunk caches
   independently of app code.

Note: `characters.json` is a protected data path — these are build-pipeline
changes (how it's imported), not edits to the file.

### D2. Portraits: third-party CDN + runtime canvas downscaling (P1)

> **Resolved 2026-07-20:** `npm run thumbs` (`scripts/gen-portrait-thumbs.ts`,
> Playwright + the same stepped-halving/crop pipeline) generates
> `web/public/img/portraits/<slug>-{128,256}.webp` for all 192 units plus
> `web/src/portrait-manifest.json` (imageUrl → slug). `usePortraitThumbs`
> resolves manifest hits synchronously (no canvas, no CDN); units without a
> thumbnail fall back to the runtime canvas path, so a fresh sync keeps
> working until the next thumbs run. Share cards, roster-sync tiles, and the
> picker avatars use the local thumbs too. The grid previously pulled ~200 KB
> full-res PNGs per unit; it now serves 4–20 KB webps and no longer depends
> on the art CDN at view time. Re-run `npm run thumbs` after data syncs.

Original finding — all 192 portraits are full-res PNGs on `sg-tools-cdn.blablalink.com`
(`characters.json imageUrl`). The site downloads them and downscales in a
canvas with stepped halving (`imageDownscale.ts`) — the aliasing fix is
correct and well-documented — but:

- **Team Builder downscales all 192 portraits at 120 px on mount**
  (`TeamBuilderPage.tsx` `usePortraitThumbs(allPortraitUrls, 120)`), before
  any filtering, plus every filter icon and mini icon. That's a burst of ~200
  image decodes + canvas passes on first paint.
- **No control over CDN availability, latency, or compression.** If blablalink
  rate-limits or the CDN goes away, every portrait on the site breaks.
- Thumbnails are per-component-instance data URLs — the same portrait is
  re-fetched/re-downscaled by each component that renders it (DPS chart rows,
  team chips, picker).

**Fix:** a build-time thumbnail script (the downscale code already exists —
run it in a node canvas step or a one-off browser pass) emitting
`web/public/img/portraits/<slug>.webp` at 2–3 sizes, with `imageUrl` mapped to
the local path at build time. Kills the runtime canvas work, the CDN
dependency, and most of the bytes in one move. `usePortraitThumbs` becomes a
plain URL map with `srcset`.

### D3. Smaller performance items (P3)

- `maiden.gif` is 480 KB and renders as a ~40 px footer tile and a ~64 px
  callout avatar. A static `.webp` (or two) saves ~450 KB per visit.
- No `fetchpriority`/`preconnect` for the portrait CDN (moot if D2 lands).
- CSS is a single 40 KB file — fine as-is; no action.
- No custom webfonts (system stack) — this is a _good_ load-time decision;
  see E3 for the design tradeoff.

---

## E. General UI/UX & accessibility

### E1. Color & theme (P3)

> **Follow-up (deferred by owner 2026-07-20).**

- Dark-only theme (`color-scheme: dark`, `--bg: #101216`) — appropriate for a
  game tool; no light mode needed. Palette is restrained (one accent
  `#5b9dff`, one warn `#e0b04b`) and consistent.
- **Element colors carry data** in the DPS charts (`ELEMENT_COLORS`). Fire
  (red) vs Wind (typically green) is the classic deuteranopia collision; bars
  also carry name + value so color is never the _only_ channel — acceptable,
  but worth a check that the five element hues differ in lightness, not just
  hue.
- `--muted` (#8b93a3 on #101216) ≈ 4.6:1 — passes for body text; the 11 px
  uppercase table headers in muted are the tightest spot. Consider 12 px.
- The doll-tier chips use inline `style={{ background: ... }}` literals
  (`App.tsx` `tierChip`) — the only colors outside the token system. Move to
  classes.

### E2. Accessibility gaps (P2)

> **Resolved 2026-07-20:** global `:focus-visible` outline, a blanket
> `prefers-reduced-motion` rule, and the sim results table now scrolls
> horizontally on narrow screens (min-width inside `.table-x`).

- **No `:focus-visible` styles anywhere** (only two input `:focus` rules,
  `styles.css:2175,2494`). Pills, tabs, chips, and cards are all
  `border: 0; background: none` — keyboard focus is effectively invisible.
  Add one global rule: `:focus-visible { outline: 2px solid var(--accent);
outline-offset: 2px; }`.
- **No `prefers-reduced-motion` handling.** The Resource tiles re-deal on
  every change, ladder rows stagger in, and the tab caret animates. Add a
  blanket `@media (prefers-reduced-motion: reduce) { * { animation: none;
transition: none; } }`.
- **Icon-only controls rely on `title`:** chart share chips (🔗/🖼), modal
  delete `×`, filter icon buttons. `title` is unreliable (touch, screen
  readers); the hamburger has `aria-label` — extend that pattern to the rest.
- Emoji as icons (💾 🔗 🖼 ✎) render inconsistently across OSes; fine for now,
  but they're the first thing to replace if the UI gets a visual pass.
- `<details>/<summary>` usage is semantic and good.

### E3. Typography & visual hierarchy (P3)

> **Follow-up (deferred by owner 2026-07-20)** — except `tabular-nums` on
> tables, which shipped with B1.

- Single-family system stack (`-apple-system, … Roboto, sans-serif`) — fast
  (no font payload) but flat: everything from `<h1>` to table cells differs
  only by size/weight. A distinctive display face for headings (even one
  self-hosted woff2, ~20–40 KB) would give the tool an identity without
  hurting load. If staying font-free, widen the scale contrast instead: the
  jump from 18 px tab `<h2>` to 14 px body is small; the results summary
  (`team 12.34M`) deserves a bigger number treatment.
- Numbers are the product, but only a few spots use `tabular-nums` (the doll
  usage guide). Apply `font-variant-numeric: tabular-nums` to all result
  tables and stat tiles so columns align and deltas are scannable.

### E4. Interaction polish (P3)

> **Mixed:** the drag-hook duplication is resolved (extracted to
> `web/src/useDragReorder.ts` during the Browse Nikkes drag work, with the
> `ignoreFrom` option for the × chips). The rest (breakpoint consolidation,
> `window.prompt` save flows, scope-lock tooltip) is a deferred follow-up.

- **Breakpoints are inconsistent:** 640 / 720 / 900 px across `styles.css`.
  Consolidate to two (e.g. 640 and 900) as design tokens.
- **Share buttons flash "✓ Copied"** for 1.5 s — good feedback pattern; reuse
  it for the save flows instead of `window.prompt`/`alert`.
- **Drag-to-reorder** exists in two copies (`App.tsx` and
  `TeamBuilderPage.tsx` `useDragReorder`, literally commented "copied from
  App.tsx"). Extract to a shared hook — behavior has already diverged
  (tap-to-remove only in Team Builder).
- The scope-lock preset is the project's headline feature but is one pill
  among many in the loadout row. Given the whole validation story hangs on
  it, a short `title`/tooltip ("the exact preset every recorded test fight
  uses") would help — the How-to explains it, but in-context beats in-docs.

---

## Suggested order of work

1. **P0 trio (an afternoon):** rewrite the stale How-to sections from
   `CALC_TABS`; fix the DPS chart error message; strip the "pending backend
   task" line from Custom profiles.
2. **Bundle split (D1):** route-level `React.lazy` + `characters.json` out of
   the main chunk. Biggest measured win for first load.
3. **Portrait pipeline (D2):** build-time local thumbnails.
4. **IA pass (A2–A4):** regroup Overload tools + generators, fix tab-bar
   overflow affordance, unify tool names (A3) in the same PR since it touches
   the same constants.
5. **Copy pass (C):** mechanical once the rewrites above are approved.
6. **A11y/polish (E2, B1):** global focus-visible + reduced-motion rules,
   results-table mobile scroll + legend, saved-team delete confirmation.

---

## Follow-ups (P3, deferred by owner 2026-07-20)

Everything P0–P2 is resolved (see status notes above). The remaining items are
explicitly parked for a later pass:

- **A5 (remainder):** soft-404 banner for unknown URLs (fallback to Sim stays).
- **B3 (remainder):** Overload/Doll FAQs as a real accordion; hide the
  Resource Calculator's single-pill family row until a second family lands.
- **C8:** Testing Requested intro — tighten "close the gap between prediction
  and reality".
- **E1:** colorblind check on the five element hues in the charts; inline
  doll-tier chip colors → classes.
- **E3:** a display face for headings (or a wider type scale); bigger number
  treatment for the results summary. (`tabular-nums` already shipped.)
- **E4 (remainder):** consolidate the 640/720/900 px breakpoints; replace
  `window.prompt`/`alert` save flows with inline UI; scope-lock preset
  tooltip. (Drag-hook dedup shipped.)
- **Saved-team delete confirmation** (from B3) — bare `×` with no confirm.
