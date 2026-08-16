# scientific-method blind post-op judge — anis-star solo #2 gauge measurement

You are the BLIND post-op judge. You receive the pre-op context and the work deliverable.
You do NOT know the driver's verdict. Score on the Q1–Q4 rubric and return your verdict.

This is a MEASUREMENT-ONLY packet — no enactment. The outcome is LOG-class regardless: the
measurement records, nothing changes. Your job is to verify that the work followed the
pre-registered method, that the decision rules are correctly applied, and that the stated
numbers are arithmetically sound.

## Pre-op context — decision rules (from the pre-op packet)

### Question A — per-pull gauge magnitude

Hypotheses (steady per-pull total, %/bar, at her solo decomposition
`(280×2.5 focused shot + 280 rider) × 1.06 aura`):

- **H-model = 10.39 %/pull** — the divisor-1 model (enacted 2026-08-16 on branch).
- **H-elevated ∈ [10.96, ~12.2] %/pull** — the measured-band/elevation reading.
- **H-legacy = 8.90 %/pull** — the pre-2026-08-16 shipped decomposition (halved rider).

**Primary discriminator:** pixel-free count-to-fill per window.
`K = ceil((100 − baseline_rendered) / P)` per window.

**R1 (K-band disjointness):** K-bands are baseline-dependent — H-model and H-elevated are
integer-disjoint ONLY when the window's rendered baseline ∈ ~[1.4, 6.5). If two hypotheses
share the observed K at a window's baseline, that window is DOUBLY-CONSISTENT and cannot count
toward "exactly ONE hypothesis."

**R2 (per-window drop):** a window whose 30fps trace boundaries miss the ±1.5s montage
tolerance is DROPPED. BASIS-BROKEN if <2 refill windows survive, or ALL disagree.

**R3 (W4 anomaly gate):** W4 fills ~2× faster than W2/W3 in the pre-registered map; no
hypothesis predicts a 6.5s fill. W4 enters the decision rule only if montage-verified AND
trace boundaries reconciled.

**R4 (cross-check every counted window):** every window entering the decision rule has the
hand-montage ammo pull-count cross-check.

**Tolerance-widening guard:** if 2× the quantization bound ≥ 0.57pp → MEDIANS branch is
NON-DISCRIMINATING; counting branch is the sole discriminator.

**Decision rule:**

- ≥2 complete refill windows yield K values all consistent with exactly ONE hypothesis's
  K-band ⇒ MEASURED on this footage.
- Windows disagree, or K between bands ⇒ INCONCLUSIVE-LOG.
- Opening window W1 reported SEPARATELY — corroborates but does not enter the ≥2-window rule.

### Question B — same-regime noise floor

Guard construction identical to the C4 packet. Bin = 1/30s, event grouping ≤2 trace-frames,
guard = 2 pre-frames + 0.3s latency + 8 post-frames (doubled on widened pulls), quiet bins =
in-window filling reads outside all guards and exclusions.

Floors: primary ≥150 quiet bins, pooled (with old A3 basis 105) ≥180.
Output: false-event bin rate + Wilson 95% upper bound per threshold.
This is INPUT to the classification thread's ceiling test — it stamps nothing about H-C.

### What this plan CANNOT establish

- Team-context in-window elevation — solo footage only.
- Rider structure 1×280 vs 2×140.
- The skillGauge/hitsPerShot divisor for multi-hit units.
- Any engine/data value — measurement-only.

### Pre-op judge's cannot-establish additions (two items that existed only in the prior

session's chat, recorded here):

(a) At unfavorable rendered baselines (outside ~[1.4, 6.5)), K=10 is doubly-consistent
between H-model 10.39 and the elevated band's bottom sliver [10.96, 11.11] — not a
confirmation.

(b) Question B's output is INPUT to the classification thread's ceiling test — it stamps
nothing about H-C, and a floor-scraping ~150 bins with zero false events gives Wilson ~1.8%,
short of the ~1% that thread wants (pooled ~355–385 bins reaches ~0.75–0.95%).

