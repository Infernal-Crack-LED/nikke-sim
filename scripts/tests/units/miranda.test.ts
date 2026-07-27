// PER-UNIT KIT SPEC — `miranda` (Miranda (Treasure), Supporter/SMG/Fire, Burst I, cd 20s, ammo 120,
// fire rate 1440rpm). kit-autonomy gauntlet S2a (driver tests), 2026-07-25.
//
// One assertion group per KIT LINE (M1..M8 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (treasure prose, data/characters.json → characters.miranda.skills; DB favorite-item prose
// matches this line-for-line since 2026-07-17):
//   S1 ■ after 30 normal attacks → all allies: Hit Rate ▲5.44% for 5 sec                    [M2 — FIX]
//      ■ after 30 normal attacks → all SMG-wielding allies: Hit Rate ▲3.79% for 5 sec        [M3 — FIX]
//      ■ after 30 normal attacks → self: ATK ▲50.06% for 5 sec                               [M1]
//   S2 ■ entering Full Burst → all allies: Critical Damage ▲32.99% for 10 sec                [M4]
//      ■ entering Full Burst → self: Critical Rate ▲30.1% + Attack Damage ▲23.7% for 10 sec  [M5]
//      ■ entering Full Burst → 1 highest-final-ATK ally (except self): Crit Rate ▲85.42% for 1 round [M6 — FIX]
//   BU ■ 2 highest-final-ATK allies (except self): ATK ▲40.4% for 10 sec                     [M7]
//      ■ 2 highest-final-ATK allies (except self): Critical Damage ▲56.23% for 10 sec        [M8]
//
// TWO FIXES this gauntlet makes to the previously-shipped (2026-07-17 reconciled) override:
//   (a) M2/M3 — the two S1 Hit Rate lines were dropped under "hard rule 4" PENDING CONE_DELTA
//       (override note: "re-evaluation queued (kit-audit plan 2026-07-20)"). CONE_DELTA landed
//       2026-07-19 and hitRatePct is now live-wired for accuracy-circle weapons (AR/SMG/SG); the
//       modernia gauntlet (2026-07-25) ships the identical stat. Hard rule 4 is "Hit Rate raises
//       the CORE-HIT rate, magnitude measured-only" — it PERMITS modeling the stat, it does not
//       forbid it. So both lines are now encoded (allies / alliesOfWeapon SMG, hitCount 30, 5s).
//       They are LOAD-BEARING on miranda herself: she is the only accuracy-circle unit in the
//       fixture (crown MG / ada RL / helm SR all keep the flat base core rate), so the +9.23%
//       (5.44 all + 3.79 SMG) lifts her OWN core fraction. The HR→core MAGNITUDE is derived
//       (acrForHR reticle regression; additive-in-pp composition UNVALIDATED R8) — flagged ⚑, the
//       same caveat modernia's hitRatePct carries.
//   (b) M6 — the "for 1 round(s)" crit snapshot was shipped as a wall-clock durationSec 1.5
//       ("one SR carry shot"). "1 round" is round-count language, identical to helm's "10 round(s)"
//       which is durationShots 10 (helm H9); the engine decrements shotsLeft on the HOLDER's shots
//       (sim.ts:2955), so durationShots 1 on the buffed ally = that ally's next ONE shot, which is
//       the literal mechanic for ANY carry cadence (1.5s is ~36 shots on an SMG — a 36× over-credit).
//       Re-encoded to durationShots 1, no wall-clock expiry. Duration semantics for rapid-fire
//       carries flagged ⚑ (recipe: count the buffed ally's crit-boosted shots per FB window).
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   M1  the self ATK line targets SELF only — counterfactual all-allies reaches 4 and moves the
//       carry total (the buff is large, 50.06%, and near-permanent at SMG cadence).
//   M2  hitRatePct to ALL allies reaches 4 holders; zeroing it drops miranda's own total (she is
//       the sole accuracy-circle consumer). Counterfactual stat-swap to atkPct is a different bucket.
//   M3  the SMG-scoped line reaches exactly ONE holder (miranda) — counterfactual all-allies reaches
//       4. Discriminated on TARGET COUNT, not damage: HR is inert on the 3 non-SMG allies anyway, so
//       the scoped vs unscoped damage is byte-identical here; the target set is the observable.
//   M4  team critDmg reaches all 4 on every one of the 9 FB windows; counterfactual self-only
//       reaches 1. fullBurstEnter (not burstCast) is the trigger — fires on EVERY team FB window.
//   M5  self critRate 30.1 + Attack Damage 23.7, both self-scoped. The AD line is attackDamagePct
//       (DamageUp bucket), NOT atkPct (base bucket) — counterfactual bucket-swap moves miranda damage.
//   M6  exactly ONE ally (the top-final-ATK, never miranda) at 85.42%, durationShots 1 with NO
//       wall-clock expiry. Counterfactual count 2 reaches 2; counterfactual durationSec 1.5 changes
//       the buffed ally's damage (many shots vs one).
//   M7  burst ATK 40.4% to exactly TWO allies (top-final-ATK, never miranda), per burst.
//       Counterfactual all-allies reaches 4 + moves total; counterfactual casterAtkPct (% of
//       miranda's LOW support ATK, not the target's own) collapses the buff and drops the carries.
//   M8  burst critDmg 56.23% to the same two allies, per burst (shares M7's block/target).
//
// Fixture (deterministic — no seed): miranda B1 / crown B2 / ada B3 / helm B3, boss Fire, focus ada.
// Miranda is the SOLE Burst I → casts every cycle (9 bursts / 9 FB windows over 180s). Top-final-ATK
// ally (count 1) = ada (slot 2); top-2 = ada + helm (slots 2,3); excludeSelf drops miranda (slot 0).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const ALLIES = 4;
const COMP = ['miranda', 'crown', 'ada', 'helm'];
const MIRANDA = 0;
const ADA = 2;
const HELM = 3;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: COMP,
    bossElement: 'Fire',
    focusSlug: 'ada',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, t: totals(res) };
}

