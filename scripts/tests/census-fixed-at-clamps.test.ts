// Self-validating fixture for scripts/census-fixed-at-clamps.ts — axis 4 of the phase-4 TAIL
// (docs/handoffs/2026-08-11-faithfulness-tail-plan.md §4b4) and phase-4 checklist item 7.
//
// The census claims: this kit FIXES a value, and the override has the machinery to actually fix
// it. Two failure directions, both pinned here:
//
//   RECALL — a fixing phrasing the matcher does not recognise looks exactly like a clean roster.
//   The verb form ("Fixes charge time at 3.2 sec") was missed by the first cut and found only by
//   the converse check, so both the phrasing and that check are pinned.
//
//   PRECISION — "accounted for" must mean the same thing here as in the other tail censuses: a
//   clamp key, the weapon-swap equivalent, OR an `unmodeled` entry. Judging on clamp keys alone
//   demands an encoding for lines that must not have one.
import { describe, expect, it } from 'vitest';
import {
  FIXING_LINE,
  auditUnit,
  census,
  clampsWithoutLine,
  family,
  recordedAsUnmodeled,
} from '../census-fixed-at-clamps.js';

describe('FIXING_LINE — every phrasing the roster actually prints', () => {
  it('matches the three forms in use', () => {
    for (const line of [
      'Charge time is fixed at 0.7 sec for 10 sec.',
      'Reload speed is fixed at a 95% increase for 10 sec.',
      // The verb form — `snow-white-heavy-arms`. Missing from the first cut, which made her
      // invisible while she carried a chargeTimeClamp.
      'Effect 1: Fixes charge time at 3.2 sec continuously.',
    ]) {
      expect(FIXING_LINE.test(line)).toBe(true);
    }
  });

  it('does not match "cannot be removed" boilerplate', () => {
    expect(
      FIXING_LINE.test('This effect is continuous and cannot be removed.')
    ).toBe(false);
  });
});

describe('family — the subject decides which primitive can express the line', () => {
  it('classifies by the line itself when the line names the subject', () => {
    expect(family('Reload speed is fixed at a 60% increase.')).toBe('reload');
    expect(family('Charge time is fixed at 1.8 sec')).toBe('charge');
    expect(family('Pellet count is fixed at 1 for 3 round(s).')).toBe('pellet');
  });

  it('falls back to the ■ block when the line is a bare continuation', () => {
    // `maxwell-ordinary-mechanic` states "Charge Time is fixed." once, then enumerates five
    // Overcurrent stages that never repeat the subject. Judged alone they are unclassifiable.
    const block =
      'Changes the weapon in use: Matis UberBuster Charge Time is fixed. Stage 3: Fixed at 2 sec.';
    expect(family('Stage 3: Fixed at 2 sec.', block)).toBe('charge');
    expect(family('Stage 3: Fixed at 2 sec.')).toBe('unclassified');
  });

  it('does not mistake the Fixed Damage DAMAGE TYPE for a clamp', () => {
    // `emilia` skill2 — the one collision this wording has roster-wide.
    expect(
      family(
        'Deals Fixed Damage to the main body equal to 58.99% of the damage dealt by self.'
      )
    ).toBe('unclassified');
  });
});

describe('accepted encodings — a clamp key is not the only correct answer', () => {
  const kit = { burst: '■ Affects self.\nCharge time is fixed at 2 sec.' };

  it('accepts a weapon-swap chargeTimeSec as equivalent to a clamp', () => {
    // sim.ts:3711-3714 forces chargeSpeedPct to 0 whenever u.swap.chargeFrames is set, so a swap
    // that states its own charge time is ALREADY buff-immune. `maxwell-ordinary-mechanic` encodes
    // all five staged values this way and is correct.
    const row = auditUnit(
      'fixture',
      kit,
      JSON.stringify({
        burst: [{ effects: [{ kind: 'weaponSwap', chargeTimeSec: 2 }] }],
      })
    )[0]!;
    expect(row.ok).toBe(true);
    expect(row.encodedWith).toEqual(['chargeTimeSec']);
  });

  it('accepts an `unmodeled` entry as a disposition', () => {
    // `liberalio`'s Gentle Current fires only against a Rapture that is NOT the stage target —
    // impossible on a single boss, so it is recorded rather than encoded.
    const row = auditUnit(
      'fixture',
      kit,
      JSON.stringify({
        unmodeled: {
          skill1: [],
          skill2: [],
          burst: ['Charge time is fixed at 2 sec.'],
        },
      })
    )[0]!;
    expect(row.ok).toBe(true);
    expect(row.recordedUnmodeled).toBe(true);
  });

  it('FAILS a fixing line with neither a clamp nor a record', () => {
    // The mutation case: without this the census could pass by accepting everything.
    const row = auditUnit(
      'fixture',
      kit,
      JSON.stringify({
        burst: [
          { effects: [{ kind: 'buff', stat: 'chargeSpeedPct', value: 50 }] },
        ],
      })
    )[0]!;
    expect(row.ok).toBe(false);
  });

  it('does not credit an unrelated unmodeled entry', () => {
    const row = auditUnit(
      'fixture',
      kit,
      JSON.stringify({
        unmodeled: {
          skill1: ['Taunts all enemies for 5 sec.'],
          skill2: [],
          burst: [],
        },
      })
    )[0]!;
    expect(
      recordedAsUnmodeled('Charge time is fixed at 2 sec.', {
        unmodeled: { skill1: ['Taunts all enemies for 5 sec.'] },
      })
    ).toBe(false);
    expect(row.ok).toBe(false);
  });
});

describe('roster result — every fixing line is accounted for', () => {
  const rows = census();

  it('leaves no fixing line unencoded and unrecorded', () => {
    expect(rows.filter((r) => !r.ok)).toEqual([]);
  });

  it('has no clamp without a recognised fixing line — the RECALL check', () => {
    // This is the check that measures the matcher's own recall, using the clamp carriers as an
    // INDEPENDENT list of units that must have a fixing line. A non-empty result means either a
    // phrasing this matcher misses or a clamp with no kit basis; both are real.
    expect(clampsWithoutLine(rows)).toEqual([]);
  });

  it('still sees the whole population — a matcher that matches nothing also passes above', () => {
    expect(rows.length).toBeGreaterThanOrEqual(18);
    expect(new Set(rows.map((r) => r.slug)).size).toBeGreaterThanOrEqual(11);
    expect(rows.filter((r) => r.family === 'unclassified')).toEqual([]);
  });
});
