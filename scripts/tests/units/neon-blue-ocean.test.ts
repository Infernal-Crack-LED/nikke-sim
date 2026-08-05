// PER-UNIT KIT SPEC — `neon-blue-ocean` (Neon: Blue Ocean, MG / Attacker / Water / Burst III,
// cd 40s, ammo 300, reloadFrames 171, hitsPerShot 1, normalMult 5.57, baseCrit 15/150).
// Kit-autonomy gauntlet 2026-08-04, test-first, FROM SCRATCH (no prior override; simSupported
// was false and is flipped by this gauntlet).
//
// EXACT SLUG: this is the WATER MG variant "nbo" — NOT base `neon` (SG/Supporter/Fire/Burst I,
// gauntleted earlier in this same batch with its own committed override/test) and NOT
// neon-vision-eye (RL/Electric/Burst III). The slug-disambiguation lint's AMBIGUOUS-base
// advisory is resolved on the full variant name (S0 lint clean).
//
// Kit (blablalink prose, data/characters.json → characters['neon-blue-ocean'].skills, SL10):
//   S1 "Upper Wave"   ■ using Burst Skill → self. Effects vary by number of times used; each
//                        subsequent effect triggers all effects before it:
//                        Once/Twice/Three times: Damage to Parts ▲12.4% for 20 sec      [N1]
//   S2 "Water Jet"    ■ entering Burst Stage 3 → self. Effects vary by number of times entered;
//                        each subsequent effect triggers all effects before it:
//                        Once: Elemental Advantage Attack Damage ▲20.56% for 10 sec
//                        Twice/Three times: ▲20.2% for 10 sec                           [N2]
//   BU "Full Hydro Shot" ■ self: Changes the weapon in use — Damage: 33% of final ATK,
//                        Duration: 7 sec                                                 [N3]
//                        ■ attacking a Fire Code target → the target: 11% of final ATK
//                        as additional damage                                            [N4]
//
// Model + dispositions (line inventory — every line accounted, nothing skipped):
//   N1  burstCast → self → escalating [partsDamagePct 12.4/20s ×3]. The escalating case applies
//       steps 1..N on the Nth OWN burst cast (liter/volume precedent). partsDamagePct is INERT
//       vs the partless scope-lock boss (types.ts: "parsed but inert"; raven/helm H4 keep-inert-
//       for-fidelity precedent) — modeled, never dropped (hard rule 3), byte-identity pinned.
//       OFFICIAL STACKING (game-mechanics.md §11, @NIKKE_en): same buff name + same scope
//       re-application REFRESHES, never co-stacks — the three identical 12.4 lines collapse to
//       ONE live 12.4 instance (the engine keys buffs by owner:slot:stat:value). The naive
//       co-stack (37.2) is the misread; it is inert here either way, but the event-log pin keeps
//       the encoding honest for a future parts boss.
//   N2  stageEnter:3 → self → escalating [elemAdvantageDamagePct 20.56/20.2/20.2, 10s].
//       "Entering Burst Stage 3" = stageEnter{stage:3} per the gauntlet-validated convention
//       for that literal wording (laplace-ultimate-hero S2c / rei-ayanami S2b): it fires on the
//       stage-3 CAST frame of ANY B3 (the fixture's helm co-B3 casts 5 of the 11), NOT only her
//       own casts (burstCast under-fires) and NOT fullBurstEnter (~22f late, past the cast
//       frame). elemAdvantageDamagePct sits in the ELEMENT bucket and is live only while
//       advantaged (MEASURED 2026-07-14 battery 5): observed elem mults are exactly
//       {1.1, 1.3056, 1.5076} — the ladder CAPS at 1.1 + (20.56+20.2)/100 = 1.5076 because the
//       two equal 20.2 lines REFRESH one instance per the §11 rule; 1.7096 (the naive 60.96
//       co-stack) must NEVER appear.
//   N3  burstCast → self → weaponSwap damagePct 33 durationSec 7. The prose states only per-shot
//       damage + duration — kit-silent cadence/ammo = BASE MG wind-up cadence + full-belt refill
//       (moran precedent: an unlabeled datamine swap integer was board-refuted there and NOT
//       enacted here; ⚑1 measurement-gated). Observable: normal-bucket shots at ×33 strictly
//       inside [cast, cast+7s]; the belt refill + MG ladder make the per-window counts vary
//       (175–420), so the pins are containment + multiplier identity, not per-window counts.
//   N4  burstCast → self → extraHitDamagePct 11 durationSec 7, bossElementGate 'Fire'. A
//       per-pull function rider live ONLY inside the burst-weapon window AND ONLY vs a Fire boss
//       (helm-aquamarine Bb gate precedent). Function flavor: crits at sheet rate, never cores,
//       burst bucket, FB by landing time (SSOT §2b). vs the Iron boss the gate is CLOSED: zero
//       buff applications, zero riders — the gate pin, not a totals delta.
//
// Fixture: the control comp (liter B1 / crown B2 / nbo B3 / helm B3 co-carry, boss Fire, focus
// nbo) — she needs the B1/B2 chain to cast at all, and helm's alternating B3 (40s) makes
// burstCast-vs-fullBurstEnter keying observably different (6 own casts vs 11 Full Bursts).
// Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const NBO = 2; // controlComp slot order: liter 0 / crown 1 / neon-blue-ocean 2 / helm 3
const WINDOW_FRAMES = 7 * FPS;
const SLUG = 'neon-blue-ocean';

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(
  overrides: Record<string, any> = {},
  bossElement: 'Fire' | 'Iron' = 'Fire'
) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp(SLUG),
    bossElement,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual / reference patches -------------------------------------------------------
