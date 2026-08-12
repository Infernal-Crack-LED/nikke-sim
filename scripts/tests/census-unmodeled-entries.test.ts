// Self-validating fixture for scripts/census-unmodeled-entries.ts — axis 2 of the phase-4 TAIL
// (docs/handoffs/2026-08-11-faithfulness-tail-plan.md §4.1).
//
// The census makes ONE claim per entry: no kit line the unit prints backs this `unmodeled` entry.
// Acting on that claim is only safe while the matcher stays honest in two directions, and this
// file pins both:
//
//   IT MUST STILL FIRE — a matcher that matches everything has an empty worklist and looks
//   perfectly calibrated. The MUTATION cases below are the guard: fabricated entries, and real kit
//   lines with the magnitude altered, must come back UNMATCHED. A previous tail fixture shipped
//   VACUOUS (round-6, 2026-08-11) by pinning only the real roster, where everything passes; the
//   lesson is that a census fixture needs negative cases it would fail without.
//
//   IT MUST NOT FIRE SPURIOUSLY — the three quoting conventions the roster actually uses (em-dash
//   annotation, parenthetical annotation, multi-line BLOCK quotes) are legitimate and must read as
//   matched. Each of them was a false-positive class in the first run of this instrument.
//
//   THE CALIBRATION HOLDS — the 45 board-graded units were read line-by-line by faithfulness
//   batches 1-8, so they are the labeled set (the SUFFICIENCY rule: no new ground truth was
//   generated). A change that makes the census fire on units that slice cleared is a matcher
//   regression until proven otherwise.
import { describe, expect, it } from 'vitest';
import {
  MIN_ANNOTATION_TOKENS,
  NEAR_FLOOR,
  auditUnit,
  blocks,
  census,
  contains,
  coverage,
  isWorklist,
  quotedHead,
} from '../census-unmodeled-entries.js';

/** `ada`'s real skill1 — one '■' block, header plus one effect line. */
const ADA_SKILL1 =
  '■ Activates when entering Full Burst. Affects all Burst 3 allies who previously used their Burst Skill.\nRecovers 10% of the damage dealt as HP for 10 sec.';

const audit = (entry: string, kit = ADA_SKILL1) =>
  auditUnit(
    'fixture',
    { skill1: kit },
    { unmodeled: { skill1: [entry], skill2: [], burst: [] } },
    false
  ).findings[0]!;

describe('annotation stripping — the entry is a quote plus a reason', () => {
  it('splits on the em-dash convention and keeps only the quoted head', () => {
    const entry =
      'Recovers 10% of the damage dealt as HP for 10 sec. — magnitude only: the HP amount has no engine consumer (no HP pool)';
    expect(quotedHead(entry)).toBe(
      'Recovers 10% of the damage dealt as HP for 10 sec.'
    );
  });

  it('strips a trailing PARENTHETICAL annotation — the second convention', () => {
    // `takina` skill2. Four units annotate this way; scoring the reason as quoted text dragged
    // every one of them below the floor in the first run.
    const entry =
      'Deals Stun to all enemies for 2 sec (boss-inert: the sim’s boss does not fire/charge/reload, so a stun on it changes nothing)';
    expect(quotedHead(entry)).toBe('Deals Stun to all enemies for 2 sec');
  });

  it('keeps the kit’s own inflection parentheses — "(s)" is not an annotation', () => {
    // Game text prints "normal attack(s)", "3 round(s)", "2 time(s)". Stripping those would
    // silently shorten the head on a large fraction of the roster.
    const entry = 'Activates after 12 normal attack(s). Affects all allies.';
    expect(quotedHead(entry)).toBe(entry);
    expect(MIN_ANNOTATION_TOKENS).toBeGreaterThan(1);
  });

  it('does not strip an entry that is ENTIRELY parenthetical', () => {
    // `laplace` (RL/Iron, not `laplace-ultimate-hero`) burst files "(Note: Unable to take
    // cover.)" — the parenthesis is the quote here, not a reason attached to one, and stripping it
    // would leave an empty head that matches anything.
    const entry = '(Note: Unable to take cover.)';
    expect(quotedHead(entry)).toBe(entry);
  });
});

