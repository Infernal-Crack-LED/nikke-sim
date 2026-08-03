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

## MECHANICS SSOT (pointers + load-bearing excerpts)

Full docs: docs/data/damage-calculation.md, docs/data/game-mechanics.md (authoritative; excerpts below are the load-bearing sections for THIS kit).

### Damage formula — buckets (docs/data/damage-calculation.md §1)

Damage is a product of independent multiplicative buckets; same-type buffs ADD within a bucket.
THE ENGINE (`dealDamage`) MATCHES THIS:

```
finalATK = staticAtk × (1 + Σ ATK%) + Σ("% of caster's ATK" flat) + Σ(HP→ATK flat)
dmg = (max(0, finalATK − enemyDEF) × weaponOrSkillCoef)   ← DEF subtracts INSIDE the base, pre-coef
    × major   [1 + crit + core + fullBurst(0.5) + range(0.3)]  ← ADDITIVE within
    × element [1 + 0.1 advantage + elem-dmg buffs]
    × charge  [charged shots only]
```

Major bucket = `1 + 0.5·FB + 0.3·range + critRate·(critBonus) + coreRate·(coreMult−1)` where
critBonus = (critDamage−100)/100 + Σ critDamagePct/100 — so a critDamagePct buff lifts the major
bracket by exactly `critRate × value/100` on every crit-eligible hit while live (the compositional
form the driver's test pins).

### V1 SCOPE LOCK (the fight every test runs)

The boss is IMMORTAL and deals NO damage to allies; allies have no HP pool. Boss DEF = 0 basis
(noise/kit-status precedent wording: "the boss deals no damage … (sim.ts, DEF=0 basis)").
Consequence for THIS kit: any 'attacked N times' counter can never accrue, and ally
Damage-Taken mitigation has no damage channel to act on.

### Burst-chain timing — MEASURED (docs/data/game-mechanics.md)

Chain: `gauge-full → 30f → B1 → 30f → B2 → 30f → B3 → 22f → FB countdown (10s)`. A Burst II
unit's cast lands ~52f BEFORE the Full Burst window opens (30f stage gap + 22f FB pre-delay), so
a buff keyed to HER burstCast opens its window pre-FB; a buff keyed to fullBurstEnter opens
strictly later. Two Burst II units in one comp: lower slot wins the stage-II slot every chain
(poli precedent; the blind-fixture hazard below).

### ENGINE: reload model (src/engine/sim.ts:271-273 + 3100-3110)

```
const reloadFramesNeeded = (base: number, buffPct: number) =>
  Math.round(base * 0.975 * Math.max(0, 1 - buffPct / 100)) + RELOAD_TAIL_FRAMES;
```

reloadSpeedPct is read live during a reload → faster reload → more shots in a fixed fight →
more gauge. Reload speed is a DAMAGE lever, not cosmetic.

### ENGINE + SCHEMA: damageTakenPct is a BOSS debuff only (src/skills/types.ts:35, src/engine/sim.ts:2143-2161)

```
| 'damageTakenPct' // debuff on the boss (positive = boss takes more)
...
if (block.target.kind === 'enemy') {
  if ((e.stat === 'damageTakenPct' || e.stat === 'distributedDamagePct') && e.value > 0) {
    applyBuff(enemyBuffs, ...);   // other enemy debuffs don't affect our damage with DEF=0
```

There is NO ally-side damage-taken stat. Encoding an ally 'Damage Taken ▼' line as
damageTakenPct inverts target AND sign direction → manufactures a phantom team damage gain.
Boss-held debuff buffApply events carry casterIdx null AND targetIdx null.

### SCHEMA: charge-damage stat flavors (src/skills/types.ts:23-24, src/engine/sim.ts:1654-1664)

```
| 'chargeDamagePct'      // additive percentage points in the charge bucket
| 'chargeDamageMultPct'  // scales by BASE charge damage (collection items, Helm's max-treasure burst)
...
charge bucket = baseCharge + baseCharge×(dollChargePct + chargeDamageMultPct)/100 + chargeDamagePct/100
```

Repo wording precedent: 'Charge Damage ▲' (a2) = additive chargeDamagePct; 'Charge Damage
Multiplier ▲' (helm burst, identical wording to admi S1) = chargeDamageMultPct.

### SCHEMA: buffApply event shape (src/types.ts:247-263)

`{kind:'buffApply', frame, sec, key, stat, value, stacks, maxStacks, casterIdx (null = unattributed),
targetIdx (null = the BOSS), targetSlug, refresh, expiresFrame (null = no wall-clock expiry),
durationShots (null = no round budget)}`.


---

## GROUND TRUTH — Admi (slug `admi`), from data/characters.json

```json
{
  "slug": "admi",
  "name": "Admi",
  "weapon": "SR",
  "burst": "II",
  "burstCooldownSec": 20,
  "class": "Supporter",
  "element": "Wind",
  "manufacturer": "Missilis",
  "normalAttackMultiplier": 67.37,
  "coreAttackMultiplier": 200,
  "ammo": 6,
  "reloadFrames": 125,
  "chargeFrames": 60,
  "chargeMultiplier": 250,
  "hitsPerShot": 1,
  "burstGaugePerShot": 2.7,
  "skills": {
    "skill1": "\u25a0 Activates when attacked 20 time(s). Affects all allies.\nCharge Damage Multiplier \u25b2 9.59% for 20 sec.",
    "skill2": "\u25a0 Affects 2 allies with the highest final ATK.\nDamage Taken \u25bc 28.65% for 10 sec.",
    "burst": "\u25a0 Affects all allies.\nReload Speed \u25b2 50.91% for 10 sec.\nCritical Damage \u25b2 28.34% for 10 sec."
  },
  "skillCooldownsSec": {
    "skill1": null,
    "skill2": 20,
    "burst": 20
  },
  "baseStats": {
    "hp": 15000,
    "atk": 500,
    "def": 84,
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
    "resourceId": 172
  }
}
```

---

## S2b TEST-FAITHFULNESS REVIEW (claude-fable-5, leak-clean)

```json
{
  "slug": "admi",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "■ Activates when attacked 20 time(s)",
      "disposition": "MEASUREMENT-GATED",
      "scope": "Trigger scope: counts ATTACKS RECEIVED (incoming boss hits), not attacks made. v1 models no incoming boss damage/HP pool, so the accrual rate (hits-taken/sec, and whether 'attacked' counts hits on Admi only vs the whole team) is outside the sim's input domain.",
      "durationSemantics": "Uptime window of the resulting buff is wall-clock 20 sec per activation (see the paired effect line). The ACCRUAL period (time to absorb 20 attacks) is the unknown.",
      "triggerIdentity": "No engine primitive counts incoming attacks (no 'attackedCount' TriggerDef). The honest encoding is `interval` with a ⚑ sec = 20 ÷ (measured boss attacks/sec), first fire at t=sec — an ALWAYS-⚑ invented-cadence field (taxonomy item 2). NOT passive, NOT fullBurstEnter, NOT hitCount (hitCount counts the OWNER'S fired rounds, the exact opposite direction).",
      "targetSet": "All allies (including self — Admi is SR/chargeFrames 60, so she self-benefits).",
      "nearestWrongModel": "Two plausible misreads: (a) trigger as `passive`/always-on — permanent 9.59% uptime instead of a duty cycle of 20s-per-accrual-period; (b) trigger as `hitCount:{count:20}` on Admi's OWN shots — with ammo 6 / reloadFrames 125 she'd cycle it far faster or slower than real boss-attack cadence, and it inverts who is being counted.",
      "distinguishingAssertion": "Under the faithful interval-⚑ model: buffApply events for the charge stat appear at t = k·intervalSec with expiresFrame ≈ apply+20s and there exist frames with NO live instance (duty cycle < 100%) whenever intervalSec > 20. Under nearest-wrong (a) the buff is live from frame 0 with no gap; under (b) buffApply count correlates with Admi's shotFired/hitCount events (assert it does NOT — patch Admi to a non-firing config via withPatchedOverride and the trigger cadence must be unchanged).",
      "inertness": "Must NOT move damage of any ally with zero charge-bucket damage (e.g. an AR/MG-only comp): totals identical with this block deleted via withPatchedOverride.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Charge Damage Multiplier ▲ 9.59% for 20 sec",
      "disposition": "FAITHFUL",
      "scope": "Charge-bucket ONLY, and specifically the MULTIPLIER flavor: the schema distinguishes `chargeDamagePct` (additive percentage points in the charge bucket) from `chargeDamageMultPct` ('Charge Damage Multiplier' — scales by BASE charge damage, the collection-item/Helm-treasure stat). The kit word 'Multiplier' selects `chargeDamageMultPct`.",
      "durationSemantics": "Wall-clock `durationSec: 20` — literal 'for 20 sec', no rounds/stacks.",
      "triggerIdentity": "Rides the skill1 attacked-20 trigger above (one block, this effect).",
      "targetSet": "`allies` including self (kit: 'Affects all allies').",
      "nearestWrongModel": "Encoding as `chargeDamagePct` (additive points on the charge percentage) instead of `chargeDamageMultPct` (scales by base charge damage) — same-looking number, different bucket math; diverges hardest on a carry whose charge multiplier is far from 100% (e.g. a high-chargeMultPct SR like the alice-style kits). Second misread: generic `attackDamagePct` (over-credits non-charge hits).",
      "distinguishingAssertion": "buffApply carries stat === 'chargeDamageMultPct' with value 9.59 (plain percentage stat, raw value). Damage delta check: with an SR/charge carry, the per-shot charge-bucket component while the buff is live scales by base-charge×1.0959 — assert the damage-event delta matches the MULT path, and that a normal-attack-only unit's totals move 0.",
      "inertness": "Zero movement on any damage event with bucket ≠ charge; zero movement out-of-window.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Damage Taken ▼ 28.65% for 10 sec",
      "disposition": "UNMODELED",
      "scope": "Defensive mitigation on ALLIES. Offensively inert at v1 scope: the boss deals no modeled damage and there is no ally HP pool.",
      "durationSemantics": "10 sec if it were modeled; moot.",
      "triggerIdentity": "No activation clause in the header → would be interval by convention; moot because the effect is defensive.",
      "targetSet": "2 allies with the highest FINAL ATK — if ever modeled, that is `alliesTopAtk {count:2, byFinalAtk:true}` (kit literally says 'final ATK', the A3 rule; plain static ranking would be wrong).",
      "nearestWrongModel": "THE trap on this line: 'Damage Taken ▼' mis-encoded via the schema's `damageTakenPct` stat — which is a BOSS debuff where POSITIVE = boss takes more damage. Any block emitting `damageTakenPct` (in either sign, on any target) turns a pure ally-defensive line into a ±28.65% swing on TEAM DAMAGE. Target-set inversion (ally mitigation → enemy vulnerability) is the shared-prior misread I most expect here.",
      "distinguishingAssertion": "Over a full run, assert ZERO buffApply events with stat === 'damageTakenPct' from Admi's slots (including boss-held debuffs, which emit casterIdx===null/targetIdx===null — filter by stat+value 28.65), AND totals(res) for every unit are identical with skill2 emptied via withPatchedOverride.",
      "inertness": "The entire line must move NOTHING. It belongs verbatim in `unmodeled.skill2`, not as a block.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "Reload Speed ▲ 50.91% for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "Reload speed — NOT a 'defensive, no damage' drop candidate: reload uptime changes shots fired for every non-infinite-ammo ally (the Grave lesson). Stat `reloadSpeedPct`.",
      "durationSemantics": "`durationSec: 10`, literal seconds.",
      "triggerIdentity": "`burstCast` — the effect sits in Admi's OWN burst block with no separate activation clause, so it fires ONLY on rotations Admi (Burst II, cd 20s) actually casts. NOT `fullBurstEnter`: with another Burst II in the team (e.g. crown in the control fixture), first-ready selection means Admi does not cast every rotation, and the two triggers diverge exactly there. Note burst-cast lands PRE-FB, so the 10s window covers the following Full Burst.",
      "targetSet": "`allies` including self ('Affects all allies').",
      "nearestWrongModel": "(a) `fullBurstEnter` — the buff fires on EVERY team Full Burst including rotations where the other B2 cast, over-crediting team reload uptime; (b) silently dropping the line as defensive/utility.",
      "distinguishingAssertion": "Count Admi's burstCast events vs buffApply events with stat 'reloadSpeedPct' value 50.91: they must be 1:1 ×5 targets, each apply frame at/near the burstCast frame (pre-fullBurstStart), and on any fullBurstStart of a rotation with NO Admi burstCast there must be NO such buffApply. Against misread (b): deleting the effect must LOWER a reload-bound ally's shot/damage total (assert strictly fewer 'reload'-cycle-limited shots — e.g. an MG/SG ally's totals drop).",
      "inertness": "No application on Full Bursts Admi did not chain into via her own cast.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Critical Damage ▲ 28.34% for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "GENERIC Critical Damage — the kit line carries no 'of normal attacks' scoping, so plain `critDamagePct` is correct (the scoped-stat trap runs the OTHER way here: over-narrowing to a normal-only scope would under-credit skill/burst crits).",
      "durationSemantics": "`durationSec: 10`, literal seconds — a separate effect in the same block, same window as the reload line.",
      "triggerIdentity": "`burstCast` (same block as the reload line; same divergence-vs-`fullBurstEnter` argument).",
      "targetSet": "`allies` including self.",
      "nearestWrongModel": "(a) `fullBurstEnter` keying (over-fires in dual-B2 comps); (b) mis-stat as `critRatePct` (rate vs damage — changes the crit ROLL frequency instead of the crit multiplier); (c) permanent/duration-omitted.",
      "distinguishingAssertion": "buffApply events with stat === 'critDamagePct' value 28.34 (raw percentage), expiresFrame ≈ castFrame + 10×60, one per ally per Admi burstCast, and ZERO buffApply with stat 'critRatePct' from Admi. Crit-eligible damage events inside the window show the lifted crit multiplier; a damage event after expiry does not.",
      "inertness": "No crit-RATE movement; no application outside Admi's own cast rotations; nothing past the 10s window.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:attacked-20-trigger+chargeDamageMultPct-9.59-20s",
    "burst:reloadSpeedPct-50.91-10s",
    "burst:critDamagePct-28.34-10s"
  ],
  "unmodeledVerbatim": {
    "skill1": [],
    "skill2": [
      "Damage Taken ▼ 28.65% for 10 sec."
    ],
    "burst": []
  },
  "notes": "Three reconciliation points for the driver. (1) skill1's trigger is the hard part: 'when attacked 20 time(s)' counts INCOMING hits, which v1 does not simulate — the only honest encoding is an interval with a ⚑ cadence derived from measured boss attack rate (state the recipe: boss attacks/sec from footage × 20 → intervalSec; also resolve whether 'attacked' counts hits on Admi alone or the whole team, which changes the period). Expect the shared-prior misread to be passive/always-on, which over-credits uptime whenever the accrual period exceeds ~0s duty-cycle-neutral point; a driver test that never asserts a NO-buff gap window cannot catch it. (2) skill1's stat word is 'Multiplier' — chargeDamageMultPct (scales base charge damage), not additive chargeDamagePct; a test asserting only 'some charge buff exists' passes both encodings. (3) skill2 is the inversion trap: the schema's damageTakenPct is a BOSS-takes-more debuff, so any attempt to 'model' the ally mitigation with that stat manufactures a large phantom team-damage swing — the test must assert total inertness of skill2, not merely skip it. Burst trigger identity (burstCast vs fullBurstEnter) only discriminates in a comp with a second Burst II unit; the default controlComp fixes crown at B2, so the driver must either build a variant comp or assert the burstCast→buffApply 1:1 frame pairing to make the distinction observable.",
  "model": "claude-fable-5"
}

```

---

## S5 BLIND TEST (claude-opus-5, written from kit prose ALONE) — ADAPTED variant that was EXECUTED

The raw S5 output (scripts/kit-autonomy/blind/admi.test.ts) could not run: it iterates
`ov.skill1.blocks`/`ov.burst.blocks` (no such schema wrapper), fields controlComp('admi', true)
in which crown (also Burst II, slot 1) wins EVERY stage-II cast leaving admi 0 bursts (the poli
blind-fixture hazard), and reads team-wide buff streams that its own fixture mates pollute
(crown reloadSpeedPct 44.35, liter atkPct, helm chargeDamageMultPct). The adapted variant below
fixes ONLY those four mechanical bugs (fixture → liter/admi/modernia/helm sole-B2 comp, .blocks
removed, reads attributed to admi's casterIdx, durationShots null-vs-undefined); every assertion
INTENT is untouched. The skill1 group is left as S5 wrote it — its REDness vs the driver is the
genuine posture divergence, not an adaptation artifact.

```ts
import { describe, expect, it } from 'vitest';
import type { Element, SimEvent } from '../../../src/types.js';
import {
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

/*
 * admi — S5 BLIND test, ADAPTED for execution against the driver override.
 *
 * The raw S5 output (admi.test.ts) is committed verbatim; this adapted variant carries
 * THREE mechanical repairs, each preserving assertion INTENT (ade-agent-bunny precedent):
 *
 *  A1. FIXTURE BUG (the exact hazard S2b pre-warned, and the poli judge later ruled on):
 *      raw S5 fields controlComp('admi', true) = liter/crown/admi/helm. crown is ALSO
 *      Burst II (20s CD) at slot 1 vs admi slot 2 — lower-slot-first selection gives
 *      crown ALL stage-II casts, leaving admi ZERO bursts and every burst assertion
 *      vacuous/RED for fixture reasons. Adapted comp: liter/admi/modernia/helm (poli
 *      precedent) — admi is the SOLE Burst II and casts every chain.
 *  A2. SHAPE BUG: raw S5 iterates `ov.skill1.blocks` / `ov.burst.blocks` — the override
 *      schema has no `.blocks` wrapper; skill1/skill2/burst ARE the block arrays.
 *  A3. ATTRIBUTION BUG: raw S5 reads team-wide buffApply streams by stat alone, but its
 *      own fixture mates emit confounding values (crown reloadSpeedPct 44.35, liter
 *      atkPct, helm chargeDamageMultPct; modernia critDamagePct + atkPct in the adapted
 *      comp). Every assertion's INTENT is about what ADMI grants — the adapted reads
 *      attribute by casterIdx === admi's slot (the driver test does the same). The two
 *      skill2 absence assertions keep their team-wide scope — their intent IS global
 *      ('this fight emits no damageTakenPct at all').
 *  A4. SHAPE BUG 2: raw S5 asserts `durationShots` is `undefined` on wall-clock buffs —
 *      the engine's buffApply carries `durationShots: null` for 'no round budget'
 *      (types.ts L262). Intent preserved: assert null-or-undefined (falsy check).
 *
 * The skill1 group is left EXACTLY as S5 wrote it (shape-fixed only): S5 modeled S1 as
 * an encoded block, the driver ships it UNMODELED (⚑1: 'attacked 20 times' is an
 * incoming-damage trigger the v1 sim cannot accrue — noise/yulha precedent). That group
 * is the genuine RED-vs-driver signal for the S7 judge, not an adaptation artifact.
 */

const ADM = 1; // slot order: liter 0 / admi 1 / modernia 2 / helm 3

const ADAMI_COMP = {
  slugs: ['liter', 'admi', 'modernia', 'helm'],
  bossElement: 'Fire' as Element,
  focusSlug: 'admi',
};

/** buffApply events attributed to ADMI (A3). */
const BUFF_ADMI = (evs: SimEvent[], stat: string) =>
  evs.filter(
    (e) =>
      e.kind === 'buffApply' &&
      (e as any).stat === stat &&
      (e as any).casterIdx === ADM,
  ) as any[];
/** buffApply events by stat, any caster (the global skill2 absence pins). */
const BUFF = (evs: SimEvent[], stat: string) =>
  evs.filter((e) => e.kind === 'buffApply' && (e as any).stat === stat) as any[];

function run(overrides: Record<string, any> = {}) {
  const evs: SimEvent[] = [];
  const res = runComp({ ...ADAMI_COMP, overrides, cfg: { onEvent: (e: SimEvent) => evs.push(e) } });
  return { res, evs };
}

// ---- hoisted runs (each is a full 180s sim) -------------------------------

const base = run();

// Nearest-wrong for skill1 SCOPE: additive charge-damage points instead of the
// base-charge-scaled multiplier the prose names ("Charge Damage Multiplier").
const wrongChargeStat = run({
  admi: withPatchedOverride('admi', (ov) => {
    for (const b of ov.skill1!) {
      for (const e of b.effects as any[]) {
        if (e.kind === 'buff' && e.stat === 'chargeDamageMultPct') e.stat = 'chargeDamagePct';
      }
    }
  }),
});

// Nearest-wrong for skill1 TARGET SET: self-only instead of "all allies".
const wrongChargeTarget = run({
  admi: withPatchedOverride('admi', (ov) => {
    for (const b of ov.skill1!) {
      if ((b.effects as any[]).some((e) => e.stat === 'chargeDamageMultPct'))
        b.target = { kind: 'self' };
    }
  }),
});

// Nearest-wrong for skill1 TRIGGER IDENTITY: a plain always-on passive instead of a
// counted activation. A passive is live from frame 0 and never lapses.
const wrongChargeTrigger = run({
  admi: withPatchedOverride('admi', (ov) => {
    for (const b of ov.skill1!) {
      if ((b.effects as any[]).some((e) => e.stat === 'chargeDamageMultPct'))
        b.trigger = { kind: 'passive' };
    }
  }),
});

// Nearest-wrong for the burst crit line: generic crit RATE instead of crit DAMAGE.
const wrongCritStat = run({
  admi: withPatchedOverride('admi', (ov) => {
    for (const b of ov.burst!) {
      for (const e of b.effects as any[]) {
        if (e.kind === 'buff' && e.stat === 'critDamagePct') e.stat = 'critRatePct';
      }
    }
  }),
});

// Nearest-wrong for the burst TARGET SET: self-only instead of "all allies".
const wrongBurstTarget = run({
  admi: withPatchedOverride('admi', (ov) => {
    for (const b of ov.burst!) b.target = { kind: 'self' };
  }),
});

// Reload-speed removed entirely — isolates the reload line's shot-economy footprint.
const noReload = run({
  admi: withPatchedOverride('admi', (ov) => {
    for (const b of ov.burst!)
      b.effects = (b.effects as any[]).filter((e) => e.stat !== 'reloadSpeedPct');
  }),
});

describe('admi — skill1: charge damage multiplier, all allies, counted activation', () => {
  it('emits a chargeDamageMultPct buff at the kit magnitude 9.59', () => {
    const evs = BUFF_ADMI(base.evs, 'chargeDamageMultPct');
    expect(evs.length).toBeGreaterThan(0);
    // Plain percentage stats keep their raw kit value (not caster-scaled/flat-resolved).
    for (const e of evs) expect(e.value).toBeCloseTo(9.59, 5);
  });

  it('is a MULTIPLIER on base charge damage, not additive charge-damage points', () => {
    // Nearest-wrong: chargeDamagePct. The two stats enter different buckets, so a
    // faithful model and the wrong one cannot produce identical team damage.
    expect(BUFF_ADMI(wrongChargeStat.evs, 'chargeDamageMultPct')).toHaveLength(0);
    expect(BUFF_ADMI(wrongChargeStat.evs, 'chargeDamagePct').length).toBeGreaterThan(0);
    expect(totals(wrongChargeStat.res)).not.toEqual(totals(base.res));
  });

  it('affects ALL allies, not just admi (>1 distinct buff target)', () => {
    const targets = new Set(BUFF_ADMI(base.evs, 'chargeDamageMultPct').map((e) => e.targetSlug));
    expect(targets.size).toBeGreaterThan(1);
    expect(targets.has('admi')).toBe(true);
    // Nearest-wrong: self-only. Must collapse to exactly one target.
    const wrongTargets = new Set(
      BUFF_ADMI(wrongChargeTarget.evs, 'chargeDamageMultPct').map((e) => e.targetSlug),
    );
    expect(wrongTargets.size).toBe(1);
  });

  it('carries a 20 sec window, not permanent (expiresFrame is finite and ~20s out)', () => {
    const [first] = BUFF_ADMI(base.evs, 'chargeDamageMultPct');
    expect(first).toBeDefined();
    expect(Number.isFinite(first.expiresFrame)).toBe(true);
    // 20 sec at 60fps = 1200 frames after apply. durationShots must be absent —
    // the prose says "sec", not "round(s)".
    expect(first.durationShots).toBeUndefined();
  });

  it('NON-VACUITY: the counted activation fires LATER than frame 0 (not an always-on passive)', () => {
    // The header is an activation clause ("Activates when attacked N time(s)"), so the
    // first application must be strictly after battle start. A passive model applies at 0.
    const [first] = BUFF_ADMI(base.evs, 'chargeDamageMultPct');
    expect(first.expiresFrame).toBeGreaterThan(0);
    const [wrongFirst] = BUFF_ADMI(wrongChargeTrigger.evs, 'chargeDamageMultPct');
    expect(wrongFirst).toBeDefined();
    // The wrong (passive) model must differ observably from the faithful one.
    expect(totals(wrongChargeTrigger.res)).not.toEqual(totals(base.res));
  });

  it('INERTNESS: skill1 moves no crit/ATK stat of its own', () => {
    const s1Stats = new Set(
      BUFF_ADMI(base.evs, 'chargeDamageMultPct').map((e) => e.stat),
    );
    expect([...s1Stats]).toEqual(['chargeDamageMultPct']);
  });
});

describe('admi — skill2: Damage Taken reduction on 2 highest-final-ATK allies', () => {
  it('emits NO boss damageTakenPct debuff (this is an ally-side defensive line)', () => {
    // "Damage Taken ▼" on ALLIES is damage the allies receive. The schema's
    // damageTakenPct is a BOSS debuff where positive = boss takes MORE. Encoding this
    // line as damageTakenPct would be a sign error that hands the team free damage.
    // (Intent is GLOBAL: no such debuff anywhere in the fight.)
    const boss = (base.evs.filter(
      (e) => e.kind === 'buffApply' && (e as any).casterIdx === null && (e as any).targetIdx === null,
    ) as any[]).filter((e) => e.stat === 'damageTakenPct');
    expect(boss).toHaveLength(0);
    const anyDt = BUFF(base.evs, 'damageTakenPct');
    expect(anyDt).toHaveLength(0);
  });

  it.skip('GAP: ally-side Damage Taken ▼28.65%/10s is unrepresentable and offensively inert', () => {
    // No primitive: the sim has no ally HP pool and the boss deals no damage at scope
    // lock, so an ally damage-taken reduction has zero damage channel. The schema has no
    // ally-scoped damage-taken stat (damageTakenPct is explicitly the boss debuff).
    // Belongs in the override's `unmodeled.skill2`, not as a block.
  });

  it.skip('GAP: "2 allies with the highest final ATK" target-set selection is unobservable here', () => {
    // alliesTopAtk{count:2, byFinalAtk:true} is the correct target primitive (the prose
    // says "final ATK" literally), but with no representable payload to attach there is
    // nothing to assert on. Re-enable if an ally-side damage-taken stat ever lands.
  });
});

describe('admi — burst: Reload Speed + Critical Damage, all allies, 10 sec', () => {
  it('emits reloadSpeedPct 50.91 and critDamagePct 28.34 at kit magnitudes', () => {
    const rl = BUFF_ADMI(base.evs, 'reloadSpeedPct');
    const cd = BUFF_ADMI(base.evs, 'critDamagePct');
    expect(rl.length).toBeGreaterThan(0);
    expect(cd.length).toBeGreaterThan(0);
    for (const e of rl) expect(e.value).toBeCloseTo(50.91, 5);
    for (const e of cd) expect(e.value).toBeCloseTo(28.34, 5);
  });

  it('the crit line is Critical DAMAGE, not Critical RATE', () => {
    // Nearest-wrong: critRatePct. Crit damage scales the crit bucket; crit rate changes
    // how often hits crit — different math, different totals.
    expect(BUFF_ADMI(wrongCritStat.evs, 'critDamagePct')).toHaveLength(0);
    expect(totals(wrongCritStat.res)).not.toEqual(totals(base.res));
  });

  it('both burst lines affect ALL allies, not just admi', () => {
    const rlTargets = new Set(BUFF_ADMI(base.evs, 'reloadSpeedPct').map((e) => e.targetSlug));
    const cdTargets = new Set(BUFF_ADMI(base.evs, 'critDamagePct').map((e) => e.targetSlug));
    expect(rlTargets.size).toBeGreaterThan(1);
    expect(cdTargets.size).toBeGreaterThan(1);
    expect(rlTargets.has('admi')).toBe(true);
    expect(cdTargets.has('admi')).toBe(true);
    const wrongCd = new Set(BUFF_ADMI(wrongBurstTarget.evs, 'critDamagePct').map((e) => e.targetSlug));
    expect(wrongCd.size).toBe(1);
    expect(totals(wrongBurstTarget.res)).not.toEqual(totals(base.res));
  });

  it('burst buffs are keyed to admi CASTING her burst (Burst II), not to any Full Burst', () => {
    // TRIGGER IDENTITY: the lines sit in admi's OWN burst block with no "entering Full
    // Burst" clause, so they must apply on her burstCast. Applies must not exceed the
    // number of bursts admi actually cast.
    const casts = base.evs.filter(
      (e) => e.kind === 'burstCast' && (e as any).slug === 'admi',
    ).length;
    expect(casts).toBeGreaterThan(0);
    const applyRounds = new Set(
      BUFF_ADMI(base.evs, 'critDamagePct').map((e) => e.expiresFrame),
    );
    expect(applyRounds.size).toBeLessThanOrEqual(casts);
  });

  it('the 10 sec windows are time-bounded, not round-bounded or permanent', () => {
    for (const e of [...BUFF_ADMI(base.evs, 'reloadSpeedPct'), ...BUFF_ADMI(base.evs, 'critDamagePct')]) {
      expect(Number.isFinite(e.expiresFrame)).toBe(true);
      expect(e.durationShots == null, 'no round budget (null or undefined)').toBe(true);
    }
  });

  it('Reload Speed is a live shot-economy lever, not a cosmetic stat', () => {
    // Faster reload => more shots fired => strictly more team damage than with the line
    // stripped. Guards against the "defensive/utility, skip it" failure mode.
    const withRl = Object.values(totals(base.res)).reduce((a, b) => a + b, 0);
    const without = Object.values(totals(noReload.res)).reduce((a, b) => a + b, 0);
    expect(withRl).toBeGreaterThan(without);
  });

  it('INERTNESS: admi grants no ATK buff of any kind', () => {
    for (const stat of ['atkPct', 'casterAtkPct', 'highestAllyAtkPct', 'atkOfMaxHpPct']) {
      expect(BUFF_ADMI(base.evs, stat)).toHaveLength(0);
    }
  });

  it('INERTNESS: admi deals no rider/DoT damage — all her damage is her own weapon', () => {
    const dmg = base.evs.filter(
      (e) => e.kind === 'damage' && (e as any).slug === 'admi',
    ) as any[];
    expect(dmg.length).toBeGreaterThan(0);
    // The kit has no flatDamage/dot/storedHit line at all.
    for (const d of dmg) expect(['normal', 'charge', 'core', 'crit']).toContain(String(d.bucket ?? 'normal'));
    expect(unitOf(base.res, 'admi').totalDamage).toBeGreaterThan(0);
  });
});

```

## S5 BLIND TEST vs DRIVER OVERRIDE — result

17 tests: 9 GREEN / 6 RED / 2 skipped (S5's own GAP skips).
GREEN: the whole skill2 group (no damageTakenPct anywhere — the inversion trap avoided) and the
whole burst group (reloadSpeedPct 50.91 + critDamagePct 28.34 at kit magnitudes, all allies
including admi, burstCast-keyed, 10s wall-clock windows, reload proven a live shot-economy lever,
no ATK buffs, no rider damage).
RED — all six are the SAME divergence, the skill1 group: S5 encoded S1 as a modelled block
(chargeDamageMultPct 9.59, all allies, 20s, fired later than frame 0); the driver ships S1
UNMODELED + ⚑ (the 'attacked 20 times' counter cannot accrue at scope lock; noise/yulha
precedent), so zero chargeDamageMultPct applications exist and every S1 assertion fails.

---

## S6 BLIND OVERRIDE (claude-opus-5, re-derived from kit prose ALONE)

```json
{
  "slug": "admi",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "interval",
        "sec": 20
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "chargeDamageMultPct",
          "value": 9.59,
          "durationSec": 20
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "passive"
      },
      "target": {
        "kind": "alliesTopAtk",
        "count": 2,
        "byFinalAtk": true
      },
      "effects": []
    }
  ],
  "burst": [
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
          "stat": "reloadSpeedPct",
          "value": 50.91,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "critDamagePct",
          "value": 28.34,
          "durationSec": 10
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [],
    "skill2": [
      "\u25a0 Affects 2 allies with the highest final ATK. Damage Taken \u25bc 28.65% for 10 sec."
    ],
    "burst": []
  },
  "caveats": [
    "\u2691 S1 trigger: kit says \"Activates when attacked 20 time(s)\" \u2014 an INCOMING-hit counter the sim has no channel for (the scope-lock boss's attack cadence on this unit is unmodeled). Encoded as interval:20s as a stand-in; the real re-fire cadence is UNMEASURED and the 20s duration means uptime is ~100% if the boss lands 20 hits per 20s and much lower if not.",
    "\u2691 S1 stat routing: \"Charge Damage Multiplier \u25b2\" is read as chargeDamageMultPct (scales BASE charge damage, the multiplier lane), NOT the additive chargeDamagePct lane. Wording match is on \"Multiplier\"; unconfirmed against a popup.",
    "S2 Damage Taken \u25bc on ALLIES is a defensive mitigation \u2014 no HP pool at scope lock, so it is offensively inert; kept as an empty-effect block so the target set (2 highest FINAL ATK allies) stays auditable, and listed in unmodeled verbatim. Note damageTakenPct in the schema is the BOSS-side debuff (positive = boss takes more); an ally-side incoming-damage reduction is a different sign and a different consumer, so it is NOT encoded with that stat.",
    "Burst is keyed to burstCast (this unit's own Burst II cast), not fullBurstEnter \u2014 the block sits in her own burst slot with no \"entering Full Burst\" clause."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS \u2014 NOT a validated model). Every \u2691 below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Admi (SR/Wind/Supporter/Burst II) is a pure buffer: no self damage lines, no weapon swap, no DoT, no stacks. S1 grants an all-ally Charge Damage Multiplier \u25b29.59%/20s off an incoming-hit counter (\u2691 stand-in trigger). S2 is a defensive Damage Taken \u25bc on the 2 highest-final-ATK allies \u2014 inert at scope lock (no HP pool), retained as a target-only block. Burst grants all allies Reload Speed \u25b250.91% + Critical Damage \u25b228.34% for 10s; reload speed is NOT skippable (it gates shots fired).",
  "hasPierce": false
}
```

## DRIVER vs S6-BLIND OVERRIDE — diff summary (driver = src/skills/overrides/admi.json below)

- burst: BYTE-IDENTICAL — one burstCast block, target allies, reloadSpeedPct 50.91/10s +
  critDamagePct 28.34/10s. Full four-way convergence (driver = S2b = S5 = S6).
- skill1: S6 ships interval:{sec:20} allies chargeDamageMultPct 9.59/20s — a documented ⚑
  stand-in (S6's own flag: "sec:20 chosen so the 20s buff has ~100% uptime (optimistic-but-
  plausible), NOT because 20 attacks are known to take 20s … OVER-CREDITS if the boss's attack
  cadence is slower"). Driver ships UNMODELED verbatim + ⚑1 with estimate+recipe+tier — no
  fabricated cadence constant (measured > fudge; noise/yulha landed precedent for 'attacked
  N times' lines).
- skill2: S6 ships a passive alliesTopAtk{count:2, byFinalAtk:true} block with EMPTY effects
  ("carried for auditability"); its own audit marks the Damage Taken line SKIPPED → verbatim
  unmodeled, same direction-trap reasoning as the driver. Observationally identical to the
  driver (an empty-effects block emits nothing); the driver instead keeps the targeting clause
  in the unmodeled prose (a targeting shell with no payload asserts nothing).
- Stat flavor: S6 independently routes 'Charge Damage Multiplier ▲' to chargeDamageMultPct
  (same as S2b and S5 — three blind voices, no leakage).

---

## DRIVER IMPLEMENTATION UNDER JUDGMENT

### scripts/tests/units/admi.test.ts (14/14 GREEN, deterministic)

```ts
// PER-UNIT KIT SPEC — `admi` (Admi, Supporter/SR/Wind, Burst II, cd 20s). Kit-autonomy
// gauntlet 2026-08-03 (test-first re-derivation). ⚠ EXACT SLUG: admi — the only unit on the
// roster with this base name (the slug-disambiguation lint passes clean on the full variant).
// NOTE: this is a FROM-SCRATCH unit — there was no shipped override before this gauntlet
// (simSupported was false), so the harness cannot even load her until
// src/skills/overrides/admi.json exists. The override was authored first (the faithful
// encoding under test); every assertion below PINS a kit line GREEN vs that override and RED
// vs the nearest-wrong counterfactual (withPatchedOverride), so the file still discriminates
// exactly as a verification gauntlet would (soline/poli precedent, 2026-08-03).
//
// Kit (blablalink prose, data/characters.json → characters.admi.skills), max level:
//   S1 ■ Activates when attacked 20 time(s). Affects all allies.
//        Charge Damage Multiplier ▲ 9.59% for 20 sec.                          [UNMODELED — ⚑1]
//   S2 ■ Affects 2 allies with the highest final ATK. (cd 20s)
//        Damage Taken ▼ 28.65% for 10 sec.                                     [UNMODELED — ⚑2]
//   BU ■ Affects all allies. (cd 20s)
//        Reload Speed ▲ 50.91% for 10 sec.                                     [B1]
//        Critical Damage ▲ 28.34% for 10 sec.                                  [B2]
//
// Modeling posture (override note + caveats carry the full story):
//   * S1 'Helping Hand' — 'attacked 20 times' is an INCOMING-DAMAGE trigger: v1 models no
//     boss damage to allies and has no attacked-count trigger primitive, so the counter never
//     accrues and the line never fires at scope lock. UNMODELED verbatim + ⚑1 (noise/yulha
//     precedent). The effect side would be chargeDamageMultPct — 'Charge Damage Multiplier ▲'
//     is the base-charge-SCALING stat (helm-wording precedent; a2's additive chargeDamagePct
//     ruling covers only the bare 'Charge Damage ▲' wording; S2b reviewer catch). The
//     nearest-wrong encoding is a passive/always-on charge-damage team buff — the phantom arm
//     proves the absence pin has teeth.
//   * S2 'Kitten's Breath' — ally Damage-Taken mitigation: nothing to mitigate (no incoming
//     damage, no ally HP pool), and the ONLY damageTakenPct primitive is a BOSS debuff
//     (positive = boss takes MORE) — wrong direction/target, so it is NOT used (encoding it
//     would manufacture a phantom team damage gain — noise precedent). UNMODELED verbatim +
//     ⚑2; the '2 highest-final-ATK allies' targeting clause is moot with the inert effect.
//   * Burst — ONE burstCast block, target allies (includes self), reloadSpeedPct 50.91 +
//     critDamagePct 28.34, both 10s. burstCast NOT fullBurstEnter: the kit names no
//     full-burst condition, and her stage-2 cast lands BEFORE the Full Burst window opens, so
//     both windows ride frame-exact on her cast (crust/novel burst-aura convention) — the
//     Tier-2 lever, discriminated against a fullBurstEnter re-keying.
//   * The whole-kit pin: the ONLY buffApply events attributed to admi in the entire fight are
//     the two burst stats × four targets per cast (S1/S2 contribute nothing at scope lock).
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model
// gates nothing):
//   B1  reloadSpeedPct must land frame-exact on HER stage-2 cast for ALL four allies, 10s
//       windows. The fullBurstEnter counterfactual moves every application onto the FB-start
//       frames (strictly later than her cast); the excludeSelf counterfactual ('all allies'
//       misread as 'the other allies') drops admi's own applications. The live arms prove the
//       stat is not inert: faster reloads = more shots (shot-count arm) and more total damage.
//   B2  critDamagePct rides the same per-cast shape. The compositional arm matches hits 1:1
//       against the noCritBuff counterfactual (reload buff KEPT, so shot cadence — and hence
//       cast timing — is byte-identical across the pair): in-window majors differ by exactly
//       critRate × 28.34pp, out-of-window majors by exactly 0 — the SSOT major-bracket feed
//       (damage-calculation.md §1b), not a multiplier.
//   B3  absence pins: no chargeDamagePct and no damageTakenPct ever attributed to admi; the
//       phantom arms (a passive S1 team buff; S2 mis-encoded as a boss damageTakenPct debuff)
//       make both pins fail — proving they catch the two nearest-wrong encodings, including
//       the sign/direction trap the noise precedent documents (the boss-debuff mis-encoding
//       manufactures a measurable phantom team damage gain).
//
// Fixture: a custom B1/B2/B3 chain — liter(B1) / admi(B2) / modernia(B3) / helm(B3), boss
// Fire, focus admi (poli precedent: the standard controlComp cannot be used — crown is also
// Burst II and would take the stage-II slot, leaving admi ZERO casts). admi is the SOLE Burst
// II with a 20s CD, so she casts every Full Burst chain (10 casts / 180s). Deterministic (no
// seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const WINDOW_FRAMES = 10 * FPS; // both burst lines: 'for 10 sec'
const SLUGS = ['liter', 'admi', 'modernia', 'helm'] as const;
/** slot order: liter 0 / admi 1 / modernia 2 / helm 3. */
const ADM = 1;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;
type FbStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [...SLUGS],
    bossElement: 'Fire',
    focusSlug: 'admi',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) => evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) => evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const shots = (evs: SimEvent[], slug: string) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === slug);
const admiCasts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'admi');
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e): e is FbStart => e.kind === 'fullBurstStart');
/** admi's burst-buff applications, by stat. */
const admiBurstBuff = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.stat === stat && b.casterIdx === ADM);
/** admi's normal-attack (charge) damage events. */
const admiNormals = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'admi' && d.srcSlot === 'normal');
/** The frames of admi's casts — the 10s buff windows open on these. */
const castFrames = (evs: SimEvent[]) => admiCasts(evs).map((c) => c.frame);
/** A hit frame is inside SOME burst window [cast, cast+10s). */
const inWindow = (frame: number, casts: number[]) =>
  casts.some((c) => frame >= c && frame < c + WINDOW_FRAMES);

// ---- counterfactuals (nearest-wrong models each assertion must discriminate against) ----------
/** B1 counterfactual: the burst re-keyed to fullBurstEnter — both windows shift off her cast
 *  frames onto the FB-start frames (her stage-2 cast lands BEFORE the FB window opens). */
const admiFbEnter = withPatchedOverride('admi', (ov) => {
  const b = ov.burst[0];
  if (b?.trigger?.kind !== 'burstCast') {
    throw new Error('admi burst burstCast block missing — fixture is stale');
  }
  b.trigger = { kind: 'fullBurstEnter' };
});
/** B1 counterfactual: 'Affects all allies' misread as 'the OTHER allies' (excludeSelf). */
const admiExcludeSelf = withPatchedOverride('admi', (ov) => {
  const b = ov.burst[0];
  if (b?.target?.kind !== 'allies') {
    throw new Error('admi burst allies target missing — fixture is stale');
  }
  b.target = { kind: 'allies', excludeSelf: true };
});
/** B2 isolation: ONLY the critDamage line removed (reload KEPT, so shot cadence and cast
 *  timing stay byte-identical to base — legal matched-hit comparison). */
const admiNoCritBuff = withPatchedOverride('admi', (ov) => {
  const before = ov.burst[0].effects.length;
  ov.burst[0].effects = ov.burst[0].effects.filter(
    (e: any) => e.stat !== 'critDamagePct'
  );
  if (ov.burst[0].effects.length !== before - 1) {
    throw new Error('admi burst critDamagePct effect missing — fixture is stale');
  }
});
/** B1 isolation: ONLY the reloadSpeed line removed (crit KEPT). */
const admiNoReloadBuff = withPatchedOverride('admi', (ov) => {
  const before = ov.burst[0].effects.length;
  ov.burst[0].effects = ov.burst[0].effects.filter(
    (e: any) => e.stat !== 'reloadSpeedPct'
  );
  if (ov.burst[0].effects.length !== before - 1) {
    throw new Error('admi burst reloadSpeedPct effect missing — fixture is stale');
  }
});
/** Whole-burst isolation: both lines removed. */
const admiNoBurst = withPatchedOverride('admi', (ov) => {
  if (!ov.burst.length) {
    throw new Error('admi burst empty — fixture is stale');
  }
  ov.burst = [];
});
/** B3 phantom: the nearest-wrong S1 — a PASSIVE always-on charge-damage team buff on the
 *  faithful stat flavor (chargeDamageMultPct; the real line is gated on being attacked 20×,
 *  which never accrues at scope lock). */
const admiPhantomS1 = withPatchedOverride('admi', (ov) => {
  ov.skill1 = [
    {
      slot: 'skill1',
      trigger: { kind: 'passive' },
      target: { kind: 'allies' },
      effects: [
        {
          kind: 'buff',
          stat: 'chargeDamageMultPct',
          value: 9.59,
          durationSec: 20,
        },
      ],
    },
  ];
});
/** B3 phantom: the nearest-wrong S2 — the ally mitigation mis-encoded as the BOSS-debuff
 *  damageTakenPct primitive (wrong direction; manufactures a phantom team damage gain). */
const admiPhantomS2 = withPatchedOverride('admi', (ov) => {
  ov.skill2 = [
    {
      slot: 'skill2',
      trigger: { kind: 'interval', sec: 20 },
      target: { kind: 'enemy' },
      effects: [
        { kind: 'buff', stat: 'damageTakenPct', value: 28.65, durationSec: 10 },
      ],
    },
  ];
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const fbEnter = run({ admi: admiFbEnter });
const excludeSelf = run({ admi: admiExcludeSelf });
const noCritBuff = run({ admi: admiNoCritBuff });
const noReloadBuff = run({ admi: admiNoReloadBuff });
const noBurst = run({ admi: admiNoBurst });
const phantomS1 = run({ admi: admiPhantomS1 });
const phantomS2 = run({ admi: admiPhantomS2 });

describe('admi — kit spec', () => {
  it('fixture sanity: admi is the sole Burst II and casts every covered chain at stage 2', () => {
    const casts = admiCasts(base.events);
    // deterministic run: one cast per Full Burst chain, 20s CD never the limiter
    expect(casts.length).toBe(10);
    expect([...new Set(casts.map((c) => c.stage))]).toEqual([2]);
  });

  describe('B1 — burst line 1: Reload Speed ▲50.91% for 10s, all allies, on HER cast', () => {
    const applies = admiBurstBuff(base.events, 'reloadSpeedPct');
    const casts = castFrames(base.events);

    it('lands frame-exact on her stage-2 cast for ALL FOUR allies, 10s windows, kit magnitude', () => {
      expect(applies.length).toBe(4 * casts.length);
      for (const c of casts) {
        const perCast = applies.filter((b) => b.frame === c);
        expect(
          perCast.map((b) => b.targetIdx).sort(),
          `cast at frame ${c}: all allies including admi herself`
        ).toEqual([0, 1, 2, 3]);
        for (const b of perCast) {
          expect(b.value).toBe(50.91);
          expect(b.expiresFrame! - b.frame, '10s duration').toBe(WINDOW_FRAMES);
        }
      }
    });

    it('the lever is real: every stage-2 cast lands BEFORE the Full Burst window it feeds', () => {
      const fbs = fbStarts(base.events).map((f) => f.frame);
      expect(fbs.length).toBeGreaterThanOrEqual(casts.length);
      for (const c of casts) {
        const fb = fbs.find((f) => f > c && f - c <= WINDOW_FRAMES);
        expect(fb, `cast ${c} has a later FB start within 10s`).toBeDefined();
      }
    });

    it('is live: faster reloads mean more shots and more damage for the whole team', () => {
      expect(shots(base.events, 'admi').length).toBeGreaterThan(
        shots(noReloadBuff.events, 'admi').length
      );
      expect(shots(base.events, 'helm').length).toBeGreaterThan(
        shots(noReloadBuff.events, 'helm').length
      );
      for (const s of SLUGS) {
        expect(base.totals[s], `${s} total`).toBeGreaterThan(noBurst.totals[s]);
      }
    });

    it('DISCRIMINATING: a fullBurstEnter re-keying lands every application on the FB-start frame, never her cast', () => {
      const moved = admiBurstBuff(fbEnter.events, 'reloadSpeedPct');
      expect(moved.length).toBeGreaterThan(0);
      const fbFrames = new Set(fbStarts(fbEnter.events).map((f) => f.frame));
      const castSet = new Set(castFrames(fbEnter.events));
      for (const b of moved) {
        expect(fbFrames.has(b.frame), `application at ${b.frame} on an FB start`).toBe(true);
        expect(castSet.has(b.frame)).toBe(false);
      }
    });

    it("DISCRIMINATING: 'all allies' misread as excludeSelf drops admi's own applications and her damage", () => {
      const xs = admiBurstBuff(excludeSelf.events, 'reloadSpeedPct');
      expect(xs.length).toBeGreaterThan(0);
      expect(xs.some((b) => b.targetIdx === ADM)).toBe(false);
      expect(base.totals.admi).toBeGreaterThan(excludeSelf.totals.admi);
    });
  });

  describe('B2 — burst line 2: Critical Damage ▲28.34% for 10s, all allies, on HER cast', () => {
    const applies = admiBurstBuff(base.events, 'critDamagePct');
    const casts = castFrames(base.events);

    it('lands frame-exact on the same casts as the reload line, same shape', () => {
      expect(applies.length).toBe(4 * casts.length);
      for (const c of casts) {
        const perCast = applies.filter((b) => b.frame === c);
        expect(perCast.map((b) => b.targetIdx).sort()).toEqual([0, 1, 2, 3]);
        for (const b of perCast) {
          expect(b.value).toBe(28.34);
          expect(b.expiresFrame! - b.frame).toBe(WINDOW_FRAMES);
        }
      }
    });

    it('feeds the major bucket at exactly critRate × 28.34pp on matched in-window hits (and 0 outside)', () => {
      const b = admiNormals(base.events);
      const c = admiNormals(noCritBuff.events);
      // reload buff kept in BOTH runs → shot cadence and cast timing identical → 1:1 hits
      expect(b.length).toBe(c.length);
      expect(b.length).toBeGreaterThan(0);
      let inN = 0;
      let outN = 0;
      for (let i = 0; i < b.length; i++) {
        expect(b[i].frame, 'matched-hit alignment').toBe(c[i].frame);
        if (inWindow(b[i].frame, casts)) {
          inN++;
          expect(
            b[i].mult.major - c[i].mult.major,
            `in-window hit ${i} (frame ${b[i].frame})`
          ).toBeCloseTo(b[i].critRate * 0.2834, 6);
        } else {
          outN++;
          expect(b[i].mult.major - c[i].mult.major, `out-of-window hit ${i}`).toBeCloseTo(0, 8);
        }
      }
      expect(inN, 'window coverage exists').toBeGreaterThan(0);
      expect(outN, 'outside-window coverage exists').toBeGreaterThan(0);
    });

    it('DISCRIMINATING: dropping ONLY the critDamage line costs crit-window damage but keeps the reload cadence', () => {
      expect(noCritBuff.totals.admi).toBeLessThan(base.totals.admi);
      expect(shots(noCritBuff.events, 'admi').length).toBe(
        shots(base.events, 'admi').length
      );
    });
  });

  describe('B3 — S1/S2 are out-of-domain at scope lock: admi contributes NOTHING else', () => {
    it('the only stats ever attributed to admi are the two burst buffs', () => {
      const mine = buffs(base.events).filter((b) => b.casterIdx === ADM);
      expect(mine.length).toBeGreaterThan(0);
      expect([...new Set(mine.map((b) => b.stat))].sort()).toEqual([
        'critDamagePct',
        'reloadSpeedPct',
      ]);
    });

    it("S1 never fires: no charge-damage application of either flavor from admi (the 'attacked 20×' counter cannot accrue)", () => {
      expect(admiBurstBuff(base.events, 'chargeDamagePct').length).toBe(0);
      expect(admiBurstBuff(base.events, 'chargeDamageMultPct').length).toBe(0);
    });

    it('DISCRIMINATING: a phantom passive S1 WOULD emit chargeDamageMultPct — the absence pin has teeth', () => {
      expect(
        admiBurstBuff(phantomS1.events, 'chargeDamageMultPct').length
      ).toBeGreaterThan(0);
    });

    it('S2 never fires: no damageTakenPct application anywhere in this fight (the boss-debuff primitive is not misused; boss debuffs carry casterIdx null, so the pin keys on presence)', () => {
      const mis = buffs(base.events).filter((b) => b.stat === 'damageTakenPct');
      expect(mis.length).toBe(0);
    });

    it('DISCRIMINATING: the boss-debuff mis-encoding WOULD manufacture a phantom team damage gain', () => {
      const mis = buffs(phantomS2.events).filter(
        (b) => b.stat === 'damageTakenPct'
      );
      expect(mis.length).toBeGreaterThan(0);
      expect(mis.every((b) => b.targetIdx === null)).toBe(true); // the BOSS holds it
      let phantomGain = 0;
      for (const s of SLUGS) {
        phantomGain += phantomS2.totals[s] - base.totals[s];
      }
      expect(phantomGain, 'the direction trap inflates team damage').toBeGreaterThan(0);
    });
  });
});

```

### src/skills/overrides/admi.json

```json
{
  "note": "admi (Admi) — SR / Supporter / Wind / Burst II, cd 20s, ammo 6, chargeFrames 60, reloadFrames 125, hitsPerShot 1, RoF 60, normalMult 67.37 / chargeMult 250 / coreMult 200, burstGaugePerShot 2.7. Kit-autonomy gauntlet 2026-08-03: FROM-SCRATCH build (no shipped override existed; simSupported was false) — test-first re-derivation (scripts/tests/units/admi.test.ts, groups B1–B3 + absence pins). MODELED: (BURST 'Love Returned') '■ Affects all allies. Reload Speed ▲ 50.91% for 10 sec. Critical Damage ▲ 28.34% for 10 sec.' → ONE burstCast block, target allies (allies includes self), effects reloadSpeedPct 50.91 + critDamagePct 28.34, both durationSec 10. burstCast NOT fullBurstEnter: the kit names no full-burst condition, and her stage-2 cast lands BEFORE the Full Burst window opens, so both 10s windows ride frame-exact on her cast (crust/novel burst-aura convention) — Tier-2 lever, pinned in the test. reloadSpeedPct feeds reloadFramesNeeded (faster reloads → more shots → more gauge); critDamagePct feeds the major bucket at critRate × 28.34pp per in-window hit. UNMODELED (verbatim; both ⚑ out-of-domain — the incoming-damage subsystem the v1 sim deliberately lacks; zero damage impact at scope lock): (S1 'Helping Hand') 'Activates when attacked 20 time(s) → all allies Charge Damage Multiplier ▲ 9.59% for 20 sec' — v1 models NO incoming ally damage and has NO attacked-count trigger primitive, so the 20-hit counter never accrues and the line never fires (noise/yulha precedent). Effect side, IF the trigger were ever modeled: chargeDamageMultPct — the 'Charge Damage Multiplier ▲' wording is the BASE-CHARGE-SCALING stat (helm precedent carries the identical wording; a2's additive chargeDamagePct ruling applies only to the bare 'Charge Damage ▲' wording) — representable but unreachable on this basis. (S2 'Kitten's Breath', cd 20s) 'Affects 2 allies with the highest final ATK. Damage Taken ▼ 28.65% for 10 sec' — ally received-damage mitigation: no incoming damage and no ally HP pool to mitigate; the ONLY damageTakenPct primitive is a BOSS debuff (positive = boss takes MORE) — wrong direction/target, so it is NOT used (encoding it would manufacture a phantom team damage gain — noise precedent); the 'highest FINAL ATK' targeting clause (alliesTopAtk byFinalAtk) is representable but moot with its inert effect. TIER 2: burstCast-vs-fullBurstEnter lever on the burst buffs + out-of-domain ⚑ cluster. ⚑ FLAGS: (⚑1 OUT-OF-DOMAIN, incoming-damage subsystem — TIER 2) the ENTIRE S1 'Helping Hand' line; estimate = zero damage impact at scope lock (never fires); in a real fight where the boss attacks her steadily the window is near-permanent uptime (20s duration, re-trigger every 20 hits taken) ≈ the base charge multiplier of every charge-weapon ally scaled ×(1+9.59%) (an SR 250% chargeMult lifts 2.5 → ~2.74 for the window); recipe = needs an attacked-count trigger primitive (engine-core) + measure hit-accrual cadence from a focus video (boss-targeting dependent — the sim models no boss targeting either). (⚑2 OUT-OF-DOMAIN, incoming-damage subsystem — TIER 2) the S2 mitigation line; estimate = zero damage impact (purely defensive); recipe = not measurable from damage popups at all — log the actual damage-taken reduction during an incoming-damage phase in a focus video once an HP/incoming-damage model exists. (⚑3 CADENCE TUPLE, mandatory) SR chargeFrames 60 + reloadFrames 125 + ammo 6 shipped datamine as-is (no charFixes); recipe = read the charge time + reload gap from any focus video. Kit-autonomy gauntlet 2026-08-03.",
  "unmodeled": {
    "skill1": [
      "■ Activates when attacked 20 time(s). Affects all allies.",
      "Charge Damage Multiplier ▲ 9.59% for 20 sec."
    ],
    "skill2": [
      "■ Affects 2 allies with the highest final ATK.",
      "Damage Taken ▼ 28.65% for 10 sec."
    ],
    "burst": []
  },
  "caveats": [
    "skill1: 'when attacked 20 times → all allies Charge Damage Multiplier ▲9.59% / 20s' is UNMODELED — the v1 sim models no incoming ally damage and has no attacked-count trigger primitive, so the counter never accrues and the line never fires at scope lock; the effect side would be chargeDamageMultPct (base-charge-scaling, helm-wording precedent) IF a trigger ever existed (⚑1; noise/yulha precedent)",
    "skill2: the 'Damage Taken ▼28.65%' ally mitigation is UNMODELED — the only damageTakenPct primitive is a BOSS debuff (positive = boss takes MORE, wrong direction); NOT encoded (would manufacture a phantom team damage gain); the '2 highest-final-ATK allies' targeting clause is moot with the inert effect (⚑2; noise precedent)",
    "burst: burstCast trigger — both 10s windows ride frame-exact on her stage-2 cast, which lands BEFORE the Full Burst window opens; a fullBurstEnter encoding would shift both windows off her cast frames (Tier-2 lever, pinned in the test)",
    "cadence tuple (SR chargeFrames 60, reloadFrames 125, ammo 6) is the unverified datamine — read the charge time + reload gap from a focus video (⚑3)"
  ],
  "skill1": [],
  "skill2": [],
  "burst": [
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
          "stat": "reloadSpeedPct",
          "value": 50.91,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "critDamagePct",
          "value": 28.34,
          "durationSec": 10
        }
      ]
    }
  ]
}

```
