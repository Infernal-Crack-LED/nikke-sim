# N2 blocker 2 — conversion rule, pinned numerically (2026-08-18)

> **Status: PROPOSAL — awaiting owner approval before any second control is traced.**
> This document pins the four undefined terms the N2 premise gate identified
> (`2026-08-17-n2-second-control-premise-gate.md` blocker 2) and covers the uncovered middle
> zone. Nothing is enacted; no second control has been traced. The rule is stated so that the new
> control's residual can be computed into it mechanically once the owner approves and the trace
> runs.

## Known values (from `liberalio-gaugehits-ab.ts --residual`, 2026-08-18)

| quantity                                    | value        | source                                  |
| ------------------------------------------- | ------------ | --------------------------------------- |
| PI2 `excess` (SHIPPED = H1, liberalio-free) | **3.0286 s** | `decomposeCycles()`                     |
| PI2 `measured` (bar-paint median, n=10–12)  | **2.10 s**   | `fill-trace-u8-i-misc-b3s.json`         |
| PI2 R₁ = (3.0286 − 2.10) / 2.10             | **0.4422**   | `liberalio-gaugehits-ab.ts`             |
| Iron H₁ `excess`                            | 2.6143 s     | `decomposeCycles()`                     |
| Iron `measured`                             | 2.342 s      | `fill-trace-u8-g-iron-sweep.json`       |
| Iron H₁ residual                            | **+0.1163**  | (2.6143 − 2.342) / 2.342                |
| T5 H₁ `excess`                              | 2.9000 s     | `decomposeCycles()`                     |
| T5 `measured`                               | 1.785 s      | `fill-trace-probe-u7-t5-wind-weak.json` |
| T5 H₁ residual                              | **+0.6247**  | (2.9000 − 1.785) / 1.785                |
| **Primary split S** = \|R_iron − R_T5\|     | **0.5084**   | —                                       |

T8 and PA controls are byte-identical across arms (liberalio-free, H1 has no effect) but have
**no fill trace** (`measured: null`), so no residual is computable for them. The second control
must be a freshly-traced comp.

## δ restated on the residual scale (blocker 2 item 4)

The ±0.15 s estimator bias is additive on `decomposeCycles().excess`. Propagating to the
dimensionless residual `R = (excess − measured) / measured`:

$$δ_i = \frac{0.15}{M_i}$$

| control    | M (s) | δ_i        |
| ---------- | ----- | ---------- |
| PI2        | 2.10  | **0.0714** |
| Iron (ref) | 2.342 | 0.0640     |
| T5 (ref)   | 1.785 | 0.0840     |

For a new control with measured refill M₂ in the range 1.8–2.5 s, δ₂ ∈ [0.060, 0.083].

**Statement on the original δ = 0.15:** the 2026-08-17 run used δ = 0.15 on the residual scale,
which is ~2× wider than its own derivation supports (the max δ_i above is 0.084). That widening
was conservative and did not change the verdict (the run was INCONCLUSIVE for any defensible δ).
This rule uses the per-control δ_i throughout — no blanket 0.15.

## The four pinned terms

### 1. Clustering statistic

**Δ = |R₁ − R₂|** — the absolute difference between the two controls' residuals.

Both residuals use the same estimator (`decomposeCycles().excess`) and the same bar-paint
instrument (`fill-trace-compare.ts`, median over `status:'ok'` windows). Because controls are
liberalio-free, R₁ = R₂ under SHIPPED and H1 alike — the arm choice does not matter.

### 2. Two-control R̄ reconstruction

$$\bar{R} = \frac{R_1 + R_2}{2}$$

Simple mean. Not a weighted mean (the two controls' SE contributions are the same estimator on
different recordings, so inverse-variance weighting adds complexity without precision gain at
n=2).

### 3. Band half-width

$$δ_{\text{band}} = \max(δ_1, δ_2)$$

The wider of the two controls' estimator biases. This is the band around R̄ that estimator noise
can plausibly produce. Deliberately conservative: it does not inflate for the inter-control spread
(the spread itself is the clustering test, not a band-widening term).

The band is **[R̄ − δ_band, R̄ + δ_band]**.

### 4. Cluster vs spread threshold — no middle zone

$$δ_C = 2 \times \max(δ_1, δ_2)$$

Two branches partition the space:

- **CLUSTER (Δ ≤ δ_C):** the controls agree within 2× the estimator bias. The band is
  well-defined. Score the primaries (iron, T5) against [R̄ − δ_band, R̄ + δ_band]:
  - Both inside → **ACCEPT H1** (gaugeHits: 5 reconciles both comps within the control band)
  - One or both outside → **REJECT H1** (the iron/T5 split is real, not estimator noise;
    proportional-uniformity refuted at the primary level)

- **SPREAD (Δ > δ_C):** the controls disagree more than 2× the estimator bias. The estimator
  varies too much across comps to discriminate → **INCONCLUSIVE**. H1 is neither accepted nor
  rejected; the proportional-uniformity premise is the refuted thing at the control level, and
  the primary split cannot be attributed to `liberalio` specifically.

No third branch. Every possible R₂ falls into exactly one of the two.

## Worked examples (illustrative, not predictive)

Using PI2 R₁ = 0.442, δ₁ = 0.071. Assume new control has M₂ = 2.20, δ₂ = 0.068.
δ_C = 2 × 0.071 = 0.143.

| R₂   | Δ     | zone    | R̄     | δ_band | band           | iron (0.116) | T5 (0.625) | verdict      |
| ---- | ----- | ------- | ----- | ------ | -------------- | ------------ | ---------- | ------------ |
| 0.40 | 0.042 | CLUSTER | 0.421 | 0.071  | [0.350, 0.492] | BELOW        | ABOVE      | REJECT       |
| 0.44 | 0.002 | CLUSTER | 0.441 | 0.071  | [0.370, 0.512] | BELOW        | ABOVE      | REJECT       |
| 0.30 | 0.142 | CLUSTER | 0.371 | 0.071  | [0.300, 0.442] | BELOW        | ABOVE      | REJECT       |
| 0.55 | 0.108 | CLUSTER | 0.496 | 0.071  | [0.425, 0.567] | BELOW        | ABOVE      | REJECT       |
| 0.25 | 0.192 | SPREAD  | —     | —      | —              | —            | —          | INCONCLUSIVE |
| 0.65 | 0.208 | SPREAD  | —     | —      | —              | —            | —          | INCONCLUSIVE |
| 0.10 | 0.342 | SPREAD  | —     | —      | —              | —            | —          | INCONCLUSIVE |

**Observation:** the iron/T5 split is so wide (S = 0.508) that any clustering pair of controls
produces a band too narrow to contain both primaries. The CLUSTER zone ALWAYS yields REJECT
unless R̄ happens to land near the split's midpoint (~0.37) AND δ_band is wide enough to reach
both sides (needs δ_band ≥ 0.25, which requires M < 0.6 s — implausible).

**In practice, CLUSTER → REJECT for any realistic second control.** The rule's discriminating
power is between REJECT (controls agree, split is real) and INCONCLUSIVE (controls disagree,
estimator too variable). ACCEPT is reachable only if the second control shifts R̄ dramatically
and the band widens enough — a scenario that would itself be a finding.

## Second control selection (blocker 3 — preferred candidates)

Per the N2 premise gate, N5 snowwhite-HA fire is the wrong control (sign flip: sim reads HIGH).
Preferred alternatives:

- **N1 `rapi/quency wind`** — `experiment.ts:428`
- **N2 `modernia wind`** — `experiment.ts:447`

Both are in the stamped nine, both under-count (consistent with the general pattern), and neither
seats `liberalio`. Before choosing, verify neither seats a `fullBurstExtend` carrier that would
break the closure decomposition (the `soda-twinkling-bunny` precedent from N3).

The new control needs:

1. A fill trace (ffmpeg → gauge-fill.py → fill-trace-compare.ts spans) with n ≥ 10 readable
   windows and `amountsTrusted: true`
2. The comp must exist in `fb-count-matrix.ts` for the credit-schedule reconstruction
3. The same bar-paint instrument chain as the existing traces (138 px bar, same estimator)

## What this document does NOT do

- It does not trace a second control (that is the work step, after owner approval)
- It does not re-open the `liberalio` gauge-credit question (that was LOG 2026-08-17)
- It does not re-derive the estimator bias (0.15 s is carried from the 2026-08-17 run; the
  premise gate noted it is prose-only — a committed instrument for it is a separate item)
- It does not address blocker 3 (control selection) beyond noting the preferred candidates
