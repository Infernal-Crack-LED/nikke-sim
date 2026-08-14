# Pre-op packet — refill-window fill-trace measurement (2026-08-14)

> The EXACT packet sent to the pre-op judge (and re-sent verbatim to the blind post-op judge).
> Plan: `/scientific-method` step 1. Driver: this session. Predecessors: the tempo-gap
> measurement (`docs/probe-runs.md` 2026-08-13), the four-item burst-generation plan (all closed,
> `docs/handoffs/2026-08-13-burst-generation-investigation-plan.md`), the premise gate + avenue
> ranking (`docs/handoffs/2026-08-14-burst-generation-remaining-avenues.md`).

## A. Context (file:line anchors current as of main `735da23f`)

**What the sim is.** Frame-tick 60fps sim, 5-unit teams, 180s solo raid, graded sim-vs-real under
scope lock (sync 400, 10/10/10, Base 5, no cube, core 7, partless boss, auto-play). Configs only
via `scopeLockCfg` (`scripts/lib/scope-lock.ts`); grading harness `scripts/experiment.ts`.

**Burst gauge (gm §6/§7).** Generated per HIT only, ONLY in the window FB-end → chain-start
(owner ruling 2026-08-13; `addGauge` lock, `src/engine/sim.ts:1487`). Datamined per-shot table
(`data/gauge-per-shot.json`); focused charge weapon ×2.5 (`FOCUS_CHARGE_GEN`, sim.ts:~1324,
measured), unfocused ×1.0 (measured); `burstGenPct` rate buffs modeled and censused (2026-08-14);
`fillGauge` one-shot fills bypass `addGauge` (sim.ts:~2825). Full Burst is EXACTLY 10s unless
ability-modified (owner ruling 2026-08-14, DECISIONS). Chain ladder: gauge-full → 30f → B1 → 30f →
B2 → 30f → B3 → 22f → FB (sim.ts:141-153); real cast ladder footage-confirmed 1.383–1.400s vs
modeled 1.3667s. NO post-FB chain-open lock (owner ruling 2026-08-04).

**The established gap (measured).** Real burst cycle is 1.662s/1.649s per cycle faster than the
sim on the two filmed comps (probe-runs 2026-08-13, middle-60% windows, n=8 cycles each, sd
0.42–1.19s). With FB=10s owner-pinned, the conversion stands: real refill 2.59s (iron sweep run G)
/ 1.91s (T5 wind-weak) vs sim observed refill 4.22s / 3.79s ⇒ the sim feeds the bar **61% / 50%**
of required (38.6 vs 23.7, 52.4 vs 26.4 gauge/s; `docs/fb-count-matrix.md`). Four candidate causes
audited and excluded 2026-08-14 (refill starvation, missing source kinds, focus columns, SG
crediting); gauge-rate buffs censused clean; iron sweep (run G) carries ZERO burst-gauge kit lines.

**The comps.** iron sweep (run G) = `d-killer-wife` · `milk-blooming-bunny` · `maxwell` (focus) ·
`takina` · `liberalio` — five SR, boss Electric, sim 11 FB vs measured 13–14. T5 wind-weak =
`nayuta` SMG · `cinderella-crystal-wave` MG · `anis-star` RL (focus) · `liberalio` SR · `velvet`
SR — boss Iron, sim 12 vs measured 13. Optional third arm: misc B3s (run I order) = `grave` ·
`anis-star` · `jill` (focus) · `chisato` · `noir` — the `liberalio`-free shortfall comp (sim 12 vs
13), footage on disk (`docs/probes/u8/u8 i vid.mov`), never cycle-scanned.

**The central contradiction this measurement attacks.** Iron sweep's per-shot values are
datamine-exact against two solo bar anchors, both its charge multipliers are measured, it carries
no gauge kit lines — yet the real fight generates ~38.6 gauge/s where those same values produce
23.7. Either a settled premise breaks in TEAM context, or a source with no sim primitive exists,
or the window accounting is wrong.

## B. Instruments (built + validated 2026-08-14, cheap lane; branches pending merge)

