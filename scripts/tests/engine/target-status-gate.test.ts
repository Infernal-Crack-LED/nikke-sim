// Functional test for the named target-status primitive (`targetStatus` effect +
// `requiresTargetStatus` block gate).
//
// The primitive is INERT for every committed override (no unit carries either field today, so the
// regression snapshot is byte-identical — that proves inertness). This test proves the mechanism
// actually FIRES, and — more importantly — that it is genuinely NAME-KEYED rather than the cheap
// alternative it must not be: one global boolean wearing a name. It uses privaty (Privaty, AR/Water
// — NOT privaty-unkind-maid) as an in-memory fixture ONLY; her committed override JSON is never
// touched (it still carries the fabricated 1687% dot block, which stays documented-wrong until the
// Designated-Target mechanic is measured).
//
// FIXTURE SHAPE (deliberately rotation-independent — a lone Burst III unit makes ZERO Full Bursts,
// so nothing here may depend on a burst being cast):
//   - skill1: shotFired -> targetStatus { name: <applied>, durationSec }   (re-applied as she fires)
//   - skill2: lastBullet -> flatDamage 500%, gated requiresTargetStatus: <gated>
// `lastBullet` fires on every magazine emptying (sim.ts), so the rider has many chances per fight.
import { describe, expect, it } from 'vitest';
import { runComp, unitOf, withPatchedOverride } from '../lib/harness.js';

type Opts = {
  applied?: string;        // status name the fixture INFLICTS (omit = inflict nothing)
  gated?: string;          // status name the rider REQUIRES (omit = ungated rider)
  durationSec?: number;    // status window length
  applied2?: string;       // inflict a SECOND, differently-named status concurrently
  statusTarget?: 'enemy' | 'allies'; // authoring target of the status block (engine must ignore it)
  // Trigger that INFLICTS the status. Default `shotFired` keeps the status continuously live, which
  // is what P2/P3/P4/P7 want. P5 must NOT use it: `shotFired` dispatches on the very frame the
  // magazine empties, so the status is re-applied microseconds before `lastBullet` reads it and even
  // a 3-frame window tests as live. P5 therefore inflicts on a sparse `hitCount` trigger, so that
  // last-bullet events genuinely fall both inside and outside the window.
  applyEvery?: number;
};

// Run solo privaty (Privaty, AR/Water) with an in-memory fixture override. Returns her skill-bucket
// damage (the rider) and her total, so the rider is isolated from normal fire.
function run(o: Opts): { skill: number; total: number } {
  const privaty = withPatchedOverride('privaty', (ov) => {
    const applyEffects: any[] = [];
    if (o.applied) applyEffects.push({ kind: 'targetStatus', name: o.applied, durationSec: o.durationSec ?? 10 });
    if (o.applied2) applyEffects.push({ kind: 'targetStatus', name: o.applied2, durationSec: o.durationSec ?? 10 });

    ov.skill1 = applyEffects.length
      ? [{
          slot: 'skill1',
          trigger: o.applyEvery ? { kind: 'hitCount', count: o.applyEvery } : { kind: 'shotFired' },
          target: { kind: o.statusTarget ?? 'enemy' },
          effects: applyEffects,
        }]
      : [];

    const riderBlock: any = {
      slot: 'skill2',
      trigger: { kind: 'lastBullet' },
      target: { kind: 'enemy' },
      effects: [{ kind: 'flatDamage', atkPct: 500, noRange: true }],
    };
    if (o.gated) riderBlock.requiresTargetStatus = o.gated;
    ov.skill2 = [riderBlock];
    ov.burst = [];
  });
  const res = runComp({
    slugs: ['privaty'],
    bossElement: 'Water',
    focusSlug: 'privaty',
    overrides: { privaty },
  });
  const u = unitOf(res, 'privaty');
  return { skill: u.breakdown.skill, total: u.totalDamage };
}

const M = (v: number) => `${(v / 1e6).toFixed(1)}M`;

