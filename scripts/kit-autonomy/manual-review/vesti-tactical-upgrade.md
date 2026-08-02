# Manual review — vesti-tactical-upgrade (Vesti: Tactical Upgrade)

**Gauntlet date:** 2026-08-01
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (round-count `durationShots` windows; `requiresTargetStatus` named-status gate; `burstCast`-vs-rider timing; true-flavor scoping; a self-status line with no engine primitive)

> Slug disambiguation: `vesti-tactical-upgrade` IS Vesti: Tactical Upgrade (data name "Vesti: Tactical
> Upgrade", RL/Fire/Attacker/Burst III, cd 40s, ammo 8, reloadFrames 142, chargeFrames 120,
> chargeMultiplier 200, normalMult 22.44 / coreMult 200, critRate 15 / critDamage 150). Variant of base
> `vesti` (RL/Water) — always referred to by full slug / approved nicknames vtu/vestitu, never the bare
> base name. Lint clean for the full slug (the lint flags the bare substring "Vesti" by design).

## Kit summary

Vesti: Tactical Upgrade is a Fire rocket-launcher carry on Burst III whose damage is built around a
full-charge cadence. Skill 1 ("Missile Guide"): when she performs a full charge while not already in
Missile Guide, she grants herself +100% Charge Speed and +58.5% Charge Damage for 3 rounds; reloading to
max ammunition strips Missile Guide. Skill 2 ("Monster Stage"): every full charge she lands deals an extra
266.6% of her final ATK as true damage to the target; two further conditional self-buffs ride the same
trigger — +20% ATK while she is in "Battle Formation" status, and +20% Projectile Explosion Damage while
the target carries "Explosive Round" status — neither of which her own kit can supply. Her burst ("Missile
Container Online") doubles her explosion radius and grants herself +60% True Damage for 10s, then hits all
enemies for 492.3% of final ATK as Burst Skill true damage. In practice: a slow charged-rocket cadence sped
up by Missile Guide, true-damage riders on every shot, and a true-damage nuke per rotation, with the +60%
True Damage window amplifying both the riders and the nuke (true flavor couples them in the Damage-Up
bucket).

## Line-by-line

| Line                                                                   | Disposition    | Notes                                                                                                                                                                                                                                                        |
| ---------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S1: full charge (not in MG) → self chargeSpeedPct 100, 3 rounds        | FAITHFUL       | `shotFired` → self, `durationShots:3` + `removeOnReload:true`; RL shots are always full charges (`isCharge = RL && !swap`) so `shotFired` == "landing Full Charge attacks". V1 PINs value 100 / durationShots 3 / no timed expiry / reload-strip; ⚑1 + ⚑5    |
| S1: Charge Damage ▲58.5% for 3 rounds                                  | FAITHFUL       | `chargeDamagePct 58.5` (additive ppt in the charge bucket, NOT `chargeDamageMultPct`); `durationShots:3` + `removeOnReload`. V2 PINs the max-level 58.5 (not level-1 34.56) + round-count + reload-strip                                                     |
| S1: reload to max → Removes Missile Guide                              | FAITHFUL       | `removeOnReload:true` on both S1 buffs; engine emits `buffRemove` cause `reload` (cinderella precedent). V1/V2 PIN the reload-removal; no-removeOnReload counterfactual emits none                                                                           |
| S2: every full charge → target 266.6% final ATK as TRUE damage         | FAITHFUL       | `shotFired` → enemy `flatDamage 266.6 flavor 'true'`; crit-eligible (flatDamage default; true damage can crit), noRange rider, fires once per landed shot. V3 PINs magnitude + cadence (count == shots) + true-flavor coupling to the burst buff             |
| S2: if self in Battle Formation → self ATK ▲20% / 3s                   | DOCUMENTED_GAP | UNMODELED verbatim — "Battle Formation" is a self-status granted nowhere in the kit and the schema has no self-status gate; blind consensus (S2b fable + S5/S6 opus) all derived inert. Driver's `fbGate:'inFb'` (== Full Burst) retained as ⚑6 alternative  |
| S2: if target in Explosive Round → self Projectile Explosion ▲20% / 3s | FAITHFUL       | `shotFired` + `requiresTargetStatus "Explosive Round"` → self `projectileExplosionPct 20 / 3s`; inert (no in-scope unit opens the named status — ETU models hers as a damageTaken rider). V5 PINs zero applications + gate-dropped counterfactual fires (⚑2) |
| Burst: self True Damage ▲60% / 10s                                     | FAITHFUL       | `burstCast` → self `trueDamagePct 60 / 10s` (NOT `fullBurstEnter`); pays off only on true-flavored hits (riders + nuke). V6 PINs value 60 / 10s / self / once per cast; count == burstCast count, not FB count                                               |
| Burst: all enemies 492.3% final ATK as Burst Skill true damage         | FAITHFUL       | `burstCast` → enemy `flatDamage 492.3 flavor 'true'`; burst bucket, noFb (lands before the FB window, never +50%); lands UNDER its own same-cast +60% (additive in Damage-Up: dmgUp 1.962 vs 1.362). V7 PINs magnitude / bucket / no FB major                |
| Burst: Explosion Radius ▲100% / 10s                                    | DOCUMENTED_GAP | UNMODELED verbatim — inert vs the single partless scope-lock boss; no explosion-radius stat exists. V8 PINs the verbatim record + absence of any explosion-radius block                                                                                      |

## Cross-family corroboration

- **S2b (claude-fable-5, adversarial test-faithfulness review):** `leakDetected:null`. Independently
  re-derived all 9 kit lines and CONVERGED FAITHFUL on the 7 modeled lines (Charge Speed/Damage
  `durationShots:3` + `removeOnReload`, 266.6% true rider + true-flavor coupling, Explosive Round gate
  inertness, True Damage 60 on `burstCast` not `fullBurstEnter`, 492.3% pre-FB nuke, Explosion Radius
  unmodeled). Two reconciliation points the driver adopted: (1) the reviewer's "Missile Guide duty-cycle"
  correction — the driver's original "no damage impact" caveat for the missing re-trigger gate was WRONG
  (the gate lapses MG after 3 rounds, so the encoding over-credits uptime); corrected and elevated to ⚑5.
  (2) "Battle Formation" — the reviewer read it as a never-granted cross-unit self-status (inert); the
  driver initially held `fbGate:'inFb'` but later adopted the inert reading when S5/S6 converged on it too.
  The reviewer's nuke-ordering concern (nuke lands under its own +60%) was verified, with the framing
  corrected to ADDITIVE in the Damage-Up bucket (dmgUp 1.962 vs 1.362), not a ×1.60 multiplicative step.
- **S5 (claude-opus-5, blind test-writer):** `leakDetected:null`. Independently wrote a 23-assertion blind
  spec from the kit prose. Against the driver override it ran **21 pass / 2 skip / 0 fail** after 3
  harness-interface refixtures (the engine's `buffRemove` carries the unit under `slug`, not `targetSlug`;
  teammate-total equality relaxed to a gauge-coupling tolerance because skill damage feeds burst gauge and
  perturbs the rotation ~1%; `buffApply.durationShots` is `null`, not `undefined`). The 2 skips are the
  blind test's OWN `it.skip` GAPs (Battle Formation has no self-status primitive; Explosion Radius has no
  radius primitive) — both consistent with the driver's unmodeled lines. Crucially, the blind test's ACTIVE
  assertion that the Battle Formation ATK ▲20% is NOT credited passes against the driver override (the
  driver adopted the blind consensus). The blind test also independently concluded `shotFired` is the correct
  per-full-charge trigger for an always-charging RL.
