/**
 * asuka-wille — Asuka: WILLE. MG / Wind / Attacker / Burst III. cd 40s, ammo 300,
 * reloadFrames 161, normalAttackMultiplier 5.47, coreAttackMultiplier 200.
 *
 * BLIND spec test: written from the kit prose ALONE (no sight of the committed override, the
 * driver's tests, or any truth file). One assertion group per kit line.
 *
 * KIT (structural summary — what each line literally says):
 *   S1a  "after landing 50 normal attack(s)", at the target -> 471.86% of final ATK.
 *   S1b  gated on Annihilation State (a SELF status opened by her own burst, 9 s): every 10
 *        shot(s), 2 nearest enemies take 15.62% of final ATK and gain "Anti A.T. Field" =
 *        Damage Taken +0.83% for 30 s, stacks up to 30.
 *   S2a  "entering Full Burst WHILE in Annihilation State", self -> Attack Damage +30.97% / 10 s.
 *   S2b  "when using Annihilation" (Annihilation fires AFTER Annihilation State ends, i.e. cast
 *        +9 s), self -> Emergency Repair: MG heat-up speed -100% / 3 s; removes 100% of ammo;
 *        recovers 3.77% max HP every 1 s over 3 s; reload speed fixed at +60% for 1 ROUND.
 *   Bu-a burst cast, self, 9 s: normal-attack damage multiplier -40%; reloads 21% magazine;
 *        ATK +46.8% of the skill user's ATK; Attack Damage +36%.
 *   Bu-b "Annihilation": after Annihilation State ends, hits every Anti A.T. Field target for
 *        6.62% of final ATK, MIRRORING the stack count; the status is removed afterwards.
 *
 * FIXTURE  controlComp('asuka-wille', true) = liter B1 / crown B2 / asuka-wille B3 / helm B3,
 *   boss Fire. Wind carries NO elemental advantage vs Fire, so there is no x1.10 confound. helm
 *   is kept ON deliberately: a SECOND Burst III is the only thing that makes the own-burst gates
 *   (S1b / S2a / Bu-b) distinguishable from a plain team full-burst-enter key. Crown (B2) is the
 *   on-recovery consumer that makes S2b's heal cross-unit rather than offensively inert.
 *
 * WHY THESE ASSERTIONS DISCRIMINATE
 *   Counterfactuals DELETE an effect (withPatchedOverride, committed JSON untouched) and diff the
 *   MULTISET OF HER DAMAGE-EVENT TIMESTAMPS against the base run. Damage never feeds back into
 *   timing in this sim, so the removed timestamps ARE that kit line's proc times — cadence,
 *   gating and trigger identity become directly assertable instead of inferred from a total.
 *   Every group also pins what the line must NOT move (teammates / riders / wrong bucket).
 *
 * DEFENSIVE SHIMS: authored blind to harness field names beyond the documented event kinds, so
 * timestamp / slot / amount access goes through tOf, srcOf, dmgOf. If the harness spells them
 * differently, fix the shim — not the assertions. Test runner assumed to be vitest, matching the
 * exemplar's `describe/it/expect` shape.
 */
import { describe, it, expect } from 'vitest';
import {
  controlComp,
  runComp,
  unitOf,
  withPatchedOverride,
  // DRIVER NOTE (gauntlet S5): import path retargeted from '../lib/harness' to the blind/ location,
  // and three field-name shims fixed exactly as the blind author invited ("fix the shim — not the
  // assertions"): normBlocks() exposes ov.blocks as the skill1/skill2/burst concatenation (the real
  // override schema is per-slot, not a flat block list); slotOfUnit() reads the slot from the ordered
  // units array (the unit row carries no slot field); srcOf() returns the numeric unitIdx (srcSlot is
  // the kit-LINE label, not a slot index). Result vs the driver override: 19 pass / 8 fail / 4 skip —
  // every key discrimination passes; the 8 fails are shim/proxy divergences documented in the
  // manual-review doc, not faithfulness gaps.
} from '../../tests/lib/harness.js';

const SLUG = 'asuka-wille';