### Partial-blindness declaration

The packet author had seen a 1fps bar-region montage (window boundaries, countdown digits,
coarse bar shapes) and the invalid terrain trace's structural counts. NOT seen: any per-pull
delta, any count-to-fill, any fill reading at measurement resolution, any false-event
quantity.

---

## THE WORK DELIVERABLE (transcribed verbatim from the committed document)

[FOLLOWS]

# Work deliverable — `anis-star` solo recording #2: per-pull gauge magnitude + same-regime noise floor (2026-08-16)

**Status:** work step COMPLETE. This document transcribes the verdict-free artifact
(`docs/probe-data/anis-star-solo2-gauge.json`) into the judge-ready form the packet
(`docs/handoffs/2026-08-16-anis-star-solo2-gauge-preop-packet.md`) specified. No verdict,
no interpretation stamp — driver review and blind post-op apply those.

**Replay pin:** `scripts/tests/probe/noise-solo2.test.ts` — **5/5 GREEN** (recomputes the
artifact's `result` from its own committed series/inputs; byte-for-byte equality).

---

## §1 Instrument gate — maiden-ice-rose fixture reproduction

**Method:** the committed A3 instrumentPrelude — `ffmpeg fps=30,crop=400:160:2350:430` over
`docs/probes/tb2/tb2 3 maiden.MP4`; `gauge-fill.py --fps 30 --calib-frame 300`.

**Result: PASS.** Bar self-calibrated 138px; all 450 reads of
`scripts/tests/fixtures/gauge-fill-maiden-ice-rose-30fps.json` reproduced identically
(0 missing, 0 mismatched by t/state/fillRaw). The fixture bar coords differ only by its
narrower documented crop (222:60:2400:470, `--ss 6`).

**Sub-step reproduction:** the viable window (6–17s) shows the committed rider-first pattern:
+3.6/+3.7 rider then +9.4/+10.8/+9.4/+10.1/+10.8 weapon (pairs at 8.40/8.57, 9.77/9.93,
11.13/11.30, 12.50/12.67, 13.87/14.03) — the settled small-step magnitude exact, the large
step inside its documented unresolved +1.0–1.3 hot band.

**Vitest anchors:** `scripts/tests/gauge-fill-anchor.test.ts` + `scripts/tests/gauge-fill-team.test.ts`:
18/18 pass.

**Quantization bound:** ±1 column of the 138px bar = ±0.725 percentage points per reading.

**Tolerance-widening guard (pre-committed):** 2 × 0.725 = 1.45pp ≥ 0.57pp (the
H-model↔H-elevated separation) → **per-pull MEDIANS branch is NON-DISCRIMINATING by
construction** and is reported descriptively only. The counting branch is the sole
discriminator. Stated before any target value was read.

**BASIS-BROKEN check:** not triggered — fixture reproduction is exact.

---

## §2 Reader invocation — the `--bar` override

**Bar lock:** border row 501, x0 2474, x1 2612, width 138px.

**Derivation:** border row + extent derived programmatically from mid-fight frames
(t=8/30/55/60s): longest dark run (<130 mean brightness, len 100–200) in rows 470–524
restricted to x≥2350 is row 501, x2474..2611 inclusive (138px) on every frame checked —
identical geometry to the committed swha solo command
(`c4-noise-floor-rerun-2026-08-16.json` `commands.swhaReader`).

**Command:** `scripts/probe/.venv/bin/python scripts/probe/gauge-fill.py --frames
/tmp/anis-star-solo-2/frames30 --fps 30 --calib-frame 900 --bar 489:501:2474:2612 --out <trace>`
(explicit `--bar` takes precedence over `--calib-frame`; reported bar 138px).

**Constraint-9 note:** the `--bar` override value and its derivation are IN the artifact's
`readerInvocation` and `commands` sections.

---

## §3 Window map — trace vs pre-registered (R2/R3 gates)

### Pre-registered map (±1s at 1fps; R2 tolerance ±1.5s)

| Window | Map open | Map close | Duration |
| ------ | -------- | --------- | -------- |
| W1     | 2.0      | 14.0      | 12.0s    |
| W2     | 27.5     | 39.0      | 11.5s    |
| W3     | 51.0     | 64.5      | 13.5s    |
| W4     | 77.0     | 83.5      | 6.5s     |

### Trace boundaries (open = bar first-paint at the rendered 2.2 baseline; close = green-full)

| Window | Trace open | Trace close | Duration | Δopen vs map | Δclose vs map | R2 mechanical            |
| ------ | ---------- | ----------- | -------- | ------------ | ------------- | ------------------------ |
| W1     | 1.9        | 13.6        | 11.7s    | −0.1s        | −0.4s         | PASS (both inside ±1.5s) |
| W2     | 24.6       | 37.83       | 13.23s   | **−2.9s**    | −1.17s        | **OPEN outside ±1.5s**   |
| W3     | 48.8       | 61.07       | 12.27s   | **−2.2s**    | **−3.43s**    | **BOTH outside ±1.5s**   |
| W4     | 72.13      | 83.20       | 11.07s   | **−4.87s**   | −0.3s         | **OPEN outside ±1.5s**   |

### R2 mechanical application

Applied as written, all three refill windows carry a boundary outside the ±1.5s montage
tolerance → mechanically **DROPPED** per R2. `<2 refill windows survive` would be the
BASIS-BROKEN condition.

### Three independent instruments corroborating the TRACE boundaries (not the map)

1. **Stage-II countdown digits** fix the three countdown spans at ~14.05–24.05, ~38.26–48.26,
   ~61.50–71.33, each ending 0.55–0.8s (drain animation) before the trace's window-open
   instants 24.60/48.80/72.13.
2. **Hand-montage ammo decrements** place each refill window's first pull at
   25.07–25.40 / 49.60–49.93 / 72.23–72.57, which is 0.5–1.6s AFTER the trace opens and
   2.1–4.7s BEFORE the map's opens (a pull cannot credit onto an unpainted bar).
3. **Full→open cycle length** is 10.6–11.1s on all three cycles, against the map's implied
   9.3–12.5s spread.

The map's cast-3 anchor (~64.5) is **directly contradicted** by countdown digit 09.00 at
t=62.5 — the t=64.5 frame's TIME LIMIT overlay is a lingering burst-duration render, not the
cast instant.

**Driver/judge decides:** whether R2's mechanical drop indicts the trace or the
pre-registered map.

### R3 W4 gate

R3 required W4's pull count hand-montage-verified AND its trace boundaries to reconcile the
~6.5s-fill discrepancy.

- **Duration reconciled:** W4 is 72.13→83.20 = **11.07s**, not the map's 6.5s — the 6.5s
  figure came from the map's late open (77). 11.07s is cadence-consistent (9 × ~1.05s +
  2.35s reload + ~0.9s hold).
