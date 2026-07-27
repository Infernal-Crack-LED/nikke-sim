/**
 * anis-sparkling-summer (SG / Electric / Supporter / Burst III, cd 40s, ammo 5,
 * reload 141f, 10 pellets/shot, normal mult 259.2) — BLIND kit spec test, written
 * by claude-opus-5 (S5) from the kit prose ALONE.
 *
 * KIT, read structurally by the blind writer:
 *   skill1  [Activates when entering Full Burst. Affects all Electric Code allies.]
 *             ATK +55.31% of the SKILL USER'S ATK, 10 sec
 *             Reload Speed +49.28%, 10 sec
 *   skill2  [Activates when firing the last bullet. Affects the 2 enemy units with
 *            the highest final ATK.]  Deals 382.42% of final ATK as damage
 *           [Activates when firing the last bullet. Affects self.]
 *             Damage to Interruption Parts +6.91%, 10 sec
 *   burst   [Affects self.] — NO activation clause inside her OWN burst block → burstCast
 *             Max Ammunition Capacity -73.92%, 10 sec
 *             Reload Speed +27.72%, 10 sec
 *             Elemental Advantage Attack Damage +42.24%, 10 sec
 *
 * FIXTURE: controlComp(SLUG, true) = liter B1 / crown B2 / anis B3 / helm B3.
 *   - TWO Burst III units is the point: helm takes some rotations, so fullBurstEnter
 *     (fires on EVERY team Full Burst) and burstCast (fires only when anis bursts)
 *     have DIFFERENT counts — that gap makes the trigger-identity assertions non-vacuous.
 *   - anis is the ONLY Electric unit in this comp, so the skill1 clause (all Electric
 *     Code allies) must resolve to HER ALONE. A plain `allies` encoding moves
 *     liter/crown/helm and reds the target test.
 *   - Because the only recipient is the caster herself, the caster-ATK basis (x% of the
 *     skill user's ATK) and a target-own-ATK atkPct are numerically IDENTICAL here.
 *
 * SELF-SYNERGY the kit is built around: Max Ammo -73.92% on a 5-round magazine leaves
 * ~1 round, so during her own burst window she reaches the LAST BULLET almost every
 * trigger pull → the 382.42% rider fires far more often. Weapon-state modifiers ARE
 * damage; the ammo line is not a defensive skip.
 *
 * ===========================================================================
 * ADAPTED COPY (driver-side materialization plumbing ONLY — kit reading untouched).
 * The pristine blind test (anis-sparkling-summer.test.ts) is preserved verbatim. The
 * blind writer derived this test with NO sight of the harness API, the event-log field
 * shapes, the OverrideFile JSON layout, or the FULL StatKey/TargetDef lists (the cross-
 * family packet redacts them as ANSWER TOKENS). Its shape-tolerant adapters guessed wrong
 * on the plumbing below AND substituted the nearest VISIBLE stat/target name for each
 * redacted one. Each correction is marked ADAPTED. NOT ONE kit assertion (trigger identity
 * / target scoping / cadence / magnitude / gating / unmodeled set) is changed — only the
 * harness plumbing + redacted-schema names the blind role could not see.
 *
 *  [P1] import path → '../../tests/lib/harness.js' (real harness location; blind guessed
 *       '../lib/harness', which does not exist).
 *  [P2] OverrideFile shape: blocks are grouped under skill1/skill2/burst arrays, NOT a flat
 *       o.blocks. allBlocks() concatenates them for the blind's slot walkers.
 *  [P3] Event readers: shot/reload/damage/burstCast events carry { slug, unitIdx } — NOT
 *       casterIdx/srcSlot-as-index. Filter by e.slug === SLUG. buffApply carries
 *       casterIdx/targetIdx (slot indices) + stat + value + key + expiresFrame.
 *  [P4] Slot index A = anis's index in res.units (= 2: liter0/crown1/anis2/helm3).
 *  [P5] casterAtkPct event `value` is the FLAT-resolved ATK add ((pct/100)×caster.staticAtk),
 *       NOT the raw 55.31; the raw percentage lives only in the buffApply `key`
 *       (…:casterAtkPct:55.31). Match the S1 ATK line by key, not by value.
 *  [P6] Time-expiry emits NO buffRemove event (only reload-triggered removal does). Assert
 *       the 10s window on the buffApply itself: expiresFrame - frame === 600.
 *  [P7] Redacted stat/target names → the real schema primitives the blind flagged as missing:
 *       atkPct → casterAtkPct (S1 ATK flat caster add); the untyped {kind:'allies'} →
 *       {kind:'alliesOfElement', element:'Electric'} (the schema HAS the element facet the
 *       blind called a gap); maxAmmoFlat → maxAmmoPct (burst ammo, value -73.92 — validates);
 *       elementDamagePct → elemAdvantageDamagePct (burst elem-adv, value 42.24 — the engine
 *       SELF-GATES on real advantage, resolving the blind's gating question).
 *  [P8] reloadSpeedPct EXISTS in the full schema (blind filed S1 49.28 + burst 27.72 as GAP
 *       from the redacted StatKey list). Un-skipped and asserted live, per the blind's own
 *       estimates (reload speed gates shots = damage; additive stack on her own rotations).
 *  [P9] partsDamagePct EXISTS (parsed but inert in v1 — no parts on the boss). The blind filed
 *       it UNMODELED; the driver models it as an inert stat buff (repo convention, helm H4 —
 *       never drop a stat a future parts-boss/consumer could read). Assert EXACT inertness
 *       (totals byte-identical when removed) — satisfies both readings: the line is accounted
 *       for and moves nothing.
 *  [P10] controlComp does NOT fix the boss element (the blind assumed it did and skipped the
 *        elem-advantage magnitude). bossElement is overridable: assert LIVE vs Water (Electric
 *        advantaged, BEATS[Electric]=Water) and GATED vs Iron (no advantage).
 */
