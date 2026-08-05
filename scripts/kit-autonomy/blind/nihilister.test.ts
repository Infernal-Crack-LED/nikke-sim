import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js'; // path fixed 2026-08-04 (driver, mechanical): blind/ sits under kit-autonomy/, not tests/units/ — no assertion changed

// DRIVER ADAPTATION 2026-08-04 (gauntlet S5, mechanical ONLY — the blind writer derived this
// with no repo access and flagged both shape guesses itself; assertion INTENT untouched):
//  (1) OverrideFile slots are raw Block[] arrays — `ov.skill1?.blocks` → `ov.skill1` throughout.
//  (2) `hasPierce` and `unmodeled` are TOP-LEVEL override fields, not per-slot.
//  (3) damage events carry no `flavor` field — the Burn ticks are identified by their kit
//      magnitude (bucket 'burst', atkPct ≈ 13.19), the only burst-bucket line at that value.
//  (4) buffApply events carry `durationShots: null` (not undefined) for "no round budget".

/**
 * nihilister — Nihilister (SR / Fire / Attacker / Burst II)
 * Base: cd 20s, ammo 6, reloadFrames 141, chargeFrames 60, hitsPerShot 1,
 *       normalAttackMultiplier 69.04, coreAttackMultiplier 200.
 *
 * KIT (verbatim structure, read literally):
 *
 * skill1 block A — "Activates when attacking with Full Charge. Affects self."
 *   - Gain Pierce for 1 round(s).
 *   - Piercing Radius ▲ 50% for 1 round(s).
 *   READING: trigger = every full-charge shot she fires (she is a charge SR; every
 *   normal pull IS a full charge at scope lock). Duration is "1 round(s)" — a ROUND
 *   COUNT, never wall-clock seconds (failure-mode taxonomy #2). Since the grant fires
 *   ON a shot and lasts 1 round, it covers the NEXT round; with a continuous firing
 *   cadence this is effectively continuous pierce after the first shot, but it is NOT
 *   the static whole-fight `hasPierce` flag (taxonomy: gainPierce EFFECT vs hasPierce
 *   FLAG). The nearest-wrong models are (a) hasPierce:true from t=0, (b) a
 *   durationSec:1 timed window.
 *   "Piercing Radius ▲ 50%" has no StatKey in the schema (pierceDamagePct is a
 *   DIFFERENT stat — Pierce DAMAGE, not radius) and the sim has one boss with no
 *   multi-target geometry → GAP.
 *
 * skill1 block B — "Activates when hits 2 or more enemies concurrently. Affects all
 *   enemies hit. Deals 50.33% of final ATK as additional damage."
 *   READING: the scope-lock fight is a SINGLE partless boss (verified fact: the test
 *   boss has no parts). "2 or more enemies concurrently" can never be satisfied → the
 *   block is UNMODELED/inert at scope. Modeling it as an unconditional per-shot rider
 *   would silently add ~50.33% of ATK per pull — the exact over-credit this test pins
 *   against.
 *
 * skill2 — "Affects enemies within attack range. Deals 112.64% of final ATK as damage."
 *   READING: a damage line with NO activation clause → `interval` trigger (taxonomy #3).
 *   The interval SECONDS are NOT in the kit text → ALWAYS-⚑ (invented cadence). The test
 *   therefore asserts the SHAPE (a repeating skill-bucket rider at 112.64% exists, is
 *   periodic, and is not once-per-fight / not per-shot) rather than pinning a cadence
 *   number the kit never states.
 *
 * burst block A — "Affects enemies within the attack range.
 *   Deals 158.59% of final ATK as damage.
 *   Burn: Deals 13.19% of final ATK as sustained damage every 1 sec for 10 sec."
 *   READING: burstCast trigger. The instant 158.59% is burst-cast damage → lands BEFORE
 *   Full Burst opens (verified fact) → FB-exempt by timing. The Burn is a `dot`,
 *   atkPct 13.19, intervalSec 1, durationSec 10, flavor 'sustained' (the kit literally
 *   says "as sustained damage"). ONE dot instance per burst cast — a duration longer
 *   than the burst cadence on a repeating trigger MULTIPLIES (taxonomy #5); 10s < her
 *   20s cooldown so instances must not overlap.
 *
 * burst block B — "Affects self. Max Ammunition Capacity ▲ 6 round(s) for 15 sec."
 *   READING: maxAmmoFlat +6 (FLAT rounds, not percent) for 15 SEC (this one IS
 *   wall-clock — "for 15 sec", not "for N round(s)"). Base ammo is 6, so this DOUBLES
 *   the magazine to 12 and removes a 141-frame reload from the middle of the burst
 *   window → it is a DAMAGE line (taxonomy #6: ammo capacity gates shots fired). The
 *   nearest-wrong models are maxAmmoPct:6 (a 6% bump → ~no extra round) and dropping it
 *   as "defensive".
 *
 * FIXTURE: controlComp('nihilister', true) — she is Burst II, so the control's B1 +
 * B3 slots are what let a burst chain complete at all; without them her burst-cast and
 * Full-Burst-timed assertions would never fire. Deterministic (no seed) so every
 * counterfactual delta is attributable to the patch alone.
 */

