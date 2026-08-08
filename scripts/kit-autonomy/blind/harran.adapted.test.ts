/**
 * harran — SR / Electric / Attacker / Burst III (ammo 6, chargeFrames 60, reload 159f).
 * BLIND kit spec test: written from the kit prose ALONE (no sight of any authored override,
 * driver test, or reasoning). Every counterfactual locates effects STRUCTURALLY (by effect
 * kind), never by a hard-coded block index, so it survives a different-but-faithful encoding.
 *
 * Kit lines and why each assertion discriminates:
 *  S1a "25% chance of activating when attacking" -> Virus Transfer: 17.28% of final ATK every
 *      1 sec for 5 sec. => a `dot` (durationSec 5, intervalSec 1) on a per-attack trigger that
 *      expresses the 25% proc rate deterministically (the engine has no RNG primitive): either a
 *      1-in-4 gate (everyN:4 / hitCount count 4) or the rate-scaled 4.32%/tick equivalent.
 *      NEAREST-WRONG: an UNGATED every-shot 17.28% DoT (a 4x over-credit) — killed structurally.
 *  S1b "Activates when an enemy afflicted with Virus Transfer is neutralized. Affects 2 nearest
 *      enemy unit(s)." => GAP. Scope lock is one partless immortal boss with no adds; nothing is
 *      ever neutralized and the engine has no kill event. it.skip.
 *  S2a "Activates when attacking with Full Charge. Affects self." -> Gain Pierce for 1 round(s)
 *      + Critical Rate 2.95% for 1 round(s). => DURATION SEMANTICS: "for 1 round(s)" is a ROUND
 *      count (durationShots:1), never 1 second. SCOPE: the text says plain "Critical Rate", so it
 *      is unscoped critRatePct — NOT critRateNormalPct. TARGET: self only.
 *      NEAREST-WRONG: durationSec-based expiry (asserted against via durationShots on buffApply)
 *      and a team-wide grant (asserted against via targetSlug inertness).
 *      Pierce-for-1-round has no exact primitive (gainPierce carries durationSec only, and the
 *      hasPierce flag is whole-fight) => GAP; the live test only asserts pierce is expressed.
 *  S2b "Activates when killing an enemy. ATK 3.02%, stacks up to 15, lasts 10 sec." => GAP +
 *      INERTNESS: a killless fight must show ZERO of these stacks. A passive/permanent encoding
 *      would silently hand harran up to +45.3% ATK for the whole fight.
 *  B   "Affects all enemies. Deals 999% of final ATK as Burst Skill damage." => one burstCast-keyed
 *      flatDamage, no core (the text does not say core strike). Burst-cast damage lands BEFORE the
 *      Full Burst window opens, so it must NOT take the +50% FB major.
 *      NEAREST-WRONG: keying it to fullBurstEnter, which DOES take the major — the counterfactual
 *      run proves the shipped model sits strictly below that.
 *
 * Fixture: controlComp('harran', true) — liter B1 + crown B2 supply the chain so the B3 carry
 * actually casts (a lone Burst III unit makes ZERO full bursts, which would make every burst and
 * every full-charge assertion vacuous). Deterministic (no seed). 7 hoisted 180s runs.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { controlComp, runComp, totals, withPatchedOverride } from '../../tests/lib/harness.js';

const SLUG = 'harran';
const SLOTS = ['skill1', 'skill2', 'burst'] as const;
type Slot = (typeof SLOTS)[number];

// Deliberately loose local mirrors of the override shape: this test must not depend on the
// exact authored structure, only on the effect kinds the kit text requires.
interface LooseEffect {
  kind: string;
  stat?: string;
  value?: number;
  atkPct?: number;
  durationSec?: number;
  durationShots?: number;
  intervalSec?: number;
  maxStacks?: number;
  core?: boolean;
}
interface LooseBlock {
  trigger?: { kind?: string; count?: number };
  everyN?: number;
  effects?: LooseEffect[];
}
type LooseSlot = LooseBlock[] | { blocks?: LooseBlock[]; hasPierce?: boolean } | undefined;
interface LooseOverride {
  hasPierce?: boolean;
  skill1?: LooseSlot;
  skill2?: LooseSlot;
  burst?: LooseSlot;
}
interface BuffApplyEv {
  kind: 'buffApply';
  stat: string;
  value: number;
  targetSlug?: string;
  durationShots?: number;
  casterIdx: number | null;
  targetIdx: number | null;
}

function blocksOf(ov: LooseOverride, slot: Slot): LooseBlock[] {
  const s = ov[slot];
  if (!s) return [];
  return Array.isArray(s) ? s : (s.blocks ?? []);
}
function allBlocks(ov: LooseOverride): LooseBlock[] {
  return SLOTS.flatMap((s) => blocksOf(ov, s));
}
function effectsOf(bs: LooseBlock[]): LooseEffect[] {
  return bs.flatMap((b) => b.effects ?? []);
}

/** An untouched in-memory clone of the committed override (disk JSON never modified). */
function snapshot(): LooseOverride {
  return withPatchedOverride(SLUG, () => {}) as unknown as LooseOverride;
}

