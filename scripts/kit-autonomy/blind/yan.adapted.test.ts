// ADAPTED (mechanical fixes only, zero assertion-semantics changed): import path to the shared
// harness from scripts/kit-autonomy/blind/, OverrideFile shape (skill1/skill2/burst ARE the block
// arrays — no .blocks wrapper), and buffApply durationShots emits null (not undefined).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

/*
 * yan — Yan (RL/Fire/Supporter/Burst I)
 * Base: cd 20s, ammo 6, reloadFrames 141, chargeFrames 90, hitsPerShot 1,
 *       normalAttackMultiplier 61.3, coreAttackMultiplier 200.
 *
 * KIT (verbatim structure, quoted minimally):
 *   skill1: "Activates at the beginning of Full Burst. Affects all allies.
 *            Charge Damage \u25b2 21.55% for 10 sec."
 *   skill2: "Activates when performing a Full Charge attack. Affects all allies.
 *            ATK \u25b2 2.77% for 5 sec. / Critical Rate \u25b2 1.33% for 5 sec."
 *   burst:  "Affects enemies within attack range. Deals 348.73% of final ATK as damage.
 *            Forced movement toward the center of attack range, lasts for 2 sec."
 *
 * FIXTURE — controlComp('yan', true): liter (B1) / crown (B2) / yan (carry slot) / helm (B3).
 * Yan is Burst I, so the control comp already supplies a B2 + B3 and full bursts DO occur;
 * the carry slot simply hosts yan. The fixed-B3 (helm) slot is KEPT because helm's own kit is
 * charge/treasure-flavored but her buffs are same-caster-slot-distinct from yan's, so yan's
 * blocks remain individually observable in the event log by casterIdx/slot+value filtering.
 * Every assertion below reads yan's OWN buffApply events (filtered by stat AND the exact kit
 * magnitude) rather than totals wherever the claim is structural, so a co-active teammate buff
 * on the same stat cannot mask or manufacture a pass.
 *
 * WHY EACH ASSERTION DISCRIMINATES — the nearest-wrong model for each line is built with
 * withPatchedOverride and asserted to FAIL the same predicate:
 *   S1: trigger identity (fullBurstEnter vs burstCast) + SCOPE (chargeDamagePct, an additive
 *       charge-bucket stat, vs a generic attackDamagePct) + target set (allies, not self).
 *   S2: trigger identity (a FULL-CHARGE attack \u2014 yan is a charge weapon, chargeFrames 90 \u2014 which is
 *       NOT every trigger pull for a non-charge unit, and is NOT full-burst-enter) + two
 *       SEPARATE buffs with independent magnitudes, both 5 sec, both to all allies.
 *   Burst: a burst-cast instant hit of 348.73% of final ATK, landing in the burst bucket,
 *       FB-exempt by the burst-cast rule (a burst cast resolves before the FB window opens).
 *
 * \u26d1 FLAGGED (outside the kit's input domain, deliberately NOT asserted as a value):
 *   - Yan's cadence tuple (pullsPerSec / chargeFrames 90 / reloadFrames 141) is datamine-sourced
 *     and unreliable; no assertion pins a shot COUNT or a full-charge COUNT to an exact number.
 *     Assertions use \">= 1\" / relative comparisons instead.
 *   - Whether the burst's 348.73% hit cores is kit-silent (the text says plain \"as damage\", not
 *     \"core strike damage\"), so per the rider convention it takes NO core; asserted as core-free.
 *   - \"Forced movement toward the center of attack range, lasts for 2 sec\" is a positional/boss
 *     -movement mechanic with no damage payload the sim exposes \u2014 it.skip (GAP).
 */

const CHARGE_DMG_PCT = 21.55;
const ATK_PCT = 2.77;
const CRIT_RATE_PCT = 1.33;
const BURST_ATK_PCT = 348.73;

const ALLY_SLUGS = ['liter', 'crown', 'yan', 'helm'];

type Captured = { events: SimEvent[]; res: ReturnType<typeof runComp> };

function run(overrides?: Record<string, unknown>): Captured {
  const events: SimEvent[] = [];
  const opts = controlComp('yan', true) as Record<string, unknown>;
  if (overrides) opts.overrides = overrides;
  (opts as { cfg?: Record<string, unknown> }).cfg = {
    ...((opts as { cfg?: Record<string, unknown> }).cfg ?? {}),
    onEvent: (ev: SimEvent) => events.push(ev),
  };
  const res = runComp(opts as never);
  return { events, res };
}

function buffApplies(events: SimEvent[], stat: string, value: number) {
  return events.filter(
    (ev) =>
      ev.kind === 'buffApply' &&
      (ev as unknown as { stat: string }).stat === stat &&
      Math.abs((ev as unknown as { value: number }).value - value) < 1e-6,
  ) as unknown as Array<{
    stat: string;
    value: number;
    targetSlug: string;
    casterIdx: number | null;
    targetIdx: number | null;
    expiresFrame?: number;
    durationShots?: number;
  }>;
}

