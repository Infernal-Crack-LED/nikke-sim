// PER-UNIT KIT SPEC — `ark-ranger-black` (Ark Ranger Black, Attacker/AR/Wind, Burst III, cd 40s, ammo 60,
// hitsPerShot 1, chargeFrames 0). kit-autonomy gauntlet S2a (driver); Tier 2 (burstCast-vs-fullBurstEnter
// distinction + Transformation status-gate).
//
// Kit (blablalink prose, data/characters.json → characters.ark-ranger-black.skills):
//   S1 ■ start of battle → self: Damage to Parts ▲20% continuously                              [A1]
//      ■ ally/self destroys enemy part → self: Charges battery 50% up to 100%                   [UNMODELED]
//      ■ battery reaches 100% → self: Transformation (ATK ▲156.19% + battery drain 1%/0.2s)     [A3]
//      ■ after 30 normal attacks → self: Sustained Damage ▲59.6% for 5 sec                      [A4]
//   S2 ■ Transformation takes effect / enemy appears → all enemies: Ark Black Collider
//         45.87% final ATK sustained damage every 1s until Transformation canceled              [A5]
//      ■ entering Full Burst → all Wind Code allies with ARs: Sustained Damage ▲77.5% 10s       [A6]
//   BU ■ while in Transformation → self: Battery ▲50%                                           [UNMODELED]
//      ■ while NOT in Transformation → self: Emergency Charge Protocol (Battery ▲100% → ▼50%)   [A3 trigger]
//      ■ 1 enemy highest final max HP: 266.69% final ATK sustained damage every 1s for 10s      [A7]
//      ■ self: Sustained Damage ▲135.83% for 10 sec                                             [A8]
//
// BATTERY/TRANSFORMATION: in the scope-lock (partless boss), the battery starts at 0 and the ONLY charge
// source is the burst's Emergency Charge Protocol (Battery ▲100% → Transformation → Battery ▼50% → 50%
// remaining → drains at 1%/0.2s = 5%/s → Transformation lasts 10s). Burst CD 40s > Transformation 10s,
// so the 'while in Transformation: Battery ▲50%' branch NEVER fires. Effective model: every burst triggers
// a 10s Transformation window. 10s is DATAMINED from kit arithmetic (50% / 5%/s).
//
// Why each assertion discriminates:
//   A1  partsDamagePct is inert vs the partless scope-lock boss — removing it changes NO unit's total.
//   A3  burstCast NOT fullBurstEnter: the ATK ▲156.19% buff fires only on ark-ranger-black's own bursts
//       (~4 in 180s), NOT on every team Full Burst (~8). Counterfactual fullBurstEnter → double the count.
//   A4  hitCount:30 NOT passive: the sustainedDamagePct 59.6% buff first appears after 30 normal attacks
//       (~2.5s at 720 RPM), not from t=0. Counterfactual passive → buff present from frame 0.
//   A5  Ark Black Collider DoT: 45.87%/s ticks for exactly 10s after each burst (10 ticks/burst).
//       Counterfactual permanent DoT (no duration) → ticks for the whole fight.
//   A6  fullBurstEnter scoped to Wind AR allies: only ark-ranger-black (Wind/AR) receives the 77.5% buff;
//       liter (Fire/MG), crown (Fire/SMG), helm (Water/SR) do NOT. Counterfactual all-allies → all 4 buffed.
//   A7  burst DoT 266.69%/s: 10 ticks per burst, 10s duration, sustained flavor.
//   A8  burstCast self sustainedDamagePct 135.83% for 10s: fires on ark-ranger-black's bursts only.
//
// Fixture: controlComp('ark-ranger-black') = liter B1 / crown B2 / ark-ranger-black B3 / helm B3, boss Fire,
// focus ark-ranger-black (slot order liter 0 / crown 1 / ark-ranger-black 2 / helm 3). Two B3 units alternate
// bursts: ark-ranger-black at ~20s/60s/100s/140s, helm at ~40s/80s/120s/160s. Full Burst every ~20s.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** controlComp slot order: liter 0 / crown 1 / ark-ranger-black 2 / helm 3. */
const ARB = 2;
const N_ALLIES = 4;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('ark-ranger-black'),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches -------------------------------------------------------------------

