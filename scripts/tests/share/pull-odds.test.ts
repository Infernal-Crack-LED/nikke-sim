// Unit tests for src/infographics/core/pullData.ts — the pull-odds math the
// /pull page, the Pull Calculator card and the bot's /pull command all read.
//
// The assertions are CLOSED FORMS derived independently of the implementation:
// the module accumulates a binomial tail term by term, while these compare
// against the direct expressions (1-(1-p)^n, n*p, the explicit C(n,k) products)
// and against exact hand-computable cases. A shared derivation would only pin
// the code against itself.
import { describe, expect, it } from 'vitest';
import {
  MAX_LIMIT_BREAK_COPIES,
  NIKKE_BANNER_PILGRIM_RATE,
  NIKKE_BANNER_SSR_RATE,
  NIKKE_SSR_RATE,
  PULL_POOLS,
  binomExactly,
  expectedCount,
  probAtLeast,
  probAtLeastOne,
  pullsForChance,
  summarizePull,
} from '../../../src/infographics/core/pullData.js';
import { buildPullCard } from '../../../src/infographics/core/pullCard.js';

const CLOSE = 12; // decimal places — these are exact formulas, not estimates

describe('probAtLeastOne', () => {
  it('matches 1-(1-p)^n', () => {
    for (const n of [1, 10, 30, 200, 1000]) {
      for (const p of [NIKKE_SSR_RATE, NIKKE_BANNER_SSR_RATE, 0.5]) {
        expect(probAtLeastOne(n, p)).toBeCloseTo(1 - (1 - p) ** n, CLOSE);
      }
    }
  });

  it('is 0 for a non-positive or non-finite pull count', () => {
    for (const n of [0, -5, NaN, Infinity]) {
      expect(probAtLeastOne(n, 0.5)).toBe(0);
    }
  });

  it('is exactly a coin flip for one pull at 50%', () => {
    expect(probAtLeastOne(1, 0.5)).toBe(0.5);
  });
});

describe('expectedCount', () => {
  it('is n*p', () => {
    expect(expectedCount(200, NIKKE_BANNER_SSR_RATE)).toBeCloseTo(4, CLOSE);
    expect(expectedCount(100, NIKKE_SSR_RATE)).toBeCloseTo(4, CLOSE);
    expect(expectedCount(300, NIKKE_BANNER_PILGRIM_RATE)).toBeCloseTo(3, CLOSE);
  });

  it('floors a fractional pull count and clamps a negative one to 0', () => {
    expect(expectedCount(10.9, 0.5)).toBeCloseTo(5, CLOSE);
    expect(expectedCount(-3, 0.5)).toBe(0);
  });
});

describe('binomExactly', () => {
  it('matches the explicit C(n,k)*p^k*(1-p)^(n-k) for small hand cases', () => {
    // C(4,2) = 6, so 6 * 0.5^2 * 0.5^2 = 0.375
    expect(binomExactly(4, 2, 0.5)).toBeCloseTo(0.375, CLOSE);
    // k = 0 is just (1-p)^n
    expect(binomExactly(10, 0, 0.04)).toBeCloseTo(0.96 ** 10, CLOSE);
    // k = n is p^n
    expect(binomExactly(5, 5, 0.02)).toBeCloseTo(0.02 ** 5, CLOSE);
  });

  it('is a proper distribution — the terms over all k sum to 1', () => {
    for (const [n, p] of [
      [8, 0.04],
      [20, 0.25],
      [13, 0.7],
    ] as const) {
      let sum = 0;
      for (let k = 0; k <= n; k++) {
        sum += binomExactly(n, k, p);
      }
      expect(sum).toBeCloseTo(1, CLOSE);
    }
  });

  it('is 0 for impossible copy counts', () => {
    expect(binomExactly(5, 6, 0.5)).toBe(0);
    expect(binomExactly(5, -1, 0.5)).toBe(0);
  });
});

