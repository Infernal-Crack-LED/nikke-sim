import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

/**
 * soline — Soline (SMG / Iron / Attacker / Burst III)
 * Base: cd 40s, ammo 120, reloadFrames 141, chargeFrames 0, hitsPerShot 2,
 *       normalAttackMultiplier 11.7, coreAttackMultiplier 250.
 *
 * BLIND spec test written from the kit prose alone (S5 cross-family post-op).
 *
 * KIT (structural read):
 *   skill1  ■ "Activates after 40 normal attacks. Affects self."
 *             Attack Speed ▲ 7.26% for 3 sec.
 *           → trigger = hitCount, count 40 (ROUNDS/hits, not trigger pulls — soline is
 *             hitsPerShot 2, so 40 hits = 20 pulls). target self. buff attackSpeedPct
 *             7.26, durationSec 3. RECURRING (every 40), not once-per-battle.
 *   skill2  ■ "Only affects self at Max HP."
 *             Critical Rate ▲ 21.62% permanently.
 *             Critical Damage ▲ 62.27% permanently.
 *           → v1 has no HP pool (immortal boss, nobody takes damage) → the unit is
 *             ALWAYS at Max HP, so the Max-HP condition is trivially satisfied for the
 *             whole fight. passive, self, UNSCOPED critRatePct + critDamagePct
 *             (the text says plain "Critical Rate", NOT "Critical Rate of normal
 *             attacks" — so it must feed burst/skill hits too, i.e. critRatePct not
 *             critRateNormalPct).
 *   burst   ■ "Affects enemies within attack range." Deals 396% of final ATK as damage.
 *           ■ "Affects the same target(s) when at Max HP." Deals 924% of final ATK as
 *             additional damage.
 *           → burstCast, self-sourced flatDamage 396 + a SECOND flatDamage 924 gated on
 *             Max HP (again trivially true at scope lock). Burst-cast damage lands
 *             BEFORE the Full Burst window opens → both hits are FB-exempt by timing.
 *             No "core strike" wording → no core. Riders take no +30% range bonus.
 *
 * FIXTURE: controlComp('soline', true) — soline is a Burst III unit; a lone B3 makes
 * ZERO full bursts, so the fixture MUST carry B1+B2 (liter/crown) for her burst to cast
 * at all. The fixed B3 (helm) is kept: her S1 "Critical Rate of normal attacks" is the
 * SCOPED stat (critRateNormalPct), a different StatKey from soline's unscoped
 * critRatePct, so it cannot be confused with soline's own crit line in the buffApply
 * filters below (every assertion filters on targetSlug === 'soline' AND the exact stat).
 *
 * WHY EACH ASSERTION DISCRIMINATES: each group pairs a faithful-reading assertion with a
 * withPatchedOverride counterfactual encoding the NEAREST-WRONG model, and asserts the
 * two differ (or that the counterfactual breaks the observable the faithful model
 * satisfies). Runs are hoisted — each runComp is a full 180s sim.
 */

const SLUG = 'soline';

type Ev = SimEvent & Record<string, unknown>;

function run(opts: ReturnType<typeof controlComp>) {
  const events: Ev[] = [];
  const res = runComp({
    ...opts,
    onEvent: (ev: SimEvent) => events.push(ev as Ev),
  });
  return { res, events };
}

const base = controlComp(SLUG, true);
const baseRun = run(base);

const ev = baseRun.events;
const soline = unitOf(baseRun.res, SLUG);
const baseTotals = totals(baseRun.res);

// --- shared event slices (computed once) ---------------------------------
const solineIdx = soline.slotIndex ?? soline.idx;

const buffsOnSoline = ev.filter(
  (e) => e.kind === 'buffApply' && e.targetSlug === SLUG
);
const atkSpeedBuffs = buffsOnSoline.filter((e) => e.stat === 'attackSpeedPct');
const critRateBuffs = buffsOnSoline.filter((e) => e.stat === 'critRatePct');
const critDmgBuffs = buffsOnSoline.filter((e) => e.stat === 'critDamagePct');
const critRateNormalBuffs = buffsOnSoline.filter(
  (e) => e.stat === 'critRateNormalPct'
);

