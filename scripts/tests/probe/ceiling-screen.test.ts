// ============================================================================
// Replay pin for the 2026-08-17 ceiling feasibility screen
// (docs/probe-data/ceiling-screen-2026-08-17.json).
//
// Two verdicts in that artifact are load-bearing — they are what retires the "third comp with a
// non-vacuous ceiling" recording ask:
//   * misc B3s (run I order) is CAP-SATURATED, so lifting its SG-reconstruction fence does not
//     make it usable as a classification arm;
//   * N3 scarlet/liberalio iron is NON-VACUOUS, so it can serve as one.
// Both are recomputed here by running the committed `simCeiling` over committed credit schedules,
// so a change to the statistic, the bin cap, or either comp's credit schedule turns this red
// rather than letting the artifact silently go stale.
//
// FEASIBILITY ONLY — this pins a property of the SIM SCHEDULE. It carries no classification and
// no claim about the game, and neither does the artifact.
// ============================================================================
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  armPower,
  simCeiling,
  type SimSchedule,
} from '../../probe/fill-trace-compare.js';

const ARTIFACT = 'docs/probe-data/ceiling-screen-2026-08-17.json';
const N3 = 'docs/probe-data/credit-schedule-n3-scarlet-liberalio-iron.json';
const MISC_B3S = 'docs/probe-data/credit-schedule-misc-b3s.json';

const loadSchedule = (p: string): SimSchedule => {
  const raw = JSON.parse(readFileSync(p, 'utf8')) as
    SimSchedule | SimSchedule[];
  return Array.isArray(raw) ? raw[0] : raw;
};

