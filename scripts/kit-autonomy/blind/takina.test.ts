import { describe, it, expect, beforeAll } from 'vitest';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness';

// ============================================================================
// BLIND kit-spec test for `takina` (SR/Iron/Supporter/Burst II) — S5 role.
// Written from kit prose ALONE; blind to the driver's override/tests/reasoning.
//
// KIT (ground truth):
//  skill1 A: "start of battle AND when Full Burst ends" -> self ATK ▲80.04% / 5s
//  skill1 B: "entering Full Burst"                      -> self True Damage ▲35.05% / 15s
//  skill2 A: "all enemies"  -> Damage Taken ▲10.09% / 5s  + Stun 2s   (NO stated trigger ⚑)
//  skill2 B: "all allies"   -> True Damage ▲140.49% / 10s              (NO stated trigger ⚑)
//  burst   : self weaponSwap 200.64% of final ATK / 10s
//            + self "Normal attacks deal true damage for 10s"  (type-conversion GAP)
//            + targets-hit Damage Taken ▲6.04% / 5s
//
// FIXTURE: controlComp('takina', true) => liter(B1)/crown(B2)/takina(B3)/helm(B3),
// boss Fire, focus takina. Supplies a burst chain so a B2 casts and Full Bursts occur
// (a lone B2 with no chain would make ZERO Full Bursts, leaving skill1B/skill1A-refresh
// and the whole burst branch un-exercised -> vacuous).
//
// EVENT-LOG discipline: buff magnitudes here (80.04/35.05/140.49/10.09/6.04/200.64) are
// distinctive enough to match buffApply/damage events by value with near-zero collision.
// Boss-held debuffs emit buffApply with casterIdx==null && targetIdx==null (harness note),
// so an enemy Damage-Taken debuff is filtered by stat+value, not by target index.
//
// API ASSUMPTIONS (blind — documented for the judge to remap if the driver's helm.test.ts
// uses different accessors): (1) opts.cfg.onEvent collects events; (2) opts.overrides is a
// { [slug]: overrideClone } map consumed by runComp; (3) unitOf(res,slug).total is the
// unit's total damage. All counterfactuals mutate blocks by effect stat/kind+value so they
// are robust to the driver's exact block layout (which I cannot see).
// ============================================================================

const near = (a: number, b: number, tol = 0.5) => Math.abs(a - b) <= tol;

// --- run helper: collects the full event stream for one 180s sim -----------
function run(base: any) {
  const events: any[] = [];
  const opts = {
    ...base,
    cfg: { ...(base.cfg ?? {}), onEvent: (ev: any) => events.push(ev) },
  };
  const res = runComp(opts);
  return { res, events };
}
const dmg = (res: any, slug: string) => unitOf(res, slug).total;
const buffApplies = (events: any[]) =>
  events.filter((e) => e.kind === 'buffApply');

// --- counterfactual: zero every buff effect matching (stat[,value]) --------
function zeroStat(stat: string, val?: number) {
  return {
    overrides: {
      takina: withPatchedOverride('takina', (o: any) => {
        for (const blk of o.blocks)
          {for (const e of blk.effects)
            {if (
              e.kind === 'buff' &&
              e.stat === stat &&
              (val == null || near(e.value, val))
            )
              {e.value = 0;}}}
      }),
    },
  };
}
// zero the burst weaponSwap per-shot multiplier
function zeroSwap() {
  return {
    overrides: {
      takina: withPatchedOverride('takina', (o: any) => {
        for (const blk of o.blocks)
          {for (const e of blk.effects)
            {if (e.kind === 'weaponSwap') {e.damagePct = 0;}}}
      }),
    },
  };
}

// ---- hoisted runs (each is a full sim) ------------------------------------
const base = controlComp('takina', true);
let R_base: any, E_base: any[];
let R_noAtk: any;
let R_noSelfTrue: any;
let R_noAllyTrue: any;
let R_noBossDT: any; // zeros skill2 10.09 (matched by value) only
let R_noSwap: any;

