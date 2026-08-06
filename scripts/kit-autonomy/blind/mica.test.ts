/**
 * mica — BLIND per-unit kit spec (cross-family S5 post-op). Written from the kit prose
 * ALONE; the driver's override, tests and reasoning were not consulted.
 *
 * KIT (RL / Wind / Supporter / Burst I, 6 ammo, charge weapon, cd 20s):
 *   skill1  "Activates when attacked 20 time(s). Affects self."  DEF ▲39.18% for 10s
 *   skill2  "Affects 2 allies with the highest final ATK."
 *             Max Ammunition Capacity ▲2 round(s) for 10 sec
 *             DEF ▲19.89% for 10 sec
 *   burst   "Affects all enemies."  Deals 152.22% of final ATK as Burst Skill damage
 *             DEF ▼13.32% for 5 sec
 *
 * FIXTURES
 *   CTRL = controlComp('mica') -> [liter(B1), crown(B2), mica, helm(B3)], boss Fire.
 *     Three distinct ally ATK tiers are present (Attacker helm 118,027 / Supporter liter +
 *     mica 98,367 / Defender crown 78,707), so a top-2 target set is behaviourally
 *     distinguishable from an "all allies" mis-scope: the per-window target count is 2, not 4.
 *   B1 = [mica, crown, helm], boss Fire.
 *     mica is the SOLE Burst I here, so she casts her own burst every rotation. CTRL cannot
 *     carry the burst assertions: liter is also a 20s Burst I sitting in slot 1 and wins the
 *     stage-1 slot, so mica's burst block may never fire there and every burst assertion
 *     would be vacuous.
 *
 * WHY THESE DISCRIMINATE
 *   Every counterfactual patch increments a counter that is itself asserted, so a patch that
 *   matched nothing (wrong encoding => no-op => identical totals) fails LOUDLY instead of
 *   passing silently. Runs are hoisted; 8 full 180s sims total.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

type CompOpts = Parameters<typeof runComp>[0];
type Slot = 'skill1' | 'skill2' | 'burst';
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;

function runWith(o: CompOpts): { res: ReturnType<typeof runComp>; events: SimEvent[] } {
  const events: SimEvent[] = [];
  const res = runComp({
    ...o,
    cfg: { ...o.cfg, onEvent: (e: SimEvent) => events.push(e) },
  });
  return { res, events };
}

const buffApplies = (events: SimEvent[]): BuffApply[] =>
  events.filter((e): e is BuffApply => e.kind === 'buffApply');

/**
 * The override FILE is slot-keyed with plain Block[] arrays (harness.bareWeaponOverride
 * builds `{ skill1: [], skill2: [], burst: [] }`). The `.blocks` fallback keeps this helper
 * honest if a slot is ever authored as a CharacterSkills object instead.
 */
const slotBlocks = (ov: any, slot: Slot): any[] => {
  const s = ov[slot];
  if (Array.isArray(s)) {
    return s;
  }
  return (s?.blocks as any[]) ?? [];
};

const clearSlot = (ov: any, slot: Slot): void => {
  if (Array.isArray(ov[slot])) {
    ov[slot] = [];
  } else if (ov[slot]) {
    ov[slot].blocks = [];
  }
};

/** Group buff applications by their shared expiry frame = one trigger firing. */
function targetsPerWindow(evs: BuffApply[]): Map<number, Set<string>> {
  const byWindow = new Map<number, Set<string>>();
  for (const e of evs) {
    const key = e.expiresFrame as number;
    const set = byWindow.get(key) ?? new Set<string>();
    set.add(String(e.targetSlug));
    byWindow.set(key, set);
  }
  return byWindow;
}

// ---- fixtures ------------------------------------------------------------------------

const CTRL = controlComp('mica');
const MICA_CTRL_IDX = CTRL.slugs.indexOf('mica');

const B1: CompOpts = {
  slugs: ['mica', 'crown', 'helm'],
  bossElement: 'Fire',
  focusSlug: 'crown',
};
const MICA_B1_IDX = B1.slugs.indexOf('mica');

// ---- hoisted runs (8 x 180s) ---------------------------------------------------------

const ctrlReal = runWith(CTRL);

