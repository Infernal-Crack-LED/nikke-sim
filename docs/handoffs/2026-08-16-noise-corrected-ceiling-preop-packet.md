# Pre-op packet — noise-corrected ceiling test on iron sweep (run G) (2026-08-16)

> AI-facing. Judge-named next measurement (2) from the 2026-08-15 H-A/H-B/H-C classification
> run (`docs/handoffs/scientific-method-harness.md` 2026-08-15 entry, ranked item 2), run under
> `/scientific-method`. The post-op judge receives THIS packet + the work deliverable, never the
> driver's verdict. **Pre-registration:** every threshold, constant, and decision clause below
> was fixed and committed BEFORE the noise-corrected rate was computed.

Status: **RUN AND LANDED 2026-08-16 — outcome R1 (DETECTION).** Owner-accepted without the
`/scientific-method` gate (the statistic is arithmetic over already-committed inputs; commit
`8621d670`). Artifact: `docs/probe-data/noise-corrected-ceiling-iron-sweep-2026-08-16.json`.
Corrected rate 4.576/s (primary) / 4.601/s (pooled), both ~11% above the 4.1325 threshold.
Record: `docs/probe-runs.md` 2026-08-16 noise-corrected-ceiling entry. **§G's artifact-update
clause was NOT executed and is superseded** — see the note under §G.

## A. Premise-gate disposition (step 0 — fresh-context verifiers)

- **P1 (iron arm ceiling-test numbers) — CONFIRM from committed artifact.**
  `docs/probe-data/fill-trace-habc-classification.json`, iron sweep (run G) arm, pooled section:
  E = 80 event bins, usableCleanBins = 509, T = 16.9667 s (clean-bin-time denominator — the
  sum of per-window clean-bin durations, verified against `fill-trace-compare.ts`; the
  full-window-duration denominator 23.618 s yields 3.387/s, below the raw ceiling — see MAR
  note below). Credit bins in the usable set = 509 − 429 quiet = 80. C_ceiling = 3.5935/s (sum
  of five per-unit max rates, well below the 30/s bin cap; per-unit breakdown: d-killer-wife
  0.7317, liberalio 0.6667, maxwell 0.7317, milk-blooming-bunny 0.7317, takina 0.7317 — all
  at minGapFrames 82 except liberalio at 90). Threshold = 1.15 × 3.5935 = **4.1325/s**.
  Real event-bin rate = 80 / 16.9667 = **4.7151/s**. Excess share = (4.7151 − 3.5935) / 4.7151
  = **0.2379** (23.8% of the real rate is unattributable to any modeled cadence).

- **P2 (closure residual) — CONFIRM.** Closure residual = **0.2579** > the pre-committed 0.25
  threshold. The arm's classification stays MIXED/INCONCLUSIVE regardless of this run's outcome
  (the 2026-08-15 blind post-op judge's binding ruling; harness lesson 1: a failed closure
  clause may never be re-scoped onto a sub-reading after the fact). This run can produce a
  DETECTION, not a classification.

