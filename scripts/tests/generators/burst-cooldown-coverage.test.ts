// Regression test for the Roster Generator's burst-cooldown legality rule.
//
// A burst stage (B1/B2) must be castable every Full Burst cycle (~20s cadence).
// A ≤20s caster covers every cycle alone; a 40s caster only every other cycle,
// so a team needs EITHER one ≤20s caster OR a pair of ≤40s casters alternating
// for each of B1 and B2. A lone 40s (or 60s) B1/B2 leaves the rotation gapped and
// is illegal — the generator must refuse to emit such a team (src/teamcalc.ts
// stageCovered/isLegal). This generalizes the old Red-Hood-only "40s cooldown
// binds the rotation" exclusion to every B1/B2. It only READS the engine.
import { describe, expect, it } from 'vitest';
import { makeCalc } from '../../../src/teamcalc.js';
import { scopeLockCfg } from '../../lib/scope-lock.js';
import { deps, effBurst, generatorPool, mult, rotationLegal } from '../lib/harness.js';

const { genChars, chars, overrides } = generatorPool();

// Build a calc whose eligible pool is ONLY the given slugs (everything else
// blocked) — mirrors how the web app blocks non-eligible units.
const calcForPool = (keep: Set<string>) =>
  makeCalc({
    chars: chars as any,
    mult,
    deps: { overrides, ...deps },
    cfg: scopeLockCfg([], null) as any,
    loadout: {},
    blocked: Object.keys(chars).filter((s) => !keep.has(s)),
    poolB3: 16,
    rounds: 1,
  });

const legal = (slugs: string[]) => rotationLegal(chars, slugs);

const byBurstCd = (b: string, lo: number, hi: number) =>
  genChars
    .filter((c) => c.burst === b && c.burstCooldownSec > lo && c.burstCooldownSec <= hi)
    .map((c) => c.slug);

const B1_20 = byBurstCd('I', 0, 20);
const B1_40 = byBurstCd('I', 20, 40);
const B2_20 = byBurstCd('II', 0, 20);
const B2_40 = byBurstCd('II', 20, 40);
const B3 = genChars.filter((c) => c.burst === 'III').map((c) => c.slug);
const AMPLE_B3 = B3.slice(0, 16);

describe('pool preconditions — the cooldown shapes under test exist', () => {
  it('has ≥1 20s B1 and ≥2 40s B1', () => {
    expect(B1_20.length, 'no ≤20s Burst I in the pool').toBeGreaterThanOrEqual(1);
    expect(B1_40.length, 'fewer than two 21-40s Burst I in the pool').toBeGreaterThanOrEqual(2);
  });
  it('has ≥1 20s B2 and ≥2 40s B2', () => {
    expect(B2_20.length, 'no ≤20s Burst II in the pool').toBeGreaterThanOrEqual(1);
    expect(B2_40.length, 'fewer than two 21-40s Burst II in the pool').toBeGreaterThanOrEqual(2);
  });
});

describe('B1 cooldown coverage', () => {
  it('refuses to build on a lone 40s B1', () => {
    const keep = new Set([B1_40[0], ...B2_20.slice(0, 8), ...AMPLE_B3]);
    expect(calcForPool(keep).topTeams(1), `lone 40s B1 (${B1_40[0]}) built a team`).toHaveLength(0);
  });

  it('covers the stage with a single 20s B1', () => {
    const keep = new Set([B1_20[0], ...B2_20.slice(0, 8), ...AMPLE_B3]);
    const top = calcForPool(keep).topTeams(1);
    expect(top, `single 20s B1 (${B1_20[0]}) built no team`).toHaveLength(1);
    expect(legal(top[0].slugs)).toBe(true);
    expect(top[0].slugs).toContain(B1_20[0]);
  });

  it('covers the stage with two alternating 40s B1', () => {
    const keep = new Set([B1_40[0], B1_40[1], ...B2_20.slice(0, 8), ...AMPLE_B3]);
    const top = calcForPool(keep).topTeams(1);
    expect(top, `two 40s B1 (${B1_40[0]}+${B1_40[1]}) built no team`).toHaveLength(1);
    expect(legal(top[0].slugs)).toBe(true);
    expect(top[0].slugs).toContain(B1_40[0]);
    expect(top[0].slugs).toContain(B1_40[1]);
  });
});

