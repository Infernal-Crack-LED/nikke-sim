# PRE-OP PACKET — burst-cycle tempo gap (2026-08-13)

> Saved verbatim so the BLIND post-op judge receives exactly this same context. Do not edit after the
> pre-op judge returns.

## PART A — CONTEXT (from the `context` skill, sections the plan touches)

**§0 What the sim is / validation basis.** Frame-tick 60fps sim predicting per-unit damage, 5-unit
teams, 180s solo-raid. Graded sim-vs-real under **scope lock**: sync 400, 10/10/10, Base 5 gear, no
cube, no doll, core 7, treasure, partless boss, bossDef 140, core exposure 100%, auto-play. Grading
harness `scripts/experiment.ts` (env `ONLY= ROT=1 SEEDS=N DECOMP=1`).

**§7 Burst gauge generation (v4).** `addGauge`/`skillGauge`/`shotGauge`; datamined per-shot table
(`data/gauge-per-shot.json`). Focus bonus: the CAMERA-FOCUSED unit's CHARGE weapon (SR/RL) generates
×2.5 (`FOCUS_CHARGE_GEN=2.5` @ sim.ts:1324); unfocused charge = ×1.0. Gauge locked during FB AND during
the chain (stages 1–3), unlocking the instant FB ends (owner rulings 2026-07-13 + 2026-08-04, and
re-confirmed 2026-08-13: **gauge generates in exactly ONE window per cycle — after a Full Burst ENDS and
before the next chain STARTS**; nothing generates during the chain or FB).

**§8 Burst rotation state machine.** Chain B1→B2→B3 triggers Full Burst. `STAGE_CAST_GAP_FRAMES=30`
(sim.ts:141) between stage casts; gauge-full → 30f → B1 (`PRE_B1_GAP_FRAMES`, sim.ts:148); B3 cast →
22f → FB countdown (`FB_PRE_DELAY_FRAMES`, sim.ts:153/156). `FULL_BURST_FRAMES = 10s` (sim.ts:67/157).
FB start sets `fbEndFrame`. **NO post-FB chain-open lock** (owner ruling 2026-08-04): generation resumes
the instant FB ends and the next chain opens on gauge-full — the ~3–4s gap to the next chain is natural
refill-from-zero, not a delay. The old fixed block (`POST_FB_CHAIN_DELAY_FRAMES=150`) survives ONLY as
the opt-in `ROTMODEL=floor` A/B arm. First-ready-with-waiting selection (sim.ts:3078). Full-burst COUNTS
are refill/cooldown arithmetic — deterministic run-to-run except boss-transition/chain collisions;
graded comps pinned in `scripts/regression.ts`.

**§13 Evidence tiers.** MEASURED (video/frame/popup) > CALIBRATED ⚑ > VALIDATED/DATAMINED >
MODEL-ONLY. Never refit MEASURED constants. TOP INVARIANT: accuracy to observed mechanics > board fit.

**§14 Video toolchain.** `scripts/probe/` — `scan.ts` (deterministic CV burst-timeline scanner),
`read-burst-gauge.ts` (shell over scan.ts with `--sim` compare), `frames.ts`, `classify.py`.

**Engine anchors re-derived from primary sources this session (premise gate, step 0):**

- sim.ts:1458-1466 — `addGauge` lock: `if (fbEndFrame > frame || stage !== 0) return;` → generation
  resumes on the FB-end frame itself, no post-FB gap.
- sim.ts:3367-3389 — FB end: `stage = 0`, `chainBlockedUntil = frame` (no block) unless `ROTMODEL=floor`.
- sim.ts:3403-3415 — chain opens at `gauge >= 100`: `gauge = 0`, `stage = 1`,
  `stageGapFrames = PRE_B1_GAP_FRAMES`.
- sim.ts:141,148,156,157 — `STAGE_CAST_GAP_FRAMES = 30`, `PRE_B1_GAP_FRAMES` (default **ON** = 30f),
  `FB_PRE_DELAY_FRAMES = 22`, `FULL_BURST_FRAMES = 10*FPS`.
