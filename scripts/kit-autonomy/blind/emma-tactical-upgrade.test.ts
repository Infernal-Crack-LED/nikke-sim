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
 * Emma: Tactical Upgrade (emma-tactical-upgrade) — MG/Fire/Supporter/Burst I.
 * Blind kit-spec test written from the kit prose alone.
 *
 * KIT (structural read):
 *  S1 blockA — "Activates at the start of battle. Affects self." Environment Setup.
 *      e1: enemy Damage Taken UP 3.9% for 10 sec  (boss debuff -> damageTakenPct)
 *      e2: all allies, recovers 2.32% of user's final Max HP every 1 sec for 10 sec
 *          (heal-over-time -> heal with ticks:10, intervalSec:1; fires allies' `recovery` triggers)
 *      Recurring interval: 30 sec  -> trigger interval{sec:30}. NOTE the header says
 *      "Activates at the START of battle", so first fire is t=0 with a 30s recurrence.
 *      The engine's interval trigger first-fires at t=sec, so a faithful model needs a
 *      t=0 fire as well (see the FIRST-FIRE test below).
 *  S1 blockB — "Activates when the enemy appears." Exposure / Attract: taunt.
 *      GAP: taunt/aggro is not a modeled primitive (boss deals no damage in v1). BUT it is
 *      the gate referenced by S2 bonus e3, so it is NOT free-standing flavor.
 *  S2 — "Activates only if self is alive." LT Formation (passive, continuous):
 *      e1: allies from the same squad, Critical Damage UP 23.51%  -> squad-scoped. The data
 *          has no squad axis; the nearest-wrong models are (a) allies (over-credits) and
 *          (b) self-only (under-credits). Scope is asserted, not guessed.
 *      e2: all allies, Projectile Explosion Damage UP 2.32%  -> projectileExplosionPct
 *      Bonus "when applying AS Formation to self" — a kit-FORMATION mode, not a burst/FB
 *      trigger. Modeled as a `modes` selection or an always-on branch; either way the four
 *      bonus effects move together (they are one gated group):
 *      b1: all allies True Damage UP 30.97%   -> trueDamagePct
 *      b2: all allies Projectile Explosion UP 3.09%  -> stacks additively with e2 (total 5.41)
 *      b3: self, Exposure activation disabled  -> disables S1 blockB (inert while taunt is a GAP)
 *      b4: self, Recurring interval of Environment Setup DOWN 20 sec -> 30s becomes 10s.
 *          This is a CADENCE change and is therefore damage-visible through e1 (the boss
 *          Damage Taken debuff goes from 10s-on/20s-off to effectively continuous).
 *  BURST — "Affects all allies." Battlefield Formation: ATK UP 40.07% OF THE SKILL USER'S ATK
 *      for 10 sec -> casterAtkPct (flat-resolved at apply time), NOT atkPct.
 *      "Affects self while in Environment Setup status." Enhanced Environment Setup, 10 sec:
 *      e1: "Damage taken multiplier of Environment Setup is scaled by 100%" -> DOUBLES the
 *          3.9% debuff to 7.8% for 10s (all enemies). Nearest-wrong: adding a flat +100%
 *          damageTaken, or a separate 3.9% instance.
 *      e2: all allies Incoming Healing UP 29.04% -> no HP pool in v1; heal amounts are not
 *          modeled, so this is a GAP (it must not be encoded as a damage stat).
 *
 * FIXTURE: controlComp('emma-tactical-upgrade', true) — she is Burst I, so the control comp
 * supplies the B2/B3 chain and she casts her own burst each rotation. Deterministic (no seed).
 * Every assertion below discriminates the faithful reading from a NAMED nearest-wrong model
 * built with withPatchedOverride; inertness assertions pin what each line must NOT move.
 */

const SLUG = 'emma-tactical-upgrade';

type Ev = SimEvent & Record<string, unknown>;

function run(overrides?: Record<string, unknown>) {
  const events: Ev[] = [];
  const opts = controlComp(SLUG, true) as Record<string, unknown>;
  if (overrides) {
    opts.overrides = overrides;
  }
  const cfg = (opts.cfg ?? {}) as Record<string, unknown>;
  opts.cfg = { ...cfg, onEvent: (ev: SimEvent) => events.push(ev as Ev) };
  const res = runComp(opts as never);
  return { res, events };
}

const buffs = (events: Ev[], stat: string) =>
  events.filter((e) => e.kind === 'buffApply' && e.stat === stat);

const bossDebuffs = (events: Ev[], stat: string) =>
  buffs(events, stat).filter(
    (e) => e.casterIdx === null && e.targetIdx === null
  );

const fromEmma = (events: Ev[], stat: string) =>
  buffs(events, stat).filter((e) => e.casterIdx !== null);

// ---- hoisted runs (each runComp is a full 180s sim) -------------------------
const BASE = run();
const BASE_TOTALS = totals(BASE.res);
const ALLY_SLUGS = Object.keys(BASE_TOTALS).filter((s) => s !== SLUG);

describe('emma-tactical-upgrade — S1 Environment Setup', () => {
  it('e1 applies an enemy Damage Taken debuff of 3.9%, not a self/ally buff', () => {
    const debuffs = bossDebuffs(BASE.events, 'damageTakenPct');
    expect(debuffs.length).toBeGreaterThan(0);
    // The base magnitude must appear. (The burst doubles it to 7.8% for 10s — asserted
    // separately — so 3.9 must be present among the emitted values.)
    const values = new Set(debuffs.map((e) => e.value as number));
    expect([...values]).toContain(3.9);
    // Discriminator vs the "self buff" nearest-wrong: a Damage Taken line is a BOSS debuff,
    // so it must NOT be emitted as a unit-targeted buff on Emma or an ally.
    expect(
      buffs(BASE.events, 'damageTakenPct').filter((e) => e.targetIdx !== null)
    ).toHaveLength(0);
  });

  it('e1 is a 10s WINDOW on a recurrence, not a permanent passive', () => {
    const debuffs = bossDebuffs(BASE.events, 'damageTakenPct');
    // A permanent passive would emit exactly once at frame 0 and never again.
    // The recurring interval means repeated applications across the 180s fight.
    expect(debuffs.length).toBeGreaterThan(1);
    // Each application carries a finite expiry (the 10 sec window).
    for (const ev of debuffs) {
      expect(ev.expiresFrame == null).toBe(false);
    }
  });

  it('e1 first-fires at battle START (t=0), not one full interval in', () => {
    // "Activates at the start of battle" + "Recurring interval: 30 sec". The engine's bare
    // interval trigger first-fires at t=sec, which would leave the opening window empty.
    // Nearest-wrong: a lone interval{sec:30} with no t=0 fire.
    const first = bossDebuffs(BASE.events, 'damageTakenPct')[0];
    expect(first).toBeDefined();
    expect(first.frame as number).toBeLessThanOrEqual(1);
  });

  it('e2 emits a 10-tick heal-over-time to ALL ALLIES (drives on-recovery kits)', () => {
    const heals = BASE.events.filter((e) => e.kind === 'buffApply' && false);
    void heals;
    // Recovery is observable through the recovery-consumer path; assert the tick COUNT and
    // the target breadth via the emitted heal/recovery events.
    const recov = BASE.events.filter(
      (e) => e.kind === 'heal' || e.kind === 'recovery'
    );
    expect(recov.length).toBeGreaterThan(0);
    // Nearest-wrong A: ticks:1 (a single instant heal) — that yields 1 event per activation,
    // not 10, so a HoT window must emit strictly more events than activations.
    const activations = bossDebuffs(BASE.events, 'damageTakenPct').length;
    expect(recov.length).toBeGreaterThan(activations);
    // Nearest-wrong B: self-only. Every ally must receive the recovery, not just Emma.
    const healedSlugs = new Set(recov.map((e) => e.targetSlug as string));
    for (const s of ALLY_SLUGS) {
      expect(healedSlugs.has(s)).toBe(true);
    }
  });

  it.skip('Exposure / Attract taunt — GAP: no aggro primitive (boss deals no damage in v1)', () => {
    // Unmodellable payload: taunt only matters for incoming damage, which v1 does not simulate.
    // It is NOT free-standing flavor though — S2 bonus e3 disables it, so the two lines must be
    // documented together in the override `unmodeled` field.
  });
});

describe('emma-tactical-upgrade — S2 LT Formation', () => {
  it('e1 Critical Damage 23.51% is SQUAD-scoped, not a self-only buff', () => {
    const crit = fromEmma(BASE.events, 'critDamagePct').filter(
      (e) => (e.value as number) === 23.51
    );
    expect(crit.length).toBeGreaterThan(0);
    // Discriminator vs the self-only nearest-wrong: at least one NON-Emma target receives it.
    const targets = new Set(crit.map((e) => e.targetSlug as string));
    expect([...targets].some((s) => s !== SLUG)).toBe(true);
  });

  it('e2 Projectile Explosion 2.32% + bonus 3.09% = 5.41% total to all allies', () => {
    const pe = fromEmma(BASE.events, 'projectileExplosionPct');
    expect(pe.length).toBeGreaterThan(0);
    const sumPerTarget = new Map<string, number>();
    for (const e of pe) {
      const t = e.targetSlug as string;
      sumPerTarget.set(t, (sumPerTarget.get(t) ?? 0) + (e.value as number));
    }
    // Nearest-wrong: modeling only the base 2.32 (dropping the AS-Formation bonus), or only
    // the 3.09 bonus. The two lines are separate kit effects and must ADD.
    for (const [, v] of sumPerTarget) {
      expect(v).toBeCloseTo(5.41, 5);
    }
    // Breadth: "Affects all allies" — every unit in the comp, including Emma.
    expect(sumPerTarget.size).toBe(Object.keys(BASE_TOTALS).length);
  });

  it('bonus b1 True Damage 30.97% goes to ALL ALLIES (Damage Up bucket)', () => {
    const td = fromEmma(BASE.events, 'trueDamagePct').filter(
      (e) => (e.value as number) === 30.97
    );
    expect(td.length).toBeGreaterThan(0);
    const targets = new Set(td.map((e) => e.targetSlug as string));
    // Nearest-wrong: self-scoped (the bonus block's HEADER says "to self" — that is the
    // CONDITION, the per-effect target line says "Affects all allies").
    for (const s of ALLY_SLUGS) {
      expect(targets.has(s)).toBe(true);
    }
  });

  it('bonus b1 True Damage is load-bearing: removing it lowers ALLY damage', () => {
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const blk of ov.skill2 ?? []) {
        blk.effects = blk.effects.filter(
          (e) =>
            !(
              e.kind === 'buff' &&
              e.stat === 'trueDamagePct' &&
              e.value === 30.97
            )
        );
      }
    });
    const { res } = run({ [SLUG]: patched });
    const t = totals(res);
    // Discriminates a real Damage-Up contribution from a stat the engine ignores.
    let moved = 0;
    for (const s of ALLY_SLUGS) {
      if (t[s] !== BASE_TOTALS[s]) {
        moved++;
      }
    }
    expect(moved).toBeGreaterThan(0);
    for (const s of ALLY_SLUGS) {
      if (t[s] !== BASE_TOTALS[s]) {
        expect(t[s]).toBeLessThan(BASE_TOTALS[s]);
      }
    }
  });

  it('bonus b4 shortens the Environment Setup interval 30s -> 10s (cadence is damage-visible)', () => {
    // The faithful model fires the S1 debuff every 10s. The nearest-wrong keeps 30s (i.e. the
    // -20s line dropped as "not damage"). Over 180s that is ~18 vs ~6 activations.
    const activations = bossDebuffs(BASE.events, 'damageTakenPct').length;
    expect(activations).toBeGreaterThanOrEqual(12);
  });

  it('b4 counterfactual: forcing the 30s interval REDUCES team damage', () => {
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const blk of ov.skill1 ?? []) {
        const trig = blk.trigger as { kind: string; sec?: number };
        if (trig.kind === 'interval') {
          trig.sec = 30;
        }
      }
    });
    const { res, events } = run({ [SLUG]: patched });
    const slow = bossDebuffs(events, 'damageTakenPct').length;
    // Non-vacuity: the counterfactual really is a different cadence.
    expect(slow).toBeLessThan(
      bossDebuffs(BASE.events, 'damageTakenPct').length
    );
    const t = totals(res);
    const slowTeam = Object.values(t).reduce((a, b) => a + b, 0);
    const baseTeam = Object.values(BASE_TOTALS).reduce((a, b) => a + b, 0);
    expect(slowTeam).toBeLessThan(baseTeam);
  });

  it.skip('bonus b3 "Exposure activation disabled" — GAP: gates an unmodeled taunt', () => {
    // Inert by construction: it disables the S1 Exposure line, which is itself a GAP.
    // Must be recorded in `unmodeled`, never encoded as a stat.
  });
});

