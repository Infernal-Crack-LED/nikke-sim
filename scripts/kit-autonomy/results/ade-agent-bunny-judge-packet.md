# S7 JUDGE PACKET — `ade-agent-bunny` (compact, answer-faithful compilation of the gauntlet artifacts)

Read this file ONCE, then read RECONCILING-JUDGE.md ONCE, then write results/ade-agent-bunny.json + return the
≤40-line summary. Do NOT read any other file; do NOT re-read. EXACT SLUG: `ade-agent-bunny` (Ade: Agent Bunny,
SR/Iron/Supporter/Burst II; aka "aab"/"bade") — NOT `ade` (AR/Wind).

## 1. Ground truth — kit prose (data/characters.json → characters['ade-agent-bunny'].skills, lvl10 = last index)

Base: SR / Iron / Supporter / Burst II, cd 20s, ammo 6, reloadFrames 141, chargeFrames 60, hitsPerShot 1,
normalAttackMultiplier 69.04, chargeMultiplier 250. Iron (no elemental advantage on a Wind boss in the driver
fixture; advantage live there since Iron>Wind on the wheel).

- **S1** ■ Activates when landing Full Charge attacks on targets within the effective range. Affects all allies.
  - ATK ▲ 15.2% of the skill user's ATK for 5 sec. (lvl10 = 15.2; "of the skill user's ATK" ⇒ caster-sourced)
  - ■ Activates when attacking with Full Charge. Affects self.
  - Spy Lens: Minimum Effective Range ▲ 4.44%, stacks up to 10 time(s) and lasts for 5 sec.
- **S2** ■ Activates when landing a Full Charge attack on a target within the effective range. Affects all allies.
  - Pierce Damage ▲ 18.36% for 5 sec.
  - ■ Activates only if Spy Lens is at max stacks. Affects self.
  - Gains Pierce. This effect is continuous.
  - ATK ▲ 16% continuously.
- **Burst** ■ Affects self.
  - Minimum Effective Range ▲ 55.56% for 10 sec.
  - ■ Affects all allies.
  - Attack Damage ▲ 55.04% for 10 sec.
  - Pierce Damage ▲ 10.13% for 10 sec.

## 2. Damage-formula SSOT (docs/data/damage-calculation.md — summary)

Damage = ATK × major (×1.10 element if advantaged) × charge × damageUp-bucket (attackDamagePct / pierceDamagePct
/ etc., additive within the bucket) × taken × distributed. **pierceDamagePct feeds the Damage-Up bucket ONLY for
Pierce-tagged hits** (see fact (b)). casterAtkPct is a flat ATK add sourced from the CASTER's staticAtk (fact (a)).

## 3. Verified engine facts (use when classifying)

(a) **casterAtkPct resolves to a FLAT ATK number in the `buffApply` event** (sim.ts:1770): the stored event value
is `(pct/100) × caster.staticAtk`, applied IDENTICALLY to every target — NOT the raw percentage. For ade
(staticAtk ≈ 99,734 in the driver fixture) the event value is ≈ 15159.57, uniform across all 4 allies. A test
filtering the event log for `casterAtkPct` value `15.2` finds 0; the raw 15.2 lives only in the OVERRIDE effect.
(b) **pierceDamagePct feeds Damage Up ONLY when the hitter is Pierce-tagged** (sim.ts:1401 `pierce = pierceTagged ?
    stat(u,'pierceDamagePct',frame) : 0`; pierceTagged = hasPierce || pierceUntilFrame>frame || per-shot tag). On a