- **Montage verified:** 9 pulls open→green-full (6 in magazine 1 at 72.2–77.6, reload, 3 in
  magazine 2 at 80.6–82.9).
- **Remaining anomaly is per-pull MAGNITUDE, not duration:** single-pull credits of +16.0 and
  +15.2 (each confirmed a single ammo decrement), a smeared p7 credit (~+8.0..8.7), and a
  rendered 100.0 ramp at 81.47–81.63 followed by two clipped pulls before the green full at
  83.20.

---

## §4 Pull inventory — trace-vs-montage per window (R4 cross-check)

### W1 (opening, 9 pulls open→full, no montage — opening window reported separately per packet)

| Pull | Fire t | Before | After | Δ%    | Sub-steps                  | Included | Reason                                              |
| ---- | ------ | ------ | ----- | ----- | -------------------------- | -------- | --------------------------------------------------- |
| p1   | 3.03   | 2.2    | 11.6  | +9.4  | single 30fps frame         | NO       | Opening pull from rendered 2.2 floor (A3 precedent) |
| p2   | 4.03   | 11.6   | 22.5  | +10.9 | single 30fps frame         | yes      | clean                                               |
| p3   | 5.00   | 22.5   | 34.1  | +11.6 | single 30fps frame         | yes      | clean                                               |
| p4   | 6.00   | 34.1   | 45.7  | +11.6 | single 30fps frame         | yes      | clean                                               |
| p5   | 6.97   | 45.7   | 55.8  | +10.1 | single 30fps frame         | yes      | clean (one-column transient dip recovers)           |
| p6   | 7.97   | 55.8   | 67.4  | +11.6 | +10.9 then +0.7 one-column | yes      | clean (one-column inside quantization)              |
| p7   | 11.30  | 67.4   | 79.0  | +11.6 | single 30fps frame         | yes      | first post-reload pull                              |
| p8   | 12.30  | 79.0   | 89.9  | +10.9 | single 30fps frame         | yes      | clean                                               |
| p9   | 13.30  | 89.9   | —     | —     | credit clipped at bar-full | NO       | bar at 89.9 at release                              |

