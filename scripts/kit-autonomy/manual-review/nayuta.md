# nayuta — kit manual review

> **Per-unit manual-review doc** (kit-autonomy gauntlet, 2026-07-25). The owner's short-form review: what the
> sim implements alongside the real kit, the driver's executive summary, verdict, and the lines worth a human
> spot-check.

**Unit:** Nayuta (`nayuta`, "nayu") — Wind · SMG · Supporter · Burst II · 20s CD · ammo 120 · reloadFrames 111 ·
chargeFrames 0 · hitsPerShot 1 · normalAttackMultiplier 8.73 · coreAttackMultiplier 200 · Pilgrim.

**Verdict:** 🟢 **GO (cross-family corroborated)** · faithfulness **1.0** (8 FAITHFUL, 7 DOCUMENTED_GAP) ·
**0 silent drops, 0 REAL-GOTCHA** · 2 low-severity gotchas (a measurement-gated FIDELITY ⚑ on chargeTimeSec, and a
documentation-hygiene note rewrite that was fixed in-gauntlet) · S2b claude-fable-5, S5/S6/S7 claude-opus-5 (all
cross-family) converged on every load-bearing line. Both blind families independently re-derived the 530.46
per-full-charge rider fold, the casterAtkPct (not atkPct) ally ATK share, the burstCast (not fullBurstEnter)
triggering, the swap-state gate on the riders, and the time-average factors for the stack-gate ramp.

---

## 1. Real kit (data/characters.json — ground truth, level-10 values)

- **S1 (Hypocrisy)**
  - ■ Activates at the start of battle. Affects self. — Unchanging Heart: Gain Indomitability for 9 sec. Activates 1 time(s) during battle.
  - ■ Activates when Memory Absorption takes effect. Affects all allies. — Damage dealt when attacking core ▲ 25.15% for 5 sec; ATK ▲ 30.16% of the skill user's ATK for 5 sec; Equally shares HP recovery for 5 sec.
  - ■ Activates when Memory Absorption takes effect. Affects self. — Recovers 25% of the skill user's final Max HP as HP.
  - ■ Activates when attacking with Full Charge while in Memory Incineration status. Affects all enemies. — Deals 150% of final ATK as damage.
  - ■ Affects the enemy if the enemy is the stage target. — Deals 380.46% of final ATK as additional damage.
- **S2 (Impermanence)**
  - ■ Activates every 3 sec. Affects self. — Memory Absorption: Hit Rate ▲ 1.4%, stacks up to 30 time(s), immune to stack-count change, cannot be removed.
  - ■ Activates when Memory Absorption takes effect. Affects self. — Effects vary by stack count (each stage triggers all before it): Stage 1 (≥2 stacks) ATK ▲ 15.2%; Stage 2 (≥10 stacks) Attack Damage ▲ 20.27%; Stage 3 (≥30 stacks) damage dealt when attacking core ▲ 21.05% — all continuously.
- **Burst (Asceticism)**
  - ■ Affects all allies. — Attack Damage ▲ 35.45% for 15 sec.
  - ■ Affects all enemies. — Deals 645.33% of final ATK as Burst Skill damage.
  - ■ Affects self. — Memory Incineration: changes the weapon in use — Charge time fixed at 1.8 sec, Damage 275.18% of final ATK, Full Charge Damage 250% of Damage, Duration 10 sec; Additional Effect: Unlimited ammunition for 10 sec.

---

## 2. What the code does (override + blind re-derivations)

**skill1**

- `passive` → `allies` → `coreDamagePct 25.15` + `casterAtkPct 30.16`. The kit's 5s window is refreshed every 3s
  (each Memory Absorption tick), so it is continuously up after t≈3s; the override folds it to a permanent passive
  (over-credits only the opening ~3s, <2% of the fight — residual **R5**). `casterAtkPct` resolves to a FLAT add of
  Nayuta's own ATK (0.3016 × staticAtk ≈ 30.3k), identical for every ally — both blinds independently rejected the
  `atkPct` (target-scaled) misread.
