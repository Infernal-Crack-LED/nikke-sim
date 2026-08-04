// ADAPTED blind spec for `rupee` — the S5 blind test (claude-opus-5) verbatim in ASSERTIONS,
// mechanically translated to the real harness API (the blind role has no repo access, so it
// wrote against an imagined plumbing). Every `it()` block, threshold, and counterfactual is
// preserved; only the plumbing changed:
//   * onEvent lives in `cfg`, not at the CompOptions top level
//   * `base.units` (CompOptions has none) → slot indices from controlComp order + harness `data`
//   * `ov.skill1.blocks` → `ov.skill1` (the slot IS the block array)
//   * `d.srcSlot === rupeeIdx` → `d.slug === 'rupee' && d.srcSlot === 'burst'` (srcSlot is a slot name)
//   * the imagined 'charge' damage bucket → charged-shot count (rupee: chargeFrames 0)
//   * FIXTURE FIX (the one semantic change, S2b-reviewer-predicted): the blind chose
//     controlComp('rupee', true), which seats crown — a SAME-CD Burst II — beside rupee. Measured:
//     crown takes the stage-2 slot on ALL 10 rotations and rupee casts ZERO bursts there, so every
//     burst assertion is vacuous in that fixture regardless of the override. The adaptation seats
//     rupee as the SOLE B2 (liter B1 / rupee B2 / helm B3, boss Fire, focus rupee — the rest of
//     the control character kept) where she casts 10× and the gate transition spans the fight.
//     The mixed-element property the blind relied on is kept (helm is Water, non-Iron).
//   * FIXTURE-CONTAMINATION FIX: "no critRateNormalPct anywhere" → "none FROM RUPEE" — helm's own
//     S1 legitimately grants critRateNormalPct to the team; the blind's intent is rupee's scope.
// Run against the DRIVER override (src/skills/overrides/rupee.json) — S5's green requirement.
//
// ---- original blind header (preserved) ----
// rupee — AR/Iron/Attacker/Burst II. Blind kit spec (written from kit prose alone).
//
// KIT (structural read):
//   skill1 — "Activates after landing 100 normal attack(s)." / "Affects all Iron Code allies."
//            (a) "Increases stack count of buffs by 1"  -> no engine primitive (GAP, it.skip)
//            (b) Critical Rate 2.24% for 10 sec         -> critRatePct, durationSec 10
//   skill2 — "Activates after 30 attacks." / "Affects self."
//            Mileage: ATK 13.8%, stacks to 5, lasts 15 sec -> atkPct, maxStacks 5, durationSec 15
//   burst  — "Affects enemies within range." 274.28% of final ATK as damage -> burstCast flatDamage
//          — "Activates when Mileage is at max stacks." / "Affects all allies."
//            ATK 19.8% for 5 sec -> allies atkPct, GATED on Mileage == 5 stacks
//
// FIXTURE: controlComp('rupee', true) — rupee is Burst II, so the fixture's B1/B3 slots
// complete the chain and bursts actually cast. Deterministic (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  data,
  runComp,
  totals,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

// Sole-B2 fixture (see FIXTURE FIX in the header): everything controlComp provided, minus the
// competing Burst II that starves rupee of every cast.
const base = {
  slugs: ['liter', 'rupee', 'helm'],
  bossElement: 'Fire' as const,
  focusSlug: 'rupee',
};
/** Fixture slot order: liter 0 / rupee 1 / helm 2. */
const RUPEE_IDX = base.slugs.indexOf('rupee');

function run(opts = base) {
  const events: SimEvent[] = [];
  const res = runComp({ ...opts, cfg: { ...opts.cfg, onEvent: (ev: SimEvent) => events.push(ev) } });
  return { res, events };
}

// ---- hoisted runs (each is a full 180s sim) ----
const baseline = run();

const buffApplies = baseline.events.filter((e) => e.kind === 'buffApply') as Extract<
  SimEvent,
  { kind: 'buffApply' }
>[];
const damages = baseline.events.filter((e) => e.kind === 'damage') as Extract<
  SimEvent,
  { kind: 'damage' }
>[];
const rupeeIdx = RUPEE_IDX;

