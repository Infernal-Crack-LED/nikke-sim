// Self-validating fixture for scripts/census-kit-numbers.ts — the phase-4 TAIL instrument
// (docs/handoffs/2026-08-11-faithfulness-tail-plan.md).
//
// The census makes ONE claim per line: the magnitude the kit prints appears nowhere in the unit's
// override file. That claim is only worth acting on while the matcher stays honest in two
// directions, and this file pins both:
//
//   NO SILENT LOOSENING — a threshold percent must not be counted as a magnitude (it would bury
//   real findings in noise), a proc chance must not be silently stripped (it is a real quantity),
//   and header lines must stay in scope (four units print a buff magnitude on the '■' line, so
//   skipping headers made the census structurally blind to them).
//
//   THE CALIBRATION HOLDS — the 45 board-graded units were read line-by-line by the faithfulness
//   sweep (batches 1-8), so they are the labeled set this instrument is scored against. A change
//   that makes the census fire on a unit that slice already cleared is a matcher regression until
//   proven otherwise. Subset assertions, not equality: dispositioning a finding SHRINKS the set
//   and stays green, while a new unit shipping a dropped kit line goes red — which is the point.
import { describe, expect, it } from 'vitest';
import {
  HEAL_LINE,
  auditUnit,
  auditableLines,
  census,
  magnitudes,
  stripConditions,
} from '../census-kit-numbers.js';

const strip = (s: string) => stripConditions(s).text;

describe('condition clauses — a threshold is not a magnitude', () => {
  it('strips the HP gate but keeps the magnitude beside it', () => {
    const line = 'Only when above 70%: ATK ▲ 53.69%.';
    expect(magnitudes(strip(line))).toEqual(['53.69']);
  });

  it('strips every HP-gate phrasing the roster actually prints', () => {
    for (const line of [
      'Activates when own HP falls below 90%. Affects all allies.',
      'Affects self. Activates when above 80% HP.',
      'Activates when entering Full Burst while in Stargazer status with over 25% HP.',
      'Activates when the HP of anyone in the squad is lower than 15%.',
      'If own HP dips below 40%, Mode B is removed.',
      'Activates when battery reaches 100%. Affects self.',
      'Activates when the HP of an adjacent ally drops to 90% or below while the ally is still alive.',
      'Deactivation condition: When the battery drops to 0%',
    ]) {
      expect(magnitudes(strip(line))).toEqual([]);
    }
  });

  it('does NOT strip a proc chance — an unmodelled proc is a real over-credit', () => {
    expect(
      magnitudes(strip('There is a 30% chance of activating when attacked.'))
    ).toEqual(['30']);
  });

  it('does NOT strip a magnitude that merely reads like a threshold', () => {
    // `power` skill2. "Reloads 100% of the magazine" is an ammo effect, not an HP gate — the
    // census must keep seeing it (it is a live SILENT finding).
    expect(
      magnitudes(
        strip('Reloads 100% of the magazine. Activates 1 time(s) per battle.')
      )
    ).toEqual(['100']);
  });
});

describe('auditable lines — header lines stay in scope', () => {
  it('reads a magnitude printed on the ■ trigger line', () => {
    // `aria` skill1: the whole skill is one header line. Skipping headers hid this class.
    const kit =
      '■ Activates at the beginning of Full Burst. Affects all allies. Critical Damage ▲ 26.99% for 10 sec.';
    expect(auditableLines(kit)).toHaveLength(1);
    expect(magnitudes(auditableLines(kit)[0])).toEqual(['26.99']);
  });

  it('drops the ■ marker and blank lines, keeps every effect sentence', () => {
    const kit =
      '■ Affects all allies.\nATK ▲ 12.5% for 10 sec.\n\nDEF ▼ 3.5% for 5 sec.';
    expect(auditableLines(kit)).toEqual([
      'Affects all allies.',
      'ATK ▲ 12.5% for 10 sec.',
      'DEF ▼ 3.5% for 5 sec.',
    ]);
  });
});

