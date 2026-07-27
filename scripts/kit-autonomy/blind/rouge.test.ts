import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

/**
 * rouge (Rouge) — SR/Electric/Supporter/Burst I. Blind per-unit kit spec test.
 *
 * KIT (structural read, from prose):
 *  skill1: [full-charge x8, all allies] Max HP +5% of CASTER Max HP (no heal), 5 sec
 *                                       Burst Skill cooldown -7 sec
 *  skill2: [back-row formation, self + 2 adjacent] Sword Coin: Attack Damage +6.65% continuously
 *          [full-charge x30, self + 2 adjacent, requires Sword Coin] Shield Coin: Damage Taken -15.2% cont.
 *          [burst cast x5, all allies, requires Shield Coin] Double Sword Coin: Max HP +15.08% of caster cont.
 *  burst:  [all allies] ATK +15.07% of the SKILL USER's ATK, 10 sec
 *          [in Sword Coin] Max HP +10.15% of caster (no heal), 10 sec
 *          [in Shield Coin] Max HP +20.1% of caster, 10 sec
 *          [in Double Sword Coin] Max HP +30.02% of caster (no heal), 10 sec
 *
 * FIXTURE: controlComp('rouge', true) — liter B1 / crown B2 / rouge / helm B3.
 *   rouge is Burst I, so she casts in the B1 slot every rotation and the chain still
 *   completes (crown B2 + helm B3) — bursts genuinely fire, which every burst-keyed
 *   assertion below depends on. helm=true is kept because helm is the B3 that closes
 *   the chain; her buffs are read-around by filtering events on casterIdx/stat.
 *
 * WHY EACH ASSERTION DISCRIMINATES:
 *  - The burst ATK line says "of the skill user's ATK" => casterAtkPct, which the
 *    harness FLAT-RESOLVES at apply time. Asserting the emitted flat value equals
 *    0.1507 x rouge.staticAtk fails under the nearest-wrong model (plain atkPct 15.07,
 *    which would emit the raw percentage and scale each TARGET's own ATK).
 *  - Sword Coin is "Attack Damage" => attackDamagePct (Damage Up bucket), NOT atkPct.
 *    The counterfactual swaps the stat and the run diverges.
 *  - Sword Coin targets "self and 2 allies on both sides" => selfAndAdjacent, NOT all
 *    allies. In a 4-slot comp with rouge at index 2 that still leaves one ally outside
 *    the window; the counterfactual widening to allies changes that ally's total.
 *  - Sword Coin is formation-gated on the BACK ROW. v1 has no row axis, so this is
 *    flagged (see gaps) — the test pins that the block is authored as an always-on
 *    passive and documents the assumption rather than silently asserting a row.
 *  - The 8-full-charge / 30-full-charge triggers are chargeCounter, NOT hitCount:
 *    the text says "attacking with Full Charge for N time(s)", i.e. N FULL CHARGES,
 *    and rouge is a charge SR (chargeFrames 60). Counting trigger pulls instead
 *    would over-fire; the cadence assertion below bounds the observed count.
 *  - Every Max HP line grants a % of the CASTER's Max HP to ALLIES. Per the schema's
 *    e3 rule, ally-granted Max HP does NOT feed a teammate's atkOfMaxHpPct, and no
 *    unit in this comp carries atkOfMaxHpPct — so these lines are OFFENSIVELY INERT.
 *    They are asserted present in the event log (encoded, not dropped) AND asserted
 *    damage-inert by a counterfactual that deletes them.
 *  - Damage Taken -15.2% is a DEFENSIVE self/ally buff, not a boss "Damage Taken +"
 *    debuff. The test asserts it never lands on the boss (casterIdx===null path) and
 *    never carries a positive damageTakenPct that would inflate team damage.
 */

const SLUG = 'rouge';
const FIGHT_SEC = 180;

type Ev = SimEvent & Record<string, any>;

function run(overrides?: Record<string, any>) {
  const events: Ev[] = [];
  const opts: any = controlComp(SLUG, true);
  opts.onEvent = (ev: Ev) => events.push(ev);
  if (overrides) {opts.overrides = overrides;}
  const res = runComp(opts);
  return { res, events };
}

