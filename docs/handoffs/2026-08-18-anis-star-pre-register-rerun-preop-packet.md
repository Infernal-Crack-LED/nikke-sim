# Pre-op packet — `anis-star` anomaly-class pre-register re-run (2026-08-18)

> Status: **DRAFT — awaiting pre-op judge approval.**
> QUEUE item 1 (thread 2). Measurement-only — **no enactment** whatever the outcome.
> Footage-FREE: every input is a committed artifact already on disk.
>
> **This is a DELTA packet.** Everything not restated here is inherited verbatim from the
> 2026-08-17 packet (`docs/handoffs/2026-08-17-anis-star-solo-magnitude-preop-packet.md`,
> APPROVED-WITH-REVISIONS). The 2026-08-17 deliverable
> (`2026-08-17-anis-star-solo-magnitude-work-deliverable.md`) and artifact
> (`docs/probe-data/anis-star-solo-magnitude-2026-08-17.json`) are the baseline.
> What this packet ADDS is a pre-registered anomaly-value hypothesis and an anomaly-recovery
> test that converts departing pulls back into steady data points.

---

## 1. What this run is, and what the 2026-08-17 run left open

The 2026-08-17 run returned INCONCLUSIVE at 2-of-2. Its estimators (E1 count-to-fill, E2
telescoping run-mean) correctly handled departing credits by removing them, but the removal
cost discriminating power: W4 lost two of its nine pulls to the departure class, widening its
E1 interval past usefulness; W2 lost one pull from its longest run, weakening E2's scatter leg;
and the clause-1(ii) count fell one window short because W3's E1 exclusion was razor-thin
(0.0012 render columns).

The 2026-08-17 source hunt (`docs/probe-data/anis-star-anomaly-source-hunt-2026-08-17.json`)
then established that the anomalous pulls are **gauge-specific** — identical damage to the
steady pulls, different gauge credit — and proposed the candidate: one extra credit of
`basePerTrigger` 140 × 2.5 focus × 1.06 aura = **3.71 %**.

This packet **pre-registers** that candidate as a testable anomaly value and asks: if the
departing pulls credit steady + 3.71 %, can they be **recovered** as steady data points? If
yes, the estimators gain power (more pulls per window, longer runs) and the clause-1(ii) count
may recover.

## 2. Pre-registered anomaly value

**A = 3.71 pp** (percentage points of the gauge bar).

Source: the 2026-08-17 source hunt's `arithmeticFit` block. Derived from:
`basePerTrigger` 140 (= `burst_energy_pershot`/100 from `data/gauge-per-shot.json:50-55`)
× 2.5 (focus, `characters.json.chargeMultiplier` 250)
× 1.06 (her own +6 % aura, `overrides/anis-star.json`).

**Firewall (carried from the 2026-08-17 packet, still binding):**

- `basePerTrigger` is **engine-inert** — `sim.ts` never reads it. If A fits, it describes a
  **new game-side mechanism**, not a mis-set engine constant.
- A was **fitted after the fact on n = 3 credits from one recording**. Pre-registering it here
  converts it from a post-hoc fit to a **pre-committed testable prediction** — but only for the
  recovery test (E4), not for the primary estimators (E1, E2), which remain A-free.
- The 2026-08-17 source hunt's `observedExcessTrue` = [4.14, 3.38] (the two W4 anomalies
  after correcting for the bar-paint quantization). A = 3.71 sits between them, within one bar
  column (0.72 pp) of each. **This is the fit quality that must be reproduced, not improved on.**

**Tolerance:** ±0.72 pp (= one render column of a 138 px bar, the instrument's quantization
unit). A departing pull is RECOVERED if `|rendered − A − median_all| ≤ 2.175 pp` (the same
3-column departure radius the 2026-08-17 run used, now applied to the ADJUSTED value).

## 3. Blindness declaration

**SEEN (carried from 2026-08-17, no change):** the per-pull deltaPct table, the departure
classification, E1 and E2 results, the A3 E1 bound, the source hunt's damage-identity finding.

**NOT SEEN / NOT COMPUTED — this is the pre-registered surface:**

- **E4 — the anomaly recovery test.** Whether subtracting A = 3.71 from the departing pulls
  places them inside the steady family.
- **E1_recovered and E2_recovered** — the estimators recomputed with the recovered pulls
  included. Their values, CIs, and clause selections.