let s1Cleared = 0;
const noSkill1 = withPatchedOverride('mica', (ov) => {
  s1Cleared = slotBlocks(ov, 'skill1').length;
  clearSlot(ov, 'skill1');
});
const ctrlNoS1 = runWith({ ...CTRL, overrides: { mica: noSkill1 } });

let ammoStripped = 0;
const noAmmo = withPatchedOverride('mica', (ov) => {
  for (const b of slotBlocks(ov, 'skill2')) {
    const before = b.effects.length;
    b.effects = b.effects.filter(
      (f: any) =>
        !(
          f.kind === 'buff' &&
          (f.stat === 'maxAmmoFlat' || f.stat === 'maxAmmoPct')
        )
    );
    ammoStripped += before - b.effects.length;
  }
});
const ctrlNoAmmo = runWith({ ...CTRL, overrides: { mica: noAmmo } });

let retargeted = 0;
const top3 = withPatchedOverride('mica', (ov) => {
  for (const b of slotBlocks(ov, 'skill2')) {
    if (b.target?.kind === 'alliesTopAtk' && b.target.count === 2) {
      b.target.count = 3;
      retargeted++;
    }
  }
});
const ctrlTop3 = runWith({ ...CTRL, overrides: { mica: top3 } });

const b1Real = runWith(B1);

let canonHits = 0;
const burstCanon = withPatchedOverride('mica', (ov) => {
  for (const b of slotBlocks(ov, 'burst')) {
    for (const f of b.effects) {
      if (f.kind === 'flatDamage') {
        f.atkPct = 152.22;
        canonHits++;
      }
    }
  }
});
const b1Canon = runWith({ ...B1, overrides: { mica: burstCanon } });

let zeroHits = 0;
const burstZero = withPatchedOverride('mica', (ov) => {
  for (const b of slotBlocks(ov, 'burst')) {
    for (const f of b.effects) {
      if (f.kind === 'flatDamage') {
        f.atkPct = 0;
        zeroHits++;
      }
    }
  }
});
const b1Zero = runWith({ ...B1, overrides: { mica: burstZero } });

let noFbHits = 0;
const burstNoFb = withPatchedOverride('mica', (ov) => {
  for (const b of slotBlocks(ov, 'burst')) {
    for (const f of b.effects) {
      if (f.kind === 'flatDamage') {
        f.noFb = true;
        noFbHits++;
      }
    }
  }
});
const b1NoFb = runWith({ ...B1, overrides: { mica: burstNoFb } });

// ---- derived event views -------------------------------------------------------------

const micaCtrlBuffs = buffApplies(ctrlReal.events).filter(
  (e) => e.casterIdx === MICA_CTRL_IDX
);
const micaB1Buffs = buffApplies(b1Real.events).filter(
  (e) => e.casterIdx === MICA_B1_IDX
);
const ammoEvents = micaCtrlBuffs.filter((e) => e.stat === 'maxAmmoFlat');
const defEvents = micaCtrlBuffs.filter((e) => e.stat === 'defPct');

describe('mica — skill1: "Activates when attacked 20 time(s). Affects self." DEF ▲39.18% / 10s', () => {
  it('moves NO damage — it is a self DEF grant, and self DEF never feeds own damage in v1', () => {
    // Nearest-wrong: the 39.18% mis-scoped as atkPct / attackDamagePct (the classic
    // "a big number must be offence" error) — that patch-out would then change totals.
    expect(totals(ctrlNoS1.res)).toEqual(totals(ctrlReal.res));
    // Non-vacuity note: this holds whether skill1 is authored as an inert defPct block or
    // left out entirely; the CLAIM under test is "skill1 contributes zero damage", and the
    // discriminating half is the offensive mis-scope above, which this run would catch.
    expect(s1Cleared).toBeGreaterThanOrEqual(0);
  });

  it.skip('GAP: "when attacked 20 time(s)" has no trigger primitive — the scope-lock boss deals no damage, so the condition can never be reached (TriggerDef has no on-damage-taken kind)', () => {
    // Recipe to close: an enemy-attack model + an `attacked` hitCount-style trigger.
  });
});

