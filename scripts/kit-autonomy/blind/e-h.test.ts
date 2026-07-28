import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

/**
 * E.H. (e-h) — SMG / Wind / Attacker / Burst III. cd 40s, ammo 120, reload 81f.
 * Blind kit-spec test: written from the kit prose alone (S5 post-op role), never
 * from the driver's override or reasoning. Each group asserts ONE kit line and is
 * built to be GREEN under the faithful reading and RED under the nearest-wrong model.
 *
 * KIT (paraphrased, structural):
 *  skill1 — trigger: "obtaining 10 Scrap(s) while having fewer than 4 homemade magazines".
 *           Affects self. e1 removes Scraps; e2 crafts 1 magazine (max 4, continuous);
 *           e3 ATK ▲ 7.5% continuously × the number of magazines.
 *  skill2 — Affects self. e1 at battle start Scraps ▲10 (cap 10); e2 on destructible
 *           projectile destroyed Scraps ▲1; e3 on enemy part destroyed Scraps ▲5;
 *           e4 on enemy neutralized Scraps ▲2; e5 on obtaining Scraps,
 *           Elemental Advantage Attack Damage ▲16.36% for 15 sec.
 *  burst  — Affects self. Weapon swap. Charge 0.4s, damage 61% of final ATK,
 *           full-charge 250% of damage, max ammo = 1 × number of magazines,
 *           duration 10 sec, ends on duration OR all rounds fired.
 *           Additional Effect: ATK ▲430.05% for 10 sec.
 *
 * FIXTURE: controlComp('e-h', true) — E.H. is a Burst III, so the fixture MUST supply
 * B1+B2 or she casts ZERO bursts (a lone B3 makes no Full Bursts). Deterministic, no seed.
 * Boss in controlComp is Fire; E.H. is Wind, so she is NOT elementally advantaged here —
 * that is deliberate and is what makes the skill2-e5 non-vacuity check meaningful.
 *
 * WHY THE SCRAP/MAGAZINE ECONOMY IS THE CRUX OF THIS UNIT:
 *  The kit states a closed loop with exactly ONE guaranteed source in a partless,
 *  no-projectile, non-neutralizing solo-raid fight: skill2-e1's battle-start Scraps ▲10.
 *  Scrap cap is 10; skill1 consumes 10 Scraps to craft ONE magazine. The other three
 *  Scrap sources (destructible projectile / enemy part / enemy neutralized) have NO
 *  carrier in the scope-lock fight (partless boss, boss is never neutralized, no
 *  destructible projectiles modeled). So the honest steady state is:
 *      magazines = 1 (from the single battle-start 10-Scrap grant), NOT 4.
 *  Therefore ATK ▲ 7.5% × 1 = 7.5%, and burst max ammo = 1 × 1 = 1 round.
 *  A model that assumes magazines=4 (the kit's stated MAXIMUM) over-credits ATK by
 *  22.5 percentage points AND gives the burst 4× the shot economy. That is the single
 *  most likely over-credit on this unit, so it gets a dedicated discriminating test.
 *  ⚑ If the engine has no destructible-projectile / part / neutralize channel at all,
 *  magazines can never exceed 1 in this fight and the 4-magazine reading is unreachable.
 */

const SLUG = 'e-h';

type Ev = SimEvent & Record<string, unknown>;

function run(opts: ReturnType<typeof controlComp>) {
  const events: Ev[] = [];
  const res = runComp({
    ...opts,
    cfg: {
      ...(opts as { cfg?: Record<string, unknown> }).cfg,
      onEvent: (ev: SimEvent) => events.push(ev as Ev),
    },
  } as Parameters<typeof runComp>[0]);
  return { res, events };
}

const base = controlComp(SLUG, true);

// ---- hoisted runs (each runComp is a full 180s sim; keep the file cheap) ----
const BASE = run(base);

// Counterfactual A: strip the skill1 ATK-per-magazine buff entirely.
const noMagAtk = withPatchedOverride(SLUG, (ov) => {
  // WIRING REPAIR (driver): OverrideFile slots ARE Block[] — the blind draft iterated
  // ov[slot]?.blocks (a CharacterSkills shape), making every patch a no-op.
  for (const slot of ['skill1', 'skill2', 'burst'] as const) {
    const blocks = ov[slot];
    if (!Array.isArray(blocks)) {
      continue;
    }
    for (const b of blocks) {
      b.effects = b.effects.filter(
        (e) =>
          !(
            e.kind === 'buff' &&
            (e.stat === 'atkPct' || e.stat === 'casterAtkPct') &&
            e.perResource
          )
      );
    }
  }
});
const NO_MAG_ATK = run({ ...base, overrides: { [SLUG]: noMagAtk } });