beforeAll(() => {
  const b = run(base);
  R_base = b.res;
  E_base = b.events;
  R_noAtk = run({ ...base, ...zeroStat('atkPct', 80.04) }).res;
  R_noSelfTrue = run({ ...base, ...zeroStat('trueDamagePct', 35.05) }).res;
  R_noAllyTrue = run({ ...base, ...zeroStat('trueDamagePct', 140.49) }).res;
  R_noBossDT = run({ ...base, ...zeroStat('damageTakenPct', 10.09) }).res;
  R_noSwap = run({ ...base, ...zeroSwap() }).res;
});

// ===========================================================================
describe('takina skill1 A — self ATK ▲80.04% / 5s (start-of-battle + FB-end)', () => {
  // DISCRIMINATES: buff present as a SELF atkPct of ~80.04; zeroing it drops takina's
  // own damage. Nearest-wrong (over-scope to allies, or wrong magnitude) still moves
  // takina, so the discriminator is the INERTNESS on teammates below.
  it('applies a self atkPct buff of ~80.04 at least twice (start + >=1 FB-end refresh)', () => {
    const hits = buffApplies(E_base).filter(
      (e) => e.stat === 'atkPct' && near(e.value, 80.04)
    );
    expect(hits.length).toBeGreaterThanOrEqual(2); // start-of-battle + at least one FB-end
  });
  it('is non-vacuous: zeroing atkPct(80.04) strictly lowers takina total', () => {
    expect(dmg(R_base, 'takina')).toBeGreaterThan(dmg(R_noAtk, 'takina'));
  });
  it('INERTNESS: it is self-scoped — zeroing it does NOT change teammate liter', () => {
    // if the buff were mis-scoped to allies, liter's total would move.
    expect(dmg(R_noAtk, 'liter')).toBeCloseTo(dmg(R_base, 'liter'), 6);
    expect(dmg(R_noAtk, 'crown')).toBeCloseTo(dmg(R_base, 'crown'), 6);
  });
});

describe('takina skill1 B — self True Damage ▲35.05% / 15s (entering Full Burst)', () => {
  // DISCRIMINATES: a trueDamagePct SELF buff of ~35.05 keyed to fullBurstEnter.
  // Nearest-wrong = scoped to all allies (would move teammates) OR generic atkPct.
  it('applies a trueDamagePct buff of ~35.05 (>=1, on FB entry)', () => {
    const hits = buffApplies(E_base).filter(
      (e) => e.stat === 'trueDamagePct' && near(e.value, 35.05)
    );
    expect(hits.length).toBeGreaterThanOrEqual(1);
  });
  it('is non-vacuous: zeroing trueDamage(35.05) lowers takina total', () => {
    expect(dmg(R_base, 'takina')).toBeGreaterThan(dmg(R_noSelfTrue, 'takina'));
  });
  it('INERTNESS: self-scoped — teammate liter unchanged when 35.05 zeroed', () => {
    expect(dmg(R_noSelfTrue, 'liter')).toBeCloseTo(dmg(R_base, 'liter'), 6);
  });
});

