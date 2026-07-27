// Item 3b (roster-generator perf plan): the sim-free proxy enumeration. Pure
// tests over synthetic pools — no engine sims. Under test: every returned team
// is a legal enumerated shape (1×B1 + 1×B2 + 3×B3 or 1×B1 + 2×B2 + 2×B3, five
// distinct units) honoring the burst-cooldown coverage rule; locks (mustInclude)
// and the element requirement hold on every candidate; infeasible locks return
// [] (the caller's fallback path); ranking follows the additive value core with
// the meta/synergy/spread multipliers on top.
import { describe, expect, it } from 'vitest';
import { enumerateTeams, type EnumerateInput } from '../../../src/teamvalue.js';

// Synthetic pools. Cooldowns: b1x/b1y short; b2slow is 40s (only legal beside a
// second ≤40s B2); b2dead is 60s (only legal beside a ≤20s B2).
const CD: Record<string, number> = {
  b1x: 20,
  b1y: 20,
  b1slow: 40,
  b2a: 20,
  b2b: 20,
  b2slow: 40,
  b2dead: 60,
  d1: 40,
  d2: 40,
  d3: 40,
  d4: 40,
  d5: 40,
};
const VALUE: Record<string, number> = {
  b1x: 10,
  b1y: 5,
  b1slow: 100, // best value B1 — but >20s, unfieldable in these shapes
  b2a: 20,
  b2b: 15,
  b2slow: 30,
  b2dead: 25,
  d1: 1000,
  d2: 900,
  d3: 800,
  d4: 700,
  d5: 600,
};
const base = (): EnumerateInput => ({
  poolB1: ['b1x', 'b1y', 'b1slow'],
  poolB2: ['b2a', 'b2b', 'b2slow', 'b2dead'],
  poolB3: ['d1', 'd2', 'd3', 'd4', 'd5'],
  cooldownOf: (s) => CD[s],
  value: (s) => VALUE[s],
});

const b2sOf = (team: string[]) => team.filter((s) => s.startsWith('b2'));
const b1sOf = (team: string[]) => team.filter((s) => s.startsWith('b1'));

