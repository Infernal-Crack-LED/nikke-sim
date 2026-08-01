# Manual review — noise (Noise)

**Gauntlet date:** 2026-07-31
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (scoped buffs — self vs all-allies Max HP; `burstCast`-keyed heal cadence; the inert-vs-damage encoding discrimination; meta-defining recovery-consumer synergy)

> Slug disambiguation: `noise` is the Tetra RL/Electric Supporter (Burst I, cd 40s, datamine
> `resource_id 430`). lint-slug-disambiguation passed clean (no AMBIGUOUS). She had NO prior override
> — she could not sim at all before this gauntlet.

## Kit summary

Noise is an Electric rocket-launcher Supporter (Burst I) whose entire kit is team survivability, not
damage. When she is hit 20 times, all allies take 10.66% less damage for 20s. Each full-charge rocket
taunts the enemy it hits for 2s and grants Noise herself a brief 1.8s Max HP boost (+24.86%). Her Burst
I gives the whole team a heal-over-time — 2.47% of her own final Max HP restored every second for 10s —
plus a 10s team Max HP increase (+49.5%) scaled to each ally's own HP. She carries NO ATK / crit / core /
element / charge-damage / gauge line, so on the damage-only scope-lock board she contributes nothing
beyond her bare RL weapon damage; her real value is mitigation, aggro control, and feeding teammates
that react to recovery (Crown-type "when recovery takes effect" consumers). The sim models the lines the
engine has a primitive for (the heal's per-second recovery cadence + both Max-HP grants as kit-SSOT
`maxHpFlat` events) and documents the primitive-less lines (Damage-Taken ▼, taunt) as ⚑ gaps.

## Line-by-line

| Line                                                           | Disposition      | Notes                                                                                                                                                                                    |
| -------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1: attacked 20× → allies Damage Taken ▼10.66%/20s             | DOCUMENTED_GAP   | No incoming-damage model / no ally HP pool; the only `damageTakenPct` is the boss-side Taken bucket (wrong direction) — NOT used (sign-flip trap)                                        |
| S2: full-charge HIT → target Taunt 2s                          | DOCUMENTED_GAP   | No aggro primitive; single-target fixed boss script — mechanically inert                                                                                                                 |
| S2: attacking with Full Charge → self Max HP ▲24.86%/1.8s      | FAITHFUL (inert) | `chargeCounter:1` (every RL rocket is `charged=true`) → self `targetMaxHpPct`→`maxHpFlat`; inert (no atkOfMaxHpPct); N1 pins per-shot/1.8s/self + atkPct counterfactual moves her damage |
| Burst: burstCast → allies recover 2.47% caster Max HP/1s × 10s | FAITHFUL         | `heal{ticks:10, intervalSec:1}` — recovery CADENCE modeled (drives Crown consumer), HP magnitude not (no HP pool); N2 pins 10-tick window vs ticks:1 collapse                            |
| Burst: burstCast → allies Max HP ▲49.5%/10s                    | FAITHFUL (inert) | `targetMaxHpPct`→per-target `maxHpFlat` (49.5% of EACH ally's own HP); inert (e3 rule: ally-granted Max HP feeds no conversion); N3 pins all-3-allies/target-scaled/10s + 27.22 smaller  |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. Independently derived the
  identical 5-line disposition — S1 Damage-Taken UNMODELED (explicitly naming the sign-flip trap:
  encoding it as the boss `damageTakenPct` debuff would gift a phantom team damage bucket), S2 taunt
  UNMODELED, S2-b self Max HP FAITHFUL-inert, burst heal `ticks:10`/`burstCast` FAITHFUL (the unit's ONLY
  damage-relevant channel, via recovery consumers), burst Max HP 49.5 `targetMaxHpPct` FAITHFUL-inert.
  CONVERGED on all 5 lines. Only nuance: reviewer suggested `shotFired` for S2-b vs driver `chargeCounter:1`
  — equivalent for an always-full-charging RL; `chargeCounter` is the more semantically precise
  "attacking with Full Charge" primitive (driver kept).
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Independently wrote a counterfactual-diff spec
  from the prose. Run vs the DRIVER override (via `blind/noise.adapted.test.ts`): **9 passed / 3 skipped**
  (12 total). The 3 skips are the blind test's OWN documented GAPs (`it.skip`): S1 was-attacked trigger,
  S2a taunt, heal amount 2.47%. EVERY substantive discrimination is GREEN vs the driver override — S1
  defensive/no-damage; S2b self-scoped/per-full-charge/1.8s; burst Max HP all-allies/target-scaled; burst
  heal 10-tick HoT feeds Crown; cross-cutting Max-HP inertness (10× values move nothing). Adapted only to
  (a) re-point the harness import and (b) drop emptied blocks in one counterfactual that otherwise crashed
  the engine's `chargeCounter` dispatch (the driver's S2 block carries ONLY the HP grant) — no assertion changed.
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. Functionally near-identical to the driver:
  burst `heal{ticks:10,intervalSec:1}` + `targetMaxHpPct 49.5/10s` (IDENTICAL); S2 self `targetMaxHpPct
24.86/1.8s` (`shotFired` vs driver `chargeCounter:1` — equivalent for RL); taunt UNMODELED; sign-flip
  trap avoided; Max-HP grants flagged inert (e3 rule). ONE divergence: S6 encoded S1 as an inert
  `defPct:0` placeholder block on a mis-keyed `hitCount:20` OUTGOING-hit proxy (an "auditable placeholder"),
  where the driver left S1 fully UNMODELED. Both avoid the sign-flip trap and move zero damage.
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, discriminationOk:true, gotchas:[].**
  `convergence.s5TestsVsDriverOverride: GREEN`. All five lines accounted (3 FAITHFUL + 2 DOCUMENTED_GAP),
  zero silent drops. The judge ruled the lone S6 divergence in the DRIVER's favor: "a clean documented
  UNMODELED is the MORE faithful of the two … a placeholder that fires on the wrong event is an invented
  behavior, while a verbatim unmodeled line + recipe is the sanctioned gap shape." Discrimination confirmed
  on every load-bearing axis (S2b self/per-shot/1.8s; burst Max HP target-scaled; heal ticks:10 vs ticks:1
  under Crown-self-heal isolation; atkPct counterfactual proves the Max-HP grants are inert, not smuggled damage).

