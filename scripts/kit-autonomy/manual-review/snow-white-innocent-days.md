# Manual review — snow-white-innocent-days (Snow White: Innocent Days)

**Gauntlet date:** 2026-08-03
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (burstCast-vs-fullBurstEnter trigger identity on two lines; burst-scoped hit-threshold switch via countInFb; stacking maxAmmoPct with cap)

> Slug disambiguation: `snow-white-innocent-days` IS the Innocent Days variant (AR/Iron Attacker,
> Burst III, cd 40s, released 2023-11-02, nickname "swid") — distinct from `snow-white` (the base
> AR/Iron cannon-swap unit) and `snow-white-heavy-arms` (SR/Water); the slug-disambiguation lint
> returned clean. FROM-SCRATCH gauntlet: no shipped override existed before this run
> (`simSupported` was false); the override was authored as the faithful encoding under test
> (poli precedent) and every assertion pins a kit line GREEN vs it and RED vs the nearest-wrong
> counterfactual.

## Kit summary

Snow White: Innocent Days is an Iron AR Attacker on Burst III (cd 40s) whose entire kit runs off
hit counters on her normal fire. Every 30 landed normal attacks her S1 fires twice: she gains a
stack of Max Ammunition Capacity ▲25.66% (up to 5 stacks, each refreshing a 5s window — at AR
cadence the stacks climb to the cap and hold while she keeps firing) and deals 188.68% of final
ATK to enemies in attack range. Every 50 landed normal attacks her S2 deals 61.69% of final ATK
to all enemies. When she uses her Burst Skill she gains Attack Damage ▲21.12% for 10s (Damage-Up
bucket — distinct from ATK), and the burst itself grants ATK ▲97.2% and unlimited ammunition for
10s while lowering Skill 2's hit requirement by 20 (50 → 30) for those 10s. The ammo-capacity
stacks and the unlimited-ammo window both keep her firing without reloads, which feeds the two
hit-counter procs — her burst window is a dense cluster of S1/S2 riders on top of an ATK-doubled,
Damage-Up-buffed AR stream.

## Line-by-line

