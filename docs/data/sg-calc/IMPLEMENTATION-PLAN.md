# Implementation plan — accuracy-circle geometry → engine

Wire the calibrated pixel geometry (`accuracy-circle-calibration.json`, `DERIVATION.md`) into the
sim so core-hit-rate and SG pellet-landing are **geometrically grounded** per range band, per
weapon class, from `accuracy_circle_scale` — instead of owner-chosen tables and an abstract
free-parameter reticle model.

> **Approximation discipline (read first).** These relations are principled approximations, not
> measured-truth (see the caveat in `DERIVATION.md`). Therefore:
> - They may **fill unmeasured bands** and **ground free parameters**, but must **not refit a
>   measured constant** (hard-constraint #3). Where a measured value exists (e.g. a graded
>   `CORE_BY_WEAPON_BAND` cell, a measured SG landing), measurement wins; geometry only fills gaps
>   or supplies the *shape* between measured anchors.
> - Land behind an **ENV flag, default matching current behavior**, until the board says it helps
>   (same pattern as `HRCORE`). `verify.sh` green + snapshot per step.

## What already exists (anchor points in `src/engine/sim.ts`)

- **HRCORE reticle model** (718–763): already keys off `accuracy_circle_scale`
  (`HR_CORE_CIRCLE = {AR:75, SMG:110, SG:250}`) as an *abstract unit*, with a free `HR_CORE_SAT`
  (`circle10` vs `1`) and an exponent `p_w = ln(core_base_near)/ln(SAT/reticle0)`. **Our px
  calibration replaces the abstract unit with real geometry** — this is the biggest lever.
- **`CORE_BY_WEAPON_BAND` / `coreByWeaponBand`** — the per-weapon per-band core-hit-rate table.
- **`coreHitRate` draw** (957–971): `rng() < coreHitRate·acr ? coreBonus : 0` (seeded MC) or the
  expected-value product (deterministic). `acr = acrForHR(weapon, band, hr)`.
- **SG pellet landing** (175–240): `SG_LANDING_BY_BAND` expected values + `SG_PELLET_JITTER`
  bell-curve per-shot integer draw (`sgLandedPellets`), gated by `bossPelletProfile`.

## Workstream A — geometric core-hit fraction from circle-vs-core px

Concentric core inside accuracy circle ⇒ fraction of shots on core ≈ **area ratio**:

    coreFrac_geo(weapon, range) = min(1, (core_D_px(range) / circle_D_px(weapon))²)
      circle_D_px(weapon) = 0.751 · accuracy_circle_scale[weapon] − 25.2
      core_D_px(range)    = 2100 / (range + 47)

- Gives a smooth core-hit curve vs range **per weapon** from one datamined field.
- **Owner ruling needed:** does this *replace* `CORE_BY_WEAPON_BAND`, or only supply unmeasured
  cells + the inter-band shape while measured cells stay pinned? (Recommend the latter — constraint
  #3.) Optimal-range check: at AR optimal (mid) `core_D≈circle_D` ⇒ `coreFrac_geo≈1`, matching the
  §5 cross-check.
- Land as `acrForGeo` alongside `acrFor`; ENV `ACR_GEO` default off.

## Workstream B — HR effect on core via the *shrunk* circle (grounds HRCORE `SAT`)

HRCORE already shrinks the reticle with hit rate. In px:

    circle_D_px(hr) = circle_D_px(0) · max(FLOOR, 1 − s·hr)      (s, FLOOR already in code)
    coreFrac_geo(hr) = min(1, (core_D_px(range) / circle_D_px(hr))²)
    M(hr) = coreFrac_geo(hr) / coreFrac_geo(0)                    — the HR→core multiplier

- This **derives `M` from real geometry** instead of the current `p_w`/`SAT` exponent hack. The
  `HR_CORE_SAT` free parameter (`circle10` vs `1`, currently an owner toggle) becomes a *derived*
  quantity: saturation is simply where `core_D ≥ circle_D_px(hr)`.
- Cross-check against the pre-registered HRCORE predictions (jill AR +80.78%, chisato SMG +22.37%,
  sim.ts:723–724) — must stay inside those CIs or better.
- Land as an alternate `hrCoreMult` branch under the existing `HRCORE` flag + a sub-flag.

## Workstream C — SG pellet landing from hit/miss areas

The hand-outlined **hit fraction** per band (near 79.7 → far 46.5%, `noir-sg-bands.json`) is the
geometric fraction of the spread circle on the boss body = expected fraction of pellets that land.

- Feed `hitFrac(band)` as the expected value behind `SG_LANDING_BY_BAND` (currently owner-chosen
  near/mid 0.90, midfar 0.80, far 0.70). Compare to measured `sg-pellet-landing.json` before
  changing — where a measured landing exists it wins; geometry supplies the band *shape* and
  unmeasured bosses.
- Generalize across boss silhouettes via `bossPelletProfile` (small/medium/large): the hit
  fraction is boss-size-dependent, exactly what the profiles encode. Per-boss hit% needs the boss
  silhouette → we already flagged needing real per-boss SG footage (NEXT INCREMENT “VERIFY BOSS
  PROFILES”).

## MC seed jitter (the RNG spine — everything routes here)

All three workstreams produce **expected values**; the run-to-run spread is already seeded MC:

- **Core:** `coreHitRate·acr` is the expected fraction; the seeded path already draws
  `rng() < coreHitRate·acr` per shot (957–971). Geometric `acr` just changes the mean; jitter is free.
- **SG pellets:** `sgLandedPellets` already draws a per-shot integer count around the band mean;
  swapping in geometric `hitFrac` as the mean keeps the existing bell-curve jitter.
- No new RNG primitive needed — geometry sets means, the existing `cfg.seed` MC provides variance.
  Averaging N seeds must recover the expected value (invariant already used by SG landing).

## Validation gate

1. `bash scripts/verify.sh` green; regenerate snapshot only with the change it reflects.
2. Board read (`npx tsx scripts/board-read.ts`) MAE must not regress; A/B each workstream via its ENV flag.
3. HRCORE predictions (jill/chisato) stay in-CI under workstream B.
4. Measured cells (graded core cells, measured SG landings) unchanged — assert byte-stable with flags off.

## Sequencing

1. Land the calibration constants as a small shared module (`circleDpx(scale)`, `coreDpx(range)`,
   `coreFracGeo(...)`) with unit tests reproducing the §5 cross-check.
2. Workstream A behind `ACR_GEO` (off) → A/B board.
3. Workstream B (geometry-derived `M`) behind an HRCORE sub-flag → check jill/chisato CIs.
4. Workstream C (SG landing means) vs `sg-pellet-landing.json` → A/B board.
5. Promote whichever workstreams help the board to default-on; record in DECISIONS.

## Open owner rulings

- A: geometry replaces vs fills `CORE_BY_WEAPON_BAND` (recommend fills + shape only).
- Range→band: engine currently uses discrete bands; do we move to continuous range via
  `core_D_px → range`, or keep bands and use geometry only to set per-band values? (Recommend
  keep bands for now; continuous later.)
- Whether to pin `k,c` with one hard range measurement before landing B/C.
