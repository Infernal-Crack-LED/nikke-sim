// scripts/tests/units/velvet.test.ts
//
// Velvet (velvet) — SR / Wind / Supporter / Burst II. BLIND cross-family kit-spec test (role S5).
// Ground truth = kit prose ONLY. One assertion group per kit line; each discriminating assertion is
// GREEN under the faithful reading and RED under the nearest-wrong model (built by removing the block).
//
// FIXTURE: controlComp('velvet', true) -> liter B1 / crown B2 / velvet(carry) B2 / helm B3, Fire boss.
//   Velvet is Burst II, so the "carry" slot holds a B2; the FB chain is liter -> <one B2> -> helm.
//   The velvet-casts-her-burst guard below makes every in-FB / burst assertion non-vacuous (if the
//   rotation ever picks crown over velvet, that guard fails loudly rather than passing silently).
//
// KIT -> BLOCKS UNDER TEST
//   S1a  start-of-battle / entering Burst Stage 2: fill 6000-round ammo pouch (resource, no direct
//        damage) + "remove 5% of enemy ammo" (no enemy entity -> inert).            -> it.skip
//   S1b  Full Charge while NOT in Full Burst (self): ATK 30.5% + Attack Damage 30.5%, 3s.
//   S2a  Full Charge DURING Full Burst (all allies): ATK 25.2% OF CASTER'S ATK (casterAtkPct, NOT
//        atkPct) + Charge Damage 100.8% (additive chargeDamagePct, NOT chargeDamageMultPct), 3s.
//   S2b  after 50 normal attacks during Full Burst: self Attack Damage 15.03% 5s + 400.92% final-ATK
//        additional damage (flat rider; FB by timing; no core — text says only "additional damage").
//   Bst  own B2 burst (self): weapon swap (per-shot 7% of final ATK for 10s) + Attack Damage 34.52% 10s.
//
// FLAGGED (outside kit-text domain — asserted structurally, NOT by precise magnitude):
//   - burst weapon-swap cadence (pulls/s): kit-silent + datamine-unreliable.
//   - S2b "50 normals in FB" trigger encoding (hitCount + inFb gate; per-FB reset?) and the rider's
//     noFb/noRange/core disposition: modeling calls, not stated. Tested by whether it fires when the
//     FB normal-count actually reaches 50.
//   - ammo-pouch depletion / whether the expend-ammo effects are hard-gated on pool balance.

import { describe, it, expect } from 'vitest';
import {
  controlComp,
  runComp,
  unitOf,
  withPatchedOverride,
} from '../lib/harness';

// --- effect-signature predicates (structure-robust: match by effect, not block index) ---
const hasBuff = (stat: string, v: number) => (b: any) =>
  (b.effects || []).some(
    (e: any) =>
      e.kind === 'buff' && e.stat === stat && Math.abs(e.value - v) < 0.6
  );
const hasFlat = (v: number) => (b: any) =>
  (b.effects || []).some(
    (e: any) => e.kind === 'flatDamage' && Math.abs(e.atkPct - v) < 1
  );
const hasSwap = (b: any) =>
  (b.effects || []).some((e: any) => e.kind === 'weaponSwap');

// --- runner: baseline or counterfactual (remove every block matching `remove`) ---
function go(remove?: (b: any) => boolean) {
  const opts: any = controlComp('velvet', true);
  const events: any[] = [];
  opts.cfg = { ...(opts.cfg || {}), onEvent: (ev: any) => events.push(ev) };
  if (remove) {
    opts.overrides = {
      velvet: withPatchedOverride('velvet', (o: any) => {
        o.blocks = (o.blocks || []).filter((b: any) => !remove(b));
      }),
    };
  }
  return { res: runComp(opts), events };
}

const applyOf = (events: any[], stat: string, v: number) =>
  events.filter(
    (e) =>
      e.kind === 'buffApply' && e.stat === stat && Math.abs(e.value - v) < 0.6
  );
const dmgTotal = (res: any, slug: string) => unitOf(res, slug).total;

// hoisted baseline (one full 180s sim)
const base = go();
const vUnit: any = unitOf(base.res, 'velvet');
const vIdx: number = vUnit.idx ?? vUnit.slot; // velvet's slot index

describe('velvet — fixture non-vacuity', () => {
  it('a full burst occurs and velvet casts her own Burst II', () => {
    expect(
      base.events.filter((e) => e.kind === 'fullBurstStart').length
    ).toBeGreaterThan(0);
    // proxy for "velvet cast": her burst-only self buff (34.52%) is present
    const cast = applyOf(base.events, 'attackDamagePct', 34.52).filter(
      (e) => e.casterIdx === vIdx && e.targetIdx === vIdx
    );
    expect(cast.length).toBeGreaterThan(0);
  });
});