function run(mutate?: (ov: LooseOverride) => void, sink?: SimEvent[]) {
  const opts = controlComp(SLUG, true);
  const loose = opts as unknown as {
    overrides?: Record<string, unknown>;
    cfg?: Record<string, unknown>;
  };
  if (mutate) {
    loose.overrides = {
      ...(loose.overrides ?? {}),
      [SLUG]: withPatchedOverride(SLUG, (ov) => mutate(ov as unknown as LooseOverride)),
    };
  }
  if (sink) {
    loose.cfg = { ...(loose.cfg ?? {}), onEvent: (ev: SimEvent) => sink.push(ev) };
  }
  return runComp(opts);
}

// ---- counterfactual mutators (structural: find by effect kind, never by index) ----
function scaleBurstFlat(ov: LooseOverride, factor: number): void {
  for (const e of effectsOf(blocksOf(ov, 'burst'))) {
    if (e.kind === 'flatDamage' && typeof e.atkPct === 'number') e.atkPct *= factor;
  }
}
function reKeyBurstToFbEnter(ov: LooseOverride): void {
  for (const b of blocksOf(ov, 'burst')) {
    if ((b.effects ?? []).some((e) => e.kind === 'flatDamage')) {
      b.trigger = { kind: 'fullBurstEnter' };
    }
  }
}
function scaleDots(ov: LooseOverride, factor: number): void {
  for (const e of effectsOf(allBlocks(ov))) {
    if (e.kind === 'dot' && typeof e.atkPct === 'number') e.atkPct *= factor;
  }
}
function zeroCritBuff(ov: LooseOverride): void {
  for (const e of effectsOf(allBlocks(ov))) {
    if (e.kind === 'buff' && (e.stat === 'critRatePct' || e.stat === 'critRateNormalPct')) {
      e.value = 0;
    }
  }
}

// ---- hoisted runs (each is a full 180s sim) ----
const events: SimEvent[] = [];
const baseRes = run(undefined, events);
const base = totals(baseRes)[SLUG];
const burstZero = totals(run((ov) => scaleBurstFlat(ov, 0)))[SLUG];
const burstHalf = totals(run((ov) => scaleBurstFlat(ov, 0.5)))[SLUG];
const burstFbKeyed = totals(run(reKeyBurstToFbEnter))[SLUG];
const dotZero = totals(run((ov) => scaleDots(ov, 0)))[SLUG];
const dotDouble = totals(run((ov) => scaleDots(ov, 2)))[SLUG];
const critZero = totals(run(zeroCritBuff))[SLUG];
const ov0 = snapshot();

const buffs = events.filter((e) => e.kind === 'buffApply') as unknown as BuffApplyEv[];
const teamTotals = totals(baseRes);

describe('harran — fixture non-vacuity', () => {
  it('the control comp actually bursts and full-bursts (else every gated assertion is vacuous)', () => {
    expect(events.filter((e) => e.kind === 'burstCast').length).toBeGreaterThan(0);
    expect(events.filter((e) => e.kind === 'fullBurstStart').length).toBeGreaterThan(0);
    expect(events.filter((e) => e.kind === 'shot').length).toBeGreaterThan(0);
    expect(base).toBeGreaterThan(0);
  });

  it('harran is the only slug this spec asserts on, and teammates are present', () => {
    expect(Object.keys(teamTotals)).toContain(SLUG);
    expect(Object.keys(teamTotals).length).toBeGreaterThan(1);
  });
});

