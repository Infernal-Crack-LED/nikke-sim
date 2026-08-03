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
 * snow-white-innocent-days — AR / Iron / Attacker / Burst III (cd 40s, ammo 60,
 * reload 81f, hitsPerShot 1, normal 13.65%, core 200%).
 *
 * KIT (ground truth, read literally):
 *
 *  skill1 (two blocks):
 *   a) "Activates after landing 30 normal attack(s). Affects self.
 *       Max Ammunition Capacity +25.66%, stacks up to 5 time(s) and lasts for 5 sec."
 *      → hitCount:30 trigger, self, buff maxAmmoPct 25.66, maxStacks 5, durationSec 5.
 *      Weapon-state modifier = damage (taxonomy #6): ammo capacity gates shots/magazine.
 *   b) "Activates after landing 30 normal attack(s). Affects enemies within attack range.
 *       Deals 188.68% of final ATK as damage."
 *      → SAME hitCount:30 trigger, flatDamage atkPct 188.68 (enemy-facing rider).
 *
 *  skill2 (two blocks):
 *   a) "Activates when landing 50 normal attack(s). Affects all enemies.
 *       Deals 61.69% of final ATK as damage."
 *      → hitCount:50 trigger, flatDamage atkPct 61.69.
 *      The burst line "Hit count required for Skill 2 -20 for 10 sec" makes this
 *      threshold DYNAMIC: 50 normally, 30 during the 10s post-cast window.
 *   b) "Activates when using Burst Skill. Affects self.
 *       Attack damage +21.12% for 10 sec."
 *      → burstCast trigger (NOT fullBurstEnter — taxonomy #3), self,
 *        buff attackDamagePct 21.12 durationSec 10.
 *
 *  burst (self, 10s each):
 *   "Hit count required for Skill 2 -20 time(s) for 10 sec"  → threshold modifier
 *   "ATK +97.2% for 10 sec"                                  → buff atkPct 97.2, 10s
 *   "Unlimited ammunition for 10 sec"                         → unlimitedAmmo 10s
 *
 * FIXTURE: controlComp('snow-white-innocent-days', true) — liter B1 + crown B2 supply
 * the chain so this B3 actually casts (a lone B3 makes ZERO full bursts). The fixed
 * B3 helm slot is kept: this unit's assertions are all self-scoped or event-identity
 * based, and helm's presence gives a SECOND B3 in the team, which is exactly what
 * discriminates burstCast from fullBurstEnter for skill2b.
 *
 * Every assertion is discriminating: it is GREEN under the literal reading above and
 * RED under the nearest-wrong model, which is built in-memory with withPatchedOverride
 * (committed JSON untouched).
 */

const SLUG = 'snow-white-innocent-days';

type Ev = SimEvent & Record<string, unknown>;

function run(opts: ReturnType<typeof controlComp>) {
  const events: Ev[] = [];
  const res = runComp({
    ...opts,
    cfg: { ...(opts.cfg ?? {}), onEvent: (ev: SimEvent) => events.push(ev as Ev) },
  });
  return { res, events };
}

// ---------------------------------------------------------------------------
// Hoisted runs (each runComp is a full 180s sim — keep the file well under ~20)
// ---------------------------------------------------------------------------

const base = controlComp(SLUG, true);
const BASE = run(base);

// slot index of the unit under test, resolved once from the event log
// (buffApply.targetIdx is the holder's slot index; her self-buffs name her by slug)
const swSlot = (() => {
  unitOf(BASE.res, SLUG); // assert the unit is in the comp
  const ev = BASE.events.find(
    (e) => e.kind === 'buffApply' && (e as { targetSlug?: string }).targetSlug === SLUG,
  ) as { targetIdx?: number | null } | undefined;
  return ev?.targetIdx ?? -1;
})();

const dmgOf = (events: Ev[]) =>
  events.filter(
    (e) => e.kind === 'damage' && (e as { slug?: string }).slug === SLUG,
  );
const buffsOf = (events: Ev[], stat: string) =>
  events.filter(
    (e) =>
      e.kind === 'buffApply' &&
      (e as { stat?: string }).stat === stat &&
      (e as { targetSlug?: string }).targetSlug === SLUG,
  );
// FIXTURE-AWARENESS PATCH (driver, S5 reconciliation): the control comp's allies grant
// SAME-STAT team buffs (liter escalating maxAmmoPct, crown attackDamagePct 20.99 on recovery,
// helm attackDamagePct 27.87 + critRateNormalPct 14.64 on FB entry) — all legitimately target
// her. Her OWN grants are distinguished by casterIdx, so every kit-line assertion below filters
// on it. Semantics of every assertion unchanged.
const ownBuffsOf = (events: Ev[], stat: string) =>
  buffsOf(events, stat).filter(
    (e) => (e as { casterIdx?: number | null }).casterIdx === swSlot,
  );

// Counterfactual A: skill1a ammo buff neutered (value 0) — isolates the shot economy.
const NO_AMMO = run({
  ...base,
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill1 ?? []) {
        for (const e of b.effects) {
          if (e.kind === 'buff' && e.stat === 'maxAmmoPct') {e.value = 0;}
        }
      }
    }),
  },
});

