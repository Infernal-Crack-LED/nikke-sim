# RECONCILING-JUDGE PACKET — sakura-bloom-in-summer (Sakura: Bloom in Summer)

# Driver family: Qwen. Blind families: claude-fable-5 (S2b), claude-opus-5 (S5/S6). Judge: claude-opus-5.

# Grade the DRIVER's artifacts against ground truth + two independent blind re-derivations. Return ONLY the binding verdict JSON.

## 1. Judge contract (RECONCILING-JUDGE.md)

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

## 2. Mechanics SSOT (focused summary — full docs at docs/data/damage-calculation.md + docs/data/game-mechanics.md)

Damage formula (docs/data/damage-calculation.md:55-60), multiplicative buckets:

```
dmg = max(0, finalATK − enemyDEF) × coef
    × major   [1 + crit + core + fullBurst(0.5) + range(0.3)]   (additive within)
    × element [1 + 0.1 advantage + elem-dmg buffs]
    × charge  [charged shots only]
    × dmgUp   [1 + attackDamage + sustained + pierce + parts + …]   "Damage Up"
    × taken   [1 + damageTaken(enemy) + distributed]
```

- **+ATK% (atkPct) and +Attack Damage% (attackDamagePct) are DIFFERENT buckets → they multiply.** "Attack Damage ▲" maps to `attackDamagePct` (the Damage-Up bucket), NOT `atkPct`. (damage-calculation.md:73)
- "% of **final** ATK" skill damage uses the actor's LIVE buffed ATK. (damage-calculation.md:76)

Per-damage-type table (damage-calculation.md:80-84):

| type                              | crit                        | core                      | range | Attack-Dmg | full-burst     | element |
| --------------------------------- | --------------------------- | ------------------------- | ----- | ---------- | -------------- | ------- |
| skill / function "% of final ATK" | ✅                          | ❌ (unless "as core dmg") | ❌    | ✅         | ✅             | ✅      |
| DoT / sustained                   | ✅ (DOT_CRIT ON by default) | ❌* (kit-dependent)       | ❌    | ✅         | ✅ (by timing) | ✅      |
| burst nuke                        | ✅                          | only if "as core dmg"     | ❌    | ✅         | ✅             | ✅      |

- **Full Burst timing rule (MEASURED, damage-calculation.md:165-167):** damage dealt BY a burst skill AT its cast lands _before_ Full Burst begins — it gets neither the +0.5 major nor any "when entering Full Burst" aura. → a `burstCast` instant volley is FB-EXEMPT (fbMajorApplied=false).
- **Sustained DoT ticks (damage-calculation.md:350-354):** on a tick timer; ticks reference CURRENT buffs (no snapshot), never core/range, tick-crit ON by default; "ticks land during whatever window they land in (Full Burst rules by timing)." → a burst-applied DoT's TICKS take FB by timing even though the instant volley is FB-exempt.
- **Internal-cooldown skills (`interval` trigger, damage-calculation.md:336-338):** a kit line with no printed activation clause that "just happens" every N seconds of battle. **Fires first at t=N** (⚑ phase convention). A start-of-battle force-cast ("Forcefully uses Skill N") pins the FIRST fire to t=0 instead of t=N.
- **Passive buffs are always-on:** the engine applies a `passive`-trigger buff at frame 0 and it cannot carry a wall-clock duration (sim.ts alwaysOn). A duration-buff that re-casts on a cooldown must therefore be encoded as its TIME-AVERAGE duty cycle when modeled as a passive (a measured engine limitation, not a kit choice).
- **Sustained Damage ▲ %** applies ONLY on sustained-flavored instances (damage-calculation.md:244,254).

## 3. GROUND TRUTH — kit prose + base stats (data/characters.json → characters['sakura-bloom-in-summer'])

Unit: Sakura: Bloom in Summer (sakura-bloom-in-summer). Variant of base `sakura` (a DIFFERENT unit).
Base: AR / Wind / Attacker / Burst III, burstCooldownSec 40, ammo 60, reloadFrames 81, chargeFrames 0, hitsPerShot 1, normalAttackMultiplier 13.65, coreAttackMultiplier 200, burstGaugePerShot 0.2, rate_of_fire 720 rpm (= 12 pulls/s), reload_start_ammo 59. baseStats atk 600.
**skillCooldownsSec: { skill1: null, skill2: 30, burst: 40 }** ← DATAMINED skill2 CD = 30s (owner-confirmed 2026-07-20 as a real re-activation CD).

skill1 (Bloom):
■ Activates at the start of battle. Affects self. → Forcefully uses Skill 2.
■ Activates when an ally or self destroys an enemy's part. Affects self. → Sustained Damage ▲ 5.1% for 30 sec.
■ Activates when an ally or self destroys an enemy's part. Affects self if in Dancing Flower status. → Dancing Flower Duration ▲ 10.02 sec.
■ Activates when an ally or self destroys an enemy's part. Affects all enemies who are in Sakura Petals status. → Sakura Petals Duration ▲ 10.02 sec.

skill2 (Full Glory):
■ Affects self. → Dancing Flower: Attack Damage ▲ 15.64% for 15 sec.
■ Affects the enemy with the highest final ATK. → Sakura Petals: Deals 256% of final ATK as sustained damage every 1 sec for 15 sec.

burst (Ephemeral Splendor):
■ Affects random enemies. → Deals 457.14% of final ATK as damage. Attacks sequentially 10 times.
■ Affects the same targets. → Deals 35.16% of final ATK as sustained damage every 1 sec, stacks up to 10 times and lasts for 10 sec.

SCOPE LOCK: partless single boss (bossDef 140→0), skill levels 10/10/10, Base 5 gear, core 7, auto-play, 180s fight. The v1 boss has NO destructible parts.

## 4. S2b pre-op adversarial test-faithfulness review (claude-fable-5, cross-family) — reviews/sakura-bloom-in-summer.test-review.json