- `burstCast` → `self` → `extraHitDamagePct 530.46` for 10s. This is the **fold** of the 150% full-screen full-charge
  hit + the 380.46% stage-target rider into one per-full-charge rider (150 + 380.46 = 530.46). The engine emits one
  530.46% hit per swapped full charge (probe: 44 rider hits == 44 swap shots). The 380.46% ■ has no activation clause
  of its own — it refines the TARGET of the preceding full-charge trigger, and the scope-lock boss IS the stage
  target, so it is unconditionally live. **This is the tier-audit reading, cross-family corroborated** (S2b fable:
  "count of 380.46 === count of 150, frame-coincident, total 530.46"; S6 opus re-derived the same fold). Residual
  **R1** records the genuine ambiguity (one-time-per-burst alternative) with an estimate + popup recipe.
- UNMODELED (defensive, verbatim): Indomitability (survival), Equally shares HP recovery (no HP pool / no redistribution primitive), Recovers 25% final Max HP (self-heal, no HP pool; self-only so no teammate on-recovery consumer fires).

**skill2**

- `passive` → `self` → `atkPct 14.4` + `attackDamagePct 16.8` + `coreDamagePct 10.5`. These are the three stack-gated
  stage buffs (kit 15.2 / 20.27 / 21.05) **time-averaged over the ramp**: stacks accrue +1/3s to 30, so stage 1/2/3
  go live at ≈9s/30s/90s of a 180s fight → 15.2×171/180=14.4, 20.27×150/180=16.8, 21.05×90/180=10.5. The engine has no
  stack-gauge primitive, so the ramp is inexpressible as a threshold gate; the time-average preserves the 180s integral
  (e.g. 14.4×180=2592 vs 15.2×171=2599 buff-sec, 0.3% apart). The S6 opus blind **independently derived the same
  factors** ("time-average ≈ 100% stage1, ~83% stage2, ~50% stage3"). Residual **R4**. The self 10.5 core line is kept
  SEPARATE from S1's ally 25.15 core line (distinct slot/key/target — the conflation S2b warned about did NOT happen).
- UNMODELED (measurement-gated, verbatim): Memory Absorption Hit Rate ▲ 1.4%/stack (42% at cap). `hitRatePct` feeds
  her SMG core rate via the engine-global HR→core conversion (acrForHR/hrCoreMult), whose slope is measured-only;
  encoding +42% HR would inject an unmeasured damage contribution. Both blind families agree the HR→core lift is "a
  derived engine relationship, never stated in kit text" — they differ only on encode-anyway vs withhold. Withholding
  with a structured residual is the conservative MEASURED>FUDGE call (it under-credits her). Residual **R3**.

**burst**

- `burstCast` → `allies` → `attackDamagePct 35.45` for 15s (probe: 48 applies = 12 casts × 4 allies, expDelta 900).
  Keyed `burstCast` (not `fullBurstEnter`) — the canonical over-credit is excluded; the driver fixture makes Nayuta the
  sole B2 so the line is exercised on all 12 Full Bursts (not vacuous).
- `burstCast` → `enemy` → `flatDamage atkPct 645.33` (burst bucket, once per cast, `fbMajorApplied` never true — the
  cast lands before the FB window opens).
