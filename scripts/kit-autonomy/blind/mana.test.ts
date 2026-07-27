/**
 * mana — BLIND kit-spec test (S5 post-op). Written from the kit prose ALONE: no sight of the
 * driver's tests, the shipped override's reasoning, or any truth file.
 *
 * KIT (Mana, `mana` — AR/Wind/Attacker/Burst III, cd 40s, ammo 60, hitsPerShot 1):
 *  S1a start-of-battle, self: "Metal γ: ATK ▲58.08% continuously" (once per battle)
 *      -> passive self atkPct 58.08, NO duration. Metal γ is removed only when an ally goes out
 *         of action, which cannot happen in v1 (immortal squad) => whole-fight by construction.
 *  S1b in Metal γ, every 10 landed normal attacks, ALL ALLIES: recover 2.04% of caster max HP
 *      -> trigger hitCount{count:10} (ROUNDS, not seconds), target allies, `heal` effect. NOT
 *         inert: heals fire teammates' `recovery` triggers (tandem/cross-unit rule).
 *  S1c "resurrect 1 incapacitated ally (highest final ATK) with 96% HP" -> GAP.
 *  S1d "ally out of action -> Removes Metal γ" -> GAP (unreachable in v1).
 *  S2a start-of-battle, self: "Metal σ: Burst Gauge filling speed ▲70.4% continuously"
 *      -> self burstGenPct 70.4 (a rotation-moving stat, not cosmetic).
 *  S2b entering Full Burst IN METAL σ, self: Attack Damage ▲21.12% 10s + ATK ▲63.36% 10s, then
 *      "Removes Metal σ" -> fullBurstEnter, self, two TIMED buffs, plus a CONSUME of σ.
 *  S2c entering Full Burst, 1 ally with the longest basic Charge Time: Charge Time ▼0.18 sec
 *      -> GAP: no TargetDef ranks allies by charge time, and there is no flat
 *         charge-time-in-seconds primitive (chargeSpeedPct is a percentage).
 *  S2d "if the skill user has cast Burst Skill before Full Burst ends" -> re-grants Metal σ
 *      -> a REGAIN keyed to her OWN burst. S2a+S2b+S2d form a consume/regain cycle, expressible
 *         with `resources` + `resourceGate` (+ a resource delta), or approximated by ownBurstGate.
 *  Burst-a self: "Sustained Damage ▲52.8% for 10 sec" -> burstCast, self, sustainedDamagePct.
 *  Burst-b enemy: "396% of final ATK as sustained damage every 1 sec for 10 sec"
 *      -> exactly ONE dot instance per cast {atkPct:396, durationSec:10, intervalSec:1,
 *         flavor:'sustained'} — the engine never dedups DoT instances, so a longer duration on a
 *         repeating trigger would MULTIPLY.
 *
 * FIXTURE: controlComp('mana', true) = liter B1 / crown B2 / mana B3 / helm B3. Mana is Burst III;
 * a lone B3 casts ZERO bursts, so B1+B2 are mandatory for any Full Burst at all. A second fixture,
 * controlComp('mana', false), drops helm for the heal-tandem probe — helm is itself a healer and
 * would saturate crown's on-recovery consumer, masking mana's own heal.
 *
 * ASSERTION STYLE: behavioural counterfactuals (withPatchedOverride vs the nearest-wrong model)
 * wherever the line moves damage; structural assertions on the cloned override only where the
 * mechanic is unobservable in the event log (trigger identity, target set, DoT shape, σ machinery).
 *
 * CAVEAT (honest): authored without tool access — this file has NOT been executed. Assertions are
 * relational (strict inequalities, counterfactual deltas, structural shape) rather than pinned
 * magnitudes, precisely because they could not be run. Shape helpers below tolerate BOTH documented
 * override layouts (slot -> Block[] and slot -> {blocks: Block[]}) and both event-sink wirings.
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

const SLUG = 'mana';
const SLOTS = ['skill1', 'skill2', 'burst'] as const;

/* ---------- override-shape helpers (layout-tolerant) ---------- */

function blocksOf(ov: any, slot: string): any[] {
  const s = ov?.[slot];
  if (!s) {return [];}
  if (Array.isArray(s)) {return s;}
  return Array.isArray(s.blocks) ? s.blocks : [];
}
function allBlocks(ov: any): any[] {
  return SLOTS.flatMap((s) => blocksOf(ov, s));
}
function effectsOf(b: any): any[] {
  return Array.isArray(b?.effects) ? b.effects : [];
}
function near(v: any, target: number, tol = 0.06): boolean {
  return typeof v === 'number' && Math.abs(v - target) <= tol;
}
function dropEffects(ov: any, pred: (e: any, b: any) => boolean): number {
  let n = 0;
  for (const b of allBlocks(ov)) {
    const arr = effectsOf(b);
    for (let i = arr.length - 1; i >= 0; i -= 1) {
      if (pred(arr[i], b)) {
        arr.splice(i, 1);
        n += 1;
      }
    }
  }
  return n;
}
function editEffects(
  ov: any,
  pred: (e: any, b: any) => boolean,
  edit: (e: any, b: any) => void
): number {
  let n = 0;
  for (const b of allBlocks(ov)) {
    for (const e of effectsOf(b)) {
      if (pred(e, b)) {
        edit(e, b);
        n += 1;
      }
    }
  }
  return n;
}