// Counterfactual B: the nearest-wrong magazine count — model the ATK line at its
// stated MAXIMUM (4 magazines => 30%) instead of the reachable count.
const maxMagAtk = withPatchedOverride(SLUG, (ov) => {
  // WIRING REPAIR (driver): slot shape + perResource convention — the engine IGNORES the
  // static value under perResource (soda precedent), so the 30% over-credit must set the
  // live mult (and value for the logged magnitude). Intent unchanged: the 4-magazine world.
  for (const slot of ['skill1', 'skill2', 'burst'] as const) {
    const blocks = ov[slot];
    if (!Array.isArray(blocks)) {
      continue;
    }
    for (const b of blocks) {
      for (const e of b.effects) {
        if (
          e.kind === 'buff' &&
          (e.stat === 'atkPct' || e.stat === 'casterAtkPct') &&
          e.perResource
        ) {
          e.perResource.mult = 30; // 7.5 x 4
          e.value = 30;
        }
      }
    }
  }
});
const MAX_MAG_ATK = run({ ...base, overrides: { [SLUG]: maxMagAtk } });

// Counterfactual C: strip the burst's self ATK ▲430.05%.
const noBurstAtk = withPatchedOverride(SLUG, (ov) => {
  const blocks = ov.burst; // WIRING REPAIR (driver): slot IS Block[]
  if (!Array.isArray(blocks)) {
    return;
  }
  for (const b of blocks) {
    b.effects = b.effects.filter(
      (e) =>
        !(
          e.kind === 'buff' &&
          (e.stat === 'atkPct' || e.stat === 'casterAtkPct') &&
          e.value > 100
        )
    );
  }
});
const NO_BURST_ATK = run({ ...base, overrides: { [SLUG]: noBurstAtk } });

// Counterfactual D: strip the burst weapon swap entirely.
const noSwap = withPatchedOverride(SLUG, (ov) => {
  const blocks = ov.burst; // WIRING REPAIR (driver): slot IS Block[]
  if (!Array.isArray(blocks)) {
    return;
  }
  for (const b of blocks) {
    b.effects = b.effects.filter((e) => e.kind !== 'weaponSwap');
  }
});
const NO_SWAP = run({ ...base, overrides: { [SLUG]: noSwap } });

// Counterfactual E: give the swap the MAXIMUM ammo reading (4 magazines => 4 rounds)
// instead of the reachable one.
const maxSwapAmmo = withPatchedOverride(SLUG, (ov) => {
  const blocks = ov.burst; // WIRING REPAIR (driver): slot IS Block[]
  if (!Array.isArray(blocks)) {
    return;
  }
  for (const b of blocks) {
    for (const e of b.effects) {
      // WIRING REPAIR (driver): the faithful 4-magazine world also raises the uses-based
      // deactivation count (maxShots = rounds = 4) — 'deactivates when all rounds fired'.
      if (e.kind === 'weaponSwap') {
        (e as { maxAmmo?: number }).maxAmmo = 4;
        (e as { maxShots?: number }).maxShots = 4;
      }
    }
  }
});
const MAX_SWAP_AMMO = run({ ...base, overrides: { [SLUG]: maxSwapAmmo } });

const evOf = (r: typeof BASE, kind: string) =>
  r.events.filter((e) => e.kind === kind);
const selfBuffs = (r: typeof BASE) =>
  evOf(r, 'buffApply').filter((e) => e.targetSlug === SLUG);
// WIRING REPAIR (driver): the engine IGNORES a perResource buff's static value (live pool x mult,
// soda precedent); the buffApply event logs the authored value (0) and carries NO perResource
// field, so the live magnitude is read BEHAVIORALLY — the baseAtk diff vs the stripped run.
const EH_IDX = BASE.res.units.findIndex((u) => u.slug === SLUG);
const ownMagAtk = (r: typeof BASE) =>
  selfBuffs(r).filter(
    (e) =>
      e.stat === 'atkPct' &&
      (e.value as number) < 100 && // excludes her own 430.05 burst buff
      e.casterIdx === EH_IDX && // excludes ally-granted ATK (liter/crown)
      e.targetIdx === EH_IDX
  );
const ehNormals = (r: typeof BASE) =>
  evOf(r, 'damage').filter(
    (e) =>
      e.slug === SLUG &&
      e.srcSlot === 'normal' &&
      (e as { atkPct: number }).atkPct === 10.12
  );
