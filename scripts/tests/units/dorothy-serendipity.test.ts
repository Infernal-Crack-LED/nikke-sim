// PER-UNIT KIT SPEC — `dorothy-serendipity` (Dorothy: Serendipity, Attacker/SG/Water, Burst III,
// cd 40s, ammo 9, hitsPerShot 10). Kit-autonomy gauntlet 2026-07-25. The SG OVERSPEC variant —
// a DIFFERENT unit from the AR/Water base at slug `dorothy`; never conflate them (P0).
//
// One assertion group per KIT LINE (D1..D9 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters['dorothy-serendipity'].skills):
//   S1 ■ hitting the target with 80 pellets → self: Gains Pierce for 3 round(s)            [D1/D2]
//                                             Hit Rate ▲ 98.18% for 3 round(s)             [U1 — UNMODELED]
//                                             Attack damage ▲ 72% for 3 round(s)           [D3]
//                                             Pellet count fixed at 1 for 3 round(s)       [D1/D2]
//      ■ hitting the target with 160 pellets → self: Expands Pierce range 200% 3 round(s)  [U2 — UNMODELED]
//   S2 ■ start of battle → self: Pierce damage ▲ 55.08% continuously                        [D4]
//      ■ only during Full Burst → self: ATK ▲ 75.24% continuously                           [D5]
//                                 Hit Rate ▲ 40.68% continuously                            [D6]
//   BU ■ self: Attack speed ▲ 65% for 15 sec                                                [D7]
//             ATK ▲ 88.12% for 15 sec                                                       [D8]
//             Number of pellets ▲ 5 for 15 sec                                              [D9]
//
// S1 is NOT a skill-effect block — it is the engine's config-driven `consolidation` primitive
// (src/skills/types.ts ConsolidationConfig): "after landing 80 pellets, for 3 SHOTS fire ONE
// aligned bullet carrying the FULL shot (pelletFraction 1.0) at coreRate, +attackDamagePct,
// Pierce-tagged, no range bonus". The skill1 array is empty by design; the whole S1 mechanic
// lives in `consolidation`. Its observable signature in the event log is a normal-bucket damage
// instance with coreRate === 0.9 (the consolidation coreOverride) — no ordinary SG spray shot
// ever cores at 0.9 (the cone gives 0.01–0.10), so that tag uniquely identifies a consolidated
// bullet. MEASURED facts (owner-confirmed, dorothy-solo-reanalysis.json): the single bullet
// carries the FULL shot (pelletFraction 1.0, atkPct 201.5 = normalAttackMultiplier), cores at
// 0.9, takes NO effective-range bonus. "3 rounds" = 3 shots/episode (the ammo counter drops 3).
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   D1  delete the consolidation block → ZERO coreRate-0.9 bullets and a ~26% total drop. The
//       mechanic is load-bearing, not decorative.
//   D2  the consolidated bullet's atkPct === 201.5 (the WHOLE shot). The naive "1 of 10 pellets"
//       model (pelletFraction 0.1) would give 20.15 — proven by the counterfactual. This is the
//       measured full-shot carry, the single most damage-defining fact of the kit.
//   D3  the +72% Attack Damage is live ON the consolidated bullet: frame-matched against an
//       attackDamagePct=0 run, every consolidated bullet's dmgUp is exactly +0.72 higher.
//   D4  the S2 passive Pierce damage is NOT inert: it feeds the consolidated bullet's dmgUp via
//       the per-shot pierceActive tag. Frame-matched against a pierce-removed run, every
//       consolidated bullet's dmgUp is exactly +0.5508 higher (and the total drops ~9%).
//   D5  the S2 ATK is gated on fullBurstEnter, NOT burstCast: it applies on EVERY team Full Burst
//       window (11× here), and its apply frames are exactly the fullBurstStart frames — whereas a
//       burstCast trigger would apply only on her own 6 casts. dur 600 (10s) discriminates vs a
//       passive (dur null).
//   D6  the S2 FB Hit Rate is live (not the inert stat U1): it lifts her SG core fraction during
//       the FB window via CONE_DELTA, so removing it drops the total ~28%. FB-gated (11× = FB
//       windows, dur 600).
//   D7/D8/D9  each burst buff is pinned to its verbatim value + 15s (900f) duration + one apply
//       per burst cast (6×); removing each individual effect drops the total (load-bearing).
//
// UNMODELED (inert on the partless scope-lock boss; documented, NOT asserted):
//   U1  S1 "Hit Rate ▲ 98.18% for 3 round(s)" — a hit-rate stat the engine does not model as a
//       damage stat. Its in-mode effect (the consolidated bullet lands at ALL bands, even at
//       range) is already baked into the measured consolidation config (it fires the whole fight,
//       not near-only). Carried verbatim in override.unmodeled.skill1.
//   U2  S1 "hitting the target with 160 pellets → Expands Pierce range by 200% for 3 round(s)" —
//       Pierce range is inert against a single partless boss (nothing to pass through to). Carried
//       verbatim in override.unmodeled.skill1.
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / dorothy-serendipity B3 / helm B3,
// boss Fire — Water's favorable matchup, matching the kit-status PH-water board). The B1/B2 core
// gives her a real rotation so the B3 actually casts (a lone B3 makes ZERO Full Bursts).
// Deterministic (no seed) → totals are byte-stable and the frame-matched dmgUp deltas are exact.
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
const DS = 'dorothy-serendipity';
/** controlComp slot order: liter 0 / crown 1 / dorothy-serendipity 2 / helm 3. */
const DS_SLOT = 2;
/** normalAttackMultiplier — the full-shot magnitude a consolidated bullet must carry. */
const NORMAL_MULT = 201.5;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp(DS),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, total: totals(res)[DS] };
}

