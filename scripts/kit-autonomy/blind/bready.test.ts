/**
 * bready - SR / Water / Attacker / Burst III (burst cd 40s, ammo 6, charge 60f, reload 141f).
 * BLIND kit-spec pins: authored from the kit prose ALONE (no sight of the driver override, the
 * driver tests, or any truth file). Every magnitude below is quoted from the prose.
 *
 * KIT
 *   S1a  entering Full Burst, self:            ATK +70.01% for 10 sec
 *   S1b  Lingering Taste:                      Charge Speed -20% for 50 sec, cannot be removed
 *   S1c  Recommended Taste:                    Charge Speed -20% for 50 sec, cannot be removed
 *        Both Tastes are entered by -gaining a buff that increases sustained / distributed
 *        damage-. The engine has NO such trigger primitive, so the pair can only be a MODE pair;
 *        these tests probe the two branches by REVERSING the override modes array (first = default).
 *   S2a  Lingering, after 3 Full Charges, target: Damage Taken +10.2% for 5 sec
 *        + Aftertaste 150.04% of final ATK as sustained damage every 1 sec for 5 sec
 *   S2b  Recommended, on Full Charge hit, self:   Attack Damage +60.01% for 5 sec
 *   S2c  Recommended, on Full Charge hit, enemies: 265.07% of final ATK, distributed
 *   Ba   burst, self, NO activation clause = burst-CAST: Attack Damage +60.19% for 10 sec
 *   Bb   burst, Lingering, self:               Aftertaste Effect +349.8% for 10 sec
 *   Bc   burst, Recommended, self:             ATK +70.09% for 10 sec
 *
 * FIXTURE  controlComp('bready', true) = liter B1 / crown B2 / bready B3 / helm B3.
 *   B1+B2 are mandatory (a lone B3 makes ZERO Full Bursts). The SECOND B3 (helm) is what makes the
 *   trigger-identity pins discriminating: with a 40s burst CD over a ~20-25s rotation bready cannot
 *   cast on every rotation, so her burstCast count < the fullBurstStart count. That gap is exactly
 *   what separates S1a (fullBurstEnter, fires on EVERY team Full Burst) from Ba (burst-cast, fires
 *   only on the rotations SHE casts) - the classic over-credit failure mode.
 *
 * METHOD  13 hoisted runs (each runComp is a full 180s sim). Structural pins read the override
 *   effect fields through withPatchedOverride (in-memory clone; the committed JSON is untouched);
 *   behavioural pins read buffApply events off cfg.onEvent plus per-slug totals. Every
 *   counterfactual records how many effects it actually removed or re-triggered, so no pin can
 *   pass vacuously against an override that never carried the line.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUG = 'bready';
const SLOTS = ['skill1', 'skill2', 'burst'] as const;

type Ev = SimEvent & Record<string, any>;
type Ov = any;

interface Run {
  evs: Ev[];
  res: ReturnType<typeof runComp>;
  total: number;
}

const near = (a: unknown, b: number, tol = 0.02) =>
  typeof a === 'number' && Math.abs(a - b) <= tol;

const blocksOf = (ov: Ov): any[] =>
  SLOTS.flatMap((s) => (Array.isArray(ov?.[s]) ? (ov[s] as any[]) : []));
const effectsOf = (ov: Ov): any[] =>
  blocksOf(ov).flatMap((b) => (Array.isArray(b?.effects) ? b.effects : []));

function dropEffects(ov: Ov, pred: (e: any) => boolean): any[] {
  const dropped: any[] = [];
  for (const b of blocksOf(ov)) {
    const keep: any[] = [];
    for (const e of b.effects ?? []) {(pred(e) ? dropped : keep).push(e);}
    b.effects = keep;
  }
  return dropped;
}

function retrigger(ov: Ov, pred: (e: any) => boolean, trigger: any): number {
  let n = 0;
  for (const b of blocksOf(ov)) {
    if ((b.effects ?? []).some(pred)) {
      b.trigger = trigger;
      n += 1;
    }
  }
  return n;
}

const reverseModes = (ov: Ov) => {
  if (Array.isArray(ov.modes) && ov.modes.length > 1)
    {ov.modes = [...ov.modes].reverse();}
};

// --- effect predicates (magnitudes straight off the prose) ---
const pFbAtk = (e: any) =>
  e.kind === 'buff' && e.stat === 'atkPct' && near(e.value, 70.01);
const pBurstAtk = (e: any) =>
  e.kind === 'buff' && e.stat === 'atkPct' && near(e.value, 70.09);
const pChargeSpeed = (e: any) =>
  e.kind === 'buff' && e.stat === 'chargeSpeedPct';
const pDamageTaken = (e: any) =>
  e.kind === 'buff' && e.stat === 'damageTakenPct';
const pDot = (e: any) => e.kind === 'dot';
const pFlat = (e: any) => e.kind === 'flatDamage';
const pRecAtkDmg = (e: any) =>
  e.kind === 'buff' && e.stat === 'attackDamagePct' && near(e.value, 60.01);
const pBurstAtkDmg = (e: any) =>
  e.kind === 'buff' && e.stat === 'attackDamagePct' && near(e.value, 60.19);
const pAftertaste = (e: any) => e.kind === 'buff' && near(e.value, 349.8, 0.5);

// --- event helpers ---
const evBuff = (evs: Ev[], stat: string, value?: number) =>
  evs.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.stat === stat &&
      (value === undefined || near(e.value, value, 0.05))
  );
const evSelfBuff = (evs: Ev[], stat: string, value?: number) =>
  evBuff(evs, stat, value).filter((e) => e.targetSlug === SLUG);
const evSelfByValue = (evs: Ev[], value: number) =>
  evs.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.targetSlug === SLUG &&
      near(e.value, value, 0.5)
  );
const nFb = (r: Run) => r.evs.filter((e) => e.kind === 'fullBurstStart').length;
const teamOf = (r: Run) => {
  const t = totals(r.res) as Record<string, number>;
  const out: Record<string, number> = {};
  for (const k of Object.keys(t)) {if (k !== SLUG) {out[k] = t[k];}}
  return out;
};
const teamSum = (r: Run) => Object.values(teamOf(r)).reduce((a, b) => a + b, 0);

function exec(mutate?: (ov: Ov) => void): Run {
  const evs: Ev[] = [];
  const push = (ev: SimEvent) => {
    evs.push(ev as Ev);
  };
  const opts: any = controlComp(SLUG, true);
  if (mutate) {
    opts.overrides = {
      ...(opts.overrides ?? {}),
      [SLUG]: withPatchedOverride(SLUG, mutate),
    };
  }
  // the sim callback is documented as cfg.onEvent; set both spellings so the collector cannot
  // silently no-op. The instrumentation test below fails loudly if no events ever arrive.
  opts.onEvent = push;
  opts.cfg = { ...(opts.cfg ?? {}), onEvent: push };
  const res = runComp(opts);
  return { evs, res, total: (totals(res) as Record<string, number>)[SLUG] };
}

// ---------- structural read (no sim) ----------
let modes: string[] | undefined;
const slotCounts: Record<string, number> = {};
let inv: { slot: string; block: any; effect: any }[] = [];
withPatchedOverride(SLUG, (ov: Ov) => {
  modes = ov.modes;
  for (const s of SLOTS)
    {slotCounts[s] = Array.isArray(ov[s]) ? ov[s].length : -1;}
  inv = blocksOf(ov).flatMap((b) =>
    (b.effects ?? []).map((e: any) => ({ slot: b.slot, block: b, effect: e }))
  );
});
const findE = (pred: (e: any) => boolean) => inv.filter((r) => pred(r.effect));
const NON_PER_SHOT = [
  'passive',
  'interval',
  'burstCast',
  'fullBurstEnter',
  'fullBurstEnd',
  'stageEnter',
  'bossElement',
];

// ---------- runs (13 x 180s sims) ----------
const base = exec();
const flipped = exec(reverseModes);

const lingeringInBase = evBuff(base.evs, 'damageTakenPct', 10.2).length > 0;
const asLingering = (ov: Ov) => {
  if (!lingeringInBase) {reverseModes(ov);}
};
const asRecommended = (ov: Ov) => {
  if (lingeringInBase) {reverseModes(ov);}
};
const ling = lingeringInBase ? base : flipped;
const rec = lingeringInBase ? flipped : base;

let nDropFbAtk = 0;
const cfNoFbAtk = exec((ov) => {
  nDropFbAtk = dropEffects(ov, pFbAtk).length;
});

let nReFbAtk = 0;
const cfFbAtkAsCast = exec((ov) => {
  nReFbAtk = retrigger(ov, pFbAtk, { kind: 'burstCast' });
});

let nDropCharge = 0;
const cfNoCharge = exec((ov) => {
  nDropCharge = dropEffects(ov, pChargeSpeed).length;
});

let nFlipCharge = 0;
const cfFastCharge = exec((ov) => {
  for (const e of effectsOf(ov)) {
    if (pChargeSpeed(e)) {
      e.value = Math.abs(e.value);
      nFlipCharge += 1;
    }
  }
});

let nDropBurstAtkDmg = 0;
const cfNoBurstAtkDmg = exec((ov) => {
  nDropBurstAtkDmg = dropEffects(ov, pBurstAtkDmg).length;
});

let nReBurstAtkDmg = 0;
const cfBurstAtkDmgAsFb = exec((ov) => {
  nReBurstAtkDmg = retrigger(ov, pBurstAtkDmg, { kind: 'fullBurstEnter' });
});

// Lingering-branch counterfactuals
let nDropDmgTaken = 0;
const cfNoDmgTaken = exec((ov) => {
  asLingering(ov);
  nDropDmgTaken = dropEffects(ov, pDamageTaken).length;
});

let nDropDot = 0;
const cfNoDot = exec((ov) => {
  asLingering(ov);
  nDropDot = dropEffects(ov, pDot).length;
});

let nDropDot2 = 0;
let nDropBoost = 0;
const cfNoDotNoBoost = exec((ov) => {
  asLingering(ov);
  nDropDot2 = dropEffects(ov, pDot).length;
  nDropBoost = dropEffects(ov, pAftertaste).length;
});

// Recommended-branch counterfactuals
let nDropRecAtkDmg = 0;
const cfNoRecAtkDmg = exec((ov) => {
  asRecommended(ov);
  nDropRecAtkDmg = dropEffects(ov, pRecAtkDmg).length;
});

let recFlatPcts: number[] = [];
const cfNoFlat = exec((ov) => {
  asRecommended(ov);
  recFlatPcts = dropEffects(ov, pFlat).map((e) => e.atkPct);
});

describe('bready - instrumentation and fixture sanity', () => {
  it('the fixture actually runs, bursts, and reports events', () => {
    expect(base.evs.length).toBeGreaterThan(0);
    expect(base.total).toBeGreaterThan(0);
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
    // liter + crown + helm alongside her; helm is the second B3 the trigger pins rely on.
    expect(Object.keys(teamOf(base)).length).toBe(3);
    expect(nFb(base)).toBeGreaterThanOrEqual(3);
  });

  it('the override carries all three slots and no parser-only effect kinds', () => {
    for (const s of SLOTS) {expect(slotCounts[s]).toBeGreaterThanOrEqual(1);}
    expect(inv.length).toBeGreaterThan(0);
    expect(inv.some((r) => r.effect.kind === 'ignored')).toBe(false);
    expect(inv.some((r) => r.effect.kind === 'unsupported')).toBe(false);
  });
});

describe('bready S1a - ATK +70.01% for 10 sec on entering Full Burst', () => {
  it('is a 10s self ATK buff keyed to fullBurstEnter', () => {
    const hit = findE(pFbAtk);
    expect(hit.length).toBe(1);
    expect(hit[0].effect.durationSec).toBe(10);
    expect(hit[0].block.target.kind).toBe('self');
    expect(hit[0].block.trigger.kind).toBe('fullBurstEnter');
    const applies = evSelfBuff(base.evs, 'atkPct', 70.01);
    expect(applies.length).toBeGreaterThan(0);
    expect(applies.length).toBe(nFb(base));
  });

  it('fires on EVERY team Full Burst, not only on the rotations she casts', () => {
    // nearest-wrong: keyed to burstCast. With helm as a second B3 and a 40s CD she cannot cast
    // every rotation, so the wrong model applies the buff strictly fewer times.
    expect(nReFbAtk).toBe(1);
    const cf = evSelfBuff(cfFbAtkAsCast.evs, 'atkPct', 70.01).length;
    const baseline = evSelfBuff(base.evs, 'atkPct', 70.01).length;
    expect(cf).toBeGreaterThan(0);
    expect(cf).toBeLessThan(baseline);
  });

  it('is self-scoped: teammates are byte-identical without it', () => {
    expect(nDropFbAtk).toBe(1);
    expect(cfNoFbAtk.total).toBeLessThan(base.total);
    expect(teamOf(cfNoFbAtk)).toEqual(teamOf(base));
  });
});

describe('bready S1b/c - Taste: Charge Speed -20% for 50 sec on self', () => {
  it('both Taste branches carry a 20-point charge-speed shift for 50 sec on self', () => {
    const cs = findE(pChargeSpeed);
    expect(cs.length).toBeGreaterThanOrEqual(1);
    for (const r of cs) {
      expect(Math.abs(r.effect.value)).toBe(20);
      expect(r.effect.durationSec).toBe(50);
      expect(r.block.target.kind).toBe('self');
    }
    expect(evSelfBuff(base.evs, 'chargeSpeedPct').length).toBeGreaterThan(0);
  });

  it('the slowdown is a real weapon-state modifier and is signed DOWNWARD', () => {
    // charge speed gates shots fired, so it gates damage. Removing the debuff must RAISE her
    // damage; turning it into a +20% buff must raise it further. A sign-flipped model (encoded
    // as a charge-speed buff) inverts both inequalities.
    expect(nDropCharge).toBeGreaterThan(0);
    expect(nFlipCharge).toBeGreaterThan(0);
    expect(cfNoCharge.total).toBeGreaterThan(base.total);
    expect(cfFastCharge.total).toBeGreaterThan(cfNoCharge.total);
  });
});

describe('bready S2a - Lingering: 3 Full Charges -> Damage Taken +10.2% + Aftertaste DoT', () => {
  it('Damage Taken +10.2% for 5 sec is a boss debuff that lifts the whole team', () => {
    const dt = findE(pDamageTaken);
    expect(dt.length).toBe(1);
    expect(near(dt[0].effect.value, 10.2)).toBe(true);
    expect(dt[0].effect.durationSec).toBe(5);
    expect(dt[0].block.target.kind).toBe('enemy');
    const evs = evBuff(ling.evs, 'damageTakenPct', 10.2);
    expect(evs.length).toBeGreaterThan(3);
    expect(evs.every((e) => e.casterIdx === null && e.targetIdx === null)).toBe(
      true
    );
    // nearest-wrong: encoded as a self buff -> teammates would not move when it is removed.
    expect(nDropDmgTaken).toBe(1);
    expect(teamSum(cfNoDmgTaken)).toBeLessThan(teamSum(ling));
    expect(cfNoDmgTaken.total).toBeLessThan(ling.total);
  });

  it('Aftertaste is ONE 150.04%/sec sustained DoT of exactly 5 sec', () => {
    // the repeating-trigger DoT trap: a duration longer than 5s multiplies, because the engine
    // appends an independent instance per fire and never dedups.
    const dots = findE(pDot);
    expect(dots.length).toBe(1);
    expect(near(dots[0].effect.atkPct, 150.04, 0.05)).toBe(true);
    expect(dots[0].effect.durationSec).toBe(5);
    expect(dots[0].effect.intervalSec ?? 1).toBe(1);
    expect(dots[0].effect.flavor).toBe('sustained');
    expect(nDropDot).toBe(1);
    expect(cfNoDot.total).toBeLessThan(ling.total);
  });

  it('fires per 3 Full Charges - about a third as often as the per-charge Recommended rider', () => {
    const l = evBuff(ling.evs, 'damageTakenPct', 10.2).length;
    const r = evSelfBuff(rec.evs, 'attackDamagePct', 60.01).length;
    expect(l).toBeGreaterThan(3);
    expect(r).toBeGreaterThan(3);
    // both branches carry the same -20% charge speed, so the two runs fire near-identical charge
    // counts: a 1-per-3 trigger against a 1-per-1 trigger must sit near 3x. A per-charge model of
    // S2a lands at ~1x; a per-Full-Burst model lands far above 4.5x.
    expect(r).toBeGreaterThan(l * 2);
    expect(r).toBeLessThan(l * 4.5);
    const dt = findE(pDamageTaken)[0];
    expect(NON_PER_SHOT).not.toContain(dt.block.trigger.kind);
  });
});

describe('bready S2b/c - Recommended: per-Full-Charge rider', () => {
  it('Attack Damage +60.01% for 5 sec, self, once per Full Charge hit', () => {
    const hit = findE(pRecAtkDmg);
    expect(hit.length).toBe(1);
    expect(hit[0].effect.durationSec).toBe(5);
    expect(hit[0].block.target.kind).toBe('self');
    expect(NON_PER_SHOT).not.toContain(hit[0].block.trigger.kind);
    const applies = evSelfBuff(rec.evs, 'attackDamagePct', 60.01).length;
    expect(applies).toBeGreaterThan(0);
    // per-charge, not per-Full-Burst: she lands many charges per FB window.
    expect(applies).toBeGreaterThan(nFb(rec) * 3);
    expect(nDropRecAtkDmg).toBe(1);
    expect(cfNoRecAtkDmg.total).toBeLessThan(rec.total);
    expect(teamOf(cfNoRecAtkDmg)).toEqual(teamOf(rec));
  });

  it('265.07% of final ATK lands as DISTRIBUTED damage and is hers alone', () => {
    const fl = findE(pFlat);
    expect(fl.length).toBe(1);
    expect(near(fl[0].effect.atkPct, 265.07, 0.05)).toBe(true);
    expect(fl[0].effect.flavor).toBe('distributed');
    expect(NON_PER_SHOT).not.toContain(fl[0].block.trigger.kind);
    expect(recFlatPcts.some((p) => near(p, 265.07, 0.05))).toBe(true);
    expect(cfNoFlat.total).toBeLessThan(rec.total);
    expect(teamOf(cfNoFlat)).toEqual(teamOf(rec));
  });
});

describe('bready burst - 60.19% / 349.8% / 70.09%', () => {
  it('Ba Attack Damage +60.19% for 10 sec fires on HER cast, not on every Full Burst', () => {
    const hit = findE(pBurstAtkDmg);
    expect(hit.length).toBe(1);
    expect(hit[0].effect.durationSec).toBe(10);
    expect(hit[0].block.target.kind).toBe('self');
    expect(hit[0].block.trigger.kind).toBe('burstCast');
    const c = evSelfBuff(base.evs, 'attackDamagePct', 60.19).length;
    expect(c).toBeGreaterThan(0);
    expect(c).toBeLessThan(nFb(base));
    // nearest-wrong: re-keyed to fullBurstEnter -> it applies on helm rotations too and
    // over-credits her damage.
    expect(nReBurstAtkDmg).toBe(1);
    const cf = evSelfBuff(
      cfBurstAtkDmgAsFb.evs,
      'attackDamagePct',
      60.19
    ).length;
    expect(cf).toBe(nFb(cfBurstAtkDmgAsFb));
    expect(cf).toBeGreaterThan(c);
    expect(cfBurstAtkDmgAsFb.total).toBeGreaterThan(base.total);
  });

  it('Ba is self-scoped', () => {
    expect(nDropBurstAtkDmg).toBe(1);
    expect(cfNoBurstAtkDmg.total).toBeLessThan(base.total);
    expect(teamOf(cfNoBurstAtkDmg)).toEqual(teamOf(base));
  });

  it('Bb Aftertaste Effect +349.8% for 10 sec is scoped to the Aftertaste DoT only', () => {
    const b = findE(pAftertaste);
    expect(b.length).toBe(1);
    expect(b[0].effect.durationSec).toBe(10);
    expect(b[0].block.target.kind).toBe('self');
    // a generic bucket would also inflate her normal attacks and the distributed rider.
    expect([
      'atkPct',
      'attackDamagePct',
      'critDamagePct',
      'elementDamagePct',
    ]).not.toContain(b[0].effect.stat);
    expect(evSelfByValue(ling.evs, 349.8).length).toBeGreaterThan(0);
    // inertness: with the Aftertaste DoT deleted the boost must move NOTHING.
    expect(nDropDot2).toBe(1);
    expect(nDropBoost).toBe(1);
    expect(cfNoDotNoBoost.total).toBeCloseTo(cfNoDot.total, 3);
  });

  it('Bc ATK +70.09% for 10 sec is burst-cast keyed and Recommended-only', () => {
    const hit = findE(pBurstAtk);
    expect(hit.length).toBe(1);
    expect(hit[0].effect.durationSec).toBe(10);
    expect(hit[0].block.target.kind).toBe('self');
    expect(hit[0].block.trigger.kind).toBe('burstCast');
    expect(evSelfBuff(rec.evs, 'atkPct', 70.09).length).toBeGreaterThan(0);
    expect(evSelfBuff(ling.evs, 'atkPct', 70.09).length).toBe(0);
  });
});

describe('bready - Taste exclusivity', () => {
  it('the two Tastes are a mutually exclusive mode pair', () => {
    expect(Array.isArray(modes)).toBe(true);
    expect((modes ?? []).length).toBe(2);
  });

  it('exactly one Taste branch is live per run, and flipping the default swaps it', () => {
    // Lingering run: the S2a boss debuff fires and the Recommended rider never does.
    expect(evBuff(ling.evs, 'damageTakenPct', 10.2).length).toBeGreaterThan(0);
    expect(evSelfBuff(ling.evs, 'attackDamagePct', 60.01).length).toBe(0);
    // Recommended run: the mirror image.
    expect(
      evSelfBuff(rec.evs, 'attackDamagePct', 60.01).length
    ).toBeGreaterThan(0);
    expect(evBuff(rec.evs, 'damageTakenPct', 10.2).length).toBe(0);
    // the burst branches follow their Taste.
    expect(evSelfByValue(ling.evs, 349.8).length).toBeGreaterThan(0);
    expect(evSelfByValue(rec.evs, 349.8).length).toBe(0);
    expect(ling.total).not.toBe(rec.total);
  });

  it.skip('GAP: -This effect cannot be removed- has no counterpart primitive', () => {
    // Nothing in the v1 engine strips a buff off an ally (buffRemove fires only for
    // removeOnReload), so buff-removal immunity is untestable and behaviourally inert.
  });

  it.skip('GAP: Taste ENTRY trigger (gaining a sustained / distributed damage buff)', () => {
    // No trigger primitive observes an incoming buff by the damage class it boosts, so the two
    // Tastes can only be a mode pair. WHICH Taste is the default is a modeling choice, not
    // derivable from the prose - flag, do not assert.
  });

  it.skip('GAP: -Cancels the other Taste- transition', () => {
    // Mutual cancellation is a state machine over the (untriggerable) entry conditions; a mode
    // pair encodes the exclusivity but not the in-fight switch, so there is nothing to observe.
  });

  it.skip('GAP: noFb / noRange / crit disposition of the Aftertaste DoT and the 265.07% rider', () => {
    // Per-kit noFb and DoT-crit are measurement-gated (popup reads), not derivable from prose.
  });
});
