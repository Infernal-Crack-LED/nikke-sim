# S7 JUDGE PACKET — `ada` (Ada) — compact, answer-faithful compilation of the gauntlet artifacts

Read this file ONCE, then return the JSON verdict. Do NOT read any other file. You grade ARTIFACTS vs ground
truth; you do NOT trust the driver's self-report. The full grading methodology + output contract is in §0.

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
  "convergence": {
    "s5TestsVsDriverOverride": "GREEN|RED",
    "redAssertions": ["<which S5 assertions fail vs the driver's override>"]
  },
  "lineFindings": {
    "skill1": [
      {
        "kitLine": "<≤40 chars>",
        "category": "FAITHFUL|DOCUMENTED_GAP|REAL-GOTCHA|RECON_ERROR",
        "subkind": "SILENT_DROP|ENGINE|FIDELITY|ENCODING|null",
        "driverSaid": "...",
        "blindSaid": "...",
        "formulaCheck": "...",
        "fireRateOk": true,
        "explanation": "..."
      }
    ],
    "skill2": [],
    "burst": []
  },
  "gotchas": [
    {
      "subkind": "SILENT_DROP|ENGINE|FIDELITY|ENCODING",
      "slot": "...",
      "summary": "...",
      "evidence": "<real kit line + formula citation + driver vs blind>",
      "documentedByDriver": true,
      "severity": "high|med|low",
      "suggestedFix": "<faithful representation, or 'needs measurement' + recipe — NEVER a fudge>"
    }
  ],
  "discriminationOk": true,
  "faithfulnessScore": "<0..1 fraction of kit lines FAITHFUL or DOCUMENTED_GAP>",
  "verdict": "GO|NO-GO(faithfulness)|NO-GO(engine-core)",
  "verdictRationale": "<one paragraph: which gotchas are real + ranked; whether the blind re-derivations converged; what must change for GO; the same-model residual the owner should spot-check>"
}
```

Save to `scripts/kit-autonomy/results/<slug>.json`. `suggestedFix` is a faithful representation or a flagged
measurement, NEVER a number chosen to hit the board. Tight structured JSON, not an essay.

## 1. Ground truth — kit prose (data/characters.json → characters.ada.skills, level-10 values)

Base: RL / Electric / Attacker / Burst III, cd 40s, ammo 6, reloadFrames 141, chargeFrames 60, hitsPerShot 1, normalAttackMultiplier 61.3, chargeMultiplier 250, coreAttackMultiplier 200, burstGaugePerShot 1.4.

- S1 (Covert Support): ■ Activates when entering Full Burst. Affects all Burst 3 allies who previously used their Burst Skill. | ATK ▲ 60% of the skill user's ATK for 10 sec. | True Damage ▲ 50% for 10 sec. | Recovers 10% of damage as HP for 10 sec.
- S2 (Flash Grenade): ■ Activates during Full Burst. Affects enemies within attack range nearest to the crosshair every 2 sec. | Flash Grenade Toss: Deals 420% of final ATK as True Damage. | ■ Activates when using Burst Skill. Affects self. | Flash Grenade Toss activation time condition ▼ 1 sec for 10 sec.
- Burst (Secret Agent): ■ Affects self. | ATK ▲ 40% for 10 sec. | True Damage ▲ 42% for 10 sec. | Special Modification | Function: Decreases Charge Speed but increases Charge Damage for 1 round(s). | Effect 1: Charge Speed ▼ 300%. | Effect 2: Charge Damage ▲ 1500%.

## 2. Damage-formula SSOT (summary; docs/data/damage-calculation.md + game-mechanics.md)

Damage = ATK × major (×1.10 element if advantaged; +50% FB major ONLY by timing — a burst CAST lands BEFORE
the FB window opens so it never takes the +50%) × charge × damageUp-bucket (attackDamagePct / trueDamagePct /
elemAdvantageDamagePct etc., ADDITIVE within the bucket) × taken (damageTakenPct on the boss) × distributed.

- casterAtkPct = a FLAT add of % of the CASTER's ATK (not the target's own ATK; that would be atkPct).
- trueDamagePct feeds ONLY true-flavored damage (the engine gates it by flavor); on a unit with no true source it is inert.
- A DoT/rider's damage instance carries bucket 'skill' and srcSlot 'skill2'; its mult is a DECOMPOSITION OBJECT
  {major,elem,charge,dmgUp,seqMult,projFactor,taken,distributed}, NOT a scalar.
- durationShots = a ROUND-count budget ("for N round(s)"), null expiry; durationSec = wall-clock. "for 1 round(s)" is literally durationShots:1.
- weaponSwap replaces the weapon (chargeTimeSec / chargeMultPct / damagePct) for its duration; a swapped charge
  shot shows up in the 'normal' bucket with mult.charge = chargeMultPct/100.
- DEF is damage-inert in the sim; no HP pool is modeled (lifesteal/heal/shield are offensively inert).

## 3. Driver's override (src/skills/overrides/ada.json, structural)

- S1 block: fullBurstEnter → burstCasters {stage:3} → casterAtkPct 60 (10s) + trueDamagePct 50 (10s)
- S2 block 1: fullBurstEnter → enemy → dot atkPct 420, intervalSec 2, durationSec 10, flavor true
- S2 block 2: burstCast → enemy → dot atkPct 420, intervalSec 2, durationSec 10, flavor true (the ▼1s rider
  encoded as a SECOND identical every-2s stream → combined 1/s during her burst windows)
- Burst block: burstCast → self → atkPct 40 (10s) + trueDamagePct 42 (10s) + weaponSwap {damagePct 61.3,
  chargeTimeSec 4, chargeMultPct 1750, durationSec 10} (Special Modification: Charge Speed ▼300%→4s charge,
  Charge Damage ▲1500%→1750%)
- unmodeled.skill1: "Recovers 10% of the damage dealt as HP for 10 sec." (lifesteal — no HP pool)
- caveats: ⚑ burst Special Modification "for 1 round(s)" — MEASUREMENT-GATED fidelity flag (kit-status F3):
  kit-literal = 1 boosted round/window (durationShots:1); shipped = weaponSwap durationSec:10 no maxShots →
  ~2 specials/window (~45% of total); board (0.99) leans on the 2nd shot, kit-literal cap → ~0.95; recipe =
  measure popup count per window, add maxShots:1 if kit-literal. Tier CALIBRATED ⚑ / MEASUREMENT-GATED.
- note carries "Kit-autonomy gauntlet 2026-07-24".

## 4. S2b pre-op adversarial review (claude-fable-5, CROSS-FAMILY)

{"leakDetected":null,"spec":[{"slot":"skill1","kitLine":"ATK ▲ 60% of the skill user's ATK","disposition":"FAITHFUL","scope":"Generic ATK grant, but sourced from the CASTER's ATK — a flat add of 60% of Ada's ATK, not a scale of the target's own ATK.","durationSemantics":"durationSec: 10 (wall-clock, per FB entry, refreshed each FB).","triggerIdentity":"fullBurstEnter (text: 'when entering Full Burst') — fires on ANY team FB, including rotations where helm bursts, NOT burstCast.","targetSet":"burstCasters stage III ('all Burst 3 allies who previously used their Burst Skill') — only the B3(s) who actually cast this rotation; includes Ada herself on her own rotations; helm receives it on helm's rotations.","nearestWrongModel":"stat atkPct (scales the target's own ATK) instead of casterAtkPct; and/or target = all B3 allies regardless of whether they cast (over-credits the idle co-B3 every rotation).","distinguishingAssertion":"onEvent buffApply at each fullBurstStart: stat casterAtkPct value 60 applied ONLY to the rotation's B3 caster(s). In controlComp(ada) with helm co-B3, on a helm-burst rotation helm gets the buff and ada does NOT (and vice versa). Damage delta on helm from this buff scales with ADA's staticAtk (patch ada's ATK via withPatchedOverride-adjacent means → helm's flat add moves), not helm's.","inertness":"Must NOT apply to liter (B1) or crown (B2) ever; must NOT apply to a B3 that did not cast this rotation.","evidenceTier":"DATAMINED","loadBearing":true},{"slot":"skill1","kitLine":"True Damage ▲ 50% for 10 sec","disposition":"FAITHFUL","scope":"trueDamagePct — boosts TRUE-flavored damage only. On Ada it feeds her S2 grenade (true-flavored); on a target with no true-damage source it is inert.","durationSemantics":"durationSec: 10.","triggerIdentity":"fullBurstEnter, same block as the ATK line.","targetSet":"burstCasters stage III (same as line 1).","nearestWrongModel":"Encoded as generic attackDamagePct (boosts ALL damage of the target, including normal RL shots and helm's SR shots) instead of true-flavor-scoped trueDamagePct.","distinguishingAssertion":"With the buff live, damage events flavored 'true' (the S2 grenade) grow by the bucket math; ada's NORMAL RL shot damage per hit is UNCHANGED by toggling this line via withPatchedOverride. On a helm-burst rotation the buff applies to helm but moves ZERO helm damage (helm has no true-flavored hits).","inertness":"Normal-attack and charge-bucket damage must not move when this value is zeroed; helm total must be insensitive to it.","evidenceTier":"DATAMINED","loadBearing":true},{"slot":"skill1","kitLine":"Recovers 10% of damage as HP","disposition":"UNMODELED","scope":"Lifesteal on the B3 burst caster(s) — no HP pool in v1, offensively inert as a stat.","durationSemantics":"durationSec: 10 window.","triggerIdentity":"Same fullBurstEnter block.","targetSet":"burstCasters stage III.","nearestWrongModel":"Silently dropped with no unmodeled record; OR modeled as a per-hit 'heal' effect that spams recovery events every damage tick, spuriously feeding an on-recovery consumer.","distinguishingAssertion":"TANDEM CHECK (taxonomy #4): targets are B3 casters only — crown (the known 'recovery'-trigger consumer) is B2 and can NEVER be a target, so no recovery events need be emitted for her sake. Assert zero 'recovery'-kind consequences: crown's on-recovery blocks fire the same count with this line present vs absent. Line must appear verbatim in `unmodeled.skill1`.","inertness":"Must move zero damage anywhere; must not emit recovery events that trip crown.","evidenceTier":"DATAMINED","loadBearing":false},{"slot":"skill2","kitLine":"Flash Grenade Toss: 420% … True Damage","disposition":"FAITHFUL","scope":"flatDamage atkPct 420, flavor 'true', single enemy. Rider defaults per methodology #9: no core, crits at caster rate, noRange (engine force-sets), FB +50% by TIMING — since it only fires during FB, fbMajorApplied should be true on every proc.","durationSemantics":"Repeating while FB is live; each proc instant.","triggerIdentity":"interval sec:2 gated fbGate:'inFb' ('Activates during Full Burst … every 2 sec'). ⚑ first-fire phase within the FB window (t=FB+2 vs t=FB+0) is a convention — pin from footage if cadence-sensitive.","targetSet":"enemy (boss).","nearestWrongModel":"Ungated interval:2 running the whole fight (fires outside FB too — roughly doubles-to-triples proc count over a rotation), OR a single proc per FB keyed to fullBurstEnter, OR noFb:true stripping the +50% it earns by timing.","distinguishingAssertion":"Count damage events with srcSlot skill2 / flavor 'true': ~5 per 10s FB window (2s cadence), ZERO between fullBurstEnd and the next fullBurstStart. Every such event has inFullBurst true and fbMajorApplied true. Zeroing trueDamagePct sources must scale these events; normal shots untouched.","inertness":"No grenade events outside FB; no core bucket on grenade hits; rangeApplied false.","evidenceTier":"DATAMINED","loadBearing":true},{"slot":"skill2","kitLine":"activation time condition ▼ 1 sec for 10 sec","disposition":"GAP","scope":"Reduces the grenade's interval from 2s to 1s — i.e. DOUBLES proc rate for 10s. This is a proc-economy line (taxonomy #6 analog): it gates hit count, never 'defensive/skip'.","durationSemantics":"durationSec: 10 from Ada's own burst cast.","triggerIdentity":"burstCast, self ('Activates when using Burst Skill' in her own S2 block) — NOT fullBurstEnter. Diverges exactly when the co-B3 exists: on helm-burst rotations the speed-up must NOT be live.","targetSet":"self (modifies her own S2 interval).","nearestWrongModel":"Keyed to fullBurstEnter so every FB gets 1s cadence (over-credits ~2× grenade count on all non-Ada rotations); OR dropped because the schema's interval trigger has a static `sec` and no interval-modifier primitive — a silent drop halves grenade output on Ada rotations.","distinguishingAssertion":"Grenade event count per FB window: ~10 in an FB entered off Ada's own burstCast (1s cadence, 10s overlap), ~5 in an FB entered off helm's burst (2s cadence). Both counts asserted from onEvent, keyed by which slot emitted burstCast that rotation.","inertness":"Helm-rotation grenade cadence stays 2s; nothing else in the kit moves.","evidenceTier":"DATAMINED","loadBearing":true},{"slot":"burst","kitLine":"ATK ▲ 40% for 10 sec","disposition":"FAITHFUL","scope":"Generic atkPct on self (scales own ATK — distinct stat from skill1's casterAtkPct flat add; both can be live simultaneously on Ada's own rotations).","durationSemantics":"durationSec: 10.","triggerIdentity":"burstCast (self buff inside her OWN burst block; no 'Activates when' clause needed — the burst header is the trigger). Fires only on rotations Ada bursts; cd 40s means at most every other ~20s rotation, alternating with helm.","targetSet":"self.","nearestWrongModel":"fullBurstEnter — applies every team FB including helm's rotations (over-credits ~2× uptime in the control comp).","distinguishingAssertion":"buffApply stat atkPct value 40 target ada occurs ONLY on frames where a burstCast event with ada's slot precedes it; count of these applications over the fight equals ada's burstCast count, not the fullBurstStart count.","inertness":"No application on helm-burst rotations; no ally receives it.","evidenceTier":"DATAMINED","loadBearing":true},{"slot":"burst","kitLine":"True Damage ▲ 42% for 10 sec","disposition":"FAITHFUL","scope":"trueDamagePct self — additive in the same Damage-Up bucket as skill1's 50% when both live (Ada-burst rotations: 92 additive points feeding her true-flavored grenade only).","durationSemantics":"durationSec: 10.","triggerIdentity":"burstCast self.","targetSet":"self.","nearestWrongModel":"Generic attackDamagePct (would boost her RL normals + the 1500% charge round, a large over-credit), or fullBurstEnter keying.","distinguishingAssertion":"Zeroing this value changes ONLY grenade-event damage on Ada-burst rotations; her normal/charge-bucket per-shot damage and all helm-rotation grenade damage are bit-identical.","inertness":"Normal + charge damage; helm rotations.","evidenceTier":"DATAMINED","loadBearing":true},{"slot":"burst","kitLine":"Charge Speed ▼ 300% … for 1 round(s)","disposition":"FIX","scope":"Weapon-state modifier (taxonomy #6) — this IS damage: it slows the next charge shot, costing shot economy inside her own buff window. chargeSpeedPct −300 on self.","durationSemantics":"'for 1 round(s)' = ROUND COUNT → durationShots: 1. NEVER durationSec. The buff must survive the entire (lengthened, multi-second) charge of the next round and drop right after that round fires.","triggerIdentity":"burstCast self (rider of Special Modification inside her own burst).","targetSet":"self.","nearestWrongModel":"durationSec: 1 — the slow expires before the ~4s charge completes, so the round fires at normal speed AND (fatally, if the paired damage line shares the encoding) the +1500% applies to zero shots. Second-order trap: naive chargeSpeed math 1+(−300/100) = −2 gives a negative/NaN charge time; the faithful reading is charge time ×(1+3)=×4 (chargeFrames 60 → ~240f ≈ 4s). ⚑ verify the engine's negative-chargeSpeed handling explicitly.","distinguishingAssertion":"After each ada burstCast, the gap between her burst frame and her NEXT shot event ≈ 4× base charge time (~240f), and the SECOND post-burst shot returns to ~60f charge cadence. Under durationSec:1 the first-shot gap collapses to ~60f — red.","inertness":"Exactly one round slowed per burst; ammo economy otherwise unchanged; no effect on helm rotations.","evidenceTier":"DATAMINED","loadBearing":true},{"slot":"burst","kitLine":"Charge Damage ▲ 1500% … for 1 round(s)","disposition":"FIX","scope":"chargeDamagePct +1500 (ADDITIVE percentage points in the charge bucket, per schema) scoped to charge-bucket damage only — never normal or grenade damage.","durationSemantics":"durationShots: 1 — expires right after the one mega round fires, spanning however long its slowed charge takes (and a reload if the burst lands on an empty mag).","triggerIdentity":"burstCast self, same Special Modification rider as the speed line — the two must land and expire TOGETHER on the same single round.","targetSet":"self.","nearestWrongModel":"durationSec: 1 (window closes mid-charge → the mega shot never happens, silently deleting the kit's signature nuke); or chargeDamageMultPct (scales by BASE charge damage — different arithmetic); or durationShots forgotten so ALL subsequent rounds carry +1500% (massive over-credit).","distinguishingAssertion":"Exactly ONE post-burst shot per ada burstCast carries the boosted charge bucket (per-hit damage ~an order of magnitude above her normal charge shots, landing seconds after cast); shot #2 after the burst is back at baseline charge damage. Assert both the boosted count == her burstCast count AND shot#2's per-hit value.","inertness":"Grenade (true) damage and normal-bucket damage untouched; only 1 round per burst boosted.","evidenceTier":"DATAMINED","loadBearing":true}],"loadBearingSet":["skill1:ATK ▲ 60% of skill user's ATK (fullBurstEnter → burstCasters III)","skill1:True Damage ▲ 50% (true-flavor scoped)","skill2:Flash Grenade Toss 420% true @ interval 2s, inFb-gated","skill2:activation time ▼1s for 10s (burstCast self → 1s cadence)","burst:ATK ▲ 40% self (burstCast)","burst:True Damage ▲ 42% self (burstCast)","burst:Charge Speed ▼ 300% for 1 ROUND (durationShots:1)","burst:Charge Damage ▲ 1500% for 1 ROUND (durationShots:1)"],"unmodeledVerbatim":{"skill1":["Recovers 10% of damage as HP for 10 sec."],"skill2":[],"burst":[]},"notes":"Expected shared-prior misreads to hunt: (1) THE trap is 'for 1 round(s)' on both Special Modification effects — durationSec:1 is red because the slowed charge itself takes ~4s, so a seconds encoding yields ZERO boosted shots; the faithful encoding is durationShots:1 with the buff surviving across the lengthened charge (helm's '10 round(s)' precedent in the schema comment shows durationShots is the sanctioned primitive). (2) Charge Speed ▼300% arithmetic: a 1+pct/100 formula goes NEGATIVE — the engine's handling must be inspected/asserted (faithful ≈ charge time ×4); a clamp-to-instant or NaN silently changes shot economy. (3) skill1's ATK is 'of the skill user's ATK' → casterAtkPct flat add, and its target is burstCasters(III) — with helm as co-B3 in controlComp, an all-B3 or fullBurstEnter-to-everyone encoding over-credits the non-casting B3 every rotation; conversely the driver may key it burstCast and under-credit helm rotations. (4) skill2's ▼1s rider is burstCast-gated — a fullBurstEnter keying doubles grenade count on every helm rotation; also the schema has NO interval-modifier primitive, so watch for a silent drop (halves Ada-rotation grenades) or a hacky always-1s encoding (over-credits helm rotations) — either divergence is load-bearing and must be surfaced, not averaged. (5) Grenade rider flags: it earns the FB +50% by timing (noFb must be OFF), gets no core, is noRange — a noFb:true or core:true drifts it. (6) True Damage ▲ lines must be flavor-scoped: on helm they're INERT (no true source) — an attackDamagePct encoding leaks into normals/charge and is the single biggest silent over-credit available in this kit. All magnitudes are kit-literal (DATAMINED); the only ⚑s are the interval first-fire phase convention and the negative-charge-speed engine semantics."}

## 5. S5 blind post-op test-writer (claude-opus-4-8, CROSS-FAMILY)

NOTE FOR THE JUDGE: this test was authored with NO tools, so several field/API names are best-guesses the model
flagged inline. The driver measured the REAL engine event semantics (authoritative for classification):

- casterAtkPct buffApply.value is the RESOLVED FLAT ATK grant (≈71800 = 60% of Ada's ATK), NOT 60 — so the
  blind's `applies(evs,'casterAtkPct',60)` finds zero matches. This is a RECON_ERROR (event-semantics mis-guess),
  NOT a kit divergence; the blind's INTENT (casterAtkPct, not atkPct) is correct and converges with the driver.
- damage.mult is a decomposition OBJECT, not a scalar — the blind's `e.mult > 3` filter is a RECON_ERROR.
- The override structure is ov.skill1/skill2/burst arrays, NOT ov.blocks; CompOptions takes `overrides:` (a
  Record<slug,OverrideFile>), NOT `overridesPatch:`; a unit row exposes `totalDamage`, not `.total`; totals(res)
  is Record<slug,number>, not `.total`. All counterfactual-run mechanics in the blind test are RECON_ERRORs of
  the no-tools dispatch — grade the blind's SPEC INTENT (§5 spec table), not its un-runnable plumbing.
- The blind test's INTENT converges with the driver on EVERY load-bearing line EXCEPT the Special Modification
  duration: the blind asserts durationShots:1 (kit-literal 1 round) and that a 10s window would deal STRICTLY MORE
  total damage — i.e. it independently flags the same F3 over-fire the driver documents as a ⚑.

spec + fixtures + gaps:
{"leakDetected":null,"spec":[{"slot":"skill1","kitLine":"ATK +60% of skill user's ATK 10s","disposition":"FAITHFUL","assertion":"buffApply stat==='casterAtkPct' value 60 present; fails under nearest-wrong atkPct 60 (self-scaled) which would emit stat 'atkPct'. Solo comp nets same ATK, so event-stat is the discriminator."},{"slot":"skill1","kitLine":"True Damage +50% 10s","disposition":"FAITHFUL","assertion":"buffApply trueDamagePct 50 present; no attackDamagePct 50 (fails if mis-bucketed to generic Damage-Up as attackDamagePct)."},{"slot":"skill1","kitLine":"trigger = entering Full Burst","disposition":"FAITHFUL","assertion":"casterAtkPct-60 apply count == fullBurstStart count. Discriminates fullBurstEnter vs fullBurstEnd; solo-comp cannot separate fullBurstEnter from burstCast (1:1) — flagged."},{"slot":"skill1","kitLine":"target = B3 allies who used burst","disposition":"FAITHFUL","assertion":"target burstCasters{stage:3}; in solo the set is Ada herself. Non-carrier B3 (helm, no burst cast) must NOT receive it — checked indirectly via teammate byte-identity in the grenade-removal test (helm total unchanged)."},{"slot":"skill1","kitLine":"Recovers 10% of damage as HP","disposition":"GAP","assertion":"it.skip — lifesteal with no HP pool in v1; offensively inert. Only relevance is emitting recovery events for a teammate on-recovery consumer (tandem)."},{"slot":"skill2","kitLine":"Flash Grenade 420% true dmg","disposition":"FAITHFUL","assertion":"big true-flavored hits (mult>3, bucket~true) all have inFullBurst===true; fails under nearest-wrong ungated interval (hits with inFullBurst=false). Non-vacuity: out-of-FB normal shots proven present."},{"slot":"skill2","kitLine":"target = enemy nearest crosshair","disposition":"FAITHFUL","assertion":"removing the flatDamage-420 block drops Ada's total but leaves liter/crown/helm totals byte-identical — grenade hits only the enemy, never teammates."},{"slot":"skill2","kitLine":"grenade activation-time -1s 10s","disposition":"GAP","assertion":"it.skip — no primitive to dynamically shorten an interval trigger. Trigger identity is burstCast (self, on own burst). In practice it halves grenade cadence 2s->1s across Ada's FB; ⚑ the base skill2 interval should stay 2s and this is unmodeled."},{"slot":"burst","kitLine":"ATK +40% 10s (self)","disposition":"FAITHFUL","assertion":"buffApply atkPct 40 present (self-scaled, correct here since it's the caster's own ATK)."},{"slot":"burst","kitLine":"True Damage +42% 10s (self)","disposition":"FAITHFUL","assertion":"buffApply trueDamagePct 42 present."},{"slot":"burst","kitLine":"Charge Speed -300% 1 round","disposition":"FAITHFUL","assertion":"buffApply chargeSpeedPct -300 present; paired with durationShots:1 (round-count). Slows the single post-burst charge shot."},{"slot":"burst","kitLine":"Charge Damage +1500% 1 round","disposition":"FAITHFUL","assertion":"buffApply chargeDamagePct 1500 present; DURATION SEMANTICS discriminated by counterfactual: patching durationShots:1 -> durationSec:10 strictly increases total (many charged shots boosted vs only the next one). Green under round-count, red (total too high) under seconds."}],"fixtures":"controlComp('ada', true) throughout — liter B1 / crown B2 / ada B3 carry / helm B3, boss Fire, focus ada. helm=true kept (its crit buffs live in separate buckets and cannot touch the trueDamagePct/casterAtkPct buffApply-stat assertions or the true-flavored grenade filter). The comp is required so a B3 chain completes and Ada actually enters Full Burst and self-bursts each rotation, which is what makes skill1's 'B3 burst-caster' target set include her and gates skill2's grenade window. Deterministic, no seed. Three hoisted runs: base + two withPatchedOverride counterfactuals (charge-window, grenade-removal).","gaps":["skill1 line 3 'Recovers 10% of damage as HP' — it.skip: lifesteal, v1 has no HP pool; offensively inert (only a potential on-recovery tandem feed).","skill2 line 2 'Flash Grenade activation-time condition -1 sec for 10 sec' — it.skip: no primitive to mutate an interval trigger's period; the burstCast-scoped reduction effectively halves grenade cadence 2s->1s during Ada's own FB but cannot be encoded, so the base interval stays 2s and this is ⚑ unmodeled.","SOLO-COMP LIMITATIONS (not skips, flagged): (a) casterAtkPct vs atkPct nets identical total ATK when caster===sole target, so only the event-stat name discriminates the encoding; (b) fullBurstEnter vs burstCast trigger identity is 1:1 in a solo self-burst comp and cannot be separated by count — a multi-B3 comp would be needed to prove skill1 keys to FB entry (and gains the +50% FB major) rather than pre-FB burst cast.","⚑ Flash Grenade rider crit/core/noFb: modeled noRange (riders off-range) and no core (text says no 'core strike'); crit-eligibility at caster rate is a RIDERCRIT judgment left unset/conservative — measurement-gated, not asserted.","⚑ 'Charge Damage +1500%' read as chargeDamagePct (additive charge-bucket points) rather than chargeDamageMultPct (scales base charge damage); the two diverge and the choice is not provable from prose alone."]}

blind test source (as authored; plumbing best-guesses noted above):

```ts
import { describe, it, expect } from 'vitest';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness';