describe('named target-status gate (targetStatus / requiresTargetStatus)', () => {
  // basis: the fixture's rider must be observable at all, and fire often enough that a
  // half-length window can exclude some of its hits (pre-op revision 3: P5 is vacuous otherwise).
  const ungated = run({ gated: undefined });
  const matched = run({ applied: 'Designated Target', gated: 'Designated Target' });

  it('fixture basis: the ungated rider lands', () => {
    expect(
      ungated.skill,
      'fixture basis BROKEN: the ungated rider never fired — fix the fixture, not the assertions',
    ).toBeGreaterThan(0);
  });

  it('P2 mechanism fires when the status is live and the gate names it', () => {
    expect(matched.skill, 'gate never opened despite the status being applied').toBeGreaterThan(0);
  });

  it('P3 DISCRIMINATING: the gate is name-keyed, not a global boolean', () => {
    // Both arms come from ONE fixture in ONE run with a status genuinely LIVE — apply 'A', gate on
    // 'B'. A single global boolean fires the B-gated rider as soon as A is live and fails arm 1.
    const mismatched = run({ applied: 'Designated Target', gated: 'Some Other Status' });
    expect(
      mismatched.skill,
      `P3a (implementation is a global boolean): B-gated rider fired ${M(mismatched.skill)} while only A was live`,
    ).toBe(0);
    expect(
      matched.skill,
      'P3b: gating on the APPLIED name did not exceed the mismatched arm',
    ).toBeGreaterThan(mismatched.skill);
  });

  it('P4 DISCRIMINATING: concurrent statuses do not cross-satisfy and stay name-isolated', () => {
    // Two differently-named statuses held live at once must not cross-satisfy, and a third
    // unapplied name must still read zero. This is the property that made the registry worth
    // building: the deleted `wipeOut` boolean could hold exactly ONE status roster-wide, so a
    // second carrier would have satisfied d-killer-wife's gate and vice versa. With two live
    // statuses, a single-boolean implementation passes P4a/P4b and fails P4c.
    const bothA = run({ applied: 'Wipe Out', applied2: 'Designated Target', gated: 'Wipe Out' });
    const bothB = run({ applied: 'Wipe Out', applied2: 'Designated Target', gated: 'Designated Target' });
    const bothC = run({ applied: 'Wipe Out', applied2: 'Designated Target', gated: 'Some Third Status' });
    expect(
      bothA.skill,
      'P4a: gate on a live status did not fire while a second status was also live',
    ).toBeGreaterThan(0);
    expect(bothB.skill, 'P4b: the second concurrent status did not open its own gate').toBeGreaterThan(0);
    expect(
      bothC.skill,
      `P4c (statuses are not name-isolated): ${M(bothC.skill)} leaked through`,
    ).toBe(0);
  });

  it('P5 honours the status window', () => {
    // Long vs short status duration, same names throughout, with the status inflicted on a SPARSE
    // trigger (every 100 hits) so last-bullet events fall both inside and outside the window. The
    // always-live `shotFired` application used above cannot test this: it re-applies the status on
    // the same frame the magazine empties, so any window reads as live.
    // In THIS FIXTURE privaty's magazine is her base 60 rounds (AR, hitsPerShot 1). Note that is NOT
    // her usual in-comp magazine: her real skill1 carries maxAmmoPct −50.66 (≈30 rounds), but that is
    // a `fullBurstEnter` 10s buff, and here it is doubly absent — the fixture REPLACES skill1 with the
    // status-application block, and a solo lone-Burst-III privaty makes ZERO Full Bursts, so an
    // FB-gated buff could never fire anyway. Cross-check on 60: 27 mags × 60 = 1620 rounds, 27 reloads
    // × 81f ≈ 36.5s, leaving ~143s of fire ⇒ ~11.3 rounds/s vs the AR ~12/s baseline. ✓
    // So last bullets fall on cumulative hits 60/120/180/…, while the status is applied on hits
    // 100/200/300/…. lcm(60,100)/60 = 5, so exactly EVERY 5th last bullet coincides with a status
    // application and survives even a 3-frame window.
    // Measured today: 27 rider hits ungated, 5 of them in the 0.05s arm (5/27 = 0.1852 observed) and
    // 26 in the 10s arm (26/27 = 0.9630) — the single 10s miss being the first last bullet at hit 60,
    // which precedes the first application at hit 100. Those integer counts depend on privaty's
    // cadence/ammo, so treat a future change in them as a cadence change, not a gate regression; the
    // assertions below deliberately test the INEQUALITY, which is cadence-independent.
    const P5_EVERY = 100;
    const longWin = run({ applied: 'Designated Target', gated: 'Designated Target', durationSec: 10, applyEvery: P5_EVERY });
    const shortWin = run({ applied: 'Designated Target', gated: 'Designated Target', durationSec: 0.05, applyEvery: P5_EVERY });
    expect(
      longWin.skill,
      'P5 basis BROKEN: even the 10s window landed nothing — fix the fixture, not the assertion',
    ).toBeGreaterThan(0);
    expect(
      shortWin.skill,
      `P5: shrinking the status window did not reduce rider hits (${shortWin.skill} vs ${longWin.skill})`,
    ).toBeLessThan(longWin.skill);
  });

  it('P7 engine ignores block.target for targetStatus (implicit enemy)', () => {
    // No enemy entity exists, so authoring the status on an `allies`-targeted block still writes the
    // boss registry. (validate-overrides.ts separately REJECTS that authoring; this fixture bypasses
    // the validator on purpose, to pin the ENGINE's behaviour rather than the authoring rule.)
    const alliesTargeted = run({ applied: 'Designated Target', gated: 'Designated Target', statusTarget: 'allies' });
    expect(alliesTargeted.skill, 'block.target changed the status registry').toBe(matched.skill);
  });

  it('P6 is deterministic — the seedless run reproduces', () => {
    expect(run({ applied: 'Designated Target', gated: 'Designated Target' }).skill).toBe(matched.skill);
  });
});
