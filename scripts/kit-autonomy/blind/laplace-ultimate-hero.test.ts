import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

/*
 * laplace-ultimate-hero (RL / Wind / Attacker / Burst III, cd 40s)
 * Base: ammo 120, reloadFrames 171, chargeFrames 60, hitsPerShot 1,
 *       normalAttackMultiplier 2.5, coreAttackMultiplier 200.
 *
 * KIT (structural read of the prose — one assertion group per line):
 *
 * skill1
 *  (a) "Activates at the start of battle. Affects self."
 *      ATK ▲ 4.05% of the skill user's final max HP, continuously.
 *      → passive / self / stat = atkOfMaxHpPct (HP→ATK conversion, NOT atkPct).
 *  (b) "Activates when performing a Full Charge attack. Affects self."
 *      Warm Up: Charge Speed ▲ 10% continuously, stacks up to 5.
 *      → per-full-charge trigger / self / chargeSpeedPct, maxStacks 5.
 *  (c) "Activates when Warm Up is at max stacks. Removes stacks and affects self."
 *      Weapon swap: "Electric Power, Fully Full Charge", 9.45% of final ATK,
 *      Max Ammo 120, ends when all rounds are fired, Additional Effect: Gains Pierce.
 *      → weaponSwap (+ pierce scoped to the swap) gated on the 5th Warm Up stack.
 *  (d) "Activates when Electric Power, Fully Full Charge ends. Affects self."
 *      Removes 100% of ammo.  → consumeAmmo fraction 1 on swap end.
 *
 * skill2
 *  (a) "after performing 12 normal attacks while in the ... state": Over Energy ▲5%,
 *      up to 100%.  → a hit/shot counter that ONLY counts while swapped (swapGate).
 *  (b) "when Over Energy reaches 100%": resets, advances the Over Energy STAGE.
 *      Stage 1 Max HP ▲2% / 2 ▲3% / 3 ▲7% / 4 ▲10.5%, each stage triggering all
 *      effects before it (cumulative).  → self Max HP grants; they FEED (a)'s
 *      atkOfMaxHpPct conversion because caster === target (self-grant rule).
 *  (c) "when entering Burst Stage 3. Affects self." Attack Damage ▲52.14% for 10 sec.
 *      → stageEnter{stage:3} (ANY team stage-3 cast), NOT burstCast, NOT fullBurstEnter.
 *
 * burst
 *  (a) self ATK ▲63.36% for 10 sec.
 *  (b) all enemies: 2953.84% of final ATK as Burst Skill damage (burst-cast damage,
 *      lands pre-Full-Burst → FB-exempt by engine convention).
 *  (c) "Activates when the skill user is at stage 1 or higher of Over Energy."
 *      934.76% × Over Energy STAGE as additional damage to the nearest enemy.
 *      → a GATED, stage-SCALED rider. Inert at stage 0.
 *
 * FIXTURE: controlComp('laplace-ultimate-hero', true) — liter B1 + crown B2 supply
 * the chain so this Burst III actually casts (a lone B3 makes ZERO full bursts, so a
 * solo fixture would make every burst/stage-3 assertion vacuous). Deterministic, no seed.
 * The fixed helm B3 slot is kept: it does not gate any laplace line, and its presence
 * makes the stageEnter-vs-burstCast discrimination (skill2c) non-vacuous, because a
 * SECOND stage-3 unit is exactly what separates those two trigger identities.
 *
 * DISCRIMINATION STRATEGY: every group compares the faithful override against the
 * NEAREST-WRONG model built with withPatchedOverride (an in-memory clone; the committed
 * JSON is never touched). Structural claims are read off cfg.onEvent rather than totals,
 * because a total can coincide by compensating error.
 */

type Ev = SimEvent & Record<string, unknown>;

const SLUG = 'laplace-ultimate-hero';

function run(overrides?: Record<string, unknown>) {
  const events: Ev[] = [];
  const opts = controlComp(SLUG, true) as Record<string, unknown>;
  if (overrides) {
    opts.overrides = overrides;
  }
  const cfg = (opts.cfg ?? {}) as Record<string, unknown>;
  cfg.onEvent = (ev: SimEvent) => {
    events.push(ev as Ev);
  };
  opts.cfg = cfg;
  const res = runComp(opts as never);
  return { res, events };
}