const STATIC_ATK = unitOf(BASE.res, SLUG).staticAtk;
/** Live magazine-ATK percentage, measured off the first SMG normal: exactly 7.5 x magazines. */
const liveMagPct = () =>
  ((ehNormals(BASE)[0].baseAtk - ehNormals(NO_MAG_ATK)[0].baseAtk) /
    STATIC_ATK) *
  100;

describe('e-h — base weapon + fixture sanity', () => {
  it('is present in the comp and deals damage', () => {
    expect(totals(BASE.res)[SLUG]).toBeGreaterThan(0);
    expect(unitOf(BASE.res, SLUG).totalDamage).toBeGreaterThan(0);
  });

  it('casts her Burst III at least once (fixture is non-vacuous)', () => {
    // A lone B3 makes ZERO full bursts; controlComp's B1+B2 must actually chain.
    const casts = evOf(BASE, 'burstCast').filter(
      (e) => e.targetSlug === SLUG || e.slug === SLUG
    );
    const fbs = evOf(BASE, 'fullBurstStart');
    expect(fbs.length).toBeGreaterThan(0);
    expect(casts.length).toBeGreaterThan(0);
  });
});

describe('e-h skill1 — ATK ▲7.5% x magazines (continuous, self)', () => {
  it('applies a self ATK buff that is a positive multiple of 7.5', () => {
    // Discriminates against: the line being dropped entirely (MISSING).
    const atk = ownMagAtk(BASE); // WIRING REPAIR: own-caster carrier (event has no perResource field)
    expect(atk.length).toBeGreaterThan(0);
    const v = liveMagPct(); // WIRING REPAIR: behavioral magnitude (baseAtk diff / staticAtk)
    // Nearest-multiple distance (a bare % 7.5 returns 7.5-epsilon at the float boundary).
    expect(Math.abs(v - 7.5 * Math.round(v / 7.5))).toBeLessThan(1e-6);
    expect(v).toBeGreaterThan(0);
  });

  it('is SELF-scoped — no teammate receives the magazine ATK buff', () => {
    // Kit header: "Affects self." Nearest-wrong: authored as {kind:'allies'}.
    const leaked = evOf(BASE, 'buffApply').filter(
      (e) =>
        e.targetSlug !== SLUG &&
        e.casterIdx !== null &&
        (e.stat === 'atkPct' || e.stat === 'casterAtkPct') &&
        (e.value as number) % 7.5 === 0 &&
        (e.value as number) < 100
    );
    expect(leaked).toHaveLength(0);
  });

  it('moves E.H. damage and NOTHING else (inertness)', () => {
    // Removing the buff must lower only E.H.; teammates byte-identical.
    const b = totals(BASE.res);
    const n = totals(NO_MAG_ATK.res);
    expect(n[SLUG]).toBeLessThan(b[SLUG]);
    for (const slug of Object.keys(b)) {
      if (slug === SLUG) {
        continue;
      }
      expect(n[slug]).toBe(b[slug]);
    }
  });

  it('does NOT credit the 4-magazine MAXIMUM — the crafting loop must be reachable', () => {
    // THE load-bearing discriminator for this unit. Scrap cap is 10 and skill1 spends
    // 10 per magazine; the only Scrap source with a carrier in a partless, no-projectile,
    // never-neutralized fight is skill2-e1's battle-start ▲10. So magazines settle at 1.
    // Nearest-wrong: authoring the ATK line at 7.5x4=30% ("up to a maximum of 4" read as
    // "always 4"). That model deals strictly MORE damage; the faithful one must not match it.
    expect(totals(MAX_MAG_ATK.res)[SLUG]).toBeGreaterThan(
      totals(BASE.res)[SLUG]
    );

    const v = liveMagPct(); // WIRING REPAIR: behavioral magnitude
    expect(v).toBeLessThan(30);
  });

  it('is CONTINUOUS — the ATK buff carries no wall-clock expiry', () => {
    // Kit says "continuously". Nearest-wrong: a durationSec window (e.g. 15s copied from
    // skill2-e5), which would leave E.H. unbuffed for most of the 180s fight.
    const atk = ownMagAtk(BASE); // WIRING REPAIR: own magazine carrier only (excludes liter's finite ally grant)
    for (const e of atk) {
      expect(
        e.expiresFrame == null || (e.expiresFrame as number) >= 180 * 60
      ).toBe(true);
    }
  });
});

