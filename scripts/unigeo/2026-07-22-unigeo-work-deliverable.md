# UNIGEO work deliverable — 2026-07-22 (judge-ready; raw data + scorecards, no verdicts)

> WORK subagent output for the approved plan `docs/handoffs/2026-07-22-unigeo-preop-packet.md`.
> Worktree: `/Users/maxwellsutton/nikke-sim/.claude/worktrees/agent-ae475c5f53840ac9b`,
> branch `worktree-agent-ae475c5f53840ac9b` (merged from main at 31d31b9 before work began).
> All engine work behind `ENV.UNIGEO`, DEFAULT OFF; no default flipped, no snapshot regenerated.
> `bash scripts/verify.sh` GREEN with the flag off (run after the final engine edit).
> NOTE on file placement: `docs/handoffs/` is gitignored in the public repo (private-tracked via
> `gitp` from the main tree only) and plain `git add -f` on those paths is forbidden by CLAUDE.md,
> so the pre-registered table and this deliverable are COMMITTED under `scripts/unigeo/`
> (`w5-predictions-table.md`, this file); an uncommitted copy of the predictions table also sits at
> `docs/handoffs/2026-07-22-unigeo-w5-predictions.md` in the worktree for the owner to `gitp save`.

## W1 — M1 fallback: core-size series fit-selection (⚑ FIT-SELECTED)

**Inputs.** 18 cells: `docs/probe-data/soda-tb-sg-core-hr-windows.json` `ownerCount.shots`
(8 window states, 728 pellets) + `docs/probe-data/soda-tb-midfar-replication.json` (18 shots).
Model: H1 Part 1 — per-area pellet density ∝ r^(k−1) in the aim circle (k=1 = uniform),
R₀ = 0.648×250/2 = 81 px, R(hr) = R₀·(1−hr/100), landing = ε·coverage(band, R),
core-per-landed = (r_core/R)^(k+1) ÷ coverage clamped [0,1]; ε and k∈[0.8,1.6] profiled.
Coverage: rebuilt from the owner-drawn silhouette by `scripts/unigeo/gen-coverage.py`
(committed, deterministic; artifacts: `src/engine/unigeo-coverage.ts` +
`scripts/unigeo/silhouette-radii-hist.json`).

**Reproducibility finding (rebuild vs committed artifacts).** Running the committed
method-of-record script (`docs/probes/drawn-geometry/extract_drawn_geometry.py`) today yields
silhouette area **108,987 px²**, not the committed 114,267. The committed figure is exactly the
union of ALL interior components ≥150 px (largest blob 108,987 + pen-crossing pockets
3,912/596/569/203 = 114,267) while the script keeps only the largest blob. The rebuild uses the
pocket-inclusive union (matches the committed artifact exactly); with it, the committed
`landingCheck_noFreeParameters` coverage row is reproduced: mid/midfar/far at R=81 give
0.742/0.684/0.632 vs the committed 0.742/0.688/0.638 at the traced R=79.3 (near 0.847 vs 0.861 —
the R difference). Core center (1678.1, 544.9) and core ring r_inner 16.1 px reproduce exactly.

**Candidate scorecard — profiled (ε, k), anchored distances 20.7/30.7/40.7/50.7, engine-form radii:**

| candidate (core diameters near/mid/midfar/far) | deviance (18 cells) | ε̂ | k̂ |
|---|---|---|---|
| A traced 31/28/21/17 | 28.6 | 0.9645 | 1.21 |
| B offset-curve 31/27/23.9/21.5 | 28.9 | 0.9655 | 1.31 |
| **C 1/d 31/20.9/15.8/12.7** | **25.2** | **0.960** | **0.96** |
| REF reproduction (traced R 79.3/48.2, core 16.1·20.7/d) | 24.5 | 0.9585 | 1.04 |

REF reproduces the analysis fit of record (25.4/16 dof, k 1.04, ε 0.960) to within rebuild noise.
Only C's profiled k sits at uniform (0.96≈1); A/B drag k up to 1.2–1.3 to suppress their larger
long-band cores.

**At the FIXED engine form (k=1, ε=0.96 — the exact parameters the UNIGEO arm ships):**

