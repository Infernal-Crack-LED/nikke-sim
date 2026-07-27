// PER-UNIT KIT SPEC — `cinderella-crystal-wave` (Cinderella: Crystal Wave, the VARIANT
// MG/Attacker/Iron unit, aka "ccw"/"scindy"; NOT the base RL/Defender/Electric `cinderella`
// "cindy"), Burst III, cd 40s, ammo 300, MG (chargeFrames 0). Kit-autonomy gauntlet
// 2026-07-25 — test-first faithful re-derivation.
//
// One assertion group per KIT LINE (W1..W8 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) and to flip her user-selectable MODE — never to supply
// the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters['cinderella-crystal-wave'].skills,
// lvl-10 values):
//   S1 ■ Beauty-Full (battle start) → self: Attack Damage ▲ 24% continuously                 [W1]
//      ■ every 5s → nearest enemy: 900% of final ATK as damage                               [W4]
//      ■ each time total ally ammo consumed reaches 200 → all allies: fill Burst Gauge 12%    [W8]
//      ■ Preparation for Change: reload fixed 3s for 6s, removed on last bullet  (UNMODELED)
//      ■ (Snipe mode) weapon swap: 62.13%/shot, 1s charge, 250% full charge, +Pierce (alt path)
//   S2 ■ (battle start) → self: ATK ▲ 29% continuously                                       [W2]
//      ■ Pinpoint (MG mode) → self: Damage to core ▲ 26% continuously  \  mode toggle        [W3]
//      ■ Destroy (Snipe mode) → self: Damage to Parts ▲ 26.21% continuously  /               [W3]
//      ■ Decoy avatar 70.34% final Max HP, continuous  (UNMODELED — defensive)
//      ■ entering Full Burst AFTER own burst, Snipe mode → all enemies: 1189.66% (alt path)
//      ■ entering Full Burst AFTER own burst, MG mode → cored enemies: 833.79% core strike    [W5]
//   BU ■ self: Attack Damage ▲ 92% + ATK ▲ 65% for 10 sec                                    [W6]
//      ■ highest-final-ATK enemy: 6000% of final ATK as Burst Skill damage                   [W7]
//
// Encoding under test (src/skills/overrides/cinderella-crystal-wave.json):
//   W1 → skill1 passive self buff attackDamagePct 24 (continuous)
//   W2 → skill2 passive self buff atkPct 29 (continuous)
//   W3 → skill2 passive self buff coreDamagePct 26 (mode MG) / partsDamagePct 26.21 (mode Snipe)
//   W4 → skill1 interval(sec 5) enemy flatDamage atkPct 900 (function flavor: crit yes / core no /
//        range no / FB by landing timing; first fire at t=5s). [gauntlet gotcha-2 fix: re-encoded
//        from the `dot` primitive to the engine `interval` trigger that matches the kit wording]
//   W5 → skill2 fullBurstEnter (ownBurstGate:'cast') enemy flatDamage 833.79 core:true (mode MG) /
//        1189.66 core:false (mode Snipe — plain "as damage", not a core strike). [gauntlet gotcha-1
//        fix: Snipe branch core flag corrected to match its text; MG branch stays core strike]
//   W6 → burst burstCast self buff attackDamagePct 92 + atkPct 65 (10s)
//   W7 → burst burstCast enemy flatDamage 6000
//   W8 → skill1 teamAmmo(count 200) allies fillGauge 12%
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   W1  the 24% is a CONTINUOUS passive (null expiry), distinct from her OWN 10s burst Attack
//       Damage 92% (600-frame expiry). Removing it drops her total ~9% — it is live, not inert.
//   W2  same shape as W1 for the 29% ATK passive; removing it drops her total ~13%.
//   W3  the core-vs-parts toggle is MODE-SCOPED: MG runs Pinpoint (coreDamagePct 26, no parts buff)
//       and Snipe runs Destroy (partsDamagePct 26.21, no core buff). The nearest wrong model is an
//       unscoped buff that lands in BOTH modes; proven by flipping the mode (modes reorder) and
//       reading which stat appears. Destroy is inert vs the partless scope-lock boss (removing it in
//       Snipe changes no total), exactly as a Damage-to-Parts stat must be.
//   W4  the 900% hit fires on a 5s TIMER (~35 times/180s), not per burst (6) and not per shot
//       (thousands). Removing it zeroes the skill1 line and drops her total ~20% (it is her single
//       largest skill contributor).
//   W5  the centerpiece. The MG rider is (a) gated to FB entries THIS unit triggered
//       (ownBurstGate:'cast') — it fires 6× (her own casts), where an ungated fullBurstEnter fires
//       12× (every team FB, incl. helm's); (b) a fullBurstEnter trigger, so it takes the +50% FB
//       major (fbMajorApplied true), where a burstCast trigger loses it; (c) core:true, so it is
//       core-eligible (coreRate>0), where core:false is not. Each is a distinct counterfactual the
//       shipped encoding provably beats. (The 2026-07-17 ownBurstGate fix is board-MOVING: she
//       alternates stage-3 with a co-B3, so the gate halves the rider firings.)
//   W6  the burst self-buffs are TIMED (10s = 600 frames, one per cast), distinct from the
//       continuous 24%/29% passives. Count == her burst casts.
//   W7  the 6000% nuke is a burstCast, so it lands BEFORE the FB window and never takes the +50%
//       major (verified fact, 2026-07-13) — the nearest wrong model is a fullBurstEnter nuke.
//   W8  the per-200-ally-ammo 12% gauge fill feeds TEAM burst cadence: removing it drops helm's
//       burst count over the fight (the same teamAmmo mechanism Little Mermaid uses). The gauge
//       primitive emits no damage event, so the observable is the teammate's cast count, plus a
//       structural pin of the block itself.
//
// UNMODELED (inert; documented here + override unmodeled, deliberately no assertion):
//   - Preparation for Change reload bookkeeping (reload fixed 3s for 6s) — reload timing only.
//   - Decoy avatar (70.34% final Max HP) — defensive/aggro; the v1 boss deals no damage.
//   - Pierce (Snipe mode) — inert vs the partless boss.
//   ⚑ Snipe weapon-swap magazine is modeled as 1 round (Additional Effect 2 expends 40 rounds per
//   full-charge shot vs the listed 15-round mag → one shot per reload cycle); if the 40-round expend
//   draws from a separate pool, maxAmmo should be 15. Flagged in the override note; the Snipe path is
//   the non-validated alternate (graded sample is MG, core 100%).
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / ccw B3 [focus] / helm B3, boss
// Fire, boss core 100% exposed). ccw needs a real rotation to cast her burst (a lone B3 makes zero
// Full Bursts); two B3s (ccw + helm) alternate, giving her six casts over 180s and — critically for
// W5 — six FB entries she triggered AND six helm triggered, so the ownBurstGate has something to
// gate against. Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const SLUG = 'cinderella-crystal-wave';
/** controlComp slot order: liter 0 / crown 1 / ccw 2 / helm 3. */
const CCW = 2;
const HELM = 3;

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

