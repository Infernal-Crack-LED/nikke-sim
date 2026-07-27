/**
 * anis-star -- 'Anis: Star'. RL / Electric / Defender / Burst I.
 * Base: cd 20 s, ammo 6, reload 141 f, charge 60 f (= 1.00 s), hitsPerShot 2,
 *       normalAttackMultiplier 61.3, coreAttackMultiplier 200.
 *
 * BLIND kit-spec test: authored from the kit prose ALONE. The driver's override,
 * tests and reasoning were not consulted. Every assertion is derived from the kit
 * text and is written to be GREEN under the literal reading and RED under the
 * nearest-wrong model named in its comment.
 *
 * KIT (structural summary)
 *  S1-a  passive, all allies ...... Burst Gauge filling speed +6%, continuous
 *  S1-b  battle start + FB end ..... squad-formation branch, ONE set applies:
 *          no other B1 : self 'My Own Star' ATK +40.01% continuous
 *                        + all allies Burst Skill cooldown -7.48 s
 *          other B1(s) : self 'Everyone's Star' (re-enter burst at stage 1)
 *  S1-c  on landing a Full Charge .. 120.13% of final ATK as additional damage
 *  S2-a  FB enter, My Own Star ..... all allies ATK +35.01% OF THE CASTER'S ATK, 10 s
 *  S2-b  Full Charge, Everyone's ... all allies heal 1.26% of caster final max HP
 *  S2-c  FB enter .................. self + lower-DEF allies, Projectile Explosion +92.03%, 10 s
 *  S2-d  FB enter .................. all allies Attack Damage +34%, 10 s
 *  B-a   self ...................... Shooting Stars 40.01% of final ATK / 0.25 s for 10 s
 *  B-b   self ...................... charge time FIXED at 0.7 s for 10 s
 *                                    (clamp; no clamp primitive -> ~+42.86% chargeSpeedPct)
 *  B-c   self ...................... Explosion Radius +100% for 10 s (no primitive)
 *  B-d   self ...................... DEF +55.01% for 10 s (inert in v1)
 *  B-e   My Own Star ............... self Attack Damage +35.2%, 10 s
 *  B-f   Everyone's Star ........... all allies Max HP +15.02% of caster max HP, 10 s
 *
 * FIXTURE NOTE (load-bearing). anis-star is BURST I and controlComp always seats
 * liter (B1). The fixture therefore sits permanently in the 'there ARE other
 * Burst 1 allies' branch: Everyone's Star is live and every My-Own-Star line
 * (S1-b ATK, the -7.48 s CDR, S2-a, B-e) is INERT by kit rule. Those lines are
 * tested twice: (i) provably inert in the shipped fixture, (ii) live and
 * correctly signed under an ungateNoB1 counterfactual -- that pair is the
 * non-vacuity proof for the formation gate.
 * For the same reason liter, not anis, takes the Burst-I slot, so her own burst
 * block would never fire; a burstFirst patch is injected to make her cast, else
 * the entire burst slot would be untested (a lone-tier carry that never casts
 * silently green-lights any burst model).
 *
 * PATCH CHANNEL. All counterfactuals go through withPatchedOverride + an
 * overrides entry on the comp options; the harness-contract group below proves
 * the channel is live (a zeroed rider must move anis damage), so no later
 * counterfactual can pass vacuously.
 */
import { describe, expect, it } from 'vitest';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

const SLUG = 'anis-star';
/** controlComp seats liter (B1) / crown (B2) / <carry> / helm (B3): the carry is index 2. */
const ANIS_IDX = 2;

type Ev = any;
type Mut = (o: any) => void;

// ---------------------------------------------------------------- override surgery
// Structure-agnostic: blocks are matched by effect KIND + magnitude, never by
// authoring order, so the counterfactuals survive any faithful encoding.
const blocksOf = (o: any): any[] => o?.blocks ?? o?.skills?.blocks ?? [];
function eachEffect(o: any, fn: (e: any, b: any) => void) {
  for (const b of blocksOf(o)) {for (const e of b.effects ?? []) {fn(e, b);}}
}
const near = (a: number, b: number, eps = 0.5) =>
  Math.abs((a ?? NaN) - b) <= eps;
