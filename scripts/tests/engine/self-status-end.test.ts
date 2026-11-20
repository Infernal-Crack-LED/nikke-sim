// Engine primitive: trigger `selfStatusEnd` — "Activates when <Status> is removed". Fires the
// OWNER's block on the frame its OWN kit-named selfStatus window of that name lapses; a
// re-application before the lapse max-extends the window and moves the trigger with it. Same-unit
// only (the window is the per-(unit, name) map the requiresSelfStatus gate reads). Carrier: sky
// (Low Tension + Low Energy on High Tension's lapse).
//
// Observable: the `buffApply` event of a marked buff the end-block grants — its frame is the
// trigger frame. Zeroed-kit carrier on a bare-weapon team, bursts off.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  structuralCheck,
  targetStatusCensus,
} from '../../../src/skills/validate-structural.js';
import {
  bareWeaponOverride,
  CLEAN_WEAPON_SLUGS,
  runComp,
} from '../lib/harness.js';

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;

const TEAM = CLEAN_WEAPON_SLUGS.slice(0, 5);
const CARRIER = 2;
const MARK = 12.34; // a value no bare-weapon unit carries, so the buff is unambiguous
const FPS = 60;

const open = (name: string, durationSec: number, extra: object = {}) => ({
  slot: 'skill1',
  trigger: { kind: 'battleStart' },
  target: { kind: 'self' },
  ...extra,
  effects: [{ kind: 'selfStatus', name, durationSec }],
});
const onEnd = (name: string) => ({
  slot: 'skill2',
  trigger: { kind: 'selfStatusEnd', name },
  target: { kind: 'self' },
  effects: [{ kind: 'buff', stat: 'atkPct', value: MARK, durationSec: 5 }],
});

/** Frames (and holders) of the marked buff for a carrier kit made of `blocks`. */
function marks(skill1: object[], skill2: object[]): BuffApply[] {
  const events: SimEvent[] = [];
  const overrides = Object.fromEntries(
    TEAM.map((s) => [s, bareWeaponOverride(s)])
  );
  overrides[TEAM[CARRIER]] = {
    slug: TEAM[CARRIER],
    skill1,
    skill2,
    burst: [],
  } as any;
  runComp({
    slugs: TEAM,
    bossElement: 'Iron',
    overrides,
    cfg: { disableBursts: true, onEvent: (e) => events.push(e) },
  });
  return events.filter(
    (e): e is BuffApply =>
      e.kind === 'buffApply' && e.stat === 'atkPct' && e.value === MARK
  );
}

describe('selfStatusEnd trigger ("Activates when <Status> is removed")', () => {
  it('DISCRIMINATING: fires exactly once, on the lapse frame, for the owner', () => {
    const m = marks([open('Probe', 10)], [onEnd('Probe')]);
    expect(m.map((e) => e.frame)).toEqual([10 * FPS]);
    expect(m.map((e) => e.targetIdx)).toEqual([CARRIER]);
  });

  it('DISCRIMINATING: a re-application before the lapse moves the trigger (no fire at the first expiry)', () => {
    // a second 10s application at t=6s extends the window to t=16s
    const m = marks(
      [open('Probe', 10), open('Probe', 10, { delaySec: 6 })],
      [onEnd('Probe')]
    );
    expect(m.map((e) => e.frame)).toEqual([16 * FPS]);
  });

  it('name-keyed: a different status name never fires it', () => {
    expect(marks([open('Other', 10)], [onEnd('Probe')])).toEqual([]);
  });

  it('a window that outlives the fight never fires', () => {
    expect(marks([open('Probe', 400)], [onEnd('Probe')])).toEqual([]);
  });

  it('validator: needs a non-empty name; a name with no same-unit producer is an error', () => {
    const ctx = { characterSlugs: new Set(['x']), squadOf: () => undefined };
    const mk = (trigger: unknown, skill1: object[] = []) => ({
      note: 'fixture',
      unmodeled: { skill1: [], skill2: [], burst: [] },
      skill1,
      skill2: [
        {
          slot: 'skill2',
          trigger,
          target: { kind: 'self' },
          effects: [{ kind: 'buff', stat: 'atkPct', value: 1 }],
        },
      ],
      burst: [],
    });
    const nameErrs = (o: object) =>
      structuralCheck('x', o, ctx).errors.filter((m: string) =>
        m.includes('selfStatusEnd')
      );
    expect(
      nameErrs(mk({ kind: 'selfStatusEnd', name: 'Probe' }, [open('Probe', 5)]))
    ).toEqual([]);
    expect(nameErrs(mk({ kind: 'selfStatusEnd' })).length).toBe(1);
    expect(nameErrs(mk({ kind: 'selfStatusEnd', name: ' ' })).length).toBe(1);

    const census = (o: object) =>
      targetStatusCensus(new Map([['x', o]])).errors.filter((m: string) =>
        m.includes('selfStatusEnd')
      );
    expect(
      census(mk({ kind: 'selfStatusEnd', name: 'Probe' }, [open('Probe', 5)]))
    ).toEqual([]);
    expect(
      census(mk({ kind: 'selfStatusEnd', name: 'Probe' }, [open('Other', 5)]))
        .length
    ).toBe(1);
  });
});
