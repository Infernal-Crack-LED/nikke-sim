// PER-UNIT KIT SPEC — `maxwell` (Maxwell, Attacker/SR/Iron, Burst III, cd 40s, ammo 6,
// chargeFrames 60). Kit-autonomy gauntlet 2026-07-26 (resumed from a crashed S0).
//
// One assertion group per KIT LINE (M1..M9 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.maxwell.skills):
//   S1 ■ entering Full Burst → 2 allies with the highest FINAL ATK:                  [M1 trigger]
//        Charge Speed ▲4.48% for 10 sec                                              [M3]
//        ATK ▲43.1% for 10 sec                                                       [M4]
//      (target = the 2 highest-final-ATK allies, self-eligible)                      [M2 target]
//   S2 ■ when there are above 5 enemy units (excl. Nikkes) → self:                  [M5 UNMODELED]
//        Critical Rate ▲4.83% / Critical Damage ▲13.91%
//   BU ■ self — Change the weapon in use: a single railgun shot                     [M6 single shot]
//        Damage 813.42% of final ATK                                                 [M7 magnitude]
//        (the hit crits, never cores)                                                [M8 eligibility]
//        (the cast lands before the Full Burst window → no +50% major)               [M9 FB-exempt]
//      Full Charge Damage 300% / Charge Time 2s / Max Ammo 1 / Pierce = the weapon-swap
//      scaffolding the single-shot model collapses (probe run-G; verbatim in unmodeled).
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   M1  fullBurstEnter fires on EVERY Full Burst window the team opens (liter+crown enable one
//       roughly every 20s), but maxwell only CASTS her B3 every 40s — so her S1 buff applies on
//       strictly MORE frames than she casts. A burstCast trigger (own-casts-only) would tie the
//       buff count to her cast count. The fixture (helm is the co-B3) is what opens windows
//       maxwell does NOT cast, exposing the difference.
//   M2  the buff reaches exactly 2 holders per apply-frame (self-eligible top-2), never all 4.
//       An `allies` target would reach all four. The COUNT is the load-bearing behavioral pin. The
//       ranking BASIS (static vs byFinalAtk live ranking) is a documented measurement-gated residual:
//       the prose says "highest FINAL ATK" (A3 argues for byFinalAtk:true, and every blind role + the
//       judge derived it), but enacting it redirects the +43.1% buff onto different allies in the
//       measured regression comps (7 pinned anchors drift up to 19.95%, incl. OTHER units'), so the
//       calibrated static-ranking encoding is shipped and byFinalAtk is held as a ⚑ (override note).
//   M3/M4 the kit magnitudes 4.48 / 43.1 (max-level), not a lower level-table value, for 10s.
//   M5  skill2 is gated on ">5 enemy units, excluding Nikkes" — never met in a single-boss solo
//       raid, so the parser correctly drops it (skill2 === []). Documented, not asserted: it is
//       out-of-domain inert here (⚑ in the override note). The assertion is structural: skill2
//       contributes no damage and no buff (it is empty), and the line is verbatim in unmodeled.
//   M6  her burst is ONE railgun shot per cast (probe run-G 1.93→0.81): exactly one burst-bucket
//       hit per burstCast. The old weaponSwap model fired ~4 shots over 10s; a multi-shot encoding
//       would multiply the hit count.
//   M7  the measured UNCHARGED single-shot magnitude 813.42%, not the kit-literal full-charge
//       2440.26% (the 300% × 3 lever). Measurement-gated: run-G read the burst hit at 813.42.
//   M8  flatDamage crits by engine default (critEligible) and never cores (coreEligible false) —
//       F2: the Pierce railgun roll keeps crit, strips core.
//   M9  a burst CAST lands BEFORE the Full Burst window opens, so it never takes the +50% major
//       (verified fact, 2026-07-13; burstCast flatDamage is also auto noFb).
//
// Fixture: controlComp('maxwell') = liter (B1) / crown (B2) / maxwell (B3) / helm (B3), boss Fire,
// focus maxwell — maxwell needs a real rotation (and a co-B3) to cast her burst AND to open Full
// Burst windows she does not cast. Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** controlComp('maxwell') slot order: liter 0 / crown 1 / maxwell 2 / helm 3. */
const MAXWELL = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('maxwell'),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches -------------------------------------------------------------------
/** M1 counterfactual: her S1 keyed to her OWN burst casts, not Full Burst entry. */
const maxwellBurstCastTrigger = withPatchedOverride('maxwell', (ov) => {
  const b = ov.skill1[0];
  if (!b || b.trigger?.kind !== 'fullBurstEnter') {
    throw new Error(
      'maxwell S1 fullBurstEnter block missing — fixture is stale'
    );
  }
  b.trigger.kind = 'burstCast';
});
/** M2 counterfactual: the same buffs to ALL allies instead of the top-2. */
const maxwellAllAllies = withPatchedOverride('maxwell', (ov) => {
  const b = ov.skill1[0];
  if (!b || b.target?.kind !== 'alliesTopAtk') {
    throw new Error(
      'maxwell S1 alliesTopAtk target missing — fixture is stale'
    );
  }
  b.target = { kind: 'allies' };
});
/** M7 counterfactual: the kit-literal FULL-CHARGE magnitude (813.42 × 3 = 2440.26). */
const maxwellFullCharge = withPatchedOverride('maxwell', (ov) => {
  const e = ov.burst[0]?.effects?.find((x: any) => x.kind === 'flatDamage');
  if (!e) {
    throw new Error('maxwell burst flatDamage missing — fixture is stale');
  }
  e.atkPct = 2440.26;
});
/** M6 counterfactual: a second shot in the burst window (the old multi-shot weaponSwap shape). */
const maxwellMultiShot = withPatchedOverride('maxwell', (ov) => {
  const b = ov.burst[0];
  const e = b?.effects?.find((x: any) => x.kind === 'flatDamage');
  if (!e) {
    throw new Error('maxwell burst flatDamage missing — fixture is stale');
  }
  b.effects.push({ kind: 'flatDamage', atkPct: 813.42 });
});
/** M8 counterfactual: flip the eligibility — strip crit, add core. */
const maxwellCritCoreFlip = withPatchedOverride('maxwell', (ov) => {
  const e = ov.burst[0]?.effects?.find((x: any) => x.kind === 'flatDamage');
  if (!e) {
    throw new Error('maxwell burst flatDamage missing — fixture is stale');
  }
  e.crit = false;
  e.core = true;
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const burstCastTrigger = run({ maxwell: maxwellBurstCastTrigger });
const allAllies = run({ maxwell: maxwellAllAllies });
const fullCharge = run({ maxwell: maxwellFullCharge });
const multiShot = run({ maxwell: maxwellMultiShot });
const critCoreFlip = run({ maxwell: maxwellCritCoreFlip });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const maxwellBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'maxwell'
  );
/** maxwell's burst-bucket damage (her single railgun shot per cast). */
const maxwellNukes = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'maxwell' && d.srcSlot === 'burst');
/** maxwell's S1 ATK buff applications (casterIdx = maxwell, the 43.1% line). */
const s1Atk = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.casterIdx === MAXWELL && b.stat === 'atkPct');
const s1Charge = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) => b.casterIdx === MAXWELL && b.stat === 'chargeSpeedPct'
  );
