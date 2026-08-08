# Manual review — mica (Mica)

**Gauntlet date:** 2026-08-05
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (scoped top-2-final-ATK buff pool + flat-round weapon-state modifier, burstCast-vs-fullBurstEnter identity on a sole-B1 nuke, interval duty cycle, two out-of-domain ⚑ clusters)

> Slug disambiguation: `mica` is the BASE unit (Mica, RL/Wind/Supporter/Burst I, cd 20s,
> ammo 6, SR rarity, released 2022-11-04). The variant `mica-snow-buddy` (SMG/Iron, aka
> "msb") is a DIFFERENT unit. lint-slug-disambiguation flags every bare "Mica"/"mica"
> token for this pair — including the slug itself, so NO text form passes clean (the base
> unit has no approved nickname); the confirmation is recorded here and in the test /
> override headers per the mary precedent — this run is about the RL/Wind supporter only.

## Kit summary

Mica is a Wind RL Supporter holding the Burst I slot. Her kit is mostly out-of-domain for
a damage sim: Skill 1 ("Wonderous Star") is a self DEF buff gated on being ATTACKED 20
times — the v1 sim models no incoming damage and has no attacked-count trigger, so the
line can never fire (and self DEF moves no damage even if it could). Her one live channel
is Skill 2 ("Brave Star", 20s cooldown, no activation clause → interval:20): every 20s
the 2 allies with the highest FINAL ATK get +2 rounds of magazine capacity (maxAmmoFlat —
a real weapon-state lever: fewer reloads, more firing uptime) and an inert DEF buff, each
for 10s (50% duty cycle). Her Burst ("Sparkling Star") deals 152.22% of her final ATK to
all enemies on her OWN cast (FB-exempt by timing), plus an enemy DEF ▼13.32% debuff that
is honestly UNMODELED — the engine has no debuff-scalable boss-DEF channel. She is an SR
rarity unit, so the spec runs her on the {stars:3, core:0} ceiling.

## Line-by-line