/** N1 counterfactual: S1 keyed to fullBurstEnter (every FB incl. helm's) instead of her own casts. */
const s1FullBurstEnter = withPatchedOverride(SLUG, (ov) => {
  const b = ov.skill1[0];
  if (b?.trigger?.kind !== 'burstCast') {
    throw new Error('nbo S1 burstCast block missing — fixture is stale');
  }
  b.trigger = { kind: 'fullBurstEnter' };
});
/** N1 reference: the parts-damage line removed entirely (inert-pin). */
const noParts = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) =>
      !b.effects.some((e: any) => e.kind === 'escalating')
  );
  if (ov.skill1.length === before) {
    throw new Error('nbo S1 escalating block missing — fixture is stale');
  }
});
/** N2 counterfactual: S2 keyed to her own burstCast (6 casts) instead of every stage-3 entry (11). */
const s2BurstCast = withPatchedOverride(SLUG, (ov) => {
  const b = ov.skill2[0];
  if (b?.trigger?.kind !== 'stageEnter' || b.trigger.stage !== 3) {
    throw new Error('nbo S2 stageEnter:3 block missing — fixture is stale');
  }
  b.trigger = { kind: 'burstCast' };
});
/** N2 counterfactual: S2 keyed to fullBurstEnter — the FB-open frame, ~22f past the stage-3
 *  cast frame the kit wording keys to (laplace-ultimate-hero precedent). */
const s2FbEnter = withPatchedOverride(SLUG, (ov) => {
  const b = ov.skill2[0];
  if (b?.trigger?.kind !== 'stageEnter' || b.trigger.stage !== 3) {
    throw new Error('nbo S2 stageEnter:3 block missing — fixture is stale');
  }
  b.trigger = { kind: 'fullBurstEnter' };
});
/** N3 reference: the weapon swap removed (her burst grants nothing but the Fire rider). */
const noSwap = withPatchedOverride(SLUG, (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'weaponSwap')
  );
  if (ov.burst.length === before) {
    throw new Error('nbo burst weaponSwap block missing — fixture is stale');
  }
});
/** N3 counterfactual: a 3s swap window instead of the kit's 7s. */
const swap3s = withPatchedOverride(SLUG, (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'weaponSwap');
  if (!e) {
    throw new Error('nbo burst weaponSwap effect missing — fixture is stale');
  }
  e.durationSec = 3;
});
/** N4 counterfactual: the Fire Code gate dropped (the rider fires vs ANY boss). */
const riderUngated = withPatchedOverride(SLUG, (ov) => {
  const b = ov.burst.find((x: any) => x.bossElementGate === 'Fire');
  if (!b) {
    throw new Error('nbo burst Fire-gated rider block missing — fixture is stale');
  }
  delete b.bossElementGate;
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const fbKeyed = run({ [SLUG]: s1FullBurstEnter });
const partsRemoved = run({ [SLUG]: noParts });
const s2CastKeyed = run({ [SLUG]: s2BurstCast });
const s2FbKeyed = run({ [SLUG]: s2FbEnter });
const swapRemoved = run({ [SLUG]: noSwap });
const swapShort = run({ [SLUG]: swap3s });
const iron = run({}, 'Iron');
const ironUngated = run({ [SLUG]: riderUngated }, 'Iron');

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) => evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const nboCasts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === SLUG);
/** Every stage-3 entry in the fixture = the B3 casts (nbo's own + the co-B3 helm's). */
const stage3Entries = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast =>
      e.kind === 'burstCast' && (e.slug === SLUG || e.slug === 'helm')
  );
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart');

const nboNormals = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === SLUG && d.bucket === 'normal');
const swapShots = (evs: SimEvent[]) =>
  nboNormals(evs).filter((d) => Math.abs(d.atkPct - 33) < 1e-9);
const baseShots = (evs: SimEvent[]) =>
  nboNormals(evs).filter((d) => Math.abs(d.atkPct - 5.57) < 1e-9);