**Included:** 7 clean pulls. Medians reported descriptively in §6.

### W2 (refill, 9 pulls open→full)

| Pull | Fire t | Ammo bracket   | Before | After | Δ%        | Included    | Reason                                        |
| ---- | ------ | -------------- | ------ | ----- | --------- | ----------- | --------------------------------------------- |
| p1   | 25.23  | [25.07, 25.40] | 2.2    | 6.5   | —         | NO          | Opener + artifact span; rendered ~+4.3..5.0   |
| p2   | 26.33  | [26.07, 26.40] | 6.5    | 17.4  | +10.9     | CONDITIONAL | before-plateau 0.04s after exclusion span end |
| p3   | 27.30  | [27.07, 27.40] | 17.4   | 28.3  | +10.9     | yes         | clean                                         |
| p4   | 28.30  | [28.07, 28.40] | 28.3   | 39.9  | +11.6     | yes         | clean                                         |
| p5   | 29.27  | [29.07, 29.40] | 39.9   | 51.4  | +11.5     | yes         | clean                                         |
| p6   | 30.27  | [30.07, 30.40] | 51.4   | 62.3  | +10.9     | yes         | clean; mag empties                            |
| p7   | 33.63  | [33.40, 33.73] | 63.0   | 74.6  | +11.6     | yes         | first post-reload                             |
| p8   | 36.53  | [36.40, 36.73] | 74.6   | 89.9  | **+15.3** | yes         | **ANOMALOUS**: one pull, ~2.9s firing pause   |
| p9   | 37.53  | [37.40, 38.07] | 89.9   | —     | —         | NO          | credit clipped at bar-full                    |

**Montage cross-check (R4):** 9 ammo decrements confirmed — 6→5→4→3→2→1→0 (magazine 1),
reload, then 5→4→3 (magazine 2, with a ~2.9s firing pause holding at 5). **Trace and montage
agree on 9 pulls.**

**W2p8 anomaly:** +15.3 credited from a single ammo decrement (005→004), mechanically clean
(plateaus stable: 74.6 held 33.93–36.80, 89.9 held 36.83–37.79). Follows a ~2.9s firing pause.
No hypothesis family predicts +15.3. Counterfactual: with p8 at the steady-family ~11.25, the
bar reads ~97 after 9 pulls (NOT full) — the 9-pull fill is arithmetically enabled by this
credit.

### W3 (refill, 10 pulls open→full)