// ada — RL/Electric/Attacker/Burst III. BLIND spec test authored from kit prose ALONE.
// (event/API field names mirror the harness contract described in the packet; where a field is a
//  best-guess it is noted inline — a divergence there IS a payload for the judge.)
//
// KIT (ground truth):
//   skill1  ■ Activates when entering Full Burst. Affects all Burst-3 allies who previously used their Burst.
//              - ATK +60% OF THE SKILL USER'S ATK, 10s   -> casterAtkPct 60 (flat add of caster's ATK; NOT self-scaled atkPct)
//              - True Damage +50%, 10s                    -> trueDamagePct 50
//              - Recovers 10% of damage as HP, 10s        -> lifesteal (no HP pool in v1 -> GAP)
//   skill2  ■ Activates during Full Burst. Affects enemy nearest crosshair EVERY 2 sec.
//              - Flash Grenade Toss: 420% of final ATK as True Damage -> flatDamage atkPct 420 flavor true, interval 2s, fbGate inFb, noRange
//           ■ Activates when using Burst Skill. Affects self.
//              - Flash Grenade activation-time condition -1 sec, 10s   -> mutates skill2 interval 2s->1s (no primitive -> GAP)
//   burst   ■ Affects self.
//              - ATK +40%, 10s          -> atkPct 40
//              - True Damage +42%, 10s  -> trueDamagePct 42
//              - Special Modification, for 1 ROUND(S):  (durationShots:1, NOT seconds)
//                  Charge Speed -300%   -> chargeSpeedPct -300
//                  Charge Damage +1500% -> chargeDamagePct 1500 (additive charge-bucket points)
//
// FIXTURE: controlComp('ada', true) — liter B1 / crown B2 / ada B3 carry / helm B3; ada self-bursts each
//   rotation so (a) she enters Full Burst and (b) skill1's 'burst-caster B3' target set includes her.
//
// WHY the discriminators: buffApply events carry {stat,value} so encoding choices (casterAtkPct vs atkPct,
//   trueDamagePct vs attackDamagePct, durationShots vs durationSec) are checked STRUCTURALLY even in a solo
//   comp where the two encodings would net the same total ATK.