const solineShots = ev.filter(
  (e) => e.kind === 'shot' && e.srcSlot === solineIdx
);
const solineDamage = ev.filter(
  (e) => e.kind === 'damage' && e.srcSlot === solineIdx
);
const solineNormalDamage = solineDamage.filter((e) => e.bucket === 'normal');
const solineBurstCasts = ev.filter(
  (e) => e.kind === 'burstCast' && e.srcSlot === solineIdx
);

// non-normal, non-DoT hits sourced by soline = her burst riders
const solineRiders = solineDamage.filter((e) => e.bucket !== 'normal');

describe('soline — fixture sanity (non-vacuity)', () => {
  it('is in the comp, fires, and actually casts her burst (B1+B2 present)', () => {
    expect(soline).toBeTruthy();
    expect(baseTotals[SLUG]).toBeGreaterThan(0);
    expect(solineShots.length).toBeGreaterThan(0);
    // A lone Burst III makes ZERO full bursts; the control comp supplies B1/B2 so she casts.
    expect(solineBurstCasts.length).toBeGreaterThan(0);
  });

  it('fires far more than 40 hits, so the every-40-hits trigger is exercised repeatedly', () => {
    // hitsPerShot 2 → 40 hits ≈ 20 trigger pulls. A 180s fight must clear this many times.
    expect(solineNormalDamage.length).toBeGreaterThan(80);
  });
});

describe('soline skill1 — Attack Speed ▲7.26% for 3 sec, every 40 normal attacks (self)', () => {
  it('applies attackSpeedPct 7.26 to SELF with a 3-second window', () => {
    expect(atkSpeedBuffs.length).toBeGreaterThan(0);
    for (const b of atkSpeedBuffs) {
      expect(b.value).toBeCloseTo(7.26, 6);
      expect(b.targetSlug).toBe(SLUG);
      // self-buff: caster is soline herself
      expect(b.casterIdx).toBe(solineIdx);
      // "for 3 sec" is WALL-CLOCK, not a round count → expiresFrame set, durationShots absent.
      expect(b.durationShots ?? null).toBeNull();
      expect(typeof b.expiresFrame).toBe('number');
    }
  });

  it('DISCRIMINATES recurring-every-40 from once-per-battle: it re-applies many times', () => {
    // Nearest-wrong #1: reading "Activates after 40 normal attacks" as a ONE-SHOT unlock.
    // Faithful = a repeating hitCount trigger → many applications across 180s.
    expect(atkSpeedBuffs.length).toBeGreaterThan(3);
  });

  it('DISCRIMINATES the 40-HIT threshold from a 40-PULL threshold (hitsPerShot 2)', () => {
    // Nearest-wrong #2: counting trigger PULLS instead of ROUNDS/hits. soline is
    // hitsPerShot 2, so a pull-counting model fires HALF as often.
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill1!.blocks) {
        if (b.trigger && (b.trigger as { kind?: string }).kind === 'hitCount') {
          (b.trigger as { count: number }).count = 80; // = 40 pulls' worth of hits
        }
      }
    });
    const alt = run({ ...base, overrides: { [SLUG]: patched } });
    const altAtkSpeed = alt.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.targetSlug === SLUG &&
        e.stat === 'attackSpeedPct'
    );
    // Doubling the threshold must roughly HALVE the application count — proving the
    // assertion above is sensitive to the threshold and not trivially satisfied.
    expect(altAtkSpeed.length).toBeLessThan(atkSpeedBuffs.length);
    expect(alt.res).toBeTruthy();
  });

  it('is NOT inert: removing the attack-speed buff changes soline\u2019s own damage', () => {
    // Attack speed gates shots fired → it IS damage (weapon-state modifier rule).
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill1!.blocks) {
        b.effects = b.effects.filter(
          (e) => !(e.kind === 'buff' && e.stat === 'attackSpeedPct')
        );
      }
    });
    const alt = run({ ...base, overrides: { [SLUG]: patched } });
    expect(totals(alt.res)[SLUG]).not.toBeCloseTo(baseTotals[SLUG], 0);
    expect(totals(alt.res)[SLUG]).toBeLessThan(baseTotals[SLUG]);
  });

  it('is SELF-scoped: no teammate ever receives soline\u2019s attack-speed buff', () => {
    const onOthers = ev.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.stat === 'attackSpeedPct' &&
        e.casterIdx === solineIdx &&
        e.targetSlug !== SLUG
    );
    expect(onOthers).toHaveLength(0);
  });
});

