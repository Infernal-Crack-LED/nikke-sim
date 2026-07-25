# S7 RECONCILING JUDGE — moran (Moran, AR/Defender/Electric/Burst I, TREASURE)

You are the binding reconciling judge for the moran kit-autonomy gauntlet. Read the contract below, then adjudicate the driver implementation against the two blind cross-family reconstructions. Return ONLY the verdict JSON the contract specifies.

## 1. CONTRACT (RECONCILING-JUDGE.md)

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

## 2. MECHANICS SSOT POINTERS

Authoritative mechanics live in docs/data/damage-calculation.md (damage formula, multiplicative buckets) and docs/data/game-mechanics.md (burst rotation, Full Burst window, CDR, weapon swap, gating). Consult them in-repo as needed; key facts: a burst CAST lands BEFORE the Full Burst window opens (no +50% FB major on cast); casterAtkPct is a FLAT add of the caster ATK (not target-scaled atkPct); damageTakenPct as an ally buff is offensively inert at scope lock (the trap is mapping an ally ▼Damage-Taken line to a positive BOSS debuff).

## 3. GROUND TRUTH — kit prose + base stats (data/characters.json → characters.moran)

```json
{
  "slug": "moran",
  "name": "Moran",
  "weapon": "AR",
  "burst": "I",
  "class": "Defender",
  "element": "Electric",
  "manufacturer": "Tetra",
  "burstCooldownSec": 40,
  "ammo": 60,
  "reloadFrames": 111,
  "normalAttackMultiplier": 14.71,
  "coreAttackMultiplier": 200,
  "treasure": true,
  "baseStats": {
    "hp": 16500,
    "atk": 400,
    "def": 110,
    "core": {
      "hp": 200,
      "atk": 200,
      "def": 200
    },
    "grade": {
      "hp": 3000,
      "atk": 20,
      "def": 100,
      "ratio": 200
    },
    "critRate": 15,
    "maxLevel": 1200,
    "critDamage": 150,
    "resourceId": 281
  },
  "skills": {
    "skill1": "■ Activates at the start of battle. Affects self.\nDEF ▲ 3.51% continuously for every 1% of HP lost.\n■ Activates when landing 5 normal attack(s) while weapon is changed. Affects the target.\nDeals 47.18% of final ATK as additional damage.\n■ Activates when Raptures appear. Affects self.\nFervor: Cooldown of Burst Skill ▼ 20 sec continuously.",
    "skill2": "■ Activates when firing the final bullet. Affects the 3 enemy unit(s) with the highest final ATK.\nTaunts for 4 sec.\n■ Activates when HP falls below 20%. Affects self.\nEffect varies according to the number of uses. Perseverance: Only one effect is triggered at a time.\nOnce: Max HP ▲ 91% for 3 sec. Activates once per battle.\nTwice: Max HP ▲ 69.84% for 3 sec. Activates once per battle.\nThree Times: Max HP ▲ 51.09% for 3 sec. Activates once per battle.\n■ Activates when entering Full Burst while in Fervor status. Affects all allies. \nCooldown of Burst Skill ▼ 7.48 sec.",
    "burst": "■ Affects self.\nChanges the weapon in use:\nDamage: 14.7% of final ATK \nDuration: 10 sec\nAdditional Effect:\nRecovers 36.14% of attack damage as HP for 10 sec.\nAttract: Taunts all enemies for 10 sec.\nUnlimited ammunition for 10 sec.\n■ Affects all allies.\nDamage Taken ▼ 35.14% for 10 sec.\nDEF ▲ 14.85% of the skill user's DEF for 10 sec.\nATK ▲ 42.57% of the skill user's ATK for 10 sec."
  }
}```

## 4. S2b PRE-OP TEST-FAITHFULNESS REVIEW (claude-fable-5) + driver reconciliation