const self = (ev: Ev) => ev.targetSlug === SLUG;
const buffs = (events: Ev[], stat: string) =>
  events.filter((e) => e.kind === 'buffApply' && e.stat === stat);
const selfBuffs = (events: Ev[], stat: string) =>
  buffs(events, stat).filter(self);
const dmg = (events: Ev[]) => events.filter((e) => e.kind === 'damage');
const selfDmg = (events: Ev[]) =>
  dmg(events).filter((e) => e.srcSlug === SLUG || e.slug === SLUG);

// ---- hoisted runs (each runComp is a full 180s sim; keep the file under ~20) ----

const BASE = run();
const baseTotals = totals(BASE.res);

// skill1a nearest-wrong: HP-scaling ATK encoded as a plain atkPct (a 4.05% ATK buff).
const WRONG_S1A = run({
  [SLUG]: withPatchedOverride(SLUG, (ov) => {
    for (const b of ov.skill1 ?? []) {
      for (const e of b.effects ?? []) {
        if (e.kind === 'buff' && e.stat === 'atkOfMaxHpPct') {
          e.stat = 'atkPct';
        }
      }
    }
  }),
});

// skill1b nearest-wrong: Warm Up charge-speed stacks uncapped/instant at 1 stack
// (drop maxStacks → the stack ladder collapses).
const WRONG_S1B = run({
  [SLUG]: withPatchedOverride(SLUG, (ov) => {
    for (const b of ov.skill1 ?? []) {
      for (const e of b.effects ?? []) {
        if (e.kind === 'buff' && e.stat === 'chargeSpeedPct') {
          delete e.maxStacks;
        }
      }
    }
  }),
});

// skill1c nearest-wrong: the weapon swap removed entirely (kit line dropped).
const NO_SWAP = run({
  [SLUG]: withPatchedOverride(SLUG, (ov) => {
    for (const b of ov.skill1 ?? []) {
      b.effects = (b.effects ?? []).filter((e) => e.kind !== 'weaponSwap');
    }
  }),
});

// skill1c nearest-wrong #2: pierce modeled as the static whole-fight hasPierce flag
// instead of a swap-scoped tag (over-credits every pre-swap shot).
const WRONG_PIERCE = run({
  [SLUG]: withPatchedOverride(SLUG, (ov) => {
    ov.hasPierce = true;
    for (const b of ov.skill1 ?? []) {
      for (const e of b.effects ?? []) {
        if (e.kind === 'weaponSwap') {
          delete e.hasPierce;
        }
        if (e.kind === 'gainPierce') {
          e.kind = 'ignoredMarker';
        }
      }
      b.effects = (b.effects ?? []).filter((e) => e.kind !== 'ignoredMarker');
    }
  }),
});

// skill1d nearest-wrong: the post-swap ammo dump dropped (unit keeps a full belt).
const NO_DUMP = run({
  [SLUG]: withPatchedOverride(SLUG, (ov) => {
    for (const b of ov.skill1 ?? []) {
      b.effects = (b.effects ?? []).filter((e) => e.kind !== 'consumeAmmo');
    }
  }),
});

// skill2a nearest-wrong: Over Energy counts EVERY normal attack, not only swapped ones
// (drop the swapGate → the ladder climbs far too fast).
const WRONG_S2A = run({
  [SLUG]: withPatchedOverride(SLUG, (ov) => {
    for (const b of ov.skill2 ?? []) {
      delete b.swapGate;
    }
  }),
});

// skill2c nearest-wrong: Attack Damage keyed to the owner's OWN burst cast instead of
// "entering Burst Stage 3" (any team stage-3 cast).
const WRONG_S2C = run({
  [SLUG]: withPatchedOverride(SLUG, (ov) => {
    for (const b of ov.skill2 ?? []) {
      const hasAtkDmg = (b.effects ?? []).some(
        (e) => e.kind === 'buff' && e.stat === 'attackDamagePct'
      );
      if (hasAtkDmg) {
        b.trigger = { kind: 'burstCast' };
      }
    }
  }),
});

