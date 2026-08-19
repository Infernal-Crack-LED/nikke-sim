// Pins the FOCUS-COLUMN AUDIT — item 3 of the 2026-08-13 burst-generation investigation plan
// (docs/handoffs/2026-08-13-burst-generation-investigation-plan.md).
//
// THE QUESTION the audit answers: the focused charge unit's burst-gauge multiplier is sourced
// per unit — the engine ladder (gaugePerShot(), src/engine/sim.ts): charFixes.focusChargeMult →
// magDumpRof / PENDING_TEAM_ISOLATION pin (flat 2.5) → characters.json chargeMultiplier (>0) →
// gauge-per-shot.json fullChargeBonus (>0) → 250. Does every off-count comp's focused charge
// unit resolve to a MEASURED or OWNER-CONFIRMED column? The obvious version of this item —
// "unfocused charge units are missing the full-charge bonus" — was already REFUTED by
// measurement (UNFOCUSED_CHARGE_GEN 1.0, battery 3 A1/A2) and is not what runs here.
//
// THE METHOD: a DATA read, not a sim run. auditFocusColumns() re-walks the engine ladder
// against the data files + override charFixes for each of the nine off-count comps, grades the
// resolved column against the column record (docs/data/burst-gauge.md §4; DECISIONS
// 2026-07-29 — the per-unit landing, the alice/cinderella follow-up, and the SUPERSEDES
// entry), and sizes the most a wrong column could add to each filmed comp's generation
// shortfall. focusColumnCensus() does the same at roster scale (every SR/RL unit), so an
// unrecognised column or a source disagreement is LOUD.
//
// THE FINDINGS this fixture guards (measured 2026-08-14, deterministic EV runs):
//   * FOUR comps focus a charge unit; all four resolve to MEASURED columns via the PRIMARY
//     source (characters.json chargeMultiplier) with no pin or charFixes in the path:
//     maxwell 250 (iron sweep), anis-star 250 (T5 + T1), scarlet-black-shadow 150 (N3).
//     250 is the family of both solo anchors (maiden-ice-rose, takina — pixel-exact); 150 is
//     measured twice over (solo ~1.42x + team 11-FB count). The other five comps focus
//     non-charge weapons (AR/MG/SG) that take no focus bonus at all.
//   * A WRONG COLUMN COULD NOT EXPLAIN THE SHORTFALL even before its column is measured:
//     scaling the focused unit's whole rate to the most extreme live column (350) covers
//     ≤22.4% of iron sweep's measured shortfall and ≤12.6% of T5's — and that is a ceiling,
//     because skill-gen does not scale with the focus multiplier.
//   * THE ONLY UNMEASURED COLUMN seats nowhere: vesti-tactical-upgrade's 200 is pinned flat
//     2.5x by the engine's PENDING_TEAM_ISOLATION, and she appears in no off-count comp.
//     The roster census grades every other live column measured (250/350/150) or
//     owner-confirmed (cinderella's 200 via charFixes.focusChargeMult).
//   * raven is the one source disagreement (characters.json chargeMultiplier 0 vs gauge row
//     250); the engine's fcb fallback resolves her to the measured 250 family — documented in
//     DECISIONS 2026-07-29 step-7, not a finding.
//
// WHY THESE PINS: the decision quantities (the per-comp resolutions, the ceiling covers, the
// census outlier set, the empty seated-unmeasured list) ARE the finding that closes the item;
// they are reproducible reads off the data files + deterministic sim rates, pinned so a data
// sync that moves a column, a pin-list change, or a new unmeasured outlier trips a re-run.
// Re-derive, don't re-pin: if a pin fails, re-run
// `npx tsx scripts/battery/fb-count-matrix.ts --focus-columns` and understand the NEW shape
// before re-pinning (refill-starvation convention).
import { describe, expect, it } from 'vitest';
import {
  auditFocusColumns,
  focusColumnCensus,
  type FocusColumnReport,
  type FocusColumnStatus,
} from '../../battery/fb-count-matrix.js';

