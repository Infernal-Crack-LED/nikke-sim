// Item 3a (roster-generator perf plan): the per-unit value table. Pure tests —
// `evalSets` is synthetic (a deterministic damage function of the team set), so
// no engine sims run. Semantics under test: every unit is priced by its
// MARGINAL damage against the reference core (B1/B2 by class-slot swap-in; B3
// by leave-one-out third-B3 add-in — chosen over plain solo value because solo
// is blind to support-B3s whose value is buffing the other B3s); a failed sim
// yields a neutral 0 value instead of poisoning the table; and the whole table
// is deterministic.
import { describe, expect, it, vi } from 'vitest';
import { buildValueTable } from '../../../src/teamvalue.js';

// Synthetic roster: 2 B1s, 3 B2s, 4 B3s with distinct solo values and
// cooldowns. Slugs are abstract (no real units — nothing here reads kit data).
const BURST: Record<string, string> = {
  b1fast: 'I',
  b1slow: 'I',
  b2short: 'II',
  b2mid: 'II',
  b2long: 'II',
  dpsTop: 'III',
  dpsMid: 'III',
  dpsLow: 'III',
  dpsBuff: 'III', // support-B3: tiny solo, big in-team bonus
};
const CD: Record<string, number> = {
  b1fast: 20,
  b1slow: 40,
  b2short: 20,
  b2mid: 40,
  b2long: 60,
  dpsTop: 40,
  dpsMid: 40,
  dpsLow: 40,
  dpsBuff: 40,
};
const SOLO: Record<string, number> = {
  b1fast: 5,
  b1slow: 9, // higher solo than b1fast — but >20s, so never the reference B1
  b2short: 3,
  b2mid: 4,
  b2long: 2,
  dpsTop: 1000,
  dpsMid: 800,
  dpsLow: 600,
  dpsBuff: 100,
};
// Deterministic synthetic team damage: solo sum + a unit-specific in-team
// bonus. Additive, so every unit's expected value is hand-computable as
// SOLO + BONUS relative to the reference member it displaces (0 for none).
const BONUS: Record<string, number> = {
  b1fast: 50,
  b1slow: 120,
  b2short: 80,
  b2mid: 30,
  b2long: 200,
  dpsBuff: 500,
};
const worth = (s: string): number => SOLO[s] + (BONUS[s] ?? 0);
const teamDamage = (set: string[]): number =>
  set.reduce((sum, s) => sum + worth(s), 0);
const evalSets = async (sets: string[][]) =>
  sets.map((set) => ({ teamDamage: teamDamage(set) }));

const input = () => ({
  pool: Object.keys(BURST),
  effBurst: (s: string) => BURST[s],
  cooldownOf: (s: string) => CD[s],
  soloValue: (s: string) => SOLO[s],
  evalSets,
});

describe('buildValueTable (item 3a)', () => {
  it('prices every unit at its marginal vs the reference core', async () => {
    const vt = await buildValueTable(input());
    // reference core: best ≤20s B1 (b1fast — b1slow's higher solo loses to the
    // cooldown gate), best B2 by solo (b2mid), top-2 B3 by solo.
    expect(vt.referenceCore).toEqual(['b1fast', 'b2mid', 'dpsTop', 'dpsMid']);
    // supports: swap-in delta vs the class reference (0 for the reference itself)
    expect(vt.values.get('b1fast')).toBe(0);
    expect(vt.values.get('b2mid')).toBe(0);
    expect(vt.values.get('b1slow')).toBe(worth('b1slow') - worth('b1fast'));
    expect(vt.values.get('b2long')).toBe(worth('b2long') - worth('b2mid'));
    // marginals rank by in-team worth, not by solo score
    expect(vt.values.get('b2long')!).toBeGreaterThan(vt.values.get('b2short')!);
    // B3s: leave-one-out add-in delta — in the additive model, exactly `worth`
    for (const s of ['dpsTop', 'dpsMid', 'dpsLow', 'dpsBuff'])
      {expect(vt.values.get(s)).toBe(worth(s));}
    // the support-B3 case the leave-one-out pricing exists for: dpsBuff's team
    // value (600) beats its solo value (100) — solo pricing would bury it
    expect(vt.values.get('dpsBuff')!).toBeGreaterThan(SOLO.dpsBuff);
    expect(vt.values.get('dpsBuff')).toBe(vt.values.get('dpsLow'));
  });

  it('is deterministic (same input → identical table)', async () => {
    const a = await buildValueTable(input());
    const b = await buildValueTable(input());
    expect([...a.values.entries()]).toEqual([...b.values.entries()]);
    expect(a.referenceCore).toEqual(b.referenceCore);
  });

  it('picks the reference supports by meta prior when supplied', async () => {
    // prior flips the B2 pick to b2long; the ≤20s gate still pins the B1
    const vt = await buildValueTable({
      ...input(),
      unitPrior: (s: string) => (s === 'b2long' ? 1 : s === 'b1slow' ? 1 : 0),
    });
    expect(vt.referenceCore).toEqual(['b1fast', 'b2long', 'dpsTop', 'dpsMid']);
  });

  it('a failed sim warns and prices at 0 instead of poisoning the table', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const vt = await buildValueTable({
        ...input(),
        evalSets: async (sets: string[][]) =>
          sets.map((set) =>
            set.includes('b2long') ? null : { teamDamage: teamDamage(set) }
          ),
      });
      expect(vt.values.get('b2long')).toBe(0);
      expect(warn).toHaveBeenCalledOnce();
      // the other units still price normally
      expect(vt.values.get('b1slow')).toBe(worth('b1slow') - worth('b1fast'));
      expect(vt.values.get('dpsBuff')).toBe(worth('dpsBuff'));
    } finally {
      warn.mockRestore();
    }
  });

  it('a support-free pool still prices B3s (empty-support measuring stick)', async () => {
    const pool = ['dpsTop', 'dpsMid', 'dpsLow', 'dpsBuff'];
    const vt = await buildValueTable({ ...input(), pool });
    expect([...vt.values.keys()].sort()).toEqual([...pool].sort());
    for (const s of pool) {expect(vt.values.get(s)).toBe(worth(s));}
    expect(vt.referenceCore).toEqual(['dpsTop', 'dpsMid']);
  });
});