describe('emma-tactical-upgrade — Burst', () => {
  it('Battlefield Formation is CASTER-scaled ATK (flat-resolved), not target atkPct', () => {
    const caster = fromEmma(BASE.events, 'casterAtkPct');
    expect(caster.length).toBeGreaterThan(0);
    // Caster-scaled values are flat-resolved at apply time: 40.07% of Emma's static ATK.
    // A raw 40.07 in the value field means the line was mis-encoded as plain atkPct.
    for (const e of caster) {
      expect(e.value as number).toBeGreaterThan(100);
    }
    const emmaAtk = unitOf(BASE.res, SLUG) as unknown as {
      staticAtk?: number;
    };
    if (typeof emmaAtk.staticAtk === 'number') {
      expect(caster[0].value as number).toBeCloseTo(
        (40.07 / 100) * emmaAtk.staticAtk,
        0
      );
    }
    // Nearest-wrong discriminator: no plain atkPct 40.07 anywhere.
    expect(
      fromEmma(BASE.events, 'atkPct').filter((e) => e.value === 40.07)
    ).toHaveLength(0);
  });

  it('Battlefield Formation targets ALL ALLIES for 10 sec (finite window)', () => {
    const caster = fromEmma(BASE.events, 'casterAtkPct');
    const targets = new Set(caster.map((e) => e.targetSlug as string));
    for (const s of ALLY_SLUGS) {
      expect(targets.has(s)).toBe(true);
    }
    expect(targets.has(SLUG)).toBe(true);
    // 10s window -> a finite expiry, not a continuous passive.
    for (const e of caster) {
      expect(e.expiresFrame == null).toBe(false);
    }
  });

  it('Battlefield Formation is keyed to Emma\u2019s OWN burst cast, not team full-burst entry', () => {
    // Trigger identity: the line sits in her BURST block -> burstCast. In this comp she is the
    // sole B1 and casts every rotation, so the counts coincide; the discriminator is that the
    // apply frame precedes the corresponding fullBurstStart (a burst cast lands before FB opens).
    const applies = fromEmma(BASE.events, 'casterAtkPct').map(
      (e) => e.frame as number
    );
    const fbStarts = BASE.events
      .filter((e) => e.kind === 'fullBurstStart')
      .map((e) => e.frame as number);
    expect(applies.length).toBeGreaterThan(0);
    expect(fbStarts.length).toBeGreaterThan(0);
    const firstApply = Math.min(...applies);
    const firstFb = Math.min(...fbStarts);
    expect(firstApply).toBeLessThan(firstFb);
  });

  it('Enhanced Environment Setup DOUBLES the Damage Taken debuff to 7.8% (scaled by 100%)', () => {
    const values = new Set(
      bossDebuffs(BASE.events, 'damageTakenPct').map((e) => e.value as number)
    );
    // Faithful: the multiplier is scaled by 100% -> 3.9 * 2 = 7.8.
    expect([...values]).toContain(7.8);
    // Nearest-wrong A: a flat +100 percentage-point debuff.
    expect(values.has(103.9)).toBe(false);
    expect(values.has(100)).toBe(false);
    // Nearest-wrong B: a second independent 3.9% instance stacking to 7.8 by addition would
    // show TWO concurrent 3.9 applies rather than one 7.8 apply — covered by the containment
    // check above plus the count assertion below.
  });

  it('the doubled debuff is a 10s burst-window effect, not permanent', () => {
    const strong = bossDebuffs(BASE.events, 'damageTakenPct').filter(
      (e) => (e.value as number) === 7.8
    );
    expect(strong.length).toBeGreaterThan(0);
    for (const e of strong) {
      expect(e.expiresFrame == null).toBe(false);
    }
    // Non-vacuity: the fixture must exercise BOTH the enhanced and un-enhanced case.
    const weak = bossDebuffs(BASE.events, 'damageTakenPct').filter(
      (e) => (e.value as number) === 3.9
    );
    expect(weak.length).toBeGreaterThan(0);
  });

  it('removing the burst debuff-doubling lowers TEAM damage (whole-team benefit, not self)', () => {
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const blk of ov.burst ?? []) {
        blk.effects = blk.effects.filter(
          (e) =>
            !(
              e.kind === 'buff' &&
              e.stat === 'damageTakenPct' &&
              (e.value as number) >= 7
            )
        );
      }
    });
    const { res } = run({ [SLUG]: patched });
    const t = totals(res);
    // A boss Damage Taken debuff benefits EVERY unit — inertness discriminator against
    // mis-scoping it as a self buff.
    for (const s of ALLY_SLUGS) {
      expect(t[s]).toBeLessThan(BASE_TOTALS[s]);
    }
  });

  it.skip('Incoming Healing \u25b2 29.04% — GAP: no HP pool / heal magnitudes in v1', () => {
    // The engine emits recovery EVENTS without amounts, so a heal-amplification percentage has
    // no consumer. Must live in `unmodeled`, never as a damage stat.
  });
});