| Pull | Fire t | Ammo bracket   | Before | After | Δ%    | Included    | Reason                               |
| ---- | ------ | -------------- | ------ | ----- | ----- | ----------- | ------------------------------------ |
| p1   | 49.53  | [49.60, 49.93] | 2.2    | 5.8   | +3.6  | NO          | Opener; +3.6 then +0.7 sub-step      |
| s1   | 50.03  | —              | 5.8    | 6.5   | +0.7  | NO          | sub-step of opener                   |
| p2   | 50.50  | [50.60, 50.93] | 6.5    | 17.4  | +10.9 | yes         | clean                                |
| p3   | 51.50  | [51.60, 51.93] | 17.4   | 29.0  | +11.6 | yes         | clean                                |
| p4   | 52.50  | [52.60, 52.93] | 29.0   | 40.6  | +11.6 | yes         | clean                                |
| p5   | 53.43  | [52.93, 53.93] | 40.6   | 51.4  | —     | NO          | artifact span covers credit          |
| p6   | 54.47  | [54.60, 54.93] | 51.4   | 63.0  | +11.6 | CONDITIONAL | before-plateau at exclusion span end |
| p7   | 57.80  | [57.93, 58.27] | 63.0   | 74.6  | +11.6 | yes         | first post-reload                    |
| p8   | 58.80  | [58.93, 59.27] | 74.6   | 84.8  | +10.2 | yes         | clean                                |
| p9   | 59.77  | [59.93, 60.27] | 84.8   | 96.4  | +11.6 | yes         | clean                                |
| p10  | 60.77  | [60.60, 60.93] | 96.4   | —     | —     | NO          | credit clipped at bar-full           |

**Montage cross-check (R4):** 10 ammo decrements confirmed — 6→5→4→3→2→1→0 (magazine 1),
reload, then 6→5→4→3→2 (magazine 2). The 10th pull credits at the 61.07 full. **Trace and
montage agree on 10 pulls.**

### W4 (refill, R3-gated, 9 pulls open→green-full)

| Pull | Fire t | Ammo bracket   | Before | After | Δ%        | Included    | Reason                                      |
| ---- | ------ | -------------- | ------ | ----- | --------- | ----------- | ------------------------------------------- |
| p1   | 72.63  | [72.23, 72.57] | 2.2    | 8.7   | +6.5      | NO          | Opener; +6.5 then +0.7 sub-step             |
| s1   | 73.03  | —              | 8.7    | 9.4   | +0.7      | NO          | sub-step of opener                          |
| p2   | 73.60  | [73.23, 73.57] | 9.4    | 25.4  | **+16.0** | yes         | **ANOMALOUS**: one pull                     |
| p3   | 74.57  | [74.23, 74.57] | 25.4   | 40.6  | **+15.2** | yes         | **ANOMALOUS**: one pull                     |
| p4   | 75.57  | [75.23, 75.57] | 40.6   | 52.2  | +11.6     | yes         | clean (post-plateau transient dip recovers) |
| p5   | 76.40  | [76.23, 76.57] | 52.2   | 63.0  | —         | NO          | artifact span covers credit                 |
| p6   | 77.53  | [77.23, 77.57] | 63.0   | 74.6  | +11.6     | CONDITIONAL | before-plateau at exclusion span end        |
| p7   | 80.73  | [80.57, 80.90] | 74.6   | 83.3  | —         | NO          | smeared credit (~+8.0..8.7)                 |
| p8   | 81.73  | [81.57, 81.90] | —      | —     | —         | NO          | credit clipped at rendered 100.0 ramp       |
| p9   | 82.73  | [82.57, 82.90] | —      | —     | —         | NO          | credit clipped at saturation                |

**Montage cross-check (R4):** 9 ammo decrements confirmed — 6→5→4→3→2→1→0 (magazine 1),
reload, then 6→5→4→3 (magazine 2). **Trace and montage agree on 9 pulls.**

**W4 magnitude anomalies:** p2 (+16.0) and p3 (+15.2) each confirmed as a single ammo
decrement by the montage. p7 smeared credit (~+8.0..8.7, dip-then-ramp). The rendered 100.0
ramp at 81.47–81.63 precedes the green full at 83.20, clipping p8 and p9.

---

## §5 Question A — per-pull gauge magnitude (counting branch, sole discriminator)

### Rendered baselines and R1 K-band disjointness

Every window's rendered baseline is **2.2**, inside the packet's ~[1.4, 6.5) disjointness
range. The K-bands at baseline 2.2:

