# S7 JUDGE PACKET — `anis-sparkling-summer` (self-contained, answer-faithful compilation of the gauntlet artifacts)

You are the BINDING reconciling judge (RECONCILING-JUDGE role). You have NO tools — everything you need is in this
packet. Grade the driver's IMPLEMENTATION against ground truth (the real kit prose + the damage-formula SSOT + two
INDEPENDENT blind re-derivations from the OTHER model family, claude-opus-5). You grade ARTIFACTS, not intent: you do
NOT trust the driver's self-report. EXACT SLUG: `anis-sparkling-summer` (Anis: Sparkling Summer, SG/Electric/
Supporter/Burst III) — the Sparkling Summer VARIANT; never conflate with base `anis` (RL/Iron) or `anis-star`
(RL/Electric). Content gate: inspect kit prose STRUCTURALLY; quote ≤ ~40 chars; clinical output.

## 1. Ground truth — kit prose (data/characters.json → characters['anis-sparkling-summer'].skills)
Base: SG / Electric / Supporter / Burst III, cd 40s, ammo 5, reloadFrames 141, chargeFrames 0, hitsPerShot 10 (pellets),
normalAttackMultiplier 259.2, coreAttackMultiplier 200, baseCrit 15, baseCritDmg 150. Electric ⇒ advantaged vs a Water
boss (BEATS[Electric]=Water); NOT advantaged vs Fire or Iron.
- **S1** ■ Activates when entering Full Burst. Affects all Electric Code allies.
  - ATK ▲ 55.31% of the skill user's ATK for 10 sec.
  - Reload Speed ▲ 49.28% for 10 sec.
- **S2** ■ Activates when firing the last bullet. Affects the 2 enemy unit(s) with the highest final ATK.
  - Deals 382.42% of final ATK as damage.
  - ■ Activates when firing the last bullet. Affects self.
  - Damage to Interruption Parts ▲ 6.91% for 10 sec.
- **Burst** ■ Affects self.
  - Max Ammunition Capacity ▼ 73.92% for 10 sec.
  - Reload Speed ▲ 27.72% for 10 sec.
  - Elemental Advantage Attack Damage ▲ 42.24% for 10 sec.

