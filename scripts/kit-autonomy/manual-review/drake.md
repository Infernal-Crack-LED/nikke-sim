# drake — Kit-Autonomy Gauntlet Manual Review

**Date:** 2026-07-25
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (scoped-buff alliesOfWeapon, fullBurstEnter-vs-burstCast split, maxAmmo weapon-state)

## Kit summary

Drake (SG/Attacker/Fire/Burst III, treasure) — a Fire SG attacker whose kit keys off the team's Full Burst. S1 is a dual-leg FB-enter aura: all allies get Hit Rate 20.09% + ATK 11.85%, and SG allies additionally get ATK 63.88% + Max Ammo 50.14%. S2 is two independent normal-attack-count riders (98.55% every 10 pulls, 201.6% every 5 pulls). Burst is a 3009.6% nuke + self Max Ammo 72.18% + Attack Damage 31.68% for 10s.

## What was verified

- All 9 kit lines FAITHFUL (driver, S2b fable reviewer, S5/S6 opus blind, S7 opus judge — all converge)
- Trigger split: S1 fullBurstEnter (fires on every team FB incl. helm co-B3 rotations) vs burst self-buffs burstCast-only (drake's own casts only) — discriminated by the co-B3 helm fixture
- SG-only scoping: alliesOfWeapon SG targets only drake in the control comp (liter SMG / crown MG / helm SR) — counterfactual proves the filter is authored, not an engine no-op
- Pull-vs-pellet hitCount: driver uses 100/50 (pellet-counter semantics, engine increments by hitsPerShot=10 per pull), anchored by brid-silent-track same-chassis measurement (43 riders = floor(215 pulls/5) EXACT). S6 blind used 10/5 (rounds directly) — resolves in driver's favor
- Burst nuke FB-exemption: cast lands before FB window opens, never takes +50% major (engine cast-instant rule)
- Ammo lines are damage-relevant (gate shots fired on 9-round mag with 111-frame reload)

## Cross-family convergence

| Stage | Model | Result |
|-------|-------|--------|
| S2b (test review) | claude-fable-5 | All 9 FAITHFUL, convergent |
| S5 (blind test) | claude-opus-5 | 12/15 pass; 3 RED = null-vs-undefined durationShots API artifact |
| S6 (blind override) | claude-opus-5 | Structure identical; hitCount 10/5 vs driver 100/50 (RECON_ERROR, resolves for driver) |
| S7 (judge) | claude-opus-5 | GO, faithfulness 1.0, no REAL-GOTCHA, discrimination ok |

## Residual spot-check cluster (owner)

1. **Burst nuke FB-exemption assertion gap:** Driver D7 asserts count + magnitude but not `fbMajorApplied === false`. S5's `inFullBurst === false` check may be the unlocalized third RED. Engine policy is corroborated by SSOT §8, but a green assertion would close the gap.
2. **Note staleness (documentation only):** Override note still narrates pre-treasure values in three places (hitRatePct 11.85 → shipped 20.09; flatDamage 1254 → shipped 3009.6; "ALL FIVE kit lines" → there are nine). ⚑4's magazine arithmetic omits skill1's co-live +50.14 (reads 15, should be ~20 on drake's own rotations).
3. **hitRatePct → core-rate magnitude:** The in-game magnitude of the core-hit-rate lift is unmeasured (⚑3). The buff fires and is live via acrForHR, but its damage contribution is a measured-only quantity.
4. **Pull-vs-pellet per-unit confirmation:** The hitCount 100/50 reading is anchored by brid-silent-track (same chassis), not by a drake-specific measurement. A drake focus video counting trigger pulls between 98.55% popups would close this.