type Ev = any;
function run(opts: any) {
  const events: Ev[] = [];
  const cfg = { ...(opts.cfg || {}), onEvent: (e: Ev) => events.push(e) };
  const res = runComp({ ...opts, cfg });
  return { res, events };
}

const ADA = 'ada';
const applies = (evs: Ev[], stat: string, value: number) =>
  evs.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.stat === stat &&
      Math.abs(e.value - value) < 1e-6
  );
// grenade / charge-nuke hits stand far above a normal RL shot (base mult 0.613, core 2.0)
const bigTrue = (e: Ev) =>
  e.kind === 'damage' && e.mult > 3 && /true/i.test(String(e.bucket));
const normalHit = (e: Ev) => e.kind === 'damage' && e.mult < 3;

// ---- hoisted runs (each is a full 180s sim) ----
const base = run(controlComp(ADA, true));

// counterfactual A: charge buff as a 10s WINDOW instead of 1 ROUND -> many charged shots boosted
const longCharge = run({
  ...controlComp(ADA, true),
  overridesPatch: withPatchedOverride(ADA, (ov: any) => {
    for (const blk of ov.blocks)
      for (const eff of blk.effects)
        if (eff.kind === 'buff' && eff.stat === 'chargeDamagePct') {
          delete eff.durationShots;
          eff.durationSec = 10;
        }
  }),
});

