# Driver review (gate #1) — N3 third arm — written BEFORE the blind post-op returned

> **This file is deliberately NOT part of the blind post-op packet.** The blind judge receives
> exactly the pre-op packet + the work deliverable. Putting this verdict in the packet would void
> gate #2, whose entire value is being uncorrelated with the driver. Written and committed
> 2026-08-17, before spawning the post-op judge.

## Verdict: ACCEPT the work as a faithful execution — CONFIDENCE MEDIUM

The accepted claim is NARROWER than the deliverable's R-A branch. See §3.

## 1. Did it follow the approved method?

Yes, and in the places where following it was uncomfortable:

- **The peek declaration was honoured** — iron's E.3 half was computed in the work step, dated, and
  the instrument reproduces iron's published `closureResidual` 0.2579 / `rho` 1.6202 / `S` 1.0714
  before doing anything else.
- **It flagged rather than resolved.** C2 came out estimator-dependent and it reported all four
  readings with their verdicts instead of picking one. The §E.3 clauses turned out not to fire and
  it said so rather than bending the nearest one to fit.
- **It did not tune.** Constants untouched; `e-min` 1.5; shifts witnessed (0.0303 / 0).
- **It declined scope it was not given** — no probe-runs or harness-log entry, on the stated ground
  that naming the branch before the blind post-op would pre-empt it. That is the correct call and I
  did not ask for it.

## 2. Independently re-verified by me (not taken on trust)

- **The closure scale-invariance algebra.** Recomputed from the reported terms: as-specified
  0.2579, variant (b) 0.2579, variant (a) 0.0812 — all three reproduce exactly. `oEff ∝
sumRealDelta` and `rho ∝ sumRealDelta`, so `|oEff·S − rho|/rho` is invariant under any uniform
  rescaling of `sumRealDelta`. **CONFIRMED.**
- The replay pin runs green (15/15); artifact fields match the reported numbers.

## 3. Where I do NOT accept the deliverable's headline at face value

**3a. C2's estimator was never pre-registered — that is a defect in MY packet, not in the work.**
§F C2 said "15.0 ± 0.5s" and never said HOW to measure a Full Burst duration off the trace. The
drain-bar renderer demonstrably under-renders (a true 10.0s FB reads ~8.69s / ~8.755s on two
independent committed fixtures), so a literal reading is known-biased. Four defensible estimators
exist and **the branch flips on the choice**: the assumption-free bracket and the paint-calibrated
point estimate PASS; the render-calibrated and literal readings BASIS-BREAK.

I am NOT choosing between them. Choosing an estimator after seeing which way each one sends the
verdict is precisely harness lesson 1's failure mode — the thing that got the 2026-08-15 stamp
struck. The blind judge gets all four and rules.

For the record, without acting on it: the paint-side calibration is ~10× tighter (±0.0062s, n=12)
than the render-side, and C2-iv is biased by a measured amount. Those are reasons a future packet
should pin the paint-calibrated estimator **in advance** — they are not licence to pin it now.

**3b. My E.3 diagnostic was structurally ill-posed and cannot answer R2.** Given scale-invariance,
variant (b) — the internally consistent correction — is a mathematical no-op, and variant (a) is
internally inconsistent (it corrects `massCorrReal` but not `rho`, though both derive from the same
`sumRealDelta`). **Bridged mass cannot drive the closure residual by construction.** R2 as I framed
it was not a live hypothesis; it was an arithmetic misunderstanding on my part, and the run's real
yield here is discovering that, not testing it.

**3c. The E.3 pre-committed clauses do not fire.** All three presupposed both arms failing closure.
N3 PASSES at 0.0533 where iron failed at 0.2579. Another pre-registration gap of mine.

**3d. The observed raw rate 6.7208 sits 0.0105 from the H1 prediction 6.7313.** This is the single
most over-readable number in the deliverable and I am explicitly not reading it. Realised separation
is **0.59σ** (69 event bins, against the 178 assumed pre-run) — worse than the already-underpowered
0.98σ. A 0.0105 gap against a 0.48/s separation under ~0.8/s noise is coincidence-compatible. The
packet pre-committed that no branch keys off this, and that pre-commitment is doing exactly the work
it was written to do.

**3e. The MAR caveat is WORSE on this arm, and the bias runs the other way.** Under the full-window
denominator N3 reads 4.5641/s — **11.0% below its own ceiling** (iron: 5.7% below). And C7's
bridge-vs-fill-activity ratio is **0.757 on N3 vs 1.357 on iron** — opposite directions. So the
clean-bin estimator's bias is not even consistent in sign across the two arms, which weakens any
story that treats the two detections as one phenomenon.

## 4. Rubric (scored before reading the blind judge's return)

- **Q1 provability from hard data** — PARTIAL. Numbers are real, reproduced, and independently
  re-derived, but the branch is estimator-dependent (3a).
- **Q2 math naturalness** — COMPROMISED, in my own design: the E.3 diagnostic was ill-posed (3b).
  No free knobs were fitted, and nothing was tuned to a target.
- **Q3 control-team validatability** — NOT GATING. Nothing enactable; LOG-class at every branch.
- **Q4 one-character-at-board-cost** — CLEAN. No engine, override, snapshot, DECISIONS or STATE
  file touched; zero board movement by construction.

**⇒ MEDIUM.** Not HIGH: Q1 is partial and Q2 is compromised. Under the 2-of-2 rule a MEDIUM caps
this at **LOG** regardless of what the blind judge returns — which is where the packet placed it
anyway.

## 5. The claim I would accept, in my own words

> On the clean-bin-time estimator, N3's noise-corrected event-bin rate (6.5927/s) exceeds its
> pre-registered threshold (5.8996/s) and its raw excess share (0.2367) falls in the same magnitude
> class as iron's (0.2379); unlike iron, its closure clause PASSES. Whether that constitutes the
> pre-registered R-A stamp or a BASIS-BROKEN outcome turns on a Full-Burst-duration estimator the
> packet failed to pin. Nothing here bears on the shared-`liberalio` rival (realised 0.59σ), and the
> excess again exists only under the clean-bin-time denominator — with the bridging bias running
> OPPOSITE on the two arms.

I do not accept, and would strike, any wording that presents this as generality, as a classification
of either arm, or as evidence for the H1-vs-R1 question.