const compose =
  (...ms: Mut[]): Mut =>
  (o) => {
    for (const m of ms) {m(o);}
  };

/** drop the 'no other Burst 1 allies' gate -> the My Own Star branch goes live in a liter comp */
const ungateNoB1: Mut = (o) => {
  for (const b of blocksOf(o)) {if (b.formation === 'noB1') {delete b.formation;}}
};
const zeroBuff =
  (stat: string, value?: number): Mut =>
  (o) =>
    eachEffect(o, (e) => {
      if (
        e.kind === 'buff' &&
        e.stat === stat &&
        (value === undefined || near(e.value, value))
      )
        {e.value = 0;}
    });
const zeroRider: Mut = (o) =>
  eachEffect(o, (e) => {
    if (e.kind === 'flatDamage' && near(e.atkPct, 120.13, 5)) {e.atkPct = 0;}
  });
const zeroStars: Mut = (o) =>
  eachEffect(o, (e) => {
    if (e.kind === 'dot') {e.atkPct = 0;}
  });
const zeroCdr: Mut = (o) =>
  eachEffect(o, (e) => {
    if (e.kind === 'burstCdr') {e.seconds = 0;}
  });
const cdrOncePerBattle: Mut = (o) =>
  eachEffect(o, (e) => {
    if (e.kind === 'burstCdr') {e.oncePerBattle = true;}
  });
const casterAtkToOwnAtk: Mut = (o) =>
  eachEffect(o, (e) => {
    if (e.kind === 'buff' && e.stat === 'casterAtkPct') {e.stat = 'atkPct';}
  });
const dropHeals: Mut = (o) => {
  const bs = blocksOf(o);
  for (const b of bs)
    {b.effects = (b.effects ?? []).filter((e: any) => e.kind !== 'heal');}
  const keep = bs.filter((b: any) => (b.effects ?? []).length > 0);
  bs.length = 0;
  for (const b of keep) {bs.push(b);}
};
/** make anis win the Burst-I slot over liter so her own burst block is exercised at all */
const takeBurstFirst: Mut = (o) => {
  blocksOf(o).push({
    slot: 'skill1',
    trigger: { kind: 'passive' },
    target: { kind: 'self' },
    effects: [{ kind: 'burstFirst' }],
  });
};

/** the committed override, captured through the patch clone (never mutated) */
let OVR: any = null;
withPatchedOverride(SLUG, (o: any) => {
  OVR = JSON.parse(JSON.stringify(o));
});
const allEffects = (): any[] => {
  const out: any[] = [];
  eachEffect(OVR, (e) => out.push(e));
  return out;
};

// ---------------------------------------------------------------- run helper
function go(comp: any, mutate?: Mut) {
  const evs: Ev[] = [];
  const opts: any = {
    ...comp,
    cfg: { ...(comp.cfg ?? {}), onEvent: (e: Ev) => evs.push(e) },
  };
  if (mutate) {
    const patched = withPatchedOverride(SLUG, mutate);
    opts.overrides = { ...(comp.overrides ?? {}), [SLUG]: patched };
    opts.override = patched;
  }
  return { res: runComp(opts), evs };
}

// ---------------------------------------------------------------- event selectors
const ownerOf = (e: Ev): number | undefined =>
  e.unitIdx ?? e.srcIdx ?? e.slotIdx ?? e.idx;
const tOf = (e: Ev): number | undefined =>
  e.t ??
  e.time ??
  e.sec ??
  (typeof e.frame === 'number' ? e.frame / 60 : undefined);
const amtOf = (e: Ev): number => e.amount ?? e.damage ?? e.dmg ?? e.value ?? 0;
const coreRateOf = (e: Ev): number | undefined =>
  e.coreRate ?? e.core ?? e.coreRateApplied;
const of_ = (evs: Ev[], kind: string) => evs.filter((e) => e.kind === kind);
const anisDamage = (evs: Ev[]) =>
  of_(evs, 'damage').filter((e) => ownerOf(e) === ANIS_IDX);
