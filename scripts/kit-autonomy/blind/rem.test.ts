/**
 * rem (Rem) — MG / Water / Supporter / Burst II. BLIND kit spec: written from the kit prose
 * alone, with no sight of the shipped override, its tests, or any driver reasoning.
 *
 * STRUCTURAL READ OF THE KIT (headers + Affects-clauses + stat keywords only):
 *  skill1 a) header: activation after landing 15 normal attacks "in Demon's Breath status";
 *            Affects self; "ATK ▲ 4.22%", "stacks up to 30", 10 sec.
 *            → hit-count trigger over ROUNDS (MG, hitsPerShot 1), SELF-only stacking buff,
 *              4.22 per stack × 30 cap, each stack 10 s — GATED on her own "Demon's Breath"
 *              status, which only her OWN burst opens (the burst slot names it). The status is
 *              self-scoped, and the engine's only window primitive (targetStatus /
 *              requiresTargetStatus) is enemy-scoped, so the ENCODING is open; the OBSERVABLE
 *              is not: the stacks may only accrue inside a ~10 s window that begins at her own
 *              burst cast, and must fully lapse between windows.
 *        b) header: "Activates when using Burst Skill"; Affects all allies;
 *            "Equally shares HP recovery" 10 sec. → GAP (see it.skip).
 *  skill2 a) start of battle, self, recovers a % of attack damage as HP. → GAP (no HP pool).
 *        b) start of battle, self + 2 Rocket-Launcher allies by highest final ATK, shares
 *            recovery continuously. → GAP twice: no share primitive, and no weapon-filtered
 *            top-N-by-final-ATK target in the vocabulary.
 *  burst  a) Affects self; "Demon's Breath: Critical Rate ▲ 37.8%" 10 sec.
 *            → UNSCOPED crit (critRatePct, NOT critRateNormalPct — the text carries no
 *              "of normal attacks" qualifier), self, keyed to her OWN burst cast.
 *        b) Affects "all allies with a Rocket Launcher"; ATK ▲ 50.78% of the skill user's ATK,
 *            10 sec. → casterAtkPct, weapon-scoped target set, FLAT-resolved on buffApply.
 *        c) "Max Ammunition Capacity ▲ 5 round(s)" 10 sec, same RL target set. → maxAmmoFlat 5.
 *            A weapon-state modifier IS damage: it gates shots fired.
 *
 * FIXTURE: controlComp('rem', true) → liter (B1) / crown (B2, Rocket Launcher) / rem / helm
 * (B3, SR/Water). The fixed B3 is REQUIRED — rem is Burst II and a chain cannot complete
 * without a B3, and with zero Full Bursts every burst-keyed line goes vacuous. Crown is the
 * only Rocket-Launcher ally in the fixture, so she is the positive control for the two
 * RL-scoped burst buffs while liter (SMG) and helm (SR) are the negative controls.
 * NOTE: rem shares burst stage 2 with crown, so she may not cast on every rotation — the
 * first test asserts she casts at least once; if that fails the FIXTURE is wrong (swap the
 * fixed B2 support), not the override.
 *
 * WHY THE ASSERTIONS DISCRIMINATE (nearest-wrong models they go RED under):
 *  - self-crit value/scope  → RED if authored as critRateNormalPct (over/under-scoped crit)
 *                             or as a 0.378 fraction.
 *  - RL target set          → RED if the ally buffs are authored as {kind:'allies'} (leaks onto
 *                             liter + helm) or as self.
 *  - flat-resolution check  → RED if the caster-scaled buff is emitted as the raw 50.78.
 *  - maxAmmoFlat 5          → RED if authored as maxAmmoPct 5 (a percent of an RL magazine is
 *                             a fraction of a round, not five rounds).
 *  - stacks-after-burst     → RED under an UNGATED hitCount model: an MG clears 15 rounds in
 *                             about a second, so the first stack would land long before her
 *                             first burst cast.
 *  - inter-window lapse     → RED under the same ungated model: continuous fire applies stacks
 *                             every fraction of a second, so no 10 s hole ever opens.
 *  - shared burst trigger   → RED if the three burst lines are split across burstCast and
 *                             fullBurstEnter keying (counts diverge).
 *
 * 3 runs (each a full 180 s sim), all hoisted.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

type Opts = Parameters<typeof runComp>[0];

/** Structural view of a buffApply event (documented field set), so the test does not depend on
 *  how the SimEvent union is spelled. */