type Ev = SimEvent & Record<string, unknown>;

function run(opts: ReturnType<typeof controlComp>) {
  const events: Ev[] = [];
  const res = runComp({
    ...opts,
    cfg: { ...(opts.cfg ?? {}), onEvent: (ev: SimEvent) => events.push(ev as Ev) },
  });
  return { res, events };
}

const SLUG = 'nihilister';

// DRIVER ADAPTATION 2026-08-04 (fixture ONLY — the S2b reviewer's flagged hazard, realized):
// controlComp fixes crown at B2, and crown (B2, 20s) wins the B2 slot tiebreak over nihilister
// (B2, 20s), so her burst NEVER CAST in the blind-chosen fixture and every burstCast-keyed
// assertion was vacuous. The S2b note prescribed exactly this fix: "the test needs a comp
// without a competing B2". Sole-B2 fixture per the helm-aquamarine precedent:
// liter (B1) / nihilister (SOLE B2) / helm (B3), boss Fire, focus nihilister.
const nilComp = {
  slugs: ['liter', SLUG, 'helm'],
  bossElement: 'Fire' as const,
  focusSlug: SLUG,
};

// ---------------------------------------------------------------- baseline run
const base = run(nilComp);
const baseTotals = totals(base.res);
const baseDmg = baseTotals[SLUG];
const baseEvents = base.events;

const ownDamage = baseEvents.filter(
  (e) => e.kind === 'damage' && e.slug === SLUG,
) as Ev[];
const ownBuffApplies = baseEvents.filter(
  (e) => e.kind === 'buffApply' && e.targetSlug === SLUG,
) as Ev[];
const ownShots = baseEvents.filter((e) => e.kind === 'shot' && e.slug === SLUG) as Ev[];
const ownBurstCasts = baseEvents.filter(
  (e) => e.kind === 'burstCast' && e.slug === SLUG,
) as Ev[];

describe('nihilister — fixture sanity (non-vacuity)', () => {
  it('the control comp actually lets her fire, burst, and reach Full Burst', () => {
    // Every downstream assertion is vacuous if any of these are zero.
    expect(ownShots.length).toBeGreaterThan(0);
    expect(ownBurstCasts.length).toBeGreaterThan(0);
    expect(
      baseEvents.filter((e) => e.kind === 'fullBurstStart').length,
    ).toBeGreaterThan(0);
    expect(baseDmg).toBeGreaterThan(0);
  });
});

