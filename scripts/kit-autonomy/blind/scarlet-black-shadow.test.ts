/**
 * scarlet-black-shadow — Scarlet: Black Shadow (RL / Wind / Attacker / Burst III, cd 40s,
 * ammo 9, reload 152f, charge 18f, 1 hit/shot, normal 57.29%, core 200%).
 *
 * BLIND spec: written from the kit prose ALONE (no sight of the committed override, the driver's
 * tests, or any truth file). Each group states the kit line, then an assertion that is GREEN under
 * the literal reading and RED under the nearest-wrong model.
 *
 * KIT (structure, not prose):
 *   skill1  "Activates when performing a Full Charge attack." — effects vary with the number of
 *           attacks, ONLY ONE fires at a time:
 *             3 times -> 1 enemy with lowest final DEF, 283.03% of final ATK
 *             6 times -> enemies within range, 565% Distributed Damage
 *             9 times -> all enemies, 848.03% Distributed Damage
 *   skill2  "Activates when entering Full Burst. Affects self." — Max Ammunition +60% for 10 sec,
 *           Reload 100% of the magazine.
 *   burst   Affects self — changes the Full Charge count required for skill1 to 1/2/3 for 10 sec,
 *           ATK +115.12% for 10 sec, Charge Damage +169.63% for 10 sec.
 *
 * FIXTURE: controlComp(SLUG, true) = liter(B1) + crown(B2) + scarlet-black-shadow(B3) + helm(B3).
 *   helm=true is LOAD-BEARING, not cosmetic. It is the only way to separate the two trigger
 *   identities this kit puts side by side: skill2 is "when entering Full Burst" (fires on EVERY
 *   team Full Burst) while the burst slot is a self-buff on HER OWN cast. With a 40s cooldown and
 *   helm covering the intervening rotations, the counts diverge, so
 *   #fullBurstStart == #maxAmmo-applies  AND  #burst-self-buff-applies < #fullBurstStart
 *   is itself the discriminating assertion (no patch needed): keying skill2 to burst-cast, or the
 *   burst buffs to full-burst-enter, breaks one of the two.
 *
 * SHAPE NOTE: the two OverrideFile descriptions in the harness packet disagree (slot -> Block[]
 * vs slot -> CharacterSkills{blocks}). blocksOf() accepts BOTH and mutates in place, so every
 * counterfactual is shape-agnostic and keys only on documented effect kinds / StatKeys. No trigger
 * kind is ever named here: the schema's full-charge trigger identifier is redacted in this packet,
 * so every trigger claim below is tested BEHAVIOURALLY.
 *
 * RUNS: 10 (BASE + 9 counterfactuals), all hoisted to module scope.
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

const SLUG = 'scarlet-black-shadow';
const TEAM = ['liter', 'crown', 'helm'];

// kit magnitudes — ground truth, read literally off the prose
const T3 = 283.03;
const T6 = 565;
const T9 = 848.03;
const BURST_ATK = 115.12;
const BURST_CHARGE = 169.63;
const AMMO_PCT = 60;

type Ev = SimEvent & Record<string, any>;
type Slot = 'skill1' | 'skill2' | 'burst';
const SLOTS: Slot[] = ['skill1', 'skill2', 'burst'];

// ---------------------------------------------------------------- override walkers (shape-agnostic)
const blocksOf = (ov: any, slot: Slot): any[] => {
  const s = ov?.[slot];
  if (!s) {return [];}
  if (Array.isArray(s)) {return s;}
  return Array.isArray(s.blocks) ? s.blocks : [];
};

const walk = (effects: any[], out: any[]): any[] => {
  for (const e of effects ?? []) {
    out.push(e);
    if (e?.kind === 'escalating' && Array.isArray(e.steps)) {walk(e.steps, out);}
  }
  return out;
};

const effectsOf = (ov: any, slot: Slot | 'all'): any[] => {
  const slots = slot === 'all' ? SLOTS : [slot];
  const out: any[] = [];
  for (const s of slots)
    {for (const b of blocksOf(ov, s)) {walk(b.effects ?? [], out);}}
  return out;
};

const chargePayloads = (ov: any): any[] =>
  effectsOf(ov, 'skill1').filter((e) => e.kind === 'flatDamage');

// ---------------------------------------------------------------- runner
interface Run {
  total: number;
  events: Ev[];
  res: any;
}

function run(mutate?: (ov: any) => void): Run {
  const events: Ev[] = [];
  const opts: any = controlComp(SLUG, true);
  opts.cfg = {
    ...(opts.cfg ?? {}),
    onEvent: (ev: SimEvent) => {
      events.push(ev as Ev);
    },
  };
  if (mutate) {
    opts.overrides = {
      ...(opts.overrides ?? {}),
      [SLUG]: withPatchedOverride(SLUG, mutate),
    };
  }
  const res = runComp(opts);
  return { total: totals(res)[SLUG], events, res };
}

// ---------------------------------------------------------------- mutators
const zeroRank = (rank: number) => (ov: any) => {
  const sorted = chargePayloads(ov)
    .slice()
    .sort((a, b) => (a.atkPct ?? 0) - (b.atkPct ?? 0));
  if (sorted[rank]) {sorted[rank].atkPct = 0;}
};
const zeroAllPayloads = (ov: any) => {
  for (const e of chargePayloads(ov)) {e.atkPct = 0;}
};
const setBuffValue = (stat: string, value: number) => (ov: any) => {
  for (const e of effectsOf(ov, 'all'))
    {if (e.kind === 'buff' && e.stat === stat) {e.value = value;}}
};
const restatBuff = (from: string, to: string) => (ov: any) => {
  for (const e of effectsOf(ov, 'all'))
    {if (e.kind === 'buff' && e.stat === from) {e.stat = to;}}
};
const dropKind = (kind: string) => (ov: any) => {
  for (const s of SLOTS) {
    for (const b of blocksOf(ov, s))
      {b.effects = (b.effects ?? []).filter((e: any) => e.kind !== kind);}
  }
};

// ---------------------------------------------------------------- event readers
const applies = (r: Run, stat: string, value: number): Ev[] =>
  r.events.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.stat === stat &&
      e.targetSlug === SLUG &&
      Math.abs((e.value ?? 0) - value) < 0.005
  );

const fbStarts = (r: Run): number =>
  r.events.filter((e) => e.kind === 'fullBurstStart').length;

/** scarlet's own damage events: prefer the per-unit result row, fall back to the global log. */
const myDamage = (r: Run): any[] => {
  const row: any = unitOf(r.res, SLUG);
  const rowEv: any[] = Array.isArray(row?.events) ? row.events : [];
  const fromRow = rowEv.filter((e) => e?.kind === 'damage');
  if (fromRow.length) {return fromRow;}
  const keys = [
    'slug',
    'unit',
    'unitSlug',
    'srcSlug',
    'casterSlug',
    'sourceSlug',
  ];
  return r.events.filter(
    (e) => e.kind === 'damage' && keys.some((k) => (e as any)[k] === SLUG)
  );
};