// ---------------------------------------------------------------- shims
type Ev = any;
const tOf = (ev: Ev): number =>
  ev.t ?? ev.timeSec ?? ev.time ?? (ev.frame != null ? ev.frame / 60 : NaN);
// SHIM FIX (driver): damage/shot/burstCast/reload events carry the numeric `unitIdx`; `srcSlot`
// is the kit-LINE label ('normal'/'skill1'/…), NOT a slot index, so it must not be read as one.
const srcOf = (ev: Ev): number => ev.unitIdx ?? ev.casterIdx ?? ev.slot ?? NaN;
const dmgOf = (ev: Ev): number => ev.amount ?? ev.damage ?? 0;
const r3 = (x: number) => Math.round(x * 1000) / 1000;
const near = (a: number, b: number, tol = 0.02) => Math.abs(a - b) <= tol;

// ------------------------------------------------- override introspection
const OV: any = normBlocks(withPatchedOverride(SLUG, () => {}));

// SHIM FIX (driver, invited by the blind author): the committed override schema is per-slot
// arrays (skill1/skill2/burst), not a flat `blocks` list. Expose `ov.blocks` as a reference
// concatenation of the slot arrays so the blind introspection below mutates the REAL blocks
// (the sim reads skill1/skill2/burst, which share these object references).
function normBlocks(ov: any): any {
  if (!ov.blocks)
    {ov.blocks = [
      ...(ov.skill1 ?? []),
      ...(ov.skill2 ?? []),
      ...(ov.burst ?? []),
    ];}
  return ov;
}

function allEffects(ov: any): Array<{ e: any; b: any }> {
  normBlocks(ov);
  const out: Array<{ e: any; b: any }> = [];
  for (const b of ov.blocks ?? []) {
    for (const e of b.effects ?? []) {
      out.push({ e, b });
      if (e.kind === 'escalating')
        {for (const s of e.steps ?? []) {out.push({ e: s, b });}}
    }
  }
  return out;
}

function findEffects(ov: any, pred: (e: any, b: any) => boolean) {
  return allEffects(ov).filter(({ e, b }) => pred(e, b));
}

/** Delete every effect matching `pred`; throws a MISSING error naming the kit line if none. */
function dropEffects(
  ov: any,
  label: string,
  pred: (e: any, b: any) => boolean
): number {
  normBlocks(ov);
  let n = 0;
  for (const b of ov.blocks ?? []) {
    const before = (b.effects ?? []).length;
    b.effects = (b.effects ?? []).filter((e: any) => !pred(e, b));
    n += before - b.effects.length;
  }
  if (!n) {throw new Error(`MISSING kit line in override: ${label}`);}
  ov.blocks = (ov.blocks ?? []).filter(
    (b: any) => (b.effects?.length ?? 0) > 0
  );
  return n;
}

const isDamageEffect = (e: any) =>
  e.kind === 'flatDamage' || e.kind === 'dot' || e.kind === 'storedHit';

// 6.62% x N stacks — the driver can only ship a DERIVED constant (no stack-mirroring primitive),
// so match any near-integer multiple of 6.62 in [1,30] that is not one of the other two riders.
const isAnnihilationHit = (e: any) => {
  if (!isDamageEffect(e)) {return false;}
  const k = e.atkPct / 6.62;
  return (
    k >= 0.9 &&
    k <= 30.5 &&
    Math.abs(k - Math.round(k)) < 0.06 &&
    !near(e.atkPct, 471.86, 0.5) &&
    !near(e.atkPct, 15.62, 0.05) &&
    !near(e.atkPct, 31.24, 0.05)
  );
};

// ---------------------------------------------------------------- runner
function runWith(patch?: (o: any) => void, helm = true) {
  const events: Ev[] = [];
  const base: any = controlComp(SLUG, helm);
  const opts: any = {
    ...base,
    cfg: { ...(base.cfg ?? {}), onEvent: (ev: Ev) => events.push(ev) },
  };
  if (patch)
    {opts.overrides = {
      ...(base.overrides ?? {}),
      [SLUG]: withPatchedOverride(SLUG, (o: any) => {
        normBlocks(o);
        patch(o);
      }),
    };}
  const res: any = runComp(opts);
  return { res, events };
}