describe('B2 cooldown coverage', () => {
  it('refuses to build on a lone 40s B2', () => {
    const keep = new Set([B2_40[0], ...B1_20.slice(0, 8), ...AMPLE_B3]);
    expect(calcForPool(keep).topTeams(1), `lone 40s B2 (${B2_40[0]}) built a team`).toHaveLength(0);
  });

  it('covers the stage with a single 20s B2', () => {
    const keep = new Set([B2_20[0], ...B1_20.slice(0, 8), ...AMPLE_B3]);
    const top = calcForPool(keep).topTeams(1);
    expect(top, `single 20s B2 (${B2_20[0]}) built no team`).toHaveLength(1);
    expect(legal(top[0].slugs)).toBe(true);
    expect(top[0].slugs).toContain(B2_20[0]);
  });

  it('covers the stage with two alternating 40s B2', () => {
    const keep = new Set([B2_40[0], B2_40[1], ...B1_20.slice(0, 8), ...AMPLE_B3]);
    const top = calcForPool(keep).topTeams(1);
    expect(top, `two 40s B2 (${B2_40[0]}+${B2_40[1]}) built no team`).toHaveLength(1);
    expect(legal(top[0].slugs)).toBe(true);
    expect(top[0].slugs).toContain(B2_40[0]);
    expect(top[0].slugs).toContain(B2_40[1]);
  });
});

describe('broad invariant: no emitted team has a gapped B1/B2 rotation', () => {
  const full = calcForPool(new Set(Object.keys(chars)));
  const top = full.topTeams(5);

  it('builds from the full pool with every team sustaining B1 and B2 every cycle', () => {
    expect(top.length, 'full pool built nothing').toBeGreaterThanOrEqual(1);
    const bad = top.filter((t) => !legal(t.slugs));
    expect(
      bad.map((t) => t.slugs.join(',')),
      'team(s) with a gapped rotation',
    ).toEqual([]);
  });

  it('explores double-support shapes (B1+B2+B2 / B1+B1+B2 + 2×B3)', () => {
    // These are common optimal teams — the search must explore them, not only I:1 II:1 III:3.
    const dbl = top.filter(
      (t) =>
        t.slugs.filter((s) => effBurst(chars, s) === 'II').length >= 2 ||
        t.slugs.filter((s) => effBurst(chars, s) === 'I').length >= 2,
    ).length;
    expect(dbl, 'topTeams(5) explored no double-support shape').toBeGreaterThanOrEqual(1);
  });

  it('builds the double-support shape deterministically from a locked pair', () => {
    const t2 = full.bestTeam({ mustInclude: [B2_20[0], B2_20[1]] });
    expect(t2, `locked 2×B2 (${B2_20[0]}+${B2_20[1]}) built nothing`).not.toBeNull();
    expect(legal(t2!.slugs)).toBe(true);
    expect(t2!.slugs).toContain(B2_20[0]);
    expect(t2!.slugs).toContain(B2_20[1]);
    expect(t2!.slugs.filter((s) => effBurst(chars, s) === 'II').length).toBeGreaterThanOrEqual(2);

    const t1 = full.bestTeam({ mustInclude: [B1_20[0], B1_20[1]] });
    expect(t1, `locked 2×B1 (${B1_20[0]}+${B1_20[1]}) built nothing`).not.toBeNull();
    expect(legal(t1!.slugs)).toBe(true);
    expect(t1!.slugs).toContain(B1_20[0]);
    expect(t1!.slugs).toContain(B1_20[1]);
    expect(t1!.slugs.filter((s) => effBurst(chars, s) === 'I').length).toBeGreaterThanOrEqual(2);
  });
});
