/**
 * anis-sparkling-summer (SG / Electric / Supporter / Burst III, cd 40s, ammo 5,
 * reload 141f, 10 pellets/shot, normal mult 259.2) - BLIND kit spec test, written
 * from the kit prose alone.
 *
 * KIT, read structurally:
 *   skill1  [Activates when entering Full Burst. Affects all Electric Code allies.]
 *             ATK +55.31% of the SKILL USERs ATK, 10 sec
 *             Reload Speed +49.28%, 10 sec
 *   skill2  [Activates when firing the last bullet. Affects the 2 enemy units with
 *            the highest final ATK.]  Deals 382.42% of final ATK as damage
 *           [Activates when firing the last bullet. Affects self.]
 *             Damage to Interruption Parts +6.91%, 10 sec
 *   burst   [Affects self.] - NO activation clause inside her OWN burst block -> burstCast
 *             Max Ammunition Capacity -73.92%, 10 sec
 *             Reload Speed +27.72%, 10 sec
 *             Elemental Advantage Attack Damage +42.24%, 10 sec
 *
 * FIXTURE: controlComp(SLUG, true) = liter B1 / crown B2 / anis B3 / helm B3, boss Fire.
 *   - TWO Burst III units is the point: helm takes some rotations, so fullBurstEnter
 *     (fires on EVERY team Full Burst) and burstCast (fires only when anis bursts)
 *     have DIFFERENT counts. That gap is what makes the trigger-identity assertions
 *     non-vacuous rather than tautological.
 *   - anis is the ONLY Electric unit in this comp, so the skill1 clause (all Electric
 *     Code allies) must resolve to HER ALONE. A plain allies encoding moves
 *     liter/crown/helm and reds the target test.
 *   - Because the only recipient is the caster herself, the caster-ATK basis (x% of the
 *     skill users ATK) and a target-own-ATK atkPct are numerically IDENTICAL here, so
 *     that modelling divergence is unobservable in this fixture (skipped below).
 *   - helm=true retained deliberately: helm IS the second B3 that creates the gap.
 *
 * SELF-SYNERGY the kit is built around, and which the burst tests pin: Max Ammo -73.92%
 * on a 5-round magazine leaves ~1 round, so during her own burst window she reaches the
 * LAST BULLET almost every trigger pull -> the 382.42% rider fires far more often.
 * Weapon-state modifiers ARE damage; the ammo line is not a defensive skip.
 */
import { describe, expect, it } from 'vitest';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness';

const SLUG = 'anis-sparkling-summer';
const S1_ATK = 55.31;
const RIDER = 382.42;
const B_ELEM = 42.24;

type Ev = any;
type Patch = (o: any) => void;

const near = (a: number, b: number, tol = 0.75) => Math.abs(a - b) <= tol;
const tOf = (ev: Ev): number =>
  ev.t ??
  ev.sec ??
  ev.time ??
  (typeof ev.frame === 'number' ? ev.frame / 60 : NaN);
const casterOf = (ev: Ev) => ev.casterIdx ?? ev.srcSlot ?? ev.idx ?? ev.slot;
const targetOf = (ev: Ev) => ev.targetIdx ?? ev.tgtIdx ?? ev.idx;
const bucketOf = (ev: Ev) => ev.bucket ?? ev.category;
// boss-held debuffs come through with casterIdx === null AND targetIdx === null
const isBossDebuff = (ev: Ev) => ev.casterIdx === null && ev.targetIdx === null;

function run(patch?: Patch) {
  const opts: any = controlComp(SLUG, true);
  const events: Ev[] = [];
  opts.cfg = { ...(opts.cfg ?? {}), onEvent: (ev: Ev) => events.push(ev) };
  if (patch) {
    opts.overrides = {
      ...(opts.overrides ?? {}),
      [SLUG]: withPatchedOverride(SLUG, patch),
    };
  }
  const res: any = runComp(opts);
  const u: any = unitOf(res, SLUG);
  const idx: number = u.idx ?? u.slot ?? u.index ?? u.slotIdx;
  return { res, events, unit: u, idx, err: null as string | null };
}