/* ---------- kit-line predicates (magnitudes straight from the prose) ---------- */

const isS1Atk = (e: any) =>
  e?.kind === 'buff' && e.stat === 'atkPct' && near(e.value, 58.08);
const isFbAtk = (e: any) =>
  e?.kind === 'buff' && e.stat === 'atkPct' && near(e.value, 63.36);
const isFbAd = (e: any) =>
  e?.kind === 'buff' && e.stat === 'attackDamagePct' && near(e.value, 21.12);
const isGauge = (e: any) => e?.kind === 'buff' && e.stat === 'burstGenPct';
const isHeal = (e: any) => e?.kind === 'heal';
const isDot = (e: any) => e?.kind === 'dot' && near(e.atkPct, 396, 1);
const isSust = (e: any) =>
  e?.kind === 'buff' && e.stat === 'sustainedDamagePct' && near(e.value, 52.8);

/* ---------- run helper (hoisted; each run is a full 180s sim) ---------- */

type Run = { res: any; events: SimEvent[]; tot: Record<string, number> };

function run(opts: any): Run {
  const events: SimEvent[] = [];
  const seen = new Set<SimEvent>();
  const sink = (ev: SimEvent) => {
    if (seen.has(ev)) {return;} // belt: same object never counted twice if both sinks are honoured
    seen.add(ev);
    events.push(ev);
  };
  const wired = {
    ...opts,
    onEvent: sink,
    cfg: { ...(opts?.cfg ?? {}), onEvent: sink },
  } as any;
  const res = runComp(wired);
  return { res, events, tot: totals(res) };
}

const buffApplies = (evs: SimEvent[]) =>
  evs.filter((e: any) => e.kind === 'buffApply') as any[];
const countKind = (evs: SimEvent[], kind: string) =>
  evs.filter((e: any) => e.kind === kind).length;
const dmg = (r: Run) => r.tot[SLUG];

/* ---------- counterfactual builders ---------- */

const removed: Record<string, number> = {};
function patched(key: string, mutate: (ov: any) => number) {
  return withPatchedOverride(SLUG, (ov: any) => {
    removed[key] = mutate(ov);
  });
}
function compWith(ov: any, helm = true) {
  const c: any = controlComp(SLUG, helm);
  return { ...c, overrides: { ...(c.overrides ?? {}), [SLUG]: ov } };
}

/* ---------- hoisted runs (11 total) ---------- */

const shipped: any = withPatchedOverride(SLUG, () => {}); // untouched clone, for structural reads

const base = run(controlComp(SLUG, true));
const baseTot = base.tot;
const mates = Object.keys(baseTot).filter((s) => s !== SLUG);

const rNoS1Atk = run(
  compWith(patched('s1Atk', (ov) => dropEffects(ov, isS1Atk)))
);
const rS1AtkTimed = run(
  compWith(
    patched('s1AtkTimed', (ov) =>
      editEffects(ov, isS1Atk, (e) => {
        e.durationSec = 10;
      })
    )
  )
);
const rS1AtkAllies = run(
  compWith(
    patched('s1AtkAllies', (ov) =>
      editEffects(ov, isS1Atk, (_e, b) => {
        b.target = { kind: 'allies' };
      })
    )
  )
);
const rNoFbBuffs = run(
  compWith(
    patched('fbBuffs', (ov) => dropEffects(ov, (e) => isFbAtk(e) || isFbAd(e)))
  )
);
const rFbPermanent = run(
  compWith(
    patched('fbPerm', (ov) =>
      editEffects(
        ov,
        (e) => isFbAtk(e) || isFbAd(e),
        (e) => {
          delete e.durationSec;
        }
      )
    )
  )
);
const rNoGauge = run(
  compWith(patched('gauge', (ov) => dropEffects(ov, isGauge)))
);
const rNoDot = run(compWith(patched('dot', (ov) => dropEffects(ov, isDot))));
const rNoSust = run(compWith(patched('sust', (ov) => dropEffects(ov, isSust))));

const baseNoHelm = run(controlComp(SLUG, false));
const rNoHealNoHelm = run(
  compWith(
    patched('heal', (ov) => dropEffects(ov, isHeal)),
    false
  )
);

