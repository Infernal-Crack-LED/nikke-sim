# JUDGE-READY DELIVERABLE — burst-cycle tempo gap (2026-08-13)

> Work-subagent output, saved VERBATIM. The blind post-op judge reads this file plus the pre-op packet
> (`2026-08-13-tempo-gap-preop-packet.md`) and nothing else. No driver verdict or reasoning appears here.

Plan executed: `docs/handoffs/2026-08-13-tempo-gap-preop-packet.md`.
All measurement run from the main tree `/Users/maxwellsutton/nikke-sim`. No code, data, override, or
snapshot was edited.

---

## 1. INSTRUMENT SELF-CHECK (PART G)

Instrument: `scripts/probe/scan.ts` (+ `scripts/probe/scan-frames.py`).

| video                                                               | in scanner's labeled 8/8 set?                                          | criterion                         | scanner FB count (`--fps 20`) | (`--fps 60`)  | detectors drain / splash / hex | corroborated | orphans | result   |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------- | ----------------------------- | ------------- | ------------------------------ | ------------ | ------- | -------- |
| `docs/probes/probe u7/13 fb count wind weak vid.MP4` (T5 wind-weak) | **YES** — docs/probe-runs.md:1655-1665, measured 13, scan.ts 13, 13/13 | exactly 13, all corroborated      | **13** (`--expect 13` → PASS) | **13** (PASS) | 13 / 13 / 13                   | 13/13        | 0       | **PASS** |
| `docs/probes/u8/u8 g vid.mov` (PG iron sweep run G)                 | **NO** — hand label refuted by the premise gate as a coarse "13–14"    | count ∈ {13,14}, all corroborated | **13**                        | **13**        | 13 / 13 / 13                   | 13/13        | 0       | **PASS** |

`gaugeMissing=false` on both (default crop valid, as the premise gate found). No `min gap` warning, no
`max gap > 2×min` warning on either video at either sampling rate.

**Deviation from PART E, stated up front:** the plan called for `--fps 20` full-length plus `--fps 60`
on _windows containing each burst chain_. Guard 3b needs each window's END (~8.7s after its start), so
the 13 windows would have tiled the whole video anyway. Full-length `--fps 60` measured at **24s
wall-clock per video** — cheaper than 13 windowed decodes and a strict superset of the windowed data. I
ran full-length at both 20 and 60fps. The two agree: middle-60% mean period 14.35s (fps20) vs 14.388s
(fps60) on iron; 13.863s vs 13.808s on T5. All reported numbers below are the fps-60 ones.

---

## 2. RAW PER-CYCLE TABLES

### 2a. PG iron sweep (boss Electric) — REAL, `u8 g vid.mov`, fps 60

`fbStart` = drain-window start. `Q` = guard-3a qualifying. All times are VIDEO time (every quantity is a
within-video difference; no `--t0` anchor enters anything — PART G anchor-free control).