// ------------------------------------------------- HOISTED RUNS (11 sims)
const BASE = runWith();
const NO_R471 = runWith((o) =>
  dropEffects(
    o,
    'S1a 471.86% 50-hit rider',
    (e) => isDamageEffect(e) && near(e.atkPct, 471.86, 0.5)
  )
);
const HITCOUNT_100 = runWith((o) => {
  const b = (o.blocks ?? []).find(
    (b: any) => b.trigger?.kind === 'hitCount' && b.trigger.count === 50
  );
  if (!b)
    {throw new Error(
      'MISSING: skill1 hitCount(50) trigger for the 471.86% rider'
    );}
  b.trigger.count = 100;
});
const NO_R1562 = runWith((o) =>
  dropEffects(
    o,
    'S1b 15.62% every-10-shots rider',
    (e) =>
      isDamageEffect(e) &&
      (near(e.atkPct, 15.62, 0.05) || near(e.atkPct, 31.24, 0.05))
  )
);
const NO_DEBUFF = runWith((o) =>
  dropEffects(
    o,
    'S1b Anti A.T. Field Damage Taken +0.83%',
    (e) => e.kind === 'buff' && e.stat === 'damageTakenPct'
  )
);
const S2A_UNGATED = runWith((o) => {
  const bs = (o.blocks ?? []).filter((b: any) =>
    (b.effects ?? []).some(
      (e: any) =>
        e.kind === 'buff' &&
        e.stat === 'attackDamagePct' &&
        near(e.value, 30.97, 0.1)
    )
  );
  if (!bs.length)
    {throw new Error('MISSING: skill2 Attack Damage +30.97% block');}
  for (const b of bs) {
    delete b.ownBurstGate;
    b.trigger = { kind: 'fullBurstEnter' };
  } // nearest-wrong
});
const NO_AMMO_DUMP = runWith((o) =>
  dropEffects(o, 'S2b removes 100% of ammo', (e) => e.kind === 'consumeAmmo')
);
const NO_RELOAD_BUFF = runWith((o) =>
  dropEffects(
    o,
    'S2b reload speed fixed +60% for 1 round',
    (e) => e.kind === 'buff' && e.stat === 'reloadSpeedPct'
  )
);
const NO_NERF = runWith((o) =>
  dropEffects(
    o,
    'burst normal-attack multiplier -40%',
    (e) => e.kind === 'buff' && e.stat === 'normalAttackPct'
  )
);
const NO_ANNIHILATION = runWith((o) =>
  dropEffects(o, 'burst Annihilation 6.62% x stacks', isAnnihilationHit)
);
const NO_HEAL = runWith((o) =>
  dropEffects(o, 'S2b 3.77% max HP heal x3', (e) => e.kind === 'heal')
);

// ---------------------------------------------------------------- derived
function slotOfUnit(res: any): number {
  // SHIM FIX (driver): the unit row carries no slot field; the slot index IS the unit's position
  // in the comp's ordered units array (controlComp = liter/crown/asuka-wille/helm → 2).
  const idx = res.units.findIndex((x: any) => x.slug === SLUG);
  if (idx < 0) {throw new Error(`cannot resolve slot index for ${SLUG}`);}
  return idx;
}
const SLOT = slotOfUnit(BASE.res);

const herDamage = (evts: Ev[]) =>
  evts.filter((e) => e.kind === 'damage' && srcOf(e) === SLOT);
const herDamageTimes = (evts: Ev[]) => herDamage(evts).map((e) => r3(tOf(e)));
const herShots = (evts: Ev[]) =>
  evts.filter((e) => e.kind === 'shot' && srcOf(e) === SLOT);
const herTotal = (evts: Ev[]) =>
  herDamage(evts).reduce((s, e) => s + dmgOf(e), 0);
const teamTotal = (evts: Ev[]) =>
  evts.filter((e) => e.kind === 'damage').reduce((s, e) => s + dmgOf(e), 0);