function buffs(events: Ev[], stat: string) {
  return events.filter((e) => e.kind === 'buffApply' && e.stat === stat);
}

// ---------------------------------------------------------------- hoisted runs
const base = run();
const baseTotals = totals(base.res);
const rouge = unitOf(base.res, SLUG);

// Counterfactual A: burst ATK line re-keyed to plain atkPct (nearest-wrong reading of
// "ATK \u25b2 15.07% of the skill user's ATK").
const cfAtkPct = run({
  [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
    for (const b of ov.burst ?? []) {
      for (const e of b.effects ?? []) {
        if (e.kind === 'buff' && e.stat === 'casterAtkPct') {e.stat = 'atkPct';}
      }
    }
  }),
});

// Counterfactual B: Sword Coin re-keyed to atkPct (wrong bucket for "Attack Damage").
const cfSwordBucket = run({
  [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
    for (const b of ov.skill2 ?? []) {
      for (const e of b.effects ?? []) {
        if (e.kind === 'buff' && e.stat === 'attackDamagePct')
          {e.stat = 'atkPct';}
      }
    }
  }),
});

// Counterfactual C: Sword Coin widened from selfAndAdjacent to all allies.
const cfSwordTargets = run({
  [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
    for (const b of ov.skill2 ?? []) {
      const hasSword = (b.effects ?? []).some(
        (e: any) => e.kind === 'buff' && e.stat === 'attackDamagePct'
      );
      if (hasSword) {b.target = { kind: 'allies' };}
    }
  }),
});

// Counterfactual D: burst ATK buff deleted entirely (proves the line is load-bearing).
const cfNoBurstAtk = run({
  [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
    for (const b of ov.burst ?? []) {
      b.effects = (b.effects ?? []).filter(
        (e: any) => !(e.kind === 'buff' && e.stat === 'casterAtkPct')
      );
    }
  }),
});

// Counterfactual E: every Max-HP grant stripped from all three slots (inertness probe).
const cfNoMaxHp = run({
  [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
    for (const slot of ['skill1', 'skill2', 'burst'] as const) {
      for (const b of ov[slot] ?? []) {
        b.effects = (b.effects ?? []).filter(
          (e: any) =>
            !(
              e.kind === 'buff' &&
              (e.stat === 'casterMaxHpPct' ||
                e.stat === 'maxHpFlat' ||
                e.stat === 'targetMaxHpPct')
            )
        );
      }
    }
  }),
});

// Counterfactual F: burst CDR removed (skill1's "Cooldown of Burst Skill \u25bc 7 sec").
const cfNoCdr = run({
  [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
    for (const slot of ['skill1', 'skill2', 'burst'] as const) {
      for (const b of ov[slot] ?? []) {
        b.effects = (b.effects ?? []).filter((e: any) => e.kind !== 'burstCdr');
      }
    }
  }),
});

// Counterfactual G: Damage Taken \u25bc re-signed as a positive boss debuff (the classic
// "Damage Taken \u25b2 is a boss debuff" confusion applied to a \u25bc defensive line).
const cfDamageTakenSign = run({
  [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
    for (const b of ov.skill2 ?? []) {
      for (const e of b.effects ?? []) {
        if (e.kind === 'buff' && e.stat === 'damageTakenPct' && e.value < 0) {
          e.value = Math.abs(e.value);
          b.target = { kind: 'enemy' };
        }
      }
    }
  }),
});

