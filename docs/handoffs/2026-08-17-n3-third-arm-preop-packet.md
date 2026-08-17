# Pre-op packet — third classification arm: `N3 scarlet/liberalio iron` (2026-08-17)

> AI-facing. Judge-ranked step (4) of the 2026-08-15 H-A/H-B/H-C classification run: "a third comp
> with a non-vacuous ceiling". Run under `/scientific-method`. The post-op judge receives THIS
> packet + the work deliverable, never the driver's verdict.
>
> **Pre-registration:** every threshold, constant, control and decision clause below is fixed
> BEFORE any real-side number for this arm is computed. The sim-side ceiling (5.13/s) and the
> instrument self-checks were computed before this packet and are cited as inputs, not results.

Status: pre-op **DRAFT** — awaiting Fable pre-op judge review.

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

**E.1 Non-discriminating (necessary, not sufficient).** N3's real event-bin rate is some number
against the 5.90/s threshold. "The number is above threshold" alone does not separate H1 from R1.

**E.2 The DISCRIMINATING prediction — cross-arm ceiling-normalised excess.** If a general unmodeled
source exists (H1), the excess should scale with the comp's own ceiling rather than being a fixed
absolute rate. Iron's excess share of rate is **0.2379** (pre-registered from the committed
artifact). Pre-commit: **H1 predicts N3's `hcShareOfRate` lands in [0.10, 0.40]** — the same order
as iron's. A rate that clears 5.90/s but with a share outside that interval (e.g. barely over, or
enormously over) is evidence the two excesses are not the same phenomenon, and is recorded as such.
R1 makes no prediction about the share, which is exactly why the share — not the raw pass/fail — is
the discriminator this plan rests on.

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

## G. Pre-committed decision rule

**Basis clauses (outrank every verdict branch — harness lesson 1):**

- **B1:** the statistic's own basis must pass (`CLS_MIN_USABLE_WINDOWS` ≥ 4, per-window
  `cleanBinCoverage` ≥ 0.6, `CLS_MAX_RHO_DISPERSION` ≤ 0.6). Fail ⇒ **CANNOT-MEASURE**.
- **B2:** C1, C3, C4 and C5 must all pass. Any failure ⇒ **BASIS-BROKEN**, not a result.
- **B3:** C2 must leave ≥ 4 usable cycles. Fewer ⇒ **BASIS-BROKEN**.
- **A basis failure is never "the effect is absent."** It is reported as a broken basis, explicitly
  distinguished from H0.

**Branches (evaluated only if B1–B3 pass), in priority order:**

- **R-A (excess reproduces, same magnitude class):** N3's noise-corrected event-bin rate > 5.90/s
  AND `hcShareOfRate` ∈ [0.10, 0.40] ⇒ stamp **"H-C-candidate excess reproduces on a second
  non-vacuous arm"** — with the mandatory caveat that R1 is NOT excluded (both arms seat
  `liberalio`) and the arm's own classification remains whatever the closure clause makes it.
  LOG-class. No engine change, no constant change.
- **R-B (excess present but off-magnitude):** rate > 5.90/s AND share outside [0.10, 0.40] ⇒
  **INCONCLUSIVE on generality** — report both shares verbatim; the two excesses are not
  established as the same phenomenon.
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

- **It cannot exclude R1.** Both arms seat `liberalio`; a positive result reproduces the excess on a
  comp sharing the suspect unit and does not demonstrate generality across rosters. Any stamp must
  say this in its own words, not in a footnote.
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
full `classifyArm` output, all six control results, the noise-corrected rate at both falseRate
inputs, the §E.3 closure diagnostic for both arms, the branch that fired, and the pre-registered
thresholds alongside the observed values. Plus: the reflagged trace + tempo fixture committed, a
replay pin extending `scripts/tests/probe/`, a `docs/probe-runs.md` entry, and a harness-log entry.