- **S6 (claude-opus-5, blind override-writer):** `leakDetected:null`. Produced an override STRUCTURALLY
  IDENTICAL to the driver's on every line — same triggers (`shotFired` / `burstCast`), same gates
  (`requiresTargetStatus "Explosive Round"`), same effects/magnitudes/durations, Battle Formation +
  Explosion Radius both UNMODELED. The only difference is cosmetic (the blind override puts S1's two buffs
  in one block; the driver splits them into two single-effect blocks — functionally identical under
  `shotFired`/`applyBlock`). Its ⚑ flags echo the driver's ⚑5 (Missile Guide gate) and ⚑6 (Battle Formation).
- **S7 (kimi-code/k3, binding reconciling judge):** `verdict:GO`, `faithfulnessScore:1.0`, `gotchas:[]`,
  `discriminationOk:true`. Ruled all 9 lines accounted for (7 FAITHFUL + 2 deliberate DOCUMENTED_GAPs),
  confirmed the S5 suite is GREEN vs the driver override and the S6 override is structurally identical, and
  explicitly noted the driver adopting the blind consensus on Battle Formation is "exactly the cross-family
  correction the gauntlet exists to produce." Named the residuals (⚑5 Missile Guide uptime — the largest
  likely accuracy risk, compounding with ⚑1's instant-charge reading; ⚑1 engine subtractive convention; ⚑6
  Battle Formation alternative) as documented/estimated/recipe'd rather than fudged. "Nothing must change for
  GO."

