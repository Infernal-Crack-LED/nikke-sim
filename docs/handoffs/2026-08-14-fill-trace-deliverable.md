# Deliverable — refill-window fill-trace measurement (2026-08-14)

> Judge-ready output of the `/scientific-method` work step for the plan in
> [2026-08-14-fill-trace-preop-packet.md](2026-08-14-fill-trace-preop-packet.md)
> (pre-op verdict APPROVED-WITH-REVISIONS; revisions R1–R3 executed). Measurement + log only.

## 0. Instruments, as run

| instrument                | path                                                          | branch                             | commit                          | self-check status on this run                                                                                                                                             |
| :------------------------ | :------------------------------------------------------------ | :--------------------------------- | :------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Team-HUD fill reader      | `scripts/probe/gauge-fill.py --team`                          | `instrument/gauge-fill-team`       | `b93ab217`                      | lock reported 134px, rows 491–498, x 2477–2610 on **all three** recordings — identical to its committed validation; the width gate never warned                           |
| Sim credit schedule       | `scripts/battery/fb-count-matrix.ts --credit-schedule --json` | `instrument/gauge-credit-schedule` | `df9efdf1`                      | endpoint / DBG_GAUGE / truncated-run / prefix ALL pass and `unreconstructed` empty on the two primary comps; **all three checks fail on the optional third arm** (see §5) |
| Refill-window bounds      | `scripts/probe/scan.ts --fps 60 --cycle-table`                | on `main`                          | `997d0bd5`                      | committed fixtures `docs/probe-data/tempo-cycle-*.json`; the third arm was re-scanned — 13/13 Full Bursts, every one corroborated by a 2nd detector                       |
| Comparison + these tables | `scripts/probe/fill-trace-compare.ts` (new this run)          | `worktree-agent-a56b817820dc8194b` | merge `c88c9087` + this landing | pinned by `scripts/tests/probe/fill-trace-compare.test.ts` — 19 assertions, green                                                                                         |

Base of the run: `main` `997d0bd5` with both instrument branches merged (`c88c9087`).
`bash scripts/verify.sh` green before any measurement and again after the landing.

**Raw data pointers.** Every figure in §2 is emitted by `fill-trace-compare.ts tables` from
self-contained replay bundles, so nothing is hand-transcribed and the whole analysis re-runs without
the gitignored recordings:

- `docs/probe-data/fill-trace-u8-g-iron-sweep.json`
- `docs/probe-data/fill-trace-probe-u7-t5-wind-weak.json`
- `docs/probe-data/fill-trace-u8-i-misc-b3s.json`
- `docs/probe-data/fill-trace-u8-i-misc-b3s-windows.json` — the third arm's detector bounds

Each bundle carries the reader trace, the sim credit schedule, its own regeneration commands, and the
result. The vitest replays all three and asserts `analyzeComp` still reproduces the committed result.

## 1. What was executed

Method section C, steps 1–5, with the three mandatory revisions:

- **R1** — the ≥50% clean-coverage drop rule is computed over the VISIBLE span (charging-bar paint →
  green-full), and `visibleFraction` is reported for every window.
- **R2** — an increment bridging an excluded run feeds the cumulative rate through the span endpoints
  but is excluded from the increment histogram and the surplus census, and is binned separately.
- **R3** — closure arithmetic against the measured per-cycle tempo gap is reported (§4).

**Window pairing.** A real refill window runs from a `fullWindows[].end` to the next non-null
`burstChains[].stage1`. It is paired with the sim's k-th `refill` credit window by ordinal — the k-th
refill of the fight on each side. A sim window truncated by the 180s buzzer, or a real window with no
sim counterpart, is reported `unpaired` and excluded.

**Whole-window definition used for the fraction mapping.** Both sides are `[Full-Burst end,
gauge-full]`: sim from the engine's own `fullBurstEnd` frame to its `burstCast stage 1` frame minus
`PRE_B1_GAP_FRAMES`; real from `fullWindows[].end` to the reader's green-full instant. Neither side
uses the `B1 − 0.5s` convention, which is itself under test. Declared as a choice the packet left
open — see §7.1.

**Clean-read set.** `state === 'filling'`, `fillRaw !== null`, and none of the reader's own flags
`lowFill / flash / inFlashSpan / spike / nonMonotonic / levelDrop / noDarkTrack / burstRender /
drainTail / chainRender / fullBurstDrain`.

## 2. Per-window results, per comp

_Emitted verbatim by `npx tsx scripts/probe/fill-trace-compare.ts tables <the three bundles>`._

### iron sweep (run G)

