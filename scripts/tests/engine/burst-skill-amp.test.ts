// Burst-Skill-Damage amplifiers (jackal / trina family, landed 2026-08-10 — faithfulness
// audit F3): `burstSkillSingleDamagePct` / `burstSkillAoeDamagePct` are additive Damage-Up
// terms read ONLY by burst-slot damage instances carrying the matching `burstDesc` scope tag
// ("Affects 1 enemy unit(s)" vs "Affects all enemies" in the amplified skill's own kit
// description). ⚑ additive placement follows the documented "○○ Damage ▲" family rule
// (docs/data/nikke-damage-formula.md §2) — not yet popup-measured for these two members.
//
// Method: the control comp; the carry's burst replaced by ONE synthetic nuke (tagged or
// untagged), a support granted a synthetic PASSIVE amp (always-on, so no window-timing
// coupling). The amp buff feeds no gauge and changes no cadence, so arms differ only in the
// nuke's own dmgUp — event streams align frame-for-frame and the delta is exact arithmetic.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { controlComp, runComp, withPatchedOverride } from '../lib/harness.js';

type DamageEvent = Extract<SimEvent, { kind: 'damage' }>;

const CARRY = 'ada';
const PRODUCER = 'liter';

function nukeEvents(opts: {
  tag?: 'singleEnemy' | 'allEnemies';
  ampStat?: 'burstSkillSingleDamagePct' | 'burstSkillAoeDamagePct';
}) {
  const carry = withPatchedOverride(CARRY, (ov) => {
    ov.burst = [
      {
        slot: 'burst',
        trigger: { kind: 'burstCast' },
        target: { kind: 'enemy' },
        effects: [
          {
            kind: 'flatDamage',
            atkPct: 100,
            ...(opts.tag ? { burstDesc: opts.tag } : {}),
          },
        ],
      },
    ];
  });
  const producer = withPatchedOverride(PRODUCER, (ov) => {
    if (opts.ampStat) {
      ov.skill1.push({
        slot: 'skill1',
        trigger: { kind: 'passive' },
        target: { kind: 'allies' },
        effects: [{ kind: 'buff', stat: opts.ampStat, value: 435.6 }],
      });
    }
  });
  const events: SimEvent[] = [];
  runComp({
    ...controlComp(CARRY),
    overrides: { [CARRY]: carry, [PRODUCER]: producer },
    cfg: { onEvent: (e) => events.push(e) },
  });
  return events.filter(
    (e): e is DamageEvent =>
      e.kind === 'damage' && e.slug === CARRY && e.srcSlot === 'burst'
  );
}

describe('burst-skill-damage amp (burstDesc scope tag → burstSkill*DamagePct in Damage Up)', () => {
  const plainTagged = nukeEvents({ tag: 'allEnemies' });
  const ampedTagged = nukeEvents({
    tag: 'allEnemies',
    ampStat: 'burstSkillAoeDamagePct',
  });
  const ampedUntagged = nukeEvents({ ampStat: 'burstSkillAoeDamagePct' });
  const plainUntagged = nukeEvents({});
  const crossScope = nukeEvents({
    tag: 'allEnemies',
    ampStat: 'burstSkillSingleDamagePct',
  });

  it('a tagged burst nuke inside an amp reads EXACTLY +435.6 additive percentage points of Damage Up', () => {
    expect(plainTagged.length).toBeGreaterThan(0);
    expect(ampedTagged.length).toBe(plainTagged.length);
    for (let i = 0; i < plainTagged.length; i++) {
      expect(ampedTagged[i].frame).toBe(plainTagged[i].frame);
      expect(ampedTagged[i].mult.dmgUp).toBeCloseTo(
        plainTagged[i].mult.dmgUp + 4.356,
        9
      );
    }
  });

  it('an UNTAGGED burst nuke reads no amp at all — the tag is the eligibility, not the buff', () => {
    expect(plainUntagged.length).toBeGreaterThan(0);
    expect(ampedUntagged.map((e) => [e.frame, e.mult.dmgUp])).toEqual(
      plainUntagged.map((e) => [e.frame, e.mult.dmgUp])
    );
  });

  it('DISCRIMINATING (scope): the single-enemy amp never reaches an all-enemies-tagged nuke', () => {
    expect(crossScope.map((e) => [e.frame, e.mult.dmgUp])).toEqual(
      plainTagged.map((e) => [e.frame, e.mult.dmgUp])
    );
  });

  it('the tag alone changes nothing without an amp in the comp (safe roster-wide tagging)', () => {
    expect(plainTagged.map((e) => [e.frame, e.mult.dmgUp])).toEqual(
      plainUntagged.map((e) => [e.frame, e.mult.dmgUp])
    );
  });
});
