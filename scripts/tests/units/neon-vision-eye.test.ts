// PER-UNIT KIT SPEC — `neon-vision-eye` (Neon: Vision Eye, Attacker/RL/Electric, Burst III, cd 40s,
// ammo 6, chargeFrames 60, hitsPerShot 1). Kit-autonomy gauntlet 2026-07-25 (driver: Qwen).
//
// DISAMBIGUATION (P0): this is `neon-vision-eye` (RL/Electric, aka "nve") — NOT base `neon`
// (SG/Fire) and NOT `neon-blue-ocean` (MG/Water). The slug-disambiguation lint flags the substring
// "neon" inherent in the slug/official name; that is informational (exit 0). Every assertion below
// keys on slug === 'neon-vision-eye'.
//
// One assertion group per LOAD-BEARING KIT LINE (N1..N6), asserted against the SHIPPED override
// loaded from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS — the nearest wrong
// model each assertion must discriminate against — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters['neon-vision-eye'].skills):
//   S1 ■ when attacked while not Healthy Body → self: Invulnerable 3s (5/battle) + debuff immunity   [UNMODELED — defensive]
//      ■ Healthy Body: Incoming healing ▲10.26% for 20s                                              [UNMODELED — received-heal amp, no heal event]
//      ■ landing a Full Charge attack → the target: Firepower Explosion 437.98% final ATK addl dmg   [N1]
//      ■ additional effect of Super Firepower status: 262.79% final ATK as additional damage          [N2]
//   S2 ■ start of battle → self: +100 Firepower Gauge                                                 [UNMODELED — gauge bookkeeping, ABSORBED into N2/N4/N5 cadence]
//      ■ normal attack during Firepower Charge → self: +2 Firepower Gauge                            [UNMODELED — gauge bookkeeping, ABSORBED]
//      ■ Firepower Charge ends → self: +45 Firepower Gauge                                           [UNMODELED — gauge bookkeeping, ABSORBED]
//      ■ Full Burst ends while gauge active → self: Burst Gauge fill speed ▲5%×gauge for 5s          [UNMODELED — burst-gen only]
//      ■ entering Full Burst → self: Maximum Firepower ATK ▲80.04% for 10s                           [N3]
//      ■ additional effect for Super Firepower: ATK ▲35.05% for 10s                                  [N4]
//   BU ■ gauge < 100 → self: Firepower Charge, charges gauge 10s, +1 gauge                            [UNMODELED — bookkeeping, ABSORBED]
//      ■ gauge = 100 → self: Super Firepower Attack Damage ▲45.03% for 10s, -100 gauge               [N5]  (the -100 gauge is bookkeeping, ABSORBED)
//      ■ self: Explosion Radius ▲200% for 10s                                                        [UNMODELED — inert, single partless boss]
//      ■ self: Attack Damage ▲110.21% for 10s                                                        [N6]
//
// THE META-DEFINING MECHANIC (Tier 2): the Firepower Gauge / Super Firepower ALTERNATION. Gauge
// starts at 100 (S2); a burst at gauge=100 fires Super Firepower then drains to 0; refilling 0→100
// takes two charge-bursts, so Super Firepower fires on her burst casts 1, 4, 7, … The override
// ABSORBS all the gauge plumbing into the skill1 Super block's `everyN: 3, everyNOffset: 1`, which
// the engine evaluates as "fire when activations ≡ 1 (mod 3)" → casts 1, 4, 7 (video-verified
// cast-by-cast, Run B; kit-status MEASURED). N2/N4/N5 are the three SUPER riders (every 3rd cast);
// N3/N6 fire EVERY cast. The cadence split IS the kit — a model that made Super always-on (the
// nearest wrong reading of "Super Firepower: Attack Damage ▲45.03%") over-buffs every burst.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   N1  437.98% is a function "additional damage" rider on EVERY full-charge shot (she is in the
//       helm/anis on-hit proc class, NOT a Q1-exempt class). Proven live: shipped lands one per shot
//       in the 'skill' bucket (srcSlot skill1); the block-removed counterfactual lands ZERO. It
//       crits at the caster's rate and never cores (SSOT damage-calculation.md §2b / U1 ruling).
//   N2  the 262.79% Super rider is an `extraHitDamagePct` BUFF (10s) applied on casts 1,4,7 — while
//       live, every shot deals a 'burst'-bucket rider (srcSlot null, the summed-stat convention).
//       Two discriminations at once: (a) CADENCE — the buff applies exactly floor((bursts-1)/3)+1
//       times, strictly fewer than the burst count, so an always-on Super (everyN removed) provably
//       over-fires; (b) ENCODING — the rider rides the 'burst' bucket via an extraHitDamagePct buff,
//       NOT the old hitCount:12 flatDamage blend the pre-2026-07-13 model used (that would land in
//       the 'skill' bucket with srcSlot skill1 and no governing buff).
//   N3  80.04% ATK on Full Burst entry, EVERY rotation she completes (sole B3 → one per burst cast),
//       10s, self-scoped. Discriminated from the Super-only 35.05% rider (N4) by value AND cadence.
//   N4  35.05% ATK Super rider — same every-3rd-cast cadence as N2 (fires on the identical frames),
//       value-distinct from N3's 80.04%. An always-on Super would fire it every cast.
//   N5  45.03% Attack Damage Super rider — every-3rd-cast cadence, value-distinct from N6's 110.21%.
//   N6  110.21% Attack Damage, the burst's UNCONDITIONAL rider — EVERY cast (count === burst casts),
//       10s, self-scoped. The block-removed counterfactual lands zero.
//
// UNMODELED (deliberately NOT asserted — inert under the scope lock, documented per non-negotiable):
//   the S1 defensive lines (invuln/debuff-immunity/received-heal amp — no damage surface, no heal
//   event); ALL Firepower Gauge plumbing (start +100, +2/attack, +45 on end, burst <100 charge,
//   =100 drain — bookkeeping whose steady-state consequence is ABSORBED into the everyN 3/offset 1
//   cadence pinned by N2/N4/N5); the S2 Full-Burst-end burst-gauge-fill smoothing (burst-gen only,
//   empirically does not consume the cycle); the burst Explosion Radius ▲200% (inert — single
//   partless boss, no AoE surface).
//
// Fixture: controlComp('neon-vision-eye', false) = liter (B1) / crown (B2) / neon-vision-eye (B3,
// slot 2), boss Fire, focus neon-vision-eye. helm is DROPPED so neon is the SOLE B3 — every Full
// Burst is hers, so burst-cast count === Full-Burst-enter count and the cadence math is clean. She
// needs the B1/B2 core to cast at all (a lone B3 makes zero Full Bursts). Deterministic (no seed);
// 5 bursts over 180s at frames [338, 2598, 4778, 6998, 9218] → Super on casts 1 & 4.
//
// KNOWN FIXTURE LIMITATION (documented, not a gap in the override): with neon as SOLE B3, her
// `burstCast` and the team `fullBurstEnter` coincide on every rotation, so this fixture cannot
// discriminate trigger KIND for the two lines where it matters — S2 80.04% ATK (kit: "entering
// Full Burst" → fullBurstEnter) vs burst 110.21%/45.03% (kit: her OWN cast → burstCast). In a
// multi-B3 comp (helm co-B3) a burstCast-keyed 80.04 would skip the co-B3's rotations and a
// fullBurstEnter-keyed 110.21 would over-fire on them (fable S2b traps #3). The shipped override
// has both trigger kinds correct by inspection (skill2 80.04 = fullBurstEnter; burst 110.21/45.03
// = burstCast); the S5 blind re-derivation and the fable review corroborate the identities. Values,
// cadence, scope and duration — the load-bearing observables — are fully pinned below.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { controlComp, runComp, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
/** controlComp('neon-vision-eye', false) slot order: liter 0 / crown 1 / neon-vision-eye 2. */
const NVE = 2;
const SLUG = 'neon-vision-eye';

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  runComp({
    ...controlComp(SLUG, false),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return events;
}

// ---- counterfactual patches (nearest-wrong models each group must discriminate against) --------
/** N1 reference: her S1 base Firepower Explosion (437.98% shotFired rider) removed entirely. */
const nveNoBaseRider = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) =>
      !(
        b.trigger?.kind === 'shotFired' &&
        b.effects.some((e: any) => e.atkPct === 437.98)
      )
  );
  if (ov.skill1.length === before)
    {throw new Error('nve S1 437.98 shotFired block missing — fixture is stale');}
});
/** N2/N4/N5 counterfactual: the Super block with its everyN gate REMOVED — Super Firepower treated
 *  as ALWAYS-ON (the nearest wrong reading of the kit prose, which lists the Super riders without
 *  the gauge alternation). Fires the three Super riders on EVERY burst cast instead of casts 1,4,7. */
