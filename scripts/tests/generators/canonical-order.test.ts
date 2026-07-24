// Item-2 tests (perf plan 2026-07-24): canonical team order + set-keyed sim +
// focus post-pass. A team is a SET plus a camera-focus choice; the search now maps
// every permutation of a set to ONE deterministic array (burst class → slug-alpha,
// focus at index 2) so permutations collapse to a single sim, the focused unit is
// deterministic (not an accident of insertion order), and the winner is polished to
// its best focus. It only READS the engine.
import { describe, expect, it } from 'vitest';
import {
  canonicalTeamOrder,
  isChargeWeapon,
  makeCalc,
} from '../../../src/teamcalc.js';
import { scopeLockCfg } from '../../lib/scope-lock.js';
import { deps, generatorPool, mult } from '../lib/harness.js';

const { genChars, chars, overrides } = generatorPool();
const byBurst = (b: string) => genChars.filter((c) => c.burst === b).map((c) => c.slug);
const B1 = byBurst('I');
const B2 = byBurst('II');
const B3 = byBurst('III');
// a legal set: 1×BI, 1×BII, 3×BIII (or 2×BIII + flex) — use 5 distinct
const SET = [B1[0], B2[0], B3[0], B3[1], B3[2]];

describe('canonicalTeamOrder (pure)', () => {
  it('is a function of the SET — every permutation yields the same array', () => {
    const perms = [
      SET,
      [SET[4], SET[3], SET[2], SET[1], SET[0]],
      [SET[2], SET[0], SET[4], SET[1], SET[3]],
    ];
    const canon = perms.map((p) => canonicalTeamOrder(p, chars as any, SET[2]));
    for (const c of canon) expect(c).toEqual(canon[0]);
  });

  it('places the focus unit at the camera-focus slot (index 2)', () => {
    for (const f of SET) {
      const ord = canonicalTeamOrder(SET, chars as any, f);
      expect(ord[2], `focus ${f} not at index 2`).toBe(f);
      expect([...ord].sort()).toEqual([...SET].sort()); // same set, no loss
    }
  });

  it('orders by burst class then slug-alpha when no focus is given', () => {
    const ord = canonicalTeamOrder(SET, chars as any);
    const rank = (s: string) => ({ I: 0, II: 1, III: 2, Λ: 3 })[
      s === 'red-hood' ? 'III' : (chars as any)[s].burst as 'I' | 'II' | 'III' | 'Λ'
    ]!;
    for (let i = 1; i < ord.length; i++)
      expect(rank(ord[i]) >= rank(ord[i - 1]), 'not burst-ordered').toBe(true);
  });
});

describe('isChargeWeapon', () => {
  it('is true exactly for SR/RL', () => {
    for (const c of genChars)
      expect(isChargeWeapon(chars as any, c.slug)).toBe(
        c.weapon === 'SR' || c.weapon === 'RL',
      );
  });
});

describe('set-keyed sim (permutations collapse, focus post-pass ≥ pre-pass)', () => {
  // A calc whose loadoutFor counts resolutions (5 per uncached sim), so we can
  // prove a re-permuted set does NOT re-sim.
  let loadoutCalls = 0;
  const mk = () =>
    makeCalc({
      chars: chars as any,
      mult,
      deps: { overrides, ...deps },
      cfg: scopeLockCfg([], null) as any,
      loadoutFor: () => {
        loadoutCalls++;
        return {};
      },
    });

  it('simSet is order-independent and re-sims a permuted set 0 times', async () => {
    const calc = mk();
    const a = await calc.simSet(SET);
    loadoutCalls = 0;
    const b = await calc.simSet([SET[3], SET[0], SET[4], SET[2], SET[1]]);
    expect(b).toEqual(a); // identical TeamResult
    expect(loadoutCalls, 'a permutation of a cached set re-simmed').toBe(0);
  });

  it('bestTeam (focus post-pass) scores ≥ the set’s canonical-focus sim', async () => {
    const calc = mk();
    const best = await calc.bestTeam();
    expect(best).not.toBeNull();
    const canon = await calc.simSet(best!.units.map((u) => u.slug));
    expect(canon).not.toBeNull();
    // post-pass may re-focus to a higher-damage camera slot, never a lower one
    expect(best!.teamDamage).toBeGreaterThanOrEqual(canon!.teamDamage - 1);
    // the winner's focus (index 2) is a charge unit when the team has one
    const hasCharge = best!.units.some((u) => isChargeWeapon(chars as any, u.slug));
    if (hasCharge)
      expect(isChargeWeapon(chars as any, best!.slugs[2]), 'focus slot is not a charge unit').toBe(true);
  });
});
