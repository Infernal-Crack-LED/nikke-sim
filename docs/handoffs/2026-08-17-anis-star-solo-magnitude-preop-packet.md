# Pre-op packet — `anis-star` solo per-pull gauge magnitude: pre-registered re-run (2026-08-17)

> Status: **APPROVED-WITH-REVISIONS** (Fable pre-op, 2026-08-17), two rounds. Round 1 revisions
> **R1–R6** and round 2 revisions **NR1–NR4** are all executed inline below, marked `[R#]` / `[NR#]`.
> ⚑ **NR1–NR4 were executed but NOT re-submitted for a third judge pass** — they are verbatim
> prescriptions from the round-2 verdict (radius = 3 columns; the added rival row; the `K`-cue
> statement; interval arithmetic for smeared credits), unlike round 1's R3 where the defect came from
> a number the driver chose. Flagged here so the post-op judge and the owner can weigh it.
> QUEUE item **N1**. Measurement-only — **no enactment**
> whatever the outcome; any engine/data/override change this motivates is a SEPARATE gated pass
> (evidence-proportionality). Footage-FREE: every input is a recording or committed artifact already
> on disk.

## What this run is, and what the last one could not do

The 2026-08-16 solo #2 run (`docs/handoffs/closed/2026-08-16-anis-star-solo2-gauge-preop-packet.md`)
returned **Question A INCONCLUSIVE-LOG**. It failed for a specific, diagnosable reason: its primary
discriminator was a count-to-fill rule
`K = ceil((100 − baseline) / P)` whose **premise is that every pull in the window credits the same
steady `P`**. That premise was falsified by the data — three credits (+15.3, +16.0, +15.2 vs a modal
11.6) and every window's partial-charge opener depart from it — so the rule was not well-posed and no
window could be assigned to exactly ONE hypothesis.

This run does not gather new data. It replaces the broken estimator with **two pre-registered
estimators that are well-posed in the presence of departing credits**, and adds an **out-of-sample
leg** (the independent A3 recording). The anomalous credits are declared UP FRONT as a nuisance term
so they are classifiable rather than premise-violating — which is exactly the QUEUE's instruction.

## Partial-blindness declaration (binding, read this before judging pre-registration)

This is a re-analysis of committed artifacts, so I cannot claim blindness to correlated quantities.
Declared explicitly:

- **SEEN:** the per-pull `deltaPct` table (modal 11.6, the three anomalies), the artifact's own
  per-window `countingArithmetic` block (which already contains the anomaly-aware bounds this packet
  promotes to primary), the descriptive medians (strict pool median 11.6, n=15), the window map, and
  the 2026-08-15 A3 count-to-fill exclusion bound (steady ≥ ~10.96).
- **`[R5]` SEEN — and worse than first declared: E1 is on the record for BOTH recordings.** Solo #2's
  anomaly-aware E1 is `anis-star-solo2-gauge.json:910` (steady P ∈ [11.14, 13.00)) and **A3's
  E1-equivalent is `anis-star-solo-a3-gauge-reread.json:182`** (`openerAsRendered`, steady P ∈
  ~[10.96, 12.53)). **Both already exclude 10.388.** The pre-op judge found the A3 one; this packet's
  first draft did not declare it.
- **NOT SEEN / NOT COMPUTED — this is the entire pre-registered surface:** the value of **E2 (the
  telescoping run-mean)** on either recording, its standard error, **E3** (the run-height linearity
  check), and the post-verdict anomaly-residual check. Nothing else in this plan is unseen.
- **`[R5]` Honest consequence, binding on the verdict:** E1 is **corroboration, never the
  discriminating evidence** — it is promoted from descriptive to primary in ROLE, but it was not
  discovered here and carries no pre-registration value. **The MEASURED tier rests on E2 (both
  recordings) and E3.** Clause 1 is written so that E1 alone cannot deliver it.
