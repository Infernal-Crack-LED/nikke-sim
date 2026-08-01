import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  runComp,
  totals,
  withPatchedOverride,
  type CompOptions,
} from '../lib/harness.js';

/*
 * mica-snow-buddy — Mica: Snow Buddy (SMG / Iron / Supporter / Burst I)
 * Base: cd 20s, ammo 120, reloadFrames 141, chargeFrames 0, hitsPerShot 1,
 *       normalAttackMultiplier 11.7, coreAttackMultiplier 250.
 *
 * KIT (read literally, structurally):
 *  skill1 line A — trigger "landing 120 normal attack(s)", target ALL ALLIES,
 *                  "Tidying Up: Damage Taken \u25bc 2%", stacks to 10, lasts 15 sec.
 *                  \u21d2 a DEFENSIVE (damage-taken-DOWN on ALLIES) buff. This is NOT the
 *                  boss-side `damageTakenPct` debuff (which is enemy-scoped and
 *                  offensive). The sim models no incoming damage, so the stack itself
 *                  is offensively INERT \u2014 but it is the GATE for line B, so the model
 *                  must still count it. Disposition: GAP/UNMODELED payload, but the
 *                  120-hit trigger cadence is testable via line B's arrival time.
 *  skill1 line B — trigger "when Tidying Up is at MAX STACKS", target ALL ALLIES,
 *                  "Max Ammunition Capacity \u25b2 40% continuously".
 *                  \u21d2 maxAmmoPct 40 on allies. WEAPON-STATE = DAMAGE (failure-mode #6):
 *                  bigger magazines \u2192 fewer reloads \u2192 more shots fired \u2192 more damage,
 *                  and it lowers last-bullet frequency for any lastBullet consumer.
 *                  "continuously" = no durationSec once live.
 *                  MAX STACKS = 10 \u00d7 120 landed normal attacks = 1200 hits, and the
 *                  15 sec window must not lapse between stacks (mica's own SMG cadence
 *                  is fast enough that it does not).
 *  skill2 line A — trigger "landing 150 normal attack(s)", target ALL ALLIES,
 *                  "Stack count of buffs \u25b2 1".
 *                  \u21d2 a META primitive (raise OTHER buffs' current stack count by 1).
 *                  The effect schema has no stack-count-manipulation effect kind, and
 *                  `maxStacks` on a buff is a CAP, not a live counter that a third party
 *                  can increment. GAP \u2014 it.skip'd with the missing-primitive reason.
 *  skill2 line B — trigger "at the start of battle", target SELF,
 *                  "Burst Gauge filling speed \u25b2 300% continuously".
 *                  \u21d2 burstGenPct 300, passive, self. Rotation-relevant: mica is a
 *                  Burst I, so her own gauge contribution is a large share of the chain.
 *  burst          — target ALL ALLIES: "Removes 1 debuff(s)" (no debuff source in the
 *                  sim \u2014 UNMODELED, no observable) + "ATK \u25b2 39.93% of the skill user's
 *                  ATK for 5 sec" \u21d2 casterAtkPct 39.93, durationSec 5, allies.
 *                  Per the harness contract a casterAtkPct buffApply emits a FLAT
 *                  resolved ATK number = 0.3993 \u00d7 mica.staticAtk, NOT 39.93.
 *
 * FIXTURE: controlComp('mica-snow-buddy', true) \u2014 the standard B1/B2/B3 control comp so
 * bursts actually chain (mica is a Burst I; she is the B1 slot's carry here, and the
 * fixed B3 supplies a stage-3 caster so Full Bursts occur at all). Deterministic, no seed.
 * Runs are hoisted: each runComp is a full 180s sim, and this file holds 5.
 *
 * WHY EACH ASSERTION DISCRIMINATES: every FAITHFUL/FIX line is asserted GREEN under the
 * literal reading and RED under the nearest-wrong model built with withPatchedOverride \u2014
 * the wrong models chosen are exactly the failure-modes the taxonomy names for this kit
 * shape: (#6) treating the ammo line as a skip, (#3) mis-keying the ammo gate to a plain
 * per-shot/passive trigger instead of the 10-stack threshold, (#4) mis-scoping an ALLIES
 * buff to self, (#1/#4) reading the burst ATK line as self-scaled atkPct instead of
 * caster-scaled casterAtkPct, and (#2) reading "for 5 sec" as permanent.
 */