/** A1 reference: partsDamagePct block removed. */
const arbNoParts = withPatchedOverride('ark-ranger-black', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !b.effects.some((e: any) => e.stat === 'partsDamagePct'),
  );
  if (ov.skill1.length === before)
    throw new Error(
      'ark-ranger-black S1 partsDamagePct block missing — fixture is stale',
    );
});

/** A3 counterfactual: ATK buff keyed to fullBurstEnter instead of burstCast (fires on every FB). */
const arbAtkFullBurst = withPatchedOverride('ark-ranger-black', (ov) => {
  const blk = ov.burst.find((b: any) =>
    b.effects.some(
      (e: any) => e.stat === 'atkPct' && Math.abs(e.value - 156.19) < 0.01,
    ),
  );
  if (!blk)
    throw new Error(
      'ark-ranger-black burst atkPct 156.19 block missing — fixture is stale',
    );
  blk.trigger = { kind: 'fullBurstEnter' };
});

/** A4 counterfactual: sustainedDamagePct 59.6% as a passive (always-on from t=0). */
const arbSustainedPassive = withPatchedOverride('ark-ranger-black', (ov) => {
  const blk = ov.skill1.find((b: any) =>
    b.effects.some(
      (e: any) =>
        e.stat === 'sustainedDamagePct' && Math.abs(e.value - 59.6) < 0.01,
    ),
  );
  if (!blk)
    throw new Error(
      'ark-ranger-black S1 sustainedDamagePct 59.6 block missing — fixture is stale',
    );
  blk.trigger = { kind: 'passive' };
  delete blk.effects[0].durationSec;
});

/** A5 counterfactual: Ark Black Collider DoT with a fight-long duration (permanent for 180s). */
const arbColliderPermanent = withPatchedOverride('ark-ranger-black', (ov) => {
  const blk = ov.burst.find((b: any) =>
    b.effects.some(
      (e: any) => e.kind === 'dot' && Math.abs(e.atkPct - 45.87) < 0.01,
    ),
  );
  if (!blk)
    throw new Error(
      'ark-ranger-black burst Ark Black Collider DoT block missing — fixture is stale',
    );
  const eff = blk.effects.find(
    (e: any) => e.kind === 'dot' && Math.abs(e.atkPct - 45.87) < 0.01,
  );
  eff.durationSec = 999;
});

/** A6 counterfactual: S2 sustainedDamagePct 77.5% targets all allies (not Wind AR scoped). */
const arbS2AllAllies = withPatchedOverride('ark-ranger-black', (ov) => {
  const blk = ov.skill2.find((b: any) =>
    b.effects.some(
      (e: any) =>
        e.stat === 'sustainedDamagePct' && Math.abs(e.value - 77.5) < 0.01,
    ),
  );
  if (!blk)
    throw new Error(
      'ark-ranger-black S2 sustainedDamagePct 77.5 block missing — fixture is stale',
    );
  blk.target = { kind: 'allies' };
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noParts = run({ 'ark-ranger-black': arbNoParts });
const atkFullBurst = run({ 'ark-ranger-black': arbAtkFullBurst });
const sustainedPassive = run({ 'ark-ranger-black': arbSustainedPassive });
const colliderPermanent = run({ 'ark-ranger-black': arbColliderPermanent });
const s2AllAllies = run({ 'ark-ranger-black': arbS2AllAllies });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const arbBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast =>
      e.kind === 'burstCast' && e.slug === 'ark-ranger-black',
  );
const arbShots = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Shot => e.kind === 'shot' && e.slug === 'ark-ranger-black',
  );
const fullBursts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart');