const sumAnis = (evs: Ev[]) =>
  anisDamage(evs).reduce((a, e) => a + amtOf(e), 0);
const sumTeam = (evs: Ev[]) =>
  of_(evs, 'damage').reduce((a, e) => a + amtOf(e), 0);
const sumOthers = (evs: Ev[]) =>
  of_(evs, 'damage')
    .filter((e) => ownerOf(e) !== ANIS_IDX)
    .reduce((a, e) => a + amtOf(e), 0);
const fbCount = (evs: Ev[]) => of_(evs, 'fullBurstStart').length;
const anisCasts = (evs: Ev[]) =>
  of_(evs, 'burstCast').filter(
    (e) => ownerOf(e) === ANIS_IDX || e.casterIdx === ANIS_IDX
  ).length;
/** buffApply of a stat, boss-held debuffs (targetIdx null) filtered out per harness note */
const applies = (evs: Ev[], stat: string, value?: number) =>
  of_(evs, 'buffApply').filter(
    (e) =>
      e.stat === stat &&
      e.targetIdx !== null &&
      e.targetIdx !== undefined &&
      (value === undefined || near(e.value, value))
  );
const targetsOf = (evs: Ev[], stat: string, value?: number) =>
  new Set(applies(evs, stat, value).map((e) => e.targetIdx));
const relDiff = (a: number, b: number) =>
  Math.abs(a - b) / Math.max(1, Math.abs(a));

// ---------------------------------------------------------------- hoisted runs (17 x 180 s)
const BASE = go(controlComp(SLUG, true));
const NO_RIDER = go(controlComp(SLUG, true), zeroRider);
const NO_EXPL = go(
  controlComp(SLUG, true),
  zeroBuff('projectileExplosionPct', 92.03)
);
const NO_ATKDMG = go(controlComp(SLUG, true), zeroBuff('attackDamagePct', 34));

const UNGATED = go(controlComp(SLUG, true), ungateNoB1);
const UNGATED_NO_MOS = go(
  controlComp(SLUG, true),
  compose(ungateNoB1, zeroBuff('atkPct', 40.01))
);
const UNGATED_NO_CDR = go(
  controlComp(SLUG, true),
  compose(ungateNoB1, zeroCdr)
);
const UNGATED_CDR_ONCE = go(
  controlComp(SLUG, true),
  compose(ungateNoB1, cdrOncePerBattle)
);
const UNGATED_SELFSCALE = go(
  controlComp(SLUG, true),
  compose(ungateNoB1, casterAtkToOwnAtk)
);

// helm off: helm also heals, which would keep crown's on-recovery trigger saturated and
// mask anis's Everyone's Star heal entirely.
const NH_BASE = go(controlComp(SLUG, false));
const NH_NOHEAL = go(controlComp(SLUG, false), dropHeals);

const CAST = go(controlComp(SLUG, true), takeBurstFirst);
const CAST_NO_STARS = go(
  controlComp(SLUG, true),
  compose(takeBurstFirst, zeroStars)
);
const CAST_NO_CHARGE = go(
  controlComp(SLUG, true),
  compose(takeBurstFirst, zeroBuff('chargeSpeedPct'))
);
const CAST_NO_DEF = go(
  controlComp(SLUG, true),
  compose(takeBurstFirst, zeroBuff('defPct', 55.01))
);
const CAST_NO_MAXHP = go(
  controlComp(SLUG, true),
  compose(takeBurstFirst, zeroBuff('casterMaxHpPct', 15.02))
);
const CAST_UNGATED = go(
  controlComp(SLUG, true),
  compose(takeBurstFirst, ungateNoB1)
);