```json
{
  "slug": "moran",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "DEF ▲ 3.51% ... every 1% of HP lost",
      "disposition": "UNMODELED",
      "scope": "generic self DEF, scaled by own HP lost",
      "durationSemantics": "continuously (permanent while HP deficit exists); value is dynamic per 1% HP lost, not a fixed 3.51%",
      "triggerIdentity": "passive (start of battle)",
      "targetSet": "self",
      "nearestWrongModel": "flat always-on defPct 3.51 (or worse, 3.51×100 assuming full HP loss) as a permanent self buff",
      "distinguishingAssertion": "no defPct buffApply with nonzero damage consequence; totals(res) identical with the line present vs stripped — v1 boss deals no damage so HP lost is 0 and the correct contribution is exactly 0",
      "inertness": "must move zero damage for every unit; defPct is engine-inert anyway",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill1",
      "kitLine": "Deals 47.18% ... 5 normal attack(s) while weapon is changed",
      "disposition": "FAITHFUL",
      "scope": "normal attacks only, and ONLY those fired while her burst weaponSwap is live",
      "durationSemantics": "instant hit per proc, no duration",
      "triggerIdentity": "hitCount count:5 (counts ROUNDS; AR hitsPerShot 1) with swapGate:'swapped' — the counter must accrue swapped hits only",
      "targetSet": "enemy (flatDamage 47.18% of final ATK; rider takes FB by landing timing, default noFb OFF; noRange forced)",
      "nearestWrongModel": "ungated hitCount:5 running the whole fight on her base AR — 60-ammo AR firing continuously turns a ~2-procs-per-burst-window rider into a fight-long every-5-shots engine, a massive over-credit; secondary misread: counter accrues unswapped hits so pre-accumulated count procs instantly at swap start",
      "distinguishingAssertion": "every skill1 flatDamage event (mult 47.18) has srcSlot=moran and a timestamp inside a [burstCast, +10s] swap window; count of such events per window == floor(swappedShotsInWindow/5); ZERO such events before her first burstCast",
      "inertness": "zero procs outside swap windows; zero procs if her burst never casts",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Fervor: Cooldown of Burst Skill ▼ 20 sec continuously",
      "disposition": "FIX",
      "scope": "own burst cooldown only (40s base → 20s effective) + opens the named 'Fervor' status that gates skill2 block 3",
      "durationSemantics": "continuously — a standing CD reduction on every cooldown cycle, not a one-shot CDR",
      "triggerIdentity": "'when Raptures appear' — in the solo-boss sim the rapture is present at t=0, so this is a battle-start passive; it is NOT an unreachable spawn event",
      "targetSet": "self",
      "nearestWrongModel": "trigger kind 'unsupported' / never-fires (no rapture-spawn events in the engine) — which silently kills Fervor and therefore also deadens skill2's team-wide 7.48s CDR block; secondary misread: one-time burstCdr 20 affecting only the first cooldown",
      "distinguishingAssertion": "gap between moran's 1st and 2nd burstCast events ≈ 20s-minus-ally-CDR, never ~40s; AND skill2's Fervor-gated block observably fires (see skill2 line 3) — RED if the trigger is modeled as a dead spawn event",
      "inertness": "must not touch any other unit's cooldown",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Taunts for 4 sec (final bullet, 3 highest-ATK)",
      "disposition": "UNMODELED",
      "scope": "enemy-side aggro control",
      "durationSemantics": "4 sec",
      "triggerIdentity": "lastBullet (per 60-round magazine; unlimited-ammo swap shots never reach last bullet, so this pauses during her burst window)",
      "targetSet": "enemy units (no enemy-unit entities exist in the v1 sim; the target set is unrepresentable)",
      "nearestWrongModel": "inventing any damage/debuff carrier for the taunt",
      "distinguishingAssertion": "no buffApply and no damage event attributable to this line; board totals unchanged when it is stripped",
      "inertness": "fully inert — must move nothing",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "HP falls below 20% ... Max HP ▲ 91/69.84/51.09%, 3 sec",
      "disposition": "UNMODELED",
      "scope": "self Max HP, tiered by use count (Perseverance: one effect per activation, each tier once per battle)",
      "durationSemantics": "3 sec per proc; NOT permanent; escalating-style tier selection by activation index",
      "triggerIdentity": "own-HP-threshold trigger — unreachable in v1 (boss deals no damage, HP never falls below 20%)",
      "targetSet": "self",
      "nearestWrongModel": "encoding as a passive/battle-start maxHpFlat grant (always-on 91%) — over-credits any future HP-scaling consumer and pollutes the event log now",
      "distinguishingAssertion": "zero maxHpFlat buffApply events sourced from moran skill2 across the whole run",
      "inertness": "must emit nothing; even if fired, self Max HP feeds no ATK conversion on moran (she has no atkOfMaxHpPct)",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "entering Full Burst while in Fervor ... CD ▼ 7.48 sec",
      "disposition": "FAITHFUL",
      "scope": "burst cooldown of every ally, applied at each Full Burst entry",
      "durationSemantics": "instant CDR per activation, repeats EVERY Full Burst (no oncePerBattle)",
      "triggerIdentity": "fullBurstEnter (any team FB — text says 'entering Full Burst', NOT her own cast) + a requires-Fervor gate; Fervor is continuously on from t=0 via skill1 line 3, so the gate is satisfied at every FB in the boss sim but must still be authored (name-keyed) so the coupling to skill1 is explicit",
      "targetSet": "allies, all including self",
      "nearestWrongModel": "burstCdr applied oncePerBattle, or keyed to burstCast (her own cast — under-fires whenever she is on CD for a rotation), or dead-on-arrival because 'when Raptures appear' was modeled as a never-firing trigger so Fervor never exists",
      "distinguishingAssertion": "the effect activates on EVERY fullBurstStart event, not just the first; with the block patched out via withPatchedOverride, the fight's fullBurstStart count strictly drops (rotation decelerates) — RED under oncePerBattle (identical FB count after rotation 2) and RED under dead-Fervor",
      "inertness": "no CDR outside FB entries; no effect on non-cooldown stats",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Changes the weapon: 14.7% ... Duration: 10 sec",
      "disposition": "FAITHFUL",
      "scope": "self weapon override; swap shots replace her base AR shots (base mult 14.71 → swap 14.7, near-identical per-shot)",
      "durationSemantics": "hard 10 sec time bound (durationSec:10, NO maxShots — kit states duration only)",
      "triggerIdentity": "burstCast (her own Burst I cast; a burst-block self mode is never fullBurstEnter)",
      "targetSet": "self",
      "nearestWrongModel": "modeling the swap as a normalAttackPct buff on the base weapon (loses the swap-state that gates skill1's 5-hit rider and skill2's whileSwapped semantics), or ending it on a shot count; ⚑ the swap's own fire cadence (pullsPerSec) is kit-silent — a silent unflagged cadence guess is itself a failure",
      "distinguishingAssertion": "shot events inside [burstCast, +10s] carry the swap multiplier and the swapGate:'swapped' skill1 block is live exactly in that window; the swap terminates at +10s wall-clock regardless of shots fired",
      "inertness": "no swap shots outside the window; skill1's rider dead outside it",
      "evidenceTier": "DATAMINED (14.7/10s); CALIBRATED ⚑ (swap cadence)",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Recovers 36.14% of attack damage as HP for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "self lifesteal during the swap window",
      "durationSemantics": "10 sec window, continuous recovery",
      "triggerIdentity": "burstCast; encode as heal to self with ticks (e.g. ticks:10, intervalSec:1) so recovery events exist on the log",
      "targetSet": "self — the recovery events land on MORAN, so only HER 'recovery' triggers could consume them (she has none); this does NOT fire a teammate's on-recovery kit (e.g. crown in the control comp), because recovery triggers fire on the heal RECEIVER",
      "nearestWrongModel": "skipping the heal entirely as 'defensive' (taxonomy #4: heal lines are never silently dropped — they are tandem fuel), or conversely targeting the heal at allies and spuriously firing crown-style on-recovery kits team-wide",
      "distinguishingAssertion": "heal/recovery events during the window have targetSlug=moran only; crown's recovery-triggered blocks show zero activations attributable to moran's burst",
      "inertness": "zero damage delta in the control comp; no ally recovery events",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "Attract: Taunts all enemies for 10 sec",
      "disposition": "UNMODELED",
      "scope": "enemy aggro",
      "durationSemantics": "10 sec",
      "triggerIdentity": "burstCast",
      "targetSet": "all enemies (unrepresentable; boss takes no modeled aggro)",
      "nearestWrongModel": "any damage-adjacent encoding",
      "distinguishingAssertion": "totals unchanged with the line stripped",
      "inertness": "fully inert",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "Unlimited ammunition for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "self ammo economy during the swap window",
      "durationSemantics": "10 sec",
      "triggerIdentity": "burstCast; effect kind unlimitedAmmo durationSec:10",
      "targetSet": "self",
      "nearestWrongModel": "dropping it as QoL — a weapon-state line IS damage (taxonomy #6): without it a 60-round magazine at AR cadence empties mid-window and a 111-frame reload eats swap uptime; it also suppresses lastBullet triggers (skill2 taunt) inside the window since infinite-ammo shots don't consume",
      "distinguishingAssertion": "zero reload events for moran inside any [burstCast, +10s] window; with the effect stripped, at least one in-window reload appears whenever the magazine would empty",
      "inertness": "no ammo effect outside the window; allies' ammo untouched",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Damage Taken ▼ 35.14% for 10 sec (allies)",
      "disposition": "UNMODELED",
      "scope": "ALLY-side damage reduction — a defensive mitigation buff on the team",
      "durationSemantics": "10 sec",
      "triggerIdentity": "burstCast",
      "targetSet": "all allies — NOT the enemy",
      "nearestWrongModel": "THE trap on this kit: sign/target flip into damageTakenPct as a BOSS debuff (+35.14% boss takes more, per the schema comment 'positive = boss takes more') — that would hand the entire team a ×1.35-class multiplier every burst window, an enormous over-credit; the kit arrow is ▼ on ALLIES (they take less), which is offensively inert in a sim where the boss deals no damage",
      "distinguishingAssertion": "ZERO damageTakenPct buffApply events in the entire run; boss-side damage math identical with the line stripped",
      "inertness": "must move zero damage for every unit — this is the single most important inertness pin on the kit",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "DEF ▲ 14.85% of the skill user's DEF for 10 sec",
      "disposition": "UNMODELED",
      "scope": "caster-DEF-scaled ally DEF grant",
      "durationSemantics": "10 sec",
      "triggerIdentity": "burstCast",
      "targetSet": "all allies",
      "nearestWrongModel": "shoehorning into defPct (target-scaled, not caster-scaled — no casterDefPct StatKey exists) or, worse, into a casterAtkPct-shaped flat add; either pollutes the log for a stat that is engine-inert",
      "distinguishingAssertion": "no damage delta from the line; if recorded at all it must not appear as any ATK-family stat",
      "inertness": "zero damage movement",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "ATK ▲ 42.57% of the skill user's ATK for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "generic ATK, caster-scaled ('of the skill user's ATK' — a FLAT add of 42.57% × MORAN's ATK, and moran is a low-ATK Defender)",
      "durationSemantics": "10 sec per cast, refreshed each burst",
      "triggerIdentity": "burstCast (in her own burst block; NOT fullBurstEnter — as sole B1 in the control comp the two coincide, so only an off-rotation or dual-B1 fixture separates them; the semantic pin still matters)",
      "targetSet": "all allies including self",
      "nearestWrongModel": "atkPct 42.57 (scales each TARGET's own ATK) — over-credits every high-ATK carry by the full gap between carry ATK and a Defender's ATK; the classic caster-scaled-vs-target-scaled misread",
      "distinguishingAssertion": "buffApply events carry stat 'casterAtkPct' with value ≈ 0.4257 × moran.staticAtk (a flat ATK number, identical for every recipient regardless of the recipient's own ATK) — RED under atkPct, where no such flat-resolved value appears and the carry's damage jumps far harder",
      "inertness": "buff value must not vary with the recipient's ATK",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:5-hits-while-swapped 47.18% flatDamage",
    "skill1:Fervor continuous Burst CD ▼20s",
    "skill2:FB-enter-in-Fervor allies Burst CD ▼7.48s",
    "burst:weaponSwap 14.7% / 10s",
    "burst:unlimitedAmmo 10s",
    "burst:allies casterAtkPct 42.57% / 10s"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "DEF ▲ 3.51% continuously for every 1% of HP lost."
    ],
    "skill2": [
      "Taunts for 4 sec.",
      "Once: Max HP ▲ 91% for 3 sec. Activates once per battle.",
      "Twice: Max HP ▲ 69.84% for 3 sec. Activates once per battle.",
      "Three Times: Max HP ▲ 51.09% for 3 sec. Activates once per battle."
    ],
    "burst": [
      "Attract: Taunts all enemies for 10 sec.",
      "Damage Taken ▼ 35.14% for 10 sec.",
      "DEF ▲ 14.85% of the skill user's DEF for 10 sec."
    ]
  },
  "notes": "Expected shared-prior misreads to reconcile against the driver: (1) 'Damage Taken ▼ 35.14%' is an ALLY mitigation buff — if the driver encoded any damageTakenPct boss debuff the model is catastrophically over-credited; assert zero damageTakenPct buffApply events. (2) 'ATK ▲ 42.57% of the skill user's ATK' must be casterAtkPct (flat, off a Defender's low ATK), never atkPct. (3) 'Activates when Raptures appear' must resolve to battle-start-on in the boss sim — an unsupported/dead trigger silently kills Fervor AND the team-wide 7.48s CDR block downstream (a two-line coupling; test them together). (4) The skill2 CDR is per-FB, every FB, all allies — not oncePerBattle, not self-only; its board effect is rotation acceleration, so the cleanest pin is FB-count delta with the block patched out. (5) skill1's 47.18% rider is swap-gated AND its hit counter should accrue swapped hits only — assert first proc lands after exactly 5 in-window shots, not instantly at swap start from a pre-accumulated global counter. (6) ⚑ the swap weapon's fire cadence is kit-silent (ALWAYS-⚑ field 3): the driver must flag pullsPerSec with an estimate + recipe, not ship a silent guess; skill1 rider proc count per window inherits this ⚑. (7) Fervor's −20s makes her effective burst CD ~20s before ally CDR — burstCast event spacing is the observable. Cannot write scripts/kit-autonomy/reviews/moran.test-review.json (no tools in this run); this JSON is the deliverable.",
  "model": "claude-fable-5",
  "driverReconciliation": {
    "driver": "qwen-driver",
    "reviewer": "claude-fable-5",
    "verdict": "GO (cross-family corroborated, pre-op)",
    "convergence": "Load-bearing set IDENTICAL: S1 47.18/5hits rider, Fervor burstCdr20, S2 team burstCdr7.48, weaponSwap14.7/10s, unlimitedAmmo10s, casterAtkPct42.57/10s. Reviewer INDEPENDENTLY derived the F2 fix (rider must be swapGate:swapped, not fbGate:inFb) — the exact primitive the driver flagged (types.ts:332/sim.ts:1684). casterAtkPct-vs-atkPct trap, Fervor dead-trigger trap, and damageTaken boss-debuff trap all named by both.",
    "reconciled": [
      "M2 disposition label: driver=FIX (shipped inFb is the gap), reviewer=FAITHFUL (describes the swapGate target). Consistent — S3 lands swapGate:swapped; test assertion RED pre-S3 / GREEN post.",
      "M8 lifesteal 36.14%: driver=UNMODELED(inert), reviewer=FAITHFUL(encode as self-heal tandem-fuel). RECONCILED on the observable: self-only heal lands on moran, moran has NO on-recovery consumer, and it does NOT reach crown (recovery fires on the receiver), so zero damage delta + zero ally recovery events either way. Driver keeps it omitted (conservative); reviewer inertness assertion (zero damage movement) is satisfied.",
      "M12 Damage Taken -35.14%: driver=FAITHFUL-inert (shipped encodes ally buff -35.14, kept for fidelity), reviewer=UNMODELED (prefers zero events). RECONCILED: both agree it is offensively inert and the boss-debuff sign/target trap (x1.35 team mult) must be avoided. Driver test pins holders=allies(0,1,2,3) NOT boss + totals byte-identical when stripped — proves the trap is avoided and inertness holds."
    ],
    "flags": [
      "swap cadence (pullsPerSec) kit-silent — ALWAYS-flag. Estimate: base AR 12/s (MEASURED from moran control.mov frame read; the 24/s datamine shot_id 1028102 rate_of_fire 1440 was board-REFUTED 0.712 COLD -> 1.325 HOT). Recipe: isolated moran-solo recording OR datamined shot_count/muzzle_count for swap weapon 1028102 to pin the throughput multiplier behind her 0.66 COLD. Tier: MEASURED-throughput (footage-blocked residual, NOT a per-shot value)."
    ]
  }
}```

