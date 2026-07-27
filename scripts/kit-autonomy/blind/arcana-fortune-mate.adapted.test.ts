/**
 * arcana-fortune-mate - Arcana: Fortune Mate (SG / Fire / Attacker / Burst II)
 * base: cd 20s, ammo 9, reloadFrames 161, chargeFrames 0, hitsPerShot 10,
 * normalAttackMultiplier 222.8, coreAttackMultiplier 200.
 *
 * BLIND per-kit-line spec test. Written from the kit prose ALONE - no sight of this unit's
 * override, the driver test, or any truth file. Every group states the kit line, what the
 * assertion proves, and the nearest-wrong model it must go RED under (built in-memory via
 * withPatchedOverride; the committed JSON is never touched).
 *
 * KIT (structural summary, short quotes only):
 *  S1-a  Activates when Full Burst ends -> all shotgun-wielding allies (SELF INCLUDED: the line
 *        has no 'except self'): ATK +13% 'of the skill user's ATK' x Precious Moments stacks,
 *        15 sec.  => casterAtkPct (flat add off the CASTER's ATK, NOT target-scaled atkPct),
 *        stack-scaled 13/26/39, trigger fullBurstEnd, 15 s.
 *  S1-b  Activates when Happy Memories takes effect -> self: Snapshots of Youth,
 *        'Normal Attack Damage Multiplier +10%', continuously, up to 3 stacks.
 *        => normalAttackPct 10 (SCOPED to the normal multiplier; generic attackDamagePct would
 *        also lift her 554.4% burst hit). The engine has no 'when another buff applies' trigger,
 *        so this must be CO-LOCATED on whatever block grants Happy Memories (the 4-attack
 *        threshold). Derived: only ONE Happy Memories application can occur per Making Memories
 *        window, and S1-c wipes Snapshots at FB end, so 1 stack (+10%) is the only REACHABLE
 *        level - the maxStacks 3 ceiling is unreachable in this fight shape.
 *  S1-c  Activates when Full Burst ends -> self: removes Making Memories, removes Snapshots of
 *        Youth. => the burst self-mode buffs AND the normalAttackPct stacks must EXPIRE at FB
 *        end (durationSec ~ the FB window); a permanent passive over-credits the whole fight.
 *  S2-a  Activates when performing normal attacks while in Making Memories status -> self.
 *        Thresholds 2 / 4 / 6; 'Only one effect is triggered at a time'; 'Resets when Making
 *        Memories is removed'.  2x: reloads 6 rounds. 4x: Happy Memories 'Number of pellets +1'
 *        continuously, <=3. 6x: Precious Moments 'ATK +2.49%' continuously, <=3.
 *        Making Memories comes ONLY from her own burst and dies at FB end, so this entire family
 *        is gated on HER burst cast: nothing here may fire before her first burstCast.
 *  S2-b  Activates when using Burst Skill -> all shotgun-wielding allies '(except self)':
 *        Attack Damage +55% for 10 sec. The fixture contains no second shotgun -> INERT here.
 *  B-1/2/3  self Making Memories: Critical Rate +20.09%, Reloads 2 rounds, Attack Damage
 *        +29.99% - all 'continuously', i.e. until S1-c removes them at FB end.
 *  B-4   'Deals 554.4% of final ATK as Burst Skill damage' -> one flatDamage per cast, exempt
 *        from the +50% Full-Burst major by timing (the cast lands before the FB window opens).
 *
 * FIXTURE: controlComp(SLUG, true) - liter B1 / crown B2 / carry / helm B3, Fire boss, focus =
 * carry, deterministic (no seed). helm is kept ON: her ally buff is critRateNormalPct-scoped and
 * she wields an SR, so she can confound neither the pellet path nor the shotgun-ally target set.
 * Two fixture limits this comp imposes on a Burst-II carry are ASSERTED rather than assumed:
 *   (1) crown is also Burst II. If the rotation never lets arcana-fortune-mate cast, every
 *       Making-Memories line is unreachable - the 'fixture' group asserts her burstCast >= 1.
 *   (2) liter (SMG) / crown (RL) / helm (SR) means she is the ONLY shotgun present, so S1-a
 *       resolves to self only and S2-b resolves to nobody. S2-b's inertness IS assertable and
 *       is asserted; its positive case is it.skip'd (non-vacuity unsatisfiable in this comp).
 *
 * SHAPE ASSUMPTIONS (mechanical, one-line fixes if the harness differs): CompOptions carries a
 * cfg object (cfg.onEvent) and an overrides map keyed by slug; event time fields are never used
 * (all ordering claims are made on stream position), and unit/total damage is read through
 * defensive accessors.
 */
