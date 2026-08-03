// PER-UNIT KIT SPEC — `soline` (Soline, Attacker/SMG/Iron, Burst III, cd 40s). Kit-autonomy
// gauntlet 2026-08-03 (test-first re-derivation). ⚠ EXACT SLUG: BASE soline (SMG/Iron/B3) —
// NOT soline-frost-ticket (SG/Water/B1); shared base name, entirely different kit.
// NOTE: this is a FROM-SCRATCH unit — there was no shipped override before this gauntlet
// (simSupported was false), so the harness cannot even load her until
// src/skills/overrides/soline.json exists. The override was authored first (the faithful
// encoding under test); every assertion below PINS a kit line GREEN vs that override and RED
// vs the nearest-wrong counterfactual (withPatchedOverride), so the file still discriminates
// exactly as a verification gauntlet would.
//
// Kit (blablalink prose, data/characters.json → characters.soline.skills), max level:
//   S1 ■ Activates after 40 normal attacks. Affects self.
//        Attack Speed ▲ 7.26% for 3 sec.                                            [L1]
//   S2 ■ Only affects self at Max HP.
//        Critical Rate ▲ 21.62% permanently.                                        [L2]
//        Critical Damage ▲ 62.27% permanently.                                      [L2]
//   BU ■ Affects enemies within attack range.
//        Deals 396% of final ATK as damage.                                         [L3]
//      ■ Affects the same target(s) when at Max HP.
//        Deals 924% of final ATK as additional damage.                              [L3/L4]
//
// Modeling posture (override note + caveats carry the full story):
//   * "40 normal attacks" = 40 trigger PULLS — the standard SHOT reading for multi-hit weapons
//     (brid-silent-track MEASURED anchor: the NA counter advances per pull, not per projectile).
//     With hitsPerShot 2 that is hitCount 80. The per-hit reading (count 40) is the
//     nearest-wrong counterfactual the L1 group discriminates against.
//   * BOTH "at Max HP" gates (S2, burst line 2) are always-true under the v1 scope lock: the
//     sim models NO incoming boss damage to allies, so Max HP is the only reachable state.
//     Modeled unconditional + documented; L4 pins the observable consequence (the 924% line
//     fires on EVERY cast, the S2 passives are live from frame 0).
//   * Multi-target clauses ("enemies within attack range" / "the same target(s)") collapse to
//     the single scope-lock boss ({kind:'enemy'} documented stand-in; v1 fields one enemy).
//   * Burst nuke buckets follow the SSOT table (damage-calculation.md §1): crit at sheet rate,
//     never core, no range, FB by timing — her stage-3 cast lands BEFORE the Full Burst window
//     opens, so neither hit takes the +50% FB major.
//
// Fixture: the 720-kit-audit CONTROL COMP — liter (B1) / crown (B2) / soline (B3) / helm (B3),
// boss Fire (Iron-neutral), focus soline. Soline is the lower-slot Burst III, so she wins the
// stage-3 slot and casts every chain the B3s cover (6 casts / 180s in the deterministic run —
// a lone Burst III unit makes ZERO Full Bursts, which is why the control core is required).
// Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const SLUGS = ['liter', 'crown', 'soline', 'helm'] as const;
/** slot order: liter 0 / crown 1 / soline 2 / helm 3. */
const SOLINE = 2;
/** Base crit 15% + S2's 21.62 = the resolved sheet rate once S2 is live. */
const CRIT_RATE_WITH_S2 = 0.3662;
const CRIT_RATE_NO_S2 = 0.15;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [...SLUGS],
    bossElement: 'Fire',
    focusSlug: 'soline',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) => evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const solineShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'soline');
const solineCasts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'soline');
/** The S1 'On the Ball!' attack-speed applications (targetIdx = soline). */
const onTheBall = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) =>
      b.stat === 'attackSpeedPct' && b.value === 7.26 && b.targetIdx === SOLINE
  );
/** The S2 permanent crit passives, by stat — SELF-cast (allies also grant critDamagePct,
 *  e.g. a 12.46 team buff; casterIdx pins the kit line, not the stat name). */
const s2Passive = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter(
    (b) => b.stat === stat && b.targetIdx === SOLINE && b.casterIdx === SOLINE
  );
