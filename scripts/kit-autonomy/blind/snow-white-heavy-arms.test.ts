import { describe, it, expect } from 'vitest';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness';

// ============================================================================
// snow-white-heavy-arms.test.ts — BLIND kit spec (S5). Written from kit prose
// ALONE; blind to the driver's override/test/reasoning.
//
// UNIT: Snow White: Heavy Arms (snow-white-heavy-arms) — SR / Water / Attacker /
// Burst III. Base ammo 6, chargeFrames 72 (=1.2s), normalMult 69.04, coreMult 200.
// A charge-based SR with a secondary auto-fire weapon ("Seven Dwarves") + a
// consumable "Seven Dwarves Fully Active" status (2 uses) opened by her burst.
//
// KIT LINES (disposition in the spec JSON):
//  S1: (a) charge-interval Lock-On DESIGNATION on nearest non-locked enemy — GAP,
//          no boss/lock-on entity in v1.
//      (b) charge-interval Auto Fire Ready: DEF ▲42.24% continuously + loads the
//          "Seven Dwarves" secondary weapon — DEF inert v1; weapon economy GAP.
//      (c) charge-interval Damage Taken ▲4.2%/4s on Lock-On targets — boss debuff
//          (whole-team benefit) but LOCK-ON-GATED → measurement-gated (it.skip).
//      (d) on Full Charge → Auto Fire: 41.9% AoE + 105.59% sequential (per loaded
//          ammo) flat damage — ⚑ sequential count rides the unmodeled ammo economy
//          (it.skip).
//      (e) Full Charge while Fully-Active consumes 1 use; normal attack out of FB
//          removes Fully-Active — resource bookkeeping (GAP, not damage-observable).
//  S2: (a) fix charge 1.2s from battle start — charge-time CLAMP (GAP primitive).
//      (b) on Full Charge → Pierce 5s + ATK ▲46.84%/5s + Damage-to-Parts ▲62.64%/5s
//          (parts inert v1; pierce inert v1 — no live Pierce-Damage consumer).
//      (c) on entering BS3 → ATK ▲73.92%/10s (self).
//      (d) Full Charge while Fully-Active → Charge Damage ▲528% + Sequential ▲158.4%,
//          each "for 1 round" (durationShots:1), gated on Fully-Active status.
//  Burst: (a) Attack Damage ▲84.48%/10s (self).
//         (b) Seven Dwarves Fully Active (2 uses): fix charge 3.2s + max-lockon +10 +
//             max-ammo +10 — status/resource open (GAP).
//         (c) 41.9% to all destructible projectiles — inert v1 (it.skip).
//
// FIXTURE: controlComp('snow-white-heavy-arms', true) — liter B1 / crown B2 supply
// the chain so her B3 casts and a Full Burst opens (a lone B3 makes ZERO FBs).
// Deterministic (no seed). Assertions read cfg.onEvent (buffApply by stat+value,
// events pushed in temporal order) and diff unit totals vs withPatchedOverride
// counterfactuals. Inertness = a teammate's total stays byte-identical when a
// SELF-scoped buff is zeroed.
//
// NOTE (API assumption, documented): counterfactuals use
// withPatchedOverride(slug, mutate, fn) — patch active for fn, restored after.
// The patch helpers scan blocks[].effects[] by (kind,stat,value) rather than by
// block index, so they are robust to the driver's unknown block layout.
// ============================================================================

const SLUG = 'snow-white-heavy-arms';
const TEAMMATE = 'helm'; // present in controlComp; never touched by her self buffs

type Ev = any;

function run(opts: any): { res: any; evs: Ev[] } {
  const evs: Ev[] = [];
  const cfg = { ...(opts.cfg ?? {}), onEvent: (ev: Ev) => evs.push(ev) };
  const res = runComp({ ...opts, cfg });
  return { res, evs };
}

