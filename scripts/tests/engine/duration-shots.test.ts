// Functional test for the ROUND-COUNT buff-duration primitive (durationShots).
//
// "for N round(s)" kit lines expire after the HOLDER fires N rounds, not after a wall-clock
// window. The distinction is only observable when the N rounds span a RELOAD — which is exactly
// the case for `helm` (the SR/Water Helm, NOT helm-aquamarine): her burst grants Charge Damage
// Multiplier ▲158.4% "for 10 round(s)" and her magazine is 6, so the window covers ~6 charged
// shots, a reload, then ~4 more. A durationSec approximation either truncates at the reload or
// overshoots past the 10th round.
//
// Fixture: the control comp (liter / crown / ada / helm) so helm actually casts her burst — a
// lone Burst III never bursts. Only helm's burst block is patched in memory; her committed
// override JSON is untouched. Deterministic EV runs (no seed) so totals are byte-stable.
//
// Assertions:
//   1. MECHANISM LIVE     — more rounds ⇒ more damage (durationShots 1 < 10).
//   2. PER-ROUND DECREMENT — damage is STRICTLY monotonic across N = 1..10. A time proxy, or a
//      decrement that fired on anything other than her own rounds, would plateau somewhere in
//      that ladder; one extra round must always buy exactly one more buffed charged shot.
//   3. SPANS THE RELOAD   — durationShots 10 beats the durationSec 13 model it replaces. 13s
//      covers ~7 charged shots at her measured 90-frame bolt cycle once the mid-window reload is
//      paid, so a round count that survived the reload MUST score higher. This is the assertion
//      that actually discriminates rounds from seconds.
//   4. SELF-SCOPED/INERT  — her teammates are byte-identical across every N. The buff targets
//      self, so a decrement that leaked onto other units (or a shared budget) would move them.
//      Inertness for units with NO round-scoped buff is proven separately by the regression
//      snapshot being byte-identical for every non-carrier.
import { describe, expect, it } from 'vitest';
import { controlComp, runComp, totals, withPatchedOverride } from '../lib/harness.js';

const CARRY = 'ada';
const TEAMMATES = ['liter', 'crown', CARRY];

/**
 * Run the control comp with helm's burst Charge-Damage window scoped by `window`:
 * either a round count (`{ shots: N }`) or the wall-clock model it replaced (`{ sec: S }`).
 * Returns every unit's total damage.
 */
function run(window: { shots: number } | { sec: number }): Record<string, number> {
  const helm = withPatchedOverride('helm', (ov) => {
    const buff = ov.burst
      .flatMap((b: any) => b.effects)
      .find((e: any) => e.stat === 'chargeDamageMultPct');
    if (!buff) throw new Error('helm burst chargeDamageMultPct block missing — fixture is stale');
    delete buff.durationShots;
    delete buff.durationSec;
    if ('shots' in window) buff.durationShots = window.shots;
    else buff.durationSec = window.sec;
  });
  return totals(runComp({ ...controlComp(CARRY), overrides: { helm } }));
}

describe('durationShots (round-count buff duration)', () => {
  const ladder = Array.from({ length: 10 }, (_, i) => run({ shots: i + 1 }));
  const helmDmg = ladder.map((r) => r.helm);

  it('mechanism is live — more rounds ⇒ more damage', () => {
    expect(
      helmDmg[9],
      `1 round ${(helmDmg[0] / 1e6).toFixed(1)}M should be < 10 rounds ${(helmDmg[9] / 1e6).toFixed(1)}M`,
    ).toBeGreaterThan(helmDmg[0]);
  });

  it('is strictly monotonic across N=1..10 — every added round buys another buffed charged shot', () => {
    // A time proxy, or a decrement fired on something other than her own rounds, plateaus somewhere.
    const breaks = helmDmg.slice(1).map((d, i) => (d > helmDmg[i] ? null : i + 2)).filter(Boolean);
    expect(
      breaks,
      `no gain at N=${breaks.join(',')} (a time proxy or a mis-scoped decrement); ladder ${helmDmg.map((d) => (d / 1e6).toFixed(0)).join(' → ')}M`,
    ).toEqual([]);
  });

  it('DISCRIMINATING: 10 rounds spans the reload — beats the durationSec 13 model it replaced', () => {
    const bySec = run({ sec: 13 }).helm;
    expect(
      helmDmg[9],
      `10 rounds ${(helmDmg[9] / 1e6).toFixed(1)}M should exceed durationSec 13 ${(bySec / 1e6).toFixed(1)}M`,
    ).toBeGreaterThan(bySec);
  });

  it('is self-scoped — teammates are byte-identical across every N', () => {
    // The buff targets self, so a decrement leaking onto other units (or a shared budget) moves them.
    const drifted = TEAMMATES.filter((s) => new Set(ladder.map((r) => r[s])).size > 1);
    expect(
      drifted,
      `round budget LEAKED onto ${drifted.join(', ')} — the decrement is not holder-scoped`,
    ).toEqual([]);
  });
});
