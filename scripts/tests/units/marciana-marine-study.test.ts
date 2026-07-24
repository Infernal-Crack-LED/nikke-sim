// PER-UNIT KIT SPEC — `marciana-marine-study` (Marciana: Marine Study, Attacker/AR/Iron, Burst III,
// cd 40s, ammo 60, Elysion). Kit-autonomy gauntlet 2026-07-24.
//
// Kit (data/characters.json → characters['marciana-marine-study'].skills):
//   S1 ■ entering Full Burst after own burst → boss (highest Max HP):                  [M1]
//        3789.25% ATK additional damage + Flagged Target (ATK▼10.56%/10s, inert in v1)
//      ■ enemy neutralized if Flagged Target → 1 random enemy:                         [UNMODELED]
//        (no enemyNeutralized trigger; boss never dies)
//      ■ 20 hits vs High-Risk-Target boss → boss: 152.68% ATK additional damage        [M2]
//   S2 ■ start of battle → self: Whistle ATK▲32.73%/stack continuously, max 5; +4 stk  [M3]
//      ■ ≤3 Raptures for 5s → self: Whistle +1 stack (interval:5 in sim, always 1 mob) [M3]
//      ■ ≥6 Raptures for 1s → all enemies 214.36% ATK + Whistle−1                     [UNMODELED]
//        (never ≥6 enemies in solo raid)
//      ■ Rapture appears/neutralized while ≤5 → self: elemAdvantageDamagePct 20.41     [M4]
//        (passive in sim — boss appears at t=0, 1 enemy ≤5)
//   BU ■ burstCast → self: elemAdvantageDamagePct 30.97%/10s + attackDamagePct 27.45%/10s [M5]
//      ■ burstCast + bossElementGate:Electric → boss: High-Risk Target 20s             [M6]
//        (DEF▼10.56% inert at bossDef:0; status gates M2's rider)
//
// Fixture: liter B1 / crown B2 / marciana-marine-study B3 / helm B3, boss Electric
// (Iron > Electric = elemental advantage, exercises elemAdvantageDamagePct + High-Risk Target).
// Deterministic (no seed).
//
// Why each assertion discriminates:
//   M1  fullBurstEnter+ownBurstGate:'cast' fires INSIDE the FB window (inFullBurst=true, takes
//       +50% major). Nearest-wrong: burstCast trigger fires BEFORE FB (inFullBurst=false).
//   M2  requiresTargetStatus:'High-Risk Target' gates the rider to post-burst (High-Risk Target
//       applied by burst). Nearest-wrong: ungated hitCount:20 fires from t=0 (before any burst).
//   M3  perResource whistle ramps 4→5 stacks at t=5s (baseAtk step). Nearest-wrong: flat
//       atkPct:163.65 from t=0 — no ramp, baseAtk constant before t=5s.
//   M4  passive elemAdvantageDamagePct 20.41 active from frame 0. Nearest-wrong: interval:5
//       first fires at frame 300 (t=5s).
//   M5  burstCast applies both self-buffs at the burst frame. Nearest-wrong: wrong values/duration.
//   M6  bossElementGate:'Electric' — rider fires vs Electric boss, NOT vs Fire boss.
//       Nearest-wrong: ungated targetStatus fires vs any boss element.
import { describe, expect, it } from 'vitest';
import type { Element, SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const MARCIANA = 2; // liter 0 / crown 1 / marciana-marine-study 2 / helm 3

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(
  overrides: Record<string, any> = {},
  bossElement: Element = 'Electric',
) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('marciana-marine-study'),
    bossElement,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches -------------------------------------------------------------------

/** M1 counterfactual: S1 nuke trigger changed from fullBurstEnter to burstCast (fires pre-FB). */
const marcianaBurstCastTrigger = withPatchedOverride(
  'marciana-marine-study',
  (ov) => {
    const blk = ov.skill1.find(
      (b: any) => b.trigger?.kind === 'fullBurstEnter',
    );
    if (!blk)
      throw new Error('S1 fullBurstEnter block missing — fixture is stale');
    blk.trigger = { kind: 'burstCast' };
    delete blk.ownBurstGate;
  },
);

/** M2 counterfactual: S1 20-hit rider with requiresTargetStatus removed (fires from t=0). */
const marcianaNoStatusGate = withPatchedOverride(
  'marciana-marine-study',
  (ov) => {
    const blk = ov.skill1.find(
      (b: any) => b.requiresTargetStatus === 'High-Risk Target',
    );
    if (!blk)
      throw new Error('S1 High-Risk Target rider missing — fixture is stale');
    delete blk.requiresTargetStatus;
  },
);

/** M3 counterfactual: Whistle perResource replaced with flat atkPct:163.65 (5 stacks from t=0). */
const marcianaFlatWhistle = withPatchedOverride(
  'marciana-marine-study',
  (ov) => {
    const blk = ov.skill2.find((b: any) =>
      b.effects?.some((e: any) => e.perResource?.name === 'whistle'),
    );
    if (!blk)
      throw new Error(
        'S2 whistle perResource block missing — fixture is stale',
      );
    blk.effects = [{ kind: 'buff', stat: 'atkPct', value: 163.65 }];
  },
);

/** M1 counterfactual 2: ownBurstGate removed — nuke fires on EVERY team FB (incl. helm's rotations). */
const marcianaNoOwnBurstGate = withPatchedOverride(
  'marciana-marine-study',
  (ov) => {
    const blk = ov.skill1.find(
      (b: any) => b.trigger?.kind === 'fullBurstEnter',
    );
    if (!blk)
      throw new Error('S1 fullBurstEnter block missing — fixture is stale');
    delete blk.ownBurstGate;
  },
);

/** M4 counterfactual: S2 elemAdvantageDamagePct 20.41 changed from passive to interval:5. */
const marcianaIntervalElemAdv = withPatchedOverride(
  'marciana-marine-study',
  (ov) => {
    const blk = ov.skill2.find((b: any) =>
      b.effects?.some(
        (e: any) => e.stat === 'elemAdvantageDamagePct' && e.value === 20.41,
      ),
    );
    if (!blk)
      throw new Error(
        'S2 elemAdvantageDamagePct 20.41 block missing — fixture is stale',
      );
    blk.trigger = { kind: 'interval', sec: 5 };
  },
);

// ---- runs (hoisted: each is a full 180s sim) ---------------------------------------------------
const base = run();
const burstCastTrigger = run({
  'marciana-marine-study': marcianaBurstCastTrigger,
});
const noOwnBurstGate = run({
  'marciana-marine-study': marcianaNoOwnBurstGate,
});
const noStatusGate = run({ 'marciana-marine-study': marcianaNoStatusGate });
const flatWhistle = run({ 'marciana-marine-study': marcianaFlatWhistle });
const intervalElemAdv = run({
  'marciana-marine-study': marcianaIntervalElemAdv,
});
const fireBoss = run({}, 'Fire');

// ---- readers -----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const mmsDmg = (evs: SimEvent[], srcSlot: Damage['srcSlot'], atkPct: number) =>
  dmg(evs).filter(
    (d) =>
      d.slug === 'marciana-marine-study' &&
      d.srcSlot === srcSlot &&
      d.atkPct === atkPct,
  );
const mmsBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast =>
      e.kind === 'burstCast' && e.slug === 'marciana-marine-study',
  );

