/**
 * n102 - N102 (RL / Water / Supporter / Burst I) - BLIND kit-spec test.
 * Written from the kit prose ALONE; this author never saw the shipped override, its tests,
 * or any driver reasoning.
 *
 * KIT (structure + short quotes):
 *   skill1  header carries an activation clause (Full Charge attack) + Affects the 1 ally
 *           unit(s) with the highest final ATK.
 *             - Max Ammunition Capacity 3 for 10 sec
 *             - Critical Damage 10.34% for 10 sec
 *   skill2  header carries NO activation clause + Affects 1 ally unit(s) with the highest
 *           final ATK.
 *             - Charge Damage 25.84% for 5 sec
 *   burst   header: Affects all allies.
 *             - ATK 25.86% for 10 sec
 *
 * FIXTURE: controlComp('n102', true) - liter (B1) / crown (B2) / n102 (carry slot, focus) /
 * helm (fixed B3, SR + Water). n102 is a Burst I unit, so she SHARES burst stage 1 with liter;
 * with ~20 s burst cooldowns against a ~13-15 s rotation cycle the two B1 units alternate, so
 * n102 does cast several times across 180 s. That is ASSERTED (group F non-vacuity) rather than
 * assumed - a zero-cast result is a fixture block, not an override defect.
 *
 * WHY THE TARGETING TESTS DISCRIMINATE: class static ATK at the scope-lock preset is
 * Attacker 118,027 > Supporter 98,367 > Defender 78,707, so 1 ally with the highest final ATK
 * must resolve to an ally OTHER than n102 (a Supporter). A self-scoped or allies-scoped
 * mis-encoding therefore shows up directly in the buffApply target set, and the single-target
 * scope is proved by the teammates-byte-identical inertness assertions.
 *
 * FLAGGED (outside the input domain - it.skip, never guessed):
 *   - skill2 has no activation clause and the packet supplies no skill cooldown, so its trigger
 *     identity and cadence are invented by whoever models it. Structure (stat / magnitude /
 *     single target / bounded window / re-fires) is asserted; the period is measurement-gated.
 *   - highest FINAL ATK (live) vs static ATK ranking is not discriminable in this comp - both
 *     rank the same Attacker first.
 *   - The base weapon is a charge weapon (chargeFrames 90), so every modeled shot IS a full
 *     charge; a Full Charge trigger and a shot-fired trigger are observationally identical here.
 *   - skill1 re-fires roughly every 1.5-2 s, so its 10 sec window sits at ~100% uptime and the
 *     exact duration is not observable in totals. Only boundedness is asserted.
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

const SLUG = 'n102';
const FIGHT_FRAMES = 180 * 60;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type Slot = 'skill1' | 'skill2' | 'burst';
const ALL_SLOTS: Slot[] = ['skill1', 'skill2', 'burst'];

interface EffectLike {
  kind?: string;
  stat?: string;
  value?: number;
  durationSec?: number;
}
interface BlockLike {
  trigger?: unknown;
  target?: unknown;
  effects?: EffectLike[];
}

// The override FILE is slot-keyed; a slot is either Block[] or { blocks: Block[] } depending on
// which shape the loader hands back. Read both so a counterfactual is never a silent no-op.
function slotBlocks(ov: unknown, slot: Slot): BlockLike[] {
  const raw = (ov as Record<string, unknown>)[slot];
  if (Array.isArray(raw)) return raw as BlockLike[];
  if (raw && typeof raw === 'object') {
    const inner = (raw as { blocks?: unknown }).blocks;
    if (Array.isArray(inner)) return inner as BlockLike[];
  }
  return [];
}

function stripStat(ov: unknown, re: RegExp, only?: Slot): void {
  for (const slot of only ? [only] : ALL_SLOTS) {
    for (const b of slotBlocks(ov, slot)) {
      if (!Array.isArray(b.effects)) continue;
      b.effects = b.effects.filter(
        (e) => !(typeof e.stat === 'string' && re.test(e.stat)),
      );
    }
  }
}

function setDuration(ov: unknown, re: RegExp, sec: number, only?: Slot): void {
  for (const slot of only ? [only] : ALL_SLOTS) {
    for (const b of slotBlocks(ov, slot)) {
      for (const e of b.effects ?? []) {
        if (typeof e.stat === 'string' && re.test(e.stat)) e.durationSec = sec;
      }
    }
  }
}

function retarget(ov: unknown, slot: Slot, target: unknown): void {
  for (const b of slotBlocks(ov, slot)) b.target = target;
}

// Attach an event sink on both plausible carriers so the collection can never be silently empty
// (group A asserts it is not).
function run(opts: ReturnType<typeof controlComp>) {
  const events: SimEvent[] = [];
  const onEvent = (ev: SimEvent) => {
    events.push(ev);
  };
  const bag = opts as unknown as Record<string, unknown>;
  const merged = {
    ...bag,
    onEvent,
    cfg: { ...((bag.cfg as Record<string, unknown>) ?? {}), onEvent },
  } as unknown as ReturnType<typeof controlComp>;
  return { res: runComp(merged), events };
}

function compWith(mutate: (ov: unknown) => void) {
  const patched = withPatchedOverride(SLUG, mutate);
  const bag = controlComp(SLUG, true) as unknown as Record<string, unknown>;
  return {
    ...bag,
    overrides: {
      ...((bag.overrides as Record<string, unknown>) ?? {}),
      [SLUG]: patched,
    },
  } as unknown as ReturnType<typeof controlComp>;
}

const buffs = (evs: SimEvent[]): BuffApply[] =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const near = (a: number | undefined, b: number): boolean =>
  typeof a === 'number' && Math.abs(a - b) < 1e-6;
function pick(evs: SimEvent[], stat: RegExp, value: number): BuffApply[] {
  return buffs(evs).filter(
    (e) => typeof e.stat === 'string' && stat.test(e.stat) && near(e.value, value),
  );
}
// A bounded (for N sec) window has a real expiry frame inside the fight; a permanent buff has
// none, or a sentinel far past the fight.
const bounded = (e: BuffApply): boolean =>
  typeof e.expiresFrame === 'number' &&
  Number.isFinite(e.expiresFrame) &&
  e.expiresFrame < FIGHT_FRAMES * 2;

const dmg = (t: Record<string, number>, slug: string): number => t[slug] ?? 0;
const sum = (t: Record<string, number>): number =>
  Object.values(t).reduce((a, b) => a + b, 0);

// ---- hoisted runs (8 full 180 s sims) -------------------------------------------------------
const BASE = run(controlComp(SLUG, true));
const baseTotals = totals(BASE.res);
const TEAM = Object.keys(baseTotals);

const CRIT = pick(BASE.events, /critDamage/i, 10.34);
const AMMO = pick(BASE.events, /ammo/i, 3);
const CHARGE = pick(BASE.events, /chargeDamage/i, 25.84);
// A caster-scaled encoding would re-emit as a FLAT ATK number, so a 25.86-valued atk event
// existing at all is itself the stat-choice discriminator.
const ATK = pick(BASE.events, /atk/i, 25.86);

const s1Targets = [...new Set(CRIT.map((e) => e.targetSlug))];
const S1_TARGET = (s1Targets[0] ?? '') as string;

const noCrit = run(compWith((ov) => stripStat(ov, /critDamage/i)));
const noAmmo = run(compWith((ov) => stripStat(ov, /ammo/i)));
const noCharge = run(compWith((ov) => stripStat(ov, /chargeDamage/i)));
const noBurstAtk = run(compWith((ov) => stripStat(ov, /atk/i, 'burst')));
const burstNarrow = run(
  compWith((ov) =>
    retarget(ov, 'burst', { kind: 'alliesTopAtk', count: 1, byFinalAtk: true }),
  ),
);
const burstLong = run(compWith((ov) => setDuration(ov, /atk/i, 60, 'burst')));
const s1Self = run(compWith((ov) => retarget(ov, 'skill1', { kind: 'self' })));

describe('n102 - fixture wiring and non-vacuity', () => {
  it('collects events, fields a full team, and n102 deals damage', () => {
    expect(BASE.events.length).toBeGreaterThan(0);
    expect(TEAM.length).toBeGreaterThanOrEqual(4);
    expect(TEAM).toContain(SLUG);
    expect(unitOf(BASE.res, SLUG).totalDamage).toBeGreaterThan(0);
  });
});

describe('n102 skill1 - Full Charge trigger, 1 highest-final-ATK ally', () => {
  it('re-fires per full charge (rules out passive / burstCast / fullBurstEnter keying)', () => {
    // RL: 90-frame charge, 6 rounds, 141-frame reload => roughly 75-95 full charges in 180 s.
    // Nearest-wrong keyings over the same fight: passive = 1, burstCast ~5-9,
    // fullBurstEnter ~8-10, lastBullet ~15. A floor of 40 separates the faithful reading from
    // every one of them. (buffApply carries a refresh flag, so re-applications do emit.)
    expect(CRIT.length).toBeGreaterThanOrEqual(40);
    expect(AMMO.length).toBeGreaterThanOrEqual(40);
  });

  it('resolves to exactly ONE ally, and never to n102 herself', () => {
    expect(s1Targets).toHaveLength(1);
    expect(TEAM).toContain(S1_TARGET);
    // Attacker 118,027 static ATK outranks n102 (Supporter, 98,367), so the highest-final-ATK
    // ally is someone else - a self-scoped mis-encoding fails here.
    expect(S1_TARGET).not.toBe(SLUG);
  });

  it('the self-scoped nearest-wrong model changes both the target and the board', () => {
    const selfTargets = [
      ...new Set(pick(s1Self.events, /critDamage/i, 10.34).map((e) => e.targetSlug)),
    ];
    expect(selfTargets).toEqual([SLUG]);
    expect(dmg(totals(s1Self.res), S1_TARGET)).not.toBe(dmg(baseTotals, S1_TARGET));
  });
});

describe('n102 skill1 - Max Ammunition Capacity 3 (a FLAT round count that gates shots)', () => {
  it('is emitted as maxAmmoFlat 3, not a percentage capacity bump', () => {
    expect(AMMO.length).toBeGreaterThan(0);
    // Nearest-wrong: maxAmmoPct 3, i.e. a ~3% capacity nudge instead of +3 whole rounds.
    for (const e of AMMO) expect(e.stat).toBe('maxAmmoFlat');
  });

  it('carries a bounded window rather than a permanent grant', () => {
    expect(AMMO.every(bounded)).toBe(true);
  });

  it('removing it moves the recipient (weapon-state modifiers ARE damage)', () => {
    // Ammo capacity changes magazine boundaries => shot count => damage. Teammates may also
    // move here because shot counts feed burst gauge, so only the recipient is asserted.
    expect(dmg(totals(noAmmo.res), S1_TARGET)).not.toBe(dmg(baseTotals, S1_TARGET));
  });
});

describe('n102 skill1 - Critical Damage 10.34%', () => {
  it('emits critDamagePct 10.34 with a bounded window', () => {
    expect(CRIT.length).toBeGreaterThan(0);
    for (const e of CRIT) expect(e.stat).toBe('critDamagePct');
    expect(CRIT.every(bounded)).toBe(true);
  });

  it('lowers ONLY the highest-final-ATK ally - teammates byte-identical', () => {
    // Crit damage feeds no gauge or rotation path, so a count-1 scope must leave every other
    // unit bit-for-bit unchanged. An allies-scoped mis-encoding moves them all.
    const t = totals(noCrit.res);
    expect(dmg(t, S1_TARGET)).toBeLessThan(dmg(baseTotals, S1_TARGET));
    for (const slug of TEAM) {
      if (slug === S1_TARGET) continue;
      expect(dmg(t, slug)).toBe(dmg(baseTotals, slug));
    }
  });
});

describe('n102 skill2 - Charge Damage 25.84% to 1 highest-final-ATK ally', () => {
  it('emits chargeDamagePct 25.84 to the SAME single ally skill1 picks', () => {
    expect(CHARGE.length).toBeGreaterThan(0);
    // Nearest-wrong: chargeDamageMultPct, a true multiplier on base charge damage rather than
    // additive percentage points in the charge bucket.
    for (const e of CHARGE) expect(e.stat).toBe('chargeDamagePct');
    expect([...new Set(CHARGE.map((e) => e.targetSlug))]).toEqual([S1_TARGET]);
  });

  it('is a bounded 5 sec window that re-fires, not a one-shot t=0 application', () => {
    expect(CHARGE.every(bounded)).toBe(true);
    // A passive encoding (with or without the 5 sec duration) applies exactly once at frame 0.
    expect(CHARGE.length).toBeGreaterThan(1);
  });

  it('lowers ONLY that ally - teammates byte-identical', () => {
    const t = totals(noCharge.res);
    expect(dmg(t, S1_TARGET)).toBeLessThan(dmg(baseTotals, S1_TARGET));
    for (const slug of TEAM) {
      if (slug === S1_TARGET) continue;
      expect(dmg(t, slug)).toBe(dmg(baseTotals, slug));
    }
  });

  it.skip('FLAG - skill2 trigger identity and cadence are outside the input domain: the kit prose gives no activation clause and no skill cooldown is supplied. Measurement-gated; only structure is asserted above.', () => {});
});

describe('n102 burst - all allies, ATK 25.86% for 10 sec', () => {
  it('n102 actually casts in this fixture (two Burst I units share stage 1)', () => {
    expect(ATK.length).toBeGreaterThan(0);
  });

  it('is a plain percentage ATK buff, bounded in time', () => {
    for (const e of ATK) expect(e.stat).toBe('atkPct');
    expect(ATK.every(bounded)).toBe(true);
  });

  it('reaches EVERY ally including n102 herself', () => {
    const targets = [...new Set(ATK.map((e) => e.targetSlug))];
    for (const slug of TEAM) expect(targets).toContain(slug);
  });

  it('narrowing the target to the single top-ATK ally loses damage', () => {
    expect(sum(totals(burstNarrow.res))).toBeLessThan(sum(baseTotals));
  });

  it('removing it lowers every ally, n102 included (discriminates vs excludeSelf)', () => {
    const t = totals(noBurstAtk.res);
    for (const slug of TEAM) {
      if (dmg(baseTotals, slug) <= 0) continue;
      expect(dmg(t, slug)).toBeLessThan(dmg(baseTotals, slug));
    }
  });

  it('the 10 sec window is real: stretching it to 60 sec raises damage', () => {
    // Burst cooldown is 20 s and n102 alternates stage 1 with liter, so a 10 sec buff is well
    // under 100% uptime. An unbounded (permanent) encoding would show no gain here.
    expect(sum(totals(burstLong.res))).toBeGreaterThan(sum(baseTotals));
  });
});

describe('n102 - flagged, non-discriminable in this fixture', () => {
  it.skip('FLAG - highest FINAL ATK (live) vs static ATK ranking: both rank the same Attacker first in this comp, so byFinalAtk is unobservable here. Needs a comp where a buff flips the ranking.', () => {});

  it.skip('FLAG - Full Charge attack vs any shot fired: the base weapon is a charge weapon (90-frame charge), so every modeled shot is a full charge and the two triggers are observationally identical.', () => {});

  it.skip('FLAG - the exact 10 sec skill1 window: skill1 re-fires roughly every 1.5-2 s, holding ~100% uptime, so duration is not observable in totals. Only boundedness is asserted above.', () => {});
});