`d-killer-wife` · `milk-blooming-bunny` · `maxwell` · `takina` · `liberalio` — focus `maxwell`  
recording `/Users/maxwellsutton/nikke-sim/docs/probes/u8/u8 g vid.mov`  
widget lock (reader-reported, absolute frame coords): rows 491–498, x 2477–2610, 134px  
credit-schedule amounts trusted: **yes**

| win |          whole window (s) | visible span (s) | visibleFraction | clean-frame % | real clean-span rate (%/s) | sim same-fraction rate (%/s) |     R | bridged incs | surplus events | full−stage1 (s) | FBend→paint (s) | status                                                           |
| --: | ------------------------: | ---------------: | --------------: | ------------: | -------------------------: | ---------------------------: | ----: | -----------: | -------------: | --------------: | --------------: | :--------------------------------------------------------------- |
|   1 |   3.5503 (22.0667→25.617) |            2.034 |          0.5729 |            66 |                     49.126 |                       13.685 |  3.59 |            4 |              5 |          -0.033 |          1.5163 | ok                                                               |
|   2 |       3.883 (35.7→39.583) |              2.2 |          0.5666 |            69 |                      54.12 |                        19.42 | 2.787 |            0 |              7 |         -0.0337 |           1.683 | ok                                                               |
|   3 |   3.4163 (50.4167→53.833) |            2.483 |          0.7268 |            67 |                     35.043 |                       21.749 | 1.611 |            2 |              6 |         -0.0337 |          0.9333 | ok                                                               |
|   4 |      3.933 (63.95→67.883) |              2.3 |          0.5848 |            87 |                     39.332 |                       10.947 | 3.593 |            2 |              9 |         -0.0337 |           1.633 | ok                                                               |
|   5 |   4.1503 (77.9667→82.117) |            2.467 |          0.5944 |            79 |                     35.872 |                       27.635 | 1.298 |            2 |              7 |          -0.033 |          1.6833 | ok                                                               |
|   6 |         5.2 (92.25→97.45) |            3.583 |           0.689 |            92 |                     17.879 |                       19.802 | 0.903 |            0 |              5 |         -0.0333 |           1.617 | ok                                                               |
|   7 | 3.2997 (107.5333→110.833) |            1.633 |          0.4949 |            84 |                     57.864 |                       20.755 | 2.788 |            0 |              5 |         -0.0337 |          1.6667 | ok                                                               |
|   8 | 4.1003 (122.2167→126.317) |            2.484 |          0.6058 |            63 |                     41.952 |                       13.555 | 3.095 |            4 |              9 |         -0.0497 |          1.6163 | ok                                                               |
|   9 | 3.6337 (136.4833→140.117) |             2.05 |          0.5642 |            89 |                     45.564 |                       28.555 | 1.596 |            2 |              7 |          -0.033 |          1.5837 | ok                                                               |
|  10 | 3.3503 (150.9167→154.267) |            2.384 |          0.7116 |            88 |                     35.872 |                       20.105 | 1.784 |            3 |              8 |          -0.033 |          0.9663 | ok                                                               |
|  11 | 3.7003 (164.3667→168.067) |            2.034 |          0.5497 |            83 |                     43.972 |                            — |     — |            5 |              0 |          -0.033 |          1.6663 | unpaired — the paired sim window is truncated by the 180s buzzer |
|  12 |   6.1833 (178.1167→184.3) |            4.483 |           0.725 |            85 |                     20.392 |                            — |     — |            2 |              0 |           -0.05 |          1.7003 | unpaired — no sim refill window with this ordinal                |

**readable 10/12** · median R **2.285** · IQR **1.419** [1.6, 3.018]  
whole-window R (`[fbEnd, full]` anchor) 1.079, IQR 0.325 · whole-window R (`[barPaint, full]` anchor) 1.706, IQR 0.691 · opening R 0.307 · Pearson(R, visibleFraction) -0.544

Increment histogram (team-sum, 60fps; direct increments only per R2) — real 94 events at 4.48/s vs sim 59 at 2.615/s

| side |   n | min | p25 | p50 |  p75 |   p90 |  max | mean |   sum |
| :--- | --: | --: | --: | --: | ---: | ----: | ---: | ---: | ----: |
| real |  94 | 1.5 |   6 |   6 |  6.7 |   7.5 | 24.6 | 7.01 | 659.3 |
| sim  |  59 | 5.6 | 5.6 | 5.6 | 11.2 | 11.76 |   14 |  7.4 | 436.8 |

