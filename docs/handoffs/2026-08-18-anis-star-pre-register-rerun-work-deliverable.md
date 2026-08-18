# Work deliverable — `anis-star` anomaly-class pre-register re-run (2026-08-18)

> **Status: COMPLETE — measurement only, no enactment.**
> Delta over the 2026-08-17 run. All inputs are committed artifacts on disk; no new footage.
> Packet: `docs/handoffs/2026-08-18-anis-star-pre-register-rerun-preop-packet.md`.
> Artifact: `docs/probe-data/anis-star-e4-recovery-2026-08-18.json`.
> Computation script: `scripts/battery/anis-star-e4-recovery.ts`.

---

## 1. Instrument gate

**PASS.** vitest: 37/37 (identical to 2026-08-17). No fixture or engine change; the gate is
carried forward.

## 2. Run inventory

Carried verbatim from the 2026-08-17 artifact. No new traces, no new recordings. The same 4
solo #2 windows (W2, W3, W4) + 1 A3 window, with the same departure classification
(candidate-free, symmetric, 2.175 pp radius).

## 3. E4 — anomaly recovery test

**PASS.** All 3 upward departures recover under A = 3.71 ± 0.72 pp.

| pull | rendered | adjusted (rendered − 3.71) | \|adj − 11.60\| | recovered |
| ---- | -------- | -------------------------- | --------------- | --------- |
| W2p8 | +15.3    | **11.59**                  | 0.01            | yes       |
| W4p2 | +16.0    | **12.29**                  | 0.69            | yes       |
| W4p3 | +15.2    | **11.49**                  | 0.11            | yes       |

**Downward departure W4p7 (descriptive, +A test):**

| pull | rendered  | adjusted (rendered + 3.71) | \|adj − 11.60\| | recovered  |
| ---- | --------- | -------------------------- | --------------- | ---------- |
| W4p7 | [8.0,8.7] | [11.71, 12.41]             | [0.11, 0.81]    | yes (both) |

W4p7 also recovers under the +A test, consistent with a pull that missed the extra credit
mechanism. This is reported descriptively — the packet does not claim the same mechanism.

## 4. E1_recovered — count-to-fill with recovered pulls

**E4 PASSES → recovered estimators are primary.**

| window | K   | n_up | n_down | residual R     | m     | P interval         | excludes 10.388? | margin (pp) | margin (cols) |
| ------ | --- | ---- | ------ | -------------- | ----- | ------------------ | ---------------- | ----------- | ------------- |
| W2     | 9   | 1    | 0      | [89.09, 89.79] | [8,7] | [11.136, 12.827)   | **yes**          | 0.748       | **1.033**     |
| W3     | 10  | 0    | 0      | 93.5           | [9,8] | [10.3889, 11.6875) | **yes**          | 0.0009      | 0.0012        |
| W4     | 9   | 2    | 1      | [74.48, 75.18] | [7,6] | [10.640, 12.530)   | **yes**          | 0.252       | **0.348**     |

**Clause 1(ii) count: 3 windows** (W2, W3, W4). This is up from 2 in the 2026-08-17 run.

**Key change from 2026-08-17:** W4 now excludes 10.388. In the original run, W4's residual
was [50.7, 51.4] over m = 5, giving P ∈ [10.14, 12.85) — which did not exclude 10.388. Under
recovery, the two upward anomalies' full rendered credits (31.2 pp) are replaced by their
anomaly portions (7.42 pp), increasing the residual to [74.48, 75.18] and m to 7. The lower
bound rises from 10.14 to 10.64, crossing above 10.388 with a 0.348-column margin.

**W4 case B (W4p7 also recovered, descriptive):** R = 83.18, m = 8, P ∈ [10.398, 11.883).
Excludes 10.388 with margin 0.0095 pp (0.013 cols) — very thin. If W4p7's recovery is
accepted, W4's margin is fragile; under the primary case A (W4p7 still departing), the 0.348
column margin is moderate.

**Comparison with 2026-08-17 no-recovery E1:**

