# S7 RE-JUDGE (after fix) — guillotine-winter-slayer

You (claude-opus-5) are the BINDING reconciling judge. You previously ruled this unit **NO-GO(faithfulness), 0.75** —
ruling FOR the driver on the steady-state-collapse crux, but NO-GO on a REAL-GOTCHA you found: the Hero-Level-Up
trigger (hitCount 30) had no activation cap, so the two level-up rewards fired ~56× instead of the kit-permitted 10×.
The driver has now implemented YOUR exact suggestedFix. Re-rule.

## WHAT YOU ASKED FOR (your prior verdict, verbatim suggestedFix)
"declare resources heroLevel initial 1 max 11, add {kind:'resource',name:'heroLevel',delta:1} to the hitCount:30 block,
and put resourceGate {name:'heroLevel', max:10} on BOTH reward blocks … add a discriminating assertion … count
instantReload (and heal) events … require exactly 10, which fails under the shipped model and passes under the fix.
Correct the note's 'review-confirmed' sentence … soften the skill2 note prose so it matches its own ⚑2."

## WHAT THE DRIVER DID (the fix delta)

1. OVERRIDE (src/skills/overrides/guillotine-winter-slayer.json):
   - Added top-level `resources: [{name:'heroLevel', initial:1, min:1, max:11}]`.
   - Added `resourceGate: {name:'heroLevel', max:10}` to BOTH reward blocks (instantReload 0.1026 + heal).
   - Added a hitCount-30 self increment block `{kind:'resource', name:'heroLevel', delta:1}`, ordered AFTER the two
     reward blocks. Engine semantics: blocks fire in array order and each block's effects apply before the next block
     is processed (src/engine/sim.ts u.blocks.forEach + applyBlock), so the gated rewards check the PRE-increment
     heroLevel value → they fire while heroLevel ∈ {1..10} = exactly 10 firings, then heroLevel reaches 11 and the
     gate blocks further firings. (The engine emits NO countable reload/heal event — instantReload adjusts ammo inline
     and heal calls fireRecovery internally — so "count events = 10" is not directly assertable; the cap is pinned
     STRUCTURALLY + discriminated BEHAVIOURALLY instead, see #2.)
   - Note: retracted the unsupported "rewards KEEP TRIGGERING at max level (review-confirmed)" claim; softened the
     skill2 "6-non-core branch never fires" prose to agree with its own ⚑2 (realised core fraction = exposure × ACR < 1).

2. TEST (scripts/tests/units/guillotine-winter-slayer.test.ts) — new discriminating assertions:
   - G2 structural: override declares resources[heroLevel] max 11; exactly 2 reward blocks carry resourceGate{heroLevel max 10};
     an increment block {kind:'resource', heroLevel, delta:1} exists. (This is the "exactly 10" proof: the gate admits
     firings only while heroLevel ∈ {1..10}, incremented once per level-up from initial 1.)
   - G2 behavioural (the discrimination you asked for): a `gwsNoGate` counterfactual strips the resourceGate from both
     reward blocks (rewards fire ~56×); the test asserts shipped shots < noGate shots AND shipped damage < noGate damage —
     i.e. uncapping over-fires the reload rider. This FAILS under the old uncapped model (no gate to remove → fixture-stale
     throw) and PASSES under the fix.
   - G3 structural: the heal block carries resourceGate{heroLevel max 10}.

3. VERIFICATION:
   - heroLevel increments EXACTLY 10× (engine DBG resource log: 1→2 @2.62s, 2→3 @5.12s, … , 10→11 @27.97s; thereafter
     "11+1 → 11" clamped). 10 real increases confirmed by count.
   - Carry: 1881 → 1846 shots; damage 269.7M → 266.2M (−1.7%, matching your ~1.5–1.7% estimate).
   - validate-overrides PASS; driver test 18/18 GREEN.
   - S5 blind test vs the FIXED override: 14 PASS / 2 FAIL / 2 SKIP (was 13/3/2). The fix flipped blind T9 ("Hero Level
     scaling is live") GREEN — the new heroLevel resource pool satisfies the blind's "declared pool" branch. The 2
     remaining reds are T10 (two EXP paths + requiresCore — the engine cannot partition core/non-core per hit; three
     agents converged on this wall; driver models the scope-lock core branch, ⚑2) and T12 (7.46 line "not a t=0 passive"
     — the behavioural self-only half PASSES; only the structural gate check fails, driver models it as a passive with
     level 2 reached ~3s in, ~0.1% over-credit, documented in caveats). You already ruled both FAITHFUL/DOCUMENTED_GAP.

## YOUR TASK
Re-rule. Has the REAL-GOTCHA been fixed faithfully (cap at 10 firings, discriminating assertion present, note corrected)?
Is the discriminationOk concern (no assertion bounded the level-up cadence) now resolved? Return the binding verdict JSON
per the contract below. The full prior evidence (kit prose, mechanics SSOT, S2b/S5/S6 blind artifacts, driver impl) is
unchanged from the first packet except for the override + test deltas shown here; the updated driver override and the
updated G2/G3 test groups are appended.

---
# PART 1 — RECONCILING-JUDGE CONTRACT

# kit-autonomy — S7 RECONCILING JUDGE (binding go/no-go)

Paste at the top of a fresh subagent, prepended with `.claude/subagent-non-negotiables.md` AND the mechanics
pack (`docs/data/damage-calculation.md` + `docs/data/game-mechanics.md`, or the `/context` pack). You are the
final gate of the autonomous gauntlet. You grade the driver's IMPLEMENTATION against ground truth — the real
kit text + the damage-formula SSOT + two INDEPENDENT blind re-derivations — and return a BINDING verdict.
You grade ARTIFACTS, not intent: you do NOT trust the driver's self-report (the artifacts embody the
reasoning; you are not "blind" to it, you simply don't take its word for it).

> **Content gate:** inspect kit prose STRUCTURALLY; quote ≤ ~40 chars; clinical output.

## You are given
1. **Ground truth:** the real kit prose (`data/characters.json → characters.<slug>.skills`) + base stats, and
   the damage-formula/mechanics SSOT (the multiplicative buckets; crit/core/FB majors; procs/DoT/flavors).
2. **Pre-op review (S2b):** the adversarial test-faithfulness reviewer's independent spec (per-line
   disposition + nearest-wrong model + distinguishing assertion + load-bearing set).
3. **Blind post-op test-writer (S5):** an independent `<slug>.test.ts` written from the prose alone (+ spec).
4. **Blind post-op override-writer (S6):** an independent `OverrideFile` written from the prose alone (+ audit + ⚑ list).
5. **The driver's implementation:** the driver's `<slug>.test.ts`, `src/skills/overrides/<slug>.json`, and any
   engine change. (Plus the S2d independent verification matrix if provided.)

## Method
**A. Convergence is MECHANICAL (do this first).** Run the S5 blind tests, UNMODIFIED, against the driver's
SHIPPED override (mentally trace, or note what a run would show): **GREEN = convergence; any RED = a
divergence to classify.** A divergence the blind caught is the REAL signal; mere same-model agreement is WEAK
evidence (every agent is the same model — convergence proves stability, not correctness).

**B. Per kit line, classify** the driver's encoding against prose + formula, using S2b/S6 to attribute:
- `FAITHFUL` — encoding matches prose AND the formula SSOT agrees the routing is correct (right bucket,
  trigger timing, stacking rule, scope, duration semantics, target set).
- `DOCUMENTED-GAP` — deliberately `unmodeled` (reason in `note`), a `GAP` (missing primitive, `it.skip`), or a
  `⚑` (estimate + recipe + tier). Acceptable; the decision is recorded.
- `REAL-GOTCHA` — a divergence NOT documented. Sub-kinds, ranked: `SILENT_DROP` (line nowhere — not block,
  config, or `unmodeled`) → `ENGINE`/`FIDELITY` (encoded but the engine routes/executes it so behavior differs
  from the kit wording, or the downstream effect is modeled rather than the named mechanic) → `ENCODING`
  (wrong value/stat/trigger/target/scope/duration vs the prose).
- `RECON_ERROR` — a blind agent misread clear code/prose (the driver + formula agree); note it, not a finding.

**C. Fire-rate / "modeled≠working" check:** each FAITHFUL block must FIRE at the prose-implied cadence over
the 180s fight (the DBG side-effect check), not merely be present. A modeled line that doesn't activate is a
REAL-GOTCHA. (A block whose only observable is a consumer's reaction needs a fixture that strips the unit's
other sources of that signal — note if the driver's fixture fails to isolate.)

**D. Discrimination check:** each load-bearing test must FAIL under its named nearest-wrong model (per the
S2d matrix / S2b). A test green under both shipped and counterfactual asserts nothing → REAL-GOTCHA.

**E. Cross-check the blind agents:** for each S5/S6 divergence from the driver, is it corroborated by the
prose + formula (a fresh find) or spurious? Undocumented + formula-confirmed = the most valuable output.

**F. Magnitude scope:** magnitudes are owner/measurement-gated and OUT OF SCOPE — do NOT flag a magnitude as
a gotcha unless it contradicts the prose's own number; tag each with its evidence tier.

## Also produce: `kitDescription`
A plain-English 3–6 sentence description of what the kit DOES in game terms (grounded in the real kit text,
not audit jargon) — for owner sanity-check. No gotcha subkinds, no citations, no severity.

## Return ONLY this JSON
```json
{
  "slug": "<exact slug>",
  "kitDescription": "<plain-English 3-6 sentences>",
  "convergence": { "s5TestsVsDriverOverride": "GREEN|RED", "redAssertions": [ "<which S5 assertions fail vs the driver's override>" ] },
  "lineFindings": {
    "skill1": [ { "kitLine": "<≤40 chars>", "category": "FAITHFUL|DOCUMENTED_GAP|REAL-GOTCHA|RECON_ERROR", "subkind": "SILENT_DROP|ENGINE|FIDELITY|ENCODING|null", "driverSaid": "...", "blindSaid": "...", "formulaCheck": "...", "fireRateOk": true, "explanation": "..." } ],
    "skill2": [ ], "burst": [ ]
  },
  "gotchas": [ { "subkind": "SILENT_DROP|ENGINE|FIDELITY|ENCODING", "slot": "...", "summary": "...", "evidence": "<real kit line + formula citation + driver vs blind>", "documentedByDriver": true, "severity": "high|med|low", "suggestedFix": "<faithful representation, or 'needs measurement' + recipe — NEVER a fudge>" } ],
  "discriminationOk": true,
  "faithfulnessScore": "<0..1 fraction of kit lines FAITHFUL or DOCUMENTED_GAP>",
  "verdict": "GO|NO-GO(faithfulness)|NO-GO(engine-core)",
  "verdictRationale": "<one paragraph: which gotchas are real + ranked; whether the blind re-derivations converged; what must change for GO; the same-model residual the owner should spot-check>"
}
```
Save to `scripts/kit-autonomy/results/<slug>.json`. `suggestedFix` is a faithful representation or a flagged
measurement, NEVER a number chosen to hit the board. Tight structured JSON, not an essay.


---

# PART 2 — YOUR PRIOR VERDICT (for continuity)

```json
{
  "slug": "guillotine-winter-slayer",
  "kitDescription": "Guillotine: Winter Slayer is a Water-element AR attacker who builds her own power over the course of a fight. Her normal attacks earn EXP (one EXP per 3 core hits, or per 6 non-core hits), and each EXP stack permanently raises her own ATK by 1.81% up to 100 stacks; every 10 EXP she also gains a Hero Level, capped at Level 11, and each level-up instantly tops up part of her magazine and heals her a little. Every Hero Level she gains makes her stronger for the whole Water side of the team: all Water Code allies (herself included) get Elemental Advantage Attack Damage and a flat ATK boost drawn from her own ATK, both scaling with her current Hero Level. Once she has reached Level 2 she additionally keeps a personal +7.46% Elemental Advantage Attack Damage. Her Burst III gives all Water Code allies +10.14% Attack Damage and +18.75% Elemental Advantage Attack Damage for 10 seconds, and plants a 10-second damage-over-time on the biggest enemy that ticks once a second for 20.87% of her final ATK multiplied by her Hero Level — so the same burst hits far harder late in a fight than at the start.",
  "convergence": {
    "s5TestsVsDriverOverride": "RED",
    "redAssertions": [
      "T9 'Hero Level scaling is live': the driver emits a single fixed elemAdvantageDamagePct 12.76 with no resources[] pool and no perResource, so neither the growing-magnitude branch nor the declared-pool branch is satisfied — the level is frozen to a constant.",
      "T10 'EXP accrues on BOTH the 6-non-core path and the 3-core path': the driver ships only a hitCount:3 block; no hitCount:6 block and no requiresCore flag exist.",
      "T12 '7.46% line is level-gated (not a t=0 passive)': the behavioural half (self-only, helm/liter/crown excluded, permanent) PASSES; only the structural `trigger.kind !== 'passive' || resourceGate != null` check fails."
    ]
  },
  "lineFindings": {
    "skill1": [
      {
        "kitLine": "every time EXP stacks 10 … max Lv 11",
        "category": "REAL-GOTCHA",
        "subkind": "ENCODING",
        "driverSaid": "hitCount:30 self blocks with NO activation cap; note asserts 'level-up rewards KEEP TRIGGERING at max level (review-confirmed)'.",
        "blindSaid": "S6 declared resources[heroLevel]{initial 1, max 11} + resourceGate{max:10} on the reward block, explicitly warning 'without that gate the hitCount trigger would keep paying rewards forever past Level 11'. S2b independently specified the same inertness: 'no level-ups after 100 EXP (rewards stop firing at cap)'.",
        "formulaCheck": "Kit arithmetic is self-closing: S2 caps EXP at 100 stacks, S1 fires per 10 EXP, and 100/10 = 10 level-ups = Level 1→11 = the stated cap. There is therefore no 11th 'EXP stacks 10' event under any reading. The driver's uncapped hitCount:30 fires ~1700/30 ≈ 56 times over 180s — ~5.6× the kit-permitted 10.",
        "fireRateOk": false,
        "explanation": "The level-cap semantics of the trigger are dropped entirely. This is the one line in the kit that BOUNDS the two reward riders, and the driver's note asserts the opposite of the prose without support from either blind review. No test in either the driver's or the blind suite counts level-up activations, which is why the convergence run did not surface it."
      },
      {
        "kitLine": "Hero Level Up Reward: Reloads 10.26%",
        "category": "REAL-GOTCHA",
        "subkind": "ENCODING",
        "driverSaid": "instantReload fraction 0.1026 on hitCount:30 self — correct effect, correct fraction, correct target, unbounded cadence.",
        "blindSaid": "S6 same effect + fraction, gated to exactly 10 firings; S2b marked it FAITHFUL and load-bearing with 'stops firing once Level 11 is reached'.",
        "formulaCheck": "Reload economy is damage (shots fired). The driver's own G2 test measures the block as worth ~46 shots / ~2% of carry damage AT 56 firings; at the kit-permitted 10 firings it is worth ~1/5.6 of that, so the shipped model over-credits the carry by roughly 1.5–1.7%.",
        "fireRateOk": false,
        "explanation": "Fraction and routing are faithful; the CADENCE is not. Per the fire-rate/'modeled≠working' check, a block that fires at ~5.6× the prose-implied cadence is a REAL-GOTCHA even though every structural assertion about it is green. Same root cause as the line above."
      },
      {
        "kitLine": "Recovers 2.44% of final Max HP",
        "category": "REAL-GOTCHA",
        "subkind": "ENCODING",
        "driverSaid": "heal event block (no value), self, hitCount:30 — event-only, no HP pool; G3 proves it moves zero damage in this comp.",
        "blindSaid": "S6 identical event-only heal, but bounded by the same resourceGate{max:10}; S2b flagged it as the on-recovery inertness pin.",
        "formulaCheck": "Damage-inert here (no HP pool, no recovery-consumer in the control comp), so the over-firing costs nothing on this board. It is still a wrong event count on a cross-unit channel a future comp can consume.",
        "fireRateOk": false,
        "explanation": "Correctly represented (hard rule 2 satisfied — it is no longer a silent drop) and correctly inert, but rides the same uncapped cadence: ~56 recovery events instead of 10. Low severity; listed for completeness under the same fix."
      },
      {
        "kitLine": "Elem Adv Atk Dmg ▲1.16% * Hero Level",
        "category": "DOCUMENTED_GAP",
        "subkind": null,
        "driverSaid": "passive alliesOfElement Water buff, elemAdvantageDamagePct 12.76 = 1.16 × 11, permanent; ramp collapsed to the Level-11 steady state under ⚑3 with a stated refit recipe.",
        "blindSaid": "S6 encoded perResource{heroLevel, mult 1.16} off a live pool but flagged its own risk: 'if the engine only resolves perResource for self-targets, the ally half of the Level aura goes inert — verify'. S2b called the collapse the nearest-wrong and asked for a ramp.",
        "formulaCheck": "Stat placement is correct — elemAdvantageDamagePct is the Element bucket (superior-element term), live only under advantage; the control boss is Fire so it is genuinely live. Magnitude is the kit's own per-level value × the kit's own cap, so it does not contradict any prose number (contract F). The only divergence is the ~32s ramp-in trajectory (~18% of the fight held above the true value).",
        "fireRateOk": true,
        "explanation": "Stat key, scope (Water Code allies INCLUDING self — proven two-sided: {gws, helm} target set, crown byte-identical under the counterfactual), and permanence are all faithful. The steady-state collapse is a recorded ⚑ with an estimate, a recipe, and a measured-accurate residual behind it — a DOCUMENTED_GAP, not a faithfulness break. It also sidesteps the ally-perResource resolution risk the blind itself could not clear."
      },
      {
        "kitLine": "ATK ▲0.91% of skill user's ATK * Level",
        "category": "DOCUMENTED_GAP",
        "subkind": null,
        "driverSaid": "casterAtkPct 10.01 (= 0.91 × 11), passive, alliesOfElement Water, permanent.",
        "blindSaid": "S6 perResource{heroLevel, mult 0.91} on casterAtkPct — same stat, same scope, same excludeSelf:false judgment.",
        "formulaCheck": "Correct basis: casterAtkPct resolves at application to a FLAT add of the caster's static ATK × pct, OUTSIDE each recipient's (1+ATK%) sum — the S2b nearest-wrong (encoding it as atkPct, i.e. target-own-ATK scaled) is avoided. The S5 blind's value-grouping assertion finds a casterAtkPct group whose target set is exactly {gws, helm} and passes.",
        "fireRateOk": true,
        "explanation": "Same ⚑3 steady-state collapse as the aura above, same documentation. Basis, bucket, and scope are faithful."
      }
    ],
    "skill2": [
      {
        "kitLine": "after landing 6 normal attack(s) w/o core",
        "category": "DOCUMENTED_GAP",
        "subkind": null,
        "driverSaid": "Modeled jointly via the hitCount:3 core-branch block; ⚑2 documents the blend with the recipe 'effective = 1/(c/3+(1−c)/6) ∈ [3,6]' and a video count between level-up procs.",
        "blindSaid": "S6 hit the SAME engine wall independently and merged to hitCount:5 assuming coreRate≈0.30, with an explicit ⚑ CADENCE MERGE caveat; S2b pre-registered it as a GAP for the same reason.",
        "formulaCheck": "Confirmed engine limitation: core is resolved as a per-shot RATE (coreExposure × ACR) folded into the Major bucket, not as discrete core/non-core hit events, so a hitCount trigger cannot be routed to exactly one of two branches. Authoring both blocks would let every hit feed BOTH counters and roughly double the true EXP rate.",
        "fireRateOk": true,
        "explanation": "Three independent agents converged on the same inexpressibility and all three flagged rather than silently picked a branch — the honest outcome. Note the driver's PREMISE is overstated: scope lock gives coreExposure 1.0, but the realised core-hit fraction is coreExposure × ACR, and an AR without hit-rate support has ACR well under 1, so the 6-non-core branch DOES fire in reality. ⚑2 already carries exactly this hedge, which is what keeps this a documented gap rather than a gotcha; the driver's note prose ('the 6-non-core-hit branch never fires there') should be softened to match its own ⚑2."
      },
      {
        "kitLine": "when hitting the Core for 3 time(s)",
        "category": "FAITHFUL",
        "subkind": null,
        "driverSaid": "hitCount:3, self, grants the EXP atkPct stack.",
        "blindSaid": "S6 merged this branch into hitCount:5; S2b specified requiresCore hitCount:3.",
        "formulaCheck": "Threshold and target match the prose exactly; the missing requiresCore flag is the merge artifact covered by ⚑2 above, not a separate defect. The resulting cap-time (~300 hits ≈ 32s at ~9.45 effective shots/s) is internally consistent with the hitCount:30 level cadence the driver ships.",
        "fireRateOk": true,
        "explanation": "The core-branch threshold is encoded literally and the block is the sole EXP feed, which is the deliberate blended model."
      },
      {
        "kitLine": "EXP: ATK ▲1.81%, stacks up to 100",
        "category": "FAITHFUL",
        "subkind": null,
        "driverSaid": "buff atkPct 1.81, maxStacks 100, self, no durationSec (permanent).",
        "blindSaid": "S6 identical (atkPct 1.81, maxStacks 100, self); S2b identical, flagging 'durationSec on the stack buff' and 'cap conflated with Level 11' as the nearest-wrongs.",
        "formulaCheck": "atkPct is the diluting (1+ΣATK%) term — correct for a plain 'ATK ▲' line, distinct from the casterAtkPct grant above. +181% at cap. Driver's G4 asserts the observed stack count tops out at exactly 100 and never expires; the S5 blind's independent cap/self-scope assertions also pass.",
        "fireRateOk": true,
        "explanation": "Magnitude, bucket, cap, scope and permanence all faithful, and the ramp is native (the engine accrues the stacks) rather than pre-collapsed — notably NOT subject to the steady-state approximation applied elsewhere."
      },
      {
        "kitLine": "when Hero Level is 2 or above",
        "category": "DOCUMENTED_GAP",
        "subkind": null,
        "driverSaid": "passive self buff elemAdvantageDamagePct 7.46; note + caveat state Level 2 is reached ~3s in and call the opening over-credit negligible.",
        "blindSaid": "S6 keyed it to hitCount:50 + resourceGate{min 2}, while itself noting the passive alternative fires at setup when heroLevel is still 1; S2b required 'no 7.46 apply before the FIRST level-up event'.",
        "formulaCheck": "Correct stat (Element bucket, advantage-only) and correct self-only scope — the driver's G5 proves helm never holds 7.46 while it DOES hold the 12.76 S1 aura, which is the sharp self-vs-shared discrimination. The gate error is ~3.2s of 180s on one buff ≈ 0.1% of the carry.",
        "fireRateOk": true,
        "explanation": "The level-2 gate is genuinely absent, but the divergence is named in both the note and the caveats array with its magnitude quantified — a recorded decision, and quantitatively negligible."
      }
    ],
    "burst": [
      {
        "kitLine": "Attack Damage ▲10.14% for 10 sec",
        "category": "FAITHFUL",
        "subkind": null,
        "driverSaid": "burstCast trigger, alliesOfElement Water (excludeSelf false), attackDamagePct 10.14, durationSec 10.",
        "blindSaid": "S6 byte-equivalent; S2b flagged fullBurstEnter as the high-damage nearest-wrong because helm is a co-Burst-III in this fixture.",
        "formulaCheck": "attackDamagePct is the DamageUp bucket ✓. burstCast is the correct trigger identity: with helm as a second Burst III, fullBurstEnter would fire the payload on rotations she did not cast. The S5 blind independently asserts trigger.kind === 'burstCast' on every burst block and passes; the driver's G6 asserts applies == casts × 2 Water allies and 600-frame windows.",
        "fireRateOk": true,
        "explanation": "Scope, stat, trigger identity and wall-clock duration semantics all verified, and the highest-damage shared-prior misread (fullBurstEnter) is provably avoided in a fixture where the two genuinely diverge."
      },
      {
        "kitLine": "Elem Adv Atk Dmg ▲18.75% for 10 sec",
        "category": "FAITHFUL",
        "subkind": null,
        "driverSaid": "same burstCast block, elemAdvantageDamagePct 18.75, durationSec 10.",
        "blindSaid": "S6 identical; S2b warned against folding it into attackDamagePct or generic elementDamagePct.",
        "formulaCheck": "Kept in the Element bucket as elemAdvantageDamagePct, so it is inert without elemental advantage — the S5 blind explicitly checks that no attackDamagePct of 18.75 and no merged 28.89 is ever emitted, and both checks pass.",
        "fireRateOk": true,
        "explanation": "Correctly separated from the Damage-Up line it shares a block with; an advantage-gated buff modeled as unconditional would over-credit the whole comp against any boss."
      },
      {
        "kitLine": "20.87% of final ATK * Hero Level /s",
        "category": "DOCUMENTED_GAP",
        "subkind": null,
        "driverSaid": "burstCast dot, atkPct 229.57 (= 20.87 × 11), durationSec 10, intervalSec 1, target enemy; ⚑3 explicitly admits the FIRST burst lands well before Level 11 and is therefore over-credited.",
        "blindSaid": "S6 dot atkPct 20.87 + perResource{heroLevel, mult 20.87}, same duration/interval/target/crit posture; S2b called flat 20.87 (dropping ×Hero Level) an 11× under-model and asked for a cast-time level snapshot.",
        "formulaCheck": "DoT routing is correct: sustained flavor, no core, no range, FB by tick timing, crit at the DOT_CRIT default. One dot instance per cast is correct for a burst-keyed DoT (the one-instance rule governs continuous passives). 229.57 is the kit's own per-level value × the kit's own cap, so it does not contradict a prose number. The residual is confined to the FIRST cast, which lands early in the chain at roughly Level 3–5 — a ~2–3× over-credit on that one cast's ten ticks, on the order of a low-single-digit percentage of her fight total.",
        "fireRateOk": true,
        "explanation": "This is the single largest quantitative consequence of the steady-state collapse, and the driver documents it precisely — including naming the first-burst case rather than hiding behind the aggregate. Estimate + recipe + evidence tier are all present, so it lands as DOCUMENTED_GAP; it is the item I would put first on the owner's spot-check list."
      }
    ]
  },
  "gotchas": [
    {
      "subkind": "ENCODING",
      "slot": "skill1",
      "summary": "The Hero-Level-Up trigger has no activation cap, so both level-up rewards (10.26% instant reload, 2.44% Max-HP recovery) fire roughly 56 times over a 180s fight instead of the kit-permitted 10 — and the override note asserts this is correct.",
      "evidence": "Kit S1: 'Activates every time EXP stacks 10. … Hero Level Up: Reaches a maximum of Level 11. Hero Level Up Reward: Reloads 10.26%.' Kit S2 caps the feeding currency: 'EXP: ATK ▲ 1.81%, stacks up to 100 time(s)'. The arithmetic closes on itself — 100 EXP ÷ 10 = 10 level-ups = Level 1→11 = the stated cap — so no 11th activation exists under any reading of the prose. The shipped override encodes the reward riders as two unbounded {trigger: hitCount 30, target: self} blocks with no resource and no resourceGate; at ~9.45 effective shots/s (AR 12/s, 60 ammo, 81f reload) that is ~1700 hits ≈ 56 firings. Formula link: reload economy is shot economy is damage (docs/data/game-mechanics.md §2; the reload-speed-affects-damage rule), and the driver's own G2 test measures the block at ~46 extra shots / ~2% of carry damage at the inflated cadence, so the correct 10-firing model is worth ~1/5.6 of that — a ~1.5–1.7% carry over-credit. DRIVER vs BLIND: the note claims 'level-up rewards KEEP TRIGGERING at max level (review-confirmed)', but BOTH blind re-derivations say the opposite and neither is cited — S6 shipped resourceGate {name heroLevel, max 10} with the caveat 'without that gate the hitCount trigger would keep paying rewards forever past Level 11', and S2b pre-registered the inertness as 'stops firing once Level 11 is reached' / 'no level-ups after 100 EXP (rewards stop firing at cap)'.",
      "documentedByDriver": false,
      "severity": "med",
      "suggestedFix": "Kit-literal, no measurement required: declare `resources: [{name: 'heroLevel', initial: 1, min: 1, max: 11}]`, add `{kind: 'resource', name: 'heroLevel', delta: 1}` to the hitCount:30 block, and put `resourceGate: {name: 'heroLevel', max: 10}` on BOTH reward blocks (the instantReload block and the heal block) — i.e. exactly the S6 blind's encoding, which is already validated against this schema. Equivalent minimal alternative if the resource machinery is unwanted: bound the two reward blocks to the first 300 hits. Then add a discriminating assertion neither suite currently has: count instantReload (and heal) events in the fixture and require exactly 10, which fails under the shipped model and passes under the fix. Correct the note's 'review-confirmed' sentence, which no review supports."
    },
    {
      "subkind": "FIDELITY",
      "slot": "skill2",
      "summary": "The note's premise for dropping the 6-non-core EXP branch — 'scope-lock = 100% core exposure, so the 6-non-core-hit branch never fires' — conflates core EXPOSURE with the realised core-hit fraction; the branch does fire in reality.",
      "evidence": "Kit S2 runs two independent counters ('after landing 6 normal attack(s) without hitting the core' / 'when hitting the Core for 3 time(s)'). Formula: the realised core fraction is coreExposure × ACR (damage-calculation.md §1b), and cfg.coreHitRate = 1.0 at scope lock only sets the EXPOSURE term — ACR for an AR without hit-rate support is well below 1 under the live UNIGEO model (only AR at ▲80 hit rate is all-core geometrically). So non-core hits are common and the shipped hitCount:3 over-states the EXP accrual rate. DRIVER vs BLIND: the driver assumed c = 1 (3 hits/EXP); the S6 blind assumed c ≈ 0.30 (5 hits/EXP); the true value lies between and is unmeasured. The driver's own ⚑2 already carries the correct hedge and the correct recipe ('effective = 1/(c/3+(1−c)/6) ∈ [3,6]'), which is why this is a low-severity documentation defect rather than an undocumented divergence.",
      "documentedByDriver": true,
      "severity": "low",
      "suggestedFix": "No encoding change and no refit — the merged block is the honest model given the engine cannot partition core from non-core per hit. Soften the note's prose so it agrees with its own ⚑2 (say 'the core branch dominates at scope-lock exposure; the non-core branch is folded in at an unmeasured blend', not 'never fires'), and keep the ⚑2 recipe (focus video, count hits between level-up procs) as the measurement route. Consequence to record: since the true cadence is slower than 3 hits/EXP, both the EXP-stack cap time and the Level-11 arrival are LATER than the note's ~32s estimate, which lengthens the window the ⚑3 steady-state collapse over-credits."
    }
  ],
  "discriminationOk": false,
  "faithfulnessScore": "0.75",
  "verdict": "NO-GO(faithfulness)",
  "verdictRationale": "On the crux the driver put to me, I rule FOR the driver: the Level-11 steady-state collapse is FAITHFUL-as-calibrated, not a faithfulness break. Its magnitudes are the kit's own per-level values times the kit's own cap (12.76 = 1.16×11, 10.01 = 0.91×11, 229.57 = 20.87×11) so they contradict no prose number and fall under the magnitude-out-of-scope rule; the divergence is confined to the ramp TRAJECTORY, which is recorded as ⚑3 with an estimate, a refit recipe, and a measured-accurate residual behind it — the contract's definition of DOCUMENTED_GAP. That all three blind models re-derived the literal ramp is expected and is weak evidence: they are the same model reading the same prose, and the S6 blind could not itself clear the risk that perResource may not resolve for ally targets, which the driver's plain-buff encoding avoids. The three S5 reds are all this same encoding question (T9/T10/T12), and T12's behavioural half passes; every behavioural faithfulness assertion in the blind suite is green. I am nonetheless returning NO-GO on a DIFFERENT finding that neither test suite looks for. The Hero-Level-Up trigger ships with no activation cap, so the two level-up rewards fire ~56 times instead of the 10 the kit permits — the prose closes its own arithmetic (100 EXP cap ÷ 10 per level = 10 level-ups = the stated Level 11 cap), both blind agents independently specified the cap (S6 as resourceGate{max 10}, S2b as 'rewards stop firing at cap'), and the override note asserts the opposite as 'review-confirmed' with no review supporting it. The reload rider is damage-positive and the driver's own G2 test prices it at ~2% of carry damage at the inflated cadence, so the shipped model over-credits her by roughly 1.5–1.7%; per the fire-rate check, a block firing at 5.6× its prose-implied cadence is a REAL-GOTCHA even with every structural assertion green. This is exactly the kind of finding the blind pass exists to produce, and it is invisible to both suites — hence discriminationOk false: the load-bearing 'cap 11' line has no discriminating assertion anywhere, in either the driver's G1–G7 or the blind's 14 groups. For GO: gate both reward blocks to 10 firings (S6's resource + resourceGate encoding, no measurement needed), add an event-count assertion that fails under the current model, and correct the note's 'review-confirmed' claim; also soften the skill2 note prose so it matches its own ⚑2 rather than claiming the non-core branch never fires. Same-model residual for the owner to spot-check, ranked: (1) the first burst's DoT, which the driver openly admits ticks at Level 11 while she is really around Level 3–5 — the single largest quantitative approximation on the file and the first thing a solo footage read should settle; (2) whether the ~26%-hot normal-fire cadence (⚑1: pullsPerSec 12 / reloadFrames 81) is silently absorbing part of the steady-state over-credit, since a hot fire rate and an early-peaked ATK ramp would compensate each other and both are unmeasured.",
  "model": "claude-opus-5"
}

```

---

# PART 3 — UPDATED DRIVER OVERRIDE (post-fix)

```json
{
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Remove this banner only when the unit has been measured/hand-tuned. || BANNER SCOPE (kit-parse AUTHOR wave 6): the banner applies to the AUTHORED skill2 slot + the ADDITIVE skill1 heal-event block ONLY. skill1 aura/reload blocks + the entire burst slot are PRESERVED VERBATIM from the partial-hand model — kit-status residual: 'burst DoT + Hero-Level auras MEASURED accurate' — do NOT regenerate them. || MODEL: Hero Level currency (prior 4, DERIVABLE): EXP +1 per 3 core hits (the core branch DOMINATES at scope-lock core exposure 1.0; the 6-non-core-hit branch is folded in at an unmeasured blend — note the realised core-hit fraction is exposure × ACR, and ACR < 1 for an AR without hit-rate support, so non-core hits DO occur and the true cadence is slower than 3 hits/EXP — blended-rate ⚑2), 10 EXP = +1 Hero Level, cap 11 (~30 hits/level at the pure-core branch → level 11 in ~25s firing / ~28s wall, 60 ammo, 81f reload; later in reality per ⚑2). skill1 (PRESERVED): Water-ally passive auras at level-11 steady-state — elemAdvantageDamagePct 1.16x11=12.76, casterAtkPct 0.91x11=10.01; level-up rewards are CAPPED at 10 firings — kit arithmetic self-closes: S2 EXP cap 100 ÷ 10 EXP/level = 10 level-ups = Level 1→11 = the stated cap, so there is no 11th reward. Modeled via a heroLevel resource pool (initial 1, max 11) incremented once per hitCount-30 level-up, with resourceGate {heroLevel max 10} on BOTH reward blocks (instantReload 0.1026 + heal). [gauntlet S7: the prior uncapped hitCount-30 fired ~56× = REAL-GOTCHA; both blind agents (opus S6 resourceGate{max10}, fable S2b 'rewards stop at cap') had specified the cap; the old 'review-confirmed keep triggering at max level' claim was unsupported and is retracted.] skill1 (NEW, additive, HARD RULE 2): the level-up reward 'Recovers 2.44% of the skill user's final Max HP' was previously a SILENT DROP — now a `heal` event block on the same hitCount-30 cadence, self-target, event-only (zero self-damage impact; exists so recovery-consumer teammates, e.g. crown, see the proc). Driver may strip if strict-verbatim wins — flagged in findings. skill2 (AUTHORED): EXP ATK stack → hitCount 3 (core branch; was materialized hitCount 6 = the non-core branch, inconsistent with the preserved skill1 hitCount-30 level cadence which assumes 3 hits/EXP) x atkPct 1.81, maxStacks 100 (+181% at cap; engine ramps the stack natively — cap at ~32s wall, no haircut needed); 'Hero Level 2 or above' elemAdvantageDamagePct 7.46 → passive (level 2 at ~3s in; first-3s over-credit negligible). burst (PRESERVED): burstCast Water-ally attackDamagePct 10.14 + elemAdvantageDamagePct 18.75 (10s); burstCast dot 229.57%/s x10s on the boss (=20.87x11; steady-state level-11 snapshot — NOTE the FIRST burst lands at ~5s on an early B1->B2->B3 chain, NOT at 40s CD, so its DoT is over-credited at level 11 vs the true low-level value; later ~40s-CD bursts genuinely reach level 11. Part of the measured-accurate steady-state collapse — see ⚑3). || ⚑ NEEDS-MEASUREMENT: (⚑1 TOP, cadence tuple — MANDATORY + ESCALATED) pullsPerSec 12 (datamined rate_of_fire 720) + reloadFrames 81: the measured residual already reads normal-fire ~26% HOT with these values (kit-status U8; 12/1.26≈9.5/s is the arithmetic suspect) — owner ruling: do NOT refit by fudge; pin via focus video rounds/min + reload gap, then fix via charFixes. (⚑2) EXP build blend: shipped 3 hits/stack (100% core); if the real core-hit fraction c<1, effective = 1/(c/3+(1-c)/6) ∈ [3,6] — recipe: focus video, count hits between level-up procs (30 hits/level = pure core branch). (⚑3, low) level-11 steady-state collapse: auras are passive full-value from t=0 (no ~25s ramp haircut) AND the burst DoT snapshots level 11 on EVERY cast including the first (~5s, before level 11 is reached — the first-burst DoT is over-credited; later ~40s-CD bursts genuinely reach level 11). Both are deliberate steady-state approximations, measured-accurate per residual ('burst DoT + Hero-Level auras measured accurate'); keep unless a future solo read disagrees. Recipe (if ever refit): ramp the auras 1.16xL / 0.91xL over the level trajectory and snapshot the DoT at cast-time level. Cross-family S2b (claude-fable-5) independently flagged the ramp as the literal-kit refinement; reconciled to FAITHFUL-as-calibrated, not a faithfulness break. || SKIPS: none — every kit line is represented (the non-core EXP line jointly via the blended hitCount-3 block, see ⚑2). || Kit-autonomy gauntlet 2026-07-25: all 12 load-bearing lines pinned by scripts/tests/units/guillotine-winter-slayer.test.ts (18 tests, GREEN); cross-family S2b (claude-fable-5) converged on every line incl. the heal-inertness / reload-load-bearing / casterAtk-flat / Water-scope / burstCast-vs-fullBurstEnter / DoT-x11 discriminators; the single reviewer FIX (Hero-Level ramp) reconciled to FAITHFUL-as-calibrated steady-state per ⚑3. S7 judge (claude-opus-5) ruled the steady-state collapse FAITHFUL-as-calibrated but NO-GO'd the uncapped level-up rewards (REAL-GOTCHA) — FIXED: heroLevel resource pool + resourceGate{max10} cap the rewards at 10 firings (the kit-permitted count), with a discriminating uncapped-counterfactual assertion; note's unsupported 'review-confirmed keep triggering' claim retracted and the skill2 'never fires' prose softened to match ⚑2.",
  "unmodeled": {
    "skill1": [],
    "skill2": [],
    "burst": []
  },
  "caveats": [
    "skill1/skill2: normal-fire cadence (12/s, reload 81f) is datamined and measured ~26% hot — flagged for video measurement, deliberately NOT refit",
    "skill2: EXP build rate modeled at 3 hits/stack (core branch at scope-lock 100% core exposure); the blend with the 6-hit non-core branch is an unmeasured estimate",
    "skill2: Elemental Advantage Attack Damage 7.46% modeled as passive (Hero Level 2 is reached ~3s into the fight)"
  ],
  "resources": [
    {
      "name": "heroLevel",
      "initial": 1,
      "min": 1,
      "max": 11
    }
  ],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "passive"
      },
      "target": {
        "kind": "alliesOfElement",
        "element": "Water"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "elemAdvantageDamagePct",
          "value": 12.76
        },
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 10.01
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "hitCount",
        "count": 30
      },
      "target": {
        "kind": "self"
      },
      "resourceGate": {
        "name": "heroLevel",
        "max": 10
      },
      "effects": [
        {
          "kind": "instantReload",
          "fraction": 0.1026
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "hitCount",
        "count": 30
      },
      "target": {
        "kind": "self"
      },
      "resourceGate": {
        "name": "heroLevel",
        "max": 10
      },
      "effects": [
        {
          "kind": "heal"
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "hitCount",
        "count": 30
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "resource",
          "name": "heroLevel",
          "delta": 1
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "hitCount",
        "count": 3
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 1.81,
          "maxStacks": 100
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "passive"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "elemAdvantageDamagePct",
          "value": 7.46
        }
      ]
    }
  ],
  "burst": [
    {
      "slot": "burst",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "alliesOfElement",
        "element": "Water"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 10.14,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "elemAdvantageDamagePct",
          "value": 18.75,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "burst",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "dot",
          "atkPct": 229.57,
          "durationSec": 10,
          "intervalSec": 1
        }
      ]
    }
  ]
}

```

---

# PART 4 — UPDATED DRIVER TEST (post-fix, full)

```ts
// PER-UNIT KIT SPEC — `guillotine-winter-slayer` (Guillotine: Winter Slayer, aka "gws";
// AR / Attacker / Water / Burst III, cd 40s, ammo 60). Kit-autonomy gauntlet 2026-07-25.
//
// VARIANT — its base counterpart is `guillotine` (Guillotine, MG/Electric), an ENTIRELY different
// unit. This file is about the AR/Water variant ONLY. (The slug-disambiguation lint flags the base
// token "guillotine" inside the hyphenated slug itself — a known false positive; the unit here is
// unambiguous by full slug + full name + approved nickname "gws".)
//
// One assertion group per KIT LINE (G1..G7), asserted against the SHIPPED override loaded from disk.
// `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model each
// assertion discriminates against) — never to supply the encoding under test.
//
// THE MODELING ABSTRACTION (read first): gws has a "Hero Level" currency — EXP +1 per 3 core hits
// (scope-lock = 100% core exposure, so the 6-non-core-hit branch never fires), 10 EXP = +1 level,
// cap 11. The override COLLAPSES the ramp to its level-11 STEADY STATE (reached ~25-32s in; the
// first burst lands at 40s CD, so level 11 is guaranteed by then). Every "× Hero Level" magnitude
// is therefore pinned at ×11. This is the measured-accurate model (kit-status residual: "burst DoT
// + Hero-Level auras measured accurate"). The level-11 pins below (12.76 = 1.16×11, 229.57 =
// 20.87×11) are what DISCRIMINATE the steady-state model from a level-1 (×1) counterfactual.
//
// Kit (blablalink prose, data/characters.json → characters['guillotine-winter-slayer'].skills):
//   S1 ■ every 10 EXP → Hero Level Up (max 11); reward: Reloads 10.26%               [G2]
//                                                reward: Recovers 2.44% final Max HP  [G3]
//      ■ on Hero level up → all Water Code allies:
//          Elemental Advantage Attack Damage ▲ 1.16% × Hero Level continuously         [G1]  (×11 = 12.76)
//          ATK ▲ 0.91% of skill user's ATK × Hero Level continuously                   [G1]  (×11 = 10.01% → flat)
//   S2 ■ 6 normal hits w/o core → EXP: ATK ▲ 1.81%, stacks ×100  (non-core branch —    [G4]  jointly
//      ■ 3 core hits          → EXP: ATK ▲ 1.81%, stacks ×100   (core branch, fires)   [G4]  modeled)
//      ■ Hero Level 2+ → self: Elemental Advantage Attack Damage ▲ 7.46% continuously  [G5]
//   BU ■ all Water Code allies: Attack Damage ▲ 10.14% / 10s                            [G6]
//                               Elemental Advantage Attack Damage ▲ 18.75% / 10s        [G6]
//      ■ highest-final-MaxHP enemy: 20.87% of final ATK × Hero Level / sec / 10s        [G7]  (×11 = 229.57/s)
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   G1  the auras target WATER-CODE ALLIES ONLY — in this comp that is gws + helm, NOT liter/crown.
//       Proven two ways: the buffApply target set is exactly {gws, helm}, AND removing the auras
//       drops gws AND helm damage while leaving crown (Fire) byte-identical. An unscoped all-ally
//       aura would also reach liter/crown — the target-set assertion is one that model provably fails.
//       The value 12.76 (=1.16×11) discriminates the level-11 steady state from a level-1 (1.16) ramp.
//   G2  the reload reward is LOAD-BEARING: removing it costs ~46 shots and ~2% damage over the fight
//       (the 10.26% mag top-up every 30 hits cuts natural reloads). A dropped/inert reload block
//       would leave the shot count unchanged — it does not.
//   G3  the heal reward is an EVENT, not a number: it is self-targeted, no HP pool is modeled, and no
//       ally in this comp watches gws's SELF-recovery — so it must change NO unit's damage by a point
//       (the counterfactual risk is someone encoding 2.44% as a damage buff). The block must also be
//       PRESENT (the line is represented as a recovery event, not silently dropped — hard rule 2).
//       Its recovery-consumer observable is unexercised HERE (no ally-recovery-watcher in the comp).
//   G4  the EXP ATK stack is self-scoped, value 1.81/stack, and HONORS its ×100 cap: the observed
//       stack count tops out at exactly 100 (an uncapped stack would exceed it; a flat non-stacking
//       buff would never show stacks>1). It is permanent (no wall-clock expiry).
//   G5  the Hero-Level-2 elem-advantage is SELF-ONLY — gws holds 7.46 but helm does NOT (unlike the
//       G1 auras which ARE shared). Value 7.46, permanent. The self-vs-shared split vs G1 is the point.
//   G6  the burst buffs reach exactly the 2 Water allies for exactly 10s (600f), once per cast. Scope
//       (not liter/crown) + duration (600f, not permanent) are the discriminators.
//   G7  the burst DoT magnitude is 229.57%/tick (=20.87×11), 10 ticks per cast, in the burst bucket —
//       NOT the level-1 value 20.87. 6 casts × 10 ticks = 60 instances over the fight.
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / gws B3 / helm B3, boss Fire so gws
// is elementally ADVANTAGED — required to make elemAdvantageDamagePct live), focus gws. gws needs the
// real rotation to cast her burst at all. Deterministic (no seed). Event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const SLUG = 'guillotine-winter-slayer';
/** controlComp slot order: liter 0 / crown 1 / gws 2 / helm 3. */
const LITER = 0;
const CROWN = 1;
const GWS = 2;
const HELM = 3;
/** The two Water-Code allies in this comp (liter=Fire, crown=Fire are excluded from Water grants). */
const WATER_ALLIES = [GWS, HELM];

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp(SLUG),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches ------------------------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);
const hasKind = (b: any, kind: string) =>
  b.effects.some((e: any) => e.kind === kind);

/** G1 counterfactual: her S1 passive auras (the level-11 steady-state Water-ally grants) removed. */
const gwsNoAuras = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => b.trigger.kind !== 'passive');
  if (ov.skill1.length === before)
    throw new Error('gws S1 passive aura block missing — fixture is stale');
});
/** G2 counterfactual: her S1 level-up reload reward removed. */
const gwsNoReload = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasKind(b, 'instantReload'));
  if (ov.skill1.length === before)
    throw new Error('gws S1 instantReload block missing — fixture is stale');
});
/** G3 counterfactual: her S1 level-up heal reward removed. */
const gwsNoHeal = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasKind(b, 'heal'));
  if (ov.skill1.length === before)
    throw new Error('gws S1 heal block missing — fixture is stale');
});
/** G2/G3 counterfactual: the level-CAP removed (resourceGate stripped from both reward blocks),
 *  so the level-up rewards fire on EVERY 30-hit cadence (~56×) instead of the kit-permitted 10×.
 *  The kit's arithmetic is self-closing: S2 caps EXP at 100, S1 levels per 10 EXP → 100/10 = 10
 *  level-ups = Level 1→11 = the stated cap, so there is no 11th level-up reward under any reading. */