Bridged bin (R2 — excluded from the histogram and the surplus census): 19 increments, median 6%, median span 0.067s, 141.1% total.  
Surplus census: 0.5759 of real gauge; 0.7234 of events off-schedule against 0.5908 expected from chance alignment alone.

Boundary reads (method step 4d), all windows:

| read                                       | distribution                                        |
| :----------------------------------------- | :-------------------------------------------------- |
| green-full instant − stage-1 hexagon       | n=12 mean -0.0361 sd 0.0062 range [-0.05, -0.033]   |
| last burst render → charging-bar paint     | n=12 mean 0.0165 sd 0.0005 range [0.016, 0.017]     |
| `fullWindows[].end` → charging-bar paint   | n=12 mean 1.5221 sd 0.2606 range [0.9333, 1.7003]   |
| `fullWindows[].start` → charging-bar paint | n=12 mean 10.1860 sd 0.1907 range [9.9163, 10.3333] |

Instrument quality (H0b) — clean-set reads that fall more than 1.5% below a previous clean read, per window (violations/worst drop %): 1:21/40.3 2:0/0 3:0/0 4:0/0 5:0/0 6:0/0 7:0/0 8:47/14.2 9:0/0 10:19/9 11:87/65.7 12:0/0

Closure (R3), from measured widget instants only:  
real cycle 14.15s vs sim 16.1s ⇒ gap **1.95s/cycle**  
· refill: real 2.342s vs sim 4.233s ⇒ **1.891s** (97.0%)  
· ladder (gauge-full → next Full-Burst start): real 1.766s vs sim 1.8667s ⇒ **0.101s** (5.2%)  
· residual -0.042s ⇒ **102.2% closed**

### T5 wind-weak

`nayuta` · `cinderella-crystal-wave` · `anis-star` · `liberalio` · `velvet` — focus `anis-star`  
recording `/Users/maxwellsutton/nikke-sim/docs/probes/probe u7/13 fb count wind weak vid.MP4`  
widget lock (reader-reported, absolute frame coords): rows 491–498, x 2477–2610, 134px  
credit-schedule amounts trusted: **yes**

| win |          whole window (s) | visible span (s) | visibleFraction | clean-frame % | real clean-span rate (%/s) | sim same-fraction rate (%/s) |     R | bridged incs | surplus events | full−stage1 (s) | FBend→paint (s) | status                                            |
| --: | ------------------------: | ---------------: | --------------: | ------------: | -------------------------: | ---------------------------: | ----: | -----------: | -------------: | --------------: | --------------: | :------------------------------------------------ |
|   1 |   2.9663 (22.0667→25.033) |              1.4 |           0.472 |            73 |                     66.363 |                       37.451 | 1.772 |            5 |              0 |         -0.0503 |          1.5663 | ok                                                |
|   2 |   3.8337 (35.2333→39.067) |            2.284 |          0.5958 |            62 |                     52.706 |                       17.771 | 2.966 |            4 |              5 |          -0.033 |          1.5497 | ok                                                |
|   3 |   3.2163 (49.3167→52.533) |            1.683 |          0.5233 |            94 |                      42.97 |                       18.828 | 2.282 |            3 |              0 |         -0.0503 |          1.5333 | ok                                                |
|   4 |      2.933 (62.75→65.683) |              1.4 |          0.4773 |            59 |                     73.786 |                       28.381 |   2.6 |            4 |              0 |         -0.0503 |           1.533 | ok                                                |
|   5 |   6.2997 (75.8833→82.183) |             4.75 |           0.754 |            95 |                     17.999 |                       18.798 | 0.957 |            0 |              0 |         -0.0503 |          1.5497 | ok                                                |
|   6 |    3.4833 (92.2667→95.75) |            1.817 |          0.5216 |            91 |                      51.05 |                       43.802 | 1.165 |            1 |              0 |         -0.0333 |          1.6663 | ok                                                |
|   7 | 3.2163 (105.9167→109.133) |            1.633 |          0.5077 |            81 |                      47.75 |                       23.016 | 2.075 |            4 |              0 |         -0.0337 |          1.5833 | ok                                                |
|   8 | 4.1163 (119.2167→123.333) |            2.433 |          0.5911 |            56 |                         56 |                       45.435 | 1.233 |            2 |              0 |         -0.0503 |          1.6833 | ok                                                |
|   9 | 2.6337 (133.4833→136.117) |            1.017 |          0.3861 |            76 |                     66.836 |                       22.229 | 3.007 |            4 |              0 |         -0.0497 |          1.6167 | ok                                                |
|  10 |  3.0333 (146.9167→149.95) |            2.067 |          0.6814 |            62 |                     49.647 |                       32.443 |  1.53 |            5 |              0 |           -0.05 |          0.9663 | ok                                                |
|  11 |  3.6833 (160.2667→163.95) |            2.233 |          0.6062 |            68 |                     36.985 |                        8.611 | 4.295 |            5 |              6 |           -0.05 |          1.4503 | ok                                                |
|  12 |     2.217 (175.1→177.317) |             1.45 |           0.654 |            94 |                         56 |                            — |     — |            2 |              0 |          -0.033 |           0.767 | unpaired — no sim refill window with this ordinal |

