# Approved implementation handoff — Alice focus-gauge multiplier 3.5×

**Status:** OWNER-APPROVED — implement now.  
**Scope:** `alice` only.  
**Worktree/branch:** `focus-charge-gauge-per-unit` @ `../nikke-sim-wt-focus-charge-gauge`.

## Approved claim

`alice` should use her datamined `fullChargeBonus` of 350 as the camera-focus charge-gauge multiplier:

> focus multiplier = 350 / 100 = **3.5×**

This replaces the current flat 2.5× pin in `src/engine/sim.ts`.

## Evidence summary

- Solo footage `docs/probes/solo/alice solo.MP4` fills the burst gauge on **shot 6** at `t = 18.38 s`.
- The counting bound for 6 shots to full is `[100/6, 100/5) = [16.67 %, 20.0 %)`.
  - Datamined 3.5× → `5.6 % × 3.5 = 19.6 %/shot` ✓ inside the bound.
  - Current flat 2.5× → `5.6 % × 2.5 = 14.0 %/shot` ✗ outside the bound (predicts shot 8).
- Charge-HUD crop confirms every counted shot is fired from a full-charge state.

See `/tmp/sci-method-cindy-alice/work-deliverable.md` §2 and `result-postop-judge.json` for the full measurement record.

## Code change

In `src/engine/sim.ts`, remove `alice` from the `PENDING_TEAM_ISOLATION` set:

```ts
// BEFORE
const PENDING_TEAM_ISOLATION = new Set(['alice', 'vesti-tactical-upgrade']);

// AFTER
const PENDING_TEAM_ISOLATION = new Set(['vesti-tactical-upgrade']);
```

`gaugePerShot` already falls back to `fullChargeBonus / 100` for units not in this set and not flagged `magDumpRof`:

```ts
const fcb = entry?.fullChargeBonus;
const focusMult =
  u.magDumpRof || PENDING_TEAM_ISOLATION.has(u.char.slug)
    ? FOCUS_CHARGE_GEN
    : (fcb && fcb > 0 ? fcb : 250) / 100;
```

With `alice` removed from the set, her datamined `fullChargeBonus: 350` becomes the active multiplier.

## Blast radius

- **Burst-gen ranking board:** unaffected. `src/ranks/burstgen.ts` focuses on a non-charge no-op teammate, so the focus multiplier never enters the board.
- **DPS chart / team sim / probe validation:** Alice-focused comps gain ~+40 % focused gauge generation. Any graded probe where Alice held camera focus should be re-checked.
- `vesti-tactical-upgrade` remains pinned to 2.5× by the same set; no change.

## Verification checklist

- [ ] `bash scripts/verify.sh` green.
- [ ] `npx tsx scripts/regression.ts --update` with the change; review board deltas for focused-Alice comps.
- [ ] Update `docs/DECISIONS.md` — Alice 3.5× enacted (overturns the prior flat-2.5 pin for Alice).
- [ ] Update `docs/data/burst-gauge.md` §4 to reflect that Alice uses her per-unit `fullChargeBonus`.
- [ ] Remove/retire the `stored but unused ⚑` comment around `src/engine/sim.ts:993` if it is no longer accurate after this and the Cinderella override land.

## Open questions

None for Alice. The solo measurement supports the datamined value.
