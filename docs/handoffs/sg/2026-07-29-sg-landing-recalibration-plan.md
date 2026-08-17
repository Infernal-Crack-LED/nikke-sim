# SG landing recalibration — scientific-method plan (UNIGEO target)

> Date: 2026-07-29  
> Driver: Kimi Code CLI  
> Empirical gate: `/scientific-method`  
> Question: Does the live **UNIGEO** SG landing model under-predict real per-band landed pellets on the scope-lock spider-mech boss at HR=0?  
> **Outcome: REJECT — the CV pellet counter failed second-unit validation (systematic cold bias + band-dependent flattening on `noir sg.MP4`; template mismatch on `guilty`/`isabel`). No UNIGEO recalibration is justified. See `docs/handoffs/scientific-method-harness.md` 2026-07-29 entry.**

## Background & scope

The live SG landing path is **UNIGEO** (`ENV.UNIGEO` default `'all'`, owner-enacted 2026-07-22, `docs/DECISIONS.md`). For `bossPelletProfile='small'` (scope-lock basis), landing is computed as:

```ts
unigeoSgLanding(band, hr) = min(1, 0.96 * coverage(band, R(hr)));
R(hr) = 81 * max(0, 1 - hr / 100);
```

At HR=0 this predicts (landed pellets / 10):

| band   | UNIGEO HR=0 |
| ------ | ----------- |
| near   | 8.13        |
| mid    | 7.13        |
| midfar | 6.57        |
| far    | 6.07        |

These values match the sim predictions reported in `docs/probe-data/marciana-sg-band.json` (near 8.13 / mid 7.13 / midfar 6.57 / far 6.07). The same file localizes a **0.850 COLD** SG read to the landing term: real weighted-mean landing ≈8.45/10, concentrated at the long bands.

Independent running-counter/lattice anchors (`docs/probe-data/noir-solo-recon.json`, `guilty-sg-band.json`, `isabel-sg-band.json`) also imply landing **above** the UNIGEO HR=0 curve on this boss, especially at non-near bands.

A new CV pellet counter (`scripts/probe/read-pellets.ts` + `count-pellets.py`) can now read per-shot landed-pellet counts directly. Before it answers open-questions **U35**, it must be validated on a **second SG unit** with an independent ground-truth method.

This plan tests whether UNIGEO under-predicts on the scope-lock spider-mech boss. It does **not** re-tune the legacy `SG_LANDING_BY_BAND` table (used only when `UNIGEO=off` or for medium/large profiles). Any ACCEPT outcome is at most a calibration-debt item or a measured `bossPelletProfile` adjustment, pending board A/B and second-boss replication.

---

## Load-bearing premises (step-0 premise gate)

| #   | Premise                                                                                                                                              | Status                                                                                                                                                                       | Source / action                                                                                                |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| P1  | The CV pellet counter is reliable enough to produce per-shot total landed-pellet counts on SG recordings.                                            | **PARTIAL** — validated on `marciana-solo.MP4` only; second-unit validation is part of this test.                                                                            | `scratchpad/pellets/HANDOFF.md` run18; `docs/open-questions.md` U35 gating follow-up.                          |
| P2  | Solo SG recordings covering all four range bands exist and have known band windows.                                                                  | **CONFIRM**                                                                                                                                                                  | `docs/probe-data/noir-solo-recon.json`, `guilty-sg-band.json`, `isabel-sg-band.json`, `marciana-sg-band.json`. |
| P3  | The live SG landing path for scope-lock small profile is **UNIGEO** (`UNIGEO='all'`, `bossPelletProfile='small'`).                                   | **CONFIRM**                                                                                                                                                                  | `src/engine/sim.ts:1185-1217`, `src/engine/sim.ts:3342-3371`.                                                  |
| P4  | Running-counter/lattice reconciliations provide an independent ground truth for landing on at least noir and guilty.                                 | **CONFIRM with caveats** — noir is the cleanest anchor; guilty has schedule-exact S1/S2 damage buffs (do not affect count); isabel mid/midfar carry clock-drift uncertainty. | `docs/probe-data/noir-solo-recon.json`, `guilty-sg-band.json`, `isabel-sg-band.json`.                          |
| P5  | SG cadence (1.5 pulls/s) and per-pellet damage are already confirmed correct, so residual real/sim gap at the band level is attributable to landing. | **CONFIRM**                                                                                                                                                                  | `docs/probe-data/noir-solo-recon.json`, `guilty-sg-band.json`, `marciana-sg-band.json`.                        |
| P6  | The recordings under test are at **HR=0** (no in-fight Hit Rate buffs).                                                                              | **CONFIRM** for noir/guilty/isabel/marciana solo; recordings with HR in filename (`noir 60%`, `noir team 98%`, `blanc 40%`) are excluded from this test.                     | Kit inspection + filenames.                                                                                    |

