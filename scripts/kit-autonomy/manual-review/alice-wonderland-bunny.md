# Manual review — alice-wonderland-bunny (Alice: Wonderland Bunny)

**Verdict: GO — faithfulness 1.0** (binding judge kimi-code/k3, zero gotchas, discrimination ok).
Kit-autonomy gauntlet 2026-07-28. Tier 2 (meta-defining burst-stage reentry; FB-end/enter trigger
timing; hit-count cadence).

SMG / Supporter / Water / Burst I, 40s CD, Tetra. Variant of base `alice` (SR/Fire — a different
unit). Pure team-support B1: her personal damage is effectively zero; her value is the burst-stage
reentry (a second B1 casts in the same chain), team ammo economy on FB entry, post-FB gauge refill
speed, and frequent team heals that feed recovery-trigger consumers (e.g. crown).

## Kit summary & line-by-line dispositions

| Line | Kit text (SL10)                                                                      | Disposition            | Encoding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---- | ------------------------------------------------------------------------------------ | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1a  | ■ after 60 normal attacks → all allies: Recovers 7.4% of her final Max HP as HP      | FAITHFUL (event)       | `hitCount:60` → `heal` to all allies. Amount unmodeled by engine design (heal = recovery event, no HP pool); cadence pinned at exactly floor(shots/60) non-burst-frame recovery firings via crown's consumer; burst-keyed counterfactual provably silent on 60-hit frames.                                                                                                                                                                                                                                                                         |
| S1b  | Carrot Party: Damage to Interruption Parts ▲2%, stacks 5×, 5 sec                     | FAITHFUL (inert in v1) | `partsDamagePct 2 / maxStacks 5 / durationSec 5` on the same `hitCount:60`, all allies. Parsed but inert (no destructible parts on the v1 boss — helm precedent): byte-identical totals with the line stripped; event-pinned value 2 (not SL1 0.89), 300f window, stack accrual 2–5, 60th-hit frames (burstCast counterfactual fails).                                                                                                                                                                                                             |
| S1c  | ■ after 90 normal attacks → all Water Code allies: Stack count of buffs ▲ 1          | UNMODELED (verbatim)   | A stack-CAP raise on the targets' stackable buffs (all three cross-family agents converged on cap-raise, NOT a +1 stack grant — the grant misread would spuriously accelerate the Carrot Party gate). No engine primitive raises a buff's stack cap; the only stackable buff in play is the inert Carrot Party — double inert.                                                                                                                                                                                                                     |
| S2a  | ■ after Full Burst ends → all allies: Burst Gauge filling speed ▲10% for 5 sec       | FAITHFUL               | `burstGenPct 10 / 5s` on `fullBurstEnd`, all allies. Frame-exact with fullBurstEnd events; fullBurstEnter counterfactual (the other S2 line's trigger — nearest wrong) lands on start frames and fails.                                                                                                                                                                                                                                                                                                                                            |
| S2b  | ■ entering Full Burst → all allies: Max Ammunition Capacity ▲40% for 15 sec          | FAITHFUL               | `maxAmmoPct 40 / 15s` on `fullBurstEnter`, all allies. Frame-exact with fullBurstStart; percent-of-capacity (not maxAmmoFlat rounds); self-only counterfactual reaches 1 holder, not 3; zeroing it measurably lowers team damage (the kit's one real damage lever, through reload economy).                                                                                                                                                                                                                                                        |
| S2c  | Reload 40%.                                                                          | FAITHFUL ⚑             | `instantReload fraction 0.4` on the same `fullBurstEnter`, all allies — an INSTANT partial magazine refill, NOT a reloadSpeedPct buff. Structural reading (converged 3-way): no ▲ arrow, no duration, no "Speed" token = action, not stat. Negative pin: zero reloadSpeedPct buffApply sourced from her; fewer natural magazine reloads with the line than without. Block order is load-bearing: the maxAmmoPct block precedes the refill, so the refill reads the raised capacity (0.4 × 168 ≈ 67 rounds). ⚑ ordering unmeasured (see residuals). |
| BUa  | ■ all allies: Re-enters Burst Stage 1                                                | FAITHFUL               | `reenterStage stage 1` on `burstCast` (datamined burstMeta use_burst_skill/change_burst_step = Step1). Two-B1 fixture [awb, liter, crown, ada]: liter casts stage 1 exactly 30f (STAGE_CAST_GAP) after awb in chain 1; stripping the effect removes liter's chain-1 stage-1 window (tia T6 shape).                                                                                                                                                                                                                                                 |
| BUb  | ■ all allies: Restores 27% of her final Max HP as HP                                 | FAITHFUL (event)       | `heal` to all allies on `burstCast`. Crown's recovery consumer fires on every awb cast frame; self-only counterfactual leaves crown silent. Amount unmodeled by engine design.                                                                                                                                                                                                                                                                                                                                                                     |
| BUc  | ■ when Carrot Party is at max stacks → all allies: Incoming healing ▲150% for 15 sec | UNMODELED (verbatim)   | No healing-received channel exists (no HP pool) and the activation gate references the inert Carrot Party stack count (no buff-stack gate primitive).                                                                                                                                                                                                                                                                                                                                                                                              |

## Cross-family corroboration

- **S2b test-faithfulness review — claude-fable-5:** converged on all 8 lines (same triggers,
  primitives, UNMODELED set). Flagged the "Reload 40% = reload speed" shared-prior misread (adopted
  as a negative pin) and the fixture-vacuity hazard (a B1 audited unit beside liter in controlComp
  never casts — structurally avoided in both suites). Read S1c as a stack-cap raise (adopted).
- **S5 blind test writer — claude-opus-5:** 18 tests (16 live + 2 `it.skip` GAP lines matching the
  driver UNMODELED set). vs the driver override: **16 PASS / 0 FAIL**. Driver adaptations
  (plumbing only, every blind assertion preserved): harness import path; fixture swapped to
  [awb, liter, crown, ada] (the S2b-flagged vacuity hazard); override slots are flat block arrays
  (not `.blocks`); heal/recovery observed via crown's recovery-consumer buffApply (no heal event
  kind in the log); shot/burstCast events carry `slug` (not numeric `srcSlot`); instantReload
  observed via reload economy (it emits no reload event); buff filters scoped to
  `casterIdx = aliceIdx` (liter/crown legitimately grant maxAmmoPct/reloadSpeedPct in the comp).
- **S6 blind override writer — claude-opus-5:** SEMANTICALLY IDENTICAL to the driver override —
  same triggers, targets, stats, values, durations, maxStacks, fraction, reenterStage stage,
  effect ordering (capacity before refill), and the same unmodeled set. Only structural diffs:
  merged same-trigger blocks vs split; explicit `ticks:1` on heals. Independently resolved the
  instantReload-vs-reloadSpeedPct ambiguity from the same structural signal.
- **S7 binding judge — kimi-code/k3:** GO, faithfulness 1.0, zero gotchas, discriminationOk true.
  All 9 kit lines FAITHFUL (7) or DOCUMENTED_GAP with sound no-primitive reasoning (2); every
  load-bearing assertion carries a discriminating counterfactual that fails under its named
  nearest-wrong model.

## Residual flags (owner spot-check cluster — judge-named, all ⚑ with recipes)

1. **"Reload 40%." as instantReload 0.4 vs reloadSpeedPct** — structurally justified (no
   arrow/duration/Speed token), settled definitively by ONE recording: read the ammo counter at FB
   entry (instant jump = refill; unchanged counter + shorter next reload animation = speed).
2. **hitCount:60 recurring vs one-shot** — recurring is the standard bare-threshold shape; count
   recovery/heal popups in footage to confirm. Low impact either way (payload is heal + inert
   parts buff; controls recovery-consumer feed cadence only).
3. **Capacity-buff-before-refill block ordering** — sim refills 0.4 × 168 ≈ 67 rounds; if footage
   shows 0.4 × 120 = 48 (base capacity), swap the two fullBurstEnter blocks in the override.

None is a fudge; none blocks GO. No board reading exists yet (unit has no real recordings — not on
the accuracy board before or after the flip).

## Artifacts

- Driver test: `scripts/tests/units/alice-wonderland-bunny.test.ts` (6/6 green)
- Override: `src/skills/overrides/alice-wonderland-bunny.json`
- Results: `scripts/kit-autonomy/results/alice-wonderland-bunny.json`
- Blind: `scripts/kit-autonomy/blind/alice-wonderland-bunny.{test.ts,override.json}`
- Cross-family evidence: `scripts/kit-autonomy/cross-family/alice-wonderland-bunny/{s2b,s5,s6,s7}-result.json`
- S2b review: `scripts/kit-autonomy/reviews/alice-wonderland-bunny.test-review.json`
- Verify: `scripts/kit-autonomy/reviews/alice-wonderland-bunny.verify.txt`
