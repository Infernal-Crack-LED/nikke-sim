/**
 * liberalio - SR / Wind / Attacker / Burst III (cd 40s, ammo 6, reload 141f, charge 90f,
 * hitsPerShot 1, normal 69.04, core 200). BLIND kit spec test: written from the kit prose
 * alone, with no sight of the driver's override, tests, or reasoning.
 *
 * KIT (paraphrased; magnitudes verbatim)
 *  s1a  FB-enter, self: ATK +160% for 3s.
 *  s1b  landing a full charge ON CORE, self: Attack Damage +20.83% for 60s.
 *  s1c  landing a full charge, the target: 40.5% of final ATK as additional damage,
 *       "Activates 5 times" (multiplicity ambiguous -> flagged; see the skipped probe).
 *  s1d  FB-enter, the 1 Burst-III ally with the LOWEST FINAL ATK:
 *       Charge Speed +12.74% "of the skill user's Charge Speed" for 10s.
 *  s2a  landing a full charge vs the STAGE TARGET, self: Raging Current -
 *       Attack Damage +231% continuously; removes Gentle Current.
 *  s2b  landing a full charge vs a NON-stage-target Rapture, self: Gentle Current -
 *       charge time FIXED at 1s continuously; removes Raging Current.
 *  s2c  battle start, self: immunity to Increase AND Decrease Charge Speed, permanent.
 *  bA   burst, self: Attack Damage +50% for 10s.
 *  bB   burst, all enemies: 925% of final ATK as additional damage.
 *
 * FIXTURE: controlComp('liberalio', true) = liter B1 / crown B2 / liberalio B3 / helm B3,
 * Fire boss, focus liberalio. B1+B2 are mandatory - a lone Burst III casts nothing and makes
 * ZERO full bursts, which would silently vacuum every FB-enter and burst assertion. helm (the
 * fixed second B3) is kept ON deliberately: s1d's target-set ("the 1 Burst-III ally with the
 * lowest final ATK") is only a real CHOICE when a second Burst III exists, and a second B3 is
 * also what separates burst-cast from full-burst-enter.
 *
 * DISCRIMINATION NOTES
 *  - Duration counterfactuals patch to a SHORT window (0.5s), never a merely-shorter one.
 *    Her charge cadence is ~2s (90f charge + 22f release latency, 6-round mag, 141f reload),
 *    so ANY window >= ~4s refreshes into permanence: a "60s -> 5s" patch would move nothing
 *    and would be a fake discriminator. 0.5s lapses before the next charge, so the faithful
 *    window is provably load-bearing. Corollary (stated, not asserted - it is untestable in a
 *    180s fight): "for 60 sec" refreshed by every core charge and "continuously" are
 *    observationally IDENTICAL here; only the trigger identity is separable, which is what the
 *    passive-vs-triggered patch tests.
 *  - Structural assertions read the COMMITTED override via withPatchedOverride(slug, () => {})
 *    (a clone - disk untouched) so magnitudes, durations, triggers, gates and target-sets are
 *    pinned EXACTLY, not merely in aggregate. Aggregate-only tests cannot tell 20.83% generic
 *    from 20.83% core-gated.
 *  - slotBlocks() tolerates BOTH override shapes documented to me (slot -> Block[] and
 *    slot -> {blocks: Block[]}); the contract states them inconsistently and a blind test must
 *    not go red on that ambiguity.
 *  - Every counterfactual is built with withPatchedOverride, so no committed JSON is touched.
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

const SLUG = 'liberalio';
const ALLY_SLUGS = ['liter', 'crown', 'helm'];

/* ------------------------------------------------------------------ helpers */

function slotBlocks(ov: any, slot: 'skill1' | 'skill2' | 'burst'): any[] {
  const s = ov?.[slot];
  if (!s) {
    return [];
  }
  if (Array.isArray(s)) {
    return s;
  }
  return Array.isArray(s.blocks) ? s.blocks : [];
}

function findEffect(
  ov: any,
  slot: 'skill1' | 'skill2' | 'burst',
  pred: (e: any) => boolean
): { block: any; eff: any } | undefined {
  for (const block of slotBlocks(ov, slot)) {
    for (const eff of block?.effects ?? []) {
      if (pred(eff)) {
        return { block, eff };
      }
    }
  }
  return undefined;
}

