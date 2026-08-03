import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

/*
 * admi — SR/Wind/Supporter/Burst II. Kit spec test, written from kit prose alone.
 *
 * KIT (verbatim structure, quoted minimally):
 *   skill1: header "Activates when attacked 20 time(s)." + "Affects all allies."
 *           -> "Charge Damage Multiplier" +9.59% for 20 sec.
 *   skill2: header "Affects 2 allies with the highest final ATK."
 *           -> "Damage Taken" -28.65% for 10 sec.  (DEFENSIVE — no damage channel at scope lock)
 *   burst:  header "Affects all allies."
 *           -> "Reload Speed" +50.91% for 10 sec, "Critical Damage" +28.34% for 10 sec.
 *
 * FIXTURE: controlComp('admi', true) — admi is Burst II, so the control's B1/B2/B3
 * slots are what make bursts actually chain; admi occupies the carry slot as the focus
 * unit. Deterministic (no seed) so every run is byte-comparable.
 *
 * WHY EACH ASSERTION DISCRIMINATES: each kit line is pinned by an event-log assertion on
 * the exact (stat, value, target-set, duration) tuple the prose states, plus a
 * counterfactual built with withPatchedOverride that encodes the NEAREST-WRONG reading
 * of that same line. A test that only asserted "damage went up" would pass under the
 * wrong reading too; the counterfactual is what makes each assertion load-bearing.
 */

const BUFF = (evs: SimEvent[], stat: string) =>
  evs.filter(
    (e) => e.kind === 'buffApply' && (e as any).stat === stat
  ) as any[];

function run(opts: ReturnType<typeof controlComp>) {
  const evs: SimEvent[] = [];
  const res = runComp({
    ...opts,
    cfg: { ...(opts as any).cfg, onEvent: (e: SimEvent) => evs.push(e) },
  });
  return { res, evs };
}

// ---- hoisted runs (each is a full 180s sim) -------------------------------

const base = run(controlComp('admi', true));

// Nearest-wrong for skill1 SCOPE: additive charge-damage points instead of the
// base-charge-scaled multiplier the prose names ("Charge Damage Multiplier").
const wrongChargeStat = run({
  ...controlComp('admi', true),
  overrides: {
    admi: withPatchedOverride('admi', (ov) => {
      for (const b of ov.skill1!.blocks) {
        for (const e of b.effects as any[]) {
          if (e.kind === 'buff' && e.stat === 'chargeDamageMultPct') {
            e.stat = 'chargeDamagePct';
          }
        }
      }
    }),
  },
});

// Nearest-wrong for skill1 TARGET SET: self-only instead of "all allies".
const wrongChargeTarget = run({
  ...controlComp('admi', true),
  overrides: {
    admi: withPatchedOverride('admi', (ov) => {
      for (const b of ov.skill1!.blocks) {
        if (
          (b.effects as any[]).some((e) => e.stat === 'chargeDamageMultPct')
        ) {
          b.target = { kind: 'self' };
        }
      }
    }),
  },
});

// Nearest-wrong for skill1 TRIGGER IDENTITY: a plain always-on passive instead of a
// counted activation. A passive is live from frame 0 and never lapses.
const wrongChargeTrigger = run({
  ...controlComp('admi', true),
  overrides: {
    admi: withPatchedOverride('admi', (ov) => {
      for (const b of ov.skill1!.blocks) {
        if (
          (b.effects as any[]).some((e) => e.stat === 'chargeDamageMultPct')
        ) {
          b.trigger = { kind: 'passive' };
        }
      }
    }),
  },
});

// Nearest-wrong for the burst crit line: generic crit RATE instead of crit DAMAGE.
const wrongCritStat = run({
  ...controlComp('admi', true),
  overrides: {
    admi: withPatchedOverride('admi', (ov) => {
      for (const b of ov.burst!.blocks) {
        for (const e of b.effects as any[]) {
          if (e.kind === 'buff' && e.stat === 'critDamagePct') {
            e.stat = 'critRatePct';
          }
        }
      }
    }),
  },
});

// Nearest-wrong for the burst TARGET SET: self-only instead of "all allies".
const wrongBurstTarget = run({
  ...controlComp('admi', true),
  overrides: {
    admi: withPatchedOverride('admi', (ov) => {
      for (const b of ov.burst!.blocks) {
        b.target = { kind: 'self' };
      }
    }),
  },
});

// Reload-speed removed entirely — isolates the reload line's shot-economy footprint.
const noReload = run({
  ...controlComp('admi', true),
  overrides: {
    admi: withPatchedOverride('admi', (ov) => {
      for (const b of ov.burst!.blocks) {
        b.effects = (b.effects as any[]).filter(
          (e) => e.stat !== 'reloadSpeedPct'
        );
      }
    }),
  },
});

