# Manual review — snow-crane (Snow Crane, BASE)

**Verdict: GO — faithfulness 1.0** (binding judge kimi-code/k3, zero gotchas, discrimination ok).
Kit-autonomy gauntlet 2026-08-04. Tier 2 (burstCast-vs-fullBurstEnter trigger identity, a
charge-count trigger, and status-gate clauses) — landed as a CLEAN-WEAPON BASIS unit: the landing
criterion is the CW1 damage-neutrality proof (owner ruling 2026-08-01, marciana precedent), which
this override passes byte-identically.

SR / Defender / Water / Burst II, 40s CD, ammo 6, chargeFrames 60, reloadFrames 141, Missilis.
Snow Crane is a pure sustain/tank kit and the SR clean-weapon basis cell
(`scripts/tests/lib/harness.ts` `CLEAN_WEAPON_TEAMS.a`): her kit contributes NOTHING to her own
damage. Every line is heal / shield / Max HP / Pierce. Her Pierce is burst-granted (10s window)
while the basis runs `disableBursts: true` (she never casts there), and even bursts-ON she stays
damage-neutral in v1: `gainPierce` only pays out through a `pierceDamagePct` buff (no shipped unit
carries one) and PIERCE_CORE_DOUBLE is off (and keyed to the static `hasPierce` flag, never a
timed window).

## Kit summary & line-by-line dispositions

| Line | Kit text (SL10) | Disposition | Encoding |
| ---- | --------------- | ----------- | -------- |
| S1a  | ■ while NOT in Terminated Contract → all allies: Exclusive Recovery Agreement: Max HP ▲ 10% of the skill user's Max HP, continuously | FAITHFUL (inert in v1) | `passive` → all allies, `casterMaxHpPct 10`, no duration. "% of the SKILL USER's Max HP" = caster-scaled → `casterMaxHpPct` (NOT `targetMaxHpPct`); flat-resolved at apply time, so the log shows one `maxHpFlat` value EQUAL across all holders (the discrimination vs target-scaled). The "only while not in Terminated Contract" off-gate is a documented elision (no negative self-status primitive; unreachable while PoV is unmodeled; offensively inert either way). Pinned: 4 frame-0 grants, no expiry, all-equal values; an attackDamagePct re-encoding MOVES the team. |
| S1b  | ■ when recovery takes effect, if NOT from this unit → self: Proof of Violation: Outgoing healing ▼ 10% continuously, ≤3 stacks | UNMODELED (verbatim) | No outgoing-healing StatKey (heals are amount-free events) AND the engine's `recovery` trigger has no source filter — counting all recoveries would self-stack PoV (her own S2a/burst heals target all allies incl. herself) and flip Terminated Contract in EVERY comp: the nearest-wrong model, worse than none. Pinned: her only buff stat is the ERA grant; no stack buff (`maxStacks`) anywhere. |
| S2a  | ■ after 3 Full Charge attacks → allies in ERA: Recovers 1.32% of the skill user's final Max HP | FAITHFUL (event) | `chargeCounter {count:3, countInFb:3}` → allies, `heal ticks:1`. countInFb:3 authored EXPLICITLY: the primitive defaults `countInFb ?? 1` inside the 10s post-own-burst window (SBS-baked semantics) — omitting it heals every full charge after each of her casts (counterfactual proves the over-fire). "allies in ERA" elided to `allies` (coextensive pre-TC, documented). Amount out-of-domain (no HP pool) — tandem-only. Pinned: recovery firings == floor(charges/3) + burst casts; count:1 and countInFb-omitted counterfactuals both over-fire. |
| S2b  | ■ entering Full Burst → all allies: Shield = 9.5% of the skill user's final Max HP, 10 sec | FAITHFUL (event) | `fullBurstEnter` → allies, `shield maxHpPct 9.5 durationSec 10` (schema's maxHpPct is %-of-caster final Max HP — the kit's literal reading). Keyed fullBurstEnter, NOT burstCast: fires on EVERY chain completion, incl. rotations another Burst II took. Pinned in a two-B2 fixture: asuka's `requiresShielded` S2 gate passes at every FB (== fbStarts > her casts); the burstCast-keyed counterfactual passes ZERO times (the 10s shield granted at her stage-II cast expires during the ~21s stage-III wait). |
| S2c  | ■ PoV at max stacks → self: Terminated Contract: immunity to PoV + Recovers 0.24% of final Max HP every 1 sec, continuously | UNMODELED (verbatim) | Trigger (PoV max stacks) inexpressible; immunity is a negative status; the regen is unbounded ("continuously") and heal ticks are finite. Payload sustain-only / damage-inert. The S6 blind alternative (always-on passive ticks:180) was ruled spurious-and-worse by the judge: it fabricates a 1 Hz recovery stream the real kit never emits in healer-less comps, and that stream is tandem-BEARING through recovery consumers. |
| BUa  | ■ all allies: Recovers 44.68% of the skill user's final Max HP | FAITHFUL (event) | `burstCast` → allies, `heal ticks:1` — own-cast keyed (no activation clause). Amount out-of-domain. Pinned: with S1+S2 stripped, recovery firings == her burstCast count. |
| BUb  | ■ self: Gain Pierce for 10 sec | FAITHFUL (inert in v1) | `burstCast` → SELF (separate block — the kit splits targets heal-allies / pierce-self), `gainPierce durationSec 10` — a timed window, never the whole-fight `hasPierce` flag. Damage-inert in v1 but a REAL probed window: through an in-memory `pierceDamagePct` probe (never committed) — no-pierce ≡ base < 10s window < permanent. |

