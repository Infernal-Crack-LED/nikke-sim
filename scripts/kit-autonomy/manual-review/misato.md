# Manual review — misato (Misato, BASE)

**Verdict: GO — faithfulness 1.0** (binding judge kimi-code/k3, zero REAL-GOTCHA, discriminationOk
true; one low-severity DOCUMENTATION-only finding, fixed before commit). Kit-autonomy gauntlet
2026-08-04. Tier 2 (status-gate kit: both skill2 lines are gated on the Shooting Manual
self-status; the gated payloads are unmodelable, so the gates are documented skips — the skip
decisions are what earned the extra judge eyes).

SMG / Supporter / Iron / Burst I, 40s CD, ammo 120, ~20 pulls/s effective (SMG frame quantization
DEFAULT-ON; datamine 1440 nominally 24/s), Abnormal. **SR rarity** — spec fixture runs her at the
2★/core-0 ceiling (claire precedent). Misato is a HEALER whose single offensive footprint is her
own stacking Hit-Rate lift: every 60 landed rounds she gains a Shooting Manual stack (Hit Rate
▲5.04%, ≤3 stacks, 5s shared window refreshed by the ~3s re-trigger cadence → steady-state 3
stacks), which raises her own core-hit fraction through the engine's live Hit-Rate→core geometry
(UNIGEO). Everything else is sustain: a 120-hit single-ally heal, and a burst team heal-over-time —
both modeled as recovery EVENTS (the engine models no HP amounts), valued for firing teammates'
on-recovery triggers (Crown-type). Her skill2's two status-gated lines (team shield-damage,
outgoing healing) have no engine expression and no in-domain payload — deliberate verbatim skips.

## Kit summary & line-by-line dispositions

| Line | Kit text (SL10)                                                                           | Disposition            | Encoding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---- | ----------------------------------------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1a  | ■ 60 normal attacks land → self: Shooting Manual, Hit Rate ▲5.04%, ≤3 stacks, lasts 5 sec | FAITHFUL (damage-live) | `hitCount 60` → self `hitRatePct 5.04 / durationSec 5 / maxStacks 3`. The ONLY damage-live line: feeds the live Hit-Rate→core geometry. Pinned: value/maxStacks/duration/self-target from buffApply events; cadence exactly `floor(shots/60)`; stacks PROGRESS [1,2,3] with first apply ≥ the 60th-shot frame (no t=0 passive); removing it lowers her own total; a 1-stack counterfactual lands strictly BETWEEN removed and shipped (stack magnitude monotone in the reticle shrink).                                                                     |
| S1b  | ■ 120 normal attacks land → 1 ally, lowest HP%: recover 8.04% of caster final Max HP      | FAITHFUL (event-only)  | `hitCount 120` → `alliesLowestHp count:1` → `heal` (instant event). Magnitude unmodeled by engine design (no HP pool) — tandem value: fires the target's recovery triggers. "Lowest HP%" is indeterminate without an HP pool → the engine's documented leftmost-ally stand-in. Pinned: crown-consumer firings == `floor(shots/120)` in isolation; ADVERSARIAL split — hitCount:120 coincides with lastBullet at her base 120-round mag, so a +60-round magazine patch keeps the cadence at 120 landed rounds while a lastBullet re-encoding provably drops. |
| S2a  | ■ in Shooting Manual status → all allies: Damage dealt to Shield ▲150% continuously       | UNMODELED (verbatim)   | No boss shield bar in the sim, no shield-damage StatKey (out of domain — helm-partsDamagePct class), AND no "requires own buff active" gate primitive. Offensively inert in-domain. Pinned: no skill2 block exists; line verbatim in `unmodeled.skill2`; nearest-wrong re-expression (a live 150% damage stat) barred in caveats.                                                                                                                                                                                                                           |
| S2b  | ■ Shooting Manual at max stacks → self: Outgoing healing ▲30.05% continuously             | UNMODELED (verbatim)   | Heal amounts are unmodeled engine-wide, so a healing-output multiplier has no payload; the max-stacks gate has no primitive either (DISTINCT gate from S2a — any-stacks vs max-stacks; not merged). Pinned: verbatim in `unmodeled.skill2`; no scaled/extra recovery events anywhere.                                                                                                                                                                                                                                                                       |
| BU   | ■ all allies: recover 5.06% of caster final Max HP every 1 sec for 5 sec continuously     | FAITHFUL (event-only)  | `burstCast` → allies `heal ticks:5 intervalSec:1` — first tick at cast, then +1s..+4s: five recovery events per ally per cast keep on-recovery consumers refreshed across the window. Keyed to her OWN cast (NOT fullBurstEnter — would over-fire on rotations another B1 completes). Magnitude unmodeled (no HP pool). Pinned: ≥3 casts in the fixture; every full-window cast yields exactly 5 consumer firings spanning ≥3.9s, isolated from her S1-b heal and crown's own heal; 1-tick and self-only counterfactuals strictly reduce traffic.           |

## Cross-family corroboration

