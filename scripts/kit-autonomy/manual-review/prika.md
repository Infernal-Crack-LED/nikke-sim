# prika (Prika) — kit-autonomy gauntlet manual-review

**Date:** 2026-07-25 · **Driver:** qwen · **Verdict:** **GO (cross-family corroborated)** · **Faithfulness:** 0.92 (S7 judge) · **Tier:** 2

SR / Supporter / Water / Burst II, cd 40s, ammo 6, chargeFrames 60. A pure buffer: her damage
contribution is the buffs she puts on the team, so every load-bearing line is pinned on the
buffApply **event log** (value / duration / target-set / cadence), not a damage total.

## Cross-family chain

| Role                         | Model          | Artifact                         | Outcome                                                                             |
| ---------------------------- | -------------- | -------------------------------- | ----------------------------------------------------------------------------------- |
| S2b test-faithfulness review | claude-fable-5 | `reviews/prika.test-review.json` | converged on all 5 damage lines + burstCdr sign                                     |
| S5 blind test writer         | claude-opus-5  | `blind/prika.test.ts`            | S1 assertions **PASS** vs driver; burst assertions void (broken fixture, see below) |
| S6 blind override writer     | claude-opus-5  | `blind/prika.override.json`      | S1 triad + burst chargeDamage **byte-identical** to driver                          |
| S7 reconciling judge         | claude-opus-5  | `results/prika.json`             | **GO 0.92**, discriminationOk:true                                                  |

## What is verified faithful (pinned by `scripts/tests/units/prika.test.ts`, 20 assertions GREEN)

- **P1** S1 Projectile Explosion Damage ▲20% / 3s, all allies, on full charge (shotFired; SR auto-full-charges). Damage-inert at scope (RL-only flavor) — pinned on the buff event.
- **P2** S1 Pierce Damage ▲13.09% / 3s, all allies. Damage-inert at scope (no Pierce-tagged recipient) — verified byte-identical totals with the effect removed.
- **P3** S1 ATK ▲20% **of the skill user's ATK** = `casterAtkPct`: a flat add off Prika's ATK, identical on every ally. Discriminated against `atkPct` (which emits the percentage 20, not a flat caster-scoped number).
- **P4** S2 Encore Effect 3: all allies Attack Damage ▲25.01% / 10s, once per Full Burst entry (solo-mode `fullBurstEnter` proxy).
- **P5** Burst Effect 2: all allies Charge Damage ▲25% / 25s on `burstCast`.
- **P6** S2 Encore Effect 4: "Cooldown of Burst Skill ▲21 sec" is an **INCREASE** — `burstCdr seconds:-21` adds 21s (40s→61s, 3 casts/180s). Discriminated against the decrease misread (+21 → 9 casts). _The S5 blind role missed this (claimed "burstCdr models reduction only"); the judge ruled it RECON_ERROR, not a finding._
- **P7** Burst Effect 1 recovery **cadence**: `heal{ticks:25, intervalSec:1}` fires 25 recovery events over 25s per cast, keeping an on-recovery consumer (crown) refreshed across the whole window. Discriminated against `ticks:1`. _(Added this pass per judge gotcha 3 — see below.)_

The S6 blind override is **byte-identical** to the driver on the S1 triad + burst chargeDamage; the
S5 blind test's three S1 assertions **pass unmodified** against the shipped override (the meaningful
cross-family evidence, vs same-model agreement).

## Residuals (owner spot-checks — ranked by the S7 judge)

1. **GOTCHA 1 — duet Encore Attack Damage 9999s vs printed "for 10 sec"** (med, PLAUSIBLE not confirmed). The duet block ships `attackDamagePct 25.01 durationSec:9999`, justified by "Mint's Sing Along re-extends Performance forever" — but that extension is Encore **Effect 2** (Performance duration); Effect 3 has its own printed 10s window. The neighbouring duet `chargeDamagePct 9999` IS defensible (Charge Damage is a Performance effect); Effect 3 is not, unless Encore re-procs at ≤10s intervals. **Action:** read `data/characters.json → characters.mint.skills`, establish Sing Along's cadence. If ≤10s re-proc, keep 9999 + re-label the reason; if on Mint's ~40s burst, encode Effect 3 at `durationSec:10` on the duet Encore trigger. Do NOT pick a duration that preserves the current board reading. _(Mode-gated, untouched by this pass; neither blind examined the duet block.)_

