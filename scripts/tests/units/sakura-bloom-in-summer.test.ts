// PER-UNIT KIT SPEC — `sakura-bloom-in-summer` (Sakura: Bloom in Summer, Attacker/AR/Wind,
// Burst III, cd 40s, ammo 60, 720 rpm). Kit-autonomy gauntlet 2026-07-25. NOT base `sakura`.
//
// One assertion group per KIT LINE (SB1..SB6 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters['sakura-bloom-in-summer'].skills):
//   S1 ■ start of battle → self: Forcefully uses Skill 2.                                     [SB1]
//      ■ on ally/self destroying an enemy part → self: Sustained Damage ▲5.1% / 30s            [SB6]
//      ■ on part-destroy (if in Dancing Flower) → self: Dancing Flower Duration ▲10.02s        [SB6]
//      ■ on part-destroy → enemies in Sakura Petals: Sakura Petals Duration ▲10.02s            [SB6]
//   S2 ■ self: Dancing Flower — Attack Damage ▲15.64% for 15 sec                              [SB2]
//      ■ highest-final-ATK enemy: Sakura Petals — 256% final ATK sustained / 1s for 15 sec     [SB3]
//   BU ■ random enemies: 457.14% final ATK damage, attacks sequentially 10 times              [SB4]
//      ■ same targets: 35.16% final ATK sustained / 1s, stacks ×10, lasts 10 sec               [SB5]
//
// MODEL (shipped override, owner-tuned parser baseline): S1's "Forcefully uses Skill 2" = a t=0
// activation of S2; the datamined skill2 CD=30 is a REAL re-cast (owner 2026-07-20), so S2 fires at
// t=0,30,60,90,120,150 → 6×15s windows (90s/180s = 50% uptime). Sakura Petals = passive dot dur15
// (t=0) + interval:30 dot dur15 (the 5 re-casts). Dancing Flower is a DURATION buff the engine
// cannot carry on a passive (sim.ts alwaysOn), so it is time-averaged: 15.64 × 90/180 = 7.82
// always-on ⚑3. Burst nuke = TEN 457.14 flatDamage in one burstCast block (the crown misparse class
// shipped 457.14 ONCE; this is the fix). Burst stacking DoT = all 10 stacks apply per cast on the
// single boss → one 351.6%/s × 10s dot ⚑4 (hit-applied full stacks, flat from tick 1).
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   SB1  dropping the t=0 force-cast window deletes Sakura Petals ticks 1–15s; the re-casts alone
//        (interval:30, first fire t=30) start at 31s. Shipped has 15 skill2 ticks before 20s; the
//        no-force-cast counterfactual has ZERO.
//   SB2  the value is the 50%-duty time-average 7.82 — NOT the naive "passive ignores duration →
//        full 15.64" over-count, and NOT the old single-window 1.30 (=15.64×15/180) under-count.
//        Proven on the buff record AND on her normal-attack damage total, which the buff scales:
//        naive(15.64) > shipped(7.82) > single-window(1.30).
//   SB3  the 30s re-cast gives 6 windows (90 ticks); dropping the interval leaves the single force
//        window (15 ticks). A 6:1 tick ratio the single-window model provably fails.
//   SB4  TEN 457.14 hits per cast (4571.4% total), not 457.14 once. The single-hit counterfactual
//        (the materialized-freeze ×10 loss) lands 1/10 the burst hits. Cast lands BEFORE the FB
//        window → never takes the +50% major (engine fact, verified 2026-07-13).
//   SB5  the stacking DoT is 351.6%/s FLAT from tick 1 (all 10 stacks applied per cast on the one
//        boss), not a single 35.16%/s stack and not a per-second ramp (growing ticks).
//   SB6  the three part-destroy lines are genuinely UNMODELED: "destroys an enemy's part" can never
//        fire on the partless scope-lock boss. skill1 is empty by design; the lines live verbatim in
//        unmodeled.skill1. No damage assertion — they are inert on this boss by construction.
//
// UNMODELED / inert (no assertion, documented): cadence ⚑1 (12 pulls/s = 720 rpm datamine,
// reloadFrames 81, reload_start_ammo 59) is carried by data/characters.json, not the override.
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / sbis B3 / helm B3, boss Fire,
// focus sbis) — sbis needs a real rotation to cast her burst at all (a lone B3 makes zero Full
// Bursts). Deterministic (no seed). Slot order: liter 0 / crown 1 / sbis 2 / helm 3.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const SLUG = 'sakura-bloom-in-summer';
/** controlComp slot order: liter 0 / crown 1 / sbis 2 / helm 3. */
const SBIS = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp(SLUG),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- block selectors (the shipped skill2/burst shapes) ---------------------------------------
const isS2PassiveBuff = (b: any) =>
  b.trigger?.kind === 'passive' &&
  b.target?.kind === 'self' &&
  b.effects.some((e: any) => e.kind === 'buff' && e.stat === 'attackDamagePct');
