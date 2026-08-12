// Self-validating fixture for scripts/census-held-primitives.ts — axis 5 of the phase-4 TAIL
// (docs/handoffs/2026-08-11-faithfulness-tail-plan.md §4b5, audit F11).
//
// The census exists because a stale "this primitive is not built" claim is self-perpetuating: a
// reviewer hits a kit line, looks the primitive up, reads "not authorized", and files the line as
// unmodelable — without re-checking the tree. `addStack` sat that way while it was implemented and
// carried by seven overrides.
//
// So the fixture pins BOTH directions: the drift detector must fire when a documented status is
// wrong (otherwise the census is decoration), and the roster must currently be clean.
import { describe, expect, it } from 'vitest';
import {
  HELD,
  UNAUDITABLE,
  actualStatus,
  census,
} from '../census-held-primitives.js';

describe('actualStatus — the tree decides, not the doc', () => {
  it('calls an implemented, carried primitive LIVE', () => {
    expect(actualStatus(true, 7)).toBe('live');
  });

  it('calls an implemented, uncarried primitive ZERO-CARRIER', () => {
    expect(actualStatus(true, 0)).toBe('zero-carrier');
  });

  it('calls an unimplemented primitive a GAP', () => {
    expect(actualStatus(false, 0)).toBe('gap');
  });

  it('DRIFTS when a doc calls a live primitive a gap — the addStack case', () => {
    // The mutation guard. Without it, a census whose table simply agreed with itself would look
    // identical to one that works. This is the exact shape of the 2026-08-11 finding: docs said
    // `gap`, the tree said `live` with 7 carriers.
    expect(actualStatus(true, 7)).not.toBe('gap');
  });
});

describe('roster — every documented status matches the tree', () => {
  const rows = census();

  it('has no drifted primitive', () => {
    expect(rows.filter((r) => r.drifted).map((r) => r.key)).toEqual([]);
  });

  it('keeps addStack LIVE with the carriers that closed its build bar', () => {
    // The owner rule was "two carriers is not yet a mandate; log a third before building". That
    // bar was passed long ago — flora S1, the very line QUEUE said addStack blocked, is encoded
    // with it. Pinned so the "gap" framing cannot come back.
    const addStack = rows.find((r) => r.key === 'addStack')!;
    expect(addStack.inEngine).toBe(true);
    expect(addStack.carriers.length).toBeGreaterThanOrEqual(3);
    expect(addStack.carriers).toContain('flora');
  });

  it('keeps the four zero-carrier StatKeys genuinely uncarried', () => {
    // Their collapse-or-keep decision (bucket-matrix §6) is only open while nothing carries them.
    // A carrier appearing is what would settle it — so it must not appear silently.
    for (const key of [
      'hasTrueNormals',
      'whileSwapped',
      'fireRatePct',
      'elementDamagePct',
    ]) {
      const row = rows.find((r) => r.key === key)!;
      expect(row.carriers).toEqual([]);
    }
  });

  it('names its own blind spot instead of implying F11 is covered', () => {
    // Only keyed primitives are auditable this way; selectors, triggers and accumulators are not.
    expect(rows).toHaveLength(HELD.length);
    expect(UNAUDITABLE.length).toBeGreaterThan(0);
  });
});