describe('soline skill2 — Critical Rate ▲21.62% + Critical Damage ▲62.27%, permanent, self at Max HP', () => {
  it('applies BOTH crit stats to self, permanently (no expiry), at the kit magnitudes', () => {
    expect(critRateBuffs.length).toBeGreaterThan(0);
    expect(critDmgBuffs.length).toBeGreaterThan(0);

    const cr = critRateBuffs[0];
    const cd = critDmgBuffs[0];
    expect(cr.value).toBeCloseTo(21.62, 6);
    expect(cd.value).toBeCloseTo(62.27, 6);
    expect(cr.targetSlug).toBe(SLUG);
    expect(cd.targetSlug).toBe(SLUG);
    expect(cr.casterIdx).toBe(solineIdx);
    expect(cd.casterIdx).toBe(solineIdx);
    // "permanently" → applied once as a passive, never re-applied on a timer.
    expect(critRateBuffs.length).toBeLessThanOrEqual(2);
    expect(critDmgBuffs.length).toBeLessThanOrEqual(2);
  });

  it('DISCRIMINATES unscoped critRatePct from the normal-attack-SCOPED critRateNormalPct', () => {
    // The kit says plain "Critical Rate ▲", NOT "Critical Rate of normal attacks ▲".
    // Nearest-wrong: encoding it as critRateNormalPct, which would deny crit lift to her
    // burst riders. soline must carry NO self-sourced critRateNormalPct.
    const solineSourcedNormalScoped = critRateNormalBuffs.filter(
      (e) => e.casterIdx === solineIdx
    );
    expect(solineSourcedNormalScoped).toHaveLength(0);

    // ...and the counterfactual must actually MOVE damage, proving the distinction is live.
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill2!.blocks) {
        for (const e of b.effects) {
          if (e.kind === 'buff' && e.stat === 'critRatePct') {
            (e as { stat: string }).stat = 'critRateNormalPct';
          }
        }
      }
    });
    const alt = run({ ...base, overrides: { [SLUG]: patched } });
    expect(totals(alt.res)[SLUG]).not.toBeCloseTo(baseTotals[SLUG], 0);
  });

  it('the Max-HP condition is SATISFIED at scope lock (v1 has no HP pool) — the buffs are live, not gated off', () => {
    // Non-vacuity for the condition: the faithful model must NOT suppress these buffs.
    // If a wrong model gated them behind an unsatisfiable HP check, the arrays would be empty.
    expect(critRateBuffs.length).toBeGreaterThan(0);
    expect(critDmgBuffs.length).toBeGreaterThan(0);

    // And they are load-bearing: stripping them lowers her damage.
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill2!.blocks) {
        b.effects = b.effects.filter(
          (e) =>
            !(
              e.kind === 'buff' &&
              (e.stat === 'critRatePct' || e.stat === 'critDamagePct')
            )
        );
      }
    });
    const alt = run({ ...base, overrides: { [SLUG]: patched } });
    expect(totals(alt.res)[SLUG]).toBeLessThan(baseTotals[SLUG]);
  });

  it('is SELF-scoped: teammates are byte-identical when soline\u2019s crit buffs are stripped', () => {
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill2!.blocks) {
        b.effects = b.effects.filter(
          (e) =>
            !(
              e.kind === 'buff' &&
              (e.stat === 'critRatePct' || e.stat === 'critDamagePct')
            )
        );
      }
    });
    const alt = run({ ...base, overrides: { [SLUG]: patched } });
    const altTotals = totals(alt.res);
    for (const slug of Object.keys(baseTotals)) {
      if (slug === SLUG) {
        continue;
      }
      expect(altTotals[slug]).toBeCloseTo(baseTotals[slug], 6);
    }
  });
});

