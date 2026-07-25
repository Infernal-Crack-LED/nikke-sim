// PER-UNIT KIT SPEC — `modernia` (Modernia, Attacker/MG/Fire, Burst III, cd 40s, ammo 300,
// hitsPerShot 2, normalMult 7.71). Kit-autonomy gauntlet 2026-07-25 (test-first S2a).
//
// One assertion group per KIT LINE (M1..M7 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.modernia.skills):
//   S1 ■ when normal attack hits → the target(s): 3.05% of final ATK as additional damage      [M1]
//      ■ when normal attack hits 200× → self: Critical Damage ▲14.25% ×5 stacks, 10 sec        [M2a]
//                                          Max Ammo Capacity ▼5.04% ×5 stacks, 10 sec          [M2b]
//   S2 ■ entering Full Burst → all allies: Hit Rate ▲8.56% for 15 sec                          [M3]
//      ■ when normal attack hits 200× DURING increasing-Hit-Rate status → self:
//                                          ATK ▲29.38% for 10 sec                              [M4]
//   BU ■ all allies: Full Burst Duration ▲5 sec                                                [M5]
//      ■ self: Unlimited ammunition for 15 sec                                                 [M6]
//      ■ self: Destroy Mode — Deals 2.24% of final ATK as damage for 15 sec                    [M7]
//         (+ "extends line of sight / auto-aims / parts consolidation" clause → UNMODELED:
//          inert vs the single partless scope-lock boss; documented in override.unmodeled.burst)
//
// Every line is FAITHFUL in the shipped override (the burst slot is hand-authored; skill1/skill2
// are a validated parser baseline). So every assertion is GREEN vs shipped and RED vs the nearest
// wrong model — there are no FIX/MISSING lines driving a RED-vs-shipped assertion.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   M1  per-HIT, not per-PULL: hitsPerShot 2, so the rider fires 2×/pull (hitCount count:1 with the
//       engine's +hitsPerShot counter). A per-pull model (count:2) halves the event count; removing
//       the line zeroes it. atkPct 3.05, crit-eligible (RIDERCRIT default ON), skill bucket.
//   M2  the 200-hit self stacker: value 14.25 / -5.04, maxStacks 5, SELF-scoped, 10s, with the
//       ammo-DOWN companion always alongside. Removing the block zeroes both.
//   M3  fullBurstEnter, NOT burstCast (Tier-2 trigger distinction): the Hit Rate buff reaches all 4
//       allies on EVERY team Full Burst (10 windows here), not only on Modernia's own 5 casts. A
//       burstCast trigger halves the application-frame count.
//   M4  the 'during increasing Hit Rate status' gate is approximated as fbGate:'inFb' (⚑3): EVERY
//       ATK▲29.38 application lands inside a Full Burst window. Ungated, the counter accrues out of
//       window and fires early/pre-FB — producing applications OUTSIDE every FB window (over-credit).
//   M5  fullBurstExtend +5s: Modernia-cast FB windows run 15s (base 10 + 5); helm-cast windows stay
//       10s. Removing the extend collapses the long windows to 10s — a 300-frame (5s) delta that pins
//       the `seconds: 5` magnitude.
//   M6  unlimitedAmmo 15s: Modernia fires thousands of unlimited-ammo shots (shot.unlimitedAmmo);
//       removing the effect zeroes them. The buff itself is a 15s self window.
//   M7  Destroy Mode rider rides extraHitDamagePct → one srcSlot=null damage instance per shot at
//       2.24%×hitsPerShot = 4.48%, crit-eligible (function additional damage crits, never cores).
//       Removing the buff zeroes the rider. (Whether this stream SHOULD crit is ⚑4; the engine
//       convention is crit-ON and the shipped model follows it.)
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / modernia B3 / helm B3, boss Fire,
// focus modernia) — Modernia needs a real rotation to cast her burst at all, and the second B3
// (helm) is what makes the fullBurstEnter-vs-burstCast (M3) and the extend-only-on-her-cast (M5)
// discriminations observable. Deterministic (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { controlComp, runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
/** controlComp slot order: liter 0 / crown 1 / modernia 2 / helm 3. */
const MODERNIA = 2;
const ALL_ALLIES = [0, 1, 2, 3];

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;
type FullBurstStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('modernia'),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches (nearest wrong model per line) ---------------------------------
const hasStat = (b: any, stat: string) => b.effects.some((e: any) => e.stat === stat);
const hasKind = (b: any, kind: string) => b.effects.some((e: any) => e.kind === kind);

