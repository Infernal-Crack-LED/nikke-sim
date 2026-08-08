/**
 * eunhwa — BLIND kit spec (cross-family S5 post-op; written from the kit prose alone,
 * with no sight of the driver's override, tests, or reasoning).
 *
 * KIT (SR / Fire / Attacker / Burst II, cd 20s, ammo 6, chargeFrames 60, hitsPerShot 1,
 *      normalAttackMultiplier 71.07, coreAttackMultiplier 200):
 *
 *   skill1  "Affects self. Activates after firing the last round."
 *             Charge Damage ▲ 37.28% for 2 shots
 *             Charge Speed  ▲ 15.53% for 2 rounds
 *   skill2  "Activates after firing the last bullet. Affects the target."
 *             DEF ▼ 29% for 5 sec
 *   burst   "Affects 10 enemy unit(s) with the highest final ATK."
 *             Deals 85.62% of final ATK as damage
 *             DEF ▼ 2.43% for 15 sec
 *           "Affects all allies."
 *             Critical Rate ▲ 4.65% for 15 sec
 *
 * READING (the four questions):
 *   scope     — nothing is scoped to normal attacks. "Critical Rate ▲" is generic critRatePct,
 *               NOT critRateNormalPct; "Charge Damage ▲" is additive chargeDamagePct, NOT the
 *               chargeDamageMultPct primitive (that one is worded "Charge Damage Multiplier").
 *   duration  — S1 is ROUND-COUNTED ("for 2 shots" / "for 2 rounds") => durationShots: 2 on both,
 *               so the window spans the reload that immediately follows the last bullet and covers
 *               the first two rounds of the next magazine. S2 (5 sec) and both burst lines (15 sec)
 *               are wall-clock => durationSec, with durationShots undefined.
 *   trigger   — S1 and S2 share ONE activation clause ("after firing the last round/bullet")
 *               => lastBullet on both: once per magazine, never once per trigger pull.
 *   target    — S1 self; S2 the enemy (boss-held debuff, targetIdx === null); burst line 1 the
 *               enemy; burst line 2 "all allies" with NO except-self clause => eunhwa included.
 *
 * FIXTURE: controlComp('eunhwa', true) — liter (B1) / crown (B2) / eunhwa / helm (B3).
 *   eunhwa is Burst II, so she contends with crown for the stage-2 slot; her own 20s burst cooldown
 *   already caps her at every other rotation, and with liter's CDR the rotation period is shorter
 *   than 20s, so the two B2 units alternate and she casts on roughly half the rotations. Every burst
 *   assertion is therefore preceded by an explicit non-vacuity check that she cast at all — a fixture
 *   that never let her burst would make the burst group vacuous rather than red, which is the one
 *   outcome a blind spec must not produce silently. helm is kept because a comp with no castable B3
 *   makes ZERO Full Bursts; helm's crit line is critRateNormalPct — a different stat key — so it
 *   cannot contaminate the critRatePct filters below.
 *
 * SHAPE DEFENSIVENESS: the packet describes the override file two ways (slot -> Block[] and
 * slot -> { blocks: Block[] }), so blocksOf() accepts both. A wrong guess would silently turn every
 * counterfactual into a no-op — green-on-nothing, the worst failure available to a blind test.
 *
 * SIGN CONVENTION: value filters match on |value|, because the kit text fixes the MAGNITUDE and
 * DIRECTION of a ▼ debuff but not its encoding sign. Direction is asserted where it is unambiguous
 * (▲ buffs must be positive) and left to the counterfactuals otherwise.
 */

import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUG = 'eunhwa';

type Slot = 'skill1' | 'skill2' | 'burst';
type Opts = ReturnType<typeof controlComp>;

interface BuffApplyEv {
  kind: 'buffApply';
  stat: string;
  value: number;
  casterIdx: number | null;
  targetIdx: number | null;
  targetSlug?: string;
  expiresFrame?: number;
  durationShots?: number;
}

