import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { controlComp, runComp, unitOf, withPatchedOverride } from '../lib/harness.js';

describe('sugar kit faithfulness', () => {
  // Fixture: B1/B2 + sugar B3 + helm fixed B3. Full bursts rotate, so skill2's
  // 'entering Full Burst' trigger fires on every FB, while sugar's burst buffs
  // fire only on sugar's own burst cast. Helm is non-SG, so the skill2 SG ammo
  // target set is exercised on self only.
  async function run(opts: { overrides?: Record<string, any> } = {}) {
    const events: SimEvent[] = [];
    const cfg = controlComp('sugar', true);
    const res = await runComp({ ...cfg, onEvent: (ev: SimEvent) => events.push(ev), ...opts });
    return { res, events };
  }

  function buffApplies(events: SimEvent[], stat: string, value: number, targetSlug = 'sugar') {
    return events.filter(ev =>
      ev.kind === 'buffApply' &&
      (ev as any).stat === stat &&
      Math.abs((ev as any).value - value) < 0.001 &&
      (ev as any).targetSlug === targetSlug
    );
  }

  it('baseline: sugar participates and full bursts occur', async () => {
    const { res, events } = await run();
    expect(unitOf(res, 'sugar').totalDamage).toBeGreaterThan(0);
    expect(events.some(e => e.kind === 'fullBurstStart')).toBe(true);
    expect(events.some(e => e.kind === 'burstCast')).toBe(true);
  });

  describe('skill1', () => {
    it.skip('cover-attacked proc gives self critDamage + reloadSpeed (unsupported trigger)', () => {
      // 'when cover is attacked' is not in the supported trigger set; no observed
      // cover-attack cadence is available to ground a test.
    });
  });

  describe('skill2', () => {
    it('self critRate buff applies on every Full Burst start', async () => {
      const { events } = await run();
      const fbFrames = events.filter(e => e.kind === 'fullBurstStart').map(e => (e as any).frame);
      const crits = buffApplies(events, 'critRatePct', 13.02, 'sugar');
      expect(crits.length).toBeGreaterThan(0);
      expect(crits.length).toBe(fbFrames.length);
      expect(crits.every(c => fbFrames.includes((c as any).frame))).toBe(true);

      const noCrit = await run({
        overrides: {
          sugar: withPatchedOverride('sugar', ov => {
            ov.skill2!.blocks = ov.skill2!.blocks.filter((b: any) =>
              !b.effects.some((eff: any) => eff.kind === 'buff' && eff.stat === 'critRatePct')
            );
          }),
        },
      });
      expect(buffApplies(noCrit.events, 'critRatePct', 13.02, 'sugar').length).toBe(0);
    });

    it('SG maxAmmo buff applies to sugar (self, SG) on every Full Burst start', async () => {
      const { events } = await run();
      const fbFrames = events.filter(e => e.kind === 'fullBurstStart').map(e => (e as any).frame);
      const ammos = buffApplies(events, 'maxAmmoPct', 83.8, 'sugar');
      expect(ammos.length).toBeGreaterThan(0);
      expect(ammos.length).toBe(fbFrames.length);
      expect(ammos.every(a => fbFrames.includes((a as any).frame))).toBe(true);

      // Inertness: non-SG allies must not receive this buff.
      const otherAmmo = events.filter(ev =>
        ev.kind === 'buffApply' &&
        (ev as any).stat === 'maxAmmoPct' &&
        (ev as any).targetSlug !== 'sugar'
      );
      expect(otherAmmo.length).toBe(0);

      const noAmmo = await run({
        overrides: {
          sugar: withPatchedOverride('sugar', ov => {
            ov.skill2!.blocks = ov.skill2!.blocks.filter((b: any) =>
              !b.effects.some((eff: any) => eff.kind === 'buff' && eff.stat === 'maxAmmoPct')
            );
          }),
        },
      });
      expect(buffApplies(noAmmo.events, 'maxAmmoPct', 83.8, 'sugar').length).toBe(0);
    });
  });

  describe('burst', () => {
    it('self attackSpeed and hitRate apply on sugar burst cast', async () => {
      const { res, events } = await run();
      const sugarIdx = (events.find(ev =>
        ev.kind === 'buffApply' &&
        (ev as any).targetSlug === 'sugar' &&
        (ev as any).casterIdx === (ev as any).targetIdx
      ) as any)?.casterIdx ?? -1;
      expect(sugarIdx).toBeGreaterThanOrEqual(0);

      const sugarBurstFrames = events
        .filter(ev => ev.kind === 'burstCast' && (ev as any).casterIdx === sugarIdx)
        .map(ev => (ev as any).frame);

      const as = buffApplies(events, 'attackSpeedPct', 66, 'sugar');
      const hr = buffApplies(events, 'hitRatePct', 33, 'sugar');
      expect(as.length).toBeGreaterThan(0);
      expect(hr.length).toBeGreaterThan(0);

      if (sugarBurstFrames.length > 0) {
        expect(as.length).toBe(sugarBurstFrames.length);
        expect(hr.length).toBe(sugarBurstFrames.length);
        expect(as.every(a => sugarBurstFrames.includes((a as any).frame))).toBe(true);
        expect(hr.every(h => sugarBurstFrames.includes((h as any).frame))).toBe(true);
      }

      // Inertness: other allies must not receive these self burst buffs.
      const otherAs = events.filter(ev =>
        ev.kind === 'buffApply' && (ev as any).stat === 'attackSpeedPct' && (ev as any).targetSlug !== 'sugar'
      );
      const otherHr = events.filter(ev =>
        ev.kind === 'buffApply' && (ev as any).stat === 'hitRatePct' && (ev as any).targetSlug !== 'sugar'
      );
      expect(otherAs.length).toBe(0);
      expect(otherHr.length).toBe(0);

      // Nearest-wrong: remove attackSpeed block -> no 66% self attackSpeed and lower damage.
      const noAs = await run({
        overrides: {
          sugar: withPatchedOverride('sugar', ov => {
            ov.burst!.blocks = ov.burst!.blocks.filter((b: any) =>
              !b.effects.some((eff: any) => eff.kind === 'buff' && eff.stat === 'attackSpeedPct')
            );
          }),
        },
      });
      expect(buffApplies(noAs.events, 'attackSpeedPct', 66, 'sugar').length).toBe(0);
      expect(unitOf(noAs.res, 'sugar').totalDamage).toBeLessThan(unitOf(res, 'sugar').totalDamage);

      // Nearest-wrong: remove hitRate block -> no 33% self hitRate.
      const noHr = await run({
        overrides: {
          sugar: withPatchedOverride('sugar', ov => {
            ov.burst!.blocks = ov.burst!.blocks.filter((b: any) =>
              !b.effects.some((eff: any) => eff.kind === 'buff' && eff.stat === 'hitRatePct')
            );
          }),
        },
      });
      expect(buffApplies(noHr.events, 'hitRatePct', 33, 'sugar').length).toBe(0);
    });
  });
});