// A counterfactual whose surgery cannot find its target must FAIL LOUDLY, never
// silently degrade into a vacuous (identical-to-baseline) comparison.
function tryRun(patch: Patch) {
  try {
    return run(patch);
  } catch (e) {
    return {
      res: null as any,
      events: [] as Ev[],
      unit: null as any,
      idx: -1,
      err: String(e),
    };
  }
}

const buffsIn = (o: any, slot: string, stat: string) => {
  const out: any[] = [];
  for (const b of o.blocks ?? []) {
    if (b.slot !== slot) {continue;}
    for (const e of b.effects ?? [])
      {if (e.kind === 'buff' && e.stat === stat) {out.push({ block: b, eff: e });}}
  }
  return out;
};
const oneBuff = (o: any, slot: string, stat: string) => {
  const hits = buffsIn(o, slot, stat);
  if (hits.length !== 1)
    {throw new Error(
      `expected exactly 1 ${slot}/${stat} buff, found ${hits.length}`
    );}
  return hits[0];
};
const riderBlocks = (o: any) =>
  (o.blocks ?? []).filter(
    (b: any) =>
      b.slot === 'skill2' &&
      (b.effects ?? []).some((e: any) => e.kind === 'flatDamage')
  );

// ---------------------------------------------------------------- hoisted runs (6)
const BASE = run();
// nearest-wrong for the element-scoped target: plain allies
const S1_ALL_ALLIES = tryRun((o) => {
  const h = oneBuff(o, 'skill1', 'atkPct');
  h.block.target = { kind: 'allies' };
});
// nearest-wrong for the rider trigger: shotFired instead of lastBullet
const RIDER_ON_SHOT = tryRun((o) => {
  const bs = riderBlocks(o);
  if (!bs.length) {throw new Error('no skill2 flatDamage block found');}
  for (const b of bs) {b.trigger = { kind: 'shotFired' };}
});
// nearest-wrong for the ammo line: dropped entirely (the defensive skip)
const NO_AMMO_CUT = tryRun((o) => {
  const h = oneBuff(o, 'burst', 'maxAmmoFlat');
  h.block.effects = h.block.effects.filter((e: any) => e !== h.eff);
});
// nearest-wrong for the ammo line: sign flipped (a capacity UP)
const AMMO_UP = tryRun((o) => {
  const h = oneBuff(o, 'burst', 'maxAmmoFlat');
  h.eff.value = Math.abs(h.eff.value);
});
// inertness probe for the elemental-advantage line vs a non-advantaged boss
const NO_ELEM = tryRun((o) => {
  const h = oneBuff(o, 'burst', 'elementDamagePct');
  h.eff.value = 0;
});

// ---------------------------------------------------------------- derived views
const A = BASE.idx;
const EV = BASE.events;
const fbStarts = EV.filter((e) => e.kind === 'fullBurstStart');
const anisBursts = EV.filter(
  (e) => e.kind === 'burstCast' && casterOf(e) === A
);
const anisReloads = EV.filter((e) => e.kind === 'reload' && casterOf(e) === A);
const anisShots = EV.filter((e) => e.kind === 'shot' && casterOf(e) === A);
const anisDmg = EV.filter(
  (e) => e.kind === 'damage' && (e.srcSlot ?? casterOf(e)) === A
);
const normals = anisDmg.filter((e) => bucketOf(e) === 'normal');
const riders = anisDmg.filter((e) => bucketOf(e) !== 'normal');
const applies = (events: Ev[], stat: string, value: number) =>
  events.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.stat === stat &&
      !isBossDebuff(e) &&
      near(e.value ?? NaN, value)
  );
const reloadsOf = (r: { events: Ev[]; idx: number }) =>
  r.events.filter((e) => e.kind === 'reload' && casterOf(e) === r.idx);

