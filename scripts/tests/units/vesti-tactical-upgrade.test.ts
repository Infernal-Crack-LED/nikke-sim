// PER-UNIT KIT SPEC — `vesti-tactical-upgrade` (Vesti: Tactical Upgrade, Attacker/RL/Fire,
// Burst III, cd 40s, ammo 8, chargeFrames 120, chargeMultiplier 200). Kit-autonomy gauntlet
// 2026-08-01 (driver-authored spec; cross-family S2b/S5/S6/S7).
//
// One assertion group per KIT LINE (V1..V8), asserted against the SHIPPED override on disk.
// `withPatchedOverride` builds COUNTERFACTUALS only (the nearest wrong model each assertion must
// discriminate against) — never the encoding under test.
//
// Kit (data/characters.json → characters['vesti-tactical-upgrade'].skills):
//   S1 ■ performing a Full Charge attack (while not in Missile Guide) → self:               [V1]
//        Missile Guide: Charge Speed ▲100% for 3 round(s)
//        Charge Damage ▲58.5% for 3 round(s)                                                 [V2]
//      ■ reloading to max ammunition → self: Removes Missile Guide                           [V1/V2 removeOnReload]
//   S2 ■ landing Full Charge attacks → target: 266.6% of final ATK as TRUE damage           [V3]
//      ■ landing Full Charge attacks if self in Battle Formation → self: ATK ▲20% for 3 sec  [V4]
//      ■ landing Full Charge attacks if target in Explosive Round → self:
//                                          Projectile Explosion Damage ▲20% for 3 sec        [V5]
//   BU ■ self: Explosion Radius ▲100% for 10 sec  (UNMODELED — inert vs partless boss)       [V8]
//      ■ self: True Damage ▲60% for 10 sec                                                   [V6]
//      ■ all enemies: 492.3% of final ATK as Burst Skill true damage                         [V7]
//
// Discrimination (a test that cannot fail under the nearest wrong model gates nothing):
//   V1/V2  round-count, not seconds: durationShots 3 with NO wall-clock expiry (expiresFrame
//          null), holder-scoped; the nearest wrong model is a durationSec 3 time-window. Plus
//          removeOnReload: a reload-to-max STRIPS the buff (buffRemove cause 'reload') — the
//          nearest wrong model is a buff that survives the reload.
//   V3     the kit magnitude 266.6 (not the level-1 157.53), once per full charge, true-flavored
//          (it picks up the burst's trueDamagePct 60 — a non-true rider would not).
//   V4     'Battle Formation' ATK ▲20% is UNMODELED (blind consensus: a self-status granted nowhere
//          in the kit, no self-status gate primitive → inert). The nearest wrong model is crediting
//          it (an ungated per-shot ATK ▲20% self-buff); the discrimination adds that block back and
//          shows the shipped override deliberately omits it. fbGate:'inFb' is the documented ⚑6 alt.
//   V5     'Explosive Round' is a named target-status gate: with no in-scope source opening it the
//          buff NEVER applies in the control comp; the nearest wrong model is an ungated buff that
//          fires on every full charge.
//   V6     the kit magnitude 60 (not level-1 35.45), 10s, self, once per burst cast.
//   V7     492.3 (not level-1 290.9), burst bucket, once per cast, and NEVER takes the +50% FB
//          major (a burstCast nuke lands before the FB window opens).
//   V8     Explosion Radius is deliberately UNMODELED (inert vs the single partless boss; no
//          explosion-radius stat) — recorded verbatim in unmodeled.burst, no silent drop.
//
// Fixture: liter (B1) / crown (B2) / vesti-tactical-upgrade (B3, sole B3 so she casts every Full
// Burst), boss Fire, focus vesti-tu. Deterministic (no seed). Slot order → VESTI = 2.
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
const VESTI = 'vesti-tactical-upgrade';
const VESTI_IDX = 2; // controlComp slot order: liter 0 / crown 1 / vesti-tu 2

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BuffRemove = Extract<SimEvent, { kind: 'buffRemove' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp(VESTI, false),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches (nearest wrong model per line) ---------------------------------
const findBlock = (ov: any, slot: string, pred: (b: any) => boolean) => {
  const b = ov[slot].find(pred);
  if (!b) {
    throw new Error(`vesti-tu ${slot} block missing — fixture is stale`);
  }
  return b;
};
const effectOf = (b: any, kind: string) => {
  const e = b.effects.find((x: any) => x.kind === kind);
  if (!e) {
    throw new Error(`vesti-tu effect ${kind} missing — fixture is stale`);
  }
  return e;
};
/** Safe predicate accessor: the block's buff effect, or undefined (a flatDamage block has none). */
const buffOf = (b: any) => b.effects.find((x: any) => x.kind === 'buff');
const flatOf = (b: any) => b.effects.find((x: any) => x.kind === 'flatDamage');

/** V1 nearest-wrong: the Charge Speed window as a 3-SECOND time buff, not 3 rounds. */
const vtuTimeNotRounds = withPatchedOverride(VESTI, (ov) => {
  const b = findBlock(
    ov,
    'skill1',
    (x) => buffOf(x)?.stat === 'chargeSpeedPct'
  );
  const e = effectOf(b, 'buff');
  delete e.durationShots;
  e.durationSec = 3;
});
/** V1 nearest-wrong: the Missile Guide buffs SURVIVE the reload (no removeOnReload). */
const vtuNoReloadRemove = withPatchedOverride(VESTI, (ov) => {
  for (const b of ov.skill1) {
    delete effectOf(b, 'buff').removeOnReload;
  }
});
/** V2 nearest-wrong: the level-1 Charge Damage value (34.56) instead of the max 58.5. */
const vtuLowChargeDmg = withPatchedOverride(VESTI, (ov) => {
  const b = findBlock(
    ov,
    'skill1',
    (x) => buffOf(x)?.stat === 'chargeDamagePct'
  );
  effectOf(b, 'buff').value = 34.56;
});
/** V3 nearest-wrong: the level-1 true rider (157.53) instead of 266.6. */
const vtuLowRider = withPatchedOverride(VESTI, (ov) => {
  const b = findBlock(ov, 'skill2', (x) => flatOf(x));
  effectOf(b, 'flatDamage').atkPct = 157.53;
});
/** V3 nearest-wrong: the rider is NOT true-flavored (flavor dropped). */
const vtuRiderNotTrue = withPatchedOverride(VESTI, (ov) => {
  const b = findBlock(ov, 'skill2', (x) => flatOf(x));
  delete effectOf(b, 'flatDamage').flavor;
});
/** V4 nearest-wrong: the 'Battle Formation' ATK ▲20% IS credited (ungated per-shot self-buff).
 *  The shipped override deliberately OMITS this block (the line is UNMODELED — blind consensus),
 *  so adding it back is the counterfactual the inertness assertion must discriminate against. */
const vtuAddUngatedAtk = withPatchedOverride(VESTI, (ov) => {
  ov.skill2.push({
    slot: 'skill2',
    trigger: { kind: 'shotFired' },
    target: { kind: 'self' },
    effects: [{ kind: 'buff', stat: 'atkPct', value: 20, durationSec: 3 }],
  });
});
/** V5 nearest-wrong: the Projectile Explosion buff is ungated (no Explosive Round status gate). */
const vtuNoStatusGate = withPatchedOverride(VESTI, (ov) => {
  const b = findBlock(
    ov,
    'skill2',
    (x) => buffOf(x)?.stat === 'projectileExplosionPct'
  );
  delete b.requiresTargetStatus;
});
/** V6 nearest-wrong: the level-1 True Damage value (35.45) instead of 60. */
const vtuLowTrueDmg = withPatchedOverride(VESTI, (ov) => {
  const b = findBlock(ov, 'burst', (x) => buffOf(x)?.stat === 'trueDamagePct');
  effectOf(b, 'buff').value = 35.45;
});
/** V7 nearest-wrong: the level-1 nuke (290.9) instead of 492.3. */
const vtuLowNuke = withPatchedOverride(VESTI, (ov) => {
  const b = findBlock(ov, 'burst', (x) => flatOf(x));
  effectOf(b, 'flatDamage').atkPct = 290.9;
});

// ---- runs (hoisted: each is a full 180s sim) -----------------------------------------------
const base = run();
const timeNotRounds = run({ [VESTI]: vtuTimeNotRounds });
const noReloadRemove = run({ [VESTI]: vtuNoReloadRemove });
const lowChargeDmg = run({ [VESTI]: vtuLowChargeDmg });
const lowRider = run({ [VESTI]: vtuLowRider });
const riderNotTrue = run({ [VESTI]: vtuRiderNotTrue });
const addUngatedAtk = run({ [VESTI]: vtuAddUngatedAtk });
const noStatusGate = run({ [VESTI]: vtuNoStatusGate });
const lowTrueDmg = run({ [VESTI]: vtuLowTrueDmg });
const lowNuke = run({ [VESTI]: vtuLowNuke });

// ---- readers -------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const removes = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffRemove => e.kind === 'buffRemove');
const vestiShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === VESTI);
const vestiBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === VESTI);
const vestiBuff = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === VESTI_IDX && b.stat === stat);
const vestiRiders = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === VESTI && d.srcSlot === 'skill2');
const vestiNukes = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === VESTI && d.srcSlot === 'burst');