- **The clause selection under recovery.** Whether the additional pulls change the clause-1(ii)
  window count or the E2 pooled estimate.

The 2026-08-17 E1 and E2 values are known and carried as the **no-recovery baseline**. The
recovery estimators are the genuinely unseen surface.

## 4. Estimators

### Inherited (unchanged from 2026-08-17)

- **Departure classification:** `|Δ − median_all| > 2.175 pp`, symmetric, candidate-free.
  Membership: solo #2 W2p8 (+15.3), W4p2 (+16.0), W4p3 (+15.2), W4p7 (≈+8.0–8.7); A3 none.
  Identical at both radii (the `[NR1]` sensitivity trigger did not fire).
- **E1** — anomaly-aware count-to-fill (departures subtracted as rendered, not as A).
- **E2** — telescoping run-mean (departures excluded from runs).
- **E3** — run-height linearity (underpowered, evidentially capped).

### New: E4 — anomaly recovery test

For each upward departing pull with rendered credit `R_i`:

```
adjusted_i = R_i − A                # subtract the pre-registered anomaly value
```

**Recovery criterion:** `|adjusted_i − median_all| ≤ 2.175 pp` (the same departure radius).

| pull | rendered | adjusted (= rendered − 3.71) | |adjusted − 11.60| | recovered? |
| --- | --- | --- | --- | --- |
| W2p8 | +15.3 | **11.59** | 0.01 | **yes** |
| W4p2 | +16.0 | **12.29** | 0.69 | **yes** |
| W4p3 | +15.2 | **11.49** | 0.11 | **yes** |

**Prediction:** all three upward departures recover. If ≥2 of 3 fail to recover → E4 FAILS,
the 3.71 % model does not explain the anomalies, and the no-recovery estimators (E1, E2 from
2026-08-17) are the primary ones.

**Downward departure W4p7 (≈ +8.0–8.7):** reported separately. If it is a pull that MISSED the
extra credit, then `adjusted = R_i + A`:

| pull | rendered | adjusted (= rendered + 3.71) | |adjusted − 11.60| | recovered? |
| --- | --- | --- | --- | --- |
| W4p7 | [8.0, 8.7] | [11.71, 12.41] | [0.11, 0.81] | **yes** (both bounds) |

This is a separate, descriptive test. The packet does NOT claim the downward departure is the
same mechanism in reverse — it is reported alongside for completeness.

### New: E1_recovered — count-to-fill with anomaly-recovered pulls

When E4 passes (all upward departures recover), recompute E1 with the recovered pulls treated
as steady pulls that credit `A` extra gauge:

```
residual_recovered = residual_original + n_recovered × A
m_recovered        = K − 1                    # all pulls are now steady (no departures removed)
P ∈ [ residual_recovered / m_recovered ,
       residual_recovered / (m_recovered − 1) )
```

The smeared W4p7 enters as an interval (per `[NR4]`), same as in the original E1. If W4p7 also
recovers (the +A test above), it too enters as a steady pull with an interval.

**Per-window effect of recovery:**

| window | K   | m (no recovery) | m (recovered) | residual (no recovery) | residual (recovered)                            |
| ------ | --- | --------------- | ------------- | ---------------------- | ----------------------------------------------- |
| W2     | 9   | 7               | **8**         | [77.5, 78.2]           | [77.5 + 3.71, 78.2 + 3.71] = [81.21, 81.91]     |
| W3     | 10  | 9               | 9             | 93.5                   | 93.5 (no departures to recover)                 |
| W4     | 9   | 5               | **7**         | [50.7, 51.4]           | [50.7 + 2×3.71, 51.4 + 2×3.71] = [58.12, 58.82] |
| A3     | 9   | 8               | 8             | 88.4                   | 88.4 (no departures)                            |

W4p7 recovery (if it passes) would further increase W4's m to 8 and add +3.71 to the residual.

### New: E2_recovered — telescoping run-mean with recovered pulls bridging gaps

The recovered pulls rejoin their adjacent runs. In W2, W2p8 (previously excluded) bridges the
gap between the post-reload run (p7) and the fill-clipped p9, potentially extending the longest
run. In W4, W4p2 and W4p3 (previously excluded) rejoin the early-magazine run, extending it
from 1 pull to 3+ pulls.

The run-height linearity check (E3) is recomputed on the recovered runs.

## 5. Decision rule (addendum to the 2026-08-17 rule)