function dropEffects(
  ov: any,
  slot: 'skill1' | 'skill2' | 'burst',
  pred: (e: any) => boolean
): number {
  let n = 0;
  for (const block of slotBlocks(ov, slot)) {
    const effs: any[] = block?.effects ?? [];
    for (let i = effs.length - 1; i >= 0; i--) {
      if (pred(effs[i])) {
        effs.splice(i, 1);
        n++;
      }
    }
  }
  return n;
}

function scaleFlat(
  ov: any,
  slot: 'skill1' | 'skill2' | 'burst',
  factor: number
): void {
  for (const block of slotBlocks(ov, slot)) {
    for (const eff of block?.effects ?? []) {
      if (eff?.kind === 'flatDamage') {
        eff.atkPct = eff.atkPct * factor;
      }
    }
  }
}

const near = (a: any, b: number) =>
  typeof a === 'number' && Math.abs(a - b) < 1e-6;
const isBuff = (e: any, stat: string, value: number) =>
  e?.kind === 'buff' && e.stat === stat && near(e.value, value);
const isFlat = (e: any) => e?.kind === 'flatDamage';

/** The committed override, as an untouched in-memory clone. */
const OV: any = withPatchedOverride(SLUG, () => {});

function comp(mutate?: (ov: any) => void): any {
  const base: any = controlComp(SLUG, true);
  if (!mutate) {
    return base;
  }
  return {
    ...base,
    overrides: {
      ...(base.overrides ?? {}),
      [SLUG]: withPatchedOverride(SLUG, mutate),
    },
  };
}

function run(opts: any) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...opts,
    cfg: {
      ...(opts.cfg ?? {}),
      onEvent: (e: SimEvent) => {
        events.push(e);
      },
    },
  } as any);
  return { res, events, dmg: totals(res) as Record<string, number> };
}

const ofKind = (evs: SimEvent[], kind: string) =>
  evs.filter((e: any) => e.kind === kind);
const applied = (evs: SimEvent[], stat: string, value: number) =>
  ofKind(evs, 'buffApply').filter(
    (e: any) => e.stat === stat && near(e.value, value)
  );
const ownerIdx = (e: any) => e.srcSlot ?? e.slot ?? e.casterIdx ?? e.unitIdx;

function alliesIdentical(
  a: ReturnType<typeof run>,
  b: ReturnType<typeof run>
): void {
  for (const s of ALLY_SLUGS) {
    if (s in a.dmg) {
      expect(b.dmg[s]).toBe(a.dmg[s]);
    }
  }
}

/* --------------------------------------------------------------- the 14 runs */

const BASE = run(comp());

const NO_S1A = run(
  comp((ov) => {
    dropEffects(ov, 'skill1', (e) => isBuff(e, 'atkPct', 160));
  })
);
const S1A_LONG = run(
  comp((ov) => {
    const h = findEffect(ov, 'skill1', (e) => isBuff(e, 'atkPct', 160));
    if (h) {
      h.eff.durationSec = 9;
    }
  })
);
const S1B_SHORT = run(
  comp((ov) => {
    const h = findEffect(ov, 'skill1', (e) =>
      isBuff(e, 'attackDamagePct', 20.83)
    );
    if (h) {
      h.eff.durationSec = 0.5;
    }
  })
);
const S1B_NOCORE = run(
  comp((ov) => {
    const h = findEffect(ov, 'skill1', (e) =>
      isBuff(e, 'attackDamagePct', 20.83)
    );
    if (h) {
      h.block.requiresCore = false;
    }
  })
);
const NO_S1C = run(
  comp((ov) => {
    dropEffects(ov, 'skill1', isFlat);
  })
);
const S1C_X10 = run(
  comp((ov) => {
    scaleFlat(ov, 'skill1', 10);
  })
);
const S1D_ALL = run(
  comp((ov) => {
    const h = findEffect(ov, 'skill1', (e) =>
      isBuff(e, 'chargeSpeedPct', 12.74)
    );
    if (h) {
      h.block.target = { kind: 'allies' };
    }
  })
);
const S2_PASSIVE = run(
  comp((ov) => {
    const h = findEffect(ov, 'skill2', (e) =>
      isBuff(e, 'attackDamagePct', 231)
    );
    if (h) {
      h.block.trigger = { kind: 'passive' };
    }
  })
);
const S2_SHORT = run(
  comp((ov) => {
    const h = findEffect(ov, 'skill2', (e) =>
      isBuff(e, 'attackDamagePct', 231)
    );
    if (h) {
      h.eff.durationSec = 0.5;
    }
  })
);
const NO_S2 = run(
  comp((ov) => {
    dropEffects(ov, 'skill2', (e) => isBuff(e, 'attackDamagePct', 231));
  })
);
const BURST_SHORT = run(
  comp((ov) => {
    const h = findEffect(ov, 'burst', (e) => isBuff(e, 'attackDamagePct', 50));
    if (h) {
      h.eff.durationSec = 0.5;
    }
  })
);
const NO_BURST_NUKE = run(
  comp((ov) => {
    dropEffects(ov, 'burst', isFlat);
  })
);
const BURST_NUKE_X2 = run(
  comp((ov) => {
    scaleFlat(ov, 'burst', 2);
  })
);

