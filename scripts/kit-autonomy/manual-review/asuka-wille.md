# Kit-autonomy gauntlet — `asuka-wille` (Asuka: WILLE)

**Date:** 2026-07-24 · **Verdict:** GO (cross-family corroborated) · **Faithfulness:** 0.95 · **Tier:** 2

MG / Attacker / Wind / Burst III, ammo 300 / reloadFrames 161. **Distinct from base `asuka` (AR/Fire).**
Approved nicknames: `aw`, `wasuka`.

## What the kit does (judge kitDescription)

Asuka: WILLE is a Wind MG Burst III attacker built around a 9-second self mode called **Annihilation
State** that only her own burst opens. Casting the burst trades away 40% of her normal-attack damage in
exchange for +46.8% ATK (off her own base ATK), +36% attack damage, and an instant 21% magazine top-up;
if the team enters Full Burst while she is in that state she gains a further +30.97% attack damage for
10s. While the state is live, every 10 rounds she fires also strike the two enemies nearest her crosshair
for a small extra hit and apply **Anti A.T. Field**, a stacking Damage-Taken debuff (0.83%/stack, to 30)
that amplifies the WHOLE team's damage. Independently, every 50 landed rounds trigger a large 471.86%
bonus hit. When the state ends she fires **Annihilation** at every target carrying Anti A.T. Field for
6.62% per mirrored stack and the debuff is then consumed; that same moment triggers **Emergency Repair**
(belt emptied, 3.77% Max HP/s for 3s, next reload fixed 60% faster, MG spin-up cost briefly removed).

## Gauntlet fixes (all engine-supported; cross-family corroborated)

The shipped parser-baseline was substantially hand-authored but carried one structural faithfulness bug
plus several timing proxies. The gauntlet fixed:

1. **Anti A.T. Field consumption (the headline fix).** The finisher prose says the status *"is removed
   after the effect is triggered"* — the debuff is consumed at Annihilation-State end (~cast+9s), so its
   real life is the ~9s build window each 40s cycle, **not** the near-permanent 30-stack boss debuff the
   baseline shipped. The baseline over-credited the whole team's damage by ~3–4× on average
   (team sum **1979M → 1837M** after the fix). Now modeled faithfully: the burst inflicts
   `targetStatus 'Annihilation State'` 9s (the engine has no *self*-status gate, so the mode is proxied as
   a boss status per the marciana/privaty `requiresTargetStatus` pattern); the S1 proc carries
   `requiresTargetStatus 'Annihilation State'` at `hitCount 10` (every 10 in-window shots, replacing the
   ungated `hitCount 44` time-average); debuff `durationSec 9` (effective = consumed, not the nominal 30s).
   Independently derived by S2b (fable) and S6 (opus); the judge noted S5's 30s-literal assertion is
   "outvoted 2-1 by the other derivations."
2. **S2 FB-entry Attack Damage 30.97%:** `fullBurstEnter` + `ownBurstGate:'cast'` (was `burstCast`) — the
   purpose-built primitive for "entering FB after her own burst"; keeps the block AT FB entry. Converged with S6.
3. **Emergency Repair trigger:** `fullBurstEnd` + `ownBurstGate:'cast'` (was `burstCast`) — FB end ≈
   Annihilation-State end (~cast+9s, ~1s late vs the prior 9s-early). Converged with S6.