- **The known risk this packet must not launder:** choosing the rule that gives an answer after
  seeing that the first rule gave none. The defence offered is that the first rule's premise was
  _falsified by the data_, and E1/E2 are the minimal repair of that specific defect — not a search
  over rules. The pre-op judge tested and accepted this on the merits ("a statistician handed the
  same broken rule would write approximately these two") while requiring the verdict to rest on the
  genuinely-unseen legs — which is what `[R5]` enforces.

## Verified premises (step-0 premise gate, 2026-08-17 — 3 CONFIRM / 1 REFUTE)

Four `premise-verifier` agents, fresh context, blind to the expected answer.

**P1 — anomaly inventory: CONFIRM.** `docs/probe-data/anis-star-solo2-gauge.json` records exactly
three credits materially above the modal 11.6 — W2p8 = 15.3, W4p2 = 16.0, W4p3 = 15.2 — and the
artifact's hand-montage ammo record shows **exactly one ammo decrement** across each
(`montage.W2.summary` 5→4 in (36.40,36.73]; `montage.W4.summary` 5→4 in (73.23,73.57] and 4→3 in
(74.23,74.57]). The artifact assigns them **no cause and no verdict**. Scope corrections carried into
this plan:

- **W1 has no montage tile at all** (`observedK.W1.montagePulls: null`) — its pull count is
  reader-only, so under R4-equivalent discipline W1 is **descriptive, never decisive**.
- There is also a **DOWNWARD** departure the "three anomalies" framing omits: **W4p7 ≈ +8.0–8.7**,
  smeared. Any rule that only handles upward departures is incomplete.
- Two one-column attribution ambiguities exist at the boundary (W2p7 would read 12.3 if the reload-hold
  column is attributed to W2p6; W2p5 would read 10.8) — neither reaches the 15–16 family.

**P2 — damage identity: CONFIRM.** Recomputing mechanically from
`anis-star-anomaly-source-hunt-2026-08-17.json`'s raw `readerOutput.reads`, W4p2 = W4p3 = W4p4 =
**exactly 480,330** each (four totals forming an exact arithmetic progression across four
independently-read frames); steps sum exactly to last−first. Corrections carried:

- The table **omits a step**: +547,955 at videoT 73.0, mapping to the W4p1 opener — a _third_
  magnitude, 14.1% above tier A, from the pull the gauge artifact calls a partial-charge opener. This
  is unexplained and is reported, not used.
- `timerCorrections: 3` means `correctTimer` (`scripts/probe/read-total-damage.ts:277-325`) rebuilt
  the **timer column** from a linear spine. Damage is untouched, but the artifact's
  `fightTimeAnchor` ("the reader's own timer column pins it") is **not an independent read**.
- Identity holds at 0.2 s bin resolution; two deposits inside one bin are indistinguishable.

**P3 — shipped solo decomposition: REFUTE (of the conjunction), with a scope correction that is
load-bearing for this plan.** The shipped engine does credit a **fixed 10.388 %/pull** in a solo
scope-lock fight — but NOT as "the row × focus × aura". It is **two separate credits**:

| #   | term         | path                                                                                                               | value (% of bar)                                   |
| --- | ------------ | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| 1   | weapon pull  | `firePull` → `shotGauge` (sim.ts:4469) → `gaugePerShot` (sim.ts:1484-1519) → `addGauge` (:1562)                    | `targetPerTrigger` 280/100 × focus 2.5 = **7.00**  |
| 2   | rider impact | override `skill1` `shotFired → flatDamage 120.13` dispatched at sim.ts:4531-4533 → `skillGauge` (sim.ts:1593-1605) | 280/100 ÷ `hitsPerShot` 1 = **2.80**, **no focus** |
| ×   | her own aura | `addGauge` sim.ts:1538-1544, applies to BOTH                                                                       | × 1.06                                             |

⇒ `(280 × 2.5 + 280) × 1.06 = 1038.8` energy = **10.388 %** = 7.42 + 2.968. Verified by source read
**and** an independent `DBG_GAUGE=1` solo probe, and pinned green by
`scripts/tests/units/anis-star.test.ts` G5 (23/23).

⚠ **Two corrections this plan is built on:**

1. **`basePerTrigger` (140) is ENGINE-INERT** — `sim.ts` never reads it; only
   `scripts/census-gauge-subhits.ts` and one unit test mention it. The focus multiplier comes from
   `characters.json.chargeMultiplier` (250), not the row's `fullChargeBonus`, which is also inert for
   her. **Therefore the QUEUE's declared candidate "one extra `basePerTrigger` 140 × 2.5 × 1.06 =
   3.71 %" is not a mis-set constant and has no engine expression at all.** As a _game-side_ candidate
   it remains coherent — 140 is the datamined non-target base `burst_energy_pershot`/100 — but if it
   ever fit, it would describe a **new mechanism**, never a value the engine already has and got
   wrong. The plan states it this way and nowhere else.
2. **Her burst DoT ticks call `skillGauge` at 2.968 each, and 7 of her 40 Shooting Stars ticks escape
   the gauge lock in a solo fight** (A/B in-memory: `gaugeGenerated` 851.82 → 831.04, Δ = 20.78 =
   exactly 7 × 2.968). This is a live, already-modelled non-pull credit source and is named as **H0-c**
   below.

**P4 — recorded state: CONFIRM.** Enacted: `gauge-per-shot.json:50-55` (`targetPerTrigger` 280 ⚑
battery-3-measured, explicitly NOT promoted), `characters.json:5759` `hitsPerShot: 1`, no carve-out in
`weapon-fields.ts:57-59`. Landing entry `DECISIONS.md:5915`, whose own limits clause (5953-5959) says
the solo decomposition moved 8.90 → 10.39 %/pull, "TOWARD the 2026-08-15 count-to-fill exclusion bound
(steady ≥ ~10.96) but **still excluded**", and that U28's magnitude half stays open. U28 is OPEN
(`open-questions.md:589`, magnitude half at 678-681). The 2026-08-16 run was **LOG, INCONCLUSIVE
(Question A)**, nothing enacted (`scientific-method-harness.md:980-983`, `probe-runs.md:7890-7898`).
The 2026-08-17 source hunt (`probe-runs.md:8046-8107`) is measurement-only, enacted nothing, and
self-labels its 3.71 % arithmetic as **fitted after the fact at n=3**. Both recordings verified
present on disk by `ls`: `docs/probes/solo/anis-star-solo.mov` (161 MB) and
`docs/probes/burst tests/a2 anis star.MP4` (41.8 MB). Scope correction carried:
**`open-questions.md:681` is STALE** — it still calls the residual "footage-gated"; QUEUE.md:62-63
(newer) retracts that. The true blocker of record is **hypothesis discrimination**.

## Hypotheses

The measurand is **`P_steady`** — the burst-gauge credit, as a percentage of a full bar, delivered by
one ordinary (non-opener, non-anomalous) weapon pull by `anis-star` (Anis: Star, RL / Electric /
Burst I / Defender) firing SOLO under scope lock, in a window where generation is permitted.

- **H-model = 10.388 %/pull** — the shipped engine value, decomposed above. Enacted 2026-08-16.
- **H-elevated ∈ [10.96, ~12.2] %/pull** — the region the 2026-08-15 A3 count-to-fill bound left
  open. If measured, the residual above the shipped model is real and unmodelled.
- **H-legacy = 8.90 %/pull** — the pre-2026-08-16 halved-rider decomposition. Excluded once already;
  carried for completeness so the estimators are scored against all three.

### Rivals / H0 — what must be ruled out before elevation is believed

- **H0-a — render-scale error.** The bar's rendered 0→100 may not map linearly onto 0→100 % of gauge
  (offset, gain, or non-linearity). A pure **gain** error inflates every delta uniformly and
  perfectly mimics elevation. This is the most dangerous rival and it is the reason two estimators
  with **different** exposure to it are pre-registered (E1 is gain-immune, E2 is not).
- **H0-b — mis-attributed pull inventory.** A credit merged from two pulls, or a pull whose credit
  the reader missed, changes P̂ directly. Controlled by the hand-montage ammo count and by requiring
  trace-event count == montage pull count over every run used.
- **H0-c — non-pull gauge credits inside the measured runs.** Her burst DoT credits 2.968 %/tick and
  the engine lets 7 ticks/fight escape the lock (P3). A tick landing inside a measured run inflates
  P̂. **Pre-computed control:** burst casts sit at ~14.0 / 38.3 / 61.4 s, so the 10 s DoT windows are
  14.0–24.0, 38.3–48.3, 61.4–71.4 s, while the measured refill windows are W2 24.6–37.8,
  W3 48.8–61.0, W4 72.1–83.2 — **disjoint**. The work step must re-derive this from the artifact
  rather than take it from here, and must additionally verify no trace event inside any measured run
  lacks a matching ammo decrement.
- **H0-d — reader false events.** Bounded by the same-recording noise floor already MEASURED by the
  2026-08-16 run's Question B (committed in the same artifact's `result` block). Reuse it; do not
  re-derive it.
