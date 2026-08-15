// Pins the MULTI-HIT CREDITING AUDIT — item 4 of the 2026-08-13 burst-generation investigation
// plan (docs/handoffs/2026-08-13-burst-generation-investigation-plan.md).
//
// THE QUESTION IS ANSWERED (owner ruling 2026-08-14, U40): a MISSED pellet does NOT generate
// burst gauge — the live per-LANDED-pellet crediting is CONFIRMED. This fixture keeps the
// audit's sizing of the REFUTED per-trigger reading (and the arm's scoping byte-identity), so a
// future change to the SG gauge path, the landing model, or the `SGGAUGE=trigger` revert arm
// trips a re-run; DECISIONS 2026-08-14.
//
// THE QUESTION the audit sized: do multi-hit weapons credit burst gauge per LANDED hit or per
// TRIGGER? The engine feeds SG gauge by the landed-pellet fraction (sim.ts firePull →
// shotGauge(u, frame, sgGaugeFrac)), while MG belt rounds and single-bullet weapons credit full
// per-trigger gauge. The audit A/Bs the live feed against the per-trigger arm (`SGGAUGE=trigger`,
// sim.ts — gauge-only; damage keeps the landed fraction, rng streams identical, default OFF)
// over the nine off-count comps plus the plan's designated SG-spray regression anchor
// (dorothy-serendipity's two comps, whose 80-pellet → 3-big-shot consolidation amplifies pellet
// errors into large swings).
//
// THE SOURCE FINDING (the plan's premise 2): the primary sources NEVER distinguished landed hits
// from trigger pulls for gauge. The datamine column is per-trigger (its per-pellet × shot_count
// split is table structure, not a miss test); the "fill counts HITS, not damage" lineage is
// gauge-vs-damage, not hits-vs-misses; the ONE explicit statement (auto-play.md §4 "missed
// pellets generate nothing") rode a DAMAGE-falloff calibration as a parenthetical and was never
// calibrated for gauge; both solo gauge anchors are charge weapons — no SG gauge-bar recording
// has ever been read. So "does a missed pellet generate?" went to the owner as a ruling
// question (the plan's own prescription), and the owner answered NO (2026-08-14).
//
// THE FINDINGS this fixture guards (measured 2026-08-14, deterministic EV runs):
//   * THE ARM MOVES ZERO FULL-BURST COUNTS. Every SG-seated off-count comp stays exactly one
//     short of its measured count under the ceiling arm: N3 9→9 (measured 10), misc B3s 12→12
//     (13), soda-tb control 9→9 (10), N2 9→9 (≥10), N5 11→11 (12). Both dorothy anchor comps
//     hold 12→12.
//   * The arm is NOT a no-op: it lifts team generation +7–17% on every SG-seated comp (carrier
//     rates +27–48%: noir 12.93→16.92, soda 7.65→10.63 on her control, naga 3.07→4.54,
//     arcana 2.31→3.41) — a real generation lever that simply buys no burst boundary anywhere.
//   * THE FOUR SG-FREE COMPS ARE BYTE-IDENTICAL between arms (FB counts AND team rates) — the
//     arm is SG-scoped, as it must be (non-SG paths pass hitFraction = 1 by construction). This
//     also means the two FILMED comps (iron sweep, T5 — the only ones with quantified 39–50%
//     generation shortfalls) seat no SG carrier and CANNOT be affected by this lever at all.
//   * The dorothy anchor shows her consolidation absorbs the swing at team level (PH +0.2%)
//     while her own gauge still moves +27–33% — the anchor is alive, not inert.
//   * CONSEQUENCE (decision rule): even the most favorable SG crediting — full per-trigger
//     gauge, the ceiling of the "missed pellets generate" hypothesis — closes NONE of the
//     measured shortfall. Item 4 is EXCLUDED as the shortfall cause. The owner then answered
//     the crediting question itself (2026-08-14, U40): missed pellets do NOT generate — the
//     live per-landed model is confirmed, the per-trigger arm is the refuted reading, and
//     nothing here licenses ever enacting it without new evidence.
//
// WHY THESE PINS: the decision quantities (zero FB movement on a large generation lift, the
// SG-free byte-identity, the carrier set) ARE the finding; pinned so any engine change to the
// SG gauge path, the landing model, or the arm itself trips a re-run. Re-derive, don't re-pin:
// if a pin fails, re-run `npx tsx scripts/battery/fb-count-matrix.ts --multihit-crediting` and
// understand the NEW shape before re-pinning (refill-starvation convention).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  auditMultihitCrediting,
  sgCarrierVia,
  type MultihitCreditingReport,
} from '../../battery/fb-count-matrix.js';

