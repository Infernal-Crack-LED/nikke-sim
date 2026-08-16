# Pre-op packet — C4 same-regime noise-floor re-run (2026-08-16)

> AI-facing. Judge-named next measurement #1 from the 2026-08-15 H-A/H-B/H-C classification run
> (`docs/handoffs/scientific-method-harness.md` 2026-08-15 entry), run under `/scientific-method`.
> The post-op judge receives THIS packet + the work deliverable, never the driver's verdict.
> **Pre-registration:** every threshold, span table, guard spec, and decision clause below was
> fixed and committed BEFORE any quiet-span statistic was computed.

## A. Premise-gate disposition (step 0 — three fresh-context verifiers, blind to driver belief)

- **P1 (iron arm numbers) — CONFIRM** (recomputed from
  `docs/probe-data/fill-trace-habc-classification.json` per-window tables; corroborated by the
  committed replay test `scripts/tests/probe/habc-classification.test.ts`, 8/8 green). E=80 event
  bins, U=509 usable clean bins, Q=429 quiet bins, T=16.9667 s (clean-bin-time denominator,
  verified against `fill-trace-compare.ts:2006-2008`; wall-clock 23.618 s does NOT reproduce the
  recorded 4.7151/s), C_ceiling=3.5935/s, threshold 4.1325/s. Derived cutoffs: noise-corrected
  rate (E − f·Q)/T ≥ threshold ⟺ **f ≤ 2.304%**; ≤ raw ceiling ⟺ **f ≥ 4.436%**.
  **Carried scope correction (load-bearing):** the clean-bin-time rate convention embeds a
  missing-at-random (MAR) assumption over the 204 non-clean bins; under a full-window-duration
  denominator the rate is 3.387/s < raw ceiling — no excess at all. Driver position (ratified by
  the pre-op judge, ruling 1): clean-bin-time is the principled estimator (events are only
  observable in clean bins; nonzero committed per-window `bridgedMass` proves events occur inside
  excluded spans, refuting the full-duration estimator's all-events-observed premise) — but the
  dependence is quantified in the deliverable (revision 2) and leads the stamp text.
- **P2 (`anis-star` solo quiet basis) — CONFIRM, scope-corrected.**
  `docs/probe-data/anis-star-solo-a3-gauge-reread.json`: continuous committed series (676 reads,
  30 fps, t 0→22.5, + a 60 fps changes-only series) of `anis-star` (Anis: Star, RL/Electric,
  Burst I) SOLO. 9 pulls pinned by pixel-free ammo counting (magazine-2 instants at 0.1 s; pulls
  3/4/6 bar-derived/cadence-interpolated); fire→credit latency ~0.30 s; no other modeled gauge
  source fires between pulls in the solo noB1 formation (the S1 `flatDamage` rider lands
  same-frame as the pull). Ground-truth-quiet spans exist ONLY inside **t≈7.70–19.37 minus the
  tint span 16.00–17.97** (~7.0–8.4 s ≈ 210–250 bins in 8–10 plateaus); `state=='filling'` is NOT
  a cleanliness filter (solo reader path emits no artifact flags; t<7.70 is unflagged
  load-screen/cut-in garbage rendering "filling 100.0"). Detection floor ±0.725 pp raw (1 bar
  column); two recorded 1-column noise events in otherwise-clean spans; `rawOverTrue=1.064`
  reported but NOT applied to `fillRaw`. Footage documented NOISIER than the `maiden-ice-rose`
  anchor family (biases f UP = against H1 — an H1 pass is conservative).
- **P3 (`snow-white-heavy-arms` solo basis) — REFUTED as stated; narrow form only.**
  `docs/probes/solo/swha-solo.mov` (SR/Water, solo) is 11.77 s, ONE fill cycle (t=7.83–11.03);
  first 7.8 s unflagged render garbage; genuine inter-cluster quiet ≈ two ~0.64 s gaps (~40 bins);
  existing trace is untracked scratch, frame-extraction half of the invocation undocumented.
  ⇒ swha can only corroborate: it enters pooled statistics ONLY if its credit clusters are
  pixel-free-pinned; otherwise descriptive-only (and descriptive-only numbers may NOT be cited as
  corroboration in any stamp text — pre-op risk flag).

## B. Question

Is the reader's false-event rate at the classification statistic's event threshold, measured on
ground-truth-quiet spans in the SAME render regime as the classification's clean reads (bar
painted, filling state, between credit events), low enough that iron sweep (run G)'s branch-1
event-rate excess (4.7151 event-bins/s > 1.15 × C_ceiling = 4.1325/s) survives noise correction?
This decides whether the 2026-08-15 blind judge's struck "H-C mass present" stamp re-issues per
that judge's own pre-named resolution path ("re-run C4 on a same-regime quiet basis … if the
in-window false-event rate is ≲1%, 'H-C mass present' re-stamps on iron; the single cheapest
resolver").

