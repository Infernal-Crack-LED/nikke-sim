import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

interface BuffApplyEvent extends SimEvent {
  kind: 'buffApply';
  stat: string;
  value: number;
  casterIdx: number;
  targetIdx: number;
  targetSlug: string;
  expiresFrame: number;
  frame: number;
}

function isBuffApply(ev: SimEvent, stat: string): ev is BuffApplyEvent {
  return (ev as any).kind === 'buffApply' && (ev as any).stat === stat;
}

function sumTotals(res: any): number {
  return Object.values(totals(res)).reduce(
    (a, b) => (a as number) + (b as number),
    0
  ) as number;
}

describe('flora', () => {
  // Fixture: flora is Burst II. fixedB3=true supplies the B1/B2/B3 chain so
  // her own burst actually casts; we record events to tie the True Damage
  // buff to her burst cast, target set, and 10s expiry.
  const baseEvents: SimEvent[] = [];
  const baseRes = runComp({
    ...controlComp('flora', true),
    cfg: { onEvent: (ev: SimEvent) => baseEvents.push(ev) },
  });

  // Counterfactual: same comp, but the burst's trueDamagePct buff is stripped.
  // Total damage should drop and the event should disappear.
  const noTrueEvents: SimEvent[] = [];
  const noTrueRes = runComp({
    ...controlComp('flora', true),
    overrides: {
      flora: withPatchedOverride('flora', (ov) => {
        ov.burst!.blocks.forEach((b) => {
          b.effects = b.effects.filter(
            (e) => !(e.kind === 'buff' && e.stat === 'trueDamagePct')
          );
        });
      }),
    },
    cfg: { onEvent: (ev: SimEvent) => noTrueEvents.push(ev) },
  });

  // Inactive case: no fixed B3 means no Full Burst and no burst cast.
  const noFbEvents: SimEvent[] = [];
  const noFbRes = runComp({
    ...controlComp('flora', false),
    cfg: { onEvent: (ev: SimEvent) => noFbEvents.push(ev) },
  });

  const trueBuffs = baseEvents.filter((ev) => isBuffApply(ev, 'trueDamagePct'));
  const floraCasterIdx = trueBuffs[0]?.casterIdx;
  const floraBurstCasts = baseEvents.filter(
    (ev) =>
      ev.kind === 'burstCast' &&
      floraCasterIdx !== undefined &&
      (ev as any).casterIdx === floraCasterIdx
  );
  const firstCastFrame =
    floraBurstCasts.length > 0 ? (floraBurstCasts[0] as any).frame : -1;

  it('flora deals damage in the control comp', () => {
    expect(unitOf(baseRes, 'flora').totalDamage).toBeGreaterThan(0);
  });

  it('burst: applies True Damage ▲42.39% to all allies for 10s on her own burst cast', () => {
    expect(trueBuffs.length).toBeGreaterThan(0);

    const unitSlugs = Object.keys(totals(baseRes)).sort();
    const targets = new Set(trueBuffs.map((b) => b.targetSlug));
    expect([...targets].sort()).toEqual(unitSlugs);

    expect(floraBurstCasts.length).toBeGreaterThan(0);

    for (const b of trueBuffs) {
      expect(b.casterIdx).toBe(floraCasterIdx);
      expect(b.value).toBeCloseTo(42.39, 2);
      expect(b.expiresFrame).toBeGreaterThan(b.frame);
      // 10s at 60fps; allow a frame of slack for inclusive timing.
      expect(Math.abs(b.expiresFrame - b.frame - 600)).toBeLessThanOrEqual(3);
      expect(b.frame).toBeGreaterThanOrEqual(firstCastFrame - 1);
    }
  });

  it('burst true-damage buff is damage-moving and removing it eliminates the event', () => {
    expect(sumTotals(noTrueRes)).toBeLessThan(sumTotals(baseRes));
    expect(
      noTrueEvents.filter((ev) => isBuffApply(ev, 'trueDamagePct')).length
    ).toBe(0);
  });

  it('without a B3 chain there is no Full Burst, no burst cast, and no true-damage buff', () => {
    expect(
      noFbEvents.filter((ev) => ev.kind === 'fullBurstStart').length
    ).toBe(0);
    expect(
      noFbEvents.filter((ev) => isBuffApply(ev, 'trueDamagePct')).length
    ).toBe(0);
  });

  it('skill2 HP-conditional lines do not silently fire as passives in v1', () => {
    const s2b = baseEvents.filter(
      (ev) =>
        isBuffApply(ev, 'trueDamagePct') && Math.abs(ev.value - 30.97) < 0.01
    );
    expect(s2b.length).toBe(0);
  });

  it.skip('S1a: start-of-battle positional heal (1% Max HP/s) — unmodeled: no HP pool / heal amount primitive', () => {});
  it.skip('S1a: incoming healing ▲4% stacking — missing incomingHealingPct stat primitive', () => {});
  it.skip('S1b: +1 stack count to Electric allies after 100 hits — missing generic stack-manipulation primitive', () => {});
  it.skip('S2a: ally HP<90% shield — missing ally-HP-threshold trigger and HP pool', () => {});
  it.skip('S2b: ally HP=max true damage ▲30.97% — missing ally-reaches-max-HP trigger and HP pool', () => {});
  it.skip('burst: 10.45% Max HP heal — missing heal-amount primitive / no HP pool', () => {});
});