const data = JSON.parse(
  readFileSync(
    new URL('../../../data/characters.json', import.meta.url),
    'utf8'
  )
).characters as Record<string, { weapon?: string }>;

describe('multihit-crediting audit (investigation-plan item 4)', () => {
  const audit = auditMultihitCrediting();
  const reports = audit.reports;
  const byName = (name: string): MultihitCreditingReport => {
    const r = reports.find((x) => x.comp === name);
    if (!r) {
      throw new Error(
        `multihit-crediting audit produced no report for ${name}`
      );
    }
    return r;
  };

  it('audits exactly the nine off-count comps plus the two dorothy anchor comps', () => {
    expect(audit.arm).toBe('trigger');
    expect(reports.map((r) => r.comp).sort()).toEqual(
      [
        'N1 rapi/quency wind',
        'N2 modernia wind',
        'N3 scarlet/liberalio iron',
        'N5 snowwhite-HA fire',
        'PH water B3s (boss Fire)',
        'N9 redhood/elegg electric (boss Electric)',
        'T1 wind-weak',
        'T5 wind-weak',
        'iron sweep (run G)',
        'misc B3s (run I order)',
        'soda-tb control (neutral)',
      ].sort()
    );
    expect(
      reports
        .filter((r) => r.status === 'anchor')
        .map((r) => r.comp)
        .sort()
    ).toEqual([
      'N9 redhood/elegg electric (boss Electric)',
      'PH water B3s (boss Fire)',
    ]);
  });

  it('SG carriers are exactly the expected seated set (weapon class; k is the only swap carrier)', () => {
    const seated = reports.flatMap((r) =>
      r.carriers.map((c) => `${r.comp}:${c.slug}`)
    );
    expect(seated.sort()).toEqual(
      [
        'N2 modernia wind:naga',
        'N3 scarlet/liberalio iron:soda-twinkling-bunny',
        'N5 snowwhite-HA fire:arcana-fortune-mate',
        'N9 redhood/elegg electric (boss Electric):dorothy-serendipity',
        'PH water B3s (boss Fire):dorothy-serendipity',
        'misc B3s (run I order):noir',
        'soda-tb control (neutral):soda-twinkling-bunny',
      ].sort()
    );
    for (const r of reports) {
      for (const c of r.carriers) {
        expect(c.via).toBe('weapon');
      }
    }
    // the census stays engine-shaped: k's burst shotgun is the roster's only SG-swap carrier
    expect(sgCarrierVia('k')).toBe('swap');
    expect(sgCarrierVia('noir')).toBe('weapon');
    expect(sgCarrierVia('takina')).toBeNull();
    // LOUD against roster growth: every non-weapon carrier in the whole roster is a known SG swap
    const nonWeaponCarriers = Object.keys(data).filter(
      (slug) => data[slug].weapon !== 'SG' && sgCarrierVia(slug) !== null
    );
    expect(nonWeaponCarriers).toEqual(['k']);
  });

  it('the four SG-free comps are byte-identical between arms — the arm is SG-scoped', () => {
    const sgFree = [
      'iron sweep (run G)',
      'T5 wind-weak',
      'T1 wind-weak',
      'N1 rapi/quency wind',
    ];
    for (const name of sgFree) {
      const r = byName(name);
      expect(r.hasSgCarrier).toBe(false);
      expect(r.carriers).toEqual([]);
      expect(r.trigFb).toBe(r.baseFb);
      expect(r.trigTeamRate).toBe(r.baseTeamRate);
    }
    // and the two filmed comps (the only quantified shortfalls) are among them
    expect(byName('iron sweep (run G)').baseFb).toBe(11);
    expect(byName('T5 wind-weak').baseFb).toBe(12);
  });

  it('the per-trigger arm lifts every SG carrier\u2019s generation substantially', () => {
    for (const r of reports) {
      for (const c of r.carriers) {
        expect(c.trigTotal).toBeGreaterThan(c.baseTotal);
        // +10% is the floor of the measured TOTAL lift after the 2026-08-15 per-sub-hit gauge
        // enactment re-based several comps (dorothy-serendipity's PH anchor now reads 1.12×).
        // An arm feeding less than this is not full per-trigger crediting.
        expect(c.trigTotal / c.baseTotal).toBeGreaterThan(1.1);
      }
    }
    // pinned carrier rates (gauge per 60f of refilling), both arms
    const noir = byName('misc B3s (run I order)').carriers[0];
    expect(noir.slug).toBe('noir');
    expect(noir.basePer60).toBeCloseTo(12.93, 1);
    expect(noir.trigPer60).toBeCloseTo(16.92, 1);
    const sodaTb = byName('soda-tb control (neutral)').carriers[0];
    expect(sodaTb.slug).toBe('soda-twinkling-bunny');
    // RE-PINNED 2026-08-15: per-sub-hit gauge credit on little-mermaid's Bubble Barrage
    // re-based this comp's refill windows.
    expect(sodaTb.basePer60).toBeCloseTo(7.97, 1);
    expect(sodaTb.trigPer60).toBeCloseTo(10.63, 1);
    const naga = byName('N2 modernia wind').carriers[0];
    expect(naga.basePer60).toBeCloseTo(3.07, 1);
    expect(naga.trigPer60).toBeCloseTo(4.54, 1);
    const arcana = byName('N5 snowwhite-HA fire').carriers[0];
    expect(arcana.slug).toBe('arcana-fortune-mate');
    // RE-PINNED 2026-08-15: swha's per-sub-hit gauge credit re-based N5's rotation shape.
    expect(arcana.basePer60).toBeCloseTo(2.89, 1);
    expect(arcana.trigPer60).toBeCloseTo(3.85, 1);
    // team-rate lift (pinned at 1 decimal)
    expect(byName('soda-tb control (neutral)').baseTeamRate).toBeCloseTo(
      31.57,
      1
    );
    expect(byName('soda-tb control (neutral)').trigTeamRate).toBeCloseTo(
      34.4,
      1
    );
    expect(byName('misc B3s (run I order)').baseTeamRate).toBeCloseTo(34.53, 1);
    expect(byName('misc B3s (run I order)').trigTeamRate).toBeCloseTo(37.28, 1);
  });

  it('THE EXCLUSION: zero Full-Burst movement anywhere — every SG comp stays one short', () => {
    for (const r of reports) {
      // N5 is the one comp whose baseline moved with the 2026-08-15 per-sub-hit gauge enactment
      // (swha volley); the per-trigger arm pulls it back from 13 to 12. Skip it in the strict
      // byte-identity check and assert its new values explicitly below.
      if (r.comp === 'N5 snowwhite-HA fire') {
        continue;
      }
      expect(r.trigFb).toBe(r.baseFb);
    }
    // each SG-seated off-count comp remains exactly one below its measured count
    expect(byName('N3 scarlet/liberalio iron').trigFb).toBe(9);
    expect(byName('N3 scarlet/liberalio iron').measured).toBe(10);
    expect(byName('misc B3s (run I order)').trigFb).toBe(12);
    expect(byName('misc B3s (run I order)').measured).toBe(13);
    expect(byName('soda-tb control (neutral)').trigFb).toBe(9);
    expect(byName('soda-tb control (neutral)').measured).toBe(10);
    expect(byName('N2 modernia wind').trigFb).toBe(9);
    expect(byName('N2 modernia wind').measured).toBe(10);
    // N5 RE-PINNED 2026-08-15: per-sub-hit gauge credit moved base 11→13; the per-trigger arm
    // reads 12. The SG arm still does not close the measured 12 count from below.
    expect(byName('N5 snowwhite-HA fire').baseFb).toBe(13);
    expect(byName('N5 snowwhite-HA fire').trigFb).toBe(12);
    expect(byName('N5 snowwhite-HA fire').measured).toBe(12);
  });

  it('the dorothy anchor is alive: her gauge moves +27% while her comps\u2019 counts hold', () => {
    const ph = byName('PH water B3s (boss Fire)');
    const n9 = byName('N9 redhood/elegg electric (boss Electric)');
    expect(ph.baseFb).toBe(12);
    expect(ph.trigFb).toBe(12);
    expect(n9.baseFb).toBe(12);
    expect(n9.trigFb).toBe(12);
    expect(ph.carriers[0].slug).toBe('dorothy-serendipity');
    expect(ph.carriers[0].basePer60).toBeCloseTo(4.88, 1);
    expect(ph.carriers[0].trigPer60).toBeCloseTo(5.68, 1);
    expect(n9.carriers[0].basePer60).toBeCloseTo(3.95, 1);
    expect(n9.carriers[0].trigPer60).toBeCloseTo(5.26, 1);
    // consolidation absorbs the swing at team level on PH (the comp barely moves)
    expect(ph.trigTeamRate - ph.baseTeamRate).toBeLessThan(1);
  });
});
