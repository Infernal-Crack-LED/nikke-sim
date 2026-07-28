# Manual review — eunhwa-tactical-upgrade (Eunhwa: Tactical Upgrade)

**Gauntlet date:** 2026-07-27
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0 (judge: kimi-code/k3; 0 REAL-GOTCHA, discrimination OK)
**Tier:** 2 (burst weapon-swap to a cycling 1-round true-damage cannon; Camouflage-windowed true-damage buff via the co-extensive-window construction; on-hit refreshed vulnerability debuff; `teamHas.slugs`-gated LT-Formation bonus; scoped same-squad crit)

> Slug disambiguation: `eunhwa-tactical-upgrade` is the VARIANT (SR/Fire/Attacker/Burst II, Elysion,
> aka "eunwhatu"), NOT base `eunhwa` (SR/Fire). The lint's one advisory fires on the slug's own
> "Eunhwa" substring inside the full variant name (a known false positive); the exact slug is
> confirmed and never conflated with the base unit.

## Kit summary

Eunhwa: Tactical Upgrade is a Fire SR Attacker on Burst II (20s CD). Her Skill 2 "AS Formation"
passively grants same-squad allies +8.16% Critical Rate, all allies +41.81% Charge Damage, and
herself +42.24% ATK, continuously. A bonus state ("when applying LT Formation to self": all allies
+5.11% Projectile Explosion Damage, +30.97% True Damage) is gated on `emma-tactical-upgrade`
being present — LT Formation is applied by emma-tu, whose presence ≡ the formation being applied
(both formations are unconditional in-game passives; emma-tu IS simSupported, so this is board-live).
Her Skill 1 "Camouflage Scarf" makes her normal attacks deal true damage and grants +42.24% True
Damage while she is in Camouflage (applied on burst use and on Full Charges during Full Burst); the
two Camouflage targeting-prevention lines themselves are defensive (no targeting model in v1). Her
burst "Explosive Round" swaps her weapon to a 1-round, 0.3s-charge cannon dealing 105.6% of final
ATK as true damage at 300% full-charge multiplier; the 1-round magazine cycles over the Full-Burst
window (~6 shots/burst), and each cannon shot applies "Damage Taken ▲27.87% for 10s" to the target
on hit (refreshed per shot).

## Line-by-line

