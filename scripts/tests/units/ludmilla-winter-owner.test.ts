// PER-UNIT KIT SPEC — `ludmilla-winter-owner` (Ludmilla: Winter Owner, Attacker/MG/Water,
// Burst III, cd 40s, ammo 300, reloadFrames 201, hitsPerShot 1). Kit-autonomy gauntlet
// 2026-07-26. NOTE: this is the MG Water VARIANT — base `ludmilla` is a different unit
// (SMG/Water); every assertion keys on the full slug, never the bare "Ludmilla".
//
// One assertion group per KIT LINE (L1..L5 below), asserted against the SHIPPED override
// loaded from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest
// wrong model each assertion must discriminate against) — never to supply the encoding under
// test. Runs are deterministic (no seed); assertions are event-log relations, not totals.
//
// Kit (blablalink prose, data/characters.json → characters['ludmilla-winter-owner'].skills):
//   S1 ■ every 60 normal attacks → the target: Damage Taken ▲12.56% for 3 sec            [L1a]
//                              + 158.43% of final ATK as additional damage               [L1b]
//      ■ every 60 normal attacks → self: Reloads 20 round(s) of ammunition               [L2]
//   S2 ■ every 60 CORE hits → the target: 109.64% of final ATK as additional damage      [L3]
//      ■ at the beginning of Full Burst → self: Critical Rate ▲14.6% for 10 sec          [L4]
//   BU ■ self: ATK ▲62.54% for 10 sec  +  Reload Speed ▲67.2% for 20 sec                 [L5]
//
// Disposition: L1a/L1b/L2/L4/L5 FAITHFUL (pinned GREEN vs shipped, RED vs counterfactual).
//   L3 FAITHFUL-with-⚑: the kit trigger is "hitting the Core for 60 time(s)" but the engine
//   has no core-hit-count trigger, so it is PROXIED as hitCount 63 = round(60 / 0.95), the
//   engine's flat MG core rate, gated requiresCore:true (inert at zero core exposure). The
//   63-vs-naive-60 discrimination and the requiresCore gate are both pinned below.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model
// gates nothing):
//   L1a damageTakenPct must be a BOSS debuff (targetIdx null) at exactly 12.56 / 3s that
//       actually amplifies her hits (mult.taken reaches 1.1256) — a self buff or a wrong
//       magnitude/duration fails.
//   L1b the 158.43% rider lands on the hitCount-60 cadence (count === floor(shots/60)), in the
//       skill bucket, crit-eligible (engine rider convention; kit says plain "additional
//       damage"). A per-shot or per-burst trigger fails the cadence pin.
//   L2  the 20-round top-up is an ammo-economy line: with it she reloads-to-max FEWER times and
//       fires STRICTLY more shots over 180s. Remove it and reloads rise / shots fall.
//   L3  count 63 (core-rate proxy), NOT the naive 60: floor(shots/63)=137 ≠ floor(shots/60)=144.
//       And requiresCore is live: at coreHitRate 0 the rider count collapses to 0.
//   L4  fires on EVERY team Full Burst entry (count === fullBurstStarts, not burstCasts) — the
//       "beginning of Full Burst" wording is team-FB-entry, self-scoped, 14.6 / 10s, and it lifts
//       her normal-attack crit rate (0.15 → 0.296).
//   L5  burstCast self-buff: ATK 62.54 / 10s AND Reload Speed 67.2 / 20s (distinct durations).
//       The reload-speed half is load-bearing: remove it and she fires ~1900 fewer shots.
//
// Inert / out-of-domain (documented, NOT asserted): the datamined MG cadence tuple
//   (pullsPerSec / wind-up / reloadFrames 201) and the engine's flat 0.95 MG core rate are
//   ⚑ unmeasured estimates (see override note) — they set the emergent shot COUNT, so pins are
//   cadence-relative (floor(shots/N)), never absolute. No HP/shield/parts/gauge lines in this kit.
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / lwo B3 / helm B3, boss Fire,
// focus lwo) — she needs a real rotation to cast her burst and to enter Full Burst at all.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { controlComp, runComp, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const CARRY = 'ludmilla-winter-owner';
const SLUGS = (controlComp(CARRY) as { slugs: string[] }).slugs;
/** controlComp slot order: liter 0 / crown 1 / ludmilla-winter-owner 2 / helm 3. */
const LWO = SLUGS.indexOf(CARRY);

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Reload = Extract<SimEvent, { kind: 'reload' }>;

function run(
  overrides: Record<string, any> = {},
  cfg: Record<string, any> = {}
) {
  const events: SimEvent[] = [];
  runComp({
    ...controlComp(CARRY),
    overrides,
    cfg: { onEvent: (e) => events.push(e), ...cfg },
  });
  return events;
}

