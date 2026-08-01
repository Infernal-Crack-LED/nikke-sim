// PER-UNIT KIT SPEC — `noise` (Noise, RL / Supporter / Electric, Burst I, cd 40s, ammo 6,
// chargeFrames 60, chargeMultiplier 250). Kit-autonomy gauntlet 2026-07-31 (Tier 2). Test-first
// re-derivation; the override under test is src/skills/overrides/noise.json (authored this gauntlet
// — Noise had NO prior override; she could not sim at all before this run).
//
// Noise is a DEFENSIVE healer-buffer: her OWN RL damage is her only damage output, and EVERY skill
// line is survivability / team-preservation — Damage-Taken reduction, a taunt, Max-HP grants, and a
// heal. NONE of them scale damage she deals: she has NO atkOfMaxHpPct conversion (so Max-HP grants
// move no damage), the sim models no incoming ally damage (so Damage-Taken ▼ and the taunt are out
// of domain), and the heal restores HP the sim never spends. Her faithful encoding therefore models
// the lines the engine HAS a primitive for (the heal's recovery cadence + the Max-HP grants as
// kit-SSOT maxHpFlat events, exactly like blanc/flora) and documents the primitive-less lines
// (Damage-Taken ▼, taunt) as ⚑ unmodeled gaps. Her board DPS == her bare RL weapon.
//
// Kit (blablalink prose, data/characters.json → characters.noise.skills; magnitudes = max level):
//   S1 ■ when attacked 20×, all allies: Damage Taken ▼ 10.66% for 20 sec                 [N0 UNMODELED ⚑]
//   S2 ■ hitting a target with a Full Charge attack, the target: Taunts for 2 sec         [N0 UNMODELED ⚑]
//      ■ attacking with Full Charge, self: Max HP ▲ 24.86% for 1.8 sec                    [N1] (inert maxHpFlat)
//   BU ■ all allies: recovers 2.47% of caster final Max HP every 1s for 10 sec            [N2] (recovery cadence)
//      ■ all allies: Max HP ▲ 49.5% for 10 sec                                            [N3] (inert maxHpFlat)
//
// UNMODELED (documented in the override's `unmodeled` + `caveats`, NO assertion — spec rule for
// inert/out-of-domain lines; there is nothing to assert against in a no-incoming-damage sim):
//   N0a S1 Damage Taken ▼ 10.66% (allies, when attacked 20×) — the only `damageTakenPct` primitive
//       is a BOSS debuff (positive = boss takes MORE), the wrong direction/target entirely; v1 models
//       no incoming ally damage and no ally HP pool, so the "attacked 20×" trigger never fires and
//       "allies take less damage" has no effect. ⚑ engine-core / out-of-domain.
//   N0b S2 Taunt for 2 sec (the full-charge target) — aggro/targeting; the sim is single-target with
//       no aggro model and no `taunt` primitive. ⚑ inert / out-of-domain.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   N1  targetMaxHpPct (self Max-HP grant → engine maxHpFlat self-grant, INERT because Noise has no
//       atkOfMaxHpPct) vs the nearest wrong model atkPct (a 24.86% ATK self-buff that WOULD raise her
//       damage). Proven two ways: removing the line leaves every team total BYTE-IDENTICAL (inert),
//       AND swapping the stat to atkPct MOVES Noise's own total (so the shipped encoding is provably
//       the inert one, not a smuggled damage buff). Magnitude pinned to 24.86% of her final Max HP.
//   N2  the burst heal is a RECOVERY CADENCE, not a number: with crown's own self-heal removed, crown's
//       "when recovery takes effect" consumer stays refreshed across the FULL 10s after each Noise burst
//       (≥8 firings spanning ≥8s) — the ticks:10 heal-over-time shape. A nearest-wrong ticks:1 instant
//       heal collapses that to one firing per burst. (The 2.47% HP magnitude is not modeled — no HP
//       pool — only the per-second recovery cadence is, which is what recovery consumers key off.)
//   N3  targetMaxHpPct 49.5% → engine maxHpFlat to all allies, INERT (ally-granted Max HP does not feed
//       a teammate's atkOfMaxHpPct, e3 video rule; and Noise has no conversion herself). Proven: removing
//       it leaves every total BYTE-IDENTICAL; the level-1 value 27.22 produces a strictly smaller flat
//       grant (so 49.5 is the live magnitude). Reaches all three allies per cast for exactly 10s.
//
// Fixture: noise (B1) / crown (B2) / ada (B3), boss Fire, focus ada. One caster per burst stage → a
// clean Full Burst chain (noise→crown→ada) so Noise actually casts her burst (~4× in 180s). crown is the
// canonical recovery consumer (crown.test.ts / helm.test.ts / flora.test.ts pattern); ada is a heal-less
// carry (0 heal blocks) so crown's recovery consumer is driven ONLY by Noise once crown's own Relax
// self-heal is patched out. Deterministic (no seed); assertions read the event log + per-unit totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const FIGHT_FRAMES = 180 * FPS;
const SLUGS = ['noise', 'crown', 'ada'] as const;
const NOISE = 0;
const CROWN = 1;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [...SLUGS],
    bossElement: 'Fire',
    focusSlug: 'ada',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res), res };
}

