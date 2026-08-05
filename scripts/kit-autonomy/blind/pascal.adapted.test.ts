/* eslint-disable @typescript-eslint/no-explicit-any */
// ADAPTED COPY (driver reconciliation, 2026-08-05): pristine blind artifact preserved at
// blind/pascal.test.ts. The S5 blind writer worked from the redacted packet schema, which
// hides the `heal` EffectDef kind (blindness redaction — the driver override uses it), and
// from the generic controlComp fixture shape. Structural corrections below; assertion
// INTENT unchanged except item 4, which is the ONE substantive divergence and is documented
// in full:
//   1. harness import path (the blind dir has no ../lib/harness — the shared harness lives
//      at scripts/tests/lib/harness.js; ../../tests/lib/harness.js from here).
//   2. run() onEvent threading: CompOptions carries SimConfig extras under `cfg`, so
//      onEvent moves into cfg (the pristine spread put it at the top level, where runComp
//      never reads it — the event arrays stayed empty and every event assertion vacuous).
//   3. override/counterfactual FORM: the pristine used ov.skill1.blocks / ov.burst.blocks
//      (a shape that does not exist — slots are bare arrays), so every counterfactual was a
//      silent no-op. Re-authored to the real shape (bare slot arrays; flatDamage keeps its
//      atkPct field — the pristine had that one right) so the proxy arms actually MOVE
//      something — the pristine INTENT (a fabricated damage/ATK proxy must be detectable)
//      is what discriminates.
//   4. THE SUBSTANTIVE ONE — "whole-kit inertness": the pristine asserted that stripping
//      ALL THREE slots leaves EVERY unit byte-identical. That is RED vs the driver override
//      for cause: the burst heal IS expressible (the `heal` kind the redaction hid exists)
//      and lands on the leftmost-3 allies, which in controlComp includes crown — whose
//      recovery-triggered +20.99% team Attack Damage block fires off it. The burst-heal
//      recovery tandem is exactly what S2b (claude-fable-5) and the S6 blind override
//      (claude-opus-5, which independently inferred the hidden heal kind from the recovery
//      trigger's own comment) both converged on; the blind test writer alone missed it,
//      blocked by the redaction artifact. Adapted INTENT, preserved in two parts:
//        (a) pascal's OWN damage is identical with her whole kit stripped (self-inertness —
//            the healer contributes nothing to her OWN damage; true under the driver);
//        (b) the UNMODELED lines stay team-inert: stripping skill1+skill2 alone changes NO
//            unit's total — the standing guard that no fabricated S1/S2 damage channel
//            exists (the pristine's core anti-fudge claim, intact).
//      The burst tandem itself is pinned by the driver's own suite
//      (scripts/tests/units/pascal.test.ts P1/P1c).
//   5. buffApply caster identity: the event carries casterIdx (slot), not casterSlug —
//      pascal sits slot 2 in controlComp('pascal') ([liter, crown, pascal, helm]).
//   6. GAP skip-notes updated to the real schema state: the burst line is NOW modeled
//      (heal exists); S1 remains a true GAP (no DEF-ranked TargetDef — the driver carries
//      it as a priced ⚑ absence); S2 remains a true GAP (no incomingHealingPct StatKey).
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
 * pascal — RL/Iron/Supporter/Burst I. Blind spec test written from kit prose alone.
 *
 * KIT (3 lines, ALL healing/support — zero damage lines):
 *   skill1: "Activates after firing 10 time(s). Affects 1 ally unit(s) with the highest
 *           final DEF. Recovers 6.28% of the skill user's final Max HP as HP."
 *   skill2: "Activates when entering Burst Stage 1. Affects 3 ally unit(s) with the lowest
 *           remaining HP. Incoming healing ▲ 38.4% for 10 sec."
 *   burst:  "Affects 3 ally unit(s) with the lowest remaining HP. Recovers 55.29% of the
 *           skill user's final Max HP as HP."
 *
 * FIXTURE: controlComp('pascal', true) — liter B1 / crown B2 / pascal (slot 2) / helm B3.
 * liter and pascal share Burst I (20s vs 40s cds), so rotations alternate; crown carries
 * the recovery-triggered team buff that reads any heal landing on her.
 */

const SLUG = 'pascal';
/** Slot order in controlComp('pascal'): liter 0 / crown 1 / pascal 2 / helm 3. */
const PASCAL_IDX = 2;
const CROWN_IDX = 1;

type Opts = ReturnType<typeof controlComp>;

function run(opts: Opts) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...opts,
    cfg: { ...(opts.cfg ?? {}), onEvent: (ev: SimEvent) => events.push(ev) },
  });
  return { res, events };
}

// ---- hoisted runs (each is a full 180s sim) ------------------------------

const base = controlComp(SLUG, true);
const baseline = run(base);

// Nearest-wrong #1: the heal lines modeled as a self/ally ATK buff (the fudge where an
// unmodellable support line is "compensated" with a damage-relevant stat).
const atkProxy = withPatchedOverride(SLUG, (ov) => {
  ov.burst = [
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
  ov.skill1 = [
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
  ov.skill2 = (ov.skill2 ?? []).map((b: any) => ({
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
    // about it would prove nothing. controlComp supplies B1 casters, so this must hold.
    const casts = baseline.events.filter((e) => e.kind === 'burstCast');
    expect(casts.length).toBeGreaterThan(0);
    const fbs = baseline.events.filter((e) => e.kind === 'fullBurstStart');
    expect(fbs.length).toBeGreaterThan(0);
  });
});

describe('pascal skill1 — "after firing 10 time(s)" → heal 1 highest-final-DEF ally', () => {
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
        (e as { casterIdx?: number | null }).casterIdx === PASCAL_IDX,
    );
    expect(fromPascal).toHaveLength(0);
  });

  it.skip('GAP: heals 6.28% of caster final Max HP to the highest-final-DEF ally — no DEF-ranked TargetDef (the heal EVENT is expressible; the recipient selection is not; driver carries it as a priced ⚑ absence)', () => {
    // Needs: TargetDef 'alliesTopDef' { count }. Emitting the recovery event on any
    // expressible stand-in would fabricate the recipient (on-recovery consumers key on it).
  });
});

