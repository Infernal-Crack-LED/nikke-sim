# Proposal — range-dependent auto-core model

AI-facing design proposal (2026-07-15), for owner review. Supersedes the "flat per-weapon
`AUTO_CORE_RATE`" as the target model. Grounded in the discrimination result + the research already
logged in `docs/open-questions.md` (the auto-core-rate section). Implement after the three AR/SMG/SG
solo recordings land.

## Problem

The engine models auto-aim core-hit rate as a flat per-weapon-class constant (`acrFor`, sim.ts ~501):
AR/SMG/SG = 0.85, MG/SR/RL = 0.95. This is **range-blind**, and that blindness is now the single
biggest systematic error on the board:

- Per-weapon mean ratio across all comp-rows: **0.85 group runs HOT** (AR 1.096 / SMG 1.069 /
  SG 1.106); **0.95 group is unbiased** (MG 0.955 / SR 0.987 / RL 1.020).
- Discrimination (2026-07-15): the hotness has TWO causes. Neutering AR/SMG/SG range eligibility
  drops **SG 1.106→1.024** (range-driven) but barely moves **AR 1.096→1.080 / SMG 1.069→1.058**
  (core-driven). So SG's excess is its near-band `+30%` compounding with a too-generous flat core
  rate; AR/SMG's excess is the flat core rate over-counting off-optimal range.
- A flat refit is WRONG: `CORERATELO=0.65` nulls the board only by coincidence (it offsets SG's
  separate range term) and contradicts the footage that measured AR/SMG ≈ 0.85 **at optimal range**.

## What the evidence already says (open-questions, auto-core-rate section)

- **SG core is range-band dominated** (ore-game verify-memo): **~100% front row / ~1.6% mid / ~0% back.**
  A flat 0.85 is badly wrong for SG in both directions.
- **MG cores ~100% once warmed (≥3.75s) at any range** (the wind-up ramp already models the warm-up).
  SR/RL near-guaranteed. → the 0.95 group is genuinely near-flat-high; leave it.
- **AR ~0.7-0.9, SMG ~0.7-0.85** (per-weapon footage scan) — the 0.85 is the *optimal-range* end;
  off-optimal they fall.
- Auto reticle floor ~12.5px, 18-20% accuracy loss (JP _TricK_). KR curve: core-hit rises steeply
  with the accuracy stat. → a **geometric** basis exists: core-hit ≈ P(shot lands within the core's
  projected radius | reticle scatter), and the core's projected radius shrinks with distance.

## Model — two options

### Option 1 (RECOMMENDED first step): per-(weapon, band) core-rate table

Replace the flat `acrFor(weapon)` with `acrFor(weapon, band)`, indexing the core rate by the range
band the engine ALREADY computes (`bandAt(frame)` → near|mid|midfar|far). One table:

```
CORE_BY_WEAPON_BAND[weapon][band] : number   // 0..1
```

- **MG/SR/RL**: ~0.95-1.0 in every band (near-flat; MG gated by its existing warm-up). Unchanged in
  practice — leave their rows ≈ current 0.95 (refine later from their existing footage if wanted).
- **SG**: seed from research → near ≈ 1.0, mid ≈ 0.02-0.15, midfar/far ≈ 0.0. The Drake recording
  measures the exact per-band values on THIS boss.
- **AR/SMG**: near/mid ≈ 0.85 (optimal), falling toward far. The Scarlet (AR) + Chisato (SMG)
  recordings measure the per-band fall-off.

Pros: directly measurable from the recordings (bin popups by band → per-band core fraction); minimal
engine change (the band is already in scope at the `acr` call site, sim.ts ~679); each cell is an
OBSERVED value, not a fit. Cons: per-boss (the bands are this boss's distance timeline); a new boss
needs its own band timeline (already true for `RANGE_ELIGIBLE`).

### Option 2 (longer-term, elegant): geometric reticle-vs-core

`coreRate(weapon, dist) = saturating_fn( coreAngularRadius(dist) / reticleScatter(weapon) )`, where
`coreAngularRadius ∝ corePhysicalRadius / dist` (farther boss → smaller on-screen core) and
`reticleScatter(weapon)` is the auto-aim floor per weapon (AR/SMG scatter > MG/SR). E.g.
`coreRate = clamp(0,1, (coreAngularRadius / (k·reticleScatter))^2)` (area ratio), MG floored high
after warm-up.

Pros: 2-3 params per weapon instead of a per-band table; generalizes to ANY boss/distance without a
new table; matches the physical mechanism (the KR accuracy curve is this). Cons: needs the core's
physical size + per-weapon scatter calibrated — the recordings give (band→rate) points to FIT these,
so Option 2 is the natural SECOND pass once Option 1's per-band points exist.

**Recommendation:** ship Option 1 from the recordings (fast, observed, nulls the systematic bias
faithfully), then fit Option 2's geometric params to the same per-band points for boss-generality.

## Calibration protocol (the three solo recordings)

For each of the AR/SMG/SG solo recordings (unit alone, scope-lock, full 180s):
1. Extract the unit's NORMAL-attack popups across the whole fight (crosshair region).
2. For each popup, read core (red "CORE HIT") vs non-core (white), per the colour convention. Procs/
   riders do NOT core — exclude them (only weapon normals).
3. Bin each popup by the range band at its timestamp (`bandAt` from the measured boss-range script).
4. Per band: coreRate = red-core count / total normal count → fills `CORE_BY_WEAPON_BAND[weapon][band]`.
5. SG fires pellets (multiple per shot) — count per-pellet core fraction; note whether the whole
   shot-group cores together or splits (informs Option 2's per-pellet geometry).

`scripts/probe/classify.py` already counts red "CORE HIT" popups; extend it to bin by band using the
range script. Persist per-recording results to `docs/probe-data/` (the `parsed.ts` pattern) with the
testing-params↔video map.

## Implementation sketch

- sim.ts: `acrFor(weapon)` → `acrFor(weapon, band)`; the call site (~679) already has `bandAt(frame)`.
  Keep `ENV.ACR` (flat override) and add `ENV.CORERATEBAND=off` to fall back to the current flat
  table for A/B. `CORERATELO`/`CORERATEHI` become the near/optimal-band seeds during migration.
- MG interaction: keep the warm-up gate (`mgRampRound`) — MG core stays ~0 until warmed, then ~1.0
  in-band; don't double-penalize.
- Validation: after landing, confirm (a) the 0.85-group systematic bias nulls **without** the
  coincidental range offset (SG via its own band rates, AR/SMG via theirs), (b) MG/SR/RL rows are
  unchanged, (c) board MAE drops and within-±10% rises, (d) no measured-truth/FB assert changes.
  Regenerate the regression snapshot with the change. This is a ⚑ refit — same-tier (footage)
  evidence overturns the flat ⚑; log in DECISIONS + open-questions.

## Status

Blocked on the three recordings (owner to make them). `CORERATELO` knob already added (behavior-
neutral default 0.85) for A/B. Do NOT flat-refit in the meantime — it would be fitting-to-data.
