// PER-UNIT KIT SPEC — `guillotine-winter-slayer` (Guillotine: Winter Slayer, aka "gws";
// AR / Attacker / Water / Burst III, cd 40s, ammo 60). Kit-autonomy gauntlet 2026-07-25.
//
// VARIANT — its base counterpart is `guillotine` (Guillotine, MG/Electric), an ENTIRELY different
// unit. This file is about the AR/Water variant ONLY. (The slug-disambiguation lint flags the base
// token "guillotine" inside the hyphenated slug itself — a known false positive; the unit here is
// unambiguous by full slug + full name + approved nickname "gws".)
//
// One assertion group per KIT LINE (G1..G7), asserted against the SHIPPED override loaded from disk.
// `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model each
// assertion discriminates against) — never to supply the encoding under test.
//
// THE MODELING ABSTRACTION (read first): gws has a "Hero Level" currency — EXP +1 per 3 core hits
// (the core branch DOMINATES at scope-lock core exposure 1.0; the 6-non-core-hit branch is folded in
// at an unmeasured blend — the realised core-hit fraction is exposure × ACR and ACR < 1 for an AR
// without hit-rate support, so non-core hits DO occur and the true cadence is slower; see ⚑2),
// 10 EXP = +1 level, cap 11. The override COLLAPSES the ramp to its level-11 STEADY STATE (reached
// ~28s in on the pure-core branch). NOTE the FIRST burst lands early (~5s on the opening B1→B2→B3
// chain, at ~Hero Level 2-3), so its DoT is OVER-credited at the level-11 magnitude; later ~40s-CD
// bursts genuinely reach level 11 (this first-burst over-credit is part of ⚑3, measured-accurate in
// aggregate). Every "× Hero Level" magnitude is pinned at ×11. This is the measured-accurate model
// (kit-status residual: "burst DoT + Hero-Level auras measured accurate"). The level-11 pins below
// (12.76 = 1.16×11, 229.57 = 20.87×11) DISCRIMINATE the steady-state model from a level-1 (×1) one.
// The level-up REWARDS (reload + heal) are CAPPED at 10 firings (S2 EXP cap 100 ÷ 10/level = 10
// level-ups = Level 1→11) via a heroLevel resource pool + resourceGate — see G2/G3.
//
// Kit (blablalink prose, data/characters.json → characters['guillotine-winter-slayer'].skills):
//   S1 ■ every 10 EXP → Hero Level Up (max 11); reward: Reloads 10.26%               [G2]
//                                                reward: Recovers 2.44% final Max HP  [G3]
//      ■ on Hero level up → all Water Code allies:
//          Elemental Advantage Attack Damage ▲ 1.16% × Hero Level continuously         [G1]  (×11 = 12.76)
//          ATK ▲ 0.91% of skill user's ATK × Hero Level continuously                   [G1]  (×11 = 10.01% → flat)
//   S2 ■ 6 normal hits w/o core → EXP: ATK ▲ 1.81%, stacks ×100  (non-core branch —    [G4]  jointly
//      ■ 3 core hits          → EXP: ATK ▲ 1.81%, stacks ×100   (core branch, fires)   [G4]  modeled)
//      ■ Hero Level 2+ → self: Elemental Advantage Attack Damage ▲ 7.46% continuously  [G5]
//   BU ■ all Water Code allies: Attack Damage ▲ 10.14% / 10s                            [G6]
//                               Elemental Advantage Attack Damage ▲ 18.75% / 10s        [G6]
//      ■ highest-final-MaxHP enemy: 20.87% of final ATK × Hero Level / sec / 10s        [G7]  (×11 = 229.57/s)
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   G1  the auras target WATER-CODE ALLIES ONLY — in this comp that is gws + helm, NOT liter/crown.
//       Proven two ways: the buffApply target set is exactly {gws, helm}, AND removing the auras
//       drops gws AND helm damage while leaving crown (Fire) byte-identical. An unscoped all-ally
//       aura would also reach liter/crown — the target-set assertion is one that model provably fails.
//       The value 12.76 (=1.16×11) discriminates the level-11 steady state from a level-1 (1.16) ramp.
//   G2  the reload reward is LOAD-BEARING: removing it costs ~46 shots and ~2% damage over the fight
//       (the 10.26% mag top-up every 30 hits cuts natural reloads). A dropped/inert reload block
//       would leave the shot count unchanged — it does not.
//   G3  the heal reward is an EVENT, not a number: it is self-targeted, no HP pool is modeled, and no
//       ally in this comp watches gws's SELF-recovery — so it must change NO unit's damage by a point
//       (the counterfactual risk is someone encoding 2.44% as a damage buff). The block must also be
//       PRESENT (the line is represented as a recovery event, not silently dropped — hard rule 2).
//       Its recovery-consumer observable is unexercised HERE (no ally-recovery-watcher in the comp).
//   G4  the EXP ATK stack is self-scoped, value 1.81/stack, and HONORS its ×100 cap: the observed
//       stack count tops out at exactly 100 (an uncapped stack would exceed it; a flat non-stacking
//       buff would never show stacks>1). It is permanent (no wall-clock expiry).
//   G5  the Hero-Level-2 elem-advantage is SELF-ONLY — gws holds 7.46 but helm does NOT (unlike the
//       G1 auras which ARE shared). Value 7.46, permanent. The self-vs-shared split vs G1 is the point.
//   G6  the burst buffs reach exactly the 2 Water allies for exactly 10s (600f), once per cast. Scope
//       (not liter/crown) + duration (600f, not permanent) are the discriminators.
//   G7  the burst DoT magnitude is 229.57%/tick (=20.87×11), 10 ticks per cast, in the burst bucket —
//       NOT the level-1 value 20.87. 6 casts × 10 ticks = 60 instances over the fight.
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / gws B3 / helm B3, boss Fire so gws
// is elementally ADVANTAGED — required to make elemAdvantageDamagePct live), focus gws. gws needs the
// real rotation to cast her burst at all. Deterministic (no seed). Event-log over totals.
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
const SLUG = 'guillotine-winter-slayer';
/** controlComp slot order: liter 0 / crown 1 / gws 2 / helm 3. */
const GWS = 2;
const HELM = 3;
/** The two Water-Code allies in this comp (liter=Fire, crown=Fire are excluded from Water grants). */
const WATER_ALLIES = [GWS, HELM];

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp(SLUG),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches ------------------------------------------------------------------
const hasKind = (b: any, kind: string) =>
  b.effects.some((e: any) => e.kind === kind);