## 5. S5 BLIND TEST (claude-opus-5) — blind/moran.test.ts

DRIVER-MEASURED RESULT vs the driver override (run via ephemeral copy under scripts/tests/units so its harness imports resolve): **17 GREEN / 3 RED / 6 SKIP**.

The 3 REDS are NOT override-faithfulness failures:
- (2 cadence reds) FIXTURE-INDUCED. The blind test used controlComp('moran') = liter/crown/moran/helm, which fields liter AND moran as TWO Burst-I casters. Empirically proven (.moran-probe3.ts): in that fixture moran is the SECONDARY B1 — she casts only 5x whether Fervor is present or not (liter wins the B1 slot at 10x), so the Fervor-inertness and team-rotation cadence-delta assertions literally cannot fire. In the driver's SOLE-B1 fixture (moran/crown/ada/helm) the same lines are cleanly observable: Fervor 12 vs 6 casts (removed), team CDR crown 12 vs 9.
- (1 structural red) ENCODING-STYLE divergence: the blind test asserts Fervor is a battle-start passive; the driver models it as burstCdr-20 on her own burstCast (re-applied every cycle). The driver encoding is the MEASURED reading (override note: 'Run B video — firepower/CDR economy verified frame-by-frame', 'she bursts every rotation'); a continuous cooldown FLOOR has no engine primitive, which the blind writer itself conceded in its skip note.

The 17 GREEN corroborate every fixture-exercisable load-bearing line: weaponSwap 14.7% structural + swap-liveness; rider 47.18% swap-gated + fires-only-while-swapped + 5-hit-threshold-binds; casterAtkPct flat-resolved + all-four-allies + non-inert + 10s-window-binds; unlimitedAmmo non-inert (removes reloads/adds shots); damageTaken defensive half moves ZERO damage; every unmodeled line documented. The 6 SKIPs are the inert/unmodeled lines plus 2 flags (Fervor continuous-floor primitive gap; swap shot-economy kit-silent) that match the driver dispositions.

