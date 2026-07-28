# Unit-card infographic — design plan (2026-07-28)

> **Status:** DESIGN, owner-reviewed rulings captured; not yet implemented.
> **Branch/worktree:** `unit-card-infographic` @ `../nikke-sim-wt-unitcard` (off `origin/main`).
> **Goal:** replace bakery-bot's `/nikke` embed with a rendered character card, and make that same
> card the **Twitter launch asset for unreleased characters**.
> **Supersedes nothing.** Extends `docs/handoffs/2026-07-27-infographics-centralization-plan.md`
> (the renderer/API/pre-render architecture, already landed and DEPLOYED).

## 1. Why this is a redesign, not a new build

`src/infographics/core/unitCard.ts` already exists and is already pre-rendered for every unit:

- `scripts/build-infographics.ts` renders one card per character at build time (`key: unit/<slug>`),
  content-hashes the filename, writes `dist/img/unit/<slug>.<hash>.png` + `manifest.json`.
- `src/server/api.ts` serves `GET /api/v1/img/unit/<file>` `immutable`; `manifest.json` is `no-cache`.
- The font gate (`assertFontsLive` + `assertTitleInk`) fails the build before writing textless images.

**The owner's hosting/caching requirement is therefore already satisfied** — pre-generated, hosted,
content-addressed, zero per-`/nikke` render. This plan changes *what the card draws*, plus the two
data-sync additions that feed it. It does not add infrastructure.

The current card is an identity card only: portrait, name, `class · manufacturer`, element chip,
`B<stage> · <cd>s CD`, weapon. Everything in §5 below is new.

## 2. Owner rulings (2026-07-28)

1. Bars show **what nikkesim.app already displays for that board** — DPS uses rel-score; sustain and
   buffer use their own displayed numbers. No invented scale.
2. **Every card emits at the same size**, regardless of how much data the unit has. Fixed geometry is
   a hard requirement (drives the "unranked" treatment in §7).
3. Icons come from **our own assets** (`web/public/nikke-icons/`, the ones `/teambuilder` uses) — not
   Synergy CDN URLs.
4. Aspect ~**2:1**; the mockup's exact pixel dimensions are not meaningful (MS Paint sketch).
5. Rank colours are WarcraftLogs-inspired, **corrected**: `1` gold · `2–5` pink · `6–10` orange ·
   `11–20` purple · `21+` blue.
6. Release date and Tsareena notes are **nullable** — upstream may not carry them.
7. Unreleased units: the pre-release authoring workflow is a **separate effort**. Design against the
   data a *released* character has, but make every externally-sourced field nullable so the future
   workflow drops in without a redesign.
8. Writing to `data/**` is approved for this work.

## 3. The advertising goal is a design constraint

The owner intends to post these cards to Twitter when a new character is announced — *"no one else
can have data-backed results before a character is released"*. The card is the advertisement, so:

- **2:1 is exactly right for Twitter.** A single image renders uncropped in-timeline between 2:1 and
  1:1; 2:1 is the widest that will not be cropped. Anything wider gets centre-cropped and loses the
  edges of the layout.
