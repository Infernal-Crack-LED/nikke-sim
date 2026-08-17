# Pre-op packet — third classification arm: `N3 scarlet/liberalio iron` (2026-08-17)

> AI-facing. Judge-ranked step (4) of the 2026-08-15 H-A/H-B/H-C classification run: "a third comp
> with a non-vacuous ceiling". Run under `/scientific-method`. The post-op judge receives THIS
> packet + the work deliverable, never the driver's verdict.
>
> **Pre-registration:** every threshold, constant, control and decision clause below is fixed
> BEFORE any real-side number for this arm is computed. The sim-side ceiling (5.13/s) and the
> instrument self-checks were computed before this packet and are cited as inputs, not results.

Status: pre-op **APPROVED-WITH-REVISIONS** (Fable, 2026-08-17) → **all 7 revisions executed**,
resubmitted for confirmation. Revision log at §J.

## A. Premise-gate disposition (step 0 — four fresh-context verifiers, each blind)

**P1 (recording provenance) — CONFIRM, two narrowings.** `docs/probes/714 noon/3.mp4` is a
full-auto, 180s, LV.400, no-cube fight of `rouge` / `trina` / `scarlet-black-shadow` / `liberalio` /
`soda-twinkling-bunny` in slots 1–5, camera focus on slot 3 `scarlet-black-shadow`. Roster
re-derived from the recording itself by three independent routes (burst-icon romans, HUD element
hexagons, HUD max-ammo 6/6/9/6/9) and closed decisively: the video's end card reads TOTAL DAMAGE
**1,208,500,947** and the five per-unit rows on `3.JPEG` sum to exactly that, and those five numbers
are byte-identical to the `real` block at `scripts/experiment.ts:471-475`. The `a2`-style
filename/index failure mode does not apply. Focus is now MEASURED (ammo-box vs HUD-card arithmetic
at videoT 12s and 140s), where `docs/probe-runs.md:1260` had it as a middle-slot DEFAULT for the
whole 714-noon batch. Video: HEVC 1206×2622 rotation-90, 59.86fps, 198.647s; fight timer 03:00 at
videoT ≈ 8.5s, 00:00 at videoT ≈ 188.5s.

- **Narrowing 1 — `boss: 'Iron'` is PROSE-ONLY, not recording-verified.** Nothing on screen names
  the element; the arena and boss model are pixel-identical to `1.mp4`, which is declared Wind, so
  the model carries zero element information. The declaration traces to a plan-side note
  (`scripts/experiment.ts:425-426`, "Boss element from each team's advantage tag"). Handled by
  control **C1**.
- **Narrowing 2 — scope lock is UNFALSIFIED, not fully verified.** Observable and passing: full
  auto, 180s run to completion, LV.400 (sync 400), "No effect in use" (no cube), five-unit team.
  Not observable in video or screenshot: Base 5 gear, core 7, 10/10/10, treasure, no doll, 100%
  core exposure. Nothing contradicts scope lock.

**P2 (full-burst counts) — REFUTE, scope-corrected.** The repo's sources agree on measured = 10 and
DISAGREE on sim. Current sim = **9**, established by two independent live re-derivations
(`ONLY=` experiment run, deterministic 9 on 25/25 seeds; `fb-count-matrix.ts` battery) and matching
`scripts/regression.ts:255` ("sim reads 9 FBs") and `docs/fb-count-matrix.md:85` ("9 vs 10"). Every
"sim 10" claim in the tree traces to ONE artifact — `docs/probes/714 noon/probe.md` row 3, dated
2026-07-14 — restated three times, including by this driver in `docs/probe-runs.md` on 2026-08-17
(corrected in place same day). The count moved after that row: commit `c12fcf4e` (2026-07-26) fixed
`liberalio`'s 6×-inflated burst-gauge datamine and unmasked a shortfall on the four comps she seats.

⇒ **Two consequences this packet must carry, not assume away:**

1. **N3 carries a −1 full-burst gap of the same sign and family as iron sweep's.** The "independent
   arm with no rotation gap" framing that originally motivated choosing N3 is FALSE and is withdrawn.
