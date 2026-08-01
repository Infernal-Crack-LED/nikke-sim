// PER-UNIT KIT SPEC — `rapunzel` (Rapunzel, the BASE Pilgrim healer — RL/Supporter/Iron, Burst I,
// cd 60s, ammo 6, chargeFrames 60; NOT rapunzel-pure-grace/rpg). Kit-autonomy gauntlet 2026-08-01.
//
// Rapunzel is a PURE sustain kit: every line is heal / Max HP / incoming-healing / resurrect / CC.
// She has ZERO damage lines and ZERO weapon-state modifiers, so in a DAMAGE sim her entire footprint
// is CROSS-UNIT: two recovery-event channels (S1 per full charge, burst per cast) that fire allies'
// 'recovery' triggers (Crown-type consumers), plus one offensively-inert Max HP grant. The faithfulness
// core is therefore a DAMAGE-NEUTRALITY proof (group N): with her override she must sim byte-identical
// to the bare weapon whenever no ally consumes her recovery events — the same machine-checkable core
// the clean-weapon basis pins (clean-weapons.test.ts CW1), applied to a unit outside the six.
//
// Kit (blablalink prose, data/characters.json → characters.rapunzel.skills):
//   S1 ■ performing a Full Charge attack → 3 lowest-HP% allies: recover 4.03% of caster final Max HP  [R1]
//   S2 ■ 2 highest-final-ATK allies: Max HP ▲8.19% for 15s                                            [S2]
//      ■ 2 highest-final-ATK allies: Incoming healing ▲13.65% for 15s   (UNMODELED — no StatKey/HP pool)
//   BU ■ all allies: recover 40.83% of caster final Max HP                                            [R2]
//      ■ 1 incapacitated highest-final-ATK ally: resurrect at 81.67% HP  (UNMODELED — ⚑ meta-defining)
//      ■ when an ally falls below 30% HP → all enemies: stun 1s          (UNMODELED — ⚑ status-gate)
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates nothing):
//   N   the override is byte-identical to the bare weapon (solo, bursts on; bare team, bursts off).
//       Proves the two heal channels are event-only (no HP amount) and the Max HP grant is inert (e3
//       rule: ally-granted maxHpFlat does not feed a teammate's atkOfMaxHpPct). A heal that secretly
//       carried a damage value, or a Max HP buff that fed ATK, would move a total here.
//   R1  S1's heal is an EVENT, not a number: it drives Crown's "when recovery takes effect" block at
//       Rapunzel's shot cadence (shotFired = one full charge per RL pull, helm/liberalio precedent).
//       Removing S1's heal collapses the recovery firings to burst-only — so the per-shot bulk is
//       attributable to S1, not to the burst or to Crown's own (stripped) Relax self-heal.
//   R2  the burst heal is a SECOND, distinct recovery channel: with S1 removed the residual firings
//       track the burst-cast count; removing the burst heal instead leaves the per-shot cadence intact.
//   S2  Max HP ▲8.19% lands as maxHpFlat on exactly the 2 highest-final-ATK allies, for 15s, at
//       (8.19/100)×target.maxHp — and removing it changes NO unit's damage (inert, e3 rule), the live
//       counterpart of the bare-team neutrality in N.
//
// Fixture: liter (B1) / crown (B2) / ada (B3 carry, focused) / rapunzel (B1), boss Fire — a real
// rotation so Rapunzel casts her burst. Crown's OWN Relax self-heal (skill2 hitCount:860) is stripped
// (crownNoHeal) so Rapunzel is the SOLE recovery source and every Crown consumer firing is attributable
// to her. liter's cover-HP "heal" is a ruled NO-OP (emits no recovery event) and ada's lifesteal is
// unmodeled, so neither leaks recovery events. Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import {
  bareWeaponOverride,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** Fixture slot order: liter 0 / crown 1 / ada 2 / rapunzel 3. */
const CROWN = 1;
const RAPUNZEL = 3;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

const realOverride = loadOverride('rapunzel');
if (!realOverride) {
  throw new Error('rapunzel: no override on disk — fixture is stale');
}

