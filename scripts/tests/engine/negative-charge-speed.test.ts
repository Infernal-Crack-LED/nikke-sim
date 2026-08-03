// Functional test for NEGATIVE Charge Speed — "Charge Speed ▼ X%" DOWNSIDE kit lines.
//
// THE MODEL. Charge Speed is SUBTRACTIVE on charge TIME, not a reciprocal rate scaling:
// `effectiveFrames = round(chargeFrames x (1 - sumCS/100))`, floored at 1 frame (decoded game data
// + einkk — `StatChargeTime` is a negative % on charge TIME). That formula already extends to
// negative sums with no special case: ▼300% gives `1 - (-300)/100 = 4`, i.e. a 4x longer charge.
// (A reciprocal model `100/(100+pct)` would go NEGATIVE at -300 and is NOT what this engine
// implements, so it is not the extension used here.)
//
// WHAT THE OLD `Math.max(0, …)` LOWER CLAMP WAS DOING. Nothing protective — the arithmetic is safe
// either way, and this test is the proof:
//   - no divide-by-zero: `cs` only ever appears as `1 - cs/100`, a multiplication;
//   - no zero/negative charge time: `Math.max(1, …)` already floors the result at one frame, and a
//     negative `cs` makes the product LARGER, never smaller;
//   - no hang: the charge advances exactly one frame per simulated frame and `needed` is only
//     compared against, so a larger `needed` means fewer shots, never a loop.
// The UPPER clamp (`Math.min(100, …)`) is a real rule and stays: excess past 100% does nothing.
//
// FIXTURE. The control comp with `alice` (Alice, SR/Fire — NOT `alice-wonderland-bunny`) as the B3
// carry, her kit REPLACED by a single synthetic passive so the ONLY charge-speed source in the
// fight is the value under test. Her datamined chargeFrames is 90 and, as a release-fired SR, she
// pays the engine-wide 22-frame release latency after each shot — so the steady-state gap between
// consecutive shots inside a magazine is `needed + 22` frames, which is directly assertable off the
// `shot` event log.
//
// Deterministic (no seed) => byte-stable => equality assertions are legal.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { controlComp, data, runComp, unitOf } from '../lib/harness.js';

const CARRY = 'alice';
const CHARGE_FRAMES = data.characters[CARRY].chargeFrames; // 90
const RELEASE_LATENCY = 22; // SR/RL release-fired bolt-cycle recovery (sim.ts SR_BOLT_RECOVERY_FRAMES)

type ShotEvent = Extract<SimEvent, { kind: 'shot' }>;

/** `alice` with an empty kit plus one always-on Charge Speed buff of `pct`. */
const kit = (pct: number | null) =>
  ({
    slug: CARRY,
    skill1:
      pct === null
        ? []
        : [
            {
              slot: 'skill1',
              trigger: { kind: 'passive' },
              target: { kind: 'self' },
              effects: [{ kind: 'buff', stat: 'chargeSpeedPct', value: pct }],
            },
          ],
    skill2: [],
    burst: [],
  }) as never;

function run(pct: number | null) {
  const ev: SimEvent[] = [];
  const res = runComp({
    ...controlComp(CARRY),
    overrides: { [CARRY]: kit(pct) },
    cfg: { onEvent: (e) => ev.push(e) },
  });
  const shots = ev.filter(
    (e): e is ShotEvent => e.kind === 'shot' && e.slug === CARRY
  );
  // Modal gap between consecutive shots = the steady-state cycle inside a magazine (reload gaps
  // and the first shot's extra start-of-bolt frames are outliers and lose the vote).
  const gaps = shots.slice(1).map((s, i) => s.frame - shots[i].frame);
  const tally = new Map<number, number>();
  for (const g of gaps) {
    tally.set(g, (tally.get(g) ?? 0) + 1);
  }
  const modalGap = [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return { res, unit: unitOf(res, CARRY), shots, modalGap };
}

/** The engine's model, restated independently of the engine. */
const expectedCycle = (pct: number) =>
  Math.max(1, Math.round(CHARGE_FRAMES * (1 - Math.min(100, pct) / 100))) +
  RELEASE_LATENCY;

describe('negative chargeSpeedPct ("Charge Speed ▼" downsides)', () => {
  const none = run(null);

  it('a NEGATIVE charge speed lengthens the charge — the whole point', () => {
    // Without the widened clamp this is the failing assertion: a negative sum was floored to 0,
    // so ▼300% was indistinguishable from no buff at all.
    const slowed = run(-300);
    expect(slowed.unit.pulls).toBeLessThan(none.unit.pulls);
    expect(slowed.modalGap).toBeGreaterThan(none.modalGap);
  });

  it('DISCRIMINATING: the cycle follows the SUBTRACTIVE model at every step of a ladder', () => {
    // -100 -> 2x charge, -200 -> 3x, -300 -> 4x. A reciprocal or a clamped model breaks somewhere
    // on this ladder; matching all four points (including 0) pins the formula, not just the sign.
    for (const pct of [0, -100, -200, -300]) {
      const r = run(pct);
      expect(r.modalGap, `pct=${pct}`).toBe(expectedCycle(pct));
    }
  });

  it('is strictly monotonic — every step slower means strictly fewer shots', () => {
    const ladder = [0, -50, -100, -200, -300].map((p) => run(p).unit.pulls);
    const breaks = ladder
      .slice(1)
      .map((n, i) => (n < ladder[i] ? null : i + 1))
      .filter((x) => x !== null);
    expect(breaks, `ladder ${ladder.join(' -> ')}`).toEqual([]);
  });

  it('RULE PIN: excess past 100% still does nothing', () => {
    // The real rule the old clamp expressed, and it survives widening the floor.
    // Stated honestly: this is a RULE PIN, not a discriminating test of the `Math.min(100, …)`
    // clamp — bite-verification showed the clamp is behaviourally REDUNDANT with the
    // `Math.max(1, …)` frame floor under the subtractive model (any cs >= 100 drives the product
    // to <= 0, which the floor lifts to 1 either way), so removing either guard alone leaves this
    // assertion green. It still earns its place: it fails under a DIFFERENT charge-time model
    // (a reciprocal one prices 150% and 100% differently), which is the change most likely to
    // arrive here.
    expect(run(150).modalGap).toBe(run(100).modalGap);
    expect(run(150).unit.pulls).toBe(run(100).unit.pulls);
  });

  it('an extreme negative degrades safely — finite damage, no hang, no negative cycle', () => {
    // A charge longer than the whole fight must simply yield no shots, not NaN/Infinity or a loop.
    const absurd = run(-1_000_000);
    expect(absurd.unit.pulls).toBe(0);
    expect(Number.isFinite(absurd.unit.totalDamage)).toBe(true);
    expect(absurd.unit.breakdown.normal).toBe(0);
  });

  it('a POSITIVE charge speed is unchanged by the widened clamp', () => {
    // Every existing carrier authors a positive value, so this is the inertness property that
    // matters for the roster; the regression snapshot is the whole-board control.
    for (const pct of [3.81, 13.01, 35.88, 80.15, 100]) {
      expect(run(pct).modalGap, `pct=${pct}`).toBe(expectedCycle(pct));
    }
  });
});
