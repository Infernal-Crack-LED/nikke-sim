// PER-UNIT KIT SPEC — `power` (Power, Attacker/RL/Fire, Burst III, cd 40s, ammo 6,
// chargeFrames 60, reloadFrames 141 — Chainsaw Man collab). Kit-autonomy gauntlet 2026-08-03.
//
// One assertion group per KIT LINE (P1..P5 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.power.skills):
//   S1 ■ attacking with Full Charge → self: Blood Fiend: ATK ▲6.4%, stacks to 5, lasts 3 sec  [P1]
//   S2 ■ after 18 normal attacks IF Blood Fiend at max stacks → self, ONCE PER BATTLE:
//        Explosion Radius ▲38.61% for 10 sec                                                    [P3]
//        Reloads 100% of the magazine                                                           [P2]
//   BU ■ highest-final-ATK enemy: 1584% of final ATK as Burst Skill damage                     [P4]
//      ■ IF Blood Fiend at max stacks → same target: 1584% of final ATK additional damage      [P4/P5]
//
// Encoding notes (why the spec is written this way):
//   * Every Power pull is a FULL CHARGE (RL charge 60f + 22f release recovery, no dump mode), so
//     her shot cadence is the full-charge cadence: 82f in-magazine, 172f across a natural reload.
//   * The "Blood Fiend at max stacks" condition is a STACK-GATE the engine has no buff-stack gate
//     primitive for; the override carries a `bloodFiend` resource pool (0→5, +1 per full charge,
//     two single-effect chargeCounter blocks — a multi-effect chargeCounter would CYCLE its
//     effects one per charge, not apply both) + a real maxStacks-5 / 3s ATK buff as the damage
//     line. The pool does NOT expire (no timer-decay primitive); the buff does (3s). At scope-lock
//     cadence her longest full-charge gap is the 172f (2.87s) reload boundary — under the 3s
//     expiry — so the proxy and the real buff never disagree inside a sim fight. ⚑ documented in
//     the override caveats, measurement-gated (a >3s fire pause would expose it).
//   * FIXTURE PROVIDES A REAL GATE-CLOSED CAST: camera-focused, liter/crown open the chain fast
//     enough that power's FIRST burst casts at ~5.4s, after only 4 full charges (stacks 4 < 5).
//     The kit-faithful outcome — and the shipped encoding — deals ONE nuke on that cast and TWO on
//     every later cast. A nearest-wrong unconditional double-nuke is caught by P4; P5 proves the
//     gate reads the pool (zero pool → every cast single, no reload-skip).
//   * P3 (Explosion Radius ▲38.61%) is UNMODELED on purpose: the sim fights ONE boss — there is
//     no AoE/multi-target axis for an explosion RADIUS to act on, so the line is damage-inert.
//     Nearest wrong: `projectileExplosionPct` (that is explosion DAMAGE, a Damage-Up bucket — a
//     different mechanic). No assertion here; the line lives verbatim in `unmodeled`.
//   * "Activates 1 time(s) per battle" = the everyN idiom (offset 1, N past any in-fight count).
//     Behaviorally, a REPEATED 18-hit refill tops up a non-empty magazine (capped) and nets only a
//     +1-round carryover per 18 hits — a small but STRICT total-damage delta near the 180s cutoff,
//     which is what P2's once-limit counterfactual asserts. The skip's LOCATION (hit 18, not
//     earlier) is pinned by the shot-gap signature against an early-trigger counterfactual.
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / power B3 / helm B3, boss Fire,
// focus power) — power needs a real rotation to cast her burst at all. Deterministic (no seed);
// measured in-fight values: 111 shots, 6 casts at frames 322/2374/4367/6252/8075/9873, stacks
// max at frame 395 (shot 5), natural-reload gap 172f vs skipped gap 82f.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** controlComp slot order: liter 0 / crown 1 / power 2 / helm 3. */
const POWER = 2;

/** Measured on the deterministic fixture: one in-magazine charge cycle. */
const IN_MAG_GAP = 82;
/** Measured: 141f reload + charge cycle across a natural magazine boundary. */
const RELOAD_GAP = 172;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('power'),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches -------------------------------------------------------------------
/** P1 counterfactual: S1's stack line misread as a flat instant +32% (passive, no stacks, no
 *  expiry). The pool block is untouched, so the gate stays intact — this isolates the BUFF SHAPE. */