The 2026-08-17 clauses 1–5 are inherited. This packet adds:

**Clause 0 — E4 gate (evaluated FIRST, before clauses 1–5):**

- **E4 PASSES** (all upward departures recover under A = 3.71 ± 0.72): the recovered
  estimators (E1_recovered, E2_recovered) are the **primary** estimators. Clauses 1–5 are
  evaluated on them. The no-recovery estimators are reported alongside as a sensitivity.
- **E4 FAILS** (≥2 of 3 upward departures do not recover): the no-recovery estimators (E1,
  E2 from 2026-08-17) remain primary. Clauses 1–5 evaluate on them — which reproduces the
  2026-08-17 result. E4's failure is logged as a finding: the 3.71 % model does not explain
  the anomalies at the pre-registered tolerance.

**Clause 1(ii) under recovery:** montage-verified windows excluding 10.388 under E1_recovered.
W2 and W4 gain pulls and may tighten their E1 intervals; W3 is unchanged (no departures).
W1 remains reader-only and barred. The ≥2 window count is re-evaluated.

**Clause 1(iv) under recovery:** A3 has no departures, so recovery does not change its
estimators. The cross-recording agreement test is re-evaluated with solo #2's recovered
estimators against A3's unchanged ones.

## 6. Predictions

| what is true                                  | E4   | E1_recovered vs E1                | E2_recovered vs E2        | clause                                      |
| --------------------------------------------- | ---- | --------------------------------- | ------------------------- | ------------------------------------------- |
| 3.71 % anomaly is real, P_steady elevated     | PASS | tighter intervals, same direction | longer runs, tighter CI   | clause 1 more likely (more windows qualify) |
| 3.71 % anomaly is real, P_steady = model      | PASS | tighter intervals around 10.388   | longer runs around 10.388 | clause 2 reachable                          |
| 3.71 % is wrong (anomaly has different value) | FAIL | —                                 | —                         | same as 2026-08-17 (INCONCLUSIVE)           |

## 7. Controls (inherited, re-verified)

All 2026-08-17 controls are re-verified:

- (a) trace-event count == montage pull count over every run used
- (b) no burst-DoT window overlaps any measured run
- (c) Question-B false-event rate carried from the 2026-08-17 artifact

No new controls needed — the recovery test uses the same recordings and traces.

## 8. Scope and limitations

- **Measurement only.** No engine, data, or override change. If the anomaly value fits, it is
  logged as a descriptive finding on U28; the mechanism is a separate question.
- **The 3.71 % value is a game-side candidate.** `basePerTrigger` is engine-inert. Even a
  perfect fit describes something the engine does not currently model. Enacting it would need
  a `/scientific-method` run with a new engine expression — not this packet.
- **n = 3 anomalies on one recording.** A3 shows none. If E4 passes on solo #2 but the
  mechanism is real, A3 should show it too — but A3 has no departures to test. The anomaly
  recovery is solo-#2-specific.
- **The downward departure W4p7 is reported, not explained.** The packet tests whether it
  recovers under +A but does not claim the same mechanism.

## 9. Method (work step, after approval)

1. **Instrument gate first** (same as 2026-08-17 §method step 1). Fail ⇒ BASIS-BROKEN, stop.
2. **Rebuild the run inventory** from the committed traces (same as 2026-08-17 §method step 2).
3. **Departure classification** — carry the 2026-08-17 classification (candidate-free, same
   membership at both radii). Write it into the artifact.
4. **E4 — anomaly recovery test.** Compute adjusted values, test recovery criterion. Write
   PASS/FAIL into the artifact BEFORE computing any recovered estimator.
5. **E1_recovered and E2_recovered** (if E4 passes). Compute per the formulas in §4.
6. **E1 and E2** (no-recovery baseline). Carry from 2026-08-17 or recompute — must match.
7. **E3** — recompute on recovered runs (if E4 passes).
8. **Decision rule** — evaluate clause 0, then clauses 1–5 on the primary estimators.
9. **Post-verdict descriptive check** — does `(rendered anomalous credit − pooled E2_recovered)`
   cluster at A = 3.71 within quantization? A hit corroborates; a miss does not change the
   verdict.
10. **Sensitivities** — both radii (1.45 and 2.175 pp); STRICT vs LENIENT conditional pulls;
    W4p7 recovery vs non-recovery; A ± 0.72 pp.
