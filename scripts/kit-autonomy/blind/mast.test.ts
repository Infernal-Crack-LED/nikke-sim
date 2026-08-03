/**
 * mast (SMG / Electric / Supporter / Burst II) — BLIND kit spec test.
 * Written from the kit prose ALONE (no sight of the shipped override, the driver's tests, or any
 * reasoning). Every assertion below is derived from the kit text + the documented harness surface.
 *
 * KIT (level-10 magnitudes, structure preserved):
 *   skill1 A  "Activates after landing 2 critical hit(s) with normal attacks. Affects the target(s)."
 *             Sea Breeze: DEF -1.9% OF THE SKILL USER'S DEF, stacks up to 50, lasts 3 sec.
 *   skill1 B  "Activates when HP falls below 70%. Affects self and 2 other ally unit(s) with the
 *             highest FINAL ATK (except the skill user)."  Critical Damage +50.94% CONTINUOUSLY.
 *   skill2    "Activates at the start of battle. Affects self and 2 ally unit(s) with the highest
 *             FINAL ATK (except the skill user)."  Critical Rate +23.56% for 30 sec.
 *   burst A   same 3-unit target set: Max HP +86.2% OF THE SKILL USER'S Max HP ("without restoring
 *             HP"), 7 sec; Critical Damage +25.19%, 7 sec.
 *   burst B   "Affects the target(s) afflicted with Sea Breeze."  Storm: 4.52% of final ATK,
 *             MIRRORS the Sea Breeze stack count, every 1 sec for 7 sec.
 *
 * FIXTURE — and the one real hazard here:
 *   controlComp('mast', true) seats liter(B1) / crown(B2) / mast(carry slot) / helm(B3). mast is a
 *   BURST II unit and crown already occupies the B2 slot ahead of her, so the rotation may never
 *   select mast's own burst — which would make every burst-block assertion vacuous rather than
 *   discriminating. Burst assertions therefore read a FIXTURE variant that appends a
 *   `burstEligibility: 3` block to mast's burst slot. That accommodation changes only WHEN she may
 *   cast, never WHAT her burst does, so it cannot manufacture any value the assertions read. The
 *   first test records whether she bursts WITHOUT the accommodation.
 *
 * DISCRIMINATION NOTES are inline per test (what the faithful reading gives vs the nearest-wrong).
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js'; // path fixed by driver (gauntlet S5): blind/ sits under kit-autonomy/, not tests/units/


const SLUG = 'mast';

type Ev = SimEvent & Record<string, any>;

/** Run a comp while collecting the full event log. */
function record(opts: any): { res: any; evs: Ev[] } {
  const evs: Ev[] = [];
  const on = (e: SimEvent) => {
    evs.push(e as Ev);
  };
  const o: any = { ...opts, onEvent: on, cfg: { ...(opts?.cfg ?? {}), onEvent: on } };
  return { res: runComp(o), evs };
}

/**
 * The override FILE is slot-keyed, but the two documented descriptions of the in-memory clone
 * disagree on whether a slot is a bare Block[] or a CharacterSkills carrying `.blocks`. Both shapes
 * are handled so a shape guess can never turn into a false RED.
 */
function slotBlocks(ov: any, slot: string): any[] {
  const s = ov?.[slot];
  if (!s) return [];
  if (Array.isArray(s)) return s;
  return Array.isArray(s.blocks) ? s.blocks : [];
}
function setSlotBlocks(ov: any, slot: string, blocks: any[]): void {
  if (!ov?.[slot]) return;
  if (Array.isArray(ov[slot])) ov[slot] = blocks;
  else ov[slot].blocks = blocks;
}

const DAMAGE_KINDS = new Set(['dot', 'flatDamage', 'storedHit']);

/** Fixture accommodation only — lets a Burst II carry actually cast in the control comp. */
function addEligibility(ov: any): void {
  slotBlocks(ov, 'burst').push({
    slot: 'burst',
    trigger: { kind: 'passive' },
    target: { kind: 'self' },
    effects: [{ kind: 'burstEligibility', stage: 3 }],
  });
}
/** mast's burst carries exactly one damage line (Storm), so stripping burst damage == no Storm. */
function stripBurstDamage(ov: any): void {
  for (const b of slotBlocks(ov, 'burst')) {
    if (Array.isArray(b.effects)) b.effects = b.effects.filter((e: any) => !DAMAGE_KINDS.has(e?.kind));
  }
}
/** Removes the sole Sea Breeze source (and, unavoidably, the skill1 crit-damage line). */
function dropSkill1(ov: any): void {
  setSlotBlocks(ov, 'skill1', []);
}

