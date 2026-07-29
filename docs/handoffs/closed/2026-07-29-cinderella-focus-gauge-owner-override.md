# Owner override handoff — Cinderella focus-gauge multiplier 2.0×

**Status:** OWNER-OVERRIDE — set `cinderella`'s focused charge-gauge multiplier to **2.0×** (down from the current 2.5× pin).  
**Scope:** `cinderella` only.  
**Worktree/branch:** `focus-charge-gauge-per-unit` @ `../nikke-sim-wt-focus-charge-gauge`.

## Owner ruling

- Every shot contributes gauge. The low opener readings from the dark-unfilled-track reader are a UI-occlusion artifact (the "BURST" label / early-bar rendering), not a gaugeless opener.
- Therefore the counting-bound estimate uses **all 76 shots** fired to reach full:
  - `100 / 76 ≈ 1.32 %/shot`.
  - This is consistent with the datamined 2.0× prediction of `1.35 %/shot` (0.45 % rider + 0.90 % weapon).
- The datamined `fullChargeBonus` for Cinderella is 200 → multiplier = **2.0×**.

This override enacts the 2.0× value directly rather than deriving it from a fresh independent measurement.

## Evidence summary

- Solo footage `docs/probes/720-kit-audit/cindy solo neutral.MP4` reaches `full` on the **76th shot** at `t = 44.57 s`.
- Magazine structure: 24 + 24 + 24 + 4 = **76 shots** (ammo-counter verified).
- Under the owner ruling that all 76 shots contribute, the counting bound is `[100/76, 100/75) = [1.3158 %, 1.3333 %)`.
  - Datamined 2.0× → `0.45 % + (0.45 % × 2.0) = 1.35 %/shot` ✓ consistent with the bound, allowing for the 100 % cap to clip the last shot.
  - Current flat 2.5× → `0.45 % + (0.45 % × 2.5) = 1.575 %/shot` ✗ predicts full by shot ~64.

See `/tmp/sci-method-cindy-alice/work-deliverable.md` §1 for the raw measurement record and `docs/handoffs/2026-07-29-gauge-fill-reader-calibration.md` §CINDERELLA-RESULT for the prior analysis.

## Code change

Introduce a per-unit `focusChargeMult` charFixe and apply it in `gaugePerShot`. This keeps the existing `magDumpRof` cadence fix intact while overriding only the gauge multiplier.

### 1. `src/skills/index.ts` — add to `PreparedCharacter`

```ts
export type PreparedCharacter = {
  // ... existing fields ...
  charFixes?: {
    reloadFrames?: number;
    burstCooldownSec?: number;
    noBoltRecovery?: boolean;
    pullsPerSec?: number;
    magDumpRof?: boolean;
    focusChargeMult?: number; // <-- NEW: owner-override focused gauge multiplier
  };
};
```

### 2. `src/prepare.ts` — pass it through

```ts
magDumpRof: deps.overrides[char.slug]?.charFixes?.magDumpRof,
focusChargeMult: deps.overrides[char.slug]?.charFixes?.focusChargeMult,
```

### 3. `src/engine/sim.ts` — consume the override

Around `src/engine/sim.ts:833` (unit-state init), add:

```ts
focusChargeMult: prepared?.[idx]?.focusChargeMult,
```

In `gaugePerShot` (`src/engine/sim.ts:1347-1351`):

```ts
// BEFORE
const fcb = entry?.fullChargeBonus;
const focusMult =
  u.magDumpRof || PENDING_TEAM_ISOLATION.has(u.char.slug)
    ? FOCUS_CHARGE_GEN
    : (fcb && fcb > 0 ? fcb : 250) / 100;

// AFTER
const fcb = entry?.fullChargeBonus;
const focusMult =
  u.focusChargeMult ??
  (u.magDumpRof || PENDING_TEAM_ISOLATION.has(u.char.slug)
    ? FOCUS_CHARGE_GEN
    : (fcb && fcb > 0 ? fcb : 250) / 100);
```

### 4. `src/skills/overrides/cinderella.json` — declare the override

```json
{
  "charFixes": {
    "reloadFrames": 120,
    "magDumpRof": true,
    "focusChargeMult": 2.0
  }
}
```

Add a note in the override's top-level `note` field documenting that this is an owner-override multiplier (not an independently measured value).

## Blast radius

- **Burst-gen ranking board:** unaffected (board uses unfocused camera).
- **DPS chart / team sim / probe validation:** Cinderella-focused comps generate ~−20 % less focused gauge than under the current 2.5× pin. Any graded probe where Cinderella held camera focus should be re-checked.
- The `magDumpRof` whole-magazine dump cadence fix is preserved; only the per-shot gauge multiplier changes.

## Verification checklist

- [ ] `bash scripts/verify.sh` green.
- [ ] `npx tsx scripts/regression.ts --update` with the change; review board deltas for focused-Cinderella comps.
- [ ] Update `docs/DECISIONS.md` — Cinderella 2.0× owner override enacted.
- [ ] Update `docs/data/burst-gauge.md` §4 to note Cinderella's enacted 2.0× multiplier and the owner-ruling basis.
- [ ] Update the top-level `note` in `src/skills/overrides/cinderella.json` to mention `focusChargeMult: 2.0`.
- [ ] Validate that `npx tsx scripts/kit.ts cinderella` still passes and reports sane numbers.

## Caveats

- The 8-shot opener anomaly described in `docs/handoffs/2026-07-29-gauge-fill-reader-calibration.md` §CINDERELLA-RESULT is **not modeled** by this override; it is treated as a UI-reading artifact per the owner ruling.
- The 2.0× value is datamine-derived / owner-approved, not independently measured from the opener window.
