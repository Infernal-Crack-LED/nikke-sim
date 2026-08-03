// Engine-primitive backfill: the TRIGGER-KIND MATRIX — when each `trigger.kind` fires, as its own
// cross-cutting suite (TDD transition step 2, the first of the two items deferred on 2026-07-29;
// docs/handoffs/2026-07-23-tdd-transition-plan.md).
//
// These five kinds were exercised INCIDENTALLY by every earlier backfill — a unit test that pins a
// buff's magnitude runs its trigger too — but never pinned on their own. That is a real gap: an
// incidental exercise asserts the effect, so it survives a trigger firing at the wrong FRAME, one
// time too many, or for the wrong UNIT, as long as the total still lands. Each assertion below is
// written against the event stream (frame-exact, per-unit) rather than a total, so it fails on
// exactly those.
//
// `hitCount` has its own file (hit-count-trigger.test.ts) and is not repeated here. `passive`,
// `bossElement`, `burstCast`, `teamAmmo`, `recovery`, `shielded` and `chargeCounter` are covered by
// their own suites or are single-carrier exotics that defer to their unit's step-3 session.
//
// METHOD. One synthetic `flatDamage` probe block is installed in a unit's skill1 in memory
// (`withPatchedOverride` — the committed JSON is never touched) under the trigger being tested. Its
// `damage` events, filtered to `srcSlot: 'skill1'`, ARE the trigger's firing log: the probe fires
// once per activation, at the activation's frame. Every expectation is derived from the SAME run's
// other events (shots, reloads, burstCasts, FB boundaries), so nothing here restates an engine
// constant that could drift.
//
// The carrier is ZEROED first — all three kit slots emptied before the probe is installed — so the
// unit contributes nothing but its weapon and the one block under test. Without that, the carry's
// own kit buffs its own cadence and the "which frames did it fire on" expectation stops being
// derivable from the fixture. Deterministic EV runs (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import type { TriggerDef } from '../../../src/skills/types.js';
import { controlComp, runComp, withPatchedOverride } from '../lib/harness.js';

type DamageEvent = Extract<SimEvent, { kind: 'damage' }>;
type ShotEvent = Extract<SimEvent, { kind: 'shot' }>;
type ReloadEvent = Extract<SimEvent, { kind: 'reload' }>;
type BurstCastEvent = Extract<SimEvent, { kind: 'burstCast' }>;

/**
 * Install a probe block under `trigger` in `carry`'s (zeroed) skill1 and run the control comp.
 * `probeOn` names the unit that CARRIES the probe — for the team-wide triggers that is deliberately
 * a unit other than the one whose action fires them.
 */
function probe(
  trigger: TriggerDef,
  opts: { carry?: string; probeOn?: string } = {}
): {
  events: SimEvent[];
  procs: DamageEvent[];
  shots: (slug: string) => ShotEvent[];
  reloads: (slug: string) => ReloadEvent[];
  casts: BurstCastEvent[];
  fbStarts: number[];
  fbEnds: number[];
} {
  const carry = opts.carry ?? 'ada';
  const probeOn = opts.probeOn ?? carry;
  const comp = controlComp(carry);
  const patched = withPatchedOverride(probeOn, (ov) => {
    ov.skill1 = [
      {
        trigger,
        target: { kind: 'self' },
        effects: [{ kind: 'flatDamage', atkPct: 100 }],
      },
    ];
    ov.skill2 = [];
    ov.burst = [];
  });
  const events: SimEvent[] = [];
  runComp({
    ...comp,
    overrides: { [probeOn]: patched },
    cfg: { onEvent: (e) => events.push(e) },
  });
  return {
    events,
    procs: events.filter(
      (e): e is DamageEvent =>
        e.kind === 'damage' && e.slug === probeOn && e.srcSlot === 'skill1'
    ),
    shots: (slug) =>
      events.filter(
        (e): e is ShotEvent => e.kind === 'shot' && e.slug === slug
      ),
    reloads: (slug) =>
      events.filter(
        (e): e is ReloadEvent => e.kind === 'reload' && e.slug === slug
      ),
    casts: events.filter((e): e is BurstCastEvent => e.kind === 'burstCast'),
    fbStarts: events
      .filter((e) => e.kind === 'fullBurstStart')
      .map((e) => e.frame),
    fbEnds: events.filter((e) => e.kind === 'fullBurstEnd').map((e) => e.frame),
  };
}

