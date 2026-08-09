// Engine-primitive backfill: `attacked` trigger — "Activates when attacked N time(s)".
//
// The v1 sim deliberately has no incoming-damage model, so this trigger is normally inert.
// It is encoded for kit completeness and can be exercised in tests via the `manualAttacks`
// SimConfig hook.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { bareWeaponOverride, runComp } from '../lib/harness.js';

const CARRY = 'blanc';
const OTHER = 'crown';

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;

function runWithAttacks(
  triggerCount: number,
  attackFrames: number[]
): { events: SimEvent[]; buffs: BuffApply[] } {
  const events: SimEvent[] = [];
  runComp({
    slugs: [CARRY, OTHER],
    bossElement: 'Iron',
    focusSlug: CARRY,
    overrides: {
      [CARRY]: {
        slug: CARRY,
        skill1: [
          {
            slot: 'skill1',
            trigger: { kind: 'attacked', count: triggerCount },
            target: { kind: 'self' },
            effects: [
              { kind: 'buff', stat: 'atkPct', value: 10, durationSec: 5 },
            ],
          },
        ],
        skill2: [],
        burst: [],
      } as any,
      [OTHER]: bareWeaponOverride(OTHER),
    },
    cfg: {
      disableBursts: true,
      manualAttacks: [attackFrames, []],
      onEvent: (e) => events.push(e),
    },
  });
  return {
    events,
    buffs: events.filter((e): e is BuffApply => e.kind === 'buffApply'),
  };
}

describe('attacked trigger', () => {
  it('fires when the attack count reaches the threshold', () => {
    const { buffs } = runWithAttacks(3, [60, 120, 180, 240, 300, 360]);
    const frames = buffs
      .filter((b) => b.stat === 'atkPct' && b.value === 10)
      .map((b) => b.frame);
    // 6 attacks with count=3 → fires on the 3rd (frame 180) and 6th (frame 360).
    expect(frames).toEqual([180, 360]);
  });

  it('does not fire below the threshold', () => {
    const { buffs } = runWithAttacks(5, [60, 120, 180, 240]);
    const atk = buffs.filter((b) => b.stat === 'atkPct' && b.value === 10);
    expect(atk.length).toBe(0);
  });

  it('respects count values other than 1', () => {
    const { buffs } = runWithAttacks(2, [60, 120, 180, 240]);
    const frames = buffs
      .filter((b) => b.stat === 'atkPct' && b.value === 10)
      .map((b) => b.frame);
    expect(frames).toEqual([120, 240]);
  });
});