// ---- counterfactual / isolation patches -------------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);
const hasHeal = (b: any) => b.effects.some((e: any) => e.kind === 'heal');

/** N1 reference: Noise's S2 self Max-HP block removed entirely. */
const noiseNoS2MaxHp = withPatchedOverride('noise', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'targetMaxHpPct'));
  if (ov.skill2.length === before) {
    throw new Error('noise S2 targetMaxHpPct block missing — fixture is stale');
  }
});
/** N1 counterfactual: the same line as a GENERIC atkPct self-buff (would raise her damage). */
const noiseS2Atk = withPatchedOverride('noise', (ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'targetMaxHpPct');
  if (!e) {
    throw new Error(
      'noise S2 targetMaxHpPct effect missing — fixture is stale'
    );
  }
  e.stat = 'atkPct';
});
/** N3 reference: Noise's burst Max-HP line removed (heal kept). */
const noiseNoBurstMaxHp = withPatchedOverride('noise', (ov) => {
  for (const b of ov.burst) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.stat !== 'targetMaxHpPct');
    if (b.effects.length !== before) {
      return;
    }
  }
  throw new Error(
    'noise burst targetMaxHpPct effect missing — fixture is stale'
  );
});
/** N3 counterfactual: level-1 value 27.22 instead of 49.5. */
const noiseBurstMaxHpWrong = withPatchedOverride('noise', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'targetMaxHpPct');
  if (!e) {
    throw new Error(
      'noise burst targetMaxHpPct effect missing — fixture is stale'
    );
  }
  e.value = 27.22;
});
/** N2 counterfactual: the burst heal as a single instant event (ticks:1) instead of a 10s HoT. */
const noiseBurstHealInstant = withPatchedOverride('noise', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'heal');
  if (!e) {
    throw new Error('noise burst heal effect missing — fixture is stale');
  }
  e.ticks = 1;
});
/** N2 isolation: remove crown's OWN Relax self-heal so Noise's burst heal is the only recovery
 *  source (mirrors flora's crownNoSelfHeal / helm's crownNoHeal). */
const crownNoSelfHeal = withPatchedOverride('crown', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasHeal(b));
  if (ov.skill2.length === before) {
    throw new Error('crown S2 self-heal block missing — fixture is stale');
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noS2MaxHp = run({ noise: noiseNoS2MaxHp });
const s2Atk = run({ noise: noiseS2Atk });
const noBurstMaxHp = run({ noise: noiseNoBurstMaxHp });
const burstMaxHpWrong = run({ noise: noiseBurstMaxHpWrong });
const isoBurstHeal = run({ crown: crownNoSelfHeal });
const burstHealInstant = run({
  noise: noiseBurstHealInstant,
  crown: crownNoSelfHeal,
});

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const noiseBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'noise'
  );
const noiseShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'noise');
/** Frames crown's recovery consumer fired (+20.99% Attack Damage), deduped per frame. */
const crownRecoveryFrames = (evs: SimEvent[]): number[] =>
  [
    ...new Set(
      buffs(evs)
        .filter(
          (b) =>
            b.casterIdx === CROWN &&
            b.stat === 'attackDamagePct' &&
            Math.abs(b.value - 20.99) < 0.01
        )
        .map((b) => b.frame)
    ),
  ].sort((a, b) => a - b);

const noiseMaxHp = unitOf(base.res, 'noise').maxHp;

