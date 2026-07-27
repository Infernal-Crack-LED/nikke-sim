// scripts/tests/units/volume.test.ts
//
// BLIND kit-spec test for Volume (volume) — SMG/Wind/Attacker/Burst I.
// Authored from kit prose ALONE (S5 role); no sight of any override, driver test, or truth file.
//
// KIT (ground truth):
//   skill1  ■ Affects self when killing an enemy. ATK ▲12.6% for 5s.
//   skill2a ■ Entering Full Burst, ALL ALLIES (escalating): Burst-Skill CD ▼ 2.34 / 2.7 / 3.17s.
//   skill2b ■ Using Burst Skill, ALL ALLIES (escalating): Crit DMG ▲ 10.77 / 12.46 / 14.42% for 5s.
//   burst   ■ ALL ALLIES: Crit Rate ▲ 31.9% for 5s.
//
// TRIGGER / SCOPE reads (the 4 questions):
//   skill2a — trigger 'fullBurstEnter' ("entering Full Burst"), target allies, escalating burstCdr.
//   skill2b — trigger 'burstCast' ("using Burst Skill" = the OWNER casts her burst), target allies,
//             escalating critDamagePct, durationSec 5. NOTE: on this fixture volume is the sole B1 so
//             she bursts on every Full Burst → burstCast and fullBurstEnter COINCIDE; this fixture
//             cannot discriminate that trigger identity (documented gap). Magnitude/escalation CAN.
//   burst   — Crit RATE (not damage), constant 31.9 (NOT escalating), all allies, 5s.
//   skill1  — 'when killing an enemy': no kill events exist on the immortal partless v1 boss and no
//             on-kill trigger primitive exists → GAP (it.skip).
//
// FIXTURE: controlComp('volume') — liter(B1)/crown(B2)/helm(B3) + volume(focus). Volume is Burst I,
//   so she competes with liter for the B1 burst slot. EVERY burst/burstCast assertion is guarded by a
//   non-vacuity check (critDamagePct buffApply > 0, and a fixture-sanity `it`) so the file FAILS LOUDLY
//   instead of silently passing if the fixture never lets volume actually burst.
//
// DISCRIMINATION:
//   - skill2b: escalation shows as >=2 distinct critDamagePct magnitudes over the fight; the
//     non-escalating flat-10.77 nearest-wrong collapses to 1 magnitude → RED. Zeroing critDamagePct
//     drops team total (proves it is a live crit-DAMAGE buff) and is inert on the crit-RATE channel.
//   - burst: constant 31.9 critRatePct on >=2 ally targets; zeroing drops total and is inert on the
//     crit-DAMAGE channel (proves rate≠damage mis-encoding, the classic SCOPE trap).
//   - skill2a: burst-CD reduction can only add or keep Full Bursts vs zeroed CDR (safe invariant);
//     strict-greater is the expected outcome when the rotation is cooldown-bound.

import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness';

type Ev = any;

// Recurse into escalating {steps} so counterfactuals reach the per-tier burff/burstCdr effects.
function walk(effects: any[], fn: (e: any) => void) {
  for (const e of effects) {
    fn(e);
    if (e && e.kind === 'escalating' && Array.isArray(e.steps)) {
      walk(e.steps, fn);
    }
  }
}
function zeroStat(ov: any, stat: string) {
  for (const b of ov.blocks) {
    walk(b.effects, (e) => {
      if (e.kind === 'buff' && e.stat === stat) {
        e.value = 0;
      }
    });
  }
}
function zeroBurstCdr(ov: any) {
  for (const b of ov.blocks) {
    walk(b.effects, (e) => {
      if (e.kind === 'burstCdr') {
        e.seconds = 0;
      }
    });
  }
}

// Each withPatchedOverride re-clones from the pristine committed JSON, so patches never stack;
// an identity patch installs a clean clone for the baseline run.
function capture(patch: (ov: any) => void = () => {}) {
  withPatchedOverride('volume', patch);
  const opts: any = controlComp('volume');
  const events: Ev[] = [];
  opts.cfg = { ...(opts.cfg || {}), onEvent: (ev: Ev) => events.push(ev) };
  const res = runComp(opts);
  return { res, events };
}

