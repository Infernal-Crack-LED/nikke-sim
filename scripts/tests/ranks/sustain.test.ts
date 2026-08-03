// Sustain board pins (src/ranks/sustain.ts + sustain-table.ts). The arithmetic
// is analytic over one sim run per unit — these pin the valuation rules
// (interval procs, duet profile, lifesteal windows, zero-lines), not game truth.
import { describe, expect, it } from 'vitest';
import { sustainFor, sustainRank } from '../../../src/ranks/sustain.js';
import { SUSTAIN_TABLE } from '../../../src/ranks/sustain-table.js';
import { NOOP_CHARACTERS } from '../../../src/dpschart/noop.js';
import type { RanksCtx } from '../../../src/ranks/burstgen.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import type { OverrideFile } from '../../../src/skills/index.js';
import {
  data,
  mult,
  cubes,
  olLines,
  skillLevels,
  archetypeTags,
} from '../lib/harness.js';

const overrides: Record<string, OverrideFile | undefined> = {};
for (const s of Object.keys(data.characters)) {
  overrides[s] = loadOverride(s);
}
// mirror scripts/build-sustain.ts — the synthetic controls are not roster
// entries but their overrides carry the framework effects (the no-op B1's
// team CDR, the no-op B3's mock burst). Loading roster slugs only would test
// a configuration the board does not run.
for (const s of Object.keys(NOOP_CHARACTERS)) {
  overrides[s] = loadOverride(s);
}
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
    expect(r.profile).toBe('with-mint');
    // ~165 ticks × 3.04 × 1.4992 × 5 — band-pinned, cast time is rotation-dependent
    expect(r.totalPct).toBeGreaterThan(3000);
    expect(r.totalPct).toBeLessThan(4500);
    expect(r.lifestealPct).toBe(0);
  });

  it('prika solo (plain run): only her own 25s Performance windows', () => {
    const r = sustainFor('prika', ctx, false);
    expect(r.profile).toBeNull();
    // a few casts × 25 ticks × 3.04 × 1.4992 × 5 — well below the duet (3988%);
    // upper bound wide because her cast count depends on the now-loaded no-op
    // B1's 7s team CDR (2026-08-03) as well as her own 20s cooldown
    expect(r.totalPct).toBeGreaterThan(200);
    expect(r.totalPct).toBeLessThan(3000);
  });

  it('anchor-innocent-maid: regen gate holds without the mast profile', () => {
    const plain = sustainFor('anchor-innocent-maid', ctx, false);
    expect(plain.profile).toBeNull();
    // plain: burst heal only (the FB-enter regen is requiresProfile)
    const profiled = sustainFor('anchor-innocent-maid', ctx, true);
    expect(profiled.profile).toBe('with-mast-rm');
    expect(profiled.healPct).toBeGreaterThan(plain.healPct);
    expect(profiled.healPct).toBeGreaterThan(1500);
    expect(profiled.shieldPct).toBe(0);
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

  it('anne-miracle-fairy: Fairy Dance lifesteal only; her burst heals nobody at scope lock', () => {
    const r = sustainFor('anne-miracle-fairy', ctx);
    // 38.61% burst restore is Attacker-only and she is a Supporter — the board
    // comp's no-op teammates are Supporters too, so no target qualifies.
    expect(r.healPct).toBe(0);
    expect(r.shieldPct).toBe(0);
    // 6.07% of her own damage, every-3-shots windows nearly covering the fight
    expect(r.lifestealPct).toBeGreaterThan(10);
    expect(r.lifestealPct).toBeLessThan(60);
  });

  it('table covers every healer/shield candidate (+nayuta)', () => {
    const HOOKS = new Set(['prika', 'mint', 'mana', 'pepper']);
    const cands = new Set([
      ...Object.keys(archetypeTags).filter(
        (s) =>
          archetypeTags[s].includes('healer') ||
          archetypeTags[s].includes('shield')
      ),
      'nayuta',
    ]);
    for (const slug of cands) {
      expect(slug in SUSTAIN_TABLE || HOOKS.has(slug), slug).toBe(true);
    }
    expect(cands.size).toBe(51);
  });

  it('sustainRank dual-enters profiled units with the flag', () => {
    const ranked = sustainRank(['nayuta', 'liter', 'prika'], ctx);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i].totalHp).toBeLessThanOrEqual(ranked[i - 1].totalHp);
    }
    expect(ranked.map((r) => r.rank)).toEqual(ranked.map((_, i) => i + 1));
    const prika = ranked.filter((r) => r.slug === 'prika');
    expect(prika.map((r) => r.profile).sort()).toEqual(
      [null, 'with-mint'].sort()
    );
    expect(ranked.find((r) => r.slug === 'liter')!.totalHp).toBe(0);
  });
});
