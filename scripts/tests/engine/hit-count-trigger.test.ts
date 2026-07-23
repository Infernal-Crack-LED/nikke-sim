// Engine-primitive backfill: the `hitCount` TRIGGER — 31 override carriers (primitive census in
// docs/engine-modeling-gaps.md), the second-largest blast radius after flatDamage.
//
// "Every N hits" kit lines are counted in ROUNDS, not in trigger pulls: one SG pull is 10 hits and
// one MG pull is `hitsPerShot` hits, so the same threshold fires at wildly different rates across
// weapons. The three ways an implementation gets this wrong — counting pulls instead of rounds,
// capping at one activation per pull, and resetting the accrued meter instead of carrying the
// remainder — are each pinned by their own assertion below.
//
// Method: the control comp (liter / crown / <carry> / helm) with ONE SYNTHETIC hitCount block
// installed in the carry's skill1, in memory. The carry is chosen per assertion for its
// hitsPerShot: `ada` (RL, 1 round/pull) isolates the threshold arithmetic, `soda-twinkling-bunny`
// (SG, 10 rounds/pull) exposes the per-pull multiplicity a pull-counting model cannot produce.
// Deterministic EV runs (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { controlComp, data, runComp, withPatchedOverride } from '../lib/harness.js';

type DamageEvent = Extract<SimEvent, { kind: 'damage' }>;
type ShotEvent = Extract<SimEvent, { kind: 'shot' }>;

const hitsPerShot = (slug: string): number => data.characters[slug].hitsPerShot;

/** Install a hitCount-triggered flatDamage probe in the carry's skill1 and run the control comp. */
function probe(
  carry: string,
  trigger: { kind: 'hitCount'; count: number; countInFb?: number },
): { events: SimEvent[]; procs: DamageEvent[]; shots: ShotEvent[] } {
  const patched = withPatchedOverride(carry, (ov) => {
    ov.skill1 = [{ trigger, target: { kind: 'self' }, effects: [{ kind: 'flatDamage', atkPct: 100 }] }];
  });
  const events: SimEvent[] = [];
  runComp({
    ...controlComp(carry),
    overrides: { [carry]: patched },
    cfg: { onEvent: (e) => events.push(e) },
  });
  return {
    events,
    procs: events.filter(
      (e): e is DamageEvent => e.kind === 'damage' && e.slug === carry && e.srcSlot === 'skill1',
    ),
    shots: events.filter((e): e is ShotEvent => e.kind === 'shot' && e.slug === carry),
  };
}