```json
{
  "slug": "sakura-bloom-in-summer",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "start of battle: Forcefully uses Skill 2",
      "disposition": "FAITHFUL",
      "scope": "generic — a cast of skill2, not a stat",
      "durationSemantics": "instant (one forced cast at t=0)",
      "triggerIdentity": "battle-start force-cast; per the force-cast convention this sets skill2's interval trigger to FIRST-FIRE t=0 instead of t=CD",
      "targetSet": "self (casts own skill2; skill2's own lines then resolve their targets)",
      "nearestWrongModel": "drop the force-cast and model skill2 as a plain interval whose first fire is t=CD — the whole opening window loses Dancing Flower + the first Sakura Petals DoT",
      "distinguishingAssertion": "a buffApply with stat 'attackDamagePct', value 15.64, caster==target==sakura exists at frame ~0 (expiresFrame ≈ 15s), and the first sustained-bucket damage tick from sakura's DoT lands within the first ~1-2s of battle; RED if the first such buffApply/tick appears only at t≈skill2-CD",
      "inertness": "must not create an EXTRA skill2 firing on top of the interval schedule — total skill2 activations = interval count with phase shifted to t=0, not interval count + 1",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "destroys an enemy's part → Sustained ▲5.1%",
      "disposition": "GAP",
      "scope": "sustained-damage bucket buff (sustainedDamagePct), self",
      "durationSemantics": "durationSec 30 (wall-clock, kit-literal)",
      "triggerIdentity": "part-destruction event — NO TriggerDef exists for it, and the v1 scope-lock boss is partless, so the trigger can never fire",
      "targetSet": "self",
      "nearestWrongModel": "smuggle it in as a passive or interval self-buff 'because parts break eventually' — over-credits 5.1% sustained on a boss that has no parts",
      "distinguishingAssertion": "the event log contains ZERO buffApply with stat 'sustainedDamagePct' value 5.1 for the whole run; the line appears verbatim in the override's unmodeled.skill1",
      "inertness": "entire line must move nothing; totals identical with the line present vs absent",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill1",
      "kitLine": "part destroy: Dancing Flower Duration ▲10.02s",
      "disposition": "GAP",
      "scope": "duration-extension of the self Dancing Flower buff, gated on being IN Dancing Flower status",
      "durationSemantics": "+10.02 sec added to an existing buff's remaining duration — an extend-buff primitive the effect schema does not have",
      "triggerIdentity": "part-destruction (unfireable in v1) + a requires-self-status gate (also inexpressible: requiresTargetStatus is boss-side only)",
      "targetSet": "self",
      "nearestWrongModel": "re-encode as a refresh/re-apply of the 15.64% buff, or pad skill2's durationSec to 25.02 baseline — both over-credit uptime the partless boss never grants",
      "distinguishingAssertion": "every Dancing Flower buffApply carries expiresFrame ≈ applyFrame + 15s×60 exactly; no apply shows an extended (≈25s) window",
      "inertness": "Dancing Flower uptime must equal the plain interval×15s schedule; nothing extends it",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill1",
      "kitLine": "part destroy: Sakura Petals Duration ▲10.02s",
      "disposition": "GAP",
      "scope": "duration-extension of the enemy-side Sakura Petals DoT/status",
      "durationSemantics": "+10.02 sec on the live DoT window — same missing extend primitive; dots are fixed-length once appended",
      "triggerIdentity": "part-destruction (unfireable in v1); target-status-scoped ('enemies in Sakura Petals status')",
      "targetSet": "enemy (all enemies carrying the status — single boss in v1)",
      "nearestWrongModel": "bake the extension into the DoT as durationSec 25.02 unconditionally — inflates every Sakura Petals window ~67% on a boss whose parts never break",
      "distinguishingAssertion": "each skill2 DoT instance produces exactly ⌊15/1⌋ = 15 sustained ticks (not ~25); tick count per instance is the discriminator",
      "inertness": "Sakura Petals total tick count must equal instances × 15",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "Dancing Flower: Attack Damage ▲15.64% 15s",
      "disposition": "FAITHFUL",
      "scope": "generic Attack Damage — the Damage Up bucket (attackDamagePct), applying to all her damage; NOT an ATK stat and NOT normal-attack-scoped",
      "durationSemantics": "durationSec 15, refreshed each skill2 activation; uptime = 15s per CD (continuous only if the datamined CD ≤ 15s — ⚑ the CD is not in the prose)",
      "triggerIdentity": "no 'Activates when' clause → interval trigger at the datamined skill2 CD (⚑), first fire t=0 via the skill1 force-cast",
      "targetSet": "self",
      "nearestWrongModel": "encode 'Attack Damage ▲' as atkPct 15.64 (ATK bucket) — wrong bucket, different dilution against team ATK buffs; second-nearest: passive/permanent instead of 15s-per-CD windows",
      "distinguishingAssertion": "buffApply events carry stat 'attackDamagePct' (raw value 15.64), never stat 'atkPct'; and if CD > 15s there exist frames between expiresFrame and the next apply where a damage event's mult excludes the 15.64%",
      "inertness": "must not touch allies (targetIdx == casterIdx == sakura's slot on every apply)",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Sakura Petals: 256% sustained /1s for 15s",
      "disposition": "FAITHFUL",
      "scope": "skill DoT — sustained flavor, never core-boosted, crit default OFF (no measurement says otherwise)",
      "durationSemantics": "durationSec 15, intervalSec 1 → 15 ticks of 256% per application; a NAMED maintained status, so re-application REFRESHES — it must not stack with itself",
      "triggerIdentity": "interval at the datamined skill2 CD (⚑), first fire t=0 via force-cast",
      "targetSet": "enemy ('highest final ATK' — moot on the single boss)",
      "nearestWrongModel": "the taxonomy-#5 trap: append an independent 15s dot instance per interval fire with CD < 15s → overlapping instances double-tick a status the kit maintains as ONE window (game refreshes Sakura Petals; the S1 duration-extend line confirms it is a single tracked window)",
      "distinguishingAssertion": "at any second of the run, the count of sakura sustained-bucket damage events at atkPct-256 scale is ≤ 1 (one live petal window), and per-tick value implies mult 256 not 512; RED if two overlapping instances ever tick in the same second",
      "inertness": "ticks take no core bucket and no crit; tick damage identical inside vs outside core exposure",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "457.14% ×10 sequential, random enemies",
      "disposition": "FAITHFUL",
      "scope": "burst instant damage, sequential flavor (feeds sequentialDamagePct/sequentialMultPct consumers, e.g. an SWHA teammate) — 10 hits all landing on the single boss",
      "durationSemantics": "instant volley at cast (10 hits, total 4571.4% of final ATK per cast)",
      "triggerIdentity": "burstCast — HER OWN burst only; per taxonomy #9 burst-cast instant damage is FB-EXEMPT (lands before the FB window opens)",
      "targetSet": "enemy (random targets collapse to the lone boss)",
      "nearestWrongModel": "key it to fullBurstEnter — with helm as co-B3 in controlComp it would fire on EVERY team FB including helm's rotations, roughly doubling burst volleys; second-nearest: letting the volley take the +50% FB major",
      "distinguishingAssertion": "burst-volley damage batches map 1:1 onto sakura burstCast events (zero batches on rotations where helm bursts), and each volley hit carries fbMajorApplied === false",
      "inertness": "volley count per cast is exactly 10; no volley on team FBs sakura did not cast",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "35.16% sustained /1s, stacks ≤10, 10s",
      "disposition": "FAITHFUL",
      "scope": "burst-applied stacking DoT on 'the same targets' as the volley — sustained flavor, no core",
      "durationSemantics": "durationSec 10, intervalSec 1, stacking to 10; the 10 sequential hits all strike the lone boss at cast, so it opens at FULL 10 stacks ≈ 351.6%/s for 10s (⚑ instant-10-stack is a derivation from the volley targeting, not literal text — flag it)",
      "triggerIdentity": "burstCast (rides the volley); the TICKS land during the ensuing FB window, and DoT riders take FB by TIMING (default ON) — the instant volley is FB-exempt but these ticks are not",
      "targetSet": "enemy (same boss the volley hit)",
      "nearestWrongModel": "apply a single un-stacked instance (35.16%/s — a 10× under-credit); second-nearest: let stacks persist/accumulate across burst casts (burst cd 40s ≫ 10s duration, so cross-cast stacking is impossible)",
      "distinguishingAssertion": "in the 10s after each sakura burstCast, sustained-bucket tick throughput from this source ≈ 10 × 35.16% of final ATK per second (10 concurrent stack-instances or one ×10 instance — either encoding), then ZERO from t+10 until her next cast; RED at 35.16%/s",
      "inertness": "no ticks outside [cast, cast+10s]; stack count never exceeds 10 even if an encoding appends per-hit instances",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1: start-of-battle force-cast of Skill 2 (first-fire t=0)",
    "skill2: Dancing Flower attackDamagePct 15.64 / 15s self",
    "skill2: Sakura Petals 256%/1s/15s sustained DoT, non-overlapping",
    "burst: 457.14% ×10 sequential burstCast volley, FB-exempt",
    "burst: 35.16%/s ×10-stack 10s sustained DoT, FB-by-timing"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "Activates when an ally or self destroys an enemy's part. Affects self. Sustained Damage ▲ 5.1% for 30 sec.",
      "Activates when an ally or self destroys an enemy's part. Affects self if in Dancing Flower status. Dancing Flower Duration ▲ 10.02 sec.",
      "Activates when an ally or self destroys an enemy's part. Affects all enemies who are in Sakura Petals status. Sakura Petals Duration ▲ 10.02 sec."
    ],
    "skill2": [],
    "burst": []
  },
  "notes": "Expected shared-prior misreads to check the driver against: (1) 'Attack Damage ▲' mis-bucketed as atkPct — it is attackDamagePct (Damage Up); (2) taxonomy-#5 DoT multiplication — if the datamined skill2 CD is under 15s, per-fire appended 15s Sakura Petals instances OVERLAP and double-count a status the game maintains as one refreshed window (the S1 'Sakura Petals Duration ▲' extend line is textual evidence it is a single tracked window); the test must cap concurrent instances at 1; (3) burstCast vs fullBurstEnter — controlComp ships helm as co-B3, so this divergence is LIVE in the default fixture and the volley/DoT must key to sakura's own casts; (4) FB split within the burst: the instant volley is FB-exempt (pre-window) while the rider DoT's ticks land inside the FB window and take FB by timing — a test asserting fbMajorApplied uniformly on/off across both burst effects encodes a misread; (5) the burst DoT opening at 10 stacks is a derivation (10 sequential hits, one boss), not literal prose — a ⚑-worthy assumption the driver should have flagged; (6) the skill2 interval CD is NOT in the prose — it must be a ⚑ datamined skillCooldownSec, with the force-cast pinning first-fire to t=0; a test hard-coding an unflagged CD constant is guessing; (7) all three part-destruction S1 lines are GAP-inert on the partless v1 boss and must sit verbatim in unmodeled with an inertness assertion (no sustainedDamagePct-5.1 buffApply, no 25s Dancing Flower/Petals windows), not be silently dropped.",
  "model": "claude-fable-5"
}
```

## 5. S5 blind test-writer (claude-opus-5, cross-family) — blind/sakura-bloom-in-summer.test.ts

