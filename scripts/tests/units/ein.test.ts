// PER-UNIT KIT SPEC — `ein` (Ein, Attacker/SR/Electric, Burst III, cd 40s, ammo 6, chargeFrames
// 60). Kit-autonomy gauntlet 2026-07-25 (Tier 2 — burstCast-vs-FB ordering + meta-defining elec DPS).
//
// One assertion group per KIT LINE (E1..E7 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.ein.skills):
//   S1 ■ start of battle → self: Summons 4 Near Feathers.                          [E8 FAITHFUL — 4×90.81 true
//                                                                                   at t=0; passive flatDamage fires
//                                                                                   once at frame 0]
//      ■ entering Burst Skill Stage 3 → self: ATK ▲70.12% for 10 sec.             [E1 FAITHFUL]
//   S2 ■ Near Feather summoned → 1 random enemy: 90.81% of final ATK as TRUE dmg.  [E5 magnitude FAITHFUL;
//                                                                                   cadence MEASUREMENT-GATED ⚑2]
//      ■ attacking with Full Charge → self: Charge Damage ▲80% for 1 shot.         [E6 FAITHFUL — permanent
//                                                                                   for an SR that always full-
//                                                                                   charges: every pull re-primes]
//   BU ■ self: Summons 6 Near Feathers.                                            [folded into E5 cadence ⚑2]
//      ■ self: True Damage ▲55.3% for 10 sec.                                      [E2 FAITHFUL]
//      ■ self: Charge Damage ▲140.68% for 10 sec.                                  [E3 FAITHFUL]
//      ■ 10 highest-final-DEF enemies: 300.02% of final ATK as TRUE damage.        [E4 FAITHFUL — targeting
//                                                                                   collapses to the 1 partless boss]
//   ORB zero-damage permanent dot (interval 2.83s) driving team burst gauge.        [E7 — datamined arena data
//                                                                                   (special_burst_gauge), NOT kit
//                                                                                   prose; faithfully modeled]
//
// Faithful encoding notes (why the shipped model is the faithful one):
//   E1  "entering Burst Skill Stage 3" is ANY unit's stage-3 cast, so the trigger is `stageEnter:3`
//       (fires on her OWN casts AND a co-B3's). Self-scoped, 10s.
//   E5  Near Feathers are true-flavored riders that CRIT and are range-excluded. flatDamage defaults
//       crit:true; the SSOT `crit && !trueFlavor` carve-out is DOT-scoped (damage-calculation.md §2c
//       line 352), so true-flavored flatDamage procs keep crit — Prydwen-confirmed for Near Feathers.
//       The per-instance magnitude (90.81%) is kit text; the COUNTS (34 per her burst / 6 per rotation
//       trickle) are Prydwen community estimates, NOT kit-derivable (kit only states 4 at battle start
//       + 6 summoned at burst) — see ⚑2.
//   E6  "for 1 shot" refreshes on every full charge; an SR fires exactly one full-charged shot per pull,
//       so the buff is continuously up → faithful as a permanent passive +80 (parser read kept). A literal
//       durationShots:1 on a per-shot trigger is MECHANICALLY INFEASIBLE: shotFired applies the buff AFTER
//       the shot's damage is computed, so it never benefits a shot (verified: zero benefit, identical to
//       removing the buff). The permanent passive is the faithful steady-state encoding.
//   E8  the 4 battle-start feathers fold into one passive flatDamage 4×90.81=363.24 true noRange — a
//       passive flatDamage fires exactly once at frame 0 (verified), which IS the battle-start behaviour
//       (no separate battleStart primitive needed).
//
// ⚑ MEASUREMENT-GATED cluster (out-of-domain for a blind rebuild; needs an ein-focus recording, U8):
//   ⚑2 feather CADENCE (34/burst lump at burstCast + 6/rotation at fullBurstEnd) is Prydwen-sourced,
//      not kit-derivable. estimate: as shipped. recipe: ein-focus recording to read the real per-window
//      feather count + timing, then re-split the lumps. tier 2.
//   ⚑3 F1 ORDERING: the 34-feather burstCast lump resolves at cast-instant, BEFORE her own True Damage
//      ▲55.3% burst buff registers (block order) — measured consequence: removing the true-damage buff
//      drops her total only ~0.7% (the big lump never sees it), i.e. the lump is under-credited ×1.553.
//      A faithful fix (delaySec, or distributing the lump across the 10s window) needs the real feather
//      timing from the same ein-focus recording. estimate: +55.3% on the burstCast lump once inside the
//      buff window. recipe: delaySec on the burstCast lump (or split it) once the cadence is measured.
//      tier 2.
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / ein B3 / helm B3, boss Fire, focus
// ein) — ein needs a real rotation to cast her burst at all (a lone B3 makes zero Full Bursts). helm is
// a co-B3, so ein's `stageEnter:3` ATK buff (E1) fires on helm's casts too; E1 is therefore asserted as
// "≥ her own burst count", not an exact count. Deterministic (no seed); event-log over totals.
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
/** controlComp slot order: liter 0 / crown 1 / ein 2 / helm 3. */
const EIN = 2;
const EIN_SLUG = 'ein';
/** Kit per-instance Near Feather true damage (S2). */
const FEATHER = 90.81;
/** Prydwen-sourced feather cadence (MEASUREMENT-GATED ⚑2): 34 per her burst, 6 per rotation trickle. */
const BURST_FEATHERS = 34;
const TRICKLE_FEATHERS = 6;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('ein'),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches (nearest-wrong models each assertion discriminates against) --------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);
const hasKind = (b: any, k: string) => b.effects.some((e: any) => e.kind === k);