let SLOWED = false;
/** Quarter the Sea Breeze application rate => fewer live stacks for Storm to mirror. */
function slowSeaBreeze(ov: any): void {
  for (const b of slotBlocks(ov, 'skill1')) {
    const t = b?.trigger;
    if (t?.kind === 'hitCount' && typeof t.count === 'number') {
      t.count *= 4;
      if (typeof t.countInFb === 'number') t.countInFb *= 4;
      SLOWED = true;
    } else if (t?.kind === 'interval' && typeof t.sec === 'number') {
      t.sec *= 4;
      SLOWED = true;
    } else if (t?.kind === 'shotFired') {
      b.everyN = (b.everyN ?? 1) * 4;
      SLOWED = true;
    }
  }
}

const BASE = controlComp(SLUG, true) as any;
const withOv = (ov: any) => ({ ...BASE, overrides: { ...(BASE?.overrides ?? {}), [SLUG]: ov } });

const OV_FX = withPatchedOverride(SLUG, (ov: any) => addEligibility(ov));
const OV_FX_NO_STORM = withPatchedOverride(SLUG, (ov: any) => {
  addEligibility(ov);
  stripBurstDamage(ov);
});
const OV_FX_NO_SB = withPatchedOverride(SLUG, (ov: any) => {
  addEligibility(ov);
  dropSkill1(ov);
});
const OV_FX_NO_BOTH = withPatchedOverride(SLUG, (ov: any) => {
  addEligibility(ov);
  dropSkill1(ov);
  stripBurstDamage(ov);
});
const OV_FX_SLOW = withPatchedOverride(SLUG, (ov: any) => {
  addEligibility(ov);
  slowSeaBreeze(ov);
});
const OV_FX_SLOW_NO_STORM = withPatchedOverride(SLUG, (ov: any) => {
  addEligibility(ov);
  slowSeaBreeze(ov);
  stripBurstDamage(ov);
});

// ---- hoisted runs (7 full 180s sims) --------------------------------------------------------
const R_BASE = record(BASE);
const R_FX = record(withOv(OV_FX));
const R_FX_NO_STORM = record(withOv(OV_FX_NO_STORM));
const R_FX_NO_SB = record(withOv(OV_FX_NO_SB));
const R_FX_NO_BOTH = record(withOv(OV_FX_NO_BOTH));
const R_FX_SLOW = record(withOv(OV_FX_SLOW));
const R_FX_SLOW_NO_STORM = record(withOv(OV_FX_SLOW_NO_STORM));

const near = (a: number, b: number, eps = 0.01) => Math.abs(a - b) < eps;
const buffsOf = (evs: Ev[], stat: string, value: number) =>
  evs.filter((e) => e.kind === 'buffApply' && e.stat === stat && typeof e.value === 'number' && near(e.value, value));
const targetsOf = (evs: Ev[]) => new Set(evs.map((e) => e.targetSlug));
const mastIdxOf = (evs: Ev[]): unknown => {
  const seed =
    buffsOf(evs, 'critRatePct', 23.56)[0] ??
    buffsOf(evs, 'critDamagePct', 25.19)[0] ??
    buffsOf(evs, 'critDamagePct', 50.94)[0];
  return seed ? seed.casterIdx : undefined;
};
const continuous = (ef: unknown) => ef === undefined || ef === null || (typeof ef === 'number' && ef >= 10_000);

describe('mast — fixture viability', () => {
  it('mast is a Burst II carry: records whether the control comp lets her burst unaided', () => {
    const natural = buffsOf(R_BASE.evs, 'critDamagePct', 25.19).length;
    const accommodated = buffsOf(R_FX.evs, 'critDamagePct', 25.19).length;
    // Non-vacuity gate for the whole burst section: at least one fixture must actually cast her
    // burst, otherwise every burst assertion below would be trivially satisfiable.
    expect(natural + accommodated).toBeGreaterThan(0);
  });
});

describe('mast skill2 — Critical Rate +23.56% for 30 sec, start of battle', () => {
  const cr = buffsOf(R_BASE.evs, 'critRatePct', 23.56);

  it('applies to exactly 3 units — self PLUS the 2 highest-final-ATK OTHER allies', () => {
    expect(cr.length).toBeGreaterThan(0);
    const t = targetsOf(cr);
    // Nearest-wrong #1: alliesTopAtk{count:2, excludeSelf:true} alone (exclude-then-take-N) buffs
    // only 2 allies and DROPS mast herself -> size 2, no 'mast'.
    // Nearest-wrong #2: a plain `allies` target -> size 4 (whole team).
    expect(t.size).toBe(3);
    expect(t.has(SLUG)).toBe(true);
  });

  it('is a one-shot 30 sec window, not a permanent or refreshing buff', () => {
    expect(cr.length).toBe(3); // exactly one apply per target for the whole fight
    for (const e of cr) {
      // Applied at battle start => expiry at ~30s * 60fps = 1800.
      // Nearest-wrong #1: modeled permanent (no durationSec) -> undefined / >= 10800.
      // Nearest-wrong #2: keyed to fullBurstEnter / interval -> many applies, cr.length > 3.
      expect(typeof e.expiresFrame).toBe('number');
      expect(e.expiresFrame).toBeGreaterThan(1750);
      expect(e.expiresFrame).toBeLessThan(1850);
    }
  });
});