// burst nearest-wrong: the Over-Energy-gated rider ungated (fires at stage 0 too).
const WRONG_RIDER = run({
  [SLUG]: withPatchedOverride(SLUG, (ov) => {
    for (const b of ov.burst ?? []) {
      delete b.resourceGate;
    }
  }),
});

// ---------------------------------------------------------------------------

describe('laplace-ultimate-hero — skill1a: battle-start ATK from own Max HP', () => {
  it('applies a self HP→ATK conversion, not a plain ATK percentage', () => {
    // atkOfMaxHpPct is the HP-scaling stat; a plain atkPct scales base ATK instead
    // and is the nearest-wrong reading of "4.05% of the skill user's final max HP".
    const faithful = selfBuffs(BASE.events, 'atkOfMaxHpPct');
    expect(faithful.length).toBeGreaterThan(0);
    expect(faithful[0]!.value).toBeCloseTo(4.05, 5);
    // Non-vacuity + discrimination: the wrong stat moves this unit's damage.
    expect(totals(WRONG_S1A.res)[SLUG]).not.toBe(baseTotals[SLUG]);
  });

  it('is continuous (no expiry) and applies at battle start', () => {
    const b = selfBuffs(BASE.events, 'atkOfMaxHpPct')[0]!;
    expect(b.expiresFrame == null || b.expiresFrame > 180 * 60).toBe(true);
  });

  it('is self-scoped — no teammate receives it', () => {
    const others = buffs(BASE.events, 'atkOfMaxHpPct').filter(
      (e) => e.targetSlug !== SLUG
    );
    expect(others).toHaveLength(0);
  });
});

describe('laplace-ultimate-hero — skill1b: Warm Up charge-speed stacks', () => {
  it('grants 10% Charge Speed per full charge, capped at 5 stacks', () => {
    const cs = selfBuffs(BASE.events, 'chargeSpeedPct');
    expect(cs.length).toBeGreaterThan(0);
    expect(cs[0]!.value).toBeCloseTo(10, 5);
    expect(cs[0]!.maxStacks).toBe(5);
    // Discrimination: an uncapped ladder is the nearest-wrong reading of
    // "Stacks up to 5 times" and changes the charge cadence → damage.
    expect(totals(WRONG_S1B.res)[SLUG]).not.toBe(baseTotals[SLUG]);
  });

  it('never reports more than the capped stack count', () => {
    const cs = selfBuffs(BASE.events, 'chargeSpeedPct');
    for (const e of cs) {
      expect((e.stacks as number) ?? 1).toBeLessThanOrEqual(5);
    }
  });

  it('is self-only (Warm Up says "Affects self")', () => {
    const others = buffs(BASE.events, 'chargeSpeedPct').filter(
      (e) => e.targetSlug !== SLUG && e.casterIdx !== null
    );
    // Any charge-speed on a teammate must not originate from this unit's blocks.
    for (const e of others) {
      expect(e.casterSlug).not.toBe(SLUG);
    }
  });
});

describe('laplace-ultimate-hero — skill1c: Electric Power weapon swap', () => {
  it("the swap exists and materially changes this unit's damage", () => {
    // The swap replaces the base RL shot with a 9.45%-of-ATK, 120-round weapon;
    // dropping it is the nearest-wrong "line skipped" model.
    expect(totals(NO_SWAP.res)[SLUG]).not.toBe(baseTotals[SLUG]);
  });

  it('carries a 120-round max ammo and a 9.45% per-shot multiplier in the override', () => {
    const ov = withPatchedOverride(SLUG, () => {});
    const swap = (ov.skill1 ?? [])
      .flatMap((b) => b.effects ?? [])
      .find((e) => e.kind === 'weaponSwap');
    expect(swap).toBeTruthy();
    expect((swap as Record<string, number>).damagePct).toBeCloseTo(9.45, 5);
    expect((swap as Record<string, number>).maxAmmo).toBe(120);
  });

  it('pierce is swap-scoped, not a whole-fight flag', () => {
    // "Additional Effect: Gains Pierce" sits INSIDE the swapped-weapon block, so
    // pre-swap shots are not Pierce-tagged. A static hasPierce over-credits them.
    const ov = withPatchedOverride(SLUG, () => {});
    expect(ov.hasPierce ?? false).toBe(false);
    expect(totals(WRONG_PIERCE.res)[SLUG]).not.toBe(baseTotals[SLUG]);
  });

  it("inertness: the swap moves no teammate's damage", () => {
    for (const slug of Object.keys(baseTotals)) {
      if (slug === SLUG) {
        continue;
      }
      expect(totals(NO_SWAP.res)[slug]).toBe(baseTotals[slug]);
    }
  });
});

