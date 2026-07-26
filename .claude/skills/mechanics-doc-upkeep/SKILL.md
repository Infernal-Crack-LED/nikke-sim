---
name: mechanics-doc-upkeep
description: Keep the two mechanics source-of-truth docs synchronized with the engine. Use after ANY change to src/engine/sim.ts, src/skills/* semantics, or data/gauge-per-shot.json — and whenever the stop-doc-drift hook fires. Also the runbook for periodic full re-reviews of the docs against the code.
---

# Mechanics doc upkeep — the source-of-truth pair stays true

## The contract
Two documents must let a human reconstruct the sim's math without reading code:
1. `docs/data/game-mechanics.md` — WHAT the game does (mechanics, evidence tiers, sources).
   Detail docs it links: nikke-damage-formula.md, burst-gauge.md, charge-weapons.md,
   auto-play.md, nikke-mg-windup-model.md, range-data.md.
2. `docs/data/damage-calculation.md` — HOW the sim computes damage: every formula in the order
   the engine applies it, each term mapped to its `sim.ts` construct, with worked examples that
   match popup-verified real values.

## Steps for an incremental change
1. Identify which claims the change touches. Grep both docs for the mechanic's terms.
2. Update in place. The two SSOT docs are CURRENT-STATE class (docs/CONVENTIONS.md → Doc hygiene):
   keep the current truth, delete stale content — a reversed ruling's history goes to `DECISIONS.md`,
   not an in-place marker (an inline strikethrough is fine for an instructive correction, not required).
   **If the change touched a live env flag, timing/tuning constant, rotation rule, geometry model, or
   opt-in kit primitive, update `docs/STATE.md` (the landed-state registry) in the same pass** — it is a
   derived index and must stay true to the engine.
3. Every number keeps its evidence tier (MEASURED/DATAMINED/COMMUNITY/CALIBRATED ⚑ — see
   docs/CONVENTIONS.md). New ⚑ values also get an open-questions entry.
   - **Accreditation:** if a claim cites an external URL/author (DATAMINED/COMMUNITY/API tier),
     ensure that source is registered in `data/sources.json` (docs/CONVENTIONS.md → Accreditation).
4. If a tradeoff was settled or a ruling made, append to `docs/DECISIONS.md`.
5. If the change altered engine outputs: `npx tsx scripts/regression.ts --update` and commit the
   snapshot with the doc edits.

## Steps for a full re-review (periodic, or after a batch of engine changes)
1. Read `dealDamage()` + the constants block + the rotation state machine in `src/engine/sim.ts`
   top to bottom; list every formula/constant/branch.
2. Walk `damage-calculation.md` section by section against that list — every engine term must
   appear, every doc claim must have an engine counterpart. Fix both directions.
3. Spot-check the worked examples by recomputing them (the doc's examples use popup-verified
   fights so the numbers are checkable against reality, not just against the code).
4. Cross-check `game-mechanics.md` summaries and its links to detail docs.

## Verify
```sh
bash scripts/verify.sh
```
Plus: the worked examples in damage-calculation.md recompute correctly.

## Change log
- 2026-07-13 — created.
- 2026-07-21 — two-class doc taxonomy: SSOT pair is current-state (delete stale, reversed history →
  DECISIONS); step 2 now also updates `docs/STATE.md` when a flag/constant/primitive changes.
