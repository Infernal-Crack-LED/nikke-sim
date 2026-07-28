// PER-UNIT KIT SPEC — `rei-ayanami-tentative-name` (Rei Ayanami (Tentative Name), AR / Attacker /
// Wind / Burst III cd 40s; ammo 60, chargeFrames 0 (instant), hitsPerShot 1, normalMult 14.71).
// Evangelion collab unit, NO base counterpart. Kit-autonomy gauntlet 2026-07-28.
//
// One assertion group per LOAD-BEARING kit line, asserted against the SHIPPED override loaded from
// disk. `withPatchedOverride` builds COUNTERFACTUALS only (the nearest wrong model each assertion
// must discriminate against) — never the encoding under test.
//
// Her kit is deeply interdependent with the OTHER Eva units' named statuses (Anti A.T. Field /
// Annihilation State / Attack State). In the v1 single-boss scope most of it is collab-team-gated
// and inert without an Eva teammate, so the damage-relevant in-scope core is small and is what this
// file pins:
//
//   S1 ■ landing 7 normal attacks while in Attack State → target: 286.37% final ATK addl dmg   [H1]
//        (gated to the 10s post-burst window via the 'Attack State' boss-status proxy)
//   S2 ■ entering Full Burst → all allies: ATK ▲11.61% of caster ATK for 10 sec                [H2]
//   BU ■ self: Attack State — Attack Damage ▲35.9% / ATK ▲63.36% of caster ATK, 10 sec         [H3]
//      ■ all enemies: 990.2% of final ATK as Burst Skill damage                                [H4]
//   S1 ■ 18 hits vs Anti A.T. Field → 590.64%: ENCODED but INERT (gate never opens in-scope)    [H5]
//
// UNMODELED (collab-gated / missing-primitive; documented in the override note + caveats, inert in
// any non-Eva comp — NO assertion here, by the inert-UNMODELED rule):
//   S1 ■ Anti A.T. Field 'stacks ▲10'  (no add-stacks-to-existing-debuff primitive; the 590.64% proc it rides IS modeled, H5)
//   S1 ■ FB → Annihilation-State allies: +1 unit / +500% range / casterAtkPct 17.6  (no ally-self-mode gate / cross-unit param mod)
//   S2 ■ FB → MG burst-caster allies: MG Ramp-Up Speed ▲100%  (no MG wind-up primitive)
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   H1  the proc is GATED to the Attack-State window: removing requiresTargetStatus lets hitCount:7
//       fire across the WHOLE fight (strictly more procs, many outside every burst window). Shipped
//       must fire FEWER procs and EVERY one must land ≤10s after a Rei burst cast.
//   H2  casterAtkPct (a FLAT add = 11.61% of Rei's static ATK, identical for every ally) vs atkPct
//       (scales each target's OWN ATK) — the single most damage-moving misread in this kit. Proven by
//       the buffApply `stat` field, and by reaching all four allies at one magnitude.
//   H3  burstCast (fires only on rotations SHE casts) vs fullBurstEnter (fires on EVERY FB, incl. the
//       other B3's rotations) — the self-buff count must equal her burst-CAST count, which is strictly
//       less than the FB count in this dual-B3 comp.
//   H4  a burst CAST lands BEFORE the Full Burst window opens, so the nuke must never take the +50%
//       major (verified fact); it is the kit magnitude 990.2 in the burst bucket, once per cast.
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / rei B3 / helm B3, boss Fire,
// focus rei) — Rei needs a real rotation to cast her burst at all, and the SECOND B3 (helm) is what
// makes the H3 burstCast-vs-fullBurstEnter count discrimination possible (FB count > Rei cast count).
// Deterministic (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const SLUG = 'rei-ayanami-tentative-name';
/** controlComp slot order: liter 0 / crown 1 / rei 2 / helm 3. */
const REI = 2;
const ATTACK_STATE_WINDOW_FRAMES = 10 * FPS;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp(SLUG),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res), res };
}

/** casterAtkPct is stored as a FLAT ATK grant = (pct/100)×caster.staticAtk (sim.ts:2110), so the
 *  buffApply `value` is that flat number, not the kit percentage. */
const flatAtk = (pct: number) => (pct / 100) * REI_STATIC_ATK;

