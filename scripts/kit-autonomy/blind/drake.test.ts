/**
 * drake -- blind per-unit kit spec test. Written from the kit prose ALONE
 * (driver override / driver test / truth file NOT consulted).
 *
 * KIT AS READ
 *   skill1 [a] entering Full Burst, all allies:     Hit Rate 20.09%, ATK 11.85%, 10 sec
 *          [b] entering Full Burst, Shotgun allies:  ATK 63.88%, Max Ammo 50.14%, 10 sec
 *   skill2 [a] after 10 normal attacks -> enemy:     98.55% of final ATK
 *          [b] after 5 normal attacks  -> enemy:     201.6% of final ATK
 *   burst  [a] enemies in attack range:              3009.6% of final ATK
 *          [b] self:                                 Max Ammo 72.18%, Attack Damage 31.68%, 10 sec
 *
 * FIXTURE
 *   controlComp(drake, true) -- liter B1 + crown B2 carry the burst chain to stage 3; a lone B3
 *   makes ZERO Full Bursts, which would make every fullBurstEnter assertion vacuous. helm stays
 *   so the fixture also holds a SECOND B3 (drake must still take bursts of her own). helm/liter/
 *   crown are non-SG, which is what makes the Shotgun-scope branch observable at all.
 *   Deterministic, no seed, 180 s.
 *
 * DISCRIMINATION METHOD
 *   Each counterfactual changes exactly ONE authored fact via withPatchedOverride, so the delta
 *   between two otherwise identical deterministic runs is attributable to that fact alone -- no
 *   per-unit event attribution is needed for the damage counts.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUG = 'drake';

interface Run {
  res: ReturnType<typeof runComp>;
  events: SimEvent[];
}

function run(opts: any): Run {
  const events: SimEvent[] = [];
  const res = runComp({
    ...opts,
    cfg: { ...(opts.cfg ?? {}), onEvent: (ev: SimEvent) => events.push(ev) },
  });
  return { res, events };
}

const near = (a: number, b: number) => Math.abs(a - b) < 0.005;

// A slot on the override is either a bare Block[] or a CharacterSkills carrying its own
// blocks[]. Both shapes are handled so a counterfactual can never silently become a no-op.
const slotBlocks = (ov: any, slot: string): any[] => {
  const s = ov?.[slot];
  if (!s) {return [];}
  return Array.isArray(s) ? s : (s.blocks ?? []);
};

const setSlotBlocks = (ov: any, slot: string, blocks: any[]): void => {
  if (Array.isArray(ov?.[slot])) {ov[slot] = blocks;}
  else if (ov?.[slot]) {ov[slot].blocks = blocks;}
};

const hasEffect = (b: any, pred: (e: any) => boolean) =>
  (b.effects ?? []).some(pred);

const isBuff = (stat: string, value: number) => (e: any) =>
  e.kind === 'buff' && e.stat === stat && near(e.value, value);

const isFlat = (value: number) => (e: any) =>
  e.kind === 'flatDamage' && near(e.atkPct, value);

// --- counterfactual builders (one authored fact each) ---

const retarget = (slot: string, pred: (e: any) => boolean, target: any) =>
  withPatchedOverride(SLUG, (ov: any) => {
    for (const b of slotBlocks(ov, slot))
      {if (hasEffect(b, pred)) {b.target = target;}}
  });

const dropEffects = (specs: { slot: string; pred: (e: any) => boolean }[]) =>
  withPatchedOverride(SLUG, (ov: any) => {
    for (const s of specs) {
      for (const b of slotBlocks(ov, s.slot)) {
        b.effects = (b.effects ?? []).filter((e: any) => !s.pred(e));
      }
      setSlotBlocks(
        ov,
        s.slot,
        slotBlocks(ov, s.slot).filter((b: any) => (b.effects ?? []).length > 0)
      );
    }
  });

const withOv = (ov: any) => ({
  ...controlComp(SLUG, true),
  overrides: { [SLUG]: ov },
});

// --- event readers ---

const T = (r: Run) => totals(r.res);

const buffApplies = (r: Run, stat: string, value: number) =>
  (r.events as any[]).filter(
    (e) => e.kind === 'buffApply' && e.stat === stat && near(e.value, value)
  );

const recipients = (evs: any[]) => new Set(evs.map((e) => e.targetSlug));

const dmgFrom = (r: Run, slot: string) =>
  (r.events as any[]).filter((e) => e.kind === 'damage' && e.srcSlot === slot);

const shots = (r: Run) => (r.events as any[]).filter((e) => e.kind === 'shot');

const fbStarts = (r: Run) =>
  (r.events as any[]).filter((e) => e.kind === 'fullBurstStart');

// --- hoisted runs (each is a full 180 s sim) ---

const base = run(controlComp(SLUG, true));
const s1SelfScope = run(
  withOv(retarget('skill1', isBuff('atkPct', 11.85), { kind: 'self' }))
);
const s1SgToAll = run(
  withOv(retarget('skill1', isBuff('atkPct', 63.88), { kind: 'allies' }))
);
const s1NoTeamAtk = run(
  withOv(dropEffects([{ slot: 'skill1', pred: isBuff('atkPct', 11.85) }]))
);
const s1NoHitRate = run(
  withOv(dropEffects([{ slot: 'skill1', pred: isBuff('hitRatePct', 20.09) }]))
);
const noAmmoBuffs = run(
  withOv(
    dropEffects([
      { slot: 'skill1', pred: isBuff('maxAmmoPct', 50.14) },
      { slot: 'burst', pred: isBuff('maxAmmoPct', 72.18) },
    ])
  )
);
const s2OnlyTen = run(
  withOv(dropEffects([{ slot: 'skill2', pred: isFlat(201.6) }]))
);
const s2None = run(
  withOv(
    dropEffects([
      { slot: 'skill2', pred: isFlat(201.6) },
      { slot: 'skill2', pred: isFlat(98.55) },
    ])
  )
);
const noNuke = run(
  withOv(dropEffects([{ slot: 'burst', pred: isFlat(3009.6) }]))
);
const burstSelfToAllies = run(
  withOv(
    retarget('burst', isBuff('attackDamagePct', 31.68), { kind: 'allies' })
  )
);
const noAtkDmg = run(
  withOv(
    dropEffects([{ slot: 'burst', pred: isBuff('attackDamagePct', 31.68) }])
  )
);

const roster = Object.keys(T(base));
const teammates = roster.filter((s) => s !== SLUG);

describe('drake -- fixture non-vacuity', () => {
  it('actually reaches Full Burst and drake actually casts her own burst', () => {
    // Without this, every fullBurstEnter / burstCast assertion below would pass vacuously.
    expect(fbStarts(base).length).toBeGreaterThanOrEqual(2);
    expect(
      buffApplies(base, 'attackDamagePct', 31.68).length
    ).toBeGreaterThanOrEqual(2);
    expect(unitOf(base.res, SLUG).totalDamage).toBe(T(base)[SLUG]);
    expect(teammates.length).toBe(3);
  });
});

describe('drake skill1 -- Full Burst team branch (all allies)', () => {
  it('applies Hit Rate 20.09% and ATK 11.85% to EVERY ally on each Full Burst entry', () => {
    const hr = buffApplies(base, 'hitRatePct', 20.09);
    const atk = buffApplies(base, 'atkPct', 11.85);
    // Scope: all allies. Nearest-wrong (self-only, or Shotgun-only) shrinks the recipient set.
    expect(recipients(hr)).toEqual(new Set(roster));
    expect(recipients(atk)).toEqual(new Set(roster));
    // Trigger identity: full-burst-ENTER fires once per FB for every ally. A burstCast keying
    // would fire only on rotations drake herself bursts (helm is a second B3), giving fewer.
    expect(hr.length).toBe(fbStarts(base).length * roster.length);
    expect(atk.length).toBe(fbStarts(base).length * roster.length);
  });

  it('the 10 sec window is wall-clock, not a round count', () => {
    // Nearest-wrong: durationShots (for N rounds) encoding, which would stretch across reloads.
    for (const ev of buffApplies(base, 'atkPct', 11.85) as any[]) {
      expect(ev.durationShots).toBeUndefined();
      expect(ev.expiresFrame).toBeGreaterThan(0);
      expect(ev.maxStacks ?? 1).toBe(1);
    }
  });

  it('ATK 11.85% is load-bearing on TEAMMATES, not just on drake', () => {
    // Functional (not merely event-level) proof of the ally scope: strip the effect and every
    // teammate loses damage. Under a self-scoped nearest-wrong the same loss appears.
    for (const s of teammates) {
      expect(T(base)[s]).toBeGreaterThan(T(s1NoTeamAtk)[s]);
      expect(T(base)[s]).toBeGreaterThan(T(s1SelfScope)[s]);
    }
    expect(recipients(buffApplies(s1SelfScope, 'atkPct', 11.85))).toEqual(
      new Set([SLUG])
    );
  });

  it('Hit Rate 20.09% lifts damage through the core-hit path', () => {
    // Presence/direction only -- the hit-rate to core-rate magnitude is a derived model.
    expect(T(base)[SLUG]).toBeGreaterThan(T(s1NoHitRate)[SLUG]);
  });
});

describe('drake skill1 -- Shotgun-only branch', () => {
  it('ATK 63.88% and Max Ammo 50.14% reach shotgun allies ONLY', () => {
    const sgAtk = recipients(buffApplies(base, 'atkPct', 63.88));
    const sgAmmo = recipients(buffApplies(base, 'maxAmmoPct', 50.14));
    const all = recipients(buffApplies(base, 'atkPct', 11.85));
    expect(sgAtk.has(SLUG)).toBe(true);
    expect(sgAmmo.has(SLUG)).toBe(true);
    // Strict subset of the all-allies branch: the nearest-wrong (weapon filter dropped, encoded
    // as plain allies) makes these two sets equal.
    expect(sgAtk.size).toBeLessThan(all.size);
    expect(sgAmmo.size).toBeLessThan(all.size);
    for (const s of sgAtk) {expect(all.has(s as string)).toBe(true);}
  });

  it('the Shotgun restriction is real, not an engine no-op', () => {
    // Non-vacuity: retargeted to plain allies the SAME effect DOES reach everyone, so the base
    // run withholding it from liter/crown/helm is an authored scope decision.
    expect(recipients(buffApplies(s1SgToAll, 'atkPct', 63.88))).toEqual(
      new Set(roster)
    );
  });

  it('Max Ammunition is damage: the ammo buffs buy drake more shots', () => {
    // Weapon-state modifier, not a defensive stat: 9-round magazine plus ~50%/~72% raises the
    // magazine and cuts reload count over the 180 s fight.
    expect(shots(base).length).toBeGreaterThan(shots(noAmmoBuffs).length);
    expect(T(base)[SLUG]).toBeGreaterThan(T(noAmmoBuffs)[SLUG]);
  });
});

describe('drake skill2 -- normal-attack counters', () => {
  const s2Base = dmgFrom(base, 'skill2').length;
  const s2Ten = dmgFrom(s2OnlyTen, 'skill2').length;
  const s2Zero = dmgFrom(s2None, 'skill2').length;
  const procsFive = s2Base - s2Ten;
  const procsTen = s2Ten - s2Zero;

  it('the 5-attack rider fires about twice as often as the 10-attack rider', () => {
    expect(procsTen).toBeGreaterThan(0);
    expect(procsFive).toBeGreaterThan(0);
    // Thresholds 5 and 10 over the same shot stream give a 2:1 proc ratio regardless of whether
    // the engine counts rounds or pellets. Nearest-wrong (both keyed to the same threshold, or
    // the thresholds swapped) lands at 1.0 or 0.5.
    expect(procsFive / procsTen).toBeGreaterThan(1.6);
    expect(procsFive / procsTen).toBeLessThan(2.4);
  });

  it('the LARGER 201.6% payload sits on the MORE frequent 5-attack counter', () => {
    const dmgFive = T(base)[SLUG] - T(s2OnlyTen)[SLUG];
    const dmgTen = T(s2OnlyTen)[SLUG] - T(s2None)[SLUG];
    expect(dmgTen).toBeGreaterThan(0);
    // Expected ~ (2 procs x 201.6) / (1 proc x 98.55) = ~4.1. The swapped-magnitude
    // nearest-wrong (98.55 on the 5-counter, 201.6 on the 10-counter) lands at ~0.98.
    expect(dmgFive / dmgTen).toBeGreaterThan(2.8);
    expect(dmgFive / dmgTen).toBeLessThan(5.8);
  });

  it('the riders are gated on normal attacks, not on wall clock', () => {
    // Cutting drake shot count (ammo buffs removed) must cut the proc count. An interval trigger
    // would emit the same number of procs in a fixed 180 s fight.
    expect(dmgFrom(noAmmoBuffs, 'skill2').length).toBeLessThan(s2Base);
  });

  it.skip('fans to the 3 enemies with the lowest remaining HP -- unobservable on a single boss', () => {
    // GAP: v1 has one partless boss, so the 3-target spread and the HP ordering cannot be read.
  });
});

describe('drake burst', () => {
  const nBursts = buffApplies(base, 'attackDamagePct', 31.68).length;
  const burstDmgDelta =
    dmgFrom(base, 'burst').length - dmgFrom(noNuke, 'burst').length;

  it('the 3009.6% hit lands exactly once per drake burst cast', () => {
    expect(nBursts).toBeGreaterThanOrEqual(2);
    // Trigger identity: burst-cast, not full-burst-enter. helm is a second B3, so an FB-enter
    // keying would over-fire (one hit per team Full Burst rather than per drake cast).
    expect(burstDmgDelta).toBe(nBursts);
  });

  it('the burst hit resolves OUTSIDE the Full Burst window', () => {
    const outFb = (r: Run) =>
      dmgFrom(r, 'burst').filter((e: any) => e.inFullBurst === false).length;
    // A burst cast lands before the FB window opens, so every added hit must be FB-exempt by
    // timing. Nearest-wrong: a hit re-keyed into the FB window collects the +50% major.
    expect(outFb(base) - outFb(noNuke)).toBe(burstDmgDelta);
  });

  it('Max Ammo 72.18% and Attack Damage 31.68% stay on drake (self scope)', () => {
    const ad = buffApplies(base, 'attackDamagePct', 31.68) as any[];
    const ammo = buffApplies(base, 'maxAmmoPct', 72.18) as any[];
    expect(recipients(ad)).toEqual(new Set([SLUG]));
    expect(recipients(ammo)).toEqual(new Set([SLUG]));
    expect(ammo.length).toBe(nBursts);
    for (const ev of ad) {
      expect(ev.casterIdx).toBe(ev.targetIdx);
      expect(ev.durationShots).toBeUndefined();
    }
    // Non-vacuity: retargeted to allies the same buff DOES reach the team, so the base run
    // keeping it on drake is an authored scope decision, not an inert stat.
    expect(
      recipients(buffApplies(burstSelfToAllies, 'attackDamagePct', 31.68)).size
    ).toBeGreaterThan(1);
  });

  it('Attack Damage 31.68% moves drake and NOTHING else', () => {
    expect(T(base)[SLUG]).toBeGreaterThan(T(noAtkDmg)[SLUG]);
    // Inertness: a self buff must leave every teammate byte-identical.
    for (const s of teammates) {expect(T(noAtkDmg)[s]).toBe(T(base)[s]);}
  });

  it.skip('hits all enemies within attack range -- AoE spread unobservable on a single boss', () => {
    // GAP: one enemy in the fixture, so range-scoped multi-target fan-out cannot be discriminated.
  });

  it.skip('Hit Rate 20.09% to core-rate magnitude -- measurement-gated', () => {
    // GAP: the hit-rate to core-hit conversion is a derived model; only presence and direction
    // are asserted above, never the magnitude.
  });
});
