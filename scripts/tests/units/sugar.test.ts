// PER-UNIT KIT SPEC — `sugar` (Sugar (Treasure), Attacker/SG/Iron, Burst III, cd 40s, ammo 9,
// 10 pellets/shot). Kit-autonomy gauntlet 2026-07-26; test-first independent re-derivation.
//
// FROM-SCRATCH BUILD: sugar had NO shipped override (simSupported:false) before this gauntlet, so
// the override under test (src/skills/overrides/sugar.json) and this spec land together. Every
// load-bearing line is pinned GREEN vs that override AND RED vs its nearest-wrong counterfactual
// (built in memory with `withPatchedOverride` — the committed JSON is never touched). For a unit
// with no prior encoding, "RED vs shipped" = "RED vs the line removed/mis-triggered/un-scoped".
//
// Kit (blablalink TREASURE prose, data/characters.json → characters.sugar.skills; the datamined
// skill1/2/ulti _detail descriptions carry the UNTREASURED base kit — the treasure prose adds the
// cover-intact Attack Damage, the Fire conversion, the self ATK buffs, and the two Water/Iron-SG
// Elemental Advantage team buffs):
//   S1 ■ cover attacked (20%): Critical Damage ▲16.39% / Reload Speed ▲12.12% / Cover HP restore  [UNMODELED — no cover-attacked primitive; defensive]
//      ■ cover intact: Attack Damage ▲19.98% continuously (self)                                  [G1]
//      ■ battle start: converts damage to Elemental Advantage vs Fire Code enemies (self, perm.)  [G2]
//   S2 ■ entering Full Burst (self): Critical Rate ▲13.02% / ATK ▲25.01% for 10 sec               [G3 / G4]
//      ■ entering Full Burst (all SG allies): Max Ammunition Capacity ▲83.8% for 15 sec           [G5]
//      ■ entering Full Burst (Water+Iron SG allies): Elem. Advantage Attack Damage ▲40.02% / 15s  [G6]
//   BU ■ self: Attack Speed ▲66% / Hit Rate ▲33% / ATK ▲20% for 15 sec                            [G7 / G8 / G9]
//      ■ Water+Iron SG allies: Elem. Advantage Attack Damage ▲60.01% for 15 sec                   [G10]
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   G1  "continuously" = a duration-less PASSIVE (frame 0, no expiry). Counterfactual: the same
//       magnitude gated to fullBurstEnter/10s is only up ~half the fight, so shipped total > it,
//       and it is absent at frame 0 where the passive is present.
//   G2  the Fire conversion is advantageVs:Fire — LIVE vs Fire (grants the ×1.1 element major and
//       unlocks her OWN elemAdvantageDamagePct) yet exactly INERT vs a non-Fire boss. Pinned in
//       BOTH states: vs Fire shipped > removed; vs Iron the totals are BYTE-IDENTICAL (proves it is
//       a Fire-specific conversion, not a generic always-on element buff).
//   G3/G4 fullBurstEnter fires EVERY Full Burst; the nearest wrong trigger burstCast fires only on
//       HER casts (~half as often). Apply-count == FB count under shipped, == cast count under the
//       counterfactual. (Her two S2 self lines share one block, so the trigger flip moves both.)
//   G5/G6/G10 the team buffs are SCOPED (alliesOfWeapon:SG / alliesOfElementWeapon Water+Iron SG).
//       In this fixture sugar is the sole SG and the sole Water/Iron-SG, so the scoped holder set is
//       {sugar}; the unscoped-allies counterfactual reaches all four. Holder-set != proves the scope.
//   G6/G10 elemAdvantageDamagePct lives in the ELEMENT bucket and only pays when advantaged() — so
//       removing it (vs Fire, where sugar IS advantaged) drops her total; the buff still APPLIES to
//       holders regardless (holder-set pin is advantage-independent).
//   G7/G8/G9 burstCast fires on HER casts only; the nearest wrong trigger fullBurstEnter fires every
//       FB. Apply-count == cast count under shipped, == FB count under the counterfactual.
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / sugar B3 / helm B3, boss Fire,
// focus sugar) — sugar needs a real rotation to cast her burst and to open Full Bursts at all.
// Deterministic (no seed). Slot order: liter 0 / crown 1 / sugar 2 / helm 3.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  data,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** controlComp slot order: liter 0 / crown 1 / sugar 2 / helm 3. */
const COMP = ['liter', 'crown', 'sugar', 'helm'];
const SUGAR = COMP.indexOf('sugar');

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type FbStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

