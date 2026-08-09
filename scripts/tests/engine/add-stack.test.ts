// Engine-primitive backfill: `addStack` — "Increases the stack count of stackable buffs by N".
//
// Some kits add stacks to an already-running buff rather than re-applying it. The difference
// matters because a re-application refreshes duration and adds only +1 stack, while addStack
// can add N stacks at once and leave the rest of the buff state untouched.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { bareWeaponOverride, runComp } from '../lib/harness.js';

type BuffApplyEvent = Extract<SimEvent, { kind: 'buffApply' }>;
type DamageEvent = Extract<SimEvent, { kind: 'damage' }>;

const CARRY = 'blanc'; // AR, plain base weapon
const OTHER = 'crown';

function runWithSkill1(blocks: any[]): {
  events: SimEvent[];
  buffs: BuffApplyEvent[];
  normals: DamageEvent[];
} {
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
    buffs: events.filter(
      (e): e is BuffApplyEvent =>
        e.kind === 'buffApply' && e.targetSlug === CARRY
    ),
    normals: events.filter(
      (e): e is DamageEvent =>
        e.kind === 'damage' && e.slug === CARRY && e.srcSlot === 'normal'
    ),
  };
}

describe('addStack primitive', () => {
  it('adds N stacks to a live stackable buff without refreshing its value or key', () => {
    const { buffs } = runWithSkill1([
      {
        slot: 'skill1',
        trigger: { kind: 'passive' },
        target: { kind: 'self' },
        effects: [{ kind: 'buff', stat: 'atkPct', value: 10, maxStacks: 5 }],
      },
      {
        slot: 'skill1',
        trigger: { kind: 'shotFired' },
        target: { kind: 'self' },
        effects: [{ kind: 'addStack', count: 2 }],
      },
    ]);

    // First event is the passive application (stacks=1). Each shot then adds +2, capped at 5.
    const atkBuffs = buffs.filter((b) => b.stat === 'atkPct');
    expect(atkBuffs.length).toBeGreaterThan(2);
    expect(atkBuffs[0].stacks).toBe(1);
    // After enough shots we should see the cap.
    expect(atkBuffs.some((b) => b.stacks === 5)).toBe(true);
    // No new keys should appear — every event is a refresh of the same passive buff.
    expect(new Set(atkBuffs.map((b) => b.key)).size).toBe(1);
  });

  it('respects the stat filter when one is given', () => {
    const { buffs } = runWithSkill1([
      {
        slot: 'skill1',
        trigger: { kind: 'passive' },
        target: { kind: 'self' },
        effects: [
          { kind: 'buff', stat: 'atkPct', value: 10, maxStacks: 5 },
          { kind: 'buff', stat: 'critRatePct', value: 5, maxStacks: 5 },
        ],
      },
      {
        slot: 'skill1',
        trigger: { kind: 'shotFired' },
        target: { kind: 'self' },
        effects: [{ kind: 'addStack', count: 2, stat: 'atkPct' }],
      },
    ]);

    const atkStacks = buffs
      .filter((b) => b.stat === 'atkPct')
      .map((b) => b.stacks);
    const critStacks = buffs
      .filter((b) => b.stat === 'critRatePct')
      .map((b) => b.stacks);

    expect(Math.max(...atkStacks)).toBeGreaterThan(1);
    expect(Math.max(...critStacks)).toBe(1);
  });

  it('does not affect non-stackable or expired buffs', () => {
    const { buffs } = runWithSkill1([
      {
        slot: 'skill1',
        trigger: { kind: 'passive' },
        target: { kind: 'self' },
        effects: [
          { kind: 'buff', stat: 'atkPct', value: 10 }, // no maxStacks → maxStacks=1
          {
            kind: 'buff',
            stat: 'critRatePct',
            value: 5,
            maxStacks: 5,
            durationSec: 0.01,
          },
        ],
      },
      {
        slot: 'skill1',
        trigger: { kind: 'shotFired' },
        target: { kind: 'self' },
        effects: [{ kind: 'addStack', count: 2 }],
      },
    ]);

    // The atkPct buff is non-stackable; the critRatePct buff expires before the shot fires.
    const maxAtk = Math.max(
      ...buffs.filter((b) => b.stat === 'atkPct').map((b) => b.stacks)
    );
    const maxCrit = Math.max(
      ...buffs.filter((b) => b.stat === 'critRatePct').map((b) => b.stacks)
    );
    expect(maxAtk).toBe(1);
    expect(maxCrit).toBe(1);
  });

  it('is load-bearing: added stacks increase the buff contribution', () => {
    const withAdd = runWithSkill1([
      {
        slot: 'skill1',
        trigger: { kind: 'passive' },
        target: { kind: 'self' },
        effects: [
          { kind: 'buff', stat: 'attackDamagePct', value: 10, maxStacks: 5 },
        ],
      },
      {
        slot: 'skill1',
        trigger: { kind: 'shotFired' },
        target: { kind: 'self' },
        effects: [{ kind: 'addStack', count: 1 }],
      },
    ]);
    const withoutAdd = runWithSkill1([
      {
        slot: 'skill1',
        trigger: { kind: 'passive' },
        target: { kind: 'self' },
        effects: [
          { kind: 'buff', stat: 'attackDamagePct', value: 10, maxStacks: 5 },
        ],
      },
    ]);

    const avgDmgUp = (r: typeof withAdd) =>
      r.normals.reduce((a, d) => a + d.mult.dmgUp, 0) /
      Math.max(1, r.normals.length);

    expect(avgDmgUp(withAdd)).toBeGreaterThan(avgDmgUp(withoutAdd) + 0.05);
  });
});