describe('anis-sparkling-summer - blind kit spec', () => {
  it('fixture sanity: anis resolves, the comp full-bursts, and she is NOT the only burster', () => {
    expect(typeof A).toBe('number');
    expect(fbStarts.length).toBeGreaterThan(2);
    expect(anisBursts.length).toBeGreaterThan(0);
    // NON-VACUITY for every trigger-identity test below: if anis took every rotation,
    // burstCast and fullBurstEnter would be indistinguishable in this comp.
    expect(anisBursts.length).toBeLessThan(fbStarts.length);
  });

  // ---------------------------------------------------------------- skill1 line 1
  it('S1 ATK grant keys to fullBurstEnter (every team Full Burst), not to her own burst cast', () => {
    const a = applies(EV, 'atkPct', S1_ATK);
    expect(a.length).toBe(fbStarts.length);
    // RED under the nearest-wrong burstCast keying, which would give anisBursts.length
    expect(a.length).toBeGreaterThan(anisBursts.length);
  });

  it('S1 ATK grant reaches Electric Code allies ONLY - anis alone in this comp', () => {
    const a = applies(EV, 'atkPct', S1_ATK);
    expect(a.length).toBeGreaterThan(0);
    for (const ap of a) {expect(targetOf(ap)).toBe(A);}
    // Discrimination proof: the nearest-wrong plain-allies encoding MOVES teammates,
    // so the self-only assertion above is a real constraint and not an accident of
    // an inert buff.
    expect(S1_ALL_ALLIES.err).toBeNull();
    const mates = ['liter', 'crown', 'helm'];
    const moved = mates.some(
      (m) =>
        JSON.stringify(unitOf(BASE.res, m)) !==
        JSON.stringify(unitOf(S1_ALL_ALLIES.res, m))
    );
    expect(moved).toBe(true);
  });

  it('S1 ATK grant runs 10 sec of wall clock', () => {
    const a = applies(EV, 'atkPct', S1_ATK);
    const rm = EV.filter(
      (e) =>
        e.kind === 'buffRemove' &&
        e.stat === 'atkPct' &&
        !isBossDebuff(e) &&
        near(e.value ?? NaN, S1_ATK)
    );
    expect(a.length).toBeGreaterThan(0);
    expect(rm.length).toBeGreaterThan(0);
    // Full Bursts are >10 s apart here, so apply[i]/remove[i] pair cleanly (no refresh overlap).
    expect(near(tOf(rm[0]) - tOf(a[0]), 10, 0.4)).toBe(true);
  });

  // ---------------------------------------------------------------- skill1 line 2 (GAP)
  it.skip('S1 Reload Speed +49.28% for 10 sec - GAP: no reload-speed StatKey exists in the effect schema', () => {
    // The schema has chargeSpeedPct / attackSpeedPct / fireRatePct but NO reload-speed stat,
    // so an override cannot express this line at all. It is NOT a defensive skip: reload speed
    // gates shots fired, therefore damage. FLAG with estimate + recipe:
    //   reload 141f = 2.35 s; at +49.28% -> 141 / 1.4928 = ~94.5f = ~1.575 s, ~0.78 s saved per
    //   magazine on a 5-round SG that reloads constantly (and far more often inside her own
    //   burst window, where the magazine is ~1 round).
    // Recipe once a reloadSpeedPct primitive lands: measure the median gap between consecutive
    // anis reload events inside a Full Burst window vs outside it; expect ~1.575 s vs ~2.35 s.
  });

  // ---------------------------------------------------------------- skill2 line 1
  it('S2 382.42% rider fires once per MAGAZINE (lastBullet), not once per trigger pull', () => {
    expect(anisShots.length).toBeGreaterThan(10);
    expect(anisReloads.length).toBeGreaterThan(2);
    // detector sanity: the bucket split is not inverted (normals dominate the log)
    expect(normals.length).toBeGreaterThanOrEqual(anisShots.length);
    expect(riders.length).toBeGreaterThan(0);
    // one proc per magazine, +/-1 for the trailing magazine at fight end
    expect(riders.length).toBeGreaterThanOrEqual(anisReloads.length - 1);
    expect(riders.length).toBeLessThanOrEqual(anisReloads.length + 1);
    // RED under the nearest-wrong shotFired keying: ammo 5 multiplies the proc count
    expect(RIDER_ON_SHOT.err).toBeNull();
    const rShot = RIDER_ON_SHOT.events.filter(
      (e) =>
        e.kind === 'damage' &&
        (e.srcSlot ?? casterOf(e)) === RIDER_ON_SHOT.idx &&
        bucketOf(e) !== 'normal'
    );
    expect(rShot.length).toBeGreaterThan(riders.length * 2);
  });

  it('S2 rider lands ONCE per proc - the 2-enemy target clause collapses to the single v1 boss', () => {
    // Kit says 2 enemy units with the highest final ATK; the sim has one boss, so a faithful
    // model deals ONE 382.42% hit per last bullet. RED under a model that emits two hits per
    // proc (which would double the rider count against the magazine count).
    const perProc = riders.length / Math.max(1, anisReloads.length);
    expect(perProc).toBeLessThan(1.5);
    expect(perProc).toBeGreaterThan(0.5);
  });

  it('S2 rider gets NO core and NO +30% range, but DOES take the Full Burst major by timing', () => {
    expect(riders.length).toBeGreaterThan(0);
    const r0 = riders[0];
    expect(typeof (r0.coreRate ?? r0.core)).toBe('number');
    // kit text says nothing about core strike damage -> no core bucket for the rider
    for (const r of riders) {expect(r.coreRate ?? r.core ?? 0).toBe(0);}
    // riders are universally excluded from the range bonus (engine force-sets no-range)
    for (const r of riders) {expect(r.rangeApplied === true).toBe(false);}
    // noFb defaults OFF: a rider that lands inside the window takes the +50% major
    const inFb = riders.filter((r) => r.inFullBurst === true);
    const outFb = riders.filter((r) => r.inFullBurst !== true);
    // NON-VACUITY: the fixture must exercise BOTH the in-FB and out-of-FB case
    expect(inFb.length).toBeGreaterThan(0);
    expect(outFb.length).toBeGreaterThan(0);
    for (const r of inFb) {expect(r.fbMajorApplied).toBe(true);}
    for (const r of outFb) {expect(r.fbMajorApplied === true).toBe(false);}
  });

  it('S2 rider is crit-eligible at the caster sheet rate', () => {
    // Riders crit at the caster rate; only core is withheld. RED under a model that leaves
    // the rider crit-exempt (rate 0) while her normal hits carry a nonzero rate.
    const normRate = normals.length
      ? (normals[0].critRate ?? normals[0].crit)
      : null;
    expect(typeof normRate).toBe('number');
    expect(normRate as number).toBeGreaterThan(0);
    for (const r of riders)
      {expect(
        near((r.critRate ?? r.crit ?? 0) as number, normRate as number, 0.001)
      ).toBe(true);}
  });

  // ---------------------------------------------------------------- skill2 line 2 (UNMODELED)
  it.skip('S2 Damage to Interruption Parts +6.91% for 10 sec - UNMODELED: no primitive, and the scope-lock boss is partless', () => {
    // No StatKey expresses interruption-part damage, and the v1 boss has no destructible
    // parts, so the line is doubly unobservable. Belongs verbatim in the override unmodeled
    // field, NOT in an ignored-effect block (the validator rejects those).
  });

  // ---------------------------------------------------------------- burst line 1
  it('burst Max Ammo -73.92% shrinks the magazine, so reloads (and 382.42% procs) spike inside her window', () => {
    expect(anisBursts.length).toBeGreaterThan(0);
    let inW = 0;
    let outW = 0;
    for (const b of anisBursts) {
      const t0 = tOf(b);
      inW += anisReloads.filter((r) => tOf(r) >= t0 && tOf(r) < t0 + 10).length;
      outW += anisReloads.filter(
        (r) => tOf(r) >= t0 + 12 && tOf(r) < t0 + 22
      ).length;
    }
    // NON-VACUITY: the INACTIVE case is genuinely exercised (cd 40s, so no window overlap)
    expect(outW).toBeGreaterThan(0);
    expect(inW).toBeGreaterThan(outW * 1.25);
    // RED under the nearest-wrong defensive skip (line dropped): fewer reloads over the fight
    expect(NO_AMMO_CUT.err).toBeNull();
    expect(anisReloads.length).toBeGreaterThan(reloadsOf(NO_AMMO_CUT).length);
    // RED under a sign flip (capacity UP): must move reloads the OTHER way from the drop case
    expect(AMMO_UP.err).toBeNull();
    expect(reloadsOf(AMMO_UP).length).toBeLessThan(
      reloadsOf(NO_AMMO_CUT).length
    );
  });

  it('burst ammo cut also raises the rider count, closing the self-synergy loop', () => {
    const cutlessRiders = NO_AMMO_CUT.events.filter(
      (e) =>
        e.kind === 'damage' &&
        (e.srcSlot ?? casterOf(e)) === NO_AMMO_CUT.idx &&
        bucketOf(e) !== 'normal'
    );
    expect(NO_AMMO_CUT.err).toBeNull();
    expect(riders.length).toBeGreaterThan(cutlessRiders.length);
  });

  // ---------------------------------------------------------------- burst line 2 (GAP)
  it.skip('burst Reload Speed +27.72% for 10 sec - GAP: same missing reload-speed primitive as S1', () => {
    // Stacks additively with the S1 49.28% whenever both windows overlap (77.0% combined),
    // which is exactly when her magazine is ~1 round and reloads dominate her uptime.
    // Estimated in-window reload: 141f / 1.77 = ~80f = ~1.33 s. FLAGGED, not invented.
  });

  // ---------------------------------------------------------------- burst line 3
  it('burst self-buffs key to her OWN burst cast and touch nobody else', () => {
    const a = applies(EV, 'elementDamagePct', B_ELEM);
    expect(a.length).toBe(anisBursts.length);
    // RED under the nearest-wrong fullBurstEnter keying, which would over-credit every team FB
    expect(a.length).toBeLessThan(fbStarts.length);
    for (const ap of a) {expect(targetOf(ap)).toBe(A);}
  });

  it('burst Elemental Advantage Damage +42.24% is applied but damage-INERT vs the Fire boss', () => {
    // Electric is advantaged vs Iron, NOT vs Fire, so on the control comp this line must be
    // structurally present yet move zero damage. A RED on the equality below is itself the
    // finding: it would mean the engine credits an elemental-advantage buff without checking
    // that the caster actually HAS the advantage.
    expect(applies(EV, 'elementDamagePct', B_ELEM).length).toBeGreaterThan(0);
    expect(NO_ELEM.err).toBeNull();
    expect(JSON.stringify(totals(NO_ELEM.res))).toBe(
      JSON.stringify(totals(BASE.res))
    );
  });

  it.skip('burst Elemental Advantage magnitude - needs an Iron Code boss; controlComp is boss Fire', () => {
    // Recipe: rerun the same comp against an Iron boss and compare anis damage with the buff
    // at 42.24 vs 0. Expected: the elemental multiplier exceeds the clean 1.10 advantage step
    // by the buff, per the elemental-advantage rule. Not expressible through the documented
    // harness surface (controlComp fixes the boss element), so it is flagged, not guessed.
  });

  it.skip('S1 caster-ATK basis (x% of the SKILL USERs ATK) - unobservable in this fixture', () => {
    // The schema atkPct scales the TARGET own ATK; the kit scales the CASTER ATK. In this comp
    // anis is the sole Electric ally, so caster === target and the two readings are numerically
    // identical - the approximation is EXACT here and costs nothing. It diverges only with a
    // second Electric ally whose ATK differs from hers. Recipe: build an Electric-heavy comp,
    // then assert every recipient gains the SAME flat ATK (anis ATK x 0.5531), not a
    // recipient-proportional amount.
  });
});
