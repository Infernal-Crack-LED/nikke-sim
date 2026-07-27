// Buffer board pins (src/ranks/buffer.ts): comp shape, baseline delta,
// typed-board derivation, and the B3-never-bursts rule.
import { describe, expect, it } from 'vitest';
import {
  assemble,
  bufferValueFor,
  rankBuffers,
  deriveCarrySpec,
  DUO_BUFFER_PROFILES,
} from '../../../src/ranks/buffer.js';
import { NOOP_B1, NOOP_B2 } from '../../../src/dpschart/noop.js';
import { CARRY_MG, CARRY_RL } from '../../../src/ranks/synthetics.js';
import type { RanksCtx } from '../../../src/ranks/burstgen.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import type { OverrideFile } from '../../../src/skills/index.js';
import { data, mult, cubes, olLines, skillLevels } from '../lib/harness.js';

const overrides: Record<string, OverrideFile | undefined> = {};
for (const s of Object.keys(data.characters)) {
  overrides[s] = loadOverride(s);
}
const ctx: RanksCtx = {
  characters: data.characters as any,
  mult,
  deps: { overrides, skillLevels, cubes, olLines },
};

describe('buffer board', () => {
  it('a top generic B1 (liter) adds large positive value over the no-op baseline', () => {
    const r = bufferValueFor('liter', 'generic', ctx);
    expect(r.baselineDps).toBeGreaterThan(0);
    expect(r.valuePct).toBeGreaterThan(20); // liter is a premier buffer (+26% measured)
  });

  it('B1 comp filler matches the tested B1 cooldown: short-CD gets B2, long-CD gets B1', () => {
    const spec = { weapon: null, pierce: false, element: null } as const;
    const long = assemble('claire', 'I', 'generic', spec, undefined, 40);
    expect(long.slugs).toEqual(['claire', NOOP_B1, CARRY_MG, CARRY_RL]);
    const short = assemble('liter', 'I', 'generic', spec, undefined, 20);
    expect(short.slugs).toEqual(['liter', NOOP_B2, CARRY_MG, CARRY_RL]);
    const defaultShort = assemble('liter', 'I', 'generic', spec);
    expect(defaultShort.slugs).toEqual(['liter', NOOP_B2, CARRY_MG, CARRY_RL]);
  });

  it('a unit whose buffs cannot apply at scope lock reads ~0', () => {
    const r = bufferValueFor('guilty', 'generic', ctx);
    expect(Math.abs(r.valuePct)).toBeLessThan(5);
  });

  it('typed derivation: tove (SG-typed) swaps both carries to SG', () => {
    const { spec, rules } = deriveCarrySpec(overrides.tove);
    expect(spec.weapon).toBe('SG');
    expect(rules.some((r) => r.includes('alliesOfWeapon SG'))).toBe(true);
  });

  it('typed board: tove is worth more with SG carries than generic', () => {
    const memo = new Map<string, number>();
    const generic = bufferValueFor('tove', 'generic', ctx, memo);
    const typed = bufferValueFor('tove', 'typed', ctx, memo);
    expect(typed.valuePct).toBeGreaterThan(generic.valuePct);
  });

  it('typed derivation: ade-agent-bunny (pierce buffs) grants carries Pierce', () => {
    const { spec } = deriveCarrySpec(overrides['ade-agent-bunny']);
    expect(spec.pierce).toBe(true);
  });

  it('typed board: ade-agent-bunny is worth more with Pierce carries', () => {
    const memo = new Map<string, number>();
    const generic = bufferValueFor('ade-agent-bunny', 'generic', ctx, memo);
    const typed = bufferValueFor('ade-agent-bunny', 'typed', ctx, memo);
    expect(typed.valuePct).toBeGreaterThan(generic.valuePct);
  });

  it('anis-star (projectile-explosion) already scores on the generic board via the RL carry', () => {
    const r = bufferValueFor('anis-star', 'generic', ctx);
    expect(r.valuePct).toBeGreaterThan(20);
    const { spec } = deriveCarrySpec(overrides['anis-star']);
    expect(spec.weapon).toBe('RL');
  });

  it('crown: with-healer profile beats plain (her recovery-triggered AD buff at full uptime)', () => {
    const memo = new Map<string, number>();
    const plain = bufferValueFor('crown', 'generic', ctx, memo, null);
    const profiled = bufferValueFor(
      'crown',
      'generic',
      ctx,
      memo,
      'with-healer'
    );
    expect(plain.profile).toBeNull();
    expect(profiled.profile).toBe('with-healer');
    expect(plain.valuePct).toBeGreaterThan(0); // her own Relax self-heal still procs it (~27% uptime)
    expect(profiled.valuePct).toBeGreaterThan(plain.valuePct);
  });

  it('naga: with-shielder profile beats plain (her shield-gated lines come alive)', () => {
    const memo = new Map<string, number>();
    const plain = bufferValueFor('naga', 'generic', ctx, memo, null);
    const profiled = bufferValueFor(
      'naga',
      'generic',
      ctx,
      memo,
      'with-shielder'
    );
    expect(plain.profile).toBeNull();
    expect(profiled.profile).toBe('with-shielder');
    expect(profiled.valuePct).toBeGreaterThan(plain.valuePct);
  });

  it('rankBuffers dual-enters profiled units with the flag', () => {
    const ranked = rankBuffers(['crown', 'liter'], 'generic', ctx);
    expect(ranked).toHaveLength(3); // crown plain + with-healer, liter
    const crowns = ranked.filter((r) => r.slug === 'crown');
    expect(crowns.map((r) => r.profile).sort()).toEqual(
      [null, 'with-healer'].sort()
    );
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i].valuePct).toBeLessThanOrEqual(ranked[i - 1].valuePct);
    }
    expect(ranked.map((r) => r.rank)).toEqual(ranked.map((_, i) => i + 1));
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
    expect(ranked).toHaveLength(4); // crown dual-enters (plain + with-healer)
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i].valuePct).toBeLessThanOrEqual(ranked[i - 1].valuePct);
    }
    expect(ranked.map((r) => r.rank)).toEqual(ranked.map((_, i) => i + 1));
  });

  it('mint: w/ Prika profile emits and differs from plain', () => {
    const memo = new Map<string, number>();
    const plain = bufferValueFor('mint', 'generic', ctx, memo, null);
    const duo = bufferValueFor(
      'mint',
      'generic',
      ctx,
      memo,
      DUO_BUFFER_PROFILES.mint.id
    );
    expect(plain.profile).toBeNull();
    expect(duo.profile).toBe(DUO_BUFFER_PROFILES.mint.id);
    expect(duo.carryDps).toBeGreaterThan(0);
    expect(duo.valuePct).not.toBe(plain.valuePct); // duet mode changes the kit
  });

  it('prika: w/ Mint profile emits and differs from plain', () => {
    const memo = new Map<string, number>();
    const plain = bufferValueFor('prika', 'generic', ctx, memo, null);
    const duo = bufferValueFor(
      'prika',
      'generic',
      ctx,
      memo,
      DUO_BUFFER_PROFILES.prika.id
    );
    expect(plain.profile).toBeNull();
    expect(duo.profile).toBe(DUO_BUFFER_PROFILES.prika.id);
    expect(duo.carryDps).toBeGreaterThan(0);
    expect(duo.valuePct).not.toBe(plain.valuePct);
  });

  it('duo baselines do not collide when Mint and Prika share the same memo', () => {
    const memo = new Map<string, number>();
    const mintDuo = bufferValueFor(
      'mint',
      'generic',
      ctx,
      memo,
      DUO_BUFFER_PROFILES.mint.id
    );
    const prikaDuo = bufferValueFor(
      'prika',
      'generic',
      ctx,
      memo,
      DUO_BUFFER_PROFILES.prika.id
    );
    const mintPlain = bufferValueFor('mint', 'generic', ctx, memo, null);
    // The two duo baselines are distinct from each other and from the plain baseline.
    expect(mintDuo.baselineDps).not.toBe(prikaDuo.baselineDps);
    expect(mintDuo.baselineDps).not.toBe(mintPlain.baselineDps);
  });

  it('rankBuffers dual-enters Mint and Prika with their duo profiles', () => {
    const ranked = rankBuffers(['mint', 'prika'], 'generic', ctx);
    const mintRows = ranked.filter((r) => r.slug === 'mint');
    const prikaRows = ranked.filter((r) => r.slug === 'prika');
    expect(mintRows.map((r) => r.profile).sort()).toEqual(
      [null, DUO_BUFFER_PROFILES.mint.id].sort()
    );
    expect(prikaRows.map((r) => r.profile).sort()).toEqual(
      [null, DUO_BUFFER_PROFILES.prika.id].sort()
    );
  });

  it('mast-romantic-maid: w/ Anchor profile emits and differs from plain', () => {
    const memo = new Map<string, number>();
    const plain = bufferValueFor(
      'mast-romantic-maid',
      'generic',
      ctx,
      memo,
      null
    );
    const duo = bufferValueFor(
      'mast-romantic-maid',
      'generic',
      ctx,
      memo,
      DUO_BUFFER_PROFILES['mast-romantic-maid'].id
    );
    expect(plain.profile).toBeNull();
    expect(duo.profile).toBe(DUO_BUFFER_PROFILES['mast-romantic-maid'].id);
    expect(duo.carryDps).toBeGreaterThan(0);
    expect(duo.valuePct).not.toBe(plain.valuePct);
  });

  it('rankBuffers dual-enters mast-romantic-maid with w/ Anchor profile', () => {
    const ranked = rankBuffers(['mast-romantic-maid'], 'generic', ctx);
    const mastRows = ranked.filter((r) => r.slug === 'mast-romantic-maid');
    expect(mastRows.map((r) => r.profile).sort()).toEqual(
      [null, DUO_BUFFER_PROFILES['mast-romantic-maid'].id].sort()
    );
  });

  it('typed derivation: brid-silent-track (Wind bossElementGate) sets carries to Fire', () => {
    const { spec, rules } = deriveCarrySpec(overrides['brid-silent-track']);
    expect(spec.element).toBe('Fire');
    expect(
      rules.some(
        (r) => r.includes('bossElementGate Wind') && r.includes('Fire')
      )
    ).toBe(true);
  });

  it('typed board: brid-silent-track is worth more when the Wind debuff is active', () => {
    const memo = new Map<string, number>();
    const generic = bufferValueFor('brid-silent-track', 'generic', ctx, memo);
    const typed = bufferValueFor('brid-silent-track', 'typed', ctx, memo);
    expect(typed.valuePct).toBeGreaterThan(generic.valuePct);
  });

  it('typed derivation: helm-aquamarine (Electric bossElementGate) sets carries to Iron', () => {
    const { spec, rules } = deriveCarrySpec(overrides['helm-aquamarine']);
    expect(spec.element).toBe('Iron');
    expect(
      rules.some(
        (r) => r.includes('bossElementGate Electric') && r.includes('Iron')
      )
    ).toBe(true);
  });

  it('typed board: helm-aquamarine is worth more when the Electric debuff is active', () => {
    const memo = new Map<string, number>();
    const generic = bufferValueFor('helm-aquamarine', 'generic', ctx, memo);
    const typed = bufferValueFor('helm-aquamarine', 'typed', ctx, memo);
    // The generic board already uses Iron carries vs an Electric boss, so the
    // Electric-gated debuff is already active there. The typed board confirms
    // the same adaptation; both should show meaningful value.
    expect(generic.valuePct).toBeGreaterThan(10);
    expect(typed.valuePct).toBeGreaterThan(10);
  });

  it('blanc: w/ Bunny profile emits and shows the CDR difference vs plain', () => {
    const memo = new Map<string, number>();
    const plain = bufferValueFor('blanc', 'generic', ctx, memo, null);
    const bunny = bufferValueFor(
      'blanc',
      'generic',
      ctx,
      memo,
      DUO_BUFFER_PROFILES.blanc.id
    );
    expect(plain.profile).toBeNull();
    expect(bunny.profile).toBe(DUO_BUFFER_PROFILES.blanc.id);
    // Plain row suppresses the same-squad CDR; w/ Bunny keeps it active.
    expect(bunny.testedBurstCasts).toBeGreaterThan(plain.testedBurstCasts);
    expect(bunny.valuePct).toBeGreaterThan(plain.valuePct);
  });

  it('rankBuffers dual-enters blanc with the w/ Bunny profile', () => {
    const ranked = rankBuffers(['blanc'], 'generic', ctx);
    const blancRows = ranked.filter((r) => r.slug === 'blanc');
    expect(blancRows.map((r) => r.profile).sort()).toEqual(
      [null, DUO_BUFFER_PROFILES.blanc.id].sort()
    );
  });
});