type BuffApplyShape = {
  kind: 'buffApply';
  stat: string;
  key?: string;
  value: number;
  stacks?: number;
  maxStacks?: number;
  casterIdx: number | null;
  targetIdx: number | null;
  targetSlug?: string;
  expiresFrame?: number | null;
};

type LooseEffect = { kind: string; stat?: string; value?: number };
type LooseBlock = { effects: LooseEffect[] };

/** The override file is slot-keyed; a slot is either a Block[] or a CharacterSkills carrying
 *  blocks[]. Handle both so the counterfactual patch is encoding-agnostic. */
function slotBlocks(slot: unknown): LooseBlock[] {
  if (Array.isArray(slot)) {
    return slot as LooseBlock[];
  }
  const s = slot as { blocks?: LooseBlock[] } | undefined | null;
  return s?.blocks ?? [];
}

function run(opts: Opts) {
  const events: SimEvent[] = [];
  const tapped = {
    ...opts,
    cfg: {
      ...((opts as { cfg?: Record<string, unknown> }).cfg ?? {}),
      onEvent: (ev: SimEvent) => events.push(ev),
    },
  } as Opts;
  const res = runComp(tapped);
  return { res, events, dmg: totals(res) };
}

function fixture(remOverride?: unknown): Opts {
  const opts = controlComp('rem', true) as Opts & {
    overrides?: Record<string, unknown>;
  };
  if (!remOverride) {
    return opts;
  }
  return {
    ...opts,
    overrides: { ...(opts.overrides ?? {}), rem: remOverride },
  } as Opts;
}

const asBuff = (ev: SimEvent) => ev as unknown as BuffApplyShape;
const buffApplies = (evs: SimEvent[]): BuffApplyShape[] =>
  evs.filter((e) => e.kind === 'buffApply').map(asBuff);
const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;

// ---------------------------------------------------------------- runs (hoisted)
const base = run(fixture());

let removedCasterAtk = 0;
const noRlAtkOverride = withPatchedOverride('rem', (ov) => {
  for (const b of slotBlocks(
    (ov as unknown as Record<string, unknown>).burst
  )) {
    const before = b.effects.length;
    b.effects = b.effects.filter(
      (e) => !(e.kind === 'buff' && e.stat === 'casterAtkPct')
    );
    removedCasterAtk += before - b.effects.length;
  }
});
const noRlAtk = run(fixture(noRlAtkOverride));

let removedAmmo = 0;
const noRlAmmoOverride = withPatchedOverride('rem', (ov) => {
  for (const b of slotBlocks(
    (ov as unknown as Record<string, unknown>).burst
  )) {
    const before = b.effects.length;
    b.effects = b.effects.filter(
      (e) =>
        !(
          e.kind === 'buff' &&
          (e.stat === 'maxAmmoFlat' || e.stat === 'maxAmmoPct')
        )
    );
    removedAmmo += before - b.effects.length;
  }
});
const noRlAmmo = run(fixture(noRlAmmoOverride));

// ---------------------------------------------------------------- derived views
/** rem's own burst cast is uniquely marked by her self-targeted 37.8 crit buff — a marker that
 *  needs no assumption about the burstCast event's caster field. */
const demonBreath = buffApplies(base.events).filter(
  (b) =>
    b.stat === 'critRatePct' && near(b.value, 37.8) && b.targetSlug === 'rem'
);
const remIdx: number | null =
  demonBreath.length > 0 ? demonBreath[0].casterIdx : null;
const fromRem = (b: BuffApplyShape) =>
  b.casterIdx !== null && b.casterIdx === remIdx;

const stackApplies = buffApplies(base.events).filter(
  (b) => b.stat === 'atkPct' && near(b.value, 4.22)
);
const rlAtk = buffApplies(base.events).filter(
  (b) => b.stat === 'casterAtkPct' && fromRem(b)
);
const rlAmmo = buffApplies(base.events).filter(
  (b) => b.stat === 'maxAmmoFlat' && fromRem(b)
);
const rlAtkTargets = new Set(rlAtk.map((b) => b.targetSlug));
const rlAmmoTargets = new Set(rlAmmo.map((b) => b.targetSlug));

