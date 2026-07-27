# S7 JUDGE PACKET — `anchor-innocent-maid` (self-contained, answer-faithful compilation of the gauntlet artifacts)

You are the BINDING reconciling judge (RECONCILING-JUDGE role). You have NO tools — everything you need is in this
packet. Grade the driver's IMPLEMENTATION against ground truth (the real kit prose + the damage-formula SSOT + two
INDEPENDENT blind re-derivations from the OTHER model family, claude-opus-5). You grade ARTIFACTS, not intent: you
do NOT trust the driver's self-report. EXACT SLUG: `anchor-innocent-maid` (Anchor: Innocent Maid, RL/Water/
Supporter/Burst II) — never conflate with any other unit. Content gate: inspect kit prose STRUCTURALLY; quote
≤ ~40 chars; clinical output.

## 1. Ground truth — kit prose (data/characters.json → characters['anchor-innocent-maid'].skills)

Base: RL / Water / Supporter / Burst II, cd 40s, ammo 6, reloadFrames 141, chargeFrames 60, hitsPerShot 1,
normalAttackMultiplier 61.3, coreAttackMultiplier 200. Water ⇒ clean ×1.10 elemental advantage on a Fire boss.

- **S1** ■ Activates when entering Full Burst. Affects all allies. Effects vary by use-count; each subsequent effect
  triggers all before it (escalating):
  - Once: Potency of HP ▲ 30.96% for 5 sec.
  - Twice: Distributed Damage ▲ 30.4% for 10 sec.
  - Three times: Stack count of debuffs ▼ 1.
  - ■ Activates when entering Full Burst while an ally from the same squad is on the battlefield. Affects all allies.
  - Recovers 3.04% of the skill user's Max HP every 1 sec for 8 sec.
- **S2** ■ Activates when Full Burst ends. Affects all allies. Escalating:
  - Once: Hit Rate ▲ 10.13% for 10 sec.
  - Twice: ATK ▲ 35.02% of the skill user's ATK for 10 sec.
  - Three times: Reload Speed ▲ 40.04% for 15 sec.
- **Burst** ■ Affects all allies.
  - Storage: Stores excess healing received by the skill user, up to 60.19% of their Max HP. Lasts for 25 sec.
  - Recovers 40.18% of the skill user's Max HP as HP.
  - ATK ▲ 30.09% of the skill user's ATK for 10 sec.

## 2. Damage-formula SSOT (docs/data/damage-calculation.md — summary)