const powerFlatAtk = withPatchedOverride('power', (ov) => {
  const b = ov.skill1.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'buff' && e.stat === 'atkPct')
  );
  if (!b) {
    throw new Error('power S1 atkPct stack block missing — fixture is stale');
  }
  b.trigger = { kind: 'passive' };
  const buff = b.effects.find(
    (e: any) => e.kind === 'buff' && e.stat === 'atkPct'
  );
  buff.value = 32;
  buff.maxStacks = 1;
  delete buff.durationSec;
});
/** P2 counterfactual: S2 armed from the FIRST hit (threshold 1) instead of the 18th. The gate
 *  then opens on the 5th pull (pool hits 5 mid-pull, before the hitCount block dispatches), so
 *  the reload-skip migrates from the 6th boundary to right after shot 5. */
const powerEarlyTrigger = withPatchedOverride('power', (ov) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'instantReload')
  );
  if (!b) {
    throw new Error('power S2 reload block missing — fixture is stale');
  }
  b.trigger.count = 1;
});
/** P2 counterfactual: S2 with the once-per-battle limit removed — refills every 18 hits. Later
 *  refills top up a NON-EMPTY magazine (capped at 6), so each only nets a +1-round carryover:
 *  a small but strict total-damage gain near the 180s cutoff. */
const powerNoOnce = withPatchedOverride('power', (ov) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'instantReload')
  );
  if (!b) {
    throw new Error('power S2 reload block missing — fixture is stale');
  }
  delete b.everyN;
  delete b.everyNOffset;
});
/** P4 counterfactual: only the unconditional burst nuke survives. */
const powerSingleNuke = withPatchedOverride('power', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !b.resourceGate);
  if (ov.burst.length === before) {
    throw new Error(
      'power burst gated-nuke block (resourceGate) missing — fixture is stale'
    );
  }
});
/** P5 counterfactual: the bloodFiend pool never fills (S1 pool block removed) — the buff still
 *  stacks, so this isolates the GATE from the damage line. */
const powerNoPool = withPatchedOverride('power', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'resource')
  );
  if (ov.skill1.length === before) {
    throw new Error('power S1 resource block missing — fixture is stale');
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const flatAtk = run({ power: powerFlatAtk });
const earlyTrigger = run({ power: powerEarlyTrigger });
const noOnce = run({ power: powerNoOnce });
const singleNuke = run({ power: powerSingleNuke });
const noPool = run({ power: powerNoPool });

// ---- readers ----------------------------------------------------------------------------------
const powerShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'power');
const powerBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'power'
  );
const powerNukes = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Damage =>
      e.kind === 'damage' && e.slug === 'power' && e.bucket === 'burst'
  );
/** Power's OWN S1 Blood Fiend applies (liter also grants an atkPct team buff — filter by
 *  caster, not just stat). */
const fiendApplies = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BuffApply =>
      e.kind === 'buffApply' && e.casterIdx === POWER && e.stat === 'atkPct'
  );
/** Gap between shot n and shot n+1 (1-based n). */
const gapAfter = (evs: SimEvent[], n: number): number => {
  const shots = powerShots(evs);
  return shots[n].frame - shots[n - 1].frame;
};
/** Burst-bucket instances landing on a cast's frame. */
const nukesAt = (evs: SimEvent[], frame: number) =>
  powerNukes(evs).filter((d) => d.frame === frame);