/** Burst-nuke damage events, by magnitude. */
const nukes = (evs: SimEvent[], atkPct?: number) =>
  dmg(evs).filter(
    (d) =>
      d.slug === 'soline' &&
      d.srcSlot === 'burst' &&
      (atkPct === undefined || d.atkPct === atkPct)
  );
/** soline's normal-attack damage events (per-trigger-pull aggregates). */
const normals = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'soline' && d.srcSlot === 'normal');
/** Trigger pulls fired by (inclusive) a frame. */
const pullsBy = (evs: SimEvent[], frame: number) =>
  solineShots(evs).filter((s) => s.frame <= frame).length;

// ---- counterfactuals (nearest-wrong model each assertion must discriminate against) -----------
/** L1 counterfactual: the PER-HIT reading of 'after 40 normal attacks' (40 hit-counter units
 *  instead of 40 pulls × hitsPerShot 2) — procs every 20 pulls, 2× the kit's cadence. */
const solinePerHit = withPatchedOverride('soline', (ov) => {
  const b = ov.skill1.find((x: any) => x.trigger?.kind === 'hitCount');
  if (!b || b.trigger.count !== 80) {
    throw new Error('soline S1 hitCount:80 block missing — fixture is stale');
  }
  b.trigger.count = 40;
});
/** L1 counterfactual: the attack-speed window made PERMANENT (no 3s expiry). */
const solinePermanentS1 = withPatchedOverride('soline', (ov) => {
  const e = ov.skill1[0]?.effects?.[0];
  if (e?.stat !== 'attackSpeedPct' || e.durationSec !== 3) {
    throw new Error('soline S1 attackSpeedPct/3s effect missing — fixture is stale');
  }
  delete e.durationSec;
});
/** L1 isolation: S1 removed entirely — proves the attack-speed line moves her damage. */
const solineNoS1 = withPatchedOverride('soline', (ov) => {
  if (!ov.skill1.length) {
    throw new Error('soline S1 empty — fixture is stale');
  }
  ov.skill1 = [];
});
/** L2 counterfactual: the NORMAL-SCOPED crit reading ('Critical Rate of normal attacks') —
 *  the helm-scoping mechanic the kit text does NOT state; lifts normals only, never the
 *  burst nuke. */
const solineScopedCrit = withPatchedOverride('soline', (ov) => {
  let n = 0;
  for (const b of ov.skill2) {
    for (const e of b.effects) {
      if (e.stat === 'critRatePct') {
        e.stat = 'critRateNormalPct';
        n++;
      }
    }
  }
  if (!n) {
    throw new Error('soline S2 critRatePct effect missing — fixture is stale');
  }
});
/** L2 isolation: the crit-DAMAGE line removed — isolates the critRate feed and the critBonus
 *  feed independently. */
const solineNoCritDmg = withPatchedOverride('soline', (ov) => {
  for (const b of ov.skill2) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.stat !== 'critDamagePct');
    if (b.effects.length === before) {
      throw new Error('soline S2 critDamagePct effect missing — fixture is stale');
    }
  }
});
/** L2 isolation: BOTH S2 passives removed (the whole 'Grow up!' block gone). */
const solineNoS2 = withPatchedOverride('soline', (ov) => {
  if (!ov.skill2.length) {
    throw new Error('soline S2 empty — fixture is stale');
  }
  ov.skill2 = [];
});
/** L3 counterfactual: the two ■ lines FUSED into one 1320% hit — numerically equal totals,
 *  wrong event shape (one instance instead of the kit's 396 + 924 pair). */
const solineFused1320 = withPatchedOverride('soline', (ov) => {
  if (ov.burst.length !== 2) {
    throw new Error('soline burst blocks missing — fixture is stale');
  }
  ov.burst = [
    {
      slot: 'burst',
      trigger: { kind: 'burstCast' },
      target: { kind: 'enemy' },
      effects: [{ kind: 'flatDamage', atkPct: 1320 }],
    },
  ];
});
/** L3 counterfactual: the 924% 'additional damage' line DROPPED (the Max-HP-gated half of
 *  the burst simply missing). */