2. **N3 and iron sweep (run G) both seat `liberalio`.** They are NOT roster-independent arms. This
   is rival **R1** below and it is the single biggest limit on what a positive result can claim.

**P3 (statistic parameterisation) — CONFIRM, scope-corrected.** `classifyArm`, `applyDecisionRule`,
`simComponents`, `simCeiling` and `widenBands` contain no comp name, fixture path or arm-count
assumption; the arm enters entirely through `--schedule/--comp/--fixture/--trace/--e-min/--o-shift/
--s-shift`. The two 2026-08-15 arms are hard-coded only in the artifact and the replay test.
**N3's credit schedule is already committed** (`docs/probe-data/credit-schedule-n3-scarlet-liberalio-iron.json`),
so zero code change is needed on the sim side. Pre-registered constants (all `fill-trace-compare.ts`):
`CLS_BIN_SEC` 1/30 (:1341), `CLS_E_MIN` 1.5 (:1343), `CLS_SAT_PCT` 90 (:1345),
`CLS_MIN_USABLE_WINDOWS` 4 (:1347), `CLS_MIN_CLEAN_BIN_COVERAGE` 0.6 (:1349),
`CLS_MAX_RHO_DISPERSION` 0.6 (:1351), `CLS_MAX_CLOSURE_RESIDUAL` 0.25 (:1353),
`CLS_CEILING_FACTOR` 1.15 (:1355), `CLS_MAX_EVENT_GAP_FRAMES` 2 (:1357), `CLS_C3_SHIFT_LIMIT` 0.1
(:1359), `CLS_BASE_BANDS` (:1374-1380). Branch order: basis → **closure clause FIRST** → branch 1
H-C → branch 2 no-excess → branch 3 H-A → branch 4 H-B → MIXED.

⇒ **Three instrument properties the artifact alone does not reveal, all load-bearing here:**

- **(i) Bridged increments (gap > 2 trace-frames) are dropped from the event census entirely but
  still ride inside `sumRealDelta`** (telescoped from the last clean fill), inflating `massCorrReal`
  and therefore the closure residual. Iron's closure residual was **0.2579** against a 0.25
  threshold — it failed by **0.008**. This is rival **R2**.
- **(ii) C3 band-widening is NOT automatic** — the operator must run `--sim-only` first and
  hand-carry `--o-shift/--s-shift`; omitting them silently yields base bands.
- **(iii) O and S compare a FILTERED real pool against an UNFILTERED sim pool** (`simComp` uses all
  non-truncated sim windows; the real side pools only windows surviving the 0.6-coverage and
  truncation drops).