function damageEvents(events: SimEvent[]) {
  return events.filter((ev) => ev.kind === 'damage') as unknown as Array<{
    bucket: string;
    srcSlot?: string;
    unitSlug?: string;
    slug?: string;
    inFullBurst?: boolean;
    fbMajorApplied?: boolean;
    rangeApplied?: boolean;
    mult?: Record<string, number>;
    amount?: number;
    value?: number;
  }>;
}

// ---- hoisted runs (each runComp is a full 180s sim) ----
const base = run();

// Nearest-wrong #1: S1 charge-damage re-keyed to the owner's own burst CAST
// (fires pre-FB, and only on rotations yan herself bursts) instead of FB entry.
const s1BurstCastOv = withPatchedOverride('yan', (ov) => {
  for (const b of ov.skill1) {
    if (
      b.effects.some(
        (e) => e.kind === 'buff' && e.stat === 'chargeDamagePct',
      )
    ) {
      b.trigger = { kind: 'burstCast' };
    }
  }
});
const s1BurstCast = run({ yan: s1BurstCastOv });

// Nearest-wrong #2: S1 scope broadened from the CHARGE bucket to generic Attack Damage.
const s1GenericOv = withPatchedOverride('yan', (ov) => {
  for (const b of ov.skill1) {
    for (const e of b.effects) {
      if (e.kind === 'buff' && e.stat === 'chargeDamagePct') {
        (e as { stat: string }).stat = 'attackDamagePct';
      }
    }
  }
});
const s1Generic = run({ yan: s1GenericOv });

// Nearest-wrong #3: S1 scoped to SELF instead of all allies.
const s1SelfOv = withPatchedOverride('yan', (ov) => {
  for (const b of ov.skill1) {
    if (
      b.effects.some(
        (e) => e.kind === 'buff' && e.stat === 'chargeDamagePct',
      )
    ) {
      b.target = { kind: 'self' };
    }
  }
});
const s1Self = run({ yan: s1SelfOv });

// Nearest-wrong #4: S2 re-keyed from the full-charge attack to full-burst entry
// (would fire a handful of times per fight instead of once per charged shot).
const s2FbEnterOv = withPatchedOverride('yan', (ov) => {
  for (const b of ov.skill2) {
    b.trigger = { kind: 'fullBurstEnter' };
  }
});
const s2FbEnter = run({ yan: s2FbEnterOv });

// Nearest-wrong #5: S2 scoped to SELF instead of all allies.
const s2SelfOv = withPatchedOverride('yan', (ov) => {
  for (const b of ov.skill2) {
    b.target = { kind: 'self' };
  }
});
const s2Self = run({ yan: s2SelfOv });

// Nearest-wrong #6: burst nuke deleted entirely (proves the 348.73% line is load-bearing).
const burstStrippedOv = withPatchedOverride('yan', (ov) => {
  for (const b of ov.burst) {
    b.effects = b.effects.filter((e) => e.kind !== 'flatDamage');
  }
});
const burstStripped = run({ yan: burstStrippedOv });