describe('ceiling screen: which comps can host the H-C detector (2026-08-17)', () => {
  const artifact = JSON.parse(readFileSync(ARTIFACT, 'utf8')) as {
    part2_ceilingScreen: { nonVacuous: { comp: string; ceiling: number }[] };
  };

  it('misc B3s: the SG-reconstruction fence is lifted — all self-checks pass, nothing unreconstructed', () => {
    const s = loadSchedule(MISC_B3S);
    expect(s.comp).toBe('misc B3s (run I order)');
    // This is what the 2026-08-15 packet fenced the arm on. It no longer fails.
    expect(s.unreconstructed).toEqual([]);
    expect(s.checks.endpointOk).toBe(true);
    expect(s.checks.truncatedOk).toBe(true);
    expect(s.checks.dbgGauge.ok).toBe(true);
  });

  it('misc B3s: but it is CAP-SATURATED, so its ceiling detector is vacuous', () => {
    const c = simCeiling(loadSchedule(MISC_B3S));
    expect(c.sumRatePerSec).toBeCloseTo(94.5, 1);
    expect(c.ceilingBinsPerSec).toBe(c.binRateCap);
    expect(c.sumRatePerSec).toBeGreaterThanOrEqual(c.binRateCap);
    // The two carriers that saturate it, so a regression names the cause.
    const byslug = Object.fromEntries(c.perUnit.map((u) => [u.slug, u]));
    expect(byslug.chisato.minGapFrames).toBe(3);
    expect(byslug.chisato.maxRatePerSec).toBe(20);
    expect(byslug.jill.minGapFrames).toBe(1);
    expect(byslug.jill.maxRatePerSec).toBe(60);
  });

  it('N3 scarlet/liberalio iron: NON-VACUOUS — the candidate third arm', () => {
    const s = loadSchedule(N3);
    expect(s.comp).toBe('N3 scarlet/liberalio iron');
    expect(s.unreconstructed).toEqual([]);
    const c = simCeiling(s);
    expect(c.sumRatePerSec).toBeCloseTo(5.13, 2);
    expect(c.ceilingBinsPerSec).toBeCloseTo(5.13, 2);
    // Strictly under the cap is what "non-vacuous" means.
    expect(c.sumRatePerSec).toBeLessThan(c.binRateCap);
    // Every seated unit is slow-firing — no MG/SMG/AR carrier to saturate it.
    for (const u of c.perUnit) {
      expect(u.maxRatePerSec).toBeLessThanOrEqual(1.5);
    }
    expect(c.perUnit.map((u) => u.slug).sort()).toEqual([
      'liberalio',
      'rouge',
      'scarlet-black-shadow',
      'soda-twinkling-bunny',
      'trina',
    ]);
  });

  it('arm-power: N3 CANNOT discriminate a general source from a liberalio-specific one', () => {
    // Pre-registration power analysis cited by the 2026-08-17 third-arm pre-op packet §E.2b.
    // liberalio is seated in BOTH arms at the same max credit rate (0.6667/s, minGap 90f), so the
    // two rivals predict rates only ~7% apart — under the Poisson noise on the event count this
    // arm can supply. The packet's honesty rests on this number; if the inputs or the statistic
    // move, the packet's "does not discriminate" claim must be re-derived, not assumed.
    const cls = JSON.parse(
      readFileSync(
        'docs/probe-data/fill-trace-habc-classification.json',
        'utf8'
      )
    ) as {
      arms: Record<
        string,
        {
          ceiling: { perUnit: { slug: string; maxRatePerSec: number }[] };
          branch: { realEventBinsPerSec: number };
          pooled: { usableCleanBins: number };
        }
      >;
    };
    const iron = cls.arms['iron sweep (run G)'];
    const r = armPower({
      sharedSlug: 'liberalio',
      refComp: 'iron sweep (run G)',
      refCeilingPerUnit: iron.ceiling.perUnit,
      refRate: iron.branch.realEventBinsPerSec,
      refCleanBinTimeSec: iron.pooled.usableCleanBins / 30,
      refFullWindowSec: 23.618,
      candComp: 'N3 scarlet/liberalio iron',
      candCeilingPerUnit: simCeiling(loadSchedule(N3)).perUnit.map((u) => ({
        slug: u.slug,
        maxRatePerSec: u.maxRatePerSec,
      })),
      candSimRefillSec: 38.1,
    });
    // liberalio's ABSOLUTE credit rate is identical across the two arms — this is why the
    // shared-unit rival predicts a ratio of exactly 1 and the two predictions sit so close.
    expect(r.reference.sharedUnitRate).toBeCloseTo(0.6667, 4);
    expect(r.candidate.sharedUnitRate).toBeCloseTo(0.6667, 4);
    expect(r.predictions.scalesWithSharedUnit.ratio).toBeCloseTo(1, 4);
    expect(r.predictions.scalesWithCeiling.ratio).toBeCloseTo(1.4276, 3);
    expect(r.predictions.scalesWithCeiling.rate).toBeCloseTo(6.7313, 3);
    expect(r.predictions.scalesWithSharedUnit.rate).toBeCloseTo(6.2517, 3);
    // THE load-bearing assertion: under 2 sigma => the arm cannot separate the rivals.
    expect(r.power.separationSigmas).toBeCloseTo(0.9848, 3);
    expect(r.power.discriminates).toBe(false);
    expect(r.power.eventBinsFor2Sigma).toBe(733);
  });

  it('arm-power CLI REFUSES a missing numeric arg instead of silently returning discriminates:false', () => {
    // Regression guard for the cross-family review's FIX finding (2026-08-17). `Number(undefined)`
    // is NaN and `NaN >= 2` is false, so before the guard an OMITTED --candidate-sim-refill-sec
    // produced a clean-looking `discriminates: false` — the exact false-NEGATIVE that would let a
    // claim be withdrawn on a missing flag rather than on evidence. The CLI must exit non-zero.
    let exitCode = 0;
    let stderr = '';
    try {
      execFileSync(
        'npx',
        [
          'tsx',
          'scripts/probe/fill-trace-compare.ts',
          'arm-power',
          '--classification',
          'docs/probe-data/fill-trace-habc-classification.json',
          '--ref-comp',
          'iron sweep (run G)',
          '--candidate-schedule',
          N3,
          '--candidate-comp',
          'N3 scarlet/liberalio iron',
          '--shared',
          'liberalio',
          // --candidate-sim-refill-sec deliberately OMITTED
        ],
        { encoding: 'utf8', stdio: 'pipe' }
      );
    } catch (e) {
      const err = e as { status?: number; stderr?: string };
      exitCode = err.status ?? 1;
      stderr = err.stderr ?? '';
    }
    expect(exitCode).not.toBe(0);
    expect(stderr).toContain('candidate-sim-refill-sec');
    expect(stderr).not.toContain('discriminates');
  }, 60000);

  it('the artifact reports the same two ceilings it is cited for', () => {
    const nv = Object.fromEntries(
      artifact.part2_ceilingScreen.nonVacuous.map((r) => [r.comp, r.ceiling])
    );
    expect(nv['N3 scarlet/liberalio iron']).toBeCloseTo(
      simCeiling(loadSchedule(N3)).ceilingBinsPerSec,
      2
    );
    expect(nv['iron sweep (run G)']).toBeCloseTo(3.59, 2);
  });
});