---

## Hypotheses

### H1 — UNIGEO under-predicts SG landing on this boss at HR=0

The live UNIGEO model (`unigeoSgLanding` at HR=0) under-credits real landing on the scope-lock spider-mech boss. After validating the CV counter against an independent running-counter anchor, the per-band counter means are systematically **higher** than UNIGEO HR=0 predictions and consistent with the running-counter/lattice implied landings.

### H0 — UNIGEO is consistent with measurement uncertainty

The apparent gaps are within the combined uncertainty of the recordings, the counter's known shot-detection shortfall, and band-window placement. The counter means agree with UNIGEO HR=0 within its error envelope.

### H-alt-A — Counter bias (instrument confound)

The CV counter has a systematic per-band bias (e.g., under-counts low-brightness long-band pellets, or over-counts VFX spikes) that makes it read high/low independently of true landing. This would show up as counter means that disagree with the running-counter/lattice ground truth.

### H-alt-B — Boss-profile / silhouette effect, not a universal UNIGEO error

The measured landing differences are specific to the traced spider-mech silhouette used by UNIGEO, or to this boss's apparent size. Other bosses / profiles may already be correct. Since all recordings share one silhouette, this cannot be fully rejected here.

---

## Method

### Recordings

Run the CV pellet counter on these four HR=0 solo SG recordings:

1. `docs/probes/clean-weapons/marciana-solo.MP4` — reproducibility check (the original tuning video).
2. `docs/probes/ar-sg-smg/noir sg.MP4` — cleanest running-counter anchor (solo Burst-III, never FB, pure spray).
3. `docs/probes/ar-sg-smg/guilty solo sg.MP4` — second clean solo; S1/S2 are damage buffs and do not affect pellet count.
4. `docs/probes/ar-sg-smg/isabel solo sg.MP4` — third solo; **use near and far only** as clean validation bands (mid/midfar excluded per U27 clock-drift caveat).

Command (locked parameters, no per-video tuning):

```sh
npx tsx scripts/probe/read-pellets.ts <video> \
  --fps 30 --zoom 2 --marker-min 2 --core-rate 0.05 \
  --out scratchpad/pellets/<unit>-sg
```

`count-pellets.py` runs the default OpenCV backend (`--backend opencv`). These parameters match the run18 calibration in `scratchpad/pellets/HANDOFF.md`.

### Band assignment

`read-pellets.ts` emits each shot with a `fight` time (seconds since fight start, from the timer spine). Convert that to the same `fightClock` convention used in the probe-data JSONs and assign bands from the published windows:

| Recording          | fightClock offset                                          | Band windows (fightClock)                                                                                                                                                                          | Source field                                                       |
| ------------------ | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| noir sg.MP4        | videoSec − 7 (`firstDamageVideoSec`)                       | mid 0–33, near 33–70, far 70–106, midfar 106–144, near 144–176                                                                                                                                     | `noir-solo-recon.json` lines 10, 59–87                             |
| guilty solo sg.MP4 | videoSec − 7.717 (`firstDamageVideoSec`)                   | mid 0–30, **near1 30.17–63.57, near2 140.22–169.27**, far 70–106, midfar 106–140                                                                                                                   | `guilty-sg-band.json` lines 33–34, 57–62, 195–244                  |
| isabel solo sg.MP4 | videoSec − 7.5 (`firstDamageVideoSec`)                     | mid 0–33, **near1 33–70**, far 70–106, **midfar EXCLUDED**, **near2 144–176**, **mid EXCLUDED**                                                                                                    | `isabel-sg-band.json` lines 31–34, 55–132; U27 excludes mid/midfar |
| marciana-solo.MP4  | derived from the video's own timer spine (`fightStartSec`) | Nominal scope-lock windows: **mid 0–33, near 33–70, far 70–106, midfar 106–144, near 144–176**. If boundaries are ambiguous, mark the band invalid rather than tune windows to the counter output. | `read-pellets.ts` timer spine                                      |