Damage = ATK × major (×1.10 element if advantaged) × charge × damageUp-bucket (attackDamagePct / distributedDamagePct
/ etc., additive within the bucket) × taken × distributed. **casterAtkPct is a FLAT ATK add sourced from the CASTER's
staticAtk** (fact (a)) — "ATK ▲ x% of the skill user's ATK" ⇒ casterAtkPct, NOT plain atkPct (which scales each
target's OWN ATK). distributedDamagePct boosts the holder's OWN distributed-flavor hits (a scoped Damage-Up rider),
NOT generic damage. reloadSpeedPct is a weapon-state modifier ⇒ it gates shot count ⇒ it IS damage.

## 3. Verified engine facts (use when classifying)

(a) **casterAtkPct resolves to a FLAT ATK number in the `buffApply` event**: the stored event value is
`(pct/100) × caster.staticAtk`, identical across all targets — NOT the raw percentage. A test filtering the event
log for casterAtkPct value `35.02`/`30.09` finds 0; the raw percentage lives only in the OVERRIDE effect. The S2
buff (35.02%) yields a LARGER flat value than the burst buff (30.09%) — same caster ATK — so the two are separable
by relative magnitude.
(b) **`escalating` natively models the cumulative ramp**: the Nth activation applies steps 1..N. A 2-step escalating
block fires step1 on activation #1 and steps 1+2 from activation #2; a 3-step block adds step3 from activation #3.
So S1 Distributed (step 2) first fires on the 2nd Full Burst; S2 casterAtkPct (step 2) from the 2nd FB-END; S2
reloadSpeedPct (step 3) from the 3rd FB-end. A value-0 placeholder step (S1 step1) preserves the tier ordering.
(c) **`heal` is event-only (no HP amount modeled)**: a heal effect emits recovery events to its targets (drives
cross-unit "on recovery" consumers, e.g. crown). `ticks:8 intervalSec:1` emits 8 timed recovery events per trigger
(1/s for 8s); a heal with no ticks emits 1 instant recovery event. There is no HP pool, so the 3.04%/40.18% Max-HP
MAGNITUDES are unrepresentable — only the tick structure + recovery channel are observable.
(d) **Time-expiry emits NO `buffRemove` event** (only reload-triggered removal does, and `buffRemove` carries no
casterIdx). A buff's wall-clock window is assertable on the `buffApply` itself: `expiresFrame - frame = durSec×60`.
(e) **`burstCast` event carries `{ unitIdx, slug, stage }`** — not srcSlot/slot/casterIdx. `buffApply` carries
`casterIdx`/`targetIdx` (slot indices), `stat`, `value`, `expiresFrame`, `frame`.
(f) **hitRatePct is a core-hit-rate lift**, LIVE since CONE_DELTA (2026-07-19) for AR/SMG/SG recipients via acrForHR;
its in-game core-rate MAGNITUDE is measurement-gated (⚑). It is never dropped.

## 4. Driver's shipped override (src/skills/overrides/anchor-innocent-maid.json — block structure)

- skill1[0]: trigger `fullBurstEnter` → target `allies`; effect `escalating` steps:
  - step1: buff `attackDamagePct` **value 0**, durationSec 1 (VALUE-0 PLACEHOLDER for "Potency of HP" — no heal-potency
    StatKey exists; kept ONLY to preserve escalating tier order so Distributed lands on the 2nd FB, not the 1st; the
    line itself is in unmodeled.skill1).
  - step2: buff `distributedDamagePct` 30.4, durationSec 10.
- skill1[1]: trigger `fullBurstEnter` → target `allies`; effect `heal` ticks 8, intervalSec 1. (Same-squad gate modeled
  always-satisfied — ⚑ SAME-SQUAD GATE; no squad field in the data.)
- skill2[0]: trigger `fullBurstEnd` → target `allies`; effect `escalating` steps:
  - step1: buff `hitRatePct` 10.13, durationSec 10.
  - step2: buff `casterAtkPct` 35.02, durationSec 10.
  - step3: buff `reloadSpeedPct` 40.04, durationSec 15.
- burst[0]: trigger `burstCast` → target `allies`; effects: `heal` (instant) + buff `casterAtkPct` 30.09, durationSec 10.
- unmodeled.skill1: "Once: Potency of HP ▲ 30.96% for 5 sec." · "Three times: Stack count of debuffs ▼ 1." · the
  same-squad header line.
- unmodeled.burst: "Storage: Stores excess healing … up to 60.19% of their Max HP. Lasts for 25 sec." (deliberately NOT
  a shield event — would falsely fire shield-synergy triggers; no engine vocabulary, no damage consumer).
- (Validates: `validate-overrides anchor-innocent-maid` → ✓ valid; dmg 28.5M (8.1%), bursts 5.)

## 5. S6 BLIND override (claude-opus-5, independent prose→JSON, leakDetected:null — block structure + diff vs driver)

- skill1[0]: `fullBurstEnter` → `allies`, escalating steps: step1 buff `targetMaxHpPct` 30.96 (5s) · step2 buff
  `distributedDamagePct` 30.4 (10s).
- skill1[1]: `fullBurstEnter` → `allies`, **teamHas {slugs:[anchor,poli,neve]}** gate; effect `heal` ticks 8, intervalSec 1.
- skill2[0]: `fullBurstEnd` → `allies`, escalating steps: hitRatePct 10.13 (10s) · casterAtkPct 35.02 (10s) ·
  reloadSpeedPct 40.04 (15s).
- burst[0]: `burstCast` → `allies`: heal ticks 1 + casterAtkPct 30.09 (10s).
- unmodeled.skill1: "Three times: Stack count of debuffs ▼ 1." · unmodeled.burst: "Storage … 60.19% … 25 sec."
- **DIFF vs driver — classified:**
  - **Distributed / hitRate / casterAtkPct(35.02) / reloadSpeed / burst casterAtkPct(30.09) / burst heal / heal cadence
    (ticks:8 intervalSec:1) / triggers (fullBurstEnter, fullBurstEnd, burstCast) / targets (allies) / escalating step
    structure / unmodeled (debuff cleanse + Storage):** ALL **IDENTICAL** — converged from the prose alone. Both reads
    independently chose **casterAtkPct** (not atkPct) for BOTH "of the skill user's ATK" lines, and modeled reloadSpeed
    as damage (not skipped).
  - **Potency-of-HP placeholder:** S6 used `targetMaxHpPct 30.96/5s` (literal reading, flagged ⚑ inert); driver used a
    value-0 `attackDamagePct` placeholder + listed the line in unmodeled. BOTH are inert placeholders that preserve the
    escalating tier order (the load-bearing property). DOCUMENTED-GAP placeholder-choice difference, NOT a gotcha.
  - **Same-squad gate:** S6 modeled an explicit `teamHas` gate with an UNVERIFIED squad roster (flagged ⚑, chose
    gated-under-credit); driver modeled always-satisfied (flagged ⚑ SAME-SQUAD GATE, chose ungated-over-credit). Both
    flag the gate semantics as uncertain (no squad field in the data). DOCUMENTED-GAP, NOT a gotcha. Both agree the heal
    line is present with ticks:8 intervalSec:1.

## 6. Driver's test (scripts/tests/units/anchor-innocent-maid.test.ts — 21 assertions, all GREEN vs shipped)

Fixture: liter(B1) / anchor-innocent-maid(B2) / crown(B2, S2 heal removed to isolate anchor as the only recovery source)
/ ada(B3 carry), boss Fire, focus ada. Deterministic.

- L2 distributedDamagePct 30.4/10s: applied value 30.4, 10s; NOT on FB1 (escalating step 2); present from FB2 onward;
  CF attackDamagePct (wrong stat) changes team totals.
- L4 heal ticks:8: 8 recovery events per FB (≥8 in the 8s window after each FB start); CF ticks:1 produces far fewer
  recovery firings.
- L5 hitRatePct 10.13/10s: applied value 10.13, 10s, on every FB-end; appears on FB1-end (escalating step 1).
- L6 casterAtkPct 35.02/10s (S2 step 2): applied as casterAtkPct (larger flat magnitude), 10s; NOT on FB1-end; present
  from FB2-end; CF atkPct changes team totals.
- L7 reloadSpeedPct 40.04/15s (S2 step 3): applied value 40.04, 15s; NOT on FB1/FB2-end; present from FB3-end.
- L9 burst heal: a recovery event fires at each burstCast frame (before the FB window opens).
- L10 casterAtkPct 30.09/10s (burst): applied as casterAtkPct (smaller flat magnitude), 10s; once per burst cast; CF
  atkPct changes team totals.

## 7. S5 BLIND test convergence (claude-opus-5, leakDetected:null)

**PRISTINE blind test (blind/anchor-innocent-maid.test.ts) run UNMODIFIED vs the shipped override: 4 passed / 13 failed
/ 3 skipped (20).** The 3 skips are the correct UNMODELED/GAP lines (Potency of HP, debuff cleanse, Storage). The 4
passes include the no-silent-drops audit (every unmodelable line recorded in `unmodeled`) + no-`ignored`-effects.
Classify the 13 RED: every one is a RECON_ERROR / fixture artifact from blind-writer assumptions that were UNVERIFIABLE
from the de-contaminated packet — NOT a divergence of the override from the prose:

- **[P2] OverrideFile shape (≈10 reds):** the blind walked a flat `o.blocks` array; the real OverrideFile groups
  blocks under `skill1/skill2/burst`. So `walkEffects`/`flattenEscalating`/`stepWithStat`/`OV.blocks` iterated NOTHING
  ⇒ every counterfactual run (FLAT_S1, FLAT_S2, ATK_SELF, RELOAD_0, DIST_GENERIC, NO_SQUAD_GATE, NO_BURST_HEAL)
  equalled BASE (nearest-wrong comparisons vacuous) and every structural read returned null/undefined.
- **[P3] `totals()` shape:** the blind read `t.total/.damage/.sum`; the harness `totals()` is a per-slug map ⇒
  totalDamage() always returned 0 ⇒ every totals-delta discrimination compared 0 vs 0.
- **[P5] buffRemove semantics:** the blind paired buffApply with buffRemove by casterIdx; time-expiry emits NO
  buffRemove (fact (d)) and buffRemove carries no casterIdx ⇒ the removes-pairing assertion could never hold.
- **[P6] burstCast shape:** the blind filtered burstCast by `srcSlot??slot??casterIdx`; the event carries
  `unitIdx/slug` (fact (e)) ⇒ the filter matched nothing.
- **[P8] casterAtkPct event value:** the blind filtered the event log for casterAtkPct value `35.02`/`30.09`; the
  engine emits the flat-resolved add (fact (a)) ⇒ those filters matched nothing.
- **[P4] Fixture contention (3 burst-group reds):** the blind used `controlComp('anchor-innocent-maid',true)` =
  liter/crown/anchor/helm; crown (B2) and anchor (B2) contest the single B2 slot and anchor wins 0 casts ⇒
  `anchorBursts===0` ⇒ every burst assertion vacuous. The blind writer ANTICIPATED this ("if this is 0 … needs a comp
  where she is the sole B2 — report it … a real fixture finding, not a defect in the override").
- **[P7] Squad-gate assumption (1 red):** the blind assumed the heal block carries an inert gate (remove it ⇒ more
  heals). The driver documents the gate as modeled always-satisfied (⚑ SAME-SQUAD GATE) ⇒ there is no gate key to
  remove. This is a DOCUMENTED modeling choice (both reads agree the heal line is present + drives recovery; they
  differ only on the documented gate default), NOT a silent drop.
  **ADAPTED blind test (blind/anchor-innocent-maid.adapted.test.ts — pristine preserved verbatim; the 8 plumbing points
  P1–P8 above corrected, assertion INTENT + kit reading unchanged) vs the shipped override: 17 passed / 3 skipped (20),
  0 failed.** The 3 skips = the 3 UNMODELED/GAP lines. The adapted fixture is liter/anchor/crown/ada/helm (B2 slot split
  6/6 over 12 FBs ⇒ 0 < anchorBursts < FB_STARTS, so burstCast≠fullBurstEnter is non-vacuous). ⇒ The blind writer's
  independent assertion set CORROBORATES the driver override once its unverifiable harness/fixture assumptions are
  corrected. The blind's spec table (dispositions written from the prose alone) converges with the driver on every line:
  distributedDamagePct 30.4/10s escalating-from-FB2 · heal ticks:8 intervalSec:1 · hitRatePct 10.13/10s · casterAtkPct
  35.02/10s (not atkPct) from FB2-end · reloadSpeedPct 40.04/15s from FB3-end · burst casterAtkPct 30.09/10s on burstCast
  (not atkPct) · burst heal to allies · UNMODELED {Potency of HP, debuff cleanse, Storage}.

## 8. S2b pre-op adversarial review (claude-fable-5, reviews — dispositions, leakDetected:null)

skill1: Potency of HP UNMODELED · Distributed Damage ▲30.4% FAITHFUL · Stack count of debuffs ▼1 UNMODELED · same-squad
HoT 3.04%/1s×8 FAITHFUL. skill2: Hit Rate ▲10.13% FAITHFUL · ATK ▲35.02% of caster ATK FAITHFUL · Reload Speed ▲40.04%
15s FAITHFUL. burst: Storage UNMODELED · Recovers 40.18% Max HP FAITHFUL · ATK ▲30.09% of caster ATK 10s FAITHFUL.
loadBearingSet = the 7 FAITHFUL lines (matches the driver exactly). Verdict: all lines accounted for, no REAL-GOTCHA.

## 9. Line inventory + driver ⚑ flags (from results/anchor-innocent-maid.json)

FAITHFUL (7): S1 Distributed 30.4/10s · S1 HoT ticks:8 · S2 hitRate 10.13/10s · S2 casterAtk 35.02/10s · S2 reloadSpeed
40.04/15s · burst heal 40.18% · burst casterAtk 30.09/10s.
UNMODELED (3): S1 Potency of HP (no heal-potency StatKey; value-0 placeholder keeps tier order) · S1 debuff cleanse
(partless boss applies no modeled debuffs) · burst Storage (defensive overheal buffer; no engine vocabulary; NOT a shield).
Driver ⚑ flags: (1) SAME-SQUAD GATE — S1 HoT gate modeled always-satisfied; if it needs a lore-squad teammate, recovery
events over-fire in non-squad teams (impact: recovery-consumer uptime only). (2) HIT-RATE→CORE magnitude — hitRatePct
live for AR/SMG/SG via acrForHR; in-game core-rate lift unmeasured. (3) CADENCE TUPLE — pullsPerSec/reloadFrames 141/
bolt-gap are unverified datamine values. (4) S1 HEAL CADENCE — 8 events/FB modeled; same-squad gate approximation may
over-fire in non-squad teams. Each ⚑ carries estimate + recipe + tier.

## 10. Your task

Classify every kit line (FAITHFUL / DOCUMENTED_GAP / REAL-GOTCHA{SILENT_DROP > ENGINE/FIDELITY > ENCODING} /
RECON_ERROR); rule on the 13 pristine-S5 REDs (each RECON_ERROR/fixture vs REAL-GOTCHA); rule on the S6 diff
(Potency-of-HP placeholder choice, same-squad gate choice); run the fire-rate check (each FAITHFUL block fires at the
prose-implied cadence — driver test asserts distributed from FB2, heal 8 ticks/FB, hitRate every FB-end, casterAtkPct
S2 from FB2-end, reloadSpeed from FB3-end, burst heal + casterAtkPct per burstCast); confirm the tests discriminate
(every FAITHFUL line GREEN vs shipped AND RED vs its nearest-wrong counterfactual); produce kitDescription +
faithfulnessScore + the BINDING verdict per the GO criteria below. Magnitudes are owner/measurement-gated and OUT OF
SCOPE — do NOT flag a magnitude as a gotcha unless it contradicts the prose's own number.

### GO criteria (RECONCILING-JUDGE.md)

GO iff: no SILENT_DROP (every kit line is FAITHFUL, DOCUMENTED_GAP, or a documented ⚑ — audit SKIPPED ↔ unmodeled 1:1);
no REAL-GOTCHA; the S5 blind tests run green vs the driver's shipped override (here: the ADAPTED blind test is green,
the pristine reds are classified RECON_ERROR/fixture); discrimination OK (each load-bearing test fails under its named
nearest-wrong model). faithfulnessScore = fraction of kit lines FAITHFUL or DOCUMENTED_GAP.

### Return ONLY this JSON (tight structured JSON, not an essay; `suggestedFix` is a faithful representation or a flagged

### measurement, NEVER a number chosen to hit the board)

```json
{
  "slug": "anchor-innocent-maid",
  "kitDescription": "<plain-English 3-6 sentences: what the kit DOES in game terms>",
  "convergence": {
    "s5TestsVsDriverOverride": "GREEN|RED",
    "redAssertions": [
      "<which S5 assertions fail vs the driver's override, if any>"
    ]
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