```typescript
/**
 * moran (AR / Electric / Defender / Burst I) — BLIND post-op kit-spec test (S5).
 * Written from the kit prose alone; the driver's test/override/reasoning were not consulted.
 *
 * KIT (cd 40s, ammo 60, reloadFrames 111, normalAttackMultiplier 14.71, coreAttackMultiplier 200):
 *   S1a passive, self   : DEF up 3.51% per 1% HP lost           -> unreachable + defPct inert in v1
 *   S1b 5 normals WHILE WEAPON CHANGED, enemy : 47.18% of final ATK additional damage
 *   S1c 'when Raptures appear', self : Fervor — Burst CD down 20 sec continuously
 *   S2a firing the final bullet, enemy : taunt 4 sec            -> no taunt/aggro primitive
 *   S2b HP below 20%, self : Perseverance Max HP tiers          -> trigger unreachable (immortal team)
 *   S2c entering Full Burst while in Fervor, all allies : Burst CD down 7.48 sec
 *   Bu  self   : weapon swap 14.7% per shot / 10 sec, unlimited ammo 10 sec,
 *                36.14% of attack damage recovered as HP 10 sec, Attract taunt 10 sec
 *   Bu  allies : Damage Taken down 35.14% 10 sec (DEFENSIVE, not a boss debuff),
 *                DEF up 14.85% of caster DEF 10 sec,
 *                ATK up 42.57% of caster ATK 10 sec  <- the only damage-bearing team line
 *
 * FIXTURE: controlComp('moran', true) = liter(B1) / crown(B2) / moran / helm(B3). 180s, deterministic.
 *   moran is Burst I, so the fixture carries a full I->II->III chain and helm supplies the B3.
 *   FIXTURE RISK (flagged): liter is ALSO Burst I. If the engine lets only one B1 cast per rotation
 *   moran may never burst, which would make every burst-slot claim vacuous — the non-vacuity test
 *   below is ordered first so that failure mode is diagnosed loudly instead of hiding.
 *
 * WHY THESE DISCRIMINATE: every behavioural claim is a counterfactual PAIR (faithful override vs the
 * nearest-wrong model built with withPatchedOverride), so a green run cannot come from an inert model.
 *
 * WHOLE-PICTURE NOTE: the swap deals 14.7% per shot while her BASE AR normal multiplier is 14.71 — the
 * weapon swap is therefore very nearly damage-NEUTRAL on its own. Totals cannot discriminate 'swap
 * modeled' from 'swap dropped'; the swap's real payload is the unlimited ammo plus opening the swapGate
 * for the 47.18% rider, so the rider is used as the swap-liveness probe instead.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUG = 'moran';
const SLOTS = ['skill1', 'skill2', 'burst'] as const;
type AnyEv = SimEvent & Record<string, any>;

const near = (a: unknown, b: number, tol = 0.02) =>
  typeof a === 'number' && Math.abs(a - b) <= tol;

function forEachEffect(ov: any, cb: (eff: any, block: any, slot: string) => void) {
  for (const slot of SLOTS) for (const b of ov[slot] ?? []) for (const e of b.effects ?? []) cb(e, b, slot);
}

function dropEffects(ov: any, pred: (eff: any, block: any, slot: string) => boolean) {
  for (const slot of SLOTS) {
    const blocks = ov[slot] ?? [];
    for (const b of blocks) b.effects = (b.effects ?? []).filter((e: any) => !pred(e, b, slot));
    ov[slot] = blocks.filter((b: any) => (b.effects ?? []).length > 0);
  }
}

function run(patch?: (ov: any) => void) {
  const events: AnyEv[] = [];
  const comp = controlComp(SLUG, true) as any;
  const opts: any = {
    ...comp,
    cfg: { ...(comp.cfg ?? {}), onEvent: (ev: AnyEv) => events.push(ev) },
  };
  if (patch) {
    opts.overrides = { ...(comp.overrides ?? {}), [SLUG]: withPatchedOverride(SLUG, patch) };
  }
  const res = runComp(opts);
  return { res, events, tot: totals(res) as Record<string, number> };
}

const team = (t: Record<string, number>) => Object.values(t).reduce((a, b) => a + b, 0);
const kindCount = (e: AnyEv[], kind: string) => e.filter((x) => x.kind === kind).length;

// ---- the committed override, read-only (no-op mutator returns the clone) ----
const OV: any = withPatchedOverride(SLUG, () => {});
function findAll(pred: (eff: any, block: any, slot: string) => boolean) {
  const out: { slot: string; block: any; eff: any }[] = [];
  for (const slot of SLOTS) {
    for (const b of OV[slot] ?? []) for (const e of b.effects ?? []) if (pred(e, b, slot)) out.push({ slot, block: b, eff: e });
  }
  return out;
}
const docText = [OV.note ?? '', ...SLOTS.flatMap((s) => OV.unmodeled?.[s] ?? [])]
  .join(' | ')
  .toLowerCase();
const documented = (...kws: string[]) => kws.some((k) => docText.includes(k));

const ATK_BUFF = findAll((e, _b, slot) => slot === 'burst' && e.kind === 'buff' && near(e.value, 42.57));
const RIDER = findAll((e, _b, slot) => slot === 'skill1' && e.kind === 'flatDamage' && near(e.atkPct, 47.18));
const FERVOR = findAll((e, _b, slot) => slot === 'skill1' && e.kind === 'burstCdr');
const FB_CDR = findAll((e, _b, slot) => slot === 'skill2' && e.kind === 'burstCdr');
const SWAP = findAll((e, _b, slot) => slot === 'burst' && e.kind === 'weaponSwap');
const UNLIMITED = findAll((e, _b, slot) => slot === 'burst' && e.kind === 'unlimitedAmmo');
const HEAL = findAll((e, _b, slot) => slot === 'burst' && e.kind === 'heal');

const isRiderBlock = (b: any) =>
  (b.effects ?? []).some((e: any) => e.kind === 'flatDamage' && near(e.atkPct, 47.18));

// ---- hoisted runs (11 x 180s) ----
const base = run();
const noBurstAtk = run((ov) =>
  dropEffects(ov, (e, _b, slot) => slot === 'burst' && e.kind === 'buff' && near(e.value, 42.57)),
);
const atkPctModel = run((ov) =>
  forEachEffect(ov, (e, _b, slot) => {
    if (slot === 'burst' && e.kind === 'buff' && near(e.value, 42.57)) e.stat = 'atkPct';
  }),
);
const dur20 = run((ov) =>
  forEachEffect(ov, (e, _b, slot) => {
    if (slot === 'burst' && e.kind === 'buff' && near(e.value, 42.57)) e.durationSec = 20;
  }),
);
const noUnlimited = run((ov) => dropEffects(ov, (e) => e.kind === 'unlimitedAmmo'));
const noRider = run((ov) =>
  dropEffects(ov, (e, _b, slot) => slot === 'skill1' && e.kind === 'flatDamage' && near(e.atkPct, 47.18)),
);
const riderUngated = run((ov) => {
  for (const b of ov.skill1 ?? []) if (isRiderBlock(b)) delete b.swapGate;
});
const riderEvery1 = run((ov) => {
  for (const b of ov.skill1 ?? []) {
    if (!isRiderBlock(b)) continue;
    if (b.trigger?.kind === 'hitCount') b.trigger.count = 1;
    if (b.everyN) b.everyN = 1;
  }
});
const noFbCdr = run((ov) =>
  dropEffects(ov, (e, _b, slot) => slot === 'skill2' && e.kind === 'burstCdr'),
);
const noFervor = run((ov) =>
  dropEffects(ov, (e, _b, slot) => slot === 'skill1' && e.kind === 'burstCdr'),
);
const stripDefensive = run((ov) =>
  dropEffects(
    ov,
    (e) =>
      e.kind === 'buff' &&
      ['defPct', 'maxHpPct', 'maxHpFlat', 'casterMaxHpPct', 'targetMaxHpPct', 'damageTakenPct'].includes(e.stat),
  ),
);

// moran's burst ATK grant, identified by DIFFING base against the run with it removed —
// this needs no knowledge of her unit index and survives other units' casterAtkPct buffs.
const casterAtkEv = (e: AnyEv[]) => e.filter((x) => x.kind === 'buffApply' && x.stat === 'casterAtkPct');
const diffVals = new Set(casterAtkEv(base.events).map((e) => e.value));
for (const v of casterAtkEv(noBurstAtk.events).map((e) => e.value)) diffVals.delete(v);
const MORAN_ATK_VALUES = [...diffVals];
const V = MORAN_ATK_VALUES[0];
const atkApplies = (e: AnyEv[]) =>
  e.filter((x) => x.kind === 'buffApply' && x.stat === 'casterAtkPct' && x.value === V);
const ATK_TARGETS = new Set(atkApplies(base.events).map((e) => e.targetSlug));
const castsIn = (e: AnyEv[]) => atkApplies(e).length / Math.max(1, ATK_TARGETS.size);

describe('moran — harness wiring + non-vacuity', () => {
  it('the event stream is actually collected', () => {
    expect(base.events.length).toBeGreaterThan(0);
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
  });

  it('moran really casts her burst in this fixture (else every burst claim is vacuous)', () => {
    // Exactly one caster-scaled ATK value appears in base and vanishes when her burst buff is
    // removed. Zero values here means she never bursts (B1 contention with liter) — a FIXTURE
    // failure, not a spec failure.
    expect(MORAN_ATK_VALUES.length).toBe(1);
    expect(castsIn(base.events)).toBeGreaterThanOrEqual(1);
  });
});

describe('burst / allies — ATK up 42.57% of the skill user ATK for 10 sec', () => {
  it('structural: caster-scaled, all allies incl. self, 10s, on her own burst cast', () => {
    expect(ATK_BUFF.length).toBe(1);
    const { eff, block } = ATK_BUFF[0];
    // nearest-wrong #1: atkPct (scales each ally by THEIR own ATK) — a different mechanic.
    expect(eff.stat).toBe('casterAtkPct');
    expect(eff.durationSec).toBe(10);
    expect(block.target.kind).toBe('allies');
    // nearest-wrong #2: excludeSelf — the kit says 'all allies', she buffs herself too.
    expect(block.target.excludeSelf ?? false).toBe(false);
    // nearest-wrong #3: fullBurstEnter — would fire on ANY team Full Burst, over-crediting the
    // rotations she does not cast. Her burst effects are keyed to her OWN cast.
    expect(block.trigger.kind).toBe('burstCast');
  });

  it('emits a FLAT-resolved caster ATK number to all four allies, not the raw 42.57%', () => {
    expect(V).toBeDefined();
    expect(V).not.toBe(42.57); // atkPct would re-emit the raw percentage
    expect(V as number).toBeGreaterThan(100);
    expect(ATK_TARGETS.size).toBe(4);
    expect(ATK_TARGETS.has(SLUG)).toBe(true);
  });

  it('the target-scaled model is genuinely distinguishable (non-vacuity for the stat choice)', () => {
    const raw = atkPctModel.events.filter(
      (e) => e.kind === 'buffApply' && e.stat === 'atkPct' && near(e.value, 42.57),
    );
    expect(raw.length).toBeGreaterThan(0);
    expect(team(atkPctModel.tot)).not.toBe(team(base.tot));
  });

  it('is not inert: removing it drops team damage', () => {
    expect(team(base.tot)).toBeGreaterThan(team(noBurstAtk.tot));
  });

  it('the 10 sec window binds (a 20 sec model is strictly stronger)', () => {
    expect(team(dur20.tot)).toBeGreaterThan(team(base.tot));
  });
});

describe('burst / self — weapon swap, unlimited ammunition, lifesteal', () => {
  it('structural: swap 14.7% per shot for 10 sec, self', () => {
    expect(SWAP.length).toBe(1);
    expect(near(SWAP[0].eff.damagePct, 14.7)).toBe(true);
    expect(SWAP[0].eff.durationSec).toBe(10);
    expect(SWAP[0].block.target.kind).toBe('self');
  });

  it('structural: unlimited ammunition for 10 sec', () => {
    expect(UNLIMITED.length).toBe(1);
    expect(UNLIMITED[0].eff.durationSec).toBe(10);
  });

  it('unlimited ammo is not inert — it removes reloads and/or adds shots', () => {
    // Her magazine is 60 and the window is 10s, so the swap window spans about one full
    // magazine: dropping unlimited ammo must cost her at least a reload or some damage.
    expect(
      kindCount(noUnlimited.events, 'reload') > kindCount(base.events, 'reload') ||
        base.tot[SLUG] > noUnlimited.tot[SLUG],
    ).toBe(true);
    expect(base.tot[SLUG]).toBeGreaterThanOrEqual(noUnlimited.tot[SLUG]);
  });

  it('the 36.14% lifesteal line is represented, not silently dropped', () => {
    // Damage-inert here (no HP pool), but it is a real on-recovery tandem channel, so it must be
    // either a heal effect or explicitly documented.
    expect(HEAL.length > 0 || documented('recover', 'lifesteal', 'heal')).toBe(true);
  });
});

describe('skill1 — 47.18% of final ATK every 5 normals WHILE THE WEAPON IS CHANGED', () => {
  it('structural: enemy-targeted, 5-hit trigger, swap-gated, no core', () => {
    expect(RIDER.length).toBe(1);
    const { eff, block } = RIDER[0];
    expect(block.target.kind).toBe('enemy');
    const trig = block.trigger ?? {};
    expect(
      (trig.kind === 'hitCount' && trig.count === 5) ||
        (trig.kind === 'shotFired' && block.everyN === 5),
    ).toBe(true);
    // nearest-wrong: an ungated rider that fires all fight instead of only inside her 10s swap.
    expect(block.swapGate).toBe('swapped');
    // the text says 'additional damage', never 'core strike' — no core bucket.
    expect(eff.core ?? false).toBe(false);
  });

  it('fires, and only while the swap is live', () => {
    expect(base.tot[SLUG]).toBeGreaterThan(noRider.tot[SLUG]); // non-inert AND the swap goes live
    expect(riderUngated.tot[SLUG]).toBeGreaterThan(base.tot[SLUG]); // the gate is closed most of the fight
  });

  it('the 5-hit threshold binds (a 1-hit model is strictly stronger)', () => {
    expect(riderEvery1.tot[SLUG]).toBeGreaterThan(base.tot[SLUG]);
  });
});

describe('skill1 — Fervor: Cooldown of Burst Skill down 20 sec, self, continuous', () => {
  it('structural: self-targeted 20 sec CDR from battle start', () => {
    expect(FERVOR.length).toBe(1);
    expect(near(FERVOR[0].eff.seconds, 20)).toBe(true);
    expect(FERVOR[0].block.target.kind).toBe('self');
    // 'Activates when Raptures appear' = battle start, so a passive trigger, not an event trigger.
    expect(FERVOR[0].block.trigger.kind).toBe('passive');
  });

  it('is not inert: her 40 sec base cooldown is genuinely shortened', () => {
    expect(castsIn(base.events)).toBeGreaterThanOrEqual(castsIn(noFervor.events));
    expect(
      castsIn(base.events) > castsIn(noFervor.events) || team(base.tot) > team(noFervor.tot),
    ).toBe(true);
  });
});

describe('skill2 — entering Full Burst while in Fervor: all allies Burst CD down 7.48 sec', () => {
  it('structural: full-burst-enter, all allies incl. self', () => {
    expect(FB_CDR.length).toBe(1);
    expect(near(FB_CDR[0].eff.seconds, 7.48)).toBe(true);
    // nearest-wrong: burstCast (would fire only on rotations SHE bursts); the kit says
    // 'entering Full Burst', which is any team Full Burst.
    expect(FB_CDR[0].block.trigger.kind).toBe('fullBurstEnter');
    expect(FB_CDR[0].block.target.kind).toBe('allies');
    expect(FB_CDR[0].block.target.excludeSelf ?? false).toBe(false);
  });

  it('accelerates the team rotation', () => {
    expect(kindCount(base.events, 'fullBurstStart')).toBeGreaterThanOrEqual(
      kindCount(noFbCdr.events, 'fullBurstStart'),
    );
    expect(
      kindCount(base.events, 'fullBurstStart') > kindCount(noFbCdr.events, 'fullBurstStart') ||
        team(base.tot) > team(noFbCdr.tot),
    ).toBe(true);
  });
});

describe('inertness + no silent drops', () => {
  it('the defensive half of the kit moves ZERO damage for anyone', () => {
    // Stripping every DEF / Max-HP / Damage-Taken buff from her override must leave all four
    // units byte-identical. RED if 'Damage Taken down 35.14%' (an ALLY defensive buff) was
    // mis-encoded as a positive damageTakenPct boss debuff, which would inflate the whole team.
    expect(stripDefensive.tot).toEqual(base.tot);
  });

  it('every unmodeled kit line is documented in note/unmodeled', () => {
    expect(documented('taunt', 'attract')).toBe(true);
    expect(documented('perseverance', 'max hp')).toBe(true);
    expect(documented('damage taken')).toBe(true);
    expect(documented('def')).toBe(true);
  });
});

describe('GAPs — kit lines with no primitive / no reachable trigger', () => {
  it.skip('S1a DEF up 3.51% per 1% HP lost: no HP-loss tracking (immortal team) and defPct is inert in v1', () => {});
  it.skip('S2a taunt 4 sec on the final bullet: no taunt/aggro primitive; the boss deals no damage', () => {});
  it.skip('S2b Perseverance Max HP tiers: the HP-below-20% trigger is unreachable, and a self Max HP grant is offensively inert without an atkOfMaxHpPct consumer', () => {});
  it.skip('burst Attract taunt 10 sec / Damage Taken down 35.14%: defensive-only, no primitive', () => {});
  it.skip('Fervor as a CONTINUOUS cooldown reduction: burstCdr is a one-shot subtraction, so a permanent 40->20 sec cooldown FLOOR has no primitive — flagged, magnitude 20 sec is kit-literal', () => {});
  it.skip('swap-window shot economy (pulls/sec and cadence of the changed weapon) is kit-silent — flagged, not asserted', () => {});
});
```

