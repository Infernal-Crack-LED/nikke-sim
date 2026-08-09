// Engine-primitive backfill: `hitCount.perPull` — the SG pull-vs-pellet lever.
//
// SG sprays fire `hitsPerShot` pellets per trigger pull. Kit lines that read
// "after N normal attacks" are ambiguous: they may count pellets (historical
// default in this engine) or trigger pulls. `perPull:true` opts a hitCount
// trigger into the pull reading without scaling the count by `hitsPerShot`.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, withPatchedOverride } from '../lib/harness.js';

const SG = 'drake';
const OTHER = 'crown';
const FPS = 60;

type Damage = Extract<SimEvent, { kind: 'damage' }>;

function runPerPull(perPull: boolean) {
  const events: SimEvent[] = [];
  const override = withPatchedOverride(SG, (ov) => {
    ov.skill1 = [];
    ov.skill2 = [
      {
        slot: 'skill2',
        trigger: { kind: 'hitCount', count: 10, perPull },
        target: { kind: 'enemy' },
        effects: [{ kind: 'flatDamage', atkPct: 100 }],
      },
    ];
    ov.burst = [];
  });
  runComp({
    slugs: [SG, OTHER],
    bossElement: 'Iron',
    focusSlug: SG,
    overrides: { [SG]: override, [OTHER]: undefined },
    cfg: { disableBursts: true, onEvent: (e) => events.push(e) },
  });
  return events.filter(
    (e): e is Damage =>
      e.kind === 'damage' && e.slug === SG && e.bucket === 'skill'
  );
}

describe('hitCount.perPull SG lever', () => {
  it('pull reading fires once every `count` shots, pellet reading fires ~hitsPerShot× more often', () => {
    const pullProcs = runPerPull(true);
    const pelletProcs = runPerPull(false);
    expect(pullProcs.length).toBeGreaterThan(0);
    expect(pelletProcs.length).toBeGreaterThan(pullProcs.length * 5);
  });

  it('pull cadence is spaced by roughly count shots', () => {
    const procs = runPerPull(true);
    const first = procs[0].frame;
    expect(first).toBeGreaterThan(0);
    // At the SG class cadence (~1.5 pulls/s), 10 pulls ≈ 6.7s; allow a wide
    // tolerance because the first shot may land mid-magazine.
    const medianGap =
      (procs[procs.length - 1].frame - first) / (procs.length - 1);
    expect(medianGap).toBeGreaterThanOrEqual(5 * FPS);
    expect(medianGap).toBeLessThanOrEqual(10 * FPS);
  });
});