- sim.ts:3446-3452 + 286-291 — casts blocked while boss unhittable; transitions at 33/70/106/144/176s,
  60f each.
- sim.ts:3590-3599, 3295-3310 — B3 cast → 22f defer → `fbEndFrame` set → the `FULL BURST (until X)` log
  line is pushed LAST, so any FB extension is already applied when logged.
- scripts/experiment.ts:63-101 — `decomposeCycles()`; reachable only with `SEEDS=1`
  (scripts/experiment.ts:652-702 returns first on the Monte-Carlo path).

## PART B — THE QUESTION

Four comps in `scripts/regression.ts` are `disabled: true` because the sim under-counts their measured
full bursts by 1–2. The engine's own decomposition attributes ~3.5–4.2s per cycle to gauge
refill-from-zero. **Is the sim's burst cycle too SLOW, and if so, does the discrepancy localize to the
gauge-refill window?**

## PART C — WHAT THE PREMISE GATE ESTABLISHED (step 0, four blind verifiers)

1. **Measured FB counts** — CONFIRM for `T5 wind-weak` (13, two independent methods: 2026-07-14 hand
   grade with caster order + stage spacing, and the committed `scan.ts` CV scanner, which is exact on
   8/8 recordings per docs/probe-runs.md:1618-1665). **REFUTE for `iron sweep (run G)`**: its recorded
   count is a coarse "13–14" hand read with no event list, AND the comp mixes two recordings — the
   damage basis is run 1 (docs/probes/713 probe runs/run G.png) while the FB-count basis is a re-run
   with a DIFFERENT slot order (docs/probes/u8/u8 g dmg.png, slugs given exactly — `d-killer-wife`
   (D: Killer Wife, SR/Fire — NOT `d`, SMG/Wind) · `milk-blooming-bunny` (Milk: Blooming Bunny, SR/Iron
   — NOT `milk`, SR/Water) · `maxwell` (Maxwell, SR/Iron — NOT `maxwell-ordinary-mechanic`, SR/Wind) ·
   `takina` · `liberalio`), so the footage's default focus (middle slot) is `maxwell`, not the comp's
   `milk-blooming-bunny`.
   - **Driver mitigation, verified before this plan:** simming run G under the footage slot order
     changes nothing relevant — 11 FBs / mean period 16.14s (footage order, focus `maxwell`) vs 11 FBs /
     16.13s (comp as defined). The premise failure is scoped to the DAMAGE basis; the ROTATION basis is
     unaffected. The plan uses the footage slot order regardless.
2. **`decomposeCycles()` floor** — CONFIRM, narrowed: `floor = fbDur + 0.5 + chain` is structurally
   complete and non-overlapping, `fbDur`/`chain` are measured medians from the run's own rotation log
   (not hardcoded), and no unit in either comp alters FB length (exact-slug checked: `d-killer-wife`
   carries NO `fullBurstExtend` — the base slug `d` does, and they are different units). But `excess`
   over-states refill by **+0.117s (run G) / +0.114s (T5)** per cycle, entirely one boss-transition
   cast-block inside the chain. Treat `excess` as refill ±0.15s.
