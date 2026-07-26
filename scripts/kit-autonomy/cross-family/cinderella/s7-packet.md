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

## MECHANICS SSOT

MECHANICS SSOT (full docs: docs/data/damage-calculation.md + docs/data/game-mechanics.md — read these on disk for the complete spec; the relevant rules for this unit are summarized here):
- Damage formula: multiplicative buckets — amount = baseAtk × atkPct/100 × (major × elem × charge × dmgUp × seqMult × projFactor × taken × distributed). baseAtk = effectiveAtk − bossDef (flat 140 under scope lock).
- effectiveAtk = staticAtk×(1+atkPct/100) + casterAtkPct + (atkOfMaxHpPct/100)×liveMaxHp. atkOfMaxHpPct is an ATK-from-own-MaxHP conversion: liveMaxHp = static base + OWN-kit maxHpFlat grants only (casterIdx===self); ally-granted Max HP is EXCLUDED (cindy e3 video rule).
- casterMaxHpPct ("% of caster Max HP") and targetMaxHpPct ("Max HP ▲ %", target's own %) both convert to a flat maxHpFlat grant at apply time; for a SELF target caster===target so both feed atkOfMaxHpPct.
- rampSec on a buff = linear ramp min(1,(frame−startFrame)/rampFrames); rampSec on a flatDamage = per-battle-elapsed scale min(1, frame/round(rampSec×60)) snapshotted at cast.
- Full Burst: B1→B2→B3 chain opens a 10s FB window; damage inside takes a +50% FB major (fbMajorApplied) UNLESS the line is noFb or resolves at burstCast timing. Burst-CAST damage resolves BEFORE the FB window opens (cast-instant) → fbMajorApplied=false. stageEnter blocks run before burstCast blocks at a cast.
- magDumpRof (charFixes): whole-magazine dump — one charge primes the mag, then the whole magazine autofires at datamine rate_of_fire without recharging, then reload-to-max re-arms the prime. Charge Speed shortens only the once-per-mag prime, not the dump rof.
- shotFired trigger fires the block on every trigger pull; flatDamage riders crit by default (critEligible) and take FB by landing timing.
- Scope lock: skill levels 10/10/10, Base5 gear, core 7, partless boss, bossDef 140, auto-play, deterministic (no seed).


---

## GROUND TRUTH — unit kit prose + base stats (data/characters.json → characters.cinderella)

```json
{
  "slug": "cinderella",
  "name": "Cinderella",
  "weapon": "RL",
  "burst": "III",
  "class": "Defender",
  "element": "Electric",
  "manufacturer": "Pilgrim",
  "burstCooldownSec": 40,
  "normalAttackMultiplier": 32.11,
  "coreAttackMultiplier": 200,
  "ammo": 24,
  "reloadFrames": 141,
  "chargeFrames": 60,
  "chargeMultiplier": 200,
  "hitsPerShot": 1,
  "rl3": 3.6,
  "burstGaugePerShot": 0.225,
  "baseStats": {
    "hp": 16500,
    "atk": 400,
    "def": 107,
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
    "resourceId": 511
  },
  "skills": {
    "skill1": "■ Activates when entering Burst Stage 3. Affects self.\nATK ▲ 2.71% of the skill user's final Max HP for 10 sec.\n■ Activates when attacking with Full Charge. Affects self.\nCharge Speed ▲ 100%. Removed upon reloading to max ammunition.\n■ Activates when hitting a target with Full Charge. Affects the target.\nDeals 136.6% of final ATK as additional damage.",
    "skill2": "■ Activates at the start of battle. Affects self.\nDecoy: Creates an avatar with 96% of the skill user's final Max HP. This effect is continuous.\n■ Activates when entering Burst Skill Stage 3. Affects self.\nDecoy: Creates an avatar with 96% of the skill user's final Max HP. This effect is continuous.\n■ Activates every 3 sec when a decoy is present. Affects self.\nBeautiful: Max HP ▲ 1.6% continuously, stacks up to 12 times.",
    "burst": "■ Affects random enemies.\nDeals 1365.92% of final ATK as damage. Attacks sequentially for 10 time(s).\n■ Affects the same target(s) when in Beautiful status.\nDeals 28.9% of final ATK as additional damage.Mirrors the stack count of Beautiful."
  },
  "weaponDatamine": {
    "damage": 3211,
    "rate_of_fire": 180,
    "charge_time": 100,
    "reload_time": 200,
    "shot_count": 1,
    "muzzle_count": 1,
    "full_charge_damage": 20000,
    "core_damage_rate": 20000,
    "input_type": "DOWN_Charge",
    "max_ammo": 24
  },
  "burstDatamine": {
    "skill_value_data": [
      {
        "skill_value": 85370,
        "skill_value_type": "Percent"
      },
      {
        "skill_value": 10,
        "skill_value_type": "Integer"
      },
      {
        "skill_value": 20,
        "skill_value_type": "Integer"
      },
      {
        "skill_value": 0,
        "skill_value_type": "None"
      },
      {
        "skill_value": 0,
        "skill_value_type": "None"
      }
    ],
    "skill_cooltime": 4000
  }
}
```


---

## S2b CROSS-FAMILY TEST-FAITHFULNESS REVIEW (claude-fable-5)

```json
{
  "slug": "cinderella",
  "leakDetected": "Effect schema (not the methodology) leaks this unit's burst line 2: the flatDamage.rampSec comment names 'a Beautiful-mirror: 28.9%×12 stacks ramping over ~36s' — this unit's exact rider magnitude, stack cap, and ramp encoding. Declared per protocol; all dispositions below re-derived from the kit prose alone (the ~36s ramp is independently derivable: 3s interval × 12 stacks).",
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "ATK ▲ 2.71% of final Max HP, 10 sec",
      "disposition": "FAITHFUL",
      "scope": "Generic ATK gain (all damage the unit deals while live), but the MAGNITUDE is an HP→ATK conversion: 2.71% of the user's OWN final Max HP as flat ATK — not 2.71% of ATK.",
      "durationSemantics": "durationSec:10, reapplied each Burst-Stage-3 entry (once per rotation). Not permanent, not rounds.",
      "triggerIdentity": "stageEnter stage:3 — 'entering Burst Stage 3' is a team stage event, NOT burstCast (fires even on rotations where a different B3 casts) and NOT fullBurstEnter. Critical timing: the buff must be live BEFORE her own burst damage resolves.",
      "targetSet": "self",
      "nearestWrongModel": "Two plausible misreads: (a) atkPct:2.71 scaling her ATK instead of her Max HP — a Defender's HP pool makes the faithful flat-ATK add enormously larger; (b) fullBurstEnter trigger — applies AFTER her burst cast, so the 10-hit nuke misses the ATK steroid entirely.",
      "distinguishingAssertion": "buffApply at stage-3 entry carries a flat-ATK value ≈ 0.0271 × finalMaxHp (>> 0.0271 × staticAtk), with expiresFrame ≈ applyFrame + 600; the burst-cast damage events that same rotation show mult reflecting the buffed ATK. Value on a LATER stage-3 entry exceeds the first (Beautiful Max-HP stacks have grown the conversion base). Red under (a): value ≈ 2.71% of ATK; red under (b): first nuke's mult shows unbuffed ATK.",
      "inertness": "Buff must lapse ~10s after entry — normal-attack damage mid-rotation (t > entry+10s) must NOT carry it; no application on rotations with no stage-3 entry.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Charge Speed ▲ 100%. Removed upon reload",
      "disposition": "FAITHFUL",
      "scope": "Self weapon-state modifier — this IS damage (halves the 60f charge, raising shots/magazine and multiplying the s1 full-charge rider count). Never 'skip as QoL'.",
      "durationSemantics": "NO durationSec — persists across the magazine; stripped ONLY at reload-to-max. This is exactly the removeOnReload:true primitive: per-full-charge-shot trigger, no time expiry.",
      "triggerIdentity": "Fires on attacking with Full Charge (each fully-charged shot re-applies; effectively live from shot 1 of each magazine, gone after each max-ammo reload). Not interval, not burst-gated.",
      "targetSet": "self",
      "nearestWrongModel": "Permanent chargeSpeedPct:100 passive (never removed on reload) — over-credits the first shot of every magazine; or slapping a durationSec:10 on it so it lapses mid-magazine; or dropping it as a 'defensive/QoL' line, cutting shots/magazine and every rider proc.",
      "distinguishingAssertion": "buffApply chargeSpeedPct value:100 after the magazine's first full-charge shot AND a buffRemove with cause:'reload' at each reload-to-max (buffRemove is emitted ONLY for removeOnReload — its very presence distinguishes this encoding). Intra-magazine shot cadence tightens after shot 1 (charge 60f→~30f); the first shot after each reload is slow again. Red under permanent: no buffRemove events, post-reload first shot already fast.",
      "inertness": "Must NOT alter reloadFrames (141) or ammo (24); no effect on other units.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Deals 136.6% final ATK additional dmg",
      "disposition": "FAITHFUL",
      "scope": "On-hit rider attached to every full-charge HIT (RL normals are full-charge, so effectively per landed shot). Standard rider rules: noRange (engine force-sets), crits at caster rate, NO core, takes FB +50% by landing timing (default ON).",
      "durationSemantics": "Instant per-proc; no duration.",
      "triggerIdentity": "On-hit with Full Charge — per-shot proc, no gate. Not hitCount-N, not interval, not FB-gated.",
      "targetSet": "enemy (the hit target)",
      "nearestWrongModel": "Routing it through the charge bucket (charge:true, eligible for chargeDamagePct buffs) instead of a plain flatDamage rider; or under-frequencing it (every-N / interval) instead of every shot. Its count is also coupled to line 2: modeling charge speed wrong halves/doubles this rider's proc count.",
      "distinguishingAssertion": "Count of damage events with mult 136.6 (srcSlot skill1) == count of the unit's shot events, both inside and outside FB; events show rangeApplied:false and no core contribution. Red under charge-bucket: mult inflated by any chargeDamagePct in the comp; red under every-N: count < shots fired.",
      "inertness": "Must not appear on burst hits; per-proc magnitude must not scale with Beautiful stacks.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Start of battle: Decoy avatar 96% Max HP",
      "disposition": "UNMODELED",
      "scope": "Summons a decoy entity (96% of caster final Max HP as avatar HP). v1 has no damage-taken model or entity HP pools — the avatar itself is defensively inert.",
      "durationSemantics": "Continuous from t=0. LOAD-BEARING CONSEQUENCE: the v1 boss deals no damage, so the decoy can never die → 'a decoy is present' is TRUE for the whole fight, and the skill2 Beautiful interval must run unconditionally from t=0. This assumption must be stated in the override note.",
      "triggerIdentity": "Start of battle (passive).",
      "targetSet": "self (summon)",
      "nearestWrongModel": "Skipping the decoy AND treating the 'when a decoy is present' gate as never-satisfied — silently zeroing ALL Beautiful stacking, which guts skill1's HP→ATK conversion and the entire burst mirror line.",
      "distinguishingAssertion": "Beautiful buffApply events begin at t≈3s in a plain controlComp run (proves the presence-gate resolved TRUE from battle start). Red under gate-never-satisfied: zero Beautiful applications all fight.",
      "inertness": "The avatar must contribute zero damage and zero team stats; unmodeled text recorded verbatim.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "Burst Skill Stage 3: Decoy avatar again",
      "disposition": "UNMODELED",
      "scope": "Re-summon of the same decoy at stage-3 entry — a refresh path for when the boss has killed the first avatar.",
      "durationSemantics": "Continuous.",
      "triggerIdentity": "stageEnter stage:3 (same team-stage reading as skill1 line 1).",
      "targetSet": "self (summon)",
      "nearestWrongModel": "Treating the re-summon as resetting the Beautiful stack count to 0 — nothing in the prose says stacks reset; Beautiful is 'continuously' held and only gated on presence.",
      "distinguishingAssertion": "Beautiful stack count in buffApply events is monotone non-decreasing across stage-3 entries (never resets at a burst rotation). Red under stack-reset: stacks drop after her burst.",
      "inertness": "Redundant in v1 (first decoy immortal) — must move nothing on its own.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "Every 3 sec: Max HP ▲ 1.6%, 12 stacks",
      "disposition": "FAITHFUL",
      "scope": "Self Max HP ramp ('Beautiful'). Offensively live through TWO consumers: skill1's ATK = 2.71% of final Max HP (self-granted maxHpPct DOES feed the own-HP conversion), and the burst's stack-count mirror.",
      "durationSemantics": "'Continuously' = permanent stacks, NO durationSec, maxStacks:12 — one stack per 3s tick, cap reached at t≈36s. This trajectory is fully kit-derivable (rule 10): interval and cap are both stated, so the ramp is DERIVED, not a ⚑ guess.",
      "triggerIdentity": "interval sec:3 (first fire t=3s), gated on decoy presence — which v1 resolves to always-true (see skill2 line 1). ⚑ only on first-fire phase convention (t=3 vs t=0), the standing interval caveat.",
      "targetSet": "self",
      "nearestWrongModel": "Instant 12 stacks at t=0 (authoring the buff at max magnitude with no ramp) — over-credits the first burst rotation's HP→ATK conversion AND the first burst's mirror; or giving each stack a durationSec so stacks churn instead of accruing.",
      "distinguishingAssertion": "buffApply events for the Beautiful key show stacks 1,2,3,… at t≈3,6,9…s, reaching stacks:12 no earlier than t≈36s, with no time expiry (no finite expiresFrame); value per stack = 1.6% Max HP. Red under instant-cap: stacks:12 at first application; red under expiring stacks: stack count plateaus below 12.",
      "inertness": "Zero direct damage; must not buff allies; must not tick faster than 3s.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "1365.92% ATK, sequentially 10 time(s)",
      "disposition": "FAITHFUL",
      "scope": "Burst nuke: 10 sequential hits, EACH 1365.92% of final ATK (≈13,659% total) — vs the partless single boss, all 10 'random enemy' hits land on the boss. Sequential-flavored: sequentialDamagePct (additive, diluted) and sequentialMultPct (own bucket) buffs from teammates apply.",
      "durationSemantics": "Instant volley at cast; cd 40s.",
      "triggerIdentity": "burstCast (her own stage-3 cast). Burst-cast damage is FB-exempt by timing (lands before the FB window opens) — no +50% FB major on these hits.",
      "targetSet": "enemy",
      "nearestWrongModel": "Reading 1365.92% as the TOTAL split across the 10 sequential hits (÷10 per hit) — a 10× undervalue of the fight's single largest damage packet; secondarily, applying the +50% FB major to the volley.",
      "distinguishingAssertion": "Per burstCast, exactly 10 damage events each with mult 1365.92 and sequential flavor, summing ≈ 13659.2% × (final ATK incl. the live skill1 HP→ATK buff), each with fbMajorApplied:false. Red under total-split: per-hit mult 136.592; red under FB-major: fbMajorApplied:true.",
      "inertness": "Must not fire on teammates' FBs where she doesn't cast (40s cd skips rotations); the skill1 136.6% rider must not attach to these 10 hits.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "28.9% add'l dmg, mirrors Beautiful stacks",
      "disposition": "FAITHFUL",
      "scope": "Rider on the burst volley, gated on the USER being in Beautiful status: +28.9% × currentBeautifulStacks per hit (max 346.8%/hit, ≈3468% across the 10 hits at cap). 'The same target(s)' = the hits' targets; 'when in Beautiful status' describes CINDERELLA's status, not a boss status.",
      "durationSemantics": "Instant at cast; magnitude is DYNAMIC — snapshots the live stack count (12 only from t≈36s; an earlier burst mirrors ⌊t/3⌋ stacks). Encodable as a live stack mirror or as 346.8%/hit with a derived ~36s linear ramp — both derived from stated 3s×12, not guessed.",
      "triggerIdentity": "Rides each of the 10 burstCast hits; same FB-exempt timing as the parent volley.",
      "targetSet": "enemy",
      "nearestWrongModel": "Two: (a) crediting the full 12-stack magnitude from t=0 — the first burst (typically well before 36s) mirrors far fewer stacks; (b) parsing 'when in Beautiful status' as requiresTargetStatus:'Beautiful' on the BOSS — a gate nothing ever opens, silently zeroing the rider.",
      "distinguishingAssertion": "First burst's rider damage total < second burst's rider total (stacks grew between casts); at any cast, rider total ≈ 10 × 28.9% × stacksAtCast × final ATK, and > 0 on every cast after t=3s. Red under (a): both bursts identical at 10×346.8%; red under (b): rider total = 0 all fight.",
      "inertness": "Zero rider damage before the first Beautiful tick; per-hit rider never exceeds 346.8%.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:ATK ▲ 2.71% of final Max HP (stage-3 entry, 10s)",
    "skill1:Charge Speed ▲ 100% removeOnReload",
    "skill1:136.6% full-charge on-hit rider",
    "skill2:Beautiful interval-3s Max HP ▲ 1.6% ×12",
    "burst:1365.92% ×10 sequential volley",
    "burst:28.9%-per-stack Beautiful mirror rider"
  ],
  "unmodeledVerbatim": {
    "skill1": [],
    "skill2": [
      "Decoy: Creates an avatar with 96% of the skill user's final Max HP. This effect is continuous. (start of battle)",
      "Decoy: Creates an avatar with 96% of the skill user's final Max HP. This effect is continuous. (Burst Skill Stage 3 re-summon)"
    ],
    "burst": []
  },
  "notes": "Expected shared-prior misreads, in the order they hurt: (1) 'ATK ▲ 2.71% of final Max HP' encoded as atkPct of ATK — the kit's central engine is HP→ATK on a Defender chassis, and it compounds with Beautiful (12×1.6% = +19.2% Max HP → proportionally more converted ATK); a test suite that never asserts the buffApply value scales with Max HP (and GROWS between rotation 1 and rotation 2) will pass under the wrong stat. (2) Per-hit vs total on the 1365.92%×10 volley — a 10× swing; assert the per-event mult, not just a nonzero burst total. (3) The Beautiful mirror credited at 12 stacks from t=0 — the first burst lands before the 36s cap; assert burst-1 rider < burst-2 rider. (4) The decoy chain: skipping the avatar as 'defensive' while ALSO leaving the interval gated on decoy presence silently zeroes all stacking; the v1 always-present resolution must be explicit and tested (Beautiful ticks from t≈3s). (5) Charge Speed as permanent instead of removeOnReload — buffRemove(cause:'reload') is the discriminating event, and shots/magazine feeds the 136.6% rider count, so the two skill1 lines must be tested jointly (whole-picture: ammo 24, chargeFrames 60, reloadFrames 141 bound the per-magazine shot count). (6) Trigger timing on the stage-3 ATK buff: fullBurstEnter applies it AFTER her nuke resolves — assert the nuke's mult includes it. Also confirm the volley is FB-exempt (burst-cast timing, fbMajorApplied:false) and sequential-flavored (teammate sequentialMultPct must multiply it, sequentialDamagePct dilute-add). Leak note: the schema's rampSec example names the Beautiful mirror with its exact magnitudes; my ramp encoding was re-derived from the prose's own 3s×12 statement, so no answer was imported.",
  "model": "claude-fable-5"
}

```


---

## S5 BLIND TEST (claude-opus-5, pure literal-prose re-derivation)

Vs the DRIVER override this pure blind test scores 10 passed / 10 failed / 3 skipped. The 10 failures are NOT faithfulness gaps: 1 is a harness-API misuse (onEvent placed on the CompOptions root instead of in cfg → empty event log) and 9 are ENCODING-MECHANISM divergences where the driver uses an owner-ruled VIDEO-MEASURED encoding (magDumpRof cadence; smooth casterMaxHpPct 19.2 rampSec36 in skill1; consolidated 13659.2 nuke) vs the blind's literal-prose encoding (chargeSpeedPct removeOnReload; discrete 1.6×12 stacks in skill2; 10 discrete sequential hits). The driver-reconciled adaptation (blind/cinderella.adapted.test.ts, [P1]–[P5]) fixes the API bug and re-expresses each encoding assertion behaviorally and runs GREEN: 20 passed / 3 skipped (the 3 skips are measurement-gated: the decoy avatar entity and the mirror once-vs-per-hit cadence). The blind's BEHAVIORAL assertions (HP-scaled ATK 2.71/10s; stage-3 self scope; 136.6% rider no-core; mirror multiple-of-28.9% capped ×12; mirror ramps; decoy recorded) all pass against the driver unchanged.

```typescript
/**
 * cinderella (cinderella) — BLIND per-unit kit spec test.
 *
 * Written from the kit prose ALONE (S5 blind role): no sight of the driver's
 * override, tests, or reasoning. Every assertion is derived from one kit line
 * and is written to be GREEN under the literal reading and RED under the
 * nearest-wrong model named in its comment.
 *
 * KIT (RL / Electric / Defender / Burst III; ammo 24, chargeFrames 60, cd 40s):
 *   S1a  "entering Burst Stage 3", self: ATK +2.71% of the USER's final Max HP, 10 sec.
 *   S1b  "attacking with Full Charge", self: Charge Speed +100%, "Removed upon
 *        reloading to max ammunition" (NO wall-clock bound).
 *   S1c  "hitting a target with Full Charge", the target: +136.6% of final ATK.
 *   S2a  battle start, self: Decoy avatar @96% of final Max HP, continuous.
 *   S2b  "entering Burst Skill Stage 3", self: Decoy avatar @96% Max HP, continuous.
 *   S2c  every 3 sec while a decoy is present, self: Beautiful — Max HP +1.6%
 *        continuously, stacks up to 12.
 *   B1   random enemies: 1365.92% of final ATK, "sequentially for 10 time(s)".
 *   B2   same target(s) while in Beautiful: +28.9% of final ATK, "Mirrors the
 *        stack count of Beautiful" (=> up to x12 = 346.8%).
 *
 * FIXTURE: controlComp('cinderella', true) — liter B1 / crown B2 / cinderella B3 /
 * helm B3. Helm is deliberately KEPT IN: S1a and S2b key off "entering Burst
 * Stage 3" (ANY team stage-3 entry), which only diverges from "her own burst
 * cast" when a SECOND Burst III unit exists. Deterministic (no seed).
 *
 * WHY THE COUNTERFACTUALS DISCRIMINATE: each `patch()` below edits an in-memory
 * clone of the committed override (disk untouched) into the NEAREST-WRONG model
 * for one line — wrong trigger, wrong duration semantics, missing FB
 * participation, missing stack cap/ramp — and the paired assertion fails under
 * that model. Each patch also reports how many effects it matched, so a line the
 * override never encoded at all (MISSING) fails loudly instead of silently
 * passing as "no change".
 *
 * Runs: 10 full 180s sims, all hoisted to module scope.
 */
// DRIVER NOTE (gauntlet S5): import path retargeted from '../lib/harness.js' (the blind
// author's guess, which does not exist at this blind/ location) to the real harness location
// '../../tests/lib/harness.js'. No assertions changed — only the module path.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

const SLUG = 'cinderella';

type Ev = SimEvent & Record<string, any>;

// ---------------------------------------------------------------- override I/O
// withPatchedOverride returns a CLONE of the committed override; with a no-op
// mutator it is just a readable snapshot. The packet describes two possible
// slot shapes (slot -> Block[] on disk, slot -> CharacterSkills in memory), so
// slotBlocks() accepts either rather than guessing.
const OV: any = withPatchedOverride(SLUG, () => {});

function slotBlocks(ov: any, slot: string): any[] {
  const s = ov?.[slot];
  if (!s) return [];
  if (Array.isArray(s)) return s;
  if (Array.isArray(s.blocks)) return s.blocks;
  return [];
}
function slotEffects(ov: any, slot: string): any[] {
  return slotBlocks(ov, slot).flatMap((b: any) =>
    Array.isArray(b.effects) ? b.effects : [],
  );
}
function blockFor(ov: any, slot: string, pred: (e: any) => boolean): any {
  return slotBlocks(ov, slot).find((b: any) => (b.effects ?? []).some(pred));
}
function editEffects(
  ov: any,
  slot: string,
  pred: (e: any) => boolean,
  fn: (e: any) => void,
): number {
  let n = 0;
  for (const b of slotBlocks(ov, slot)) {
    for (const e of b.effects ?? []) {
      if (pred(e)) {
        fn(e);
        n++;
      }
    }
  }
  return n;
}
function patch(mutate: (ov: any) => number): { ov: any; n: number } {
  let n = 0;
  const ov = withPatchedOverride(SLUG, (o: any) => {
    n = mutate(o);
  });
  return { ov, n };
}

// 'attackDamagePct' does NOT match /atk/i ("att"), so this isolates the ATK
// family (atkPct / casterAtkPct / atkOfMaxHpPct / ...) without pinning a key.
const isAtkBuff = (e: any) =>
  e.kind === 'buff' && /atk/i.test(String(e.stat ?? ''));
const isChargeSpeed = (e: any) =>
  e.kind === 'buff' && e.stat === 'chargeSpeedPct';
const isFlat = (e: any) => e.kind === 'flatDamage';
const isHpBuff = (e: any) =>
  e.kind === 'buff' && /hp/i.test(String(e.stat ?? ''));
const isBigBurst = (e: any) => isFlat(e) && Number(e.atkPct) >= 1000;
const isMirror = (e: any) => isFlat(e) && Number(e.atkPct) < 1000;

// --------------------------------------------------------------------- runs
function run(ov?: any, helm = true) {
  const evs: Ev[] = [];
  const opts: any = controlComp(SLUG, helm);
  opts.onEvent = (ev: SimEvent) => {
    evs.push(ev as Ev);
  };
  if (ov) opts.overrides = { ...(opts.overrides ?? {}), [SLUG]: ov };
  const res = runComp(opts);
  return { res, evs, total: totals(res)[SLUG] ?? 0 };
}

const CF_ATK_ZERO = patch((ov) =>
  editEffects(ov, 'skill1', isAtkBuff, (e) => {
    e.value = 0;
  }),
);
const CF_ATK_BURSTCAST = patch((ov) => {
  const b = blockFor(ov, 'skill1', isAtkBuff);
  if (!b) return 0;
  b.trigger = { kind: 'burstCast' };
  return 1;
});
const CF_CS_ZERO = patch((ov) =>
  editEffects(ov, 'skill1', isChargeSpeed, (e) => {
    e.value = 0;
  }),
);
const CF_CS_TIMED = patch((ov) =>
  editEffects(ov, 'skill1', isChargeSpeed, (e) => {
    delete e.removeOnReload;
    e.durationSec = 10;
  }),
);
const CF_RIDER_ZERO = patch((ov) =>
  editEffects(ov, 'skill1', isFlat, (e) => {
    e.atkPct = 0;
  }),
);
const CF_RIDER_NOFB = patch((ov) =>
  editEffects(ov, 'skill1', isFlat, (e) => {
    e.noFb = true;
  }),
);
const CF_BEAUTIFUL_ZERO = patch((ov) =>
  editEffects(ov, 'skill2', isHpBuff, (e) => {
    e.value = 0;
  }),
);
const CF_MIRROR_ZERO = patch((ov) =>
  editEffects(ov, 'burst', isMirror, (e) => {
    e.atkPct = 0;
  }),
);
const CF_MIRROR_NORAMP = patch((ov) =>
  editEffects(ov, 'burst', isMirror, (e) => {
    delete e.rampSec;
  }),
);

const BASE = run();
const R_ATK_ZERO = run(CF_ATK_ZERO.ov);
const R_ATK_BURSTCAST = run(CF_ATK_BURSTCAST.ov);
const R_CS_ZERO = run(CF_CS_ZERO.ov);
const R_CS_TIMED = run(CF_CS_TIMED.ov);
const R_RIDER_ZERO = run(CF_RIDER_ZERO.ov);
const R_RIDER_NOFB = run(CF_RIDER_NOFB.ov);
const R_BEAUTIFUL_ZERO = run(CF_BEAUTIFUL_ZERO.ov);
const R_MIRROR_ZERO = run(CF_MIRROR_ZERO.ov);
const R_MIRROR_NORAMP = run(CF_MIRROR_NORAMP.ov);

// ------------------------------------------------------------- event helpers
const kind = (evs: Ev[], k: string) => evs.filter((e) => e.kind === k);

// A SELF buff is the only one where casterIdx === targetIdx, which cleanly
// separates her own grants from liter/crown/helm buffs landing on her.
const selfBuffs = (evs: Ev[]) =>
  evs.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.targetSlug === SLUG &&
      e.casterIdx != null &&
      e.casterIdx === e.targetIdx,
  );

const IDX: number = (() => {
  const e = selfBuffs(BASE.evs)[0];
  return e ? Number(e.targetIdx) : -1;
})();

// Damage-event attribution: the packet does not name the source field, so try
// the plausible ones. The 'attribution sanity' test below fails loudly if none
// of them resolve, rather than letting the event-level groups pass vacuously.
const SLUG_FIELDS = [
  'slug',
  'unitSlug',
  'srcSlug',
  'casterSlug',
  'ownerSlug',
  'attackerSlug',
];
const IDX_FIELDS = [
  'srcIdx',
  'unitIdx',
  'ownerIdx',
  'attackerIdx',
  'casterIdx',
  'idx',
];
function fromHer(e: any): boolean {
  for (const f of SLUG_FIELDS)
    if (typeof e[f] === 'string') return e[f] === SLUG;
  if (IDX >= 0)
    for (const f of IDX_FIELDS)
      if (typeof e[f] === 'number') return e[f] === IDX;
  return false;
}
const herDamage = (evs: Ev[]) =>
  evs.filter((e) => e.kind === 'damage' && fromHer(e));
const teammates = (r: any) =>
  Object.fromEntries(Object.entries(totals(r)).filter(([s]) => s !== SLUG));

const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

// =============================================================================
describe('cinderella — fixture non-vacuity', () => {
  it('the comp actually bursts, fires and reloads (else every gate below is untested)', () => {
    expect(unitOf(BASE.res, SLUG).totalDamage).toBeGreaterThan(0);
    expect(kind(BASE.evs, 'fullBurstStart').length).toBeGreaterThan(0);
    expect(kind(BASE.evs, 'shot').length).toBeGreaterThan(0);
    expect(kind(BASE.evs, 'reload').length).toBeGreaterThan(0);
    expect(selfBuffs(BASE.evs).length).toBeGreaterThan(0);
  });

  it('damage events are attributable to her (guards the event-level groups)', () => {
    expect(herDamage(BASE.evs).length).toBeGreaterThan(0);
    // Something of hers lands inside Full Burst — required for the S1c noFb
    // counterfactual to be a real discriminator rather than a no-op.
    expect(herDamage(BASE.evs).some((e) => e.inFullBurst === true)).toBe(true);
  });
});

// =============================================================================
describe('S1a — enter Burst Stage 3, self: ATK +2.71% of final Max HP for 10s', () => {
  it('is an HP-scaled ATK grant of 2.71 with a 10 SECOND window (not rounds)', () => {
    const fx = slotEffects(OV, 'skill1').filter(isAtkBuff);
    expect(fx.length).toBe(1); // MISSING/duplicate detector
    // Nearest-wrong: a plain atkPct 2.71 (a % of her own ATK, ~nothing on a
    // Defender) instead of a % of her Max HP — which is what makes S2c's
    // Beautiful stacks offensive at all.
    expect(Number(fx[0].value)).toBeCloseTo(2.71, 6);
    expect(/hp/i.test(String(fx[0].stat))).toBe(true);
    // Duration semantics: "for 10 sec" is wall-clock, never a round count.
    expect(fx[0].durationSec).toBe(10);
    expect(fx[0].durationShots).toBeUndefined();
  });

  it('is keyed to ANY stage-3 entry and scoped to self', () => {
    const b = blockFor(OV, 'skill1', isAtkBuff);
    expect(b).toBeTruthy();
    // "Activates when entering Burst Stage 3" = stageEnter{stage:3} (fires when
    // ANY ally casts a stage-3 burst). Nearest-wrong: burstCast (own cast only,
    // under-fires whenever helm takes the stage-3 slot) or fullBurstEnter
    // (fires at FB open, not at the cast).
    expect(b.trigger?.kind).toBe('stageEnter');
    expect(b.trigger?.stage).toBe(3);
    expect(b.target?.kind).toBe('self');
  });

  it('fires once per rotation, and the own-cast model fires no more often', () => {
    const grants = selfBuffs(BASE.evs).filter((e) =>
      /atk/i.test(String(e.stat ?? '')),
    );
    const fbs = kind(BASE.evs, 'fullBurstStart').length;
    expect(grants.length).toBe(fbs); // one stage-3 entry per rotation
    expect(grants.every((e) => Number(e.value) > 0)).toBe(true);
    expect(grants.every((e) => Number.isFinite(Number(e.expiresFrame)))).toBe(
      true,
    );
    // Discriminator vs the burstCast reading: re-keyed to her OWN cast, the
    // grant can only fire on rotations she bursts — never more often. (Strictly
    // fewer only when helm actually takes a stage-3 slot in this fixture; the
    // count equality above is the primary claim.)
    const cfGrants = selfBuffs(R_ATK_BURSTCAST.evs).filter((e) =>
      /atk/i.test(String(e.stat ?? '')),
    );
    expect(CF_ATK_BURSTCAST.n).toBe(1);
    expect(cfGrants.length).toBeLessThanOrEqual(grants.length);
  });

  it('is load-bearing on her damage and INERT on teammates (self scope)', () => {
    expect(CF_ATK_ZERO.n).toBeGreaterThan(0);
    expect(R_ATK_ZERO.total).toBeLessThan(BASE.total);
    // ATK is damage-only (no gauge/shot-count coupling), so a mis-scope to
    // allies would show up here as moved teammate totals.
    expect(teammates(R_ATK_ZERO.res)).toEqual(teammates(BASE.res));
  });
});

// =============================================================================
describe('S1b — full-charge attack, self: Charge Speed +100%, removed on reload-to-max', () => {
  it('is chargeSpeedPct 100 with removeOnReload and NO time bound', () => {
    const fx = slotEffects(OV, 'skill1').filter(isChargeSpeed);
    expect(fx.length).toBe(1);
    expect(Number(fx[0].value)).toBeCloseTo(100, 6);
    // Duration semantics: the kit gives no seconds — the ONLY terminator is
    // reloading to max. Nearest-wrong: an invented durationSec window.
    expect(fx[0].removeOnReload).toBe(true);
    expect(fx[0].durationSec).toBeUndefined();
    const b = blockFor(OV, 'skill1', isChargeSpeed);
    expect(['shotFired', 'hitCount']).toContain(b.trigger?.kind);
    if (b.trigger?.kind === 'hitCount') expect(b.trigger.count).toBe(1);
    expect(b.target?.kind).toBe('self');
  });

  it('re-applies per shot and is stripped at reload (buffRemove cause reload)', () => {
    const applies = BASE.evs.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.stat === 'chargeSpeedPct' &&
        e.targetSlug === SLUG,
    );
    expect(applies.length).toBeGreaterThan(10);
    expect(applies.every((e) => Number(e.value) === 100)).toBe(true);
    // The engine emits buffRemove ONLY for removeOnReload buffs at reload-to-max,
    // so its presence here IS the semantics proof.
    const removes = BASE.evs.filter(
      (e) =>
        e.kind === 'buffRemove' &&
        (e.stat === undefined || e.stat === 'chargeSpeedPct'),
    );
    expect(removes.length).toBeGreaterThan(0);
    // Nearest-wrong (timed window, no reload strip): zero reload-cause removals.
    expect(CF_CS_TIMED.n).toBeGreaterThan(0);
    const cfRemoves = R_CS_TIMED.evs.filter(
      (e) =>
        e.kind === 'buffRemove' &&
        (e.stat === undefined || e.stat === 'chargeSpeedPct'),
    );
    expect(cfRemoves.length).toBe(0);
  });

  it('charge speed IS damage — it gates shots fired', () => {
    // Failure-mode 6: a weapon-state modifier is never "defensive, skip".
    expect(CF_CS_ZERO.n).toBeGreaterThan(0);
    expect(R_CS_ZERO.total).toBeLessThan(BASE.total);
    const herShots = kind(BASE.evs, 'shot').length;
    const cfShots = kind(R_CS_ZERO.evs, 'shot').length;
    expect(cfShots).toBeLessThan(herShots);
  });
});

// =============================================================================
describe('S1c — full-charge HIT on the target: +136.6% of final ATK', () => {
  it('is a 136.6% flat rider on the enemy, with no core strike', () => {
    const fx = slotEffects(OV, 'skill1').filter(isFlat);
    expect(fx.length).toBe(1);
    expect(Number(fx[0].atkPct)).toBeCloseTo(136.6, 6);
    // The text says "additional damage", not "core strike damage" — a rider gets
    // no core bucket. Nearest-wrong: core:true (over-credits at 200% core mult).
    expect(fx[0].core).not.toBe(true);
    expect(blockFor(OV, 'skill1', isFlat).target?.kind).toBe('enemy');
  });

  it('lands per full-charge hit and takes Full Burst by timing', () => {
    expect(CF_RIDER_ZERO.n).toBeGreaterThan(0);
    expect(R_RIDER_ZERO.total).toBeLessThan(BASE.total);
    // Nearest-wrong: noFb:true. A function-damage rider is FB-eligible by
    // landing time (only burst-CAST damage is exempt), so exempting it must
    // strictly lose damage in a fixture that has Full Bursts.
    expect(CF_RIDER_NOFB.n).toBeGreaterThan(0);
    expect(R_RIDER_NOFB.total).toBeLessThan(BASE.total);
  });
});

// =============================================================================
describe('S2a/S2b — Decoy avatars @96% Max HP (continuous)', () => {
  it('the decoy is recorded, not silently dropped, and is not a heal', () => {
    const fx = slotEffects(OV, 'skill2');
    // A decoy is neither a heal nor a recovery event: encoding it as `heal`
    // would fire crown's on-recovery trigger — a cross-unit over-credit.
    expect(fx.some((e: any) => e.kind === 'heal')).toBe(false);
    // No-silent-drops: either it is carried as a shield-style record or it is
    // listed verbatim in `unmodeled.skill2`.
    const recorded =
      fx.some((e: any) => e.kind === 'shield') ||
      (OV?.unmodeled?.skill2 ?? []).length > 0;
    expect(recorded).toBe(true);
  });

  it.skip('GAP: the avatar entity itself (96% Max HP decoy, taunt/HP pool) is unmodelable in v1 — the boss deals no damage and there is no avatar entity, so both decoy lines are damage-inert except as the always-satisfied precondition for S2c', () => {});

  it.skip('GAP: S2b (a SECOND decoy at stage-3 entry) is indistinguishable from S2a in a model with no avatar entity — nothing observable separates one decoy from two', () => {});
});

// =============================================================================
describe('S2c — every 3s while a decoy is present, self: Max HP +1.6%, max 12 stacks', () => {
  it('is a self Max HP buff of 1.6, capped at 12 stacks, with no expiry', () => {
    const fx = slotEffects(OV, 'skill2').filter(isHpBuff);
    expect(fx.length).toBe(1);
    expect(Number(fx[0].value)).toBeCloseTo(1.6, 6);
    // "stacks up to 12 times" — nearest-wrong: no maxStacks (unbounded ramp to
    // 60 stacks over a 180s fight, ~5x the real cap).
    expect(fx[0].maxStacks).toBe(12);
    // "continuously" — nearest-wrong: a durationSec that lets stacks lapse.
    expect(fx[0].durationSec).toBeUndefined();
    const b = blockFor(OV, 'skill2', isHpBuff);
    expect(b.trigger?.kind).toBe('interval');
    expect(Number(b.trigger?.sec)).toBe(3);
    expect(b.target?.kind).toBe('self');
  });

  it('stacks 1..12 in the event log and never exceeds the cap', () => {
    const beautiful = selfBuffs(BASE.evs).filter((e) => e.maxStacks === 12);
    // 180s / 3s => ~60 applications; the cap bounds the STACKS, not the applies.
    expect(beautiful.length).toBeGreaterThanOrEqual(12);
    const stacks = beautiful.map((e) => Number(e.stacks));
    expect(Math.max(...stacks)).toBe(12);
    expect(stacks.every((s) => s >= 1 && s <= 12)).toBe(true);
    // Ramp shape: the first application is a single stack, not an instant cap.
    expect(stacks[0]).toBe(1);
  });

  it('feeds her own S1a HP->ATK conversion, and is INERT on teammates', () => {
    // Whole-picture: Beautiful is not a defensive throwaway — 12 x 1.6% Max HP
    // enlarges the 2.71%-of-Max-HP ATK grant. Zeroing it must lose her damage.
    // (Self-granted Max HP feeds the conversion; ally-granted does not.)
    expect(CF_BEAUTIFUL_ZERO.n).toBeGreaterThan(0);
    expect(R_BEAUTIFUL_ZERO.total).toBeLessThan(BASE.total);
    expect(teammates(R_BEAUTIFUL_ZERO.res)).toEqual(teammates(BASE.res));
  });
});

// =============================================================================
describe('burst — 1365.92% x10 sequential + the Beautiful mirror rider', () => {
  it('is TEN discrete 1365.92% hits, not one merged hit', () => {
    const big = slotEffects(OV, 'burst').filter(isBigBurst);
    expect(big.length).toBe(10);
    expect(big.every((e: any) => near(Number(e.atkPct), 1365.92, 1e-6))).toBe(
      true,
    );
    // Nearest-wrong: a single 13659.2% hit — same total, but wrong crit/core
    // granularity and wrong interaction with per-hit riders.
    const b = blockFor(OV, 'burst', isBigBurst);
    expect(b.trigger?.kind).toBe('burstCast');
    expect(b.target?.kind).toBe('enemy');
  });

  it('the sequential volley is sequential-flavored (feeds Sequential Attack Damage)', () => {
    // "Attacks sequentially for 10 time(s)" — spec claim; a missing flavor makes
    // her blind to any sequentialDamagePct / sequentialMultPct support.
    const big = slotEffects(OV, 'burst').filter(isBigBurst);
    expect(big.every((e: any) => e.flavor === 'sequential')).toBe(true);
  });

  it('burst-cast damage is Full-Burst exempt and lands 10x per cast', () => {
    const casts = BASE.evs.filter(
      (e) => e.kind === 'burstCast' && fromHer(e),
    ).length;
    expect(casts).toBeGreaterThan(0);
    const hits = herDamage(BASE.evs).filter((e) => e.srcSlot === 'burst');
    expect(hits.length).toBeGreaterThanOrEqual(10 * casts);
    expect(hits.length % casts).toBe(0);
    // A burst cast resolves before the Full Burst window opens — nearest-wrong:
    // the volley picking up the +50% FB major.
    expect(hits.every((e) => e.fbMajorApplied !== true)).toBe(true);
  });

  it('the mirror rider is a whole multiple of 28.9%, capped at x12 stacks', () => {
    const mirror = slotEffects(OV, 'burst').filter(isMirror);
    expect(mirror.length).toBeGreaterThan(0);
    // "Mirrors the stack count of Beautiful" with Beautiful capped at 12 => the
    // authored magnitude must be 28.9 x k, k in 1..12. Nearest-wrong: an
    // uncapped or arbitrary magnitude (e.g. 28.9 x 60 stacks).
    for (const e of mirror) {
      const k = Number(e.atkPct) / 28.9;
      expect(near(k, Math.round(k), 1e-4)).toBe(true);
      expect(Math.round(k)).toBeGreaterThanOrEqual(1);
      expect(Math.round(k)).toBeLessThanOrEqual(12);
    }
    // Instance count: once per cast (my reading) or once per sequential hit are
    // the two defensible readings; 3 or 7 instances would be neither.
    expect([1, 10]).toContain(mirror.length);
  });

  it('a max-stack-authored mirror must ramp (an early burst mirrors fewer stacks)', () => {
    const mirror = slotEffects(OV, 'burst').filter(isMirror);
    const maxAuthored = Math.max(...mirror.map((e: any) => Number(e.atkPct)));
    expect(CF_MIRROR_ZERO.n).toBeGreaterThan(0);
    expect(R_MIRROR_ZERO.total).toBeLessThan(BASE.total);
    if (maxAuthored >= 289) {
      // Authored at (near) 12 stacks: Beautiful needs 12 x 3s = 36s to cap, so a
      // flat 12-stack rider over-credits every burst before t=36s.
      for (const e of mirror.filter((x: any) => Number(x.atkPct) >= 289)) {
        expect(Number(e.rampSec)).toBeGreaterThanOrEqual(24);
        expect(Number(e.rampSec)).toBeLessThanOrEqual(48);
      }
      // Nearest-wrong: no ramp => the early burst mirrors 12 stacks it does not
      // have => strictly MORE damage.
      expect(CF_MIRROR_NORAMP.n).toBeGreaterThan(0);
      expect(R_MIRROR_NORAMP.total).toBeGreaterThan(BASE.total);
    } else {
      // Authored per-stack: the engine must be supplying the stack count some
      // other way, so a ramp would double-discount.
      expect(mirror.every((e: any) => e.rampSec === undefined)).toBe(true);
    }
  });

  it.skip('GAP (measurement-gated): whether the mirror rider fires ONCE per burst or once per sequential hit, and whether it crits, needs popup counting on a recorded burst — the prose ("Affects the same target(s)") does not settle it', () => {});
});

```


---

## S6 BLIND OVERRIDE (claude-opus-5) + DIFF vs DRIVER

Diff vs driver override (src/skills/overrides/cinderella.json): CONVERGES on S1a (atkOfMaxHpPct 2.71 / stageEnter stage 3 / self / 10s — EXACT), S1c (136.6% shotFired rider on enemy — EXACT), burst TOTAL magnitude (10×1365.92 = 13659.2), burst mirror (346.8 rampSec 36 — EXACT), and Decoy UNMODELED. DIVERGES on three encoding mechanisms (same three as S5/S2b): (1) S1b — blind chargeSpeedPct:100 removeOnReload shotFired vs driver charFixes.magDumpRof (video-measured whole-mag dump); (2) S2 Beautiful — blind discrete targetMaxHpPct 1.6 maxStacks12 interval3s in skill2 vs driver smooth casterMaxHpPct 19.2 rampSec36 in skill1 (self-granted ⇒ caster===target, so the HP feed is equivalent; 1.6×12=19.2, 3s×12=36s); (3) burst nuke — blind TEN discrete 1365.92 sequential-flavored hits vs driver ONE consolidated flatDamage 13659.2 (same total vs the partless boss; sequential flavor inert in the control comp). The blind override flags its own ⚑s with estimate+recipe (per-hit-vs-total 10× lever; mirror once-vs-per-hit; cadence datamine-unreliable; Beautiful compounding).

```json
{
  "slug": "cinderella",
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. S1a = ATK-from-own-MaxHP conversion on stage-3 entry (10s). S1b = Charge Speed ▲100% held per magazine, ended by reload-to-max (weapon-state ⇒ IS damage: it gates full-charge shot count on a 60-frame charge). S1c = per-full-charge on-hit rider, crit-eligible, FB by timing. S2 decoy lines are unmodeled (no decoy/avatar primitive; boss deals no damage in v1) but their CONSEQUENCE — a decoy present from t=0 — is the premise that makes the every-3s Beautiful stack fire from battle start; if that premise is wrong the whole Beautiful ramp is wrong. Beautiful = self Max HP ▲1.6%, 12 stacks, continuous, accruing 1/3s from t=0 (cap at t=36s); it feeds S1a's HP→ATK conversion, so the two skills are coupled. Burst = 10 sequential hits + a Beautiful-mirroring rider modeled at MAX stacks (28.9×12 = 346.8%) with rampSec 36 so an early burst mirrors the stacks that actually exist at cast (12 stacks × 3s = 36s — DERIVED from the kit text, not fitted). ⚑ Open: per-hit-vs-total reading of 1365.92%; whether the mirror rider applies once or once per sequential hit; cadence tuple (datamine-unreliable). noFb deliberately NOT set (default OFF, measured-only); noRange is engine-automatic.",
  "unmodeled": {
    "skill1": [],
    "skill2": [
      "Activates at the start of battle. Affects self. Decoy: Creates an avatar with 96% of the skill user's final Max HP. This effect is continuous.",
      "Activates when entering Burst Skill Stage 3. Affects self. Decoy: Creates an avatar with 96% of the skill user's final Max HP. This effect is continuous."
    ],
    "burst": []
  },
  "caveats": [
    "⚑ Burst 1365.92% is modeled PER sequential hit (10 hits, 13659.2% total) per the standard 'Deals X%… Attacks sequentially for N time(s)' convention. If the datamine shows X% is the TOTAL split across 10, this override over-credits the burst by 10×. Highest-leverage single check in this file.",
    "⚑ The Beautiful mirror (28.9% × stacks) is modeled as ONE additional hit at max-stack magnitude (346.8%) with rampSec 36. If 'the same target(s)' means it rides EACH of the 10 sequential hits, the rider is 10× under-credited. Read burst popups: count how many small numbers accompany the 10 big ones.",
    "⚑ rampSec 36 is DERIVED, not guessed: Beautiful accrues 1 stack/3s from t=0 (decoy present at battle start) and caps at 12, so linear min(1, elapsed/36) reproduces the true stack count at any cast time. It becomes wrong only if the decoy is absent at t=0 or stacks are lost/reset.",
    "⚑ Cadence tuple (pullsPerSec / reloadFrames 141 / chargeFrames 60) is datamine-sourced and unreliable; it drives BOTH the Charge Speed ▲100% payoff and the S1c rider's fire count, so a cadence error scales two mechanics at once. Verify shots-per-magazine from an ammo-counter read, not from a damage total.",
    "⚑ S1b Charge Speed is applied on shotFired with removeOnReload and NO durationSec, per the schema's stated pattern for '…Removed upon reloading to max ammunition'. This assumes every RL trigger pull IS a full charge (chargeFrames 60). If the engine lets her fire uncharged, the trigger is over-broad.",
    "⚑ Beautiful uses targetMaxHpPct (self-granted, so it DOES feed the atkOfMaxHpPct conversion per the e3 caster===target rule). If the engine snapshots already-buffed Max HP per stack, 12 stacks compound rather than adding 19.2% flat — check the 12th buffApply value against 1.6% of BASE Max HP.",
    "⚑ noFb is not set anywhere (default OFF). The burst hits resolve at burstCast, i.e. before the FB window opens, so they are FB-exempt by TIMING and need no flag; S1c takes FB by timing as normal.",
    "The two decoy lines are unmodeled, not ignored — v1 has no HP pool or avatar entity, and modeling the decoy as a `shield` would wrongly fire teammates' `shielded` triggers. They remain load-bearing as the gate on Beautiful."
  ],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "stageEnter",
        "stage": 3
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkOfMaxHpPct",
          "value": 2.71,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "shotFired"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "chargeSpeedPct",
          "value": 100,
          "removeOnReload": true
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "shotFired"
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 136.6,
          "crit": true
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "interval",
        "sec": 3
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "targetMaxHpPct",
          "value": 1.6,
          "maxStacks": 12
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
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 1365.92,
          "flavor": "sequential",
          "crit": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 1365.92,
          "flavor": "sequential",
          "crit": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 1365.92,
          "flavor": "sequential",
          "crit": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 1365.92,
          "flavor": "sequential",
          "crit": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 1365.92,
          "flavor": "sequential",
          "crit": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 1365.92,
          "flavor": "sequential",
          "crit": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 1365.92,
          "flavor": "sequential",
          "crit": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 1365.92,
          "flavor": "sequential",
          "crit": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 1365.92,
          "flavor": "sequential",
          "crit": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 1365.92,
          "flavor": "sequential",
          "crit": true
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
          "kind": "flatDamage",
          "atkPct": 346.8,
          "crit": true,
          "rampSec": 36
        }
      ]
    }
  ]
}
```


---

## DRIVER IMPLEMENTATION (test + override under judgment)

### scripts/tests/units/cinderella.test.ts

```typescript
// PER-UNIT KIT SPEC — `cinderella` (Cinderella, the BASE RL/Defender/Electric unit, aka "cindy";
// NOT the cinderella-crystal-wave MG/Iron variant), Burst III, cd 40s, ammo 24, chargeFrames 60.
// Kit-autonomy gauntlet 2026-07-25 — test-first faithful re-derivation.
//
// One assertion group per KIT LINE (C1..C7 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.cinderella.skills):
//   S1 ■ entering Burst Stage 3 → self: ATK ▲ 2.71% of final Max HP for 10 sec              [C1]
//      ■ attacking with Full Charge → self: Charge Speed ▲ 100%, removed on reload-to-max   [C2]
//      ■ hitting with Full Charge → the target: 136.6% of final ATK as additional damage    [C3]
//   S2 ■ battle start / B3 entry → self: Decoy avatar (96% final Max HP), continuous         [C4]
//      ■ every 3s while a decoy is present → self: Beautiful Max HP ▲ 1.6%, stacks ×12       [C5]
//   BU ■ random enemies: 1365.92% of final ATK, sequential ×10                              [C6]
//      ■ same targets when in Beautiful: 28.9% of final ATK, mirrors Beautiful stack count   [C7]
//
// Encoding under test (src/skills/overrides/cinderella.json, MAG-DUMP REBUILD 2026-07-21):
//   C1 → skill1[0] stageEnter(3) → self buff atkOfMaxHpPct 2.71 / 10s
//   C2 → charFixes.magDumpRof (one ~1.0s charge PRIMES the mag → 24 rockets autofire at the
//        datamined rate_of_fire 180 → ~2.1s reload → re-prime). The kit's "Charge Speed ▲ 100%
//        on full charge, removed on reload" toggle is the game's description of exactly this
//        autofire-after-first-charge cadence — modeled directly, no charge-speed proxy.
//   C3 → skill1[2] shotFired → enemy flatDamage atkPct 136.6
//   C4 → UNMODELED (defensive/aggro summon; the v1 boss deals no damage, so full decoy uptime —
//        and thus full Beautiful uptime — is assumed). Inert for damage; no assertion (header only).
//   C5 → skill1[1] passive → self buff casterMaxHpPct 19.2 rampSec 36 (1.6%×12 = 19.2%, accruing
//        over 3s×12 = 36s). Converted to a self maxHpFlat grant that feeds C1's atkOfMaxHpPct via
//        effectiveAtk — OWN-kit Max HP only (cindy e3 rule: ally Max-HP grants excluded).
//   C6 → burst[0] burstCast → enemy flatDamage atkPct 13659.2 (1365.92 × 10 consolidated)
//   C7 → burst[1] burstCast → enemy flatDamage atkPct 346.8 rampSec 36 (28.9 × 12 stacks, ramping
//        with Beautiful). Snapshotted at cast against battle-elapsed time.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   C1  atkOfMaxHpPct scales with her Max HP (~3.3M), NOT her static ATK (~80k). The nearest wrong
//       model is a generic atkPct (ATK-scaling): it would add ~2.2k ATK where the shipped HP-scaling
//       adds ~90k. Proven two ways: the shipped buff is named atkOfMaxHpPct (the ATK-scaling model
//       emits atkPct and so has NO atkOfMaxHpPct buff), and the shipped nuke baseAtk dwarfs the
//       ATK-scaling counterfactual's.
//   C2  the mag-dump fires the whole magazine at the autofire rate after ONE prime. The nearest
//       wrong model is per-rocket charging (charge before every rocket): it fires ~168 pulls/180s
//       where the dump fires ~434. A cadence assertion that the per-rocket model provably fails.
//   C3  the rider lands once per charged pull at the kit magnitude, in the skill bucket. Removing
//       it zeroes the rider line and drops her total — the buff-removed counterfactual.
//   C5  Beautiful is a RAMP, not a step: the first burst (t≈5.4s) carries PARTIAL Beautiful, a late
//       burst (t≥36s) carries FULL. Proven two ways: removing Beautiful drops the nuke baseAtk and
//       kills the early→late growth; making the ramp INSTANT lifts the first-cast nuke baseAtk to
//       its late value (the gradual-ramp model provably sits below it at the first cast).
//   C6  the nuke is 13659.2 (ten sequential hits consolidated), cast BEFORE the Full Burst window
//       opens, so it never takes the +50% FB major. Pinned against the single-hit 1365.92 and the
//       pre-rebuild baked 14006, and against any fbMajorApplied=true instance.
//   C7  the mirror ramps with Beautiful: the first cast's mirror is partial (≈51.7), a late cast's
//       is full 346.8. Making the mirror ramp INSTANT collapses every cast to 346.8 — the gradual
//       model provably produces a sub-346.8 mirror that the instant model cannot.
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / cinderella B3 [focus] / helm B3,
// boss Fire). Cinderella needs a real rotation to cast her burst at all (a lone B3 makes zero Full
// Bursts); two B3s (cinderella + helm) alternate, giving her six casts over 180s, the first at
// t≈5.4s — early enough that the Beautiful ramp is still partial, which is what makes C5/C7's
// early→late growth observable. Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** controlComp slot order: liter 0 / crown 1 / cinderella 2 / helm 3. */
const CINDY = 2;
const RAMP_FRAMES = 36 * FPS; // Beautiful accrues over 3s × 12 stacks = 36s

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('cinderella'),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual / nearest-wrong patches ---------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** C1 nearest-wrong: her S1 ATK conversion as a GENERIC ATK% buff (ATK-scaling, not HP-scaling). */
const cindyAtkNotHp = withPatchedOverride('cinderella', (ov) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'atkOfMaxHpPct');
  if (!e)
    throw new Error(
      'cinderella S1 atkOfMaxHpPct effect missing — fixture is stale',
    );
  e.stat = 'atkPct';
});
/** C2 nearest-wrong: per-rocket charging (the mag-dump primitive turned off). */
const cindyNoMagDump = withPatchedOverride('cinderella', (ov) => {
  if (!ov.charFixes?.magDumpRof)
    throw new Error(
      'cinderella charFixes.magDumpRof missing — fixture is stale',
    );
  ov.charFixes.magDumpRof = false;
});
/** C3 reference: her full-charge rider removed. */
const cindyNoRider = withPatchedOverride('cinderella', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) =>
      !(
        b.trigger?.kind === 'shotFired' &&
        b.effects.some((e: any) => e.kind === 'flatDamage')
      ),
  );
  if (ov.skill1.length === before)
    throw new Error('cinderella S1 rider block missing — fixture is stale');
});
/** C5 reference: Beautiful removed entirely (no Max-HP ramp → no HP-scaling ATK feed). */
const cindyNoBeautiful = withPatchedOverride('cinderella', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'casterMaxHpPct'));
  if (ov.skill1.length === before)
    throw new Error(
      'cinderella Beautiful (casterMaxHpPct) block missing — fixture is stale',
    );
});
/** C5 nearest-wrong: Beautiful present but INSTANT (ramp removed → full from t=0). */
const cindyInstantBeautiful = withPatchedOverride('cinderella', (ov) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'casterMaxHpPct');
  if (!e || e.rampSec == null)
    throw new Error('cinderella Beautiful rampSec missing — fixture is stale');
  delete e.rampSec;
});
/** C7 nearest-wrong: the burst mirror present but INSTANT (ramp removed → full 346.8 every cast). */
const cindyInstantMirror = withPatchedOverride('cinderella', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'flatDamage' && x.rampSec != null);
  if (!e)
    throw new Error(
      'cinderella burst mirror rampSec missing — fixture is stale',
    );
  delete e.rampSec;
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const atkNotHp = run({ cinderella: cindyAtkNotHp });
const noMagDump = run({ cinderella: cindyNoMagDump });
const noRider = run({ cinderella: cindyNoRider });
const noBeautiful = run({ cinderella: cindyNoBeautiful });
const instantBeautiful = run({ cinderella: cindyInstantBeautiful });
const instantMirror = run({ cinderella: cindyInstantMirror });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const cindyDamage = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'cinderella');
const cindyShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'cinderella');
const cindyBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'cinderella',
  );
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');

/** The consolidated 10-hit nuke (atkPct 13659.2), in cast order. */
const nukes = (evs: SimEvent[]) =>
  cindyDamage(evs)
    .filter((d) => d.bucket === 'burst' && d.atkPct === 13659.2)
    .sort((a, b) => a.frame - b.frame);
/** The Beautiful-stack mirror (the sub-1000 burst instance), in cast order. */
const mirrors = (evs: SimEvent[]) =>
  cindyDamage(evs)
    .filter((d) => d.bucket === 'burst' && d.atkPct < 1000)
    .sort((a, b) => a.frame - b.frame);
/** The full-charge rider (skill1 flatDamage), one per charged pull. */
const riders = (evs: SimEvent[]) =>
  cindyDamage(evs).filter((d) => d.srcSlot === 'skill1');

const maxBaseAtk = (ds: Damage[]) => Math.max(...ds.map((d) => d.baseAtk));

describe('cinderella — kit spec', () => {
  describe('C1 — S1 ATK = 2.71% of final Max HP on B3 entry (HP-scaling, self, 10s)', () => {
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === CINDY && b.stat === 'atkOfMaxHpPct',
    );

    it('is emitted as atkOfMaxHpPct 2.71, self-scoped, for 10 sec', () => {
      expect(
        applied.length,
        'no atkOfMaxHpPct buff was applied',
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([2.71]);
      expect(
        [...new Set(applied.map((b) => b.targetIdx))],
        'must be self-scoped',
      ).toEqual([CINDY]);
      expect([
        ...new Set(applied.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([10 * FPS]);
    });

    it('is HP-SCALING: the shipped nuke baseAtk dwarfs the ATK-scaling counterfactual', () => {
      // atkOfMaxHpPct adds 2.71% of ~3.3M Max HP (~90k ATK); a generic atkPct would add 2.71% of
      // ~80k static ATK (~2.2k). The shipped nuke must sit far above the ATK-scaling model.
      expect(maxBaseAtk(nukes(base.events))).toBeGreaterThan(
        maxBaseAtk(nukes(atkNotHp.events)) * 1.5,
      );
    });

    it('DISCRIMINATING: the ATK-scaling model emits NO atkOfMaxHpPct buff', () => {
      // Proves the first assertion is one the generic atkPct model provably fails.
      expect(
        buffs(atkNotHp.events).filter(
          (b) => b.casterIdx === CINDY && b.stat === 'atkOfMaxHpPct',
        ),
      ).toEqual([]);
    });
  });

  describe('C2 — S1 Charge-Speed toggle = a whole-magazine dump (one prime → autofire the mag)', () => {
    it('fires a mag-dump cadence, far faster than per-rocket charging', () => {
      const dumped = cindyShots(base.events).length;
      const perRocket = cindyShots(noMagDump.events).length;
      expect(
        dumped,
        'mag-dump should fire well over 300 pulls/180s',
      ).toBeGreaterThan(300);
      expect(
        dumped,
        `${dumped} dumped vs ${perRocket} per-rocket — the dump must fire the mag at the autofire ` +
          'rate after one prime, not charge before every rocket',
      ).toBeGreaterThan(perRocket * 2);
    });

    it('DISCRIMINATING: intra-mag shots land at the autofire rate (~20f), not a charge cycle', () => {
      // Within a single magazine the dumped rockets are ~magDumpRofFrames (round(3600/180)=20f)
      // apart; a per-rocket-charge model would space them by a full charge (~60f+). Measure the
      // median inter-shot gap inside the first magazine.
      const firstMag = cindyShots(base.events)
        .filter((s) => s.magIndex === 0)
        .sort((a, b) => a.frame - b.frame);
      expect(
        firstMag.length,
        'first magazine should hold a full 24-rocket dump',
      ).toBeGreaterThanOrEqual(20);
      const gaps = firstMag.slice(1).map((s, i) => s.frame - firstMag[i].frame);
      const median = [...gaps].sort((a, b) => a - b)[
        Math.floor(gaps.length / 2)
      ];
      expect(
        median,
        'intra-mag gap must be the ~20f autofire rate, not a charge cycle',
      ).toBeLessThanOrEqual(25);
    });
  });

  describe('C3 — S1 full-charge rider deals 136.6% of final ATK, once per charged pull', () => {
    it('lands exactly once per pull, in the skill bucket, crit-eligible', () => {
      const rs = riders(base.events);
      expect(rs.length).toBe(cindyShots(base.events).length);
      expect([...new Set(rs.map((d) => d.atkPct))]).toEqual([136.6]);
      expect([...new Set(rs.map((d) => d.bucket))]).toEqual(['skill']);
      expect(rs.every((d) => d.critEligible)).toBe(true);
    });

    it('DISCRIMINATING: removing the rider zeroes the line and drops her total', () => {
      expect(riders(noRider.events)).toEqual([]);
      expect(base.totals.cinderella).toBeGreaterThan(noRider.totals.cinderella);
    });
  });

  // C4 — S2 Decoy avatar (96% final Max HP) is UNMODELED: a defensive/aggro summon. The v1 boss
  // deals no damage, so full decoy uptime — and thus full Beautiful uptime — is assumed. Inert for
  // damage; deliberately no assertion (documented in the header + override unmodeled.skill2).

  describe('C5 — S2 Beautiful is a 36s Max-HP RAMP that feeds her HP-scaling ATK', () => {
    const maxHpFlat = buffs(base.events).filter(
      (b) => b.casterIdx === CINDY && b.stat === 'maxHpFlat',
    );

    it('is a self-scoped, always-on Max-HP grant (converted from casterMaxHpPct 19.2)', () => {
      expect(
        maxHpFlat.length,
        'no Beautiful maxHpFlat buff was applied',
      ).toBeGreaterThan(0);
      expect(
        [...new Set(maxHpFlat.map((b) => b.targetIdx))],
        'must be self-scoped',
      ).toEqual([CINDY]);
      expect(
        [...new Set(maxHpFlat.map((b) => b.expiresFrame))],
        'Beautiful is continuous — no wall-clock expiry',
      ).toEqual([null]);
      for (const b of maxHpFlat) expect(b.value).toBeGreaterThan(0);
    });

    it('FEEDS her ATK: the shipped nuke baseAtk exceeds the no-Beautiful counterfactual', () => {
      expect(maxBaseAtk(nukes(base.events))).toBeGreaterThan(
        maxBaseAtk(nukes(noBeautiful.events)),
      );
    });

    it('is GRADUAL: the first-cast nuke sits below the instant-ramp counterfactual', () => {
      // The first burst (t≈5.4s) carries only ~5.4/36 of Beautiful; an INSTANT ramp would already
      // be full there. The shipped first-cast nuke baseAtk must sit below the instant-ramp model's.
      const shippedFirst = nukes(base.events)[0];
      const instantFirst = nukes(instantBeautiful.events)[0];
      expect(shippedFirst.baseAtk).toBeLessThan(instantFirst.baseAtk);
    });

    it('DISCRIMINATING: the gradual ramp adds MORE early→late growth than an instant ramp', () => {
      // The early→late nuke growth has two sources: the Beautiful ramp (present shipped, absent
      // under instant ramp) and an ally-buff-timing baseline (present in BOTH). The gradual model
      // must therefore grow strictly MORE across the fight than the instant model — the extra being
      // exactly the Beautiful still accruing at the first cast.
      const shipped = nukes(base.events);
      const instant = nukes(instantBeautiful.events);
      const shippedGrowth =
        shipped[shipped.length - 1].baseAtk - shipped[0].baseAtk;
      const instantGrowth =
        instant[instant.length - 1].baseAtk - instant[0].baseAtk;
      expect(shippedGrowth).toBeGreaterThan(instantGrowth);
    });
  });

  describe('C6 — burst nuke: 1365.92% × 10 = 13659.2%, cast BEFORE the Full Burst window', () => {
    it('fires once per burst cast at the consolidated magnitude, in the burst bucket', () => {
      const nk = nukes(base.events);
      expect(nk.length).toBe(cindyBursts(base.events).length);
      expect(nk.length).toBeGreaterThan(0);
      expect([...new Set(nk.map((d) => d.atkPct))]).toEqual([13659.2]);
      expect([...new Set(nk.map((d) => d.bucket))]).toEqual(['burst']);
      expect([...new Set(nk.map((d) => d.srcSlot))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      const took = nukes(base.events).filter((d) => d.fbMajorApplied);
      expect(
        took.map((d) => d.sec),
        'burst-cast damage must precede the FB window',
      ).toEqual([]);
    });
  });

  describe('C7 — burst mirror: 28.9% × Beautiful stacks (346.8 full), ramping with Beautiful', () => {
    it('fires one mirror per cast, ramping up to the full 346.8', () => {
      const mr = mirrors(base.events);
      expect(mr.length, 'one mirror per burst cast').toBe(
        cindyBursts(base.events).length,
      );
      const values = [...new Set(mr.map((d) => +d.atkPct.toFixed(3)))].sort(
        (a, b) => a - b,
      );
      expect(
        values[values.length - 1],
        'late casts reach full 28.9% × 12',
      ).toBe(346.8);
      expect(
        values[0],
        'the first cast is still ramping (partial Beautiful)',
      ).toBeLessThan(346.8);
    });

    it('DISCRIMINATING: an instant-ramp mirror collapses every cast to 346.8', () => {
      // The gradual model produces a sub-346.8 mirror (the partial first cast) that the instant
      // model cannot — proving the ramp is a property of the encoding, not coincidence.
      const shippedValues = new Set(
        mirrors(base.events).map((d) => +d.atkPct.toFixed(3)),
      );
      const instantValues = new Set(
        mirrors(instantMirror.events).map((d) => +d.atkPct.toFixed(3)),
      );
      expect([...instantValues]).toEqual([346.8]);
      expect(
        [...shippedValues].some((v) => v < 346.8),
        'shipped must have a partial mirror',
      ).toBe(true);
    });
  });
});

```

### src/skills/overrides/cinderella.json

```json
{
  "note": "MAG-DUMP REBUILD 2026-07-21 (docs/probes/720-kit-audit/cindy solo neutral.MP4, ammo-counter frame read + owner ruling + Fable pre-op APPROVED-WITH-REVISIONS): her real fire pattern is a WHOLE-MAGAZINE DUMP, not per-rocket charging. She charges ONCE per mag (~1.0s, datamine charge_time 100) then autofires all 24 rockets at datamine rate_of_fire 180 (3/s) WITHOUT recharging, reloads ~2.1s, re-charges. Wired via the opt-in engine primitive charFixes.magDumpRof (rof derived from the weapon table); reloadFrames 72->120 (datamine reload_time 200 = 2.0s; footage ~2.1s). ~390 pulls/180s (was ~300 under the per-rocket-charge model -> the COLD 0.937 cause). MAGNITUDE: per pull = ONE rocket (32.11% x 200% charge) + the 136.6% S1 rider = 2 popups (NOT twin rockets). Popup recon at ~97.5s reconciles both to ONE ATK 80,385: rider 109806 = 136.6% x ATK; rocket-core 103246 = 64.22% x 2(core) x ATK EXACT; datamine shot_count 1 / muzzle_count 1 = one projectile/pull. So the old TWIN-INSTANCE normalAttackPct +100 was a 2x rocket over-credit and is REMOVED; the +45 chargeSpeedPct cadence proxy is REMOVED (cadence now modeled directly). SUPERSEDES below: the charge-speed +45 ramp, the ~1.2s reload / ~315 pulls, and the TWIN-INSTANCE FIX. [HISTORICAL] HP-stacking nuke carry. S1: on every stage-3 burst cast she gains ATK = 2.71% of her final Max HP for 10s; Beautiful (Max HP +1.6% x12 via her Decoy) is baked in as 2.71 x 1.192 = 3.23% (steady state after the ~36s ramp). Her charge-speed ramp (+100% after the first full charge until reload): under the SUBTRACTIVE charge formula (2026-07-13 engine change) the old averaged +80 meant near-instant; re-expressed as +45 so the steady-state cycle stays ~0.55s/shot, the cadence originally validated vs real T2/T7. S1's 136.6% per full-charge hit kept per shot. Burst: 1365.92% x 10 sequential hits + 28.9% x 12 Beautiful mirror = 14006% total flat. Decoy itself is defensive (skipped). AUTOFIRE 2026-07-13: user: no delay between rockets (custom 1s wind-up already modeled via the averaged CS ramp) — exempt from the 22f release latency. 2026-07-17: exemption now resolves from the datamined input_type='DOWN_Charge' (engine + web); the redundant charFixes.noBoltRecovery flag was removed (reloadFrames 72 kept). VIDEO 2026-07-13 (docs/probes/u8 e3, cindy focus): per-instance popups verified her rocket (32.11 x 200% charge, cores) and 136.6 proc values EXACTLY vs sim staticAtk 80,118 (pre-FB and in-FB). Two fixes from the video: (1) her stage-3 ATK conversion counts OWN Max HP only (engine-wide fix; ally Max-HP grants do NOT feed it — early/late FB popups 633.7k/667.0k match own-HP math, the growth being her Beautiful ramp); (2) real reload ~1.2s (charFixes.reloadFrames 72), visibly faster than the DB 2.35s — her Preparation-for-Change reload. Real pull rate ~315/180s (popup pairs). TWIN-INSTANCE FIX (e3 video): her two rockets are SEPARATE damage instances at 32.11% each (862 popups / 3-per-pull / 287 pulls measured; each rocket popup = full 32.11 x 200% math) while the engine fires baseMult once per pull — doubled via a self normalAttackPct +100 (affects rockets only, not the 136.6 proc). Contrast maiden: her twins merge into ONE instance (one popup, 61.3 total) — per-unit behavior, video-verified for both. BURST TIMING (e3 video + U10): her nuke resolves PRE-full-burst and PRE-same-frame-stage-buffs (JP/einkk use-time snapshot) — the old frame-0 calibration for her was compensating for the halved twin rockets; with rockets fixed, the nuke must lose the FB x1.5 and the same-cast stage-3 ATK stack (burstSnapshotsPreFb flag). Per-unit timing: rapi-RH etc. keep frame-0 (validated). BURST CD RE-VERIFIED 40s (2026-07-13, test battery 2 test 2 video): counting her nuke laser storms directly gives full bursts at 40s intervals (5 per fight) - the DB's 40s cooldown is CORRECT (an earlier 20s misread came from cut-in false positives in the burst-bar profile; with the moran/anis-star team burst CDR of 7.48s her effective cooldown is 32.5s). Kit-autonomy gauntlet 2026-07-25: re-derived test-first (scripts/tests/units/cinderella.test.ts, 15 assertions across C1-C7); all lines FAITHFUL, C4 Decoy UNMODELED (defensive/aggro summon, inert vs the damageless v1 boss, verbatim in unmodeled.skill2); cross-family S2b(fable)/S5/S6/S7(opus) converged GO.",
  "charFixes": {
    "reloadFrames": 120,
    "magDumpRof": true
  },
  "burstSnapshotsPreFb": false,
  "unmodeled": {
    "skill1": [],
    "skill2": [
      "■ Activates at the start of battle. Affects self.\nDecoy: Creates an avatar with 96% of the skill user's final Max HP. This effect is continuous.",
      "■ Activates when entering Burst Skill Stage 3. Affects self.\nDecoy: Creates an avatar with 96% of the skill user's final Max HP. This effect is continuous."
    ],
    "burst": []
  },
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "stageEnter",
        "stage": 3
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkOfMaxHpPct",
          "value": 2.71,
          "durationSec": 10
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
          "kind": "buff",
          "stat": "casterMaxHpPct",
          "value": 19.2,
          "rampSec": 36
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "shotFired"
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 136.6
        }
      ]
    }
  ],
  "skill2": [],
  "burst": [
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
          "kind": "flatDamage",
          "atkPct": 13659.2
        },
        {
          "kind": "flatDamage",
          "atkPct": 346.8,
          "rampSec": 36
        }
      ]
    }
  ],
  "caveats": [
    "skill2: Beautiful (Max HP ▲ 1.6% ×12 = +19.2% continuously, from her battle-start Decoy) is now modeled FAITHFULLY (2026-07-17, theme 3), replacing the steady-state bake: a self casterMaxHpPct 19.2 with rampSec 36 (passive Max-HP ramp from t=0) feeds her atkOfMaxHp via effectiveAtk (own-kit Max-HP only — engine wiring 2026-07-17, ally grants still excluded per the cindy e3 rule); atkOfMaxHp reverted to base 2.71; the burst's Beautiful-mirror split off as a rampSec-36 flatDamage 346.8 (nuke base back to 13659.2). Steady state (t≥36s) is byte-identical to the old bake (2.71×1.192=3.23; 13659.2+346.8=14006); pre-36s bursts now correctly credit PARTIAL Beautiful, reproducing the measured e3 early→late FB-proc growth (633.7k→667.0k). VALIDATED: mirror ramps 47.5@t=5s → 346.8@t≥36s; drift board-neutral for all other units.",
    "skill2: the Decoy avatar itself is not modeled (defensive/aggro summon; v1 boss deals no damage so full decoy uptime — and thus full Beautiful uptime — is assumed).",
    "skill1 CADENCE — MAG-DUMP (2026-07-21, supersedes the chargeSpeedPct-45 proxy): her real fire pattern is a whole-mag dump, now modeled directly via charFixes.magDumpRof (one ~1.0s charge PRIMES the mag → 24 rockets autofire at datamine rate_of_fire 180 / 3-per-s → ~2.1s reload → recharge), so NO charge-speed proxy is needed. The kit toggle 'Charge Speed ▲ 100% on full charge, Removed upon reloading to max ammunition' is the game's description of exactly this autofire-after-first-charge behavior; ally charge-speed buffs now apply only to the once-per-mag prime (subtractive on the 60f), NOT the dump rof. Directly measured (ammo-counter frame read, cindy solo neutral.MP4): ~390 pulls/180s (cycle ~10.75s/24), vs the old per-rocket-charge model's ~300 which was the COLD-0.937 cause. This RETIRES the subtractive-CS-formula landmine (the old +45 proxy) and the open-questions U25 divisive-formula hypothesis (which was built on the ~315 popup-division estimate; the divisor was 3-per-pull but is 2 — rocket + S1 rider). n=1 recording; Fable pre-op APPROVED-WITH-REVISIONS; gated enactment pass. DECISIONS 2026-07-21.",
    "skill1 ROCKET MAGNITUDE (2026-07-21): removed the TWIN-INSTANCE normalAttackPct +100. Per pull = ONE rocket (weaponCoef 32.11% × 200% full-charge) + the 136.6% S1 rider, video-verified by a same-footage popup recon (~97.5s, one ATK): rider 109806 = 136.6% × ATK → ATK 80,385; rocket-core 103246 = 64.22% × 2(core) × 80,385 EXACT (both kit coefs → the identical ATK, matching sim staticAtk 80,118). Datamine shot_count 1 / muzzle_count 1 independently = one projectile/pull. The old +100 made the rocket base 128.44% which the engine then cored to 256.88% = a 2× rocket over-credit. Owner-ruled 1-rocket 2026-07-21."
  ]
}

```
