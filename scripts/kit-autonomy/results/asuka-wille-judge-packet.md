## S7 RECONCILING JUDGE PACKET — `asuka-wille` (Asuka: WILLE, MG/Attacker/Wind/Burst III)

## DRIVER SUMMARY (implementation under review — grade the ARTIFACTS below, not this prose)

Unit: Asuka: WILLE (`asuka-wille`, MG/Attacker/Wind/Burst III, ammo 300 / reloadFrames 161). DISTINCT from base `asuka` (AR/Fire). Tier 2 (scoped self-buffs, burstCast/fullBurstEnter trigger nuance, Annihilation-State status gate, Anti A.T. Field stack mirror).

GAUNTLET FIXES (all engine-supported; the S6 blind opus rebuild independently converged on the trigger/timing encodings, which the driver ADOPTED):

1. Anti A.T. Field CONSUMPTION (S2b fable + driver find): the burst finisher prose says 'Anti A.T. Field status is removed after the effect is triggered' — the debuff is consumed at Annihilation-State end (~cast+9s), so its real life is the ~9s build window, NOT the near-permanent 30-stack boss debuff the parser-baseline shipped (which over-credited the WHOLE team ~3-4x avg amp; team sum 1979M->1837M after the fix). Modeled: burst inflicts targetStatus 'Annihilation State' 9s (no SELF-status gate exists, so the mode is proxied as a boss status per the marciana/privaty requiresTargetStatus pattern); S1 proc gated requiresTargetStatus 'Annihilation State' at hitCount 10 (every 10 in-window shots, replacing the ungated hitCount-44 time-average); debuff durationSec 9 (effective=consumed, not the nominal 30s). RESIDUAL flag6: instant stack-removal is unmodelable (no remove-target-buff primitive) -> gradual 9s expiry leaves a short post-window tail.
2. S2 FB-entry Attack Damage 30.97%: fullBurstEnter + ownBurstGate:'cast' (was burstCast) — purpose-built primitive for 'entering FB after own burst'; keeps the block AT FB entry (burstCast fires pre-FB). Converged with S6.
3. Emergency Repair (heal/reload/ammo-dump): fullBurstEnd + ownBurstGate:'cast' (was burstCast) — FB end ≈ Annihilation-State end (~cast+9s, ~1s late vs the prior 9s-early). Converged with S6.
4. 'Removes 100% of ammo' NOW MODELED as consumeAmmo fraction:1 at fullBurstEnd (the engine HAS consumeAmmo — the prior 'no ammo-dump vocabulary' claim was WRONG; at fullBurstEnd it lands ~10s after the burst's instantReload 0.21 so no collision). Converged with S6.
5. heal ticks:1 -> ticks:3/intervalSec:1 (prose 'every 1s over 3s'); damage-INERT (self-targeted, asuka-wille has no recovery block; verified removing it moves no total). Converged with S6.
6. Annihilation finisher: delaySec:9 (lands at state-end inside FB -> FB-boosted, finding F2) + 198.6% (6.62x30 cap). S6 used 66.2% (10 stacks) + crit:true; both stack counts are measurement-gated (no dynamic-stack-scale primitive); driver keeps the shipped 30-cap, crit unset (conservative).

DOCUMENTED GAPS (both driver + blind agree unmodelable): MG heating-up speed -100%/3s (no wind-up primitive, flag2); instant stack-consumption (flag6); 2-target split (single v1 boss); finisher live-stack mirror (flag4/5, measurement-gated). reloadSpeedPct 'for 1 rounds' = stat clamp the engine cannot express (types.ts: explicitly NOT durationShots) -> 10.5s window proxy (flag3); S6 used durationShots:1.

S5 blind test vs driver override: 19 pass / 8 fail / 4 skip. Every KEY discrimination passes (S1b gating, S2a ownBurstGate, S2b 3-tick heal, burst -40% scoping, finisher delaySec:9 + 6.62xstacks). The 8 fails are shim/proxy divergences (3x S1a = blind RIDER471 detection over-counts 448 vs the REAL 147 = shots/50 which the driver verifies; 2x casterAtkPct = engine stores FLAT ATK in buffApply.value with the % in the key, blind filters by 46.8 value; 1x S1b debuff 30s structural = driver is MORE faithful at 9s; 1x S2b ammo-dump timing precision; 1x reloadSpeedPct durationShots-vs-durationSec). 3 field-name shims were driver-fixed exactly as the blind author invited (ov.blocks/slotOfUnit/srcOf).

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

---

## GROUND TRUTH — real kit prose + base stats (data/characters.json → characters['asuka-wille'])

```json
{
  "slug": "asuka-wille",
  "name": "Asuka: WILLE",
  "weapon": "MG",
  "burst": "III",
  "class": "Attacker",
  "element": "Wind",
  "manufacturer": "Abnormal",
  "normalAttackMultiplier": 5.47,
  "coreAttackMultiplier": 200,
  "ammo": 300,
  "reloadFrames": 161,
  "chargeFrames": 0,
  "hitsPerShot": 1,
  "burstCooldownSec": 40,
  "burstGaugePerShot": 0.05,
  "baseStats": {
    "hp": 13500,
    "atk": 600,
    "def": 75,
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
    "resourceId": 835
  },
  "skills": {
    "skill1": "■ Activates after landing 50 normal attack(s). Affects the target(s).\nDeals 471.86% of final ATK as additional damage.\n■ Activates only when in Annihilation State status. Affects self.\nAnnihilation State's additional effect:\nTarget: Affects 2 enemy unit(s) within the attack range nearest to the crosshair every 10 shot(s).\nDamage: Deals 15.62% of final ATK as damage.\nAdditional Effect: Anti A.T. Field: Damage Taken ▲ 0.83% for 30 sec, stacks up to 30 time(s).",
    "skill2": "■ Activates when entering Full Burst while in Annihilation State status. Affects self.\nAttack Damage ▲ 30.97% for 10 sec.\n■ Activates when using Annihilation. Affects self.\nEmergency Repair\nFunction: Reduces MG heating up speed and removes ammo. Fixes reload speed and continuously restores HP based on Max HP.\nEffect 1: MG heating up speed ▼ 100% for 3 sec.\nEffect 2: Removes 100% of ammo.\nEffect 3: Constantly recovers 3.77% of the skill user's final Max HP every 1 sec over 3 sec.\nEffect 4: Reload speed is fixed at a 60% increase for 1 rounds.",
    "burst": "■ Affects self.\nAnnihilation State\nFunction: Reduces the normal attack damage while increasing attack capabilities.\nEffect 1: Normal Attack Damage Multiplier ▼ 40% for 9 sec.\nEffect 2: Reloads 21% magazine(s).\nEffect 3: ATK ▲ 46.8% of the skill user's ATK for 9 sec.\nEffect 4: Attack Damage ▲ 36% for 9 sec.\n■ Affects the target(s) afflicted with Anti A.T. Field.\nAnnihilation\nFunction: After Annihilation State ends, fires powerful attacks at targets affected by Anti A.T. Field.\nDeals 6.62% of final ATK as additional damage. Mirrors the stack count of Anti A.T. Field for certain targets. Anti A.T. Field status is removed after the effect is triggered."
  }
}
```

## S2b PRE-OP REVIEW (claude-fable-5, independent test-faithfulness spec)

```json
{
  "slug": "asuka-wille",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "after landing 50 normal attack(s)",
      "disposition": "FAITHFUL",
      "scope": "counts LANDED normal-attack rounds only (MG hitsPerShot 1 → 1 count per bullet); rider damage is generic flat damage, not normal-bucket",
      "durationSemantics": "instant hit per threshold; counter is cumulative and persists across reloads/windows",
      "triggerIdentity": "hitCount count:50 (counts ROUNDS); no FB/status gate — accrues in AND out of Annihilation State",
      "targetSet": "enemy (boss)",
      "nearestWrongModel": "interval trigger with sec derived from an assumed fire rate — drifts under attackSpeed/fireRate buffs and keeps ticking through reload downtime; secondarily, noFb:true copied from another kit",
      "distinguishingAssertion": "count damage events with mult≈4.7186: total == floor(landed rounds / 50) exactly, and a long forced-reload gap (skill2 ammo dump) produces a matching proc gap; each proc has rangeApplied=false, no core, crit at sheet rate, fbMajorApplied by landing timing",
      "inertness": "proc count must NOT change when only wall-clock elapses without shots (e.g. during reloads)",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "every 10 shot(s)… 15.62% as damage",
      "disposition": "FAITHFUL",
      "scope": "extra proc damage, active ONLY while Annihilation State (her burst self-mode) is live; '2 enemy units' collapses to 1 hit on the single v1 boss",
      "durationSemantics": "per-proc instant damage inside the 9s mode window",
      "triggerIdentity": "shot-count every 10 rounds, hard-gated on the self status 'Annihilation State' (opened by HER burstCast, NOT by any team FB)",
      "targetSet": "enemy (boss); the second nearest-crosshair unit does not exist in v1",
      "nearestWrongModel": "ungated every-10-shots for the whole fight (Annihilation State gate dropped), or ×2 damage per proc 'because 2 enemy units' on the lone boss",
      "distinguishingAssertion": "zero mult≈0.1562 damage events outside [her burstCast, +9s] windows; inside a window exactly one (not two) such event per 10 rounds fired",
      "inertness": "no 15.62% events on rotations where helm bursts instead of asuka-wille; no doubling on the single boss",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Anti A.T. Field: Damage Taken ▲ 0.83%",
      "disposition": "FAITHFUL",
      "scope": "BOSS DEBUFF (damageTakenPct) — benefits the entire team's damage, not a self buff",
      "durationSemantics": "stacking debuff, 0.83% per stack, max 30, nominal 30s — but CONSUMED early by burst-Annihilation (see burst line), so its real life is ≈ the 9s window",
      "triggerIdentity": "applied per 10-shot proc (rides the 15.62% block), Annihilation-State-gated",
      "targetSet": "enemy status (boss-held: buffApply with casterIdx===null && targetIdx===null, filter by stat+value)",
      "nearestWrongModel": "encoded as a SELF Damage-Taken/attack buff on asuka-wille, or given the full 30s persistence so it keeps boosting the team long after Annihilation consumed it",
      "distinguishingAssertion": "boss-held buffApply events with value 0.83 appear only during her burst windows AND buffRemove fires at the Annihilation frame (~cast+9s); crown/liter per-hit damage between her windows is identical to a no-asuka-debuff baseline",
      "inertness": "teammates' damage outside her 9s windows must NOT move; asuka's own buff list must NOT carry a damageTakenPct entry",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "entering Full Burst while in Annihilation",
      "disposition": "FAITHFUL",
      "scope": "generic Attack Damage (Damage-Up bucket), self only",
      "durationSemantics": "durationSec 10 (outlasts the 9s mode by 1s)",
      "triggerIdentity": "fullBurstEnter GATED on Annihilation State being live — since only her own burst opens the mode, this ≈ fullBurstEnter + ownBurstGate:'cast'; it must NOT fire on FBs chained by the other B3",
      "targetSet": "self",
      "nearestWrongModel": "plain ungated fullBurstEnter — in the dual-B3 control comp (helm co-B3) it would also fire on helm's rotations, roughly doubling uptime",
      "distinguishingAssertion": "in controlComp(asuka-wille, helm=true), buffApply attackDamagePct 30.97 occurs only on FBs immediately following HER burstCast; count(30.97 applies) == count(her burst casts), strictly less than count(fullBurstStart)",
      "inertness": "no 30.97 application on helm-cast rotations",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "MG heating up speed ▼ 100% for 3 sec",
      "disposition": "UNMODELED",
      "scope": "MG heat/wind-up mechanic — the engine has no MG heating model (no heat field in the effect schema)",
      "durationSemantics": "3s, moot",
      "triggerIdentity": "on Annihilation use (cast+9s)",
      "targetSet": "self",
      "nearestWrongModel": "laundered into a fireRatePct ▲ buff to 'represent' cooling — invents cadence the kit doesn't state",
      "distinguishingAssertion": "no fireRatePct/attackSpeedPct buffApply sourced from skill2 at the Annihilation frame; shot cadence before/after is unchanged by this line",
      "inertness": "must move nothing; belongs verbatim in `unmodeled`",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "Removes 100% of ammo",
      "disposition": "FAITHFUL",
      "scope": "weapon-state effect — IS damage-relevant (gates shot count, fires lastBullet triggers when the belt hits 0)",
      "durationSemantics": "instant",
      "triggerIdentity": "on Annihilation use (~cast+9s), NOT at burst cast",
      "targetSet": "self (consumeAmmo fraction:1)",
      "nearestWrongModel": "skipped as 'defensive/no damage', or fired at burst cast t=0 instead of at state end — shifts a 161-frame reload from outside to inside the FB window",
      "distinguishingAssertion": "a reload event begins ~9s after every one of her burst casts even when the 300-round belt is far from empty; total rounds fired drops vs a patched override with the consumeAmmo removed",
      "inertness": "no forced reload on helm-cast rotations",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "recovers 3.77% … every 1 sec over 3 sec",
      "disposition": "FAITHFUL",
      "scope": "heal-over-time on SELF — offensively inert alone but TANDEM-live: crown (control-comp B2) has 'when recovery takes effect' triggers",
      "durationSemantics": "heal ticks:3, intervalSec:1",
      "triggerIdentity": "on Annihilation use (~cast+9s)",
      "targetSet": "self",
      "nearestWrongModel": "dropped as defensive (taxonomy trap #4) — silently kills crown's on-recovery consumers every asuka rotation, or encoded as ticks:1 (one recovery event instead of three)",
      "distinguishingAssertion": "exactly 3 recovery events target asuka-wille per Annihilation; withPatchedOverride removing the heal changes CROWN's unit total (her recovery-triggered buffs stop refreshing off asuka)",
      "inertness": "no recovery events to allies; no HP-scaled ATK change (heal grants no Max HP)",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Reload speed … 60% increase for 1 rounds",
      "disposition": "FAITHFUL",
      "scope": "reloadSpeedPct +60 — weapon-state, damage-relevant (shortens the forced reload from the ammo dump)",
      "durationSemantics": "'for 1 rounds' is a ROUND count → durationShots:1 (expires right after the 1st round fired post-reload), NEVER durationSec:1",
      "triggerIdentity": "on Annihilation use, same frame as the ammo removal — ordering must let the buff cover the forced reload",
      "targetSet": "self",
      "nearestWrongModel": "durationSec:1 — the buff dies mid-reload (161 frames ≈ 2.7s > 1s) and the 'fixed reload speed' never actually applies to the reload it exists for",
      "distinguishingAssertion": "the forced reload after Annihilation completes in ≈161/1.6 frames, and the buffRemove lands immediately after the FIRST post-reload round, not at +1.0s wall-clock",
      "inertness": "her natural (belt-empty) reloads elsewhere in the fight run at base 161 frames",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Normal Attack Damage Multiplier ▼ 40%",
      "disposition": "FAITHFUL",
      "scope": "scoped to the NORMAL-ATTACK multiplier only (normalAttackPct −40) — skill riders (471.86/15.62) and the Annihilation nuke are untouched",
      "durationSemantics": "durationSec 9 (defines the Annihilation State window)",
      "triggerIdentity": "burstCast (her own burst block) — NOT fullBurstEnter",
      "targetSet": "self",
      "nearestWrongModel": "generic attackDamagePct −40 — wrongly depresses every rider and the nuke, and dilutes against the co-active +36/+30.97 in the Damage-Up bucket",
      "distinguishingAssertion": "during the window per-shot normal-bucket mult scales ×0.6 while a 471.86% rider landing inside the same window keeps its full mult; the −40 never appears in the Damage-Up bucket sum",
      "inertness": "rider/nuke event mults unchanged by this line",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Reloads 21% magazine(s)",
      "disposition": "FAITHFUL",
      "scope": "instantReload fraction:0.21 — instant top-up, no reload animation/downtime",
      "durationSemantics": "instant at cast",
      "triggerIdentity": "burstCast",
      "targetSet": "self",
      "nearestWrongModel": "full instant reload (fraction 1), or misread as fillGauge 21%",
      "distinguishingAssertion": "ammo rises by exactly 63 rounds (21% of 300, capped at max) at the cast frame with NO reload event emitted and zero firing gap",
      "inertness": "burst gauge must not move from this line",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "ATK ▲ 46.8% of the skill user's ATK",
      "disposition": "FAITHFUL",
      "scope": "'of the skill user's ATK' = flat add of caster static ATK (casterAtkPct), self-target",
      "durationSemantics": "durationSec 9",
      "triggerIdentity": "burstCast",
      "targetSet": "self",
      "nearestWrongModel": "plain atkPct 46.8 — multiplies her live buffed ATK, compounding with liter/crown ATK buffs and over-crediting the whole window",
      "distinguishingAssertion": "buffApply stat casterAtkPct value 46.8; her effectiveAtk delta at apply equals 0.468×staticAtk and does NOT grow when other ATK% buffs are co-active",
      "inertness": "delta invariant to teammates' concurrent ATK buffs",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Attack Damage ▲ 36% for 9 sec",
      "disposition": "FAITHFUL",
      "scope": "Damage-Up bucket, ADDITIVE with skill2's 30.97 when co-active (diluted), never multiplicative",
      "durationSemantics": "durationSec 9",
      "triggerIdentity": "burstCast",
      "targetSet": "self",
      "nearestWrongModel": "own multiplicative bucket → 1.36×1.3097 instead of 1+(0.36+0.3097) during the overlap",
      "distinguishingAssertion": "a damage event inside the overlap shows the combined Damage-Up factor ≈1.6697 (plus other bucket members), not ≈1.7812",
      "inertness": "no effect on teammates",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Deals 6.62% … Mirrors the stack count",
      "disposition": "FAITHFUL",
      "scope": "Annihilation nuke: fires AFTER Annihilation State ends (~cast+9s) at the Anti-A.T.-Field-afflicted boss; total ≈ 6.62% × LIVE stack count at that frame; then removes the status",
      "durationSemantics": "one delayed release per burst; stack mirror is the ACCRUED count, not the 30 cap",
      "triggerIdentity": "state-end timing (delaySec≈9 from burstCast, or an equivalent state-end hook), gated on the boss carrying Anti A.T. Field; snapshots buffs/FB at LANDING (lands after her 10s FB window logic — verify fbMajorApplied by timing, not assumption)",
      "targetSet": "enemy (boss)",
      "nearestWrongModel": "three-headed: (a) fixed 6.62×30 every burst regardless of stacks actually built; (b) fired instantly at cast t=0; (c) Anti A.T. Field NOT consumed, leaving the team debuff live for its full 30s",
      "distinguishingAssertion": "nuke damage event lands ~9s post-cast with mult == 0.0662 × (count of live 0.83 boss stacks at that frame — fewer than 30 if the window produced <300 shots), and boss buffRemove events for all Anti A.T. Field stacks occur at the same frame",
      "inertness": "no residual damageTakenPct on the boss after the nuke; no nuke on rotations without accrued stacks",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:hitCount-50 471.86% rider",
    "skill1:every-10-shots 15.62% (Annihilation-State-gated)",
    "skill1:Anti A.T. Field damageTakenPct boss debuff",
    "skill2:FB-enter attackDamagePct 30.97 (mode-gated ≈ ownBurstGate cast)",
    "skill2:consumeAmmo 100% at Annihilation",
    "skill2:heal 3.77%×3 (crown recovery tandem)",
    "skill2:reloadSpeedPct 60 durationShots:1",
    "burst:normalAttackPct -40 (9s window)",
    "burst:instantReload 0.21",
    "burst:casterAtkPct 46.8",
    "burst:attackDamagePct 36",
    "burst:Annihilation nuke 6.62%×stacks + status consumption"
  ],
  "unmodeledVerbatim": {
    "skill1": [],
    "skill2": ["Effect 1: MG heating up speed ▼ 100% for 3 sec."],
    "burst": []
  },
  "notes": "Expected shared-prior misreads, in descending danger: (1) skill2's 30.97 keyed to plain fullBurstEnter — the control comp runs helm as co-B3, so an ungated encoding roughly doubles its uptime; the Annihilation-State gate makes it fire only on her own rotations. (2) Anti A.T. Field treated as a 30s boss debuff — the burst's Annihilation explicitly consumes it, so its effective life is only the ~9s build window; a 30s persistence over-credits the WHOLE TEAM between rotations (assert teammates' inter-window damage against a baseline). (3) 'for 1 rounds' on the reload-speed fix encoded as durationSec:1 — the buff must survive the whole 161-frame forced reload and die after the first post-reload round. (4) The ammo dump + heal skipped as 'defensive': the dump forces a reload (shot economy + lastBullet) and the heal drives crown's on-recovery triggers. (5) Normal Attack Damage Multiplier ▼40% encoded as generic damage-down, wrongly hitting riders/nuke. (6) The nuke modeled at a fixed 30 stacks instead of mirroring live accrued stacks — whether 30 is even reachable depends on rounds fired in 9s (300 rounds needed at 10 shots/stack), which is cadence-dependent; the assertion must read the live stack count, not assume cap. (7) The 15.62% proc doubled on the single boss because the prose says 2 enemy units. Timing subtlety to reconcile: the nuke lands ~9s after cast — near the FB-window boundary — so fbMajorApplied must be asserted by observed landing timing, not assumed either way. All magnitudes are kit-literal (DATAMINED); the only ALWAYS-⚑ field in play is MG cadence (pulls/sec), which this spec deliberately never numerically assumes.",
  "model": "claude-fable-5"
}
```

## S5 BLIND POST-OP TEST (claude-opus-5, written from prose alone) — materialized to blind/asuka-wille.test.ts

S5 spec (per-line):

```json
{
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "after landing 50 normal atk -> 471.86%",
      "disposition": "FAITHFUL",
      "assertion": "Removed-timestamp diff shows procs ~= landedShots/50 and doubling trigger.count halves them; RED under an interval/shotFired key (count is ignored -> ratio 1.0) and under a wrong threshold. Also asserts it procs OUTSIDE Annihilation State (ungated by the kit text) and moves no ally damage."
    },
    {
      "slot": "skill1",
      "kitLine": "Annihilation State only: every 10 shot(s)",
      "disposition": "FIX",
      "assertion": "Every 15.62% proc timestamp must lie inside [herCast, herCast+9]; RED under an ungated passive every-10-shots block and under an fbGate:'inFb' proxy (which also fires during helm-led Full Bursts she did not open). Cadence check pins shots-per-proc to 7-14, RED under per-shot or per-second keys."
    },
    {
      "slot": "skill1",
      "kitLine": "Deals 15.62% of final ATK",
      "disposition": "FAITHFUL",
      "assertion": "Deleting it drops her damage but leaves ally totals within 0.1% — proves it is her own damage channel, not a team effect."
    },
    {
      "slot": "skill1",
      "kitLine": "Anti A.T. Field: Damage Taken +0.83%",
      "disposition": "FAITHFUL",
      "assertion": "buffApply(damageTakenPct, 0.83) must be boss-held (targetIdx not her slot) and deleting it must drop ALLY damage >0.5% — RED under the classic mis-encoding as a self attackDamagePct (allies unmoved). Structural: per-stack 0.83 (not 0.83x30 folded), durationSec 30, maxStacks 30. Applications confined to Annihilation windows."
    },
    {
      "slot": "skill1",
      "kitLine": "Affects 2 enemy unit(s) near crosshair",
      "disposition": "GAP",
      "assertion": "it.skip — single-enemy v1 boss gives the 2-target clause no observable; 15.62x1 vs 31.24x1 is not discriminable in this fixture."
    },
    {
      "slot": "skill2",
      "kitLine": "FB enter while in Annihilation State",
      "disposition": "FIX",
      "assertion": "Apply count must equal her own burst casts and every application must sit inside her Annihilation window; the counterfactual that strips ownBurstGate and re-keys to plain fullBurstEnter must produce STRICTLY MORE applications and more damage — so the faithful model is GREEN and the over-crediting team-FB key is RED. Fixture guarantees FB starts > her casts."
    },
    {
      "slot": "skill2",
      "kitLine": "Attack Damage +30.97% for 10 sec",
      "disposition": "FAITHFUL",
      "assertion": "Structural durationSec 10 (not the burst's 9) + target self; runtime targetIdx === her slot for every application, and buffRemove within 10.5 s of its apply. RED under a team-scoped or 9 s encoding."
    },
    {
      "slot": "skill2",
      "kitLine": "Removes 100% of ammo",
      "disposition": "FAITHFUL",
      "assertion": "Reload-timestamp diff (base vs consumeAmmo deleted) must place every forced reload 6-12 s after her cast, plus no reload at all in the first second of her window — RED under the high-stakes nearest-wrong of keying Emergency Repair to burstCast, which would dump a 300-round belt at the START of her buffed window."
    },
    {
      "slot": "skill2",
      "kitLine": "Reload speed fixed at +60% for 1 round",
      "disposition": "FAITHFUL",
      "assertion": "Structural durationShots===1 with durationSec undefined — RED under the duration-semantics error of writing durationSec:1 (a round count spans the reload; one second does not). Behavioural: her shot count strictly exceeds the run with the buff deleted."
    },
    {
      "slot": "skill2",
      "kitLine": "Recovers 3.77% Max HP every 1s / 3s",
      "disposition": "FAITHFUL",
      "assertion": "Structural heal ticks===3, intervalSec===1, self — a single-tick heal would under-refresh crown's on-recovery consumer. One-sided behavioural check: deleting it can never raise team damage, and must not move her own damage."
    },
    {
      "slot": "skill2",
      "kitLine": "MG heating up speed -100% for 3 sec",
      "disposition": "GAP",
      "assertion": "it.skip — no heat/overheat primitive exists in the effect schema, so the line has no representable payload; belongs in `unmodeled`."
    },
    {
      "slot": "burst",
      "kitLine": "Normal Atk Dmg Multiplier -40% / 9s",
      "disposition": "FAITHFUL",
      "assertion": "Scope test: deleting it must lift her in-window NORMAL hits (ratio <0.92) while leaving the 471.86% rider amounts at those same timestamps unchanged (0.98-1.02) — RED under the nearest-wrong attackDamagePct:-40, which would shrink riders too. Structural: value negative (sign-flip guard), durationSec 9."
    },
    {
      "slot": "burst",
      "kitLine": "ATK +46.8% of skill user's ATK / 9s",
      "disposition": "FAITHFUL",
      "assertion": "Structural stat must be casterAtkPct (\"of the skill user's ATK\"), durationSec 9, target self; runtime apply count === her casts and targetIdx === her slot (no ally leakage). Numerically identical to atkPct on a self target, so the stat-key check is the only discriminator — flagged as such."
    },
    {
      "slot": "burst",
      "kitLine": "Attack Damage +36% for 9 sec",
      "disposition": "FAITHFUL",
      "assertion": "Structural durationSec 9 + self; apply count === her casts, strictly fewer than fullBurstStart count — RED if keyed to fullBurstEnter (over-fires on helm-led rotations) or given the 10 s duration of the S2a buff."
    },
    {
      "slot": "burst",
      "kitLine": "Reloads 21% magazine(s)",
      "disposition": "FAITHFUL",
      "assertion": "Structural instantReload fraction ~0.21 — RED under a full-belt refill (fraction 1 / omitted), which would hand her 300 rounds instead of 63."
    },
    {
      "slot": "burst",
      "kitLine": "Annihilation: 6.62% after State ends",
      "disposition": "FIX",
      "assertion": "Removed-timestamp diff must place the hit 7.5-11 s after each of her casts — RED under an instant burst-cast hit (delaySec 0), which would also wrongly collect the in-window buffs/FB major."
    },
    {
      "slot": "burst",
      "kitLine": "Mirrors the stack count of the Field",
      "disposition": "MEASUREMENT-GATED",
      "assertion": "Structural: the shipped atkPct must be a near-integer multiple of 6.62 with k in (1.5, 30] — RED under a bare 6.62% (k=1), which under-credits by up to 30x. The exact k is a derived flag (depends on her real in-window shot cadence, a datamine-unreliable field)."
    },
    {
      "slot": "burst",
      "kitLine": "Field removed after effect triggers",
      "disposition": "GAP",
      "assertion": "it.skip — no consume-stacks primitive; a damageTakenPct buff can only expire on its own 30 s clock, so stacks carry into the next rotation and over-credit both the team debuff and any stack-derived constant."
    }
  ],
  "gaps": [
    "S2b Effect 1 'MG heating up speed -100% for 3 sec' — it.skip: no heat/overheat primitive in the effect schema; the line has no representable payload and belongs in `unmodeled`.",
    "S1b 'Affects 2 enemy unit(s) within the attack range nearest to the crosshair' — it.skip: the v1 boss is a single enemy, so a 2-target split has no observable and 15.62x1 vs 31.24x1 cannot be discriminated here.",
    "burst-b 'Anti A.T. Field status is removed after the effect is triggered' — it.skip: no consume-stacks effect exists; a damageTakenPct buff can only expire on its own 30 s clock, so stacks survive Annihilation and carry across rotations, over-crediting both the team debuff and any stack-derived Annihilation constant.",
    "burst-b stack count mirrored by Annihilation — it.skip (MEASUREMENT-GATED): the multiple k depends on her true in-window shot cadence (the datamined MG rate_of_fire is a known-unreliable field, so the cadence tuple is an ALWAYS-flag quantity) and on whether stacks persist between rotations. The test only bounds k to (1.5, 30]; the exact value must be pinned from footage.",
    "'Reload speed is FIXED at a 60% increase' — the engine's reloadSpeedPct has no 'fixed/override' semantics (it stacks additively with other reload buffs). Modelled as a plain +60 with durationShots 1; the fixed-value nuance is unrepresentable and is flagged rather than asserted.",
    "'Annihilation State' has no first-class self-status gate in the schema (no requiresOwnBuff). The test asserts the OBSERVABLE consequence (procs confined to [herCast, herCast+9]) rather than any particular encoding, so a resourceGate, an ownBurstGate+fbGate pair, or a burst-slot placement all pass if — and only if — the timing is right.",
    "Harness field names beyond the documented event kinds were not visible to me; timestamp/slot/amount access goes through tOf/srcOf/dmgOf shims and the patched-override wiring assumes `opts.overrides[slug]`. If the harness spells these differently the shims need a one-line fix — the assertions themselves are unaffected. Runner assumed to be vitest.",
    "I had no tool access in this run, so scripts/kit-autonomy/blind/asuka-wille.test.ts and .test-spec.json were NOT written to disk — the orchestrator should persist `testSource` and this JSON to those paths."
  ],
  "fixtures": "controlComp('asuka-wille', true) only — liter B1 / crown B2 / asuka-wille B3 / helm B3, boss Fire, deterministic (no seed). helm is kept ON on purpose: a SECOND Burst III is the only thing that makes fullBurstStart count exceed her own burst-cast count, which is what turns every own-burst gate (S1b Annihilation-State gating, S2a's 'while in Annihilation State', burst-b's timing) into a discriminating test instead of a vacuous one; a fixture non-vacuity `it` asserts that precondition explicitly. Crown (B2) is the on-recovery consumer that makes S2b's heal cross-unit rather than inert. Wind vs the Fire boss carries no elemental advantage, so there is no x1.10 confound. 11 hoisted runs (1 base + 10 counterfactuals), all built with withPatchedOverride so the committed JSON is untouched; nothing is written to src/skills/overrides/ and validate-overrides is not run."
}
```

S5 test source (shim-fixed by driver per blind author invitation; runs 19 pass / 8 fail / 4 skip vs the driver override):

```typescript
/**
 * asuka-wille — Asuka: WILLE. MG / Wind / Attacker / Burst III. cd 40s, ammo 300,
 * reloadFrames 161, normalAttackMultiplier 5.47, coreAttackMultiplier 200.
 *
 * BLIND spec test: written from the kit prose ALONE (no sight of the committed override, the
 * driver's tests, or any truth file). One assertion group per kit line.
 *
 * KIT (structural summary — what each line literally says):
 *   S1a  "after landing 50 normal attack(s)", at the target -> 471.86% of final ATK.
 *   S1b  gated on Annihilation State (a SELF status opened by her own burst, 9 s): every 10
 *        shot(s), 2 nearest enemies take 15.62% of final ATK and gain "Anti A.T. Field" =
 *        Damage Taken +0.83% for 30 s, stacks up to 30.
 *   S2a  "entering Full Burst WHILE in Annihilation State", self -> Attack Damage +30.97% / 10 s.
 *   S2b  "when using Annihilation" (Annihilation fires AFTER Annihilation State ends, i.e. cast
 *        +9 s), self -> Emergency Repair: MG heat-up speed -100% / 3 s; removes 100% of ammo;
 *        recovers 3.77% max HP every 1 s over 3 s; reload speed fixed at +60% for 1 ROUND.
 *   Bu-a burst cast, self, 9 s: normal-attack damage multiplier -40%; reloads 21% magazine;
 *        ATK +46.8% of the skill user's ATK; Attack Damage +36%.
 *   Bu-b "Annihilation": after Annihilation State ends, hits every Anti A.T. Field target for
 *        6.62% of final ATK, MIRRORING the stack count; the status is removed afterwards.
 *
 * FIXTURE  controlComp('asuka-wille', true) = liter B1 / crown B2 / asuka-wille B3 / helm B3,
 *   boss Fire. Wind carries NO elemental advantage vs Fire, so there is no x1.10 confound. helm
 *   is kept ON deliberately: a SECOND Burst III is the only thing that makes the own-burst gates
 *   (S1b / S2a / Bu-b) distinguishable from a plain team full-burst-enter key. Crown (B2) is the
 *   on-recovery consumer that makes S2b's heal cross-unit rather than offensively inert.
 *
 * WHY THESE ASSERTIONS DISCRIMINATE
 *   Counterfactuals DELETE an effect (withPatchedOverride, committed JSON untouched) and diff the
 *   MULTISET OF HER DAMAGE-EVENT TIMESTAMPS against the base run. Damage never feeds back into
 *   timing in this sim, so the removed timestamps ARE that kit line's proc times — cadence,
 *   gating and trigger identity become directly assertable instead of inferred from a total.
 *   Every group also pins what the line must NOT move (teammates / riders / wrong bucket).
 *
 * DEFENSIVE SHIMS: authored blind to harness field names beyond the documented event kinds, so
 * timestamp / slot / amount access goes through tOf, srcOf, dmgOf. If the harness spells them
 * differently, fix the shim — not the assertions. Test runner assumed to be vitest, matching the
 * exemplar's `describe/it/expect` shape.
 */
import { describe, it, expect } from 'vitest';
import {
  controlComp,
  runComp,
  unitOf,
  withPatchedOverride,
} from '../lib/harness';

const SLUG = 'asuka-wille';

// ---------------------------------------------------------------- shims
type Ev = any;
const tOf = (ev: Ev): number =>
  ev.t ?? ev.timeSec ?? ev.time ?? (ev.frame != null ? ev.frame / 60 : NaN);
const srcOf = (ev: Ev): number =>
  ev.srcSlot ?? ev.casterIdx ?? ev.slot ?? ev.unitIdx;
const dmgOf = (ev: Ev): number => ev.amount ?? ev.damage ?? 0;
const r3 = (x: number) => Math.round(x * 1000) / 1000;
const near = (a: number, b: number, tol = 0.02) => Math.abs(a - b) <= tol;

// ------------------------------------------------- override introspection
const OV: any = withPatchedOverride(SLUG, () => {});

function allEffects(ov: any): Array<{ e: any; b: any }> {
  const out: Array<{ e: any; b: any }> = [];
  for (const b of ov.blocks ?? []) {
    for (const e of b.effects ?? []) {
      out.push({ e, b });
      if (e.kind === 'escalating')
        for (const s of e.steps ?? []) out.push({ e: s, b });
    }
  }
  return out;
}

function findEffects(ov: any, pred: (e: any, b: any) => boolean) {
  return allEffects(ov).filter(({ e, b }) => pred(e, b));
}

/** Delete every effect matching `pred`; throws a MISSING error naming the kit line if none. */
function dropEffects(
  ov: any,
  label: string,
  pred: (e: any, b: any) => boolean
): number {
  let n = 0;
  for (const b of ov.blocks ?? []) {
    const before = (b.effects ?? []).length;
    b.effects = (b.effects ?? []).filter((e: any) => !pred(e, b));
    n += before - b.effects.length;
  }
  if (!n) throw new Error(`MISSING kit line in override: ${label}`);
  ov.blocks = (ov.blocks ?? []).filter(
    (b: any) => (b.effects?.length ?? 0) > 0
  );
  return n;
}

const isDamageEffect = (e: any) =>
  e.kind === 'flatDamage' || e.kind === 'dot' || e.kind === 'storedHit';

// 6.62% x N stacks — the driver can only ship a DERIVED constant (no stack-mirroring primitive),
// so match any near-integer multiple of 6.62 in [1,30] that is not one of the other two riders.
const isAnnihilationHit = (e: any) => {
  if (!isDamageEffect(e)) return false;
  const k = e.atkPct / 6.62;
  return (
    k >= 0.9 &&
    k <= 30.5 &&
    Math.abs(k - Math.round(k)) < 0.06 &&
    !near(e.atkPct, 471.86, 0.5) &&
    !near(e.atkPct, 15.62, 0.05) &&
    !near(e.atkPct, 31.24, 0.05)
  );
};

// ---------------------------------------------------------------- runner
function runWith(patch?: (o: any) => void, helm = true) {
  const events: Ev[] = [];
  const base: any = controlComp(SLUG, helm);
  const opts: any = {
    ...base,
    cfg: { ...(base.cfg ?? {}), onEvent: (ev: Ev) => events.push(ev) },
  };
  if (patch)
    opts.overrides = {
      ...(base.overrides ?? {}),
      [SLUG]: withPatchedOverride(SLUG, patch),
    };
  const res: any = runComp(opts);
  return { res, events };
}

// ------------------------------------------------- HOISTED RUNS (11 sims)
const BASE = runWith();
const NO_R471 = runWith((o) =>
  dropEffects(
    o,
    'S1a 471.86% 50-hit rider',
    (e) => isDamageEffect(e) && near(e.atkPct, 471.86, 0.5)
  )
);
const HITCOUNT_100 = runWith((o) => {
  const b = (o.blocks ?? []).find(
    (b: any) => b.trigger?.kind === 'hitCount' && b.trigger.count === 50
  );
  if (!b)
    throw new Error(
      'MISSING: skill1 hitCount(50) trigger for the 471.86% rider'
    );
  b.trigger.count = 100;
});
const NO_R1562 = runWith((o) =>
  dropEffects(
    o,
    'S1b 15.62% every-10-shots rider',
    (e) =>
      isDamageEffect(e) &&
      (near(e.atkPct, 15.62, 0.05) || near(e.atkPct, 31.24, 0.05))
  )
);
const NO_DEBUFF = runWith((o) =>
  dropEffects(
    o,
    'S1b Anti A.T. Field Damage Taken +0.83%',
    (e) => e.kind === 'buff' && e.stat === 'damageTakenPct'
  )
);
const S2A_UNGATED = runWith((o) => {
  const bs = (o.blocks ?? []).filter((b: any) =>
    (b.effects ?? []).some(
      (e: any) =>
        e.kind === 'buff' &&
        e.stat === 'attackDamagePct' &&
        near(e.value, 30.97, 0.1)
    )
  );
  if (!bs.length)
    throw new Error('MISSING: skill2 Attack Damage +30.97% block');
  for (const b of bs) {
    delete b.ownBurstGate;
    b.trigger = { kind: 'fullBurstEnter' };
  } // nearest-wrong
});
const NO_AMMO_DUMP = runWith((o) =>
  dropEffects(o, 'S2b removes 100% of ammo', (e) => e.kind === 'consumeAmmo')
);
const NO_RELOAD_BUFF = runWith((o) =>
  dropEffects(
    o,
    'S2b reload speed fixed +60% for 1 round',
    (e) => e.kind === 'buff' && e.stat === 'reloadSpeedPct'
  )
);
const NO_NERF = runWith((o) =>
  dropEffects(
    o,
    'burst normal-attack multiplier -40%',
    (e) => e.kind === 'buff' && e.stat === 'normalAttackPct'
  )
);
const NO_ANNIHILATION = runWith((o) =>
  dropEffects(o, 'burst Annihilation 6.62% x stacks', isAnnihilationHit)
);
const NO_HEAL = runWith((o) =>
  dropEffects(o, 'S2b 3.77% max HP heal x3', (e) => e.kind === 'heal')
);

// ---------------------------------------------------------------- derived
function slotOfUnit(res: any): number {
  const u: any = unitOf(res, SLUG);
  const idx = u?.idx ?? u?.slot ?? u?.index ?? u?.slotIdx;
  if (idx == null) throw new Error(`cannot resolve slot index for ${SLUG}`);
  return idx;
}
const SLOT = slotOfUnit(BASE.res);

const herDamage = (evts: Ev[]) =>
  evts.filter((e) => e.kind === 'damage' && srcOf(e) === SLOT);
const herDamageTimes = (evts: Ev[]) => herDamage(evts).map((e) => r3(tOf(e)));
const herShots = (evts: Ev[]) =>
  evts.filter((e) => e.kind === 'shot' && srcOf(e) === SLOT);
const herTotal = (evts: Ev[]) =>
  herDamage(evts).reduce((s, e) => s + dmgOf(e), 0);
const teamTotal = (evts: Ev[]) =>
  evts.filter((e) => e.kind === 'damage').reduce((s, e) => s + dmgOf(e), 0);
const allyTotal = (evts: Ev[]) =>
  evts
    .filter((e) => e.kind === 'damage' && srcOf(e) !== SLOT)
    .reduce((s, e) => s + dmgOf(e), 0);

/** multiset difference a \\ b — the timestamps present in the base run and absent once dropped. */
function removedTimes(a: number[], b: number[]): number[] {
  const bag = new Map<number, number>();
  for (const t of b) bag.set(t, (bag.get(t) ?? 0) + 1);
  const out: number[] = [];
  for (const t of a) {
    const c = bag.get(t) ?? 0;
    if (c > 0) bag.set(t, c - 1);
    else out.push(t);
  }
  return out;
}

const HER_CASTS = BASE.events
  .filter((e) => e.kind === 'burstCast' && srcOf(e) === SLOT)
  .map(tOf);
const FB_STARTS = BASE.events
  .filter((e) => e.kind === 'fullBurstStart')
  .map(tOf);
/** Annihilation State = 9 s from HER burst cast (quarter-second slack for cast/frame alignment). */
const inAnnihState = (t: number) =>
  HER_CASTS.some((c) => t >= c - 0.25 && t <= c + 9.25);

const RIDER471_TIMES = removedTimes(
  herDamageTimes(BASE.events),
  herDamageTimes(NO_R471.events)
);
const RIDER1562_TIMES = removedTimes(
  herDamageTimes(BASE.events),
  herDamageTimes(NO_R1562.events)
);
const ANNIH_TIMES = removedTimes(
  herDamageTimes(BASE.events),
  herDamageTimes(NO_ANNIHILATION.events)
);

// buffApply/buffRemove selectors. Boss-held debuffs come through with casterIdx===null AND
// targetIdx===null, so they are filtered by stat+value, never by slot.
const buffApplies = (evts: Ev[], stat: string, value?: number, tol = 0.05) =>
  evts.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.stat === stat &&
      (value == null || near(e.value, value, tol))
  );
const buffRemoves = (evts: Ev[], stat: string, value?: number, tol = 0.05) =>
  evts.filter(
    (e) =>
      e.kind === 'buffRemove' &&
      e.stat === stat &&
      (value == null || near(e.value, value, tol))
  );

// =============================================================== FIXTURE
describe('asuka-wille — fixture is non-vacuous', () => {
  it('she bursts at least twice and fires', () => {
    expect(HER_CASTS.length).toBeGreaterThanOrEqual(2);
    expect(herShots(BASE.events).length).toBeGreaterThan(100);
  });

  it('the team enters Full Burst on rotations she does NOT cast (own-burst gates are testable)', () => {
    // helm is the second Burst III. If this fails, every own-burst-gate assertion below is
    // vacuous and the fixture — not the override — is what needs fixing.
    expect(FB_STARTS.length).toBeGreaterThan(HER_CASTS.length);
  });
});

// =============================================================== SKILL 1a
describe('S1a — "after landing 50 normal attack(s)": 471.86% of final ATK at the target', () => {
  it('fires on a 50-HIT counter, not on a clock or every shot', () => {
    const shots = herShots(BASE.events).length;
    expect(RIDER471_TIMES.length).toBeGreaterThan(0);
    // hitCount counts ROUNDS; MG hitsPerShot = 1, so procs ~= landedShots/50.
    expect(RIDER471_TIMES.length).toBeLessThanOrEqual(
      Math.ceil(shots / 50) + 2
    );
    expect(RIDER471_TIMES.length).toBeGreaterThanOrEqual(
      Math.floor(shots / 50) * 0.7
    );
  });

  it('doubling the threshold halves the proc count (RED under an interval / shotFired key)', () => {
    const at100 = removedTimes(
      herDamageTimes(HITCOUNT_100.events),
      herDamageTimes(NO_R471.events)
    ).length;
    // An `interval` or `shotFired` trigger ignores `count` entirely -> ratio 1.0 -> RED.
    const ratio = at100 / RIDER471_TIMES.length;
    expect(ratio).toBeGreaterThan(0.35);
    expect(ratio).toBeLessThan(0.72);
  });

  it('is ungated: it also procs OUTSIDE Annihilation State', () => {
    // The kit puts no status clause on this line; gating it to her burst window under-credits.
    expect(RIDER471_TIMES.some((t) => !inAnnihState(t))).toBe(true);
  });

  it('inertness — it is her own damage only; allies unmoved', () => {
    expect(
      Math.abs(allyTotal(NO_R471.events) / allyTotal(BASE.events) - 1)
    ).toBeLessThan(0.001);
    expect(herTotal(BASE.events)).toBeGreaterThan(herTotal(NO_R471.events));
  });
});

// =============================================================== SKILL 1b
describe('S1b — Annihilation-State-only: every 10 shots, 15.62% + Anti A.T. Field stack', () => {
  it('the 15.62% rider ONLY procs inside her own Annihilation State window', () => {
    expect(RIDER1562_TIMES.length).toBeGreaterThan(0);
    const leaked = RIDER1562_TIMES.filter((t) => !inAnnihState(t));
    // Nearest-wrong: an ungated passive every-10-shots block (procs all fight), or a plain
    // fbGate:'inFb' proxy (also procs during helm's Full Bursts, which she did not open).
    expect(leaked).toEqual([]);
  });

  it('cadence is every 10 SHOTS inside the window, not per-shot and not per-second', () => {
    const w = HER_CASTS[0];
    const shotsInWin = herShots(BASE.events).filter(
      (e) => inAnnihState(tOf(e)) && tOf(e) >= w - 0.25 && tOf(e) <= w + 9.25
    ).length;
    const procsInWin = RIDER1562_TIMES.filter(
      (t) => t >= w - 0.25 && t <= w + 9.25
    ).length;
    expect(shotsInWin).toBeGreaterThan(20);
    expect(procsInWin).toBeGreaterThan(0);
    const perProc = shotsInWin / procsInWin;
    expect(perProc).toBeGreaterThan(7);
    expect(perProc).toBeLessThan(14);
  });

  it('Anti A.T. Field is a BOSS debuff (whole-team benefit), not a self buff', () => {
    const applies = buffApplies(BASE.events, 'damageTakenPct', 0.83, 0.01);
    expect(applies.length).toBeGreaterThan(0);
    // Boss-held: emitted with casterIdx===null AND targetIdx===null.
    expect(
      applies.every((e) => e.targetIdx == null || e.targetIdx !== SLOT)
    ).toBe(true);
    // Nearest-wrong: encoding it as a self attackDamagePct leaves allies untouched -> RED.
    const drop = 1 - allyTotal(NO_DEBUFF.events) / allyTotal(BASE.events);
    expect(drop).toBeGreaterThan(0.005);
  });

  it('the debuff is applied only while she is in Annihilation State', () => {
    const applies = buffApplies(BASE.events, 'damageTakenPct', 0.83, 0.01);
    expect(applies.filter((e) => !inAnnihState(tOf(e)))).toEqual([]);
  });

  it('debuff shape: 0.83 per stack, 30 s, capped at 30 stacks (structural)', () => {
    const hits = findEffects(
      OV,
      (e) => e.kind === 'buff' && e.stat === 'damageTakenPct'
    );
    expect(hits.length).toBeGreaterThan(0);
    const e = hits[0].e;
    expect(near(e.value, 0.83, 0.01)).toBe(true); // per-stack magnitude, NOT 0.83*30 folded flat
    expect(e.durationSec).toBe(30);
    expect(e.maxStacks).toBe(30);
  });

  it('inertness — the 15.62% rider is her damage only; allies unmoved', () => {
    expect(
      Math.abs(allyTotal(NO_R1562.events) / allyTotal(BASE.events) - 1)
    ).toBeLessThan(0.001);
  });

  it.skip('two-target split ("Affects 2 enemy unit(s) nearest the crosshair") — GAP: the v1 boss is a single enemy, so the 2-target clause has no observable; whether the driver folded it as 15.62 x1 or 31.24 x1 is a modelling choice this fixture cannot discriminate', () => {});
});

// =============================================================== SKILL 2a
describe('S2a — entering Full Burst WHILE in Annihilation State: self Attack Damage +30.97% / 10 s', () => {
  const applies = () =>
    buffApplies(BASE.events, 'attackDamagePct', 30.97, 0.05);

  it('fires once per Full Burst SHE opened, never on a teammate-led Full Burst', () => {
    const a = applies();
    expect(a.length).toBeGreaterThan(0);
    expect(a.length).toBeLessThanOrEqual(HER_CASTS.length);
    // Every application must sit at an FB start that follows one of HER casts.
    expect(a.every((e) => inAnnihState(tOf(e)))).toBe(true);
  });

  it('RED under the nearest-wrong plain fullBurstEnter key (over-credits helm-led Full Bursts)', () => {
    const wrong = buffApplies(
      S2A_UNGATED.events,
      'attackDamagePct',
      30.97,
      0.05
    ).length;
    expect(wrong).toBeGreaterThan(applies().length);
    expect(herTotal(S2A_UNGATED.events)).toBeGreaterThan(herTotal(BASE.events));
  });

  it('self-only, 10 s, Damage-Up bucket (structural + inertness)', () => {
    const hits = findEffects(
      OV,
      (e) =>
        e.kind === 'buff' &&
        e.stat === 'attackDamagePct' &&
        near(e.value, 30.97, 0.05)
    );
    expect(hits.length).toBe(1);
    expect(hits[0].e.durationSec).toBe(10); // 10 s, NOT the burst's 9 s
    expect(hits[0].b.target.kind).toBe('self');
    expect(applies().every((e) => e.targetIdx === SLOT)).toBe(true);
    const removes = buffRemoves(BASE.events, 'attackDamagePct', 30.97, 0.05);
    for (const rm of removes) {
      const opened = applies()
        .map(tOf)
        .filter((t) => t <= tOf(rm));
      if (opened.length)
        expect(tOf(rm) - Math.max(...opened)).toBeLessThan(10.5);
    }
  });
});

// =============================================================== SKILL 2b
describe('S2b — Emergency Repair, "when using Annihilation" (i.e. cast + 9 s, NOT at cast)', () => {
  const herReloads = (evts: Ev[]) =>
    evts.filter((e) => e.kind === 'reload' && srcOf(e) === SLOT).map(tOf);

  it('the 100%-ammo dump lands at Annihilation time, one per burst', () => {
    const removedReloads = removedTimes(
      herReloads(BASE.events).map(r3),
      herReloads(NO_AMMO_DUMP.events).map(r3)
    );
    expect(removedReloads.length).toBeGreaterThan(0);
    // Trigger identity is load-bearing: keyed to burstCast instead, the dump would empty a
    // 300-round belt at the START of her damage window and force an immediate reload.
    for (const t of removedReloads) {
      const c = HER_CASTS.filter((x) => x <= t).pop();
      expect(c).toBeDefined();
      expect(t - (c as number)).toBeGreaterThan(6);
      expect(t - (c as number)).toBeLessThan(12);
    }
  });

  it('she does NOT reload in the first second of her own burst window', () => {
    for (const c of HER_CASTS) {
      expect(
        herReloads(BASE.events).filter((t) => t > c + 0.05 && t < c + 1.0)
      ).toEqual([]);
    }
  });

  it('reload speed is fixed +60% for 1 ROUND, not for 1 second (duration semantics)', () => {
    const hits = findEffects(
      OV,
      (e) => e.kind === 'buff' && e.stat === 'reloadSpeedPct'
    );
    expect(hits.length).toBeGreaterThan(0);
    const e = hits[0].e;
    expect(near(e.value, 60, 0.01)).toBe(true);
    expect(e.durationShots).toBe(1); // "for 1 round(s)" — round count, spans the reload
    expect(e.durationSec).toBeUndefined();
    // Behaviourally it buys back firing time on each post-Annihilation reload.
    expect(herShots(BASE.events).length).toBeGreaterThan(
      herShots(NO_RELOAD_BUFF.events).length
    );
  });

  it('the heal is a 3-tick HoT that can only help the team (crown reads recovery)', () => {
    const hits = findEffects(OV, (e) => e.kind === 'heal');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].e.ticks).toBe(3); // 3.77% every 1 s over 3 s
    expect(hits[0].e.intervalSec ?? 1).toBe(1);
    expect(hits[0].b.target.kind).toBe('self');
    // Tandem, not inert: removing it can never RAISE team damage.
    expect(teamTotal(NO_HEAL.events)).toBeLessThanOrEqual(
      teamTotal(BASE.events) * 1.0001
    );
    // ...and it must not move her own damage directly.
    expect(
      Math.abs(herTotal(NO_HEAL.events) / herTotal(BASE.events) - 1)
    ).toBeLessThan(0.02);
  });

  it.skip('Effect 1 "MG heating up speed -100% for 3 sec" — GAP: the engine has no MG heat model (no heat/overheat primitive in the effect schema), so the line has no representable payload; it belongs in `unmodeled`', () => {});
});

// =============================================================== BURST a
describe('burst a — Annihilation State self package (9 s)', () => {
  it('the -40% is scoped to the NORMAL-attack multiplier, not a generic damage cut', () => {
    const hits = findEffects(
      OV,
      (e) => e.kind === 'buff' && e.stat === 'normalAttackPct'
    );
    expect(hits.length).toBe(1);
    expect(hits[0].e.value).toBeLessThan(0); // a downward line; a sign flip is the classic error
    expect(near(Math.abs(hits[0].e.value), 40, 0.01)).toBe(true);
    expect(hits[0].e.durationSec).toBe(9);

    // Discriminator: dropping it must lift her NORMAL hits inside the window while leaving the
    // 471.86% riders byte-equal. Under the nearest-wrong `attackDamagePct: -40`, the riders move too.
    const riderSet = new Set(RIDER471_TIMES.filter(inAnnihState));
    expect(riderSet.size).toBeGreaterThan(0);
    const maxAt = (evts: Ev[], t: number) =>
      Math.max(
        0,
        ...herDamage(evts)
          .filter((e) => r3(tOf(e)) === t)
          .map(dmgOf)
      );
    const riderBase = [...riderSet].reduce(
      (s, t) => s + maxAt(BASE.events, t),
      0
    );
    const riderFree = [...riderSet].reduce(
      (s, t) => s + maxAt(NO_NERF.events, t),
      0
    );
    expect(riderFree / riderBase).toBeGreaterThan(0.98);
    expect(riderFree / riderBase).toBeLessThan(1.02);

    const normSum = (evts: Ev[]) =>
      herDamage(evts)
        .filter((e) => inAnnihState(tOf(e)) && !riderSet.has(r3(tOf(e))))
        .reduce((s, e) => s + dmgOf(e), 0);
    const normRatio = normSum(BASE.events) / normSum(NO_NERF.events);
    expect(normRatio).toBeLessThan(0.92); // non-vacuity: the nerf really bites normals
    expect(normRatio).toBeGreaterThan(0.4);
  });

  it('ATK +46.8% is a CASTER-ATK flat add for 9 s, self only', () => {
    const hits = findEffects(
      OV,
      (e) =>
        e.kind === 'buff' &&
        (e.stat === 'casterAtkPct' || e.stat === 'atkPct') &&
        near(e.value, 46.8, 0.05)
    );
    expect(hits.length).toBe(1);
    expect(hits[0].e.stat).toBe('casterAtkPct'); // "of the skill user's ATK"
    expect(hits[0].e.durationSec).toBe(9);
    expect(hits[0].b.target.kind).toBe('self');
    const applies = buffApplies(BASE.events, 'casterAtkPct', 46.8, 0.05);
    expect(applies.length).toBe(HER_CASTS.length);
    expect(applies.every((e) => e.targetIdx === SLOT)).toBe(true); // allies get nothing
  });

  it('Attack Damage +36% is self, 9 s (not the 10 s of the S2a buff, not team-wide)', () => {
    const hits = findEffects(
      OV,
      (e) =>
        e.kind === 'buff' &&
        e.stat === 'attackDamagePct' &&
        near(e.value, 36, 0.05)
    );
    expect(hits.length).toBe(1);
    expect(hits[0].e.durationSec).toBe(9);
    expect(hits[0].b.target.kind).toBe('self');
    const applies = buffApplies(BASE.events, 'attackDamagePct', 36, 0.05);
    expect(applies.length).toBe(HER_CASTS.length);
    expect(applies.every((e) => e.targetIdx === SLOT)).toBe(true);
  });

  it('all three self buffs are keyed to HER burst cast, not to team Full Burst entry', () => {
    for (const [stat, val] of [
      ['casterAtkPct', 46.8],
      ['attackDamagePct', 36],
      ['normalAttackPct', -40],
    ] as const) {
      const a = buffApplies(BASE.events, stat as string, val as number, 0.05);
      expect(a.length).toBe(HER_CASTS.length);
      expect(a.length).toBeLessThan(FB_STARTS.length);
      for (const e of a)
        expect(HER_CASTS.some((c) => Math.abs(tOf(e) - c) < 0.5)).toBe(true);
    }
  });

  it('"Reloads 21% magazine(s)" is an instant partial refill (structural)', () => {
    const hits = findEffects(OV, (e) => e.kind === 'instantReload');
    expect(hits.length).toBeGreaterThan(0);
    expect(near(hits[0].e.fraction ?? 1, 0.21, 0.005)).toBe(true); // 21% of 300, not a full belt
  });
});

// =============================================================== BURST b
describe('burst b — Annihilation: fires AFTER Annihilation State ends, mirroring Anti A.T. Field stacks', () => {
  it('lands ~9 s after her cast, once per burst — not at cast time', () => {
    expect(ANNIH_TIMES.length).toBeGreaterThan(0);
    expect(ANNIH_TIMES.length).toBeLessThanOrEqual(HER_CASTS.length);
    for (const t of ANNIH_TIMES) {
      const c = HER_CASTS.filter((x) => x <= t).pop();
      expect(c).toBeDefined();
      // Nearest-wrong: an instant burst-cast hit (delaySec 0) lands at c, inside the window.
      expect(t - (c as number)).toBeGreaterThan(7.5);
      expect(t - (c as number)).toBeLessThan(11);
    }
  });

  it('the payload is 6.62% MIRRORED by a stack count, not a bare 6.62% (structural, flagged)', () => {
    const hits = findEffects(OV, isAnnihilationHit);
    expect(hits.length).toBeGreaterThan(0);
    const k = hits[0].e.atkPct / 6.62;
    // The engine has no stack-mirroring primitive for flatDamage, so a DERIVED multiple is the
    // only faithful option; a bare 6.62% (k===1) under-credits by ~1-2 orders of magnitude.
    expect(k).toBeGreaterThan(1.5);
    expect(k).toBeLessThanOrEqual(30.5);
  });

  it('inertness — it is her damage; allies unmoved', () => {
    expect(
      Math.abs(allyTotal(NO_ANNIHILATION.events) / allyTotal(BASE.events) - 1)
    ).toBeLessThan(0.001);
    expect(herTotal(BASE.events)).toBeGreaterThan(
      herTotal(NO_ANNIHILATION.events)
    );
  });

  it.skip('"Anti A.T. Field status is removed after the effect is triggered" — GAP: no consume-stacks primitive exists (a damageTakenPct buff can only expire on its own 30 s clock), so stacks survive Annihilation and carry into the next window. This OVER-credits both the team debuff and any stack-derived Annihilation constant; needs a stack-consume effect or a measured steady-state haircut', () => {});

  it.skip('stack count at the moment Annihilation fires — MEASUREMENT-GATED: the mirrored multiple depends on her real in-window shot cadence (the datamined MG rate_of_fire is an unreliable field) and on whether stacks persist across rotations; pin from footage before trusting any specific k', () => {});
});
```

## S6 BLIND POST-OP OVERRIDE (claude-opus-5, written from prose alone)

```json
{
  "override": {
    "slug": "asuka-wille",
    "skill1": [
      {
        "slot": "skill1",
        "trigger": {
          "kind": "hitCount",
          "count": 50
        },
        "target": {
          "kind": "enemy"
        },
        "effects": [
          {
            "kind": "flatDamage",
            "atkPct": 471.86,
            "crit": true
          }
        ]
      },
      {
        "slot": "skill1",
        "trigger": {
          "kind": "hitCount",
          "count": 10
        },
        "target": {
          "kind": "enemy"
        },
        "fbGate": "inFb",
        "ownBurstGate": "cast",
        "effects": [
          {
            "kind": "flatDamage",
            "atkPct": 15.62,
            "crit": true
          },
          {
            "kind": "buff",
            "stat": "damageTakenPct",
            "value": 0.83,
            "durationSec": 9,
            "maxStacks": 30
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
          "kind": "self"
        },
        "ownBurstGate": "cast",
        "effects": [
          {
            "kind": "buff",
            "stat": "attackDamagePct",
            "value": 30.97,
            "durationSec": 10
          }
        ]
      },
      {
        "slot": "skill2",
        "trigger": {
          "kind": "fullBurstEnd"
        },
        "target": {
          "kind": "self"
        },
        "ownBurstGate": "cast",
        "effects": [
          {
            "kind": "buff",
            "stat": "reloadSpeedPct",
            "value": 60,
            "durationShots": 1
          },
          {
            "kind": "heal",
            "ticks": 3,
            "intervalSec": 1
          },
          {
            "kind": "consumeAmmo",
            "fraction": 1
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
            "kind": "buff",
            "stat": "normalAttackPct",
            "value": -40,
            "durationSec": 9
          },
          {
            "kind": "instantReload",
            "fraction": 0.21
          },
          {
            "kind": "buff",
            "stat": "casterAtkPct",
            "value": 46.8,
            "durationSec": 9
          },
          {
            "kind": "buff",
            "stat": "attackDamagePct",
            "value": 36,
            "durationSec": 9
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
            "atkPct": 66.2,
            "crit": true,
            "delaySec": 9
          }
        ]
      }
    ],
    "unmodeled": {
      "skill1": [],
      "skill2": [
        "Function: Reduces MG heating up speed and removes ammo. Fixes reload speed and continuously restores HP based on Max HP.",
        "Effect 1: MG heating up speed ▼ 100% for 3 sec."
      ],
      "burst": [
        "Function: Reduces the normal attack damage while increasing attack capabilities.",
        "Function: After Annihilation State ends, fires powerful attacks at targets affected by Anti A.T. Field.",
        "Anti A.T. Field status is removed after the effect is triggered."
      ]
    },
    "caveats": [
      "⚑ ANNIHILATION STATE HAS NO ENGINE PRIMITIVE. It is a 9s SELF status opened by her own burst cast; the engine has no self-status window gate. Both status-gated blocks are proxied by fbGate 'inFb' + ownBurstGate 'cast' (skill1 every-10-shots) and by ownBurstGate 'cast' on FB-enter / FB-end (skill2). Mismatch: Annihilation State runs cast→cast+9s, Full Burst runs fbStart→fbStart+10s, so shots in the pre-FB gap are missed and the last ~1s of FB is over-counted.",
      "⚑ SINGLE-TARGET COLLAPSE. 'Affects 2 enemy unit(s) ... nearest to the crosshair' is modeled as ONE instance (15.62% + one Anti A.T. Field stack per proc) because the scope-lock boss is a single partless enemy. If the second target instead resolves onto the same boss in-game, both the rider damage and the stack-accrual rate DOUBLE (and so does the burst nuke's stack mirror).",
      "⚑ ANTI A.T. FIELD DURATION TRUNCATED 30s → 9s. Kit gives 30s but also states the status is REMOVED when Annihilation triggers (= end of the 9s state). The engine has no remove-on-trigger primitive; a literal 30s would leave the whole team's Damage Taken ▲ debuff live for ~21s after the kit removes it. 9s approximates the real lifetime; it still over-runs for late-window stacks.",
      "⚑ The burst 'Annihilation' hit's stack mirror is a STATIC estimate (6.62% × 10 stacks). flatDamage has no perResource path, so a live stack count is not expressible; this number is the single largest unmeasured lever in the file.",
      "⚑ MG cadence (pullsPerSec, reloadFrames 161) is datamine-unreliable and is NOT stated in the kit text. Every proc count in this file (50-hit rider, every-10-shots rider, resulting stack count) scales directly with it.",
      "⚑ noFb is NOT set anywhere (default FB-by-timing ON per prior 9). The delayed Annihilation hit lands at cast+9s, i.e. inside the Full Burst window, so it currently takes the +50% FB major; unmeasured."
    ],
    "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Blind second read of the kit prose only (S6), no board access, no driver artifacts. Structure: skill1 = a 50-hit 471.86% rider (always on) + the Annihilation-State-only every-10-shots 15.62% rider that stacks the Anti A.T. Field Damage Taken ▲ debuff on the boss (team-wide benefit, not a self buff — tandem rule). skill2 = an FB-enter Attack Damage ▲30.97% gated on her having cast her own burst, plus Emergency Repair (self heal-over-time 3 ticks, full ammo dump forcing a reload + lastBullet, and a +60% reload-speed round-count buff) keyed to 'when using Annihilation' — proxied to fullBurstEnd since Annihilation fires at the END of the 9s state, not at cast. burst = the Annihilation State self package (normal-attack multiplier ▼40%, 21% instant reload, caster-ATK ▲46.8%, Attack Damage ▲36%, all 9s) plus the delayed Annihilation nuke (delaySec 9) whose magnitude mirrors the Anti A.T. Field stack count. Weapon-state lines were NOT skipped: the ammo dump, the forced reload, the 21% reload and the reload-speed fix are all authored (they gate shots fired); only the MG heating-up-speed line is unmodeled because the engine has no MG spin-up/heat model at all. The ▼40% normal-attack multiplier is authored as a NEGATIVE normalAttackPct — it is a real damage loss and must not be dropped as 'defensive'."
  },
  "audit": [
    {
      "slot": "skill1",
      "kitLine": "Activates after landing 50 normal atk",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger hitCount count:50 (MG hitsPerShot 1 → 50 rounds); target enemy"
    },
    {
      "slot": "skill1",
      "kitLine": "Deals 471.86% of final ATK as add dmg",
      "status": "IMPLEMENTED",
      "effectOrReason": "flatDamage atkPct 471.86, crit:true (rider crits at caster rate), no core (text says no core strike), FB by timing"
    },
    {
      "slot": "skill1",
      "kitLine": "Activates only when in Annihilation St",
      "status": "IMPLEMENTED",
      "effectOrReason": "PROXY gate: fbGate 'inFb' + ownBurstGate 'cast' — no self-status-window primitive exists"
    },
    {
      "slot": "skill1",
      "kitLine": "Affects 2 enemy unit(s) ... every 10 sh",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger hitCount count:10; 2-target clause collapses to 1 instance on the single partless boss (⚑ caveat)"
    },
    {
      "slot": "skill1",
      "kitLine": "Damage: Deals 15.62% of final ATK",
      "status": "IMPLEMENTED",
      "effectOrReason": "flatDamage atkPct 15.62, crit:true"
    },
    {
      "slot": "skill1",
      "kitLine": "Anti A.T. Field: Damage Taken ▲ 0.83%",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff damageTakenPct 0.83, maxStacks 30, target enemy (boss debuff, team-wide); durationSec truncated 30→9 to approximate removal-at-Annihilation"
    },
    {
      "slot": "skill2",
      "kitLine": "Activates when entering Full Burst whi",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger fullBurstEnter + ownBurstGate 'cast' (Annihilation State only exists if SHE burst — a bare fullBurstEnter would over-fire in multi-B3 comps)"
    },
    {
      "slot": "skill2",
      "kitLine": "Attack Damage ▲ 30.97% for 10 sec",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff attackDamagePct 30.97, durationSec 10, self"
    },
    {
      "slot": "skill2",
      "kitLine": "Activates when using Annihilation",
      "status": "IMPLEMENTED",
      "effectOrReason": "PROXY trigger fullBurstEnd + ownBurstGate 'cast' — Annihilation fires when the 9s state ENDS, not at burst cast"
    },
    {
      "slot": "skill2",
      "kitLine": "Function: Reduces MG heating up speed",
      "status": "SKIPPED",
      "effectOrReason": "descriptive function header; its sub-effects are itemized below"
    },
    {
      "slot": "skill2",
      "kitLine": "MG heating up speed ▼ 100% for 3 sec",
      "status": "SKIPPED",
      "effectOrReason": "engine models a constant pullsPerSec — no MG heat/spin-up curve exists to modify. Weapon-state line, so recorded verbatim in unmodeled + flagged, NOT silently dropped"
    },
    {
      "slot": "skill2",
      "kitLine": "Removes 100% of ammo",
      "status": "IMPLEMENTED",
      "effectOrReason": "consumeAmmo fraction:1 — empties the belt and forces an immediate reload (fires lastBullet)"
    },
    {
      "slot": "skill2",
      "kitLine": "recovers 3.77% Max HP every 1s / 3 sec",
      "status": "IMPLEMENTED",
      "effectOrReason": "heal ticks:3 intervalSec:1, target self — emits 3 recovery events (feeds on-recovery consumers; not skippable on isolation)"
    },
    {
      "slot": "skill2",
      "kitLine": "Reload speed fixed at 60% for 1 rounds",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff reloadSpeedPct 60 with durationShots:1 (ROUND count, not seconds). 'Fixed at' (override-other-buffs) semantics are not expressible — authored as additive ⚑"
    },
    {
      "slot": "burst",
      "kitLine": "Function: Reduces the normal attack da",
      "status": "SKIPPED",
      "effectOrReason": "descriptive function header for Annihilation State"
    },
    {
      "slot": "burst",
      "kitLine": "Normal Atk Dmg Multiplier ▼ 40% 9 sec",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff normalAttackPct -40, durationSec 9, self — a real damage LOSS scaling the 5.47 normal multiplier"
    },
    {
      "slot": "burst",
      "kitLine": "Reloads 21% magazine(s)",
      "status": "IMPLEMENTED",
      "effectOrReason": "instantReload fraction:0.21 ⚑ (add-vs-set-to semantics unverified)"
    },
    {
      "slot": "burst",
      "kitLine": "ATK ▲ 46.8% of the skill user's ATK",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff casterAtkPct 46.8 (flat add off caster ATK, not atkPct), durationSec 9, self"
    },
    {
      "slot": "burst",
      "kitLine": "Attack Damage ▲ 36% for 9 sec",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff attackDamagePct 36, durationSec 9, self"
    },
    {
      "slot": "burst",
      "kitLine": "Function: After Annihilation State end",
      "status": "SKIPPED",
      "effectOrReason": "descriptive header; supplies the timing (state end) used as delaySec 9 on the damage line"
    },
    {
      "slot": "burst",
      "kitLine": "Deals 6.62% of final ATK as add damage",
      "status": "IMPLEMENTED",
      "effectOrReason": "flatDamage delaySec:9, crit:true, atkPct 66.2 = 6.62 × ⚑10 estimated Anti A.T. Field stacks; target enemy"
    },
    {
      "slot": "burst",
      "kitLine": "Mirrors the stack count of Anti A.T. F",
      "status": "IMPLEMENTED",
      "effectOrReason": "as the ⚑ static stack multiplier above — flatDamage has no perResource path for a live pool"
    },
    {
      "slot": "burst",
      "kitLine": "Anti A.T. Field status is removed afte",
      "status": "SKIPPED",
      "effectOrReason": "no remove-on-trigger primitive for a stacked buff; approximated by truncating the debuff to 9s"
    }
  ],
  "flags": [
    {
      "field": "override.burst[1].effects[0].atkPct",
      "estimate": "66.2 (= 6.62% × 10 stacks); plausible range 66–199 (10–30 stacks)",
      "reasoning": "Annihilation mirrors the live Anti A.T. Field stack count, which accrues at 1 stack per 10 rounds fired during the 9s Annihilation State only (status is wiped each Annihilation, and the 40s burst CD exceeds the 30s status life, so every rotation rebuilds from zero). At an assumed MG cadence of ~12 rounds/s → ~108 rounds → 10 procs → 10 stacks. At ~20/s it is 18 stacks; the 30 cap needs ~300 rounds in 9s and is almost certainly unreachable. flatDamage has no perResource hook, so the count cannot track live.",
      "recipe": "cfg.onEvent → count buffApply events with stat 'damageTakenPct' value 0.83 (casterIdx===null && targetIdx===null, boss-held) between her burstCast and burstCast+9s in a controlComp('asuka-wille') run; multiply that count × 6.62. Cross-check against footage: the Annihilation popup magnitude ÷ (final ATK × 6.62%) = the true mirrored stack count."
    },
    {
      "field": "override.skill1[1] (fbGate 'inFb' + ownBurstGate 'cast')",
      "estimate": "proxy gate for the 9s Annihilation State self-status",
      "reasoning": "The engine has no self-status window primitive. Annihilation State opens at HER burst cast and runs 9s; Full Burst opens slightly later and runs 10s. The proxy loses the pre-FB slice and over-counts the FB tail (~1s), and it silently assumes she is the FB-completing B3. Without ownBurstGate a bare inFb gate would fire this rider on ANY teammate's Full Burst, which the kit forbids.",
      "recipe": "onEvent: log burstCast(asuka-wille) t0, fullBurstStart t1, fullBurstEnd t2; count damage events with bucket=rider atkPct 15.62 falling outside [t0, t0+9]. If the offset materially changes the proc count, request an engine self-status window (mirror of targetStatus/requiresTargetStatus) rather than widening the proxy."
    },
    {
      "field": "override.skill1[1].effects[1].durationSec",
      "estimate": "9 (kit literal is 30)",
      "reasoning": "Kit states BOTH a 30s duration and removal when Annihilation triggers (end of the 9s state). Since she cannot stack the status outside Annihilation State, the 30s value never binds in real play; keeping it literal would leave a team-wide Damage Taken ▲ of up to 30×0.83% alive for ~21s past its kit-stated removal — an over-credit on every ally's damage, not just hers.",
      "recipe": "Read the boss debuff icon timeline from footage: confirm the Anti A.T. Field icon disappears at the Annihilation hit, not 30s after the last stack. If the engine gains a remove-on-trigger primitive, restore durationSec 30 and clear on the burst[1] landing."
    },
    {
      "field": "override.skill2[1].trigger (fullBurstEnd)",
      "estimate": "proxy for 'when using Annihilation' (≈ burst cast + 9s)",
      "reasoning": "Emergency Repair keys to Annihilation, which fires at the END of the 9s state — not at burst cast. Buff/heal/consumeAmmo effects have no delaySec, so the nearest primitive is fullBurstEnd (FB start + 10s), typically ~1s late relative to the true fire. This misplaces the forced reload by ~1s, which shifts one magazine boundary and therefore one lastBullet.",
      "recipe": "Compare sim reload events against footage: find the frame where her belt drops to 0 without firing dry, measure its offset from the burst banner; if it is ~9.0s and fullBurstEnd lands at ~10.x s, split the block into a burstCast-keyed one once a delayed-buff primitive exists."
    },
    {
      "field": "override.skill2[1].effects[0] (reloadSpeedPct 60, durationShots 1)",
      "estimate": "+60 additive for 1 round",
      "reasoning": "'Reload speed is FIXED at a 60% increase' overrides other reload modifiers rather than adding to them; the schema has only additive reloadSpeedPct. Solo/control comps carry few reload buffs so the two readings coincide there, but in a reload-buffing team the additive model over-credits. 'for 1 rounds' is correctly a ROUND count (durationShots), not seconds — it must survive the forced reload and expire after the next round fires.",
      "recipe": "Run controlComp with and without a reload-speed support; if the sim's post-Annihilation reload duration diverges from footage in the buffed team only, the fix is a 'fixed value' flavor on the buff (set-not-add)."
    },
    {
      "field": "override.burst[0].effects[1] (instantReload fraction 0.21)",
      "estimate": "0.21 = add 21% of max capacity (63 rounds of 300)",
      "reasoning": "Kit says 'Reloads 21% magazine(s)'. The schema comment ('refill magazine, fraction of max') is ambiguous between ADD 21% and SET the belt to 21%. If the engine SETS, a burst cast on a near-full belt would be a large ammo LOSS — the opposite of the kit's intent.",
      "recipe": "Read sim.ts instantReload handling directly (one line), or onEvent-log her ammo immediately before/after burstCast in a run where she bursts on a full belt."
    },
    {
      "field": "override.skill1[1] target multiplicity",
      "estimate": "1 instance per proc (kit says 2 enemy units)",
      "reasoning": "The scope-lock boss is a single partless enemy, so only one of the two crosshair-nearest targets exists. This halves both the 15.62% rider throughput and the Anti A.T. Field stack rate versus a two-target read — and the stack rate feeds the burst nuke, so the error compounds.",
      "recipe": "Footage: count the small Anti A.T. Field popups per 10 rounds during Annihilation State (1 vs 2), and count Damage Taken ▲ stack icons at the state's end. If it is 2, double the block (or duplicate the effects) and re-derive the burst nuke stack estimate."
    },
    {
      "field": "cadence tuple (pullsPerSec / reloadFrames 161 / ammo 300)",
      "estimate": "MG prior ~12 rounds/s effective (frame-quantized), reload ~2.68s",
      "reasoning": "The kit text gives no rate of fire and datamined rate_of_fire/reloadFrames are known-unreliable; MG effective rate is additionally frame-quantized (60/ceil(60/nominal)) and, in-game, ramps with heat — which this file cannot model. Both hitCount triggers (50 and 10) and therefore every rider and the burst nuke's magnitude scale linearly with this number.",
      "recipe": "Ammo-counter read from footage — count rounds consumed per second directly off the HUD counter (the instrument that measures shots/sec), not FB-count or damage totals which are downstream of it."
    },
    {
      "field": "noFb (all flatDamage riders) / burst[1] delayed hit FB eligibility",
      "estimate": "default OFF everywhere (riders take Full Burst by timing)",
      "reasoning": "Per-kit noFb is measured-only and is never set unmeasured. Note the consequence here: the Annihilation hit is authored as a DELAYED hit landing at cast+9s, which is inside the Full Burst window, so it currently receives the +50% FB major — unlike an instant burst-cast hit, which would be FB-exempt by construction.",
      "recipe": "Popup-read the Annihilation number against a same-run normal-attack popup with known buffs; back out whether the ×1.5 FB major is present. Only then set noFb."
    },
    {
      "field": "unmodeled.skill2 'MG heating up speed ▼ 100% for 3 sec'",
      "estimate": "unmodeled (assume damage-neutral in v1)",
      "reasoning": "Weapon-state modifiers are damage, so this is flagged rather than dropped: the engine has a flat pullsPerSec with no heat/spin-up curve, so there is nothing for a 100% heat-speed reduction to act on. Its real effect is coupled to the ammo dump + fixed reload (the Emergency Repair package resets the belt and the ramp together), so modeling it in isolation would be guesswork.",
      "recipe": "Frame-count her rounds/s in the 3s immediately after the Annihilation forced reload versus a mid-belt 3s window elsewhere in the fight. A measured difference is the size of the missing mechanic and would justify a fireRatePct stand-in or a real MG heat model."
    }
  ]
}
```

## DRIVER IMPLEMENTATION UNDER REVIEW

### src/skills/overrides/asuka-wille.json

```json
{
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Remove this banner only when the unit has been measured/hand-tuned. — Asuka: WILLE (`asuka-wille`, MG B3 Attacker Wind Abnormal, ammo 300 / reloadFrames 161; NOT base `asuka` AR/Fire). Kit-autonomy gauntlet 2026-07-24 (cross-family S2b fable / S5-S7 opus; converged with the blind opus rebuild on the trigger/timing encodings below). S1 blk1 kept verbatim (471.86% every 50 hits). S1 blk2 is the Annihilation-State-gated every-10-shots proc: 15.62% to the nearest 2 enemies (single boss -> 1 target) + Anti A.T. Field (Damage Taken +0.83%, stacks to 30). GAUNTLET FIX (consumption): the burst's Annihilation finisher prose says 'Anti A.T. Field status is removed after the effect is triggered' — the debuff is CONSUMED at Annihilation-State end (~cast+9s), so its real life is the ~9s build window each 40s cycle, NOT a near-permanent 30-stack boss debuff (the prior encoding over-credited the WHOLE team's damage by ~3-4x average). Modeled faithfully: the burst inflicts targetStatus 'Annihilation State' for 9s (the mode window; the engine has no SELF-status gate, so the mode is proxied as a boss status per the marciana/privaty requiresTargetStatus pattern), the S1 proc is gated on requiresTargetStatus 'Annihilation State' at hitCount 10 (every 10 in-window shots, replacing the old ungated hitCount-44 time-average that spread the debuff across the whole fight), and the debuff durationSec is 9 (its EFFECTIVE life — consumed at state-end — not the nominal 30s the prose states, which is moot because the status is removed at ~9s). RESIDUAL ⚑6: the consumption is INSTANT (all stacks removed at once at state-end); the engine has no remove-target-buff / consume-status primitive, so the debuff instead expires gradually 9s after each stack is applied, leaving a short post-window tail (~34% vs the true ~22.5% uptime). Estimate: team amp over-credited by up to ~1.5x in the ~8s tail; recipe: add a 'consumeTargetStatus'/removeTargetBuff effect keyed to the finisher; Tier 2. S2 blk1 'Activates when entering Full Burst while in Annihilation State' = trigger `fullBurstEnter` + ownBurstGate:'cast' (the purpose-built primitive for 'entering FB after her OWN burst' — Annihilation State is opened only by her own burst, so this fires exactly on rotations she bursts and keeps the block AT FB entry; a bare fullBurstEnter over-fires in the dual-B3 control comp, and re-keying to burstCast would fire pre-FB — cinderella-crystal-wave class finding, verified by test). S2 blk2 Emergency Repair 'Activates when using Annihilation' = the burst finisher at Annihilation-State END (~cast+9s); encoded as trigger `fullBurstEnd` + ownBurstGate:'cast' (FB end ≈ state-end, ~1s late — far closer than the prior burstCast proxy which fired 9s early). Effect 2 'Removes 100% of ammo' is NOW MODELED as consumeAmmo fraction:1 at fullBurstEnd (the engine HAS consumeAmmo — the prior 'no ammo-dump vocabulary' claim was WRONG; at fullBurstEnd it lands ~10s after the burst's own instantReload 0.21 at burstCast, so the two no longer collide). Effect 3 'recovers 3.77% Max HP every 1s over 3s' = `heal` ticks:3/intervalSec:1 (the prose 3-tick HoT). The heal is SELF-targeted and asuka-wille has no recovery-triggered block, so it is damage-INERT in the sim (verified: removing it moves no unit's total); encoded for kit completeness / future recovery synergy. Effect 4 'Reload speed fixed at a 60% increase for 1 rounds' = reloadSpeedPct 60 for a 10.5s window ⚑3 — 'for 1 rounds' on a reload-speed FIX is a stat CLAMP, a primitive the engine does not have (types.ts: explicitly NOT durationShots, which the blind rebuild used; the window proxies 'one fast reload per burst cycle' covering the consumeAmmo-forced reload). Effect 1 'MG heating up speed ▼ 100% for 3 sec' UNMODELED (no MG wind-up/heat primitive ⚑2 — ambiguous localization: frozen ramp vs instant full spin; measure first). Burst self-buffs kept at burstCast (normal-atk -40%, 21% reload, ATK +46.8% of caster ATK, Attack Damage +36%, all 9s). Annihilation finisher: 6.62% x Anti A.T. Field stack count, modeled as one 198.6% hit (6.62 x 30 cap) with delaySec:9 so it LANDS at Annihilation-State end (~cast+9s, inside the FB window → FB-boosted, the hand-slot F2 finding) rather than at cast; the 30-cap assumes the window builds 30 stacks (cadence-dependent ⚑4/⚑5; no dynamic-stack-scale primitive exists to mirror live stacks; the blind rebuild assumed 10 stacks = 66.2% — both are unmeasured). ⚑1 cadence tuple: MG class profile (measured wind-up ladder, 60/s at full spin) + datamined ammo 300 / reloadFrames 161 are unverified for this unit — read rounds/min + reload gap from any focus video.",
  "unmodeled": {
    "skill1": [],
    "skill2": ["Effect 1: MG heating up speed ▼ 100% for 3 sec."],
    "burst": []
  },
  "caveats": [
    "skill1: cadence tuple (MG wind-up ladder / 300 ammo / reloadFrames 161) is the unverified datamine — read rounds/min + the reload gap from any focus video (⚑1)",
    "skill1: the every-10-shots proc + Anti A.T. Field stacks are GATED to the Annihilation State window (requiresTargetStatus 'Annihilation State', hitCount 10) and the debuff durationSec is 9 (consumed at state-end), replacing the prior ungated near-permanent 30-stack encoding; whether the window builds the full 30 stacks is cadence-dependent (⚑4/⚑5)",
    "skill1/burst: the Anti A.T. Field CONSUMPTION is instant in-game (all stacks removed at the finisher ~cast+9s) but the engine has no remove-target-buff primitive, so the debuff expires gradually 9s per stack — a short post-window tail over-credits team amp by up to ~1.5x in that tail (⚑6: add a consumeTargetStatus effect keyed to the finisher; Tier 2)",
    "skill2: the Full-Burst-entry Attack Damage buff is fullBurstEnter + ownBurstGate:'cast' (fires at FB entry only on rotations SHE burst in — Annihilation State is granted only by her own burst); identical to FB-enter when she is the only Burst III unit, and it correctly does NOT fire on another Burst III unit's rotations (verified in the dual-B3 control comp)",
    "skill2: Emergency Repair (heal + reload-speed + ammo dump) is encoded at fullBurstEnd + ownBurstGate:'cast' ≈ Annihilation-State end (~cast+9s, ~1s late); the schema has no delayed/state-end trigger keyed to her burst, so fullBurstEnd is the closest proxy",
    "skill2: 'Removes 100% of ammo' is modeled as consumeAmmo fraction:1 at fullBurstEnd (~10s after the burst's instantReload 0.21, so no collision); its damage content is the forced fast reload covered by the reloadSpeedPct 60 window (⚑3)",
    "skill2: the 3.77%-Max-HP heal is a 3-tick self recovery emitter (ticks:3/intervalSec:1) but is damage-INERT in the sim (self-targeted, asuka-wille has no recovery block; verified removing it moves no total) — encoded for kit completeness / future recovery synergy",
    "skill2: 'MG heating up speed ▼ 100% for 3 sec' is UNMODELED (⚑2) — no wind-up primitive; ambiguous (frozen ramp vs instant full spin). Measure her post-Emergency-Repair fire cadence before modeling",
    "burst: the Annihilation finisher (6.62% × stacks) is one 198.6% hit (30-stack cap) with delaySec:9 — it LANDS at state-end inside the FB window (FB-boosted, finding F2) and mirrors the LIVE stack count (no dynamic-stack-scale primitive, so the 30-cap is a documented proxy; the blind rebuild used 10 stacks — verify the popup ÷ 6.62 for the real count, ⚑4/⚑5)"
  ],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "hitCount",
        "count": 50
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 471.86
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "hitCount",
        "count": 10
      },
      "requiresTargetStatus": "Annihilation State",
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 15.62
        },
        {
          "kind": "buff",
          "stat": "damageTakenPct",
          "value": 0.83,
          "durationSec": 9,
          "maxStacks": 30
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
      "ownBurstGate": "cast",
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 30.97,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "fullBurstEnd"
      },
      "ownBurstGate": "cast",
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "reloadSpeedPct",
          "value": 60,
          "durationSec": 10.5
        },
        {
          "kind": "heal",
          "ticks": 3,
          "intervalSec": 1
        },
        {
          "kind": "consumeAmmo",
          "fraction": 1
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
          "kind": "buff",
          "stat": "normalAttackPct",
          "value": -40,
          "durationSec": 9
        },
        {
          "kind": "instantReload",
          "fraction": 0.21
        },
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 46.8,
          "durationSec": 9
        },
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 36,
          "durationSec": 9
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
          "kind": "targetStatus",
          "name": "Annihilation State",
          "durationSec": 9
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
          "atkPct": 198.6,
          "delaySec": 9
        }
      ]
    }
  ]
}
```

### scripts/tests/units/asuka-wille.test.ts (driver unit test, 27 assertions, all green)

```typescript
// PER-UNIT KIT SPEC — `asuka-wille` (Asuka: WILLE, MG/Attacker/Wind, Burst III, cd 40s, ammo 300 /
// reloadFrames 161). Kit-autonomy gauntlet 2026-07-24, test-first (S2a).
//
// ⚠ EXACT SLUG: this is the MG/Wind "Asuka: WILLE" variant (aka "aw"/"wasuka"), NOT base `asuka`
// (AR/Attacker/Fire/Burst III). Every assertion reasons from slug `asuka-wille`.
//
// One assertion group per KIT LINE (W1..W11 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` builds COUNTERFACTUALS only (the nearest wrong model each
// assertion must discriminate against) — never the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters['asuka-wille'].skills):
//   S1 ■ after landing 50 normal attacks → target: 471.86% final ATK additional damage          [W1]
//      ■ in Annihilation State, every 10 shots → 2 nearest enemies: 15.62% final ATK damage     [W2]
//        + Anti A.T. Field: Damage Taken ▲0.83% / 30s / stacks to 30 (boss debuff)              [W2]
//   S2 ■ entering FB while in Annihilation State → self: Attack Damage ▲30.97% / 10s            [W3]
//      ■ using Annihilation (Emergency Repair, ~t+9s; encoded at burstCast — no delayed trigger):
//          Eff1 MG heating-up speed ▼100% / 3s        → UNMODELED (no wind-up primitive) ⚑2     [--]
//          Eff2 Removes 100% of ammo                  → UNMODELED (see header note) ⚑           [--]
//          Eff3 recover 3.77% Max HP / 1s over 3s     → self heal EVENT (3 ticks)               [W4]
//          Eff4 reload speed fixed ▲60% for 1 round   → reloadSpeedPct 60 / 10.5s window ⚑3     [W5]
//   BU ■ Annihilation State → self: Normal Attack Mult ▼40% / 9s                                [W6]
//                          → self: Reloads 21% magazine (instantReload 0.21)                    [W7]
//                          → self: ATK ▲46.8% of caster ATK / 9s                                [W8]
//                          → self: Attack Damage ▲36% / 9s                                      [W9]
//      ■ Annihilation finisher → target w/ Anti A.T. Field: 6.62% × stack count (cap 30 = 198.6%)[W10]
//
// Discrimination notes (a test that cannot fail under the nearest wrong model gates nothing):
//   W2  the Anti A.T. Field debuff is a BOSS debuff (targetIdx null) amplifying ALL team damage;
//       removing it must drop the team total, not just asuka-wille's. The 15.62% rider is the
//       steady-state proxy for "every 10 shots in Annihilation State" (≈ every 44 overall shots,
//       9/40 time fraction) — documented in the override note (⚑4/⚑5).
//   W3  TIER-2 HEADLINE: trigger is `burstCast`, NOT `fullBurstEnter`. Annihilation State exists
//       only via HER OWN burst, so the FB-entry condition is satisfied exactly on rotations she
//       bursts. The fixture runs TWO Burst III units (asuka-wille + helm) so there are FB entries
//       she does NOT cast — a bare fullBurstEnter would fire the 30.97% buff on every FB entry
//       (≈ double), over-crediting her in multi-B3 teams (cinderella-crystal-wave class finding).
//       Shipped count == her burst-cast count; the fullBurstEnter counterfactual fires strictly more.
//   W4  the heal is a SELF recovery-event emitter (no HP amount modeled). asuka-wille has no
//       recovery-triggered block of her own and the heal targets only her, so it is damage-INERT
//       in this comp; its observable is the recovery event itself, which the SimEvent union does
//       not surface — so W4 is a structural PIN (the heal effect is present + is a 3-tick HoT per
//       the prose "every 1 sec over 3 sec"), not a totals discriminator. Documented, not weakened.
//   W6  normalAttackPct -40 is a SELF-NERF during Annihilation State: removing it INCREASES her
//       normal-bucket damage. The discrimination direction is the reverse of a buff.
//   W10 the finisher is 6.62% × 30-stack cap = 198.6%, one hit per burst cast in the burst bucket.
//       The single-stack counterfactual (6.62%) proves the magnitude encodes the 30-stack mirror,
//       not one stack. (Timing: encoded at cast → no FB major; the in-game landing ~9s later inside
//       the FB window is the hand-slot F2 caveat, documented in the override.)
//
// UNMODELED (documented in the override `unmodeled` + note, NO assertion here): S2 Eff1 (MG heating
// speed — no wind-up primitive ⚑2) and S2 Eff2 (ammo dump — see header: consumeAmmo exists but the
// dump fires at Annihilation-State-end ~t+9s; no delayed trigger, so encoding at burstCast would
// collide with the burst's own instantReload 0.21; its damage content is the reloadSpeedPct window).
//
// Fixture: controlComp('asuka-wille') = liter (B1) / crown (B2) / asuka-wille (B3, focus) / helm
// (B3). Two Burst III units so asuka-wille casts ~half the FB cycles — required for the W3 trigger
// discrimination. Deterministic (no seed); event-log assertions over totals where a line is live.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** controlComp slot order: liter 0 / crown 1 / asuka-wille 2 / helm 3. */
const AW = 2;
const SLUG = 'asuka-wille';

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Reload = Extract<SimEvent, { kind: 'reload' }>;
type FBStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp(SLUG),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual / isolation patches -------------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);
const hasKind = (b: any, kind: string) =>
  b.effects.some((e: any) => e.kind === kind);
const findBlock = (arr: any[], pred: (b: any) => boolean, label: string) => {
  const b = arr.find(pred);
  if (!b)
    throw new Error(`asuka-wille ${label} block missing — fixture is stale`);
  return b;
};

/** W2 reference: strip the Anti A.T. Field damageTakenPct debuff from the S1 every-10-shots block. */
const awNoAtfDebuff = withPatchedOverride(SLUG, (ov) => {
  const b = findBlock(
    ov.skill1,
    (x) =>
      x.trigger?.kind === 'hitCount' &&
      x.requiresTargetStatus === 'Annihilation State',
    'S1 ATF'
  );
  const before = b.effects.length;
  b.effects = b.effects.filter((e: any) => e.stat !== 'damageTakenPct');
  if (b.effects.length === before)
    throw new Error(
      'asuka-wille S1 damageTakenPct effect missing — fixture is stale'
    );
});
/** W2 counterfactual: drop the Annihilation-State gate — the nearest wrong model (the prior ungated
 *  encoding), which spreads the proc + debuff across the WHOLE fight instead of the 9s window. */
const awUngated = withPatchedOverride(SLUG, (ov) => {
  const b = findBlock(
    ov.skill1,
    (x) =>
      x.trigger?.kind === 'hitCount' &&
      x.requiresTargetStatus === 'Annihilation State',
    'S1 ATF'
  );
  delete b.requiresTargetStatus;
});
/** W1 reference: remove the S1 50-hit 471.86% block entirely. */
const awNoS1Nuke = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (x: any) => !(x.trigger?.kind === 'hitCount' && x.trigger?.count === 50)
  );
  if (ov.skill1.length === before)
    throw new Error('asuka-wille S1 50-hit block missing — fixture is stale');
});
/** W3 counterfactual: drop the ownBurstGate so the FB-entry buff fires on EVERY Full Burst
 *  (including the co-B3's rotations) — the nearest wrong model it must discriminate against. */