// ---- counterfactual / isolation patches -------------------------------------------------------
const hasHeal = (b: any) => b.effects.some((e: any) => e.kind === 'heal');
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** Strip Crown's own Relax self-heal so Rapunzel is the sole recovery source. */
const crownNoHeal = withPatchedOverride('crown', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasHeal(b));
  if (ov.skill2.length === before) {
    throw new Error('crown S2 self-heal block missing — fixture is stale');
  }
});
/** R2 isolation: Rapunzel's S1 full-charge heal removed (burst heal remains). */
const rapuNoS1Heal = withPatchedOverride('rapunzel', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasHeal(b));
  if (ov.skill1.length === before) {
    throw new Error('rapunzel S1 heal block missing — fixture is stale');
  }
});
/** R3 isolation: Rapunzel's burst heal removed (S1 heal remains). */
const rapuNoBurstHeal = withPatchedOverride('rapunzel', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasHeal(b));
  if (ov.burst.length === before) {
    throw new Error('rapunzel burst heal block missing — fixture is stale');
  }
});
/** S2 isolation: the Max HP grant removed. */
const rapuNoS2 = withPatchedOverride('rapunzel', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'targetMaxHpPct'));
  if (ov.skill2.length === before) {
    throw new Error(
      'rapunzel S2 targetMaxHpPct block missing — fixture is stale'
    );
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
function recoveryRun(rapuOverride: any) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: ['liter', 'crown', 'ada', 'rapunzel'],
    bossElement: 'Fire',
    focusSlug: 'ada',
    overrides: { crown: crownNoHeal, rapunzel: rapuOverride },
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, res, totals: totals(res) };
}

const base = recoveryRun(realOverride);
const noS1 = recoveryRun(rapuNoS1Heal);
const noBurst = recoveryRun(rapuNoBurstHeal);
const noS2 = recoveryRun(rapuNoS2);

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const rapuShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'rapunzel');
const rapuBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'rapunzel'
  );

/** Distinct frames Crown's recovery consumer fired (one firing = one frame, even though the block
 *  targets all allies and so emits one buffApply per holder). */
const recoveryFrames = (evs: SimEvent[]): number[] =>
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

// ===============================================================================================
// N — the faithfulness core: the kit is damage-neutral (no damage lines, no weapon-state mods)
// ===============================================================================================
describe('N — rapunzel override is damage-neutral (bare-weapon identity)', () => {
  it('solo, bursts ON: her own damage is byte-identical to the bare weapon', () => {
    const withKit = unitOf(
      runComp({
        slugs: ['rapunzel'],
        bossElement: 'Iron',
        overrides: { rapunzel: realOverride },
      }),
      'rapunzel'
    ).totalDamage;
    const bare = unitOf(
      runComp({
        slugs: ['rapunzel'],
        bossElement: 'Iron',
        overrides: { rapunzel: bareWeaponOverride('rapunzel') },
      }),
      'rapunzel'
    ).totalDamage;
    expect(
      withKit,
      'her burst heal + S2 Max HP must not move her own damage'
    ).toBe(bare);
    expect(withKit).toBeGreaterThan(0);
  });

  it('bare team, bursts OFF: she moves NO ally damage when no recovery consumer is present', () => {
    const team = (rapu: any) =>
      totals(
        runComp({
          slugs: ['rapunzel', 'folkwang', 'claire'],
          bossElement: 'Iron',
          overrides: {
            rapunzel: rapu,
            folkwang: bareWeaponOverride('folkwang'),
            claire: bareWeaponOverride('claire'),
          },
          cfg: { disableBursts: true },
        })
      );
    // Byte-identical for EVERY unit, not "close": her heal fires into the void (no consumer) and
    // her Max HP grant is inert (e3). A damage-touching mis-encoding would move a total here.
    expect(team(realOverride)).toEqual(team(bareWeaponOverride('rapunzel')));
  });
});