## C. Hypotheses

- **H1.** Filling-regime false-event rate is low (Wilson one-sided 95% upper bound on pooled
  f < 2.304%): the branch-1 margin is not noise-manufactured → the struck stamp re-issues as a
  **DETECTION** ("H-C mass present — unattributable event-rate mass, UNDER the clean-bin-time
  estimator"), with caveats: (i) MAR-denominator dependence (quantified per revision 2), (ii) the
  closure residual 0.2579 stands — the arm's CLASSIFICATION stays MIXED/INCONCLUSIVE, (iii) n=1
  comp, (iv) the ≲1%→2.304% reconciliation stated explicitly (the judge's ≲1% was informal; the
  verified indifference point is 2.304%; the bound used is the one-sided 95% Wilson upper limit —
  stricter than a point estimate).
- **H0a.** Filling-regime f ≥ 4.436% (point), as on the drain-hold basis (6.93% iron per-source):
  the excess is **not distinguishable from reader noise on any available quiet basis** — H-C
  candidate SHELVED pending a cleaner same-regime basis; the H-B descriptive signature survives.
  (Reworded per revision 3 — no affirmative solo→team noise attribution.)
- **H0b.** Intermediate f: margin partially eaten → INCONCLUSIVE.
- **Named confounds.** (C-a) solo→team noise transfer — two independent clips, per-source spread
  reported; noisier-footage direction bounds an H1 pass as conservative; an H0a hit is worded per
  revision 3. (C-b) mis-pinned credit instants → pixel-free pinning + guard bands + the
  pre-registered span construction; pulls 3/4/6 guards widened ×2. (C-c) raw-vs-true units →
  binding threshold **Δ_raw > 1.41** (≡1.5 true units, the conservative conversion), with 1.5 and
  1.596 raw reported as the bracket (revision 5).

## D. Method

1. **Committed instrument** (CLAUDE.md constraint 9): extend `scripts/probe/fill-trace-compare.ts`
   with a `noise-solo` subcommand — inputs: a solo series JSON, a pre-registered span/guard spec,
   the event-definition constants (bin 1/30 s, max gap 2 trace-frames, threshold). Outputs per
   source + pooled: quiet bins, pairs, false-event bins, f, one-sided 95% Wilson upper bound,
   p95 positive Δ, max Δ, the FULL positive-Δ distribution, and the fill-level distribution of
   qualifying quiet spans (revision 4). Before span extraction, run the dominant-curve (offCurve)
   pass (`_dominant_chain` semantics, as team `--reflag`) over each solo series; report all flags;
   flagged reads are excluded from quiet statistics.
2. **PRIMARY basis:** the committed `anis-star` series30fps. Quiet spans = [7.70, 19.37] minus
   [16.00, 17.97] minus a guard band around each of the 9 pinned credit instants:
   [fire − 2 frames, fire + 0.30 s + 8 frames]; pulls 3/4/6 guards widened ×2. Cross-check
   resulting spans against P2's independently derived plateau table; any discrepancy is a
   reported finding.
3. **SECONDARY basis:** regenerate the swha-solo trace (`ffmpeg -vf fps=30` uncropped
   auto-rotated frames → `gauge-fill.py --frames <dir> --fps 30 --bar 489:501:2474:2612`), COMMIT
   trace + full invocation. Window t ≥ 7.83. Enters pooled f ONLY with pixel-free credit-cluster
   pinning (ammo counter legible); else descriptive-only. Self-check: must reproduce the
   probe-runs 2026-08-15 read (single 0→full cycle 7.83–11.03; 0.20 s-spaced +5.8–7.2 clusters;
   one ~+15.2 weapon-shot step) else the basis VOIDS.
4. **Controls.** **C-i** replay the committed original drain-hold C4 (`quietNoiseCheck`) from the
   opening artifacts — must reproduce 6.93/3.2/2.83/pooled 4.22% exactly (failure = instrument
   disowned → CANNOT-MEASURE). **C-ii** the swha regen self-check. **C-iii** guard sensitivity:
   recompute f with all guards ×1.5; binding value = the HIGHER (more conservative) f.
   **C-iv** the magnitude-profile discriminator (§E P-B, now gating via revision 1).
   **C-v** dominant-curve flag report (expected: the anis-star tint span self-flags; a flag
   inside a pre-registered clean span drops that span and is a reported finding).
5. **Pre-commitment note:** there is no team-side unblinding in this run (team numbers are
   already public in the committed artifact); the protection is that this span table, guard spec,
   and every threshold was committed before any quiet-span statistic was computed.

## E. Predictions (incl. discriminating)

- **P-A:** filling-regime f materially LOWER than the drain-hold iron 6.93%. If ≥, H0a gains.
- **P-B (DISCRIMINATING, gating per revision 1):** iron's team event-bin Δs sit at median ~6
  (range 5.2–21.6). If real credits (H1): solo quiet-span positive Δs cluster ≤1 column
  (≤0.8 raw), the ~5–7 band EMPTY. If threshold-noise (H0a): a positive-Δ tail reaching the team
  event-size band. Separates H1 from H0a independently of the rate arithmetic.
- **P-C:** the original-C4 replay reproduces the committed figures exactly.

## F. Pre-committed decision rule (priority order)

**Basis clauses (any failure → CANNOT-MEASURE = "basis broken", never "effect absent/present"):**

- **BQ1** primary basis ≥ 150 quiet bins after all exclusions AND pooled ≥ 180 (report n
  prominently; a pass at the floor is weaker than a pass at 250 — pre-op risk flag).
- **BQ2** C-i replay exact.
- **BQ3** every basis entering pooled f has pixel-free credit pinning.
- **BQ4** if two qualifying bases' per-source f disagree by >3× with both above 50 quiet bins →
  pooled unreliable → INCONCLUSIVE unless BOTH land in the same decision band.

**Then:**

- **R1 (re-stamp):** Wilson one-sided 95% upper bound on pooled f < 2.304% AND every qualifying
  per-source point f < 2.304% → the branch-1 DETECTION re-issues as worded in H1 with all four
  caveats. **R1 is BLOCKED (→ R3, regardless of pooled f) if ≥2 pooled post-guard quiet-span
  false-event bins have Δ_raw ≥ 4.7 (≈5 true units); exactly 1 such bin is a material adverse
  finding that must appear in the re-stamp text** (revision 1, numbers pre-committed here).
  LOG-class outcome only: probe-runs entry + classification-artifact successor + harness-log
  append. NO engine change, NO constant change, NO enactment.
- **R2 (shelve):** pooled point f ≥ 4.436% → H0a wording (revision 3).
- **R3:** otherwise INCONCLUSIVE — report f + CI + band position; named next step: a third comp
  with a non-vacuous ceiling, or more same-regime quiet footage.

## G. Deliverable (judge-ready, NO verdict baked in)

Committed: the `noise-solo` subcommand + a vitest fixture pinning its result on the committed
`anis-star` series + the regenerated swha trace with full invocation (if used). Report: per-span
tables; per-source + pooled f at Δ_raw thresholds 1.41 (binding), 1.5, 1.596 (revision 5) with
Wilson bounds; the full positive-Δ magnitude distribution vs the team event-size profile; the
fill-level regime comparison (quiet-span fill levels vs iron's team usable clean-bin fill
levels — revision 4); the MAR quantification (revision 2): the rate under BOTH denominators as a
band (4.7151 clean-bin vs 3.387 full-duration vs threshold 4.1325 and ceiling 3.5935), plus a
bridgedMass-derived event-count estimate for excluded spans (bridged mass ÷ median team event
size, spread over full window time); all five control results.

## H. What this run CANNOT establish (carry to post-op)

Which mechanic the H-C mass is; anything about the T5 arm; the validity of the clean-bin/MAR
estimator itself (carried + quantified, not tested); affirmative attribution of the team excess
to noise from a solo basis (R2's shelving is not proof of noise); the arm's overall
classification (stays MIXED/INCONCLUSIVE; residual 0.2579 stands); generality beyond n=1 comp;
no promotion of the opening-window "nothing banks" claim; nothing enactable.

## I. Pre-op verdict

**APPROVED-WITH-REVISIONS (Fable pre-op judge, 2026-08-16); revisions 1–5 all executed above**
(1: P-B wired into R1 as a blocking clause with pre-committed numbers; 2: MAR dependence
quantified in the deliverable + estimator condition leads the stamp text; 3: R2 reworded to
shelving, no solo→team noise attribution; 4: fill-level regime comparison reported; 5: threshold
bracket 1.41/1.5/1.596 reported, 1.41 binding). Judge rulings: MAR caveat acceptable WITH
quantification; RL-not-SR primary basis acceptable (the control measures a READER property in a
render regime, and the striking judge's own wording offered the offCurve-reflagged route);
re-issuing branch-1 as a DETECTION is licensed and is not re-litigation (the striking judge
pre-named this measurement and its re-stamp consequence; harness lesson 1 voids the
CLASSIFICATION, which stays voided). Carried risk flags: power (R1 reachable essentially only on
a zero-or-one-event result; INCONCLUSIVE is a likely outcome), BQ1-floor weakness, swha
descriptive-only leakage prohibition, iron-only scope.