| Line | Disposition | Notes |
| ---- | ----------- | ----- |
| S1 "Wonderous Star": attacked 20× → self DEF ▲39.18% for 10s | DOCUMENTED_GAP | The trigger is a counter of hits RECEIVED — the sim models no incoming damage, has no attacked-count trigger primitive, and the boss never acts, so the counter never accrues. Effect side (self defPct) would be damage-inert even if fireable. admi carries the identical "attacked 20 time(s)" archetype; jackal/maiden/noise/yulha the family — all UNMODELED + ⚑ (binding precedent). Pinned by ABSENCE (zero defPct 39.18 applications) against the hitCount:20 "attacks"-misread counterfactual, which applies the buff — the shipped zero is a choice. Both sentences verbatim in `unmodeled.skill1` |
| S2 "Brave Star" trigger: no activation clause, datamined 20s CD | FAITHFUL | `interval:20` (the CD-driven skill2 convention — poli/himeno precedent): first fire at t=20s, period exactly 1200 frames, ≥8 firings / 180s (pinned). The CD is datamined (`skillCooldownsSec.skill2 = 20`); first-fire phase is the engine-native convention (⚑3) |
| S2 scope: 2 allies with the highest FINAL ATK | FAITHFUL | `alliesTopAtk{count:2, byFinalAtk:true}`, NO excludeSelf — the kit carries no "(except the skill user)" clause (quency's identical wording carries the identical encoding; mast-style exclusion would say so). Pool includes the caster, but base ATK 450 keeps mica out of the top-2 on the fixture basis (holders ada+helm at 600 — pinned per firing; all-allies → 4 holders and lowest-2 → {mica, admi} counterfactuals both diverge) |
| S2 line: Max Ammunition Capacity ▲2 round(s) for 10s | FAITHFUL (LOAD-BEARING) | Theme-14 flat-round primitive: `maxAmmoFlat 2 / durationSec 10` — "▲ 2 round(s)" is a MAGNITUDE in flat rounds, not a durationShots window and not a percent. `maxAmmo() = round(base×(1+pct/100)) + flat`, so the nearest-wrong `maxAmmoPct 2` computes round(6×1.02) = 6 and never extends a magazine (pinned RED). Functional pins: in-window refills load exactly 6+2 rounds (first shot leaves ammoAfter 7, 8-round magazines) for BOTH holders, and the holders' totals rise vs S2-removed (weapon-state modifier = damage, hard rule 1 / prior 9) |
| S2 line: DEF ▲19.89% for 10s | FAITHFUL (inert) | `defPct 19.89 / durationSec 10` on the same block/targets (one ■ header, one block, two effects — co-fires on identical frames, pinned). defPct is declared inert in v1 → pinned damage-neutral BOTH directions: removal of ONLY this effect leaves every unit byte-identical; an atkPct misread moves totals |
| Burst line 1: 152.22% of final ATK as Burst Skill damage to all enemies | FAITHFUL | ONE `burstCast` → `enemy` → `flatDamage atkPct 152.22` block ("all enemies" collapses to the single partless boss). HER OWN cast, never fullBurstEnter: as the sole B1 in the fixture both keyings fire equal COUNTS, so the discrimination is TIMING — nukes land on her cast frames with `fbMajorApplied === false` (the cast precedes the FB window; the fullBurstEnter counterfactual lands inside the window, takes the +50% major, off the cast frames, and changes totals). Lvl-1 magnitude 66.6 pinned RED. Burst bucket, crit-eligible by flatDamage convention |
| Burst line 2: DEF ▼13.32% for 5s on all enemies | DOCUMENTED_GAP | No engine channel: the enemy-buff channel admits ONLY damageTakenPct/distributedDamagePct and bossDef is a flat constant no debuff scales — sim.ts drops enemy ATK▼/DEF▼ at dispatch ("other enemy debuffs don't affect our damage with DEF=0"). himeno/eunhwa shipped same-family lines the same way this batch. The nearest-wrong — laundering into damageTakenPct — is pinned RED (it emits boss debuffs and lifts team totals; the shipped model does neither). Verbatim in `unmodeled.burst`. Comps read COLD by exactly that small team-wide lift (⚑2) |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. Converged on
  every encodable line — the S1 UNMODELED ruling with the identical hitCount:20
  nearest-wrong, the interval-at-skill-CD trigger, the maxAmmoFlat flat-round parse
  ("'2 round(s)' is the AMOUNT, 'for 10 sec' the duration — NOT durationShots"), the
  alliesTopAtk{2, byFinalAtk} no-excludeSelf targeting, the inert defPct pin, and the
  burstCast FB-exempt nuke. One conditional divergence: S2b dispositioned the burst DEF▼
  FAITHFUL *with an explicit escape clause* — "if the engine's DEF term turns out not to
  consume an enemy defPct debuff, that is a GAP the driver must declare, not a silent
  skip". The condition verified FALSE against sim.ts, so the declared GAP is exactly what
  the review prescribed. Its fixture-validity note (keep mica the sole B1; controlComp's
  liter would contest the stage-I slot) was adopted in the driver fixture.
- **S5 (claude-opus-5, blind tests):** `leakDetected:null`. Adapted copy (two structural
  fixes documented in its header: harness import path; the ammo LOAD-BEARING net-sign
  assertion → movement + one-sided lift, fixture-dynamics rationale inline) runs
  **17 tests — 15 passed / 2 skipped / 0 failed** against the driver override. The 2 skips
  are the blind author's OWN documented gaps (skill1 attacked-20× — no damage-taken
  trigger primitive; burst DEF▼ — no enemy-DEF channel, "damageTakenPct is NOT a
  substitute") — the same lines the driver holds UNMODELED. The single adapted assertion:
  in the blind author's CTRL comp the ammo recipients are {helm, liter}; the extension
  lifts liter +1.01M but re-phases the shared Full Burst chain (burst-gauge accrual
  shift), costing helm −1.06M — net −0.008% across the two recipients. The grant is live
  and MOVES recipient damage; the net-sum sign is a fixture-dynamics coincidence (clean
  all-positive form pinned in driver spec M4).
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. Behaviorally IDENTICAL on
  every line — skill1 [] (attacked-20× sentence verbatim-unmodeled); skill2 ONE block
  interval:20 → alliesTopAtk{count:2, byFinalAtk:true} → maxAmmoFlat 2 + defPct 19.89,
  both durationSec 10; burst burstCast → enemy → flatDamage 152.22; burst DEF▼
  verbatim-unmodeled with the laundering explicitly rejected ("a DEF reduction is a
  subtraction inside the formula, not a fixed damageTakenPct percentage — any proxy value
  would be fabricated"). Cosmetic/provenance differences only: the unmodeled lines drop
  the leading ■ marker; the blind override flags `interval:sec 20` as INVENTED/estimate
  (the de-contaminated packet carried no skillCooldownsSec; the driver sources the same
  20 from the datamine — better provenance, same number); the blind cadence-tuple ⚑ was
  RETIRED for driver purposes by owner ruling 2026-07-25.
- **S7 (kimi-code/k3, binding judge):** verdict **GO**, faithfulness **1.0**,
  `gotchas: []`, `discriminationOk: true`, S5-vs-driver convergence GREEN with zero red
  assertions. All five lines classified FAITHFUL or DOCUMENTED_GAP with three-way
  convergence; the adapted S5 assertion ruled "a fixture-dynamics accommodation, not a
  divergence". Ranked residuals for the owner: (1) the burst DEF▼ gap — comps read cold by
  a small team-wide lift (at boss DEF ≈140, ~13.32% cut at ~25% uptime; negligible per the
  SSOT's ≤0.12% DEF-materiality note, but real); (2) the S2 interval cadence is
  datamine-sourced, not footage-pinned (first-fire phase t=20s is an engine-native
  convention); (3) byFinalAtk live re-ranking is unexercised in the driver fixture
  (ranking held static-shaped) — spot-check in ATK-buff comps.

## Residual flags

- ⚑1 (OUT-OF-DOMAIN, incoming-damage subsystem — tier 2): the entire S1 attacked-20×
  sentence. estimate = zero damage impact at scope lock (the trigger never fires; the
  effect is self DEF — inert in any case). recipe = an attacked-count trigger primitive
  (engine-core) + a focus video reading hit-accrual cadence (boss-targeting dependent).
- ⚑2 (OUT-OF-DOMAIN, no enemy-DEF channel — tier 2): the burst DEF▼13.32%/5s. estimate =
  zero damage impact under ANY encoding on the constant-bossDef basis; in game at boss
  DEF ≈140 a 13.32% cut at ~25% uptime is a small team-wide lift — comps read COLD by
  exactly that amount. recipe = a debuff-scalable boss-DEF channel (engine-core); NEVER
  launder into damageTakenPct (pinned RED).
- ⚑3 (interval phase): S2 first-fire at t=20s is the engine-native interval convention;
  pin from footage if an S2-consumer cadence is ever popup-read. tier = engine-native
  default.
