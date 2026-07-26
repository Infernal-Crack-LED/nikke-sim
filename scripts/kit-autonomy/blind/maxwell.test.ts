/**
 * maxwell — BLIND kit spec test (S5 post-op; authored from kit prose alone,
 * with no sight of the driver's override, tests or reasoning).
 *
 * KIT (Maxwell, `maxwell`, SR / Iron / Attacker / Burst III; cd 40s, ammo 6,
 * reload 141f, charge 60f, normalAttackMultiplier 69.04, coreAttackMultiplier 200):
 *
 * skill1  "Activates when entering Full Burst. Affects 2 allies with the highest final ATK."
 *         Charge Speed ▲ 4.48% for 10 sec ; ATK ▲ 43.1% for 10 sec.
 *   READ: trigger = fullBurstEnter (ANY team Full Burst — NOT maxwell's own burst cast;
 *         the fixture carries a second Burst III so the two counts genuinely differ).
 *         target  = alliesTopAtk { count: 2, byFinalAtk: true } — the kit says "highest
 *         FINAL ATK" literally, and carries NO "(except the skill user)" clause, so self
 *         is eligible. effects = buff atkPct 43.1 + buff chargeSpeedPct 4.48, durationSec 10.
 *         atkPct scales the TARGET's own ATK, so buffApply emits the RAW 43.1; a
 *         casterAtkPct mis-encoding would emit a flat caster-scaled ATK number instead.
 *
 * skill2  "Activates when there are above 5 enemy unit(s), excluding Nikkes. Affects self."
 *         Critical Rate ▲ 4.83% ; Critical Damage ▲ 13.91%.
 *   READ: the v1 scope is a single solo-raid boss, so the >5-enemy condition is
 *         UNREACHABLE and the line is permanently INERT. Nearest-wrong = an always-on
 *         passive self-buff, which silently hands maxwell crit rate + crit damage for the
 *         whole fight; the inertness assertion below goes RED under exactly that model.
 *
 * burst   "Affects self. Change the weapon in use: Charge Time 2 sec / Damage 813.42% of
 *          final ATK / Full Charge Damage 300% of damage / Max Ammunition Capacity 1
 *          round(s) / Additional Effect: Pierce"
 *   READ: ONE weaponSwap effect on a burstCast + self block — damagePct 813.42,
 *         chargeTimeSec 2, chargeMultPct 300, maxAmmo 1, hasPierce true SCOPED TO THE SWAP
 *         (the effect-level flag), NOT the file-level whole-fight hasPierce (which would
 *         Pierce-tag her base SR for all 180s).
 *         ⚑ durationSec is KIT-SILENT — the ~10s Full-Burst window is the convention;
 *         asserted only as a sanity band, never as a measured pin.
 *         maxAmmo 1 is a WEAPON-STATE modifier and therefore damage: it forces a 141-frame
 *         reload between every swapped shot, capping the window's shot count.
 *
 * FIXTURE: controlComp('maxwell', true) — liter B1 / crown B2 / maxwell B3 / helm B3,
 * deterministic (no seed). B1+B2 are mandatory (a lone Burst III casts zero bursts); the
 * co-Burst-III is what makes the fullBurstEnter-vs-burstCast distinction non-vacuous,
 * since maxwell does not cast her own burst on every rotation.
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

const SLUG = 'maxwell';
type Ev = SimEvent & Record<string, any>;

// ---- shape-tolerant slot accessors -------------------------------------------------
// The override FILE is slot-keyed; a slot is either a bare Block[] or an object carrying
// its own blocks[]. Handling both keeps every counterfactual from silently no-opping —
// a no-op patch would make the discriminating assertions vacuously green.
function slotBlocks(ov: any, slot: 'skill1' | 'skill2' | 'burst'): any[] {
  const s = ov?.[slot];
  if (Array.isArray(s)) return s;
  if (s && Array.isArray(s.blocks)) return s.blocks;
  return [];
}
function setSlotBlocks(ov: any, slot: 'skill1' | 'skill2' | 'burst', blocks: any[]): void {
  const s = ov?.[slot];
  if (s && !Array.isArray(s) && Array.isArray(s.blocks)) s.blocks = blocks;
  else ov[slot] = blocks;
}
function findSwap(ov: any): { block: any; eff: any } | null {
  for (const b of slotBlocks(ov, 'burst')) {
    for (const e of b.effects ?? []) if (e.kind === 'weaponSwap') return { block: b, eff: e };
  }
  return null;
}
function findS1Block(ov: any): any {
  for (const b of slotBlocks(ov, 'skill1')) {
    for (const e of b.effects ?? []) {
      if (e.kind === 'buff' && e.stat === 'atkPct' && Math.abs(e.value - 43.1) < 1e-6) return b;
    }
  }
  return null;
}
function effOf(block: any, stat: string): any {
  return (block?.effects ?? []).find((e: any) => e.kind === 'buff' && e.stat === stat);
}

// ---- run helpers -------------------------------------------------------------------
function run(opts: any): { res: any; ev: Ev[] } {
  const ev: Ev[] = [];
  const sink = (e: SimEvent) => {
    ev.push(e as Ev);
  };
  const o: any = { ...opts, cfg: { ...(opts.cfg ?? {}), onEvent: sink } };
  o.onEvent = sink;
  return { res: runComp(o), ev };
}
function compWith(patched: any): any {
  const o: any = controlComp(SLUG, true);
  o.overrides = { ...(o.overrides ?? {}), [SLUG]: patched };
  return o;
}
const applies = (ev: Ev[], stat: string, value: number) =>
  ev.filter((e) => e.kind === 'buffApply' && e.stat === stat && Math.abs(e.value - value) < 1e-6);
const fbStarts = (ev: Ev[]) => ev.filter((e) => e.kind === 'fullBurstStart').length;
const mx = (r: { res: any }) => totals(r.res)[SLUG];
const team = (r: { res: any }) =>
  Object.values(totals(r.res)).reduce((a: number, b: any) => a + (b as number), 0);

// ---- hoisted runs (10 full 180s sims) ----------------------------------------------
const OV: any = withPatchedOverride(SLUG, () => {});

const BASE = run(controlComp(SLUG, true));

const S1_OFF = run(
  compWith(withPatchedOverride(SLUG, (ov: any) => setSlotBlocks(ov, 'skill1', []))),
);
const S1_LONG = run(
  compWith(
    withPatchedOverride(SLUG, (ov: any) => {
      const b = findS1Block(ov);
      for (const e of b?.effects ?? []) if (e.kind === 'buff') e.durationSec = 30;
    }),
  ),
);
const S1_ALL = run(
  compWith(
    withPatchedOverride(SLUG, (ov: any) => {
      const b = findS1Block(ov);
      if (b) b.target = { kind: 'allies' };
    }),
  ),
);
const S1_ONCAST = run(
  compWith(
    withPatchedOverride(SLUG, (ov: any) => {
      const b = findS1Block(ov);
      if (b) b.trigger = { kind: 'burstCast' };
    }),
  ),
);

const S2_PASSIVE = run(
  compWith(
    withPatchedOverride(SLUG, (ov: any) => {
      setSlotBlocks(ov, 'skill2', [
        {
          slot: 'skill2',
          trigger: { kind: 'passive' },
          target: { kind: 'self' },
          effects: [
            { kind: 'buff', stat: 'critRatePct', value: 4.83 },
            { kind: 'buff', stat: 'critDamagePct', value: 13.91 },
          ],
        },
      ]);
    }),
  ),
);

const B_OFF = run(
  compWith(withPatchedOverride(SLUG, (ov: any) => setSlotBlocks(ov, 'burst', []))),
);
const B_AMMO6 = run(
  compWith(
    withPatchedOverride(SLUG, (ov: any) => {
      const s = findSwap(ov);
      if (s) s.eff.maxAmmo = 6;
    }),
  ),
);
const B_FASTCHG = run(
  compWith(
    withPatchedOverride(SLUG, (ov: any) => {
      const s = findSwap(ov);
      if (s) s.eff.chargeTimeSec = 0.5;
    }),
  ),
);
const B_NOFC = run(
  compWith(
    withPatchedOverride(SLUG, (ov: any) => {
      const s = findSwap(ov);
      if (s) s.eff.chargeMultPct = 100;
    }),
  ),
);

// ------------------------------------------------------------------------------------
describe('maxwell — fixture sanity', () => {
  it('captures events and casts multiple full bursts', () => {
    expect(BASE.ev.length).toBeGreaterThan(0);
    expect(fbStarts(BASE.ev)).toBeGreaterThan(1);
    expect(unitOf(BASE.res, SLUG).totalDamage).toBeGreaterThan(0);
  });
});

describe('maxwell skill1 — FB entry, 2 highest-final-ATK allies, 10s', () => {
  it('is keyed to full-burst ENTRY on the top-2 FINAL-ATK allies, self-eligible', () => {
    const b = findS1Block(OV);
    expect(b, 'no skill1 block granting ATK 43.1%').not.toBeNull();
    expect(b.trigger.kind).toBe('fullBurstEnter'); // nearest-wrong: burstCast (under-fires, loses FB auras)
    expect(b.target.kind).toBe('alliesTopAtk'); // nearest-wrong: allies / self
    expect(b.target.count).toBe(2);
    expect(b.target.byFinalAtk).toBe(true); // kit says "highest FINAL ATK" literally
    expect(b.target.excludeSelf ?? false).toBe(false); // no "(except the skill user)" clause
  });

  it('grants ATK 43.1% and Charge Speed 4.48%, each for 10s, as plain percentage stats', () => {
    const b = findS1Block(OV);
    const atk = effOf(b, 'atkPct');
    const chg = effOf(b, 'chargeSpeedPct');
    expect(atk?.value).toBeCloseTo(43.1, 5);
    expect(atk?.durationSec).toBe(10);
    expect(atk?.durationShots).toBeUndefined(); // "for 10 sec" is wall-clock, not a round count
    expect(chg?.value).toBeCloseTo(4.48, 5);
    expect(chg?.durationSec).toBe(10);
    // scope: the ATK grant scales the TARGET's own ATK, not the caster's
    expect(effOf(b, 'casterAtkPct')).toBeUndefined();
    expect(effOf(b, 'highestAllyAtkPct')).toBeUndefined();
  });

  it('fires on EVERY team full burst and reaches exactly 2 allies each time', () => {
    const fb = fbStarts(BASE.ev);
    const atk = applies(BASE.ev, 'atkPct', 43.1);
    const chg = applies(BASE.ev, 'chargeSpeedPct', 4.48);
    expect(fb).toBeGreaterThan(1);
    expect(atk.length).toBe(2 * fb); // burstCast-keying gives 2 x (maxwell's own casts), which is fewer
    expect(chg.length).toBe(2 * fb);
    expect(atk.every((e) => typeof e.expiresFrame === 'number')).toBe(true);
  });

  it('does NOT reach the whole team — the top-2 slice is load-bearing', () => {
    const recips = new Set(applies(BASE.ev, 'atkPct', 43.1).map((e) => e.targetSlug));
    expect(recips.size).toBeLessThan(4); // 4-unit comp: two allies stay untouched each FB
    expect(recips.has(SLUG)).toBe(true); // no except-self clause; maxwell is an Attacker, so top-2
    const all = applies(S1_ALL.ev, 'atkPct', 43.1);
    expect(all.length).toBeGreaterThan(2 * fbStarts(S1_ALL.ev)); // counterfactual is genuinely different
    expect(team(S1_ALL)).toBeGreaterThan(team(BASE));
  });

  it('moves damage, and its 10s window is load-bearing', () => {
    expect(team(S1_OFF)).toBeLessThan(team(BASE)); // non-vacuity: the line is not inert
    expect(team(S1_LONG)).toBeGreaterThan(team(BASE)); // 30s > 10s: bounded, not permanent
  });

  it('is NOT interchangeable with a burst-cast keying', () => {
    expect(team(S1_ONCAST)).not.toBe(team(BASE));
  });
});

describe('maxwell skill2 — "above 5 enemy unit(s)" (unreachable in a solo raid)', () => {
  it('never applies its crit buffs in a single-boss fight', () => {
    expect(applies(BASE.ev, 'critRatePct', 4.83).length).toBe(0);
    expect(applies(BASE.ev, 'critDamagePct', 13.91).length).toBe(0);
  });

  it('the inertness assertion is not vacuous — the same buffs, if always-on, DO move damage', () => {
    expect(applies(S2_PASSIVE.ev, 'critRatePct', 4.83).length).toBeGreaterThan(0);
    expect(mx(S2_PASSIVE)).toBeGreaterThan(mx(BASE));
  });

  it.skip('ACTIVE branch (>5 enemies) is unexercisable — v1 models a single boss, no multi-enemy fixture exists', () => {});
});

describe('maxwell burst — swapped charge weapon (813.42% / x3 / 1 round / Pierce)', () => {
  it('is ONE weaponSwap on a burstCast + self block', () => {
    const s = findSwap(OV);
    expect(s, 'burst is not modelled as a weaponSwap').not.toBeNull();
    expect(s!.block.trigger.kind).toBe('burstCast'); // nearest-wrong: fullBurstEnter
    expect(s!.block.target.kind).toBe('self');
  });

  it('carries the exact swap numbers from the kit', () => {
    const e = findSwap(OV)!.eff;
    expect(e.damagePct).toBeCloseTo(813.42, 5);
    expect(e.chargeTimeSec).toBeCloseTo(2, 5);
    expect(e.chargeMultPct).toBeCloseTo(300, 5);
    expect(e.maxAmmo).toBe(1);
    // ⚑ kit-silent duration: the ~10s Full-Burst window is the convention, not a measurement.
    expect(e.durationSec).toBeGreaterThanOrEqual(5);
    expect(e.durationSec).toBeLessThanOrEqual(15);
  });

  it('scopes Pierce to the swapped weapon, not to the whole fight', () => {
    expect(findSwap(OV)!.eff.hasPierce).toBe(true);
    expect(OV.hasPierce ?? false).toBe(false); // a file-level flag would Pierce-tag her base SR for 180s
  });

  it('the swap is the bulk of her damage', () => {
    expect(mx(B_OFF)).toBeLessThan(mx(BASE) * 0.9);
  });

  it('every swap parameter that gates shot count / per-shot size is load-bearing', () => {
    expect(mx(B_AMMO6)).toBeGreaterThan(mx(BASE)); // maxAmmo 1 forces a 141f reload per swapped shot
    expect(mx(B_FASTCHG)).toBeGreaterThan(mx(BASE)); // the 2s charge time caps shots in the window
    expect(mx(B_NOFC)).toBeLessThan(mx(BASE)); // Full Charge Damage 300% is actually applied
  });

  it.skip('Pierce PAYLOAD is unobservable in this fixture — the control comp has no Pierce Damage ▲ source', () => {});
});