describe('trigger-kind matrix', () => {
  describe('shotFired', () => {
    it('fires once per OWN trigger pull, on the pull frame', () => {
      // One activation per pull, not per ROUND: `ada` is RL (1 round/pull) so the two readings
      // coincide, which is the point of choosing her — the multi-round case is `hitCount`'s
      // territory (see hit-count-trigger.test.ts) and a shotFired block must NOT behave that way.
      const { procs, shots } = probe({ kind: 'shotFired' });
      const own = shots('ada');
      expect(own.length, 'the carry never fired').toBeGreaterThan(10);
      expect(procs.length).toBe(own.length);
      expect(procs.map((p) => p.frame)).toEqual(own.map((s) => s.frame));
    });

    it('DISCRIMINATING: it is the OWNER’s pulls, not the team’s', () => {
      // The probe rides on `helm` while the comp's other three units fire far more pulls than she
      // does. A block dispatched off team fire (or off the focused carry's fire) lands on a
      // completely different frame set — and on a different COUNT, which is the cheap tell.
      const { procs, shots } = probe(
        { kind: 'shotFired' },
        { probeOn: 'helm' }
      );
      const own = shots('helm');
      const others = ['liter', 'crown', 'ada'].flatMap((s) => shots(s));
      expect(own.length, 'the probe carrier never fired').toBeGreaterThan(5);
      // helm is a charge SR: her pull count sits far below the team's total
      expect(
        others.length,
        'fixture assumes teammates out-fire the carrier'
      ).toBeGreaterThan(own.length * 2);
      expect(procs.length).toBe(own.length);
      expect(procs.map((p) => p.frame)).toEqual(own.map((s) => s.frame));
    });
  });

  describe('lastBullet', () => {
    it('fires on the pull that EMPTIES the magazine, not when the reload completes', () => {
      // sim.ts fires this the instant `ammo <= 0`, before `reloading` is set — so the firing frames
      // are the frames of the pulls whose `ammoAfter` is 0, and every one of them precedes its
      // `reload` event by the weapon's reload time. Both halves are asserted: a model that fired on
      // reload COMPLETION would produce the right count with every frame shifted late.
      const { procs, shots, reloads } = probe({ kind: 'lastBullet' });
      const dry = shots('ada').filter((s) => s.ammoAfter === 0);
      expect(dry.length, 'the carry never ran dry').toBeGreaterThan(3);
      expect(procs.map((p) => p.frame)).toEqual(dry.map((s) => s.frame));
      const reloadFrames = reloads('ada').map((r) => r.frame);
      expect(
        reloadFrames.length,
        'fixture assumes the reloads complete in-fight'
      ).toBeGreaterThan(0);
      for (const [i, f] of procs.map((p) => p.frame).entries()) {
        if (reloadFrames[i] !== undefined) {
          expect(
            f,
            'lastBullet must precede the reload it starts'
          ).toBeLessThan(reloadFrames[i]);
        }
      }
    });
  });

  describe('interval', () => {
    it('FIRST fires at t = sec, NOT at t = 0, then every sec thereafter', () => {
      // The phase convention (⚑, src/skills/types.ts): an internal-cooldown skill is on cooldown
      // from the start of the fight, so the first activation is one full period in. Off-by-one
      // here is a whole extra proc on every interval carrier in the roster — a silent few-% lift
      // that a totals-only test absorbs.
      const SEC = 15;
      const { procs, events } = probe({ kind: 'interval', sec: SEC });
      const period = SEC * 60;
      const lastFrame = Math.max(...events.map((e) => e.frame));
      const want: number[] = [];
      for (let f = period; f <= lastFrame; f += period) {
        want.push(f);
      }
      expect(
        want.length,
        'the fight is shorter than one period'
      ).toBeGreaterThan(3);
      expect(procs.map((p) => p.frame)).toEqual(want);
      expect(procs[0].frame, 'an interval block must not fire at t=0').toBe(
        period
      );
    });

    it('DISCRIMINATING: the period is real — halving `sec` doubles the activations', () => {
      // Guards the arithmetic itself (period = round(sec × FPS)), which a hardcoded "fires every
      // 15s" implementation would pass the test above with.
      const long = probe({ kind: 'interval', sec: 20 }).procs.length;
      const short = probe({ kind: 'interval', sec: 10 }).procs.length;
      expect(long, 'the 20s arm never fired').toBeGreaterThan(2);
      // twice as many, ±1 — the tail of the fight may or may not contain the final short-arm tick
      expect(Math.abs(short - long * 2)).toBeLessThanOrEqual(1);
    });
  });

  describe('stageEnter', () => {
    it('fires for EVERY unit when a burst of that stage is cast, on the cast frame', () => {
      // Team-wide, not caster-only: the probe rides on `helm` (a Burst III) and is triggered by
      // `liter`'s Burst I casts. A caster-scoped implementation fires zero times here.
      const { procs, casts } = probe(
        { kind: 'stageEnter', stage: 1 },
        { probeOn: 'helm' }
      );
      const stage1 = casts.filter((c) => c.stage === 1);
      expect(stage1.length, 'no Burst I was cast').toBeGreaterThan(2);
      expect(
        stage1.every((c) => c.slug !== 'helm'),
        'fixture assumes the probe carrier is not the stage-1 caster'
      ).toBe(true);
      expect(procs.length).toBe(stage1.length);
      expect(procs.map((p) => p.frame)).toEqual(stage1.map((c) => c.frame));
    });

    it('DISCRIMINATING: the stage is matched literally — a stage-2 block ignores stage-1 casts', () => {
      const { procs, casts } = probe(
        { kind: 'stageEnter', stage: 2 },
        { probeOn: 'helm' }
      );
      const stage2 = casts.filter((c) => c.stage === 2);
      const stage1 = casts.filter((c) => c.stage === 1);
      expect(stage2.length).toBeGreaterThan(2);
      expect(
        stage1.length,
        'fixture needs stage-1 casts present to be ignored'
      ).toBeGreaterThan(2);
      expect(procs.map((p) => p.frame)).toEqual(stage2.map((c) => c.frame));
    });
  });

  describe('fullBurstEnter / fullBurstEnd', () => {
    it('fire once per Full Burst window, for every unit, on the window boundaries', () => {
      const enter = probe({ kind: 'fullBurstEnter' }, { probeOn: 'crown' });
      expect(
        enter.fbStarts.length,
        'the fixture made no Full Burst'
      ).toBeGreaterThan(2);
      expect(enter.procs.map((p) => p.frame)).toEqual(enter.fbStarts);

      const end = probe({ kind: 'fullBurstEnd' }, { probeOn: 'crown' });
      expect(
        end.fbEnds.length,
        'no window closed in-fight — the arm would be vacuous'
      ).toBeGreaterThan(2);
      expect(end.procs.map((p) => p.frame)).toEqual(end.fbEnds);
    });

    it('DISCRIMINATING: enter and end are DIFFERENT frames, a window apart', () => {
      // The two kinds are one character apart in the override JSON and dispatch through the same
      // `fireTriggered` helper — the failure mode is them being wired to the same boundary. A
      // 10-second window separates them, so nothing subtle is needed to tell them apart.
      const { fbStarts, fbEnds } = probe({ kind: 'fullBurstEnter' });
      expect(fbStarts.length).toBeGreaterThan(2);
      const pairs = fbStarts.map((s, i) => [s, fbEnds[i]] as const);
      for (const [s, e] of pairs) {
        if (e === undefined) {
          continue; // a window still open at the final frame
        }
        expect(e, 'the FB window must have positive length').toBeGreaterThan(s);
      }
    });
  });
});
