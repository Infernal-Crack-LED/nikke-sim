# Core-hit geometry re-derivation — resolution fix + auto-aim-offset model

> **CLOSED-BY 2026-07-19 — SUPERSEDED by the landed δ-offset cone.** The re-derivation's two confirmed
> bugs (the flat `CORE_AUTOAIM=0.55` cap + the fractional reticle floor) were fixed not by refitting the
> reticle-shrink constants but by replacing the whole path with a δ-offset ("Rician") cone
> (`offsetCoreProb`) — the geometry campaign proved the drawn reticle DECORATIVE, so the reticle-anchored
> forms here (height-refit, clamp/base-offset/fractional) are moot. See DECISIONS 2026-07-19 and
> `docs/handoffs/2026-07-19-{geometry-campaign-findings,cone-param-freeze-prereg}.md`. This doc is retained
> as the historical spec that motivated the pass; disregard its "not yet landed" plan below.

Status: **SPEC / findings — SUPERSEDED (see CLOSED-BY above).** Owner-directed 2026-07-18. Land in a focused pass
(full-board A/B + Fable + verify), NOT inline. This corrects the HR→core-hit model; blast radius is
every core-exposed comp (all SG/AR/SMG core rates), so it is a scoped workstream, not a hot edit.

## The two confirmed bugs

### 1. Mixed pixel resolution (1920×1080 formulas vs 2622×1206 measurements)
All owner measurements are at the scope-lock recording resolution **2622×1206**: the bloom-peak circles
(`accuracy-circle-calibration.json`: SG 250→162px, SMG 110→71.5px, AR 75→48px) and the band core
diameters (`noir-sg-bands.json`: near 31 / mid 28 / midfar 21 / far 17px).

But the HR→core reticle-shrink constants come straight from JP tester TricK's **1920×1080** auto formula
`reticle_dia = −1.4285x + 168.3931` (x = accuracy stat): `sim.ts` sets
`HR_RETICLE_SLOPE = 1.4285/168.3931` and `HR_RETICLE_FLOOR_FRAC = 1 − slope·100 = 0.15169`. These 1920
values are applied to the 2622 circle — a mixed-resolution / mixed-reference error.

**Smoking gun:** the calibration's own cross-check measured the AR contracted floor at **29px** against
an AR bloom-peak circle of **48px** → floor fraction **0.60**. The TricK-1920-derived `FLOOR_FRAC` is
**0.15**. A 4× disagreement — the reticle floor is being taken from the wrong reference frame.

### 2. `CORE_AUTOAIM = 0.55` is a flat multiplier → caps core at ~55%
`pelletCoreFrac = CORE_AUTOAIM · rayleighWithin(coreR, σ)` multiplies the geometric core fraction by a
constant 0.55 "auto-aim loss". As a flat factor it CAPS core at 55% for any HR, so at 98.18–98.86% HR the
model returns **~54%** — contradicting the measured anchor (below). The 0.55 was fit to the low-HR near
cells; it is the wrong FORM, not just the wrong number.

## Auto vs manual reticle (owner, 2026-07-18) — the sim models AUTO
Two reticle formulas (TricK, **1920×1080**, x = accuracy stat / hit rate):
- **Manual:** `reticle_dia = −1.3951x + 140.5412` → converges to **~1px** at x=100 (aim → a dot → ~100%
  core if centered).
- **Auto:** `reticle_dia = −1.4285x + 168.3931` → **FLOORS** at ~25.5px (12.75px radius) at x=100; it
  does NOT reach 1px.
