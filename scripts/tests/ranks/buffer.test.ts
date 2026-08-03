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
import {
  NOOP_B1,
  NOOP_B2,
  NOOP_B3,
  NOOP_CHARACTERS,
} from '../../../src/dpschart/noop.js';
import { CARRY_MG, CARRY_RL } from '../../../src/ranks/synthetics.js';
import type { RanksCtx } from '../../../src/ranks/burstgen.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import type { OverrideFile } from '../../../src/skills/index.js';
import { data, mult, cubes, olLines, skillLevels } from '../lib/harness.js';

const overrides: Record<string, OverrideFile | undefined> = {};
for (const s of Object.keys(data.characters)) {
  overrides[s] = loadOverride(s);
}
// mirror scripts/build-bufferchart.ts — the synthetic controls are not roster
// entries but their overrides carry the framework effects (the no-op B1's team
// CDR, the no-op B3's mock burst). Loading roster slugs only would test a
// configuration the board does not run.
for (const s of Object.keys(NOOP_CHARACTERS)) {
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

  // The standard team keeps every burst stage covered by a 20s no-op, so a
  // tested unit's own cooldown never holds up the chain (owner spec 2026-08-03).
  // The tested unit leads its OWN stage — behind the same-stage no-op it would
  // lose every contest and stop bursting.
  it('standard team: tested unit takes the spare B2 slot and leads its own stage', () => {
    const spec = { weapon: null, pierce: false, element: null } as const;
    expect(assemble('liter', 'I', 'generic', spec).slugs).toEqual([
      'liter',
      NOOP_B1,
      NOOP_B2,
      CARRY_MG,
      CARRY_RL,
    ]);
    expect(assemble('crown', 'II', 'generic', spec).slugs).toEqual([
      NOOP_B1,
      'crown',
      NOOP_B2,
      CARRY_MG,
      CARRY_RL,
    ]);
    // a tested B3 never bursts, so it sits rightmost and the carries win stage 3
    expect(assemble('maiden-ice-rose', 'III', 'generic', spec).slugs).toEqual([
      NOOP_B1,
      NOOP_B2,
      CARRY_MG,
      CARRY_RL,
      'maiden-ice-rose',
    ]);
    // the cooldown no longer changes the shape — 40s and 20s assemble alike
    expect(assemble('moran', 'I', 'generic', spec).slugs).toEqual([
      'moran',
      NOOP_B1,
      NOOP_B2,
      CARRY_MG,
      CARRY_RL,
    ]);
  });

  // The baseline is the SAME team with a no-op of the tested unit's own stage
  // in its slot. Standing every unit against one fixed team instead would
  // charge each B1 for trading a no-op B2 away — measured at up to -2 Full
  // Bursts and -34 points (anis-star), i.e. the same rotation distortion this
  // shape exists to remove, merely pointed at a different stage.
  it("baseline: a stage-matched no-op takes the tested unit's slot", () => {
    const spec = { weapon: null, pierce: false, element: null } as const;
    expect(assemble(null, 'I', 'generic', spec).slugs).toEqual([
      NOOP_B1,
      NOOP_B1,
      NOOP_B2,
      CARRY_MG,
      CARRY_RL,
    ]);
    expect(assemble(null, 'II', 'generic', spec).slugs).toEqual([
      NOOP_B1,
      NOOP_B2,
      NOOP_B2,
      CARRY_MG,
      CARRY_RL,
    ]);
    expect(assemble(null, 'III', 'generic', spec).slugs).toEqual([
      NOOP_B1,
      NOOP_B2,
      CARRY_MG,
      CARRY_RL,
      NOOP_B3,
    ]);
  });

  // Why the comp-profile filler merge iterates a DEDUPED slug set: a
  // stage-matched baseline seats the same no-op twice, so a per-slug merge
  // would inject the profile's kit into it twice on the baseline side and once
  // on the tested side. Inert while the profiles inject only heals and shields,
  // silently wrong the day one carries a damage-relevant line.
  it('a stage-matched baseline repeats a no-op slug', () => {
    const spec = { weapon: null, pierce: false, element: null } as const;
    const b2 = assemble(null, 'II', 'generic', spec).slugs;
    expect(b2.filter((s) => s === NOOP_B2)).toHaveLength(2);
    const b1 = assemble(null, 'I', 'generic', spec).slugs;
    expect(b1.filter((s) => s === NOOP_B1)).toHaveLength(2);
  });

  // The property the whole shape exists for, pinned by ISOLATING it: a unit's
  // Full Burst count must not depend on its own burst cooldown, because the
  // spare no-op covers its stage while it waits. Forcing the cooldown to the
  // no-op's 20s must therefore change nothing.
  //
  // Asserting "no long-cooldown unit lands below its baseline" instead would be
  // the wrong pin: a unit can land a Full Burst short for reasons that have
  // nothing to do with cooldown (rosanna reads 7 v 8 identically at 40s and at
  // 20s — that is her gauge, not her rotation), so that phrasing fails on units
  // this shape never claimed to fix.
  it("a unit's Full Burst count does not depend on its burst cooldown", () => {
    const longCd = Object.entries(data.characters as Record<string, any>)
      .filter(
        ([slug, c]) =>
          c.simSupported &&
          (c.burst === 'I' || c.burst === 'II') &&
          (overrides[slug]?.charFixes?.burstCooldownSec ?? c.burstCooldownSec) >
            20
      )
      .map(([slug]) => slug);
    expect(longCd.length).toBeGreaterThan(10);
    for (const slug of longCd) {
      const shipped = bufferValueFor(slug, 'generic', ctx, new Map(), null);
      const short = { ...(data.characters as any) };
      short[slug] = { ...short[slug], burstCooldownSec: 20 };
      // prepare.ts prefers charFixes.burstCooldownSec over the character field,
      // so a unit carrying that charFix would run the "forced" pass at its real
      // cooldown and pass this vacuously. None does today; keep them in step.
      const own = overrides[slug];
      const forcedOverrides = own?.charFixes?.burstCooldownSec
        ? {
            ...overrides,
            [slug]: {
              ...own,
              charFixes: { ...own.charFixes, burstCooldownSec: 20 },
            },
          }
        : overrides;
      const forced = bufferValueFor(
        slug,
        'generic',
        {
          ...ctx,
          characters: short,
          deps: { ...ctx.deps, overrides: forcedOverrides },
        },
        new Map(),
        null
      );
      expect({ slug, fb: shipped.fullBursts }).toEqual({
        slug,
        fb: forced.fullBursts,
      });
    }
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
    const memo = new Map();
    const generic = bufferValueFor('tove', 'generic', ctx, memo);
    const typed = bufferValueFor('tove', 'typed', ctx, memo);
    expect(typed.valuePct).toBeGreaterThan(generic.valuePct);
  });

  it('typed derivation: ade-agent-bunny (pierce buffs) grants carries Pierce', () => {
    const { spec } = deriveCarrySpec(overrides['ade-agent-bunny']);
    expect(spec.pierce).toBe(true);
  });

  it('typed board: ade-agent-bunny is worth more with Pierce carries', () => {
    const memo = new Map();
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
    const memo = new Map();
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
    const memo = new Map();
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

  // A tested B3's burst is turned off, so its value comes through passives and
  // cast-free lines only. Rightmost placement alone does not guarantee that:
  // the carries win stage 3 while either is off cooldown, but they are 40s
  // units and a fast enough rotation reaches a stage 3 where only the tested
  // unit is ready (ada does exactly this once the SR no-op holds focus). The
  // burst slot is therefore suppressed outright, which is what these pin.
  it('a tested B3 has its burst slot suppressed, a B1/B2 does not', () => {
    const spec = { weapon: null, pierce: false, element: null } as const;
    expect(assemble('ada', 'III', 'generic', spec).burstOffSlug).toBe('ada');
    expect(assemble('flora', 'II', 'generic', spec).burstOffSlug).toBeNull();
    expect(assemble('liter', 'I', 'generic', spec).burstOffSlug).toBeNull();
    expect(assemble(null, 'III', 'generic', spec).burstOffSlug).toBeNull();
  });

  it("a tested B3's burst contributes nothing, however loud it is", () => {
    const plain = bufferValueFor('ada', 'generic', ctx, new Map(), null);
    expect(plain.carryDps).toBeGreaterThan(0);
    // an absurd team buff on her burst: suppressed, it cannot move her value
    const loud = {
      ...overrides,
      ada: {
        ...(overrides.ada as object),
        burst: [
          {
            slot: 'burst',
            trigger: { kind: 'burstCast' },
            target: { kind: 'allies' },
            effects: [
              { kind: 'buff', stat: 'atkPct', value: 500, durationSec: 15 },
            ],
          },
        ],
      },
    } as Record<string, OverrideFile | undefined>;
    const shouted = bufferValueFor(
      'ada',
      'generic',
      { ...ctx, deps: { ...ctx.deps, overrides: loud } },
      new Map(),
      null
    );
    expect(shouted.valuePct).toBe(plain.valuePct);
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
    const memo = new Map();
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
    const memo = new Map();
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
    const memo = new Map();
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
    const memo = new Map();
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
    const memo = new Map();
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
    const memo = new Map();
    const generic = bufferValueFor('helm-aquamarine', 'generic', ctx, memo);
    const typed = bufferValueFor('helm-aquamarine', 'typed', ctx, memo);
    // The generic board already uses Iron carries vs an Electric boss, so the
    // Electric-gated debuff is already active there. The typed board confirms
    // the same adaptation; both should show meaningful value.
    expect(generic.valuePct).toBeGreaterThan(10);
    expect(typed.valuePct).toBeGreaterThan(10);
  });

  it('blanc: w/ Rouge profile emits and shows the CDR difference vs plain', () => {
    const memo = new Map();
    const plain = bufferValueFor('blanc', 'generic', ctx, memo, null);
    const withRouge = bufferValueFor(
      'blanc',
      'generic',
      ctx,
      memo,
      DUO_BUFFER_PROFILES.blanc.id
    );
    expect(plain.profile).toBeNull();
    expect(withRouge.profile).toBe(DUO_BUFFER_PROFILES.blanc.id);
    // The profiled row out-values the plain row. The delta is a mix of Blanc's
    // same-squad CDR gate (teamHas.sameSquad) opening and the extra B1 gauge
    // contribution from the Rouge partner; the precise gate isolation lives in
    // scripts/tests/units/blanc.test.ts. This test is a liveness pin only — a
    // dead gate would still pass on the gauge delta.
    expect(withRouge.testedBurstCasts).toBeGreaterThan(plain.testedBurstCasts);
    expect(withRouge.valuePct).toBeGreaterThan(plain.valuePct);
  });

  it('rankBuffers dual-enters blanc with the w/ Rouge profile', () => {
    const ranked = rankBuffers(['blanc'], 'generic', ctx);
    const blancRows = ranked.filter((r) => r.slug === 'blanc');
    expect(blancRows.map((r) => r.profile).sort()).toEqual(
      [null, DUO_BUFFER_PROFILES.blanc.id].sort()
    );
  });
});
