// Buffer board pins (src/ranks/buffer.ts): comp shape, baseline delta,
// typed-board derivation, and the B3-never-bursts rule.
import { describe, expect, it } from 'vitest';
import {
  bufferValueFor,
  rankBuffers,
  deriveCarrySpec,
} from '../../../src/ranks/buffer.js';
import type { RanksCtx } from '../../../src/ranks/burstgen.js';
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

describe('buffer board', () => {
  it('a top generic B1 (liter) adds large positive value over the no-op baseline', () => {
    const r = bufferValueFor('liter', 'generic', ctx);
    expect(r.baselineDps).toBeGreaterThan(0);
    expect(r.value).toBeGreaterThan(0.2 * r.baselineDps); // liter is a premier buffer (+26% measured)
  });

  it('a unit whose buffs cannot apply at scope lock reads ~0', () => {
    const r = bufferValueFor('guilty', 'generic', ctx);
    expect(Math.abs(r.value)).toBeLessThan(0.05 * r.baselineDps);
  });

  it('typed derivation: tove (SG-typed) swaps both carries to SG', () => {
    const { spec, rules } = deriveCarrySpec(overrides['tove']);
    expect(spec.weapon).toBe('SG');
    expect(rules.some((r) => r.includes('alliesOfWeapon SG'))).toBe(true);
  });

  it('typed board: tove is worth more with SG carries than generic', () => {
    const memo = new Map<string, number>();
    const generic = bufferValueFor('tove', 'generic', ctx, memo);
    const typed = bufferValueFor('tove', 'typed', ctx, memo);
    expect(typed.value).toBeGreaterThan(generic.value);
  });

  it('typed derivation: ade-agent-bunny (pierce buffs) grants carries Pierce', () => {
    const { spec } = deriveCarrySpec(overrides['ade-agent-bunny']);
    expect(spec.pierce).toBe(true);
  });

  it('typed board: ade-agent-bunny is worth more with Pierce carries', () => {
    const memo = new Map<string, number>();
    const generic = bufferValueFor('ade-agent-bunny', 'generic', ctx, memo);
    const typed = bufferValueFor('ade-agent-bunny', 'typed', ctx, memo);
    expect(typed.value).toBeGreaterThan(generic.value);
  });

  it('anis-star (projectile-explosion) already scores on the generic board via the RL carry', () => {
    const r = bufferValueFor('anis-star', 'generic', ctx);
    expect(r.value).toBeGreaterThan(0.2 * r.baselineDps);
    const { spec } = deriveCarrySpec(overrides['anis-star']);
    expect(spec.weapon).toBe('RL');
  });

  it('a tested B3 buffer never bursts (rightmost rule)', () => {
    // ada is a sim-supported B3 buffer: placed rightmost, the two carries must
    // take every stage-3 cast.
    const r = bufferValueFor('ada', 'generic', ctx);
    expect(r.testedBurstCasts).toBe(0);
    expect(r.carryDps).toBeGreaterThan(0);
  });

  it('rankBuffers sorts descending and numbers ranks', () => {
    const ranked = rankBuffers(['liter', 'crown', 'guilty'], 'generic', ctx);
    for (let i = 1; i < ranked.length; i++)
      expect(ranked[i].value).toBeLessThanOrEqual(ranked[i - 1].value);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
  });
});
