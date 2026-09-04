# Manual review — drake-great-villain (Drake: Great Villain)

**Gauntlet date:** 2026-09-03
**Verdict:** GO (cross-family corroborated — two judges)
**Faithfulness:** 1.0 (kimi-code/k3, binding) · 1.0 (claude-opus-5, second judge)
**Tier:** 2 (fullBurstEnter weapon swap on ANY team Full Burst; Full-Burst-end forced ammo dump; stacking caster-Max-HP grant feeding her own Max-HP→ATK conversion)

> Slug disambiguation: `drake-great-villain` (Drake: Great Villain — SG / Defender / Wind / Burst III) is a
> VARIANT of base `drake` (Drake (Treasure) — SG / Attacker / Fire / Burst III). Entirely different kit.
> Released 2026-09-03; Synergy has no row yet, so her release date is hand-carried in
> `src/data/sync.ts` MANUAL_RELEASE_DATES like yukiko's.
>
> Routing for this run (owner instruction): driver Claude Fable 5.1; S2b → `kimi-code/k3` (+ `claude-opus-5`
> as the Tier-2 second reviewer); S5/S6 `claude-opus-5`; S7 `kimi-code/k3` (+ `claude-opus-5` second judge).

## Kit summary

Drake: Great Villain is a Wind shotgun Defender on Burst III (40s cooldown) whose kit revolves around
Full Burst. Whenever any Full Burst begins she swaps to "Super Duper Overdrive", a 15-pellet charge
shotgun with a fixed 1.5-second charge, a 6-round magazine, 243.75% of final ATK per full shot and a
300% full-charge multiplier; when that state ends she loses her whole magazine and must reload from
empty. Each time a Full Burst ends she raises all allies' Max HP by 10.5% of her own Max HP, stacking
up to four times, and her permanent "Fashionably Late" converts 6.23% of her live Max HP into ATK, so her
damage steps up across the first four Full Bursts. Her burst grants herself +27.5% Attack Damage for
25 seconds and hits all enemies for 1350% of final ATK.

## Line-by-line