- **P3 (falseRate input from solo #2) — CONFIRM from committed artifact.**
  `docs/probe-data/anis-star-solo2-gauge.json`, Question B section: primary basis = 492 quiet
  bins, zero false events at all three thresholds (1.41/1.5/1.596), Wilson 95% one-sided upper
  bound = **0.55%** (0.0055). Pooled (joint) basis = 597 quiet bins (492 + 105 from the old A3
  basis), zero false events, Wilson 95% one-sided upper = **0.45%** (0.0045). Both exceed their
  respective basis floors (150/180) by 3.3×. The C4 basis deficit is resolved.

- **P4 (MAR dependence) — CONFIRM.** The clean-bin-time rate convention embeds a
  missing-at-random assumption: events in the 204 non-clean bins (509 − 80 credit − 429 quiet
  is not right — correction: usableCleanBins 509 = credit-in-usable + quiet-in-usable; the
  204 non-clean bins = totalBins 1262 − usableCleanBins 509 minus non-usable bins; the
  classification artifact reports totalBins 1262, usableBins 1244, so non-usable = 18;
  non-clean within usable = 1244 − 509 = 735 bins excluded from the usable clean set by the
  classification's window/coverage filters). Under the full-window-duration denominator
  (23.618 s) the rate is 3.387/s < raw ceiling 3.5935 — no excess at all. The clean-bin-time
  estimator is the principled one (events are only observable in clean bins; nonzero
  `bridgedMass` proves events occur inside excluded spans) — but the dependence is stated as a
  band alongside the headline number (per C4 packet revision 2).

- **P5 (indifference points) — DERIVED from P1.** The noise-corrected rate
  (E − f·Q)/T ≥ threshold (4.1325) ⟺ f ≤ (E − threshold·T)/Q = (80 − 4.1325 × 16.9667)/429 =
  (80 − 70.113)/429 = 9.887/429 = **2.304%**. Noise-corrected rate ≤ raw ceiling (3.5935)
  ⟺ f ≥ (E − ceiling·T)/Q = (80 − 3.5935 × 16.9667)/429 = (80 − 60.970)/429 = 19.030/429 =
  **4.436%**. Between 2.304% and 4.436%: INCONCLUSIVE (margin partially eaten).

## B. Question

Does iron sweep (run G)'s event-rate excess (4.7151/s > 1.15 × 3.5935 = 4.1325/s) survive
correction for the reader's false-event rate, measured on same-regime quiet spans from the
solo #2 recording?

## C. The statistic

**Noise-corrected ceiling rate:**

    rate_corrected = (E − f · Q) / T

Where:

- E = 80 (observed event bins, from classification artifact)
- f = falseRate (Wilson 95% one-sided upper bound from solo #2 — the conservative input)
- Q = 429 (quiet bins: usable clean bins with no sim credit)
- T = 16.9667 s (clean-bin-time denominator)

The subtraction `f · Q` estimates the number of event bins attributable to reader noise on
quiet spans. The corrected rate is what remains after removing the noise contribution.

**Two computations (binding = primary, corroboration = pooled):**

1. Primary: f = 0.0055 (492 quiet bins, Wilson upper).
   Correction = 0.0055 × 429 = 2.36 event bins.
   rate_corrected = (80 − 2.36) / 16.9667 = 77.64 / 16.9667 = **4.576/s**.
   vs threshold 4.1325: **excess survives** (margin: 4.576/4.1325 = 1.107, or 10.7% above).
   vs raw ceiling 3.5935: **above** (share: (4.576 − 3.5935)/4.576 = 0.215, or 21.5%).

2. Pooled: f = 0.0045 (597 quiet bins, Wilson upper).
   Correction = 0.0045 × 429 = 1.93 event bins.
   rate_corrected = (80 − 1.93) / 16.9667 = 78.07 / 16.9667 = **4.601/s**.
   vs threshold 4.1325: **excess survives** (margin: 4.601/4.1325 = 1.113, or 11.3% above).
   vs raw ceiling 3.5935: **above** (share: (4.601 − 3.5935)/4.601 = 0.219, or 21.9%).

**MAR band (revision 2 from C4 packet):**

| Estimator                           | Rate     | vs threshold 4.1325 | vs ceiling 3.5935 |
| ----------------------------------- | -------- | ------------------- | ----------------- |
| Clean-bin-time (raw)                | 4.7151/s | 14.1% above         | 31.2% above       |
| Clean-bin-time (corrected, primary) | 4.576/s  | 10.7% above         | 27.4% above       |
| Clean-bin-time (corrected, pooled)  | 4.601/s  | 11.3% above         | 28.1% above       |
| Full-window-duration                | 3.387/s  | 18.0% below         | 5.7% below        |

The excess is an artifact of the clean-bin-time estimator. Under full-window-duration, no
excess exists at all. The clean-bin-time estimator is principled (the bridgedMass proof that
events occur in excluded spans) but its MAR assumption is the load-bearing caveat.

## D. Pre-committed decision rule

**Basis clauses:**

- **BC1:** The falseRate input MUST come from a measurement that cleared its own basis floors
  (≥150 primary / ≥180 pooled) AND had zero or near-zero false events at the binding threshold
  1.41. Solo #2 clears both (492/597 bins, zero false events at all three thresholds). ✓
- **BC2:** The iron arm numbers MUST be read from the committed classification artifact
  (`fill-trace-habc-classification.json`), not recomputed. ✓
- **BC3:** The closure residual (0.2579) stands; this run does NOT and CANNOT void it.

**Decision branches (priority order):**

- **R1 (excess survives correction):** Both primary and pooled corrected rates exceed the
  threshold (4.1325) → stamp **DETECTION: "H-C-candidate event-rate excess survives
  noise correction"** with the following mandatory caveats:
  (i) MAR-denominator dependence — the excess is an artifact of the clean-bin-time estimator;
  (ii) closure residual 0.2579 stands — the arm's CLASSIFICATION stays MIXED/INCONCLUSIVE;
  (iii) n=1 comp — generality unknown;
  (iv) the correction magnitude is negligible (2–2.4 bins of 80) — the excess is robust to
  falseRate values up to the indifference point 2.304%, which is 4.2× the primary Wilson upper
  bound.
  LOG-class outcome only: probe-runs entry + harness-log append. NO engine change, NO constant
  change, NO classification re-issue, NO enactment.

- **R2 (excess consumed by noise):** Both corrected rates fall below the raw ceiling (3.5935)
  → stamp **SHELVED: "iron sweep ceiling excess not distinguishable from reader noise"**.
  This would require f ≥ 4.436%, which is ~8× the measured Wilson upper — effectively
  impossible on the current input.

- **R3 (inconclusive):** One or both corrected rates fall in [3.5935, 4.1325] →
  **INCONCLUSIVE** — report f, CI, band position, and corrected rate verbatim.

**Sensitivity table (pre-committed):**

| f (Wilson upper)  | Correction (bins) | Corrected rate | vs threshold | Band           |
| ----------------- | ----------------- | -------------- | ------------ | -------------- |
| 0.0045 (pooled)   | 1.93              | 4.601/s        | +11.3%       | R1             |
| 0.0055 (primary)  | 2.36              | 4.576/s        | +10.7%       | R1             |
| 0.0100            | 4.29              | 4.462/s        | +8.0%        | R1             |
| 0.0200            | 8.58              | 4.210/s        | +1.9%        | R1             |
| 0.02304 (indiff.) | 9.88              | 4.132/s        | 0.0%         | R1/R3 boundary |
| 0.0300            | 12.87             | 3.957/s        | −4.2%        | R3             |
| 0.04436 (indiff.) | 19.03             | 3.594/s        | —            | R3/R2 boundary |
| 0.0500            | 21.45             | 3.451/s        | —            | R2             |

The R1 outcome is robust to falseRate values up to ~2.3% — approximately 4× the measured input.

## E. Controls

- **C1 (artifact replay):** the iron arm numbers (E, Q, T, C_ceiling) are read from the
  committed classification artifact and cross-checked against the classification replay test
  (`scripts/tests/probe/habc-classification.test.ts`).
- **C2 (falseRate provenance):** the falseRate is read from the committed solo #2 artifact
  (`docs/probe-data/anis-star-solo2-gauge.json`), not recomputed. The solo #2 run cleared its
  own basis floors and instrument self-checks.
- **C3 (arithmetic check):** the indifference points (2.304%, 4.436%) are derived from P1's
  confirmed numbers by pure algebra; a second derivation path (solving for f in the inequality
  directly) yields identical values.

## F. What this run CANNOT establish

- **The arm's classification** — stays MIXED/INCONCLUSIVE (closure residual 0.2579 stands).
- **Which mechanic** produces the H-C-candidate mass (if R1 fires).
- **The MAR assumption's validity** — quantified as a band (section C table), not tested.
- **Generality** — n=1 comp (iron sweep only); T5's ceiling was cap-saturated (30/s), making
  its H-C detector vacuous.
  **⇒ RESOLVED AS A FOOTAGE QUESTION 2026-08-17, still open as a measurement.** The ceiling
  feasibility screen (`docs/probe-data/ceiling-screen-2026-08-17.json`, pin
  `scripts/tests/probe/ceiling-screen.test.ts`) found `N3 scarlet/liberalio iron` non-vacuous at
  **5.13/s** — comparable to iron's 3.59 — and its recording already exists and reads
  (`docs/probes/714 noon/3.mp4`; the team bar locks at the documented 134px geometry). No new
  footage is needed for the third arm. The classification on it is a separate gated run.
- **Anything enactable** — LOG-class finding only.
- **Solo→team noise transfer** — the falseRate was measured on solo footage; the team footage
  may have different noise characteristics. The solo measurement BOUNDS the team noise
  conservatively (the solo clip is noisier than the team clip per the C4 packet's P2 —
  "Footage documented NOISIER than the maiden-ice-rose anchor family").

## G. Relationship to the struck branch-1 stamp

The 2026-08-15 blind post-op judge struck "H-C mass present" on two grounds:

1. The closure clause (residual 0.2579 > 0.25) — this run does NOT address this ground.
2. The C4 noise gate lacked power (falseRate 4.2–6.9% could reproduce the margin) — this run
   DOES address this ground by providing a same-regime falseRate measurement with 3.3× margin
   over the basis floors.

If R1 fires, the detection re-issues in the LIMITED form the striking judge pre-named:
"H-C-candidate event-rate excess, observed, survives noise correction" — NOT a classification,
NOT a re-issue of the struck stamp, but a logged finding that the excess is not
noise-manufactured at any plausible falseRate. The classification stays MIXED/INCONCLUSIVE.

**SUPERSEDED clause (2026-08-17) — the `observedCeilingExcess` artifact edit is NOT executable
and was not done.** This section originally directed that the field in
`fill-trace-habc-classification.json` be rewritten from "observed, not established" to
"observed, noise-correction-surviving". That field is not free text: it is GENERATED by the
classifier itself (`scripts/probe/fill-trace-compare.ts:2188`, inside the §C closure-clause
branch) from that run's own inputs, and pinned by the replay test
`scripts/tests/probe/habc-classification.test.ts:184`. Hand-editing it would desync the
artifact from the instrument that produces it (a `classify` re-run reverts the edit), break the
replay pin, and — the substantive objection — attribute a LATER, separate measurement to the
classification run's own output. The classification artifact correctly reports what its
instrument computed; the noise correction is a downstream reading over it. The cross-reference
lives in the noise-corrected artifact (`crossRef` field) and in the probe-runs/harness-log
entries instead.

## H. Deliverable

Committed: a verdict-free JSON artifact
`docs/probe-data/noise-corrected-ceiling-iron-sweep-2026-08-16.json` containing:

- The input numbers (E, Q, T, C_ceiling, threshold) with provenance citations
- The noise-corrected rate at both falseRate inputs (primary + pooled)
- The sensitivity table (section D)
- The MAR band (section C table)
- The decision branch that fired
- All three control results

Plus: probe-runs.md append, harness-log entry, QUEUE.md update.