// ---- counterfactual patches -------------------------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** M1 counterfactual: the self ATK line retargeted to all allies. */
const mirandaSelfAtkToAllies = withPatchedOverride('miranda', (ov) => {
  const blk = (ov as any).skill1.find((b: any) => hasStat(b, 'atkPct'));
  if (!blk)
    {throw new Error('miranda S1 atkPct block missing — fixture is stale');}
  blk.target = { kind: 'allies' };
});
/** M2/M3 load-bearing reference: remove BOTH Hit Rate lines (best-effort — absent pre-S3 FIX). */
const mirandaNoHR = withPatchedOverride('miranda', (ov) => {
  (ov as any).skill1 = (ov as any).skill1.filter(
    (b: any) => !hasStat(b, 'hitRatePct')
  );
});
/** M3 counterfactual: the SMG-scoped HR line retargeted to all allies (best-effort pre-S3). */
const mirandaSMGToAllAllies = withPatchedOverride('miranda', (ov) => {
  for (const b of (ov as any).skill1)
    {if (hasStat(b, 'hitRatePct') && b.target?.kind === 'alliesOfWeapon')
      {b.target = { kind: 'allies' };}}
});
/** M4 counterfactual: the team critDmg line retargeted to self only. */
const mirandaS2CritDmgSelf = withPatchedOverride('miranda', (ov) => {
  const blk = (ov as any).skill2.find(
    (b: any) => hasStat(b, 'critDamagePct') && b.target?.kind === 'allies'
  );
  if (!blk)
    {throw new Error(
      'miranda S2 allies critDamagePct block missing — fixture is stale'
    );}
  blk.target = { kind: 'self' };
});
/** M5 counterfactual: the self Attack Damage line bucket-swapped to atkPct (base, not DamageUp). */
const mirandaS2ADWrongBucket = withPatchedOverride('miranda', (ov) => {
  const e = (ov as any).skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'attackDamagePct');
  if (!e)
    {throw new Error(
      'miranda S2 attackDamagePct effect missing — fixture is stale'
    );}
  e.stat = 'atkPct';
});
/** M6 counterfactual: the 85.42 crit snapshot count bumped 1 → 2. */
const mirandaS2Crit85Count2 = withPatchedOverride('miranda', (ov) => {
  const blk = (ov as any).skill2.find((b: any) =>
    b.effects.some(
      (e: any) => e.stat === 'critRatePct' && Math.abs(e.value - 85.42) < 0.01
    )
  );
  if (!blk)
    {throw new Error(
      'miranda S2 85.42 critRate block missing — fixture is stale'
    );}
  blk.target.count = 2;
});
/** M6 counterfactual: the round-count snapshot forced back to a 1.5s wall-clock window. */
const mirandaS2Crit85Seconds = withPatchedOverride('miranda', (ov) => {
  const e = (ov as any).skill2
    .flatMap((b: any) => b.effects)
    .find(
      (x: any) => x.stat === 'critRatePct' && Math.abs(x.value - 85.42) < 0.01
    );
  if (!e)
    {throw new Error(
      'miranda S2 85.42 critRate effect missing — fixture is stale'
    );}
  delete e.durationShots;
  e.durationSec = 1.5;
});
/** M7 counterfactual: the burst ATK line retargeted to all allies. */
const mirandaBurstAtkAllAllies = withPatchedOverride('miranda', (ov) => {
  const blk = (ov as any).burst.find((b: any) => hasStat(b, 'atkPct'));
  if (!blk)
    {throw new Error('miranda burst atkPct block missing — fixture is stale');}
  blk.target = { kind: 'allies' };
});
/** M7 counterfactual: the burst ATK line swapped to casterAtkPct (% of miranda's OWN low ATK). */
const mirandaBurstAtkCaster = withPatchedOverride('miranda', (ov) => {
  const e = (ov as any).burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'atkPct');
  if (!e)
    {throw new Error('miranda burst atkPct effect missing — fixture is stale');}
  e.stat = 'casterAtkPct';
});
/** Load-bearing reference: miranda's whole kit zeroed. */
const mirandaDead = withPatchedOverride('miranda', (ov) => {
  (ov as any).skill1 = [];
  (ov as any).skill2 = [];
  (ov as any).burst = [];
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noHR = run({ miranda: mirandaNoHR });
const smgToAll = run({ miranda: mirandaSMGToAllAllies });
const selfAtkAllies = run({ miranda: mirandaSelfAtkToAllies });
const s2CritDmgSelf = run({ miranda: mirandaS2CritDmgSelf });
const s2ADWrong = run({ miranda: mirandaS2ADWrongBucket });
const s2Crit85Count2 = run({ miranda: mirandaS2Crit85Count2 });
const s2Crit85Seconds = run({ miranda: mirandaS2Crit85Seconds });
const burstAtkAllies = run({ miranda: mirandaBurstAtkAllAllies });
const burstAtkCaster = run({ miranda: mirandaBurstAtkCaster });
const dead = run({ miranda: mirandaDead });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BuffApply => e.kind === 'buffApply' && e.casterIdx === MIRANDA
  );
const byStat = (evs: SimEvent[], stat: string, value: number) =>
  buffs(evs).filter((b) => b.stat === stat && Math.abs(b.value - value) < 0.01);
const mirandaBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'miranda'
  ).length;