const near = (a: number, b: number, tol = 0.2) => Math.abs(a - b) <= tol;
const buffApplies = (evs: Ev[], stat: string) =>
  evs.filter((e) => e.kind === 'buffApply' && e.stat === stat);
const fbCount = (evs: Ev[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart').length;

// ---- hoisted runs (each is a full 180s sim) --------------------------------
const base = capture();
const noCritDmg = capture((ov) => zeroStat(ov, 'critDamagePct'));
const noCritRate = capture((ov) => zeroStat(ov, 'critRatePct'));
const noCdr = capture((ov) => zeroBurstCdr(ov));

describe('volume — fixture sanity', () => {
  it('Full Bursts occur and volume actually casts her burst (non-vacuity)', () => {
    expect(fbCount(base.events)).toBeGreaterThan(0);
    // critDamagePct is granted ONLY by volume's skill2b on her burst-cast → proves she bursts.
    expect(buffApplies(base.events, 'critDamagePct').length).toBeGreaterThan(0);
  });
});

describe('volume skill2b — escalating Critical DAMAGE to allies on burst-cast', () => {
  it('grants critDamagePct with >=2 distinct magnitudes (escalation), incl. the 10.77 first tier', () => {
    const cd = buffApplies(base.events, 'critDamagePct');
    expect(cd.length).toBeGreaterThan(0);
    const values = new Set(cd.map((e) => Math.round(e.value * 100) / 100));
    // Escalation surfaces >1 magnitude over the fight, whether emitted cumulatively
    // {10.77, 23.23, 37.65} or per-tier {10.77, 12.46, 14.42}. Flat-10.77 nearest-wrong → size 1.
    expect(values.size).toBeGreaterThanOrEqual(2);
    expect([...values].some((v) => near(v, 10.77))).toBe(true);
  });
  it('zeroing crit-DAMAGE removes the buff, lowers team total, inert on crit-RATE', () => {
    expect(buffApplies(noCritDmg.events, 'critDamagePct').length).toBe(0);
    expect(totals(base.res)).toBeGreaterThan(totals(noCritDmg.res));
    expect(buffApplies(noCritDmg.events, 'critRatePct').length).toBe(
      buffApplies(base.events, 'critRatePct').length
    );
  });
});

describe('volume burst — Critical RATE ▲31.9% to all allies (constant)', () => {
  it('grants critRatePct ≈31.9 to multiple ally targets, not escalating', () => {
    const cr = buffApplies(base.events, 'critRatePct');
    expect(cr.length).toBeGreaterThan(0);
    expect(cr.every((e) => near(e.value, 31.9))).toBe(true);
    const targets = new Set(cr.map((e) => e.targetIdx));
    expect(targets.size).toBeGreaterThanOrEqual(2); // "all allies", not self-only
  });
  it('zeroing crit-RATE lowers team total and is inert on crit-DAMAGE', () => {
    expect(buffApplies(noCritRate.events, 'critRatePct').length).toBe(0);
    expect(totals(base.res)).toBeGreaterThan(totals(noCritRate.res));
    expect(buffApplies(noCritRate.events, 'critDamagePct').length).toBe(
      buffApplies(base.events, 'critDamagePct').length
    );
  });
});

describe('volume skill2a — escalating ally Burst-Skill cooldown reduction on FB-enter', () => {
  it('Full Burst count never DROPS vs zeroed CDR (CDR only adds/keeps FBs)', () => {
    // Safe invariant: burstCdr can only speed the rotation. Strict-greater is expected when the
    // rotation is cooldown-bound; equality means CDR is inert here (gauge-bound) — a finding,
    // not a failure. Magnitude/escalation of the CDR is not cleanly observable via the event log.
    expect(fbCount(base.events)).toBeGreaterThanOrEqual(fbCount(noCdr.events));
  });
});

// skill1: ATK ▲12.6% for 5s "when killing an enemy". The v1 boss is immortal/partless — no kill
// events ever fire — and no on-kill trigger primitive exists in the schema. Unmodelable in v1.
it.skip('volume skill1 — on-kill ATK ▲12.6%/5s (no kill events on immortal v1 boss; no on-kill trigger)', () => {});