const firstIndexOf = (pred: (b: BuffApplyShape) => boolean) =>
  base.events.findIndex((ev) => ev.kind === 'buffApply' && pred(asBuff(ev)));

describe('rem — fixture sanity (non-vacuity)', () => {
  it('rem is in the comp, deals damage, and casts her own burst at least once', () => {
    expect(base.dmg.rem).toBeGreaterThan(0);
    // If this is 0, rem never won burst stage 2 against the fixture B2 — re-fixture, do not
    // read the burst assertions below as override failures.
    expect(demonBreath.length).toBeGreaterThanOrEqual(1);
    expect(remIdx).not.toBeNull();
  });
});

describe("rem burst a — Demon's Breath self crit", () => {
  it('applies UNSCOPED Critical Rate 37.8 to self only', () => {
    for (const b of demonBreath) {
      expect(b.targetSlug).toBe('rem');
      expect(b.targetIdx).toBe(remIdx);
      expect(b.value).toBeCloseTo(37.8, 6);
    }
    // scope trap: the kit text has no "of normal attacks" qualifier, so the normal-scoped
    // variant must not be the carrier.
    const scoped = buffApplies(base.events).filter(
      (b) => b.stat === 'critRateNormalPct' && fromRem(b)
    );
    expect(scoped.length).toBe(0);
  });

  it('never grants the self crit to a teammate', () => {
    const leaked = buffApplies(base.events).filter(
      (b) =>
        b.stat === 'critRatePct' &&
        near(b.value, 37.8) &&
        fromRem(b) &&
        b.targetSlug !== 'rem'
    );
    expect(leaked.length).toBe(0);
  });
});

describe('rem burst b/c — Rocket-Launcher-scoped ally buffs', () => {
  it('the caster-scaled ATK buff lands on the RL ally only', () => {
    expect(rlAtk.length).toBeGreaterThan(0);
    // the fixture has exactly one Rocket-Launcher ally (the B2 support); liter (SMG), helm (SR)
    // and rem herself (MG) are the negative controls.
    expect(rlAtkTargets.has('liter')).toBe(false);
    expect(rlAtkTargets.has('helm')).toBe(false);
    expect(rlAtkTargets.has('rem')).toBe(false);
    expect(rlAtkTargets.size).toBe(1);
  });

  it('emits the caster-scaled ATK buff FLAT-resolved, not as the raw kit percentage', () => {
    for (const b of rlAtk) {
      expect(near(b.value, 50.78)).toBe(false);
      expect(b.value).toBeGreaterThan(1000);
    }
  });

  it('the RL ATK buff is load-bearing on the RL ally and inert on everyone else', () => {
    expect(removedCasterAtk).toBeGreaterThan(0);
    const rlSlug = [...rlAtkTargets][0] as string;
    expect(noRlAtk.dmg[rlSlug]).toBeLessThan(base.dmg[rlSlug]);
    expect(noRlAtk.dmg.liter).toBe(base.dmg.liter);
    expect(noRlAtk.dmg.helm).toBe(base.dmg.helm);
    expect(noRlAtk.dmg.rem).toBe(base.dmg.rem);
  });

  it('Max Ammunition is a FLAT 5-round grant on the same RL target set', () => {
    expect(rlAmmo.length).toBeGreaterThan(0);
    for (const b of rlAmmo) {
      expect(b.value).toBeCloseTo(5, 6);
    }
    expect([...rlAmmoTargets].sort()).toEqual([...rlAtkTargets].sort());
    const asPercent = buffApplies(base.events).filter(
      (b) => b.stat === 'maxAmmoPct' && fromRem(b)
    );
    expect(asPercent.length).toBe(0);
  });

  it('the ammo grant actually moves the RL ally (weapon-state modifiers are damage)', () => {
    expect(removedAmmo).toBeGreaterThan(0);
    const rlSlug = [...rlAtkTargets][0] as string;
    expect(noRlAmmo.dmg[rlSlug]).not.toBe(base.dmg[rlSlug]);
  });

  it('all three burst lines fire on the same trigger (one cast = one of each)', () => {
    // with exactly one RL ally, a burst-cast keying gives equal counts; splitting one line onto
    // fullBurstEnter (which fires on rotations rem does NOT cast) breaks the equality.
    expect(rlAtk.length).toBe(demonBreath.length);
    expect(rlAmmo.length).toBe(demonBreath.length);
  });
});