// ---- readers ----------------------------------------------------------------------------------
/** Consolidated bullets: normal-bucket damage at the consolidation coreOverride (0.9). No
 *  ordinary SG spray shot cores at 0.9, so this tag is unique to the consolidation mechanic. */
const consol = (evs: SimEvent[]): Damage[] =>
  evs.filter(
    (e): e is Damage =>
      e.kind === 'damage' &&
      e.slug === DS &&
      e.bucket === 'normal' &&
      Math.abs(e.coreRate - 0.9) < 1e-6
  );
/** dorothy-serendipity's OWN self-buffs (caster = holder = her slot), one stat/value. */
const selfBuff = (evs: SimEvent[], stat: string, value: number): BuffApply[] =>
  evs.filter(
    (e): e is BuffApply =>
      e.kind === 'buffApply' &&
      e.casterIdx === DS_SLOT &&
      e.targetIdx === DS_SLOT &&
      e.stat === stat &&
      e.value === value
  );
const fbStartFrames = (evs: SimEvent[]): number[] =>
  evs.filter((e) => e.kind === 'fullBurstStart').map((e) => e.frame);
const dsBurstCount = (evs: SimEvent[]): number =>
  evs.filter((e) => e.kind === 'burstCast' && e.slug === DS).length;
/** Frame-match consolidated bullets between two runs and collect the per-bullet dmgUp delta
 *  (base − other). The consolidation trigger timing is independent of attackDamagePct /
 *  pierceDamagePct (those affect damage, not the landed-pellet accrual), so the frames align. */
function consolDmgUpDelta(base: SimEvent[], other: SimEvent[]): number[] {
  const byFrame = new Map(consol(other).map((d) => [d.frame, d]));
  const out: number[] = [];
  for (const d of consol(base)) {
    const m = byFrame.get(d.frame);
    if (m) {out.push(Math.round((d.mult.dmgUp - m.mult.dmgUp) * 1e4) / 1e4);}
  }
  return out;
}

// ---- counterfactual / isolation patches -------------------------------------------------------
/** D1: the whole consolidation mechanic removed. */
const dsNoConsol = withPatchedOverride(DS, (ov) => {
  if (!ov.consolidation)
    {throw new Error(
      'dorothy-serendipity consolidation block missing — fixture is stale'
    );}
  delete ov.consolidation;
});
/** D2: the nearest wrong model — the consolidated bullet carries ONE pellet (1/10 shot), not the
 *  full shot. */
const dsPelletTenth = withPatchedOverride(DS, (ov) => {
  ov.consolidation.pelletFraction = 0.1;
});
/** D3: the consolidation's +72% Attack Damage zeroed. */
const dsNoAtkDmg = withPatchedOverride(DS, (ov) => {
  ov.consolidation.attackDamagePct = 0;
});
/** D4: the S2 passive Pierce damage removed. */
const dsNoPierce = withPatchedOverride(DS, (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !b.effects.some((e: any) => e.stat === 'pierceDamagePct')
  );
  if (ov.skill2.length === before)
    {throw new Error(
      'dorothy-serendipity S2 pierceDamagePct block missing — fixture is stale'
    );}
});
/** D5: the S2 FB block re-triggered on burstCast (the nearest wrong gate). */
const dsFbToCast = withPatchedOverride(DS, (ov) => {
  const b = ov.skill2.find((x: any) => x.trigger.kind === 'fullBurstEnter');
  if (!b)
    {throw new Error(
      'dorothy-serendipity S2 fullBurstEnter block missing — fixture is stale'
    );}
  b.trigger.kind = 'burstCast';
});
/** D6: the S2 FB Hit Rate removed. */
const dsNoHitRate = withPatchedOverride(DS, (ov) => {
  const b = ov.skill2.find((x: any) => x.trigger.kind === 'fullBurstEnter');
  if (!b)
    {throw new Error(
      'dorothy-serendipity S2 fullBurstEnter block missing — fixture is stale'
    );}
  b.effects = b.effects.filter((e: any) => e.stat !== 'hitRatePct');
});
/** Remove ONE effect from the burst block (D7/D8/D9 isolation). */
const rmBurstEffect = (stat: string) =>
  withPatchedOverride(DS, (ov) => {
    const b = ov.burst.find((x: any) =>
      x.effects.some((e: any) => e.stat === stat)
    );
    if (!b)
      {throw new Error(
        `dorothy-serendipity burst ${stat} effect missing — fixture is stale`
      );}
    b.effects = b.effects.filter((e: any) => e.stat !== stat);
  });