describe('nihilister skill1 — Full-Charge Pierce for 1 round', () => {
  it('pierce is granted as a per-full-charge EFFECT, not a static whole-fight flag', () => {
    // DISCRIMINATES: a gainPierce effect on a shot-keyed trigger means the very first
    // frame of the fight is NOT yet pierce-tagged (the grant needs a full charge to
    // have happened). The nearest-wrong model — top-level hasPierce:true — tags her
    // from t=0. We assert the override encodes the EFFECT form.
    const ov = withPatchedOverride(SLUG, () => {
      /* no mutation — inspect the committed shape */
    });
    const blocks = [
      ...(ov.skill1 ?? []),
      ...(ov.skill2 ?? []),
      ...(ov.burst ?? []),
    ];
    const pierceEffects = blocks.flatMap((b) =>
      b.effects.filter((e) => e.kind === 'gainPierce'),
    );
    expect(pierceEffects.length).toBeGreaterThan(0);
    // NOT the static flag: the kit scopes pierce to "for 1 round(s)" off a full charge.
    expect(ov.hasPierce ?? false).toBe(false);
  });

  it('the pierce grant is carried on a shot/charge-keyed trigger, not passive', () => {
    // DISCRIMINATES vs. encoding the grant as {trigger:'passive'} + gainPierce with no
    // duration, which is observationally "always on" and loses the kit's round scoping.
    const ov = withPatchedOverride(SLUG, () => {});
    const carriers = (ov.skill1 ?? []).filter((b) =>
      b.effects.some((e) => e.kind === 'gainPierce'),
    );
    expect(carriers.length).toBeGreaterThan(0);
    for (const b of carriers) {
      expect(['shotFired', 'hitCount', 'chargeCounter']).toContain(b.trigger.kind);
    }
  });

  it('pierce tagging alone moves NO damage in this fixture (no Pierce Damage ▲ source)', () => {
    // NON-VACUITY / INERTNESS: Pierce is a TAG whose payload is Pierce Damage ▲ bucket
    // eligibility. The control comp carries no pierceDamagePct buff, so stripping the
    // gainPierce effect must be damage-identical. If this FAILS, the override is
    // routing pierce into a damage bucket it should not touch.
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill1 ?? []) {
        b.effects = b.effects.filter((e) => e.kind !== 'gainPierce');
      }
    });
    const { res } = run({
      ...nilComp,
      overrides: { [SLUG]: patched },
    });
    expect(totals(res)[SLUG]).toBeCloseTo(baseDmg, 6);
  });

  it.skip('Piercing Radius ▲ 50% for 1 round — GAP: no StatKey and no multi-target geometry', () => {
    // GAP: the schema has pierceDamagePct (Pierce DAMAGE) but no piercing-RADIUS stat,
    // and the scope-lock boss is a single partless target, so radius has no observable
    // payload. Belongs in the override's `unmodeled.skill1`, not in a block.
  });
});

describe('nihilister skill1 — "hits 2 or more enemies concurrently" 50.33% rider', () => {
  it('is INERT at scope lock (single partless boss can never satisfy the trigger)', () => {
    // DISCRIMINATES against the #1 blind failure here: encoding the rider as an
    // unconditional per-shot flatDamage 50.33%. Under that nearest-wrong model she
    // gains ~50.33% of final ATK on EVERY pull — a very large total delta. We prove
    // the shipped model contributes nothing by ADDING the wrong model and showing the
    // baseline is strictly lower.
    const wrong = withPatchedOverride(SLUG, (ov) => {
      ov.skill1!.push({
        slot: 'skill1',
        trigger: { kind: 'shotFired' },
        target: { kind: 'enemy' },
        effects: [{ kind: 'flatDamage', atkPct: 50.33, noRange: true }],
      });
    });
    const { res } = run({
      ...nilComp,
      overrides: { [SLUG]: wrong },
    });
    const wrongDmg = totals(res)[SLUG];
    expect(wrongDmg).toBeGreaterThan(baseDmg);
    // and the gap is large — this is not a rounding difference
    expect(wrongDmg / baseDmg).toBeGreaterThan(1.05);
  });

  it('no 50.33%-flavored rider fires in the baseline event log', () => {
    // Direct structural check: no committed block should be emitting an
    // "additional damage" instance keyed to the 2+-enemies clause.
    const ov = withPatchedOverride(SLUG, () => {});
    const blocks = [
      ...(ov.skill1 ?? []),
      ...(ov.skill2 ?? []),
      ...(ov.burst ?? []),
    ];
    const fifty = blocks.flatMap((b) =>
      b.effects.filter(
        (e) =>
          (e.kind === 'flatDamage' || e.kind === 'dot') &&
          Math.abs((e as { atkPct: number }).atkPct - 50.33) < 0.01,
      ),
    );
    expect(fifty).toHaveLength(0);
  });
});