interface LooseEffect {
  kind: string;
  stat?: string;
  atkPct?: number;
}

interface LooseBlock {
  trigger: { kind: string };
  target: { kind: string };
  effects: LooseEffect[];
}

/** Accepts BOTH documented override shapes: slot -> Block[] and slot -> { blocks: Block[] }. */
function blocksOf(ov: unknown, slot: Slot): LooseBlock[] {
  const raw = (ov as Record<string, unknown>)[slot];
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as LooseBlock[];
  const nested = (raw as { blocks?: unknown }).blocks;
  return Array.isArray(nested) ? (nested as LooseBlock[]) : [];
}

function run(opts: Opts): { res: ReturnType<typeof runComp>; events: SimEvent[] } {
  const events: SimEvent[] = [];
  const o = opts as Opts & { cfg?: Record<string, unknown> };
  const res = runComp({
    ...o,
    cfg: { ...(o.cfg ?? {}), onEvent: (ev: SimEvent) => events.push(ev) },
  } as Opts);
  return { res, events };
}

function compWith(patched: unknown): Opts {
  const c = controlComp(SLUG, true) as Opts & {
    overrides?: Record<string, unknown>;
  };
  return { ...c, overrides: { ...(c.overrides ?? {}), [SLUG]: patched } } as Opts;
}

function dropEffects(slot: Slot, pred: (e: LooseEffect) => boolean): unknown {
  return withPatchedOverride(SLUG, (ov) => {
    for (const b of blocksOf(ov, slot)) b.effects = b.effects.filter((e) => !pred(e));
  });
}

function scaleBurstHit(factor: number): unknown {
  return withPatchedOverride(SLUG, (ov) => {
    for (const b of blocksOf(ov, 'burst'))
      for (const e of b.effects)
        if (e.kind === 'flatDamage' && typeof e.atkPct === 'number') e.atkPct *= factor;
  });
}

const buffApplies = (events: SimEvent[]): BuffApplyEv[] =>
  events.filter((e) => e.kind === 'buffApply') as unknown as BuffApplyEv[];

const byStat = (events: SimEvent[], stat: string, absValue?: number): BuffApplyEv[] =>
  buffApplies(events).filter(
    (e) =>
      e.stat === stat &&
      (absValue === undefined || Math.abs(Math.abs(e.value) - absValue) < 1e-6),
  );

const shotCount = (events: SimEvent[]): number =>
  events.filter((e) => e.kind === 'shot').length;

const uniq = (xs: number[]): number[] => [...new Set(xs)].sort((a, b) => a - b);
const frames = (evs: BuffApplyEv[]): number[] => uniq(evs.map((e) => e.expiresFrame ?? -1));
const dmg = (m: Record<string, number>, slug: string): number => m[slug] ?? 0;

// ---- hoisted runs (each is a full 180s sim) --------------------------------
const base = run(controlComp(SLUG, true));
const baseTotals = totals(base.res);
const comp = Object.keys(baseTotals);
const allies = comp.filter((s) => s !== SLUG);
const allySum = (m: Record<string, number>): number =>
  allies.reduce((a, s) => a + dmg(m, s), 0);

const noChargeDmg = run(
  compWith(dropEffects('skill1', (e) => e.stat === 'chargeDamagePct')),
);
const noChargeSpeed = run(
  compWith(dropEffects('skill1', (e) => e.stat === 'chargeSpeedPct')),
);
// nearest-wrong trigger identity: per trigger pull instead of per magazine.
const perShotS1 = run(
  compWith(
    withPatchedOverride(SLUG, (ov) => {
      for (const b of blocksOf(ov, 'skill1')) b.trigger = { kind: 'shotFired' };
    }),
  ),
);
// half / double keep the burst hit's IMPACT COUNT identical, so burst-gauge and therefore the
// whole rotation are byte-identical across all three runs — the deltas isolate magnitude alone.
const halfBurstHit = run(compWith(scaleBurstHit(0.5)));
const dblBurstHit = run(compWith(scaleBurstHit(2)));
const noBurstCrit = run(compWith(dropEffects('burst', (e) => e.stat === 'critRatePct')));

