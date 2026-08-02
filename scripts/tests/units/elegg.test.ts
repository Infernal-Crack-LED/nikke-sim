// PER-UNIT KIT SPEC — `elegg` (base Elegg, Supporter/MG/Electric, Burst II, cd 20s, ammo 300,
// hitsPerShot 1). Kit-autonomy gauntlet 2026-08-02, test-first re-derivation.
//
// THIS IS THE BASE MG/Electric `elegg` — explicitly NOT the Water variant `elegg-boom-and-shock`
// (a separate ghost-pool kit). Slug disambiguation confirmed at S0.
//
// One assertion group per kit line (E1..E8), asserted against the SHIPPED override loaded from
// disk. `withPatchedOverride` builds COUNTERFACTUALS only (the nearest-wrong model each assertion
// must discriminate against) — never the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.elegg.skills):
//   S1 ■ start of battle, all allies: damage to enemy projectile ▲59.66% continuously      [E8 UNMODELED]
//      ■ after 100 normal attacks: 158.65% of final ATK as Distributed Damage to the target
//        (+2 surrounding IF in BOOM Install — the conditional governs the SPREAD, not activation;
//         the spread is out-of-domain in the single-target sim)                            [E1/E2]
//   S2 ■ after 60 normal attacks ON A TARGET IN BOOM INSTALL status, all allies:
//        ATK ▲13.09% of the skill user's ATK for 5 sec  (gate in the ACTIVATION clause)     [E3]
//      ■ when the stage target appears, all allies: Fills Burst Gauge 100%, once/battle    [E7]
//   BU ■ all allies: Distributed Damage dealt ▲39.74% for 10 sec                           [E4]
//      ■ enemy nearest crosshair: 316.66% of final ATK as Burst Skill damage               [E5]
//      ■ BOOM Install: DEF ▼35.64% for 10 sec  (DEF▼ inert; the STATUS window gates E3)     [E6]
//
// THE CRUX (cross-family S2b catch): S1b and S2a are phrased DIFFERENTLY and so gate differently.
//   S2a: "after landing 60 normal attacks ON A TARGET IN BOOM INSTALL status" — the BOOM gate is in
//        the ACTIVATION clause → S2a is DEAD outside the BOOM windows (requiresTargetStatus).
//   S1b: "Activates after landing 100 normal attack(s). Affects the target and 2 surrounding
//        enemy unit(s) IF THE TARGET IS IN BOOM INSTALL" — the BOOM reference is in the AFFECTS
//        clause (it widens the target set), NOT the activation clause → S1b fires every 100 NA
//        UNGATED. The nearest-wrong model (the shared-prior trap) is status-gating S1b like S2a,
//        which deletes every out-of-window proc. E2 discriminates: removing the BOOM Install status
//        leaves the S1b proc count UNCHANGED (ungated) whereas a gated model would zero it.
//
// The engine has no enemy entity, so the BOOM Install status is observable ONLY through its gated
// downstream rider (S2a) — no event is emitted for it. E6 proves the status by showing that
// deleting the burst's targetStatus block zeroes S2a while leaving S1b (ungated) and the burst's
// own nuke + distributed buff untouched.
//
// Why each assertion discriminates (a test that cannot fail under the nearest-wrong model gates
// nothing):
//   E1  the 158.65% rider is a hitCount:100 proc in the skill1 bucket — a burst-bucket or
//       wrong-coefficient encoding fails. Removed-block counterfactual → 0 events.
//   E2  S1b is UNGATED: deleting the BOOM Install status leaves its proc count unchanged (>0).
//       The nearest-wrong (status-gated) model would drop it to 0.
//   E3  S2a is the CASTER-scaled team ATK grant (casterAtkPct, % of elegg's ATK as a flat add),
//       reaches all allies, 5s, and IS BOOM-gated (status deletion zeroes it). A self-only or
//       atkPct (target's-own-%) encoding fails the target-set / stat assertions.
//   E4  distributedDamagePct 39.74 reaches all allies for 10s AND is live + scoped: the S1b
//       distributed proc carries mult.distributed 1.3974 in-window and 1.0 out-of-window (both
//       appear), and 1.0 everywhere when the buff is deleted. A "buff applied but inert" or a
//       generic attackDamagePct encoding fails the mult.distributed discrimination.
//   E5  the burst nuke is 316.66% in the burst bucket, once per cast, and — burstCast resolving
//       pre-FB — never takes the +50% FB major (verified fact 2026-07-13).
//   E6  the BOOM Install status WINDOW (not its inert DEF▼ magnitude) gates S2a only: deleting it
//       zeroes S2a but leaves S1b (ungated), the nuke, and the distributed buff intact.
//   E7  the battle-start gauge fill is observable only behaviorally (the gauge pipeline emits no
//       event): the team's first burstCast lands strictly earlier WITH the fill than without it.
//   E8  the anti-projectile line is OUT-OF-DOMAIN (no enemy projectiles in the sim) and must sit
//       verbatim in unmodeled — asserted structurally so it is accounted for, not silently dropped.
//
// Fixture: liter (B1) / elegg (B2, sole) / helm (B3), boss Fire, focus elegg. Elegg must be the
// SOLE Burst II unit — alongside crown she never wins the B2 slot and never casts (the cross-family
// reviewer independently flagged this). Deterministic (no seed). Elegg is slot index 1; 3 allies.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const SLUGS = ['liter', 'elegg', 'helm'] as const;
const ELEGG = 1; // slot index in SLUGS
const N_ALLIES = SLUGS.length;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [...SLUGS],
    bossElement: 'Fire',
    focusSlug: 'elegg',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches (nearest-wrong models) -------------------------------------------
