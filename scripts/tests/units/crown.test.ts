// PER-UNIT KIT SPEC — `crown` (Crown, Defender/MG/Iron, Burst II, cd 20s, ammo 300,
// reloadFrames 171, hitsPerShot 1). kit-autonomy gauntlet S2a (driver tests).
//
// One assertion group per KIT LINE (C1..C9 below), asserted against the SHIPPED override.
// `withPatchedOverride` builds COUNTERFACTUALS (the nearest wrong model each assertion
// must discriminate against).
//
// Kit (data/characters.json → characters.crown.skills):
//   S1 ■ fullBurstEnter → burstCasters: casterAtkPct 64.51% (15s) + reloadSpeedPct 44.35% (15s)  [C1]
//      ■ fullBurstEnter → nonBurstCasters: defPct 37.44% (15s) + reloadSpeedPct 44.35% (15s)     [C2]
//   S2 ■ hitCount 860 (43 attacks × 20 stacks) → self: heal                                     [C6]
//      ■ recovery (when Crown receives a heal) → all allies: attackDamagePct 20.99% (7s)         [C7]
//      (Relax healing boost / Invulnerable / Taunt → UNMODELED, defensive)                        [C3-C5]
//   BU ■ burstCast → all allies: attackDamagePct 36.24% (15s)                                    [C8]
//      ■ burstCast → all allies: shield 10.45% of final Max HP (15s)                             [C9]
//
// Why each assertion discriminates:
//   C1  casterAtkPct (64.51% of CROWN's ATK, resolved to a flat value) vs generic atkPct
//       (% of each target's OWN ATK). Counterfactual: swap stat → damage numbers shift.
//   C2  DISJOINT targeting: burstCasters get casterAtkPct, nonBurstCasters get defPct.
//       No unit gets BOTH from Crown in the same FB chain. Counterfactual: merge both
//       blocks into one all-allies block → every unit gets casterAtkPct AND defPct.
//   C6  hitCount 860 (total across 20 stacks) vs 43 (per-stack). Structural pin on the
//       override encoding; the heal fires ONCE at 860, not 20 times at 43.
//   C7  recovery trigger (fires when Crown RECEIVES a heal) vs a fixed cadence.
//       Counterfactual: swap to interval → different timing pattern.
//   C8  burstCast (Crown's own burst) vs fullBurstEnter (any team FB).
//       Counterfactual: swap trigger → different timing.
//   C9  shield encoding: structural pin on maxHpPct 10.45 + durationSec 15.
//
// Fixture: controlComp('ada') = liter B1 / crown B2 / ada B3 / helm B3, boss Fire, focus ada.
// Crown is in the control core — she casts every FB chain. Deterministic (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const CARRY = 'ada';
/** controlComp slot order: liter 0 / crown 1 / ada 2 / helm 3. */
const CROWN_SLOT = 1;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp(CARRY),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { res, events, t: totals(res) };
}

// Hoisted runs: shipped override (the encoding under test).
const shipped = run();
const shippedBuffs = shipped.events.filter(
  (e): e is BuffApply => e.kind === 'buffApply',
);