| Hypothesis | P (%/pull)     | K = ⌈(100 − 2.2) / P⌉ |
| ---------- | -------------- | --------------------- |
| H-legacy   | 8.90           | 11                    |
| H-model    | 10.39          | 10                    |
| H-elevated | [10.96, ~12.2] | 9                     |

The three K-bands are integer-disjoint at this baseline.

### Observed K per window

| Window | Pulls open→full | Trace events           | Montage pulls | Steady-premise violations                                                  |
| ------ | --------------- | ---------------------- | ------------- | -------------------------------------------------------------------------- |
| W2     | 9               | 9                      | 9             | opener ~+4.3..5.0; p8 +15.3 (anomalous)                                    |
| W3     | 10              | 10                     | 10            | opener +4.3 only                                                           |
| W4     | 9               | 7 credited + 2 clipped | 9             | opener +7.2; p2 +16.0, p3 +15.2; p7 smeared; rendered 100 ramp clips p8/p9 |
| W1     | 9               | 9                      | (no montage)  | opener +9.4; structurally identical to A3                                  |

### Counting arithmetic per window (pixel-free)

**W2 (K=9, anomalous p8):**

- All-nine-equal: P ∈ [10.87, 12.23)
- Opener+p8 as rendered: steady P ∈ [11.11, 13.00) (opener 4.3–5.0 moves floor 11.11–11.17)
- Against 8.90: 2.2+4.5+15.3+7×8.9 = 84.3 → NOT full
- Against 10.39: 2.2+4.5+15.3+7×10.39 = 94.7 → NOT full
- Against 11.25: 2.2+4.5+15.3+7×11.25 = 100.8 → full at pull 9 ✓

**W3 (K=10, clean):**

- All-ten-equal: P ∈ [9.78, 10.87)
- Opener as rendered (4.3): steady P ∈ [10.39, 11.69)
- Against 8.90: 6.5 + 9×8.9 = 86.6 → NOT full
- Against 10.39: 6.5 + 9×10.39 = **100.01** → full at EXACTLY pull 10 (H-model sits on the
  closed lower bound)
- Against 10.96: 6.5 + 9×10.96 = 105.1 → full at pull 10 as well
- **R1 double-consistency:** W3's K=10 with its rendered opener is consistent with BOTH
  H-model (10.39) and H-elevated up to ~11.69 — the naive K-bands' disjointness rests on the
  all-pulls-equal premise, which the partial opener breaks. Per R1, this window is
  **DOUBLY-CONSISTENT** and cannot count toward the "exactly ONE hypothesis" clause for the
  model-vs-elevated pair.

**W4 (K=9, R3-gated):**

- Steady-P arithmetic is NOT well-posed (two anomalous credits +16.0/+15.2, one smeared, two
  clipped). Descriptive rendered sum: 2.2+7.2+16.0+15.2+11.6+10.8(hidden)+11.6 = 74.6 at p6,
  then the smeared p7 (+8.0..8.7) and the 81.47–81.63 ramp reach the rendered 100.0.

**W1 (K=9, opening, separate per packet):**

- All-nine-equal: P ∈ [10.87, 12.23)
- Opener as rendered (9.4): steady P ∈ [11.05, 12.63) — the same structure as the A3 window's
  [~10.96–11.14, ~12.53–12.73) floor on independent footage
- Against 8.90: 11.6 + 7×8.9 = 82.8 → NOT full
- Against 10.39: 2.2+9.4+8×10.39 = 94.7 → NOT full (the bar WAS full at pull 9)
- Against 11.05+: 2.2+9.4+8×11.05 = 100.0 → full at pull 9 ✓

### Decision-rule application summary (for the judges)

- **W2:** K=9, BUT the 9-pull fill is arithmetically enabled by the anomalous +15.3 credit
  (counterfactual at steady ~11.25: bar reads ~97, not full). Without p8's excess, W2 needs
  a 10th pull. The window's K is 9 OBSERVED but the steady-premise is violated.
- **W3:** K=10, consistent with BOTH H-model and H-elevated up to ~11.69.
  **DOUBLY-CONSISTENT** per R1.
