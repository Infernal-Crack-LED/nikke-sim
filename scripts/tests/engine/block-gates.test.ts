// Engine-primitive backfill: BLOCK-LEVEL GATES — the second cross-cutting layer no primitive census
// row names. A gate decides whether a trigger's activation counts at all, so a gate error does not
// scale a number, it adds or removes whole procs.
//
// Covered (carrier counts from the primitive census in docs/engine-modeling-gaps.md):
//   `fbGate` inFb/outFb (6 + 1) · `everyN` (5) · `everyNOffset` (2) · `requiresCore` (4) ·
//   `bossElementGate` (3), plus the ORDER in which the gates and the everyN activation counter run.
//
// That ordering is the reason this file exists. sim.ts evaluates the abort-gates BEFORE incrementing
// the activation counter, so a gated-out activation does not advance `everyN` ("after casting 3
// normal attacks DURING Full Burst" must not be advanced by out-of-FB shots). The code comment
// records that NO shipped override combines everyN with a gate today — which is exactly why the
// regression snapshot cannot protect it: the behaviour is live, reachable by the next kit authored,
// and currently unexercised by every other test in the repo.
//
// Method: the control comp with ONE SYNTHETIC gated block in the carry's skill1. Deterministic runs.
import { describe, expect, it } from 'vitest';
import type { SimEvent, SimConfig } from '../../../src/types.js';
import { controlComp, runComp, withPatchedOverride } from '../lib/harness.js';

type DamageEvent = Extract<SimEvent, { kind: 'damage' }>;
type ShotEvent = Extract<SimEvent, { kind: 'shot' }>;

const CARRY = 'ada';

function probe(block: Record<string, unknown>, cfg: Partial<SimConfig> = {}) {
  const patched = withPatchedOverride(CARRY, (ov) => {
    ov.skill1 = [{ target: { kind: 'self' }, effects: [{ kind: 'flatDamage', atkPct: 100 }], ...block }];
  });
  const events: SimEvent[] = [];
  runComp({
    ...controlComp(CARRY),
    overrides: { [CARRY]: patched },
    cfg: { ...cfg, onEvent: (e) => events.push(e) },
  });
  const procs = events.filter(
    (e): e is DamageEvent => e.kind === 'damage' && e.slug === CARRY && e.srcSlot === 'skill1',
  );
  const shots = events.filter((e): e is ShotEvent => e.kind === 'shot' && e.slug === CARRY);
  // frame → whether a Full Burst window was open, read off the log's own boundaries
  const bounds = events.filter((e) => e.kind === 'fullBurstStart' || e.kind === 'fullBurstEnd');
  const inFb = (frame: number): boolean => {
    let open = false;
    for (const b of bounds) {
      if (b.frame > frame) break;
      open = b.kind === 'fullBurstStart';
    }
    return open;
  };
  return { events, procs, shots, inFb };
}

const perShot = (extra: Record<string, unknown> = {}) => ({ trigger: { kind: 'shotFired' }, ...extra });
const every5s = (extra: Record<string, unknown> = {}) => ({ trigger: { kind: 'interval', sec: 5 }, ...extra });