// ---- scoped holder sets, derived from the roster (not hardcoded) ------------------------------
const sgIdx = COMP.map((s, i) => ({ s, i }))
  .filter(({ s }) => data.characters[s].weapon === 'SG')
  .map(({ i }) => i);
const waterIronSgIdx = COMP.map((s, i) => ({ s, i }))
  .filter(({ s }) => {
    const c = data.characters[s];
    return (c.element === 'Water' || c.element === 'Iron') && c.weapon === 'SG';
  })
  .map(({ i }) => i);
const ALL_IDX = COMP.map((_, i) => i);
const sorted = (a: number[]) => [...a].sort((x, y) => x - y);

// sanity: sugar (Iron/SG) is in both scoped sets — she is her own team-buff recipient here
if (!sgIdx.includes(SUGAR) || !waterIronSgIdx.includes(SUGAR)) {
  throw new Error('fixture stale: sugar must be an Iron SG ally of herself');
}

// ---- run helper -------------------------------------------------------------------------------
function run(patch?: (ov: any) => void, bossElement: 'Fire' | 'Iron' = 'Fire') {
  const events: SimEvent[] = [];
  const overrides = patch ? { sugar: withPatchedOverride('sugar', patch) } : {};
  const res = runComp({
    ...controlComp('sugar'),
    bossElement,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual / removal patches ---------------------------------------------------------
const removeEffect =
  (slot: 'skill1' | 'skill2' | 'burst', stat: string) => (ov: any) => {
    let removed = false;
    for (const b of ov[slot]) {
      const n = b.effects.length;
      b.effects = b.effects.filter(
        (e: any) => !(e.kind === 'buff' && e.stat === stat)
      );
      if (b.effects.length !== n) {removed = true;}
    }
    ov[slot] = ov[slot].filter((b: any) => b.effects.length > 0);
    if (!removed)
      {throw new Error(
        `sugar ${slot} ${stat} effect missing — fixture is stale`
      );}
  };
const removeAdvantageVs = (ov: any) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'advantageVs')
  );
  if (ov.skill1.length === before)
    {throw new Error(
      'sugar skill1 advantageVs block missing — fixture is stale'
    );}
};
/** Nearest-wrong for G1: the continuous passive re-gated to a part-time Full-Burst window. */
const s1l4ToFbGated = (ov: any) => {
  const b = ov.skill1.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'attackDamagePct')
  );
  if (!b)
    {throw new Error(
      'sugar skill1 attackDamagePct block missing — fixture is stale'
    );}
  b.trigger = { kind: 'fullBurstEnter' };
  b.effects.find((e: any) => e.stat === 'attackDamagePct').durationSec = 10;
};
const setTrigger =
  (slot: 'skill2' | 'burst', stat: string, kind: string) => (ov: any) => {
    let hit = false;
    for (const b of ov[slot])
      {if (b.effects.some((e: any) => e.kind === 'buff' && e.stat === stat)) {
        b.trigger = { kind };
        hit = true;
      }}
    if (!hit)
      {throw new Error(`sugar ${slot} ${stat} block missing — fixture is stale`);}
  };
const setTarget =
  (slot: 'skill2' | 'burst', stat: string, target: any) => (ov: any) => {
    let hit = false;
    for (const b of ov[slot])
      {if (b.effects.some((e: any) => e.kind === 'buff' && e.stat === stat)) {
        b.target = target;
        hit = true;
      }}
    if (!hit)
      {throw new Error(`sugar ${slot} ${stat} block missing — fixture is stale`);}
  };