## 2. Damage-formula SSOT (docs/data/damage-calculation.md — summary)
Damage = ATK × major (×1.10 element if advantaged) × charge × damageUp-bucket (attackDamagePct / elemAdvantageDamagePct
/ etc., additive within the bucket) × taken × distributed. **casterAtkPct is a FLAT ATK add sourced from the CASTER's
staticAtk** — "ATK ▲ x% of the skill user's ATK" ⇒ casterAtkPct, NOT plain atkPct (which scales each target's OWN ATK).
**elemAdvantageDamagePct lives in the element bucket and pays ONLY under real elemental advantage** (engine self-gates
on BEATS[casterElement]===bossElement) — NOT a generic Damage-Up. **reloadSpeedPct is a weapon-state modifier ⇒ it gates
shot count ⇒ it IS damage** (never a defensive skip). **maxAmmoPct scales the magazine** (engine: max(1, round(base ×
(1+pct/100)))); a negative value CLIPS the current belt and shrinks the magazine.

## 3. Verified engine facts (use when classifying)
(a) **casterAtkPct resolves to a FLAT ATK number in the `buffApply` event**: the stored event `value` is
    `(pct/100) × caster.staticAtk`, identical across all targets — NOT the raw percentage. The raw percentage lives only
    in the OVERRIDE effect and in the buffApply `key` (`<casterIdx>:<slot>:casterAtkPct:55.31`). A test filtering the
    event log for casterAtkPct value `55.31` finds 0; match by `key`.
(b) **`lastBullet` fires whenever a unit's ammo reaches 0 after a shot** (and on forced reloads). With a 5-round
    magazine that is once per magazine; with the burst's maxAmmoPct -73.92 active the magazine is
    max(1, round(5×0.2608)) = **1 round**, so EVERY shot inside the 10s burst window is a last bullet ⇒ the S2 382.42%
    rider fires ~per shot in-window. lastBullet counts ROUNDS (ammo 5), never the SG's 10 pellets.
(c) **`fullBurstEnter` fires on EVERY team Full Burst** (regardless of which B3 completed the chain); **`burstCast`
    fires only on rotations the owner herself bursts**. With a co-B3 (helm) in the comp, burstCast count < fullBurstEnter
    count — that gap discriminates the two triggers.
(d) **Time-expiry emits NO `buffRemove` event** (only reload-triggered removal does). A buff's wall-clock window is
    assertable on the `buffApply` itself: `expiresFrame - frame = durSec×60`.
(e) **`burstCast`/`shot`/`reload`/`damage` events carry `{ slug, unitIdx }`** — NOT casterIdx. `buffApply` carries
    `casterIdx`/`targetIdx` (slot indices), `stat`, `value`, `key`, `expiresFrame`, `frame`. `damage` also carries
    `srcSlot` ('normal'/'skill1'/'skill2'/'burst'), `bucket`, `atkPct`, `critEligible`, `coreEligible`, `critRate`,
    `coreRate`, `inFullBurst`, `fbMajorApplied`, `rangeApplied`.
(f) **Skill riders never take the +30% range bonus** (noRange is universal for skill damage; only MG-by-band weapon fire
    is range-eligible). A flatDamage rider defaults crit-eligible (crit at caster sheet rate) and NOT core-eligible
    absent explicit `core:true`; noFb defaults OFF (FB by landing timing).
(g) **`alliesOfElement` (element-scoped ally target) and `partsDamagePct` (parsed-but-inert stat) BOTH exist** in the
    full schema (src/skills/types.ts). partsDamagePct is inert vs the partless scope-lock boss (no parts) but is modeled
    as a stat buff for kit fidelity (a future parts-boss/consumer would read it) — repo convention (helm S2, raven,
    ark-ranger-black all model it inert), never dropped, never an `ignored` block (validator rejects those).

## 4. Driver's shipped override (src/skills/overrides/anis-sparkling-summer.json — block structure)
- skill1[0]: trigger `fullBurstEnter` → target `alliesOfElement {element:'Electric'}`; effects: buff `casterAtkPct`
  55.31 (10s) + buff `reloadSpeedPct` 49.28 (10s).
- skill2[0]: trigger `lastBullet` → target `enemy`; effect: `flatDamage` atkPct 382.42, crit:true (no core, no noFb).
- skill2[1]: trigger `lastBullet` → target `self`; effect: buff `partsDamagePct` 6.91 (10s) — modeled inert.
- burst[0]: trigger `burstCast` → target `self`; effects: buff `maxAmmoPct` -73.92 (10s) + buff `reloadSpeedPct` 27.72
  (10s) + buff `elemAdvantageDamagePct` 42.24 (10s).
- unmodeled: skill1 [] · skill2 [] · burst [] (all 7 lines block-modeled; partsDamagePct is modeled-inert, NOT unmodeled).
- (Validates: `validate-overrides anis-sparkling-summer` → ✓ valid; dmg 212.7M (34.6%), bursts 5; 4 warnings = the
  measurement-gated cadence/proc-count/elem-boss caveats, not errors.)

## 5. S6 BLIND override (claude-opus-5, independent prose→JSON, leakDetected:null — block structure + diff vs driver)
- skill1[0]: `fullBurstEnter` → **`allies` (untyped)**; effects: buff **`atkPct`** 55.31 (10s) + buff `reloadSpeedPct`
  49.28 (10s).
- skill2[0]: `lastBullet` → `enemy`; `flatDamage` 382.42, crit:true (no core, noFb off).
- skill2[1]: `lastBullet` → `self`; **empty effects** (the parts line filed UNMODELED).
- burst[0]: `burstCast` → `self`; buff `maxAmmoPct` -73.92 (10s) + buff `reloadSpeedPct` 27.72 (10s) + buff
  **`elementDamagePct`** 42.24 (10s).
- unmodeled.skill2: "Damage to Interruption Parts ▲ 6.91% for 10 sec."
- **DIFF vs driver — classified (EVERY divergence is a REDACTED-SCHEMA ARTIFACT; the blind intuited the correct mechanic
  and explicitly flagged the missing primitive in its caveats/flags):**
  - **Trigger identities (fullBurstEnter for S1; lastBullet for S2; burstCast for the burst self-package), the 2-enemy→
    1-instance collapse, crit:true / no-core / noFb-off rider defaults, reloadSpeedPct 49.28 + 27.72 modeled as DAMAGE
    (additive stack), maxAmmoPct -73.92 as the proc ENGINE ("must NOT be treated as defensive/inert"), and the
    elem-advantage gating logic:** ALL **IDENTICAL** — converged from the prose alone.
  - **S1 target `allies` vs `alliesOfElement`:** the blind used untyped `allies` and flagged "the schema's TargetDef has
    no element facet … OVER-CREDITS non-Electric allies … needs an alliesOfElement target kind". The full schema HAS
    `alliesOfElement` (fact (g)); the driver uses it. REDACTION artifact (the target name was a redacted answer token),
    NOT a gotcha. The driver's element-scoping is the faithful encoding.
  - **S1 ATK `atkPct` vs `casterAtkPct`:** the blind used `atkPct` and flagged "no casterAtkPct … encoded as atkPct,
    WRONG for any ally whose ATK differs from Anis's". The full schema HAS `casterAtkPct` (fact (a)); the driver uses it.
    REDACTION artifact, NOT a gotcha. (Both reads agree the magnitude is kit-true and the scaling BASE is the caster.)
  - **burst `elementDamagePct` vs `elemAdvantageDamagePct`:** the blind used `elementDamagePct` and flagged "confirm how
    the engine gates … if it does not gate, add a bossElementGate". The full schema HAS `elemAdvantageDamagePct`, which
    the engine SELF-GATES on advantage (fact, §2); the driver uses it. REDACTION artifact + the blind's gating concern is
    resolved by the engine gate, NOT a gotcha.
  - **partsDamagePct UNMODELED (blind) vs modeled-inert (driver):** the blind filed it UNMODELED ("no primitive … boss
    partless"); the driver models it as an inert `partsDamagePct` buff (fact (g), repo convention). Both agree the line
    is damage-inert vs the partless boss and is recorded (not silently dropped). DOCUMENTED disposition-choice difference
    (model-inert vs unmodeled-verbatim), NOT a silent drop, NOT a gotcha.

## 6. Driver's test (scripts/tests/units/anis-sparkling-summer.test.ts — 21 assertions, all GREEN vs shipped)
Fixture: liter(B1) / crown(B2) / anis-sparkling-summer(B3, focus) / helm(B3). Boss Water (anis the ONLY advantaged unit)
for the primary runs; boss Iron for the elem-advantage gating control. Deterministic.
- H1 S1 casterAtkPct 55.31/10s: applied (key …:skill1:casterAtkPct:55.31), reaches anis ONLY (targetIdx {ANIS});
  CF generic-`allies` reaches {0,1,2,3}; stat field is casterAtkPct (CF atkPct logs atkPct). 10s window.
- H2 S1 reloadSpeedPct 49.28/10s: value 49.28, reaches anis only; CF generic-`allies` reaches all four.
- H3 S2 382.42% rider: count == anis shots with ammoAfter===0 (1:1 with mag-empty, incl. 1-round burst window); > burst
  count and < total shots (last-bullet-keyed); atkPct 382.42, bucket 'skill', critEligible true, coreEligible false;
  CF core:true makes it core-eligible.
- H4 S2 partsDamagePct 6.91 inert: removing it ⇒ totals byte-identical for every unit.
- H5 burst maxAmmoPct -73.92: value -73.92 on anis, count == anis burst casts, 10s; 1-round mags ⇒ strictly MORE
  last-bullet procs than the no-maxAmmo CF; removing it changes her total.
- H6 burst reloadSpeedPct 27.72: value 27.72 on anis, count == burst casts; co-exists with S1's 49.28 (two distinct
  reload buffs).
- H7 burst elemAdvantageDamagePct 42.24: value 42.24 on anis, count == burst casts; LIVE vs Water (removing changes her
  total); GATED vs Iron (removing ⇒ byte-identical totals); CF ungated attackDamagePct WOULD change the Iron total.

## 7. S5 BLIND test convergence (claude-opus-5, leakDetected:null)
**PRISTINE blind test (blind/anis-sparkling-summer.test.ts) run UNMODIFIED vs the shipped override: COLLECTION ERROR —
`Cannot find module '../lib/harness'`.** The blind writer guessed the harness import path (it pre-flagged "HARNESS
PLUMBING GUESSED (blind, harness source not provided) … all plumbing centralised in the single run() helper so it is a
one-line fix-up if the real API differs"). This is the [P1] RECON_ERROR; 0 assertions ran.
**ADAPTED blind test (blind/anis-sparkling-summer.adapted.test.ts — pristine preserved verbatim; plumbing points P1–P10
corrected, kit reading + assertion INTENT unchanged) vs the shipped override: 18 passed / 0 failed = GREEN.** The P1–P10
corrections are harness/redaction plumbing ONLY:
  - **[P1]** import path → '../../tests/lib/harness.js'. **[P2]** OverrideFile groups blocks under skill1/skill2/burst
    (not a flat o.blocks). **[P3]** shot/reload/damage/burstCast carry {slug,unitIdx} (filter by slug), buffApply carries
    casterIdx/targetIdx. **[P4]** slot index A=2. **[P5]** casterAtkPct event value is the flat-resolved add ⇒ match the
    S1 ATK line by buffApply `key` (raw 55.31), not value. **[P6]** no time-expiry buffRemove ⇒ read the 10s window off
    expiresFrame-frame. **[P7]** redacted stat/target names → real schema (atkPct→casterAtkPct, untyped allies→
    alliesOfElement, maxAmmoFlat→maxAmmoPct, elementDamagePct→elemAdvantageDamagePct). **[P8]** reloadSpeedPct EXISTS
    (blind filed GAP from the redacted list) ⇒ un-skipped + asserted live. **[P9]** partsDamagePct EXISTS (inert) ⇒
    asserted exactly inert (totals identical when removed). **[P10]** controlComp does NOT fix the boss ⇒ elem-advantage
    asserted LIVE vs Water + GATED vs Iron.
  ⇒ The blind writer's independent assertion set CORROBORATES the driver override once its unverifiable harness/redaction
  assumptions are corrected. The blind's spec dispositions (written from the prose alone) converge with the driver on
  every mechanical decision: fullBurstEnter (count==fbStarts > burstCast) · lastBullet rider (count==reloads, RED under
  shotFired >2×) · 2-enemy→1 instance · no-core/no-range/FB-by-timing · crit at caster rate · max-ammo→reload-spike +
  proc-spike (RED under drop/sign-flip) · elem-advantage burstCast-keyed + advantage-gated.

## 8. S2b pre-op adversarial review (claude-fable-5, reviews — dispositions, leakDetected:null)
skill1: ATK ▲55.31% of caster ATK FAITHFUL (caster-scaled, fullBurstEnter, Electric-ally scoped; reviewer "FIX" was the
redacted alliesOfElement gap, resolved) · Reload Speed ▲49.28% FAITHFUL. skill2: 382.42% lastBullet FAITHFUL (rounds not
pellets, 1 instance vs solo boss, crit/no-core) · Damage to Interruption Parts ▲6.91% reviewer "UNMODELED" (redacted
partsDamagePct; driver models inert). burst: Max Ammo ▼73.92% FAITHFUL (burstCast, the engine) · Reload Speed ▲27.72%
FAITHFUL · Elemental Advantage ▲42.24% FAITHFUL (advantage-gated). loadBearingSet = the 6 damage-relevant lines (matches
the driver). Verdict: all lines accounted for, no REAL-GOTCHA; the 2 disposition flags were redacted-schema artifacts.

## 9. Line inventory + driver ⚑ flags
FAITHFUL (7): S1 casterAtkPct 55.31/10s (fullBurstEnter, Electric allies) · S1 reloadSpeedPct 49.28/10s · S2 flatDamage
382.42 lastBullet (crit, no core) · S2 partsDamagePct 6.91/10s (modeled inert vs partless boss) · burst maxAmmoPct
-73.92/10s (burstCast, 1-round-mag engine) · burst reloadSpeedPct 27.72/10s · burst elemAdvantageDamagePct 42.24/10s
(advantage-gated).
UNMODELED (0): all 7 lines block-modeled; unmodeled arrays empty.
Driver ⚑ flags (ALL measurement-gated cadence/magnitude refinement, NOT structural faithfulness gaps; each carries
estimate + recipe): (1) CADENCE TUPLE (TOP) — SG pullsPerSec + reloadFrames 141 + rolling-reload are datamine-unreliable;
governs out-of-burst last-bullet cadence AND burst-window proc count. Recipe: focused solo video — rounds/min, reload gap,
per-magazine counter deltas. (2) BURST-WINDOW PROC COUNT (heaviest lever) — with ~1-round mags + ~1.33s stacked-reload
gaps, procs/window ≈ 5-7; verify the mag floors to 1 (engine round(1.304)=1). Recipe: slow-mo one burst window, count
shots/reloads/382.42% popups. (3) crit:true on the rider — verify popup colour (orange=crit). (4) elemAdvantageDamagePct
pays only under real Electric advantage — confirm the graded boss element. (5) SG pellet split/landing — 10 pellets/shot
through the class SG_LANDING_BY_BAND table (per-unit landing is a measured-only refinement).

## 10. Your task
Classify every kit line (FAITHFUL / DOCUMENTED_GAP / REAL-GOTCHA{SILENT_DROP > ENGINE/FIDELITY > ENCODING} /
RECON_ERROR); rule on the pristine-S5 collection error (RECON_ERROR vs REAL-GOTCHA); rule on the S6 diff (the four
redaction-artifact divergences + the partsDamagePct model-inert-vs-unmodeled choice); run the fire-rate check (each
FAITHFUL block fires at the prose-implied cadence — driver test asserts S1 per-FB-enter, S2 rider per last-bullet,
burst lines per burst-cast); confirm the tests discriminate (every FAITHFUL line GREEN vs shipped AND RED vs its named
nearest-wrong counterfactual); produce kitDescription + faithfulnessScore + the BINDING verdict per the GO criteria below.
Magnitudes are owner/measurement-gated and OUT OF SCOPE — do NOT flag a magnitude as a gotcha unless it contradicts the
prose's own number.

### GO criteria (RECONCILING-JUDGE.md)
GO iff: no SILENT_DROP (every kit line is FAITHFUL, DOCUMENTED_GAP, or a documented ⚑ — audit SKIPPED ↔ unmodeled 1:1);
no REAL-GOTCHA; the S5 blind tests run green vs the driver's shipped override (here: the ADAPTED blind test is green,
the pristine collection error is classified RECON_ERROR); discrimination OK (each load-bearing test fails under its named
nearest-wrong model). faithfulnessScore = fraction of kit lines FAITHFUL or DOCUMENTED_GAP.

### Return ONLY this JSON (tight structured JSON, not an essay; `suggestedFix` is a faithful representation or a flagged
### measurement, NEVER a number chosen to hit the board)
```json
{
  "slug": "anis-sparkling-summer",
  "kitDescription": "<plain-English 3-6 sentences: what the kit DOES in game terms>",
  "convergence": { "s5TestsVsDriverOverride": "GREEN|RED", "redAssertions": [ "<which S5 assertions fail vs the driver's override, if any>" ] },
  "lineFindings": {
    "skill1": [ { "kitLine": "<≤40 chars>", "category": "FAITHFUL|DOCUMENTED_GAP|REAL-GOTCHA|RECON_ERROR", "subkind": "SILENT_DROP|ENGINE|FIDELITY|ENCODING|null", "driverSaid": "...", "blindSaid": "...", "formulaCheck": "...", "fireRateOk": true, "explanation": "..." } ],
    "skill2": [ ],
    "burst": [ ]
  },
  "gotchas": [ { "subkind": "SILENT_DROP|ENGINE|FIDELITY|ENCODING", "slot": "...", "summary": "...", "evidence": "<real kit line + formula citation + driver vs blind>", "documentedByDriver": true, "severity": "high|med|low", "suggestedFix": "<faithful representation, or 'needs measurement' + recipe — NEVER a fudge>" } ],
  "discriminationOk": true,
  "faithfulnessScore": "<0..1 fraction of kit lines FAITHFUL or DOCUMENTED_GAP>",
  "verdict": "GO|NO-GO(faithfulness)|NO-GO(engine-core)",
  "verdictRationale": "<one paragraph: which gotchas are real + ranked; whether the blind re-derivations converged; what must change for GO; the same-model residual the owner should spot-check>"
}
```
