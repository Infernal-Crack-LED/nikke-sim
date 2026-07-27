import { describe, it, expect } from 'vitest';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness';

// ada — RL/Electric/Attacker/Burst III. BLIND spec test authored from kit prose ALONE.
// (event/API field names mirror the harness contract described in the packet; where a field is a
//  best-guess it is noted inline — a divergence there IS a payload for the judge.)
//
// KIT (ground truth):
//   skill1  ■ Activates when entering Full Burst. Affects all Burst-3 allies who previously used their Burst.
//              - ATK +60% OF THE SKILL USER'S ATK, 10s   -> casterAtkPct 60 (flat add of caster's ATK; NOT self-scaled atkPct)
//              - True Damage +50%, 10s                    -> trueDamagePct 50
//              - Recovers 10% of damage as HP, 10s        -> lifesteal (no HP pool in v1 -> GAP)
//   skill2  ■ Activates during Full Burst. Affects enemy nearest crosshair EVERY 2 sec.
//              - Flash Grenade Toss: 420% of final ATK as True Damage -> flatDamage atkPct 420 flavor true, interval 2s, fbGate inFb, noRange
//           ■ Activates when using Burst Skill. Affects self.
//              - Flash Grenade activation-time condition -1 sec, 10s   -> mutates skill2 interval 2s->1s (no primitive -> GAP)
//   burst   ■ Affects self.
//              - ATK +40%, 10s          -> atkPct 40
//              - True Damage +42%, 10s  -> trueDamagePct 42
//              - Special Modification, for 1 ROUND(S):  (durationShots:1, NOT seconds)
//                  Charge Speed -300%   -> chargeSpeedPct -300
//                  Charge Damage +1500% -> chargeDamagePct 1500 (additive charge-bucket points)
//
// FIXTURE: controlComp('ada', true) — liter B1 / crown B2 / ada B3 carry / helm B3; ada self-bursts each
//   rotation so (a) she enters Full Burst and (b) skill1's 'burst-caster B3' target set includes her.
//
// WHY the discriminators: buffApply events carry {stat,value} so encoding choices (casterAtkPct vs atkPct,
//   trueDamagePct vs attackDamagePct, durationShots vs durationSec) are checked STRUCTURALLY even in a solo
//   comp where the two encodings would net the same total ATK.

type Ev = any;
function run(opts: any) {
  const events: Ev[] = [];
  const cfg = { ...(opts.cfg || {}), onEvent: (e: Ev) => events.push(e) };
  const res = runComp({ ...opts, cfg });
  return { res, events };
}

const ADA = 'ada';
const applies = (evs: Ev[], stat: string, value: number) =>
  evs.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.stat === stat &&
      Math.abs(e.value - value) < 1e-6
  );
// grenade / charge-nuke hits stand far above a normal RL shot (base mult 0.613, core 2.0)
const bigTrue = (e: Ev) =>
  e.kind === 'damage' && e.mult > 3 && /true/i.test(String(e.bucket));
const normalHit = (e: Ev) => e.kind === 'damage' && e.mult < 3;

// ---- hoisted runs (each is a full 180s sim) ----
const base = run(controlComp(ADA, true));

// counterfactual A: charge buff as a 10s WINDOW instead of 1 ROUND -> many charged shots boosted
const longCharge = run({
  ...controlComp(ADA, true),
  overridesPatch: withPatchedOverride(ADA, (ov: any) => {
    for (const blk of ov.blocks)
      {for (const eff of blk.effects)
        {if (eff.kind === 'buff' && eff.stat === 'chargeDamagePct') {
          delete eff.durationShots;
          eff.durationSec = 10;
        }}}
  }),
});

// counterfactual B: strip the Flash-Grenade flatDamage block entirely
const noGrenade = run({
  ...controlComp(ADA, true),
  overridesPatch: withPatchedOverride(ADA, (ov: any) => {
    ov.blocks = ov.blocks.filter(
      (b: any) =>
        !b.effects.some(
          (e: any) => e.kind === 'flatDamage' && Math.abs(e.atkPct - 420) < 1e-6
        )
    );
  }),
});