describe('ark-ranger-black — kit spec', () => {
  describe('A1 — S1 Damage to Parts ▲20% is exactly inert vs the partless boss', () => {
    it("removing it changes NO unit's total by a single point", () => {
      expect(base.totals).toEqual(noParts.totals);
    });
  });

  describe('A3 — Transformation ATK ▲156.19% is burstCast-triggered (NOT fullBurstEnter)', () => {
    const atkBuffs = buffs(base.events).filter(
      (b) =>
        b.casterIdx === ARB &&
        b.stat === 'atkPct' &&
        Math.abs(b.value - 156.19) < 0.01,
    );
    const bursts = arbBursts(base.events);
    const fbs = fullBursts(base.events);

    it('fires once per ark-ranger-black burst (not per Full Burst)', () => {
      expect(
        bursts.length,
        'ark-ranger-black must burst at least once',
      ).toBeGreaterThan(0);
      expect(
        atkBuffs.length,
        `${atkBuffs.length} ATK buff applications vs ${bursts.length} bursts / ${fbs.length} Full Bursts — ` +
          'fullBurstEnter would produce ~2× the burst count',
      ).toBe(bursts.length);
    });

    it('DISCRIMINATING: fullBurstEnter counterfactual produces more applications', () => {
      const cfBuffs = buffs(atkFullBurst.events).filter(
        (b) =>
          b.casterIdx === ARB &&
          b.stat === 'atkPct' &&
          Math.abs(b.value - 156.19) < 0.01,
      );
      expect(
        cfBuffs.length,
        'fullBurstEnter counterfactual must fire more often than burstCast',
      ).toBeGreaterThan(atkBuffs.length);
    });

    it('is self-scoped (only ark-ranger-black holds it)', () => {
      expect([...new Set(atkBuffs.map((b) => b.targetIdx))]).toEqual([ARB]);
    });

    it('lasts 10 sec (the Transformation duration)', () => {
      for (const b of atkBuffs) {
        expect(
          b.expiresFrame! - b.frame,
          'Transformation ATK buff must last 10s',
        ).toBe(10 * FPS);
      }
    });
  });

  describe('A4 — S1 Sustained Damage ▲59.6% fires after 30 normal attacks (hitCount:30, not passive)', () => {
    const sustBuffs = buffs(base.events).filter(
      (b) =>
        b.casterIdx === ARB &&
        b.stat === 'sustainedDamagePct' &&
        Math.abs(b.value - 59.6) < 0.01,
    );

    it('first appears after ~30 shots, not from frame 0', () => {
      expect(
        sustBuffs.length,
        'sustainedDamagePct 59.6% must fire at least once',
      ).toBeGreaterThan(0);
      const firstFrame = Math.min(...sustBuffs.map((b) => b.frame));
      const shots = arbShots(base.events);
      // 30 shots at 720 RPM (12/s) ≈ 2.5s = 150 frames; allow generous margin for reload timing
      expect(
        firstFrame,
        `first sustainedDamagePct 59.6% buff at frame ${firstFrame} — a passive would appear at frame 0`,
      ).toBeGreaterThan(60); // > 1 second — definitely not frame 0
    });

    it('DISCRIMINATING: passive counterfactual fires from frame 0', () => {
      const cfBuffs = buffs(sustainedPassive.events).filter(
        (b) =>
          b.casterIdx === ARB &&
          b.stat === 'sustainedDamagePct' &&
          Math.abs(b.value - 59.6) < 0.01,
      );
      const cfFirst = Math.min(...cfBuffs.map((b) => b.frame));
      expect(cfFirst, 'passive counterfactual must fire at frame 0').toBe(0);
    });

    it('lasts 5 sec per application', () => {
      for (const b of sustBuffs) {
        expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
      }
    });
  });

  describe('A5 — Ark Black Collider: 45.87%/s sustained DoT for 10s after each burst', () => {
    const colliderDmg = dmg(base.events).filter(
      (d) => d.slug === 'ark-ranger-black' && Math.abs(d.atkPct - 45.87) < 0.01,
    );
    const bursts = arbBursts(base.events);

    it('fires ~10 ticks per burst (1 tick/s × 10s)', () => {
      expect(bursts.length).toBeGreaterThan(0);
      expect(
        colliderDmg.length,
        'Ark Black Collider DoT must fire',
      ).toBeGreaterThan(0);
      // Each burst produces ~10 ticks; allow ±2 for fight-boundary truncation
      const perBurst = colliderDmg.length / bursts.length;
      expect(
        perBurst,
        `${colliderDmg.length} ticks / ${bursts.length} bursts = ${perBurst.toFixed(1)}/burst — expected ~10`,
      ).toBeGreaterThanOrEqual(8);
      expect(perBurst).toBeLessThanOrEqual(12);
    });

    it('DISCRIMINATING: permanent DoT counterfactual produces many more ticks', () => {
      const cfDmg = dmg(colliderPermanent.events).filter(
        (d) =>
          d.slug === 'ark-ranger-black' && Math.abs(d.atkPct - 45.87) < 0.01,
      );
      expect(
        cfDmg.length,
        'permanent DoT counterfactual must produce more ticks than the 10s window',
      ).toBeGreaterThan(colliderDmg.length);
    });

    it('lands in the burst bucket (burstCast-triggered DoT)', () => {
      expect([...new Set(colliderDmg.map((d) => d.bucket))]).toEqual(['burst']);
    });
  });

  describe('A6 — S2 Sustained Damage ▲77.5% on Full Burst entry, scoped to Wind AR allies', () => {
    const sustBuffs = buffs(base.events).filter(
      (b) => b.stat === 'sustainedDamagePct' && Math.abs(b.value - 77.5) < 0.01,
    );
    const fbs = fullBursts(base.events);

    it("fires on every Full Burst (not just ark-ranger-black's bursts)", () => {
      expect(fbs.length, 'must have Full Bursts').toBeGreaterThan(0);
      // One application per Full Burst per Wind AR ally (only ark-ranger-black is Wind AR)
      expect(
        sustBuffs.length,
        `${sustBuffs.length} applications vs ${fbs.length} Full Bursts — expected 1:1 (only ark-ranger-black is Wind AR)`,
      ).toBe(fbs.length);
    });

    it('reaches ONLY ark-ranger-black (the sole Wind AR ally in the control comp)', () => {
      const holders = new Set(sustBuffs.map((b) => b.targetIdx));
      expect(
        holders,
        `holders ${[...holders]} — liter(0)/crown(1)/helm(3) are NOT Wind AR`,
      ).toEqual(new Set([ARB]));
    });

    it('DISCRIMINATING: all-allies counterfactual buffs all 4 units', () => {
      const cfBuffs = buffs(s2AllAllies.events).filter(
        (b) =>
          b.stat === 'sustainedDamagePct' && Math.abs(b.value - 77.5) < 0.01,
      );
      const cfHolders = new Set(cfBuffs.map((b) => b.targetIdx));
      expect(
        cfHolders.size,
        'all-allies counterfactual must buff more than just ark-ranger-black',
      ).toBeGreaterThan(1);
    });

    it('lasts 10 sec', () => {
      for (const b of sustBuffs) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });
  });

  describe('A7 — burst DoT: 266.69%/s sustained damage for 10s on highest-HP enemy', () => {
    const burstDot = dmg(base.events).filter(
      (d) =>
        d.slug === 'ark-ranger-black' && Math.abs(d.atkPct - 266.69) < 0.01,
    );
    const bursts = arbBursts(base.events);

    it('fires ~10 ticks per burst (1 tick/s × 10s)', () => {
      expect(bursts.length).toBeGreaterThan(0);
      expect(burstDot.length, 'burst DoT must fire').toBeGreaterThan(0);
      const perBurst = burstDot.length / bursts.length;
      expect(
        perBurst,
        `${burstDot.length} ticks / ${bursts.length} bursts = ${perBurst.toFixed(1)}/burst — expected ~10`,
      ).toBeGreaterThanOrEqual(8);
      expect(perBurst).toBeLessThanOrEqual(12);
    });

    it('lands in the burst bucket (burstCast-triggered DoT)', () => {
      expect([...new Set(burstDot.map((d) => d.bucket))]).toEqual(['burst']);
    });
  });

  describe('A8 — burst Sustained Damage ▲135.83% for 10s, self-scoped, burstCast-triggered', () => {
    const sustBuffs = buffs(base.events).filter(
      (b) =>
        b.casterIdx === ARB &&
        b.stat === 'sustainedDamagePct' &&
        Math.abs(b.value - 135.83) < 0.01,
    );
    const bursts = arbBursts(base.events);

    it('fires once per ark-ranger-black burst', () => {
      expect(bursts.length).toBeGreaterThan(0);
      expect(sustBuffs.length).toBe(bursts.length);
    });

    it('is self-scoped', () => {
      expect([...new Set(sustBuffs.map((b) => b.targetIdx))]).toEqual([ARB]);
    });

    it('lasts 10 sec', () => {
      for (const b of sustBuffs) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });
  });
});