describe('S1b — Full Charge outside FB: self ATK + Attack Damage 30.5% / 3s', () => {
  const atk = applyOf(base.events, 'atkPct', 30.5).filter(
    (e) => e.casterIdx === vIdx
  );
  const dmg = applyOf(base.events, 'attackDamagePct', 30.5).filter(
    (e) => e.casterIdx === vIdx
  );

  it('velvet gains both ATK 30.5% and Attack Damage 30.5%', () => {
    expect(atk.length).toBeGreaterThan(0);
    expect(dmg.length).toBeGreaterThan(0);
  });
  it('self-scoped: every application targets velvet (nearest-wrong: allies scope)', () => {
    for (const e of [...atk, ...dmg]) {
      expect(e.targetIdx).toBe(vIdx);
    }
  });
  it('inert on teammates: removing the block leaves teammate totals byte-identical', () => {
    const cf = go(hasBuff('atkPct', 30.5));
    for (const s of ['liter', 'crown', 'helm']) {
      expect(dmgTotal(cf.res, s)).toBe(dmgTotal(base.res, s));
    }
    expect(applyOf(cf.events, 'atkPct', 30.5).length).toBe(0); // velvet's own buff gone
  });
});

describe('S2a — Full Charge during FB: allies casterATK 25.2% + Charge Damage 100.8% / 3s', () => {
  const cAtk = applyOf(base.events, 'casterAtkPct', 25.2).filter(
    (e) => e.casterIdx === vIdx
  );
  const chg = applyOf(base.events, 'chargeDamagePct', 100.8).filter(
    (e) => e.casterIdx === vIdx
  );

  it('ATK grant is caster-scaled (casterAtkPct), NOT target-scaled (atkPct)', () => {
    expect(cAtk.length).toBeGreaterThan(0);
    expect(applyOf(base.events, 'atkPct', 25.2).length).toBe(0);
  });
  it('Charge Damage is additive chargeDamagePct, NOT chargeDamageMultPct', () => {
    expect(chg.length).toBeGreaterThan(0);
    expect(applyOf(base.events, 'chargeDamageMultPct', 100.8).length).toBe(0);
  });
  it('reaches all allies (>1 distinct target slot)', () => {
    const slots = new Set([...cAtk, ...chg].map((e) => e.targetIdx));
    expect(slots.size).toBeGreaterThan(1);
  });
  it('ally-scoped: removing the block changes teammate damage', () => {
    const cf = go(hasBuff('chargeDamagePct', 100.8));
    expect(applyOf(cf.events, 'chargeDamagePct', 100.8).length).toBe(0);
    const moved = ['liter', 'crown', 'helm'].some(
      (s) => dmgTotal(cf.res, s) !== dmgTotal(base.res, s)
    );
    expect(moved).toBe(true);
  });
});

describe('S2b — 50 normals during FB: self Attack Damage 15.03% + 400.92% rider', () => {
  const self15 = applyOf(base.events, 'attackDamagePct', 15.03).filter(
    (e) => e.casterIdx === vIdx && e.targetIdx === vIdx
  );
  const fbNormals = base.events.filter(
    (e) =>
      e.kind === 'damage' &&
      e.srcSlot === vIdx &&
      e.bucket === 'normal' &&
      e.inFullBurst
  ).length;

  it('the self 15.03% buff fires iff velvet lands >=50 normals in a FB window', () => {
    if (fbNormals >= 50) {
      expect(self15.length).toBeGreaterThan(0);
    } else {
      expect(self15.length).toBe(0);
    } // trigger correctly unreached (payload if driver over-fires)
  });
  it('self-scoped when it fires', () => {
    for (const e of self15) {
      expect(e.targetIdx).toBe(vIdx);
    }
  });
  it('counterfactual: removing the block never increases velvet damage and drops the buff', () => {
    const cf = go(
      (b) => hasBuff('attackDamagePct', 15.03)(b) || hasFlat(400.92)(b)
    );
    expect(applyOf(cf.events, 'attackDamagePct', 15.03).length).toBe(0);
    expect(dmgTotal(cf.res, 'velvet')).toBeLessThanOrEqual(
      dmgTotal(base.res, 'velvet')
    );
  });
});

describe('Bst — own B2 burst: weapon swap (7%/shot, 10s) + self Attack Damage 34.52% / 10s', () => {
  const self34 = applyOf(base.events, 'attackDamagePct', 34.52).filter(
    (e) => e.casterIdx === vIdx && e.targetIdx === vIdx
  );
  it('velvet self-buffs Attack Damage 34.52% on burst', () => {
    expect(self34.length).toBeGreaterThan(0);
  });
  it('weapon swap alters velvet weapon behaviour (shot economy changes vs no-swap)', () => {
    const cf = go(hasSwap);
    // the self 34.52% buff lives in the same block -> gone
    expect(applyOf(cf.events, 'attackDamagePct', 34.52).length).toBe(0);
    // and the swapped weapon fires on a different cadence/ammo than the base SR
    const baseShots = base.events.filter(
      (e) => e.kind === 'shot' && e.srcSlot === vIdx
    ).length;
    const cfShots = cf.events.filter(
      (e) => e.kind === 'shot' && e.srcSlot === vIdx
    ).length;
    expect(cfShots).not.toBe(baseShots);
  });
});

describe('S1a — ammo-pouch fill + enemy ammo steal', () => {
  it.skip('fills 6000-round pouch on battle-start & Burst Stage 2 entry; removes 5% enemy ammo', () => {
    // Resource-pool initialisation (no queryable damage) + an enemy-targeted ammo removal that is
    // inert in v1 (resolveTargets({enemy}) === []). Only relevant as a gate IF the pool can deplete;
    // depletion / hard-gating of the expend-ammo effects is not asserted (FLAG).
  });
});