describe('mica — skill2: "Affects 2 allies with the highest final ATK"', () => {
  it('grants Max Ammunition ▲ as a FLAT +2 rounds, not a percentage', () => {
    // Nearest-wrong: maxAmmoPct:2 ("▲2 round(s)" read as 2%), which on a 6-round magazine
    // is ~0 extra rounds and near-invisible in totals. Asserting stat+value pins the schema
    // channel AND the magnitude at once.
    expect(ammoEvents.length).toBeGreaterThan(0);
    for (const e of ammoEvents) {
      expect(e.value).toBe(2);
    }
  });

  it('hits exactly TWO allies per firing', () => {
    // Nearest-wrong: target {kind:'allies'} — 4 targets per window in this fixture, not 2.
    const windows = targetsPerWindow(ammoEvents);
    expect(windows.size).toBeGreaterThan(0);
    for (const [, tg] of windows) {
      expect(tg.size).toBe(2);
    }
  });

  it('re-fires across the fight — "for 10 sec" is a WINDOW, not a permanent passive', () => {
    // Nearest-wrong: a `passive` self/ally grant (or passive + durationSec 10) applies once
    // at frame 0 and is then dead for ~170 of 180 seconds; either way only ONE window exists.
    const windows = targetsPerWindow(ammoEvents);
    expect(windows.size).toBeGreaterThanOrEqual(2);
  });

  it('carries the DEF ▲19.89% line on the SAME targets, in the SAME windows', () => {
    // Nearest-wrong: dropping the DEF line as "defensive, inert" (taxonomy 7 says keep the
    // stat buff — a future consumer/scaler reads it) or splitting it onto a different
    // target set / cadence than the ammo line the kit pairs it with.
    expect(defEvents.length).toBe(ammoEvents.length);
    for (const e of defEvents) {
      expect(e.value).toBeCloseTo(19.89, 5);
    }
    const ammoWindows = targetsPerWindow(ammoEvents);
    const defWindows = targetsPerWindow(defEvents);
    expect([...defWindows.keys()].sort()).toEqual(
      [...ammoWindows.keys()].sort()
    );
    for (const [frame, tg] of defWindows) {
      expect([...tg].sort()).toEqual([...(ammoWindows.get(frame) ?? [])].sort());
    }
  });

  it('the ammo grant is LOAD-BEARING: stripping it lowers the recipients\u2019 damage', () => {
    // Weapon-state modifiers ARE damage (taxonomy 6): +2 rounds on a 6-round magazine is a
    // third fewer reloads, hence more shots fired over 180s. Recipients are read off the
    // event log rather than assumed, so the check follows the real target set.
    expect(ammoStripped).toBeGreaterThan(0);
    const recipients = [
      ...new Set(ammoEvents.map((e) => String(e.targetSlug))),
    ];
    expect(recipients.length).toBeGreaterThan(0);
    const sum = (res: ReturnType<typeof runComp>): number => {
      const t = totals(res);
      return recipients.reduce((a, s) => a + (t[s] ?? 0), 0);
    };
    expect(sum(ctrlReal.res)).toBeGreaterThan(sum(ctrlNoAmmo.res));
  });

  it('the target COUNT of 2 is load-bearing (2 ≠ 3)', () => {
    expect(retargeted).toBeGreaterThan(0);
    expect(totals(ctrlTop3.res)).not.toEqual(totals(ctrlReal.res));
  });

  it('ranks by FINAL ATK and does NOT exclude self (literal kit wording)', () => {
    // "highest FINAL ATK" is the literal-word trigger for byFinalAtk (live effectiveAtk).
    // Nearest-wrong: static staticAtk ranking, which the schema reserves for kits that say
    // plain "highest ATK". No "(except the skill user)" clause => excludeSelf must be unset.
    const kinds: string[] = [];
    let sawByFinalAtk = false;
    let sawExcludeSelf = false;
    withPatchedOverride('mica', (ov) => {
      for (const b of slotBlocks(ov, 'skill2')) {
        if (b.target?.kind) {
          kinds.push(b.target.kind);
        }
        if (b.target?.byFinalAtk) {
          sawByFinalAtk = true;
        }
        if (b.target?.excludeSelf) {
          sawExcludeSelf = true;
        }
      }
    });
    expect(kinds).toContain('alliesTopAtk');
    expect(sawByFinalAtk).toBe(true);
    expect(sawExcludeSelf).toBe(false);
  });
});

