import { describe, it, expect } from 'vitest';
import {
  controlComp,
  runComp,
  unitOf,
  withPatchedOverride,
} from '../lib/harness';

/*
 * snow-white (Snow White) — AR/Iron/Attacker/Burst III. BLIND S5 kit spec test.
 *
 * NON-NEGOTIABLE: this is Snow White `snow-white` (AR/Iron), NOT Snow White: Heavy Arms
 * `snow-white-heavy-arms` (SR/Water). Entirely different units — do not conflate.
 *
 * KIT (ground truth):
 *   skill1  a) every 30 normal-attack HITS -> +82.8% final ATK additional damage to the target(s) (enemy).
 *           b) every 30 normal-attack HITS -> self ATK \u25b2 8.28% for 5 sec.
 *   skill2  a) 144.73% final ATK skill damage to enemies within range. NO activation clause -> interval
 *              trigger; cadence is INVENTED/datamine-unreliable => \u26a1.
 *           b) when using THIS SKILL during Full Burst -> self Critical Rate \u25b2 26.1% for 10 sec
 *              (GENERIC crit rate, FB-gated, self).
 *   burst   Change weapon: 5s charge, 499.5% dmg, Full-Charge 1000% of dmg, Max Ammo 1, Pierce.
 *           weaponSwap; swap DURATION / shot economy are kit-silent => \u26a1.
 *
 * FIXTURE: controlComp('snow-white', true) — liter B1 / crown B2 / carry(=SW) B3 / helm B3.
 *   The B1/B2 supply the chain so SW's B3 actually casts and the team enters Full Burst
 *   (a lone B3 makes ZERO Full Bursts). FB windows are REQUIRED so skill2's crit-in-FB gate has
 *   an active case; the ~2.5-min out-of-FB stretches give the gate an inactive case to suppress.
 *
 * HARNESS ASSUMPTION (documented, isolated to runPatched): a patched override clone is injected
 * via comp.overrides[slug]. If this harness injects counterfactual overrides differently, adjust
 * ONLY runPatched — every logical assertion below is unaffected.
 */

const SLUG = 'snow-white';
const approx = (a, b, tol = 0.5) => Math.abs(a - b) < tol;

function runCollecting(comp) {
  const events = [];
  comp.cfg = { ...(comp.cfg || {}), onEvent: (ev) => events.push(ev) };
  const res = runComp(comp);
  return { res, events };
}

function runPatched(mutate) {
  const patched = withPatchedOverride(SLUG, mutate);
  const comp = controlComp(SLUG, true);
  comp.overrides = { ...(comp.overrides || {}), [SLUG]: patched };
  return runCollecting(comp);
}

const swTotal = (res) => unitOf(res, SLUG).total;
const teammates = (res) =>
  ['liter', 'crown', 'helm'].map((s) => unitOf(res, s).total);
const eachEffect = (ov, fn) =>
  ov.blocks.forEach((b) => b.effects.forEach((e) => fn(e, b)));
const buffApplies = (events, stat, val) =>
  events.filter(
    (e) => e.kind === 'buffApply' && e.stat === stat && approx(e.value, val)
  );

// ---- hoisted runs (each is a full 180s sim; file stays < 20 runs) ----
const base = runCollecting(controlComp(SLUG, true));

const riderOff = runPatched((ov) =>
  eachEffect(ov, (e) => {
    if (e.kind === 'flatDamage' && approx(e.atkPct, 82.8)) {
      e.atkPct = 0;
    }
  })
);
const riderHalfThreshold = runPatched((ov) =>
  ov.blocks.forEach((b) => {
    if (
      b.trigger.kind === 'hitCount' &&
      b.effects.some((e) => e.kind === 'flatDamage' && approx(e.atkPct, 82.8))
    ) {
      b.trigger.count = 15;
    }
  })
);
const atkBuffOff = runPatched((ov) =>
  eachEffect(ov, (e) => {
    if (e.kind === 'buff' && e.stat === 'atkPct' && approx(e.value, 8.28)) {
      e.value = 0;
    }
  })
);
const skill2DmgOff = runPatched((ov) =>
  eachEffect(ov, (e) => {
    if (e.kind === 'flatDamage' && approx(e.atkPct, 144.73)) {
      e.atkPct = 0;
    }
  })
);
const critGateOff = runPatched((ov) =>
  ov.blocks.forEach((b) => {
    if (
      b.effects.some(
        (e) =>
          e.kind === 'buff' && e.stat === 'critRatePct' && approx(e.value, 26.1)
      )
    ) {
      delete b.fbGate;
    }
  })
);
const swapOff = runPatched((ov) =>
  eachEffect(ov, (e) => {
    if (e.kind === 'weaponSwap') {
      e.damagePct = 0;
    }
  })
);