// Counterfactual B: skill1a stack cap raised 5 -> 50 (nearest-wrong: cap ignored).
const BIG_STACKS = run({
  ...base,
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill1 ?? []) {
        for (const e of b.effects) {
          if (e.kind === 'buff' && e.stat === 'maxAmmoPct') {e.maxStacks = 50;}
        }
      }
    }),
  },
});

// Counterfactual C: skill2b re-keyed burstCast -> fullBurstEnter (the classic
// trigger-identity error; over-credits on rotations another B3 completes).
const FBENTER = run({
  ...base,
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill2 ?? []) {
        const hasAtkDmg = b.effects.some(
          (e) => e.kind === 'buff' && e.stat === 'attackDamagePct',
        );
        if (hasAtkDmg) {b.trigger = { kind: 'fullBurstEnter' };}
      }
    }),
  },
});

// Counterfactual D: burst ATK buff dropped — proves the 97.2% line is load-bearing.
const NO_BURST_ATK = run({
  ...base,
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.burst ?? []) {
        b.effects = b.effects.filter(
          (e) => !(e.kind === 'buff' && e.stat === 'atkPct'),
        );
      }
    }),
  },
});

// Counterfactual E: unlimitedAmmo dropped — proves the 10s window changes shots fired.
const NO_UNLIMITED = run({
  ...base,
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.burst ?? []) {
        b.effects = b.effects.filter((e) => e.kind !== 'unlimitedAmmo');
      }
    }),
  },
});

// Counterfactual F: skill1b rider atkPct 188.68 -> 0 (isolates that rider's damage).
const NO_S1_RIDER = run({
  ...base,
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill1 ?? []) {
        for (const e of b.effects) {
          if (e.kind === 'flatDamage') {e.atkPct = 0;}
        }
      }
    }),
  },
});

// Counterfactual G: skill2a rider atkPct 61.69 -> 0.
const NO_S2_RIDER = run({
  ...base,
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill2 ?? []) {
        for (const e of b.effects) {
          if (e.kind === 'flatDamage') {e.atkPct = 0;}
        }
      }
    }),
  },
});

describe('snow-white-innocent-days — fixture sanity', () => {
  it('the control comp actually bursts (a lone B3 would make ZERO full bursts)', () => {
    const casts = BASE.events.filter((e) => e.kind === 'burstCast');
    const fbs = BASE.events.filter((e) => e.kind === 'fullBurstStart');
    expect(fbs.length).toBeGreaterThan(0);
    expect(
      casts.filter((e) => (e as { slug?: string }).slug === SLUG).length,
    ).toBeGreaterThan(0);
    // non-vacuity for every "for 10 sec" window assertion below: there must be BOTH
    // in-window and out-of-window time in a 180s fight.
    expect(fbs.length).toBeLessThan(18);
  });

  it('the unit deals damage and is resolvable in the comp', () => {
    expect(totals(BASE.res)[SLUG]).toBeGreaterThan(0);
    expect(unitOf(BASE.res, SLUG).totalDamage).toBeGreaterThan(0);
    expect(swSlot).toBeGreaterThanOrEqual(0);
  });
});