| Line                                                                                 | Disposition            | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------ | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1 L1/L2: Camouflage 5s (on burst use; on Full Charge during FB) — targeting prevent | DOCUMENTED_GAP         | Verbatim in `unmodeled`; single immortal boss, no targeting model — single-target-target prevention moves no damage. The STATUS is otherwise load-bearing only as the gate for L3, which the engine expresses via the co-extensive-window construction below (no self-status channel exists).                                                                                                                                                                                                                                                                                                                                                                           |
| S1 L3: "Normal attacks deal true damage continuously" (FLAVOR change)                | DOCUMENTED_GAP (⚑ med) | The engine's only true-normal mechanism is `weaponSwap.trueNormals`, which is windowed AND cannot coexist with her burst cannon swap (single swap slot), and there is no Camouflage self-status to gate it. Her sustained base SR normals therefore stay NON-true. Verbatim in `unmodeled`; ⚑ in caveats with estimate + recipe + tier 2. Unanimous GAP across S2b/S5/S6 (S5 skipped it explicitly: "no timed true-flavor primitive exists for the BASE weapon").                                                                                                                                                                                                       |
| S1 L3: "True Damage ▲42.24% continuously"                                            | FAITHFUL               | `trueDamagePct` 42.24 self, WINDOWED to the Camouflage uptime the engine can represent: applied on her own `burstCast` for 5s (L1) and REFRESHED on every Full Charge during Full Burst (`shotFired` + `fbGate:'inFb'`, 5s — L2). 61 windowed applications/180s, each finite 300-frame expiry, 49 of them inside FB windows (> 12 FB starts → per-FC refresh, not once-per-FB). Pays off on the true-flavored cannon shots: removing it drops every cannon shot's mult.dmgUp by exactly 0.4224 (floor 1.4224 → 1.0). Nearest-wrong (permanent frame-0 passive) discriminated. DamageUp bucket on true-flavored hits (§1e).                                              |
| S2 E1: same-squad allies Critical Rate ▲8.16% continuously                           | FAITHFUL               | `critRatePct` (unscoped — the kit has no normal-attack qualifier) passive, frame 0, no expiry, all four fixture allies; "same squad" ≡ the deployed team at single-squad scope (anchor-innocent-maid / emma-tu precedent). Unscoped proven via the team skill/burst-bucket crit lift; `critRateNormalPct` counterfactual leaves skill/burst at base crit. Removal lowers every ally total.                                                                                                                                                                                                                                                                              |
| S2 E2: all allies Charge Damage ▲41.81% continuously                                 | FAITHFUL               | `chargeDamagePct` passive, all four allies; ADDITIVE percentage points in the charge bucket (§1d): cannon mult.charge 3.4181 (= 300% FC + 0.4181), dropping by exactly 0.4181 to 3.0 when removed — the multiplicative `chargeDamageMultPct` reading (3.0×1.4181 = 4.2543) is ruled out. Removal lowers the charge-weapon allies (ETU/helm/ada).                                                                                                                                                                                                                                                                                                                        |
| S2 E3: self ATK ▲42.24% continuously                                                 | FAITHFUL               | `atkPct` self passive (scales her own ATK, not `casterAtkPct` flat-add); buffApply targets ETU alone; removal lowers ETU total while every ally stays byte-identical (proves self-scope).                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| S2 bonus (LT Formation): Projectile Explosion ▲5.11%, all allies                     | FAITHFUL (gated)       | `projectileExplosionPct` passive under `teamHas.slugs:['emma-tactical-upgrade']`; absent without emma-tu, present (all four allies, frame 0, no expiry) with her; ungated counterfactual fires it without emma-tu. Inert on ETU's SR normals; live on an RL teammate's normals (§1f).                                                                                                                                                                                                                                                                                                                                                                                   |
| S2 bonus (LT Formation): True Damage ▲30.97%, all allies                             | FAITHFUL (gated)       | `trueDamagePct` passive under the same `teamHas.slugs` gate; LIVE: with emma-tu (or ungated) every cannon shot's mult.dmgUp rises by exactly 0.3097 (floor 1.4224 → 1.7321), isolated from helm's FB-entry `attackDamagePct` 27.87 confound by the diff. Co-stacks with the S1 42.24 (distinct KR values).                                                                                                                                                                                                                                                                                                                                                              |
| Burst: weapon change — 105.6% true, FC 300%, charge 0.3s, 1 round, exploding         | FAITHFUL (⚑ med dur.)  | `weaponSwap {damagePct:105.6, chargeTimeSec:0.3, chargeMultPct:300, maxAmmo:1, trueNormals:true, durationSec:10}` on `burstCast`. chargeMultPct 300 = ×3 on the 105.6 (≈316.8% ATK/FC), NOT additive charge% and NOT 300% of ATK. The kit states NEITHER a duration NOR "deactivates when rounds fired" (unlike e-h), so the 1-round magazine CYCLES over the window → ~6 true-flavored cannon shots/burst (≥2 per full window; maxShots:1 counterfactual fires exactly 1/burst, provably fewer). ⚑ kit-silent duration (10s FB-window convention; recipe: footage cannon-popup count / SR-resume frame; tier 2). AoE splash radius inert vs partless boss (unmodeled). |
| Burst: Explosive Round — Damage Taken ▲27.87% for 10s, target(s) hit                 | FAITHFUL               | `damageTakenPct` 27.87 boss debuff (Taken bucket §1g), ON-HIT rider via `shotFired` + `swapGate:'swapped'`: one application per cannon shot landed (72 apps = 72 cannon shots), refreshed per shot → mult.taken 1.2787 across ~96% of damage instances (vs ~67% for a cast-once encoding). Boss debuffs carry casterIdx===null && targetIdx===null (owner in the KEY). Wrong-stat (atkPct on the enemy target) counterfactual never moves mult.taken. Removal lowers every ally total.                                                                                                                                                                                  |

## Cross-family corroboration