describe('block gates', () => {
  it('fbGate partitions the trigger stream EXACTLY into in-FB and out-of-FB activations', () => {
    // Each arm is checked against ITS OWN pull stream and ITS OWN logged Full Burst boundaries,
    // never against another arm's. That is not fussiness: skill damage generates burst gauge
    // (skillGauge on every flatDamage instance), so arms that proc a different number of times
    // reach Full Burst at different frames and their timelines legitimately diverge — a cross-arm
    // frame comparison here fails for a reason that has nothing to do with the gate.
    //
    // Asserting the exact partition (rather than "inFb fires less often") is what makes it
    // airtight: every pull fires in exactly one of the two arms, and an off-by-one on the window
    // boundary shows up as a pull claimed by neither.
    const ungated = probe(perShot());
    expect(ungated.procs.map((p) => p.frame), 'the ungated block did not fire on every pull').toEqual(
      ungated.shots.map((s) => s.frame),
    );
    for (const [gate, want] of [
      ['inFb', true],
      ['outFb', false],
    ] as const) {
      const arm = probe(perShot({ fbGate: gate }));
      const expected = arm.shots.filter((s) => arm.inFb(s.frame) === want).map((s) => s.frame);
      expect(expected.length, `no pull was ${want ? 'inside' : 'outside'} a Full Burst — arm is vacuous`).toBeGreaterThan(0);
      expect(
        arm.procs.map((p) => p.frame),
        `fbGate '${gate}' did not fire on exactly the ${want ? 'in-FB' : 'out-of-FB'} pulls`,
      ).toEqual(expected);
    }
  });

  it('everyN fires on every Nth activation, and everyNOffset shifts the phase', () => {
    const plain = probe(every5s()).procs.map((p) => p.frame);
    const third = probe(every5s({ everyN: 3 })).procs.map((p) => p.frame);
    const offset = probe(every5s({ everyN: 3, everyNOffset: 1 })).procs.map((p) => p.frame);
    expect(plain.length, 'the ungated interval probe never fired').toBeGreaterThan(6);
    // activations 3, 6, 9 … vs 1, 4, 7 … — same period, different phase
    expect(third).toEqual(plain.filter((_, i) => (i + 1) % 3 === 0));
    expect(offset).toEqual(plain.filter((_, i) => i % 3 === 0));
    expect(offset[0], 'the offset arm should fire on the FIRST activation').toBe(plain[0]);
    expect(third[0], 'the un-offset arm should skip the first two activations').toBe(plain[2]);
  });

  it('DISCRIMINATING: a gated-out activation does NOT advance the everyN counter', () => {
    // "Every 2nd normal attack DURING Full Burst" must count in-FB shots only. The gates run before
    // the activation counter, so the out-of-FB pulls are invisible to it. If the counter ran first,
    // the block would fire on whichever in-FB pulls happened to land on a globally-even ordinal —
    // a set of the same rough SIZE (so a count-only assertion passes) but at the wrong frames.
    // No shipped override combines the two today, so nothing else in the repo can catch a regression.
    // Self-contained within one run (see the gauge-feedback note above): the arm's own in-FB pulls
    // are the activation sequence, and the block must fire on every second one of THOSE.
    const arm = probe(perShot({ fbGate: 'inFb', everyN: 2 }));
    const inFbPulls = arm.shots.filter((s) => arm.inFb(s.frame)).map((s) => s.frame);
    expect(inFbPulls.length, 'not enough in-FB pulls to test the phase').toBeGreaterThan(6);
    expect(
      arm.procs.map((p) => p.frame),
      'everyN counted activations the fbGate had already rejected',
    ).toEqual(inFbPulls.filter((_, i) => (i + 1) % 2 === 0));
  });

  it('requiresCore blocks are inert in a fight with no core exposure', () => {
    // The gate reads the FIGHT's core exposure, not whether a particular hit cored: a kit line whose
    // in-game trigger needs a core hit cannot fire at all against a coreless target.
    const exposed = probe(every5s({ requiresCore: true })).procs;
    const coreless = probe(every5s({ requiresCore: true }), { coreHitRate: 0 }).procs;
    const ungated = probe(every5s(), { coreHitRate: 0 }).procs;
    expect(exposed.length, 'the core-gated block never fired at 100% core exposure').toBeGreaterThan(0);
    expect(coreless, 'a core-gated block fired against a coreless target').toEqual([]);
    // ...and the coreless fight is otherwise perfectly capable of firing the same block
    expect(ungated.length, 'the coreless control fired nothing at all — the arm above is vacuous').toBeGreaterThan(0);
  });

  it('bossElementGate fires only against the matching boss element', () => {
    const match = probe(every5s({ bossElementGate: 'Fire' })).procs;
    const miss = probe(every5s({ bossElementGate: 'Water' })).procs;
    expect(match.length, 'the element-gated block never fired against its own element').toBeGreaterThan(0);
    expect(miss, 'an element-gated block fired against the wrong boss element').toEqual([]);
  });
});