**P4 (Full Burst duration) — REFUTE, scope-corrected.** Every one of N3's Full Bursts runs
**15.0s**, not the 10s baseline. `soda-twinkling-bunny` carries `fullBurstExtend +5s`
(`src/skills/overrides/soda-twinkling-bunny.json:97-106`, datamined ladder) on a
`trigger: {kind: "stageEnter", stage: 3}` — a TEAM CHAIN EVENT (`sim.ts:3411-3419` loops every
unit's blocks when the chain reaches stage 3, regardless of caster), and the handler mutates the
GLOBAL `fbEndFrame` without resolving `block.target` (`sim.ts:3130-3136`). In this comp
`soda-twinkling-bunny` never casts B3 (`scarlet-black-shadow` and `liberalio` alternate for all 9
cycles), so her Golden Chip pool never drains, pins at its 50 cap, clears the `min 20` gate every
cycle, and grants +5s on all 9. Her own caveat ("late-fight Full Bursts shorten as the pool
drains") is inoperative here.

⇒ **The generating window's OPENING boundary is literally `fbEndFrame`** (`addGauge` early-returns
while `fbEndFrame > frame || stage !== 0`, `sim.ts:1521-1529`), so the +5s pushes every window 5s
later and 15s of each ~21.4s cycle is generation-locked. **All window arithmetic in this run uses
15.0s.** Independent corroboration already in hand: a 40s reader slice of this recording shows Full
Burst starting ~13.5s with filling resuming at 28.35s — a 14.8s window, consistent with 15s and
not with 10s. Control **C2** promotes this to a full-fight check.

## B. Question

Does the iron-sweep H-C-candidate event-rate excess — real event-bin rate above 1.15 × the sim
ceiling, which survived noise correction on 2026-08-16 — REPRODUCE on a second comp whose ceiling
detector is non-vacuous?

## C. Hypotheses and the rivals that must be separated

- **H1 (general unmodeled gauge source).** A gauge source with no sim primitive exists across comps
  ⇒ N3's real event-bin rate exceeds 1.15 × 5.13 = **5.90/s**.
- **H0 (no excess).** N3's real event-bin rate sits at or below its ceiling ⇒ the iron reading is
  comp-specific, and the H-C candidate loses its generality claim.

**Named rivals — the plan is judged on whether it separates these, not on whether a number moves:**

- **R1 — `liberalio`-linked defect, not a general source.** Both arms seat `liberalio`, and the
  shortfall on all four disabled comps was UNMASKED by her datamine fix (`c12fcf4e`). A positive
  result on N3 is consistent with a per-unit modeling gap in the one unit the two arms share.
  **This packet asserts up front that this run CANNOT exclude R1** (§H) — the honest yield is
  "reproduces on a second comp that shares the suspect unit", which is weaker than generality.
- **R2 — the closure clause is instrument-driven, not game-driven.** Per P3(i), bridged mass
  inflates the residual, and iron failed the clause by 0.008. If N3 also fails closure, the run
  returns MIXED/INCONCLUSIVE again and yields nothing about H1 — unless the closure diagnostic in
  §E.3 is pre-committed NOW. It is.
- **R3 — window-map error from the 15s Full Burst.** A tempo fixture built on a 10s assumption would
  mis-place every window boundary by half a window. Control **C2**.
- **R4 — reader noise manufacturing events.** Bounded by the 2026-08-16 same-regime falseRate
  measurement (Wilson 95% upper 0.55% primary / 0.45% pooled). Control **C6** applies the same
  noise correction to this arm.
- **R5 — boss element mis-declared** (P1 narrowing 1). Control **C1**.

## D. Method

All commands already exist and are committed; no new statistic is written.

0. **Power pre-check (footage-free, ALREADY RUN — see §E.2b).**
   `npx tsx scripts/probe/fill-trace-compare.ts arm-power --classification
docs/probe-data/fill-trace-habc-classification.json --ref-comp "iron sweep (run G)"
--ref-full-window-sec 23.618 --candidate-schedule
docs/probe-data/credit-schedule-n3-scarlet-liberalio-iron.json --candidate-comp "N3
scarlet/liberalio iron" --shared liberalio --candidate-sim-refill-sec 38.1`
   → `discriminates: false`, `separationSigmas: 0.9848`. Committed subcommand; its output is an
   INPUT to this packet, not a result of the run.

1. **Frames.** `ffmpeg -v error -i "docs/probes/714 noon/3.mp4" -vf "fps=60,crop=280:70:2342:465"`
   into `fine/`, and `fps=5` into `lock/` for the widget lock. (Crop and lock geometry already
   validated on this recording: the team bar locks at 134px, rows 491–498, x 2477–2610 absolute —
   the documented team geometry.)
2. **Tempo fixture.** `npx tsx scripts/probe/scan.ts "docs/probes/714 noon/3.mp4" --fps 60
--cycle-table` → the `TempoFixture` (`fullWindows[]` + `burstChains[]`).
3. **Spans → team trace.** `fill-trace-compare.ts spans --fixture <fixture>` →
   `gauge-fill.py --team --frames fine --fps 60 --lock-frames lock --crop 280:70:2342:465 --spans
"<spans>"`.
4. **Bundle + reflag.** `fill-trace-compare.ts analyze --fixture <fx> --real <trace> --schedule
<sched> --comp "N3 scarlet/liberalio iron" --bundle <bundle>` → `gauge-fill.py --reflag <bundle>
--out <reflagged>`.
5. **C3 shifts.** `fill-trace-compare.ts classify --sim-only …` FIRST, then hand-carry
   `--o-shift/--s-shift` into the arm run (P3(ii) — omitting them silently uses base bands).
6. **Arm run.** `fill-trace-compare.ts classify --schedule
docs/probe-data/credit-schedule-n3-scarlet-liberalio-iron.json --comp "N3 scarlet/liberalio iron"
--fixture <fx> --trace <reflagged> --e-min 1.5 --o-shift <o> --s-shift <s> --artifact <out>`.
   `--e-min` stays at the pre-registered 1.5; it is NEVER lowered (P3 notes the code has no floor
   guard, so this is a discipline constraint, not an enforced one).

## E. Predictions

> **Revision note (pre-op R1/R2/R3).** The first draft of this section claimed E.2 discriminated H1
> from R1. **That claim was WRONG and is withdrawn.** The pre-op judge's correction: a
> `liberalio`-specific defect also produces a same-order share in a second comp, so "R1 makes no
> prediction about the share" was false. The corrected section below adds the sim-side rival test
> the judge specified (E.2b), computes its power, and reports the answer honestly: **it does not
> discriminate either.** The numbers below were computed BEFORE any N3 real-side number exists,
> from two already-committed artifacts, by the committed subcommand
> `fill-trace-compare.ts arm-power` (see §D step 0).

**E.1 Threshold test (necessary, not sufficient).** N3's noise-corrected event-bin rate against the
5.90/s threshold (= 1.15 × 5.1301). Above-threshold alone separates H1+R1 jointly from H0; it does
NOT separate H1 from R1.

**E.2 Replication-magnitude band (same-vs-different phenomenon only).** Iron's `hcShareOfRate` is
**0.2379** (committed artifact). Pre-registered rule, stated as a principle rather than hand-picked
bounds: **N3's share must land within ×2 either way of iron's**, i.e. **[0.11895, 0.47580]**.
Inside ⇒ the two excesses are the same magnitude class. Outside ⇒ recorded as not-the-same-
phenomenon. **R1 SURVIVES a pass here** — this band does not touch it.

_Power of the band (harness lesson 2 — size margins against noise):_ at the expected event count
(§E.2b) the sampling sd on the share is ≈ **0.056–0.063**. The band's LOWER edge sits ~1.0σ (under
the R1 prediction) to ~2.1σ (under H1) below the expected value, so it is genuinely failable low.
The UPPER edge sits ~4.2–4.7σ above and is effectively unreachable — **the upper bound is very
nearly vacuous and is not claimed as a live test.** An H0-like outcome (share ≈ 0) fails the band
low, but R-C already covers that, so the band's only independent work is catching an
implausibly-large excess.

