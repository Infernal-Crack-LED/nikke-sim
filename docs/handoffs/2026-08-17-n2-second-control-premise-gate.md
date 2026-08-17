# N2 (second `liberalio`-free fill trace) — premise gate result: **DO NOT RUN AS FILED** (2026-08-17)

> **Status: BLOCKED at step 0.** Three `premise-verifier` agents, fresh context, blind. Result:
> **1 CANNOT-VERIFY, 1 REFUTE, 1 CONFIRM.** No plan was written and no pre-op was requested —
> per `/scientific-method` step 0, _no plan proceeds on an unverified load-bearing premise_.
> Nothing was measured, nothing enacted. This doc exists so the next session does not re-derive it.

QUEUE item N2 read: _"A SECOND `liberalio`-free fill trace — this is what decides the `liberalio`
question… **Use `N5 snowwhite-HA fire`**… then apply the ALREADY-PRE-COMMITTED conversion rule."_
Both of the load-bearing clauses in that sentence — the choice of comp, and the existence of a
pre-committed rule — failed verification.

## BLOCKER 1 — N3 is a hard PREREQUISITE of N2, not a parallel queue item

`N5 snowwhite-HA fire` seats **`snow-white-heavy-arms`** (Snow White: Heavy Arms, SR/Water/Burst III),
whose override carries **`gaugeHits: 5` and `gaugeHits: 10`**
(`src/skills/overrides/snow-white-heavy-arms.json:51,69`).

The credit-schedule reconstruction in `scripts/battery/fb-count-matrix.ts` pushes exactly one skill
credit per damage event and never reads `gaugeHits`; `CREDIT_SCHEDULE_COMPS` is currently
`['iron sweep (run G)', 'T5 wind-weak']` (`fb-count-matrix.ts:2094`), neither of which seats a
carrier — which is the only reason the defect is latent.

⇒ **Tracing N5 would make it the FIRST `gaugeHits` carrier ever to enter that instrument's credit
schedule, i.e. it runs the instrument in exactly its known-blind configuration.** The queue filed N3
(the `gaugeHits` blindness fix) as a separate, lower item; it is in fact the gate on N2. **Order is
N3 → N2.**

## BLOCKER 2 — the "ALREADY-PRE-COMMITTED conversion rule" is neither pre-committed nor applicable

**It is not pre-committed.** `git log -S` on the rule's own text (`two-plus controls`,
`proportional-uniformity`) returns a single introducing commit, **`c8f3caf8` at 07:53 on
2026-08-17 — 23 minutes AFTER the scored verdict landed in `7e2f7e1f` at 07:30.** The 2026-08-17
`liberalio` run committed **no pre-op packet at all** (unlike its neighbours
`2026-08-17-n3-third-arm-preop-packet.md`, `2026-08-17-anis-star-solo-magnitude-preop-packet.md`,
`closed/2026-08-16-anis-star-solo2-gauge-preop-packet.md`), so the attribution "pre-committed by the
pre-op judge" is **self-attested with no durable artifact to check it against**. There _is_
circumstantial evidence that the run's own _band_ rule pre-existed its outcome (the 07:30 commit body
reads "rule stated ~3.03, CONFIRMED"), but that is a different rule.

**It is not mechanically applicable.** As written — _"if two-plus controls cluster within ~δ, a
reproduced split converts to affirmative REJECT…; if the controls spread comparably, the
proportional-uniformity premise is the refuted thing"_ — it leaves four things undefined:

1. the **clustering statistic** is never named (|R₁−R₂|? both inside a common band? which band?);
2. with two controls, **how `R_ctrl` is reconstructed** is undefined (mean? min? widened band?);
3. **"spread comparably"** has no threshold — comparable to what?
4. there is an **uncovered middle zone**: a control spread of ~0.30 is neither "within ~δ" (0.15) nor
   obviously "comparable" to 0.51, so **neither branch fires**.

This repeats the harness's own logged lesson (`scientific-method-harness.md:1151-1157`): _"a
pre-committed control without a PINNED ESTIMATOR is not executable."_

**And δ's derivation does not survive its own dimensional step.** δ = 0.15 is justified as "dominated
by the ±0.15s estimator bias" — but that bias is in **seconds** and δ is applied on the
**dimensionless residual** scale. Converting properly gives ±0.15s ÷ measured = **±0.071** (PI2
2.10 s), **±0.064** (iron 2.342 s), **±0.084** (T5 1.785 s). So δ = 0.15 is roughly **2× wider than
its stated derivation supports**. The 2026-08-17 verdict does not turn on this (it claimed robustness
to any defensible δ), but a future rule keyed on "cluster within ~δ" would.

## BLOCKER 3 — N5 is the wrong control on the merits (sign flip)

`N5 snowwhite-HA fire` is the **only** member of the stamped nine where the **sim reads HIGH**:
`fb-count-matrix.ts` gives sim 13 vs measured 12, and `experiment.ts` gives `12x84% 13x16%` under MC.
**The other eight all under-count.** The hypothesis under test is "the sim refills too slowly", and
the control band was established on PI2, which under-counts. Using a comp with the opposite sign as
the second control inherits that flip into `R_ctrl` without anything in the rule accounting for it.

If a second control is wanted, the untraced `liberalio`-free candidates are **`N1 rapi/quency wind`**,
**`soda-tb control (neutral, focus soda-twinkling-bunny)`**, and **`N2 modernia wind`** — all in the
stamped nine, none yet traced.

⚠ **These are verbatim `scripts/experiment.ts` comp KEYS, not unit references.** The substrings
"rapi", "quency", "soda", "scarlet" inside a comp key are Claude-invented comp shorthand and must not
be read as the units `rapi`, `quency`, `soda` or `scarlet` — resolve every roster by reading the comp
in `experiment.ts` and taking its slugs. (Same trap as the `snow-white` vs `snow-white-heavy-arms`
one below.)