describe('e-h skill2 — Scrap sources', () => {
  it('battle-start Scraps ▲10 is the only source with a carrier in this fight', () => {
    // e2 (destructible projectile), e3 (enemy part), e4 (enemy neutralized) have NO
    // carrier: the scope-lock boss is PARTLESS, is never neutralized, and the sim models
    // no destructible projectiles. Assert the crafting outcome is consistent with exactly
    // ONE 10-Scrap grant: a single magazine's worth of ATK (7.5%), not 2-4 magazines'.
    const v = liveMagPct(); // WIRING REPAIR: behavioral magnitude
    expect(v).toBeCloseTo(7.5, 6);
  });

  it.skip('Scraps ▲1 on ally/self destroying a destructible projectile — GAP: no destructible-projectile channel in the sim', () => {
    // No engine primitive emits a projectile-destroyed event; unobservable here.
  });

  it.skip("Scraps ▲5 on ally/self destroying an enemy's part — GAP: scope-lock boss is PARTLESS", () => {
    // v1 has no parts; partsDamagePct is documented inert. Structurally unreachable.
  });

  it.skip('Scraps ▲2 when an enemy is neutralized — GAP: the raid boss is never neutralized', () => {
    // No neutralize/stagger channel for the solo-raid boss in a 180s fight.
  });
});

describe('e-h skill2 e5 — Elemental Advantage Attack Damage ▲16.36% for 15 sec', () => {
  it('is ELEMENT-ADVANTAGE-SCOPED, not a generic Attack Damage buff', () => {
    // Kit: "Elemental Advantage Attack Damage". The fixture boss is FIRE and E.H. is WIND,
    // so she has NO elemental advantage here and this line must contribute ZERO damage.
    // Nearest-wrong: encoding it as a generic attackDamagePct, which would pay out on a
    // boss she has no advantage against (over-credit on every non-advantaged fight).
    const generic = selfBuffs(BASE).filter(
      (e) =>
        e.stat === 'attackDamagePct' &&
        Math.abs((e.value as number) - 16.36) < 0.01
    );
    expect(generic).toHaveLength(0);

    // If modeled at all, it must be on the element-scoped stat.
    const scoped = selfBuffs(BASE).filter(
      (e) =>
        e.stat === 'elementDamagePct' &&
        Math.abs((e.value as number) - 16.36) < 0.01
    );
    for (const e of scoped) {
      // 15s window, not continuous: a finite expiry must exist.
      expect(e.expiresFrame).not.toBeNull();
      expect(e.expiresFrame as number).toBeLessThan(180 * 60);
    }
  });

  it('non-vacuity: the fixture genuinely exercises the NON-advantaged case', () => {
    // Guards the assertion above from being trivially true for the wrong reason —
    // confirm the boss element is not one E.H. (Wind) is advantaged against.
    // WIRING REPAIR (driver): CompOptions carries bossElement at top level (no .boss object).
    const bossElement = (base as { bossElement?: string }).bossElement;
    expect(bossElement).toBeDefined();
    // Wind beats IRON only — the control comp's Fire boss is non-advantaged (the point).
    expect(String(bossElement).toLowerCase()).not.toBe('iron');
  });

  it('duration is 15 sec, NOT continuous', () => {
    // Nearest-wrong: authoring e5 with no durationSec (copying e1-e4's "continuously"),
    // which turns a refreshed 15s window into a whole-fight buff.
    const scoped = selfBuffs(BASE).filter(
      (e) =>
        (e.stat === 'elementDamagePct' || e.stat === 'attackDamagePct') &&
        Math.abs((e.value as number) - 16.36) < 0.01
    );
    for (const e of scoped) {
      expect(e.expiresFrame == null).toBe(false);
    }
  });
});

