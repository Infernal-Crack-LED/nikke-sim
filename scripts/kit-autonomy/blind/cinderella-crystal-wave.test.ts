/**
 * cinderella-crystal-wave — Cinderella: Crystal Wave
 * MG / Iron / Attacker / Burst III, cd 40s, ammo 300, reloadFrames 171 (=2.85s),
 * hitsPerShot 1, normalAttackMultiplier 5.57, coreAttackMultiplier 200.
 *
 * BLIND kit-spec test: written from the kit prose ALONE (no sight of the driver's
 * override, tests or reasoning). One assertion group per kit line.
 *
 * FIXTURE — controlComp(SLUG, true): liter (B1) / crown (B2) / cinderella-crystal-wave (B3)
 * / helm (B3), Fire boss, focus = carry, 180s, deterministic (no seed).
 * helm is kept ON *deliberately*: she is a SECOND Burst III, so some Full Bursts are
 * completed by HER burst rather than CCW's. That is the ONLY way to discriminate the
 * skill2 rider's literal activation text — "when entering Full Burst AFTER THIS UNIT
 * uses her Burst Skill" (ownBurstGate:'cast') — from the nearest-wrong plain
 * fullBurstEnter model, which over-credits every team Full Burst.
 *
 * ATTRIBUTION NOTE. `damage` events are not documented to carry a unit slug, so every
 * cadence/existence claim about a CCW damage line is measured as a COUNT DELTA against a
 * counterfactual run in which ONLY that effect is spliced out. The sim is deterministic and
 * a pure damage removal perturbs nobody else — each such test additionally asserts teammate
 * totals are byte-identical, which validates that premise in-line rather than assuming it.
 *
 * WHOLE-PICTURE FLAGS raised while reading the kit (see the it.skip blocks):
 *   • S1 Snipe Mode sets Max Ammunition to 15 rounds, yet "Additional Effect 2" expends 40
 *     rounds per Full Charge. 40 >= 15, so read literally EVERY full charge empties the
 *     Snipe magazine and forces a reload. Kit-internal contradiction ⚑.
 *   • S1 "Preparation for Change" fixes reload at 3 sec; base reloadFrames 171 = 2.85 sec,
 *     so the "fix" is a slight SLOWDOWN, not a buff. It is also a stat CLAMP — no primitive.
 *   • The Snipe Mode swap has NO time bound in the kit (removal is a CONDITION: reloading to
 *     max ammunition while in Preparation for Change), but weaponSwap.durationSec is
 *     required — so the swap's duty cycle is a ⚑ estimate, not a derivable value.
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

const SLUG = 'cinderella-crystal-wave';
const SLOTS = ['skill1', 'skill2', 'burst'] as const;

type Ev = Record<string, any>;

// ---------------------------------------------------------------- harness glue

function run(patched?: unknown) {
  const evs: Ev[] = [];
  const opts = controlComp(SLUG, true) as Record<string, any>;
  opts.cfg = {
    ...(opts.cfg ?? {}),
    onEvent: (ev: SimEvent) => evs.push(ev as unknown as Ev),
  };
  if (patched) {
    opts.overrides = { ...(opts.overrides ?? {}), [SLUG]: patched };
  }
  const res = runComp(opts as any);
  return {
    evs,
    tot: totals(res) as Record<string, number>,
    self: (unitOf(res, SLUG) as any).totalDamage as number,
  };
}

/** Read-only view of the committed override (a clone; disk untouched). */
function readOverride(): any {
  return withPatchedOverride(SLUG, () => {}) as any;
}

function findEffects(ov: any, pred: (e: any, b: any) => boolean) {
  const out: { e: any; b: any }[] = [];
  for (const slot of SLOTS) {
    for (const b of ov?.[slot] ?? []) {
      for (const e of b?.effects ?? []) {
        if (pred(e, b)) {
          out.push({ e, b });
        }
      }
    }
  }
  return out;
}