// ---- counterfactual patches -------------------------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** H1 counterfactual: drop the Attack-State gate so hitCount:7 fires across the whole fight. */
const reiUngatedS1 = withPatchedOverride(SLUG, (ov) => {
  const blk = ov.skill1.find(
    (b: any) => b.requiresTargetStatus === 'Attack State'
  );
  if (!blk) {
    throw new Error(
      'rei S1 Attack-State-gated block missing — fixture is stale'
    );
  }
  delete blk.requiresTargetStatus;
});
/** H2 counterfactual: the team ATK buff as a target-scaled atkPct instead of flat casterAtkPct. */
const reiS2AtkPct = withPatchedOverride(SLUG, (ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'casterAtkPct' && x.value === 11.61);
  if (!e) {
    throw new Error(
      'rei S2 casterAtkPct 11.61 effect missing — fixture is stale'
    );
  }
  e.stat = 'atkPct';
});
/** H3 counterfactual: the self Attack-State buffs on fullBurstEnter (every FB) instead of burstCast
 *  (her own casts only). */
const reiSelfOnFbEnter = withPatchedOverride(SLUG, (ov) => {
  const blk = ov.burst.find(
    (b: any) => b.target.kind === 'self' && hasStat(b, 'attackDamagePct')
  );
  if (!blk) {
    throw new Error('rei burst self-buff block missing — fixture is stale');
  }
  blk.trigger = { kind: 'fullBurstEnter' };
});
/** H5 reference: the Anti-A.T.-Field 18-hit proc removed entirely (its inertness isolation). */
const reiNoAntiField = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => b.requiresTargetStatus !== 'Anti A.T. Field'
  );
  if (ov.skill1.length === before) {
    throw new Error('rei S1 Anti-A.T.-Field block missing — fixture is stale');
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const ungated = run({ [SLUG]: reiUngatedS1 });
const s2Atk = run({ [SLUG]: reiS2AtkPct });
const selfFb = run({ [SLUG]: reiSelfOnFbEnter });
const noAntiField = run({ [SLUG]: reiNoAntiField });

/** Rei's static ATK (scope-lock basis) — the casterAtkPct flat grants are a fraction of this. */
const REI_STATIC_ATK = unitOf(base.res, SLUG).staticAtk;

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const reiDamage = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  dmg(evs).filter((d) => d.slug === SLUG && d.srcSlot === srcSlot);
const reiBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === SLUG);
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const fbStartFrames = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart').map((e) => e.frame);