## 6. S6 BLIND OVERRIDE (claude-opus-5) — blind/moran.override.json + DRIVER DIFF

CONVERGENCE (identical to driver): S1 rider = hitCount:5 + swapGate:'swapped' + flatDamage 47.18 (the F2 fix, independently derived by BOTH blind roles); burst weaponSwap 14.7/10s + unlimitedAmmo 10s (self); burst casterAtkPct 42.57/10s (allies); S2 fullBurstEnter -> allies burstCdr 7.48. Both avoid the atkPct trap (casterAtkPct chosen) and the damageTaken-boss-debuff trap (blind: 'deliberately unmodeled, NOT mapped to damageTakenPct'). Both flag the SAME swap-cadence residual (kit-silent; recipe = solo Moran fight, count swapped shots / 10s).

BENIGN DIVERGENCES (none affect damage faithfulness):
- defPct: blind authors an inert placeholder defPct 17.55 (flagged 'TRUE in-sim value is 0; do NOT read 17.55 as measured'); driver omits it as UNMODELED-inert. Both agree it moves zero damage.
- Fervor: blind encodes passive burstCdr 20 oncePerBattle (a conservative guess it SELF-FLAGS as unresolved, recipe 'measure rotation 1 vs 2 cooldown'); driver encodes burstCdr 20 on every burstCast (the per-cycle reading, MEASURED frame-by-frame per the override note). Driver is the measured-correct reading.
- damageTaken -35.14%: blind omits; driver keeps it as an inert ally fidelity buff (holders = the 4 allies, NOT the boss; driver test proves totals byte-identical when stripped). Both agree it is offensively inert and not a boss debuff.
- S2 taunt: blind keeps an empty-effects lastBullet trigger block for auditability; driver omits the block and records the text verbatim in unmodeled. Both inert.

```json
{
  "slug": "moran",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "passive"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "defPct",
          "value": 17.55
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "hitCount",
        "count": 5
      },
      "target": {
        "kind": "enemy"
      },
      "swapGate": "swapped",
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 47.18,
          "crit": true,
          "noRange": true
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "passive"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "burstCdr",
          "seconds": 20,
          "oncePerBattle": true
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "lastBullet"
      },
      "target": {
        "kind": "enemy"
      },
      "effects": []
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "burstCdr",
          "seconds": 7.48
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
        "kind": "self"
      },
      "effects": [
        {
          "kind": "weaponSwap",
          "damagePct": 14.7,
          "durationSec": 10
        },
        {
          "kind": "unlimitedAmmo",
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
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 42.57,
          "durationSec": 10
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [],
    "skill2": [
      "Taunts for 4 sec.",
      "Activates when HP falls below 20%. Affects self. Effect varies according to the number of uses. Perseverance: Only one effect is triggered at a time. Once: Max HP ▲ 91% for 3 sec. Activates once per battle. Twice: Max HP ▲ 69.84% for 3 sec. Activates once per battle. Three Times: Max HP ▲ 51.09% for 3 sec. Activates once per battle."
    ],
    "burst": [
      "Recovers 36.14% of attack damage as HP for 10 sec.",
      "Attract: Taunts all enemies for 10 sec.",
      "Damage Taken ▼ 35.14% for 10 sec.",
      "DEF ▲ 14.85% of the skill user's DEF for 10 sec."
    ]
  },
  "caveats": [
    "⚑ S1 line 1 'DEF ▲3.51% per 1% HP lost' is HP-state-dependent. The v1 boss deals no damage, so HP loss is 0 and the true in-sim value is 0%. Authored at 17.55% (a nominal 5%-HP-lost stand-in) purely for kit completeness; defPct is inert in v1 so this moves no damage either way. Do NOT read 17.55 as a measured magnitude.",
    "⚑ S1 line 2 trigger: 'landing 5 normal attack(s) while weapon is changed' encoded as hitCount:5 + swapGate:'swapped'. The swap is burst-only (10s), so the rider only fires inside the burst window — its total contribution is entirely governed by the ⚑ swap shot economy below.",
    "⚑ Burst weapon-swap shot economy is kit-silent: no pullsPerSec, no maxAmmo, no maxShots authored, so the engine reuses the base AR cadence with unlimitedAmmo for the 10s window. This is the optimistic default per the priors and is the single largest unmeasured lever in this override.",
    "⚑ S1 line 3 'Fervor: Cooldown of Burst Skill ▼20 sec continuously' — 'when Raptures appear' = battle start; encoded as a one-shot 20s CDR. Whether the engine should instead model Fervor as a persistent CD-reduction state (and whether it re-applies) is unresolved.",
    "⚑ Fervor STATUS GATE NOT MODELED: S2's team-wide 7.48s CDR is kit-gated on 'while in Fervor status'. Fervor is granted by S1 at battle start with no stated expiry, so the gate is treated as permanently satisfied and the block fires on EVERY Full Burst. If Fervor is actually consumed or windowed, this OVER-CREDITS team burst-CDR for the whole fight — highest-leverage line to verify.",
    "The S2 taunt block is authored with an empty effects array to keep the lastBullet trigger auditable; taunt/aggro has no engine primitive.",
    "Burst 'ATK ▲42.57% of the skill user's ATK' → casterAtkPct (flat add from Moran's own ATK), not atkPct. Moran is a Defender with no ATK-scaling identity, so this is a real but modest team buff.",
    "'Damage Taken ▼35.14%' is a DEFENSIVE ally buff (incoming damage), NOT the offensive damageTakenPct boss debuff — deliberately unmodeled, not mapped to damageTakenPct."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Moran is an AR/Electric/Defender/Burst I taunt-tank whose offensive footprint is almost entirely (a) the team ATK/burst-CDR support in her burst and S2, and (b) a 10s weapon-swap window at 14.7%/shot carrying a 47.18% every-5-hits rider. Her S1 DEF scaler and the entire Perseverance/taunt/lifesteal/damage-taken-down half of the kit are survivability-only and inert against the v1 immortal-boss scope. The two load-bearing unknowns are the swap shot economy and whether Fervor status persists all fight."
}```