/** liberalio's slot index, resolved from any self-targeted buffApply. */
const SELF_BUFF: any = ofKind(BASE.events, 'buffApply').find(
  (e: any) => e.targetSlug === SLUG
);
const LSLOT: number | undefined = SELF_BUFF ? SELF_BUFF.targetIdx : undefined;
const LIB_SHOTS = ofKind(BASE.events, 'shot').filter(
  (e: any) => LSLOT !== undefined && ownerIdx(e) === LSLOT
);
const LIB_BURSTS = ofKind(BASE.events, 'burstCast').filter(
  (e: any) => LSLOT !== undefined && ownerIdx(e) === LSLOT
);
const FB_STARTS = ofKind(BASE.events, 'fullBurstStart');

/* ------------------------------------------------------------------- fixture */

describe('liberalio — fixture is non-vacuous', () => {
  it('deals damage, fires charges, and the team actually full-bursts', () => {
    expect(unitOf(BASE.res, SLUG).totalDamage).toBeGreaterThan(0);
    // A lone B3 would make ZERO full bursts; liter+crown are what make these assertions real.
    expect(FB_STARTS.length).toBeGreaterThan(0);
    expect(LIB_BURSTS.length).toBeGreaterThan(0);
    expect(LIB_SHOTS.length).toBeGreaterThan(0);
  });

  it('the second Burst III (helm) is present, so B3-scoped target-sets are a real choice', () => {
    expect('helm' in BASE.dmg).toBe(true);
  });
});

/* ----------------------------------------------------- s1a  ATK +160% / 3s FB */

describe('liberalio s1a — FB-enter self ATK +160% for 3 sec', () => {
  it('is authored as a self buff on a fullBurstEnter trigger with the exact magnitude+window', () => {
    const h = findEffect(OV, 'skill1', (e) => isBuff(e, 'atkPct', 160));
    expect(Boolean(h)).toBe(true);
    // atkPct (scales the holder's own ATK), NOT casterAtkPct: the kit says plain "ATK ▲".
    expect(h!.eff.stat).toBe('atkPct');
    expect(near(h!.eff.durationSec, 3)).toBe(true);
    expect(h!.block.trigger?.kind).toBe('fullBurstEnter');
    expect(h!.block.target?.kind).toBe('self');
  });

  it('fires once per full burst, on liberalio only', () => {
    const evs = applied(BASE.events, 'atkPct', 160);
    expect(evs.length).toBe(FB_STARTS.length);
    for (const e of evs as any[]) {
      expect(e.targetSlug).toBe(SLUG);
    }
  });

  it('is load-bearing, and its 3s window is not a 10s window', () => {
    // GREEN under the faithful reading; RED if the buff is absent (dropped line) or if the
    // window were the FB length (a 9s patch must ADD damage, proving 3s truncates real shots).
    expect(NO_S1A.dmg[SLUG]).toBeLessThan(BASE.dmg[SLUG]);
    expect(S1A_LONG.dmg[SLUG]).toBeGreaterThan(BASE.dmg[SLUG]);
  });

  it('is inert on teammates (self-scoped)', () => {
    alliesIdentical(BASE, NO_S1A);
  });
});