- **H0-e — the departing credits are the whole story.** If the anomalies are mis-read merges rather
  than real credits, removing them could move P̂. Handled by construction: E2 never touches an
  anomalous pull, and E1 enters anomalies AS RENDERED.
- **`[R4]` H0-f — render/settle lag.** The bar may ease toward its target rather than snapping, so a
  level read mid-animation sits below the settled value and biases run endpoints low. Distinct from
  gain (H0-a) and from non-linearity (E3), and it hits **E2 only**. Controlled by the pinned
  plateau-read discipline (endpoint read ≥ 6 settled frames after the last `fillRaw` change, and only
  if constant across them).
- **`[R2]` What E1 and E2 do NOT have.** The first draft claimed they share "no arithmetic and no
  inputs". **Retracted — that was false.** They share the same recording, the same reader
  (`gauge-fill.py`), the same bar calibration, and an overlapping pull inventory. What they have is
  **different exposure profiles**, and that is the whole claim: departing credits (E1 in / E2 out),
  the fill instant and the integer pull count (E1 only), interior plateau levels (E2 only), and
  opposite-signed gain bias per `[R1]`. Any confound in the shared substrate — a bad trace, a wrong
  bar lock, a mis-anchored window — moves both together and is NOT caught by their agreement. That is
  what the instrument gate and the montage cross-check are for.

## Estimators (PINNED — this is the part the last run got wrong)

Both operate on the committed 30 fps traces. Neither requires new footage reading.

### `[R3]` Departure classification — PINNED, numeric, candidate-free, computed FIRST

Before any estimator runs, and applied identically to both recordings:

```
median_all = median over every per-pull deltaPct in the recording that is
             non-opener, non-clipped, and not inside an offCurve-flagged span
DEPARTING  ⟺ |Δ − median_all| > 2.175 pp       # = 3 render columns of a 138 px bar
```

Symmetric, so it catches the **downward** W4p7 (≈ +8.0–8.7) as well as the three upward credits, and
it is stated in units of the render grid, not of any hypothesis. **Membership may not reference 3.71,
11.6 + 3.71, or any hypothesis value in any form.** The classification produced by this rule is
written into the artifact BEFORE any estimator output.

⚠ **`[NR1]` The radius is 3 columns, not 2 — the 2-column version was a real defect and is
retracted.** The `[R4]` argument below establishes that the steady family itself spans **two** columns
(14 / 15 / 16 = 10.1 / 10.9 / 11.6). The median sits at the family's **top** column, so a 2-column
radius clips only the **bottom** column — a one-sided truncation. Its bias direction is the dangerous
one: dropping a low credit raises E2, **and** (by subtracting a below-mean credit as rendered while
decrementing `m`) raises E1 — e.g. residual 70 over m = 6 gives 11.67, but (70 − 8.3)/5 = 12.34.
**That would move E1 and E2 UP TOGETHER, manufacturing precisely the signature clause 1 declares no
single confound can produce.** The classification radius must therefore strictly exceed the
demonstrated steady span. At 3 columns all four known departures still classify DEPARTING
(+15.2/+15.3/+16.0 ⇒ Δ = 3.6–4.4 pp; W4p7 ⇒ Δ = 2.9–3.6 pp) and nothing known enters the widened
keep-band, so the fix costs no discriminating power. It also removes a boundary that coincided with a
physical column of the data, where membership flipped on a 0.05 pp display-rounding artifact.

**`[NR1]` Mandatory sensitivity:** record membership under **both** radii (1.45 and 2.175). **If the
clause-1/clause-2 outcome differs between the two memberships, the result is INCONCLUSIVE-LOG
regardless of where the point estimate fell.**

**Pre-committed attribution for the two known boundary ambiguities** (P1): the reload-hold column
62.3 → 63.0 is attributed to **W2p7** (the pull whose credit instant it follows), leaving W2p7 = 11.6
and W2p6 = 10.9; W2p5's pre-step rise is **not** counted into W2p5, leaving it 11.5. Both choices are
made by one rule — _a column belongs to the pull whose credit instant most recently preceded it_ —
not case by case. Sensitivity to the opposite choice is reported.

### E1 — anomaly-aware count-to-fill (integer, low-gain-exposure, OPPOSITE-SIGNED)

Per window, from that window's OWN rendered values:

```
residual_capacity = 100 − baseline − opener_rendered − Σ(anomalous credits, as rendered)
m                 = K − 1 − n_anomalous            # count of steady pulls
P_steady ∈ [ residual_capacity / m , residual_capacity / (m − 1) )
```

`K` = pull count from window-open to bar-full, **hand-montage-verified** (reader-only windows are
descriptive). This is the artifact's own `countingArithmetic.openerAndP8AsRendered` form, generalised
to any number of departing credits.

⚠ **`[NR3]` `K` must be counted to the GAME-DRIVEN full cue** (green-full / chain opening), **never
to the reader's rendered 100.0** — and on this footage the two demonstrably diverge: W4 shows a
rendered 100.0 at 81.63 but green-full at 83.20, **with two pulls in between**
(`montage.W4.summary`). The `[R1]` opposite-sign algebra depends on `K` being set by the game while
the levels are rendered; if a window's `K` was counted to rendered-100, that algebra is void for it.
**The work step must state, per window and per recording, which cue defined `K`. A window counted to
rendered-100 may not enter clause 1(ii) or 1(iii).**

⚠ **`[NR4]` Smeared and clipped credits enter E1 as INTERVALS, not point values** — a credit read as
"≈ +8.0..8.7" enters as that full rendered ambiguity range, propagated by interval arithmetic into
that window's E1 interval. If this widens W4's E1 past usefulness, **W4 drops from clause 1(ii)
counting**. Window eligibility for clause 1(ii)/(iii) is therefore established and written down
**before** any estimator is computed; if fewer than 2 montage-verified windows qualify, clause 4
fires and the run stops there.

**`[R1]` Correct gain exposure — the first draft's "gain-immune" claim was WRONG and is retracted.**
Let the reader's pixel window under- or over-cover the true bar, so `rendered = g × true` for every
level, while the fill instant `K` is set by the GAME reaching true-full (green-full / burst
available), not by the reader's window filling. Write `S = baseline + opener + Σanomalies` (rendered,
≈ 25–30 pp). Then:

```
E1 estimate = (100 − g·S)/m  = P_true − (g−1)·S/m       ← biased DOWN when g > 1
E2 estimate = g · P_true     = P_true + (g−1)·P_true    ← biased UP  when g > 1
relative attenuation |E1 bias| / |E2 bias| = S/(m·P) ≈ 25/(6 × 11) ≈ 0.38
```

So E1 is **gain-attenuated with the OPPOSITE sign**, not gain-immune. This is _stronger_ than the
retracted claim: **a render-gain error drives E1 and E2 in opposite directions, which no real change
in `P_steady` can do** — a real effect moves both up together. The decision rule's E1/E2-agreement
clauses key off this algebra, so it is stated here in the form the post-op judge will score against.

**`[R1]` Which render-error family each recording admits — verified from the artifacts, not assumed.**
Solo #2's trace used an **explicit `--bar 489:501:2474:2612` override**, locking 138 px
(`readerInvocation.barLock`); the packet of record notes that without it `gauge-fill.py`
self-calibrates onto a dark terrain edge and produces garbage. A3's trace used the **self-calibrating
path** — `--calib-frame 300` inside `crop=400:160:2350:430`, no explicit `--bar` — and locked
`borderRow 71, x0 252, x1 390` = **138 px** (`anis-star-solo-a3-gauge-reread.json` →
`readerInvocation`). So the two recordings' extents were determined by **different mechanisms** (hand
geometry vs auto-calibration, different crops, different frame coordinates) and **independently
agreed on 138 px**. Their gain terms `g` are therefore independent, and the agreement is itself a
weak prior check on extent. **That is why cross-recording E2 agreement is informative:** a single
shared `g` explaining both is not a confound this data admits. ⚑ It is not _impossible_ — both could
be clipped by the same in-game bar border rendering — so this bounds the gain rival, it does not
eliminate it.

### E2 — telescoping run-mean (continuous, precise, gain-SENSITIVE)

Within each maximal contiguous **run** of steady pulls (excluding the opener, every departing credit
upward or downward, the fill-clipped pull, and every `offCurve`-flagged span):

```
P̂_run = ( level_after_last_pull − level_before_first_pull ) / (pulls in run)
```

Because it telescopes, **quantization enters exactly twice per run, not twice per pull** — the
per-pull-delta median discards this. With bar width 138 px, one column = 0.725 pp, so a uniform
quantization error has sd 0.725/√12 = 0.209 pp, giving `SE_quant(P̂_run) = √2 × 0.209 / m ≈ 0.296 / m`.
A 6-pull run therefore has `SE_quant` ≈ 0.049 pp — an order of magnitude below the 0.57 pp
H-model↔H-elevated separation. **This is why the 2026-08-15 tolerance-widening guard, which correctly
declared the per-pull MEDIAN non-discriminating (2 × 0.725 = 1.45 pp ≥ 0.57 pp), does NOT apply to E2:
the guard bounds a per-READING estimator, and E2 is not one.**

**`[R4]` Over-dispersion guard — MANDATORY, because `SE_quant` alone is knowingly optimistic.**
At 0.05 pp the quantization model claims sub-tenth-of-a-column precision, where systematics it omits
(bar-fill easing, sub-pixel edge bias, reader %-rounding) dominate. There is already direct evidence
the pure model is too tight: the observed steady deltas span **three** adjacent column values
(10.1 / 10.9 / 11.6 = 14 / 15 / 16 columns), and floor-quantization of a truly constant `P` can only
produce **two** adjacent values. So either `P` is not constant or there is noise beyond quantization —
either way `SE_quant` understates. Therefore:

```
SE_pooled = max( inverse-variance pool of SE_quant ,
                 empirical scatter of P̂_run across runs (sd/√k) ,
                 Question-B false-event inflation term )
```

Report all three components separately. **Pooling is inverse-variance across runs; the 95 % CI uses
z = 1.96 on `SE_pooled`.** The empirical-scatter leg is what makes the CI honest, and if it dominates
by more than 3×, that fact is reported as a finding in its own right.

**`[R4]` Plateau-read discipline — PINNED.** An endpoint level is read **≥ 6 settled trace frames
(0.2 s at 30 fps) after the last change in `fillRaw`**, and only if `fillRaw` is constant across
those frames; a run endpoint that cannot satisfy this is dropped and logged. This controls
**H0-f — render/settle lag** (below), which biases run endpoints low if a level is read mid-animation.

### E3 — run-height linearity check (built in, but evidentially capped)

Runs sit at different bar heights. Under H0-a (non-linear render) `P̂_run` varies systematically with
mean bar height; under a clean linear bar it does not. Regress `P̂_run` on run mean height and report
the slope with its CI. **A uniform gain error is NOT caught by E3** — the E1/E2 opposite-sign test
catches that one.

**`[R6]` Evidentiary cap, binding on every downstream doc:** with only a handful of runs at a handful
of heights, E3 is **underpowered by construction**. A slope CI containing zero is recorded verbatim as
_"no detected non-linearity (underpowered: k runs at j distinct heights)"_ and **may not be cited as
positive evidence that the bar is linear** — not in the verdict, not in `probe-runs.md`, not in the
harness log.