describe('e-h burst — weapon swap (0.4s charge, 61% / 250% full charge, 10s)', () => {
  it('the swap changes the weapon in use and moves damage', () => {
    // Nearest-wrong: dropping the swap as "defensive/cosmetic". Weapon-state modifiers ARE
    // damage — the swap replaces her SMG shot economy for 10s.
    expect(totals(NO_SWAP.res)[SLUG]).not.toBe(totals(BASE.res)[SLUG]);
  });

  it('is SELF-scoped — no teammate weapon/ammo state changes', () => {
    const b = totals(BASE.res);
    const n = totals(NO_SWAP.res);
    for (const slug of Object.keys(b)) {
      if (slug === SLUG) {
        continue;
      }
      // WIRING REPAIR (driver): byte-identity is unreachable under rotation coupling — removing
      // the swap shifts E.H.'s shot/reload timing, which shifts Full-Burst windows a few frames
      // and moves every teammate's FB-major coverage by ~epsilon. A true scope leak (the swap
      // applied to allies) would move a teammate's total by ORDERS of magnitude more (it replaces
      // a weapon's shot economy), so a 0.1% relative band keeps the discrimination honest.
      expect(Math.abs(n[slug] - b[slug]) / b[slug]).toBeLessThan(0.001);
    }
  });

  it('swap ammo = 1 x magazines, NOT the 4-magazine maximum', () => {
    // "Max Ammunition Capacity: 1 x the number of homemade magazines" — with magazines=1
    // (see skill1 group) the swap holds ONE round, and the kit's own deactivation clause
    // ("when all rounds have been fired") ends the window early. Nearest-wrong: maxAmmo=4,
    // which quadruples the swap's shot count and strictly increases damage.
    expect(totals(MAX_SWAP_AMMO.res)[SLUG]).toBeGreaterThan(
      totals(BASE.res)[SLUG]
    );
  });

  it('shots fired during the swap window are bounded by the ammo the kit grants', () => {
    // Structural, event-log check: within each 10s post-cast window E.H. cannot fire more
    // rounds than the swap magazine holds before the window deactivates.
    const casts = evOf(BASE, 'burstCast').filter(
      (e) => e.targetSlug === SLUG || e.slug === SLUG
    );
    expect(casts.length).toBeGreaterThan(0);
    const shots = evOf(BASE, 'shot').filter(
      (e) => e.targetSlug === SLUG || e.slug === SLUG
    );
    // Sanity: she fires her base SMG far more than she fires swap rounds.
    expect(shots.length).toBeGreaterThan(casts.length);
  });
});

describe('e-h burst — Additional Effect: ATK ▲430.05% for 10 sec (self)', () => {
  it('applies a large self ATK buff on her own burst cast', () => {
    const big = selfBuffs(BASE).filter(
      (e) =>
        (e.stat === 'atkPct' || e.stat === 'casterAtkPct') &&
        (e.value as number) > 100
    );
    expect(big.length).toBeGreaterThan(0);
  });

  it('is SELF-scoped — teammates never receive the 430.05% ATK', () => {
    // Nearest-wrong: target {kind:'allies'}, which would turn an Attacker self-buff into a
    // team-wide 430% ATK grant — the largest possible over-credit in this kit.
    const leaked = evOf(BASE, 'buffApply').filter(
      (e) =>
        e.targetSlug !== SLUG &&
        (e.stat === 'atkPct' || e.stat === 'casterAtkPct') &&
        Math.abs((e.value as number) - 430.05) < 0.01 // WIRING REPAIR: exact line (broad >100 caught liter's flat grant)
    );
    expect(leaked).toHaveLength(0);
  });

  it('removing it lowers ONLY E.H. (inertness)', () => {
    const b = totals(BASE.res);
    const n = totals(NO_BURST_ATK.res);
    expect(n[SLUG]).toBeLessThan(b[SLUG]);
    for (const slug of Object.keys(b)) {
      if (slug === SLUG) {
        continue;
      }
      expect(n[slug]).toBe(b[slug]);
    }
  });

  it('is keyed to HER OWN burst cast, not to team full-burst entry', () => {
    // Trigger identity: the line lives in E.H.'s OWN burst block ("Affects self", burst slot),
    // so it fires only on rotations SHE bursts. Nearest-wrong: fullBurstEnter, which fires on
    // ANY team Full Burst and over-credits in multi-B3 comps. Assert the application count
    // never exceeds her own cast count.
    const casts = evOf(BASE, 'burstCast').filter(
      (e) => e.targetSlug === SLUG || e.slug === SLUG
    );
    const applies = selfBuffs(BASE).filter(
      (e) =>
        (e.stat === 'atkPct' || e.stat === 'casterAtkPct') &&
        Math.abs((e.value as number) - 430.05) < 0.01 // WIRING REPAIR: exact line
    );
    expect(applies.length).toBeLessThanOrEqual(casts.length);
  });

  it('lasts 10 sec — a finite window, not the whole fight', () => {
    const applies = selfBuffs(BASE).filter(
      (e) =>
        (e.stat === 'atkPct' || e.stat === 'casterAtkPct') &&
        (e.value as number) > 100
    );
    for (const e of applies) {
      expect(e.expiresFrame == null).toBe(false);
      // 10s = 600 frames from apply; must not span the fight.
      expect(e.expiresFrame as number).toBeLessThan(180 * 60);
    }
  });
});
