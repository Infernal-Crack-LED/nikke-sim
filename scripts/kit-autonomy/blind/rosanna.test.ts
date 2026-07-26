/*
 * Rosanna (rosanna) kit assertions.
 * S1: 120-hit self crit buff; Concealment/dispel skipped (missing primitives).
 * S2: start Concealment skipped; incapacitated Frenzy inert in v1.
 * Burst: 1310.4% damage on cast; Concealment rider skipped.
 * Fixture: controlComp('rosanna', true). Counterfactuals mutate the cloned override.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

describe('rosanna kit', () => {
  const run = (opts: Parameters<typeof runComp>[0]) => {
    const events: SimEvent[] = [];
    const res = runComp({ ...opts, onEvent: (ev: SimEvent) => events.push(ev) });
    return { res, events };
  };

  const rosEvents = (res: ReturnType<typeof runComp>) =>
    ((unitOf(res, 'rosanna') as any).events || []) as SimEvent[];

  it('S1: 120 normal attacks -> self crit rate +19.34% for 3s', () => {
    const { res } = run(controlComp('rosanna', true));
    const re = rosEvents(res);
    const shotFrames = re
      .filter((e: any) => e.kind === 'shot')
      .map((e: any) => e.frame as number)
      .sort((a: number, b: number) => a - b);
    const crits = re.filter(
      (e: any) =>
        e.kind === 'buffApply' &&
        e.stat === 'critRatePct' &&
        Math.abs((e.value as number) - 19.34) < 0.001
    );
    expect(crits.length).toBeGreaterThan(0);
    expect((crits[0] as any).frame).toBeGreaterThanOrEqual(shotFrames[119] ?? 0);
    const early = crits.filter(
      (e: any) => (e.frame as number) < (shotFrames[119] ?? Infinity)
    );
    expect(early.length).toBe(0);
    const others = re.filter(
      (e: any) =>
        e.kind === 'buffApply' &&
        e.stat === 'critRatePct' &&
        Math.abs((e.value as number) - 19.34) < 0.001 &&
        e.targetSlug !== 'rosanna'
    );
    expect(others.length).toBe(0);
  });

  it('S1 counterfactual: unreachable hit threshold -> no crit buff', () => {
    const patched = withPatchedOverride('rosanna', (ov) => {
      const b = ov.skill1!.blocks.find(
        (x: any) => x.trigger.kind === 'hitCount' && x.trigger.count === 120
      );
      if (b) b.trigger = { kind: 'hitCount', count: 999999 };
    });
    const { res } = run({
      ...controlComp('rosanna', true),
      overrides: { rosanna: patched },
    });
    const re = rosEvents(res);
    const crits = re.filter(
      (e: any) =>
        e.kind === 'buffApply' &&
        e.stat === 'critRatePct' &&
        Math.abs((e.value as number) - 19.34) < 0.001
    );
    expect(crits.length).toBe(0);
  });

  it('S2: incapacitated Frenzy is inert (no deaths in v1)', () => {
    const { res } = run(controlComp('rosanna', true));
    const re = rosEvents(res);
    const frenzy = re.filter(
      (e: any) =>
        e.kind === 'buffApply' &&
        e.stat === 'atkPct' &&
        Math.abs((e.value as number) - 22.61) < 0.001 &&
        e.targetSlug === 'rosanna'
    );
    expect(frenzy.length).toBe(0);
  });

  it('burst: cast deals 1310.4% final ATK damage', () => {
    const { res } = run(controlComp('rosanna', true));
    const re = rosEvents(res);
    const hits = re.filter(
      (e: any) =>
        e.kind === 'damage' &&
        e.srcSlot === 'burst' &&
        (Math.abs((e.mult as number) - 13.104) < 0.001 ||
          Math.abs((e.mult as number) - 1310.4) < 0.1)
    );
    expect(hits.length).toBeGreaterThan(0);
    for (const h of hits) {
      expect((h as any).inFullBurst).toBe(false);
      expect((h as any).core).toBe(false);
    }
  });

  it('burst counterfactual: zeroing the 1310.4% effect removes main burst damage', () => {
    const patched = withPatchedOverride('rosanna', (ov) => {
      for (const b of ov.burst!.blocks) {
        for (const eff of b.effects) {
          if (
            eff.kind === 'flatDamage' &&
            (Math.abs((eff.atkPct as number) - 1310.4) < 0.001 ||
              Math.abs((eff.atkPct as number) - 13.104) < 0.001)
          ) {
            eff.atkPct = 0;
          }
        }
      }
    });
    const { res } = run({
      ...controlComp('rosanna', true),
      overrides: { rosanna: patched },
    });
    const re = rosEvents(res);
    const mainHits = re.filter(
      (e: any) =>
        e.kind === 'damage' &&
        e.srcSlot === 'burst' &&
        (Math.abs((e.mult as number) - 13.104) < 0.001 ||
          Math.abs((e.mult as number) - 1310.4) < 0.1)
    );
    expect(mainHits.length).toBe(0);
  });

  it.skip('S1a: Concealment 10s self / removed on hit — no self-status primitive', () => {});
  it.skip('S1b: 2 highest-final-ATK enemies, remove 5 buffs — no enemy-rank/dispel primitive', () => {});
  it.skip('S2a: Start-of-battle 5s Concealment — no self-status primitive', () => {});
  it.skip('burst rider: +561.6% when Concealment — gated by unmodeled self-status', () => {});
});
