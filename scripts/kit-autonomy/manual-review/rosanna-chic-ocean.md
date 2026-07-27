# Manual review — `rosanna-chic-ocean` (Rosanna: Chic Ocean)

**Verdict:** GO (cross-family corroborated) · **faithfulness 1.0** · **Tier 2** · gauntlet 2026-07-25
AR / Supporter / Wind / Burst II (cd 20s). The AR/Wind variant — a DIFFERENT unit from the MG/Electric
base (slug `rosanna`); never conflate (P0). Cross-family: S2b `claude-fable-5`, S5/S6/S7 `claude-opus-5`.

## What she is

A parts-support buffer whose kit is built for bosses with destructible parts. Against the partless
scope-lock boss, **both** Damage-to-Parts buffs and the part-destroy ATK stacks are structurally
INERT, so almost all of her real kit value is invisible here and she correctly looks weak — faithful,
not a defect. Her ONLY personal damage is the Skill-2 sustained DoT; her burst is pure amplification
(Sustained Damage ▲ to allies + Damage Taken ▲ on the boss) that feeds her own DoT and the team.

## The three load-bearing (damage-moving) lines — all FAITHFUL, all proven LIVE

| Line                                                          | Encoding                                                                                           | Why it discriminates                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S2 — 70.4% of FINAL ATK sustained /1s for 15s (nearest enemy) | `interval{sec:30}` → enemy → `dot{atkPct:70.4, durationSec:15, intervalSec:1, flavor:'sustained'}` | the ⚑2 cadence resolution: 5 windows [31-45]…[151-165] = 75 ticks at 1 tick/sec. RED under the REPLACED invented passive-continuous dur999 encoding (179 ticks from t=1) and under a sub-15s-CD overlap trap (~2 ticks/sec); lvl-9 67.2 moves atkPct                                             |
| Burst — Sustained Damage ▲20.32% for 10s (all allies)         | `burstCast` → allies → `sustainedDamagePct 20.32, durationSec 10`                                  | flavor-gated DamageUp: lifts her sustained DoT (in-window dmgUp 1.2032) but NEVER her 1648 AR normals (dmgUp exactly 1.0) — kills the `attackDamagePct` misread. Trigger identity pinned by cast-frame timing (9 cast frames, each < the FB-start frame), not fullBurstEnter (5 FB-start frames) |
| Burst — Damage Taken ▲32.23% for 10s (all enemies)            | `burstCast` → enemy → `damageTakenPct 32.23, durationSec 10`                                       | boss-held Taken-bucket debuff (casterIdx AND targetIdx null — filter by stat+value, not indices); in-window DoT ticks carry mult.taken 1.3223; removing it drops EVERY ally's total (team-wide, not self)                                                                                        |

`flavor:'sustained'` is load-bearing — it is the sole reason her burst amplifies anything (the
DamageUp flavor gate, `docs/data/damage-calculation.md` §1e). DoT crit is the engine default (ON
since 2026-07-21); neither override sets a crit field, so the S6 blind's "DOT_CRIT default-OFF" claim
is a recon error that changes nothing here.

## Inert parts lines (asserted, not assumed)

Both "Damage to Parts ▲24.26% for 15s" lines (S1 battle-start, S2 on the 30s CD) are `partsDamagePct`,
a DamageUp-bucket term that is damage-inert on the partless boss. They are kept as **two DISTINCT
blocks** (S1 one-shot at frame 0 — exactly 3 applies; S2 recurring at t=30/60/90/120/150) and the test
ASSERTS inertness byte-identically (`noParts.totals === base.totals` for every unit) rather than
assuming it.

## Documented gap (genuinely skippable in this basis)

S1 "ATK ▲3% of the skill user's ATK, ×5, 30s" on part-destroy → `unmodeled.skill1` VERBATIM. The
trigger "destroys an enemy's part" has no TriggerDef primitive AND cannot fire on a partless boss, so
any proxy trigger would over-credit the whole team. The test proves it is NOT proxied (no
`casterAtkPct`/`atkPct`/`highestAllyAtkPct` buff originates from her index). ⚑3 out-of-domain: the
stat is `casterAtkPct` (flat 3% of HER ATK, not `atkPct`) ×5 = up to +15% to ALL allies — a BIG hidden
lever on parts bosses; recipe in the override note (needs a part-destroy trigger primitive).