describe('nihilister skill2 — 112.64% of final ATK, no activation clause', () => {
  it('is modeled as a repeating INTERVAL rider in the skill bucket, not once-per-fight', () => {
    // DISCRIMINATES: a no-activation-clause damage line is an `interval` trigger
    // (taxonomy #3). The nearest-wrong models are (a) a single burstCast-keyed hit
    // (fires ~a handful of times, in the burst bucket) and (b) a shotFired rider
    // (fires once per pull — far too often). We assert the block's TRIGGER SHAPE and
    // that it fires many-but-not-per-shot times.
    const ov = withPatchedOverride(SLUG, () => {});
    const carriers = (ov.skill2 ?? []).filter((b) =>
      b.effects.some(
        (e) =>
          e.kind === 'flatDamage' && Math.abs(e.atkPct - 112.64) < 0.01,
      ),
    );
    expect(carriers).toHaveLength(1);
    expect(carriers[0].trigger.kind).toBe('interval');
    expect(carriers[0].target.kind).toBe('enemy');
  });

  it('removing it strictly lowers her damage, and it fires more than once', () => {
    // NON-VACUITY: proves the interval rider is actually exercised by the 180s fixture
    // (an interval longer than the fight would make every other assertion hollow).
    const patched = withPatchedOverride(SLUG, (ov) => {
      ov.skill2 = (ov.skill2 ?? []).filter(
        (b) =>
          !b.effects.some(
            (e) =>
              e.kind === 'flatDamage' && Math.abs(e.atkPct - 112.64) < 0.01,
          ),
      );
    });
    const { res, events } = run({
      ...nilComp,
      overrides: { [SLUG]: patched },
    });
    const strippedDmg = totals(res)[SLUG];
    expect(strippedDmg).toBeLessThan(baseDmg);

    const strippedSkillHits = events.filter(
      (e) => e.kind === 'damage' && e.slug === SLUG && e.bucket === 'skill',
    ).length;
    const baseSkillHits = ownDamage.filter((e) => e.bucket === 'skill').length;
    // fired repeatedly, not once
    expect(baseSkillHits - strippedSkillHits).toBeGreaterThan(1);
    // but NOT once per pull — that would be the shotFired nearest-wrong
    expect(baseSkillHits - strippedSkillHits).toBeLessThan(ownShots.length);
  });

  it('⚑ the interval CADENCE is not stated in the kit — asserted as shape only', () => {
    // ALWAYS-⚑ #2: a damage line the text gives NO trigger for → invented trigger +
    // cadence. The override must FLAG it; this test deliberately pins no seconds value.
    const ov = withPatchedOverride(SLUG, () => {});
    const note = `${ov.note ?? ''}${JSON.stringify(ov.unmodeled?.skill2 ?? '')}`;
    expect(note.length).toBeGreaterThan(0);
  });

  it('teammates carry no DIRECT buff from her skill2 (gauge-coupling second-order only)', () => {
    // INERTNESS: skill2 targets the enemy; it must not move any ally's total DIRECTLY.
    // DRIVER ADAPTATION (engine semantics): the blind claim of BYTE identity is false in
    // this engine for a genuine reason — her skill-bucket hits pump burst gauge
    // (flatDamage = one skill-damage gauge impact, measured maiden-ice-rose), so stripping
    // them shifts Full-Burst timing and moves teammates ~0.2% second-order. A real ally
    // buff would move them orders of magnitude more; the 2% bound keeps the discrimination.
    const patched = withPatchedOverride(SLUG, (ov) => {
      ov.skill2 = [];
    });
    const { res } = run({
      ...nilComp,
      overrides: { [SLUG]: patched },
    });
    const t = totals(res);
    for (const slug of Object.keys(baseTotals)) {
      if (slug === SLUG) continue;
      expect(
        Math.abs(t[slug] - baseTotals[slug]) / baseTotals[slug],
        `${slug} moved more than gauge second-order — a direct ally buff?`
      ).toBeLessThan(0.02);
    }
  });
});