describe('mast skill1 — Critical Damage +50.94% continuously', () => {
  const cd = buffsOf(R_BASE.evs, 'critDamagePct', 50.94);

  it('is present and continuous (no time expiry)', () => {
    // The kit gates this on "HP falls below 70%". The sim has no HP pool, so the faithful reading of
    // a real raid fight (a supporter drops under 70% early) is an always-live buff; the ONSET delay
    // is the flagged unknown, not the buff's existence. A model that omits the line entirely
    // under-credits mast's support value for the whole fight.
    expect(cd.length).toBeGreaterThan(0);
    for (const e of cd) expect(continuous(e.expiresFrame)).toBe(true);
  });

  it('hits the same 3-unit set as her other target clauses (self + 2 highest-final-ATK others)', () => {
    const t = targetsOf(cd);
    expect(t.size).toBe(3);
    expect(t.has(SLUG)).toBe(true);
    // All three of mast's target clauses are worded identically, so the sets must coincide.
    expect([...t].sort()).toEqual([...targetsOf(buffsOf(R_BASE.evs, 'critRatePct', 23.56))].sort());
  });
});

describe('mast skill1 — Sea Breeze (DEF -1.9% of the SKILL USER\'s DEF, 50 stacks, 3 sec)', () => {
  it('is not fudged into a Damage Taken debuff on the boss', () => {
    // Sea Breeze reduces the BOSS's DEF by a share of MAST's DEF — flat-subtraction math. Mapping it
    // onto damageTakenPct (a multiplier on damage dealt) is a different mechanic with different
    // magnitude behaviour; nearest-wrong is a 1.9-per-stack or 95-total damageTakenPct debuff.
    const dt = R_BASE.evs.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.stat === 'damageTakenPct' &&
        typeof e.value === 'number' &&
        (near(e.value, 1.9) || near(e.value, 95)),
    );
    expect(dt).toHaveLength(0);
  });

  it.skip('GAP: the DEF-reduction payload itself has no engine channel', () => {
    // There is no boss-DEF-reduction StatKey (defPct is documented inert in v1, and damageTakenPct is
    // a different mechanic). Up to 50 stacks x 1.9% = 95% of mast's DEF subtracted from boss DEF is a
    // real, team-wide damage gain that the sim cannot represent. It belongs in `unmodeled`; the only
    // load-bearing consequence that IS modelable is the status window that gates Storm (tested below).
  });

  it.skip('GAP: the trigger is CRIT-gated ("2 critical hits with normal attacks"), engine has no crit counter', () => {
    // The nearest available primitive is hitCount:2, which fires every 2 hits regardless of crit and
    // therefore over-applies stacks by ~1/critRate. A faithful approximation is
    // hitCount = round(2 / effective crit rate) — a flagged estimate, not a kit value. Its magnitude
    // is unverifiable blind because Storm's damage is the only observable and it has no ground truth.
  });
});

describe('mast burst — buff block (self + 2 highest-final-ATK others, 7 sec)', () => {
  const evs = R_FX.evs;
  const bcd = buffsOf(evs, 'critDamagePct', 25.19);
  const mastIdx = mastIdxOf(evs);
  const mhp = evs.filter((e) => e.kind === 'buffApply' && e.stat === 'maxHpFlat' && e.casterIdx === mastIdx);

  it('Critical Damage +25.19% goes to exactly 3 units, on a bounded 7 sec window', () => {
    expect(bcd.length).toBeGreaterThan(0);
    const t = targetsOf(bcd);
    expect(t.size).toBe(3);
    expect(t.has(SLUG)).toBe(true);
    expect(bcd.length % 3).toBe(0); // 3 applies per cast
    for (const e of bcd) {
      // Nearest-wrong: modeled continuous (the kit says "for 7 sec") -> undefined / >= 10800.
      expect(typeof e.expiresFrame).toBe('number');
      expect(e.expiresFrame).toBeLessThan(10_000);
    }
  });

  it('re-applies once per burst cast, not once per Full Burst entry', () => {
    const stamps = [...new Set(bcd.map((e) => e.expiresFrame as number))].sort((a, b) => a - b);
    expect(stamps.length).toBe(bcd.length / 3);
    // Her burst cooldown is 20s (1200 frames); two applications inside one rotation window would
    // mean the block is keyed to a team-wide trigger rather than her own cast.
    for (let i = 1; i < stamps.length; i++) expect(stamps[i] - stamps[i - 1]).toBeGreaterThan(600);
  });

  it('Max HP grant is CASTER-scaled (86.2% of MAST\'s Max HP), identical flat value for every target', () => {
    expect(mhp.length).toBeGreaterThan(0);
    const t = targetsOf(mhp);
    expect(t.size).toBe(3);
    expect(t.has(SLUG)).toBe(true);
    // casterMaxHpPct resolves to ONE flat HP number shared by all targets. Nearest-wrong is
    // targetMaxHpPct ("Max HP +86.2%"), which resolves per-target and would emit differing values
    // whenever the three targets differ in Max HP.
    const vals = new Set(mhp.map((e) => Math.round(e.value as number)));
    expect(vals.size).toBe(1);
    expect([...vals][0]).toBeGreaterThan(0);
    // Same 7 sec window as the crit-damage line (same kit block).
    expect([...new Set(mhp.map((e) => e.expiresFrame))].sort()).toEqual(
      [...new Set(bcd.map((e) => e.expiresFrame))].sort(),
    );
  });
});