describe('block quoting — kit text is blocks, and entries quote blocks', () => {
  it('groups a ■ header with the effect lines beneath it', () => {
    expect(blocks(ADA_SKILL1)).toEqual([
      'Activates when entering Full Burst. Affects all Burst 3 allies who previously used their Burst Skill. Recovers 10% of the damage dealt as HP for 10 sec.',
    ]);
  });

  it('splits on each ■, not on newlines', () => {
    const kit =
      '■ Affects self.\nATK ▲ 12.5% for 10 sec.\n■ Affects all allies.\nDEF ▼ 3.5% for 5 sec.';
    expect(blocks(kit)).toHaveLength(2);
  });

  it('matches an entry that merges a header with the line beneath it', () => {
    // `naga` skill1 files exactly this shape. Scoring it against individual LINES can never match
    // — no single line contains it — so this was a structural blind spot, not a threshold problem.
    const f = audit(
      'Activates when entering Full Burst. Affects all Burst 3 allies who previously used their Burst Skill. Recovers 10% of the damage dealt as HP for 10 sec.'
    );
    expect(f.tier).toBe('exact');
  });
});

describe('MUTATION — the matcher must still catch an entry no kit line backs', () => {
  it('flags a fabricated kit line', () => {
    expect(
      audit('Reload Speed ▲ 77.31% for 8 sec, stacks up to 4 time(s).').tier
    ).toBe('unmatched');
  });

  it('flags a real line whose MAGNITUDE was altered, as its own tier', () => {
    // The shape a kit REBALANCE leaves behind, and the highest-value thing this axis can find.
    // Token coverage alone cannot see it: every word but one still lines up, so this scored 0.91
    // and read as a clean paraphrase until magnitudes were gated separately from words.
    const f = audit('Recovers 88.42% of the damage dealt as HP for 10 sec.');
    expect(f.tier).toBe('magnitudeDrift');
    expect(isWorklist(f)).toBe(true);
    // It is NOT `unmatched`: the line still exists, so the disposition differs — retire the number,
    // not the entry.
    expect(f.score).toBeGreaterThan(NEAR_FLOOR);
  });

  it('flags a well-formed line borrowed from a DIFFERENT unit', () => {
    expect(audit('Expands Pierce range by 200% for 3 round(s).').tier).toBe(
      'unmatched'
    );
  });

  it('still matches the genuine line (the control for all three above)', () => {
    expect(
      audit('Recovers 10% of the damage dealt as HP for 10 sec.').tier
    ).toBe('contained');
  });
});

describe('containment floor — a boilerplate clause is not evidence', () => {
  it('refuses containment when the CONTAINED side is trivially short', () => {
    // Both MISFILED findings in the first run were this bug: a long entry "contains" the line
    // "Affects self." — a clause in nearly every kit in the game — and scored a perfect match
    // against the wrong slot. The floor originally bound only the head, not the line.
    expect(
      contains(
        'Activates at battle start. Affects self. Immunity to Charge Speed effects.',
        'Affects self.'
      )
    ).toBe(false);
  });

  it('still allows containment of a substantive line', () => {
    expect(
      contains(
        'Recovers 10% of the damage dealt as HP for 10 sec. plus commentary',
        'Recovers 10% of the damage dealt as HP for 10 sec.'
      )
    ).toBe(true);
  });
});