4. **"Removes 100% of ammo" now modeled** as `consumeAmmo fraction:1` at `fullBurstEnd` (the engine HAS
   `consumeAmmo` — the prior "no ammo-dump vocabulary" note was **wrong**; at fullBurstEnd it lands ~10s
   after the burst's `instantReload 0.21`, so no collision). Converged with S6.
5. **Heal `ticks:1 → ticks:3` / `intervalSec:1`** (prose "every 1s over 3s"). Damage-INERT (self-targeted;
   asuka-wille has no recovery block — verified removing it moves no total). Converged with S6.
6. **Annihilation finisher `delaySec:9`** — lands at state-end inside the FB window → FB-boosted (the
   hand-slot F2 finding, now modeled), 198.6% (6.62×30 cap).

## Documented gaps / residuals (⚑, all with estimate + recipe + tier)

- **⚑1** MG cadence tuple (wind-up ladder / 300 ammo / reloadFrames 161) is unverified datamine — read
  rounds/min + reload gap from a focus video.
- **⚑2** S2 Eff1 "MG heating-up speed ▼100% / 3s" UNMODELED — no wind-up primitive; ambiguous localization
  (frozen ramp vs instant full spin).
- **⚑3** S2 Eff4 "reload speed fixed +60% for 1 rounds" is a stat CLAMP the engine cannot express
  (types.ts: explicitly NOT `durationShots`) → 10.5s window proxy. (Both blind agents used `durationShots:1`;
  the judge could not adjudicate without types.ts and left it documented.)
- **⚑4/⚑5** Finisher live-stack mirror — no dynamic-stack-scale primitive; 198.6% (30-cap) is a documented
  proxy. S6 assumed 10 stacks (66.2%) from a ~12 rounds/s prior — a 3× disagreement only an ammo-counter
  read off footage can settle. The driver's test does show stacks hitting the 30 cap (internally consistent).
- **⚑6** Anti A.T. Field instant-consumption — no remove-target-buff primitive; the debuff expires gradually
  (9s/stack) leaving a short post-window tail (~34% vs true ~22.5% uptime; team amp over-credited ≤~1.5× in
  that tail). Recipe: add a `consumeTargetStatus`/removeTargetBuff effect keyed to the finisher. Tier 2.
- **⚑7** Ammo dump damage content is the forced fast reload (covered by the reloadSpeedPct window); the dump
  itself is ~timing-neutral.

## Judge gotchas (5: 1 med + 4 low) — disposition

1. **(med) Stale test docblock** — FIXED: the unit-test header was rewritten to document the final encoding.
2. **(low, documented)** reloadSpeedPct 10.5s window vs `durationShots:1` — see ⚑3.
3. **(low)** Annihilation-State self-mode proxied as a boss `targetStatus` is a name-keyed side channel —
   caveat ADDED (no in-scope unit reads it; a `requiresOwnBuff` primitive would replace the proxy).
4. **(low)** Finisher "afflicted with Anti A.T. Field" precondition not separately gated — caveat ADDED
   (single v1 boss always carries the debuff in-window; implicitly satisfied).
5. **(low, documented)** Annihilation-State end modeled on two clocks (`delaySec:9` finisher vs `fullBurstEnd`
   Emergency Repair, ~1s apart) — the closest available proxies for the one in-game instant.

## Cross-family provenance

- **S2b** (claude-fable-5, pre-op test-faithfulness review): 12 load-bearing lines; independently flagged the
  consumption over-credit, the missing self-status gate, and the unmodelable MG heat.
- **S5** (claude-opus-5, blind test): 19 pass / 8 fail / 4 skip vs the driver override. Every KEY
  discrimination passes (S1b gating, S2a ownBurstGate, S2b 3-tick heal, burst −40% scoping, finisher
  delaySec:9 + 6.62×stacks). The 8 fails are shim/proxy divergences the judge classified as non-defects
  (3 field-name shims were driver-fixed exactly as the blind author invited: `ov.blocks`/`slotOfUnit`/`srcOf`).
- **S6** (claude-opus-5, blind override): converged on fullBurstEnter+ownBurstGate, fullBurstEnd, consumeAmmo,
  heal ticks:3, delaySec:9, and the 30s→9s debuff truncation — all adopted by the driver.
- **S7** (claude-opus-5, binding judge): **GO**, faithfulness 0.95, discrimination OK.

## Same-model residual for the owner to spot-check

All five agents in this gauntlet are one model family, so convergence proves stability, not correctness. The
two places that matter most: **(a)** the finisher's 6.62×30 magnitude rests on the engine's MG cadence
producing ≥300 in-window rounds (S6's 10-stack read is a 3× disagreement — settle with an ammo-counter read off
footage); **(b)** the heal's activation surfaces no SimEvent, so both suites pin it structurally only, and S2b's
expectation that crown consumes her recovery events is **not** borne out in the sim (the heal is self-targeted
and damage-inert). The unit remains MODEL_ONLY (never fielded) — the measurement banner is retained.

## Artifacts

- Override: `src/skills/overrides/asuka-wille.json`
- Driver test: `scripts/tests/units/asuka-wille.test.ts` (27 assertions, all green)
- Blind test: `scripts/kit-autonomy/blind/asuka-wille.test.ts` (shim-fixed; 19/8/4 vs driver override)
- Blind override: `scripts/kit-autonomy/blind/asuka-wille.override.json`
- Packets/results: `scripts/kit-autonomy/cross-family/asuka-wille/`, `scripts/kit-autonomy/results/asuka-wille.json`
- Verify: `scripts/kit-autonomy/reviews/asuka-wille.verify.txt`