| window | 2026-08-17 margin  | 2026-08-18 recovered margin | change            |
| ------ | ------------------ | --------------------------- | ----------------- |
| W2     | 0.683 pp (0.943c)  | **0.748 pp (1.033c)**       | +0.065 pp tighter |
| W3     | 0.0009 pp (0.001c) | 0.0009 pp (0.001c)          | unchanged         |
| W4     | did NOT exclude    | **0.252 pp (0.348c)**       | **new exclusion** |

W2 + W4 now form a **robust pair** — both exclude 10.388 at ≥ 0.3 columns. Even if W3's
razor-thin margin is disputed, clause 1(ii) holds at count = 2 on W2 + W4 alone.

## 5. E2_recovered — telescoping run-mean with recovered pulls

Two new runs enter the LENIENT pool:

| run          | pulls | P̂     | SE_total | weight | QB inflation |
| ------------ | ----- | ----- | -------- | ------ | ------------ |
| W2p8 (new)   | 1     | 11.59 | 0.778    | 1.7    | 0.450        |
| W4e (new)    | 2     | 11.89 | 0.530    | 3.6    | 0.074        |
| W2 6p (orig) | 6     | 11.35 | 0.049    | 410.9  | 0.297        |
| W3 2p (orig) | 2     | 11.25 | 0.148    | 45.7   | 0.116        |
| W3 4p (orig) | 4     | 11.25 | 0.074    | 182.6  | 0.085        |
| W4 1p (orig) | 1     | 11.60 | 0.296    | 11.4   | 1.295        |

**Pooled result:**

| quantity           | 2026-08-17 (no recovery) | 2026-08-18 (recovered) | delta        |
| ------------------ | ------------------------ | ---------------------- | ------------ |
| Pooled P̂           | 11.319                   | **11.323**             | +0.004 pp    |
| SE_pooled          | 0.293                    | **0.297**              | +0.004 pp    |
| Dominant SE source | Question-B               | Question-B             | unchanged    |
| 95% CI             | [10.745, 11.894]         | **[10.741, 11.905]**   | barely wider |
| Excludes 10.388?   | yes                      | **yes**                | unchanged    |

The recovered runs contribute weight 5.2 out of 655.9 (0.8%) to the inverse-variance pool.
Their high SE_A (from the pre-registered A ± 0.72 pp uncertainty) limits their influence.
The E2 result is effectively unchanged.

## 6. E3 — run-height linearity (recovered runs)

6 runs, mean P̂ = 11.488, SD = 0.252. Underpowered (n = 6, dominated by quantization at
short pulls). Evidentially capped — does not gate clauses 1–5.

## 7. Decision rule evaluation

**Clause 0 (E4 gate): PASS.** All 3 upward departures recover under A = 3.71 ± 0.72.
Recovered estimators are primary.

**Clause 1 — MEASURED-ELEVATED: all 4 legs TRUE.**

| leg                             | result | detail                                           |
| ------------------------------- | ------ | ------------------------------------------------ |
| (i) E1 has qualifying windows   | true   | W2, W3, W4                                       |
| (ii) ≥ 2 windows exclude 10.388 | **3**  | W2 (1.033c), W3 (0.001c), W4 (0.348c)            |
| (iii) E2 CI excludes 10.388     | true   | CI [10.741, 11.905]                              |
| (iv) cross-recording agreement  | true   | A3 = [11.05, 12.629) from 2026-08-17 (unchanged) |

**Selected: CLAUSE 1 — MEASURED-ELEVATED.**

The shipped decomposition (7.42 + 2.968 = 10.388 %/pull) is measured-elevated. Anis: Star's
true steady per-pull gauge credit exceeds the model.

## 8. What changed vs the 2026-08-17 run

| aspect                    | 2026-08-17            | 2026-08-18 (recovery)       |
| ------------------------- | --------------------- | --------------------------- |
| Clause                    | 1 (MEASURED-ELEVATED) | 1 (MEASURED-ELEVATED)       |
| Clause 1(ii) window count | 2 (W2, W3)            | **3 (W2, W3, W4)**          |
| W4 E1 exclusion           | no (10.14 < 10.388)   | **yes** (10.640 > 10.388)   |
| Robust pair (both ≥ 0.3c) | W2 only               | **W2 + W4**                 |
| E2 pooled P̂               | 11.319                | 11.323                      |
| E2 CI                     | [10.745, 11.894]      | [10.741, 11.905]            |
| Anomaly model             | not tested            | **E4 PASS: A = 3.71% fits** |

