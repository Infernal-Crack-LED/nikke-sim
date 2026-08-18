# N2 conversion rule result (2026-08-18)

> **Status: COMPLETE — SPREAD → INCONCLUSIVE.** The `liberalio` gauge-credit finding stays LOG
> (nothing enacted, 2026-08-17). This document applies the pinned conversion rule
> (`2026-08-18-n2-conversion-rule-proposal.md`) to the N1 second control's residual and records
> the verdict.

---

## 1. Second control: N1 rapi/quency wind

**Selection.** N1 from `scripts/experiment.ts:428` — `d-killer-wife, grave, rapi-red-hood,
quency-escape-queen, jill`. No member seats `liberalio` (confirmed: `seatsLiberalio: false`
in residual output). No member carries `fullBurstExtend` (grep clean). Boss element Wind.

**Fill trace.** 13 readable Full-Burst windows from the N1 recording
(`docs/probes/N/n1_rapi_quency_wind.mp4`). Pipeline: ffmpeg crop 280:70:2342:465 →
gauge-fill.py (system Python 3.9, team mode, magenta drain-bar lock) → 4185 reads,
134 px bar at rows 26-33 → fill-trace-compare.ts spans →
`docs/probe-data/fill-trace-n1-rapi-quency-wind-windows.json`.

**Measured refill:** median **1.817 s** over 12 status-ok windows (1 excluded as partial).

## 2. Residuals (from `liberalio-gaugehits-ab.ts --residual`, 2026-08-18)

| control             | excess (s) | measured (s) | R          | δ = 0.15/M |
| ------------------- | ---------- | ------------ | ---------- | ---------- |
| PI2 misc B3s (R₁)   | 3.0286     | 2.100        | **0.4422** | 0.0714     |
| N1 rapi/quency (R₂) | 3.4571     | 1.817        | **0.9027** | 0.0826     |

Both are SHIPPED-arm residuals. Controls are liberalio-free, so the H1 arm is byte-identical
(confirmed: both arms produce identical excess/residual for PI2, T8, PA, and N1).

MC FB distribution: both controls are deterministic at 12×25/25.

## 3. Conversion rule application

Per `2026-08-18-n2-conversion-rule-proposal.md`:

| quantity                        | formula          | value       |
| ------------------------------- | ---------------- | ----------- |
| Clustering statistic Δ          | \|R₁ − R₂\|      | **0.4605**  |
| Band half-width δ_band          | max(δ₁, δ₂)      | 0.0826      |
| Cluster vs spread threshold δ_C | 2 × max(δ₁, δ₂)  | **0.1652**  |
| Δ vs δ_C                        | 0.4605 vs 0.1652 | **Δ > δ_C** |

**Zone: SPREAD.**

**Verdict: INCONCLUSIVE.**

The two liberalio-free controls disagree by 2.8× the cluster threshold. The estimator
(`decomposeCycles().excess`) varies too much across comps to form a coherent control band.
The `liberalio` H1 hypothesis (gaugeHits: 5 reconciles both scored comps) is neither accepted
nor rejected — the control-level split refutes proportional-uniformity at the estimator level,
and the primary (iron/T5) split cannot be attributed to `liberalio` specifically.

## 4. Numerical context

The N1 control has a substantially higher residual (0.903) than PI2 (0.442). This means
N1's sim excess overshoots its measured refill by 90%, while PI2 overshoots by 44%. The gap
(0.461) is not explainable by estimator bias (δ_C = 0.165).

For reference, the primaries' residuals:

| primary            | arm            | R      | vs PI2 band [0.371, 0.514] | vs N1 band [0.820, 0.985] |
| ------------------ | -------------- | ------ | -------------------------- | ------------------------- |
| Iron sweep         | H1 gaugeHits:5 | 0.1163 | BELOW                      | BELOW                     |
| T5 wind-weak probe | H1 gaugeHits:5 | 0.6247 | ABOVE                      | BELOW                     |

Under EITHER control's band, the primaries do not form a consistent picture. This confirms
the SPREAD verdict: the estimator is not stable enough across comps to discriminate a
uniform gauge-credit change.

## 5. Implications for the `liberalio` gauge-credit thread

The 2026-08-17 LOG verdict stands. Nothing is enacted. The second control trace confirms
what the proposal already observed: the iron/T5 split S = 0.508 is too wide for any realistic
control band, and adding a second control with an even higher residual only widens the control
spread.

The settling measurement for the `liberalio` sub-hit question remains the per-pull gauge
sub-step hand read (QUEUE item, priority 2). The comp-level estimator cannot separate a
reduced per-sub-hit value from the general fill-tempo gap.

## 6. Files changed

- `scripts/battery/liberalio-gaugehits-ab.ts` — N1 added to `MEASURED_REFILL` array
- `docs/probe-data/fill-trace-n1-rapi-quency-wind-windows.json` — N1 fill-trace fixture (NEW)
- This document — verdict record
