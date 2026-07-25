# S7 JUDGE PACKET — `arcana` (BASE Arcana, RL/Supporter/Electric/Burst II) — compact, answer-faithful compilation of the gauntlet artifacts

⚠ EXACT SLUG: base `arcana` (RL/Electric/B2). NOT `arcana-fortune-mate` (SG/Fire/B2). Driver model family: Qwen. Blind/review families: Claude (fable-5 pre-op S2b; opus-5 post-op S5/S6/S7).

## 0. Grading methodology + output contract (RECONCILING-JUDGE.md)

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


## 1. Ground truth — kit prose (data/characters.json → characters.arcana.skills, level-10 values)

burstCooldownSec: 40s. weapon RL, class Supporter, element Electric, burst II. normalAttackMultiplier 64.04, ammo 6, reloadFrames 171, chargeFrames 60.

skill1 (Awakened Destiny):
■ Activates when Full Burst ends. Affects all Burst 3 Electric Code allies who previously cast their Burst Skill if self is in Wheel of Fortune status.
The Magician: Cooldown of Skill 2 ▼ 75% for 15 sec.
Attack damage ▲ 180% for 15 sec.
■ Activates when Full Burst ends. Affects all allies.
ATK ▲ 5% of the skill user's ATK for 10 sec.

skill2 (Cycle of Destiny):
■ Activates when Full Burst ends. Affects all Burst 3 Electric Code allies who previously cast their Burst Skill if self is in Wheel of Fortune status.
Strength: ATK ▲ 180% of the skill user's ATK for 15 sec.
■ Activates when Full Burst ends. Affects all allies if self is in Wheel of Fortune status.
Death: Cooldown of Burst Skill ▼ 6 sec.
ATK ▲ 50% of the skill user's ATK for 5 sec.
■ Activates when Full Burst ends. Affects all allies.
Attack damage ▲ 7.5% for 10 sec.

burst (Shackles of Destiny):
■ Affects all Electric Code allies.
Wheel of Fortune: Attack damage ▲ 10% for 10 sec.
■ Affects all enemies.
Deals 300% of final ATK as Burst Skill damage.
Judgement: Damage taken ▲ 10% for 10 sec.

Level-10 magnitudes (description_value_list index 9): S1 180% AD / 5% casterATK; S2 180% casterATK / burstCdr 6s / 50% casterATK / 7.5% AD; burst 10% AD (Wheel) / 300% flatDamage / 10% damageTaken (Judgement). The Magician = S2 CD ▼75% for 15s.

## 2. Damage-formula SSOT (summary; docs/data/damage-calculation.md + game-mechanics.md)

Multiplicative buckets: ATK × major × element × charge × dmgUp × taken × distributed. attackDamagePct = generic Damage-Up bucket (additive within bucket). casterAtkPct = flat ATK add derived from the CASTER's ATK (the engine stores it as an ABSOLUTE ATK value = casterATK × pct/100, NOT a percentage — this is the source of the blind test's value-filter bug, §8). atkPct = % of each target's OWN ATK. burstCast damage resolves PRE-FB (FB-exempt, no +50% FB major). fullBurstEnd fires AFTER the ~10s FB window closes. ownBurstGate:'cast' = block fires iff the owner cast her burst this rotation (evaluated against rotationCasters, which sim.ts resets AFTER the fullBurstEnd triggers fire — sim.ts:2246 fireTriggered precedes :2252 rotationCasters=[]). burstCdr mutates burstCdFrames directly (NO event). Boss-held debuffs emit buffApply with casterIdx===null AND targetIdx===null.

## 3. Driver's override (src/skills/overrides/arcana.json, structural — AFTER the gate FIX)

  skill1[0]: trigger=fullBurstEnd target=burstCasters stage3 Electric ownBurstGate:cast → attackDamagePct 180/15s
  skill1[1]: trigger=fullBurstEnd target=allies → casterAtkPct 5/10s
  skill2[0]: trigger=fullBurstEnd target=burstCasters stage3 Electric ownBurstGate:cast → casterAtkPct 180/15s
  skill2[1]: trigger=fullBurstEnd target=allies ownBurstGate:cast → burstCdr 6s, casterAtkPct 50/5s
  skill2[2]: trigger=fullBurstEnd target=allies → attackDamagePct 7.5/10s
  burst[0]: trigger=burstCast target=alliesOfElement Electric → attackDamagePct 10/10s
  burst[1]: trigger=burstCast target=enemy → flatDamage atkPct300, damageTakenPct 10/10s
unmodeled.skill1: ["The Magician: Cooldown of Skill 2 ▼ 75% for 15 sec."]
unmodeled.skill2: []  unmodeled.burst: []

GATE FIX (this gauntlet): the three WoF-gated blocks (skill1[0] 180%AD, skill2[0] Strength 180%casterATK, skill2[1] Death) changed from parser-baseline everyN:2 offset:1 → ownBurstGate:'cast'. See §8 for the full rationale + evidence.

## 4. S2b pre-op adversarial review (claude-fable-5, CROSS-FAMILY)

leakDetected: "No leak in the redacted methodology itself. However, the effect-schema excerpt (types.ts teamHas comment) contains a name-stripped example — \"override's team buffs are DEAD 'without a Burst-III Electric caster present'\" — whose gate shape (Burst-III + Electric caster requirement) exactly matches this unit's skill1/skill2 target clause, and it hints the shipped override encodes teamHas{burst:'III', element:'Electric'}. Treated as a partial structural leak; all dispositions below were derived from the kit prose alone."
loadBearingSet: [
 "skill1:AD▲180%/15s (WoF-gated, B3-Electric-casters)",
 "skill1:casterATK▲5%/10s (ungated, all allies)",
 "skill2:Strength casterATK▲180%/15s",
 "skill2:Death burstCdr 6s (all allies)",
 "skill2:casterATK▲50%/5s (all allies)",
 "skill2:AD▲7.5%/10s (ungated, all allies)",
 "burst:Wheel of Fortune AD▲10% (Electric, self-status source)",
 "burst:300% flat burst hit (noFb)",
 "burst:Judgement damageTaken▲10%/10s (boss debuff)"
]
unmodeledVerbatim: {"skill1":["The Magician: Cooldown of Skill 2 ▼ 75% for 15 sec."],"skill2":[],"burst":[]}
spec (per-line disposition):
  [skill1] The Magician: CD of Skill 2 ▼ 75% → GAP: trigger=fullBurstEnd, gated on self Wheel of Fortune status (only rotations arcana cast her burst); target=burstCasters{stage:3, element:'Electric'} — B3 Electric allies who cast burst this rotation; never arcana (B2), never non-casters; nearestWrong=Silently dropped as 'utility, no damage' with no unmodeled record; or approximated by permanently shrinking an ally's interval-trigger sec (unwindowed, ungated)
  [skill1] Attack damage ▲ 180% for 15 sec → FAITHFUL (LOAD-BEARING): trigger=fullBurstEnd + Wheel-of-Fortune self-status gate; practical encoding ownBurstGate:'cast' composed with fullBurstEnd; target=burstCasters{stage:3, element:'Electric'}; excludes arcana (B2) and non-casting Electric allies; nearestWrong=Keyed to fullBurstEnter (moves 180% Damage-Up INTO the FB window, stacking with the +50% FB major — dominant over-credit), and/or ungated on WoF (fires every rotation despite her 40 s burst CD)
  [skill1] ATK ▲ 5% of skill user's ATK 10s → FAITHFUL (LOAD-BEARING): trigger=fullBurstEnd, UNGATED — separate ■ header with no Wheel-of-Fortune clause; fires after EVERY Full Burst; target=All allies including self; nearestWrong=atkPct 5 (scales each target's own ATK) instead of casterAtkPct; or inheriting the WoF gate from the sibling ■ block so it skips non-arcana rotations
  [skill2] Strength: ATK ▲ 180% of user's ATK → FAITHFUL (LOAD-BEARING): trigger=fullBurstEnd + Wheel-of-Fortune self-status gate (ownBurstGate:'cast' encoding); target=burstCasters{stage:3, element:'Electric'}; nearestWrong=atkPct 180 (target's own ATK) — inflates a high-ATK carry by its own sheet instead of adding 1.8×arcana's lower supporter ATK; secondary misread: fullBurstEnter keying
  [skill2] Death: CD of Burst Skill ▼ 6 sec → FAITHFUL (LOAD-BEARING): trigger=fullBurstEnd + Wheel-of-Fortune self-status gate; target=All allies; nearestWrong=Read as ▼6% instead of 6 seconds; or ungated so 6 s CDR lands after EVERY FB (over-credits everyone's cadence and can runaway-open the WoF gate itself)
  [skill2] ATK ▲ 50% of user's ATK for 5 sec → FAITHFUL (LOAD-BEARING): trigger=fullBurstEnd + Wheel-of-Fortune self-status gate (same ■ as Death); target=All allies including self; nearestWrong=Duration bleed from siblings (15 s or 10 s), or atkPct own-ATK scaling, or restricting to the B3-Electric-caster set from the other ■
  [skill2] Attack damage ▲ 7.5% for 10 sec → FAITHFUL (LOAD-BEARING): trigger=fullBurstEnd, UNGATED — separate ■ with no WoF clause; every rotation; target=All allies including self; nearestWrong=WoF-gating it (under-credits every other rotation) or fullBurstEnter keying (moves it into the FB window)
  [burst] Wheel of Fortune: Attack dmg ▲ 10% → FAITHFUL (LOAD-BEARING): trigger=burstCast (her OWN B2 cast — no activation clause inside her own burst block), NOT fullBurstEnter; target=alliesOfElement Electric, including self; nearestWrong=fullBurstEnter keying — WoF would apply on EVERY team FB, opening all four gated lines every rotation despite her 40 s CD: the single largest over-credit available in this kit
  [burst] Deals 300% of final ATK as Burst dmg → FAITHFUL (LOAD-BEARING): trigger=burstCast — and per methodology rule 9, burst-cast instant damage is FB-EXEMPT (lands before the FB window opens) → noFb; target=Enemy (all enemies = the single boss); nearestWrong=FB +50% major applied to the hit (fbMajorApplied true), or the hit re-fired on every team FB instead of only her casts
  [burst] Judgement: Damage taken ▲ 10% 10s → FAITHFUL (LOAD-BEARING): trigger=burstCast; target=Enemy (boss-held: emits buffApply with casterIdx===null AND targetIdx===null per harness note — filter by stat+value); nearestWrong=Encoded as an ally-side buff, dropped as defensive/unmodeled, or keyed to fullBurstEnter so it lands every rotation
notes: Expected shared-prior misreads the driver must be tested against, in priority order: (1) FB-END vs FB-ENTER — every skill1/skill2 block is a DOWNTIME buff triggered at fullBurstEnd; enter-keying moves the 180%/7.5% Damage-Up and flat-ATK adds into the FB window where they stack with the +50% FB major — the dominant over-credit direction. Assert buffApply timestamps == fullBurstEnd events. (2) The Wheel-of-Fortune gate is effectively 'arcana cast her burst this rotation' (she is the sole WoF source; 40 s CD → every other ~20 s rotation). Two traps: keying WoF's source to fullBurstEnter opens all four gated lines every rotation; conversely a LITERAL 10 s buff-aliveness check at FB end is dead-by-epsilon (cast→FB-end > 10 s), zeroing the whole gated kit — the correct encoding is ownBurstGate:'cast' composed with fullBurstEnd, and the test must assert gated lines DO fire on her cast rotations AND stay silent otherwise. Death's 6 s burstCdr (40→34 s effective) must not flip her to every-rotation casting under ~20 s rotations. (3) All three 'of the skill user's ATK' lines are casterAtkPct flat adds — atkPct own-ATK scaling is the classic misread and mis-values every one of them. (4) Target-set discipline: burstCasters{stage:3, element:'Electric'} excludes arcana (B2) and non-casting Electric allies; with no Electric B3 caster in the comp both 180% lines are DEAD (the name-stripped teamHas schema comment corroborates the shipped override likely gates on teamHas{burst:'III', element:'Electric'} — see leakDetected). (5) The 15 s buffs reach ~5 s into the NEXT FB (a rotation she sits out) — assert aliveness at the following fullBurstStart; the 5 s and 10 s lines must NOT reach it. (6) The Magician skill-2-CDR line is a schema GAP (no windowed ally-skill-CDR primitive): it must land verbatim in unmodeled, move zero damage, and be flagged as damage-relevant future work (it would ~4x an ally's interval-keyed skill2 cadence for 15 s). (7) Judgement is boss-held: filter buffApply with casterIdx===null && targetIdx===null. Could not write the file (no tools in this run) — JSON returned inline for the orchestrator to save to scripts/kit-autonomy/reviews/arcana.test-review.json.