describe('power — kit spec', () => {
  describe('P1 — S1 Blood Fiend: ATK ▲6.4% per full charge, stacks to 5, lasts 3 sec', () => {
    it('applies once per full-charge shot (not once, flat)', () => {
      const shots = powerShots(base.events).length;
      const applies = fiendApplies(base.events).length;
      expect(shots).toBeGreaterThan(0);
      expect(
        applies,
        `${applies} applies vs ${shots} full-charge shots — a passive encoding applies once`
      ).toBe(shots);
    });

    it('is 6.4% per stack, max 5 stacks, reaching max, self-scoped, with a 3 sec expiry', () => {
      const applies = fiendApplies(base.events);
      expect([...new Set(applies.map((b) => b.value))]).toEqual([6.4]);
      expect([...new Set(applies.map((b) => b.maxStacks))]).toEqual([5]);
      expect(
        Math.max(...applies.map((b) => b.stacks)),
        'stacks must actually climb to the 5-stack cap mid-fight'
      ).toBe(5);
      for (const b of applies) {
        expect(b.targetIdx).toBe(POWER); // self-scoped
        expect(b.expiresFrame! - b.frame).toBe(3 * FPS);
      }
    });

    it('DISCRIMINATING: a flat instant +32% would apply once and over-credit power', () => {
      expect(fiendApplies(flatAtk.events).length).toBe(1);
      expect(
        flatAtk.totals.power,
        'flat +32% from t=0 must strictly out-damage the faithful 5x6.4% ramp'
      ).toBeGreaterThan(base.totals.power);
    });
  });

  describe('P2 — S2 Blood Explosion: reload 100% after 18 hits, ONCE per battle', () => {
    it('skips the natural reload right after the 18th hit', () => {
      // Shot 18 ends the third magazine: without the skip the gap to shot 19 carries the 141f
      // reload (172f measured); with it, a bare charge cycle (82f measured).
      expect(gapAfter(base.events, 6)).toBeGreaterThanOrEqual(RELOAD_GAP); // control boundary
      expect(gapAfter(base.events, 12)).toBeGreaterThanOrEqual(RELOAD_GAP); // control boundary
      expect(gapAfter(base.events, 18)).toBeLessThanOrEqual(IN_MAG_GAP);
    });

    it('DISCRIMINATING (timing): an arming threshold of 1 would skip right after shot 5', () => {
      // The pool reaches 5 mid-pull on shot 5 (S1 blocks dispatch before S2 within the pull), so
      // a threshold-1 block fires THERE — the skip migrates to the 6th boundary.
      expect(gapAfter(earlyTrigger.events, 6)).toBeLessThanOrEqual(IN_MAG_GAP);
      expect(gapAfter(base.events, 6)).toBeGreaterThanOrEqual(RELOAD_GAP);
    });

    it('DISCRIMINATING (once): refilling every 18 hits strictly out-damages once-per-battle', () => {
      // Later refills land on a non-empty magazine (capped), netting a +1-round carryover each —
      // the once-limit is what removes that gain.
      expect(noOnce.totals.power).toBeGreaterThan(base.totals.power);
      // And the one skip still happens at hit 18 in both (first activation identical).
      expect(gapAfter(noOnce.events, 18)).toBeLessThanOrEqual(IN_MAG_GAP);
    });

    it('DISCRIMINATING (gate): with the pool at zero the skip never happens', () => {
      expect(gapAfter(noPool.events, 18)).toBeGreaterThanOrEqual(RELOAD_GAP);
    });
  });

  // P3 — Explosion Radius ▲38.61% for 10 sec: UNMODELED — no AoE/multi-target axis in the sim
  // (one boss), so a radius cannot move any damage; the nearest wrong encoding
  // (projectileExplosionPct = explosion DAMAGE) would silently boost her RL hits. The line is
  // carried verbatim in the override's `unmodeled`; there is nothing to assert.

  describe('P4 — burst Blood Hammer: 1584% nuke, +1584% only at max stacks, pre-FB', () => {
    it('lands one 1584% nuke on EVERY cast', () => {
      const casts = powerBursts(base.events);
      expect(casts.length, 'fixture must cast power').toBeGreaterThan(3);
      for (const c of casts) {
        expect(nukesAt(base.events, c.frame).length).toBeGreaterThanOrEqual(1);
      }
      expect([...new Set(powerNukes(base.events).map((d) => d.atkPct))]).toEqual(
        [1584]
      );
    });

    it('the FIRST cast is single (stacks 4 < 5 at 5.4s), every later cast doubles', () => {
      const casts = powerBursts(base.events);
      const applies = fiendApplies(base.events);
      const maxedFrame = applies.find((b) => b.stacks === 5)!.frame;
      // The fixture's gate state, read off the buff itself:
      expect(casts[0].frame, 'first cast precedes max stacks').toBeLessThan(
        maxedFrame
      );
      expect(casts[1].frame, 'later casts follow max stacks').toBeGreaterThan(
        maxedFrame
      );
      // And the damage matches it:
      expect(nukesAt(base.events, casts[0].frame).length).toBe(1);
      for (const c of casts.slice(1)) {
        expect(nukesAt(base.events, c.frame).length).toBe(2);
      }
      expect(powerNukes(base.events).length).toBe(2 * casts.length - 1);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      const took = powerNukes(base.events).filter((d) => d.fbMajorApplied);
      expect(
        took.map((d) => d.sec),
        'burst-cast damage must precede the FB window'
      ).toEqual([]);
    });

    it('DISCRIMINATING: dropping the gated block leaves one nuke on every cast', () => {
      const casts = powerBursts(singleNuke.events).length;
      expect(powerNukes(singleNuke.events).length).toBe(casts);
    });
  });

  describe('P5 — the max-stacks gate is causally wired to the bloodFiend pool', () => {
    it('zeroing the pool drops the second nuke on every cast', () => {
      const casts = powerBursts(noPool.events);
      expect(casts.length).toBeGreaterThan(0);
      expect(
        powerNukes(noPool.events).length,
        'with the pool at 0 the stack-gated nuke must never fire'
      ).toBe(casts.length);
    });

    it('the S1 buff still stacks without the pool (gate isolated from the damage line)', () => {
      const applies = fiendApplies(noPool.events);
      expect(Math.max(...applies.map((b) => b.stacks))).toBe(5);
    });
  });
});
