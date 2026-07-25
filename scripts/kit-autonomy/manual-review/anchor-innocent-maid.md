# Manual Review — anchor-innocent-maid (Anchor: Innocent Maid)

**Date:** 2026-07-24
**Verdict:** GO (cross-family corroborated) ✓
**Faithfulness:** 1.0
**Tier:** 2 (escalating FB-count-gated, fullBurstEnter/End triggers, healer-supporter)
**Gauntlet driver:** Qwen
**Cross-family:** S2b claude-fable-5 ✓ | S5/S6/S7 claude-opus-5 ✓ (succeeded on retry — see Flags #1)
**Binding judge (S7, claude-opus-5):** GO · faithfulness 1.0 · convergence GREEN · discriminationOk · 0 silent-drops · 0 gotchas

---

## Kit Summary

RL / Supporter / Water / Burst II, cd 40s, ammo 6, chargeFrames 60.

Healer-supporter with escalating S1 (fullBurstEnter) and S2 (fullBurstEnd), plus a burst that heals and buffs team ATK. Her value is team buffs + heal events, not personal damage. No HP-scaling damage conversion anywhere — every Max HP reference is heal-magnitude/defensive. Her offensive contribution is entirely indirect: the two caster-ATK flat adds, the distributed-damage rider, the hit-rate core lift, and the reload-speed shot-count gain.

---

## Line Dispositions

### FAITHFUL (7 lines)

| Line                                              | Encoding                        | Trigger                           | Notes                                                                                         |
| ------------------------------------------------- | ------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------- |
| S1 tier2: Distributed Damage ▲ 30.4% / 10s        | `distributedDamagePct 30.4/10s` | fullBurstEnter, escalating step 2 | Fires from FB2 onward. Counterfactual: attackDamagePct → different totals.                    |
| S1 block B: Recovers 3.04% Max HP every 1s for 8s | `heal ticks:8 intervalSec:1`    | fullBurstEnter                    | 8 recovery events per FB. Same-squad gate modeled always-satisfied (⚑).                       |
| S2 tier1: Hit Rate ▲ 10.13% / 10s                 | `hitRatePct 10.13/10s`          | fullBurstEnd, escalating step 1   | Fires from FB1-end. HR→core-rate magnitude ⚑ (engine-global).                                 |
| S2 tier2: ATK ▲ 35.02% of caster ATK / 10s        | `casterAtkPct 35.02/10s`        | fullBurstEnd, escalating step 2   | Flat add of HER Supporter ATK. Fires from FB2-end. Counterfactual: atkPct → different totals. |
| S2 tier3: Reload Speed ▲ 40.04% / 15s             | `reloadSpeedPct 40.04/15s`      | fullBurstEnd, escalating step 3   | Fires from FB3-end. Damage (shot-count gate), not defensive.                                  |
| Burst: Recovers 40.18% Max HP as HP               | `heal` (instant)                | burstCast                         | Recovery event at burstCast frame (before FB opens).                                          |
| Burst: ATK ▲ 30.09% of caster ATK / 10s           | `casterAtkPct 30.09/10s`        | burstCast                         | Flat add of HER Supporter ATK. Counterfactual: atkPct → different totals.                     |

### UNMODELED / DOCUMENTED-GAP (4 lines)

| Line                                  | Reason                                                                                                                                                                                                     |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1 tier1: Potency of HP ▲ 30.96% / 5s | No engine StatKey for heal potency. Value-0 attackDamagePct placeholder preserves escalating tier order. Inert. (S6 blind used a targetMaxHpPct 30.96 placeholder — both inert, both preserve tier order.) |
| S1 tier3: Stack count of debuffs ▼ 1  | Debuff cleanse; partless scope-lock boss applies no modeled debuffs. Genuinely skippable class.                                                                                                            |
| S1 block B: same-squad gate           | Gate modeled always-satisfied (⚑); squad membership not in data. S6 blind chose a teamHas-gated default. Documented modeling choice, not a silent drop.                                                    |
| Burst: Storage (60.19% Max HP, 25s)   | Defensive overheal buffer; no engine vocabulary. Deliberately NOT a shield event (would falsely fire shield-synergy triggers).                                                                             |

---

## Cross-Family Corroboration (claude-opus-5, S5/S6/S7)

- **S5 blind test (opus):** independent kit-spec test written from the prose alone (leakDetected null). Run UNMODIFIED vs the driver override it is 4 passed / 13 failed / 3 skipped — **every red is a blind-side harness/fixture plumbing assumption the blind writer could not verify** (it walked a flat `o.blocks` array vs the real `skill1/skill2/burst` grouping; read the per-slug `totals()` map as a scalar; paired buffApply with a buffRemove the engine never emits on time-expiry; filtered burstCast/casterAtkPct on fields the events don't carry; and used a fixture where crown wins the shared B2 slot so anchor never bursts — a failure the blind writer pre-labelled "a real fixture finding, not a defect in the override"). With those 8 plumbing points corrected (pristine preserved verbatim, kit reading untouched → `blind/anchor-innocent-maid.adapted.test.ts`), the blind test is **17 passed / 3 skipped / 0 failed = GREEN** vs the driver override. The blind's spec table converges with the driver on every line.
- **S6 blind override (opus):** independent prose→override (leakDetected null) **byte-identical to the driver on every load-bearing block** — distributedDamagePct 30.4/10s, heal ticks:8 intervalSec:1, hitRatePct 10.13/10s, casterAtkPct 35.02/10s (not atkPct), reloadSpeedPct 40.04/15s (modeled as damage, not skipped), burst casterAtkPct 30.09/10s on burstCast (not atkPct), burst heal to allies, unmodeled {debuff cleanse, Storage}. Two DOCUMENTED_GAP divergences only (Potency-of-HP placeholder stat; same-squad gate default), both ⚑-flagged.
- **S7 binding judge (opus):** GO, faithfulness 1.0, convergence GREEN, discrimination OK, 0 silent-drops, 0 gotchas. SKIPPED↔unmodeled 1:1; fire-rate check passes on every FAITHFUL block.

---

## Flags (⚑)

1. **CROSS-FAMILY CORROBORATED ON RETRY** — the prior same-model-only verdict (faithfulness 0.92) was an artifact of the claude-opus-5 S5/S6/S7 dispatch being aborted prematurely (mislabeled "timeout"). Re-run 2026-07-24 with adequate timeouts: opus completed S5/S6/S7 cleanly and the binding judge returned GO (faithfulness 1.0). Verdict upgraded to GO (cross-family corroborated).

2. **SAME-SQUAD GATE** — S1 block B heal gate modeled as always-satisfied. If it requires a lore-squad teammate (squad membership not in data), recovery events over-fire in non-squad teams. Impact: recovery-consumer uptime only. **Recipe:** run team with no suspected squadmate, check for green heal popups after FB entry. (Both opus blinds independently flagged this; the blind override chose a gated/under-credit default, the driver chose ungated/over-credit.)

3. **HIT-RATE → CORE-RATE MAGNITUDE** — hitRatePct LIVE since CONE_DELTA (2026-07-19) for AR/SMG/SG recipients via acrForHR; in-game core-rate lift unmeasured. **Recipe:** HR-buff-on vs off core fraction on a focused DPS carrier.

4. **CADENCE TUPLE** — pullsPerSec / reloadFrames 141 / bolt-gap-vs-autofire are unverified datamine values. **Recipe:** rounds/min + reload gap from any focus video.

5. **S1 HEAL CADENCE** — 8 recovery events/FB modeled (ticks:8 intervalSec:1). Same-squad gate approximation may over-fire in non-squad teams.

6. **SAME-MODEL RESIDUAL (binding judge)** — the S5/S6 blinds were BOTH claude-opus-5 while the pre-op review was claude-fable-5, so the two converging encodings share a family prior on (a) the casterAtkPct-vs-atkPct reading and (b) treating Potency-of-HP as an inert step-1 placeholder. Owner spot-check: whether a heal-potency StatKey should be introduced rather than placeheld, and the same-squad gate default.

---

## Verification

- **Driver test:** `scripts/tests/units/anchor-innocent-maid.test.ts` — 21/21 GREEN
- **Blind test (pristine, opus):** `scripts/kit-autonomy/blind/anchor-innocent-maid.test.ts` — 4 passed / 13 failed / 3 skipped (13 reds = blind-side plumbing RECON_ERROR; see judge packet §7)
- **Blind test (adapted, opus):** `scripts/kit-autonomy/blind/anchor-innocent-maid.adapted.test.ts` — 17/17 GREEN (3 skipped UNMODELED); pristine preserved, only 8 harness/fixture plumbing points corrected
- **Blind override (opus):** `scripts/kit-autonomy/blind/anchor-innocent-maid.override.json` — converged on all load-bearing blocks
- **S2b review:** `scripts/kit-autonomy/reviews/anchor-innocent-maid.test-review.json` — claude-fable-5, all lines accounted for, no REAL-GOTCHA
- **Judge packet:** `scripts/kit-autonomy/results/anchor-innocent-maid-judge-packet.md` — self-contained S7 packet
- **Binding judge:** `scripts/kit-autonomy/cross-family/anchor-innocent-maid/s7-result.json` — claude-opus-5, GO faithfulness 1.0 (gitignored dispatch artifact)
- **Verify:** `scripts/kit-autonomy/reviews/anchor-innocent-maid.verify.txt` — 21/21 GREEN
- **validate-overrides:** ✓ anchor-innocent-maid: valid | dmg 28.5M (8.1%) bursts 5

---

## Spot-Check Cluster (for owner review)

- [ ] Confirm same-squad gate semantics: does the 3.04%/s regen fire in a team with NO suspected squadmate?
- [ ] Confirm hitRatePct → core-rate magnitude on a focused DPS carrier (AR/SMG/SG)
- [ ] Confirm cadence tuple (reloadFrames 141, bolt-gap) from a focus video
- [ ] Confirm escalating tier timing: distributedDamagePct from FB2, casterAtkPct S2 from FB2-end, reloadSpeedPct from FB3-end
- [ ] (Same-model residual) Decide whether Potency-of-HP warrants a heal-potency StatKey rather than an inert placeholder