3. **Instrument capability** — **REFUTE as briefed.** The FB-**END** edge is NOT measurable: the burst
   bar's last ~1.5s is too narrow to render, so a nominal 10s FB reads 8.2–9.4s — biased early by a
   NON-CONSTANT 1.2–1.8s (scan.ts:343-346 documents this: "never as an absolute duration measurement").
   That bias exceeds the effect size. **But FB-START is frame-accurate** (drain-window start minus
   stage-3 onset = 0.350s at 60fps vs the engine's 22f = 0.367s, within one frame) and the **stage-1/2/3
   cast ladder is frame-accurate at `--fps 60`** via `scan.ts` `burstChains[]`. The gauge-full/"ready"
   instant is not rendered in the crop at all. Both videos are 1206×2622 rotation=90 → 2622×1206
   displayed, 60fps; the default crop is valid on both, no override needed.
4. **`liberalio` common to all four disabled comps** — CONFIRM, narrowed hard: it is the unique common
   slug, but it appears in **zero passing comps**, so its presence is perfectly confounded with the
   disabled flag — a lead, not a localization. Moreover the same shortfall class affects liberalio-FREE
   comps (`misc B3s (run I order)`: sim 12 vs measured 13). The plan therefore makes **no** liberalio
   claim.

## PART D — HYPOTHESES

- **H1 (refill window too slow).** The sim's gauge refill-from-zero takes materially longer than the
  game's. ⇒ real cycle period is SHORTER than sim period on both comps, the real cast ladder MATCHES the
  sim's, and the discrepancy localizes to the FB-start → next-stage-1 span.
- **H0a (tempo model exonerated).** Real period ≈ sim period. The FB-count shortfall is then an
  artifact elsewhere (opening conditions, fight-length bookkeeping, count error) — a real result.
- **H0b (the CHAIN is too slow, not the refill).** The real stage1→2→3→FB ladder runs faster than the
  modeled 30f/30f/22f. Cheaply falsifiable because the ladder is frame-accurate; would be surprising
  (those are measured constants from chisato.mov) but it is a genuine rival.
- **H0c (anchor / video-time≠fight-time confound).** The apparent gap comes from where the fight clock
  is anchored, not from the steady-state period. **Structurally excluded by design** — see Controls.
- **H0d (real Full Burst is shorter than the modeled 10s).** A shorter real FB shrinks the period with
  no refill error at all. **Bounded, not assumed** — see the discriminating prediction.

## PART E — METHOD

**Instrument:** `scripts/probe/scan.ts` (committed, deterministic CV, exact FB counts on 8/8 labeled
recordings). NOT `read-burst-gauge.ts`'s transition list — its 2-frame debounce deletes stage-1 at the
default fps (established in the premise gate).

**Recordings (both full length, ~180s):**

- `docs/probes/u8/u8 g vid.mov` — "iron sweep run G", boss Electric, measured 13–14 FBs, sim 11.
- `docs/probes/probe u7/13 fb count wind weak vid.MP4` — "T5 wind-weak", boss Iron, measured 13, sim 12.
  (`docs/probes/` is gitignored and exists only in the main tree.)

**Two-tier sampling, cost-aware:**

- `--fps 20` full-length on both → FB-start times (0.05s quantization; the effect is ~1.8s, so this is
  36× finer than needed) ⇒ per-cycle PERIODS.
- `--fps 60` on the windows containing each burst chain ⇒ the stage1→2→3→FB-start LADDER (spans are
  ~0.5s, so this tier genuinely needs frame resolution).

**Sim side:** `run()` + `decomposeCycles()` from `scripts/experiment.ts`, `SEEDS=1` (deterministic;
DECOMP does not execute on the Monte-Carlo path). Run G under the FOOTAGE slot order.

**Quantities compared, per comp:** mean and per-cycle distribution of (i) FB-start → next FB-start
[PERIOD], (ii) stage1 → FB-start [LADDER], (iii) FB-start → next stage1 [= FB duration + refill + 0.5s
pre-B1].

## PART F — PREDICTIONS

| #   | Quantity                   | H1 predicts                           | H0a                | H0b                            |
| --- | -------------------------- | ------------------------------------- | ------------------ | ------------------------------ |
| 1   | real PERIOD vs sim         | real shorter by ~1.5–2.0s, both comps | equal (\|Δ\|<0.5s) | real shorter                   |
| 2   | real LADDER vs sim (~1.4s) | equal within ±0.15s                   | equal              | real shorter by ~the whole gap |
| 3   | gap location               | all of it in FB-start→stage1          | n/a                | all of it in the ladder        |

**THE DISCRIMINATING PREDICTION (separates H1 from H0d, the rival I cannot measure directly).** The
instrument's FB-duration bias is **one-sided by construction**: the drain bar can only under-render, so
the observed drain window is a strict SUBSET of the true Full Burst. Therefore
**true FB duration ≥ longest observed drain window.** Observed drain windows run 8.2–9.4s ⇒ true FB ≥
9.4s ⇒ a short-FB explanation can account for **at most ~0.6s** of the gap. If the measured period gap
is ~1.8s, H0d is bounded out as the sole cause; if the gap is ≤0.6s, it is not.

**⚑ GUARDS ON THE BOUND (pre-op revision 3 — the subset property is the whole inference, so it is
checked per-cycle, not assumed).** The bound is valid only if every window feeding it both starts no
earlier and ends no later than the true Full Burst:

- **3a — START guard.** A cycle's drain window enters the FB-duration lower bound ONLY if its start is
  within **±2 frames of (that cycle's stage-3 onset + 22f)**. This excludes any early-start artifact —
  notably a detector catching the gauge bar's reset-to-zero at chain open (~1.4s before FB), which
  would break the subset property in the direction that inflates the bound.
- **3b — END guard.** The end frame of the SPECIFIC longest window feeding the bound must be
  independently corroborated (second-detector agreement, or a frame dump showing the bar still
  rendered). The documented under-render mechanism can only truncate, but a CV false positive after FB
  end is a different failure mode that mechanism does not cover — and a late-end artifact on the
  longest window would overstate the bound and unfairly eliminate H0d, i.e. bias toward H1.
- **3c — STATED ASSUMPTION.** The bound treats real Full Burst duration as **cycle-invariant**. This is
  supported (a game constant; the premise gate exact-slug-verified that no unit in either comp carries
  `fullBurstExtend`) but it is an assumption, and it is logged as one.

**Arithmetic closure (whole-picture check).** The measured mean period, projected across the 180s
fight, must reproduce that comp's independently measured FB count. If measured periods imply a count
that contradicts the recorded count, the reading is broken — not the model.

## PART G — CONTROLS

- **Two independent recordings**, different teams, different boss elements (Electric / Iron), different
  weapon mixes. A gap in only one is not a general finding.
- **Anchor-free by construction (kills H0c).** Every measured quantity is a DIFFERENCE between two
  events in the same video, so no `--t0` fight-clock anchor enters the measurement. The documented
  "video time ≠ fight time / off-by-one-second ≈ a whole FB" trap cannot fire on a period.
- **Instrument self-check, with each video's label status stated (pre-op revision 4).**
  - `probe u7/13 fb count wind weak vid.MP4` **IS** in the scanner's labeled validation set
    (docs/probe-runs.md:1655-1665: measured 13, scan.ts 13, 13/13 corroborated; the set is exact on
    8/8). PASS = scanner reads **exactly 13**, all detections second-detector-corroborated.
  - `u8/u8 g vid.mov` is **NOT** in that set, and its hand label was refuted as a coarse "13–14" with
    no event list. Its count check is therefore **corroboration-only**: PASS = scanner count ∈
    **{13, 14}** with all detections corroborated. A scanner/hand mismatch INSIDE that range is
    attributed to the coarse hand read, not to the scanner — the scanner is the better-validated
    instrument of the two, and voiding the run on a label the premise gate already refuted would be
    circular.
  - Either video failing its criterion ⇒ the run is void for that video and no comparison is made.
- **Edge-effect exclusion.** Opening and closing cycles are reported separately from the steady-state
  middle; `decomposeCycles()` already uses the middle 60%, and the real-side statistic uses the same
  window so the two are like-for-like.
- **Known instrument bias is used only in its safe direction** — the drain-window END is used ONLY as a
  one-sided lower bound on FB duration, never as a duration measurement.
- **The `excess` comparand is corrected** by the premise gate's measured +0.11s/cycle chain residual.

## PART H — PRE-COMMITTED DECISION RULE

Evaluated on the steady-state cycles of BOTH comps (n ≈ 12 periods each, ~24 total):

- **H1 CONFIRMED** iff (a) mean real period is shorter than mean sim period by **≥1.0s on both comps**,
  AND (b) the real ladder matches the sim's within **±0.15s**, AND (c) the FB-duration lower bound
  leaves **>0.6s** of the gap unexplained by H0d, AND (d) arithmetic closure holds on both.
  ⇒ **Report the refill-window error as a RANGE, never a point value** (pre-op revision 5):
  `[gap − (10s − FB_lower_bound), gap]` per comp. The H0d residual (≤ ~0.6s) is an irreducible
  attribution ambiguity, because FB-end and gauge-full are BOTH unobservable inside the
  FB-start→stage1 span. The named proposal must carry the range. **LOG verdict + proposal. No engine
  constant is changed in this pass** (owner-scoped).
- **DIRECTIONAL** (pre-op revision 1a) iff the gap is consistent in direction on both comps with mean in
  **[0.5, 1.0)s**. ⇒ Logged as evidence TOWARD H1, explicitly **not confirmed**; **no proposal filed**.
- **H0a — TEMPO MODEL EXONERATED** iff mean \|real − sim period\| < 0.5s on both comps. ⇒ Record it as a
  real result and **STOP**. Do not go hunting a second theory in this pass.
- **H0b** iff the ladder differs by >0.15s and the ladder difference accounts for **≥70%** of the period
  gap. ⇒ Report as a chain-timing finding, explicitly NOT a refill finding.
- **MIXED** (pre-op revision 1b) iff the ladder differs by >0.15s but accounts for **<70%** of the gap.
  ⇒ Report the ladder share and the FB-end→stage1 share **separately**, LOG both, make **no
  single-cause claim**.
- **INCONCLUSIVE** iff the two comps disagree in direction, or their gap magnitudes differ by >1.0s, or
  the instrument self-check fails on either video. ⇒ Report per-comp, make no general claim.
- **FALSIFICATION CLAUSE, distinguishing "no effect" from "broken basis":** a failed instrument
  self-check (FB count ≠ recorded count, or uncorroborated detections) or a failed arithmetic closure is
  a **BROKEN BASIS** → INCONCLUSIVE, never "H1 refuted". "H1 refuted" is reserved for a run whose basis
  checks all PASS and whose period gap is genuinely <0.5s.

## PART I — SCOPE

Measurement + LOG verdict + proposal only. No engine constant changes, no override retunes, no
`disabled: true` removals in this pass (owner-scoped 2026-08-13). Deliverable is data + a decision-log
entry.

## PART J — WHAT THIS PLAN CANNOT ESTABLISH

- It cannot measure the real Full Burst duration directly (only lower-bound it), nor the real
  gauge-full instant (not rendered).
- It cannot attribute a confirmed refill-window error to any particular unit, mechanic, or constant —
  `liberalio` is perfectly confounded and the plan makes no per-unit claim.
- It cannot establish that fixing the refill window would fix the FB counts; that is a separate,
  gated enactment pass.

**Added by the PRE-OP JUDGE (carried verbatim to the blind post-op judge):**

1. **Magnitude, not just attribution.** A confirmed refill-window error is determined only to within the
   H0d residual (~0.6s) — the plan cannot produce a POINT value for the refill error, only a range.
2. **It cannot exclude a COMBINED H1+H0d.** The bound rules out a short Full Burst as the SOLE cause,
   not as a contributor.
3. **Mechanism ambiguity within the window.** Even a confirmed FB-end→stage1 gap cannot distinguish
   "gauge generates too slowly" from "the chain opens late after gauge-full" (the old floor model's
   shape) from a per-shot-table or focus-multiplier error — the gauge-full instant is unrendered, so
   everything between FB-end and stage-1 is ONE INDIVISIBLE SPAN.
4. **Generality is bounded to `liberalio`-containing comps.** Both test recordings are disabled comps
   and `liberalio` is their common slug, so a confirmed H1 does not establish an engine-GENERAL refill
   error versus something correlated with that unit's presence. The `liberalio`-free shortfall comp
   (`misc B3s (run I order)`) is not measured here.

**Also per the pre-op judge's risk flags:** the arithmetic-closure check is **near-circular** with the
scanner's own count (N detected FB starts in span T give mean period ≈ T/N by construction). It is a
BASIS-SANITY GATE only and must NOT be cited at post-op as independent corroboration of the period
reading. And if real tempo is faster, real and sim cycles hit the 60f boss-transition windows at
different cycle indices — ~0.1s-scale asymmetric noise, well below the 1.0s threshold, but the
per-cycle distribution is eyeballed for outlier cycles before averaging.