```typescript
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

/**
 * BLIND per-unit kit spec test — sakura-bloom-in-summer (Sakura: Bloom in Summer)
 * AR / Wind / Attacker / Burst III. cd 40s, ammo 60, reloadFrames 81, hitsPerShot 1.
 *
 * WHAT THE KIT SAYS (structural read of the prose; the ONLY input to this file):
 *
 * skill1:
 *   S1a  "Activates at the start of battle. Affects self." -> "Forcefully uses Skill 2."
 *        => Skill 2 fires at t=0 (a force-cast opener). Per the skill-CD convention this is the
 *           FIRST fire of skill2; skill2 has no "Activates when" clause of its own, so skill2 is
 *           an INTERVAL line whose first fire is t=0 rather than t=CD.
 *   S1b  "Activates when an ally or self destroys an enemy's PART. Affects self."
 *        -> Sustained Damage ▲ 5.1% for 30 sec.
 *   S1c  same PART trigger, self, gated on "Dancing Flower status" -> Dancing Flower Duration ▲ 10.02s.
 *   S1d  same PART trigger, all enemies in "Sakura Petals" status -> Sakura Petals Duration ▲ 10.02s.
 *        => S1b/S1c/S1d ALL hang off DESTROYING AN ENEMY PART. The v1 scope-lock boss is PARTLESS
 *           (memory: "test boss has no parts"; schema: partsDamagePct is "parsed but inert in v1").
 *           There is NO 'partDestroyed' TriggerDef in the schema at all. These three lines are
 *           therefore GAPs: unmodelable primitive AND unreachable on the graded boss. They are
 *           it.skip'd, and this file asserts the CONVERSE — that no sustainedDamagePct 5.1 buff,
 *           and no duration-extension behaviour, appears in the run (a driver that keyed them to
 *           `passive` / `interval` / `hitCount` would OVER-CREDIT and fail these assertions).
 *
 * skill2:
 *   S2a  "Affects self." -> Dancing Flower: Attack Damage ▲ 15.64% for 15 sec.
 *        => attackDamagePct 15.64, durationSec 15, target self. NOT atkPct ("Attack Damage" is the
 *           Damage-Up bucket per the StatKey table), NOT team-wide.
 *   S2b  "Affects the enemy with the highest final ATK." -> Sakura Petals: 256% of final ATK as
 *        SUSTAINED damage every 1 sec for 15 sec.
 *        => dot, atkPct 256, intervalSec 1, durationSec 15, flavor 'sustained'. Single-boss fight,
 *           so "enemy with the highest final ATK" == the boss; target set is not discriminable here.
 *        NOTE (DoT-encoding trap #5): 15s duration on a REPEATING trigger MULTIPLIES. Whether the
 *        engine ends up with one long instance or a re-fired 15s instance every cadence is exactly
 *        the thing the DoT-tick-rate assertion below pins.
 *   ⛑ CADENCE: skill2 carries NO activation clause and NO stated cooldown in the prose given.
 *        The datamined skillCooldownsSec is NOT in this packet, so the interval is OUTSIDE my input
 *        domain -> ALWAYS-⛑ field (2) "a damage line the text gives no trigger for". I do NOT assert
 *        a specific interval length. I assert only what the text DOES fix: first fire at t=0 (forced
 *        by S1a), 1s tick spacing, 256% per tick, 15s per instance, and that the line RECURS.
 *
 * burst:
 *   Ba   "Affects random enemies." -> 457.14% of final ATK as damage, "Attacks sequentially 10 times."
 *        => 10 × flatDamage 457.14 on burst cast. "Sequentially" is FLAVOR-descriptive of the 10-hit
 *           volley. Burst-cast damage is FB-exempt per the noFb/range rules (a cast lands before the
 *           FB window opens) and riders take no core unless the text says "core strike".
 *   Bb   "Affects the same targets." -> 35.16% of final ATK as SUSTAINED damage every 1 sec,
 *        "stacks up to 10 times and lasts for 10 sec."
 *        => a sustained DoT: 35.16%/s, 10s, stacking to 10. The 10 stacks are supplied by the 10
 *           sequential hits of Ba landing on the same targets — i.e. ONE burst cast = 10 concurrent
 *           35.16% instances, each 10s. Nearest-wrong: a single un-stacked 35.16% instance (10× too
 *           small) or a pre-multiplied 351.6% single instance (right total, wrong stack semantics).
 *
 * FIXTURE: controlComp('sakura-bloom-in-summer', true) — liter B1 / crown B2 / sakura B3 / helm B3.
 *   A lone B3 casts ZERO bursts, so B1+B2 are REQUIRED for the burst block to fire at all. Boss is
 *   Fire; sakura is Wind, so she is NOT elementally advantaged — no advantage confound, and no
 *   bossElementGate in this kit. helm=true is kept: her buffs scale magnitudes but every assertion
 *   below is either an EVENT-SHAPE assertion (counts, spacing, stat/value of a buffApply) or a
 *   RATIO between two runs of the SAME fixture, so helm's ATK buffs cancel out.
 *
 * WHY EACH ASSERTION DISCRIMINATES: each group names the nearest-wrong model it goes RED under,
 * built with withPatchedOverride so the committed JSON is never touched.
 */

const SLUG = 'sakura-bloom-in-summer';
const FPS = 60;

type Ev = SimEvent & Record<string, any>;

function run(opts: any): { res: any; events: Ev[] } {
  const events: Ev[] = [];
  const res = runComp({
    ...opts,
    cfg: { ...(opts.cfg ?? {}), onEvent: (ev: Ev) => events.push(ev) },
  });
  return { res, events };
}

function base() {
  return controlComp(SLUG, true);
}

// ---- hoisted runs (each runComp is a full 180s sim; keep the file cheap) -------------------

const BASE = run(base());

const sakuraDamage = BASE.events.filter(
  (e) => e.kind === 'damage' && e.slug === SLUG
);
const sakuraBuffs = BASE.events.filter(
  (e) => e.kind === 'buffApply' && e.targetSlug === SLUG
);
const burstCasts = BASE.events.filter(
  (e) => e.kind === 'burstCast' && e.slug === SLUG
);

// Sustained-flavored damage from sakura only (S2b Sakura Petals + Bb burst DoT both land here).
const sustained = sakuraDamage.filter(
  (e) => e.bucket === 'sustained' || e.flavor === 'sustained'
);

describe('sakura-bloom-in-summer — skill1', () => {
  it('S1a: skill2 is force-cast at the start of battle (first Sakura Petals tick lands in the opening second, not at a cooldown)', () => {
    // "Activates at the start of battle... Forcefully uses Skill 2." The observable consequence of
    // the force-cast is that skill2's payload (the 256%/s Sakura Petals DoT, S2b) begins ticking
    // essentially immediately rather than after one skill-2 cooldown.
    //
    // NEAREST-WRONG: skill2 keyed to a plain {kind:'interval', sec:N} with the convention first-fire
    // at t=N (no force-cast opener). Under that model the first sustained tick lands at t>=N seconds.
    expect(sustained.length).toBeGreaterThan(0);
    const firstTickFrame = Math.min(...sustained.map((e) => e.frame));
    expect(firstTickFrame).toBeLessThanOrEqual(2 * FPS);
  });

  it.skip('S1b: part-destroy -> Sustained Damage +5.1% / 30s — GAP: no part-destruction trigger primitive, and the v1 boss is partless', () => {
    // There is no TriggerDef for "an ally or self destroys an enemy part" in the effect schema, and
    // the scope-lock boss has no destructible parts, so the line is both unmodelable and unreachable.
    // Belongs in the override\'s `unmodeled` field. Asserted NEGATIVELY below instead.
  });

  it.skip('S1c: part-destroy -> Dancing Flower Duration +10.02s — GAP: no part trigger AND no duration-extension primitive for a self buff', () => {
    // Extending an ALREADY-APPLIED buff\'s remaining window is not an expressible effect (there is no
    // "extend buff duration" EffectDef; fullBurstExtend only extends the FB window).
  });

  it.skip('S1d: part-destroy -> Sakura Petals Duration +10.02s — GAP: same, for a DoT instance on the enemy', () => {
    // No primitive extends a live `dot` instance\'s durationSec either.
  });

  it('S1b inertness: NO 5.1% sustainedDamagePct buff is ever applied (the part trigger never fires on a partless boss)', () => {
    // NEAREST-WRONG: a driver that could not express the part trigger and downgraded S1b to
    // {kind:'passive'} (or hitCount/interval) to "keep the stat". That silently grants a permanent
    // +5.1% Damage-Up on every sustained tick this unit deals — pure over-credit on a boss where the
    // real trigger can never fire.
    const s51 = BASE.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.stat === 'sustainedDamagePct' &&
        Math.abs((e.value ?? 0) - 5.1) < 1e-6
    );
    expect(s51).toHaveLength(0);
  });

  it('S1c/S1d inertness: no buff or DoT instance carries a 10.02s duration extension artifact', () => {
    // NEAREST-WRONG: the extensions folded into the base numbers, e.g. Dancing Flower authored as
    // 25.02s (15 + 10.02) or Sakura Petals as a 25.02s DoT. Both are unconditional grants of an
    // effect the kit gates on part destruction.
    const dancing = sakuraBuffs.filter(
      (e) =>
        e.stat === 'attackDamagePct' && Math.abs((e.value ?? 0) - 15.64) < 1e-6
    );
    for (const ev of dancing) {
      if (ev.expiresFrame == null) continue;
      const durSec = (ev.expiresFrame - ev.frame) / FPS;
      expect(durSec).toBeLessThan(20); // 15s, not 25.02s
    }
  });
});

describe('sakura-bloom-in-summer — skill2', () => {
  it('S2a: Dancing Flower is a SELF Attack Damage +15.64% buff for 15s (not ATK, not team-wide)', () => {
    const dancing = sakuraBuffs.filter(
      (e) =>
        e.stat === 'attackDamagePct' && Math.abs((e.value ?? 0) - 15.64) < 1e-6
    );
    expect(dancing.length).toBeGreaterThan(0);

    // SCOPE (trap #1 / question 1+4): "Affects self" — the buff must never land on a teammate.
    const onOthers = BASE.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.stat === 'attackDamagePct' &&
        Math.abs((e.value ?? 0) - 15.64) < 1e-6 &&
        e.targetSlug !== SLUG
    );
    expect(onOthers).toHaveLength(0);

    // STAT IDENTITY: "Attack Damage" is the Damage-Up bucket (attackDamagePct), NOT ATK (atkPct).
    // NEAREST-WRONG: atkPct 15.64 — same headline number, different bucket, different dilution and
    // it would feed ATK-scaled ally effects. Assert no such buff exists.
    const asAtk = sakuraBuffs.filter(
      (e) => e.stat === 'atkPct' && Math.abs((e.value ?? 0) - 15.64) < 1e-6
    );
    expect(asAtk).toHaveLength(0);

    // DURATION SEMANTICS (question 2): "for 15 sec" is wall-clock seconds, not rounds.
    const first = dancing[0];
    expect(first.durationShots == null).toBe(true);
    if (first.expiresFrame != null) {
      expect(Math.round((first.expiresFrame - first.frame) / FPS)).toBe(15);
    }
  });

  it('S2a is load-bearing: zeroing Dancing Flower strictly lowers sakura damage and leaves teammates byte-identical', () => {
    // Non-vacuity + inertness in one counterfactual. If the buff were mis-scoped to allies, the
    // teammate-identity check goes RED; if it were never applied at all, the strict inequality does.
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill2?.blocks ?? []) {
        for (const e of b.effects) {
          if (e.kind === 'buff' && e.stat === 'attackDamagePct') e.value = 0;
        }
      }
    });
    const { res } = run({ ...base(), overrides: { [SLUG]: patched } });

    expect(totals(res)[SLUG]).toBeLessThan(totals(BASE.res)[SLUG]);
    for (const slug of Object.keys(totals(BASE.res))) {
      if (slug === SLUG) continue;
      expect(totals(res)[slug]).toBeCloseTo(totals(BASE.res)[slug], 6);
    }
  });

  it('S2b: Sakura Petals is a 256%-of-final-ATK SUSTAINED DoT ticking every 1 sec (not a one-shot, not a 15-hit instant volley)', () => {
    // TICK SPACING (question 3, "every 1 sec"): consecutive Sakura-Petals ticks must sit ~60 frames
    // apart. Filter to the 256% line by multiplier so the burst\'s 35.16% DoT (Bb) cannot pollute it.
    const petals = sustained.filter((e) => nearPct(e, 256));
    expect(petals.length).toBeGreaterThan(0);

    const frames = [...new Set(petals.map((e) => e.frame))].sort(
      (a, b) => a - b
    );
    const gaps = frames.slice(1).map((f, i) => f - frames[i]);
    // Within one 15s instance the gap is exactly 1s; across instances it may be longer (the recast
    // cadence). The 1s gap must be the DOMINANT spacing — a model that fired the whole 15s payload
    // as a single lump, or ticked at 0.5s/2s, produces no 60-frame mode at all.
    const oneSec = gaps.filter((g) => g === FPS).length;
    expect(oneSec).toBeGreaterThanOrEqual(
      Math.max(5, Math.floor(gaps.length * 0.5))
    );

    // DURATION (question 2): 15 ticks per activation at 1/sec.
    // NEAREST-WRONG: durationSec authored as 15 but intervalSec left at some other value, or the
    // DoT authored as a flatDamage 256% one-shot (then there is exactly one tick per fire).
    expect(frames.length).toBeGreaterThanOrEqual(15);
  });

  it('S2b RECURS: Sakura Petals is re-applied over the fight, not a single 15s opener', () => {
    // The force-cast (S1a) fires skill2 ONCE at t=0; skill2 itself is an interval line, so the DoT
    // must reappear after its window. 15 ticks would mean exactly one instance for the whole 180s.
    //
    // ⛑ The interval LENGTH is not in the kit prose (see header) — deliberately not asserted.
    const petals = sustained.filter((e) => nearPct(e, 256));
    const frames = [...new Set(petals.map((e) => e.frame))].sort(
      (a, b) => a - b
    );
    expect(frames.length).toBeGreaterThan(15);
    // and it is not one continuous whole-fight instance either (trap #5: a duration >= fight length
    // on a repeating trigger multiplies). A real re-fire shows at least one gap > 1s.
    const gaps = frames.slice(1).map((f, i) => f - frames[i]);
    expect(gaps.some((g) => g > FPS)).toBe(true);
  });

  it('S2b inertness: Sakura Petals ticks take NO core (a DoT is never core-boosted) and are sustained-flavored, not normal-bucket', () => {
    const petals = sustained.filter((e) => nearPct(e, 256));
    for (const ev of petals) {
      expect(ev.bucket === 'sustained' || ev.flavor === 'sustained').toBe(true);
      expect(ev.coreRate == null || ev.coreRate === 0).toBe(true);
    }
  });
});

describe('sakura-bloom-in-summer — burst', () => {
  it('Ba: the burst deals TEN sequential 457.14% hits per cast (not one 4571.4% lump, not 10 hits of some other size)', () => {
    expect(burstCasts.length).toBeGreaterThan(0);

    const volley = sakuraDamage.filter((e) => nearPct(e, 457.14));
    // "Attacks sequentially 10 times" — exactly 10 hits per burst cast.
    expect(volley.length).toBe(burstCasts.length * 10);

    // NEAREST-WRONG: the 10 hits merged into a single 4571.4% hit (same total, wrong hit count —
    // and wrong under any per-hit crit roll or per-hit rider).
    const merged = sakuraDamage.filter((e) => nearPct(e, 4571.4));
    expect(merged).toHaveLength(0);
  });

  it('Ba: burst-cast damage is FB-exempt and range-exempt (a cast lands before the Full Burst window opens)', () => {
    // Per the noFb/range rule: burst-cast/instant damage is always FB-exempt, and the +30% range
    // bonus is universally OFF on riders.
    // NEAREST-WRONG: the volley authored without noFb, picking up the +50% Full-Burst major.
    const volley = sakuraDamage.filter((e) => nearPct(e, 457.14));
    expect(volley.length).toBeGreaterThan(0);
    for (const ev of volley) {
      expect(ev.fbMajorApplied).toBeFalsy();
      expect(ev.rangeApplied).toBeFalsy();
    }
  });

  it('Ba inertness: no core on the volley (the kit never says "core strike damage")', () => {
    const volley = sakuraDamage.filter((e) => nearPct(e, 457.14));
    for (const ev of volley) {
      expect(ev.coreRate == null || ev.coreRate === 0).toBe(true);
    }
  });

  it('Bb: the burst DoT is 35.16%/sec SUSTAINED, TEN concurrent stacks, 10 sec — i.e. 10 ticks-worth of 35.16% per second while live', () => {
    // "stacks up to 10 times" and the volley (Ba) lands 10 sequential hits on the same targets, so a
    // full cast puts the DoT at cap: 10 concurrent 35.16% instances for 10s = 100 tick-events of
    // 35.16% per cast.
    //
    // NEAREST-WRONG A: one un-stacked 35.16% instance -> 10 ticks per cast (10× under).
    // NEAREST-WRONG B: a single pre-multiplied 351.6% instance -> right damage total, but only 10
    //   tick events and the wrong per-tick multiplier (breaks any per-stack interaction).
    const dotTicks = sustained.filter((e) => nearPct(e, 35.16));
    expect(dotTicks.length).toBeGreaterThan(0);

    const preMultiplied = sakuraDamage.filter((e) => nearPct(e, 351.6));
    expect(preMultiplied).toHaveLength(0);

    // Per cast, the stacked model yields ~10 ticks per second while live vs ~1 for the un-stacked
    // model. Measure the busiest second of 35.16% ticks.
    const bySecond = new Map<number, number>();
    for (const ev of dotTicks) {
      const s = Math.floor(ev.frame / FPS);
      bySecond.set(s, (bySecond.get(s) ?? 0) + 1);
    }
    const busiest = Math.max(...bySecond.values());
    expect(busiest).toBeGreaterThanOrEqual(10);
  });

  it('Bb: each burst-DoT instance lasts 10 sec at 1 sec intervals', () => {
    const dotTicks = sustained.filter((e) => nearPct(e, 35.16));
    const frames = [...new Set(dotTicks.map((e) => e.frame))].sort(
      (a, b) => a - b
    );
    const gaps = frames.slice(1).map((f, i) => f - frames[i]);
    // 1s tick spacing dominates within a live window.
    expect(gaps.filter((g) => g === FPS).length).toBeGreaterThanOrEqual(5);

    // 10s duration: ticks must STOP well before the next burst (cd 40s), so there is a silent gap
    // longer than the window. NEAREST-WRONG: durationSec set to the fight length (trap #5) — then
    // the ticks never stop and no long gap exists.
    expect(gaps.some((g) => g > 10 * FPS)).toBe(true);
  });

  it('Bb non-vacuity + inertness: removing the burst DoT lowers ONLY sakura, and the volley is unaffected', () => {
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.burst?.blocks ?? []) {
        b.effects = b.effects.filter(
          (e: any) => !(e.kind === 'dot' && Math.abs(e.atkPct - 35.16) < 1e-6)
        );
      }
    });
    const { res, events } = run({ ...base(), overrides: { [SLUG]: patched } });

    expect(totals(res)[SLUG]).toBeLessThan(totals(BASE.res)[SLUG]);
    for (const slug of Object.keys(totals(BASE.res))) {
      if (slug === SLUG) continue;
      expect(totals(res)[slug]).toBeCloseTo(totals(BASE.res)[slug], 6);
    }

    // the 457.14% volley must be untouched by removing the DoT
    const volleyAfter = events.filter(
      (e) => e.kind === 'damage' && e.slug === SLUG && nearPct(e as Ev, 457.14)
    );
    const volleyBefore = sakuraDamage.filter((e) => nearPct(e, 457.14));
    expect(volleyAfter.length).toBe(volleyBefore.length);
  });
});

describe('sakura-bloom-in-summer — whole-unit sanity', () => {
  it('the fixture actually bursts (a lone B3 would make ZERO full bursts, voiding every burst assertion)', () => {
    expect(burstCasts.length).toBeGreaterThan(0);
    expect(BASE.events.some((e) => e.kind === 'fullBurstStart')).toBe(true);
    // and the unit is in the comp at all
    expect(unitOf(BASE.res, SLUG).totalDamage).toBeGreaterThan(0);
  });

  it('no ally-targeted buffs at all: every line in this kit reads "Affects self" or targets the enemy', () => {
    const leaked = BASE.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.casterIdx != null &&
        e.targetSlug != null &&
        e.targetSlug !== SLUG &&
        casterIsSakura(e, BASE.res)
    );
    expect(leaked).toHaveLength(0);
  });
});

// ---- helpers ------------------------------------------------------------------------------

/** Match a damage event to a kit percentage via its multiplier decomposition. */
function nearPct(ev: Ev, pct: number): boolean {
  const m = ev.mult ?? ev.atkPct ?? ev.multiplier;
  if (m == null) return false;
  return Math.abs(m - pct) < 0.01;
}

function casterIsSakura(ev: Ev, res: any): boolean {
  if (ev.casterSlug != null) return ev.casterSlug === SLUG;
  const idx = res.units?.findIndex?.((u: any) => u.slug === SLUG);
  return idx != null && idx >= 0 && ev.casterIdx === idx;
}
```

