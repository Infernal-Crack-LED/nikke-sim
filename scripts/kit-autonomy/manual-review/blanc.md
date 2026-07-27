# Manual Review — blanc (Blanc)

**Date:** 2026-07-25
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 1

## Kit summary

Blanc is a Wind AR Defender on Burst II. Her kit is entirely defensive/enabling — no personal
damage lines. Her offensive contribution is the burst's boss debuff: Damage Taken ▲39.26% for 10s.
Her burst CDR (40.76s off a 60s CD on every Full Burst end) collapses her effective CD to ~19.2s,
giving near-permanent debuff uptime.

## Line dispositions

| Line | Slot   | Disposition | Notes                                                                          |
| ---- | ------ | ----------- | ------------------------------------------------------------------------------ |
| B1   | skill1 | FAITHFUL    | hitCount:120 → allies → shield{maxHpPct:11.8, durationSec:5}                   |
| B2   | skill2 | FAITHFUL    | fullBurstEnd → allies → heal{ticks:5, intervalSec:1}                           |
| B3   | skill2 | FAITHFUL    | fullBurstEnd → self → burstCdr 40.76                                           |
| B4   | burst  | FAITHFUL    | burstCast → allies → heal{ticks:8, intervalSec:1}                              |
| B5   | burst  | FAITHFUL    | burstCast → alliesLowestHp → targetMaxHpPct 31.68 (offensively inert, e3 rule) |
| B6   | burst  | UNMODELED   | Indomitability 10s — death immunity, out of scope for v1                       |
| B7   | burst  | FAITHFUL    | burstCast → enemy → damageTakenPct 39.26, 10s                                  |

## Cross-family convergence

- **S2b (claude-fable-5):** All lines FAITHFUL, no leak, no gotchas. Agrees with driver on all dispositions.
- **S5 (claude-opus-5, blind test):** 14/26 pass. 6 failures are PREDICTED DIVERGENCES:
  - 3× same-squad gate: blind gates burstCdr on noir presence; driver models unconditionally (correct: "still on the battlefield" is vacuously true in v1 — nobody dies).
  - 3× event-structure: blind guesses stat:'maxHpPct' but engine emits 'maxHpFlat'; blind dtRows filter doesn't match engine's enemy-debuff event shape.
- **S6 (claude-opus-5, blind override):** Converged block-for-block with driver on all 7 lines apart from the noir gate and StatKey.
- **S7 (claude-opus-5, judge):** GO, faithfulness 1.0, discriminationOk true.

## Gotchas (from S7 judge)

1. **Low severity (fixed):** Stale note text called Max HP ▲31.68% "UNREPRESENTABLE" while the
   JSON encodes it faithfully via targetMaxHpPct. Fixed: note updated to reflect current state.

2. **Med severity (owner spot-check):** B1 test asserts blanc fires ≥120 shots but doesn't prove
   the hitCount:120 trigger procs at the right cadence. The S5 blind's inert-marker technique
   (append partsDamagePct marker to shield block, assert fire count) is the better instrument.
   Owner may adopt this in a future pass.

## Residual for owner spot-check

The shared reading that "still on the battlefield" is a pure anti-death clause (not a
squad-membership requirement) is stability across all agents, not proof. If blanc is ever graded
in a comp where that distinction bites, verify the CDR's real trigger condition against a rotation
log before trusting her burst cadence.

## ⚑ list (unchanged from baseline)

1. **CADENCE TUPLE (MANDATORY):** pullsPerSec at AR class default / reloadFrames 81 / rolling-reload.
   Recipe: rounds/min + reload gap from any Blanc focus video.
2. **HEAL TICK CADENCE:** heals tick every 1s; engine emits per-tick recovery events (fixed 2026-07-17).
   Inert in a team with no recovery-consumer.