// ================================================================================
describe('anis-star :: harness + patch-channel contract', () => {
  it('the fixture runs, anis deals damage, and events expose owner + time', () => {
    expect(totals(BASE.res)).toBeTruthy();
    expect(unitOf(BASE.res, SLUG)).toBeTruthy();
    expect(of_(BASE.evs, 'damage').length).toBeGreaterThan(0);
    // if these fail the selector field names are wrong -- every later assertion would be vacuous
    expect(of_(BASE.evs, 'damage').some((e) => ownerOf(e) !== undefined)).toBe(
      true
    );
    expect(of_(BASE.evs, 'damage').some((e) => tOf(e) !== undefined)).toBe(
      true
    );
    expect(anisDamage(BASE.evs).length).toBeGreaterThan(0);
    expect(sumAnis(BASE.evs)).toBeGreaterThan(0);
    expect(fbCount(BASE.evs)).toBeGreaterThan(0);
  });

  it('the override patch channel actually reaches the sim', () => {
    // zeroing the S1-c rider MUST move anis; if the channel were inert every
    // counterfactual below would pass for the wrong reason.
    expect(sumAnis(NO_RIDER.evs)).toBeLessThan(sumAnis(BASE.evs));
  });
});

describe('anis-star :: S1-a  Burst Gauge filling speed +6%, all allies, continuous', () => {
  it('grants burstGenPct 6 to every ally, not just self', () => {
    const t = targetsOf(BASE.evs, 'burstGenPct', 6);
    // nearest-wrong: target {self} -> 1 target (under-credits the team gauge)
    expect(t.size).toBe(4);
    expect(t.has(ANIS_IDX)).toBe(true);
  });

  it('is continuous (applied once per target, never re-applied on a trigger)', () => {
    // nearest-wrong: keyed to fullBurstEnter/interval -> one apply per FB per target
    expect(applies(BASE.evs, 'burstGenPct', 6).length).toBe(4);
  });
});

describe('anis-star :: S1-b  squad-formation branch (My Own Star vs Everyone Star)', () => {
  it('My Own Star ATK +40.01% is INERT while another Burst 1 ally (liter) is in the squad', () => {
    // the whole point of the formation gate; nearest-wrong: ungated passive self ATK +40%
    expect(applies(BASE.evs, 'atkPct', 40.01).length).toBe(0);
  });

  it('...and goes live, self-only, once the noB1 gate is lifted (non-vacuity)', () => {
    const a = applies(UNGATED.evs, 'atkPct', 40.01);
    expect(a.length).toBeGreaterThan(0);
    // 'Affects self' -- nearest-wrong: target {allies}
    expect(new Set(a.map((e) => e.targetIdx))).toEqual(new Set([ANIS_IDX]));
    expect(sumAnis(UNGATED.evs)).toBeGreaterThan(sumAnis(BASE.evs));
  });

  it('the +40.01% carries real damage (magnitude is non-vacuous)', () => {
    expect(sumAnis(UNGATED.evs)).toBeGreaterThan(sumAnis(UNGATED_NO_MOS.evs));
  });

  it('the -7.48 s Burst-Skill cooldown is gated too, and buys Full Bursts when live', () => {
    // nearest-wrong: CDR authored ungated -> the graded fixture gains FBs it must not have
    expect(fbCount(UNGATED.evs)).toBeGreaterThan(fbCount(UNGATED_NO_CDR.evs));
    expect(fbCount(UNGATED_NO_CDR.evs)).toBeLessThanOrEqual(
      fbCount(UNGATED.evs)
    );
  });

  it('the CDR RECURS (battle start AND every Full Burst end), it is not once-per-battle', () => {
    // trigger-identity: nearest-wrong oncePerBattle:true -> strictly fewer rotations
    expect(fbCount(UNGATED.evs)).toBeGreaterThan(fbCount(UNGATED_CDR_ONCE.evs));
  });
});