describe('marciana-marine-study — kit spec', () => {
  describe('M1 — S1 FB-enter nuke (3789.25% ATK) fires inside Full Burst, not at burstCast', () => {
    it('shipped: every 3789.25% S1 hit lands inFullBurst=true', () => {
      const hits = mmsDmg(base.events, 'skill1', 3789.25);
      expect(hits.length).toBeGreaterThan(0);
      expect(hits.every((h) => h.inFullBurst)).toBe(true);
    });

    it('DISCRIMINATING: burstCast trigger fires at least one hit with inFullBurst=false', () => {
      const hits = mmsDmg(burstCastTrigger.events, 'skill1', 3789.25);
      expect(hits.length).toBeGreaterThan(0);
      expect(hits.some((h) => !h.inFullBurst)).toBe(true);
    });

    it('ownBurstGate: nuke count === marciana burstCast count (not total FB count)', () => {
      const nukeCount = mmsDmg(base.events, 'skill1', 3789.25).length;
      const marcianaBurstCount = mmsBursts(base.events).length;
      const totalFBCount = base.events.filter(
        (e) => e.kind === 'fullBurstStart',
      ).length;
      expect(nukeCount).toBe(marcianaBurstCount);
      // two-B3 comp: marciana bursts on ~half the FBs
      expect(marcianaBurstCount).toBeLessThan(totalFBCount);
    });

    it('DISCRIMINATING: without ownBurstGate, nuke fires on EVERY FB (count === totalFBCount)', () => {
      const nukeCount = mmsDmg(noOwnBurstGate.events, 'skill1', 3789.25).length;
      const totalFBCount = noOwnBurstGate.events.filter(
        (e) => e.kind === 'fullBurstStart',
      ).length;
      expect(nukeCount).toBe(totalFBCount);
    });
  });

  describe('M2 — S1 20-hit rider (152.68% ATK) gated on High-Risk Target (post-burst only)', () => {
    it("shipped: every 152.68% S1 hit fires after marciana's first burstCast", () => {
      const firstBurst = mmsBursts(base.events)[0];
      expect(firstBurst).toBeDefined();
      const hits = mmsDmg(base.events, 'skill1', 152.68);
      expect(hits.length).toBeGreaterThan(0);
      expect(hits.every((h) => h.frame > firstBurst.frame)).toBe(true);
    });

    it('DISCRIMINATING: without requiresTargetStatus, at least one 152.68% hit fires before first burst', () => {
      const firstBurst = mmsBursts(noStatusGate.events)[0];
      const hits = mmsDmg(noStatusGate.events, 'skill1', 152.68);
      expect(hits.length).toBeGreaterThan(0);
      expect(hits.some((h) => !firstBurst || h.frame < firstBurst.frame)).toBe(
        true,
      );
    });
  });

  describe('M3 — Whistle stacks ramp 4→5 at t=5s (perResource, not flat)', () => {
    it('shipped baseAtk before t=5s < flatWhistle baseAtk before t=5s (4 vs 5 stacks)', () => {
      const shippedBefore = dmg(base.events).filter(
        (d) =>
          d.slug === 'marciana-marine-study' &&
          d.bucket === 'normal' &&
          d.sec < 5,
      );
      const flatBefore = dmg(flatWhistle.events).filter(
        (d) =>
          d.slug === 'marciana-marine-study' &&
          d.bucket === 'normal' &&
          d.sec < 5,
      );
      expect(shippedBefore.length).toBeGreaterThan(0);
      expect(flatBefore.length).toBeGreaterThan(0);
      const avg = (ds: Damage[]) =>
        ds.reduce((s, d) => s + d.baseAtk, 0) / ds.length;
      expect(avg(shippedBefore)).toBeLessThan(avg(flatBefore));
    });

    it('shipped baseAtk after t=5s ≈ flatWhistle baseAtk after t=5s (both at 5 stacks)', () => {
      const shippedAfter = dmg(base.events).filter(
        (d) =>
          d.slug === 'marciana-marine-study' &&
          d.bucket === 'normal' &&
          d.sec >= 6 &&
          d.sec < 10,
      );
      const flatAfter = dmg(flatWhistle.events).filter(
        (d) =>
          d.slug === 'marciana-marine-study' &&
          d.bucket === 'normal' &&
          d.sec >= 6 &&
          d.sec < 10,
      );
      expect(shippedAfter.length).toBeGreaterThan(0);
      expect(flatAfter.length).toBeGreaterThan(0);
      const avg = (ds: Damage[]) =>
        ds.reduce((s, d) => s + d.baseAtk, 0) / ds.length;
      // Both at 5 stacks after t=5s — within 1% (other buffs may differ slightly by frame)
      expect(
        Math.abs(avg(shippedAfter) - avg(flatAfter)) / avg(flatAfter),
      ).toBeLessThan(0.01);
    });
  });

  describe('M4 — S2 elemAdvantageDamagePct 20.41 is passive (active from frame 0)', () => {
    it('shipped: buffApply for 20.41 fires before frame 300 (t=5s)', () => {
      const buff = buffs(base.events).find(
        (b) =>
          b.stat === 'elemAdvantageDamagePct' &&
          b.value === 20.41 &&
          b.casterIdx === MARCIANA,
      );
      expect(buff).toBeDefined();
      expect(buff!.frame).toBeLessThan(300);
    });

    it('DISCRIMINATING: interval:5 first fires at frame ≥300', () => {
      const buff = buffs(intervalElemAdv.events).find(
        (b) =>
          b.stat === 'elemAdvantageDamagePct' &&
          b.value === 20.41 &&
          b.casterIdx === MARCIANA,
      );
      expect(buff).toBeDefined();
      expect(buff!.frame).toBeGreaterThanOrEqual(300);
    });
  });

  describe('M5 — burst applies elemAdvantageDamagePct 30.97% + attackDamagePct 27.45% for 10s', () => {
    it("both buffs fire at marciana's burstCast frame", () => {
      const burstFrame = mmsBursts(base.events)[0]?.frame;
      expect(burstFrame).toBeDefined();
      const elemBuff = buffs(base.events).find(
        (b) =>
          b.stat === 'elemAdvantageDamagePct' &&
          b.value === 30.97 &&
          b.casterIdx === MARCIANA,
      );
      const atkBuff = buffs(base.events).find(
        (b) =>
          b.stat === 'attackDamagePct' &&
          b.value === 27.45 &&
          b.casterIdx === MARCIANA,
      );
      expect(elemBuff).toBeDefined();
      expect(atkBuff).toBeDefined();
      expect(elemBuff!.frame).toBe(burstFrame);
      expect(atkBuff!.frame).toBe(burstFrame);
    });

    it('both buffs expire after 10s (durationSec=10 → expiresFrame = burstFrame+600)', () => {
      const burstFrame = mmsBursts(base.events)[0]?.frame;
      const elemBuff = buffs(base.events).find(
        (b) =>
          b.stat === 'elemAdvantageDamagePct' &&
          b.value === 30.97 &&
          b.casterIdx === MARCIANA,
      );
      const atkBuff = buffs(base.events).find(
        (b) =>
          b.stat === 'attackDamagePct' &&
          b.value === 27.45 &&
          b.casterIdx === MARCIANA,
      );
      expect(elemBuff!.expiresFrame).toBe(burstFrame! + 600);
      expect(atkBuff!.expiresFrame).toBe(burstFrame! + 600);
    });
  });

  describe('M6 — High-Risk Target (and thus S1 rider) is Electric-boss-only', () => {
    it('S1 152.68% rider fires vs Electric boss', () => {
      expect(mmsDmg(base.events, 'skill1', 152.68).length).toBeGreaterThan(0);
    });

    it('S1 152.68% rider does NOT fire vs Fire boss (no High-Risk Target)', () => {
      expect(mmsDmg(fireBoss.events, 'skill1', 152.68).length).toBe(0);
    });
  });
});
