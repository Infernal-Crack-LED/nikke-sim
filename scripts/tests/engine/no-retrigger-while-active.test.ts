// Functional test for the SELF-STATUS GATE buff primitive (noRetriggerWhileActive).
//
// "Activates ... while NOT in [this buff's own] status" is a recurring NIKKE kit pattern
// (vesti-tactical-upgrade's Missile Guide: "when performing a Full Charge attack while not in
// Missile Guide status"). Without the gate, a trigger that both GRANTS a buff and is itself
// gated on firing while that buff is live can never lapse — applyBuff always refills
// shotsLeft/expiresFrame on a refresh, so the buff re-arms its own window every time it fires,
// producing near-permanent uptime instead of the kit's duty cycle (2026-08-03).
//
// Fixture: vesti-tactical-upgrade herself (real carrier, not a synthetic patch target) in the
// 720-kit-audit control comp (liter/crown/vesti-tactical-upgrade/helm — the SR/Water Helm, NOT
// helm-aquamarine, per controlComp's own default), focused, so she actually bursts and fires
// full-charge shots across the fight.
//
// vesti-tactical-upgrade's OWN committed override now sets the flag true (2026-08-03 fix,
// owner-confirmed gameplay pattern: one full charge then 3 near-instant follow-ups); this file's
// counterfactuals patch a CLONE (withPatchedOverride never touches disk) to exercise both sides.
//
// Assertions:
//   1. REGRESSION SAFETY — a buff with the field explicitly false is BYTE-IDENTICAL to one that
//      never declares it at all. This is the property that matters most for landing the
//      primitive: every OTHER override in the roster (none of which set this field) is
//      unaffected by its mere existence in the schema — proven generically here rather than
//      per-unit, since vesti's own shipped override no longer runs with the flag off.
//   2. MECHANISM LIVE — gate ON strictly reduces her total damage vs gate OFF: the ungated
//      encoding re-arms Charge Speed/Charge Damage on every full charge (near-permanent uptime),
//      so gating it to a genuine duty cycle can only remove credited uptime, never add it.
//   3. DUTY CYCLE VISIBLE — gate ON produces a MIX of slow (~120-frame) and fast (near-instant)
//      charges; gate OFF collapses to almost-all-fast.
//   4. HOLDER-SCOPED — every application of the gated buff targets herself, never a teammate
//      (checked off the buffApply event stream; team-total drift gate ON vs OFF is EXPECTED —
//      see that test's own comment).
import { describe, expect, it } from 'vitest';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const CARRY = 'vesti-tactical-upgrade';

function patchGate(gate: boolean | 'omit') {
  return withPatchedOverride(CARRY, (ov: any) => {
    for (const b of ov.skill1) {
      for (const e of b.effects) {
        if (e.kind === 'buff') {
          if (gate === 'omit') {
            delete e.noRetriggerWhileActive;
          } else {
            e.noRetriggerWhileActive = gate;
          }
        }
      }
    }
  });
}

function run(gate: boolean) {
  const vesti = patchGate(gate);
  return totals(
    runComp({ ...controlComp(CARRY), overrides: { [CARRY]: vesti } })
  );
}

// Counts full-charge shots by inter-shot gap: a "fast" charge lands within a couple frames of
// the prior shot (chargeSpeedPct live), a "slow" one takes ~chargeFrames (120f = 2.0s @ 60fps).
function chargeCadence(gate: boolean): { fast: number; slow: number } {
  const times: number[] = [];
  const vesti = patchGate(gate);
  runComp({
    ...controlComp(CARRY),
    overrides: { [CARRY]: vesti },
    cfg: {
      onEvent: (e: any) => {
        if (e.kind === 'damage' && e.slug === CARRY && e.bucket === 'normal') {
          times.push(e.sec);
        }
      },
    },
  });
  let fast = 0;
  let slow = 0;
  for (let i = 1; i < times.length; i++) {
    if (times[i] - times[i - 1] < 0.5) {
      fast++;
    } else {
      slow++;
    }
  }
  return { fast, slow };
}

describe('noRetriggerWhileActive (self-status gate)', () => {
  it('is a byte-identical no-op whether the field is false or entirely absent (regression safety)', () => {
    // The primitive's regression-safety property: a buff with the field explicitly false behaves
    // identically to one that never declares it — the general case (every other override in the
    // roster, none of which set this field) is provably unaffected by its mere existence in the
    // schema. This does NOT compare against vesti-tactical-upgrade's shipped override, which now
    // sets the flag true (the 2026-08-03 fix below) — that comparison is covered by the
    // "mechanism is live" test instead.
    const off = totals(
      runComp({
        ...controlComp(CARRY),
        overrides: { [CARRY]: patchGate(false) },
      })
    );
    const omitted = totals(
      runComp({
        ...controlComp(CARRY),
        overrides: { [CARRY]: patchGate('omit') },
      })
    );
    expect(off).toEqual(omitted);
  });

  it('mechanism is live — gate ON reduces her damage vs gate OFF', () => {
    const gated = run(true)[CARRY];
    const withoutGate = run(false)[CARRY];
    expect(
      gated,
      `gate ON ${(gated / 1e6).toFixed(1)}M should be < gate OFF ${(withoutGate / 1e6).toFixed(1)}M`
    ).toBeLessThan(withoutGate);
  });

  it('duty cycle is visible — gate ON mixes slow/fast charges, gate OFF is nearly all fast', () => {
    const gated = chargeCadence(true);
    const ungated = chargeCadence(false);
    expect(
      gated.slow,
      `gate ON should show recurring slow charges once MG lapses; got ${JSON.stringify(gated)}`
    ).toBeGreaterThan(1);
    const ungatedFastFrac = ungated.fast / (ungated.fast + ungated.slow);
    const gatedFastFrac = gated.fast / (gated.fast + gated.slow);
    expect(
      gatedFastFrac,
      `gate ON's fast-shot fraction (${gatedFastFrac.toFixed(2)}) should be lower than gate OFF's (${ungatedFastFrac.toFixed(2)})`
    ).toBeLessThan(ungatedFastFrac);
  });

  it('is holder-scoped at the mechanism level — the gated buff only ever lands on herself', () => {
    // Teammates' TOTALS are expected to drift gate ON vs OFF (her charge cadence shifts her own
    // burst-gauge accrual and therefore team rotation/FB timing — a real cross-unit interaction,
    // not a buff leak). The scoping property the primitive itself must hold is narrower: every
    // application of the gated buff targets HER, never a teammate. Checked directly off the
    // buffApply event stream rather than inferred from team totals.
    const targets = new Set<string>();
    const vesti = patchGate(true);
    runComp({
      ...controlComp(CARRY),
      overrides: { [CARRY]: vesti },
      cfg: {
        onEvent: (e: any) => {
          if (
            e.kind === 'buffApply' &&
            (e.stat === 'chargeSpeedPct' || e.stat === 'chargeDamagePct')
          ) {
            targets.add(e.targetSlug);
          }
        },
      },
    });
    expect([...targets]).toEqual([CARRY]);
  });
});
