// Engine primitive: target `alliesInStatus` — "[self and] all allies in the <Name> state". Selects
// the allies whose kit-NAMED self-status window (opened by a `selfStatus` effect — the channel the
// `requiresSelfStatus` gate reads) is OPEN at the apply frame and whose name starts with
// `statusPrefix`; `includeSelf` adds the owner unconditionally. Carrier: rapunzel-sanctuary (S1/S2
// Full-Burst-entry Attack Damage / caster-ATK grants to "self and all allies in the Into the Fray
// state" — a family of named modes, "Into the Fray: <Mode>").
//
// Observable: the `buffApply` event names the holder (`targetIdx`), so the resolved target set is
// read directly off the event log. Bare-weapon team, bursts off. Statuses are opened at battle start
// by each ally's OWN synthetic block; the carrier applies its marked buff on an interval (first at
// t=2s), so every status has already been opened — or, for the 1s one, has already lapsed.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { structuralCheck } from '../../../src/skills/validate-structural.js';
import {
  bareWeaponOverride,
  CLEAN_WEAPON_SLUGS,
  runComp,
} from '../lib/harness.js';

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;

const TEAM = CLEAN_WEAPON_SLUGS.slice(0, 5);
const MARK = 12.34; // a value no bare-weapon unit carries, so the buff is unambiguous
const CARRIER = 2;

/** status name + duration each slot opens on ITSELF at battle start (null = none). */
const STATUSES: Record<number, [string, number] | null> = {
  0: ['Into the Fray: Serene Mind', 999], // family member, open all fight → selected
  1: ['Into the Fray: Penetrant Wish', 1], // family member, LAPSED by t=2s → not selected
  2: null, // the carrier itself carries no status
  3: ['Goddess Blessing', 999], // open, but a different name → not selected
  4: null,
};

/** Holder slot indices of the carrier's marked buff (first application, t=2s). */
function holders(target: unknown): number[] {
  const events: SimEvent[] = [];
  const overrides = Object.fromEntries(
    TEAM.map((s, i) => {
      const ov = bareWeaponOverride(s) as any;
      const st = STATUSES[i];
      if (st) {
        ov.skill1 = [
          {
            slot: 'skill1',
            trigger: { kind: 'battleStart' },
            target: { kind: 'self' },
            effects: [{ kind: 'selfStatus', name: st[0], durationSec: st[1] }],
          },
        ];
      }
      return [s, ov];
    })
  );
  overrides[TEAM[CARRIER]] = {
    slug: TEAM[CARRIER],
    skill1: [
      {
        slot: 'skill1',
        trigger: { kind: 'interval', sec: 2 },
        target,
        effects: [
          { kind: 'buff', stat: 'atkPct', value: MARK, durationSec: 1 },
        ],
      },
    ],
    skill2: [],
    burst: [],
  } as any;
  runComp({
    slugs: TEAM,
    bossElement: 'Iron',
    overrides,
    cfg: { disableBursts: true, onEvent: (e) => events.push(e) },
  });
  const marked = events.filter(
    (e): e is BuffApply =>
      e.kind === 'buffApply' && e.stat === 'atkPct' && e.value === MARK
  );
  const first = Math.min(...marked.map((e) => e.frame));
  return marked
    .filter((e) => e.frame === first)
    .map((e) => e.targetIdx as number)
    .sort();
}

describe('alliesInStatus target ([self and] all allies in the <Name> state)', () => {
  it('fixture: five distinct units', () => {
    expect(new Set(TEAM).size).toBe(5);
  });

  it('DISCRIMINATING: only the ally with an OPEN matching-prefix status (not lapsed, not another name, not self)', () => {
    expect(
      holders({ kind: 'alliesInStatus', statusPrefix: 'Into the Fray' })
    ).toEqual([0]);
  });

  it('DISCRIMINATING: includeSelf adds the owner unconditionally (it carries no status)', () => {
    expect(
      holders({
        kind: 'alliesInStatus',
        statusPrefix: 'Into the Fray',
        includeSelf: true,
      })
    ).toEqual([0, CARRIER]);
  });

  it('the prefix is the match key: a full mode name selects only that mode', () => {
    expect(
      holders({
        kind: 'alliesInStatus',
        statusPrefix: 'Goddess Blessing',
      })
    ).toEqual([3]);
  });

  it('contrast: plain allies covers all five (a different target)', () => {
    expect(holders({ kind: 'allies' })).toEqual([0, 1, 2, 3, 4]);
  });

  it('validator: alliesInStatus needs a non-empty statusPrefix', () => {
    const ctx = { characterSlugs: new Set(['x']), squadOf: () => undefined };
    const mk = (target: unknown) =>
      structuralCheck(
        'x',
        {
          note: 'fixture',
          unmodeled: { skill1: [], skill2: [], burst: [] },
          skill1: [
            {
              slot: 'skill1',
              trigger: { kind: 'battleStart' },
              target,
              effects: [{ kind: 'buff', stat: 'atkPct', value: 1 }],
            },
          ],
          skill2: [],
          burst: [],
        },
        ctx
      ).errors.filter(
        (m: string) => m.includes('target') || m.includes('statusPrefix')
      );
    expect(
      mk({ kind: 'alliesInStatus', statusPrefix: 'Into the Fray' })
    ).toEqual([]);
    expect(
      mk({ kind: 'alliesInStatus' }).some((m: string) =>
        m.includes('statusPrefix')
      )
    ).toBe(true);
    expect(
      mk({ kind: 'alliesInStatus', statusPrefix: ' ' }).some((m: string) =>
        m.includes('statusPrefix')
      )
    ).toBe(true);
  });
});