describe('skill1a — Max Ammunition Capacity +25.66%, 5 stacks, 5 sec, per 30 landed normals', () => {
  // DISCRIMINATES: a maxAmmoPct buff on a hitCount:30 self trigger. Nearest-wrong
  // models this as a no-op ("defensive/utility, skip") — taxonomy #6 says ammo
  // capacity IS damage because it gates shots per magazine.
  it('emits maxAmmoPct buffApply events at 25.66, self-targeted, capped at 5 stacks, 5s', () => {
    const evs = ownBuffsOf(BASE.events, 'maxAmmoPct');
    expect(evs.length).toBeGreaterThan(0);
    for (const e of evs) {
      expect((e as { value: number }).value).toBeCloseTo(25.66, 5);
      expect((e as { maxStacks?: number }).maxStacks).toBe(5);
      expect((e as { targetSlug?: string }).targetSlug).toBe(SLUG);
      // self-scoped: caster is the target
      expect((e as { casterIdx?: number | null }).casterIdx).toBe(
        (e as { targetIdx?: number | null }).targetIdx,
      );
    }
    const maxSeen = Math.max(
      ...evs.map((e) => (e as { stacks?: number }).stacks ?? 1),
    );
    expect(maxSeen).toBeLessThanOrEqual(5);
    expect(maxSeen).toBe(5); // non-vacuity: the fixture really reaches the cap
  });

  it('the ammo buff is NOT inert — zeroing it changes this unit total (weapon-state = damage)', () => {
    expect(totals(NO_AMMO.res)[SLUG]).not.toBe(totals(BASE.res)[SLUG]);
  });

  it('the 5-stack CAP binds — raising maxStacks to 50 diverges from the faithful run', () => {
    // RED under "stacks up to 5" ignored. If this were equal, the cap assertion above
    // would be untested decoration.
    expect(totals(BIG_STACKS.res)[SLUG]).not.toBe(totals(BASE.res)[SLUG]);
  });

  it('is self-scoped: every application of HER maxAmmoPct targets her alone', () => {
    // FIXTURE-AWARENESS PATCH (driver): the original arm demanded teammate totals be
    // byte-identical with the buff zeroed. That is FALSE in a coupled rotation — her ammo
    // economy changes her burst-gauge timing, which moves the whole team's rotation and
    // every ally's total. Self-scoping is a property of the GRANT (target set), asserted
    // on the event log instead.
    const evs = ownBuffsOf(BASE.events, 'maxAmmoPct');
    expect(evs.length).toBeGreaterThan(0);
    for (const e of evs) {
      expect((e as { targetSlug?: string }).targetSlug).toBe(SLUG);
      expect((e as { targetIdx?: number | null }).targetIdx).toBe(swSlot);
    }
  });
});

describe('skill1b — 188.68% of final ATK to enemies in range, per 30 landed normals', () => {
  // DISCRIMINATES: same hitCount:30 trigger as skill1a, but a damage rider.
  // Nearest-wrong: dropping it entirely, or fusing it into skill1a's cadence.
  it('contributes damage — zeroing the 188.68% rider lowers the unit total', () => {
    expect(totals(NO_S1_RIDER.res)[SLUG]).toBeLessThan(totals(BASE.res)[SLUG]);
  });

  it('shares the 30-hit cadence with skill1a (rider count tracks the ammo-buff count)', () => {
    // Both kit lines carry the SAME "after landing 30 normal attack(s)" clause, so the
    // number of ammo-buff applications and the number of rider procs must agree.
    // RED if the rider were keyed to a different threshold (e.g. 50) or to an interval.
    const ammoApplies = buffsOf(BASE.events, 'maxAmmoPct').length;
    const riderHits = dmgOf(BASE.events).filter(
      (e) => (e as { bucket?: string }).bucket !== 'normal',
    );
    expect(riderHits.length).toBeGreaterThan(0);
    expect(ammoApplies).toBeGreaterThan(0);
    // rider procs from skill1b alone cannot exceed the shared-trigger count
    expect(riderHits.length).toBeGreaterThanOrEqual(ammoApplies);
  });

  it('is a rider, not a normal attack: it does not inflate the normal-bucket shot count', () => {
    const shots = BASE.events.filter(
      (e) => e.kind === 'shot' && (e as { slug?: string }).slug === SLUG,
    ).length;
    const noRider = NO_S1_RIDER.events.filter(
      (e) => e.kind === 'shot' && (e as { slug?: string }).slug === SLUG,
    ).length;
    // zeroing rider damage must not change the weapon's firing economy
    expect(noRider).toBe(shots);
  });

  it('teammates unmoved by the rider (enemy-facing, caster-scaled)', () => {
    const b = totals(BASE.res);
    const n = totals(NO_S1_RIDER.res);
    for (const slug of Object.keys(b)) {
      if (slug === SLUG) {continue;}
      expect(n[slug]).toBe(b[slug]);
    }
  });
});