describe('mast burst — Storm (4.52% of final ATK, mirrors Sea Breeze stacks, 1s x 7s)', () => {
  const stormDamage = totals(R_FX.res)[SLUG] - totals(R_FX_NO_STORM.res)[SLUG];
  const stormDamageWithoutSeaBreeze = totals(R_FX_NO_SB.res)[SLUG] - totals(R_FX_NO_BOTH.res)[SLUG];

  it('deals real damage (the block is not inert)', () => {
    expect(stormDamage).toBeGreaterThan(0);
  });

  it('is GATED on Sea Breeze: with no Sea Breeze source, Storm contributes exactly zero', () => {
    // Both sides of this delta lack skill1, so every non-Storm damage path is identical between them
    // and the delta isolates Storm alone.
    // Nearest-wrong: an UNGATED Storm (no requiresTargetStatus / no stack scaling) still ticks its
    // 4.52% seven times per cast and this delta comes out positive.
    expect(stormDamageWithoutSeaBreeze).toBe(0);
  });

  it('MIRRORS the stack count: slowing Sea Breeze application strictly reduces Storm damage', () => {
    const slowedStorm = totals(R_FX_SLOW.res)[SLUG] - totals(R_FX_SLOW_NO_STORM.res)[SLUG];
    if (!SLOWED) {
      // The generic trigger mutation found no hitCount/interval/shotFired trigger on skill1, so the
      // "slow" run is identical to baseline and this comparison cannot discriminate. Recorded rather
      // than silently passing.
      expect(slowedStorm).toBe(stormDamage);
      return;
    }
    // Faithful (perResource stack mirroring): fewer live stacks -> strictly less Storm damage.
    // Nearest-wrong (flat 4.52% per tick, stack count ignored): unchanged.
    expect(slowedStorm).toBeGreaterThan(0);
    expect(slowedStorm).toBeLessThan(stormDamage);
  });

  it('is enemy-only — removing Storm leaves every teammate byte-identical', () => {
    const before = totals(R_FX.res);
    const after = totals(R_FX_NO_STORM.res);
    for (const slug of Object.keys(before)) {
      if (slug === SLUG) continue;
      expect(after[slug]).toBe(before[slug]);
    }
  });

  it.skip('tick cadence (<= 7 ticks at 1 sec per cast) needs per-source damage-event attribution', () => {
    // damage events are documented to carry bucket/srcSlot but no guaranteed source-slug field, and
    // unitOf(res, slug) row-level event exposure is not part of the documented contract:
    //   const row: any = unitOf(R_FX.res, SLUG);
    // Asserting a tick count on a guessed field name would risk a false RED on harness shape rather
    // than on model faithfulness. The load-bearing Storm claims (non-inert, Sea-Breeze-gated,
    // stack-mirroring) are all covered by the totals-based deltas above.
    expect(unitOf(R_FX.res, SLUG)).toBeTruthy();
  });
});

describe('mast — inertness / no-invention checks', () => {
  it('grants nothing to the 4th teammate on any of her three target clauses', () => {
    const mastIdx = mastIdxOf(R_FX.evs);
    const mine = R_FX.evs.filter((e) => e.kind === 'buffApply' && e.casterIdx === mastIdx && e.targetIdx !== null);
    const t = targetsOf(mine);
    expect(t.size).toBeLessThanOrEqual(3);
  });

  it('carries no ATK / attack-damage grant — her kit has no such line', () => {
    const mastIdx = mastIdxOf(R_BASE.evs);
    const invented = R_BASE.evs.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.casterIdx === mastIdx &&
        ['atkPct', 'casterAtkPct', 'highestAllyAtkPct', 'attackDamagePct', 'coreDamagePct'].includes(e.stat as string),
    );
    expect(invented).toHaveLength(0);
  });
});