const near = (a: number, b: number, tol = 0.05) => Math.abs(a - b) <= tol;
const buffAt = (evs: Ev[], stat: string, value: number) =>
  evs.filter(
    (e) => e.kind === 'buffApply' && e.stat === stat && near(e.value, value)
  );
const dmgOf = (res: any, slug: string) => unitOf(res, slug).total;

// Scan-by-value patcher (blind to block layout): zero the first buff matching stat+value.
function zeroBuff(ov: any, stat: string, value: number) {
  for (const b of ov.blocks ?? []) {
    for (const e of b.effects ?? []) {
      if (e.kind === 'buff' && e.stat === stat && near(e.value, value))
        {e.value = 0;}
    }
  }
}

// ---- hoisted runs (each runComp is a full ~180s sim) -----------------------
const comp = controlComp(SLUG, true);
const { res: baseRes, evs: baseEvs } = run(comp);
const baseHer = dmgOf(baseRes, SLUG);
const baseMate = dmgOf(baseRes, TEAMMATE);

function counterfactual(stat: string, value: number) {
  return withPatchedOverride(
    SLUG,
    (ov: any) => zeroBuff(ov, stat, value),
    () => run(comp)
  );
}
const cfAtk5s = counterfactual('atkPct', 46.84);
const cfAtkBs3 = counterfactual('atkPct', 73.92);
const cfAtkDmg = counterfactual('attackDamagePct', 84.48);
const cfChargeDmg = counterfactual('chargeDamagePct', 528);