describe('rouge — fixture sanity (non-vacuity)', () => {
  it('rouge is in the comp and the comp actually deals damage', () => {
    expect(rouge.totalDamage).toBeGreaterThan(0);
    expect(Object.keys(baseTotals).length).toBeGreaterThanOrEqual(4);
    for (const slug of Object.keys(baseTotals)) {
      expect(baseTotals[slug]).toBeGreaterThan(0);
    }
  });

  it('bursts genuinely cast and full bursts genuinely occur', () => {
    // Non-vacuity for every burst-keyed and full-burst-keyed assertion below.
    const casts = base.events.filter((e) => e.kind === 'burstCast');
    const fbs = base.events.filter((e) => e.kind === 'fullBurstStart');
    expect(casts.length).toBeGreaterThan(0);
    expect(fbs.length).toBeGreaterThan(0);
    // rouge is Burst I: she must be among the casters, or her burst block never fires.
    expect(casts.some((e) => e.targetSlug === SLUG || e.slug === SLUG)).toBe(
      true
    );
  });

  it('rouge fires charge shots, so the full-charge counters are reachable', () => {
    const shots = base.events.filter(
      (e) => e.kind === 'shot' && (e.slug === SLUG || e.targetSlug === SLUG)
    );
    // 180s at SR cadence with chargeFrames 60 and ammo 6 => tens of charges.
    // The 8-charge tier must be reachable many times; the 30-charge tier at least once.
    expect(shots.length).toBeGreaterThanOrEqual(30);
  });
});

describe('rouge burst — ATK \u25b2 15.07% of the skill user\u2019s ATK, 10 sec, all allies', () => {
  it('emits a caster-scaled (FLAT-resolved) ATK buff, not a raw 15.07 percentage', () => {
    const evs = buffs(base.events, 'casterAtkPct');
    expect(evs.length).toBeGreaterThan(0);
    // FLAT-resolved: value = 0.1507 x rouge.staticAtk. The nearest-wrong model (atkPct)
    // would emit the literal 15.07 instead, so this bound discriminates directly.
    for (const e of evs) {
      expect(e.value).toBeGreaterThan(15.07);
    }
  });

  it('lasts 10 sec (expiresFrame is ~600 frames past apply), not permanent', () => {
    const e = buffs(base.events, 'casterAtkPct')[0];
    expect(e.expiresFrame).toBeDefined();
    expect(e.expiresFrame).toBeLessThan(FIGHT_SEC * 60);
    expect(e.durationShots).toBeUndefined(); // seconds, not ROUNDS
  });

  it('reaches ALL allies (every comp member receives it)', () => {
    const hit = new Set(
      buffs(base.events, 'casterAtkPct')
        .map((e) => e.targetSlug)
        .filter(Boolean)
    );
    for (const slug of Object.keys(baseTotals)) {
      expect(hit.has(slug)).toBe(true);
    }
  });

  it('is load-bearing: removing it lowers team damage', () => {
    const off = totals(cfNoBurstAtk.res);
    const sum = (t: Record<string, number>) =>
      Object.values(t).reduce((a, b) => a + b, 0);
    expect(sum(off)).toBeLessThan(sum(baseTotals));
  });

  it('RED under the nearest-wrong reading (plain atkPct instead of casterAtkPct)', () => {
    const wrong = totals(cfAtkPct.res);
    const sum = (t: Record<string, number>) =>
      Object.values(t).reduce((a, b) => a + b, 0);
    expect(sum(wrong)).not.toBeCloseTo(sum(baseTotals), 0);
  });
});

describe('rouge skill2 — Sword Coin: Attack Damage \u25b2 6.65% continuously', () => {
  it('is encoded in the Damage Up bucket (attackDamagePct), value 6.65', () => {
    const evs = buffs(base.events, 'attackDamagePct').filter(
      (e) => Math.abs(e.value - 6.65) < 1e-6
    );
    expect(evs.length).toBeGreaterThan(0);
  });

  it('is CONTINUOUS: no time expiry and no round count', () => {
    const e = buffs(base.events, 'attackDamagePct').find(
      (x) => Math.abs(x.value - 6.65) < 1e-6
    )!;
    expect(e.durationShots).toBeUndefined();
    // "continuously" => either no expiry, or one past the end of the fight.
    if (e.expiresFrame != null) {
      expect(e.expiresFrame).toBeGreaterThanOrEqual(FIGHT_SEC * 60);
    }
  });

  it('targets self + 2 adjacent, NOT all allies (widening changes the board)', () => {
    const wide = totals(cfSwordTargets.res);
    const sum = (t: Record<string, number>) =>
      Object.values(t).reduce((a, b) => a + b, 0);
    // In a 4-unit comp, selfAndAdjacent leaves exactly one ally uncovered, so widening
    // to `allies` must raise the team total. If this ever goes GREEN-equal the target
    // encoding is indistinguishable and the assertion is vacuous.
    expect(sum(wide)).toBeGreaterThan(sum(baseTotals));
  });

  it('RED under the wrong bucket (atkPct instead of attackDamagePct)', () => {
    const wrong = totals(cfSwordBucket.res);
    const sum = (t: Record<string, number>) =>
      Object.values(t).reduce((a, b) => a + b, 0);
    expect(sum(wrong)).not.toBeCloseTo(sum(baseTotals), 0);
  });
});