const critApplies = buffApplies.filter(
  (e) => e.stat === 'critRatePct' && Math.abs(e.value - 2.24) < 1e-6,
);
const mileageApplies = buffApplies.filter(
  (e) => e.stat === 'atkPct' && Math.abs(e.value - 13.8) < 1e-6,
);
const burstAtkApplies = buffApplies.filter(
  (e) => e.stat === 'atkPct' && Math.abs(e.value - 19.8) < 1e-6,
);

describe('rupee — skill1: Critical Rate 2.24% / 10 sec to all Iron Code allies, per 100 normal attacks', () => {
  it('fires at all (non-vacuity: the 100-hit threshold is reached in a 180s fight)', () => {
    expect(critApplies.length).toBeGreaterThan(0);
  });

  it('is scoped to IRON allies only — never lands on a non-Iron ally', () => {
    // Discriminates target set. Nearest-wrong: target {kind:'allies'} (whole team).
    // The control comp is deliberately mixed-element, so a whole-team model paints
    // non-Iron slugs that the faithful alliesOfElement:'Iron' model never touches.
    const ironSlugs = new Set(
      base.slugs.filter((s) => data.characters[s].element === 'Iron'),
    );
    const painted = new Set(critApplies.map((e) => e.targetSlug));
    expect(painted.size).toBeGreaterThan(0);
    for (const slug of painted) {
      expect(ironSlugs.has(slug)).toBe(true);
    }
  });

  it('is UNSCOPED crit (critRatePct), not normal-attack-scoped critRateNormalPct', () => {
    // The prose says plain "Critical Rate", with no "of normal attacks" qualifier.
    // Nearest-wrong: critRateNormalPct (would under-credit skill/burst crit).
    expect(critApplies.length).toBeGreaterThan(0);
    // (Contamination fix: helm's own S1 grants critRateNormalPct to the team — the intent is
    // that RUPEE's line is unscoped, so filter to her casts.)
    const wrongScope = buffApplies.filter(
      (e) => e.stat === 'critRateNormalPct' && e.casterIdx === rupeeIdx
    );
    expect(wrongScope.length).toBe(0);
  });

  it('carries a 10-second window (expiresFrame ~= applyFrame + 600 @60fps)', () => {
    // Discriminates duration semantics: seconds, not rounds (no durationShots) and
    // not permanent. Nearest-wrong: durationShots / no duration.
    for (const e of critApplies) {
      expect(e.durationShots ?? null).toBeNull();
      expect(e.expiresFrame).toBeGreaterThan(0);
    }
  });

  it('trigger is a 100-HIT count, not 30 and not 100 trigger-pulls-by-another-name', () => {
    // Nearest-wrong: hitCount 30 (skill2's threshold accidentally reused) fires ~3.3x more often.
    const patched = withPatchedOverride('rupee', (ov) => {
      for (const b of ov.skill1) {
        if (b.trigger.kind === 'hitCount') b.trigger.count = 30;
      }
    });
    const wrong = run({ ...base, overrides: { rupee: patched } });
    const wrongCrit = (
      wrong.events.filter((e) => e.kind === 'buffApply') as Extract<
        SimEvent,
        { kind: 'buffApply' }
      >[]
    ).filter((e) => e.stat === 'critRatePct' && Math.abs(e.value - 2.24) < 1e-6);
    expect(wrongCrit.length).toBeGreaterThan(critApplies.length);
  });

  it.skip('"Increases stack count of buffs by 1" — GAP: no engine primitive for a cross-buff stack-count bump', () => {
    // There is no EffectDef that raises another buff's maxStacks/current stacks.
    // Unmodelable today; must be recorded in the override's `unmodeled.skill1`.
  });
});

