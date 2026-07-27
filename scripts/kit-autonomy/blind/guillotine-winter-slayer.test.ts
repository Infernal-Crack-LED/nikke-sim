/**
 * guillotine-winter-slayer - AR / Water / Attacker / Burst III (cd 40s, ammo 60).
 * BLIND per-unit kit spec: written from the kit prose ALONE, with no sight of the
 * driver's override, tests, or reasoning.
 *
 * KIT (structural paraphrase):
 *   S1-a  every 10 EXP stacks, self: Hero Level +1 (cap Lv 11);
 *         rewards -> Reloads 10.26%; Recovers 2.44% of own final Max HP.
 *   S1-b  when Hero levels up, all Water Code allies:
 *           Elemental Advantage Attack Damage +1.16% x Hero Level, continuously
 *           ATK +0.91% OF THE SKILL USER'S ATK x Hero Level, continuously
 *   S2-a  after 6 normal hits that did NOT hit the core, self: EXP -> ATK +1.81%, cap 100
 *   S2-b  on hitting the Core 3 times, self: EXP -> ATK +1.81%, cap 100
 *   S2-c  while Hero Level >= 2, self: Elemental Advantage Attack Damage +7.46%
 *   B-a   all Water Code allies: Attack Damage +10.14% and Elem Adv Atk Dmg +18.75%, 10 sec
 *   B-b   1 enemy (highest final Max HP): continuous damage 20.87% of final ATK
 *         x Hero Level, every 1 sec for 10 sec
 *
 * FIXTURE: controlComp(SLUG, true) = liter (B1, Fire) / crown (B2, Iron) /
 *   guillotine-winter-slayer (B3 carry, Water) / helm (B3, Water).
 *   helm is the IN-SCOPE Water ally that makes the all-Water-Code-allies scope
 *   observable; liter + crown are the OUT-OF-SCOPE controls. A lone B3 makes ZERO
 *   Full Bursts, so B1+B2 are required for the burst lines to fire at all.
 *   The control boss is Fire, so a Water unit has NO elemental advantage here and
 *   the elemAdvantageDamagePct lines are expected to be DAMAGE-INERT in this comp.
 *   Every elemental assertion is therefore made on the buffApply EVENT LOG
 *   (stat key + magnitude + target set), which is boss-element independent.
 *
 * WHY EACH GROUP DISCRIMINATES - the nearest-wrong model each one turns RED under:
 *   scope        : ally buffs keyed to {kind:'allies'} (leaks to liter/crown) or to
 *                  {kind:'self'} (never reaches helm). The counterfactual in group 6
 *                  is two-sided: helm MUST move, liter/crown MUST NOT.
 *   stat key     : Elemental Advantage Attack Damage folded into attackDamagePct
 *                  (would be live vs a non-advantaged boss - a real over-credit).
 *   trigger id   : own-burst blocks keyed to fullBurstEnter instead of burstCast -
 *                  over-credits in this comp because helm is a SECOND Burst III.
 *   duration     : 'for 10 sec' encoded as permanent (no expiry) or as durationShots
 *                  (a ROUND count) instead of a wall-clock window.
 *   stack model  : the 1.81%/stack EXP ATK authored as one flat max-stacks buff
 *                  (no cap, no ramp) - group 11 pins per-stack magnitude + cap 100.
 *   level scaling: Hero Level collapsed to a fixed constant - group 8 requires either
 *                  growing emitted magnitudes or a declared resource pool.
 *   accrual paths: the core path (3 core hits) dropped, leaving only the 6-non-core
 *                  path - under-credits EXP by ~half at high core rates (group 10).
 *   no silent drop: the two level-up REWARDS (partial reload = shot economy = damage;
 *                  the self-heal = a cross-unit on-recovery channel) must be modeled
 *                  or named in note/unmodeled (group 13).
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

const SLUG = 'guillotine-winter-slayer';
const HELM = 'helm'; // Water Code Burst III - IN scope for all Water Code allies
const LITER = 'liter'; // Fire Burst I  - OUT of scope
const CROWN = 'crown'; // Iron Burst II - OUT of scope

const PER_LEVEL_ELEM = 1.16;
const MAX_LEVEL = 11;
const EXP_ATK = 1.81;
const EXP_CAP = 100;
const BURST_ATTACK_DMG = 10.14;
const BURST_ELEM = 18.75;
const S2_ELEM = 7.46;
const DOT_PCT = 20.87;
const RELOAD_FRAC = 0.1026;
const EPS = 1e-6;

const SLOTS = ['skill1', 'skill2', 'burst'] as const;
const ATK_STATS = new Set([
  'atkPct',
  'casterAtkPct',
  'highestAllyAtkPct',
  'atkOfMaxHpPct',
]);
const DMG_KINDS = new Set(['dot', 'flatDamage', 'storedHit', 'stackedNuke']);

// ---------------------------------------------------------------- shape helpers
// The committed override is slot-keyed; tolerate both the on-disk (slot = Block[])
// and the loaded (slot = CharacterSkills with .blocks) shapes so a shape guess can
// never masquerade as a unit-level divergence.
function slotBlocks(ov: any, slot: string): any[] {
  const s = ov?.[slot];
  if (!s) {
    return [];
  }
  return Array.isArray(s) ? s : Array.isArray(s.blocks) ? s.blocks : [];
}
function allBlocks(ov: any): any[] {
  return SLOTS.flatMap((s) => slotBlocks(ov, s));
}
function allEffects(ov: any): any[] {
  return allBlocks(ov).flatMap((b: any) => b?.effects ?? []);
}
function auditText(ov: any): string {
  const parts: string[] = [String(ov?.note ?? '')];
  const push = (u: any) => {
    if (!u) {
      return;
    }
    for (const k of Object.keys(u)) {
      parts.push(...((u as any)[k] ?? []));
    }
  };
  push(ov?.unmodeled);
  for (const s of SLOTS) {
    const v = ov?.[s];
    if (v && !Array.isArray(v)) {
      push(v.unmodeled);
    }
  }
  return parts.join(' | ').toLowerCase();
}
function resourcePools(ov: any): any[] {
  const out: any[] = [];
  if (Array.isArray(ov?.resources)) {
    out.push(...ov.resources);
  }
  for (const s of SLOTS) {
    const v = ov?.[s];
    if (v && !Array.isArray(v) && Array.isArray(v.resources)) {
      out.push(...v.resources);
    }
  }
  return out;
}
// a buff's PER-UNIT magnitude: perResource buffs carry it as mult, plain buffs as value
const perValue = (e: any): number =>
  e?.perResource ? e.perResource.mult : e?.value;
const near = (a: number, b: number) => Math.abs(a - b) < EPS;

// ---------------------------------------------------------------- run helpers
interface Run {
  res: any;
  events: SimEvent[];
}

function run(overrides?: Record<string, unknown>): Run {
  const events: SimEvent[] = [];
  const opts = controlComp(SLUG, true) as any;
  opts.cfg = {
    ...(opts.cfg ?? {}),
    onEvent: (ev: SimEvent) => events.push(ev),
  };
  if (overrides) {
    opts.overrides = { ...(opts.overrides ?? {}), ...overrides };
  }
  return { res: runComp(opts), events };
}

const applies = (evs: SimEvent[], stat: string, value: number): any[] =>
  (evs as any[]).filter(
    (e) => e.kind === 'buffApply' && e.stat === stat && near(e.value, value)
  );
const kindCount = (evs: SimEvent[], kind: string): number =>
  (evs as any[]).filter((e) => e.kind === kind).length;
const targetsOf = (evs: any[]): Set<string> =>
  new Set(evs.map((e) => e.targetSlug));

// The committed override, read-only (withPatchedOverride returns a clone; the
// no-op mutator leaves the on-disk JSON untouched).
const OV: any = withPatchedOverride(SLUG, () => {});

// ---------------------------------------------------------------- hoisted runs (4 x 180s)
const base = run();

// counterfactual A: strip every effect from skill1 blocks that are NOT self-targeted,
// i.e. exactly the Water-Code-ally level-up grants.
const noTeamS1 = run({
  [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
    for (const b of slotBlocks(ov, 'skill1')) {
      if (b?.target?.kind !== 'self') {
        b.effects = [];
      }
    }
  }),
});

// counterfactual B: strip every buff whose per-unit magnitude is the EXP 1.81%,
// in any slot and under either encoding (stacked buff or perResource pool).
const noExpAtk = run({
  [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
    for (const s of SLOTS) {
      for (const b of slotBlocks(ov, s)) {
        b.effects = (b.effects ?? []).filter(
          (e: any) => !(e.kind === 'buff' && near(perValue(e), EXP_ATK))
        );
      }
    }
  }),
});

// counterfactual C: strip every damage-dealing effect from the burst slot
// (kind-agnostic, so it fires whether the continuous damage is a dot or flatDamage).
const noBurstDmg = run({
  [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
    for (const b of slotBlocks(ov, 'burst')) {
      b.effects = (b.effects ?? []).filter((e: any) => !DMG_KINDS.has(e.kind));
    }
  }),
});

const carry = (r: Run) => totals(r.res)[SLUG];

describe('guillotine-winter-slayer - blind kit spec', () => {
  // ---- 1. fixture liveness (every later assertion rides on this) -------------
  it('fixture is live: the carry fires, deals damage and the team full-bursts', () => {
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
    expect(kindCount(base.events, 'shot')).toBeGreaterThan(100);
    // cd 40s over a 180s fight - the burst lines must be exercised repeatedly,
    // otherwise every burst assertion below is vacuous.
    expect(kindCount(base.events, 'fullBurstStart')).toBeGreaterThanOrEqual(2);
    expect(totals(base.res)[HELM]).toBeGreaterThan(0);
    expect(totals(base.res)[LITER]).toBeGreaterThan(0);
  });

  // ---- 2. override shape / validator hygiene --------------------------------
  it('override carries all three slots and no ignored-effect blocks', () => {
    for (const s of SLOTS) {
      expect(slotBlocks(OV, s).length).toBeGreaterThan(0);
    }
    expect(allEffects(OV).some((e: any) => e.kind === 'ignored')).toBe(false);
  });

  // ---- 3. BURST: Attack Damage +10.14% for 10 sec, all Water Code allies -----
  it('burst grants Attack Damage 10.14% to Water allies only, as a timed window', () => {
    const evs = applies(base.events, 'attackDamagePct', BURST_ATTACK_DMG);
    expect(evs.length).toBeGreaterThanOrEqual(2); // non-vacuity: fires on repeat bursts

    const tg = targetsOf(evs);
    expect(tg.has(SLUG)).toBe(true); // the caster is Water Code - self is included
    expect(tg.has(HELM)).toBe(true); // RED if scoped {kind:'self'}
    expect(tg.has(LITER)).toBe(false); // RED if scoped {kind:'allies'}
    expect(tg.has(CROWN)).toBe(false);

    // duration semantics: 'for 10 sec' is a wall-clock window, not permanent and
    // not a ROUND count.
    expect(evs.every((e) => Number.isFinite(e.expiresFrame))).toBe(true);
    expect(evs.every((e) => e.durationShots == null)).toBe(true);

    // cannot fire more often than the team full-bursts
    expect(evs.length / tg.size).toBeLessThanOrEqual(
      kindCount(base.events, 'fullBurstStart')
    );
  });

  // ---- 4. BURST: Elemental Advantage Attack Damage +18.75% for 10 sec --------
  it('burst elemental line is elemAdvantageDamagePct 18.75, Water allies, timed', () => {
    const evs = applies(base.events, 'elemAdvantageDamagePct', BURST_ELEM);
    expect(evs.length).toBeGreaterThanOrEqual(2);

    const tg = targetsOf(evs);
    expect(tg.has(SLUG)).toBe(true);
    expect(tg.has(HELM)).toBe(true);
    expect(tg.has(LITER)).toBe(false);
    expect(tg.has(CROWN)).toBe(false);
    expect(evs.every((e) => Number.isFinite(e.expiresFrame))).toBe(true);
    expect(evs.every((e) => e.durationShots == null)).toBe(true);

    // the elemental line must NOT be folded into the generic Damage Up bucket:
    // an attackDamagePct of 18.75 (or a merged 28.89) would be live against a
    // non-advantaged boss, over-crediting the whole comp.
    expect(applies(base.events, 'attackDamagePct', BURST_ELEM).length).toBe(0);
    expect(
      applies(base.events, 'attackDamagePct', BURST_ATTACK_DMG + BURST_ELEM)
        .length
    ).toBe(0);
  });

  // ---- 5. BURST trigger identity: own burst cast, not team full-burst entry ---
  it('burst-slot blocks key off the owner burst cast', () => {
    const trig = slotBlocks(OV, 'burst').map((b: any) => b?.trigger?.kind);
    expect(trig.length).toBeGreaterThan(0);
    // helm is a SECOND Burst III in this fixture, so fullBurstEnter would fire the
    // burst payload on rotations this unit did not cast.
    expect(trig.every((k: string) => k === 'burstCast')).toBe(true);
  });

  // ---- 6. BURST: continuous damage, 20.87% of final ATK x Hero Level, 10x1s ---
  it('burst continuous damage is one 10s / 1s-interval DoT scaled by Hero Level', () => {
    const dots = slotBlocks(OV, 'burst')
      .flatMap((b: any) => b?.effects ?? [])
      .filter((e: any) => e.kind === 'dot');
    // exactly ONE instance per cast: the engine never dedups DoT instances, so a
    // long duration on a repeating trigger multiplies.
    expect(dots.length).toBe(1);
    const d = dots[0];
    expect(d.durationSec).toBe(10);
    expect(d.intervalSec ?? 1).toBe(1);

    // Hero-Level scaling: either a live resource read (mult = the per-level 20.87)
    // or a static atkPct that is a whole-level multiple within the Lv 11 cap.
    if (d.perResource) {
      expect(near(d.perResource.mult, DOT_PCT)).toBe(true);
    } else {
      const lvl = d.atkPct / DOT_PCT;
      expect(lvl).toBeGreaterThanOrEqual(1 - EPS);
      expect(lvl).toBeLessThanOrEqual(MAX_LEVEL + EPS);
    }
  });

  it('burst damage is reachable and material (stripping it lowers only the carry)', () => {
    expect(carry(noBurstDmg)).toBeLessThan(carry(base));
    // inertness: a self-dealt DoT must not move any teammate
    expect(totals(noBurstDmg.res)[LITER]).toBe(totals(base.res)[LITER]);
    expect(totals(noBurstDmg.res)[CROWN]).toBe(totals(base.res)[CROWN]);
    expect(totals(noBurstDmg.res)[HELM]).toBe(totals(base.res)[HELM]);
  });

  // ---- 7. S1-b scope: Water Code allies, two-sided counterfactual ------------
  it('skill1 level-up grants are scoped to Water Code allies (not self, not all)', () => {
    const team = slotBlocks(OV, 'skill1').filter(
      (b: any) => b?.target?.kind !== 'self'
    );
    expect(team.length).toBeGreaterThan(0); // RED if the grants were scoped self-only
    for (const b of team) {
      expect(b.target.kind).toBe('alliesOfElement');
      expect(String(b.target.element).toLowerCase()).toBe('water');
      expect(Boolean(b.target.excludeSelf)).toBe(false); // the caster is Water Code
    }

    // behavioural, encoding-agnostic: removing the team grants must move the Water
    // ally and the caster, and must NOT move the two non-Water allies.
    expect(totals(noTeamS1.res)[HELM]).not.toBe(totals(base.res)[HELM]);
    expect(carry(noTeamS1)).not.toBe(carry(base));
    expect(totals(noTeamS1.res)[LITER]).toBe(totals(base.res)[LITER]);
    expect(totals(noTeamS1.res)[CROWN]).toBe(totals(base.res)[CROWN]);
  });

  // ---- 8. S1-b: ATK +0.91% OF THE SKILL USER'S ATK ---------------------------
  it('the level-up ATK grant is caster-scaled and reaches exactly the Water allies', () => {
    // caster-scaled buffs re-emit FLAT-resolved ATK, so the magnitude cannot be
    // predicted blind - instead group the casterAtkPct applies by emitted value and
    // require some group whose target set is exactly {carry, helm}. crown also emits
    // casterAtkPct to the whole team, so this grouping is what isolates this unit.
    const cs = (base.events as any[]).filter(
      (e) => e.kind === 'buffApply' && e.stat === 'casterAtkPct'
    );
    expect(cs.length).toBeGreaterThan(0);

    const groups = new Map<string, Set<string>>();
    for (const e of cs) {
      const k = String(Math.round(e.value * 1e4));
      if (!groups.has(k)) {
        groups.set(k, new Set());
      }
      groups.get(k)!.add(e.targetSlug);
    }
    const waterOnly = [...groups.values()].filter(
      (tg) =>
        tg.has(SLUG) &&
        tg.has(HELM) &&
        !tg.has(LITER) &&
        !tg.has(CROWN) &&
        tg.size === 2
    );
    // RED under {kind:'allies'} (liter/crown appear), under {kind:'self'} (helm never
    // appears), and under a plain atkPct encoding (wrong stat key entirely).
    expect(waterOnly.length).toBeGreaterThan(0);
  });

  // ---- 9. S1: Hero Level actually scales (not collapsed to a constant) -------
  it('Hero Level scaling is live: magnitudes grow, or a level/EXP pool is declared', () => {
    const elem = (base.events as any[]).filter(
      (e) => e.kind === 'buffApply' && e.stat === 'elemAdvantageDamagePct'
    );
    const levelScaled = elem
      .map((e) => e.value)
      .filter((v: number) => {
        const n = v / PER_LEVEL_ELEM;
        return Math.abs(n - Math.round(n)) < 1e-4 && Math.round(n) >= 1;
      });

    const pooled =
      resourcePools(OV).length > 0 ||
      JSON.stringify(OV).includes('perResource');
    // either the emitted magnitudes step up with the level, or the value is driven
    // live off a declared pool. A single fixed magnitude with no pool = the level was
    // frozen to a constant (the nearest-wrong this catches).
    expect(
      new Set(levelScaled.map((v) => Math.round(v * 1e4))).size > 1 || pooled
    ).toBe(true);

    // Lv 11 cap: no per-level elemental magnitude may exceed 1.16 x 11.
    if (levelScaled.length) {
      expect(Math.max(...levelScaled)).toBeLessThanOrEqual(
        PER_LEVEL_ELEM * MAX_LEVEL + EPS
      );
    }
  });

  // ---- 10. S2-a / S2-b: the two EXP accrual paths ---------------------------
  it('EXP accrues on BOTH the 6-non-core path and the 3-core path', () => {
    const s2 = slotBlocks(OV, 'skill2');
    const hc = s2.filter((b: any) => b?.trigger?.kind === 'hitCount');
    const six = hc.find((b: any) => b.trigger.count === 6);
    const three = hc.find((b: any) => b.trigger.count === 3);
    // dropping the core path under-credits EXP; making the 6-path core-gated (or the
    // 3-path ungated) mis-reads which clause owns which threshold.
    expect(six).toBeDefined();
    expect(three).toBeDefined();
    expect(three!.requiresCore).toBe(true);
    expect(Boolean(six!.requiresCore)).toBe(false);
  });

  // ---- 11. S2: EXP stack magnitude + cap ------------------------------------
  it('EXP grants ATK 1.81% per stack, capped at 100 stacks', () => {
    const expBuffs = allEffects(OV).filter(
      (e: any) =>
        e.kind === 'buff' && ATK_STATS.has(e.stat) && near(perValue(e), EXP_ATK)
    );
    // RED if the stack line was authored at its max-stack magnitude (1.81 x 100)
    // as a single flat buff.
    expect(expBuffs.length).toBeGreaterThan(0);
    const capped =
      expBuffs.some((e: any) => e.maxStacks === EXP_CAP) ||
      resourcePools(OV).some((r: any) => r.max === EXP_CAP);
    expect(capped).toBe(true);
    // self-scoped: the EXP ATK is an Affects-self line
    const holders = allBlocks(OV).filter((b: any) =>
      (b.effects ?? []).some(
        (e: any) => e.kind === 'buff' && near(perValue(e), EXP_ATK)
      )
    );
    expect(holders.every((b: any) => b.target?.kind === 'self')).toBe(true);
  });

  it('the EXP ATK ramp is material to the carry and inert for everyone else', () => {
    const drop = 1 - carry(noExpAtk) / carry(base);
    expect(drop).toBeGreaterThan(0.03); // up to +181% ATK at cap - a real, large channel
    expect(totals(noExpAtk.res)[LITER]).toBe(totals(base.res)[LITER]);
    expect(totals(noExpAtk.res)[CROWN]).toBe(totals(base.res)[CROWN]);
  });

  // ---- 12. S2-c: +7.46% elemental, SELF only, gated on Hero Level >= 2 -------
  it('the 7.46% elemental line is self-only and level-gated (not a t=0 passive)', () => {
    const evs = applies(base.events, 'elemAdvantageDamagePct', S2_ELEM);
    expect(evs.length).toBeGreaterThan(0);
    const tg = targetsOf(evs);
    expect(tg.has(SLUG)).toBe(true);
    // this clause says Affects self - the OTHER Water ally must never receive it.
    expect(tg.has(HELM)).toBe(false);
    expect(tg.has(LITER)).toBe(false);
    expect(tg.has(CROWN)).toBe(false);

    // Hero Level starts at 1, so the buff cannot be live from frame 0: the carrier
    // block needs a real trigger or a gate. An unconditional passive over-credits
    // the opening seconds.
    const holders = allBlocks(OV).filter((b: any) =>
      (b.effects ?? []).some(
        (e: any) =>
          e.kind === 'buff' &&
          e.stat === 'elemAdvantageDamagePct' &&
          near(e.value, S2_ELEM)
      )
    );
    expect(holders.length).toBeGreaterThan(0);
    expect(
      holders.every(
        (b: any) => b.trigger?.kind !== 'passive' || b.resourceGate != null
      )
    ).toBe(true);
  });

  // ---- 13. S1-a rewards: no silent drops ------------------------------------
  it('the level-up rewards (partial reload, self heal) are modelled or documented', () => {
    const eff = allEffects(OV);
    const txt = auditText(OV);

    // Reloads 10.26% is weapon-state = shot economy = damage.
    const reloadModelled = eff.some(
      (e: any) =>
        e.kind === 'instantReload' &&
        Math.abs((e.fraction ?? 1) - RELOAD_FRAC) < 5e-3
    );
    expect(reloadModelled || txt.includes('reload')).toBe(true);

    // Recovers 2.44% of final Max HP: inert alone, but it is the on-recovery channel
    // a teammate can consume - it must not vanish silently.
    const healModelled = eff.some((e: any) => e.kind === 'heal');
    expect(
      healModelled || txt.includes('recover') || txt.includes('max hp')
    ).toBe(true);
  });

  // ---- 14. global inertness -------------------------------------------------
  it('no guillotine-winter-slayer buff ever lands on a non-Water ally', () => {
    const mine = [BURST_ATTACK_DMG, BURST_ELEM, S2_ELEM];
    for (const v of mine) {
      for (const stat of ['attackDamagePct', 'elemAdvantageDamagePct']) {
        const tg = targetsOf(applies(base.events, stat, v));
        expect(tg.has(LITER)).toBe(false);
        expect(tg.has(CROWN)).toBe(false);
      }
    }
  });

  // ---- GAPS -----------------------------------------------------------------
  it.skip('EXP ramp is monotonic over the fight (per-shot damage rises)', () => {
    // GAP: proving the ramp directly needs the per-damage-event amount field, whose
    // name is not pinned in the blind harness contract (the contract documents
    // bucket / srcSlot / crit / core / inFullBurst / mult only). The ramp is covered
    // structurally by the growing-magnitude assertion and behaviourally by the
    // EXP-strip counterfactual instead.
  });

  it.skip('EXP accrual RATE matches (1-c)/6 + c/3 per normal hit', () => {
    // GAP / MEASUREMENT-GATED: requiresCore is a fight-level core-exposure gate, not
    // a per-hit core/non-core partition, so the engine cannot express the exact split
    // between the 6-non-core and 3-core counters at a given core rate. The effective
    // accrual rate (and therefore the Hero Level trajectory) is a flagged estimate
    // until it is read off footage.
  });
});