- **W4:** K=9, R3-gated, steady-premise violated by two anomalous credits and a smeared
  credit. Descriptive only.
- **W1 (separate):** K=9, excludes H-model (10.39 gives 94.7, not full) and H-legacy.
  Consistent with H-elevated from 11.05+. Opening window — corroborates but does not enter
  the ≥2-window rule per packet.

---

## §6 Question A — per-pull medians (DESCRIPTIVE ONLY, non-discriminating)

The tolerance-widening guard (2 × 0.725 = 1.45pp ≥ 0.57pp) declared this branch
non-discriminating before any target value was read. Reported for completeness.

| Pool                                 | n   | Median | Range     |
| ------------------------------------ | --- | ------ | --------- |
| Strict refill (W2+W3+W4)             | 15  | 11.6   | 10.2–16.0 |
| Steady-family only (excl. anomalous) | 12  | 11.6   | 10.2–11.6 |
| Lenient refill (+ conditionals)      | 18  | 11.6   | 10.2–16.0 |
| W1 separate                          | 7   | 11.6   | 10.1–11.6 |

The n≥8 requirement is met in every pool. The steady deltas occupy 10.1–11.6 (14–16 columns
of the 138px bar), unimodal — the same family as the A3 read. **PLUS a separate ~15.2–16.0
family (3 events, 21–22 columns) not observed on the A3 footage.**

Sub-step decomposition is UNRESOLVED for steady pulls — every steady credit lands in a single
30fps frame (same as A3). Window-openers show +3.6/+6.5 then a +0.7 one-column second event
0.4–0.5s later (inside quantization, ambiguous).

Fire-to-credit latency: ammo-bracket fire instants put the credit 0.20–0.53s after fire on
W2 pulls and ≤0.17–0.30s on W3/W4 pulls (3fps bracket quantization); consistent with the
A3 ~0.30s.

---

## §7 Question B — same-regime noise floor

### Guard construction

Identical to the C4 packet (`c4-noise-floor-rerun-2026-08-16.json`): bin = 1/30s, event
grouping ≤2 trace-frames, guard = 2 pre-frames + 0.3s latency + 8 post-frames around each
pull-credit instant (doubled half-width on widened pulls), quiet bins = in-window filling
reads outside all guards and exclusions, spans containing any dominant-curve (`offCurve`,
tol 1.5) flagged read DROPPED whole.

### Widened pulls

W2p1, W3p5, W4p5, W4p7, W4p8, W4p9 — all artifact-span or smeared-credit pulls where the
guard anchor is the ammo-bracket midpoint rather than `credit − 0.30s`.

### Results

| Basis                         | Quiet bins | False-event bins | Rate | Wilson 95% upper (1.41) |
| ----------------------------- | ---------- | ---------------- | ---- | ----------------------- |
| **Primary (W2+W3+W4 pooled)** | **492**    | **0**            | 0    | **0.55%**               |
| Joint pooled (+ A3 basis 105) | **597**    | **0**            | 0    | **0.45%**               |

At all three thresholds (1.41 / 1.5 / 1.596): zero false-event bins. The 5 positive deltas
that exist in the primary basis are all +0.7 (one column, inside quantization — p95 = 0.7,
max = 0.7). Zero big-delta bins, zero team-band bins.

### Floor check

| Basis   | Realized quiet bins | Pre-committed floor | Meets floor           |
| ------- | ------------------- | ------------------- | --------------------- |
| Primary | 492                 | 150                 | **YES** (3.3× margin) |
| Pooled  | 597                 | 180                 | **YES** (3.3× margin) |

**Both floors satisfied.** The C4 packet's satisfiability defect (105 bins vs 150 floor) is
resolved — this recording delivers ~4.7× the needed primary basis.

### Wilson bounds at all thresholds (primary basis, n=492)

