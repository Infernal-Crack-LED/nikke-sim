// Engine-primitive backfill: BURST-GAUGE SUPPRESSION during the chain and Full Burst (TDD
// transition step 2, the second of the two items deferred on 2026-07-29;
// docs/handoffs/2026-07-23-tdd-transition-plan.md).
//
// THE RULE (sim.ts `addGauge`): while a Full Burst window is open, or while the burst CHAIN is
// running (stages 1–3), team fire generates NO burst gauge at all. User-confirmed 2026-07-13,
// re-confirmed 2026-08-04 — the lock lifts the instant FB ends (no lingering post-FB delay; the
// observed ~3-4s to the next chain is the natural refill-from-zero).
//
// It is load-bearing for the whole rotation model: gauge is what times the next chain, so a leak
// here shortens every cycle and adds Full Bursts to the fight — the one output the graded comps
// assert as measured truth. It is also invisible to a totals-only test, which is why it needs
// pinning directly.
//
// METHOD — TRUNCATED FIGHTS, not window arithmetic. `UnitResult.gaugeGenerated` is a running total
// with no time axis, so the interval "how much was generated between t1 and t2" is recovered by
// running the SAME fight twice at `durationSec` t1 and t2 and subtracting. Every boundary is READ
// from a reference run's own event stream (first burstCast, fullBurstStart, fullBurstEnd) rather
// than computed from engine constants, so nothing here restates a value that could drift.
//
// THE FIXTURE IS ZEROED: all four units of the control comp have every kit slot emptied in memory,
// so nobody buffs anybody's cadence. That makes the bursting and non-bursting runs fire the
// IDENTICAL shots — verified below as an explicit assertion, not assumed — which is what licenses
// comparing their gauge totals directly. With live kits the burst buffs move fire rate and the
// comparison measures cadence, not suppression.
//
// The `disableBursts: true` arm is the control: it guards the chain OPENER, so stage never leaves 0
// and no Full Burst ever happens, while the gauge fills and pins at 100 exactly as in a fight where
// the player never presses. Same shots, zero suppression — the counterfactual this rule needs.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import type { SimResult } from '../../../src/engine/sim.js';
import { controlComp, runComp, withPatchedOverride } from '../lib/harness.js';

const CARRY = 'ada';
const SLUGS = ['liter', 'crown', CARRY, 'helm'];
const FPS = 60;

/** All three kit slots emptied — the unit contributes nothing but its weapon. */
const zeroed = (slug: string) =>
  withPatchedOverride(slug, (ov) => {
    ov.skill1 = [];
    ov.skill2 = [];
    ov.burst = [];
  });

function run(opts: { bursts: boolean; durationSec?: number }): {
  res: SimResult;
  events: SimEvent[];
  gauge: (slug: string) => number;
  shotFrames: (slug: string) => number[];
} {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp(CARRY),
    overrides: Object.fromEntries(SLUGS.map((s) => [s, zeroed(s)])),
    cfg: {
      onEvent: (e) => events.push(e),
      ...(opts.durationSec != null ? { durationSec: opts.durationSec } : {}),
      ...(opts.bursts ? {} : { disableBursts: true }),
    },
  });
  return {
    res,
    events,
    gauge: (slug) => {
      const u = res.units.find((x) => x.slug === slug);
      if (!u) {
        throw new Error(`${slug} not in the comp — fixture is stale`);
      }
      return u.gaugeGenerated;
    },
    shotFrames: (slug) =>
      events
        .filter(
          (e): e is Extract<SimEvent, { kind: 'shot' }> => e.kind === 'shot'
        )
        .filter((e) => e.slug === slug)
        .map((e) => e.frame),
  };
}

// Reference run: the full fight, bursting on. Every boundary below is read from it.
const ref = run({ bursts: true });
const firstCastFrame = ref.events.find((e) => e.kind === 'burstCast')!.frame;
const fbStartFrame = ref.events.find((e) => e.kind === 'fullBurstStart')!.frame;
const fbEndFrame = ref.events.find((e) => e.kind === 'fullBurstEnd')!.frame;
const atSec = (frame: number) => frame / FPS;