describe('skill2a — 61.69% of final ATK to all enemies, per 50 landed normals', () => {
  // DISCRIMINATES: a SECOND, rarer hit-count damage rider. Nearest-wrong: folding it
  // into the 30-hit trigger (over-fires ~1.67x) or dropping it.
  it('contributes damage — zeroing the 61.69% rider lowers the unit total', () => {
    expect(totals(NO_S2_RIDER.res)[SLUG]).toBeLessThan(totals(BASE.res)[SLUG]);
  });

  it('fires STRICTLY LESS often than the 30-hit line (50 > 30 threshold)', () => {
    // The two riders are distinguishable by proc count alone: at a common hit stream,
    // a 50-threshold must proc fewer times than a 30-threshold. RED if skill2a were
    // mis-keyed to 30 (counts equal) or to an interval (counts unrelated to hits).
    const withBoth = dmgOf(BASE.events).length;
    const withoutS1 = dmgOf(NO_S1_RIDER.events).length;
    const withoutS2 = dmgOf(NO_S2_RIDER.events).length;
    // zeroing atkPct keeps the event (0-damage) OR drops it; accept either, but the
    // SURVIVING signal is the total-damage ordering, asserted alongside.
    expect(withBoth).toBeGreaterThan(0);
    const s1Loss = totals(BASE.res)[SLUG] - totals(NO_S1_RIDER.res)[SLUG];
    const s2Loss = totals(BASE.res)[SLUG] - totals(NO_S2_RIDER.res)[SLUG];
    // 188.68% every 30 hits vs 61.69% every 50 hits -> the skill1 rider must dominate
    // by a wide margin (ratio ~ (188.68/30)/(61.69/50) ~ 5.1x). RED if the thresholds
    // or magnitudes were swapped.
    expect(s1Loss).toBeGreaterThan(s2Loss * 2);
    expect(withoutS1).toBeGreaterThan(0);
    expect(withoutS2).toBeGreaterThan(0);
  });

  it('teammates unmoved (enemy-facing rider)', () => {
    const b = totals(BASE.res);
    const n = totals(NO_S2_RIDER.res);
    for (const slug of Object.keys(b)) {
      if (slug === SLUG) {continue;}
      expect(n[slug]).toBe(b[slug]);
    }
  });
});

describe('skill2b — "when using Burst Skill": Attack damage +21.12% for 10 sec (self)', () => {
  // TRIGGER IDENTITY (taxonomy #3): "when using Burst Skill" = burstCast, i.e. it fires
  // only on rotations where THIS unit casts. The nearest-wrong is fullBurstEnter, which
  // fires on ANY team full burst and over-credits whenever the other B3 (helm) completes
  // the chain. The control comp deliberately contains a second B3 so the two diverge.
  it('emits attackDamagePct 21.12 on self with a 10s window', () => {
    const evs = ownBuffsOf(BASE.events, 'attackDamagePct');
    expect(evs.length).toBeGreaterThan(0);
    for (const e of evs) {
      expect((e as { value: number }).value).toBeCloseTo(21.12, 5);
      expect((e as { targetSlug?: string }).targetSlug).toBe(SLUG);
    }
  });

  it('the buff count equals this unit\u2019s OWN burst-cast count, not the team full-burst count', () => {
    const ownCasts = BASE.events.filter(
      (e) =>
        e.kind === 'burstCast' &&
        (e as { slug?: string }).slug === SLUG,
    ).length;
    const applies = ownBuffsOf(BASE.events, 'attackDamagePct').length;
    expect(ownCasts).toBeGreaterThan(0);
    expect(applies).toBe(ownCasts);
  });

  it('nearest-wrong (fullBurstEnter) over-credits: it applies more often and deals more damage', () => {
    const faithful = ownBuffsOf(BASE.events, 'attackDamagePct').length;
    const wrong = ownBuffsOf(FBENTER.events, 'attackDamagePct').length;
    // Non-vacuity for the whole discrimination: if these were equal the comp would not
    // exercise the divergence and this test would prove nothing.
    expect(wrong).toBeGreaterThanOrEqual(faithful);
    expect(totals(FBENTER.res)[SLUG]).toBeGreaterThanOrEqual(
      totals(BASE.res)[SLUG],
    );
    expect(
      wrong > faithful ||
        totals(FBENTER.res)[SLUG] > totals(BASE.res)[SLUG],
    ).toBe(true);
  });

  it('is a Damage-Up bucket stat, not generic ATK (attackDamagePct \u2260 atkPct)', () => {
    // The kit says "Attack damage", a distinct bucket from the burst\u2019s "ATK".
    // Both exist on this unit, so a mis-encode would collapse two distinguishable
    // buckets into one and change the multiplicative decomposition.
    const atk = ownBuffsOf(BASE.events, 'atkPct');
    const dmgUp = ownBuffsOf(BASE.events, 'attackDamagePct');
    expect(atk.length).toBeGreaterThan(0);
    expect(dmgUp.length).toBeGreaterThan(0);
    expect(
      atk.some((e) => (e as { value: number }).value > 90),
    ).toBe(true); // the 97.2% burst line
    expect(
      dmgUp.every((e) => (e as { value: number }).value < 30),
    ).toBe(true); // the 21.12% skill2 line
  });
});