/* -------------------------------------- s1b  core-gated Attack Damage +20.83% */

describe('liberalio s1b — full charge ON CORE: self Attack Damage +20.83% for 60 sec', () => {
  it("is authored core-gated, self, in the Damage-Up bucket, on the unit's own charge", () => {
    const h = findEffect(OV, 'skill1', (e) =>
      isBuff(e, 'attackDamagePct', 20.83)
    );
    expect(Boolean(h)).toBe(true);
    // attackDamagePct, not atkPct: "Attack Damage ▲" is the Damage-Up bucket.
    expect(h!.eff.stat).toBe('attackDamagePct');
    expect(near(h!.eff.durationSec, 60)).toBe(true);
    expect(h!.block.target?.kind).toBe('self');
    // The core requirement is the whole point of the line - a generic charge trigger
    // over-credits every non-core charge.
    expect(h!.block.requiresCore).toBe(true);
    // Every trigger pull of an SR is one full charge, so the faithful primitive is the
    // owner's own shot (hitCount:1 is the acceptable equivalent).
    const t = h!.block.trigger ?? {};
    const perShot =
      t.kind === 'shotFired' || (t.kind === 'hitCount' && t.count === 1);
    expect(perShot).toBe(true);
  });

  it('applies only to liberalio, at 20.83 percentage points', () => {
    const evs = applied(BASE.events, 'attackDamagePct', 20.83);
    expect(evs.length).toBeGreaterThan(0);
    for (const e of evs as any[]) {
      expect(e.targetSlug).toBe(SLUG);
    }
  });

  it('the core gate is real and non-vacuous in this fixture', () => {
    // Non-vacuity + discrimination in one: dropping requiresCore must make the block fire MORE
    // often. If it does not, the shipped model is either ungated (over-credit) or the gate never
    // bites here - both are findings, not passes.
    const baseN = applied(BASE.events, 'attackDamagePct', 20.83).length;
    const openN = applied(S1B_NOCORE.events, 'attackDamagePct', 20.83).length;
    expect(openN).toBeGreaterThan(baseN);
    expect(S1B_NOCORE.dmg[SLUG]).toBeGreaterThan(BASE.dmg[SLUG]);
  });

  it('its window survives between charges (0.5s counterfactual loses damage)', () => {
    // NOT a "60s -> 5s" patch: her ~2s charge cadence refreshes any window >= ~4s into
    // permanence, so only a sub-cadence window discriminates.
    expect(S1B_SHORT.dmg[SLUG]).toBeLessThan(BASE.dmg[SLUG]);
  });

  it('is inert on teammates (self-scoped)', () => {
    alliesIdentical(BASE, S1B_SHORT);
  });
});

/* ----------------------------------------- s1c  40.5% per-full-charge rider(s) */