const s1ChargeDmg = byStat(base.events, 'chargeDamagePct', 37.28);
const s1ChargeSpd = byStat(base.events, 'chargeSpeedPct', 15.53);
const s2Def = byStat(base.events, 'defPct', 29);
const bDef = byStat(base.events, 'defPct', 2.43);
const bCrit = byStat(base.events, 'critRatePct', 4.65);

describe('eunhwa S1 — last-bullet self charge buffs', () => {
  it('grants Charge Damage 37.28% to SELF for 2 ROUNDS, once per magazine', () => {
    // Non-vacuity: 6 ammo over a 180s fight empties the magazine many times.
    expect(s1ChargeDmg.length).toBeGreaterThanOrEqual(6);
    for (const e of s1ChargeDmg) {
      expect(e.value).toBeGreaterThan(0); // an upward buff, never encoded negative
      expect(e.targetSlug).toBe(SLUG); // "Affects self"
      expect(e.targetIdx).not.toBeNull(); // an ally-held buff, not a boss-held one
      // RED under the nearest-wrong duration model (durationSec: 2 instead of 2 rounds),
      // which leaves durationShots undefined and expires the buff mid-reload.
      expect(e.durationShots).toBe(2);
    }
  });

  it('grants Charge Speed 15.53% to SELF for 2 ROUNDS', () => {
    expect(s1ChargeSpd.length).toBeGreaterThanOrEqual(6);
    for (const e of s1ChargeSpd) {
      expect(e.value).toBeGreaterThan(0);
      expect(e.targetSlug).toBe(SLUG);
      expect(e.durationShots).toBe(2);
    }
  });

  it('fires on the LAST BULLET, not on every trigger pull', () => {
    // With 6 rounds per magazine a shotFired trigger fires ~6x as often; >3x is the safe margin.
    const perShot = byStat(perShotS1.events, 'chargeDamagePct', 37.28).length;
    expect(perShot).toBeGreaterThan(s1ChargeDmg.length * 3);
  });

  it('both S1 lines ride the SAME activation (one trigger, two effects)', () => {
    expect(s1ChargeSpd.length).toBe(s1ChargeDmg.length);
  });

  it('Charge Damage is a live damage lever and is inert for teammates', () => {
    const t = totals(noChargeDmg.res);
    expect(dmg(baseTotals, SLUG)).toBeGreaterThan(dmg(t, SLUG));
    // Burst gauge is per-shot, not per-damage, so removing a damage buff cannot move the
    // rotation: every teammate must be byte-identical.
    for (const s of allies) expect(dmg(t, s)).toBe(dmg(baseTotals, s));
  });

  it('Charge Speed buys shots (a weapon-state modifier IS damage)', () => {
    // Shot count is monotone in charge speed with no full-burst-window confound.
    expect(shotCount(base.events)).toBeGreaterThan(shotCount(noChargeSpeed.events));
    expect(dmg(baseTotals, SLUG)).toBeGreaterThanOrEqual(
      dmg(totals(noChargeSpeed.res), SLUG),
    );
  });
});

describe('eunhwa S2 — last-bullet boss DEF debuff', () => {
  it('inflicts a BOSS-HELD DEF 29% debuff for 5 SEC (not rounds) on the last bullet', () => {
    expect(s2Def.length).toBeGreaterThanOrEqual(6);
    for (const e of s2Def) {
      expect(e.targetIdx).toBeNull(); // "Affects the target" = the enemy, never an ally
      expect(e.durationShots).toBeUndefined(); // wall-clock, RED under a round-count model
      expect(typeof e.expiresFrame).toBe('number');
    }
  });

  it('rides the same last-bullet cadence as S1 (same activation clause)', () => {
    // RED if the driver keyed S2 to reload / interval / shotFired instead of lastBullet.
    expect(s2Def.length).toBe(s1ChargeDmg.length);
  });

  it('no ally ever receives a DEF buff or debuff from this kit', () => {
    for (const e of byStat(base.events, 'defPct')) expect(e.targetIdx).toBeNull();
  });

  it.skip('GAP — DEF down has no observable damage payload (both the S2 29%/5s and the burst 2.43%/15s lines): types.ts documents defPct as inert in v1, so the encoding is asserted via events above and the damage effect is unobservable at scope lock', () => {});
});

