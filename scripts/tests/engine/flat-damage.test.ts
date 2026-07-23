// Engine-primitive backfill: `flatDamage` — the single most-used effect kind in the roster
// (46 override carriers, primitive census in docs/engine-modeling-gaps.md). Every "additional
// damage" / nuke / rider line in the game funnels through it, so its scoping rules are load-bearing
// for a large fraction of the board.
//
// Method: the control comp (liter / crown / ada / helm) with ONE SYNTHETIC probe block installed
// in the carry's kit, in memory. A synthetic block is used deliberately instead of a real carrier's
// line: it isolates ONE knob per assertion, and a shipped override changing its numbers can never
// silently rewrite what this test claims about the engine.
//
// The rules pinned here (each with the nearest-approximation model it discriminates against):
//   1. atkPct is a pure linear scalar on the instance.               (vs. any clamp/curve)
//   2. The damage BUCKET follows the owning SKILL SLOT, not the trigger kind.
//                                                                    (vs. bucket-by-trigger)
//   3. Crit is ON by default and `crit:false` is honoured (U1).       (vs. crit off by default)
//   4. Core is OFF by default and `core:true` is honoured.            (vs. inheriting weapon core)
//   5. Instant riders NEVER take the +30% range bonus (owner rule 2026-07-13).
//   6. `delaySec` flights the hit and it resolves at LANDING state — the +50% Full Burst major
//      is decided by the LANDING frame, not the cast frame (MEASURED 2026-07-14, rapi-red-hood).
//   7. `requiresPulls` gates on the OWNER's cumulative trigger pulls (MEASURED 2026-07-14).
//   8. `rampSec` scales atkPct by min(1, elapsed / rampSec) from BATTLE START.
//   9. Burst-CAST damage never takes the +50% major (U10 ANSWERED 2026-07-13).
//
// Deterministic EV runs (no seed) so amounts are byte-stable and equalities are legal.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { controlComp, runComp, withPatchedOverride } from '../lib/harness.js';

const CARRY = 'ada';
const FPS = 60;

type DamageEvent = Extract<SimEvent, { kind: 'damage' }>;
type Slot = 'skill1' | 'skill2' | 'burst';

/**
 * Run the control comp with ONE synthetic probe block replacing `slot` of the carry's kit.
 * Returns the whole event stream plus just the probe's own damage instances (`srcSlot` names
 * the slot the block was installed in, which is what makes them separable from her real kit).
 */
function probe(slot: Slot, block: unknown): { events: SimEvent[]; procs: DamageEvent[] } {
  const patched = withPatchedOverride(CARRY, (ov) => {
    ov[slot] = [block];
  });
  const events: SimEvent[] = [];
  runComp({
    ...controlComp(CARRY),
    overrides: { [CARRY]: patched },
    cfg: { onEvent: (e) => events.push(e) },
  });
  const procs = events.filter(
    (e): e is DamageEvent => e.kind === 'damage' && e.slug === CARRY && e.srcSlot === slot,
  );
  return { events, procs };
}

/** A block that fires the given effects every `sec` seconds of battle (first at t=sec). */
const everyN = (sec: number, effects: unknown[], extra: Record<string, unknown> = {}) => ({
  trigger: { kind: 'interval', sec },
  target: { kind: 'self' },
  effects,
  ...extra,
});
const flat = (extra: Record<string, unknown> = {}) => ({ kind: 'flatDamage', atkPct: 100, ...extra });