## Predictions, including the DISCRIMINATING one

- H-model ⇒ pooled E2 = 10.388, and every window's E1 interval **contains** 10.388.
- H-elevated ⇒ pooled E2 ≈ 11.0–12.2 with a CI excluding 10.388, **and** E1 intervals exclude it.
- **`[R1]` DISCRIMINATING (the prediction "the number matches" cannot make):** each rival moves the
  estimators in a _different pattern_, and only one pattern is consistent with a real `P_steady`:

  | what is true                                                  | E1      | E2                                | E3            |
  | ------------------------------------------------------------- | ------- | --------------------------------- | ------------- |
  | `P_steady` really is elevated                                 | ↑       | ↑ **same value, both recordings** | flat          |
  | render-gain error (`g > 1`)                                   | **↓**   | ↑                                 | flat          |
  | pull-inventory error (H0-b)                                   | ↑ or ↓  | unmoved                           | flat          |
  | anomaly mis-classification (H0-e)                             | unmoved | moves                             | flat          |
  | non-linear render (H0-a)                                      | mixed   | run-dependent                     | **slope ≠ 0** |
  | settle lag (H0-f)                                             | unmoved | ↓                                 | flat          |
  | **`[NR2]` non-constant P / classification truncation (H0-g)** | **↑**   | **↑**                             | flat          |

  **The signature no single confound produces is E1 and E2 landing on the same value, in the same
  direction, on two independently-calibrated recordings.** Note the gain row: it is the only rival
  that moves them in OPPOSITE directions, which is why `[R1]`'s corrected algebra matters more than
  the retracted "immunity" claim did.

  ⚠ **`[NR2]` The last row is the one rival that CAN fake the signature**, and it is bounded — not
  eliminated — by `[NR1]`'s 3-column radius plus the two-radius sensitivity. It is the reason the
  verdict must quote the empirical-scatter component next to the point estimate.
  ⚠ **`[NR2]` Correction to the H0-e cell:** "E1 unmoved" is false in general. A misclassified LOW
  credit moves E1 up together with E2 (the H0-g row); a reader-INFLATED anomaly moves E1 down alone.
  The table is read with that correction.

- **`[R5]` Out-of-sample leg — magnitude, not sign.** The A3 recording
  (`docs/probe-data/anis-star-solo-a3-gauge-reread.json`) is separate footage, independently
  calibrated, records **no** departing credits, and played no part in constructing the anomaly
  declaration. ⚠ **But its sign is already on the record and cannot falsify anything:** its
  count-to-fill bound (`:182`, steady P ∈ ~[10.96, 12.53)) already excludes 10.388, so "A3 agrees in
  sign" is guaranteed, not informative. **The informative A3 content is E2's MAGNITUDE and whether it
  agrees with solo #2's E2** — a real `P_steady` predicts the same number on both recordings; a
  per-recording calibration artifact does not. Clause 1(iv) is written accordingly.

## Decision rule (pre-committed; falsifiable)

Let `CI` = pooled E2 95 % CI; "window excludes X" = X ∉ that window's E1 interval.

1. **MEASURED-ELEVATED** ⟺ all four hold: (i) `CI` excludes 10.388, **using `SE_pooled` with the
   `[R4]` over-dispersion guard**; (ii) ≥2 **montage-verified** windows individually exclude 10.388
   under E1 (W1 is reader-only and **may not be counted here**); (iii) `CI` intersects every
   contributing window's E1 interval — _this is the E1/E2 agreement test, and per `[R1]` a
   render-gain error fails it by pushing them in opposite directions_; (iv) **`[R5]` the A3
   out-of-sample leg agrees in MAGNITUDE, not sign** — A3's own E2 95 % CI overlaps the solo #2
   pooled E2 CI, **and** the two recordings' E1 intervals have a non-empty intersection that contains
   the pooled E2 point estimate. _(A3's sign and A3's E1 exclusion are already on the record and
   carry no falsifying power — see the blindness declaration.)_
   ⇒ Record `P_steady` = the intersection of the E1 intervals, tier **measured**, n = windows +
   pulls. **No stamp beyond the measurement; no engine change this session.** File on U28's magnitude
   half as a measured overshoot of the shipped model.
2. **MEASURED-CONSISTENT-WITH-MODEL** ⟺ `CI` contains 10.388 **and** ≥2 windows' E1 intervals contain
   it. ⇒ The 2026-08-15 A3 ≥10.96 exclusion is then in tension with this read; log the
   footage-vs-footage conflict, stamp nothing.