describe('liberalio s1c — full charge: 40.5% of final ATK additional damage', () => {
  it("is authored as an enemy-targeted flatDamage rider on the owner's charge", () => {
    const flats: any[] = [];
    for (const b of slotBlocks(OV, 'skill1')) {
      for (const e of b?.effects ?? []) {
        if (isFlat(e)) {
          flats.push({ b, e });
        }
      }
    }
    expect(flats.length).toBeGreaterThan(0);
    for (const { b, e } of flats) {
      // 40.5 per instance, or 202.5 if the "Activates 5 times" multiplicity was folded into one
      // instance. Any OTHER magnitude is a divergence.
      expect(near(e.atkPct, 40.5) || near(e.atkPct, 202.5)).toBe(true);
      expect(b.target?.kind).toBe('enemy');
      const t = b.trigger ?? {};
      expect(
        t.kind === 'shotFired' || (t.kind === 'hitCount' && t.count === 1)
      ).toBe(true);
      // "Affects the target" - no core clause, so the rider must not be authored as a core strike.
      expect(e.core === true).toBe(false);
    }
  });

  it('fires per full charge, not a handful of times per battle', () => {
    // "Activates 5 times" could be read as a 5-per-BATTLE cap. Under that reading the rider
    // contributes ~5 hits of 40.5% while the burst nuke contributes ~925% per cast, i.e. a
    // contribution ratio near 0.06. Under the per-charge reading (~40-90 charges in 180s) the
    // ratio is ~1 or more. A 0.4 floor separates them with a wide margin.
    const riderDelta = BASE.dmg[SLUG] - NO_S1C.dmg[SLUG];
    const nukeDelta = BASE.dmg[SLUG] - NO_BURST_NUKE.dmg[SLUG];
    expect(riderDelta).toBeGreaterThan(0);
    expect(nukeDelta).toBeGreaterThan(0);
    expect(riderDelta / nukeDelta).toBeGreaterThan(0.4);
  });

  it('scales linearly with atkPct (it is a percent-of-final-ATK rider)', () => {
    const base = BASE.dmg[SLUG] - NO_S1C.dmg[SLUG];
    const x10 = S1C_X10.dmg[SLUG] - NO_S1C.dmg[SLUG];
    expect(x10 / base).toBeGreaterThan(9);
    expect(x10 / base).toBeLessThan(11);
  });

  it('credits liberalio only (teammates unmoved)', () => {
    alliesIdentical(BASE, NO_S1C);
  });

  it.skip('⚑ "Activates 5 times" multiplicity: 5 instances per charge vs 1 (ambiguous prose)', () => {
    // The prose gives a count with no per-trigger/per-battle qualifier. The standard reading of
    // "Deals X% ... Activates N times" in these dumps is N popups per trigger (202.5%/charge),
    // but a 5-per-battle cap is grammatically available and the engine has NO per-battle
    // activation-cap primitive either way. Deciding it needs a measurement, not a guess:
    // RECIPE - count the additional-damage popups landing per single full charge in footage
    // (expect 5 small popups of the same value if multiplicity is per-trigger, 1 if not);
    // secondary check: rider contribution / (925% x her burst casts) ~= 4-5 for the 5x reading,
    // ~= 1 for the 1x reading, using the charge count read off the event log.
  });
});

/* ---------------------------------- s1d  Charge Speed to lowest-final-ATK B3 */

describe('liberalio s1d — FB-enter: Charge Speed +12.74% to the 1 lowest-final-ATK Burst III ally for 10s', () => {
  it('is authored with the exact B3 / lowest-FINAL-ATK target set', () => {
    const h = findEffect(OV, 'skill1', (e) =>
      isBuff(e, 'chargeSpeedPct', 12.74)
    );
    expect(Boolean(h)).toBe(true);
    expect(near(h!.eff.durationSec, 10)).toBe(true);
    expect(h!.block.trigger?.kind).toBe('fullBurstEnter');
    const tgt = h!.block.target ?? {};
    expect(tgt.kind).toBe('alliesLowestAtk');
    expect(tgt.count).toBe(1);
    expect(tgt.burst).toBe('III');
    // The kit says "lowest FINAL ATK" literally -> live-ATK ranking, not static ranking.
    expect(tgt.byFinalAtk).toBe(true);
  });

  it('never lands on the Burst I / Burst II allies', () => {
    const evs = applied(BASE.events, 'chargeSpeedPct', 12.74) as any[];
    expect(evs.length).toBeGreaterThan(0);
    for (const e of evs) {
      expect(e.targetSlug === 'liter' || e.targetSlug === 'crown').toBe(false);
      // Only a Burst III unit is eligible: liberalio herself or the fixed B3 (helm).
      expect([SLUG, 'helm']).toContain(e.targetSlug);
    }
    expect(evs.length).toBeLessThanOrEqual(FB_STARTS.length);
  });

  it('the B3/lowest-ATK scoping is discriminating (an all-allies model over-applies)', () => {
    const baseEvs = applied(BASE.events, 'chargeSpeedPct', 12.74) as any[];
    const allEvs = applied(S1D_ALL.events, 'chargeSpeedPct', 12.74) as any[];
    expect(allEvs.length).toBeGreaterThan(baseEvs.length);
    expect(
      allEvs.some((e) => e.targetSlug === 'liter' || e.targetSlug === 'crown')
    ).toBe(true);
  });

  it.skip('⚑ "12.74% OF THE SKILL USER\'S Charge Speed" is caster-scaled; the schema has no primitive', () => {
    // chargeSpeedPct is a plain percentage stat scaling the HOLDER's charge speed. There is no
    // casterChargeSpeedPct analogue to casterAtkPct, so a caster-relative grant can only be
    // approximated by the flat 12.74. Inputs are equal-ish here (both B3s are SR charge units),
    // so the approximation is small - but it is an approximation, and unobservable from totals.
    // RECIPE: needs a caster-scaled charge-speed primitive plus a measured charge-time read on
    // the recipient before it can be pinned.
  });

  it.skip('⚑ self-grant vs s2c immunity: if this line resolves onto liberalio it must be inert', () => {
    // s2c gives her permanent immunity to Increase Charge Speed effects, and she is herself an
    // eligible "Burst III ally". If the lowest-final-ATK resolution picks her, the faithful
    // outcome is a NO-OP on her charge time - the engine has no immunity primitive, so a
    // self-resolution would silently over-credit. Untestable without that primitive.
  });
});