## 5. S5 blind post-op test-writer (claude-opus-5, CROSS-FAMILY)

leakDetected: null
fixtures: TWO comps, because the control comp cannot exercise this kit. (A) controlComp('arcana') = liter/crown/arcana/helm, boss Fire, focus arcana — arcana is BURST II, so helm is what closes the chain at all (liter+crown+arcana is B1+B2+B2 and makes ZERO Full Bursts). helm is SR/WATER, so this comp contains no Burst-3 Electric ally: the S1a/S2a 180% lines MUST be perfectly inert here, and that inertness is the target-set discriminator. Crown (B2, cd 20s) contests arcana's burst slot, so arcana bursts on at most some rotations — which is what makes the Wheel-of-Fortune gate's OFF case observable; every fixture-A assertion is written to hold whether she casts zero bursts or several, so nothing goes vacuous if the engine always prefers crown. (B) [liter, arcana, ELECTRIC_B3], boss Fire, focus arcana — arcana is the SOLE Burst II and ELECTRIC_B3 the SOLE Burst III, so no Full Burst can occur unless both cast: every FB end is guaranteed to have arcana in Wheel of Fortune AND a qualifying Burst-3 Electric burst-caster, making the ACTIVE case non-vacuous by construction rather than by luck. ELECTRIC_B3 is DERIVED at runtime from data/characters.json (sim-supported Electric Burst III with the shortest burst cooldown, tie-broken by slug) — never hardcoded — and the suite throws loudly if the roster has none. helm is excluded from B so its buffs cannot confound, and liter keeps B non-uniformly-Electric so K7's element scoping stays falsifiable. Deterministic (no seed); 5 hoisted runs: A base, A fullBurstEnter counterfactual, A casterAtkPct→atkPct counterfactual, B base, B burstCdr-removed.
gaps: ["S1a 'The Magician: Cooldown of Skill 2 ▼75% for 15 sec' — it.skip. No primitive exists: EffectDef carries burstCdr for BURST cooldowns only, and a unit's SKILL cadence is not a mutable pool but is baked into its trigger (interval.sec, or an event trigger with no cooldown at all), with no cross-unit channel to rewrite another character's trigger mid-fight. Modeling it needs a new effect kind plus a per-unit skill-CD clock. Must appear verbatim in unmodeled.skill1 — it is a real, large uplift (75% off the recipient's skill 2) that the sim under-credits."]
spec:
  [skill1] Activates when Full Burst ends → FAITHFUL: K10: every skill-slot firing frame equals a fullBurstEnd frame and never a fullBurstStart frame; the fullBurstEnter counterfactual fires on the start frames instead AND moves totals. Nearest-wrong (fullBurstEnter) fails both — keyed to entry the 15s/10s/5s windows blanket the Full Burst and collect the +50% major.
  [skill1] all B3 Electric allies who cast burst → FAITHFUL: K2/K4: in fixture B the 180% buffs land on the Electric B3 slot ALONE (never liter, never arcana — she is Burst II and cannot qualify for her own line); in fixture A, which has no Electric B3, they never appear at all. An `allies` target, or `burstCasters` with the element or stage facet dropped, fires in fixture A and fails.
  [skill1] if self is in Wheel of Fortune status → FIX: K5a: the status is conferred by her OWN burst (burst block a) to Electric allies, and she is Electric — so the gate reduces to 'arcana bursted into this rotation' (ownBurstGate:'cast'), NOT the enemy-only targetStatus channel. Fixture A asserts STRICTLY FEWER firings than Full Burst ends (true whether she casts 0 or k bursts) and each firing within 15s of one of her casts; fixture B asserts a firing on every FB end. An ungated model fires on all FB ends in A and fails.
  [skill1] Cooldown of Skill 2 ▼ 75% for 15 sec → GAP: it.skip — no primitive. EffectDef has burstCdr (BURST cooldowns) and nothing skill-cooldown-shaped; a unit's skill cadence is baked into its trigger (interval.sec or an event trigger), with no cross-unit channel to rewrite another character's trigger mid-fight. Must be recorded verbatim in unmodeled.skill1: it is a real uplift this sim under-credits, not a no-op.
  [skill1] Attack damage ▲ 180% for 15 sec → FAITHFUL: K2: attackDamagePct 180 (Damage Up bucket, not ATK), 15s duration, fired at FB end onto the Electric B3 only. Fails under an atkPct reading (wrong bucket, wrong dilution) and under any element/stage-blind target.
  [skill1] ATK ▲ 5% of skill user's ATK, 10 sec → FAITHFUL: K3: ungated — fires on EVERY Full Burst end onto all four allies incl. self for 10s. The casterAtkPct→atkPct counterfactual must MOVE totals, proving the flat-caster-ATK basis is really wired (nearest-wrong: each ally scaling its own ATK).
  [skill2] Strength: ATK ▲ 180% of user's ATK → FAITHFUL: K4: casterAtkPct 180 for 15s at FB end, Electric-B3-only holders in fixture B, entirely absent in fixture A. Same two nearest-wrongs as K2 (target scope, ATK basis).
  [skill2] Death: Cooldown of Burst Skill ▼ 6 sec → FAITHFUL: K5b: burstCdr emits no buff event, so its only observable is cadence — removing it must reduce the Full Burst count across 180s. A no-op encoding, or a once-per-battle reading, fails to move the count.
  [skill2] ATK ▲ 50% of user's ATK for 5 sec → FAITHFUL: K5a: casterAtkPct 50, 5s, all allies incl. self, but WoF-gated — carries the gate discrimination (fixture A strictly fewer firings than FB ends; fixture B one per FB end).
  [skill2] Attack damage ▲ 7.5% for 10 sec → FAITHFUL: K6: ungated all-allies attackDamagePct 7.5 on every FB end for 10s; also asserts no atkPct twin ("Attack damage" is Damage Up, not ATK). Doubles as the K10 trigger-identity probe because it is the one line with no gate to confound the frame comparison.
  [burst] Wheel of Fortune: Atk dmg ▲10%/10s → FAITHFUL: K7: fires on the burst CAST frame (not FB entry/end), 10s, and the holder set equals exactly the Electric allies computed from data/characters.json — an all-allies model includes liter and fails. Also asserts arcana holds it herself, which is the mechanism arming her own WoF gate.
  [burst] Deals 300% of final ATK → FAITHFUL: K8: one burst-bucket hit per cast at atkPct 300, fbMajorApplied always false (a cast lands before the FB window opens), coreRate 0 ("Burst Skill damage", no core-strike wording). Fails a model that lets the nuke take the +50% major or routes it to the core bucket.
  [burst] Judgement: Damage taken ▲ 10%/10s → FAITHFUL: K9: a boss-held debuff — buffApply with damageTakenPct 10, casterIdx AND targetIdx null, once per cast, 10s. Encoded as a self/ally buff it would carry a real targetIdx and credit only its holders; that assertion fails.