3. **BASIS-SUSPECT** ⟺ `CI` is disjoint from **every** window's E1 interval, or E3's slope CI excludes
   zero, **or E1 and E2 have moved in opposite directions relative to 10.388** (the `[R1]` gain
   signature). ⇒ **`[NR2]` The refuted thing is the bar's render model OR the constant-`P` premise**
   — not either hypothesis. INCONCLUSIVE; name which; the correct next step is a render-calibration
   read or a dispersion study, not another magnitude run. The verdict **must quote the
   empirical-scatter component of `SE_pooled` next to the point estimate**, so a
   game-side-dispersed-`P` reality is visible rather than absorbed into a confidence interval. _(This clause exists so "the effect is absent" cannot be confused with "the basis
   is broken".)_
   ⚑ **Reachability check the post-op judge must apply (pre-op risk flag):** a very tight `CI` makes
   clause 2 hard to reach, skewing the practical outcome space toward ELEVATED-or-INCONCLUSIVE. The
   work step MUST report, alongside the verdict, **what CI width would have been needed for clause 2
   to be reachable, and whether it was** — if clause 2 was unreachable at the achieved width, the
   result is reported as INCONCLUSIVE regardless of where the point estimate fell.
4. **INCONCLUSIVE-LOG** ⟺ anything else — windows mutually disjoint under E1, fewer than 2
   montage-verified windows survive, or A3 contradicts in sign.
5. **BASIS-BROKEN (stop)** ⟺ the instrument gate fails: the reader must reproduce the committed
   `maiden-ice-rose` fixture per the 2026-08-15 `instrumentPrelude` method before any value is used.

**Falsification content:** H-model predicts pooled E2 = 10.388 within its CI. A pooled CI excluding
10.388, corroborated by ≥2 independent E1 windows and by out-of-sample A3, **falsifies H-model as the
solo per-pull magnitude.** Conversely, if E2 lands on 10.388, H-elevated is falsified on this footage
and the A3 bound becomes the thing needing explanation.

## The declared candidate — and the firewall around it

Per the QUEUE, the candidate for the departing credits is declared **before** the run:
**Δ = 3.71 pp**, i.e. one extra credit at the datamined non-target base value
(140 energy = `burst_energy_pershot`/100) carried through the ×2.5 focus multiplier and her ×1.06
aura.

**Firewall, binding:**

- ⚑ This figure was **fitted after the fact on n = 3 credits from one recording** (`probe-runs.md`
  8094-8101 says so in the record's own words). **It is not evidence and it is not a prior result.**
- It is declared for exactly one purpose: to make the departing pulls **classifiable** so E1 is
  well-posed. **Neither estimator uses it.** E1 enters anomalies AS RENDERED; E2 excludes them.
- Its only use is one **post-hoc descriptive check**, run strictly after the verdict is written:
  does `(rendered anomalous credit − pooled E2)` cluster at 3.71 within quantization? A hit is
  descriptive corroboration at n = 3, **not** a measurement of a mechanism; a miss does not touch the
  `P_steady` verdict either way.
- **Even a perfect hit would describe a NEW mechanism** — `basePerTrigger` is engine-inert (P3), so
  there is no existing constant this could be "correcting".
- The downward departure (W4p7 ≈ +8.0–8.7) is reported alongside; a candidate that explains only
  upward departures is explicitly incomplete.

## Method (work step, after approval)

1. **Instrument gate first.** Confirm from `anis-star-solo2-gauge.json`'s `instrumentPrelude` that the
   `maiden-ice-rose` fixture reproduction ran and passed, and re-run
   `scripts/tests/gauge-fill-anchor.test.ts` + `gauge-fill-team.test.ts`. Fail ⇒ BASIS-BROKEN, stop.
2. Rebuild the per-window run inventory from the committed traces (`series30fpsChangesOnly` /
   `result` in the solo #2 artifact; `series30fps` in the A3 artifact) — **not** from the summary
   tables. For each window: baseline, opener, departing credits, steady runs, fill instant.
   2b. **`[R3]` Classify departures FIRST and write the classification into the artifact BEFORE
   computing any estimator**, using the pinned `|Δ − median_all| > 1.45 pp` rule and the pinned
   boundary-attribution rule. Report the resulting membership list explicitly, including which pulls
   the rule excludes that a human eye would have kept (and vice versa) — that disclosure is what
   makes the firewall auditable.
3. **Controls before estimates:** (a) trace-event count == montage pull count over every run used;
   (b) no burst-DoT window overlaps any measured run (re-derive cast instants from the artifact);
   (c) carry the Question-B false-event rate from the committed `result` block — do not re-derive it.
4. Compute E1, E2, E3 per window; pool E2; apply the decision rule **as written**, in order.
5. Apply the same estimators to the A3 recording's artifact, unchanged.
6. **After the verdict is written**, and only then, run the declared-candidate check.
7. Deliverables: a verdict-free measurement artifact under `docs/probe-data/`, a committed script
   implementing E1/E2/E3 (constraint 9 — no `/tmp` instrument may be cited), a vitest pin replaying
   it against the artifact, a `docs/probe-runs.md` append, and the harness-log entry after the 2-of-2.

## What this plan CANNOT establish

- **Any mechanism** for the departing credits. n = 3, one recording, and the candidate was fitted
  post-hoc. At most this run classifies them and bounds their magnitude.
- **Any team-context value.** This is solo footage; the team-side in-window elevation (1.6–1.9×,
  the classification thread) is untouched.
- **Whether the game's rider is 1×280 or 2×140** — gauge-equivalent, popup-gated.
- **The `/hitsPerShot` divisor as a general rule** — she is `hitsPerShot` 1; `modernia` remains the
  named probe.
- **Any engine or data value.** Even MEASURED-ELEVATED changes nothing this session: it records a
  measured overshoot of the shipped model on solo footage. The shipped 10.388 keeps its own basis
  (datamine + comp-level FB pins), which this solo observable does not touch — the same firewall
  DECISIONS.md:5953-5959 already draws.
- **Independence from the 2026-08-16 read.** E1 largely re-expresses arithmetic already in that
  artifact. Only E2, E3 and the A3 leg are genuinely new. See the partial-blindness declaration.

### `[R5]/[R6]` Added by the pre-op judge — carried verbatim to the post-op judge

- **Pre-registered status for E1 on EITHER recording.** Solo #2's E1 (`anis-star-solo2-gauge.json:910`)
  and A3's E1-equivalent (`anis-star-solo-a3-gauge-reread.json:182`) are both already on the record
  and both already exclude 10.388. **E1 windows are corroboration, never the discriminating
  evidence; only E2 and E3 were unseen.**
- **That the bar's render model is linear.** E3 is underpowered; a null slope is non-detection, not
  confirmation.
- **That E1/E2 agreement rules out a confound in their shared substrate** — same recording, same
  reader, same bar calibration, overlapping pull inventory (`[R2]`). Their agreement tests exposure
  differences only.
- **`[NR2]` That `P` is constant pull-to-pull.** The observed three-column steady spread is
  consistent with either measurement noise or genuine game-side dispersion, and this run cannot
  separate them. A MEASURED-ELEVATED verdict is a statement about **the classified-steady mean under
  the pinned `[NR1]` rule**, not about a dispersion-free constant.

## Context the judge needs (from the `context` skill, with anchors)

- **§0 validation basis** — scope lock: sync 400, 10/10/10, Base 5 gear, no cube, core 7, treasure,
  partless boss, bossDef 140, auto-play. Configs built via `scopeLockCfg` (`scripts/lib/scope-lock.ts`).
- **§7 burst gauge (v4)** — `addGauge`/`skillGauge`/`shotGauge`; datamined per-shot table
  `data/gauge-per-shot.json`. **Focus bonus: the CAMERA-FOCUSED unit's CHARGE weapon (SR/RL)
  generates ×2.5** (`FOCUS_CHARGE_GEN` sim.ts:1324); unfocused charge ×1.0 (`UNFOCUSED_CHARGE_GEN`
  sim.ts:1332). Gauge is locked during Full Burst AND during chain stages 1-3, unlocking the instant
  FB ends (owner rulings 2026-07-13 + 2026-08-04). In a SOLO Burst-I fight no Full Burst ever occurs:
  the chain opens on gauge-full, stalls ~10 s waiting for a nonexistent Burst II, then expires — so
  the generating windows are `bar-first-paint → next gauge-full`.
- **§4 charge weapons** — `needed = max(1, round(chargeFrames × (1 − CS%/100)))` (sim.ts:1409-1413);
  22-frame release latency (sim.ts:1417-1421) — she is exempt (datamined `input_type='DOWN_Charge'`
  autofire).
- **§9 skill procs** — `flatDamage` proc dispatch in `firePull` (sim.ts:4531-4533); `dot` real-interval
  ticks; effect types `src/skills/types.ts`.
- **§13 evidence tiers** — MEASURED > CALIBRATED ⚑ > DATAMINED > MODEL-ONLY. Never refit a MEASURED
  constant. **Top invariant: accuracy to observed mechanics > board fit; never fudge an unobserved
  mechanic to fit a number.**
- **§14 probe toolchain** — `scripts/probe/gauge-fill.py` (bar reader; on this footage it REQUIRES an
  explicit `--bar` or it self-calibrates onto a terrain edge), `read-total-damage.ts`, `catalog.ts`.
- **Unit-specific:** `anis-star` override gauge-relevant lines — `skill1` aura `burstGenPct 6`
  (lines 13-29) and `skill1` `shotFired → flatDamage atkPct 120.13` (lines 79-93); burst
  Shooting Stars `dot atkPct 40.01, intervalSec 0.25, durationSec 10`. Spec pin
  `scripts/tests/units/anis-star.test.ts` (23/23 green) pins the per-impact credit at 2.8 × 1.06.