**readable 11/12** · median R **2.075** · IQR **1.402** [1.381, 2.783]  
whole-window R (`[fbEnd, full]` anchor) 1.039, IQR 0.315 · whole-window R (`[barPaint, full]` anchor) 1.999, IQR 0.804 · opening R 0.337 · Pearson(R, visibleFraction) -0.312

Increment histogram (team-sum, 60fps; direct increments only per R2) — real 136 events at 6.968/s vs sim 40 at 1.972/s

| side |   n |  min |  p25 |  p50 |   p75 |   p90 |   max | mean |   sum |
| :--- | --: | ---: | ---: | ---: | ----: | ----: | ----: | ---: | ----: |
| real | 136 |  1.5 |  1.5 |  5.3 |  6.95 |    12 |  35.1 | 5.54 | 753.1 |
| sim  |  40 | 5.94 | 6.22 | 8.96 | 11.98 | 12.12 | 12.32 | 9.12 | 364.6 |

Bridged bin (R2 — excluded from the histogram and the surplus census): 37 increments, median 0.8%, median span 0.05s, 26% total.  
Surplus census: 0.0729 of real gauge; 0.0809 of events off-schedule against 0.0537 expected from chance alignment alone.

Boundary reads (method step 4d), all windows:

| read                                       | distribution                                        |
| :----------------------------------------- | :-------------------------------------------------- |
| green-full instant − stage-1 hexagon       | n=12 mean -0.0445 sd 0.0080 range [-0.0503, -0.033] |
| last burst render → charging-bar paint     | n=12 mean 0.0165 sd 0.0005 range [0.016, 0.017]     |
| `fullWindows[].end` → charging-bar paint   | n=12 mean 1.4554 sd 0.2730 range [0.767, 1.6833]    |
| `fullWindows[].start` → charging-bar paint | n=12 mean 10.1318 sd 0.2276 range [9.8997, 10.4837] |

Instrument quality (H0b) — clean-set reads that fall more than 1.5% below a previous clean read, per window (violations/worst drop %): 1:19/32.8 2:10/17.1 3:0/0 4:0/0 5:0/0 6:0/0 7:12/29.1 8:0/0 9:0/0 10:16/20.2 11:58/42.6 12:0/0

Closure (R3), from measured widget instants only:  
real cycle 13.567s vs sim 15.117s ⇒ gap **1.55s/cycle**  
· refill: real 1.817s vs sim 3.267s ⇒ **1.45s** (93.5%)  
· ladder (gauge-full → next Full-Burst start): real 1.766s vs sim 1.8667s ⇒ **0.101s** (6.5%)  
· residual -0.001s ⇒ **100.0% closed**

### misc B3s (run I order)

`grave` · `anis-star` · `jill` · `chisato` · `noir` — focus `jill`  
recording `/Users/maxwellsutton/nikke-sim/docs/probes/u8/u8 i vid.mov`  
widget lock (reader-reported, absolute frame coords): rows 491–498, x 2477–2610, 134px  
credit-schedule amounts trusted: **NO** — credit-schedule endpoint check FAILED; credit-schedule DBG_GAUGE check FAILED; unreconstructed: noir: SG spray — the per-band LANDED-pellet gauge fraction is resolved inside firePull and is not on the event tap, so its shot credits are approximated at a full trigger