describe('eunhwa burst — 85.62% hit, boss DEF 2.43%/15s, ally Crit Rate 4.65%/15s', () => {
  it('NON-VACUITY: eunhwa actually casts her Burst II in the control comp', () => {
    // She is a Burst II contending with crown for the stage-2 slot; if this fails the whole
    // burst group is untested rather than passing, which is the point of leading with it.
    expect(bCrit.length).toBeGreaterThan(0);
    expect(frames(bCrit).length).toBeGreaterThanOrEqual(2);
  });

  it('Critical Rate 4.65% goes to ALL allies INCLUDING herself, for a timed window', () => {
    const targets = new Set(bCrit.map((e) => e.targetSlug));
    // RED under the nearest-wrong target model (allies excludeSelf, or self-only).
    expect(targets.has(SLUG)).toBe(true);
    for (const s of comp) expect(targets.has(s)).toBe(true);
    expect(bCrit.length).toBe(targets.size * frames(bCrit).length);
    for (const e of bCrit) {
      expect(e.value).toBeGreaterThan(0);
      expect(e.durationShots).toBeUndefined(); // 15 sec is wall-clock, not rounds
    }
  });

  it('both 15-sec burst lines share one cast window (identical expiry frames)', () => {
    // A cast applies the ally crit buff and the boss DEF debuff on the same frame with the
    // same 15s duration, so their expiry sets must match exactly. RED if either duration was
    // mis-read (10s, 15 rounds, or the S2 5s value copied across).
    expect(bDef.length).toBeGreaterThan(0);
    expect(frames(bDef)).toEqual(frames(bCrit));
  });

  it('the burst DEF debuff is boss-held and lands exactly once per cast', () => {
    expect(bDef.length).toBe(frames(bCrit).length);
    for (const e of bDef) expect(e.targetIdx).toBeNull();
  });

  it('the ally crit buff lifts the WHOLE team, not just eunhwa', () => {
    const t = totals(noBurstCrit.res);
    expect(dmg(baseTotals, SLUG)).toBeGreaterThan(dmg(t, SLUG)); // self is in the target set
    expect(allySum(baseTotals)).toBeGreaterThan(allySum(t)); // and so is everyone else
  });

  it('the 85.62%-of-final-ATK hit is live and scales LINEARLY with its atkPct', () => {
    const half = dmg(totals(halfBurstHit.res), SLUG);
    const on = dmg(baseTotals, SLUG);
    const dbl = dmg(totals(dblBurstHit.res), SLUG);
    const dHalf = on - half; // = 0.5 x (one fight of burst-hit damage)
    const dDbl = dbl - on; // = 1.0 x the same
    expect(dHalf).toBeGreaterThan(0); // RED if no flatDamage effect exists at all
    expect(dDbl / dHalf).toBeGreaterThan(1.9);
    expect(dDbl / dHalf).toBeLessThan(2.1);
  });

  it('burst hit magnitude never leaks into ally totals', () => {
    const t = totals(dblBurstHit.res);
    for (const s of allies) expect(dmg(t, s)).toBe(dmg(baseTotals, s));
  });

  it.skip('GAP — "Affects 10 enemy unit(s) with the highest final ATK": the scope-lock fight has a single partless boss, so target multiplicity is unobservable and a 1-target vs 10-target encoding cannot be discriminated from totals', () => {});
});