// counterfactual B: strip the Flash-Grenade flatDamage block entirely
const noGrenade = run({
  ...controlComp(ADA, true),
  overridesPatch: withPatchedOverride(ADA, (ov: any) => {
    ov.blocks = ov.blocks.filter(
      (b: any) =>
        !b.effects.some(
          (e: any) => e.kind === 'flatDamage' && Math.abs(e.atkPct - 420) < 1e-6
        )
    );
  }),
});

describe('ada — skill1 (FB-enter, B3 burst-casters)', () => {
  it('fixture actually enters Full Burst (non-vacuity)', () => {
    expect(
      base.events.filter((e) => e.kind === 'fullBurstStart').length
    ).toBeGreaterThan(0);
  });

  it('ATK buff is casterAtkPct 60 (flat % of CASTER ATK), NOT self-scaled atkPct 60', () => {
    // FAITHFUL: casterAtkPct present. NEAREST-WRONG: encoded as atkPct 60 -> would show stat 'atkPct'
    // value 60 instead (burst only grants atkPct 40, so a 60-valued atkPct can only come from mis-encoding).
    expect(applies(base.events, 'casterAtkPct', 60).length).toBeGreaterThan(0);
    expect(applies(base.events, 'atkPct', 60).length).toBe(0);
  });

  it('True Damage +50% is trueDamagePct 50', () => {
    // NEAREST-WRONG: attackDamagePct/elementDamagePct 50 -> different stat in the log.
    expect(applies(base.events, 'trueDamagePct', 50).length).toBeGreaterThan(0);
    expect(applies(base.events, 'attackDamagePct', 50).length).toBe(0);
  });

  it('skill1 buffs land AT Full Burst entry, not at burst cast', () => {
    // in a solo comp burstCast and fullBurstEnter are 1:1, so this checks COUNT parity with FB starts
    // (a burstCast mis-key would still count 1:1 here — flagged as a solo-comp limitation in the spec).
    const fbCount = base.events.filter(
      (e) => e.kind === 'fullBurstStart'
    ).length;
    expect(applies(base.events, 'casterAtkPct', 60).length).toBe(fbCount);
  });

  it.skip('Recovers 10% of damage as HP — GAP: lifesteal, no HP pool in v1 (offensively inert; only feeds a teammate on-recovery consumer)', () => {});
});