| i   | fbStart | period | s1      | s2      | s3      | ladder s1→fb | fb→next s1 | drainDur (nominal) | fbStart−(s3+22f) | Q   |
| --- | ------- | ------ | ------- | ------- | ------- | ------------ | ---------- | ------------------ | ---------------- | --- |
| 1   | 13.667  | –      | –       | 12.400  | 12.900  | –            | 11.983     | 8.40               | +0.400           | .   |
| 2   | 27.050  | 13.383 | 25.650  | 26.200  | 26.700  | 1.400        | 12.567     | 8.65               | −0.017           | Q   |
| 3   | 41.017  | 13.967 | 39.617  | 40.167  | 40.667  | 1.400        | 12.850     | 9.40               | −0.017           | Q   |
| 4   | 55.267  | 14.250 | 53.867  | 54.417  | 54.917  | 1.400        | 12.650     | 8.68               | −0.017           | Q   |
| 5   | 69.733  | 14.467 | 67.917  | 68.467  | 68.967  | 1.817        | 12.417     | 8.23               | +0.400           | .   |
| 6   | 83.550  | 13.817 | 82.150  | 82.700  | 83.200  | 1.400        | 13.933     | 8.70               | −0.017           | Q   |
| 7   | 98.883  | 15.333 | 97.483  | 98.033  | 98.533  | 1.400        | 11.983     | 8.65               | −0.017           | Q   |
| 8   | 113.517 | 14.633 | 110.867 | 112.667 | 113.167 | **2.650**    | 12.850     | 8.70               | −0.017           | Q   |
| 9   | 127.750 | 14.233 | 126.367 | 126.900 | 127.400 | 1.383        | 12.400     | 8.73               | −0.017           | Q   |
| 10  | 141.967 | 14.217 | 140.150 | 140.700 | 141.200 | 1.817        | 12.333     | 8.95               | +0.400           | .   |
| 11  | 156.117 | 14.150 | 154.300 | 154.850 | 155.350 | 1.817        | 11.983     | 8.25               | +0.400           | .   |
| 12  | 169.500 | 13.383 | 168.100 | 168.650 | 169.150 | 1.400        | 14.850     | 8.62               | −0.017           | Q   |
| 13  | 186.200 | 16.700 | 184.350 | 185.350 | 185.850 | 1.850        | –          | 4.25 (video end)   | −0.017           | Q   |

Outlier cycles: **8** (s1→s2 = 1.800s instead of 0.550s — a 1.25s chain stretch at ~111s) and **13**
(s1→s2 = 1.000s at ~184s); period **7** = 15.333s and period **13** = 16.700s.

### 2b. PG iron sweep — SIM, footage slot order (PART C)

`['d-killer-wife','milk-blooming-bunny','maxwell','takina','liberalio']`, `focus` unset → middle slot =
**`maxwell`** (as the footage requires). `SEEDS=1`, `seed=undefined`. **11 full bursts.** Rotation-log
times are printed to 0.1s.

| i   | fbStart | period | s1    | s2    | s3    | ladder  | fb→next s1 | fbDur |
| --- | ------- | ------ | ----- | ----- | ----- | ------- | ---------- | ----- |
| 1   | 5.7     | –      | 4.4   | 4.9   | 5.4   | 1.3     | 14.8       | 10.0  |
| 2   | 21.8    | 16.1   | 20.5  | 21.0  | 21.5  | 1.3     | 15.7       | 10.0  |
| 3   | 38.9    | 17.1   | 37.5  | 38.0  | 38.5  | 1.4     | 14.1       | 10.0  |
| 4   | 54.4    | 15.5   | 53.0  | 53.5  | 54.0  | 1.4     | 15.3       | 10.0  |
| 5   | 71.9    | 17.5   | 69.7  | 71.0  | 71.5  | **2.2** | 13.9       | 10.0  |
| 6   | 87.1    | 15.2   | 85.8  | 86.3  | 86.8  | 1.3     | 14.8       | 10.0  |
| 7   | 103.2   | 16.1   | 101.9 | 102.4 | 102.9 | 1.3     | 14.8       | 10.0  |
| 8   | 119.3   | 16.1   | 118.0 | 118.5 | 119.0 | 1.3     | 14.6       | 10.0  |
| 9   | 135.2   | 15.9   | 133.9 | 134.4 | 134.9 | 1.3     | 14.1       | 10.0  |
| 10  | 150.6   | 15.4   | 149.3 | 149.8 | 150.3 | 1.3     | 15.1       | 10.0  |
| 11  | 167.1   | 16.5   | 165.7 | 166.2 | 166.7 | 1.4     | –          | 10.0  |

Sim outlier: cycle **5**, ladder 2.2s (s1→s2 = 1.3s) — the 70s boss-transition cast block
(sim.ts:3446-3452, transitions 33/70/106/144/176s).
`decomposeCycles()`: `fbDur=10.000 chain=1.300 floor=11.800 observed=16.050 excess=4.250`
(premise-gate-corrected refill ≈ **4.133**).

### 2c. T5 wind-weak (boss Iron) — REAL, `13 fb count wind weak vid.MP4`, fps 60