const dsNoAtkSpd = rmBurstEffect('attackSpeedPct');
const dsNoBurstAtk = rmBurstEffect('atkPct');
const dsNoPellets = rmBurstEffect('pelletCountFlat');

// ---- runs (hoisted: each is a full 180s deterministic sim) ------------------------------------
const base = run();
const noConsol = run({ [DS]: dsNoConsol });
const pelletTenth = run({ [DS]: dsPelletTenth });
const noAtkDmg = run({ [DS]: dsNoAtkDmg });
const noPierce = run({ [DS]: dsNoPierce });
const fbToCast = run({ [DS]: dsFbToCast });
const noHitRate = run({ [DS]: dsNoHitRate });
const noAtkSpd = run({ [DS]: dsNoAtkSpd });
const noBurstAtk = run({ [DS]: dsNoBurstAtk });
const noPellets = run({ [DS]: dsNoPellets });

describe('dorothy-serendipity — kit spec', () => {
  describe('consolidation config — verbatim kit values + measured carry/core', () => {
    const shipped: any = loadOverride(DS);
    it('encodes the S1 mechanic as the consolidation primitive (skill1 array empty)', () => {
      expect(shipped.skill1).toEqual([]);
      expect(shipped.consolidation, 'consolidation block missing').toBeTruthy();
    });
    it('pins the verbatim kit numbers and the two measured constants', () => {
      expect(shipped.consolidation).toMatchObject({
        triggerLandedPellets: 80, // kit: "hitting the target with 80 pellets"
        shots: 3, // kit: "for 3 round(s)" = 3 shots/episode (owner-confirmed)
        attackDamagePct: 72, // kit: "Attack damage ▲ 72%"
        pierce: true, // kit: "Gains Pierce"
        pelletFraction: 1, // MEASURED: the single bullet carries the FULL shot
        coreRate: 0.9, // MEASURED: reliable core on the aligned bullet
      });
    });
    it('carries the two inert S1 lines verbatim in unmodeled (not dropped, not ignored)', () => {
      expect(shipped.unmodeled.skill1).toContain(
        'Hit 160 pellets: Expands Pierce range 200% 3 rounds'
      );
      expect(shipped.unmodeled.skill1).toContain('Hit Rate ▲ 98.18% 3 rounds');
    });
  });

  describe('D1 — S1 consolidation fires (80 landed pellets → 3 single-bullet rounds)', () => {
    it('produces consolidated bullets (coreRate 0.9) across the fight', () => {
      expect(consol(base.events).length).toBeGreaterThan(0);
    });
    it('DISCRIMINATING: removing the consolidation block produces none and drops the total', () => {
      expect(consol(noConsol.events).length).toBe(0);
      expect(noConsol.total).toBeLessThan(base.total);
    });
  });

  describe('D2 — the consolidated bullet carries the FULL shot (pelletFraction 1.0)', () => {
    it('every consolidated bullet is at the full normal-attack magnitude (201.5), not a pellet', () => {
      const atkPcts = [...new Set(consol(base.events).map((d) => d.atkPct))];
      expect(atkPcts).toEqual([NORMAL_MULT]);
    });
    it('DISCRIMINATING: a 1-of-10-pellet model (pelletFraction 0.1) collapses the bullet to ~20.15', () => {
      for (const d of consol(pelletTenth.events)) {
        expect(
          d.atkPct,
          'a per-pellet bullet would be ~20.15, far below the full shot'
        ).toBeLessThan(100);
      }
      expect(consol(pelletTenth.events).length).toBeGreaterThan(0);
    });
  });

  describe('D3 — S1 Attack damage ▲72% is live on the consolidated bullet', () => {
    it('every consolidated bullet carries exactly +0.72 dmgUp vs an attackDamagePct=0 run', () => {
      const deltas = consolDmgUpDelta(base.events, noAtkDmg.events);
      expect(deltas.length, 'no frame-matched consolidated bullets').toBe(
        consol(base.events).length
      );
      expect([...new Set(deltas)]).toEqual([0.72]);
    });
    it('DISCRIMINATING: zeroing the 72% drops the total', () => {
      expect(noAtkDmg.total).toBeLessThan(base.total);
    });
  });

  describe('D4 — S2 Pierce damage ▲55.08% (continuous passive, live on the consolidated bullet)', () => {
    const applied = selfBuff(base.events, 'pierceDamagePct', 55.08);
    it('is a single continuous passive (dur null), applied once', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
    });
    it("DISCRIMINATING: it feeds the consolidated bullet — removing it drops every bullet's dmgUp by 0.5508", () => {
      const deltas = consolDmgUpDelta(base.events, noPierce.events);
      expect(deltas.length).toBe(consol(base.events).length);
      expect([...new Set(deltas)]).toEqual([0.5508]);
      expect(noPierce.total).toBeLessThan(base.total);
    });
  });

  describe('D5 — S2 ATK ▲75.24% is gated on Full Burst entry, not on her own burst cast', () => {
    const applied = selfBuff(base.events, 'atkPct', 75.24);
    it('applies on EVERY team Full Burst window (== fullBurstStart count), not just her casts', () => {
      const fb = fbStartFrames(base.events);
      expect(applied.length).toBe(fb.length);
      expect(applied.length).toBeGreaterThan(dsBurstCount(base.events));
    });
    it('its apply frames are exactly the fullBurstStart frames, for a 10s window', () => {
      expect(applied.map((b) => b.frame).sort((a, b) => a - b)).toEqual(
        [...fbStartFrames(base.events)].sort((a, b) => a - b)
      );
      expect([
        ...new Set(applied.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([10 * FPS]);
    });
    it('DISCRIMINATING: a burstCast trigger would apply only on her own casts', () => {
      expect(selfBuff(fbToCast.events, 'atkPct', 75.24).length).toBe(
        dsBurstCount(fbToCast.events)
      );
    });
  });

  describe('D6 — S2 Hit Rate ▲40.68% during Full Burst is live (CONE_DELTA), not the inert U1 stat', () => {
    const applied = selfBuff(base.events, 'hitRatePct', 40.68);
    it('is FB-gated (== fullBurstStart count) for a 10s window', () => {
      expect(applied.length).toBe(fbStartFrames(base.events).length);
      expect([
        ...new Set(applied.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([10 * FPS]);
    });
    it('DISCRIMINATING: removing it drops the total (it lifts the SG core fraction in the FB window)', () => {
      expect(noHitRate.total).toBeLessThan(base.total);
    });
  });

  describe('D7 — burst Attack speed ▲65% for 15s', () => {
    const applied = selfBuff(base.events, 'attackSpeedPct', 65);
    it('applies once per burst cast (6×) for 15s (900f)', () => {
      expect(applied.length).toBe(dsBurstCount(base.events));
      expect(applied.length).toBeGreaterThan(0);
      expect([
        ...new Set(applied.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([15 * FPS]);
    });
    it('DISCRIMINATING: removing it drops the total', () => {
      expect(selfBuff(noAtkSpd.events, 'attackSpeedPct', 65).length).toBe(0);
      expect(noAtkSpd.total).toBeLessThan(base.total);
    });
  });

  describe('D8 — burst ATK ▲88.12% for 15s', () => {
    const applied = selfBuff(base.events, 'atkPct', 88.12);
    it('applies once per burst cast (6×) for 15s (900f)', () => {
      expect(applied.length).toBe(dsBurstCount(base.events));
      expect(applied.length).toBeGreaterThan(0);
      expect([
        ...new Set(applied.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([15 * FPS]);
    });
    it('DISCRIMINATING: removing it drops the total', () => {
      expect(selfBuff(noBurstAtk.events, 'atkPct', 88.12).length).toBe(0);
      expect(noBurstAtk.total).toBeLessThan(base.total);
    });
  });

  describe('D9 — burst Number of pellets ▲5 (pelletCountFlat) for 15s', () => {
    const applied = selfBuff(base.events, 'pelletCountFlat', 5);
    it('applies once per burst cast (6×) for 15s (900f)', () => {
      expect(applied.length).toBe(dsBurstCount(base.events));
      expect(applied.length).toBeGreaterThan(0);
      expect([
        ...new Set(applied.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([15 * FPS]);
    });
    it('DISCRIMINATING: removing it drops the total', () => {
      expect(selfBuff(noPellets.events, 'pelletCountFlat', 5).length).toBe(0);
      expect(noPellets.total).toBeLessThan(base.total);
    });
  });
});