describe('anis-star :: S1-c  Full Charge rider, 120.13% of final ATK', () => {
  const riders = anisDamage(BASE.evs).filter((e) => e.srcSlot === 'skill1');
  const shots = of_(BASE.evs, 'shot').filter(
    (e) => ownerOf(e) === ANIS_IDX
  ).length;

  it('fires once per full-charge SHOT, not once per hit', () => {
    expect(riders.length).toBeGreaterThan(0);
    expect(shots).toBeGreaterThan(0);
    // hitsPerShot is 2 -- nearest-wrong (per-hit keying) would double the rider count.
    // a small tail slack covers a charge in flight at fight end.
    expect(riders.length).toBeLessThanOrEqual(shots);
    expect(riders.length).toBeGreaterThanOrEqual(shots - 2);
  });

  it('takes no +30% range bonus and no core bucket (rider convention)', () => {
    const normals = anisDamage(BASE.evs).filter(
      (e) => e.srcSlot !== 'skill1' && e.srcSlot !== 'burst'
    );
    expect(normals.length).toBeGreaterThan(0);
    expect(normals.some((e) => coreRateOf(e) !== undefined)).toBe(true); // field name guard
    for (const e of riders) {
      expect(e.rangeApplied === true).toBe(false);
      expect(coreRateOf(e) ?? 0).toBe(0);
    }
  });

  it('is a self-damage line only -- teammates are byte-identical without it', () => {
    expect(relDiff(sumOthers(BASE.evs), sumOthers(NO_RIDER.evs))).toBeLessThan(
      1e-9
    );
  });
});

describe('anis-star :: S2-a  FB-enter ATK +35.01% OF THE CASTER ATK (My Own Star gated)', () => {
  it('is inert in the Everyone-Star fixture', () => {
    expect(applies(BASE.evs, 'casterAtkPct', 35.01).length).toBe(0);
  });

  it('when ungated: all four allies, once per Full Burst', () => {
    const a = applies(UNGATED.evs, 'casterAtkPct', 35.01);
    expect(a.length).toBeGreaterThan(0);
    expect(new Set(a.map((e) => e.targetIdx)).size).toBe(4);
    // trigger identity -- nearest-wrong burstCast keying would fire on anis casts only
    expect(a.length).toBe(4 * fbCount(UNGATED.evs));
  });

  it('lasts 10 s (not permanent, not the full rotation)', () => {
    const a = applies(UNGATED.evs, 'casterAtkPct', 35.01)[0];
    const rm = of_(UNGATED.evs, 'buffRemove').find(
      (e) =>
        e.stat === 'casterAtkPct' &&
        e.targetIdx === a.targetIdx &&
        (tOf(e) ?? 0) > (tOf(a) ?? 0)
    );
    expect(rm).toBeTruthy();
    expect((tOf(rm) ?? 0) - (tOf(a) ?? 0)).toBeCloseTo(10, 1);
  });

  it('scales off the CASTER ATK, not each ally own ATK', () => {
    // scope trap #1: casterAtkPct is a flat add of 35.01% of anis ATK; atkPct would
    // scale every ally own ATK. The two models cannot coincide.
    expect(
      relDiff(sumTeam(UNGATED.evs), sumTeam(UNGATED_SELFSCALE.evs))
    ).toBeGreaterThan(1e-3);
  });
});

describe('anis-star :: S2-b  Everyone-Star full-charge heal (tandem line, NOT defensive-skip)', () => {
  it('the heal drives crown on-recovery consumer -- removing it costs the team buffs', () => {
    // taxonomy 4: a heal that looks inert solo feeds a teammate recovery trigger.
    // helm is off so anis is the only heal source in the comp.
    expect(of_(NH_BASE.evs, 'buffApply').length).toBeGreaterThan(
      of_(NH_NOHEAL.evs, 'buffApply').length
    );
  });

  it('...and moves real damage through that consumer', () => {
    expect(
      relDiff(sumTeam(NH_BASE.evs), sumTeam(NH_NOHEAL.evs))
    ).toBeGreaterThan(1e-6);
  });

  it('repeats per full charge (not a one-shot at battle start)', () => {
    const shots = of_(NH_BASE.evs, 'shot').filter(
      (e) => ownerOf(e) === ANIS_IDX
    ).length;
    expect(shots).toBeGreaterThan(10);
    // a one-shot heal could not produce a large buffApply delta; require it to scale
    expect(
      of_(NH_BASE.evs, 'buffApply').length -
        of_(NH_NOHEAL.evs, 'buffApply').length
    ).toBeGreaterThan(5);
  });
});