// ---- counterfactual patches (nearest-wrong models) -------------------------------------------
/** L2 reference: her S1 20-round top-up removed. */
const noInstantReload = withPatchedOverride(CARRY, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'instantReload')
  );
  if (ov.skill1.length === before) {
    throw new Error('lwo S1 instantReload block missing — fixture is stale');
  }
});
/** L3 counterfactual: the NAIVE reading "60 core hits = hitCount 60" (drops the ÷0.95 proxy). */
const naiveS2Count = withPatchedOverride(CARRY, (ov) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'flatDamage')
  );
  if (!b) {
    throw new Error('lwo S2 flatDamage block missing — fixture is stale');
  }
  b.trigger.count = 60;
});
/** L4 reference: her FB-entry crit-rate line removed. */
const noCrit = withPatchedOverride(CARRY, (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !b.effects.some((e: any) => e.stat === 'critRatePct')
  );
  if (ov.skill2.length === before) {
    throw new Error('lwo S2 critRatePct block missing — fixture is stale');
  }
});
/** L5 reference: her burst Reload Speed half removed (ATK half kept). */
const noReloadSpeed = withPatchedOverride(CARRY, (ov) => {
  let removed = 0;
  for (const b of ov.burst) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.stat !== 'reloadSpeedPct');
    removed += before - b.effects.length;
  }
  if (removed === 0) {
    throw new Error(
      'lwo burst reloadSpeedPct effect missing — fixture is stale'
    );
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noIR = run({ [CARRY]: noInstantReload });
const naive = run({ [CARRY]: naiveS2Count });
const noCritRun = run({ [CARRY]: noCrit });
const noRS = run({ [CARRY]: noReloadSpeed });
const core0 = run({}, { coreHitRate: 0 });

// ---- readers ----------------------------------------------------------------------------------
const lwoDamage = (evs: SimEvent[], srcSlot?: Damage['srcSlot']) =>
  evs.filter(
    (e): e is Damage =>
      e.kind === 'damage' &&
      e.slug === CARRY &&
      (srcSlot === undefined || e.srcSlot === srcSlot)
  );
const lwoShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === CARRY);
const lwoReloads = (evs: SimEvent[]) =>
  evs.filter((e): e is Reload => e.kind === 'reload' && e.slug === CARRY);
const lwoBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === CARRY);
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
/** buffApply events caster-OR-debuff attributed to LWO's line for a stat (enemy debuffs carry casterIdx null). */
const lwoBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter(
    (b) => b.stat === stat && (b.casterIdx === LWO || b.targetIdx === null)
  );

const SHOTS_BASE = lwoShots(base).length;