// SW's slot, derived (not hardcoded): SW is the caster of her own 8.28% self buff.
const swSlot = buffApplies(base.events, 'atkPct', 8.28)[0]?.casterIdx;

describe('snow-white skill1 — every-30-HITS +82.8% ATK additional damage (enemy)', () => {
  it('non-vacuous: zeroing the rider strictly lowers SW total', () => {
    expect(swTotal(base.res)).toBeGreaterThan(swTotal(riderOff.res));
  });
  it('SW-sourced only: teammates byte-identical when the rider is zeroed', () => {
    expect(teammates(riderOff.res)).toEqual(teammates(base.res));
  });
  it('fires on a HIT COUNT of 30 (not interval/every-shot): halving the threshold ~doubles its contribution', () => {
    const contribBase = swTotal(base.res) - swTotal(riderOff.res);
    const contribHalf = swTotal(riderHalfThreshold.res) - swTotal(riderOff.res);
    // count 30 -> 15 doubles firings; an interval/shotFired mis-encoding would not scale ~2x with this knob.
    expect(contribHalf).toBeGreaterThan(contribBase * 1.6);
    expect(contribHalf).toBeLessThan(contribBase * 2.4);
  });
});

describe('snow-white skill1 — every-30-HITS self ATK \u25b2 8.28% / 5s', () => {
  it('applies to SELF only (targetIdx === casterIdx on every application)', () => {
    const applies = buffApplies(base.events, 'atkPct', 8.28);
    expect(applies.length).toBeGreaterThan(0);
    for (const e of applies) {
      expect(e.targetIdx).toBe(e.casterIdx);
    }
  });
  it('raises SW damage (non-vacuous) but leaves teammates identical (self-scoped, not allies)', () => {
    expect(swTotal(base.res)).toBeGreaterThan(swTotal(atkBuffOff.res));
    expect(teammates(atkBuffOff.res)).toEqual(teammates(base.res));
  });
});

describe('snow-white skill2 — 144.73% ATK skill damage to enemies (\u26a1 interval cadence)', () => {
  it('non-vacuous: zeroing it lowers SW total, teammates unchanged', () => {
    expect(swTotal(base.res)).toBeGreaterThan(swTotal(skill2DmgOff.res));
    expect(teammates(skill2DmgOff.res)).toEqual(teammates(base.res));
  });
  it.skip('exact skill2 cadence — \u26a1 kit gives NO activation clause; interval frequency is invented/unpinnable blind', () => {});
});

describe('snow-white skill2 — Critical Rate \u25b2 26.1% / 10s, ONLY when used during Full Burst', () => {
  it('is GENERIC crit rate applied to SELF (not critRateNormalPct, not allies)', () => {
    const applies = buffApplies(base.events, 'critRatePct', 26.1);
    expect(applies.length).toBeGreaterThan(0);
    for (const e of applies) {
      expect(e.targetIdx).toBe(e.casterIdx);
    }
    // guard the scope: must NOT be encoded as the normal-attack-scoped crit stat
    expect(buffApplies(base.events, 'critRateNormalPct', 26.1).length).toBe(0);
  });
  it('is FB-gated: removing the inFb gate makes it fire strictly MORE often (also out of FB)', () => {
    const gated = buffApplies(base.events, 'critRatePct', 26.1).length;
    const ungated = buffApplies(critGateOff.events, 'critRatePct', 26.1).length;
    expect(gated).toBeGreaterThan(0); // active case: skill2 comes up during FB
    expect(ungated).toBeGreaterThan(gated); // inactive case exists: skill2 also comes up out of FB
  });
});

describe('snow-white burst — weapon swap cannon 499.5% / 1000%-full-charge, 1 ammo, Pierce (\u26a1 duration)', () => {
  it('SW casts her burst', () => {
    expect(
      base.events.filter((e) => e.kind === 'burstCast').length
    ).toBeGreaterThan(0);
  });
  it('produces charge-bucket cannon damage from SW (weapon actually swaps)', () => {
    const chargeHits = base.events.filter(
      (e) =>
        e.kind === 'damage' && e.srcSlot === swSlot && e.bucket === 'charge'
    );
    expect(chargeHits.length).toBeGreaterThan(0);
  });
  it('non-vacuous: nulling swap damage lowers SW total, teammates unchanged', () => {
    expect(swTotal(base.res)).toBeGreaterThan(swTotal(swapOff.res));
    expect(teammates(swapOff.res)).toEqual(teammates(base.res));
  });
  it.skip('exact cannon shot count / swap duration — \u26a1 kit-silent (no durationSec/maxShots in prose); measurement-gated', () => {});
  it.skip('Max Ammo 1 + Pierce Damage \u25b2 interaction — inert with no pierce-buff carrier on this control comp; GAP', () => {});
});