describe('heal classification — keeps the worklist readable without hiding anything', () => {
  it('classifies an HP restore as heal, whatever verb the kit uses', () => {
    for (const line of [
      'Recovers 55.44% of attack damage as HP over 10 sec.',
      "Restores HP equal to 5.23% of the skill user's final Max HP.",
      "Constantly recovers 1.53% of the skill user's final Max HP every 1 sec for 10 sec.",
    ]) {
      expect(HEAL_LINE.test(line)).toBe(true);
    }
  });

  it('does NOT classify an HP-BASIS stat line as a heal — those stay in the worklist', () => {
    // `kilo` burst and `soline-frost-ticket` skill1: HP is the basis of a damage/stat value, not
    // an amount being restored. Misfiling these would silently drop two real findings.
    for (const line of [
      'Deals damage equal to 1150.84% of the ATK, which is calculated from 5% of final Max HP.',
      "Ticket effect: Max HP ▲ number of tickets * 10% of the skill user's Max HP.",
      'Deals 240% of final ATK as damage. Attacks sequentially 3 time(s).',
    ]) {
      expect(HEAL_LINE.test(line)).toBe(false);
    }
  });
});

describe('the three dispositions', () => {
  const kit = {
    skill1:
      '■ Affects self.\nATK ▲ 11.11% for 10 sec.\nCharge Speed ▲ 22.22% for 10 sec.',
    skill2: '■ Affects self.\nCritical Rate ▲ 33.33% for 5 sec.',
  };

  it('counts an encoded magnitude as accounted, in either slot', () => {
    const row = auditUnit(
      'fixture',
      kit,
      JSON.stringify({
        note: 'nothing',
        skill1: [{ effects: [{ stat: 'atkPct', value: 11.11 }] }],
        skill2: [{ effects: [{ stat: 'critRatePct', value: 33.33 }] }],
        unmodeled: { skill1: ['Charge Speed ▲ 22.22% for 10 sec.'] },
      }),
      false
    );
    expect(row.silent).toEqual([]);
    expect(row.proseOnly).toEqual([]);
  });

  // The `red-hood` M8 shape, reduced: pre-fix her override mentioned the burst's "Charge Speed
  // ▲ 100.8%" exactly once, inside a note sentence, and encoded it in no block. That is the
  // defect this tier exists to surface, so the classification must not drift toward SILENT.
  it('flags a magnitude that lives only in prose as PROSE-ONLY, not SILENT', () => {
    const row = auditUnit(
      'fixture',
      kit,
      JSON.stringify({
        note: 'Charge Speed 22.22 is deliberately folded into the swap clamp; crit 33.33 ditto.',
        skill1: [{ effects: [{ stat: 'atkPct', value: 11.11 }] }],
      }),
      false
    );
    expect(row.silent).toEqual([]);
    expect(
      row.proseOnly
        .map((f) => f.missing)
        .flat()
        .sort()
    ).toEqual(['22.22', '33.33']);
  });

  it('flags a magnitude the file never mentions as SILENT', () => {
    const row = auditUnit(
      'fixture',
      kit,
      JSON.stringify({
        note: 'models the ATK line only',
        skill1: [{ effects: [{ stat: 'atkPct', value: 11.11 }] }],
      }),
      false
    );
    expect(
      row.silent
        .map((f) => f.missing)
        .flat()
        .sort()
    ).toEqual(['22.22', '33.33']);
  });

  it('counts a magnitude encoded in a NON-slot structured field as accounted', () => {
    // The structured side is a deny-list of prose fields, not an allow-list of slots: overrides
    // also encode values in charFixes/resources/modes/consolidation/…, and an allow-list would
    // report those as missing.
    const row = auditUnit(
      'fixture',
      { skill1: '■ Affects self.\nCharge Speed ▼ 20% for 50 sec.' },
      JSON.stringify({
        note: 'charge-speed debuff modelled as a charge-time increase',
        charFixes: { chargeFrames: 72, chargeSpeedDelta: 20 },
      }),
      false
    );
    expect(row.silent).toEqual([]);
    expect(row.proseOnly).toEqual([]);
  });

  it('treats kitDescription as PROSE, not as an encoding', () => {
    // 10 overrides carry a human-readable kit summary that QUOTES magnitudes. Counting it as
    // structured would quietly clear every line it mentions on exactly those units.
    const row = auditUnit(
      'fixture',
      { skill1: '■ Affects all allies.\nReload Speed ▲ 36.96% for 10 sec.' },
      JSON.stringify({
        note: 'x',
        kitDescription:
          'The attacked-20x team Reload Speed ▲36.96% line is inert at scope lock.',
        skill1: [],
      }),
      false
    );
    expect(row.silent).toEqual([]);
    expect(row.proseOnly.map((f) => f.missing).flat()).toEqual(['36.96']);
  });

  it('flags an unreviewed top-level field instead of silently trusting it', () => {
    const row = auditUnit(
      'fixture',
      { skill1: '■ Affects self.\nATK ▲ 11.11% for 10 sec.' },
      JSON.stringify({ note: 'x', someNewField: 'whatever 11.11' }),
      false
    );
    expect(row.unreviewedFields).toEqual(['someNewField']);
  });

  it('does not confuse a digit string with a longer one that contains it', () => {
    const row = auditUnit(
      'fixture',
      { skill1: '■ Affects self.\nATK ▲ 1.53% for 10 sec.' },
      JSON.stringify({ note: 'unrelated value 11.535 appears here' }),
      false
    );
    expect(row.silent.map((f) => f.missing).flat()).toEqual(['1.53']);
  });
});

