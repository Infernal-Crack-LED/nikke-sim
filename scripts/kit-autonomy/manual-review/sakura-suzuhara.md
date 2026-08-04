# Manual review — sakura-suzuhara (Sakura Suzuhara)

**Gauntlet date:** 2026-08-04
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (round-count `hitCount:120` trigger; enemy-debuff duration window; `burstCast`-vs-`fullBurstEnter` identity)

> Slug disambiguation: `sakura-suzuhara` is Sakura Suzuhara (SMG/Water/Supporter/Burst I, cd 40s).
> NOT base `sakura` (SR/Fire) and NOT `sakura-bloom-in-summer` (AR/Wind, "sbis") — distinct units,
> lint-disambiguated (the lint's bare-"Sakura" detector fires on the space/hyphen forms; the
> colon-form full name passes clean).

## Kit summary

Sakura Suzuhara is a Water SMG Supporter on Burst I with **no damage lines of her own**. Her entire
offensive contribution is a recurring boss debuff: after landing 120 normal attacks (exactly one of
her 120-round magazines), the boss takes ▲17.18% increased damage for 5s — refreshing once per mag
cycle (~6.35s: 5.0s dump at 1440rpm + 81f reload), so ~79% uptime. Her Skill 2 is pure sustain:
every 60 hits she boosts incoming healing on the 2 lowest-HP allies (▲15.18%/10s), and every 120
hits she cuts the damage those 2 allies take (▼14.97%/10s). Her Burst I heals the 2 lowest-HP
allies for 10.03% of her final Max HP every 1s for 10s. In the v1 damage sim: S1 is the only
damage-moving line (boss Taken bucket); the burst heal is modeled as a recovery-EVENT cadence that
drives teammate on-recovery consumers (no HP amount exists in v1); both skill2 lines are UNMODELED
(no healing-received stat; no ally HP pool / incoming damage).

## Line-by-line

| Line                                                                 | Disposition      | Notes                                                                                                                                          |
| -------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| S1: 120 hits → target Damage Taken ▲17.18% / 5s                      | FAITHFUL         | `hitCount:120 → enemy → damageTakenPct` (boss Taken bucket, SSOT §1g); cadence-pinned `count === floor(shots/120)`, 300-frame expiry, team-total lift vs removed, passive-CF discrimination |
| S2: 60 hits → 2 lowest-HP allies Incoming healing ▲15.18% / 10s      | DOCUMENTED_GAP   | UNMODELED verbatim — no healing-received StatKey; heal effects carry no HP amount, so the amplifier multiplies nothing; nearest-wrong (heal-effect spam feeding recovery consumers) explicitly rejected + negative-pinned |
| S2: 120 hits → 2 lowest-HP allies Damage Taken ▼14.97% / 10s         | DOCUMENTED_GAP   | UNMODELED verbatim + ⚑ engine-core/out-of-domain (noise precedent): no ally HP pool / incoming damage; the boss-facing damageTakenPct channel is the wrong direction — encoding ±14.97 would manufacture a phantom team damage change on the SAME 120-hit frame as S1; negative-pinned (no ally-held damageTakenPct, nothing from the skill2 slot) |
| Burst: 2 lowest-HP allies recover 10.03% final Max HP /1s × 10s      | FAITHFUL         | `burstCast → alliesLowestHp:2 → heal ticks:10 intervalSec:1` (helm-H2 "a heal is an event" precedent); magnitude inherently unmodeled (no HP pool); 10 ticks × 1s pinned per cast; burstCast-vs-fullBurstEnter proven under B1 contention vs liter (her heal fires on broken-chain casts too; zero stream on liter-opened FBs) |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. 4/4 lines converged with
  identical dispositions and the same load-bearing set (S1 debuff + burst recovery stream). Reviewer
  caught a REAL harness detail the driver got wrong: enemy-buff `buffApply` events carry
  `casterIdx:null` (the enemy `applyBuff` call passes none) — owner attribution rides on the buff
  `key`; the driver's filter was fixed to match. Also flagged the twin-"Damage Taken" conflation
  trap (both S1 and S2b proc on the same 120-hit frame — pinned by value+count) and requested the
  burstCast-vs-fullBurstEnter contention arm (added).
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Written from prose alone; same fixture
  insight (crown's recovery trigger is the only damage-visible heal consumer at scope lock) and the
  same UNMODELED reads (3 `it.skip` GAPs). As-authored vs driver override: 14 pass / 3 skip / 2
  fail — the 2 failures were **blind-fixture masking, not divergence**: the blind author used
  `controlComp` (with helm), whose constant full-charge team heal saturates crown's on-recovery
  consumer in BOTH arms (byte-identical totals with/without sakura's heal — the helm.test.ts H8
  isolation problem). Documented isolation adaptation (strip helm S1+burst heals and crown's
  hitCount-860 self-heal; NO assertion weakened) in `blind/sakura-suzuhara.adapted.test.ts`:
  **16 pass / 3 skip — GREEN**.
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. Reproduces the driver override
  **line-for-line**: identical skill1 block (hitCount 120 / enemy / 17.18 / 5s), identical burst
  block (burstCast / alliesLowestHp 2 / heal ticks 10 intervalSec 1), empty skill2 with the same
  two lines unmodeled verbatim. Two flags carried — hitCount fired-vs-landed semantics and the
  always-⚑ SMG cadence tuple — both reconciled into override caveats with estimate/recipe/tier
  (no encoding change; the engine counts fired rounds × hitsPerShot, sim.ts:3782 — the repo
  convention for "landing N normal attacks").
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, discriminationOk:true, gotchas:[]**.
  All 4 lines accounted (2 FAITHFUL + 2 DOCUMENTED_GAP), no REAL-GOTCHA. Judge verified the Taken-
  bucket routing against SSOT §1g, the hitCount-vs-lastBullet trigger identity, the B1-contention
  proof of burstCast identity, and ruled the S5 as-authored failures a blind-fixture recon artifact.
  Judge's named residuals for the owner: hitCount fired-vs-landed semantics and the SMG cadence
  tuple (both scale her entire contribution 1:1 — flagged with recipes in the override caveats).

## Residual flags (spot-check cluster)

1. **hitCount fired-vs-landed** (⚑ medium): the engine accrues fired rounds; in-game SMG spread may
   lag the real activation → debuff duty cycle slightly over-credited. Recipe: focus-record the
   interval between Damage-Taken-▲ applications vs magazine boundaries.
2. **SMG cadence tuple** (always-⚑): engine-default 1440rpm on 60fps frame boundaries, reload 81f —
   propagates 1:1 into both hit-count trigger cadences.
3. **alliesLowestHp leftmost-2 stand-in** (⚑ low): v1 has no HP pool; the heal targets the leftmost
   2 allies instead of the truly lowest-HP 2 — only moves comps that stack a recovery consumer.
4. **Untuned**: tier stays MODEL_ONLY, tuned:false — the gauntlet certifies structure, not
   magnitudes; no real-fight recording exists for this unit.