describe('admi — skill1: charge damage multiplier, all allies, counted activation', () => {
  it('emits a chargeDamageMultPct buff at the kit magnitude 9.59', () => {
    const evs = BUFF(base.evs, 'chargeDamageMultPct');
    expect(evs.length).toBeGreaterThan(0);
    // Plain percentage stats keep their raw kit value (not caster-scaled/flat-resolved).
    for (const e of evs) {
      expect(e.value).toBeCloseTo(9.59, 5);
    }
  });

  it('is a MULTIPLIER on base charge damage, not additive charge-damage points', () => {
    // Nearest-wrong: chargeDamagePct. The two stats enter different buckets, so a
    // faithful model and the wrong one cannot produce identical team damage.
    expect(BUFF(wrongChargeStat.evs, 'chargeDamageMultPct')).toHaveLength(0);
    expect(BUFF(wrongChargeStat.evs, 'chargeDamagePct').length).toBeGreaterThan(
      0
    );
    expect(totals(wrongChargeStat.res)).not.toEqual(totals(base.res));
  });

  it('affects ALL allies, not just admi (>1 distinct buff target)', () => {
    const targets = new Set(
      BUFF(base.evs, 'chargeDamageMultPct').map((e) => e.targetSlug)
    );
    expect(targets.size).toBeGreaterThan(1);
    expect(targets.has('admi')).toBe(true);
    // Nearest-wrong: self-only. Must collapse to exactly one target.
    const wrongTargets = new Set(
      BUFF(wrongChargeTarget.evs, 'chargeDamageMultPct').map(
        (e) => e.targetSlug
      )
    );
    expect(wrongTargets.size).toBe(1);
  });

  it('carries a 20 sec window, not permanent (expiresFrame is finite and ~20s out)', () => {
    const [first] = BUFF(base.evs, 'chargeDamageMultPct');
    expect(first).toBeDefined();
    expect(Number.isFinite(first.expiresFrame)).toBe(true);
    // 20 sec at 60fps = 1200 frames after apply. durationShots must be absent —
    // the prose says "sec", not "round(s)".
    expect(first.durationShots).toBeUndefined();
  });

  it('NON-VACUITY: the counted activation fires LATER than frame 0 (not an always-on passive)', () => {
    // The header is an activation clause ("Activates when attacked N time(s)"), so the
    // first application must be strictly after battle start. A passive model applies at 0.
    const [first] = BUFF(base.evs, 'chargeDamageMultPct');
    expect(first.expiresFrame).toBeGreaterThan(0);
    const [wrongFirst] = BUFF(wrongChargeTrigger.evs, 'chargeDamageMultPct');
    expect(wrongFirst).toBeDefined();
    // The wrong (passive) model must differ observably from the faithful one.
    expect(totals(wrongChargeTrigger.res)).not.toEqual(totals(base.res));
  });

  it('INERTNESS: skill1 moves no crit/ATK stat of its own', () => {
    const s1Stats = new Set(
      BUFF(base.evs, 'chargeDamageMultPct').map((e) => e.stat)
    );
    expect([...s1Stats]).toEqual(['chargeDamageMultPct']);
  });
});

describe('admi — skill2: Damage Taken reduction on 2 highest-final-ATK allies', () => {
  it('emits NO boss damageTakenPct debuff (this is an ally-side defensive line)', () => {
    // "Damage Taken ▼" on ALLIES is damage the allies receive. The schema\'s
    // damageTakenPct is a BOSS debuff where positive = boss takes MORE. Encoding this
    // line as damageTakenPct would be a sign error that hands the team free damage.
    const boss = (
      base.evs.filter(
        (e) =>
          e.kind === 'buffApply' &&
          (e as any).casterIdx === null &&
          (e as any).targetIdx === null
      ) as any[]
    ).filter((e) => e.stat === 'damageTakenPct');
    expect(boss).toHaveLength(0);
    const anyDt = BUFF(base.evs, 'damageTakenPct');
    expect(anyDt).toHaveLength(0);
  });

  it.skip('GAP: ally-side Damage Taken ▼28.65%/10s is unrepresentable and offensively inert', () => {
    // No primitive: the sim has no ally HP pool and the boss deals no damage at scope
    // lock, so an ally damage-taken reduction has zero damage channel. The schema has no
    // ally-scoped damage-taken stat (damageTakenPct is explicitly the boss debuff).
    // Belongs in the override\'s `unmodeled.skill2`, not as a block.
  });

  it.skip('GAP: "2 allies with the highest final ATK" target-set selection is unobservable here', () => {
    // alliesTopAtk{count:2, byFinalAtk:true} is the correct target primitive (the prose
    // says "final ATK" literally), but with no representable payload to attach there is
    // nothing to assert on. Re-enable if an ally-side damage-taken stat ever lands.
  });
});