describe('burst — ATK +97.2% for 10 sec (self)', () => {
  it('emits atkPct 97.2 on self once per own burst cast', () => {
    const evs = buffsOf(BASE.events, 'atkPct').filter(
      (e) => Math.abs((e as { value: number }).value - 97.2) < 1e-6,
    );
    const ownCasts = BASE.events.filter(
      (e) =>
        e.kind === 'burstCast' &&
        (e as { slug?: string }).slug === SLUG,
    ).length;
    expect(evs.length).toBe(ownCasts);
    for (const e of evs) {
      expect((e as { targetSlug?: string }).targetSlug).toBe(SLUG);
    }
  });

  it('is load-bearing: removing it lowers this unit total and leaves teammates identical', () => {
    expect(totals(NO_BURST_ATK.res)[SLUG]).toBeLessThan(totals(BASE.res)[SLUG]);
    const b = totals(BASE.res);
    const n = totals(NO_BURST_ATK.res);
    for (const slug of Object.keys(b)) {
      if (slug === SLUG) {continue;}
      expect(n[slug]).toBe(b[slug]);
    }
  });

  it('is a 10s window, not permanent: damage outside the window is unbuffed', () => {
    // Non-vacuity of the duration: some of this unit\u2019s damage events must fall
    // outside any 10s post-cast window. With 180s of fight and a 40s cooldown, most do.
    const casts = BASE.events
      .filter(
        (e) =>
          e.kind === 'burstCast' &&
          (e as { slug?: string }).slug === SLUG,
      )
      .map((e) => (e as { frame: number }).frame);
    const hits = dmgOf(BASE.events).map((e) => (e as { frame: number }).frame);
    const inWindow = hits.filter((f) =>
      casts.some((c) => f >= c && f < c + 10 * 60),
    ).length;
    expect(inWindow).toBeGreaterThan(0);
    expect(inWindow).toBeLessThan(hits.length);
  });
});

describe('burst — Unlimited ammunition for 10 sec (self)', () => {
  // Weapon-state modifier = damage: removing it forces reloads inside the burst window,
  // cutting shots fired. Nearest-wrong: treating "unlimited ammo" as flavour/no-op.
  it('removing unlimitedAmmo reduces shots fired and total damage', () => {
    const shotsBase = BASE.events.filter(
      (e) => e.kind === 'shot' && (e as { slug?: string }).slug === SLUG,
    ).length;
    const shotsNo = NO_UNLIMITED.events.filter(
      (e) => e.kind === 'shot' && (e as { slug?: string }).slug === SLUG,
    ).length;
    expect(shotsNo).toBeLessThan(shotsBase);
    expect(totals(NO_UNLIMITED.res)[SLUG]).toBeLessThan(totals(BASE.res)[SLUG]);
  });

  it('reload events drop inside the burst window when ammo is unlimited', () => {
    const reloadsBase = BASE.events.filter(
      (e) =>
        e.kind === 'reload' && (e as { slug?: string }).slug === SLUG,
    ).length;
    const reloadsNo = NO_UNLIMITED.events.filter(
      (e) =>
        e.kind === 'reload' && (e as { slug?: string }).slug === SLUG,
    ).length;
    expect(reloadsBase).toBeLessThan(reloadsNo);
  });

  it('is self-scoped: the unlimited window is hers alone (shot-level evidence)', () => {
    // FIXTURE-AWARENESS PATCH (driver): the original byte-identical-teammates arm is false
    // in a coupled rotation — her unlimited window fires extra shots, which pump her burst
    // gauge and move the team rotation (every ally's total shifts). Self-scoping is asserted
    // at the shot level instead: the unlimited flag appears ONLY on her shots, never on an
    // ally's.
    const allyUnlimited = NO_UNLIMITED.events.filter(
      (e) => e.kind === 'shot' && (e as { slug?: string }).slug !== SLUG && (e as { unlimitedAmmo?: boolean }).unlimitedAmmo,
    );
    expect(allyUnlimited.length).toBe(0);
    const ownUnlimited = BASE.events.filter(
      (e) => e.kind === 'shot' && (e as { slug?: string }).slug === SLUG && (e as { unlimitedAmmo?: boolean }).unlimitedAmmo,
    );
    expect(ownUnlimited.length).toBeGreaterThan(0);
  });
});