**E.2b The sim-side rival test the pre-op judge specified — and its verdict: UNDERPOWERED.**
Both rivals predict an N3 rate, from committed inputs only:

- **H1 (excess scales with the comp's own generation ceiling):** ratio = 5.1301/3.5935 = **1.4276**
  ⇒ predicted rate **6.7313/s**, share 0.2379.
- **R1 (excess IS the shared unit's contribution):** `liberalio`'s max credit rate is **0.6667/s in
  BOTH comps** (minGap 90f in each), so ratio = **1.0000** ⇒ predicted rate **6.2517/s**, share
  0.1794. (Her ceiling SHARE differs — 0.1855 in iron, 0.1300 in N3 — but her absolute rate does
  not, which is what R1 keys on.)

**Separation: 0.4796/s = 7.39% of rate. Expected event bins ≈ 178** (carrying iron's clean-bin
fraction 0.7184 onto N3's 38.1s sim refill total ⇒ T ≈ 27.37s). Poisson 1σ on the rate =
**0.487/s**. **Separation = 0.98σ.** A 2σ separation would need **733 event bins — 4.1× what this
arm can supply.**

⇒ **Pre-committed consequence, per revision 1(c): this run does NOT discriminate H1 from R1, and no
outcome of it will.** Both predicted rates are reported against the observed one for the record, but
neither will be stamped as favoured, and no branch keys off which is closer. The R1-resolving work
is named in §H instead. This is stated here, before the run, so it cannot be quietly re-litigated
after a number lands near one prediction.

**E.3 Pre-committed CLOSURE DIAGNOSTIC** (this is what stops a null run from being worthless).
For BOTH arms — iron sweep from its committed artifact, N3 from this run — report the closure
residual as-specified AND recomputed with `bridgedMass` excluded from `sumRealDelta`.
Pre-committed readings:

- Both fail as-specified and BOTH drop below 0.25 with bridged mass excluded ⇒ **the closure clause
  is bridged-mass-driven (R2 supported)**; both arms' clause verdicts are instrument artifacts, and
  a properly pre-committed bridged-mass-corrected statistic becomes the named next step. A finding
  about the INSTRUMENT, never stamped as a game claim.
- Both fail and neither drops ⇒ **R2 refuted**; the closure failures are real.
- Split ⇒ inconclusive on R2; both numbers reported verbatim, nothing claimed.

**E.3 PEEK DECLARATION (pre-op revision 4).** Iron's `bridgedMassTotal` is present in the committed
artifact, so iron's corrected residual is computable today. **It has NOT been computed as of this
packet's finalisation, and the driver commits to not computing it until the work step, so that both
halves of the diagnostic are genuinely pre-registered.** If it had been computed, disclosing the
number here would be mandatory and the iron half would be pre-registration theater. The post-op
judge should hold this line: any iron-side closure number appearing in the deliverable must be dated
to the work step.

**E.4 Rate-convention pin (pre-op revision 3) — no post-hoc choice of estimator.**

- **Branch evaluation (R-A/R-C/R-D) uses the NOISE-CORRECTED rate at falseRate = 0.55%** (the
  primary Wilson 95% one-sided upper from the 2026-08-16 solo #2 measurement — the same primary the
  2026-08-16 iron run used). The pooled 0.45% figure is reported as corroboration only and never
  decides a branch.
- **E.2's share comparison is RAW-vs-RAW.** The instrument computes `hcShareOfRate` from the raw
  pooled `realEventBinsPerSec` (`fill-trace-compare.ts:2174`), and iron's comparator 0.2379 is a raw
  figure; comparing a corrected N3 share against a raw iron share would be a mixed convention.
- **E.2b's predicted rates are RAW** (derived from iron's raw 4.7151/s), so the observed rate quoted
  against them is raw.
- Every rate in the deliverable is labelled `raw` or `corrected@0.55%`; an unlabelled rate is a
  defect.

**E.3 The pre-committed CLOSURE DIAGNOSTIC (this is what stops a null run from being worthless).**
For BOTH arms — iron sweep from its committed artifact, N3 from this run — report the closure
residual as-specified AND the same residual recomputed with `bridgedMass` excluded from
`sumRealDelta`. Pre-committed readings:

- Both arms fail closure as-specified, and BOTH drop below 0.25 with bridged mass excluded ⇒
  **the closure clause is bridged-mass-driven (R2 supported)**; the clause's verdicts on both arms
  are instrument artifacts and a properly pre-committed bridged-mass-corrected statistic becomes the
  named next step. This is a finding about the INSTRUMENT and is stamped as such, never as a game claim.
- Both fail as-specified and neither drops below with the correction ⇒ **R2 refuted**; the closure
  failures are real and the statistic's MIXED/INCONCLUSIVE verdicts stand.
- Split (one drops, one does not) ⇒ inconclusive on R2; report both numbers verbatim, claim nothing.

This diagnostic is DESCRIPTIVE and pre-registered. It does NOT re-issue, void, or amend either arm's
branch — harness lesson 1 (a failed closure clause may not be re-scoped onto a sub-reading after the
fact) binds, and the whole reason it is written down here, before any N3 number exists, is so it is
not a post-hoc rescue.

## F. Controls

- **C1 (boss element — neutralises P1 narrowing 1).** Establish that the boss element cannot reach
  the statistic: (a) code audit that boss element enters ONLY the `elem` damage multiplier
  (`sim.ts:685`, `BEATS` at `sim.ts:434`) and no gauge, cadence, rotation or trigger path; (b)
  empirically, run the N3 roster through `scopeLockCfg(slugs, element)` under `Iron` and under a
  non-advantage element and assert per-unit `gaugeGenerated` and the full-burst count are
  IDENTICAL. If they differ, the element premise becomes load-bearing and this run STOPS pending an
  owner ruling on the element.
- **C2 (window map / FB duration — neutralises R3).** From the tempo fixture and the reflagged
  trace, measure the real Full Burst duration per cycle. Pre-committed: every cycle must read
  **15.0 ± 0.5s**. Any cycle outside that invalidates the window map for that cycle and the cycle is
  dropped with the drop recorded. If more than 2 cycles fail, the arm is BASIS-BROKEN (not "no
  effect") — see §G.
- **C3 (measured full-burst count).** The trace must yield **10** full bursts, matching the
  2026-07-14 yellow-splash scan. A different count means either the recording or the prior scan is
  wrong and the basis is broken.
- **C4 (ceiling replay).** `simCeiling` over the committed schedule must return **5.13/s**, matching
  `scripts/tests/probe/ceiling-screen.test.ts`. Recomputed, not quoted.
- **C5 (instrument self-disowning).** The committed schedule's three `CreditScheduleChecks` must all
  be true with `unreconstructed` empty. An arm failing any check is VOIDED — the instrument disowns
  itself (2026-08-15 harness lesson 4).
- **C6 (noise — bounds R4).** Apply the 2026-08-16 same-regime falseRate (Wilson 95% upper 0.55%
  primary / 0.45% pooled) as a noise correction to N3's event-bin rate, exactly as the 2026-08-16
  run did for iron, and report corrected as well as raw. Stated limitation: that falseRate was
  measured on SOLO footage; it bounds team noise conservatively but was not measured on this arm.
- **C7 (MAR sanity diagnostic — pre-op revision 6; DESCRIPTIVE, no verdict attaches).** The standing
  caveat that the iron excess exists ONLY under the clean-bin-time denominator (it vanishes under
  full-window-duration) is the largest "artifact that looks like a result" risk in this method.
  Report, per window: the bridged-increment count and mass, the dropped-bin fraction, and **whether
  bridge episodes co-occur with high fill activity** (test: mean sim credit rate inside bridged
  spans vs outside). If the reader preferentially loses lock during FAST fills, the clean-bin
  estimator is biased UPWARD and both arms' detections inherit that bias. This feeds the standing
  caveat with a number instead of a shrug. It stamps nothing.
- **C8 (manual-step witness — pre-op revision 5).** The artifact MUST record: the full `--sim-only`
  output, the `--o-shift`/`--s-shift` values actually passed, and the `e-min` actually used. P3(ii)
  established that omitting the shifts silently yields base bands and that `--e-min` has no floor
  guard, so these are unenforced discipline constraints — **a constraint the artifact does not
  witness is unverifiable at post-op.** An artifact missing any of the three is itself a defect.

## G. Pre-committed decision rule

**Basis clauses (outrank every verdict branch — harness lesson 1):**

- **B1:** the statistic's own basis must pass (`CLS_MIN_USABLE_WINDOWS` ≥ 4, per-window
  `cleanBinCoverage` ≥ 0.6, `CLS_MAX_RHO_DISPERSION` ≤ 0.6). Fail ⇒ **CANNOT-MEASURE**.
- **B2:** C1, C3, C4 and C5 must all pass. Any failure ⇒ **BASIS-BROKEN**, not a result.
- **B3:** C2 must leave ≥ 4 usable cycles. Fewer ⇒ **BASIS-BROKEN**.
- **B3/C2 PRECEDENCE (pre-op revision 7).** These two clauses can disagree: with ~10 cycles, 3
  failed cycles trips C2's ">2 cycles fail" rule while still leaving 7 usable and passing B3.
  **The STRICTER clause binds: C2.** More than 2 cycles failing the 15.0 ± 0.5s check ⇒
  BASIS-BROKEN, regardless of how many cycles remain. Fixed here so the outcome is not choosable
  after the numbers land.
- **A basis failure is never "the effect is absent."** It is reported as a broken basis, explicitly
  distinguished from H0.

**Branches (evaluated only if B1–B3 pass), in priority order:**

- **R-A (excess reproduces, same magnitude class):** N3's `corrected@0.55%` rate > 5.90/s AND its
  RAW `hcShareOfRate` ∈ [0.11895, 0.47580] ⇒ stamp **"H-C-candidate excess reproduces on a second
  non-vacuous arm THAT SHARES `liberalio` WITH THE FIRST"** — the shared-unit clause is part of the
  stamp text, not a caveat appended to it, because R1 is unexcludable by construction (§E.2b) and a
  stamp that reads as generality would misrepresent the run. The arm's own classification remains
  whatever the closure clause makes it. LOG-class; no engine or constant change.
- **R-B (excess present but off-magnitude):** `corrected@0.55%` rate > 5.90/s AND raw share outside
  [0.11895, 0.47580] ⇒ **INCONCLUSIVE on replication** — report both shares verbatim; the two
  excesses are not established as the same magnitude class. Note the band's upper edge is ~4σ away
  and effectively unreachable, so in practice this branch fires only on a share below 0.11895.
- **R-C (no excess):** noise-corrected rate ≤ 5.13/s (the raw ceiling) ⇒ stamp **"the iron-sweep
  H-C-candidate excess does NOT reproduce on a second non-vacuous arm"**. This is the falsification
  clause: it weakens the iron finding's generality and is to be recorded as such even though it is
  the outcome least favourable to the thread's working hypothesis.
- **R-D (between ceiling and threshold):** 5.13/s < rate ≤ 5.90/s ⇒ **INCONCLUSIVE**, report
  position in band verbatim.
- The §E.3 closure diagnostic is reported in ALL branches, including the basis-failure ones where it
  is computable.

**Falsification clause, stated so it cannot be dodged:** R-C is a real, reachable outcome that this
driver commits to stamping. The failure mode this guards against is treating a null as "the arm was
bad" — hence B1–B3 are defined FIRST and independently, so "basis broken" and "effect absent" cannot
be conflated after the numbers land.

## H. What this run CANNOT establish

- **It cannot exclude R1, and E.2b does not narrow it either.** Both arms seat `liberalio`. The
  sim-side rival test predicts 6.7313/s (H1) vs 6.2517/s (R1) — a 0.98σ separation at the expected
  ~178 event bins, needing 4.1× more data to reach 2σ. **No outcome of this run bears on R1.** At
  absolute best this shows a same-order excess appears in a second comp _that shares `liberalio`
  with the first_. Any stamp must say that in its body, not a footnote.
- **⇒ THE NAMED R1-RESOLVING FOLLOW-UP** (recorded here so it is not lost when this run logs):
  (a) a direct audit of `liberalio`'s gauge-credit model — her datamine was once **6× off**
  (`c12fcf4e`), so the prior that another factor lurks there is not small, and this is achievable
  with no footage; or (b) an owner-recorded `liberalio`-free session on a slow-weapon roster, which
  the 2026-08-17 feasibility screen showed does not exist among current comps. (a) is strictly
  cheaper and should be attempted first.
- **It cannot classify either arm.** Iron's closure residual 0.2579 stands; N3's branch will be
  whatever its own closure clause makes it.
- **It cannot establish a mechanism** — which source, in which unit, by what primitive.
- **It cannot validate the MAR/clean-bin-time denominator convention** inherited from the
  2026-08-16 run; the same convention is used here and carries the same caveat.
- **It cannot test the boss element** beyond showing the element cannot reach the statistic (C1).
- **n=2 comps.** No class-level claim is available at any outcome (the cross-comp rule from
  2026-08-15).
- **Nothing enactable.** This is LOG-class at every branch. No engine constant, default, override or
  snapshot changes on any outcome.

## I. Deliverable

A verdict-free JSON artifact `docs/probe-data/n3-third-arm-classification-2026-08-17.json`: the arm's
full `classifyArm` output, **all EIGHT control results (C1-C8)**, every rate labelled `raw` or
`corrected@0.55%` per §E.4, the noise-corrected rate at both falseRate inputs, the §E.3 closure
diagnostic for both arms **with the date each half was computed** (§E.3 peek declaration), the C7 MAR
co-occurrence numbers, the C8 manual-step witness (`--sim-only` output, shifts passed, e-min used),
the committed `arm-power` output from §D step 0, the branch that fired, and the pre-registered
thresholds alongside the observed values. Plus: the reflagged trace + tempo fixture committed, a
replay pin extending `scripts/tests/probe/`, a `docs/probe-runs.md` entry, and a harness-log entry.

## J. Revision log — pre-op APPROVED-WITH-REVISIONS (Fable, 2026-08-17)

All seven executed before resubmission. Where a revision changed a CLAIM rather than adding a
check, the original claim is struck in place above rather than deleted.

1. **E.2's discrimination claim was WRONG — withdrawn.** The judge showed R1 _does_ predict a
   same-order share, so the band never separated H1 from R1. Added **E.2b**, the sim-side rival
   test the judge specified, and computed its power with a new committed subcommand
   (`fill-trace-compare.ts arm-power`): H1 predicts 6.7313/s, R1 predicts 6.2517/s, separation
   **0.98σ** at ~178 expected event bins; 2σ would need 733 (4.1×). **Per revision 1(c) the packet
   now states plainly that this run does not discriminate R1 at all**, and §H names the
   R1-resolving follow-up instead.
2. **The [0.10, 0.40] band was arbitrary — replaced** by the principled "within ×2 of iron's
   0.2379" ⇒ **[0.11895, 0.47580]**, with the sampling sd (≈0.056–0.063) stated and the band's
   asymmetry disclosed: failable low at ~1–2σ, upper edge ~4.2–4.7σ away and **effectively
   vacuous**.
3. **Rate convention pinned (§E.4):** branches use `corrected@0.55%`; E.2's share comparison is
   raw-vs-raw (the instrument computes `hcShareOfRate` from the raw pooled rate at
   `fill-trace-compare.ts:2174`, and iron's 0.2379 is raw); E.2b's predictions are raw. Unlabelled
   rates in the deliverable are a defect.
4. **E.3 peek declaration added:** iron's bridged-mass-excluded residual **has NOT been computed**
   as of finalisation, and the driver commits to not computing it until the work step. The post-op
   judge is asked to hold this line.
5. **C8 added** — the artifact must witness the `--sim-only` output, the shifts passed, and `e-min`.
6. **C7 added** — MAR sanity diagnostic: per-window bridged/dropped-bin fractions plus a
   bridge-vs-fill-activity co-occurrence test, descriptive only.
7. **B3/C2 precedence fixed** — the stricter clause (C2, ">2 cycles fail") binds, so the basis
   outcome is not choosable after the numbers land.

**Judge's non-blocking risk flags, carried:** the O/S filtered-vs-unfiltered pool bias (P3 iii)
touches the H-A/H-B branches — if the deliverable narrates an H-A/H-B lean, the post-op judge should
discount it on that ground; and reproduction power is unquantified in the sense that a marginal miss
lands in R-D rather than R-C, resolving nothing about generality.

**Judge's cost/benefit ruling:** run it, after revisions. The footage is in hand, every command is
committed, the feasibility screen shows no `liberalio`-free non-vacuous arm exists, and the run has
yield in both directions — R-C is a genuine falsifier and E.3 settles the R2 instrument question for
both arms regardless of branch. The judge also named the cheap partial: **E.3 + E.2b alone need zero
new frames** (iron artifact + committed schedules) but cannot reach R-C, which is where the value
sits.
