/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ether — BLIND kit spec (S5 cross-family post-op; authored from kit prose ALONE).
 *
 * BASE: SG / Electric / Defender / Burst I, cd 40s, ammo 9, reloadFrames 141,
 * hitsPerShot 10, normalAttackMultiplier 214.3, coreAttackMultiplier 200.
 *
 * KIT LINES AS READ (structural; fragments quoted short):
 *
 * skill1 — header targets '1 allies with the lowest' HP; payload 'Damage Taken ▼ 52.5%' 5 sec.
 *   ALLY damage-reduction. No StatKey expresses ally DR: `damageTakenPct` is the BOSS-side
 *   debuff (positive = boss takes MORE), `defPct` is self-DEF and inert. At scope lock the boss
 *   deals no damage and no unit has an HP pool, and no trigger in the vocabulary keys off
 *   damage-taken, so the line is offensively INERT — disposition UNMODELED. The nearest-wrong is
 *   folding it into `damageTakenPct` on the boss, which would inflate the WHOLE team; that is
 *   what the anti-fudge + board-inertness assertions below refute.
 *
 * skill2a — header targets '3 enemy unit(s) with the highest' final DEF; payload
 *   'Deals 56.32% of final ATK' as damage. NO activation clause ⇒ `interval` trigger by
 *   convention. ⚑ THE PERIOD IS NOT IN THE KIT TEXT — it is outside the input domain, so this
 *   test asserts only that the cadence is interval-SHAPED (repeats, and is far slower than a
 *   per-shot/per-hit trigger); it deliberately does NOT pin a specific instance count. The boss
 *   is single-target, so '3 enemy units' collapses to ONE instance per fire — a ×3 fold is the
 *   nearest-wrong and is refuted by the ABSOLUTE magnitude assertion (implied atkPct ≈ 56.32,
 *   not 168.96). Rider conventions: no +30% range bonus, no core (text says no 'core strike'),
 *   FB-eligible by landing timing (per-kit noFb is measured-only, default OFF).
 *
 * skill2b — 'Affects the same enemy unit(s)' + 'Activates during Full Burst';
 *   payload 'DEF ▼ 9.38%' 6 sec. Trigger identity = fullBurstEnter (team FB, NOT own burstCast).
 *   NO primitive exists for enemy-DEF reduction (defPct is self-DEF/inert; damageTakenPct is a
 *   different mechanic with a different magnitude) ⇒ GAP (it.skip) plus a live anti-fudge
 *   assertion that 9.38 never surfaces as a damage-moving boss debuff.
 *
 * burst — header targets '3 ally unit(s) with the lowest' HP; payload creates a Shield worth
 *   '96% of the ... final Max HP' for 5 sec. Trigger = burstCast (Burst I, cd 40s), effect
 *   `shield{maxHpPct:96,durationSec:5}`, target alliesLowestHp{count:3}. It must NOT be dropped
 *   (it fires teammates' `shielded` triggers / opens `requiresShielded` gates), and it must NOT
 *   be encoded as a Max-HP GRANT (the nearest-wrong: maxHpFlat / casterMaxHpPct would feed an
 *   atkOfMaxHpPct consumer and manufacture damage). Its payload is unobservable in this fixture
 *   (no shield event kind on the onEvent bus, no shield-consuming teammate) ⇒ the cross-unit and
 *   target-set assertions are it.skip with reasons.
 *
 * FIXTURE: controlComp('ether', true) — liter (B1) / crown (B2) / carry slot / helm (B3).
 * ether is Burst I, so liter COMPETES for stage 1; the burst group therefore carries an explicit
 * non-vacuity assertion that ether actually casts (if it fails, the fixture — not the model — is
 * the finding). Deterministic (no seed). Every run is a full 180s sim, so all 5 runs are hoisted
 * and shared across the file.
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

const SLUG = 'ether';
const RIDER_PCT = 56.32;
const DEF_DOWN_PCT = 9.38;
const DR_PCT = 52.5;
// a tiny non-zero probe value: keeps the damage instance (and its burst-gauge impact) alive so
// the rotation is byte-identical across the magnitude runs, unlike a hard 0.
const EPS = 0.001;
const UNIT_PCT = 1;

type AnyEv = SimEvent & Record<string, any>;

// The override FILE is slot-keyed; the two documented shapes are `{skill1: Block[]}` and
// `{skill1: {blocks: Block[]}}`. Resolve either, and always MUTATE THE RETURNED ARRAY in place
// so the patch lands whichever shape is real.
function blocksOf(ov: any, slot: 'skill1' | 'skill2' | 'burst'): any[] {
  const s = ov?.[slot];
  if (!s) return [];
  return Array.isArray(s) ? s : ((s.blocks as any[]) ?? []);
}
function allBlocks(ov: any): any[] {
  return [
    ...blocksOf(ov, 'skill1'),
    ...blocksOf(ov, 'skill2'),
    ...blocksOf(ov, 'burst'),
  ];
}
function eachFlatDamage(ov: any, fn: (e: any) => void): number {
  let n = 0;
  for (const b of allBlocks(ov)) {
    for (const e of (b?.effects as any[]) ?? []) {
      if (e?.kind === 'flatDamage') {
        fn(e);
        n += 1;
      }
    }
  }
  return n;
}

function run(overrides?: Record<string, any>) {
  const opts: any = controlComp(SLUG, true);
  const events: AnyEv[] = [];
  const onEvent = (e: AnyEv) => {
    events.push(e);
  };
  opts.onEvent = onEvent;
  if (opts.cfg) opts.cfg.onEvent = onEvent;
  if (overrides) opts.overrides = { ...(opts.overrides ?? {}), ...overrides };
  const res = runComp(opts);
  return { res, events, tot: totals(res) as Record<string, number> };
}

const kind = (evs: AnyEv[], k: string) => evs.filter((e) => (e as any).kind === k);
const casterOf = (e: AnyEv): number => {
  const a = e as any;
  if (typeof a.srcSlot === 'number') return a.srcSlot;
  if (typeof a.casterIdx === 'number') return a.casterIdx;
  if (typeof a.slot === 'number') return a.slot;
  return -1;
};
const near = (a: number, b: number, tol = 0.005) => Math.abs(a - b) <= tol;

// ether emits no buffs of her own, so her slot index is resolved from a buff she RECEIVES
// (liter/crown buff the squad). Asserted non-negative below, so a failure is loud.
function slotOf(evs: AnyEv[], slug: string): number {
  for (const e of evs) {
    const a = e as any;
    if (a.kind === 'buffApply' && a.targetSlug === slug && typeof a.targetIdx === 'number') {
      return a.targetIdx;
    }
  }
  return -1;
}

// ---------------------------------------------------------------------------
// hoisted counterfactual overrides + runs (5 × 180s sims)
// ---------------------------------------------------------------------------
let epsPatched = 0;
let unitPatched = 0;
let corePatched = 0;

const ovEps = withPatchedOverride(SLUG, (o: any) => {
  epsPatched = eachFlatDamage(o, (e) => {
    e.atkPct = EPS;
  });
});
const ovUnit = withPatchedOverride(SLUG, (o: any) => {
  unitPatched = eachFlatDamage(o, (e) => {
    e.atkPct = UNIT_PCT;
  });
});
const ovCore = withPatchedOverride(SLUG, (o: any) => {
  corePatched = eachFlatDamage(o, (e) => {
    e.core = true;
  });
});
const ovNoDef = withPatchedOverride(SLUG, (o: any) => {
  blocksOf(o, 'skill1').length = 0;
  blocksOf(o, 'burst').length = 0;
});

const base = run();
const eps = run({ [SLUG]: ovEps });
const unit = run({ [SLUG]: ovUnit });
const cored = run({ [SLUG]: ovCore });
const noDef = run({ [SLUG]: ovNoDef });

const ETHER = slotOf(base.events, SLUG);
const riderHits = base.events.filter(
  (e) =>
    (e as any).kind === 'damage' &&
    (e as any).bucket === 'skill' &&
    casterOf(e) === ETHER,
);
const fbCount = (r: { events: AnyEv[] }) => kind(r.events, 'fullBurstStart').length;
const mates = () => Object.keys(base.tot).filter((s) => s !== SLUG);

describe('ether — fixture validity (non-vacuity)', () => {
  it('wires the event bus and resolves ether in the comp', () => {
    expect(base.events.length).toBeGreaterThan(0);
    expect(ETHER).toBeGreaterThanOrEqual(0);
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
  });

  it('reaches Full Burst, so FB-timing and FB-gated readings are exercised', () => {
    expect(fbCount(base)).toBeGreaterThan(0);
  });

  it('ether fires her SG (normal bucket is live)', () => {
    const normals = base.events.filter(
      (e) =>
        (e as any).kind === 'damage' &&
        (e as any).bucket === 'normal' &&
        casterOf(e) === ETHER,
    );
    expect(normals.length).toBeGreaterThan(0);
  });

  it('the flatDamage rider exists to be patched (guards no-op counterfactuals)', () => {
    // If these are 0 every magnitude counterfactual below is a silent no-op — i.e. skill2a is
    // MISSING from the model, which is exactly what this assertion surfaces.
    expect(epsPatched).toBeGreaterThanOrEqual(1);
    expect(unitPatched).toBe(epsPatched);
    expect(corePatched).toBe(epsPatched);
  });
});

describe('ether skill2a — 56.32% of final ATK, single instance, interval-shaped', () => {
  it('lands repeating skill-bucket damage from ether', () => {
    // Discriminates FAITHFUL vs MISSING (a dropped damage line yields zero instances).
    expect(riderHits.length).toBeGreaterThan(0);
  });

  it('fires on an interval-shaped cadence, not per-shot and not once-only', () => {
    // The kit gives NO activation clause ⇒ interval. ⚑ the PERIOD is not in the kit text, so the
    // exact count is not asserted. >=2 refutes a one-shot/burstCast reading; <=60 over 180s
    // (slower than once per 3s) refutes a shotFired/hitCount reading — ether's SG fires far more
    // often than that.
    expect(riderHits.length).toBeGreaterThanOrEqual(2);
    expect(riderHits.length).toBeLessThanOrEqual(60);
  });

  it('implies atkPct 56.32 in ABSOLUTE terms (refutes the ×3 three-enemy fold)', () => {
    // Rider contribution is linear in atkPct and the gauge impact is per-instance (unchanged),
    // so two probe magnitudes recover the shipped percentage outright: a model that credits all
    // 3 header targets against the single-target boss implies ~168.96 and fails here.
    const cBase = base.tot[SLUG] - eps.tot[SLUG];
    const cUnit = unit.tot[SLUG] - eps.tot[SLUG];
    expect(cBase).toBeGreaterThan(0);
    expect(cUnit).toBeGreaterThan(0);
    const impliedPct = (cBase / cUnit) * (UNIT_PCT - EPS) + EPS;
    expect(impliedPct).toBeGreaterThan(RIDER_PCT * 0.99);
    expect(impliedPct).toBeLessThan(RIDER_PCT * 1.01);
  });

  it('keeps the rotation identical across magnitude probes (linearity is valid)', () => {
    // Validity guard for the assertion above: if changing atkPct moved the burst rotation, the
    // two-point extrapolation would not be measuring magnitude.
    expect(fbCount(eps)).toBe(fbCount(base));
    expect(fbCount(unit)).toBe(fbCount(base));
    expect(riderHits.length).toBe(
      eps.events.filter(
        (e) =>
          (e as any).kind === 'damage' &&
          (e as any).bucket === 'skill' &&
          casterOf(e) === ETHER,
      ).length,
    );
  });

  it('takes NO +30% range bonus (rider convention)', () => {
    // Nearest-wrong: a rider authored without noRange, which silently inflates every instance.
    expect(riderHits.length).toBeGreaterThan(0);
    expect(riderHits.every((e) => (e as any).rangeApplied === false)).toBe(true);
  });

  it('is core-INELIGIBLE (the kit never says core strike)', () => {
    // Behavioural discriminator, field-name independent: flipping core:true on the SAME rider
    // must ADD damage. If it does not, the shipped model already cores (or the rider is absent).
    expect(cored.tot[SLUG]).toBeGreaterThan(base.tot[SLUG]);
  });

  it('is Full-Burst eligible by landing timing, and exercises both states', () => {
    // Non-vacuity: the fixture must produce in-FB AND out-of-FB instances, else the FB claim is
    // untested. Nearest-wrong: noFb:true (per-kit noFb is measured-only, default OFF).
    const inFb = riderHits.filter((e) => (e as any).inFullBurst === true);
    const outFb = riderHits.filter((e) => (e as any).inFullBurst !== true);
    expect(inFb.length).toBeGreaterThan(0);
    expect(outFb.length).toBeGreaterThan(0);
    expect(inFb.every((e) => (e as any).fbMajorApplied === true)).toBe(true);
    expect(outFb.every((e) => (e as any).fbMajorApplied !== true)).toBe(true);
  });

  it('moves ONLY ether — no teammate damage rides the rider', () => {
    for (const slug of mates()) {
      expect(eps.tot[slug]).toBe(base.tot[slug]);
    }
  });
});

describe('ether skill2b — boss DEF ▼ 9.38% for 6 sec, during Full Burst', () => {
  it.skip('reduces the boss final DEF by 9.38% for 6s on Full Burst entry — GAP: no enemy-DEF-reduction primitive exists (StatKey defPct is SELF DEF and inert in v1; damageTakenPct is a different mechanic with a different magnitude). Needs an enemyDefPct stat + a boss-DEF term consumer before it can be modeled or asserted.', () => {
    expect(true).toBe(true);
  });

  it('is NOT fudged into a damage-moving boss debuff', () => {
    // The tempting wrong model is damageTakenPct +9.38 (boss takes more) standing in for DEF ▼.
    // Boss-held debuffs carry casterIdx === null, so this filters by stat + value, not by caster.
    const fudged = kind(base.events, 'buffApply').filter((e) => {
      const a = e as any;
      return (
        (a.stat === 'damageTakenPct' || casterOf(e) === ETHER || a.casterIdx === ETHER) &&
        (near(Math.abs(a.value ?? 0), DEF_DOWN_PCT) || near(Math.abs(a.value ?? 0), DR_PCT))
      );
    });
    expect(fudged).toEqual([]);
  });
});

describe('ether skill1 — ally Damage Taken ▼ 52.5% for 5 sec (defensive)', () => {
  it('grants ether no damage-moving buff to anyone', () => {
    // Whole-kit anti-fudge: ether has ZERO offensive buff lines, so any offensive stat sourced
    // from her slot is invented. Catches the DR-as-damageTakenPct and shield-as-MaxHP folds both.
    const offensive = new Set([
      'atkPct',
      'casterAtkPct',
      'highestAllyAtkPct',
      'atkOfMaxHpPct',
      'atkOfCasterMaxHpPct',
      'attackDamagePct',
      'critRatePct',
      'critRateNormalPct',
      'critDamagePct',
      'coreDamagePct',
      'elementDamagePct',
      'damageTakenPct',
      'trueDamagePct',
      'sustainedDamagePct',
      'maxHpFlat',
      'casterMaxHpPct',
      'targetMaxHpPct',
      'highestAllyMaxHpPct',
      'hitRatePct',
      'burstGenPct',
    ]);
    const fromEther = kind(base.events, 'buffApply').filter(
      (e) => casterOf(e) === ETHER && offensive.has((e as any).stat),
    );
    expect(fromEther.map((e) => (e as any).stat)).toEqual([]);
  });

  it('both defensive lines are board-inert at scope lock', () => {
    // Emptying skill1 (ally DR) and burst (shield) must move NOTHING: the boss deals no damage,
    // no unit has an HP pool, and no unit in this comp carries a `shielded` trigger or a
    // requiresShielded gate. Byte-identical totals — for ether AND every teammate.
    for (const slug of Object.keys(base.tot)) {
      expect(noDef.tot[slug]).toBe(base.tot[slug]);
    }
    expect(fbCount(noDef)).toBe(fbCount(base));
  });
});

describe('ether burst — Shield 96% of caster final Max HP, 5 sec, 3 lowest-HP allies', () => {
  it('ether actually casts her Burst I in this fixture (non-vacuity)', () => {
    // ether is Burst I and controlComp seats liter (also B1), which competes for stage 1. If this
    // is 0 the burst group cannot be exercised at all — a FIXTURE finding, not a model finding.
    const casts = kind(base.events, 'burstCast').filter(
      (e) => casterOf(e) === ETHER || (e as any).slug === SLUG,
    );
    expect(casts.length).toBeGreaterThan(0);
  });

  it('the shield is NOT encoded as a Max HP grant', () => {
    // Nearest-wrong: `shield{maxHpPct:96}` mis-modeled as casterMaxHpPct / maxHpFlat on allies.
    // That is not merely cosmetic — a Max HP grant feeds an atkOfMaxHpPct consumer and would
    // manufacture ATK out of a purely defensive line.
    const hpGrants = kind(base.events, 'buffApply').filter((e) => {
      const a = e as any;
      return (
        casterOf(e) === ETHER &&
        ['maxHpFlat', 'casterMaxHpPct', 'targetMaxHpPct', 'highestAllyMaxHpPct', 'maxHpPct'].includes(
          a.stat,
        )
      );
    });
    expect(hpGrants).toEqual([]);
  });

  it.skip('the shield fires a teammate `shielded` trigger / opens a requiresShielded gate — GAP: no shield event kind exists on the onEvent bus and controlComp seats no shield-consuming unit, so the tandem payload is unobservable here. Needs a fixture with a shield-gated ally.', () => {
    expect(true).toBe(true);
  });

  it.skip('the shield covers exactly the 3 lowest-remaining-HP allies (alliesLowestHp count 3) — GAP: shield application emits no observable event and v1 has no HP pool (lowest-HP resolves to a documented leftmost-N stand-in), so the target set cannot be discriminated behaviourally.', () => {
    expect(true).toBe(true);
  });
});