// ---------------------------------------------------------------- hoisted runs (10 x 180s sims)
const OV: any = withPatchedOverride(SLUG, () => {}); // read-only clone of the committed override

const BASE = run();
const NO_PAYLOADS = run(zeroAllPayloads);
const ZERO_T3 = run(zeroRank(0));
const ZERO_T6 = run(zeroRank(1));
const ZERO_T9 = run(zeroRank(2));
const NO_BURST_ATK = run(setBuffValue('atkPct', 0));
const NO_BURST_CHARGE = run(setBuffValue('chargeDamagePct', 0));
const CHARGE_AS_ATTACK = run(restatBuff('chargeDamagePct', 'attackDamagePct'));
const NO_AMMO = run(setBuffValue('maxAmmoPct', 0));
const NO_INSTANT_RELOAD = run(dropKind('instantReload'));

// =====================================================================================
describe('scarlet-black-shadow / fixture sanity', () => {
  it('the control comp actually bursts and she actually deals damage', () => {
    // Non-vacuity for every group below: a lone B3 makes ZERO full bursts, which would make the
    // full-burst-keyed skill2 and the burst slot silently untested.
    expect(BASE.total).toBeGreaterThan(0);
    expect(fbStarts(BASE)).toBeGreaterThanOrEqual(4);
  });
});