const solineNo924 = withPatchedOverride('soline', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.atkPct === 924)
  );
  if (ov.burst.length !== before - 1) {
    throw new Error('soline burst 924 block missing — fixture is stale');
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const perHit = run({ soline: solinePerHit });
const permanentS1 = run({ soline: solinePermanentS1 });
const noS1 = run({ soline: solineNoS1 });
const scopedCrit = run({ soline: solineScopedCrit });
const noCritDmg = run({ soline: solineNoCritDmg });
const noS2 = run({ soline: solineNoS2 });
const fused = run({ soline: solineFused1320 });
const no924 = run({ soline: solineNo924 });

describe('soline — kit spec', () => {
  it('fixture sanity: soline wins the stage-3 slot and casts every covered chain', () => {
    const casts = solineCasts(base.events);
    expect(casts.length).toBeGreaterThanOrEqual(4);
    expect([...new Set(casts.map((c) => c.stage))]).toEqual([3]);
  });

  describe('L1 — S1: Attack Speed ▲7.26% for 3s after 40 normal attacks (= 40 pulls)', () => {
    const applies = onTheBall(base.events);

    it('the kth application rides the 40k-th trigger pull (shot reading × hitsPerShot 2)', () => {
      expect(applies.length).toBeGreaterThanOrEqual(10);
      for (let k = 1; k <= 5; k++) {
        const fired = pullsBy(base.events, applies[k - 1].frame);
        expect(
          fired,
          `application ${k} at ${fired} pulls, expected ${40 * k}`
        ).toBe(40 * k);
      }
    });

    it('is a 3s self window at the kit magnitude, re-firing indefinitely (no once qualifier)', () => {
      for (const b of applies) {
        expect(b.value).toBe(7.26);
        expect(b.targetIdx).toBe(SOLINE);
        expect(b.expiresFrame! - b.frame, '3s duration').toBe(3 * FPS);
      }
      // still applying near the end of the fight — the counter re-fires every 40 pulls
      expect(applies[applies.length - 1].frame).toBeGreaterThan(150 * FPS);
    });

    it('moves her damage (attack speed = more pulls = more spray)', () => {
      expect(base.totals.soline).toBeGreaterThan(noS1.totals.soline);
    });

    it('DISCRIMINATING: the per-HIT reading (count 40) procs on the 20th pull, not the 40th', () => {
      const hitReading = onTheBall(perHit.events);
      expect(hitReading.length).toBeGreaterThan(applies.length);
      expect(pullsBy(perHit.events, hitReading[0].frame)).toBe(20);
    });

    it('DISCRIMINATING: a permanent S1 has no 3s expiry', () => {
      const permanent = onTheBall(permanentS1.events);
      expect(permanent.length).toBeGreaterThan(0);
      expect(
        permanent.some((b) => b.expiresFrame === null),
        'at least one application never expires'
      ).toBe(true);
    });
  });

  describe('L2 — S2: permanent Crit Rate ▲21.62% + Crit Damage ▲62.27% (Max-HP gate always-true in scope)', () => {
    it('both passives are live from frame 0 — she starts at Max HP and never leaves it', () => {
      const cr = s2Passive(base.events, 'critRatePct');
      const cd = s2Passive(base.events, 'critDamagePct');
      expect(cr.length).toBeGreaterThan(0);
      expect(cd.length).toBeGreaterThan(0);
      expect([...new Set(cr.map((b) => b.value))]).toEqual([21.62]);
      expect([...new Set(cd.map((b) => b.value))]).toEqual([62.27]);
      for (const b of [...cr, ...cd]) {
        expect(b.frame, 'passive from battle start').toBe(0);
        expect(b.expiresFrame, '"permanently" — no wall-clock expiry').toBeNull();
        expect(b.targetIdx).toBe(SOLINE);
      }
    });

    it('feeds the WHOLE crit roll, unscoped: normals AND the burst nuke gain exactly +21.62pp', () => {
      const nukeBase = nukes(base.events)[0];
      const nukeNoS2 = nukes(noS2.events)[0];
      expect(nukeBase.critRate).toBeCloseTo(CRIT_RATE_WITH_S2, 6);
      expect(nukeNoS2.critRate).toBeCloseTo(CRIT_RATE_NO_S2, 6);
      expect(nukeBase.critRate - nukeNoS2.critRate).toBeCloseTo(0.2162, 6);
      const normalBase = normals(base.events)[10];
      const normalNoS2 = normals(noS2.events)[10];
      expect(normalBase.critRate - normalNoS2.critRate).toBeCloseTo(0.2162, 6);
    });

    it('the critDamage line feeds the major bucket at exactly critRate × 62.27pp on matched hits', () => {
      const b = normals(base.events);
      const c = normals(noCritDmg.events);
      expect(b.length).toBe(c.length);
      expect(b.length).toBeGreaterThan(0);
      for (let i = 0; i < b.length; i += 97) {
        // Major = 1 + FB + Range + critRate×critBonus + core… — only critBonus differs
        expect(
          b[i].mult.major - c[i].mult.major,
          `hit ${i} (frame ${b[i].frame})`
        ).toBeCloseTo(b[i].critRate * 0.6227, 6);
      }
    });

    it('DISCRIMINATING: a normal-SCOPED crit rate lifts normals but never the burst nuke', () => {
      const scopedNuke = nukes(scopedCrit.events)[0];
      const scopedNormal = normals(scopedCrit.events)[10];
      const baseNuke = nukes(base.events)[0];
      const baseNormal = normals(base.events)[10];
      expect(baseNuke.critRate - scopedNuke.critRate).toBeCloseTo(0.2162, 6);
      expect(scopedNormal.critRate).toBeCloseTo(baseNormal.critRate, 6);
    });
  });

  describe('L3 — burst: 396% + 924% of final ATK on her own cast', () => {
    const hits = nukes(base.events);
    const casts = solineCasts(base.events);

    it('fires the kit pair (396 then 924) once per soline cast, on the cast frame', () => {
      expect(hits.length).toBe(2 * casts.length);
      const castFrames = new Set(casts.map((c) => c.frame));
      for (const c of casts) {
        const pair = hits
          .filter((d) => d.frame === c.frame)
          .map((d) => d.atkPct)
          .sort((a, b) => a - b);
        expect(pair, `cast at frame ${c.frame}`).toEqual([396, 924]);
      }
      for (const d of hits) {
        expect(castFrames.has(d.frame)).toBe(true);
        expect(d.bucket).toBe('burst');
        expect(d.srcSlot).toBe('burst');
      }
    });

    it('follows the burst-nuke SSOT row: crit at sheet rate, never core, no range, cast lands before FB', () => {
      for (const d of hits) {
        expect(d.critEligible).toBe(true);
        expect(d.coreEligible).toBe(false);
        expect(d.rangeApplied).toBe(false);
        expect(d.fbMajorApplied).toBe(false);
        expect(d.critRate).toBeCloseTo(CRIT_RATE_WITH_S2, 6);
      }
    });

    it('DISCRIMINATING: a fused 1320% hit has the wrong event shape (one instance, not the pair)', () => {
      const fusedHits = nukes(fused.events);
      expect(fusedHits.length).toBe(solineCasts(fused.events).length);
      expect([...new Set(fusedHits.map((d) => d.atkPct))]).toEqual([1320]);
    });

    it('DISCRIMINATING: dropping the 924 line halves the burst events and her total', () => {
      const kept = nukes(no924.events);
      expect([...new Set(kept.map((d) => d.atkPct))]).toEqual([396]);
      expect(kept.length).toBe(solineCasts(no924.events).length);
      expect(no924.totals.soline).toBeLessThan(base.totals.soline);
    });
  });

  describe('L4 — the Max-HP gates are always-true in scope: nothing gated ever skips', () => {
    it('the 924% "when at Max HP" line lands on EVERY cast — same count as the ungated 396 line', () => {
      const casts = solineCasts(base.events).length;
      expect(nukes(base.events, 924).length).toBe(casts);
      expect(nukes(base.events, 396).length).toBe(casts);
    });

    it('the "Only affects self at Max HP" passives need no trigger accrual — live at t=0', () => {
      const cr = s2Passive(base.events, 'critRatePct');
      expect(cr[0].frame).toBe(0);
      // and they are load-bearing: without them her crit roll collapses to the 15% base
      expect(base.totals.soline).toBeGreaterThan(noS2.totals.soline);
    });
  });
});