describe('anis-star :: S2-c  Projectile Explosion Damage +92.03% for 10 s on FB enter', () => {
  it('is applied to anis on every Full Burst', () => {
    const a = applies(BASE.evs, 'projectileExplosionPct', 92.03);
    expect(a.length).toBeGreaterThan(0);
    expect(new Set(a.map((e) => e.targetIdx)).has(ANIS_IDX)).toBe(true);
    // trigger identity: one apply per target per FB -- nearest-wrong passive would apply once
    expect(a.length).toBeGreaterThanOrEqual(fbCount(BASE.evs));
  });

  it('lasts 10 s, not the whole fight', () => {
    const a = applies(BASE.evs, 'projectileExplosionPct', 92.03).filter(
      (e) => e.targetIdx === ANIS_IDX
    )[0];
    const rm = of_(BASE.evs, 'buffRemove').find(
      (e) =>
        e.stat === 'projectileExplosionPct' &&
        e.targetIdx === ANIS_IDX &&
        (tOf(e) ?? 0) > (tOf(a) ?? 0)
    );
    expect(rm).toBeTruthy();
    expect((tOf(rm) ?? 0) - (tOf(a) ?? 0)).toBeCloseTo(10, 1);
  });

  it('feeds anis RL damage and is inert on the non-RL teammates', () => {
    expect(sumAnis(BASE.evs)).toBeGreaterThan(sumAnis(NO_EXPL.evs));
    // liter/crown are SMG, helm AR: only RL kits consume projectileExplosionPct, so the
    // DEF-ranked target set (unmodelable) costs nothing here -- teammates must be identical
    expect(relDiff(sumOthers(BASE.evs), sumOthers(NO_EXPL.evs))).toBeLessThan(
      1e-9
    );
  });
});

describe('anis-star :: S2-d  Attack Damage +34% to ALL allies for 10 s on FB enter', () => {
  it('reaches all four allies, once per Full Burst', () => {
    const a = applies(BASE.evs, 'attackDamagePct', 34);
    expect(new Set(a.map((e) => e.targetIdx)).size).toBe(4); // nearest-wrong: self-only
    expect(a.length).toBe(4 * fbCount(BASE.evs));
  });

  it('moves the TEAM, not just anis (target-set discriminator)', () => {
    expect(sumOthers(BASE.evs)).toBeGreaterThan(sumOthers(NO_ATKDMG.evs));
    expect(sumAnis(BASE.evs)).toBeGreaterThan(sumAnis(NO_ATKDMG.evs));
  });

  it('lasts 10 s', () => {
    const a = applies(BASE.evs, 'attackDamagePct', 34).filter(
      (e) => e.targetIdx === ANIS_IDX
    )[0];
    const rm = of_(BASE.evs, 'buffRemove').find(
      (e) =>
        e.stat === 'attackDamagePct' &&
        e.targetIdx === ANIS_IDX &&
        (tOf(e) ?? 0) > (tOf(a) ?? 0)
    );
    expect(rm).toBeTruthy();
    expect((tOf(rm) ?? 0) - (tOf(a) ?? 0)).toBeCloseTo(10, 1);
  });
});

describe('anis-star :: burst  Shooting Stars 40.01% every 0.25 s for 10 s', () => {
  it('the burstFirst fixture actually makes anis cast (non-vacuity gate for this block)', () => {
    expect(anisCasts(CAST.evs)).toBeGreaterThan(0);
  });

  it('emits ~40 star hits per cast, not one lump and not a 1 s cadence', () => {
    const casts = anisCasts(CAST.evs);
    const ticks = anisDamage(CAST.evs).filter(
      (e) => e.srcSlot === 'burst'
    ).length;
    // nearest-wrong A: a single flatDamage -> ticks == casts
    // nearest-wrong B: intervalSec 1 -> ticks ~ 10 * casts
    expect(ticks).toBeGreaterThanOrEqual(39 * Math.max(1, casts - 1));
    expect(ticks).toBeLessThanOrEqual(41 * casts);
  });

  it('the stars carry damage', () => {
    expect(sumAnis(CAST.evs)).toBeGreaterThan(sumAnis(CAST_NO_STARS.evs));
  });
});

