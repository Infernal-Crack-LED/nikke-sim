// Unit test for diagnoseTeamShortfall (src/teamcalc.ts) — the sim-free
// diagnosis behind the Roster Generator's shortfall explainer. When topTeams
// returns fewer teams than requested, the web app runs this on the leftover
// pool to tell the user WHAT ran out (Burst I/II coverage, Burst III count,
// advantaged-element units, a required healer, raw unit count) instead of
// silently showing a short roster. Reasons must mirror the search's own
// legality rules (isLegal/stageCovered/canFormLegalTeam + the element and
// requiredAny constraints), so each case here builds a pool that fails exactly
// one rule and asserts that rule — and only that rule — is reported.
import { describe, expect, it } from 'vitest';
import {
  diagnoseTeamShortfall,
  type ShortfallReason,
} from '../../../src/teamcalc.js';
import { generatorPool } from '../lib/harness.js';

const { genChars, chars } = generatorPool();

const byBurstCd = (b: string, lo: number, hi: number) =>
  genChars
    .filter(
      (c) =>
        c.burst === b && c.burstCooldownSec > lo && c.burstCooldownSec <= hi
    )
    .map((c) => c.slug);
const nonFire = (slugs: string[]) =>
  slugs.filter((s) => chars[s].element !== 'Fire');

const B1_20 = byBurstCd('I', 0, 20);
const B1_40 = byBurstCd('I', 20, 40);
const B2_20 = byBurstCd('II', 0, 20);
const B2_40 = byBurstCd('II', 20, 40);
const B3 = genChars.filter((c) => c.burst === 'III').map((c) => c.slug);

const kinds = (rs: ShortfallReason[]) => rs.map((r) => r.kind).sort();
const diagnose = (
  pool: string[],
  opts?: Parameters<typeof diagnoseTeamShortfall>[2]
) => diagnoseTeamShortfall(pool, chars as any, opts);

describe('pool preconditions — the shapes under test exist', () => {
  // A roster change that breaks one of these is a recalibration event for this
  // file (pick different fixture units), not a diagnosis bug.
  it('holds enough casters of each shape, including non-Fire picks', () => {
    expect(nonFire(B1_20).length).toBeGreaterThanOrEqual(1);
    expect(nonFire(B1_40).length).toBeGreaterThanOrEqual(1);
    expect(B1_40.length).toBeGreaterThanOrEqual(2);
    expect(nonFire(B2_20).length).toBeGreaterThanOrEqual(2);
    expect(B2_40.length).toBeGreaterThanOrEqual(2);
    expect(nonFire(B3).length).toBeGreaterThanOrEqual(3);
    expect(genChars.some((c) => c.element === 'Fire')).toBe(true);
  });
});

describe('diagnoseTeamShortfall', () => {
  // All-non-Fire fixture picks, so the element cases control Fire exactly.
  const b1Short = nonFire(B1_20)[0];
  const b1Pair = nonFire(B1_40)[0];
  const b2Short = nonFire(B2_20).slice(0, 2);
  const b3 = nonFire(B3).slice(0, 3);
  const legalPool = [b1Short, b2Short[0], ...b3];

  it('reports nothing for a pool that can field a team', () => {
    expect(diagnose(legalPool)).toEqual([]);
  });

  it('reports pool-size under 5 units', () => {
    const rs = diagnose(legalPool.slice(0, 4));
    expect(rs).toContainEqual({ kind: 'pool-size', have: 4 });
  });

  it('reports a lone 40s B1 as an uncoverable stage I', () => {
    const rs = diagnose([b1Pair, ...b2Short, ...b3]);
    expect(rs).toEqual([{ kind: 'stage', stage: 'I', short: 0, pair: 1 }]);
  });

  it('reports a missing stage II with its caster counts', () => {
    const rs = diagnose([b1Short, b1Pair, ...b3]);
    expect(rs).toEqual([{ kind: 'stage', stage: 'II', short: 0, pair: 0 }]);
  });

  it('reports too few Burst III', () => {
    const rs = diagnose([b1Short, b1Pair, ...b2Short, b3[0]]);
    expect(rs).toEqual([{ kind: 'burst3', have: 1 }]);
  });

  it('reports the slot-fit case: both stages only coverable by 40s pairs', () => {
    // 2×40s B1 + 2×40s B2 + 2 B3 covers both stages and still can't make a
    // 5-unit team (2+2 casters + 2 B3 = 6) — the case a per-stage check misses.
    const rs = diagnose([B1_40[0], B1_40[1], B2_40[0], B2_40[1], b3[0], b3[1]]);
    expect(rs).toEqual([{ kind: 'fit' }]);
  });

  it('reports a missing advantaged-element unit only when required', () => {
    const el = 'Fire' as const;
    const rs = diagnose(legalPool, { requireElement: el });
    expect(rs).toEqual([{ kind: 'element', element: el, have: 0 }]);
    const fire = genChars.find((c) => c.element === el)!.slug;
    expect(
      diagnose([...legalPool, fire], { requireElement: el }).filter(
        (r) => r.kind === 'element'
      )
    ).toEqual([]);
  });

  it('reports an unsatisfiable requiredAny constraint (healer)', () => {
    const req = [{ label: 'healer', anyOf: ['some-healer-not-in-pool'] }];
    expect(diagnose(legalPool, { requiredAny: req })).toEqual([
      { kind: 'required-any', label: 'healer' },
    ]);
    const satisfied = [{ label: 'healer', anyOf: [legalPool[0]] }];
    expect(diagnose(legalPool, { requiredAny: satisfied })).toEqual([]);
  });

  it('reports every independent gap at once', () => {
    // Lone 40s B1 AND no advantaged element: both reasons surface together —
    // the explainer lists everything the pool ran out of, not just the first.
    const rs = diagnose([b1Pair, ...b2Short, ...b3], {
      requireElement: 'Fire',
    });
    expect(kinds(rs)).toEqual(['element', 'stage']);
  });
});