For **guilty**, the empirical near windows (30.17–63.57 and 140.22–169.27) are used instead of the nominal first-damage windows because the boss transitions run 2–4 s early on this recording. Far and midfar use the nominal windows; mid is retained as a one-sided check.

For **isabel**, mid and midfar are excluded from validation (clock-drift uncertainty, U27); near1/near2 and far are retained.

Justification for `--fps 30 --zoom 2`: pellets are visible ~13 game frames (~0.22 s) at 60 fps. Sampling at 30 fps captures at least 6–7 frames per pellet, sufficient for the median estimator; 60 fps would double compute with diminishing returns. Zoom 2 matches the run18 calibration (`scratchpad/pellets/HANDOFF.md`) and keeps component areas within the tuned `min_area`/`max_area` bounds.

### Counter-output interpretation

`scripts/probe/read-pellets.ts` emits per-shot **counts**: `white + red = total` landed pellets. It does **not** output damage. ATK buffs, range bonuses, and skill damage multipliers change damage per pellet, **not pellet count**, so no ATK/buff normalization is applied.

The data-cleaning steps:

- **Reject detection failures:** exclude shots with `total < 5` or `total > 10` (impossible for a 10-pellet SG shot).
- **Flag rider-overlap shots (isabel only):** the S2 rider fires at fightClock ≈ 16.9, 31.6, 46.3, 61.1, 75.8, 90.5, 105.1, 119.9, 134.6, 149.4, 164.1 (`isabel-sg-band.json` lines 47–50). Exclude any shot event whose `fight` time falls within **±0.5 s** of a rider timestamp.
- **No other corrections.** `corrected_counter_landing(band)` = mean(valid `total` values in the band) / 10.

### Core-hit instrument-bias control

The CV counter's red marker fallback has ~20% recall versus an expected ~50% core-hit rate (`scratchpad/pellets/HANDOFF.md`), so it can systematically under-count core pellets.

- From the running-counter anchors, derive an expected core rate per band where possible:
  - noir: near core blend ~1.11× plain value per shot (from `goldStandardMeasurement_nearMag`) implies ~0.4–0.6 core hits/shot; far core is visually rare (~0.0–0.1).
  - guilty: near L-decomposition includes core pellets in `total`; use the lattice-implied core fraction as a bound.
- Compare the CV `core` shot fraction (any event with `core: true`) and the mean `red` count to the expected rate.
- If the CV under-counts core by >0.1 core hits/shot in a band, add the missing core pellets to the counter total before computing Δ, and report both **raw** and **core-corrected** landings. The core-corrected value is the one used for H0/H1 decisions.

### Validation against independent ground truth

For each unit/band where running-counter/lattice data exists, compute:

- **Counter mean landed pellets / 10** = mean(valid `total` in band) / 10 (core-corrected if needed).
- **UNIGEO HR=0 prediction** = `unigeoSgLanding(band, 0) * 10` (near 8.13 / mid 7.13 / midfar 6.57 / far 6.07).
- **Running-counter/lattice anchor** (pre-committed, all values in **landed pellets per 10**):
  - noir (`noir-solo-recon.json` perBandReconciliation): mid **10.0**, near **8.9**, far **7.4**, midfar **8.8**.
  - noir shape ratios: far/near = **0.831**, midfar/near = **0.989**.
  - guilty near (`guilty-sg-band.json` empiricalNearWindows mean of empNear1/empNear2): **8.075/10**.
  - isabel: report M near = 1.286 and M far = 0.705; use for qualitative cross-check only (M is not pure landing).