describe('probAtLeast', () => {
  it('agrees with probAtLeastOne at k=1 (the two paths must not drift)', () => {
    for (const n of [1, 10, 200, 5000]) {
      expect(probAtLeast(n, 1, NIKKE_BANNER_SSR_RATE)).toBeCloseTo(
        probAtLeastOne(n, NIKKE_BANNER_SSR_RATE),
        CLOSE
      );
    }
  });

  it('is certain for k<=0 and monotonically decreasing in k', () => {
    expect(probAtLeast(50, 0, 0.02)).toBe(1);
    let prev = 1;
    for (let k = 1; k <= 6; k++) {
      const p = probAtLeast(200, k, NIKKE_BANNER_SSR_RATE);
      expect(p).toBeLessThan(prev);
      prev = p;
    }
  });

  it('matches an exact hand case: at least 2 heads in 4 flips = 11/16', () => {
    expect(probAtLeast(4, 2, 0.5)).toBeCloseTo(11 / 16, CLOSE);
  });
});

describe('pullsForChance — the inverse direction', () => {
  it('returns the smallest n whose at-least-one odds clear the target', () => {
    for (const rate of [NIKKE_SSR_RATE, NIKKE_BANNER_SSR_RATE]) {
      for (const target of [0.5, 0.75, 0.9, 0.99]) {
        const n = pullsForChance(target, rate)!;
        expect(probAtLeastOne(n, rate)).toBeGreaterThanOrEqual(target);
        expect(probAtLeastOne(n - 1, rate)).toBeLessThan(target);
      }
    }
  });

  it('is 35 pulls for a coin-flip shot at a 2% rate-up', () => {
    // ln(0.5)/ln(0.98) = 34.31 -> 35
    expect(pullsForChance(0.5, NIKKE_BANNER_SSR_RATE)).toBe(35);
  });

  it('has no answer for an unreachable target', () => {
    expect(pullsForChance(1, 0.02)).toBeNull();
    expect(pullsForChance(0.5, 0)).toBeNull();
  });
});

describe('summarizePull', () => {
  it('reports every pool, up to MLB copies, in card row order', () => {
    const s = summarizePull(200);
    expect(s.pulls).toBe(200);
    expect(s.maxCopies).toBe(MAX_LIMIT_BREAK_COPIES);
    expect(s.pools.map((p) => p.key)).toEqual(PULL_POOLS.map((p) => p.key));
    for (const pool of s.pools) {
      expect(pool.atLeast).toHaveLength(MAX_LIMIT_BREAK_COPIES);
      expect(pool.expected).toBeCloseTo(200 * pool.rate, CLOSE);
      expect(pool.atLeast[0]).toBeCloseTo(1 - (1 - pool.rate) ** 200, CLOSE);
    }
  });

  it('treats a negative or non-finite count as zero pulls, not a crash', () => {
    for (const n of [-1, NaN, Infinity]) {
      const s = summarizePull(n);
      expect(s.pulls).toBe(0);
      expect(s.pools.every((p) => p.expected === 0)).toBe(true);
      expect(s.pools.every((p) => p.atLeast.every((v) => v === 0))).toBe(true);
    }
  });
});

describe('buildPullCard — the copy the card draws', () => {
  it('labels the last copy column MLB and the rest as cumulative counts', () => {
    expect(buildPullCard(200).copyHeaders).toEqual(['1+', '2+', '3+', 'MLB']);
  });

  it('carries one grid row per pool and one tile per pool', () => {
    const card = buildPullCard(200);
    expect(card.rows).toHaveLength(PULL_POOLS.length);
    expect(card.tiles).toHaveLength(PULL_POOLS.length);
    expect(card.rows.map((r) => r.label)).toEqual(
      PULL_POOLS.map((p) => p.label)
    );
  });

  it('singularizes a one-pull subtitle', () => {
    expect(buildPullCard(1).subtitle).toBe('1 pull on Advanced Recruit');
    expect(buildPullCard(2).subtitle).toBe('2 pulls on Advanced Recruit');
  });

  // A whole-percent format would print '100%' for a tail that never actually
  // reaches certainty; the card says '>99.9%' instead.
  it('never claims certainty', () => {
    const odds = buildPullCard(100000).rows.flatMap((r) => r.odds);
    expect(odds).not.toContain('100.0%');
    expect(odds.every((o) => o === '>99.9%')).toBe(true);
  });
});
