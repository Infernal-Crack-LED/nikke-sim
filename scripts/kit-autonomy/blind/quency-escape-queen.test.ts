/**
 * quency-escape-queen -- Quency: Escape Queen (SMG / Water / Attacker / Burst III)
 * BLIND per-unit kit spec. Written from the kit prose ALONE: no sight of the driver
 * override, the driver tests, or any truth file.
 *
 * BASE: cd 40s, ammo 120, reloadFrames 81, hitsPerShot 2, normalAttackMultiplier 10.12,
 * coreAttackMultiplier 250 -- a high-cadence SMG, so every skill2 stack tier saturates
 * within ~1s of firing and re-ramps after each reload.
 *
 * KIT AS READ (structural):
 *   skill1 -- three continuous SELF passives, each gated on an Explore Route stage being
 *             at MAX STACKS (the stages are the skill2 stack tiers):
 *     A  stage-1 max -> Distributed Damage +49.58%  -> distributedDamagePct
 *     B  stage-2 max -> core damage +25.25%         -> coreDamagePct
 *     C  stage-3 max -> Critical Rate +16.73%       -> critRatePct. UNSCOPED: the line
 *        carries no normal-attack qualifier, so critRateNormalPct would be wrong.
 *   skill2 -- SELF, after 2 normal attacks, three cumulative stages (each stage also
 *             fires the ones before it):
 *     S1  hitRate +1.36% x10 / 2s    ATK +2.45% x10 / 2s
 *     S2  hitRate +2.71% x10 / 1s    ATK +4.9%  x10 / 1s   (needs stage-1 at max)
 *     S3  hitRate +4.08% x5  / 0.5s  ATK +7.36% x5  / 0.5s (needs stage-2 at max)
 *   burst -- SELF: Attack Damage +57.08% and Reload Speed +25.87%, both 10s;
 *            ALL ENEMIES: 1736.31% of final ATK as DISTRIBUTED damage. That flavor is
 *            what makes skill1-A a real consumer of her own burst, and it is the only
 *            distributed source in the fixture -- so the pairing is directly testable.
 *
 * FIXTURE: controlComp(SLUG, true) -- liter B1 / crown B2 / quency B3 / helm B3. A lone
 * B3 casts ZERO bursts, so B1+B2 are mandatory. helm is kept (standard fixture); every
 * assertion is a WITHIN-fixture counterfactual, so her constant contribution cancels.
 *
 * METHOD: counterfactuals are built with withPatchedOverride and mutate the clone
 * SLOT-AGNOSTICALLY -- each stat below appears in exactly one kit slot, so scanning all
 * three slots cannot over-reach, and the test stays robust to where the driver placed a
 * block. blocksOf() accepts both documented file shapes (slot: Block[] and
 * slot: {blocks: Block[]}). Every patch records how many effects it matched; a count of 0
 * means the kit line was never authored at all, asserted separately so a MISSING line is
 * never mis-read as an inert one.
 *
 * 13 hoisted runs (each a full 180s sim).
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js'; // DRIVER ADAPTATION: blind wrote '../lib/harness.js' (no such
// module); the live harness is scripts/tests/lib/harness.ts. Assertion INTENT unchanged — the
// blind writer used the real 2-arg withPatchedOverride / controlComp / totals API and the real
// event fields (.frame/.targetSlug/.casterIdx/.srcSlot/.stacks/.maxStacks), so NO other correction
// was needed. Its 5 it.skip gaps (stage-gate primitive, cascade ordering, stack-window duration,
// nuke core/FB/range flags, pulls-vs-rounds) are the blind's honest dispositions and match the
// driver's documented ⚑s; S7 adjudicates. Raw blind output: cross-family/quency-escape-queen/s5-result.json.

const SLUG = 'quency-escape-queen';
const SLOTS = ['skill1', 'skill2', 'burst'] as const;
const DAMAGE_KINDS = new Set(['flatDamage', 'dot', 'storedHit']);

type Rec = Record<string, any>;

// The override FILE is slot-keyed; the two documented shapes are slot: Block[] and
// slot: { blocks: Block[] }. Accept both so the counterfactuals cannot silently no-op.
function blocksOf(ov: Rec, slot: string): Rec[] {
  const s = ov?.[slot];
  if (!s) {return [];}
  if (Array.isArray(s)) {return s as Rec[];}
  return Array.isArray(s.blocks) ? (s.blocks as Rec[]) : [];
}

function eachBlock(ov: Rec, fn: (b: Rec, slot: string) => void): void {
  for (const slot of SLOTS) {for (const b of blocksOf(ov, slot)) {fn(b, slot);}}
}

function eachEffect(ov: Rec, fn: (e: Rec, b: Rec, slot: string) => void): void {
  eachBlock(ov, (b, slot) => {
    for (const e of (b.effects ?? []) as Rec[]) {fn(e, b, slot);}
  });
}

type Mutator = (ov: Rec) => number;

const zeroStat =
  (stat: string): Mutator =>
  (ov) => {
    let n = 0;
    eachEffect(ov, (e) => {
      if (e.kind === 'buff' && e.stat === stat) {
        e.value = 0;
        n += 1;
      }
    });
    return n;
  };

const setDuration =
  (stat: string, sec: number): Mutator =>
  (ov) => {
    let n = 0;
    eachEffect(ov, (e) => {
      if (e.kind === 'buff' && e.stat === stat) {
        e.durationSec = sec;
        n += 1;
      }
    });
    return n;
  };

// Remove (not zero) the burst damage payload, so its damage events disappear entirely
// and can be counted by difference.
const dropBurstDamage: Mutator = (ov) => {
  let n = 0;
  eachBlock(ov, (b, slot) => {
    if (slot !== 'burst') {return;}
    const before = ((b.effects ?? []) as Rec[]).length;
    b.effects = ((b.effects ?? []) as Rec[]).filter(
      (e) => !DAMAGE_KINDS.has(e.kind)
    );
    n += before - (b.effects as Rec[]).length;
  });
  return n;
};

const stripBurstDamageFlavor: Mutator = (ov) => {
  let n = 0;
  eachEffect(ov, (e, _b, slot) => {
    if (
      slot === 'burst' &&
      DAMAGE_KINDS.has(e.kind) &&
      e.flavor === 'distributed'
    ) {
      delete e.flavor;
      n += 1;
    }
  });
  return n;
};

const touched: Record<string, number> = {};

function patched(key: string, ...ms: Mutator[]): unknown {
  return withPatchedOverride(SLUG, (ov: any) => {
    let n = 0;
    for (const m of ms) {n += m(ov as Rec);}
    touched[key] = n;
  });
}

interface Run {
  total: number;
  events: SimEvent[];
  res: any;
}

function run(override?: unknown): Run {
  const events: SimEvent[] = [];
  const opts: any = controlComp(SLUG, true);
  if (override)
    {opts.overrides = { ...(opts.overrides ?? {}), [SLUG]: override };}
  opts.cfg = {
    ...(opts.cfg ?? {}),
    onEvent: (ev: SimEvent) => events.push(ev),
  };
  const res: any = runComp(opts);
  return { total: totals(res)[SLUG], events, res };
}

// ---- hoisted runs (13 x 180s) ------------------------------------------------
const BASE = run();
const NO_DIST = run(patched('dist', zeroStat('distributedDamagePct')));
const NO_CORE = run(patched('core', zeroStat('coreDamagePct')));
const NO_CRIT = run(patched('crit', zeroStat('critRatePct')));
const NO_ATK = run(patched('atk', zeroStat('atkPct')));
const NO_HR = run(patched('hitRate', zeroStat('hitRatePct')));
const NO_AD = run(patched('attackDamage', zeroStat('attackDamagePct')));
const NO_RELOAD = run(patched('reloadSpeed', zeroStat('reloadSpeedPct')));
const NO_NUKE = run(patched('nuke', dropBurstDamage));
const PLAIN_NUKE = run(patched('flavor', stripBurstDamageFlavor));
const PLAIN_NUKE_NO_DIST = run(
  patched(
    'flavorDist',
    stripBurstDamageFlavor,
    zeroStat('distributedDamagePct')
  )
);
const AD_1S = run(patched('ad1', setDuration('attackDamagePct', 1)));
const AD_30S = run(patched('ad30', setDuration('attackDamagePct', 30)));

const PATCH_KEYS = [
  'dist',
  'core',
  'crit',
  'atk',
  'hitRate',
  'attackDamage',
  'reloadSpeed',
  'nuke',
  'flavor',
  'flavorDist',
  'ad1',
  'ad30',
];

// ---- event readers -----------------------------------------------------------
const buffApplies = (r: Run, stat: string, value: number): Rec[] =>
  (r.events as unknown as Rec[]).filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.stat === stat &&
      Math.abs(Number(e.value) - value) < 1e-6
  );

const selfBuffApplies = (r: Run, stat: string, value: number): Rec[] =>
  buffApplies(r, stat, value).filter((e) => e.targetSlug === SLUG);

const burstDamageEvents = (r: Run): number =>
  (r.events as unknown as Rec[]).filter(
    (e) => e.kind === 'damage' && e.srcSlot === 'burst'
  ).length;

const others = (r: Run): Record<string, number> => {
  const t: Rec = { ...totals(r.res) };
  delete t[SLUG];
  return t;
};

// Her burst self-buff is the only per-cast, kit-unique marker available, so its apply
// count IS her cast count (helm is the other B3 and never grants attackDamagePct 57.08).
const castCount = (): number =>
  selfBuffApplies(BASE, 'attackDamagePct', 57.08).length;

describe('quency-escape-queen -- harness wiring and non-vacuity', () => {
  it('the fixture runs, emits events, and deals damage', () => {
    expect(BASE.events.length).toBeGreaterThan(0);
    expect(BASE.total).toBeGreaterThan(0);
    expect(unitOf(BASE.res, SLUG).totalDamage).toBe(BASE.total);
  });

  it('she actually casts her burst in this fixture', () => {
    // Non-vacuity guard for every burst assertion below: with helm as a second B3 the
    // rotation could in principle never hand her the stage-3 slot.
    expect(castCount()).toBeGreaterThanOrEqual(2);
  });

  it('every counterfactual matched at least one authored effect', () => {
    expect(Object.keys(touched).sort()).toEqual([...PATCH_KEYS].sort());
    for (const [k, v] of Object.entries(touched)) {
      // 0 = the kit line is absent from the override, not merely inert.
      expect(
        v,
        `patch ${k} matched no authored effect -- kit line MISSING`
      ).toBeGreaterThan(0);
    }
  });
});

describe('skill1 -- three continuous self gates', () => {
  it('A: Distributed Damage +49.58% is self-scoped and load-bearing', () => {
    const evs = selfBuffApplies(BASE, 'distributedDamagePct', 49.58);
    expect(evs.length).toBeGreaterThan(0);
    expect(
      buffApplies(BASE, 'distributedDamagePct', 49.58).every(
        (e) => e.targetSlug === SLUG
      )
    ).toBe(true);
    // Nearest-wrong: authored but never reaching a consumer (inert stat) -> equal totals.
    expect(NO_DIST.total).toBeLessThan(BASE.total);
    expect(others(NO_DIST)).toEqual(others(BASE));
  });

  it('A: it reaches her burst nuke via the distributed FLAVOR, not a generic bucket', () => {
    // With the flavor stripped, the distributed buff must become a no-op. If the driver
    // routed distributedDamagePct into a generic Damage-Up bucket instead, these diverge.
    expect(PLAIN_NUKE_NO_DIST.total).toBe(PLAIN_NUKE.total);
    // ...and the pairing is non-vacuous: unstripped, the same zeroing DOES move damage.
    expect(NO_DIST.total).not.toBe(BASE.total);
  });

  it('B: core damage +25.25% is self-scoped and load-bearing', () => {
    const evs = selfBuffApplies(BASE, 'coreDamagePct', 25.25);
    expect(evs.length).toBeGreaterThan(0);
    expect(
      buffApplies(BASE, 'coreDamagePct', 25.25).every(
        (e) => e.targetSlug === SLUG
      )
    ).toBe(true);
    expect(NO_CORE.total).toBeLessThan(BASE.total);
    expect(others(NO_CORE)).toEqual(others(BASE));
  });

  it('C: Critical Rate +16.73% is UNSCOPED crit, self-only, load-bearing', () => {
    const evs = selfBuffApplies(BASE, 'critRatePct', 16.73);
    expect(evs.length).toBeGreaterThan(0);
    // Nearest-wrong: critRateNormalPct (the normal-attack-scoped mechanic). Her line has
    // no such qualifier; matching by VALUE avoids colliding with helm ally crit grants.
    expect(buffApplies(BASE, 'critRateNormalPct', 16.73).length).toBe(0);
    expect(NO_CRIT.total).toBeLessThan(BASE.total);
    expect(others(NO_CRIT)).toEqual(others(BASE));
  });

  it('no skill1 gate leaks onto a teammate (all three lines say Affects self)', () => {
    for (const [stat, value] of [
      ['distributedDamagePct', 49.58],
      ['coreDamagePct', 25.25],
      ['critRatePct', 16.73],
    ] as [string, number][]) {
      for (const e of buffApplies(BASE, stat, value)) {
        expect(e.targetSlug, `${stat} ${value} applied off-self`).toBe(SLUG);
        expect(
          e.casterIdx,
          `${stat} ${value} looks like a boss debuff`
        ).not.toBeNull();
      }
    }
  });
});

const LADDER: {
  stat: string;
  value: number;
  maxStacks: number;
  tier: string;
}[] = [
  { stat: 'hitRatePct', value: 1.36, maxStacks: 10, tier: 'S1' },
  { stat: 'atkPct', value: 2.45, maxStacks: 10, tier: 'S1' },
  { stat: 'hitRatePct', value: 2.71, maxStacks: 10, tier: 'S2' },
  { stat: 'atkPct', value: 4.9, maxStacks: 10, tier: 'S2' },
  { stat: 'hitRatePct', value: 4.08, maxStacks: 5, tier: 'S3' },
  { stat: 'atkPct', value: 7.36, maxStacks: 5, tier: 'S3' },
];

describe('skill2 -- after 2 normal attacks, three cumulative self stages', () => {
  it('all six stage magnitudes and stack caps are encoded literally', () => {
    // Nearest-wrong: collapsing the ladder into one pre-summed buff (110.3% ATK /
    // 61.1% Hit Rate at full stacks) -- that model has none of these six pairs.
    for (const L of LADDER) {
      const evs = selfBuffApplies(BASE, L.stat, L.value);
      expect(
        evs.length,
        `${L.tier} ${L.stat} ${L.value} never applied to self`
      ).toBeGreaterThan(0);
      expect(evs[0].maxStacks, `${L.tier} ${L.stat} stack cap`).toBe(
        L.maxStacks
      );
      const peak = Math.max(...evs.map((e) => Number(e.stacks ?? 0)));
      // At SMG cadence a tier refreshes far faster than its 2s/1s/0.5s window, so it must
      // saturate; allow 1 stack of slack for the 0.5s tier landing on its own expiry frame.
      expect(
        peak,
        `${L.tier} ${L.stat} never approaches its cap`
      ).toBeGreaterThanOrEqual(L.maxStacks - 1);
    }
  });

  it('the ATK ladder is load-bearing and self-only', () => {
    for (const L of LADDER.filter((x) => x.stat === 'atkPct')) {
      expect(
        buffApplies(BASE, 'atkPct', L.value).every((e) => e.targetSlug === SLUG)
      ).toBe(true);
    }
    expect(NO_ATK.total).toBeLessThan(BASE.total);
    expect(others(NO_ATK)).toEqual(others(BASE));
  });

  it('the Hit Rate ladder is load-bearing (hit rate lifts her core rate)', () => {
    for (const L of LADDER.filter((x) => x.stat === 'hitRatePct')) {
      expect(
        buffApplies(BASE, 'hitRatePct', L.value).every(
          (e) => e.targetSlug === SLUG
        )
      ).toBe(true);
    }
    // Nearest-wrong: dropping Hit Rate as defensive/inert -> zeroing it changes nothing.
    expect(NO_HR.total).toBeLessThan(BASE.total);
    expect(others(NO_HR)).toEqual(others(BASE));
  });

  it('the trigger fires on a normal-attack cadence, not a burst or interval cadence', () => {
    const n = selfBuffApplies(BASE, 'atkPct', 2.45).length;
    // 180s at SMG cadence (~20 pulls/s nominal, ~70% fire uptime around 81f reloads) gives
    // roughly 1.2k applications if the trigger counts 2 PULLS and ~2.5k if it counts 2
    // ROUNDS (hitsPerShot 2). Both sit inside this band; a burstCast/fullBurstEnter mis-key
    // (~4) or an interval mis-key (tens) falls far below it, a per-round trigger far above.
    expect(n).toBeGreaterThan(400);
    expect(n).toBeLessThan(6000);
  });
});

describe('burst -- self window plus the distributed nuke', () => {
  it('both self buffs are authored at kit magnitude, self-scoped, once per cast', () => {
    const ad = selfBuffApplies(BASE, 'attackDamagePct', 57.08);
    const rs = selfBuffApplies(BASE, 'reloadSpeedPct', 25.87);
    expect(ad.length).toBeGreaterThanOrEqual(2);
    // Both lines sit under the same Affects-self header, so they must co-fire.
    expect(rs.length).toBe(ad.length);
    expect(
      buffApplies(BASE, 'attackDamagePct', 57.08).every(
        (e) => e.targetSlug === SLUG
      )
    ).toBe(true);
    expect(
      buffApplies(BASE, 'reloadSpeedPct', 25.87).every(
        (e) => e.targetSlug === SLUG
      )
    ).toBe(true);
  });

  it('Attack Damage +57.08% is load-bearing and its 10s window is bounded', () => {
    expect(NO_AD.total).toBeLessThan(BASE.total);
    // Nearest-wrong 1: no durationSec (permanent) -> shrinking to 1s would still be
    // strictly worse, but widening to 30s could not IMPROVE on a permanent buff.
    expect(AD_1S.total).toBeLessThan(BASE.total);
    expect(AD_30S.total).toBeGreaterThan(BASE.total);
    expect(others(NO_AD)).toEqual(others(BASE));
  });

  it('Reload Speed +25.87% is DAMAGE -- it buys shots inside the window', () => {
    // Weapon-state modifiers gate shot count; a kit that drops reload speed as defensive
    // leaves this run byte-identical to base.
    expect(NO_RELOAD.total).toBeLessThan(BASE.total);
    // Teammate inertness deliberately NOT asserted here: changing her shot count changes
    // her burst-gauge contribution, which can legitimately shift the whole rotation.
  });

  it('the 1736.31% distributed nuke lands exactly once per burst cast', () => {
    const delta = burstDamageEvents(BASE) - burstDamageEvents(NO_NUKE);
    expect(delta).toBeGreaterThan(0);
    // Nearest-wrong: encoding the nuke as a dot or a per-shot rider -> delta >> casts.
    expect(delta).toBe(castCount());
    expect(NO_NUKE.total).toBeLessThan(BASE.total);
    expect(others(NO_NUKE)).toEqual(others(BASE));
  });
});

describe('gaps -- kit text this fixture cannot discriminate', () => {
  it.skip('skill1 gates only while the matching Explore Route stage is at MAX stacks', () => {
    // GAP: the engine has no at-max-stacks gate primitive. Any faithful encoding
    // (rampSec on a passive, or a resource + resourceGate) emits the same buffApply, so
    // the opening ramp and the post-reload flicker (81f reload > the 1s/0.5s tier windows)
    // are unobservable from the event stream. Recipe: expose per-frame buff state, or pin
    // the ramp from footage.
  });

  it.skip('skill2 stage 2 requires stage 1 at max, stage 3 requires stage 2 at max', () => {
    // GAP: same missing primitive. In steady state all three tiers are saturated, so the
    // prerequisite is damage-visible only during the ~1-2s opening ramp and after reloads.
  });

  it.skip('stack windows are 2s / 1s / 0.5s per tier', () => {
    // GAP: no buffRemove is emitted on natural lapse, and expiresFrame cannot be paired
    // with an apply frame from the documented event fields. Duration is therefore encoded
    // but unasserted; at SMG cadence it is near-inert except across reloads.
  });

  it.skip('the burst nuke is non-core, full-burst-exempt, and range-exempt', () => {
    // GAP: damage events carry no slug, so her own burst hit cannot be isolated from the
    // global stream to read core / fbMajorApplied / rangeApplied. Kit text gives no core
    // strike wording, and a burst cast lands before the FB window opens.
  });

  it.skip('2 normal attacks means 2 trigger pulls, not 2 rounds (hitsPerShot 2)', () => {
    // MEASUREMENT-GATED: both readings land inside the cadence band asserted above. The
    // 2x difference in stack-rebuild speed is only visible in the post-reload ramp.
    // Recipe: popup-count the first magazine after a reload against the ATK ladder.
  });
});
