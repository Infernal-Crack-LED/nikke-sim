// Engine-primitive regression: forceStage vs lambdaStage asymmetry in stage-targeted buffs.
//
// `countsAsStage` (src/engine/sim.ts) is the only semantic difference between the two
// stage-override paths. forceStage is honored at any stage; lambdaStage on a Λ unit only
// counts as B3 (legacy). This test pins both halves with a stage-1 burst-caster buff so
// the asymmetry cannot silently invert when a future kit adds stage targeting.
import { describe, expect, it } from 'vitest';
import type { SimConfig, SimEvent } from '../../../src/types.js';
import { runSim } from '../../../src/engine/sim.js';
import { prepareTeam, type UnitOptions } from '../../../src/prepare.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import type { OverrideFile } from '../../../src/skills/index.js';
import {
  data,
  mult,
  deps,
  withPatchedOverride,
  bareWeaponOverride,
} from '../lib/harness.js';
import { scopeLockCfg } from '../../lib/scope-lock.js';

function emptyKitOverride(slug: string): OverrideFile {
  const base = loadOverride(slug);
  if (!base) {
    throw new Error(`${slug}: no override on disk — fixture is stale`);
  }
  const clone = JSON.parse(JSON.stringify(base));
  clone.skill1 = [];
  clone.skill2 = [];
  clone.burst = [];
  return clone as OverrideFile;
}

function stageOneSupportOverride(slug: string): OverrideFile {
  return withPatchedOverride(slug, (ov) => {
    ov.skill1 = [];
    ov.skill2 = [];
    ov.burst = [
      {
        slot: 'burst',
        trigger: { kind: 'burstCast' },
        target: { kind: 'burstCasters', stage: 1 },
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

interface StageRun {
  testedSlug: string;
  supportSlug: string;
  stageOverride: { forceStage: 1 | 2 | 3 } | { lambdaStage: 1 | 2 | 3 };
  expectBuff: boolean;
}

function runStageRun({
  testedSlug,
  supportSlug,
  stageOverride,
  expectBuff,
}: StageRun) {
  const b3 = 'ada';
  const inert = ['emma', 'snow-crane'];
  const slugs = [supportSlug, testedSlug, b3, ...inert];

  const overrides: Record<string, OverrideFile | undefined> = {
    [supportSlug]: stageOneSupportOverride(supportSlug),
    [testedSlug]: emptyKitOverride(testedSlug),
    [b3]: emptyKitOverride(b3),
  };
  for (const s of inert) {
    overrides[s] = bareWeaponOverride(s);
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
      ? {
          ol: 'base5',
          doll: false,
          ...stageOverride,
        }
      : { ol: 'base5', doll: false }
  );
  const prepared = prepareTeam(chars, unitOpts, { overrides, ...deps });

  const events: SimEvent[] = [];
  const cfg: SimConfig = scopeLockCfg(slugs, null, {
    focusSlug: b3,
    onEvent: (e) => events.push(e),
  });
  const result = runSim(chars, mult, cfg, prepared);

  const buffsToTested = events.filter(
    (e): e is Extract<SimEvent, { kind: 'buffApply' }> =>
      e.kind === 'buffApply' &&
      e.stat === 'attackDamagePct' &&
      e.targetSlug === testedSlug
  );

  return { result, events, buffsToTested, expectBuff };
}

describe('stage-targeted burst-caster buff selection', () => {
  it('forceStage=1 lets a non-Λ unit be selected by a stage-1 burst-caster buff', () => {
    const r = runStageRun({
      testedSlug: 'anis-star',
      supportSlug: 'crown',
      stageOverride: { forceStage: 1 },
      expectBuff: true,
    });
    expect(
      r.buffsToTested.length,
      'anis-star forced to B1 should be targeted as stage 1'
    ).toBeGreaterThan(0);
  });

  it('lambdaStage=2 on a Λ unit does NOT count as stage 1', () => {
    const r = runStageRun({
      testedSlug: 'red-hood',
      supportSlug: 'liter',
      stageOverride: { lambdaStage: 2 },
      expectBuff: false,
    });
    expect(
      r.buffsToTested.length,
      'red-hood pinned to B2 via lambdaStage should NOT be targeted as stage 1'
    ).toBe(0);
  });
});
