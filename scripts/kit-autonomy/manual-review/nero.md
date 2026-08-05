# Manual review — nero (Nero)

**Gauntlet date:** 2026-08-04
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0 (judge kimi-code/k3)
**Tier:** 1 (two-block encoding: burstCast nuke + passive stat; the kit's status gate lives entirely in the unmodeled residual, where it cannot be encoded wrong because it is not encoded)

> Slug disambiguation: `nero` is the base Nero (Tetra SMG/Fire/Defender, Burst II, released
> 2023-07-06, `treasure:false`). No same-name variants exist; lint clean (no AMBIGUOUS).
> FROM-SCRATCH build: no shipped override existed (`simSupported:false` — the unit could not
> sim at all before this gauntlet; `resolveSkills` throws for prose-without-override).

## Kit summary

Nero is a Fire-element SMG Defender on Burst II (20s cd) — a heal-reactive tank. Her kit's
defining mechanic is a chain: allies heal her → **Cat's Repayment** stacks (Damage Taken ▼8.43%,
max 5 stacks, 5s each) → at max stacks her burst grants **Grumpy Cat** (Incoming healing
▲60.08%, 15s) → Grumpy Cat arms a 30%-when-attacked counter (158.05% final ATK) and her
30%-when-attacked boss debuff (Damage Taken ▲8.26%, 5s). Her heal also debuffs the healer's
Damage Taken ▼14.14% for 5s, and she opens battles with a permanent self Max HP ▲60.28%.
In the v1 DPS sim her offensive surface collapses to exactly TWO lines: the burst nuke
(1104.91% final ATK, Burst Skill damage on the highest-remaining-HP enemy) and the Max HP
grant (offensively inert — she has no HP→ATK conversion — but kept for future cross-unit
HP-ranking consumers). Every chain line requires an incoming-attack event, a stack-count gate,
a heal amount, or a healer-target resolution the v1 engine does not model, so all six are
carried verbatim as unmodeled with a recorded activation recipe.

## Line-by-line

| Line                                                                                     | Disposition    | Notes                                                                                                                                                                   |
| ---------------------------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1: recovery → the HEALER: Damage Taken ▼14.14% / 5s                                     | DOCUMENTED_GAP | Defensive mitigation on an ally; boss deals no damage (no HP pool). Also unexpressible: no TargetDef resolves the caster of the heal that fired the trigger            |
| S1: recovery → self: Cat's Repayment stack, Damage Taken ▼8.43% ×5, 5s each              | DOCUMENTED_GAP | Defensive; no stack-count primitive; the chain it feeds is damage-dead in v1 (see burst line 3); carried verbatim, not silently skipped                                |
| S2: 30% when attacked → attacker: Damage Taken ▲8.26% / 5s                               | DOCUMENTED_GAP | The kit's single largest unmodeled OFFENSIVE loss (team-wide boss debuff). No 'attacked' trigger + no chance primitive; boss deals no damage. Record, don't fabricate |
| S2: 30% when attacked in Grumpy Cat → attacker: 158.05% final ATK                        | DOCUMENTED_GAP | Same trigger gap + status gate on the unmodeled stack chain; a shotFired proxy would be flatly wrong ('attacked' ≠ 'attacking')                                        |
| S2: battle start → self: Max HP ▲60.28% continuously                                     | FAITHFUL       | passive self `targetMaxHpPct` → engine maxHpFlat self-grant; pinned at exact 0.6028×static-HP vs an independent block-removed basis, frame 0, no expiry, self-scoped  |
| Burst: highest-remaining-HP enemy: 1104.91% final ATK as Burst Skill damage              | FAITHFUL       | burstCast-keyed (OWN cast), once per cast at ≥5 casts/fight, lands pre-FB so never takes the +50% major; discriminates vs lvl-1 975.31 + removal                      |
| Burst: self: Attract — taunts all enemies 15s                                            | DOCUMENTED_GAP | Taunt/aggro vs a partless boss that never attacks and has no ally-targeting AI: zero in-domain surface (delta-ninja-thief Attract precedent)                          |
| Burst: Cat's Repayment at max stacks → self: Grumpy Cat, Incoming healing ▲60.08% / 15s | DOCUMENTED_GAP | Condition unreachable (stacks unmodeled); effect unobservable (heals are event-only, no incoming-healing stat); only consumer is the unreachable S2 counter            |

