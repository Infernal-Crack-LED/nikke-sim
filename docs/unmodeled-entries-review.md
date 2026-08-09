# Unmodeled Override Entries Review

Generated: 2026-08-08T23:40:56.609Z
Source: `src/skills/overrides/*.json`
Scope: active override JSONs only. Baseline and legacy override directories were not scanned because they do not carry a structured `unmodeled` field.

**Totals:** 147 units with unmodeled entries, 466 unmodeled kit-text lines.

This document lists every kit line that is deliberately not represented as a sim block, together with the author-written caveats that explain why.

## Reason-category summary

Each unmodeled line was tagged with a single primary reason using a keyword pass over the line text plus any slot-specific caveat. A line is counted only once, so the totals below sum to the overall line count.

| Reason                                    | Count   |
| ----------------------------------------- | ------- |
| Defensive / utility / mitigation          | 195     |
| No HP pool / healing domain               | 72      |
| Partless / AoE / targeting                | 55      |
| Bookkeeping / stacks / resources / stance | 85      |
| Inert / zero damage in v1                 | 8       |
| Missing engine primitive / trigger        | 19      |
| Weapon state / range / ammo / CDR         | 27      |
| Other                                     | 5       |
| **Total**                                 | **466** |

## `a2`

- **skill1** (1)
  - [Partless / AoE / targeting] Explosion Radius ▲ 100.74% for 15 sec.

- **burst** (2)
  - [No HP pool / healing domain] Effect 1: Current HP ▼ 3.99% every 1 sec.
  - [No HP pool / healing domain] If own HP dips below 40%, Mode B is removed.

**Caveats / reasons:**

- burst: Mode B ATK ▲15.19% + Charge Speed ▲35.88% use a DERIVED 22.5s duration = ln(0.4)/ln(1-0.0399), the compound (CURRENT-HP) reading of the 3.99%/s drain crossing the 40% removal floor — ⚑ if the drain is %-of-MAX-HP (linear) the lifetime is 60/3.99 = 15.04s instead; pin from footage (burst banner → visible Mode B drop). The sim has no HP pool, so the removal gate is expressed only as this finite durationSec.
- burst: the derived 22.5s assumes A2 is at full HP at each burst cast — ⚑ real fights with boss damage (or healing that offsets the drain) shorten/extend Mode B; healing-based extension (crown heals in the control fixture) is out of scope with no HP pool and is NOT modeled.
- skill1: 'Explosion Radius ▲ 100.74%' is unmodeled AoE-splash geometry (single-target sim) — deliberately NOT mapped to projectileExplosionPct, which would invent ~100% Damage Up out of a pure radius line.
- skill2: the 30.1% full-charge rider is modeled on shotFired (every RL pull = one full charge); if a focus video shows it not firing every charged shot, retune the trigger.
- skill2: Damage to Parts ▲40.88% is encoded but exactly inert vs the partless scope-lock boss (kept for kit completeness).

## `ada`

- **skill1** (1)
  - [No HP pool / healing domain] Recovers 10% of the damage dealt as HP for 10 sec. (skipped: lifesteal — no HP pool consumer modeled; see findings F1/F2: targets bursted Burst-3 allies, would fire their 'recovery' triggers if a B3 recovery-consumer comp appears)

**Caveats / reasons:**

- burst: ⚑ Special Modification 'for 1 round(s)' — MEASUREMENT-GATED fidelity flag (kit-status F3). Kit-literal reading = exactly 1 boosted charged round per burst window (durationShots:1). Shipped encoding = weaponSwap durationSec:10 with no maxShots cap, which over-fires ~2 special charged shots per window (~45% of her total). Board (≈0.99) leans on the 2nd shot; capping to kit-literal drops the board to ~0.95. Estimate: 2 specials/window (shipped, board-validated) vs 1 (kit-literal). Recipe: record Ada's special-charged-shot count per burst window from fight popup footage; if kit-literal (1), add maxShots:1 to the burst weaponSwap block. Tier: CALIBRATED ⚑ / MEASUREMENT-GATED. Independently re-derived by the blind cross-family reviewer (gauntlet 2026-07-24).

## `ade-agent-bunny`

- **skill1** (1)
  - [Weapon state / range / ammo / CDR] Spy Lens: Minimum Effective Range ▲ 4.44%, stacks up to 10 time(s) and lasts for 5 sec.

- **burst** (1)
  - [Weapon state / range / ammo / CDR] Minimum Effective Range ▲ 55.56% for 10 sec.

**Caveats / reasons:**

