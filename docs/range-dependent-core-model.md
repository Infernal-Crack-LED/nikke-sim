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

- **SG core is range-band dominated** (ore-game verify-memo): **~6% front row / ~1.6% mid / ~0% back**
  (auto mode, base accuracy). [CORRECTED 2026-07-15 by s1 research — this line previously read
  "~100% front row", a transcription error off by >1 order of magnitude; the real front-row value is
  ~6%, which CORROBORATES our measured SG near 0.072. See `docs/probe-data/sg-core-research.md`.]
  A flat 0.85 is badly wrong for SG — but the correct near value is ~6–8%, NOT ~100%.
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

Option 1 (per-band table) **LANDED 2026-07-15** (see DECISIONS + open-questions A15 + the audit
handoff). This section now tracks **Option 2 (geometric)** as follow-up #3.

## s1 (SG research) RESULT — 2026-07-15: geometric model DISFAVORED, band-table validated

s1's online research (`docs/probe-data/sg-core-research.md`) resolves the gate and REDIRECTS #3:
- **SG near 0.072 is CORRECT, not a lower bound** — ore-game verify-memo measures SG front-row core
  ~6% (auto, base accuracy), converging with our 7.2%. Do NOT raise it.
- **The mechanism is a SHARP near-only STEP** (6%→1.6%→0% across front/mid/back, tied to the 0–25
  effective-range window), **NOT a continuous distance curve.** Sources explicitly do not describe a
  gentle falloff. ⟹ the **per-band table (Option 1, landed) is already the right shape**; the geometric
  continuous-distance model (Option 2 / #3) is **not indicated** on current evidence.
- The AR>SMG>SG order-of-magnitude gap (0.40 vs 0.072 near) is a real structural property (10-pellet
  spread + 12.5px auto reticle floor), consistent with community understanding — not a measurement artifact.
- **Cold-SG (0.755) is NOT the core rate** — a separate under-model (near-range pellet-body-hit crediting
  / band-time allocation), routed to s4's exposed-under-model audit.

**SHELVED (owner ruling 2026-07-15):** Option 2 / #3 is not built. The landed per-band table is the model.
Revive a geometric form ONLY if a future multi-boss dataset shows the per-band table failing to transport
(the one thing geometry would buy). The prep below is retained for that contingency.

## Option 2 execution prep (2026-07-15) — retained if geometric is ever revived

Consolidated measured per-band core points (Option 2 must reproduce these):

| weapon | near | mid | midfar | far | source |
|---|---|---|---|---|---|
| AR (Scarlet) | 0.40 | 0.30 | 0.03 | 0.00 | coreband-scarlet-ar (+nearReread 0.34) |
| AR (Moran) | 0.40 | 0.16 | 0.14 | 0.05 | coreband2-moran-ar (near CONFIRMED, 2 methods) |
| SMG (Chisato) | 0.28 | 0.244 | 0.076 | 0.059 | coreband2-chisato-smg |
| SG (Drake) | 0.072* | 0.00 | 0.0045 | 0.00 | coreband2-drake-sg (*near = LOWER BOUND) |

Boss distance is **ORDINAL only** — the recordings establish `near < mid ≈ midfar < far` (apparent
boss size), with NO metric distances. This is the central obstacle for the geometric form
`coreRate = clamp(0,1,(coreAngularRadius/(k·scatter))^2)`, `coreAngularRadius ∝ 1/dist`:

- **Distance proxy needed.** Candidate: extract the boss's apparent on-screen SIZE (pixels) per band
  from the existing recordings (larger ⇒ closer ⇒ dist ∝ 1/√area); gives a *relative* distance scale
  per band. Alternative: treat band as an ordinal index and fit a monotone saturating curve per weapon
  (fewer physical claims, but loses cross-boss generality — Option 2's whole point).
- **Per-weapon scatter is the fit target** — one `scatter(weapon)` param (AR small, SMG mid, SG large,
  matching AR>SMG>SG) + a shared core-physical-radius. The three weapons' band curves should collapse
  onto one geometry once scaled by their scatter.
- **Why gated on s1:** SG's near value is a lower bound; its true point-blank rate sets the SG scatter
  and anchors the whole geometry's low end. Fitting before s1 would bake in the under-measured SG point.
  Also fold in s2's Moran AR near (firms the AR anchor).

Fit procedure once s1 (+ ideally s2) land: (1) assign a distance proxy per band; (2) fit
`scatter(weapon)` + `coreRadius` to all measured (weapon, band, rate) points (weighted by Wilson CI);
(3) A/B the geometric `acrFor` vs the landed per-band table on the board — geometric must not degrade
the confirmed movers; (4) Fable post-op panel before landing. Keep the per-band table as the fallback
(`CORERATEBAND=table`) if geometric doesn't clearly win.

Knobs live: `ACR` (flat override), `CORERATE=flat` (old 0.85), `CORERATEBAND=off` (prior flat
per-weapon), `CORERATEHI/LO`. Do NOT flat-refit — it would be fitting-to-data.
