// PER-UNIT KIT SPEC — `alice` (Alice, Attacker/SR/Fire, Burst III, cd 40s, ammo 6,
// chargeFrames 90). Kit-autonomy gauntlet 2026-07-24 (Tier 2: scoped top-2-ATK buff,
// fullBurstEnter-vs-burstCast triggers, >80%HP status gate).
//
// One assertion group per KIT LINE (A1..C2 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.alice.skills):
//   S1 ■ entering Full Burst → 2 allies with the highest final ATK:
//        Charge Speed ▲11.67% (of the skill user's Charge Speed) for 10 sec          [A1]
//        Charge Damage ▲7% for 10 sec                                               [A2]
//   S2 ■ self, above 80% HP: Gain continuous Pierce                                  [B1]
//      ■ self, below 80% HP: recover HP by 8.12% of attack damage                    [B2]
//   BU ■ self: Charge Speed ▲80.15% for 10 sec                                       [C1]
//        ATK ▲55.12% for 10 sec                                                      [C2]
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   A1  the trigger is `fullBurstEnter` (fires on EVERY team Full Burst entry — 11× here), NOT
//       `burstCast` (alice's own 6 casts). The frame set must equal the fullBurstStart frames
//       exactly; a burstCast model lands on her 6 cast frames and provably fails. The target is
//       the top-2-by-final-ATK allies (per firing), so each firing reaches exactly 2 holders — a
//       blanket all-allies model reaches 4 and provably fails.
//   A2  same fullBurstEnter cadence + top-2 target; the magnitude is the level-10 7, not the
//       level-1 4.13.
//   B1  Pierce is modeled UNGATED (hasPierce) because the >80%HP gate is always satisfied at scope
//       lock (the boss deals no damage). With PIERCE_CORE_DOUBLE=false (sim.ts:1091) and NO
//       pierceDamagePct source in her kit, hasPierce moves NO damage: removing it must leave every
//       unit's total byte-identical. A double-hit model, or a pierceDamagePct source, would break
//       this — so the inertness is a real, falsifiable property (the A23 "one popup, no double-hit"
//       fact), not a vacuous one.
//   B2  lifesteal is out-of-domain: no HP pool and no incoming damage are modeled, so 8.12% of
//       attack damage as HP has no observable. Documented as a gap (skip), flagged ⚑ in the override.
//   C1/C2  the burst is a SELF buff on `burstCast` (alice's 6 cast frames), NOT fullBurstEnter
//       (11 FB frames). The frame set must equal her burstCast frames; a fullBurstEnter model
//       over-fires and provably fails. Self-scoped: only slot ALICE holds them.
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / alice B3 / helm B3, boss Fire,
// focus alice) — alice needs a real rotation to cast her burst and to enter Full Burst at all.
// Deterministic (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** controlComp slot order: liter 0 / crown 1 / alice 2 / helm 3. */
const ALICE = 2;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type FullBurstStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('alice'),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches -------------------------------------------------------------------
/** A1/A2 nearest-wrong trigger: S1 keyed to her own burst CAST instead of Full Burst entry. */
const s1BurstCast = withPatchedOverride('alice', (ov) => {
  if (!ov.skill1[0] || ov.skill1[0].trigger.kind !== 'fullBurstEnter')
    throw new Error('alice S1 fullBurstEnter block missing — fixture is stale');
  ov.skill1[0].trigger.kind = 'burstCast';
});
/** A1/A2 nearest-wrong target: the buff blankets all 4 allies instead of the top-2 by final ATK. */
const s1AllAllies = withPatchedOverride('alice', (ov) => {
  if (ov.skill1[0]?.target?.count !== 2)
    throw new Error('alice S1 top-2 target missing — fixture is stale');
  ov.skill1[0].target.count = 4;
});
/** C1/C2 nearest-wrong trigger: the self-burst keyed to Full Burst entry instead of her cast. */
const burstFbEnter = withPatchedOverride('alice', (ov) => {
  if (!ov.burst[0] || ov.burst[0].trigger.kind !== 'burstCast')
    throw new Error('alice burst burstCast block missing — fixture is stale');
  ov.burst[0].trigger.kind = 'fullBurstEnter';
});
/** B1 reference: Pierce removed entirely (the ungated-gate / no-double-hit inertness probe). */
const noPierce = withPatchedOverride('alice', (ov) => {
  if (ov.hasPierce !== true)
    throw new Error('alice hasPierce missing — fixture is stale');
  ov.hasPierce = false;
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const s1Cast = run({ alice: s1BurstCast });
const s1All = run({ alice: s1AllAllies });
const burstFb = run({ alice: burstFbEnter });
const pierceOff = run({ alice: noPierce });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const fbStartFrames = (evs: SimEvent[]) =>
  evs
    .filter((e): e is FullBurstStart => e.kind === 'fullBurstStart')
    .map((e) => e.frame)
    .sort((a, b) => a - b);
const aliceCastFrames = (evs: SimEvent[]) =>
  evs
    .filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'alice')
    .map((e) => e.frame)
    .sort((a, b) => a - b);

/** alice's own applications of a given stat+value. */
const aliceBuff = (evs: SimEvent[], stat: string, value: number) =>
  buffs(evs).filter(
    (b) => b.casterIdx === ALICE && b.stat === stat && b.value === value,
  );

const distinctFrames = (xs: BuffApply[]) =>
  [...new Set(xs.map((b) => b.frame))].sort((a, b) => a - b);

/** Number of distinct holders reached on each firing frame. */
const holdersPerFrame = (xs: BuffApply[]): [number, number][] => {
  const m = new Map<number, Set<number | null>>();
  for (const b of xs)
    (m.get(b.frame) ?? m.set(b.frame, new Set()).get(b.frame)!).add(
      b.targetIdx,
    );
  return [...m.entries()]
    .map(([f, s]): [number, number] => [f, s.size])
    .sort((a, b) => a[0] - b[0]);
};

describe('alice — kit spec', () => {
  describe('A1 — S1 Charge Speed 11.67% to the top-2 ATK allies on Full Burst entry', () => {
    const applied = aliceBuff(base.events, 'chargeSpeedPct', 11.67);

    it('fires on EVERY Full Burst entry frame (fullBurstEnter, not her own burstCast)', () => {
      expect(distinctFrames(applied)).toEqual(fbStartFrames(base.events));
    });

    it('DISCRIMINATING: a burstCast trigger lands on her cast frames, not the FB frames', () => {
      const cast = aliceBuff(s1Cast.events, 'chargeSpeedPct', 11.67);
      expect(distinctFrames(cast)).not.toEqual(fbStartFrames(s1Cast.events));
      expect(distinctFrames(cast)).toEqual(aliceCastFrames(s1Cast.events));
    });

    it('reaches exactly 2 allies per firing (highest final ATK), for 10 sec', () => {
      expect(applied.length).toBeGreaterThan(0);
      for (const [, n] of holdersPerFrame(applied)) expect(n).toBe(2);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('DISCRIMINATING: a blanket all-allies model reaches 4 holders, not 2', () => {
      const all = aliceBuff(s1All.events, 'chargeSpeedPct', 11.67);
      expect(holdersPerFrame(all).some(([, n]) => n === 4)).toBe(true);
    });
  });

  describe('A2 — S1 Charge Damage 7% on the same Full Burst cadence', () => {
    const applied = aliceBuff(base.events, 'chargeDamagePct', 7);

    it('is 7% (level 10), on every FB entry frame, 2 allies, 10 sec', () => {
      expect([...new Set(applied.map((b) => b.value))]).toEqual([7]);
      expect(distinctFrames(applied)).toEqual(fbStartFrames(base.events));
      for (const [, n] of holdersPerFrame(applied)) expect(n).toBe(2);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('DISCRIMINATING: a burstCast trigger would not align with the FB frames', () => {
      const cast = aliceBuff(s1Cast.events, 'chargeDamagePct', 7);
      expect(distinctFrames(cast)).not.toEqual(fbStartFrames(s1Cast.events));
    });
  });

  describe('B1 — S2 continuous Pierce (ungated; >80%HP gate always satisfied at scope lock)', () => {
    it("is inert at scope lock: removing it changes NO unit's total by a single point", () => {
      // PIERCE_CORE_DOUBLE=false (no core+body double-hit) and alice has no pierceDamagePct source,
      // so the Pierce tag moves no damage on the partless boss. A double-hit model, or a live
      // pierceDamagePct buff, would break this equality — it pins the A23 "one popup, no double-hit"
      // fact and that the unmodeled >80%HP gate changes nothing while the boss deals no damage.
      expect(base.totals).toEqual(pierceOff.totals);
    });
  });

  describe('B2 — S2 lifesteal 8.12% of attack damage below 80% HP (out-of-domain)', () => {
    it.skip('has no observable: no HP pool and no incoming damage are modeled at scope lock', () => {
      // GAP: "recover HP by 8.12% of attack damage" needs an HP pool AND incoming damage to ever
      // drop below the 80% gate; the scope-lock boss deals no damage and no HP pool is simulated,
      // so the line can move no damage and emits no event. Flagged ⚑ in the override (unmodeled).
      // Re-encode if an HP-pool / damage-taken primitive is ever added to the engine.
    });
  });

  describe('C1 — burst Charge Speed 80.15%, self only, on each burst CAST', () => {
    const applied = aliceBuff(base.events, 'chargeSpeedPct', 80.15);

    it('is 80.15% held by alice alone, fired on each burstCast frame, for 10 sec', () => {
      expect([...new Set(applied.map((b) => b.value))]).toEqual([80.15]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([ALICE]);
      expect(distinctFrames(applied)).toEqual(aliceCastFrames(base.events));
      expect(applied.length).toBeGreaterThan(0);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('DISCRIMINATING: a fullBurstEnter trigger over-fires on the FB frames, not her casts', () => {
      const fb = aliceBuff(burstFb.events, 'chargeSpeedPct', 80.15);
      expect(distinctFrames(fb)).not.toEqual(aliceCastFrames(burstFb.events));
      expect(distinctFrames(fb)).toEqual(fbStartFrames(burstFb.events));
    });
  });

  describe('C2 — burst ATK 55.12%, self only, on each burst CAST', () => {
    const applied = aliceBuff(base.events, 'atkPct', 55.12);

    it('is 55.12% held by alice alone, fired on each burstCast frame, for 10 sec', () => {
      expect([...new Set(applied.map((b) => b.value))]).toEqual([55.12]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([ALICE]);
      expect(distinctFrames(applied)).toEqual(aliceCastFrames(base.events));
      expect(applied.length).toBeGreaterThan(0);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('DISCRIMINATING: a fullBurstEnter trigger over-fires on the FB frames, not her casts', () => {
      const fb = aliceBuff(burstFb.events, 'atkPct', 55.12);
      expect(distinctFrames(fb)).not.toEqual(aliceCastFrames(burstFb.events));
    });
  });
});
