/**
 * nayuta — BLIND post-op kit spec (S5). Authored from the kit prose ALONE; the driver's
 * test/override/reasoning were not consulted.
 *
 * KIT (structural summary):
 *  S1-a  start of battle, self  — Indomitability 9s, 1x            → UNMODELED (defensive; no HP pool)
 *  S1-b  on Memory Absorption, ALL ALLIES — core dmg ▲25.15% / 5s,
 *                                            ATK ▲30.16% OF THE SKILL USER'S ATK / 5s,
 *                                            "equally shares HP recovery" 5s (UNMODELED)
 *  S1-c  on Memory Absorption, self — recover 25% of own final Max HP  → GAP (no heal event kind)
 *  S1-d  on FULL CHARGE while in Memory Incineration, enemies — 150% of final ATK
 *  S1-e  "if the enemy is the stage target" — +380.46% additional     (boss IS the stage target)
 *  S2-a  every 3 sec, self — Memory Absorption: Hit Rate ▲1.4%, cap 30 stacks, continuous, unremovable
 *  S2-b  on Memory Absorption, self — cumulative stage gates:
 *          ≥2 stacks  → ATK ▲15.2% continuously
 *          ≥10 stacks → Attack Damage ▲20.27% continuously
 *          ≥30 stacks → core dmg ▲21.05% continuously
 *  B-a   all allies — Attack Damage ▲35.45% for 15 sec
 *  B-b   all enemies — 645.33% of final ATK as Burst Skill damage
 *  B-c   self — Memory Incineration weapon swap: charge FIXED 1.8s, damage 275.18%,
 *               full-charge 250% of damage, 10s, + unlimited ammunition 10s
 *
 * FIXTURE: controlComp('nayuta', true) → liter(B1) / crown(B2) / nayuta(B2, focus) / helm(B3).
 *   nayuta is a Burst II, so the comp must still supply a B1 and a B3 for the chain to complete;
 *   the control comp does. Crown is also B2, so the non-vacuity test below asserts nayuta actually
 *   casts — if it fails, the fixture (not the override) is what needs re-picking.
 *   Deterministic (no seed). Three hoisted runs total (base + 2 counterfactuals).
 *
 * WHY EACH ASSERTION DISCRIMINATES: noted per test. The recurring nearest-wrong models targeted are
 *   (1) the every-3s ally buffs flattened to a `passive` (loses the 5s window + the t=0..3 dead zone),
 *   (2) the caster-scaled ATK share written as plain atkPct 30.16 on the target,
 *   (3) the three S2 stage buffs made live from t=0 instead of gated on 2 / 10 / 30 stacks,
 *   (4) the S1 full-charge rider not gated to the Memory Incineration swap window,
 *   (5) the 380.46% "stage target" line dropped as a conditional,
 *   (6) the burst weapon swap / unlimited ammo not modeled (SMG cadence + reloads persist).
 *
 * DOC CONFLICT (declared, not silently resolved): the packet describes the OverrideFile slot value
 * both as a bare Block[] and as a CharacterSkills carrying `.blocks`. `blocksOf()` below accepts
 * either shape so the counterfactuals are correct under whichever is real.
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

const SLUG = 'nayuta';
const FPS = 60;
const NEAR = (a: number, b: number) => Math.abs(a - b) < 1e-6;

type Opts = ReturnType<typeof controlComp>;

function run(opts: Opts) {
  const events: any[] = [];
  const o: any = {
    ...(opts as any),
    cfg: {
      ...((opts as any).cfg ?? {}),
      onEvent: (ev: SimEvent) => events.push(ev),
    },
  };
  return { res: runComp(o), events };
}

const frameOf = (ev: any): number => {
  if (typeof ev?.frame === 'number') {return ev.frame;}
  if (typeof ev?.f === 'number') {return ev.f;}
  if (typeof ev?.t === 'number') {return Math.round(ev.t * FPS);}
  if (typeof ev?.timeSec === 'number') {return Math.round(ev.timeSec * FPS);}
  if (typeof ev?.sec === 'number') {return Math.round(ev.sec * FPS);}
  return NaN;
};
const slugOf = (ev: any): string | undefined =>
  ev?.slug ?? ev?.srcSlug ?? ev?.unitSlug ?? ev?.casterSlug;

// slot value may be Block[] (file shape) or CharacterSkills{blocks} (harness cheat-sheet) — accept both
const blocksOf = (ov: any, slot: 'skill1' | 'skill2' | 'burst'): any[] => {
  const s = ov?.[slot];
  if (!s) {return [];}
  return Array.isArray(s) ? s : (s.blocks ?? []);
};
const effectsOf = (ov: any, slot: 'skill1' | 'skill2' | 'burst'): any[] =>
  blocksOf(ov, slot).flatMap((b: any) => b?.effects ?? []);

// ---------------------------------------------------------------- hoisted runs (3 sims)
const BASE = run(controlComp(SLUG, true));
const evs: any[] = BASE.events;
const buffApplies: any[] = evs.filter((e) => e.kind === 'buffApply');

// structural inventory of the committed override (read via the clone; disk untouched)
const INV: { skill1: any[]; skill2: any[]; burst: any[]; blocks: any[] } = {
  skill1: [],
  skill2: [],
  burst: [],
  blocks: [],
};
withPatchedOverride(SLUG, (ov: any) => {
  INV.skill1 = effectsOf(ov, 'skill1');
  INV.skill2 = effectsOf(ov, 'skill2');
  INV.burst = effectsOf(ov, 'burst');
  INV.blocks = [
    ...blocksOf(ov, 'skill1'),
    ...blocksOf(ov, 'skill2'),
    ...blocksOf(ov, 'burst'),
  ];
});

const NO_S1_DMG = run({
  ...(controlComp(SLUG, true) as any),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
      for (const b of blocksOf(ov, 'skill1')) {
        b.effects = (b.effects ?? []).filter(
          (e: any) => e.kind !== 'flatDamage'
        );
      }
    }),
  },
} as any);

const NO_SWAP = run({
  ...(controlComp(SLUG, true) as any),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
      for (const b of blocksOf(ov, 'burst')) {
        b.effects = (b.effects ?? []).filter(
          (e: any) => e.kind !== 'weaponSwap' && e.kind !== 'unlimitedAmmo'
        );
      }
    }),
  },
} as any);

// ---------------------------------------------------------------- derived identity / streams
// nayuta's unit index, derived from one of HER unique kit magnitudes (no hardcoded slot order)
const NIDX: number | undefined = (() => {
  const MAGS = [25.15, 20.27, 21.05, 35.45, 15.2, 1.4];
  for (const m of MAGS) {
    const hit = buffApplies.find(
      (e) =>
        e.casterIdx !== null &&
        e.casterIdx !== undefined &&
        typeof e.value === 'number' &&
        NEAR(e.value, m)
    );
    if (hit) {return hit.casterIdx as number;}
  }
  return undefined;
})();
const mine = (e: any) => NIDX !== undefined && e.casterIdx === NIDX;

const nEvs: any[] = (() => {
  const row: any = unitOf(BASE.res, SLUG);
  if (Array.isArray(row?.events) && row.events.length) {return row.events;}
  return evs.filter((e) => slugOf(e) === SLUG);
})();

const shotFrames: number[] = nEvs
  .filter((e) => e.kind === 'shot')
  .map(frameOf)
  .filter(Number.isFinite);
const reloadFrames: number[] = nEvs
  .filter((e) => e.kind === 'reload')
  .map(frameOf)
  .filter(Number.isFinite);
const dmgEvs: any[] = nEvs.filter((e) => e.kind === 'damage');

// cast frames: prefer burstCast events; fall back to the frames of her own 15s burst aura
const castFrames: number[] = (() => {
  const fromEv = nEvs
    .filter((e) => e.kind === 'burstCast')
    .map(frameOf)
    .filter(Number.isFinite);
  if (fromEv.length) {return fromEv;}
  return buffApplies
    .filter(
      (e) =>
        mine(e) &&
        e.stat === 'attackDamagePct' &&
        NEAR(e.value, 35.45) &&
        e.targetSlug === SLUG
    )
    .map(frameOf)
    .filter(Number.isFinite);
})();

const inAnySwapWindow = (f: number) =>
  castFrames.some((c) => f >= c && f <= c + 600);
const countIn = (frames: number[], a: number, b: number) =>
  frames.filter((f) => f >= a && f <= b).length;
const idxOfFirst = (pred: (e: any) => boolean) => evs.findIndex(pred);
const stacksBefore = (idx: number) =>
  idx < 0
    ? -1
    : evs
        .slice(0, idx)
        .filter(
          (e) => e.kind === 'buffApply' && e.stat === 'hitRatePct' && mine(e)
        ).length;

// ---------------------------------------------------------------- fixture sanity / non-vacuity
describe('nayuta — fixture', () => {
  it('resolves nayuta in the event stream and she actually bursts (B2 alongside crown)', () => {
    expect(typeof NIDX).toBe('number');
    expect(nEvs.length).toBeGreaterThan(0);
    // a lone B2 next to another B2 could be starved of casts — if this fails, re-pick the fixture
    expect(castFrames.length).toBeGreaterThan(0);
    expect(evs.some((e) => e.kind === 'fullBurstStart')).toBe(true);
  });

  it('event frames are readable (all timing assertions below depend on this)', () => {
    expect(Number.isFinite(frameOf(buffApplies[0]))).toBe(true);
  });

  it('nayuta deals damage at all', () => {
    expect(totals(BASE.res)[SLUG]).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------- skill1
describe('nayuta — skill1', () => {
  const s1Core = buffApplies.filter(
    (e) => mine(e) && e.stat === 'coreDamagePct' && NEAR(e.value, 25.15)
  );
  const s1Atk = buffApplies.filter((e) => mine(e) && e.stat === 'casterAtkPct');

  it.skip('S1-a Indomitability 9s, 1x — UNMODELED: defensive status, no primitive and no HP pool in v1', () => {});

  it('S1-b core buff 25.15% reaches ALL FOUR allies (not self-only)', () => {
    // nearest-wrong: "Affects all allies" mis-scoped to self → target set of 1
    expect(s1Core.length).toBeGreaterThan(0);
    const tgts = new Set(s1Core.map((e) => e.targetSlug));
    expect(tgts.size).toBe(4);
    expect(tgts.has(SLUG)).toBe(true);
  });

  it('S1-b core buff is a 5s window, re-applied on the ~3s Memory Absorption cadence all fight', () => {
    // nearest-wrong A: flattened to a `passive` (one apply at frame 0, no expiry)
    // nearest-wrong B: stops once Memory Absorption caps at 30 stacks (t=90s → only ~30 applies/ally)
    const perAlly = s1Core.filter((e) => e.targetSlug === SLUG);
    expect(perAlly.length).toBeGreaterThanOrEqual(50); // 180s / 3s ≈ 59
    const e0 = perAlly[0];
    expect(e0.expiresFrame - frameOf(e0)).toBeGreaterThanOrEqual(295);
    expect(e0.expiresFrame - frameOf(e0)).toBeLessThanOrEqual(305);
    expect(frameOf(e0)).toBeGreaterThanOrEqual(150); // first Memory Absorption at t=3s, not t=0
  });

  it('S1-b ATK share is CASTER-scaled and flat-resolved, identical for every ally', () => {
    // nearest-wrong: encoded as plain atkPct 30.16 (scales each TARGET's own ATK → over/under-credits)
    expect(s1Atk.length).toBeGreaterThan(0);
    const vals = new Set<number>(s1Atk.map((e) => e.value));
    expect(vals.size).toBe(1); // one flat ATK number, not per-target
    expect(NEAR([...vals][0], 30.16)).toBe(false); // flat-resolved, not the raw kit percentage
    expect([...vals][0]).toBeGreaterThan(0);
    expect(new Set(s1Atk.map((e) => e.targetSlug)).size).toBe(4);
    const e0 = s1Atk[0];
    expect(e0.expiresFrame - frameOf(e0)).toBeGreaterThanOrEqual(295);
    expect(e0.expiresFrame - frameOf(e0)).toBeLessThanOrEqual(305);
  });

  it('S1-b inertness: no plain atkPct 30.16 buff is ever emitted by nayuta', () => {
    expect(
      buffApplies.some(
        (e) => mine(e) && e.stat === 'atkPct' && NEAR(e.value, 30.16)
      )
    ).toBe(false);
  });

  it.skip('S1-b "Equally shares HP recovery for 5 sec" — UNMODELED: no HP pool / no damage taken in v1', () => {});

  it.skip('S1-c self-heal 25% of final Max HP — GAP: heal emits no observable event kind, and it is SELF-targeted so no teammate on-recovery consumer fires in this comp', () => {});

  it('S1-d/e full-charge rider carries BOTH the 150% and the 380.46% stage-target line', () => {
    // nearest-wrong: the "if the enemy is the stage target" 380.46% dropped as an unmodelable
    // conditional — the scope-lock boss IS the stage target, so it must be live.
    // Encoding-agnostic: split into two flatDamage effects or merged into one 530.46 both pass.
    const sum = INV.skill1
      .filter((e: any) => e.kind === 'flatDamage')
      .reduce((a: number, e: any) => a + (e.atkPct ?? 0), 0);
    expect(sum).toBeCloseTo(530.46, 2);
  });

  it('S1-d rider fires ONLY inside the Memory Incineration swap window, ~1 per 1.8s full charge', () => {
    // nearest-wrong: rider keyed to every shot / every charge with no swapGate → it would fire
    // hundreds of times across the fight instead of ~5 per 10s burst window
    const riders = dmgEvs
      .filter((e) => e.srcSlot === 'skill1')
      .map(frameOf)
      .filter(Number.isFinite);
    expect(riders.length).toBeGreaterThan(0);
    expect(riders.every((f) => inAnySwapWindow(f))).toBe(true);
    for (const c of castFrames) {
      const n = countIn(riders, c, c + 600);
      expect(n).toBeGreaterThanOrEqual(3); // 10s / 1.8s ≈ 5 full charges
      expect(n).toBeLessThanOrEqual(12); // ≤ 2 effects × ~6 charges
    }
  });

  it('S1 rider is load-bearing: stripping skill1 flatDamage lowers nayuta total', () => {
    expect(totals(NO_S1_DMG.res)[SLUG]).toBeLessThan(totals(BASE.res)[SLUG]);
  });
});

// ---------------------------------------------------------------- skill2
describe('nayuta — skill2 (Memory Absorption)', () => {
  const ma = buffApplies.filter((e) => mine(e) && e.stat === 'hitRatePct');

  it('S2-a Memory Absorption is 1.4% Hit Rate PER STACK, self-only, capped at 30', () => {
    // nearest-wrong A: pre-summed to 42% in one apply (loses the 90s ramp entirely)
    // nearest-wrong B: uncapped stacking (60 stacks by t=180s)
    expect(ma.length).toBeGreaterThanOrEqual(30);
    expect(ma.every((e) => NEAR(e.value, 1.4))).toBe(true);
    expect(new Set(ma.map((e) => e.targetSlug))).toEqual(new Set([SLUG]));
    expect(ma.every((e) => (e.maxStacks ?? 0) === 30)).toBe(true);
    const peak = Math.max(...ma.map((e) => e.stacks ?? 0));
    expect(peak).toBe(30);
    expect(ma.every((e) => (e.stacks ?? 0) <= 30)).toBe(true);
  });

  it('S2-a first stack lands at t=3s, not t=0 ("activates every 3 sec")', () => {
    const f0 = Math.min(...ma.map(frameOf));
    expect(f0).toBeGreaterThanOrEqual(150);
    expect(f0).toBeLessThanOrEqual(200);
  });

  it('S2-b Stage 1 (ATK ▲15.2%) waits for ≥2 stacks', () => {
    // nearest-wrong: all three stage buffs authored as passives live from frame 0
    const i = idxOfFirst(
      (e) =>
        e.kind === 'buffApply' &&
        mine(e) &&
        e.stat === 'atkPct' &&
        NEAR(e.value, 15.2)
    );
    expect(i).toBeGreaterThanOrEqual(0);
    expect(stacksBefore(i)).toBeGreaterThanOrEqual(1); // ≥2 stacks; tolerant of intra-frame ordering
    expect(frameOf(evs[i])).toBeGreaterThanOrEqual(300); // 2 stacks ⇒ t≈6s
    expect(evs[i].targetSlug).toBe(SLUG);
  });

  it('S2-b Stage 2 (Attack Damage ▲20.27%) waits for ≥10 stacks', () => {
    const i = idxOfFirst(
      (e) =>
        e.kind === 'buffApply' &&
        mine(e) &&
        e.stat === 'attackDamagePct' &&
        NEAR(e.value, 20.27)
    );
    expect(i).toBeGreaterThanOrEqual(0);
    expect(stacksBefore(i)).toBeGreaterThanOrEqual(9);
    expect(frameOf(evs[i])).toBeGreaterThanOrEqual(1740); // 10 stacks ⇒ t≈30s
    expect(evs[i].targetSlug).toBe(SLUG);
  });

  it('S2-b Stage 3 (core dmg ▲21.05%) waits for the FULL 30 stacks', () => {
    const i = idxOfFirst(
      (e) =>
        e.kind === 'buffApply' &&
        mine(e) &&
        e.stat === 'coreDamagePct' &&
        NEAR(e.value, 21.05)
    );
    expect(i).toBeGreaterThanOrEqual(0);
    expect(stacksBefore(i)).toBeGreaterThanOrEqual(29);
    expect(frameOf(evs[i])).toBeGreaterThanOrEqual(5100); // 30 stacks ⇒ t≈90s, half the fight
    expect(evs[i].targetSlug).toBe(SLUG);
  });

  it('S2-b non-vacuity: the fixture exercises BOTH the pre-stage-3 and post-stage-3 regimes', () => {
    const i = idxOfFirst(
      (e) =>
        e.kind === 'buffApply' &&
        mine(e) &&
        e.stat === 'coreDamagePct' &&
        NEAR(e.value, 21.05)
    );
    const g = frameOf(evs[i]);
    const dmgFrames = dmgEvs.map(frameOf).filter(Number.isFinite);
    expect(dmgFrames.some((f) => f < g)).toBe(true);
    expect(dmgFrames.some((f) => f > g)).toBe(true);
  });

  it('S2-b inertness: every stage buff is SELF-only — no teammate ever receives one', () => {
    const stage = buffApplies.filter(
      (e) =>
        mine(e) &&
        ((e.stat === 'atkPct' && NEAR(e.value, 15.2)) ||
          (e.stat === 'attackDamagePct' && NEAR(e.value, 20.27)) ||
          (e.stat === 'coreDamagePct' && NEAR(e.value, 21.05)))
    );
    expect(stage.length).toBeGreaterThan(0);
    expect(new Set(stage.map((e) => e.targetSlug))).toEqual(new Set([SLUG]));
  });
});

// ---------------------------------------------------------------- burst
describe('nayuta — burst', () => {
  const aura = buffApplies.filter(
    (e) => mine(e) && e.stat === 'attackDamagePct' && NEAR(e.value, 35.45)
  );

  it('B-a Attack Damage ▲35.45% goes to all four allies for 15s, once per cast', () => {
    // nearest-wrong: self-only, or a 10s window copied from the swap duration
    expect(aura.length).toBe(castFrames.length * 4);
    expect(new Set(aura.map((e) => e.targetSlug)).size).toBe(4);
    const e0 = aura[0];
    expect(e0.expiresFrame - frameOf(e0)).toBeGreaterThanOrEqual(895);
    expect(e0.expiresFrame - frameOf(e0)).toBeLessThanOrEqual(905);
  });

  it('B-b burst nuke is 645.33% of final ATK, one hit per cast, FB-major exempt', () => {
    // nearest-wrong: given the +50% Full-Burst major (a B2 cast lands BEFORE the FB window opens)
    const sum = INV.burst
      .filter((e: any) => e.kind === 'flatDamage')
      .reduce((a: number, e: any) => a + (e.atkPct ?? 0), 0);
    expect(sum).toBeCloseTo(645.33, 2);
    const nukes = dmgEvs.filter((e) => e.srcSlot === 'burst');
    expect(nukes.length).toBe(castFrames.length);
    expect(nukes.every((e) => e.fbMajorApplied !== true)).toBe(true);
  });

  it('B-c Memory Incineration swap is authored with the kit-stated weapon numbers', () => {
    const swap = INV.burst.find((e: any) => e.kind === 'weaponSwap');
    expect(swap).toBeTruthy();
    expect(swap.damagePct).toBeCloseTo(275.18, 2);
    expect(swap.chargeTimeSec).toBeCloseTo(1.8, 3); // "Charge time: Fixed at 1.8 sec"
    expect(swap.chargeMultPct).toBeCloseTo(250, 3); // "Full Charge Damage: 250% of Damage"
    expect(swap.durationSec).toBeCloseTo(10, 3);
    const ua = INV.burst.find((e: any) => e.kind === 'unlimitedAmmo');
    expect(ua).toBeTruthy();
    expect(ua.durationSec).toBeCloseTo(10, 3);
  });

  it('B-c the swap actually re-cadences the weapon: ~5 charged shots in 10s vs SMG spray outside', () => {
    // nearest-wrong: swap not modeled (or chargeTimeSec dropped) → SMG keeps firing ~20/s in-window
    for (const c of castFrames) {
      expect(countIn(shotFrames, c, c + 600)).toBeLessThanOrEqual(15);
    }
    // a clean 10s window that overlaps no swap: SMG cadence must be plainly higher
    let found = -1;
    for (let a = 0; a + 600 <= 10800; a += 60) {
      if (!castFrames.some((c) => a <= c + 600 && c <= a + 600)) {
        found = a;
        break;
      }
    }
    expect(found).toBeGreaterThanOrEqual(0);
    expect(countIn(shotFrames, found, found + 600)).toBeGreaterThanOrEqual(50);
  });

  it('B-c unlimited ammunition: no reload inside the 10s Memory Incineration window', () => {
    // 120-round SMG at SMG cadence reloads repeatedly in any 10s stretch — zero reloads is the tell
    for (const c of castFrames) {
      expect(countIn(reloadFrames, c + 30, c + 570)).toBe(0);
    }
    expect(reloadFrames.length).toBeGreaterThan(0); // …and she DOES reload elsewhere (non-vacuity)
  });

  it('B-c counterfactual: stripping the swap restores SMG cadence and moves nayuta total', () => {
    const noSwapRow: any = unitOf(NO_SWAP.res, SLUG);
    const noSwapEvs: any[] =
      Array.isArray(noSwapRow?.events) && noSwapRow.events.length
        ? noSwapRow.events
        : NO_SWAP.events.filter((e) => slugOf(e) === SLUG);
    const noSwapShots = noSwapEvs
      .filter((e) => e.kind === 'shot')
      .map(frameOf)
      .filter(Number.isFinite);
    expect(
      countIn(noSwapShots, castFrames[0], castFrames[0] + 600)
    ).toBeGreaterThanOrEqual(50);
    expect(totals(NO_SWAP.res)[SLUG]).not.toBeCloseTo(
      totals(BASE.res)[SLUG],
      0
    );
  });
});
