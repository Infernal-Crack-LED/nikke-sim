// Sustain board pins (src/ranks/sustain.ts + sustain-table.ts). The arithmetic
// is analytic over one sim run per unit — these pin the valuation rules
// (interval procs, duet profile, lifesteal windows, zero-lines), not game truth.
import { describe, expect, it } from 'vitest';
import { sustainFor, sustainRank, SUSTAIN_PROFILES } from '../../../src/ranks/sustain.js';
import { SUSTAIN_TABLE } from '../../../src/ranks/sustain-table.js';
import type { RanksCtx } from '../../../src/ranks/burstgen.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import type { OverrideFile } from '../../../src/skills/index.js';
import { data, mult, cubes, olLines, skillLevels, archetypeTags } from '../lib/harness.js';

const overrides: Record<string, OverrideFile | undefined> = {};
for (const s of Object.keys(data.characters)) overrides[s] = loadOverride(s);
const ctx: RanksCtx = {
  characters: data.characters as any,
  mult,
  deps: { overrides, skillLevels, cubes, olLines },
};

describe('sustain board', () => {
  it('nayuta: exactly 25% × 60 three-second procs = 1500% of her max HP', () => {
    const r = sustainFor('nayuta', ctx);
    expect(r.healPct).toBeCloseTo(1500, 6);
    expect(r.shieldPct).toBe(0);
    expect(r.lifestealPct).toBe(0);
    expect(r.totalHp).toBeCloseTo(15 * r.maxHp, 0);
  });

  it('prika (mint-duet profile): permanent Performance HoT, potency included', () => {
    const r = sustainFor('prika', ctx);
    expect(r.profile).toBe(SUSTAIN_PROFILES.prika.note);
    // ~165 ticks × 3.04 × 1.4992 × 5 — band-pinned, cast time is rotation-dependent
    expect(r.totalPct).toBeGreaterThan(3000);
    expect(r.totalPct).toBeLessThan(4500);
    expect(r.lifestealPct).toBe(0);
  });

  it('anchor-innocent-maid (mast profile): regen + burst heal, no shields', () => {
    const r = sustainFor('anchor-innocent-maid', ctx);
    expect(r.profile).toBe(SUSTAIN_PROFILES['anchor-innocent-maid'].note);
    expect(r.healPct).toBeGreaterThan(1500);
    expect(r.shieldPct).toBe(0);
  });

  it('helm: per-full-charge heals plus burst lifesteal on her own damage', () => {
    const r = sustainFor('helm', ctx);
    expect(r.healPct).toBeGreaterThan(150); // ~0.59 × 5 × ~100 FC shots
    expect(r.healPct).toBeLessThan(450);
    expect(r.lifestealPct).toBeGreaterThan(0);
  });

  it('cover-only units value exactly 0 at scope lock', () => {
    for (const slug of ['liter', 'cocoa', 'lily', 'zwei']) {
      expect(sustainFor(slug, ctx).totalPct, slug).toBe(0);
    }
  });

  it('ether is pure shield; blanc mixes shield + regen', () => {
    const ether = sustainFor('ether', ctx);
    expect(ether.healPct).toBe(0);
    expect(ether.shieldPct).toBeGreaterThan(0);
    const blanc = sustainFor('blanc', ctx);
    expect(blanc.shieldPct).toBeGreaterThan(0);
    expect(blanc.healPct).toBeGreaterThan(0);
  });

  it('table covers every healer/shield candidate (+nayuta)', () => {
    const HOOKS = new Set(['prika', 'mint', 'mana', 'pepper']);
    const cands = new Set([
      ...Object.keys(archetypeTags).filter(
        (s) => archetypeTags[s].includes('healer') || archetypeTags[s].includes('shield'),
      ),
      'nayuta',
    ]);
    for (const slug of cands)
      expect(slug in SUSTAIN_TABLE || HOOKS.has(slug), slug).toBe(true);
    expect(cands.size).toBe(50);
  });

  it('sustainRank sorts by absolute HP and numbers ranks', () => {
    const ranked = sustainRank(['nayuta', 'liter', 'blanc'], ctx);
    for (let i = 1; i < ranked.length; i++)
      expect(ranked[i].totalHp).toBeLessThanOrEqual(ranked[i - 1].totalHp);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
    expect(ranked.find((r) => r.slug === 'liter')!.totalHp).toBe(0);
  });
});