// =====================================================================================
describe('scarlet-black-shadow / skill1 — Full Charge phase ladder (structure)', () => {
  it('encodes exactly three full-charge payloads, at the three kit magnitudes', () => {
    // "Only one effect is triggered at a time" + three named tiers => three payloads, one per phase.
    // RED under: a merged single payload, a 2-tier reading, or Distributed Damage silently divided
    // by an enemy count (565 -> 282.5 would collide with the 3-times tier).
    const tiers = chargePayloads(OV)
      .map((e) => e.atkPct)
      .sort((a, b) => a - b);
    expect(tiers).toHaveLength(3);
    expect(tiers[0]).toBeCloseTo(T3, 2);
    expect(tiers[1]).toBeCloseTo(T6, 2);
    expect(tiers[2]).toBeCloseTo(T9, 2);
  });

  it('no payload claims a core strike and none is authored as a DoT', () => {
    // Taxonomy 9: a rider gets NO core unless the text says "core strike damage"; this kit does not.
    // RED under core:true (which would multiply by the 200% core multiplier) or a dot encoding.
    const eff = chargePayloads(OV);
    expect(eff.length).toBe(3);
    for (const e of eff) {expect(e.core ?? false).toBe(false);}
    expect(effectsOf(OV, 'skill1').some((e) => e.kind === 'dot')).toBe(false);
  });
});

describe('scarlet-black-shadow / skill1 — every tier is live, and the ladder is ordered', () => {
  it('skill1 carries a material share of her damage', () => {
    // RED under: payloads authored but never triggered (a threshold she can never reach), which is
    // the classic silent-vacuity failure for a phase-counter kit.
    expect(NO_PAYLOADS.total).toBeLessThan(BASE.total * 0.97);
  });

  it('all three phases are actually reached at least once', () => {
    // Zeroing each tier in isolation must cost damage. RED under a 9-times phase that is never
    // reached (e.g. a counter that resets on reload, or per-phase thresholds read as 9/18/27).
    expect(BASE.total - ZERO_T3.total).toBeGreaterThan(0);
    expect(BASE.total - ZERO_T6.total).toBeGreaterThan(0);
    expect(BASE.total - ZERO_T9.total).toBeGreaterThan(0);
  });

  it('the tiers fire equally often, so their damage shares track 283 : 565 : 848', () => {
    // Each tier fires once per 9-charge cycle, so the per-tier contribution ratio must mirror the
    // magnitude ratio (~1 : 2 : 3). RED under a uniform-payload model (all three the same value)
    // and under a mis-ordered ladder (the big payload wired to the 3-times phase).
    const d3 = BASE.total - ZERO_T3.total;
    const d6 = BASE.total - ZERO_T6.total;
    const d9 = BASE.total - ZERO_T9.total;
    expect(d6).toBeGreaterThan(d3 * 1.3);
    expect(d9).toBeGreaterThan(d3 * 2);
    expect(d9).toBeGreaterThan(d6);
  });
});

describe('scarlet-black-shadow / skill1 — trigger identity is charge-counted, not per-shot', () => {
  const dmg = myDamage(BASE);
  const riders = dmg.filter((e) => e.srcSlot === 'skill1');
  const shots = dmg.filter((e) => e.srcSlot !== 'skill1');

  it('her damage log resolves into shots and skill1 riders', () => {
    expect(dmg.length).toBeGreaterThan(0);
    expect(riders.length).toBeGreaterThan(0);
    expect(shots.length).toBeGreaterThan(0);
  });

  it('roughly one rider per three full charges — not one per charge, not three per cycle', () => {
    // 3 riders per 9-charge cycle = 0.33 riders/charge outside burst, lifted only inside her own
    // burst window. RED under "all three effects fire together" (1.0) and under a shotFired /
    // every-3-hits-fires-everything reading (~1.0-3.0).
    const perCharge = riders.length / shots.length;
    expect(perCharge).toBeGreaterThan(0.15);
    expect(perCharge).toBeLessThan(0.8);
  });
});

