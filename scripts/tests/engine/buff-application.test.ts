// Engine-primitive backfill: the BUFF APPLICATION rules — the cross-cutting semantics no primitive
// census row names, but that every one of the ~190 overrides depends on.
//
// The KR stacking rule (docs/data/game-mechanics.md §11): the same buff (same STAT at the same
// VALUE) from the same SKILL SLOT of the same CASTER refreshes instead of co-stacking, so a kit
// that states one effect across two trigger blocks (crown's two S1 "Reloading Speed ▲44.35%" lines)
// grants it ONCE. Change any one of those three coordinates and it stacks. That is encoded as a
// composite buff KEY, which means it is invisible in totals until two kits collide — the classic
// silent double-count.
//
// Also pinned here: `maxStacks` (contribution = value × stacks, capped), and the LAZY time expiry
// (`sum()` skips entries whose expiresFrame has passed; nothing sweeps the list, which is why the
// event log has no buffExpire event — see the step-1d note in the TDD transition plan).
//
// Method: the control comp with the carry's skill1/skill2 (and liter's skill1) emptied in memory as
// a shared BASELINE, then each arm adds synthetic self/ally buff blocks on top. The readout is the
// carry's own `mult.dmgUp` per normal-attack instance: attackDamagePct feeds the Damage Up bucket
// additively, so an arm's dmgUp MINUS the baseline's at the same instance is exactly the summed
// percentage the buff engine decided to grant. Buff magnitude never feeds back into timing, so
// every arm shares the baseline's frame-for-frame timeline and the subtraction is legal.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { controlComp, runComp, withPatchedOverride } from '../lib/harness.js';

type DamageEvent = Extract<SimEvent, { kind: 'damage' }>;

const CARRY = 'ada';
const ALLY = 'liter';
const FPS = 60;

/** attackDamagePct buff block: `passive` unless a trigger is given. */
const buffBlock = (
  value: number,
  extra: Record<string, unknown> = {},
  trigger: unknown = { kind: 'passive' },
  target: unknown = { kind: 'self' },
) => ({ trigger, target, effects: [{ kind: 'buff', stat: 'attackDamagePct', value, ...extra }] });

interface Arm {
  events: SimEvent[];
  normals: DamageEvent[];
}

/**
 * Run the shared baseline (carry skill1+skill2 and ally skill1 emptied), with `add` layering the
 * arm's synthetic blocks on top of that same cleared state.
 */
function arm(add: { carrySkill1?: unknown[]; carrySkill2?: unknown[]; allySkill1?: unknown[] } = {}): Arm {
  const overrides = {
    [CARRY]: withPatchedOverride(CARRY, (ov) => {
      ov.skill1 = add.carrySkill1 ?? [];
      ov.skill2 = add.carrySkill2 ?? [];
    }),
    [ALLY]: withPatchedOverride(ALLY, (ov) => {
      ov.skill1 = add.allySkill1 ?? [];
    }),
  };
  const events: SimEvent[] = [];
  runComp({ ...controlComp(CARRY), overrides, cfg: { onEvent: (e) => events.push(e) } });
  return {
    events,
    normals: events.filter(
      (e): e is DamageEvent => e.kind === 'damage' && e.slug === CARRY && e.srcSlot === 'normal',
    ),
  };
}

const baseline = arm();

/** Per-instance Damage-Up delta vs the baseline, in raw multiplier units (+1.00 == +100%). */
function dmgUpDelta(a: Arm): number[] {
  expect(a.normals.length, 'arm and baseline fired a different number of pulls').toBe(baseline.normals.length);
  return a.normals.map((e, i) => {
    expect(e.frame, `arm drifted off the baseline timeline at instance ${i}`).toBe(baseline.normals[i].frame);
    return e.mult.dmgUp - baseline.normals[i].mult.dmgUp;
  });
}

/** The delta, asserted CONSTANT across the whole fight (for always-on passives). */
function constantDelta(a: Arm): number {
  const d = dmgUpDelta(a);
  const spread = Math.max(...d) - Math.min(...d);
  expect(spread, `a passive buff's contribution varied by ${spread} over the fight`).toBeLessThan(1e-9);
  return d[0];
}