| win |          whole window (s) | visible span (s) | visibleFraction | clean-frame % | real clean-span rate (%/s) | sim same-fraction rate (%/s) |   R | bridged incs | surplus events | full−stage1 (s) | FBend→paint (s) | status                                                           |
| --: | ------------------------: | ---------------: | --------------: | ------------: | -------------------------: | ---------------------------: | --: | -----------: | -------------: | --------------: | --------------: | :--------------------------------------------------------------- |
|   1 |    3.6167 (25.1333→28.75) |            1.967 |          0.5439 |            75 |                     51.397 |                            — |   — |            0 |              0 |         -0.0333 |          1.6497 | ok                                                               |
|   2 |   3.8837 (38.8333→42.717) |            2.217 |          0.5708 |            77 |                     50.941 |                            — |   — |            0 |              0 |          -0.033 |          1.6667 | ok                                                               |
|   3 |   4.0663 (52.8167→56.883) |            2.383 |           0.586 |            87 |                     22.558 |                            — |   — |            2 |              0 |         -0.0503 |          1.6833 | ok                                                               |
|   4 |   3.2997 (67.0833→70.383) |            1.733 |          0.5252 |            78 |                     55.333 |                            — |   — |            0 |              0 |         -0.0337 |          1.5667 | ok                                                               |
|   5 |    5.8833 (80.5667→86.45) |              4.3 |          0.7309 |            44 |                          — |                            — |   — |            0 |              0 |         -0.0333 |          1.5833 | dropped — clean coverage 44% of the visible span < 50%           |
|   6 |  3.6663 (96.6167→100.283) |            2.083 |          0.5681 |            79 |                     54.727 |                            — |   — |            0 |              0 |         -0.0503 |          1.5833 | ok                                                               |
|   7 |  3.7833 (110.3667→114.15) |            2.117 |          0.5596 |            85 |                     48.944 |                            — |   — |            0 |              0 |         -0.0333 |          1.6663 | ok                                                               |
|   8 | 2.9503 (124.9667→127.917) |            2.017 |          0.6837 |            89 |                     46.046 |                            — |   — |            0 |              0 |         -0.0497 |          0.9333 | ok                                                               |
|   9 |   3.1167 (138.6833→141.8) |              2.1 |          0.6738 |            94 |                     35.282 |                            — |   — |            0 |              0 |         -0.0333 |          1.0167 | ok                                                               |
|  10 |         3.55 (152→155.55) |            1.983 |          0.5586 |            86 |                     51.824 |                            — |   — |            0 |              0 |           -0.05 |           1.567 | ok                                                               |
|  11 | 4.2663 (165.7167→169.983) |            2.683 |          0.6289 |            90 |                     37.042 |                            — |   — |            0 |              0 |         -0.0337 |          1.5833 | ok                                                               |
|  12 | 3.1997 (180.7833→183.983) |            2.266 |          0.7082 |            81 |                     37.438 |                            — |   — |            1 |              0 |         -0.0337 |          0.9337 | unpaired — the paired sim window is truncated by the 180s buzzer |

**readable 10/12** · median R **—** · IQR **—** [—, —]  
whole-window R (`[fbEnd, full]` anchor) —, IQR — · whole-window R (`[barPaint, full]` anchor) —, IQR — · opening R — · Pearson(R, visibleFraction) —

Increment histogram, surplus census and every R figure: **VOID on this arm** — the credit-schedule instrument disowned its own amounts here, so there is no sim side to compare against. The real-side event stream is still measured (166 direct events at 9.171/s) but has no counterpart, and is NOT reported as a comparison.

Boundary reads (method step 4d), all windows:

| read                                       | distribution                                        |
| :----------------------------------------- | :-------------------------------------------------- |
| green-full instant − stage-1 hexagon       | n=12 mean -0.0390 sd 0.0079 range [-0.0503, -0.033] |
| last burst render → charging-bar paint     | n=12 mean 0.0168 sd 0.0004 range [0.016, 0.017]     |
| `fullWindows[].end` → charging-bar paint   | n=12 mean 1.4528 sd 0.2872 range [0.9333, 1.6833]   |
| `fullWindows[].start` → charging-bar paint | n=12 mean 10.2194 sd 0.1785 range [9.9, 10.35]      |

Instrument quality (H0b) — clean-set reads that fall more than 1.5% below a previous clean read, per window (violations/worst drop %): 1:0/0 2:0/0 3:104/91.1 4:0/0 5:0/0 6:0/0 7:0/0 8:0/0 9:0/0 10:0/0 11:0/0 12:8/4.5

Closure (R3), from measured widget instants only:  
real cycle 13.867s vs sim 15.15s ⇒ gap **1.283s/cycle**  
· refill: real 2.091s vs sim 3.317s ⇒ **1.225s** (95.5%)  
· ladder (gauge-full → next Full-Burst start): real 1.75s vs sim 1.8667s ⇒ **0.117s** (9.1%)  
· residual -0.059s ⇒ **104.6% closed**

## 3. The pre-committed decision rule, applied

The rule's input statistic is the median of per-window `R` — real clean-span rate ÷ sim schedule rate
over the same relative span — per comp, over readable windows. Its falsification/basis clause is
evaluated first, as written: _"if <6 readable windows per comp, or per-window R dispersion IQR > 0.5,
the instrument basis is insufficient — verdict CANNOT-MEASURE, and the deliverable states which limit
bound it."_