| Line                                                                       | Disposition | Notes                                                                                                                                                                                       |
| -------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1: when entering Full Burst → weapon swap Super Duper Overdrive           | FAITHFUL    | `fullBurstEnter` (ANY team FB — fires on helm's rotations too; burstCast counterfactual under-fires) (D1)                                                                                   |
| S1: Charge Time fixed 1.5 s                                                | FAITHFUL    | chargeTimeSec 1.5 + chargeTimeClamp 1.5; a clamp-only encoding never charges (engine gotcha pinned); ally Charge Speed ▲100% leaves the 90 f cadence byte-identical                         |
| S1: Damage 243.75% of final ATK / 15 pellets / Full Charge 300% / 6 rounds | FAITHFUL ⚑  | Full-shot total × the SAME pellet-landing fraction as her base shotgun (weapon 'SG', pelletCount 15), ×3.0 charge, +50% FB, exactly 6 charged shots per window (D1). ⚑ split + shot economy |
| S1: when Super Duper Overdrive ends → removes 100% of ammo                 | FAITHFUL    | `fullBurstEnd` + instantReload THEN consumeAmmo — a fresh full base reload starts on the FB-end frame; the bare consumeAmmo all four blind roles wrote is INERT in this engine (D2)         |
| S2: when Full Burst ends → all allies Max HP ▲ 10.5% of her max HP, ×4     | FAITHFUL    | `fullBurstEnd`, allies incl. self, casterMaxHpPct 10.5, maxStacks 4, permanent; feeds ONLY her own conversion (e3 rule) — allies byte-identical (D3)                                        |
| S2: "(without restoring HP)"                                               | FAITHFUL    | Honored by construction — the grant emits no recovery event (caveat)                                                                                                                        |
| S2: Fashionably Late — ATK ▲ 6.23% of her final max HP continuously        | FAITHFUL    | `battleStart` atkOfMaxHpPct (re-reads LIVE Max HP, so the stacks feed it: +6.23% × 4 × 10.5% × maxHp after four FB ends); snapshot / atkPct counterfactuals discriminated (D4)              |
| Burst: self Attack Damage ▲ 27.5% for 25 s                                 | FAITHFUL    | `burstCast`, self, 25 s; all-allies and 10 s counterfactuals discriminated; the same-cast nuke carries it (+0.275 dmgUp) (D5)                                                               |
| Burst: all enemies 1350% of final ATK as Burst Skill damage                | FAITHFUL    | Cast-instant (no +50% major, no range), crit-eligible, unflavored, TAGGED `burstDesc 'allEnemies'` (D6)                                                                                     |

`unmodeled` is empty on all three slots.

## Cross-family corroboration

- **S2b (kimi-code/k3):** `leakDetected: null`. 6 lines, all FAITHFUL and load-bearing. Named every trap
  the driver pinned (fullBurstEnter vs burstCast on the two-B3 fixture; casterMaxHpPct vs
  targetMaxHpPct; atkOfMaxHpPct vs the apply-time snapshot; the same-cast +27.5% on the nuke). Its
  "burst skill damage does not crit" note contradicts the roster convention (crit-eligible riders) and
  was reported, not adopted.
- **S2b (claude-opus-5, second reviewer):** `leakDetected` minor/non-answer (the base `drake` maxAmmoFlat
  comment). 12 lines. Expected ~5 shots per window from a 22 f release latency — in this engine the
  latency is SR/RL-base-only and never applies while swapped, so 6 is the engine's literal outcome;
  carried as the shot-economy ⚑ with a recipe.
- **S5 (claude-opus-5, blind test):** `leakDetected: null`. Runs UNMODIFIED against the driver override:
  **22 passed / 1 failed / 3 skipped** (skips = its own documented gaps). The one RED asserts "no dump →
  more damage" on its solo-B3 fixture, where removing the dump perturbs her gauge feed and delays two of
  five Full Bursts (a rotation artifact); on the two-B3 control fixture the counterfactual moves the
  expected way (+14.3M) and the driver test pins it. Both judges classified it RECON_ERROR.
- **S6 (claude-opus-5, blind override):** `leakDetected: null`. Block-identical to the driver's override
  except the dump block: the blind wrote bare `consumeAmmo`, the driver `instantReload` + `consumeAmmo`.
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, discriminationOk true, zero gotchas.**
  Singled out the dump encoding as the run's real signal: four blind roles converged on an encoding that
  is inert in this engine; the driver's is the faithful representation, documented with frame evidence.
- **S7 (claude-opus-5, second judge):** **GO, faithfulness 1.0.** Two ENGINE/FIDELITY findings routed
  off this unit (engine-modeling-gaps.md §22: a `swapEnd` trigger primitive or expiry-before-trigger
  ordering would make the bare encoding faithful roster-wide; the fixed 10 s swap window vs a
  fullBurstExtend ally), and one coverage request — a charge-speed-ally arm for the clamp — added to
  the spec test (the clamp is engine-redundant, so the arm pins the immunity itself).

## Residual flags (owner spot-check cluster)

1. **Swap shot economy** — the test pins EXACTLY 6 charged shots per window at a 90 f cadence; that is
   an engine convention (no swap-side release latency), not a measurement. One focus recording counting
   charged-shot popups in a single Full Burst settles a ~17% swing on her largest damage window. Record
   this first.
2. **243.75% full-shot vs per-pellet** — shared prior across all five agents, unconfirmed against footage
   (expect ~16.25% × 3.0 per pellet popups).
3. **Swap window under a Full-Burst extender** — fixed 10 s vs the live FB end desyncs both the swap and
   its coupled ammo dump; measurement recipe in the override caveats.
4. **The bare ammo-dump encoding is inert engine-wide** — any other unit pairing a swap end with an
   ammo/reload line inherits the same trap (engine-modeling-gaps.md §22).