const allyTotal = (evts: Ev[]) =>
  evts
    .filter((e) => e.kind === 'damage' && srcOf(e) !== SLOT)
    .reduce((s, e) => s + dmgOf(e), 0);

/** multiset difference a \\ b — the timestamps present in the base run and absent once dropped. */
function removedTimes(a: number[], b: number[]): number[] {
  const bag = new Map<number, number>();
  for (const t of b) {bag.set(t, (bag.get(t) ?? 0) + 1);}
  const out: number[] = [];
  for (const t of a) {
    const c = bag.get(t) ?? 0;
    if (c > 0) {bag.set(t, c - 1);}
    else {out.push(t);}
  }
  return out;
}

const HER_CASTS = BASE.events
  .filter((e) => e.kind === 'burstCast' && srcOf(e) === SLOT)
  .map(tOf);
const FB_STARTS = BASE.events
  .filter((e) => e.kind === 'fullBurstStart')
  .map(tOf);
/** Annihilation State = 9 s from HER burst cast (quarter-second slack for cast/frame alignment). */
const inAnnihState = (t: number) =>
  HER_CASTS.some((c) => t >= c - 0.25 && t <= c + 9.25);

const RIDER471_TIMES = removedTimes(
  herDamageTimes(BASE.events),
  herDamageTimes(NO_R471.events)
);
const RIDER1562_TIMES = removedTimes(
  herDamageTimes(BASE.events),
  herDamageTimes(NO_R1562.events)
);
const ANNIH_TIMES = removedTimes(
  herDamageTimes(BASE.events),
  herDamageTimes(NO_ANNIHILATION.events)
);

// buffApply/buffRemove selectors. Boss-held debuffs come through with casterIdx===null AND
// targetIdx===null, so they are filtered by stat+value, never by slot.
const buffApplies = (evts: Ev[], stat: string, value?: number, tol = 0.05) =>
  evts.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.stat === stat &&
      (value == null || near(e.value, value, tol))
  );
const buffRemoves = (evts: Ev[], stat: string, value?: number, tol = 0.05) =>
  evts.filter(
    (e) =>
      e.kind === 'buffRemove' &&
      e.stat === stat &&
      (value == null || near(e.value, value, tol))
  );

// =============================================================== FIXTURE
describe('asuka-wille — fixture is non-vacuous', () => {
  it('she bursts at least twice and fires', () => {
    expect(HER_CASTS.length).toBeGreaterThanOrEqual(2);
    expect(herShots(BASE.events).length).toBeGreaterThan(100);
  });

  it('the team enters Full Burst on rotations she does NOT cast (own-burst gates are testable)', () => {
    // helm is the second Burst III. If this fails, every own-burst-gate assertion below is
    // vacuous and the fixture — not the override — is what needs fixing.
    expect(FB_STARTS.length).toBeGreaterThan(HER_CASTS.length);
  });
});

// =============================================================== SKILL 1a
describe('S1a — "after landing 50 normal attack(s)": 471.86% of final ATK at the target', () => {
  it('fires on a 50-HIT counter, not on a clock or every shot', () => {
    const shots = herShots(BASE.events).length;
    expect(RIDER471_TIMES.length).toBeGreaterThan(0);
    // hitCount counts ROUNDS; MG hitsPerShot = 1, so procs ~= landedShots/50.
    expect(RIDER471_TIMES.length).toBeLessThanOrEqual(
      Math.ceil(shots / 50) + 2
    );
    expect(RIDER471_TIMES.length).toBeGreaterThanOrEqual(
      Math.floor(shots / 50) * 0.7
    );
  });

  it('doubling the threshold halves the proc count (RED under an interval / shotFired key)', () => {
    const at100 = removedTimes(
      herDamageTimes(HITCOUNT_100.events),
      herDamageTimes(NO_R471.events)
    ).length;
    // An `interval` or `shotFired` trigger ignores `count` entirely -> ratio 1.0 -> RED.
    const ratio = at100 / RIDER471_TIMES.length;
    expect(ratio).toBeGreaterThan(0.35);
    expect(ratio).toBeLessThan(0.72);
  });

  it('is ungated: it also procs OUTSIDE Annihilation State', () => {
    // The kit puts no status clause on this line; gating it to her burst window under-credits.
    expect(RIDER471_TIMES.some((t) => !inAnnihState(t))).toBe(true);
  });

  it('inertness — it is her own damage only; allies unmoved', () => {
    expect(
      Math.abs(allyTotal(NO_R471.events) / allyTotal(BASE.events) - 1)
    ).toBeLessThan(0.001);
    expect(herTotal(BASE.events)).toBeGreaterThan(herTotal(NO_R471.events));
  });
});