| i   | fbStart | period     | s1      | s2      | s3      | ladder s1→fb | fb→next s1 | drainDur (nominal) | fbStart−(s3+22f) | Q   |
| --- | ------- | ---------- | ------- | ------- | ------- | ------------ | ---------- | ------------------ | ---------------- | --- |
| 1   | 13.717  | –          | –       | 12.450  | 12.950  | –            | 11.367     | 8.35               | +0.400           | .   |
| 2   | 26.883  | 13.167     | 25.083  | 25.617  | 26.117  | 1.800        | 12.217     | 8.35               | +0.400           | .   |
| 3   | 40.917  | 14.033     | 39.100  | 39.650  | 40.150  | 1.817        | 11.667     | 8.40               | +0.400           | .   |
| 4   | 53.967  | 13.050     | 52.583  | 53.117  | 53.617  | 1.383        | 11.767     | 8.78               | −0.017           | Q   |
| 5   | 67.533  | 13.567     | 65.733  | 66.267  | 66.767  | 1.800        | 14.700     | 8.35               | +0.400           | .   |
| 6   | 84.033  | **16.500** | 82.233  | 82.767  | 83.267  | 1.800        | 11.750     | 8.23               | +0.400           | .   |
| 7   | 97.600  | 13.567     | 95.783  | 96.333  | 96.833  | 1.817        | 11.567     | 8.32               | +0.400           | .   |
| 8   | 110.567 | 12.967     | 109.167 | 109.717 | 110.217 | 1.400        | 12.817     | 8.65               | −0.017           | Q   |
| 9   | 124.767 | 14.200     | 123.383 | 123.917 | 124.417 | 1.383        | 11.400     | 8.72               | −0.017           | Q   |
| 10  | 137.550 | 12.783     | 136.167 | 136.700 | 137.200 | 1.383        | 12.450     | 9.37               | −0.017           | Q   |
| 11  | 151.383 | 13.833     | 150.000 | 150.533 | 151.033 | 1.383        | 12.617     | 8.88               | −0.017           | Q   |
| 12  | 165.383 | 14.000     | 164.000 | 164.417 | 165.033 | 1.383        | 11.967     | 9.72               | −0.017           | Q   |
| 13  | 178.800 | 13.417     | 177.350 | 177.900 | 178.433 | 1.450        | –          | 8.87               | 0.000            | Q   |

Outlier: period **6** = 16.500s (+2.9s vs typical ~13.6s) at ~84s.

### 2d. T5 wind-weak — SIM (comp as defined in `scripts/experiment.ts`), `SEEDS=1`. **12 full bursts.**

| i   | fbStart | period | s1    | s2    | s3    | ladder  | fb→next s1 | fbDur |
| --- | ------- | ------ | ----- | ----- | ----- | ------- | ---------- | ----- |
| 1   | 5.8     | –      | 4.4   | 4.9   | 5.4   | 1.4     | 13.7       | 10.0  |
| 2   | 20.9    | 15.1   | 19.5  | 20.0  | 20.5  | 1.4     | 15.4       | 10.0  |
| 3   | 37.7    | 16.8   | 36.3  | 36.8  | 37.3  | 1.4     | 14.0       | 10.0  |
| 4   | 53.1    | 15.4   | 51.7  | 52.2  | 52.7  | 1.4     | 13.5       | 10.0  |
| 5   | 68.0    | 14.9   | 66.6  | 67.1  | 67.6  | 1.4     | 14.8       | 10.0  |
| 6   | 84.2    | 16.2   | 82.8  | 83.3  | 83.8  | 1.4     | 12.9       | 10.0  |
| 7   | 98.5    | 14.3   | 97.1  | 97.6  | 98.1  | 1.4     | 13.6       | 10.0  |
| 8   | 113.5   | 15.0   | 112.1 | 112.6 | 113.1 | 1.4     | 13.8       | 10.0  |
| 9   | 128.6   | 15.1   | 127.3 | 127.8 | 128.3 | 1.3     | 15.0       | 10.0  |
| 10  | 145.9   | 17.3   | 143.6 | 145.0 | 145.5 | **2.3** | 13.6       | 10.0  |
| 11  | 160.9   | 15.0   | 159.5 | 160.0 | 160.5 | 1.4     | 16.9       | 10.0  |
| 12  | 179.2   | 18.3   | 177.8 | 178.3 | 178.8 | 1.4     | –          | 10.0  |

