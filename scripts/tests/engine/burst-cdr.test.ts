// Engine-primitive backfill: `burstCdr` — 14 override carriers (primitive census in
// docs/engine-modeling-gaps.md). "Burst cooldown ▼ N sec" lines are the only kit primitive that
// edits the ROTATION rather than a damage number, so an error here does not shift a unit's damage
// by a few percent — it changes how many Full Bursts the whole team gets, which is the one quantity
// the graded comps measure EXACTLY (measured-exact full-burst counts, CLAUDE.md verified facts).
//
// Method: the control comp (liter B1 / crown B2 / ada B3 / helm B3, two Burst III units alternating
// on a 40s cooldown) with ONE SYNTHETIC burstCdr block installed in ada's skill1 on a 5s interval.
// The rotation is the readout: `burstCast` events per unit and `fullBurstStart` count. Everything
// asserted below is a comparison BETWEEN arms of that fixture, never an absolute rotation claim —
// the graded-comp rotation pins are in scripts/regression.ts and are not duplicated here.
//
// Rules pinned:
//   1. Dose-response: a larger reduction never yields fewer casts for the holder.
//   2. It reaches the RESOLVED TARGET SET — `allies` buys the team a Full Burst that `self` does not.
//   3. `oncePerBattle` applies EXACTLY once: strictly more than not applying it, strictly less
//      than applying it every trigger. (Both bounds, or the flag could be a silent no-op either way.)
//   4. The reduction CLAMPS at zero — an absurd value makes the holder permanently ready and the
//      rotation, not the cooldown, becomes the binding constraint.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { controlComp, data, runComp, withPatchedOverride } from '../lib/harness.js';

const CARRY = 'ada';
const OTHER_B3 = 'helm';

interface Rotation {
  casts: Record<string, number>;
  fullBursts: number;
}

/** Run the control comp with a burstCdr probe on a 5s interval (omit `cdr` for the baseline). */
function rotation(cdr?: { seconds: number; oncePerBattle?: boolean }, target: unknown = { kind: 'allies' }): Rotation {
  const overrides = cdr
    ? {
        [CARRY]: withPatchedOverride(CARRY, (ov) => {
          ov.skill1 = [
            { trigger: { kind: 'interval', sec: 5 }, target, effects: [{ kind: 'burstCdr', ...cdr }] },
          ];
        }),
      }
    : undefined;
  const events: SimEvent[] = [];
  runComp({ ...controlComp(CARRY), overrides, cfg: { onEvent: (e) => events.push(e) } });
  const casts: Record<string, number> = {};
  let fullBursts = 0;
  for (const e of events) {
    if (e.kind === 'burstCast') casts[e.slug] = (casts[e.slug] ?? 0) + 1;
    else if (e.kind === 'fullBurstStart') fullBursts++;
  }
  return { casts, fullBursts };
}

const base = rotation();
const cdr2 = rotation({ seconds: 2 });
const cdr5 = rotation({ seconds: 5 });
const cdr5once = rotation({ seconds: 5, oncePerBattle: true });
const cdr5self = rotation({ seconds: 5 }, { kind: 'self' });
const huge = rotation({ seconds: 1000 });

describe('burstCdr (burst cooldown reduction)', () => {
  it('fixture check — two Burst III units share the stage on equal cooldowns', () => {
    // The whole readout depends on ada and helm alternating: whoever is off cooldown takes the
    // stage-3 slot. If they ever stop sharing it (a data change to either cooldown), the arms below
    // stop measuring cooldown pressure and this test would drift into asserting something else.
    expect(data.characters[CARRY].burstCooldownSec).toBe(data.characters[OTHER_B3].burstCooldownSec);
    expect(base.casts[CARRY], 'ada never cast').toBeGreaterThan(0);
    expect(base.casts[OTHER_B3], 'helm never cast').toBeGreaterThan(0);
  });

  it('is dose-responsive — a bigger reduction never buys the holder fewer casts', () => {
    const ladder = [base, cdr2, cdr5, huge].map((r) => r.casts[CARRY]);
    expect(
      ladder.every((n, i) => i === 0 || n >= ladder[i - 1]),
      `casts should be non-decreasing in the reduction: ${ladder.join(' → ')}`,
    ).toBe(true);
    expect(ladder[ladder.length - 1], `no gain at all across the ladder ${ladder.join(' → ')}`).toBeGreaterThan(
      ladder[0],
    );
  });

  it('DISCRIMINATING: the reduction reaches the RESOLVED target set, not everyone and not just self', () => {
    // Same 5s reduction, same trigger, only the target differs. Targeting `allies` additionally
    // takes time off the Burst I/II cooldowns, which is worth one more Full Burst over the fight;
    // targeting `self` leaves them alone. A globally-applied reduction makes the two arms identical.
    expect(cdr5self.casts[CARRY], 'the self-targeted arm did not move the holder at all').toBeGreaterThan(
      base.casts[CARRY],
    );
    expect(
      cdr5.fullBursts,
      `allies-targeted ${cdr5.fullBursts} FB vs self-targeted ${cdr5self.fullBursts} FB — the target ` +
        'set made no difference, so the reduction is not being routed through resolveTargets',
    ).toBeGreaterThan(cdr5self.fullBursts);
  });

  it('DISCRIMINATING: oncePerBattle applies EXACTLY once — bounded on both sides', () => {
    // Upper bound: fewer holder casts than applying it on every 5s trigger (the gate really fires).
    // Lower bound: still more Full Bursts than never applying it (the gate is not a no-op).
    // Only "exactly one application" satisfies both; a leaky gate fails the first, a dead one the
    // second, and either failure alone would otherwise look like a plausible pass.
    expect(
      cdr5once.casts[CARRY],
      `oncePerBattle gave the holder ${cdr5once.casts[CARRY]} casts, the same as applying it every ` +
        `trigger (${cdr5.casts[CARRY]}) — the once-gate leaks`,
    ).toBeLessThan(cdr5.casts[CARRY]);
    expect(
      cdr5once.fullBursts,
      `oncePerBattle produced ${cdr5once.fullBursts} Full Bursts vs ${base.fullBursts} with no ` +
        'reduction at all — its single application did nothing',
    ).toBeGreaterThan(base.fullBursts);
  });

  it('clamps at zero — an absurd reduction leaves the ROTATION as the binding constraint', () => {
    // max(0, cd - N): a 1000s reduction makes ada permanently ready, so she takes EVERY stage-3
    // slot and helm never gets one. Total stage-3 casts still equal the Full Burst count — the
    // rotation cannot manufacture extra stages out of a negative cooldown.
    expect(huge.casts[CARRY], 'ada did not take every stage-3 slot').toBe(huge.fullBursts);
    expect(huge.casts[OTHER_B3] ?? 0, 'helm still cast despite ada always being ready').toBe(0);
    expect(
      huge.fullBursts,
      `${huge.fullBursts} Full Bursts on an unbounded reduction vs ${cdr5.fullBursts} on a 5s one — ` +
        'the cooldown should already be saturated, so the extra reduction must buy nothing',
    ).toBe(cdr5.fullBursts);
  });
});