describe('flatDamage primitive', () => {
  it('fires at all — the synthetic probe is a live fixture', () => {
    // Guards every other assertion in this file against going vacuous: they all filter the
    // stream to srcSlot === the probe slot, and an empty filter passes most `.every()` arms.
    const { procs } = probe('skill1', everyN(10, [flat()]));
    expect(procs.length, 'the interval probe never fired over 180s').toBeGreaterThan(10);
  });

  it('scales linearly in atkPct — nothing else moves', () => {
    // flatDamage generates burst gauge per HIT (skillGauge), never per unit of damage, so
    // doubling atkPct cannot shift the timeline. Every proc must double, frame for frame.
    const a = probe('skill1', everyN(10, [flat({ atkPct: 100 })])).procs;
    const b = probe('skill1', everyN(10, [flat({ atkPct: 200 })])).procs;
    expect(b.length, 'the two arms fired a different number of times').toBe(a.length);
    const bad = a
      .map((e, i) => ({ e, o: b[i] }))
      .filter(({ e, o }) => e.frame !== o.frame || Math.abs(o.amount - 2 * e.amount) / Math.max(1, e.amount) > 1e-9);
    expect(
      bad.slice(0, 3).map(({ e, o }) => `${e.sec.toFixed(2)}s ${e.amount.toFixed(0)} → ${o.amount.toFixed(0)}`),
      'doubling atkPct did not exactly double the instance',
    ).toEqual([]);
  });

  it('DISCRIMINATING: the damage BUCKET follows the owning slot, not the trigger kind', () => {
    // An implementation keying the bucket off the TRIGGER (burstCast → burst) agrees with this
    // one everywhere except here: the same interval-triggered block in the burst slot is BURST
    // damage, and in skill1/skill2 it is SKILL damage. `category` is read off block.slot alone.
    for (const [slot, bucket] of [
      ['skill1', 'skill'],
      ['skill2', 'skill'],
      ['burst', 'burst'],
    ] as const) {
      const { procs } = probe(slot, everyN(10, [flat()]));
      expect(procs.length, `${slot}: probe never fired`).toBeGreaterThan(0);
      expect(
        [...new Set(procs.map((e) => e.bucket))],
        `an interval-triggered ${slot} block should bank ${bucket} damage`,
      ).toEqual([bucket]);
    }
  });

  it('crits by DEFAULT and honours crit:false (U1 ANSWERED 2026-07-13)', () => {
    // Function-type "additional damage" crits at the caster's rate. Opt-OUT, not opt-in: a kit
    // line that says nothing about crit still crits, which is the direction that costs damage
    // if inverted.
    const on = probe('skill1', everyN(10, [flat()])).procs;
    const off = probe('skill1', everyN(10, [flat({ crit: false })])).procs;
    expect(on.every((e) => e.critEligible), 'a plain flatDamage was not crit-eligible').toBe(true);
    expect(on.every((e) => e.critRate > 0), 'crit-eligible but resolved to a 0 rate').toBe(true);
    expect(off.some((e) => e.critEligible), 'crit:false was ignored').toBe(false);
    expect(off.every((e) => e.critRate === 0), 'a non-eligible instance reported a crit rate').toBe(true);
    // ...and the exemption is worth real damage, so it can never be a silent no-op.
    expect(off[0].amount).toBeLessThan(on[0].amount);
  });

  it('never cores by DEFAULT and honours core:true', () => {
    const off = probe('skill1', everyN(10, [flat()])).procs;
    const on = probe('skill1', everyN(10, [flat({ core: true })])).procs;
    expect(off.some((e) => e.coreEligible), 'a plain flatDamage was core-eligible').toBe(false);
    expect(on.every((e) => e.coreEligible), 'core:true was ignored').toBe(true);
    expect(on[0].amount).toBeGreaterThan(off[0].amount);
  });

  it('instant riders NEVER take the +30% range bonus (owner rule 2026-07-13)', () => {
    const { events, procs } = probe('skill1', everyN(10, [flat()]));
    expect(procs.some((e) => e.rangeApplied), 'a rider took the range bonus').toBe(false);
    // Non-vacuous: the same fight DOES award the bonus to ordinary weapon fire, so `rangeApplied`
    // is not simply false everywhere.
    const normals = events.filter(
      (e): e is DamageEvent => e.kind === 'damage' && e.srcSlot === 'normal',
    );
    expect(
      normals.some((e) => e.rangeApplied),
      'no normal-fire damage took the range bonus either — the flag is inert in this fixture, ' +
        'so the assertion above proves nothing. Pick a band/weapon where the bonus is live.',
    ).toBe(true);
  });

  it('delaySec flights the hit by exactly delaySec', () => {
    const instant = probe('skill1', everyN(10, [flat()])).procs;
    const delayed = probe('skill1', everyN(10, [flat({ delaySec: 0.5 })])).procs;
    expect(delayed.length, 'the flighted arm lost procs').toBe(instant.length);
    const bad = instant
      .map((e, i) => ({ e, o: delayed[i] }))
      .filter(({ e, o }) => o.frame !== e.frame + Math.round(0.5 * FPS));
    expect(
      bad.slice(0, 3).map(({ e, o }) => `${e.frame} → ${o.frame} (want ${e.frame + 30})`),
      'a flighted hit did not land exactly delaySec after its trigger',
    ).toEqual([]);
  });

  it('DISCRIMINATING: a flighted hit snapshots the Full Burst state at LANDING, not at cast', () => {
    // Both arms are cast at the SAME frames (Full Burst entry). Only the landing time differs:
    // 1s lands inside the 10s window, 10.5s lands just past its end. A model that snapshotted
    // buffs/FB at the CAST would give both arms the +50% major and identical amounts.
    const inside = probe('skill1', {
      trigger: { kind: 'fullBurstEnter' },
      target: { kind: 'self' },
      effects: [flat({ delaySec: 1 })],
    }).procs;
    const outside = probe('skill1', {
      trigger: { kind: 'fullBurstEnter' },
      target: { kind: 'self' },
      effects: [flat({ delaySec: 10.5 })],
    }).procs;
    expect(inside.length, 'the fixture never reached a Full Burst').toBeGreaterThan(0);
    expect(
      inside.every((e) => e.inFullBurst && e.fbMajorApplied),
      'a hit landing 1s into the Full Burst window missed the +50% major',
    ).toBe(true);
    expect(
      outside.filter((e) => e.inFullBurst).map((e) => e.sec.toFixed(2)),
      'a hit landing 10.5s after FB entry (0.5s past the 10s window) was still credited in-FB',
    ).toEqual([]);
    expect(outside.every((e) => !e.fbMajorApplied), 'an out-of-FB landing took the +50%').toBe(true);
  });

  it('requiresPulls gates on the OWNER\'s cumulative pulls (MEASURED 2026-07-14)', () => {
    // rapi-red-hood's burst nuke needs >=1 sticky charge (>=120 shots banked at cast). The gate
    // is a pull COUNT, so raising the threshold must push the first proc later in the fight —
    // not merely mute it. A gate wired to elapsed time or to a fixed flag fails the shift arm.
    // 30 is chosen against the fixture: the carry fires 88 pulls over the 180s fight, reaching her
    // 30th at ~60s, so the gate genuinely opens MID-fight (a threshold above 88 would only prove
    // the mute arm, and one below her first pull would prove nothing at all).
    const open = probe('skill1', everyN(5, [flat({ requiresPulls: 0 })])).procs;
    const gated = probe('skill1', everyN(5, [flat({ requiresPulls: 30 })])).procs;
    const shut = probe('skill1', everyN(5, [flat({ requiresPulls: 100_000 })])).procs;
    expect(open.length, 'the ungated probe never fired').toBeGreaterThan(0);
    expect(shut, 'an unreachable pull threshold still let the hit through').toEqual([]);
    expect(gated.length, 'the 30-pull gate blocked every proc for the whole fight').toBeGreaterThan(0);
    expect(gated.length, 'the 30-pull gate never actually blocked anything').toBeLessThan(open.length);
    expect(
      gated[0].frame,
      `first gated proc at ${gated[0].sec.toFixed(1)}s vs first ungated at ${open[0].sec.toFixed(1)}s`,
    ).toBeGreaterThan(open[0].frame);
    // and once the gate opens it never re-closes (pulls are monotonic) — proc counts differ by
    // exactly the procs skipped at the head.
    expect(gated.map((e) => e.frame)).toEqual(open.map((e) => e.frame).slice(open.length - gated.length));
  });

  it('rampSec scales atkPct by min(1, elapsed / rampSec) from battle start', () => {
    const RAMP = 60;
    const ramped = probe('skill1', everyN(10, [flat({ rampSec: RAMP })])).procs;
    const full = probe('skill1', everyN(10, [flat()])).procs;
    expect(ramped.length).toBe(full.length);
    const bad = ramped
      .map((e, i) => ({ e, base: full[i] }))
      .filter(({ e, base }) => {
        const want = base.amount * Math.min(1, e.frame / Math.round(RAMP * FPS));
        return Math.abs(want - e.amount) / Math.max(1, base.amount) > 1e-9;
      });
    expect(
      bad.slice(0, 3).map(({ e, base }) => `${e.sec.toFixed(1)}s got ${(e.amount / base.amount).toFixed(4)}× full`),
      'ramp factor is not min(1, elapsed/rampSec) measured from battle start',
    ).toEqual([]);
    // Non-vacuous both ways: the head is genuinely scaled down and the tail is genuinely at full.
    expect(ramped[0].amount).toBeLessThan(full[0].amount * 0.5);
    expect(ramped[ramped.length - 1].amount).toBeCloseTo(full[full.length - 1].amount, 6);
  });

  it('U10: burst-CAST damage never takes the +50% Full Burst major', () => {
    // Measured 2026-07-13 (the `cinderella` nuke popup — RL/Electric, NOT cinderella-crystal-wave):
    // the burst skill's own damage resolves BEFORE
    // the Full Burst window opens. The engine enforces it structurally (skillNoFb forces noFb for
    // a burst-slot burstCast block) rather than relying on the cast landing outside the window.
    const cast = probe('burst', {
      trigger: { kind: 'burstCast' },
      target: { kind: 'self' },
      effects: [flat()],
    }).procs;
    expect(cast.length, `${CARRY} never cast her burst — the fixture cannot exercise this rule`).toBeGreaterThan(0);
    expect(
      cast.filter((e) => e.fbMajorApplied).map((e) => e.sec.toFixed(2)),
      'a burst-cast instant took the +50% Full Burst major',
    ).toEqual([]);
    // The same slot DOES take the major when the damage is keyed to Full Burst ENTRY instead, so
    // the exemption above is a property of the burst-cast trigger, not of the burst slot.
    const atEnter = probe('burst', {
      trigger: { kind: 'fullBurstEnter' },
      target: { kind: 'self' },
      effects: [flat()],
    }).procs;
    expect(atEnter.length, 'the FB-entry control never fired').toBeGreaterThan(0);
    expect(
      atEnter.every((e) => e.fbMajorApplied),
      'the FB-entry control did NOT take the major either — this fixture cannot distinguish the ' +
        'burst-cast exemption from a fight that simply never applies the major to burst-slot damage',
    ).toBe(true);
  });
});