const nveSuperEveryCast = withPatchedOverride(SLUG, (ov) => {
  const blk = ov.skill1.find((b: any) => b.everyN != null);
  if (!blk)
    {throw new Error('nve S1 everyN Super block missing — fixture is stale');}
  delete blk.everyN;
  delete blk.everyNOffset;
});
/** N3 reference: her S2 Maximum Firepower FB-entry ATK (80.04%) removed. */
const nveNoFbAtk = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) =>
      !b.effects.some((e: any) => e.stat === 'atkPct' && e.value === 80.04)
  );
  if (ov.skill2.length === before)
    {throw new Error('nve S2 80.04 atkPct block missing — fixture is stale');}
});
/** N6 reference: her burst unconditional Attack Damage (110.21%) removed. */
const nveNoBurstAd = withPatchedOverride(SLUG, (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) =>
      !b.effects.some(
        (e: any) => e.stat === 'attackDamagePct' && e.value === 110.21
      )
  );
  if (ov.burst.length === before)
    {throw new Error(
      'nve burst 110.21 attackDamagePct block missing — fixture is stale'
    );}
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noBaseRider = run({ [SLUG]: nveNoBaseRider });
const superEveryCast = run({ [SLUG]: nveSuperEveryCast });
const noFbAtk = run({ [SLUG]: nveNoFbAtk });
const noBurstAd = run({ [SLUG]: nveNoBurstAd });

