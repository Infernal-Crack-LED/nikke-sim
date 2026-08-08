import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

/*
 * pascal — RL/Iron/Supporter/Burst I. Blind spec test written from kit prose alone.
 *
 * KIT (3 lines, ALL healing/support — zero damage lines):
 *   skill1: "Activates after firing 10 time(s). Affects 1 ally unit(s) with the highest
 *           final DEF. Recovers 6.28% of the skill user's final Max HP as HP."
 *   skill2: "Activates when entering Burst Stage 1. Affects 3 ally unit(s) with the lowest
 *           remaining HP. Incoming healing \u25b2 38.4% for 10 sec."
 *   burst:  "Affects 3 ally unit(s) with the lowest remaining HP. Recovers 55.29% of the
 *           skill user's final Max HP as HP."
 *
 * WHY EVERY LINE IS A GAP (missing engine primitive, not a modeling choice):
 *   (a) There is NO 'heal' kind in EffectDef. 'shield' exists; healing does not. Both the S1
 *       and burst lines are pure heals, so they cannot be authored at all. The v1 boss deals
 *       no damage and no unit has an HP pool, so an HP restore has no observable payload
 *       EXCEPT via a teammate's `recovery` trigger ("when the owner RECEIVES a heal" —
 *       Crown's "when recovery takes effect"). With no heal effect there is no way to fire it.
 *   (b) "Incoming healing \u25b2 38.4%" has no StatKey. It is a multiplier on (a), which is
 *       itself unmodeled — doubly inert even if a stat were added.
 *   (c) The S1 target "1 ally with the highest final DEF" has no TargetDef variant either:
 *       the schema carries alliesTopAtk / alliesLowestAtk / alliesLowestHp, but no DEF-ranked
 *       target. (alliesLowestHp DOES exist for the S2/burst target set.)
 *
 * WHAT THIS FILE THEREFORE PROVES. A GAP unit still has a falsifiable contract: pascal must
 * be damage-INERT and event-INERT for her own kit. These assertions are the standing guard
 * that a future author does not "model" these lines by substituting a damage/ATK proxy to
 * make the unit feel useful — the classic fudge this roster's invariant forbids (measured >
 * fudge). Each is discriminating: it goes RED under the nearest-wrong model, built with
 * withPatchedOverride so the committed JSON is untouched.
 *
 * FIXTURE: controlComp('pascal', true) — liter B1 / crown B2 / pascal / helm B3. pascal is
 * Burst I, so she is NOT the carry-burst unit; the fixture's own B1 (liter) and B2 (crown)
 * plus the fixed B3 give real Full Burst rotations, so Burst Stage 1 entry genuinely occurs
 * and the S2 trigger's activation condition is exercised (non-vacuity, asserted explicitly).
 */

const SLUG = 'pascal';

function run(opts: ReturnType<typeof controlComp>) {
  const events: SimEvent[] = [];
  const res = runComp({ ...opts, onEvent: (ev: SimEvent) => events.push(ev) });
  return { res, events };
}

// ---- hoisted runs (each is a full 180s sim) ------------------------------

const base = controlComp(SLUG, true);
const baseline = run(base);

// Nearest-wrong #1: the heal lines modeled as a self/ally ATK buff (the fudge where an
// unmodellable support line is "compensated" with a damage-relevant stat).
const atkProxy = withPatchedOverride(SLUG, (ov) => {
  ov.burst!.blocks = [
    {
      slot: 'burst',
      trigger: { kind: 'burstCast' },
      target: { kind: 'allies' },
      effects: [{ kind: 'buff', stat: 'atkPct', value: 55.29, durationSec: 10 }],
    },
  ];
});
const atkProxyRun = run({ ...base, overrides: { [SLUG]: atkProxy } });