// =============================================================== SKILL 1b
describe('S1b — Annihilation-State-only: every 10 shots, 15.62% + Anti A.T. Field stack', () => {
  it('the 15.62% rider ONLY procs inside her own Annihilation State window', () => {
    expect(RIDER1562_TIMES.length).toBeGreaterThan(0);
    const leaked = RIDER1562_TIMES.filter((t) => !inAnnihState(t));
    // Nearest-wrong: an ungated passive every-10-shots block (procs all fight), or a plain
    // fbGate:'inFb' proxy (also procs during helm's Full Bursts, which she did not open).
    expect(leaked).toEqual([]);
  });

  it('cadence is every 10 SHOTS inside the window, not per-shot and not per-second', () => {
    const w = HER_CASTS[0];
    const shotsInWin = herShots(BASE.events).filter(
      (e) => inAnnihState(tOf(e)) && tOf(e) >= w - 0.25 && tOf(e) <= w + 9.25
    ).length;
    const procsInWin = RIDER1562_TIMES.filter(
      (t) => t >= w - 0.25 && t <= w + 9.25
    ).length;
    expect(shotsInWin).toBeGreaterThan(20);
    expect(procsInWin).toBeGreaterThan(0);
    const perProc = shotsInWin / procsInWin;
    expect(perProc).toBeGreaterThan(7);
    expect(perProc).toBeLessThan(14);
  });

  it('Anti A.T. Field is a BOSS debuff (whole-team benefit), not a self buff', () => {
    const applies = buffApplies(BASE.events, 'damageTakenPct', 0.83, 0.01);
    expect(applies.length).toBeGreaterThan(0);
    // Boss-held: emitted with casterIdx===null AND targetIdx===null.
    expect(
      applies.every((e) => e.targetIdx == null || e.targetIdx !== SLOT)
    ).toBe(true);
    // Nearest-wrong: encoding it as a self attackDamagePct leaves allies untouched -> RED.
    const drop = 1 - allyTotal(NO_DEBUFF.events) / allyTotal(BASE.events);
    expect(drop).toBeGreaterThan(0.005);
  });

  it('the debuff is applied only while she is in Annihilation State', () => {
    const applies = buffApplies(BASE.events, 'damageTakenPct', 0.83, 0.01);
    expect(applies.filter((e) => !inAnnihState(tOf(e)))).toEqual([]);
  });

  it('debuff shape: 0.83 per stack, 30 s, capped at 30 stacks (structural)', () => {
    const hits = findEffects(
      OV,
      (e) => e.kind === 'buff' && e.stat === 'damageTakenPct'
    );
    expect(hits.length).toBeGreaterThan(0);
    const e = hits[0].e;
    expect(near(e.value, 0.83, 0.01)).toBe(true); // per-stack magnitude, NOT 0.83*30 folded flat
    expect(e.durationSec).toBe(30);
    expect(e.maxStacks).toBe(30);
  });

  it('inertness — the 15.62% rider is her damage only; allies unmoved', () => {
    expect(
      Math.abs(allyTotal(NO_R1562.events) / allyTotal(BASE.events) - 1)
    ).toBeLessThan(0.001);
  });

  it.skip('two-target split ("Affects 2 enemy unit(s) nearest the crosshair") — GAP: the v1 boss is a single enemy, so the 2-target clause has no observable; whether the driver folded it as 15.62 x1 or 31.24 x1 is a modelling choice this fixture cannot discriminate', () => {});
});