import { describe, expect, it } from 'vitest';
// [P1] real harness location
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

const SLUG = 'anis-sparkling-summer';
const S1_ATK = 55.31;
const S1_RELOAD = 49.28;
const RIDER = 382.42;
const B_RELOAD = 27.72;
const B_ELEM = 42.24;
const FPS = 60;

type Ev = any;
type Boss = 'Fire' | 'Water' | 'Iron';

function run(patch?: (o: any) => void, bossElement: Boss = 'Fire') {
  const opts: any = { ...controlComp(SLUG, true), bossElement };
  const events: Ev[] = [];
  opts.cfg = { ...(opts.cfg ?? {}), onEvent: (ev: Ev) => events.push(ev) };
  if (patch) {
    opts.overrides = {
      ...(opts.overrides ?? {}),
      [SLUG]: withPatchedOverride(SLUG, patch),
    };
  }
  const res: any = runComp(opts);
  // [P4] slot index of anis in the result units array
  const idx: number = res.units.findIndex((u: any) => u.slug === SLUG);
  return { res, events, idx };
}

// [P2] the OverrideFile groups blocks under skill1/skill2/burst (not a flat o.blocks)
const allBlocks = (o: any) => [
  ...(o.skill1 ?? []),
  ...(o.skill2 ?? []),
  ...(o.burst ?? []),
];

// ---- counterfactual patches (each must find its target or throw — never vacuous) -------------
// [P7] S1 target alliesOfElement → generic allies (the nearest-wrong element scope)
const S1_ALL_ALLIES = (o: any) => {
  const b = allBlocks(o).find(
    (x: any) => x.slot === 'skill1' && x.target?.kind === 'alliesOfElement'
  );
  if (!b) {
    throw new Error('S1 alliesOfElement block missing — fixture stale');
  }
  b.target = { kind: 'allies' };
};
// nearest-wrong rider trigger: shotFired instead of lastBullet
const RIDER_ON_SHOT = (o: any) => {
  const bs = allBlocks(o).filter(
    (b: any) =>
      b.slot === 'skill2' &&
      (b.effects ?? []).some((e: any) => e.kind === 'flatDamage')
  );
  if (!bs.length) {
    throw new Error('no skill2 flatDamage block found');
  }
  for (const b of bs) {
    b.trigger = { kind: 'shotFired' };
  }
};
// [P7] nearest-wrong ammo line: dropped entirely (the defensive skip)
const NO_AMMO_CUT = (o: any) => {
  const b = allBlocks(o).find(
    (x: any) =>
      x.slot === 'burst' &&
      (x.effects ?? []).some((e: any) => e.stat === 'maxAmmoPct')
  );
  if (!b) {
    throw new Error('burst maxAmmoPct block missing — fixture stale');
  }
  b.effects = b.effects.filter((e: any) => e.stat !== 'maxAmmoPct');
};
// nearest-wrong ammo line: sign flipped (a capacity UP)
const AMMO_UP = (o: any) => {
  const e = allBlocks(o)
    .flatMap((b: any) => b.effects ?? [])
    .find((x: any) => x.stat === 'maxAmmoPct');
  if (!e) {
    throw new Error('burst maxAmmoPct effect missing — fixture stale');
  }
  e.value = Math.abs(e.value);
};
// [P7/P10] elem-advantage line removed (inertness probe)
const NO_ELEM = (o: any) => {
  const b = allBlocks(o).find(
    (x: any) =>
      x.slot === 'burst' &&
      (x.effects ?? []).some((e: any) => e.stat === 'elemAdvantageDamagePct')
  );
  if (!b) {
    throw new Error(
      'burst elemAdvantageDamagePct block missing — fixture stale'
    );
  }
  b.effects = b.effects.filter((e: any) => e.stat !== 'elemAdvantageDamagePct');
};
// [P9] parts-damage line removed (inertness probe)
const NO_PARTS = (o: any) => {
  const before = o.skill2.length;
  o.skill2 = o.skill2.filter(
    (b: any) => !(b.effects ?? []).some((e: any) => e.stat === 'partsDamagePct')
  );
  if (o.skill2.length === before) {
    throw new Error('skill2 partsDamagePct block missing — fixture stale');
  }
};

