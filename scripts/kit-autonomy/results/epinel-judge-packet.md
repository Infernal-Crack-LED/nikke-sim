# S7 JUDGE PACKET — `epinel` (Epinel) — compilation of the gauntlet artifacts (2026-08-03)

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

> Section headings use roman numerals since 2026-08-03 — the old letter labels collided with a one-letter unit slug under the packet leak-check word-boundary regex.

**I. Convergence is MECHANICAL (do this first).** Run the S5 blind tests, UNMODIFIED, against the driver's
SHIPPED override (mentally trace, or note what a run would show): **GREEN = convergence; any RED = a
divergence to classify.** A divergence the blind caught is the REAL signal; mere same-model agreement is WEAK
evidence (every agent is the same model — convergence proves stability, not correctness).

**II. Per kit line, classify** the driver's encoding against prose + formula, using S2b/S6 to attribute:

- `FAITHFUL` — encoding matches prose AND the formula SSOT agrees the routing is correct (right bucket,
  trigger timing, stacking rule, scope, duration semantics, target set).
- `DOCUMENTED-GAP` — deliberately `unmodeled` (reason in `note`), a `GAP` (missing primitive, `it.skip`), or a
  `⚑` (estimate + recipe + tier). Acceptable; the decision is recorded.
- `REAL-GOTCHA` — a divergence NOT documented. Sub-kinds, ranked: `SILENT_DROP` (line nowhere — not block,
  config, or `unmodeled`) → `ENGINE`/`FIDELITY` (encoded but the engine routes/executes it so behavior differs
  from the kit wording, or the downstream effect is modeled rather than the named mechanic) → `ENCODING`
  (wrong value/stat/trigger/target/scope/duration vs the prose).
- `RECON_ERROR` — a blind agent misread clear code/prose (the driver + formula agree); note it, not a finding.

