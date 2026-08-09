// PER-UNIT KIT SPEC — `drake` (Drake, Attacker/SG/Fire, Burst III, cd 40s, ammo 9,
// hitsPerShot 10 pellets, reloadFrames 111). Kit-autonomy gauntlet 2026-07-25.
//
// One assertion group per KIT LINE (D1..D9 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against).
//
// Kit (blablalink prose, data/characters.json → characters.drake.skills):
//   S1 ■ entering Full Burst → all allies: Hit Rate ▲20.09% for 10 sec                      [D1]
//      ■ entering Full Burst → all allies: ATK ▲11.85% for 10 sec                           [D2]
//      ■ entering Full Burst → all SG allies: ATK ▲63.88% for 10 sec                        [D3]
//      ■ entering Full Burst → all SG allies: Max Ammo Capacity ▲50.14% for 10 sec           [D4]
//   S2 ■ after 10 attacks → 3 lowest-HP enemies: 98.55% of final ATK as damage              [D5]
//      ■ after 5 attacks → 1 lowest-HP enemy: 201.6% of final ATK as damage                 [D6]
//   BU ■ enemies in range: 3009.6% of final ATK as damage                                   [D7]
//      ■ self: Max Ammo Capacity ▲72.18% for 10 sec                                         [D8]
//      ■ self: Attack Damage ▲31.68% for 10 sec                                             [D9]
//
// Why each assertion discriminates:
//   D1  hitRatePct feeds acrForHR core rate — a buff-removed counterfactual produces zero
//       hitRatePct buffApply events; the shipped model produces them every FB enter.
//   D2  atkPct 11.85 hits all 4 allies — removing it drops every unit's total damage.
//   D3  alliesOfWeapon SG scopes the 63.88 ATK buff to SG wielders only. In the control comp
//       (liter SMG / crown MG / drake SG / helm SR) only drake is SG, so the buff targets
//       exactly 1 unit per FB enter. Counterfactual: target "allies" → 4 targets.
//   D4  Same scoping as D3 for maxAmmoPct 50.14.
//   D5  hitCount 10 with perPull:true = 10 trigger PULLS (the SG pull-vs-pellet lever).
//       Counterfactual: perPull:false (pellet-counter semantics) → 10× more nuke events.
//   D6  hitCount 5 with perPull:true = 5 pulls. Counterfactual: perPull:false → 10× more events.
//   D7  burst nuke atkPct 3009.6 (treasure). Counterfactual: 1254 (untreasured base).
//   D8  self-scoped maxAmmoPct 72.18 — targetIdx must be drake's slot only.
//   D9  self-scoped attackDamagePct 31.68 — targetIdx must be drake's slot only.
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / drake B3 / helm B3, boss Fire,
// focus drake). Deterministic (no seed). Drake is slot index 2.
//
// UNMODELED (inert in scope-lock, documented per protocol):
//   - S1 hitRatePct in-game core-hit-rate magnitude is unmeasured (⚑3 in override note);
//     the buff IS modeled and fires, but its damage contribution via acrForHR is unmeasured.
//   - S2 "3 lowest-HP enemies" targeting collapses to 1 instance on the partless boss.
//   - Burst maxAmmo window economy: the cap raise only pays out when a reload lands inside
//     the 10s window (⚑4); no instant ammo grant is assumed.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const DRAKE = 2; // slot index in controlComp('drake'): liter 0 / crown 1 / drake 2 / helm 3

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('drake'),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches ------------------------------------------------------------------

/** D3/D4 counterfactual: S1 SG-scoped blocks target ALL allies instead of SG-only. */
const drakeS1AllAllies = withPatchedOverride('drake', (ov) => {
  const sgBlock = ov.skill1.find(
    (b: any) => b.target?.kind === 'alliesOfWeapon'
  );
  if (!sgBlock) {
    throw new Error('drake S1 alliesOfWeapon block missing — fixture is stale');
  }
  sgBlock.target = { kind: 'allies' };
});