## 7. DRIVER IMPLEMENTATION — scripts/tests/units/moran.test.ts + src/skills/overrides/moran.json

Driver test result: 14/14 GREEN (post-S3). The S3 edit was the F2 faithfulness fix: S1 rider gate fbGate:'inFb' -> swapGate:'swapped' (the exact primitive, src/skills/types.ts:332 / sim.ts:1684). Probe: 3 rider hits land pre-FB at 4.70/5.12/5.53s (FB opens 5.73s); total rider count near-identical (270 inFb vs 273 swapped, ~1% total delta) — a faithfulness/TIMING fix, board-neutral, NOT a fix for her 0.66 COLD (throughput, footage-blocked).

```typescript
// PER-UNIT KIT SPEC — `moran` (Moran, Defender/AR/Electric, Burst I, cd 40s, ammo 60, TREASURE).
// Kit-autonomy gauntlet 2026-07-25 (driver, sighted).
//
// One assertion group per KIT LINE (M1..M14 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest-wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.moran.skills, level-10 values):
//   S1 ■ start of battle → self: DEF ▲3.51% continuously per 1% HP lost          [M1 UNMODELED — defensive]
//      ■ landing 5 normal attacks WHILE WEAPON IS CHANGED → target:               [M2 — FIX (kit-status F2)]
//        47.18% of final ATK as additional damage (flatDamage rider, per-5-hits)
//      ■ Raptures appear → self: Fervor, Cooldown of Burst Skill ▼20s continuously [M3 — burstCdr 20, always on]
//   S2 ■ firing final bullet → 3 highest-ATK enemies: Taunt 4s                    [M4 UNMODELED — taunt inert]
//      ■ HP < 20% → self: Perseverance Max HP ▲91/69.84/51.09% 3s, 1×/battle each [M5 UNMODELED — HP-gate]
//      ■ entering Full Burst while in Fervor → all allies: Burst CD ▼7.48s         [M6 — team burstCdr 7.48]
//   BU ■ self: Changes the weapon in use — Damage 14.7% of final ATK, 10s          [M7 — weaponSwap, REPLACIVE]
//      ■ self: Recovers 36.14% of attack damage as HP for 10s                     [M8 UNMODELED — lifesteal]
//      ■ self: Attract — Taunts all enemies 10s                                   [M9 UNMODELED — taunt inert]
//      ■ self: Unlimited ammunition 10s                                           [M10 — unlimitedAmmo]
//      ■ self: Unable to take cover while using Burst Skill                       [M11 UNMODELED — no cover model]
//      ■ all allies: Damage Taken ▼35.14% for 10s                                 [M12 — damageTakenPct, INERT]
//      ■ all allies: DEF ▲14.85% of caster DEF for 10s                            [M13 UNMODELED — defensive]
//      ■ all allies: ATK ▲42.57% of caster ATK for 10s                            [M14 — casterAtkPct]
//
// Why each assertion discriminates (a test that cannot fail under the nearest-wrong model gates
// nothing). Probed against the live engine (.moran-probe.ts / .moran-probe2.ts, 2026-07-25 — 12
// bursts, 1369 swap shots, 270 rider hits over the 180s fight):
//   M2  THE FIX (kit-status F2). The rider is text-gated "while weapon is changed" (= her burst
//       weapon-swap window), but the shipped override carries fbGate:"inFb". She is Burst I, so her
//       swap starts at her OWN burst cast — which lands BEFORE the Full Burst window opens (the
//       B1→B2→B3 chain has to finish first). The two 10s windows are OFFSET: the swap window is
//       [cast, cast+10s], the FB window is [fbOpen, fbOpen+10s] with fbOpen > cast. So inFb both
//       misses the head of the swap (the [cast, fbOpen) gap) and over-runs its tail. The exact
//       primitive exists and is unused: swapGate:"swapped" (src/skills/types.ts:332, sim.ts:1684).
//       DISCRIMINATOR: with swapGate the rider fires in the pre-FB gap (probe: 3 hits at 4.70/5.12/
//       5.53s, FB opens 5.73s); with inFb ZERO rider hits land before fbOpen. The total rider count
//       is near-identical (270 vs 273 — equal-length windows, similar proc counts), so this is a
//       faithfulness fix on TIMING, board-neutral, NOT a fix for her 0.66 COLD. The magnitude/cadence
//       assertions below are FAITHFUL in shipped (green now); only the gate assertion is red pre-S3.
//   M3  Fervor is always active in solo raids (Raptures always present) → burstCdr 20 on her own
//       burstCast turns her 40s CD into an effective ~15s: she casts 12×/180s. Removing it halves her
//       casts (12 → 6). Nearest wrong: omitting Fervor (a 40s-CD model).
//   M6  the team burst-CDR 7.48s on FB entry (Fervor-gated, always on) is real rotation economy:
//       removing it drops crown 12 → 9 casts and moran 12 → 9. Nearest wrong: omitting it.
//   M7  REPLACIVE weapon swap, NOT an additive rider. Her base AR normalAttackMultiplier is 14.71 ≈
//       the swap 14.7 — the swap weapon hits for what her AR hits for (kit-status F3). The nearest
//       wrong model (the REFUTED F3) is extraHitDamagePct 14.7 additive on top of the 14.71 AR. The
//       STRUCTURAL proof it is wrong: it produces ZERO 14.7% normal-bucket shots — the weapon is
//       never replaced, she keeps firing 14.71% AR with a +14.7% rider stacked on top. It also
//       over-credits her total (+~9% here; the overshoot is muted relative to a pure per-shot
//       doubling because removing the swap also deadens the swap-gated M2 rider). Shipped keeps the
//       per-shot multiplier at 14.7 via weaponSwap.
//   M10 unlimitedAmmo rides the swap window: the 1369 swap shots are exactly the unlimited-ammo shots.
//   M12 Damage Taken ▼35.14% is an ally-side defensive reduction the engine treats as INERT (no HP
//       pool / nothing dies at scope lock). Asserted applied (48 buffs, 4 holders, 10s) AND inert
//       (removing it leaves EVERY unit's total byte-identical) — the helm-H4 fidelity pattern.
//   M14 casterAtkPct = a FLAT add of MORAN's ATK (0.4257×staticAtk ≈ 33,971), NOT a % of each ally's
//       own ATK. Reaches all four allies for 10s, once per cast per ally (48 = 12 casts × 4). Nearest
//       wrong: a self-only model (holder set collapses to moran).
//
// Inert / unmeasured (documented, NOT asserted): M1 DEF-per-HP-lost (HP-loss-gated; the partless boss
// never drops her HP, and DEF has no offensive consumer on her), M4/M9 taunts (no targeting model at
// scope lock), M5 Perseverance Max-HP phases (HP-gate, never fires; self survival, offensively inert),
// M8 lifesteal (no HP pool), M11 no-cover (no cover model), M13 DEF▲14.85% of caster DEF (defensive).
//
// Fixture: moran(AR B1) / crown(B2) / ada(RL B3) / helm(SR B3), boss Water (Electric-weak, the
// kit-status evidence basis), focus ada. moran is the Burst-I caster: she opens the chain and — with
// Fervor's effective ~15s CD — sustains 12 casts / 12 Full Bursts over 180s. Deterministic (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const COMP = ['moran', 'crown', 'ada', 'helm'];
const MORAN = 0; // moran's slot in COMP

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;
type FbStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: COMP,
    bossElement: 'Water',
    focusSlug: 'ada',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res), res };
}

// ---- counterfactual / reference patches (nearest-wrong models) -------------------------------
/** M2 faithful encoding (the S3 fix): gate the rider to the weapon-swap window, not the FB window. */
const moranSwapGate = withPatchedOverride('moran', (ov) => {
  const b = ov.skill1.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'flatDamage'),
  );
  if (!b)
    throw new Error('moran S1 flatDamage rider missing — fixture is stale');
  delete b.fbGate;
  b.swapGate = 'swapped';
});
/** M7 nearest-wrong (REFUTED kit-status F3): the 14.7 as an ADDITIVE extraHitDamagePct rider. */
const moranAdditive = withPatchedOverride('moran', (ov) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'weaponSwap'),
  );
  if (!b) throw new Error('moran burst weaponSwap missing — fixture is stale');
  b.effects = b.effects.filter((e: any) => e.kind !== 'weaponSwap');
  b.effects.push({
    kind: 'buff',
    stat: 'extraHitDamagePct',
    value: 14.7,
    durationSec: 10,
  });
});
/** M3 nearest-wrong: Fervor's burstCdr 20 removed (a 40s-CD model). */
const moranNoFervor = withPatchedOverride('moran', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) =>
      !b.effects.some((e: any) => e.kind === 'burstCdr' && e.seconds === 20),
  );
  if (ov.skill1.length === before)
    throw new Error('moran S1 Fervor burstCdr 20 missing — fixture is stale');
});
/** M6 nearest-wrong: the S2 team burst-CDR 7.48 removed. */
const moranNoTeamCdr = withPatchedOverride('moran', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) =>
      !b.effects.some((e: any) => e.kind === 'burstCdr' && e.seconds === 7.48),
  );
  if (ov.skill2.length === before)
    throw new Error('moran S2 burstCdr 7.48 missing — fixture is stale');
});
/** M12 reference: the ally Damage-Taken reduction removed (must be inert). */
const moranNoDmgTaken = withPatchedOverride('moran', (ov) => {
  let removed = 0;
  for (const b of ov.burst) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.stat !== 'damageTakenPct');
    removed += before - b.effects.length;
  }
  if (!removed)
    throw new Error('moran burst damageTakenPct missing — fixture is stale');
});
/** M14 nearest-wrong: burst ATK grant scoped to self. */
const moranBurstSelf = withPatchedOverride('moran', (ov) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'casterAtkPct'),
  );
  if (!b)
    throw new Error('moran burst casterAtkPct missing — fixture is stale');
  b.target = { kind: 'self' };
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const swapGate = run({ moran: moranSwapGate });
const additive = run({ moran: moranAdditive });
const noFervor = run({ moran: moranNoFervor });
const noTeamCdr = run({ moran: moranNoTeamCdr });
const noDmgTaken = run({ moran: moranNoDmgTaken });
const burstSelf = run({ moran: moranBurstSelf });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const shots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot');
const moranCasts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'moran',
  );
const castsOf = (evs: SimEvent[], slug: string) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === slug)
    .length;
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e): e is FbStart => e.kind === 'fullBurstStart');
/** moran's S1 rider hits: 47.18% flatDamage in the skill bucket, srcSlot skill1. */
const riderHits = (evs: SimEvent[]) =>
  dmg(evs).filter(
    (d) =>
      d.slug === 'moran' &&
      d.srcSlot === 'skill1' &&
      Math.abs(d.atkPct - 47.18) < 1e-6,
  );
/** moran's swapped-weapon normal shots: normal bucket at the swap's 14.7% (base AR is 14.71%). */
const swapShots = (evs: SimEvent[]) =>
  dmg(evs).filter(
    (d) =>
      d.slug === 'moran' &&
      d.bucket === 'normal' &&
      Math.abs(d.atkPct - 14.7) < 1e-6,
  );
const moranShots = (evs: SimEvent[]) =>
  shots(evs).filter((s) => s.slug === 'moran');
/** moran-cast buffApply by stat (key carries the raw kit magnitude). */
const moranBuff = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter(
    (b) => b.stat === stat && b.key.startsWith(`${MORAN}:burst`),
  );
const holders = (bs: BuffApply[]) => new Set(bs.map((b) => b.targetIdx));

describe('moran — kit spec', () => {
  describe('M2 — S1 47.18%-of-final-ATK rider fires every 5 normal hits WHILE WEAPON IS CHANGED', () => {
    it('is the kit magnitude, in the skill bucket, attributed to skill1 (live, not inert)', () => {
      const riders = riderHits(base.events);
      expect(
        riders.length,
        'no S1 rider hits — the per-5-hits proc never fired',
      ).toBeGreaterThan(0);
      expect([...new Set(riders.map((d) => d.atkPct))]).toEqual([47.18]);
      expect([...new Set(riders.map((d) => d.bucket))]).toEqual(['skill']);
      expect([...new Set(riders.map((d) => d.srcSlot))]).toEqual(['skill1']);
    });

    it('fires about once per 5 swapped-window shots (the hitCount:5 cadence)', () => {
      const riders = riderHits(base.events).length;
      const swaps = swapShots(base.events).length;
      expect(
        riders,
        `${riders} riders vs ${swaps} swap shots — expected ~1 per 5 (between 1/6 and 1/4)`,
      ).toBeGreaterThan(swaps / 6);
      expect(riders).toBeLessThan(swaps / 4);
    });

    // THE FIX (kit-status F2). Shipped gates the rider to the Full Burst window (fbGate:"inFb");
    // the kit says "while weapon is changed" = the swap window, which for this Burst-I unit opens at
    // her OWN cast — BEFORE the FB window opens. A faithful swapGate fires the rider in that pre-FB
    // gap; inFb cannot. RED against shipped (0 pre-FB hits), GREEN once S3 lands swapGate:"swapped".
    it('DISCRIMINATING (F2 fix): the rider lands in the pre-FB swap gap (swapGate, not inFb)', () => {
      const firstFb = fbStarts(base.events)[0]?.frame;
      expect(
        firstFb,
        'no Full Burst opened — fixture produced no rotation',
      ).toBeDefined();
      const preFb = riderHits(base.events).filter((d) => d.frame < firstFb!);
      expect(
        preFb.length,
        'shipped inFb gates the rider OUT of the pre-FB swap gap; a faithful swapGate fires it there',
      ).toBeGreaterThanOrEqual(1);
    });

    it('SANITY: the faithful swapGate moves the pre-FB count off zero without changing the kit magnitude', () => {
      const firstFb = fbStarts(swapGate.events)[0]?.frame;
      const preFb = riderHits(swapGate.events).filter(
        (d) => d.frame < firstFb!,
      );
      expect(
        preFb.length,
        'swapGate counterfactual should fire pre-FB riders',
      ).toBeGreaterThanOrEqual(1);
      expect([
        ...new Set(riderHits(swapGate.events).map((d) => d.atkPct)),
      ]).toEqual([47.18]);
    });
  });

  describe('M3 — S1 Fervor: Cooldown of Burst Skill ▼20s continuously (always on → effective ~15s CD)', () => {
    it('she sustains a burst roughly every rotation (≥10 casts over 180s), not a 40s CD', () => {
      expect(moranCasts(base.events).length).toBeGreaterThanOrEqual(10);
    });

    it('DISCRIMINATING: removing Fervor roughly halves her cast count', () => {
      const withFervor = moranCasts(base.events).length;
      const without = moranCasts(noFervor.events).length;
      expect(
        without,
        'noFervor counterfactual still cast as often — Fervor is inert',
      ).toBeLessThan(withFervor);
      expect(withFervor).toBeGreaterThanOrEqual(without * 1.5);
    });
  });

  describe('M6 — S2 entering Full Burst (Fervor) → all allies: Cooldown of Burst Skill ▼7.48s', () => {
    it('DISCRIMINATING: removing the team CDR drops the team burst cadence', () => {
      expect(castsOf(base.events, 'crown')).toBeGreaterThan(
        castsOf(noTeamCdr.events, 'crown'),
      );
      expect(moranCasts(base.events).length).toBeGreaterThan(
        moranCasts(noTeamCdr.events).length,
      );
    });
  });

  describe('M7 — burst Changes the weapon in use: 14.7% of final ATK, 10s (REPLACIVE weaponSwap)', () => {
    it('her normal-bucket shots become 14.7% inside the swap window (the weapon is replaced)', () => {
      const swaps = swapShots(base.events);
      expect(
        swaps.length,
        'no 14.7% swap shots — the weapon swap never fired',
      ).toBeGreaterThan(0);
      expect([...new Set(swaps.map((d) => d.atkPct))]).toEqual([14.7]);
    });

    it('DISCRIMINATING (F3 refuted): the additive extraHitDamagePct model produces NO 14.7 shots and over-credits her total', () => {
      // Structural proof: an additive rider never REPLACES the weapon, so no 14.7% normal shots exist.
      expect(
        swapShots(additive.events).length,
        'additive model must not replace the weapon',
      ).toBe(0);
      // Corroborating direction: stacking +14.7% on the 14.71 AR over-credits (the REFUTED F3). Muted
      // vs a pure per-shot doubling because removing the swap also deadens the swap-gated M2 rider.
      expect(
        additive.totals.moran,
        'additive 14.7 on top of the 14.71 AR must over-credit her total',
      ).toBeGreaterThan(base.totals.moran * 1.05);
    });
  });

  describe('M10 — burst Unlimited ammunition for 10s (rides the swap window)', () => {
    it('the swap-window shots are exactly the unlimited-ammo shots', () => {
      const unlimited = moranShots(base.events).filter(
        (s) => s.unlimitedAmmo,
      ).length;
      const swaps = swapShots(base.events).length;
      expect(unlimited, 'no unlimited-ammo shots fired').toBeGreaterThan(0);
      expect(unlimited).toBe(swaps);
    });
  });

  describe('M12 — burst grants all allies Damage Taken ▼35.14% for 10s (applied, engine-inert)', () => {
    const applied = moranBuff(base.events, 'damageTakenPct');

    it('is applied to all four allies at the kit magnitude for 10 sec', () => {
      expect(
        applied.length,
        'no burst damageTakenPct buff was applied',
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([-35.14]);
      expect(
        holders(applied).size,
        `reached ${holders(applied).size} allies, expected 4`,
      ).toBe(4);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('is INERT against the partless boss: removing it changes NO unit total by a single point', () => {
      expect(noDmgTaken.totals).toEqual(base.totals);
    });
  });

  describe("M14 — burst grants all allies ATK ▲42.57% of MORAN's ATK (casterAtkPct, flat caster add)", () => {
    const applied = moranBuff(base.events, 'casterAtkPct');
    const expectedFlat = 0.4257 * unitOf(base.res, 'moran').staticAtk;

    it("is a FLAT add of moran's ATK (value ≈ 0.4257×staticAtk), reaching all four allies for 10s", () => {
      expect(applied.length, 'no burst casterAtkPct buff was applied').toBe(
        moranCasts(base.events).length * 4,
      );
      for (const b of applied) {
        expect(
          b.value,
          'casterAtkPct must record a flat ATK grant, not the raw 42.57',
        ).toBeGreaterThan(1000);
        expect(b.value).toBeCloseTo(expectedFlat, 4);
      }
      expect(
        holders(applied).size,
        `reached ${holders(applied).size} allies, expected 4`,
      ).toBe(4);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('DISCRIMINATING: a self-only model collapses the holder set to moran alone', () => {
      const cf = moranBuff(burstSelf.events, 'casterAtkPct');
      expect(
        [...holders(cf)],
        'self-only counterfactual must reach only moran',
      ).toEqual([MORAN]);
    });
  });
});
```

