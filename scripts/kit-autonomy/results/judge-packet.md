# S7 JUDGE PACKET — `privaty` (compact, answer-faithful compilation of the gauntlet artifacts)

Read this file ONCE, then read RECONCILING-JUDGE.md ONCE, then write results/privaty.json + return the
summary. Do NOT read any other file; do NOT re-read.

## 1. Ground truth — kit prose (data/characters.json → characters.privaty.skills, structural)
Base: AR / Water / Attacker / Burst III, cd 40s, ammo 60, reloadFrames 81, chargeFrames 0 (autofire AR),
hitsPerShot 1, treasure. Water > Fire on the element wheel → privaty HAS elemental advantage on a Fire boss.
- **S1** ■ Activates when entering Full Burst. Affects all allies.
  - ATK ▲ 23.61% for 10 sec.
  - Reload Speed ▲ 51.16% for 10 sec.
  - Max Ammunition Capacity ▼ 50.66% for 10 sec.
  - Attack Damage ▲ 20.16% for 10 sec.
- **S2** ■ Activates when the last bullet hits the target. Affects the target.
  - Damage Taken ▲ 10.01% for 10 sec.
  - Deals 256.17% of final ATK as additional damage.
  - ■ Activates when the last bullet hits a target in Designated Target status. Affects the target.
  - Deals 1687% of final ATK as additional damage.
- **Burst** ■ Affects self.
  - Elemental Advantage Attack Damage ▲ 130% for 10 sec.
  - ■ Affects all enemies.
  - Deals 1407.64% of final ATK as Burst Skill damage.
  - Stuns for 3 sec.
  - Designated Target: ATK ▼ 5.02% for 10 sec.

## 2. Damage-formula SSOT (docs/data/damage-calculation.md — summary)
Damage = ATK × major (×1.10 element if advantaged) × charge × damageUp-bucket (attackDamagePct /
elemAdvantageDamagePct / etc., additive within the bucket) × taken (damageTakenPct on the boss) × distributed.
Function-damage riders take the **+50% Full Burst major by LANDING time** (FB-by-timing default ON); the
**+30% range bonus is UNIVERSALLY off on riders** (engine force-sets noRange); **burst-cast damage is FB-exempt**
(a burst CAST lands before the FB window opens); riders **crit at the caster's rate by default**.

