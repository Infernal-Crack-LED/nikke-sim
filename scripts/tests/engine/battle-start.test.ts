// Engine-primitive backfill: `battleStart` trigger — "Activates at the start of battle".
//
// Kit lines that fire once at t=0 and expire afterwards cannot use the `passive` trigger,
// because passives ignore durationSec and stay always-on. The `battleStart` trigger fires
// exactly one block application at frame 0, respecting durationSec.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { bareWeaponOverride, runComp } from '../lib/harness.js';

const CARRY = 'blanc';
const OTHER = 'crown';
const FPS = 60;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;

function runWithSkill1(blocks: any[]) {
  const events: SimEvent[] = [];
  runComp({
    slugs: [CARRY, OTHER],
    bossElement: 'Iron',
    focusSlug: CARRY,
    overrides: {
      [CARRY]: {
        slug: CARRY,
        skill1: blocks,
        skill2: [],
        burst: [],
      } as any,
      [OTHER]: bareWeaponOverride(OTHER),
    },
    cfg: { disableBursts: true, onEvent: (e) => events.push(e) },
  });
  return {
    events,
    buffs: events.filter((e): e is BuffApply => e.kind === 'buffApply'),
  };
}

describe('battleStart trigger', () => {
  it('fires a frame-0 buff that respects durationSec', () => {
    const { buffs } = runWithSkill1([
      {
        slot: 'skill1',
        trigger: { kind: 'battleStart' },
        target: { kind: 'self' },
        effects: [{ kind: 'buff', stat: 'atkPct', value: 10, durationSec: 5 }],
      },
    ]);

    const atk = buffs.filter((b) => b.stat === 'atkPct' && b.value === 10);
    expect(atk.length).toBeGreaterThan(0);
    const start = atk.find((b) => b.frame === 0);
    expect(start).toBeDefined();
    expect(start!.expiresFrame! - start!.frame).toBe(5 * FPS);
  });

  it('does NOT fire again later in the fight', () => {
    const { buffs } = runWithSkill1([
      {
        slot: 'skill1',
        trigger: { kind: 'battleStart' },
        target: { kind: 'self' },
        effects: [{ kind: 'buff', stat: 'atkPct', value: 10, durationSec: 5 }],
      },
    ]);

    const frames = buffs
      .filter((b) => b.stat === 'atkPct' && b.value === 10)
      .map((b) => b.frame);
    expect(frames).toContain(0);
    expect(frames.every((f) => f === 0)).toBe(true);
  });
});
