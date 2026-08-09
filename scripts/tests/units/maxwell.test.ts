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
//   BU ■ self — Change the weapon in use (kit-literal weaponSwap, enacted 2026-08-09):
//        Damage 813.42% of final ATK / Full Charge Damage 300% / Charge Time 2s /
//        Max Ammo 1 / Pierce, 10s window                                             [M6/M7]
//        (railgun shots are charged weapon fire inside the FB window)                [M8/M9]
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
//   M6  her burst is the KIT-LITERAL weapon swap (enacted 2026-08-09, owner faithfulness ruling —
//       superseding the probe-run-G single-flatDamage collapse, which its own note recorded as
//       unstable, 0.80 G vs 1.17 N6): each cast opens a 10s swap window firing ≥2 charged railgun
//       shots (2s charge + 1-round mag + 141f reload ≈ a shot every ~4.7s) and ZERO burst-bucket
//       nukes. The old-model counterfactual inverts both observables.
//   M7  window shots carry the swap magnitude atkPct 813.42 (the 300% full-charge lever composes
//       in `amount` via the charge bucket), vs her base 69.04 outside the window.
//   M8  railgun shots are real charged weapon fire: crit-eligible at her sheet rate.
//   M9  they land INSIDE the Full Burst window (cast opens FB ~0.4s later; first shot at ~2.4s),
//       so they take the +50% major — unlike the old pre-FB flatDamage nuke.
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
/** M6/M7 counterfactual: the superseded probe-run-G model — one uncharged 813.42% flatDamage
 *  per cast, no weapon swap. */
const maxwellOldSingleShot = withPatchedOverride('maxwell', (ov) => {
  const b = ov.burst[0];
  const e = b?.effects?.find((x: any) => x.kind === 'weaponSwap');
  if (!e) {
    throw new Error('maxwell burst weaponSwap missing — fixture is stale');
  }
  b.target = { kind: 'enemy' };
  b.effects = [{ kind: 'flatDamage', atkPct: 813.42 }];
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const burstCastTrigger = run({ maxwell: maxwellBurstCastTrigger });
const allAllies = run({ maxwell: maxwellAllAllies });
const oldSingleShot = run({ maxwell: maxwellOldSingleShot });

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

  describe('M6 — burst is the kit-literal 10s railgun weapon swap (enacted 2026-08-09)', () => {
    const windowShots = (evs: SimEvent[]) => {
      const casts = maxwellBursts(evs).map((c) => c.frame);
      return dmg(evs).filter(
        (d) =>
          d.slug === 'maxwell' &&
          d.srcSlot === 'normal' &&
          d.atkPct === 813.42 &&
          casts.some((c) => d.frame > c && d.frame <= c + 10 * FPS)
      );
    };

    it('each cast opens a swap window firing ≥2 charged railgun shots and ZERO burst-bucket nukes', () => {
      const casts = maxwellBursts(base.events);
      expect(casts.length).toBeGreaterThan(0);
      expect(maxwellNukes(base.events)).toEqual([]);
      for (const c of casts.map((x) => x.frame)) {
        const inWindow = windowShots(base.events).filter(
          (d) => d.frame > c && d.frame <= c + 10 * FPS
        );
        expect(
          inWindow.length,
          `cast at frame ${c}: expected ≥2 railgun shots in the 10s window (2s charge + 1-round mag + 141f reload)`
        ).toBeGreaterThanOrEqual(2);
      }
    });

    it('DISCRIMINATING: the superseded single-flatDamage model inverts both observables', () => {
      expect(maxwellNukes(oldSingleShot.events).length).toBe(
        maxwellBursts(oldSingleShot.events).length
      );
      expect(windowShots(oldSingleShot.events)).toEqual([]);
    });

    it('M7: window shots carry the swap magnitude 813.42, her base cadence 69.04 elsewhere', () => {
      const shots = windowShots(base.events);
      expect(shots.length).toBeGreaterThan(0);
      expect([...new Set(shots.map((d) => d.atkPct))]).toEqual([813.42]);
      const casts = maxwellBursts(base.events).map((c) => c.frame);
      const outside = dmg(base.events).filter(
        (d) =>
          d.slug === 'maxwell' &&
          d.srcSlot === 'normal' &&
          !casts.some((c) => d.frame > c && d.frame <= c + 10 * FPS)
      );
      expect(outside.length).toBeGreaterThan(0);
      expect([...new Set(outside.map((d) => d.atkPct))]).toEqual([69.04]);
    });

    it('M8: railgun shots are real charged weapon fire — crit-eligible', () => {
      const shots = windowShots(base.events);
      expect(shots.every((d) => d.critEligible)).toBe(true);
    });

    it('M9: railgun shots land INSIDE the Full Burst window and take the +50% major', () => {
      const shots = windowShots(base.events);
      expect(
        shots.some((d) => d.fbMajorApplied),
        'the first railgun shot (~2.4s after cast) lands inside the 10s FB window'
      ).toBe(true);
    });
  });
});