const gwsNoGate = withPatchedOverride(SLUG, (ov) => {
  let removed = 0;
  for (const b of ov.skill1 as any[]) {
    if (b.resourceGate?.name === 'heroLevel') {
      delete b.resourceGate;
      removed++;
    }
  }
  if (removed < 2)
    throw new Error(
      'gws S1 reward blocks missing the heroLevel resourceGate — fixture is stale',
    );
});

// ---- runs (hoisted: each is a full 180s sim) -------------------------------------------------
const base = run();
const noAuras = run({ [SLUG]: gwsNoAuras });
const noReload = run({ [SLUG]: gwsNoReload });
const noHeal = run({ [SLUG]: gwsNoHeal });
const noGate = run({ [SLUG]: gwsNoGate });

// ---- readers ---------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const gwsBuffs = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.casterIdx === GWS);
const gwsShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === SLUG);
const gwsBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === SLUG);
const gwsDamage = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  dmg(evs).filter((d) => d.slug === SLUG && d.srcSlot === srcSlot);
const targetSet = (bs: BuffApply[]) =>
  [...new Set(bs.map((b) => b.targetIdx))].sort((a, b) => a! - b!);

describe('guillotine-winter-slayer — kit spec', () => {
  describe('G1 — S1 Hero-Level auras are Water-Code-ally scoped, at the level-11 steady state', () => {
    // The S1 aura is the SHARED elem-advantage line (reaches helm); the S2 7.46 line is self-only
    // (G5) and never reaches helm — so helm's permanent holding isolates the S1 aura cleanly.
    const helmAura = gwsBuffs(base.events).filter(
      (b) =>
        b.stat === 'elemAdvantageDamagePct' &&
        b.targetIdx === HELM &&
        b.expiresFrame === null,
    );
    const s1ElemAdv = gwsBuffs(base.events).filter(
      (b) => b.stat === 'elemAdvantageDamagePct' && b.value === 12.76,
    );
    const casterAtk = gwsBuffs(base.events).filter(
      (b) => b.stat === 'casterAtkPct' && b.expiresFrame === null,
    );

    it('grants Elemental Advantage Attack Damage 12.76% (= 1.16 × Hero Level 11), not level-1 1.16%', () => {
      expect(
        helmAura.length,
        'no shared elemAdvantageDamagePct aura reached helm',
      ).toBeGreaterThan(0);
      expect([...new Set(helmAura.map((b) => b.value))]).toEqual([12.76]);
    });

    it('grants the ATK-of-caster aura as a flat add (= 0.91% × 11 of her ATK), permanent', () => {
      expect(
        casterAtk.length,
        'no passive casterAtkPct aura was applied',
      ).toBeGreaterThan(0);
      const vals = [...new Set(casterAtk.map((b) => b.value))];
      expect(vals.length).toBe(1);
      expect(
        vals[0],
        'casterAtkPct must resolve to a positive flat ATK add',
      ).toBeGreaterThan(0);
      expect(casterAtk.every((b) => b.expiresFrame === null)).toBe(true);
    });

    it('reach ONLY the Water-Code allies (gws + helm), never liter/crown', () => {
      expect(targetSet(s1ElemAdv)).toEqual(WATER_ALLIES);
      expect(targetSet(casterAtk)).toEqual(WATER_ALLIES);
    });

    it('DISCRIMINATING: removing the auras drops gws AND helm, but leaves Fire crown byte-identical', () => {
      expect(noAuras.totals[SLUG]).toBeLessThan(base.totals[SLUG]);
      expect(noAuras.totals.helm).toBeLessThan(base.totals.helm);
      // crown is Fire — an unscoped all-ally aura would have lifted her too; the scoped model does not.
      expect(noAuras.totals.crown).toBe(base.totals.crown);
    });
  });

  describe('G2 — S1 level-up reload reward (Reloads 10.26%) is load-bearing AND capped at 10 level-ups', () => {
    it('is a hitCount-30 self instantReload of fraction 0.1026 in the shipped override', () => {
      const ov = loadOverride(SLUG)!;
      const blk = (ov.skill1 as any[]).find((b) => hasKind(b, 'instantReload'));
      expect(blk, 'no instantReload block in skill1').toBeTruthy();
      expect(blk.trigger).toEqual({ kind: 'hitCount', count: 30 });
      expect(blk.target).toEqual({ kind: 'self' });
      expect(
        blk.effects.find((e: any) => e.kind === 'instantReload').fraction,
      ).toBe(0.1026);
    });

    // The kit bounds the level-up rewards: S2 caps EXP at 100, S1 levels per 10 EXP, so
    // 100/10 = 10 level-ups = Level 1→11 = the stated cap. The rewards must therefore fire
    // EXACTLY 10×, not on every 30-hit cadence for the whole fight (~56×). The engine emits no
    // countable reload/heal EVENT, so the cap is pinned STRUCTURALLY (a heroLevel resource pool
    // max 11, incremented once per level-up, gating the rewards at ≤10) and discriminated
    // BEHAVIOURALLY below (uncapping it over-fires the reload rider).
    it('is gated to the first 10 level-ups by a heroLevel resource pool (cap 11) + resourceGate', () => {
      const ov = loadOverride(SLUG)! as any;
      const pool = (ov.resources ?? []).find(
        (r: any) => r.name === 'heroLevel',
      );
      expect(pool, 'no heroLevel resource pool declared').toBeTruthy();
      expect(pool.max).toBe(11);
      // both reward blocks (reload + heal) carry the gate; an increment block feeds the pool.
      const gated = (ov.skill1 as any[]).filter(
        (b) => b.resourceGate?.name === 'heroLevel',
      );
      expect(gated.length).toBe(2);
      for (const b of gated) expect(b.resourceGate.max).toBe(10);
      const increment = (ov.skill1 as any[]).find((b) =>
        hasKind(b, 'resource'),
      );
      expect(increment, 'no heroLevel increment block').toBeTruthy();
      expect(
        increment.effects.find((e: any) => e.kind === 'resource'),
      ).toMatchObject({
        name: 'heroLevel',
        delta: 1,
      });
    });

    it('adds shots over the fight (removing it costs shots and damage)', () => {
      const baseShots = gwsShots(base.events).length;
      const noReloadShots = gwsShots(noReload.events).length;
      expect(baseShots).toBeGreaterThan(noReloadShots);
      expect(base.totals[SLUG]).toBeGreaterThan(noReload.totals[SLUG]);
    });

    it('DISCRIMINATING: uncapping the gate over-fires the reload rider (~56× vs 10×) → more shots', () => {
      // Removing the resourceGate lets the reload reward fire on EVERY 30-hit cadence for the whole
      // fight instead of the kit-permitted 10× — proving the gate is live and bounding the cadence.
      expect(gwsShots(base.events).length).toBeLessThan(
        gwsShots(noGate.events).length,
      );
      expect(base.totals[SLUG]).toBeLessThan(noGate.totals[SLUG]);
    });
  });

  describe('G3 — S1 level-up heal reward (Recovers 2.44% final Max HP) is an event, not a number', () => {
    it('is PRESENT in the shipped override as a self heal event on the level-up cadence (not dropped)', () => {
      const ov = loadOverride(SLUG)!;
      const blk = (ov.skill1 as any[]).find((b) => hasKind(b, 'heal'));
      expect(
        blk,
        'the 2.44% Max HP recovery line must be represented, not silently dropped',
      ).toBeTruthy();
      expect(blk.trigger).toEqual({ kind: 'hitCount', count: 30 });
      expect(blk.target).toEqual({ kind: 'self' });
      expect(blk.effects.some((e: any) => e.kind === 'heal')).toBe(true);
      // same level-cap as the reload rider: the recovery event fires on the first 10 level-ups only.
      expect((blk as any).resourceGate).toEqual({ name: 'heroLevel', max: 10 });
    });

    it("changes NO unit's damage by a single point (event-only self-heal, no HP pool, no damage bucket)", () => {
      // The counterfactual risk: encoding 2.44% as a damage buff. A faithful heal event is inert on
      // every total. (Its recovery-consumer observable is unexercised in THIS comp — no ally watches
      // gws's SELF-recovery — so the inertness, not a consumer firing, is the assertable property.)
      expect(base.totals).toEqual(noHeal.totals);
    });
  });

  describe('G4 — S2 EXP ATK stack: ATK ▲ 1.81% per stack, self-scoped, capped at 100, permanent', () => {
    const stacks = gwsBuffs(base.events).filter(
      (b) => b.stat === 'atkPct' && b.value === 1.81,
    );

    it('is live and ramps to exactly the ×100 cap (never exceeding it)', () => {
      expect(stacks.length, 'no EXP ATK stack was applied').toBeGreaterThan(
        100,
      );
      const maxStacks = Math.max(...stacks.map((b) => b.stacks));
      expect(maxStacks, 'stack count must top out at the kit cap of 100').toBe(
        100,
      );
      expect(
        stacks.some((b) => b.stacks === 100),
        'cap must actually be reached and held',
      ).toBe(true);
    });

    it('is self-scoped (gws only) and permanent (no wall-clock expiry)', () => {
      expect(targetSet(stacks)).toEqual([GWS]);
      expect(stacks.every((b) => b.expiresFrame === null)).toBe(true);
    });
  });

  describe('G5 — S2 Hero-Level-2 Elemental Advantage is SELF-only (not shared with helm)', () => {
    const selfElemAdv = gwsBuffs(base.events).filter(
      (b) => b.stat === 'elemAdvantageDamagePct' && b.value === 7.46,
    );

    it('is 7.46%, held by gws alone, permanent', () => {
      expect(
        selfElemAdv.length,
        'no self elemAdvantageDamagePct 7.46 buff',
      ).toBeGreaterThan(0);
      expect(
        targetSet(selfElemAdv),
        'the 7.46 line affects SELF only — helm must not hold it',
      ).toEqual([GWS]);
      expect(selfElemAdv.every((b) => b.expiresFrame === null)).toBe(true);
    });

    it('is distinct from the shared G1 aura (helm holds 12.76 but NOT 7.46)', () => {
      const helmHolds = buffs(base.events).filter(
        (b) =>
          b.targetIdx === HELM &&
          b.stat === 'elemAdvantageDamagePct' &&
          b.value === 7.46,
      );
      expect(helmHolds.length).toBe(0);
    });
  });

  describe('G6 — burst grants Water-Code allies Attack Damage 10.14% + Elem Advantage 18.75% for 10s', () => {
    const bursts = gwsBursts(base.events);
    const atkDmg = gwsBuffs(base.events).filter(
      (b) => b.stat === 'attackDamagePct' && b.value === 10.14,
    );
    const elemAdv = gwsBuffs(base.events).filter(
      (b) => b.stat === 'elemAdvantageDamagePct' && b.value === 18.75,
    );

    it('casts bursts in the fixture', () => {
      expect(bursts.length).toBeGreaterThan(0);
    });

    it('reach exactly the 2 Water allies, once per cast, for exactly 10s (600f)', () => {
      for (const bs of [atkDmg, elemAdv]) {
        expect(bs.length, 'burst Water-ally buff missing').toBe(
          bursts.length * WATER_ALLIES.length,
        );
        expect(targetSet(bs)).toEqual(WATER_ALLIES);
        for (const b of bs) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });
  });

  describe('G7 — burst DoT: 20.87% × Hero Level 11 (= 229.57%) of ATK per second for 10s on the boss', () => {
    const dots = gwsDamage(base.events, 'burst');
    const bursts = gwsBursts(base.events);

    it('ticks at the level-11 magnitude 229.57%, NOT the level-1 value 20.87%', () => {
      expect(dots.length, 'no burst DoT damage landed').toBeGreaterThan(0);
      expect([...new Set(dots.map((d) => d.atkPct))]).toEqual([229.57]);
    });

    it('lands 10 ticks per cast (1/s × 10s), in the burst bucket', () => {
      expect(dots.length).toBe(bursts.length * 10);
      expect([...new Set(dots.map((d) => d.bucket))]).toEqual(['burst']);
    });
  });
});

```