⚠ `soda-tb control` seats `soda-twinkling-bunny`, whose `fullBurstExtend` broke the closure
decomposition on the N3 re-application (`realLadderSec 6.684`, `closedShare −0.871`); prefer one of
the other two, and check `fullBurstExtend` before choosing.

## Corrections to the QUEUE's own wording (verified)

- **"a clean bundle" is not a property N5 has.** N5 has **no fill-trace bundle at all**. Only four
  comps do (iron sweep, T5, N3, PI2). "Clean bundle" is a hoped-for _outcome_ of the proposed run,
  not an established precondition — and `amountsTrusted` is not a per-comp property but a per-bundle
  output computed at `scripts/probe/fill-trace-compare.ts:746`.
- **"measured FB 12/12" does not mean sim 12 / real 12.** `12/12` is the splash-scan notation used
  throughout `regression.ts` (cf. T5's `13/13 splash-counted`, whose sim reads 12). N5's measured FB
  is **12**, and it has two independent methods behind it: the CV yellow-splash scan
  (`docs/probes/714 noon/probe.md:7-8,17`) and an owner manual recount (`open-questions.md:561-563`).
  The sim reads 13 deterministic / modal 12 under MC.
- **"1.75–1.82 s" for T5 is NOT an uncertainty interval.** It is one measurement under two
  window-inclusion choices: median over all 12 windows = **1.750**, median over the 11 readable =
  **1.817**. It also collides digit-for-digit with an unrelated published figure — the _ladder_ read
  "real gauge-full → next Full-Burst start = 1.750–1.766 s" (`probe-runs.md:7509-7511`). Different
  quantity, same digits.
- **`fb-count-matrix.ts:160` `status: 'omitted'` is STALE** for N5 — `'omitted'` means "never entered
  `scripts/regression.ts`", but N5 _is_ in `regression.ts:258-269` with `realFullBursts: 12`,
  undisabled, since the 2026-08-15 enactment. The adjacent note "Recorded as real 12 vs sim 11" is
  likewise stale prose. (Folded into the N3 work item.)

## What CONFIRMED cleanly (reusable, do not re-derive)

The bar-paint instrument chain is sound. All three cited refill values **recompute exactly** from raw
60 fps frame reads (36/36 per-window values identical to stored): iron **2.342**, T5 **1.817**
(readable) / **1.750** (all), PI2 **2.0915**. Estimator: `median(visibleSec)` over `status==='ok'`
windows, `visibleSec = [barPaint, fullInstant]`
(`scripts/probe/fill-trace-compare.ts:284-289,811`). Replay pins green (29/29).

The chain **is** applicable to new footage — precedent `fill-trace-n3-scarlet-liberalio-iron.json`
ran it on a never-traced recording. Per-recording requirements, and the gates:

1. `ffmpeg` twice — `fps=60` into `fine/`, `fps=5` into `lock/`. **The lock set must contain a Full
   Burst** (magenta) or the reader exits (`gauge-fill.py:107-122`).
2. Bar/crop auto-derives by magenta-row vote; the documented crop `280:70:2342:465` holds only for
   1206×2622 portrait recordings. All four traced recordings locked identically:
   `rows [491,498], x0 2477, x1 2610, width 134px`.
3. Fresh `scan.ts --fps 60 --cycle-table` fixture, then `fill-trace-compare.ts spans`.
4. The comp must exist in `fb-count-matrix.ts` for `--credit-schedule --comp=…`.
5. Gates: hard width gate `[110,200]px`; loud warning outside `[126,148]`; then `amountsTrusted`;
   then, for any _rate_ statistic, `readable ≥ 6` and `R IQR ≤ 0.5`.

⚠ Known failure modes on new footage: the **solo** reader path provably mis-locks on team HUDs
(128 px decoy, stuck 44–57% reads); intro-fade mis-calibration needs `--calib-frame`; and **the first
0.77–1.70 s (mean ~1.5 s) of every refill window is structurally unobservable** — which is why the
estimator anchors on bar-paint at all, and why the unmeasured head is 5.6–12.1% of each window.

⚠ The sim-side `decomposeCycles().excess` bias ("+0.117 s run G / +0.114 s T5 per cycle ⇒ treat as
refill ±0.15 s") is **prose-only** — no committed instrument or fixture emits those two numbers, and
the whole δ = 0.15 band rests on them.

## What N2 needs before it can run

1. ~~**N3 landed** (the `gaugeHits` credit-schedule fix) — hard prerequisite, blocker 1.~~
   **DONE 2026-08-17**: the reconstruction credits `gaugeHits` times per damage event, and
   `N5 snowwhite-HA fire` — the first `gaugeHits` seat the instrument has ever covered — now passes
   all three self-checks with an empty `unreconstructed` list (endpoint residual 0.00e+0 on all five
   units, `DBG_GAUGE` 117/117, truncated 5/5). Pinned by `scripts/tests/battery/credit-schedule.test.ts`.
2. **A different second control** — N1 rapi/quency wind or N2 modernia wind, not N5, per blocker 3;
   or an explicit owner ruling that the sign flip is acceptable and how `R_ctrl` absorbs it.
3. **A conversion rule pinned numerically BEFORE the new control's residual is computed** — naming
   the clustering statistic, the two-control `R_ctrl` reconstruction, and the "spread comparably"
   threshold, with no uncovered middle zone. It cannot be inherited as "already pre-committed".
4. **δ restated on the residual scale** with its seconds→proportional conversion shown, or an
   explicit statement that 0.15 is a deliberately conservative widening of the derived ~0.064–0.084.