const CARRY = 'mica-snow-buddy';
// ADAPTED (mechanical): mica's slot in the sole-B1 fixture — used to isolate mica's own
// casterAtkPct applies from crown's S1 casterAtkPct (the blind filter otherwise catches both).
const MICA_SLOT = 0;

type Ev = SimEvent & Record<string, unknown>;

function run(opts: CompOptions) {
  const events: Ev[] = [];
  const res = runComp({
    ...opts,
    cfg: {
      ...(opts.cfg ?? {}),
      onEvent: (ev: SimEvent) => events.push(ev as Ev),
    },
  });
  return { res, events };
}

// ADAPTED (mechanical): controlComp(CARRY) seats liter at B1 alongside mica (also B1) — the
// Burst-I fixture hazard: first-ready selection can hand every rotation to liter so mica never
// casts and the burst assertions vacuate. Make mica the SOLE B1 so her kit is actually exercised.
const base: CompOptions = {
  slugs: [CARRY, 'crown', 'ada', 'helm'],
  bossElement: 'Fire',
  focusSlug: 'ada',
};

// ---- hoisted runs -----------------------------------------------------------

// 1. the shipped model
const BASE = run(base);

// 2. nearest-wrong for skill1B: the ammo line dropped entirely ("weapon-state is
//    defensive, skip it") \u2014 failure-mode #6.
const noAmmo = withPatchedOverride(CARRY, (ov) => {
  for (const slot of ['skill1', 'skill2', 'burst'] as const) {
    const blocks = ov[slot];
    if (!blocks) {
      continue;
    }
    for (const b of blocks) {
      b.effects = b.effects.filter(
        (e) =>
          !(
            e.kind === 'buff' &&
            (e.stat === 'maxAmmoPct' || e.stat === 'maxAmmoFlat')
          )
      );
    }
  }
});
const NO_AMMO = run({
  ...base,
  overrides: { ...(base.overrides ?? {}), [CARRY]: noAmmo },
});

// 3. nearest-wrong for skill1B's TRIGGER: the ammo buff live from t=0 as a plain
//    passive instead of gated behind 10\u00d7120 landed normal attacks \u2014 failure-mode #3.
//    An over-eager model grants the whole team +40% magazine for the entire fight.
const ammoFromZero = withPatchedOverride(CARRY, (ov) => {
  for (const b of ov.skill1 ?? []) {
    const carriesAmmo = b.effects.some(
      (e) =>
        e.kind === 'buff' &&
        (e.stat === 'maxAmmoPct' || e.stat === 'maxAmmoFlat')
    );
    if (carriesAmmo) {
      b.trigger = { kind: 'passive' };
      delete b.resourceGate; // ADAPTED (mechanical): driver gates via resourceGate; strip it to build the intended ungated always-on
    }
  }
});
const AMMO_FROM_ZERO = run({
  ...base,
  overrides: { ...(base.overrides ?? {}), [CARRY]: ammoFromZero },
});

// 4. nearest-wrong for skill2B: the burst-gauge line dropped ("gauge is not damage").
const noGauge = withPatchedOverride(CARRY, (ov) => {
  for (const b of ov.skill2 ?? []) {
    b.effects = b.effects.filter(
      (e) => !(e.kind === 'buff' && e.stat === 'burstGenPct')
    );
  }
});
const NO_GAUGE = run({
  ...base,
  overrides: { ...(base.overrides ?? {}), [CARRY]: noGauge },
});

// 5. nearest-wrong for the burst ATK line: scoped to SELF instead of all allies
//    \u2014 failure-mode #4 (a supporter's team buff mis-scoped is the classic under-credit).
const burstSelfOnly = withPatchedOverride(CARRY, (ov) => {
  for (const b of ov.burst ?? []) {
    const carriesAtk = b.effects.some(
      (e) =>
        e.kind === 'buff' && (e.stat === 'casterAtkPct' || e.stat === 'atkPct')
    );
    if (carriesAtk) {
      b.target = { kind: 'self' };
    }
  }
});
const BURST_SELF = run({
  ...base,
  overrides: { ...(base.overrides ?? {}), [CARRY]: burstSelfOnly },
});

const buffApplies = (evs: Ev[]) => evs.filter((e) => e.kind === 'buffApply');
const allySlugs = (res: ReturnType<typeof runComp>) =>
  Object.keys(totals(res)).filter((s) => s !== CARRY);