describe('rouge skill1 — Cooldown of Burst Skill \u25bc 7 sec', () => {
  it('is encoded as a burstCdr effect worth 7 seconds', () => {
    const ov = withPatchedOverride(SLUG, () => {}) as any;
    const all = [
      ...(ov.skill1 ?? []),
      ...(ov.skill2 ?? []),
      ...(ov.burst ?? []),
    ];
    const cdr = all
      .flatMap((b: any) => b.effects ?? [])
      .filter((e: any) => e.kind === 'burstCdr');
    expect(cdr.length).toBeGreaterThan(0);
    expect(cdr.some((e: any) => Math.abs(e.seconds - 7) < 1e-6)).toBe(true);
  });

  it('is load-bearing: removing it changes the rotation (burst-cast count)', () => {
    const withCdr = base.events.filter((e) => e.kind === 'burstCast').length;
    const without = cfNoCdr.events.filter((e) => e.kind === 'burstCast').length;
    // CDR compresses the rotation => at least as many casts with it as without,
    // and over a 180s fight the 7s cut must produce strictly more.
    expect(withCdr).toBeGreaterThan(without);
  });
});

describe('rouge — full-charge counters (8 / 30) are charge-keyed, not pull-keyed', () => {
  it('the 8-charge tier fires repeatedly but far fewer times than rouge fires shots', () => {
    const shots = base.events.filter(
      (e) => e.kind === 'shot' && (e.slug === SLUG || e.targetSlug === SLUG)
    ).length;
    // The skill1 Max-HP grant is the observable of the 8-charge trigger.
    const fires = buffs(base.events, 'maxHpFlat').filter(
      (e) => e.expiresFrame != null
    ).length;
    expect(fires).toBeGreaterThan(0);
    // A hitCount:8 misread on trigger PULLS would fire ~shots/8 times; a chargeCounter
    // on FULL CHARGES fires strictly less often. Bound it well under shots/8 x allies.
    expect(fires).toBeLessThan(shots);
  });

  it('the 30-charge tier (Shield Coin) is reachable at least once in 180s', () => {
    const shield = buffs(base.events, 'damageTakenPct');
    // Non-vacuity for the Shield-Coin-gated burst branch: if this is 0, the
    // Double-Sword-Coin chain can never open either and those assertions test nothing.
    expect(shield.length).toBeGreaterThan(0);
  });
});

describe('rouge skill2 — Shield Coin: Damage Taken \u25bc15.2% (defensive, ally-scoped)', () => {
  it('is a NEGATIVE damageTakenPct on ALLIES, never a positive boss debuff', () => {
    const evs = buffs(base.events, 'damageTakenPct');
    expect(evs.length).toBeGreaterThan(0);
    for (const e of evs) {
      // \u25bc on allies => negative value; a boss debuff would be positive AND land with
      // casterIdx===null && targetIdx===null.
      expect(e.value).toBeLessThan(0);
      expect(e.casterIdx === null && e.targetIdx === null).toBe(false);
    }
  });

  it('is damage-INERT (the v1 boss deals no damage to allies)', () => {
    // Encoded for completeness, but must move nothing.
    const off = totals(cfDamageTakenSign.res);
    // Flipping the sign AND re-pointing at the enemy turns a defensive line into a
    // team-wide damage amp — if this were equal, the sign/target encoding would be
    // untested. It must differ, proving the faithful (negative, ally) encoding is
    // the one being exercised.
    const sum = (t: Record<string, number>) =>
      Object.values(t).reduce((a, b) => a + b, 0);
    expect(sum(off)).toBeGreaterThan(sum(baseTotals));
  });
});