## Residual flags for owner

1. **⚑ S1 Damage-Taken ▼ + S2 Taunt — engine-core / out-of-domain (MEASUREMENT-IRRELEVANT to DPS).** Both
   are survivability/aggro lines the no-incoming-damage v1 sim cannot represent. S1 needs an ally HP pool +
   incoming-boss-damage model + a received-damage stat distinct from the boss-facing `damageTakenPct`; the
   taunt needs a multi-target/aggro model. Both are documented verbatim in `unmodeled` with ⚑ recipes. They
   move no board damage; the sim under-represents Noise's REAL team value (mitigation + aggro) until an HP
   pool exists — same precedent as flora's HP-gated S2 and liter's cover-HP NO-OP.
2. **⚑ heal first-tick phase (engine convention, not footage).** The burst HoT emits its first recovery
   event immediately, then 9 more at 1s intervals (~10 events spanning ~9s per cast). This is the engine's
   heal-over-time convention, not footage-verified for Noise. Board-irrelevant under scope lock (it only
   shifts a recovery consumer's first refresh by ~1s); pin from a Noise focus video if a recovery-counting
   consumer ever depends on it.
3. **⚑ heal MAGNITUDE (2.47% of caster final Max HP/tick) unmodeled by design.** The `heal` effect models
   no HP quantity (no HP pool) — only the per-second recovery EVENT cadence, which is what recovery consumers
   key off. Documented, board-irrelevant.
4. **S2-b trigger read (chargeCounter:1 == shotFired for RL).** "Attacking with Full Charge" is encoded as
   `chargeCounter:1`; for an always-full-charging RL every rocket is `charged=true`, so this fires once per
   shot (equivalent to `shotFired`, which the S6 blind independently chose). If Noise ever fires uncharged
   (tap-fire), `chargeCounter` correctly under-fires relative to `shotFired` — the more faithful reading.
5. **Cadence tuple unverified.** RL fire cadence (chargeFrames 60 / reloadFrames 141 / ammo 6) is datamine;
   rate_of_fire/reloadFrames are known-unreliable fields. Noise's bare-weapon DPS inherits the standard RL
   cadence ⚑; irrelevant to her kit lines (all inert) but affects her baseline weapon damage.
