# helm-aquamarine (Helm: Aquamarine) — kit-autonomy gauntlet manual-review

**Date:** 2026-07-25 · **Driver:** Qwen · **Verdict:** **GO** · **Faithfulness:** **1.0** · **Tier:** 2
**Cross-family:** S2b claude-fable-5 · S5/S6/S7 claude-opus-5 · **Binding judge:** GO / 1.0 / 0 REAL-GOTCHAs / discriminationOk

> **P0 DISAMBIGUATION:** this is `helm-aquamarine` (AR / Iron / Attacker / **Burst II**, aka "shelm"/"ha") — a
> COMPLETELY DIFFERENT unit from base `helm` (SR / Water / Attacker / Burst III, aka "thelm"). Different weapon,
> element, class, burst stage, and kit. No base-helm data/recordings/encoding were cited or reused; every
> magnitude here is read off `characters['helm-aquamarine']`. (Base `helm` appears in the test fixture ONLY as a
> Burst III rotation partner; every assertion filters on `slug === 'helm-aquamarine'`.) The slug-disambiguation
> lint flags the bare slug "helm-aquamarine" (its "helm-" prefix matches the ambiguous base) — a known false
> positive; the full name and approved nicknames pass clean.

## Status

The gauntlet certifies **kit faithfulness**, not a measured tune. This unit remains **MODEL_ONLY / ungraded**
(kit-status `tier: MODEL_ONLY`, `tuned: false`, `graded: 0`, `board: null`). The override's
`PARSER BASELINE (HYPOTHESIS — NOT a validated model)` measurement banner STANDS — remove it only when the unit
is measured/hand-tuned against a real fight.

## Kit (6 lines, levels 10/10/10) — all FAITHFUL

| #   | Slot | Kit line                                                                                                 | Encoding                                                                                                                           | Disposition |
| --- | ---- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| HA1 | S1   | after 30 landed normal attacks → target: 131.34% additional damage                                       | `hitCount:30 → enemy → flatDamage 131.34` (recurring; crit sheet-rate / no-core / noRange / FB-by-timing by engine default)        | FAITHFUL    |
| HA2 | S1   | entering Full Burst → all allies: Burst CD ▼ 1.82 / 2.2 / 2.6 ("each subsequent triggers all before it") | `fullBurstEnter → allies → escalating[burstCdr 1.82, 2.2, 2.6]` (engine `slice(0,activations)` = the cumulative ladder)            | FAITHFUL    |
| HA3 | S2   | 1 random enemy: 105.58% damage (NO activation clause)                                                    | `interval:4 → enemy → flatDamage 105.58` (datamined `skillCooldownsSec.skill2 = 4`, resolved 2026-07-20; first fire t=4, ~44/180s) | FAITHFUL    |
| HA4 | S2   | attacking an Electric Code target → Damage Taken ▲5.64% ×5 / 5s                                          | `shotFired + bossElementGate:'Electric' → enemy → buff damageTakenPct 5.64 / maxStacks 5 / durationSec 5`                          | FAITHFUL    |
| HA5 | BU   | all enemies: 164.83% Burst Skill damage                                                                  | `burstCast → enemy → flatDamage 164.83` (burst-cast FB-exempt; one hit/cast)                                                       | FAITHFUL    |
| HA6 | BU   | attacking an Electric Code target: 164.83% additional damage                                             | `burstCast + bossElementGate:'Electric' → enemy → flatDamage 164.83` (a SECOND hit; inert off-Electric)                            | FAITHFUL    |

`unmodeled` is legitimately empty — every printed line is encoded.

## Scope-lock context (the two Electric lines are inert in the validation basis)

The scope-lock boss is NOT Electric, so HA4 (damageTaken) and HA6 (extra burst hit) are faithfully **inert**
there (Iron is element-advantaged vs Electric — this is an anti-Electric kit). The driver test pins BOTH states:

- **Iron** (inert): no damageTakenPct debuff, `mult.taken` 1.0, `mult.elem` 1.0, **1** burst hit/cast.
- **Electric** (live): stacking damageTakenPct 5.64 (maxStacks 5) → `mult.taken` reaches 1.282, `mult.elem` 1.1, **2** burst hits/cast.

## S2b encoding REVISED during the gauntlet (cross-family driven)

The shipped baseline encoded HA4 as a `bossElement`-trigger permanent `damageTakenPct 28.2` steady-state collapse.
**Both** blind reviewers independently derived the granular stacking encoding — fable (S2b) named
`shotFired + bossElementGate:'Electric' + 5.64/maxStacks5/5s`, and the opus S6 blind override reproduced it
**line-for-line**. The engine supports `maxStacks` (types.ts:195) and `leona` is the precedent for a stacking
5-stack/5s buff. The driver **adopted** the granular encoding: it is the literal reading of "▲5.64%, stacks up to
5 times, lasts 5 sec", and it is sim-identical to the prior collapse to **0.019%** (the only difference is the
faithful ~0.5s stack ramp at fight start, which the old permanent-28.2 slightly over-credited). The driver
override now matches the opus S6 blind override line-for-line on HA4.

## Cross-family convergence