describe('ludmilla-winter-owner — kit spec', () => {
  describe('L1a — S1 boss Damage Taken ▲12.56% for 3s (every 60 normal hits)', () => {
    const applied = lwoBuffs(base, 'damageTakenPct');

    it('is a BOSS debuff at the kit magnitude and 3s duration, on the 60-hit cadence', () => {
      expect(
        applied.length,
        'no damageTakenPct debuff applied'
      ).toBeGreaterThan(0);
      expect(applied.length, 'cadence = floor(shots/60)').toBe(
        Math.floor(SHOTS_BASE / 60)
      );
      expect([...new Set(applied.map((b) => b.value))]).toEqual([12.56]);
      expect(
        [...new Set(applied.map((b) => b.targetIdx))],
        'must target the boss (null)'
      ).toEqual([null]);
      expect(
        [...new Set(applied.map((b) => b.expiresFrame! - b.frame))],
        '3 sec'
      ).toEqual([3 * FPS]);
    });

    it('actually amplifies her hits (mult.taken reaches 1.1256 while live)', () => {
      const taken = [
        ...new Set(lwoDamage(base).map((d) => d.mult.taken.toFixed(4))),
      ];
      expect(taken).toContain('1.1256');
      expect(
        lwoDamage(base).filter((d) => d.mult.taken > 1.001).length
      ).toBeGreaterThan(0);
    });
  });

  describe('L1b — S1 158.43% additional-damage rider (every 60 normal hits)', () => {
    const riders = lwoDamage(base, 'skill1');

    it('lands on the 60-hit cadence at the kit magnitude, skill bucket, crit-eligible', () => {
      expect(riders.length).toBe(Math.floor(SHOTS_BASE / 60));
      expect(riders.length).toBeGreaterThan(0);
      expect([...new Set(riders.map((d) => d.atkPct))]).toEqual([158.43]);
      expect([...new Set(riders.map((d) => d.bucket))]).toEqual(['skill']);
      expect(riders.every((d) => d.critEligible)).toBe(true);
    });

    it('is a plain additional-damage rider: crit-eligible but NOT a core strike, no range bonus', () => {
      // Nearest-wrong (reviewer): core:true — the kit says "additional damage", not core strike.
      expect(riders.every((d) => !d.coreEligible && d.coreRate === 0)).toBe(
        true
      );
      expect(riders.every((d) => !d.rangeApplied)).toBe(true);
    });
  });

  describe('L2 — S1 self 20-round reload top-up (every 60 normal hits)', () => {
    it('reduces reload-to-max count and never loses shots vs the top-up removed', () => {
      const baseReloads = lwoReloads(base).length;
      const irReloads = lwoReloads(noIR).length;
      const irShots = lwoShots(noIR).length;
      expect(
        baseReloads,
        `base ${baseReloads} reloads vs no-top-up ${irReloads}`
      ).toBeLessThan(irReloads);
      expect(
        SHOTS_BASE,
        `base ${SHOTS_BASE} shots vs no-top-up ${irShots}`
      ).toBeGreaterThan(irShots);
    });
  });

  describe('L3 — S2 109.64% core-hit rider (every 60 core hits → proxied hitCount 63, requiresCore)', () => {
    const riders = lwoDamage(base, 'skill2');

    it('fires on the core-rate proxy cadence floor(shots/63), NOT the naive 60', () => {
      expect(riders.length).toBe(Math.floor(SHOTS_BASE / 63));
      expect([...new Set(riders.map((d) => d.atkPct))]).toEqual([109.64]);
      expect([...new Set(riders.map((d) => d.bucket))]).toEqual(['skill']);
      // Triggered BY core hits but itself a plain additional-damage rider (no core strike, no range).
      expect(
        riders.every(
          (d) => !d.coreEligible && d.coreRate === 0 && !d.rangeApplied
        )
      ).toBe(true);
    });

    it('DISCRIMINATING: the naive count-60 reading produces a different (wrong) count', () => {
      const naiveRiders = lwoDamage(naive, 'skill2');
      expect(naiveRiders.length).toBe(Math.floor(SHOTS_BASE / 60));
      expect(naiveRiders.length).not.toBe(riders.length);
    });

    it('DISCRIMINATING: requiresCore is live — zero core exposure silences the rider entirely', () => {
      expect(lwoDamage(core0, 'skill2').length).toBe(0);
      expect(riders.length).toBeGreaterThan(0);
    });
  });

  describe('L4 — S2 self Critical Rate ▲14.6% for 10s at the beginning of Full Burst', () => {
    const applied = lwoBuffs(base, 'critRatePct').filter(
      (b) => b.casterIdx === LWO
    );

    it('fires on EVERY team Full Burst entry (not only her own casts), self-scoped, 14.6 / 10s', () => {
      expect(applied.length, 'count must equal team FB entries').toBe(
        fbStarts(base).length
      );
      expect(applied.length).not.toBe(lwoBursts(base).length); // 11 FB entries ≠ 6 of her casts
      expect([...new Set(applied.map((b) => b.value))]).toEqual([14.6]);
      expect(
        [...new Set(applied.map((b) => b.targetIdx))],
        'self-scoped'
      ).toEqual([LWO]);
      expect(
        [...new Set(applied.map((b) => b.expiresFrame! - b.frame))],
        '10 sec'
      ).toEqual([10 * FPS]);
    });

    it('DISCRIMINATING: removing it collapses her elevated normal-attack crit rates', () => {
      const critRates = (evs: SimEvent[]) =>
        [
          ...new Set(
            lwoDamage(evs)
              .filter((d) => d.bucket === 'normal')
              .map((d) => d.critRate.toFixed(4))
          ),
        ].sort();
      expect(critRates(base)).toContain((0.15 + 0.146).toFixed(4)); // 0.2960 = base 15% + 14.6%
      expect(critRates(base)).not.toEqual(critRates(noCritRun));
    });
  });

  describe('L5 — burst self ATK ▲62.54% / 10s + Reload Speed ▲67.2% / 20s', () => {
    const atk = lwoBuffs(base, 'atkPct').filter((b) => b.casterIdx === LWO);
    const rs = lwoBuffs(base, 'reloadSpeedPct').filter(
      (b) => b.casterIdx === LWO
    );

    it('both fire once per burst cast, self-scoped, at the kit magnitudes', () => {
      const casts = lwoBursts(base).length;
      expect(casts).toBeGreaterThan(0);
      expect(atk.length).toBe(casts);
      expect(rs.length).toBe(casts);
      expect([...new Set(atk.map((b) => b.value))]).toEqual([62.54]);
      expect([...new Set(rs.map((b) => b.value))]).toEqual([67.2]);
      expect([...new Set(atk.map((b) => b.targetIdx))]).toEqual([LWO]);
      expect([...new Set(rs.map((b) => b.targetIdx))]).toEqual([LWO]);
    });

    it('the two halves have DISTINCT durations (ATK 10s, Reload Speed 20s)', () => {
      expect([...new Set(atk.map((b) => b.expiresFrame! - b.frame))]).toEqual([
        10 * FPS,
      ]);
      expect([...new Set(rs.map((b) => b.expiresFrame! - b.frame))]).toEqual([
        20 * FPS,
      ]);
    });

    it('DISCRIMINATING: the Reload Speed half is load-bearing for her shot economy', () => {
      expect(
        SHOTS_BASE,
        `base ${SHOTS_BASE} shots vs no-reload-speed ${lwoShots(noRS).length}`
      ).toBeGreaterThan(lwoShots(noRS).length);
    });
  });
});