team with no other Pierce hitter, zeroing a pierceDamagePct buff leaves the non-Pierce teammates BYTE-IDENTICAL
and moves only the Pierce-tagged unit.
(c) **`gainPierce` is a real step-gateable primitive** (skills/types.ts:274; sim.ts:2072–2079): a `gainPierce`
effect with NO `durationSec` sets `pierceUntilFrame → ∞` (permanent once fired). It was added 2026-07-20
SPECIFICALLY for ade-agent-bunny so her Pierce can be STEP-GATED onto a stack threshold — replacing an
always-on-from-t=0 top-level `hasPierce` flag, which a boolean cannot step-gate. `gainPierce` emits NO buffApply
event; it is observable via the unit's damage (her pierceDamagePct self-feed goes live only after it fires).
(d) **`hitCount:N` cycles every N hits** (sim.ts:2898–2911): the counter accrues `hitsPerShot` per shot and fires the
block each time it crosses N (10, 20, 30 …). For ade (hitsPerShot 1) hitCount:10 first fires on her 10th shot
(≈ frame 955 / 15.9s in the driver fixture). Re-application of a duration-less buff just refreshes it ⇒ the
atkPct:16 + gainPierce stay continuous from the 10th shot onward.
(e) **No full-charge trigger exists** in the schema ⇒ `shotFired` is the sanctioned proxy for "landing Full Charge
in effective range": an SR always fires full charge (chargeFrames 60) and the engine force-sets noRange, so the
range/landing clause is always satisfied in-sim. This is a documented ⚑ (UNMEASURED vs a real fight).

## 4. Driver's shipped override (src/skills/overrides/ade-agent-bunny.json — block structure)

- skill1[0]: trigger `shotFired` → target `allies`; effect buff `casterAtkPct` 15.2, durationSec 5.
- skill2[0]: trigger `shotFired` → target `allies`; effect buff `pierceDamagePct` 18.36, durationSec 5.
- skill2[1]: trigger `hitCount` count 10 → target `self`; effects: buff `atkPct` 16 (NO durationSec ⇒ continuous) +
  `gainPierce` (NO durationSec ⇒ pierceUntilFrame→∞). **No top-level `hasPierce` flag** (removed in favour of the
  step-gated gainPierce).
- burst[0]: trigger `burstCast` → target `allies`; effects buff `attackDamagePct` 55.04 (10s) + `pierceDamagePct`
  10.13 (10s).
- unmodeled.skill1: "Spy Lens: Minimum Effective Range ▲ 4.44%, stacks up to 10 time(s) and lasts for 5 sec." (the
  STAT is inert — no range StatKey; the STACK COUNT is modeled via the hitCount:10 step on skill2[1]).
- unmodeled.burst: "Minimum Effective Range ▲ 55.56% for 10 sec." (inert range stat).
- (Validates: `validate-overrides ade-agent-bunny` → ✓ valid; 4 remaining warnings = the documented ⚑ caveats.)

## 5. S6 BLIND override (independent prose→JSON, leakDetected:null — block structure + diff vs driver)

- skill1[0]: `shotFired` → `allies`: casterAtkPct 15.2 (5s). **IDENTICAL to driver.**
- skill1[1]: `shotFired` → `self`: resource `spyLens` delta +1 (a self stack counter, 0..10).
- skill2[0]: `shotFired` → `allies`: pierceDamagePct 18.36 (5s). **IDENTICAL.**
- skill2[1]: `shotFired` → `self`, **resourceGate {spyLens, min:10}**: buff atkPct 16 (**durationSec 5**).
- burst[0]: `burstCast` → `allies`: attackDamagePct 55.04 (10s) + pierceDamagePct 10.13 (10s). **IDENTICAL.**
- unmodeled: same two Minimum Effective Range lines (verbatim). **Converged from prose alone.**
- Top-level: `hasPierce: true` + `resources:[{spyLens,0..10}]`.
- **DIFF vs driver — classified:**
  - **Spy-Lens stack gate:** S6 uses a `spyLens` resource pool + `resourceGate{min:10}`; driver uses `hitCount:10`.
    SAME behaviour (the gate opens on the 10th full-charge hit). ENCODING convergence, no functional divergence.
    Both independently flag the refresh-all vs per-stack-expiry ambiguity as the dominant ⚑ (S6 caveats call it
    "the largest uncertainty in the override"; driver ⚑2).
  - **Pierce step-gate:** S6 uses top-level `hasPierce:true` (UNCONDITIONAL — Pierce live from t=0). S6's OWN caveat
    admits this "over-credits her OWN benefit from her S2/burst Pierce Damage ▲ buffs early… the ramp cannot be
    expressed" because S6 believed Pierce had "no resource-gated form." The driver's `gainPierce` (fact (c)) IS that
    resource/step-gated form ⇒ driver is MORE faithful (Pierce off until the 10th shot, ≈ first 16s/≈9% of fight).
    This is a FIDELITY point in the DRIVER's favour, not a gotcha against it.
  - **atkPct 16 duration:** S6 `durationSec:5` (refreshed while gated) vs driver continuous (no durationSec). Kit
    says "ATK ▲ 16% continuously" ⇒ driver is the literal reading; S6's 5s-refresh is functionally near-equivalent
    while she keeps firing. Minor; driver more literal.