Sim outlier: cycle **10**, ladder 2.3s — the 144s boss-transition cast block.
`decomposeCycles()`: `fbDur=10.000 chain=1.400 floor=11.900 observed=15.457 excess=3.557`
(corrected refill ≈ **3.443**).

---

## 3. STEADY-STATE STATISTICS (same middle-60% rule both sides)

`decomposeCycles()`'s own rule applied to each side's own cycle count: `lo=floor(n·0.2)`,
`hi=ceil(n·0.8)`, periods = `fb[i]−fb[i−1]` for `lo<i<hi`. Real n=13 → lo=2, hi=11 → **8 periods**. Sim
iron n=11 → 6 periods; sim T5 n=12 → 7 periods.

### PERIOD

| comp         | side | periods (middle 60%)                                           | mean       | median | sd    |
| ------------ | ---- | -------------------------------------------------------------- | ---------- | ------ | ----- |
| iron sweep   | REAL | 14.250, 14.467, 13.817, 15.333, 14.633, 14.233, 14.217, 14.150 | **14.388** | 14.242 | 0.421 |
| iron sweep   | SIM  | 15.5, 17.5, 15.2, 16.1, 16.1, 15.9                             | **16.050** | 16.000 | –     |
| T5 wind-weak | REAL | 13.050, 13.567, 16.500, 13.567, 12.967, 14.200, 12.783, 13.833 | **13.808** | 13.567 | 1.110 |
| T5 wind-weak | SIM  | 15.4, 14.9, 16.2, 14.3, 15.0, 15.1, 17.3                       | **15.457** | 15.100 | –     |

**Period gap (sim − real): iron +1.662s, T5 +1.649s.** Directions agree; magnitudes differ by 0.013s.

Robustness of the gap to the statistic and window (none of these are the pre-committed number; they are
sensitivity only):

- median-based: iron +1.758s, T5 +1.533s
- all-cycles `(last−first)/(n−1)`: iron real 14.378 vs sim 16.140 → **+1.762s**; T5 real 13.757 vs sim
  15.764 → **+2.007s**
- alternative real spine, **stage-3 hexagon onsets** instead of drain starts (immune to the drain-start
  artifact in §6): iron real 14.335 (gap +1.715), T5 real 13.860 (gap +1.597)
- alternative real spine, **stage-1 onsets**: iron 14.335, T5 13.862

### LADDER (stage1 → FB start)

Sim exact value by construction: `STAGE_CAST_GAP 30f + 30f + FB_PRE_DELAY 22f = 82f = **1.3667s**` (the
log's 1.3/1.4 is 0.1s print rounding). Real, restricted to guard-3a-qualifying cycles (FB-start
trustworthy):

| comp         | real ladder values (Q cycles)                                     | mean  | median    | vs sim 1.3667 |
| ------------ | ----------------------------------------------------------------- | ----- | --------- | ------------- |
| iron sweep   | 1.400, 1.400, 1.400, 1.400, 1.400, **2.650**, 1.383, 1.400, 1.850 | 1.587 | **1.400** | **+0.033s**   |
| T5 wind-weak | 1.383, 1.400, 1.383, 1.383, 1.383, 1.383, 1.450                   | 1.395 | **1.383** | **+0.017s**   |

(Median is the right comparand: `decomposeCycles()` itself uses the median `chain`, and both sides carry
chain-stretch outliers from cast blocks.)

Sub-span decomposition, real medians on Q cycles vs the engine constants:

| span        | sim          | real iron   | real T5     |
| ----------- | ------------ | ----------- | ----------- |
| s1→s2       | 0.5000 (30f) | 0.550 (33f) | 0.533 (32f) |
| s2→s3       | 0.5000 (30f) | 0.500 (30f) | 0.500 (30f) |
| s3→FB start | 0.3667 (22f) | 0.350 (21f) | 0.350 (21f) |
| **total**   | **1.3667**   | **1.400**   | **1.383**   |

