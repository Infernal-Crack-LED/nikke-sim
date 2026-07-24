// Item 3b fallback path: the proxy enumeration only builds the two standard
// shapes (1×B1 + 1×B2 + 3×B3, 1×B1 + 2×B2 + 2×B3), so a lock set outside them —
// a double-B1 team is legal (isLegal allows 2×I with the deficits covered) but
// never enumerated — must fall back to the legacy role-fill seed instead of
// returning null. Real-pool integration test (real sims, one bestTeam call).
import { describe, expect, it } from 'vitest';
import { makeCalc } from '../../../src/teamcalc.js';
import { scopeLockCfg } from '../../lib/scope-lock.js';
import { deps, distinct5, generatorPool, mult, rotationLegal } from '../lib/harness.js';

const { genChars, chars, overrides } = generatorPool();
const calc = makeCalc({
  chars: chars as any,
  mult,
  deps: { overrides, ...deps },
  cfg: scopeLockCfg([], null) as any,
  loadout: {},
});

// two ≤20s Burst-I units — a legal double-B1 lock (each covers stage I alone)
const b1 = genChars
  .filter((c) => c.burst === 'I' && c.burstCooldownSec <= 20)
  .map((c) => c.slug);

describe('bestTeam falls back past the enumeration for out-of-shape locks', () => {
  it('builds a legal team around a locked double-B1 (never enumerated)', async () => {
    expect(b1.length).toBeGreaterThanOrEqual(2);
    const locks = [b1[0], b1[1]];
    const team = await calc.bestTeam({ mustInclude: locks });
    expect(team, `double-B1 lock ${locks.join('+')} built nothing`).not.toBeNull();
    expect(distinct5(team!.slugs)).toBe(true);
    for (const s of locks) expect(team!.slugs).toContain(s);
    expect(rotationLegal(chars as any, team!.slugs)).toBe(true);
  });
});