**III. Fire-rate / "modeled≠working" check:** each FAITHFUL block must FIRE at the prose-implied cadence over
the 180s fight (the DBG side-effect check), not merely be present. A modeled line that doesn't activate is a
REAL-GOTCHA. (A block whose only observable is a consumer's reaction needs a fixture that strips the unit's
other sources of that signal — note if the driver's fixture fails to isolate.)

**IV. Discrimination check:** each load-bearing test must FAIL under its named nearest-wrong model (per the
S2d matrix / S2b). A test green under both shipped and counterfactual asserts nothing → REAL-GOTCHA.

**V. Cross-check the blind agents:** for each S5/S6 divergence from the driver, is it corroborated by the
prose + formula (a fresh find) or spurious? Undocumented + formula-confirmed = the most valuable output.

**VI. Magnitude scope:** magnitudes are owner/measurement-gated and OUT OF SCOPE — do NOT flag a magnitude as
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

## I. Ground truth — kit prose (data/characters.json → characters.epinel.skills, SL10) + base stats

Epinel — SMG / Wind / Attacker / Burst III, Missilis, cd 40s, ammo 120, reloadFrames 81, RoF 1440/min (datamine), hitsPerShot 1, normalAttackMultiplier 10.12, coreAttackMultiplier 250, burstGaugePerShot 0.1. Base: HP 13500 / ATK 600 / DEF 78, critRate 15%, critDamage 150%.

- skill1 ("Total Noob"): ■ Activates when killing an enemy. Affects self. | Total Noob: ATK ▲ 13.86%, stacks up to 5 time(s) and lasts for 15 sec.
- skill2 ("Arachnid"): ■ Activates when the last bullet hits the target. Affects self. | Critical Rate ▲ 5.05% for 5 sec. | Critical Damage ▲ 6.4% for 5 sec.
- burst ("SAFE 50-50"): ■ Affects all enemies. | Deals 457.87% of final ATK as Burst Skill damage. ■ Activates when Total Noob is at max stacks. Affects the same targets. | Deals 457.87% of final ATK as additional damage.

## II. Damage-formula SSOT (summary; full docs: docs/data/damage-calculation.md + docs/data/game-mechanics.md)

Damage = ATK × major (×1.10 element if advantaged; +50% Full Burst major applied ONLY by timing — a burst CAST
lands BEFORE the FB window opens, so burstCast damage never takes the +50%) × charge × damageUp-bucket × taken × distributed.

- critRatePct / critDamagePct are GENERIC crit stats (apply to every crit-eligible hit of the holder); critRateNormalPct is the distinct normal-attacks-only stat. crit eligibility of a hit is opt-in per effect kind (flatDamage `crit` flag); the expected-value crit factor is 1 + critRate×(critDmg−1).
- `lastBullet` trigger fires when the owner's magazine empties / reload starts — the named "last bullet" archetype.
- Burst nukes ride the 'burst' bucket with srcSlot 'burst'; skill/rider hits ride 'skill'.
- WORLD MODEL (load-bearing for this unit): the sim fights ONE immortal, partless boss at scope lock. There is NO enemy-death/kill event anywhere in the engine and no adds — "on kill" triggers can never fire, and any gate that reads a kill-fed resource can never open.
- DEF is damage-inert in the sim; no HP pool is modeled.

## III. Driver's implementation — override (src/skills/overrides/epinel.json)

{
"note": "Kit-autonomy gauntlet 2026-08-03 — FROM-SCRATCH build (no prior override; simSupported:false flipped by this gauntlet), Tier 2, cross-family S2b (claude-fable-5) converged on all 5 lines with zero divergences. UNIT: epinel (Epinel) — SMG/Wind/Attacker/Burst III, Missilis, cd 40s, ammo 120, reloadFrames 81, RoF 1440/min (datamine), baseCrit 15/150. MODEL — SKILL2 'Arachnid' ('Activates when the last bullet hits the target. Affects self.'): lastBullet → self → critRatePct 5.05 + critDamagePct 6.4, durationSec 5, one block (both effects ride the single trigger, same frame — pinned by test). lastBullet (owner magazine empty / reload start) IS the named 'last bullet' archetype (privaty/marciana/anis-sparkling-summer/exia precedent); the 'hits the target' clause is scope-trivial (every shot lands on the partless single boss). Her 120-round magazine cycles ~6.3–7.4s (24/s datamine RoF, ~20/s effective with per-shot gaps, + 81f reload), so the 5s window runs ~65–80% uptime — asserted STRUCTURALLY in the spec test (per-reload-cycle applications, count bounded away from both the shot count and the cast count), never as a pinned percentage. BURST 'SAFE 50-50': burstCast → enemy → flatDamage 457.87 (burst bucket; 'Affects all enemies' collapses to the single partless boss). The cast lands BEFORE the Full Burst window opens, so the nuke never takes the +50% FB major (verified fact 2026-07-13); keyed to HER casts only — co-B3 helm leads alternate FBs in the control fixture, so a fullBurstEnter keying would over-fire and go in-FB (the Tier-2 trigger discrimination, pinned). NO `ignored` blocks. ⚑1 (skill1 'Total Noob', UNMODELED — out-of-domain, world-model): the trigger is an enemy KILL ('Activates when killing an enemy'); the engine has NO kill event (grep-verified: no kill primitive in src/engine) and the scope-lock fight is one immortal partless boss with no adds, so Total Noob (ATK ▲13.86% ×5 stacks, 15s) can never accrue and the line contributes exactly zero in ANY sim run. Deliberately NOT encoded as a passive max-stacks buff (69.3% ATK): that would fabricate damage the sim's world cannot produce (nearest-wrong counterfactual, pinned RED by the spec test). ESTIMATE: in real multi-add content she stacks to 5 within the first add wave (~seconds) and holds it, so the in-game value is ~+69.3% ATK most of a fight — material for any future adds-enabled scope, zero here. RECIPE: if enemy-death/adds are ever modeled, declare resource pool `totalNoob` [0..5], +1 per kill event with the 15s per-stack duration (⚑ per-stack independent timers vs whole-pool refresh — measure from the in-game icon), and read it as a passive self atkPct perResource {totalNoob, mult:13.86}. TIER: out-of-domain (world model), not a value estimate. ⚑2 (burst max-stacks rider, UNMODELED — gated by ⚑1): 'Activates when Total Noob is at max stacks. Affects the same targets. Deals 457.87% of final ATK as additional damage.' The gate reads ⚑1's kill-fed pool, so it can never open at scope and the rider deals zero all fight. Faithful record = verbatim-unmodeled + this ⚑; the nearest-wrong model (folding it into an unconditional second hit, 915.74%/cast) is pinned RED by the spec test. ESTIMATE: in real content the gate is effectively always open by her first burst (kills accrue in the opening seconds vs a 40s CD), so the in-game burst is effectively 915.74% — the sim's 457.87 is a scope-lock necessity, not a value choice. RECIPE: with ⚑1's pool modeled, add a second burstCast → enemy → flatDamage 457.87 block under resourceGate {name:'totalNoob', min:5}. ⚑3 (cadence tuple, standard): ammo 120 / reloadFrames 81 / RoF 1440 are datamine fields (unverified for this unit); they set the lastBullet clock and thus the S2 crit-window uptime. Recipe: read fire cadence + reload gap from any focus video. All magnitudes (13.86, 5.05, 6.4, 457.87) are kit-literal SL10 → DATAMINED; no CALIBRATED values anywhere in this kit.",
"caveats": [
"skill1: 'Total Noob' (ATK ▲13.86% ×5 stacks on killing an enemy, 15s) is UNMODELED — the engine has no kill event and the scope-lock boss is immortal with no adds, so the stacks can never accrue; provably zero contribution in every sim run (⚑1)",
"burst: the 'Total Noob at max stacks' conditional (457.87% additional damage) is UNMODELED with the pool that feeds its gate — zero contribution at scope; in real multi-add content the gate is effectively always open (⚑2)",
"skill2: the crit-window uptime (~65–80%) rides the datamine cadence tuple (ammo 120 / reloadFrames 81 / RoF 1440) — unverified for this unit (⚑3)"
],
"unmodeled": {
"skill1": [
"Activates when killing an enemy. Affects self. Total Noob: ATK ▲ 13.86%, stacks up to 5 time(s) and lasts for 15 sec."
],
"skill2": [],
"burst": [
"Activates when Total Noob is at max stacks. Affects the same targets. Deals 457.87% of final ATK as additional damage."
]
},
"skill1": [],
"skill2": [
{
"slot": "skill2",
"trigger": { "kind": "lastBullet" },
"target": { "kind": "self" },
"effects": [
{ "kind": "buff", "stat": "critRatePct", "value": 5.05, "durationSec": 5 },
{ "kind": "buff", "stat": "critDamagePct", "value": 6.4, "durationSec": 5 }
]
}
],
"burst": [
{
"slot": "burst",
"trigger": { "kind": "burstCast" },
"target": { "kind": "enemy" },
"effects": [{ "kind": "flatDamage", "atkPct": 457.87 }]
}
]
}

## IV. S2b pre-op adversarial review (claude-fable-5, CROSS-FAMILY)

{
"slug": "epinel",
"leakDetected": null,
"spec": [
{
"slot": "skill1",
"kitLine": "Activates when killing an enemy",
"disposition": "UNMODELED",
"scope": "Generic ATK stat buff (no normal/charge/crit scoping) — Total Noob: ATK ▲ 13.86%, max 5 stacks, 15 sec.",
"durationSemantics": "Wall-clock seconds (15 sec) with a stack cap of 5 — but the duration is moot because the trigger can never fire at scope.",
"triggerIdentity": "On-kill trigger. The TriggerDef schema has NO kill primitive, and the scope-lock fight is a single immortal partless boss with no adds — nothing ever dies, so the trigger fires ZERO times. The only faithful encodings are (a) record verbatim in `unmodeled`, or (b) an inert resource pool with no earn path; either way stacks stay 0 all fight.",
"targetSet": "self",
"nearestWrongModel": "Encoding Total Noob as a passive always-on self buff at max stacks (atkPct 69.3, i.e. 13.86×5) — 'stacks up to 5' read as steady-state instead of kill-gated. Over-credits epinel's entire damage by ~+69% ATK AND silently satisfies the burst's max-stack gate.",
"distinguishingAssertion": "Run controlComp('epinel') and collect buffApply events with targetSlug 'epinel' and stat 'atkPct': there must be ZERO such events sourced from skill1 (no value-13.86 and no value-69.3 applies). Additionally totals(runComp(...))['epinel'] must be bit-identical when skill1 is emptied via withPatchedOverride('epinel', o => { o.skill1 = []; }). Green under faithful (inert), red under the passive misread.",
"inertness": "Skill1 must move NOTHING at scope: no buffApply, no totals delta, and it must NOT open the burst's max-stack gate.",
"evidenceTier": "DATAMINED",
"loadBearing": false
},
{
"slot": "skill2",
"kitLine": "when the last bullet hits the target",
"disposition": "FAITHFUL",
"scope": "UNSCOPED Critical Rate ▲ 5.05% — the prose says 'Critical Rate', not 'Critical Rate of normal attacks', so plain critRatePct (not critRateNormalPct) is correct.",
"durationSemantics": "Wall-clock 5 sec (durationSec: 5). NOT rounds — no 'round(s)' wording. With ammo 120 at SMG cadence (~20/s effective, ⚑ cadence is a datamine-unreliable tuple) a magazine is ~6.0s + 81f (1.35s) reload, so the buff is CYCLICAL: applied at each last bullet, covering the reload plus ~3.65s of the next magazine (~65–70% uptime), then lapsing until the next magazine end.",
"triggerIdentity": "{ kind: 'lastBullet' } — per-magazine, on the owner's last bullet. No FB gate, no everyN, no status gate.",
"targetSet": "self",
"nearestWrongModel": "Passive/always-on crit buffs (100% uptime instead of ~65–70%), OR keying to 'shotFired' (refresh every pull → effectively permanent). Both over-credit crit uptime; the gap between the misreads and faithful is the reload-cycle lapse window.",
"distinguishingAssertion": "Collect buffApply events with stat 'critRatePct' && value 5.05 && targetSlug 'epinel': count must be ≥ 2 and equal epinel's reload-cycle count (≈ one per magazine, ~20+ over 180s), with each expiresFrame ≈ applyFrame + 300 (5s×60fps). Under the passive misread there is exactly 1 apply at frame 0 (or a durationSec-free apply); under shotFired there are thousands. Also assert the buff LAPSES: there must exist frames between consecutive applies later than expiresFrame of the previous apply.",
"inertness": "Must not apply to allies (no buffApply with this stat/value targeting liter/crown/helm) and must not fire on burst casts or FB entry.",
"evidenceTier": "DATAMINED",
"loadBearing": true
},
{
"slot": "skill2",
"kitLine": "Critical Damage ▲ 6.4% for 5 sec",
"disposition": "FAITHFUL",
"scope": "Unscoped Critical Damage ▲ 6.4% — plain critDamagePct.",
"durationSemantics": "Wall-clock 5 sec, same cyclical last-bullet cadence as the crit-rate line (same block, second effect).",
"triggerIdentity": "{ kind: 'lastBullet' } — same trigger as the crit-rate effect; the two effects ride one block.",
"targetSet": "self",
"nearestWrongModel": "Same as the sibling line: passive always-on, or de-synchronized from the crit-rate effect (e.g. put on a different trigger so their windows drift apart).",
"distinguishingAssertion": "buffApply events with stat 'critDamagePct' && value 6.4 must be frame-coincident 1:1 with the critRatePct-5.05 applies (same applyFrame, same count). Red if counts differ, if only one exists, or if either is applied exactly once at t=0.",
"inertness": "Self-only; no ally targets; no effect outside the 5s windows.",
"evidenceTier": "DATAMINED",
"loadBearing": true
},
{
"slot": "burst",
"kitLine": "457.87% of final ATK as Burst Skill dmg",
"disposition": "FAITHFUL",
"scope": "One instant burst-bucket hit, 457.87% of final ATK. No crit/core wording → default rider crit handling per engine convention, no core.",
"durationSemantics": "Instantaneous single hit per cast (cd 40s → ~4–5 casts in 180s depending on rotation share).",
"triggerIdentity": "{ kind: 'burstCast' } — epinel's OWN burst cast. Burst-cast damage lands BEFORE the Full Burst window opens, so it takes NO +50% FB major and no FB-entry auras (FB-exempt by timing, methodology §9).",
"targetSet": "enemy (all enemies = the one boss)",
"nearestWrongModel": "Keying to { kind: 'fullBurstEnter' } — in controlComp the fixture carries TWO Burst-III units (carry + helm), so team Full Bursts can occur on rotations epinel did not burst; fullBurstEnter fires the nuke on helm's rotations too, over-crediting. Secondary misread: letting the hit take the +50% FB major (fbMajorApplied true).",
"distinguishingAssertion": "Collect damage events with srcSlot === epinel's slot && bucket 'burst': the count must equal the number of burstCast events cast BY epinel (not the number of fullBurstStart events), each with mult 457.87 and fbMajorApplied === false / inFullBurst === false. In a two-B3 comp where fullBurstStart count > epinel's burstCast count, the fullBurstEnter misread produces MORE hits — red.",
"inertness": "No hits on rotations where helm (the other B3) bursts; no +50% FB scaling on the hit.",
"evidenceTier": "DATAMINED",
"loadBearing": true
},
{
"slot": "burst",
"kitLine": "when Total Noob is at max stacks",
"disposition": "UNMODELED",
"scope": "A second 457.87% additional-damage hit on the same targets, GATED on Total Noob (skill1's kill-stack buff) being at 5 stacks.",
"durationSemantics": "Instantaneous conditional rider per cast.",
"triggerIdentity": "burstCast + a max-stack gate on the skill1 resource. Because Total Noob only stacks on KILLS and nothing dies at scope, the gate is satisfied ZERO times — the rider deals zero damage all fight. Faithful encodings: unmodeled-verbatim, or a resourceGate {name:'totalNoob', min:5} over a pool with no earn events; both are inert.",
"targetSet": "enemy (same targets as the base burst hit)",
"nearestWrongModel": "THE key misread for this unit: dropping the gate and dealing 915.74% (457.87 × 2) per cast, or authoring the rider ungated 'because the stacks would be up in general content'. This near-doubles epinel's burst-bucket damage. Compounds with the skill1 passive misread (which would make the gate 'legitimately' pass).",
"distinguishingAssertion": "Per epinel burstCast, damage events with srcSlot epinel && bucket 'burst' must number EXACTLY 1 with mult 457.87 — never 2 hits, never a 915.74 mult. Equivalent totals form: unitOf(res,'epinel') burst-bucket contribution per cast === 457.87% × final ATK, and patching the rider block out via withPatchedOverride changes totals by exactly 0.",
"inertness": "The rider must contribute ZERO damage at scope; removing it must be a no-op on totals.",
"evidenceTier": "DATAMINED",
"loadBearing": false
}
],
"loadBearingSet": [
"skill2:lastBullet Critical Rate ▲ 5.05% / 5s",
"skill2:lastBullet Critical Damage ▲ 6.4% / 5s",
"burst:burstCast 457.87% burst-bucket hit (FB-exempt, own-cast-only)"
],
"unmodeledVerbatim": {
"skill1": [
"■ Activates when killing an enemy. Affects self. Total Noob: ATK ▲ 13.86%, stacks up to 5 time(s) and lasts for 15 sec."
],
"skill2": [],
"burst": [
"■ Activates when Total Noob is at max stacks. Affects the same targets. Deals 457.87% of final ATK as additional damage."
]
},
"notes": "Expected shared-prior misreads to reconcile hardest: (1) the burst's max-stack rider shipped UNGATED (doubling burst-bucket damage to 915.74%/cast) — the per-cast exactly-one-457.87-hit assertion is the discriminator; (2) Total Noob encoded as a steady-state passive (+69.3% ATK) because 'stacks up to 5' pattern-matches to ramp-to-cap kits — but the trigger is ON-KILL and the scope-lock boss is immortal with no adds, so both skill1 and the burst rider are provably inert at scope (zero-buffApply + patched-out-no-op assertions must be in the suite, not just omitted lines); (3) skill2 given 100% uptime — the faithful model is cyclical last-bullet applications with ~65–70% uptime given ammo 120, ~20/s effective SMG cadence (the cadence tuple itself is an ALWAYS-⚑ datamine-unreliable value; the uptime assertion should be structural — apply-per-reload-cycle + lapse-before-next-apply — not pinned to an exact uptime percentage). Burst nearest-wrong fullBurstEnter-vs-burstCast genuinely diverges here because the control fixture contains a second Burst III (helm), so the assertion has real discriminating power in-fixture. All magnitudes (13.86, 5.05, 6.4, 457.87) are kit-literal → DATAMINED; no CALIBRATED ⚑ values are needed anywhere in this kit.",
"model": "claude-fable-5"
}

## V. S5 blind post-op test-writer (claude-opus-5, CROSS-FAMILY) + RUN RESULT vs the driver override

RUN RESULT (driver-run, adapted variant — mechanical adaptations only, logged): **12 passed / 0 RED / 2 skipped** of 14. The 2 skips are the author's own GAP records (the kill trigger and the max-stacks rider — both exactly the driver's UNMODELED lines). Adaptations (mechanics-only): (1) harness import path fixed (blind/ sits under kit-autonomy/, not tests/units/); (2) the event-contract assertion `durationShots === undefined` → `(durationShots ?? null) === null` (the engine emits durationShots:null on wall-clock buffs). Full blind-run log: scripts/kit-autonomy/blind/epinel.blind-run.txt.

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