describe('ada — skill2 (Flash Grenade, during Full Burst)', () => {
  it('Flash Grenade true-damage hits fire ONLY during Full Burst', () => {
    // FAITHFUL: fbGate inFb. NEAREST-WRONG: interval with no FB gate -> hits appear with inFullBurst=false.
    const gren = base.events.filter(bigTrue);
    expect(gren.length).toBeGreaterThan(0);
    expect(gren.every((e) => e.inFullBurst === true)).toBe(true);
  });

  it('non-vacuity: the fixture also produces plenty of out-of-FB normal shots', () => {
    expect(
      base.events.some((e) => normalHit(e) && e.inFullBurst === false)
    ).toBe(true);
  });

  it('grenade is enemy-targeted — removing it drops Ada but leaves teammates byte-identical', () => {
    expect(unitOf(noGrenade.res, ADA).total).toBeLessThan(
      unitOf(base.res, ADA).total
    );
    for (const mate of ['liter', 'crown', 'helm']) {
      expect(unitOf(noGrenade.res, mate).total).toBe(
        unitOf(base.res, mate).total
      );
    }
  });

  it.skip('Flash Grenade activation-time -1s for 10s — GAP: no interval-mutation primitive; in practice halves cadence (2s->1s) across Ada\u2019s own FB window', () => {});
});

