// Burst-generation board pins (src/ranks/burstgen.ts).
//
// The board runs each sim-supported unit in a standard no-op team with bursting
// enabled and ranks by gauge contribution per second of active gauge-building time.
// These tests pin the board's CONVENTIONS (profiles, unfocused measurement,
// leftmost placement, sort), not measured game truths. Runs are deterministic
// expected-value.
import { describe, expect, it } from 'vitest';
import {
  burstGenFor,
  rankBurstGen,
  BURSTGEN_PROFILES,
  type RanksCtx,
} from '../../../src/ranks/burstgen.js';
import {
  NOOP_B1,
  NOOP_B2,
  NOOP_B3,
  NOOP_B3_RL,
} from '../../../src/dpschart/noop.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import type { OverrideFile } from '../../../src/skills/index.js';
import { data, mult, cubes, olLines, skillLevels } from '../lib/harness.js';

const overrides: Record<string, OverrideFile | undefined> = {};
for (const s of Object.keys(data.characters)) {
  overrides[s] = loadOverride(s);
}
// Synthetic no-op controls are not roster entries, but their overrides carry
// framework effects (no-op B1 team burst CDR, no-op B3 mock burst damage).
for (const s of ['noop-b1-ar', 'noop-b3-mg']) {
  overrides[s] = loadOverride(s);
}
const ctx: RanksCtx = {
  characters: data.characters as any,
  mult,
  deps: { overrides, skillLevels, cubes, olLines },
};

describe('burst-gen board', () => {
  it('every spot-checked unit generates gauge and completes full bursts', () => {
    for (const slug of [
      'liter',
      'crown',
      'modernia',
      'snow-white-heavy-arms',
      'mana',
    ]) {
      const r = burstGenFor(slug, ctx, false);
      expect(r.gaugeTotal, slug).toBeGreaterThan(0);
      expect(r.gaugePerSec, slug).toBeGreaterThan(0);
      expect(r.fullBursts, slug).toBeGreaterThan(0);
    }
  });

  it('little-mermaid profile has higher gauge-per-sec than her base team', () => {
    const base = burstGenFor('little-mermaid', ctx, false);
    const profile = burstGenFor('little-mermaid', ctx, true);
    expect(profile.gaugePerSec).toBeGreaterThan(base.gaugePerSec * 1.2);
  });

  it('cinderella-crystal-wave profile has higher gauge-per-sec than her base team', () => {
    const base = burstGenFor('cinderella-crystal-wave', ctx, false);
    const profile = burstGenFor('cinderella-crystal-wave', ctx, true);
    expect(profile.gaugePerSec).toBeGreaterThan(base.gaugePerSec * 1.1);
  });

  it("helm's flat per-shot kit gen puts her ahead of an equal-cadence SR", () => {
    // Same class/cadence (SR modal), helm adds +14.31% flat per trigger (datamined
    // flatPerTrigger) — she must out-generate snow-white-heavy-arms by a wide margin.
    const helm = burstGenFor('helm', ctx, false);
    const swha = burstGenFor('snow-white-heavy-arms', ctx, false);
    expect(helm.gaugePerSec / swha.gaugePerSec).toBeGreaterThan(1.3);
  });

  it('rankBurstGen ranks descending by gaugePerSec and dual-enters profiled units', () => {
    const ranked = rankBurstGen(['liter', 'little-mermaid', 'modernia'], ctx);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i].gaugePerSec).toBeLessThanOrEqual(
        ranked[i - 1].gaugePerSec
      );
    }
    expect(ranked.map((r) => r.rank)).toEqual(ranked.map((_, i) => i + 1));
    // little-mermaid appears twice: plain (null) and with-2mg — the frontend
    // differentiates on the profile flag.
    const lm = ranked.filter((r) => r.slug === 'little-mermaid');
    expect(lm.map((r) => r.profile).sort()).toEqual([null, 'with-2mg'].sort());
    const plain = lm.find((r) => r.profile === null)!;
    const profiled = lm.find((r) => r.profile === 'with-2mg')!;
    expect(profiled.gaugePerSec).toBeGreaterThan(plain.gaugePerSec);
    expect(plain.barsPerFight).toBeCloseTo(plain.gaugeTotal / 100, 10);
  });

  it('profiles cover exactly the two team-ammo-scaling kits', () => {
    expect(Object.keys(BURSTGEN_PROFILES).sort()).toEqual([
      'cinderella-crystal-wave',
      'little-mermaid',
    ]);
    expect(BURSTGEN_PROFILES['little-mermaid'].id).toBe('with-2mg');
    expect(BURSTGEN_PROFILES['cinderella-crystal-wave'].id).toBe('with-mg');
  });

  it('no-op control overrides are loaded so framework effects apply (B1 CDR, B3 mock burst)', () => {
    expect(
      ctx.deps.overrides['noop-b1-ar']?.burst?.[0]?.effects?.[0]?.kind
    ).toBe('burstCdr');
    expect(
      ctx.deps.overrides['noop-b3-mg']?.burst?.[0]?.effects?.[0]?.kind
    ).toBe('buff');
  });

  describe('no-op controls contribute expected weapon-class gauge', () => {
    // These no-op units have empty kits and weapon-class-modal stats. Their
    // gaugePerSec should land in the ballpark of their weapon's expected solo
    // generation rate while the bar is building. Charge weapons are measured
    // UNFOCUSED (×1.0) — the board parks camera focus on a non-charge teammate,
    // so the ×2.5 focus bonus is not applied here.
    it('B1 AR no-op generates at an AR-typical rate', () => {
      const r = burstGenFor(NOOP_B1, ctx, false);
      expect(r.gaugePerSec).toBeGreaterThan(3);
      expect(r.gaugePerSec).toBeLessThan(7);
      expect(r.fullBursts).toBeGreaterThan(0);
    });

    it('B2 SR no-op (unfocused) generates at an unfocused-SR-typical rate', () => {
      const r = burstGenFor(NOOP_B2, ctx, false);
      expect(r.gaugePerSec).toBeGreaterThan(2);
      expect(r.gaugePerSec).toBeLessThan(6);
      expect(r.fullBursts).toBeGreaterThan(0);
    });

    it('B3 MG no-op generates at an MG-typical rate', () => {
      const r = burstGenFor(NOOP_B3, ctx, false);
      expect(r.gaugePerSec).toBeGreaterThan(1);
      expect(r.gaugePerSec).toBeLessThan(6);
      expect(r.fullBursts).toBeGreaterThan(0);
    });

    it('B3 RL no-op (unfocused) generates at an unfocused-RL-typical rate', () => {
      const r = burstGenFor(NOOP_B3_RL, ctx, false);
      expect(r.gaugePerSec).toBeGreaterThan(1);
      expect(r.gaugePerSec).toBeLessThan(4);
      expect(r.fullBursts).toBeGreaterThan(0);
    });
  });
});
