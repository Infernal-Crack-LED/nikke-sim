# Handoff — focus charge-gauge bonus is a flat 2.5×; it should be per-unit (= chargeMultiplier/100)

> Context-packed for a fresh session. **STATUS: FINDING + PROPOSED FIX — NOT ENACTED.**
> Discovered 2026-07-27 while investigating why `flora`/`rosanna`/`sugar` mis-ranked on the
> burst-gen board (that investigation landed three separate fixes — missing gauge rows, a
> weapon-aware fallback, and removing the focus bonus from the _board_; this is the one
> remaining thread it surfaced). This is an **engine gauge-model change** → it belongs in its
> **own PR** and goes through `/scientific-method` (it flips a behavior the docs currently call
> settled). Read `docs/data/burst-gauge.md` §4 first (the section this overturns).

## The finding

The camera-focus charge bonus is **hardcoded to a flat 2.5×** and ignores the per-unit datamine
column that carries the real value:

```ts
const FOCUS_CHARGE_GEN = 2.5; // src/engine/sim.ts:1257
per * (u.idx === focusIdx ? FOCUS_CHARGE_GEN : UNFOCUSED_CHARGE_GEN) + flat; // sim.ts:1306
```

`data/gauge-per-shot.json` stores the datamined `full_charge_burst_energy` column as
`fullChargeBonus`, but the engine **never reads it** (only mentioned in comments; the gauge-v4
comment at `sim.ts:993` waves it through as "stored but unused ⚑ (both solo fits are exact
without it)").

That column is the per-unit focus multiplier ×100 — and it equals `chargeMultiplier` for **every**
unit in the table:

| unit                       | weapon | chargeMultiplier | fullChargeBonus | correct focus × |                    engine uses |
| -------------------------- | ------ | ---------------: | --------------: | --------------: | -----------------------------: |
| **alice**                  | SR     |          **350** |         **350** |        **3.5×** | 2.5× — **under-credited +40%** |
| cinderella                 | RL     |              200 |             200 |            2.0× |      2.5× — over-credited −20% |
| vesti-tactical-upgrade     | RL     |              200 |             200 |            2.0× |      2.5× — over-credited −20% |
| scarlet-black-shadow       | RL     |              150 |             150 |            1.5× |      2.5× — over-credited −40% |
| all other SR/RL (41 units) | SR/RL  |              250 |             250 |            2.5× |                         2.5× ✓ |

Distinct `fullChargeBonus` values in the table: **150, 200, 250, 350**. Only those four units
deviate from 250.

## Why `fullChargeBonus / 100` is the multiplier (not additive energy)

- **Measured anchor.** The two solo gauge recordings that validated the model — `takina` and
  `maiden-ice-rose`, both `fullChargeBonus 250` — measured focused generation at exactly
  `base × 2.5` (takina 560→1400/shot, maiden 364→910/shot, to the pixel). So focus multiplier =
  `250 / 100 = 2.5`. Generalizing down the column: alice `350/100 = 3.5`, cinderella/vesti
  `200/100 = 2.0`, scarlet-black-shadow `150/100 = 1.5`.
- **Additive reading already ruled out.** Test battery 3 (A1/A2 pair): takina UNFOCUSED steps
  +5.6–6.5%/shot (flat 560, ×1.0); the _additive_ `full_charge_burst_energy` hypothesis would read
  +8.1% and is excluded by the measurement. The only interpretation consistent with the data is
  multiplier = `fullChargeBonus / 100`.

## Why the flat 2.5 slipped through

The SSOT formula in `burst-gauge.md` §4 is `×(1 + 1.5 × chargePercent) = ×2.5 at full charge`,
which assumes `chargePercent = 1.0` universally. The einkk `chargePercent` that reproduces the
per-unit column is `(chargeMultiplier/100 − 1) / 1.5` — i.e. 1.0 for the 250 family, 1.667 for
alice, 0.667 for the 200s, 0.333 for scarlet-black-shadow. Both validation solos happened to be
standard-250 units, so the per-unit variation was never exercised and got stored-but-ignored.

## Proposed fix (own PR)

In `gaugePerShot` (`src/engine/sim.ts`), read the column and use it as the focus factor:

```ts
const focusMult = (entry?.fullChargeBonus ?? 250) / 100; // per-unit, = chargeMultiplier/100
// ...
return per * (u.idx === focusIdx ? focusMult : UNFOCUSED_CHARGE_GEN) + flat;
```

Then retire the "stored but unused ⚑" comment (`sim.ts:993`), update `burst-gauge.md` §4 (the
flat-2.5 prose + the formula reconciliation above), and log a DECISIONS entry overturning the
2026-07-13 "full_charge_burst_energy unused" ruling.

## Blast radius

- **The burst-gen ranking board is UNAFFECTED** — as of 2026-07-27 it measures every unit
  UNFOCUSED (×1.0; `src/ranks/burstgen.ts` parks camera focus on a non-charge no-op teammate), so
  the focus multiplier never enters it. This fix only moves **real fights where a charge unit holds
  camera focus**: the DPS chart, probe validations, and team sim.
- Per-unit focused gauge: **alice +40%**, **cinderella / vesti-tactical-upgrade −20%**,
  **scarlet-black-shadow −40%**. Every other charge unit is byte-identical (250 → 2.5×).
- Check any graded probe fight that had one of these four as the **focused** unit — a flat-2.5
  mis-credit may have been absorbed into calibration. (`burst-gauge.md` §4 notes "battery test 5
  alice (focused, sniper) came in +9.3% vs her unfocused original run" — a damage comparison, not a
  per-shot gauge read, so alice's 3.5× is implied by datamine but NOT yet measured.)

## What gates landing

1. **`/scientific-method`** — this is an engine default/constant change with a measurement behind
   it; run the premise gate → pre-op → post-op flow, not a direct edit.
2. **`measured > fudge`:** the four non-250 values are datamine-derived, not independently recorded.
   Either (a) take a focused gauge read for at least `alice` (the +40% case) before enacting, or
   (b) land as a datamine-hypothesis with an explicit ⚑ "unmeasured for non-250 units" flag —
   consistent with the rest of the datamined table, but the owner should pick. The 250 family is
   measurement-anchored (takina/maiden), so only the four outliers are hypothesis.
3. **Doc/decision sync:** `burst-gauge.md` §4 rewrite + DECISIONS entry (overturns 2026-07-13) +
   retire the `sim.ts:993` ⚑ comment.

## Cross-references

- `docs/data/burst-gauge.md` §4 (charge weapons + camera-focus bonus — the section to rewrite)
- `docs/DECISIONS.md` 2026-07-13 focus entries ("×2.5 charge-gauge bonus is camera-focus-ONLY";
  "the middle character always holds camera focus")
- `src/engine/sim.ts` gauge-v4 comment block (~979–994) + `FOCUS_CHARGE_GEN` (1257) / `gaugePerShot` (1289)
- `data/gauge-per-shot.json` `fullChargeBonus` column (the per-unit source)
