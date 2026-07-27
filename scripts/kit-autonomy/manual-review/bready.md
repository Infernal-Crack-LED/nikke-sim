# Manual review — `bready` (Bready)

**Gauntlet verdict:** GO (cross-family corroborated) · **faithfulness 1.0** · **Tier 2**
**Date:** 2026-07-25 · **Driver:** Qwen · **Blind roles:** claude-fable-5 (S2b) / claude-opus-5 (S5/S6/S7)

Water SR Burst-III Attacker (Tetra). A **taste-mode machine**: her skill2 and two of three burst
branches are gated on a mutually-exclusive Taste state entered by _gaining a teammate's_ sustained-
(Lingering) or distributed- (Recommended) damage buff. The engine has **no buff-gain primitive**, so
the taste is a user-selectable `modes` pair; the entry triggers and "Cancels …" lines are UNMODELED
verbatim (out-of-domain), mutual exclusivity enforced structurally by the single selected mode.

## Line inventory (10 lines)

| Line                                                         | Encoding                                                                     | Disposition    |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------- | -------------- |
| S1 entering FB → self ATK ▲70.01%/10s                        | `fullBurstEnter`/self/atkPct, UNCONDITIONAL                                  | FAITHFUL       |
| S1 Lingering Charge Speed ▼20%/50s                           | `charFixes.chargeFrames 72` (unconditional payload); entry trigger UNMODELED | DOCUMENTED_GAP |
| S1 Recommended Charge Speed ▼20%/50s                         | same charFixes payload; entry trigger UNMODELED                              | DOCUMENTED_GAP |
| S2 3-FC (Lingering) → boss Damage Taken ▲10.2%/5s            | `hitCount:3`/enemy/damageTakenPct/mode sustained                             | FAITHFUL       |
| S2 Aftertaste 150.04%/s sustained ×5s                        | dot 150.04/5s/1s/sustained, same 3-hit block                                 | FAITHFUL       |
| S2 FC hit (Recommended) → self Attack Damage ▲60.01%/5s      | shotFired/self/attackDamagePct/mode distributed                              | FAITHFUL       |
| S2 FC hit (Recommended) → 265.07% distributed to all enemies | shotFired/enemy/flatDamage 265.07 distributed                                | FAITHFUL       |
| Burst self Attack Damage ▲60.19%/10s                         | `burstCast`/self/attackDamagePct, UNCONDITIONAL                              | FAITHFUL       |
| Burst Lingering Aftertaste Effect ▲349.8%/10s                | burstCast/self/sustainedDamagePct 349.8/mode sustained                       | DOCUMENTED_GAP |
| Burst Recommended ATK ▲70.09%/10s                            | burstCast/self/atkPct 70.09/mode distributed                                 | FAITHFUL       |

## Cross-family convergence

- **S2b (fable) test-faithfulness review:** converged on all 9 load-bearing lines (magnitudes,
  triggers, targets, scopes, flavors). Flagged the taste-entry as a mode gate (no TriggerDef) and the
  349.8 as an additive-vs-multiplicative ⚑ — both already the driver's position.
- **S5 (opus) blind test:** authored independently. After the gotcha-1 mode reconciliation it passes
  **15/22** (4 honest skips). It independently corroborates the full sustained branch (boss DT 10.2
  team amp, Aftertaste 150.04 DoT 5-tick structure, ~1-per-3 cadence ratio), the burstCast-vs-
  fullBurstEnter trigger split, the mode exclusivity, and the 70.01/70.09 near-collision filter.
- **S6 (opus) blind override:** independently reproduced all 10 lines with identical
  magnitudes/triggers/targets/durations/flavors; chose the same mode-gate substitution and the same
  additive 349.8 reading; its own flag recipe even suggested adding a "noTaste" mode (= the driver's
  former `auto`).
- **S7 (opus) reconciling judge:** **GO, faithfulness 1.0.** Ruled the S5 mechanical REDs are NOT
  faithfulness divergences — they trace to (a) the blind assuming a 2-element taste pair and (b) the
  charge-speed _mechanism_, where the **driver is provably correct** (see below).

