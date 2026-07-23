// PER-UNIT KIT SPEC — `liter` (Liter, Supporter/SMG/Iron, Burst I, cd 20s, ammo 120,
// reloadFrames 111). TDD transition step 3; owner-driven spec review 2026-07-23.
//
// Kit (blablalink prose, data/characters.json → characters.liter.skills):
//   S1 ■ entering Full Burst → all allies. Effects vary by number of times entered; EACH
//        SUBSEQUENT EFFECT TRIGGERS ALL EFFECTS BEFORE IT:
//        Once: Burst CD ▼2.34s · Twice: ▼2.7s · Three times: ▼3.17s                        [L1]
//      ■ using Burst Skill → all allies, same escalation rule:
//        Once: Max Ammo ▲45.17% · Twice: Crit Damage ▲12.46% · Three times: ATK ▲14.42%,
//        5 sec each                                                                        [L2]
//   S2 ■ 2 allies with lowest cover HP: restores 52.5% of COVER HP                         [L3]
//   BU ■ all allies: ATK ▲66% for 5 sec                                                    [L4]
//
// WHY THIS FILE EXISTS EVEN THOUGH LITER READS 1.208 HOT: her kit has ZERO self-damage lines,
// so no assertion here can move that number — it lives in the shared SMG weapon model (SMG is the
// only class whose board mean is above 1.0). What this file protects is something the board cannot:
// L1 sets the WHOLE TEAM's rotation, so a regression in the escalation ladder changes full-burst
// counts board-wide, and rotation is graded by FB-count preservation, not by these ratios.
//
// L1 is pinned END-TO-END (owner ruling 2026-07-23 — verify the ladder against observed burst
// timings, don't trust the code path). Two independent instruments:
//   (a) EXACT ARITHMETIC on the one cooldown-bound interval in the fight. Liter's SECOND cast is
//       gated by her own cooldown, so its gap is exactly baseCD − (the FIRST tier alone). Every
//       later interval is rotation-bound (she is ready ~1.5s before the chain window lets her
//       cast), which is why the ladder's upper tiers are NOT readable from her gaps and need (b).
//   (b) DOSE-RESPONSE against three counterfactual ladders, each the nearest wrong reading:
//         no CDR         < flat 2.34 (never escalates)  < SHIPPED  < flat 8.21 (instant max)
//       on Full Burst count, and SHIPPED > flat 3.17 (the NON-CUMULATIVE misreading, where the
//       third tier replaces the earlier ones instead of adding to them) on total burst casts.
//       Ordering, not absolute counts — the mechanic is the ordering; the counts move with any
//       unrelated rotation change.
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / ada B3 / helm B3 — the SR/Water
// Helm, boss Fire, focus ada). Deterministic (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { controlComp, data, runComp, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const CARRY = 'ada';
/** controlComp slot order: liter 0 / crown 1 / ada 2 / helm 3. */
const LITER = 0;
const TEAM_SIZE = 4;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  runComp({ ...controlComp(CARRY), overrides, cfg: { onEvent: (e) => events.push(e) } });
  return events;
}

/** Replace her S1 Full-Burst-entry escalating CDR ladder with a FLAT per-FB value (or drop it). */
const cdrLadder = (seconds: number | null) =>
  withPatchedOverride('liter', (ov) => {
    const before = ov.skill1.length;
    if (seconds === null) {
      ov.skill1 = ov.skill1.filter((b: any) => b.trigger.kind !== 'fullBurstEnter');
      if (ov.skill1.length === before) throw new Error('liter S1 fullBurstEnter block missing — fixture is stale');
      return;
    }
    const blk = ov.skill1.find((b: any) => b.trigger.kind === 'fullBurstEnter');
    if (!blk) throw new Error('liter S1 fullBurstEnter block missing — fixture is stale');
    blk.effects = [{ kind: 'burstCdr', seconds }];
  });

