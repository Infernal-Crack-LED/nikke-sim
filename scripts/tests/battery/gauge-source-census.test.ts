// Pins the NON-BULLET GAUGE-SOURCE CENSUS — item 2 of the 2026-08-13 burst-generation
// investigation plan (docs/handoffs/2026-08-13-burst-generation-investigation-plan.md).
//
// THE QUESTION the census answers: skill hits, DoT ticks and riders all feed the bar via
// `skillGauge()` — one target-base hit per impact. Is every source that generates in-game
// actually emitting, and is anything emitting that should not? The solo gauge anchors are both
// BULLET measurements on charge weapons, so a whole effect kind missing from the emission map
// is invisible to them and to damage tests (gauge and damage are separate channels). U28
// already fixed and bounded one such asymmetry (`extraHitDamagePct`); this covers the rest.
//
// THE METHOD: PART 1 is a field-form census — `GAUGE_KIND_CENSUS` is a `Record<EffectDef['kind'], …>`
// (compile-time exhaustive: a new kind in types.ts breaks the typecheck), and every override file
// is walked at runtime with an unknown kind throwing (LOUD both ways). PART 2 runs all nine
// off-count comps with the event tap and partitions skill/burst damage instances + buff
// applications into UNLOCKED regions ([0, first gauge-full) + each [FB-end, next gauge-full)
// refill window) vs the chain + Full-Burst lock where addGauge swallows the emission.
//
// THE FINDINGS this fixture guards (measured 2026-08-14, deterministic EV runs):
//   * EMISSION MAP CLEAN: every skillGauge/shotGauge/fillGauge site is measured or owner-ruled.
//     The impact kinds are exactly {flatDamage, hitRepeat, dot, storedHit, stackedNuke}; the two
//     non-emitting ones are storedHit (owner ruling 2026-08-04 — releases only ever happen during
//     Full Burst) and stackedNuke (UNEXAMINED — no ruling behind the omission; FINDING per the
//     plan's decision rule, reported not enacted).
//   * ZERO CONTRIBUTION from the non-emitting kinds on all nine comps: the only seated carrier is
//     rapi-red-hood (storedHit, N1), whose releases are FB-locked by construction — her 7 unlocked
//     skill impacts are her flatDamage ATTACH rider, not releases. stackedNuke's sole carrier
//     (maiden-ice-rose) and hitRepeat's (emilia) seat none of the nine.
//   * DIVISOR EXPOSURE (the U28-residual magnitude question): anis-star (RL, hitsPerShot 2) on
//     four comps and modernia (MG, hitsPerShot 2) on N2 are the ONLY carriers with unlocked skill
//     impacts — every SG carrier's skill hits land exclusively inside the lock (zero exposure).
//     anis-star's existing labeled fixture — battery 3 A3 solo, ~10.7–11.3%/pull (probe-runs.md) —
//     EXCLUDES the shipped halved reading (8.9%/pull = 700 shot + 140 rider, ×1.06 aura); its own
//     decomposition (proc = full 280) is compatible. The mechanism (divisor 1 vs two impacts per
//     pull) stays footage-gated; nothing enacted here.
//   * NON-DAMAGE SKILL APPLICATIONS (burst-gauge.md §5, _trick_ MEDIUM-confidence rule, unmodeled)
//     cannot be the shortfall source on the filmed comps: FRESH applications inside the steady
//     refill windows are 0 on iron sweep and T5 (kit activations cluster on burstCast /
//     fullBurstEnter triggers, which are locked), so the class's lower bound is exactly zero of
//     the 38.7 / 49.7 gauge-per-cycle shortfalls.
//
// WHY THESE PINS: the decision quantities (carrier lists, unlocked counts, divisor rows, the
// zero-fresh-application result) ARE the findings; the exact counts are reproducible integers
// from the deterministic sim, pinned so an engine change that leaks a no-emission impact out of
// the lock — or silently moves the divisor exposure — trips a re-run. Re-derive, don't re-pin:
// if a pin fails, re-run `npx tsx scripts/battery/fb-count-matrix.ts --gauge-sources`, re-read
// the shape, and only re-pin once the NEW finding is understood (refill-starvation convention).
import { describe, expect, it } from 'vitest';
import {
  GAUGE_KIND_CENSUS,
  NO_EMIT_KINDS,
  UNMEASURED_EMIT_KINDS,
  auditGaugeSources,
  censusOverrideKinds,
  skillImpactGauge,
  type GaugeSourceCompReport,
} from '../../battery/fb-count-matrix.js';