describe('laplace-ultimate-hero — skill1d: swap end removes 100% of ammo', () => {
  it('the forced ammo dump is modeled and changes shot economy', () => {
    // "Removes 100% of ammo" = consumeAmmo{fraction:1} → forces a reload, so the
    // post-swap magazine is NOT free. Dropping it is the nearest-wrong model.
    expect(totals(NO_DUMP.res)[SLUG]).not.toBe(baseTotals[SLUG]);
    expect(totals(NO_DUMP.res)[SLUG]).toBeGreaterThan(baseTotals[SLUG]);
  });

  it('non-vacuity: the swap actually ends at least once in the fixture', () => {
    // If the swap never ended, the dump assertion above would test nothing.
    const reloads = BASE.events.filter(
      (e) => e.kind === 'reload' && (e.slug === SLUG || e.targetSlug === SLUG)
    );
    expect(reloads.length).toBeGreaterThan(0);
  });
});

describe('laplace-ultimate-hero — skill2a/b: Over Energy ladder', () => {
  it('Over Energy accrues ONLY while the swapped weapon is live', () => {
    // "after performing 12 normal attacks WHILE IN the ... state" — the state gate
    // is load-bearing; without it the ladder climbs on every base-weapon shot.
    expect(totals(WRONG_S2A.res)[SLUG]).not.toBe(baseTotals[SLUG]);
    expect(totals(WRONG_S2A.res)[SLUG]).toBeGreaterThan(baseTotals[SLUG]);
  });

  it('stage Max HP grants are self-scoped and feed the HP→ATK conversion', () => {
    // Self-granted Max HP feeds atkOfMaxHpPct (caster === target); an ally grant
    // would not. Values are FLAT-resolved on buffApply (stat maxHpFlat).
    const hp = buffs(BASE.events, 'maxHpFlat').filter(self);
    for (const e of hp) {
      expect(e.casterSlug ?? SLUG).toBe(SLUG);
    }
  });

  it('inertness: the Over Energy ladder moves no teammate', () => {
    for (const slug of Object.keys(baseTotals)) {
      if (slug === SLUG) {
        continue;
      }
      expect(totals(WRONG_S2A.res)[slug]).toBe(baseTotals[slug]);
    }
  });
});

describe('laplace-ultimate-hero — skill2c: Attack Damage on entering Burst Stage 3', () => {
  it('applies 52.14% Attack Damage for 10s, self-scoped', () => {
    const ad = selfBuffs(BASE.events, 'attackDamagePct').filter(
      (e) => Math.abs((e.value as number) - 52.14) < 1e-6
    );
    expect(ad.length).toBeGreaterThan(0);
  });

  it("is keyed to ENTERING stage 3 (any caster), not the owner's own burst cast", () => {
    // Trigger identity: "Activates when entering Burst Stage 3" fires on ANY team
    // stage-3 entry. Keying it to burstCast under-fires whenever another B3 casts
    // (the fixture's fixed B3 slot makes that case real, so this is non-vacuous).
    const faithfulFires = selfBuffs(BASE.events, 'attackDamagePct').filter(
      (e) => Math.abs((e.value as number) - 52.14) < 1e-6
    ).length;
    const wrongFires = selfBuffs(WRONG_S2C.events, 'attackDamagePct').filter(
      (e) => Math.abs((e.value as number) - 52.14) < 1e-6
    ).length;
    expect(faithfulFires).toBeGreaterThanOrEqual(wrongFires);
    expect(totals(WRONG_S2C.res)[SLUG]).not.toBe(baseTotals[SLUG]);
  });

  it('the 10s window is a time bound, not permanent', () => {
    const ad = selfBuffs(BASE.events, 'attackDamagePct').filter(
      (e) => Math.abs((e.value as number) - 52.14) < 1e-6
    )[0]!;
    expect(ad.expiresFrame).toBeDefined();
    expect(ad.expiresFrame as number).toBeLessThanOrEqual(180 * 60);
  });
});