- `burstCast` → `self` → `weaponSwap {damagePct 275.18, chargeTimeSec 2.13, chargeMultPct 250, weapon:'SR', durationSec 10}`
  - `unlimitedAmmo {durationSec 10}`. Memory Incineration swaps her to an SR charge weapon: normal-bucket shots become
    275.18% × 250% full-charge (charge mult 2.5 ≈ 687.95%/shot) for 10s, base SMG halts. `weapon:'SR'` is the landed
    2026-07-17 SWAP-CLASS FIX (SR range-banding + HI auto-core in midfar/far; board 0.658→0.894) — a measured basis the
    blinds lacked (they left `weapon` unset per kit silence). `chargeMultPct 250` is read multiplicatively (×2.5), not
    additive. Residual **R2**: `chargeTimeSec 2.13` vs the kit's stated 1.8 — the 1.8s kit charge + ~0.5s SR bolt-recovery
    cycle folded in (swaps are exempt from the engine's auto bolt-recovery; same correction validated on helm/velvet).

---

## 3. Executive summary

Nayuta is a Tier-2 Supporter whose personal damage is dominated by the Memory Incineration swap-window full charges
and their 530.46% rider (~87% of her total), with a team Attack Damage aura, a 645.33% nuke, and three stack-gated
self buffs. The override is **mature and was already tier-audited**; the gauntlet **certified** it rather than changing
its damage (no encoding edit was needed — all 9 driver kit pins are GREEN vs shipped, and the board position is
unchanged). Cross-family corroboration is unusually strong: claude-fable-5 (S2b) and claude-opus-5 (S5/S6) both
independently landed on the four highest-risk readings — casterAtkPct-not-atkPct, the per-full-charge 530.46 fold,
burstCast-not-fullBurstEnter, and the swap-state gate on the riders.

The S5 blind test ran **RED** vs the driver override (7 pass / 16 fail / 3 skip), but the binding judge classified
every red as benign: **5** cascade from a blind-fixture defect (the blind picked `controlComp('nayuta',true)`, putting
Nayuta alongside crown — two Burst-IIs — so Nayuta was starved of casts and every burst-dependent assertion failed for
want of a burst, not want of an encoding; the blind's own non-vacuity guard self-diagnosed this); **10** are documented
steady-state-vs-literal divergences where the blind's OWN flags independently derive the driver's approximations; and
**1** is a clean RECON_ERROR (the blind guessed `flatDamage` where the driver encodes an equivalent `extraHitDamagePct`
buff with the identical 530.46 total and identical swap gating). This mirrors the ada precedent (S5 RED → GO/1.0).

---

## 4. Lines worth a human spot-check (residuals — all measurement-gated, all conservative)

| ⚑      | Line                                        | Shipped                                 | Alternative                  | Estimate                            | Recipe to settle                                                                                          | Tier |
| ------ | ------------------------------------------- | --------------------------------------- | ---------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------- | ---- |
| **R1** | 380.46% stage-target block scope            | per-full-charge fold (530.46 rider)     | one-time-per-burst           | ~10–15% of swap-window damage       | popup footage of ONE Memory Incineration window: count 380.46 procs vs the full-charge count              | 2    |
| **R2** | Memory Incineration chargeTimeSec           | 2.13 (1.8 + ~0.5s bolt-recovery folded) | kit-literal 1.8              | ~5% swap-shot cadence               | high-fps capture: frame-count the gap between two consecutive swapped full-charge releases                | 2    |
| **R3** | Memory Absorption Hit Rate 1.4%/stack       | UNMODELED (measurement-gated)           | encode 42% HR at cap         | up to ~8–12% self core-rate at cap  | controlled probe of core-hit rate at 0 vs 42% HR (geometry is the instrument, not damage back-derivation) | 2    |
| **R4** | S2 stack-gate ramp                          | time-averaged 14.4/16.8/10.5 from t0    | explicit delayed-step ramp   | <2% (same 180s integral)            | read the Memory Absorption counter off a recording at t=30 and t=90 (should read 10 and 30)               | 2    |
| **R5** | S1 ally buffs (core 25.15, casterAtk 30.16) | permanent passive                       | 5s window refreshed every 3s | <2% (over-credits opening ~3s only) | timestamp the FIRST ally buff icon (t≈0 vs t≈3)                                                           | 2    |

**The single highest-value capture** is one Memory Incineration window of popup footage: it settles **R1** (380.46
proc count vs full-charge count) and **R2** (charge cadence) from the same recording. Her 0.854 COLD board position is
consistent with R1+R2+R3 all being conservative and **must be resolved by measurement, not absorbed into any value**
(the judge explicitly warned against tuning these to move the board).

---

## 5. Cross-family provenance

- **S2b** (test-faithfulness review, claude-fable-5): all 13 lines FAITHFUL/UNMODELED, no leak, no REAL-GOTCHA;
  corroborated the 530.46 fold + swap-gate. Reconciled into `reviews/nayuta.test-review.json` (3 documented divergences,
  none a faithfulness failure).
- **S5** (blind test, claude-opus-5): authored from kit prose alone; RED vs driver override but reds reconcile (see §3).
- **S6** (blind override, claude-opus-5): independently re-derived the 530.46 fold, the time-average stack factors,
  casterAtkPct, the swap structure, and the same residual set.
- **S7** (reconciling judge, claude-opus-5, binding): **GO / faithfulness 1.0 / discriminationOk true**, 2 low-severity
  gotchas (R2 measurement-gated; note-hygiene rewrite — fixed in-gauntlet).