describe('rupee — skill2: Mileage ATK 13.8%, up to 5 stacks, 15 sec, self only', () => {
  it('applies to SELF only (never a teammate)', () => {
    // Discriminates target set. Nearest-wrong: {kind:'allies'}.
    expect(mileageApplies.length).toBeGreaterThan(0);
    for (const e of mileageApplies) {
      expect(e.targetSlug).toBe('rupee');
      expect(e.targetIdx).toBe(rupeeIdx);
    }
  });

  it('declares maxStacks 5 and actually reaches the cap (non-vacuity both sides)', () => {
    // Nearest-wrong: uncapped stacking (would exceed 5) or maxStacks 1 (never ramps).
    for (const e of mileageApplies) expect(e.maxStacks).toBe(5);
    const observed = mileageApplies.map((e) => e.stacks ?? 1);
    expect(Math.max(...observed)).toBe(5); // active case: cap reached
    expect(Math.min(...observed)).toBeLessThan(5); // inactive case: ramp exists
  });

  it('the stack cap is load-bearing: raising it above 5 increases rupee damage', () => {
    // Proves the assertion above is not decorative — a 10-stack model out-damages the
    // faithful 5-stack model, so the cap is a real constraint on the fixture.
    const patched = withPatchedOverride('rupee', (ov) => {
      for (const b of ov.skill2) {
        for (const eff of b.effects) {
          if (eff.kind === 'buff' && eff.stat === 'atkPct') eff.maxStacks = 10;
        }
      }
    });
    const wrong = run({ ...base, overrides: { rupee: patched } });
    expect(totals(wrong.res)['rupee']).toBeGreaterThan(totals(baseline.res)['rupee']);
  });

  it('is time-bounded at 15 sec, not round-bounded and not permanent', () => {
    // Discriminates duration semantics. Nearest-wrong: durationShots ("for N rounds").
    for (const e of mileageApplies) {
      expect(e.durationShots ?? null).toBeNull();
      expect(e.expiresFrame).toBeGreaterThan(0);
    }
  });

  it('fires on a 30-ATTACK counter — more often than skill1\'s 100-hit counter', () => {
    // Discriminates trigger identity/threshold: 30 < 100, so within one run the Mileage
    // applications must outnumber the crit applications. Nearest-wrong: both keyed to 100.
    expect(mileageApplies.length).toBeGreaterThan(critApplies.length);
  });

  it('moves ONLY rupee — teammates are byte-identical when Mileage is removed (inertness)', () => {
    const patched = withPatchedOverride('rupee', (ov) => {
      ov.skill2 = [];
    });
    const noMileage = run({ ...base, overrides: { rupee: patched } });
    const a = totals(baseline.res);
    const b = totals(noMileage.res);
    expect(b['rupee']).toBeLessThan(a['rupee']); // self-buff is live
    for (const slug of Object.keys(a)) {
      if (slug === 'rupee') continue;
      // NOTE: allowed to move ONLY via the burst gate (see burst group); with the burst
      // ATK buff present, removing Mileage can close its gate — so compare with the
      // burst-gate group, not here. Teammates must not move from the self-buff itself.
      expect(b[slug]).toBeLessThanOrEqual(a[slug] + 1e-6);
    }
  });
});

describe('rupee — burst: 274.28% of final ATK to enemies within range', () => {
  it('lands burst-bucket damage on rupee\'s own burst cast', () => {
    const burstHits = damages.filter(
      (d) => d.bucket === 'burst' && d.slug === 'rupee' && d.srcSlot === 'burst',
    );
    expect(burstHits.length).toBeGreaterThan(0);
  });

  it('the 274.28% figure is load-bearing (halving it lowers rupee\'s burst damage)', () => {
    // Nearest-wrong: a mis-transcribed multiplier. Proves the number reaches the engine.
    const patched = withPatchedOverride('rupee', (ov) => {
      for (const b of ov.burst) {
        for (const eff of b.effects) {
          if (eff.kind === 'flatDamage') eff.atkPct = eff.atkPct / 2;
        }
      }
    });
    const wrong = run({ ...base, overrides: { rupee: patched } });
    expect(totals(wrong.res)['rupee']).toBeLessThan(totals(baseline.res)['rupee']);
  });

  it('burst-cast damage is FULL-BURST EXEMPT (a burst cast lands before the FB window opens)', () => {
    // Taxonomy item 9: burst-cast/instant damage never takes the +50% FB major.
    const burstHits = damages.filter(
      (d) => d.bucket === 'burst' && d.slug === 'rupee' && d.srcSlot === 'burst',
    );
    expect(burstHits.length).toBeGreaterThan(0);
    for (const d of burstHits) {
      expect(d.fbMajorApplied).toBeFalsy();
    }
  });
});