describe('noise — kit spec', () => {
  describe('N1 — S2 self Max HP ▲ 24.86% on every full charge (inert maxHpFlat self-grant)', () => {
    // Engine converts targetMaxHpPct → maxHpFlat (flat HP = 24.86% of Noise's own maxHp). The S2
    // grant is a 1.8s SELF-buff (duration 108f); the burst Max-HP grant is a separate 10s (600f)
    // line handled in N3, so filter on the 1.8s duration to isolate S2.
    const applied = buffs(base.events).filter(
      (b) =>
        b.casterIdx === NOISE &&
        b.stat === 'maxHpFlat' &&
        b.targetIdx === NOISE &&
        b.expiresFrame! - b.frame === Math.round(1.8 * FPS)
    );

    it('fires once per full-charge rocket at 24.86% of her final Max HP', () => {
      const shots = noiseShots(base.events).length;
      expect(applied.length).toBeGreaterThan(0);
      expect(
        applied.length,
        `${applied.length} S2 grants vs ${shots} full-charge rockets`
      ).toBe(shots);
      const expected = (24.86 / 100) * noiseMaxHp;
      for (const b of applied) {
        expect(b.value).toBeCloseTo(expected, 3);
      }
    });

    it('is offensively INERT (no HP-scaling conversion → no team total changes)', () => {
      expect(base.totals).toEqual(noS2MaxHp.totals);
    });

    it('DISCRIMINATING: the nearest-wrong model (atkPct) WOULD move her damage', () => {
      // Proves the shipped line is the inert Max-HP grant, not a smuggled 24.86% ATK self-buff.
      expect(base.totals.noise).not.toBeCloseTo(s2Atk.totals.noise, 0);
    });
  });

  describe('N2 — burst heal keeps recovery consumers refreshed across the full 10s (ticks:10 HoT)', () => {
    // Isolated: crown's own Relax self-heal removed, so Noise's burst heal is the ONLY recovery source.
    // Only casts whose FULL 10s window fits inside the 180s fight are measurable (a property of the
    // fixture, not the kit — the last cast's window is truncated by fight end).
    const casts = noiseBursts(isoBurstHeal.events).filter(
      (c) => c.frame + 10 * FPS <= FIGHT_FRAMES
    );
    const frames = crownRecoveryFrames(isoBurstHeal.events);

    it('has Noise bursts with a complete window to measure', () => {
      expect(
        casts.length,
        'no Noise burst has a full 10s window inside the fight'
      ).toBeGreaterThan(0);
    });

    it("fires crown's consumer across the whole 10s after each cast (not a single instant)", () => {
      for (const cast of casts) {
        const inWindow = frames.filter(
          (f) => f >= cast.frame && f <= cast.frame + 10 * FPS
        );
        const spanSec = inWindow.length
          ? (inWindow[inWindow.length - 1] - cast.frame) / FPS
          : 0;
        expect(
          inWindow.length,
          `burst at ${cast.sec.toFixed(2)}s produced ${inWindow.length} recovery firing(s) ` +
            `spanning ${spanSec.toFixed(1)}s — a single instant heal produces exactly 1 at 0.0s`
        ).toBeGreaterThanOrEqual(8);
        expect(
          spanSec,
          'the window must reach ~10s, not collapse to the cast frame'
        ).toBeGreaterThanOrEqual(8);
      }
    });

    it('DISCRIMINATING: a ticks:1 instant heal collapses the cadence to ~1 firing per burst', () => {
      const instantFrames = crownRecoveryFrames(burstHealInstant.events);
      const instantInWindow = casts.reduce(
        (n, cast) =>
          n +
          instantFrames.filter(
            (f) => f >= cast.frame && f <= cast.frame + 10 * FPS
          ).length,
        0
      );
      const faithfulInWindow = casts.reduce(
        (n, cast) =>
          n +
          frames.filter((f) => f >= cast.frame && f <= cast.frame + 10 * FPS)
            .length,
        0
      );
      expect(
        faithfulInWindow,
        `${faithfulInWindow} faithful firings vs ${instantInWindow} instant — the HoT must ` +
          'produce far more recovery events than a single instant heal'
      ).toBeGreaterThan(instantInWindow * 3);
    });
  });

  describe('N3 — burst Max HP ▲ 49.5% to all allies for 10s (inert maxHpFlat)', () => {
    // Engine converts targetMaxHpPct → maxHpFlat (flat HP = 49.5% of EACH target's own maxHp). The
    // burst grant is the 10s (600f) line; the S2 self-grant is 1.8s (108f, handled in N1).
    const applied = buffs(base.events).filter(
      (b) =>
        b.casterIdx === NOISE &&
        b.stat === 'maxHpFlat' &&
        b.expiresFrame! - b.frame === 10 * FPS
    );

    it('reaches all three allies per burst cast for exactly 10 sec', () => {
      const casts = noiseBursts(base.events).length;
      expect(casts).toBeGreaterThan(0);
      expect(applied.length).toBe(casts * 3);
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
          `frame ${frame} reached ${holders.size} allies, expected 3`
        ).toBe(3);
      }
    });

    it('is 49.5% of each target’s own final Max HP', () => {
      const crownMaxHp = unitOf(base.res, 'crown').maxHp;
      const adaMaxHp = unitOf(base.res, 'ada').maxHp;
      const byTarget: Record<number, number> = {};
      for (const b of applied) {
        byTarget[b.targetIdx!] = b.value;
      }
      expect(byTarget[NOISE]).toBeCloseTo((49.5 / 100) * noiseMaxHp, 3);
      expect(byTarget[CROWN]).toBeCloseTo((49.5 / 100) * crownMaxHp, 3);
      expect(byTarget[2]).toBeCloseTo((49.5 / 100) * adaMaxHp, 3);
    });

    it('is offensively INERT (ally-granted Max HP feeds no conversion → no total changes)', () => {
      expect(base.totals).toEqual(noBurstMaxHp.totals);
    });

    it('DISCRIMINATING: level-1 value 27.22 produces a strictly smaller flat grant', () => {
      const wrong = buffs(burstMaxHpWrong.events).filter(
        (b) =>
          b.casterIdx === NOISE &&
          b.stat === 'maxHpFlat' &&
          b.expiresFrame! - b.frame === 10 * FPS
      );
      expect(wrong.length).toBeGreaterThan(0);
      expect(wrong[0].value).toBeLessThan(applied[0].value);
    });
  });
});