/** Splice matching EFFECTS out of their blocks (surgical — leaves sibling effects alive). */
function dropEffects(ov: any, pred: (e: any, b: any) => boolean): number {
  let n = 0;
  for (const slot of SLOTS) {
    for (const b of ov?.[slot] ?? []) {
      if (!Array.isArray(b?.effects)) {
        continue;
      }
      for (let i = b.effects.length - 1; i >= 0; i--) {
        if (pred(b.effects[i], b)) {
          b.effects.splice(i, 1);
          n++;
        }
      }
    }
  }
  return n;
}

function setBuff(ov: any, stat: string, from: number, to: number): number {
  let n = 0;
  for (const { e } of findEffects(
    ov,
    (e) =>
      e.kind === 'buff' && e.stat === stat && Math.abs(e.value - from) < 1e-6
  )) {
    e.value = to;
    n++;
  }
  return n;
}

// ------------------------------------------------------------ event selectors

const damages = (evs: Ev[]) => evs.filter((e) => e.kind === 'damage');
const slotDamages = (evs: Ev[], slot: string) =>
  damages(evs).filter((e) => e.srcSlot === slot);
const fullBursts = (evs: Ev[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart').length;
const buffs = (evs: Ev[], stat: string, value?: number) =>
  evs.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.stat === stat &&
      (value === undefined || Math.abs(e.value - value) < 1e-6)
  );
const onSelf = (list: Ev[]) => list.filter((e) => e.targetSlug === SLUG);
const others = (t: Record<string, number>) => {
  const o = { ...t };
  delete o[SLUG];
  return o;
};

// ------------------------------------------------------- hoisted runs (11 sims)

const ov = readOverride();
const base = run();

let nBeauty = 0;
const noBeautyFull = run(
  withPatchedOverride(SLUG, (o) => {
    nBeauty = setBuff(o as any, 'attackDamagePct', 24, 0);
  })
);

let nAtk29 = 0;
const noAtk29 = run(
  withPatchedOverride(SLUG, (o) => {
    nAtk29 = setBuff(o as any, 'atkPct', 29, 0);
  })
);

let nPinpoint = 0;
const noPinpoint = run(
  withPatchedOverride(SLUG, (o) => {
    nPinpoint = setBuff(o as any, 'coreDamagePct', 26, 0);
  })
);

let nParts = 0;
const noParts = run(
  withPatchedOverride(SLUG, (o) => {
    nParts = setBuff(o as any, 'partsDamagePct', 26.21, 0);
  })
);

let nInterval = 0;
const noInterval = run(
  withPatchedOverride(SLUG, (o) => {
    nInterval = dropEffects(
      o as any,
      (e) => e.kind === 'flatDamage' && e.atkPct === 900
    );
  })
);

let nNuke = 0;
const noNuke = run(
  withPatchedOverride(SLUG, (o) => {
    nNuke = dropEffects(
      o as any,
      (e) => e.kind === 'flatDamage' && e.atkPct === 6000
    );
  })
);

let nGauge = 0;
const noGauge = run(
  withPatchedOverride(SLUG, (o) => {
    nGauge = dropEffects(o as any, (e) => e.kind === 'fillGauge');
  })
);

let nHyper = 0;
const hyperGauge = run(
  withPatchedOverride(SLUG, (o) => {
    for (const { e, b } of findEffects(
      o as any,
      (x) => x.kind === 'fillGauge'
    )) {
      e.pct = 40;
      if (b.trigger && typeof b.trigger.count === 'number') {
        b.trigger.count = 20;
      }
      nHyper++;
    }
  })
);

const isRider = (e: any) =>
  e.kind === 'flatDamage' && (e.atkPct === 1189.66 || e.atkPct === 833.79);

let nRider = 0;
const noRider = run(
  withPatchedOverride(SLUG, (o) => {
    nRider = dropEffects(o as any, isRider);
  })
);

let nUngate = 0;
const ungatedRider = run(
  withPatchedOverride(SLUG, (o) => {
    for (const { b } of findEffects(o as any, isRider)) {
      if (b.ownBurstGate) {
        delete b.ownBurstGate;
        nUngate++;
      }
    }
  })
);

const FB = fullBursts(base.evs);
const riderProcs = damages(base.evs).length - damages(noRider.evs).length;
const ungatedProcs =
  damages(ungatedRider.evs).length - damages(noRider.evs).length;
const nukeProcs = damages(base.evs).length - damages(noNuke.evs).length;
const intervalProcs = damages(base.evs).length - damages(noInterval.evs).length;

// =============================================================================

describe('cinderella-crystal-wave — fixture sanity', () => {
  it('the control comp actually chains Full Bursts (a lone B3 makes ZERO)', () => {
    expect(FB).toBeGreaterThanOrEqual(4);
    expect(base.self).toBeGreaterThan(0);
  });
});

describe('cinderella-crystal-wave — skill1', () => {
  // KIT: "Activates at the start of battle. Affects self. Beauty-Full: Attack Damage ▲ 24%
  // continuously."  Damage-Up bucket, self-scoped, no duration.
  // DISCRIMINATES: RED under the nearest-wrong "ATK ▲24%" (atkPct — a different, larger
  // bucket) and RED under a team-scoped or MISSING encoding.
  it('Beauty-Full: Attack Damage ▲24% is continuous, self-only, Damage-Up (not ATK)', () => {
    expect(nBeauty).toBeGreaterThan(0); // modeled at all
    expect(
      onSelf(buffs(base.evs, 'attackDamagePct', 24)).length
    ).toBeGreaterThanOrEqual(1);
    expect(buffs(base.evs, 'atkPct', 24)).toHaveLength(0); // nearest-wrong: ATK, not Attack Damage
    expect(noBeautyFull.self).toBeLessThan(base.self); // live, not inert
    expect(others(noBeautyFull.tot)).toEqual(others(base.tot)); // self-scope inertness
  });

  // KIT: "Activates every 5 sec. Affects the enemy unit nearest to the crosshair.
  // Deals 900% of final ATK as damage."  Interval trigger, enemy target, function-damage rider.
  // DISCRIMINATES: an interval of 5s over a 180s fight is ~36 procs. RED under a 10s cadence
  // (~18), RED under a fullBurstEnter/burstCast keying (~5-8), RED if MISSING (0).
  // Rider conventions (methodology §9): riders are force-set no-range, and take the Full Burst
  // major by TIMING (default ON) — so RED under a wrong noFb:true or a range-eligible encoding.
  it('every-5-sec 900% rider: ~36 procs / 180s, no +30% range, FB major by timing', () => {
    expect(nInterval).toBeGreaterThan(0);
    expect(intervalProcs).toBeGreaterThanOrEqual(30);
    expect(intervalProcs).toBeLessThanOrEqual(38);

    const s1 = slotDamages(base.evs, 'skill1'); // liter/crown/helm skill1s are pure buffs
    expect(s1.length).toBeGreaterThanOrEqual(30);
    expect(s1.every((e) => e.rangeApplied === false)).toBe(true);
    expect(s1.some((e) => e.fbMajorApplied === true)).toBe(true); // not wrongly noFb'd
    expect(s1.some((e) => e.fbMajorApplied === false)).toBe(true); // non-vacuity: both states hit

    expect(noInterval.self).toBeLessThan(base.self);
    expect(others(noInterval.tot)).toEqual(others(base.tot));
  });

  // KIT: "Activates each time total ammo consumed by allies reaches 200. Affects all allies.
  // Fills Burst Gauge by 12%."  teamAmmo trigger (TEAM ammo, not the owner's), allies target.
  // DISCRIMINATES: the gauge channel must be present AND directional. The hyper variant
  // (threshold 20, 40%) must produce strictly MORE Full Bursts than the removed variant —
  // that is the non-vacuity proof that the fixture is gauge-sensitive at all, so the
  // `noGauge <= base` comparison is a real constraint rather than a tautology.
  it('team-ammo 200 → Burst Gauge +12%: a live, directional gauge channel', () => {
    expect(nGauge).toBeGreaterThan(0);
    expect(nHyper).toBeGreaterThan(0);
    expect(fullBursts(noGauge.evs)).toBeLessThanOrEqual(FB);
    expect(fullBursts(hyperGauge.evs)).toBeGreaterThan(fullBursts(noGauge.evs));
  });

  // KIT: Snipe Mode — "Changes the weapon in use", 62.13% of final ATK, Charge Time 1 sec,
  // Full Charge Damage 250% of damage, Max Ammunition 15, "Additional Effect 1: Gains Pierce."
  // Presence is NOT asserted (the swap's trigger + duration are measurement-gated, see below),
  // but IF a weaponSwap is encoded its magnitudes are pure kit text and must match exactly.
  // The Pierce clause is asserted UNCONDITIONALLY: the kit grants Pierce only INSIDE the Snipe
  // Mode block, so an unconditional whole-fight `hasPierce: true` is the nearest-wrong model —
  // it would tag her MG rounds as Pierce for the entire fight.
  it('Snipe Mode: kit magnitudes exact if encoded; Pierce is never whole-fight', () => {
    const swaps = findEffects(ov, (e) => e.kind === 'weaponSwap');
    for (const { e } of swaps) {
      expect(e.damagePct).toBeCloseTo(62.13, 4);
      expect(e.chargeTimeSec).toBeCloseTo(1, 6);
      expect(e.chargeMultPct).toBeCloseTo(250, 4);
      expect(e.maxAmmo).toBe(15);
    }
    // Pierce must be mode/swap-scoped, never an unconditional whole-fight flag.
    if (ov.hasPierce === true) {
      expect(Array.isArray(ov.pierceModes) && ov.pierceModes.length > 0).toBe(
        true
      );
    }
  });

  it.skip('⚑ GAP: Snipe Mode toggle trigger + duration are not derivable from the kit', () => {
    // Activation is "reloading to max ammunition WHILE IN the Preparation for Change state" and
    // removal is the SAME event — a condition-toggle. No TriggerDef expresses reload-to-max, and
    // weaponSwap.durationSec demands a wall-clock bound the kit never states. The swap's duty
    // cycle (and therefore how much of the fight runs at 62.13%/250% SR damage vs the MG) is a
    // per-unit ⚑ estimate. RECIPE: count Snipe-Mode seconds per 180s from a focus recording.
  });

  it.skip('⚑ CONTRADICTION: Full Charge "Expends ammo. Amount: 40 round(s)" vs a 15-round mag', () => {
    // Snipe Mode caps Max Ammunition at 15, yet each Full Charge expends 40 rounds. Read
    // literally, 40 >= 15 ⇒ every Full Charge empties the belt and forces a reload (consumeAmmo
    // fraction 1). The alternative reading — that the 40 is spent against the base 300-round MG
    // belt (40/300 = 0.1333) — is equally consistent with the text. Not resolvable blind.
  });

  it.skip('GAP: "Preparation for Change: Reload time is fixed at 3 sec for 6 sec"', () => {
    // A stat CLAMP, not a reloadSpeedPct buff — no primitive (engine-modeling-gaps §1b).
    // Whole-picture: base reloadFrames 171 = 2.85s, so "fixed at 3 sec" is a slight SLOWDOWN.
    // "Removed upon firing the last bullet" also has no representation.
  });
});

describe('cinderella-crystal-wave — skill2', () => {
  // KIT: "Activates at the start of battle. Affects self. ATK ▲ 29% continuously."
  // DISCRIMINATES: RED under an attackDamagePct (Damage-Up) mis-bucketing and RED if MISSING.
  it('ATK ▲29% is continuous, self-only, in the ATK bucket (not Damage Up)', () => {
    expect(nAtk29).toBeGreaterThan(0);
    expect(onSelf(buffs(base.evs, 'atkPct', 29)).length).toBeGreaterThanOrEqual(
      1
    );
    expect(buffs(base.evs, 'attackDamagePct', 29)).toHaveLength(0);
    expect(noAtk29.self).toBeLessThan(base.self);
    expect(others(noAtk29.tot)).toEqual(others(base.tot));
  });

  // KIT: "Activates at the start of battle and when Snipe Mode is removed. Affects self.
  // Pinpoint: Damage dealt when attacking core ▲ 26% continuously."
  // SCOPE trap (taxonomy §1): this is CORE-scoped, not generic. A generic attackDamagePct 26
  // would credit every normal hit, not just core hits.
  // NON-VACUITY: the assertion only bites if core hits occur — proven by noPinpoint < base.
  it('Pinpoint: core-scoped ▲26%, live from battle start, self-only', () => {
    expect(nPinpoint).toBeGreaterThan(0);
    expect(
      onSelf(buffs(base.evs, 'coreDamagePct', 26)).length
    ).toBeGreaterThanOrEqual(1);
    expect(buffs(base.evs, 'attackDamagePct', 26)).toHaveLength(0); // nearest-wrong: generic
    expect(noPinpoint.self).toBeLessThan(base.self);
    expect(others(noPinpoint.tot)).toEqual(others(base.tot));
  });

  // KIT: "Destroy: Damage to Parts ▲ 26.21% continuously."
  // The v1 boss is PARTLESS, so partsDamagePct is offensively inert — the whole point of the
  // test is that this line must not leak into a live bucket.
  // DISCRIMINATES: RED if 26.21 shows up as attackDamagePct / coreDamagePct / pierceDamagePct
  // (the nearest-wrong "parts ≈ generic damage" mis-encoding), and RED if a modeled
  // partsDamagePct moves ANY unit's total.
  it('Destroy: parts-scoped ▲26.21% and offensively inert on the partless boss', () => {
    for (const stat of [
      'attackDamagePct',
      'coreDamagePct',
      'pierceDamagePct',
    ]) {
      expect(buffs(base.evs, stat, 26.21)).toHaveLength(0);
    }
    if (nParts > 0) {
      expect(noParts.tot).toEqual(base.tot); // byte-identical, INCLUDING self
    }
  });

  it.skip('GAP: Destroy and Pinpoint mutually remove each other', () => {
    // "Removes Pinpoint" / "Removes Destroy" is a state machine driven entirely by Snipe Mode
    // entry/exit. With the Snipe swap measurement-gated (above), the fixture never enters Snipe,
    // so the ACTIVE and INACTIVE cases of the pair cannot both be exercised — any assertion here
    // would be vacuous. Blind expectation: Pinpoint is live for the whole graded run.
  });

  // KIT: "Activates when entering Full Burst AFTER THIS UNIT uses her Burst Skill. Effect varies
  // according to this unit's current mode. ONLY ONE EFFECT IS APPLIED."
  //   in Snipe Mode      → 1189.66% of final ATK
  //   not in Snipe Mode  →  833.79% as CORE STRIKE damage
  // TRIGGER-IDENTITY trap (taxonomy §3): "entering Full Burst" keeps the block at FB entry (it
  // keeps the +50% FB major and the FB auras, unlike re-keying to burstCast), but the
  // "after THIS UNIT uses her Burst Skill" clause gates it to rotations CCW herself bursts —
  // ownBurstGate:'cast'.
  // DISCRIMINATES: the fixture has TWO Burst III units (CCW + helm), so plain fullBurstEnter
  // over-fires on every helm-completed rotation. `ungatedProcs > riderProcs` is RED under the
  // ungated model and simultaneously proves the gate is non-vacuous here (helm really does
  // complete Full Bursts CCW did not burst into). `riderProcs <= FB` enforces "only one effect
  // is applied" — a both-branches-fire encoding would double up.
  it('FB-enter rider fires ONLY on Full Bursts this unit burst into, one branch only', () => {
    expect(nRider).toBeGreaterThan(0); // the rider is modeled at all
    expect(riderProcs).toBeGreaterThanOrEqual(1); // and it actually fires
    expect(riderProcs).toBeLessThanOrEqual(FB); // "only one effect is applied"
    expect(riderProcs).toBeLessThan(FB); // gated: helm completes >=1 FB without CCW
    expect(nUngate).toBeGreaterThan(0); // an ownBurstGate exists to remove
    expect(ungatedProcs).toBeGreaterThan(riderProcs); // RED under plain fullBurstEnter
    expect(others(noRider.tot)).toEqual(others(base.tot)); // enemy-targeted, teammate-inert
  });

  it.skip('GAP: the 1189.66% Snipe-Mode branch of the FB-enter rider', () => {
    // Unreachable while the Snipe Mode swap is measurement-gated — the fixture never enters
    // Snipe, so only the 833.79% core-strike branch can be exercised. Blind expectation: the
    // 833.79% branch carries core:true ("as core strike damage", the only rider in this kit
    // that earns the core bucket) and the 1189.66% branch does NOT.
  });
});

describe('cinderella-crystal-wave — burst', () => {
  // KIT: "Affects self. Attack Damage ▲ 92% for 10 sec. ATK ▲ 65% for 10 sec."
  // DISCRIMINATES: the two buffs are one block on one cast, so they must be equinumerous and
  // share an expiry frame (both 10s). RED if one is encoded permanent/continuous, RED if the
  // durations diverge, RED if either leaks onto a teammate (the line says "Affects self"),
  // and RED if the cast count is wrong (cd 40s over 180s ⇒ a handful of casts, not one).
  it('burst self-buffs: Attack Damage ▲92% + ATK ▲65%, both 10s, self-only, per own cast', () => {
    const ad = onSelf(buffs(base.evs, 'attackDamagePct', 92));
    const at = onSelf(buffs(base.evs, 'atkPct', 65));

    expect(ad.length).toBeGreaterThanOrEqual(3);
    expect(ad.length).toBeLessThanOrEqual(7);
    expect(at.length).toBe(ad.length); // same block, same cast

    // self-only: nobody else receives either value
    expect(buffs(base.evs, 'attackDamagePct', 92).length).toBe(ad.length);
    expect(buffs(base.evs, 'atkPct', 65).length).toBe(at.length);

    // temporary (10s), not continuous — and the SAME 10s for both
    expect(Number.isFinite(ad[0].expiresFrame)).toBe(true);
    for (let i = 0; i < ad.length; i++) {
      expect(at[i].expiresFrame).toBe(ad[i].expiresFrame);
    }
  });

  // KIT: "Affects the enemy with the highest final ATK. Deals 6000% of final ATK as Burst
  // Skill damage."
  // DISCRIMINATES: exactly one proc per own burst cast — cross-checked against the burst
  // self-buff apply count above, so a wrong trigger (e.g. fullBurstEnter, which fires on
  // helm's rotations too) desynchronises the two and goes RED.
  // FB-exemption (methodology §9): burst-cast damage lands BEFORE the Full Burst window opens,
  // so no burst-slot damage event may carry inFullBurst === true.
  it('6000% burst nuke: once per own burst cast, and FB-exempt', () => {
    expect(nNuke).toBeGreaterThan(0);
    const casts = onSelf(buffs(base.evs, 'attackDamagePct', 92)).length;
    expect(nukeProcs).toBe(casts);

    const burstSlot = slotDamages(base.evs, 'burst');
    expect(burstSlot.length).toBeGreaterThanOrEqual(casts);
    expect(burstSlot.every((e) => e.inFullBurst === false)).toBe(true);

    expect(noNuke.self).toBeLessThan(base.self);
    expect(others(noNuke.tot)).toEqual(others(base.tot));
  });
});

describe('cinderella-crystal-wave — unmodeled', () => {
  it.skip('UNMODELED: Decoy — avatar with 70.34% of the skill user\u2019s final Max HP', () => {
    // Defensive/aggro primitive with no engine representation (v1 has no HP pool and the boss
    // deals no damage). No damage channel and no tandem consumer in the kit. Belongs in the
    // override\u2019s `unmodeled.skill2`, never as an `ignored` effect block (validator rejects).
  });
});