const distinctTargets = (list: BuffApply[]) =>
  new Set(list.map((b) => b.targetIdx));
const durationsSec = (list: BuffApply[]) =>
  new Set(list.map((b) => (b.expiresFrame! - b.frame) / FPS));
const sum = (t: Record<string, number>) => COMP.reduce((a, s) => a + t[s], 0);

describe('miranda (Treasure) — kit spec', () => {
  describe('M1 — S1 self ATK ▲50.06% (hitCount 30 → self, 5s)', () => {
    const list = byStat(base.events, 'atkPct', 50.06);
    it('is self-scoped, 50.06%, for 5s, firing repeatedly at SMG cadence', () => {
      expect(list.length, 'no self ATK 50.06 buff applied').toBeGreaterThan(0);
      expect([...distinctTargets(list)], 'must be miranda only').toEqual([
        MIRANDA,
      ]);
      expect([...durationsSec(list)]).toEqual([5]);
      expect(
        list.length,
        'near-permanent at ~1.5s per 30 hits'
      ).toBeGreaterThan(20);
    });
    it('DISCRIMINATES the target: all-allies reaches 4 and moves the carry total', () => {
      expect(
        distinctTargets(byStat(selfAtkAllies.events, 'atkPct', 50.06)).size
      ).toBe(ALLIES);
      expect(sum(selfAtkAllies.t)).not.toBe(sum(base.t));
    });
  });

  describe('M2 — S1 Hit Rate ▲5.44% to ALL allies (hitCount 30, 5s) [FIX]', () => {
    const list = byStat(base.events, 'hitRatePct', 5.44);
    it('reaches all four allies, 5.44%, for 5s', () => {
      expect(
        list.length,
        'no 5.44 Hit Rate buff applied — line still dropped'
      ).toBeGreaterThan(0);
      expect(distinctTargets(list).size, 'all allies').toBe(ALLIES);
      expect([...durationsSec(list)]).toEqual([5]);
    });
    it('is LOAD-BEARING: zeroing the Hit Rate lines drops miranda (the sole accuracy-circle unit)', () => {
      expect(base.t.miranda).toBeGreaterThan(noHR.t.miranda);
    });
  });

  describe('M3 — S1 Hit Rate ▲3.79% to SMG-wielding allies only (hitCount 30, 5s) [FIX]', () => {
    const list = byStat(base.events, 'hitRatePct', 3.79);
    it('reaches exactly the SMG ally (miranda), not the MG/RL/SR allies', () => {
      expect(
        list.length,
        'no 3.79 Hit Rate buff applied — line still dropped'
      ).toBeGreaterThan(0);
      expect(
        [...distinctTargets(list)],
        'only miranda is SMG in this comp'
      ).toEqual([MIRANDA]);
    });
    it('DISCRIMINATES the weapon scope: retargeting to all allies reaches 4 holders', () => {
      expect(
        distinctTargets(byStat(smgToAll.events, 'hitRatePct', 3.79)).size
      ).toBe(ALLIES);
    });
  });

  describe('M4 — S2 Critical Damage ▲32.99% to all allies (fullBurstEnter, 10s)', () => {
    const list = byStat(base.events, 'critDamagePct', 32.99);
    it('reaches all four allies on every FB window, for 10s', () => {
      const windows = mirandaBursts(base.events);
      expect(windows).toBeGreaterThan(0);
      expect(distinctTargets(list).size).toBe(ALLIES);
      expect(list.length, 'one application per ally per FB window').toBe(
        windows * ALLIES
      );
      expect([...durationsSec(list)]).toEqual([10]);
    });
    it('DISCRIMINATES the target: self-only reaches 1 holder', () => {
      expect(
        distinctTargets(byStat(s2CritDmgSelf.events, 'critDamagePct', 32.99))
          .size
      ).toBe(1);
    });
  });

  describe('M5 — S2 self Critical Rate ▲30.1% + Attack Damage ▲23.7% (fullBurstEnter, 10s)', () => {
    const crit = byStat(base.events, 'critRatePct', 30.1);
    const ad = byStat(base.events, 'attackDamagePct', 23.7);
    it('both self-scoped, for 10s, on every FB window', () => {
      expect([...distinctTargets(crit)]).toEqual([MIRANDA]);
      expect([...distinctTargets(ad)]).toEqual([MIRANDA]);
      expect([...durationsSec(crit)]).toEqual([10]);
      expect([...durationsSec(ad)]).toEqual([10]);
    });
    it('DISCRIMINATES the bucket: Attack Damage is attackDamagePct, not atkPct (moves her damage)', () => {
      expect(s2ADWrong.t.miranda).not.toBe(base.t.miranda);
    });
  });

  describe('M6 — S2 Critical Rate ▲85.42% to 1 highest-final-ATK ally, "for 1 round" [FIX]', () => {
    const list = byStat(base.events, 'critRatePct', 85.42);
    it('buffs exactly ONE ally, never miranda (excludeSelf), at 85.42%', () => {
      expect(list.length, 'no 85.42 crit snapshot applied').toBeGreaterThan(0);
      expect(distinctTargets(list).size, 'alliesTopAtk count 1').toBe(1);
      expect([...distinctTargets(list)]).not.toContain(MIRANDA);
    });
    it('is a ROUND count (durationShots 1), with NO wall-clock expiry', () => {
      expect(
        [...new Set(list.map((b) => b.durationShots))],
        '1 round → durationShots 1'
      ).toEqual([1]);
      expect(
        [...new Set(list.map((b) => b.expiresFrame))],
        'a round-count buff must not also carry a timed expiry'
      ).toEqual([null]);
    });
    it('is encoded alliesTopAtk/byFinalAtk/count 1/excludeSelf (structural pin)', () => {
      const ov = withPatchedOverride('miranda', () => {}) as any;
      const blk = ov.skill2.find((b: any) =>
        b.effects.some(
          (e: any) =>
            e.stat === 'critRatePct' && Math.abs(e.value - 85.42) < 0.01
        )
      );
      expect(blk.target).toEqual({
        kind: 'alliesTopAtk',
        byFinalAtk: true,
        count: 1,
        excludeSelf: true,
      });
      expect(blk.trigger).toEqual({ kind: 'fullBurstEnter' });
    });
    it('DISCRIMINATES the count: count 2 reaches two allies', () => {
      expect(
        distinctTargets(byStat(s2Crit85Count2.events, 'critRatePct', 85.42))
          .size
      ).toBe(2);
    });
    it("DISCRIMINATES the duration: a 1.5s window changes the buffed carry's damage vs one shot", () => {
      expect(s2Crit85Seconds.t.ada).not.toBe(base.t.ada);
    });
  });

  describe('M7 — burst ATK ▲40.4% to 2 highest-final-ATK allies (burstCast, 10s)', () => {
    const list = byStat(base.events, 'atkPct', 40.4);
    it('buffs exactly TWO allies, never miranda, once per burst, for 10s', () => {
      const bursts = mirandaBursts(base.events);
      expect(bursts).toBeGreaterThan(0);
      expect(distinctTargets(list).size, 'alliesTopAtk count 2').toBe(2);
      expect([...distinctTargets(list)]).not.toContain(MIRANDA);
      expect(list.length, 'one application per ally per burst').toBe(
        bursts * 2
      );
      expect([...durationsSec(list)]).toEqual([10]);
    });
    it('DISCRIMINATES the count: all-allies reaches 4 and moves the total', () => {
      expect(
        distinctTargets(byStat(burstAtkAllies.events, 'atkPct', 40.4)).size
      ).toBe(ALLIES);
      expect(sum(burstAtkAllies.t)).not.toBe(sum(base.t));
    });
    it('DISCRIMINATES the stat: atkPct (% of target OWN) ≠ casterAtkPct (% of miranda low ATK)', () => {
      expect(burstAtkCaster.t.ada).not.toBe(base.t.ada);
      expect(burstAtkCaster.t.helm).not.toBe(base.t.helm);
    });
  });

  describe('M8 — burst Critical Damage ▲56.23% to the same 2 allies (burstCast, 10s)', () => {
    const list = byStat(base.events, 'critDamagePct', 56.23);
    it('buffs exactly TWO allies, never miranda, once per burst, for 10s', () => {
      const bursts = mirandaBursts(base.events);
      expect(distinctTargets(list).size).toBe(2);
      expect([...distinctTargets(list)]).not.toContain(MIRANDA);
      expect(list.length).toBe(bursts * 2);
      expect([...durationsSec(list)]).toEqual([10]);
    });
    it('shares the burst block/target with M7 (structural pin)', () => {
      const ov = withPatchedOverride('miranda', () => {}) as any;
      const blk = ov.burst.find((b: any) => hasStat(b, 'critDamagePct'));
      expect(blk.target).toEqual({
        kind: 'alliesTopAtk',
        byFinalAtk: true,
        count: 2,
        excludeSelf: true,
      });
      expect(blk.trigger).toEqual({ kind: 'burstCast' });
    });
  });

  describe('kit contribution is damage-load-bearing (not inert)', () => {
    it("zeroing miranda's whole kit drops both carries", () => {
      expect(base.t.ada).toBeGreaterThan(dead.t.ada);
      expect(base.t.helm).toBeGreaterThan(dead.t.helm);
    });
  });

  describe('unmodeled lines (structural pins)', () => {
    it('every kit line is now modeled — all unmodeled slots empty after the FIX', () => {
      const ov = withPatchedOverride('miranda', () => {}) as any;
      expect(ov.unmodeled.skill1).toEqual([]);
      expect(ov.unmodeled.skill2).toEqual([]);
      expect(ov.unmodeled.burst).toEqual([]);
    });
  });
});