/** E1 reference: her S1 stage-3 ATK buff removed. */
const einNoS1Atk = withPatchedOverride('ein', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'atkPct'));
  if (ov.skill1.length === before) {
    throw new Error('ein S1 atkPct block missing — fixture is stale');
  }
});
/** E2 reference: her burst True Damage buff removed. */
const einNoTrue = withPatchedOverride('ein', (ov) => {
  let removed = 0;
  for (const b of ov.burst) {
    const n = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.stat !== 'trueDamagePct');
    removed += n - b.effects.length;
  }
  if (!removed) {
    throw new Error(
      'ein burst trueDamagePct effect missing — fixture is stale'
    );
  }
});
/** E3 reference: her burst Charge Damage buff removed. */
const einNoChargeBurst = withPatchedOverride('ein', (ov) => {
  let removed = 0;
  for (const b of ov.burst) {
    const n = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.stat !== 'chargeDamagePct');
    removed += n - b.effects.length;
  }
  if (!removed) {
    throw new Error(
      'ein burst chargeDamagePct effect missing — fixture is stale'
    );
  }
});
/** E5 reference: her Near Feather lumps (skill2 flatDamage) removed. */
const einNoFeathers = withPatchedOverride('ein', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasKind(b, 'flatDamage'));
  if (ov.skill2.length === before) {
    throw new Error('ein S2 feather flatDamage missing — fixture is stale');
  }
});
/** E6 reference: her S2 passive Charge Damage 80% removed. */
const einNoS2Charge = withPatchedOverride('ein', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'chargeDamagePct'));
  if (ov.skill2.length === before) {
    throw new Error('ein S2 chargeDamagePct block missing — fixture is stale');
  }
});
/** E7 reference: her orb-gauge zero-damage dot removed. */
const einNoOrb = withPatchedOverride('ein', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasKind(b, 'dot'));
  if (ov.skill2.length === before) {
    throw new Error('ein S2 orb-gauge dot missing — fixture is stale');
  }
});
/** E8 reference: her battle-start 4-feather lump (skill1 passive flatDamage) removed. */
const einNoStartFeathers = withPatchedOverride('ein', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasKind(b, 'flatDamage'));
  if (ov.skill1.length === before) {
    throw new Error(
      'ein S1 battle-start feather lump missing — fixture is stale'
    );
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noS1Atk = run({ ein: einNoS1Atk });
const noTrue = run({ ein: einNoTrue });
const noChargeBurst = run({ ein: einNoChargeBurst });
const noFeathers = run({ ein: einNoFeathers });
const noS2Charge = run({ ein: einNoS2Charge });
const noOrb = run({ ein: einNoOrb });
const noStartFeathers = run({ ein: einNoStartFeathers });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const einDamage = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  dmg(evs).filter((d) => d.slug === 'ein' && d.srcSlot === srcSlot);
const einBuffs = (evs: SimEvent[], stat: string) =>
  evs.filter(
    (e): e is BuffApply =>
      e.kind === 'buffApply' && e.casterIdx === EIN && e.stat === stat
  );
const einBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'ein');