| comp               | readable windows | floor (≥6) | median R |     R IQR | ceiling (≤0.5) |
| :----------------- | ---------------: | :--------- | -------: | --------: | :------------- |
| iron sweep (run G) |               10 | ✓          |    2.285 | **1.419** | ✗              |
| T5 wind-weak       |               11 | ✓          |    2.075 | **1.402** | ✗              |

**Branch fired: CANNOT-MEASURE.** Both comps clear the readable-window floor; both blow the
dispersion ceiling by ~2.8×. Per the rule, **no classification is stamped** — H-A / H-B / H-C shares
are not reported as a classification, and neither the CONFIRM (R ≥ 1.3 both comps) nor the
NOT-IN-WINDOW (R < 1.15 both comps) branch is reached, even though the medians sit above 1.3. The
increment histograms and surplus censuses in §2 are raw method output (steps 4b/4c), not a
classification.

**Which limit bound it — instrument limit (iii), the blind spot at every window start.** The
dispersion is structural, not noise, and three independent readings localize it:

1. **The two sides have inverted shapes.** Over the reader-blind opening the real bar accumulates far
   less than the sim schedule credits over the same fraction: median opening R **0.307**
   (iron sweep (run G)) / **0.337** (T5 wind-weak). Over the visible tail the ordering reverses
   (median R 2.285 / 2.075). The sim front-loads its credits; the real trace back-loads.
2. **R falls as the visible fraction grows.** Pearson(R, `visibleFraction`) = **−0.544**
   (iron sweep (run G)) / **−0.312** (T5 wind-weak). `visibleFraction` itself ranges 0.386–0.754
   across windows, because the blind spot's length varies (0.767–1.700s). With inverted shapes,
   _which_ fraction happened to be visible largely sets R — so R's per-window variance is dominated
   by an instrument property rather than by a generation difference.
3. **The same ratio over the WHOLE window is far tighter.** `[fbEnd, full]`-anchored whole-window R:
   1.079 IQR 0.325 (iron sweep (run G)) / 1.039 IQR 0.315 (T5 wind-weak) — both inside the 0.5
   dispersion ceiling that the fraction-mapped statistic fails.

**H0b's other control — the surplus census has no discriminating power at these credit densities.**
Off-schedule event share against the share uniform-random placement alone would produce:
**0.723 vs 0.591** (iron sweep (run G)) and **0.081 vs 0.054** (T5 wind-weak). The observed shares
track the chance baseline on both comps, and the two comps sit at opposite ends of it; the census
separates nothing here. The baseline is the fraction of each mapped sim span already lying within
±5 frames of some scheduled credit, reported per window in the bundles as `alignmentCoverage`.

## 4. Whole-picture closure arithmetic (R3)

R3 scopes closure reporting to the CONFIRM branch. It is reported here regardless, because the
question closure answers — does the per-cycle tempo gap add up — is what tells a reader whether a
CANNOT-MEASURE verdict on `R` leaves the gap unexplained or merely un-decomposed by that statistic.

The closure uses **only widget state transitions and detector instants — never a fill percentage** —
so it is immune to every reader limitation in §3 and to the monotonicity violations in §2.

| arm                    | real cycle | sim cycle |  gap/cycle | refill component | ladder component | residual |     closed |
| :--------------------- | ---------: | --------: | ---------: | ---------------: | ---------------: | -------: | ---------: |
| iron sweep (run G)     |    14.150s |   16.100s | **1.950s** |   1.891s (97.0%) |    0.101s (5.2%) |  −0.042s | **102.2%** |
| T5 wind-weak           |    13.567s |   15.117s | **1.550s** |   1.450s (93.5%) |    0.101s (6.5%) |  −0.001s | **100.0%** |
| misc B3s (run I order) |    13.867s |   15.150s | **1.283s** |   1.225s (95.5%) |    0.117s (9.1%) |  −0.059s | **104.6%** |

Definitions, all measured:

- **real cycle** = `barPaint(k+1) − barPaint(k)`. The charging bar's first paint follows the last
  burst-render frame by exactly one frame on every window of every recording (mean 0.0165–0.0168s,
  sd 0.0005s, n=36), so both endpoints are frame-precise.
- **sim cycle** = successive `refill` window starts, i.e. the engine's own `fullBurstEnd` frames.
- **refill component** = median sim whole refill window − median real `[barPaint, green-full]` span.
- **ladder component** = modeled `112f = 1.8667s` (30f + 30f + 30f + 22f) − median real
  `barPaint(k+1) − 10s − greenFull(k)`.