describe('rei-ayanami-tentative-name — kit spec', () => {
  it('fixture sanity: Rei casts her burst in the control comp', () => {
    expect(reiBursts(base.events).length).toBeGreaterThan(0);
  });

  describe('H1 — S1 every-7-hits proc: 286.37%, GATED to the Attack-State window', () => {
    const procs = reiDamage(base.events, 'skill1');

    it('fires at the kit magnitude 286.37 (not the 590.64 Anti-A.T.-Field value)', () => {
      expect(procs.length).toBeGreaterThan(0);
      expect([...new Set(procs.map((d) => d.atkPct))]).toEqual([286.37]);
    });

    it('every proc lands inside an Attack-State window (≤10s after a Rei burst cast)', () => {
      const castFrames = reiBursts(base.events).map((b) => b.frame);
      for (const p of procs) {
        const inWindow = castFrames.some(
          (cf) => p.frame >= cf && p.frame <= cf + ATTACK_STATE_WINDOW_FRAMES
        );
        expect(
          inWindow,
          `skill1 proc at ${(p.frame / FPS).toFixed(2)}s is outside every Attack-State window — the gate is not live`
        ).toBe(true);
      }
    });

    it('DISCRIMINATING: ungated (no requiresTargetStatus) fires strictly more often, across the whole fight', () => {
      const ungatedProcs = reiDamage(ungated.events, 'skill1');
      expect(ungatedProcs.length).toBeGreaterThan(procs.length);
      // …and at least one ungated proc falls OUTSIDE every burst window (the gate is what removed it).
      const castFrames = reiBursts(ungated.events).map((b) => b.frame);
      const outside = ungatedProcs.filter(
        (p) =>
          !castFrames.some(
            (cf) => p.frame >= cf && p.frame <= cf + ATTACK_STATE_WINDOW_FRAMES
          )
      );
      expect(outside.length).toBeGreaterThan(0);
    });
  });

  describe('H2 — S2 Full-Burst-entry team ATK is a FLAT casterAtkPct 11.61, all allies, 10s', () => {
    const applied = buffs(base.events).filter(
      (b) =>
        b.casterIdx === REI &&
        b.stat === 'casterAtkPct' &&
        b.value === flatAtk(11.61)
    );

    it('is 11.61% of caster ATK (flat), not 17.6, and reaches all four allies', () => {
      // the magnitude is pinned: 11.61% of caster ATK, NOT the 17.6% Annihilation-State value
      expect(flatAtk(11.61)).not.toBe(flatAtk(17.6));
      expect(applied.length).toBeGreaterThan(0);
      const perFrame = new Map<number, Set<number | null>>();
      for (const b of applied) {
        (
          perFrame.get(b.frame) ??
          perFrame.set(b.frame, new Set()).get(b.frame)!
        ).add(b.targetIdx);
      }
      for (const [frame, holders] of perFrame) {
        expect(
          holders.size,
          `frame ${frame} reached ${holders.size} allies, expected 4`
        ).toBe(4);
      }
    });

    it('lasts 10 sec', () => {
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('does NOT fold in the 17.6% Annihilation-State value (that line is unmodeled / ally-gated)', () => {
      const leaked = buffs(base.events).filter(
        (b) =>
          b.casterIdx === REI &&
          b.stat === 'casterAtkPct' &&
          b.value === flatAtk(17.6)
      );
      expect(leaked.length).toBe(0);
    });

    it('DISCRIMINATING: atkPct (target-scaled) is a different stat — the flat casterAtkPct disappears', () => {
      const cfCaster = buffs(s2Atk.events).filter(
        (b) =>
          b.casterIdx === REI &&
          b.stat === 'casterAtkPct' &&
          b.value === flatAtk(11.61)
      );
      expect(cfCaster.length).toBe(0);
      // atkPct keeps the kit percentage (it is NOT flat-converted), so it appears at 11.61
      const cfAtk = buffs(s2Atk.events).filter(
        (b) => b.casterIdx === REI && b.stat === 'atkPct' && b.value === 11.61
      );
      expect(cfAtk.length).toBeGreaterThan(0);
    });
  });

  describe('H3 — burst Attack State: self attackDamagePct 35.9 + casterAtkPct 63.36, on HER casts, 10s', () => {
    const selfAtkDmg = buffs(base.events).filter(
      (b) =>
        b.casterIdx === REI &&
        b.targetIdx === REI &&
        b.stat === 'attackDamagePct' &&
        b.value === 35.9
    );
    const selfCasterAtk = buffs(base.events).filter(
      (b) =>
        b.casterIdx === REI &&
        b.targetIdx === REI &&
        b.stat === 'casterAtkPct' &&
        b.value === flatAtk(63.36)
    );
    const casts = reiBursts(base.events).length;

    it('grants both self-buffs once per burst CAST, for 10 sec', () => {
      expect(casts).toBeGreaterThan(0);
      expect(selfAtkDmg.length).toBe(casts);
      expect(selfCasterAtk.length).toBe(casts);
      for (const b of [...selfAtkDmg, ...selfCasterAtk]) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('DISCRIMINATING: fullBurstEnter (every FB) fires strictly more than her own cast count', () => {
      // In this dual-B3 comp the FB count exceeds Rei's cast count, so a fullBurstEnter encoding
      // over-fires on the other B3's rotations — the burstCast encoding does not.
      const fbCount = fbStartFrames(selfFb.events).length;
      expect(fbCount).toBeGreaterThan(casts);
      const cfSelf = buffs(selfFb.events).filter(
        (b) =>
          b.casterIdx === REI &&
          b.targetIdx === REI &&
          b.stat === 'attackDamagePct' &&
          b.value === 35.9
      );
      expect(cfSelf.length).toBeGreaterThan(selfAtkDmg.length);
    });
  });

  describe('H4 — burst nuke: 990.2% of final ATK, burst bucket, cast BEFORE the FB window', () => {
    const nukes = reiDamage(base.events, 'burst');

    it('fires once per burst cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes.length).toBe(reiBursts(base.events).length);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([990.2]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      expect(nukes.filter((d) => d.fbMajorApplied).map((d) => d.sec)).toEqual(
        []
      );
    });
  });

  describe('H5 — S1 18-hit Anti-A.T.-Field proc (590.64%) is encoded but faithfully INERT here', () => {
    // No in-scope unit applies 'Anti A.T. Field' as a name-keyed targetStatus, so the gate never
    // opens in the control comp. The block is a faithful structural encoding (it goes live if an Eva
    // teammate ever applies the status); cross-family S2b converged on pinning its inertness.
    it('produces ZERO 590.64% events in the control comp (the gate never opens)', () => {
      const procs = reiDamage(base.events, 'skill1').filter(
        (d) => d.atkPct === 590.64
      );
      expect(procs.length).toBe(0);
    });

    it('removing it changes NO unit\u2019s total by a single point (it is inert, not dropped)', () => {
      expect(base.totals).toEqual(noAntiField.totals);
    });
  });
});
