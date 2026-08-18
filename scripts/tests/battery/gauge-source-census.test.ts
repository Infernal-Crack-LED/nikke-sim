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
//   * DIVISOR EXPOSURE: modernia (MG, hitsPerShot 2, the one real double-hit carve-out) on N2 is
//     the ONLY carrier whose unlocked skill impacts see a divisor > 1 — every SG carrier's skill
//     hits land exclusively inside the lock (zero exposure). anis-star is datamined 1×1
//     (hitsPerShot 1), so her dot/rider impacts credit the full 280 (2.8 gauge) undivided; her
//     solo magnitude question (the 2026-08-15 exclusion bound vs the model's 10.39%/pull) stays
//     open under U28's magnitude half, footage-gated.
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

  it('the gaugeHits reconstruction emits no warnings on any seated comp', () => {
    for (const r of reports) {
      expect(r.reconstructionWarnings).toEqual([]);
    }
  });

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
        // T5 / T1 / misc B3s / N5 seat anis-star: her full 2.8-gauge impact credit (hitsPerShot 1,
        // no divisor) re-phases those comps' bursts, moving impacts across the unlocked/locked
        // boundary. Values from the instrument's own `--gauge-sources --json` output.
        // T5 and T1 seat anis-star: the baseGaugeProb 0.25 enactment (2026-08-18) increases
        // her per-shot gauge credit, re-phasing burst timing and shifting impacts across the
        // unlocked/locked boundary on both comps. Re-derived from the instrument's --json.
        'T5 wind-weak': [68, 770],
        'T1 wind-weak': [79, 808],
        'N3 scarlet/liberalio iron': [35, 284],
        'misc B3s (run I order)': [76, 834],
        'N1 rapi/quency wind': [49, 269],
        // soda-tb and N5 seat gaugeHits carriers (little-mermaid 10, snow-white-heavy-arms 5/10);
        // the census now counts sub-hits rather than aggregated damage events.
        'soda-tb control (neutral)': [35, 489],
        'N2 modernia wind': [1370, 7597],
        'N5 snowwhite-HA fire': [178, 1220],
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

    it('pins the divisor exposure rows: modernia (the one real double-hit) is the sole carrier', () => {
      // modernia is the only hitsPerShot-2 unit (genuine double-hit MG carve-out), so N2 is the
      // only comp with a divisor row. anis-star is datamined 1×1 — her impacts carry no divisor,
      // so the comps seating her have NONE. Values from `--gauge-sources --json`.
      const d = byName('N2 modernia wind').divisor;
      expect(d).toHaveLength(1);
      expect(d[0].slug).toBe('modernia');
      expect(d[0].divisor).toBe(2);
      expect(d[0].unlockedImpacts).toBe(1330);
      expect(d[0].gaugeShipped).toBeCloseTo(66.5, 3);
      expect(d[0].gaugeIfDivisorOne).toBeCloseTo(133.0, 3);
      for (const comp of [
        'T5 wind-weak',
        'T1 wind-weak',
        'misc B3s (run I order)',
        'N5 snowwhite-HA fire',
      ]) {
        expect(byName(comp).divisor).toEqual([]);
      }
    });

    it('counts `gaugeHits` sub-hits, not one aggregated damage event', () => {
      // A flatDamage with gaugeHits: N emits one damage event but credits gauge N times.
      // The census used to count the event as one impact; after the fix it counts N.
      const n5 = byName('N5 snowwhite-HA fire');
      expect(n5.perUnitUnlockedImpacts['snow-white-heavy-arms']).toBe(156);

      const soda = byName('soda-tb control (neutral)');
      expect(soda.perUnitUnlockedImpacts['little-mermaid']).toBe(20);
    });

    it('anis-star skill impacts credit the full datamined 280 (2.8 gauge, divisor 1)', () => {
      // Her per-impact skillGauge value: targetPerTrigger 280 (gauge-per-shot.json) ÷
      // hitsPerShot 1 (datamined shot_count 1 × muzzle_count 1). Solo decomposition:
      // (700 shot + 280 rider) × 1.06 aura = 10.39%/pull; her labeled solo fixture's
      // 2026-08-15 exclusion bound (steady per-pull ≥ ~10.96, < ~12.7) sits above it —
      // that magnitude question stays open under U28, footage-gated, not resolved here.
      expect(skillImpactGauge('anis-star')).toBeCloseTo(2.8, 6);
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
      // T5 seats anis-star: her full 2.8-gauge impact credit (hitsPerShot 1) plus the
      // baseGaugeProb 0.25 enactment (2026-08-18) raises the comp's sim generation further,
      // narrowing the sim-vs-filmed shortfall. The shortfall itself stays open (T5 remains a
      // disabled comp). Re-pinned 2026-08-18 from `--gauge-sources --json`.
      const t5 = byName('T5 wind-weak');
      expect(t5.shortfallRateGaugePerSec).toBeCloseTo(21.42, 1);
      expect(t5.shortfallPerCycleGauge).toBeCloseTo(40.88, 1);
    });
  });
});