const hasEffect = (b: any, pred: (e: any) => boolean) => b.effects.some(pred);

/** E1: the S1b 158.65% distributed rider removed. */
const noS1b = withPatchedOverride('elegg', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !hasEffect(b, (e: any) => e.kind === 'flatDamage')
  );
  if (ov.skill1.length === before) {
    throw new Error('elegg S1b flatDamage block missing — fixture is stale');
  }
});
/** E3: the S2a casterAtkPct team buff removed. */
const noS2a = withPatchedOverride('elegg', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !hasEffect(b, (e: any) => e.stat === 'casterAtkPct')
  );
  if (ov.skill2.length === before) {
    throw new Error('elegg S2a casterAtkPct block missing — fixture is stale');
  }
});
/** E7: the battle-start fillGauge removed. */
const noFill = withPatchedOverride('elegg', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !hasEffect(b, (e: any) => e.kind === 'fillGauge')
  );
  if (ov.skill2.length === before) {
    throw new Error('elegg S2b fillGauge block missing — fixture is stale');
  }
});
/** E4: the burst distributedDamagePct buff removed. */
const noDistBuff = withPatchedOverride('elegg', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !hasEffect(b, (e: any) => e.stat === 'distributedDamagePct')
  );
  if (ov.burst.length === before) {
    throw new Error('elegg burst distributedDamagePct block missing — stale');
  }
});
/** E5: the burst nuke removed. */
const noNuke = withPatchedOverride('elegg', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !hasEffect(b, (e: any) => e.kind === 'flatDamage')
  );
  if (ov.burst.length === before) {
    throw new Error('elegg burst nuke block missing — fixture is stale');
  }
});
/** E2/E6: the BOOM Install status window removed (nearest-wrong for S1b = "gated like S2a"). */
const noStatus = withPatchedOverride('elegg', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !hasEffect(b, (e: any) => e.kind === 'targetStatus')
  );
  if (ov.burst.length === before) {
    throw new Error('elegg burst targetStatus block missing — fixture is stale');
  }
});

// ---- runs (hoisted: each is a full 180s sim) -------------------------------------------------
const base = run();
const rNoS1b = run({ elegg: noS1b });
const rNoS2a = run({ elegg: noS2a });
const rNoFill = run({ elegg: noFill });
const rNoDistBuff = run({ elegg: noDistBuff });
const rNoNuke = run({ elegg: noNuke });
const rNoStatus = run({ elegg: noStatus });

// ---- readers ---------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const casts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast');

const eleggCasts = (evs: SimEvent[]) =>
  casts(evs).filter((c) => c.slug === 'elegg');