const awFbEnter = withPatchedOverride(SLUG, (ov) => {
  const b = findBlock(
    ov.skill2,
    (x) =>
      hasStat(x, 'attackDamagePct') &&
      x.effects.some((e: any) => e.value === 30.97),
    'S2 30.97'
  );
  delete b.ownBurstGate;
});
/** W11 reference: strip the consumeAmmo ammo-dump from Emergency Repair. */
const awNoAmmoDump = withPatchedOverride(SLUG, (ov) => {
  const b = findBlock(
    ov.skill2,
    (x) => hasKind(x, 'consumeAmmo'),
    'S2 consumeAmmo'
  );
  const before = b.effects.length;
  b.effects = b.effects.filter((e: any) => e.kind !== 'consumeAmmo');
  if (b.effects.length === before)
    throw new Error(
      'asuka-wille S2 consumeAmmo effect missing — fixture is stale'
    );
});
/** W5 reference: strip the reloadSpeedPct 60 window from Emergency Repair. */
const awNoReloadSpeed = withPatchedOverride(SLUG, (ov) => {
  const b = findBlock(
    ov.skill2,
    (x) => hasStat(x, 'reloadSpeedPct'),
    'S2 reloadSpeed'
  );
  const before = b.effects.length;
  b.effects = b.effects.filter((e: any) => e.stat !== 'reloadSpeedPct');
  if (b.effects.length === before)
    throw new Error(
      'asuka-wille S2 reloadSpeedPct effect missing — fixture is stale'
    );
});
/** W6 reference: strip the burst normalAttackPct -40 self-nerf. */
const awNoNormalDebuff = withPatchedOverride(SLUG, (ov) => {
  const b = findBlock(
    ov.burst,
    (x) => hasStat(x, 'normalAttackPct'),
    'BU normalAttackPct'
  );
  const before = b.effects.length;
  b.effects = b.effects.filter((e: any) => e.stat !== 'normalAttackPct');
  if (b.effects.length === before)
    throw new Error(
      'asuka-wille burst normalAttackPct effect missing — fixture is stale'
    );
});
/** W7 reference: strip the burst instantReload 0.21. */
const awNoInstantReload = withPatchedOverride(SLUG, (ov) => {
  const b = findBlock(
    ov.burst,
    (x) => hasKind(x, 'instantReload'),
    'BU instantReload'
  );
  const before = b.effects.length;
  b.effects = b.effects.filter((e: any) => e.kind !== 'instantReload');
  if (b.effects.length === before)
    throw new Error(
      'asuka-wille burst instantReload effect missing — fixture is stale'
    );
});
/** W8 reference: strip the burst casterAtkPct 46.8 (the big ATK line). */
const awNoCasterAtk = withPatchedOverride(SLUG, (ov) => {
  const b = findBlock(
    ov.burst,
    (x) => hasStat(x, 'casterAtkPct'),
    'BU casterAtkPct'
  );
  const before = b.effects.length;
  b.effects = b.effects.filter((e: any) => e.stat !== 'casterAtkPct');
  if (b.effects.length === before)
    throw new Error(
      'asuka-wille burst casterAtkPct effect missing — fixture is stale'
    );
});
/** W9 reference: strip the burst attackDamagePct 36. */
const awNoBurstAtkDmg = withPatchedOverride(SLUG, (ov) => {
  const b = findBlock(
    ov.burst,
    (x) =>
      x.effects.some(
        (e: any) => e.stat === 'attackDamagePct' && e.value === 36
      ),
    'BU attackDamagePct36'
  );
  b.effects = b.effects.filter(
    (e: any) => !(e.stat === 'attackDamagePct' && e.value === 36)
  );
});
/** W10 reference: remove the Annihilation finisher block. */
const awNoFinisher = withPatchedOverride(SLUG, (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (x: any) =>
      !x.effects.some((e: any) => e.kind === 'flatDamage' && e.atkPct === 198.6)
  );
  if (ov.burst.length === before)
    throw new Error(
      'asuka-wille burst finisher block missing — fixture is stale'
    );
});
/** W10 magnitude counterfactual: finisher at a SINGLE Anti A.T. Field stack (6.62%), not the 30-cap. */
const awSingleStack = withPatchedOverride(SLUG, (ov) => {
  const b = findBlock(
    ov.burst,
    (x) =>
      x.effects.some((e: any) => e.kind === 'flatDamage' && e.atkPct === 198.6),
    'BU finisher'
  );
  b.effects.find((e: any) => e.kind === 'flatDamage').atkPct = 6.62;
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noAtfDebuff = run({ [SLUG]: awNoAtfDebuff });
const ungated = run({ [SLUG]: awUngated });
const noS1Nuke = run({ [SLUG]: awNoS1Nuke });
const fbEnter = run({ [SLUG]: awFbEnter });
const noReloadSpeed = run({ [SLUG]: awNoReloadSpeed });
const noAmmoDump = run({ [SLUG]: awNoAmmoDump });
const noNormalDebuff = run({ [SLUG]: awNoNormalDebuff });
const noInstantReload = run({ [SLUG]: awNoInstantReload });
const noCasterAtk = run({ [SLUG]: awNoCasterAtk });
const noBurstAtkDmg = run({ [SLUG]: awNoBurstAtkDmg });
const noFinisher = run({ [SLUG]: awNoFinisher });
const singleStack = run({ [SLUG]: awSingleStack });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const awDmg = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  dmg(evs).filter((d) => d.slug === SLUG && d.srcSlot === srcSlot);
const awNormalDmg = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === SLUG && d.bucket === 'normal');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const awBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === SLUG);
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e): e is FBStart => e.kind === 'fullBurstStart');
const awReloads = (evs: SimEvent[]) =>
  evs.filter((e): e is Reload => e.kind === 'reload' && e.slug === SLUG);