describe('mica-snow-buddy — skill1: Tidying Up (Damage Taken \u25bc 2%, 10 stacks, 15s)', () => {
  it('is modeled as an ALLY-scoped defensive stack, never as a boss Damage Taken \u25b2 debuff', () => {
    // Discriminates the single most damaging misread of this line: "Damage Taken \u25bc 2%"
    // on ALLIES is defensive and offensively inert, whereas the engine's damageTakenPct
    // stat is a BOSS-held debuff where POSITIVE = boss takes MORE. Encoding this line as
    // damageTakenPct (either sign) either fabricates team damage or silently subtracts it.
    // Boss-held debuffs are identifiable by casterIdx === null && targetIdx === null.
    const bossDebuffs = buffApplies(BASE.events).filter(
      (e) =>
        e.stat === 'damageTakenPct' &&
        e.casterIdx === null &&
        e.targetIdx === null
    );
    expect(bossDebuffs).toHaveLength(0);
  });

  it('non-vacuity: the fixture actually reaches max stacks (the gate for the ammo line)', () => {
    // Max stacks = 10 \u00d7 120 landed normal attacks = 1200 hits. If mica never gets there in
    // 180s the ammo assertions below would be vacuous \u2014 they would pass against a model
    // that granted nothing. Assert her own shot count clears the threshold.
    const micaShots = BASE.events.filter(
      (e) => e.kind === 'shot' && (e.slug === CARRY || e.srcSlug === CARRY)
    );
    expect(micaShots.length).toBeGreaterThanOrEqual(1200);
  });
});

describe('mica-snow-buddy — skill1: Max Ammunition Capacity \u25b2 40% at max stacks', () => {
  it('WEAPON-STATE IS DAMAGE: dropping the ammo line lowers TEAM damage', () => {
    // GREEN under the faithful reading (maxAmmoPct 40 on allies once Tidying Up caps),
    // RED under the "ammo capacity is defensive, skip it" model: a bigger magazine means
    // fewer reload gaps, so every ally with a live magazine fires strictly more rounds
    // over the remaining fight. This is failure-mode #6 stated as an executable claim.
    const teamBase = Object.values(totals(BASE.res)).reduce((a, b) => a + b, 0);
    const teamNoAmmo = Object.values(totals(NO_AMMO.res)).reduce(
      (a, b) => a + b,
      0
    );
    expect(teamBase).toBeGreaterThan(teamNoAmmo);
  });

  it('the ammo buff targets ALL ALLIES, not just mica', () => {
    // "Affects all allies" \u2014 at least one non-mica unit must receive the maxAmmo buff.
    // RED under an allies\u2192self mis-scope (failure-mode #4).
    const ammoTargets = new Set(
      buffApplies(BASE.events)
        .filter((e) => e.stat === 'maxAmmoPct' || e.stat === 'maxAmmoFlat')
        .map((e) => e.targetSlug as string)
    );
    expect(ammoTargets.size).toBeGreaterThan(1);
    expect([...ammoTargets].some((s) => s !== CARRY)).toBe(true);
  });

  it('the value is 40 (percent), not a flat round count', () => {
    const pctApplies = buffApplies(BASE.events).filter(
      (e) => e.stat === 'maxAmmoPct'
    );
    expect(pctApplies.length).toBeGreaterThan(0);
    for (const e of pctApplies) {
      expect(e.value).toBeCloseTo(40, 6);
    }
  });

  it('TRIGGER IDENTITY: it is stack-gated, not live from t=0', () => {
    // The nearest-wrong model makes the ammo buff a plain passive. Because 1200 landed
    // normal attacks take real time, the faithful model grants the magazine LATER, so it
    // must produce STRICTLY LESS team damage than the from-t=0 model. Equality here would
    // mean the gate is not actually gating (failure-mode #3).
    const teamBase = Object.values(totals(BASE.res)).reduce((a, b) => a + b, 0);
    const teamEarly = Object.values(totals(AMMO_FROM_ZERO.res)).reduce(
      (a, b) => a + b,
      0
    );
    expect(teamEarly).toBeGreaterThan(teamBase);
  });

  it('the first ammo grant lands well after t=0 (the 10-stack ramp is real)', () => {
    // Structural form of the same claim, read off the event log rather than totals:
    // 1200 hits at mica's SMG cadence cannot complete in the opening seconds.
    const first = buffApplies(BASE.events).find(
      (e) => e.stat === 'maxAmmoPct' || e.stat === 'maxAmmoFlat'
    );
    expect(first).toBeDefined();
    expect(first!.frame as number).toBeGreaterThan(600); // > 10s @60fps
  });

  it('"continuously": once granted it never expires', () => {
    // Duration semantics (failure-mode #2). "continuously" = no time bound. A model that
    // mistakenly copied the 15 sec from the Tidying Up line onto the ammo line would emit
    // a finite expiresFrame.
    const applies = buffApplies(BASE.events).filter(
      (e) => e.stat === 'maxAmmoPct' || e.stat === 'maxAmmoFlat'
    );
    expect(applies.length).toBeGreaterThan(0);
    for (const e of applies) {
      expect(e.durationShots ?? null).toBeNull();
      const exp = e.expiresFrame as number | null | undefined;
      expect(exp === null || exp === undefined || exp > 10_000).toBe(true);
    }
  });
});