/** Distinct frames on which maxwell's S1 ATK buff applied. */
const s1Frames = (evs: SimEvent[]) => [
  ...new Set(s1Atk(evs).map((b) => b.frame)),
];
/** Distinct holder slots reached, per apply-frame. */
const holdersPerFrame = (evs: SimEvent[]): Set<number | null>[] => {
  const m = new Map<number, Set<number | null>>();
  for (const b of s1Atk(evs)) {
    (m.get(b.frame) ?? m.set(b.frame, new Set()).get(b.frame)!).add(
      b.targetIdx
    );
  }
  return [...m.values()];
};

describe('maxwell — kit spec', () => {
  describe('M1 — S1 triggers on FULL BURST ENTRY, not on her own burst casts', () => {
    it('applies the S1 buff on strictly more frames than maxwell casts her burst', () => {
      const buffFrames = s1Frames(base.events).length;
      const casts = maxwellBursts(base.events).length;
      expect(casts).toBeGreaterThan(0);
      expect(
        buffFrames,
        `${buffFrames} S1 apply-frames vs ${casts} maxwell casts — fullBurstEnter fires every FB ` +
          'window (incl. ones helm casts); a burstCast trigger would tie the two together'
      ).toBeGreaterThan(casts);
    });

    it('DISCRIMINATING: a burstCast trigger collapses the buff onto her casts only', () => {
      expect(s1Frames(burstCastTrigger.events).length).toBe(
        maxwellBursts(burstCastTrigger.events).length
      );
    });
  });

  describe('M2 — S1 reaches the top-2 highest-final-ATK allies (self-eligible), not all four', () => {
    it('reaches exactly 2 holders on every apply-frame', () => {
      const perFrame = holdersPerFrame(base.events);
      expect(perFrame.length).toBeGreaterThan(0);
      for (const holders of perFrame) {
        expect(
          holders.size,
          `an apply-frame reached ${holders.size} holders, expected 2`
        ).toBe(2);
      }
    });

    it('DISCRIMINATING: an `allies` target would reach all four', () => {
      const sizes = holdersPerFrame(allAllies.events).map((s) => s.size);
      expect(sizes.length).toBeGreaterThan(0);
      expect(Math.max(...sizes)).toBe(4);
    });

    it('target is alliesTopAtk count:2 — static ranking (calibrated); byFinalAtk held as a residual', () => {
      // The prose says "highest FINAL ATK" — the A3 literal-word rule argues for byFinalAtk:true
      // (live effectiveAtk ranking), and every blind role (S2b/S5/S6) + the S7 judge derived it.
      // The driver does NOT enact it: live ranking redirects the +43.1% ATK buff onto different
      // allies in the measured regression comps, drifting 7 pinned MEASURED anchors by up to 19.95%
      // (iron-sweep run G + T2 elec-weak — takina/liberalio/milk-blooming-bunny/d-killer-wife/
      // maiden-ice-rose/maxwell). Re-pinning those would rewrite OTHER units' anchors (violates
      // exact-slug-maxwell), and the static-ranking encoding is what is calibrated to the measured
      // fights (measured>fudge). So byFinalAtk is a documented measurement-gated residual ⚑ (override
      // note), and this pin locks the calibrated static-ranking encoding actually shipped.
      const ov = loadOverride('maxwell') as any;
      expect(ov.skill1[0].target).toMatchObject({
        kind: 'alliesTopAtk',
        count: 2,
      });
      expect(
        ov.skill1[0].target.byFinalAtk,
        'byFinalAtk is a residual, not enacted'
      ).toBeUndefined();
    });
  });

  describe('M3/M4 — S1 magnitudes and duration', () => {
    it('is Charge Speed 4.48% and ATK 43.1% (max level), not a lower level-table value', () => {
      expect([...new Set(s1Charge(base.events).map((b) => b.value))]).toEqual([
        4.48,
      ]);
      expect([...new Set(s1Atk(base.events).map((b) => b.value))]).toEqual([
        43.1,
      ]);
    });

    it('both last exactly 10 sec', () => {
      for (const b of [...s1Atk(base.events), ...s1Charge(base.events)]) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });
  });

  describe('M5 — S2 enemy-count gate is UNMODELED (out-of-domain inert in a solo raid)', () => {
    it('skill2 is empty: it contributes no damage and no buff', () => {
      const ov = loadOverride('maxwell') as any;
      expect(ov.skill2).toEqual([]);
      expect(
        dmg(base.events).filter(
          (d) => d.slug === 'maxwell' && d.srcSlot === 'skill2'
        )
      ).toEqual([]);
      expect(
        buffs(base.events).filter(
          (b) =>
            b.casterIdx === MAXWELL &&
            (b.stat === 'critRatePct' || b.stat === 'critDamagePct')
        )
      ).toEqual([]);
    });

    it('the gated line is preserved VERBATIM in unmodeled (not silently dropped)', () => {
      const ov = loadOverride('maxwell') as any;
      expect(ov.unmodeled.skill2.join(' ')).toContain('above 5 enemy units');
      expect(ov.unmodeled.skill2.join(' ')).toContain(
        'Critical Damage ▲ 13.91%'
      );
    });
  });

  describe('M6 — burst is ONE railgun shot per cast (probe run-G)', () => {
    it('fires exactly one burst-bucket hit per burst cast', () => {
      const nukes = maxwellNukes(base.events).length;
      const casts = maxwellBursts(base.events).length;
      expect(casts).toBeGreaterThan(0);
      expect(
        nukes,
        `${nukes} burst hits vs ${casts} casts — a multi-shot model multiplies this`
      ).toBe(casts);
    });

    it('DISCRIMINATING: a second shot in the window doubles the hit count', () => {
      expect(maxwellNukes(multiShot.events).length).toBe(
        maxwellBursts(multiShot.events).length * 2
      );
    });
  });

  describe('M7 — burst magnitude is the measured UNCHARGED 813.42%, not the 3× full-charge lever', () => {
    it('lands at 813.42% of final ATK in the burst bucket', () => {
      const nukes = maxwellNukes(base.events);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([813.42]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('DISCRIMINATING: the full-charge counterfactual lands at 2440.26%', () => {
      expect([
        ...new Set(maxwellNukes(fullCharge.events).map((d) => d.atkPct)),
      ]).toEqual([2440.26]);
    });
  });

  describe('M8 — the railgun hit crits (default) and never cores', () => {
    it('is crit-eligible and core-ineligible on every burst hit', () => {
      const nukes = maxwellNukes(base.events);
      expect(nukes.length).toBeGreaterThan(0);
      expect(nukes.every((d) => d.critEligible)).toBe(true);
      expect(nukes.every((d) => !d.coreEligible)).toBe(true);
    });

    it('DISCRIMINATING: flipping crit:false/core:true inverts both eligibilities', () => {
      const flipped = maxwellNukes(critCoreFlip.events);
      expect(flipped.every((d) => !d.critEligible)).toBe(true);
      expect(flipped.every((d) => d.coreEligible)).toBe(true);
    });
  });

  describe('M9 — the burst cast is Full-Burst-exempt (lands before the window opens)', () => {
    it('never takes the +50% Full Burst major', () => {
      const nukes = maxwellNukes(base.events);
      expect(nukes.length).toBeGreaterThan(0);
      expect(nukes.filter((d) => d.fbMajorApplied).map((d) => d.sec)).toEqual(
        []
      );
    });
  });
});
