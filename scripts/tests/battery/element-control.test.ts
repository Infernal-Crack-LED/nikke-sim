// Pins the BOSS-ELEMENT CONTROL audit
// (`npx tsx scripts/battery/fb-count-matrix.ts --element-control`).
//
// Control C1 of the N3 third-arm pre-op packet (2026-08-17): a comp's declared boss element is
// PROSE on the comp record, not recording-verified, so any statistic the element could reach
// inherits an unverified premise. This instrument re-runs one comp under every element (plus
// forced-neutral) and diffs per-unit gauge and FB count. If gauge/rotation are IDENTICAL across
// all arms, the element cannot reach those statistics and the premise is not load-bearing.
// `totalDamage` is the POSITIVE control — it is expected to move (the element multiplier is a
// damage term).
//
// THE COMP: `N3 scarlet/liberalio iron (boss Iron)` — the comp that C1 was originally run on.
// Five units, one Iron-advantaged (scarlet-black-shadow), boss Iron.
//
// WHAT THIS GUARDS: a regression here means either (a) a new engine path that reads
// `cfg.bossElement` to influence gauge generation or burst rotation (a new element-dependent
// mechanic), or (b) the positive control broke (damage no longer varies by element — the
// element multiplier itself changed). Re-derive, don't re-pin.
import { describe, expect, it } from 'vitest';
import { auditElementControl } from '../../battery/fb-count-matrix.js';

describe('boss-element control (C1)', () => {
  const rep = auditElementControl('N3 scarlet/liberalio iron (boss Iron)');

  it('reports the correct comp structure', () => {
    expect(rep.comp).toBe('N3 scarlet/liberalio iron (boss Iron)');
    expect(rep.declaredElement).toBe('Iron');
    expect(rep.slugs).toEqual([
      'rouge',
      'trina',
      'scarlet-black-shadow',
      'liberalio',
      'soda-twinkling-bunny',
    ]);
    // Six arms: five elements + forced-neutral.
    expect(rep.arms).toHaveLength(6);
    expect(rep.arms.map((a) => a.element)).toEqual([
      'Electric',
      'Iron',
      'Wind',
      'Fire',
      'Water',
      null,
    ]);
  });

  it('gauge generation is IDENTICAL across all elements — the element cannot reach the bar', () => {
    expect(rep.gaugeIdenticalAcrossElements).toBe(true);
    expect(rep.maxGaugeDeltaVsDeclared).toBe(0);
    // Pin per-unit gauge values so a regression names the unit that moved.
    const iron = rep.arms.find((a) => a.element === 'Iron')!;
    expect(iron.gaugeGenerated.map((g) => Math.round(g * 10) / 10)).toEqual([
      121.8, 129.6, 212.5, 212.8, 268.2,
    ]);
  });

  it('FB count is IDENTICAL across all elements — the element cannot reach rotation', () => {
    expect(rep.fullBurstsIdenticalAcrossElements).toBe(true);
    for (const a of rep.arms) {
      expect(a.fullBursts).toBe(9);
    }
  });

  it('totalDamage MOVES across elements — the positive control', () => {
    expect(rep.damageMovesAcrossElements).toBe(true);
    // scarlet-black-shadow (slot 2) is Iron-advantaged: her damage under Iron should
    // exceed her damage under Electric (the specific element pair that diverges).
    const iron = rep.arms.find((a) => a.element === 'Iron')!;
    const elec = rep.arms.find((a) => a.element === 'Electric')!;
    expect(iron.totalDamage[2]).toBeGreaterThan(elec.totalDamage[2]);
    // Units without element advantage should be identical across neutral elements.
    // rouge (slot 0) has no element advantage — Electric and Wind should match.
    const wind = rep.arms.find((a) => a.element === 'Wind')!;
    expect(elec.totalDamage[0]).toBe(wind.totalDamage[0]);
  });

  it('REFUSES an unknown comp name', () => {
    expect(() => auditElementControl('no such comp')).toThrow(
      /no comp named "no such comp"/
    );
  });
});
