// Engine-primitive regression: forceStage vs lambdaStage asymmetry in stage-targeted buffs.
//
// `countsAsStage` (src/engine/sim.ts) is the only semantic difference between the two
// stage-override paths. forceStage is honored at any stage; lambdaStage on a Λ unit only
// counts as B3 (legacy). This test pins both halves with burst-caster buffs so the
// asymmetry fails the moment lambdaStage starts being honored like forceStage.
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

const SUPPORT_B2 = 'crown';
const SUPPORT_B3 = 'ada';
const B1_INERT = 'emma';
const B1_EXTRA = 'claire';
const B3_INERT = 'snow-crane';

function emptyKitOverride(slug: string): OverrideFile {
  return withPatchedOverride(slug, (ov) => {
    ov.skill1 = [];
    ov.skill2 = [];
    ov.burst = [];
  });
}

function stageTargetSupportOverride(
  supportSlug: string,
  stage: 1 | 2
): OverrideFile {
  return withPatchedOverride(supportSlug, (ov) => {
    ov.skill1 = [];
    ov.skill2 = [];
    ov.burst = [
      {
        slot: 'burst',
        trigger: { kind: 'burstCast' },
        target: { kind: 'burstCasters', stage },
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

function countStageCasts(
  events: SimEvent[],
  slug: string,
  stage: number
): number {
  return events.filter(
    (e) => e.kind === 'burstCast' && e.slug === slug && e.stage === stage
  ).length;
}

interface StageRunResult {
  testedBuffs: number;
  testedCasts: number;
}

function runStageRun(
  testedSlug: string,
  supportSlug: string,
  targetStage: 1 | 2,
  stageOverride: { forceStage: 1 | 2 } | { lambdaStage: 1 | 2 }
): StageRunResult {
  // Build a legal team around the support's stage:
  //   B2 support (stage-1 target): [support, tested(B1 forced), B3, B1 inert, B3 inert]
  //   B3 support (stage-2 target): [support, tested(B2), B1 inert, B1 extra, B3 inert]
  const slugs =
    supportSlug === SUPPORT_B2
      ? [supportSlug, testedSlug, SUPPORT_B3, B1_INERT, B3_INERT]
      : [supportSlug, testedSlug, B1_INERT, B1_EXTRA, B3_INERT];

  const overrides: Record<string, OverrideFile | undefined> = {
    [supportSlug]: stageTargetSupportOverride(supportSlug, targetStage),
    [testedSlug]: emptyKitOverride(testedSlug),
    [B1_INERT]: bareWeaponOverride(B1_INERT),
    [B3_INERT]: bareWeaponOverride(B3_INERT),
  };
  if (supportSlug === SUPPORT_B2) {
    overrides[SUPPORT_B3] = emptyKitOverride(SUPPORT_B3);
  }
  if (supportSlug === SUPPORT_B3) {
    overrides[B1_EXTRA] = bareWeaponOverride(B1_EXTRA);
  }

  const chars = slugs.map((s) => {
    const c = data.characters[s];
    if (!c) {
      throw new Error(`${s} not in characters.json`);
    }
    return c;
  });

  const unitOpts: UnitOptions[] = slugs.map((s) =>
    s === testedSlug
      ? { ol: 'base5', doll: false, ...stageOverride }
      : { ol: 'base5', doll: false }
  );
  const prepared = prepareTeam(chars, unitOpts, { overrides, ...deps });

  const events: SimEvent[] = [];
  const cfg: SimConfig = scopeLockCfg(slugs, null, {
    focusSlug: supportSlug === SUPPORT_B2 ? SUPPORT_B3 : SUPPORT_B3,
    onEvent: (e) => events.push(e),
  });
  runSim(chars, mult, cfg, prepared);

  return {
    testedBuffs: countBuffsTo(events, 'attackDamagePct', testedSlug),
    testedCasts: countStageCasts(events, testedSlug, targetStage),
  };
}

describe('stage-targeted burst-caster buff selection', () => {
  it('forceStage=1 lets a non-Λ unit be selected by a stage-1 burst-caster buff', () => {
    const r = runStageRun('anis-star', SUPPORT_B2, 1, { forceStage: 1 });
    expect(
      r.testedBuffs,
      'anis-star forced to B1 should be targeted as stage 1'
    ).toBeGreaterThan(0);
  });

  it('forceStage=2 lets a non-Λ unit be selected by a stage-2 burst-caster buff', () => {
    const r = runStageRun('crown', SUPPORT_B3, 2, { forceStage: 2 });
    expect(
      r.testedBuffs,
      'crown forced to B2 should be targeted as stage 2'
    ).toBeGreaterThan(0);
  });

  it('lambdaStage=2 on a Λ unit does NOT count as stage 2, even when it casts at stage 2', () => {
    const r = runStageRun('red-hood', SUPPORT_B3, 2, { lambdaStage: 2 });
    expect(
      r.testedCasts,
      'red-hood pinned to B2 via lambdaStage should actually cast at stage 2'
    ).toBeGreaterThan(0);
    expect(
      r.testedBuffs,
      'red-hood pinned to B2 via lambdaStage should NOT be targeted as stage 2'
    ).toBe(0);
  });
});
