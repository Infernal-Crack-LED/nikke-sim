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

**Second round (2026-07-28):**

9. **WebP approved** (§12).
10. **Red Hood (slug `red-hood` — SR/Iron Attacker, the only `Λ` unit) is treated as B3** for tile/bar
    selection. ⚠ **NOT `rapi-red-hood`** (Rapi: Red Hood, MG/Fire), which is a different unit and is
    already `burst: "III"` — verified against `data/characters.json` 2026-07-28. This retires open
    decision 1.
11. **Burst CDR needs no icon** — render as text (`20s`, `40s`, …).
12. **Rank colours apply to the rank NUMERAL ONLY**, in the top-right rankings tiles. **Bars keep the
    nikkesim.app colours** — which are **element-coloured** (`ELEMENT_COLORS[element] ?? '#9aa3b2'`,
    `web/src/components/RankBarChart.tsx:79` and `DpsBarChart.tsx:101`). `core/theme.ts` already
    exports the identical `ELEMENT_COLORS` map, so the renderer needs no new palette for bars.
    ⇒ This **retires open decision 2** (the rank-blue vs Water-element collision): the two colour
    systems now live on different elements of the card and never touch.
13. **Bar charts are a closed set** (fewer than §7's tiles):
    - **B3** → neutral DPS, advantaged DPS.
    - **B1/B2** → buffer, then sustain if present, else burst CDR if present, else **no second bar
      chart set at all**.
    - Burst gen is a **tile only** — it has no bar chart.
    - Fallbacks are explicitly **second-class**: units outside these categories are, per the owner,
      "usually aren't characters people care about". Design first-class for units that fit.
14. **Comp profiles (§8a)** — bar charts render the **profiled** variant in place; the **default
    (no-profile)** bar is appended *below the last nearby-unit row*. Rank tiles show **both** ranks;
    the recommended dual-rank treatment (large profiled numeral + muted `#N default` sub-line) is
    **approved**.
15. **Two card variants** — `discord` (2:1 landscape) and `twitter` (portrait), from one data builder.
    Explicitly *"I don't want it to degrade the card as a whole"*: the landscape card is NOT to be
    compromised to survive X's crop. See §6/§6a.

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

## 6. Card layout — TWO VARIANTS (ruling 15)

The owner's ruling: **do not compromise the card to survive X's timeline crop.** Ship two variants
from one data builder:

| Variant | Aspect | Logical | @dpr2 | Target |
| --- | --- | --- | --- | --- |
| `discord` | 2:1 landscape | 1200 × 600 | 2400 × 1200 | `/nikke` embed, the site, general sharing |
| `twitter` | portrait (see §6a) | 1200 × 1500 *(provisional 4:5)* | 2400 × 3000 | X timeline, new-character launch posts |

Same `buildUnitCardData(slug)` (§14 phase 3) feeds both; only the layout function differs. The
landscape variant is the canonical one and is specified in §6b.

### 6a. ✅ RESOLVED BY MEASUREMENT — 4:5 renders UNCROPPED in the X timeline

**Measured 2026-07-28.** The owner posted the `scripts/x-crop-test.ts` marker image (1200×1500, 4:5)
as a single-image post and screenshotted the timeline render (X iOS app, dark mode). Result:

> **Both RED bands visible, full 0–100% ruler visible — the image is displayed in full. The only
> alteration is rounded corners.**

**Confirmed a second, independent way (prove-it-differently).** The content read above ("which colour
bands survived") and this one share no derivation: measuring the **displayed frame's aspect ratio** off
the same screenshot gives ≈970 px wide × ≈1215 px tall = **1.253**, matching the source 4:5 = **1.250**.
Had X cropped, the displayed frame would have been 0.563 (16:9) or 1.000 (square) — neither is close.
Geometry and content agree, so the finding is not resting on one method.

This **refutes** the "center-cropped to ~16:9" claim from
[viraly.io](https://viraly.io/blog/twitter-x-image-size-guide) /
[Image for Post](https://imageforpost.com/guides/twitter-x-image-sizes-dimensions-guide-2025), and
**confirms** the generous-safe-zone claim from [SocialKit](https://socialk.it/en/sizes/x-post-size) /
[aspectratiocalculator](https://aspectratiocalculator.com/twitter-aspect-ratios/). It was worth
measuring: the two readings implied completely different layouts.

**Consequences:**

1. **The middle-45% safe-band rule is RETIRED.** It was insurance against a behaviour that does not
   occur. The portrait variant uses its **full height**; name, portrait and rank tiles need no
   vertical confinement.
2. **NEW constraint — X rounds the image corners.** Measured off the screenshot at roughly **2–2.5%
   of image width** (≈24–30 px at 1200 px wide). Keep text, the logo and the watermark out of the
   corner arcs. The existing card padding (`PAD = 36` at 640 px wide, scaling to ~48–64 px at 1200 px)
   already clears this comfortably — it is a check to honour, not a redesign.
3. Portrait is now unambiguously the better X format: full height shown, ~2× the timeline real estate
   of the 2:1 landscape card at the same width.

**Residuals (low risk, do not block):** the test covered the **iOS app** only — desktop web is
unverified, though it is historically no more aggressive than mobile. And **3:4 (1.333) may also be
uncropped** — one cited source puts the boundary there, which would buy ~6.7% more height than 4:5.
Re-runnable with the same script if that height is ever wanted.

### 6b. Landscape (`discord`) layout

Logical **1200 × 600** (2:1), rendered at `dpr 2` → **2400 × 1200**. 2:1 is the widest ratio X
displays uncropped under *either* source above, so this variant is also the safe fallback for X if
the portrait test comes back badly.

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
| **B3** (incl. `red-hood`, ruling 10) | Neutral DPS rank | Ele-advantaged DPS rank | Burst gen |
| **B1 / B2** | Buffer rank | Sustain → else Burst CDR → else n/a | Burst gen |

**Bar charts are a strict subset of the tiles** (ruling 13) — burst gen is a tile with no bar chart:

| Burst | Bar chart set |
| --- | --- |
| **B3** | neutral DPS, advantaged DPS |
| **B1 / B2** | buffer; then sustain if present, else burst CDR if present, else **omit the second set** |

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

**Bar fill colour is the unit's ELEMENT colour** (ruling 12), not a rank colour —
`ELEMENT_COLORS[element] ?? '#9aa3b2'`, already exported by `core/theme.ts` with hexes identical to
the web components. Rank colours (§9) are for the tile numerals only.

**Buffer needs a zero axis** — `addedPct` is negative-capable (`src/ranks/types.ts`;
`soline-frost-ticket` is the precedent). The site already solves this and the card must mirror the
same geometry rather than reinvent it (`RankBarChart.tsx:80-87`): when `min < 0`, a bar spans
`value ↔ 0` on either side of the axis (`leftPct` from `min`, width `|value|/span`); when all values
are positive it fills `0 → value` from the left.

**Sustain bars are 3-segment split** (heal / shield / lifesteal) — the site renders `background:
transparent` on the fill and draws the three segments inside it. Mirror this; a single-colour sustain
bar loses the composition that makes the board useful.

Burst-CDR rows carry three qualifier fields (`ramp`, `condition`, `selfCdr`). The site's convention is
a `*` marker after the name with the detail in the tooltip (`ranks-cond`); the card should reuse `*`
and put the qualifier text in the notes panel, since a card has no hover.

### 8a. Comp profiles (ruling 14)

A profiled unit appears **twice** in an artifact's `entries`: one row carrying `profile: <id>` and one
with `profile: null`. **Only three boards have profiles**, and only six unit/board pairs exist today
(verified against the live artifacts 2026-07-28):

| Board | Profiled units | Surface on the card |
| --- | --- | --- |
| `bufferchart` | `crown` (`with-healer`), `naga` (`with-shielder`) | bar chart **+** tile |
| `sustain` | `prika` (`with-mint`), `anchor-innocent-maid` (`with-mast-rm`) | bar chart **+** tile |
| ↳ ⚠ profile-partner slugs | `with-mast-rm` = **`mast-romantic-maid`** (Mast: Romantic Maid, MG/Water) — **NOT `mast`** (SMG/Electric). The sustain artifact's own note says "mast" bare; do not resolve it by base name. | |
| `burstgen` | `little-mermaid` (`with-2mg`), `cinderella-crystal-wave` (`with-1mg`) | **tile only** (no bar chart) |
| `burstcdr` | none — `profiles: {}` | — |
| `dpschart` | **no profile concept at all** (no `profiles` key) | — |

⇒ The profile rules therefore touch the **B1/B2 bar charts only**, plus the burst-gen tile. **The B3
card (neutral/advantaged DPS bars) can never show a profile** — worth stating, since it means the
headline DPS cards need none of this machinery.

**Bar chart:** render the **profiled** row in its ranked position among the neighbours, then append the
**default (no-profile)** row as an extra bar *below the last nearby-unit row*, visually separated and
labelled (e.g. `default` / no chip). It is out of rank order by construction — that is intended.

**Tile:** show both ranks. The §3 legibility constraint (one number readable at 45% scale) argues
against `#3 w/ Healer (#7 default)` on one line — two numerals of equal weight compete and neither
reads. **Recommended:** keep the **profiled rank as the single large numeral** (it is the headline
number, coloured per §9), put the profile chip (`w/ Healer`, from `PROFILE_LABELS` in
`SupportRankings.tsx:56`) under the tile title, and render the default rank as a small muted sub-line
`#7 default`. Reuse `PROFILE_LABELS` rather than re-deriving the chip text.

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

**Scope: the rank NUMERAL in the top-right tiles only** (ruling 12). Bars are element-coloured (§8);
no other element of the card uses this palette. The earlier concern about rank-blue `#0070ff`
colliding with Water `#0075f8` is therefore **retired** — the two palettes never appear on the same
element. (They can still co-occur on one card — a Water unit's 21+ tile numeral beside its element
chip — but at different sizes and positions, which the site already lives with.)

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
2. **Gaps.** (a) **Burst CDR — no icon, by ruling 11: render as text** (`20s`, `40s`, …). Resolved.
   (b) No **`Λ` burst** icon for `red-hood`. Ruling 10 makes it *behave* as B3 for tile/bar selection,
   but its title-bar icon must still read `Λ` — drawing `burst_3.svg` there would misstate the unit.
   Needs a `Λ` glyph or a text chip. **Still open.**
   (c) Manufacturer values include `"Tetra Overspec"`,
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

**Two variants (ruling 15) double the file count to 384.** Projecting from the measured WebP rate
(37 KB ÷ 1.2288 Mpx = **~30 KB/Mpx**):

| Variant | Physical px | Mpx | projected WebP | ×192 |
| --- | --- | --- | --- | --- |
| `discord` | 2400 × 1200 | 2.88 | ~87 KB | ~16 MB |
| `twitter` | 1200 × 1500 | 1.80 | ~54 KB | ~10 MB |
| **both** | | | **~141 KB/unit** | **~27 MB** |

Note the portrait variant is deliberately **not** rendered at `dpr 2` of its logical size — X displays
it at ~500–600 px wide in-timeline, so 1200×1500 physical is already ~2× the display width and
matches the commonly-cited 1080×1350 target. Rendering it at 2400×3000 would cost ~222 KB each
(~43 MB) for pixels nothing consumes.

Both figures are **projections from a measured rate**, not measurements — the new cards are denser
than the one measured, so **re-measure at phase 5** before treating ~28 MB as settled. Even at 2×
the projection it stays under today's 53 MB PNG set.

## 13. Open decisions

0. ~~X in-timeline crop behaviour~~ — **RESOLVED BY MEASUREMENT 2026-07-28 (§6a): 4:5 renders
   UNCROPPED.** Safe-band rule retired; phase 4b unblocked. Residual: honour the rounded corners
   (~2–2.5% of width).
1. ~~`Λ` tile set~~ — **SETTLED (ruling 10): `red-hood` uses the B3 set.** Residual: its title-bar
   `Λ` *icon* still has no asset (§10.2b).
2. ~~Rank-blue vs Water collision~~ — **RETIRED by ruling 12** (§9): rank colours are numeral-only.
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
| ~~3.5~~ | ~~X crop test~~ | ✅ **DONE 2026-07-28** — 4:5 uncropped (§6a) | — |
| 4a | Renderer (landscape) | rewrite `core/unitCard.ts` to the §6b layout, fixed geometry | golden-image test (existing decoded-pixel harness) |
| 4b | Renderer (portrait) | `twitter` layout sharing phase-3 data, **full height**, corner-safe | golden-image test |
| 5 | Pre-render | both variants in `build-infographics.ts`, `RENDERER_VERSION` bump | full 384-image build, size **measured** (§12) |
| 6 | Consumers | bakery-bot `/nikke` → landscape URL + fallback (§13.5); `/builder` preview | bot tests |

**Variant plumbing.** Manifest keys go from `unit/<slug>` to `unit/<slug>.<variant>` (paths
`unit/<slug>.<variant>.<hash>.webp`). With the crop question settled, **no phase is blocked** — 4a and
4b can proceed in either order or in parallel. Build 4a first regardless: it is the variant `/nikke`
consumes, and the landscape layout is the harder geometry problem (more content per unit height).

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
- **`Λ` burst is `red-hood`** (Red Hood, SR/Iron, Attacker) — exactly 1 unit. `rapi-red-hood`
  (Rapi: Red Hood, MG/Fire) is a DIFFERENT unit and is already `burst: "III"`. Verified against
  `data/characters.json` 2026-07-28; do not conflate.
- **Profiles exist on 3 boards only** (`bufferchart`, `sustain`, `burstgen` — 6 unit/board pairs).
  `burstcdr.profiles` is `{}` and `dpschart` has **no profile concept at all**, so the B3 DPS bars can
  never carry one. A profiled unit occupies TWO rows in `entries` (one `profile: <id>`, one `null`).
- **MEASURED 2026-07-28 — a 4:5 (1200×1500) single image renders UNCROPPED in the X timeline**
  (iOS app). Confirmed two independent ways off one screenshot: surviving colour bands (both extreme
  RED bands present) AND displayed frame aspect ratio (1.253 vs source 1.250; a 16:9 crop would read
  0.563, square 1.000). The only alteration is **rounded corners at ~2–2.5% of image width**. This
  REFUTES the widely-repeated "portrait is centre-cropped to 16:9" claim — do not reinstate the
  middle-45% safe-band rule on the strength of a blog post. Re-run `scripts/x-crop-test.ts` if X
  changes its timeline layout.
- Site bar colours are **element colours**, not rank colours (`RankBarChart.tsx:79`,
  `DpsBarChart.tsx:101`); negative-capable boards span `value ↔ 0` about an axis
  (`RankBarChart.tsx:80-87`); sustain fills are 3-segment splits with a transparent track.