import { describe, expect, it } from 'vitest';
import {
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUG = 'arcana-fortune-mate';
const MATES = ['liter', 'ada'];

/* ------------------------------- helpers -------------------------------------- */
const nearV = (a: any, b: number) =>
  typeof a === 'number' && Math.abs(a - b) < 0.005;
const idxOf = (e: any): number => e.unitIdx ?? e.casterIdx ?? -1; // repaired: unitIdx (damage/shot/burstCast) then casterIdx (buffApply)
const isBuff = (e: any, stat: string) => e.kind === 'buff' && e.stat === stat;

let patchHits = 0;
const dropFx = (o: any, pred: (e: any) => boolean) => {
  for (const b of [].concat(o.skill1 ?? [], o.skill2 ?? [], o.burst ?? [])) {
    b.effects = (b.effects ?? []).filter((e: any) => {
      const hit = pred(e);
      if (hit) {
        patchHits++;
      }
      return !hit;
    });
  }
};
const mapFx = (
  o: any,
  pred: (e: any) => boolean,
  fn: (e: any, b: any) => void
) => {
  for (const b of [].concat(o.skill1 ?? [], o.skill2 ?? [], o.burst ?? [])) {
    for (const e of b.effects ?? []) {
      if (pred(e)) {
        patchHits++;
        fn(e, b);
      }
    }
  }
};

interface Run {
  res: any;
  events: any[];
  patched: number;
}

function run(mutate?: (o: any) => void): Run {
  patchHits = 0;
  const events: any[] = [];
  const base: any = {
    slugs: ['liter', SLUG, 'ada'],
    bossElement: 'Fire',
    focusSlug: 'ada',
  };
  const opts: any = {
    ...base,
    cfg: {
      ...(base.cfg ?? {}),
      onEvent: (e: any) => {
        events.push({ ...e, i: events.length });
      },
    },
  };
  if (mutate) {
    opts.overrides = {
      ...(base.overrides ?? {}),
      [SLUG]: withPatchedOverride(SLUG, mutate),
    };
  }
  const res = runComp(opts);
  return { res, events, patched: patchHits };
}

const totalOf = (r: Run) => (totals(r.res) as any)[SLUG]; // repaired: totals() is a per-slug Record; afm total is the relevant scalar
const unitDmg = (r: Run, slug: string) => {
  const u: any = unitOf(r.res, slug);
  return typeof u === 'number' ? u : (u?.damage ?? u?.total ?? u?.totalDamage);
};
const applies = (r: Run, stat: string, pred?: (e: any) => boolean) =>
  r.events.filter(
    (e) => e.kind === 'buffApply' && e.stat === stat && (!pred || pred(e))
  );
const removes = (r: Run, stat: string, pred?: (e: any) => boolean) =>
  r.events.filter(
    (e) => e.kind === 'buffRemove' && e.stat === stat && (!pred || pred(e))
  );
const firstOf = (r: Run, kind: string) => r.events.find((e) => e.kind === kind);

/* ------------------------------- hoisted runs (10 sims) ----------------------- */
const BASE = run();

// nearest-wrong: Happy Memories unmodeled (pellet grant deleted)
const NO_PELLET = run((o) => dropFx(o, (e) => isBuff(e, 'pelletCountFlat')));

// nearest-wrong: 'Normal Attack Damage Multiplier' read as generic Attack Damage
const SNAP_GENERIC = run((o) =>
  mapFx(
    o,
    (e) => isBuff(e, 'normalAttackPct'),
    (e) => {
      e.stat = 'attackDamagePct';
    }
  )
);

// nearest-wrong: the two reload lines dropped as 'defensive / no damage'
const NO_RELOAD = run((o) => dropFx(o, (e) => e.kind === 'instantReload'));

// nearest-wrong: S1-a authored at its 3-stack magnitude from the first FB end (no ramp/stacking)
const CASTER_FLAT_MAX = run((o) =>
  mapFx(
    o,
    (e) => isBuff(e, 'casterAtkPct'),
    (e) => {
      e.value = 39;
      e.maxStacks = 1;
      delete e.rampSec;
      delete e.perResource;
    }
  )
);

// nearest-wrong: Precious Moments unmodeled
const NO_PRECIOUS = run((o) =>
  dropFx(
    o,
    (e) =>
      isBuff(e, 'atkPct') &&
      (nearV(e.value, 2.49) || nearV(e.value, 4.98) || nearV(e.value, 7.47))
  )
);

// nearest-wrong: 'when Full Burst ends' read as 'when entering Full Burst'
const S1A_FB_ENTER = run((o) => {
  for (const b of [].concat(o.skill1 ?? [], o.skill2 ?? [], o.burst ?? [])) {
    if ((b.effects ?? []).some((e: any) => isBuff(e, 'casterAtkPct'))) {
      patchHits++;
      b.trigger = { kind: 'fullBurstEnter' };
    }
  }
});

// nearest-wrong: Snapshots of Youth unmodeled
const NO_SNAP = run((o) => dropFx(o, (e) => isBuff(e, 'normalAttackPct')));

// nearest-wrong: pellets modeled through the old normalAttackPct proxy instead of the pellet path
const PELLET_PROXY = run((o) =>
  mapFx(
    o,
    (e) => isBuff(e, 'pelletCountFlat'),
    (e) => {
      e.value = 10 * (e.value ?? 1);
      e.stat = 'normalAttackPct';
    }
  )
);

// nearest-wrong: the 554.4% burst hit unmodeled
const NO_NUKE = run((o) =>
  dropFx(o, (e) => e.kind === 'flatDamage' && nearV(e.atkPct, 554.4))
);

/* ---- identify her slot from arcana-fortune-mate-only magnitudes (blind-safe) --- */
const ARCANA_SIG = (e: any) =>
  e.kind === 'buffApply' &&
  e.casterIdx != null &&
  (e.stat === 'pelletCountFlat' ||
    (e.stat === 'critRatePct' && nearV(e.value, 20.09)) ||
    (e.stat === 'attackDamagePct' && nearV(e.value, 29.99)) ||
    (e.stat === 'atkPct' && nearV(e.value, 2.49)));
const arcanaIdx: number = BASE.events.find(ARCANA_SIG)?.casterIdx ?? -1;
const arcanaCasts = BASE.events.filter(
  (e) => e.kind === 'burstCast' && idxOf(e) === arcanaIdx
);
const shotsOf = (r: Run) =>
  r.events.filter((e) => e.kind === 'shot' && idxOf(e) === arcanaIdx).length;

describe('arcana-fortune-mate / fixture validity (non-vacuity)', () => {
  it('she is identifiable, casts her own burst, and the team reaches Full Burst', () => {
    // If any of these fail, EVERY Making-Memories-gated line below is untestable in this comp
    // (crown is the competing Burst II) - the failure IS the finding, not a flaky assertion.
    expect(arcanaIdx).toBeGreaterThanOrEqual(0);
    expect(arcanaCasts.length).toBeGreaterThan(0);
    expect(
      BASE.events.filter((e) => e.kind === 'fullBurstStart').length
    ).toBeGreaterThan(0);
    expect(
      BASE.events.filter((e) => e.kind === 'fullBurstEnd').length
    ).toBeGreaterThan(0);
  });

  it('exercises BOTH sides of the Making-Memories gate (in-window and out-of-window shots)', () => {
    const firstCast = arcanaCasts[0];
    const inFb = BASE.events.filter(
      (e) =>
        e.kind === 'damage' && idxOf(e) === arcanaIdx && e.inFullBurst === true
    );
    const outFb = BASE.events.filter(
      (e) =>
        e.kind === 'damage' && idxOf(e) === arcanaIdx && e.inFullBurst === false
    );
    expect(firstCast).toBeDefined();
    expect(inFb.length).toBeGreaterThan(0);
    expect(outFb.length).toBeGreaterThan(0);
  });
});

describe('S1-a  FB end: ATK +13% of the skill user ATK x Precious Moments stacks, 15s, SG allies', () => {
  it('fires on Full Burst END, not on Full Burst ENTER', () => {
    const a = applies(BASE, 'casterAtkPct')[0];
    const end = firstOf(BASE, 'fullBurstEnd');
    const start = firstOf(BASE, 'fullBurstStart');
    expect(a).toBeDefined();
    expect(end).toBeDefined();
    // faithful: the first grant comes AFTER the first FB has ended
    expect(a.i).toBeGreaterThan(end.i);
    expect(a.i).toBeGreaterThan(start.i);
    // nearest-wrong (same block re-keyed to fullBurstEnter): grants BEFORE the first FB ends
    expect(S1A_FB_ENTER.patched).toBeGreaterThan(0);
    const wA = applies(S1A_FB_ENTER, 'casterAtkPct')[0];
    const wEnd = firstOf(S1A_FB_ENTER, 'fullBurstEnd');
    const wStart = firstOf(S1A_FB_ENTER, 'fullBurstStart');
    expect(wA).toBeDefined();
    expect(wA.i).toBeGreaterThan(wStart.i);
    expect(wA.i).toBeLessThan(wEnd.i);
  });

  it('is granted on EVERY Full Burst end (no own-burst gate - the line has no such clause)', () => {
    const fbEnds = BASE.events.filter((e) => e.kind === 'fullBurstEnd').length;
    expect(applies(BASE, 'casterAtkPct').length).toBeGreaterThanOrEqual(fbEnds);
  });

  it('reaches shotgun-wielding allies only - here that is her alone (inertness)', () => {
    const tgts = new Set(applies(BASE, 'casterAtkPct').map((e) => e.targetIdx));
    // nearest-wrong 'all allies' would show 4 distinct targets in this 4-unit comp
    expect(tgts.size).toBe(1);
    expect([...tgts][0]).toBe(arcanaIdx);
  });

  it('is stack-scaled and capped at 3 stacks (13/26/39), not flat at its maximum', () => {
    const vals = applies(BASE, 'casterAtkPct').map((e) => e.value);
    expect(vals.length).toBeGreaterThan(0);
    expect(vals.every((v: number) => v > 0 && v <= 39.001)).toBe(true);
    // nearest-wrong: 39 from the first FB end onward - strictly more damage than a real ramp,
    // because at the first FB end only ONE Precious Moments stack can exist.
    expect(CASTER_FLAT_MAX.patched).toBeGreaterThan(0);
    expect(totalOf(BASE)).toBeLessThan(totalOf(CASTER_FLAT_MAX));
  });
});

describe('S1-b / S1-c  Snapshots of Youth: Normal Attack Damage Multiplier +10%, wiped at FB end', () => {
  it('is modeled and load-bearing, and moves nobody else (inertness)', () => {
    expect(NO_SNAP.patched).toBeGreaterThan(0);
    expect(totalOf(BASE)).toBeGreaterThan(totalOf(NO_SNAP));
    for (const m of MATES) {
      expect(unitDmg(NO_SNAP, m)).toEqual(unitDmg(BASE, m));
    }
  });

  it('is SCOPED to the normal multiplier, not generic Attack Damage', () => {
    // generic attackDamagePct would also lift her 554.4% burst hit and dilute into the Damage-Up
    // bucket alongside the 29.99% burst buff - a different number either way.
    expect(SNAP_GENERIC.patched).toBeGreaterThan(0);
    expect(totalOf(SNAP_GENERIC)).not.toEqual(totalOf(BASE));
  });

  it('is granted inside her Making Memories window and EXPIRES at FB end (not a permanent passive)', () => {
    const ap = applies(BASE, 'normalAttackPct');
    expect(ap.length).toBeGreaterThan(0);
    // gated on Making Memories => cannot exist before her first burst cast
    expect(ap[0].i).toBeGreaterThan(arcanaCasts[0].i);
    // re-granted per window + actually removed => nearest-wrong (one permanent passive applied at
    // t=0 with no removal) fails both of these.
    expect(ap.length).toBeGreaterThanOrEqual(2);
    expect(removes(BASE, 'normalAttackPct').length).toBeGreaterThan(0);
  });
});

describe('S2-a  normal-attack thresholds while in Making Memories (2 / 4 / 6)', () => {
  it('the whole family is gated on HER burst - nothing fires before her first cast', () => {
    const pellets = applies(BASE, 'pelletCountFlat');
    const precious = applies(
      BASE,
      'atkPct',
      (e) =>
        nearV(e.value, 2.49) || nearV(e.value, 4.98) || nearV(e.value, 7.47)
    );
    expect(pellets.length).toBeGreaterThan(0);
    expect(precious.length).toBeGreaterThan(0);
    // nearest-wrong: an always-on passive (or a plain inFb gate that also fires on rotations where
    // crown/helm complete the chain) applies at stream start, before any burstCast of hers.
    expect(pellets[0].i).toBeGreaterThan(arcanaCasts[0].i);
    expect(precious[0].i).toBeGreaterThan(arcanaCasts[0].i);
  });

  it('4x: Happy Memories is +1 pellet per stack, <=3, load-bearing, and gauge/teammate-inert', () => {
    expect(NO_PELLET.patched).toBeGreaterThan(0);
    const vals = applies(BASE, 'pelletCountFlat').map((e) => e.value);
    expect(vals.every((v: number) => v >= 1 && v <= 3.001)).toBe(true);
    expect(totalOf(BASE)).toBeGreaterThan(totalOf(NO_PELLET));
    // pellets do not pump the gauge, so the rotation - and therefore every teammate - is untouched
    for (const m of MATES) {
      expect(unitDmg(NO_PELLET, m)).toEqual(unitDmg(BASE, m));
    }
  });

  it('4x: the pellet primitive is NOT interchangeable with a normalAttackPct proxy for this unit', () => {
    // she carries a SECOND normal-multiplier buff (Snapshots of Youth), so the proxy is additive
    // where the pellet path is multiplicative - the two models must diverge.
    expect(PELLET_PROXY.patched).toBeGreaterThan(0);
    expect(totalOf(PELLET_PROXY)).not.toEqual(totalOf(BASE));
  });

  it('6x: Precious Moments is a SELF ATK% stack of 2.49 (<=3), load-bearing', () => {
    expect(NO_PRECIOUS.patched).toBeGreaterThan(0);
    const ap = applies(
      BASE,
      'atkPct',
      (e) =>
        nearV(e.value, 2.49) || nearV(e.value, 4.98) || nearV(e.value, 7.47)
    );
    expect(new Set(ap.map((e) => e.targetIdx))).toEqual(new Set([arcanaIdx]));
    expect(ap.every((e) => e.value <= 7.471)).toBe(true);
    expect(totalOf(BASE)).toBeGreaterThan(totalOf(NO_PRECIOUS));
    for (const m of MATES) {
      expect(unitDmg(NO_PRECIOUS, m)).toEqual(unitDmg(BASE, m));
    }
  });

  it('2x reload 6 rounds + burst reload 2 rounds are damage: they add real shots', () => {
    // weapon-state modifiers gate shot count; dropping them must cost her shots on a 9-round SG
    // whose reload is 161 frames. Teammate inertness is NOT asserted here on purpose: her shot
    // count feeds the team burst gauge, so the rotation legitimately shifts.
    expect(NO_RELOAD.patched).toBeGreaterThan(0);
    expect(shotsOf(BASE)).toBeGreaterThan(shotsOf(NO_RELOAD));
  });

  it.skip('per-window attack counter with reset (Only one effect at a time / Resets when Making Memories is removed) - GAP: the engine has no per-status-window counter, so any hitCount proxy over-fires inside the window and the stack ramp becomes a per-unit estimate', () => {});
});

describe('S2-b  Burst use: all shotgun-wielding allies (except self) Attack Damage +55% / 10s', () => {
  it('never lands on a non-shotgun ally, and never on self (inertness in this comp)', () => {
    // liter SMG / crown RL / helm SR - the correct target set is EMPTY here. A mis-encoded
    // 'all allies' or a self-inclusive target set would emit at least one 55% apply.
    expect(
      applies(BASE, 'attackDamagePct', (e) => nearV(e.value, 55)).length
    ).toBe(0);
  });

  it.skip('positive case: a second shotgun ally receives Attack Damage +55% for 10s - controlComp supplies no second shotgun, so non-vacuity is unsatisfiable without a custom comp', () => {});
});

describe('burst  Making Memories self-mode + 554.4% burst hit', () => {
  it('Critical Rate +20.09% lands once per cast, on her only, and expires', () => {
    const ap = applies(BASE, 'critRatePct', (e) => nearV(e.value, 20.09));
    expect(ap.length).toBeGreaterThan(0);
    expect(ap.length).toBeLessThanOrEqual(arcanaCasts.length);
    expect(new Set(ap.map((e) => e.targetIdx))).toEqual(new Set([arcanaIdx]));
    // S1-c removes Making Memories at FB end => it must be removed, not permanent
    expect(
      removes(BASE, 'critRatePct', (e) => nearV(e.value, 20.09)).length
    ).toBeGreaterThan(0);
  });

  it('Attack Damage +29.99% lands once per cast, on her only, and expires', () => {
    const ap = applies(BASE, 'attackDamagePct', (e) => nearV(e.value, 29.99));
    expect(ap.length).toBeGreaterThan(0);
    expect(ap.length).toBeLessThanOrEqual(arcanaCasts.length);
    expect(new Set(ap.map((e) => e.targetIdx))).toEqual(new Set([arcanaIdx]));
    expect(
      removes(BASE, 'attackDamagePct', (e) => nearV(e.value, 29.99)).length
    ).toBeGreaterThan(0);
  });

  it('the 554.4% hit is modeled, lands once per cast, and is Full-Burst-exempt by timing', () => {
    expect(NO_NUKE.patched).toBeGreaterThan(0);
    expect(totalOf(BASE)).toBeGreaterThan(totalOf(NO_NUKE));
    const mine = BASE.events.filter(
      (e) => e.kind === 'damage' && idxOf(e) === arcanaIdx
    );
    const byBucket = new Map<string, any[]>();
    for (const d of mine) {
      byBucket.set(d.bucket, [...(byBucket.get(d.bucket) ?? []), d]);
    }
    // heuristic, bucket-name-agnostic: the burst hit is the bucket with exactly one event per cast
    const nuke = [...byBucket.values()].find(
      (list) => list.length === arcanaCasts.length
    );
    expect(nuke).toBeDefined();
    expect((nuke as any[]).every((d) => d.fbMajorApplied === false)).toBe(true);
  });
});