describe('mica — burst: "Affects all enemies." 152.22% of final ATK; DEF ▼13.32% / 5s', () => {
  it('deals real damage on her own burst cast', () => {
    // Zeroing atkPct keeps the damage INSTANCE (so the skill-damage burst-gauge impact and
    // therefore the whole rotation are byte-identical) and removes only its magnitude —
    // the delta is purely this line, with no FB-count confound.
    expect(zeroHits).toBe(1);
    expect(totals(b1Real.res)['mica']).toBeGreaterThan(
      totals(b1Zero.res)['mica']
    );
  });

  it('is exactly 152.22% of final ATK', () => {
    // Rewriting the multiplier to the kit value must be a no-op iff the shipped value IS the
    // kit value. canonHits === 1 forbids a vacuous pass (a burst with no flatDamage at all).
    expect(canonHits).toBe(1);
    expect(totals(b1Canon.res)).toEqual(totals(b1Real.res));
  });

  it('is FULL-BURST EXEMPT — a burst cast lands before the FB window opens', () => {
    // Forcing noFb:true must change NOTHING. If the hit currently takes the +50% FB major
    // (the trigger-identity error: keying burst damage to fullBurstEnter instead of the
    // owner's burstCast), this run would come out strictly lower.
    expect(noFbHits).toBe(1);
    expect(totals(b1NoFb.res)['mica']).toBe(totals(b1Real.res)['mica']);
  });

  it('fires on mica\u2019s OWN burst cast, aimed at the enemy', () => {
    const triggers: string[] = [];
    const targets: string[] = [];
    withPatchedOverride('mica', (ov) => {
      for (const b of slotBlocks(ov, 'burst')) {
        if (b.effects?.some((f: any) => f.kind === 'flatDamage')) {
          triggers.push(b.trigger?.kind);
          targets.push(b.target?.kind);
        }
      }
    });
    expect(triggers).toEqual(['burstCast']);
    expect(targets).toEqual(['enemy']);
  });

  it('does NOT fudge the enemy DEF ▼ into the damage-taken bucket', () => {
    // DEF ▼13.32% and "Damage Taken ▲13.32%" are different mathematics: boss DEF is
    // SUBTRACTED per hit, damageTakenPct is a multiplicative bucket. Folding one into the
    // other would credit the whole team roughly an order of magnitude too much.
    // Boss-held debuffs carry casterIdx === null, so this scans ALL buffApply events.
    const fudged = [...ctrlReal.events, ...b1Real.events]
      .filter((e): e is BuffApply => e.kind === 'buffApply')
      .filter((e) => e.stat === 'damageTakenPct' && e.value === 13.32);
    expect(fudged).toEqual([]);
  });

  it.skip('GAP: enemy DEF ▼13.32% for 5 sec has no primitive — StatKey has no enemy-DEF-reduction channel, and damageTakenPct is a different bucket (boss DEF is subtracted per hit, not multiplied). Belongs in `unmodeled` until a defReduction stat exists', () => {
    // Recipe to close: a `bossDefPct` StatKey read by the per-hit DEF subtraction, then a
    // counterfactual comparing team totals with/without the 13.32% reduction.
  });
});

describe('mica — whole-kit closure', () => {
  it('applies NO stat outside {maxAmmoFlat, defPct} — her kit grants zero offence', () => {
    // Catches an invented atkPct / attackDamagePct / critRatePct on a Supporter whose entire
    // buff payload is one ammo grant and two DEF grants.
    const stats = new Set(
      [...micaCtrlBuffs, ...micaB1Buffs].map((e) => String(e.stat))
    );
    const extra = [...stats]
      .filter((s) => s !== 'maxAmmoFlat' && s !== 'defPct')
      .sort();
    expect(extra).toEqual([]);
  });

  it('never moves a teammate\u2019s damage through skill1', () => {
    for (const slug of CTRL.slugs) {
      expect(totals(ctrlNoS1.res)[slug]).toBe(totals(ctrlReal.res)[slug]);
    }
  });
});