describe('burst-gauge suppression (chain + Full Burst)', () => {
  it('the fixture is sound: bursting changes the gauge but NOT a single shot', () => {
    // The premise every assertion below rests on. If a burst buff leaked into cadence, the two
    // arms would fire different shots and every "generation went down" reading would be
    // attributable to firing less rather than to the lock.
    const on = run({ bursts: true });
    const off = run({ bursts: false });
    expect(
      on.res.fullBursts,
      'the bursting arm never reached a Full Burst'
    ).toBeGreaterThan(2);
    expect(off.res.fullBursts, 'disableBursts let a Full Burst through').toBe(
      0
    );
    for (const slug of SLUGS) {
      expect(on.shotFrames(slug), `${slug} fired differently`).toEqual(
        off.shotFrames(slug)
      );
    }
  });

  it('generates IDENTICALLY before the first chain opens', () => {
    // Nothing is locked yet, so the two arms must agree to the last decimal. This is the control
    // that makes every difference further down attributable to the lock — and it also proves the
    // truncation method itself is sound, since both arms are cut at the same frame.
    const sec = atSec(firstCastFrame) / 2;
    const on = run({ bursts: true, durationSec: sec });
    const off = run({ bursts: false, durationSec: sec });
    for (const slug of SLUGS) {
      expect(on.gauge(slug), `${slug} pre-chain`).toBeGreaterThan(0);
      expect(on.gauge(slug), `${slug} pre-chain`).toBeCloseTo(
        off.gauge(slug),
        6
      );
    }
  });

  it('generates NOTHING from the first burst cast through the end of Full Burst', () => {
    // The headline. Truncating at the B1 cast and again at the FB-end frame brackets the entire
    // chain + window; the bursting arm's total must not move by so much as one shot's worth,
    // while the control arm — same shots, same frames — piles up generation across it.
    const on = {
      atCast: run({ bursts: true, durationSec: atSec(firstCastFrame) }),
      atFbEnd: run({ bursts: true, durationSec: atSec(fbEndFrame) }),
    };
    const off = {
      atCast: run({ bursts: false, durationSec: atSec(firstCastFrame) }),
      atFbEnd: run({ bursts: false, durationSec: atSec(fbEndFrame) }),
    };
    for (const slug of SLUGS) {
      const locked = on.atFbEnd.gauge(slug) - on.atCast.gauge(slug);
      const free = off.atFbEnd.gauge(slug) - off.atCast.gauge(slug);
      expect(
        free,
        `${slug} fired nothing across the window — the arm is vacuous`
      ).toBeGreaterThan(0);
      expect(
        locked,
        `${slug} leaked gauge during chain + Full Burst`
      ).toBeCloseTo(0, 6);
    }
  });

  it('DISCRIMINATING: the lock starts at gauge-full, BEFORE the first burst is cast', () => {
    // sim.ts sets stage = 1 the frame the gauge fills and only casts B1 a measured 30 frames
    // later, so a window bounded at the CAST would already be too late. Asserted without naming
    // the 30: as of the cast frame the bursting arm must already be BEHIND the control arm,
    // which can only happen if generation was locked before the cast.
    //
    // Team-level, not per-unit, and that is a fixture fact rather than a hedge: the pre-cast lock
    // is half a second long, and `ada` (RL) pulls roughly once every 1.8 s — she frequently has no
    // pull inside it and reads exactly equal in both arms. Requiring EVERY unit to differ would
    // fail on her firing rate, not on the rule. A cast-bounded lock still dies here, since it
    // gives equality for all four.
    const sec = atSec(firstCastFrame);
    const on = run({ bursts: true, durationSec: sec });
    const off = run({ bursts: false, durationSec: sec });
    const behind: string[] = [];
    for (const slug of SLUGS) {
      expect(off.gauge(slug), `${slug} never fired pre-cast`).toBeGreaterThan(
        0
      );
      expect(
        on.gauge(slug),
        `${slug}: the bursting arm generated MORE than the unlocked control`
      ).toBeLessThanOrEqual(off.gauge(slug));
      if (on.gauge(slug) < off.gauge(slug)) {
        behind.push(slug);
      }
    }
    expect(
      behind,
      'no unit lost any generation before the B1 cast — the lock starts at the cast, not at gauge-full'
    ).not.toEqual([]);
  });

  it('DISCRIMINATING: the Full Burst window alone accounts for part of it — the chain locks too', () => {
    // Splits the bracket above at the FB boundary. BOTH halves must be zero: a model that locked
    // only the Full Burst (the intuitive reading, and the one the bar anatomy was first misread
    // as) passes the headline test's second half and fails here on the first.
    const chain = {
      lo: run({ bursts: true, durationSec: atSec(firstCastFrame) }),
      hi: run({ bursts: true, durationSec: atSec(fbStartFrame) }),
      ctl: [
        run({ bursts: false, durationSec: atSec(firstCastFrame) }),
        run({ bursts: false, durationSec: atSec(fbStartFrame) }),
      ],
    };
    for (const slug of SLUGS) {
      const control = chain.ctl[1].gauge(slug) - chain.ctl[0].gauge(slug);
      expect(
        control,
        `${slug} fired nothing during the chain — the arm is vacuous`
      ).toBeGreaterThan(0);
      expect(
        chain.hi.gauge(slug) - chain.lo.gauge(slug),
        `${slug} generated gauge during the B1→B2→B3 chain`
      ).toBeCloseTo(0, 6);
    }
  });

  it('resumes once the window closes', () => {
    // The lock releases rather than latching. One second past the FB-end frame is deliberately
    // clear of the boundary itself: whether the exact fbEnd frame generates is a one-frame
    // convention this suite does not pin.
    const lo = run({ bursts: true, durationSec: atSec(fbEndFrame) });
    const hi = run({ bursts: true, durationSec: atSec(fbEndFrame) + 1 });
    for (const slug of SLUGS) {
      expect(
        hi.gauge(slug) - lo.gauge(slug),
        `${slug} never resumed generating after Full Burst`
      ).toBeGreaterThan(0);
    }
  });
});