describe('anis-star :: burst  charge time fixed at 0.7 s for 10 s', () => {
  it('is encoded as a charge-speed window of the right size (1.00 s -> 0.7 s = +42.86%)', () => {
    // the engine has no stat-CLAMP primitive, so the faithful encodings are either a
    // chargeSpeedPct buff ~= +42.86% or a swap-style chargeTimeSec of 0.7
    const eff = allEffects();
    const asSpeed = eff.some(
      (e) =>
        e.kind === 'buff' &&
        e.stat === 'chargeSpeedPct' &&
        e.value >= 40 &&
        e.value <= 46
    );
    const asClamp = eff.some((e) => near(e.chargeTimeSec, 0.7, 0.02));
    expect(asSpeed || asClamp).toBe(true);
  });

  it('raises anis shot count inside the burst window', () => {
    const shots = (r: any) =>
      of_(r.evs, 'shot').filter((e: Ev) => ownerOf(e) === ANIS_IDX).length;
    expect(shots(CAST_NO_CHARGE)).toBeGreaterThan(0);
    expect(shots(CAST)).toBeGreaterThan(shots(CAST_NO_CHARGE));
  });
});

describe('anis-star :: burst  DEF +55.01% / Max HP +15.02% (kit-complete, offensively inert)', () => {
  it('DEF +55.01% is recorded and moves no damage (v1: self DEF does not feed damage)', () => {
    expect(
      allEffects().some(
        (e) => e.kind === 'buff' && e.stat === 'defPct' && near(e.value, 55.01)
      )
    ).toBe(true);
    expect(relDiff(sumTeam(CAST.evs), sumTeam(CAST_NO_DEF.evs))).toBeLessThan(
      1e-9
    );
  });

  it('Everyone-Star Max HP +15.02% of caster max HP reaches all allies and stays inert', () => {
    const a = applies(CAST.evs, 'casterMaxHpPct', 15.02);
    expect(a.length).toBeGreaterThan(0);
    expect(new Set(a.map((e) => e.targetIdx)).size).toBe(4);
    // ally-granted Max HP never feeds a teammate atkOfMaxHpPct conversion, and nobody here has one
    expect(relDiff(sumTeam(CAST.evs), sumTeam(CAST_NO_MAXHP.evs))).toBeLessThan(
      1e-9
    );
  });
});

describe('anis-star :: burst  My Own Star Attack Damage +35.2% (self, gated)', () => {
  it('is inert while another Burst 1 ally is present', () => {
    expect(applies(CAST.evs, 'attackDamagePct', 35.2).length).toBe(0);
  });

  it('...and applies to SELF only once the gate is lifted', () => {
    const a = applies(CAST_UNGATED.evs, 'attackDamagePct', 35.2);
    expect(a.length).toBeGreaterThan(0);
    expect(new Set(a.map((e) => e.targetIdx))).toEqual(new Set([ANIS_IDX]));
    // and it must not be confused with the S2-d team +34%
    expect(
      new Set(
        applies(CAST_UNGATED.evs, 'attackDamagePct', 34).map((e) => e.targetIdx)
      ).size
    ).toBe(4);
  });
});

describe('anis-star :: GAPs (no primitive)', () => {
  it.skip('S1-b Cancels Everyone Star / Cancels My Own Star -- no runtime status toggle; the static formation gate encodes the exclusivity, so the cancel lines are unobservable', () => {});
  it.skip('S1-b Everyone Star: Re-enters Burst and changes to Stage 1 -- no re-burst primitive (burstEligibility stage 1 is a no-op for a Burst I unit); a real second cast per rotation is unmodelable', () => {});
  it.skip('S2-c target set: self and all allies with LOWER FINAL DEF than self -- no DEF-ranked TargetDef exists; approximated by {allies} and behaviourally identical here because only RL kits consume projectileExplosionPct', () => {});
  it.skip('burst Explosion Radius +100% for 10 s -- no radius/AoE primitive; belongs in the override unmodeled field', () => {});
  it.skip('burst Shooting Stars attack RANDOM targets -- single-target boss makes target selection unobservable', () => {});
});