- **S2b (fable):** all 6 lines FAITHFUL, load-bearing set = 6, `unmodeled` empty. Converged with the driver.
- **S5 (opus blind test):** see "Blind-test reconciliation" below.
- **S6 (opus blind override):** 5 of 6 lines line-for-line identical to the driver; the 6th (HA3 cadence) differs
  only in the interval period — driver `interval:4` (datamined) vs blind `interval:10` (honest placeholder ⚑, the
  prose gives no cadence). Same trigger KIND, magnitude, target. Datamined beats placeholder.
- **S7 (opus judge):** BINDING **GO / 1.0**, 0 REAL-GOTCHAs, discriminationOk. The judge independently re-derived
  every line against the formula SSOT and endorsed the reconciliations + the S2b revision below.

## Blind-test reconciliation (the 6 pristine reds are observability failures, not encoding divergences)

Pristine blind test (`blind/helm-aquamarine.test.ts`, uses `controlComp` = liter/crown/helm-aquamarine/helm) vs
the driver override: **16 passed / 6 failed / 2 skipped**. **All blind STRUCTURAL (kit-literal) assertions PASS.**
The 6 reds, with measured root-causes:

1. **2 burst-slot reds** ("unconditional burst hit lands", "Electric rider gated off") — **FIXTURE artifact.**
   `controlComp` seats crown (Burst II) beside this Burst II unit; auto-burst is leftmost-ready, so helm-aquamarine
   never wins the stage-2 cast (measured: deleting her whole burst block moves her total by 0 in that comp). The
   blind's OWN non-vacuity gate pre-declared this exact outcome as a fixture finding. The adapted test's sole-B2
   fixture `[liter / helm-aquamarine / helm]` (she casts 10×/180s) turns both assertions green.
2. **4 S1b behavioral reds** (all `fbCount(committed) > fbCount(CDR-removed/flat/self-only)`) — **INVALID PROXY.**
   The event-silent `burstCdr` was discriminated by Full-Burst COUNT, which is dead in this fixture: the 40s
   Burst III partner gates the rotation and the modest 1.82/4.02/6.62 ladder never crosses a count threshold over
   180s (measured: FB count stays 5 whether the CDR is present, zeroed, flat, or self-only). The adapted test
   preserves the assertion INTENT (CDR is live + escalating + all-ally + keyed to FB entry) via the discrimination
   that DOES bite — **trigger identity**: re-keying `fullBurstEnter → burstCast` doubles the applications
   (measured 10 → 12 of her casts, 5 → 6 FBs, +6.3% total) — plus structural pins on trigger / all-allies target /
   the exact ladder.

**Adapted blind test** (`blind/helm-aquamarine.adapted.test.ts`, `ade-agent-bunny` precedent): **22 passed / 2
skipped (GREEN)**. Two principled corrections (assertion INTENT unchanged): (1) sole-B2 fixture; (2) S1b
trigger-identity discrimination replacing the dead FB-count proxy. The 2 skips are the blind's own honest
measurement-gated flags (HA3 cadence, HA1 noFb).

The strongest evidence the reds are not encoding divergences: the **S6 blind override**, written independently
from prose, reproduces the driver encoding line-for-line on 5/6 lines — including both blocks the reds touch.

## Residual spot-check cluster (owner; non-GO-blocking)

- **HA3 first-fire phase** (t=4 vs t=0, worth ~1 proc): the datamined 4s cadence is grounded, but the exact phase
  is unmeasured. Recipe: time the first 105.58% popup + its interval in a focused solo.
- **HA4 Electric uptime**: untestable under scope-lock (needs an Electric boss); the granular stacking encoding is
  faithful, but the steady-state ~full-uptime assumption is unmeasured vs a real Electric fight.
- **HA2 rotation blast radius** (judge note b): the cumulative burstCdr ladder is a rotation lever with team-wide
  blast radius — "each subsequent triggers all before it" is unambiguous and all three agents read it identically,
  but a **/sim-battery diff should precede any board-level claim** (never sim-vs-sim self-grade).
- **Explicit crit/noFb** (judge note a): the driver omits the explicit `crit:true` / `noFb:true` the blind wrote
  out — these are engine defaults for function damage and burst-cast damage (and the driver test verifies the
  noFb behavior directly via `fbMajorApplied === false`), but a future engine default flip would silently change
  this unit; adding them explicitly would be cheap insurance.
- **Cadence tuple** (⚑): AR fire rate / reload timing are datamined defaults, not yet measured from video.

## Artifacts

- Driver test: `scripts/tests/units/helm-aquamarine.test.ts` (24 assertions, GREEN)
- Override: `src/skills/overrides/helm-aquamarine.json`
- Results: `scripts/kit-autonomy/results/helm-aquamarine.json` (judge verdict) + `…-judge-packet.md`
- Cross-family: `scripts/kit-autonomy/cross-family/helm-aquamarine/` (s2b/s5/s6/s7 packets + results)
- Blind: `scripts/kit-autonomy/blind/helm-aquamarine.{test.ts,adapted.test.ts,override.json,test-spec.json,audit.json}`
- Review: `scripts/kit-autonomy/reviews/helm-aquamarine.{test-review.json,verify.txt}`