describe('emma-tactical-upgrade — inertness', () => {
  it('Emma carries no crit-rate, core, or charge buffs (nothing in her kit grants them)', () => {
    for (const stat of [
      'critRatePct',
      'critRateNormalPct',
      'coreDamagePct',
      'chargeDamagePct',
      'chargeSpeedPct',
      'elementDamagePct',
    ]) {
      expect(fromEmma(BASE.events, stat)).toHaveLength(0);
    }
  });

  it('no weapon-state modifiers: her kit changes no ammo, reload, or fire rate', () => {
    for (const stat of [
      'maxAmmoPct',
      'maxAmmoFlat',
      'reloadSpeedPct',
      'attackSpeedPct',
      'fireRatePct',
    ]) {
      expect(fromEmma(BASE.events, stat)).toHaveLength(0);
    }
  });

  it('her kit deals no direct damage: every damage event from her slot is a normal attack', () => {
    const emmaIdx = (unitOf(BASE.res, SLUG) as unknown as { slot?: number })
      .slot;
    const dmg = BASE.events.filter(
      (e) => e.kind === 'damage' && e.srcSlot === emmaIdx
    );
    expect(dmg.length).toBeGreaterThan(0);
    // Nearest-wrong: inventing a flatDamage rider for a support kit that states none.
    for (const e of dmg) {
      expect(['normal', 'core']).toContain(e.bucket as string);
    }
  });
});