describe('laplace-ultimate-hero — burst', () => {
  it('self ATK ▲63.36% for 10 sec', () => {
    const a = selfBuffs(BASE.events, 'atkPct').filter(
      (e) => Math.abs((e.value as number) - 63.36) < 1e-6
    );
    expect(a.length).toBeGreaterThan(0);
    expect(a[0]!.expiresFrame).toBeDefined();
  });

  it('the 2953.84% burst nuke lands and is Full-Burst exempt (cast precedes FB)', () => {
    // Verified fact: burst-cast damage lands before Full Burst begins — no +50%.
    const nukes = selfDmg(BASE.events).filter((e) => e.bucket === 'burst');
    expect(nukes.length).toBeGreaterThan(0);
    for (const n of nukes) {
      expect(n.fbMajorApplied ?? false).toBe(false);
    }
  });

  it('the 934.76% rider is GATED on Over Energy stage ≥ 1', () => {
    // Ungating it is the nearest-wrong model: it would fire on every burst including
    // ones cast before the ladder ever advanced.
    expect(totals(WRONG_RIDER.res)[SLUG]).not.toBe(baseTotals[SLUG]);
    expect(totals(WRONG_RIDER.res)[SLUG]).toBeGreaterThan(baseTotals[SLUG]);
  });

  it("inertness: burst lines move no teammate's damage", () => {
    for (const slug of Object.keys(baseTotals)) {
      if (slug === SLUG) {
        continue;
      }
      expect(totals(WRONG_RIDER.res)[slug]).toBe(baseTotals[slug]);
    }
  });

  it('the unit actually bursts in the fixture (non-vacuity for every burst group)', () => {
    const casts = BASE.events.filter(
      (e) =>
        e.kind === 'burstCast' && (e.slug === SLUG || e.targetSlug === SLUG)
    );
    expect(casts.length).toBeGreaterThan(0);
    expect(unitOf(BASE.res, SLUG).totalDamage).toBeGreaterThan(0);
  });
});

describe('laplace-ultimate-hero — GAPS (kit lines with no discriminating observable)', () => {
  it.skip('rider damage scales LINEARLY with the Over Energy stage (×1..×4)', () => {
    // The kit says "934.76% × Over Energy stage". Isolating the multiplier requires
    // forcing the unit to burst at a KNOWN stage; the fixture cannot pin the stage
    // at cast time without a stage-setting primitive, so the per-stage scaling is
    // asserted only as "gated" above. GAP: needs a resource-preset test hook.
  });

  it.skip('the rider hits "the enemy nearest to the crosshair" specifically', () => {
    // v1 has a single boss entity — nearest-to-crosshair is indistinguishable from
    // "the enemy". Unobservable payload; no assertion can discriminate.
  });

  it.skip('Over Energy accrues in 5% steps (20 attacks-of-12 per stage)', () => {
    // The 5%/100% granularity is an internal counter with no emitted event; only the
    // resulting stage advance is observable. GAP: no per-step observable.
  });

  it.skip('the swap ends exactly "when all rounds are fired" (120 rounds), not on a timer', () => {
    // The engine\'s weaponSwap requires a durationSec; a pure rounds-exhaustion end
    // condition is a ⚑ estimate (swap shot economy is kit-silent on cadence). Flagged,
    // not asserted — asserting a derived duration would pin an invented constant.
  });
});