describe('roster calibration — scored against the sweep-reviewed slice', () => {
  const rows = census().rows;
  const silent = (graded: boolean) =>
    rows
      .filter((r) => r.graded === graded && r.silent.length > 0)
      .map((r) => r.slug);

  it('audits the whole override roster', () => {
    expect(rows.length).toBeGreaterThan(180);
    expect(rows.filter((r) => r.graded)).toHaveLength(45);
  });

  it('fires on at most `crown` across the 45 line-by-line-reviewed graded units', () => {
    // The sweep cleared these units by hand. `crown`'s 5.23% is an HP-pool heal magnitude, inert
    // by design (no HP pool) — the one accepted residue. Anything else here is a matcher bug.
    expect(silent(true).filter((s) => s !== 'crown')).toEqual([]);
  });

  it('holds the tail worklist to its known set', () => {
    // Dispositioning any of these shrinks the set (still green). A NEW slug appearing means a
    // unit shipped with a kit magnitude its override never mentions — go read it.
    const known = ['biscuit', 'power', 'sin'];
    expect(silent(false).filter((s) => !known.includes(s))).toEqual([]);
  });

  it('holds the PROSE-ONLY damage-relevant worklist to its known set', () => {
    // The tail pass's actual read list (2026-08-11): units whose kit prints a NON-heal magnitude
    // that their override discusses in prose and encodes in no block — the list below instead of
    // 138 file opens. Reading one and dispositioning it shrinks this set; a new slug appearing is
    // a new finding, not a test to update blindly.
    const known = [
      'asuka-wille',
      'bready',
      'diesel',
      'emilia',
      'emma-tactical-upgrade',
      'eve',
      'harran',
      'julia',
      'k',
      'kilo',
      'mast',
      'maxwell-ordinary-mechanic',
      'sakura-bloom-in-summer',
      'soline-frost-ticket',
      'tove',
    ];
    const found = rows
      .filter((r) => !r.graded && r.proseOnly.some((f) => f.kind === 'other'))
      .map((r) => r.slug);
    expect(found.filter((s) => !known.includes(s))).toEqual([]);
  });

  it('never silently swallows a unit it cannot audit', () => {
    const { noKitText, noStatusEntry } = census();
    // The two synthetic no-op fixtures are the only overrides with no kit text, by construction.
    expect(noKitText).toEqual(['noop-b1-ar', 'noop-b3-mg']);
    expect(noStatusEntry).toEqual([]);
  });
});