const sum = (t: Record<string, number>) =>
  Object.values(t).reduce((a, b) => a + b, 0);

/* ---------- fixture sanity (non-vacuity) ---------- */

describe('mana — fixture', () => {
  it('is non-vacuous: mana deals damage, bursts, and the team enters Full Burst repeatedly', () => {
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
    expect(countKind(base.events, 'fullBurstStart')).toBeGreaterThanOrEqual(2);
    expect(countKind(base.events, 'burstCast')).toBeGreaterThanOrEqual(2);
    expect(mates.length).toBeGreaterThanOrEqual(2);
    // the no-helm fixture must still burst, else the heal-tandem probe tests nothing
    expect(
      countKind(baseNoHelm.events, 'fullBurstStart')
    ).toBeGreaterThanOrEqual(1);
  });
});

/* ---------- skill1 — Metal γ ---------- */

describe('mana — skill1 (Metal γ)', () => {
  it('S1a: grants ATK ▲58.08% to SELF and it is load-bearing', () => {
    const applied = buffApplies(base.events).filter(
      (e) => e.stat === 'atkPct' && near(e.value, 58.08)
    );
    expect(applied.length).toBeGreaterThanOrEqual(1);
    expect(applied.every((e) => e.targetSlug === SLUG)).toBe(true);
    // nearest-wrong: the "Metal γ" line read as a status label with no stat payload
    expect(removed.s1Atk).toBeGreaterThan(0);
    expect(dmg(rNoS1Atk)).toBeLessThan(dmg(base));
  });

  it('S1a is CONTINUOUS, not a timed window (nearest-wrong: durationSec 10)', () => {
    expect(removed.s1AtkTimed).toBeGreaterThan(0);
    // if the shipped buff were already time-bounded this delta would vanish
    expect(dmg(rS1AtkTimed)).toBeLessThan(dmg(base));
  });

  it('S1a is SELF-scoped — teammates unmoved (nearest-wrong: "Affects self" widened to allies)', () => {
    expect(removed.s1AtkAllies).toBeGreaterThan(0);
    expect(mates.some((s) => rS1AtkAllies.tot[s] > baseTot[s] * 1.001)).toBe(
      true
    );
  });

  it('S1b: the heal is modeled, fires every 10 ROUNDS, and targets ALL allies', () => {
    const healBlocks = allBlocks(shipped).filter((b) =>
      effectsOf(b).some(isHeal)
    );
    expect(healBlocks.length).toBeGreaterThanOrEqual(1);
    const hb = healBlocks[0];
    // trigger identity: "after landing 10 normal attacks" is a hit count, NOT a 10-second interval
    expect(hb.trigger?.kind).toBe('hitCount');
    expect(hb.trigger?.count).toBe(10);
    // target set: "Affects all allies" includes the caster
    expect(hb.target?.kind).toBe('allies');
    expect(hb.target?.excludeSelf).toBeFalsy();
  });

  it('S1b tandem: removing the heal moves the TEAM (on-recovery consumers) — helm-free fixture', () => {
    // nearest-wrong: heal skipped as "defensive, no damage" -> team totals byte-identical
    expect(removed.heal).toBeGreaterThan(0);
    expect(sum(rNoHealNoHelm.tot)).not.toBe(sum(baseNoHelm.tot));
  });

  it.skip('S1c resurrect 1 incapacitated ally with 96% HP — GAP: v1 has no HP pool and no incapacitation', () => {});

  it.skip('S1d "ally out of action -> Removes Metal γ" — GAP: unreachable (immortal squad), so Metal γ is whole-fight by construction', () => {});
});

/* ---------- skill2 — Metal σ ---------- */

