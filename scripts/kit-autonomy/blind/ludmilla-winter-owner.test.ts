/**
 * ludmilla-winter-owner - BLIND kit-spec test (kit-autonomy S5 post-op).
 *
 * Written from the kit prose ALONE (MG/Water/Attacker/Burst III, ammo 300,
 * reloadFrames 201, hitsPerShot 1, normalAttackMultiplier 5.86). No sight of the
 * driver's override, tests, or reasoning.
 *
 * KIT, reduced to its structural minimum:
 *   S1a  every 60 normal-attack hits -> enemy: Damage Taken +12.56% for 3s, +158.43% ATK hit
 *   S1b  every 60 normal-attack hits -> self:  reload 20 rounds
 *   S2a  every 60 CORE hits          -> enemy: +109.64% ATK hit
 *   S2b  at the beginning of Full Burst -> self: Critical Rate +14.6% for 10s
 *   B    own burst cast              -> self:  ATK +62.54% for 10s, Reload Speed +67.2% for 20s
 *
 * FIXTURE: controlComp(SLUG, true) - liter B1 / crown B2 / ludmilla B3 / helm B3.
 *   B1+B2 are mandatory: a lone Burst III unit makes ZERO full bursts, so every
 *   burst-keyed line would be vacuous. helm is KEPT as the second B3 on purpose -
 *   ludmilla therefore does not necessarily cast on every rotation, which is what
 *   lets 'fires on every Full Burst' (S2b) discriminate fullBurstEnter from
 *   burstCast. helm's own crit line uses the critRateNormalPct key, a different
 *   stat, so it cannot collide with the value-filtered assertions below.
 *
 * DISCRIMINATION STRATEGY (two independent layers per line):
 *   1. STRUCTURAL - trigger identity, target set, threshold, stat key and duration
 *      semantics are asserted against a CLONE of the shipped override, captured
 *      through withPatchedOverride's mutate callback (no fs access needed). A wrong
 *      trigger kind, a scoped-vs-generic crit key, or a round-count duration fails here.
 *   2. COUNTERFACTUAL - every line also gets a run with that one effect removed or its
 *      magnitude changed. The faithful model must be observably different from the
 *      nearest-wrong one, so no assertion can be satisfied by an inert block.
 *   INERTNESS - self-scoped lines (crit, ATK, both flat riders) must leave every
 *      teammate byte-identical; the enemy-scoped Damage Taken debuff must NOT (it is a
 *      boss debuff the whole team eats - failure-mode taxonomy #4). Reload-economy
 *      lines are deliberately NOT asserted inert: they change shot count, hence burst
 *      gauge, hence the team's whole rotation.
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

const SLUG = 'ludmilla-winter-owner';

type Ev = SimEvent & Record<string, any>;
type Ov = Record<string, any>;

const SLOTS: Array<'skill1' | 'skill2' | 'burst'> = ['skill1', 'skill2', 'burst'];

// The override FILE is slot-keyed; a slot is either a Block[] or a CharacterSkills
// carrying its own blocks[]. Both shapes are handled so a shape guess cannot void
// the whole test file.
const blocksOf = (ov: Ov, slot: string): any[] => {
  const s: any = ov?.[slot];
  if (!s) return [];
  return Array.isArray(s) ? s : Array.isArray(s.blocks) ? s.blocks : [];
};
const allBlocks = (ov: Ov): any[] => SLOTS.flatMap((s) => blocksOf(ov, s));
const eff = (b: any): any[] => (Array.isArray(b?.effects) ? b.effects : []);

const near = (a: any, b: number) => typeof a === 'number' && Math.abs(a - b) < 1e-6;
const isBuff = (e: any, stat: string, value?: number) =>
  e?.kind === 'buff' && e.stat === stat && (value === undefined || near(e.value, value));
const isFlat = (e: any, atkPct: number) => e?.kind === 'flatDamage' && near(e.atkPct, atkPct);
const isInstantReload = (e: any) => e?.kind === 'instantReload';

const blockWith = (ov: Ov, pred: (e: any) => boolean) =>
  allBlocks(ov).find((b) => eff(b).some(pred));
const effectWith = (ov: Ov, pred: (e: any) => boolean) =>
  allBlocks(ov).flatMap(eff).find(pred);
const slotWith = (ov: Ov, pred: (e: any) => boolean) =>
  SLOTS.find((s) => blocksOf(ov, s).some((b) => eff(b).some(pred)));

// ---------------------------------------------------------------------------
// shipped override snapshot (structural layer)
// ---------------------------------------------------------------------------
let shipped: Ov = {};
withPatchedOverride(SLUG, (ov: any) => {
  shipped = JSON.parse(JSON.stringify(ov));
});

// ---------------------------------------------------------------------------
// counterfactual patches - each records how many effects/blocks it actually bit,
// so a MISSING line fails loudly instead of producing a silently-identical run.
// ---------------------------------------------------------------------------
const dropWhere = (ov: Ov, pred: (e: any) => boolean) => {
  let n = 0;
  for (const b of allBlocks(ov)) {
    const before = eff(b).length;
    b.effects = eff(b).filter((e: any) => !pred(e));
    n += before - b.effects.length;
  }
  return n;
};

let nDropDt = 0;
const pNoDamageTaken = withPatchedOverride(SLUG, (ov: any) => {
  nDropDt = dropWhere(ov, (e) => isBuff(e, 'damageTakenPct', 12.56));
});

let nLongDt = 0;
const pLongDamageTaken = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of allBlocks(ov))
    for (const e of eff(b))
      if (isBuff(e, 'damageTakenPct', 12.56)) {
        e.durationSec = 30;
        nLongDt++;
      }
});

let nThresh = 0;
const pDoubleThreshold = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of allBlocks(ov)) {
    if (!eff(b).some((e: any) => isBuff(e, 'damageTakenPct', 12.56))) continue;
    if (b.trigger?.kind === 'hitCount' && typeof b.trigger.count === 'number') {
      b.trigger.count *= 2;
      nThresh++;
    }
  }
});

let nNoS1Rider = 0;
const pNoS1Rider = withPatchedOverride(SLUG, (ov: any) => {
  nNoS1Rider = dropWhere(ov, (e) => isFlat(e, 158.43));
});

let nNoS2Rider = 0;
const pNoS2Rider = withPatchedOverride(SLUG, (ov: any) => {
  nNoS2Rider = dropWhere(ov, (e) => isFlat(e, 109.64));
});

let nNoReload = 0;
const pNoInstantReload = withPatchedOverride(SLUG, (ov: any) => {
  nNoReload = dropWhere(ov, isInstantReload);
});

let nFullReload = 0;
const pFullReload = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of allBlocks(ov))
    for (const e of eff(b))
      if (isInstantReload(e)) {
        e.fraction = 1;
        nFullReload++;
      }
});

let nNoCrit = 0;
const pNoCrit = withPatchedOverride(SLUG, (ov: any) => {
  nNoCrit = dropWhere(ov, (e) => isBuff(e, 'critRatePct', 14.6));
});

let nCritAllies = 0;
const pCritAllies = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of allBlocks(ov))
    if (eff(b).some((e: any) => isBuff(e, 'critRatePct', 14.6))) {
      b.target = { kind: 'allies' };
      nCritAllies++;
    }
});

let nNoBurstAtk = 0;
const pNoBurstAtk = withPatchedOverride(SLUG, (ov: any) => {
  nNoBurstAtk = dropWhere(ov, (e) => isBuff(e, 'atkPct', 62.54));
});

let nNoBurstReload = 0;
const pNoBurstReload = withPatchedOverride(SLUG, (ov: any) => {
  nNoBurstReload = dropWhere(ov, (e) => isBuff(e, 'reloadSpeedPct', 67.2));
});

// ---------------------------------------------------------------------------
// runs (hoisted - each is a full 180s sim)
// ---------------------------------------------------------------------------
const collect = (patched?: any) => {
  const events: Ev[] = [];
  const opts: any = controlComp(SLUG, true);
  opts.cfg = {
    ...(opts.cfg ?? {}),
    onEvent: (ev: SimEvent) => {
      events.push(ev as Ev);
    },
  };
  if (patched) opts.overrides = { ...(opts.overrides ?? {}), [SLUG]: patched };
  const res = runComp(opts);
  const all = totals(res);
  return { res, events, all, self: all[SLUG] };
};

const base = collect();
const rNoDt = collect(pNoDamageTaken);
const rLongDt = collect(pLongDamageTaken);
const rThresh = collect(pDoubleThreshold);
const rNoS1Rider = collect(pNoS1Rider);
const rNoS2Rider = collect(pNoS2Rider);
const rNoReload = collect(pNoInstantReload);
const rFullReload = collect(pFullReload);
const rNoCrit = collect(pNoCrit);
const rCritAllies = collect(pCritAllies);
const rNoBurstAtk = collect(pNoBurstAtk);
const rNoBurstReload = collect(pNoBurstReload);

const others = Object.keys(base.all).filter((s) => s !== SLUG);
const teammatesIdentical = (r: { all: Record<string, number> }) =>
  others.every((s) => r.all[s] === base.all[s]);
const someTeammateMoved = (r: { all: Record<string, number> }) =>
  others.some((s) => r.all[s] !== base.all[s]);

const buffApplies = (evs: Ev[], stat: string, value?: number, target?: string) =>
  evs.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.stat === stat &&
      (value === undefined || near(e.value, value)) &&
      (target === undefined || e.targetSlug === target),
  );

const fbStarts = base.events.filter((e) => e.kind === 'fullBurstStart').length;
// Her own burst casts, counted via the self ATK buff her burst block applies -
// a well-specified buffApply, unlike guessing the burstCast event's slug field.
const herBursts = buffApplies(base.events, 'atkPct', 62.54, SLUG).length;

describe('ludmilla-winter-owner - fixture sanity (non-vacuity)', () => {
  it('wires cfg.onEvent and produces damage', () => {
    expect(base.events.length).toBeGreaterThan(0);
    expect(base.self).toBeGreaterThan(0);
    expect(unitOf(base.res, SLUG).totalDamage).toBeCloseTo(base.self, 6);
  });

  it('the override declares all three skill slots', () => {
    for (const s of SLOTS) expect(blocksOf(shipped, s).length).toBeGreaterThan(0);
  });

  it('the comp actually full-bursts and she actually casts', () => {
    // Both burst-keyed lines below would be vacuous without these.
    expect(fbStarts).toBeGreaterThanOrEqual(2);
    expect(herBursts).toBeGreaterThanOrEqual(1);
    // helm shares the B3 slot, so herBursts <= fbStarts; whenever it is strictly
    // less, the S2b equality assertion genuinely separates fullBurstEnter from burstCast.
    expect(herBursts).toBeLessThanOrEqual(fbStarts);
  });
});

describe('S1a - every 60 normal hits: Damage Taken +12.56% for 3s (enemy)', () => {
  const b = blockWith(shipped, (e) => isBuff(e, 'damageTakenPct', 12.56));

  it('is a hitCount:60 trigger aimed at the enemy', () => {
    // Nearest-wrong: shotFired (counts pulls, not landed hits), interval, or a
    // self/allies target (Damage Taken is a BOSS debuff, never a self buff).
    expect(b).toBeDefined();
    expect(b.trigger?.kind).toBe('hitCount');
    expect(b.trigger?.count).toBe(60);
    expect(b.target?.kind).toBe('enemy');
  });

  it('lasts 3 wall-clock seconds, not N rounds', () => {
    // Failure-mode taxonomy #2: 'for 3 sec' is seconds; durationShots would be wrong.
    const e = eff(b).find((x: any) => isBuff(x, 'damageTakenPct', 12.56));
    expect(e.durationSec).toBe(3);
    expect(e.durationShots).toBeUndefined();
  });

  it('emits a boss-held debuff many times over the fight', () => {
    const applies = buffApplies(base.events, 'damageTakenPct', 12.56);
    // Boss-held debuffs carry casterIdx === null AND targetIdx === null.
    expect(applies.length).toBeGreaterThanOrEqual(5);
    for (const a of applies) {
      expect(a.casterIdx).toBeNull();
      expect(a.targetIdx).toBeNull();
      expect(a.durationShots).toBeUndefined();
    }
  });

  it('is a TEAM-WIDE debuff: removing it moves teammates too', () => {
    // Discriminates the faithful enemy-scoped debuff from a self-only ATK-ish buff:
    // under the wrong model her teammates would be byte-identical.
    expect(nDropDt).toBeGreaterThan(0);
    expect(rNoDt.self).toBeLessThan(base.self);
    expect(someTeammateMoved(rNoDt)).toBe(true);
  });

  it('the 3s window is load-bearing (stretching it raises team damage)', () => {
    // Non-vacuity for the duration: a 3s window covers only a slice of the fight,
    // so 3 -> 30 must be observably better. Under a 'permanent debuff' model the
    // two runs would be identical.
    expect(nLongDt).toBeGreaterThan(0);
    expect(rLongDt.self).toBeGreaterThan(base.self);
    expect(someTeammateMoved(rLongDt)).toBe(true);
  });

  it('the 60-hit threshold actually drives the proc rate', () => {
    // Doubling the threshold must roughly halve the procs. Slightly worse than half
    // because the S1b reload procs halve too (fewer rounds -> fewer hits), hence the
    // generous lower band rather than an exact ratio.
    expect(nThresh).toBeGreaterThan(0);
    const baseProcs = buffApplies(base.events, 'damageTakenPct', 12.56).length;
    const halfProcs = buffApplies(rThresh.events, 'damageTakenPct', 12.56).length;
    expect(halfProcs).toBeGreaterThanOrEqual(1);
    expect(halfProcs).toBeLessThan(baseProcs);
    expect(halfProcs * 2).toBeGreaterThan(baseProcs * 0.7);
  });
});

describe('S1a - the +158.43% of final ATK rider', () => {
  const b = blockWith(shipped, (e) => isFlat(e, 158.43));

  it('rides the same 60-normal-hit / enemy activation', () => {
    expect(b).toBeDefined();
    expect(slotWith(shipped, (e) => isFlat(e, 158.43))).toBe('skill1');
    expect(b.trigger?.kind).toBe('hitCount');
    expect(b.trigger?.count).toBe(60);
    expect(b.target?.kind).toBe('enemy');
    expect(b.requiresCore).toBeFalsy(); // this half of S1 is NOT core-gated
  });

  it('is real damage and is self-sourced only', () => {
    // Discriminates a live rider from a declared-but-inert one, and proves it feeds
    // no shot/gauge channel (teammates must be byte-identical).
    expect(nNoS1Rider).toBeGreaterThan(0);
    expect(rNoS1Rider.self).toBeLessThan(base.self);
    expect(teammatesIdentical(rNoS1Rider)).toBe(true);
  });
});

describe('S1b - every 60 normal hits: reload 20 rounds (self)', () => {
  const b = blockWith(shipped, isInstantReload);
  const e = effectWith(shipped, isInstantReload);

  it('is a self-targeted hitCount:60 partial refill, not a full reload', () => {
    // 20 of a 300-round belt = fraction ~0.0667. A missing fraction means a FULL
    // magazine refill - the nearest-wrong model, and a large over-credit on an MG.
    expect(b).toBeDefined();
    expect(b.trigger?.kind).toBe('hitCount');
    expect(b.trigger?.count).toBe(60);
    expect(b.target?.kind).toBe('self');
    expect(typeof e.fraction).toBe('number');
    expect(e.fraction).toBeGreaterThan(0.04);
    expect(e.fraction).toBeLessThan(0.11);
  });

  it('the refill measurably raises her damage (reload economy IS damage)', () => {
    // Taxonomy #6: weapon-state / ammo lines gate shot count. Removing the refill
    // must cost damage; the runs would be identical if the line were skipped.
    expect(nNoReload).toBeGreaterThan(0);
    expect(rNoReload.self).toBeLessThan(base.self);
  });

  it('20 rounds is strictly weaker than a full belt refill', () => {
    // Discriminates the magnitude: under fraction:1 she would gain much more uptime.
    expect(nFullReload).toBeGreaterThan(0);
    expect(rFullReload.self).toBeGreaterThan(base.self);
  });

  // No teammate-inertness assertion here on purpose: changing her shot count changes
  // burst-gauge generation, which legitimately shifts the whole team's rotation.
});

describe('S2a - every 60 CORE hits: +109.64% of final ATK (enemy)', () => {
  const b = blockWith(shipped, (e) => isFlat(e, 109.64));

  it('exists in skill2 and targets the enemy', () => {
    expect(b).toBeDefined();
    expect(slotWith(shipped, (e) => isFlat(e, 109.64))).toBe('skill2');
    expect(b.target?.kind).toBe('enemy');
  });

  it('is core-conditioned, not a plain 60-normal-hit clone of S1a', () => {
    // Core hits are a strict SUBSET of normal hits, so a faithful model must either
    // gate on core (requiresCore) or raise the threshold above 60 to account for the
    // core rate. The nearest-wrong model - hitCount:60 with no core conditioning at
    // all - makes S2a fire exactly as often as S1a and over-credits it.
    const coreGated = b.requiresCore === true;
    const rarer = b.trigger?.kind === 'hitCount' && (b.trigger?.count ?? 0) > 60;
    expect(coreGated || rarer).toBe(true);
  });

  it('cannot fire more often than the un-gated 60-normal-hit line', () => {
    // Cheap corollary of the subset relation, checked on the shipped structure.
    const s1 = blockWith(shipped, (e) => isBuff(e, 'damageTakenPct', 12.56));
    if (b.trigger?.kind === 'hitCount' && s1?.trigger?.kind === 'hitCount') {
      expect(b.trigger.count).toBeGreaterThanOrEqual(s1.trigger.count);
    }
  });

  it('is real damage and is self-sourced only', () => {
    expect(nNoS2Rider).toBeGreaterThan(0);
    expect(rNoS2Rider.self).toBeLessThan(base.self);
    expect(teammatesIdentical(rNoS2Rider)).toBe(true);
  });

  it.skip('fires once per 60 CORE hits at the measured core rate', () => {
    // GAP: the engine has no core-hit counter - hitCount counts landed rounds, and
    // requiresCore is only an exposure gate. The faithful threshold is 60/coreRate,
    // whose magnitude is Hit-Rate->core derived and MEASUREMENT-GATED (always-flag
    // field #7). Unassertable blind; recorded rather than guessed.
  });
});

describe('S2b - Full Burst start: Critical Rate +14.6% for 10s (self)', () => {
  const b = blockWith(shipped, (e) => isBuff(e, 'critRatePct', 14.6));

  it('is fullBurstEnter + self, with no own-burst gate', () => {
    // Trigger identity (taxonomy #3): the text says 'at the beginning of Full Burst',
    // i.e. ANY team Full Burst - not burstCast (own-cast only, and pre-FB), and not
    // ownBurstGate:'cast', which would silently drop the rotations helm completes.
    expect(b).toBeDefined();
    expect(b.trigger?.kind).toBe('fullBurstEnter');
    expect(b.target?.kind).toBe('self');
    expect(b.ownBurstGate).toBeUndefined();
  });

  it('is GENERIC crit rate for 10 seconds, not normal-attack-scoped', () => {
    // The kit line is a bare 'Critical Rate' - critRateNormalPct would under-credit
    // her burst and both flat riders.
    const e = eff(b).find((x: any) => isBuff(x, 'critRatePct', 14.6));
    expect(e.durationSec).toBe(10);
    expect(e.durationShots).toBeUndefined();
    expect(buffApplies(base.events, 'critRateNormalPct', 14.6).length).toBe(0);
  });

  it('applies on EVERY Full Burst, only ever to herself', () => {
    const applies = buffApplies(base.events, 'critRatePct', 14.6);
    expect(applies.length).toBe(fbStarts);
    for (const a of applies) expect(a.targetSlug).toBe(SLUG);
  });

  it('is load-bearing damage and inert on teammates', () => {
    expect(nNoCrit).toBeGreaterThan(0);
    expect(rNoCrit.self).toBeLessThan(base.self);
    expect(teammatesIdentical(rNoCrit)).toBe(true);
  });

  it('the self scope is load-bearing (an allies-scoped model moves the team)', () => {
    // Non-vacuity for 'Affects self': under the nearest-wrong allies target the
    // teammates gain crit rate and their totals move.
    expect(nCritAllies).toBeGreaterThan(0);
    expect(someTeammateMoved(rCritAllies)).toBe(true);
  });
});

describe('Burst - self: ATK +62.54% for 10s, Reload Speed +67.2% for 20s', () => {
  const atkBlock = blockWith(shipped, (e) => isBuff(e, 'atkPct', 62.54));
  const rsBlock = blockWith(shipped, (e) => isBuff(e, 'reloadSpeedPct', 67.2));

  it('both buffs hang off her own burst cast, self-targeted', () => {
    expect(atkBlock).toBeDefined();
    expect(rsBlock).toBeDefined();
    expect(atkBlock.trigger?.kind).toBe('burstCast');
    expect(rsBlock.trigger?.kind).toBe('burstCast');
    expect(atkBlock.target?.kind).toBe('self');
    expect(rsBlock.target?.kind).toBe('self');
    expect(slotWith(shipped, (e) => isBuff(e, 'atkPct', 62.54))).toBe('burst');
    expect(slotWith(shipped, (e) => isBuff(e, 'reloadSpeedPct', 67.2))).toBe('burst');
  });

  it('ATK is self-scaling atkPct at the raw kit percentage', () => {
    // 'ATK up 62.54%' scales her OWN ATK -> atkPct keeps the raw percentage.
    // casterAtkPct (the nearest-wrong key) would re-emit as a flat ATK number instead.
    const applies = buffApplies(base.events, 'atkPct', 62.54, SLUG);
    expect(applies.length).toBeGreaterThanOrEqual(1);
    expect(applies[0].casterIdx).toBe(applies[0].targetIdx);
    expect(applies[0].durationShots).toBeUndefined();
  });

  it('the two windows differ by exactly 10s (10s ATK vs 20s reload speed)', () => {
    // Both are applied on the same cast frame, so the expiresFrame delta is exactly
    // (20 - 10) * 60 = 600 frames. A copy-paste 10s/10s or 20s/20s model fails here,
    // and so does a permanent (no-expiry) model.
    const atk = buffApplies(base.events, 'atkPct', 62.54, SLUG)[0];
    const rs = buffApplies(base.events, 'reloadSpeedPct', 67.2, SLUG)[0];
    expect(atk).toBeDefined();
    expect(rs).toBeDefined();
    expect(rs.expiresFrame - atk.expiresFrame).toBe(600);
  });

  it('the ATK buff is real and inert on teammates', () => {
    expect(nNoBurstAtk).toBeGreaterThan(0);
    expect(rNoBurstAtk.self).toBeLessThan(base.self);
    expect(teammatesIdentical(rNoBurstAtk)).toBe(true);
  });

  it('the Reload Speed buff is real damage (it buys shots on a 201-frame reload)', () => {
    // Taxonomy #6 again: reload speed is never a defensive no-op. No teammate
    // inertness claim - her shot count feeds burst gauge and may shift the rotation.
    expect(nNoBurstReload).toBeGreaterThan(0);
    expect(rNoBurstReload.self).toBeLessThan(base.self);
  });
});
