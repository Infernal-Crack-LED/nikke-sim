// Self-validating fixture for scripts/census-kit-quantities.ts — axis 3 of the phase-4 TAIL
// (docs/handoffs/2026-08-11-faithfulness-tail-plan.md §4b3).
//
// THIS AXIS IS DECLINED AS A WORKLIST GENERATOR, and the fixture's job is to keep the reasons
// true rather than to defend a worklist. The instrument is committed because it is the evidence
// for that verdict (CLAUDE.md constraint 9) and so nobody rebuilds it on the same premise.
//
// The premise was that this tier "held the d-killer-wife round-count defect". Replaying the census
// against her PRE-FIX override (`git show ae0010d6^`) shows it reads CLEAN — because the line was
// correctly filed under `unmodeled` the whole time, with a reasoned annotation. The 2026-08-11
// change was a DISPOSITION change (the Pierce tag turned out to feed the Damage-Up bucket, so an
// inert-looking line became worth modeling), not a missing quantity. No accounting census can
// detect that class: the number was accounted for before and after.
import { describe, expect, it } from 'vitest';
import { auditUnit, census, valuesOf } from '../census-kit-quantities.js';

describe('typed matching — the only version of this axis worth running', () => {
  it('credits a duration carried by the typed field', () => {
    const r = auditUnit(
      'fixture',
      { skill1: '■ Affects self.\nATK ▲ 12.5% for 10 sec.' },
      { skill1: [{ effects: [{ kind: 'buff', durationSec: 10 }] }] }
    );
    expect(r.findings[0]!.accounted).toBe(true);
  });

  it('does NOT credit the same digit sitting in an unrelated field', () => {
    // The whole reason this axis is typed. Axis 1 measured the collision problem: 281 of 282
    // integer magnitudes appear somewhere in their override by accident. A presence check on
    // "10" would pass here.
    const r = auditUnit(
      'fixture',
      { skill1: '■ Affects self.\nATK ▲ 12.5% for 10 sec.' },
      { skill1: [{ trigger: { kind: 'hitCount', count: 10 }, effects: [] }] }
    );
    expect(r.findings[0]!.accounted).toBe(false);
  });

  it('credits a heal-over-time that writes ticks instead of durationSec', () => {
    const r = auditUnit(
      'fixture',
      {
        skill1:
          '■ Affects all allies.\nRecovers 10% of damage dealt as HP for 10 sec.',
      },
      { skill1: [{ effects: [{ kind: 'heal', ticks: 10, intervalSec: 1 }] }] }
    );
    expect(r.findings[0]!.accounted).toBe(true);
  });

  it('credits a line filed under `unmodeled` — the shared definition of accounted', () => {
    const r = auditUnit(
      'fixture',
      { skill1: '■ Affects self.\nStuns for 2 sec.' },
      {
        skill1: [],
        unmodeled: { skill1: ['Stuns for 2 sec.'], skill2: [], burst: [] },
      }
    );
    expect(r.findings[0]!.accounted).toBe(true);
    expect(r.findings[0]!.via).toBe('unmodeled');
  });

  it('collects field values from anywhere in the file', () => {
    expect(
      [
        ...valuesOf({ a: [{ durationSec: 5 }], b: { c: { durationSec: 9 } } }, [
          'durationSec',
        ]),
      ].sort()
    ).toEqual([5, 9]);
  });
});

describe('why this axis is declined — the numbers that decide it', () => {
  const { findings, graded, unparsedNumericLines } = census();
  const rate = (inGraded: boolean) => {
    const set = findings.filter((f) => graded.has(f.slug) === inGraded);
    return set.filter((f) => !f.accounted).length / set.length;
  };

  it('fires HARDER on the slice the sweep already read line-by-line', () => {
    // The tail plan's method rule: "a census that fires on units that slice already cleared is
    // measuring its own noise". Consolidated and time-averaged encodings are what a careful review
    // PRODUCES, so the graded units are exactly where a quantity-accounting census misfires.
    // Axes 1, 2, 4 and 6 all pass this test; this one does not, and the gap is ~3x.
    expect(rate(true)).toBeGreaterThan(rate(false) * 2);
  });

  it('leaves most numeric kit lines unclaimed — its recall is poor', () => {
    // Reported by --skipped every run. A worklist from a matcher with this recall cannot support
    // "the roster is clean" in either direction.
    expect(unparsedNumericLines).toBeGreaterThan(findings.length / 4);
  });

  it('still parses a real population — the decline is not "it found nothing"', () => {
    expect(findings.length).toBeGreaterThan(800);
    expect(findings.filter((f) => !f.accounted).length).toBeGreaterThan(0);
  });
});
