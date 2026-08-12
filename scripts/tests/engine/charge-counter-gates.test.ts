// chargeCounter routes through applyBlock (faithfulness audit F2.1, closed 2026-08-11).
//
// The trigger used to dispatch straight to `applyEffect`. A direct `blockGatesPass` call was added
// 2026-08-10 so the runtime abort-gates were honored, but `everyN`, `everyNOffset` and the
// block-level `delaySec` were still silently skipped — a field that looks live in the JSON and
// never runs. The validator hard-errored on the combination to keep anyone from authoring it.
//
// Now the dispatch calls `applyBlock` like every other trigger, passing a `phase` argument that
// selects the ONE effect this trigger fires per activation (`block.effects` is an ordered phase
// list here, not a set). The validator rule is gone in the same change.
//
// The change is behaviour-neutral for all 12 shipped chargeCounter carriers — none carries any of
// the newly-live fields (census: `blockOrderPairs`-style scan over src/skills/overrides, and the
// regression snapshot is the roster-wide control). That is exactly why it needs THIS file: a
// behaviour-neutral change is unfalsifiable without a fixture that exercises what it enabled.
//
// Fixture: `scarlet-black-shadow` (RL/Wind, Burst III) — the only carrier with real PHASES, and her
// three `atkPct` values (283.03 / 565 / 848.03) are distinct, so the event log reads back the exact
// phase ORDER. That is what makes the "a suppressed activation must not skip a phase" rule
// directly observable rather than inferred from a total.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const CARRY = 'scarlet-black-shadow';
/** her skill1[0] phase effects, in order */
const PHASES = [283.03, 565, 848.03];

function run(patch?: (block: any) => void) {
  const events: SimEvent[] = [];
  const overrides = patch
    ? {
        [CARRY]: withPatchedOverride(CARRY, (ov) => patch(ov.skill1[0])),
      }
    : undefined;
  const res = runComp({
    ...controlComp(CARRY),
    ...(overrides ? { overrides } : {}),
    cfg: { onEvent: (e) => events.push(e) },
  });
  const phases = events.filter(
    (e: any) =>
      e.kind === 'damage' && e.slug === CARRY && PHASES.includes(e.atkPct)
  ) as any[];
  return {
    count: phases.length,
    seq: phases.map((e) => e.atkPct),
    frames: phases.map((e) => e.frame),
    totals: totals(res),
  };
}

/** true when the observed sequence walks PHASES in order with no skips and no repeats */
function cyclesCleanly(seq: number[]): boolean {
  return seq.every((v, i) => v === PHASES[i % PHASES.length]);
}

describe('chargeCounter — the shipped carrier is unchanged by the routing', () => {
  const base = run();

  it('still fires its phases, cycling 283.03 → 565 → 848.03 with no skips', () => {
    expect(base.count).toBe(135);
    expect(cyclesCleanly(base.seq)).toBe(true);
  });

  it('everyN: 1 is a strict no-op — the newly-live field changes nothing at its identity value', () => {
    const one = run((b) => {
      b.everyN = 1;
    });
    expect(one.totals).toEqual(base.totals);
    expect(one.seq).toEqual(base.seq);
  });
});

describe('chargeCounter — everyN is now live (it was silently ignored)', () => {
  const base = run();
  const every2 = run((b) => {
    b.everyN = 2;
  });

  it('everyN: 2 suppresses every other activation', () => {
    // 135 activations, firing on the even ones. Before the routing this was 135 — the assertion
    // that distinguishes the two engines.
    expect(every2.count).toBe(67);
    expect(every2.count).toBeLessThan(base.count);
  });

  it('the SUPPRESSED activations do not consume a phase — the cycle never skips', () => {
    // The load-bearing rule of the change: applyBlock returns whether the activation LANDED, and
    // the dispatch advances its phase only on true. Advancing on every activation instead would
    // read 283.03, 848.03, 565, … here — a silent re-ordering of her damage across three
    // different flavors (one plain, two distributed).
    expect(cyclesCleanly(every2.seq)).toBe(true);
  });

  it('everyNOffset phases the suppression rather than the effects', () => {
    const off = run((b) => {
      b.everyN = 2;
      b.everyNOffset = 1;
    });
    expect(off.count).toBe(68); // the odd activations: one more than the even ones
    expect(cyclesCleanly(off.seq)).toBe(true);
    expect(off.frames[0]).toBe(base.frames[0]); // fires on activation 1, so the first proc is unmoved
  });
});

describe('chargeCounter — block delaySec is now live (it was silently ignored)', () => {
  const base = run();

  it('a 2s delay moves every landing exactly 120 frames later', () => {
    const delayed = run((b) => {
      b.delaySec = 2;
    });
    // Equal counts because her last base proc lands well before the final 120 frames. If a future
    // cadence/duration/fixture change pushes one into the terminal 2s this drops by 1 with no engine
    // regression — read the frame assertion below as the load-bearing one.
    expect(delayed.count).toBe(base.count);
    expect(delayed.frames[0]).toBe(base.frames[0] + 120);
    expect(delayed.seq).toEqual(base.seq); // deferral preserves the phase, not just the count
  });

  it('a delay past the end of the fight drops the landings entirely', () => {
    const never = run((b) => {
      b.delaySec = 999;
    });
    expect(never.count).toBe(0);
    expect(never.totals[CARRY]).toBeLessThan(base.totals[CARRY]);
  });
});

describe('chargeCounter — the runtime abort-gates still hold (2026-08-10, not regressed)', () => {
  const base = run();

  it('an unsatisfiable resourceGate silences the trigger', () => {
    const gated = run((b) => {
      b.resourceGate = { name: 'nonexistent', min: 1 };
    });
    expect(gated.count).toBe(0);
  });

  it('a gate-suppressed activation does not consume a phase either', () => {
    // fbGate 'outFb' fires only outside Full Burst — a partial suppression, so the surviving
    // sequence still has to walk the phases in order.
    const outFb = run((b) => {
      b.fbGate = 'outFb';
    });
    expect(outFb.count).toBeGreaterThan(0);
    expect(outFb.count).toBeLessThan(base.count);
    expect(cyclesCleanly(outFb.seq)).toBe(true);
  });
});