| candidate | deviance | discriminating core cells (z) |
|---|---|---|
| A | 33.0 | mid_ON −2.76, midfarREP_ON −1.47, near_OFF −1.33 |
| B | 38.4 | mid_ON −2.55, **far_ON −1.98**, midfarREP_ON −2.07 |
| **C** | **25.4** | worst cell midfar_ON +2.94 (the original outlier window; its replication z −0.26) |

Per-cell table for the selected C (= the engine's own values, see W3 below).

**Rev-6 contradiction, presented side by side (unresolved by this fit):**
- **Pro-B:** `docs/data/range-data.md:35-39` — with the bands placed from the effective-range
  readout, the traced far core is ~21% too SMALL (supporting ~21.5 far diameter, candidate B),
  and the traced body is 8–16% too big at the long bands; body/core ratio drift 4.67→6.50.
- **Pro-C:** the far-ON owner-counted cell rejects B at z ≈ −2.0 (far_ON −1.98 at the engine
  form; the packet's ≈−2.1), and the midfar replication rejects it again at −2.07; C leaves no
  |z|>1.4 core cell other than the original midfar_ON window whose pre-registered replication
  matched C's prediction (z −0.36).
- These cannot both be right: the range-data argument says the traced far core under-measures a
  ~21.5 px object; the counted cores say a ~21.5 px far core would produce ~3× the cores seen.

**Band-distance sensitivity (distances at each end of the 10-wide owner windows; candidate C
re-derived from 1/d at the shifted distances, A/B fixed):**

| placement | A | B | C (re-derived diameters) |
|---|---|---|---|
| LOW ends 15/25/35/45 | 54.5 | 56.0 | 45.9 (31/18.6/13.3/10.3) |
| anchored 20.7/… | 28.6 | 28.9 | 25.2 (31/20.9/15.8/12.7) |
| HIGH ends 25/35/45/55 | 19.7 | 19.0 | 18.1 (31/22.1/17.2/14.1) |

The C-first ORDERING is stable across all three placements, but the C-vs-A/B margin collapses at
the HIGH ends (18.1 vs 19.0/19.7) and the ABSOLUTE deviance swings 18–56 with placement — the
band-distance placement dominates absolute fit quality, and both A and B inherit the same
sensitivity. Selected series: **C — ⚑ FIT-SELECTED, not measured**; the packet caps the core
sub-model at LOG on this path (landing is severable), and an owner re-trace supersedes it.

## W2 — M2 implementation

**Files.**
- `src/engine/unigeo.ts` (new): R(hr) law, coverage interpolation, ε, ⚑ FIT-SELECTED
  `UNIGEO_CORE_PX` (C), SG landing/core functions, analytic lens overlap, Part-2
  `UNIGEO_DELTA0`/`UNIGEO_FBLOOM` (from W4), `unigeoSingleCoreProb`.
- `src/engine/unigeo-coverage.ts` (generated): per-band radial coverage tables, R = 1..96 px
  step 0.5, uniform-per-area weights. Regenerate: `python3 scripts/unigeo/gen-coverage.py`.
- `src/engine/sim.ts` (4 wiring edits): import; `UNIGEO` env knob (`'off'` default | `'sg'` |
  `'all'`); `acrForHR` head branch — SG → `unigeoSgCorePerLanded(band, hr)` in both modes,
  AR/SMG → `unigeoSingleCoreProb` in `'all'` only, MG/SR/RL always fall through untouched;
  `firePull` SG landing branch — `sgLandFromMean(unigeoSgLanding(band, hr))` ahead of the cone,
  same Bernoulli-per-pellet seeding path; the `hr` read in `dealDamage` additionally qualifies on
  `UNIGEO !== 'off'` (no off-mode change — CONE_DELTA already qualifies it by default).
- hr = the unit's live `hitRatePct` buff total at fire time — the same `stat()` read the cone
  path uses today.
- `bossPelletProfile` `'medium'`/`'large'` fights fall through to the cone path in all modes
  (coverage tables are the scope-lock boss silhouette — the packet's declared limit). No graded
  comp sets a profile.

**Off-mode verification (after the final engine edit):** `npx tsc --noEmit` clean;
`npx tsx scripts/regression.ts` (NO --update) all checks passed; `bash scripts/verify.sh`
**all checks passed**. No snapshot regenerated; no default flipped; MG/SR/RL paths untouched in
all modes.

## W3 — M3 engine-reproduction check (script: `scripts/unigeo/w3-engine-check.ts`)

Engine functions called directly at the 9 measured window states (no full sim):

| cell | pL engine | pL obs | zL | pC engine | pC obs | zC |
|---|---|---|---|---|---|---|
| near_ON | 0.9598 | 0.9313 | −1.84 | 0.0981 | 0.0738 | −1.00 |
| near_OFF | 0.8133 | 0.7800 | −0.60 | 0.0432 | 0.0000 | −1.33 |
| mid_ON | 0.8731 | 0.9158 | +1.77 | 0.0490 | 0.0287 | −1.24 |
| mid_OFF | 0.7125 | 0.7750 | +0.87 | 0.0224 | 0.0323 | +0.37 |
| midfar_ON | 0.7253 | 0.7778 | +1.58 | 0.0337 | 0.0786 | +2.94 |
| midfar_OFF | 0.6568 | 0.7000 | +0.58 | 0.0139 | 0.0000 | −0.63 |
| far_ON | 0.7101 | 0.7105 | +0.01 | 0.0223 | 0.0222 | −0.00 |
| far_OFF | 0.6067 | 0.6400 | +0.48 | 0.0097 | 0.0000 | −0.56 |
| midfarREP_ON | 0.7253 | 0.7500 | +0.74 | 0.0337 | 0.0296 | −0.26 |

**Engine total deviance across the 18 cells: 25.45** vs the analysis fit's 25.4 (16 dof) —
Δ = 0.05, criterion Δ ≤ 6 → **within criterion**. No constant was tuned to achieve this.

## W4 — M4 Part-2 fits (script: `scripts/unigeo/w4-part2-fit.py`, ridge: `w4-ridge.py`)

**Cells and provenance (P-CELLS-corrected).** AR fitted: `moran` near 0.40 recon-verified
(weighted n=120, k=48; `coreband2-moran-ar.json` reconciliation, 2 agreeing methods) + `moran`
mid 9/57, midfar 6/42, far 2/40 (n recorded in the same JSON — the "else n=50" assumption was NOT
needed); `scarlet` far spawn 3/36; `blanc` far spawn 20/180 @HR 39.24 (closed handoffs
`2026-07-19-geometry-campaign-findings.md:26-35`, `2026-07-18-core-rate-vs-hitrate-test-plan.md:382-431`).
`jill` near @HR 80.78 ≈ 1 as a hard constraint (predicted ≥ 0.85). SMG fitted: `chisato` near
32/109 @HR0 + 57/156 @HR22.37 (test-plan M3 superset counts). EXCLUDED per packet: `blanc` near
(inflated), `chisato` midfar HR22 (weak), `scarlet` near spawn 0.25 (fade-stack low-n, reported only).

**AR fit** (core series C, the W1 selection):

| quantity | value |
|---|---|
| δ0_AR | **15.9 px** (well identified: [15.2, 16.5] within +1 deviance) |
| f_bloom_AR | **0.578** (soft ridge [0.505, 0.680] at +1; f_bloom=1 costs +6.0 deviance) |
| fit deviance on the 6 cells | **2.13** |
| same fit under candidate A | δ0 17.7, f_bloom 0.493, deviance **12.50** |
| incumbent cone, SAME cells (frozen constants, exact live formulas, its own core basis A) | deviance **16.33** |

Per-cell (C fit): moran near 0.386/0.400 (z +0.32), mid 0.176/0.158 (−0.36), midfar 0.095/0.143
(+1.05), far 0.057/0.050 (−0.19); scarlet far 0.057/0.083 (+0.69); blanc far 0.128/0.111 (−0.68).
Cone per-cell: moran near 0.285/0.400 (z **+2.79**), mid 0.229/0.158 (−1.27), midfar 0.121/0.143
(+0.43), far 0.076/0.050 (−0.62); scarlet far 0.076/0.083 (+0.16); blanc far 0.181/0.111 (**−2.42**).
The cone's stated in-sample advantage on AR (fit to overlapping cell-era data) is acknowledged;
on these cells it is the uniform-lens fit that carries the 2 free parameters.

**SMG fit — SATURATED (2 cells / 2 params) ⚑ CALIBRATION, capped at LOG by the packet rule:**
δ0_SMG 17.9 px, f_bloom_SMG 0.728; deviance 0.35 (chisato near 0.272/0.294, 0.378/0.365).
Incumbent cone on the same 2 cells: 0.06 (these cells were in the cone's own freeze fit).

**D2 conditions (explicit):**
- jill: predicted near core @HR 80.78 = **1.000** (constraint ≥ 0.85 satisfied);
  **δ(80.78) = 15.9 × (1 − 80.78/120) = 5.20 px vs the ≤ ~10.8 px bound — satisfied.**
- Ceiling test: **VOID** — f_bloom_AR = 0.578 < 0.95 (R_eff(near, HR0) = 0.578×24.3 = 14.0 px
  < r_core 15.5 px, so the concentric ceiling (15.5/24.3)² = 0.417 does not bind; the packet
  pre-declared this VOID condition and it fired). scarlet per-frame near 0.394 vs model
  prediction 0.386 (close, but no longer a ceiling discrimination).
- D3 scorecard: f_bloom_SMG < 1 ✓ (0.728); f_bloom_AR ≈ 1 **✗** (0.578 — the AR fit prefers a
  strongly contracted effective circle; f_bloom=1 is 6.0 deviance worse).

**Validation-only direction checks (never fitted):**
- `quency-escape-queen` @HR≈61 (biased-high; check pred ≤ obs+3σ): near 0.846 ≤ 0.885 OK;
  mid 0.489 ≤ 0.770 OK; midfar 0.316 ≤ 0.609 OK; far 0.222 ≤ 0.320 OK. (Cone: 0.560/0.487/0.312/0.217.)
- `little-mermaid` @HR15 (biased-high): near 0.337 ≤ 0.354 OK; **mid 0.187 > 0.179 VIOLATION;
  midfar 0.121 > 0.102 VIOLATION; far 0.083 > 0.049 VIOLATION** — the SMG saturated calibration,
  extrapolated off its two near-band cells, over-predicts the little-mermaid long bands. The
  incumbent cone exceeds the same bounds by MORE (0.281/0.167/0.113). These are SMG cells; the
  packet caps SMG at LOG regardless.
- Label AR @HR≈23 (thin, spawn method): uni 0.576/0.271/0.147/0.087 vs spawn 0.37/0.28/0.20/0.13
  (cone 0.444/0.361/0.193/0.120). Note the same recording's PER-FRAME near read was ~0.57 — the
  uni near prediction lands on the per-frame value; absolute levels are method-sensitive
  (closed-handoff method lesson), so this series is direction-context only.
- `scarlet` near spawn 0.25 (fade-stack low-n): reported, not fitted; both models sit above it.

## W5 — M5 board A/B with pre-registered movers

**Step 1 — pre-registration.** The full per-unit table (direction + magnitude band for every
graded SG unit, then AR/SMG unit at `'all'`) was computed from the model deltas + OFF-baseline
bucket shares ONLY and **committed at `c2e34ff` BEFORE any OFF-vs-ON comparison ran**
(`scripts/unigeo/w5-predictions-table.md`; copy at `docs/handoffs/2026-07-22-unigeo-w5-predictions.md`).
Headline predictions: every SG unit COLD by −0.10..−0.23 Δratio (F_sg = 0.8028 — the UNIGEO
landing is the measured-faithful ε×coverage, 12–24% below the live cone landing the overrides
were calibrated against); quency-escape-queen +0.065..+0.072 at `'all'`; chisato/little-mermaid
−0.014..−0.017 at `'all'`; AR units +0.003..+0.013 at `'all'`. The SG-landing→burst-gauge
coupling (missed pellets generate nothing) was DECLARED in the table with the at-risk comp list.

**Step 2 — actuals** (deterministic engine runs, ratio = sim/real; `scripts/unigeo/w5-ab.ts`;
full 142-row table in the script output). Movers:

SG at `UNIGEO=sg` (identical at `'all'`) — **predicted direction correct 8/8, magnitude inside
the pre-registered band 8/8**:

| comp / unit | ratio off | ratio sg | Δ actual | Δ predicted [band] |
|---|---|---|---|---|
| PI2 / noir | 1.0946 | 0.8916 | −0.2030 | −0.216 [−0.11,−0.32] ✓ |
| PI / noir | 1.1153 | 0.9054 | −0.2099 | −0.220 [−0.11,−0.33] ✓ |
| PH / dorothy-serendipity | 1.1582 | 0.9588 | −0.1994 | −0.228 [−0.11,−0.34] ✓ |
| N9 / dorothy-serendipity | 0.9732 | 0.8700 | −0.1031 | −0.192 [−0.10,−0.29] ✓ (band edge) |
| N2 / naga | 1.0276 | 0.8354 | −0.1922 | −0.203 [−0.10,−0.30] ✓ |
| N3 / soda-twinkling-bunny | 0.9411 | 0.8239 | −0.1172 | −0.127 [−0.06,−0.19] ✓ |
| soda-tb control / soda-twinkling-bunny | 0.9163 | 0.7587 | −0.1576 | −0.120 [−0.06,−0.18] ✓ |
| N5 / arcana-fortune-mate | 1.1043 | 0.9064 | −0.1978 | −0.204 [−0.10,−0.31] ✓ |

AR/SMG incremental at `UNIGEO=all` (Δ = all−sg, isolating the Part-2 core change from the SG
knock-on) vs prediction:
- quency-escape-queen: PH +0.0755 (pred +0.072 ✓), N1 +0.0668 (pred +0.065 ✓)
- chisato: PI2 −0.0143, PI −0.0131, N2 −0.0121 (pred −0.016 ✓)
- little-mermaid: 8 comps −0.0123..−0.0156 (pred −0.014..−0.017 ✓)
- grave: PI2 +0.0107, PI +0.0108, N1 +0.0099 (pred +0.013 [0.006,0.019] ✓)
- guillotine-winter-slayer PH: +0.0147 (pred +0.013 ✓); privaty +0.0030..+0.0043 (pred +0.003/4 ✓);
  moran +0.0046..+0.0056 (pred +0.005 ✓)
- jill: N1 +0.0073 ✓, PI +0.0045 ✓, **PI2 +0.0019 — below the band low edge [+0.003]**
- **snow-white (C-controls): +0.0071..+0.0140 vs pred +0.004 [0.002,0.006] — direction right,
  magnitude ABOVE the pre-registered band 2–3×** (|Δ|>0.01 in 3 of 4 control comps)
- **nayuta T5: −0.0019 vs pred −0.016 [−0.008,−0.024] — direction right, magnitude ~8× smaller
  than the band's low edge** (her modeled `hitRatePct` state was not folded into the prediction)

**Step 3 — controls / triggers, one by one:**

| trigger / control | state | numbers |
|---|---|---|
| FB counts identical on every graded comp | **FIRED (1 comp)** | N5 snowwhite-HA 11→10 at sg and all; other 30 comps unchanged. Cause: SG gauge drop (landing feeds `shotGauge`; the coupling was declared pre-A/B) |
| Rotation logs (all 31 comps diffed, stronger than the 3-comp ROT=1 spot-check) | 8 SG comps differ; 23 non-SG comps byte-identical | characterization (soda-tb control): whole rotation shifts +0.5s (first FB 4.7→5.2s), same count/order |
| Non-SG graded unit moves >0.1% at `sg` | **FIRED (27 units)** | all in SG-carrying comps, zero movement in every comp without an SG unit; extremes: crown PH −5.25%, crown soda-tb −3.39%, modernia N2 +1.16%, anis-star N5 −1.64% |
| MG/SR/RL bit-identical in both modes | holds in all non-SG comps; **fails in the 8 SG comps** (18 units, rotation-timing knock-on, same cause as above) | e.g. crown PH 1.0337→0.9795 |
| Graded SG unit \|ratio−1\| worsens >0.03 at `sg` | **FIRED (4 of 8 SG readings)** | naga N2 0.028→0.165; soda-twinkling-bunny N3 0.059→0.176; soda-twinkling-bunny control 0.084→0.241; dorothy-serendipity N9 0.027→0.130. Improved: dorothy-serendipity PH 0.158→0.041, noir PI 0.115→0.095, arcana-fortune-mate N5 0.104→0.094; noir PI2 worsens 0.095→0.108 (below trigger) |
| SG band-ordering inversion vs measured | SILENT | UNIGEO landing near .813 > mid .712 > midfar .657 > far .607 — same ordering as measured HR0 landing .780/.775/.700/.640 |
| Rev-4 unpredicted movers (\|Δratio\|>0.01, NOT in the pre-committed table) | **FIRED (3 units)** | crown (MG) PH −0.0543 and soda-tb control −0.0362; anis-star (RL) N5 −0.0142. All three are the declared gauge/rotation coupling, not a direct geometry path — but the units were not rows in the table. Boundary cases (units IN the table but moving >0.01 at a mode where their row predicted 0): little-mermaid PH −0.0105 at `sg`, chisato N2 −0.0108 at `sg` |
| `scripts/regression.ts` at `UNIGEO=sg` | 21 snapshot failures | SG units 10.60–18.54% (noir 18.54, soda-twinkling-bunny 17.20/12.46, dorothy-serendipity 17.22/10.60); non-SG 0.11–5.25%, every one inside an SG comp |

**Board aggregate (142 graded readings):** mean |ratio−1| 0.0864 (off) → 0.0886 (sg) → 0.0888
(all); readings within ±3%: 41 → 41 → 41. SG-unit mean |ratio−1| 0.0837 → 0.1312.

**dorothy-serendipity (designated SG amplification probe):** PH 1.1582 → 0.9588
(|ratio−1| 0.158 → 0.041); N9 0.9732 → 0.8700 (0.027 → 0.130). Predicted-direction, in-band in
both comps; the two comps move to opposite sides of 1.0 because her OFF baselines sat on opposite
sides of the −0.10..−0.23 SG shift.

## FACTUAL SUMMARY (neutral)

1. **Measurement side.** The fallback fit-selection picks core series C (1/d) — deviance 25.4 at
   the engine form vs A 33.0 / B 38.4 — with the ordering stable under band-distance placement
   but the margin collapsing at the high-end placement, and with the range-data.md pro-B
   argument standing unresolved against the counted far/midfar cells. C ships ⚑ FIT-SELECTED.
   The engine reproduces the 18-cell analysis fit exactly (deviance 25.45 vs 25.4, criterion ≤ +6).
2. **Part 2.** On the clean AR cells the uniform-lens fit (δ0 15.9 px, f_bloom 0.578) reaches
   deviance 2.13 where the incumbent cone scores 16.33; the same fit under core series A scores
   12.50. Both D2 jill conditions hold (pred 1.000; δ(80.78)=5.2 ≤ 10.8); the D2 ceiling
   discrimination is VOID by its own pre-declared condition (f_bloom_AR < 0.95); D3's SMG half
   holds, its AR half does not. The SMG fit is a saturated 2-cell calibration (LOG-capped by the
   packet) and, extrapolated to little-mermaid's HR-15 long bands, exceeds the biased-high
   measurements' +3σ bounds (the incumbent cone exceeds them by more).
3. **Board.** Every one of the 8 graded SG readings moved in the pre-registered direction and
   inside the pre-registered magnitude band. The moves are large (−0.10..−0.21) because the
   UNIGEO landing is 12–24% below the live table/cone landing that the SG overrides were
   calibrated against; the owner's own hand count (landing 0.780 near-OFF vs live-model 0.922)
   sits on UNIGEO's side of that gap. Readings that started HOT improved (3), readings at or
   below 1.0 worsened past the 0.03 revert threshold (4).
4. **Triggers.** With M3 passing, the board fired: the SG-worsening revert trigger (4 readings),
   the non-SG >0.1% trigger (27 units), one FB-count change (N5 11→10), and the rev-4
   unpredicted-mover trigger (crown ×2, anis-star ×1). Every non-SG movement and the FB change
   trace to a single mechanism that is not part of the H1 geometry model itself: SG landing
   feeds burst-gauge generation, so lower landing shifts every SG comp's rotation ~0.5s. This
   coupling was declared in the pre-registered table (with the at-risk comp list) but its
   per-unit knock-on movers were not enumerated as table rows. Comps without an SG unit are
   byte-identical at `sg` including all MG/SR/RL units.
5. **Aggregate.** Board mean |ratio−1| moves 0.0864 → 0.0886 (`sg`) → 0.0888 (`all`); the
   within-±3% count is unchanged at 41/142. The per-unit changes are strongly structured
   (SG cold shift + small AR/SMG core-side shifts matching the pre-registered signs), while the
   aggregate is nearly flat because the graded SG baselines straddled 1.0.
6. Nothing was enacted: `UNIGEO` defaults off, the live cone remains the shipping model, no
   snapshot was regenerated, no DECISIONS entry was touched, and `verify.sh` is green with the
   flag off.
