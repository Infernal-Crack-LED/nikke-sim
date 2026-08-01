# Manual review — rem (Rem)

**Gauntlet date:** 2026-08-01
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (status-gated ATK stack via a `requiresTargetStatus` self-status proxy; weapon-scoped RL buffs; `burstCast`-vs-`fullBurstEnter`)

> Slug disambiguation: `rem` IS Rem (data name "Rem", MG/Water/Supporter/Burst II, cd 20s, ammo 300,
> reloadFrames 171, hitsPerShot 1, normalMult 5.57 / coreMult 200, critRate 15 / critDamage 150).
> Lint clean (no AMBIGUOUS).

## Kit summary

Rem is a Water MG Supporter on Burst II whose personal damage is secondary to a Rocket-Launcher team
amp. Casting her burst does three damage-relevant things: it puts HER into "Demon's Breath" for 10s
(self Critical Rate ▲37.8% — this window IS the named status), and it grants every Rocket-Launcher ally
a flat ATK bonus equal to 50.78% of Rem's own ATK plus +5 max ammunition for 10s. While Demon's Breath
is active, every 15 normal attacks she lands gives her a stacking self ATK ▲4.22% buff (up to 30 stacks,
each lasting 10s), so her personal damage ramps inside each post-burst window. The rest of her kit is
sustain — continuous self lifesteal (42.24% of attack damage as HP), a continuous HP-recovery share with
herself and her two highest-final-ATK RL allies, and a 10s team-wide HP-recovery share on burst — all of
which is healing/HP-redistribution and therefore damage-inert in v1 (no HP pool; the boss deals no
damage; Rem carries no recovery-triggered block). In game terms she is a low personal-damage enabler
whose real contribution is amping RL teammates (caster-scaled flat ATK + magazine size).

## Line-by-line