describe('crown — S1 "One for All" (fullBurstEnter)', () => {
  // C1: burstCasters → casterAtkPct (resolved flat value) + reloadSpeedPct 44.35 (15s)
  it('C1: applies casterAtkPct to burst casters (casterIdx = crown)', () => {
    const casterAtkBuffs = shippedBuffs.filter(
      (e) => e.stat === 'casterAtkPct' && e.casterIdx === CROWN_SLOT,
    );
    // Crown's S1 fires every FB → at least one round of buffs.
    expect(casterAtkBuffs.length).toBeGreaterThanOrEqual(1);
    // The value is 64.51% of Crown's ATK resolved to a flat number — must be positive.
    for (const b of casterAtkBuffs) {
      expect(b.value).toBeGreaterThan(0);
    }
  });

  it('C1: applies reloadSpeedPct 44.35 alongside casterAtkPct', () => {
    const reloadBuffs = shippedBuffs.filter(
      (e) =>
        e.stat === 'reloadSpeedPct' &&
        Math.abs(e.value - 44.35) < 0.01 &&
        e.casterIdx === CROWN_SLOT,
    );
    expect(reloadBuffs.length).toBeGreaterThanOrEqual(1);
  });

  it('C1: casterAtkPct ≠ generic atkPct (counterfactual discrimination)', () => {
    // Counterfactual: swap casterAtkPct → atkPct. The damage delta must differ because
    // casterAtkPct uses CROWN's ATK (the caster), atkPct uses each target's OWN ATK.
    const cf = run({
      crown: withPatchedOverride('crown', (ov) => {
        for (const block of ov.skill1) {
          for (const eff of block.effects) {
            if (eff.stat === 'casterAtkPct') eff.stat = 'atkPct';
          }
        }
      }),
    });
    expect(cf.t[CARRY]).not.toBe(shipped.t[CARRY]);
  });

  // C2: nonBurstCasters → defPct 37.44 + reloadSpeedPct 44.35 (15s)
  it('C2: nonBurstCasters get defPct 37.44 (disjoint from burstCasters)', () => {
    // In the control comp, B3 units (ada, helm) sometimes miss a burst cast → they
    // become nonBurstCasters and receive defPct instead of casterAtkPct.
    const defBuffs = shippedBuffs.filter(
      (e) =>
        e.stat === 'defPct' &&
        Math.abs(e.value - 37.44) < 0.01 &&
        e.casterIdx === CROWN_SLOT,
    );
    // defPct events exist (B3 units miss some bursts).
    expect(defBuffs.length).toBeGreaterThanOrEqual(1);
    // DISJOINT: no target gets BOTH casterAtkPct AND defPct from Crown in the same FB.
    // (A unit is either a burstCaster or a nonBurstCaster, never both.)
    const casterAtkTargets = new Set(
      shippedBuffs
        .filter((e) => e.stat === 'casterAtkPct' && e.casterIdx === CROWN_SLOT)
        .map((e) => `${e.targetIdx}:${e.expiresFrame}`),
    );
    for (const d of defBuffs) {
      // A defPct target at the same expiry should NOT also have casterAtkPct.
      expect(casterAtkTargets.has(`${d.targetIdx}:${d.expiresFrame}`)).toBe(
        false,
      );
    }
  });

  it('C2: counterfactual — merging both blocks into all-allies changes damage', () => {
    // Counterfactual: make BOTH blocks target all allies (removing the disjoint split).
    // Every unit would get casterAtkPct AND defPct → damage shifts.
    const cf = run({
      crown: withPatchedOverride('crown', (ov) => {
        for (const block of ov.skill1) {
          block.target = { kind: 'allies' };
        }
      }),
    });
    expect(cf.t[CARRY]).not.toBe(shipped.t[CARRY]);
  });
});

describe('crown — S2 "Royal Attire" (Relax cycle + recovery)', () => {
  // C6: hitCount 860 → self-heal (structural pin on the encoding)
  it('C6: S2 heal trigger is hitCount 860 (43 attacks × 20 stacks)', () => {
    const ov = withPatchedOverride('crown', () => {});
    const healBlock = (ov as any).skill2.find(
      (b: any) => b.trigger?.kind === 'hitCount',
    );
    expect(healBlock).toBeDefined();
    expect(healBlock.trigger.count).toBe(860);
    expect(healBlock.target.kind).toBe('self');
    expect(healBlock.effects[0].kind).toBe('heal');
  });

  // C7: recovery → all allies → attackDamagePct 20.99% (7s)
  it('C7: recovery trigger grants team attackDamagePct 20.99', () => {
    const adBuffs = shippedBuffs.filter(
      (e) =>
        e.stat === 'attackDamagePct' &&
        Math.abs(e.value - 20.99) < 0.01 &&
        e.casterIdx === CROWN_SLOT,
    );
    // The recovery trigger fires when Crown receives a heal. In the control comp:
    // Crown's own S2 heal + helm's frequent heals → multiple recovery procs.
    expect(adBuffs.length).toBeGreaterThanOrEqual(1);
    // Targets all 4 allies.
    const targets = new Set(adBuffs.map((e) => e.targetIdx));
    expect(targets.size).toBe(4);
  });

  it('C7: recovery trigger ≠ fixed cadence (counterfactual discrimination)', () => {
    const cf = run({
      crown: withPatchedOverride('crown', (ov) => {
        for (const block of (ov as any).skill2) {
          if (block.trigger?.kind === 'recovery') {
            block.trigger = { kind: 'interval', intervalSec: 26 };
          }
        }
      }),
    });
    const cfAdBuffs = cf.events.filter(
      (e): e is BuffApply =>
        e.kind === 'buffApply' &&
        e.stat === 'attackDamagePct' &&
        Math.abs(e.value - 20.99) < 0.01 &&
        e.casterIdx === CROWN_SLOT,
    );
    const shippedAdBuffs = shippedBuffs.filter(
      (e) =>
        e.stat === 'attackDamagePct' &&
        Math.abs(e.value - 20.99) < 0.01 &&
        e.casterIdx === CROWN_SLOT,
    );
    // Count or timing must differ (recovery is heal-driven, not periodic).
    const countDiffers = cfAdBuffs.length !== shippedAdBuffs.length;
    const timingDiffers =
      cfAdBuffs.length > 0 &&
      shippedAdBuffs.length > 0 &&
      cfAdBuffs.some((b, i) => {
        const s = shippedAdBuffs[i];
        return s && Math.abs(b.frame - s.frame) > 60;
      });
    expect(countDiffers || timingDiffers).toBe(true);
  });
});

