/**
 * mihara-bonding-chain — BLIND kit spec test (written from kit prose alone).
 * MG / Fire / Attacker / Burst III, cd 40s, ammo 300, normalAttackMultiplier 5.57.
 *
 * Kit lines under test (short quotes only):
 *  S1a  battle start, self: 'Charges Restraint Chains by 10' (cap 10)
 *  S1b  'when Full Burst ends' + this unit just bursted, self: +10 chains (cap 10)
 *  S1c  no activation clause ('at a specific timing'), enemy: 50.06% of final ATK,
 *       'once for every Restraint Chain', each attack spends 1 chain      [cadence = FLAG]
 *  S1d  same targets: Ensnaring Chains 25.08% sustained every 1 sec, 'continuously',
 *       stacks up to 20, 'cannot be removed'
 *  S2a  '40 normal attacks during Full Burst' on an Ensnared target: +1 Ensnaring stack
 *  S2b  skill user incapacitated: +20 stacks                    [GAP: no HP/death model]
 *  S2c  enemy neutralized while Ensnared: +1 chain              [GAP: boss never dies]
 *  S2d  'when entering Burst Stage 3', self: Sustained Damage +59.98% for 10 sec
 *  B    Ensnared targets: 50.05% sustained every 1 sec, 'Mirrors the stack count'
 *       for 10 sec, then 'Cancels Ensnaring Chains'
 *
 * FIXTURE: controlComp(SLUG, true) — liter B1 + crown B2 supply the chain so this Burst III
 * unit actually casts (a lone B3 makes ZERO full bursts). The fixed SR/Water B3 slot is KEPT
 * so a second Burst III exists and 'entering Burst Stage 3' (any stage-3 cast) can diverge
 * from 'this unit bursts' (own-cast). Every counterfactual is an in-memory
 * withPatchedOverride clone (committed JSON untouched) diffed against the SAME fixture, so
 * cross-world buff differences cannot leak into a diff.
 *
 * ENCODING TOLERANCE (deliberate): the engine can express the two stack pools either as named
 * `resources` feeding perResource-scaled DoTs, or as one DoT instance appended per stack. The
 * structural assertions accept EITHER shape; the load-bearing checks are behavioural diffs, so
 * a faithful model does not go RED merely for choosing the other legal encoding.
 *
 * HONEST CAVEAT: S2a's removal diff assumes the 20-stack cap is not already saturated by S1c
 * alone in this fixture. If it is, that diff reads zero — that is itself a finding about the
 * stack economy, not a harness bug.
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

const SLUG = 'mihara-bonding-chain';
const SLOTS: string[] = ['skill1', 'skill2', 'burst'];

type AnyOv = Record<string, any>;

// A no-op patch returns a deep clone of the COMMITTED override — read-only inspection handle.
const OV = withPatchedOverride(SLUG, () => {}) as unknown as AnyOv;

function blocksOf(ov: AnyOv): { slot: string; block: any }[] {
  return SLOTS.flatMap((s) =>
    ((ov[s] ?? []) as any[]).map((block) => ({ slot: s, block }))
  );
}

function effectsOf(ov: AnyOv): { slot: string; block: any; effect: any }[] {
  return blocksOf(ov).flatMap(({ slot, block }) =>
    ((block.effects ?? []) as any[]).map((effect) => ({ slot, block, effect }))
  );
}

// magnitude of an effect regardless of encoding: perResource-scaled, flat atkPct, or buff value
function magOf(e: any): number {
  if (e?.perResource?.mult != null) {return e.perResource.mult;}
  if (e?.atkPct != null) {return e.atkPct;}
  if (e?.value != null) {return e.value;}
  return 0;
}

function near(a: number, b: number, tol = 0.3): boolean {
  return Math.abs(a - b) <= tol;
}

// 50.05 (burst DoT) and 50.06 (skill1 rider) are separated by KIND, not by magnitude.
const isEnsnaring = (e: any) => e?.kind === 'dot' && near(magOf(e), 25.08);
const isDragging = (e: any) => e?.kind === 'dot' && near(magOf(e), 50.05);
const isVolley = (e: any) => e?.kind === 'flatDamage' && near(magOf(e), 50.06);
const isSustBuff = (e: any) => e?.kind === 'buff' && near(magOf(e), 59.98, 1);

function stripEffects(ov: AnyOv, pred: (e: any) => boolean): void {
  for (const s of SLOTS) {
    const blocks = (ov[s] ?? []) as any[];
    for (const b of blocks)
      {b.effects = ((b.effects ?? []) as any[]).filter((e) => !pred(e));}
    ov[s] = blocks.filter((b) => ((b.effects ?? []) as any[]).length > 0);
  }
}

function stripBlocks(ov: AnyOv, pred: (b: any) => boolean): void {
  for (const s of SLOTS)
    {ov[s] = ((ov[s] ?? []) as any[]).filter((b) => !pred(b));}
}

function run(mutate?: (ov: AnyOv) => void) {
  const events: any[] = [];
  const opts: any = controlComp(SLUG, true);
  if (mutate) {
    opts.overrides = {
      ...(opts.overrides ?? {}),
      [SLUG]: withPatchedOverride(SLUG, mutate as any),
    };
  }
  opts.cfg = {
    ...(opts.cfg ?? {}),
    onEvent: (ev: SimEvent) => events.push(ev),
  };
  const res = runComp(opts);
  return { res, events: events as any[], t: totals(res) };
}

// ---- hoisted runs (11 full 180s sims) ----
const base = run();
const noEns = run((ov) => stripEffects(ov, isEnsnaring));
const noDrag = run((ov) => stripEffects(ov, isDragging));
const noVolley = run((ov) => stripEffects(ov, isVolley));
const noRefill = run((ov) =>
  stripBlocks(ov, (b) => b?.trigger?.kind === 'fullBurstEnd')
);
const noRider = run((ov) =>
  stripBlocks(ov, (b) => b?.trigger?.kind === 'hitCount')
);
const riderUngated = run((ov) => {
  for (const { block } of blocksOf(ov)) {
    if (block?.trigger?.kind === 'hitCount') {delete block.fbGate;}
  }
});
const noSust = run((ov) => stripEffects(ov, isSustBuff));
const sustAsGeneric = run((ov) => {
  for (const { effect } of effectsOf(ov))
    {if (isSustBuff(effect)) {effect.stat = 'attackDamagePct';}}
});
const starved = run((ov) => {
  ov.skill1 = [];
  ov.skill2 = [];
});
const starvedNoDrag = run((ov) => {
  ov.skill1 = [];
  ov.skill2 = [];
  stripEffects(ov, isDragging);
});

const mates = Object.keys(base.t).filter((s) => s !== SLUG);
function expectMatesIdentical(other: { t: Record<string, number> }): void {
  for (const s of mates) {expect(other.t[s]).toBe(base.t[s]);}
}

const fbStarts = base.events.filter((e) => e.kind === 'fullBurstStart').length;

describe('mihara-bonding-chain — fixture non-vacuity', () => {
  it('the control comp actually full-bursts and the carry deals damage', () => {
    // A lone Burst III makes ZERO full bursts; B1+B2 must be present for any FB-keyed line
    // (S1b, S2a, S2d, burst) to be exercised at all.
    expect(mates.length).toBeGreaterThanOrEqual(2);
    expect(fbStarts).toBeGreaterThan(0);
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
    expect(base.t[SLUG]).toBeGreaterThan(0);
  });
});

describe('skill1 — Restraint Chains pool (S1a / S1b)', () => {
  it('opens the fight at 10 chains, capped at 10', () => {
    // Encoding-tolerant: a declared resource (initial 10 / max 10), a battle-start block that
    // adds +10 to a pool, or a literal 10-attack volley all satisfy the kit line. RED under a
    // model with no starting pool at all (chains would only exist after the first FB end).
    const pools = (OV.resources ?? []) as any[];
    const asResource = pools.some((r) => r?.initial === 10 && r?.max === 10);
    const asStartDelta = blocksOf(OV).some(
      ({ block }) =>
        (block?.trigger?.kind === 'passive' ||
          block?.trigger?.kind === 'interval') &&
        ((block.effects ?? []) as any[]).some(
          (e) => e?.kind === 'resource' && e?.delta === 10
        )
    );
    const asTenAttacks = blocksOf(OV).some(
      ({ block }) =>
        ((block.effects ?? []) as any[]).filter(isVolley).length >= 10
    );
    expect(asResource || asStartDelta || asTenAttacks).toBe(true);
  });

  it('refills on Full Burst END and is gated to rotations this unit bursted', () => {
    // Trigger identity: the kit says 'when Full Burst ends IF this unit has just used her Burst
    // Skill'. Nearest-wrong = a plain fullBurstEnd (or fullBurstEnter), which over-credits in
    // this two-Burst-III fixture whenever the OTHER B3 completes the chain.
    const fbEnd = blocksOf(OV).filter(
      ({ block }) => block?.trigger?.kind === 'fullBurstEnd'
    );
    expect(fbEnd.length).toBeGreaterThan(0);
    for (const { block } of fbEnd) {
      const refills = ((block.effects ?? []) as any[]).some(
        (e) => e?.kind === 'resource' && (e?.delta ?? 0) > 0
      );
      if (refills) {expect(block.ownBurstGate).toBe('cast');}
    }
  });

  it('the refill is load-bearing (chains run dry without it) and moves no teammate', () => {
    // Without the FB-end refill the volley can only spend the opening 10 chains for the whole
    // 180s fight, so total damage MUST fall. RED under a model where the volley is a fixed
    // cadence that ignores the chain pool entirely (removal would be inert).
    expect(base.t[SLUG]).toBeGreaterThan(noRefill.t[SLUG]);
    expectMatesIdentical(noRefill);
  });
});

describe('skill1 — the chain volley, 50.06% per chain (S1c)', () => {
  it('exists, fires in the fixture, and is NOT a core strike', () => {
    // The kit text never says 'core strike damage', so per the rider convention this hit takes
    // no core bucket. RED under a core:true rider (core is a x2 weapon-multiplier class of
    // over-credit on an MG carry).
    const volleys = effectsOf(OV).filter(({ effect }) => isVolley(effect));
    expect(volleys.length).toBeGreaterThan(0);
    for (const { effect } of volleys) {expect(effect.core === true).toBe(false);}
    expect(base.t[SLUG]).toBeGreaterThan(noVolley.t[SLUG]);
    expectMatesIdentical(noVolley);
  });

  it('carries a repeating cadence trigger (the exact period is a FLAG, not asserted)', () => {
    // 'Affects random enemy units at a specific timing' gives NO cadence — an ALWAYS-FLAG field.
    // We therefore pin only that the block repeats (so the pool is consumed and rebuilt), never a
    // specific seconds value. RED under a one-shot passive that fires once at t=0.
    const ok = [
      'interval',
      'hitCount',
      'shotFired',
      'lastBullet',
      'fullBurstEnter',
      'fullBurstEnd',
      'burstCast',
      'stageEnter',
      'passive',
    ];
    const carriers = effectsOf(OV).filter(({ effect }) => isVolley(effect));
    for (const { block } of carriers)
      {expect(ok).toContain(block?.trigger?.kind);}
    const repeats = carriers.some(
      ({ block }) =>
        block?.trigger?.kind !== 'passive' || (block.effects ?? []).length >= 10
    );
    expect(repeats).toBe(true);
  });
});

describe('skill1 — Ensnaring Chains, 25.08% sustained / 1 sec (S1d)', () => {
  it('is a 1-sec sustained DoT, continuous rather than a stock 10s window, never core', () => {
    // Duration semantics: 'every 1 sec continuously' + 'cannot be removed' — the nearest-wrong is
    // a 10s DoT (the reflex window length), which would leave the boss un-ensnared for most of
    // the fight. A perResource-scaled instance is exempt from the duration floor because its
    // lifetime is driven by the pool, not by durationSec.
    const dots = effectsOf(OV)
      .filter(({ effect }) => isEnsnaring(effect))
      .map(({ effect }) => effect);
    expect(dots.length).toBeGreaterThan(0);
    for (const d of dots) {
      expect(d.intervalSec ?? 1).toBe(1);
      expect(d.flavor).toBe('sustained');
      expect(d.core === true).toBe(false);
      expect(!!d.perResource || (d.durationSec ?? 0) >= 20).toBe(true);
    }
  });

  it('is load-bearing and touches no teammate', () => {
    expect(base.t[SLUG]).toBeGreaterThan(noEns.t[SLUG]);
    expectMatesIdentical(noEns);
  });

  it('caps at 20 stacks somewhere in the model', () => {
    // 'stacks up to 20 time(s)'. The engine appends an independent DoT instance per fire and never
    // dedups, so an uncapped model grows without bound over 180s. Accepts either a resource max
    // of 20 or a maxStacks:20 on the DoT/its stack buff.
    const pools = (OV.resources ?? []) as any[];
    const capResource = pools.some((r) => r?.max === 20);
    const capStacks = effectsOf(OV).some(
      ({ effect }) => effect?.maxStacks === 20
    );
    expect(capResource || capStacks).toBe(true);
  });
});

describe('skill2 — riders and the Stage-3 sustained buff', () => {
  it('the 40-normal-attack rider is threshold-40 AND gated to Full Burst', () => {
    // Trigger identity: '40 normal attacks DURING Full Burst'. Nearest-wrong = an ungated
    // hitCount:40, which on a 300-round MG fires continuously for the whole 180s and floods the
    // stack pool. Structural gate + a directional behavioural check (ungated can only add stacks).
    const riders = blocksOf(OV).filter(
      ({ block }) => block?.trigger?.kind === 'hitCount'
    );
    expect(riders.length).toBeGreaterThan(0);
    for (const { block } of riders) {
      expect(block.trigger.count === 40 || block.trigger.countInFb === 40).toBe(
        true
      );
      expect(block.fbGate).toBe('inFb');
    }
    expect(riderUngated.t[SLUG]).toBeGreaterThanOrEqual(base.t[SLUG]);
  });

  it('the 40-normal-attack rider actually adds stacks in this fixture', () => {
    // Non-vacuity: proves the in-FB threshold is reached and the +1 stack reaches a DoT.
    expect(base.t[SLUG]).toBeGreaterThan(noRider.t[SLUG]);
  });

  it.skip('incapacitated -> Ensnaring +20 stacks — GAP: v1 has no HP pool or death event', () => {});

  it.skip('enemy neutralized -> Restraint Chain +1 — GAP: the raid boss is never neutralized', () => {});

  it('Burst Stage 3 entry grants SCOPED Sustained Damage +59.98% for 10s to self', () => {
    // Scope: 'Sustained Damage' is sustainedDamagePct, NOT generic attackDamagePct — a generic
    // encoding would also lift every MG normal attack. Trigger identity: 'when ENTERING Burst
    // Stage 3' fires on any stage-3 cast (stageEnter), not only on this unit's own cast.
    const buffs = effectsOf(OV).filter(({ effect }) => isSustBuff(effect));
    expect(buffs.length).toBeGreaterThan(0);
    for (const { block, effect } of buffs) {
      expect(effect.stat).toBe('sustainedDamagePct');
      expect(effect.durationSec).toBe(10);
      expect(block?.target?.kind).toBe('self');
      expect(block?.trigger?.kind).toBe('stageEnter');
      expect(block?.trigger?.stage).toBe(3);
    }

    const applies = base.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.stat === 'sustainedDamagePct' &&
        near(e.value, 59.98, 1)
    );
    expect(applies.length).toBeGreaterThanOrEqual(fbStarts);
    for (const a of applies) {
      expect(a.casterIdx).toBe(a.targetIdx); // self-only
      expect(a.expiresFrame).toBeGreaterThan(0); // a real 10s window, not permanent
    }
  });

  it('the Stage-3 buff is load-bearing, self-scoped, and narrower than a generic damage buff', () => {
    expect(base.t[SLUG]).toBeGreaterThan(noSust.t[SLUG]);
    expectMatesIdentical(noSust);
    // Re-scoping the same 59.98 to attackDamagePct must RAISE total (it would newly lift normal
    // attacks) — that gap is exactly the over-credit the scoped stat prevents.
    expect(sustAsGeneric.t[SLUG]).toBeGreaterThan(base.t[SLUG]);
  });
});

describe('burst — Dragging Chain, 50.05% sustained / 1 sec for 10s', () => {
  it('exists on the burst slot as a 10s 1-sec sustained DoT, never core', () => {
    const dots = effectsOf(OV).filter(
      ({ slot, effect }) => slot === 'burst' && isDragging(effect)
    );
    expect(dots.length).toBeGreaterThan(0);
    for (const { block, effect } of dots) {
      expect(effect.durationSec).toBe(10);
      expect(effect.intervalSec ?? 1).toBe(1);
      expect(effect.flavor).toBe('sustained');
      expect(effect.core === true).toBe(false);
      expect(block?.trigger?.kind).toBe('burstCast');
    }
    expect(base.t[SLUG]).toBeGreaterThan(noDrag.t[SLUG]);
  });

  it('MIRRORS the Ensnaring stack count instead of being a flat DoT', () => {
    // 'Mirrors the stack count of Ensnaring Chains on each target'. Isolate the burst DoT's own
    // contribution twice: once in the live fixture, once in a STARVED world where skill1+skill2
    // are emptied so no Ensnaring stack can ever exist. A stack-mirroring model contributes ~0
    // when starved; the nearest-wrong flat DoT contributes the SAME in both worlds -> RED.
    const draggingFull = base.t[SLUG] - noDrag.t[SLUG];
    const draggingStarved = starved.t[SLUG] - starvedNoDrag.t[SLUG];
    expect(draggingFull).toBeGreaterThan(0);
    expect(draggingStarved).toBeLessThan(0.25 * draggingFull);
  });

  it('cancels Ensnaring Chains after it triggers', () => {
    // 'Cancels Ensnaring Chains after the effect is triggered' — so stacks cannot accumulate
    // monotonically across the fight. Accepts either encoding: a negative resource delta on a
    // burst block (pool reset), or Ensnaring DoT lifetimes bounded to roughly one burst cycle
    // (cd 40s). RED under permanent, never-reset stacked DoT instances.
    const burstReset = ((OV.burst ?? []) as any[]).some((b) =>
      ((b.effects ?? []) as any[]).some(
        (e) => e?.kind === 'resource' && (e?.delta ?? 0) < 0
      )
    );
    const ensDots = effectsOf(OV)
      .filter(({ effect }) => isEnsnaring(effect))
      .map(({ effect }) => effect);
    const bounded =
      ensDots.length > 0 && ensDots.every((d) => (d.durationSec ?? 0) <= 60);
    expect(burstReset || bounded).toBe(true);
  });
});