- **residual** = gap − refill − ladder. The Full-Burst length cancels out of this decomposition
  algebraically — the real cycle equals `visibleSpan + (barPaint(k+1) − greenFull(k))`, which
  contains no Full-Burst term — so the owner-pinned 10s moves only the Full-Burst↔ladder split,
  never the refill component and never the residual.

Two boundary reads carry this and stand as measurements in their own right:

- **`fullWindows[].start` → charging-bar paint = 10.186 / 10.132 / 10.219s** (means; sd 0.18–0.23,
  n=12 each, full range 9.90–10.48 across all three recordings). This is measured entirely on the
  recording, with no sim input, and it matches the owner-pinned 10s Full Burst. Read together with
  the `fullWindows[].end` → paint delay of 1.45–1.52s, it places the end of Full Burst at the
  charging bar's first paint rather than at the drain bar emptying. The bar paints at 0.0% and holds
  ~0 for its first frames, so nothing was banked while the burst render owned the widget slot.
- **green-full instant − stage-1 hexagon = −0.0361 / −0.0445 / −0.0390s** (means; sd 0.006–0.008,
  n=12 each, range −0.050 to −0.033). Reproduced on a third recording and on a span selection made
  independently of the reader's own validation, which reported −0.032 / −0.051.
  **Against risk flag (i):** the total ladder is NOT short by the 0.42–0.48s that a 2–3 frame
  pre-stage-1 gap would imply against `PRE_B1_GAP_FRAMES = 30f`. Measured total gauge-full → next
  Full-Burst start is 1.750–1.766s against the modeled 1.8667s — a 0.101–0.117s difference, 5.2–9.1%
  of the per-cycle gap. The 0.467s absent before stage 1 reappears between stage 3 and the Full Burst
  (iron sweep (run G) window 1: 0.033 + 0.550 + 0.500 + 0.683 = 1.766s, against modeled
  0.500 + 0.500 + 0.500 + 0.367 = 1.867s). This is a logged read against a frame-measured constant,
  not grounds to refit it.

**Re-anchored rate ratio (not pre-committed, reported as a measurement).** Anchoring the real
generating window on `[barPaint, green-full]` instead of `[fullWindows[].end, green-full]` gives
whole-window R = **1.706** IQR 0.691 (iron sweep (run G)) / **1.999** IQR 0.804 (T5 wind-weak). Both
still exceed the 0.5 dispersion ceiling; neither is the rule's input statistic; neither is offered as
a substitute verdict.

## 5. The optional third arm and the `liberalio` confound

The third arm ran: `misc B3s (run I order)` = `grave` · `anis-star` · `jill` (focus) · `chisato` ·
`noir`, recording `docs/probes/u8/u8 i vid.mov`, freshly cycle-scanned (13/13 Full Bursts, every one
corroborated by a 2nd detector). `liberalio` is absent from it and present in both primary comps.

**Its credit-schedule amounts are void.** The instrument refused them loudly: endpoint check FAILED,
DBG_GAUGE check FAILED, and `unreconstructed` non-empty — _"noir: SG spray — the per-band
LANDED-pellet gauge fraction is resolved inside firePull and is not on the event tap, so its shot
credits are approximated at a full trigger."_ Every rate / R / histogram / surplus figure for this arm
is emitted as `—` by an explicit guard, not by omission.

**Its window bounds survive**, because they come from the engine's own `fullBurstEnd` and
`burstCast stage 1` events rather than from the amount reconstruction. So the third arm bounds the
`liberalio` confound **at the closure level only**: the same decomposition holds on a
`liberalio`-free comp (95.5% refill, 9.1% ladder, 104.6% closed). It does **not** bound the confound
at the level of the `R` statistic or the increment structure. Risk flag (iii) is therefore partially,
not fully, discharged — and the primary verdict does not rest on this arm either way.

## 6. Basis-clause checks

