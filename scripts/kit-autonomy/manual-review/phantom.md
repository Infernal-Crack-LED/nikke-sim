# Manual review — phantom (Phantom)

**Gauntlet date:** 2026-07-26
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (named target-status gates — `requiresTargetStatus` on two lines; a resource-gated stack
consume — `resourceGate`; live `perResource` pools; the `bossElementGate` Fire vuln; round-count
`durationShots`)

> Slug disambiguation: `phantom` IS Phantom (Treasure) (data `treasure:true`, name "Phantom",
> AR/Water/Attacker/Burst III, Elysion, cd 40s, ammo 60, RoF 720 = 12 shots/s, reloadFrames 141 =
> 2.35s). The datamined `skill1_detail`/`skill2_detail`/`ulti_skill_detail` descriptions carry the
> UNTREASURED base kit; the blablalink treasure prose in `data/characters.json` adds the "after
> landing 30 normal attacks" Thief's Dagger grant that sets the whole consume cadence. This was a
> FROM-SCRATCH build — phantom had no shipped override (`simSupported:false`) before this gauntlet,
> so the override and the spec landed together.

## Kit summary

Phantom (Treasure) is a Water-element AR Attacker on Burst III built around a thief loop. Her first
hit on a target NOT carrying Calling Card applies it — a 5-second status window (the DEF ▼32.19%
content is damage-inert in the sim and sits verbatim in `unmodeled`; the WINDOW is what matters,
because two downstream lines gate on it). Every hit while the card is up grants herself Attack
Damage ▲75.17% for 1 round. Thief's Dagger stacks (Hit Rate ▲25.75% each, max 3) accrue once at the
start of each magazine and once every 30 hits from her treasure — three grants per 60-shot magazine,
so the dagger hits max on the LAST shot of every magazine and CONSUMES there: 84.33% of final ATK as
plain additional damage to the card-carrying boss, plus 250% of final ATK as Distributed Damage to
all enemies, plus a permanent Distributed Damage ▲12.86% stack (cap 3) that her OWN burst resets,
plus the dagger stacks drained to zero to restart the cycle. Every 10 normal attacks she self-buffs
ATK ▲85.12% (5s) and Distributed Damage ▲31.92% (10s). Her burst deals 1457.28% of final ATK as
Distributed Damage to all enemies (FB-exempt — the cast lands before the window opens), marks Fire
Code stage targets Damage Taken ▲18% for 30s, and expands her own magazine ▲50% for 10s (one
90-round post-burst magazine).

## Line-by-line