## Cross-family corroboration

- **S2b test-faithfulness review — claude-fable-5:** converged on all five modelable lines (same
  primitives, keying split, tandem-through-consumer assertion style) and pre-named the two-B2
  fixture hazard. Divergence (documented, judge-ruled): fable wanted the PoV→Terminated-Contract
  cascade as a resource-pool state machine; the driver keeps it UNMODELED because the `recovery`
  trigger has no source filter — the encoding fable itself flagged as nearest-wrong (self-stacking)
  is the only one the engine can express. Convergence on the inertness envelope is exact.
- **S5 blind test writer — claude-opus-5:** 20 tests (17 live + 3 deliberate GAP skips). Raw run
  vs the driver override: 6 RED / 11 GREEN / 3 skipped — all 6 REDs fixture-premise failures, NOT
  spec divergences (the blind model's own notes pre-declared accessor risk): controlComp fixes
  crown (B2, 20s CD) who wins EVERY stage-II cast (snow-crane casts zero times there — verified
  through the engine); "the control comp is 5 units" (it is 4); an empty-effects chargeCounter
  strip the engine's `effects[phase]` dispatch rejects with a crash; and the "no recovery consumer
  in the comp" premise is false of controlComp itself (crown's S2 is one). Documented adaptation
  A1–A4 (proven two-B2 fixture where her casts are real, recipient count, legal strip, consumer
  excluded from the two heal-strip equalities): **17 passed / 3 skipped / 0 failed**. The 3 skips
  are the blind model's own declared GAPs — the same lines the driver rules UNMODELED.
- **S6 blind override writer — claude-opus-5:** CONVERGED line-for-line on all five core
  encodings (passive/allies/casterMaxHpPct 10; chargeCounter 3/allies/heal; fullBurstEnter/
  allies/shield 9.5-10s; burstCast/allies/heal; burstCast/SELF/gainPierce 10s — incl. the
  two-block target split). Two divergences, both ruled blind-side errors by the judge: (1) omitted
  `countInFb`, tripping the primitive's SBS-baked `?? 1` default (over-fires the heal 10s after
  each own cast — the driver's explicit countInFb:3 called "the strongest single catch in this
  packet"); (2) the Terminated Contract regen as an always-on passive ticks:180 (self-flagged
  over-fire; fabricates tandem-bearing recovery events the real kit never emits in healer-less
  comps). S6's unmodeled entries are annotated paraphrases vs the driver's verbatim lines.
- **S7 binding judge — kimi-code/k3:** GO, faithfulness 1.0, zero gotchas, discriminationOk true.
  7/7 lines: 5 FAITHFUL + 2 DOCUMENTED_GAP (all three independent agents reached the
  inexpressibility argument separately). Judge-named discrimination highlights: M2's
  floor(charges/3)+casts equality, M3's every-FB-vs-zero shield-gate split, M5's
  no-tag < 10s-window < permanent pierce inequality chain.

## Residual flags (owner spot-check cluster — judge-named, ⚑ with recipe)

1. **countInFb engine-default semantics** — the `countInFb:3` authoring is an engine-semantics
   reading of `sim.ts` firePull (the chargeCounter dispatch's `countInFb ?? 1` in the 10s
   post-own-burst window) that every agent sourced the same way; worth one direct glance at the
   primitive. The driver's counterfactual proves the omission over-fires.
2. **burstCast-vs-fullBurstEnter trigger-identity split** — explicit in the prose for the shield
   ("Activates when entering Full Burst"); the burst lines rest on the no-activation-clause
   convention (own-cast). Low risk; it is the kit's one deliberate asymmetry.
3. **Heal-magnitude inertness** — assumes no consumer reads heal AMOUNTS (true in v1: no HP pool).
   The PoV→Terminated-Contract cascade recipe (a `recoveryFromOther` trigger + PoV resource pool +
   resourceGate-gated ERA/S2a + bounded regen) is in caveat 5 of the override for when HP-pool
   work lands.

None is a fudge; none blocks GO. No board reading exists yet (unit was not on the accuracy board
before the flip and has no recordings; tier MODEL_ONLY, tuned false).

## Artifacts

- Driver test: `scripts/tests/units/snow-crane.test.ts` (26/26 green)
- Override: `src/skills/overrides/snow-crane.json`
- Results: `scripts/kit-autonomy/results/snow-crane.json`
- Blind: `scripts/kit-autonomy/blind/snow-crane.{test.ts,adapted.test.ts,override.json,blind-run.txt}`
- Cross-family evidence: `scripts/kit-autonomy/cross-family/snow-crane/{s2b,s5,s6,s7}-result.json`
- S2b review: `scripts/kit-autonomy/reviews/snow-crane.test-review.json`
- Verify: `scripts/kit-autonomy/reviews/snow-crane.verify.txt`