/** G1 counterfactual: her S1 passive auras (the level-11 steady-state Water-ally grants) removed. */
const gwsNoAuras = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => b.trigger.kind !== 'passive');
  if (ov.skill1.length === before) {
    throw new Error('gws S1 passive aura block missing — fixture is stale');
  }
});
/** G2 counterfactual: her S1 level-up reload reward removed. */
const gwsNoReload = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasKind(b, 'instantReload'));
  if (ov.skill1.length === before) {
    throw new Error('gws S1 instantReload block missing — fixture is stale');
  }
});
/** G3 counterfactual: her S1 level-up heal reward removed. */
const gwsNoHeal = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasKind(b, 'heal'));
  if (ov.skill1.length === before) {
    throw new Error('gws S1 heal block missing — fixture is stale');
  }
});
/** G2/G3 counterfactual: the level-CAP removed (resourceGate stripped from both reward blocks),
 *  so the level-up rewards fire on EVERY 30-hit cadence (~56×) instead of the kit-permitted 10×.
 *  The kit's arithmetic is self-closing: S2 caps EXP at 100, S1 levels per 10 EXP → 100/10 = 10
 *  level-ups = Level 1→11 = the stated cap, so there is no 11th level-up reward under any reading. */
const gwsNoGate = withPatchedOverride(SLUG, (ov) => {
  let removed = 0;
  for (const b of ov.skill1 as any[]) {
    if (b.resourceGate?.name === 'heroLevel') {
      delete b.resourceGate;
      removed++;
    }
  }
  if (removed < 2) {
    throw new Error(
      'gws S1 reward blocks missing the heroLevel resourceGate — fixture is stale'
    );
  }
});