- epinel (SMG / Wind / Attacker / Burst III, 120 ammo, 81f reload) — kit spec test.
- Written from the kit prose ALONE (blind: no driver override / tests / reasoning consulted).
-
- KIT, read literally, and what each line must do in the sim:
-
- skill1 "Total Noob" — "Activates when killing an enemy. Affects self."
- ATK up 13.86%, stacks to 5, 15 sec.
- > TRIGGER IDENTITY: the activation clause is a KILL. The scope-lock fixture is a solo-raid
-     boss that never dies and spawns no adds, and TriggerDef carries no kill primitive at all
-     (passive / burstCast / fullBurstEnter / hitCount / shotFired / lastBullet / recovery /
-     shielded / interval / stageEnter / bossElement / teamAmmo / chargeCounter — no kill).
-     GAP. The only faithful OBSERVABLE at scope lock is therefore "epinel grants herself no
-     ATK buff", whether the override omits the line or encodes a trigger that never fires.
- > NEAREST-WRONG: re-keying the unmodelable kill trigger to `passive` (or to a shot/hit
-     trigger) so the stack sits live for the whole fight — up to +69.3% ATK on an Attacker.
-     Test A2 asserts the 13.86%/69.3% self-ATK buff is NEVER applied; A3 patches that passive
-     IN and shows damage rises, proving the omission is load-bearing rather than a no-op.
-
- skill2 — "Activates when the last bullet hits the target. Affects self."
- Critical Rate up 5.05% for 5 sec / Critical Damage up 6.4% for 5 sec.
- > SCOPE: plain "Critical Rate", NOT "Critical Rate of normal attacks" — generic critRatePct,
-     not critRateNormalPct. DURATION: wall-clock seconds (not rounds, not until-reload).
-     TRIGGER: lastBullet (per magazine). TARGET: self.
- > NON-VACUITY: her 120-round SMG magazine plus an 81-frame reload runs ~7s, longer than the
-     5s window, so the fixture exercises BOTH the active and the lapsed state — B3 asserts the
-     gap between consecutive applications exceeds the 5s window.
- > NEAREST-WRONGS: dropped/inert (B4), scoped to normal attacks (B1 filters on stat +
-     value, so a critRateNormalPct encoding finds zero events), permanent / until-reload
-     (B5 shows a 15s duration strictly out-earns the faithful 5s).
-
- burst — "Affects all enemies. Deals 457.87% of final ATK as Burst Skill damage."
-         "Activates when Total Noob is at max stacks. Affects the same targets.
-          Deals 457.87% of final ATK as additional damage."
- > ONE 457.87% burst-cast hit is payable. The SECOND 457.87% is gated on Total Noob at max
-     stacks, which is unreachable at scope lock (no kills => no stacks), so it must not be
-     credited.
- > NEAREST-WRONG: an unconditional 915.74% burst (both components always paid). C1 measures
-     the shipped burst-damage CONTRIBUTION as a ratio against a canonical single-457.87%
-     reference built in-memory; a double-credit lands near 2.0, the faithful model near 1.0.
-     The ratio form makes the test tolerant of modelling details I cannot know blind (crit
-     eligibility, noFb/noRange flags) while still separating 1x from 2x.
- > C2: burst-cast damage is Full-Burst-exempt by timing (the cast lands before the FB window
-     opens), so no burst-slot damage event may carry the +50% FB major. This also discriminates
-     the wrong trigger identity (fullBurstEnter instead of burstCast).
-
- FIXTURES
- controlComp('epinel', true) — self-buff + inertness work. liter B1 + crown B2 supply the
-                                  chain so a lone Burst III actually casts (a lone B3 makes ZERO
-                                  Full Bursts).
- controlComp('epinel', false) — burst-damage identity work, so epinel is the SOLE Burst III
-                                  and the fixed-B3 slot's buffs cannot confound the comparison.
- Deterministic (no seed). 7 hoisted 180s runs.
  */