- **Counter shape ratios:** far/near and midfar/near from the counter means, compared to running-counter/lattice ratios.
- **Prediction:** If H1 is true and the counter is unbiased, the counter mean and running-counter/lattice anchor agree within ±1 landed pellet/shot, and shape ratios agree within ±0.10.

### Sim comparison

For each unit/band, compare the validated counter landing to the live UNIGEO HR=0 prediction:

- If counter means are systematically higher than UNIGEO HR=0 and reproducible across units, H1 is strengthened.
- If the legacy `SG_LANDING_BY_BAND` table (near 8.88 / mid 9.86 / far 7.40 / midfar 8.88) happens to match the data better, that is noted but does **not** justify reverting the live default without same-tier evidence that UNIGEO itself is wrong.

---

## Predictions (pre-committed)

UNIGEO HR=0 landed pellets per 10: near **8.13**, mid **7.13**, midfar **6.57**, far **6.07**.

| #                           | Prediction                                                                                                                                                                                                                                               | Discriminates H1 from                                             |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| P1 (noir anchor)            | Under H0, counter means agree with UNIGEO HR=0 within **±0.5 landed pellets/10** on near and far (near 7.6–8.6/10, far 5.6–6.6/10). Under H1, they exceed UNIGEO by **≥0.5 landed pellets/10** on at least one of near/far.                              | H0 / H1. noir is the calibration anchor; a low read falsifies H1. |
| P2 (counter bias)           | Counter mean and running-counter/lattice anchor agree within **±1 landed pellet/shot** on noir's near and far bands, and shape ratios (far/near=0.831, midfar/near=0.989) agree within ±0.10.                                                            | H-alt-A.                                                          |
| P3 (guilty near)            | Under H1, counter mean in guilty's empirical near windows exceeds UNIGEO near (**8.13/10**) by **≥0.5 landed pellets/10** (i.e., ≥8.6/10) and is consistent with the lattice anchor **8.075/10** within ±1. Under H0 it falls in 7.6–8.6/10.             | H0 / H-alt-A.                                                     |
| P4 (shape / non-near)       | Under H1, counter means on **far and midfar** exceed UNIGEO HR=0 by **≥0.5 landed pellets/10** across ≥2 units. Under H0 they agree within ±0.5. (The mid band is near ceiling at 7.13/10; report it only as a one-sided "not lower than UNIGEO" check.) | H0 / H1.                                                          |
| P5 (shape-ratio bias check) | Under H-alt-A, counter far/near and midfar/near ratios differ from running-counter/lattice ratios by >0.10. Under H1 they agree within ±0.10.                                                                                                            | H-alt-A.                                                          |
| P6 (legacy table)           | The legacy `SG_LANDING_BY_BAND` table (near 8.88 / mid 9.86 / far 7.40 / midfar 8.88) is reported for reference only; it is **not** a candidate default unless same-tier evidence overturns UNIGEO.                                                      | —                                                                 |

---

## Controls

1. **Cadence control:** The counter's shot count per band must match the known cadence (1.5 pulls/s, 40 game-frame pull interval) within detection limits. Expected shots per 37 s band window ≈ 55; observed within ±20% is acceptable given transition fire-holds.
2. **Independent-method control:** Running-counter/lattice data outranks the CV counter wherever they disagree. The counter is admitted only where it agrees with an independent method.
3. **Unit-diversity control:** Agreement across noir + guilty + isabel reduces the risk of a per-unit quirk (H-alt-B). For isabel, **near and far only** are treated as clean validation bands.
4. **Reproducibility control:** Re-run on `marciana-solo.MP4` and compare to run18 numbers (70 shots detected of ~90 expected, avg total 7.6). Large drift flags a setup/parameter change.
5. **Shape-ratio control:** Compare counter far/near and midfar/near ratios to running-counter/lattice ratios. A shape mismatch >0.10 flags per-band instrument bias (H-alt-A) even if absolute levels happen to match.
6. **Core-hit control:** Compare CV `core`/`red` fractions to lattice-implied core rates; core-correct if under-count >0.1 core hits/shot.
7. **Boss-independence guard:** All four recordings are on the same spider-mech boss. H-alt-B cannot be fully rejected here; any ACCEPT outcome is provisional and must be downgraded to a class-wide change only if the same shape is later reproduced on a second boss silhouette, OR the outcome is logged as a measured `bossPelletProfile` adjustment.