/* ------------------------------------------------- s2a  Raging Current +231% */

describe('liberalio s2a — full charge vs the stage target: Raging Current, Attack Damage +231% continuously', () => {
  it('is authored self, continuous (no durationSec), triggered by her own charge', () => {
    const h = findEffect(OV, 'skill2', (e) =>
      isBuff(e, 'attackDamagePct', 231)
    );
    expect(Boolean(h)).toBe(true);
    expect(h!.eff.stat).toBe('attackDamagePct');
    // "continuously" -> no time expiry at all, not a long window.
    expect(h!.eff.durationSec).toBeUndefined();
    expect(h!.block.target?.kind).toBe('self');
    const t = h!.block.trigger ?? {};
    expect(
      t.kind === 'shotFired' || (t.kind === 'hitCount' && t.count === 1)
    ).toBe(true);
    // It is NOT a passive: it only exists after she lands a full charge on the stage target.
    expect(t.kind).not.toBe('passive');
  });

  it('applies to liberalio only', () => {
    const evs = applied(BASE.events, 'attackDamagePct', 231) as any[];
    expect(evs.length).toBeGreaterThan(0);
    for (const e of evs) {
      expect(e.targetSlug).toBe(SLUG);
    }
  });

  it('is earned on her first landed charge, not granted from t=0', () => {
    // Trigger-identity discriminator: a passive model has +231% live before her first charge
    // lands, so it must out-damage the faithful triggered model. GREEN faithful, RED if the
    // driver keyed it passive.
    expect(S2_PASSIVE.dmg[SLUG]).toBeGreaterThan(BASE.dmg[SLUG]);
  });

  it('is the dominant self buff and persists between charges', () => {
    expect(NO_S2.dmg[SLUG]).toBeLessThan(BASE.dmg[SLUG]);
    // A sub-cadence window (0.5s) must lose damage; "continuously" vs any window >= her ~2s
    // cadence is observationally identical in a 180s fight and is deliberately NOT asserted.
    expect(S2_SHORT.dmg[SLUG]).toBeLessThan(BASE.dmg[SLUG]);
  });

  it('is inert on teammates (self-scoped)', () => {
    alliesIdentical(BASE, NO_S2);
  });
});

/* ------------------------------- s2b / s2c  Gentle Current + charge immunity */