// ---- counterfactual / nearest-wrong patches ---------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);
/** The MG-mode FB rider block (fullBurstEnter + flatDamage 833.79). */
const mgRiderBlock = (ov: any) => {
  const blk = ov.skill2.find(
    (b: any) =>
      b.mode === 'MG' && b.effects.some((e: any) => e.kind === 'flatDamage')
  );
  if (!blk) {throw new Error('ccw MG FB rider block missing — fixture is stale');}
  return blk;
};

/** W1 reference: Beauty-Full (Attack Damage 24%) removed. */
const noBeauty = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'attackDamagePct'));
  if (ov.skill1.length === before)
    {throw new Error('ccw Beauty-Full block missing — fixture is stale');}
});
/** W2 reference: ATK 29% passive removed. */
const noAtk29 = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'atkPct'));
  if (ov.skill2.length === before)
    {throw new Error('ccw ATK 29% block missing — fixture is stale');}
});
/** W3 reference: Pinpoint (coreDamagePct 26) removed. */
const noPinpoint = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'coreDamagePct'));
  if (ov.skill2.length === before)
    {throw new Error('ccw Pinpoint block missing — fixture is stale');}
});
/** W3 mode flip: Snipe becomes the default mode (modes[0]). */
const snipeMode = withPatchedOverride(SLUG, (ov) => {
  if (!Array.isArray(ov.modes) || !ov.modes.includes('Snipe'))
    {throw new Error('ccw modes list missing Snipe — fixture is stale');}
  ov.modes = ['Snipe', 'MG'];
});
/** W3 Snipe + Destroy removed (to prove Destroy is inert vs the partless boss). */
const snipeNoParts = withPatchedOverride(SLUG, (ov) => {
  ov.modes = ['Snipe', 'MG'];
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'partsDamagePct'));
  if (ov.skill2.length === before)
    {throw new Error('ccw Destroy block missing — fixture is stale');}
});
/** W4 reference: the every-5s 900% interval line removed (engine `interval` trigger + flatDamage). */
const noInterval = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => b.trigger?.kind !== 'interval');
  if (ov.skill1.length === before)
    {throw new Error('ccw 900% interval block missing — fixture is stale');}
});
/** W5 reference: the MG FB rider removed entirely. */
const noRider = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) =>
      !(b.mode === 'MG' && b.effects.some((e: any) => e.kind === 'flatDamage'))
  );
  if (ov.skill2.length === before)
    {throw new Error('ccw MG FB rider block missing — fixture is stale');}
});
/** W5b counterfactual: rider present but UNGATED (ownBurstGate removed → fires on every team FB). */
const ungatedRider = withPatchedOverride(SLUG, (ov) => {
  const blk = mgRiderBlock(ov);
  if (!blk.ownBurstGate)
    {throw new Error('ccw MG rider ownBurstGate missing — fixture is stale');}
  delete blk.ownBurstGate;
});
/** W5c counterfactual: rider re-triggered to burstCast (lands before FB → loses the +50% major). */
const burstCastRider = withPatchedOverride(SLUG, (ov) => {
  const blk = mgRiderBlock(ov);
  if (blk.trigger?.kind !== 'fullBurstEnter')
    {throw new Error(
      'ccw MG rider trigger is not fullBurstEnter — fixture is stale'
    );}
  blk.trigger.kind = 'burstCast';
});
/** W5d counterfactual: rider core flag cleared (loses the core bucket). */
const noCoreRider = withPatchedOverride(SLUG, (ov) => {
  const blk = mgRiderBlock(ov);
  const e = blk.effects.find((x: any) => x.kind === 'flatDamage');
  if (e.core !== true)
    {throw new Error('ccw MG rider core flag is not true — fixture is stale');}
  e.core = false;
});
/** W8 reference: the teamAmmo gauge-fill block removed. */
const noTeamAmmo = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => b.trigger?.kind !== 'teamAmmo');
  if (ov.skill1.length === before)
    {throw new Error('ccw teamAmmo block missing — fixture is stale');}
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const beauty = run({ [SLUG]: noBeauty });
const atk29 = run({ [SLUG]: noAtk29 });
const pinpoint = run({ [SLUG]: noPinpoint });
const snipe = run({ [SLUG]: snipeMode });
const snipeParts = run({ [SLUG]: snipeNoParts });
const intervalRun = run({ [SLUG]: noInterval });
const rider = run({ [SLUG]: noRider });
const ungated = run({ [SLUG]: ungatedRider });
const burstCast = run({ [SLUG]: burstCastRider });
const noCore = run({ [SLUG]: noCoreRider });
const teamAmmo = run({ [SLUG]: noTeamAmmo });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const ccwDamage = (evs: SimEvent[]) => dmg(evs).filter((d) => d.slug === SLUG);
const ccwBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === SLUG);
const helmBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'helm'
  );
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const ccwBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === CCW && b.stat === stat);