/** Sum of vesti-tu damage amount for a given srcSlot. */
const slotTotal = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  dmg(evs)
    .filter((d) => d.slug === VESTI && d.srcSlot === srcSlot)
    .reduce((s, d) => s + d.amount, 0);

describe('vesti-tactical-upgrade — kit spec', () => {
  it('fixture sanity: she lands full charges and casts bursts', () => {
    expect(vestiShots(base.events).length).toBeGreaterThan(0);
    expect(vestiBursts(base.events).length).toBeGreaterThan(0);
  });

  describe('V1 — S1 Missile Guide Charge Speed ▲100% is a 3-ROUND self window, removed on reload', () => {
    const applied = vestiBuff(base.events, 'chargeSpeedPct');

    it('is 100% for 3 rounds with NO wall-clock expiry, self-scoped', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([100]);
      expect([...new Set(applied.map((b) => b.durationShots))]).toEqual([3]);
      expect(
        [...new Set(applied.map((b) => b.expiresFrame))],
        'a round-count buff must not also carry a timed expiry'
      ).toEqual([null]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([
        VESTI_IDX,
      ]);
    });

    it('DISCRIMINATING round-vs-seconds: a 3-SECOND window would carry a timed expiry', () => {
      const cf = vestiBuff(timeNotRounds.events, 'chargeSpeedPct');
      expect(cf.length).toBeGreaterThan(0);
      expect(
        cf.every((b) => b.expiresFrame !== null),
        'the time-window counterfactual must expire by frame (proves the shipped round-count is the one that does NOT)'
      ).toBe(true);
    });

    it('is STRIPPED by a reload-to-max (removeOnReload), not held through it', () => {
      const removed = removes(base.events).filter(
        (r) => r.slug === VESTI && r.stat === 'chargeSpeedPct'
      );
      expect(
        removed.length,
        'no reload-removal of the Charge Speed buff was observed'
      ).toBeGreaterThan(0);
      expect([...new Set(removed.map((r) => r.cause))]).toEqual(['reload']);
    });

    it('DISCRIMINATING reload-removal: without removeOnReload the buff survives every reload', () => {
      const removed = removes(noReloadRemove.events).filter(
        (r) => r.slug === VESTI && r.stat === 'chargeSpeedPct'
      );
      expect(removed.length).toBe(0);
    });
  });

  describe('V2 — S1 Missile Guide Charge Damage ▲58.5% is a 3-ROUND self window, removed on reload', () => {
    const applied = vestiBuff(base.events, 'chargeDamagePct');

    it('is the max-level 58.5% for 3 rounds, self-scoped, no timed expiry', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([58.5]);
      expect([...new Set(applied.map((b) => b.durationShots))]).toEqual([3]);
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([
        VESTI_IDX,
      ]);
    });

    it('DISCRIMINATING magnitude: the level-1 value 34.56 is wrong', () => {
      expect([
        ...new Set(
          vestiBuff(lowChargeDmg.events, 'chargeDamagePct').map((b) => b.value)
        ),
      ]).toEqual([34.56]);
    });

    it('is STRIPPED by a reload-to-max (removeOnReload)', () => {
      const removed = removes(base.events).filter(
        (r) => r.slug === VESTI && r.stat === 'chargeDamagePct'
      );
      expect(removed.length).toBeGreaterThan(0);
      expect([...new Set(removed.map((r) => r.cause))]).toEqual(['reload']);
    });
  });

  describe('V3 — S2 full-charge rider: 266.6% of final ATK as TRUE damage, once per full charge', () => {
    const riders = vestiRiders(base.events);

    it('lands exactly once per full charge at the kit magnitude', () => {
      expect(riders.length).toBe(vestiShots(base.events).length);
      expect(riders.length).toBeGreaterThan(0);
      expect([...new Set(riders.map((d) => d.atkPct))]).toEqual([266.6]);
    });

    it('is crit-eligible and never takes the +30% range bonus (rider convention)', () => {
      expect(riders.every((d) => d.critEligible)).toBe(true);
      expect(riders.every((d) => !d.rangeApplied)).toBe(true);
    });

    it('DISCRIMINATING magnitude: the level-1 rider 157.53 is wrong', () => {
      expect([
        ...new Set(vestiRiders(lowRider.events).map((d) => d.atkPct)),
      ]).toEqual([157.53]);
    });

    it('DISCRIMINATING true flavor: the rider picks up the burst True Damage buff (a non-true rider would not)', () => {
      // true-flavored riders feed on trueDamagePct 60 during the post-burst window, so the shipped
      // skill2 total exceeds the flavor-stripped counterfactual's.
      expect(slotTotal(base.events, 'skill2')).toBeGreaterThan(
        slotTotal(riderNotTrue.events, 'skill2')
      );
    });
  });

  describe("V4 — S2 'Battle Formation' ATK ▲20% is UNMODELED (inert; blind consensus)", () => {
    // 'Battle Formation' is a self-status granted nowhere in this kit and the schema has no
    // self-status gate, so the line never fires in-scope. The driver ADOPTED the blind consensus
    // (S2b fable + S5/S6 opus all re-derived INERT) over its initial fbGate:'inFb' reading; the
    // fbGate alternative is documented in the override (⚑6) for a future measurement to restore.
    it('credits NO ATK ▲20% in the control comp (the line is deliberately absent)', () => {
      const applied = vestiBuff(base.events, 'atkPct').filter(
        (b) => b.value === 20
      );
      expect(applied).toEqual([]);
    });

    it('DISCRIMINATING non-vacuity: adding the ungated block back WOULD credit it (the omission is a real encoding choice)', () => {
      const cf = vestiBuff(addUngatedAtk.events, 'atkPct').filter(
        (b) => b.value === 20
      );
      expect(
        cf.length,
        'the ungated counterfactual must produce ATK ▲20% applications the shipped override omits'
      ).toBeGreaterThan(0);
    });

    it('is recorded verbatim in unmodeled.skill2 (no silent drop)', () => {
      const ov = loadOverride(VESTI) as any;
      expect(ov.unmodeled.skill2).toContain(
        '■ Activates when landing Full Charge attacks if self is in Battle Formation status. Affects self. ATK ▲ 20% for 3 sec.'
      );
    });
  });

  describe("V5 — S2 'Explosive Round' Projectile Explosion ▲20% is a named status gate (inert with no source)", () => {
    it('NEVER applies in the control comp (no in-scope unit opens targetStatus Explosive Round)', () => {
      expect(vestiBuff(base.events, 'projectileExplosionPct').length).toBe(0);
    });

    it('DISCRIMINATING gate: ungated, it fires on every full charge', () => {
      const cf = vestiBuff(noStatusGate.events, 'projectileExplosionPct');
      expect(cf.length).toBeGreaterThan(0);
      expect([...new Set(cf.map((b) => b.value))]).toEqual([20]);
    });
  });

  describe('V6 — burst self True Damage ▲60% for 10 sec', () => {
    const applied = vestiBuff(base.events, 'trueDamagePct');

    it('is the max-level 60% for 10s, self-scoped, once per burst cast', () => {
      expect(applied.length).toBe(vestiBursts(base.events).length);
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([60]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([
        VESTI_IDX,
      ]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('DISCRIMINATING magnitude: the level-1 value 35.45 is wrong', () => {
      expect([
        ...new Set(
          vestiBuff(lowTrueDmg.events, 'trueDamagePct').map((b) => b.value)
        ),
      ]).toEqual([35.45]);
    });
  });

  describe('V7 — burst nuke: 492.3% of final ATK as Burst Skill true damage, cast before FB', () => {
    const nukes = vestiNukes(base.events);

    it('fires once per burst cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes.length).toBe(vestiBursts(base.events).length);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([492.3]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      expect(nukes.filter((d) => d.fbMajorApplied)).toEqual([]);
    });

    it('DISCRIMINATING magnitude: the level-1 nuke 290.9 is wrong', () => {
      expect([
        ...new Set(vestiNukes(lowNuke.events).map((d) => d.atkPct)),
      ]).toEqual([290.9]);
    });
  });

  describe('V8 — burst Explosion Radius ▲100% is deliberately UNMODELED (inert vs partless boss)', () => {
    it('is recorded verbatim in unmodeled.burst (no silent drop)', () => {
      const ov = loadOverride(VESTI) as any;
      expect(ov.unmodeled.burst).toContain(
        '■ Affects self. Explosion Radius ▲ 100% for 10 sec.'
      );
    });

    it('no explosion-radius block exists in the burst slot', () => {
      const ov = loadOverride(VESTI) as any;
      const stats = ov.burst.flatMap((b: any) =>
        b.effects.map((e: any) => e.stat)
      );
      expect(stats).not.toContain('explosionRadiusPct');
    });
  });
});