## 3. Two verified engine facts (use when classifying)
(a) **Boss-held debuffs emit `buffApply` with `casterIdx===null`** (enemy applyBuff omits casterIdx — TDD plan
    §1d gap #3). A test filtering a boss debuff by `casterIdx===<unit>` finds 0 even when the debuff IS applied;
    the correct filter is stat+value (targetIdx===null = the boss).
(b) **`noFb` in an override is INERT under the default FB-by-`timing` rule and REJECTED by validate-overrides**
    (sim.ts:98). Only burst-cast damage is auto-FB-exempt. So "the rider should be noFb" is NOT a valid gotcha.

## 4. Driver's shipped override (src/skills/overrides/privaty.json — block structure)
- skill1[0]: trigger `fullBurstEnter` → target `allies`; effects: buff atkPct 23.61 / reloadSpeedPct 51.16 /
  maxAmmoPct -50.66 / attackDamagePct 20.16, all durationSec 10.
- skill2[0]: trigger `lastBullet` → target `enemy`; effects: buff damageTakenPct 10.01 (10s) + flatDamage 256.17 `noRange`.
- skill2[1]: trigger `lastBullet` → target `enemy`, **`requiresTargetStatus:"Designated Target"`**; effect: flatDamage 1687 `noRange`.
- burst[0]: trigger `burstCast` → target `self`; effect: buff elemAdvantageDamagePct 130 (10s).
- burst[1]: trigger `burstCast` → target `enemy`; effects: flatDamage 1407.64 + targetStatus "Designated Target" 10s.
- unmodeled.burst: "Stuns for 3 sec." + "Designated Target: ATK ▼ 5.02% (inert in v1; the status is modeled via targetStatus)".
- (Validates clean: `validate-overrides privaty` → ✓ valid, 0 warnings.)

## 5. S6 BLIND override (independent prose→JSON, leakDetected:null — block structure + diff vs driver)
- skill1[0]: `fullBurstEnter` → `allies`: atkPct 23.61 / reloadSpeedPct 51.16 / maxAmmoPct -50.66 /
  attackDamagePct 20.16 (10s). **IDENTICAL to driver.**
- skill2[0]: `lastBullet` → `enemy`: damageTakenPct 10.01 (10s) + flatDamage 256.17 `crit:true`.
- skill2[1]: `lastBullet` → `enemy`, `requiresTargetStatus:"Designated Target"`: flatDamage 1687 `crit:true`.
  **The gate converged from the prose alone (no leak).**
- burst[0]: `burstCast` → `self`: elemAdvantageDamagePct 130 (10s). **IDENTICAL.**
- burst[1]: `burstCast` → `enemy`: flatDamage 1407.64 + targetStatus "Designated Target" 10s + buff atkPct -5.02 (10s).
- unmodeled.burst: "Stuns for 3 sec."
- **DIFF vs driver — all redundant/inert, NO functional divergence:**
  - S6 riders `crit:true` vs driver default — equivalent (riders crit at caster rate by default; driver's probe
    shows the riders roll critRate 0.15). Driver's `noRange:true` vs S6 omitted — equivalent (engine force-sets noRange).
  - S6 keeps inert `atkPct -5.02` boss debuff as a stat; driver lists it in `unmodeled` — both inert (boss ATK
    feeds no player-damage path in v1).

## 6. Driver's test (scripts/tests/units/privaty.test.ts — 17 assertions, all GREEN vs shipped)
- P1: 256.17 rider count ≈ reload count and ≪ shot count; counterfactual `shotFired` → count ≫ (discriminates lastBullet).
- P2: every 1687 rider inside a privaty burstCast+10s window; non-vacuity (≥1 in-window AND ≥1 out-of-window last
  bullet); count1687 < count256; counterfactual ungated → 1687 appears out-of-window (discriminates the gate).
- P3: rangeApplied===false on all S2 riders (ENGINE-INVARIANT SANITY — noRange force-set; discriminates nothing about privaty).
- P4: 256.17 riders in-FB have fbMajorApplied===true, out-of-FB false (FB-by-timing pin; noFb counterfactual not constructible — fact (b)).
- P5: S1 atkPct 23.61 / reloadSpeedPct 51.16 / maxAmmoPct -50.66 / attackDamagePct 20.16 each applied by privaty to all 4 allies for 10s.
- P5b: removing maxAmmoPct REDUCES the 256.17 rider count (Max-Ammo tandem gates shot count).
- P5c: S1 atkPct applied once per fullBurstStart frame (fullBurstEnter cadence, not burstCast).
- P6: burst elemAdvantageDamagePct 130 applied per burstCast; nuke 1407.64 once per burstCast, burst bucket, fbMajorApplied===[] (FB-exempt).
- P7: damageTakenPct 10.01 applied (filtered by stat+value; casterIdx===null per fact (a)), bounded by last-bullet cadence.
- Inertness: every 256.17/1687 rider has slug==='privaty'; removing S2 lowers privaty's own damage.

## 7. S5 BLIND test convergence (S5 test run UNMODIFIED vs the shipped override — results/privaty.convergence.txt)
**24 passed / 1 failed / 2 skipped (27 total).**
- The 2 SKIPPED = stun + boss ATK▼ (both UNMODELED, correctly `it.skip`'d).
- The 1 FAILED = S5 "P5 damageTakenPct" asserted the debuff filtered by `casterIdx===PRIVATY` → found 0.
  **Classify this:** is it a REAL-GOTCHA (override diverges from prose) or a RECON_ERROR/test artifact?
  (Hint: fact (a) — boss debuffs emit casterIdx===null; the driver's P7 asserts the same line correctly via
  stat+value and is GREEN; the probe confirms the damageTakenPct debuff IS applied.)
- S5's other 24 assertions (S1 trigger/duration/scope, 256.17 cadence, 1687 gate + non-vacuity, elemAdvantage
  self/burstCast + inert-on-neutral-boss, 1407.64 FB-exempt, Max-Ammo tandem) all PASSED vs the shipped override.

## 8. S2b pre-op adversarial review (reviews/privaty.test-review.json — dispositions)
skill1 all FAITHFUL; skill2 damageTaken FAITHFUL, 256.17 FAITHFUL, 1687 labeled MEASUREMENT-GATED (driven by a
STALE types.ts leak naming privaty/"Designated Target"/"NOT enacted" — the gate IS enacted; S2b's OWN proposed
assertion "1687 only within 10s of burst, zero outside" is identical to the driver's P2); burst elemAdvantage
FAITHFUL, 1407.64 FAITHFUL, Stun UNMODELED, Designated-Target status labeled MEASUREMENT-GATED/UNMODELED.
S2b's top adversarial catches (both adopted by the driver): Max-Ammo ▼ tandem (highest-risk misread) + skill1
fullBurstEnter-vs-burstCast trigger.

## 9. Your task
Classify every kit line (FAITHFUL / DOCUMENTED_GAP / REAL-GOTCHA{SILENT_DROP>ENGINE/FIDELITY>ENCODING} /
RECON_ERROR); rule on the 1 S5 RED; rule on the S6 diff; run the fire-rate check (each FAITHFUL block fires at
the prose-implied cadence — the driver's test asserts this); confirm the tests discriminate; produce
kitDescription + faithfulnessScore + the BINDING verdict (GO / NO-GO(faithfulness) / NO-GO(engine-core)) per the
GO criteria in RECONCILING-JUDGE.md. Write results/privaty.json; return the ≤40-line summary.