// =====================================================================================
describe('scarlet-black-shadow / burst — required charge count drops to 1/2/3 for 10 sec', () => {
  // No EffectDef in the schema expresses "changes the required attack count", so this line can only
  // live inside the (redacted) full-charge trigger — a blind counterfactual cannot switch it off.
  // It IS observable, though: with thresholds 1/2/3 the cycle shortens from 9 charges to 3, so the
  // riders-per-charge rate must be materially HIGHER inside Full Burst than outside it. The lift is
  // diluted (helm's Full Bursts carry no reduction), hence the deliberately loose 1.15x bar.
  // A RED here is the payload: it means the reduction is unmodeled and skill1 under-fires in burst.
  const dmg = myDamage(BASE);
  const riders = dmg.filter((e) => e.srcSlot === 'skill1');
  const shots = dmg.filter((e) => e.srcSlot !== 'skill1');
  const inFb = (a: any[]) => a.filter((e) => e.inFullBurst).length;

  it('the fixture exercises BOTH the reduced and the unreduced case', () => {
    // Non-vacuity for a gated line: riders and charges must exist on both sides of the FB boundary.
    expect(inFb(riders)).toBeGreaterThan(0);
    expect(riders.length - inFb(riders)).toBeGreaterThan(0);
    expect(inFb(shots)).toBeGreaterThan(0);
    expect(shots.length - inFb(shots)).toBeGreaterThan(0);
  });

  it('riders per charge is higher inside Full Burst than outside it', () => {
    const rIn = inFb(riders);
    const rOut = riders.length - rIn;
    const sIn = inFb(shots);
    const sOut = shots.length - sIn;
    expect(rIn / sIn).toBeGreaterThan((rOut / sOut) * 1.15);
  });

  it.skip('strict: the 1/2/3 thresholds themselves (needs the full-charge trigger identifier, redacted in this packet)', () => {});
});

describe('scarlet-black-shadow / burst — self ATK +115.12% and Charge Damage +169.63% for 10 sec', () => {
  const atk = applies(BASE, 'atkPct', BURST_ATK);
  const chg = applies(BASE, 'chargeDamagePct', BURST_CHARGE);

  it('both buffs land on herself, at the kit magnitudes, on the same activations', () => {
    expect(atk.length).toBeGreaterThanOrEqual(3);
    expect(chg.length).toBe(atk.length);
    for (const e of [...atk, ...chg]) {expect(e.targetSlug).toBe(SLUG);}
  });

  it('they are 10-second windows, not round-counted and not permanent', () => {
    // Taxonomy 2: "for 10 sec" is wall-clock. RED under durationShots (round-count) encoding and
    // under a permanent buff (no expiry frame).
    for (const e of [...atk, ...chg]) {
      expect(e.durationShots).toBeUndefined();
      expect(Number.isFinite(e.expiresFrame)).toBe(true);
    }
  });

  it('they fire on HER OWN burst only — strictly fewer times than the team full-bursts', () => {
    // Taxonomy 3: a self buff in her own burst block is burst-cast scoped. Her cd is 40s and helm is
    // the co-B3, so full bursts outnumber her casts. RED under a full-burst-enter keying (counts
    // would be equal), which is exactly the over-crediting failure mode for a multi-B3 comp.
    expect(atk.length).toBeLessThan(fbStarts(BASE));
  });

  it('the ATK buff moves her damage and NOTHING on her teammates', () => {
    // "Affects self" — inertness. Magnitude-only patch, so shot counts / rotation are untouched and
    // teammate totals must be byte-identical. RED under an allies-scoped ATK buff.
    expect(NO_BURST_ATK.total).toBeLessThan(BASE.total);
    for (const slug of TEAM) {
      expect(totals(NO_BURST_ATK.res)[slug]).toBe(totals(BASE.res)[slug]);
    }
  });

  it('Charge Damage is charge-bucket scoped, not a generic Damage-Up buff', () => {
    // Taxonomy 1 / bucket scope: chargeDamagePct is additive in the charge bucket and cannot touch
    // her flat skill1 riders, while attackDamagePct would (and dilutes differently against helm's
    // and liter's Damage-Up buffs). RED under a generic attackDamagePct mis-encoding.
    expect(NO_BURST_CHARGE.total).toBeLessThan(BASE.total);
    expect(CHARGE_AS_ATTACK.total).not.toBe(BASE.total);
  });
});