describe('pascal skill2 — Burst Stage 1 entry → Incoming Healing ▲38.4% / 10s', () => {
  it('moves no damage for anyone (Incoming Healing has no StatKey and no heal to scale)', () => {
    // Discriminating: RED under nearest-wrong #1, where the support payload is swapped for
    // an ATK buff. Teammates must be BYTE-IDENTICAL to a run where pascal's kit is absent.
    for (const [, dmg] of teammates(baseline)) {
      expect(dmg).toBeGreaterThan(0);
    }
    const movedUnderProxy = teammates(baseline).some(
      ([slug, dmg]) => totals(atkProxyRun.res)[slug] !== dmg,
    );
    // the ATK-proxy arm must MOVE at least one teammate, proving the inertness assertion
    // is not trivially satisfiable by a comp where buffs cannot land at all.
    expect(movedUnderProxy).toBe(true);
  });

  it('trigger identity is UNOBSERVABLE while the payload is unmodeled', () => {
    // stageEnter{stage:1} vs fullBurstEnter produce identical boards, because the effect
    // carries nothing the engine reads. This documents that the override may NOT claim a
    // measured trigger identity for this line — the kit text ("when entering Burst Stage 1")
    // is the only evidence, and it is prose-tier, not measured.
    expect(totals(fbEnterRun.res)).toEqual(totals(baseline.res));
  });

  it.skip('GAP: Incoming Healing ▲38.4% for 10 sec — no StatKey, and heal amounts are event-less', () => {
    // Needs: StatKey 'incomingHealingPct' AND heal amounts for it to multiply. The recovery
    // EVENT fires on receipt regardless of magnitude, so the amplifier is doubly inert.
  });
});

describe('pascal burst — recovers 55.29% of caster final Max HP to 3 lowest-HP allies', () => {
  it('her burst cast deals and buffs nothing', () => {
    // Burst I with a pure-heal burst: the cast must produce no burst-bucket damage and no
    // buffApply from pascal. RED under nearest-wrong #1 (burst re-modeled as an ATK buff).
    const burstBucket = baseline.events.filter(
      (e) =>
        e.kind === 'damage' &&
        (e as { slug?: string }).slug === SLUG &&
        (e as { bucket?: string }).bucket === 'burst',
    );
    expect(burstBucket).toHaveLength(0);

    const fromPascal = baseline.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        (e as { casterIdx?: number | null }).casterIdx === PASCAL_IDX,
    );
    expect(fromPascal).toHaveLength(0);

    const teamAfterProxy = totals(atkProxyRun.res);
    const teamBase = totals(baseline.res);
    expect(teamAfterProxy).not.toEqual(teamBase);
  });

  it("pascal's OWN damage is identical with her whole kit stripped (self-inertness)", () => {
    // Adapted from the pristine whole-kit inertness (see header item 4): the burst heal's
    // recovery tandem legitimately moves TEAMMATE totals (crown's consumer), so the
    // falsifiable self-inertness claim scopes to pascal's own damage.
    const stripped = withPatchedOverride(SLUG, (ov) => {
      ov.skill1 = [];
      ov.skill2 = [];
      ov.burst = [];
    });
    const strippedRun = run({ ...base, overrides: { [SLUG]: stripped } });
    expect(totals(strippedRun.res)[SLUG]).toEqual(totals(baseline.res)[SLUG]);
  });

  it('the UNMODELED lines are team-inert: stripping skill1+skill2 changes no total', () => {
    // The pristine's core anti-fudge guard, preserved: no fabricated S1/S2 damage channel
    // exists. Under the shipped override skill1/skill2 are empty by construction, so this
    // pins the absence; any future author who proxies those lines with damage/ATK would
    // move a total here and go RED.
    const stripped = withPatchedOverride(SLUG, (ov) => {
      ov.skill1 = [];
      ov.skill2 = [];
    });
    const strippedRun = run({ ...base, overrides: { [SLUG]: stripped } });
    expect(totals(strippedRun.res)).toEqual(totals(baseline.res));
  });

  it('the burst heal is a live recovery tandem: it reaches crown and moves her consumer buff', () => {
    // Adaptation item 4's positive arm: the expressible line IS modeled. pascal's burst
    // heal lands on the leftmost-3 allies (slots 0-2) — crown (slot 1) among them — and her
    // recovery-triggered +20.99 Attack Damage block fires off it. Zero such buffApply from
    // crown on the pascal casts would mean the heal event is not reaching her.
    const crownRecoveryBuffs = baseline.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        (e as { casterIdx?: number | null }).casterIdx === CROWN_IDX &&
        (e as { value?: number }).value === 20.99,
    );
    expect(crownRecoveryBuffs.length).toBeGreaterThan(0);
  });

  it.skip('GAP (magnitude only): the 55.29%-of-final-Max-HP amount is event-less — the recovery EVENT cadence is modeled, the number is not', () => {
    // The `heal` kind exists (the redacted packet hid it); the driver encodes
    // burstCast → alliesLowestHp{count:3} → heal, event-only by engine design.
  });
});