// ---- runs (hoisted: each is a full 180s sim, ~33ms) -------------------------------------------
const base = run();
const baseIron = run(undefined, 'Iron');
const noAdv = run(removeAdvantageVs);
const noAdvIron = run(removeAdvantageVs, 'Iron');
const noS1L4 = run(removeEffect('skill1', 'attackDamagePct'));
const s1l4Fb = run(s1l4ToFbGated);
const noS2Crit = run(removeEffect('skill2', 'critRatePct'));
const noS2Atk = run(removeEffect('skill2', 'atkPct'));
const s2SelfToBurstCast = run(setTrigger('skill2', 'critRatePct', 'burstCast'));
const noS2Ammo = run(removeEffect('skill2', 'maxAmmoPct'));
const s2AmmoUnscoped = run(
  setTarget('skill2', 'maxAmmoPct', { kind: 'allies' })
);
const noS2Elem = run(removeEffect('skill2', 'elemAdvantageDamagePct'));
const s2ElemUnscoped = run(
  setTarget('skill2', 'elemAdvantageDamagePct', { kind: 'allies' })
);
const noBAtkSpd = run(removeEffect('burst', 'attackSpeedPct'));
const bSelfToFb = run(setTrigger('burst', 'attackSpeedPct', 'fullBurstEnter'));
const noBHitRate = run(removeEffect('burst', 'hitRatePct'));
const noBAtk = run(removeEffect('burst', 'atkPct'));
const noBElem = run(removeEffect('burst', 'elemAdvantageDamagePct'));
const bElemUnscoped = run(
  setTarget('burst', 'elemAdvantageDamagePct', { kind: 'allies' })
);

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const fbCount = (evs: SimEvent[]) =>
  evs.filter((e): e is FbStart => e.kind === 'fullBurstStart').length;
const sugarCasts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'sugar'
  ).length;
/** sugar-caster buff applies for a stat. */
const sugarBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === SUGAR && b.stat === stat);
/** distinct holder (targetIdx) set for a sugar-caster stat. */
const holders = (evs: SimEvent[], stat: string) =>
  sorted([...new Set(sugarBuffs(evs, stat).map((b) => b.targetIdx as number))]);