## The two charge-speed facts worth knowing

1. **`chargeSpeedPct` cannot slow a unit.** `sim.ts:2559` clamps it to `[0,100]` then computes
   `needed = chargeFrames × (1 − cs/100)`. A ▼20% (−20) buff clamps to 0 ⇒ `needed = chargeFrames`
   (no change). The engine can only _speed up_ via `chargeSpeedPct`; a charge **slowdown** is
   expressible **only** as a longer `chargeFrames`. The driver's `charFixes.chargeFrames 72` is the
   correct (only working) encoding; both blind roles' `chargeSpeedPct −20` buff would be silently
   inert. H2 pins this directionally (72f ⇒ fewer shots than the 60f counterfactual).
2. **The tasteless state is genuinely unrepresentable.** `charFixes` is unconditional, so a no-buff
   team would still pay the charge penalty with no taste lines active. There is deliberately **no**
   tasteless mode (the prior `auto` modeled an impossible tasteless-but-slowed state and contradicted
   the note's stated `sustained` default — S7 gotcha-1; reconciled to `["sustained","distributed"]`).

## Post-verdict fixes applied (S7 gotchas 1 & 3, both no-magnitude, judge-endorsed)

- **gotcha-1:** `modes` reconciled `["auto","sustained","distributed"]` → `["sustained","distributed"]`
  (default sustained = Lingering), matching the note and both blind re-derivations; removed the
  impossible tasteless-but-slowed `auto`. This also resolves gotcha-4 by construction (the default is
  now taste-carrying, so the unconditional charge penalty is correct for the default).
- **gotcha-3 (`discriminationOk:false`):** added the cadence pins — H3 `DT procs === floor(shots/3)`
  (proves `hitCount:3` counts weapon hits only, not dot ticks/rider) and H4 `ticks ∈ (5×(procs−1), 5×procs]`
  (a fresh 5-tick instance per proc). H10 rewritten as a total mutual-exclusivity check.

## Residual ⚑ (measurement-gated, NOT faithfulness errors — owner spot-check cluster)

- **Charge time 72 vs 75** (subtractive 60×1.20 vs divisive 60/0.8) — measure in-taste charge time.
- **349.8 "Aftertaste Effect" additive vs multiplicative** (~41% on tick values: ×5.10 additive vs
  ×7.20 multiplicative in this fixture). Recipe: bready-focus Lingering-team recording; read one
  Aftertaste tick popup just BEFORE her burst and one INSIDE the 10s window; strip FB/crit/core/element
  and compare the ratio. (Encoded additive per the shared Damage-Up bucket; both blind roles converged
  on additive and flagged the same caveat.)
- **DoT stack-vs-refresh / overlap** and the **full cadence tuple** (charge 72 / reload 141 / 22f bolt
  gap) — datamine estimates; ~15–20% shot-count swing.
- **Taste auto-derivation** from team buff types remains a manual mode (backend increment).
- **Same-model residual:** before the mode fix the sustained branch was driver-only; the reconciled
  blind S5 run now independently corroborates it. The 3 residual blind REDs are proven blind artifacts
  (2× engine-impossible charge-speed buff, 1× mode-mismatched `teamOf` counterfactual on the 265.07
  rider — the rider itself is pinned by driver H6: 265.07/shot, crit-eligible/no-core/no-range,
  distributed-gated).

## Artifacts

- Driver test: `scripts/tests/units/bready.test.ts` (25 assertions, mode-aware runner, H2 counterfactual)
- Override: `src/skills/overrides/bready.json`
- Blind: `scripts/kit-autonomy/blind/bready.{test.ts,test-spec.json,override.json}`
- Reviews/results: `scripts/kit-autonomy/reviews/bready.{test-review.json,verify.txt}`,
  `scripts/kit-autonomy/results/bready.json` (binding judge verdict)
- Cross-family packets: `scripts/kit-autonomy/cross-family/bready/`