## Residual flags (measurement-gated; none block GO)

- **⚑1 — Charge Speed ▲100% = instant charge.** Encoded `chargeSpeedPct 100`, which the engine's
  subtractive-time convention (`needed = chargeFrames × (1 − cs/100)`) reads as a 0-frame (instant) charge
  rather than a literal ×2-speed / ÷2-time. The kit magnitude (100) is pinned faithfully; the 100→instant
  interpretation is a global engine convention shared by every `chargeSpeedPct` carrier (red-hood/maxwell/
  mana), not a per-unit fudge. Recipe: focus-video her charge period inside vs outside Missile Guide.
- **⚑2 — Explosive Round gate inert.** The `requiresTargetStatus "Explosive Round"` gate is inert until a
  unit opens that named status (eunhwa-tactical-upgrade models her Explosive Round as a boss damageTaken
  rider, not a named `targetStatus`). Recipe: when ETU is reworked, emit `targetStatus "Explosive Round"`
  from her cannon so this gate goes live. Tier 2.
- **⚑3 — gauge generation engine-pin.** The engine pre-pins vesti-tu's burst-gauge generation to
  `FOCUS_CHARGE_GEN` when focused (`sim.ts PENDING_TEAM_ISOLATION`) because her datamined fullChargeBonus
  200 is unmeasured and the only 200-column measurement (cinderella) contradicts 2.0x. Engine-owned cadence
  (affects how fast she bursts, not per-hit damage). Recipe: a focused solo recording to pin her real
  charge-gen multiplier.
- **⚑4 — RL cadence tuple datamined.** chargeFrames 120 / reloadFrames 142 / ammo 8 are datamined, not
  focus-verified for this unit. Recipe: read rounds/min + reload gap from any focus video.
- **⚑5 — Missile Guide re-trigger gate (largest accuracy risk).** The "while not in Missile Guide" gate is
  unexpressible (no "not-currently-buffed" self gate). `shotFired` refreshes the `durationShots:3` window
  every full charge → near-permanent MG uptime, OVER-crediting her shot count vs the true duty cycle
  (periodic un-buffed 120f charges every ~4th). The `durationShots:3` + `removeOnReload` STRUCTURE is
  faithful; only the uptime is inflated. Compounds with ⚑1 (instant charge). Recipe: focus-video the
  slow-charge recurrence inside Missile Guide. Tier 2.
- **⚑6 — Battle Formation interpretation.** Encoded UNMODELED (blind consensus). The driver's alternative
  reading — `fbGate:'inFb'` (Battle Formation == the Full Burst state; no roster granter references the
  name, consistent with a global state) — is retained as the measurement-gated alternative. Recipe:
  focus-video whether the ATK ▲20% buff icon appears during Full Burst; if so, restore a `shotFired` +
  `fbGate:'inFb'` `atkPct 20 / 3s` block. Tier 2.