### blind test source (scripts/kit-autonomy/blind/arcana.test.ts)
```ts
// PER-UNIT KIT SPEC — `arcana` (Arcana, Supporter/RL/Electric, BURST II, cd 40s, ammo 6,
// reloadFrames 171, chargeFrames 60, normalAttackMultiplier 64.04). BLIND spec (S5): written from
// the kit prose alone — the shipped override, its author's reasoning, and any other test for this
// unit were not read.
//
// One assertion group per KIT LINE (K1..K10). Assertions are OBSERVATIONAL (event log + totals)
// rather than shape-of-JSON wherever possible, so any FAITHFUL encoding passes and only a wrong
// MODEL fails. `withPatchedOverride` appears solely to build counterfactuals.
//
// Kit (blablalink prose):
//   S1 a) FB ENDS → all Burst-3 ELECTRIC allies who cast their burst, IF self in Wheel of Fortune:
//           "The Magician": Cooldown of Skill 2 ▼75% for 15 sec                          [K1 GAP]
//                            Attack damage ▲180% for 15 sec                                [K2]
//      b) FB ENDS → all allies: ATK ▲5% OF THE SKILL USER'S ATK for 10 sec                 [K3]
//   S2 a) (same gated target set) "Strength": ATK ▲180% OF THE SKILL USER'S ATK for 15 sec  [K4]
//      b) FB ENDS → all allies IF self in Wheel of Fortune:
//           "Death": Cooldown of Burst Skill ▼6 sec                                        [K5b]
//                     ATK ▲50% OF THE SKILL USER'S ATK for 5 sec                           [K5a]
//      c) FB ENDS → all allies: Attack damage ▲7.5% for 10 sec                             [K6]
//   BU a) all ELECTRIC allies: "Wheel of Fortune": Attack damage ▲10% for 10 sec           [K7]
//      b) all enemies: 300% of final ATK as Burst Skill damage                              [K8]
//                      "Judgement": Damage taken ▲10% for 10 sec                            [K9]
//
// "The Magician" / "Strength" / "Death" / "Judgement" / "Wheel of Fortune" are tarot LABELS on the
// lines that follow them, not separate mechanics — nothing extra to model. "Wheel of Fortune" is
// the ONE exception: it is also a real STATUS, conferred by her own burst block (K7) to Electric
// allies — and she is Electric — so "if self is in Wheel of Fortune status" reduces to "IF ARCANA
// CAST HER OWN BURST INTO THIS ROTATION". That is `ownBurstGate:'cast'` territory, NOT the
// `targetStatus`/`requiresTargetStatus` channel (which is enemy-only by construction).
//
// TWO FIXTURES, because the control comp physically cannot exercise this kit:
//
//   A = controlComp('arcana')  →  liter 0 / crown 1 / arcana 2 / helm 3, boss Fire.
//       helm is the B3 that makes a chain possible at all (arcana is B2 — a comp of B1+B2+B2 makes
//       ZERO Full Bursts). But helm is SR/WATER, so this comp contains NO Burst-3 Electric ally:
//       K2 and K4 MUST be perfectly inert here. That inertness IS the target-set discriminator —
//       an `allies`-targeted (or element-blind, or stage-blind) model fires them in this comp.
//       Crown (B2, cd 20s) also contests arcana's burst slot, so arcana bursts on SOME rotations at
//       most — which is what makes the Wheel-of-Fortune gate's OFF case observable. Every A-fixture
//       assertion is written to hold whether arcana casts zero bursts or several.
//
//   B = [liter, arcana, ELECTRIC_B3], boss Fire, focus arcana.
//       arcana is the SOLE Burst II and ELECTRIC_B3 is the SOLE Burst III, so a Full Burst is
//       impossible unless BOTH cast: every FB end is therefore guaranteed to have (i) arcana in
//       Wheel of Fortune and (ii) a qualifying Burst-3 Electric burst-caster. This is the ACTIVE
//       case for K2/K4/K5, non-vacuous by construction rather than by luck. ELECTRIC_B3 is DERIVED
//       from the roster at runtime — hardcoding a slug would rot the moment the roster moves.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   K2/K4  nearest-wrong = target `allies` (or burstCasters with the element/stage facet dropped).
//          Proven twice: they must land on EXACTLY the Electric B3 in fixture B (never on liter,
//          never on arcana herself — she is Burst II and cannot qualify for her own line), and they
//          must be ENTIRELY ABSENT in fixture A, which has no Electric B3.
//   K3/K4/K5a  nearest-wrong = `atkPct` (scales the TARGET's own ATK) instead of `casterAtkPct`
//          (flat add of x% of ARCANA's ATK). The prose says "of the skill user's ATK" — the two
//          models differ for every ally whose ATK differs from arcana's, so the counterfactual must
//          MOVE totals. Asserted as a real damage delta, not just a stat-name equality.
//   K5    nearest-wrong = the gate dropped. Ungated, the Death block fires on EVERY Full Burst end;
//          gated it can fire at most once per arcana burst. Fixture A asserts STRICTLY FEWER
//          firings than FB ends (true whether she bursts 0 or k times) and fixture B asserts it
//          fires on every FB end — so the pair is non-vacuous in both directions.
//   K5b   burst-CDR is invisible to the buff log; its only observable is that rotations come
//          FASTER. Removing it must reduce the Full Burst count over the 180s fight.
//   K10   nearest-wrong = `fullBurstEnter`. This is the single highest-leverage error in the kit:
//          re-keyed to FB ENTRY, every window (15s/10s/5s) would blanket the Full Burst itself and
//          collect the +50% FB major. Asserted structurally (firing frames coincide with
//          fullBurstEnd, never fullBurstStart) AND by damage (the counterfactual moves totals).
//   K8    a burst CAST lands before the FB window opens, so the 300% nuke must never take the +50%
//          major, and "as Burst Skill damage" with no core-strike wording gets no core bucket.
//   K9    "Damage taken ▲" is an ENEMY debuff benefiting the whole team, not a self/ally buff — it
//          must appear boss-held (casterIdx AND targetIdx null), never on an ally slot.
//
// Deterministic (no seed). 5 runs, each a full 180s sim.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  type CompOptions,
  controlComp,
  data,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const SLUG = 'arcana';

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

// ---- roster-derived fixture inputs -------------------------------------------------------------

const chars = data.characters as Record<string, any>;

/**
 * The Burst-III ELECTRIC ally that K2/K4 require. DERIVED, never hardcoded: the sim-supported
 * Electric Burst III with the shortest burst cooldown (so it sustains a chain), tie-broken by slug
 * so the pick is deterministic. If the roster ever loses every such unit, arcana's two largest kit
 * lines become untestable and this must fail LOUDLY rather than quietly skip them.
 */
const ELECTRIC_B3: string = (() => {
  const pool = Object.values(chars)
    .filter(
      (c) => c.element === 'Electric' && c.burst === 'III' && c.simSupported && c.slug !== SLUG,
    )
    .sort(
      (a, b) => a.burstCooldownSec - b.burstCooldownSec || (a.slug < b.slug ? -1 : 1),
    );
  if (!pool.length) {
    throw new Error(
      "no sim-supported Burst III Electric ally on the roster — arcana's S1a/S2a target set cannot " +
        'be exercised by any comp, so this suite cannot gate them',
    );
  }
  return pool[0].slug;
})();

const isElectric = (slug: string) => chars[slug].element === 'Electric';

// Fixture A — the control comp. arcana is the carry (slot 2); helm (slot 3) is the B3 that lets a
// chain close at all. NO Electric B3 present, by design.
const COMP_A = controlComp(SLUG);
const A_SLUGS = COMP_A.slugs;
const A_ARCANA = A_SLUGS.indexOf(SLUG);

// Fixture B — arcana as sole B2, ELECTRIC_B3 as sole B3: every Full Burst requires both to cast.
const B_SLUGS = ['liter', SLUG, ELECTRIC_B3];
const COMP_B: CompOptions = { slugs: B_SLUGS, bossElement: 'Fire', focusSlug: SLUG };
const B_ARCANA = 1;
const B_TARGET = 2;

// ---- runner -------------------------------------------------------------------------------------

function run(opts: CompOptions, overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({ ...opts, overrides, cfg: { onEvent: (e) => events.push(e) } });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches ---------------------------------------------------------------------
// Each locates blocks by EFFECT/TRIGGER SIGNATURE (never by index) and throws if the signature is
// absent, so a stale fixture fails loudly instead of silently testing nothing.

/** K10: every "Activates when Full Burst ends" block re-keyed to FULL BURST ENTRY. */
const arcanaFbEnter = withPatchedOverride(SLUG, (ov: any) => {
  let n = 0;
  for (const b of [...ov.skill1, ...ov.skill2]) {
    if (b.trigger?.kind === 'fullBurstEnd') {
      b.trigger.kind = 'fullBurstEnter';
      n++;
    }
  }
  if (n === 0) {
    throw new Error(
      'arcana: no fullBurstEnd-triggered skill block — every skill line reads "Activates when Full ' +
        'Burst ends", so the shipped model is already mis-keyed',
    );
  }
});

/** K3/K4/K5a: caster-ATK grants re-read as target-scaling percentages. */
const arcanaSelfAtk = withPatchedOverride(SLUG, (ov: any) => {
  let n = 0;
  for (const b of [...ov.skill1, ...ov.skill2, ...ov.burst]) {
    for (const e of b.effects ?? []) {
      if (e.stat === 'casterAtkPct') {
        e.stat = 'atkPct';
        n++;
      }
    }
  }
  if (n === 0) {
    throw new Error(
      'arcana: no casterAtkPct effect — three kit lines read "ATK ▲ x% OF THE SKILL USER\'S ATK"',
    );
  }
});

/** K5b: Death's burst-cooldown reduction removed, isolating its rotation acceleration. */
const arcanaNoCdr = withPatchedOverride(SLUG, (ov: any) => {
  let n = 0;
  for (const b of [...ov.skill1, ...ov.skill2, ...ov.burst]) {
    const before = (b.effects ?? []).length;
    b.effects = (b.effects ?? []).filter((e: any) => e.kind !== 'burstCdr');
    n += before - b.effects.length;
  }
  if (n === 0) {
    throw new Error('arcana: no burstCdr effect — S2b reads "Cooldown of Burst Skill ▼ 6 sec"');
  }
});

// ---- runs (hoisted: each is a full 180s sim) ----------------------------------------------------
const A = run(COMP_A);
const AFbEnter = run(COMP_A, { [SLUG]: arcanaFbEnter });
const ASelfAtk = run(COMP_A, { [SLUG]: arcanaSelfAtk });
const B = run(COMP_B);
const BNoCdr = run(COMP_B, { [SLUG]: arcanaNoCdr });

// ---- readers --------------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) => evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const fbEndFrames = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstEnd').map((e) => e.frame);
const fbStartFrames = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart').map((e) => e.frame);
const arcanaBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === SLUG);
const arcanaDamage = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage' && e.slug === SLUG);

/** Buff applications CAST BY arcana carrying `stat` (optionally pinned to `value`). */
const grants = (evs: SimEvent[], idx: number, stat: string, value?: number) =>
  buffs(evs).filter(
    (b) => b.casterIdx === idx && b.stat === stat && (value === undefined || b.value === value),
  );

/** One FIRING = one frame, even though an all-allies block emits one buffApply per holder. */
const firings = (bs: BuffApply[]) => [...new Set(bs.map((b) => b.frame))].sort((a, b) => a - b);

/** Holder slots per firing frame. */
function holders(bs: BuffApply[]): Map<number, Set<number | null>> {
  const m = new Map<number, Set<number | null>>();
  for (const b of bs) {
    if (!m.has(b.frame)) m.set(b.frame, new Set());
    m.get(b.frame)!.add(b.targetIdx);
  }
  return m;
}

const durations = (bs: BuffApply[]) => [...new Set(bs.map((b) => b.expiresFrame! - b.frame))];
const subset = (xs: number[], ys: number[]) => xs.every((x) => ys.includes(x));

describe('arcana — kit spec (blind)', () => {
  describe('fixture sanity — the two comps exercise what they claim to', () => {
    it('A: contains NO Burst-3 Electric ally, so the gated lines have no legal target', () => {
      const qualifying = A_SLUGS.filter(
        (s) => s !== SLUG && chars[s].element === 'Electric' && chars[s].burst === 'III',
      );
      expect(qualifying, 'control comp gained an Electric B3 — the K2/K4 inertness case is void').toEqual([]);
    });

    it('A: makes Full Bursts (arcana is Burst II — helm is what closes the chain)', () => {
      expect(fbEndFrames(A.events).length).toBeGreaterThan(1);
    });

    it('B: arcana is the sole Burst II and the target is the sole Burst III', () => {
      expect(B_SLUGS.filter((s) => chars[s].burst === 'II')).toEqual([SLUG]);
      expect(B_SLUGS.filter((s) => chars[s].burst === 'III')).toEqual([ELECTRIC_B3]);
    });

    it('B: every Full Burst is therefore preceded by an arcana cast (gate always ON)', () => {
      const ends = fbEndFrames(B.events);
      expect(ends.length, `no Full Burst in [${B_SLUGS.join(', ')}]`).toBeGreaterThan(1);
      expect(arcanaBursts(B.events).length).toBeGreaterThanOrEqual(ends.length);
    });

    it('B: holds at least one NON-Electric ally, so element scoping is falsifiable', () => {
      expect(
        B_SLUGS.filter((s) => !isElectric(s)),
        'every ally in fixture B is Electric — K7 could not distinguish alliesOfElement from allies',
      ).not.toEqual([]);
    });
  });

  // -------------------------------------------------------------------------------------------
  describe('K1 — S1a "The Magician: Cooldown of Skill 2 ▼75% for 15 sec"', () => {
    it.skip('cuts the target ally\'s skill-2 cooldown by 75% for 15 sec', () => {
      // GAP — no primitive. EffectDef carries `burstCdr` (BURST cooldowns) and nothing else
      // cooldown-shaped; a unit's SKILL cadence is not a mutable pool in this engine but is baked
      // into its trigger (an `interval.sec`, or an event trigger with no cooldown at all), and
      // there is no cross-unit channel to rewrite another character's trigger mid-fight.
      // Modeling it would need a new effect kind plus a per-unit skill-CD clock.
      // MUST be recorded verbatim in the override's `unmodeled.skill1` — it is a real, large
      // uplift (a 75% cut on the recipient's skill 2) that this sim under-credits, not a no-op.
    });
  });

  describe('K2 — S1a Attack damage ▲180% for 15 sec, to Burst-3 ELECTRIC burst-casters', () => {
    const active = grants(B.events, B_ARCANA, 'attackDamagePct', 180);

    it('fires in fixture B, at Full Burst END, once per FB end', () => {
      expect(active.length, 'the 180% Attack Damage line never fired even with a legal target').toBeGreaterThan(0);
      expect(subset(firings(active), fbEndFrames(B.events))).toBe(true);
      expect(firings(active).length).toBeLessThanOrEqual(fbEndFrames(B.events).length);
    });

    it('lands on the Electric B3 ALONE — not liter, not arcana herself (she is Burst II)', () => {
      for (const [frame, hs] of holders(active)) {
        expect([...hs], `frame ${frame}: wrong holder set for a Burst-3-Electric-scoped buff`).toEqual([B_TARGET]);
      }
    });

    it('runs 15 sec', () => {
      expect(durations(active)).toEqual([15 * FPS]);
    });

    it('DISCRIMINATING: is perfectly inert with no Burst-3 Electric ally in the comp', () => {
      // An `allies`-targeted model — or one that kept `burstCasters` but dropped the element or
      // stage facet — fires this on helm/crown/liter here. It must produce nothing at all.
      expect(grants(A.events, A_ARCANA, 'attackDamagePct', 180)).toEqual([]);
    });
  });

  describe('K3 — S1b ATK ▲5% OF THE SKILL USER\'S ATK, all allies, 10 sec, UNGATED', () => {
    const g = grants(A.events, A_ARCANA, 'casterAtkPct', 5);

    it('fires on EVERY Full Burst end (no Wheel of Fortune condition on this block)', () => {
      expect(g.length).toBeGreaterThan(0);
      expect(firings(g)).toEqual(fbEndFrames(A.events));
    });

    it('reaches all four allies including herself, for 10 sec', () => {
      for (const [frame, hs] of holders(g)) {
        expect(hs.size, `frame ${frame} reached ${hs.size} allies, expected ${A_SLUGS.length}`).toBe(A_SLUGS.length);
        expect(hs.has(A_ARCANA), 'the skill user must buff herself — the kit says "all allies"').toBe(true);
      }
      expect(durations(g)).toEqual([10 * FPS]);
    });

    it('DISCRIMINATING: is a flat add off ARCANA\'s ATK, not a self-scaling percentage', () => {
      // "x% OF THE SKILL USER'S ATK" (casterAtkPct — every ally gets the same flat number) vs the
      // nearest-wrong "ATK ▲x%" (atkPct — each ally scales its OWN ATK). The two agree only if
      // every ally's ATK equals arcana's, so the swap must move real damage.
      expect(
        ASelfAtk.totals,
        'swapping casterAtkPct → atkPct changed nothing — the caster-ATK basis is not wired through',
      ).not.toEqual(A.totals);
    });
  });

  describe('K4 — S2a "Strength": ATK ▲180% of the skill user\'s ATK, 15 sec, same gated target', () => {
    const active = grants(B.events, B_ARCANA, 'casterAtkPct', 180);

    it('fires at Full Burst end onto the Electric B3 alone, for 15 sec', () => {
      expect(active.length, 'the 180% Strength grant never fired even with a legal target').toBeGreaterThan(0);
      expect(subset(firings(active), fbEndFrames(B.events))).toBe(true);
      for (const [frame, hs] of holders(active)) {
        expect([...hs], `frame ${frame}: Strength leaked outside the Burst-3-Electric target set`).toEqual([B_TARGET]);
      }
      expect(durations(active)).toEqual([15 * FPS]);
    });

    it('DISCRIMINATING: is inert with no Burst-3 Electric ally present', () => {
      expect(grants(A.events, A_ARCANA, 'casterAtkPct', 180)).toEqual([]);
    });
  });

  describe('K5a — S2b "Death": ATK ▲50% of the skill user\'s ATK, all allies, 5 sec, WoF-GATED', () => {
    const gA = grants(A.events, A_ARCANA, 'casterAtkPct', 50);
    const gB = grants(B.events, B_ARCANA, 'casterAtkPct', 50);

    it('ACTIVE case: fires on every Full Burst end when arcana always bursts (fixture B)', () => {
      expect(firings(gB)).toEqual(fbEndFrames(B.events));
      for (const [frame, hs] of holders(gB)) {
        expect(hs.size, `frame ${frame} reached ${hs.size} allies, expected ${B_SLUGS.length}`).toBe(B_SLUGS.length);
      }
      expect(durations(gB)).toEqual([5 * FPS]);
    });

    it('DISCRIMINATING: fires STRICTLY FEWER times than Full Burst ends when she does not always burst', () => {
      // Wheel of Fortune is conferred by HER OWN burst (K7) and she is Electric, so this block can
      // only fire off a rotation she bursted into. In fixture A crown contests the Burst II slot, so
      // she bursts on at most some rotations. An UNGATED model fires on every FB end — the count
      // below would equal fbEnds. This holds whether she casts zero bursts or several.
      const ends = fbEndFrames(A.events).length;
      expect(
        firings(gA).length,
        `Death fired on ${firings(gA).length}/${ends} Full Burst ends with ` +
          `${arcanaBursts(A.events).length} arcana bursts — an ungated model fires on all ${ends}`,
      ).toBeLessThan(ends);
    });

    it('never fires more often than arcana bursts', () => {
      expect(firings(gA).length).toBeLessThanOrEqual(arcanaBursts(A.events).length);
    });

    it('every firing follows one of HER casts inside the Wheel of Fortune window', () => {
      // Her burst opens WoF; the chain + 10s Full Burst put the FB end ~10-11s later, so the window
      // is generous (15s) — but an ungated firing in fixture A sits ~30s past her last cast and is
      // still excluded. Vacuous if she never bursts, which the count assertions above already cover.
      const casts = arcanaBursts(A.events).map((c) => c.frame);
      for (const f of firings(gA)) {
        const ok = casts.some((c) => f >= c && f - c <= 15 * FPS);
        expect(ok, `Death fired at frame ${f} with no arcana burst in the preceding 15s`).toBe(true);
      }
    });
  });

  describe('K5b — S2b "Death": Cooldown of Burst Skill ▼6 sec, all allies', () => {
    it('accelerates the rotation — removing it costs Full Bursts over the fight', () => {
      // burstCdr emits no buff event, so its ONLY observable is rotation cadence. 6s off every
      // ally's burst cooldown at every (gated) FB end must compound into more Full Bursts across
      // 180s; a no-op or a once-per-battle reading would not move the count.
      const withCdr = fbStartFrames(B.events).length;
      const without = fbStartFrames(BNoCdr.events).length;
      expect(
        withCdr,
        `${withCdr} Full Bursts with the 6s CDR vs ${without} without — the CDR is not reaching allies' cooldowns`,
      ).toBeGreaterThan(without);
    });
  });

  describe('K6 — S2c Attack damage ▲7.5% for 10 sec, all allies, UNGATED', () => {
    const g = grants(A.events, A_ARCANA, 'attackDamagePct', 7.5);

    it('fires on every Full Burst end, on all allies, for 10 sec', () => {
      expect(g.length).toBeGreaterThan(0);
      expect(firings(g)).toEqual(fbEndFrames(A.events));
      for (const [frame, hs] of holders(g)) {
        expect(hs.size, `frame ${frame} reached ${hs.size} allies, expected ${A_SLUGS.length}`).toBe(A_SLUGS.length);
      }
      expect(durations(g)).toEqual([10 * FPS]);
    });

    it('is Damage Up (attackDamagePct), not an ATK grant', () => {
      expect(grants(A.events, A_ARCANA, 'atkPct', 7.5), '"Attack damage ▲" is the Damage Up bucket, not ATK').toEqual([]);
    });
  });

  describe('K7 — burst "Wheel of Fortune": Attack damage ▲10% for 10 sec, all ELECTRIC allies', () => {
    const g = grants(B.events, B_ARCANA, 'attackDamagePct', 10);
    const expected = new Set(B_SLUGS.map((s, i) => (isElectric(s) ? i : -1)).filter((i) => i >= 0));

    it('fires once per burst CAST (not at FB entry, not at FB end)', () => {
      const casts = arcanaBursts(B.events).map((c) => c.frame);
      expect(firings(g).length).toBe(casts.length);
      expect(subset(firings(g), casts), 'the WoF buff must land on the cast frame').toBe(true);
      expect(durations(g)).toEqual([10 * FPS]);
    });

    it('DISCRIMINATING: reaches the ELECTRIC allies only — an all-allies model would include liter', () => {
      for (const [frame, hs] of holders(g)) {
        expect(new Set([...hs]), `frame ${frame}: WoF holder set is not the Electric allies`).toEqual(expected);
      }
    });

    it('includes arcana herself (she is Electric) — this is what arms her own WoF gate', () => {
      expect(expected.has(B_ARCANA)).toBe(true);
      for (const [, hs] of holders(g)) expect(hs.has(B_ARCANA)).toBe(true);
    });
  });

  describe('K8 — burst deals 300% of final ATK as Burst Skill damage', () => {
    const nukes = arcanaDamage(B.events).filter((d) => d.bucket === 'burst');

    it('lands once per burst cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes.length).toBeGreaterThan(0);
      expect(nukes.length).toBe(arcanaBursts(B.events).length);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([300]);
    });

    it('never takes the +50% Full Burst major (a cast lands before the FB window opens)', () => {
      expect(
        nukes.filter((d) => d.fbMajorApplied).map((d) => d.sec),
        'burst-cast damage must precede the Full Burst window',
      ).toEqual([]);
    });

    it('takes no core bucket — the kit says "Burst Skill damage", not a core strike', () => {
      expect([...new Set(nukes.map((d) => d.coreRate))]).toEqual([0]);
    });
  });

  describe('K9 — burst "Judgement": Damage taken ▲10% for 10 sec, on all enemies', () => {
    // Boss-held debuffs carry casterIdx === null AND targetIdx === null, so they are found by
    // stat+value rather than by caster.
    const debuffs = buffs(B.events).filter((b) => b.stat === 'damageTakenPct' && b.value === 10);

    it('is applied once per burst cast, for 10 sec', () => {
      expect(debuffs.length).toBeGreaterThan(0);
      expect(firings(debuffs).length).toBe(arcanaBursts(B.events).length);
      expect(durations(debuffs)).toEqual([10 * FPS]);
    });

    it('DISCRIMINATING: is held by the BOSS, never by an ally slot', () => {
      // "Damage Taken ▲" is an enemy debuff that lifts the whole team's output. Encoded as an ally
      // or self buff it would carry a real targetIdx and credit only its holders.
      expect([...new Set(debuffs.map((b) => b.targetIdx))]).toEqual([null]);
      expect([...new Set(debuffs.map((b) => b.casterIdx))]).toEqual([null]);
    });
  });

  describe('K10 — TRIGGER IDENTITY: every skill line fires when Full Burst ENDS', () => {
    const baseFirings = firings(grants(A.events, A_ARCANA, 'attackDamagePct', 7.5));
    const cfFirings = firings(grants(AFbEnter.events, A_ARCANA, 'attackDamagePct', 7.5));

    it('shipped: firings coincide with fullBurstEnd and NEVER with fullBurstStart', () => {
      expect(baseFirings.length).toBeGreaterThan(0);
      expect(baseFirings).toEqual(fbEndFrames(A.events));
      expect(
        baseFirings.filter((f) => fbStartFrames(A.events).includes(f)),
        'a Full-Burst-END line must not fire on the FB entry frame',
      ).toEqual([]);
    });

    it('DISCRIMINATING: the fullBurstEnter counterfactual fires on the OTHER frames', () => {
      expect(cfFirings.length).toBeGreaterThan(0);
      expect(subset(cfFirings, fbStartFrames(AFbEnter.events))).toBe(true);
    });

    it('DISCRIMINATING: and it moves damage — every window would blanket the Full Burst itself', () => {
      // Keyed to entry, the 15s/10s/5s windows cover the FB window and its +50% major; keyed to
      // end they start as the window closes. This is the single largest mis-modeling risk in the
      // kit, so it must be a damage-visible difference, not a bookkeeping one.
      expect(
        AFbEnter.totals,
        'FB-entry vs FB-end changed no damage — the trigger is not actually gating these buffs',
      ).not.toEqual(A.totals);
    });
  });

  describe('inertness — arcana never moves what her kit does not name', () => {
    it('grants no crit / core / element / charge / weapon-state stat (her kit names none)', () => {
      const forbidden = new Set([
        'critRatePct',
        'critRateNormalPct',
        'critDamagePct',
        'coreDamagePct',
        'elementDamagePct',
        'chargeDamagePct',
        'chargeDamageMultPct',
        'chargeSpeedPct',
        'reloadSpeedPct',
        'fireRatePct',
        'attackSpeedPct',
        'maxAmmoPct',
        'maxAmmoFlat',
      ]);
      const seen = [
        ...new Set(
          [...buffs(A.events), ...buffs(B.events)]
            .filter((b) => b.casterIdx === A_ARCANA || b.casterIdx === B_ARCANA)
            .map((b) => b.stat)
            .filter((s) => forbidden.has(s as string)),
        ),
      ];
      expect(seen, `arcana granted ${seen.join(', ')} — no kit line names any of these`).toEqual([]);
    });

    it('deals damage from her burst only (no kit line gives her a skill-slot damage rider)', () => {
      const buckets = [...new Set(arcanaDamage(B.events).map((d) => d.bucket))].sort();
      expect(buckets.filter((b) => b === 'skill'), 'arcana has no skill-damage line in her kit').toEqual([]);
    });
  });
});

