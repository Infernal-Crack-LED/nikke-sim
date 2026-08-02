// Engine-primitive regression: forceStage vs lambdaStage asymmetry in stage-targeted buffs.
//
// `countsAsStage` (src/engine/sim.ts) is the only semantic difference between the two
// stage-override paths. forceStage is honored at any stage; lambdaStage on a Λ unit only
// counts as B3 (legacy). This test pins both halves with the SAME stage-2 burst-caster buff
// so the asymmetry fails the moment lambdaStage starts being honored like forceStage.
import { describe, expect, it } from 'vitest';
import type { SimConfig, SimEvent } from '../../../src/types.js';
import { runSim } from '../../../src/engine/sim.js';
import { prepareTeam, type UnitOptions } from '../../../src/prepare.js';
import type { OverrideFile } from '../../../src/skills/index.js';
import {
  data,
  mult,
  deps,
  withPatchedOverride,
  bareWeaponOverride,
} from '../lib/harness.js';
import { scopeLockCfg } from '../../lib/scope-lock.js';

const SUPPORT = 'ada';
const POSITIVE_CONTROL = 'anis-star';
const B1_INERT = 'emma';
const B3_INERT = 'snow-crane';

function emptyKitOverride(slug: string): OverrideFile {
  return withPatchedOverride(slug, (ov) => {
    ov.skill1 = [];
    ov.skill2 = [];
    ov.burst = [];
  });
}

function stageTwoSupportOverride(): OverrideFile {
  return withPatchedOverride(SUPPORT, (ov) => {
    ov.skill1 = [];
    ov.skill2 = [];
    ov.burst = [
      {
        slot: 'burst',
        trigger: { kind: 'burstCast' },
        target: { kind: 'burstCasters', stage: 2 },
        effects: [
          {
            kind: 'buff',
            stat: 'attackDamagePct',
            value: 100,
            durationSec: 10,
          },
        ],
      },
    ];
  });
}

function countBuffsTo(
  events: SimEvent[],
  stat: string,
  targetSlug: string
): number {
  return events.filter(
    (e): e is Extract<SimEvent, { kind: 'buffApply' }> =>
      e.kind === 'buffApply' && e.stat === stat && e.targetSlug === targetSlug
  ).length;
}

interface StageRunResult {
  testedBuffs: number;
  positiveControlBuffs: number;
}

function runStageRun(
  testedSlug: string,
  stageOverride: { forceStage: 2 } | { lambdaStage: 2 }
): StageRunResult {
  // Slot order matters: the positive-control unit must sit left of the Λ unit
  // so the rotation builder picks it first when both are eligible for B2.
  const slugs =
    testedSlug === POSITIVE_CONTROL
      ? [SUPPORT, POSITIVE_CONTROL, B1_INERT, B3_INERT]
      : [SUPPORT, POSITIVE_CONTROL, testedSlug, B1_INERT, B3_INERT];

  const overrides: Record<string, OverrideFile | undefined> = {
    [SUPPORT]: stageTwoSupportOverride(),
    [testedSlug]: emptyKitOverride(testedSlug),
    [POSITIVE_CONTROL]:
      testedSlug === POSITIVE_CONTROL
        ? emptyKitOverride(POSITIVE_CONTROL)
        : withPatchedOverride(POSITIVE_CONTROL, (ov) => {
            ov.skill1 = [];
            ov.skill2 = [];
            ov.burst = [];
          }),
    [B1_INERT]: bareWeaponOverride(B1_INERT),
    [B3_INERT]: bareWeaponOverride(B3_INERT),
  };

  const chars = slugs.map((s) => {
    const c = data.characters[s];
    if (!c) {
      throw new Error(`${s} not in characters.json`);
    }
    return c;
  });

  const unitOpts: UnitOptions[] = slugs.map((s) => {
    if (s === testedSlug) {
      return { ol: 'base5', doll: false, ...stageOverride };
    }
    if (s === POSITIVE_CONTROL && testedSlug !== POSITIVE_CONTROL) {
      return { ol: 'base5', doll: false, forceStage: 2 };
    }
    return { ol: 'base5', doll: false };
  });
  const prepared = prepareTeam(chars, unitOpts, { overrides, ...deps });

  const events: SimEvent[] = [];
  const cfg: SimConfig = scopeLockCfg(slugs, null, {
    focusSlug: SUPPORT,
    onEvent: (e) => events.push(e),
  });
  runSim(chars, mult, cfg, prepared);

  return {
    testedBuffs: countBuffsTo(events, 'attackDamagePct', testedSlug),
    positiveControlBuffs: countBuffsTo(
      events,
      'attackDamagePct',
      POSITIVE_CONTROL
    ),
  };
}

describe('stage-targeted burst-caster buff selection', () => {
  it('forceStage=2 lets a non-Λ unit be selected by a stage-2 burst-caster buff', () => {
    const r = runStageRun(POSITIVE_CONTROL, { forceStage: 2 });
    expect(
      r.testedBuffs,
      'anis-star forced to B2 should be targeted as stage 2'
    ).toBeGreaterThan(0);
  });

  it('lambdaStage=2 on a Λ unit does NOT count as stage 2', () => {
    const r = runStageRun('red-hood', { lambdaStage: 2 });
    expect(
      r.positiveControlBuffs,
      'the forceStage=2 positive control should be targeted as stage 2'
    ).toBeGreaterThan(0);
    expect(
      r.testedBuffs,
      'red-hood pinned to B2 via lambdaStage should NOT be targeted as stage 2'
    ).toBe(0);
  });
});