/** D5/D6 counterfactual: hitCount reads PELLET hits (perPull:false) instead of PULL hits. */
const drakeS2Pellets = withPatchedOverride('drake', (ov) => {
  for (const b of ov.skill2) {
    if (b.trigger?.kind !== 'hitCount') {
      continue;
    }
    b.trigger.perPull = false;
  }
});

/** D7 counterfactual: burst nuke at the UNTREASURED base magnitude 1254. */
const drakeBurstOld = withPatchedOverride('drake', (ov) => {
  const nuke = ov.burst.find((b: any) =>
    b.effects?.some((e: any) => e.kind === 'flatDamage' && e.atkPct === 3009.6)
  );
  if (!nuke) {
    throw new Error('drake burst 3009.6 nuke missing — fixture is stale');
  }
  nuke.effects.find((e: any) => e.kind === 'flatDamage').atkPct = 1254;
});

// ---- runs (hoisted: each is a full 180s sim) -------------------------------------------------
const base = run();
const s1All = run({ drake: drakeS1AllAllies });
const s2Pellets = run({ drake: drakeS2Pellets });
const burstOld = run({ drake: drakeBurstOld });

// ---- readers ---------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const drakeDamage = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  dmg(evs).filter((d) => d.slug === 'drake' && d.srcSlot === srcSlot);
const drakeShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'drake');
const drakeBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'drake'
  );