2. **GOTCHA 2 — solo Encore proxy** (med, documented + owner-deliberate). Both cross-family blinds independently ruled the Encore should stay **wholly UNMODELED** (Sing Along is cross-unit-gated, no carrier/schema; "inventing a proxy trigger would over-credit +25.01%"). The shipped solo proxy fires Effect 3 on `fullBurstEnter` and Effect 4 on `burstCast` — splitting one proc across two triggers so benefit outruns price in any two-B2 comp, and firing on Full Bursts Prika sat out. **Action (owner's call):** the converged faithful fix is mode-gating BOTH Encore effects to `duet (w/ Mint)` only, leaving solo Prika with zero Encore. First check the graded roster for any comp running Prika WITHOUT Mint: if every graded Prika comp is duet, the change is board-inert and should just land; if a solo-Prika comp is graded, it is a board-moving recalibration — measure first, and if solo Encore is retained for board reasons, at minimum key Effect 3 and Effect 4 to the SAME trigger so benefit and price stay coupled.

3. **GOTCHA 3 — burst 25-tick recovery stream** (med) — **ENACTED this pass.** Both blinds derived `heal{ticks:25, intervalSec:1}` byte-for-byte; the judge noted nothing about it is measurable (both cadence numbers are printed). Added to the solo + duet burst blocks; **board-inert** (Prika's graded "PA MiKa" comp has no crown-type consumer — board reading unchanged at 0.890). Only the HP **magnitude** (3.04%) remains unmodeled (the heal effect carries no HP amount). P7 pins the cadence.

4. **GOTCHA 4 — "Gains Pierce" flag prose** (low) — **CORRECTED this pass.** The flag previously claimed the gate "rides an untracked partner status"; Performance is in fact Prika's **own** burst's 25s status window (her burst is literally named Performance), directly expressible as `gainPierce durationSec:25` on `burstCast` (NOT top-level `hasPierce:true`). The line stays UNMODELED on a **standing owner hold** (probe-runs 2026-07-14 inconclusive); the hold rests on its real question — does she read as Pierce-tagged **in-game** during Performance. game-mechanics §11 already rules Pierce Damage ▲ applies on the partless boss, so the pending popup would **verify** the encoding rather than enable it. This is the F1 cold hypothesis: Prika carries a `pierceDamagePct` SOURCE (her own S1) but no Pierce tag, so her own 13.09% is damage-inert on her SR fire (verified byte-identical totals with the effect removed). Estimate ~+8% personal SR damage (small — she is a buffer). **Action:** a Prika-focus popup pass confirming the Pierce tag during Performance + the in/out-window SR uplift; if discharged, encode `gainPierce durationSec:25` on `burstCast`.

## Other documented (inert) skips

- S1 Outgoing healing ▲49.92% (self, in Performance) — heal-potency stat; no HP pool at scope.
- S2 Max HP ▲19.98% (self, fullBurstEnter) — defensive HP buff; no `atkOfMaxHpPct` scaler, zero damage movement (both fable and the blind agree).
- S2 Encore Effect 1 (Assigned Part: Singing) — inert part assignment.
- S2 Encore Effect 2 (Performance duration ▲21s) — no primitive extends a named ally status window.

## Fixture note (the S5 blind test's red status)

The S5 blind test ran **8 fail / 4 pass / 5 skip** vs the driver override. The judge **independently
confirmed** (from the fixture + game-mechanics §7, not on the driver's word) that the blind's own
non-vacuity gate failed: `controlComp('prika')` = liter/crown/prika/helm seats crown (B2) **left** of
prika (B2), and leftmost burst-priority means crown wins every B2 cast — Prika never casts Performance,
so every burst-keyed blind assertion is **vacuous**. The driver's fixtures avoid this: the main fixture
(liter/prika/ada) makes Prika the sole B2; the P7 fixture (liter/prika/crown/ada) places Prika **left**
of crown so she wins the cast while crown stays in as the recovery consumer.

## Same-model caveat (judge)

Every cross-family role here is Claude; the convergence on the S1 triad proves **stability, not truth**.
The magnitudes 25.01 / 13.09 / 20 are datamined level-10 reads that no independent instrument in this
packet touched. The board reading (0.890 COLD, n=1) is the real out-of-band check; the F1 Gains Pierce
hold (gotcha 4) is the strongest lever toward warming it.