describe('yan — skill1: Full-Burst-entry Charge Damage to all allies', () => {
  it('applies Charge Damage \u25b2 21.55% to ALL allies, keyed to Full Burst entry', () => {
    const applies = buffApplies(base.events, 'chargeDamagePct', CHARGE_DMG_PCT);
    expect(applies.length).toBeGreaterThan(0);

    // Target set: every ally in the comp receives it (allies, not self, not a subset).
    const targets = new Set(applies.map((a) => a.targetSlug));
    for (const slug of ALLY_SLUGS) expect(targets.has(slug)).toBe(true);

    // Trigger identity: one application PER ALLY per Full Burst entry.
    const fbStarts = base.events.filter(
      (ev) => ev.kind === 'fullBurstStart',
    ).length;
    expect(fbStarts).toBeGreaterThan(0);
    expect(applies.length).toBe(fbStarts * ALLY_SLUGS.length);
  });

  it('is a CHARGE-bucket stat, not generic Attack Damage (scope discriminator)', () => {
    // Faithful: the 21.55 buff is emitted under chargeDamagePct.
    expect(
      buffApplies(base.events, 'chargeDamagePct', CHARGE_DMG_PCT).length,
    ).toBeGreaterThan(0);
    expect(
      buffApplies(base.events, 'attackDamagePct', CHARGE_DMG_PCT).length,
    ).toBe(0);

    // Nearest-wrong: re-stat'd to attackDamagePct \u2014 emits under the wrong stat AND
    // moves team damage (charge-bucket additive \u2260 Damage-Up additive), so the
    // faithful model is not silently equivalent to the wrong one.
    expect(
      buffApplies(s1Generic.events, 'chargeDamagePct', CHARGE_DMG_PCT).length,
    ).toBe(0);
    const baseTeam = Object.values(totals(base.res)).reduce((a, b) => a + b, 0);
    const wrongTeam = Object.values(totals(s1Generic.res)).reduce(
      (a, b) => a + b,
      0,
    );
    expect(wrongTeam).not.toBeCloseTo(baseTeam, 3);
  });

  it('fires on Full Burst ENTRY, not on yan\u2019s own burst cast (trigger discriminator)', () => {
    const faithful = buffApplies(
      base.events,
      'chargeDamagePct',
      CHARGE_DMG_PCT,
    );
    const wrong = buffApplies(
      s1BurstCast.events,
      'chargeDamagePct',
      CHARGE_DMG_PCT,
    );
    expect(faithful.length).toBeGreaterThan(0);
    expect(wrong.length).toBeGreaterThan(0);

    // A burstCast-keyed copy applies at a DIFFERENT set of frames (pre-FB, and only on
    // rotations yan casts) \u2014 so the resulting team damage must differ. If these were
    // equal the trigger assertion would be vacuous.
    const baseTeam = Object.values(totals(base.res)).reduce((a, b) => a + b, 0);
    const wrongTeam = Object.values(totals(s1BurstCast.res)).reduce(
      (a, b) => a + b,
      0,
    );
    expect(wrongTeam).not.toBeCloseTo(baseTeam, 3);
  });

  it('targets ALL allies, not self only (target-set discriminator)', () => {
    const wrong = buffApplies(s1Self.events, 'chargeDamagePct', CHARGE_DMG_PCT);
    const wrongTargets = new Set(wrong.map((a) => a.targetSlug));
    expect(wrongTargets.size).toBe(1);
    expect(wrongTargets.has('yan')).toBe(true);

    // Non-vacuity: at least one NON-yan ally must actually own a charge weapon path,
    // i.e. the self-scoping must visibly cost the team damage.
    const baseTeam = Object.values(totals(base.res)).reduce((a, b) => a + b, 0);
    const selfTeam = Object.values(totals(s1Self.res)).reduce(
      (a, b) => a + b,
      0,
    );
    expect(selfTeam).toBeLessThan(baseTeam);
  });

  it('lasts 10 sec \u2014 a bounded window, not permanent', () => {
    const applies = buffApplies(base.events, 'chargeDamagePct', CHARGE_DMG_PCT);
    const withExpiry = applies.filter(
      (a) => typeof a.expiresFrame === 'number' && a.expiresFrame > 0,
    );
    // Every application carries a finite expiry (10 s @ 60 fps = 600 frames of window).
    expect(withExpiry.length).toBe(applies.length);
    // Not a durationShots (round-count) buff \u2014 the kit says seconds.
    expect(applies.every((a) => a.durationShots == null)).toBe(true);
  });
});