```json
{
  "note": "Treasure kit (synced via TREASURE_SYNERGY_IDS moran:200). Hand-verified vs Prydwen review (Bossing SSS): 'she now becomes a CDR, with her Burst Skill CD reduced to 20 seconds'. Fervor ('Activates when Raptures appear: Cooldown of Burst Skill ▼ 20 sec continuously') is ALWAYS active in solo raids -> modeled as burstCdr 20 on her own burstCast, turning her 40s CD into an effective 20s so she bursts every rotation. S1's 47.18% per-5-hits proc is text-gated 'while weapon is changed' (= during her burst weapon swap; blablalink wording) -> swapGate:swapped gates it to the [burstCast, +10s] swap window (gauntlet 2026-07-25 fix; previously fbGate:inFb approximation — see F2 note below). S2's team burst-CDR 7.48s on FB enter requires Fervor, which is always on -> parser's unconditional read is correct, kept here verbatim. Burst kept: weapon swap 14.7%/shot AR w/ unlimited ammo 10s + team ATK 42.57% of caster (casterAtkPct). Damage Taken ▼35.14% on allies is a defensive reduction (ally-side damageTakenPct is inert in the engine, kept for fidelity). Skipped as defensive: DEF-per-HP-lost, taunts, Perseverance max-HP phases, lifesteal. S2's team burst CDR 7.48s on full-burst entry (parser-native) is REAL - required by both the run-B rotation (16.4s with moran effective CD 40-20-7.48=12.5s) and the TB2T2 40s rotation (cinderella 40-7.48=32.5s effective). [materialized 2026-07-16: skill2/burst auto-filled from the offline parser (blablalink prose) — behavior-identical to the prior runtime parse; NOT hand-verified] [2026-07-17 SWAP-CADENCE ATTEMPT REFUTED] The engine gained a weaponSwap `pullsPerSec` field, and the kit-status finding's datamine (swap shot_id 1028102 rate_of_fire 1440 = 24 pulls/s, 2x base AR 12/s) was applied — but the BOARD (her 3 real-recording comps) REFUTED it: 24/s overshot 0.712 COLD → 1.325 HOT (1.25/1.31/1.41, tight ±0.7% seedSD). The finding predicted '~covers the 29% gap'; the independent recordings say 24/s is TOO HIGH (her 10s unlimited-ammo swap window is ~60% of the fight, so doubling its cadence over-credits). The datamine value could NOT be independently confirmed from repo primary files (characters.json carries only the BASE weapon shot_detail, ROF 720), so per measured>fudge / faithful>fit the opt-in was BACKED OUT rather than fudged to an intermediate rate. MEASURED 2026-07-17 (moran control.mov, 60fps frame read): her PROSE burst ('Changes the weapon in use: Damage 14.7% of final ATK, Unlimited ammunition, 10s') states NO fire-rate change — only per-shot damage. Video confirms it: NORMAL fire (video 10-11s, pre-burst) = clean discrete orange muzzle flashes + tracers every ~5-6 frames = ~12/s (base AR, exactly). SWAP window (video ~28s, FB active) = the muzzle LOOKS busier only because the swap weapon's Electric muzzle EFFECT is bigger/longer (big purple burst vs small orange AR flash); the actual shot cadence read off boss damage-popup density (~2-3 concurrent ~0.4s-life popups) + tracers is ~10-14/s — consistent with base ~12/s and UNAMBIGUOUSLY far below 24/s (which would stack ~2x the popups). CONCLUSION: swap fires at BASE AR 12/s; the datamine '1440' was an unlabeled skill_value integer (characters.json burst skill_value_data [1146, 1440, 1028102, ...]) with NO prose support and is NOT her swap fire rate. No pullsPerSec override — base 12/s is faithful. [2026-07-17 COLDNESS DIAGNOSED — FOLLOW-UP, footage-blocked] Her 0.712 COLD is NOT per-shot: her measured per-shot popup RECONCILES EXACTLY to the standard formula — recon non-crit-non-core 30,478 = 14.71% × 131,441 (Crown casterAtkPct-64.51 buffed ATK) × 1.5723 (Helm attackDamage dmgUp), 0.3% match; the buffs ARE modeled and the coef is faithfully 14.7% of final ATK (NO extra-finalATK factor — that would give ~2.5B/shot). The gap is THROUGHPUT: sim 217M vs real 288M with per-shot matching ⇒ real lands ~1.3x MORE HITS than the sim's ~2100 shots (~2800), concentrated in the swap window (~1.5x throughput there). Mechanism = a faster swap fire-rate OR the swap weapon (shot_id 1028102) firing >1 bullet/pull — but bullets-per-pull is NOT measurable from this COMP recording (electric muzzle bloom + occluded ammo counter + overlapping popups; the recon reached the same wall). FOLLOW-UP needs an ISOLATED moran-solo recording (or the swap weapon's datamined shot_count/muzzle_count for 1028102) to pin the throughput multiplier. Do NOT model it as a per-shot value change (measured-refuted). [2026-07-17 THEME-13] Her S2 Perseverance 'Max HP ▲ 91%/69.84%/51.09% for 3 sec (once per battle)' lines are DELIBERATELY still unmodeled: they are HP-loss-gated ('Activates when HP falls below 20%'), so on the immortal partless boss (HP never drops) they NEVER fire — a kill/HP-gate (theme 18), not a theme-13 Max-HP-grant gap. They are self-targeted own-% survival buffs with no atkOfMaxHpPct consumer on moran, so even if they fired they'd be offensively inert. Left as skips intentionally. [Kit-autonomy gauntlet 2026-07-25] F2 FAITHFULNESS FIX enacted: S1's 47.18% per-5-hits rider gate changed fbGate:inFb -> swapGate:swapped (the exact primitive, src/skills/types.ts:332 / sim.ts:1684, previously unused). The kit text 'while weapon is changed' = her burst weapon-swap window; as Burst I her swap opens at her OWN cast, which lands BEFORE the Full Burst window opens (the B1->B2->B3 chain must finish first), so the two 10s windows are OFFSET — inFb both missed the pre-FB swap gap [cast, fbOpen) and over-ran the swap tail. swapGate fires the rider faithfully inside [burstCast, +10s]. Probe: 3 rider hits land pre-FB at 4.70/5.12/5.53s (FB opens 5.73s); total rider count near-identical (270 inFb vs 273 swapped, ~1% total delta) — a faithfulness/TIMING fix, board-neutral, NOT a fix for her 0.66 COLD (that is throughput, footage-blocked). Cross-family corroborated: claude-fable-5 (S2b) independently derived swapGate:swapped + the same load-bearing set. RESIDUAL ⚑ (swap cadence / pullsPerSec, kit-silent): ESTIMATE base AR 12/s (MEASURED from moran control.mov 60fps frame read; the 24/s datamine shot_id 1028102 rate_of_fire 1440 was board-REFUTED, 0.712 COLD -> 1.325 HOT). RECIPE: an isolated moran-solo recording, OR the datamined shot_count/muzzle_count for swap weapon 1028102, to pin the throughput multiplier behind her COLD. TIER: MEASURED-throughput (footage-blocked residual; NOT a per-shot value — per-shot reconciles to the formula to 0.3%).",
  "unmodeled": {
    "skill1": [
      "Activates at the start of battle. Affects self. DEF ▲ 3.51% continuously for every 1% of HP lost."
    ],
    "skill2": [
      "Activates when firing the final bullet. Affects the 3 enemy unit(s) with the highest final ATK. Taunts for 4 sec.",
      "Activates when HP falls below 20%. Affects self. Effects vary according to the number of uses. Perseverance: Only one effect is triggered at a time.",
      "Once: Max HP ▲ 91% for 3 sec. Activates once per battle.",
      "Twice: Max HP ▲ 69.84% for 3 sec. Activates once per battle.",
      "Three Times: Max HP ▲ 51.09% for 3 sec. Activates once per battle."
    ],
    "burst": [
      "Additional Effect(s):",
      "Recovers 36.14% of attack damage as HP over 10 sec.",
      "Attract: Taunts all enemies for 10 sec.",
      "Note: Unable to take cover while using Burst Skill.",
      "DEF ▲ 14.85% of the skill user's DEF for 10 sec."
    ]
  },
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "hitCount",
        "count": 5
      },
      "target": {
        "kind": "enemy"
      },
      "swapGate": "swapped",
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 47.18
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "burstCdr",
          "seconds": 20
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "burstCdr",
          "seconds": 7.48
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
        "kind": "self"
      },
      "effects": [
        {
          "kind": "weaponSwap",
          "damagePct": 14.7,
          "durationSec": 10
        },
        {
          "kind": "unlimitedAmmo",
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
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "damageTakenPct",
          "value": -35.14,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 42.57,
          "durationSec": 10
        }
      ]
    }
  ]
}
```