```

## 6. S6 blind post-op override-writer (claude-opus-5, CROSS-FAMILY)

leakDetected: null

### blind override (scripts/kit-autonomy/blind/arcana.override.json)
```json
{
  "slug": "arcana",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullBurstEnd"
      },
      "target": {
        "kind": "burstCasters",
        "stage": 3,
        "element": "Electric"
      },
      "ownBurstGate": "cast",
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 180,
          "durationSec": 15
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullBurstEnd"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 5,
          "durationSec": 10
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "fullBurstEnd"
      },
      "target": {
        "kind": "burstCasters",
        "stage": 3,
        "element": "Electric"
      },
      "ownBurstGate": "cast",
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 180,
          "durationSec": 15
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "fullBurstEnd"
      },
      "target": {
        "kind": "allies"
      },
      "ownBurstGate": "cast",
      "effects": [
        {
          "kind": "burstCdr",
          "seconds": 6
        },
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 50,
          "durationSec": 5
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "fullBurstEnd"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 7.5,
          "durationSec": 10
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
        "element": "Electric"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 10,
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
        "kind": "self"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 300
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
          "kind": "buff",
          "stat": "damageTakenPct",
          "value": 10,
          "durationSec": 10
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [
      "The Magician: Cooldown of Skill 2 ▼ 75% for 15 sec."
    ],
    "skill2": [],
    "burst": []
  },
  "caveats": [
    "⚑ Wheel of Fortune status is modeled as ownBurstGate:'cast'. WoF is granted ONLY by arcana's own burst (burst block 1 targets all Electric Code allies; arcana is Electric, so she self-applies it). 'self is in Wheel of Fortune status' at Full-Burst end therefore == 'arcana cast her own burst into this rotation'. Note the literal-duration race: WoF is 10 s from the stage-2 cast, while Full Burst ends ~10 s after the FB window OPENS (which is after her cast) — read literally the status has already expired at FB end and the entire gated half of the kit would be dead. Kit intent is clearly that it is live, so the gate is modeled as satisfied; verify against footage before trusting.",
    "⚑ ownBurstGate is documented in types.ts as composing with a fullBurstEnter trigger; here it is used with fullBurstEnd. Confirm the engine evaluates the rotationCasters set at FB end the same way before trusting the gated blocks.",
    "⚑ VISIBILITY: both 180% blocks (skill1 attackDamagePct, skill2 casterAtkPct) resolve to burstCasters{stage:3, element:'Electric'}. On any comp with no Burst-III Electric ally that set is EMPTY and the two largest numbers in this kit are completely inert — a control-comp board read says nothing about them. Grade this unit on a comp containing a B3 Electric carry.",
    "⚑ Burst-block ordering: the 300% nuke is placed BEFORE the Judgement damageTakenPct block, so the nuke does NOT benefit from its own +10% damage-taken debuff. Unverified — swap the block order if popups show the burst hit at the boosted value.",
    "⚑ The 300% burst hit is left with default crit/FB handling (no crit/noFb flags): burst-cast damage lands before the FB window opens, so the engine's timing-based FB major should exempt it automatically, and flat-damage riders crit at the caster's sheet rate under RIDERCRIT. Not measured.",
    "⚑ Cadence: base RL cadence (ammo 6, reloadFrames 171, chargeFrames 60) is datamine-sourced and known-unreliable; arcana's own normal-attack contribution rides on it. She is a supporter, so this is small relative to the team buffs, but it is unverified."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Blind second read of the kit prose only. Structure: arcana is a Burst-II Electric supporter whose entire payload fires on fullBurstEnd. Three of her blocks are gated on 'self is in Wheel of Fortune status', which is a self-applied status from her own burst (burst block 1 grants it to all Electric Code allies, and she is Electric) — modeled as ownBurstGate:'cast', so those blocks only fire on rotations she personally bursted (her 40 s burst CD means that is not every rotation, partly offset by her own 'Death' 6 s burst CDR to all allies). The two 180% lines are further scoped to Burst-3 Electric allies who cast their burst that rotation (burstCasters{stage:3,element:'Electric'}) and are INERT on any comp without such an ally. The ungated lines (skill1 casterAtkPct 5% / 10 s to all allies, skill2 attackDamagePct 7.5% / 10 s to all allies) fire on every FB end regardless. Only one kit line is unmodeled: 'Cooldown of Skill 2 ▼ 75%' has no effect-schema channel (there is burstCdr but no skill-CD reduction primitive) — it is a real damage channel for allies whose skill 2 is modeled as an interval trigger, and is recorded verbatim in unmodeled.skill1."
}
```

### S6 audit + ⚑ flags
[
 {
  "slot": "skill1",
  "kitLine": "Affects all Burst 3 Electric Code all",
  "status": "IMPLEMENTED",
  "effectOrReason": "Block header → trigger fullBurstEnd + target burstCasters{stage:3,element:'Electric'} + ownBurstGate:'cast' (the Wheel of Fortune self-status gate)"
 },
 {
  "slot": "skill1",
  "kitLine": "The Magician: Cooldown of Skill 2 ▼75%",
  "status": "SKIPPED",
  "effectOrReason": "No skill-cooldown-reduction primitive in the effect schema (burstCdr covers burst CD only). Recorded verbatim in unmodeled.skill1 — NOT a defensive/inert line; it would accelerate any ally whose skill 2 is modeled as an interval trigger."
 },
 {
  "slot": "skill1",
  "kitLine": "Attack damage ▲ 180% for 15 sec.",
  "status": "IMPLEMENTED",
  "effectOrReason": "buff attackDamagePct 180, durationSec 15 (Damage Up bucket, additive)"
 },
 {
  "slot": "skill1",
  "kitLine": "FB ends. Affects all allies.",
  "status": "IMPLEMENTED",
  "effectOrReason": "Block header → trigger fullBurstEnd + target allies, NO Wheel of Fortune gate (this header has no status clause)"
 },
 {
  "slot": "skill1",
  "kitLine": "ATK ▲ 5% of the skill user's ATK 10s",
  "status": "IMPLEMENTED",
  "effectOrReason": "buff casterAtkPct 5, durationSec 10 (flat add off caster ATK, not target-scaling atkPct)"
 },
 {
  "slot": "skill2",
  "kitLine": "Affects all Burst 3 Electric Code all",
  "status": "IMPLEMENTED",
  "effectOrReason": "Block header → trigger fullBurstEnd + target burstCasters{stage:3,element:'Electric'} + ownBurstGate:'cast'"
 },
 {
  "slot": "skill2",
  "kitLine": "Strength: ATK ▲ 180% of user's ATK 15s",
  "status": "IMPLEMENTED",
  "effectOrReason": "buff casterAtkPct 180, durationSec 15 ('of the skill user's ATK' → casterAtkPct, NOT atkPct)"
 },
 {
  "slot": "skill2",
  "kitLine": "FB ends. All allies if Wheel of Fortune",
  "status": "IMPLEMENTED",
  "effectOrReason": "Block header → trigger fullBurstEnd + target allies + ownBurstGate:'cast' (WoF gate, but no burst-caster/element scoping on this one)"
 },
 {
  "slot": "skill2",
  "kitLine": "Death: Cooldown of Burst Skill ▼ 6 sec",
  "status": "IMPLEMENTED",
  "effectOrReason": "burstCdr seconds 6 (no oncePerBattle — the line is unqualified, so it repeats every gated FB end)"
 },
 {
  "slot": "skill2",
  "kitLine": "ATK ▲ 50% of the skill user's ATK 5s",
  "status": "IMPLEMENTED",
  "effectOrReason": "buff casterAtkPct 50, durationSec 5"
 },
 {
  "slot": "skill2",
  "kitLine": "FB ends. Affects all allies.",
  "status": "IMPLEMENTED",
  "effectOrReason": "Block header → trigger fullBurstEnd + target allies, ungated (fires every FB end)"
 },
 {
  "slot": "skill2",
  "kitLine": "Attack damage ▲ 7.5% for 10 sec.",
  "status": "IMPLEMENTED",
  "effectOrReason": "buff attackDamagePct 7.5, durationSec 10"
 },
 {
  "slot": "burst",
  "kitLine": "Affects all Electric Code allies.",
  "status": "IMPLEMENTED",
  "effectOrReason": "Block header → trigger burstCast + target alliesOfElement{element:'Electric'} (self included — arcana is Electric, which is what makes her own WoF gates satisfiable)"
 },
 {
  "slot": "burst",
  "kitLine": "Wheel of Fortune: Attack damage ▲ 10%",
  "status": "IMPLEMENTED",
  "effectOrReason": "buff attackDamagePct 10, durationSec 10. Also the SOURCE of the Wheel of Fortune status that skill1/skill2 gate on — the status itself is modeled as ownBurstGate rather than a targetStatus (targetStatus is enemy-only)."
 },
 {
  "slot": "burst",
  "kitLine": "Affects all enemies.",
  "status": "IMPLEMENTED",
  "effectOrReason": "Split into two blocks: the damage line is emitted by the caster (target self, since resolveTargets{enemy} is empty) and the debuff line keeps target enemy (boss-held debuff channel)"
 },
 {
  "slot": "burst",
  "kitLine": "Deals 300% of final ATK as Burst dmg",
  "status": "IMPLEMENTED",
  "effectOrReason": "flatDamage atkPct 300, target self. No noFb/crit flags — burst-cast damage lands pre-FB (timing-automatic exemption) and rider crit is engine-global."
 },
 {
  "slot": "burst",
  "kitLine": "Judgement: Damage taken ▲ 10% for 10s",
  "status": "IMPLEMENTED",
  "effectOrReason": "buff damageTakenPct 10, durationSec 10, target enemy — a boss debuff benefiting the whole team, not a self buff"
 }
]
flags:
  - override.skill1[0].ownBurstGate / skill2[0].ownBurstGate / skill2[1].ownBurstGate: estimate='cast' — the Wheel of Fortune gate is treated as SATISFIED on every Full-Burst end of a rotation in which arcana cast her own burst, and unsatisfied otherwise. | recipe=Record a fight with arcana + a Burst-III Electric ally. On a rotation arcana bursts, watch the ally's buff bar at the FB-end frame for the 180% Attack Damage and 180%-of-caster-ATK grants; on a rotation she does NOT burst (her 40 s CD skips one), confirm they are ABSENT. If present on both, the gate is wrong (drop ownBurstGate); if absent on both, the WoF window truly expires before FB end and the blocks should be dropped entirely.
  - override.skill1[0] / skill2[0] / skill2[1] — trigger fullBurstEnd + ownBurstGate composition: estimate=ownBurstGate is assumed to evaluate correctly against a fullBurstEnd trigger. | recipe=Code-read sim.ts where rotationCasters is populated/cleared relative to the fullBurstEnd dispatch; then run the control comp with cfg.onEvent and assert buffApply events for attackDamagePct 180 fire on the FB-end frame of arcana's own burst rotation. Modeled ≠ working.
  - override.skill1[0].target / override.skill2[0].target (burstCasters stage:3 element:'Electric'): estimate=Empty target set on any comp lacking a Burst-III Electric ally → both 180% blocks contribute exactly ZERO. | recipe=Run runComp twice — once on the default control comp, once with a Burst-III Electric carry in the B3 slot — and diff arcana's team contribution. If the two runs are identical, the burstCasters resolution is returning empty as expected; grade her only on the second.
  - override.burst[1] vs override.burst[2] (block ordering): estimate=The 300% nuke is ordered BEFORE the Judgement damageTakenPct block, so it does not benefit from its own +10% damage-taken debuff. | recipe=Popup-read arcana's burst hit in a recording where no other damage-taken debuff is live; compare the observed value against final ATK × 3.00 × (buff state) with and without the ×1.10. Swap the two blocks if the boosted value matches.
  - unmodeled.skill1 — 'Cooldown of Skill 2 ▼ 75% for 15 sec.': estimate=Modeled as zero contribution. True contribution is non-zero for any ally whose skill 2 is encoded as an interval trigger — a 75% CD cut would quadruple that block's fire rate for 15 s. | recipe=Enumerate the intended partner unit's skill 2: if its override block uses trigger {kind:'interval'}, the omission is real and sized as (fires over 15 s at CD/4) − (fires at CD) × that block's per-fire damage. If the partner's skill 2 is event-triggered (fullBurstEnter/lastBullet/hitCount), record the omission as genuinely inert and close it. Requires an engine feature (per-ally interval-scaling) to model faithfully.
  - override.skill2[1].effects[0] (burstCdr seconds:6): estimate=6 s off every ally's burst cooldown, applied on every gated FB end, no oncePerBattle cap. | recipe=Count measured Full Bursts on a recorded arcana comp and compare to the sim's fullBurstStart event count. Judge this line by FB-count preservation, not by aggregate damage ratio.
  - base cadence tuple (ammo 6, reloadFrames 171, chargeFrames 60, hitsPerShot 1): estimate=Inherited datamined values, used unchanged; her own normal-attack output is a minor share of her contribution. | recipe=Ammo-counter read on a recording of arcana firing: shots per magazine and magazine-to-magazine wall time give effective pulls/s and true reload duration directly. Use the ammo counter (measures the disputed quantity) rather than FB counts (downstream of it).

## 7. Driver's tests (scripts/tests/units/arcana.test.ts — 24 tests, ALL GREEN vs the FIXED shipped override)

```ts
// PER-UNIT KIT SPEC — `arcana` (BASE Arcana, RL / Supporter / Electric, Burst II, cd 40s, ammo 6,
// chargeFrames 60). Kit-autonomy gauntlet 2026-07-24 (test-first; revised after the gate FIX below).
//
// ⚠ EXACT-SLUG: this is base `arcana` (RL/Electric/B2) — NOT `arcana-fortune-mate` (SG/Fire/B2).
//
// One assertion group per KIT LINE (A0..A9), asserted against the SHIPPED override loaded from disk.
// `withPatchedOverride` builds COUNTERFACTUALS only (the nearest wrong model each assertion must
// discriminate against) — never the encoding under test.
//
// Kit (blablalink prose @ lvl10, data/characters.json → characters.arcana.skills):
//   S1 ■ on Full Burst END, all Burst-3 Electric allies who cast (if self in Wheel of Fortune):
//        The Magician: Cooldown of Skill 2 ▼75% for 15s   → UNMODELED (no skill-CD model; S2 is
//                                                            event-keyed to FB-end, nothing to act on) [A0]
//        Attack damage ▲180% for 15s                       [A4]
//      ■ on Full Burst END, all allies (NO gate): ATK ▲5% of the skill user's ATK for 10s          [A7]
//   S2 ■ on Full Burst END, all Burst-3 Electric allies who cast (if self in Wheel of Fortune):
//        Strength: ATK ▲180% of the skill user's ATK for 15s   [A5]
//      ■ on Full Burst END, all allies (if self in Wheel of Fortune):
//        Death: Cooldown of Burst Skill ▼6s + ATK ▲50% casterATK for 5s   [A6]  (burstCdr event-SILENT)
//      ■ on Full Burst END, all allies (NO gate): Attack damage ▲7.5% for 10s                     [A8]
//   BU ■ all Electric Code allies: Wheel of Fortune: Attack damage ▲10% for 10s                   [A1]
//      ■ all enemies: Deals 300% of final ATK as Burst Skill damage                              [A2]
//                   Judgement: Damage taken ▲10% for 10s                                         [A3]
//
// THE GATE (the heart of this kit + the gauntlet FIX). "if self is in Wheel of Fortune status" gates
// A4/A5/A6. Arcana is the SOLE source of Wheel of Fortune (her own burst grants it), so "self in WoF
// status" ⟺ "arcana cast her burst this rotation". A literal 10s buff-aliveness check at FB-end is
// dead-by-epsilon (cast→FB-end >10s would zero the whole gated half of the kit), so the faithful
// encoding is ownBurstGate:'cast' composed with fullBurstEnd — the engine evaluates it against
// rotationCasters, which is still populated when fullBurstEnd triggers fire (sim.ts resets it AFTER
// fireTriggered). The parser-baseline shipped a round-count proxy (everyN:2 offset:1) that was
// unfaithful in BOTH directions: it OVER-fired when arcana never burst (a faster B2 contests the slot)
// and UNDER-fired when she burst every rotation. The gauntlet replaced it with ownBurstGate:'cast'.
//
// The test pins that gate with TWO fixtures:
//   B = [liter, arcana, ada] — arcana is the SOLE B2 (bursts every rotation) and ada the SOLE B3
//       Electric (casts every rotation, the unambiguous 180-grant target); liter is Iron (non-Electric)
//       so Wheel scoping is falsifiable. Here the gate is ALWAYS satisfied → gated lines fire every
//       FB-end, exactly like the ungated lines.
//   A = [liter, crown, arcana, ada, helm] — crown (B2, cd 20s) contests the Burst-II slot so arcana
//       NEVER bursts (measured 0 casts). Here the gate is NEVER satisfied → the gated lines are perfectly
//       INERT while the ungated lines (A7/A8) still fire every FB-end. That contrast (gated inert /
//       ungated active in the SAME fight) is what proves the gate is cast-dependent (ownBurstGate), not
//       a round-count or an ungated model. Counterfactuals re-introduce the ungated model and the old
//       everyN proxy in fixture A and assert they over-fire there (which the shipped encoding does not).
//
// casterAtkPct is stored by the engine as an ABSOLUTE ATK grant (caster ATK × pct), not a percentage,
// so A5/A6/A7 pin the kit's 180:50:5 ratio (=36:10:1) between the three casterAtk lines. attackDamagePct
// IS stored as a percentage, so A1/A4/A8 pin 10/180/7.5 directly.
//
// Deterministic (no seed). The fixture supplies a B3 Electric caster so the team-conditional 180-grants
// are LIVE (inert without one — ⚑).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
/** Fixture B — arcana sole B2 (bursts every rotation), ada sole B3 Electric, liter Iron (non-Elec). */
const B_SLUGS = ['liter', 'arcana', 'ada'] as const;
const B_ARCANA = 1;
const B_ADA = 2;
const B_ELECTRIC = [1, 2]; // arcana, ada (liter=Iron excluded from Wheel)
/** Fixture A — crown (B2 cd20) contests the slot so arcana never bursts; gate never satisfied. */
const A_SLUGS = ['liter', 'crown', 'arcana', 'ada', 'helm'] as const;
const A_ARCANA = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(
  slugs: readonly string[],
  focus: string,
  overrides: Record<string, any> = {},
) {
  const events: SimEvent[] = [];
  runComp({
    slugs: [...slugs],
    bossElement: 'Fire',
    focusSlug: focus,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return events;
}

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const arcanaBuffs = (evs: SimEvent[], slot: number) =>
  buffs(evs).filter((b) => b.casterIdx === slot);
const arcanaCasts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'arcana',
  );
const fbEnds = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstEnd');
const arcanaDmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage' && e.slug === 'arcana');
const enemyDebuffs = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.targetIdx === null);
/** distinct firing frames of a buffApply stream (one firing = one frame, even multi-holder). */
const firings = (bs: BuffApply[]) =>
  [...new Set(bs.map((b) => b.frame))].sort((a, b) => a - b);