/** S1b distributed proc: elegg skill1-bucket damage. */
const s1bProcs = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'elegg' && d.srcSlot === 'skill1');
/** Burst nuke: elegg burst-bucket damage. */
const nukes = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'elegg' && d.srcSlot === 'burst');
/** S2a team ATK buff granted BY elegg (casterAtkPct). */
const s2aBuffs = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.stat === 'casterAtkPct' && b.casterIdx === ELEGG);
/** B-a distributed-damage buff granted BY elegg. */
const distBuffs = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) => b.stat === 'distributedDamagePct' && b.casterIdx === ELEGG
  );

const closeTo = (vals: number[], target: number, eps = 1e-6) =>
  vals.every((v) => Math.abs(v - target) < eps);

describe('elegg (base, MG/Electric/B2) — kit spec', () => {
  it('fixture sanity: elegg is the sole B2 and casts her burst', () => {
    expect(eleggCasts(base.events).length).toBeGreaterThan(0);
  });

  describe('E1 — S1b: 158.65% final-ATK Distributed Damage proc (skill1 bucket)', () => {
    it('fires at the kit coefficient in the skill1 bucket', () => {
      const procs = s1bProcs(base.events);
      expect(procs.length).toBeGreaterThan(0);
      expect([...new Set(procs.map((d) => d.atkPct))]).toEqual([158.65]);
      expect([...new Set(procs.map((d) => d.bucket))]).toEqual(['skill']);
    });

    it('is removed entirely when the S1b block is deleted', () => {
      expect(s1bProcs(rNoS1b.events).length).toBe(0);
    });
  });

  describe('E2 — S1b is UNGATED on BOOM Install (the Affects-clause conditional governs the spread, not activation)', () => {
    it('NEAREST-WRONG REJECTED: deleting the BOOM Install status leaves the S1b proc count unchanged', () => {
      const baseCount = s1bProcs(base.events).length;
      const noStatusCount = s1bProcs(rNoStatus.events).length;
      expect(baseCount).toBeGreaterThan(0);
      // ungated → identical count with the status gone; a gated model would drop to 0
      expect(noStatusCount).toBe(baseCount);
    });

    it('the proc is distributed-flavored (it receives the distributed bucket — see E4)', () => {
      const procs = s1bProcs(base.events);
      // at least one proc lands inside the burst distributedDamagePct window (mult 1.3974)
      expect(
        procs.some((d) => Math.abs(d.mult.distributed - 1.3974) < 1e-6)
      ).toBe(true);
    });
  });

  describe('E3 — S2a: team ATK ▲13.09% of caster ATK (casterAtkPct), 5s, BOOM-gated', () => {
    it('reaches all allies, lasts 5s, at a single positive caster-scaled value', () => {
      const applied = s2aBuffs(base.events);
      expect(applied.length).toBeGreaterThan(0);
      const vals = [...new Set(applied.map((b) => b.value))];
      expect(vals.length).toBe(1);
      expect(vals[0]).toBeGreaterThan(0);
      const perFrame = new Map<number, Set<number | null>>();
      for (const b of applied) {
        (perFrame.get(b.frame) ?? perFrame.set(b.frame, new Set()).get(b.frame)!).add(
          b.targetIdx
        );
      }
      for (const [frame, holders] of perFrame) {
        expect(holders.size, `frame ${frame} reached ${holders.size} allies`).toBe(
          N_ALLIES
        );
      }
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
      }
    });

    it('is removed when the S2a block is deleted', () => {
      expect(s2aBuffs(rNoS2a.events).length).toBe(0);
    });

    it('IS gated: deleting the BOOM Install status zeroes the buff (contrast E2 ungated S1b)', () => {
      expect(s2aBuffs(base.events).length).toBeGreaterThan(0);
      expect(s2aBuffs(rNoStatus.events).length).toBe(0);
    });
  });

  describe('E4 — B-a: Distributed Damage dealt ▲39.74% to all allies for 10s, live AND scoped', () => {
    it('applies 39.74 to all allies for 10s', () => {
      const applied = distBuffs(base.events);
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([39.74]);
      const perFrame = new Map<number, Set<number | null>>();
      for (const b of applied) {
        (perFrame.get(b.frame) ?? perFrame.set(b.frame, new Set()).get(b.frame)!).add(
          b.targetIdx
        );
      }
      for (const [frame, holders] of perFrame) {
        expect(holders.size, `frame ${frame} reached ${holders.size} allies`).toBe(
          N_ALLIES
        );
      }
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('is LIVE + SCOPED: S1b procs carry mult.distributed 1.3974 in-window AND 1.0 out-of-window', () => {
      const dist = s1bProcs(base.events).map((d) => d.mult.distributed);
      expect(dist.some((v) => Math.abs(v - 1.3974) < 1e-6)).toBe(true);
      expect(dist.some((v) => Math.abs(v - 1.0) < 1e-6)).toBe(true);
    });

    it('deleting the buff collapses every S1b proc to mult.distributed 1.0', () => {
      const without = s1bProcs(rNoDistBuff.events).map((d) => d.mult.distributed);
      expect(without.length).toBeGreaterThan(0);
      expect(closeTo(without, 1.0)).toBe(true);
      expect(distBuffs(rNoDistBuff.events).length).toBe(0);
    });
  });

  describe('E5 — B-b: 316.66% final-ATK Burst Skill damage, cast before the FB window', () => {
    it('fires once per cast at the kit magnitude, in the burst bucket', () => {
      const nk = nukes(base.events);
      expect(nk.length).toBe(eleggCasts(base.events).length);
      expect(nk.length).toBeGreaterThan(0);
      expect([...new Set(nk.map((d) => d.atkPct))]).toEqual([316.66]);
      expect([...new Set(nk.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (cast lands before FB opens)', () => {
      expect(nukes(base.events).every((d) => !d.fbMajorApplied)).toBe(true);
    });

    it('is removed when the nuke block is deleted', () => {
      expect(nukes(rNoNuke.events).length).toBe(0);
    });
  });

  describe('E6 — B-c: BOOM Install is a STATUS WINDOW gating S2a (DEF▼ magnitude inert)', () => {
    it('deleting the status zeroes S2a but leaves S1b (ungated), the nuke and the dist buff intact', () => {
      expect(s2aBuffs(rNoStatus.events).length).toBe(0); // gated rider → gone
      // ungated S1b unchanged
      expect(s1bProcs(rNoStatus.events).length).toBe(s1bProcs(base.events).length);
      // burst's own lines do NOT depend on the status → unchanged counts
      expect(nukes(rNoStatus.events).length).toBe(nukes(base.events).length);
      expect(distBuffs(rNoStatus.events).length).toBe(distBuffs(base.events).length);
    });

    it('the inert DEF▼35.64% magnitude is recorded verbatim in unmodeled, not as a block', () => {
      const ov = loadOverride('elegg') as any;
      expect((ov.unmodeled?.burst ?? []).join(' ')).toContain('DEF ▼ 35.64%');
      // no enemy DEF-debuff block and no damageTakenPct over-credit are authored
      const hasDefDebuff = ov.burst.some((b: any) =>
        b.effects.some(
          (e: any) =>
            (e.stat === 'defPct' || e.stat === 'damageTakenPct') &&
            b.target.kind === 'enemy'
        )
      );
      expect(hasDefDebuff).toBe(false);
    });
  });

  describe('E7 — S2b: battle-start team Burst Gauge fill (fillGauge 100, once per battle)', () => {
    it('the team bursts strictly earlier WITH the fill than without it', () => {
      const withFill = casts(base.events)[0]?.frame ?? Infinity;
      const withoutFill = casts(rNoFill.events)[0]?.frame ?? Infinity;
      expect(withFill).toBeLessThan(withoutFill);
      // the fill snaps the first burst to ~t=0; natural accumulation takes seconds
      expect(withoutFill - withFill).toBeGreaterThan(1 * FPS);
    });
  });

  describe('E8 — S1a anti-projectile line is OUT-OF-DOMAIN and accounted for in unmodeled', () => {
    it('sits verbatim in unmodeled.skill1 (no enemy projectiles in the sim)', () => {
      const ov = loadOverride('elegg') as any;
      const s1 = (ov.unmodeled?.skill1 ?? []).join(' ');
      expect(s1).toContain('enemy projectile');
      expect(s1).toContain('59.66%');
    });

    it('no projectile-damage block is authored for it', () => {
      const ov = loadOverride('elegg') as any;
      const projectileBlock = ov.skill1.some((b: any) =>
        b.effects.some((e: any) => e.stat === 'projectileExplosionPct')
      );
      expect(projectileBlock).toBe(false);
    });
  });
});