describe('harran burst — "Deals 999% of final ATK as Burst Skill damage"', () => {
  it('is authored as a burstCast-keyed 999% flatDamage with no core strike', () => {
    const flats = effectsOf(blocksOf(ov0, 'burst')).filter((e) => e.kind === 'flatDamage');
    expect(flats.length).toBe(1);
    expect(flats[0].atkPct).toBeCloseTo(999, 2);
    // the kit text never says "core strike" -> the nuke must not be core-eligible
    expect(flats[0].core ?? false).toBe(false);
    const carrier = blocksOf(ov0, 'burst').find((b) =>
      (b.effects ?? []).some((e) => e.kind === 'flatDamage'),
    );
    expect(carrier?.trigger?.kind).toBe('burstCast');
  });

  it('the 999% is the real damage source and scales linearly with atkPct', () => {
    // zeroing it must cost damage; halving it must cost about half as much.
    expect(burstZero).toBeLessThan(base);
    const full = base - burstZero;
    const half = base - burstHalf;
    expect(half / full).toBeGreaterThan(0.4);
    expect(half / full).toBeLessThan(0.6);
  });

  it('is FB-exempt: burst-cast damage lands before the Full Burst window opens', () => {
    // NEAREST-WRONG: the same nuke keyed to fullBurstEnter takes the +50% FB major.
    // A faithful burstCast model must sit STRICTLY below it.
    expect(burstFbKeyed).toBeGreaterThan(base);
  });
});

describe('harran S1 — Virus Transfer (17.28% of final ATK every 1 sec for 5 sec, 25% on attack)', () => {
  it('is modeled as a 5 sec / 1 sec-interval DoT', () => {
    const dots = effectsOf(allBlocks(ov0)).filter((e) => e.kind === 'dot');
    expect(dots.length).toBeGreaterThan(0);
    for (const d of dots) {
      expect(d.durationSec).toBeCloseTo(5, 3);
      expect(d.intervalSec ?? 1).toBeCloseTo(1, 3);
    }
  });

  it('expresses the 25% proc chance — NOT an ungated every-shot 17.28% DoT', () => {
    const carriers = allBlocks(ov0).filter((b) =>
      (b.effects ?? []).some((e) => e.kind === 'dot'),
    );
    expect(carriers.length).toBeGreaterThan(0);
    const expresses25 = carriers.some((b) => {
      const dot = (b.effects ?? []).find((e) => e.kind === 'dot');
      const everyN =
        b.everyN ?? (b.trigger?.kind === 'hitCount' ? b.trigger?.count : undefined);
      const rateScaled = Math.abs((dot?.atkPct ?? 0) - 17.28 * 0.25) < 0.05;
      return everyN === 4 || rateScaled;
    });
    expect(expresses25).toBe(true);
    // and the nearest-wrong shape (full 17.28% every single attack, no gate) must be absent
    const ungatedFullRate = carriers.some((b) => {
      const dot = (b.effects ?? []).find((e) => e.kind === 'dot');
      const gated =
        b.everyN !== undefined || b.trigger?.kind === 'hitCount' || b.trigger?.kind === 'interval';
      return !gated && Math.abs((dot?.atkPct ?? 0) - 17.28) < 0.05;
    });
    expect(ungatedFullRate).toBe(false);
  });

  it('the DoT actually contributes damage and scales linearly with its atkPct', () => {
    expect(dotZero).toBeLessThan(base);
    const lost = base - dotZero;
    const gained = dotDouble - base;
    expect(gained).toBeGreaterThan(0);
    expect(gained / lost).toBeGreaterThan(0.85);
    expect(gained / lost).toBeLessThan(1.15);
  });

  it.skip('S1b spread on neutralize (2 nearest enemies) — GAP: no kill event / no adds at scope lock', () => {
    // The scope-lock fight is a single partless immortal boss. Nothing is ever neutralized and
    // the engine models no enemy entity, so this line is unobservable and correctly inert.
  });
});