// ---- hoisted runs (boss Fire = the blind writer's fixture, unless noted) ---------------------
const BASE = run();
const S1_ALLIES = run(S1_ALL_ALLIES);
const RIDER_SHOT = run(RIDER_ON_SHOT);
const NO_AMMO = run(NO_AMMO_CUT);
const AMMO_UP_RUN = run(AMMO_UP);
const NO_ELEM_FIRE = run(NO_ELEM, 'Fire');
const NO_PARTS_RUN = run(NO_PARTS);
// [P10] elem-advantage magnitude needs advantaged + non-advantaged bosses
const BASE_WATER = run(undefined, 'Water');
const NO_ELEM_WATER = run(NO_ELEM, 'Water');
const BASE_IRON = run(undefined, 'Iron');
const NO_ELEM_IRON = run(NO_ELEM, 'Iron');

// ---- [P3] readers (events carry slug/unitIdx; buffApply carries casterIdx/targetIdx) ---------
const A = BASE.idx;
const EV = BASE.events;
const fbStarts = EV.filter((e) => e.kind === 'fullBurstStart');
const anisBursts = EV.filter((e) => e.kind === 'burstCast' && e.slug === SLUG);
const anisReloads = EV.filter((e) => e.kind === 'reload' && e.slug === SLUG);
const anisShots = EV.filter((e) => e.kind === 'shot' && e.slug === SLUG);
const anisDmg = EV.filter((e) => e.kind === 'damage' && e.slug === SLUG);
const normals = anisDmg.filter((e) => e.bucket === 'normal');
const riders = anisDmg.filter((e) => e.srcSlot === 'skill2'); // the 382.42% last-bullet rider
// [P5] match the S1 ATK line by buffApply KEY (raw 55.31 lives in the key, not the event value)
const S1_ATK_KEY = `${A}:skill1:casterAtkPct:${S1_ATK}`;
const S1_RELOAD_KEY = `${A}:skill1:reloadSpeedPct:${S1_RELOAD}`;
const BU_RELOAD_KEY = `${A}:burst:reloadSpeedPct:${B_RELOAD}`;
const BU_ELEMADV_KEY = `${A}:burst:elemAdvantageDamagePct:${B_ELEM}`;
const byKey = (events: Ev[], key: string) =>
  events.filter((e) => e.kind === 'buffApply' && e.key === key);
const reloadsOf = (r: { events: Ev[] }) =>
  r.events.filter((e) => e.kind === 'reload' && e.slug === SLUG);
const ridersOf = (r: { events: Ev[] }) =>
  r.events.filter(
    (e) => e.kind === 'damage' && e.slug === SLUG && e.srcSlot === 'skill2'
  );
const tOf = (e: Ev) => e.sec ?? e.frame / FPS;