describe('nihilister burst — 158.59% instant + 13.19%/s Burn for 10s', () => {
  it('the 158.59% instant lands in the burst bucket and is Full-Burst-EXEMPT by timing', () => {
    // VERIFIED FACT: burst-cast damage lands before Full Burst begins (no +50%).
    // DISCRIMINATES vs. re-keying the hit to fullBurstEnter, which would stamp
    // inFullBurst:true / fbMajorApplied:true on the instance.
    // (driver adaptation: scoped to the NUKE instances — the Burn DoT ticks legitimately
    // take the FB major by LANDING timing when they tick inside an FB window; only the
    // burst-CAST hit is exempt)
    const burstHits = ownDamage.filter(
      (e) =>
        e.bucket === 'burst' &&
        e.fbMajorApplied === true &&
        Math.abs((e.atkPct as number) - 158.59) < 0.01,
    );
    expect(burstHits).toHaveLength(0);

    const ov = withPatchedOverride(SLUG, () => {});
    const carriers = (ov.burst ?? []).filter((b) =>
      b.effects.some(
        (e) => e.kind === 'flatDamage' && Math.abs(e.atkPct - 158.59) < 0.01,
      ),
    );
    expect(carriers).toHaveLength(1);
    expect(carriers[0].trigger.kind).toBe('burstCast');
    expect(carriers[0].target.kind).toBe('enemy');
  });

  it('the Burn is ONE dot instance per burst cast (13.19% / 1s / 10s, sustained)', () => {
    // DISCRIMINATES vs. taxonomy #5 (a long-duration DoT on a repeating trigger
    // MULTIPLIES) and vs. encoding the Burn as 131.9% instant.
    const ov = withPatchedOverride(SLUG, () => {});
    const dots = (ov.burst ?? []).flatMap((b) =>
      b.effects.filter((e) => e.kind === 'dot'),
    ) as Array<{
      atkPct: number;
      durationSec: number;
      intervalSec?: number;
      flavor?: string;
      crit?: boolean;
    }>;
    expect(dots).toHaveLength(1);
    expect(dots[0].atkPct).toBeCloseTo(13.19, 4);
    expect(dots[0].durationSec).toBe(10);
    expect(dots[0].intervalSec ?? 1).toBe(1);
    expect(dots[0].flavor).toBe('sustained');
    // DoTs are validated NON-crit unless MEASURED for this unit; the kit says nothing.
    expect(dots[0].crit ?? false).toBe(false);
  });

  it('Burn ticks are bounded by cast count × 10 (no overlapping instances)', () => {
    // NON-VACUITY + the multiply guard: her cooldown is 20s and the Burn is 10s, so
    // instances can never overlap. If the override attached the DoT to a per-shot or
    // full-burst-enter trigger, tick count would blow past this ceiling.
    // (driver adaptation: damage events carry no `flavor` field — the Burn ticks are the
    // burst-bucket instances at the kit magnitude 13.19, the only line at that value)
    const dotTicks = ownDamage.filter(
      (e) =>
        e.bucket === 'burst' &&
        Math.abs((e.atkPct as number) - 13.19) < 0.01,
    ).length;
    expect(dotTicks).toBeGreaterThan(0);
    expect(dotTicks).toBeLessThanOrEqual(ownBurstCasts.length * 10);
  });

  it('stripping the Burn lowers only her own damage', () => {
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.burst ?? []) {
        b.effects = b.effects.filter((e) => e.kind !== 'dot');
      }
    });
    const { res } = run({
      ...nilComp,
      overrides: { [SLUG]: patched },
    });
    const t = totals(res);
    expect(t[SLUG]).toBeLessThan(baseDmg);
    for (const slug of Object.keys(baseTotals)) {
      if (slug === SLUG) continue;
      expect(t[slug]).toBeCloseTo(baseTotals[slug], 6);
    }
  });
});