### FB-start → next stage1 (the indivisible FB-end + refill + pre-B1 span)

| comp         | real (Q cycles, mean / median)       | sim (mean over the same middle-window cycles) |
| ------------ | ------------------------------------ | --------------------------------------------- |
| iron sweep   | 13.010 / 12.850 (all cycles: 12.733) | 14.583                                        |
| T5 wind-weak | 12.169 / 12.450 (all cycles: 12.190) | 14.100                                        |

**Gap location (PART F prediction 3):** period gap = ladder gap + span gap. Ladder gap is **−0.033s
(iron) / −0.017s (T5)** (real ladder is _longer_, i.e. it contributes nothing to the gap and slightly
against it). Therefore **100%+ of the period gap sits in the FB-start → next-stage-1 span**: iron
1.695s, T5 1.665s. Ladder share of the gap: **−2.0% (iron) / −1.0% (T5)**.

### Real vs sim `excess` (refill beyond the mechanical floor), holding the sim's floor

| comp         | sim floor | sim observed | sim excess          | real observed | real observed − sim floor |
| ------------ | --------- | ------------ | ------------------- | ------------- | ------------------------- |
| iron sweep   | 11.800    | 16.050       | 4.250 (corr. 4.133) | 14.388        | **2.588**                 |
| T5 wind-weak | 11.900    | 15.457       | 3.557 (corr. 3.443) | 13.808        | **1.908**                 |

---

## 4. FULL-BURST-DURATION LOWER BOUND — guards 3a / 3b / 3c

### Guard 3a (START)

Criterion: drain start within ±2 frames (±0.0333s) of `stage3_onset + 22f`. The residual is strictly
**bimodal**: either **−0.017s** (= 21f between stage3 onset and drain start; 1 frame from the engine's
22f) or **+0.400s** (= 45f).

- **iron sweep — QUALIFY 9/13:** cycles 2,3,4,6,7,8,9,12,13. **EXCLUDED 4:** cycles 1, 5, 10, 11 (all at
  +0.400).
- **T5 wind-weak — QUALIFY 7/13:** cycles 4,8,9,10,11,12,13. **EXCLUDED 6:** cycles 1,2,3,5,6,7 (all at
  +0.400).

The +0.400 cluster is diagnosed at frame level (§6): it is a **late-start** artifact, not an early-start
one. Late starts _shorten_ the window, so excluding them can only _raise_ the bound. In fact every
excluded window's duration was already below the qualifying maximum on both videos, so guard 3a changed
the bound by exactly 0.000s on both — except that it removes iron cycle 10 (nominal 8.95s, whose true
duration corrected for its 0.417s late start would be ~9.37s). Recorded as a fact; the pre-committed
rule excludes it, and I applied the rule.

### Guard 3b (END) — **THIS GUARD FIRED, AND IT MOVED THE BOUND**

The nominal longest qualifying windows do **not** survive corroboration:

- **iron sweep, nominal longest = cycle 3, 9.40s (41.0167→50.4167).** Frame dump at the end: the drain
  is a continuous monotone decay ending at **49.6833** (fill 0.022), decaying 0.015→0.007→**0.000** by
  49.8667 and staying at exactly 0 for ~0.48s; then a **single isolated frame** at 50.3667 (fill 0.037),
  0 again, then a **single isolated frame** at 50.4167 (fill 0.044), then 0 for 1.5s+. A draining
  Full-Burst bar is monotone by construction — it cannot go 0 → 0.037 → 0 → 0.044 → 0. These are CV
  false positives that `scan-frames.py`'s `GAP_TOL = 1.0s` stitched onto the tail. **NOT CORROBORATED.**
  True corroborated duration of that cycle: **8.667s**.
