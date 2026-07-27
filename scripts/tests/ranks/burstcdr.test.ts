// Burst-CDR board pins (src/ranks/burstcdr.ts) — the table arithmetic, the
// cadence-derived shot-triggered rows, and tag/table lockstep.
import { describe, expect, it } from 'vitest';
import {
  CDR_TABLE,
  FB_CYCLE_SEC,
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

const PROCS = 40 / FB_CYCLE_SEC;

describe('burst-CDR board', () => {
  it('table and tag are in lockstep (every tagged unit has a row and vice versa)', () => {
    const tagged = Object.keys(archetypeTags).filter((s) =>
      archetypeTags[s].includes('burst-cdr')
    );
    expect(Object.keys(CDR_TABLE).sort()).toEqual(tagged.sort());
    expect(tagged).toHaveLength(15);
  });

  it('liter/volume: escalating ladder sums to 8.21 per FB at cap', () => {
    for (const slug of ['liter', 'volume']) {
      const e = cdrFor(slug, ctx);
      expect(e.cdrPer40s).toBeCloseTo(8.21 * PROCS, 6);
      expect(e.ramp).toEqual([2.34 * PROCS, 5.04 * PROCS, 8.21 * PROCS]);
    }
  });

  it('flat 7.48-per-FB group (LM/anis-star/moran/rrh/soline) ranks at 14.96', () => {
    for (const slug of [
      'little-mermaid',
      'anis-star',
      'moran',
      'rapi-red-hood',
      'soline-frost-ticket',
    ]) {
      expect(cdrFor(slug, ctx).cdrPer40s).toBeCloseTo(7.48 * PROCS, 6);
    }
    // gates are noted, not deducted
    expect(cdrFor('anis-star', ctx).condition).toContain('Burst 1');
    expect(cdrFor('arcana', ctx).condition).toContain('Wheel of Fortune');
  });

  it('shot-triggered rows use sim cadence (dorothy ~6 mags/40s → ~9.4s)', () => {
    const dorothy = cdrFor('dorothy', ctx);
    expect(dorothy.cdrPer40s).toBeGreaterThan(8.5);
    expect(dorothy.cdrPer40s).toBeLessThan(10.5);
  });

  it('d-killer-wife/rouge out-rank flat 7.48 units on their SR cadence', () => {
    expect(cdrFor('d-killer-wife', ctx).cdrPer40s).toBeGreaterThan(
      7.48 * PROCS
    );
    expect(cdrFor('rouge', ctx).cdrPer40s).toBeGreaterThan(7.48 * PROCS);
  });

  it('rankCdr sorts descending and numbers ranks', () => {
    const ranked = rankCdr(Object.keys(CDR_TABLE), ctx);
    expect(ranked).toHaveLength(15);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i].cdrPer40s).toBeLessThanOrEqual(ranked[i - 1].cdrPer40s);
    }
    expect(ranked.map((e) => e.rank)).toEqual(ranked.map((_, i) => i + 1));
  });

  it('self-only CDR is a note column, never ranked value', () => {
    const milk = cdrFor('milk', ctx);
    expect(milk.selfCdr).toBe(20);
    expect(milk.cdrPer40s).toBeLessThan(7.48 * PROCS); // only her 2.83/10-FC line counts
  });
});
