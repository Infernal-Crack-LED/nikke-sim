// Engine primitive: BLOCK-LEVEL DELAY — `Block.delaySec`.
//
// Contract (src/skills/types.ts → Block.delaySec):
//   "the block's EFFECTS apply delaySec seconds after its TRIGGER fires."
//
// The distinction that makes this a primitive rather than a convenience: the trigger and the effect
// are separated in TIME, so every block-level gate (`fbGate` / `everyN` / `requiresCore` / …) and the
// activation counter are evaluated at TRIGGER time — the state the kit line's activation clause
// actually reads — while the effects resolve later, against the state that exists then. A naive
// "same frame" encoding of a kit line worded "…for 2 sec, then <effect>" is a different model, and
// on a 10s buff landing near a Full Burst boundary it is worth real damage.
//
// Carrier: `flora`'s S2-2 True Damage line, which fires 2 sec after Burst Stage 2 entry (the
// 15.01% Max HP grant from her S1 expires then and her allies return to max HP). See
// scripts/tests/units/flora.test.ts.
//
// Method: the control comp with ONE SYNTHETIC block in the carry's skill1, matching the
// block-gates.test.ts pattern. Observable = `buffApply` frames from the event log (NOT flatDamage,
// which carries its own independent `delaySec` on the EFFECT and would conflate the two paths).
// Deterministic runs (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { controlComp, runComp, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const CARRY = 'ada';
const MARKER_STAT = 'attackDamagePct';
const MARKER_VALUE = 7.77; // distinctive: no shipped override applies this value

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;

function probe(block: Record<string, unknown>) {
  const patched = withPatchedOverride(CARRY, (ov) => {
    ov.skill1 = [
      {
        slot: 'skill1',
        target: { kind: 'self' },
        effects: [
          {
            kind: 'buff',
            stat: MARKER_STAT,
            value: MARKER_VALUE,
            durationSec: 1,
          },
        ],
        ...block,
      },
    ];
  });
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp(CARRY),
    overrides: { [CARRY]: patched },
    cfg: { onEvent: (e) => events.push(e) },
  });
  const applies = events
    .filter(
      (e): e is BuffApply =>
        e.kind === 'buffApply' &&
        e.stat === MARKER_STAT &&
        Math.abs(e.value - MARKER_VALUE) < 1e-9
    )
    .map((e) => e.frame);
  const fbBounds = events.filter(
    (e) => e.kind === 'fullBurstStart' || e.kind === 'fullBurstEnd'
  );
  const inFb = (frame: number): boolean => {
    let open = false;
    for (const b of fbBounds) {
      if (b.frame > frame) {
        break;
      }
      open = b.kind === 'fullBurstStart';
    }
    return open;
  };
  return { events, applies, inFb, totals: res.units.map((u) => u.totalDamage) };
}

const every5s = (extra: Record<string, unknown> = {}) => ({
  trigger: { kind: 'interval', sec: 5 },
  ...extra,
});

// Hoisted: each probe is a full 180s sim.
const noField = probe(every5s());
const zero = probe(every5s({ delaySec: 0 }));
const delayed2 = probe(every5s({ delaySec: 2 }));
const delayed5 = probe(every5s({ delaySec: 5 }));
const gatedInFb = probe({
  trigger: { kind: 'interval', sec: 1 },
  fbGate: 'inFb',
  delaySec: 5,
});
const gatedInFbNoDelay = probe({
  trigger: { kind: 'interval', sec: 1 },
  fbGate: 'inFb',
});

describe('Block.delaySec — block-level effect delay', () => {
  it('is a STRICT NO-OP when absent: effects land on the trigger frame', () => {
    expect(noField.applies.length).toBeGreaterThan(5);
    // interval sec:5 fires first at t=5s (engine convention), then every 5s.
    for (const [i, f] of noField.applies.entries()) {
      expect(f).toBe((i + 1) * 5 * FPS);
    }
  });

  it('DISCRIMINATING: delaySec:0 is byte-identical to omitting the field', () => {
    expect(zero.applies).toEqual(noField.applies);
    expect(zero.totals).toEqual(noField.totals);
  });

  it('shifts every application by exactly delaySec × 60 frames', () => {
    expect(delayed2.applies.length).toBeGreaterThan(0);
    const shifted = noField.applies
      .map((f) => f + 2 * FPS)
      .filter((f) => f < 180 * FPS);
    expect(delayed2.applies).toEqual(shifted);
  });

  it('DISCRIMINATING: a delayed application is NOT on its trigger frame', () => {
    // The nearest wrong model (delaySec ignored) would make these two sets equal.
    expect(delayed2.applies).not.toEqual(noField.applies);
    for (const f of delayed2.applies) {
      expect(noField.applies).not.toContain(f);
    }
  });

  it('drops an application whose landing frame falls past the end of the fight', () => {
    // interval sec:5 fires last at t=175s; a 5s delay puts that landing at exactly t=180s, one
    // frame past the fight, so it never applies. Chosen so the drop is REAL — a 2s delay lands it
    // at 177s and the arm would be indistinguishable from "delay ignored".
    const lastTrigger = noField.applies[noField.applies.length - 1];
    expect(lastTrigger + 5 * FPS).toBeGreaterThanOrEqual(180 * FPS);
    expect(delayed5.applies.length).toBe(noField.applies.length - 1);
    expect(delayed5.applies).toEqual(
      noField.applies.map((f) => f + 5 * FPS).filter((f) => f < 180 * FPS)
    );
  });

  it('evaluates block GATES at TRIGGER time, not at landing time', () => {
    // fbGate:'inFb' + delaySec:5 — every activation is gated on Full Burst being live when the
    // trigger fired, but with a 10s Full Burst window a 5s delay pushes roughly half of them
    // OUTSIDE the window before they apply. If the gate were re-checked at landing, those
    // applications would be missing entirely.
    expect(gatedInFbNoDelay.applies.length).toBeGreaterThan(5);
    const shifted = gatedInFbNoDelay.applies
      .map((f) => f + 5 * FPS)
      .filter((f) => f < 180 * FPS);
    expect(gatedInFb.applies).toEqual(shifted);
    // ...and the delayed landings genuinely straddle the gate's own condition.
    const landedOutsideFb = gatedInFb.applies.filter((f) => !gatedInFb.inFb(f));
    expect(
      landedOutsideFb.length,
      'no delayed landing fell outside Full Burst — the gate-timing claim is untested'
    ).toBeGreaterThan(0);
  });
});