const SLUG = 'epinel';
const CRIT_RATE_PCT = 5.05;
const CRIT_DMG_PCT = 6.4;
const CRIT_WINDOW_FRAMES = 5 * 60;
const NOOB_ATK_PCT = 13.86;
const NOOB_MAX_STACKS = 5;
const BURST_ATK_PCT = 457.87;
const EPS = 1e-6;

type SlotName = 'skill1' | 'skill2' | 'burst';
type LooseEffect = Record<string, unknown>;
type LooseBlock = { effects?: LooseEffect[] } & Record<string, unknown>;

/**

- The override FILE is slot-keyed. The slot value is documented in two shapes (a raw Block[],
- or a CharacterSkills carrying its own `blocks`), so resolve either and mutate IN PLACE —
- reassigning `ov[slot]` would be the classic blind no-op.
  */
  function slotBlocks(ov: unknown, slot: SlotName): LooseBlock[] {
  const holder = ov as Record<string, unknown>;
  const raw = holder[slot];
  if (Array.isArray(raw)) return raw as LooseBlock[];
  const inner = (raw as { blocks?: unknown } | undefined)?.blocks;
  if (Array.isArray(inner)) return inner as LooseBlock[];
  throw new Error(`epinel spec: could not resolve blocks for slot ${slot}`);
  }

/** Remove every damage-bearing effect from the burst slot (the zero-burst-damage baseline). */
function stripBurstDamage(ov: unknown): void {
for (const blk of slotBlocks(ov, 'burst')) {
if (Array.isArray(blk.effects)) {
blk.effects = blk.effects.filter(
(e) => e.kind !== 'flatDamage' && e.kind !== 'dot' && e.kind !== 'storedHit',
);
}
}
}

type Comp = ReturnType<typeof controlComp> & { cfg?: Record<string, unknown> };

function comp(helm: boolean): Comp {
return controlComp(SLUG, helm) as Comp;
}

function runWithEvents(opts: Comp): { res: ReturnType<typeof runComp>; events: SimEvent[] } {
const events: SimEvent[] = [];
const res = runComp({
...opts,
cfg: { ...(opts.cfg ?? {}), onEvent: (ev: SimEvent) => events.push(ev) },
} as Comp);
return { res, events };
}

function buffApplies(events: SimEvent[]) {
return events.filter(
(e): e is Extract<SimEvent, { kind: 'buffApply' }> => e.kind === 'buffApply',
);
}

function damages(events: SimEvent[]) {
return events.filter((e): e is Extract<SimEvent, { kind: 'damage' }> => e.kind === 'damage');
}

// ---------------------------------------------------------------------------
// Hoisted runs (each is a full 180s sim).
// ---------------------------------------------------------------------------

const base = runWithEvents(comp(true));
const baseTotals = totals(base.res);

// skill2 removed entirely — the "dropped line" nearest-wrong.
const noSkill2Totals = totals(
runComp({
...comp(true),
overrides: {
[SLUG]: withPatchedOverride(SLUG, (ov) => {
const blocks = slotBlocks(ov, 'skill2');
blocks.splice(0, blocks.length);
}),
},
} as Comp),
);

// skill2 buff windows stretched 5s -> 15s — the "wrong duration semantics" nearest-wrong.
const longCritTotals = totals(
runComp({
...comp(true),
overrides: {
[SLUG]: withPatchedOverride(SLUG, (ov) => {
for (const blk of slotBlocks(ov, 'skill2')) {
for (const eff of blk.effects ?? []) {
if (eff.kind === 'buff' && typeof eff.durationSec === 'number') {
eff.durationSec = 15;
}
}
}
}),
},
} as Comp),
);

// Total Noob re-keyed to an always-on max-stack self buff — the kill-trigger nearest-wrong.
const noobPassiveTotals = totals(
runComp({
...comp(true),
overrides: {
[SLUG]: withPatchedOverride(SLUG, (ov) => {
slotBlocks(ov, 'skill1').push({
slot: 'skill1',
trigger: { kind: 'passive' },
target: { kind: 'self' },
effects: [
{
kind: 'buff',
stat: 'atkPct',
value: NOOB_ATK_PCT * NOOB_MAX_STACKS,
durationSec: 15,
},
],
});
}),
},
} as Comp),
);

// Sole-B3 fixture for the burst identity work.
const soloB3 = runWithEvents(comp(false));
const soloB3Totals = totals(soloB3.res);

const noBurstDamageTotals = totals(
runComp({
...comp(false),
overrides: { [SLUG]: withPatchedOverride(SLUG, stripBurstDamage) },
} as Comp),
);

const singleBurstTotals = totals(
runComp({
...comp(false),
overrides: {
[SLUG]: withPatchedOverride(SLUG, (ov) => {
stripBurstDamage(ov);
slotBlocks(ov, 'burst').push({
slot: 'burst',
trigger: { kind: 'burstCast' },
target: { kind: 'enemy' },
effects: [{ kind: 'flatDamage', atkPct: BURST_ATK_PCT }],
});
}),
},
} as Comp),
);

// ---------------------------------------------------------------------------

describe('epinel — fixture sanity', () => {
it('epinel is in both fixtures and deals damage', () => {
expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
expect(unitOf(soloB3.res, SLUG).totalDamage).toBeGreaterThan(0);
});

it('the B1+B2 chain actually produces Full Bursts (a lone B3 would produce zero)', () => {
const fbStarts = base.events.filter((e) => e.kind === 'fullBurstStart');
expect(fbStarts.length).toBeGreaterThan(0);
});
});

describe('epinel skill1 — "Total Noob" ATK stack (kill-triggered: GAP at scope lock)', () => {
// A1 is the GAP record: the engine has no kill trigger and the scope-lock boss never dies.
it.skip(
'GAP: "Activates when killing an enemy" has no engine primitive and cannot fire at scope ' +
'lock (immortal, partless, add-less boss) — unobservable, so nothing can discriminate it',
() => {},
);

it('A2: epinel never receives a Total Noob self ATK buff (13.86% / 5x = 69.3%)', () => {
const noobLike = buffApplies(base.events).filter(
(e) =>
e.targetSlug === SLUG &&
(e.stat === 'atkPct' || e.stat === 'casterAtkPct') &&
(Math.abs(Number(e.value) - NOOB_ATK_PCT) < EPS ||
Math.abs(Number(e.value) - NOOB_ATK_PCT * NOOB_MAX_STACKS) < EPS),
);
// RED if the kill trigger was re-keyed to passive / shotFired / lastBullet to "not lose" the line.
expect(noobLike).toHaveLength(0);
});

it('A3: the omission is load-bearing — patching the max-stack passive IN raises her damage', () => {
expect(noobPassiveTotals[SLUG]).toBeGreaterThan(baseTotals[SLUG]);
});
});