- **T5, nominal longest = cycle 12, 9.72s (165.3833→175.1).** Continuous drain ends at **174.2167**;
  zero for 0.85s; then two isolated frames at 175.0833/175.1000 (fill 0.022). **NOT CORROBORATED.**
  True: **8.833s**.
- **T5, cycle 10, nominal 9.37s.** Continuous drain ends 146.3667; a single isolated frame at 146.9167
  (fill 0.059) after 0.55s of sub-threshold. **NOT CORROBORATED.** True: **8.817s**.

Re-deriving every window's end from the raw per-frame fill trace (rule stated explicitly: frames with
`fill > FILL_MIN=0.02`, grouped into runs separated by a sub-threshold gap > GAP, runs shorter than 3
frames discarded, search capped at `min(start+11.0s, next window start − 0.2s)`), the bound is **stable
across GAP ∈ {0.017, 0.034, 0.100}s**:

| comp         | longest guard-3a-qualifying window, guard-3b-corrected                                  | end corroborated?                                                    |
| ------------ | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| iron sweep   | **cycle 9 — 8.733s** (127.750 → 136.4833)                                               | YES — unbroken 60fps drain 136.100→136.4833, then 0.007→0.000 (dump) |
| T5 wind-weak | **cycle 13 — 8.867s** (178.800 → 187.6667) at GAP≤0.034; cycle 11 — 8.883s at GAP=0.100 | YES — unbroken drain to 187.6667 then 0.007→0.000 (dump)             |

**⇒ FB-duration lower bound: iron ≥ 8.733s, T5 ≥ 8.867s.** Under guard 3c (cycle-invariance, extended
across videos since real FB duration is a game constant and the premise gate exact-slug-verified that no
unit in either comp carries `fullBurstExtend`) the cross-video bound is **≥ 8.867s**.

**⇒ H0d can account for at most 10 − 8.867 = 1.133s** (per-comp: 1.267s iron, 1.133s T5) — **not the
~0.6s the plan's PART F assumed**, because PART F's 0.6s figure was computed from the 9.4s reading that
guard 3b rejects.

### Guard 3c

Logged as an assumption, as the plan requires. Supporting evidence within this run: the corroborated
durations of _all_ qualifying windows cluster tightly — iron 8.233–8.733s (n=9, excl. the
video-truncated cycle 13), T5 8.350–8.883s (n=7) — consistent with one constant under one-sided
truncation.

---

## 5. PRE-COMMITTED DECISION RULE, APPLIED MECHANICALLY

| cond    | requirement                                                 | iron sweep                    | T5 wind-weak                  | verdict                                                     |
| ------- | ----------------------------------------------------------- | ----------------------------- | ----------------------------- | ----------------------------------------------------------- |
| **(a)** | mean real period shorter than sim by ≥1.0s, both comps      | 16.050 − 14.388 = **1.662s**  | 15.457 − 13.808 = **1.649s**  | **PASS**                                                    |
| **(b)** | real ladder matches sim within ±0.15s                       | 1.400 vs 1.3667 = **+0.033s** | 1.383 vs 1.3667 = **+0.017s** | **PASS**                                                    |
| **(c)** | FB-duration lower bound leaves **>0.6s** unexplained by H0d | 1.662 − 1.267 = **0.395s**    | 1.649 − 1.133 = **0.516s**    | **FAIL** (both; 0.529 / 0.516 using the cross-video 8.867s) |
| **(d)** | arithmetic closure holds, both                              | see below                     | see below                     | **PASS**                                                    |