/** The MG FB core-strike rider (skill2 flatDamage 833.79), in frame order. */
const mgRider = (evs: SimEvent[]) =>
  ccwDamage(evs)
    .filter((d) => d.srcSlot === 'skill2' && d.atkPct === 833.79)
    .sort((a, b) => a.frame - b.frame);
/** The Snipe FB rider (skill2 flatDamage 1189.66). */
const snipeRider = (evs: SimEvent[]) =>
  ccwDamage(evs).filter((d) => d.srcSlot === 'skill2' && d.atkPct === 1189.66);
/** The 6000% burst nuke. */
const nukes = (evs: SimEvent[]) =>
  ccwDamage(evs).filter((d) => d.srcSlot === 'burst' && d.atkPct === 6000);
/** The every-5s 900% crosshair interval hit (engine `interval` trigger + flatDamage). */
const intervalHits = (evs: SimEvent[]) =>
  ccwDamage(evs)
    .filter((d) => d.srcSlot === 'skill1' && d.atkPct === 900)
    .sort((a, b) => a.frame - b.frame);

describe('cinderella-crystal-wave — kit spec', () => {
  describe('W1 — S1 Beauty-Full: Attack Damage ▲ 24% continuous, self', () => {
    const applied = ccwBuffs(base.events, 'attackDamagePct').filter(
      (b) => b.value === 24
    );

    it('is a self-scoped, always-on (continuous) 24% buff', () => {
      expect(
        applied.length,
        'no Beauty-Full 24% buff was applied'
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([24]);
      expect(
        [...new Set(applied.map((b) => b.targetIdx))],
        'must be self-scoped'
      ).toEqual([CCW]);
      expect(
        [...new Set(applied.map((b) => b.expiresFrame))],
        'Beauty-Full is continuous — no wall-clock expiry'
      ).toEqual([null]);
    });

    it('DISCRIMINATING: removing it drops her total (live, not inert)', () => {
      expect(base.totals[SLUG]).toBeGreaterThan(beauty.totals[SLUG]);
    });
  });

  describe('W2 — S2 ATK ▲ 29% continuous, self', () => {
    const applied = ccwBuffs(base.events, 'atkPct').filter(
      (b) => b.value === 29
    );

    it('is a self-scoped, always-on (continuous) 29% buff', () => {
      expect(applied.length, 'no ATK 29% buff was applied').toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([29]);
      expect(
        [...new Set(applied.map((b) => b.targetIdx))],
        'must be self-scoped'
      ).toEqual([CCW]);
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
    });

    it('DISCRIMINATING: removing it drops her total (live, not inert)', () => {
      expect(base.totals[SLUG]).toBeGreaterThan(atk29.totals[SLUG]);
    });
  });

  describe('W3 — S2 core-vs-parts toggle is MODE-SCOPED (Pinpoint MG / Destroy Snipe)', () => {
    it('MG mode: Pinpoint coreDamagePct 26 active, Destroy partsDamagePct absent', () => {
      const core = ccwBuffs(base.events, 'coreDamagePct');
      expect([...new Set(core.map((b) => b.value))]).toEqual([26]);
      expect([...new Set(core.map((b) => b.targetIdx))]).toEqual([CCW]);
      expect([...new Set(core.map((b) => b.expiresFrame))]).toEqual([null]);
      expect(
        ccwBuffs(base.events, 'partsDamagePct'),
        'Destroy must NOT apply in MG mode'
      ).toEqual([]);
    });

    it('Snipe mode: Destroy partsDamagePct 26.21 active, Pinpoint coreDamagePct absent', () => {
      const parts = ccwBuffs(snipe.events, 'partsDamagePct');
      expect([...new Set(parts.map((b) => b.value))]).toEqual([26.21]);
      expect([...new Set(parts.map((b) => b.targetIdx))]).toEqual([CCW]);
      expect(
        ccwBuffs(snipe.events, 'coreDamagePct'),
        'Pinpoint must NOT apply in Snipe mode'
      ).toEqual([]);
    });

    it('the mode flip swaps the FB rider too (MG 833.79 → Snipe 1189.66)', () => {
      expect(mgRider(base.events).length).toBeGreaterThan(0);
      expect(snipeRider(base.events)).toEqual([]);
      expect(snipeRider(snipe.events).length).toBeGreaterThan(0);
      expect(mgRider(snipe.events)).toEqual([]);
    });

    it('the FB rider core flag is mode-split: MG core strike (core) vs Snipe plain damage (non-core)', () => {
      // Kit text: the MG branch deals "833.79% ... as CORE STRIKE damage" (core-eligible); the Snipe
      // branch deals "1189.66% ... as damage" to "all enemies (including parts)" — plain, NOT core
      // strike. Function/skill damage is core-ineligible unless the text explicitly labels it core
      // (damage-calculation §1b/§2b). Gauntlet gotcha-1 fix pinned here (two blind roles + formula).
      expect(
        mgRider(base.events).every((d) => d.coreEligible),
        'MG branch is a core strike'
      ).toBe(true);
      expect(
        snipeRider(snipe.events).every((d) => !d.coreEligible),
        'Snipe branch is plain damage — never core'
      ).toBe(true);
    });

    it('Snipe mode swaps the weapon to 62.13%/shot (the alt weapon-swap path)', () => {
      const norm = ccwDamage(snipe.events).filter(
        (d) => d.srcSlot === 'normal'
      );
      expect([...new Set(norm.map((d) => d.atkPct))]).toEqual([62.13]);
      // MG normal shots are the datamined 5.57% MG round, NOT the snipe round.
      const mgNorm = ccwDamage(base.events).filter(
        (d) => d.srcSlot === 'normal'
      );
      expect([...new Set(mgNorm.map((d) => d.atkPct))]).toEqual([5.57]);
    });

    it('DISCRIMINATING: removing Pinpoint (MG) drops her core-hit total', () => {
      expect(base.totals[SLUG]).toBeGreaterThan(pinpoint.totals[SLUG]);
    });

    it('Destroy is INERT vs the partless boss (removing it in Snipe changes no total)', () => {
      expect(snipe.totals).toEqual(snipeParts.totals);
    });
  });

  describe('W4 — S1 every-5s 900% crosshair hit (interval trigger; function flavor)', () => {
    it('fires on a ~5s cadence (~35×/180s) at the kit magnitude, in the skill bucket', () => {
      const ds = intervalHits(base.events);
      expect([...new Set(ds.map((d) => d.atkPct))]).toEqual([900]);
      expect([...new Set(ds.map((d) => d.bucket))]).toEqual(['skill']);
      expect(
        ds.length,
        `${ds.length} firings — a 5s timer lands ~35×/180s; per-burst would be ~6, per-shot thousands`
      ).toBeGreaterThanOrEqual(30);
      expect(ds.length).toBeLessThanOrEqual(40);
    });

    it('first fires at t=5s (the interval first-fire convention), NOT t=0', () => {
      // Discriminates the nearest-wrong "one extra proc at t=0": the engine `interval` trigger
      // fires first at t=sec. Pinning the first firing frame to 5s (not 0) gates that phase.
      const ds = intervalHits(base.events);
      expect(
        ds[0].frame,
        'first firing must be at t=5s (frame 300), not t=0'
      ).toBe(5 * FPS);
    });

    it('is FUNCTION-type damage: crit-eligible, never core, no range, FB major by timing only', () => {
      const ds = intervalHits(base.events);
      expect(
        ds.every((d) => d.critEligible),
        'function damage crits at her sheet rate'
      ).toBe(true);
      expect(
        ds.every((d) => !d.coreEligible),
        'function damage is never core'
      ).toBe(true);
      expect(
        ds.every((d) => !d.rangeApplied),
        'riders carry no range bonus'
      ).toBe(true);
      // FB by landing timing: procs inside an FB window take the +50%, those outside do not —
      // both states appear over a 180s fight (it is NOT wrongly noFb'd, nor always-on).
      expect(ds.some((d) => d.fbMajorApplied)).toBe(true);
      expect(ds.some((d) => !d.fbMajorApplied)).toBe(true);
    });

    it('DISCRIMINATING: removing it zeroes the skill1 line and drops her total', () => {
      expect(intervalHits(intervalRun.events)).toEqual([]);
      expect(base.totals[SLUG]).toBeGreaterThan(intervalRun.totals[SLUG]);
    });
  });

  describe('W5 — S2 MG FB rider: 833.79% core strike, own-burst-gated, fullBurstEnter, core:true', () => {
    it('lands at the kit magnitude in the skill bucket (srcSlot skill2)', () => {
      const rs = mgRider(base.events);
      expect(rs.length).toBeGreaterThan(0);
      expect([...new Set(rs.map((d) => d.atkPct))]).toEqual([833.79]);
      expect([...new Set(rs.map((d) => d.bucket))]).toEqual(['skill']);
      expect([...new Set(rs.map((d) => d.srcSlot))]).toEqual(['skill2']);
    });

    it('OWN-BURST-GATED: fires once per FB entry THIS unit triggered (== her casts, not all FBs)', () => {
      const own = ccwBursts(base.events).length;
      const teamFb = own + helmBursts(base.events).length;
      const rs = mgRider(base.events).length;
      expect(rs, 'rider must fire exactly on her own FB entries').toBe(own);
      expect(
        teamFb,
        'fixture must have co-B3 FB entries to gate against'
      ).toBeGreaterThan(own);
    });

    it('DISCRIMINATING (gate): an ungated fullBurstEnter over-fires on every team FB', () => {
      const gated = mgRider(base.events).length;
      const ungatedCount = mgRider(ungated.events).length;
      expect(
        ungatedCount,
        `${ungatedCount} ungated vs ${gated} gated — ungated fires on helm's FB entries too`
      ).toBeGreaterThan(gated);
      expect(ungatedCount).toBe(
        ccwBursts(ungated.events).length + helmBursts(ungated.events).length
      );
    });

    it('DISCRIMINATING (trigger): fullBurstEnter takes the +50% FB major; burstCast loses it', () => {
      expect(mgRider(base.events).every((d) => d.fbMajorApplied)).toBe(true);
      expect(mgRider(burstCast.events).every((d) => !d.fbMajorApplied)).toBe(
        true
      );
    });

    it('DISCRIMINATING (core): core:true is core-eligible (coreRate>0); core:false is not', () => {
      const rs = mgRider(base.events);
      expect(rs.every((d) => d.coreEligible)).toBe(true);
      expect(rs.every((d) => d.coreRate > 0)).toBe(true);
      expect(mgRider(noCore.events).every((d) => !d.coreEligible)).toBe(true);
    });

    it('DISCRIMINATING (reference): removing the rider zeroes the line and drops her total', () => {
      expect(mgRider(rider.events)).toEqual([]);
      expect(base.totals[SLUG]).toBeGreaterThan(rider.totals[SLUG]);
    });
  });

  describe('W6 — burst self-buffs: Attack Damage ▲ 92% + ATK ▲ 65% for 10s, one per cast', () => {
    const ad = ccwBuffs(base.events, 'attackDamagePct').filter(
      (b) => b.value === 92
    );
    const atk = ccwBuffs(base.events, 'atkPct').filter((b) => b.value === 65);

    it('fire once per burst cast, self-scoped, for exactly 10 sec (timed, not continuous)', () => {
      const casts = ccwBursts(base.events).length;
      expect(ad.length, 'one 92% Attack Damage buff per cast').toBe(casts);
      expect(atk.length, 'one 65% ATK buff per cast').toBe(casts);
      for (const b of [...ad, ...atk]) {
        expect(b.targetIdx).toBe(CCW);
        expect(b.expiresFrame! - b.frame, 'must be a 10s timed buff').toBe(
          10 * FPS
        );
      }
    });

    it('DISCRIMINATING: the 92/65 buffs are TIMED, distinct from the continuous 24/29 passives', () => {
      // The continuous passives carry null expiry; the burst buffs carry a 600-frame expiry. A
      // continuous encoding of the burst buff would show null here.
      expect([...new Set(ad.map((b) => b.expiresFrame! - b.frame))]).toEqual([
        10 * FPS,
      ]);
      expect([...new Set(atk.map((b) => b.expiresFrame! - b.frame))]).toEqual([
        10 * FPS,
      ]);
    });
  });

  describe('W7 — burst nuke: 6000% of final ATK, cast BEFORE the Full Burst window', () => {
    it('fires once per burst cast at the kit magnitude, in the burst bucket', () => {
      const nk = nukes(base.events);
      expect(nk.length).toBe(ccwBursts(base.events).length);
      expect(nk.length).toBeGreaterThan(0);
      expect([...new Set(nk.map((d) => d.atkPct))]).toEqual([6000]);
      expect([...new Set(nk.map((d) => d.bucket))]).toEqual(['burst']);
      expect([...new Set(nk.map((d) => d.srcSlot))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      const took = nukes(base.events).filter((d) => d.fbMajorApplied);
      expect(
        took.map((d) => d.sec),
        'burst-cast damage must precede the FB window'
      ).toEqual([]);
    });
  });

  describe('W8 — S1 teamAmmo: per-200 ally ammo → all allies fill Burst Gauge 12%', () => {
    it("feeds TEAM burst cadence: removing it drops a teammate's burst count", () => {
      // The gauge primitive emits no damage event, so the observable is the teammate's cast count:
      // ccw's per-200-ally-ammo 12% fill advances helm's bursts over the fight.
      expect(
        helmBursts(base.events).length,
        "ccw's teamAmmo fill must advance helm's burst cadence"
      ).toBeGreaterThan(helmBursts(teamAmmo.events).length);
    });

    it('is encoded as a teamAmmo(count 200) → fillGauge 12% block targeting allies', () => {
      const ov: any = withPatchedOverride(SLUG, () => {});
      const blk = ov.skill1.find((b: any) => b.trigger?.kind === 'teamAmmo');
      expect(blk, 'teamAmmo block must exist').toBeTruthy();
      expect(blk.trigger.count).toBe(200);
      expect(blk.target.kind).toBe('allies');
      const fill = blk.effects.find((e: any) => e.kind === 'fillGauge');
      expect(fill?.pct).toBe(12);
    });
  });
});