| check                                            | result                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| :----------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H0c — roster identity, iron sweep (run G)        | `d-killer-wife` · `milk-blooming-bunny` · `maxwell` · `takina` · `liberalio`, focus `maxwell` — matches the packet's stated comp exactly (the `slugsOverride` path)                                                                                                                                                                                                                                                                                            |
| H0c — roster identity, T5 wind-weak              | `nayuta` · `cinderella-crystal-wave` · `anis-star` · `liberalio` · `velvet`, focus `anis-star` — matches                                                                                                                                                                                                                                                                                                                                                       |
| H0c — roster identity, misc B3s (run I order)    | `grave` · `anis-star` · `jill` · `chisato` · `noir`, focus `jill` — matches                                                                                                                                                                                                                                                                                                                                                                                    |
| Reader lock                                      | 134px, rows 491–498, x 2477–2610 on all three recordings — identical to the instrument's committed validation; the width gate never warned                                                                                                                                                                                                                                                                                                                     |
| Credit-schedule self-checks, primary comps       | endpoint residual 0.0; DBG_GAUGE 31/31 and 341/341 matched; 20/20 truncated-run samples; prefix determinism asserted; `unreconstructed` empty                                                                                                                                                                                                                                                                                                                  |
| Credit-schedule self-checks, third arm           | endpoint FAILED, DBG_GAUGE FAILED, `unreconstructed` non-empty — amounts voided (§5)                                                                                                                                                                                                                                                                                                                                                                           |
| Readable-window floor (≥6)                       | iron sweep (run G) 10/12, T5 wind-weak 11/12, misc B3s (run I order) 10/12 — all clear                                                                                                                                                                                                                                                                                                                                                                         |
| R-dispersion ceiling (IQR ≤0.5)                  | iron sweep (run G) 1.419, T5 wind-weak 1.402 — both FAIL                                                                                                                                                                                                                                                                                                                                                                                                       |
| Windows dropped by the R1 coverage rule          | one — misc B3s (run I order) window 5, 44% clean over its visible span                                                                                                                                                                                                                                                                                                                                                                                         |
| Windows excluded as unpaired                     | iron sweep (run G) 2 (one truncated sim window, one with no sim ordinal), T5 wind-weak 1, misc B3s (run I order) 1                                                                                                                                                                                                                                                                                                                                             |
| Clean-set monotonicity violations                | reported per window in §2. Worst: misc B3s (run I order) window 3 (104 violations, 91.1% worst drop, and the lowest real rate on that arm at 22.558 %/s); iron sweep (run G) window 11 (87 / 65.7, `unpaired` anyway); T5 wind-weak window 11 (58 / 42.6). 24 of the 36 windows have zero. The §4 closure reads no fill percentage and is unaffected.                                                                                                          |
| Inherited `scan-frames.py` defects (STATE.md §7) | both inherited by `fullWindows[].start` / `.end`. Visible in the data: `fullWindows[].end` → bar paint spans 0.767–1.700s where the widget-side transition is a constant 1 frame, so the spread is the detector's, not the widget's, and the short values cluster on cycles the fixtures flag `tailStitched`. This widens `wholeWindowSec` dispersion and therefore the pre-committed `R`; it does not touch the `[barPaint, green-full]` span or the closure. |

## 7. Deviations and additions, declared

1. **The packet did not fix the real window's endpoints.** It specifies "sim window mapped by
   fraction-of-window" but not what the real whole window is. `[fullWindows[].end, green-full]` was
   used, chosen as the like-for-like of the sim's own `[Full-Burst end, gauge-full]`. Other
   admissible choices — the `B1 − 0.5s` convention, or a `barPaint` anchor — change the reported `R`;
   both alternatives appear in §2/§4. The CANNOT-MEASURE branch fires on every one of them, since all
   have IQR > 0.5.
2. **Diagnostics added beyond the method**, none of which feeds the decision rule: whole-window R at
   two anchorings, opening R, Pearson(R, `visibleFraction`), the chance-alignment baseline for the
   surplus census, the clean-set monotonicity census, and the §4 closure decomposition.
3. **`spike` and `levelDrop` were treated as dirty flags.** The method names "lowFill / gain-pulse /
   nonMonotonic / occlusion per the reader's committed flag taxonomy"; both are in that taxonomy and
   both mark reads the reader itself does not stand behind.
4. **Surplus-census alignment axis.** Real events are matched to scheduled credits on the
   fraction-mapped axis, since the two sides run at different tempos and share no absolute axis; the
   ±5-frame tolerance is applied there.
5. **The third arm's amount-derived statistics are void** (§5), so the `liberalio` confound is
   bounded only at the closure level.
6. **Nothing was enacted.** No engine constant, override, snapshot, `DECISIONS.md` entry,
   `STATE.md` entry or default was changed. The only tree changes are the new comparison tool, its
   vitest, and the `docs/probe-data/` artifacts.

## 8. What this measurement cannot establish

Per-unit attribution (the trace is the team sum); absolute low-fill levels; the magnitude of any
single fill step; anything about shotgun-seated comps beyond the third arm's voided amounts; the
game's internal gauge-full instant (only render-relative offsets); and — on the pre-committed
statistic — whether in-window per-hit crediting differs, which is exactly what CANNOT-MEASURE says.