/** L3 isolation: strip every OTHER recovery source in the comp, so any recovery firing left is
 *  attributable to liter's cover-HP restore — the regression this line exists to prevent. */
const stripHeals = (slug: string) =>
  withPatchedOverride(slug, (ov) => {
    for (const slot of ['skill1', 'skill2', 'burst'] as const) {
      ov[slot] = (ov[slot] ?? []).filter((b: any) => !b.effects.some((e: any) => e.kind === 'heal'));
    }
  });

const base = run();
const noCdr = run({ liter: cdrLadder(null) });
const flatTier1 = run({ liter: cdrLadder(2.34) });
const flatTier3Only = run({ liter: cdrLadder(3.17) });
const flatMax = run({ liter: cdrLadder(8.21) });
const noOtherHeals = run({ helm: stripHeals('helm'), crown: stripHeals('crown') });

const fbCount = (evs: SimEvent[]) => evs.filter((e) => e.kind === 'fullBurstStart').length;
const allCasts = (evs: SimEvent[]) => evs.filter((e): e is BurstCast => e.kind === 'burstCast');
const literCasts = (evs: SimEvent[]) => allCasts(evs).filter((c) => c.slug === 'liter');
const literBuffs = (evs: SimEvent[], stat: string, value?: number) =>
  evs.filter(
    (e): e is BuffApply =>
      e.kind === 'buffApply' &&
      e.casterIdx === LITER &&
      e.stat === stat &&
      (value === undefined || e.value === value),
  );