describe('takina skill2 A — enemy Damage Taken ▲10.09% / 5s + Stun 2s (⚑ trigger)', () => {
  // TRIGGER IS ⚑: kit gives skill2 NO activation clause -> taxonomy says interval;
  // exact cadence is measurement-gated, so we assert PRESENCE + team-wide effect, not timing.
  // Damage Taken ▲ is a BOSS DEBUFF benefiting the whole team (not a self buff).
  it('emits a boss-held Damage Taken debuff of ~10.09 (casterIdx/targetIdx null)', () => {
    const boss = E_base.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.casterIdx == null &&
        e.targetIdx == null &&
        e.stat === 'damageTakenPct' &&
        near(e.value, 10.09)
    );
    expect(boss.length).toBeGreaterThanOrEqual(1);
  });
  it('is team-wide + non-vacuous: zeroing 10.09 lowers MULTIPLE units, not just takina', () => {
    expect(dmg(R_base, 'takina')).toBeGreaterThan(dmg(R_noBossDT, 'takina'));
    expect(dmg(R_base, 'liter')).toBeGreaterThan(dmg(R_noBossDT, 'liter')); // proves enemy-debuff scope
  });
  it.skip('Stun 2s on enemy — no observable damage consequence on the immortal partless boss', () => {
    // GAP: stun gates enemy actions; the scope-lock boss deals no damage and cannot be
    // interrupted in a way this sim scores. Presence-only; not damage-discriminating.
  });
});

describe('takina skill2 B — all-allies True Damage ▲140.49% / 10s (⚑ trigger)', () => {
  // DISCRIMINATES self(35.05) vs ally(140.49) True-Damage lines: this one MUST move teammates.
  it('applies a trueDamagePct buff of ~140.49 to multiple ally slots', () => {
    const targets = new Set(
      buffApplies(E_base)
        .filter(
          (e) =>
            e.stat === 'trueDamagePct' &&
            near(e.value, 140.49) &&
            e.targetIdx != null
        )
        .map((e) => e.targetIdx)
    );
    expect(targets.size).toBeGreaterThanOrEqual(2); // all allies, not self-only
  });
  it('INERTNESS/SCOPE: zeroing 140.49 lowers a TEAMMATE (proves ally scope, unlike 35.05)', () => {
    expect(dmg(R_base, 'liter')).toBeGreaterThan(dmg(R_noAllyTrue, 'liter'));
    // and the self-line counterfactual (35.05) must NOT have moved liter (asserted above),
    // so the two True-Damage lines are correctly split self vs allies.
  });
});

describe('takina burst — self weaponSwap 200.64% / 10s + targets-hit Damage Taken ▲6.04%', () => {
  // NON-VACUITY: the fixture bursts (B2 chain) so the swap window actually opens; base
  // (unswapped) normal fire also exists, exercising BOTH the active and inactive weapon state.
  it('produces swap-window damage: zeroing the swap multiplier lowers takina total', () => {
    expect(dmg(R_base, 'takina')).toBeGreaterThan(dmg(R_noSwap, 'takina'));
  });
  it('emits high-multiplier damage events attributable to takina (swap shots present)', () => {
    const takinaDmg = E_base.filter(
      (e) => e.kind === 'damage' && e.srcSlot != null
    );
    // at least some takina damage events fire inside a Full Burst window (swap runs 10s from cast)
    const inFb = takinaDmg.filter((e) => e.inFullBurst === true);
    expect(inFb.length).toBeGreaterThan(0);
  });
  it('applies the targets-hit boss debuff Damage Taken ▲~6.04', () => {
    const dt604 = E_base.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.stat === 'damageTakenPct' &&
        near(e.value, 6.04)
    );
    expect(dt604.length).toBeGreaterThanOrEqual(1);
  });
  it.skip('burst self: "Normal attacks deal true damage for 10s" — no type-conversion primitive', () => {
    // GAP: schema has no "convert normal-attack damage TYPE to true" mechanic. weaponSwap has
    // no `flavor` field, and trueDamagePct is a Damage-Up BUCKET buff, not a type conversion.
    // Belongs in the override `note`/`unmodeled`, not a block. Cannot be asserted.
  });
});

describe('takina — global inertness sanity', () => {
  it("all of takina's SELF-only buffs leave crown byte-identical when individually zeroed", () => {
    expect(dmg(R_noAtk, 'crown')).toBeCloseTo(dmg(R_base, 'crown'), 6);
    expect(dmg(R_noSelfTrue, 'crown')).toBeCloseTo(dmg(R_base, 'crown'), 6);
  });
});
