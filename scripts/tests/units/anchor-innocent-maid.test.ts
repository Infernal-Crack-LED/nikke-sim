// PER-UNIT KIT SPEC — `anchor-innocent-maid` (Anchor: Innocent Maid, Supporter/RL/Water,
// Burst II, cd 40s, ammo 6, chargeFrames 60). Kit-autonomy gauntlet 2026-07-24.
//
// One assertion group per FAITHFUL kit line (L2, L4, L5, L6, L7, L9, L10 below), asserted
// against the SHIPPED override loaded from disk. `withPatchedOverride` appears only to build
// COUNTERFACTUALS (the nearest wrong model each assertion must discriminate against).
//
// UNMODELED lines (no assertion, documented here):
//   L1  S1 tier-1 "Potency of HP ▲ 30.96% for 5 sec" — heal-potency modifier; no engine
//       StatKey exists. Value-0 attackDamagePct placeholder in the override preserves
//       escalating tier order only. Inert.
//   L3  S1 tier-3 "Stack count of debuffs ▼ 1" — debuff cleanse; partless scope-lock boss
//       applies no modeled debuffs. Genuinely skippable class.
//   L8  Burst "Storage: stores excess healing … up to 60.19% Max HP, 25s" — self overheal
//       buffer; no engine vocabulary, no damage consumer. Deliberately NOT a shield event.
//
// Kit (data/characters.json → characters['anchor-innocent-maid'].skills):
//   S1 ■ fullBurstEnter, all allies, escalating Once/Twice/Thrice:
//        Once:  Potency of HP ▲ 30.96% for 5 sec                         [L1 UNMODELED]
//        Twice: Distributed Damage ▲ 30.4% for 10 sec                    [L2 FAITHFUL]
//        Thrice: Stack count of debuffs ▼ 1                              [L3 UNMODELED]
//      ■ fullBurstEnter (same-squad gate, teamHas.sameSquad — satisfied by mast-romantic-maid), all allies:
//        Recovers 3.04% Max HP every 1 sec for 8 sec                     [L4 FAITHFUL]
//   S2 ■ fullBurstEnd, all allies, escalating Once/Twice/Thrice:
//        Once:  Hit Rate ▲ 10.13% for 10 sec                             [L5 FAITHFUL]
//        Twice: ATK ▲ 35.02% of skill user's ATK for 10 sec              [L6 FAITHFUL]
//        Thrice: Reload Speed ▲ 40.04% for 15 sec                        [L7 FAITHFUL]
//   BU ■ burstCast, all allies:
//        Storage: 60.19% Max HP overheal buffer, 25s                     [L8 UNMODELED]
//        Recovers 40.18% Max HP as HP                                    [L9 FAITHFUL]
//        ATK ▲ 30.09% of skill user's ATK for 10 sec                     [L10 FAITHFUL]
//
// Why each assertion discriminates:
//   L2  distributedDamagePct is a Damage-Up rider for distributed-damage teammates; the
//       nearest wrong model is attackDamagePct (a flat damage buff). The two produce
//       different team totals. Also: escalating tier 2 means it must NOT appear on FB1.
//   L4  heal ticks:8 fires 8 recovery events per FB (1/s for 8s). The nearest wrong model
//       is ticks:1 (a single instant heal). Crown's recovery consumer counts the firings.
//   L5  hitRatePct 10.13/10s on every FB-end. Nearest wrong: absent or wrong value.
//   L6  casterAtkPct (flat add of HER Supporter ATK) ≠ atkPct (pct of target's ATK).
//       Escalating tier 2: must NOT appear on FB1-end.
//   L7  reloadSpeedPct 40.04/15s. Escalating tier 3: must NOT appear on FB1-end or FB2-end.
//   L9  burst heal fires a recovery event at the burstCast frame (before FB opens).
//   L10 casterAtkPct 30.09/10s on every burstCast. Nearest wrong: atkPct.
//
// Fixture: liter (B1) / anchor-innocent-maid (B2) / crown (B2, S2 heal removed) / ada (B3) /
// mast-romantic-maid (B2) — her squadmate, satisfying the L4 same-squad gate.
// Boss Fire (Water advantage for anchor-innocent-maid). Focus ada.
// Crown's S2 heal removed so her recovery consumer is driven ONLY by anchor-innocent-maid's
// heal events (S1 ticks + burst heal). Deterministic (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
/** Slot indices in the fixture comp. */
const AIM = 1; // anchor-innocent-maid
const CROWN = 2; // crown (recovery consumer)

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type FullBurstStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;
type FullBurstEnd = Extract<SimEvent, { kind: 'fullBurstEnd' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [
      'liter',
      'anchor-innocent-maid',
      'crown',
      'ada',
      'mast-romantic-maid',
    ],
    bossElement: 'Fire',
    focusSlug: 'ada',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

/** Same fixture minus her squadmate — proves the L4 sameSquad gate fails closed. */
function runNoSquadmate(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: ['liter', 'anchor-innocent-maid', 'crown', 'ada'],
    bossElement: 'Fire',
    focusSlug: 'ada',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual / isolation patches -------------------------------------------------------
const hasHeal = (b: any) => b.effects.some((e: any) => e.kind === 'heal');

/** L2 counterfactual: distributedDamagePct → attackDamagePct (wrong stat). */
const aimDistributedAsAtkDmg = withPatchedOverride(
  'anchor-innocent-maid',
  (ov) => {
    const e = ov.skill1
      .flatMap((b: any) => b.effects.flatMap((x: any) => x.steps ?? [x]))
      .find((x: any) => x.stat === 'distributedDamagePct');
    if (!e) {
      throw new Error(
        'anchor-innocent-maid S1 distributedDamagePct missing — fixture stale'
      );
    }
    e.stat = 'attackDamagePct';
  }
);

/** L4 counterfactual: heal ticks:8 → ticks:1 (single instant heal). */
const aimHealSingleTick = withPatchedOverride('anchor-innocent-maid', (ov) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'heal');
  if (!e) {
    throw new Error('anchor-innocent-maid S1 heal missing — fixture stale');
  }
  e.ticks = 1;
  delete e.intervalSec;
});