const isS2PassiveDot = (b: any) =>
  b.trigger?.kind === 'passive' &&
  b.target?.kind === 'enemy' &&
  b.effects.some((e: any) => e.kind === 'dot');
const isS2IntervalDot = (b: any) =>
  b.trigger?.kind === 'interval' &&
  b.effects.some((e: any) => e.kind === 'dot');
const isBurstNuke = (b: any) =>
  b.trigger?.kind === 'burstCast' &&
  b.effects.some((e: any) => e.kind === 'flatDamage');
const isBurstDot = (b: any) =>
  b.trigger?.kind === 'burstCast' &&
  b.effects.some((e: any) => e.kind === 'dot');

// ---- counterfactual patches ------------------------------------------------------------------
/** SB1: drop the t=0 force-cast Sakura Petals window (keep the 30s re-casts + the buff). */
const noForceCast = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !isS2PassiveDot(b));
  if (ov.skill2.length !== before - 1)
    throw new Error('sbis S2 passive dot block missing — fixture is stale');
});
/** SB2: the naive "passive ignores duration → full 15.64" over-count. */
const naiveFullBuff = withPatchedOverride(SLUG, (ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'buff' && x.stat === 'attackDamagePct');
  if (!e)
    throw new Error('sbis Dancing Flower buff missing — fixture is stale');
  e.value = 15.64;
});
/** SB2: the old single-window under-count 1.30 (= 15.64 × 15/180). */
const singleWindowBuff = withPatchedOverride(SLUG, (ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'buff' && x.stat === 'attackDamagePct');
  if (!e)
    throw new Error('sbis Dancing Flower buff missing — fixture is stale');
  e.value = 1.3;
});
/** SB3: drop the 30s re-cast (keep only the t=0 force window). */
const noRecast = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !isS2IntervalDot(b));
  if (ov.skill2.length !== before - 1)
    throw new Error('sbis S2 interval dot block missing — fixture is stale');
});
/** SB4: the crown misparse — collapse the 10 sequential hits to ONE 457.14 hit. */
const singleHitNuke = withPatchedOverride(SLUG, (ov) => {
  const b = ov.burst.find(isBurstNuke);
  if (!b) throw new Error('sbis burst nuke block missing — fixture is stale');
  const first = b.effects.find((e: any) => e.kind === 'flatDamage');
  b.effects = [first];
});
/** SB5: a single stack (35.16%/s) instead of the full 10-stack 351.6%/s. */
const singleStackDot = withPatchedOverride(SLUG, (ov) => {
  const b = ov.burst.find(isBurstDot);
  if (!b) throw new Error('sbis burst dot block missing — fixture is stale');
  b.effects.find((e: any) => e.kind === 'dot').atkPct = 35.16;
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noForce = run({ [SLUG]: noForceCast });
const naive = run({ [SLUG]: naiveFullBuff });
const singleWin = run({ [SLUG]: singleWindowBuff });
const noRe = run({ [SLUG]: noRecast });
const oneHit = run({ [SLUG]: singleHitNuke });
const oneStack = run({ [SLUG]: singleStackDot });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const sbisDmg = (evs: SimEvent[]) => dmg(evs).filter((d) => d.slug === SLUG);
/** Sakura Petals sustained ticks (S2 line): skill2-sourced, 256% each. */
const petalsTicks = (evs: SimEvent[]) =>
  sbisDmg(evs).filter((d) => d.srcSlot === 'skill2' && d.atkPct === 256);
const sbisBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === SLUG);
const nukeHits = (evs: SimEvent[]) =>
  sbisDmg(evs).filter((d) => d.srcSlot === 'burst' && d.atkPct === 457.14);
const burstDotTicks = (evs: SimEvent[]) =>
  sbisDmg(evs).filter(
    (d) => d.srcSlot === 'burst' && d.bucket === 'burst' && d.atkPct !== 457.14,
  );
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
/** sbis normal-attack damage total — the bucket the Dancing Flower time-average scales. */
const normalTotal = (evs: SimEvent[]) =>
  sbisDmg(evs)
    .filter((d) => d.bucket === 'normal')
    .reduce((s, d) => s + d.amount, 0);

describe('sakura-bloom-in-summer — kit spec', () => {
  describe('SB1 — S1 force-casts Skill 2 at battle start (the t=0 Sakura Petals window)', () => {
    it('produces Sakura Petals ticks inside the first 20s (the force-cast window)', () => {
      const early = petalsTicks(base.events).filter((d) => d.sec < 20);
      expect(
        early.length,
        'no Sakura Petals ticks before 20s — the t=0 force-cast is missing',
      ).toBe(15);
      expect(
        early[0].sec,
        'first tick must land at 1s off a t=0 cast',
      ).toBeCloseTo(1, 5);
    });

    it('DISCRIMINATING: without the force-cast, the first window starts at the 30s re-cast', () => {
      const early = petalsTicks(noForce.events).filter((d) => d.sec < 20);
      expect(early.length).toBe(0);
      // …and the fight loses exactly one 15-tick window overall.
      expect(
        petalsTicks(base.events).length - petalsTicks(noForce.events).length,
      ).toBe(15);
    });

    it('whole-picture: the force-cast window adds real damage', () => {
      expect(base.totals[SLUG]).toBeGreaterThan(noForce.totals[SLUG]);
    });
  });

  describe('SB2 — S2 Dancing Flower is the 50%-duty time-average 7.82%, self-scoped always-on', () => {
    const df = buffs(base.events).filter(
      (b) => b.casterIdx === SBIS && b.stat === 'attackDamagePct',
    );

    it('is 7.82% (= 15.64 × 90/180), not the naive 15.64 nor the single-window 1.30', () => {
      expect([...new Set(df.map((b) => b.value))]).toEqual([7.82]);
      expect(7.82).toBeCloseTo(15.64 * (90 / 180), 5);
    });

    it('is applied once at t=0 to herself, with no wall-clock expiry (engine passive alwaysOn)', () => {
      expect(df.length).toBeGreaterThan(0);
      for (const b of df) {
        expect(b.frame).toBe(0);
        expect(b.targetIdx).toBe(SBIS);
        expect(b.expiresFrame).toBeNull();
      }
    });

    it('DISCRIMINATING: her normal-attack damage sits BETWEEN the naive and single-window models', () => {
      const nBase = normalTotal(base.events);
      const nNaive = normalTotal(naive.events);
      const nSingle = normalTotal(singleWin.events);
      expect(
        nNaive,
        'naive full 15.64 must out-damage shipped',
      ).toBeGreaterThan(nBase);
      expect(
        nBase,
        'shipped must out-damage the single-window 1.30',
      ).toBeGreaterThan(nSingle);
    });
  });

  describe('SB3 — S2 Sakura Petals 256%/s × 15s re-casts every 30s = 6 windows', () => {
    it('every tick is the kit magnitude, in the skill bucket', () => {
      const ticks = petalsTicks(base.events);
      expect(ticks.length).toBeGreaterThan(0);
      expect([...new Set(ticks.map((d) => d.atkPct))]).toEqual([256]);
      expect([...new Set(ticks.map((d) => d.bucket))]).toEqual(['skill']);
    });

    it('runs 6 windows (90 ticks): the t=0 force-cast + five 30s re-casts', () => {
      expect(petalsTicks(base.events).length).toBe(90);
      // six distinct 30s bands: [1-15],[31-45],[61-75],[91-105],[121-135],[151-165]
      const bands = new Set(
        petalsTicks(base.events).map((d) => Math.floor(d.sec / 30)),
      );
      expect([...bands].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
    });

    it('DISCRIMINATING: dropping the 30s re-cast collapses to the single force window (15 ticks)', () => {
      expect(petalsTicks(noRe.events).length).toBe(15);
    });
  });

  describe('SB4 — burst nuke: 457.14% × 10 sequential hits per cast, before the FB window', () => {
    it('lands exactly 10 hits per burst cast at the kit magnitude, in the burst bucket', () => {
      const casts = sbisBursts(base.events).length;
      const hits = nukeHits(base.events);
      expect(casts).toBeGreaterThan(0);
      expect(hits.length).toBe(casts * 10);
      expect([...new Set(hits.map((d) => d.atkPct))]).toEqual([457.14]);
      expect([...new Set(hits.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      expect(nukeHits(base.events).filter((d) => d.fbMajorApplied)).toEqual([]);
    });

    it('DISCRIMINATING: the single-hit misparse lands 1/10 the burst hits', () => {
      const casts = sbisBursts(oneHit.events).length;
      expect(nukeHits(oneHit.events).length).toBe(casts); // 1 per cast, not 10
      expect(nukeHits(base.events).length).toBe(
        nukeHits(oneHit.events).length * 10,
      );
    });
  });

  describe('SB5 — burst stacking DoT: 351.6%/s (35.16 × 10 stacks) flat from tick 1, × 10s', () => {
    it('ticks at the full 10-stack magnitude in the burst bucket', () => {
      const ticks = burstDotTicks(base.events);
      expect(ticks.length).toBeGreaterThan(0);
      expect([...new Set(ticks.map((d) => d.atkPct))]).toEqual([351.6]);
      expect([...new Set(ticks.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('is flat from the first tick (hit-applied full stacks, not a per-second ramp)', () => {
      // a ramp would produce growing ticks (35.16, 70.32, …); every tick is the full 351.6.
      const ticks = burstDotTicks(base.events);
      expect(ticks.every((d) => d.atkPct === 351.6)).toBe(true);
    });

    it('DISCRIMINATING: a single stack would tick at 35.16%/s (10× less)', () => {
      const ticks = burstDotTicks(oneStack.events);
      expect([...new Set(ticks.map((d) => d.atkPct))]).toEqual([35.16]);
    });
  });

  describe('SB6 — S1 part-destroy lines are genuinely UNMODELED (partless scope-lock boss)', () => {
    const ov = loadOverride(SLUG)!;

    it('skill1 carries no encoding (the three part-destroy triggers can never fire here)', () => {
      expect((ov as any).skill1).toEqual([]);
    });

    it('all three part-destroy lines are documented verbatim in unmodeled.skill1', () => {
      const un = (ov as any).unmodeled.skill1 as string[];
      const joined = un.join('\n');
      expect(joined).toContain("destroys an enemy's part");
      expect(joined).toContain('Sustained Damage ▲ 5.1% for 30 sec.');
      expect(joined).toContain('Dancing Flower Duration ▲ 10.02 sec.');
      expect(joined).toContain('Sakura Petals Duration ▲ 10.02 sec.');
    });

    it('INERT: no Sustained Damage ▲5.1% buff ever applies (the partless boss never triggers it)', () => {
      const sustained = buffs(base.events).filter(
        (b) => b.stat === 'sustainedDamagePct' && b.casterIdx === SBIS,
      );
      expect(
        sustained,
        'a part-destroy sustained-damage buff fired on a partless boss',
      ).toEqual([]);
    });

    it('INERT: no Sakura Petals window is extended to ~25s (the duration-extend line never fires)', () => {
      // 15 ticks per window (1s cadence × 15s); an extended 25.02s window would yield ~25.
      const perBand = new Map<number, number>();
      for (const t of petalsTicks(base.events)) {
        const band = Math.floor(t.sec / 30);
        perBand.set(band, (perBand.get(band) ?? 0) + 1);
      }
      for (const [band, n] of perBand)
        expect(n, `band ${band} has ${n} ticks`).toBe(15);
    });
  });
});