describe('hitCount trigger', () => {
  it('fires every `count` rounds of the OWNER\'s own fire', () => {
    // ada is RL (1 round per pull), so rounds == pulls here and the arithmetic is exact:
    // floor(total rounds / count) activations, at the frames of the count-th, 2·count-th … pull.
    // Teammates fire far more rounds than she does over the same fight, so an implementation
    // counting TEAM hits (or hits taken) lands nowhere near this number.
    const COUNT = 7;
    const { procs, shots } = probe('ada', { kind: 'hitCount', count: COUNT });
    const rounds = shots.length * hitsPerShot('ada');
    expect(rounds, 'the carry never fired').toBeGreaterThan(COUNT);
    expect(procs.length, `${rounds} rounds / ${COUNT}`).toBe(Math.floor(rounds / COUNT));
    // ...and at exactly the right pulls, which no coarser count-matching can fake.
    const wantFrames = shots.filter((_, i) => (i + 1) % COUNT === 0).map((s) => s.frame);
    expect(procs.map((p) => p.frame)).toEqual(wantFrames);
  });

  it('DISCRIMINATING: the meter advances by hitsPerShot per PULL, not by one', () => {
    // soda-twinkling-bunny is SG: every trigger pull is 10 rounds. At count 10 she fires the block
    // once per PULL — a model counting pulls would fire once per TEN pulls, a 10× error in every
    // "every N hits" kit line on a multi-hit weapon.
    const carry = 'soda-twinkling-bunny';
    const hps = hitsPerShot(carry);
    expect(hps, 'fixture assumes a multi-round weapon').toBeGreaterThan(1);
    const { procs, shots } = probe(carry, { kind: 'hitCount', count: hps });
    expect(shots.length, 'the carry never fired').toBeGreaterThan(0);
    expect(procs.length, `one activation per pull at count == hitsPerShot (${hps})`).toBe(shots.length);
    expect(procs.map((p) => p.frame)).toEqual(shots.map((s) => s.frame));
  });

  it('DISCRIMINATING: one pull can fire the block several times, and the remainder carries over', () => {
    // 10 rounds/pull against a threshold of 3 = 3 activations on pull 1 with 1 round banked, so
    // pull 2 has 11 and fires 3 again (2 banked), pull 3 has 12 and fires FOUR. Two separate wrong
    // models die here: one activation per pull (→ 1 per pull), and resetting the meter each pull
    // (→ a flat 3 per pull, never 4). Only carrying the remainder produces floor(rounds/3) overall.
    const carry = 'soda-twinkling-bunny';
    const COUNT = 3;
    const { procs, shots } = probe(carry, { kind: 'hitCount', count: COUNT });
    const rounds = shots.length * hitsPerShot(carry);
    expect(procs.length, `${rounds} rounds / ${COUNT} — a per-pull reset would give fewer`).toBe(
      Math.floor(rounds / COUNT),
    );
    const perFrame = new Map<number, number>();
    for (const p of procs) perFrame.set(p.frame, (perFrame.get(p.frame) ?? 0) + 1);
    const counts = [...new Set(perFrame.values())].sort();
    expect(Math.max(...counts), 'no pull ever fired the block more than 3 times').toBe(4);
    expect(counts, 'activations per pull should alternate 3/4 as the remainder accrues').toEqual([3, 4]);
  });

  it('DISCRIMINATING: countInFb lowers the threshold in Full Burst and the accrued meter CARRIES OVER', () => {
    // rapi-red-hood's rocket meter fills 2× faster in her Full Burst (threshold 120 → 60). The
    // engine does NOT reset the counter at the boundary — the lower threshold simply consumes what
    // already accrued, which is why a near-full meter fires the moment Full Burst opens.
    // Pushed to the limit: an unreachable out-of-FB threshold banks every round of the opening
    // minute, then countInFb 1 detonates ALL of it on the first in-FB pull. A model that reset (or
    // that only started counting in FB) fires exactly once there instead.
    const carry = 'ada';
    const { procs, shots, events } = probe(carry, { kind: 'hitCount', count: 100_000, countInFb: 1 });
    const windows = events
      .filter((e) => e.kind === 'fullBurstStart' || e.kind === 'fullBurstEnd')
      .map((e) => ({ kind: e.kind, frame: e.frame }));
    expect(windows.length, 'the fixture never reached a Full Burst').toBeGreaterThan(1);
    const inFb = (frame: number): boolean => {
      let open = false;
      for (const w of windows) {
        if (w.frame > frame) break;
        open = w.kind === 'fullBurstStart';
      }
      return open;
    };
    const firstInFbShot = shots.find((s) => inFb(s.frame));
    expect(firstInFbShot, 'the carry never fired inside a Full Burst window').toBeDefined();
    const accrued = shots.filter((s) => s.frame <= firstInFbShot!.frame).length * hitsPerShot(carry);
    // (measured in this fixture: 5 rounds banked before her first in-FB pull, so "discharge the
    // meter" and "fire once" are 5 apart — small, but unambiguous)
    expect(accrued, 'nothing had accrued before the first in-FB pull — the arm is vacuous').toBeGreaterThan(2);
    const atThatFrame = procs.filter((p) => p.frame === firstInFbShot!.frame).length;
    expect(
      atThatFrame,
      `the first in-FB pull should discharge all ${accrued} banked rounds at threshold 1`,
    ).toBe(accrued);
    // and nothing fired at all before that frame, since the out-of-FB threshold is unreachable
    expect(procs.filter((p) => p.frame < firstInFbShot!.frame), 'the 100k threshold leaked').toEqual([]);
  });
});