describe('ada — skill1 (FB-enter, B3 burst-casters)', () => {
  it('fixture actually enters Full Burst (non-vacuity)', () => {
    expect(
      base.events.filter((e) => e.kind === 'fullBurstStart').length
    ).toBeGreaterThan(0);
  });

  it('ATK buff is casterAtkPct 60 (flat % of CASTER ATK), NOT self-scaled atkPct 60', () => {
    // FAITHFUL: casterAtkPct present. NEAREST-WRONG: encoded as atkPct 60 -> would show stat 'atkPct'
    // value 60 instead (burst only grants atkPct 40, so a 60-valued atkPct can only come from mis-encoding).
    expect(applies(base.events, 'casterAtkPct', 60).length).toBeGreaterThan(0);
    expect(applies(base.events, 'atkPct', 60).length).toBe(0);
  });

  it('True Damage +50% is trueDamagePct 50', () => {
    // NEAREST-WRONG: attackDamagePct/elementDamagePct 50 -> different stat in the log.
    expect(applies(base.events, 'trueDamagePct', 50).length).toBeGreaterThan(0);
    expect(applies(base.events, 'attackDamagePct', 50).length).toBe(0);
  });

  it('skill1 buffs land AT Full Burst entry, not at burst cast', () => {
    // in a solo comp burstCast and fullBurstEnter are 1:1, so this checks COUNT parity with FB starts
    // (a burstCast mis-key would still count 1:1 here — flagged as a solo-comp limitation in the spec).
    const fbCount = base.events.filter(
      (e) => e.kind === 'fullBurstStart'
    ).length;
    expect(applies(base.events, 'casterAtkPct', 60).length).toBe(fbCount);
  });

  it.skip('Recovers 10% of damage as HP — GAP: lifesteal, no HP pool in v1 (offensively inert; only feeds a teammate on-recovery consumer)', () => {});
});

describe('ada — skill2 (Flash Grenade, during Full Burst)', () => {
  it('Flash Grenade true-damage hits fire ONLY during Full Burst', () => {
    // FAITHFUL: fbGate inFb. NEAREST-WRONG: interval with no FB gate -> hits appear with inFullBurst=false.
    const gren = base.events.filter(bigTrue);
    expect(gren.length).toBeGreaterThan(0);
    expect(gren.every((e) => e.inFullBurst === true)).toBe(true);
  });

  it('non-vacuity: the fixture also produces plenty of out-of-FB normal shots', () => {
    expect(
      base.events.some((e) => normalHit(e) && e.inFullBurst === false)
    ).toBe(true);
  });

  it('grenade is enemy-targeted — removing it drops Ada but leaves teammates byte-identical', () => {
    expect(unitOf(noGrenade.res, ADA).total).toBeLessThan(
      unitOf(base.res, ADA).total
    );
    for (const mate of ['liter', 'crown', 'helm']) {
      expect(unitOf(noGrenade.res, mate).total).toBe(
        unitOf(base.res, mate).total
      );
    }
  });

  it.skip('Flash Grenade activation-time -1s for 10s — GAP: no interval-mutation primitive; in practice halves cadence (2s->1s) across Ada\u2019s own FB window', () => {});
});

describe('ada — burst (self)', () => {
  it('self ATK +40% and True Damage +42%', () => {
    expect(applies(base.events, 'atkPct', 40).length).toBeGreaterThan(0);
    expect(applies(base.events, 'trueDamagePct', 42).length).toBeGreaterThan(0);
  });

  it('Special Modification: chargeDamage +1500 & chargeSpeed -300 present', () => {
    expect(
      applies(base.events, 'chargeDamagePct', 1500).length
    ).toBeGreaterThan(0);
    expect(applies(base.events, 'chargeSpeedPct', -300).length).toBeGreaterThan(
      0
    );
  });

  it('Special Modification lasts ONE ROUND, not a 10s window', () => {
    // FAITHFUL: durationShots:1 -> only the next charged shot is boosted.
    // NEAREST-WRONG: durationSec:10 -> every charged shot for 10s is boosted -> strictly more total damage.
    expect(totals(longCharge.res).total).toBeGreaterThan(
      totals(base.res).total
    );
  });
});
