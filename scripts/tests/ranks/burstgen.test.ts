// Burst-generation board pins (src/ranks/burstgen.ts).
//
// The board reads the engine's additive UnitResult.gaugeGenerated counter under
// cfg.disableBursts — these tests pin the board's CONVENTIONS (profiles, focus,
// sort), not measured game truths. Runs are deterministic expected-value.
import { describe, expect, it } from 'vitest';
import {
  burstGenFor,
  burstGenWithPartners,
  rankBurstGen,
  BURSTGEN_PROFILES,
  type RanksCtx,
} from '../../../src/ranks/burstgen.js';
import { NOOP_MG } from '../../../src/ranks/synthetics.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import type { OverrideFile } from '../../../src/skills/index.js';
import { data, mult, cubes, olLines, skillLevels } from '../lib/harness.js';

const overrides: Record<string, OverrideFile | undefined> = {};
for (const s of Object.keys(data.characters)) overrides[s] = loadOverride(s);
const ctx: RanksCtx = {
  characters: data.characters as any,
  mult,
  deps: { overrides, skillLevels, cubes, olLines },
};

describe('burst-gen board', () => {
  it('every spot-checked unit generates gauge (counter is live)', () => {
    for (const slug of ['liter', 'crown', 'modernia', 'snow-white-heavy-arms', 'mana']) {
      expect(burstGenFor(slug, ctx), slug).toBeGreaterThan(0);
    }
  });

  it('little-mermaid +2MG profile roughly doubles her solo total (team-ammo fills)', () => {
    const solo = burstGenWithPartners('little-mermaid', [], ctx);
    const profile = burstGenWithPartners('little-mermaid', [NOOP_MG, NOOP_MG], ctx);
    expect(profile / solo).toBeGreaterThan(1.8);
    expect(profile / solo).toBeLessThan(2.6);
  });

  it('cinderella-crystal-wave +1MG profile beats her solo total', () => {
    const solo = burstGenWithPartners('cinderella-crystal-wave', [], ctx);
    const profile = burstGenWithPartners('cinderella-crystal-wave', [NOOP_MG], ctx);
    expect(profile).toBeGreaterThan(solo * 1.2);
  });

  it("helm's flat per-shot kit gen puts her ahead of an equal-cadence SR", () => {
    // Same class/cadence (SR modal), helm adds +14.31% flat per trigger (datamined
    // flatPerTrigger) — she must out-generate snow-white-heavy-arms by a wide margin.
    const helm = burstGenFor('helm', ctx);
    const swha = burstGenFor('snow-white-heavy-arms', ctx);
    expect(helm / swha).toBeGreaterThan(1.3);
  });

  it('rankBurstGen ranks descending and dual-enters profiled units', () => {
    const ranked = rankBurstGen(['liter', 'little-mermaid', 'modernia'], ctx);
    for (let i = 1; i < ranked.length; i++)
      expect(ranked[i].gaugeTotal).toBeLessThanOrEqual(ranked[i - 1].gaugeTotal);
    expect(ranked.map((r) => r.rank)).toEqual(ranked.map((_, i) => i + 1));
    // little-mermaid appears twice: plain (null) and with-2mg — the frontend
    // differentiates on the profile flag (owner ruling 2026-07-26)
    const lm = ranked.filter((r) => r.slug === 'little-mermaid');
    expect(lm.map((r) => r.profile).sort()).toEqual([null, 'with-2mg'].sort());
    const plain = lm.find((r) => r.profile === null)!;
    const profiled = lm.find((r) => r.profile === 'with-2mg')!;
    expect(profiled.gaugeTotal).toBeGreaterThan(plain.gaugeTotal);
    expect(plain.barsPerFight).toBeCloseTo(plain.gaugeTotal / 100, 10);
  });

  it('profiles cover exactly the two team-ammo-scaling kits', () => {
    expect(Object.keys(BURSTGEN_PROFILES).sort()).toEqual([
      'cinderella-crystal-wave',
      'little-mermaid',
    ]);
    expect(BURSTGEN_PROFILES['little-mermaid'].id).toBe('with-2mg');
    expect(BURSTGEN_PROFILES['cinderella-crystal-wave'].id).toBe('with-1mg');
  });
});
