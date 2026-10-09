// Engine primitive: target `adjacentAlly` — "the ally to the right/left of this unit". The ONE
// neighbouring slot on that side, never the owner and never the far side; an owner at the matching
// edge of the team has no such ally and the block applies to nobody. Positional sibling of
// `selfAndAdjacent` (units[] is slot order, leftmost first). Carrier: belorta-pumpkin-witch
// (S1 FB-entry ATK, S2 full-charge Sustained Damage, burst ATK + Sustained Damage — all "the ally
// to the right of this unit").
//
// Observable: the `buffApply` event names the holder (`targetIdx`), so the resolved target set is
// read directly off the event log. Zeroed-kit carrier on a bare-weapon team, bursts off.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { structuralCheck } from '../../../src/skills/validate-structural.js';
import {
  bareWeaponOverride,
  CLEAN_WEAPON_SLUGS,
  runComp,
} from '../lib/harness.js';

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;

const TEAM = CLEAN_WEAPON_SLUGS.slice(0, 5);
const MARK = 12.34; // a value no bare-weapon unit carries, so the buff is unambiguous

/** Holder slot indices of the carrier's marked buff, with the carrier at `carrierIdx`. */
function holders(carrierIdx: number, target: unknown): number[] {
  const carrier = TEAM[carrierIdx];
  const events: SimEvent[] = [];
  const overrides = Object.fromEntries(
    TEAM.map((s) => [s, bareWeaponOverride(s)])
  );
  overrides[carrier] = {
    slug: carrier,
    skill1: [
      {
        slot: 'skill1',
        trigger: { kind: 'battleStart' },
        target,
        effects: [
          { kind: 'buff', stat: 'atkPct', value: MARK, durationSec: 10 },
        ],
      },
    ],
    skill2: [],
    burst: [],
  } as any;
  runComp({
    slugs: TEAM,
    bossElement: 'Iron',
    overrides,
    cfg: { disableBursts: true, onEvent: (e) => events.push(e) },
  });
  return events
    .filter(
      (e): e is BuffApply =>
        e.kind === 'buffApply' && e.stat === 'atkPct' && e.value === MARK
    )
    .map((e) => e.targetIdx as number)
    .sort();
}

describe('adjacentAlly target (the ally to the right/left of this unit)', () => {
  it('fixture: five distinct units', () => {
    expect(new Set(TEAM).size).toBe(5);
  });

  it('DISCRIMINATING: side right = exactly slot+1 (not self, not the left neighbour)', () => {
    expect(holders(2, { kind: 'adjacentAlly', side: 'right' })).toEqual([3]);
    expect(holders(0, { kind: 'adjacentAlly', side: 'right' })).toEqual([1]);
  });

  it('DISCRIMINATING: side left = exactly slot-1', () => {
    expect(holders(2, { kind: 'adjacentAlly', side: 'left' })).toEqual([1]);
  });

  it('edge: no ally on that side → the block applies to nobody', () => {
    expect(holders(4, { kind: 'adjacentAlly', side: 'right' })).toEqual([]);
    expect(holders(0, { kind: 'adjacentAlly', side: 'left' })).toEqual([]);
  });

  it('contrast: selfAndAdjacent sides:1 covers self + both neighbours (a different target)', () => {
    expect(holders(2, { kind: 'selfAndAdjacent', sides: 1 })).toEqual([
      1, 2, 3,
    ]);
  });

  it('validator: adjacentAlly needs side left|right', () => {
    const ctx = { characterSlugs: new Set(['x']), squadOf: () => undefined };
    const mk = (target: unknown) =>
      structuralCheck(
        'x',
        {
          note: 'fixture',
          unmodeled: { skill1: [], skill2: [], burst: [] },
          skill1: [
            {
              slot: 'skill1',
              trigger: { kind: 'battleStart' },
              target,
              effects: [{ kind: 'buff', stat: 'atkPct', value: 1 }],
            },
          ],
          skill2: [],
          burst: [],
        },
        ctx
      ).errors.filter(
        (m: string) => m.includes('target') || m.includes('side')
      );
    expect(mk({ kind: 'adjacentAlly', side: 'right' })).toEqual([]);
    expect(
      mk({ kind: 'adjacentAlly' }).some((m: string) => m.includes('side'))
    ).toBe(true);
    expect(
      mk({ kind: 'adjacentAlly', side: 'up' }).some((m: string) =>
        m.includes('side')
      )
    ).toBe(true);
  });
});
