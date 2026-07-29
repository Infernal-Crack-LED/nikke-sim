// PER-UNIT KIT SPEC — `laplace-ultimate-hero` (Laplace: Ultimate Hero, Attacker/RL/Wind, Burst III,
// cd 40s, ammo 120, chargeFrames 60). Kit-autonomy gauntlet 2026-07-28 (NEW character). A DIFFERENT
// unit from base `laplace` (RL/Iron Treasure) — nothing shared.
//
// One assertion group per FAITHFULLY-MODELED kit line (H1..H6), asserted against the SHIPPED override
// loaded from disk. `withPatchedOverride` builds COUNTERFACTUALS only (the nearest wrong model each
// assertion must discriminate against) — never the encoding under test.
//
// Kit (data/characters.json → characters['laplace-ultimate-hero'].skills), with dispositions:
//   S1a ■ start of battle → self: ATK ▲ 4.05% of final max HP continuously            [H1] FAITHFUL (atkOfMaxHpPct)
//   S1b ■ full charge → self: Warm Up Charge Speed ▲ 10% ×5                            [--] UNMODELED (cadence-only; sawtooth stack-reset has no primitive; swap is CS-immune)
//   S1c ■ Warm Up max → self: swap weapon Electric Power 9.45%/120 ammo/Pierce         [H5] FAITHFUL structurally (cadence ⚑; uses-based end)
//   S1d ■ swap ends → self: removes 100% ammo                                          [--] UNMODELED (inert — shared mag is already 0 after 120 swap rounds)
//   S2a ■ 12 normals in swap → self: Over Energy ▲ 5% to 100%                          [--] UNMODELED meter (stage keyed to the kit-exact 240-normal count, see H6)
//   S2b ■ Over Energy 100% → stage; Max HP ▲ 2/3/7/10.5%                               [--] UNMODELED HP (small atkOfMaxHpPct feed; fragile per-stage timing) — stage ITSELF modeled (H6)
//   S2c ■ entering Burst Stage 3 → self: Attack Damage ▲ 52.14% for 10 sec             [H2] FAITHFUL (stageEnter:3)
//   BUa ■ self: ATK ▲ 63.36% for 10 sec                                                [H3] FAITHFUL (burstCast)
//   BUb ■ all enemies: 2953.84% of final ATK as Burst Skill damage                     [H4] FAITHFUL (burstCast, FB-exempt)
//   BUc ■ Over Energy stage ≥1 → nearest enemy: 934.76% × stage additional             [H6] FAITHFUL (4× resourceGate-gated 934.76 riders; oeStage advanced by hitCount:240 swap-gated)
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates nothing):
//   H1  atkOfMaxHpPct scales her OWN final Max HP, not her ATK. A generic atkPct 4.05 would add
//       ~24 ATK (4.05% of 600 base) where the real line adds ~547 ATK (4.05% of ~13.5k HP). Proven two
//       ways: the shipped buff's stat IS atkOfMaxHpPct, and swapping it to atkPct collapses her total;
//       removing it entirely drops her total ~32% (measured 1.475×).
//   H2  'entering Burst Stage 3' = stageEnter:3 — it fires on ANY stage-3 caster's cast frame, so with
//       a co-B3 (helm) in the fixture it applies on MORE windows than laplace's own casts. A burstCast
//       key matches her own cast count exactly (and a fullBurstEnter key lands ~22f late). The count gap
//       is the discriminator, plus the kit-exact value 52.14 / 10s / self.
//   H3  burstCast self ATK buff: kit-exact 63.36, self-scoped, once per laplace cast, 10s.
//   H4  the burst nuke is cast BEFORE the Full Burst window opens, so it must never take the +50%
//       major (verified fact 2026-07-13). Kit-exact 2953.84, burst bucket, once per cast.
//   H5  the swap is live (removing it moves her total) and its params are kit-exact (9.45 / 120 /
//       Pierce / uses-based maxShots:120). The fire CADENCE is kit-silent (⚑) so is NOT asserted.
//   H6  the additional hit is gated OFF at stage 0 (the first bursts of the fight carry no companion),
//       then sums to stage × 934.76 — exactly one companion at stage 1, two at stage 2. An ungated flat
//       934.76 rider (the nearest wrong model) would fire on EVERY burst from the first cast.
//
// Fixture: controlComp('laplace-ultimate-hero') = liter B1 / crown B2 / laplace-ultimate-hero B3
// (focus) / helm B3, boss Fire. Two B3s so Full Bursts actually fire and alternate (this is exactly the
// configuration where H2's stageEnter:3-vs-burstCast read diverges). Deterministic (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const SLUG = 'laplace-ultimate-hero';
/** controlComp slot order: liter 0 / crown 1 / laplace-ultimate-hero 2 / helm 3. */
const LH = 2;

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