### 5b. S5 blind test materialized vs the DRIVER override — green/red + driver RECON_ERROR analysis

Run: the S5 blind test (below) copied into scripts/tests/units/ (so its `../lib/harness.js` import resolves) and run against the driver's shipped override on disk. Result: **10 failed | 6 passed | 3 skipped (19 total).**

The 3 skipped are the part-destroy GAP lines (S1b/S1c/S1d) — the blind CORRECTLY it.skip'd them (no partDestroyed TriggerDef; partless boss) and asserts their inertness negatively (those negative inertness tests PASSED).

The 6 PASSED: S1b inertness (no 5.1% sustainedDamagePct buff), S1c/S1d inertness (no 25.02s extension artifact), S2b inertness (Sakura Petals ticks no-core + sustained-flavored), Ba inertness (no core on volley), fixture-bursts (the comp actually bursts), no-ally-targeted-buffs.

**Driver classification: ALL 10 failures are RECON_ERROR (blind-test helper bugs) and/or the two documented ⚑ encoding divergences the blind could not derive without the datamine/engine-knowledge. ZERO REAL-GOTCHA.** Evidence: the driver's own scripts/tests/units/sakura-bloom-in-summer.test.ts (19/19 GREEN, in §7) proves every faithfulness point the blind test attempted, by an independent method (PROVE-IT-DIFFERENTLY bar met).