1. **Team-HUD fill reader** — `scripts/probe/gauge-fill.py --team` (branch
   `instrument/gauge-fill-team`, commit `b93ab217`, verify green). Locks the team charging bar
   (134px @ x2477–2610, rows 491–498 — identical lock on all three team videos; loud refusal
   outside width bounds). Validated on sim-independent labels only: full instants matched 12/12
   per video against the committed chain-ladder fixtures (residual mean −0.032s/−0.051s, sd
   0.013/0.019); traces non-decreasing within 1.5% on clean frames; solo anchor regression
   byte-identical (6/6). Committed fixture: 4 refill windows of iron sweep (run G) @30fps + an
   11-assertion vitest. **Known limits (must shape the plan):** (i) absolute low-fill levels are
   owner-ruled UI artifacts — flagged, never asserted; (ii) a gain-pulse animation renders the
   whole bar at fill colour for ~0.25s straddling large steps — per-frame indistinguishable from
   full, separable only temporally; (iii) **a hard blind spot at every window START: the drained
   FB bar holds the widget slot 0.77–1.70s (mean ~1.5s) after FB-window end before the charging
   bar paints** — the window opening is unobservable; (iv) ~65% of window frames survive as clean
   reads; closure of clean cumulative increments ≈ 94–96% over ~80% span coverage; (v) the trace
   is the TEAM SUM — no per-unit attribution; (vi) ±1 column = 0.75% is the error FLOOR.
2. **Sim credit schedule** — `scripts/battery/fb-count-matrix.ts --credit-schedule [--json]`
   (branch `instrument/gauge-credit-schedule`, commit `df9efdf1`, verify green). Emits the
   engine-true (frame, slug, amount, kind∈{shot, skill, fill}) list per unlocked window for both
   comps. Validated exhaustively: per-unit endpoint residual 0.0 vs `gaugeGenerated`; 31/31 and
   341/341 `DBG_GAUGE` truth lines matched; **every credit frame on both comps (141 / 1651)
   re-derived from engine truth via truncated-run diffs and matched exactly**, including all 11
   tap-invisible `fillGauge` credits; prefix determinism asserted. `unreconstructed` list empty
   on both comps (loud, never silent, for unsupported kinds).

**New boundary observation the reader surfaced (adjudicated by NOTHING yet):** the bar's
full/green instant lands only **0.016–0.083s before the stage-1 hexagon** (24/24 windows, both
videos) — against the engine's modeled 30f (0.5s) gauge-full → B1 gap. If the real pre-B1 gap is
~1–5 frames rather than 30, the refill-window duration convention (`B1 − 0.5s − FB-end`, used
symmetrically on both sim and real sides of the tempo conversion) under-states the REAL window by
~0.42–0.48s per cycle — which lowers the required rate (iron: 38.6 → ~32.6 gauge/s; T5: 52.4 →
~44.6). Confound to note: the "full instant" is the bar's GREEN RENDER and the "stage1" is the
hexagon DETECTOR onset — each carries its own render/detection latency; the offset measures their
difference, not the game's internal state directly.

## C. The plan

**QUESTION.** Where does the real teams' extra generation come from? Compare the real fill trace
(team sum, gauge/s + frame-increment structure) inside every readable refill window against the
sim's engine-exact credit schedule for the same comp.

**H1 (in-window under-crediting).** The real visible-span fill rate materially exceeds the sim
schedule's rate over the same window fraction, in one of three classifiable forms:

- **H-A (per-hit credit larger in team):** real frame-increment distribution matches the
  schedule's in EVENT COUNT and timing but its increment quantiles scale up ~uniformly.
- **H-B (more hits than modeled):** real increment EVENTS outnumber the schedule's; individual
  increments match modeled sizes.
- **H-C (unmodeled source):** surplus increments cluster at instants with NO schedule counterpart
  (±5 frames), e.g. at buff-refresh/skill-activation times.

**H0/rivals.**

- **H0a / H-E (window accounting, not generation):** the visible-span rate MATCHES the schedule
  (ratio ≈ 1); the tempo gap is instead explained by boundary conventions — the ~0.45s pre-B1
  correction (above) and/or the unobserved ~1.5s window opening carrying generation the
  convention attributes elsewhere. Prediction: R ≈ 1 in the visible span AND the measured
  boundary corrections arithmetically close a quantified share of the 1.65s/cycle gap.