// ---- readers ----------------------------------------------------------------------------------
const neonShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === SLUG);
const neonBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === SLUG);
const neonDamage = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage' && e.slug === SLUG);
const neonBuffs = (evs: SimEvent[], stat: string, value?: number) =>
  evs.filter(
    (e): e is BuffApply =>
      e.kind === 'buffApply' &&
      e.casterIdx === NVE &&
      e.stat === stat &&
      (value == null || e.value === value)
  );

/** The everyN 3 / offset 1 cadence: Super Firepower fires on casts 1, 4, 7, … → for `n` burst
 *  casts, activations ≡ 1 (mod 3) in [1..n] = floor((n-1)/3) + 1 firings. */
const expectedSuper = (n: number) => Math.floor((n - 1) / 3) + 1;

const burstCount = neonBursts(base).length;
const superCountBase = expectedSuper(burstCount);

describe('neon-vision-eye — kit spec', () => {
  it('fixture sanity: neon is the sole B3 and casts a real rotation', () => {
    expect(
      burstCount,
      'neon must cast her burst to exercise any burst-gated line'
    ).toBeGreaterThanOrEqual(4);
    expect(
      neonShots(base).length,
      'RL charge-attacker fires charged rockets'
    ).toBeGreaterThan(0);
    expect(
      neonShots(base).every((s) => s.charged),
      'every neon shot is a full charge'
    ).toBe(true);
    // The cadence math needs at least one Super and at least one non-Super cast to discriminate.
    expect(
      superCountBase,
      'expected Super on casts 1,4,… over the fixture'
    ).toBeGreaterThanOrEqual(1);
    expect(
      superCountBase,
      'Super must be STRICTLY rarer than every cast'
    ).toBeLessThan(burstCount);
  });

  describe('N1 — S1 Firepower Explosion: 437.98% of final ATK on EVERY full-charge shot', () => {
    const riders = neonDamage(base).filter((d) => d.srcSlot === 'skill1');

    it('lands once per shot, in the skill bucket, at the kit magnitude', () => {
      expect(riders.length).toBe(neonShots(base).length);
      expect(riders.length).toBeGreaterThan(0);
      expect([...new Set(riders.map((d) => d.atkPct))]).toEqual([437.98]);
      expect([...new Set(riders.map((d) => d.bucket))]).toEqual(['skill']);
    });

    it('is a function "additional damage" rider: crits at caster rate, never cores', () => {
      expect(riders.every((d) => d.critEligible)).toBe(true);
      expect(riders.every((d) => !d.coreEligible)).toBe(true);
    });

    it('DISCRIMINATING: removing the block zeroes the rider (it is live, not vestigial)', () => {
      const gone = neonDamage(noBaseRider).filter(
        (d) => d.srcSlot === 'skill1' && d.atkPct === 437.98
      );
      expect(gone.length).toBe(0);
    });
  });

  describe('N2 — S1 Super Firepower: 262.79% rider gated to the every-3rd-Super window', () => {
    const superBuff = (evs: SimEvent[]) =>
      neonBuffs(evs, 'extraHitDamagePct', 262.79);
    const rider = neonDamage(base).filter(
      (d) => d.srcSlot === null && d.atkPct === 262.79
    );
    /** Burst-cast frames that SHOULD open a Super window: cast indices ≡ 0 (mod 3) — i.e. her
     *  1st, 4th, 7th casts (0-based 0,3,6). Pins BOTH the period (3) AND the phase (offset 1: the
     *  battle-start +100 gauge makes the FIRST cast Super). */
    const expectedSuperFrames = neonBursts(base)
      .filter((_, i) => i % 3 === 0)
      .map((b) => b.frame)
      .sort((a, b) => a - b);

    it('the governing extraHitDamagePct buff applies on casts 1,4,7 — floor((bursts-1)/3)+1 times', () => {
      expect(superBuff(base).length).toBe(superCountBase);
    });

    it('PHASE: Super opens on the 1st/4th/… cast (battle-start gauge=100), NOT phase-shifted to 3,6,9', () => {
      // Trap #2 (fable review): omitting the battle-start +100 phase-shifts Super to casts 3,6,9.
      // Pinning the EXACT frames (not just the count) catches an offset error the count would miss.
      expect(
        superBuff(base)
          .map((b) => b.frame)
          .sort((a, b) => a - b)
      ).toEqual(expectedSuperFrames);
      expect(
        expectedSuperFrames[0],
        'the FIRST burst cast must be a Super cast'
      ).toBe(neonBursts(base)[0].frame);
    });

    it('DISCRIMINATING (cadence): an always-on Super over-fires the buff on EVERY cast', () => {
      // The nearest wrong model (everyN removed) applies the Super buff on all `burstCount` casts.
      expect(superBuff(superEveryCast).length).toBe(
        neonBursts(superEveryCast).length
      );
      expect(superBuff(superEveryCast).length).toBeGreaterThan(
        superBuff(base).length
      );
    });

    it('the buff is 262.79% for 10 sec, self-scoped', () => {
      const applied = superBuff(base);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([262.79]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([NVE]);
      for (const b of applied) {expect(b.expiresFrame! - b.frame).toBe(10 * FPS);}
    });

    it('while live, every shot deals a burst-bucket rider (srcSlot null, the summed-stat convention)', () => {
      expect(
        rider.length,
        'Super windows must produce additional-damage riders'
      ).toBeGreaterThan(0);
      expect([...new Set(rider.map((d) => d.bucket))]).toEqual(['burst']);
      // Function additional damage: crits at caster rate, never cores (SSOT §2b / U1).
      expect(rider.every((d) => d.critEligible)).toBe(true);
      expect(rider.every((d) => !d.coreEligible)).toBe(true);
    });

    it('DISCRIMINATING (encoding): riders ride ONLY inside a Super window, not every shot', () => {
      // Fewer rider instances than total shots — they cluster into the 2 Super windows, proving the
      // rider is gated by the buff window (the old hitCount:12 flatDamage blend would instead land a
      // 'skill'-bucket srcSlot-skill1 rider with no governing extraHitDamagePct buff).
      expect(rider.length).toBeLessThan(neonShots(base).length);
      expect(
        neonDamage(base)
          .filter((d) => d.srcSlot === null)
          .every((d) => d.atkPct === 262.79)
      ).toBe(true);
    });
  });

  describe('N3 — S2 Maximum Firepower: ATK ▲80.04% on Full Burst entry, EVERY rotation', () => {
    const applied = neonBuffs(base, 'atkPct', 80.04);

    it('fires once per Full Burst enter (sole B3 → one per burst cast), at the kit magnitude', () => {
      expect(applied.length).toBe(burstCount);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([80.04]);
    });

    it('is 10 sec, self-scoped', () => {
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([NVE]);
      for (const b of applied) {expect(b.expiresFrame! - b.frame).toBe(10 * FPS);}
    });

    it('DISCRIMINATING: removing the block zeroes it (and it is NOT the 35.05% Super rider)', () => {
      expect(neonBuffs(noFbAtk, 'atkPct', 80.04).length).toBe(0);
      // The 35.05% Super rider (N4) is a distinct value on a distinct cadence — 80.04 fires every
      // cast, 35.05 only every 3rd.
      expect(neonBuffs(base, 'atkPct', 35.05).length).toBe(superCountBase);
    });
  });

  describe('N4 — S2 Super Firepower: ATK ▲35.05% rider on the every-3rd-Super window', () => {
    const applied = neonBuffs(base, 'atkPct', 35.05);

    it('fires on the same every-3rd-cast cadence as the 262.79% rider', () => {
      expect(applied.length).toBe(superCountBase);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([35.05]);
    });

    it('lands on the IDENTICAL frames as the 262.79% Super buff (one Super block, three riders)', () => {
      const superFrames = neonBuffs(base, 'extraHitDamagePct', 262.79)
        .map((b) => b.frame)
        .sort((a, b) => a - b);
      expect(applied.map((b) => b.frame).sort((a, b) => a - b)).toEqual(
        superFrames
      );
    });

    it('is 10 sec, self-scoped; an always-on Super would fire it every cast', () => {
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([NVE]);
      for (const b of applied) {expect(b.expiresFrame! - b.frame).toBe(10 * FPS);}
      expect(neonBuffs(superEveryCast, 'atkPct', 35.05).length).toBe(
        neonBursts(superEveryCast).length
      );
    });
  });

  describe('N5 — Burst Super Firepower: Attack Damage ▲45.03% rider on the every-3rd-Super window', () => {
    const applied = neonBuffs(base, 'attackDamagePct', 45.03);

    it('fires on the every-3rd-cast cadence, value-distinct from the unconditional 110.21%', () => {
      expect(applied.length).toBe(superCountBase);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([45.03]);
    });

    it('lands on the IDENTICAL frames as the other two Super riders', () => {
      const superFrames = neonBuffs(base, 'extraHitDamagePct', 262.79)
        .map((b) => b.frame)
        .sort((a, b) => a - b);
      expect(applied.map((b) => b.frame).sort((a, b) => a - b)).toEqual(
        superFrames
      );
    });

    it('is 10 sec, self-scoped; an always-on Super would fire it every cast', () => {
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([NVE]);
      for (const b of applied) {expect(b.expiresFrame! - b.frame).toBe(10 * FPS);}
      expect(neonBuffs(superEveryCast, 'attackDamagePct', 45.03).length).toBe(
        neonBursts(superEveryCast).length
      );
    });
  });

  describe('N6 — Burst: Attack Damage ▲110.21% unconditional, EVERY cast', () => {
    const applied = neonBuffs(base, 'attackDamagePct', 110.21);

    it('fires once per burst cast (count === burst casts), at the kit magnitude', () => {
      expect(applied.length).toBe(burstCount);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([110.21]);
    });

    it('is 10 sec, self-scoped', () => {
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([NVE]);
      for (const b of applied) {expect(b.expiresFrame! - b.frame).toBe(10 * FPS);}
    });

    it('DISCRIMINATING: removing the block zeroes it (and it is NOT the 45.03% Super rider)', () => {
      expect(neonBuffs(noBurstAd, 'attackDamagePct', 110.21).length).toBe(0);
      // 110.21 fires every cast; 45.03 only every 3rd — distinct value AND cadence.
      expect(neonBuffs(base, 'attackDamagePct', 45.03).length).toBe(
        superCountBase
      );
    });
  });
});