// ---- runs (hoisted: each is a full 180s sim) -------------------------------------------------
const base = run();
const noAuras = run({ [SLUG]: gwsNoAuras });
const noReload = run({ [SLUG]: gwsNoReload });
const noHeal = run({ [SLUG]: gwsNoHeal });
const noGate = run({ [SLUG]: gwsNoGate });

// ---- readers ---------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const gwsBuffs = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.casterIdx === GWS);
const gwsShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === SLUG);
const gwsBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === SLUG);
const gwsDamage = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  dmg(evs).filter((d) => d.slug === SLUG && d.srcSlot === srcSlot);
const targetSet = (bs: BuffApply[]) =>
  [...new Set(bs.map((b) => b.targetIdx))].sort((a, b) => a! - b!);

describe('guillotine-winter-slayer — kit spec', () => {
  describe('G1 — S1 Hero-Level auras are Water-Code-ally scoped, at the level-11 steady state', () => {
    // The S1 aura is the SHARED elem-advantage line (reaches helm); the S2 7.46 line is self-only
    // (G5) and never reaches helm — so helm's permanent holding isolates the S1 aura cleanly.
    const helmAura = gwsBuffs(base.events).filter(
      (b) =>
        b.stat === 'elemAdvantageDamagePct' &&
        b.targetIdx === HELM &&
        b.expiresFrame === null
    );
    const s1ElemAdv = gwsBuffs(base.events).filter(
      (b) => b.stat === 'elemAdvantageDamagePct' && b.value === 12.76
    );
    const casterAtk = gwsBuffs(base.events).filter(
      (b) => b.stat === 'casterAtkPct' && b.expiresFrame === null
    );

    it('grants Elemental Advantage Attack Damage 12.76% (= 1.16 × Hero Level 11), not level-1 1.16%', () => {
      expect(
        helmAura.length,
        'no shared elemAdvantageDamagePct aura reached helm'
      ).toBeGreaterThan(0);
      expect([...new Set(helmAura.map((b) => b.value))]).toEqual([12.76]);
    });

    it('grants the ATK-of-caster aura as a flat add (= 0.91% × 11 of her ATK), permanent', () => {
      expect(
        casterAtk.length,
        'no passive casterAtkPct aura was applied'
      ).toBeGreaterThan(0);
      const vals = [...new Set(casterAtk.map((b) => b.value))];
      expect(vals.length).toBe(1);
      expect(
        vals[0],
        'casterAtkPct must resolve to a positive flat ATK add'
      ).toBeGreaterThan(0);
      expect(casterAtk.every((b) => b.expiresFrame === null)).toBe(true);
    });

    it('reach ONLY the Water-Code allies (gws + helm), never liter/crown', () => {
      expect(targetSet(s1ElemAdv)).toEqual(WATER_ALLIES);
      expect(targetSet(casterAtk)).toEqual(WATER_ALLIES);
    });

    it('DISCRIMINATING: removing the auras drops gws AND helm, but leaves Fire crown byte-identical', () => {
      expect(noAuras.totals[SLUG]).toBeLessThan(base.totals[SLUG]);
      expect(noAuras.totals.helm).toBeLessThan(base.totals.helm);
      // crown is Fire — an unscoped all-ally aura would have lifted her too; the scoped model does not.
      expect(noAuras.totals.crown).toBe(base.totals.crown);
    });
  });

  describe('G2 — S1 level-up reload reward (Reloads 10.26%) is load-bearing AND capped at 10 level-ups', () => {
    it('is a hitCount-30 self instantReload of fraction 0.1026 in the shipped override', () => {
      const ov = loadOverride(SLUG)!;
      const blk = (ov.skill1 as any[]).find((b) => hasKind(b, 'instantReload'));
      expect(blk, 'no instantReload block in skill1').toBeTruthy();
      expect(blk.trigger).toEqual({ kind: 'hitCount', count: 30 });
      expect(blk.target).toEqual({ kind: 'self' });
      expect(
        blk.effects.find((e: any) => e.kind === 'instantReload').fraction
      ).toBe(0.1026);
    });

    // The kit bounds the level-up rewards: S2 caps EXP at 100, S1 levels per 10 EXP, so
    // 100/10 = 10 level-ups = Level 1→11 = the stated cap. The rewards must therefore fire
    // EXACTLY 10×, not on every 30-hit cadence for the whole fight (~56×). The engine emits no
    // countable reload/heal EVENT, so the cap is pinned STRUCTURALLY (a heroLevel resource pool
    // max 11, incremented once per level-up, gating the rewards at ≤10) and discriminated
    // BEHAVIOURALLY below (uncapping it over-fires the reload rider).
    it('is gated to the first 10 level-ups by a heroLevel resource pool (cap 11) + resourceGate', () => {
      const ov = loadOverride(SLUG)! as any;
      const pool = (ov.resources ?? []).find(
        (r: any) => r.name === 'heroLevel'
      );
      expect(pool, 'no heroLevel resource pool declared').toBeTruthy();
      // initial 1 (fight starts at Hero Level 1) + max 11 ⇒ exactly 10 level-ups ⇒ 10 reward
      // firings under the gate; an off-by-one initial would silently shift the count, so pin it.
      expect(pool.initial).toBe(1);
      expect(pool.max).toBe(11);
      // both reward blocks (reload + heal) carry the gate; an increment block feeds the pool.
      const gated = (ov.skill1 as any[]).filter(
        (b) => b.resourceGate?.name === 'heroLevel'
      );
      expect(gated.length).toBe(2);
      for (const b of gated) {
        expect(b.resourceGate.max).toBe(10);
      }
      const increment = (ov.skill1 as any[]).find((b) =>
        hasKind(b, 'resource')
      );
      expect(increment, 'no heroLevel increment block').toBeTruthy();
      expect(
        increment.effects.find((e: any) => e.kind === 'resource')
      ).toMatchObject({
        name: 'heroLevel',
        delta: 1,
      });
    });

    it('adds shots over the fight (removing it costs shots and damage)', () => {
      const baseShots = gwsShots(base.events).length;
      const noReloadShots = gwsShots(noReload.events).length;
      expect(baseShots).toBeGreaterThan(noReloadShots);
      expect(base.totals[SLUG]).toBeGreaterThan(noReload.totals[SLUG]);
    });

    it('DISCRIMINATING: uncapping the gate over-fires the reload rider (~56× vs 10×) → more shots', () => {
      // Removing the resourceGate lets the reload reward fire on EVERY 30-hit cadence for the whole
      // fight instead of the kit-permitted 10× — proving the gate is live and bounding the cadence.
      expect(gwsShots(base.events).length).toBeLessThan(
        gwsShots(noGate.events).length
      );
      expect(base.totals[SLUG]).toBeLessThan(noGate.totals[SLUG]);
    });
  });

  describe('G3 — S1 level-up heal reward (Recovers 2.44% final Max HP) is an event, not a number', () => {
    it('is PRESENT in the shipped override as a self heal event on the level-up cadence (not dropped)', () => {
      const ov = loadOverride(SLUG)!;
      const blk = (ov.skill1 as any[]).find((b) => hasKind(b, 'heal'));
      expect(
        blk,
        'the 2.44% Max HP recovery line must be represented, not silently dropped'
      ).toBeTruthy();
      expect(blk.trigger).toEqual({ kind: 'hitCount', count: 30 });
      expect(blk.target).toEqual({ kind: 'self' });
      expect(blk.effects.some((e: any) => e.kind === 'heal')).toBe(true);
      // same level-cap as the reload rider: the recovery event fires on the first 10 level-ups only.
      expect((blk as any).resourceGate).toEqual({ name: 'heroLevel', max: 10 });
    });

    it("changes NO unit's damage by a single point (event-only self-heal, no HP pool, no damage bucket)", () => {
      // The counterfactual risk: encoding 2.44% as a damage buff. A faithful heal event is inert on
      // every total. (Its recovery-consumer observable is unexercised in THIS comp — no ally watches
      // gws's SELF-recovery — so the inertness, not a consumer firing, is the assertable property.)
      expect(base.totals).toEqual(noHeal.totals);
    });
  });

  describe('G4 — S2 EXP ATK stack: ATK ▲ 1.81% per stack, self-scoped, capped at 100, permanent', () => {
    const stacks = gwsBuffs(base.events).filter(
      (b) => b.stat === 'atkPct' && b.value === 1.81
    );

    it('is live and ramps to exactly the ×100 cap (never exceeding it)', () => {
      expect(stacks.length, 'no EXP ATK stack was applied').toBeGreaterThan(
        100
      );
      const maxStacks = Math.max(...stacks.map((b) => b.stacks));
      expect(maxStacks, 'stack count must top out at the kit cap of 100').toBe(
        100
      );
      expect(
        stacks.some((b) => b.stacks === 100),
        'cap must actually be reached and held'
      ).toBe(true);
    });

    it('is self-scoped (gws only) and permanent (no wall-clock expiry)', () => {
      expect(targetSet(stacks)).toEqual([GWS]);
      expect(stacks.every((b) => b.expiresFrame === null)).toBe(true);
    });
  });

  describe('G5 — S2 Hero-Level-2 Elemental Advantage is SELF-only (not shared with helm)', () => {
    const selfElemAdv = gwsBuffs(base.events).filter(
      (b) => b.stat === 'elemAdvantageDamagePct' && b.value === 7.46
    );

    it('is 7.46%, held by gws alone, permanent', () => {
      expect(
        selfElemAdv.length,
        'no self elemAdvantageDamagePct 7.46 buff'
      ).toBeGreaterThan(0);
      expect(
        targetSet(selfElemAdv),
        'the 7.46 line affects SELF only — helm must not hold it'
      ).toEqual([GWS]);
      expect(selfElemAdv.every((b) => b.expiresFrame === null)).toBe(true);
    });

    it('is distinct from the shared G1 aura (helm holds 12.76 but NOT 7.46)', () => {
      const helmHolds = buffs(base.events).filter(
        (b) =>
          b.targetIdx === HELM &&
          b.stat === 'elemAdvantageDamagePct' &&
          b.value === 7.46
      );
      expect(helmHolds.length).toBe(0);
    });
  });

  describe('G6 — burst grants Water-Code allies Attack Damage 10.14% + Elem Advantage 18.75% for 10s', () => {
    const bursts = gwsBursts(base.events);
    const atkDmg = gwsBuffs(base.events).filter(
      (b) => b.stat === 'attackDamagePct' && b.value === 10.14
    );
    const elemAdv = gwsBuffs(base.events).filter(
      (b) => b.stat === 'elemAdvantageDamagePct' && b.value === 18.75
    );

    it('casts bursts in the fixture', () => {
      expect(bursts.length).toBeGreaterThan(0);
    });

    it('reach exactly the 2 Water allies, once per cast, for exactly 10s (600f)', () => {
      for (const bs of [atkDmg, elemAdv]) {
        expect(bs.length, 'burst Water-ally buff missing').toBe(
          bursts.length * WATER_ALLIES.length
        );
        expect(targetSet(bs)).toEqual(WATER_ALLIES);
        for (const b of bs) {
          expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
        }
      }
    });
  });

  describe('G7 — burst DoT: 20.87% × Hero Level 11 (= 229.57%) of ATK per second for 10s on the boss', () => {
    const dots = gwsDamage(base.events, 'burst');
    const bursts = gwsBursts(base.events);

    it('ticks at the level-11 magnitude 229.57%, NOT the level-1 value 20.87%', () => {
      expect(dots.length, 'no burst DoT damage landed').toBeGreaterThan(0);
      expect([...new Set(dots.map((d) => d.atkPct))]).toEqual([229.57]);
    });

    it('lands 10 ticks per cast (1/s × 10s), in the burst bucket', () => {
      expect(dots.length).toBe(bursts.length * 10);
      expect([...new Set(dots.map((d) => d.bucket))]).toEqual(['burst']);
    });
  });
});