// =============================================================== SKILL 2a
describe('S2a — entering Full Burst WHILE in Annihilation State: self Attack Damage +30.97% / 10 s', () => {
  const applies = () =>
    buffApplies(BASE.events, 'attackDamagePct', 30.97, 0.05);

  it('fires once per Full Burst SHE opened, never on a teammate-led Full Burst', () => {
    const a = applies();
    expect(a.length).toBeGreaterThan(0);
    expect(a.length).toBeLessThanOrEqual(HER_CASTS.length);
    // Every application must sit at an FB start that follows one of HER casts.
    expect(a.every((e) => inAnnihState(tOf(e)))).toBe(true);
  });

  it('RED under the nearest-wrong plain fullBurstEnter key (over-credits helm-led Full Bursts)', () => {
    const wrong = buffApplies(
      S2A_UNGATED.events,
      'attackDamagePct',
      30.97,
      0.05
    ).length;
    expect(wrong).toBeGreaterThan(applies().length);
    expect(herTotal(S2A_UNGATED.events)).toBeGreaterThan(herTotal(BASE.events));
  });

  it('self-only, 10 s, Damage-Up bucket (structural + inertness)', () => {
    const hits = findEffects(
      OV,
      (e) =>
        e.kind === 'buff' &&
        e.stat === 'attackDamagePct' &&
        near(e.value, 30.97, 0.05)
    );
    expect(hits.length).toBe(1);
    expect(hits[0].e.durationSec).toBe(10); // 10 s, NOT the burst's 9 s
    expect(hits[0].b.target.kind).toBe('self');
    expect(applies().every((e) => e.targetIdx === SLOT)).toBe(true);
    const removes = buffRemoves(BASE.events, 'attackDamagePct', 30.97, 0.05);
    for (const rm of removes) {
      const opened = applies()
        .map(tOf)
        .filter((t) => t <= tOf(rm));
      if (opened.length)
        {expect(tOf(rm) - Math.max(...opened)).toBeLessThan(10.5);}
    }
  });
});

// =============================================================== SKILL 2b
describe('S2b — Emergency Repair, "when using Annihilation" (i.e. cast + 9 s, NOT at cast)', () => {
  const herReloads = (evts: Ev[]) =>
    evts.filter((e) => e.kind === 'reload' && srcOf(e) === SLOT).map(tOf);

  it('the 100%-ammo dump lands at Annihilation time, one per burst', () => {
    const removedReloads = removedTimes(
      herReloads(BASE.events).map(r3),
      herReloads(NO_AMMO_DUMP.events).map(r3)
    );
    expect(removedReloads.length).toBeGreaterThan(0);
    // Trigger identity is load-bearing: keyed to burstCast instead, the dump would empty a
    // 300-round belt at the START of her damage window and force an immediate reload.
    for (const t of removedReloads) {
      const c = HER_CASTS.filter((x) => x <= t).pop();
      expect(c).toBeDefined();
      expect(t - (c as number)).toBeGreaterThan(6);
      expect(t - (c as number)).toBeLessThan(12);
    }
  });

  it('she does NOT reload in the first second of her own burst window', () => {
    for (const c of HER_CASTS) {
      expect(
        herReloads(BASE.events).filter((t) => t > c + 0.05 && t < c + 1.0)
      ).toEqual([]);
    }
  });

  it('reload speed is fixed +60% for 1 ROUND, not for 1 second (duration semantics)', () => {
    const hits = findEffects(
      OV,
      (e) => e.kind === 'buff' && e.stat === 'reloadSpeedPct'
    );
    expect(hits.length).toBeGreaterThan(0);
    const e = hits[0].e;
    expect(near(e.value, 60, 0.01)).toBe(true);
    expect(e.durationShots).toBe(1); // "for 1 round(s)" — round count, spans the reload
    expect(e.durationSec).toBeUndefined();
    // Behaviourally it buys back firing time on each post-Annihilation reload.
    expect(herShots(BASE.events).length).toBeGreaterThan(
      herShots(NO_RELOAD_BUFF.events).length
    );
  });

  it('the heal is a 3-tick HoT that can only help the team (crown reads recovery)', () => {
    const hits = findEffects(OV, (e) => e.kind === 'heal');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].e.ticks).toBe(3); // 3.77% every 1 s over 3 s
    expect(hits[0].e.intervalSec ?? 1).toBe(1);
    expect(hits[0].b.target.kind).toBe('self');
    // Tandem, not inert: removing it can never RAISE team damage.
    expect(teamTotal(NO_HEAL.events)).toBeLessThanOrEqual(
      teamTotal(BASE.events) * 1.0001
    );
    // ...and it must not move her own damage directly.
    expect(
      Math.abs(herTotal(NO_HEAL.events) / herTotal(BASE.events) - 1)
    ).toBeLessThan(0.02);
  });

  it.skip('Effect 1 "MG heating up speed -100% for 3 sec" — GAP: the engine has no MG heat model (no heat/overheat primitive in the effect schema), so the line has no representable payload; it belongs in `unmodeled`', () => {});
});