describe('epinel skill2 — last-bullet crit window (5.05% CR / 6.4% CD for 5s, self)', () => {
const applies = buffApplies(base.events);
const critRate = applies.filter(
(e) =>
e.targetSlug === SLUG &&
e.stat === 'critRatePct' &&
Math.abs(Number(e.value) - CRIT_RATE_PCT) < EPS,
);
const critDamage = applies.filter(
(e) =>
e.targetSlug === SLUG &&
e.stat === 'critDamagePct' &&
Math.abs(Number(e.value) - CRIT_DMG_PCT) < EPS,
);

it('B1: both buffs are applied to epinel herself, as GENERIC crit at the kit magnitudes', () => {
// RED under the scope nearest-wrong: a critRateNormalPct encoding matches neither filter,
// and an ally-scoped target would not carry targetSlug === 'epinel'.
expect(critRate.length).toBeGreaterThanOrEqual(2);
expect(critDamage.length).toBeGreaterThanOrEqual(2);
});

it('B2: the two buffs fire together (one last-bullet trigger, two effects)', () => {
expect(critDamage.length).toBe(critRate.length);
});

it('B3: the window is a finite 5s that genuinely LAPSES between magazines (non-vacuity)', () => {
const expiries = critRate.map((e) => Number(e.expiresFrame));
expect(expiries.every((f) => Number.isFinite(f))).toBe(true);
// expiresFrame = applyFrame + window, so consecutive deltas are the trigger spacing.
const gaps = expiries.slice(1).map((f, i) => f - expiries[i]);
expect(gaps.length).toBeGreaterThan(0);
// Her ~120-round magazine + 81f reload is ~7s > the 5s window: the buff is provably OFF
// for part of every cycle, so the assertions above are not testing an always-on buff.
expect(Math.max(...gaps)).toBeGreaterThan(CRIT_WINDOW_FRAMES);
// ...and the buff is not a round-count duration masquerading as seconds.
expect(critRate.every((e) => e.durationShots === undefined)).toBe(true);
});

it('B4: the buffs are productive — removing skill2 lowers her damage', () => {
expect(baseTotals[SLUG]).toBeGreaterThan(noSkill2Totals[SLUG]);
});

it('B5: the 5s duration is load-bearing — a 15s window strictly out-earns it', () => {
// RED if the buffs were modelled permanent / until-reload / whole-fight.
expect(longCritTotals[SLUG]).toBeGreaterThan(baseTotals[SLUG]);
});

it('B6: INERTNESS — a self-scoped crit buff moves no teammate', () => {
for (const slug of Object.keys(baseTotals)) {
if (slug === SLUG) continue;
expect(noSkill2Totals[slug]).toBe(baseTotals[slug]);
}
});
});

describe('epinel burst — 457.87%, and the max-stack rider that cannot fire', () => {
it('C1: exactly ONE 457.87% component is paid, not two', () => {
const shippedContribution = soloB3Totals[SLUG] - noBurstDamageTotals[SLUG];
const oneComponent = singleBurstTotals[SLUG] - noBurstDamageTotals[SLUG];
expect(oneComponent).toBeGreaterThan(0);
const ratio = shippedContribution / oneComponent;
// Faithful ~1.0; the nearest-wrong (both 457.87% lines paid unconditionally, i.e. the
// Total-Noob-max-stacks rider credited despite being unreachable) lands ~2.0. The band is
// wide enough to absorb modelling details a blind spec cannot know (crit eligibility,
// noFb/noRange flags) yet still separates 1x from 2x.
expect(ratio).toBeGreaterThan(0.6);
expect(ratio).toBeLessThan(1.5);
});

it('C2: burst damage is Full-Burst-exempt (the cast lands before the FB window opens)', () => {
const burstSlotDamage = damages(soloB3.events).filter((e) => e.srcSlot === 'burst');
expect(burstSlotDamage.length).toBeGreaterThan(0);
// RED if the burst hit were keyed to fullBurstEnter instead of burstCast (it would pick up
// the +50% FB major it must never receive).
expect(burstSlotDamage.every((e) => e.fbMajorApplied !== true)).toBe(true);
});

it.skip(
'GAP: the second 457.87% "when Total Noob is at max stacks" rider is unobservable at scope ' +
'lock — its gate depends on the unmodelable kill trigger, so only its ABSENCE (C1) is testable',
() => {},
);
});

## VI. S6 blind post-op override-writer (claude-opus-5, CROSS-FAMILY) + diff vs the driver override