describe('buff application rules', () => {
  it('baseline is live — the carry fires and takes team buffs', () => {
    expect(baseline.normals.length, 'the carry never fired').toBeGreaterThan(20);
  });

  it('a single passive self-buff contributes value/100 to the Damage Up bucket', () => {
    expect(constantDelta(arm({ carrySkill1: [buffBlock(100)] }))).toBeCloseTo(1, 9);
  });

  it('DISCRIMINATING: the same stat+value from the same slot of the same caster does NOT co-stack', () => {
    // Two separate blocks, same skill slot, same stat, same value — the crown S1 shape. They collide
    // on one buff key, so the second REFRESHES the first. A per-block buff list (the obvious
    // implementation) grants +200% here and silently doubles every kit that states one effect twice.
    const two = arm({ carrySkill1: [buffBlock(100), buffBlock(100)] });
    expect(
      constantDelta(two),
      'two same-slot/same-value blocks stacked instead of overwriting (KR rule, game-mechanics §11)',
    ).toBeCloseTo(1, 9);
    // ...and the engine reports the collision rather than hiding it: the second application is a refresh.
    const applies = two.events.filter(
      (e): e is Extract<SimEvent, { kind: 'buffApply' }> =>
        e.kind === 'buffApply' && e.stat === 'attackDamagePct' && e.value === 100 && e.targetSlug === CARRY,
    );
    expect(applies.length, 'both blocks should have applied').toBe(2);
    expect(applies.map((e) => e.refresh), 'the second application should be a refresh of the first').toEqual([
      false,
      true,
    ]);
    expect(new Set(applies.map((e) => e.key)).size, 'the two blocks produced different keys').toBe(1);
  });

  it('DISCRIMINATING: change the SLOT, the CASTER, or the VALUE and it stacks again', () => {
    // Each arm differs from the non-stacking case above in exactly ONE coordinate of the buff key,
    // so together they show the key is (caster, slot, stat, value) and not something coarser.
    const otherSlot = arm({ carrySkill1: [buffBlock(100)], carrySkill2: [buffBlock(100)] });
    const otherCaster = arm({
      carrySkill1: [buffBlock(100)],
      allySkill1: [buffBlock(100, {}, { kind: 'passive' }, { kind: 'allies' })],
    });
    const otherValue = arm({ carrySkill1: [buffBlock(100), buffBlock(100.5)] });
    expect(constantDelta(otherSlot), 'same caster, DIFFERENT skill slot — must stack').toBeCloseTo(2, 9);
    expect(constantDelta(otherCaster), 'DIFFERENT caster, same stat/value — must stack').toBeCloseTo(2, 9);
    expect(constantDelta(otherValue), 'same slot, DIFFERENT value — a different buff, must stack').toBeCloseTo(
      2.005,
      9,
    );
  });

  it('maxStacks caps the contribution at value × maxStacks', () => {
    // A per-shot self-buff re-applied every pull: stacks climb by one per application and stop at
    // the cap. Damage is dealt BEFORE the shot's blocks dispatch, so the k-th pull is scored at
    // k-1 stacks. Asserting the whole ladder (not just the plateau) is what separates a real stack
    // counter from an implementation that jumps straight to the cap or never increments at all.
    const CAP = 3;
    const d = dmgUpDelta(
      arm({ carrySkill1: [buffBlock(100, { maxStacks: CAP }, { kind: 'shotFired' })] }),
    );
    const want = d.map((_, k) => Math.min(k, CAP));
    expect(
      d.map((x) => Math.round(x)).slice(0, 8),
      `stack ladder should climb 0,1,2,3,3,3… — got ${d.slice(0, 8).map((x) => x.toFixed(2)).join(',')}`,
    ).toEqual(want.slice(0, 8));
    d.forEach((x, k) => expect(x, `instance ${k}`).toBeCloseTo(want[k], 9));
  });

  it('durationSec expires LAZILY at exactly cast + durationSec', () => {
    // The boundary is `expiresFrame <= frame` inside sum(): an instance exactly durationSec after
    // the cast is already UNBUFFED. Off-by-one here is a whole frame of a burst window on every
    // timed buff in the roster, and no total-damage test can see it.
    const SEC = 5;
    const a = arm({
      carrySkill1: [buffBlock(100, { durationSec: SEC }, { kind: 'burstCast' })],
    });
    const casts = a.events.filter((e) => e.kind === 'burstCast' && e.slug === CARRY).map((e) => e.frame);
    expect(casts.length, 'the carry never cast her burst — the window never opened').toBeGreaterThan(0);
    const d = dmgUpDelta(a);
    const wrong = a.normals
      .map((e, i) => ({ e, got: d[i] }))
      .filter(({ e, got }) => {
        const last = casts.filter((c) => c <= e.frame).pop();
        const live = last !== undefined && e.frame < last + SEC * FPS;
        return Math.abs(got - (live ? 1 : 0)) > 1e-9;
      });
    expect(
      wrong.slice(0, 3).map(({ e, got }) => `${e.sec.toFixed(2)}s delta ${got.toFixed(3)}`),
      'buff live-window disagrees with [cast, cast + durationSec)',
    ).toEqual([]);
    // non-vacuous in both directions
    expect(d.some((x) => x > 0.5), 'the buff was never live').toBe(true);
    expect(d.some((x) => x < 0.5), 'the buff never expired').toBe(true);
  });
});