- **S2b test-faithfulness review (claude-fable-5):** 10-line spec, all load-bearing. Its review
  moved THREE driver readings, all ADOPTED: (1) the burst cannon is MULTI-SHOT (the kit gives
  "Max Ammunition Capacity: 1 round" but, unlike e-h, never says "deactivates when rounds fired" —
  the magazine cycles; the driver's first `maxShots:1` encoding under-modelled her ~2×, probe
  175.9M → 353.7M); (2) the vulnerability debuff is ON-HIT and refreshed (`shotFired` +
  `swapGate:'swapped'`, ~96% uptime vs ~67% cast-once); (3) the trueDamagePct 42.24 must NOT be a
  naive always-on passive (fable's #1 nearest-wrong). Converged outright on the S2 passives, the
  LT-bonus `teamHas` gate (fable's "GAP" = "needs a gate"), chargeMultPct 300 = ×3, and the
  Camouflage + AoE-splash UNMODELED set. Fable also pre-named the casterIdx===null boss-debuff
  reader gotcha.
- **S5 blind test (claude-opus-5):** 13P/3F/5S vs the driver override (after the driver adopted the
  windowed trueDamage encoding the blind independently demanded). The 5 skips are the blind's OWN
  declared GAPs (base-weapon true-flavor primitive absent; Camouflage-removal-on-hit unobservable;
  targeting-prevention defensive). The 3 reds all resolve AGAINST the blind side (judge-confirmed):
  (a) "zeroing lowers HER damage" — blind-FIXTURE artifact (`controlComp(SLUG)` shadows SLUG's B2
  cast with crown, so she never bursts; her only damage is non-true base SR on which trueDamagePct
  is correctly inert — the driver's sole-focused-B2 fixture proves the 0.4224-per-cannon-shot
  payoff); (b) "squad-scoped crit" — convention divergence (driver holds same-squad ≡ whole team per
  repo precedent); (c) "debuff lands" — the exact casterIdx===null reader bug S2b pre-named.
- **S6 blind override (claude-opus-5):** converged on the base magnitudes and the multi-shot cannon
  shape, but fell into S2b's #1 named nearest-wrong (shipped the trueDamagePct as a permanent
  passive) AND shipped the LT-Formation bonus UNGATED (S2b's highest-stakes over-credit) — both
  divergences the driver avoided (windowed co-extensive construction + `teamHas.slugs` gate). Its
  cast-triggered debuff is also weaker than the driver's on-hit refresh.
- **S7 binding judge (kimi-code/k3):** GO 1.0, zero REAL-GOTCHA, discrimination OK. Every kit line
  FAITHFUL or DOCUMENTED_GAP; ruled the driver encoding MORE faithful than the S6 blind on all three
  divergent claims, with independent arithmetic checks (3.4181 vs 4.2543 charge; 1.4224/1.7321
  dmgUp floors; maxShots:1 shot-count; wrong-stat debuff). The three gotchas are all driver-documented
  and none is silent.

## Judgment calls (owner spot-checks)

1. **Same-squad → all allies.** S2-E1 "all allies from the same squad" encoded as plain `allies`
   (the sim fields exactly one deployed squad; anchor-innocent-maid / emma-tu precedent). BOTH blind
   agents read it as a real filter (self-only in a squad-less comp). The judge flagged this as a low
   residual, not a gotcha. **Re-scope if squad data ever lands.**
2. **LT-Formation auto-gate (and its asymmetry).** ETU's bonus uses `teamHas.slugs:['emma-tactical-upgrade']`
   (presence ≡ formation applied), per the emma-tu override note's explicit recommendation. emma-tu's
   MIRROR bonus ("when applying AS Formation to self") is behind a manual mode (default OFF) — an
   asymmetry in the two landed encodings: ETU's bonus auto-fires with emma-tu present, emma-tu's
   requires selecting its AS mode. **Reconcile to a single auto-gate convention if both sisters grade
   a team together.**
3. **Cannon swap duration (⚑ kit-silent).** The kit gives "Max Ammunition Capacity: 1 round" but no
   duration and no "deactivates when rounds fired". Modeled at `durationSec:10` (the Full-Burst-window
   convention shared with e-h / red-hood) → ~6 shots/burst; damage is roughly linear in the real window
   length (10s ≈ double the single-shot reading). **Recipe:** an eunhwa-tu recording — count cannon
   popups per burst and the frame her base SR fire resumes; rescale `durationSec`.
4. **Sustained-normal true flavor unmodeled (⚑ under-count).** The kit intends the Camouflage-uptime
   fraction of her base SR DPS to be true-flavored and amplified; the engine has no permanent
   trueNormals primitive compatible with the burst cannon swap and no Camouflage self-status gate, so
   her base SR normals stay non-true and the 42.24 buff pays off only on the cannon shots. This is an
   UNDER-count (not an over-credit). **Recipe:** a permanent trueNormals flag that survives weapon-swap
   coexistence + a Camouflage-uptime model, then popup-read the true-damage popup count.

## Residual flags

- Spot-check cluster (on file in kit-status.json): (a) same-squad ≡ whole-team convention; (b) the
  "emma-tu presence ≡ LT Formation applied" auto-gate assumption + its asymmetry with emma-tu's manual
  mirror mode; (c) true-flavor base normals unmodeled (under-count ⚑); (d) kit-silent cannon swap
  duration (10s FB-window convention ⚑).
- No engine changes (S4 untouched); `scripts/verify.sh` green; validate-overrides valid (dmg 137.4M /
  27.3% share / 9 bursts on the solo graded basis; 12 bursts / ~6 cannon shots each on the driver fixture).