- Relationship: auto ≈ manual with a **~20-accuracy-point penalty** (the "x−20"): `auto(x) ≈ manual(x−20)`
  in effect (the owner's estimate; slopes differ slightly, treat as approximate).

**Consequence — `100% hit rate ≠ 100% core on auto`.** Because the auto reticle floors (never a 1px dot),
the core fraction on auto is whatever the *floored* reticle geometry gives vs each band's core — it must be
**computed per band, never assumed to saturate at 100%**. The current flat `CORE_AUTOAIM=0.55` is a wrong
stand-in for this floor geometry.

## The 98.86% value is a MANUAL SANITY CHECK, NOT a derivation pin (owner 2026-07-18)
**Do not use 98.86% in the fitting math.** It only proves the MANUAL math is sane: at 98.86 accuracy the
*manual* reticle is **2.9px (2622)** — smaller than even the far core (~16–17px) — so manual trivially
cores at every band. It says nothing about auto (which floors, below), and must NOT be used to force the
auto model to 100%.

### Refit by HEIGHT (owner 2026-07-18); the auto floor is ABSOLUTE ~28.5px
Refit factor = **height ratio 1206/1080 = 1.1167×** (NOT width) — the mobile UI extends horizontally at a
fixed vertical, so px scale with the vertical resolution. Applying it to the TricK formulas:
- **AUTO reticle (2622):** `reticle = max(AUTO_FLOOR, −1.5952·x + 188.04)`
- **MANUAL reticle (2622):** `reticle = max(~1px, −1.5579·x + 156.94)` (→ ~1px near x=100; auto is ~x−20 behind)
- **AUTO_FLOOR ≈ 28.5px** = height-refit of TricK's auto plateau (25.5px @1920 = "12.5px radius"). Auto-aim
  never converges past this precision limit, so it is an **ABSOLUTE px floor, weapon-INDEPENDENT** — cross-
  validated by the calibration's independently measured **AR contracted floor of 29px** (28.5 ≈ 29). ✔

**Two bugs, now exact:**
1. `CORE_AUTOAIM = 0.55` flat-caps ALL core rates at 55% — DELETE it (pure center-weighted cone geometry).
2. `FLOOR_FRAC = 0.15169` is wrong in FORM: a per-weapon FRACTION of each circle, so it floors AR at
   48·0.152 = **7.3px** vs the real **~29px**. The auto floor is an ABSOLUTE ~28.5px, not a fraction.

**Auto SATURATES below 100% (the "≠100% on auto" / x−20 behavior).** Reticle at the 28.5px floor, center-
weighted cone, no CORE_AUTOAIM: **near 98% / mid 95% / midfar 82% / far 68%** — auto never fully cores at
range. Correct, and the opposite of a forced-100% anchor.
Base cells (hr=0, reticle=162px SG): near 11/mid 9/midfar 5/far 3% — vs measured near 6%; the base
over-shoot is at LOW hr (big reticle), unrelated to the floor — still the floor-only-vs-δ open item.

## Corrected model — center-weighted cone driven by the AUTO reticle (with floor)

Replace the flat `CORE_AUTOAIM` with the geometry of the **measured auto reticle**: core fraction =
center-weighted (owner-chosen) cone read at the core radius, where the cone's spread σ comes from the
**auto reticle formula (refit to 2622), including its floor**. The auto reticle floor IS the auto-aim
imperfection — the reason auto never fully cores — so it likely OBVIATES both the flat 0.55 AND a separate
centering term. Preferred (fewest free params):

  `core_rate(band, hr) = coneCore( coreR(band), σ(hr) )`,  `σ(hr) = auto_reticle_2622(hr) / 2 / K_SIGMA`

- **Low HR (reticle large ~162px):** big σ → low core; a centered cone gives SG near ~11% vs measured 6%
  (over-shoot). This LOW-hr gap is the open floor-only-vs-δ / K_SIGMA / hitRate-mapping item.
- **High HR (reticle → the ABSOLUTE ~28.5px auto floor):** core SATURATES per band — near ~98 / mid ~95 /
  midfar ~82 / far ~68% — NOT 100%. Auto never fully cores at range; only manual (→~1px) reaches 100%.
- **Optional centering offset δ** — if the floor + cone alone can't match the LOW-hr base cells, add a
  small δ (cone centered δ off core center, Rician). Pass decides floor-only vs floor+δ by the base-cell fit.
- `CORE_AUTOAIM` (the flat 0.55 cap) is GONE. The auto imperfection is the **absolute reticle floor**
  (~28.5px), not a hardcoded multiplier and not a per-weapon fraction.

### One cone for pellets AND single bullets (owner-confirmed 2026-07-18)
The center-weighted Gaussian cone (σ from the reticle, floored at the absolute 28.5px) applies to BOTH
a shotgun's pellets and a single bullet, INSIDE the same max bloom — a single bullet is **1 draw** from
the cone, a shotgun is **N (~10) draws**. Per-shot/per-pellet core-hit probability is the identical
`cone(coreR, σ)` for both (already how `acrForHR` routes; we only delete `CORE_AUTOAIM` + fix the floor).
- The **consolidation bullet (dorothy-S) is just a single-bullet draw** from this cone at its window HR —
  NO special core model, NO hardcoded `coreRate 0.9`.
- Only **AR/SMG/SG** have an accuracy circle (`ACCURACY_CIRCLE_SCALE`); **MG/SR/RL have no bloom model**,
  so the cone does not touch their core (they keep the base table).

### Pixel flow (all 2622×1206)
1. `accuracy_circle_scale → circle_dia(0) px` via `0.648·scale` (bloom peak, hr=0): SG 162, SMG 71.5, AR 48.
   (SMG 71.5 ⇒ owner note "probably 70 or 72" — resolve in the pass.)
2. HR shrink: `reticle(x) = max(AUTO_FLOOR≈28.5px, −1.5952·x + 188.04)` (height-refit auto formula,
   x = x_base + hitRatePct). ABSOLUTE floor, NOT a per-weapon fraction; NOT pinned to 98.86%. ⚑ open:
   whether the shrink is linear in hitRatePct and whether `1 hitRatePct pt = 1 accuracy-stat pt`
   (currently assumed; R8 unvalidated).
3. `core_dia(band)` from range via `2100/(range+47)`; **RE-DERIVE with ±1px core fuzzing** (odd pixels
   are suspect for a circle): near 31→32, mid 28, midfar 21→20/22, far 17→16/18. Pick the integer-clean
   set that best fits the range bounds; the fit is insensitive (`s` moves 0.099–0.111 across the fuzz).
4. `core_rate(band, hr) = P_offsetGaussian(coreR(band), σ(hr), δ)`, σ = reticle(hr)/2/K_SIGMA (K_SIGMA=2.53).

### Preliminary numbers (bracketing; exact δ-model fit in the pass)
- Centered Gaussian, pinned reticle(98.86)=13.2px (floorFrac 0.082, s 0.00929/pt): hr=0 near **11%**,
  mid 9, midfar 5, far 3; hr=40 near 26; hr=98.86 **100% all bands**. (Over-shoots base cells — needs δ.)
- Uniform disc (for contrast): hr=0 near 4%; far reaches 100% only at reticle=far-core. (Under-shoots base.)
- **Target (offset-Gaussian):** δ pins hr=0 near to the measured ~6%, curve rises to 100% at 98.86%.

## Open items to resolve in the focused pass
1. ✅ **Refit factor DECIDED — height 1.1167×** → AUTO 2622 `max(28.5, −1.5952x+188.04)`, MANUAL
   `−1.5579x+156.94`, SG x_base≈16.3. **Delete `CORE_AUTOAIM` (flat 55% cap) AND replace `FLOOR_FRAC`
   (per-weapon fraction) with the ABSOLUTE ~28.5px auto floor** (cross-checked by the measured 29px AR
   floor). Remaining: confirm x_base per weapon (back-derive from AR 48px / SMG 71.5px circles) and confirm
   the auto slope/intercept transfer off SG to AR/SMG (TricK measured SG; ⚑). Auto saturates <100% at range.
2. **Decide floor-only vs floor+δ:** test whether the honest 2622 auto reticle floor ALONE reproduces the
   measured base cells (AR 0.40 / SMG 0.25 / SG 0.06 near). If yes, no centering term (fewest params). If the
   base cells still come out too high, add the auto-aim centering offset δ (< far-core radius ≈8.5px).
3. Confirm the hitRatePct↔accuracy-stat mapping (does +N hitRatePct = +N of TricK's x?) + shrink form
   (the auto formula is linear in x; validate that transfer or flag ⚑ and bound the error).
4. Re-fit `core_dia_vs_range` (k,c) with ±1px core fuzzing; lock the integer-clean core set.
5. **Full-board A/B**: this re-touches the measured base cells, so re-validate EVERY core-exposed comp
   (not just HR-active ones: jill/chisato/quency/dorothy). Report per-unit deltas; faithful>fit.
6. Fable pre-registration + `verify.sh` green + snapshot only the cells that move, with understanding.

## Interactions
- **Dorothy consolidation change (this session, `CONSOL_GEO`, landed-in-working-tree)** — it uses
  `coreFracGeo` at live HR for the aligned bullet. FOLD INTO this re-derivation: switch it to the same
  center-weighted offset-cone, and re-pin once `s`/`FLOOR`/δ are set. Do not finalize/snapshot it
  independently.
- **DECISIONS 2026-07-18 (geometry is ground truth)** stands — this re-derivation is that ruling applied:
  it removes a 1920-contaminated constant + a flat fudge (0.55) in favor of the measured 2622 geometry +
  the measured 98.86% anchor. Add a scope note there once landed.