describe('drake — kit spec', () => {
  describe('D1 — S1 Hit Rate ▲20.09% on FB enter, all allies', () => {
    const applied = buffs(base.events).filter(
      (b) =>
        b.casterIdx === DRAKE && b.stat === 'hitRatePct' && b.value === 20.09
    );

    it('fires on every Full Burst enter, targeting all 4 allies for 10s', () => {
      expect(
        applied.length,
        'no hitRatePct 20.09 buff applied'
      ).toBeGreaterThan(0);
      const perFrame = new Map<number, Set<number | null>>();
      for (const b of applied) {
        (
          perFrame.get(b.frame) ??
          perFrame.set(b.frame, new Set()).get(b.frame)!
        ).add(b.targetIdx);
      }
      for (const [frame, holders] of perFrame) {
        expect(
          holders.size,
          `frame ${frame} reached ${holders.size} allies, expected 4`
        ).toBe(4);
      }
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });
  });

  describe('D2 — S1 ATK ▲11.85% on FB enter, all allies', () => {
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === DRAKE && b.stat === 'atkPct' && b.value === 11.85
    );

    it('fires on every FB enter, targeting all 4 allies for 10s', () => {
      expect(applied.length, 'no atkPct 11.85 buff applied').toBeGreaterThan(0);
      const perFrame = new Map<number, Set<number | null>>();
      for (const b of applied) {
        (
          perFrame.get(b.frame) ??
          perFrame.set(b.frame, new Set()).get(b.frame)!
        ).add(b.targetIdx);
      }
      for (const [frame, holders] of perFrame) {
        expect(
          holders.size,
          `frame ${frame} reached ${holders.size} allies, expected 4`
        ).toBe(4);
      }
    });
  });

  describe('D3 — S1 ATK ▲63.88% on FB enter, SG allies ONLY', () => {
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === DRAKE && b.stat === 'atkPct' && b.value === 63.88
    );

    it('targets ONLY drake (the sole SG in the comp), not all 4 allies', () => {
      expect(applied.length, 'no atkPct 63.88 buff applied').toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([DRAKE]);
    });

    it('DISCRIMINATING: an unscoped "allies" target would hit all 4', () => {
      const allAllies = buffs(s1All.events).filter(
        (b) => b.casterIdx === DRAKE && b.stat === 'atkPct' && b.value === 63.88
      );
      const targets = new Set(allAllies.map((b) => b.targetIdx));
      expect(
        targets.size,
        'counterfactual must hit 4 allies to prove discrimination'
      ).toBe(4);
    });
  });

  describe('D4 — S1 Max Ammo ▲50.14% on FB enter, SG allies ONLY', () => {
    const applied = buffs(base.events).filter(
      (b) =>
        b.casterIdx === DRAKE && b.stat === 'maxAmmoPct' && b.value === 50.14
    );

    it('targets ONLY drake (the sole SG in the comp)', () => {
      expect(
        applied.length,
        'no maxAmmoPct 50.14 buff applied'
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([DRAKE]);
    });
  });

  describe('D5 — S2 "after 10 attacks" nuke: 98.55% final ATK (hitCount 10 perPull = 10 pulls)', () => {
    const nukes = drakeDamage(base.events, 'skill2').filter(
      (d) => d.atkPct === 98.55
    );
    const pulls = drakeShots(base.events).length;

    it('fires approximately once per 10 pulls (perPull hitCount lever)', () => {
      expect(nukes.length, 'no 98.55% nukes landed').toBeGreaterThan(0);
      const expected = Math.floor(pulls / 10);
      // Allow ±1 for boundary alignment at fight start/end.
      expect(nukes.length).toBeGreaterThanOrEqual(expected - 1);
      expect(nukes.length).toBeLessThanOrEqual(expected + 1);
    });

    it('DISCRIMINATING: pellet-counter semantics (perPull:false) would produce ~10× more nukes', () => {
      const pelletNukes = drakeDamage(s2Pellets.events, 'skill2').filter(
        (d) => d.atkPct === 98.55
      );
      expect(pelletNukes.length).toBeGreaterThan(nukes.length * 5);
    });
  });

  describe('D6 — S2 "after 5 attacks" nuke: 201.6% final ATK (hitCount 5 perPull = 5 pulls)', () => {
    const nukes = drakeDamage(base.events, 'skill2').filter(
      (d) => d.atkPct === 201.6
    );
    const pulls = drakeShots(base.events).length;

    it('fires approximately once per 5 pulls (perPull hitCount lever)', () => {
      expect(nukes.length, 'no 201.6% nukes landed').toBeGreaterThan(0);
      const expected = Math.floor(pulls / 5);
      expect(nukes.length).toBeGreaterThanOrEqual(expected - 1);
      expect(nukes.length).toBeLessThanOrEqual(expected + 1);
    });

    it('DISCRIMINATING: pellet-counter semantics (perPull:false) would produce ~10× more nukes', () => {
      const pelletNukes = drakeDamage(s2Pellets.events, 'skill2').filter(
        (d) => d.atkPct === 201.6
      );
      expect(pelletNukes.length).toBeGreaterThan(nukes.length * 5);
    });
  });

  describe('D7 — burst nuke: 3009.6% final ATK (treasure), one per cast', () => {
    const nukes = drakeDamage(base.events, 'burst');
    const casts = drakeBursts(base.events).length;

    it('fires once per burst cast at the treasure magnitude', () => {
      expect(nukes.length).toBe(casts);
      expect(casts).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([3009.6]);
    });

    it('DISCRIMINATING: the untreasured base 1254 is a different magnitude', () => {
      const oldNukes = drakeDamage(burstOld.events, 'burst');
      expect([...new Set(oldNukes.map((d) => d.atkPct))]).toEqual([1254]);
    });
  });

  describe('D8 — burst self-buff: Max Ammo ▲72.18% for 10s', () => {
    const applied = buffs(base.events).filter(
      (b) =>
        b.casterIdx === DRAKE && b.stat === 'maxAmmoPct' && b.value === 72.18
    );

    it('fires once per burst cast, self-scoped, 10s duration', () => {
      expect(applied.length).toBe(drakeBursts(base.events).length);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([DRAKE]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });
  });

  describe('D9 — burst self-buff: Attack Damage ▲31.68% for 10s', () => {
    const applied = buffs(base.events).filter(
      (b) =>
        b.casterIdx === DRAKE &&
        b.stat === 'attackDamagePct' &&
        b.value === 31.68
    );

    it('fires once per burst cast, self-scoped, 10s duration', () => {
      expect(applied.length).toBe(drakeBursts(base.events).length);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([DRAKE]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });
  });
});