- **In-timeline display is ~500–550 px wide** (and Discord's classic embed image is ~550 px). At that
  width a 1200-logical-px card is at ~45% scale. Therefore: **the character name and the three rank
  tiles must be legible at 45% scale**; bar labels, tags, and the notes panel may require a click.
  This is the single strongest layout constraint and it pushes the same direction the mockup already
  goes — very large rank numerals in the right-hand tiles.
- The mandatory `nikkesim.app` watermark (`core/theme.ts` `drawWatermark`, drawn as the final pass and
  impossible for a caller to strip) is the advertising payload. The mockup's "Sim Logo" in the title
  bar is a second, more prominent placement — `src/infographics/assets/nikkesim-icon.png` exists.

## 4. Data sources + measured coverage

Queried against bakery-bot Postgres 2026-07-28 (`DATABASE_PUBLIC_URL`, 196 rows).

| Field | Source | Coverage | Note |
| --- | --- | --- | --- |
| name, element, weapon, class, manufacturer, burst, burstCooldownSec | `data/characters.json` | 195/195 | already synced |
| `rl3` | `data/characters.json` | 193/195 | already synced |
| **`releaseDate`** | DB `attributes->>'releaseDate'` | **194/196** | **NOT synced yet — §5** |
| **Tsareena build/priority** | DB `sheet_data` | **88/196 (45%)** | **NOT synced yet — §5** |
| Neutral DPS rank | `dpschart.json` cell `solo.neutral.c100.8of12` | 40 units | 90 cells total |
| Ele-advantaged DPS rank | `dpschart.json` cell `solo.eleweak.c100.8of12` | 40 units | |
| Burst gen | `burstgen.json` | 77 units | |
| Buffer | `bufferchart.json` | 74 units | `addedPct` can be **negative** |
| Sustain | `sustain.json` | 50 units | |
| Burst CDR | `burstcdr.json` | **15 units** | thinnest board |
| Tags | `data/archetype-tags.json` | all | Team Builder archetypes |
| Sim-optimal 12/12 OL | `data/ol-optimal.json` | 74 units | `generatorSupported` |

**Coverage is the dominant design problem.** 192 cards are drawn against a 40-unit DPS chart and a
15-unit CDR board. "Non-sim-supported units have no DPS rank" is not an edge case — *most cards will
be missing several boards*, and 55% will have no Tsareena panel. Ruling 2 (fixed size) means the
layout must be designed around absence, not patched for it.

## 5. Sync changes (both are small — the data is already reachable)

`src/data/sync.ts` reads **bakery-bot's Postgres directly** (line 1 header; query at ~line 121). No
cross-repo export mechanism is needed.

**5a. `releaseDate`** — the query already selects `attributes`; the mapper reads `a.rl3` at line 263
and simply never mapped the sibling field. One line:

```ts
releaseDate: a.releaseDate ?? null,   // YYYY-MM-DD; nullable (194/196 upstream)
```

Plus `releaseDate?: string | null` on `CharacterData` in `src/types.ts`.

**5b. Tsareena `sheet_data`** — add `sheet_data` to the select list, then write a **separate artifact**
`data/tsareena-build.json` rather than inlining it into `characters.json`. Rationale: `characters.json`
is the sim's deterministic input and is consumed by the engine, regression snapshots, and every build
script; Tsareena's prose is display-only editorial data with a different update cadence and a different
provenance tier. Keeping it out avoids churning the sim's primary input on every sheet edit.

Shape:

```jsonc
{
  "syncedAt": "<iso>",
  "units": {
    "<slug>": {
      "priority": "Highest Priority",       // nullable
      "annotations": ["T"],                  // nullable
      "build": {                             // every field nullable
        "skillLevels": "10/10/10",
        "cube": "Bastion · Vigor",
        "overloadMinimum": "2x Element · 2x Attack · 1xAmmo",
        "overloadIdeal": "4x Element · 4x Attack · 2x Ammo · 2x Crit Rate/Damage",
        "overloadGear": "Yes", "overloadLevelFive": "Yes", "levelDoll": "Yes",
        "endgameUses": "Story · Solo Raid · Union Raid · Pilgrim Tower · PvP",
        "pairWith": null,
        "burstGen": "Auto: Low Manual: Low",
        "notes": "Gets higher attack from higher max HP"
      }
    }
  }
}
```

(Field list confirmed from a live row, not assumed.)

Note `build.overloadIdeal` is **Tsareena's** recommendation and is editorially distinct from
`data/ol-optimal.json`, which is **our sim-computed** damage-optimal 12/12. The card should show both
and label them as different things — that contrast is itself a selling point for the site, and for an
unreleased character only ours will exist.

## 6. Card layout

Logical **1200 × 600** (2:1), rendered at `dpr 2` → **2400 × 1200**. That downsamples to Twitter's
1200×600 in-timeline slot at exactly 2×, which is the cleanest possible resampling.

```
┌────────────────────────────────────────────────┬──────────────────────────┐
│ TITLE BAR                                      │ RANKINGS                 │
│  [logo] [portrait] Name — <release date>       │ ┌──────┬──────┬──────┐   │
│  [burst][cdr][elem][weapon][class][mfr][RL3]   │ │ tile │ tile │ tile │   │  ~38%
├────────────────────────────────────────────────┤ └──────┴──────┴──────┘   │
│ RANK CONTEXT + BARS                            ├──────────────────────────┤
│   neighbour above / THIS UNIT / neighbour below│ NOTES                    │
│   (neutral + ele-advantaged)                   │  Tsareena build + notes  │
│                                                │  Sim-optimal 12/12 OL    │
│   bar chart rows (§8)                          │  (or the pre-release     │
│                            ~62%                │   caveat block, §9)      │
├────────────────────────────────────────────────┤                          │
│ TAGS                                           │                          │
├────────────────────────────────────────────────┤                          │
│ nikkesim.app watermark                         │                          │
└────────────────────────────────────────────────┴──────────────────────────┘
```

Left column carries the detail (neighbour context + bars); right column carries the three headline
tiles and the notes panel. This matches the mockup and puts the two must-be-legible-at-45% elements
(name, tiles) on opposite corners where they read as the image's anchors.

## 7. Rank tiles — selection + the absence rule

Three tiles, always three, chosen by burst stage (owner's note):

| Burst | Tile 1 | Tile 2 | Tile 3 |
| --- | --- | --- | --- |
| **B3** | Neutral DPS rank | Ele-advantaged DPS rank | Burst gen |
| **B1 / B2** | Buffer rank | Sustain → else Burst CDR → else n/a | Burst gen |

`Λ` (1 unit, `burst: "Λ"`) has no rule yet — see §11 open decisions.

**Absence rule (ruling 2).** A tile whose board does not rank the unit is still **drawn at full size**,
greyed, reading `—` with a small `Unranked` sublabel. Never omit, never reflow. Same for the notes
panel: if `tsareena-build.json` has no entry (55% of the roster), the panel draws its heading and a
single muted line rather than collapsing. Fixed geometry is what lets the whole set be posted as a
consistent-looking series.

## 8. Bar semantics (ruling 1 — mirror the site)

Confirmed against `web/src/SupportRankings.tsx`:

| Board | Bar value | Label format | Sub-label |
| --- | --- | --- | --- |
| DPS (neutral / ele) | rel-score vs #1 (`relScore`, `core/dpsChart.ts`) | `0.00–1.00` rel | — |
| Burst gen | `gaugePerSec` | `X.XX%/s` | `X.X bars · X.X FB` |
| Buffer | `addedPct` | `+X.X%` / `−X.X%` | — |
| Sustain | `totalHp` | compact `K/M/B` | `X% of max HP` |
| Burst CDR | `cdrPer20s` | `X.Xs/20s` | ramp / conditional / self-only caveat |

**Buffer needs a zero axis** — `addedPct` is documented as negative-capable in `src/ranks/types.ts`
(`soline-frost-ticket` is the precedent). A left-anchored bar would render a negative buffer as a
positive one. This is a real correctness trap, not a polish item.

Burst-CDR rows carry three qualifier fields (`ramp`, `condition`, `selfCdr`). At card scale these
cannot all render; propose a single `*` marker on the bar with the qualifier text in the notes panel.

## 9. Rank colours

Add to `core/theme.ts` (WarcraftLogs palette, owner-corrected):

```ts
export const RANK_COLORS = [
  { max: 1,   color: '#e5cc80' }, // gold
  { max: 5,   color: '#e268a8' }, // pink
  { max: 10,  color: '#ff8000' }, // orange
  { max: 20,  color: '#a335ee' }, // purple
  { max: Infinity, color: '#0070ff' }, // blue
];
```

Caution: blue `#0070ff` sits very close to the Water element colour `#0075f8` in `ELEMENT_COLORS`. On a
Water unit's card a 21+ rank numeral and the element chip will read as the same colour. Recommend
nudging the rank blue (e.g. `#3b8cff`) or relying on the size/placement difference — flagged, not
decided.

## 10. Icons

All present in `web/public/nikke-icons/`: `code_{fire,water,wind,electric,iron}`, `burst_{1,2,3}`,
`class_{attacker,defender,support}`, `man_{elysion,missilis,tetra,pilgrim,abnormal}`,
`weapon_{ar,mg,rl,sg,smg,sr}`.

Work required:

1. **Read them from `web/public/nikke-icons/` — no vendoring needed.** `emptyOutDir` wipes `dist/`,
   NOT `web/public/`, and `build-infographics.ts` already reads `web/public/*.json` directly
   (lines ~282–312). The icons are additionally **checked into git** (30 files tracked), unlike the
   gitignored `web/public/{dpschart,…}.json` build outputs — so they are present on a clean checkout
   and need no build ordering. Load them via the existing `decodeToCanvas` path; no network fetch.
2. **Three gaps.** (a) No **burst-CDR** icon exists anywhere — needs sourcing or a text label.
   (b) No **`Λ` burst** icon (1 unit). (c) Manufacturer values include `"Tetra Overspec"`,
   `"Missilis Overspec"`, `"Elysion Overspec"` (4 units) — the icon map must strip the `" Overspec"`
   suffix to resolve, and ideally add an overspec badge rather than silently dropping the distinction.
3. Prefer the `.svg`/`.png` variants over `.webp` for `@napi-rs/canvas` decode reliability; the class
   and manufacturer icons are currently **`.webp` only** — verify decode or convert.

## 11. Nullability + the unreleased path (ruling 7)

Design contract: **every externally-sourced field is nullable and has a drawn absent-state.**

| Field | Absent-state |
| --- | --- |
| `releaseDate` | omit from title, no reflow (reserve the space) |
| Tsareena panel | heading + muted "No community build data" line |
| Any rank tile | greyed `—` + `Unranked` |
| Portrait | existing degrade path (element-tinted box + initial) — already implemented |
| Sim-optimal OL | muted line |

An unreleased character therefore renders through the *same* code path with most externals null,
plus one addition the owner's future workflow will set: a **`prerelease` flag** that swaps the notes
panel's body for the caveat block — *"Projections generated from datamined kit values via the
nikkesim.app engine; no live-game validation yet"* — while keeping the sim-optimal 12/12 OL lines
(which we *can* compute from an authored override). That flag is the only pre-release-specific
branch in the renderer; everything else falls out of nullability.

## 12. Output size — MEASURED, and it forces a format change

The centralization plan's §6.5 estimate of "192 unit cards × ~100 KB ≈ 19 MB" is **wrong by ~3×**.
Measured 2026-07-28 by rendering the real pipeline
(`npx tsx scripts/build-infographics.ts --limit 12 --out /tmp/imgtest`):

| | px | mean size | ×192 |
| --- | --- | --- | --- |
| **Today's card, PNG** | 1280×960 | **284 KB** (0.237 B/px) | **~53 MB** |
| New card, PNG (projected at same B/px) | 2400×1200 | ~680–860 KB | **~131–165 MB** |
| **New card, WebP q90** (projected) | 2400×1200 | **~87 KB** | **~17 MB** |

WebP savings are measured, not assumed — re-encoding 6 real rendered cards through `sharp`:
**PNG 270 KB → WebP q90 37 KB (−86%)**, q82 27 KB (−90%).

**⇒ Recommendation: emit unit cards as WebP q90.** It is the difference between a ~150 MB deploy
artifact (untenable, forces the QUEUE gate-5 R2 migration immediately) and **~17 MB — smaller than
the 53 MB the current PNG set already costs**. A 2× bigger, far denser card would then *reduce* the
artifact. Both Discord embeds and Twitter uploads accept WebP.

Implementation notes: `manifest.json` entries and the `Content-Type` in `src/server/api.ts` become
per-extension; the golden-image tests decode via `sharp` already, so the decoded-pixel comparison
still works. Keep PNG for the other card kinds unless separately measured — this ruling covers the
unit set, which is the only ~200-file kind.

## 13. Open decisions

1. **`Λ` burst** — which tile set? (Reads as "operates as any stage"; probably B3's, since it can fill
   the B3 slot.) 1 unit affected.
2. **Rank-blue vs Water-element colour collision** (§9).
3. ~~Output format / size~~ — **SETTLED by measurement (§12): emit unit cards as WebP q90.** Owner
   sign-off still wanted, but the evidence is in and the alternative (PNG at ~150 MB) is untenable.
4. **Burst-CDR icon** — source one, or use a text chip (§10).
5. **`/nikke` fallback** when a slug has no pre-rendered card (a unit synced after the last deploy):
   fall back to today's embed, or render on demand? The pre-render set is build-time-frozen, so this
   is a real window. Recommend: keep the current embed as the fallback path in bakery-bot.

## 14. Implementation phases

| # | Phase | Deliverable | Gate |
| --- | --- | --- | --- |
| 1 | Sync | `releaseDate` in `characters.json`; `data/tsareena-build.json` + `src/types.ts` types | `verify.sh` green; re-sync diff reviewed |
| 2 | Assets | icons vendored into `src/infographics/assets/icons/` + decode test | build-time font-gate equivalent for icons |
| 3 | Card data builder | pure `buildUnitCardData(slug)` — joins characters + 5 boards + tags + OL + Tsareena, all nullable | unit tests incl. a zero-board unit |
| 4 | Renderer | rewrite `core/unitCard.ts` to §6 layout, fixed geometry | golden-image test (existing decoded-pixel harness) |
| 5 | Pre-render | new dimensions/keys in `build-infographics.ts`, `RENDERER_VERSION` bump | full 192-card build, size measured (§12) |
| 6 | Consumers | bakery-bot `/nikke` → card URL + fallback (§13.5); `/builder` preview | bot tests |

`RENDERER_VERSION` in `src/infographics/spec.ts` **must** bump (currently `v2`) — the comment there is
explicit that stale keys otherwise serve old pixels. Unit cards are in the static manifest rather than
the spec cache, but the bump keeps the two consistent.

## 15. Verified facts (do not re-derive)

- Unit cards are **already** pre-rendered + hosted + content-addressed; the pipeline is **deployed to
  prod** (owner, 2026-07-28 — this corrects an earlier session note that called it dark).
- `src/data/sync.ts` reads bakery-bot Postgres directly; `attributes` is already in the select,
  `sheet_data` is not.
- DB coverage measured 2026-07-28: `releaseDate` 194/196, `sheet_data` 88/196.
- Board populations measured 2026-07-28: dpschart 40 units / 90 cells, burstgen 77, buffer 74,
  sustain 50, burstcdr 15.
- `bufferchart.addedPct` can be negative — bars need a zero axis.
- **Measured 2026-07-28 (real pipeline render, 12 cards):** today's unit card is **284 KB** at
  1280×960 (0.237 B/px) → the current 192-card PNG set is **~53 MB**, not the 19 MB the
  centralization plan §6.5 projected. Re-encoding real cards through `sharp`: **WebP q90 is 86%
  smaller** than PNG. Do not re-derive these; re-measure only if the renderer changes.
- `build-infographics.ts` reads `web/public/` directly and `emptyOutDir` wipes only `dist/`;
  `web/public/nikke-icons/` is **tracked in git** (30 files), so icons need no vendoring step.