/** L6 counterfactual: S2 casterAtkPct 35.02 → atkPct (wrong stat). */
const aimS2AtkAsAtkPct = withPatchedOverride('anchor-innocent-maid', (ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects.flatMap((x: any) => x.steps ?? [x]))
    .find((x: any) => x.stat === 'casterAtkPct' && x.value === 35.02);
  if (!e) {
    throw new Error(
      'anchor-innocent-maid S2 casterAtkPct 35.02 missing — fixture stale'
    );
  }
  e.stat = 'atkPct';
});

/** L10 counterfactual: burst casterAtkPct 30.09 → atkPct (wrong stat). */
const aimBurstAtkAsAtkPct = withPatchedOverride(
  'anchor-innocent-maid',
  (ov) => {
    const e = ov.burst
      .flatMap((b: any) => b.effects)
      .find((x: any) => x.stat === 'casterAtkPct' && x.value === 30.09);
    if (!e) {
      throw new Error(
        'anchor-innocent-maid burst casterAtkPct 30.09 missing — fixture stale'
      );
    }
    e.stat = 'atkPct';
  }
);

/** Crown S2 heal removed — isolates anchor-innocent-maid as the only recovery source. */
const crownNoHeal = withPatchedOverride('crown', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasHeal(b));
  if (ov.skill2.length === before) {
    throw new Error('crown S2 heal block missing — fixture stale');
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run({ crown: crownNoHeal });
const noSquadmate = runNoSquadmate({ crown: crownNoHeal });
const distributedAsAtkDmg = run({
  crown: crownNoHeal,
  'anchor-innocent-maid': aimDistributedAsAtkDmg,
});
const healSingleTick = run({
  crown: crownNoHeal,
  'anchor-innocent-maid': aimHealSingleTick,
});
const s2AtkAsAtkPct = run({
  crown: crownNoHeal,
  'anchor-innocent-maid': aimS2AtkAsAtkPct,
});
const burstAtkAsAtkPct = run({
  crown: crownNoHeal,
  'anchor-innocent-maid': aimBurstAtkAsAtkPct,
});

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const bursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast');
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e): e is FullBurstStart => e.kind === 'fullBurstStart');
const fbEnds = (evs: SimEvent[]) =>
  evs.filter((e): e is FullBurstEnd => e.kind === 'fullBurstEnd');

