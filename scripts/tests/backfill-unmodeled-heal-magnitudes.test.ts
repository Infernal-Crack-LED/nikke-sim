// Fixture for scripts/backfill-unmodeled-heal-magnitudes.ts — the text splicer that filed 50 heal
// magnitudes under `unmodeled` across 34 protected override files (owner ruling 2026-08-11,
// DECISIONS: unmodeled behaviour is RECORDED, not left to prose).
//
// WHY THIS EXISTS. The script edits `src/skills/overrides/**` as TEXT rather than via a JSON
// round-trip (prettier's objectWrap:preserve would otherwise reformat ~94 unrelated files), and it
// stays committed and re-runnable after a roster sync. But its key scans were exercised by NOTHING:
// a `--check` run with zero additions early-returns before `insertEntries` is ever called, so
// "--check is clean" was never evidence that the splicer works. Caught by the cross-family review
// (`kimi-code/k3`, 2026-08-11) as a gap in the stated evidence rather than in the code.
//
// The adversarial cases below are the ones that would corrupt a protected file silently: a prose
// mention of the field name before the real key, an entry whose TEXT contains a slot name, and a
// malformed/absent key. The contract is: splice the right region, or throw loudly — never write
// the wrong place.
import { describe, expect, it } from 'vitest';
import {
  entryFor,
  insertEntries,
} from '../backfill-unmodeled-heal-magnitudes.js';

const build = (unmodeled: Record<string, string[]>, note = 'a note') =>
  JSON.stringify(
    { note, unmodeled, skill1: [], skill2: [], burst: [] },
    null,
    2
  );

describe('insertEntries — splices the right array', () => {
  it('appends to the named slot and leaves the others alone', () => {
    const raw = build({ skill1: [], skill2: ['existing'], burst: [] });
    const out = JSON.parse(insertEntries(raw, 'skill2', ['added']));
    expect(out.unmodeled.skill2).toEqual(['existing', 'added']);
    expect(out.unmodeled.skill1).toEqual([]);
    expect(out.unmodeled.burst).toEqual([]);
  });

  it('preserves every other field of the file verbatim', () => {
    const raw = build(
      { skill1: [], skill2: [], burst: [] },
      'load-bearing prose'
    );
    const before = JSON.parse(raw);
    const after = JSON.parse(insertEntries(raw, 'burst', ['x']));
    for (const key of ['note', 'skill1', 'skill2', 'burst']) {
      expect(after[key]).toEqual(before[key]);
    }
  });

  it('is a no-op when there is nothing to add', () => {
    const raw = build({ skill1: [], skill2: [], burst: [] });
    expect(insertEntries(raw, 'burst', [])).toBe(raw);
  });

  it('appends several entries in order', () => {
    const raw = build({ skill1: ['a'], skill2: [], burst: [] });
    const out = JSON.parse(insertEntries(raw, 'skill1', ['b', 'c']));
    expect(out.unmodeled.skill1).toEqual(['a', 'b', 'c']);
  });
});

describe('insertEntries — adversarial keys (the silent-corruption cases)', () => {
  it('ignores a PROSE mention of the field name before the real key', () => {
    // A note that quotes the field, as several overrides do when explaining a disposition.
    const raw = build(
      { skill1: [], skill2: [], burst: [] },
      'the line belongs in "unmodeled" rather than an encoded block'
    );
    const out = JSON.parse(insertEntries(raw, 'burst', ['x']));
    expect(out.unmodeled.burst).toEqual(['x']);
  });

  it('is not fooled by an ENTRY whose text contains a slot name', () => {
    const raw = build({
      skill1: [],
      skill2: ['this "burst" mention is entry text, not a key'],
      burst: [],
    });
    const out = JSON.parse(insertEntries(raw, 'burst', ['x']));
    expect(out.unmodeled.burst).toEqual(['x']);
    expect(out.unmodeled.skill2).toHaveLength(1);
  });

  it('throws — never guesses — when the field is only mentioned in prose', () => {
    const raw = JSON.stringify(
      {
        note: 'discussed under "unmodeled" but the field is absent',
        skill1: [],
      },
      null,
      2
    );
    expect(() => insertEntries(raw, 'skill1', ['x'])).toThrow(/unmodeled/i);
  });

  it('throws when the requested slot key is missing', () => {
    const raw = build({ skill1: [], skill2: [] });
    expect(() => insertEntries(raw, 'burst', ['x'])).toThrow(/burst/);
  });
});

describe('entryFor — records the amount as unmodeled without denying the event', () => {
  const line = 'Recovers 55.44% of attack damage as HP over 10 sec.';

  it('keeps the kit line verbatim as the prefix (the sora-style guard)', () => {
    expect(entryFor(line, ['burst']).startsWith(line)).toBe(true);
  });

  it('names the slot(s) whose heal effect carries the recovery event', () => {
    expect(entryFor(line, ['burst'])).toContain('heal, burst slot');
    expect(entryFor(line, ['skill1', 'burst'])).toContain(
      'heal, skill1/burst slots'
    );
  });

  it('says so plainly when NO recovery event is emitted', () => {
    // Never claim an event that does not exist — that would invite a "fix" adding a second emitter.
    expect(entryFor(line, [])).toContain('no recovery event is emitted');
  });
});