describe('harran S2 — full-charge self buffs ("for 1 round(s)")', () => {
  it('grants Critical Rate 2.95% with a ROUND-count duration, to SELF only', () => {
    const crit = buffs.filter(
      (b) => b.stat === 'critRatePct' && Math.abs(b.value - 2.95) < 0.01,
    );
    expect(crit.length).toBeGreaterThan(0);
    // DURATION SEMANTICS: "1 round" is one fired round, not 1 second.
    for (const b of crit) expect(b.durationShots).toBe(1);
    // TARGET SET: self only — the kit says "Affects self".
    expect(crit.some((b) => b.targetSlug === SLUG)).toBe(true);
    expect(crit.every((b) => b.targetSlug === undefined || b.targetSlug === SLUG)).toBe(true);
  });

  it('the crit line is UNSCOPED critRatePct, not the normal-attack-scoped variant', () => {
    // The prose says plain "Critical Rate"; critRateNormalPct would under-credit her burst/skill hits.
    const scoped = buffs.filter(
      (b) => b.stat === 'critRateNormalPct' && Math.abs(b.value - 2.95) < 0.01,
    );
    expect(scoped.length).toBe(0);
  });

  it('the crit buff moves damage (it is live, not an inert authoring artifact)', () => {
    expect(critZero).toBeLessThan(base);
  });

  it('Pierce is expressed somewhere (flag or gainPierce effect)', () => {
    const s2 = ov0.skill2;
    const slotFlag = !Array.isArray(s2) && s2 ? s2.hasPierce === true : false;
    const gain = effectsOf(allBlocks(ov0)).some((e) => e.kind === 'gainPierce');
    expect(ov0.hasPierce === true || slotFlag || gain).toBe(true);
  });

  it.skip('Pierce "for 1 round(s)" — GAP: gainPierce carries durationSec only, hasPierce is whole-fight', () => {
    // No primitive expresses a ROUND-scoped pierce window. Both available encodings are
    // approximations (a charge SR full-charges nearly every shot, so uptime is high either way);
    // the residual is unobservable here because pierce only matters via a Pierce Damage buff.
  });

  it.skip('S2b ATK 3.02% x15 on kill — GAP: nothing dies at scope lock', () => {
    // Kill-triggered; the boss is immortal and there are no adds. See the inertness test below,
    // which is the ENFORCED half of this gap.
  });

  it('the kill-gated ATK stack is INERT in a killless fight', () => {
    const killStacks = buffs.filter(
      (b) => b.stat === 'atkPct' && Math.abs(b.value - 3.02) < 0.01,
    );
    expect(killStacks.length).toBe(0);
    // and it must not be authored on an always-on trigger that a future kill model would double-count
    for (const b of allBlocks(ov0)) {
      const carries = (b.effects ?? []).some(
        (e) => e.kind === 'buff' && e.stat === 'atkPct' && Math.abs((e.value ?? 0) - 3.02) < 0.01,
      );
      if (carries) expect(b.trigger?.kind).not.toBe('passive');
    }
  });
});

describe('harran — inertness (her whole kit is self / enemy scoped)', () => {
  it('grants no buff to any teammate', () => {
    const toOthers = buffs.filter(
      (b) => b.targetSlug !== undefined && b.targetSlug !== SLUG && b.targetIdx !== null,
    );
    const harranSignature = toOthers.filter(
      (b) =>
        (b.stat === 'critRatePct' && Math.abs(b.value - 2.95) < 0.01) ||
        (b.stat === 'atkPct' && Math.abs(b.value - 3.02) < 0.01),
    );
    expect(harranSignature.length).toBe(0);
  });

  it('inflicts no boss debuff (no damageTakenPct line in her kit)', () => {
    const bossDebuffs = buffs.filter(
      (b) => b.casterIdx === null && b.targetIdx === null && b.stat === 'damageTakenPct',
    );
    // liter/crown/helm carry no Damage-Taken line either at scope lock; any such event would mean
    // harran was authored with a debuff her prose does not contain.
    expect(bossDebuffs.length).toBe(0);
  });
});