| Threshold | False-event bins | Wilson 95% upper (one-sided, z=1.645) |
| --------- | ---------------- | ------------------------------------- |
| 1.41      | 0                | 0.55%                                 |
| 1.5       | 0                | 0.55%                                 |
| 1.596     | 0                | 0.55%                                 |

### Wilson bounds at all thresholds (joint pooled, n=597)

| Threshold | False-event bins | Wilson 95% upper (one-sided, z=1.645) |
| --------- | ---------------- | ------------------------------------- |
| 1.41      | 0                | 0.45%                                 |
| 1.5       | 0                | 0.45%                                 |
| 1.596     | 0                | 0.45%                                 |

### Fill-level distribution (primary, n=492)

min 1.4, p25 40.6, p50 63.0, p75 73.9, max 96.4, mean 56.37. Decile counts:
[48, 23, 35, 11, 14, 11, 162, 155, 22, 11].

**Regime-coverage note:** the fill-level distribution concentrates in the 60–80% range (317
of 492 bins in deciles 7–8), which covers the iron sweep's 70–80% mode — the coverage gap
the C4 run left is addressed by this basis.

---

## §8 Constraint-9 compliance

| Item                                     | Status | Location                                                                        |
| ---------------------------------------- | ------ | ------------------------------------------------------------------------------- |
| `--bar` override + derivation            | ✓      | artifact `readerInvocation` + `commands.barDerivation`                          |
| `fill-trace-compare.ts` noise-solo2 path | ✓      | committed (this commit, +243 lines)                                             |
| Replay pin `noise-solo2.test.ts`         | ✓      | committed, 5/5 GREEN                                                            |
| Maiden fixture reproduction              | ✓      | artifact `instrumentPrelude.fixtureReproduction`                                |
| No /tmp-only helpers cited               | ✓      | all instruments committed; frames regenerable via the `commands.frames` command |

---

## §9 Structural context (from the handoff, recorded for the judges)

- **Recording:** `docs/probes/solo/anis-star-solo.mov`, 85.06s, 60fps, 1206×2622 portrait
  (auto-rotated 2622×1206 landscape). Second independent `anis-star` solo recording.
- **Solo cycle:** 4 solo Burst-1 casts (~t14/39/61.5/83.5 video), each → ~10s stage-II
  countdown → expiry. Gauge locked during countdown (chain stage ≠ 0).
- **Frames:** `/tmp/anis-star-solo-2/frames30` (2552 @30fps) — still present; regenerable via
  `ffmpeg -v error -i docs/probes/solo/anis-star-solo.mov -vf fps=30 <dir>/%05d.png`.
- **`gauge-fill.py` terrain-lock defect:** without `--bar`, the reader self-calibrates onto a
  dark terrain edge on this footage — the first structural trace was garbage. Candidate
  `/skill-maintenance` item.
- **`read-ammo.ts` HUD-style gap:** 0/851 frames read on her text-label "AMMO / NNN" HUD (the
  template matches boxed digits). The hand-montage ammo read is the sanctioned fallback.

---

## §10 What this plan CANNOT establish (from the packet, restated)

- The team-context in-window elevation (1.6–1.9×) — solo footage only.
- Rider structure 1×280 vs 2×140 (gauge-equivalent; popups not in scope).
- The `skillGauge`/`hitsPerShot` divisor for genuine multi-hit units.
- Any engine/data value — measurement-only.
- Whether the 2026-07-13 band was right — a third instrument on independent footage can
  corroborate or tension, but the old bound stays its own record.

### Pre-op judge's cannot-establish additions (from the handoff, recorded here because they

existed only in the prior session's chat):

(a) At unfavorable rendered baselines (outside ~[1.4, 6.5)), K=10 is doubly-consistent
between H-model 10.39 and the elevated band's bottom sliver [10.96, 11.11] — not a
confirmation.

(b) Question B's output is INPUT to the classification thread's ceiling test — it stamps
nothing about H-C, and a floor-scraping ~150 bins with zero false events gives Wilson ~1.8%,
short of the ~1% that thread wants (pooled ~355–385 bins reaches ~0.75–0.95%).
