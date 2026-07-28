// build-code round-trip — pins that optional fields nikke-sim added survive
// encode/decode. bakery-bot's forked copy of this codec is missing bossRange
// and silently DROPS it on decode (BUILD_VERSION is 1 in both, so nothing
// rejects) — this test is the tripwire if that class of drift ever lands here.
import { describe, expect, it } from 'vitest';
import {
  BUILD_VERSION,
  decodeBuild,
  encodeBuild,
  type Build,
} from '../../../src/share/build-code.js';

const build: Build = {
  v: BUILD_VERSION,
  g: {
    weakness: 'Iron',
    bossDef: '240',
    core: 1,
    coreCustom: false,
    coreCustomVal: '',
    level: '801',
    bossRange: 'midfar',
  },
  s: Array.from({ length: 5 }, () => ({
    slug: 'liter',
    cubeId: 'resilience',
    cubeLevel: 15,
    ol: 0 as const,
    doll: false,
    stars: 3,
    core: 1,
    skill1: 10,
    skill2: 10,
    burst: 10,
  })),
  rosterMode: 'union',
  unionBoss: [
    {
      weakness: 'Fire',
      bossDef: '240',
      core: 1,
      coreCustom: false,
      coreCustomVal: '',
      bossRange: 'near',
    },
  ],
};

describe('build-code codec', () => {
  it('round-trips bossRange (globals + per-team union boss)', () => {
    const decoded = decodeBuild(encodeBuild(build));
    expect(decoded).not.toBeNull();
    expect(decoded!.g.bossRange).toBe('midfar');
    expect(decoded!.unionBoss?.[0]?.bossRange).toBe('near');
  });

  it('decodes codes written before bossRange existed', () => {
    const legacy = structuredClone(build);
    delete legacy.g.bossRange;
    delete legacy.unionBoss;
    const decoded = decodeBuild(encodeBuild(legacy));
    expect(decoded).not.toBeNull();
    expect(decoded!.g.bossRange).toBeUndefined();
  });
});