describe('misfiled detection — wrong slot is not the same as missing', () => {
  it('reports an entry filed under a slot whose kit does not carry it', () => {
    const row = auditUnit(
      'fixture',
      {
        skill1: '■ Affects self.\nATK ▲ 12.5% for 10 sec.',
        burst: '■ Affects all allies.\nCritical Damage ▲ 44.71% for 10 sec.',
      },
      {
        unmodeled: {
          skill1: ['Critical Damage ▲ 44.71% for 10 sec.'],
          skill2: [],
          burst: [],
        },
      },
      false
    );
    expect(row.findings[0]!.tier).toBe('misfiled');
    expect(row.findings[0]!.matchedSlot).toBe('burst');
  });
});

describe('coverage is directional — an entry may be longer than its line', () => {
  it('scores full coverage when the line carries every token the entry does', () => {
    expect(
      coverage(
        'ATK ▲ 12.5% for 10 sec.',
        '■ Affects self. ATK ▲ 12.5% for 10 sec.'
      )
    ).toBe(1);
  });

  it('does not credit an entry for tokens only IT has', () => {
    expect(
      coverage(
        'ATK ▲ 12.5% and DEF ▼ 9.9% for 10 sec.',
        'ATK ▲ 12.5% for 10 sec.'
      )
    ).toBeLessThan(1);
  });
});

describe('roster calibration — scored against the sweep-reviewed slice', () => {
  const { rows, noKitText, noStatusEntry } = census();
  const worklist = (r: (typeof rows)[number]) => r.findings.filter(isWorklist);

  it('audits the whole override roster', () => {
    expect(rows.length).toBeGreaterThan(180);
    expect(rows.filter((r) => r.graded)).toHaveLength(45);
  });

  it('accounts for every entry in the roster', () => {
    const entries = rows.reduce((a, r) => a + r.entryCount, 0);
    const findings = rows.reduce((a, r) => a + r.findings.length, 0);
    // Every entry produces exactly one finding row — nothing is dropped on the floor.
    expect(findings).toBe(entries);
    expect(entries).toBeGreaterThan(400);
  });

  it('holds the worklist to its dispositioned set', () => {
    // The 2026-08-11 tail read: all 8 were opened and none is a stale entry. `moran` and `zwei`
    // quote blablalink kit text that data/characters.json (synergy API) does not print — verified
    // per-unit, since `laplace` (RL/Iron, not `laplace-ultimate-hero`) files the SAME "unable to
    // take cover" note and DOES match, because her API text carries the line. `neon-vision-eye` files hand-written gauge bookkeeping.
    // Reading one and retiring it SHRINKS this set and stays green; a new slug appearing is a new
    // finding, not a test to update blindly.
    // `sugar` is the one MAGNITUDE-DRIFT carrier: both her cover-attacked entries quote a
    // "(20% chance)" proc that today's kit text does not print. Board-inert either way — the v1
    // boss never attacks, so the trigger never fires — and left as a finding, not enacted.
    const known = ['moran', 'neon-vision-eye', 'sugar', 'zwei'];
    const found = rows.filter((r) => worklist(r).length > 0).map((r) => r.slug);
    expect(found.filter((s) => !known.includes(s))).toEqual([]);
  });

  it('keeps the graded slice from being the noisiest — the calibration itself', () => {
    // A census that fires harder on units already read line-by-line is measuring its own noise.
    // The first run failed exactly this way (17 graded vs 6 tail); block-aware matching and
    // annotation stripping fixed the matcher, not the roster.
    const rate = (rs: typeof rows) => {
      const entries = rs.reduce((a, r) => a + r.entryCount, 0);
      return rs.reduce((a, r) => a + worklist(r).length, 0) / entries;
    };
    const graded = rate(rows.filter((r) => r.graded));
    const tail = rate(rows.filter((r) => !r.graded));
    expect(graded).toBeLessThan(0.05);
    expect(tail).toBeLessThan(0.05);
  });

  it('never silently swallows a unit it cannot audit', () => {
    // Unlike axis 1, the no-op fixtures carry no entries, so they are not reported at all here.
    expect(noKitText).toEqual([]);
    expect(noStatusEntry).toEqual([]);
  });
});