describe('liter — kit spec', () => {
  describe('L1 — S1 Full-Burst-entry burst-cooldown ladder (cumulative)', () => {
    it('EXACT: the first activation grants the FIRST TIER ALONE (2.34s), not the sum or the top tier', () => {
      // Her 2nd cast is the fight's one cooldown-bound interval: gap = baseCD − tier1.
      const casts = literCasts(base);
      expect(casts.length, 'liter never bursts twice').toBeGreaterThan(1);
      const gapFrames = casts[1].frame - casts[0].frame;
      const baseCd = data.characters.liter.burstCooldownSec * FPS;
      const tier1 = Math.round(2.34 * FPS);
      expect(
        gapFrames,
        `first cooldown ran ${(gapFrames / FPS).toFixed(3)}s; kit says ${data.characters.liter.burstCooldownSec}s ` +
          `− 2.34s = ${((baseCd - tier1) / FPS).toFixed(3)}s (the cumulative sum 5.04/8.21 would be shorter)`,
      ).toBe(baseCd - tier1);
    });

    it('ESCALATES past the first tier — more Full Bursts than a ladder stuck at 2.34s', () => {
      expect(fbCount(base)).toBeGreaterThan(fbCount(flatTier1));
      expect(fbCount(flatTier1)).toBeGreaterThan(fbCount(noCdr));
    });

    it('DISCRIMINATING: tiers ADD UP — beats a non-cumulative ladder that only ever grants 3.17s', () => {
      // "Each subsequent effect triggers all effects before it": the 3rd+ entry grants
      // 2.34+2.7+3.17 = 8.21s, NOT the third tier replacing the first two.
      expect(
        allCasts(base).length,
        'a non-cumulative reading would deliver strictly less cooldown reduction over the fight',
      ).toBeGreaterThan(allCasts(flatTier3Only).length);
    });

    it('RAMPS — the first two entries grant LESS than the saturated 8.21s', () => {
      expect(
        fbCount(base),
        'an instantly-saturated ladder buys an extra Full Burst the real ramp does not',
      ).toBeLessThan(fbCount(flatMax));
    });
  });

  describe('L2 — S1 burst-cast ladder: Max Ammo → +Crit Damage → +ATK, 5 sec, all allies', () => {
    const STEPS: Array<[string, number]> = [
      ['maxAmmoPct', 45.17],
      ['critDamagePct', 12.46],
      ['atkPct', 14.42],
    ];

    it('unlocks one more step per cast, cumulatively, and holds all three from the 3rd on', () => {
      const castFrames = literCasts(base).map((c) => c.frame);
      expect(castFrames.length, 'need at least 3 liter casts').toBeGreaterThanOrEqual(3);
      for (const [i, frame] of castFrames.entries()) {
        const live = STEPS.filter(([stat, value]) =>
          literBuffs(base, stat, value).some((b) => b.frame === frame),
        ).map(([stat]) => stat);
        const expected = STEPS.slice(0, Math.min(i + 1, 3)).map(([stat]) => stat);
        expect(live, `cast #${i + 1} at ${(frame / FPS).toFixed(2)}s`).toEqual(expected);
      }
    });

    it('fires on HER OWN casts only, never on an ally\'s burst', () => {
      const applyFrames = new Set(literBuffs(base, 'maxAmmoPct', 45.17).map((b) => b.frame));
      expect([...applyFrames].sort((a, b) => a - b)).toEqual(literCasts(base).map((c) => c.frame));
      expect(applyFrames.size, 'the whole team bursts far more often than liter alone').toBeLessThan(
        allCasts(base).length,
      );
    });

    it('reaches all four allies for exactly 5 sec', () => {
      for (const [stat, value] of STEPS) {
        const applied = literBuffs(base, stat, value);
        expect(applied.length, `${stat} never applied`).toBeGreaterThan(0);
        for (const b of applied) expect(b.expiresFrame! - b.frame, `${stat} duration`).toBe(5 * FPS);
        const perFrame = new Map<number, Set<number | null>>();
        for (const b of applied) {
          if (!perFrame.has(b.frame)) perFrame.set(b.frame, new Set());
          perFrame.get(b.frame)!.add(b.targetIdx);
        }
        for (const [frame, holders] of perFrame) {
          expect(holders.size, `${stat} at frame ${frame} reached ${holders.size} allies`).toBe(TEAM_SIZE);
        }
      }
    });
  });

  describe('L3 — S2 restores COVER HP: no recovery event, ever', () => {
    it('drives no recovery consumer once every other heal in the comp is removed', () => {
      // Modeling this as a unit heal fired crown's "when recovery takes effect → all allies Attack
      // Damage ▲20.99%" on every Full Burst and inflated the whole team (owner ruling 2026-07-21).
      const fired = noOtherHeals.filter(
        (e): e is BuffApply =>
          e.kind === 'buffApply' && e.stat === 'attackDamagePct' && e.value === 20.99,
      );
      expect(
        fired.map((b) => (b.frame / FPS).toFixed(2)),
        'a recovery consumer fired with liter as the only possible source',
      ).toEqual([]);
    });

    it('has the cover-HP line recorded as a deliberate omission, not silently dropped', () => {
      const unmodeled = JSON.stringify(
        (withPatchedOverride('liter', () => {}) as any).unmodeled.skill2,
      );
      expect(unmodeled).toContain('Cover HP');
    });
  });

  describe('L4 — burst: ATK ▲66% for 5 sec, all allies', () => {
    it('grants exactly 66% to all four allies for 5 sec, once per cast', () => {
      const applied = literBuffs(base, 'atkPct', 66);
      const frames = new Set(applied.map((b) => b.frame));
      expect([...frames].sort((a, b) => a - b)).toEqual(literCasts(base).map((c) => c.frame));
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
      expect(new Set(applied.map((b) => b.targetIdx)).size).toBe(TEAM_SIZE);
    });

    it('is a SEPARATE buff from her S1 ladder ATK step (14.42%), not a merged one', () => {
      // Same stat, same caster, different skill slot → distinct keys, so both are live at once.
      const keys = new Set([
        ...literBuffs(base, 'atkPct', 66).map((b) => b.key),
        ...literBuffs(base, 'atkPct', 14.42).map((b) => b.key),
      ]);
      expect(keys.size, 'the two ATK buffs must not share a buff key').toBeGreaterThan(1);
    });
  });
});