Zero silent drops: 2 FAITHFUL blocks, 6 lines carried VERBATIM in `unmodeled` with reasons
and an activation recipe in the override note. The test fixture (liter/nero/helm) deliberately
includes a healer (helm's full-charge pulls) so nero's `recovery` trigger CONDITION genuinely
occurs in-fight — S1 stays silent because no block ships for it, not because the trigger never
fires.

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. Converged on N6
  (burstCast own-cast nuke, pre-FB, no FB major), N5 (passive self own-% Max HP, permanent,
  inert-but-kept for HP-rank consumers), N3/N4 (no 'attacked' primitive — record, don't enact;
  shotFired proxy "flatly wrong"), and FIXTURE VALIDITY (a crown-seated B2 starves nero to zero
  casts — the driver fixture makes her the sole B2 and asserts casts ≥ 5 first). DIVERGED on
  the Cat's Repayment stacks + Grumpy Cat status (reviewer: FIX/load-bearing — model the chain
  with reaching/non-reaching heal fixtures). Driver ruling: UNMODELED, chain damage-dead in v1
  (terminal effect needs the absent attacked trigger; status effect has no carrier; no
  stack-count gate exists — any encoding degenerates into the reviewer's own named
  nearest-wrong unconditional grant; modeling the 5s stack lapse would enact kit-silent
  semantics for zero observables). Adjudicated by S7 in the driver's favor.
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Independently derived the SAME
  unmodeled ruling for all six chain lines (its `gaps` list names the identical missing
  primitives: attacked trigger, chance, taunt, heal amount, healer target). Run vs the driver
  override: **14 pass / 7 fail / 5 skip** — all 7 fails are blind-side artifacts: 2 × fixture
  starvation (blind seated nero behind crown at B2 → 0 casts, exactly the trap S2b pre-warned
  and the driver fixture avoids) and 5 × RECON_ERROR (blind iterated `ov.<slot>.blocks` where
  the real shape is a bare block array; expected `expiresFrame === undefined` where the engine
  emits `null`). Zero REAL-GOTCHA; the negative guards that did run (no leaked damageTakenPct,
  no 158.05% rider, no 60.08% leak) all passed against the driver override.
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. Block structure converged:
  identical burst nuke (burstCast → enemy flatDamage 1104.91; blind adds `noFb:true`,
  behaviorally identical — the cast lands pre-FB either way) and the same passive self Max HP
  line. Two divergences, both adjudicated for the driver by S7: (a) blind used
  `stat:"maxHpPct"`, which the skill-effect path does NOT convert (only the cube/OL-extras path
  does — sim.ts:916), so its buff would be consumed by nothing and nero's live Max HP would
  stay unchanged; the driver's `targetMaxHpPct` is the schema's documented "Max HP ▲ X%"
  carrier and resolves to an observable maxHpFlat self-grant. (b) Blind shipped two value-0
  `damageTakenPct`-on-self placeholder blocks for S1 ("provably inert structure"); the driver
  ships `skill1: []` and carries the lines verbatim in `unmodeled` — a self-targeted boss-debuff
  stat is not the kit's mechanic at ANY value. Its caveat independently calls the 8.26% boss
  debuff "the single largest unmodeled OFFENSIVE loss in this kit".
- **S7 (kimi-code/k3, binding judge):** GO, faithfulness 1.0, `discriminationOk:true`,
  **zero gotchas**. Adjudicated the S2b stack-chain divergence in the driver's favor (both
  blind post-op agents re-derived the identical unmodeled ruling from prose alone) and graded
  all 7 S5 reds as blind-side artifacts.

## Residual flags for owner

1. **⚑2 (TIER 3, engine-capability-gated) — the whole Grumpy-Cat chain.** If the engine ever
   models incoming attacks, the **8.26% boss Damage Taken ▲ proc is the first thing to
   re-open** — every cross-family agent names it the largest unmodeled offensive loss (worth
   roughly a team-wide ×1.08 at realistic uptime). Activation recipe recorded in the override
   note: stack-counted Cat's Repayment (recovery-triggered, maxStacks 5, per-stack 5s lapse) →
   burstCast-gated Grumpy Cat window (15s, stacks===5 at cast) → attacked×30% procs; the proc
   CADENCES (boss attack rate × 30%, taunt-amplified during the 15s Attract window) are
   measured-only from a focused nero recording. N1/N2 remain defensive even then
   (survivability — outside the DPS-sim domain).
2. **⚑1 cadence tuple (mandatory, datamine-unreliable):** SMG rate of fire (datamine 1440 =
   24/s instant) + ammo 120 + reloadFrames 99 shipped as-is. Recipe: rounds/min + reload gap
   from any focused nero video. No odd-fire-mode text tell → not escalated.
3. **No board datapoints:** nero is a tank that has never been recorded — the board read is
   absent before AND after this gauntlet. A recording would exercise the chain lines directly
   (a healer feeding Cat's Repayment is visible in any nero fight).
4. **Greenfield note:** the RED-vs-shipped half of the TDD gate is degenerate (nothing shipped
   — pre-override state is "does not run"); the gate's substance lives in the counterfactual
   half, where every pin is green vs the faithful encoding and the nearest-wrong model provably
   fails it (lvl-1 magnitudes 975.31 / 38.68, removal references).

## Artifacts

- `src/skills/overrides/nero.json` — the shipped encoding (+ `unmodeled` verbatim record)
- `scripts/tests/units/nero.test.ts` — 7 assertions, all green (`scripts/kit-autonomy/reviews/nero.verify.txt`)
- `scripts/kit-autonomy/reviews/nero.test-review.json` — S2b review + driver reconciliation
- `scripts/kit-autonomy/blind/nero.test.ts` / `blind/nero.override.json` — opus blind artifacts
- `scripts/kit-autonomy/cross-family/nero/{s2b,s5,s6,s7}-result.json` — dispatch evidence
- `scripts/kit-autonomy/results/nero.json` (+ `results/nero-judge-packet.md`) — binding verdict