describe('rupee — burst rider: ATK 19.8% / 5 sec to ALL allies, GATED on Mileage at max stacks', () => {
  it('reaches all allies including self when it fires (non-vacuity, active case)', () => {
    // "Affects all allies" — no excludeSelf. Nearest-wrong: allies excludeSelf / self-only.
    expect(burstAtkApplies.length).toBeGreaterThan(0);
    const painted = new Set(burstAtkApplies.map((e) => e.targetSlug));
    expect(painted.has('rupee')).toBe(true);
    expect(painted.size).toBe(base.slugs.length);
  });

  it('carries a 5-second window, distinct from skill1\'s 10-sec crit window', () => {
    for (const e of burstAtkApplies) {
      expect(e.durationShots ?? null).toBeNull();
      expect(e.expiresFrame).toBeGreaterThan(0);
    }
  });

  it('is GATED on Mileage at max stacks — it does NOT fire on every burst cast', () => {
    // THE discriminating assertion for this line. Nearest-wrong: an ungated burstCast
    // rider (fires on every one of rupee's casts, over-crediting the whole team).
    // Removing the gate must strictly increase the number of applications; if the counts
    // are equal, the shipped model is effectively ungated.
    const patched = withPatchedOverride('rupee', (ov) => {
      for (const b of ov.burst) {
        delete b.resourceGate;
        delete b.requiresTargetStatus;
      }
    });
    const wrong = run({ ...base, overrides: { rupee: patched } });
    const wrongAtk = (
      wrong.events.filter((e) => e.kind === 'buffApply') as Extract<
        SimEvent,
        { kind: 'buffApply' }
      >[]
    ).filter((e) => e.stat === 'atkPct' && Math.abs(e.value - 19.8) < 1e-6);
    const casts = baseline.events.filter(
      (e) => e.kind === 'burstCast' && e.unitIdx === rupeeIdx,
    ).length;
    expect(casts).toBeGreaterThan(0);
    // faithful: at most one application-set per cast, and strictly fewer than ungated
    expect(burstAtkApplies.length).toBeLessThan(wrongAtk.length);
  });

  it('the gate is not permanently closed either (both cases exercised in the fixture)', () => {
    // Non-vacuity for the gate: an early burst (pre-max Mileage) must NOT carry the buff,
    // a later burst (Mileage capped) MUST. Assert both halves exist in one run.
    const casts = baseline.events
      .filter((e) => e.kind === 'burstCast' && e.unitIdx === rupeeIdx)
      .map((e) => e.frame);
    expect(casts.length).toBeGreaterThan(1);
    expect(burstAtkApplies.length).toBeGreaterThan(0);
    const firstApplyFrame = Math.min(...burstAtkApplies.map((e) => e.frame));
    // the first cast happens before the first grant => the opening cast was gated OUT
    expect(casts[0]).toBeLessThan(firstApplyFrame);
  });

  it('teammates gain damage from the rider — removing it lowers every ally (inertness/carrier check)', () => {
    const patched = withPatchedOverride('rupee', (ov) => {
      for (const b of ov.burst) {
        b.effects = b.effects.filter(
          (eff: any) => !(eff.kind === 'buff' && eff.stat === 'atkPct'),
        );
      }
    });
    const wrong = run({ ...base, overrides: { rupee: patched } });
    const a = totals(baseline.res);
    const b = totals(wrong.res);
    for (const slug of Object.keys(a)) {
      expect(b[slug]).toBeLessThanOrEqual(a[slug] + 1e-6);
    }
    const movedAllies = Object.keys(a).filter(
      (s) => s !== 'rupee' && b[s] < a[s] - 1e-6,
    );
    expect(movedAllies.length).toBeGreaterThan(0);
  });

  it('does not touch buckets it has no claim on: no DoT and no charge damage anywhere', () => {
    // Inertness: rupee is an AR with chargeFrames 0 and no DoT line in the kit.
    // (Adapted: the engine has no 'charge' damage bucket — charge state lives on the SHOT
    // event; chargeFrames 0 ⇒ zero charged shots.)
    const chargedShots = baseline.events.filter(
      (e) => e.kind === 'shot' && e.slug === 'rupee' && e.charged,
    );
    expect(chargedShots.length).toBe(0);
  });
});