DIFF vs the driver override: block-for-block IDENTICAL on both live lines (skill2: lastBullet → self → critRatePct 5.05 + critDamagePct 6.4 /5s in one block; burst: burstCast → enemy → flatDamage 457.87) and on both UNMODELED dispositions (empty skill1; verbatim max-stacks rider in unmodeled.burst; no resourceGate authored because nothing can increment the pool). TWO presentational differences: (a) S6 splits the unmodeled lines at the period (2 entries per slot vs the driver's 1 merged entry — same text); (b) S6 opts `crit: true` on the burst nuke where the driver follows the repo's text-silent default (no crit flag — d/helm prior-2: kit text says nothing about the nuke critting, so the default stands; impact if flipped ≈ +1.6% of her total — burst bucket is ~21.7% of her damage at 15%/150% base crit — NOT load-bearing). S6's own audit: 'No core strike wording → core omitted; noRange is engine-automatic; noFb left unset (cast lands pre-FB).'

S6 override (nested under `override` in the envelope):

{
"slug": "epinel",
"skill1": [],
"skill2": [
{
"slot": "skill2",
"trigger": {
"kind": "lastBullet"
},
"target": {
"kind": "self"
},
"effects": [
{
"kind": "buff",
"stat": "critRatePct",
"value": 5.05,
"durationSec": 5
},
{
"kind": "buff",
"stat": "critDamagePct",
"value": 6.4,
"durationSec": 5
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
"atkPct": 457.87,
"crit": true
}
]
}
],
"unmodeled": {
"skill1": [
"Activates when killing an enemy. Affects self.",
"Total Noob: ATK \u25b2 13.86%, stacks up to 5 time(s) and lasts for 15 sec."
],
"skill2": [],
"burst": [
"Activates when Total Noob is at max stacks. Affects the same targets.",
"Deals 457.87% of final ATK as additional damage."
]
},
"caveats": [
"\u26d1 Skill 1 is gated on an enemy KILL. The schema has no kill trigger and the scope-lock fight is a single partless boss with no killable adds, so Total Noob would accrue 0 stacks here regardless of encoding \u2014 the whole skill is modeled as inert rather than given an invented trigger. If footage shows killable adds, this becomes a real +69.3% self ATK ceiling (5 \u00d7 13.86%, 15s window) and must be enacted with a kill primitive + stack pool.",
"\u26d1 Burst branch 2 (a second 457.87% hit) fires only at max Total Noob, so it is inert for the same reason as skill 1. It is NOT modeled at partial credit \u2014 crediting it unconditionally would roughly DOUBLE her burst damage; crediting it at a guessed uptime would be a fabricated value.",
"\u26d1 The burst hit is authored crit-eligible (rider prior: riders crit at the caster's sheet rate) and left FB-exempt by cast TIMING only \u2014 noFb is not set, per the default-OFF/measured-only rule; the engine casts the burst before the Full Burst window opens.",
"\u26d1 SMG cadence (pulls/s) and reloadFrames 81 come from the datamine and are unreliable; they set the last-bullet period, which is the sole driver of skill 2's uptime. A 120-round belt at ~20 effective shots/s implies one last-bullet event per ~7.3s cycle against a 5s buff \u2014 i.e. partial, not permanent, uptime."
],
"note": "PARSER BASELINE (HYPOTHESIS \u2014 NOT a validated model). Every \u26d1 below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Epinel is modeled from two live lines: a last-bullet self crit package (Crit Rate 5.05% / Crit Damage 6.4%, 5s, per magazine) and a single burst-cast hit of 457.87% of final ATK on the boss, crit-eligible, resolved pre-Full-Burst by cast timing. Her kill-driven Total Noob stack (ATK \u25b2 13.86% \u00d75, 15s) and the burst's max-stack second 457.87% hit are deliberately unmodeled: the fight has no killable enemy, so their trigger can never fire, and no invented trigger or partial-uptime credit is substituted for it. Skill 1 is therefore an empty slot by evidence, not by oversight \u2014 see unmodeled/caveats."
}

S6 audit trail:

[
{
"slot": "skill1",
"kitLine": "Activates when killing an enemy.",
"status": "SKIPPED",
"effectOrReason": "No kill/on-death TriggerDef exists in the schema, and the sim's only enemy is the partless raid boss (never killed within the 180s fight), so no encoding of this trigger can fire. Recorded verbatim in unmodeled.skill1; inventing an interval/hitCount proxy would fabricate the stack cadence."
},
{
"slot": "skill1",
"kitLine": "Total Noob: ATK \u25b2 13.86%, x5, 15 sec",
"status": "SKIPPED",
"effectOrReason": "The buff itself is trivially expressible (buff/atkPct 13.86, maxStacks 5, durationSec 15, target self) but is unreachable without the kill trigger above \u2014 skipped as a unit, not dropped silently. Ceiling if ever enacted: +69.3% self ATK."
},
{
"slot": "skill2",
"kitLine": "Activates when the last bullet hits",
"status": "IMPLEMENTED",
"effectOrReason": "trigger lastBullet (per-magazine, fires at reload start), target self."
},
{
"slot": "skill2",
"kitLine": "Critical Rate\u25b2 5.05% for 5 sec.",
"status": "IMPLEMENTED",
"effectOrReason": "buff critRatePct 5.05, durationSec 5. Unscoped in the prose (no 'of normal attacks' qualifier) \u2192 generic critRatePct, NOT critRateNormalPct."
},
{
"slot": "skill2",
"kitLine": "Critical Damage \u25b2 6.4% for 5 sec.",
"status": "IMPLEMENTED",
"effectOrReason": "buff critDamagePct 6.4, durationSec 5, same block/trigger/target."
},
{
"slot": "burst",
"kitLine": "Affects all enemies.",
"status": "IMPLEMENTED",
"effectOrReason": "target {kind:'enemy'} \u2014 single-boss fight, so 'all enemies' collapses to one hit."
},
{
"slot": "burst",
"kitLine": "Deals 457.87% of final ATK as Burst",
"status": "IMPLEMENTED",
"effectOrReason": "flatDamage atkPct 457.87, crit true, on trigger burstCast. No 'core strike' wording \u2192 core omitted; noRange is engine-automatic; noFb left unset (cast lands pre-FB)."
},
{
"slot": "burst",
"kitLine": "Activates when Total Noob is at max",
"status": "SKIPPED",
"effectOrReason": "Gate depends on skill 1's kill-driven stacks, which cannot accrue at scope lock; no resourceGate authored because no effect can ever increment the pool. Verbatim in unmodeled.burst."
},
{
"slot": "burst",
"kitLine": "Deals 457.87% ... as additional damage.",
"status": "SKIPPED",
"effectOrReason": "The rider body of the max-stack branch above. Modeling it unconditionally would double burst damage on a condition the fight never satisfies."
}
]

S6 flags (⚑ list with estimate + reasoning + recipe):

[
{
"field": "skill1 (entire slot) + burst block 2",
"estimate": "0 stacks / branch never fires at scope lock \u2192 both left unmodeled (0% contribution). If adds exist and die steadily, the realistic shape is a sawtooth toward the 5-stack cap (+69.3% self ATK) plus a second 457.87% burst hit once the cap is held at cast time.",
"reasoning": "The kit's activation clause is an enemy KILL. TriggerDef has no kill/on-death kind, and the sim entity model is a single immortal partless boss, so there is no event to key on. Any proxy trigger (interval, hitCount) would invent the kill cadence, which is exactly the fabricated-value failure mode; a partial-uptime credit on the burst rider would be worse still, since the rider is 50% of her burst damage.",
"recipe": "Watch a full scope-lock recording for add spawns/deaths. If none: the skip is correct and permanent for this fight, record it as such. If adds die: count kills per 10s from footage to get a stack trajectory, add a kill trigger primitive (or a resource pool incremented by it) with a resourceGate {name:'totalNoob', min:5} on the burst rider, and pin the pre-cast stack count from the burst-frame buff icons."
},
{
"field": "base cadence (pullsPerSec / reloadFrames) \u2192 skill2 lastBullet period",
"estimate": "~20 effective shots/s (SMG, 60fps frame quantisation) over a 120-round belt \u2192 ~6.0s firing + ~1.35s reload \u2248 7.3s per last-bullet event, against a 5s buff \u2192 ~65-70% uptime on both crit buffs.",
"reasoning": "Datamined rate_of_fire and reloadFrames are known-unreliable fields, and the effective rate is 60/ceil(60/nominal), not the nominal value. Skill 2 is Epinel's only sustained self-buff, so its entire magnitude is a function of this period \u2014 a 10% cadence error moves the crit uptime directly.",
"recipe": "Read the on-screen ammo counter across one full magazine in a scope-lock recording (shots/sec measured directly, not inferred from full-burst counts), and time reload-start \u2192 refill to pin reloadFrames."
},
{
"field": "burst[0].effects[0].crit",
"estimate": "true (rolls crit at Epinel's sheet rate)",
"reasoning": "Kit-silent. The standing rider prior is that function-damage riders crit at the caster's rate and receive no core unless the text says 'core strike damage'; this line says neither, so crit ON / core OFF is the prior-consistent read. Flagged because it is an assumption, not kit text.",
"recipe": "Read popup colour at the burst frame in footage \u2014 orange + crit icon = crit-eligible, plain white across many casts = not. Requires n\u22655 casts to separate a non-crit line from an unlucky roll."
},
{
"field": "burst[0].effects[0].noFb (unset)",
"estimate": "unset (default OFF) \u2014 exemption expected to come from cast timing, not the flag",
"reasoning": "The burst hit is keyed to burstCast, which resolves before the Full Burst window opens, so it should already miss the +50% major without an explicit noFb. Setting noFb unmeasured would violate the default-OFF/measured-only rule and would silently double-exempt if the engine ever moved the cast inside the window.",
"recipe": "Log the burst damage event and assert inFullBurst === false / fbMajorApplied === false on the burstCast hit; if it lands inside the window, the fix is the cast-timing path, not a per-kit noFb."
}
]

## VII. Driver's tests (scripts/tests/units/epinel.test.ts — 21 tests, ALL GREEN vs the shipped override)

// PER-UNIT KIT SPEC — `epinel` (Epinel — the SMG/Wind/Attacker/Burst III, Missilis, cd 40s,
// ammo 120, reloadFrames 81, RoF 1440/min; NOT a variant — no other Epinel exists in the
// roster, lint clean 2026-08-03). Kit-autonomy gauntlet 2026-08-03, test-first, FROM SCRATCH
// (no prior override; simSupported:false flipped by this gauntlet).
//
// Kit (blablalink prose, data/characters.json → characters.epinel.skills, SL10):
// S1 ■ killing an enemy → self: Total Noob ATK ▲13.86%, stacks to 5, lasts 15 sec [E-S1 gap]
// S2 ■ last bullet hits the target → self: Critical Rate ▲5.05% for 5 sec [E1]
// ■ (same trigger) Critical Damage ▲6.4% for 5 sec [E1]
// BU ■ all enemies: 457.87% of final ATK as Burst Skill damage [E3]
// ■ IF Total Noob at max stacks → same targets: 457.87% of final ATK extra damage [E4 gap]
//
// Model + dispositions (line inventory — all 5 lines accounted):
// E-S1 UNMODELED. The trigger is an enemy KILL. The engine has no kill event (grep-verified:
// no kill primitive anywhere in src/engine — the scope-lock boss is immortal and there
// are no adds), so the Total Noob stacks can never accrue in ANY sim run and the line
// contributes exactly zero damage. Encoding it (e.g. a permanent max-stacks ATK buff)
// would fabricate damage the sim's world cannot produce. Verbatim in unmodeled.skill1,
// pinned below; the nearest-wrong model is the counterfactual E2 discriminates against.
// E1 lastBullet → self → critRatePct 5.05 + critDamagePct 6.4, durationSec 5. The engine's
// `lastBullet` trigger (fires when the owner's magazine empties / reload starts) IS the
// named "last bullet" archetype (privaty/marciana/anis-sparkling-summer precedent). Her
// 120-round magazine (datamine RoF 1440/min ≈ 24/s, effective ~20/s with per-shot gaps)
// + 81f reload ≈ a 6.3–7.4s cycle, so the 5s window runs ~65–80% uptime — a cadence-tuple
// ⚑, asserted STRUCTURALLY (per-reload-cycle applications, count bounded away from both
// the shot count and the cast count), never as a pinned percentage. Live, not permanent:
// the shotFired counterfactual (per-shot refresh → 100% uptime) is the nearest-wrong
// cadence model and must over-damage her.
// E3 burstCast → enemy → flatDamage 457.87. Burst bucket; the cast lands BEFORE the Full
// Burst window opens, so it never takes the +50% FB major (verified fact 2026-07-13);
// keyed to HER casts only — co-B3 helm leads alternate FBs, so a fullBurstEnter keying
// would over-fire (the Tier-2 trigger discrimination). "All enemies" collapses to the
// single partless boss.
// E4 UNMODELED. The gate is Total Noob AT MAX STACKS — E-S1's kill-fed pool. No kills at
// scope ⇒ the gate can never open ⇒ the extra hit contributes exactly zero in any run.
// The honest record is verbatim-unmodeled + ⚑ (in a real multi-add fight Epinel stacks
// Total Noob almost instantly, so the in-game burst is effectively 915.74% — that is the
// ⚑'s estimate; the sim's 457.87 is a scope-lock necessity, not a value choice). The
// nearest-wrong model — folding the conditional into an unconditional second hit — is
// the counterfactual E4 discriminates against.
//
// Fixture: controlComp('epinel') = liter B1 / crown B2 / epinel B3 / helm B3, boss Fire (neutral
// for Wind — no elem-advantage lines in this kit anyway), focus epinel. Both B3s are 40s-CD, so
// they alternate casts and epinel's burst lines get >=2 firings; helm leading alternate FBs is
// what makes burstCast-vs-fullBurstEnter genuinely diverge. Deterministic (no seed); event-log
// over totals. Slot order: liter 0 / crown 1 / epinel 2 / helm 3.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import {
controlComp,
data,
runComp,
totals,
unitOf,
withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** controlComp slot order: liter 0 / crown 1 / epinel 2 / helm 3. */
const EPINEL = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
const events: SimEvent[] = [];
const res = runComp({
...controlComp('epinel'),
overrides,
cfg: { onEvent: (e) => events.push(e) },
});
return { res, events, totals: totals(res) };
}