describe('snow-white-heavy-arms — blind kit spec', () => {
  // -- S2c: ATK ▲73.92% for 10s on entering BS3 (self) ----------------------
  it('S2: BS3-enter ATK ▲73.92% is emitted and lifts her damage (self-scoped)', () => {
    expect(buffAt(baseEvs, 'atkPct', 73.92).length).toBeGreaterThan(0);
    // GREEN faithful / RED if modeled as wrong magnitude or dropped:
    expect(dmgOf(cfAtkBs3.res, SLUG)).toBeLessThan(baseHer);
    // inertness: a pure self ATK buff must not move a teammate
    expect(near(dmgOf(cfAtkBs3.res, TEAMMATE), baseMate, 1e-6)).toBe(true);
  });

  // -- S2b: ATK ▲46.84% for 5s on Full Charge (self) ------------------------
  it('S2: Full-Charge ATK ▲46.84% is emitted and lifts her damage (self-scoped)', () => {
    expect(buffAt(baseEvs, 'atkPct', 46.84).length).toBeGreaterThan(0);
    expect(dmgOf(cfAtk5s.res, SLUG)).toBeLessThan(baseHer);
    expect(near(dmgOf(cfAtk5s.res, TEAMMATE), baseMate, 1e-6)).toBe(true);
  });

  // -- Burst a: Attack Damage ▲84.48% for 10s (self, Damage-Up bucket) ------
  it('Burst: Attack Damage ▲84.48% is emitted as attackDamagePct and lifts her damage', () => {
    expect(buffAt(baseEvs, 'attackDamagePct', 84.48).length).toBeGreaterThan(0);
    // nearest-wrong (generic atkPct or wrong value) fails the magnitude check above;
    // dropping it fails this:
    expect(dmgOf(cfAtkDmg.res, SLUG)).toBeLessThan(baseHer);
    expect(near(dmgOf(cfAtkDmg.res, TEAMMATE), baseMate, 1e-6)).toBe(true);
  });

  // -- S2d: Charge Damage ▲528% "for 1 round", GATED on Fully-Active ---------
  it('S2: Charge Damage ▲528% is emitted, is chargeDamagePct, and lifts her damage', () => {
    expect(buffAt(baseEvs, 'chargeDamagePct', 528).length).toBeGreaterThan(0);
    expect(dmgOf(cfChargeDmg.res, SLUG)).toBeLessThan(baseHer);
    expect(near(dmgOf(cfChargeDmg.res, TEAMMATE), baseMate, 1e-6)).toBe(true);
  });

  // Non-vacuity + gating: the 528% boost lives inside Fully-Active (post-burst),
  // NOT permanent from t=0. Events are pushed in temporal order, so the first
  // chargeDamagePct-528 apply must come AFTER the first burst cast. RED under a
  // permanent/passive-from-t0 mis-model (which would apply before any burst).
  it('S2: Charge Damage ▲528% is Fully-Active-gated, not active before the first burst', () => {
    const firstBurst = baseEvs.findIndex((e) => e.kind === 'burstCast');
    const firstCharge = baseEvs.findIndex(
      (e) =>
        e.kind === 'buffApply' &&
        e.stat === 'chargeDamagePct' &&
        near(e.value, 528)
    );
    expect(firstBurst).toBeGreaterThanOrEqual(0); // active case IS exercised (she bursts)
    expect(firstCharge).toBeGreaterThan(firstBurst); // inactive case: absent before burst
  });

  // -- S2d: Sequential attack damage ▲158.4% "for 1 round", Fully-Active-gated -
  it('S2: Sequential ▲158.4% is emitted as sequentialMultPct (own multiplicative bucket)', () => {
    // nearest-wrong: additive sequentialDamagePct instead of the true multiplier —
    // this asserts the multiplicative stat key is the one emitted at 158.4.
    expect(buffAt(baseEvs, 'sequentialMultPct', 158.4).length).toBeGreaterThan(
      0
    );
  });

  // ---- GAP / measurement-gated / v1-inert lines (skipped, documented) ------

  // S1c: Damage Taken ▲4.2%/4s is a real boss debuff, but it is LOCK-ON-GATED
  // (only enemies designated by charge-interval Lock-On). v1 has no lock-on entity,
  // so whether the driver models it as an always-on passive damageTakenPct is a
  // judgment call — left as a divergence probe rather than a hard convergence claim.
  it.skip('S1: Damage Taken ▲4.2% — lock-on-gated boss debuff, v1 has no lock-on entity', () => {
    expect(buffAt(baseEvs, 'damageTakenPct', 4.2).length).toBeGreaterThan(0);
  });

  // S1d: Auto Fire 41.9% AoE + 105.59% sequential-per-ammo. ⚑ the sequential shot
  // COUNT rides the unmodeled "Seven Dwarves" ammo/lock-on economy (max 5, +10 in
  // Fully-Active) — kit gives no v1-observable count, so the flat total is not
  // discriminable blind.
  it.skip('S1: Auto Fire 41.9%/105.59% flat damage — ammo-economy-gated (⚑)', () => {});

  // S2b: Gains Pierce 5s — inert in v1 (no live Pierce-Damage ▲ consumer; her own
  // Damage-to-Parts is parts-inert). Kept for kit completeness only.
  it.skip('S2: Full-Charge Pierce 5s — inert v1 (no live pierce consumer)', () => {});

  // S2b: Damage to Parts ▲62.64%/5s — partsDamagePct, inert v1 (partless boss).
  it.skip('S2: Damage-to-Parts ▲62.64% — inert v1 (no parts)', () => {});

  // S1b: DEF ▲42.24% (Auto Fire Ready) — self DEF, damage-inert in v1.
  it.skip('S1: DEF ▲42.24% — self DEF is damage-inert in v1', () => {});

  // S2a / Burst b: charge-time fixes (1.2s from start; 3.2s in Fully-Active) —
  // charge-time CLAMP primitive; shot-cadence readout is too noisy to assert blind.
  it.skip('S2/Burst: charge-time clamp 1.2s/3.2s — clamp primitive, cadence-noisy', () => {});

  // S1a: Lock-On designation — enemy-targeting mechanic, no boss/lock-on entity.
  it.skip('S1: Lock-On designation — GAP (no enemy/lock-on entity in v1)', () => {});

  // Burst c: 41.9% to all destructible projectiles — inert v1 (no projectiles).
  it.skip('Burst: destructible-projectile 41.9% — inert v1 (no projectiles)', () => {});
});