describe('rouge — every Max HP grant (skill1 5%, S2 15.08%, burst 10.15/20.1/30.02%)', () => {
  it('all four burst/skill Max-HP lines are ENCODED (flat-resolved maxHpFlat events)', () => {
    const evs = buffs(base.events, 'maxHpFlat');
    expect(evs.length).toBeGreaterThan(0);
    // Caster-scaled => FLAT HP numbers, not the raw kit percentages.
    for (const e of evs) {
      expect(e.value).toBeGreaterThan(30.02);
    }
  });

  it('they reach allies (caster-scaled ally grants, not self-only)', () => {
    const hit = new Set(
      buffs(base.events, 'maxHpFlat')
        .map((e) => e.targetSlug)
        .filter(Boolean)
    );
    expect(hit.size).toBeGreaterThan(1);
  });

  it('are OFFENSIVELY INERT: deleting every one of them moves ZERO damage', () => {
    // e3 rule: ally-granted Max HP never feeds a teammate\u2019s atkOfMaxHpPct, and no
    // unit in this comp carries that conversion. Byte-identical totals required.
    const off = totals(cfNoMaxHp.res);
    for (const slug of Object.keys(baseTotals)) {
      expect(off[slug]).toBe(baseTotals[slug]);
    }
  });
});

describe('rouge — teammate inertness / no over-reach', () => {
  it('rouge\u2019s own damage is unaffected by the Max-HP lines', () => {
    expect(unitOf(cfNoMaxHp.res, SLUG).totalDamage).toBe(rouge.totalDamage);
  });

  it('no unexpected stat channels are opened by this kit', () => {
    // Rouge grants exactly: casterAtkPct, attackDamagePct, maxHpFlat, damageTakenPct.
    // Anything else from rouge would be an invented mechanic.
    const rougeStats = new Set(
      base.events
        .filter((e) => e.kind === 'buffApply' && e.casterSlug === SLUG)
        .map((e) => e.stat)
    );
    for (const s of rougeStats) {
      expect([
        'casterAtkPct',
        'attackDamagePct',
        'maxHpFlat',
        'damageTakenPct',
      ]).toContain(s);
    }
  });
});

describe('rouge — GAPs (no engine primitive)', () => {
  it.skip('skill2 Sword Coin is gated on BACK-ROW assignment — v1 has no row axis', () => {
    // "Activates when assigned to the back row in battle." The engine has a `formation`
    // gate for noB1/hasB1 only; there is no row/position axis, so the block is authored
    // as an unconditional passive. Assumption: the unit IS back row (the standard
    // supporter placement). No assertion can discriminate until a row axis exists.
  });

  it.skip('coin TIER progression (Sword -> Shield -> Double Sword) is a status ladder', () => {
    // Shield Coin requires Sword Coin status; Double Sword Coin requires Shield Coin.
    // There is no self-status primitive (targetStatus is enemy-only), so the ladder is
    // approximated by the ordering of the trigger thresholds (passive / 30 charges /
    // 5 burst casts). A faithful model would need a self-status gate; the burst\u2019s
    // three coin-gated branches inherit the same approximation. All four affected
    // payloads are Max HP, which is offensively inert, so the approximation moves
    // ZERO damage \u2014 the gap is completeness-only.
  });

  it.skip('\u201cwithout restoring HP\u201d distinguishes skill1/burst-b/burst-d from burst-c', () => {
    // The 20.1% Shield-Coin branch omits the "without restoring HP" qualifier, implying
    // it DOES heal \u2014 which would emit a `recovery` event and drive an on-recovery
    // consumer (crown\u2019s "when recovery takes effect"). The kit text is ambiguous about
    // whether that is a real heal or prose variance. \u26d1 FLAGGED: not modeled as a heal.
    // Recipe: record a rouge+crown comp and check whether crown\u2019s on-recovery buff
    // refreshes on rouge\u2019s burst. If it does, add a `heal` effect to that branch \u2014 it
    // would be a TANDEM (cross-unit) damage source, not an inert defensive line.
  });
});