// ---- counterfactual / reference patches -------------------------------------------------------
const hasStat = (b: any, stat: string) =>
b.effects.some((e: any) => e.stat === stat);
const hasKind = (b: any, kind: string) =>
b.effects.some((e: any) => e.kind === kind);

/** E1 reference: the S2 crit line removed entirely (liveness baseline). _/
const epinelNoS2 = withPatchedOverride('epinel', (ov) => {
const before = ov.skill2.length;
ov.skill2 = ov.skill2.filter(
(b: any) => !hasStat(b, 'critRatePct') && !hasStat(b, 'critDamagePct')
);
if (ov.skill2.length === before) {
throw new Error('epinel S2 crit block missing — fixture is stale');
}
});
/_* E1 counterfactual: the same line re-keyed to EVERY shot (permanent-uptime over-credit). _/
const epinelS2ShotFired = withPatchedOverride('epinel', (ov) => {
const b = ov.skill2.find((x: any) => hasStat(x, 'critRatePct'));
if (!b || b.trigger?.kind !== 'lastBullet') {
throw new Error(
'epinel S2 lastBullet crit block missing — fixture is stale'
);
}
b.trigger = { kind: 'shotFired' };
});
/_* E2 counterfactual: S1's kill-fed stacks misread as a permanent max-stacks ATK buff

- (5 stacks × 13.86% = 69.3%). _/
  const epinelS1MaxPassive = withPatchedOverride('epinel', (ov) => {
  if (ov.skill1.length !== 0) {
  throw new Error('epinel skill1 blocks must be empty — fixture is stale');
  }
  ov.skill1 = [
  {
  slot: 'skill1',
  trigger: { kind: 'passive' },
  target: { kind: 'self' },
  effects: [{ kind: 'buff', stat: 'atkPct', value: 69.3 }],
  },
  ];
  });
  /_* E3 reference: the burst nuke removed. _/
  const epinelNoNuke = withPatchedOverride('epinel', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasKind(b, 'flatDamage'));
  if (ov.burst.length === before) {
  throw new Error('epinel burst nuke block missing — fixture is stale');
  }
  });
  /_* E3 counterfactual: the nuke keyed to fullBurstEnter (fires on helm-led FBs too, in-FB). _/
  const epinelNukeFbEnter = withPatchedOverride('epinel', (ov) => {
  const b = ov.burst.find((x: any) => hasKind(x, 'flatDamage'));
  if (!b) {
  throw new Error('epinel burst nuke block missing — fixture is stale');
  }
  b.trigger = { kind: 'fullBurstEnter' };
  });
  /_* E4 counterfactual: the max-stacks conditional folded into an unconditional second hit. */
  const epinelDoubleNuke = withPatchedOverride('epinel', (ov) => {
  const b = ov.burst.find((x: any) => hasKind(x, 'flatDamage'));
  if (!b) {
  throw new Error('epinel burst nuke block missing — fixture is stale');
  }
  ov.burst = [
  ...ov.burst,
  {
  slot: 'burst',
  trigger: { kind: 'burstCast' },
  target: { kind: 'enemy' },
  effects: [{ kind: 'flatDamage', atkPct: 457.87 }],
  },
  ];
  });

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noS2 = run({ epinel: epinelNoS2 });
const s2ShotFired = run({ epinel: epinelS2ShotFired });
const s1MaxPassive = run({ epinel: epinelS1MaxPassive });
const noNuke = run({ epinel: epinelNoNuke });
const nukeFbEnter = run({ epinel: epinelNukeFbEnter });
const doubleNuke = run({ epinel: epinelDoubleNuke });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const dmg = (evs: SimEvent[]) =>
evs.filter((e): e is Damage => e.kind === 'damage');
const epinelBuffs = (evs: SimEvent[], stat: string) =>
buffs(evs).filter((b) => b.casterIdx === EPINEL && b.stat === stat);
const epinelShots = (evs: SimEvent[]) =>
evs.filter((e) => e.kind === 'shot' && e.slug === 'epinel').length;
const epinelCasts = (evs: SimEvent[]) =>
evs.filter(
(e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'epinel'
);
const fbStarts = (evs: SimEvent[]) =>
evs.filter((e) => e.kind === 'fullBurstStart');
const epinelNukes = (evs: SimEvent[]) =>
dmg(evs).filter((d) => d.slug === 'epinel' && d.srcSlot === 'burst');

// The committed override, for the static (structural / unmodeled) pins.
const shipped = loadOverride('epinel') as any;
if (!shipped) {
throw new Error('epinel has no override on disk — fixture is stale');
}

/** The kit's logical lines, rebuilt from characters.json prose: each "■" bullet merged with its

- indented effect lines. The SSOT comparison target for the verbatim pins. _/
  const kitLines = (slot: 'skill1' | 'skill2' | 'burst'): string[] =>
  data.characters.epinel.skills[slot]
  .split(/\n(?=■)/)
  .map((l) => l.replace(/^■\s_/, '').replace(/\n/g, ' ').trim());

describe('epinel — fixture sanity (non-vacuity)', () => {
it('epinel fires her SMG continuously and empties many magazines', () => {
// The lastBullet clock runs on magazine empties; zero shots would make every cadence claim
// trivially true.
expect(epinelShots(base.events)).toBeGreaterThan(1000);
});

it('the comp actually bursts: epinel casts her BIII and Full Bursts occur', () => {
expect(epinelCasts(base.events).length).toBeGreaterThanOrEqual(2);
expect(fbStarts(base.events).length).toBeGreaterThanOrEqual(2);
});

it('epinel deals weapon damage', () => {
expect(unitOf(base.res, 'epinel').totalDamage).toBeGreaterThan(0);
});
});

describe('E1 — S2 last-bullet crit buffs (5.05% rate / 6.4% damage, 5s, self)', () => {
const rates = epinelBuffs(base.events, 'critRatePct');
const cdmg = epinelBuffs(base.events, 'critDamagePct');

it('applies the exact kit magnitudes, self-only', () => {
expect(rates.length).toBeGreaterThan(0);
expect([...new Set(rates.map((b) => b.value))]).toEqual([5.05]);
expect([...new Set(cdmg.map((b) => b.value))]).toEqual([6.4]);
expect([...new Set(rates.map((b) => b.targetIdx))]).toEqual([EPINEL]);
expect([...new Set(cdmg.map((b) => b.targetIdx))]).toEqual([EPINEL]);
});

it('lasts exactly 5 seconds per application and co-applies on one frame', () => {
for (const b of [...rates, ...cdmg]) {
expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
}
// One last-bullet proc refreshes BOTH stats on the same frame.
expect(rates.length).toBe(cdmg.length);
expect([...new Set(rates.map((b) => b.frame))].sort((a, z) => a - z)).toEqual(
[...new Set(cdmg.map((b) => b.frame))].sort((a, z) => a - z)
);
});

it('fires at LAST-BULLET cadence — many times, but far below the shot count', () => {
const shots = epinelShots(base.events);
const casts = epinelCasts(base.events).length;
// A 120-round SMG empties ~28 times in 180s: far more than her 2-3 burst casts…
expect(rates.length).toBeGreaterThan(casts * 3);
// …and far fewer than her thousands of shots (a shot-keyed encoding applies per pull).
expect(rates.length).toBeLessThan(shots / 20);
});

it('is LIVE: removing it lowers her total (the crit window is not decorative)', () => {
expect(base.totals.epinel).toBeGreaterThan(noS2.totals.epinel);
});

it('DISCRIMINATING: a shot-keyed (permanent-uptime) buff over-damages her', () => {
expect(s2ShotFired.totals.epinel).toBeGreaterThan(base.totals.epinel);
expect(epinelBuffs(s2ShotFired.events, 'critRatePct').length).toBeGreaterThan(
rates.length * 10
);
});
});

describe('E2 — S1 kill-fed ATK stacks are honestly UNMODELED (no kills at scope)', () => {
it('epinel originates no ATK-family buff: her only live stats are the S2 crit pair', () => {
const own = buffs(base.events)
.filter((b) => b.casterIdx === EPINEL)
.map((b) => b.stat);
expect(own.length).toBeGreaterThan(0);
expect([...new Set(own)].sort()).toEqual(['critDamagePct', 'critRatePct']);
});

it('the full S1 line sits verbatim in unmodeled.skill1 (checked vs characters.json)', () => {
const documented = (shipped.unmodeled?.skill1 ?? []) as string[];
expect(documented).toContain(kitLines('skill1')[0]);
expect(shipped.skill1).toEqual([]);
});

it('DISCRIMINATING: a permanent max-stacks ATK buff (5 × 13.86) would inflate her total', () => {
expect(s1MaxPassive.totals.epinel).toBeGreaterThan(base.totals.epinel);
});
});

describe('E3 — burst nuke: 457.87% of final ATK, once per OWN cast, pre-FB', () => {
const nukes = epinelNukes(base.events);
const casts = epinelCasts(base.events);

it('fires once per own burst cast at the kit magnitude, in the burst bucket', () => {
expect(casts.length).toBeGreaterThanOrEqual(2);
expect(nukes.length).toBe(casts.length);
expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([457.87]);
expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
});

it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
expect(nukes.filter((d) => d.fbMajorApplied).length).toBe(0);
});

it('DISCRIMINATING: removing the nuke zeroes her burst-bucket damage', () => {
expect(epinelNukes(noNuke.events).length).toBe(0);
});

it('DISCRIMINATING: a fullBurstEnter keying over-fires on helm-led Full Bursts, in-FB', () => {
// helm co-B3 leads alternate FBs, so a fullBurstEnter-keyed nuke fires MORE often than her
// own casts and lands inside the window (taking the +50% major).
const fbCount = fbStarts(nukeFbEnter.events).length;
const overFired = epinelNukes(nukeFbEnter.events);
expect(overFired.length).toBe(fbCount);
expect(overFired.length).toBeGreaterThan(casts.length);
expect(overFired.some((d) => d.fbMajorApplied)).toBe(true);
});
});

describe('E4 — burst max-stacks extra hit is honestly UNMODELED (the gate can never open)', () => {
it('exactly ONE burst hit per own cast frame — no folded conditional second hit', () => {
const nukes = epinelNukes(base.events);
const perFrame = new Map<number, number>();
for (const d of nukes) {
perFrame.set(d.frame, (perFrame.get(d.frame) ?? 0) + 1);
}
expect(perFrame.size).toBe(epinelCasts(base.events).length);
for (const count of perFrame.values()) {
expect(count).toBe(1);
}
});

it('the conditional line sits verbatim in unmodeled.burst (checked vs characters.json)', () => {
const documented = (shipped.unmodeled?.burst ?? []) as string[];
const conditional = kitLines('burst').find((l) =>
l.includes('Total Noob is at max stacks')
);
expect(conditional).toBeDefined();
expect(documented).toContain(conditional);
});

it('DISCRIMINATING: folding the conditional into an unconditional second hit inflates her total', () => {
expect(doubleNuke.totals.epinel).toBeGreaterThan(base.totals.epinel);
expect(epinelNukes(doubleNuke.events).length).toBe(
epinelNukes(base.events).length * 2
);
});
});

describe('E5 — structure + documentation: nothing dropped, nothing fabricated', () => {
it('skill2 carries exactly one block: the lastBullet crit pair', () => {
expect(shipped.skill2.length).toBe(1);
const b = shipped.skill2[0];
expect(b.trigger).toEqual({ kind: 'lastBullet' });
expect(b.target).toEqual({ kind: 'self' });
expect(b.effects.map((e: any) => e.stat).sort()).toEqual([
'critDamagePct',
'critRatePct',
]);
});

it('burst carries exactly one block: the 457.87 nuke on burstCast', () => {
expect(shipped.burst.length).toBe(1);
const b = shipped.burst[0];
expect(b.trigger).toEqual({ kind: 'burstCast' });
expect(b.target).toEqual({ kind: 'enemy' });
expect(b.effects).toEqual([{ kind: 'flatDamage', atkPct: 457.87 }]);
});

it('the modeled burst line is NOT in unmodeled; no `ignored` block anywhere', () => {
const modeled = kitLines('burst').find((l) =>
l.includes('Burst Skill damage')
);
expect(modeled).toBeDefined();
expect((shipped.unmodeled?.burst ?? []) as string[]).not.toContain(
modeled
);
expect(shipped.ignored).toBeUndefined();
const kinds = [...shipped.skill1, ...shipped.skill2, ...shipped.burst]
.flatMap((b: any) => b.effects.map((e: any) => e.kind))
.filter((k: string) => k === 'ignored');
expect(kinds).toEqual([]);
});
});

## VIII. S2c/S2d reconciliation + verification record (driver)

S2d RED (pre-override): withPatchedOverride threw 'epinel: no override on disk — fixture is stale' — correct RED for a from-scratch unit. S3 GREEN (post-override): 21/21 tests pass; validate-overrides: epinel valid, self-sim dmg 112.2M (burst bucket 21.7%), 3 caveats surfaced. S2c reconciliation: ZERO divergences between driver and the fable reviewer — all 5 dispositions and all 3 nearest-wrong counterfactuals independently identical (passive atkPct 69.3 for the kill stacks; shotFired/permanent-uptime for the crit window; ungated 915.74 double-hit for the rider). One refinement adopted: lastBullet uptime asserted STRUCTURALLY (~65–80% cadence-tuple estimate, never a pinned percentage).

## IX. Board reading (non-gating context)

epinel is a FROM-SCRATCH build: no prior override, absent from data/kit-status.json, simSupported:false until this gauntlet. No board comp exists for her yet; the S8 board read will show no rows. All magnitudes (13.86, 5.05, 6.4, 457.87) are kit-literal SL10 → DATAMINED; no CALIBRATED values anywhere in this kit.