describe("rem skill1 a — Demon's-Breath-gated ATK stacks", () => {
  it('is a self-only 4.22-per-stack buff capped at 30 stacks', () => {
    expect(stackApplies.length).toBeGreaterThan(0);
    for (const b of stackApplies) {
      expect(b.targetSlug).toBe('rem');
      expect(fromRem(b)).toBe(true);
      expect(b.value).toBeCloseTo(4.22, 6);
      expect(b.maxStacks).toBe(30);
      expect(b.stacks ?? 1).toBeLessThanOrEqual(30);
    }
    // a single pre-summed 126.6 buff (4.22 × 30) would never emit a stacked apply
    const peak = Math.max(...stackApplies.map((b) => b.stacks ?? 1));
    expect(peak).toBeGreaterThanOrEqual(2);
  });

  it('accrues only AFTER her own burst opens the window, never from t=0', () => {
    const firstWindow = firstIndexOf(
      (b) =>
        b.stat === 'critRatePct' &&
        near(b.value, 37.8) &&
        b.targetSlug === 'rem'
    );
    const firstStack = firstIndexOf(
      (b) => b.stat === 'atkPct' && near(b.value, 4.22)
    );
    expect(firstWindow).toBeGreaterThanOrEqual(0);
    expect(firstStack).toBeGreaterThanOrEqual(0);
    // ungated nearest-wrong: an MG clears 15 rounds inside the first second, so the first stack
    // would precede her first burst cast.
    expect(firstStack).toBeGreaterThan(firstWindow);
  });

  it('the stack pool fully lapses between windows (the inactive case is exercised)', () => {
    // each stack expires 10 s (600 frames) after it is applied, so consecutive applies inside a
    // window sit a few frames apart; a gap larger than the whole 10 s stack lifetime proves the
    // pool emptied between windows — impossible under continuous ungated accrual (the longest
    // fire interruption, a full reload, is well under 10 s).
    const expiries = stackApplies
      .map((b) => b.expiresFrame)
      .filter((f): f is number => typeof f === 'number')
      .sort((a, b) => a - b);
    expect(expiries.length).toBeGreaterThan(0);
    if (demonBreath.length >= 2) {
      let maxGap = 0;
      for (let i = 1; i < expiries.length; i++) {
        maxGap = Math.max(maxGap, expiries[i] - expiries[i - 1]);
      }
      expect(maxGap).toBeGreaterThan(600);
    }
  });
});

describe('rem — GAP lines (no primitive)', () => {
  it.skip("skill1 b — burst-cast 'Equally shares HP recovery' to all allies", () => {
    // GAP: v1 models no HP pool, and the schema has no recovery-SHARING primitive (the `heal`
    // effect only emits recovery events with no amount). ADJUDICATION FORK, not a silent skip:
    // the fixture's B2 support consumes `recovery` triggers, so modeling the share as heals to
    // all allies would materially move a teammate's damage. Decide the semantics before
    // encoding it either way.
  });

  it.skip('skill2 a — recovers a % of attack damage as HP continuously (self)', () => {
    // GAP: lifesteal has no primitive (no HP pool); offensively inert for rem, who carries no
    // on-recovery consumer of her own.
  });

  it.skip('skill2 b — shares recovery with self + 2 highest-final-ATK RL allies', () => {
    // GAP twice over: (1) no share primitive, as above; (2) the target vocabulary has no
    // weapon-filtered top-N-by-final-ATK selector — alliesOfWeapon has no count/ranking,
    // alliesTopAtk{byFinalAtk} has no weapon filter, and alliesOfElementWeapon ranks by
    // position, not ATK. The target set is inexpressible today.
  });
});