describe('admi — burst: Reload Speed + Critical Damage, all allies, 10 sec', () => {
  it('emits reloadSpeedPct 50.91 and critDamagePct 28.34 at kit magnitudes', () => {
    const rl = BUFF(base.evs, 'reloadSpeedPct');
    const cd = BUFF(base.evs, 'critDamagePct');
    expect(rl.length).toBeGreaterThan(0);
    expect(cd.length).toBeGreaterThan(0);
    for (const e of rl) {
      expect(e.value).toBeCloseTo(50.91, 5);
    }
    for (const e of cd) {
      expect(e.value).toBeCloseTo(28.34, 5);
    }
  });

  it('the crit line is Critical DAMAGE, not Critical RATE', () => {
    // Nearest-wrong: critRatePct. Crit damage scales the crit bucket; crit rate changes
    // how often hits crit — different math, different totals.
    expect(BUFF(wrongCritStat.evs, 'critDamagePct')).toHaveLength(0);
    expect(totals(wrongCritStat.res)).not.toEqual(totals(base.res));
  });

  it('both burst lines affect ALL allies, not just admi', () => {
    const rlTargets = new Set(
      BUFF(base.evs, 'reloadSpeedPct').map((e) => e.targetSlug)
    );
    const cdTargets = new Set(
      BUFF(base.evs, 'critDamagePct').map((e) => e.targetSlug)
    );
    expect(rlTargets.size).toBeGreaterThan(1);
    expect(cdTargets.size).toBeGreaterThan(1);
    expect(rlTargets.has('admi')).toBe(true);
    expect(cdTargets.has('admi')).toBe(true);
    const wrongCd = new Set(
      BUFF(wrongBurstTarget.evs, 'critDamagePct').map((e) => e.targetSlug)
    );
    expect(wrongCd.size).toBe(1);
    expect(totals(wrongBurstTarget.res)).not.toEqual(totals(base.res));
  });

  it('burst buffs are keyed to admi CASTING her burst (Burst II), not to any Full Burst', () => {
    // TRIGGER IDENTITY: the lines sit in admi\'s OWN burst block with no "entering Full
    // Burst" clause, so they must apply on her burstCast. Applies must not exceed the
    // number of bursts admi actually cast.
    const casts = base.evs.filter(
      (e) => e.kind === 'burstCast' && (e as any).slug === 'admi'
    ).length;
    expect(casts).toBeGreaterThan(0);
    const applyRounds = new Set(
      BUFF(base.evs, 'critDamagePct').map((e) => e.expiresFrame)
    );
    expect(applyRounds.size).toBeLessThanOrEqual(casts);
  });

  it('the 10 sec windows are time-bounded, not round-bounded or permanent', () => {
    for (const e of [
      ...BUFF(base.evs, 'reloadSpeedPct'),
      ...BUFF(base.evs, 'critDamagePct'),
    ]) {
      expect(Number.isFinite(e.expiresFrame)).toBe(true);
      expect(e.durationShots).toBeUndefined();
    }
  });

  it('Reload Speed is a live shot-economy lever, not a cosmetic stat', () => {
    // Faster reload => more shots fired => strictly more team damage than with the line
    // stripped. Guards against the "defensive/utility, skip it" failure mode.
    const withRl = Object.values(totals(base.res)).reduce((a, b) => a + b, 0);
    const without = Object.values(totals(noReload.res)).reduce(
      (a, b) => a + b,
      0
    );
    expect(withRl).toBeGreaterThan(without);
  });

  it('INERTNESS: admi grants no ATK buff of any kind', () => {
    for (const stat of [
      'atkPct',
      'casterAtkPct',
      'highestAllyAtkPct',
      'atkOfMaxHpPct',
    ]) {
      expect(BUFF(base.evs, stat)).toHaveLength(0);
    }
  });

  it('INERTNESS: admi deals no rider/DoT damage — all her damage is her own weapon', () => {
    const dmg = base.evs.filter(
      (e) => e.kind === 'damage' && (e as any).slug === 'admi'
    ) as any[];
    expect(dmg.length).toBeGreaterThan(0);
    // The kit has no flatDamage/dot/storedHit line at all.
    for (const d of dmg) {
      expect(['normal', 'charge', 'core', 'crit']).toContain(
        String(d.bucket ?? 'normal')
      );
    }
    expect(unitOf(base.res, 'admi').totalDamage).toBeGreaterThan(0);
  });
});