- **S2b test-faithfulness review — claude-fable-5:** converged on all 5 dispositions (same
  triggers, primitives, load-bearing set, UNMODELED-verbatim skill2). Pre-registered the traps
  that matter: (1) BOTH heal lines dropped as "defensive" — wrong because the fixture's crown
  consumes recovery events; (2) burst HoT collapsed to ticks:1; (3) **hitCount:120 ≡ lastBullet at
  base ammo — invisible until ammo changes** (adopted: the extended-magazine split runs); (4) the
  two skill2 gates are caster-self-status reads with no schema primitive — flag any
  resourceGate/targetStatus hack or a live 150% stat (none present); (5) burstCast-not-
  fullBurstEnter with a B1-contention fixture warning (the driver fixture fields NO other B1, and
  the blind's own inert-marker probe later proved misato casts even beside liter).
- **S5 blind test writer — claude-opus-5:** 13 tests (11 live + 2 `it.skip` GAP lines — the blind
  INDEPENDENTLY skipped both skill2 lines as unmodelable, matching the driver disposition). vs the
  driver override: **11 PASS / 0 FAIL / 2 SKIP** after ONE wiring RECON_ERROR accommodation
  (blind's `misatoHits` reader filtered damage events by a numeric `srcSlot`; events carry identity
  in `slug` + category in `bucket` — fixed to `slug==='misato' && bucket==='normal'`, intent
  preserved; documented in `blind/misato.adapted.test.ts`). Both of the blind's built-in
  fixture-risk probes passed UNADAPTED: misato casts her burst inside controlComp('misato')
  despite liter also being B1, and S1-b is board-inert at scope lock because the leftmost stand-in
  resolves to liter (no recovery trigger). The blind's own residual notes (5s-window ≈ permanent at
  this cadence, so the window is pinned structurally; fixture-risk guarded by probe) are sound.
- **S6 blind override writer — claude-opus-5:** STRUCTURALLY IDENTICAL to the driver override —
  all four blocks byte-equal (hitCount 60 → self hitRatePct 5.04/5s/×3; hitCount 120 →
  alliesLowestHp:1 → heal; skill2 empty; burstCast → allies → heal ticks:5 intervalSec:1) and the
  same two verbatim unmodeled lines (cosmetic delta only: the blind keeps the ■ marker and joins
  line sentences with a space). Its audit rows and ⚑ flags match the driver caveats one-for-one
  (HR→core conversion is her WHOLE offensive footprint; cadence tuple; stack-uptime coupling;
  gate-primitive absence; burstCast-vs-fullBurstEnter rationale). Decisive corroboration: blind,
  opus derived the exact same encoding.
- **S7 binding judge — kimi-code/k3:** GO, faithfulness 1.0, discriminationOk true, zero
  REAL-GOTCHA. Convergence GREEN (S5 vs driver override); all five lines FAITHFUL (3) or
  DOCUMENTED_GAP (2) with sound no-primitive reasoning; fire-rate check passes on every block;
  trigger identities proven rather than assumed (the lastBullet split, the burstCast key, the
  60/120 cadence pins). One low-severity FIDELITY finding, DOCUMENTATION-only and FIXED before
  commit: the driver caveats cited the stale datamine 24 pulls/s cadence (engine ships the
  measured ~20/s frame-quantized SMG rate by default) and named the fallback CONE_DELTA path
  instead of the live UNIGEO geometry — no behavioral or test impact (every cadence assertion is
  ratio-based; the judge confirmed no conclusion changes).

## Residual flags (owner spot-check cluster — judge-named, ⚑ with recipe)

1. **Hit-Rate→core conversion magnitude (her entire offensive footprint).** The 5.04×3 stack
   values are kit-literal, but how much core-hit rate a Hit-Rate percentage buys is a DERIVED
   engine relationship (UNIGEO geometry), unmeasured for misato specifically — and she has no
   other damage line, so an error there is an error in 100% of her modeled contribution. Recipe:
   focus-record misato in a fixed comp vs the scope-lock boss, count core (red) vs plain popups
   with stacks confirmed live, repeat with HRCORE=0, compare the sim's core fraction to the count.
2. **SMG cadence tuple (⚑ ALWAYS-list).** rate_of_fire datamine-unreliable; the sim ships the
   frame-quantized ~20/s (SMGRATE=24 is the revert arm), itself contested per game-mechanics.md §2
   ("SMG CADENCE IS CONTESTED"). Both skill1 channels scale with it (60/120-hit thresholds ≈ 3s/6s
   of fire time + reload gaps), and the stack steady-state couples to it (3s refresh vs 5s window —
   a cadence overestimate or fire interruption flips 3 stacks to 2). Recipe: read the ammo counter
   frame-by-frame over a full magazine in any misato recording.
3. **HoT first-tick phase.** "every 1 sec for 5 sec" — the engine emits the first tick at the cast
   frame (5 events spanning 4s); the t=0-vs-t=1s phase is a convention, not measured. Recipe: in a
   recovery-consumer team (crown), frame-read the consumer buff's first refresh after a misato cast.
4. **Heal-channel observability (same-model residual).** With no heal event kind and no HP pool,
   both heal lines are asserted through crown's recovery-consumer buffApply traffic — a
   sim-internal observable, not game truth. Heal MAGNITUDES (8.04% / 5.06% of caster final Max HP)
   are recorded in the override caveats only; they move nothing in the sim and are
   measurement-gated on the sim ever modeling an HP pool.
5. **alliesLowestHp stand-in.** "lowest HP percentage" resolves to the leftmost ally (documented,
   no HP pool in v1); the target choice moves no damage, but WHICH ally receives the recovery
   event (and thus whose on-recovery trigger fires) depends on slot order — comp-sensitive by
   design, pinned in the spec fixture by slotting misato rightmost.

## Artifacts

- Driver test: `scripts/tests/units/misato.test.ts` (13/13 green — `scripts/kit-autonomy/reviews/misato.verify.txt`)
- Override: `src/skills/overrides/misato.json` (validate-overrides clean; dmg 47.8M solo, 11.6% kit contribution, 5 bursts)
- S2b review: `scripts/kit-autonomy/reviews/misato.test-review.json`
- S5 blind: `scripts/kit-autonomy/blind/misato.test.ts` (+ `.adapted.test.ts`, `.blind-run.txt`)
- S6 blind: `scripts/kit-autonomy/blind/misato.override.json`
- Judge: `scripts/kit-autonomy/results/misato.json` (verdict GO / faithfulness 1.0, top-level)
