# Spec — center-weighted pellet-landing model (SG landing + unified core-hit)

> **Status:** IMPLEMENTED and **LIVE by default** (`ENV.PELLET_GAUSS`; `=0`/`off` reverts to the prior
> measured tables for A/B), owner-enabled 2026-07-17 to run as the live model and re-evaluate the
> band-shape overshoot later. **Snapshot regen PENDING a clean tree** (see the A/B note below). Helpers +
> constants in `sg-geometry.ts` (`rayleighWithin`, `pelletSigma`, `pelletLandFrac`, `pelletCoreFrac`,
> `K_SIGMA`, `CORE_AUTOAIM`); wired into `sim.ts` core-hit (`acrForHR`) + SG landing (`firePull`);
> unit tests in `sg-geometry-regression.ts` (reproduce the §3 table). Supersedes the flat area-fraction
> Workstream C (`SGLANDING=geo`). Grounded in the `noir sg.MP4` frame study + KR/JP spread research.
>
> **BOARD A/B (2026-07-17, `PELLET_GAUSS=1`):** in ISOLATION the model reproduces the measured cells
> (unit tests pass: AR core 0.400, SG landing MAE 0.044). On the board it runs SG **hotter** — noir
> 1.048→1.114, dorothy-serendipity 1.018→1.115, naga 0.986→1.071, soda-twinkling-bunny 0.975→1.017
> (marginal help), arcana-fortune-mate 1.066→1.126. Core path: jill 0.972→1.002 (better), but grave
> 1.19→1.24 and quency-escape-queen 1.040→1.148 hotter. **Not a promote-yet:** the band SHAPE
> overshoots near (0.922 vs recon 0.888) and undershoots mid (0.897 vs 0.986), so near-weighted fights
> run hot. Needs (a) σ band-shape refinement and (b) a clean baseline (the current board carries a
> concurrent-edit contamination that moved noir off its ~1.006 calibration point). Arm stays default-off.

## 1. Why (the measurement that forces this)

The flat area-ratio landing (`BAND_SG_HIT_FRAC` = boss-body area ÷ 162px spread disc, uniform
density) undershoots the measured recon landing (near .797 vs .888, mid .71 vs .986). A frame-by-frame
study of `noir sg.MP4` (6 band-agents over ~80 firing frames + a mid-band CV heatmap) established:

- Pellets spread **~0.7–0.9× the 162px spread disc** — far wider than the 66px crosshair (so "pellets
  land in a tight inner circle" is **refuted**), but not a uniform disc fill either.
- The impact density is **center-weighted (≈Gaussian), not uniform** — unanimous across all 6 bands:
  a dense core at the reticle tapering to 1–2 outliers near the disc edge.
- The **range dependence is boss-silhouette clipping of a roughly-constant cone**: a wide near/mid boss
  catches nearly the whole cone; a narrow far/midfar boss clips the outer (low-density) pellets, which
  miss and render no damage number. The cone is ~constant; the *landing fraction* falls with range
  because the shrinking boss catches fewer outer pellets.

So the fix is not "use a smaller circle" — it is: **weight the boss-body overlap by a center-peaked
pellet density, then clip by the boss silhouette.**

## 2. The model

Each shot fires `N = hitsPerShot` pellets (usually 10). Model pellet impact points as an isotropic 2D
Gaussian centered on the aim point (the reticle/core), with standard deviation **σ** (screen px, in the
`sg-calc` calibration space). A pellet **lands** iff it falls inside the boss silhouette; it is a
**core hit** iff it falls inside the core disc. Because the distribution is radially symmetric and the
boss is (approximately) a concentric disc, both reduce to the **Rayleigh CDF**:

    P(pellet within radius R) = 1 − exp( −R² / (2σ²) )

- **Landing fraction** (band): `land(band) = 1 − exp( −R_boss(band)² / (2σ²) )`
- **Core-hit fraction** (band): `core(band) = CORE_AUTOAIM · ( 1 − exp( −R_core(band)² / (2σ²) ) )`

`CORE_AUTOAIM ≈ 0.55` is a **core-only** loss: auto-aim never converges on the ~1px true center
(the reticle floor), so the very center is under-hit relative to pure geometry. It applies to the core
target only (the central point), not to overall landing (which the raw σ already fits).

**One formula, one σ, two outputs.** SG pellet-landing and the per-weapon core-hit table
(`CORE_BY_WEAPON_BAND`) are the *same* center-weighted cone read at two radii — the boss body (~55–72px)
vs the boss core (~14px). This unifies two models that are currently separate.

### 2a. Spread σ — from the accuracy circle, Hit Rate, and auto-aim

σ scales with the on-screen accuracy circle (the HR-dependent spread envelope, `sg-geometry.ts`):

    R_spread(scale, hr) = circleDpx(scale) · hrShrink(hr) / 2          // spread-disc radius, px
      circleDpx(scale)  = 0.648 · scale                                // bloom-peak proportional map
      hrShrink(hr)      = max(FLOOR_FRAC, 1 − s·hr)                     // s=0.008483/pt, the reticle shrink
    σ(scale, hr)        = R_spread(scale, hr) / K_SIGMA

- **`K_SIGMA ≈ 2.53`** — the visible spread disc is the ~2.5σ (~96%) envelope. For noir SG this puts
  `σ = 162/2 / 2.53 ≈ 32px` (equivalently `σ ≈ circleDpx/5.06`). Per weapon (hr=0): AR 9.6, SMG 14.1,
  SG 32.0 px.
- The **auto-aim loss is a core-only factor** (`CORE_AUTOAIM≈0.55`, §2), NOT a σ-widener — the raw σ
  already fits the measured *landing*; widening it would break that. The ~20% auto-aim accuracy loss
  (dcinside gov/1525776) concentrates at the tiny central target, so it is applied to core-hit only.
- **HR dependence is inherited for free**: higher Hit Rate shrinks `circleDpx`, shrinks σ, and both
  landing and core rise toward 1 — matching the KR result that pellets converge to a point at ~115–118%
  HR (dcinside gov/534325). This replaces the current bolt-on `hrCoreMult` with the same geometry.

### 2b. Boss silhouette R_boss and R_core

- **R_boss(band)** from the measured hand-outlined boss-body area fraction (`BAND_SG_HIT_FRAC`), by
  inverting the uniform-disc relation: `R_boss = R_spread · sqrt(hitFrac)`. For noir:
  near 72.3, mid 68.3, midfar 64.5, far 55.2 px. (This *reuses* the measured silhouette but re-weights
  the overlap by the Gaussian instead of assuming uniform density — measured input, better integrator.)
- **R_core(band)** = `BAND_CORE_PX(band)/2` (near 15.5 → far 8.5 px).
- **Per-boss generalization** = `bossPelletProfile`: small/medium/large scales R_boss (the boss
  silhouette). This is exactly what the profiles should encode — a fixed center-weighted cone clipped by
  different boss sizes. Needs real per-boss SG footage to pin R_boss per silhouette (existing open item).

## 3. Calibration — validated, self-consistent

With **σ = 32px** for noir SG (at her HR), the Rayleigh landing reproduces the measured recon values
from geometry, and — critically — the *same* σ matches the independently-measured pellet footprint:

| band | R_boss px | uniform (area) | **model (σ=32)** | recon (measured) |
|---|---|---|---|---|
| near   | 72.3 | 0.797 | **0.922** | 0.888 |
| mid    | 68.3 | 0.710 | **0.897** | 0.986 |
| midfar | 64.5 | 0.634 | **0.869** | 0.888 |
| far    | 55.2 | 0.465 | **0.775** | 0.740 |

- **MAE vs recon = 0.044** (σ=30–34 all give 0.044–0.052), vs the uniform area-fraction which is off by
  0.09–0.28 per band. The center-weighting flattens the range curve toward the measured shape (it raises
  far 0.465→0.775 far more than near), exactly the observed effect.
- **Footprint cross-check:** σ=32 → 2σ full-width = 128px, inside the visually-measured single-shot
  footprint of ~110–140px. **Two independent measurements (recon landing + frame footprint) select the
  same σ ≈ 32±2px.** That convergence is the spec's strongest evidence.
- **Core sanity (unified formula, `CORE_AUTOAIM=0.55`):** reproduces the measured **near** core cells
  across all three weapons — AR `0.55·rayleigh(15.5, 9.6) = 0.400` vs measured **0.400** (exact); SMG
  `0.250` vs 0.280; SG `0.061` vs 0.048. The single core-only factor + one σ formula reproduce the
  **AR>SMG>SG ordering** and magnitude — measured cells stay pinned (constraint #3), geometry supplies
  shape + unmeasured cells + the HR response.

## 4. Engine wiring

- **SG landing:** replace the `SGLANDING=geo` mean with `land(band)` above; keep the existing seeded-MC
  spine — each shot draws `Binomial(N, land)` landed pellets (the natural MC form of "N pellets, each
  lands w.p. `land`"), replacing the current bell-curve jitter. Averaging seeds recovers `land`.
- **Core-hit:** `core(band)` becomes an alternate `acrFor`/`acrForHR` provider (unifies Workstream A/B) —
  same Rayleigh formula at `R_core`. HR shrink comes through σ, retiring the separate `hrCoreMult`.
- **ENV flag** `PELLET_GAUSS` — **LIVE by default** (owner 2026-07-17); `PELLET_GAUSS=0`/`off` reverts to
  the prior measured `CORE_BY_WEAPON_BAND` / `SG_LANDING_BY_BAND` tables for A/B. Those tables are now the
  fallback the model is graded against, not the live path.
- **Constants** live in `sg-geometry.ts`: `K_SIGMA=2.53`, `CORE_AUTOAIM=0.55`, reusing `circleDpx`,
  `circleDpxAtHr`, `BAND_CORE_PX`, `BAND_SG_HIT_FRAC`, `HR_RETICLE_SLOPE/FLOOR`.

## 5. Validation plan

1. `sg-geometry-regression.ts`: add unit tests for `rayleighWithin`, `land`, `core` reproducing the
   §3 table (σ=32 → the four landing values ±0.01) and the footprint (2σ ∈ [110,140]).
2. `verify.sh` green; regression byte-stable with `PELLET_GAUSS` off.
3. Board A/B (`board-read.ts`): SG units (noir, dorothy-serendipity, drake, guilty, isabel) should move
   toward 1 vs the flat `SGLANDING=geo` that ran cold; core-unified path A/B'd separately.
4. HR cross-check: the σ-based core must stay inside the pre-registered jill/chisato CIs (as HRCORE did).

## 6. Open parameters / caveats (⚑)

- **σ is calibrated to one unit/boss (noir).** `K_SIGMA=2.53` is fit to noir's recon landing + footprint;
  `CORE_AUTOAIM=0.55` is fit to the AR/SMG/SG near-core cells. Both need a second SG unit/boss to confirm
  transfer (dorothy-serendipity's consolidation makes her a poor σ probe — use guilty/isabel).
- **Base-vs-HR bookkeeping for `circleDpx`:** the 162px anchor was measured *at noir's HR*, so
  `circleDpx(250)=162` folds in noir's HR shrink. Disentangling base circle vs HR shrink needs one clean
  circle measurement at a known HR (same open item as the px calibration). Until then σ for other-HR SG
  units carries this ⚑.
- **Boss ≈ concentric disc** is an approximation (real silhouettes are irregular; the spider-mech has
  gaps). The Rayleigh CDF assumes a centered circular boss; irregular silhouettes need the MC form or a
  per-boss `bossPelletProfile` shape, not a single R_boss.
- **CORE_AUTOAIM=0.55 is one number for all weapons** — it nails AR near (0.400) and is close on SMG/SG;
  it may be weapon- or radius-dependent (tighter targets lose more to auto-aim). Treat as a first
  constant, refine against the full measured core table (mid/midfar/far cells, not just near).
- All values remain **logical approximations / baseline**, not measured-truth, per the `sg-calc` caveat.