describe('crown — Burst "Last Kingdom" (burstCast)', () => {
  // C8: burstCast → all allies → attackDamagePct 36.24% (15s)
  it('C8: burst grants team attackDamagePct 36.24', () => {
    const adBuffs = shippedBuffs.filter(
      (e) =>
        e.stat === 'attackDamagePct' &&
        Math.abs(e.value - 36.24) < 0.01 &&
        e.casterIdx === CROWN_SLOT,
    );
    expect(adBuffs.length).toBeGreaterThanOrEqual(4);
    const targets = new Set(adBuffs.map((e) => e.targetIdx));
    expect(targets.size).toBe(4);
  });

  it('C8: burstCast ≠ fullBurstEnter (counterfactual discrimination)', () => {
    const cf = run({
      crown: withPatchedOverride('crown', (ov) => {
        for (const block of (ov as any).burst) {
          if (block.trigger?.kind === 'burstCast') {
            block.trigger = { kind: 'fullBurstEnter' };
          }
        }
      }),
    });
    const cfAdBuffs = cf.events.filter(
      (e): e is BuffApply =>
        e.kind === 'buffApply' &&
        e.stat === 'attackDamagePct' &&
        Math.abs(e.value - 36.24) < 0.01 &&
        e.casterIdx === CROWN_SLOT,
    );
    const shippedAdBuffs = shippedBuffs.filter(
      (e) =>
        e.stat === 'attackDamagePct' &&
        Math.abs(e.value - 36.24) < 0.01 &&
        e.casterIdx === CROWN_SLOT,
    );
    const countDiffers = cfAdBuffs.length !== shippedAdBuffs.length;
    const timingDiffers =
      cfAdBuffs.length > 0 &&
      shippedAdBuffs.length > 0 &&
      cfAdBuffs.some((b, i) => {
        const s = shippedAdBuffs[i];
        return s && Math.abs(b.frame - s.frame) > 30;
      });
    expect(countDiffers || timingDiffers).toBe(true);
  });

  // C9: burstCast → shield 10.45% of final Max HP (15s)
  it('C9: burst encodes shield with maxHpPct 10.45 (structural pin)', () => {
    const ov = withPatchedOverride('crown', () => {});
    const burstBlock = (ov as any).burst[0];
    const shieldEff = burstBlock.effects.find((e: any) => e.kind === 'shield');
    expect(shieldEff).toBeDefined();
    expect(shieldEff.maxHpPct).toBe(10.45);
    expect(shieldEff.durationSec).toBe(15);
  });
});

describe('crown — unmodeled lines (structural pins)', () => {
  it('C3-C5: Relax/Invulnerable/Taunt are documented in unmodeled', () => {
    const ov = withPatchedOverride('crown', () => {});
    const unmodeled = (ov as any).unmodeled?.skill2 ?? [];
    expect(unmodeled.length).toBe(3);
    const joined = unmodeled.join(' ');
    expect(joined).toContain('Relax');
    expect(joined).toContain('Invulnerable');
    expect(joined).toContain('Taunt');
  });
});