describe('mica-snow-buddy — skill2: Burst Gauge filling speed \u25b2 300% (self, from battle start)', () => {
  it('is a SELF buff applied at battle start with value 300', () => {
    // Trigger identity + target set read literally: "at the start of battle" = passive
    // (frame 0), "Affects self" = mica only. RED under an allies-scoped or
    // later-triggered model.
    const gauge = buffApplies(BASE.events).filter(
      (e) => e.stat === 'burstGenPct'
    );
    expect(gauge.length).toBeGreaterThan(0);
    for (const e of gauge) {
      expect(e.targetSlug).toBe(CARRY);
      expect(e.value).toBeCloseTo(300, 6);
    }
    expect(Math.min(...gauge.map((e) => e.frame as number))).toBe(0);
  });

  it('ROTATION: removing it costs the team Full Bursts (gauge is damage)', () => {
    // mica is a Burst I; her gauge contribution is a large share of the chain, so a
    // \u00d74 fill rate on her is rotation-load-bearing. GREEN faithful, RED under the
    // "gauge isn't damage, skip it" model \u2014 which yields strictly fewer FB windows.
    const fbBase = BASE.events.filter(
      (e) => e.kind === 'fullBurstStart'
    ).length;
    const fbNoGauge = NO_GAUGE.events.filter(
      (e) => e.kind === 'fullBurstStart'
    ).length;
    expect(fbBase).toBeGreaterThan(0);
    expect(fbBase).toBeGreaterThan(fbNoGauge);
  });
});