describe('soline burst — 396% base + 924% Max-HP additional, on burst cast', () => {
  it('emits TWO rider hits per burst cast (396% and 924%), not one merged 1320%', () => {
    // Nearest-wrong: collapsing the two ■ blocks into a single 1320% hit. That is
    // observationally different in the event log (hit COUNT), even at equal total.
    expect(solineBurstCasts.length).toBeGreaterThan(0);
    expect(solineRiders.length).toBe(solineBurstCasts.length * 2);
  });

  it('the two rider magnitudes sit in a 924/396 = 7:3 ratio at equal buff state', () => {
    // Both land on the same cast at the same buff snapshot, so their damage ratio is
    // the atkPct ratio (modulo crit rolls — the sim is deterministic/expected-value here).
    const perCast = solineRiders
      .map((e) => e.amount as number)
      .sort((a, b) => a - b);
    expect(perCast.length).toBeGreaterThanOrEqual(2);
    const small = perCast[0];
    const large = perCast[perCast.length - 1];
    expect(large / small).toBeCloseTo(924 / 396, 2);
  });

  it('DISCRIMINATES the 924% Max-HP branch: dropping it removes exactly the larger hit', () => {
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.burst!.blocks) {
        b.effects = b.effects.filter(
          (e) => !(e.kind === 'flatDamage' && Math.abs(e.atkPct - 924) < 0.001)
        );
      }
    });
    const alt = run({ ...base, overrides: { [SLUG]: patched } });
    const altRiders = alt.events.filter(
      (e) =>
        e.kind === 'damage' && e.srcSlot === solineIdx && e.bucket !== 'normal'
    );
    expect(altRiders.length).toBe(solineBurstCasts.length);
    expect(totals(alt.res)[SLUG]).toBeLessThan(baseTotals[SLUG]);
  });

  it('burst damage is FULL-BURST-EXEMPT by timing (the cast lands before the FB window opens)', () => {
    // Verified fact: burst-cast damage lands before Full Burst begins — no +50% major.
    for (const r of solineRiders) {
      expect(r.fbMajorApplied).toBeFalsy();
    }
  });

  it('riders take NO +30% range bonus and NO core (kit says no \u201ccore strike\u201d)', () => {
    for (const r of solineRiders) {
      expect(r.rangeApplied).toBeFalsy();
      expect(r.coreRate ?? 0).toBe(0);
    }
  });

  it('riders DO crit at her own rate (the unscoped skill2 crit lift must reach them)', () => {
    // This is the payoff of the unscoped-vs-scoped call above: with critRatePct, her burst
    // riders are crit-eligible. Removing her crit buffs must move the RIDER damage, not just normals.
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill2!.blocks) {
        b.effects = b.effects.filter(
          (e) =>
            !(
              e.kind === 'buff' &&
              (e.stat === 'critRatePct' || e.stat === 'critDamagePct')
            )
        );
      }
    });
    const alt = run({ ...base, overrides: { [SLUG]: patched } });
    const altRiders = alt.events.filter(
      (e) =>
        e.kind === 'damage' && e.srcSlot === solineIdx && e.bucket !== 'normal'
    );
    const baseRiderSum = solineRiders.reduce(
      (s, e) => s + (e.amount as number),
      0
    );
    const altRiderSum = altRiders.reduce((s, e) => s + (e.amount as number), 0);
    expect(altRiderSum).toBeLessThan(baseRiderSum);
  });

  it('burst is ENEMY-facing only: no teammate receives a soline burst buff', () => {
    const teamBuffsFromSoline = ev.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.casterIdx === solineIdx &&
        e.targetSlug !== SLUG
    );
    expect(teamBuffsFromSoline).toHaveLength(0);
  });
});

describe('soline — cross-line inertness', () => {
  it('soline contributes nothing to teammates: her whole override is self/enemy scoped', () => {
    // Strip EVERY soline effect that could touch an ally and confirm no ally total moves
    // relative to base (there should be none to strip — this pins the scope).
    const allyTargets = ev.filter(
      (e) =>
        (e.kind === 'buffApply' || e.kind === 'heal' || e.kind === 'shield') &&
        e.casterIdx === solineIdx &&
        e.targetSlug !== SLUG
    );
    expect(allyTargets).toHaveLength(0);
  });
});