- **H0b (instrument artifact):** gain-pulse contamination or blind-spot selection bias
  manufactures an apparent surplus. Controls: temporal gain-pulse exclusion; compare like spans
  (sim schedule restricted to the SAME visible fraction of each window — this cancels
  front-loading bias in BOTH directions); per-window dispersion reported.
- **H0c (basis error):** footage roster/focus differs from the sim roster (run G slot order is
  pinned via `slugsOverride`; T5 focus ambiguity was already graded robust in plan item 3).
- **H-D (bar threshold < 100 in team)** is only weakly testable (absolute levels unreliable):
  bounded via closure sums; report only.

**METHOD.**

1. Combo worktree merging both instrument branches; `verify.sh` green before any run.
2. Real side: `--team` trace at 60fps over every refill window of both videos (12 windows each),
   excluding flagged frames (lowFill / gain-pulse / nonMonotonic / occlusion) per the reader's
   committed flag taxonomy. Windows with <50% clean coverage are dropped (reported, not used).
3. Sim side: `--credit-schedule --json` for both comps (run-G slot order via `slugsOverride`).
4. Per readable window: (a) **R = real clean-span rate ÷ sim schedule rate over the same relative
   span** (both %/s; sim window mapped by fraction-of-window, not absolute seconds);
   (b) frame-increment histograms real vs schedule (team-sum at 60fps on both sides);
   (c) surplus-event census: real increments >1.5% with no schedule event within ±5 frames;
   (d) boundary reads: full-instant−stage1 offset, FB-drain-end → bar-paint delay, per window.
5. Optional third arm (generality, run only if cheap): `scan.ts --fps 60 --cycle-table` on
   `docs/probes/u8/u8 i vid.mov` (misc B3s run I) to derive its windows, then repeat 2–4. Its
   result does not gate the primary verdict; it bounds the `liberalio` confound.

**PRE-COMMITTED DECISION RULE.** Median R across readable windows, per comp:

- **R ≥ 1.3 on both comps** → in-window under-crediting CONFIRMED; classify by (b)/(c): quantile
  scaling with matched event counts → H-A; event surplus with matched sizes → H-B; surplus at
  schedule-empty instants ≥30% of the surplus gauge → H-C. Shares reported; classes may co-exist;
  no single-class stamp unless one carries ≥60% of the surplus.
- **R < 1.15 on both comps** → in-window generation is NOT the gap; H-E is the live explanation —
  quantify the boundary corrections and check whole-picture closure against the measured
  1.65s/cycle tempo gap. If the corrections close <50% of the gap, report the remainder as
  UNATTRIBUTED (that is a real result).
- **Between, or comps disagree** → mixed/inconclusive; report per-comp shares, no classification.
- **Falsification/basis clause (distinguishes "effect absent" from "basis broken"):** if <6
  readable windows per comp, or per-window R dispersion IQR > 0.5, the instrument basis is
  insufficient — verdict CANNOT-MEASURE, and the deliverable states which limit bound it.

**Everything is a MEASUREMENT + LOG.** No engine constant, override, snapshot, or DECISIONS
change in this pass regardless of outcome (measurement ≠ enactment). An enactment proposal, if
any, is a separate gated pass.

**PREDICTIONS (pre-registered).** Sim schedule rates ≈ 23.7 / 26.4 gauge per refill-second
(known). If the tempo-gap frame is fully in-window generation, R ≈ 1.5–1.7. If H-E carries most
of it, R ≈ 1.0–1.15 and the pre-B1 correction ≈ 0.42–0.48s/cycle + paint-delay effects must
arithmetically recover ≥50% of 1.65s/cycle. The DISCRIMINATING prediction: H-A/H-B/H-C/H-E leave
four distinct signatures (increment quantiles / event counts / off-schedule instants / R≈1 with
boundary closure) — no outcome is consistent with more than one full explanation at once.

**What this test CANNOT establish:** per-unit attribution (team-sum trace); absolute low-fill
levels; anything about SG-seated comps (neither filmed comp seats one); the game's internal
gauge-full instant (only render-relative offsets).
