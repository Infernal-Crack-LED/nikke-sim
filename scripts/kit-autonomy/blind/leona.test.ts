/**
 * leona (SG / Water / Supporter / Burst II) — BLIND per-unit kit spec test.
 * Written from the kit prose ALONE; no sight of any existing override, test, or reasoning.
 *
 * KIT LINES UNDER TEST (ammo 9, hitsPerShot 10, reload 111f, normal mult 201.5):
 *   S1a  after 5 normal attacks, all allies:   Critical Rate ▲2.62%, up to 5 stacks, 5 sec  (Roar)
 *   S1b  after 15 normal attacks, SG allies:   Maximum Effective Range ▲20%, 10 sec
 *   S2a  entering Full Burst, all allies:      Hit Rate ▲20.28%, 10 sec
 *   S2b  entering Full Burst, 2 highest-final-ATK SG allies: Number of pellets ▲5, 10 sec
 *   Ba   burst cast, all allies:               Critical Damage ▲34.64%, 10 sec
 *   Bb   burst cast, Roar at max stacks, SG allies: Critical Rate ▲21.32%, 10 sec
 *
 * FIXTURE — controlComp('leona', true): liter(B1) / crown(B2) / leona(carry) / helm(B3, SR/Water).
 *   The helm slot must stay ON: leona is a Burst II, so with no Burst III present nothing chains and
 *   the comp makes ZERO full bursts, which would make every S2/burst assertion vacuous.
 *   Two fixture facts the assertions are built around:
 *     1. leona is the ONLY shotgun present. Every SG-scoped line must therefore land on a STRICT
 *        SUBSET of the roster containing leona — that subset check is the discriminator against an
 *        all-allies mis-scope. It cannot separate '2 highest-final-ATK SG allies' from 'all SG
 *        allies' (both collapse to {leona}); that case is skipped and documented.
 *     2. crown is also a Burst II, so leona may never win the B2 slot here. The burst-slot
 *        behavioural assertions run under it.runIf(she actually cast); the complementary branch
 *        asserts the burst lines are at least ENCODED, so the file is never silently vacuous.
 *
 * WHY EACH COUNTERFACTUAL DISCRIMINATES: every patched run zeroes exactly ONE kit value in an
 * in-memory clone of the committed override (withPatchedOverride — the JSON on disk is untouched)
 * and asserts the direction of the damage move PLUS what must not move. A stat encoded under the
 * wrong key or magnitude is not matched by the patch, so that run returns identical to baseline and
 * the assertion goes RED — that is the nearest-wrong model this file rejects.
 *
 * FLAGGED (⚑): the cadence bound in the Roar-cadence test is deliberately loose — SG pulls/sec is a
 * datamine-unreliable field, so the bound is wide enough for any plausible cadence yet still
 * separates ROUND counting (~25-60 activations over 180 s) from PELLET counting (~250-600, i.e. 10x,
 * because one shell registers 10 pellet hits). ⚑ The Hit-Rate to core-rate magnitude is engine-owned
 * (hrCoreMult, live by default), so S2a is asserted by DIRECTION only, never by magnitude.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

type Ev = SimEvent & Record<string, any>;

const SLUG = 'leona';
const SLOTS = ['skill1', 'skill2', 'burst'] as const;
const near = (a: unknown, b: number) =>
  typeof a === 'number' && Math.abs(a - b) < 1e-6;

// The override FILE is slot-keyed. Accept BOTH documented shapes (slot => Block[] and
// slot => { blocks: Block[] }) so a shape guess can never produce a false failure.
const blocksOf = (slot: any): any[] =>
  Array.isArray(slot) ? slot : Array.isArray(slot?.blocks) ? slot.blocks : [];
const allBlocks = (ov: any): any[] => SLOTS.flatMap((s) => blocksOf(ov?.[s]));
const effectsOf = (bs: any[]): any[] =>
  bs.flatMap((b: any) => (Array.isArray(b?.effects) ? b.effects : []));

// Read-only in-memory clone of the committed override (used for the few structural,
// kit-literal assertions that no behaviour can reach in this fixture).
const OV = withPatchedOverride(SLUG, () => {}) as any;

function patch(match: (e: any) => boolean, mutate: (e: any) => void) {
  return withPatchedOverride(SLUG, (ov: any) => {
    for (const e of effectsOf(allBlocks(ov))) if (match(e)) mutate(e);
  }) as any;
}

function run(overrides?: Record<string, any>) {
  const evs: Ev[] = [];
  const seen = new Set<unknown>();
  // The event hook is documented as cfg.onEvent; wire BOTH plausible spellings and dedupe by
  // object identity so neither a missing hook nor a double-delivery corrupts the counts.
  const push = (e: SimEvent) => {
    if (seen.has(e)) return;
    seen.add(e);
    evs.push(e as Ev);
  };
  const opts: any = controlComp(SLUG, true);
  opts.onEvent = push;
  opts.cfg = { ...(opts.cfg ?? {}), onEvent: push };
  if (overrides) opts.overrides = { ...(opts.overrides ?? {}), ...overrides };
  const res = runComp(opts);
  return { res, evs, tot: totals(res) as Record<string, number> };
}

const applies = (evs: Ev[], stat: string, value: number) =>
  evs.filter(
    (e) => e.kind === 'buffApply' && e.stat === stat && near(e.value, value),
  );
const slugsOf = (evs: Ev[]) =>
  [...new Set(evs.map((e) => e.targetSlug))].sort();
const frameOf = (e: Ev): number | undefined =>
  typeof e.frame === 'number' ? e.frame : undefined;
const sum = (t: Record<string, number>) =>
  Object.values(t).reduce((a, b) => a + b, 0);
const fbCount = (evs: Ev[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart').length;
const others = (t: Record<string, number>) =>
  Object.fromEntries(Object.entries(t).filter(([s]) => s !== SLUG));

// ---- hoisted runs: 5 full 180 s sims, nothing per-test ----
const base = run();
const EV = base.evs;
const ROSTER = Object.keys(base.tot).sort();
const FB_STARTS = fbCount(EV);
const fbStartFrames = EV.filter((e) => e.kind === 'fullBurstStart')
  .map(frameOf)
  .filter((f): f is number => f !== undefined);
const HAS_FRAMES = fbStartFrames.length === FB_STARTS && FB_STARTS > 0;

const ROAR = applies(EV, 'critRatePct', 2.62);
const ROAR_SELF = ROAR.filter((e) => e.targetSlug === SLUG);
const HITRATE = applies(EV, 'hitRatePct', 20.28);
const PELLET = applies(EV, 'pelletCountFlat', 5);
const CRITDMG = applies(EV, 'critDamagePct', 34.64);
const BURSTCR = applies(EV, 'critRatePct', 21.32);
const LEONA_BURSTS = CRITDMG.filter((e) => e.targetSlug === SLUG).length;

const noRoar = run({
  [SLUG]: patch(
    (e) => e.stat === 'critRatePct' && near(e.value, 2.62),
    (e) => {
      e.value = 0;
    },
  ),
});
const roarOneStack = run({
  [SLUG]: patch(
    (e) => e.stat === 'critRatePct' && near(e.value, 2.62),
    (e) => {
      e.maxStacks = 1;
    },
  ),
});
const noHitRate = run({
  [SLUG]: patch(
    (e) => e.stat === 'hitRatePct',
    (e) => {
      e.value = 0;
    },
  ),
});
const noPellets = run({
  [SLUG]: patch(
    (e) => e.stat === 'pelletCountFlat',
    (e) => {
      e.value = 0;
    },
  ),
});

const minGap = (f: number) =>
  Math.min(...fbStartFrames.map((s) => Math.abs(s - f)));
const gapToNextFb = (f: number) => {
  const after = fbStartFrames.filter((s) => s > f).map((s) => s - f);
  return after.length ? Math.min(...after) : Infinity;
};

describe('leona fixture sanity + non-vacuity', () => {
  it('is a 4-unit comp containing leona, and leona deals damage', () => {
    expect(ROSTER).toContain(SLUG);
    expect(ROSTER.length).toBe(4);
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
  });

  it('reaches Full Burst repeatedly, so the FB-enter lines fire more than once', () => {
    expect(FB_STARTS).toBeGreaterThanOrEqual(2);
  });

  it('exercises BOTH the in-FB and out-of-FB case, so 10 s windows genuinely lapse', () => {
    const dmg = EV.filter((e) => e.kind === 'damage');
    expect(dmg.some((e) => e.inFullBurst === true)).toBe(true);
    expect(dmg.some((e) => e.inFullBurst === false)).toBe(true);
  });
});

describe('leona S1a — Roar: Critical Rate ▲2.62%, up to 5 stacks, 5 sec, all allies', () => {
  it('is GENERIC Critical Rate, not the normal-attack-scoped stat', () => {
    // Kit text says plain Critical Rate. critRateNormalPct would under-credit skill/burst crit,
    // and is the nearest-wrong encoding for a crit line on a Supporter.
    expect(ROAR_SELF.length).toBeGreaterThan(0);
    expect(
      effectsOf(allBlocks(OV)).some((e) => e.stat === 'critRateNormalPct'),
    ).toBe(false);
  });

  it('targets ALL allies including self', () => {
    expect(slugsOf(ROAR)).toEqual(ROSTER);
  });

  it('stacks to 5 (a 1-stack model is strictly weaker)', () => {
    expect(ROAR.every((e) => e.maxStacks === 5)).toBe(true);
    expect(ROAR.some((e) => e.stacks === 5)).toBe(true);
    expect(sum(roarOneStack.tot)).toBeLessThan(sum(base.tot));
  });

  it('lasts 5 SECONDS, not 5 rounds', () => {
    // Round-count duration would surface as durationShots on the apply event.
    expect(
      ROAR.every(
        (e) => e.durationShots === undefined || e.durationShots === null,
      ),
    ).toBe(true);
  });

  it.runIf(HAS_FRAMES)('window is exactly 300 frames (5 s at 60 fps)', () => {
    const withFrames = ROAR_SELF.filter((e) => frameOf(e) !== undefined);
    expect(withFrames.length).toBeGreaterThan(0);
    for (const e of withFrames)
      expect(e.expiresFrame - (frameOf(e) as number)).toBe(300);
  });

  it('activates per 5 ROUNDS fired, not per 5 pellet hits', () => {
    // One shell = 10 pellet hits. Round counting over 180 s gives roughly 25-60 activations for any
    // plausible SG cadence (⚑ datamine-unreliable, hence the loose band); pellet counting gives 10x
    // that. The band accepts every faithful cadence and rejects the 10x over-fire.
    expect(ROAR_SELF.length).toBeGreaterThanOrEqual(10);
    expect(ROAR_SELF.length).toBeLessThanOrEqual(150);
  });

  it('the crit lift is load-bearing but rotation-neutral', () => {
    expect(sum(noRoar.tot)).toBeLessThan(sum(base.tot));
    // Crit rate must not feed burst gauge: the full-burst count cannot move when it is zeroed.
    expect(fbCount(noRoar.evs)).toBe(FB_STARTS);
  });
});

describe('leona S1b — Maximum Effective Range ▲20% for 10 sec (SG allies)', () => {
  it('is not a SILENT drop: the override acknowledges the range line', () => {
    const declared = JSON.stringify([
      OV?.unmodeled ?? {},
      OV?.note ?? '',
      OV?.caveats ?? '',
    ]).toLowerCase();
    const modelled = JSON.stringify(allBlocks(OV))
      .toLowerCase()
      .includes('range');
    expect(declared.includes('range') || modelled).toBe(true);
  });

  it.skip('extends the effective-range band for shotgun allies — GAP: no StatKey expresses effective range (range bands and the +30% full-range bonus are engine-owned via rangeApplied), so the line has no representable primitive', () => {});
});

describe('leona S2a — Hit Rate ▲20.28% for 10 sec, all allies, on Full Burst entry', () => {
  it('fires once per FULL BURST (team-wide trigger), not once per own burst cast', () => {
    expect(HITRATE.filter((e) => e.targetSlug === SLUG).length).toBe(FB_STARTS);
  });

  it('targets ALL allies including self', () => {
    expect(slugsOf(HITRATE)).toEqual(ROSTER);
  });

  it.runIf(HAS_FRAMES)(
    'lands ON the full-burst-start frame, not ~52 frames earlier at a burst cast',
    () => {
      const withFrames = HITRATE.filter((e) => frameOf(e) !== undefined);
      expect(withFrames.length).toBeGreaterThan(0);
      for (const e of withFrames)
        expect(minGap(frameOf(e) as number)).toBeLessThanOrEqual(2);
    },
  );

  it.runIf(HAS_FRAMES)('window is exactly 600 frames (10 s)', () => {
    for (const e of HITRATE.filter((x) => frameOf(x) !== undefined)) {
      expect(e.expiresFrame - (frameOf(e) as number)).toBe(600);
    }
  });

  it('is load-bearing for the shotgun via the core-rate lift (direction only, ⚑ magnitude engine-owned)', () => {
    expect(noHitRate.tot[SLUG]).toBeLessThan(base.tot[SLUG]);
  });
});

describe('leona S2b — Number of pellets ▲5 for 10 sec (2 highest-final-ATK SG allies), on FB entry', () => {
  it('grants a real pellet count (pelletCountFlat 5), once per full burst', () => {
    // Nearest-wrong: a normalAttackPct proxy. It is damage-equivalent here, so the assertion is
    // structural on the emitted stat — the faithful model must expose a queryable pellet count.
    expect(PELLET.length).toBeGreaterThan(0);
    expect(PELLET.every((e) => near(e.value, 5))).toBe(true);
    expect(PELLET.filter((e) => e.targetSlug === SLUG).length).toBe(FB_STARTS);
  });

  it('is shotgun-scoped and capped at 2 targets (never all allies)', () => {
    const tgt = slugsOf(PELLET);
    expect(tgt).toContain(SLUG);
    expect(tgt.length).toBeLessThanOrEqual(2);
    expect(tgt.length).toBeLessThan(ROSTER.length);
  });

  it.runIf(HAS_FRAMES)('window is exactly 600 frames (10 s)', () => {
    for (const e of PELLET.filter((x) => frameOf(x) !== undefined)) {
      expect(e.expiresFrame - (frameOf(e) as number)).toBe(600);
    }
  });

  it('moves leona damage and NOTHING else (pellets do not pump burst gauge)', () => {
    expect(noPellets.tot[SLUG]).toBeLessThan(base.tot[SLUG]);
    expect(others(noPellets.tot)).toEqual(others(base.tot));
    expect(fbCount(noPellets.evs)).toBe(FB_STARTS);
  });

  it.skip('separates 2-highest-final-ATK-SG-allies from all-SG-allies — needs a comp with 3 or more shotguns; controlComp contains exactly one (leona), so both readings resolve to the same single target', () => {});
});

describe('leona burst — Critical Damage ▲34.64% for 10 sec, all allies', () => {
  it.runIf(LEONA_BURSTS > 0)('targets ALL allies including self', () => {
    expect(slugsOf(CRITDMG)).toEqual(ROSTER);
  });

  it.runIf(LEONA_BURSTS > 0)(
    'never fires more often than there are full bursts',
    () => {
      expect(LEONA_BURSTS).toBeLessThanOrEqual(FB_STARTS);
    },
  );

  it.runIf(LEONA_BURSTS > 0 && HAS_FRAMES)(
    'applies at her own BURST CAST, before the Full Burst window opens',
    () => {
      // A Burst II cast precedes full-burst entry by the measured chain (30f to B3 plus 22f release),
      // so the apply must sit ~52 frames BEFORE an fbStart. Nearest-wrong: keying the block to
      // fullBurstEnter, which would put the apply ON the fbStart frame and over-fire in a comp where a
      // different Burst II completes the chain.
      for (const e of CRITDMG.filter(
        (x) => x.targetSlug === SLUG && frameOf(x) !== undefined,
      )) {
        const f = frameOf(e) as number;
        expect(minGap(f)).toBeGreaterThan(5);
        const gap = gapToNextFb(f);
        expect(gap).toBeGreaterThanOrEqual(10);
        expect(gap).toBeLessThanOrEqual(180);
      }
    },
  );

  it.runIf(LEONA_BURSTS === 0)(
    'is at least ENCODED even though crown wins the Burst II slot in this comp',
    () => {
      const bursts = effectsOf(blocksOf(OV?.burst));
      expect(
        bursts.some(
          (e) =>
            e.stat === 'critDamagePct' &&
            near(e.value, 34.64) &&
            e.durationSec === 10,
        ),
      ).toBe(true);
    },
  );
});

describe('leona burst — Critical Rate ▲21.32% for 10 sec (SG allies, Roar at max stacks)', () => {
  it('the buff itself is modeled with the kit value and window', () => {
    const bursts = effectsOf(blocksOf(OV?.burst));
    expect(
      bursts.some(
        (e) =>
          e.stat === 'critRatePct' &&
          near(e.value, 21.32) &&
          e.durationSec === 10,
      ),
    ).toBe(true);
  });

  it.runIf(BURSTCR.length > 0)('is shotgun-scoped, never all allies', () => {
    const tgt = slugsOf(BURSTCR);
    expect(tgt).toContain(SLUG);
    expect(tgt.length).toBeLessThan(ROSTER.length);
  });

  it.skip('gates on Roar being at MAX stacks — GAP: no primitive gates a block on another buff reaching maxStacks (resourceGate reads a resource pool, and Roar decays 5 s after each activation, so a pool cannot mirror it). Near-inert in practice: 25 or more shells precede the first burst, so Roar is already at 5 stacks whenever she casts', () => {});
});