describe('focus-column audit (investigation-plan item 3)', () => {
  const reports = auditFocusColumns();
  const byName = (name: string): FocusColumnReport => {
    const r = reports.find((x) => x.comp === name);
    if (!r) {
      throw new Error(`focus-column audit produced no report for ${name}`);
    }
    return r;
  };

  it('audits exactly the nine off-count comps', () => {
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
  });

  it('exactly four comps focus a charge weapon, all resolved via characters.json', () => {
    const charge = reports.filter((r) => r.isChargeFocus);
    expect(charge.map((r) => `${r.comp}:${r.focusSlug}`).sort()).toEqual(
      [
        'N3 scarlet/liberalio iron:scarlet-black-shadow',
        'T1 wind-weak:anis-star',
        'T5 wind-weak:anis-star',
        'iron sweep (run G):maxwell',
      ].sort()
    );
    for (const r of charge) {
      // the PRIMARY source — no charFixes.focusChargeMult, no magDumpRof or
      // PENDING_TEAM_ISOLATION pin sits in any seated focus unit's path
      expect(r.source).toBe('characters.json chargeMultiplier');
      expect(r.columnStatus).toBe('measured');
    }
  });

  it('the focused charge units resolve to the measured columns 250/250/250/150', () => {
    expect(byName('iron sweep (run G)').resolvedMult).toBe(2.5);
    expect(byName('T5 wind-weak').resolvedMult).toBe(2.5);
    expect(byName('T1 wind-weak').resolvedMult).toBe(2.5);
    // scarlet-black-shadow's enacted 1.5x (DECISIONS 2026-07-29): solo ~1.42x + team 11-FB
    // count outside the flat-2.5x model
    expect(byName('N3 scarlet/liberalio iron').resolvedMult).toBe(1.5);
  });

  it('the other five comps focus non-charge weapons — the focus bonus does not apply', () => {
    const nonCharge = [
      ['misc B3s (run I order)', 'jill', 'AR'],
      ['N1 rapi/quency wind', 'rapi-red-hood', 'MG'],
      ['soda-tb control (neutral)', 'soda-twinkling-bunny', 'SG'],
      ['N2 modernia wind', 'modernia', 'MG'],
      ['N5 snowwhite-HA fire', 'privaty', 'AR'],
    ] as const;
    for (const [comp, slug, weapon] of nonCharge) {
      const r = byName(comp);
      expect(r.focusSlug).toBe(slug);
      expect(r.weapon).toBe(weapon);
      expect(r.isChargeFocus).toBe(false);
      expect(r.resolvedMult).toBeNull();
      expect(r.columnStatus).toBe('n/a');
    }
  });

  it('a wrong column could cover only a minority of the filmed shortfalls (ceiling)', () => {
    // Ceiling = the focused unit's WHOLE rate scaled from its resolved column to the largest
    // live column (350); an over-estimate because skill-gen does not scale with the focus
    // multiplier. Even so it cannot reach the measured shortfall on either filmed comp.
    // iron sweep RE-PINNED 2026-08-19 (was 7.954 / 3.182 / 16.383 / 19.4): gaugeHits:5 on
    // liberalio's 202.5 rider credits 5× skillGauge per trigger (was 1×), closing most of
    // the comp's gauge shortfall (16.4 → 2.0 gauge/sec). The focus-column ceiling now
    // covers 183% of the remaining shortfall — the finding is largely resolved. Values
    // from `npx tsx scripts/battery/fb-count-matrix.ts --focus-columns --json`.
    const iron = byName('iron sweep (run G)');
    expect(iron.focusPer60).toBeCloseTo(9.13, 3);
    expect(iron.maxAltUpsideGaugePerSec).toBeCloseTo(3.652, 3);
    expect(iron.shortfallRateGaugePerSec).toBeCloseTo(1.998, 2);
    expect(iron.maxAltUpsideCoverPct).toBeCloseTo(182.7, 0);

    // T5's focused unit IS anis-star (middle slot): her skill impacts credit the full
    // datamined 2.8 gauge (hitsPerShot 1), which raises her whole-unit focused rate and
    // narrows the comp's measured shortfall. Re-pinned 2026-08-19 (liberalio gaugeHits:5
    // timing cascade shifted values). Values from the instrument's --json.
    const t5 = byName('T5 wind-weak');
    expect(t5.focusPer60).toBeCloseTo(10.608, 3);
    expect(t5.maxAltUpsideGaugePerSec).toBeCloseTo(4.243, 3);
    expect(t5.shortfallRateGaugePerSec).toBeCloseTo(16.812, 2);
    expect(t5.maxAltUpsideCoverPct).toBeCloseTo(25.2, 0);

    // the unfilmed comps carry no shortfall figure
    expect(byName('T1 wind-weak').maxAltUpsideCoverPct).toBeNull();
    expect(byName('N3 scarlet/liberalio iron').maxAltUpsideCoverPct).toBeNull();
  });

  describe('roster-wide column census', () => {
    const census = focusColumnCensus();

    it('the non-250 columns are exactly the settled record set', () => {
      const outliers = census
        .filter((r) => r.resolvedColumn !== 250)
        .map((r): [string, number, FocusColumnStatus] => [
          r.slug,
          r.resolvedColumn,
          r.status,
        ]);
      const expected: [string, number, FocusColumnStatus][] = [
        ['alice', 350, 'measured'],
        ['belorta', 350, 'measured'],
        ['cinderella', 200, 'owner-confirmed'],
        ['n102', 350, 'measured'],
        ['scarlet-black-shadow', 150, 'measured'],
        ['vesti-tactical-upgrade', 200, 'unmeasured'],
        ['yan', 350, 'measured'],
        ['yuni', 350, 'measured'],
      ];
      expect(outliers.sort()).toEqual(expected.sort());
    });

    it('the ONLY unmeasured column seats in no off-count comp', () => {
      const unmeasured = census.filter((r) => r.status === 'unmeasured');
      expect(unmeasured.map((r) => r.slug)).toEqual(['vesti-tactical-upgrade']);
      expect(
        census.filter((r) => r.seatedInOffComps && r.status !== 'measured')
      ).toEqual([]);
    });

    it('raven is the single source disagreement — resolved to 250 by the fcb fallback', () => {
      const mismatched = census.filter(
        (r) => r.fcb !== null && r.charMult !== r.fcb
      );
      expect(mismatched.map((r) => r.slug)).toEqual(['raven']);
      expect(mismatched[0].resolvedColumn).toBe(250);
      expect(mismatched[0].status).toBe('measured');
    });
  });
});