describe('ein — kit spec', () => {
  describe('E1 — S1 ATK ▲70.12% for 10s on Burst Stage 3 entry, self-scoped', () => {
    const applied = einBuffs(base.events, 'atkPct').filter(
      (b) => b.value === 70.12
    );

    it('is 70.12% for 10 sec, held by ein alone', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([70.12]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([EIN]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('fires on MORE stage-3 entries than ein casts herself (helm is a co-B3)', () => {
      // Strict >: a burstCast-keyed encoding would fire exactly ein's burst count; stageEnter:3
      // also fires on helm's stage-3 casts, so the apply count strictly exceeds ein's own casts.
      expect(applied.length).toBeGreaterThan(einBursts(base.events).length);
    });

    it('DISCRIMINATING: at least one 70.12 apply lands on a rotation ein did NOT cast', () => {
      // The nearest-wrong (burstCast keying) fires ONLY on ein's own casts — so every apply frame
      // would coincide with an ein burstCast. stageEnter:3 fires on helm's casts too, so at least
      // one 70.12 apply must land on a frame with no ein burstCast.
      const einCastFrames = new Set(einBursts(base.events).map((c) => c.frame));
      expect(applied.some((b) => !einCastFrames.has(b.frame))).toBe(true);
    });

    it('DISCRIMINATING: removing S1 drops the buff and her total', () => {
      expect(
        einBuffs(noS1Atk.events, 'atkPct').filter((b) => b.value === 70.12)
      ).toEqual([]);
      expect(noS1Atk.totals.ein).toBeLessThan(base.totals.ein);
    });
  });

  describe('E2 — burst True Damage ▲55.3% for 10s, self', () => {
    const applied = einBuffs(base.events, 'trueDamagePct');

    it('is 55.3% for 10 sec, once per ein burst, self-targeted', () => {
      expect(applied.length).toBe(einBursts(base.events).length);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([55.3]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([EIN]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('DISCRIMINATING: removing it drops her true-damage output (live, not inert)', () => {
      // Small (~0.7%) because of ⚑3/F1: the big burstCast feather lump resolves pre-buff and never
      // sees this buff — only the fullBurstEnd trickle + nuke do. The buff is nonetheless live.
      expect(einBuffs(noTrue.events, 'trueDamagePct')).toEqual([]);
      expect(noTrue.totals.ein).toBeLessThan(base.totals.ein);
    });
  });

  describe('E3 — burst Charge Damage ▲140.68% for 10s, self', () => {
    const applied = einBuffs(base.events, 'chargeDamagePct').filter(
      (b) => b.value === 140.68
    );

    it('is 140.68% for 10 sec, once per ein burst, self-targeted', () => {
      expect(applied.length).toBe(einBursts(base.events).length);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([140.68]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([EIN]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('DISCRIMINATING: removing it drops her charge output', () => {
      expect(
        einBuffs(noChargeBurst.events, 'chargeDamagePct').filter(
          (b) => b.value === 140.68
        )
      ).toEqual([]);
      expect(noChargeBurst.totals.ein).toBeLessThan(base.totals.ein);
    });
  });

  describe('E4 — burst nuke: 300.02% of final ATK as true damage, cast BEFORE the FB window', () => {
    const nukes = einDamage(base.events, 'burst');

    it('fires once per burst cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes.length).toBe(einBursts(base.events).length);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([300.02]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('never takes the +50% FB major (the cast lands before FB opens)', () => {
      expect(nukes.filter((d) => d.fbMajorApplied).map((d) => d.sec)).toEqual(
        []
      );
    });

    it('is crit-eligible and range-excluded (flatDamage rider convention)', () => {
      expect(nukes.every((d) => d.critEligible)).toBe(true);
      expect(nukes.every((d) => !d.rangeApplied)).toBe(true);
    });

    it('carries the allEnemies scope tag (owner scope-string ruling 2026-08-10)', () => {
      // "Affects 10 enemy unit(s) with the highest final DEF" — a capped-multi clause, so
      // the burst-skill-damage amps that scope on "all enemies" reach it (the base-`eunhwa`
      // precedent, whose "10 enemy unit(s) with the highest final ATK" maps the same way —
      // NOT `eunhwa-tactical-upgrade`, who has no burst damage line). Dormant
      // today: no jackal/trina-class amp shares this fixture.
      const ov = loadOverride(EIN_SLUG) as any;
      const nuke = ov.burst
        .flatMap((b: any) => b.effects)
        .find((e: any) => e.kind === 'flatDamage');
      expect(nuke.burstDesc).toBe('allEnemies');
    });
  });

  describe('E5 — Near Feather Attack: 90.81% of final ATK as true damage (cadence ⚑2)', () => {
    const feathers = einDamage(base.events, 'skill2').filter(
      (d) => d.atkPct > 0
    );
    const burstLump = feathers.filter((d) => d.atkPct > 1000); // 34×90.81 = 3087.54 (burstCast)
    const trickleLump = feathers.filter((d) => d.atkPct < 1000); // 6×90.81 = 544.86 (fullBurstEnd)

    it('the burstCast lump is exactly 34 × 90.81 (kit per-instance magnitude)', () => {
      expect(burstLump.length).toBeGreaterThan(0);
      for (const d of burstLump) {
        expect(d.atkPct / FEATHER).toBeCloseTo(BURST_FEATHERS, 6);
      }
    });

    it('the fullBurstEnd trickle lump is exactly 6 × 90.81', () => {
      expect(trickleLump.length).toBeGreaterThan(0);
      for (const d of trickleLump) {
        expect(d.atkPct / FEATHER).toBeCloseTo(TRICKLE_FEATHERS, 6);
      }
    });

    it('feathers are true-flavored riders: crit-eligible and range-excluded', () => {
      expect(feathers.every((d) => d.critEligible)).toBe(true);
      expect(feathers.every((d) => !d.rangeApplied)).toBe(true);
    });

    it('DISCRIMINATING: removing the feathers drops ~a quarter of her damage', () => {
      expect(
        einDamage(noFeathers.events, 'skill2').filter((d) => d.atkPct > 0)
      ).toEqual([]);
      expect(noFeathers.totals.ein).toBeLessThan(base.totals.ein * 0.8);
    });
  });

  describe('E6 — S2 Charge Damage ▲80% (permanent passive for an SR that always full-charges)', () => {
    const applied = einBuffs(base.events, 'chargeDamagePct').filter(
      (b) => b.value === 80
    );

    it('is an 80% passive present from battle start with NO expiry', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([80]);
      expect(applied.some((b) => b.frame === 0)).toBe(true);
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
    });

    it('DISCRIMINATING: removing it drops her charge damage', () => {
      expect(
        einBuffs(noS2Charge.events, 'chargeDamagePct').filter(
          (b) => b.value === 80
        )
      ).toEqual([]);
      expect(noS2Charge.totals.ein).toBeLessThan(base.totals.ein);
    });
  });

  describe('E7 — orb gauge: zero-damage dot driving team burst gauge (datamined, non-kit)', () => {
    const orbTicks = einDamage(base.events, 'skill2').filter(
      (d) => d.atkPct === 0
    );

    it('emits zero-DIRECT-damage skill2 ticks (the dot drives gauge, not damage)', () => {
      expect(orbTicks.length).toBeGreaterThan(0);
      expect(orbTicks.reduce((s, d) => s + d.amount, 0)).toBe(0);
    });

    it('DISCRIMINATING: removing the dot removes the zero-damage ticks', () => {
      expect(
        einDamage(noOrb.events, 'skill2').filter((d) => d.atkPct === 0)
      ).toEqual([]);
    });

    it("DISCRIMINATING: the ticks are NOT inert — removing them shifts ein's total (gauge channel)", () => {
      // The dot does ZERO direct damage (atkPct 0), so any total delta from removing it must flow
      // through its only other channel: each tick drives skillGauge (game-mechanics §6), shifting
      // the rotation/FB timing. A zero-damage tick that failed to reach gauge would leave the total
      // byte-identical — so a non-zero delta proves the orb's gauge side-effect actually works.
      // (Burst COUNT is saturated in this comp and does not move; the timing shift does.)
      expect(noOrb.totals.ein).not.toEqual(base.totals.ein);
    });
  });

  describe('E8 — S1 battle-start: 4 Near Feathers → 4×90.81% true at t=0', () => {
    const startFeathers = einDamage(base.events, 'skill1').filter(
      (d) => d.atkPct > 0
    );

    it('fires exactly once at battle start, at 4× the kit per-instance magnitude', () => {
      expect(startFeathers.length).toBe(1);
      expect(startFeathers[0].frame).toBe(0);
      expect(startFeathers[0].atkPct / FEATHER).toBeCloseTo(4, 6);
    });

    it('is a true-flavored rider: crit-eligible, range-excluded, no FB major at t=0', () => {
      expect(startFeathers[0].critEligible).toBe(true);
      expect(startFeathers[0].rangeApplied).toBe(false);
      expect(startFeathers[0].fbMajorApplied).toBe(false);
    });

    it('DISCRIMINATING: removing it removes the t=0 feather hit', () => {
      expect(
        einDamage(noStartFeathers.events, 'skill1').filter((d) => d.atkPct > 0)
      ).toEqual([]);
    });
  });
});