describe('enumerateTeams (item 3b)', () => {
  it('returns only legal shapes with covered burst stages, sorted by proxy desc', () => {
    const out = enumerateTeams(base());
    expect(out.length).toBeGreaterThan(0);
    for (const { team } of out) {
      expect(new Set(team).size).toBe(5);
      const b1 = b1sOf(team);
      const b2 = b2sOf(team);
      expect(b1).toHaveLength(1);
      expect(CD[b1[0]]).toBeLessThanOrEqual(20); // lone B1 must cover solo
      expect(b2.length === 1 || b2.length === 2).toBe(true);
      // stage-II coverage: one ≤20s caster, or an alternating ≤40s pair
      const short = b2.filter((s) => CD[s] <= 20).length;
      const pair = b2.filter((s) => CD[s] <= 40).length;
      expect(short >= 1 || pair >= 2).toBe(true);
    }
    const proxies = out.map((c) => c.proxy);
    expect(proxies).toEqual([...proxies].sort((a, b) => b - a));
    // b1slow (>20s) can never appear despite its top value
    expect(out.some(({ team }) => team.includes('b1slow'))).toBe(false);
    // b2dead (60s) only ever appears beside a ≤20s B2 partner
    for (const { team } of out) {
      const b2 = b2sOf(team);
      if (team.includes('b2dead'))
        {expect(b2.some((s) => CD[s] <= 20)).toBe(true);}
    }
  });

  it('ranks the additive-value argmax first (no multipliers)', () => {
    const out = enumerateTeams(base());
    // best: b1x + b2a + top-3 B3s
    expect([...out[0].team].sort()).toEqual(['b1x', 'b2a', 'd1', 'd2', 'd3']);
    expect(out[0].proxy).toBe(10 + 20 + 1000 + 900 + 800);
  });

  it('honors mustInclude on every candidate and returns [] for infeasible locks', () => {
    const locked = enumerateTeams({ ...base(), mustInclude: ['b1y', 'd5'] });
    expect(locked.length).toBeGreaterThan(0);
    for (const { team } of locked) {
      expect(team).toContain('b1y');
      expect(team).toContain('d5');
    }
    // two B1s fit no shape (double-B1 is deliberately not enumerated)
    expect(enumerateTeams({ ...base(), mustInclude: ['b1x', 'b1y'] })).toEqual(
      []
    );
    // a lock outside every pool is infeasible
    expect(enumerateTeams({ ...base(), mustInclude: ['ghost'] })).toEqual([]);
    // a locked >20s B1 is filtered from the only B1 slot → infeasible
    expect(enumerateTeams({ ...base(), mustInclude: ['b1slow'] })).toEqual([]);
  });

  it('requires an advantaged unit on every team when the element rule is active', () => {
    const out = enumerateTeams({ ...base(), advantaged: (s) => s === 'd4' });
    expect(out.length).toBeGreaterThan(0);
    for (const { team } of out) {expect(team).toContain('d4');}
  });

  it('applies the synergy multiplier (a satisfied pair outranks equal raw value)', () => {
    // d1/d2/d3 tie in value; only d3 carries the buffer tag matching b2a's dealer
    const out = enumerateTeams({
      ...base(),
      value: (s) => (s.startsWith('d') ? 1000 : VALUE[s]),
      synergy: {
        tags: { b2a: ['pierce'], d3: ['pierce-buffer'] },
        pairs: [['pierce', 'pierce-buffer']],
        weight: 0.08,
      },
    });
    expect(out[0].team).toContain('b2a');
    expect(out[0].team).toContain('d3');
    // multiplier is exactly (1 + 0.08×1) on the additive core
    expect(out[0].proxy).toBeCloseTo((10 + 20 + 3000) * 1.08, 6);
  });

  it('applies the meta multiplier (capped mean unit prior)', () => {
    const out = enumerateTeams({
      ...base(),
      unitPrior: (s) => (s === 'd5' ? 1 : 0),
      metaWeight: 1,
    });
    const withD5 = out.find(({ team }) => team.includes('d5'))!;
    const core = withD5.team.reduce((sum, s) => sum + VALUE[s], 0);
    expect(withD5.proxy).toBeCloseTo(core * (1 + 1 / 5), 6);
  });

  it('spread shaping pulls the pick toward the target meta sum', () => {
    // unit d5 carries meta weight 5; target 5 rewards exactly one carrier
    const spread = {
      unitScore: (s: string) => (s === 'd5' ? 5 : 0),
      target: 5,
      sigma: 3,
    };
    const out = enumerateTeams({ ...base(), spread });
    // closeness at Σ=5 is 1, at Σ=0 it is exp(-25/18) ≈ 0.25 — d5's low value
    // (600 vs 800 for d3) is more than repaid by hitting the target
    expect(out[0].team).toContain('d5');
  });

  it('together constraint: group members appear all-or-none, never a strict subset', () => {
    const out = enumerateTeams({
      ...base(),
      constraints: { together: [['b2a', 'd4']] },
    });
    expect(out.length).toBeGreaterThan(0);
    let both = 0;
    for (const { team } of out) {
      const n = (team.includes('b2a') ? 1 : 0) + (team.includes('d4') ? 1 : 0);
      expect(n === 0 || n === 2).toBe(true);
      if (n === 2) {both++;}
    }
    expect(both).toBeGreaterThan(0); // the pair is still reachable, just atomic
  });

  it('companions constraint: fielding the unit requires a satisfier on the team', () => {
    const out = enumerateTeams({
      ...base(),
      constraints: { companions: [{ unit: 'd1', anyOf: ['b2b', 'd5'] }] },
    });
    expect(out.length).toBeGreaterThan(0);
    let fielded = 0;
    for (const { team } of out) {
      if (!team.includes('d1')) {continue;}
      fielded++;
      expect(team.includes('b2b') || team.includes('d5')).toBe(true);
    }
    expect(fielded).toBeGreaterThan(0); // d1 (top value) still gets fielded
    // the unit can never satisfy its own dependency
    const self = enumerateTeams({
      ...base(),
      constraints: { companions: [{ unit: 'd1', anyOf: ['d1'] }] },
    });
    expect(self.some(({ team }) => team.includes('d1'))).toBe(false);
  });

  it('bounds the candidate list at topK', () => {
    const out = enumerateTeams({ ...base(), topK: 7 });
    expect(out).toHaveLength(7);
    const all = enumerateTeams({ ...base(), topK: 10_000 });
    // the 7 kept are exactly the global best 7
    expect(out.map((c) => c.proxy)).toEqual(
      all.slice(0, 7).map((c) => c.proxy)
    );
  });
});