## 6. Driver's test (scripts/tests/units/ade-agent-bunny.test.ts — 22 assertions, all GREEN vs shipped)

Fixture: ade is the SOLE B2 in liter(B1)/ade(B2)/ada(B3)/helm(B3), boss Wind, focus ada ⇒ ade casts every FB cycle
(12 casts / 105 shots / 10th shot @ frame 955). Deterministic.

- A1 casterAtkPct 15.2: one flat value uniform across all 4 allies (>1000, caster-resolved); 5s; once per shot
  (count = shots×4); CF generic-atkPct stores raw 15.2 AND moves ada's total; CF shotFired→burstCast collapses
  cadence (420→48).
- A2 Spy Lens: verbatim in unmodeled.skill1 (inert stat; stack count carried by A4's hitCount:10).
- A3 pierceDamagePct 18.36: raw magnitude, 5s, all 4 allies, once per shot; CF removal deletes buff; INERTNESS —
  zeroing leaves liter/ada/helm byte-identical, moves only ade (pierce-tagged).
- A4 step-gate: structural hitCount:10→self atkPct16(no dur)+gainPierce(no dur); NO top-level hasPierce; atkPct:16
  first lands on the 10th shot, self-only, continuous (expiresFrame null); CF always-on (trigger→shotFired) lands it
  on the 1st shot; CF no-gainPierce drops ade total −12.9% (pierce self-feed load-bearing); CF top-level hasPierce
  (always-on) changes ade total +1.0% (over-credits early).
- B1 Min Eff Range 55.56: verbatim in unmodeled.burst.
- B2 attackDamagePct 55.04: kit magnitude, 10s, all 4 allies, once per burstCast (count = bursts×4); structural
  trigger burstCast; CF removal deletes buff.
- B3 pierceDamagePct 10.13: kit magnitude, 10s, all 4 allies, once per burstCast; CF removal deletes; INERTNESS —
  zeroing only 10.13 leaves non-pierce teammates byte-identical, moves only ade.

## 7. S5 BLIND test convergence

**PRISTINE blind test (blind/ade-agent-bunny.test.ts) run UNMODIFIED vs the shipped override: 2 passed / 22 failed /
3 skipped (27).** Classify the 22 RED: every one is a RECON_ERROR / test artifact from blind-writer assumptions that
were UNVERIFIABLE from the de-contaminated packet — NOT a divergence of the override from the prose:

1. **Fixture vacuity:** pristine uses `controlComp('ade-agent-bunny')` = liter/crown/ade/helm; crown (B2) and ade
   (B2) contest the single B2 slot and ade wins 0 casts ⇒ `ADE_CASTS.length===0` ⇒ every burst assertion vacuous.
   The blind writer ANTICIPATED this ("if this fails… the fixture must be rebuilt without a second B2").
2. **casterAtkPct event value:** pristine filters the event log for casterAtkPct value `15.2`, but the engine emits
   the flat-resolved ≈15159.57 (fact (a)) ⇒ `ADE_IDX` derives null ⇒ cascade.
3. **Override schema:** pristine `blocksOf` reads `o.blocks`; the OverrideFile uses `skill1/skill2/burst` arrays ⇒
   all `findBuffs` structural reads + counterfactual patches no-op.
4. **Pierce primitive:** pristine asserts Pierce is carried as a top-level `hasPierce` flag; the driver uses the
   step-gated `gainPierce` effect (fact (c)) — the more faithful encoding (S6's own caveat agrees).
5. **`totals()` shape:** pristine `teamDmg` reads `t.total`; the harness `totals()` is a per-slug map ⇒ undefined.
6. **`overrides` shape:** pristine `runPatched` sets `o.overrides = <file>`; the harness expects a per-slug map ⇒
   counterfactual patches silently fall back to disk.
   **ADAPTED blind test (blind/ade-agent-bunny.adapted.test.ts — pristine preserved; the 6 assumptions above corrected,
   assertion INTENT unchanged) vs the shipped override: 24 passed / 3 skipped (27), 0 failed.** The 3 skips = the 2
   unmodelable Minimum-Effective-Range GAPs (no StatKey) + 1 conservative engine-gated pierce skip the driver's A3/A4
   already covers. ⇒ The blind writer's independent assertion set CORROBORATES the driver override once its
   unverifiable engine assumptions are corrected.

## 8. S2b pre-op adversarial review (reviews/ade-agent-bunny.test-review.json — dispositions)

S1a casterAtkPct FAITHFUL (caster-resolved flat; nearest-wrong atkPct); S1b Spy Lens "GAP" = inert-stat UNMODELED +
load-bearing stack counter (S2b proposed a resourceGate; driver's hitCount:10 is the engine counter primitive);
S2a pierceDamagePct FAITHFUL (nearest-wrong attackDamagePct); S2b Gains Pierce labeled "FIX" because S2b assumed the
engine lacked a dynamic pierce toggle — it HAS gainPierce (fact (c)), which the driver uses; atkPct 16 FAITHFUL
(self, continuous, max-stack gate); burst Min Eff Range UNMODELED; attackDamagePct 55.04 + pierceDamagePct 10.13
FAITHFUL (burstCast, NOT fullBurstEnter — S2b's top shared-prior-misread candidate). S2b's REQUIRED strengthening
(both pierce buffs provably inert on non-pierce teammates) was ADOPTED by the driver (A3/B3 INERTNESS assertions).

## 9. Your task

Classify every kit line (FAITHFUL / DOCUMENTED_GAP / REAL-GOTCHA{SILENT_DROP>ENGINE/FIDELITY>ENCODING} /
RECON_ERROR); rule on the 22 pristine-S5 REDs (each RECON_ERROR vs REAL-GOTCHA); rule on the S6 diff (Spy-Lens
resource-vs-hitCount encoding, hasPierce-vs-gainPierce fidelity, atkPct-16 duration); run the fire-rate check (each
FAITHFUL block fires at the prose-implied cadence — driver test asserts shotFired per-shot, hitCount:10 step,
burstCast per-cast); confirm the tests discriminate (every FAITHFUL line is GREEN vs shipped AND RED vs its
nearest-wrong counterfactual); produce kitDescription + faithfulnessScore + the BINDING verdict
(GO / NO-GO(faithfulness) / NO-GO(engine-core)) per the GO criteria in RECONCILING-JUDGE.md. The two inert
Minimum-Effective-Range lines are DOCUMENTED_GAP (no range StatKey; stack count modeled). The ⚑s (shotFired
full-charge proxy; Spy-Lens count:10 ramp + refresh-all stack reading; SR cadence tuple) each carry estimate +
recipe + tier. Write results/ade-agent-bunny.json; return the ≤40-line summary.