---

## Pre-committed decision rule

Definitions:

- `corrected_counter_landing(unit,band)` = mean(valid `total` in band, core-corrected if needed) / 10. A band is **valid** only if detection rate ≥60% of expected shots; otherwise it is excluded from Δ calculations.
- **Δ(unit,band) = corrected_counter_landing(unit,band) − unigeoSgLanding(band, 0) × 10** (landed pellets per 10).
- **Candidate adjustment:** for each band where ≥2 valid units agree within ±0.5 pellets/10, take the shot-count-weighted mean of their corrected counter landings. Bands with fewer valid units inherit the UNIGEO value.

After validating the counter on at least one second unit:

- **ACCEPT H1 (recommend a measured UNIGEO calibration-debt item / boss-profile adjustment)** if:
  - Counter and running-counter/lattice landings agree within ±1 landed pellet/shot on noir AND at least one other unit's clean bands (guilty near / isabel near).
  - Counter shape ratios (far/near, midfar/near) agree with running-counter/lattice ratios within ±0.10.
  - Δ(unit,band) ≥ +0.5 on ≥3 independent bands across ≥2 units.
  - **Maximum enactment from ACCEPT:** log the measured candidate adjustment in `docs/DECISIONS.md` + `docs/probe-runs.md` as a UNIGEO calibration-debt item for the spider-mech boss; propose it as an ENV-gated default-OFF `bossPelletProfile` multiplier or a silhouette-coverage re-fit; require a follow-up board A/B + second-boss replication before any live-default change.
- **REJECT H1 (keep UNIGEO as live default)** if:
  - |Δ(unit,band)| ≤ 0.5 on the clean bands of noir + at least one other unit, OR
  - Counter and running-counter/lattice disagree by >1 landed pellet/shot on noir, indicating counter bias (H-alt-A), OR
  - Shape ratios disagree by >0.10.
- **INCONCLUSIVE / LOG** if:
  - Validation passes but only for one unit or one band.
  - Counter detection rate is too low (<60% of expected shots) to trust band means.
  - H-alt-B (boss-specific landing) cannot be ruled out.

**Falsification clause:** If the counter reproducibly disagrees with the running-counter anchor on noir (the cleanest case), the issue is the counter or the band assignment, not UNIGEO. Do not recalibrate on a biased instrument.

---

## What this plan cannot establish

- A **boss-independent** absolute landing table. All recordings are on the scope-lock spider-mech boss; `bossPelletProfile` multipliers for other silhouettes remain unverified.
- That the legacy `SG_LANDING_BY_BAND` table should be reinstated as the live default. UNIGEO is the shipped live engine and can only be displaced by same-tier evidence.
- A **per-unit landing** profile. The owner closed the per-unit landing thread (A31/U17). This plan tests UNIGEO's class-wide predictions.
- A **final enacted value** without a follow-up board A/B and second-boss replication.

---

## Tools / code anchors

- `src/engine/sim.ts:1185-1217` — UNIGEO core path.
- `src/engine/sim.ts:3342-3371` — UNIGEO SG landing damage path.
- `src/engine/unigeo.ts:69-72` — `unigeoSgLanding(band, hr)`.
- `src/engine/unigeo.ts:21-34` — `UNIGEO_SG_R0`, `UNIGEO_EPS`, `UNIGEO_CORE_PX`.
- `src/engine/sg-geometry.ts:56-61` — legacy `BAND_SG_HIT_FRAC` (reference only).
- `scripts/probe/read-pellets.ts` — CV counter orchestrator.
- `scripts/probe/count-pellets.py` — CV pellet detector.
- `scratchpad/pellets/HANDOFF.md` — counter tuning record.