- skill1: team ATK (15.2% of caster ATK) is keyed to a shotFired proxy for 'landing Full Charge attacks within effective range' — assumes every trigger pull is a landed full charge (⚑ unmeasured)
- skill2: 'Spy Lens at max stacks' ATK +16% now activates as a faithful STEP via hitCount count:10 (2026-07-17, theme 3) — Spy Lens gains 1 stack per full-charge SR hit, so the 10th hit (~16s incl. one reload) reaches max and the buff turns on continuously (permanent, no duration = continuous fire keeps stacks maxed). Replaces the always-on-from-t=0 encoding (over-credited the ~16s onset). [2026-07-20, A4 step-gated pierce] the PIERCE tag is now ALSO step-gated: the top-level hasPierce:true flag is removed and a duration-less `gainPierce` effect rides the same hitCount:10 trigger → pierceUntilFrame → ∞ at the 10th full-charge hit and stays on (continuous fire keeps stacks maxed). This closes the prior residual gap (a boolean flag couldn't be step-gated); her own 18.36+10.13 Pierce-Damage self-feed and teammates' pierce buffs now correctly go live only after Spy Lens maxes (~16s), not from t=0. ⚑ count:10 rests on 1 stack/full-charge + the ⚑ SR cadence.
- skill2: team Pierce Damage +18.36% rides the same shotFired full-charge proxy (⚑ unmeasured)
- cadence: SR bolt-gap (22f) + chargeFrames 60 + reloadFrames 141 are datamine defaults — verify autofire/rounds-per-minute/reload from video (⚑ unmeasured)

## `ade`

- **skill1** (1)
  - [Defensive / utility / mitigation] Activates at the start of battle. Affects all allies. Perfect Maid: Gain debuff immunity to 1 debuff(s), stacking up to 1 time(s) continuously. — UNMODELED (defensive): debuff immunity; the v1 boss applies no debuffs (nothing to be immune to) and the engine has no debuff/immunity primitive (biscuit / diesel-winter-sweets precedent).

- **skill2** (1)
  - [Defensive / utility / mitigation] Activates after 420 normal attack(s). Affects all allies. Perfect Maid: Gain debuff immunity to 1 debuff(s), stacking up to 1 time(s) continuously. — UNMODELED (defensive): the same immunity REFRESH at the 420-NA mark; same reason as skill1 (no enemy debuff model in v1).

**Caveats / reasons:**

- skill1: the 'own HP falls below 90%' gate is collapsed always-on (interval:5 refresh keeps the 5s window continuously live from t=5s) — v1 has no ally HP pool / incoming boss damage to evaluate the gate; mast precedent (GO 1.0) governs offensive HP-below gates. S2b (claude-fable-5) dissented: UNMODELED as trigger-unrealizable at scope lock — recorded as the rejected alternative; a real fight's uptime is measurement-gated (⚑2)
- skill2 + burst: the Max HP grants (casterMaxHpPct → maxHpFlat) are OFFENSIVELY INERT — ade has no atkOfMaxHpPct consumer and the e3 rule excludes ally-granted maxHpFlat from holders' live-Max-HP conversions; encoded for kit completeness + future consumers, proven inert by totals-equality in the unit test
- burst: 'without restoring HP' — no heal effect is used, so the grants emit no recovery events and cannot proc on-recovery consumers
- skill2: 'after 120 normal attack(s)' = 120 hit-counter units — hitsPerShot 1 makes pulls == hits (no lever); the counter re-fires every crossing (no once qualifier)
- cadence tuple (AR RoF 720, reloadFrames 111) is the unverified datamine — read rounds/min + the reload gap from a focus video (⚑1)

## `admi`

- **skill1** (2)
  - [Bookkeeping / stacks / resources / stance] ■ Activates when attacked 20 time(s). Affects all allies.
  - [Bookkeeping / stacks / resources / stance] Charge Damage Multiplier ▲ 9.59% for 20 sec.

- **skill2** (2)
  - [Defensive / utility / mitigation] ■ Affects 2 allies with the highest final ATK.
  - [Defensive / utility / mitigation] Damage Taken ▼ 28.65% for 10 sec.

**Caveats / reasons:**

- skill1: 'when attacked 20 times → all allies Charge Damage Multiplier ▲9.59% / 20s' is UNMODELED — the v1 sim models no incoming ally damage and has no attacked-count trigger primitive, so the counter never accrues and the line never fires at scope lock; the effect side would be chargeDamageMultPct (base-charge-scaling, helm-wording precedent) IF a trigger ever existed (⚑1; noise/yulha precedent)
- skill2: the 'Damage Taken ▼28.65%' ally mitigation is UNMODELED — the only damageTakenPct primitive is a BOSS debuff (positive = boss takes MORE, wrong direction); NOT encoded (would manufacture a phantom team damage gain); the '2 highest-final-ATK allies' targeting clause is moot with the inert effect (⚑2; noise precedent)
- burst: burstCast trigger — both 10s windows ride frame-exact on her stage-2 cast, which lands BEFORE the Full Burst window opens; a fullBurstEnter encoding would shift both windows off her cast frames (Tier-2 lever, pinned in the test)
- cadence tuple (SR chargeFrames 60, reloadFrames 125, ammo 6) is the unverified datamine — read the charge time + reload gap from a focus video (⚑3)

## `alice-wonderland-bunny`

- **skill1** (1)
  - [Bookkeeping / stacks / resources / stance] ■ Activates after 90 normal attack(s). Affects all Water Code allies. Stack count of buffs ▲ 1. (a stack-CAP raise, not a +1 stack grant — no engine primitive raises a buff's stack cap; the only stackable buff in play, Carrot Party, is damage-inert in v1: double inert)

- **burst** (1)
  - [No HP pool / healing domain] ■ Activates when Carrot Party is at max stacks. Affects all allies. Incoming healing ▲ 150% for 15 sec. (no healing-received channel — no HP pool at scope; the activation gate references the inert Carrot Party stack count)

## `alice`

- **skill2** (2)
  - [Defensive / utility / mitigation] ■ Affects self. Activates when above 80% HP. Gain continuous Pierce.
  - [Defensive / utility / mitigation] ■ Affects self. Activates when HP falls below 80%. Continuously recover HP by 8.12% of attack damage.

**Caveats / reasons:**

- skill1: Charge Speed 11.67% is modeled as a flat target-own buff; the kit says '11.67% of the skill user's Charge Speed' (caster-relative) — qualifier unreconciled (no caster-relative charge-speed StatKey exists). ⚑ OUT-OF-DOMAIN (engine-core: needs a caster-relative charge-speed StatKey). Estimate: at scope lock the caster (alice) is at base charge speed unless she ranks top-2 ATK AND has her own +80.15% burst buff live at FB entry, in which case the flat 11.67% understates the grant by up to ~~80% of 11.67 (~~+9pp) on those rotations only — a low-single-digit-% cadence effect on the 2 targeted allies. Recipe: read the 2 targeted allies' charged-shot cadence in a focus video vs sim; if it disagrees, snapshot the caster's charge speed at FB entry. Tier: out-of-domain (no primitive); low impact at scope lock.
- skill2: Pierce is modeled UNGATED (hasPierce); the kit gates it '>80% HP' — always satisfied in v1 (boss deals no damage to units). Re-encode the gate if incoming damage is ever modeled. hasPierce is a hit TAG (enables pierceDamagePct eligibility, sim.ts:1400), NOT a damage stat, and PIERCE_CORE_DOUBLE=false (sim.ts:1091) so there is no core+body double-hit — damage-INERT at scope lock (verified byte-identical totals with/without).
- skill2: lifesteal 'recover HP by 8.12% of attack damage' below 80% HP is UNMODELED. ⚑ OUT-OF-DOMAIN (engine-core: needs an HP pool + incoming-damage model). Estimate: exactly 0 impact at scope lock — the boss deals no damage, no unit ever drops below the 80% gate, and there is no HP pool to heal, so the line can move no damage and emits no event. Recipe: add an HP-pool / damage-taken primitive, then encode the <80%HP gate + 8.12%-of-attack-damage continuous recovery (and watch crown's 'when recovery takes effect' consumer in the control comp for leaked ally heals). Tier: out-of-domain (no primitive); inert in v1.

## `anchor-innocent-maid`

- **skill1** (3)
  - [No HP pool / healing domain] Once: Potency of HP ▲ 30.96% for 5 sec.
  - [No HP pool / healing domain] Three times: Stack count of debuffs ▼ 1.
  - [No HP pool / healing domain] ■ Activates when entering Full Burst while an ally from the same squad is on the battlefield. Affects all allies.

- **burst** (1)
  - [Defensive / utility / mitigation] Storage: Stores excess healing received by the skill user, up to 60.19% of their Max HP. Lasts for 25 sec.

**Caveats / reasons:**

- skill1: 'same squad' heal gate modeled as always-satisfied — if it requires a lore-squad teammate (squad membership not in our data, unverified), recovery events over-fire in other teams (affects on-recovery consumers only)
- skill1: the 8-tick regen (every 1s for 8s) now emits 8 timed recovery events (heal ticks:8) — on-recovery consumers (Crown-type) stay refreshed across the whole window (engine gap #1 fix, 2026-07-17)
- skill1: tier-1 'Potency of HP' is a value-0 placeholder kept only for escalating tier order (heal potency has no engine stat)
- skill2: Hit Rate ▲ 10.13% modeled as hitRatePct — LIVE since CONE_DELTA (2026-07-19) for AR/SMG/SG recipients via acrForHR; its in-game core-hit-rate lift is unmeasured
- burst: healing Storage (60.19% Max HP overheal buffer) is unmodeled — defensive, no engine vocabulary; deliberately not encoded as a shield event
- cadence: pullsPerSec / reloadFrames 141 / bolt-gap-vs-autofire are unverified datamine values (parser baseline)

## `anchor`

- **skill1** (1)
  - [Defensive / utility / mitigation] Taunt for 5 sec.

- **skill2** (1)
  - [Partless / AoE / targeting] When attacking an enemy projectile, damage dealt to that projectile ▲ 25.6% continuously.

**Caveats / reasons:**

- skill1: the taunt half of S1 is unmodeled — enemy aggro manipulation; no taunt primitive and no enemy-behaviour model in the sim, offensively inert by construction
- skill1: the defPct grant is inert-in-v1 (self DEF never feeds own damage) — event-pinned at one application per magazine depletion (the RL magazine STRETCHES 6 -> 8-9 rounds under the fixture's liter escalating maxAmmoPct 45.17%; the pin keys on the engine's reload events, not a shots/ammo division), magnitude + duration + scope pinned, damage-neutral
- skill2: '+25.6% damage vs enemy projectiles' is ⚑ OUT-OF-DOMAIN (engine-core) — no enemy-projectile entities in the sim; estimate zero in every fight the sim can run; recipe: projectile entity model + scoped modifier
- burst: 'Affects all enemies' collapses to ONE instance on the lone partless boss (multi-enemy selection is out of the single-boss scope)

## `anis-star`

- **skill1** (2)
  - [Bookkeeping / stacks / resources / stance] If there are no other Burst 1 allies: Effect 1: Affects self. Cancels Everyone's Star.
  - [Bookkeeping / stacks / resources / stance] If there are any other Burst 1 allies: Effect 1: Affects self. Cancels My Own Star.

- **skill2** (1)
  - [No HP pool / healing domain] ■ Activates when performing a Full Charge attack while in Everyone's Star status. Affects all allies. Restores 1.26% of the skill user's final Max HP as HP.

- **burst** (2)
  - [Partless / AoE / targeting] Explosion Radius ▲ 100% for 10 sec.
  - [Defensive / utility / mitigation] DEF ▲ 55.01% for 10 sec.

## `anis`

Anis is an Iron rocket-launcher Burst-II Defender whose kit is nearly all survivability: Skill 1 raises her own DEF after she has been attacked 40 times, and Skill 2 raises the DEF of herself and her two highest-final-ATK allies while sharing damage taken among them. In the sim (immortal boss, no incoming damage) only two lines fire: the Skill 2 DEF buff every 30s (offensively inert — self DEF feeds no damage in v1) and her burst's 156.73%-of-final-ATK nuke, her only damage line. Skill 1's attacked cluster, the damage-share, and the burst's enemy DEF-lower are documented but unmodeled — the first two need an incoming-damage model the sim deliberately lacks, and boss DEF is a fixed per-hit subtraction the engine cannot debuff (and the shred's magnitude is ~0.04% anyway).

- **skill1** (2)
  - [Defensive / utility / mitigation] Activates when attacked 40 time(s). Affects self.
  - [Defensive / utility / mitigation] DEF ▲ 120% for 10 sec.

- **skill2** (1)
  - [Defensive / utility / mitigation] Equally shares damage taken for 10 sec.

- **burst** (1)
  - [Defensive / utility / mitigation] DEF ▼ 32% for 5 sec.

**Caveats / reasons:**

- skill1: the entire attacked-40 cluster (self DEF ▲120%/10s) is UNMODELED — no incoming-damage model, no attacked-N trigger primitive; the boss never acts. Nearest-wrong (hitCount 40 on hits she DEALS) is pinned in the spec test and provably fails
- skill2: 'Equally shares damage taken for 10 sec' is UNMODELED — no redistribution primitive and no incoming damage to share (its 10s duration is distinct from the co-targeted DEF line's 5s)
- burst: 'DEF ▼ 32% for 5 sec' is UNMODELED — boss DEF is the fixed cfg.bossDef subtraction with no debuff channel; magnitude ~0.04%/hit; NOT damageTakenPct (that would over-credit the whole team ~32% in-window — pinned as a counterfactual in the spec test)
- skill2: the 30s interval cadence is the datamined skillCooldownsSec.skill2 (the kit prose carries no number) — ⚑ cadence tuple
- weapon: RL cadence tuple (rate_of_fire 60 / chargeFrames 60 / reloadFrames 142 / ammo 6) is an unmeasured datamine estimate

## `arcana-fortune-mate`

- **skill1** (1)
  - [Bookkeeping / stacks / resources / stance] Full Burst ends: self removes Making Memories + Snapshots of Youth.

- **skill2** (1)
  - [Bookkeeping / stacks / resources / stance] Normal attacks in Making Memories (one at a time, resets on MM removal): 2 time(s): Reload 6 rounds.

- **burst** (1)
  - [Bookkeeping / stacks / resources / stance] Making Memories: Reload 2 rounds.

**Caveats / reasons:**

- skill1/skill2: Making Memories stack buffs (Snapshots +30 normal, Happy Memories +3 pellets via pelletCountFlat 3 — 2026-07-21 A4, was +30 normal, Precious Moments +7.47 ATK) now carry rampSec 11 (theme 3, 2026-07-17) — the real 2/4/6-shot phase counter reaches cap at ~16-18 shots (~10.7-12s at ⚑1.5 pulls/s) ≥ the 11s window, so each buff ramps 0→full across the window (time-avg ~half of cap) and RESETS per window via the engine lapse-reset (the ~9s inter-burst gap fully lapses the buff). Replaces the prior BAKED-to-max encoding. ⚑ rampSec 11 rests on the 1.5 pulls/s SG cadence estimate; a focus recording refines it.
- skill1: the 39% (=13% x 3 Precious Moments stacks) at Full Burst end assumes 3 stacks; the ramp arithmetic reaches ~2 by FB end (HOT direction), and the block fires on EVERY team FB end even on rotations she did not burst (0 stacks in reality — multi-B2 comps over-credit).
- skill2/burst: the kit's in-window reloads (Reload 6 rounds at the 2-hit phase; Reload 2 rounds at burst) are unmodeled — they add ~3-5 window shots (COLD direction, partially masks the ramp over-credit).

## `arcana`

- **skill1** (1)
  - [Inert / zero damage in v1] The Magician: Cooldown of Skill 2 ▼ 75% for 15 sec.

**Caveats / reasons:**

- skill1: the 180% Attack Damage grant targets Burst 3 Electric allies who cast their Burst Skill this rotation — inert in teams without one (⚑ unmeasured team-conditional)
- skill2: the 180% caster-ATK 'Strength' grant has the same Burst-3-Electric-caster condition — inert in teams without one (⚑)
- skill1/skill2: Wheel of Fortune gate modeled as ownBurstGate 'cast' on fullBurstEnd (fires iff arcana cast her burst this rotation — she is the sole Wheel-of-Fortune source); the precise WoF window timing vs FB-end is unverified against a recording (⚑). Replaced the parser-baseline everyN-2-offset-1 round-count proxy (kit-autonomy gauntlet 2026-07-24), which over-fired when she never burst and under-fired when she burst every rotation.
- cadence: RL fire cadence / reloadFrames 171 / 60-frame charge are unmeasured datamine values; bolt-recovery gap shipped ON, autofire unverified (⚑)

## `ark-ranger-black`

- **skill1** (1)
  - [Partless / AoE / targeting] Charges battery by 50% continuously, up to 100%. This effect cannot be removed. (part-destroy trigger — no destructible parts on the partless scope-lock boss; never fires in scope-lock)

- **burst** (1)
  - [Bookkeeping / stacks / resources / stance] Activates while in Transformation status: Battery ▲ 50%. (never fires in scope-lock — burst CD 40s > Transformation duration 10s; the burst always fires outside Transformation)

## `asuka-wille`

- **skill2** (1)
  - [Inert / zero damage in v1] Effect 1: MG heating up speed ▼ 100% for 3 sec.

**Caveats / reasons:**

- skill1: cadence tuple (MG wind-up ladder / 300 ammo / reloadFrames 161) is the unverified datamine — read rounds/min + the reload gap from any focus video (⚑1)
- skill1: the every-10-shots proc + Anti A.T. Field stacks are GATED to the Annihilation State window (requiresTargetStatus 'Annihilation State', hitCount 10) and the debuff durationSec is 9 (consumed at state-end), replacing the prior ungated near-permanent 30-stack encoding; whether the window builds the full 30 stacks is cadence-dependent (⚑4/⚑5)
- skill1/burst: 'Annihilation State' is a SELF mode proxied as a boss targetStatus (the engine has no self-status gate). This is a name-keyed side channel any other unit's requiresTargetStatus 'Annihilation State' could read; no other in-scope unit does, so it is inert today, but a future carrier of that gate name would falsely see her mode (judge gotcha 3 — a requiresOwnBuff primitive would replace the proxy)
- burst: the Annihilation finisher's prose precondition 'Affects the target(s) afflicted with Anti A.T. Field' is NOT separately gated — the single v1 boss always carries the debuff during the window, so the precondition is implicitly satisfied; a multi-target fight would need a requiresTargetStatus gate on the Anti A.T. Field status (judge gotcha 4)
- skill1/burst: the Anti A.T. Field CONSUMPTION is instant in-game (all stacks removed at the finisher ~cast+9s) but the engine has no remove-target-buff primitive, so the debuff expires gradually 9s per stack — a short post-window tail over-credits team amp by up to ~1.5x in that tail (⚑6: add a consumeTargetStatus effect keyed to the finisher; Tier 2)
- skill2: the Full-Burst-entry Attack Damage buff is fullBurstEnter + ownBurstGate:'cast' (fires at FB entry only on rotations SHE burst in — Annihilation State is granted only by her own burst); identical to FB-enter when she is the only Burst III unit, and it correctly does NOT fire on another Burst III unit's rotations (verified in the dual-B3 control comp)
- skill2: Emergency Repair (heal + reload-speed + ammo dump) is encoded at fullBurstEnd + ownBurstGate:'cast' ≈ Annihilation-State end (~cast+9s, ~1s late); the schema has no delayed/state-end trigger keyed to her burst, so fullBurstEnd is the closest proxy
- skill2: 'Removes 100% of ammo' is modeled as consumeAmmo fraction:1 at fullBurstEnd (~10s after the burst's instantReload 0.21, so no collision); its damage content is the forced fast reload covered by the reloadSpeedPct 60 window (⚑3)
- skill2: the 3.77%-Max-HP heal is a 3-tick self recovery emitter (ticks:3/intervalSec:1) but is damage-INERT in the sim (self-targeted, asuka-wille has no recovery block; verified removing it moves no total) — encoded for kit completeness / future recovery synergy
- skill2: 'MG heating up speed ▼ 100% for 3 sec' is UNMODELED (⚑2) — no wind-up primitive; ambiguous (frozen ramp vs instant full spin). Measure her post-Emergency-Repair fire cadence before modeling
- burst: the Annihilation finisher (6.62% × stacks) is one 198.6% hit (30-stack cap) with delaySec:9 — it LANDS at state-end inside the FB window (FB-boosted, finding F2) and mirrors the LIVE stack count (no dynamic-stack-scale primitive, so the 30-cap is a documented proxy; the blind rebuild used 10 stacks — verify the popup ÷ 6.62 for the real count, ⚑4/⚑5)

## `asuka`

- **skill1** (1)
  - [Defensive / utility / mitigation] Damage dealt to Shield ▲ 601.01% continuously.

**Caveats / reasons:**

- skill1: ATK ▲96.98% is recovery-triggered — needs a heal landing on her (teammate healer, or her own burst lifesteal); a healer-less team that never Full-Bursts gains it never
- skill2: Elemental Advantage buff requires Shield status in-game — modeled with the requiresShielded block gate (gauntlet FIX 2026-07-24; the primitive exists, cf. naga — the prior 'no shield-state gate' note was wrong). Inert without a shielder AND without elemental advantage; in the control comp crown's burst shield keeps her shielded at every FB entry, so the gate is satisfied there
- burst: 'Gain Pierce for 25 sec' modeled as a timed gainPierce:25s burstCast effect (gauntlet FIX 2026-07-24; was the permanent top-level hasPierce flag — pierce currently inert vs the v1 boss either way); lifesteal modeled as one recovery event at cast, real effect ticks over 10s (tick cadence measurement-gated)
- burst: fire cadence is an unmeasured datamine estimate — 20-ammo AR with an 18.76% normal multiplier is unlikely to fire at the AR class default

## `avistar`

- **skill2** (1)
  - [No HP pool / healing domain] ■ Activates when entering Full Burst while in Stargazer status with over 25% HP. Affects self. Current HP ▼ 20% — UNMODELED: v1 has no HP pool, so the self HP drain (and its >25% HP gate) move no damage and feed no mechanic; Avistar has no low-HP offensive gate.

**Caveats / reasons:**

- skill1(Aftershow): the 'removed when entering Full Burst' clause is NOT enacted (no expire-on-FB-entry engine hook; fbGate is application-only) — the casterAtkPct 80.26 flat ATK is modeled permanent, a MATERIAL over-credit of the carry's FB-window damage (⚑1: total Aftershow contribution ~30% of carry damage measured; FB-window leak estimated ~8-14% of carry).
- skill1(self-heal): a real unit-HP heal but SELF-targeted and offensively inert (no HP pool; fires only her own nonexistent recovery triggers) — modeled for recovery-event fidelity, moves no board damage.
- skill2: the Projectile Explosion Damage line is applied to the favorite pop star but only yields damage on an explosive-weapon carry (RL/explosive SR); the Attack Damage 40.13 is the always-live bucket.
- burst: the Stargazer Max HP 26.4% is offensively inert (self Max HP, no atkOfMaxHpPct consumer); the re-entry is live only with a 2nd B1 in the comp.

## `bay`

- **skill1** (1)
  - [Defensive / utility / mitigation] Activates when using Burst Skill, only if self is alive. Affects all allies. Proportionally shares damage taken continuously.

- **skill2** (3)
  - [Defensive / utility / mitigation] Activates when using Burst Skill, only if self is alive. Affects self's cover. Proportionally shares damage taken continuously.
  - [Defensive / utility / mitigation] Activates when Full Burst ends. Affects self. Continuously recovers Cover's HP equal to 2.88% of the skill user's final Max HP every 1 sec for 5 sec.
  - [Defensive / utility / mitigation] Activates when entering Burst Stage 1 and self's cover has been destroyed. Affects self. Recovers 20% of the skill user's final Max HP.

- **burst** (3)
  - [Defensive / utility / mitigation] Affects self if self's cover has been destroyed. Rebuild Cover with 20% HP. Activates once per battle.
  - [Defensive / utility / mitigation] Affects self. Max HP of Cover ▲ 18% of the skill user's Max HP for 20 sec.
  - [Defensive / utility / mitigation] Affects all allies. Damage Taken ▼ 8.87% for 10 sec.

**Caveats / reasons:**

- skill1 DEF line is a SEMANTIC APPROXIMATION (marciana precedent): the kit grants DEF equal to 10.13% of the SKILL USER's DEF, but the schema's only DEF stat is defPct, which scales the TARGET's own DEF. There is no casterDefPct. Kept for kit completeness (DEF is offensively inert in v1); the value is NOT a faithful caster-scaled grant — the distinction has zero observable consequence in the DPS sim.
- skill1 Treasure heal magnitude (4% of the skill user's final Max HP) is event-only — the 'heal' effect emits ONE recovery event per full charge with no HP amount (v1 has no HP pool). The line is modeled solely for its TANDEM value: it fires allies' 'recovery' triggers every bay shot.
- skill2/burst are EMPTY by construction, not by omission: every line there is out-of-domain for the DPS sim — cover is not an entity the sim models (damage-share onto cover, cover-HP HoT, cover rebuild, cover Max HP), the boss deals no damage (ally Damage Taken ▼ 8.87% has nothing to reduce), and the cover-destroyed gates can never be satisfied at scope. All seven lines live VERBATIM in unmodeled.
- The S2 cover-HP HoT (2.88%/1s x5s at Full Burst end) is deliberately NOT encoded as a self 'heal' ticks:5 — cover repair is not a Nikke recovery, and the encoding would falsely pulse teammates' on-recovery consumers at every FB end. The burst's ally Damage-Taken-▼ is deliberately NOT encoded as damageTakenPct — that stat is a boss-targeted AMPLIFIER (positive = boss takes MORE damage); the kit line is defensive mitigation on ALL ALLIES (wrong direction and wrong target). The cover share/rebuild lines are NOT 'shield' effects (would falsely fire shielded-trigger gates).
- ⚑ CADENCE TUPLE (ALWAYS-⚑): pullsPerSec / reloadFrames 141 / chargeFrames 60 shipped from datamine (ammo 6); RL charge cycle ≈ 1 shot/s + 141f reload gap every 6 rounds — plausible, NOT escalated. Affects her OWN shots (and therefore the per-shot recovery channel's cadence) only; recipe: rounds/min + reload gap from any focus video.
- ⚑ AUTOFIRE vs CHARGE-GAP (ALWAYS-⚑, charge weapon): engine default shipped; ~affects her OWN shots/burst-gauge only (pure tank — small board impact); recipe: focus video, does she re-charge immediately with no dead gap.

## `belorta`

- **skill1** (1)
  - [Partless / AoE / targeting] ■ Activates when performing a Full Charge attack. Affects self. Explosion Radius ▲ 9.55% for 5 sec.

- **skill2** (1)
  - [Defensive / utility / mitigation] ■ Activates when an attack hits more than 4 enemy unit(s). Affects the target(s). DEF ▼ 3.52% for 5 sec. Deals 14.96% of final ATK as additional damage.

**Caveats / reasons:**

- burst: the 192% nuke is burstCast-keyed — pre-FB by engine timing (U10 auto-exempt), crits at the caster rate (U1 FunctionTable rule), never cores, never gets the +30% range bonus
- burst: chargeSpeedPct 2.82/10s targets all allies on HER cast only — a second Burst II sharing rotations would not refresh it (burstCast, not fullBurstEnter)
- skill1: Explosion Radius ▲ is unmodeled — AoE geometry, damage-inert vs the partless single boss; ⚑ out-of-domain, zero in sim domain
- skill2: the >4-enemies-hit gate is unsatisfiable vs one boss, so the DEF ▼ 3.52% and the 14.96% rider are unmodeled — ⚑ out-of-domain; shipping either ungated would be a ~14.96%-per-shot over-credit

## `biscuit`

- **skill2** (2)
  - [Defensive / utility / mitigation] Invincible for 5 sec. Activates 2 time(s) per battle. — UNMODELED (inert): defensive invincibility on a Defender ally whose HP falls below 50%; v1 has no damage-taken / HP-threshold model (immortal boss), so the trigger is indeterminate and can never legitimately fire. No invincibility primitive exists in the schema.
  - [No HP pool / healing domain] Recovers 23.26% of the skill user's final Max HP. Activates 2 time(s) per battle. — UNMODELED (inert): a genuine unit heal, BUT it shares skill2's un-fireable HP-below-50% trigger (no HP pool in v1), so it can never legitimately fire either. NOT encoded on an invented proxy trigger — doing so would spuriously drive a Defender ally's on-recovery kit (Crown-class over-credit); the faithful disposition is UNMODELED + verbatim record.

- **burst** (1)
  - [Defensive / utility / mitigation] Affects 2 random ally unit(s) whose cover has been destroyed. Rebuild Cover with 93.6% HP. — UNMODELED (inert): restores COVER HP, not a unit's HP; no sim cover-HP representation (same NO-OP class as liter S2, owner ruling 2026-07-21). Emits no unit-recovery event, so it must not trigger recovery-consumer teammates.

**Caveats / reasons:**

- skill1: trigger is fullBurstEnd (the literal 'at the end of Full Burst') — the 10s window opens as the FB window closes, NOT on FB entry. Both effects are Attacker-class-scoped (alliesOfClass Attacker), so biscuit herself (a Supporter) receives neither.
- skill1: the heal-over-time IS modeled (heal ticks:10 intervalSec:1) as an Attacker-scoped recovery stream — it feeds Attacker 'on-recovery' consumers (e.g. asuka) but, being Attacker-scoped, never the Defender consumer Crown.
- burst: ATK buff AND lifesteal heal are Supporter-class-scoped (alliesOfClass Supporter), reaching biscuit herself plus any other Supporter. The lifesteal is a Supporter recovery stream; no Supporter 'on-recovery' consumer exists in the current roster, so the channel is faithfully encoded but presently inert (it does NOT feed the Attacker probe asuka, nor the Defender Crown).
- burst: the cover-rebuild line is an inert NO-OP in v1 (no cover representation).
- weapon: biscuit's own RL damage is minor relative to her support value; the base-weapon cadence is datamined (rate_of_fire 60, reloadFrames 141, chargeFrames 60) and unverified by footage — read rounds/min + reload gap from a focus video if her self-damage ever matters.

## `blanc`

- **burst** (1)
  - [Defensive / utility / mitigation] Gain Indomitability for 10 sec.

**Caveats / reasons:**

- skill2: the 40.76s burstCdr is GATED on a same-squad ally (teamHas.sameSquad; curated squad = noir+rouge, owner-confirmed 2026-08-02) — inert in comps without one, active with one; the 'still on the battlefield' clause is scope-trivial (nobody dies at scope lock)
- skill2/burst: heals now emit their real per-second ticks (heal ticks:5 for the 5s S2 HoT, ticks:8 for the 8s burst HoT) — on-recovery consumers (Crown-type) stay refreshed across each window (engine gap #1 fix, 2026-07-17)
- burst: Max HP ▲31.68% on the lowest-remaining-HP ally is now modeled (theme-13, 2026-07-17) via the new targetMaxHpPct stat (own-% basis) + alliesLowestHp TargetDef (count 1, excludeSelf). Offensively INERT: it lands on a teammate (casterIdx≠self) so it does not feed their atkOfMaxHpPct conversion (e3 rule); and v1 has no HP pool so 'lowest remaining HP' resolves to the leftmost non-self ally as a deterministic stand-in. Kit-SSOT completeness only — no board damage moves.
- skill1: shield cadence (every 120 normal attacks) scales with the unverified datamine cadence tuple (⚑)

## `bready`

- **skill1** (4)
  - [Bookkeeping / stacks / resources / stance] Activates when gaining a buff that increases sustained damage. Affects self.
  - [Bookkeeping / stacks / resources / stance] Cancels Recommended Taste.
  - [Bookkeeping / stacks / resources / stance] Activates when gaining a buff that increases distributed damage while not in a state of increased sustained damage. Affects self.
  - [Bookkeeping / stacks / resources / stance] Cancels Lingering Taste.

**Caveats / reasons:**

- skill1: which Taste is active is a user-selected mode (default: sustained = Lingering Taste; distributed = Recommended Taste) — the buff-gain entry triggers are not simulated; a team providing neither a sustained- nor a distributed-damage buff would leave her tasteless (all taste-gated lines inert), which the sim cannot represent
- skill1: the Taste Charge Speed ▼20% debuff is modeled as a permanent charge-time increase (60→72 frames; assumes she is always in a taste); 72 follows the engine's subtractive charge-speed convention — unmeasured (divisive would be 75)
- skill2: the Aftertaste DoT is encoded as repeating per-3-full-charge instances that stack when procs land <5s apart — stack-vs-refresh and overlap depend on the unmeasured charge cadence
- burst: 'Aftertaste Effect ▲349.8%' is modeled as an additive sustained-damage Damage-Up buff; a multiplicative DoT-magnitude reading would be ~41% hotter during her burst window — unmeasured
- skill1/skill2: full cadence tuple (charge time, reload 141f, 22-frame bolt gap vs autofire) is an unmeasured datamine estimate — ~15-20% shot-count swing

## `chisato`

- **skill1** (3)
  - [Bookkeeping / stacks / resources / stance] Activates at the start of battle. Affects self. Charges Extrasensory to 100%, up to 100%. This effect is continuous and cannot be removed.
  - [Defensive / utility / mitigation] Only when at 100%: Dodging Bullets: Invulnerable for 2 sec.
  - [Bookkeeping / stacks / resources / stance] Affects self every 2 sec. Extrasensory ▼ 1%.

- **burst** (1)
  - [Bookkeeping / stacks / resources / stance] Charges Extrasensory to 100%.

**Caveats / reasons:**

- skill1: Extrasensory threshold buffs (ATK 53.69 / True Damage 48.62 / Hit Rate 22.37) are modeled as FUSED PASSIVES (live from t=0, expire at 60/90/150s — the derived >70%/>55%/>25% crossing times of the 0.5%/s drain — and REFRESH on her own burstCast, which recharges Extrasensory to 100%). Reproduces both regimes: permanent while she bursts each ~40s rotation, decaying off when she never bursts. Replaces the prior permanent encoding that OVER-CREDITED never-burst comps (her ~1.19 board-hotness).
- skill2: 'Normal attacks deal true damage for 10 sec' is encoded as a same-weapon swap (trueNormals) so the S1 True Damage ▲ 48.62% applies to normals only inside the window. A trueNormals same-weapon flavor swap does NOT refill the mag (sim.ts:1944/2487 — no free reload at swap start or exit), so there is no shot-count optimism. True swap normals RETAIN crit+core in the engine (no true-damage-crit guard exists on this branch — sim.ts:2843 hardcodes crit:true; open-questions.md:481 'true-damage-window normals RETAIN core+crit — MEASURED, faithful'); whether true damage should crit/core is an engine-fidelity ⚑ out-of-domain for this override (core-on-true-damage unverified in-game, SMG coreMult 250 lever).

## `cinderella-crystal-wave`

- **skill1** (1)
  - [Weapon state / range / ammo / CDR] Activates when reloading to max ammunition capacity. Affects self. Preparation for Change: Reloading Time changes to fixed 3 sec for 6 sec. (Removed when the last bullet is fired.)

- **skill2** (1)
  - [Defensive / utility / mitigation] Activates at the start of battle and when using Burst Skill. Affects self. Creates a Decoy avatar with 70.34% of the caster's Max HP, continuously.

## `cinderella`

- **skill2** (2)
  - [Defensive / utility / mitigation] ■ Activates at the start of battle. Affects self. Decoy: Creates an avatar with 96% of the skill user's final Max HP. This effect is continuous.
  - [Defensive / utility / mitigation] ■ Activates when entering Burst Skill Stage 3. Affects self. Decoy: Creates an avatar with 96% of the skill user's final Max HP. This effect is continuous.

**Caveats / reasons:**

- skill2: Beautiful (Max HP ▲ 1.6% ×12 = +19.2% continuously, from her battle-start Decoy) is now modeled FAITHFULLY (2026-07-17, theme 3), replacing the steady-state bake: a self casterMaxHpPct 19.2 with rampSec 36 (passive Max-HP ramp from t=0) feeds her atkOfMaxHp via effectiveAtk (own-kit Max-HP only — engine wiring 2026-07-17, ally grants still excluded per the cindy e3 rule); atkOfMaxHp reverted to base 2.71; the burst's Beautiful-mirror split off as a rampSec-36 flatDamage 346.8 (nuke base back to 13659.2). Steady state (t≥36s) is byte-identical to the old bake (2.71×1.192=3.23; 13659.2+346.8=14006); pre-36s bursts now correctly credit PARTIAL Beautiful, reproducing the measured e3 early→late FB-proc growth (633.7k→667.0k). VALIDATED: mirror ramps 47.5@t=5s → 346.8@t≥36s; drift board-neutral for all other units.
- skill2: the Decoy avatar itself is not modeled (defensive/aggro summon; v1 boss deals no damage so full decoy uptime — and thus full Beautiful uptime — is assumed).
- skill1 CADENCE — MAG-DUMP (2026-07-21, supersedes the chargeSpeedPct-45 proxy): her real fire pattern is a whole-mag dump, now modeled directly via charFixes.magDumpRof (one ~1.0s charge PRIMES the mag → 24 rockets autofire at datamine rate_of_fire 180 / 3-per-s → ~2.1s reload → recharge), so NO charge-speed proxy is needed. The kit toggle 'Charge Speed ▲ 100% on full charge, Removed upon reloading to max ammunition' is the game's description of exactly this autofire-after-first-charge behavior; ally charge-speed buffs now apply only to the once-per-mag prime (subtractive on the 60f), NOT the dump rof. Directly measured (ammo-counter frame read, cindy solo neutral.MP4): ~390 pulls/180s (cycle ~10.75s/24), vs the old per-rocket-charge model's ~300 which was the COLD-0.937 cause. This RETIRES the subtractive-CS-formula landmine (the old +45 proxy) and the open-questions U25 divisive-formula hypothesis (which was built on the ~315 popup-division estimate; the divisor was 3-per-pull but is 2 — rocket + S1 rider). n=1 recording; Fable pre-op APPROVED-WITH-REVISIONS; gated enactment pass. DECISIONS 2026-07-21.
- skill1 ROCKET MAGNITUDE (2026-07-21): removed the TWIN-INSTANCE normalAttackPct +100. Per pull = ONE rocket (weaponCoef 32.11% × 200% full-charge) + the 136.6% S1 rider, video-verified by a same-footage popup recon (~97.5s, one ATK): rider 109806 = 136.6% × ATK → ATK 80,385; rocket-core 103246 = 64.22% × 2(core) × 80,385 EXACT (both kit coefs → the identical ATK, matching sim staticAtk 80,118). Datamine shot_count 1 / muzzle_count 1 independently = one projectile/pull. The old +100 made the rocket base 128.44% which the engine then cored to 256.88% = a 2× rocket over-credit. Owner-ruled 1-rocket 2026-07-21.
- burst SEQUENTIAL FLAVOR (2026-07-25, kit-autonomy gauntlet G2 fix): the consolidated 13659.2 nuke now carries flavor:'sequential' (kit: 'Attacks sequentially for 10 time(s)'). seqMult multiplies the whole packet, so 1×13659.2 flavored is arithmetically identical to 10×1365.92 flavored — board-inert in any comp with no sequential buffer (the control comp has none), correct in any comp that has one. Restores routing into the SSOT seqMult bucket / sequentialDamagePct / sequentialMultPct support that the unflavored consolidation silently dropped.
- ⚑ burst SAME-CAST SNAPSHOT — OWNER RESOLUTION REQUIRED (2026-07-25, kit-autonomy gauntlet G1, REAL-GOTCHA high): burstSnapshotsPreFb is FALSE, so per the engine's stageEnter-before-burstCast ordering her nuke DOES snapshot her own same-cast stage-3 atkOfMaxHpPct 2.71 conversion (~+1.5x baseAtk on the nuke, ~45% of her fight damage). This CONTRADICTS the [HISTORICAL] BURST TIMING sentence above (e3 video + U10: 'the nuke must lose ... the same-cast stage-3 ATK stack (burstSnapshotsPreFb flag)'), which is NOT named in the 2026-07-21 SUPERSEDES list — though that sentence's reasoning is explicitly coupled to the now-removed TWIN-INSTANCE model ('the old frame-0 calibration was compensating for the halved twin rockets; with rockets fixed ...'). The shipped flag (false) is the most recent explicit value (2026-07-21 rebuild); the driver test now PINS the shipped behavior (nuke baseAtk reflects the live same-cast conversion). RESOLVE: re-read ONE nuke popup from docs/probes/u8 e3 (cindy focus) — the two models differ ~1.5x in baseAtk on the same cast and the file already reports early/late FB procs 633.7k/667.0k from that footage, so one popup settles it — then either set burstSnapshotsPreFb:true (if the e3 reading holds) or delete the stale BURST TIMING sentence and record the superseding measurement here + DECISIONS. Estimate of board impact if the historical reading is correct: ~20-25% nuke over-credit. Tier 2. The gauntlet driver could not view the footage, so this remains open pending owner measurement.
- skill2 BEAUTIFUL SLOT (2026-07-25, kit-autonomy gauntlet G3, low/documented): Beautiful is filed as a smooth self casterMaxHpPct 19.2 rampSec 36 in the skill1 array (skill2 is []), not as 12 discrete 1.6% interval-3s stacks in skill2. Linear and discrete coincide at every 3s boundary; inside a window the linear form over-credits by ≤1 stack (≤1.6% Max HP, sub-1% of damage; at the t≈5.4s first cast it credits 2.88% where discrete gives 1.6%). Self-granted ⇒ caster===target, so it feeds atkOfMaxHpPct exactly as the discrete form would. The empty skill2 array is deliberate (the block lives at skill1[1]); the discrete form (interval 3s / value 1.6 / maxStacks 12) is available if step-vs-line ever matters.

## `claire`

- **burst** (1)
  - [Defensive / utility / mitigation] Removes 1 debuff(s).

**Caveats / reasons:**

- ⚑ CADENCE TUPLE (ALWAYS-⚑): pullsPerSec / reloadFrames 141 / chargeFrames 60 shipped from datamine (ammo 6); RL charge cycle ≈ 1 shot/s + 141f reload gap every 6 rounds — plausible, NOT escalated. Affects her OWN shots only, and therefore the cadence of the S1 3rd-full-charge recovery channel (a wrong cadence rescales that channel's feed into teammates' on-recovery consumers); recipe: rounds/min + reload gap from any focus video.
- ⚑ AUTOFIRE vs CHARGE-GAP (ALWAYS-⚑, charge weapon): engine default shipped; affects her OWN shots/burst-gauge only (pure sustain unit — small board impact); recipe: focus video, does she re-charge immediately with no dead gap.
- Heal MAGNITUDES (skill1 2.86% of caster final Max HP; burst 34.35% of caster final Max HP) are recorded here but NOT modeled: the 'heal' effect emits a recovery event with no HP amount (v1 has no HP pool). Both lines are implemented for their TANDEM value only — they fire allies' 'recovery' triggers (asuka/crown 'when recovery takes effect').
- Shield MAGNITUDE (skill2 10.13% of caster final Max HP) is recorded on the shield effect as maxHpPct but not consumed: v1 models no shield HP pool (the boss deals no damage). The shield effect's durationSec:10 opens each target's shieldedUntilFrame window and fires their 'shielded' triggers (naga-style shield-gated kits) — that event/window channel is the line's entire in-domain surface.
- '2 ally unit(s) with the highest FINAL ATK' resolves by live effectiveAtk at proc time (byFinalAtk:true per the A3 literal-word ruling); the pool is self-inclusive, but as a Supporter claire will rarely rank top-2 herself.
- countInFb:3 is EXPLICIT, not a copy of count: the engine's chargeCounter defaults the in-window threshold to countInFb ?? 1 during the 10s after the owner's OWN burst cast (scarlet-black-shadow's burst-lowered-thresholds mechanic). claire's kit has NO such threshold change, so the faithful encoding pins the same threshold (3) in-window; omitting countInFb would silently accelerate her S1 channel to per-shot for 10s after every cast of her own.
- Zero damage lines and zero weapon-state modifiers in the whole kit — claire is a clean-weapon BASIS unit (RL cell, CLEAN_WEAPON_TEAMS.b): clean-weapons.test.ts CW1 additionally pins this committed override byte-identical to the bare empty kit. Her board footprint is tandem only: one 3rd-full-charge recovery channel (top-2 allies), one burst-keyed all-ally shield event, one burst-keyed all-ally recovery event.

## `clay`

- **skill1** (1)
  - [Partless / AoE / targeting] When attacking an enemy projectile, damage to that projectile ▲ 45.05% for 6 sec.

- **skill2** (1)
  - [Defensive / utility / mitigation] ■ Activates when entering Burst Stage 1. Affects all allies. Gains debuff immunity to 1 debuff(s) for 10 sec.

**Caveats / reasons:**

- ⚑ CADENCE TUPLE (ALWAYS-⚑): nominal 24 pulls/s = the SMG class rate (datamine rate_of_fire 1440 ÷ 60), frame-quantized by the engine to the MEASURED 20.0 rounds/s effective cadence (DECISIONS 2026-07-23, idoll-ocean ammo-counter evidence — sim.ts FRAME QUANTIZATION) + reloadFrames 81 datamine (single-chunk reload, datamine reload_bullet 10000; ammo 120 → 5s mag). Plausible, NOT escalated (no <1s-mag tell). Affects her OWN SMG damage AND the Battle Cry cadence (~3.0s per 60-shot proc inside Full Burst at the 20/s effective cadence) — both her own shots only, so the cadence uncertainty does not propagate into teammates' damage, only into how fast her team buffs reach max stacks.
- ⚑ MEASUREMENT-GATED (fable-S2b-adopted): the 60-hit counter's behaviour at the Full-Burst BOUNDARY — the kit text ('after landing 60 normal attacks during Full Burst') specifies WHICH hits count (in-FB only) but is silent on whether the accrued count resets when Full Burst ends. Encoded CARRYOVER (the everyN activation counter is cumulative across windows) — the literal reading restricts the counting, not the counter's lifetime. ESTIMATE: ≤1 marginal proc per fight (a full 10s FB window accrues ~3 procs on its own at the 20/s effective cadence, so cross-boundary remainder rarely changes a proc count). RECIPE: popup-read the Victorious Battle Cry stack icon across an FB boundary in a clay focus recording (do stacks/proc timing show carried count?). TIER: override-only (measurement-gated).
- ⚑ OUT-OF-DOMAIN: S1 'When attacking an enemy projectile, damage to that projectile ▲45.05% for 6 sec.' — ESTIMATE: zero damage impact in any comp the sim can field: v1's scope-lock boss is partless, launches NO projectiles and has no interception model, so the line has no target object to act on (it is an anti-projectile/interception mechanic, defensive-side of the fight). RECIPE: an enemy-projectile entity + interception-damage channel in the engine (does not exist); popup-read projectile-hit numbers in a boss-with-missiles recording on enactment. TIER: out-of-domain (no override or engine path exists today; carried VERBATIM in unmodeled.skill1, nothing fabricated in its place).

## `cocoa`

- **skill1** (2)
  - [Defensive / utility / mitigation] Affects all allies. Restores 17.76% of Cover HP.
  - [Defensive / utility / mitigation] Affects 2 random ally unit(s) with debuffs. Removes 1 debuff(s).

- **skill2** (1)
  - [Defensive / utility / mitigation] Activates when attacking with Full Charge. Affects self. Professional Tomato Sauce: Damage Taken ▼ 4.37%, stacks up to 15 time(s) and lasts for 5 sec.

- **burst** (2)
  - [Defensive / utility / mitigation] Affects all allies. Removes 1 debuff(s).
  - [Defensive / utility / mitigation] Activates when Professional Tomato Sauce is at max stacks. Affects all enemies. ATK ▼ 13.59% for 10 sec.

**Caveats / reasons:**

- ⚑ Cover-HP restore (17.76% of Cover HP, all allies, skill1 cd 15s) is UNMODELED, tier out-of-domain (no cover/HP pool in v1). It is NOT encoded as a `heal` effect on purpose: cover repair is not HP recovery in the kit's own terms, and a heal would emit recovery events that fire teammates' on-recovery consumers (e.g. crown's 'when recovery takes effect') — a synergy cocoa does not have. Whether in-game cover repair fires on-recovery triggers is UNMEASURED; the default is no-emit, and flipping that default needs a measurement, not a prior. Recipe if a cover pool is ever modeled: emit a cover-restore event on skill1's 15s clock, no recovery trigger.
- ⚑ Debuff removal (skill1: 1 debuff from 2 random debuffed allies; burst: 1 debuff from all allies) is UNMODELED, tier out-of-domain: v1 models no ally debuffs (the boss deals no damage and applies none), so there is nothing to cleanse. Recipe if ally debuffs are ever modeled: cleanse 1 on skill1's 15s clock (2 random debuffed holders) and 1 on cocoa's OWN burstCast (all allies — burstCast, not fullBurstEnter).
- ⚑ Self Damage Taken ▼4.37% per full-charge attack (15 stacks, 5 sec) is UNMODELED, tier out-of-domain: v1 models no incoming damage, so a damage-taken modifier has no consumer. Estimate if it ever mattered: with SR cadence (60-frame charge, 6 ammo, 141 reload) stacks would saturate ~25-30s into the fight and stay up (UNMEASURED derivation). Its only consumer is the burst's max-stacks gate — both are unmodeled together. Nearest-wrong encoding to avoid: the schema's damageTakenPct is a BOSS debuff (positive = boss takes MORE damage); writing this self ▼ line onto the boss would swing team damage up to 15×4.37% ≈ 65.55%.
- ⚑ Enemy ATK ▼13.59% for 10 sec, gated on Tomato Sauce at max stacks at cast time, is UNMODELED, tier out-of-domain: the engine explicitly drops enemy ATK▼/DEF▼ debuffs (src/engine/sim.ts — they cannot affect damage dealt at DEF=0; the boss never attacks into our numbers). It is NOT damageTakenPct (that is 'boss takes more damage' — a different mechanic). Recipe if boss attacks are ever modeled: 10s ATK-down on all enemies, applied only when the caster holds 15 Tomato stacks at her own burstCast.
- Zero damage lines, zero weapon-state modifiers, zero gauge modifiers in the whole kit — cocoa cannot move her own or any teammate's damage. Her committed override is byte-identical in effect to the bare weapon: the board value is entirely defensive and lives outside v1's domain. Any future edit that adds an effect to this file is an over-encoding unless it cites a new primitive + measurement.

## `crow`

- **skill1** (1)
  - [Defensive / utility / mitigation] ■ Affects all enemies. Activates when entering Full Burst. ATK ▼ 19.93% for 10 sec. — no sim channel: the enemy-buff path admits only damageTakenPct/distributedDamagePct > 0; enemy ATK▼ is dropped at dispatch (sim.ts:2295) and the immortal DEF=0 boss deals no damage, so the debuff moves nothing observable (exia precedent)

**Caveats / reasons:**

- skill1: the enemy ATK▼ line is game-real but unenactable in the DPS sim — dropped at dispatch on the DEF=0 basis (boss deals no damage); recorded verbatim in unmodeled and proven damage-neutral by the unit spec (C4)
- burst: 'the enemy with the highest final ATK' collapses to the single scope-lock boss — target selection is scope-trivial in the single-target sim (exia/novel precedent)
- skill2: the DEF▲ line is faithfully encoded but damage-inert in v1 (self DEF never feeds own damage); kept for kit completeness, pinned inert by the unit spec (C2)

## `crown`

- **skill2** (3)
  - [No HP pool / healing domain] Relax: Incoming healing ▲ 4.06% continuously. Stacks up to 20 times.
  - [Defensive / utility / mitigation] Invulnerable for 5 sec.
  - [Defensive / utility / mitigation] Attract: Taunts all enemies for 5 sec.

## `crust`

- **skill1** (6)
  - [Bookkeeping / stacks / resources / stance] Activates when attacking with Full Charge and self is in Maillard status. Affects all allies.
  - [Bookkeeping / stacks / resources / stance] Maillard Duration ▲ 2.5 sec.
  - [Bookkeeping / stacks / resources / stance] Activates when attacking with Full Charge and self is in Blanching status. Affects all allies.
  - [Bookkeeping / stacks / resources / stance] Blanching Duration ▲ 2.5 sec.
  - [Bookkeeping / stacks / resources / stance] Removes Blanching.
  - [Bookkeeping / stacks / resources / stance] Removes Maillard.

- **skill2** (2)
  - [Defensive / utility / mitigation] Affects all allies not in Reliable Cooking status.
  - [Defensive / utility / mitigation] Removes 1 debuff.

**Caveats / reasons:**

- skill1: which stance (Blanching vs Maillard) is active is a user-selectable mode (default Blanching — the sim's RL always full-charges, sim.ts:3121, so Blanching is the only reachable stance; Maillard models the alternate tap-fire / distributed-team playstyle and overrides the sim's default cadence) — the stance-entry attack-pattern triggers (3 normal non-Full-Charge vs 3 Full Charges held >1s) are not simulated; pick the mode matching the real team's play pattern
- skill1: the 'Duration ▲2.5 sec' lines are unmodeled — the stance ATK buff is modeled at saturated 100% uptime, so extending its duration moves no damage
- skill2: the Reliable Cooking 'DEF ▲10% of the skill user's DEF' grant is encoded as an inert defPct 10 block (kit completeness) — the kit is caster-DEF-derived but no casterDefPct StatKey exists, so it is approximated by the target's own defPct; defPct is damage-inert in v1, so this moves nothing. The 'Removes 1 debuff' cleanse and the 'allies not in Reliable Cooking' no-refresh gate are unmodeled (no primitive; inert in v1)
- burst: the Distributed Damage ▲60% (Maillard) and Sustained Damage ▲10% (Blanching) buffs are granted to all allies but only affect distributed-/sustained-flavor hits — inert in a comp without such hits

## `d-killer-wife`

- **skill1** (2)
  - [Partless / AoE / targeting] ■ Activates when attacking with Full Charge for 3 time(s). Affects self.
  - [Partless / AoE / targeting] Gain Pierce for 1 shot.

- **burst** (1)
  - [Partless / AoE / targeting] Buff takes effect depending on the area hit — the PARTS branch ('Allies that hit parts: Damage dealt when attacking core ▲16.26%/10s') is unmodeled (TODO: needs destructible-part modeling; core-only proxy for now — see caveats).

**Caveats / reasons:**

- burst: unrecognized target "allies" — applied to all allies
- skill1: Full Burst Pierce Damage ▲13.55% now targets alliesOfWeapon SR (fixed 2026-07-20, kit-audit Phase C ENACT-NOW — kit targets only Sniper-Rifle-wielding allies). d-killer-wife is herself SR so keeps it; the only board effect was removing the spurious buff from grave (AR, Pierce-tagged during her Prediction window in comp N1), cooling that over-modeled HOT unit grave 1.179→1.162. Fable pre-op APPROVED.
- skill1: the self 'Gain Pierce for 1 shot' (every 3 full charges) is unmodeled — on a partless single-target boss the Pierce tag adds no targets, but a tagged shot would become eligible for the Pierce Damage ▲13.55% Damage-Up during Full Burst (small own-damage undercount)
- burst: the body-branch ATK buff (casterAtkPct 12.19%, 'Allies that hit the body') is GATED on the Wipe Out status: her burst inflicts targetStatus 'Wipe Out' (10s window) and the buff fires at burstCast for that window with requiresTargetStatus 'Wipe Out'. Faithful to '≈71% uptime = 10s Wipe Out of a ~14s rotation'; 12.19 is the kit value, not tuned. Block order matters and is load-bearing: the status-inflicting block precedes the gated block in the burst array, and both fire on the same burstCast frame, so the gate reads a status written earlier that same frame. [2026-07-25 kit-autonomy gauntlet, reconciling-judge REAL-GOTCHA fix] this block previously ALSO carried requiresCore:true — a stranded parts→core proxy gate left behind when the parts branch was deleted (2026-07-17). That inverted the kit: 'Allies that hit the BODY' = non-core on the partless boss, so the body branch must be LIVE whenever Wipe Out is up (maximally live at coreHitRate 0, where every hit is a body hit), NOT gated OUT by requiresCore. requiresCore was REMOVED from this block (board-inert at the scope-lock coreHitRate 1 — byte-identical totals). The requiresCore proxy now belongs ONLY on the parked parts branch (below), where it will gate the parts→core mapping once destructible parts are modeled. TODO PARTS: the parts branch 'Allies that hit parts → coreDamagePct 16.26%' still needs destructible-part modeling (currently core is the only modelable 'area'); wire it as requiresTargetStatus 'Wipe Out' + requiresCore (parts→core proxy) + a parts-hit trigger when parts enter scope.
- burst: [SKIPPED-CONDITIONAL, fixed 2026-07-17] the parts branch 'Allies that hit parts: Damage dealt when attacking core ▲16.26%/10s' is parts-gated — on the partless v1 scope-lock boss no ally can hit parts, so it can never be earned. It was previously modeled as an ungated all-ally coreDamagePct buff, which over-credited every ally's core bucket (core hits DO exist on a partless boss's core). Now REMOVED from the effects array (repo convention for v1-partless-inert lines, cf. brid's Wind-Code debuffs); the body branch 'Allies that hit the body: ATK ▲12.19% of skill user's ATK' (casterAtkPct, always active on the partless body) is KEPT. Re-enable the parts branch (as a parts-hit-gated coreDamagePct) only for a boss with destructible parts (OUT OF SCOPE for v1).

## `d`

- **skill1** (2)
  - [No HP pool / healing domain] Recovers 3.52% of attack damage as HP, lasts for 15 sec.
  - [No HP pool / healing domain] Additionally recovers 16.5% of ATK damage as HP, lasts for 15 sec.

**Caveats / reasons:**

- skill2: 'Gains immunity to Stun for 36.95 sec' is defensively INERT in v1 (no CC model; the boss never stuns) — it is carried as the `stunImmune` resource window (seed +1 at frame 0, decrement at t=36.95s via interval) ONLY because her burst's Full Burst Duration extension gates on it; the all-ally scope of the immunity itself contributes nothing at scope
- skill1: both lifesteal lines are UNMODELED verbatim — self-targeted HP recovery with no HP pool modeled and no consumer reachable (recovery triggers fire only when their OWNER receives a heal)
- burst: the Full Burst Duration ▲5.04s extension fires at most once per battle — her burst CD (40s) exceeds the immunity window (36.95s), so only a cast inside the window is extended (in practice her first)

## `delta-ninja-thief`

- **skill2** (4)
  - [Defensive / utility / mitigation] Effect 2: Attract: Taunt all enemies continuously.
  - [Defensive / utility / mitigation] Effect 1: Ninjutsu Camouflage: Prevents being targeted by single-target attacks for 10 sec. This effect is removed upon taking a direct hit.
  - [Other] Ninjutsu IFAK lasts for 4 sec.
  - [Other] Effect 1: The maximum amount stored is equal to 165.28% of the skill user's final ATK.

- **burst** (2)
  - [Defensive / utility / mitigation] Next shield's HP ▲ 20.13% for 10 sec.
  - [Defensive / utility / mitigation] Maximum Accumulation of Ninjutsu IFAK ▲ 20.13% for 10 sec.

**Caveats / reasons:**

- skill2: Defender-count formation branch is user-selected via modes ('solo defender' is the default = modes[0]; 'auto' disables the branch since the engine cannot auto-detect Defender count) — not auto-detected from the squad; pick 'with defender ally' when another Defender is present
- skill2: IFAK all-ally heal uses the engine's timed-interval trigger ({kind:'interval', sec:4}, first fire t=4); unmeasured only whether the stored heal releases on the 4s boundary or re-arms after a gap
- skill2/burst: shields and heals are event-only (no HP pools) — the shield-size and IFAK-accumulation ▲20.13% riders therefore have no modeled effect

## `delta`

Delta is a Wind sniper-rifle Burst-II Defender whose kit is pure survivability and threat redirection: Skill 1 raises her own Max HP after every full-charge shot, Skill 2 raises her own DEF when she casts her burst, and the burst itself deploys a Decoy avatar carrying most of her Max HP while taunting every enemy. The sim models the two self-stat buffs (both offensively inert — her damage is entirely her bare SR weapon) and documents the decoy and taunt as unmodeled: the boss never acts, there is no avatar/threat/aggro model, and the burst deals no damage.

- **burst** (2)
  - [Defensive / utility / mitigation] Decoy: Creates an avatar with 91.68% of the skill user's final Max HP that lasts for 10 sec.
  - [Defensive / utility / mitigation] Attract: Taunts all enemies for 10 sec.

**Caveats / reasons:**

- skill1: Max HP ▲ 8.82% is modeled as targetMaxHpPct on shotFired (every SR pull is a full charge); offensively inert in v1 — no atkOfMaxHpPct, no HP pool
- skill2: DEF ▲ 51.42% is keyed to her OWN burstCast ('when using Burst Skills' = own cast, not fullBurstEnter); offensively inert in v1
- burst: both 'Decoy' (avatar) and 'Attract' (taunt) are UNMODELED — no avatar/threat/aggro model; the burst deals no damage and must never be encoded as a shield (shielded-trigger contamination)
- weapon: reloadFrames 111 is an unmeasured datamine estimate (SR charge cadence is the engine's measured universal bolt-recovery rule)

## `diesel-winter-sweets`

- **skill2** (4)
  - [Partless / AoE / targeting] Activates when an ally or self destroys an enemy's part. Affects all allies (except self).
  - [Defensive / utility / mitigation] Mute: Gains immunity to Noise Pollution continuously. Stacks up to 3 times.
  - [Partless / AoE / targeting] Activates when an ally or self destroys an enemy's part. Affects self.
  - [Bookkeeping / stacks / resources / stance] Sustained Damage ▲ 68.04% for 15 sec.

- **burst** (4)
  - [Bookkeeping / stacks / resources / stance] Activates while the skill user is in Highlight status. Affects all allies (except self).
  - [Inert / zero damage in v1] Noise Pollution: Hit Rate ▼ 100% for 1 sec.
  - [Bookkeeping / stacks / resources / stance] Affects all allies if the skill user is in Highlight status.
  - [Inert / zero damage in v1] Mute stacks ▼ 1.

**Caveats / reasons:**

- skill1: Intro/Highlight sustained is gated by ownBurstGate ('cast'=Intro 60.19, 'notCast'=Highlight 235.03) on fullBurstEnter — the engine's canonical example for this line (types.ts:368). Comp-dependent and faithful: sole/actual burster -> Intro every FB; never-bursts (2026-07-16 comp N5) -> Highlight every FB. This FIXES the prior Intro-only hard-coding that was the confirmed root cause of the 0.793 COLD (>15%) on N5. The kit's 'for the first time' is a once-per-battle latch; ownBurstGate is per-rotation, exact on the clean graded comps and divergent only in an ungraded alternating multi-B3 comp (flag1)
- skill1: the permanent Crit Damage +20.28% is a single ungated block (same value in both Intro and Highlight), re-applied every Full Burst but capped at maxStacks 1 -> never stacks (refresh); the Intro/Highlight choice moves only the sustained tier
- skill2: the Full-Charge Sustained +318.14% x2 (3s) LAPSES across the reload+charge gap (~3.35s > 3s) so stacks reset to 1 each magazine; the RL cadence tuple (chargeFrames 60 / reloadFrames 141) is the unverified datamine driving this (flag3)
- burst: the Highlight-gated Noise Pollution (ally Hit Rate -100% for 1s) is a real damage COST of the Highlight tier but is documented, not modeled — engine hitRatePct is the core-hit-lift channel R(hr)=(K*scale/2)(1-hr/100) and cannot express 'miss everything' (engine-gap; encoding -100 would model a different, smaller mechanic). Inert in the clean never-burst Highlight case (comp N5) because she never casts her burst there (flag2)

## `diesel`

- **skill1** (4)
  - [Defensive / utility / mitigation] Activates when attacked in Attract status. Affects self.
  - [Defensive / utility / mitigation] Recovers 12.96% of the skill user's final Max HP as HP.
  - [Defensive / utility / mitigation] Activates after landing 150 normal attack(s) in Attract status. Affects self.
  - [Defensive / utility / mitigation] Stack count of buffs ▲ 1.

- **burst** (1)
  - [Defensive / utility / mitigation] Attract: Taunt all enemies for 10 sec.

**Caveats / reasons:**

- skill2: the max-stack ally effect (Reload 86.62% + Pierce Damage ▲30% for 10s) is keyed to hitCount:700 as the engine's nearest primitive for 'reaches 10 simultaneous Strawberry Candy stacks then removed' — a cumulative-cycle approximation (ade-agent-bunny precedent), NOT a true stack-threshold trigger. With a 10s stack duration, reachability of 10 simultaneous stacks is measurement-gated on MG cadence (⚑1); pierceDamagePct is inert unless an ally has pierce-tagged attacks
- skill2: the hitCount:700 trigger does NOT consume/reset the Strawberry Candy stacks — the engine has no cross-block stack-removal primitive, so the real kit's sawtooth (build to 10 -> consume -> rebuild from 0) is modeled as a continuous peak hold (magazine stays near +567%). This would OVER-credit firing uptime during the real rebuild phase, BUT the maxAmmoPct damage channel SATURATES (verified in the unit spec: 56.7 and 28.35 x10 stacks land byte-identical totals — any sufficient boost already outlasts the reload windows that matter in 180s), so the missing reset is behaviorally inert in this fixture (⚑1b). recipe = a true 'remove stacks of buff X on trigger Y' primitive + a focus video confirming the sawtooth
- skill2: 'Reload 86.62% of the magazine' resolves (engine instantReload) against the CURRENT buffed magazine (maxAmmo() at the consume frame), not the base 300 — kit-ambiguous which is intended; flagged, not silently picked (⚑1c)
- skill2: Strawberry Candy stack-REFRESH semantics are assumed standard (a new stack refreshes the older stacks' 10s timers, so sustained MG fire holds 10 stacks) — adopted from the S6 blind override (kimi S7 judge verdict). If a new stack does NOT refresh, the 10-cap is unreachable at any plausible MG cadence and the effective ammo lift is ~2-3 stacks, not 10; the saturation result (56.7 ≡ 28.35 in totals) bounds the damage impact either way. recipe = a focus video observing whether the Candy icon refreshes or accrues independent per-stack timers (⚑1d)
- skill1: DEF ▲25.92% (fullBurstEnter, self, 10s) is faithfully encoded but inert in v1 — self DEF does not feed a Defender's own damage (defPct is the Endurance-cube channel)
- burst: Max HP ▲100.05% (burstCast, self, 10s, targetMaxHpPct) is faithfully encoded but inert — diesel has no atkOfMaxHpPct conversion, so the self Max-HP grant moves no damage
- cadence: MG rate_of_fire (60 -> 4200 datamine) + reloadFrames 151 are unverified datamine driving the Strawberry Candy stack accrual + the 700-NA max-stack timing (⚑2)

## `dorothy-serendipity`

- **skill1** (2)
  - [Weapon state / range / ammo / CDR] Hit 160 pellets: Expands Pierce range 200% 3 rounds
  - [Weapon state / range / ammo / CDR] Hit Rate ▲ 98.18% 3 rounds

## `dorothy`

- **burst** (1)
  - [Missing engine primitive / trigger] Manifestation: Cooldown of Skill 2 ▼ 18 sec, lasts for 10 sec. [⚑ skill2-CDR; no primitive to dynamically shorten the interval:20 S2 timer for the 10s window, and no clean phase-independent reduction (extra-cast count depends on burst timing within the S2 cycle). Estimate: S2 20s->~2s for 10s = ~5 extra 216% distributed nukes ≈ +1080% final ATK distributed per burst. Recipe: add a skill2CooldownReductionSec buff stat read by the interval-trigger scheduler to shorten its period while active. Tier 2 (scoped-buff).]

**Caveats / reasons:**

- skill1(L2): 'during Manifestation' self-state gate is NOT enforced — partsDamagePct is inert in v1 (no boss parts), so the gate moves no damage; modeled ungated on lastBullet for fidelity
- burst(L3 Brand): modeled AT-CAP (flatDamage 8900.83% distributed delaySec:10) — the cap binds with ~11× headroom in any realistic Dorothy comp (team ~98M/10s vs ~29M raw cap); residual ⚑ = the at-cap assumption + the redistribution pipeline-re-multiplication semantics
- burst(L1): 'Manifestation: Cooldown of Skill 2 ▼ 18 sec, lasts for 10 sec' is UNMODELED — no skill2-CDR primitive to dynamically shorten the interval:20 timer, and no clean phase-independent reduction; ⚑ ≈ +5 extra S2 nukes (~1080% distributed) per burst window

## `e-h`

- **skill2** (3)
  - [Partless / AoE / targeting] Effect 2: Activates when an ally or self destroys a destructible projectile. Scraps ▲ 1 continuously, up to a maximum of 10.
  - [Partless / AoE / targeting] Effect 3: Activates when an ally or self destroys an enemy's part. Scraps ▲ 5 continuously, up to a maximum of 10.
  - [Partless / AoE / targeting] Effect 4: Activates when an enemy is neutralized. Scraps ▲ 2 continuously, up to a maximum of 10.

**Caveats / reasons:**

- skill1: the 'fewer than 4 homemade magazines' craft gate is encoded as the scrap≥10 resourceGate plus the magazine pool clamp (max 4) — the engine allows ONE resourceGate per block, so the magazine-side half of the condition is carried by the pool ceiling. The only misbehavior this simplification could produce is spending 10 Scrap for no magazine when magazines are already at cap; that state is unreachable in v1 scope (the battle-start seed is the sole scrap source, so exactly one craft ever fires) — damage-inert, re-encode the explicit gate if out-of-scope scrap income (projectile/part/neutralize events) is ever modeled.
- burst: 'Max Ammunition Capacity: 1 x the number of homemade magazines' is encoded at its in-scope value (maxAmmo 1 / maxShots 1) — magazines are fixed at 1 in v1 (see note). The DYNAMIC magazine→ammo link is out of scope, not dropped. ⚑ tier 2; estimate: exact at scope, wrong only on a boss with scrap-yielding parts/projectiles/adds (would under-count swap rounds: 1 vs magazine count); recipe: a resource-scaled swap-ammo engine primitive (weaponSwap.maxAmmo/maxShots read from a named resource pool at cast) — one shared primitive serves any future counter-fed weapon.
- skill2: E5 'Activates when obtaining Scraps' is encoded as a fused passive (frame 0, 15s window) — in scope scraps are obtained exactly once (the battle-start seed), so the activation time and the single 15s expiry are exact. Refresh-on-later-gain awaits the same out-of-scope scrap events (projectile/part/neutralize); the elemAdvantageDamagePct stat is advantage-gated by construction (sim.ts elem bucket: counted only when BEATS[unit element] === boss element), verified byte-identical with the line removed vs a Fire boss.
- skill2: E2/E3/E4 scrap sources (destructible projectile +1, enemy part +5, enemy neutralized +2) are VERBATIM in unmodeled — the v1 sim has no projectile entities, no destructible parts, and the single immortal boss is never neutralized inside the fight, so these triggers never fire; encoding them would require event classes the engine does not emit. Inert at scope (the scrap pool sits at 0 after the frame-0 craft).
- burst: on swap exit ('all rounds fired') the engine forces an empty-belt reload before SMG fire resumes (~1.35s at the datamined 81 reload frames) — the in-game weapon-restore behavior at swap deactivation is unmeasured; this is the shared weaponSwap exit convention (snow-white-heavy-arms et al.), not an E.H.-specific encoding choice. ⚑ low: one reload per cast inside the 430.05% window; refine against an E.H. recording.

## `elegg-boom-and-shock`

- **skill1** (4)
  - [Partless / AoE / targeting] Activates at the start of battle. Affects 1 random enemy.
  - [Missing engine primitive / trigger] Possession lasts for 6 sec.
  - [Missing engine primitive / trigger] Ability: Find and capture ghosts possessing the enemy.
  - [Missing engine primitive / trigger] Required hit count: 100 time(s) in total, cumulative across all allies.

- **burst** (2)
  - [Partless / AoE / targeting] Affects random enemy units
  - [Bookkeeping / stacks / resources / stance] Maintains at least 1 ghost.

**Caveats / reasons:**

- skill1: ghost accrual is interval:6 (the 'Recurring interval: 6 sec' capture CAP; <=1 ghost/6s, pool peaks ~7 while bursting); the 100-cumulative-team-hit gate is folded as clearing inside 6s for a full team (⚑1). The ALTERNATIVE teamAmmo:100 accrual (no cap) over-credits ~1.7x HOT and is rejected here
- skill1: the >=1/>=4 tier buffs are gated on the live pool via a teamAmmo:100 pool-CHECK trigger (event-driven, to avoid perturbing the team-generator beam search) + durationSec:6; the >=4 tier (35%) is live only under elemental advantage (⚑3) and lapses ~6s after the pool drops below 4 (⚑ lag)
- skill2: the 1100% at-cap nuke is gated on pool>=13; it fires 0x while bursting on cooldown (pool peaks ~~7) and from t~~78 in a never-burst context (teamAmmo-triggered cadence — fires per 100 rounds at cap, a ⚑ over-fire vs strict per-capture). Known 1-proc post-add off-by-one (low, 0 board impact)
- burst: the 6-hit and 13-hit branches (six / thirteen discrete 800% sequential hits) are resource-gated on the pre-spend pool; while bursting on cooldown the burst is always the 6-hit branch (pool<13); the 13-hit branch is provably reachable at pool=13. 'Maintains at least 1 ghost' is inexpressible (pool min:0)
- burst/skill2 riders ship crit at the engine flatDamage default (unset); SSOT says function-type damage crits at the caster's rate by default — verify/align repo-wide before changing
- cadence: datamined MG fire rate + reloadFrames 171 are unverified (mandatory cadence flag, ⚑2)

## `elegg`

- **skill1** (3)
  - [Partless / AoE / targeting] Activates at the start of battle. Affects all allies.
  - [Partless / AoE / targeting] When attacking an enemy projectile, damage dealt to that projectile ▲ 59.66% continuously. — OUT-OF-DOMAIN: the sim models no enemy projectiles to intercept; inert to DPS.
  - [Partless / AoE / targeting] Affects the target and 2 surrounding enemy unit(s) if the target is in BOOM Install. — the '+2 surrounding' spread is out-of-domain in the single-target sim (only the primary target/boss receives the 158.65% proc). The 'if the target is in BOOM Install' conditional governs that SPREAD (Affects-clause), NOT the proc's activation — the proc fires every 100 normal attacks regardless of BOOM Install (contrast S2a, whose gate is in the activation clause).

- **burst** (1)
  - [Defensive / utility / mitigation] BOOM Install: DEF ▼ 35.64% for 10 sec. — the DEF▼ MAGNITUDE is inert (the engine drops enemy DEF debuffs, boss DEF≈0, sim.ts). NOT encoded as damageTakenPct (that would be a ×1.3564 whole-damage over-credit). The BOOM Install status WINDOW itself IS modeled (targetStatus) as the gate for the S2a rider.

**Caveats / reasons:**

- skill1: the 158.65% distributed proc (S1b) is UNGATED on status — it fires every 100 normal attacks (hitCount:100) regardless of BOOM Install; the 'if the target is in BOOM Install' clause governs only the +2-surrounding AoE spread, which is out-of-domain in the single-target sim (⚑4). Proc COUNT is cadence-dependent (⚑1) though every proc is the exact kit coefficient
- skill1: the anti-projectile damage line (S1a, ▲59.66% vs enemy projectiles) is OUT-OF-DOMAIN — the sim has no enemy projectiles; it is inert to DPS and sits verbatim in unmodeled
- skill2: the 13.09%-of-caster ATK team buff (S2a) IS gated on BOOM Install (activation-clause gate, requiresTargetStatus) + a 60-normal-attack counter (hitCount:60); it is DEAD outside the BOOM windows. Proc count is cadence/phasing-dependent and the engine's fire-time gate approximates the literal window-scoped-accrual reading (⚑1/⚑2)
- skill2: the battle-start team burst-gauge fill (S2b, fillGauge 100) is modeled as a once-per-battle passive frame-0 fill ('stage target appears' = t=0, ⚑3); the gauge pipeline emits no event so it is asserted behaviorally via the earlier first burstCast. This is the kit's biggest board lever (advances the first Full Burst for the whole team)
- burst: the DEF ▼35.64% magnitude is inert (engine drops enemy DEF debuffs) and is NOT damageTakenPct; only the BOOM Install status window is load-bearing (it gates S2a)
- cadence: datamined MG fire rate + reloadFrames 171 are unverified (mandatory cadence flag, ⚑1)

## `emilia`

- **burst** (1)
  - [Partless / AoE / targeting] Explosion Range ▲ 101.24% for 10 sec.

**Caveats / reasons:**

- ⚑ BOTH S1 EFFECTS ARE CURRENTLY INERT — engine gap, not an encoding choice (docs/engine-modeling-gaps.md theme 21). 'Activates when attacking with Full Charge ... for 1 round(s)' means 'buff my NEXT round', which the engine cannot express: firePull dispatches a pull's shotFired blocks and then, later in the SAME pull, decrements every round-scoped buff the unit holds — including the one that pull just applied. A shotFired + durationShots:1 buff therefore reaches zero rounds. Proven by counterfactual on the control comp: with durationShots 1 her charge bucket only ever reads {2.5, 15.5053} and she fires 116 shots; bumping ONLY durationShots to 2 yields {2.5, 2.6206, 15.6259} and 128 shots. That counterfactual is re-runnable — scripts/tests/units/emilia.test.ts, the 'theme 21 ... CANARY' block, which also fails the moment the gap closes so this caveat cannot go stale unnoticed. The encoding here is the faithful one and matches the roster's prior art (zwei, phantom and vesti-tactical-upgrade all pair shotFired with the literal kit round count and lose the same round); durationShots:2 would be a fudge meaning 'the next TWO rounds'. ESTIMATE while it stands: she is COLD by roughly the whole S1 contribution — ~10% fewer shots (116 vs 128) and a charge bucket of 2.5 instead of 2.6206 on ordinary shots (-4.6%), so on the order of -12% to -15% of her total. RECIPE: skip the round-count decrement for buffs applied on the frame being decremented (e.g. record an appliedFrame on the buff entry); it moves four units, so it is a batched engine change with its own board A/B, not an override edit.
- ⚑ S1 Charge Damage is encoded STATIC at 12.06 (= 2.01 x her base Max Ammunition Capacity of 6). The kit scales by LIVE 'final Max Ammunition Capacity', which is 9 while S2's +3 window is up, so the faithful value inside a Full Burst is 18.09 — a +6.03pp charge-bucket shortfall there. No primitive scales a buff by the computed maxAmmo(): `perResource` reads named resource pools, not a derived stat. ESTIMATE: the charge bucket reads 2.6206 instead of 2.6809 on shots inside the 10s window (-2.25% on those hits); the window covers roughly a quarter of a 180s fight, so whole-fight ~-0.5%. RECIPE: a `perMaxAmmo: { mult }` buff source read live in sim.ts stat(), or a resource pool mirroring maxAmmo(). The encoding is ALSO basis-specific — it assumes base ammo 6 with no cube/overload ammo lines, which is the scope-lock basis but not the web app's OL configurations; scripts/tests/units/emilia.test.ts pins the arithmetic against characters.json so it cannot drift unnoticed.
- The burst's 'Charge Speed ▼ 300%' is MODELED, as chargeSpeedPct -300 with durationShots 1 alongside the +1300.53 Charge Damage in the same burstCast block — the kit pairs them as one Function ('Decreases Charge Speed and increases Charge Damage for 1 shot(s)'). Charge Speed is subtractive on charge TIME in this engine, so -300 means the nuke's charge takes 60 x (1 - (-300)/100) = 240 frames instead of 60: a real downside, correctly costed, not an approximation.
- ⚑ The S2 rider generates one skill-damage impact of burst gauge, the engine-wide treatment of function damage (flatDamage procs and DoT ticks; MEASURED for maiden-ice-rose's per-shot rider). Whether a %-of-hit repeat specifically generates energy is UNMEASURED. ESTIMATE: it roughly doubles her per-shot gauge contribution, so a wrong call here moves full-burst timing rather than her damage. RECIPE: a focus recording of emilia — count full bursts over the fixed 180s, or read the gauge-bar slope, against the same cadence.
- ⚑ CADENCE TUPLE (ALWAYS-⚑): chargeFrames 60 / reloadFrames 141 / ammo 6 shipped from the datamine, plus the engine-wide 22-frame release latency (her weapon's input_type is 'UP', so she is not an autofire-charge unit). RECIPE: rounds-per-minute plus the reload gap off any focus video.
- The burst's Explosion Range ▲101.24% is splash RADIUS, for which there is no primitive, and it is inert against the single partless scope-lock boss (nothing to splash onto). Recorded verbatim in `unmodeled` rather than approximated with a damage stat.

## `emma-tactical-upgrade`

- **skill1** (1)
  - [Defensive / utility / mitigation] Exposure (Cannot be removed) — Effect: Attract: Taunt all enemies continuously.

- **skill2** (1)
  - [Bookkeeping / stacks / resources / stance] Bonus effects when applying AS Formation to self — Effect 3: Affects self. Exposure activation disabled continuously.

- **burst** (1)
  - [No HP pool / healing domain] Enhanced Environment Setup — Effect 2: Incoming healing ▲ 29.04%. Effect 2 Target(s): All allies

## `emma`

- **skill1** (1)
  - [No HP pool / healing domain] ■ There is a 5% chance to activate when attacked. Affects all allies. Recovers 10.77% of the skill user's final Max HP as HP.

- **skill2** (1)
  - [No HP pool / healing domain] ■ Activates when above 90% HP. Affects all allies. Incoming healing ▲ 13.33% continuously.

**Caveats / reasons:**

- ⚑ HoT tick granularity: the burst's lifesteal line is stated 'over 5 sec' with NO per-second clause, so ticks:5/intervalSec:1 is an ESTIMATE (marciana's 'over 3 sec' precedent). Tick count is the only thing that block contributes (no HP pool), and it directly scales how many times a teammate's on-recovery consumer fires per emma burst — over-stating ticks over-credits that teammate.
- Heal MAGNITUDES (skill1 10.77% of the caster's final Max HP; burst 39.6% of the caster's final Max HP instant + 39.6% of attack damage lifesteal) are recorded here but NOT modeled: the 'heal' effect emits a recovery event with no HP amount, and v1 has no HP pool. Both burst lines are implemented for their TANDEM value only (they fire allies' 'recovery' triggers).
- skill1's 'when attacked' trigger has NO engine primitive (TriggerDef has no on-damaged kind) and the v1 boss never acts — the 5% proc can never fire at scope lock. An interval-cadence approximation would fabricate a proc rate from nothing; the line is omitted, not proxied (jackal/maiden/admi attacked-cluster precedent).
- skill2's 'above 90% HP' gate is trivially SATISFIED in v1 (no incoming damage ⇒ everyone sits at full HP), so the omission reason is NOT a dead gate — it is the missing incoming-healing stat primitive (no StatKey scales heal amounts the engine never quantifies). If an HP pool ever lands, the condition degenerates to a passive.
- Zero damage lines and zero weapon-state modifiers in the whole kit — emma is the MG clean-weapon basis cell (harness CLEAN_WEAPON_TEAMS.b): this override is proven damage-neutral vs the bare weapon (CW1 in clean-weapons.test.ts pins the bursts-off solo half; her unit test pins the bursts-on in-team half). Her entire board footprint is cross-unit: recovery events on her own Burst I casts.

## `epinel`

- **skill1** (1)
  - [Partless / AoE / targeting] Activates when killing an enemy. Affects self. Total Noob: ATK ▲ 13.86%, stacks up to 5 time(s) and lasts for 15 sec.

- **burst** (1)
  - [Bookkeeping / stacks / resources / stance] Activates when Total Noob is at max stacks. Affects the same targets. Deals 457.87% of final ATK as additional damage.

**Caveats / reasons:**

- skill1: 'Total Noob' (ATK ▲13.86% ×5 stacks on killing an enemy, 15s) is UNMODELED — the engine has no kill event and the scope-lock boss is immortal with no adds, so the stacks can never accrue; provably zero contribution in every sim run (⚑1)
- burst: the 'Total Noob at max stacks' conditional (457.87% additional damage) is UNMODELED with the pool that feeds its gate — zero contribution at scope; in real multi-add content the gate is effectively always open (⚑2)
- skill2: the crit-window uptime (~65–80%) rides the datamine cadence tuple (ammo 120 / reloadFrames 81 / RoF 1440) — unverified for this unit (⚑3)

## `ether`

- **skill1** (1)
  - [Defensive / utility / mitigation] ■ Affects 1 allies with the lowest remaining HP. Damage Taken ▼ 52.5% for 5 sec.

- **skill2** (1)
  - [Defensive / utility / mitigation] ■ Affects the same enemy unit(s). Activates during Full Burst. DEF ▼ 9.38% for 6 sec.

**Caveats / reasons:**

- skill2: the damage block has NO activation clause and a datamined 13s skill cooldown → interval:13 auto-cast (novel/neve/snow-white precedent; the schema's interval guidance for clause-less CD-bearing lines). 'Activates during Full Burst' sits in the SECOND ■ block's header and governs that block alone (the DEF▼ line, unmodeled below) — the house prose convention attaches an activation clause to the block whose header carries it (ada/kurumi both head their FB-keyed blocks with it). A purely FB-keyed reading also cannot explain the 13s CD: ada/kurumi's purely FB-keyed skill2s have CD null, and an FB cycle is >=20s, so no CD could gate them. ⚑ first-fire phase t=13 (vs t=0) is the engine interval CONVENTION (neve/snow-white/novel precedent) — pin from footage if a consumer's cadence is ever popup-read.
- skill2: the '3 enemy unit(s) with the highest final DEF' targeting collapses to the single scope-lock boss — v1 fields one immortal enemy ({kind:'enemy'} documented stand-in; novel precedent). It is a multi-target SPREAD, NOT a ×3 hit multiplier.
- skill2: the DEF ▼9.38%/6s enemy debuff is UNMODELED — no dynamic enemy-DEF-reduction primitive (cfg.bossDef is fixed; damageTakenPct is a different bucket; novel / mast Sea-Breeze precedent). At the 140-DEF scope-lock boss this is 13.13 flat DEF ≈ ~0.03% team damage — minor, not load-bearing (⚑2). Recipe if a primitive lands: a boss-DEF-reduction debuff (9.38% for 6s, refreshed at every FB entry) feeding the subtractive DEF term.
- skill1: 'Damage Taken ▼52.5% for 5s' on the 1 lowest-remaining-HP ally is UNMODELED — v1 models no ally HP pool and no incoming boss damage, so ally-side mitigation can never move anything (sakura-suzuhara S2 precedent). The boss-facing damageTakenPct channel is deliberately NOT used — wrong direction AND wrong target; encoding it would manufacture a phantom team damage change on the 15s skill cadence (⚑1).
- burst: the shield carries no modeled HP AMOUNT (v1 boss deals no damage) — the encoded substance is the SHIELDED event + the 5s shield-state window on the leftmost-3 targets (fires teammates' 'shielded' triggers / requiresShielded gates; snow-crane precedent). The 'lowest remaining HP' targeting resolves to the leftmost-3 documented stand-in (no HP pool in v1); shield amounts and true lowest-HP selection are measurement-gated on an HP-pool model.
- Ether's modeled kit is one skill-damage rider + one shield-event channel; her sim output is dominated by her bare SG weapon. Her real tank value (S1 mitigation + S2b DEF shred) lives in the two documented engine gaps (⚑1/⚑2).

## `eunhwa-tactical-upgrade`

- **skill1** (3)
  - [Defensive / utility / mitigation] Camouflage: Prevents being targeted by single-target attacks for 5 sec. This effect is removed upon taking a direct hit. (Activates when using Burst Skill. Affects self.)
  - [Defensive / utility / mitigation] Camouflage: Prevents being targeted by single-target attacks for 5 sec. This effect is removed upon taking a direct hit. (Activates when attacking with Full Charge during Full Burst. Affects self.)
  - [Defensive / utility / mitigation] Activates only when in Camouflage status. Affects self. Normal attacks deal true damage continuously. (the FLAVOR-CHANGE half of S1-L3; the 'True Damage ▲ 42.24% continuously' half IS modeled as self trueDamagePct 42.24 — see caveats)

- **burst** (1)
  - [Partless / AoE / targeting] Special note: Fires an Exploding Bullet dealing area-of-effect damage. (splash radius inert vs the single partless boss; the cannon HIT itself is modeled as the weaponSwap shot)

**Caveats / reasons:**

- ⚑ MEASUREMENT-GATED (tier 2): S1-L3 'Normal attacks deal true damage continuously' — the FLAVOR CHANGE of her sustained SR normals to true damage is UNMODELED. The engine's only true-normal mechanism is weaponSwap.trueNormals, which is (a) windowed (needs a durationSec) and (b) cannot coexist with her burst cannon swap (the engine holds a single swap slot — a fight-length trueNormals swap would be clobbered by the cannon swap on every burst and never restore). There is also no camouflage SELF-status to gate it (the engine has no self-status channel). Estimate: as shipped, her sustained SR normals stay NON-true, so the self trueDamagePct 42.24 buff is near-inert outside the burst cannon shot (it pays off fully on the cannon, which IS true-flavored); the kit intends ~camouflage-uptime fraction of her main SR DPS to be true-flavored and amplified. Camouflage uptime is partial (5s per 20s burst + Full-Charge-during-Full-Burst refreshes, roughly half the fight). Recipe: a permanent trueNormals flag that survives weapon-swap coexistence + a camouflage-uptime model (or a targetStatus-proxied camouflage window driving a windowed trueNormals swap), then popup-read the true-damage popup count / camouflage uptime in an eunhwa-tu recording. The trueDamagePct 42.24 buff itself is encoded and exact for the cannon payoff.
- ⚑ MEASUREMENT-GATED (tier 2): the burst cannon swap DURATION is kit-silent — the kit gives 'Max Ammunition Capacity: 1 round' but states neither a 'for N sec' window nor 'deactivates when all rounds fired'. Estimate: durationSec 10 (the Full-Burst-window convention shared with e-h / red-hood); the 1-round magazine cycles over that window (fire / 141f reload / fire …) for ~6 true-damage cannon shots per burst. A shorter real window fires fewer shots (damage is roughly linear in shot count: 10s ≈ 6 shots ≈ double the single-shot reading). Recipe: an eunhwa-tu recording — count cannon popups per burst and the frame her base SR fire resumes; rescale durationSec to match.
- burst: 'Damage Taken ▲27.87% for 10s' is an ON-HIT rider of the cannon shots (shotFired + swapGate:'swapped'), so it lands on the first cannon shot (~0.3s after cast) and refreshes per subsequent shot — ~96% team uptime across the fight. The first cannon shot of each burst does NOT benefit (the debuff applies AFTER that shot's damage resolves, the shotFired convention), faithful to 'target(s) hit'.
- burst: on swap exit (durationSec expiry) the engine forces an empty-belt reload before SR fire resumes — the shared weaponSwap exit convention (e-h / snow-white-heavy-arms), not an ETU-specific choice; the in-game weapon-restore timing at swap deactivation is unmeasured.
- skill2: the S2 bonus 'when applying LT Formation to self' is gated on emma-tactical-upgrade presence via teamHas.slugs (auto, presence ≡ formation applied). emma-tu's MIRROR bonus ('when applying AS Formation to self') is behind a manual mode on emma-tu (default OFF) — an asymmetry in the landed encodings: ETU's bonus auto-fires with emma-tu present, emma-tu's requires selecting its AS mode. Reconcile to a single auto-gate convention if both sisters grade a team together.

## `eunhwa`

- **skill2** (1)
  - [Defensive / utility / mitigation] ■ Activates after firing the last bullet. Affects the target. DEF ▼ 29% for 5 sec. — no sim channel: the enemy-buff path admits only damageTakenPct/distributedDamagePct and the boss's DEF is the flat constant cfg.bossDef=140 that no debuff scales, so an enemy DEF▼ moves nothing (sim.ts drops it at dispatch; exia precedent). The whole sentence is skipped — an enemy-targeted lastBullet effect has no channel either.

- **burst** (1)
  - [Defensive / utility / mitigation] DEF ▼ 2.43% for 15 sec. — no sim channel: enemy DEF▼ is dropped at dispatch on the constant-bossDef basis (sim.ts 'other enemy debuffs (ATK▼, DEF▼) don't affect our damage with DEF=0'); same basis as the skill2 DEF▼ line

**Caveats / reasons:**

- skill1: both S1 buffs are lastBullet-keyed ROUND-COUNT windows (durationShots 2, no wall-clock expiry) — granted on the frame the magazine runs dry, they survive the 161f reload and cover exactly the first two full charges of the next magazine, then lapse right after the 2nd shot's dispatch (the Nth shot still benefits, then the buff drops at 0 — the standard round-count shape).
- skill1: the nearest-wrong encoding is durationSec:2 — the trigger is reload-start and the reload lasts ~2.68s, so a 2-second timed window expires MID-RELOAD and the line goes silently, totally inert (0 shots ever buffed). scripts/tests/units/eunhwa.test.ts pins the round-count shape behaviorally (duty cycle + 9-frame charge-cycle shortening + magazine-0 untouched).
- skill2: 'DEF ▼ 29% for 5 sec' (last-bullet target) is game-real but unenactable — the engine's enemy-buff channel admits only damageTakenPct/distributedDamagePct (sim.ts drops enemy ATK▼/DEF▼ at dispatch) and the boss's DEF contribution is the flat constant cfg.bossDef=140, which no debuff scales. Recorded verbatim in unmodeled; the nearest-wrong laundering (damageTakenPct 29) would fabricate a ~29% team lift the kit never grants, and the spec test pins its absence.
- burst: the 85.62% nuke is burstCast-keyed — pre-FB by engine timing (auto-exempt from the +50% FB major), crits at the caster rate, never cores, never gets the range bonus; 'the 10 enemy unit(s) with the highest final ATK' collapses to one hit on the single partless boss (multi-target selection out of domain, exia precedent).
- burst: 'DEF ▼ 2.43% for 15 sec' is unmodelable on the same constant-bossDef basis as skill2 (recorded verbatim in unmodeled) — in game it would be a minor multiplicative team lift at ~75% uptime; in sim domain its contribution is exactly 0.
- burst: the critRatePct 4.65 buff is keyed to HER burstCast (not fullBurstEnter) — with a second Burst II in the team the two keyings diverge on rotations the other B2 chains; the spec test pins application frames to her casts. Window 15s vs CD 20s ⇒ ~75% team uptime when she casts every eligible chain (the 5s gap is real, not an encoding artifact).

## `exia`

- **skill1** (2)
  - [Defensive / utility / mitigation] ■ Activates when the last bullet hits the target. Affects the target if the skill user is in Collect Hacking Code. ATK ▼ 13.77% for 5 sec. — no sim channel: the enemy-buff path admits only damageTakenPct/distributedDamagePct and the boss deals no damage, so an enemy ATK▼ moves nothing (sim.ts, DEF=0 basis)
  - [Defensive / utility / mitigation] DEF ▼ 13.77% for 5 sec. — no sim channel: enemy DEF▼ is dropped at dispatch on the DEF=0 basis (sim.ts 'other enemy debuffs (ATK▼, DEF▼) don't affect our damage with DEF=0')

- **burst** (1)
  - [Defensive / utility / mitigation] DEF ▼ 2.71% for 5 sec. — no sim channel: enemy DEF▼ is dropped at dispatch on the DEF=0 basis (same as the skill1 DEF▼ line)

**Caveats / reasons:**

- skill1: 'Reload speed is FIXED at a 95% increase' is encoded as an additive reloadSpeedPct buff — the clamp ('fixed') semantics need a stat-clamp primitive the engine lacks; identical to the clamp on any team without a second reload buffer
- skill2: the hackingCode pool has no time decay (kit: 5s per-stack duration) — at her 1.37s full-charge cadence stacks never lapse before refresh, so ramp + steady state match duration-refresh semantics; diverges only if she stops firing >5s
- skill2: stack-duration semantics ⚑ — the engine refreshes the whole buffer on re-application (stacks cap at 5 in sustained fire); if the game runs independent per-stack timers the real steady state is ~2 stacks; board A/B is the outer check
- skill2: the full-charge trigger is shotFired (every SR pull is one full charge — helm/liberalio precedent); verify against an exia focus video if uncharged SR shots ever exist
- burst: 'the 10 enemy unit(s) with the highest final DEF' collapses to the single immortal boss — multi-target selection is out of domain for the single-target sim
- burst: the enemy ATK▼/DEF▼ lines (skill1 13.77%/13.77%, burst 2.71%) are game-real but unenactable — the sim's DEF=0 basis drops enemy ATK▼/DEF▼ at dispatch; they are recorded verbatim in unmodeled

## `flora`

- **skill1** (3)
  - [No HP pool / healing domain] Incoming Healing ▲ 4% continuously. Stacks up to 5 times. — no incomingHealingPct stat exists and v1 models no HP pool, so healing-received scaling is doubly inert (damage-neutral).
  - [Bookkeeping / stacks / resources / stance] ■ Activates after landing 100 normal attacks. Affects all Electric Code allies. Increases the stack count of stackable buffs by 1. — trigger (hitCount:100) + target (alliesOfElement Electric) expressible, but the EFFECT (increment every active stackable buff's stack count by 1) has no engine primitive. ⚑ engine-core (see caveats).
  - [No HP pool / healing domain] ■ Activates when entering Burst Stage 2. Affects all allies in the Peace of Mind state. Max HP ▲ 15.01% of the skill user's max HP (without restoring HP) for 2 sec. — the Max HP STAT is not granted (ally-granted Max HP does not feed a teammate's atkOfMaxHpPct, e3 video rule; 'without restoring HP' so no recovery event). Its CONSEQUENCE is modeled: the 86.95% HP fraction it forces, and the return to max HP 2 sec later, are what the skill2 blocks' `stageEnter{stage:2}` (+ `delaySec: 2`) triggers stand in for.

**Caveats / reasons:**

- skill2 (trigger form) ⚑ derived-deterministic: the three S2 lines are worded as HP triggers ('HP drops to 90% or below', 'reaches max HP', 'a shield is placed in front of this unit'), and v1 models no HP pool. They are keyed to Burst Stage 2 entry instead, because Flora's own S1 forces exactly those HP transitions there: the 2-sec Max HP ▲ 15.01% grant (without restoring HP) drops Peace-of-Mind allies to 86.95% HP at stage-2 entry, and returns them to max HP 2 sec later. The proxy is exact for the self-procced chain; what it does NOT represent is any ADDITIONAL firing driven by real boss damage (a raid boss that damages allies would re-open the 'HP ≤ 90%' trigger between rotations), so this is a floor on the line's real uptime, not a ceiling.
- skill2 (True Damage duration) ⚑ kit-text conflict: modeled at 10 sec per the blablalink prose SSOT; the datamined skill2 table gives 5 sec for the same line. That datamined capture is partial for this unit (it is missing three kit lines outright), which is why prose wins here. ESTIMATE: halving the window would cut this line's Full-Burst overlap roughly in half. RECIPE: a fresh datamine of skill group 24112, or a footage read of the buff icon's lifetime. TIER: open magnitude question.
- skill1 (stack bump) ⚑ engine-core: 'after 100 normal attacks, all Electric Code allies: Increases the stack count of stackable buffs by 1'. ESTIMATE: adds 1 stack to each Electric ally's active stackable buffs once per 100 Flora normal hits; magnitude depends entirely on which stack-ramp buffs are active on those allies (could be large if a stack-ramp buff is present, zero otherwise). RECIPE: an engine 'addStack' effect that increments existing buff stacks by N on a trigger (none exists). TIER: engine-core (new primitive).
- skill1 (Incoming Healing) ⚑ inert: 'Incoming Healing ▲ 4% continuously, stacks 5x' — no incomingHealingPct stat and no HP pool, so it scales only heals received (unmodeled). ESTIMATE: damage-neutral. RECIPE: none for DPS (would need an HP pool + incomingHealingPct stat). TIER: inert/out-of-domain.
- skill1 (Max HP grant) ⚑ modeled by consequence: 'entering Burst Stage 2 -> Peace-of-Mind allies Max HP ▲ 15.01% of caster Max HP for 2 sec (without restoring HP)'. The Max HP stat itself is not granted (offensively inert — ally-granted Max HP does not feed a teammate's atkOfMaxHpPct, e3 video rule — and it emits no recovery event). It is not damage-neutral, though: it is the mechanism that drives the whole S2 chain, which is modeled on `stageEnter{stage:2}` and `stageEnter{stage:2}` + `delaySec: 2` in the skill2 blocks.
- burst/skill1 heals: the HP MAGNITUDES (burst 10.45%, HoT 1%/s) are not modeled (no HP pool) — only the recovery EVENT cadence is, which is what recovery-consumer teammates key off. The interval:1 HoT phase starts at t=1s (engine interval convention 'first at t=sec'); a t=0 first tick would add one extra early recovery event, immaterial to steady-state consumer uptime.

## `folkwang`

- **skill1** (1)
  - [No HP pool / healing domain] Incoming healing ▲ 45.7% for 10 sec.

- **skill2** (1)
  - [Defensive / utility / mitigation] Affects the enemy with the highest final ATK. Taunt for 5 sec.

**Caveats / reasons:**

- ⚑ INTERVAL FIRST-FIRE PHASE (both passives): neither S1 nor S2 carries an activation clause, so both are `interval` triggers on their datamined cooldowns (30s / 20s); the engine convention fires first at t=sec (t=30 / t=20), NOT t=0. The in-game first-fire phase of a cooldown passive is unmeasured for folkwang; recipe: any focus video — does Starting Whistle's shield appear in the opening seconds or only after ~30s? A wrong phase shifts every shielded-trigger consumer's cadence by up to one period.
- ⚑ CADENCE TUPLE (ALWAYS-⚑): AR rate_of_fire 720 / reloadFrames 99 / ammo 60 shipped from datamine; affects her OWN shots only (burst-gauge feed + weapon damage). No kit line keys off her shots, so a wrong cadence rescales nothing kit-side — not escalated.
- Shield MAGNITUDES (S1 13.71% / burst 32.9% of caster final Max HP) are recorded on the shield effects as maxHpPct but not consumed: v1 models no shield HP pool (the boss deals no damage). Each shield effect's durationSec:10 opens the recipients' shieldedUntilFrame windows and fires their 'shielded' triggers (naga-style shield-gated kits) — that event/window channel is both lines' entire in-domain surface.
- S2 Max HP line is encoded as targetMaxHpPct — the schema's stat for 'Max HP ▲ X%' kit lines (blanc/maiden convention) — NOT the raw maxHpPct key: only the CUBE/OL-extra path converts maxHpPct→maxHpFlat (sim.ts:887); an override buff authored with the raw stat is applied as a stat nothing reads and would silently do nothing (driver-derived; independently re-derived by the S2b blind reviewer claude-fable-5). Self-targeted, so the e3 rule lets it feed her OWN atkOfMaxHpPct — she carries no such line, making the grant offensively INERT in v1; kept for kit completeness (marciana's inert-defPct convention), 10s duration with real downtime between the 20s firings.
- ⚑ HoT TICK COUNT (burst lifesteal): 'Recovers 65.81% of attack damage as HP over 10 sec.' is MODELED as a heal HoT — ticks:10 intervalSec:1 — on the SAME top-2 final-ATK target set as the burst shield, per the marciana convention: marciana's S1 carries the identical construction ('Recovers 10.95% of attack damage as HP over 3 sec.') and her owner-landed gauntlet override encodes it as heal ticks:3/intervalSec:1 with a ⚑-estimated tick count. The tick count (one per second across the 'over 10 sec' window) is the ESTIMATE — in game the recovery is damage-linked and continuous, not clock-ticked; the events exist for their TANDEM value only (they fire the recipients' 'recovery' triggers, crown-type 'when recovery takes effect'). The 65.81% MAGNITUDE is recorded here and NOT modeled — the heal effect carries no HP amount (v1 has no HP pool). Driver initially ruled this line UNMODELED on ada/tia lifesteal-skip precedent; revised to MODEL on 2026-08-03 when the S2b (claude-fable-5), S5 and S6 (claude-opus-5) blind reviewers all converged on the HoT encoding and the marciana precedent was confirmed as the nearest intra-repo analog (ada's skip is pre-gauntlet and residual-flagged in her own gauntlet; alice's lifesteal carries an unmodelable <80%-HP gate that folkwang's line does not have).
- S1 'Incoming healing ▲ 45.7%' UNMODELED: there is no incoming-healing StatKey and no HP pool for it to amplify — and 'recovery' triggers fire per heal EVENT regardless of amount, so the amplifier cannot change any consumer in v1 (S2b observation).
- S2 'Taunt' UNMODELED: v1 models no aggro/targeting — resolveTargets({kind:'enemy'}) returns [] (the boss deals no damage to anyone, so nothing chooses a target). NOT encoded as a targetStatus (that channel exists for kit-NAMED gateable statuses such as d-killer-wife's Wipe Out; fabricating a 'Taunt' status would invent a gate no kit line asks for) and NOT as a damageTakenPct debuff (taunt is not a damage-taken modifier).
- '2 allies with the highest FINAL ATK' resolves by live effectiveAtk at proc time (byFinalAtk:true per the A3 literal-word ruling); the pool is self-inclusive, but as a Defender folkwang will rarely rank top-2 herself.
- Zero damage lines and zero weapon-state modifiers in the whole kit — folkwang is a clean-weapon BASIS unit (AR cell, team A): clean-weapons.test.ts CW1 additionally pins this committed override byte-identical to the bare empty kit (owner ruling 2026-08-01 option-2: damage-neutrality, not file-absence). Her board footprint is tandem only: two shield channels (one interval, one burst-keyed), one burst-keyed recovery stream (top-2 allies), and one offensively-inert self Max HP grant.

## `frima`

- **skill1** (1)
  - [Defensive / utility / mitigation] Activates when hitting a target with Full Charge. Sleepy: DEF ▼ 4%, stacks up to 5 time(s) for 10 sec. — INERT and UNENACTABLE: boss DEF enters the formula only as the fixed config constant cfg.bossDef (sim.ts:1722 baseAtk = max(0, effectiveAtk − cfg.bossDef)); no buff/debuff channel feeds it, so the engine cannot apply an enemy DEF reduction at all, and the magnitude is negligible regardless (max 20% of measured boss DEF ≈140 ≈ 28 ATK against scope-lock ATK in the hundreds of thousands ≈ 0.02% damage, docs/data/damage-calculation.md §enemy-DEF). NOT modeled as damageTakenPct (a different bucket/math that would over-credit a ~20% team vuln the kit does not deliver) — viper/phantom/guilty/marciana precedent. Its ONLY load-bearing consequence — the max-stack precondition for Wake Up — is carried by the chargeCounter:6 encoding (see note + caveat 1).

- **skill2** (1)
  - [No HP pool / healing domain] Activates when attacking with Full Charge. Affects all allies. Max HP ▲ 6.09% for 4 sec. — offensively INERT: v1 has no HP pool and ally-granted Max HP does not feed a teammate's atkOfMaxHpPct conversion (e3 video rule; effectiveAtk counts only OWN-kit maxHpFlat, casterIdx === u.idx, sim.ts:1513), and frima has no HP scaling of her own — blanc/moran precedent.

- **burst** (2)
  - [Defensive / utility / mitigation] DEF ▼ 9.86% for 10 sec (the rider on the 10-highest-DEF enemies) — INERT and UNENACTABLE, same as S1 Sleepy: cfg.bossDef is a fixed config constant with no debuff channel (sim.ts:1722); ~9.86% of ≈140 ≈ 14 ATK ≈ 0.01% damage at scope. NOT damageTakenPct — viper/phantom/marciana precedent.
  - [No HP pool / healing domain] Affects all allies. Max HP ▲ 30.26% for 4 sec. — offensively INERT, same as the S2 Max HP line (no HP pool; ally-granted Max HP excluded from atkOfMaxHpPct conversions, sim.ts:1513).

**Caveats / reasons:**

- ⚑ Wake Up trigger proxy (low): the kit gates the 6-FC count on the target being at MAX Sleepy stacks; the sim counts every full charge (chargeCounter:6) because the Sleepy debuff is unenactable (see unmodeled) and there is no boss-debuff-stack gate. Faithful where it matters: stacks accrue 1/FC hit and max at 5, so the 6th FC always lands on a max-stack target while stacks hold; the proxy would over-fire ONLY if Sleepy stacks lapsed mid-count (a >10s firing pause — boss transitions/downtime, unmodeled in the continuous scope-lock fight). Estimate: damage-neutral at scope (near-permanent uptime either way). Recipe: a boss-debuff-stack channel + a 'target at N stacks' block gate would enact the precondition exactly; popup-read Wake Up icon uptime in a frima focus recording.
- ⚑ Engine artifact (low): same-weapon flavor swaps skip the SR bolt-recovery cycle (sim.ts:3566-3573, the chisato/takina exemption), so frima's shots cycle at 60f (1.0s) during Wake Up vs 82f (1.37s) outside it — her true window fires ~27% faster than her base cadence. Pre-existing engine behavior for all trueNormals swaps (takina/chisato/laplace ship with it), not an encoding choice here; it slightly over-represents her true-window shot count. Recipe: extend the bolt-recovery rule to flavor swaps (engine-core), then re-grade.
- ⚑ countInFb:6 is a faithfulness detail that is damage-neutral in every fixture (steady-state Wake Up uptime is ~100% regardless, since the re-trigger cycle < duration); it is set to keep the '6 Full Charges' threshold honest within 10s of her own burst cast (the engine's chargeCounter defaults countInFb to 1 there — the SBS semantics). Not behaviour-pinnable; documented, not fudged.

## `grave`

- **skill1** (3)
  - [Bookkeeping / stacks / resources / stance] Activates when Prediction status ends. Affects self. Removes 100% of ammo.
  - [Bookkeeping / stacks / resources / stance] Removes Heat Emission under certain conditions.
  - [No HP pool / healing domain] Activates only when in Heat Emission status. Affects self. Recovers 2% Max HP/1s continuously.

- **skill2** (1)
  - [Weapon state / range / ammo / CDR] Removed upon reloading to max ammunition.

- **burst** (2)
  - [Bookkeeping / stacks / resources / stance] Prediction:
  - [No HP pool / healing domain] Current HP ▼ 1% every 1 sec, lasts for 10 sec.

**Caveats / reasons:**

- skill1: Heat Emission team buffs (Burst Gauge filling speed +38.96%, Pierce Damage +48.4%) modeled as always-on passive — real uptime excludes the ~10s Prediction windows after her burst
- skill1: Prediction-end 'Removes 100% of ammo' (one forced ~3.35s reload per burst cycle in comps) is not modeled — no engine effect can empty a magazine
- skill2: Overheat II/III 30/60-hit build-up approximated as full 10s burst-window uptime (real ramp-in ~2.5s/~5s at the measured 12 rounds/s)
- burst: 'Gain Pierce' (10s) is MODELED FAITHFULLY (gainPierce → self, 10s) — its Pierce Damage ▲ +92.78 Damage Up lands during her Prediction window (S1's 48.4 excludeSelf'd, no double-count). This moves her comps ~0.83→1.18 HOT ON PURPOSE (model the real mechanic > fit): the residual HOT is a SEPARATE burst-window over-model, now cleanly isolated and tracked in open-questions U19 (fix with a measurement). Solo unaffected (a lone Burst II never bursts).
- burst: team 'Max Ammunition Capacity ▲ 3 round(s)' modeled as maxAmmoFlat 3 to ALL allies, 10s (kit-literal flat rounds; enacted 2026-07-20 per the kit-audit ENACT-NOW item — the prior maxAmmoPct 3 percent proxy was near-inert, and the flat-rounds path was already live in maxAmmo(). Materially larger relative buff to small-mag SG/SR teammates in her 10s burst window than the +3% was — faithful>fit; A/B recorded in DECISIONS)

## `guilty`

- **skill2** (1)
  - [Bookkeeping / stacks / resources / stance] Increases stack count of stackable buffs by 1.

**Caveats / reasons:**

- skill1: 'Duplicates 8.81% of the ATK of the ally with the highest ATK' now uses the new highestAllyAtkPct stat (landed 2026-07-21) — resolves to 8.81% × max(all units' staticAtk) at apply time, feeding the same flat-ATK path as casterAtkPct. Solo (guilty is her own max) is byte-identical to the old casterAtkPct proxy; in a team it now correctly sizes off the highest-ATK ally instead of Guilty's own ATK. Basis is STATIC ATK (not final/buffed) per the caster-ATK convention (⚑ a future refinement could rank by live effectiveAtk if measurement shows the duplicate tracks buffed ATK).
- skill2: 'Increases stack count of stackable buffs by 1' is unmodeled (no schema support). Measured REAL solo (guilty-sg-band probe): it bumps her own S1 stack ramp to cap one trigger early; allies' stackable buffs are also not amplified in teams.
- burst: the 'at max stacks' gate on the DEF ▼ 20.25% + 277.71% additional-damage riders is not modeled (always-on) — a burst cast before the S1 ramp completes is slightly over-credited.

## `harran`

- **skill1** (1)
  - [Missing engine primitive / trigger] ■ Activates when an enemy afflicted with Virus Transfer is neutralized. Affects 2 nearest enemy unit(s). Virus Transfer: Constantly deals 17.28% of final ATK as damage every 1 sec for 5 sec. (no kill/neutralize trigger primitive and no add/multi-enemy model — the v1 boss is immortal and alone, so the spread can never fire at scope lock; see ⚑3)

- **skill2** (1)
  - [Partless / AoE / targeting] ■ Activates when killing an enemy. Affects self. ATK ▲ 3.02%, stacks up to 15 time(s) and lasts for 10 sec. (no kill trigger primitive — the v1 boss never dies and there are no adds; zero stacks accrue at scope lock; see ⚑3)

**Caveats / reasons:**

- skill1: the 25% proc chance is encoded as everyN:4 on shotFired — the expectation-exact periodic thinning for the deterministic sim (⚑1); the engine has no chance primitive, so a per-shot RNG roll is inexpressible; the chosen phase fires on every 4th activation.
- skill2: 'Critical Rate ▲ 2.95% for 1 round(s)' is encoded as the steady-state passive proxy (rampSec 2.2) because the literal shotFired durationShots:1 self-buff is net-inert — the granting firePull decrements it the same frame it is dispatched (MEASURED probe 2026-08-05); the re-trigger cadence (every SR shot is a full charge) makes the in-game steady state permanent uptime (⚑2).
- skill2: 'Gain Pierce for 1 round(s)' is a duration-less gainPierce re-arm on shotFired — gainPierce carries only durationSec (no round count), and a durationSec:1 window would lapse between SR shots (charge cycle > 1s); the per-shot re-arm is behaviorally exact while she fires, and the line is damage-inert at scope lock (partless boss, no Pierce Damage ▲ carrier) (⚑2).

## `himeno`

- **skill1** (1)
  - [Defensive / utility / mitigation] ■ Activates when hitting a target with Full Charge. Affects the target. DEF ▼ 6.94% for 3 sec. — no sim channel: the enemy-buff path admits only damageTakenPct/distributedDamagePct (sim.ts consumes enemyBuffs through no other stat) and the boss's DEF is the flat constant cfg.bossDef that no debuff scales, so an enemy DEF▼ moves nothing (sim.ts drops enemy ATK▼/DEF▼ at dispatch: 'other enemy debuffs (ATK▼, DEF▼) don't affect our damage with DEF=0'; eunhwa precedent, same datamined line family). The whole sentence is skipped — an enemy-targeted full-charge effect has no channel either. The nearest-wrong laundering (damageTakenPct 6.94) would fabricate a team lift the kit never grants; scripts/tests/units/himeno.test.ts pins its absence.

**Caveats / reasons:**

- skill1: 'DEF ▼ 6.94% for 3 sec.' (full-charge-hit target) is game-real but unenactable — recorded verbatim in unmodeled; in game it would be a small team-wide lift at near-continuous SR uptime, in the sim domain its contribution is exactly 0 (constant-bossDef basis).
- skill2: both effects ride ONE interval:20 block (poli precedent for CD-driven skills) with a 10s duration → 50% duty cycle; the passive-always-on counterfactual over-credits by exactly the uncovered half and is discriminated by the apply-frame spacing (first at t=20s, period 1200 frames).
- skill2: '▲ 2 round(s)' is a FLAT magnitude (maxAmmoFlat), not a round-count duration — maxAmmo() adds it on top of the percent scaling, so in-window SR magazines hold 8 rounds; the percent-only nearest-wrong (maxAmmoPct 2) computes round(6×1.02) = 6 and never extends.
- burst: both buffs are keyed to HER burstCast (not fullBurstEnter) — with a second Burst II in the team the two keyings diverge on rotations the other B2 chains; the spec test pins application frames to her casts (and OFF the Full Burst start frames).
- burst: the target is the single highest-FINAL-ATK ally EXCLUDING the skill user — 'highest final ATK' is kit-literal (byFinalAtk, live ranking) and ExcludeSelf is datamined (ulti prefer_target_condition), though the prose omits the except-self clause; pinned at the encoding level because both bases rank the same top candidate in the fixtures.
- burst: the chargeDamagePct half only moves damage for a recipient that deals charge-bucket hits — inert on a non-charge carrier is faithful (the critRatePct half still applies); the fixtures exercise a charge-weapon recipient.

## `jackal`

- **skill1** (3)
  - [Defensive / utility / mitigation] ■ Activates when attacked 10 time(s). Affects 1 enemy unit(s) with the highest final Max HP.
  - [Defensive / utility / mitigation] Damage Taken ▲ 9.09% for 10 sec.
  - [Defensive / utility / mitigation] ATK ▼ 9.09% for 10 sec.

- **skill2** (1)
  - [Defensive / utility / mitigation] Equally shares damage taken for 120 sec.

- **burst** (1)
  - [Missing engine primitive / trigger] Burst Skill damage of skills with "Affects 1 enemy unit(s)" in the description ▲ 38.91% for 15 sec.

**Caveats / reasons:**

- burst: the 38.91% Burst-Skill-Damage amp (scoped to skills whose description says 'Affects 1 enemy unit(s)', 15s per cast) is NOT modeled — the engine has no Burst-Skill-Damage bucket/stat and no description-text scope gate (trina precedent, same mechanic family). Teammates' single-target burst nukes cast within 15s of jackal's cast are missing the amp, so jackal comps read COLD by exactly that amount — a documented engine gap (⚑2), not a tuning residual.
- skill1: the whole attacked-10x cluster (Damage Taken ▲9.09% + ATK ▼9.09% on the boss, 10s) is unmodeled — the sim has no incoming-damage model and no attacked-count trigger (maiden Revenge-cluster precedent). If it were fireable it would be a ~+9.09% team amp after the first 10 hits taken; her in-game tanking role feeds the counter, so real uptime is high — honestly absent here (⚑1).
- skill2: 'Equally shares damage taken' (self + 2 highest-final-ATK allies, 120s) is unmodeled — no redistribution primitive and no incoming damage at scope; defensive.
- Both modeled lines are defPct (damage-INERT in v1): jackal's modeled kit contributes ZERO damage — her sim output is her bare RL weapon. Her real value (the burst amp + the S1 boss debuff) lives entirely in the two documented engine gaps.

## `jill`

- **burst** (2)
  - [Inert / zero damage in v1] Reload speed is fixed at a 99.96% increase for 10 sec.
  - [Inert / zero damage in v1] Normal attacks deal True Damage for 10 sec.

**Caveats / reasons:**

- burst: "Reload speed is fixed at a 99.96% increase for 10 sec." is a stat LOCK (clamps reload speed at ~normal and blocks reload-speed support for 10s), not a +99.96% boost — the engine has no clamp vocabulary, so it is unmodeled and inert without reload-speed support on the team (open-questions U31)
- burst: "Normal attacks deal True Damage for 10 sec" (damage-type conversion) is unmodeled

## `k`

- **skill1** (2)
  - [Bookkeeping / stacks / resources / stance] ■ Activates when pellets land a critical hit 4 time(s). Affects the target. Deals 23.9% of final ATK as additional damage.
  - [Bookkeeping / stacks / resources / stance] ■ Activates when Full Burst ends. Affects self. Removes Tilted Scale.

- **skill2** (1)
  - [Defensive / utility / mitigation] ■ Activates when Full Burst ends. Affects all allies. Removes Fulfillment of Righteousness.

**Caveats / reasons:**

- burst: the swap weapon's exact shot SHAPE is a KIT-TEXT-LITERAL assumption, not datamine-confirmed — her swap weapon has no `shot_detail` record in data/characters.json (only the human-readable description plus the raw `skill_value_data[0]` percent field, 5466 → 54.66% at level 1, scaling to 92.5 at max). 'Pelletcount: 10' is therefore read literally as ONE muzzle firing a 10-pellet spread, matching the shape of every other implemented SG unit; a multi-muzzle decomposition would land the same total damage but a different per-pellet basis. ⚑
- burst: pullsPerSec 2.4 = the swap weapon's nominal 144 RPM (10% of the base SMG's datamined 1440 RPM rate_of_fire, per 'Attack speed ▼90%') run through the engine's existing frame-quantization formula (`quantizeToFrames`, sim.ts:224 — already MEASURED/validated 2026-07-23 against real footage for the general mechanism); 60/2.4 = 25 is an exact frame count so quantization is a no-op, unlike the base SMG's own non-integral 1440 RPM. Owner-confirmed reading: the kit's percentage modifies the swap weapon's own nominal rate directly, not the base SMG's already-frame-quantized 20.0/s effective rate. ⚑
- burst: because the swap declares weapon 'SG', her burst shots also take SG range-band eligibility (RANGE_ELIGIBLE near = SG, so she GAINS the +30% range bonus in the near band and LOSES it in mid, where her base SMG had it) and SG auto-core banding (acrForHR keys off the swap class), both via the existing swap-class routing (sim.ts effWeapon). Her swap shots' burst-gauge feed is also wired through the same pellet-landing fraction as the damage (shotGauge(u, frame, sgGaugeFrac)); in practice this is inert for her because the full-burst gauge lock means she generates no gauge at all during her own burst window (verified: her gauge event log is identical with and without this routing). It would become live for any future SG-swap that fires outside a full burst. ⚑
- burst: K is MODEL-ONLY — no real K footage has been recorded, so her absolute damage is unvalidated against a fight. estimate = the kit-literal model above. recipe = a scope-lock focus recording of a K team; read her burst-window popup values (expect a spread of per-pellet hits ≈ 9.25% of final ATK each, not one large hit) and her per-burst total. tier = MEASUREMENT-GATED. ⚑
- skill1: Tilted Scale's literal stack ramp (+29 stacks ×0.75% per last bullet, cap 100 = 75%, wiped on FB end) cannot be encoded — no '+N stacks/trigger' primitive (buff apply is +1/trigger, sim.ts:1922) and no FB-end buff-removal. Encoded as its LOAD-BEARING steady-state burst-window effect: burstCast self critRatePct 75% for 10s. Pre-burst-phase crit (modest SMG output) and the first-burst ramp are under-credited. estimate = 75% crit rate during the burst window (steady state; reached ~33s into each 40s cycle). recipe = focus footage of K's burst-window crit popups (confirm ~90% crit = 15% base + 75% Tilted Scale) and her pre-burst SMG crit ramp. tier = MEASUREMENT-GATED (ramp shape + first-burst timing). ⚑
- skill1: S1c 'every 4 critical hits → 23.9% final ATK additional damage' is UNMODELED — the engine has no crit-gated hit counter primitive at all (hitCount counts all hits, not crits), so there is no faithful way to express the trigger regardless of the pellet basis. Secondary (~5% of burst-window damage). estimate = ~5% of burst damage at steady-state crit. recipe = popup-read the 23.9% rider procs in a K focus video (count per burst window). tier = MEASUREMENT-GATED. ⚑
- skill2: trigger 'when gaining Tilted Scale' proxied by lastBullet (Tilted Scale is only gained on the last bullet) — exact, not an approximation. The ▼51.13% max-ammo team debuff is the kit's stated cost; modeled faithfully (maxAmmoPct -51.13) though its net damage impact on allies is small/second-order.
- skill2: S2c 'removes Fulfillment of Righteousness on FB end' — no FB-end removal primitive; moot (10s duration self-expires ≈ the FB window, re-applied on the next last bullet).

## `kilo`

- **skill1** (1)
  - [Defensive / utility / mitigation] ■ Activates when using Burst Skill. Affects self if not in Nano Coating status. Nano Coating: Creates a Shield equal to 21.12% of the skill user's final Max HP continuously.

- **skill2** (2)
  - [Defensive / utility / mitigation] ■ Activates after performing 200 normal attacks while in Nano Coating status. Affects self. Restores Shield HP equal to 2.85% the skill user's final Max HP.
  - [Defensive / utility / mitigation] ■ Activates when using Burst Skill while not in Nano Coating status. Affects self. Effects vary according to the number of uses. Each subsequent effect triggers all effects before it: Once: Next Shield's HP ▲ 17.75% continuously. Twice: Next Shield's HP ▲ 26.66% continuously. Three times: Next Shield's HP ▲ 35.53% continuously.

- **burst** (1)
  - [Defensive / utility / mitigation] ■ Activates when not in Nano Coating status. Affects self. Max HP ▲ 48% for 20 sec.

**Caveats / reasons:**

- burst: the in-Nano-Coating nuke is modeled at the kit multiplier (1150.84%) off her own final ATK, but the kit text says that ATK is 'calculated from 5% of final Max HP' — the engine has no HP-basis primitive (effectiveAtk is purely additive; stackedNuke.hpPct is Maiden:IR-specific stack semantics) and the gauntlet forbids engine edits. On the scope-lock basis 5% of her final Max HP ~= 2.07x her ATK, so the nuke is undercounted by up to ~52% (~4% of her personal total, ~1-2% of a team total) AND it wrongly rides teammate ATK buffs (liter/crown windows) that a true HP basis would ignore — both documented infidelities collapse together when the basis is measured. Precedent: maiden-ice-rose shipped her HP-scaled burst portion the same documented-under-model way. MEASUREMENT-GATED: focus recording, read her burst popup vs the ATK x 1150.84 prediction; a popup ~2x higher confirms the HP basis and calls for an engine primitive.
- skill1/skill2/burst: all four uncoated-status lines (S1 re-shield on burst, S2 200-attack shield-HP restore, S2 escalating Next-Shield-HP buffs, burst Max HP +48%/20s) are dead at scope — the battle-start shield has no duration and nothing breaks it — and are recorded verbatim in unmodeled. No negated-shield-gate, shield-HP-pool, or shield-size-modifier primitive exists; encoding them ungated would over-fire them every burst.

## `label`

- **skill1** (5)
  - [Defensive / utility / mitigation] Activates when Delusion status ends. Affects self. Delusion Shattered: Activates up to 2 time(s). This effect is continuous.
  - [Defensive / utility / mitigation] Effect 1: Imagined Heartbreak: Prevents being targeted by single-target attacks for 1 sec x Delusion Shattered count. This effect is removed upon taking a direct hit.
  - [Defensive / utility / mitigation] Effect 2: Stuns for 1 sec per Delusion Shattered stack.
  - [Defensive / utility / mitigation] Activates when performing a normal attack while not in Delusion status. Affects self. Delusion: Creates a Shield equal to 30.15% of the skill user's final Max HP. This effect is continuous.
  - [Defensive / utility / mitigation] Activates when using Burst Skill while not in Delusion status. Affects self. Delusion: Creates a Shield equal to 30.15% of the skill user's final Max HP. This effect is continuous.

- **skill2** (2)
  - [Defensive / utility / mitigation] Activates at the start of battle. Affects all allies (except self). Damage taken from Electric Code enemies ▼ 70.4% for 5 sec. Activates 1 time(s) per battle.
  - [Defensive / utility / mitigation] Damage taken from Electric Code enemies ▼ 70.4% continuously.

- **burst** (1)
  - [Defensive / utility / mitigation] Shared Delusion: The Shield created by Label becomes invulnerable for 10 sec.

**Caveats / reasons:**

- skill1: the Delusion shield is event-only (engine `shield` emits no HP pool); DPS-inert and Label has no `shielded` consumer — modeled for kit-completeness only
- skill2: the self ATK ▲93.39% / burst-gauge ▲70.4% are 'only while in Delusion'; Delusion is permanent in the no-incoming-damage sim, so they are encoded passive (frame 0, no expiry). Real shield-break downtime is sub-second and unmodeled (⚑)
- burst: self Max HP ▲20.26% (targetMaxHpPct, own-Max-HP basis) is offensively inert (no atkOfMaxHpPct conversion) — kept for kit-completeness, proven inert by totals-equality
- skill2: the ally ATK ▲80.36% (of Label's ATK) is gated on Shared Delusion, the 10s status Label's burst creates — encoded as a burstCast 10s buff; the shield INVULNERABILITY itself is unmodeled (no damage model)

## `laplace-ultimate-hero`

- **skill1** (2)
  - [Bookkeeping / stacks / resources / stance] Activates when performing a Full Charge attack. Affects self. Warm Up: Charge Speed ▲ 10% continuously. Stacks up to 5 times.
  - [Bookkeeping / stacks / resources / stance] Activates when Electric Power, Fully Full Charge ends. Affects self. Removes 100% of ammo.

- **skill2** (2)
  - [No HP pool / healing domain] Activates after performing 12 normal attacks while in the Electric Power, Fully Full Charge state. Affects self. Over Energy ▲ 5% continuously, up to 100%.
  - [No HP pool / healing domain] Activates when Over Energy reaches 100%. Resets Over Energy and affects self. Advances to the next Over Energy stage. Effects vary for each stage of Over Energy. Each subsequent effect triggers all effects before it: Stage 1: Max HP ▲ 2% continuously. Stage 2: Max HP ▲ 3% continuously. Stage 3: Max HP ▲ 7% continuously. Stage 4: Max HP ▲ 10.5% continuously.

**Caveats / reasons:**

- skill1: the Electric Power swap weapon's fire cadence is KIT-SILENT — chargeTimeSec 0.25 (4 rounds/s) is an estimate by analogy to base laplace (Treasure)'s beam tick rate, the dominant unmeasured lever on her board number. It drives the swap-mode DPS (9.45% × 120 rounds per cycle) AND how fast oeStage builds (when the burst additional damage unlocks). The swap end is USES-BASED (maxShots:120); durationSec 300 never truncates it. Measure the Electric Power fire rate in a focus video.
- skill1: the swap trigger (hitCount:5 + swapGate:'unswapped') captures the Warm Up 5-full-charge GATE; the counter is cumulative and swapGate gates firing not counting, so the re-swap phasing after the first cycle is approximate (⚑ low — magnitudes kit-exact).
- skill1: hasPierce on the swap is inert at scope lock (PIERCE_CORE_DOUBLE hard-off, no pierceDamagePct carrier → byte-identical totals); tagged for kit completeness, scoped to swap shots only.
- skill2/burst: the Over Energy STAGE is tracked (oeStage 0-4, advanced by hitCount:240 swap-gated = the kit-exact 240-swapped-normals-per-stage build rate) and feeds the burst additional damage (4× resourceGate-gated 934.76 riders = stage × 934.76). The wall-clock stage-UNLOCK timing rides the kit-silent swap cadence (⚑); the per-stage MAGNITUDE is kit-exact. hitCount counts cumulative shots and swapGate gates firing not counting, so the unlock phasing is approximate.
- skill2: the stage Max HP buffs (2/3/7/10.5% cumulative) are MODELED — four resourceGate-gated targetMaxHpPct SELF-grants (min 1/2/3/4, continuous, kit-cumulative) riding the oeStage advance, feeding her atkOfMaxHpPct conversion via liveMaxHp (own-kit, e3-admitted); they carry the SAME ⚑ stage-timing as the burst additional riders. The 0-100% Over Energy METER itself remains untracked — its only consumer (the stage advance) is keyed directly to the kit-exact 240 count.
- skill2: the Full Burst Attack Damage ▲ 52.14% is keyed to stageEnter:3 ('entering Burst Stage 3' = the B3 cast frame, fires on any stage-3 caster); burstCast (own-casts-only) and fullBurstEnter (~22f late) are the nearest wrong models (discriminated in the unit test).

## `laplace`

- **skill1** (1)
  - [Partless / AoE / targeting] Activates when attacking with Full Charge. Affects self. Hero Vision: Explosion Radius ▲ 3.57%, stacks up to 5, 15s.

- **skill2** (1)
  - [Partless / AoE / targeting] Activates when hitting the target's Parts. Affects the target's body. Deals 14.78% of final ATK as additional damage.

- **burst** (1)
  - [Defensive / utility / mitigation] (Note: Unable to take cover.)

**Caveats / reasons:**

- burst: bazooka beam economy is UNMEASURED — 0.25s/tick + reload-free are ⚑ estimates over the 10s window; count beam popups in any focus video
- burst: the swap beam (22.2%, true at max Hero Vision) and the 11.9% true rider both assume Hero Vision is at max stacks for the whole window (⚑ uptime haircut candidate)
- burst: 'Gains Pierce' modeled as swap-scoped weaponSwap.hasPierce:true (kit-autonomy gauntlet 2026-07-26, blind-reviewer converged) — inert at scope lock (PIERCE_CORE_DOUBLE hard-off, no pierceDamagePct carrier → byte-identical totals); tagged for kit completeness, not damage
- skill2: the 132.45% full-charge additional hit is shotFired + swapGate:'unswapped' — it fires on base full-charge pulls only, NOT the swap beam (gauntlet 2026-07-26 S7 ruling: the burst labels beam damage 'Normal Damage', and both blind derivations read exclusion; the prior every-shot reading was a circular cite of the kit-silent chargeTimeSec ⚑). Confirm with a focus video: 132.45%-class popups should appear outside the 10s swap window and stop inside it
- skill1: Explosion Radius ▲ is inert vs the partless boss; its stacks only gate the burst true damage (assumed maxed)

## `leona`

- **skill1** (2)
  - [Missing engine primitive / trigger] ■ Activates after 15 normal attack(s). Affects all allies with a Shotgun.
  - [Missing engine primitive / trigger] Maximum Effective Range ▲ 20% for 10 sec.

**Caveats / reasons:**

- skill1: 'Maximum Effective Range ▲ 20%' to shotgun allies is not modeled — the engine has no range stat and shotgun pellet landing is a fixed measured table; real effect (better far-band landing) is a known under-model
- skill2: Hit Rate ▲ 20.28% is modeled as hitRatePct — LIVE since CONE_DELTA (2026-07-19): feeds acrForHR core rate for AR/SMG/SG recipients; the in-game magnitude of the lift is unmeasured
- skill2: '+5 pellets' is modeled with the real pelletCountFlat 5 primitive (A4 2026-07-21; superseded the prior Normal Attack +50% proxy on 2026-07-26) but applies to ALL shotgun allies (kit: only the 2 highest-ATK shotgun allies) — over-applies in teams running 3 or more shotguns, including Leona herself
- burst: the 21.32% crit-rate line assumes Roar is fully stacked at her burst cast (the stack-count gate is not modeled and may not always hold)

## `liberalio`

- **skill2** (2)
  - [Defensive / utility / mitigation] Activates when landing a Full Charge attack against a Rapture that is not the stage target. Affects self. Gentle Current: Fixes charge time at 1 sec continuously. Removes Raging Current.
  - [Defensive / utility / mitigation] Activates at battle start. Affects self. Immunity to Increase/Decrease Charge Speed effects, continuous.

**Caveats / reasons:**

- skill2: Gentle Current (charge time fixed at 1 sec vs non-stage-target Raptures) is not modeled — the solo-raid boss is always the stage target, so Raging Current is permanently active and Gentle Current can never fire.
- skill2: her charge-speed immunity is only enforced against her OWN Skill 1 buff (excludeSelf); an EXTERNAL Charge Speed buff from a teammate (e.g. Maxwell, Alice) would wrongly speed her up in the sim.

## `lily`

- **skill2** (1)
  - [Defensive / utility / mitigation] ■ Affects all allies. Restores 10% of Cover HP. — UNMODELED (inert): restores COVER HP, not a unit's HP; no sim cover-HP representation (same NO-OP class as liter S2, owner ruling 2026-07-21; naga cover-restore precedent). Emits no unit-recovery event, so it must not trigger recovery-consumer teammates (the liter trap — pinned by the unit spec's Crown guard).

- **burst** (1)
  - [Defensive / utility / mitigation] ■ Affects 1 random ally unit whose cover has been destroyed. Rebuild Cover with 30% HP. ATK ▲ 20% of the skill user's ATK for 10 sec. — UNMODELED (inert): the destroyed-cover gate can never legitimately fire in v1 — there is no incoming-damage / cover-destruction model (immortal boss), so no ally's cover is ever destroyed and this branch never applies (biscuit S2 un-fireable-trigger disposition). The Rebuild Cover portion is the liter-S2 cover-HP NO-OP class regardless. Its 20% ATK magnitude is pinned ABSENT by the unit spec (lily grants ONLY the 40% branch-B flat value).

**Caveats / reasons:**

- skill1: cadence is the DATAMINED skill cooldown (interval 15s); first-fire phase (t=15 vs t=0) is the engine interval convention (⚑3).
- skill1 + burst: '1 random ally' resolves to the single highest-base-ATK ally (alliesTopAtk count:1 — chime single-ally-grant precedent; no random-selection target kind exists in the deterministic sim). ⚑1 — the true random pick would rotate the holder; flat-ATK grants are near-damage-neutral across holders, so the stand-in moves holder identity, not (much) team damage.
- burst: destroyed-cover status gate is CONSTANT in v1 — branch A (rebuilt cover + 20% ATK) never fires (no cover-destruction model), branch B (40% ATK) always fires; the gate is documented, never enacted as a blocker (soline Max-HP-gate pattern).
- skill2: the cover restore is an inert NO-OP in v1 (no cover representation); it is NOT a unit heal and emits no recovery events.
- weapon: lily's own SMG damage is minor relative to her buffer value; the base-weapon cadence is datamined (RoF 1440, reloadFrames 81) and unverified by footage (⚑2).
- rarity: lily is SR; the scope-lock basis (3★/core 7) is an SSR ceiling — the helm-in-controlComp precedent ships her uncapped for spec consistency, and her own ATK (the casterAtkPct basis) is therefore slightly warm (affects the flat grant magnitude, not the structure).

## `liter`

- **skill2** (1)
  - [Defensive / utility / mitigation] ■ Affects 2 ally unit(s) with the lowest remaining cover HP. Restores 52.5% of Cover HP. — NO-OP (owner ruling 2026-07-21): restores COVER HP, not a unit's HP; emits NO unit-recovery event, so it must not trigger recovery-consumer teammates (was spuriously firing Crown's +20.99% team Attack Damage every FB). No sim HP-pool representation.

**Caveats / reasons:**

- skill1(weapon): the ⚑1 cadence tuple is Liter's BASE SMG weapon cadence (datamined rate_of_fire 1440, reloadFrames 111) — an unverified datamine, NOT related to skill1's mechanic (burst-CDR + team buffs). Low impact (her self-damage is minor); read rounds/min + reload gap from any focus video if ever needed.
- skill2: NO-OP in the sim (owner ruling 2026-07-21) — cover-HP restore is not a unit heal and must not fire recovery consumers (e.g. Crown). Previously modeled as a heal→allies, which over-inflated the whole team via Crown's recovery buff.
- burst: team buffs are short (5 sec) by kit text — low uptime on a ~20 sec cycle is faithful, not a modeling gap

## `little-mermaid`

- **skill1** (2)
  - [Bookkeeping / stacks / resources / stance] ■ Activates only when in Focusing status. Affects all allies.
  - [Bookkeeping / stacks / resources / stance] Focuses fire continuously.

- **skill2** (2)
  - [Bookkeeping / stacks / resources / stance] ■ Activates after landing 50 normal attacks. Affects the target if the target is in Bubble status.
  - [Defensive / utility / mitigation] Explosive Bubble: Damage Taken ▲ 5.05% continuously. Stuns for 3 sec. Removes Bubble.

**Caveats / reasons:**

- Explosive Bubble (skill 2) is not modeled: the override carries a single permanent Damage Taken ▲ 5.05% (Bubble). If Bubble re-applies after the explosion and Explosive Bubble's debuff persists, the boss would carry BOTH stacks (10.1%) in steady state — unverified, needs an in-game debuff-icon / popup-delta measurement before any change. ⚑ MEASUREMENT-GATED (kit-status F1; independently re-derived by the blind cross-family reviewer, gauntlet 2026-07-26 — the kit-literal reading is a one-time RELOCATION: 'Removes Bubble' + the same 5.05% re-applied, so boss DT stays 5.05% and the 50-hit gate closes forever; the 3s stun is inert, no boss-action model). Estimate: 5.05% (shipped, kit-literal) vs 10.1% (coexistence). Recipe: read the boss debuff icons / popup delta ~5s into a fight (she lands the 50 normals in ~2s at 1440 rpm); if coexistence holds, add a second passive damageTakenPct 5.05 block. Tier: MEASUREMENT-GATED.
- The 'every 1 sec only during Full Burst' nuke is encoded as a 10-second damage-over-time started at Full Burst entry — tick count assumes the nominal 10s Full Burst window and does not track shortened or extended Full Bursts.

## `ludmilla`

- **skill1** (2)
  - [Defensive / utility / mitigation] ■ Activates when the last bullet hits the target. Affects the target. DEF ▼ 8.4% for 10 sec. — UNMODELED (inert, declared GAP ⚑1): a boss-DEF shave the engine cannot express — sim.ts applyEffect drops enemy ATK▼/DEF▼ debuffs (only positive damageTakenPct/distributedDamagePct reach enemyBuffs) — and the scope-lock basis runs bossDef = 0 regardless (docs/data/damage-calculation.md line 32; scripts/battery/boss-def.ts ≤0.12% board shift), so it moves exactly zero damage here. Her real team-damage lever in game; re-gauntlet if a nonzero bossDef ever enters the basis.
  - [Defensive / utility / mitigation] ■ Activates when the last bullet hits the target. Affects the target. ATK ▼ 8.4% for 10 sec. — UNMODELED (inert ⚑2): enemy ATK▼ debuff — the boss never attacks in the DPS sim (no incoming-damage model) and applyEffect drops enemy ATK▼ regardless. Doubly inert.

- **skill2** (2)
  - [Defensive / utility / mitigation] ■ Activates when entering Full Burst. Affects all enemies. Attract: Taunt all enemies for 15.09 sec. — UNMODELED (inert): no threat/targeting model in v1 — the solo boss already attacks the team abstraction; there is no aggro state to redirect. Trigger identity recorded as fullBurstEnter so a future consumer never misfiles it as burstCast.
  - [Defensive / utility / mitigation] ■ Activates when entering Full Burst. Affects self. Damage Taken ▼ 57.86% for 15 sec. — UNMODELED (inert): no incoming-damage model in v1 (immortal boss; nobody takes damage), so the window has no observable. This is the SELF-targeted ▼ mirror of the boss damageTakenPct channel, never that channel itself — the unit spec's zero-damageTakenPct-anywhere guard pins the shared-prior sign/channel misread.

**Caveats / reasons:**

- skill1: the boss DEF▼8.4%/ATK▼8.4% debuffs are declared GAPs (⚑1/⚑2) — inexpressible at scope lock (bossDef = 0; applyEffect drops enemy ATK▼/DEF▼), zero damage impact on this basis, real team-damage value in game.
- burst: the 10-highest-final-ATK target clause collapses to one hit vs the solo boss (target capacity, not a hit multiplier — ⚑4).
- burst: the 'above 50% HP' gate on the ally DEF buff is always-true in v1 (no HP pool) and modeled unconditionally; real-game uptime may be lower if she dips below 50% HP (⚑5).
- weapon: the SMG cadence tuple (RoF 1440, reloadFrames 187) is datamined, unverified by footage (⚑3).

## `maiden-ice-rose`

- **skill1** (2)
  - [Bookkeeping / stacks / resources / stance] Activates when entering Burst Stage 1 with MP at 0. MP recovers by 1. MP can be accumulated up to a maximum of 12. All accumulated MP is consumed when using Burst Skill.
  - [Bookkeeping / stacks / resources / stance] Activates when entering Full Burst with MP above 1. MP replenishes by 1. MP can be accumulated up to a maximum of 12. All accumulated MP is consumed when using Burst Skill.

**Caveats / reasons:**

- skill1: unparsed effect "MP replenishes by 1. MP can be accumulated up to a maximum of 12. All accumulated MP is consumed when using Burst Skill."

## `maiden`

Maiden is an Electric shotgun Burst-III attacker whose kit revolves around a 'Revenge' self-status earned by being attacked 20 times. In the sim (immortal boss, no incoming damage) Revenge can never be earned, so only her unconditional lines fire: Skill 2 raises her own Critical Damage by 152.84% for 10s every 30s, and her burst deals 457.87% of final ATK to all enemies. The Revenge-gated half of her kit — the burst's additional 457.87% rider and her own +26.66% ATK buff — is documented but unmodeled (out-of-domain), as is Skill 2's taunt (no aggro model; the single boss already takes everyone's attacks).

- **skill1** (2)
  - [Bookkeeping / stacks / resources / stance] Activates when attacked 20 time(s). Affects self.
  - [Bookkeeping / stacks / resources / stance] Revenge: ATK ▲ 26.66% for 20 sec.

- **skill2** (2)
  - [Defensive / utility / mitigation] Affects all enemies.
  - [Defensive / utility / mitigation] Taunt for 10 sec.

- **burst** (2)
  - [Bookkeeping / stacks / resources / stance] Affects the same target(s) when in Revenge status.
  - [Bookkeeping / stacks / resources / stance] Deals 457.87% of final ATK as additional damage.

**Caveats / reasons:**

- skill1: the entire Revenge mechanic (attacked 20× → Revenge: self ATK ▲26.66%/20s) is UNMODELED — the sim has no incoming-damage model, no 'attacked N times' trigger, and no self-status gate; the boss never acts
- burst: the 'when in Revenge status → 457.87% additional damage' rider is UNMODELED — it is gated on the untriggerable Revenge self-status, so the burst fires at half its theoretical (Revenge-active) magnitude
- skill2: 'Affects all enemies. Taunt for 10 sec.' is UNMODELED — no taunt/aggro primitive; the single partless boss already takes everyone's attacks; its in-game role is feeding the attacked-counter (⚑1)
- skill2: the 30s interval cadence is the datamined skillCooldownsSec.skill2 (the kit prose carries no number) — ⚑ cadence tuple
- skill1/skill2/burst: SG cadence tuple (rate_of_fire 90 / reloadFrames 142 / 10 pellets) is an unmeasured datamine estimate

## `makima`

Defensive collab tank. When attacked 20 times she would raise all allies' Reload Speed by 36.96% and DEF by 14.78% for 10s, and after 120 landed shots she would taunt all enemies for 3s — both unmodeled (v1 simulates no incoming attacks / aggro). Taking lethal damage would grant Indomitability for 7s (once per battle) and cut her burst cooldown by 11.58s — unmodeled (no lethal damage at scope lock). Her burst grants herself Pierce for 10s (damage-quiet at scope lock) and emits a 10-second self recovery stream; the indomitability-gated Incoming Healing rider is unmodeled (gate closed).

- **skill1** (3)
  - [Missing engine primitive / trigger] ■ Activates when attacked 20 times. Affects all allies.
  - [Weapon state / range / ammo / CDR] Reload Speed ▲ 36.96% for 10 sec.
  - [Defensive / utility / mitigation] DEF ▲ 14.78% for 10 sec.

- **skill2** (5)
  - [Defensive / utility / mitigation] ■ Activates after landing 120 normal attack(s). Affects self.
  - [Defensive / utility / mitigation] Attract: Taunt all enemies for 3 sec.
  - [Defensive / utility / mitigation] ■ Activates when taking lethal damage. Affects self.
  - [Defensive / utility / mitigation] Gain indomitability for 7 sec. Activates 1 time(s) per battle.
  - [Defensive / utility / mitigation] Cooldown of Burst Skill ▼ 11.58 sec.

- **burst** (2)
  - [Defensive / utility / mitigation] ■ Activates during indomitability. Affects self.
  - [Defensive / utility / mitigation] Incoming healing ▲ 41.02% for 10 sec.

**Caveats / reasons:**

- burst: 'Gain Pierce for 10 sec' is a TIMED gainPierce window on her own burstCast (asuka precedent) — damage-inert at scope lock (no pierceDamagePct consumer, PIERCE_CORE_DOUBLE=false; byte-identical totals pinned), encoded for kit completeness + pierce-buff teammates
- burst: the 34.02% recovery is event-only (no HP amounts modeled); 'over 10 sec' = ticks:10/intervalSec:1 so a recovery consumer stays refreshed across the whole window (helm H8 precedent); self-targeted — she has no recovery trigger of her own
- skill1/skill2: every line is unmodeled — v1 models no incoming ally damage (no attacked-count trigger, no taunt/aggro, no lethal-damage trigger, no indomitability status); the lethal-gated burstCdr in particular must NEVER be encoded on a reachable trigger (rotation blast radius, ⚑3)
- burst: the 'during indomitability' incoming-healing rider is unmodeled — its gate is permanently closed at scope lock (the only indomitability source is itself unmodeled) and no heal amounts exist to amplify (⚑4)
- the '■ Affects self.' burst header line is represented by the two modeled blocks' self targets, not carried in unmodeled

## `mana`

- **skill1** (4)
  - [Bookkeeping / stacks / resources / stance] Activates if the skill user is in Metal γ status when an ally is out of action. Affects 1 incapacitated ally unit(s) with the highest final ATK (except the skill user).
  - [No HP pool / healing domain] Resurrect with 96% HP.
  - [Missing engine primitive / trigger] Activates when an ally is out of action. Affects self.
  - [Missing engine primitive / trigger] Removes Metal γ.

**Caveats / reasons:**

- skill2: Metal σ is a live resource pool (initial 1, max 1). The FB-entry AD/ATK buff is resourceGate(sigma>=1) on fullBurstEnter and spends sigma -1; sigma is re-granted (+1) only by mana's OWN burstCast. In a multi-B3 team the buff procs on the FBs mana casts (sigma held) and not on FBs another B3 completes while sigma is down; FB1 procs from the initial sigma regardless of who casts. Faithful to the σ state machine (kit-autonomy 2026-07-26, adopting the blind S2b derivation); replaces the prior burstCast-keyed approximation which matched only the firing COUNT.
- skill2: Metal σ burst-gauge +70.4% is perResource (sigma x 70.4) — live only while σ is held. Cadence-INERT for mana specifically: her 40s burst CD (not gauge fill) gates her casts (verified 6 casts/180s with or without σ), so the gating is damage-equivalent to always-on for her; kept perResource for literal σ fidelity.
- skill2: Charge Time ▼0.18 sec ally support approximated as chargeSpeedPct 18 to all allies on fullBurstEnter (NOT σ-gated). Magnitude is a flat-seconds→percent stand-in (0.18s ÷ target basic charge time; exact for helm at 1.0s, comp-dependent ⚑) and the 'longest basic Charge Time' single-target selection is not engine-expressible (inert on non-charge allies).
- skill1: hitCount-10 team heal is an event-only synergy hook (Crown-style recovery consumers); it adds no damage alone but is a live cross-unit channel when a recovery consumer is present.
- cadence: pullsPerSec / reloadFrames 121 are unverified datamine (mandatory ⚑).

## `marciana-marine-study`

- **skill1** (1)
  - [Defensive / utility / mitigation] ■ Activates when an enemy is neutralized if the target is in the Flagged Target state. Affects 1 random enemy unit(s). Flagged Target Designation Effect 1: Deals 3789.25% of final ATK as additional damage. Effect 2: Activates when the target is alive. Flagged Target: ATK ▼ 10.56% for 10 sec. — UNMODELED: no enemyNeutralized trigger in the engine; inert in the sim (the boss never dies). The Flagged Target status IS modeled (targetStatus) as the gate for this block, but the block itself never fires.

- **skill2** (1)
  - [Inert / zero damage in v1] ■ Activates every time there are 6 or more Raptures present for a period of 1 sec. Penguin Emergency Dispatch Function: Expends Whistle stacks to attack Raptures when there are 6 or more present. Effect 1: Affects all enemies. Deals 214.36% of final ATK as additional damage. Effect 2: Affects self. Whistle stacks ▼ 1. — UNMODELED: no enemy-count trigger in the engine; inert in the sim (never ≥6 enemies in solo raid).

**Caveats / reasons:**

- skill1: the 'enemy neutralized if Flagged Target' block is UNMODELED — no enemyNeutralized trigger; inert in sim (boss never dies). Flagged Target targetStatus IS modeled for kit completeness.
- skill1: hitCount:20 counts ALL hits (normal + skill + burst), not normal-only as the kit text implies ('landing 20 normal attacks'). For an AR at 720 RPM with infrequent skill procs the over-count is small; noted, not fitted.
- skill2: the '≤3 Raptures for 5 sec' Whistle-stack gain is modeled as interval:5 — exact for the solo-raid sim (always 1 enemy, always ≤3). The real trigger is enemy-count-gated.
- skill2: the 'Rapture appears/neutralized while ≤5' Elemental Advantage buff is modeled as passive — in the sim the boss appears at t=0 (1 enemy, ≤5), so it fires once and is continuous. The real trigger is enemy-appear/neutralize-gated.
- burst: DEF ▼10.56% on High-Risk Target is inert at bossDef:0 (scope lock). The targetStatus 'High-Risk Target' IS modeled as the gate for S1's 20-hit rider.
- skill1: ATK ▼10.56% debuff content of Flagged Target is inert in the damage sim (boss ATK is irrelevant). The targetStatus window is modeled for kit completeness.

## `marciana`

- **skill1** (1)
  - [No HP pool / healing domain] Activates when the last bullet hits the target. Affects 2 ally unit(s) with the highest final ATK. Incoming healing ▲ 26.98% for 3 sec.

- **burst** (1)
  - [No HP pool / healing domain] Storage: Stores excess healing received by the skill user, up to 27.87% of their Max HP. Lasts for 10 sec.

**Caveats / reasons:**

- ⚑ HoT tick granularity: skill1's heal is stated 'over 3 sec' with NO per-second clause, so ticks:3/intervalSec:1 is an ESTIMATE. Tick count is the only thing this block contributes (no HP pool), and it directly scales how many times a teammate's on-recovery consumer fires per magazine — over-stating ticks over-credits that teammate.
- ⚑ lastBullet cadence: the per-magazine firing rate of skill1 depends on ammo (9) and reloadFrames (111) — datamine-unreliable fields. Both skill1 lines are per-magazine, so a wrong magazine economy scales the whole skill1 channel.
- Heal MAGNITUDES (skill1 10.95% of attack damage; skill2 28.11% of caster final Max HP) are recorded here but NOT modeled: the 'heal' effect emits a recovery event with no HP amount, and v1 has no HP pool. Both lines are implemented for their TANDEM value only (they fire allies' 'recovery' triggers).
- burst DEF line is a SEMANTIC APPROXIMATION: the kit grants DEF equal to 20.9% of the SKILL USER's DEF, but the schema's only DEF stat is defPct, which scales the TARGET's own DEF. There is no casterDefPct. Kept for kit completeness (DEF is offensively inert in v1); the value is NOT a faithful caster-scaled grant.
- Zero damage lines and zero weapon-state modifiers in the whole kit — no noFb / range / core / crit decisions arise, and this unit cannot move its own damage. Its entire board footprint is cross-unit: recovery events (2 channels) plus an inert DEF buff.

## `mari`

- **skill1** (2)
  - [Defensive / utility / mitigation] Activates when landing a Full Charge attack. Affects all allies.
  - [Defensive / utility / mitigation] Damage dealt to Shield ▲ 100.09% for 3 sec.

**Caveats / reasons:**

- skill2: trigger is KIT-SILENT — modeled as refresh-on-shot (near-permanent while firing); an unmeasured ⚑ estimate — if the real trigger is a CD interval this over-credits out-of-Full-Burst uptime (cross-family S2b flagged the interval reading)
- skill1: 'Damage dealt to Shield ▲ 100.09%' unmodeled — the raid boss is partless and never shields (out-of-domain ⚑; resurface if a shielded boss enters scope)
- cadence: datamined charge/reload tuple + the SR 22-frame bolt-gap default are unmeasured ⚑ estimates (autofire would add ~15–20% shots)

## `mary`

- **skill2** (1)
  - [No HP pool / healing domain] Activates when entering Full Burst. Affects all allies. Incoming healing ▲ 23.78% for 15 sec.

**Caveats / reasons:**

- ⚑ alliesLowestHp stand-in: the kit's '1 ally unit(s) with the lowest HP percentage' is indeterminate in v1 (no HP pool — nobody takes damage), so the engine resolves it deterministically to the LEFTMOST ally (types.ts documented stand-in, blanc/moran precedent). The target choice moves no damage: the heal carries no modeled HP amount, only a recovery EVENT. The spec fixture puts crown leftmost so the stand-in target is the fixture's recovery consumer and the channel is observable.
- Heal MAGNITUDES (skill1 8.4% / burst 39.6% of the skill user's final Max HP) are recorded here but NOT modeled: the 'heal' effect emits a recovery event with no HP amount, and v1 has no HP pool. Both lines are implemented for their TANDEM value only — they fire allies' 'recovery' triggers (helm H2 precedent 'a heal is an event, not a number'; flora/marciana/sakura-suzuhara healer-lineage precedent).
- ⚑ lastBullet cadence: the per-magazine firing rate of skill1 depends on ammo (9) and reloadFrames (111) — datamine-unreliable fields (marciana precedent, same SG chassis). A wrong magazine economy scales the whole skill1 recovery channel.
- burst DEF line's 'Activates when above 50% HP' gate is a DERIVED-DETERMINISTIC collapse: v1 models no HP pool and no incoming damage (immortal units), so every unit's HP fraction is permanently 100% > 50% and the gate is ALWAYS satisfied — the line is encoded unconditional on burstCast. Whether the game reads the gate on the CASTER's HP or each TARGET's HP is unobservable in v1 — both readings collapse to the same encoding while nobody takes damage (flora's stage-enter proxy is the same argument shape).
- defPct is declared INERT in v1 (StatKey doc: self DEF doesn't affect own damage): the DEF line is kept for kit completeness + future consumers and is pinned damage-neutral by the spec (byte-identical totals with the line stripped).
- Gauge: mary has no datamined row in data/gauge-per-shot.json; the engine's SG weapon-class modal fallback (400) equals her datamined target_burst_energy_pershot 4000 → 400.0, so the fallback IS her value — no row needed (helm H3 pattern: gauge carried by data, not the override).

## `mast`

- **skill1** (1)
  - [Defensive / utility / mitigation] Sea Breeze: DEF ▼ 1.9% of the skill user's DEF, stacks up to 50 time(s) and lasts for 3 sec.

**Caveats / reasons:**

- skill1: the Sea Breeze DEF-reduction EFFECT is unmodeled — there is no dynamic enemy-DEF-reduction primitive (cfg.bossDef is a fixed per-hit subtraction; damageTakenPct is a separate bucket). At the 50-stack cap it is ~81.7 flat DEF off the 140-DEF scope-lock boss = ~0.16% team damage — a minor secondary effect, not load-bearing. The stack COUNT is captured indirectly: it sets Storm's steady-state mirror magnitude (burst) and the always-present 'Sea Breeze' status gates Storm. Recipe if a primitive lands: a stacking boss-DEF-reduction debuff (1.9% of caster DEF per stack, cap 50, 3s refresh driven by a 2-normal-crit trigger) feeding baseAtk = effectiveAtk - (bossDef - reduction).
- skill1: Sea Breeze is modeled as a passive always-present targetStatus (frame 0, 999s) — the kit's 'after 2 normal crits, up to 50 stacks, 3s refresh' accrual/decay is folded into a steady-state always-afflicted assumption (⚑; there is no crit-count trigger to drive discrete accrual). In a sustained fight the boss is afflicted for essentially the whole fight after the ~12s ramp, so Storm's requiresTargetStatus gate is always satisfied (structurally faithful — it WOULD block Storm if Sea Breeze were down — but never blocks in steady state).
- skill1: 'Activates when HP falls below 70% -> Critical Damage ▲50.94% continuously' is modeled as a passive always-on grant (no durationSec — 'continuously' = no expiry). v1 has no HP pool, so the gate cannot be literally evaluated; a squishy Supporter sits below 70% HP for essentially the whole sustained fight from boss damage WHETHER OR NOT she bursts, so the grant is assumed up for the whole fight (the pre-first-burst transient of a few seconds above 70% is neglected). CROSS-FAMILY: the S5 blind test writer (claude-opus-5) independently derived this passive/always-on encoding. The S2b reviewer (claude-fable-5) proposed a burstCast SELF-TRIGGER — the burst's un-restoring Max-HP grant (Max HP ▲86.2%, current HP unchanged) drops her HP ratio to 1/1.862 ≈ 53.7% < 70% for the 7s window — which is a real in-sim mechanism; it was REJECTED as primary because it makes the grant comp-dependent (zero uptime in any comp where mast does not burst, contradicting the real game where boss damage keeps her below 70% regardless). ⚑ MEASUREMENT-GATED: the real uptime, and whether the buff latches permanently vs condition-held, settle on a Mast-focus recording; the burstCast-7s window is the literal in-sim reading, passive-always-on is the real-game-faithful reading (this encoding).
- burst: Storm is modeled at the 50-stack CAP mirror (4.52% x 50 = 226%/tick, 7 ticks/burst) — the steady-state stack count (⚑ near-cap; the ~12s opening ramp where stacks accrue 0->50 is folded into the 180s average). Refine the stack count on a Mast-focus recording if the sim reads hot/cold. The DoT crits at Mast's sheet rate (DOT_CRIT default ON, U13 2026-07-21 — DoT/function damage crits in NIKKE, confirmed ginmy/maiden footage; the kit need not say so explicitly) and never cores (DoTs are core-ineligible). It is unflavored (plain damage — not sustained/distributed/sequential), so it rides the normal Damage-Up bucket. ENCODING CHOICE: a FIXED steady-state DoT (the mihara-bonding-chain precedent — mihara's Ensnaring/Dragons DoTs are fixed atkPct, NOT perResource). The S2b reviewer proposed a LIVE perResource seaBreeze pool read per tick; that is theoretically sharper (an early burst would mirror fewer stacks) but is NOT faithfully drivable here: the pool would accrue on a 2-normal-CRIT trigger, and the engine's hitCount counts ROUNDS not crits (no crit-count primitive), so any accrual threshold is a crit-rate-dependent ⚑ estimate. The fixed cap-mirror trades that unmodeled ramp for a single documented ⚑ (near-cap steady state), consistent with mihara; the first-burst over-credit is ~1/10 of Storm damage and partially bounded (stacks reach near-cap within the ~12s ramp). STACK-COUNT ⚑ (cross-family): the 50 cap assumes the 3s window REFRESHES on each application (shared timer — applications land every ~0.2s at the SMG fire rate × buffed crit rate, far faster than the 3s expiry, so stacks pile to the cap and bind there; 'stacks up to 50' implies the cap is reachable in normal play, and stack-building is Mast's design identity). The S5 blind writer (claude-opus-5) read 'lasts for 3 sec' as a PER-STACK expiry (each stack dies 3s after it lands), giving a turnover steady state of critRate×fireRate/2×3s ≈ 14 stacks where the cap never binds (Storm ≈ 63%/tick). The two differ ~3.6×; the shared-refresh/cap-bind reading is encoded here as the more standard NIKKE stacking-debuff behaviour, but the magnitude is measurement-gated — a Mast-focus popup read of a Storm tick settles stacks = tick% / 4.52%.
- burst: 'Max HP ▲86.2% of the skill user's Max HP without restoring HP' is casterMaxHpPct, offensively inert in v1 (no HP pool; ally-granted Max HP does not feed atkOfMaxHpPct per the e3 rule, and Mast has no self HP-scaling ATK). Encoded for kit completeness; it moves no damage.

## `maxwell`

- **skill2** (1)
  - [Partless / AoE / targeting] Activates when there are above 5 enemy units, excluding Nikkes. Affects self. Critical Rate ▲ 4.83%. Critical Damage ▲ 13.91%.

- **burst** (4)
  - [Weapon state / range / ammo / CDR] Change the weapon in use: Charge Time 2 sec
  - [Weapon state / range / ammo / CDR] Full Charge Damage 300% of damage
  - [Weapon state / range / ammo / CDR] Max Ammunition Capacity 1 round
  - [Weapon state / range / ammo / CDR] Additional Effect: Pierce

## `mica-snow-buddy`

- **burst** (1)
  - [Defensive / utility / mitigation] Affects all allies. Removes 1 debuff(s).

**Caveats / reasons:**

- burst: the team ATK ▲39.93% is a caster-basis FLAT add ((39.93/100)×Mica's static ATK) to all allies INCLUDING self, for 5s per burstCast — NOT % of each ally's own ATK
- skill2: the self Burst Gauge filling speed ▲300% (burstGenPct 300) is 'continuously' = permanent/passive; it scales only Mica's OWN gauge contribution
- skill1: the Tidying-Up 'Damage Taken ▼2%' MAGNITUDE is unmodeled (defensive; no incoming-damage model) — but its STACK CLOCK IS modeled as the `tidyingUp` resource pool (Block A) because it gates the max-ammo line. NOT encoded as the boss-debuff damageTakenPct (that would be the inverse channel and wrongly add team damage)
- skill1: the Max Ammunition Capacity ▲40% team buff (maxAmmoPct 40) is gated on resourceGate{tidyingUp,min:10}; activation EMERGES from the hitCount cadence (~46.6s in fixture), committing to the refresh-on-reapply stack reading (⚑ M4) — the per-stack-decay reading would never open the gate
- skill2: 'Stack count of buffs ▲1' — the SELF portion is folded as a +1 to the tidyingUp pool on hitCount:150 (Block C, accelerates the M4 gate ~78.6s→~46.6s); the CROSS-ALLY portion (teammates' stack buffs) is out-of-domain (⚑ M5)

## `mica`

- **skill1** (2)
  - [Defensive / utility / mitigation] ■ Activates when attacked 20 time(s). Affects self.
  - [Defensive / utility / mitigation] DEF ▲ 39.18% for 10S.

- **burst** (1)
  - [Defensive / utility / mitigation] DEF ▼ 13.32% for 5 sec.

**Caveats / reasons:**

- skill1: the whole attacked-20x sentence (self DEF ▲39.18% / 10s) is unmodeled — the sim has no incoming-damage model and no attacked-count trigger primitive, and the effect would be damage-inert even if it fired (admi/jackal precedent). Honestly absent (⚑1), not a stale fixture — the unit test pins the zero against the hitCount:20 'attacks' misread.
- burst: the DEF ▼13.32% / 5s enemy debuff is unmodeled — the engine has no debuff-scalable boss-DEF channel (enemyBuffs admits only damageTakenPct/distributedDamagePct; bossDef is a flat constant), himeno/eunhwa precedent. Mica comps read COLD by exactly that small team-wide lift (⚑2); the unit test pins the zero against a damageTakenPct laundering.
- skill2's modeled ammo channel is the kit's only damage lever: the +2-round windows (50% duty cycle, 10s every 20s) lift ONLY the two highest-final-ATK holders' firing uptime; the DEF half is inert. On a basis where mica herself or a low-ATK carry tops the ranking, the holder set re-ranks live per cast (byFinalAtk).

## `mihara-bonding-chain`

- **skill2** (4)
  - [Defensive / utility / mitigation] Activates when the skill user is incapacitated. Affects targets in the Ensnaring Chains state.
  - [Defensive / utility / mitigation] Ensnaring Chains stacks ▲ 20.
  - [Defensive / utility / mitigation] Activates when an enemy is neutralized while in the Ensnaring Chains state. Affects self.
  - [Defensive / utility / mitigation] Restraint Chain ▲ 1, up to 10.

**Caveats / reasons:**

- skill2: unparsed effect "Ensnaring Chains stacks ▲ 1."
- skill2: unparsed effect "Ensnaring Chains stacks ▲ 20."
- skill2: unsupported trigger "Activates when the skill user is incapacitated. Affects targets in the Ensnaring Chains state." — its effects are skipped
- skill2: unparsed effect "Restraint Chain ▲ 1, up to 10."
- skill2: unsupported trigger "Activates when an enemy is neutralized while in the Ensnaring Chains state. Affects self." — its effects are skipped
- skill2: 40-normals-in-Full-Burst Ensnaring generation is folded into skill1's steady-state DoT average (⚑ calibrated 12-stack rebuild average), not a discrete hitCount block
- skill2: unsupported trigger "Activates when the skill user is incapacitated. Affects targets in the Ensnaring Chains state." — defensive, skipped (boss deals no damage in v1)
- skill2: unsupported trigger "Activates when an enemy is neutralized while in the Ensnaring Chains state. Affects self." — boss never dies, skipped
- skill1: Restraint-dump timing ("at a specific timing") is kit-silent — modeled at battle start / Full Burst end (⚑)

## `milk-blooming-bunny`

- **skill2** (2)
  - [Bookkeeping / stacks / resources / stance] ■ Activates only when in Embarrassment status. Affects self.
  - [Weapon state / range / ammo / CDR] Pierce Damage ▲ 64.7% continuously.

- **burst** (2)
  - [Defensive / utility / mitigation] Overconfident, Huh?!:
  - [Defensive / utility / mitigation] Gains Immunity to Embarrassment for 10 sec.

**Caveats / reasons:**

- skill1: 'Gain Pierce for 6 sec' (full-charge trigger) is now MODELED (gainPierce durationSec 6 on shotFired — SR auto-full-charges every shot, so the 6s window refreshes continuously → she stays Pierce-tagged). Enacted 2026-07-20 (kit-audit Phase C ENACT-NOW; Fable pre-op APPROVED). This lights her previously-DEAD Pierce package: her burst pierceDamagePct +117.64% (10s) now applies to her burst-window damage (and she becomes an SR recipient of d-killer-wife's +13.55% in PG). DELIBERATE overshoot per faithful>fit (grave-pierce precedent DECISIONS 2026-07-17): PG 0.653 COLD → 1.301 HOT (total ~254M→506M, ~×2 — her burst window carries huge atkPct-220 + FB normals, and pierce ~doubles it). The residual HOT is now cleanly isolated to milk-blooming-bunny's SEPARATE over-models, NOT the pierce: (1) her second gotcha — the Embarrassment mode-split (MEASUREMENT-gated; auto-mode faithfulness of the burst atkPct 220 / S2 DoT 447.7 magnitudes), and (2) needs a milk-blooming-bunny-FOCUS pierce-window measurement (pierce-window DPS share). Do NOT re-fudge the pierce value (117.64 is datamined); fix the residual with a measurement. ⇒ open-questions U23.
- burst: unparsed effect "Overconfident, Huh?!:"
- burst: unparsed effect "Gains Immunity to Embarrassment for 10 sec."

## `milk`

- **burst** (2)
  - [No HP pool / healing domain] Incoming healing ▲ 75.5% for 10 sec.
  - [No HP pool / healing domain] Recovers 16.16% of attack damage as HP — magnitude only: the engine `heal` carries no HP amount by design (no HP pool); the 10-second recovery-event WINDOW is modeled (burst heal ticks:10 intervalSec:1).

## `mint`

- **skill1** (1)
  - [No HP pool / healing domain] Full Charge in Assigned Part: Dancing: all allies recover 1.8% of caster's Max HP every 1 sec, lasts 3 sec.

- **skill2** (1)
  - [Bookkeeping / stacks / resources / stance] Activates when entering Burst Stage 3 while not in Sing Along status: Cancels Singing and Dancing.

- **burst** (3)
  - [Bookkeeping / stacks / resources / stance] Only one Assigned Part is applied according to Mint's current status.
  - [Bookkeeping / stacks / resources / stance] Status 1: If in the Assigned Part: Dancing status, Mint gains Assigned Part: Singing. This effect is continuous and cannot be removed.
  - [Bookkeeping / stacks / resources / stance] Status 2: If not in the Assigned Part: Dancing status, Mint gains Assigned Part: Dancing. This effect is continuous and cannot be removed.

**Caveats / reasons:**

- burst: unparsed effect "Only one Assigned Part is applied according to Mint's current status."
- burst: unparsed effect "Status 1: If in the Assigned Part: Dancing status, Mint gains Assigned Part: Singing. This effect is continuous and cannot be removed."
- burst: unparsed effect "Status 2: If not in the Assigned Part: Dancing status, Mint gains Assigned Part: Dancing. This effect is continuous and cannot be removed."

## `misato`

- **skill2** (2)
  - [Defensive / utility / mitigation] Only activates when in Shooting Manual status. Affects all allies. Damage dealt to Shield ▲ 150% continuously.
  - [No HP pool / healing domain] Only activates when Shooting Manual is at max stacks. Affects self. Outgoing healing ▲ 30.05% continuously.

**Caveats / reasons:**

- skill1 blk1 (Shooting Manual) is the ONLY damage-live line in the kit: hitRatePct feeds the live Hit-Rate→core geometry (UNIGEO uniform-in-circle, DEFAULT since 2026-07-22; CONE_DELTA is the fallback arm). Stacks accrue 1→2→3 over the first ~9-10s of firing (60 hits ≈ 3.0s at the measured ~20 pulls/s frame-quantized SMG cadence, one reload gap included) and hold at 3 at steady state — re-trigger every 60 hits (~3s) refreshes the shared 5s window before it lapses, exactly the NIKKE stack-refresh convention (applyBuff). NOT instant-to-max at t=0.
- skill1 blk1 trigger identity: hitCount 60 (cumulative LANDED rounds, hitsPerShot 1) — NOT shotFired, NOT interval. Pinned by scripts/tests/units/misato.test.ts to exactly floor(shots/60) applications with stacks progression [1,2,3].
- skill1 blk2 heal MAGNITUDE (8.04% of caster final Max HP) is recorded here but NOT modeled: the 'heal' effect emits a recovery event with no HP amount (v1 has no HP pool). Implemented for its TANDEM value only — it fires the target's 'recovery' triggers (Crown-type). Target 'alliesLowestHp count:1' is indeterminate without an HP pool → the engine's documented LEFTMOST-ALLY stand-in (types.ts); the spec test slots misato rightmost so crown observes the channel.
- skill1 blk2 trigger identity: hitCount 120, NOT lastBullet — the two COINCIDE at her base 120-round magazine; the spec test splits them with a +60-round magazine patch (cadence stays pinned to 120 landed rounds; a lastBullet encoding provably drops to reload-boundary cadence). S2b adversarial note (claude-fable-5, 2026-08-04).
- burst heal MAGNITUDE (5.06% of caster final Max HP per tick) is NOT modeled — same event-only 'heal' channel. ticks:5/intervalSec:1 = first tick at cast, then +1s..+4s: five recovery events per ally per cast keep on-recovery consumers refreshed across the whole 5s window (blanc convention). Trigger is burstCast (HER own Burst I cast, cd 40s) — NOT fullBurstEnter, which would fire on rotations where another Burst I casts.
- skill2 is EMPTY by design: both lines are UNMODELED (verbatim above). L1 'Damage dealt to Shield ▲150%' needs a boss shield bar the sim never models (no shieldDamage StatKey; out of domain, same class as helm's partsDamagePct) and a 'requires own Shooting Manual buff active' gate the block schema has no primitive for (requiresTargetStatus is boss-side; requiresShielded is shield-receipt). L2 'Outgoing healing ▲30.05%' scales heal AMOUNTS that are themselves unmodeled (no outgoing-healing StatKey) and needs the max-stacks variant of the same gate. Both are offensively inert in the sim's domain — skips, not approximations; do NOT re-express them as generic damage/heal-count buffs (nearest-wrong models per S2b).
- ⚑ CADENCE TUPLE (MANDATORY, datamine-unreliable): pullsPerSec at the measured frame-quantized ~20/s (datamine rate_of_fire 1440 nominally 24/s; SMG frame quantization DEFAULT-ON since 2026-07-23, SMGRATE=24 the documented revert arm — game-mechanics.md §2 'SMG CADENCE IS CONTESTED') / reloadFrames 81 / ammo 120. Both skill1 channels scale directly with it (60/120-hit thresholds ≈ 3s/6s of fire time + reload gaps). Recipe: any Misato focus video — read the ammo counter frame-by-frame over a full magazine. ⚑ HoT first-tick timing: kit says 'every 1 sec for 5 sec'; the engine emits the first tick at the cast frame (5 events spanning 4s) — the t=0-vs-t=1s phase of the first tick is a convention, not measured.
- Rarity: SR — spec test runs her at the 2★/core 0 ceiling (claire precedent); scope lock's copies:10 encodes an SSR ceiling an SR can never reach.

## `modernia`

- **burst** (1)
  - [Partless / AoE / targeting] Destroy Mode: Extends her line of sight and auto-aims at all enemies within range. The stage target is treated as a single enemy regardless of whether it has parts (including interruption parts).

**Caveats / reasons:**

- skill1: reload tuple is unverified datamine — reloadFrames 159 + rolling-reload (reload_start_ammo 299); read the reload gap from any focus video (⚑1)
- skill2: Hit Rate ▲ 8.56% is modeled as hitRatePct — live-wired for AR/SMG/SG since CONE_DELTA (2026-07-19), but modernia is MG and MG/SR/RL keep the flat base table, so it still yields no core lift for her; whether Hit Rate lifts MG core rate in-game is unmeasured (⚑2)
- skill2: the ATK ▲ 29.38% 'during increasing Hit Rate status' gate is approximated as in-Full-Burst — exact when Modernia bursts (extended FB ≡ the 15s status), undercounts the 5s status tail on rotations another Burst III unit bursts (⚑3)
- burst: Destroy Mode per-hit 2.24% rides the extraHitDamagePct path and CRITS at her rate (SSOT damage-calculation.md §2b: function additional damage crits, never cores; RIDERCRIT default ON) — her S1 Critical Damage ▲ 14.25%×5 stacks make this term's crit lift ~+12% in-Full-Burst rather than the base +5%; the datamined ChangeWeapon (shot 1026002) fire profile is assumed identical to the base MG (⚑4)
- burst: Destroy Mode 2.24% CADENCE is unmeasured — shipped as a per-normal-hit rider (extraHitDamagePct, structurally parallel to S1's identically-phrased per-hit 3.05% line and consistent with the unlimited-ammo spray); the 1/s-DoT reading the parser baseline used is ~40-60× lower at MG fire rate and was rejected as a massive undercount, but no focus-video popup count confirms per-hit. Recipe: count 2.24%-valued popups per second inside the 15s Destroy Mode window — per-hit tracks fire cadence (~60/s at full spin), DoT gives exactly 1/s (⚑5)

## `moran`

- **skill1** (1)
  - [Defensive / utility / mitigation] Activates at the start of battle. Affects self. DEF ▲ 3.51% continuously for every 1% of HP lost.

- **skill2** (5)
  - [Defensive / utility / mitigation] Activates when firing the final bullet. Affects the 3 enemy unit(s) with the highest final ATK. Taunts for 4 sec.
  - [No HP pool / healing domain] Activates when HP falls below 20%. Affects self. Effects vary according to the number of uses. Perseverance: Only one effect is triggered at a time.
  - [No HP pool / healing domain] Once: Max HP ▲ 91% for 3 sec. Activates once per battle.
  - [No HP pool / healing domain] Twice: Max HP ▲ 69.84% for 3 sec. Activates once per battle.
  - [No HP pool / healing domain] Three Times: Max HP ▲ 51.09% for 3 sec. Activates once per battle.

- **burst** (5)
  - [Other] Additional Effect(s):
  - [No HP pool / healing domain] Recovers 36.14% of attack damage as HP over 10 sec.
  - [Defensive / utility / mitigation] Attract: Taunts all enemies for 10 sec.
  - [Defensive / utility / mitigation] Note: Unable to take cover while using Burst Skill.
  - [Defensive / utility / mitigation] DEF ▲ 14.85% of the skill user's DEF for 10 sec.

## `mori`

- **skill1** (2)
  - [Defensive / utility / mitigation] ■ Activates when using Burst Skill. Affects self if not in Struggle status. Struggle: Creates a Shield equal to 40.12% of the final Max HP continuously.
  - [Defensive / utility / mitigation] ■ Activates when Struggle status ends. Affects self. Max HP ▲ 5.06% continuously, stacks up to 5 time(s).

- **skill2** (3)
  - [Defensive / utility / mitigation] ■ Activates after landing 60 normal attack(s) when self is in Struggle status. Affects the target. Taunts for 4 sec.
  - [Partless / AoE / targeting] ■ Activates when an ally or self destroys an enemy's part. Affects all allies. Sustained damage ▲ 2.03%, stacks up to 5 time(s) and lasts for 15 sec.
  - [Partless / AoE / targeting] ■ Activates when an ally or self destroys an enemy's part. Affects 1 enemy unit(s) with the highest ATK. Deals 23.23% of final ATK as sustained damage every 1 sec for 15 sec.

- **burst** (1)
  - [Defensive / utility / mitigation] ■ Activates when self is not in Struggle status. Affects self. Max HP ▲ 10.09% for 10 sec.

**Caveats / reasons:**

- skill1: Struggle is modeled as a durationSec-less shield (permanent at scope — sim.ts: no duration = MAX_SAFE_INTEGER window). This is the faithful reading of 'continuously' for a fight where the boss deals no damage: the shield can never break, so Struggle never ends and the kit's three Struggle-END/NOT-IN-STRUGGLE branches (all unmodeled) correctly fire ZERO times all fight
- burst: the 15.04% shield-recovery line carries requiresShielded even though the gate always passes at scope — the condition is part of the kit text ('Activates when self is in Struggle status') and becomes live the day an engine model can break shields; M4 proves the block is exactly damage-inert today. The shield effect records the magnitude only (no HP pool is modeled — types.ts shield docstring 'recorded for kit completeness')
- burst: 'Affects all allies' = {kind:'allies'} incl. self (engine convention, no excludeSelf). mori herself has no sustained-flavor hits in the model, so the buff is damage-inert ON HER and lives through teammates' sustained-flavor damage (test fixture: jill's Acid Ammo DoT)
- burst: buff lands at cast time (burstCast), which precedes the Full Burst window — the line has no FB-timing clause, so no fbGate/noFb annotation (it is a buff, not a damage instance, so the FB major is not in play either way)
- gauge: mori has a datamined gauge-per-shot row (base 20 / target 40 = burst_energy_pershot 2000 / target 4000 divided by 100, same convention as every datamined AR row). The AR class-modal fallback (40) happens to coincide with her target value, so the row is documentation-grade as well as correct
- fixture: mori is Burst II — the standard controlComp (crown B2) would starve her casts; the unit test fields her as the SOLE B2 (liter/mori/jill) so she casts every chain

## `naga`

- **skill1** (1)
  - [Defensive / utility / mitigation] Activates after landing 12 normal attack(s). Affects all allies. Restores 14.57% of Cover's Max HP.

**Caveats / reasons:**

- skill1/burst: shield-gated lines (coreDamagePct 85.17, casterAtkPct 31.02) fire only off REAL shield events/state (owner-ruled default-off 2026-07-20) — uptime inherits the shielder's shield cadence, unmeasured vs in-game (⚑)
- skill2: the 9.58% heal is modeled as a recovery-feed EVENT only (tandem rule — fires teammates' on-recovery triggers); the HP MAGNITUDE (9.58% of caster final Max HP) is not encoded — the engine heal effect carries no HP amount (gauntlet 2026-07-25, prika precedent). 'lowest HP%' resolves to the leftmost 2 allies (v1 has no HP pool — documented stand-in; damage-inert except via the recovery feed)
- burst: self-Pierce is modeled as a timed gainPierce window (10s post-cast); damage-INERT at scope lock — naga is SG and no pierceDamagePct source lands on her in the graded comp (d-killer-wife's targets SR allies only), verified byte-identical totals with the block removed (gauntlet 2026-07-25)

## `nayuta`

- **skill1** (3)
  - [Defensive / utility / mitigation] Unchanging Heart: Gain Indomitability for 9 sec. Activates 1 time(s) during battle.
  - [Defensive / utility / mitigation] Equally shares HP recovery for 5 sec.
  - [No HP pool / healing domain] Recovers 25% of the skill user's final Max HP as HP.

- **skill2** (1)
  - [Bookkeeping / stacks / resources / stance] Memory Absorption: Hit Rate ▲ 1.4%, stacks up to 30 time(s) and immune to stack count increase or decrease effects continuously. This effect cannot be removed.

## `neon-vision-eye`

- **skill1** (1)
  - [Defensive / utility / mitigation] When attacked while not in Healthy Body: Invulnerability for 3 sec (5 times per battle) and debuff immunity; Healthy Body: incoming healing ▲10.26% for 20 sec (defensive — invuln/immunity/received-heal amp; emits no heal event, no cross-unit consumer wiring needed)

- **skill2** (2)
  - [Bookkeeping / stacks / resources / stance] Firepower Gauge bookkeeping: gains 100 Firepower Gauge at battle start; +2 per normal attack during Firepower Charge; +45 when Firepower Charge ends (NOT a block — the steady-state consequence is ABSORBED into the skill1 Super block's everyN 3 / everyNOffset 1: start at 100 → Super on her burst casts 1, 4, 7…; video-confirmed cast-by-cast, Run B)
  - [Bookkeeping / stacks / resources / stance] When Full Burst ends: charges own burst gauge in proportion to the current Firepower Gauge (gauge→burst-gauge conversion; burst-generation only, unmodeled; empirically does not consume the Firepower cycle — every-3rd-Super held on video)

- **burst** (3)
  - [Bookkeeping / stacks / resources / stance] Firepower Gauge below 100: activates Firepower Charge, charging the gauge for 10 sec (bookkeeping — ABSORBED into the everyN 3 alternation)
  - [Bookkeeping / stacks / resources / stance] Firepower Gauge at 100: consumes 100 Firepower Gauge on activating Super Firepower (bookkeeping — ABSORBED into the everyN 3 alternation)
  - [Partless / AoE / targeting] Explosion Radius ▲200% for 10 sec (inert — single partless boss, no AoE surface)

## `neon`

- **skill1** (1)
  - [Partless / AoE / targeting] Activates when killing an enemy. Affects 2 ally unit(s) with the highest final ATK. Critical Rate ▲ 3.56% for 5 sec.

## `nero`

- **skill1** (2)
  - [Defensive / utility / mitigation] Activates when recovery takes effect. Affects the target who cast the skill with recovery effect on Nero. Damage Taken ▼ 14.14% for 5 sec.
  - [Defensive / utility / mitigation] Activates when recovery takes effect. Affects self. Cat's Repayment: Damage Taken ▼ 8.43%, stacks up to 5 time(s) and lasts for 5 sec.

- **skill2** (2)
  - [No HP pool / healing domain] There is a 30% chance of activating when attacked. Affects the target. Damage Taken ▲ 8.26% for 5 sec.
  - [No HP pool / healing domain] There is a 30% chance of activating when attacked in Grumpy Cat status. Affects the target. Deals 158.05% of final ATK as damage.

- **burst** (2)
  - [Defensive / utility / mitigation] Affects self. Attract: Taunts all enemies for 15 sec.
  - [No HP pool / healing domain] Activates when Cat's Repayment is at max stacks. Affects self. Grumpy Cat: Incoming healing ▲ 60.08% for 15 sec.

**Caveats / reasons:**

- burst: the 1104.91% nuke is burstCast-keyed (her OWN cast) and lands pre-Full-Burst — it never takes the +50% FB major; 'highest remaining HP' collapses to the single partless boss
- skill2: Max HP ▲60.28% is a passive self maxHpFlat grant (targetMaxHpPct → own-% basis), permanent ('continuously'), offensively INERT (no HP→ATK conversion in her kit) but kept — her raised live Max HP is readable by cross-unit consumers (highestAllyMaxHpPct rankers)
- THE GRUMPY-CAT CHAIN (S1 stacks → burst Grumpy Cat status → S2 attacked-procs) is carried verbatim in `unmodeled`: the v1 boss deals no damage, the schema has no 'attacked' trigger / chance primitive / stack-count gate / incoming-healing stat, so the chain has ZERO in-domain observables; activation recipe recorded in the note (engine-capability-gated, TIER 3)
- skill1: nero's `recovery` trigger condition DOES occur in comps with a healer (helm's full-charge pulls in the test fixture) — S1 ships no blocks, so nothing fires; this is the unmodeled ruling, not a missing trigger

## `nihilister`

- **skill1** (2)
  - [Partless / AoE / targeting] Piercing Radius ▲ 50% for 1 round(s).
  - [Partless / AoE / targeting] ■ Activates when hits 2 or more enemies concurrently. Affects all enemies hit. Deals 50.33% of final ATK as additional damage.

**Caveats / reasons:**

- skill1: 'Gain Pierce for 1 round(s)' is a ROUND-COUNT duration carried as a timed gainPierce window (durationSec 4 = worst-case inter-shot gap incl. one empty-mag reload, from the ⚑1 SR cadence tuple; gainPierce has no durationShots) — per-shot shotFired refresh keeps the tag continuous while firing; the grant lags the triggering shot's damage by engine dispatch order (phantom ⚑2 class), so shot 1 is the application event
- skill1: Piercing Radius ▲50% and the 2+-enemies-concurrent 50.33% bonus are UNMODELED verbatim — out-of-domain for v1's single partless boss (no geometry, no second enemy); ⚑3/⚑4
- skill2: the 112.64% hit has NO kit-stated trigger — fires on its datamined internal cooldown (interval:10, skillCooldownsSec.skill2), first fire t=10 (⚑2 phase)
- burst: all three lines are burstCast-keyed (HER casts only — a different B2's Full Burst must not fire them); the Burn is a 10×1s-tick DoT whose ticks crit via the universal DOT_CRIT gate (no per-dot opt-in); the ammo line is maxAmmoFlat 6 (NOT maxAmmoPct — the % form coincides at her 6-round base and is the trap)

## `noah`

- **skill1** (1)
  - [Defensive / utility / mitigation] There is a 10% chance of activating when attacked. Affects all allies. Damage Taken ▼ 8% for 10 sec.

- **skill2** (1)
  - [Defensive / utility / mitigation] Activates when hitting a target with a Full Charge attack. Affects the target. Taunt for 2 sec. ATK ▼ 13.25% for 5 sec.

- **burst** (2)
  - [Defensive / utility / mitigation] Affects self. Attract: Taunt all enemies for 10 sec.
  - [Defensive / utility / mitigation] Affects all allies. Invulnerable for 3 sec.

**Caveats / reasons:**

- ⚑ CADENCE TUPLE (ALWAYS-⚑): RL charge cycle — chargeFrames 60 / ammo 6 / reloadFrames 171 / hitsPerShot 2 / rate_of_fire 60 — shipped from datamine; affects her OWN shots only (weapon damage + burst-gauge feed). She has NO datamined row in data/gauge-per-shot.json, so her gauge accrual uses the RL modal fallback (280/trigger × the RL-charge focus multiplier) — the cadence of her burstCast keying (and therefore of the defPct channel below) inherits that estimate. No kit line keys off her shots (S2's full-charge-hit clause is UNMODELED), so a wrong cadence rescales nothing kit-side — only the channel's firing count.
- Burst DEF line ('DEF ▲ 133.48% for 10 sec', all allies) is encoded as defPct — the LITERAL form this time: the kit grants each ally a percentage of their OWN DEF, which is exactly what defPct scales (contrast marciana's burst DEF line, which is caster-DEF-scaled and therefore only a semantic approximation). defPct is deliberately INERT in v1: self DEF never enters damage dealt and there is no incoming damage, so the grant moves no unit's total — kept for kit completeness (marciana's inert-defPct convention) and for any future DEF consumer/scaler.
- burstCast keying (own-cast prior, marciana/folkwang convention): the DEF grant is noah's OWN Burst II block — keying it to fullBurstEnter would over-fire the channel on every Full Burst a competing Burst II opens (noah.test.ts N3 discriminates this behaviorally against the fixture's CD-20 B2 naga, whose chains complete without noah casting).
- S1 'Damage Taken ▼ 8%' UNMODELED: the clause is a DEFENSIVE ally-side damage-taken reduction (▼ direction, all-ally target) — the schema's only damage-taken stat is damageTakenPct, a BOSS debuff where positive = boss takes MORE, so it cannot express this line without inverting both target and direction (the nearest-wrong model the S2b reviewer independently flagged: a boss-held -8% would drag the whole board down 8%). The 10%-when-attacked activation also has no trigger primitive (no attacked-trigger, no RNG gate) and the v1 boss attacks nobody.
- S2 'Taunt for 2 sec' + 'ATK ▼ 13.25% for 5 sec' UNMODELED: v1 models no aggro/targeting and no enemy stats (the boss deals no damage, so an enemy ATK ▼ has no consumer). NOT encoded as a targetStatus (that channel is for kit-NAMED gateable statuses such as d-killer-wife's Wipe Out; fabricating a 'Taunt' status would invent a gate no kit line asks for — folkwang precedent), NOT as a negative atkPct on self/allies (the ▼ is on THE TARGET — the enemy). The full-charge-hit activation clause has no trigger primitive either.
- Burst 'Attract: Taunt all enemies for 10 sec' UNMODELED: same no-aggro ruling as S2's taunt.
- Burst 'Invulnerable for 3 sec' UNMODELED: v1 models no HP pool / death / incoming damage. Deliberately NOT encoded as a `shield` effect (the nearest-primitive trap, S2b-flagged): a shield encoding would open the targets' shieldedUntilFrame windows and fire teammates' 'shielded' triggers / requiresShielded gates — fabricating a synergy surface the kit never grants. Invulnerability is a distinct named mechanic from Shield in kit vocabulary (marciana's Storage precedent).
- Zero damage lines and zero weapon-state modifiers in the whole kit: noah's entire board footprint is ONE inert defPct channel on her own burst casts. Her personal damage is weapon-only (RL charge, hitsPerShot 2). She is damage-neutral by the same proof as the six clean-weapon basis units (noah.test.ts N1: own AND team totals byte-identical vs the empty kit, solo and in-comp), though she is NOT one of the six basis cells (the harness list is owner-fixed).

## `noise`

- **skill1** (1)
  - [Defensive / utility / mitigation] ■ Activates when attacked 20 time(s). Affects all allies. Damage Taken ▼ 10.66% for 20 sec. — ally received-damage mitigation; v1 models no incoming ally damage and no ally HP pool, so the 'attacked 20×' trigger never accrues and 'allies take less damage' has no effect. The only damageTakenPct primitive is a BOSS debuff (positive = boss takes MORE) — the wrong direction/target, so it is NOT used (encoding it would manufacture a phantom team damage gain). ⚑ engine-core / out-of-domain (see caveats).

- **skill2** (1)
  - [Defensive / utility / mitigation] ■ Activates when hitting a target with a Full Charge attack. Affects the target. Taunts for 2 sec. — aggro/targeting control; the sim is single-target with a fixed boss script and no taunt/aggro primitive, so hit location never changes damage. ⚑ inert / out-of-domain (see caveats).

**Caveats / reasons:**

- skill1 (Damage Taken ▼) ⚑ engine-core / out-of-domain: 'when attacked 20× → all allies Damage Taken ▼10.66% for 20s'. ESTIMATE: in a real fight this is a meaningful team survivability buff (≈10.66% less damage taken for 20s once the 20-hit counter accrues), but it scales only damage RECEIVED, which the v1 sim does not model — damage-neutral here. RECIPE: add an engine ally-HP-pool + incoming-boss-damage model and an 'allies take ▼X% damage' received-damage stat (distinct from the boss-facing damageTakenPct debuff), then encode S1 on an on-being-attacked hitCount:20 trigger to allies. TIER: engine-core (new primitive), out-of-domain for the no-incoming-damage v1 sim — same precedent as flora's HP-gated S2 and liter's cover-HP NO-OP.
- skill2 (Taunt) ⚑ inert / out-of-domain: 'hitting a target with a Full Charge → Taunts for 2s'. ESTIMATE: damage-neutral — taunt redirects enemy aggro, which a single-target sim with a fixed boss script never exercises. RECIPE: none for DPS (would need a multi-target/aggro model). TIER: inert / out-of-domain.
- skill2/burst Max-HP grants are encoded for kit-SSOT completeness but are OFFENSIVELY INERT: Noise has no atkOfMaxHpPct conversion, so the S2 self grant (casterIdx===self) feeds no HP-scaling, and the burst team grant lands on allies (casterIdx≠target) which the e3 video rule excludes from feeding a teammate's conversion anyway. Both emit maxHpFlat buffApply events (queryable, future HP-consumer ready) and move no team total — pinned by the strip-diff inertia assertions in noise.test.ts (N1/N3).
- burst heal: the HP MAGNITUDE (2.47% of caster final Max HP per tick) is not modeled (no HP pool) — only the per-second recovery EVENT cadence (ticks:10 over 10s) is, which is what recovery-consumer teammates (crown-type) key off. The heal-over-time emits its first recovery event immediately, then 9 more at 1s intervals (≈10 events spanning ~9s per cast).

## `novel`

- **skill1** (1)
  - [Defensive / utility / mitigation] DEF ▼ 7.05% for 5 sec.

**Caveats / reasons:**

- skill1: cadence is the DATAMINED skill cooldown (interval 10s); first-fire phase (t=10 vs t=0) is the engine interval convention (⚑, neve/snow-white precedent). 'Affects 3 enemy unit(s) with the highest final DEF' collapses to the single boss — v1 fields one immortal enemy, so the selection clause is a moot documented stand-in (neve precedent)
- skill1: the DEF ▼ 7.05%/5s enemy debuff is UNMODELED — no dynamic enemy-DEF-reduction primitive (cfg.bossDef is fixed; damageTakenPct is a different bucket). At the 140-DEF scope-lock boss this is 9.87 flat DEF ≈ ~0.02% team damage — minor, not load-bearing. Recipe if a primitive lands: a boss-DEF-reduction debuff (7.05% for 5s, refreshed on the 10s skill CD) feeding the subtractive DEF term
- skill2: Cornucopia's 15s per-stack EXPIRY is not tracked by the resource gate pool (resources are monotonic — soda Golden-Chip precedent). Divergence from the real kit is only possible during >15s firing gaps, where stacks would decay; at novel's SMG cadence (~19 shots/s, one stack per ~5.3s) sustained combat always refreshes before expiry, so the pool equals the real stack count in every fight the sim models. The DEF▲ buff itself DOES carry the 15s expiry + 5-stack cap (faithful accrual, observable in the event log)
- skill2: 'landing 100 normal attacks' is encoded as hitCount:100 — the counter advances by hitsPerShot per trigger pull (novel hitsPerShot 1, so 100 shots = 100 hits); SMG shots at scope lock do not miss
- burst: the Damage-Taken mark targets '1 enemy unit(s)' — unspecified WHICH enemy in prose; with one boss it is boss-held regardless (enemy buffs key on the enemyBuffs list). Gate reads the PRE-fire pool at cast time; casts before the 5th Cornucopia stack accrue land without the mark — faithful to 'Activates when Cornucopia is at max stacks'

## `pascal`

- **skill1** (1)
  - [No HP pool / healing domain] ■ Activates after firing 10 time(s). Affects 1 ally unit(s) with the highest final DEF. Recovers 6.28% of the skill user's final Max HP as HP.

- **skill2** (1)
  - [No HP pool / healing domain] ■ Activates when entering Burst Stage 1. Affects 3 ally unit(s) with the lowest remaining HP. Incoming healing ▲ 38.4% for 10 sec.

**Caveats / reasons:**

- burst: the heal is event-only — the 55.29%-of-final-Max-HP magnitude is unrecordable in v1 (no HP amounts), and 'the skill user's final Max HP' scaling has no carrier; the block's observable is the recovery events it emits to the leftmost-3 allies on her cast frame (pinned via asuka's S1 consumer in the spec fixture)
- burst: keyed burstCast (her own Burst I cast), NOT fullBurstEnter — the cast precedes the Full Burst window and an FB-entry keying would misattribute team FBs another Burst I opened (multi-B1 generality; sora/milk precedent)
- burst ⚑1 (targeting stand-in): 'the 3 ally unit(s) with the lowest remaining HP' is indeterminate in v1 (no HP pool) → alliesLowestHp resolves to the documented LEFTMOST-3 stand-in (types.ts TargetDef comment; sakura-suzuhara/ether precedent). ESTIMATE: in a real fight the heal lands on whoever is actually lowest; an on-recovery consumer only stays refreshed if it is among the real 3 targets — bounded by the consumer's buff value × its window per cast, zero consequence in a comp with no recovery consumer. RECIPE: any pascal focus recording — read which 3 units the heal popups land on vs their HP bars. TIER: low (only moves comps that stack a recovery consumer outside the real target set).
- skill1 ⚑2 (UNMODELED — engine-core: no ally DEF-ranking selector): 'after firing 10 time(s) → the 1 ally with the highest final DEF → Recovers 6.28% of pascal's final Max HP'. The cadence (every 10th shot; RL hitsPerShot 1, so pulls = rounds = hits → hitCount:10) and the heal EVENT are expressible, but the targeting clause is not: resolveTargets has no DEF-ranked ally kind, and S4 forbids the engine edit. Emitting the event on any expressible stand-in would fabricate a recovery attribution (on-recovery consumers key on the RECIPIENT), so the line ships as a priced absence — flora/grave precedent (genuine missing primitive, bounded, documented → DOCUMENTED_GAP, not NO-GO(engine-core)). ESTIMATE: 1 recovery event every 10 pascal shots (≈ every ~9.5s: 10 shots at 90 RPM spanning one 171-frame reload) to the highest-final-DEF ally — in practice usually a Defender-class teammate; damage impact zero unless a teammate with an on-recovery consumer IS that ally, then the consumer's buff value × uptime; the heal amount itself (6.28% of her final Max HP) is survivability-only and out of domain. RECIPE: add a DEF-ranked ally selector to resolveTargets (level-scaled DEF is already computed in stats.ts but not carried into UnitState, so plumb it through prepare first; then mirror alliesTopAtk's evaluated-once ranking), then encode hitCount:10 → {that selector, count 1} → heal; pin from a pascal focus video showing which ally the S1 heal popups land on. TIER: engine-core (new selector primitive), low comp-frequency.
- skill2 ⚑3 (UNMODELED — inert): 'Incoming healing ▲ 38.4% for 10 sec' on the 3 lowest-remaining-HP allies at Burst Stage 1 entry. No incomingHealingPct StatKey exists and heal effects carry no HP amount, so the amplifier multiplies nothing — damage-neutral by construction (sakura-suzuhara's S2 is the identical line and the binding precedent). ESTIMATE: zero damage impact in v1; in game it amplifies the recipients' received healing for 10s per chain. RECIPE: none for DPS — would need an HP pool + an incomingHealingPct stat; the nearest-wrong proxy (a HEAL on stageEnter:1) is pinned RED by the spec: it would spuriously emit recovery events at every chain start and feed on-recovery consumers. TIER: inert/out-of-domain.
- gauge: no gauge-per-shot.json row — RL modal fallback (sim.ts GAUGE_MODAL_BY_WEAPON); her 40s-cd cast cadence in fixtures is gauge/CD-limited by that estimate, which rescales nothing kit-side (no kit line keys off her shots)

## `pepper`

- **skill1** (1)
  - [No HP pool / healing domain] ■ Activates when the last bullet hits the target. Affects all allies. Refresh Heart: Incoming healing ▲ 6.53%, stacks up to 5 time(s) and lasts for 15 sec.

- **skill2** (1)
  - [Defensive / utility / mitigation] ATK ▼ 3.55% for 5 sec.

- **burst** (1)
  - [Bookkeeping / stacks / resources / stance] ■ Affects all allies. Increases stack count of stackable buffs by 1.

## `phantom`

Phantom (Treasure) is a Water AR Burst-III attacker built around a thief cycle: her first hit on a target not carrying Calling Card applies it (a 5s status window; the DEF-down content is inert in the sim), and every hit while it is up grants herself Attack Damage ▲75.17% for 1 round. Thief's Dagger stacks (Hit Rate ▲25.75% ×3, fed once per magazine start and once every 30 hits by her treasure) hit max on the last shot of every magazine, consuming for 84.33% additional damage + 250% distributed damage to all enemies + a permanent Distributed Damage ▲12.86% stack (×3, cleared by her own burst). Every 10 normal attacks she buffs ATK ▲85.12% (5s) and Distributed Damage ▲31.92% (10s). Her burst deals 1457.28% distributed damage to all enemies, marks Fire Code targets Damage Taken ▲18% (30s), and expands her own magazine ▲50% (10s).

- **skill1** (1)
  - [Defensive / utility / mitigation] Calling Card: DEF ▼ 32.19% for 5 sec. — the DEF▼ MAGNITUDE is inert (enemy DEF is a negligible flat subtractive term at scope-lock ATK, docs/data/damage-calculation.md; the engine drops enemy DEF debuffs, sim.ts:1782). The Calling Card status WINDOW itself IS modeled (targetStatus) as the gate for S1's Attack Damage line and S2's max-stacks consume.

- **skill2** (1)
  - [Bookkeeping / stacks / resources / stance] Removes Calling Card. — the engine has no consume-target-status primitive; the window lapses naturally 5s after application, which under steady fire pre-empts the next magazine-start reapplication (moot). The 84.33% additional damage and the Thief's Dagger stack drain of the same max-stacks event ARE modeled.

**Caveats / reasons:**

- skill1: BLOCK ORDER IS LOAD-BEARING — the requiresTargetStatus-gated Attack Damage block precedes the targetStatus-inflicting block in the skill1 array, so the battle's first shot (the sole application event under the self-extending window, gate still closed at dispatch time) does NOT receive the buff. Reversing the two blocks would grant it.
- skill1: the Calling Card window self-extends on every shot (shotFired refresh) — the kit's 'not in Calling Card state' application clause collapses to the battle's first shot under continuous fire, where the real window lapses at 5s and the next hit re-applies it immediately (on-shot duty ~98.3-100% at any magazine length). The collapse matches that duty (+1.7% on gated shots) and covers the post-burst extended magazine a fixed phase would mis-model (⚑1).
- skill1: the Attack Damage line carries durationShots:2, authored against the kit's 'for 1 round(s)' as the engine-order compensation (⚑2): shotFired blocks dispatch after the shot's damage, so a :1 budget never contributes; :2 keeps the buff live on every shot from the 3rd on.
- skill1: Thief's Dagger is a live resource pool read by a perResource hitRatePct buff; the kit's 5s per-stack duration never binds because the consume (hit 60, t≈4.92s) always pre-empts it, so the pool equals the real stack count at every frame. Hit Rate's core-fraction YIELD is a derived estimate (⚑4).
- skill2: the max-stacks consume is one block (shotFired + resourceGate thiefsDagger min:3 + requiresTargetStatus 'Calling Card'); block order across slots puts every skill1 grant before this skill2 gate, so the treasure grant at hit 60 opens the gate on that same shot. The requiresTargetStatus clause is always satisfied at the consume instant under steady cadence (consume at t≈4.92s inside the [0,5) window).
- skill2: 'Removes Calling Card' is unmodeled (no consume-target-status primitive, ⚑3) — moot: the natural 5s lapse pre-empts the next reapplication under steady fire.
- skill2: the Distributed Damage ▲12.86% continuous stacks are the live resource pool 'distAmp' read by a perResource buff; the burstCast reset (delta -3) is EXACT via the resource machinery (not a steady-state approximation).
- burst: the distAmp reset block is ordered AFTER the nuke block so the burst's own distributed hit resolves with the pre-removal stacks (⚑6 — 'removed AFTER Burst Skill is used').
- burst: 'all enemies' resolves to the single v1 boss; the Damage Taken ▲18% line is bossElementGate 'Fire' — live vs Fire, exactly inert vs any other boss (pinned byte-identical on removal vs Iron).
- whole kit: the consume cadence (one per magazine) derives from the datamined RoF 720 / reloadFrames 141 / ammo 60 tuple (⚑5 — unverified for this unit; read off a focus video before hand-tune).

## `poli`

Team-shield defender. Every 5 shotgun blasts she raises the whole team's ATK by 5.46% for 10s (near-permanent uptime); at battle start she gains the Police Badge, a self-shield equal to her full Max HP for 10s. Every 20s she raises her own DEF and that of the 2 most wounded allies by 23.51% for 10s and shares damage taken (defensive, unmodeled). Her burst grants all allies ATK ▲44.55% for 10s and a shared shield equal to 40% of her final Max HP for 10s; the badge-gated Indomitability and the badge-ending heal are unmodeled (defensive/no primitive).

- **skill2** (3)
  - [Defensive / utility / mitigation] Equally shares damage taken for 10 sec.
  - [Defensive / utility / mitigation] Activates when Police Badge ends. Affects self.
  - [Defensive / utility / mitigation] Continuously recovers 5% of the skill user's final Max HP every 1 sec for 5 sec.

- **burst** (2)
  - [Defensive / utility / mitigation] Activates when in Police Badge status. Affects self.
  - [Defensive / utility / mitigation] Gains Indomitability for 5 sec. Removes Police Badge.

**Caveats / reasons:**

- skill1: 'after 5 normal attacks' is encoded hitCount:50 — SG units advance the engine's hit counter by hitsPerShot (10 pellets) per trigger pull (guilty precedent), so 5 attacks = 5 trigger pulls = one proc every ~3.3s at the SG class rate; the 10s window saturates to ~100% uptime
- skill1: the Police Badge is a shield EVENT (no HP pool at scope): it fires shield-synergy 'shielded' triggers and opens poli's requiresShielded window for 10s from battle start; its in-kit roles (burst Indomitability gate, S2 ending-heal anchor) are unmodeled — see unmodeled
- skill2: the DEF grant is damage-inert in v1 (encoded for kit completeness); 'lowest-HP' targeting resolves to the engine's deterministic leftmost stand-in; the damage-sharing line is unmodeled (no primitive; defensive)
- skill2: the badge-ending recovery line is unmodeled — no own-shield-expiry trigger primitive; heal amount inert (no HP pool), recovery events second-order (⚑1)
- burst: Indomitability + 'Removes Police Badge' unmodeled (no primitive; defensive; the badge gate is structurally unsatisfiable at scope lock — badge ends t=10s, first burst >=40s)
- burst: the shared shield ships at the prose 40% — the datamine description_value_list says 22.27% at level 10 (⚑2); magnitude unobservable in v1 (no HP pool), the block exists for shield-synergy wiring

## `power`

- **skill2** (1)
  - [Partless / AoE / targeting] Explosion Radius ▲ 38.61% for 10 sec.

**Caveats / reasons:**

- skill1: the 'Blood Fiend at max stacks' condition is read from a `bloodFiend` resource pool (0→5, +1 per full charge), not from the buff itself — the engine has no buff-stack gate primitive. The pool does NOT expire; the real buff drops 3 sec after the last full charge. ⚑ estimate: zero divergence at scope-lock cadence — measured, her longest apply-to-apply gap in a sim fight is the 172f (2.87s) reload boundary, under the 3s expiry by 8 frames, so the pool and the buff never disagree in-fight; divergence only after a >3s fire pause. Recipe: a focused Power recording spanning a >3s fire pause (boss phase transition) — read the Blood Fiend icon expiry vs whether the next S2/burst still consumed the max-stacks condition. Tier: low (outside every graded comp's cadence).
- skill2: 'Activates 1 time(s) per battle' is encoded as everyN 999 / everyNOffset 1 — first gated activation only; no generic once-per-battle block field exists (burstCdr.oncePerBattle is effect-local).
- burst: 'the 1 enemy unit(s) with the highest final ATK' resolves to the single scope-lock boss (target enemy) — the sim has no multi-enemy axis to rank.

## `prika`

- **skill1** (2)
  - [No HP pool / healing domain] Outgoing healing ▲ 49.92% continuously.
  - [Weapon state / range / ammo / CDR] Gains Pierce. This effect is continuous.

- **skill2** (3)
  - [No HP pool / healing domain] Max HP ▲ 19.98% for 10 sec.
  - [Bookkeeping / stacks / resources / stance] Effect 1: Affects the member who initiated Sing Along. Assigned Part: Singing. This effect is continuous and cannot be removed.
  - [Weapon state / range / ammo / CDR] Effect 2: Affects all allies. Performance duration ▲ 21 sec.

- **burst** (1)
  - [No HP pool / healing domain] Effect 1 HP MAGNITUDE: Restores 3.04% of the skill user's final max HP as HP — the recovery CADENCE (every 1 sec for 25 sec = 25 ticks) IS modeled (heal ticks:25 intervalSec:1, driving on-recovery consumers); only the HP amount is not (the engine's heal effect carries no HP value). This effect cannot be removed.

**Caveats / reasons:**

- Encore is a proxy: the real trigger is 'Sing Along takes effect while Prika is in Performance' (a partner mechanic, e.g. Mint) — solo mode fires it on EVERY Full Burst entry even in teams with no Sing Along caster (over-credits the ally Attack Damage ▲ 25.01% AND over-applies the self Burst-cooldown ▲ 21s).
- Prika's kit grants her continuous Pierce while in Performance (her OWN burst's 25s status window), but the override carries no Pierce tag — her own Pierce Damage ▲ 13.09% and any partner Pierce buffs do not land on her. Held on a standing OWNER popup measurement (probe-runs 2026-07-14 inconclusive). Faithful encoding when discharged: gainPierce durationSec 25 on burstCast (windowed to Performance), NOT top-level hasPierce:true (which would tag her from frame 0). game-mechanics §11 rules Pierce Damage ▲ applies on the partless boss, so the popup verifies the encoding rather than enables it.
- The burst Performance heal's recovery CADENCE (3.04% of caster max HP, every 1s for 25s = 25 ticks) IS emitted as recovery events (heal ticks:25 intervalSec:1) — 'when recovery takes effect' consumer kits (Crown-type) now proc off Prika across the full 25s window. Only the heal's HP MAGNITUDE (3.04%) is unmodeled (the engine's heal effect carries no HP amount).
- Encore's 'Performance duration ▲ 21 sec' is unmodeled — in solo mode the burst's Charge Damage ▲ 25% (and heal) run 25s instead of an extended ~46s when Encore fires.

## `privaty`

- **burst** (2)
  - [Defensive / utility / mitigation] Stuns for 3 sec.
  - [Defensive / utility / mitigation] Designated Target: ATK ▼ 5.02% for 10 sec. (the STATUS is modeled via targetStatus; its ATK-down content is inert in v1 — the boss never attacks)

## `quiry`

- **skill1** (1)
  - [Defensive / utility / mitigation] ■ Activates when hitting a target with Full Charge. Affects the target. ATK ▼ 8.94% of the skill user's ATK for 3 sec. — enemy ATK debuff: the engine models no enemy ATK (v1 boss deals no damage; the enemy-buff branch accepts only damageTakenPct/distributedDamagePct > 0), offensively inert by construction.

- **burst** (1)
  - [No HP pool / healing domain] ■ Affects all allies. Recovers 6.96% of the skill user's final Max HP every 1 sec for 10 sec. — magnitude only: the engine `heal` carries no HP amount by design (no HP pool); the 10-second recovery-event WINDOW is modeled (burst heal ticks:10 intervalSec:1).

**Caveats / reasons:**

- skill1/skill2/burst: 'Affects 2 Defender ally unit(s)' is modeled as alliesOfClass 'Defender' — the schema has no count cap; exact at ≤2 Defenders, over-grants a 3rd Defender in 3-tank comps (⚑2)
- skill1: the enemy ATK▼ line is unmodeled — the engine models no enemy ATK (boss deals no damage); offensively inert by construction, carried verbatim in unmodeled
- burst: the heal carries no HP amount — recovery-event window only (ticks:10 intervalSec:1); the 6.96%-of-final-Max-HP magnitude is unmodeled, not fudged

## `ram`

- **skill1** (1)
  - [Defensive / utility / mitigation] ■ Activates after landing 5 normal attack(s). Affects the target(s). ATK ▼ 7.95% for 5 sec. — enemy ATK debuff: the engine models no enemy ATK (v1 boss deals no damage; the enemy-buff branch accepts only damageTakenPct/distributedDamagePct > 0), offensively inert by construction; the nearest-wrong mapping (damageTakenPct) is a different mechanic (boss-takes-more) that would over-credit the whole team.

- **skill2** (1)
  - [Defensive / utility / mitigation] ■ Affects 2 ally unit(s) with the lowest remaining HP. DEF ▲ 11.34% of the skill user's DEF for 5 sec. — caster-basis flat DEF add: no such primitive (defPct scales the TARGET's own DEF — wrong basis — and is inert in v1 regardless); the target clause has a primitive (alliesLowestHp count 2, leftmost stand-in) — the blocker is purely the payload.

**Caveats / reasons:**

- skill1: the burst-CDR's 'an ally from the same squad still on the battlefield' clause is modeled ALWAYS-SATISFIED — ram's collab squad is uncurated (squad membership is owner-confirmed fact; QUEUE.md 'same-squad primitive migrations' says confirm before authoring). If her in-game squad requires rem/emilia, the CDR over-fires in non-collab teams (⚑2: swap in teamHas.sameSquad once curated)
- skill1: the 'after landing 5 normal attacks → target ATK ▼ 7.95%' line is UNMODELED — the engine drops enemy ATK debuffs (they cannot affect damage dealt at DEF=0); NOT damageTakenPct (that is 'boss takes more damage' — a different mechanic)
- skill2: the Max-HP grant fires on the interval:15 convention for kit-silent CD skills (first fire t=15; ⚑3 phase unpinned by footage); it is damage-INERT for ram (no atkOfMaxHpPct consumer) and 'without restoring HP' is honored by construction (a Max-HP grant never emits recovery events)
- skill2: the DEF grant (11.34% of the skill user's DEF → 2 lowest-HP allies) is UNMODELED — no caster-basis DEF stat; defPct would be the wrong basis (target's own %) and is inert in v1 anyway
- burst: the shield is EVENT-ONLY (no HP pool in v1) — it opens shield-state windows and fires 'shielded' triggers (naga-class consumers), keyed to ram's OWN burstCast (never on Full Bursts she sat out); the 10.08%-of-final-Max-HP magnitude is recorded for kit completeness only

## `rapi-red-hood`

- **skill1** (1)
  - [Partless / AoE / targeting] Damage to Interruption Parts ▲48% for 10 sec (self; activates when entering Full Burst while NOT in Combat Assist, i.e. team has a Burst I ally)

- **skill2** (1)
  - [Partless / AoE / targeting] Attachable Projectile — Max Ammo: 1 (COSMETIC per owner ruling 2026-08-04: one rocket 'loaded' at meter-full fires alongside the bullet on the first frame after 100%; not reflected in game, no damage effect — nothing to model)

- **burst** (2)
  - [Partless / AoE / targeting] Explosion Radius ▲100.62% for 10 sec (self; Burst Stage 1)
  - [Partless / AoE / targeting] Explosion Radius ▲100.62% for 10 sec (self; Burst Stage 3 — a second, separate kit line from the Stage 1 instance; inert on the partless boss)

## `rapi`

Rapi is a Fire assault-rifle Burst-III attacker with a simple stat-check kit: Skill 2 fires a 528.97%-of-final-ATK missile at the boss every 20s, and her burst deals 657.72% of final ATK and grants herself +60.75% ATK for 10s. Her Skill 1 — ATK ▲21.81% for 20s once she has been attacked 20 times — is documented but unmodeled: the sim has no incoming-damage model, so the counter can never accrue (out-of-domain, flagged). Skill 2's 5s taunt is likewise unmodeled (no aggro model; the single boss already takes everyone's attacks).

- **skill1** (2)
  - [Missing engine primitive / trigger] Activates when attacked 20 time(s). Affects self.
  - [Missing engine primitive / trigger] ATK ▲ 21.81% for 20 sec.

- **skill2** (1)
  - [Defensive / utility / mitigation] Taunt for 5 sec.

**Caveats / reasons:**

- skill1: the entire attacked-20 cluster (self ATK ▲21.81%/20s) is UNMODELED — the sim has no incoming-damage model and no 'attacked N times' trigger primitive; the boss never acts. Nearest-wrong (hitCount 20 on hits she DEALS) is pinned in the spec test and provably fails
- skill2: 'Taunt for 5 sec.' is UNMODELED — no taunt/aggro primitive; the single partless boss already takes everyone's attacks; its in-game role is feeding the attacked-counter (⚑1)
- skill2: the 20s interval cadence is the datamined skillCooldownsSec.skill2 (the kit prose carries no number) — ⚑ cadence tuple
- burst: block ORDER is load-bearing — the 657.72% nuke dispatches before the +60.75% self buff so the hit snapshots pre-buff ATK (pinned by the spec's reordered-block arm)
- skill1/skill2/burst: AR cadence tuple (rate_of_fire 720 / reloadFrames 81 / ammo 60) is an unmeasured datamine estimate

## `rapunzel-pure-grace`

- **skill2** (1)
  - [Defensive / utility / mitigation] ■ Activates only when Full Charge is maintained for more than 1 sec while a Shield is set in front of this unit. Affects self. Current HP ▼ 2% every 1 sec continuously. Restores Shield HP equal to 3.16% of the skill user's final Max HP every 1 sec continuously.

**Caveats / reasons:**

- skill1 SHARED SHIELDS (battle-start passive + on-burstCast re-shield): event/state only — the engine 'shield' effect carries NO shield-HP pool (v1 boss deals no damage). Each application emits a shielded event to ALL allies (fires their 'shielded' triggers, e.g. a naga-type consumer) and opens the target's shield-state window (shieldedUntilFrame); no durationSec = permanent at scope (label precedent). maxHpPct 20.59 (% of the CASTER's final Max HP) is recorded for kit-completeness only.
- The '■ Affects self' header on both shield lines conflicts with the body text 'shared Shield … that protects all allies' — encoded target ALLIES (the shared shield reaches every ally; self-only would be the header-echo trap and would never fire ally 'shielded' triggers).
- ⚑ skill1 ATTACK DAMAGE ▲10.41% (all allies, 'continuously') is CALIBRATED on UPTIME, kit-literal on value/target/stat. Encoded passive (frame 0, no expiry = always-on) behind requiresShielded. The SHIELD half of the gate is real and SELF-SUPPLIED: her own battle-start shield opens her own shield window, so the gate passes at frame 0 — stripping her shield blocks kills the buff (proven in the unit spec, group G). The 'Full Charge maintained for more than 1 sec' half has NO engine primitive: her SR reaches full charge at chargeFrames 60 = exactly 1s and the sim fires at full charge, so a literal read gives ~0% in-engine uptime while real play (hold-to-aim between shots, shield self-supplied) is ~100%. ESTIMATE: ~100% real-play uptime; the always-on encoding is the upper bound and matches play. RECIPE: a rapunzel-pure-grace focus recording — compare the buff-icon uptime of the 10.41% Attack Damage grant against her shield icon. TIER: Tier-2 state gate (label 'Delusion is permanent in the no-incoming-damage sim' precedent for the always-on half).
- skill2 SELF-HEAL (2% of caster final Max HP per full-charge attack): trigger shotFired — SR = one full charge per trigger pull (helm/liberalio precedent), so 'attacking with Full Charge' fires once per shot. Event-only: the engine heal carries NO HP amount and the heal targets SELF — her own kit has no 'recovery' trigger, so the self-recovery events are a downstream no-op. Modeled for kit-completeness; the unit spec pins that it moves no damage (neutrality groups) and reaches NO ally (crown's recovery consumer fires identically with and without it).
- ⚑ skill2 GATED HP-DRAIN / SHIELD-HP-RESTORE line is UNMODELED (verbatim in `unmodeled`): 'Current HP ▼ 2% every 1 sec' needs an HP pool to drain and 'Restores Shield HP equal to 3.16% …' needs a shield-HP pool — neither exists in a DPS sim (no incoming damage, shields never deplete). Defensive/damage-inert; ESTIMATE of board impact: zero damage. RECIPE: requires an HP-pool + shield-HP-pool model before it can be enacted. Deliberately NOT encoded as a repeating 1 Hz 'shield' effect — that would re-fire every ally's 'shielded' trigger once per second and massively over-credit shield-synergy teammates.
- burst SELF MAX HP ▲10.13% for 10s: targetMaxHpPct on self (own-Max-HP basis; label precedent), resolved by the engine to a maxHpFlat grant of (10.13/100)×her final Max HP. Offensively INERT: she has no atkOfMaxHpPct conversion and v1 has no HP pool — proven by totals-equality in the unit spec (group B4). Kit-completeness only.
- burst TEAM ATTACK DAMAGE ▲15.24% for 10s: her load-bearing damage line — attackDamagePct (Damage Up bucket) on all allies including self, keyed to HER OWN burstCast (never fullBurstEnter; the two-B1 fixture with liter as decoy pins the keying). The shield re-application on the same cast is a separate skill1-slot block (L2 — the line lives in the skill1 prose), matching the kit's line split.
- Damage footprint = exactly the two Attack Damage lines (S1 10.41% permanent gated team buff + burst 15.24% 10s team buff). Everything else (shields, self-heal, self Max HP) is defensive/event-only: the unit spec proves the residue byte-identical to the bare weapon whenever the damage lines are absent (groups N1/N2).

## `rapunzel`

- **skill2** (1)
  - [No HP pool / healing domain] Incoming healing ▲ 13.65% for 15 sec.

- **burst** (2)
  - [No HP pool / healing domain] ■ Affects 1 incapacitated ally unit(s) with the highest final ATK. Resurrect with 81.67% HP.
  - [Defensive / utility / mitigation] ■ Activates when HP falls below 30%. Affects all enemies. Stun for 1 sec.

**Caveats / reasons:**

- Heal MAGNITUDES (skill1 4.03% / burst 40.83% of the skill user's final Max HP) are recorded here but NOT modeled: the 'heal' effect emits a recovery event with NO HP amount, and v1 has no HP pool. Both lines are implemented for their TANDEM value only — they fire allies' 'recovery' triggers (Crown-type 'when recovery takes effect' consumers).
- ⚑ skill1 trigger read as shotFired: RL is a charge weapon, so every trigger pull is a full charge (helm/liberalio precedent — 'SR = one full charge per pull'); the kit's 'when performing a Full Charge attack' therefore fires once per shot. The unit spec pins that every rapunzel shot is charged. Verify against a rapunzel focus video that the heal lands once per charged shot.
- skill1 target 'alliesLowestHp' count:3 resolves to the leftmost 3 allies — v1 has no HP pool, so 'lowest HP percentage' is indeterminate and uses the documented deterministic stand-in. The heal is event-only (no amount), so the stand-in only affects WHICH 3 allies receive recovery events; it moves no damage.
- skill2 Max HP ▲8.19% is modeled as targetMaxHpPct (the target's OWN-% basis) on the 2 highest-final-ATK allies, converted by the engine to a per-target maxHpFlat grant. Offensively INERT: it lands on teammates (casterIdx≠self) so it does NOT feed their atkOfMaxHpPct conversion (e3 video rule), and v1 has no HP pool for the Max HP to matter. Kit-SSOT completeness only — proven inert in the unit spec (removing it changes no damage).
- ⚑ skill2 trigger 'interval' sec:15 is a CONVENTION: the skill has a 15s cooldown and no visible activation clause, so it is modeled as an auto-cast that re-fires every 15s (first at t=15), keeping the 15s buff essentially permanent. Inert regardless (the Max HP grant moves no damage).
- ⚑ burst RESURRECT (1 incapacitated highest-final-ATK ally at 81.67% HP) is UNMODELED — there is no resurrection / death / HP-pool primitive in a DPS sim where nobody dies on the partless boss. META-DEFINING for real play (Rapunzel's signature raid value) but offensively inert here; estimate of board impact: none on damage, the entire reason she is fielded is unmodeled. Recipe: needs an HP-pool + death/revive model before it can be enacted; tier meta-defining.
- ⚑ burst enemy STUN (all enemies 1s when an ally falls below 30% HP) is UNMODELED — there is no HP pool to gate the 'below 30%' threshold and no enemy-action model for the stun to interrupt (the boss deals no damage and its actions don't gate ally DPS). Status-gate + inert in a DPS sim.
- Zero damage lines and zero weapon-state modifiers in the whole kit — this unit cannot move its OWN damage. Her entire board footprint is cross-unit: recovery events on two channels (skill1 per full charge, burst per cast) plus an inert Max HP buff. Damage-neutral by construction; the unit spec proves byte-identity to the bare weapon whenever no ally consumes her recovery events.

## `raven`

- **skill2** (3)
  - [Partless / AoE / targeting] Activates when an ally or self destroys an enemy's part. Affects self if self is not in A.N. Mode status.
  - [Partless / AoE / targeting] Single Point Attack: Sustained damage ▲ 47.32% for 15 sec.
  - [Partless / AoE / targeting] Removes Vital Attack.

- **burst** (2)
  - [Bookkeeping / stacks / resources / stance] A.N. Mode:
  - [Bookkeeping / stacks / resources / stance] Effect 1: Removes Single Point Attack.

**Caveats / reasons:**

- skill1: full-charge DoT cadence (60f charge + 22f bolt gap + 141f reload, autofire unverified) is an unmeasured ⚑ estimate — the DoT is her dominant damage bucket and scales linearly with shot rate
- skill2: Single Point Attack (Sustained damage ▲ 47.32%) keys on destroying an enemy part — it can never fire against the partless scope-lock boss and is not modeled (previously approximated as an always-on passive)
- skill2: Vital Attack (Damage to Parts ▲ 21.12%) is modeled but inert in v1 (no parts on the boss)

## `red-hood`

- **skill2** (2)
  - [Defensive / utility / mitigation] ■ Activates during Beast Cage. Affects all allies. DEF ▲ 50.68% of the skill user's DEF for 10 sec.
  - [No HP pool / healing domain] ■ Activates during The Last Howl. Affects self. Recovers 23.04% of attack damage as HP over 10 sec.

- **burst** (3)
  - [Defensive / utility / mitigation] Step 2 (The Last Howl): Attract: Taunts all enemies for 10 sec.
  - [No HP pool / healing domain] Step 2 (The Last Howl): Incoming healing ▲ 74.88% for 10 sec.
  - [Weapon state / range / ammo / CDR] Step 3 (Red Wolf): Expand Pierce range by 100% for 10 sec.

**Caveats / reasons:**

- skill1: the CONTINUOUS excess-CS->Charge-Damage conversion (Charge Damage ▲ 240% of the excess over the +100% cap) is APPROXIMATED — not dropped — as the static stage-3-gated chargeDamagePct 90 ⚑ in the burst block below (warm value 93.36 = (138.9-100)x2.4, the stack-ramp average; out of burst her total CS 38.1 sits below the 100 cap, so the faithful excess there is zero). Pending a full-charge popup read inside vs outside Red Wolf. Supersedes the stale 2026-07-16 'unparsed effect' note: the line IS modeled (kit-autonomy gauntlet 2026-07-25 bookkeeping fix; the S7 judge flagged the prior double-entry as both modeled and unmodeled).

## `rei-ayanami-tentative-name`

- **skill1** (5)
  - [Bookkeeping / stacks / resources / stance] Anti A.T. Field stacks ▲ 10.
  - [Bookkeeping / stacks / resources / stance] ■ Activates when entering Full Burst. Affects all allies in Annihilation State status.
  - [Bookkeeping / stacks / resources / stance] Units affected by Annihilation State's additional effect ▲ 1 for 9 sec.
  - [Bookkeeping / stacks / resources / stance] Attack range of Annihilation State's additional effect ▲ 500% for 9 sec.
  - [Bookkeeping / stacks / resources / stance] ATK ▲ 17.6% of the skill user's ATK for 9 sec.

- **skill2** (2)
  - [Missing engine primitive / trigger] ■ Activates when entering Full Burst. Affects all allies with machine guns who have used their Burst Skills.
  - [Missing engine primitive / trigger] Machine Gun Ramp-Up Speed ▲ 100% for 13 sec.

**Caveats / reasons:**

- skill1: the every-7-hits 286.37% proc is GATED to the 10s Attack-State window via requiresTargetStatus 'Attack State' (the hit counter is cumulative across the fight, not reset at window start — the same approximation asuka-wille's S1 uses)
- skill1/burst: 'Attack State' is a SELF mode proxied as a boss targetStatus (the engine has no self-status gate — the asuka-wille pattern); the 10s status duration matches the self-buff window so the S1 proc gate is faithful, but the name is a side channel any future requiresTargetStatus 'Attack State' could read (inert today; a requiresOwnBuff primitive would replace the proxy, ⚑5)
- skill1: the 18-hit Anti A.T. Field proc (590.64%) IS encoded but faithfully INERT (gated on requiresTargetStatus 'Anti A.T. Field', which no in-scope unit applies as a name-keyed targetStatus); the 'stacks ▲10' sub-effect is UNMODELED (⚑1, no add-stacks primitive); 0% damage outside an Eva team
- skill1: the Full-Burst Annihilation-State ally buff (+1 unit / +500% range / casterAtkPct 17.6) is UNMODELED (⚑2) — needs an ally-self-mode gate + cross-unit param modulation; 0% outside an Eva team
- skill2: 'Machine Gun Ramp-Up Speed ▲100%' is UNMODELED (⚑3) — no MG wind-up primitive (asuka-wille ⚑2); 0% v1 damage
- skill2: the Full-Burst-entry team ATK buff is a FLAT casterAtkPct 11.61 (identical add per ally = 11.61% of Rei's static ATK), NOT a % of each target's own ATK
- cadence: the AR fire-rate datamine (720 rpm / 60 ammo / reloadFrames 111 / instant charge) is unverified for this collab AR (⚑4)

## `rei-ayanami`

- **skill2** (1)
  - [Defensive / utility / mitigation] Damage dealt to Shield ▲ 700.5% continuously — no shield-damage StatKey in the schema; inert vs the partless scope-lock boss (no shield).

**Caveats / reasons:**

- skill1: Elemental Advantage Attack Damage ▲ 30.23% is active only with elemental advantage (Fire vs a Fire-weak boss); inert on a non-advantaged/neutral boss (⚑1)
- skill1: the 112.37% proc cadence (hitCount 100) depends on MG fire rate; reloadFrames 171 is unverified datamine (⚑2)
- burst: the 13.44% caster-Max-HP shield is event-only (no HP pool modeled in v1); fires shielded triggers only (⚑3)

## `rem`

- **skill1** (1)
  - [Defensive / utility / mitigation] ■ Activates when using Burst Skill. Affects all allies. Equally shares HP recovery for 10 sec.

- **skill2** (2)
  - [No HP pool / healing domain] ■ Activates at the start of battle. Affects self. Recovers 42.24% of attack damage as HP continuously.
  - [Defensive / utility / mitigation] ■ Activates at the start of battle. Affects self and 2 Rocket Launcher-wielding ally unit(s) with the highest final ATK. Equally shares HP recovery continuously.

**Caveats / reasons:**

- skill1/burst: 'Demon's Breath' is a SELF status proxied as a boss targetStatus (the engine has no self-status gate). Name-keyed side channel any other unit's requiresTargetStatus 'Demon's Breath' could read; no other in-scope unit does, so inert today (⚑1: a requiresOwnBuff primitive would replace the proxy; Tier 2)
- skill1: the ATK stack is gated to the Demon's Breath window (requiresTargetStatus 'Demon's Breath', hitCount 15, atkPct 4.22 ×30 stacks, 10s); the hitCount counter is cumulative and NOT reset at the window boundary, so the first stack after window-entry may land up to 14 hits early (⚑2; in-game reset unverified; Tier 3)
- skill1: whether the 10s window builds the full 30 stacks is MG-cadence-dependent (datamine ammo/RoF unverified for this unit); the buff caps at 30 and refreshes per stack (⚑3; Tier 3)
- skill1: the burst-cast 'Equally shares HP recovery for 10 sec' (all allies) is UNMODELED — healing/HP-redistribution is damage-inert in v1 (no HP pool; Rem has no recovery block) and 'shares HP recovery' is a redistribution mechanic, not a plain heal
- skill2: BOTH lines are UNMODELED healing — S2a self lifesteal (42.24% of attack damage as HP) has no lifesteal primitive; S2b HP-recovery share (self + 2 highest-final-ATK RL allies) is a redistribution mechanic; both damage-inert in v1
- burst: the RL grants (casterAtkPct 50.78 = 50.78% of Rem's static ATK as a flat add, maxAmmoFlat 5) target alliesOfWeapon RL only — Rem is MG, so she does NOT buff herself with these; they amp her RL teammates

## `rosanna-chic-ocean`

- **skill1** (1)
  - [Partless / AoE / targeting] ■ Activates when an ally or self destroys an enemy's part. Affects all allies. ATK ▲ 3% of the skill user's ATK, stacks up to 5 time(s) and lasts for 30 sec.

**Caveats / reasons:**

- skill1: part-destroy ATK stacks (casterAtkPct 3% ×5 to all allies) are inert vs a partless boss and NOT modeled — big hidden lever on parts bosses (⚑3 out-of-domain)
- skill2: sustained DoT re-casts on its datamined 30s CD, 15s window each, first fire t=30 (no force-cast) — resolved 2026-07-20 (owner), validated 2026-07-25 (gauntlet); replaced an invented 100%-uptime passive-continuous encoding
- skill1/skill2: Damage to Parts ▲ 24.26% buffs are inert vs the partless boss (kept for fidelity; asserted byte-identical on removal)

## `rosanna`

- **skill1** (2)
  - [Defensive / utility / mitigation] Concealment: Prevents being targeted by single-target attacks for 10 sec. This effect is removed upon taking a direct hit.
  - [Missing engine primitive / trigger] ■ Activates after performing 10 normal attacks. Affects the 2 enemy unit(s) with the highest final ATK. Removes 5 buff(s). Activates once per battle.

- **skill2** (3)
  - [Defensive / utility / mitigation] ■ Activates at the start of battle. Affects self. Concealment: Prevents being targeted by single-target attacks for 5 sec. This effect is removed upon taking a direct hit.
  - [Bookkeeping / stacks / resources / stance] ■ Activates when a Nikke is incapacitated. Affects self. Frenzy: ATK ▲ 22.61%. Stacks up to 10 times and lasts for 30 sec. Fills Burst Gauge by 36.54%.
  - [Bookkeeping / stacks / resources / stance] ■ Activates when a Nikke is incapacitated. Prioritizes Attacker-type enemies. Affects 1 unit(s). Deals 400% of final ATK as damage.

- **burst** (1)
  - [Bookkeeping / stacks / resources / stance] ■ Activates when the skill user is in the Concealment state. Affects the target(s) hit by Assalto. Deals 561.6% of final ATK as additional damage.

**Caveats / reasons:**

- burst: the 561.6% additional damage is GATED on the Concealment self-state and is NOT modeled — concealment is a targeting-prevention status with no engine primitive (out-of-domain for DPS); ≈+43% burst damage when concealment is up, uptime measurement-gated (⚑1)
- skill2: only the 500-normal-attack Frenzy source is modeled; the ally-incapacitation Frenzy (+Burst Gauge 36.54%) and the ally-incapacitation 400% hit never fire on the immortal-boss basis (no ally is ever incapacitated)
- skill1: the Concealment (10s) and enemy buff-removal (5 buffs, once per battle) lines are out-of-domain (targeting / buff-strip) and unmodeled
- burst: the Damage Taken ▲29% debuff applies only against Water Code bosses (bossElementGate 'Water'); inert vs a non-Water boss
- cadence: MG fire rate and reload timing are datamined defaults, not yet measured from video (⚑2)

## `rumani`

- **skill1** (1)
  - [Defensive / utility / mitigation] ■ Activates when landing a Full Charge attack during Full Burst. Affects the target. Taunts for 5 sec.

**Caveats / reasons:**

- skill1: the taunt line ('landing a Full Charge attack during Full Burst → Taunts for 5 sec') is UNMODELED verbatim — the sim has no targeting/aggro model and v1 models no damage taken by allies, so a taunt moves nothing observable. Nearest-wrong encoding rejected: targetStatus is the ENEMY-status channel (a boss status) — a taunt is self-aggro, not a boss status; forcing it through that channel would be a fake model.
- skill1: every rumani pull is a FULL CHARGE (RL charge 60f, no dump mode), so chargeCounter count:1 fires once per pull — the power precedent for per-full-charge triggers on this weapon.
- skill1: the muscleUp resource pool (L6's gate source) does NOT expire; the real Muscle Up stacks lapse 2 sec after the last full charge. ⚑ EXPIRY DIVERGENCE: rumani's reload gap (~2.15s + charge) EXCEEDS the 2s expiry, so after a reload boundary the pool can overstate stacks (gate open where the real kit reads closed). estimate: zero damage divergence (the gated line is a defensive observable in v1); worst case one extra gated buffApply per post-reload cast. recipe: focused rumani recording across a >2s fire pause — Muscle Up icon expiry vs next burst's damage-taken grant. tier: low (defensive-only consequence).
- skill2: 'hitting a target's Parts for 5 time(s)' is encoded as hitCount 5 — the sim has no parts axis, so every hit counts as a parts hit and partsDamagePct is inert vs the partless scope-lock boss. Both divergences cancel to zero damage; the line stays observable (22 four-ally firings / 180s).
- burst: the Max HP ▲ 15.13% line is modeled (targetMaxHpPct self, dur 10) but DAMAGE-INERT — no atkOfMaxHpPct consumer, v1 models no damage-taken. Pinned by cast cadence, self scope, and the exact 15.13/3.04 flat-value ratio vs the S1 grant (both scale off her own static Max HP).
- burst: the Damage Taken ▼ 20.06% grant is SELF-held damageTakenPct -20.06 — the engine's live damageTakenPct read is the boss-debuff channel (positive = boss takes more), so this self-grant is consumed by NOTHING in v1 (inert observable). Pinned self-held (targetIdx never null) and never boss-flipped.

## `rupee-winter-shopper`

- **burst** (1)
  - [Defensive / utility / mitigation] Attract: Taunts all enemies for 5 sec. (UNMODELED — no engine taunt primitive; defensive: the v1 partless boss deals no damage and has no target choice, so enemy target-lock moves no damage. The label taunt-immunity precedent.)

**Caveats / reasons:**

- ⚑ CADENCE TUPLE (ALWAYS-⚑): AR rate_of_fire 720 = 12 rounds/s nominal + reloadFrames 81 + ammo 60, all datamine (single-chunk reload, reload_bullet 10000) — drives the S1 last-bullet cadence (once per ~5s magazine + reload) and the reload-economy gain from her burst. Recipe: rounds/min + reload gap from any rupee-winter-shopper-focus video.
- ⚑ MEASUREMENT-GATED (no-lapse approximation, power/rupee-base precedent): the shopping POOL never decays (no timer-decay primitive) while the Shopping BUFF lapses 20s after its last refresh. In a DOUBLE-B1 comp (the kit's home — her re-entry exists to field one), every chain carries ≥4 burst casts, stacks reach the 4-cap during chain 1, and at each Full Burst END the stacks applied during the just-ended chain are still live (20s duration > the ~10s cast→FB-end span), so the pool and the buff AGREE at every gate-read moment — exact there. In a SOLE-B1 comp on a 40s chain cycle (3 casts/chain), the real buff ramps only to 3 and lapses between chains, so the real gate NEVER opens, but the pool crosses 4 during chain 2 and the sim's gate over-fires from the 2nd FB end onward. ESTIMATE: over-credits a 7.9% gauge-fill window for 5s after each FB end in sole-B1 comps only — a few-percent-of-the-gauge timing nudge on the next chain, zero in any double-B1 comp. RECIPE: a sole-B1 rws focus recording — does the gauge-speed buff icon appear after Full Burst ends? TIER: override-only (a decaying-pool / buff-stack-read primitive would remove the divergence).

## `rupee`

- **skill1** (1)
  - [Bookkeeping / stacks / resources / stance] Increases stack count of buffs by 1. (PARTIALLY MODELED — the SELF slice is folded as +1 to the mileage pool on the same hitCount:100 trigger (skill1[1]); the CROSS-ALLY slice (teammates' stackable buffs) is out-of-domain ⚑3 and the mileage ATK-buff component of the self stack is unrepresentable ⚑2 — the line stays here verbatim as the audit trail)

**Caveats / reasons:**

- ⚑ CADENCE TUPLE (ALWAYS-⚑): AR rate_of_fire 720 = 12 rounds/s nominal + reloadFrames 81 + ammo 60, all datamine (single-chunk reload, reload_bullet 10000) — drives the S1/S2 proc cadence (every 100 / 30 shots), the Mileage ramp timing and hence the burst-gate opening. Recipe: rounds/min + reload gap from any rupee-focus video.
- ⚑ MEASUREMENT-GATED (interpretation): the S1 'Increases stack count of buffs by 1' SELF slice is encoded as +1 to the mileage POOL ONLY — the stack's ATK-buff component (13.8%) is NOT granted because buff instances key on caster+slot+stat+value (sim.ts KR stacking rule), so a skill1-slot Mileage buff would be a parallel second instance (double-counted stacks), not a merge into S2's Mileage. ESTIMATE: ≤13.8% of rupee's OWN ATK under-credited during the opening ramp only (the pool reaches 5 at shot ~120; from then on S2 procs alone keep the real buff at 5 stacks, so the missing component exists only while stacks accrue, ≈ first 11s). RECIPE: popup-read rupee's ATK buff icon after an S1 proc in a rupee focus recording — does Mileage show +1 stack carrying the 13.8% value? TIER: override-only (an engine cross-slot stack-merge primitive would remove the divergence).
- ⚑ OUT-OF-DOMAIN (engine-core): the CROSS-ALLY slice of S1 'Increases stack count of buffs by 1' — +1 stack to each Iron ally's OWN stackable buffs (the soda-type team amplifier). ESTIMATE: zero in any encoding the sim can field today (purely a function of which stacking Iron comps are fielded; in the scope-lock fixture the only stackable buff any Iron ally holds is rupee's own Mileage, already folded as the self slice). RECIPE: an engine primitive 'bump each target's stackable buffs by N' reading each holder's live maxStacks buffs (does not exist; mica-snow-buddy ⚑M5 / pepper ⚑4 precedent). TIER: out-of-domain (engine-core); the self-slice is the honest in-scope model.
- ⚑ MEASUREMENT-GATED (no-lapse approximation, power/pepper precedent): the mileage POOL never decays (no timer-decay primitive) while the Mileage BUFF lapses 15s after its last refresh. At her sustained scope-lock cadence (S2 procs ≈ every 3.2s; S1 adds one ≈ every 10.6s) applications beat the 15s expiry by ~5×, so stacks never lapse while she keeps firing and the pool and the buff never disagree inside a sim fight — diverges only if she stops firing for >15s. RECIPE: read the Mileage stack icon across a long fire-pause in a rupee focus recording. TIER: override-only.
- ⚑ INTERPRETATION (awb/diesel dissent on record): alice-wonderland-bunny's gauntlet read the identical sentence as a stack-CAP raise and left it fully unmodeled, warning that a +1-grant reading 'spuriously accelerates the max-stacks gate'; diesel left it unmodeled as ambiguous. This encoding follows the NEWER mica-snow-buddy + pepper majority (self stackable resource folded as +1, cross-ally out-of-domain) because rupee's own stackable buff IS the gate read by her burst, exactly the mica/pepper shape. If a rupee focus recording shows S1 NOT feeding Mileage, drop skill1[1] (the pool block) and the gate simply opens one S2 proc later (shot 150 instead of 120) — the encoding is one block away from the conservative reading.

## `sakura-bloom-in-summer`

- **skill1** (6)
  - [Partless / AoE / targeting] Activates when an ally or self destroys an enemy's part. Affects self.
  - [Weapon state / range / ammo / CDR] Sustained Damage ▲ 5.1% for 30 sec.
  - [Partless / AoE / targeting] Activates when an ally or self destroys an enemy's part. Affects self if in Dancing Flower status.
  - [Weapon state / range / ammo / CDR] Dancing Flower Duration ▲ 10.02 sec.
  - [Partless / AoE / targeting] Activates when an ally or self destroys an enemy's part. Affects all enemies who are in Sakura Petals status.
  - [Weapon state / range / ammo / CDR] Sakura Petals Duration ▲ 10.02 sec.

**Caveats / reasons:**

- skill2: force-cast at t=0 (S1 'Forcefully uses Skill 2') AND re-cast every 30s on its datamined CD — Sakura Petals 256%/s runs 6×15s windows (90s uptime); resolved 2026-07-20 (owner), was a single t=0–15 window
- skill2: Dancing Flower Attack Damage ▲ 15.64%/15s time-averaged to 7.82% over the 90s/180s (50%) uptime (engine passive buffs cannot carry a duration) — was 1.30% for the single-window model ⚑
- burst: 457.14% ×10 sequential attacks modeled as 10 same-frame hits vs the single boss; the stacking DoT assumes all 10 stacks apply per cast (351.6%/s ×10s) ⚑
- cadence: datamined 12 pulls/s + 81-frame reload are unverified estimates ⚑

## `sakura-suzuhara`

- **skill2** (2)
  - [No HP pool / healing domain] ■ Activates after landing 60 normal attacks. Affects the 2 ally unit(s) with the lowest HP percentage. Incoming healing ▲ 15.18% for 10 sec.
  - [Defensive / utility / mitigation] ■ Activates after landing 120 normal attacks. Affects the 2 ally unit(s) with the lowest HP percentage. Damage Taken ▼ 14.97% for 10 sec.

**Caveats / reasons:**

- skill1: 'Damage Taken ▲ 17.18%' on the target is the boss-facing damageTakenPct debuff (positive = boss takes MORE — the channel's documented polarity), NOT an ally attack buff and NOT the mirror of skill2's 'Damage Taken ▼'. KR stacking rule: same caster slot/stat/value OVERWRITES/refreshes across procs — one debuff instance, re-applied every 120th landed round (her full magazine), 5s duration vs ~6.35s mag cycle ≈ 79% uptime with a ~1.35s gap per cycle.
- skill2 (Incoming healing ▲ 15.18% / 10s): UNMODELED verbatim — v1's heal effects carry no HP amount and the schema has no healing-received stat (validate-overrides STATS), so the amplifier multiplies nothing; damage-neutral. Nearest-wrong rejected: encoding it as a 'heal' effect every 60 hits would spuriously emit recovery events at SMG cadence and feed on-recovery consumers (crown-class kits) — a massive over-credit. It is a stat buff on the recipients, not a heal; pinned silent by the spec's negative assertions.
- skill2 (Damage Taken ▼ 14.97% / 10s) ⚑ engine-core / out-of-domain: ally received-damage mitigation; v1 models no ally HP pool and no incoming boss damage, so it can never move anything here. ESTIMATE: in a real fight this is a meaningful survivability window on the 2 lowest-HP allies once per mag dump (~15% less damage taken for 10s) — damage-neutral in this sim. The boss-facing damageTakenPct channel is the WRONG direction/target — encoding it (as +14.97 or −14.97 on the boss) would manufacture a phantom team damage change on the exact same 120-hit frame as skill1, so it is NOT used (noise precedent). RECIPE: add an engine ally-HP-pool + incoming-boss-damage model and an ally received-damage-reduction stat (distinct from the boss-facing damageTakenPct debuff), then encode on hitCount:120 to alliesLowestHp count:2. TIER: engine-core (new primitive), out-of-domain for the no-incoming-damage v1 sim.
- burst: the heal is recovery-EVENT cadence only — the 10.03%-of-caster-final-Max-HP magnitude is inherently unmodeled (no HP pool); only the window shape is kit-literal ('every 1 sec for 10 sec' → ticks:10 intervalSec:1, the type comment's documented HoT shape; helm precedent). The burst has NO damage component (datamined ulti skill_type SetBuff, no hurt values) and is damage-inert; its observable is the recovery stream driving teammate 'recovery' triggers.
- burst: target alliesLowestHp count:2 resolves to the LEFTMOST-2 allies (documented v1 stand-in — no HP pool, 'lowest HP percentage' is indeterminate; types.ts). ⚑ in a real fight the heal lands on whoever is actually lowest; an on-recovery consumer only stays refreshed if it is among the real 2 targets. ESTIMATE: bounded by the consumer's buff value × the 10s window per cast; zero consequence in a comp with no recovery consumer. RECIPE: any sakura-suzuhara focus recording — read which 2 units the heal popups land on vs their HP bars. TIER: low (only moves comps that stack a recovery consumer).
- skill1 ⚑ hit-count semantics (cross-family S6 flag, reconciled): the engine's hitCount accrues FIRED rounds × hitsPerShot (sim.ts hitCounters), the repo convention for 'after landing N normal attacks'; in-game SMG spread means landed ≤ fired, so the real activation can lag the sim's and the debuff duty cycle is slightly over-credited. ESTIMATE: bounded by the miss fraction over 120 rounds vs the immobile scope-lock-style boss (high hit rate; the lag is a fraction of one mag cycle, not a re-phase). RECIPE (S6): focus-record her in a graded comp and measure the interval between consecutive Damage Taken ▲ applications on the boss vs the magazine boundaries off the ammo counter — at the reload = fired-count correct; lagging into the next mag = raise count by the observed landing fraction. TIER: medium — her entire team contribution is this debuff's uptime, so a cadence error scales it 1:1.
- cadence tuple ⚑ (always-⚑): pullsPerSec is the engine-default SMG cadence (datamined rate_of_fire 1440 fired on 60fps frame boundaries), reloadFrames 81, ammo 120 — unmodified by this override. Both live and unmodeled triggers are hit-count-keyed, so any cadence error propagates 1:1 into the S1 debuff duty cycle. RECIPE: read shots/sec + reload gap from any focus recording. TIER: standard.

## `sakura`

Burst I Supporter. S1 Cherry Blossom Tea: after 3 of her normal attacks, all allies gain a stacking DEF buff (8.15% of DEF, ×10, 15s) — defensive, inert in the DPS sim, and the stack count gates her burst's interruption-parts line. S2: allies deal more damage to enemy projectiles (Anomaly-only); and on every Full Burst entry she refunds all allies' burst cooldowns by 4.84s (her primary rotation-acceleration tool). Burst: reduces damage the team takes from Wind-code enemies (defensive, 1/battle); grants all allies ATK equal to 23.76% of her own ATK for 10s (her main offensive buff, every cast); and — only when Cherry Blossom Tea is at max stacks — boosts damage to interruption parts (niche, inert vs a partless boss).

- **skill2** (1)
  - [Partless / AoE / targeting] When attacking an enemy projectile, damage to that projectile ▲ 7.74% continuously.

- **burst** (3)
  - [Defensive / utility / mitigation] Damage dealt by Wind Code enemies ▼ 90.72% for 30 sec. Activates 1 time(s) per battle.
  - [Bookkeeping / stacks / resources / stance] Activates when Cherry Blossom Tea is at max stacks. Affects all allies.
  - [Partless / AoE / targeting] Damage to Interruption Parts ▲ 23.54% for 30 sec.

## `scarlet`

- **skill1** (1)
  - [No HP pool / healing domain] Current HP ▼ 4.01%.

- **skill2** (2)
  - [Missing engine primitive / trigger] There is a 30% chance of activating when attacked.
  - [Other] Deals 138.24% of final ATK as additional damage.

**Caveats / reasons:**

- skill1: the 'Current HP ▼ 4.01%' self-drain is not simulated as HP (engine has no HP pool); it is load-bearing only as the mechanism that opens the two HP-threshold gates, and feeds the derived ~28s/~37s crossing times
- skill2: the 30%-when-attacked 138.24% proc is unmodeled — the sim has no incoming boss attacks; real-fight contribution is an open ⚑
- skill2: the HP<60% gate on the 6.61% crit-damage buff is approximated by rampSec:56 (equal-integral proxy for a step-on at ~28s); the shape is approximate and the crossing time is ⚑-derived (real fights cross earlier)
- burst: the HP<50% gate on the 19.57% crit-rate buff is modeled ungated (rampSec unusable on a per-cast window); pre-~37s bursts are over-credited ⚑
- cadence: 20-ammo AR with a 27.08% per-shot multiplier is a non-standard fire-mode tell — the datamined rate of fire and 159-frame reload are unverified estimates

## `signal`

- **skill1** (3)
  - [Defensive / utility / mitigation] ■ Activates after landing 60 normal attack(s). Affects the target(s).
  - [Defensive / utility / mitigation] DEF ▼ 5.94% for 5 sec.
  - [Defensive / utility / mitigation] ATK ▼ 5.94% for 5 sec.

- **skill2** (1)
  - [No HP pool / healing domain] Recover 44.08% of attack damage as HP over 10 sec. — magnitude only: the engine `heal` carries no HP amount by design (no HP pool); the 10-second recovery-event WINDOW is modeled (fullBurstEnter heal ticks:10 intervalSec:1).

- **burst** (1)
  - [Defensive / utility / mitigation] DEF ▼ 12.34% for 10 sec.

**Caveats / reasons:**

- skill1: the whole 60-hit ▼ cluster (enemy DEF ▼5.94% / ATK ▼5.94% for 5s) is unmodeled — enemy ATK▼/DEF▼ has no sim channel (enemyBuffs admits only damageTakenPct/distributedDamagePct; bossDef is a flat constant; sim.ts drops them at dispatch), mica/ether/exia precedent. Honestly absent (⚑1), not a stale fixture — the unit test pins the zero against a damageTakenPct laundering on the hitCount:60 counter.
- skill2: the modeled heal is event-only — the 44.08%-of-attack-damage HP magnitude is NOT modeled (no HP pool by design); the 10-second recovery-event WINDOW IS modeled (ticks:10 intervalSec:1). The heal is SELF-targeted: recovery events are delivered to signal herself and fire only HER OWN 'recovery'-triggered blocks (fireRecovery dispatches the recipient's blocks; she has none — the unit test observes the window with an inert probe). Damage-inert by construction: totals are byte-identical with the line removed.
- burst: the DEF ▼12.34% / 10s enemy debuff is unmodeled — same no-channel fate as skill1's DEF▼ (⚑2); the unit test pins the zero against a damageTakenPct laundering. The modeled 229.22% nuke is FB-exempt by cast timing (a B2 cast lands before the Full Burst window opens).

## `sin`

- **skill1** (1)
  - [Defensive / utility / mitigation] Attract: Taunt all enemies for 5 sec. — no threat model in v1: the partless boss deals no damage and has no ally-targeting AI, so taunt has zero in-domain surface (nero N7 / delta-ninja-thief Attract precedent).

- **skill2** (1)
  - [No HP pool / healing domain] Twice: Incoming healing ▲ 51% for 5 sec. — the escalation step-2 payload has no carrier: the schema has no incoming-healing StatKey and heals are event-only (nero grumpy-cat ruling). The escalation GATE is still encoded (the 'burstUses' pool advances on every own cast), so steps 1 and 3 fire on exactly the casts the kit says they fire on.

- **burst** (1)
  - [Partless / AoE / targeting] Activates when enemy unit(s) (excluding Nikkes) are more than 4. Affects all enemies. Damage Taken ▲ 12.23% for 5 sec. — the enemy-count gate is NEVER satisfied at single-boss scope (1 enemy), so never-firing IS the faithful behaviour here; the schema also has no enemy-count primitive, and the nearest-wrong ungated damageTakenPct would over-credit the whole team ~12% per cast (absence canary in the test). ⚑2 OUT-OF-DOMAIN, recipe in the note.

**Caveats / reasons:**

- skill1: 'Duplicate 15.03% Max HP' is mapped as a maxHpFlat grant (highestAllyMaxHpPct — quency precedent), not the shield channel: in-game this creates a shield, but the shield primitive's maxHpPct basis is caster-only and event-only; both channels are offensively inert for sin, and the roster-tie (all Defenders share the max static-HP basis) makes the highest-ally basis provably value-identical to a self-basis on every team
- skill2: the burst-usage escalation is a 'burstUses' resource pool (+1 per own burstCast, gates read the PRE-increment value); the step-2 payload (Incoming healing ▲51%) is unmodeled for the missing StatKey, but the gate still advances — steps 1 and 3 fire on exactly the right casts
- skill2: the step-1 lifesteal is a self heal-HoT (ticks:5, event-only) — behaviorally silent in v1 (no recovery-event log kind, and no unit consumes sin's own recovery)
- burst: the 176.32% nuke is burstCast-keyed (her OWN cast), lands pre-Full-Burst and never takes the +50% FB major; its ■ block has NO activation clause, so it is NOT gated by the preceding >4-enemies header — 'enemies within attack range' collapses to the single partless boss

## `snow-crane`

- **skill1** (1)
  - [No HP pool / healing domain] ■ Activates when recovery takes effect if the recovery is not coming from this unit. Affects self. Proof of Violation: Outgoing healing ▼ 10% continuously, up to 3 time(s).

- **skill2** (1)
  - [Defensive / utility / mitigation] ■ Activates when Proof of Violation reaches max stacks. Affects self. Terminated Contract: Gains immunity to Proof of Violation continuously. Recovers 0.24% of the skill user's final Max HP as HP every 1 sec continuously.

**Caveats / reasons:**

- ⚑ S1a's activation clause 'Activates only while not in Terminated Contract status' is NOT gated: there is no negative self-status primitive, and Terminated Contract is unreachable without the unmodeled Proof-of-Violation stack counter below — so the ERA aura reads unconditional. Offensively inert either way (ally-granted Max HP feeds no damage path; the atkOfMaxHpPct conversion is self-only, and snow-crane carries no HP→ATK scaler).
- ⚑ S2a's target filter 'allies in Exclusive Recovery Agreement status' is elided to all allies: S1a grants ERA to every ally continuously (pre-Terminated-Contract), so at scope the two sets are coextensive; the filter can only bite post-Terminated-Contract, which is the unmodeled state below.
- ⚑ chargeCounter carries countInFb:3 EXPLICITLY: the engine's chargeCounter defaults countInFb to 1 inside the 10s window after the owner's OWN burst cast (SBS-specific semantics baked into the primitive). snow-crane's kit has no such in-burst modification — omitting countInFb would fire the heal on EVERY full charge for 10s after each of her casts. countInFb:3 keeps the threshold at 3 everywhere.
- Heal MAGNITUDES (S2a 1.32% / burst 44.68% of the skill user's final Max HP) are recorded here but NOT modeled: the 'heal' effect emits a recovery event with no HP amount (v1 has no HP pool). Both lines are implemented for their TANDEM value only — they fire allies' 'recovery' triggers.
- ⚑ The Proof-of-Violation → Terminated-Contract cascade (S1b + S2c) is UNMODELED whole: (1) the engine's 'recovery' trigger has no SOURCE filter — the kit's 'recovery not coming from this unit' clause is inexpressible, and since her own S2a/burst heals target all allies INCLUDING herself, counting all recoveries would self-stack Proof of Violation and flip Terminated Contract in EVERY comp (the nearest-wrong model, which is worse than none); (2) there is no self-status channel for ERA / Terminated Contract membership; (3) S2c's regen is unbounded ('continuously') and heal ticks are finite. The payload is sustain-only and damage-inert. Recipe: needs a recoveryFromOther trigger (or HP-pool modeling), then a PoV resource pool (0..3) + resourceGate-gated ERA/S2a + a bounded regen.
- burst Pierce line is a REAL timed window but damage-inert in v1: gainPierce only matters through a pierceDamagePct buff (no shipped unit carries one) and PIERCE_CORE_DOUBLE is off (and keyed to the static hasPierce flag, never a timed pierceUntilFrame window). The unit test probes the window through an in-memory pierceDamagePct buff. The clean-weapon basis additionally runs disableBursts:true, so she never casts there at all.
- Zero damage lines and zero weapon-state modifiers in the whole kit — snow-crane is the SR clean-weapon basis cell: her override must sim byte-identical to the empty kit (CW1 damage-neutrality, owner ruling 2026-08-01). Her entire board footprint is cross-unit: recovery events (2 channels), a full-burst shield, an inert Max HP aura, and a v1-inert timed Pierce window.

## `snow-white-heavy-arms`

- **skill1** (4)
  - [Defensive / utility / mitigation] Lock-On — Function: Designates the enemy as a target of Seven Dwarves. Max Lock-On targets: 5. Deactivation condition: Performing a normal attack or taking cover.
  - [Defensive / utility / mitigation] Auto Fire Ready — Effect: DEF ▲ 42.24% continuously.
  - [Bookkeeping / stacks / resources / stance] Auto Fire Ready — Function: Loads Seven Dwarves with ammo. Max ammo loaded by Auto Fire Ready: 5. Deactivation condition: Performing a normal attack.
  - [Bookkeeping / stacks / resources / stance] ■ Activates when performing a normal attack while not in Full Burst. Affects self. Removes Seven Dwarves Fully Active.

- **skill2** (2)
  - [Weapon state / range / ammo / CDR] Gains Pierce for 5 sec.
  - [Weapon state / range / ammo / CDR] Activates at the start of battle. Affects self. Fixes charge time at 1.2 sec continuously.

- **burst** (3)
  - [Bookkeeping / stacks / resources / stance] Seven Dwarves Fully Active — Function: Increases max number of Lock-On targets and max ammo loaded by Auto Fire Ready, but also increases Charge Time.
  - [Weapon state / range / ammo / CDR] Effect 2: Max Lock-On targets ▲ 10 continuously.
  - [Partless / AoE / targeting] ■ Affects all destructible projectiles. Deals 41.9% of final ATK as damage.

## `soda`

- **burst** (1)
  - [Defensive / utility / mitigation] Stun for 1 sec.

**Caveats / reasons:**

- skill2: interval 12 is the datamined skillCooldownsSec.skill2 (the prose carries no activation clause); first-fire phase t=12 is the engine interval convention — ⚑ pin from footage if a recovery-consumer cadence is ever popup-read
- skill2: heal magnitudes 3.23% / 12.71% of the skill user's final Max HP are amount-less by engine design (no HP pool) — carried verbatim in the note, not fudged into fake numbers
- burst: '2 enemy unit(s) randomly' collapses to ONE instance on the lone partless boss (multi-enemy selection is out of the single-boss scope)
- burst: the CROSS-ALLY slice of 'all Fire Code allies: Stack count of buffs ▲1' is ⚑ OUT-OF-DOMAIN (engine-core) — no 'bump each target's stackable buffs by N' primitive (mica-snow-buddy ⚑M5 / pepper ⚑4 precedent); self-slice modeled via the maidSpirit pool
- skill1/burst: the maidSpirit pool is monotonic vs the real 10s per-stack expiry — divergence only in >10s firing gaps (soda-twinkling-bunny Golden-Chip precedent class)

## `soline-frost-ticket`

- **skill1** (1)
  - [No HP pool / healing domain] Removes First Train Discount.

- **skill2** (6)
  - [No HP pool / healing domain] ■ Activates when the HP of anyone in the squad is lower than 15%. Affects the target if the target has any tickets.
  - [No HP pool / healing domain] Recovers 12.27% of the skill user's final Max HP as HP.
  - [No HP pool / healing domain] Ticket count ▼ 1.
  - [No HP pool / healing domain] ■ Activates at the start of battle. Affects all allies.
  - [No HP pool / healing domain] First Train Discount for 6 sec.
  - [No HP pool / healing domain] Function: The effects of I'll Help You Board the Train! will not consume tickets.

**Caveats / reasons:**

- skill1: ticket Max-HP grant modeled at steady-state cap (2 tickets = 20% of caster Max HP, all allies); she starts at 1 ticket (10%) and reaches 2 only after her first Burst — in a team that never Full Bursts it stays 10% (⚑)
- skill1: cadence tuple (SG rate of fire, reloadFrames 111) is the unverified datamine — read rounds/min + the reload gap from a focus video (⚑)
- skill1: her only damage is base SG spray — per-unit SG pellet landing is unmeasured; the class SG landing table is the shipped default (⚑)
- skill2: the emergency heal (squad HP < 15%, consumes a ticket) is unmodeled — the sim models no incoming boss damage and the schema has no HP-threshold trigger; on-recovery consumers are still driven every rotation by her Burst heal

## `sora`

- **skill1** (1)
  - [No HP pool / healing domain] ■ Activates at the start of battle. Affects self. Outgoing healing ▲ 35.2% continuously.

- **skill2** (3)
  - [Partless / AoE / targeting] ■ Activates when an ally or self destroys an enemy's part. Affects all allies.
  - [No HP pool / healing domain] Storage: Stores excess healing received by the skill user, up to 5.36% of their Max HP. Stacks up to 5 time(s) and lasts for 15 sec.
  - [Partless / AoE / targeting] ATK ▲ 23.74% of the skill user's ATK for 15 sec.

- **burst** (1)
  - [Defensive / utility / mitigation] Removes 1 debuff(s).

**Caveats / reasons:**

- burst: the heal is event-only — the 52.27%-of-final-Max-HP magnitude is unrecordable in v1 (no HP amounts), and 'final Max HP' scaling has no carrier; the block's observable is the recovery events it emits to allies on her cast frame
- burst: keyed burstCast (her own Burst I cast), NOT fullBurstEnter — the cast precedes the Full Burst window and a FB-entry keying would misattribute team FBs another Burst I opened (multi-B1 generality)
- skill2: the part-destruction trigger has no engine primitive and the scope boss is partless, so the WHOLE slot is verbatim-unmodeled rather than proxied onto a reachable trigger — a substitute trigger would materialize a team ATK grant the kit never gives vs partless targets (spec-tested counterfactual)
- gauge: no gauge-per-shot.json row — RL modal fallback (280 energy/trigger x focus charge mult); her 40s-cd cast cadence in fixtures is gauge/CD-limited by that estimate, which rescales nothing kit-side (no kit line keys off her shots)

## `sugar`

Sugar (Treasure) is an Iron shotgun Burst-III attacker. Passively she keeps a cover-intact Attack Damage ▲19.98% aura and converts her damage to Elemental Advantage vs Fire Code enemies from battle start. On every Full Burst she buffs her own Critical Rate ▲13.02% and ATK ▲25.01% (10s), expands every shotgun ally's magazine ▲83.8% (15s), and grants Water/Iron shotgun allies Elemental Advantage Attack Damage ▲40.02% (15s). Her burst grants herself Attack Speed ▲66%, Hit Rate ▲33% and ATK ▲20% (15s) and a stronger Elemental Advantage Attack Damage ▲60.01% to Water/Iron shotgun allies (15s). Her cover-attacked crit-damage/reload-speed procs and cover-HP restore are not modeled (no cover-damage basis).

- **skill1** (3)
  - [Defensive / utility / mitigation] Activates when cover is attacked (20% chance). Affects self. Critical Damage ▲ 16.39% for 10 sec. (no cover-attacked trigger primitive; the v1 boss never attacks so cover is never hit)
  - [Defensive / utility / mitigation] Activates when cover is attacked (20% chance). Affects self. Reload Speed ▲ 12.12% for 10 sec. (no cover-attacked trigger primitive)
  - [Defensive / utility / mitigation] Activates when cover is attacked. Restores Cover HP an amount equal to 1.5% of the skill user's final Max HP. (defensive; offensively inert on the immortal-boss basis)

**Caveats / reasons:**

- skill1: the 19.98% Attack Damage line is gated on 'cover still intact' in kit; the v1 boss deals no damage so cover is never destroyed and the buff is modeled always-on (passive). If cover destruction is ever modeled, gate it on a cover-intact state.
- skill1: the battle-start Fire elemental-advantage conversion (advantageVs:Fire) is self-gating — live vs a Fire boss, exactly inert vs every other boss.
- skill1: the cover-attacked Critical Damage ▲16.39% / Reload Speed ▲12.12% procs and the Cover HP restore are UNMODELED (no cover-attacked trigger; defensive line inert) — see unmodeled.skill1.
- skill2/burst: the Water/Iron-shotgun Elemental Advantage Attack Damage buffs are encoded as TWO alliesOfElementWeapon blocks (Water/SG + Iron/SG) because the target carries a single element; no unit is both codes, so there is no double-application.
- skill2/burst: elemAdvantageDamagePct only pays damage for recipients that are elementally advantaged vs the boss (engine ELEMENT bucket gate), faithful to 'Elemental Advantage Attack Damage'.

## `takina`

- **skill1** (1)
  - [Missing engine primitive / trigger] Activates at the start of battle: ATK ▲ 80.04% for 5 sec (the battle-start activation only; the Full-Burst-end activation of the same line IS modeled as the fullBurstEnd block — engine has no battleStart trigger and passive-trigger buffs ignore durationSec, sim.ts:983-993, so this instance is not override-expressible today)

- **skill2** (1)
  - [Defensive / utility / mitigation] Deals Stun to all enemies for 2 sec (boss-inert: the sim's boss does not fire/charge/reload, so a stun on it changes nothing; genuinely-skippable class)

**Caveats / reasons:**

- ⚑ S2 15s cooldown is COMMUNITY-sourced (Prydwen), NOT in the kit prose — the uptime-average values (damageTakenPct 3.36 = 10.09 x 5/15; trueDamagePct 93.66 = 140.49 x 10/15) depend on it. CALIBRATED; recipe: read the real skill2 cooldown + pulse shape from a focused Takina recording and rescale (value x uptime/CD). An interval-trigger pulse (10.09/140.49 for 5s/10s every CD) is the behavior-equivalent alternative the blind S2b reviewer independently proposed; both average to the same steady-state.
- ⚑ swap-shot economy (cadence / charge behaviour / ammo of the swapped 200.64% weapon) is kit-silent (ALWAYS-⚑ #3) — estimated optimistically by the engine's swap model; the kit gives no Full Charge line so no chargeMultPct.
- ⚑ true swap normals crit in the engine (sim.ts:2842 crit:true; §2c 'true damage cannot crit' carve-out covers riders/RIDER_CRIT only, not swap normals). Engine-fidelity gap; board impact unmeasured — owner spot-check, not an override encoding.

## `tia`

- **skill1** (1)
  - [Defensive / utility / mitigation] stacks up to 2 time(s) and lasts for 12 sec (the second CDR stack + 12s stack window need a passive cover-regen proc — environmental: requires boss damage on cover + cover HP regeneration, unmodelable at the v1 damage-only scope; COLD: sim grants one −13s stack per burst, effective CD 27s vs the observed in-game ~20s)

- **skill2** (3)
  - [Defensive / utility / mitigation] ■ Activates after landing 5 normal attack(s). Affects self. Max HP of Cover ▲ 32.75% of the skill user's Max HP for 5 sec. Attract: Taunts all enemies for 5 sec.
  - [Defensive / utility / mitigation] Restores Cover HP by 21.41% of the skill user's final Max HP (the restore AMOUNT — no Cover HP pool at scope; the line's trigger-anchor role for skill1 IS enacted via the burstCast proxy)
  - [No HP pool / healing domain] Recovers 21.96% of attack damage as HP over 10 sec.

## `tove`

- **skill1** (1)
  - [Weapon state / range / ammo / CDR] ■ Activates after 10 normal attack(s). Affects self. Emergency-Crafted Bullets: Reload 5.31% of the magazine.

## `trina`

- **skill1** (3)
  - [No HP pool / healing domain] HP MAGNITUDE: Continuously recovers 4.06% of the skill user's final Max HP every 1 sec for 5 sec — the recovery CADENCE (every 1 sec for 5 sec = 5 ticks) IS modeled (heal ticks:5 intervalSec:1 on fullBurstEnd, driving on-recovery consumers); only the HP amount is not (the engine's heal effect carries no HP value).
  - [No HP pool / healing domain] Recovers 2.03% of the skill user's final Max HP as HP.
  - [No HP pool / healing domain] Recovers 1.57% of the skill user's final Max HP as HP.

- **skill2** (1)
  - [Defensive / utility / mitigation] Invulnerable for 2 sec.

- **burst** (4)
  - [Weapon state / range / ammo / CDR] Spread Roots: Burst Skill damage of skills with "Affects all enemies" ▲ 435.6% for 5 sec.
  - [Weapon state / range / ammo / CDR] Changes Spread Roots to Wilted Roots.
  - [Weapon state / range / ammo / CDR] Wilted Roots: Burst Skill damage of skills with "Affects all enemies" ▲ 64.46% for 5 sec.
  - [Weapon state / range / ammo / CDR] Hit Rate ▲ 45.3% for 10 sec.

**Caveats / reasons:**

- burst: Spread Roots (435.6% Burst-Skill-damage amp on 'Affects all enemies' skills) FIRES in solo raid (enemy count = 1) and is NOT modeled — teammate all-enemies B3 burst nukes cast within 5s of Trina's burst are missing a large amp (teammates read COLD in Trina comps).
- burst: Max Ammunition +20 rounds is encoded kit-literal as maxAmmoFlat 20 (flat rounds — exact for every Electric AR ally regardless of magazine size; upgraded 2026-07-24 gauntlet from the prior maxAmmoPct 33.3 proxy, which assumed a 60-round AR base magazine and under-buffed smaller magazines, e.g. a 20-round ally got +6.66 vs the kit-literal +20).
- skill1: the fullBurstEnd HoT's recovery CADENCE (4.06% of caster final Max HP, every 1s for 5s = 5 ticks) IS emitted as recovery events (heal ticks:5 intervalSec:1 on fullBurstEnd) — 'when recovery takes effect' consumer kits (Crown-type) now proc off Trina across the full 5s window after each Full Burst. Only the heal's HP MAGNITUDE (4.06%) is unmodeled (the engine's heal effect carries no HP amount). The two Full-Charge threshold heals (2.03%/1.57%, gated on ally HP% <30/<50) stay wholly unmodeled — v1 has no HP pool to evaluate the gate against.
- [2026-07-17 THEME-13] Her two 'Max HP ▲ X% of the skill user's Max HP' grants are now modeled as casterMaxHpPct (S2 44.98% → all Electric-AR allies, passive/constant; burst 20.14% → all allies, 10s). Offensively INERT: ally-granted Max HP does not feed a teammate's atkOfMaxHpPct conversion (e3 rule) — no board damage moves. Kit-SSOT completeness only.

## `velvet`

- **skill1** (2)
  - [Bookkeeping / stacks / resources / stance] Bullet Snatch (battle start + Burst Stage 2): removes 5% ammo from all enemies; fills own ammo pouch to 6,000 rounds.
  - [Bookkeeping / stacks / resources / stance] Full Charge attack while not in Full Burst: expends 100 ammo from the ammo pouch.

- **skill2** (2)
  - [Bookkeeping / stacks / resources / stance] Full Charge attack during Full Burst: expends 300 ammo from the ammo pouch.
  - [Bookkeeping / stacks / resources / stance] Landing 50 normal attacks during Full Burst: expends 300 ammo from the ammo pouch.

- **burst** (1)
  - [Weapon state / range / ammo / CDR] Additional Effect (weapon-change spec — VERBATIM TEXT NOT AVAILABLE to this audit; fetch from blablalink: likely carries the swap weapon's charge time / ammo / Full Charge Damage spec that pins the swap shot economy)

**Caveats / reasons:**

- skill2: team buff (ATK 25.2% of caster + Charge Damage 100.8%) is kept alive by SWAPPED shots during her own 10s burst weapon-swap — kit requires a Full Charge attack; unverified whether the swap weapon full-charges (needs footage).
- burst: swap shot economy is a materialized parser estimate, not hand-verified — engine fires ~10 swapped shots/10s (60f cycle, no bolt gap) each carrying her SR charge-damage bucket on top of the 7% multiplier.

## `vesti-tactical-upgrade`

- **skill2** (1)
  - [Partless / AoE / targeting] ■ Activates when landing Full Charge attacks if self is in Battle Formation status. Affects self. ATK ▲ 20% for 3 sec.

- **burst** (1)
  - [Partless / AoE / targeting] ■ Affects self. Explosion Radius ▲ 100% for 10 sec.

**Caveats / reasons:**

- skill1: MECHANICAL FIX 2026-08-03 (owner ruling, n=1 owner-observed gameplay pattern, NOT footage-measured) — the 'while not in Missile Guide status' re-trigger gate is now encoded via the noRetriggerWhileActive buff primitive (both S1a chargeSpeedPct and S1b chargeDamagePct blocks), paired with an engine fix so the granting shot does not spend one of its own durationShots:3 rounds (sim.ts ROUND-COUNT buff expiry). Cycle: 1 slow (120f) charge, then 3 near-instant follow-ups (chargeSpeedPct 100 = 1-frame charge, see caveat below/⚑1), then MG lapses and the next full charge is slow again — matches the owner-confirmed 'one charge for 4 rockets' pattern. Control-comp total damage: 887.4M (prior, near-permanent-uptime bug) -> 436.0M (fixed), -51%. durationShots:3 + removeOnReload were already faithful; the fix is purely mechanism (WHEN the buff re-arms), no datamined magnitude changed. Prior text (SUPERSEDED, reasoning trail): the gate was NOT encoded (no 'not-currently-buffed' self-status gate existed), so shotFired refreshed the durationShots:3 window on EVERY full charge, modeling near-permanent Missile Guide uptime instead of the true duty cycle; estimated OVER-crediting her charge-speed-gated shot count.
- skill2: 'Battle Formation' (S2b ATK ▲20% gate) is UNMODELED — the driver ADOPTED the blind consensus (S2b claude-fable-5 + S5/S6 claude-opus-5 all independently re-derived INERT). 'Battle Formation' is a self-status granted nowhere in this kit and the schema has no self-status gate, so the line never fires in-scope; encoding it ungated (or even fbGate-gated) would credit an unprovable +20% ATK. The driver's fbGate:'inFb' reading (Battle Formation == Full Burst) is retained as the measurement-gated ALTERNATIVE (⚑6): restore a shotFired + fbGate:'inFb' atkPct 20 / 3s block if footage shows the proc tracking Full Burst windows
- skill2: 'Explosive Round' (S2c projectileExplosionPct 20 gate) is a cross-unit synergy with eunhwa-tactical-upgrade's burst cannon; ETU models her Explosive Round as a boss damageTaken rider, not a named targetStatus, so this requiresTargetStatus gate is INERT in current board comps (no in-scope source opens targetStatus:'Explosive Round'). Faithful structure; goes live when a unit emits the named status (⚑2)
- skill1: Charge Speed ▲100% = chargeSpeedPct 100, which the engine's subtractive-time convention reads as an instant charge (⚑1); the kit magnitude is pinned, the 100→instant interpretation is a global engine convention
- burst: 'Explosion Radius ▲100% for 10s' is UNMODELED — inert vs the single partless boss and no explosion-radius stat exists
- burst: the BUb 492.3% nuke is burstCast → noFb (lands before the Full Burst window, never takes the +50% major); the BUa trueDamagePct 60 self-buff pays off on her true-flavored S2a riders across the 10s post-burst window

## `vesti`

- **skill1** (1)
  - [Partless / AoE / targeting] ■ Activates when performing a Full Charge attack. Affects self. Explosion Radius ▲ 15.01% for 10 sec.

**Caveats / reasons:**

- skill1: 'Explosion Radius ▲15.01% for 10s' is UNMODELED — no explosion-radius stat exists in the schema and radius is damage-inert vs the single partless boss (vesti-tactical-upgrade carries the identical residual for its burst radius line). The nearest-wrong encoding (projectileExplosionPct 15.01) is pinned absent by the spec
- burst: the missile containers are modeled as TWO dots (one per container, prose-literal + datamine container-count 2) — 36 ticks × 15.56% = 560.16% ATK-equivalent per deployment; the combined-volley alternative is exactly half (⚑3, popup-count recipe). Ticks ride the DoT conventions: never core, noRange, crit per the engine DoT default (DOT_CRIT ON since 2026-07-21 — ticks roll crit at her sheet rate, ⚑2), FB-by-landing-timing (burst-placed dots are not cast-FB-exempt)
- burst: the SI-staged riders are cumulative AND same-cast-inclusive — cast 1 deals 210.62% (the SI stage granted by that same cast; skill2-slot blocks dispatch before burst-slot blocks); cast 3+ deals all three steps = 760.06%. Burst-cast damage lands before the Full Burst window opens → never takes the +50% major
- burst: 'Full Burst Duration ▼ 5 sec' = fullBurstExtend:-5 on her OWN casts (isabel precedent) — her windows run 5s, co-B3-opened windows stay 10s. Net rotation blast-radius sign unverified (⚑4, carried from isabel)

## `viper`

- **skill2** (1)
  - [Defensive / utility / mitigation] Activates when entering Full Burst. Affects self. Vamp: Prevents being targeted by single-target attacks continuously. This effect is removed upon taking a direct hit. Invulnerable for 1 sec. — DEFENSIVE: no HP pool / targeting model / boss damage in v1, so prevents-targeting + invulnerable move nothing; only the offensive Vamp GATE for skill1's stacks is modeled (via the Full-Burst window, fbGate:'inFb').

- **burst** (1)
  - [Defensive / utility / mitigation] Affects the enemy if the enemy is the stage target. DEF ▼ 19.83% for 10 sec. — INERT and UNENACTABLE: boss DEF enters the formula only as the fixed config constant cfg.bossDef (sim.ts:1719 baseAtk = max(0, effectiveAtk − cfg.bossDef)); no buff/debuff channel feeds it, so the engine cannot apply an enemy DEF reduction at all, and the magnitude is negligible regardless (measured boss DEF ≈140 → ~0.01% damage at scope-lock ATK, docs/data/damage-calculation.md). NOT modeled as damageTakenPct (a different bucket/math that would over-credit a ~19.83% team vuln the kit does not deliver) — phantom/guilty/marciana precedent. The stage-target sustained-damage line that shares this header IS modeled (the dot block).

**Caveats / reasons:**

- skill1: the S1b 'in Vamp status' gate is modeled as the Full-Burst window (fbGate:'inFb'), the closest available primitive — Vamp is technically permanent after the first FB in v1 (no direct hits), so the between-FB hit-rate-stack refresh is conservatively under-credited; the load-bearing sustained-DoT coupling is fully captured (⚑1).
- burst: the 1029.6% nuke is the TREASURE prose value (authoritative SSOT); the datamine ulti table carries the untreasured base 462.85%.
- burst: the DEF ▼ 19.83% line is inert (enemy DEF negligible at scope-lock; engine drops enemy DEF debuffs) and is NOT modeled — see unmodeled.burst.

## `volume`

- **skill1** (2)
  - [Partless / AoE / targeting] Affects self when killing an enemy.
  - [Other] ATK ▲ 12.6% for 5 sec.

**Caveats / reasons:**

- skill1: the kill-gated ATK ▲ 12.6% is UNMODELED — it can never trigger against the raid boss (the boss does not die mid-fight); recorded verbatim, not encoded as a passive/shotFired ATK proxy
- cadence: fire rate / reload are unmeasured estimates (engine SMG default shipped; datamine says 24 pulls/s, and reload_start_ammo 119 hints at a rolling reload) — verify on a focus video ⚑
- skill2/burst: escalating tiers reach full value only from her 3rd Full Burst / 3rd burst cast (burstCdr 8.21s/FB; critDamage +37.65%), and every modeled effect is burst/FB-gated — the whole kit is inert in a team that cannot chain Full Bursts

## `yan`

- **burst** (1)
  - [Inert / zero damage in v1] Forced movement toward the center of attack range, lasts for 2 sec. (crowd-control PULL on normal enemies; v1 fights a single scope-lock boss with no enemy movement/position model and bosses are not pulled, so the line moves no damage. NOT re-encoded as a damage or range buff — that would over-credit a benefit the kit does not deliver; viper/phantom/marciana precedent.)

## `yulha`

Yulha is a Fire SR Burst-III attacker whose kit revolves around a 'Calm' self-status earned by being attacked 30 times. In the sim (immortal boss, no incoming damage) Calm can never be earned, so only her unconditional lines fire: Skill 2 raises ALL allies' ATK by 90.75% for 5s every 30s, and her burst deals 457.87% of final ATK to all enemies. The Calm-gated half of her kit — the burst's additional 457.87% rider and her own +24.53% crit rate — is documented but unmodeled (out-of-domain), as is Skill 2's damage-sharing clause (defensive).

- **skill1** (2)
  - [Bookkeeping / stacks / resources / stance] Activates when attacked 30 time(s). Affects self.
  - [Bookkeeping / stacks / resources / stance] Calm: Critical Rate ▲ 24.53% for 20 sec.

- **skill2** (1)
  - [Defensive / utility / mitigation] Equally shares damage taken for 10 sec.

- **burst** (2)
  - [Bookkeeping / stacks / resources / stance] Affects the same target(s) when in Calm status.
  - [Bookkeeping / stacks / resources / stance] Deals 457.87% of final ATK as additional damage.

**Caveats / reasons:**

- skill1: the entire Calm mechanic (attacked 30× → Calm: self Critical Rate ▲24.53%/20s) is UNMODELED — the sim has no incoming-damage model, no 'attacked N times' trigger, and no self-status; the boss never acts
- burst: the 'when in Calm status → 457.87% additional damage' rider is UNMODELED — it is gated on the untriggerable Calm self-status, so the burst fires at half its theoretical (Calm-active) magnitude
- skill2: 'Equally shares damage taken for 10 sec' is UNMODELED — defensive damage redistribution; the boss deals no damage and there is no redistribution primitive
- skill1/skill2/burst: SR cadence tuple (charge 60f / reload 133f / bolt gap) is an unmeasured datamine estimate

## `yuni`

- **burst** (1)
  - [Defensive / utility / mitigation] Immobilizes the target(s) for 5 sec.

**Caveats / reasons:**

- skill1: chargeSpeedPct is the engine's SUBTRACTIVE charge formula (needed = round(chargeFrames×(1−cs/100)) → 90f→82f) and a TIMING channel only — the unit test pins that no per-shot magnitude moves with it on or off; the buff lands exactly on the fullBurstStart frames (fullBurstEnter, never burstCast).
- skill2: the heal line models NO HP amount — it emits recovery events to all allies (10 ticks at 1s per full-charge pull; the 10s WINDOW is kit-literal, the tick cadence is the engine-native approximation per helm H8 precedent). Its only sim observable is on-recovery consumer behaviour; with no consumer in a comp the line is honestly invisible.
- skill2: the ammo line is FLAT +1 round for 5s (theme-14 primitive) — deliberately shorter than its siblings' 10s windows, and a percent encoding (maxAmmoPct 1 → round(6×1.01)=6) silently never extends a magazine; the DEF half rides the same block and is damage-inert in v1.
- burst: 'Affects enemies within attack range' collapses to the single partless boss at scope lock; the Immobilize half has no boss-CC channel (⚑1) — unmodeled verbatim, never laundered into damageTakenPct or stun.

## `zwei`

- **skill1** (1)
  - [Missing engine primitive / trigger] 【Phase 3】Items ×110

- **skill2** (2)
  - [Defensive / utility / mitigation] 【Phase 2】Items ×50
  - [Defensive / utility / mitigation] Restores 7.52% of Cover HP.

- **burst** (2)
  - [Bookkeeping / stacks / resources / stance] 【Phase 1】
  - [Bookkeeping / stacks / resources / stance] Cooldown: 20 s

**Caveats / reasons:**

- burst: weapon-swap duration is kit-silent — authored 10s to match the Pierce Attacks 101 window; shot economy ~3 full-charge shots/window (1.2s charge + 1-ammo reload). Datamine duration_value '1 Shot' is ambiguous; footage-gated ⚑
- burst: 'Additional Effect: Pierce' is scoped to the swapped cannon (weaponSwap.hasPierce), NOT a unit-wide flag — her normal SG shots are not pierce-tagged, so the Pierce Damage ▲ buffs feed only her swap shots + any pierce-tagged ally
- skill1: 'for 1 round(s)' encoded as durationShots 1 (holder-scoped round count, no wall-clock expiry) via the durationShots primitive (helm carrier); the prior parser-baseline approximated it as 5s
- skill2: the 15% Crit Rate stack's 'while in Pierce Attacks 101 status' gate is proxied by swapGate:'swapped' (no ally-buff-state primitive); exact when the swap duration equals the 10s status duration. In a sole-B1 team this coincides with Full Burst; in multi-B1 teams it correctly stays silent on rotations Zwei does not burst (an fbGate proxy would over-credit there)
- skill2: 'after 5 normal attacks → Restores 7.52% of Cover HP' is UNMODELED — no cover/HP pool; cover-HP→recovery firing is an unverified hypothesis (encoding it as a heal would pump crown's on-recovery tandem off an unmeasured mechanic)
- burst: swap weapon range-band/core eligibility (charge cannon on an SG base) is an SR-like guess ⚑; base SG cadence tuple is datamine-unreliable ⚑