describe('sugar (Treasure) — kit spec', () => {
  describe('G1 — S1 cover-intact Attack Damage ▲19.98% is a continuous passive (self)', () => {
    const applied = sugarBuffs(base.events, 'attackDamagePct');

    it('is 19.98%, self-scoped, applied at frame 0 with NO expiry (continuous)', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([19.98]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([SUGAR]);
      expect(applied.some((b) => b.frame === 0)).toBe(true);
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
    });

    it("is load-bearing: removing it drops sugar's total", () => {
      expect(base.totals.sugar).toBeGreaterThan(noS1L4.totals.sugar);
    });

    it('DISCRIMINATING: a Full-Burst-gated 19.98%/10s is part-time and deals less', () => {
      // "continuously" = 100% uptime; the FB-gated counterfactual is up ~half the fight.
      expect(base.totals.sugar).toBeGreaterThan(s1l4Fb.totals.sugar);
      // the passive is present at frame 0; the FB-gated version is not (no FB at t=0).
      expect(
        sugarBuffs(s1l4Fb.events, 'attackDamagePct').some((b) => b.frame === 0)
      ).toBe(false);
    });
  });

  describe('G2 — S1 battle-start Fire elemental-advantage conversion (advantageVs:Fire, self)', () => {
    it("is LIVE vs Fire: removing it drops sugar's total (loses the ×1.1 major + her own elem-advantage)", () => {
      expect(base.totals.sugar).toBeGreaterThan(noAdv.totals.sugar);
    });

    it('is INERT vs a non-Fire boss: vs Iron the totals are byte-identical with/without it', () => {
      // proves it is a Fire-SPECIFIC conversion, not a generic always-on element buff.
      expect(baseIron.totals).toEqual(noAdvIron.totals);
    });
  });

  describe('G3 — S2 Full-Burst-enter self Critical Rate ▲13.02% for 10 sec', () => {
    const applied = sugarBuffs(base.events, 'critRatePct');

    it('is 13.02%, self-scoped, 10 sec, fired once per Full Burst', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([13.02]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([SUGAR]);
      for (const b of applied) {expect(b.expiresFrame! - b.frame).toBe(10 * FPS);}
      expect(applied.length).toBe(fbCount(base.events));
    });

    it("is load-bearing: removing it drops sugar's total", () => {
      expect(base.totals.sugar).toBeGreaterThan(noS2Crit.totals.sugar);
    });

    it('DISCRIMINATING: fullBurstEnter (every FB) fires more often than burstCast (her casts only)', () => {
      const asBurstCast = sugarBuffs(s2SelfToBurstCast.events, 'critRatePct');
      expect(applied.length).toBe(fbCount(base.events));
      expect(asBurstCast.length).toBe(sugarCasts(s2SelfToBurstCast.events));
      expect(applied.length).toBeGreaterThan(asBurstCast.length);
    });
  });

  describe('G4 — S2 Full-Burst-enter self ATK ▲25.01% for 10 sec', () => {
    const applied = sugarBuffs(base.events, 'atkPct').filter(
      (b) => b.value === 25.01
    );

    it('is 25.01%, self-scoped, 10 sec, fired once per Full Burst', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([SUGAR]);
      for (const b of applied) {expect(b.expiresFrame! - b.frame).toBe(10 * FPS);}
      expect(applied.length).toBe(fbCount(base.events));
    });

    it("is load-bearing: removing it drops sugar's total", () => {
      expect(base.totals.sugar).toBeGreaterThan(noS2Atk.totals.sugar);
    });
  });

  describe('G5 — S2 Full-Burst-enter Max Ammunition ▲83.8% for 15 sec, scoped to SHOTGUN allies', () => {
    const applied = sugarBuffs(base.events, 'maxAmmoPct');

    it('is 83.8%, 15 sec, reaches exactly the shotgun allies (sugar here), once per Full Burst', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([83.8]);
      for (const b of applied) {expect(b.expiresFrame! - b.frame).toBe(15 * FPS);}
      expect(holders(base.events, 'maxAmmoPct')).toEqual(sorted(sgIdx));
      // every holder is genuinely a shotgun ally
      for (const i of holders(base.events, 'maxAmmoPct'))
        {expect(COMP[i]).toBeTruthy();}
      expect(applied.length).toBe(fbCount(base.events) * sgIdx.length);
    });

    it("is load-bearing: removing it drops sugar's total (smaller magazine = more reload time)", () => {
      expect(base.totals.sugar).toBeGreaterThan(noS2Ammo.totals.sugar);
    });

    it('DISCRIMINATING: an unscoped allies buff reaches all four, not just the SG allies', () => {
      expect(holders(s2AmmoUnscoped.events, 'maxAmmoPct')).toEqual(
        sorted(ALL_IDX)
      );
      expect(holders(base.events, 'maxAmmoPct')).not.toEqual(sorted(ALL_IDX));
    });
  });

  describe('G6 — S2 Full-Burst-enter Elem. Advantage Attack Damage ▲40.02% / 15s, Water+Iron SG allies', () => {
    const applied = sugarBuffs(base.events, 'elemAdvantageDamagePct').filter(
      (b) => b.value === 40.02
    );

    it('is 40.02%, 15 sec, reaches exactly the Water/Iron shotgun allies (sugar here)', () => {
      expect(applied.length).toBeGreaterThan(0);
      for (const b of applied) {expect(b.expiresFrame! - b.frame).toBe(15 * FPS);}
      expect(
        holders(base.events, 'elemAdvantageDamagePct').filter((i) =>
          applied.some((b) => b.targetIdx === i)
        )
      ).toEqual(sorted(waterIronSgIdx));
      expect(applied.length).toBe(fbCount(base.events) * waterIronSgIdx.length);
    });

    it('is load-bearing vs Fire (sugar is advantaged): removing it drops her total', () => {
      expect(base.totals.sugar).toBeGreaterThan(noS2Elem.totals.sugar);
    });

    it('DISCRIMINATING: an unscoped allies buff reaches all four, not just Water/Iron SG', () => {
      expect(holders(s2ElemUnscoped.events, 'elemAdvantageDamagePct')).toEqual(
        sorted(ALL_IDX)
      );
      expect(holders(base.events, 'elemAdvantageDamagePct')).not.toEqual(
        sorted(ALL_IDX)
      );
    });
  });

  describe('G7 — burst self Attack Speed ▲66% for 15 sec (burstCast)', () => {
    const applied = sugarBuffs(base.events, 'attackSpeedPct');

    it('is 66%, self-scoped, 15 sec, fired once per sugar burst CAST (not per FB)', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([66]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([SUGAR]);
      for (const b of applied) {expect(b.expiresFrame! - b.frame).toBe(15 * FPS);}
      expect(applied.length).toBe(sugarCasts(base.events));
    });

    it("is load-bearing: removing it drops sugar's total sharply", () => {
      expect(base.totals.sugar).toBeGreaterThan(noBAtkSpd.totals.sugar);
    });

    it('DISCRIMINATING: burstCast (her casts) fires less often than fullBurstEnter (every FB)', () => {
      const asFb = sugarBuffs(bSelfToFb.events, 'attackSpeedPct');
      expect(applied.length).toBe(sugarCasts(base.events));
      expect(asFb.length).toBe(fbCount(bSelfToFb.events));
      expect(asFb.length).toBeGreaterThan(applied.length);
    });
  });

  describe('G8 — burst self Hit Rate ▲33% for 15 sec (burstCast)', () => {
    const applied = sugarBuffs(base.events, 'hitRatePct');

    it('is 33%, self-scoped, 15 sec, fired once per sugar burst cast', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([33]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([SUGAR]);
      for (const b of applied) {expect(b.expiresFrame! - b.frame).toBe(15 * FPS);}
      expect(applied.length).toBe(sugarCasts(base.events));
    });

    it("is load-bearing (Hit Rate lifts core-hit fraction): removing it drops sugar's total", () => {
      expect(base.totals.sugar).toBeGreaterThan(noBHitRate.totals.sugar);
    });
  });

  describe('G9 — burst self ATK ▲20% for 15 sec (burstCast)', () => {
    const applied = sugarBuffs(base.events, 'atkPct').filter(
      (b) => b.value === 20
    );

    it('is 20%, self-scoped, 15 sec, fired once per sugar burst cast', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([SUGAR]);
      for (const b of applied) {expect(b.expiresFrame! - b.frame).toBe(15 * FPS);}
      expect(applied.length).toBe(sugarCasts(base.events));
    });

    it("is load-bearing: removing it drops sugar's total", () => {
      expect(base.totals.sugar).toBeGreaterThan(noBAtk.totals.sugar);
    });
  });

  describe('G10 — burst Elem. Advantage Attack Damage ▲60.01% / 15s, Water+Iron SG allies (burstCast)', () => {
    const applied = sugarBuffs(base.events, 'elemAdvantageDamagePct').filter(
      (b) => b.value === 60.01
    );

    it('is 60.01%, 15 sec, reaches exactly the Water/Iron shotgun allies, once per sugar burst cast', () => {
      expect(applied.length).toBeGreaterThan(0);
      for (const b of applied) {expect(b.expiresFrame! - b.frame).toBe(15 * FPS);}
      expect(
        holders(base.events, 'elemAdvantageDamagePct').filter((i) =>
          applied.some((b) => b.targetIdx === i)
        )
      ).toEqual(sorted(waterIronSgIdx));
      expect(applied.length).toBe(
        sugarCasts(base.events) * waterIronSgIdx.length
      );
    });

    it('is load-bearing vs Fire (sugar is advantaged): removing it drops her total', () => {
      expect(base.totals.sugar).toBeGreaterThan(noBElem.totals.sugar);
    });

    it('DISCRIMINATING: an unscoped allies buff reaches all four, not just Water/Iron SG', () => {
      expect(holders(bElemUnscoped.events, 'elemAdvantageDamagePct')).toEqual(
        sorted(ALL_IDX)
      );
      expect(holders(base.events, 'elemAdvantageDamagePct')).not.toEqual(
        sorted(ALL_IDX)
      );
    });
  });
});