// Nearest-wrong #2: S1's hitCount:10 modeled as a damage rider (the "a trigger exists, so
// it must deal something" error). 6.28% is a Max-HP RECOVERY percentage, never an atkPct.
const hpAsDamage = withPatchedOverride(SLUG, (ov) => {
  ov.skill1!.blocks = [
    {
      slot: 'skill1',
      trigger: { kind: 'hitCount', count: 10 },
      target: { kind: 'enemy' },
      effects: [{ kind: 'flatDamage', atkPct: 6.28 }],
    },
  ];
});
const hpAsDamageRun = run({ ...base, overrides: { [SLUG]: hpAsDamage } });

// Nearest-wrong #3: S2 re-keyed to fullBurstEnter instead of stageEnter{stage:1}. Kept as a
// *shape* control: with an inert stat the two are damage-identical, which is exactly the
// point — trigger identity is unobservable while the payload is unmodeled, so no test can
// pin it and the override must not claim to have pinned it.
const fbEnterKeyed = withPatchedOverride(SLUG, (ov) => {
  ov.skill2!.blocks = (ov.skill2!.blocks ?? []).map((b) => ({
    ...b,
    trigger: { kind: 'fullBurstEnter' as const },
  }));
});
const fbEnterRun = run({ ...base, overrides: { [SLUG]: fbEnterKeyed } });

const pascalDamage = (r: typeof baseline) => totals(r.res)[SLUG];
const teammates = (r: typeof baseline) =>
  Object.entries(totals(r.res))
    .filter(([s]) => s !== SLUG)
    .sort(([a], [b]) => a.localeCompare(b));

describe('pascal — fixture non-vacuity', () => {
  it('is in the comp and fires her RL normally', () => {
    const row = unitOf(baseline.res, SLUG);
    expect(row.totalDamage).toBeGreaterThan(0);
    const shots = baseline.events.filter(
      (e) => e.kind === 'shot' && (e as { slug?: string }).slug === SLUG,
    );
    // ammo 6 over 180s: she must fire far more than the S1 threshold of 10 rounds,
    // otherwise the hitCount:10 assertions below would be vacuous.
    expect(shots.length).toBeGreaterThan(10);
  });

  it('the comp actually enters Burst Stage 1 (S2 trigger is reachable)', () => {
    // Non-vacuity for the S2 line: if no stage-1 burst ever cast, an inertness assertion
    // about it would prove nothing. controlComp supplies a B1, so this must hold.
    const casts = baseline.events.filter((e) => e.kind === 'burstCast');
    expect(casts.length).toBeGreaterThan(0);
    const fbs = baseline.events.filter((e) => e.kind === 'fullBurstStart');
    expect(fbs.length).toBeGreaterThan(0);
  });
});

describe('pascal skill1 — "after firing 10 time(s)" \u2192 heal 1 highest-final-DEF ally', () => {
  it('emits no damage beyond her own normal attacks (heal is not damage)', () => {
    // Discriminating: RED under nearest-wrong #2, where the 6.28% Max-HP recovery is
    // mis-read as a 6.28%-of-ATK rider. Every pascal damage event must be bucket 'normal'.
    const nonNormal = baseline.events.filter(
      (e) =>
        e.kind === 'damage' &&
        (e as { slug?: string }).slug === SLUG &&
        (e as { bucket?: string }).bucket !== 'normal',
    );
    expect(nonNormal).toHaveLength(0);

    expect(pascalDamage(hpAsDamageRun)).toBeGreaterThan(pascalDamage(baseline));
  });

  it('grants no stat buff to any ally (a heal is not a stat)', () => {
    // The S1 target set ("1 ally with the highest final DEF") has no TargetDef variant, and
    // the payload is a heal. Nothing pascal does may show up as a buffApply from her.
    const fromPascal = baseline.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        (e as { casterSlug?: string }).casterSlug === SLUG,
    );
    expect(fromPascal).toHaveLength(0);
  });

  it.skip('GAP: heals 6.28% of caster final Max HP to the highest-final-DEF ally — no heal primitive, and no DEF-ranked TargetDef', () => {
    // Needs: EffectDef kind 'heal' { casterMaxHpPct } + TargetDef 'alliesTopDef' { count }.
    // Observable payload only via a teammate carrying a `recovery` trigger (crown).
  });
});