/** arcana's casterAtkPct lines bucketed by expiry delta — the 5%/50%/180% kit lines fingerprinted
 *  by duration (10s/5s/15s), then magnitude-ratio-checked (casterAtkPct is stored as absolute ATK). */
function casterAtkByDuration(evs: SimEvent[], slot: number) {
  const cas = arcanaBuffs(evs, slot).filter((b) => b.stat === 'casterAtkPct');
  const groups = new Map<number, BuffApply[]>();
  for (const b of cas) {
    const expD = b.expiresFrame != null ? b.expiresFrame - b.frame : -1;
    (groups.get(expD) ?? groups.set(expD, []).get(expD)!).push(b);
  }
  return groups;
}

// ---- counterfactual patches (nearest wrong model each line must beat) -------------------------
const patch = (mutate: (ov: any) => void) =>
  withPatchedOverride('arcana', mutate);

/** A1: Wheel of Fortune retargeted to ALL allies (drops Electric-only scoping). */
const wheelAllies = patch((ov) => {
  if (ov.burst[0]?.effects?.[0]?.stat !== 'attackDamagePct')
    throw new Error('arcana burst[0] Wheel missing — stale fixture');
  ov.burst[0].target = { kind: 'allies' };
});
/** A2: burst nuke halved (300% → 150%, the lvl-1 magnitude). */
const nukeHalf = patch((ov) => {
  const fd = ov.burst[1]?.effects?.find((e: any) => e.kind === 'flatDamage');
  if (!fd) throw new Error('arcana burst flatDamage missing — stale fixture');
  fd.atkPct = 150;
});
/** A3: Judgement (damage-taken debuff) removed from the burst. */
const noJudgement = patch((ov) => {
  const before = ov.burst[1].effects.length;
  ov.burst[1].effects = ov.burst[1].effects.filter(
    (e: any) => e.stat !== 'damageTakenPct',
  );
  if (ov.burst[1].effects.length === before)
    throw new Error('arcana Judgement missing — stale fixture');
});
/** A4/A5: the two 180-grants retargeted from "B3 Electric casters" to ALL allies. */
const grantsAllies = patch((ov) => {
  if (ov.skill1[0]?.effects?.[0]?.stat !== 'attackDamagePct')
    throw new Error('arcana S1 180AD missing — stale fixture');
  if (ov.skill2[0]?.effects?.[0]?.stat !== 'casterAtkPct')
    throw new Error('arcana S2 Strength missing — stale fixture');
  ov.skill1[0].target = { kind: 'allies' };
  ov.skill2[0].target = { kind: 'allies' };
});
/** GATE→ungated: drop ownBurstGate from the three gated blocks (they then fire every FB-end even
 *  when arcana never bursts — the over-credit the shipped encoding avoids). */