The clause selection is the same, but the evidence is stronger: W4 joins W2 as a
moderate-margin excluder, making clause 1(ii) robust to W3's fragility.

## 9. Fragility and limitations

- **W3 margin** remains razor-thin (0.0012 render columns). If W3 is disputed, clause 1(ii)
  still holds on W2 + W4 = 2 windows.
- **A3 unchanged.** A3 has no departures to recover, so the cross-recording agreement test
  uses the same A3 E1 bound as 2026-08-17.
- **E2 barely moved.** The recovered runs' high SE_A (0.72 and 0.53 pp) limits their weight
  to 0.8% of the pool. The Question-B inflation still dominates.
- **A = 3.71% is a game-side candidate.** `basePerTrigger` is engine-inert. This run
  establishes the anomaly value fits the data, but enacting it would require a separate
  `/scientific-method` run with a new engine expression.
- **n = 3 anomalies on one recording.** A3 shows no anomalies. The recovery is solo-#2-specific.

## 10. Post-verdict descriptive check

Do the anomalous credits cluster at A above the recovered E2 pooled estimate?

| pull | rendered | rendered − E2_pooled | expected A | residual |
| ---- | -------- | -------------------- | ---------- | -------- |
| W2p8 | 15.3     | 15.3 − 11.32 = 3.98  | 3.71       | +0.27    |
| W4p2 | 16.0     | 16.0 − 11.32 = 4.68  | 3.71       | +0.97    |
| W4p3 | 15.2     | 15.2 − 11.32 = 3.88  | 3.71       | +0.17    |

W2p8 and W4p3 cluster within 1 bar column (0.72 pp) of A. W4p2 is 0.97 pp above A — about
1.3 columns. All three are within the departure radius (2.175 pp), consistent with the E4 pass.
The clustering is imperfect but acceptable at the instrument's quantization.

## 11. Sensitivities

- **Radius 1.45 pp (2 cols):** same departure membership (all 3 upward departures exceed 2.175
  AND 1.45 pp), same recovery (all adjusted values within 1.45 of median except W4p2 at 0.69
  — still within). No change.
- **STRICT vs LENIENT conditional pulls:** E2 STRICT drops the conditional-start runs. With
  recovery, the recovered runs are also conditional (they trace back through reload or post-opener
  plateaus). STRICT pool is empty → E2 strictly requires LENIENT. Unchanged from 2026-08-17.
- **W4p7 recovery vs non-recovery:** case A (non-recovery, primary) gives W4 margin 0.348 cols.
  Case B (recovery, descriptive) gives 0.013 cols. The primary case is more robust.
- **A ± 0.72 pp:** at A = 2.99 (lower), W4p2 adjusted = 13.01 (deviation 1.41, still within
  2.175). At A = 4.43 (upper), W4p2 adjusted = 11.57 (deviation 0.03). All recover at both
  bounds. E4 is robust to A tolerance.

## 12. Disposition

**LOG — MEASURED-ELEVATED confirmed by pre-registered anomaly recovery.**

The 3.71% anomaly model passes E4 and strengthens clause 1 from a 2-window result (one
razor-thin) to a 3-window result with a robust W2+W4 pair. The direction is the same as the
2026-08-17 run; the evidence is stronger.

This is a measurement finding. No engine, data, or override change is warranted. The anomaly
mechanism (basePerTrigger × focus × aura) describes a game-side behavior that the engine does
not currently model. Enacting it would require a separate `/scientific-method` run.

The 2026-08-17 harness log entry (disposition SPLIT, open item 2 "owner ruling wanted on the
split") is resolved by the N1c owner ruling (9 pulls fill the bar → ≥ 11.11%/pull) combined
with this re-run's strengthened clause 1 result.
