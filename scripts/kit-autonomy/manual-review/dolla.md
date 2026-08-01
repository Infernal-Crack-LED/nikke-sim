# Manual review — dolla (Dolla)

**Gauntlet date:** 2026-07-31
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (escalating `burstCdr` team-rotation lever; round-count escalation; `burstCast`-vs-`fullBurstEnter` trigger split; scoped all-ally buffs)

> Slug disambiguation: `dolla` is the base SR/Wind/Supporter (data name "Dolla", Burst II, cd 20s,
> Tetra). Lint clean (no AMBIGUOUS). Structurally a sibling of `liter`'s skill1 — two independent
> escalating ladders (one on Full Burst entry, one on her own burst cast).

## Kit summary

Dolla is a Wind-element sniper Supporter on Burst II whose value is entirely squad support; her own
charged-SR damage is minor. On a repeating 10-second internal timer (no activation clause →
class-1 periodic skill, datamined `skillCooldownsSec.skill1 = 10`) she grants the whole team
+16.16% ATK for 5s (50% duty — a faithful short-buff character). Her Skill 2 is TWO independent
escalating ladders. The first activates whenever the team enters Full Burst and shortens every
ally's Burst Skill cooldown — ▼1.82s on the first entry, ▼2.2s more on the second, ▼2.6s more on
the third, with "each subsequent effect triggers all effects before it" so the cumulative reduction
is 1.82 / 4.02 / 6.62s from the 3rd entry on (a team rotation accelerator). The second activates
only when DOLLA HERSELF casts her Burst Skill and stacks escalating team stats — ATK +7.72% on her
first cast, adding Critical Rate +4.21% on her second, adding Critical Damage +13.22% from her
third on, each for 5s. Her Burst Skill is a single 734.69%-of-final-ATK Wind nuke at the
highest-final-DEF enemy (the single partless boss under scope lock; FB-exempt — the cast lands
before the Full Burst window opens).

## Line-by-line

| Line                                                                                          | Disposition    | Notes                                                                                                                                                                                                                |
| --------------------------------------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1: interval:10 → allies atkPct 16.16/5s                                                      | FAITHFUL       | Class-1 periodic timer (no activation clause; cadence from datamined `skillCooldownsSec.skill1=10`, NOT the burst CD); D1 pins the 10s grid, 5s expiry, all-3-allies, 17 windows/180s, and kills the passive misread |
| S2a: fullBurstEnter → allies escalating burstCdr [1.82,2.2,2.6]                               | FAITHFUL       | Cumulative (engine applies steps 1..min(N,3)); fires on ANY team FB regardless of caster; D2 pins four ways on TIMING (count is ceiling-bound — the liter-documented trap)                                           |
| S2b: burstCast → allies escalating [atkPct 7.72 / critRatePct 4.21 / critDamagePct 13.22, 5s] | FAITHFUL       | Own-cast-only (the deliberate trigger split from S2a); cumulative-prefix unlock, all-3-allies, 5s; D3 pins per-cast ladder + fullBurstEnter mis-key over-credit counterfactual                                       |
| Burst: burstCast → enemy flatDamage 734.69                                                    | FAITHFUL       | FB-exempt (D4: empty fbMajorApplied list), crit-eligible at sheet rate, burst bucket, one hit per cast                                                                                                               |
| Burst: "1 enemy with the highest final DEF"                                                   | DOCUMENTED_GAP | Single-boss sim makes DEF-ranking selection unobservable and damage-neutral; recorded by driver and both blind agents                                                                                                |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. All 4 load-bearing lines
  FAITHFUL with matching counterfactuals (passive-S1 / non-cumulative CDR / `fullBurstEnter`-or-
  non-cumulative stat ladder / +50%-FB-major nuke). Pre-flagged the highest-risk misread: S1 has no
  activation clause, so the interval value must be sourced from `skillCooldownsSec` (10), never the
  burst CD (20), and a passive-permanent encoding is a large over-credit. No REAL-GOTCHA.
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Independently derived all 4 kit lines,
  with exact cumulative count arithmetic for S2b (`casts×allies` / `(casts−1)×allies` /
  `(casts−2)×allies`) and a linearity-based magnitude pin for the burst. As-written vs the driver
  override: 11 pass / 12 fail / 3 skip — **all 12 failures are harness-API / fixture artifacts**, not
  kit divergences: `opts.onEvent` set where `runComp` reads `opts.cfg.onEvent` (every event count read
  0); `durationShots` asserted `undefined` where the engine emits `null`; the `controlComp('dolla')`
  fixture lets crown take every B2 slot so dolla casts 0 bursts (its own non-vacuity guard flags it);
  and the CDR was read through Full Burst COUNT, which is ceiling-bound (5 FBs for every arm — the
  liter-documented trap). After adapting those (`blind/dolla.adapted.test.ts`: API fixes + fixture
  `liter/blanc/dolla/helm` where dolla casts 4 of 5 FBs + the timing instrument for the CDR): **24
  pass / 3 skip** GREEN vs the driver override, preserving every kit claim and counterfactual.
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. Converges on EVERY load-bearing
  mechanic — the S2a CDR ladder (`fullBurstEnter` → escalating burstCdr [1.82,2.2,2.6]) and the S2b
  stat ladder (`burstCast` → escalating [atkPct 7.72 / critRatePct 4.21 / critDamagePct 13.22, 5s],
  same step order, cumulative) are byte-identical to the driver's; the burst nuke is the same
  magnitude (734.69) with explicit crit/noRange/noFb flags behaviorally equivalent to the driver's
  engine defaults. ONE divergence: S1 `interval sec:20` — the blind writer's OWN flagged guess (it
  lacked `skillCooldownsSec` in-packet and used the burst CD), vs the driver's datamined `sec:10`.
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, discriminationOk:true, gotchas:[].**
  All 4 load-bearing lines FAITHFUL + 1 DOCUMENTED_GAP (burst DEF-ranking, inert single-boss), zero
  silent drops. The judge independently ruled the S1 interval divergence in the driver's favor
  ("driver correct, blind's 20 a recon error — the datamined skillCooldownsSec.skill1=10 confirms the
  driver") and verified each of the 12 blind reds is a harness/fixture artifact, not a behavioural
  divergence. Convergence: `s5TestsVsDriverOverride: GREEN`.

## Residual flags for owner

1. **⚑ S1 first-fire phase (MEASUREMENT-GATED).** The interval trigger fires first at t=10s by
   convention; the prose gives no activation clause, so the t=10-vs-t=0 phase is a ⚑ (worth one early
   5s buff window). Pin from a focused popup if dolla is ever graded. All agents share the repo
   convention that a clause-less skill is an interval timer (snow-white precedent).
2. **⚑ 4th+ escalation activation (shared engine-default assumption).** The kit states three
   cumulative tiers but not what activation 4+ does; the engine re-applies all three steps (cap at
   min(N,3)). Both blind agents made the same assumption. One late-fight escalation check would retire
   it; neither blocks GO.
3. **⚑ Cadence tuple (datamine).** SR pullsPerSec / chargeFrames 60 / reloadFrames 141 / ammo 6 is a
   datamine estimate (no text tell of a special fire mode). Low impact — her self-damage is minor.
4. **burstCdr blast radius.** The S2a CDR is a TEAM rotation lever; grade via a /sim-battery diff
   before any board-level claim, never sim-vs-sim self-grade.
5. **MODEL_ONLY / untuned.** The gauntlet certifies kit FAITHFULNESS (structure), not a real-fight
   tune — tier stays MODEL_ONLY, tuned:false until a recording validates it.