const riders = (evs: SimEvent[]) =>
  dmg(evs).filter(
    (d) => d.slug === SLUG && d.srcSlot === null && Math.abs(d.atkPct - 11) < 1e-9
  );
const inWindow = (evs: SimEvent[]) => {
  const casts = nboCasts(evs);
  return (frame: number) =>
    casts.some((c) => frame >= c.frame && frame <= c.frame + WINDOW_FRAMES);
};

const statApplies = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.stat === stat && b.casterIdx === NBO);

describe('neon-blue-ocean (Neon: Blue Ocean) — kit spec', () => {
  describe('fixture sanity — a real rotation so every burst-gated line fires', () => {
    it('casts her B3 repeatedly and opens Full Bursts beyond her own casts (co-B3 helm)', () => {
      expect(nboCasts(base.events).length).toBeGreaterThanOrEqual(4);
      expect(fbStarts(base.events).length).toBeGreaterThan(
        nboCasts(base.events).length
      );
    });
    it('her burst bucket contains ONLY the 11% Fire riders — she has no burst nuke', () => {
      const burstBucket = dmg(base.events).filter(
        (d) => d.slug === SLUG && d.bucket === 'burst'
      );
      expect(burstBucket.length).toBeGreaterThan(0);
      expect([...new Set(burstBucket.map((d) => d.atkPct))]).toEqual([11]);
    });
  });

  describe('N1 — S1 Damage to Parts: escalating on her OWN burst casts, inert vs the partless boss', () => {
    const applies = statApplies(base.events, 'partsDamagePct');
    const casts = nboCasts(base.events);

    it('is 12.4% for 20 sec, self-targeted, applied on her cast frames', () => {
      expect(applies.length).toBeGreaterThan(0);
      expect([...new Set(applies.map((b) => b.value))]).toEqual([12.4]);
      expect([...new Set(applies.map((b) => b.targetIdx))]).toEqual([NBO]);
      for (const b of applies) {
        expect(b.expiresFrame! - b.frame).toBe(20 * FPS);
      }
      const castFrames = new Set(casts.map((c) => c.frame));
      for (const b of applies) {
        expect(castFrames.has(b.frame), `parts buff at ${b.sec}s is not on a cast frame`).toBe(true);
      }
    });

    it('ramps 1/2/3 applications per cast ("each subsequent effect triggers all before it")', () => {
      const perCast = casts.map((c) =>
        applies.filter((b) => b.frame === c.frame).length
      );
      expect(perCast).toEqual([1, 2, 3, 3, 3, 3]);
    });

    it('DISCRIMINATING: a fullBurstEnter keying fires on helm-opened FBs too (30 vs 15 applies)', () => {
      const keyed = statApplies(fbKeyed.events, 'partsDamagePct');
      expect(keyed.length).not.toEqual(applies.length);
      const castFrames = new Set(nboCasts(fbKeyed.events).map((c) => c.frame));
      expect(
        keyed.some((b) => !castFrames.has(b.frame)),
        'fullBurstEnter-keyed applies must land on non-own-cast (helm) FB frames'
      ).toBe(true);
    });

    it('is exactly INERT vs the partless boss — byte-identical totals with the line removed', () => {
      expect(base.totals).toEqual(partsRemoved.totals);
    });
  });

  describe('N2 — S2 Elemental Advantage Attack Damage: escalating on EVERY Burst Stage 3 entry', () => {
    const applies = statApplies(base.events, 'elemAdvantageDamagePct');
    const entryFrames = stage3Entries(base.events).map((c) => c.frame);

    it('grants 20.56 then 20.2 for 10 sec each, self-targeted, on stage-3 entry frames', () => {
      expect([...new Set(applies.map((b) => b.value)).values()].sort()).toEqual(
        [20.2, 20.56]
      );
      expect([...new Set(applies.map((b) => b.targetIdx))]).toEqual([NBO]);
      for (const b of applies) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
      const entrySet = new Set(entryFrames);
      expect(applies.length).toBeGreaterThan(0);
      for (const b of applies) {
        expect(
          entrySet.has(b.frame),
          `elemAdv buff at ${b.sec}s is not on a stage-3 entry (B3 cast) frame`
        ).toBe(true);
      }
    });

    it('fires on EVERY stage-3 entry incl. the co-B3 helm\'s (11 waves: 1,2,3,3,…)', () => {
      const perEntry = entryFrames.map((f) =>
        applies.filter((b) => b.frame === f).length
      );
      expect(perEntry).toEqual([1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3]);
    });

    it('DISCRIMINATING: own-cast keying misses the helm-cast stage-3 entries', () => {
      const keyed = statApplies(s2CastKeyed.events, 'elemAdvantageDamagePct');
      const helmFrames = new Set(
        stage3Entries(s2CastKeyed.events)
          .filter((c) => c.slug === 'helm')
          .map((c) => c.frame)
      );
      expect(
        keyed.every((b) => !helmFrames.has(b.frame)),
        'burstCast-keyed applies must NEVER land on helm cast frames'
      ).toBe(true);
      expect(keyed.length).toBeLessThan(applies.length);
    });

    it('DISCRIMINATING: fullBurstEnter keying lands ~22f late, off the stage-3 cast frames', () => {
      const keyed = statApplies(s2FbKeyed.events, 'elemAdvantageDamagePct');
      expect(keyed.length).toBe(applies.length);
      const entrySet = new Set(
        stage3Entries(s2FbKeyed.events).map((c) => c.frame)
      );
      expect(
        keyed.some((b) => !entrySet.has(b.frame)),
        'fullBurstEnter-keyed applies land on FB-open frames, not the cast frames'
      ).toBe(true);
    });

    it('sits in the ELEMENT bucket and caps at 1.5076 — equal 20.2 lines REFRESH, never co-stack (§11)', () => {
      const elems = [
        ...new Set(nboNormals(base.events).map((d) => d.mult.elem.toFixed(4))),
      ].sort();
      expect(elems).toEqual(['1.1000', '1.3056', '1.5076']);
      // the naive 3-instance co-stack (1.1 + 60.96/100) must never appear
      expect(elems).not.toContain('1.7096');
    });
  });

  describe('N3 — burst line 1: weapon swap to 33%-of-final-ATK shots for 7 sec', () => {
    const casts = nboCasts(base.events);

    it('swaps every cast: 33% normal shots exist and are strictly inside [cast, cast+7s]', () => {
      expect(swapShots(base.events).length).toBeGreaterThan(0);
      const win = inWindow(base.events);
      expect(swapShots(base.events).filter((d) => !win(d.frame)).length).toBe(0);
    });

    it('replaces the base multiplier inside the window (≤1 same-frame base shot per cast)', () => {
      const win = inWindow(base.events);
      const baseInWin = baseShots(base.events).filter((d) => win(d.frame));
      expect(baseInWin.length).toBeLessThanOrEqual(casts.length);
    });

    it('DISCRIMINATING: removing the swap erases the 33% shots and drops her total', () => {
      expect(swapShots(swapRemoved.events).length).toBe(0);
      expect(swapRemoved.totals[SLUG]).toBeLessThan(base.totals[SLUG]);
    });

    it('DISCRIMINATING: a 3s window leaves the 3–7s band back on the base multiplier', () => {
      expect(swapShots(swapShort.events).length).toBeLessThan(
        swapShots(base.events).length
      );
      // some shots land inside the kit window but OUTSIDE the short swap → base multiplier
      const castsF = nboCasts(swapShort.events);
      const tailBase = baseShots(swapShort.events).filter((d) =>
        castsF.some(
          (c) =>
            d.frame > c.frame + 3 * FPS && d.frame <= c.frame + WINDOW_FRAMES
        )
      );
      expect(tailBase.length).toBeGreaterThan(0);
    });
  });

  describe('N4 — burst line 2: 11% additional damage vs Fire Code targets, inside the swap window', () => {
    it('lands one rider per swapped pull, all inside the 7s windows', () => {
      const rs = riders(base.events);
      expect(rs.length).toBe(swapShots(base.events).length);
      expect(rs.length).toBeGreaterThan(0);
      const win = inWindow(base.events);
      expect(rs.filter((d) => !win(d.frame)).length).toBe(0);
    });

    it('is function damage: crits at sheet rate, never cores, burst bucket, no range bonus', () => {
      const rs = riders(base.events);
      expect([...new Set(rs.map((d) => d.critEligible))]).toEqual([true]);
      expect([...new Set(rs.map((d) => d.coreEligible))]).toEqual([false]);
      expect([...new Set(rs.map((d) => d.bucket))]).toEqual(['burst']);
      expect([...new Set(rs.map((d) => d.rangeApplied))]).toEqual([false]);
    });

    it('the Fire gate is load-bearing: vs an Iron boss the buff never applies and no rider fires', () => {
      expect(statApplies(iron.events, 'extraHitDamagePct').length).toBe(0);
      expect(riders(iron.events).length).toBe(0);
      // the swap itself is element-blind and still happens
      expect(swapShots(iron.events).length).toBeGreaterThan(0);
    });

    it('DISCRIMINATING: an ungated rider fires vs the Iron boss (over-credit on every non-Fire fight)', () => {
      expect(riders(ironUngated.events).length).toBeGreaterThan(0);
    });

    it('the gate costs her the whole advantage package vs Iron (whole-picture)', () => {
      expect(iron.totals[SLUG]).toBeLessThan(base.totals[SLUG]);
    });
  });
});