// =============================================================== BURST a
describe('burst a — Annihilation State self package (9 s)', () => {
  it('the -40% is scoped to the NORMAL-attack multiplier, not a generic damage cut', () => {
    const hits = findEffects(
      OV,
      (e) => e.kind === 'buff' && e.stat === 'normalAttackPct'
    );
    expect(hits.length).toBe(1);
    expect(hits[0].e.value).toBeLessThan(0); // a downward line; a sign flip is the classic error
    expect(near(Math.abs(hits[0].e.value), 40, 0.01)).toBe(true);
    expect(hits[0].e.durationSec).toBe(9);

    // Discriminator: dropping it must lift her NORMAL hits inside the window while leaving the
    // 471.86% riders byte-equal. Under the nearest-wrong `attackDamagePct: -40`, the riders move too.
    const riderSet = new Set(RIDER471_TIMES.filter(inAnnihState));
    expect(riderSet.size).toBeGreaterThan(0);
    const maxAt = (evts: Ev[], t: number) =>
      Math.max(
        0,
        ...herDamage(evts)
          .filter((e) => r3(tOf(e)) === t)
          .map(dmgOf)
      );
    const riderBase = [...riderSet].reduce(
      (s, t) => s + maxAt(BASE.events, t),
      0
    );
    const riderFree = [...riderSet].reduce(
      (s, t) => s + maxAt(NO_NERF.events, t),
      0
    );
    expect(riderFree / riderBase).toBeGreaterThan(0.98);
    expect(riderFree / riderBase).toBeLessThan(1.02);

    const normSum = (evts: Ev[]) =>
      herDamage(evts)
        .filter((e) => inAnnihState(tOf(e)) && !riderSet.has(r3(tOf(e))))
        .reduce((s, e) => s + dmgOf(e), 0);
    const normRatio = normSum(BASE.events) / normSum(NO_NERF.events);
    expect(normRatio).toBeLessThan(0.92); // non-vacuity: the nerf really bites normals
    expect(normRatio).toBeGreaterThan(0.4);
  });

  it('ATK +46.8% is a CASTER-ATK flat add for 9 s, self only', () => {
    const hits = findEffects(
      OV,
      (e) =>
        e.kind === 'buff' &&
        (e.stat === 'casterAtkPct' || e.stat === 'atkPct') &&
        near(e.value, 46.8, 0.05)
    );
    expect(hits.length).toBe(1);
    expect(hits[0].e.stat).toBe('casterAtkPct'); // "of the skill user's ATK"
    expect(hits[0].e.durationSec).toBe(9);
    expect(hits[0].b.target.kind).toBe('self');
    const applies = buffApplies(BASE.events, 'casterAtkPct', 46.8, 0.05);
    expect(applies.length).toBe(HER_CASTS.length);
    expect(applies.every((e) => e.targetIdx === SLOT)).toBe(true); // allies get nothing
  });

  it('Attack Damage +36% is self, 9 s (not the 10 s of the S2a buff, not team-wide)', () => {
    const hits = findEffects(
      OV,
      (e) =>
        e.kind === 'buff' &&
        e.stat === 'attackDamagePct' &&
        near(e.value, 36, 0.05)
    );
    expect(hits.length).toBe(1);
    expect(hits[0].e.durationSec).toBe(9);
    expect(hits[0].b.target.kind).toBe('self');
    const applies = buffApplies(BASE.events, 'attackDamagePct', 36, 0.05);
    expect(applies.length).toBe(HER_CASTS.length);
    expect(applies.every((e) => e.targetIdx === SLOT)).toBe(true);
  });

  it('all three self buffs are keyed to HER burst cast, not to team Full Burst entry', () => {
    for (const [stat, val] of [
      ['casterAtkPct', 46.8],
      ['attackDamagePct', 36],
      ['normalAttackPct', -40],
    ] as const) {
      const a = buffApplies(BASE.events, stat as string, val as number, 0.05);
      expect(a.length).toBe(HER_CASTS.length);
      expect(a.length).toBeLessThan(FB_STARTS.length);
      for (const e of a)
        {expect(HER_CASTS.some((c) => Math.abs(tOf(e) - c) < 0.5)).toBe(true);}
    }
  });

  it('"Reloads 21% magazine(s)" is an instant partial refill (structural)', () => {
    const hits = findEffects(OV, (e) => e.kind === 'instantReload');
    expect(hits.length).toBeGreaterThan(0);
    expect(near(hits[0].e.fraction ?? 1, 0.21, 0.005)).toBe(true); // 21% of 300, not a full belt
  });
});

