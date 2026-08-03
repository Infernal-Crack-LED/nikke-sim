import { describe, expect, it } from 'vitest';
import type { Element, SimEvent } from '../../../src/types.js';
import {
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

/*
 * admi — S5 BLIND test, ADAPTED for execution against the driver override.
 *
 * The raw S5 output (admi.test.ts) is committed verbatim; this adapted variant carries
 * THREE mechanical repairs, each preserving assertion INTENT (ade-agent-bunny precedent):
 *
 *  A1. FIXTURE BUG (the exact hazard S2b pre-warned, and the poli judge later ruled on):
 *      raw S5 fields controlComp('admi', true) = liter/crown/admi/helm. crown is ALSO
 *      Burst II (20s CD) at slot 1 vs admi slot 2 — lower-slot-first selection gives
 *      crown ALL stage-II casts, leaving admi ZERO bursts and every burst assertion
 *      vacuous/RED for fixture reasons. Adapted comp: liter/admi/modernia/helm (poli
 *      precedent) — admi is the SOLE Burst II and casts every chain.
 *  A2. SHAPE BUG: raw S5 iterates `ov.skill1.blocks` / `ov.burst.blocks` — the override
 *      schema has no `.blocks` wrapper; skill1/skill2/burst ARE the block arrays.
 *  A3. ATTRIBUTION BUG: raw S5 reads team-wide buffApply streams by stat alone, but its
 *      own fixture mates emit confounding values (crown reloadSpeedPct 44.35, liter
 *      atkPct, helm chargeDamageMultPct; modernia critDamagePct + atkPct in the adapted
 *      comp). Every assertion's INTENT is about what ADMI grants — the adapted reads
 *      attribute by casterIdx === admi's slot (the driver test does the same). The two
 *      skill2 absence assertions keep their team-wide scope — their intent IS global
 *      ('this fight emits no damageTakenPct at all').
 *  A4. SHAPE BUG 2: raw S5 asserts `durationShots` is `undefined` on wall-clock buffs —
 *      the engine's buffApply carries `durationShots: null` for 'no round budget'
 *      (types.ts L262). Intent preserved: assert null-or-undefined (falsy check).
 *
 * The skill1 group is left EXACTLY as S5 wrote it (shape-fixed only): S5 modeled S1 as
 * an encoded block, the driver ships it UNMODELED (⚑1: 'attacked 20 times' is an
 * incoming-damage trigger the v1 sim cannot accrue — noise/yulha precedent). That group
 * is the genuine RED-vs-driver signal for the S7 judge, not an adaptation artifact.
 */

const ADM = 1; // slot order: liter 0 / admi 1 / modernia 2 / helm 3

const ADAMI_COMP = {
  slugs: ['liter', 'admi', 'modernia', 'helm'],
  bossElement: 'Fire' as Element,
  focusSlug: 'admi',
};

/** buffApply events attributed to ADMI (A3). */
const BUFF_ADMI = (evs: SimEvent[], stat: string) =>
  evs.filter(
    (e) =>
      e.kind === 'buffApply' &&
      (e as any).stat === stat &&
      (e as any).casterIdx === ADM,
  ) as any[];
/** buffApply events by stat, any caster (the global skill2 absence pins). */
const BUFF = (evs: SimEvent[], stat: string) =>
  evs.filter((e) => e.kind === 'buffApply' && (e as any).stat === stat) as any[];

function run(overrides: Record<string, any> = {}) {
  const evs: SimEvent[] = [];
  const res = runComp({ ...ADAMI_COMP, overrides, cfg: { onEvent: (e: SimEvent) => evs.push(e) } });
  return { res, evs };
}

// ---- hoisted runs (each is a full 180s sim) -------------------------------

const base = run();

// Nearest-wrong for skill1 SCOPE: additive charge-damage points instead of the
// base-charge-scaled multiplier the prose names ("Charge Damage Multiplier").
const wrongChargeStat = run({
  admi: withPatchedOverride('admi', (ov) => {
    for (const b of ov.skill1!) {
      for (const e of b.effects as any[]) {
        if (e.kind === 'buff' && e.stat === 'chargeDamageMultPct') e.stat = 'chargeDamagePct';
      }
    }
  }),
});

// Nearest-wrong for skill1 TARGET SET: self-only instead of "all allies".
const wrongChargeTarget = run({
  admi: withPatchedOverride('admi', (ov) => {
    for (const b of ov.skill1!) {
      if ((b.effects as any[]).some((e) => e.stat === 'chargeDamageMultPct'))
        b.target = { kind: 'self' };
    }
  }),
});

// Nearest-wrong for skill1 TRIGGER IDENTITY: a plain always-on passive instead of a
// counted activation. A passive is live from frame 0 and never lapses.
const wrongChargeTrigger = run({
  admi: withPatchedOverride('admi', (ov) => {
    for (const b of ov.skill1!) {
      if ((b.effects as any[]).some((e) => e.stat === 'chargeDamageMultPct'))
        b.trigger = { kind: 'passive' };
    }
  }),
});

// Nearest-wrong for the burst crit line: generic crit RATE instead of crit DAMAGE.
const wrongCritStat = run({
  admi: withPatchedOverride('admi', (ov) => {
    for (const b of ov.burst!) {
      for (const e of b.effects as any[]) {
        if (e.kind === 'buff' && e.stat === 'critDamagePct') e.stat = 'critRatePct';
      }
    }
  }),
});

// Nearest-wrong for the burst TARGET SET: self-only instead of "all allies".
const wrongBurstTarget = run({
  admi: withPatchedOverride('admi', (ov) => {
    for (const b of ov.burst!) b.target = { kind: 'self' };
  }),
});

// Reload-speed removed entirely — isolates the reload line's shot-economy footprint.
const noReload = run({
  admi: withPatchedOverride('admi', (ov) => {
    for (const b of ov.burst!)
      b.effects = (b.effects as any[]).filter((e) => e.stat !== 'reloadSpeedPct');
  }),
});

describe('admi — skill1: charge damage multiplier, all allies, counted activation', () => {
  it('emits a chargeDamageMultPct buff at the kit magnitude 9.59', () => {
    const evs = BUFF_ADMI(base.evs, 'chargeDamageMultPct');
    expect(evs.length).toBeGreaterThan(0);
    // Plain percentage stats keep their raw kit value (not caster-scaled/flat-resolved).
    for (const e of evs) expect(e.value).toBeCloseTo(9.59, 5);
  });

  it('is a MULTIPLIER on base charge damage, not additive charge-damage points', () => {
    // Nearest-wrong: chargeDamagePct. The two stats enter different buckets, so a
    // faithful model and the wrong one cannot produce identical team damage.
    expect(BUFF_ADMI(wrongChargeStat.evs, 'chargeDamageMultPct')).toHaveLength(0);
    expect(BUFF_ADMI(wrongChargeStat.evs, 'chargeDamagePct').length).toBeGreaterThan(0);
    expect(totals(wrongChargeStat.res)).not.toEqual(totals(base.res));
  });

  it('affects ALL allies, not just admi (>1 distinct buff target)', () => {
    const targets = new Set(BUFF_ADMI(base.evs, 'chargeDamageMultPct').map((e) => e.targetSlug));
    expect(targets.size).toBeGreaterThan(1);
    expect(targets.has('admi')).toBe(true);
    // Nearest-wrong: self-only. Must collapse to exactly one target.
    const wrongTargets = new Set(
      BUFF_ADMI(wrongChargeTarget.evs, 'chargeDamageMultPct').map((e) => e.targetSlug),
    );
    expect(wrongTargets.size).toBe(1);
  });

  it('carries a 20 sec window, not permanent (expiresFrame is finite and ~20s out)', () => {
    const [first] = BUFF_ADMI(base.evs, 'chargeDamageMultPct');
    expect(first).toBeDefined();
    expect(Number.isFinite(first.expiresFrame)).toBe(true);
    // 20 sec at 60fps = 1200 frames after apply. durationShots must be absent —
    // the prose says "sec", not "round(s)".
    expect(first.durationShots).toBeUndefined();
  });

  it('NON-VACUITY: the counted activation fires LATER than frame 0 (not an always-on passive)', () => {
    // The header is an activation clause ("Activates when attacked N time(s)"), so the
    // first application must be strictly after battle start. A passive model applies at 0.
    const [first] = BUFF_ADMI(base.evs, 'chargeDamageMultPct');
    expect(first.expiresFrame).toBeGreaterThan(0);
    const [wrongFirst] = BUFF_ADMI(wrongChargeTrigger.evs, 'chargeDamageMultPct');
    expect(wrongFirst).toBeDefined();
    // The wrong (passive) model must differ observably from the faithful one.
    expect(totals(wrongChargeTrigger.res)).not.toEqual(totals(base.res));
  });

  it('INERTNESS: skill1 moves no crit/ATK stat of its own', () => {
    const s1Stats = new Set(
      BUFF_ADMI(base.evs, 'chargeDamageMultPct').map((e) => e.stat),
    );
    expect([...s1Stats]).toEqual(['chargeDamageMultPct']);
  });
});

describe('admi — skill2: Damage Taken reduction on 2 highest-final-ATK allies', () => {
  it('emits NO boss damageTakenPct debuff (this is an ally-side defensive line)', () => {
    // "Damage Taken ▼" on ALLIES is damage the allies receive. The schema's
    // damageTakenPct is a BOSS debuff where positive = boss takes MORE. Encoding this
    // line as damageTakenPct would be a sign error that hands the team free damage.
    // (Intent is GLOBAL: no such debuff anywhere in the fight.)
    const boss = (base.evs.filter(
      (e) => e.kind === 'buffApply' && (e as any).casterIdx === null && (e as any).targetIdx === null,
    ) as any[]).filter((e) => e.stat === 'damageTakenPct');
    expect(boss).toHaveLength(0);
    const anyDt = BUFF(base.evs, 'damageTakenPct');
    expect(anyDt).toHaveLength(0);
  });

  it.skip('GAP: ally-side Damage Taken ▼28.65%/10s is unrepresentable and offensively inert', () => {
    // No primitive: the sim has no ally HP pool and the boss deals no damage at scope
    // lock, so an ally damage-taken reduction has zero damage channel. The schema has no
    // ally-scoped damage-taken stat (damageTakenPct is explicitly the boss debuff).
    // Belongs in the override's `unmodeled.skill2`, not as a block.
  });

  it.skip('GAP: "2 allies with the highest final ATK" target-set selection is unobservable here', () => {
    // alliesTopAtk{count:2, byFinalAtk:true} is the correct target primitive (the prose
    // says "final ATK" literally), but with no representable payload to attach there is
    // nothing to assert on. Re-enable if an ally-side damage-taken stat ever lands.
  });
});

describe('admi — burst: Reload Speed + Critical Damage, all allies, 10 sec', () => {
  it('emits reloadSpeedPct 50.91 and critDamagePct 28.34 at kit magnitudes', () => {
    const rl = BUFF_ADMI(base.evs, 'reloadSpeedPct');
    const cd = BUFF_ADMI(base.evs, 'critDamagePct');
    expect(rl.length).toBeGreaterThan(0);
    expect(cd.length).toBeGreaterThan(0);
    for (const e of rl) expect(e.value).toBeCloseTo(50.91, 5);
    for (const e of cd) expect(e.value).toBeCloseTo(28.34, 5);
  });

  it('the crit line is Critical DAMAGE, not Critical RATE', () => {
    // Nearest-wrong: critRatePct. Crit damage scales the crit bucket; crit rate changes
    // how often hits crit — different math, different totals.
    expect(BUFF_ADMI(wrongCritStat.evs, 'critDamagePct')).toHaveLength(0);
    expect(totals(wrongCritStat.res)).not.toEqual(totals(base.res));
  });

  it('both burst lines affect ALL allies, not just admi', () => {
    const rlTargets = new Set(BUFF_ADMI(base.evs, 'reloadSpeedPct').map((e) => e.targetSlug));
    const cdTargets = new Set(BUFF_ADMI(base.evs, 'critDamagePct').map((e) => e.targetSlug));
    expect(rlTargets.size).toBeGreaterThan(1);
    expect(cdTargets.size).toBeGreaterThan(1);
    expect(rlTargets.has('admi')).toBe(true);
    expect(cdTargets.has('admi')).toBe(true);
    const wrongCd = new Set(BUFF_ADMI(wrongBurstTarget.evs, 'critDamagePct').map((e) => e.targetSlug));
    expect(wrongCd.size).toBe(1);
    expect(totals(wrongBurstTarget.res)).not.toEqual(totals(base.res));
  });

  it('burst buffs are keyed to admi CASTING her burst (Burst II), not to any Full Burst', () => {
    // TRIGGER IDENTITY: the lines sit in admi's OWN burst block with no "entering Full
    // Burst" clause, so they must apply on her burstCast. Applies must not exceed the
    // number of bursts admi actually cast.
    const casts = base.evs.filter(
      (e) => e.kind === 'burstCast' && (e as any).slug === 'admi',
    ).length;
    expect(casts).toBeGreaterThan(0);
    const applyRounds = new Set(
      BUFF_ADMI(base.evs, 'critDamagePct').map((e) => e.expiresFrame),
    );
    expect(applyRounds.size).toBeLessThanOrEqual(casts);
  });

  it('the 10 sec windows are time-bounded, not round-bounded or permanent', () => {
    for (const e of [...BUFF_ADMI(base.evs, 'reloadSpeedPct'), ...BUFF_ADMI(base.evs, 'critDamagePct')]) {
      expect(Number.isFinite(e.expiresFrame)).toBe(true);
      expect(e.durationShots == null, 'no round budget (null or undefined)').toBe(true);
    }
  });

  it('Reload Speed is a live shot-economy lever, not a cosmetic stat', () => {
    // Faster reload => more shots fired => strictly more team damage than with the line
    // stripped. Guards against the "defensive/utility, skip it" failure mode.
    const withRl = Object.values(totals(base.res)).reduce((a, b) => a + b, 0);
    const without = Object.values(totals(noReload.res)).reduce((a, b) => a + b, 0);
    expect(withRl).toBeGreaterThan(without);
  });

  it('INERTNESS: admi grants no ATK buff of any kind', () => {
    for (const stat of ['atkPct', 'casterAtkPct', 'highestAllyAtkPct', 'atkOfMaxHpPct']) {
      expect(BUFF_ADMI(base.evs, stat)).toHaveLength(0);
    }
  });

  it('INERTNESS: admi deals no rider/DoT damage — all her damage is her own weapon', () => {
    const dmg = base.evs.filter(
      (e) => e.kind === 'damage' && (e as any).slug === 'admi',
    ) as any[];
    expect(dmg.length).toBeGreaterThan(0);
    // The kit has no flatDamage/dot/storedHit line at all.
    for (const d of dmg) expect(['normal', 'charge', 'core', 'crit']).toContain(String(d.bucket ?? 'normal'));
    expect(unitOf(base.res, 'admi').totalDamage).toBeGreaterThan(0);
  });
});