const gateUngated = patch((ov) => {
  let n = 0;
  for (const b of [...ov.skill1, ...ov.skill2]) {
    if (b.ownBurstGate) {
      delete b.ownBurstGate;
      n++;
    }
  }
  if (n !== 3)
    throw new Error(
      'arcana: expected 3 ownBurstGate blocks, found ' + n + ' — stale fixture',
    );
});
/** GATE→old proxy: replace ownBurstGate with the parser-baseline everyN:2 offset:1 round-count,
 *  which fires on odd FB-ends regardless of whether arcana burst. */
const gateEveryN = patch((ov) => {
  let n = 0;
  for (const b of [...ov.skill1, ...ov.skill2]) {
    if (b.ownBurstGate) {
      delete b.ownBurstGate;
      b.everyN = 2;
      b.everyNOffset = 1;
      n++;
    }
  }
  if (n !== 3)
    throw new Error(
      'arcana: expected 3 ownBurstGate blocks, found ' + n + ' — stale fixture',
    );
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const B = run(B_SLUGS, 'ada'); // arcana bursts every rotation (gate always ON)
const A = run(A_SLUGS, 'ada'); // arcana never bursts (gate always OFF)
const rWheelAllies = run(B_SLUGS, 'ada', { arcana: wheelAllies });
const rNukeHalf = run(B_SLUGS, 'ada', { arcana: nukeHalf });
const rNoJudgement = run(B_SLUGS, 'ada', { arcana: noJudgement });
const rGrantsAllies = run(B_SLUGS, 'ada', { arcana: grantsAllies });
const rGateUngatedA = run(A_SLUGS, 'ada', { arcana: gateUngated });
const rGateEveryNA = run(A_SLUGS, 'ada', { arcana: gateEveryN });

// ---- derived constants (from the SHIPPED runs, not hardcoded) ---------------------------------
const B_CASTS = arcanaCasts(B).length;
const B_FB = fbEnds(B).length;
const A_FB = fbEnds(A).length;
const A_CASTS = arcanaCasts(A).length;

describe('arcana (BASE, RL/Electric/B2) — kit spec', () => {
  it('fixture sanity: B arcana bursts every FB; A arcana never bursts (gate ON vs OFF)', () => {
    expect(B_CASTS, 'fixture B: arcana should burst').toBeGreaterThan(0);
    expect(B_CASTS).toBeGreaterThanOrEqual(B_FB);
    expect(
      A_FB,
      'fixture A: Full Bursts should still happen (crown closes the chain)',
    ).toBeGreaterThan(1);
    expect(
      A_CASTS,
      'fixture A: crown must contest the B2 slot so arcana never bursts',
    ).toBe(0);
  });

  describe('A1 — burst: Wheel of Fortune grants 10% Attack Damage to ELECTRIC allies only, per cast', () => {
    const wheel = arcanaBuffs(B, B_ARCANA).filter(
      (b) => b.stat === 'attackDamagePct' && b.value === 10,
    );
    it('is 10% for 10s, once per cast per Electric ally', () => {
      expect([...new Set(wheel.map((b) => b.value))]).toEqual([10]);
      expect(wheel.length).toBe(B_CASTS * B_ELECTRIC.length);
      for (const b of wheel) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });
    it('reaches exactly the Electric allies (arcana/ada), never the Iron ally (liter)', () => {
      expect(
        [...new Set(wheel.map((b) => b.targetIdx))].sort((a, b) => a! - b!),
      ).toEqual(B_ELECTRIC);
    });
    it('DISCRIMINATING: an all-allies retarget would also reach liter', () => {
      const cf = arcanaBuffs(rWheelAllies, B_ARCANA).filter(
        (b) => b.stat === 'attackDamagePct' && b.value === 10,
      );
      expect(
        new Set(cf.map((b) => b.targetIdx)).has(0),
        'liter (Iron) must NOT get Wheel under the shipped scoping',
      ).toBe(true);
      expect(cf.length).toBe(B_CASTS * B_SLUGS.length);
    });
  });

  describe('A2 — burst: deals 300% of final ATK as Burst Skill damage, once per cast', () => {
    const nukes = arcanaDmg(B).filter((d) => d.bucket === 'burst');
    it('fires once per cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes.length).toBe(B_CASTS);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([300]);
    });
    it('DISCRIMINATING: the lvl-1 magnitude (150%) is a different number', () => {
      const cf = arcanaDmg(rNukeHalf).filter((d) => d.bucket === 'burst');
      expect([...new Set(cf.map((d) => d.atkPct))]).toEqual([150]);
    });
  });

  describe('A3 — burst: Judgement raises enemy Damage Taken 10% for 10s, per cast', () => {
    const judge = enemyDebuffs(B).filter(
      (b) => b.stat === 'damageTakenPct' && b.value === 10,
    );
    it('applies a 10% damage-taken debuff to the boss once per cast', () => {
      expect(judge.length).toBe(B_CASTS);
      for (const b of judge) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });
    it('DISCRIMINATING: removing Judgement leaves no 10% damage-taken debuff', () => {
      expect(
        enemyDebuffs(rNoJudgement).filter(
          (b) => b.stat === 'damageTakenPct' && b.value === 10,
        ).length,
      ).toBe(0);
    });
  });

  describe('A4 — S1: 180% Attack Damage to B3 Electric casters, ownBurstGate (fires iff arcana cast)', () => {
    const ad180B = arcanaBuffs(B, B_ARCANA).filter(
      (b) => b.stat === 'attackDamagePct' && b.value === 180,
    );
    const ad180A = arcanaBuffs(A, A_ARCANA).filter(
      (b) => b.stat === 'attackDamagePct' && b.value === 180,
    );
    it('fixture B (arcana bursts): 180% for 15s on the B3 Electric caster (ada), every FB-end', () => {
      expect([...new Set(ad180B.map((b) => b.value))]).toEqual([180]);
      expect(
        firings(ad180B).length,
        'gate satisfied every rotation → fires every FB-end',
      ).toBe(B_FB);
      expect([...new Set(ad180B.map((b) => b.targetIdx))]).toEqual([B_ADA]);
      for (const b of ad180B) expect(b.expiresFrame! - b.frame).toBe(15 * FPS);
    });
    it('fixture A (arcana never bursts): perfectly INERT — she is never in Wheel of Fortune', () => {
      expect(
        ad180A.length,
        'ownBurstGate must hold the 180% AD when arcana did not cast',
      ).toBe(0);
    });
    it('DISCRIMINATING: an all-allies retarget leaks 180% AD onto liter & arcana in fixture B', () => {
      const cf = arcanaBuffs(rGrantsAllies, B_ARCANA).filter(
        (b) => b.stat === 'attackDamagePct' && b.value === 180,
      );
      expect(
        [...new Set(cf.map((b) => b.targetIdx))].sort((a, b) => a! - b!),
      ).toEqual([0, 1, 2]);
    });
    it('DISCRIMINATING: the ungated model over-fires in fixture A (shipped stays inert)', () => {
      const cf = arcanaBuffs(rGateUngatedA, A_ARCANA).filter(
        (b) => b.stat === 'attackDamagePct' && b.value === 180,
      );
      expect(
        cf.length,
        'ungated 180% AD fires in A despite 0 arcana casts',
      ).toBeGreaterThan(0);
    });
    it('DISCRIMINATING: the old everyN:2 proxy also over-fires in fixture A (shipped stays inert)', () => {
      const cf = arcanaBuffs(rGateEveryNA, A_ARCANA).filter(
        (b) => b.stat === 'attackDamagePct' && b.value === 180,
      );
      expect(
        cf.length,
        'everyN proxy fires on odd FB-ends in A despite 0 arcana casts',
      ).toBeGreaterThan(0);
    });
  });

  describe('A5 — S2: Strength grants 180% casterATK to B3 Electric casters, ownBurstGate', () => {
    const gB = casterAtkByDuration(B, B_ARCANA);
    const v5 = gB.get(10 * FPS)![0].value; // ungated 5% line (10s)
    const line = gB.get(15 * FPS)!; // 180% Strength (15s, ada-only)
    it('fixture B: 180% casterATK (36× the 5% line), ada-only, every FB-end, 15s', () => {
      expect([...new Set(line.map((b) => b.targetIdx))]).toEqual([B_ADA]);
      expect(firings(line).length).toBe(B_FB);
      expect(line[0].value / v5).toBeCloseTo(36, 6); // 180 / 5
    });
    it('fixture A (arcana never bursts): perfectly INERT', () => {
      const gA = casterAtkByDuration(A, A_ARCANA);
      expect(gA.has(15 * FPS) ? gA.get(15 * FPS)!.length : 0).toBe(0);
    });
    it('DISCRIMINATING: an all-allies retarget leaks Strength onto all three in fixture B', () => {
      const cf = casterAtkByDuration(rGrantsAllies, B_ARCANA).get(15 * FPS)!;
      expect(
        [...new Set(cf.map((b) => b.targetIdx))].sort((a, b) => a! - b!),
      ).toEqual([0, 1, 2]);
    });
  });

  describe('A6 — S2: Death grants burstCdr 6 + 50% casterATK to all allies, ownBurstGate', () => {
    // 50% casterATK = the 5s casterAtk line, all allies. (burstCdr is event-silent — it mutates
    // burstCdFrames directly — so the gate is pinned via this observable sibling.)
    const gB = casterAtkByDuration(B, B_ARCANA);
    const v5 = gB.get(10 * FPS)![0].value;
    const line = gB.get(5 * FPS)!;
    it('fixture B: 50% casterATK (10× the 5% line), all allies, every FB-end, 5s', () => {
      expect(
        [...new Set(line.map((b) => b.targetIdx))].sort((a, b) => a! - b!),
      ).toEqual([0, 1, 2]);
      expect(firings(line).length).toBe(B_FB);
      expect(line[0].value / v5).toBeCloseTo(10, 6); // 50 / 5
    });
    it('fixture A (arcana never bursts): perfectly INERT', () => {
      const gA = casterAtkByDuration(A, A_ARCANA);
      expect(gA.has(5 * FPS) ? gA.get(5 * FPS)!.length : 0).toBe(0);
    });
    it('DISCRIMINATING: un-gating Death makes it fire in fixture A (shipped stays inert)', () => {
      const gAcf = casterAtkByDuration(rGateUngatedA, A_ARCANA);
      expect(gAcf.has(5 * FPS) && firings(gAcf.get(5 * FPS)!).length > 0).toBe(
        true,
      );
    });
  });

  describe('A7 — S1: 5% casterATK to all allies, UNGATED (fires every FB-end WHETHER OR NOT arcana burst)', () => {
    it('fixture B: all three allies on every FB-end, 10s', () => {
      const line = casterAtkByDuration(B, B_ARCANA).get(10 * FPS)!;
      expect(
        [...new Set(line.map((b) => b.targetIdx))].sort((a, b) => a! - b!),
      ).toEqual([0, 1, 2]);
      expect(firings(line).length).toBe(B_FB);
    });
    it('fixture A: STILL fires every FB-end (ungated) — the contrast with the inert gated lines', () => {
      const line = casterAtkByDuration(A, A_ARCANA).get(10 * FPS)!;
      expect(
        firings(line).length,
        'ungated 5% must fire on every FB-end even though arcana never bursts',
      ).toBe(A_FB);
    });
  });

  describe('A8 — S2: 7.5% Attack Damage to all allies, UNGATED (every FB-end whether or not arcana burst)', () => {
    it('fixture B: 7.5% for 10s on all three allies, every FB-end', () => {
      const g = arcanaBuffs(B, B_ARCANA).filter(
        (b) => b.stat === 'attackDamagePct' && b.value === 7.5,
      );
      expect([...new Set(g.map((b) => b.value))]).toEqual([7.5]);
      expect(
        [...new Set(g.map((b) => b.targetIdx))].sort((a, b) => a! - b!),
      ).toEqual([0, 1, 2]);
      expect(firings(g).length).toBe(B_FB);
      for (const b of g) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });
    it('fixture A: STILL fires every FB-end (ungated)', () => {
      const g = arcanaBuffs(A, A_ARCANA).filter(
        (b) => b.stat === 'attackDamagePct' && b.value === 7.5,
      );
      expect(firings(g).length).toBe(A_FB);
    });
  });

  describe('A0 — The Magician (S2 CD ▼75%) is an honest UNMODELED skip', () => {
    it('the override documents the skip verbatim in unmodeled.skill1 (engine has no skill-CD model)', async () => {
      const { readFileSync } = await import('node:fs');
      const ov = JSON.parse(
        readFileSync(
          new URL('../../../src/skills/overrides/arcana.json', import.meta.url),
          'utf8',
        ),
      );
      expect(ov.unmodeled.skill1.join(' ')).toMatch(
        /Cooldown of Skill 2 ▼ 75% for 15 sec/,
      );
      expect(
        JSON.stringify(ov),
        'validator forbids ignored-effect blocks',
      ).not.toMatch(/"ignored"/);
    });
  });
});

```

## 8. S2c/S5 reconciliation + the gate FIX (driver, sighted)

CONVERGENCE: driver (sighted), S2b (fable, blind), S6 (opus, blind) ALL converge on the same 10 lines: 9 load-bearing FAITHFUL + The Magician UNMODELED-verbatim (no skill-CD primitive). Same misread traps named independently: FB-end-not-enter, casterAtkPct-not-atkPct, B3-Electric-caster target discipline, Judgement boss-held (casterIdx=null).

THE GATE FIX (the one substantive divergence from the parser-baseline, now corrected):
- The prose gates S1[0]/S2[0]/S2[1] on "if self is in Wheel of Fortune status". Arcana is the SOLE source of Wheel of Fortune (her own burst grants it to Electric allies incl. herself). So "self in WoF status" ⟺ "arcana cast her burst this rotation".
- A literal 10s WoF buff-aliveness check at fullBurstEnd is DEAD-BY-EPSILON: cast → FB opens → ~10s FB → FB-end is >10s after the cast, so the WoF buff has expired by FB-end. A literal reading would zero the ENTIRE gated half of the kit, contradicting that it works in game. Both blind models (fable S2b, opus S6) independently derived ownBurstGate:'cast' as the faithful encoding for exactly this reason.
- The parser-baseline shipped a round-count proxy (everyN:2 offset:1) that is unfaithful in BOTH directions. REPRODUCED: in [liter,crown,arcana,ada,helm] arcana casts 0 bursts (crown cd20 contests the B2 slot), yet everyN fired the gated 180%AD 6× and Death-50% 30× (over-credit — she is never in WoF). In [liter,arcana,ada] (sole B2, bursts every rotation) everyN fired the gated lines on only ceil(FB/2) FB-ends (under-fire — she is in WoF every rotation). ownBurstGate:'cast' is correct in both regimes (measured: 0 firings at 0 casts; every FB-end when she casts every rotation).
- ENGINE VERIFIED: sim.ts:2246 fires fullBurstEnd triggers BEFORE :2252 resets rotationCasters, so ownBurstGate:'cast' correctly sees this-rotation casters at FB-end. (The opus S6 flag #2 "modeled≠working" concern is resolved: it works.)
- RESIDUAL ⚑ (unmeasured, preserved): the precise WoF WINDOW timing vs FB-end is not recorded; "cast this rotation" is the logically-necessary gate semantic, but exact buff-duration overlap awaits a recording.

S5 BLIND TEST vs driver override — 6 failures, ALL classified as blind-test ARTIFACTS (NOT real gotchas):
- K3 (×2), K4, K5a-ACTIVE: the blind test filters casterAtkPct buffs by percentage value (value===5/50/180), but the engine stores casterAtkPct as ABSOLUTE ATK (≈4986.7 / 49867 / 179521.2 for arcana). The filters return empty, so the assertions fail on a representation misconception. The driver test pins these lines via magnitude RATIOS (5:50:180 = 1:10:36) and they are FAITHFUL. (RECON_ERROR class — blind misread the engine's casterAtkPct representation, which §2 documents.)
- K5b: "removing burstCdr costs Full Bursts" — FB count is 4 with and without the 6s CDR in fixture B; the CDR IS applied (mutates burstCdFrames) but does not cross a FB-count boundary in this fixture. A discrimination WEAKNESS in the blind fixture, not a faithfulness failure (the burstCdr is modeled and fires; it is event-silent by engine design).
- inertness reloadSpeedPct: the blind test's forbidden-stat filter is `casterIdx === A_ARCANA(=2) || casterIdx === B_ARCANA(=1)` applied to the UNION of fixtures A and B. In fixture A [liter,crown,arcana,ada,helm], slot 1 is CROWN, and crown's kit grants reloadSpeedPct — so the slot-index collision pulls crown's reloadSpeedPct into "arcana granted". Arcana's own override grants none of the forbidden stats. RECON_ERROR (slot-collision bug).
- IMPORTANTLY: K5a's DISCRIMINATING assertions (fixture A) PASS against the fixed override — the gated Death line is correctly INERT when arcana never bursts. Against the OLD everyN proxy they would have failed (over-fire). So the blind test's gate-discrimination intent is satisfied by the FIX.

S2d verification matrix: driver test 24/24 GREEN vs the fixed shipped override; every load-bearing line has a GREEN-vs-shipped + RED-vs-counterfactual pair (Wheel scoping, nuke 300, Judgement, 180 AD/Strength target+gate, Death gate, 5%/7.5% ungated). Counterfactuals include the ungated model AND the old everyN proxy, both shown to over-fire in fixture A where the shipped encoding stays inert. validate-overrides arcana → valid.

## 9. Board reading (non-gating context)

Base `arcana` is NOT on the accuracy board: kit-status tier MODEL_ONLY, graded.teams=0, board=null, no recording. (The variant `arcana-fortune-mate` is on the board at rank 28, COLD 0.898 — a DIFFERENT unit.) The gate FIX therefore has ZERO graded-regression impact; it corrects the model before any future grading/recording.

## 10. Verdict instructions

Grade per §0. Classify every line FAITHFUL / DOCUMENTED_GAP / REAL-GOTCHA / RECON_ERROR. The S5 blind-test failures are pre-classified in §8 as blind-test artifacts (casterAtkPct representation misconception ×4, FB-count discrimination weakness ×1, slot-collision ×1) — verify that classification against the engine facts in §2 and the artifacts above; if you agree they are RECON_ERROR/artifacts and not real divergences, they do NOT block GO. The one substantive encoding change (everyN:2off1 → ownBurstGate:'cast') is documented in §3/§8 with reproduced evidence and cross-family corroboration — judge whether it is FAITHFUL (the driver claims the round-count proxy was the unfaithful encoding). Return ONLY the JSON:
{slug, kitDescription, convergence, lineFindings, gotchas, discriminationOk, faithfulnessScore, verdict, verdictRationale, model}