describe('mana — skill2 (Metal σ)', () => {
  it('S2a: a self Burst-Gauge-fill ▲70.4% source exists and drives the rotation', () => {
    const gauge = allBlocks(shipped).flatMap(effectsOf).filter(isGauge);
    expect(gauge.length).toBeGreaterThanOrEqual(1);
    // accepts either a plain 70.4 buff or a σ-pool-scaled perResource encoding
    expect(
      gauge.some(
        (e: any) => near(e.value, 70.4) || near(e.perResource?.mult, 70.4)
      )
    ).toBe(true);
    expect(removed.gauge).toBeGreaterThan(0);
    // gauge speed can only ever ADD full bursts, never remove them
    expect(countKind(base.events, 'fullBurstStart')).toBeGreaterThanOrEqual(
      countKind(rNoGauge.events, 'fullBurstStart')
    );
  });

  it('S2b: entering Full Burst grants SELF Attack Damage ▲21.12% + ATK ▲63.36%, paired, ≤ once per FB', () => {
    const ad = buffApplies(base.events).filter(
      (e) => e.stat === 'attackDamagePct' && near(e.value, 21.12)
    );
    const at = buffApplies(base.events).filter(
      (e) => e.stat === 'atkPct' && near(e.value, 63.36)
    );
    expect(ad.length).toBeGreaterThanOrEqual(1);
    expect(at.length).toBe(ad.length); // same block -> identical firing count
    expect(ad.every((e) => e.targetSlug === SLUG)).toBe(true);
    expect(at.every((e) => e.targetSlug === SLUG)).toBe(true);
    expect(ad.length).toBeLessThanOrEqual(
      countKind(base.events, 'fullBurstStart')
    );
    expect(removed.fbBuffs).toBeGreaterThanOrEqual(2);
    expect(dmg(rNoFbBuffs)).toBeLessThan(dmg(base));
  });

  it('S2b window is 10 sec, not permanent (nearest-wrong: durationSec omitted)', () => {
    expect(removed.fbPerm).toBeGreaterThanOrEqual(2);
    expect(dmg(rFbPermanent)).toBeGreaterThan(dmg(base));
  });

  it('S2b/S2d: Metal σ is CONSUMED at FB entry and re-granted only via her own burst', () => {
    const fbBlock = allBlocks(shipped).find((b) => effectsOf(b).some(isFbAtk));
    expect(fbBlock).toBeDefined();
    // trigger identity: "when entering Full Burst", not "when using Burst Skill"
    expect(fbBlock.trigger?.kind).toBe('fullBurstEnter');
    // the σ cycle needs consume/regain machinery: a resource pool + gate, or an own-burst gate.
    // A bare, ungated fullBurstEnter block fires the buffs on EVERY team full burst and
    // over-credits every rotation mana did not burst in — the nearest-wrong model.
    const consumeRegain =
      Boolean(fbBlock.resourceGate) ||
      Boolean(fbBlock.ownBurstGate) ||
      (Array.isArray(shipped.resources) && shipped.resources.length > 0) ||
      allBlocks(shipped).some((b) =>
        effectsOf(b).some((e: any) => e?.kind === 'resource')
      );
    expect(consumeRegain).toBe(true);
  });

  it.skip('S2c Charge Time ▼0.18 sec to the 1 ally with the longest basic Charge Time — GAP: no TargetDef ranks allies by charge time, and no flat charge-time-seconds primitive exists (chargeSpeedPct is a percentage)', () => {});
});

/* ---------- burst ---------- */

describe('mana — burst', () => {
  it('burst-a: self Sustained Damage ▲52.8% for 10 sec, on her OWN burst cast', () => {
    const applied = buffApplies(base.events).filter(
      (e) => e.stat === 'sustainedDamagePct' && near(e.value, 52.8)
    );
    expect(applied.length).toBeGreaterThanOrEqual(1);
    expect(applied.every((e) => e.targetSlug === SLUG)).toBe(true);
    const blk = allBlocks(shipped).find((b) => effectsOf(b).some(isSust));
    expect(blk).toBeDefined();
    // trigger identity: a self buff in her OWN burst slot is burstCast, never fullBurstEnter
    expect(blk.trigger?.kind).toBe('burstCast');
    expect(blk.target?.kind).toBe('self');
    expect(effectsOf(blk).find(isSust).durationSec).toBe(10);
  });

  it('burst-b: exactly ONE sustained DoT instance per cast — 396% of final ATK every 1s for 10s', () => {
    const dots = allBlocks(shipped).flatMap(effectsOf).filter(isDot);
    // one instance, not one appended per tick/fire (the engine never dedups DoT instances)
    expect(dots.length).toBe(1);
    const d: any = dots[0];
    expect(d.durationSec).toBe(10);
    expect(d.intervalSec ?? 1).toBe(1);
    expect(d.flavor).toBe('sustained');
    const blk = allBlocks(shipped).find((b) => effectsOf(b).some(isDot));
    expect(blk.trigger?.kind).toBe('burstCast');
    expect(removed.dot).toBeGreaterThan(0);
    expect(dmg(rNoDot)).toBeLessThan(dmg(base));
  });

  it('burst-b is sustained-FLAVORED: her own 52.8% Sustained buff feeds it', () => {
    // nearest-wrong: DoT authored with no flavor -> the 52.8% buff would be inert and this
    // counterfactual would leave her total unchanged
    expect(removed.sust).toBeGreaterThan(0);
    expect(dmg(rNoSust)).toBeLessThan(dmg(base));
  });

  it('burst damage is self-only: teammates byte-identical with the DoT removed', () => {
    for (const s of mates) {expect(rNoDot.tot[s]).toBe(baseTot[s]);}
  });
});