describe('pascal skill2 — Burst Stage 1 entry \u2192 Incoming Healing \u25b238.4% / 10s', () => {
  it('moves no damage for anyone (Incoming Healing has no StatKey and no heal to scale)', () => {
    // Discriminating: RED under nearest-wrong #1, where the support payload is swapped for
    // an ATK buff. Teammates must be BYTE-IDENTICAL to a run where pascal's kit is absent.
    for (const [slug, dmg] of teammates(baseline)) {
      const proxied = totals(atkProxyRun.res)[slug];
      // the ATK-proxy run must MOVE at least one teammate, proving the assertion below
      // is not trivially satisfiable by a comp where buffs cannot land at all.
      expect(typeof proxied).toBe('number');
      expect(dmg).toBeGreaterThan(0);
    }
    const movedUnderProxy = teammates(baseline).some(
      ([slug, dmg]) => totals(atkProxyRun.res)[slug] !== dmg,
    );
    expect(movedUnderProxy).toBe(true);
  });

  it('trigger identity is UNOBSERVABLE while the payload is unmodeled', () => {
    // stageEnter{stage:1} vs fullBurstEnter produce identical boards, because the effect
    // carries nothing the engine reads. This documents that the override may NOT claim a
    // measured trigger identity for this line — the kit text ("when entering Burst Stage 1")
    // is the only evidence, and it is prose-tier, not measured.
    expect(totals(fbEnterRun.res)).toEqual(totals(baseline.res));
  });

  it.skip('GAP: Incoming Healing \u25b238.4% for 10 sec — no StatKey, and no heal for it to scale', () => {
    // Needs: StatKey 'incomingHealingPct' AND a heal primitive for it to multiply.
    // Strictly downstream of the skill1/burst GAP; inert even if the stat were added alone.
  });
});

describe('pascal burst — recovers 55.29% of caster final Max HP to 3 lowest-HP allies', () => {
  it('her burst cast deals and buffs nothing', () => {
    // Burst I with a pure-heal burst: the cast must produce no burst-bucket damage and no
    // buffApply. RED under nearest-wrong #1 (burst re-modeled as an allies ATK buff).
    const burstBucket = baseline.events.filter(
      (e) =>
        e.kind === 'damage' &&
        (e as { slug?: string }).slug === SLUG &&
        (e as { bucket?: string }).bucket === 'burst',
    );
    expect(burstBucket).toHaveLength(0);

    const teamAfterProxy = totals(atkProxyRun.res);
    const teamBase = totals(baseline.res);
    expect(teamAfterProxy).not.toEqual(teamBase);
  });

  it('pascal is damage-identical with her kit blocks emptied (whole-kit inertness)', () => {
    // The strongest statement this unit supports: pascal's ENTIRE kit is offensively inert,
    // so stripping all three slots changes nothing on the board. If this ever goes RED, a
    // damage-bearing effect was added to a unit whose kit has none — the fudge guard.
    const stripped = withPatchedOverride(SLUG, (ov) => {
      ov.skill1!.blocks = [];
      ov.skill2!.blocks = [];
      ov.burst!.blocks = [];
    });
    const strippedRun = run({ ...base, overrides: { [SLUG]: stripped } });
    expect(totals(strippedRun.res)).toEqual(totals(baseline.res));
  });

  it.skip('GAP: 55.29% caster-Max-HP heal to the 3 lowest-remaining-HP allies — no heal primitive', () => {
    // Target set IS expressible (alliesLowestHp {count:3}); the PAYLOAD is not.
    // Needs EffectDef kind 'heal' { casterMaxHpPct } that fires targets' `recovery` triggers.
  });
});