describe('non-bullet gauge-source census (investigation-plan item 2)', () => {
  const reports = auditGaugeSources();
  const byName = (name: string): GaugeSourceCompReport => {
    const r = reports.find((x) => x.comp === name);
    if (!r) {
      throw new Error(`census produced no report for ${name}`);
    }
    return r;
  };

  describe('part 1 — field-form kind census', () => {
    it('the impact-producing kinds are exactly five, with the emission map fully ruled', () => {
      const impactKinds = Object.entries(GAUGE_KIND_CENSUS)
        .filter(([, row]) => row.impact)
        .map(([kind]) => kind)
        .sort();
      expect(impactKinds).toEqual([
        'dot',
        'flatDamage',
        'hitRepeat',
        'stackedNuke',
        'storedHit',
      ]);
      for (const row of Object.values(GAUGE_KIND_CENSUS)) {
        expect(row.basis.length).toBeGreaterThan(0);
      }
    });

    it('the non-emitting impact kinds are storedHit (ruled) and stackedNuke (unexamined)', () => {
      expect(NO_EMIT_KINDS.sort()).toEqual(['stackedNuke', 'storedHit']);
      expect(GAUGE_KIND_CENSUS.storedHit.emission).toBe('no-emission');
      expect(GAUGE_KIND_CENSUS.storedHit.ruling).toBe('owner-ruling');
      // THE finding per the plan's decision rule: an impact kind with no ruling behind the
      // omission. Its contribution is zero by construction (burstCast ⊂ chain lock) and its
      // sole carrier seats none of the nine comps — but the omission stays UNEXAMINED until an
      // enactment pass gives it the one-line comment its siblings have.
      expect(GAUGE_KIND_CENSUS.stackedNuke.emission).toBe('no-emission');
      expect(GAUGE_KIND_CENSUS.stackedNuke.ruling).toBe('unexamined');
    });

    it('hitRepeat emits under the owner ruling, flagged unmeasured for the specific mechanic', () => {
      expect(UNMEASURED_EMIT_KINDS).toEqual(['hitRepeat']);
      expect(GAUGE_KIND_CENSUS.hitRepeat.emission).toBe(
        'skillGauge-per-impact'
      );
    });

    it('the override walk is clean and the special kinds have exactly their known carriers', () => {
      const usage = censusOverrideKinds();
      const carriers = (kind: string) =>
        usage.find((u) => u.kind === kind)?.slugs ?? [];
      expect(carriers('storedHit')).toEqual(['rapi-red-hood']);
      expect(carriers('stackedNuke')).toEqual(['maiden-ice-rose']);
      expect(carriers('hitRepeat')).toEqual(['emilia']);
      expect(carriers('fillGauge')).toEqual([
        'cinderella-crystal-wave',
        'd',
        'elegg',
        'little-mermaid',
      ]);
      // sanity: the walk actually covered the roster (flatDamage is the common rider kind)
      expect(carriers('flatDamage').length).toBeGreaterThan(50);
    });
  });

  describe('part 2 — dynamic census over the nine off-count comps', () => {
    it('audits exactly the nine off-count comps, each with steady refill windows', () => {
      expect(reports.map((r) => r.comp).sort()).toEqual(
        [
          'N1 rapi/quency wind',
          'N2 modernia wind',
          'N3 scarlet/liberalio iron',
          'N5 snowwhite-HA fire',
          'T1 wind-weak',
          'T5 wind-weak',
          'iron sweep (run G)',
          'misc B3s (run I order)',
          'soda-tb control (neutral)',
        ].sort()
      );
      for (const r of reports) {
        expect(r.steadyWindows).toBeGreaterThan(0);
      }
    });

    it('no-emission kinds contribute ZERO everywhere: the only seated carrier is rapi-red-hood, FB-locked by construction', () => {
      for (const r of reports) {
        expect(r.unmeasuredEmitCarriers).toEqual([]); // emilia seats no comp
        if (r.comp === 'N1 rapi/quency wind') {
          expect(r.noEmitCarriers).toEqual([
            { slug: 'rapi-red-hood', kinds: ['storedHit'] },
          ]);
          // her UNLOCKED skill impacts are the flatDamage ATTACH rider (hitCount 120), NOT
          // stored-hit releases — releases only ever happen during Full Burst. This pin is the
          // drift guard: if a release ever leaks out of the lock, this count moves.
          expect(r.perUnitUnlockedImpacts['rapi-red-hood']).toBe(7);
        } else {
          expect(r.noEmitCarriers).toEqual([]);
        }
      }
    });

    it('pins the deterministic unlocked/locked impact split per comp (drift guard)', () => {
      const pinned: Record<string, [number, number]> = {
        // iron sweep RE-PINNED 2026-08-14 (was [24, 111]): the `liberalio` Charge Speed immunity
        // re-phases this comp's Full Bursts, moving impacts across the unlocked/locked boundary.
        // Re-derived from the instrument's own `--gauge-sources --json`; cause: DECISIONS
        // 2026-08-14. Every other comp's split is unchanged — none seats a Charge Speed source.
        'iron sweep (run G)': [26, 107],
        'T5 wind-weak': [73, 732],
        'T1 wind-weak': [90, 781],
        'N3 scarlet/liberalio iron': [35, 284],
        'misc B3s (run I order)': [78, 831],
        'N1 rapi/quency wind': [49, 269],
        'soda-tb control (neutral)': [17, 345],
        'N2 modernia wind': [1370, 7597],
        'N5 snowwhite-HA fire': [96, 778],
      };
      for (const [comp, [unlocked, locked]] of Object.entries(pinned)) {
        expect(byName(comp).unlockedImpacts).toBe(unlocked);
        expect(byName(comp).lockedImpacts).toBe(locked);
      }
    });

    it('SG carriers have ZERO unlocked skill impacts — their divisor exposure is nil', () => {
      // noir (misc B3s), naga (N2), soda-twinkling-bunny (N3 + soda-tb control),
      // arcana-fortune-mate (N5): every skill hit they deal lands inside the chain/FB lock.
      const sgByComp: Record<string, string[]> = {
        'misc B3s (run I order)': ['noir'],
        'N2 modernia wind': ['naga'],
        'N3 scarlet/liberalio iron': ['soda-twinkling-bunny'],
        'soda-tb control (neutral)': ['soda-twinkling-bunny'],
        'N5 snowwhite-HA fire': ['arcana-fortune-mate'],
      };
      for (const [comp, slugs] of Object.entries(sgByComp)) {
        const r = byName(comp);
        for (const s of slugs) {
          expect(r.perUnitUnlockedImpacts[s] ?? 0).toBe(0);
        }
        expect(r.divisor.find((d) => d.weapon === 'SG')).toBeUndefined();
      }
    });

    it('pins the divisor exposure rows (the U28-residual magnitude question, sized)', () => {
      const rows: [string, string, number, number, number][] = [
        // comp, slug, unlockedImpacts, gaugeShipped, gaugeIfDivisorOne
        ['T5 wind-weak', 'anis-star', 42, 58.8, 117.6],
        ['T1 wind-weak', 'anis-star', 41, 57.4, 114.8],
        ['misc B3s (run I order)', 'anis-star', 30, 42.0, 84.0],
        ['N5 snowwhite-HA fire', 'anis-star', 38, 53.2, 106.4],
        ['N2 modernia wind', 'modernia', 1330, 66.5, 133.0],
      ];
      for (const [comp, slug, n, shipped, ifOne] of rows) {
        const r = byName(comp);
        expect(r.divisor).toHaveLength(1); // no other hps>1 unit lands unlocked skill impacts
        const d = r.divisor.find((x) => x.slug === slug)!;
        expect(d.divisor).toBe(2);
        expect(d.unlockedImpacts).toBe(n);
        expect(d.gaugeShipped).toBeCloseTo(shipped, 3);
        expect(d.gaugeIfDivisorOne).toBeCloseTo(ifOne, 3);
      }
    });

    it('the shipped anis-star divisor reading her labeled solo fixture EXCLUDES', () => {
      // Battery 3 A3 (probe-runs.md): measured ~10.7–11.3%/pull, decomposed as 280×2.5 focused
      // shot + 280 proc skill-gen, ×1.06 aura. The shipped model generates (700 + 140) × 1.06 =
      // 890 energy = 8.9%/pull — BELOW the band, because skillGauge halves her rider by
      // hitsPerShot 2. The fixture's own decomposition (proc = full 280) is compatible instead.
      // This pin holds the shipped reading; the resolution is footage-gated (U28 residual), not
      // something this census enacts.
      expect(skillImpactGauge('anis-star')).toBeCloseTo(1.4, 6);
    });

    it('non-damage skill applications: ZERO fresh applications in the filmed comps\u2019 steady windows', () => {
      // The _trick_ rule (burst-gauge.md §5, MEDIUM confidence, unmodeled) would feed the bar on
      // every non-damage skill application — but kit activations cluster on burstCast /
      // fullBurstEnter triggers (locked), so almost nothing FRESH lands in a refill window. The
      // class's lower bound is exactly zero of both filmed shortfalls; the upper bound rides
      // buff REFRESHES, which are not applications in-game.
      for (const comp of ['iron sweep (run G)', 'T5 wind-weak']) {
        const r = byName(comp);
        expect(r.buffAppliesSteadyFresh).toBe(0);
        expect(r.nonDmgAppGaugePerCycle.lower).toBe(0);
        expect(r.shortfallPerCycleGauge).not.toBeNull();
        expect(r.nonDmgAppGaugePerCycle.lower).toBeLessThan(
          r.shortfallPerCycleGauge!
        );
      }
      // N5's lone fresh application is the only one across all 90 steady windows of the nine comps
      expect(byName('N5 snowwhite-HA fire').buffAppliesSteadyFresh).toBe(1);
    });

    it('pins the filmed comps\u2019 measured shortfall the estimates are held against', () => {
      // iron sweep RE-PINNED 2026-08-14 (was 14.94 / 38.67): the `liberalio` Charge Speed
      // immunity costs her two charges per fight, so the comp generates less gauge and its
      // measured shortfall WIDENS. Re-derived by running the instrument
      // (`npx tsx scripts/battery/fb-count-matrix.ts --gauge-sources --json`), not hand-edited.
      // Cause: DECISIONS 2026-08-14. T5 is untouched — no Charge Speed source seated there.
      const iron = byName('iron sweep (run G)');
      expect(iron.shortfallRateGaugePerSec).toBeCloseTo(16.38, 1);
      expect(iron.shortfallPerCycleGauge).toBeCloseTo(40.76, 1);
      const t5 = byName('T5 wind-weak');
      expect(t5.shortfallRateGaugePerSec).toBeCloseTo(26.03, 1);
      expect(t5.shortfallPerCycleGauge).toBeCloseTo(49.67, 1);
    });
  });
});