| Line | Disposition | Notes |
| ---- | ----------- | ----- |
| S1: every 30 hits → self Max Ammunition Capacity ▲25.66%, x5 stacks, 5s | FAITHFUL | `hitCount:30` → self `maxAmmoPct 25.66 / 5s / maxStacks 5`. Engine stacks add value×stacks into `maxAmmo()`; re-apply refreshes duration and climbs one stack toward the cap. Measured in the fixture: 67 applies over 180s (= floor(2028 shots/30)) and the cap IS reached — her unlimited-ammo windows fire reload-free at 2.5s/proc < the 5s duration. Live arm: removal lowers her shot count and total. Weapon-state = damage, never skippable. |
| S1: every 30 hits → enemies in attack range: 188.68% final ATK | FAITHFUL | `hitCount:30` → `flatDamage 188.68`, target enemy (single partless boss at scope). Same 30-hit activation as the ammo line (two blocks, shared cadence — pinned frame-exact against an INDEPENDENT carry-over 30-hit walk over her shot events). Rider conventions: skill bucket, FB +50% by landing timing, crit-eligible at sheet rate (RIDER_CRIT default), no core (kit says none). Every-3-hits counterfactual produces >5× the riders. |
| S2: every 50 hits → all enemies: 61.69% final ATK | FAITHFUL | `hitCount:50` (with the burst's threshold switch — see below) → `flatDamage 61.69`. Proc schedule pinned frame-exact against an independent 50/30 carry-over walk; the damage-loss ordering vs the 30-hit rider (~5:1 per hit-rate) discriminates swapped thresholds. |
| S2: using Burst Skill → self Attack Damage ▲21.12%, 10s | FAITHFUL | `burstCast` → self `attackDamagePct 21.12 / 10s`. Bucket identity load-bearing: "Attack Damage" is the Damage-Up bucket, composing multiplicatively with the burst's ATK ▲97.2%. Trigger identity pinned: applications land frame-exact on HER burstCast frames and equal her cast count — the fullBurstEnter counterfactual fires on helm's windows too (strictly more) in the two-B3 control fixture. |
| Burst: Hit count required for Skill 2 ▼20 for 10s | DOCUMENTED_GAP (⚑⚑, low) | Enacted as `countInFb:30` on the S2 hitCount trigger (RRH precedent). The engine's hitCount threshold switch keys to the GLOBAL FB window, not her cast — the owner-anchored variant (`lastBurstCastFrame + 10s`) exists only for `chargeCounter`, and S4 froze src/engine/**. Consequences: in multi-B3 comps the lowered threshold also applies during FB windows another B3 opened (~+1-2 extra 61.69% procs per foreign window ≈ 0.5-1% of her total), and the window is FB-anchored rather than cast-anchored (~0.3s offset). Exact at single-B3 scope. All four parties converged on this resolution: S2b predicted the failure mode, the S6 blind override-writer independently chose the same encoding with the same ⚑, the S5 blind test-writer independently refused to assert it ("countInFb is FB-scoped, not burst-cast-window-scoped"), and the judge classified it documented, not a gotcha. Counter carries over the boundary (no reset — RRH semantics). |
| Burst: ATK ▲97.2% for 10s | FAITHFUL | `burstCast` → self `atkPct 97.2 / 10s` (base-ATK bucket, distinct from the 21.12% Damage-Up line). Apply frames == her cast frames (fullBurstEnter counterfactual fires strictly more); removal drops her total; teammates' grants untouched. |
| Burst: Unlimited ammunition for 10s | FAITHFUL | `burstCast` → self `unlimitedAmmo 10s`. Shot-level pins: every in-window shot carries the unlimited flag and ammoAfter NEVER steps down (a reload already in flight at cast still completes — observed 3× in the fixture — so the assertion allows upward jumps, not freezes); out-of-window shots drain exactly 1/shot. Nearest-wrong (one-shot instantReload) fails: the stripped counterfactual flags zero unlimited shots and reloads inside every window. |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** independent spec converged on all 7 lines —
  same triggers, magnitudes, buckets, and scopes; pre-registered the five expected shared-prior
  misreads (countInFb-without-own-gate, "▼20" as "set to 20", ammo line skipped as defensive,
  21.12/97.2 bucket swap, riders as one-shot) and the two-B3 fixture as the discriminator. Its ONE
  FIX disposition was L5 (own-cast vs FB-window keying) — reconciled above with evidence, kept as
  the documented best-available encoding under the engine freeze; its stack-dynamics reading
  ("stacks climb toward 5 while she keeps firing") was empirically confirmed (maxSeen 5).
- **S5 (claude-opus-5, blind test):** prose-only suite (28 tests). After mechanical fixes
  (harness path, `unitSlug` → `slug`, slot resolution via buffApply.targetIdx) and 7 documented
  fixture-awareness patches (caster-scoped buff filters for the allies' same-stat team grants —
  liter escalating maxAmmoPct, crown 20.99, helm 27.87/critRateNormalPct — and two
  byte-identical-teammates arms replaced with grant-scope arms, since her ammo economy couples the
  team rotation via burst gauge), **vs the driver override: 27 GREEN + 1 intentional skip**. The
  skip is the blind model's OWN refusal to assert L5 on the same primitive-gap grounds — evidence,
  not a failure.
- **S6 (claude-opus-5, blind override):** structurally IDENTICAL on all 7 lines — same triggers
  (hitCount 30 ×2, hitCount 50 + countInFb 30, burstCast ×3), magnitudes, durations, scopes. Only
  delta: explicit `crit: true` on both riders (redundant — RIDER_CRIT default). Its flag list
  carries the SAME countInFb multi-B3 over-credit ⚑ with its own falsification recipe, plus
  cadence-tuple / stack-occupancy / landing-vs-fired ⚑s.
- **S7 (kimi-code/k3, binding judge):** verdict **GO**, faithfulness **1.0**,
  `discriminationOk: true`, one low-severity FIDELITY gotcha (L5) with `documentedByDriver: true`.
  Six lines FAITHFUL with frame-exact independently re-derived pins; L5 classified
  DOCUMENTED_GAP — "the best available under the engine freeze; exact at single-B3 scope; recorded
  decision, not a silent gotcha." Judge's own residual note: driver/S5/S6 all share the RRH prior
  that countInFb is the acceptable stand-in, so the one measurement worth spending is the
  foreign-B3-window popup count.

## Residual flags (owner spot-check cluster)

1. **⚑⚑ L5 countInFb scope (the headline item):** in a two-B3 recording, count 61.69% popups
   during a FOREIGN-B3 Full Burst window — kit-true spacing is 50 hits, shipped spacing is 30.
   If the kit truly is own-cast-anchored (all four agents' reading), the post-freeze fix is an
   owner-anchored hitCount threshold primitive mirroring chargeCounter's `lastBurstCastFrame + 10s`.
   Bounded ~0.5-1% of her total in multi-B3 comps; exact in single-B3.
2. **⚑ cadence tuple:** AR class rate 12 pulls/s (datamined rate_of_fire 720) + reloadFrames 81
   are datamine, not focus-verified — and this unit's ENTIRE damage identity is hit-count-driven,
   so a cadence error propagates one-to-one into proc counts. Recipe: read the ammo counter
   frame-by-frame over one magazine in a solo recording.
3. **⚑ maxAmmo stack occupancy:** the engine's refresh-stacking holds 5 stacks (+128.3% → 137-round
   magazine) for most of the fight; if real occupancy sawtooths below cap, magazine length and
   reload count are over-modeled. Recipe: DBG_BUFFS stack log or on-screen ammo-capacity reads.
4. **⚑ landing vs fired:** hitCount counts rounds dispatched; the kit says "landing". At scope
   lock accuracy is ~100%, so proc counts are an upper bound. Recipe: popup count vs rounds fired
   quotient in a solo fight.
5. Still **MODEL_ONLY / untuned** — the gauntlet certifies structure, not magnitudes; no board
   reading exists yet (board: null).