**(d) arithmetic closure (PART G/H — basis-sanity gate only, NOT independent corroboration of the
period, per the pre-op judge's risk flag).** No `--t0` is available, so closure is run as a feasibility
test against the external 180s fight length:

- iron real, P=14.388: 13 FBs require first-FB fight-time ≤ 7.344s (satisfiable; sim's is 5.7s). **14
  FBs would require first-FB ≤ −7.044s — impossible.** ⇒ the recording can carry at most 13, agreeing
  with the scanner's 13 and excluding the coarse hand read's "14".
- T5 real, P=13.808: 13 FBs require first-FB ≤ 14.304s (satisfiable). **14 would require ≤ +0.496s —
  impossible.** ⇒ at most 13; matches the recorded 13.
- sim iron: `1 + floor((180 − 5.7)/16.050) = 11` — engine reports 11. ✔
- sim T5: `1 + floor((180 − 5.8)/15.457) = 12` — engine reports 12. ✔
- span consistency: real iron `172.533/12 = 14.378` vs middle-60% 14.388 (Δ0.010); real T5 `165.083/12 =
13.757` vs 13.808 (Δ0.051).

### Outcome

- **H1 CONFIRMED — NOT REACHED.** (a), (b), (d) PASS; **(c) FAILS on both comps.**
- **DIRECTIONAL — does not apply.** It requires the mean gap in **[0.5, 1.0)s**; the gap is **1.65s**,
  above the band.
- **H0a — does not apply.** Requires |gap| < 0.5s.
- **H0b — does not apply.** Requires ladder difference > 0.15s; it is 0.017–0.033s, and the ladder share
  of the gap is **−1% to −2%**, not ≥70%.
- **MIXED — does not apply.** Also requires ladder difference > 0.15s.
- **INCONCLUSIVE via its three named triggers — none fire.** Comps agree in direction; gap magnitudes
  differ by 0.013s (« 1.0s); both instrument self-checks PASSED.
- **"H1 refuted" — explicitly NOT reached.** The falsification clause reserves it for a basis-passing
  run with gap < 0.5s; the gap is 1.65s.

**⇒ NO BRANCH OF THE PRE-COMMITTED RULE FIRES.** The rule is under-determined for this result. The only
clause that reaches it is the FALSIFICATION CLAUSE's "**uncorroborated detections ⇒ BROKEN BASIS ⇒
INCONCLUSIVE**", read as applying to the _window-END detections that feed the bound_ (guard 3b rejected
them) rather than to the FB-count detections (which are 13/13 corroborated and PASSED). On that reading
the licensed label is:

> **INCONCLUSIVE — scoped to ATTRIBUTION (H1 vs H0d) only.** The period gap itself is measured, robust
> and large (1.662s / 1.649s, consistent across two comps, two elements, three detection spines and two
> sampling rates); the ladder is exonerated; but the instrument cannot bound H0d tightly enough to
> satisfy condition (c).

**Refill-window error range — NOT FILED as a proposal** (H1 CONFIRMED was not reached; recorded here as
arithmetic only, per comp, never a point value):
`[gap − (10s − FB_lower_bound), gap]` → **iron sweep [0.395, 1.662] s/cycle; T5 wind-weak [0.516,
1.649] s/cycle** (per-comp bounds); with the cross-video bound 8.867s: **iron [0.529, 1.662]; T5
[0.516, 1.649]**.

**Root cause of the (c) failure, stated flatly:** PART F derived its 0.6s threshold from "observed drain
windows run 8.2–9.4s ⇒ true FB ≥ 9.4s". The 9.4s window (iron cycle 3) is precisely the window guard 3b
rejects, and T5's 9.72s and 9.37s windows are rejected for the same reason. Applying the plan's own
guard collapses the bound to ~8.87s and roughly doubles H0d's allowance from ~0.6s to ~1.13s. Condition
(c) and the threshold that defines it were calibrated on a number the guard invalidates. Had guard 3b
not been applied, (c) would read 1.062s (iron) / 1.369s (T5) and **H1 CONFIRMED would have been reached
on all four conditions** — the guard is the entire difference, which is exactly the bias direction
("toward H1") the pre-op revision named.

---

## 6. WHAT WENT WRONG / WAS AMBIGUOUS / COULD NOT BE DONE

1. **NEW INSTRUMENT FINDING — a systematic FB-start artifact in `scan-frames.py`, diagnosed at frame
   level.** The bimodal guard-3a residual (−0.017s vs +0.400s; **10 of 26 cycles** across the two
   videos) is caused by `full_windows()` in `scripts/probe/scan-frames.py:160-190`. The burst cut-in
   occludes the gauge HUD for ~0.35–0.40s right after the bar first renders. When the last
   pre-occlusion frame's fill has already partly decayed (e.g. 0.659 at T5 26.5167) the post-occlusion
   re-appearance (0.956) exceeds `RESET_JUMP = 0.25`, so the code **closes and discards the true opening
   sub-window** (it is shorter than `WINDOW_MIN = 3.0s`) and **restarts the window ~0.417s late**. When
   the pre-occlusion fill has not decayed (0.911 → 0.956, Δ0.045) the true start survives. Verified by
   direct `gaugeStates` dumps of T5 cycles 2 (artifacted) and 4 (clean). Consequence:
   `fullWindows[].start` is late by ~0.417s on those cycles and `durationSec` correspondingly short. It
   does **not** affect the FB _count_ (13/13 either way) and it biases durations _downward_
   (conservative for a lower bound). Reported, not acted on — out of scope for this pass.
2. **NEW INSTRUMENT FINDING — `GAP_TOL = 1.0s` stitches post-FB CV false positives onto window tails,**
   inflating `durationSec` by 0.55–0.88s on 3 of 26 windows (iron cycle 3 +0.733, T5 cycle 10 +0.550, T5
   cycle 12 +0.883). This is the single most consequential item in this run: it is what makes the
   difference between H1 CONFIRMED and no verdict. Reported, not acted on.
3. **The decision rule's (b) comparand is not specified as mean or median.** On raw means including the
   artifacted cycles, iron's ladder difference would be 1.644 − 1.418 = 0.226s, which _exceeds_ ±0.15s
   and would push toward MIXED. I used **medians over guard-3a-qualifying cycles**, because (i) the
   artifacted cycles' ladder inflation is the §6.1 instrument artifact, not a game observation, and (ii)
   `decomposeCycles()` itself uses a median for `chain`. Stated so the judge can re-decide; on any
   reading of T5 the ladder difference stays ≤0.084s.
4. **The plan's predicted "~0.1s-scale" boss-transition noise is understated by an order of magnitude.**
   Observed stretch/outlier cycles: real iron cycle 8 ladder +1.25s, real T5 period 6 = 16.500s (+2.9s),
   sim iron cycle 5 ladder +0.83s, sim T5 cycle 10 ladder +0.93s. All sit inside the middle-60% windows.
   They do not change the outcome (median-based and stage-3-spine cross-checks all keep the gap in
   1.53–1.76s) but the noise model in the packet was wrong.
5. **PART E deviation (60fps run full-length rather than windowed)** — stated in §1 above, with the
   fps-20/fps-60 agreement check. No methodological change; the windowed plan would have tiled the whole
   video anyway.
6. **Could not do: fight-clock anchoring.** No `--t0` was derived, so the arithmetic-closure check is a
   feasibility test against the 180s fight length rather than a direct count projection from a known
   first-FB fight time. This is what the plan intended (anchor-free by construction) but it means
   closure is weaker than "the measured period reproduces the count" — it establishes "the measured
   period **permits** 13 and **forbids** 14".
7. **Scratch tooling that is NOT committed (repo rule flag).** Three drivers were written under
   `/tmp/tempo/`: `cycle-table.ts`, `real-table.mjs`, `guard3b.mjs` + `stats.mjs`. Their outputs are
   cited above as evidence, so **they need a committed home before any of this is cited elsewhere.** The
   natural committed shapes, per the "extend, don't add" rule: a `--cycle-table` flag on
   `scripts/probe/scan.ts` (real side, absorbing the guard-3a/3b logic) and a slot-order override plus a
   per-cycle print on `scripts/experiment.ts` (sim side). I did not create them because this pass
   changes no code. Raw artifacts currently live at `/tmp/tempo/{u8g,t5}-{20,60}/scan.json`.
8. **Minor:** the premise gate's "16.14s mean period" for the footage-order iron sweep is the
   _all-cycles_ mean `(167.1−5.7)/10`; the middle-60% `decomposeCycles()` mean is **16.050s**. Both
   reproduced here; no conflict, just two different statistics.
