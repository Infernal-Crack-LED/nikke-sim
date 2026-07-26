# Handoff — frontend for the four ranking boards

> Context-packed for a fresh session. Backend LANDED 2026-07-26 (sources
> `src/ranks/`, builders `scripts/build-{burstgen,burstcdr,sustain,bufferchart}.ts`,
> `npm run ranks:all`, tests `scripts/tests/ranks/`). Methodology of record:
> `docs/data/rank-boards.md`. This doc is the frontend build plan — read
> `docs/frontend-conventions.md` before writing any UI (it is binding).

## What ships

Four new ranked lists next to the existing DPS chart: **Burst Generation**,
**Burst CDR**, **Sustain**, **Buffer**. Artifacts are precomputed JSON in
`web/public/` (gitignored build outputs, served at root, copied into `dist/` by
the Vite build exactly like `dpschart.json`):

| Artifact | npm script | Content |
|---|---|---|
| `burstgen.json` | `ranks:burstgen` | all sim-supported units, uncapped 180s gauge |
| `burstcdr.json` | `ranks:burstcdr` | 15 CDR units, nominal CDR sec/40s |
| `sustain.json` | `ranks:sustain` | 50 sustain units, team-total HP |
| `bufferchart.json` | `ranks:buffer` | 74 buffers × {generic, typed} boards, added carry DPS |

## Artifact shapes (all carry `generatedAt`, `methodology`, `units`)

`units` is the same shape as dpschart's: `slug → {name, element, elements[],
weapon, burst, imageUrl}` (plus `tier/chartPop` only on dpschart).

**The `profile` flag (owner requirement 2026-07-26):** every entry row on every
board ends with a `profile` field — `null` for the plain run, or a profile id
string. Units that have a profile appear TWICE (plain + profiled). Profile ids
and their player-facing notes are in the artifact's `profiles` map
(`id → note`). Current profiles:

- burstgen: `little-mermaid` → `with-2mg`, `cinderella-crystal-wave` → `with-1mg`
- sustain: `prika` → `with-mint`, `anchor-innocent-maid` → `with-mast-rm`
- buffer: `crown` → `with-healer`, `naga` → `with-shielder`

```jsonc
// burstgen.json
{ "entries": [[slug, gaugeTotal, profile], ...],          // sorted desc; 100 = one bar
  "profiles": { "with-2mg": "…", "with-1mg": "…" } }

// burstcdr.json
{ "entries": [[slug, cdrPer40s, ramp|null, condition|null, selfCdr|null, profile], ...] }

// sustain.json
{ "entries": [[slug, totalHp, totalPct, healPct, shieldPct, lifestealPct, profile], ...],
  "profiles": { "with-mint": "…", "with-mast-rm": "…" } }

// bufferchart.json
{ "cells": { "generic": [[slug, addedDps, carryDps, rules?, profile], ...],
             "typed":   [[slug, addedDps, carryDps, rules?, profile], ...] },
  "profiles": { "with-healer": "…", "with-shielder": "…" } }
```

Entries are pre-sorted (rank = index+1 over the full entry list, profiles
included). `rules` (buffer typed board) is an optional array of derivation
audit strings — good tooltip material ("why did the carries change?").

## Build plan

1. **Data modules** — one per board, mirroring `web/src/dpschartData.ts`:
   `rankBoardsData.ts` is fine as a single module with four loaders (same
   module-level-cache fetch pattern, `${import.meta.env.BASE_URL}<name>.json`)
   + `BarEntry` mappers. Keep the row-tuple types in `src/ranks/` (a shared
   `types.ts` export) so web and builders agree.
2. **Page** — one `RankBoardsPage.tsx` (route `/ranks`, nav "Rankings") with a
   board pill-switcher (Burst Gen / Burst CDR / Sustain / Buffer) rather than
   four pages — the boards share one ranked-bar UI. Buffer gets a second
   pill row (Generic / Typed). Reuse `DpsBarChart` (`web/src/components/`)
   for the bars: it already does portraits, element colors, share buttons.
3. **Profile display** — entries with `profile != null` get a badge chip on
   the bar row ("w/ 2 MG", "w/ Mint", "w/ Healer") using the `profiles[id]`
   note as tooltip; both variants stay in the same ranking (that is the point —
   the owner wants plain and profiled standings comparable at a glance).
   Do NOT collapse them into one row without asking.
4. **Board-specific columns**:
   - burstgen: value in bars (gaugeTotal/100, 1 decimal) + raw gauge.
   - burstcdr: seconds per 40s; `condition` as an asterisk tooltip; `ramp` as
     "1st/2nd/3rd+ FB" sub-line on escalating units; `selfCdr` as a muted note.
   - sustain: absolute HP as the bar value; the heal/shield/lifesteal split as
     a mini stacked breakdown or tooltip; `% of max HP` secondary.
   - buffer: added DPS as the bar value; `carryDps` as muted context; negative
     values render below a zero axis (soline-frost-ticket is negative today).
5. **Methodology disclosure** — each board's `methodology` string renders in a
   collapsible "How this works" card (the DPS chart has the same pattern with
   its Custom Profiles disclosure). This is REQUIRED, not optional — every
   board has owner-visible conventions (disableBursts, profiles, baselines)
   that must be one click away.
6. **Wiring** — `router.ts` (Route union + ROUTES + PAGE_ROUTES), `main.tsx`
   switch, `SiteChrome.tsx` NAV. Styles under a `/* ---- rank boards ---- */`
   section in `styles.css` with a `.ranks-*` prefix. Prerender:
   `scripts/prerender.mjs` has a route list — add `/ranks` and check
   `web/src/useDocumentHead.ts` for title/meta.
7. **Smoke** — extend `scripts/web-smoke.mjs` (or add a sibling like
   `web-smoke-dpschart.mjs`) to fetch each artifact + the new route. `npm run
   web:build` must stay green.
8. **Build wiring** — decide with the owner whether `ranks:all` joins
   `build:deploy` (it currently only runs `dpschart`); artifacts are gitignored
   so deploys need the builders run first. `verify.sh deploy` mode is the
   precedent.

## Notes / gotchas

- Synthetic units (carry/noop slugs) never appear in `units` — only real
  roster slugs do. No portrait fallback needed beyond `imageUrl: null`.
- The sustain board includes units that are NOT simSupported (their sustain is
  valued analytically, not via kit modeling) — do not assume "on a board =
  simmable in the app"; no links into the sim tab from sustain rows without a
  `simSupported` check (`data.characters[slug].simSupported`).
- burstcdr `entries` rows have fixed arity 6 (pad with `null`s), sustain fixed
  arity 7, burstgen 3, buffer 5 — tuples, not objects; keep indices in one
  place (the data module). `profile` is always the LAST element.
- Bakery-bot (`/Users/maxwellsutton/bakery-bot`) reads `dpschart.json` today;
  the owner may want the new boards exposed there later — the artifacts are
  fetch-shaped for it, but that's a separate ask.