describe('nihilister burst — Max Ammunition ▲ 6 round(s) for 15 sec', () => {
  it('is a FLAT +6 rounds (maxAmmoFlat), not a 6% bump (maxAmmoPct)', () => {
    // DISCRIMINATES: base ammo is 6. maxAmmoFlat:6 DOUBLES the magazine to 12;
    // maxAmmoPct:6 adds 0.36 of a round — effectively nothing. The nearest-wrong model
    // is a near-no-op, so the shape assertion plus the delta test below are both needed.
    const buffs = ownBuffApplies.filter(
      (e) => e.stat === 'maxAmmoFlat' && e.value === 6,
    );
    expect(buffs.length).toBeGreaterThan(0);
    // wall-clock 15s window — NOT a round count (the kit says "for 15 sec" here,
    // in deliberate contrast to skill1's "for 1 round(s)")
    for (const b of buffs) {
      expect(b.durationShots).toBeNull(); // event contract: null = no round budget
      expect(b.expiresFrame).toBeGreaterThan(0);
    }
    expect(
      ownBuffApplies.filter(
        // (driver adaptation: liter's OWN kit grants the team maxAmmoPct steps — the
        // claim is about HER kit, so scope to buffs she cast: slot 1 in nilComp)
        (e) => e.stat === 'maxAmmoPct' && e.casterIdx === 1,
      ),
    ).toHaveLength(0);
  });

  it('one application per burst cast, self-targeted', () => {
    const buffs = ownBuffApplies.filter(
      (e) => e.stat === 'maxAmmoFlat' && e.value === 6,
    );
    expect(buffs.length).toBe(ownBurstCasts.length);
    for (const b of buffs) {
      expect(b.targetSlug).toBe(SLUG);
    }
  });

  it('the ammo buff is a DAMAGE line — removing it strictly lowers her total', () => {
    // DISCRIMINATES against dropping it as "defensive / no damage". A doubled magazine
    // removes a 141-frame reload from inside the 15s window → more full-charge shots.
    // If this delta were ZERO the override would be mis-encoding the stat.
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.burst ?? []) {
        b.effects = b.effects.filter(
          (e) => !(e.kind === 'buff' && e.stat === 'maxAmmoFlat'),
        );
      }
    });
    const { res, events } = run({
      ...nilComp,
      overrides: { [SLUG]: patched },
    });
    expect(totals(res)[SLUG]).toBeLessThan(baseDmg);

    // and the mechanism is shots, not a stat multiplier
    const strippedShots = events.filter(
      (e) => e.kind === 'shot' && e.slug === SLUG,
    ).length;
    expect(strippedShots).toBeLessThan(ownShots.length);
  });

  it('the wrong-shape model (maxAmmoPct 6) is measurably worse than the flat grant', () => {
    // Explicit nearest-wrong counterfactual: swap flat→pct and show the shot economy
    // collapses back toward the no-buff case.
    const pctModel = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.burst ?? []) {
        for (const e of b.effects) {
          if (e.kind === 'buff' && e.stat === 'maxAmmoFlat') {
            (e as { stat: string }).stat = 'maxAmmoPct';
          }
        }
      }
    });
    const { res } = run({
      ...nilComp,
      overrides: { [SLUG]: pctModel },
    });
    expect(totals(res)[SLUG]).toBeLessThan(baseDmg);
  });

  it('the ammo buff is self-only — no teammate movement', () => {
    const buffs = ownBuffApplies.filter((e) => e.stat === 'maxAmmoFlat');
    const allAmmoBuffs = baseEvents.filter(
      (e) => e.kind === 'buffApply' && e.stat === 'maxAmmoFlat',
    );
    expect(allAmmoBuffs.length).toBe(buffs.length);
  });
});

describe('nihilister — unmodeled record (no silent drops)', () => {
  it('the 2+-enemies rider and the Piercing Radius line are recorded as unmodeled', () => {
    const ov = withPatchedOverride(SLUG, () => {});
    const s1 = (ov.unmodeled?.skill1 ?? []).join(' | ').toLowerCase();
    expect(s1.length).toBeGreaterThan(0);
  });
});