/** M1 reference: the per-hit rider removed entirely. */
const modNoS1Rider = withPatchedOverride('modernia', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !b.effects.some((e: any) => e.kind === 'flatDamage'));
  if (ov.skill1.length === before) throw new Error('modernia S1 flatDamage rider missing — fixture is stale');
});
/** M1 counterfactual: the rider as a per-PULL proc (count 2) instead of per-HIT (count 1). */
const modS1PerPull = withPatchedOverride('modernia', (ov) => {
  const b = ov.skill1.find((x: any) => x.effects.some((e: any) => e.kind === 'flatDamage'));
  if (!b) throw new Error('modernia S1 flatDamage rider missing — fixture is stale');
  b.trigger.count = 2;
});
/** M2 reference: the 200-hit self stacker (crit-dmg + ammo-down) removed. */
const modNoStacks = withPatchedOverride('modernia', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'critDamagePct'));
  if (ov.skill1.length === before) throw new Error('modernia S1 critDamagePct stacker missing — fixture is stale');
});
/** M3 counterfactual: Hit Rate on burstCast (her own casts only) instead of fullBurstEnter. */
const modHitRateOnCast = withPatchedOverride('modernia', (ov) => {
  const b = ov.skill2.find((x: any) => hasStat(x, 'hitRatePct'));
  if (!b) throw new Error('modernia S2 hitRatePct block missing — fixture is stale');
  b.trigger = { kind: 'burstCast' };
});
/** M4 counterfactual: the ATK▲ gate removed (counter accrues/fires ungated, pre-FB). */
const modAtkUngated = withPatchedOverride('modernia', (ov) => {
  const b = ov.skill2.find((x: any) => hasStat(x, 'atkPct'));
  if (!b) throw new Error('modernia S2 atkPct block missing — fixture is stale');
  delete b.fbGate;
});
/** M5 reference: the team Full Burst Duration ▲5s removed. */
const modNoFbExtend = withPatchedOverride('modernia', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasKind(b, 'fullBurstExtend'));
  if (ov.burst.length === before) throw new Error('modernia burst fullBurstExtend missing — fixture is stale');
});
/** M6 reference: the unlimited-ammo effect removed (Destroy Mode keeps the rider). */
const modNoUnlimited = withPatchedOverride('modernia', (ov) => {
  const b = ov.burst.find((x: any) => hasKind(x, 'unlimitedAmmo'));
  if (!b) throw new Error('modernia burst unlimitedAmmo missing — fixture is stale');
  b.effects = b.effects.filter((e: any) => e.kind !== 'unlimitedAmmo');
});
/** M7 reference: the Destroy Mode extraHitDamagePct rider removed (unlimited ammo stays). */
const modNoDestroyRider = withPatchedOverride('modernia', (ov) => {
  const b = ov.burst.find((x: any) => hasStat(x, 'extraHitDamagePct'));
  if (!b) throw new Error('modernia burst extraHitDamagePct rider missing — fixture is stale');
  b.effects = b.effects.filter((e: any) => e.stat !== 'extraHitDamagePct');
});

// ---- runs (hoisted: each is a full 180s sim) ------------------------------------------------
const base = run();
const noS1Rider = run({ modernia: modNoS1Rider });
const s1PerPull = run({ modernia: modS1PerPull });
const noStacks = run({ modernia: modNoStacks });
const hitRateOnCast = run({ modernia: modHitRateOnCast });
const atkUngated = run({ modernia: modAtkUngated });
const noFbExtend = run({ modernia: modNoFbExtend });
const noUnlimited = run({ modernia: modNoUnlimited });
const noDestroyRider = run({ modernia: modNoDestroyRider });

// ---- readers --------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) => evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) => evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const modShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'modernia');
const fbWindows = (evs: SimEvent[]) =>
  evs.filter((e): e is FullBurstStart => e.kind === 'fullBurstStart');
/** Modernia-cast burst count (stage 3). */
const modCasts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'burstCast' && e.slug === 'modernia').length;
/** Buffs applied BY modernia (casterIdx). */
const modBuffs = (evs: SimEvent[], stat: string, value?: number) =>
  buffs(evs).filter(
    (b) => b.casterIdx === MODERNIA && b.stat === stat && (value === undefined || b.value === value),
  );
/** Full Burst windows as [startFrame, endFrame] pairs. */
const windows = (evs: SimEvent[]) => fbWindows(evs).map((f) => [f.frame, f.endFrame] as const);
const inAnyWindow = (evs: SimEvent[], frame: number) =>
  windows(evs).some(([s, e]) => frame >= s && frame < e);