// =============================================================== BURST b
describe('burst b — Annihilation: fires AFTER Annihilation State ends, mirroring Anti A.T. Field stacks', () => {
  it('lands ~9 s after her cast, once per burst — not at cast time', () => {
    expect(ANNIH_TIMES.length).toBeGreaterThan(0);
    expect(ANNIH_TIMES.length).toBeLessThanOrEqual(HER_CASTS.length);
    for (const t of ANNIH_TIMES) {
      const c = HER_CASTS.filter((x) => x <= t).pop();
      expect(c).toBeDefined();
      // Nearest-wrong: an instant burst-cast hit (delaySec 0) lands at c, inside the window.
      expect(t - (c as number)).toBeGreaterThan(7.5);
      expect(t - (c as number)).toBeLessThan(11);
    }
  });

  it('the payload is 6.62% MIRRORED by a stack count, not a bare 6.62% (structural, flagged)', () => {
    const hits = findEffects(OV, isAnnihilationHit);
    expect(hits.length).toBeGreaterThan(0);
    const k = hits[0].e.atkPct / 6.62;
    // The engine has no stack-mirroring primitive for flatDamage, so a DERIVED multiple is the
    // only faithful option; a bare 6.62% (k===1) under-credits by ~1-2 orders of magnitude.
    expect(k).toBeGreaterThan(1.5);
    expect(k).toBeLessThanOrEqual(30.5);
  });

  it('inertness — it is her damage; allies unmoved', () => {
    expect(
      Math.abs(allyTotal(NO_ANNIHILATION.events) / allyTotal(BASE.events) - 1)
    ).toBeLessThan(0.001);
    expect(herTotal(BASE.events)).toBeGreaterThan(
      herTotal(NO_ANNIHILATION.events)
    );
  });

  it.skip('"Anti A.T. Field status is removed after the effect is triggered" — GAP: no consume-stacks primitive exists (a damageTakenPct buff can only expire on its own 30 s clock), so stacks survive Annihilation and carry into the next window. This OVER-credits both the team debuff and any stack-derived Annihilation constant; needs a stack-consume effect or a measured steady-state haircut', () => {});

  it.skip('stack count at the moment Annihilation fires — MEASUREMENT-GATED: the mirrored multiple depends on her real in-window shot cadence (the datamined MG rate_of_fire is an unreliable field) and on whether stacks persist across rotations; pin from footage before trusting any specific k', () => {});
});