describe('ada — burst (self)', () => {
  it('self ATK +40% and True Damage +42%', () => {
    expect(applies(base.events, 'atkPct', 40).length).toBeGreaterThan(0);
    expect(applies(base.events, 'trueDamagePct', 42).length).toBeGreaterThan(0);
  });

  it('Special Modification: chargeDamage +1500 & chargeSpeed -300 present', () => {
    expect(
      applies(base.events, 'chargeDamagePct', 1500).length
    ).toBeGreaterThan(0);
    expect(applies(base.events, 'chargeSpeedPct', -300).length).toBeGreaterThan(
      0
    );
  });

  it('Special Modification lasts ONE ROUND, not a 10s window', () => {
    // FAITHFUL: durationShots:1 -> only the next charged shot is boosted.
    // NEAREST-WRONG: durationSec:10 -> every charged shot for 10s is boosted -> strictly more total damage.
    expect(totals(longCharge.res).total).toBeGreaterThan(
      totals(base.res).total
    );
  });
});
```

## 6. S6 blind post-op override-writer (claude-opus-4-8, CROSS-FAMILY)

{"leakDetected":null,"override":{"slug":"ada","skill1":[{"slot":"skill1","trigger":{"kind":"fullBurstEnter"},"target":{"kind":"burstCasters","stage":3},"effects":[{"kind":"buff","stat":"casterAtkPct","value":60,"durationSec":10},{"kind":"buff","stat":"trueDamagePct","value":50,"durationSec":10}]}],"skill2":[{"slot":"skill2","trigger":{"kind":"interval","sec":2},"fbGate":"inFb","target":{"kind":"enemy"},"effects":[{"kind":"flatDamage","atkPct":420,"flavor":"true"}]}],"burst":[{"slot":"burst","trigger":{"kind":"burstCast"},"target":{"kind":"self"},"effects":[{"kind":"buff","stat":"atkPct","value":40,"durationSec":10},{"kind":"buff","stat":"trueDamagePct","value":42,"durationSec":10},{"kind":"buff","stat":"chargeSpeedPct","value":-300,"durationShots":1},{"kind":"buff","stat":"chargeDamagePct","value":1500,"durationShots":1}]}],"unmodeled":{"skill1":["Recovers 10% of damage as HP for 10 sec."],"skill2":["Activates when using Burst Skill. Affects self. Flash Grenade Toss activation time condition ▼ 1 sec for 10 sec."],"burst":[]},"caveats":["⚑ skill2 Flash-Grenade cadence: kit-literal 2s, but Ada's own burst cuts activation-time by 1s for 10s → effectively 1s during any FB she bursts into (≈doubles procs). Fixed-interval engine can't halve dynamically; baseline uses the conservative 2s. Pin from footage.","⚑ skill1 'Recovers 10% of damage as HP' modeled as offensively-inert lifesteal (no HP pool). If a teammate carries an on-recovery consumer (Crown-style), it may need a heal event — left unmodeled.","⚑ burst 'Charge Damage ▲1500%' read as additive charge-bucket points (chargeDamagePct); if it is a base-scaling multiplier the schema's chargeDamageMultPct would be correct instead."],"note":"PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. RL/Electric/Attacker B3. skill1 = FB-enter team buff to B3 burst-casters (caster-ATK flat +60%, true +50%, +lifesteal). skill2 = in-FB recurring 420% true grenade every 2s (halves to 1s under her own burst — see caveat). burst = self ATK+40%/true+42% for 10s plus a one-round Special Modification: charge speed −300% / charge damage +1500% on the next charged rocket."},"audit":[{"slot":"skill1","kitLine":"Activates entering FB; B3 allies who bursted","status":"IMPLEMENTED","effectOrReason":"trigger fullBurstEnter, target burstCasters stage3 (includes self)"},{"slot":"skill1","kitLine":"ATK ▲60% of skill user's ATK 10s","status":"IMPLEMENTED","effectOrReason":"buff casterAtkPct 60 durationSec 10 (flat add on caster ATK)"},{"slot":"skill1","kitLine":"True Damage ▲50% 10s","status":"IMPLEMENTED","effectOrReason":"buff trueDamagePct 50 durationSec 10 (Damage-Up bucket)"},{"slot":"skill1","kitLine":"Recovers 10% of damage as HP 10s","status":"SKIPPED","effectOrReason":"lifesteal; no HP pool in v1 → offensively inert. Tandem-caveat flagged."},{"slot":"skill2","kitLine":"During FB, enemies nearest crosshair every 2s","status":"IMPLEMENTED","effectOrReason":"trigger interval sec2 + fbGate inFb, target enemy"},{"slot":"skill2","kitLine":"Flash Grenade: 420% final ATK True Damage","status":"IMPLEMENTED","effectOrReason":"flatDamage atkPct 420 flavor true (FB-by-timing ON, no core)"},{"slot":"skill2","kitLine":"On burst cast: grenade activation-time ▼1s 10s","status":"SKIPPED","effectOrReason":"dynamic interval reduction; fixed-interval trigger can't express. ⚑ flagged."},{"slot":"burst","kitLine":"Affects self","status":"IMPLEMENTED","effectOrReason":"trigger burstCast, target self"},{"slot":"burst","kitLine":"ATK ▲40% 10s","status":"IMPLEMENTED","effectOrReason":"buff atkPct 40 durationSec 10"},{"slot":"burst","kitLine":"True Damage ▲42% 10s","status":"IMPLEMENTED","effectOrReason":"buff trueDamagePct 42 durationSec 10"},{"slot":"burst","kitLine":"Special Modification for 1 round(s)","status":"IMPLEMENTED","effectOrReason":"round-count duration → durationShots 1 on the two Effect buffs"},{"slot":"burst","kitLine":"Effect 1: Charge Speed ▼300%","status":"IMPLEMENTED","effectOrReason":"buff chargeSpeedPct -300 durationShots 1 (weapon-state; slows next charge)"},{"slot":"burst","kitLine":"Effect 2: Charge Damage ▲1500%","status":"IMPLEMENTED","effectOrReason":"buff chargeDamagePct 1500 durationShots 1 (charge bucket)"}],"flags":[{"field":"skill2[0].trigger.sec","estimate":"2 (baseline); 1 during Ada's own burst window","reasoning":"Kit literal is 'every 2 sec'; her burst adds 'activation-time ▼1 sec for 10 sec' → 1s cadence for the 10s FB she bursts into. Non-Ada FBs stay 2s. Engine interval is fixed, so a single value can't express both.","recipe":"Count Flash-Grenade popups in a 10s FB where Ada bursts (expect ~10 @1s) vs a FB where another B3 chains it (~5 @2s). If graded as the carry (she always bursts), set sec:1."},{"field":"skill2[0].trigger / fire economy","estimate":"interval-driven, FB-only","reasoning":"Grenade is on an internal timer, not tied to her RL trigger-pulls; her base fire cadence (PULLS_PER_SEC, RL charge) is datamine-derived and unreliable.","recipe":"Confirm grenade procs are wall-clock (timer) not per-shot by watching a low-fire-rate segment; verify RL charge cadence via ammo counter."},{"field":"burst[0].effects[3].stat (chargeDamagePct vs chargeDamageMultPct)","estimate":"chargeDamagePct 1500 (additive points)","reasoning":"'Charge Damage ▲1500%' most commonly = additive charge-bucket points. If it multiplies BASE charge damage (Helm-style 'Charge Damage Multiplier'), chargeDamageMultPct is correct and the magnitude interacts differently.","recipe":"Compare her post-burst charged-rocket popup to base charged rocket; ratio ≈1+15 (additive over a small base) vs ×16 of base charge tells them apart."},{"field":"burst[0].effects[2..3].durationShots","estimate":"1 round","reasoning":"'for 1 round(s)' = round-count, expires after her next fired round (the buffed charge shot), spanning any reload — not wall-clock.","recipe":"Confirm exactly ONE charged rocket carries the +1500% (the shot right after burst), then it drops."},{"field":"skill1 lifesteal","estimate":"unmodeled (inert)","reasoning":"'Recovers 10% of damage as HP' is per-hit lifesteal on the B3 burst-casters; no HP pool → zero board effect, but could fire a teammate's on-recovery trigger.","recipe":"Only model (as a heal event emitting recovery) if a co-comp unit consumes 'when recovery takes effect'."}]}

## 7. Driver's tests (scripts/tests/units/ada.test.ts — 16 tests, ALL GREEN vs shipped override)

Counterfactuals discriminate (each is GREEN-under-shipped AND RED-under-nearest-wrong):

- A1: S1 casterAtkPct scope — targets {ada,helm} (stage-3) NOT {liter,crown}; unfiltered burstCasters widens to {0,1,2,3}.
- A2: S1 trueDamagePct 50 → stage-3 casters {ada,helm}, 10s.
- A3: S2 grenade 420% true dot, re-applied per FB enter (span >150s); removing both S2 blocks zeroes grenades.
- A4: burstCast rider is LIVE — 85 grenades with vs 55 without (≈30 extra, the second interleaved stream).
- A5: burst atkPct 40 → self only, once per burst cast, 10s.
- A6: burst trueDamagePct 42 → self only, once per burst cast (distinct from the S1 50% line).
- A7: Special Modification weaponSwap → normal-bucket shots reach mult.charge 17.50; removing it zeroes every
  17.50 shot and drops Ada's total to ~0.825×. PIN: ≥1 swapped shot per burst window (F3 residual noted: shipped
  over-fires ~2/window vs kit-literal 1; measurement-gated, documented as a ⚑, NOT certified kit-literal).
- A8: true-flavor gating — re-flavoring grenades true→normal drops their damage to ~0.72× (the True Damage ▲
  buffs apply to the grenades BECAUSE they are true-flavored).
- S1 lifesteal: UNMODELED (no HP pool) — documented in header + unmodeled, no assertion.

## 8. S2c reconciliation (driver)

Cross-family convergence is strong. The driver (sighted), S2b (fable, blind), and S6 (opus, blind) ALL converge
on: S1 = fullBurstEnter → stage-3 burstCasters → casterAtkPct 60 + trueDamagePct 50 (10s); S1 lifesteal UNMODELED;
S2 = 420% true grenade, in-FB, interval 2s; burst = self atkPct 40 + trueDamagePct 42 (10s, burstCast).
TWO documented divergences, both surfaced by the blind models (the payload cross-family review exists to catch):
(1) S2 ▼1s rider — fable: GAP (no interval-modifier primitive); opus S6: SKIPPED+unmodeled+⚑; driver: a faithful
SECOND every-2s stream on burstCast (combined 1/s in-window), pinned live (A4: 85 vs 55). Same mechanic, faithful
workaround for the missing primitive — NOT a kit divergence.
(2) Special Modification "for 1 round(s)" — fable: FIX (durationShots:1, kit-literal 1 boosted round); opus S6:
chargeSpeedPct -300 + chargeDamagePct 1500, durationShots:1; driver: weaponSwap durationSec:10 no maxShots
(~2 specials/window). BOTH blind models independently re-derive the kit-literal "1 round" reading and so
independently flag the shipped over-fire = kit-status F3. The driver documents this as a ⚑ caveat
(DOCUMENTED-GAP, MEASUREMENT-GATED): the STRUCTURE (weaponSwap, burstCast self, charge ×17.50, charge time ×4)
is faithful + pinned; the COUNT/duration (1 kit-literal vs 2 shipped) needs popup footage to resolve, and the
board (0.99) leans on the 2nd shot (kit-literal cap → ~0.95). This is a fidelity flag for the owner, not a
silent drop and not a fudge.

## 9. Board reading (non-gating context)

ada: rank 1, 2 recordings, mean 0.993 (OK), range 0.99–1.00, σ=0.007, within ±3% ✓ (±1.7%). Encoding unchanged
by the gauntlet (S3 added documentation only), so before == after.

## 10. Verdict instructions

Grade per §0. Classify every line FAITHFUL / DOCUMENTED_GAP / REAL-GOTCHA / RECON_ERROR. The S5 plumbing
mis-guesses are RECON_ERRORs (grade the spec INTENT). The Special Modification count/duration is a DOCUMENTED ⚑
(MEASUREMENT-GATED) — classify it DOCUMENTED_GAP, not REAL-GOTCHA, unless you judge the documentation inadequate.
Magnitudes are measurement-gated and OUT OF SCOPE (do not flag a magnitude unless it contradicts the prose's own
number). Return ONLY the JSON per the §0 contract:
{slug, kitDescription, convergence, lineFindings, gotchas, discriminationOk, faithfulnessScore, verdict, verdictRationale, model}