describe('liberalio s2b/s2c — Gentle Current and the charge-speed immunities', () => {
  it('records the unmodellable skill2 lines in `unmodeled` instead of dropping them silently', () => {
    const lines: string[] = (OV?.unmodeled?.skill2 ?? []) as string[];
    expect(Array.isArray(lines)).toBe(true);
    expect(lines.length).toBeGreaterThan(0);
    expect(/charge|immun/i.test(lines.join(' '))).toBe(true);
  });

  it('does not model Gentle Current as a live charge-speed effect on liberalio', () => {
    // Gentle Current requires landing a full charge on a Rapture that is NOT the stage target.
    // The v1 fight has a single stage target and no other Rapture, so the branch is UNREACHABLE
    // and must never fire; a charge-time model that fires here would be pure invention.
    const noGentle = !slotBlocks(OV, 'skill2').some((b: any) =>
      (b?.effects ?? []).some(
        (e: any) => e?.kind === 'buff' && e.stat === 'chargeSpeedPct'
      )
    );
    expect(noGentle).toBe(true);
  });

  it.skip('GAP — "Fixes charge time at 1 sec" is a stat CLAMP; no engine primitive exists', () => {
    // A clamp is not expressible as a percentage buff (chargeSpeedPct scales, it does not pin),
    // and the branch is unreachable on a single-target boss anyway. Doubly inert here: nothing
    // to assert until a clamp primitive exists AND a second Rapture is modeled.
  });

  it.skip('GAP — permanent immunity to Increase/Decrease Charge Speed has no primitive, and is untestable in this fixture', () => {
    // No immunity/ward primitive exists in the effect schema. It is also non-vacuously
    // untestable here: liter, crown and helm grant no charge-speed effects in the control comp,
    // so even a correct implementation would be observationally silent. Would need a
    // charge-speed-granting ally in the fixture plus an immunity primitive.
  });
});

/* --------------------------------------------------- burst  self +50% for 10s */

describe('liberalio burst A — self Attack Damage +50% for 10 sec', () => {
  it('is authored as a burst-cast self buff in the Damage-Up bucket', () => {
    const h = findEffect(OV, 'burst', (e) => isBuff(e, 'attackDamagePct', 50));
    expect(Boolean(h)).toBe(true);
    expect(near(h!.eff.durationSec, 10)).toBe(true);
    expect(h!.block.target?.kind).toBe('self');
    // A self line in the unit's OWN burst block is burst-cast, never full-burst-enter: keying it
    // to FB-enter over-credits every rotation the OTHER Burst III (helm) completes.
    expect(h!.block.trigger?.kind).toBe('burstCast');
  });

  it('fires exactly once per liberalio burst cast — not once per team full burst', () => {
    // If the fixture ever has an FB liberalio did not cast, this is a hard burstCast-vs-
    // fullBurstEnter discriminator; when they coincide it still pins the count exactly.
    const evs = applied(BASE.events, 'attackDamagePct', 50) as any[];
    expect(evs.length).toBe(LIB_BURSTS.length);
    for (const e of evs) {
      expect(e.targetSlug).toBe(SLUG);
    }
  });

  it('its 10s window is load-bearing', () => {
    expect(BURST_SHORT.dmg[SLUG]).toBeLessThan(BASE.dmg[SLUG]);
  });

  it('is inert on teammates (self-scoped)', () => {
    alliesIdentical(BASE, BURST_SHORT);
  });
});

/* ----------------------------------------------- burst  925% to all enemies */

describe('liberalio burst B — 925% of final ATK to all enemies', () => {
  it('is authored as an enemy-targeted burst-cast flatDamage of 925%', () => {
    const h = findEffect(OV, 'burst', isFlat);
    expect(Boolean(h)).toBe(true);
    expect(near(h!.eff.atkPct, 925)).toBe(true);
    expect(h!.block.target?.kind).toBe('enemy');
    expect(h!.block.trigger?.kind).toBe('burstCast');
    // No core clause in the text -> not a core strike.
    expect(h!.eff.core === true).toBe(false);
  });

  it('is present and scales linearly', () => {
    const base = BASE.dmg[SLUG] - NO_BURST_NUKE.dmg[SLUG];
    const x2 = BURST_NUKE_X2.dmg[SLUG] - NO_BURST_NUKE.dmg[SLUG];
    expect(base).toBeGreaterThan(0);
    expect(x2 / base).toBeGreaterThan(1.9);
    expect(x2 / base).toBeLessThan(2.1);
  });

  it('is credited to liberalio and moves no teammate', () => {
    alliesIdentical(BASE, NO_BURST_NUKE);
    alliesIdentical(BASE, BURST_NUKE_X2);
  });
});