const sum = (t: Record<string, number>) =>
  Object.values(t).reduce((a, b) => a + b, 0);
/** asuka-wille self-buffs from a given caster slot at an exact value. */
const awSelfBuff = (evs: SimEvent[], stat: string, value: number) =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === AW &&
      b.targetIdx === AW &&
      b.stat === stat &&
      b.value === value
  );

describe('asuka-wille (Asuka: WILLE) — kit spec', () => {
  it('fixture sanity: she casts bursts, but NOT every Full Burst (two B3 in the comp)', () => {
    expect(awBursts(base.events).length).toBeGreaterThan(0);
    expect(fbStarts(base.events).length).toBeGreaterThan(
      awBursts(base.events).length
    );
  });

  describe('W1 — S1 50-hit rider: 471.86% final ATK additional damage', () => {
    const riders = awDmg(base.events, 'skill1').filter(
      (d) => d.atkPct === 471.86
    );
    it('lands at the kit magnitude on the skill1 slot', () => {
      expect(riders.length).toBeGreaterThan(0);
      expect([...new Set(riders.map((d) => d.atkPct))]).toEqual([471.86]);
    });
    it('DISCRIMINATING: removing the 50-hit block eliminates every 471.86% hit', () => {
      expect(
        awDmg(noS1Nuke.events, 'skill1').filter((d) => d.atkPct === 471.86)
          .length
      ).toBe(0);
    });
  });

  describe('W2 — S1 Anti A.T. Field: 15.62% rider + boss Damage-Taken debuff, GATED to the 9s Annihilation State window (consumed at state-end)', () => {
    const debuff = buffs(base.events).filter(
      (b) => b.stat === 'damageTakenPct'
    );
    // Annihilation State windows: [her burstCast, +9s]. The burst inflicts targetStatus
    // 'Annihilation State' (9s) which gates the S1 proc; the finisher consumes the status at
    // state-end, so the proc + debuff live ONLY inside these windows.
    const windows = awBursts(base.events).map(
      (c) => [c.frame, c.frame + 9 * FPS] as const
    );
    const inWindow = (f: number) => windows.some(([a, b]) => f >= a && f <= b);
    const rider = awDmg(base.events, 'skill1').filter(
      (d) => d.atkPct === 15.62
    );

    it('applies the debuff to the BOSS (targetIdx null) at 0.83% per stack, capping at 30', () => {
      expect(debuff.length).toBeGreaterThan(0);
      for (const b of debuff) expect(b.targetIdx).toBeNull();
      expect([...new Set(debuff.map((b) => b.value))]).toEqual([0.83]);
      expect([...new Set(debuff.map((b) => b.maxStacks))]).toEqual([30]);
      expect(Math.max(...debuff.map((b) => b.stacks))).toBe(30);
    });
    it('the debuff life is the 9s window (consumed at state-end), NOT the nominal 30s', () => {
      // The prose says 30s but the status is REMOVED by the finisher at ~9s, so the effective
      // duration encoded is 9s. A 30s persistence (the prior encoding) keeps the debuff near-permanent.
      for (const b of debuff) expect(b.expiresFrame! - b.frame).toBe(9 * FPS);
    });
    it('the 15.62% rider fires ONLY inside the Annihilation State windows (state-gated)', () => {
      expect(rider.length).toBeGreaterThan(0);
      expect(rider.filter((d) => !inWindow(d.frame)).map((d) => d.sec)).toEqual(
        []
      );
    });
    it('DISCRIMINATING: dropping the gate spreads the rider across the whole fight (the prior wrong model)', () => {
      const ungatedRider = awDmg(ungated.events, 'skill1').filter(
        (d) => d.atkPct === 15.62
      );
      expect(ungatedRider.length).toBeGreaterThan(rider.length);
      expect(ungatedRider.some((d) => !inWindow(d.frame))).toBe(true);
    });
    it('DISCRIMINATING: the debuff amplifies the WHOLE team — removing it drops the team total', () => {
      expect(sum(base.totals)).toBeGreaterThan(sum(noAtfDebuff.totals));
    });
  });

  describe('W3 — S2 FB-entry Attack Damage ▲30.97% / 10s is fullBurstEnter + ownBurstGate:cast, NOT a bare fullBurstEnter (TIER 2)', () => {
    const applied = awSelfBuff(base.events, 'attackDamagePct', 30.97);
    it('fires at FB entry on HER OWN rotations only (count == her burst-cast count), self-scoped, for 10s', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect(applied.length).toBe(awBursts(base.events).length);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });
    it('DISCRIMINATING: a bare fullBurstEnter (ownBurstGate dropped) fires on EVERY FB entry — strictly more', () => {
      const fbApplied = awSelfBuff(fbEnter.events, 'attackDamagePct', 30.97);
      expect(fbApplied.length).toBeGreaterThan(applied.length);
      expect(fbApplied.length).toBe(fbStarts(fbEnter.events).length);
    });
  });

  describe('W4 — S2 Emergency Repair heal is a 3-tick self recovery emitter (damage-inert here)', () => {
    it('is present as a heal effect with ticks:3 / intervalSec:1 (prose: every 1s over 3s)', () => {
      // Structural PIN: the heal is damage-inert in this comp (self-targeted, asuka-wille has no
      // recovery block and the SimEvent union surfaces no recovery event), so the encoding is
      // asserted on the override shape, not the log.
      const ov: any = withPatchedOverride(SLUG, () => {});
      const blk = ov.skill2.find((x: any) => hasKind(x, 'heal'));
      expect(blk, 'Emergency Repair heal block missing').toBeTruthy();
      const heal = blk.effects.find((e: any) => e.kind === 'heal');
      expect(heal.ticks).toBe(3);
      expect(heal.intervalSec ?? 1).toBe(1);
    });
  });

  describe('W5 — S2 Emergency Repair reload speed fixed ▲60% (10.5s window proxy ⚑3)', () => {
    const applied = awSelfBuff(base.events, 'reloadSpeedPct', 60);
    it('applies reloadSpeedPct 60 to herself for the 10.5s window', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([60]);
      for (const b of applied)
        expect(b.expiresFrame! - b.frame).toBe(Math.round(10.5 * FPS));
    });
    it('DISCRIMINATING: stripping the window removes every reloadSpeedPct application', () => {
      expect(
        awSelfBuff(noReloadSpeed.events, 'reloadSpeedPct', 60).length
      ).toBe(0);
    });
  });

  describe('W6 — burst Annihilation State: Normal Attack Mult ▼40% / 9s (a SELF-NERF)', () => {
    const applied = awSelfBuff(base.events, 'normalAttackPct', -40);
    it('applies -40% to her own normals for 9s', () => {
      expect(applied.length).toBe(awBursts(base.events).length);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(9 * FPS);
    });
    it('DISCRIMINATING: removing the nerf INCREASES her normal-bucket damage', () => {
      const baseNormal = awNormalDmg(base.events).reduce(
        (a, d) => a + d.amount,
        0
      );
      const freedNormal = awNormalDmg(noNormalDebuff.events).reduce(
        (a, d) => a + d.amount,
        0
      );
      expect(freedNormal).toBeGreaterThan(baseNormal);
    });
  });

  describe('W7 — burst Annihilation State: Reloads 21% magazine (instantReload 0.21)', () => {
    it('is encoded on the burst block (structural PIN)', () => {
      const ov: any = withPatchedOverride(SLUG, () => {});
      const blk = ov.burst.find((x: any) => hasKind(x, 'instantReload'));
      expect(blk, 'burst instantReload block missing').toBeTruthy();
      expect(
        blk.effects.find((e: any) => e.kind === 'instantReload').fraction
      ).toBe(0.21);
    });
    it('perturbs her reload cadence vs stripping it (not byte-identical)', () => {
      // The 21% top-up delays her next magazine reload; observable as a shift in reload timing.
      const baseReloads = awReloads(base.events).map((r) => r.frame);
      const strippedReloads = awReloads(noInstantReload.events).map(
        (r) => r.frame
      );
      expect(baseReloads).not.toEqual(strippedReloads);
    });
  });

  describe('W8 — burst Annihilation State: ATK ▲46.8% of caster ATK / 9s (the big ATK line)', () => {
    // casterAtkPct resolves to a FLAT ATK grant in `value`; the percentage is carried in the key
    // ("2:burst:casterAtkPct:46.8"), so filter on the key, not the value.
    const applied = buffs(base.events).filter(
      (b) =>
        b.casterIdx === AW &&
        b.targetIdx === AW &&
        b.stat === 'casterAtkPct' &&
        b.key.endsWith(':46.8')
    );
    it('applies 46.8% caster-ATK to herself for 9s, once per cast', () => {
      expect(applied.length).toBe(awBursts(base.events).length);
      expect(applied.length).toBeGreaterThan(0);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(9 * FPS);
    });
    it('DISCRIMINATING: removing it drops her total substantially', () => {
      expect(base.totals[SLUG]).toBeGreaterThan(noCasterAtk.totals[SLUG] * 1.1);
    });
  });

  describe('W9 — burst Annihilation State: Attack Damage ▲36% / 9s (distinct from the S2 30.97%/10s)', () => {
    const applied = awSelfBuff(base.events, 'attackDamagePct', 36);
    it('applies 36% for 9s (the 9s duration separates it from the S2 10s buff)', () => {
      expect(applied.length).toBe(awBursts(base.events).length);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(9 * FPS);
    });
    it('DISCRIMINATING: removing it drops her total', () => {
      expect(base.totals[SLUG]).toBeGreaterThan(noBurstAtkDmg.totals[SLUG]);
    });
  });

  describe('W10 — burst Annihilation finisher: 6.62% × 30-stack cap = 198.6%, delayed to state-end (lands in FB)', () => {
    const finishers = awDmg(base.events, 'burst').filter(
      (d) => d.atkPct === 198.6
    );
    it('fires once per burst cast at 198.6% in the burst bucket', () => {
      expect(finishers.length).toBe(awBursts(base.events).length);
      expect(finishers.length).toBeGreaterThan(0);
      expect([...new Set(finishers.map((d) => d.bucket))]).toEqual(['burst']);
    });
    it('LANDS at Annihilation-State end (~cast+9s) INSIDE the FB window → takes the +50% FB major (finding F2)', () => {
      // delaySec:9 flighted hit: it lands ~9s after cast, inside the Full Burst window, so it is
      // FB-boosted — the prose "after Annihilation State ends" timing, not a cast-frame hit.
      expect(finishers.every((d) => d.inFullBurst && d.fbMajorApplied)).toBe(
        true
      );
    });
    it('DISCRIMINATING (presence): removing the finisher eliminates the 198.6% hit', () => {
      expect(
        awDmg(noFinisher.events, 'burst').filter((d) => d.atkPct === 198.6)
          .length
      ).toBe(0);
    });
    it('DISCRIMINATING (magnitude): a single-stack finisher is 6.62%, NOT 198.6%', () => {
      const single = awDmg(singleStack.events, 'burst');
      expect([...new Set(single.map((d) => d.atkPct))]).toEqual([6.62]);
      expect(single.filter((d) => d.atkPct === 198.6).length).toBe(0);
    });
  });

  describe('W11 — S2 Emergency Repair "Removes 100% of ammo" is modeled (consumeAmmo at state-end)', () => {
    it('is encoded as consumeAmmo fraction:1 on the fullBurstEnd Emergency Repair block', () => {
      const ov: any = withPatchedOverride(SLUG, () => {});
      const blk = ov.skill2.find((x: any) => hasKind(x, 'consumeAmmo'));
      expect(blk, 'Emergency Repair consumeAmmo block missing').toBeTruthy();
      expect(blk.trigger.kind).toBe('fullBurstEnd');
      expect(
        blk.effects.find((e: any) => e.kind === 'consumeAmmo').fraction
      ).toBe(1);
    });
    it('DISCRIMINATING: stripping the dump perturbs her reload cadence (forced reloads gone)', () => {
      const baseReloads = awReloads(base.events).map((r) => r.frame);
      const noDumpReloads = awReloads(noAmmoDump.events).map((r) => r.frame);
      expect(baseReloads).not.toEqual(noDumpReloads);
    });
  });
});
```

## S2d INDEPENDENT VERIFICATION

```

[1m[30m[46m RUN [49m[39m[22m [36mv4.1.10 [39m[90m/Users/maxwellsutton/nikke-sim/.qwen/worktrees/kit-autonomy-batch-2026-07-24[39m

 [32m✓[39m scripts/tests/units/asuka-wille.test.ts [2m([22m[2m24 tests[22m[2m)[22m[32m 25[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m24 passed[39m[22m[90m (24)[39m
[2m   Start at [22m 23:15:31
[2m   Duration [22m 856ms[2m (transform 92ms, setup 0ms, import 736ms, tests 25ms, environment 0ms)[22m


```