describe('anis-sparkling-summer — blind kit spec (adapted plumbing)', () => {
  it('fixture sanity: anis resolves, the comp full-bursts, and she is NOT the only burster', () => {
    expect(A).toBeGreaterThanOrEqual(0);
    expect(fbStarts.length).toBeGreaterThan(2);
    expect(anisBursts.length).toBeGreaterThan(0);
    // NON-VACUITY: if anis took every rotation, burstCast and fullBurstEnter would be identical.
    expect(anisBursts.length).toBeLessThan(fbStarts.length);
  });

  // ---------------------------------------------------------------- skill1 line 1 (ATK)
  it('S1 ATK grant keys to fullBurstEnter (every team Full Burst), not to her own burst cast', () => {
    const a = byKey(EV, S1_ATK_KEY);
    expect(a.length).toBe(fbStarts.length);
    expect(a.length).toBeGreaterThan(anisBursts.length); // RED under burstCast keying
  });

  it('S1 ATK grant reaches Electric Code allies ONLY — anis alone in this comp', () => {
    const a = byKey(EV, S1_ATK_KEY);
    expect(a.length).toBeGreaterThan(0);
    for (const ap of a) {
      expect(ap.targetIdx).toBe(A);
    }
    // Discrimination proof: the nearest-wrong plain-allies encoding MOVES teammates, so the
    // self-only claim above is a real constraint, not an accident of an inert buff.
    const mates = ['liter', 'crown', 'helm'];
    const moved = mates.some(
      (m) =>
        JSON.stringify(unitOf(BASE.res, m)) !==
        JSON.stringify(unitOf(S1_ALLIES.res, m))
    );
    expect(moved).toBe(true);
  });

  it('S1 ATK grant runs 10 sec of wall clock', () => {
    const a = byKey(EV, S1_ATK_KEY);
    expect(a.length).toBeGreaterThan(0);
    // [P6] no time-expiry buffRemove event — read the window off the buffApply itself
    for (const ap of a) {
      expect(ap.expiresFrame - ap.frame).toBe(10 * FPS);
    }
  });

  it('S1 ATK grant is casterAtkPct (flat caster add), not target-scaled atkPct', () => {
    // [P5/P7] caster===sole-Electric-target makes the two numerically identical here, so the
    // mechanic is pinned by the buffApply stat field (the cross-unit divergence the blind
    // flagged needs a 2nd Electric ally this fixture lacks).
    const a = byKey(EV, S1_ATK_KEY);
    expect(a.length).toBeGreaterThan(0);
    for (const ap of a) {
      expect(ap.stat).toBe('casterAtkPct');
    }
  });

  // ---------------------------------------------------------------- skill1 line 2 (Reload) [P8]
  it('S1 Reload Speed +49.28% for 10 sec is LIVE (reload speed gates shots = damage), Electric-scoped', () => {
    const a = byKey(EV, S1_RELOAD_KEY);
    expect(a.length).toBe(fbStarts.length);
    for (const ap of a) {
      expect(ap.targetIdx).toBe(A);
    }
    for (const ap of a) {
      expect(ap.expiresFrame - ap.frame).toBe(10 * FPS);
    }
  });

  // ---------------------------------------------------------------- skill2 line 1 (rider)
  it('S2 382.42% rider fires once per MAGAZINE (lastBullet), not once per trigger pull', () => {
    expect(anisShots.length).toBeGreaterThan(10);
    expect(anisReloads.length).toBeGreaterThan(2);
    expect(riders.length).toBeGreaterThan(0);
    // one proc per magazine, +/-1 for the trailing magazine at fight end
    expect(riders.length).toBeGreaterThanOrEqual(anisReloads.length - 1);
    expect(riders.length).toBeLessThanOrEqual(anisReloads.length + 1);
    // RED under the nearest-wrong shotFired keying: ammo 5 multiplies the proc count
    expect(ridersOf(RIDER_SHOT).length).toBeGreaterThan(riders.length * 2);
  });

  it('S2 rider lands ONCE per proc — the 2-enemy target clause collapses to the single v1 boss', () => {
    const perProc = riders.length / Math.max(1, anisReloads.length);
    expect(perProc).toBeLessThan(1.5);
    expect(perProc).toBeGreaterThan(0.5);
  });

  it('S2 rider is the kit magnitude, NO core, NO +30% range, FB-by-timing', () => {
    expect(riders.length).toBeGreaterThan(0);
    for (const r of riders) {
      expect(r.atkPct).toBe(RIDER);
    }
    for (const r of riders) {
      expect(r.coreEligible).toBe(false);
    } // no 'core strike' wording
    for (const r of riders) {
      expect(r.rangeApplied).toBe(false);
    } // riders are range-exempt
    const inFb = riders.filter((r) => r.inFullBurst === true);
    const outFb = riders.filter((r) => r.inFullBurst !== true);
    expect(inFb.length).toBeGreaterThan(0); // NON-VACUITY: both cases exercised
    expect(outFb.length).toBeGreaterThan(0);
    for (const r of inFb) {
      expect(r.fbMajorApplied).toBe(true);
    }
    for (const r of outFb) {
      expect(r.fbMajorApplied).toBe(false);
    }
  });

  it('S2 rider is crit-eligible at the caster sheet rate', () => {
    const normRate = normals.length ? normals[0].critRate : null;
    expect(typeof normRate).toBe('number');
    expect(normRate as number).toBeGreaterThan(0);
    for (const r of riders) {
      expect(Math.abs(r.critRate - (normRate as number))).toBeLessThan(0.001);
    }
  });

  // ---------------------------------------------------------------- skill2 line 2 (parts) [P9]
  it('S2 Damage to Interruption Parts +6.91% is exactly inert vs the partless boss', () => {
    // Accounted for (modeled inert stat buff, repo convention) AND moves nothing — satisfies
    // both the blind's UNMODELED reading and the driver's modeled-inert reading.
    expect(totals(BASE.res)).toEqual(totals(NO_PARTS_RUN.res));
  });

  // ---------------------------------------------------------------- burst line 1 (Max Ammo)
  it('burst Max Ammo -73.92% shrinks the magazine, so reloads spike inside her window', () => {
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
    expect(outW).toBeGreaterThan(0); // NON-VACUITY: inactive window genuinely exercised (cd 40s)
    expect(inW).toBeGreaterThan(outW * 1.25);
    // RED under the defensive skip (line dropped): fewer reloads over the fight
    expect(anisReloads.length).toBeGreaterThan(reloadsOf(NO_AMMO).length);
    // RED under a sign flip (capacity UP): fewer reloads than even the dropped-line case
    expect(reloadsOf(AMMO_UP_RUN).length).toBeLessThan(
      reloadsOf(NO_AMMO).length
    );
  });

  it('burst ammo cut also raises the rider count, closing the self-synergy loop', () => {
    expect(riders.length).toBeGreaterThan(ridersOf(NO_AMMO).length);
  });

  // ---------------------------------------------------------------- burst line 2 (Reload) [P8]
  it('burst Reload Speed +27.72% for 10 sec is LIVE on her own burst casts (additive with S1)', () => {
    const a = byKey(EV, BU_RELOAD_KEY);
    expect(a.length).toBe(anisBursts.length);
    for (const ap of a) {
      expect(ap.targetIdx).toBe(A);
    }
    // co-exists with S1's 49.28 line (two distinct reload buffs on her)
    expect(byKey(EV, S1_RELOAD_KEY).length).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------- burst line 3 (Elem Adv)
  it('burst Elemental Advantage +42.24% keys to her OWN burst cast and touches nobody else', () => {
    const a = byKey(EV, BU_ELEMADV_KEY);
    expect(a.length).toBe(anisBursts.length);
    expect(a.length).toBeLessThan(fbStarts.length); // RED under fullBurstEnter keying
    for (const ap of a) {
      expect(ap.targetIdx).toBe(A);
    }
  });

  it('burst Elemental Advantage +42.24% is applied but damage-INERT vs the Fire boss', () => {
    // Electric is advantaged vs Water, NOT vs Fire, so on the Fire control comp this line must
    // be structurally present yet move zero damage (the engine self-gates on advantage).
    expect(byKey(EV, BU_ELEMADV_KEY).length).toBeGreaterThan(0);
    expect(totals(NO_ELEM_FIRE.res)).toEqual(totals(BASE.res));
  });

  it('burst Elemental Advantage +42.24% is LIVE under Electric advantage (Water boss) [P10]', () => {
    expect(totals(NO_ELEM_WATER.res)[SLUG]).not.toEqual(
      totals(BASE_WATER.res)[SLUG]
    );
  });

  it('burst Elemental Advantage +42.24% is GATED with no advantage (Iron boss) [P10]', () => {
    expect(totals(NO_ELEM_IRON.res)).toEqual(totals(BASE_IRON.res));
  });
});
