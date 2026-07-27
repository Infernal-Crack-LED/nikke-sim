// Burst-CDR board pins (src/ranks/burstcdr.ts) — the table arithmetic, the
// cadence-derived shot-triggered rows, and tag/table lockstep.
import { describe, expect, it } from 'vitest';
import {
  CDR_TABLE,
  FB_CYCLE_SEC,
  FIGHT_SEC,
  cdrFor,
  rankCdr,
} from '../../../src/ranks/burstcdr.js';
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
const ctx: RanksCtx = {
  characters: data.characters as any,
  mult,
  deps: { overrides, skillLevels, cubes, olLines },
};

const FB_PER_FIGHT = FIGHT_SEC / FB_CYCLE_SEC; // 9

describe('burst-CDR board', () => {
  it('table and tag are in lockstep (every tagged unit has a row and vice versa)', () => {
    const tagged = Object.keys(archetypeTags).filter((s) =>
      archetypeTags[s].includes('burst-cdr')
    );
    expect(Object.keys(CDR_TABLE).sort()).toEqual(tagged.sort());
    expect(tagged).toHaveLength(15);
  });

  it('liter/volume: escalating ladder is cumulative and averaged over 180s', () => {
    for (const slug of ['liter', 'volume']) {
      const e = cdrFor(slug, ctx);
      // per-FB ramp: c1, c1+c2, c1+c2+c3
      expect(e.ramp).toEqual([2.34, 5.04, 8.21]);
      // averaged over 9 FBs: (2.34 + 5.04 + 7*8.21) / 9
      const avg = (2.34 + 5.04 + 8.21 * (FB_PER_FIGHT - 2)) / FB_PER_FIGHT;
      expect(e.cdrPer20s).toBeCloseTo(avg, 6);
    }
  });

  it('dolla/helm-aquamarine: escalating ladder is cumulative and averaged over 180s', () => {
    for (const slug of ['dolla', 'helm-aquamarine']) {
      const e = cdrFor(slug, ctx);
      expect(e.ramp).toEqual([1.82, 4.02, 6.62]);
      const avg = (1.82 + 4.02 + 6.62 * (FB_PER_FIGHT - 2)) / FB_PER_FIGHT;
      expect(e.cdrPer20s).toBeCloseTo(avg, 6);
    }
  });

  it('flat 7.48-per-FB group (LM/anis-star/moran/rrh/soline) is 7.48 per 20s', () => {
    for (const slug of [
      'little-mermaid',
      'anis-star',
      'moran',
      'rapi-red-hood',
      'soline-frost-ticket',
    ]) {
      expect(cdrFor(slug, ctx).cdrPer20s).toBeCloseTo(7.48, 6);
    }
    // gates are noted, not deducted
    expect(cdrFor('anis-star', ctx).condition).toContain('Burst 1');
    expect(cdrFor('arcana', ctx).condition).toContain('Wheel of Fortune');
  });

  it('shot-triggered rows use sim cadence (dorothy ~4.7s/20s)', () => {
    const dorothy = cdrFor('dorothy', ctx);
    expect(dorothy.cdrPer20s).toBeGreaterThan(4.0);
    expect(dorothy.cdrPer20s).toBeLessThan(6.0);
  });

  it('d-killer-wife/rouge out-rank flat 7.48 units on their SR cadence', () => {
    expect(cdrFor('d-killer-wife', ctx).cdrPer20s).toBeGreaterThan(7.48);
    expect(cdrFor('rouge', ctx).cdrPer20s).toBeGreaterThan(7.48);
  });

  it('rankCdr sorts descending and numbers ranks', () => {
    const ranked = rankCdr(Object.keys(CDR_TABLE), ctx);
    expect(ranked).toHaveLength(15);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i].cdrPer20s).toBeLessThanOrEqual(ranked[i - 1].cdrPer20s);
    }
    expect(ranked.map((e) => e.rank)).toEqual(ranked.map((_, i) => i + 1));
  });

  it('self-only CDR is a note column, never ranked value', () => {
    const milk = cdrFor('milk', ctx);
    expect(milk.selfCdr).toBe(20);
    expect(milk.cdrPer20s).toBeLessThan(7.48); // only her 2.83/10-FC line counts
  });
});