| Line                                                            | Disposition      | Notes                                                                                                                                                                                                                       |
| --------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Burst: burstCast → self critRatePct 37.8/10s (Demon's Breath)   | FAITHFUL         | UNSCOPED crit (kit has no "of normal attacks" qualifier → `critRatePct`, not `critRateNormalPct`); `burstCast` not `fullBurstEnter`; R1: normal crit 0.528 in-window vs 0.15 with buff removed                              |
| Burst: burstCast → enemy targetStatus "Demon's Breath"/10s      | FAITHFUL (proxy) | The SELF status is proxied as a name-keyed BOSS `targetStatus` (engine has no `requiresOwnBuff`/self-status primitive); the gauntlet-validated asuka-wille/marciana/privaty pattern; only Rem reads it (⚑1)                 |
| S1: 15 normals in Demon's Breath → self atkPct 4.22 ×30/10s     | FAITHFUL         | `hitCount:15` + `requiresTargetStatus "Demon's Breath"` + self `atkPct 4.22 maxStacks 30 durationSec 10`; R2 pins every stack inside [cast, cast+600f]; gate-dropped counterfactual leaks stacks into the inter-window gaps |
| Burst: burstCast → RL allies casterAtkPct 50.78/10s             | FAITHFUL         | Caster-scaled FLAT ATK add ("of the skill user's ATK" = Rem-scaled, flat-resolved ≈0.5078×static ATK, not the raw 50.78); `alliesOfWeapon RL`; Rem is MG so she never self-receives; R3 strip lowers the RL ally only       |
| Burst: burstCast → RL allies maxAmmoFlat 5/10s                  | FAITHFUL         | FLAT rounds ("5 round(s)" is the amount, "for 10 sec" the duration), NOT `maxAmmoPct`/`durationShots`; ammo capacity IS damage (gates shots fired); R4 strip moves the RL ally                                              |
| S1: burstCast → all allies "Equally shares HP recovery" 10s     | DOCUMENTED_GAP   | UNMODELED verbatim — heal-REDISTRIBUTION (not a plain heal), damage-inert in v1; R5 PINs skill1 emitting exactly {atkPct}, no heal leaked; conditional tandem-live recipe recorded (⚑4)                                     |
| S2: start → self lifesteal 42.24% of attack damage (continuous) | DOCUMENTED_GAP   | UNMODELED verbatim — no lifesteal primitive, no HP pool; offensively inert (Rem has no on-recovery consumer); R6 PINs skill2 emitting zero buffs + zero skill2-sourced damage                                               |
| S2: start → self + 2 highest-final-ATK RL allies share recovery | DOCUMENTED_GAP   | UNMODELED verbatim — redistribution + the target set (self + top-2 RL by final ATK) is inexpressible today (no weapon-filtered top-N-by-ATK selector); buff-stat-set PIN guarantees no leakage; future recipe recorded (⚑4) |

## Cross-family corroboration

- **S2b (claude-fable-5, adversarial test-faithfulness review):** `leakDetected:null`. Independently
  re-derived all 7 kit lines. CONVERGED exactly on the 4 modeled damage lines (self crit 37.8, gated ATK
  stack 4.22×30, RL casterAtkPct 50.78 flat-resolved, RL maxAmmoFlat 5) — value/scope/trigger/duration and
  nearest-wrong counterfactuals all match. The reviewer's skill1 "GAP" disposition is the engine
  self-status-primitive gap, which the driver closes with the boss-`targetStatus` proxy; the reviewer's OWN
  distinguishing assertion (no stacks before first burst; every stack within 600f of a cast; ≤30) is exactly
  what driver R2 pins. The two heal-share lines the reviewer ranks load-bearing TANDEM-LIVE assume a
  crown-containing `controlComp` (an on-recovery consumer); the driver's purpose-built fixture has none, so
  they are damage-inert → UNMODELED+verbatim. Fixture-scope difference, not a faithfulness disagreement.
- **S5 (claude-opus-5, blind test-writer):** `leakDetected:null`. Independently derived the same structure
  (UNSCOPED self crit, RL-only flat-resolved casterAtkPct, RL-only maxAmmoFlat 5, Demon's-Breath-gated ATK
  stacks with inter-window lapse, and the three heal lines as GAP/`it.skip`). Convergence vs the driver
  override: the VERBATIM run on `controlComp('rem', true)` went 8 RED / 4 vacuous-pass / 3 skip — but every
  RED traces to ONE root cause the blind test itself diagnoses: crown wins the shared Burst-II slot so Rem
  casts 0 bursts and every burst-keyed assertion vacuates (the blind test's first test is a non-vacuity
  canary that explicitly says "re-fixture, do not read the burst assertions below as override failures").
  Re-fixtured per that canary (Rem sole B2 = [liter/rem/ada], assertions verbatim): **12 pass / 3 skip, 0
  RED** — all substantive assertions GREEN vs the driver override.
- **S6 (claude-opus-5, blind override-writer):** `leakDetected:null`. Converges on all 4 damage lines
  (identical value/scope/trigger/duration). Three blind-side divergences, all weaknesses not driver defects:
  (1) the self-status gate encoded as a `mode:"demonsBreath"` + top-level `modes[]` primitive that is NOT
  demonstrated to exist in the engine (the driver's `requiresTargetStatus` proxy validates and is
  behaviourally proven); (2) the heal lines encoded as recovery-event emitters (the driver leaves them
  UNMODELED — both agree damage-inert; the divergence is whether to emit events for a hypothetical consumer);
  (3) a `rampSec:8` stack-ramp haircut the driver rightly refused (MEASURED > FUDGE — the natural
  hitCount+gate ramp is the faithful read).
- **S7 (kimi-code/k3, binding reconciling judge):** **GO, faithfulness 1.0, discriminationOk:true, 0
  REAL-GOTCHAs.** All 7 lines accounted (4 FAITHFUL + 3 DOCUMENTED_GAP), zero silent drops. The judge
  independently classified the verbatim S5 RED as a fixture artifact (accepted the re-fixtured 12-pass
  convergence as GREEN), verified each damage line against the formula SSOT (atkPct additive bucket,
  casterAtkPct flat-outside-recipient placement, unscoped crit in the Major bucket, ammo gating shots), and
  ruled the two blind S6 divergences blind-side weaknesses. Convergence "earned honestly."

## Residual flags for owner

1. **⚑1 (Tier 2) — self-status proxied as a boss `targetStatus`.** The engine has no
   `requiresOwnBuff`/self-status gate, so "Demon's Breath" is mirrored as a name-keyed boss status that only
   Rem's `requiresTargetStatus` reads. Inert today (no other in-scope "Demon's Breath" carrier), but the
   side channel would be falsely read by any future unit gating on the same name. Recipe: add a
   `requiresOwnBuff`/self-status primitive and replace the proxy.
2. **⚑2 (Tier 3) — hit-counter not reset at the window boundary.** The `hitCount:15` counter is cumulative
   across windows (the engine carries hits), so the first stack after each window-entry may land up to 14
   hits early depending on the carry phase. In-game reset behaviour is unverified. Estimate: ≤1 stack phase
   shift per window (~sub-second on an MG). Recipe: a window-reset hitCounter variant.
3. **⚑3 (Tier 3) — full-30-stack reachability is MG-cadence-dependent.** Whether a 10s window builds the
   full 30 stacks depends on the datamine ammo/RoF ladder (unverified for this unit). The encoding caps at 30
   and refreshes the 10s duration per stack, so steady-state in-window is near-max. Recipe: read rounds/min
   from a focus video.
4. **⚑4 (conditional, from reviewer) — heal-share tandem path.** IF a recovery consumer (e.g. crown) comes
   into scope, the skill1 burst-cast HP-share (all allies, 10s, burstCast-keyed) and the skill2 RL-scoped
   continuous share (self + 2 highest-final-ATK RL allies, byFinalAtk + `alliesOfWeapon RL`) become
   tandem-live and need a heal-event encoding. Inert in the current damage-only model; recorded so the
   targeting (RL-scoped, byFinalAtk) is not lost if an HP pool lands.
5. **Same-model residual to spot-check (judge):** all three agents independently read "Demon's Breath" as
   the 10s window Rem's OWN burst opens and the S1 stacks as confined to it — the kit implies but never
   states the source, the per-window counter reset (⚑2), or the per-stack-vs-pool-refresh timer semantics.
   ONE focused burst-window video (first-stack timing relative to her cast) settles all three at once.

## Board

Rem is NOT on the accuracy board (no probe recordings / real fight data yet). The board pins accuracy
(sim-vs-real), which requires real data; faithfulness is pinned by the unit tests + cross-family
triangulation above. Tier stays MODEL_ONLY, tuned:false until a real fight validates the magnitudes.