// ---- counterfactual patches -------------------------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);
const hasKind = (b: any, kind: string) =>
  b.effects.some((e: any) => e.kind === kind);

/** H1 reference: the HP→ATK line removed entirely. */
const noAtkOfMaxHp = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'atkOfMaxHpPct'));
  if (ov.skill1.length === before) {
    throw new Error('S1a atkOfMaxHpPct missing — stale fixture');
  }
});
/** H1 counterfactual: the same magnitude as a GENERIC atkPct buff (scales ATK, not HP). */
const genericAtkPct = withPatchedOverride(SLUG, (ov) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'atkOfMaxHpPct');
  if (!e) {
    throw new Error('S1a atkOfMaxHpPct missing — stale fixture');
  }
  e.stat = 'atkPct';
});
/** H2 counterfactual: the Attack Damage line re-keyed to burstCast (own-casts-only). */
const adOnBurstCast = withPatchedOverride(SLUG, (ov) => {
  const b = ov.skill2.find((x: any) => hasStat(x, 'attackDamagePct'));
  if (!b) {
    throw new Error('S2c attackDamagePct missing — stale fixture');
  }
  b.trigger = { kind: 'burstCast' };
});
/** H5 reference: the weapon-swap block removed entirely. */
const noSwap = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasKind(b, 'weaponSwap'));
  if (ov.skill1.length === before) {
    throw new Error('S1c weaponSwap missing — stale fixture');
  }
});
/** H6 counterfactual: the four stage-gated riders with their resourceGate stripped (ungated flat). */
const ungatedAdditional = withPatchedOverride(SLUG, (ov) => {
  let stripped = 0;
  for (const b of ov.burst) {
    const e = (b as any).effects.find(
      (x: any) => x.kind === 'flatDamage' && x.atkPct === 934.76
    );
    if (e && (b as any).resourceGate) {
      delete (b as any).resourceGate;
      stripped++;
    }
  }
  if (stripped !== 4) {
    throw new Error(
      `expected 4 stage-gated 934.76 riders, stripped ${stripped}`
    );
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const atkRemoved = run({ [SLUG]: noAtkOfMaxHp });
const atkGeneric = run({ [SLUG]: genericAtkPct });
const adBurstCast = run({ [SLUG]: adOnBurstCast });
const swapRemoved = run({ [SLUG]: noSwap });
const additionalUngated = run({ [SLUG]: ungatedAdditional });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const lhBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === LH && b.stat === stat);
const lhBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === SLUG);
const lhBurstDmg = (evs: SimEvent[]) =>
  evs
    .filter((e): e is Damage => e.kind === 'damage')
    .filter(
      (d) => d.slug === SLUG && d.srcSlot === 'burst' && d.bucket === 'burst'
    );
const lhNukes = (evs: SimEvent[]) =>
  lhBurstDmg(evs).filter((d) => Math.abs(d.atkPct - 2953.84) < 0.01);
const lhAdditional = (evs: SimEvent[]) =>
  lhBurstDmg(evs).filter((d) => Math.abs(d.atkPct - 934.76) < 0.01);

describe('laplace-ultimate-hero — kit spec', () => {
  describe('H1 — S1a ATK ▲ 4.05% of final Max HP (atkOfMaxHpPct, the dominant ATK driver)', () => {
    it('is encoded as atkOfMaxHpPct (HP-scaled), present from battle start, no expiry', () => {
      const applied = lhBuffs(base.events, 'atkOfMaxHpPct');
      expect(
        applied.length,
        'no atkOfMaxHpPct self-buff was applied'
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([4.05]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([LH]);
      expect(
        applied.some((b) => b.frame === 0),
        'passive must be live at frame 0'
      ).toBe(true);
    });

    it('is LOAD-BEARING: removing it drops her total damage ~30%+ (HP-scaled ATK add)', () => {
      // measured 1.475× (362.7M → 245.9M): the conversion adds ~4.05% of ~13.5k+ HP to ATK.
      expect(base.totals[SLUG]).toBeGreaterThan(atkRemoved.totals[SLUG] * 1.3);
    });

    it('DISCRIMINATING: a generic atkPct 4.05 (scales ATK, not HP) is far weaker', () => {
      expect(base.totals[SLUG]).toBeGreaterThan(atkGeneric.totals[SLUG] * 1.2);
    });
  });

  describe('H2 — S2c Attack Damage ▲ 52.14% for 10s on STAGE-3 ENTRY (stageEnter:3, not burstCast)', () => {
    const applied = lhBuffs(base.events, 'attackDamagePct');

    it('is the kit magnitude, self-scoped, 10 sec', () => {
      expect(
        applied.length,
        'no stage-3 attackDamagePct buff was applied'
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([52.14]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([LH]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('DISCRIMINATING: fires on MORE windows than her own casts (stageEnter:3, not burstCast)', () => {
      const ownCasts = lhBursts(base.events).length;
      expect(
        applied.length,
        `${applied.length} AD applications vs ${ownCasts} own casts — stageEnter:3 also fires on ` +
          'helm-led stage-3 casts; a burstCast key would match her own cast count exactly'
      ).toBeGreaterThan(ownCasts);
      const cfApplied = lhBuffs(adBurstCast.events, 'attackDamagePct');
      expect(applied.length).toBeGreaterThan(cfApplied.length);
    });
  });

  describe('H3 — burst ATK ▲ 63.36% for 10s, self-scoped, once per cast', () => {
    const applied = lhBuffs(base.events, 'atkPct');

    it('is the kit magnitude, self-scoped, one per laplace burst cast, 10 sec', () => {
      expect(applied.length).toBe(lhBursts(base.events).length);
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([63.36]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([LH]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });
  });

  describe('H4 — burst nuke: 2953.84% of final ATK, cast BEFORE the Full Burst window', () => {
    const nukes = lhNukes(base.events);

    it('fires once per cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes.length).toBe(lhBursts(base.events).length);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([2953.84]);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      expect(
        nukes.filter((d) => d.fbMajorApplied).map((d) => d.sec),
        'burst-cast damage must precede the FB window'
      ).toEqual([]);
    });
  });

  describe('H5 — S1c weapon swap to Electric Power (9.45% / 120 rounds / Pierce); cadence is ⚑', () => {
    it('is LIVE: removing the swap moves her total damage', () => {
      expect(base.totals[SLUG]).not.toEqual(swapRemoved.totals[SLUG]);
    });

    it('carries the kit-exact swap params (damagePct 9.45, uses-based 120 rounds, Pierce)', () => {
      const ov = withPatchedOverride(SLUG, () => {});
      const swap = (ov.skill1 as any[])
        .flatMap((b) => b.effects)
        .find((e) => e.kind === 'weaponSwap');
      expect(swap, 'no weaponSwap effect in skill1').toBeTruthy();
      expect(swap.damagePct).toBe(9.45);
      expect(swap.maxShots).toBe(120);
      expect(swap.maxAmmo).toBe(120);
      expect(swap.hasPierce).toBe(true);
    });
  });

  describe('H6 — burst additional damage: 934.76% × Over Energy stage, gated off at stage 0', () => {
    const nukes = lhNukes(base.events);
    const additional = lhAdditional(base.events);

    it('reaches at least stage 1 in the fight, at the kit magnitude, FB-exempt', () => {
      expect(
        additional.length,
        'no Over Energy stage was reached — additional damage never fired'
      ).toBeGreaterThan(0);
      expect([...new Set(additional.map((d) => d.atkPct))]).toEqual([934.76]);
      expect(
        additional.filter((d) => d.fbMajorApplied).map((d) => d.sec),
        'the additional hit is burst-cast instant damage → FB-exempt'
      ).toEqual([]);
    });

    it('is GATED: the earliest burst (stage 0) has no companion, and total companions < 4× casts', () => {
      const firstCastFrame = Math.min(...nukes.map((d) => d.frame));
      expect(
        additional.filter((d) => d.frame === firstCastFrame).length,
        'the first burst of the fight is at Over Energy stage 0 → no additional hit'
      ).toBe(0);
      // not every burst is at max stage (early bursts ungated) — fewer companions than 4× casts
      expect(additional.length).toBeLessThan(nukes.length * 4);
      // companions never outnumber what the staged model allows: at most (casts − 1) stage-1 unlocks etc.
      expect(additional.length).toBeLessThanOrEqual(nukes.length * 2);
    });

    it('DISCRIMINATING: an ungated flat 934.76 rider fires on EVERY burst from the first cast', () => {
      const ungated = lhAdditional(additionalUngated.events);
      // ungated fires all 4 riders on every cast (4× casts); staged fires far fewer
      expect(ungated.length).toBe(nukes.length * 4);
      expect(additional.length).toBeLessThan(ungated.length);
      // and the ungated model wrongly hits on the first (stage-0) cast
      const firstCastFrame = Math.min(...nukes.map((d) => d.frame));
      expect(ungated.filter((d) => d.frame === firstCastFrame).length).toBe(4);
    });
  });
});