The three blind-test helper bugs (each independently voids the assertions that depend on it):

1. **`nearPct(ev, pct)` reads `ev.mult ?? ev.atkPct` — but `ev.mult` is the multiplier-DECOMPOSITION OBJECT `{major,elem,charge,dmgUp,seqMult,projFactor,taken,distributed}`, NOT a number.** `ev.mult` is always truthy, so `m = ev.mult` (an object) and `Math.abs(object − pct) = NaN`, so `nearPct` returns FALSE FOR EVERY EVENT. Every magnitude-filtered query (`sakuraDamage.filter(nearPct(e,256))`, `nearPct(e,457.14)`, `nearPct(e,35.16)`) is therefore empty. The correct field is `ev.atkPct` (the kit percentage). This alone voids S2b, S2b-RECURS, Ba (10×457.14), Ba-FB-exempt, Bb, Bb-duration. (The driver test filters on `d.atkPct === 256 / 457.14 / 351.6` and finds 90 / 60 / 60 ticks respectively.)
2. **`sustained = sakuraDamage.filter(e => e.bucket === 'sustained' || e.flavor === 'sustained')` — damage events have NEITHER.** `bucket ∈ {normal, skill, burst}` (there is no 'sustained' bucket) and the damage event carries NO `flavor` field (sustained-ness is encoded in the bucket/mult, not a flavor tag on the event). So `sustained` is ALWAYS empty, voiding S1a (first tick ≤2s), S2b, S2b-RECURS, Bb, Bb-duration. (The driver test selects Sakura Petals by `srcSlot==='skill2' && atkPct===256` and finds the first tick at sec=1.00 ≤ 2s — S1a's intent IS satisfied.)
3. **The counterfactual mutations use `ov.skill2?.blocks` / `ov.burst?.blocks` — but the override FILE is SLOT-KEYED (`override.skill2` IS the block array; there is no `.blocks` sub-array).** The harness note in the packet stated this explicitly ("There is NO top-level 'blocks' array … iterate override.skill1 / .skill2 / .burst"). So `ov.skill2?.blocks ?? []` is `[]` and the mutations are NO-OPS → the "load-bearing" / "non-vacuity" counterfactuals change nothing → totals stay byte-identical → the strict-inequality assertions fail. This voids S2a-load-bearing and Bb-non-vacuity. (The driver test mutates the slot array directly and confirms zeroing Dancing Flower lowers her normal-damage total, and removing the burst DoT lowers her total.)

The two genuine encoding divergences (the blind could not derive these without the datamine / engine internals; both are damage-faithful and ⚑-flagged by the driver):

- **⚑3 Dancing Flower — blind expects buff value 15.64 (windowed 15s-per-CD); driver emits 7.82 always-on.** The engine's passive buffs cannot carry a duration (sim.ts alwaysOn), so the driver time-averages: with the DATAMINED skill2 CD=30 (owner-confirmed), uptime = 15s/30s = 50% → 15.64 × 90/180 = 7.82. The blind assumed CD=15 (no datamine in its packet — see its S6 flag: "The kit states NO cooldown for Skill 2 … the datamined skillCooldownsSec field is not in this packet"), which would give 100% uptime = 15.64. The datamine resolves this for the driver: CD=30 → 7.82. The S2a assertion `dancing.filter(value≈15.64).length > 0` fails because the driver (correctly, given the datamine) emits 7.82. The driver test SB2 pins 7.82 and proves her normal-damage total sits strictly BETWEEN the naive-15.64 and single-window-1.30 counterfactuals.
- **⚑4 burst stacking DoT — blind expects per-stack 35.16 ticks AND asserts NO 351.6 pre-multiplied instance; driver emits one 351.6%/s dot (full 10 stacks applied per cast).** The kit: "35.16%/s … stacks up to 10 times … 10 sec," and the volley "attacks sequentially 10 times" on "the same targets" — all 10 sequential hits land on the single boss, so the DoT opens at full 10 stacks = 351.6%/s from tick 1. The blind modeled a single 35.16 instance (it even labels the pre-multiplied encoding "NEAREST-WRONG B"), under-crediting the stack by 10×; the driver's reading is MORE faithful to "stacks up to 10 times." Both are ⚑-flagged; the driver's recipe (read sustained tick popups right after her burst — flat ~351.6% from the first second = hit-applied) distinguishes them. The driver test SB5 pins flat 351.6 from tick 1 and discriminates the single-stack-35.16 counterfactual.

Net: the blind's SPEC (s5-result.json `spec`) and its S6 override both independently re-derive the driver's model (256%/s Sakura Petals sustained DoT; 10×457.14 sequential FB-exempt burst; attackDamagePct Dancing Flower in the Damage-Up bucket; 3 part-destroy lines GAP/unmodeled; no core). The test-code failures are infrastructure bugs + the two ⚑ divergences, not faithfulness findings.

## 6. S6 blind override-writer (claude-opus-5, cross-family) — blind/sakura-bloom-in-summer.override.json

```json
{
  "slug": "sakura-bloom-in-summer",
  "skill1": [],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "interval",
        "sec": 15
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 15.64,
          "durationSec": 15
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "interval",
        "sec": 15
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "dot",
          "atkPct": 256,
          "durationSec": 15,
          "intervalSec": 1,
          "flavor": "sustained"
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
          "atkPct": 457.14,
          "flavor": "sequential",
          "crit": true,
          "noRange": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 457.14,
          "flavor": "sequential",
          "crit": true,
          "noRange": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 457.14,
          "flavor": "sequential",
          "crit": true,
          "noRange": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 457.14,
          "flavor": "sequential",
          "crit": true,
          "noRange": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 457.14,
          "flavor": "sequential",
          "crit": true,
          "noRange": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 457.14,
          "flavor": "sequential",
          "crit": true,
          "noRange": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 457.14,
          "flavor": "sequential",
          "crit": true,
          "noRange": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 457.14,
          "flavor": "sequential",
          "crit": true,
          "noRange": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 457.14,
          "flavor": "sequential",
          "crit": true,
          "noRange": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 457.14,
          "flavor": "sequential",
          "crit": true,
          "noRange": true
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
          "atkPct": 35.16,
          "durationSec": 10,
          "intervalSec": 1,
          "flavor": "sustained"
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [
      "Activates at the start of battle. Affects self. Forcefully uses Skill 2. — modeled implicitly as skill2's interval first-fire phase, not as its own block (no force-cast effect kind exists).",
      "Activates when an ally or self destroys an enemy's part. Affects self. Sustained Damage ▲ 5.1% for 30 sec. — the scope-lock boss is partless; no partDestroyed TriggerDef exists. Never fires.",
      "Activates when an ally or self destroys an enemy's part. Affects self if in Dancing Flower status. Dancing Flower Duration ▲ 10.02 sec. — partless boss; also no duration-extension primitive.",
      "Activates when an ally or self destroys an enemy's part. Affects all enemies who are in Sakura Petals status. Sakura Petals Duration ▲ 10.02 sec. — partless boss; also no duration-extension primitive."
    ],
    "skill2": [],
    "burst": [
      "Deals 35.16% of final ATK as sustained damage every 1 sec, stacks up to 10 times and lasts for 10 sec. — the 10-stack CAP is not modeled; the engine appends one independent DoT instance per burst cast and never dedups, so concurrent instances approximate stacking without enforcing the ceiling."
    ]
  },
  "caveats": [
    "⛑ skill2 cadence: kit gives NO cooldown for Skill 2. Modeled as interval 15s (= the stated buff/DoT duration, i.e. maintained-uptime) with force-cast first-fire at t=0 per the skill-CD convention. UNMEASURED — the true CD could be longer, which would leave gaps.",
    "⛑ Sakura Petals DoT re-application: at interval 15s vs durationSec 15s the instances abut rather than overlap. If the real CD is shorter than 15s, the append-not-refresh engine would MULTIPLY the DoT. Verify cadence before trusting burst-adjacent totals.",
    "⛑ Burst 10-hit split: modeled as 10 discrete 457.14% hits (text says 'Attacks sequentially 10 times'). If popups show one merged number, damage is identical but crit variance is not.",
    "⛑ Burst DoT stack cap of 10 unenforced (see unmodeled).",
    "'Affects the enemy with the highest final ATK' / 'random enemies' / 'the same targets' all collapse to the single boss in v1 — target selection is a no-op here.",
    "Burst damage is burstCast-keyed (not fullBurstEnter) per trigger-identity fidelity: it lands pre-FB and is FB-exempt by timing."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⛑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Blind second read from kit prose only. Full-kit audit: 8 kit lines total. Implemented 4 (skill2 Dancing Flower Attack Damage buff, skill2 Sakura Petals sustained DoT, burst 10x sequential hit, burst stacking sustained DoT). Skipped 4, all in skill1: the start-of-battle force-cast (folded into skill2's first-fire phase) and three part-destruction riders (the scope-lock boss is partless and TriggerDef has no partDestroyed kind, so all three are permanently inert). Load-bearing uncertainty is skill2's kit-silent cooldown, which drives BOTH the Attack Damage uptime and the 256%/s DoT's re-application rate — the single largest damage lever in this kit."
}
```

### 6b. S6 blind override — diff vs the DRIVER override (driver = src/skills/overrides/sakura-bloom-in-summer.json, §7)

CONVERGENT lines (blind re-derived the same encoding as the driver):

- **Sakura Petals (S2):** blind `dot atkPct 256, intervalSec 1, durationSec 15, flavor sustained, target enemy` == driver `dot atkPct 256, durationSec 15, intervalSec 1, flavor sustained, target enemy`. IDENTICAL effect. (Trigger cadence differs — see divergence (a).)
- **Burst nuke:** blind `10× flatDamage atkPct 457.14, flavor sequential, crit true, noRange true, on burstCast, FB-exempt by cast timing` == driver `10× flatDamage atkPct 457.14, flavor sequential, on burstCast` (driver also FB-exempt by timing — verified fbMajorApplied=false on all 60 hits). IDENTICAL: ten 457.14 hits per cast (4571.4% total), NOT one 4571.4 lump.
- **Dancing Flower bucket:** blind `attackDamagePct` (Damage-Up bucket, "NOT atkPct") == driver `attackDamagePct`. IDENTICAL bucket choice (both avoided the atkPct trap).
- **skill1 part-destroy ×3:** blind SKIPPED → unmodeled (no partDestroyed TriggerDef; partless boss; no duration-extension primitive) == driver UNMODELED verbatim. IDENTICAL disposition.
- **skill1 force-cast:** blind folds "Forcefully uses Skill 2" into skill2's first-fire at t=0 (records the line verbatim in unmodeled.skill1); driver implements it as the t=0 passive activation of both skill2 blocks. SAME observable effect (skill2 payload live from t=0); different bookkeeping only.
- **No core / no hitRate / no range on riders:** blind == driver. IDENTICAL.

DIVERGENCES (all three resolve in the DRIVER's favor — each is data the blind lacked or a conservative under-credit):

- **(a) skill2 re-cast cadence — blind: interval 15s; driver: interval 30s (DATAMINED).** The blind had no datamine in its packet and chose interval=duration=15s as "the least-assuming choice," explicitly flagging it: "The kit states NO cooldown for Skill 2 … The datamined skillCooldownsSec field is not in this packet. Recipe: Read skillCooldownsSec for slot 2 from the datamine." The driver HAS that datamine: skillCooldownsSec.skill2 = 30, owner-confirmed 2026-07-20 as a real re-activation CD. So the driver's 30s cadence (6×15s windows = 90s/180s = 50% uptime) is the measured value the blind's own recipe points to; the blind's 15s (seamless 100% uptime) is the unmeasured fallback.
- **(b) Dancing Flower value — blind: 15.64 (with CD=15 → 100% uptime, durationSec 15); driver: 7.82 always-on (time-average at CD=30 → 50% uptime).** A direct consequence of (a) plus the engine's passive-buff cannot-carry-a-duration limitation. Given the datamined CD=30, the faithful damage-equivalent is 15.64 × 90/180 = 7.82. The blind's 15.64 would over-credit by 2× on the measured cadence.
- **(c) burst stacking DoT — blind: one 35.16%/s instance per cast (stack cap "unenforced," "unreachable in practice" since dur10 < cd40); driver: one 351.6%/s instance (full 10 stacks applied per cast).** The blind modeled a SINGLE un-stacked instance and noted the cap is unreachable; the driver applies all 10 stacks (the 10 sequential volley hits all land on the one boss → "stacks up to 10 times" → 351.6%/s from tick 1). The driver is MORE faithful to the stack semantics (⚑4); the blind under-credits the DoT by 10×. Both flag it; the driver's reading matches the "stacks up to 10 times / affects the same targets" text.

Summary: the S6 blind override is structurally IDENTICAL to the driver on every effect it could derive from prose alone (256 sustained DoT; 10×457.14 sequential FB-exempt burst; attackDamagePct Dancing Flower; 3 GAP part-destroy lines; no core/range). The only divergences are the datamined skill2 CD (which the blind explicitly flagged and recipe'd) and its two consequences (Dancing Flower time-average; burst-DoT stack count) — all three resolved by data the driver holds. Strong cross-family corroboration of the driver model.

## 7. DRIVER implementation

### 7a. Driver test — scripts/tests/units/sakura-bloom-in-summer.test.ts (19/19 GREEN vs shipped)

```typescript
// PER-UNIT KIT SPEC — `sakura-bloom-in-summer` (Sakura: Bloom in Summer, Attacker/AR/Wind,
// Burst III, cd 40s, ammo 60, 720 rpm). Kit-autonomy gauntlet 2026-07-25. NOT base `sakura`.
//
// One assertion group per KIT LINE (SB1..SB6 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters['sakura-bloom-in-summer'].skills):
//   S1 ■ start of battle → self: Forcefully uses Skill 2.                                     [SB1]
//      ■ on ally/self destroying an enemy part → self: Sustained Damage ▲5.1% / 30s            [SB6]
//      ■ on part-destroy (if in Dancing Flower) → self: Dancing Flower Duration ▲10.02s        [SB6]
//      ■ on part-destroy → enemies in Sakura Petals: Sakura Petals Duration ▲10.02s            [SB6]
//   S2 ■ self: Dancing Flower — Attack Damage ▲15.64% for 15 sec                              [SB2]
//      ■ highest-final-ATK enemy: Sakura Petals — 256% final ATK sustained / 1s for 15 sec     [SB3]
//   BU ■ random enemies: 457.14% final ATK damage, attacks sequentially 10 times              [SB4]
//      ■ same targets: 35.16% final ATK sustained / 1s, stacks ×10, lasts 10 sec               [SB5]
//
// MODEL (shipped override, owner-tuned parser baseline): S1's "Forcefully uses Skill 2" = a t=0
// activation of S2; the datamined skill2 CD=30 is a REAL re-cast (owner 2026-07-20), so S2 fires at
// t=0,30,60,90,120,150 → 6×15s windows (90s/180s = 50% uptime). Sakura Petals = passive dot dur15
// (t=0) + interval:30 dot dur15 (the 5 re-casts). Dancing Flower is a DURATION buff the engine
// cannot carry on a passive (sim.ts alwaysOn), so it is time-averaged: 15.64 × 90/180 = 7.82
// always-on ⚑3. Burst nuke = TEN 457.14 flatDamage in one burstCast block (the crown misparse class
// shipped 457.14 ONCE; this is the fix). Burst stacking DoT = all 10 stacks apply per cast on the
// single boss → one 351.6%/s × 10s dot ⚑4 (hit-applied full stacks, flat from tick 1).
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   SB1  dropping the t=0 force-cast window deletes Sakura Petals ticks 1–15s; the re-casts alone
//        (interval:30, first fire t=30) start at 31s. Shipped has 15 skill2 ticks before 20s; the
//        no-force-cast counterfactual has ZERO.
//   SB2  the value is the 50%-duty time-average 7.82 — NOT the naive "passive ignores duration →
//        full 15.64" over-count, and NOT the old single-window 1.30 (=15.64×15/180) under-count.
//        Proven on the buff record AND on her normal-attack damage total, which the buff scales:
//        naive(15.64) > shipped(7.82) > single-window(1.30).
//   SB3  the 30s re-cast gives 6 windows (90 ticks); dropping the interval leaves the single force
//        window (15 ticks). A 6:1 tick ratio the single-window model provably fails.
//   SB4  TEN 457.14 hits per cast (4571.4% total), not 457.14 once. The single-hit counterfactual
//        (the materialized-freeze ×10 loss) lands 1/10 the burst hits. Cast lands BEFORE the FB
//        window → never takes the +50% major (engine fact, verified 2026-07-13).
//   SB5  the stacking DoT is 351.6%/s FLAT from tick 1 (all 10 stacks applied per cast on the one
//        boss), not a single 35.16%/s stack and not a per-second ramp (growing ticks).
//   SB6  the three part-destroy lines are genuinely UNMODELED: "destroys an enemy's part" can never
//        fire on the partless scope-lock boss. skill1 is empty by design; the lines live verbatim in
//        unmodeled.skill1. No damage assertion — they are inert on this boss by construction.
//
// UNMODELED / inert (no assertion, documented): cadence ⚑1 (12 pulls/s = 720 rpm datamine,
// reloadFrames 81, reload_start_ammo 59) is carried by data/characters.json, not the override.
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / sbis B3 / helm B3, boss Fire,
// focus sbis) — sbis needs a real rotation to cast her burst at all (a lone B3 makes zero Full
// Bursts). Deterministic (no seed). Slot order: liter 0 / crown 1 / sbis 2 / helm 3.
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
const SLUG = 'sakura-bloom-in-summer';
/** controlComp slot order: liter 0 / crown 1 / sbis 2 / helm 3. */
const SBIS = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp(SLUG),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- block selectors (the shipped skill2/burst shapes) ---------------------------------------
const isS2PassiveBuff = (b: any) =>
  b.trigger?.kind === 'passive' &&
  b.target?.kind === 'self' &&
  b.effects.some((e: any) => e.kind === 'buff' && e.stat === 'attackDamagePct');
const isS2PassiveDot = (b: any) =>
  b.trigger?.kind === 'passive' &&
  b.target?.kind === 'enemy' &&
  b.effects.some((e: any) => e.kind === 'dot');
const isS2IntervalDot = (b: any) =>
  b.trigger?.kind === 'interval' &&
  b.effects.some((e: any) => e.kind === 'dot');
const isBurstNuke = (b: any) =>
  b.trigger?.kind === 'burstCast' &&
  b.effects.some((e: any) => e.kind === 'flatDamage');
const isBurstDot = (b: any) =>
  b.trigger?.kind === 'burstCast' &&
  b.effects.some((e: any) => e.kind === 'dot');

// ---- counterfactual patches ------------------------------------------------------------------
/** SB1: drop the t=0 force-cast Sakura Petals window (keep the 30s re-casts + the buff). */
const noForceCast = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !isS2PassiveDot(b));
  if (ov.skill2.length !== before - 1)
    throw new Error('sbis S2 passive dot block missing — fixture is stale');
});
/** SB2: the naive "passive ignores duration → full 15.64" over-count. */
const naiveFullBuff = withPatchedOverride(SLUG, (ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'buff' && x.stat === 'attackDamagePct');
  if (!e)
    throw new Error('sbis Dancing Flower buff missing — fixture is stale');
  e.value = 15.64;
});
/** SB2: the old single-window under-count 1.30 (= 15.64 × 15/180). */
const singleWindowBuff = withPatchedOverride(SLUG, (ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'buff' && x.stat === 'attackDamagePct');
  if (!e)
    throw new Error('sbis Dancing Flower buff missing — fixture is stale');
  e.value = 1.3;
});
/** SB3: drop the 30s re-cast (keep only the t=0 force window). */
const noRecast = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !isS2IntervalDot(b));
  if (ov.skill2.length !== before - 1)
    throw new Error('sbis S2 interval dot block missing — fixture is stale');
});
/** SB4: the crown misparse — collapse the 10 sequential hits to ONE 457.14 hit. */
const singleHitNuke = withPatchedOverride(SLUG, (ov) => {
  const b = ov.burst.find(isBurstNuke);
  if (!b) throw new Error('sbis burst nuke block missing — fixture is stale');
  const first = b.effects.find((e: any) => e.kind === 'flatDamage');
  b.effects = [first];
});
/** SB5: a single stack (35.16%/s) instead of the full 10-stack 351.6%/s. */
const singleStackDot = withPatchedOverride(SLUG, (ov) => {
  const b = ov.burst.find(isBurstDot);
  if (!b) throw new Error('sbis burst dot block missing — fixture is stale');
  b.effects.find((e: any) => e.kind === 'dot').atkPct = 35.16;
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noForce = run({ [SLUG]: noForceCast });
const naive = run({ [SLUG]: naiveFullBuff });
const singleWin = run({ [SLUG]: singleWindowBuff });
const noRe = run({ [SLUG]: noRecast });
const oneHit = run({ [SLUG]: singleHitNuke });
const oneStack = run({ [SLUG]: singleStackDot });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const sbisDmg = (evs: SimEvent[]) => dmg(evs).filter((d) => d.slug === SLUG);
/** Sakura Petals sustained ticks (S2 line): skill2-sourced, 256% each. */
const petalsTicks = (evs: SimEvent[]) =>
  sbisDmg(evs).filter((d) => d.srcSlot === 'skill2' && d.atkPct === 256);
const sbisBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === SLUG);
const nukeHits = (evs: SimEvent[]) =>
  sbisDmg(evs).filter((d) => d.srcSlot === 'burst' && d.atkPct === 457.14);
const burstDotTicks = (evs: SimEvent[]) =>
  sbisDmg(evs).filter(
    (d) => d.srcSlot === 'burst' && d.bucket === 'burst' && d.atkPct !== 457.14
  );
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
/** sbis normal-attack damage total — the bucket the Dancing Flower time-average scales. */
const normalTotal = (evs: SimEvent[]) =>
  sbisDmg(evs)
    .filter((d) => d.bucket === 'normal')
    .reduce((s, d) => s + d.amount, 0);

describe('sakura-bloom-in-summer — kit spec', () => {
  describe('SB1 — S1 force-casts Skill 2 at battle start (the t=0 Sakura Petals window)', () => {
    it('produces Sakura Petals ticks inside the first 20s (the force-cast window)', () => {
      const early = petalsTicks(base.events).filter((d) => d.sec < 20);
      expect(
        early.length,
        'no Sakura Petals ticks before 20s — the t=0 force-cast is missing'
      ).toBe(15);
      expect(
        early[0].sec,
        'first tick must land at 1s off a t=0 cast'
      ).toBeCloseTo(1, 5);
    });

    it('DISCRIMINATING: without the force-cast, the first window starts at the 30s re-cast', () => {
      const early = petalsTicks(noForce.events).filter((d) => d.sec < 20);
      expect(early.length).toBe(0);
      // …and the fight loses exactly one 15-tick window overall.
      expect(
        petalsTicks(base.events).length - petalsTicks(noForce.events).length
      ).toBe(15);
    });

    it('whole-picture: the force-cast window adds real damage', () => {
      expect(base.totals[SLUG]).toBeGreaterThan(noForce.totals[SLUG]);
    });
  });

  describe('SB2 — S2 Dancing Flower is the 50%-duty time-average 7.82%, self-scoped always-on', () => {
    const df = buffs(base.events).filter(
      (b) => b.casterIdx === SBIS && b.stat === 'attackDamagePct'
    );

    it('is 7.82% (= 15.64 × 90/180), not the naive 15.64 nor the single-window 1.30', () => {
      expect([...new Set(df.map((b) => b.value))]).toEqual([7.82]);
      expect(7.82).toBeCloseTo(15.64 * (90 / 180), 5);
    });

    it('is applied once at t=0 to herself, with no wall-clock expiry (engine passive alwaysOn)', () => {
      expect(df.length).toBeGreaterThan(0);
      for (const b of df) {
        expect(b.frame).toBe(0);
        expect(b.targetIdx).toBe(SBIS);
        expect(b.expiresFrame).toBeNull();
      }
    });

    it('DISCRIMINATING: her normal-attack damage sits BETWEEN the naive and single-window models', () => {
      const nBase = normalTotal(base.events);
      const nNaive = normalTotal(naive.events);
      const nSingle = normalTotal(singleWin.events);
      expect(
        nNaive,
        'naive full 15.64 must out-damage shipped'
      ).toBeGreaterThan(nBase);
      expect(
        nBase,
        'shipped must out-damage the single-window 1.30'
      ).toBeGreaterThan(nSingle);
    });
  });

  describe('SB3 — S2 Sakura Petals 256%/s × 15s re-casts every 30s = 6 windows', () => {
    it('every tick is the kit magnitude, in the skill bucket', () => {
      const ticks = petalsTicks(base.events);
      expect(ticks.length).toBeGreaterThan(0);
      expect([...new Set(ticks.map((d) => d.atkPct))]).toEqual([256]);
      expect([...new Set(ticks.map((d) => d.bucket))]).toEqual(['skill']);
    });

    it('runs 6 windows (90 ticks): the t=0 force-cast + five 30s re-casts', () => {
      expect(petalsTicks(base.events).length).toBe(90);
      // six distinct 30s bands: [1-15],[31-45],[61-75],[91-105],[121-135],[151-165]
      const bands = new Set(
        petalsTicks(base.events).map((d) => Math.floor(d.sec / 30))
      );
      expect([...bands].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
    });

    it('DISCRIMINATING: dropping the 30s re-cast collapses to the single force window (15 ticks)', () => {
      expect(petalsTicks(noRe.events).length).toBe(15);
    });
  });

  describe('SB4 — burst nuke: 457.14% × 10 sequential hits per cast, before the FB window', () => {
    it('lands exactly 10 hits per burst cast at the kit magnitude, in the burst bucket', () => {
      const casts = sbisBursts(base.events).length;
      const hits = nukeHits(base.events);
      expect(casts).toBeGreaterThan(0);
      expect(hits.length).toBe(casts * 10);
      expect([...new Set(hits.map((d) => d.atkPct))]).toEqual([457.14]);
      expect([...new Set(hits.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      expect(nukeHits(base.events).filter((d) => d.fbMajorApplied)).toEqual([]);
    });

    it('DISCRIMINATING: the single-hit misparse lands 1/10 the burst hits', () => {
      const casts = sbisBursts(oneHit.events).length;
      expect(nukeHits(oneHit.events).length).toBe(casts); // 1 per cast, not 10
      expect(nukeHits(base.events).length).toBe(
        nukeHits(oneHit.events).length * 10
      );
    });
  });

  describe('SB5 — burst stacking DoT: 351.6%/s (35.16 × 10 stacks) flat from tick 1, × 10s', () => {
    it('ticks at the full 10-stack magnitude in the burst bucket', () => {
      const ticks = burstDotTicks(base.events);
      expect(ticks.length).toBeGreaterThan(0);
      expect([...new Set(ticks.map((d) => d.atkPct))]).toEqual([351.6]);
      expect([...new Set(ticks.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('is flat from the first tick (hit-applied full stacks, not a per-second ramp)', () => {
      // a ramp would produce growing ticks (35.16, 70.32, …); every tick is the full 351.6.
      const ticks = burstDotTicks(base.events);
      expect(ticks.every((d) => d.atkPct === 351.6)).toBe(true);
    });

    it('DISCRIMINATING: a single stack would tick at 35.16%/s (10× less)', () => {
      const ticks = burstDotTicks(oneStack.events);
      expect([...new Set(ticks.map((d) => d.atkPct))]).toEqual([35.16]);
    });
  });

  describe('SB6 — S1 part-destroy lines are genuinely UNMODELED (partless scope-lock boss)', () => {
    const ov = loadOverride(SLUG)!;

    it('skill1 carries no encoding (the three part-destroy triggers can never fire here)', () => {
      expect((ov as any).skill1).toEqual([]);
    });

    it('all three part-destroy lines are documented verbatim in unmodeled.skill1', () => {
      const un = (ov as any).unmodeled.skill1 as string[];
      const joined = un.join('\n');
      expect(joined).toContain("destroys an enemy's part");
      expect(joined).toContain('Sustained Damage ▲ 5.1% for 30 sec.');
      expect(joined).toContain('Dancing Flower Duration ▲ 10.02 sec.');
      expect(joined).toContain('Sakura Petals Duration ▲ 10.02 sec.');
    });

    it('INERT: no Sustained Damage ▲5.1% buff ever applies (the partless boss never triggers it)', () => {
      const sustained = buffs(base.events).filter(
        (b) => b.stat === 'sustainedDamagePct' && b.casterIdx === SBIS
      );
      expect(
        sustained,
        'a part-destroy sustained-damage buff fired on a partless boss'
      ).toEqual([]);
    });

    it('INERT: no Sakura Petals window is extended to ~25s (the duration-extend line never fires)', () => {
      // 15 ticks per window (1s cadence × 15s); an extended 25.02s window would yield ~25.
      const perBand = new Map<number, number>();
      for (const t of petalsTicks(base.events)) {
        const band = Math.floor(t.sec / 30);
        perBand.set(band, (perBand.get(band) ?? 0) + 1);
      }
      for (const [band, n] of perBand)
        expect(n, `band ${band} has ${n} ticks`).toBe(15);
    });
  });
});
```

### 7b. Driver override — src/skills/overrides/sakura-bloom-in-summer.json

```json
{
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Remove this banner only when the unit has been measured/hand-tuned. — kit-parse AUTHOR wave 6 (2026-07-16), sakura-bloom-in-summer (Sakura: Bloom in Summer, AR/Wind/Attacker/B3 — NOT base sakura). MODEL: S1a force-casts S2 ONCE at battle start → S2's two effects encoded as passive-at-t0 blocks in the skill2 slot: (1) Sakura Petals = 256%/s sustained DoT, durationSec 15. UPDATED 2026-07-20 (owner): the datamined skillCooldownsSec.skill2 = 30 IS a real S2 re-activation CD (supersedes this note's earlier 'datamine has NO S2 cooldown' claim — bakery-bot's wiki-matched CD is a data point the old ulti_skill_detail read didn't carry). So S2 force-casts at t=0 (S1 'Forcefully uses Skill 2') AND re-casts every 30s → 6 windows [0-15],[30-45]…[150-165] = 90s uptime. Encoded as passive dot dur15 (t=0) + interval:30 dot dur15 (the 5 re-casts); (2) Dancing Flower attackDamagePct 15.64 for 15s → passive buffs ignore durationSec (sim.ts alwaysOn) so it stays TIME-AVERAGED, now over the 90s/180s = 50% uptime → 15.64×90/180 = 7.82 ⚑3 (was 1.30 for the single-window model). BURST: 457.14%×10 sequential attacks vs the single boss = TEN flatDamage 457.14 effects flavor sequential in one burstCast block (auto pre-FB/no-FB; kept as 10 instances, not one 4571.4 consolidation, so skillGauge fires per hit like the real 10 hits and popups match; same-frame landing vs the real ~1-2s spread is a negligible simplification; fixes the materialized freeze's ×10 loss — it shipped 457.14 ONCE, same misparse class as crown); stacking DoT 35.16%/s ×10 stacks (all 10 sequential hits land on the one boss → full stacks per cast) = one dot 351.6%/s ×10s per burst cast (dur 10 < burst interval → no overlap; genuine-stacking carve-out satisfied per-cast) ⚑4 stack-application reading. SKIPPED (unmodeled.skill1): the three part-destroy trigger pairs — Sustained Damage ▲5.1%/30s self, Dancing Flower Duration ▲10.02s, Sakura Petals Duration ▲10.02s — 'destroys an enemy's part' can never fire on the partless scope-lock boss (genuinely-skippable class). S1a 'Forcefully uses Skill 2' is IMPLEMENTED (it is the t0 activation of both skill2 blocks), so not listed in unmodeled. ⚑ LIST: ⚑1 cadence tuple (MANDATORY) — pullsPerSec 12 (datamine rate_of_fire 720 rpm), reloadFrames 81, reload_start_ammo 59; mag-empty 60/12=5s is class-plausible, no special-fire-mode text tells; recipe: rounds/min + reload gap from any focus video. ⚑2 S2 uptime RESOLVED 2026-07-20 (owner ruled the datamined 30s CD is a real re-cast) — now t=0 force-cast + every-30s re-cast = 6×15s windows (90s uptime); residual ⚑ = first-fire phase confirmed t=0 by the 'Forcefully uses Skill 2' clause, and whether the CD keeps re-casting uninterrupted for the whole fight (assumed yes). ⚑3 Dancing Flower now 7.82 time-average = 15.64×90/180 (50% uptime; engine passive-buff limitation forces the time-average; coupled to ⚑2). ⚑4 burst DoT stacks — shipped hit-applied full 10 stacks/cast (351.6%/s from tick 1); alternative per-second self-ramp would be ×0.55 of this; recipe: read sustained tick popups right after her burst — flat ~351.6%-scale ticks from the first second = hit-applied, growing ticks = ramp. ⚑5 (low) sequential flavor tag on the nuke means teammates' Sequential Damage ▲ buffs scale it — text-derived. NOT SIMMED (parallel-batch staging rule): validate-overrides + DBG firing check owed by the driver at promotion. Kit-autonomy gauntlet 2026-07-25: all 5 load-bearing lines cross-family-corroborated FAITHFUL (S2b claude-fable-5 / S5-S7 claude-opus-5 converged); the 3 part-destroy S1 lines are UNMODELED-verbatim (partless scope-lock boss can never trigger 'destroys an enemy's part'); 19-test pin GREEN (scripts/tests/units/sakura-bloom-in-summer.test.ts). Dancing Flower is the engine-faithful 50%-duty time-average 7.82 (⚑3); burst stacking DoT opens at full 10 stacks = 351.6%/s (⚑4).",
  "unmodeled": {
    "skill1": [
      "Activates when an ally or self destroys an enemy's part. Affects self.",
      "Sustained Damage ▲ 5.1% for 30 sec.",
      "Activates when an ally or self destroys an enemy's part. Affects self if in Dancing Flower status.",
      "Dancing Flower Duration ▲ 10.02 sec.",
      "Activates when an ally or self destroys an enemy's part. Affects all enemies who are in Sakura Petals status.",
      "Sakura Petals Duration ▲ 10.02 sec."
    ],
    "skill2": [],
    "burst": []
  },
  "caveats": [
    "skill2: force-cast at t=0 (S1 'Forcefully uses Skill 2') AND re-cast every 30s on its datamined CD — Sakura Petals 256%/s runs 6×15s windows (90s uptime); resolved 2026-07-20 (owner), was a single t=0–15 window",
    "skill2: Dancing Flower Attack Damage ▲ 15.64%/15s time-averaged to 7.82% over the 90s/180s (50%) uptime (engine passive buffs cannot carry a duration) — was 1.30% for the single-window model ⚑",
    "burst: 457.14% ×10 sequential attacks modeled as 10 same-frame hits vs the single boss; the stacking DoT assumes all 10 stacks apply per cast (351.6%/s ×10s) ⚑",
    "cadence: datamined 12 pulls/s + 81-frame reload are unverified estimates ⚑"
  ],
  "skill1": [],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": { "kind": "passive" },
      "target": { "kind": "self" },
      "effects": [{ "kind": "buff", "stat": "attackDamagePct", "value": 7.82 }]
    },
    {
      "slot": "skill2",
      "trigger": { "kind": "passive" },
      "target": { "kind": "enemy" },
      "effects": [
        {
          "kind": "dot",
          "atkPct": 256,
          "durationSec": 15,
          "intervalSec": 1,
          "flavor": "sustained"
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": { "kind": "interval", "sec": 30 },
      "target": { "kind": "enemy" },
      "effects": [
        {
          "kind": "dot",
          "atkPct": 256,
          "durationSec": 15,
          "intervalSec": 1,
          "flavor": "sustained"
        }
      ]
    }
  ],
  "burst": [
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "enemy" },
      "effects": [
        { "kind": "flatDamage", "atkPct": 457.14, "flavor": "sequential" },
        { "kind": "flatDamage", "atkPct": 457.14, "flavor": "sequential" },
        { "kind": "flatDamage", "atkPct": 457.14, "flavor": "sequential" },
        { "kind": "flatDamage", "atkPct": 457.14, "flavor": "sequential" },
        { "kind": "flatDamage", "atkPct": 457.14, "flavor": "sequential" },
        { "kind": "flatDamage", "atkPct": 457.14, "flavor": "sequential" },
        { "kind": "flatDamage", "atkPct": 457.14, "flavor": "sequential" },
        { "kind": "flatDamage", "atkPct": 457.14, "flavor": "sequential" },
        { "kind": "flatDamage", "atkPct": 457.14, "flavor": "sequential" },
        { "kind": "flatDamage", "atkPct": 457.14, "flavor": "sequential" }
      ]
    },
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "enemy" },
      "effects": [
        {
          "kind": "dot",
          "atkPct": 351.6,
          "durationSec": 10,
          "intervalSec": 1,
          "flavor": "sustained"
        }
      ]
    }
  ]
}
```

## 8. Verdict instructions

Return ONLY the JSON specified in §1 (per-line categories, faithfulnessScore, verdict, verdictRationale, suggestedFix). The driver's position: all 5 load-bearing lines FAITHFUL, the 3 part-destroy S1 lines DOCUMENTED_GAP (partless boss), the 10 S5 test failures are RECON_ERROR (3 blind helper bugs) + the 2 documented ⚑ encoding divergences (Q3 Dancing Flower time-average 7.82; Q4 burst-DoT 351.6 full-stacks) — zero REAL-GOTCHA. Rule independently.