## The one substantive cross-family divergence — resolved in the driver's favour

Both blind roles (S5 test, S6 override), working from the prose ALONE with the datamine withheld,
assumed **continuous/self-tiling** DoT maintenance (S5: 100–200 ticks; S6: `interval sec:15` ⇒ ~180
ticks). The driver ships `interval sec:30` ⇒ 75 ticks (5×15s windows, 42% uptime) on the **datamined
`skillCooldownsSec.skill2 = 30`** plus the owner's 2026-07-20 internal-cooldown ruling (skill2 has NO
activation clause → the datamined CD is the re-activation CD; first fire t=CD, no force-cast clause).
Critically, the S6 blind writer flagged this exact field as "the dominant magnitude lever on her whole
output" and wrote the recipe "read the datamined skillCooldownsSec and set sec to it" — which resolves
to the driver's 30. So the divergence is a **converged flag, not a contradiction**.

## S5 blind suite vs driver override (the judge traced all 15, did not accept driver triage)

7 passed / 7 failed / 1 skipped. The judge verified the failure arithmetic and classified:

- **5 = blind fixture degeneracy.** The blind test uses `controlComp(slug, true)` = liter/crown/slug/helm;
  crown (B2) monopolizes all 10 stage-2 casts, rosanna casts 0, so her burst buffs never apply. The blind
  writer's OWN non-vacuity canary states a RED there "indicts the fixture, not the model." Re-running those
  assertions in a fixture where she owns B2 (liter/rosanna/ada, 9 casts) flips all 5 GREEN.
- **1 = blind assertion wrong on engine grounds** (byte-identical teammate totals on DoT deletion — but DoT
  ticks feed the burst gauge, SSOT §6, so deleting 75 ticks must perturb the rotation).
- **1 = the cadence divergence above** (resolves driver-favour on denied ground truth).
  The 7 that PASSED include the substantive checks: parts inert under 400× boost, both parts lines encoded,
  part-destroy NOT proxied, damageTakenPct boss-held null/null, sustainedDamagePct sustained-scoped.

## Open residuals (pre-flagged, measurement-gated; none block GO)

1. **S2 first-fire PHASE (med — the only flag touching damage).** t=CD (t=30, driver) vs t=0 is one full
   15-tick window ≈ 20% of her DoT output. The owner ruling sets t=CD (no force-cast clause); only a
   popup-cadence read (timestamp of the first sustained popup vs the 03:00→02:59 frame) pins it empirically.
   **Recipe:** footage — time the first 70.4% sustained popup onset. Do not adjust any magnitude to compensate.
2. **`sustained` flavor tag (low, same-model).** S2b came from fable, but S5/S6/judge are all opus, so their
   agreement on the flavor tag proves stability not correctness. The tag is load-bearing (sole reason her
   burst amplifies anything) — worth one owner glance that the DoT really is sustained-flavored in game.

## Cross-family convergence

- **S2b (fable)** corroborated all 5 modeled lines FAITHFUL + the part-destroy GAP→unmodeled (independently
  naming the stat `casterAtkPct`, not `atkPct`); pre-registered burstCast-vs-fullBurstEnter as the #1
  damage-at-stake misread and recommended the three discriminators the driver adopted.
- **S5 (opus)** blind test independently derived the same lines + inert determination; its 7 failures are all
  fixture/assumption/cadence (above), none a driver gotcha.
- **S6 (opus)** blind override converged structurally on EVERY line (all stats/values/targets/durations/
  triggers/flavors, burstCast identity, part-destroy unmodeled as casterAtkPct). Only diff: skill2 interval
  CD 15 (blind convention, datamine withheld) vs 30 (driver, datamined + owner ruling) — self-flagged with a
  recipe resolving to 30.
- **S7 (opus, binding judge)** → **GO, faithfulness 1.0**, discriminationOk, no REAL-GOTCHA; 8 counterfactuals
  RED; every FAITHFUL block shown to FIRE at its prose cadence (nothing modeled-but-inactive).

## Blast radius

Her low output on this board is faithful: both Damage-to-Parts lines and the part-destroy stacks are
structurally inert against a partless boss (asserted byte-identically). The only damage-moving residuals
are the first-fire phase (≈20% of her personal DoT, itself a small share of a support's contribution) and
the sustained flavor tag (owner glance). No board row (MODEL_ONLY, never fielded) — board unchanged.