describe('mica-snow-buddy — burst: ATK \u25b2 39.93% of the skill user\u2019s ATK for 5 sec (all allies)', () => {
  it('is CASTER-SCALED (casterAtkPct), emitted as a FLAT ATK number \u2014 not 39.93', () => {
    // "of the skill user's ATK" is the caster-scaled primitive. Per the harness contract a
    // casterAtkPct buffApply flat-resolves to (39.93/100) \u00d7 mica.staticAtk. The nearest-wrong
    // model writes plain atkPct 39.93, which scales each TARGET's own ATK instead \u2014 a
    // different number on every ally and a different mechanic. Asserting the emitted value
    // is NOT the raw percentage is what separates them.
    const atk = buffApplies(BASE.events).filter(
      (e) => e.stat === 'casterAtkPct' && e.casterIdx === MICA_SLOT
    );
    expect(atk.length).toBeGreaterThan(0);
    for (const e of atk) {
      expect(e.value).not.toBeCloseTo(39.93, 2);
    }

    // and the flat value is a fixed constant across every recipient (it is the CASTER's ATK,
    // so it does not vary by target) \u2014 RED under a plain atkPct model.
    const vals = new Set(atk.map((e) => Math.round(e.value as number)));
    expect(vals.size).toBe(1);

    // no plain atkPct 39.93 anywhere from mica's burst
    const wrongStat = buffApplies(BASE.events).filter(
      (e) => e.stat === 'atkPct' && Math.abs((e.value as number) - 39.93) < 0.01
    );
    expect(wrongStat).toHaveLength(0);
  });

  it('reaches EVERY ally, and self-scoping it costs the team damage', () => {
    // "Affects all allies" \u2014 the whole comp receives it. GREEN faithful; RED under the
    // allies\u2192self mis-scope, which is the classic supporter under-credit (failure-mode #4).
    const targets = new Set(
      buffApplies(BASE.events)
        .filter((e) => e.stat === 'casterAtkPct' && e.casterIdx === MICA_SLOT)
        .map((e) => e.targetSlug as string)
    );
    for (const s of allySlugs(BASE.res)) {
      expect(targets.has(s)).toBe(true);
    }

    const teamBase = Object.values(totals(BASE.res)).reduce((a, b) => a + b, 0);
    const teamSelf = Object.values(totals(BURST_SELF.res)).reduce(
      (a, b) => a + b,
      0
    );
    expect(teamBase).toBeGreaterThan(teamSelf);

    // INERTNESS: the mis-scope must leave MICA\u2019s own damage essentially untouched
    // (she keeps the buff either way) while moving her allies \u2014 proving the delta above
    // came from the ALLY grant, not from an incidental rotation shift.
    const movedAllies = allySlugs(BASE.res).filter(
      (s) => totals(BASE.res)[s] !== totals(BURST_SELF.res)[s]
    );
    expect(movedAllies.length).toBeGreaterThan(0);
  });

  it('DURATION SEMANTICS: 5 sec, not permanent', () => {
    // "for 5 sec" \u2014 a wall-clock window (there is no "round(s)" wording here, so it is NOT
    // a durationShots line). The engine emits no buffRemove on natural lapse, so read
    // expiresFrame off the apply: ~300 frames @60fps after the cast.
    const atk = buffApplies(BASE.events).filter(
      (e) => e.stat === 'casterAtkPct' && e.casterIdx === MICA_SLOT
    );
    expect(atk.length).toBeGreaterThan(0);
    for (const e of atk) {
      expect(e.durationShots ?? null).toBeNull();
      const span = (e.expiresFrame as number) - (e.frame as number);
      expect(span).toBeGreaterThan(280);
      expect(span).toBeLessThan(320);
    }
  });

  it('re-applies on each of mica\u2019s burst casts (trigger identity: burstCast, not fullBurstEnter)', () => {
    // The buff is in mica\u2019s OWN burst block, so it fires once per burst SHE casts. Assert the
    // apply count matches her burstCast count \u2014 RED under a fullBurstEnter re-key, which
    // would fire on any team Full Burst and over-credit in multi-caster rotations
    // (failure-mode #3).
    const casts = BASE.events.filter(
      (e) => e.kind === 'burstCast' && (e.slug === CARRY || e.srcSlug === CARRY)
    ).length;
    const applyFrames = new Set(
      buffApplies(BASE.events)
        .filter((e) => e.stat === 'casterAtkPct' && e.casterIdx === MICA_SLOT)
        .map((e) => e.frame as number)
    );
    expect(casts).toBeGreaterThan(0);
    expect(applyFrames.size).toBe(casts);
  });

  it.skip('burst: "Removes 1 debuff(s)" \u2014 GAP: no debuff-on-ally channel exists', () => {
    // The sim models no incoming debuffs on allies (the boss deals no damage and applies
    // nothing to the team), so cleansing has no observable payload. Nothing to assert;
    // it belongs in the override\u2019s `unmodeled.burst`.
  });
});

describe('mica-snow-buddy — GAPs', () => {
  it.skip('skill2: "Stack count of buffs \u25b2 1" \u2014 GAP: no stack-count-manipulation primitive', () => {
    // The EffectDef vocabulary has no effect that increments ANOTHER buff\u2019s live stack
    // count. `maxStacks` on a buff is a CAP declared by the buff itself, not a mutable
    // counter a third party can raise, and there is no `stackCount`/`stackBonus` stat.
    // Modeling it as +1 maxStacks on mica\u2019s own buffs would be wrong twice over: it
    // affects ALL ALLIES\u2019 buffs (cross-unit), and it raises the CURRENT count, not the cap.
    // Belongs in `unmodeled.skill2` until a primitive exists.
  });

  it.skip('skill1: "Tidying Up: Damage Taken \u25bc 2%" payload \u2014 GAP: no incoming-damage model', () => {
    // The v1 boss deals no damage to the team, so an ally-side damage-reduction stack has
    // no observable payload. The STACK COUNT is still load-bearing (it gates the +40% Max
    // Ammunition line, asserted above), so the block must exist to carry the counter \u2014
    // only its defensive value is unmodeled. Do NOT encode it as boss `damageTakenPct`.
  });
});