| Line | Disposition | Notes |
|------|-------------|-------|
| S1: normal hit on non-CC target → Calling Card window (5s) | FAITHFUL | `targetStatus` refreshed every shot; the "not in CC state" clause collapses to the battle's first shot under continuous fire (real on-shot duty ~98.3–100%; ⚑1). P1/P4 pin the gate load-bearing two-sided |
| S1: Calling Card DEF ▼ 32.19% / 5s | DOCUMENTED_GAP | Magnitude verbatim in `unmodeled.skill1`: enemy DEF is a negligible flat subtractive term, engine drops enemy DEF debuffs (sim.ts:1782), sim runs bossDef:0 — inert by measurement. S6's `defPct -32.19` block would have been the silent-drop version |
| S1: Thief's Dagger Hit Rate ▲ 25.75% ×3 | FAITHFUL | Live `thiefsDagger` resource pool (cap 3) read by a passive `perResource` hitRatePct ×25.75; the 5s per-stack decay never binds (consume at t≈4.92s pre-empts it). P2 discriminates vs the always-at-max flat 77.25% model (shipped < flat-max) |
| S1 (TREASURE): after 30 normal attacks → Dagger grant | FAITHFUL | `hitCount:30` → `thiefsDagger +1`; sets the one-consume-per-magazine cadence. P3: shipped consume count > 2× the no-treasure counterfactual; shots/consume ∈ (50,70). S6 MISSED this bullet (3× too-slow cadence) |
| S1: Attack Damage ▲ 75.17% for 1 round | FAITHFUL | `shotFired` + `requiresTargetStatus` + `durationShots:2` — ⚑2 engine-order compensation (shotFired dispatches after the shot's damage, sim.ts:2913/2973, so :1 is a dead buff; :2 yields the exact 59/60 duty). Block ordered BEFORE the status-inflicting block so the application shot is excluded |
| S2: 84.33% of final ATK additional damage | FAITHFUL | `flatDamage 84.33` in the consume block (`resourceGate min:3` + `requiresTargetStatus`); plain additional damage, NOT distributed. P5 pins critEligible true / coreEligible false / mult.distributed===1 (SSOT §2b) |
| S2: Removes Calling Card | DOCUMENTED_GAP | Verbatim in `unmodeled.skill2`: no consume-target-status primitive (⚑3). Moot — the natural 5s lapse pre-empts the next magazine-start reapplication at steady cadence. S6 hit the SAME schema wall independently |
| S2: Distributed Damage ▲ 12.86% cont. ×3 | FAITHFUL | `distAmp` resource pool (cap 3) + `perResource` distributedDamagePct ×12.86; the `burstCast` reset (delta −3) is EXACT via the resource machinery, ordered AFTER the nuke block. P7 pins the oscillation (post-2nd-burst min < 1.4 shipped vs > 1.6 no-reset). S6 declared this unmodelable |
| S2: 250% of final ATK as Distributed Damage | FAITHFUL | `flatDamage 250 flavor 'distributed'` + `thiefsDagger delta:-3` in the same consume block ("removes stacks"); "all enemies" = the single v1 boss. P6 pins 1:1 pairing with the 84.33 hit, mult.distributed > 1 on every hit, >10 consumes in 180s (pool is drained) |
| S2: after 10 hits → ATK 85.12/5s + Dist 31.92/10s | FAITHFUL | `hitCount:10` → self atkPct 85.12/5s + distributedDamagePct 31.92/10s. P8 pins exact 300f/600f durations, apply count ≤ shots/10. The one clean mechanical blind-vs-driver convergence (S5 GREEN after wiring repair; S6 identical block) |
| Burst: 1457.28% of final ATK distributed | FAITHFUL | `burstCast flatDamage 1457.28 flavor 'distributed'`; noFb via the engine's burstCast default (U10), no range. P9 pins fbMajorApplied===false and rangeApplied===false on every nuke, once per phantom cast (casts < FBs — helm alternates B3) |
| Burst: Fire target → Damage Taken ▲ 18% / 30s | FAITHFUL | `bossElementGate 'Fire'` → enemy damageTakenPct 18/30s; live vs Fire, exactly inert otherwise. P10 pins once-per-cast to the boss (targetIdx null), 1800f, team-wide lift vs Fire, byte-identical totals on removal vs Iron. S6 omitted this line entirely |
| Burst: Max Ammunition Capacity ▲ 50% / 10s | FAITHFUL | Self maxAmmoPct 50/10s per cast (60→90 for one post-burst magazine). P11 pins 50%/self/600f/once-per-cast, load-bearing via reload downtime. S6 omitted this line; S5 untested |

## Cross-family corroboration

> **Reduced decorrelation — read this first.** Claude quota was exhausted during this batch, so
> phantom ran **NO Claude blind roles at all**. The owner had mandated S5/S6 = `kimi-code/kimi-for-coding`
> (K2.7), but K2.7 **timed out twice at the 600s cap with zero output** while the bridge probe was
> healthy at ~6s, so the driver degraded S5/S6 to `kimi-code/k3` (K3) **within the Kimi family**.
> All four blind roles therefore landed on a single model — **S2b = k3, S5 = k3, S6 = k3, S7 = k3**
> (each result JSON's `model` field confirms). The cross-family check against the Qwen driver is
> still preserved, but the blind side is single-model on top of same-family, so the blind agreements
> below prove *stability*, not *correctness* — the S7 judge flagged this explicitly and the owner
> spot-check cluster in the residuals is the mitigation.

- **S2b (kimi-code/k3, test-faithfulness review):** `leakDetected:null`, verdict CONVERGED.
  Independently re-derived the same load-bearing set and the nearest-wrong traps (permanent-CC
  every-hit refresh, every-hit dagger accrual, `durationSec`-vs-`durationShots`, distributed-flavored
  rider, `burstCast`-vs-`fullBurstEnter`). Reconciled the `durationShots:2` compensation as enactment
  (not a faithfulness divergence) and the treasure cadence; the driver adopted the reviewer's
  `mult.distributed===1` rider pin, the `rangeApplied===false` pin, and the cadence/hit-rate ⚑s.
- **S5 (kimi-code/k3, blind test):** `leakDetected:null`. Pristine run vs the driver override was RED
  — 6 of 7 active assertions red, **ALL from S5 harness-wiring artifacts** (`onEvent` placed at the
  CompOptions top level instead of `cfg`, so the event log is empty; `patchEffects` iterates
  `ov[slot].blocks` but OverrideFile slots are `Block[]`, so every counterfactual is a no-op). After a
  wiring-only repair (assertions untouched): 2 passed / 5 failed / 1 skipped — GREEN on the
  `hitCount:10` line and the non-vacuous inertness assertion (real convergence); the remaining reds
  are documented driver enactment choices (the `perResource` pools, `durationShots:2`) plus two test
  artifacts (a SimResult passed where an OverrideFile is expected; `unitSlug`-vs-`slug` on burstCast).
  Not a driver divergence.
- **S6 (kimi-code/k3, blind override):** `leakDetected:null`. Independently re-derived the SAME
  architecture — the `thiefsDagger` resource pool, the `resourceGate` + `requiresTargetStatus`
  consume, the `hitCount:10` block, the distributed burst nuke, and the identical verbatim skip of
  "Removes Calling Card". **Driver strictly ahead:** S6 missed the treasure every-30 Dagger grant
  (its consume fires every ~180 hits — 3× too slow), omitted the burst Fire vuln and max-ammo lines
  entirely, and declared the 12.86% burst-reset *unmodelable* where the driver modeled it exactly via
  a `distAmp` resource delta. S6 also kept a `defPct -32.19` block the engine silently discards — the
  silent-drop version the driver avoided. All blind-side misses are RECON_ERRORs corroborated against
  the prose.
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, discriminationOk:true.** 11/11 kit
  lines FAITHFUL or DOCUMENTED_GAP, zero silent drops. Four gotchas, all low-severity and all
  `documentedByDriver` (`durationShots:2` compensation; self-extending CC window; unmodeled
  "Removes Calling Card"; inert DEF▼ magnitude) — no REAL-GOTCHA. The judge independently ruled the
  S5 reds are predicate/wiring mismatches, not behavioural divergences, and named the same-model-blind
  spot as the residual the owner must spot-check (see below).

## Residual flags for owner

1. **⚑1 — self-extending Calling Card window (low).** The kit's "on a target NOT in the Calling Card
   state" application clause is modeled as a window that self-extends on every shot (`shotFired`
   refresh). Under continuous fire the real window lapses at 5s and the next hit re-applies it, so the
   real on-shot duty is ~98.3–100% at any magazine length; the collapse matches that (+1.7% on gated
   shots = <1% of total, estimate +0.8% of total) and correctly covers the post-burst 90-round
   magazine a fixed magazine-start phase mis-modeled badly (measured 0.798 duty on the drifted
   post-burst magazines — replaced). Recipe: a `requiresNotTargetStatus` gate modeling the discrete
   per-lapse re-application; Tier 2. A focus-video read of CC application cadence would pin the real
   duty.
2. **⚑2 — `durationShots:2` compensation (informational).** Authored 2 vs the kit's "for 1 round(s)"
   because of the engine-order off-by-one (shotFired blocks dispatch after the shot's damage; the
   round-count decrement runs right after, so a :1 budget is spent before any damage read sees it).
   The one load-bearing citation the owner should spot-check by inspection: **sim.ts:2913/2973**. The
   durable fix is an engine-order change (decrement the round-count budget after post-damage dispatch)
   then revert to `durationShots:1`; until then the documented ⚑2 stands.
3. **⚑3 — "Removes Calling Card" unmodeled (low).** No consume-target-status primitive exists
   (asuka-wille ⚑6 class); moot at the steady cadence because the natural 5s lapse pre-empts the next
   reapplication. Recipe: a `consumeTargetStatus` effect kind on the consume block (faithful
   representation; no number involved).
4. **⚑4 — Hit Rate core-fraction yield (derived).** The 25.75%/stack is kit-stated, but its damage
   YIELD flows through `sim.ts` `hrCoreMult` — a DERIVED reticle-shrink → core-fraction estimate (LIVE
   by default, `HRCORE=0` disables), not a measured per-unit number. Recipe: a phantom focus video
   reading the in-window core-hit fraction at 0 vs 3 dagger stacks.
5. **⚑5 — cadence tuple (datamine-unverified).** RoF 720 / reloadFrames 141 / ammo 60 are the
   datamine, unverified for this unit; the whole once-per-magazine consume cadence derives from the
   60-shot/5.0s magazine + 2.35s reload. Recipe: read fire cadence + the reload gap from any focus
   video before hand-tune.
6. **⚑6 — burst-reset ordering (low).** "Removed when using Burst Skill" is modeled as removed AFTER
   the burst's own distributed hit resolves (block order), so the casting burst enjoys the stacks it
   built; the alternative (pre-cast removal) would drop the nuke's distributed multiplier by up to
   38.58pp on each cast. Pinned by P7.
7. **Corroboration decorrelation + owner spot-check cluster.** Because all four blind roles ran
   kimi-code/k3 (single-model, same-family — see the corroboration section), the S7 judge ruled the
   blind agreements prove stability, not correctness, and named four residuals the driver's own suite
   cannot self-discharge: (1) the sim.ts:2913/2973 dispatch-ordering citation underwriting
   `durationShots:2` (⚑2); (2) the `perResource`/`resourceGate`/`distAmp`-reset machinery, validated
   only by the driver's own 25-assertion suite (no blind agent reproduced it); (3) the treasure-prose
   provenance of skill1 bullet 3 (the datamined `skill1_detail` carries only 3 bullets); and (4) the
   unverified ⚑5 cadence tuple. Recommended mitigation: a phantom focus video checking the consume
   cadence (one per magazine, treasure-driven), the hit-rate core-fraction yield, and the post-burst
   extended-magazine Attack Damage duty.