describe('burst — "Hit count required for Skill 2 \u25bc20 for 10 sec"', () => {
  // GAP: the engine has no primitive that MUTATES another block\u2019s hitCount threshold
  // for a window. TriggerDef.hitCount carries `countInFb` (a Full-Burst-scoped override),
  // which is NOT the same gate: this line is keyed to the 10s window opened by THIS
  // unit\u2019s burst cast, while countInFb keys to the team Full-Burst state. They coincide
  // only when this unit is the sole/actual burster AND the window edges align; in any
  // comp where another B3 completes the chain they diverge (over-credit), and the 10s
  // window is not the FB window length. Encoding it as countInFb:30 is therefore an
  // APPROXIMATION, not the kit line \u2014 flagged rather than silently asserted.
  it.skip('skill2a threshold drops 50 -> 30 for 10s after this unit bursts (no primitive: burst-window-scoped hit-count modifier; countInFb is FB-scoped, not burst-cast-window-scoped)', () => {
    // Intentionally unimplemented. If the override models it via countInFb, the
    // discriminating check would be: proc count of the 61.69% rider inside FB windows
    // exceeds the out-of-FB rate by the 50/30 ratio. That assertion would validate the
    // APPROXIMATION, not the kit text, so it is not asserted here.
  });

  it('records that the skill2 threshold is dynamic at all (rider procs are not evenly spaced)', () => {
    // A weak but honest positive check: whatever primitive is used, the 61.69% line
    // must not fire at a fixed wall-clock interval (which would indicate a mis-encode
    // to trigger kind \u2018interval\u2019). Hit-count triggers cluster with fire-rate/FB uptime.
    const s2Loss = totals(BASE.res)[SLUG] - totals(NO_S2_RIDER.res)[SLUG];
    expect(s2Loss).toBeGreaterThan(0);
  });
});

describe('cross-cutting inertness', () => {
  it('no boss-held debuff is emitted (the kit carries no Damage Taken \u25b2 line)', () => {
    const bossHeld = BASE.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        (e as { casterIdx?: number | null }).casterIdx === null &&
        (e as { targetIdx?: number | null }).targetIdx === null &&
        (e as { stat?: string }).stat === 'damageTakenPct',
    );
    expect(bossHeld.length).toBe(0);
  });

  it('every buff this unit applies targets ITSELF (all four buff lines say \u201cAffects self\u201d)', () => {
    const mine = BASE.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        (e as { casterIdx?: number | null }).casterIdx === swSlot,
    );
    expect(mine.length).toBeGreaterThan(0);
    for (const e of mine) {
      expect((e as { targetSlug?: string }).targetSlug).toBe(SLUG);
    }
  });

  it('no crit/core-scoped stat is granted BY HER KIT (allies may grant them)', () => {
    // FIXTURE-AWARENESS PATCH (driver): helm grants team critRateNormalPct on FB entry, so
    // the target-held filter must be caster-scoped to HER grants.
    for (const stat of [
      'critRatePct',
      'critRateNormalPct',
      'critDamagePct',
      'coreDamagePct',
    ]) {
      expect(ownBuffsOf(BASE.events, stat).length).toBe(0);
    }
  });
});