// =====================================================================================
describe('scarlet-black-shadow / skill2 — entering Full Burst: Max Ammo +60% for 10 sec, full reload', () => {
  const ammo = applies(BASE, 'maxAmmoPct', AMMO_PCT);

  it('fires on EVERY team Full Burst, not only on her own rotations', () => {
    // Taxonomy 3, the sharpest discriminator this kit offers: "when entering Full Burst" must match
    // the full-burst count exactly, and must therefore exceed her own burst-cast count (asserted
    // above). RED under a burst-cast keying, which would under-fire on helm's rotations.
    expect(ammo.length).toBe(fbStarts(BASE));
    expect(ammo.length).toBeGreaterThan(
      applies(BASE, 'atkPct', BURST_ATK).length
    );
  });

  it('is a percentage capacity buff on herself for a 10-second window', () => {
    // RED under maxAmmoFlat (60 rounds on a 9-round magazine) and under a round-counted duration.
    expect(ammo.length).toBeGreaterThan(0);
    for (const e of ammo) {
      expect(e.stat).toBe('maxAmmoPct');
      expect(e.targetSlug).toBe(SLUG);
      expect(e.durationShots).toBeUndefined();
      expect(Number.isFinite(e.expiresFrame)).toBe(true);
    }
    expect(applies(BASE, 'maxAmmoFlat', AMMO_PCT).length).toBe(0);
  });

  it('the capacity buff is DAMAGE — zeroing it costs her damage', () => {
    // Taxonomy 6: ammo capacity gates shots fired on a 9-round / 152-frame-reload RL, so a
    // "defensive, skip it" reading is wrong. RED under an unmodelled / ignored ammo line.
    expect(NO_AMMO.total).toBeLessThan(BASE.total);
  });

  it('"Reload 100% of the magazine" is modelled and is worth damage on its own', () => {
    // A free full magazine at every FB entry buys shots inside the +50% window; over ~8 entries she
    // is essentially never already full. RED if the reload line was dropped as cosmetic.
    expect(effectsOf(OV, 'all').some((e) => e.kind === 'instantReload')).toBe(
      true
    );
    expect(NO_INSTANT_RELOAD.total).toBeLessThan(BASE.total);
  });
});

// =====================================================================================
describe('scarlet-black-shadow / inertness — nothing in this kit touches an ally', () => {
  it('none of her three self-buff magnitudes ever lands on a teammate', () => {
    // Every buff line in the kit says "Affects self". RED under any allies-scoped mis-encoding.
    const signature = (e: Ev) =>
      (e.stat === 'atkPct' && Math.abs((e.value ?? 0) - BURST_ATK) < 0.005) ||
      (e.stat === 'chargeDamagePct' &&
        Math.abs((e.value ?? 0) - BURST_CHARGE) < 0.005) ||
      (e.stat === 'maxAmmoPct' && Math.abs((e.value ?? 0) - AMMO_PCT) < 0.005);
    for (const slug of TEAM) {
      expect(
        BASE.events.filter(
          (e) => e.kind === 'buffApply' && e.targetSlug === slug && signature(e)
        ).length
      ).toBe(0);
    }
  });

  it('the kit inflicts no boss debuff and grants no gauge / heal / shield / swap', () => {
    // The prose has no Damage Taken, no heal, no shield, no gauge fill and no weapon change; an
    // override carrying any of those invented a mechanic.
    const kinds = new Set(effectsOf(OV, 'all').map((e) => e.kind));
    for (const forbidden of [
      'heal',
      'shield',
      'fillGauge',
      'weaponSwap',
      'targetStatus',
      'stun',
      'gainPierce',
    ]) {
      expect(kinds.has(forbidden)).toBe(false);
    }
    expect(
      effectsOf(OV, 'all').some(
        (e) => e.kind === 'buff' && e.stat === 'damageTakenPct'
      )
    ).toBe(false);
  });
});

// =====================================================================================
describe('scarlet-black-shadow / GAPs (unobservable in the v1 single-boss fixture)', () => {
  it.skip('Distributed Damage actually splits across multiple enemies (v1 has one boss; no multi-enemy fixture exists)', () => {});
  it.skip('"1 enemy with the lowest final DEF" vs "enemies within range" vs "all enemies" are distinguishable (all three collapse to the single partless scope-lock boss)', () => {});
  it.skip('Max Ammo +60% rounding on a 9-round magazine (9 x 1.6 = 14.4 -> 14?): the engine exposes no magazine-size event, only shot-count sensitivity', () => {});
});
