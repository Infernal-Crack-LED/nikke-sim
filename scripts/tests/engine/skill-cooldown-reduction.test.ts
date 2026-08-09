// Engine-primitive backfill: `skillCooldownReductionSec` — "Cooldown of Skill X ▼ N sec".
//
// Interval-triggered skills (S2 cooldown nukes etc.) read a live
// `skillCooldownReductionSec` buff on their owner and shorten their effective
// period while it is active. Used by Dorothy's Manifestation window.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { bareWeaponOverride, runComp } from '../lib/harness.js';

const CARRY = 'blanc';
const OTHER = 'crown';
const FPS = 60;

type Damage = Extract<SimEvent, { kind: 'damage' }>;

function runWithReduction(reductionSec?: number) {
  const events: SimEvent[] = [];
  const override: any = {
    slug: CARRY,
    skill1:
      reductionSec == null
        ? []
        : [
            {
              slot: 'skill1',
              trigger: { kind: 'passive' },
              target: { kind: 'self' },
              effects: [
                {
                  kind: 'buff',
                  stat: 'skillCooldownReductionSec',
                  value: reductionSec,
                },
              ],
            },
          ],
    skill2: [
      {
        slot: 'skill2',
        trigger: { kind: 'interval', sec: 5 },
        target: { kind: 'self' },
        effects: [{ kind: 'flatDamage', atkPct: 100 }],
      },
    ],
    burst: [],
  };
  runComp({
    slugs: [CARRY, OTHER],
    bossElement: 'Iron',
    focusSlug: CARRY,
    overrides: {
      [CARRY]: override,
      [OTHER]: bareWeaponOverride(OTHER),
    },
    cfg: { disableBursts: true, onEvent: (e) => events.push(e) },
  });
  return events.filter(
    (e): e is Damage =>
      e.kind === 'damage' && e.slug === CARRY && e.bucket === 'skill'
  );
}

describe('skillCooldownReductionSec', () => {
  it('shortens an interval-trigger period while the buff is active', () => {
    const base = runWithReduction();
    const reduced = runWithReduction(4);
    expect(base.length).toBeGreaterThan(0);
    // 5s interval -> ~35 procs in 180s; 1s effective interval -> ~179 procs.
    expect(reduced.length).toBeGreaterThan(base.length * 3);
  });

  it('does not fire before the interval convention (t=sec) when no reduction is present', () => {
    const base = runWithReduction();
    const first = base[0].frame;
    expect(first).toBe(5 * FPS);
    for (let i = 1; i < base.length; i++) {
      expect(base[i].frame - base[i - 1].frame).toBe(5 * FPS);
    }
  });
});