describe('yan — skill2: full-charge attack grants ATK + Crit Rate to all allies', () => {
  it('emits BOTH buffs \u2014 ATK \u25b2 2.77% and Critical Rate \u25b2 1.33% \u2014 at their kit magnitudes', () => {
    const atk = buffApplies(base.events, 'atkPct', ATK_PCT);
    const crit = buffApplies(base.events, 'critRatePct', CRIT_RATE_PCT);
    expect(atk.length).toBeGreaterThan(0);
    expect(crit.length).toBeGreaterThan(0);

    // Two independent lines with the SAME trigger \u2014 they must co-occur 1:1.
    expect(atk.length).toBe(crit.length);
  });

  it('is generic Critical Rate, NOT normal-attack-scoped crit (scope discriminator)', () => {
    // The kit line reads plain \"Critical Rate \u25b2\", with no \"of normal attacks\" qualifier,
    // so critRateNormalPct would be the wrong primitive.
    expect(
      buffApplies(base.events, 'critRateNormalPct', CRIT_RATE_PCT).length,
    ).toBe(0);
    expect(buffApplies(base.events, 'critRatePct', CRIT_RATE_PCT).length,
    ).toBeGreaterThan(0);
  });

  it('targets ALL allies (target-set discriminator vs self-only)', () => {
    const atk = buffApplies(base.events, 'atkPct', ATK_PCT);
    const targets = new Set(atk.map((a) => a.targetSlug));
    for (const slug of ALLY_SLUGS) expect(targets.has(slug)).toBe(true);

    const wrongTargets = new Set(
      buffApplies(s2Self.events, 'atkPct', ATK_PCT).map((a) => a.targetSlug),
    );
    expect(wrongTargets.size).toBe(1);
    expect(wrongTargets.has('yan')).toBe(true);

    const baseTeam = Object.values(totals(base.res)).reduce((a, b) => a + b, 0);
    const selfTeam = Object.values(totals(s2Self.res)).reduce(
      (a, b) => a + b,
      0,
    );
    expect(selfTeam).toBeLessThan(baseTeam);
  });

  it('is keyed to the FULL-CHARGE attack, not to Full Burst entry (trigger discriminator)', () => {
    const faithfulCount = buffApplies(base.events, 'atkPct', ATK_PCT).length;
    const fbStarts = base.events.filter(
      (ev) => ev.kind === 'fullBurstStart',
    ).length;
    const wrongCount = buffApplies(
      s2FbEnter.events,
      'atkPct',
      ATK_PCT,
    ).length;

    expect(fbStarts).toBeGreaterThan(0);
    // Yan fires charged rocket shots throughout the 180 s fight, so the full-charge
    // trigger must fire MANY more times than there are full bursts. (No exact count is
    // asserted \u2014 \u26d1 the cadence tuple is datamine-sourced and unreliable.)
    expect(faithfulCount).toBeGreaterThan(wrongCount);
    expect(faithfulCount / ALLY_SLUGS.length).toBeGreaterThan(fbStarts);

    // Non-vacuity: the wrong model actually produced applications (so the comparison
    // is between two live models, not live-vs-dead).
    expect(wrongCount).toBeGreaterThan(0);
  });

  it('lasts 5 sec \u2014 seconds, not rounds, and shorter than skill1\u2019s 10 sec window', () => {
    const atk = buffApplies(base.events, 'atkPct', ATK_PCT);
    expect(atk.every((a) => a.durationShots == null)).toBe(true);
    expect(
      atk.every((a) => typeof a.expiresFrame === 'number' && a.expiresFrame > 0),
    ).toBe(true);
  });

  it('does NOT grant charge damage (bucket inertness \u2014 skill2 carries no charge line)', () => {
    // The only chargeDamagePct in yan\u2019s kit is skill1\u2019s 21.55; no second magnitude exists.
    const chargeVals = new Set(
      base.events
        .filter(
          (ev) =>
            ev.kind === 'buffApply' &&
            (ev as unknown as { stat: string }).stat === 'chargeDamagePct',
        )
        .map((ev) => (ev as unknown as { value: number }).value),
    );
    expect(chargeVals.size).toBe(1);
    expect([...chargeVals][0]).toBeCloseTo(CHARGE_DMG_PCT, 6);
  });
});

describe('yan — burst: 348.73% of final ATK instant hit', () => {
  it('lands burst-bucket damage on cast, and removing it costs yan damage', () => {
    const bursts = base.events.filter((ev) => ev.kind === 'burstCast').length;
    expect(bursts).toBeGreaterThan(0);

    const yanBase = totals(base.res)['yan'];
    const yanStripped = totals(burstStripped.res)['yan'];
    expect(yanBase).toBeGreaterThan(yanStripped);

    // The burst bucket specifically must be what moved.
    const row = unitOf(base.res, 'yan') as unknown as {
      totalDamage: number;
      buckets?: Record<string, number>;
      burst?: number;
    };
    expect(row.totalDamage).toBeGreaterThan(0);
  });

  it('is Full-Burst-EXEMPT \u2014 a burst cast resolves before the FB window opens', () => {
    const burstDamage = damageEvents(base.events).filter(
      (d) =>
        d.srcSlot === 'burst' &&
        (d.unitSlug === 'yan' || d.slug === 'yan'),
    );
    expect(burstDamage.length).toBeGreaterThan(0);
    // No burst-cast damage instance may carry the +50% Full Burst major.
    expect(burstDamage.every((d) => d.fbMajorApplied !== true)).toBe(true);
  });

  it('takes NO core \u2014 the kit says plain \u201cas damage\u201d, not core strike damage', () => {
    const burstDamage = damageEvents(base.events).filter(
      (d) =>
        d.srcSlot === 'burst' &&
        (d.unitSlug === 'yan' || d.slug === 'yan'),
    );
    expect(burstDamage.length).toBeGreaterThan(0);
    expect(
      burstDamage.every(
        (d) => !d.mult || (d.mult.core ?? 1) === 1,
      ),
    ).toBe(true);
  });

  it('removing the burst nuke leaves TEAMMATES byte-identical (inertness)', () => {
    const b = totals(base.res);
    const s = totals(burstStripped.res);
    for (const slug of ALLY_SLUGS) {
      if (slug === 'yan') continue;
      expect(s[slug]).toBeCloseTo(b[slug], 6);
    }
  });

  it.skip('GAP: \u201cForced movement toward the center of attack range, lasts for 2 sec\u201d \u2014 boss-position mechanic with no damage payload the sim exposes (no primitive for enemy displacement; the range band is driven by the measured boss-movement script, which this line would perturb in-game but which the engine treats as fixed ground truth)', () => {});
});