describe('modernia — kit spec', () => {
  describe('M1 — S1 per-hit rider: 3.05% final ATK additional damage on EVERY hit', () => {
    const riders = (evs: SimEvent[]) =>
      dmg(evs).filter((d) => d.slug === 'modernia' && d.srcSlot === 'skill1');

    it('fires 2× per pull (per-HIT, hitsPerShot 2), not once per pull', () => {
      const shots = modShots(base.events).length;
      expect(riders(base.events).length).toBe(shots * 2);
    });

    it('is the kit magnitude, crit-eligible, in the skill bucket', () => {
      const r = riders(base.events);
      expect(r.length).toBeGreaterThan(0);
      expect([...new Set(r.map((d) => d.atkPct))]).toEqual([3.05]);
      expect(r.every((d) => d.critEligible)).toBe(true);
      expect([...new Set(r.map((d) => d.bucket))]).toEqual(['skill']);
    });

    it('DISCRIMINATING: a per-pull model halves the count; removal zeroes it', () => {
      const shots = modShots(base.events).length;
      expect(riders(s1PerPull.events).length).toBe(shots); // per-pull = 1×/pull
      expect(riders(noS1Rider.events).length).toBe(0);
    });
  });

  describe('M2 — S1 200-hit self stacker: Critical Damage ▲14.25% + Max Ammo ▼5.04%, ×5 / 10s', () => {
    it('grants Critical Damage ▲14.25%, 5-stack cap, self-scoped, 10 sec', () => {
      const apps = modBuffs(base.events, 'critDamagePct', 14.25);
      expect(apps.length).toBeGreaterThan(0);
      expect([...new Set(apps.map((b) => b.maxStacks))]).toEqual([5]);
      expect([...new Set(apps.map((b) => b.targetIdx))]).toEqual([MODERNIA]);
      expect([...new Set(apps.map((b) => (b.expiresFrame! - b.frame) / FPS))]).toEqual([10]);
      expect(Math.max(...apps.map((b) => b.stacks)), 'stacks must actually reach the 5 cap').toBe(5);
    });

    it('carries the Max Ammo ▼5.04% companion at the same cadence', () => {
      const ammo = modBuffs(base.events, 'maxAmmoPct', -5.04);
      const crit = modBuffs(base.events, 'critDamagePct', 14.25);
      expect(ammo.length).toBe(crit.length);
      expect([...new Set(ammo.map((b) => b.maxStacks))]).toEqual([5]);
      expect([...new Set(ammo.map((b) => b.targetIdx))]).toEqual([MODERNIA]);
    });

    it('DISCRIMINATING: removing the block zeroes both buffs', () => {
      expect(modBuffs(noStacks.events, 'critDamagePct').length).toBe(0);
      expect(modBuffs(noStacks.events, 'maxAmmoPct').length).toBe(0);
    });
  });

  describe('M3 — S2 Hit Rate ▲8.56% on Full Burst entry, for ALL allies (fullBurstEnter, not burstCast)', () => {
    it('reaches all four allies, 15 sec, at the kit magnitude', () => {
      const apps = modBuffs(base.events, 'hitRatePct', 8.56);
      expect(apps.length).toBeGreaterThan(0);
      expect([...new Set(apps.map((b) => b.value))]).toEqual([8.56]);
      expect([...new Set(apps.map((b) => (b.expiresFrame! - b.frame) / FPS))]).toEqual([15]);
      const perFrame = new Map<number, Set<number>>();
      for (const b of apps) {
        if (!perFrame.has(b.frame)) perFrame.set(b.frame, new Set());
        perFrame.get(b.frame)!.add(b.targetIdx!);
      }
      for (const holders of perFrame.values()) {
        expect([...holders].sort(), 'each FB entry must reach all 4 allies').toEqual(ALL_ALLIES);
      }
    });

    it('fires on EVERY team Full Burst, not only Modernia\'s own casts', () => {
      const baseFrames = new Set(modBuffs(base.events, 'hitRatePct').map((b) => b.frame));
      expect(baseFrames.size, 'one application-frame per FB window').toBe(fbWindows(base.events).length);
    });

    it('DISCRIMINATING: a burstCast trigger fires only on her own casts (fewer frames)', () => {
      const castFrames = new Set(modBuffs(hitRateOnCast.events, 'hitRatePct').map((b) => b.frame));
      expect(castFrames.size).toBe(modCasts(hitRateOnCast.events));
      expect(castFrames.size).toBeLessThan(fbWindows(hitRateOnCast.events).length);
    });
  });

  describe('M4 — S2 ATK ▲29.38% gated to the Hit-Rate status (fbGate inFb proxy, ⚑3)', () => {
    it('is 29.38%, self-scoped, 10 sec', () => {
      const apps = modBuffs(base.events, 'atkPct', 29.38);
      expect(apps.length).toBeGreaterThan(0);
      expect([...new Set(apps.map((b) => b.targetIdx))]).toEqual([MODERNIA]);
      expect([...new Set(apps.map((b) => (b.expiresFrame! - b.frame) / FPS))]).toEqual([10]);
    });

    it('EVERY application lands inside a Full Burst window (the gate is live)', () => {
      const apps = modBuffs(base.events, 'atkPct', 29.38);
      const outOfFb = apps.filter((b) => !inAnyWindow(base.events, b.frame));
      expect(outOfFb.map((b) => b.sec), 'gated ATK buff must never fire outside FB').toEqual([]);
    });

    it('DISCRIMINATING: ungated, the counter fires pre-FB / out-of-window (over-credit)', () => {
      const apps = modBuffs(atkUngated.events, 'atkPct', 29.38);
      const outOfFb = apps.filter((b) => !inAnyWindow(atkUngated.events, b.frame));
      expect(outOfFb.length, 'ungated must produce at least one out-of-FB application').toBeGreaterThan(0);
      expect(apps.length).toBeGreaterThan(modBuffs(base.events, 'atkPct', 29.38).length);
    });
  });

  describe('M5 — burst: Full Burst Duration ▲5s for the team (only her own casts extend)', () => {
    const winDurs = (evs: SimEvent[]) =>
      fbWindows(evs).map((f) => (f.endFrame - f.frame) / FPS);

    it('Modernia-cast windows run 15s (base 10 + 5); the longest window is 15s', () => {
      expect(Math.max(...winDurs(base.events))).toBe(15);
      expect(Math.min(...winDurs(base.events)), 'helm-cast windows stay at the 10s base').toBe(10);
    });

    it('DISCRIMINATING: removing the extend collapses the long windows by exactly 5s', () => {
      const baseMax = Math.max(...winDurs(base.events));
      const noExtMax = Math.max(...winDurs(noFbExtend.events));
      expect(baseMax - noExtMax, 'the extend magnitude is exactly 5s (300 frames)').toBe(5);
      expect(noExtMax).toBe(10);
    });
  });

  describe('M6 — burst: Unlimited ammunition for 15 sec (self)', () => {
    it('Modernia fires unlimited-ammo shots across the fight', () => {
      const unlimited = modShots(base.events).filter((s) => s.unlimitedAmmo);
      expect(unlimited.length).toBeGreaterThan(0);
    });

    it('is a 15s self window', () => {
      const apps = buffs(base.events).filter(
        (b) => b.stat === 'unlimitedAmmo' && b.targetIdx === MODERNIA,
      );
      expect(apps.length).toBeGreaterThan(0);
      expect([...new Set(apps.map((b) => (b.expiresFrame! - b.frame) / FPS))]).toEqual([15]);
    });

    it('DISCRIMINATING: removing the effect zeroes unlimited-ammo fire', () => {
      expect(modShots(noUnlimited.events).filter((s) => s.unlimitedAmmo).length).toBe(0);
    });
  });

  describe('M7 — burst: Destroy Mode rider, 2.24% final ATK per hit for 15s (extraHitDamagePct)', () => {
    const rider = (evs: SimEvent[]) =>
      dmg(evs).filter((d) => d.slug === 'modernia' && d.srcSlot === null);

    it('is 2.24%×hitsPerShot = 4.48% per shot, crit-eligible, srcSlot=null (summed stat)', () => {
      const r = rider(base.events);
      expect(r.length).toBeGreaterThan(0);
      expect([...new Set(r.map((d) => d.atkPct))]).toEqual([4.48]);
      expect(r.every((d) => d.critEligible), 'function additional damage crits (RIDERCRIT ON)').toBe(true);
    });

    it('is driven by a 2.24% extraHitDamagePct self buff, 15s, one per burst cast', () => {
      const apps = modBuffs(base.events, 'extraHitDamagePct', 2.24);
      expect(apps.length).toBe(modCasts(base.events));
      expect([...new Set(apps.map((b) => (b.expiresFrame! - b.frame) / FPS))]).toEqual([15]);
      expect([...new Set(apps.map((b) => b.targetIdx))]).toEqual([MODERNIA]);
    });

    it('DISCRIMINATING: removing the buff zeroes the rider', () => {
      expect(rider(noDestroyRider.events).length).toBe(0);
    });
  });
});