// ===============================================================================================
// R — the heal channels are real (recovery events), not silently dropped
// ===============================================================================================
describe('R — heals emit recovery events that drive a Crown-type consumer', () => {
  const shots = rapuShots(base.events).length;
  const bursts = rapuBursts(base.events).length;
  const baseFrames = recoveryFrames(base.events);

  it('fixture sanity: rapunzel full-charges and casts bursts', () => {
    expect(shots).toBeGreaterThan(50);
    expect(bursts).toBeGreaterThanOrEqual(1);
    // RL is a charge weapon: every trigger pull is a full charge, so shotFired == full charges
    // (the helm/liberalio precedent the S1 trigger rides). Pin it so the trigger read is honest.
    expect(
      rapuShots(base.events).filter((s) => s.charged).length,
      'an RL pull that is NOT a full charge would break the shotFired≈fullCharge read'
    ).toBe(shots);
  });

  it('R1 — S1 fires the consumer at her shot cadence (per full charge)', () => {
    expect(
      baseFrames.length,
      `${baseFrames.length} recovery firings vs ${shots} charged pulls / ${bursts} bursts — a ` +
        'burst-only trigger would land near the burst count'
    ).toBeGreaterThanOrEqual(Math.floor(shots * 0.9));
  });

  it('R2 — removing S1 collapses the firings to burst-only (S1 is the per-shot source)', () => {
    const frames = recoveryFrames(noS1.events);
    expect(
      frames.length,
      'with S1 gone, only the burst heal can fire the consumer'
    ).toBeLessThanOrEqual(bursts);
    expect(
      frames.length,
      'S1 is the dominant per-shot channel — removing it must collapse most firings'
    ).toBeLessThan(baseFrames.length * 0.5);
  });

  it('R3 — removing the burst heal leaves the per-shot cadence intact (a distinct 2nd channel)', () => {
    const frames = recoveryFrames(noBurst.events);
    expect(
      frames.length,
      'S1 alone still fires the consumer at shot cadence'
    ).toBeGreaterThanOrEqual(Math.floor(shots * 0.9));
  });

  it('R4 — burst heal is keyed to rapunzel OWN burstCast, not fullBurstEnter (two-B1 discrimination)', () => {
    // The fixture carries TWO Burst I units (liter + rapunzel); liter opens most rotations, so a
    // fullBurstEnter mis-keying would fire the burst heal on liter-only rotations — recovery frames
    // with NO rapunzel burstCast on them. With S1 removed the burst heal is the sole recovery source,
    // so every one of its firings must coincide exactly with a rapunzel burstCast frame.
    const castFrames = new Set(rapuBursts(noS1.events).map((c) => c.frame));
    const frames = recoveryFrames(noS1.events);
    expect(frames.length).toBeGreaterThan(0);
    for (const f of frames) {
      expect(
        castFrames.has(f),
        `recovery at frame ${f} has no rapunzel burstCast — a fullBurstEnter keying leaks liter's rotations`
      ).toBe(true);
    }
  });
});

// ===============================================================================================
// S2 — Max HP ▲8.19% on the 2 highest-final-ATK allies, inert (e3)
// ===============================================================================================
describe('S2 — Max HP grant is faithful and offensively inert', () => {
  const maxHpBuffs = buffs(base.events).filter(
    (b) => b.casterIdx === RAPUNZEL && b.stat === 'maxHpFlat'
  );

  it('fires on an interval and reaches exactly 2 allies per application', () => {
    expect(maxHpBuffs.length).toBeGreaterThan(0);
    const perFrame = new Map<number, Set<number | null>>();
    for (const b of maxHpBuffs) {
      (
        perFrame.get(b.frame) ?? perFrame.set(b.frame, new Set()).get(b.frame)!
      ).add(b.targetIdx);
    }
    for (const [frame, holders] of perFrame) {
      expect(
        holders.size,
        `frame ${frame} reached ${holders.size} allies, expected the 2 highest-final-ATK`
      ).toBe(2);
    }
  });

  it('is (8.19/100)×target.maxHp (targetMaxHpPct → maxHpFlat) for 15 sec', () => {
    for (const b of maxHpBuffs) {
      const targetMaxHp = base.res.units[b.targetIdx!].maxHp;
      expect(b.value).toBeCloseTo((8.19 / 100) * targetMaxHp, 6);
      expect(b.expiresFrame! - b.frame).toBe(15 * FPS);
    }
  });

  it('is inert: removing it changes NO unit damage, even in a live consumer team', () => {
    expect(base.totals).toEqual(noS2.totals);
  });
});