/** Buffs applied by anchor-innocent-maid (casterIdx === AIM). */
const aimBuffs = (evs: SimEvent[], stat: string, value?: number) =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === AIM &&
      b.stat === stat &&
      (value === undefined || b.value === value)
  );

/** Crown's recovery consumer firings (attackDamagePct 20.99, casterIdx === CROWN).
 *  Returns distinct frames (one firing per frame even though it targets all allies). */
const crownRecoveryFrames = (evs: SimEvent[]): number[] =>
  [
    ...new Set(
      buffs(evs)
        .filter(
          (b) =>
            b.casterIdx === CROWN &&
            b.stat === 'attackDamagePct' &&
            b.value === 20.99
        )
        .map((b) => b.frame)
    ),
  ].sort((a, b) => a - b);

/** Assign a FB ordinal (1-based) to a frame by counting fullBurstStart events at or before it. */
function fbOrdinal(evs: SimEvent[], frame: number): number {
  return fbStarts(evs).filter((f) => f.frame <= frame).length;
}

/** Assign a FB-end ordinal (1-based) to a frame by counting fullBurstEnd events at or before it. */
function fbEndOrdinal(evs: SimEvent[], frame: number): number {
  return fbEnds(evs).filter((f) => f.frame <= frame).length;
}

describe('anchor-innocent-maid — kit spec', () => {
  describe('L2 — S1 tier-2 Distributed Damage ▲ 30.4% for 10 sec (escalating, fires from FB2)', () => {
    const applied = aimBuffs(base.events, 'distributedDamagePct', 30.4);

    it('is applied with value 30.4 and 10s duration', () => {
      expect(
        applied.length,
        'no distributedDamagePct buff was applied'
      ).toBeGreaterThan(0);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('does NOT appear on FB1 (escalating tier 2 — fires from the 2nd activation)', () => {
      const onFb1 = applied.filter(
        (b) => fbOrdinal(base.events, b.frame) === 1
      );
      expect(
        onFb1.map((b) => b.frame),
        'distributedDamagePct must not fire on FB1'
      ).toEqual([]);
    });

    it('DOES appear from FB2 onward', () => {
      const fromFb2 = applied.filter(
        (b) => fbOrdinal(base.events, b.frame) >= 2
      );
      expect(
        fromFb2.length,
        'distributedDamagePct must fire from FB2 onward'
      ).toBeGreaterThan(0);
    });

    it('DISCRIMINATING: attackDamagePct (wrong stat) changes team damage totals', () => {
      expect(base.totals).not.toEqual(distributedAsAtkDmg.totals);
    });
  });

  describe('L4 — S1 block-B heal: 8 recovery events per FB (1/s for 8s)', () => {
    const fbStartFrames = fbStarts(base.events).map((f) => f.frame);
    const recoveryFrames = crownRecoveryFrames(base.events);

    it('has Full Bursts to measure', () => {
      expect(fbStartFrames.length).toBeGreaterThan(0);
    });

    it('fires 8 recovery events per FB (not 1 — the ticks:8 cadence)', () => {
      for (const fbFrame of fbStartFrames) {
        // Count recovery firings in the 8s window after this FB start.
        // The burst heal also fires near this time (at burstCast, just before FB start),
        // so we look at the window [fbFrame, fbFrame + 8*FPS] for the S1 tick train.
        const inWindow = recoveryFrames.filter(
          (f) => f >= fbFrame && f <= fbFrame + 8 * FPS
        );
        expect(
          inWindow.length,
          `FB at frame ${fbFrame}: expected 8 S1 heal ticks in the 8s window, got ${inWindow.length}`
        ).toBeGreaterThanOrEqual(8);
      }
    });

    it('DISCRIMINATING: no same-squad ally on the team suppresses the S1 tick train (sameSquad gate is real, not always-satisfied)', () => {
      const noSquadmateFbStarts = fbStarts(noSquadmate.events).map(
        (f) => f.frame
      );
      const noSquadmateRecoveryFrames = crownRecoveryFrames(noSquadmate.events);
      expect(noSquadmateFbStarts.length).toBeGreaterThan(0);
      for (const fbFrame of noSquadmateFbStarts) {
        const inWindow = noSquadmateRecoveryFrames.filter(
          (f) => f >= fbFrame && f <= fbFrame + 8 * FPS
        );
        // Only the burst heal (L9, 1 event) can land in this window without a
        // squadmate — the S1 8-tick train is gated off.
        expect(
          inWindow.length,
          `FB at frame ${fbFrame} with no squadmate: expected < 8 recovery firings (S1 gated off), got ${inWindow.length}`
        ).toBeLessThan(8);
      }
    });

    it('DISCRIMINATING: ticks:1 (single instant heal) produces far fewer recovery firings', () => {
      const singleTickFrames = crownRecoveryFrames(healSingleTick.events);
      // With ticks:1, each FB produces 1 S1 recovery firing (plus 1 burst heal).
      // With ticks:8, each FB produces 8 S1 recovery firings (plus 1 burst heal).
      // Total over the fight: singleTick should be much less than base.
      expect(
        singleTickFrames.length,
        `ticks:1 produced ${singleTickFrames.length} firings vs ticks:8 ${recoveryFrames.length}`
      ).toBeLessThan(recoveryFrames.length);
    });
  });

  describe('L5 — S2 tier-1 Hit Rate ▲ 10.13% for 10 sec (every FB-end)', () => {
    const applied = aimBuffs(base.events, 'hitRatePct', 10.13);

    it('is applied with value 10.13 and 10s duration on every FB-end', () => {
      expect(applied.length, 'no hitRatePct buff was applied').toBeGreaterThan(
        0
      );
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('appears on FB1-end (escalating tier 1 — fires from the 1st activation)', () => {
      const onFb1End = applied.filter(
        (b) => fbEndOrdinal(base.events, b.frame) === 1
      );
      expect(
        onFb1End.length,
        'hitRatePct must fire on FB1-end'
      ).toBeGreaterThan(0);
    });
  });

  describe("L6 — S2 tier-2 ATK ▲ 35.02% of skill user's ATK for 10 sec (casterAtkPct, from FB2-end)", () => {
    // casterAtkPct value in the event log is the computed FLAT ATK add (pct/100 × casterATK),
    // not the raw percentage. We identify the S2 buff by its larger magnitude (35.02% > 30.09%).
    const allCasterAtk = aimBuffs(base.events, 'casterAtkPct');
    // The S2 buff (35.02%) produces a larger flat value than the burst buff (30.09%).
    const s2Value = Math.max(...allCasterAtk.map((b) => b.value));
    const applied = allCasterAtk.filter((b) => b.value === s2Value);

    it('is applied as casterAtkPct (not atkPct) with 10s duration', () => {
      expect(
        applied.length,
        'no S2 casterAtkPct buff was applied'
      ).toBeGreaterThan(0);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('does NOT appear on FB1-end (escalating tier 2 — fires from the 2nd activation)', () => {
      const onFb1End = applied.filter(
        (b) => fbEndOrdinal(base.events, b.frame) === 1
      );
      expect(
        onFb1End.map((b) => b.frame),
        'S2 casterAtkPct must not fire on FB1-end'
      ).toEqual([]);
    });

    it('DOES appear from FB2-end onward', () => {
      const fromFb2End = applied.filter(
        (b) => fbEndOrdinal(base.events, b.frame) >= 2
      );
      expect(
        fromFb2End.length,
        'S2 casterAtkPct must fire from FB2-end onward'
      ).toBeGreaterThan(0);
    });

    it('DISCRIMINATING: atkPct (wrong stat) changes team damage totals', () => {
      expect(base.totals).not.toEqual(s2AtkAsAtkPct.totals);
    });
  });

  describe('L7 — S2 tier-3 Reload Speed ▲ 40.04% for 15 sec (escalating, from FB3-end)', () => {
    const applied = aimBuffs(base.events, 'reloadSpeedPct', 40.04);

    it('is applied with value 40.04 and 15s duration', () => {
      expect(
        applied.length,
        'no reloadSpeedPct buff was applied'
      ).toBeGreaterThan(0);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(15 * FPS);
      }
    });

    it('does NOT appear on FB1-end or FB2-end (escalating tier 3)', () => {
      const early = applied.filter(
        (b) => fbEndOrdinal(base.events, b.frame) <= 2
      );
      expect(
        early.map((b) => b.frame),
        'reloadSpeedPct must not fire on FB1-end or FB2-end'
      ).toEqual([]);
    });

    it('DOES appear from FB3-end onward', () => {
      const fromFb3End = applied.filter(
        (b) => fbEndOrdinal(base.events, b.frame) >= 3
      );
      expect(
        fromFb3End.length,
        'reloadSpeedPct must fire from FB3-end onward'
      ).toBeGreaterThan(0);
    });
  });

  describe('L9 — burst heal fires a recovery event at the burstCast frame (before FB opens)', () => {
    const aimBursts = bursts(base.events).filter(
      (b) => b.slug === 'anchor-innocent-maid'
    );
    const recoveryFrames = crownRecoveryFrames(base.events);

    it('anchor-innocent-maid casts her burst', () => {
      expect(
        aimBursts.length,
        'no burst casts from anchor-innocent-maid'
      ).toBeGreaterThan(0);
    });

    it('fires a recovery event at each burstCast frame (before the FB window opens)', () => {
      for (const cast of aimBursts) {
        // The burst heal fires at the burstCast frame. Crown's recovery consumer should
        // fire at or very near that frame (same frame or within a few frames).
        const nearCast = recoveryFrames.filter(
          (f) => f >= cast.frame - 2 && f <= cast.frame + 2
        );
        expect(
          nearCast.length,
          `burst at frame ${cast.frame}: no recovery firing near the burstCast frame`
        ).toBeGreaterThan(0);
      }
    });
  });

  describe("L10 — burst ATK ▲ 30.09% of skill user's ATK for 10 sec (casterAtkPct, every burstCast)", () => {
    // casterAtkPct value in the event log is the computed FLAT ATK add (pct/100 × casterATK).
    // The burst buff (30.09%) produces a smaller flat value than the S2 buff (35.02%).
    const allCasterAtk = aimBuffs(base.events, 'casterAtkPct');
    const burstValue = Math.min(...allCasterAtk.map((b) => b.value));
    const applied = allCasterAtk.filter((b) => b.value === burstValue);
    const aimBursts = bursts(base.events).filter(
      (b) => b.slug === 'anchor-innocent-maid'
    );

    it('is applied as casterAtkPct (not atkPct) with 10s duration', () => {
      expect(
        applied.length,
        'no burst casterAtkPct buff was applied'
      ).toBeGreaterThan(0);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('fires once per burst cast', () => {
      // Each burst cast applies the buff to all 4 allies → 4 buffApply events per cast.
      // Count distinct frames.
      const distinctFrames = [...new Set(applied.map((b) => b.frame))];
      expect(distinctFrames.length).toBe(aimBursts.length);
    });

    it('DISCRIMINATING: atkPct (wrong stat) changes team damage totals', () => {
      expect(base.totals).not.toEqual(burstAtkAsAtkPct.totals);
    });
  });
});
