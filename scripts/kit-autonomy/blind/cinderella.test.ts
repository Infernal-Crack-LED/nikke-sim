/**
 * cinderella (cinderella) — BLIND per-unit kit spec test.
 *
 * Written from the kit prose ALONE (S5 blind role): no sight of the driver's
 * override, tests, or reasoning. Every assertion is derived from one kit line
 * and is written to be GREEN under the literal reading and RED under the
 * nearest-wrong model named in its comment.
 *
 * KIT (RL / Electric / Defender / Burst III; ammo 24, chargeFrames 60, cd 40s):
 *   S1a  "entering Burst Stage 3", self: ATK +2.71% of the USER's final Max HP, 10 sec.
 *   S1b  "attacking with Full Charge", self: Charge Speed +100%, "Removed upon
 *        reloading to max ammunition" (NO wall-clock bound).
 *   S1c  "hitting a target with Full Charge", the target: +136.6% of final ATK.
 *   S2a  battle start, self: Decoy avatar @96% of final Max HP, continuous.
 *   S2b  "entering Burst Skill Stage 3", self: Decoy avatar @96% Max HP, continuous.
 *   S2c  every 3 sec while a decoy is present, self: Beautiful — Max HP +1.6%
 *        continuously, stacks up to 12.
 *   B1   random enemies: 1365.92% of final ATK, "sequentially for 10 time(s)".
 *   B2   same target(s) while in Beautiful: +28.9% of final ATK, "Mirrors the
 *        stack count of Beautiful" (=> up to x12 = 346.8%).
 *
 * FIXTURE: controlComp('cinderella', true) — liter B1 / crown B2 / cinderella B3 /
 * helm B3. Helm is deliberately KEPT IN: S1a and S2b key off "entering Burst
 * Stage 3" (ANY team stage-3 entry), which only diverges from "her own burst
 * cast" when a SECOND Burst III unit exists. Deterministic (no seed).
 *
 * WHY THE COUNTERFACTUALS DISCRIMINATE: each `patch()` below edits an in-memory
 * clone of the committed override (disk untouched) into the NEAREST-WRONG model
 * for one line — wrong trigger, wrong duration semantics, missing FB
 * participation, missing stack cap/ramp — and the paired assertion fails under
 * that model. Each patch also reports how many effects it matched, so a line the
 * override never encoded at all (MISSING) fails loudly instead of silently
 * passing as "no change".
 *
 * Runs: 10 full 180s sims, all hoisted to module scope.
 */
// DRIVER NOTE (gauntlet S5): import path retargeted from '../lib/harness.js' (the blind
// author's guess, which does not exist at this blind/ location) to the real harness location
// '../../tests/lib/harness.js'. No assertions changed — only the module path.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

const SLUG = 'cinderella';

type Ev = SimEvent & Record<string, any>;

// ---------------------------------------------------------------- override I/O
// withPatchedOverride returns a CLONE of the committed override; with a no-op
// mutator it is just a readable snapshot. The packet describes two possible
// slot shapes (slot -> Block[] on disk, slot -> CharacterSkills in memory), so
// slotBlocks() accepts either rather than guessing.
const OV: any = withPatchedOverride(SLUG, () => {});

function slotBlocks(ov: any, slot: string): any[] {
  const s = ov?.[slot];
  if (!s) {return [];}
  if (Array.isArray(s)) {return s;}
  if (Array.isArray(s.blocks)) {return s.blocks;}
  return [];
}
function slotEffects(ov: any, slot: string): any[] {
  return slotBlocks(ov, slot).flatMap((b: any) =>
    Array.isArray(b.effects) ? b.effects : []
  );
}
function blockFor(ov: any, slot: string, pred: (e: any) => boolean): any {
  return slotBlocks(ov, slot).find((b: any) => (b.effects ?? []).some(pred));
}
function editEffects(
  ov: any,
  slot: string,
  pred: (e: any) => boolean,
  fn: (e: any) => void
): number {
  let n = 0;
  for (const b of slotBlocks(ov, slot)) {
    for (const e of b.effects ?? []) {
      if (pred(e)) {
        fn(e);
        n++;
      }
    }
  }
  return n;
}
function patch(mutate: (ov: any) => number): { ov: any; n: number } {
  let n = 0;
  const ov = withPatchedOverride(SLUG, (o: any) => {
    n = mutate(o);
  });
  return { ov, n };
}

// 'attackDamagePct' does NOT match /atk/i ("att"), so this isolates the ATK
// family (atkPct / casterAtkPct / atkOfMaxHpPct / ...) without pinning a key.
const isAtkBuff = (e: any) =>
  e.kind === 'buff' && /atk/i.test(String(e.stat ?? ''));
const isChargeSpeed = (e: any) =>
  e.kind === 'buff' && e.stat === 'chargeSpeedPct';
const isFlat = (e: any) => e.kind === 'flatDamage';
const isHpBuff = (e: any) =>
  e.kind === 'buff' && /hp/i.test(String(e.stat ?? ''));
const isBigBurst = (e: any) => isFlat(e) && Number(e.atkPct) >= 1000;
const isMirror = (e: any) => isFlat(e) && Number(e.atkPct) < 1000;

// --------------------------------------------------------------------- runs
function run(ov?: any, helm = true) {
  const evs: Ev[] = [];
  const opts: any = controlComp(SLUG, helm);
  opts.onEvent = (ev: SimEvent) => {
    evs.push(ev as Ev);
  };
  if (ov) {opts.overrides = { ...(opts.overrides ?? {}), [SLUG]: ov };}
  const res = runComp(opts);
  return { res, evs, total: totals(res)[SLUG] ?? 0 };
}

const CF_ATK_ZERO = patch((ov) =>
  editEffects(ov, 'skill1', isAtkBuff, (e) => {
    e.value = 0;
  })
);
const CF_ATK_BURSTCAST = patch((ov) => {
  const b = blockFor(ov, 'skill1', isAtkBuff);
  if (!b) {return 0;}
  b.trigger = { kind: 'burstCast' };
  return 1;
});
const CF_CS_ZERO = patch((ov) =>
  editEffects(ov, 'skill1', isChargeSpeed, (e) => {
    e.value = 0;
  })
);
const CF_CS_TIMED = patch((ov) =>
  editEffects(ov, 'skill1', isChargeSpeed, (e) => {
    delete e.removeOnReload;
    e.durationSec = 10;
  })
);
const CF_RIDER_ZERO = patch((ov) =>
  editEffects(ov, 'skill1', isFlat, (e) => {
    e.atkPct = 0;
  })
);
const CF_RIDER_NOFB = patch((ov) =>
  editEffects(ov, 'skill1', isFlat, (e) => {
    e.noFb = true;
  })
);
const CF_BEAUTIFUL_ZERO = patch((ov) =>
  editEffects(ov, 'skill2', isHpBuff, (e) => {
    e.value = 0;
  })
);
const CF_MIRROR_ZERO = patch((ov) =>
  editEffects(ov, 'burst', isMirror, (e) => {
    e.atkPct = 0;
  })
);
const CF_MIRROR_NORAMP = patch((ov) =>
  editEffects(ov, 'burst', isMirror, (e) => {
    delete e.rampSec;
  })
);

const BASE = run();
const R_ATK_ZERO = run(CF_ATK_ZERO.ov);
const R_ATK_BURSTCAST = run(CF_ATK_BURSTCAST.ov);
const R_CS_ZERO = run(CF_CS_ZERO.ov);
const R_CS_TIMED = run(CF_CS_TIMED.ov);
const R_RIDER_ZERO = run(CF_RIDER_ZERO.ov);
const R_RIDER_NOFB = run(CF_RIDER_NOFB.ov);
const R_BEAUTIFUL_ZERO = run(CF_BEAUTIFUL_ZERO.ov);
const R_MIRROR_ZERO = run(CF_MIRROR_ZERO.ov);
const R_MIRROR_NORAMP = run(CF_MIRROR_NORAMP.ov);

// ------------------------------------------------------------- event helpers
const kind = (evs: Ev[], k: string) => evs.filter((e) => e.kind === k);

// A SELF buff is the only one where casterIdx === targetIdx, which cleanly
// separates her own grants from liter/crown/helm buffs landing on her.
const selfBuffs = (evs: Ev[]) =>
  evs.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.targetSlug === SLUG &&
      e.casterIdx != null &&
      e.casterIdx === e.targetIdx
  );

const IDX: number = (() => {
  const e = selfBuffs(BASE.evs)[0];
  return e ? Number(e.targetIdx) : -1;
})();

// Damage-event attribution: the packet does not name the source field, so try
// the plausible ones. The 'attribution sanity' test below fails loudly if none
// of them resolve, rather than letting the event-level groups pass vacuously.
const SLUG_FIELDS = [
  'slug',
  'unitSlug',
  'srcSlug',
  'casterSlug',
  'ownerSlug',
  'attackerSlug',
];
const IDX_FIELDS = [
  'srcIdx',
  'unitIdx',
  'ownerIdx',
  'attackerIdx',
  'casterIdx',
  'idx',
];
function fromHer(e: any): boolean {
  for (const f of SLUG_FIELDS)
    {if (typeof e[f] === 'string') {return e[f] === SLUG;}}
  if (IDX >= 0)
    {for (const f of IDX_FIELDS)
      {if (typeof e[f] === 'number') {return e[f] === IDX;}}}
  return false;
}
const herDamage = (evs: Ev[]) =>
  evs.filter((e) => e.kind === 'damage' && fromHer(e));
const teammates = (r: any) =>
  Object.fromEntries(Object.entries(totals(r)).filter(([s]) => s !== SLUG));

const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

// =============================================================================
describe('cinderella — fixture non-vacuity', () => {
  it('the comp actually bursts, fires and reloads (else every gate below is untested)', () => {
    expect(unitOf(BASE.res, SLUG).totalDamage).toBeGreaterThan(0);
    expect(kind(BASE.evs, 'fullBurstStart').length).toBeGreaterThan(0);
    expect(kind(BASE.evs, 'shot').length).toBeGreaterThan(0);
    expect(kind(BASE.evs, 'reload').length).toBeGreaterThan(0);
    expect(selfBuffs(BASE.evs).length).toBeGreaterThan(0);
  });

  it('damage events are attributable to her (guards the event-level groups)', () => {
    expect(herDamage(BASE.evs).length).toBeGreaterThan(0);
    // Something of hers lands inside Full Burst — required for the S1c noFb
    // counterfactual to be a real discriminator rather than a no-op.
    expect(herDamage(BASE.evs).some((e) => e.inFullBurst === true)).toBe(true);
  });
});

// =============================================================================
describe('S1a — enter Burst Stage 3, self: ATK +2.71% of final Max HP for 10s', () => {
  it('is an HP-scaled ATK grant of 2.71 with a 10 SECOND window (not rounds)', () => {
    const fx = slotEffects(OV, 'skill1').filter(isAtkBuff);
    expect(fx.length).toBe(1); // MISSING/duplicate detector
    // Nearest-wrong: a plain atkPct 2.71 (a % of her own ATK, ~nothing on a
    // Defender) instead of a % of her Max HP — which is what makes S2c's
    // Beautiful stacks offensive at all.
    expect(Number(fx[0].value)).toBeCloseTo(2.71, 6);
    expect(/hp/i.test(String(fx[0].stat))).toBe(true);
    // Duration semantics: "for 10 sec" is wall-clock, never a round count.
    expect(fx[0].durationSec).toBe(10);
    expect(fx[0].durationShots).toBeUndefined();
  });

  it('is keyed to ANY stage-3 entry and scoped to self', () => {
    const b = blockFor(OV, 'skill1', isAtkBuff);
    expect(b).toBeTruthy();
    // "Activates when entering Burst Stage 3" = stageEnter{stage:3} (fires when
    // ANY ally casts a stage-3 burst). Nearest-wrong: burstCast (own cast only,
    // under-fires whenever helm takes the stage-3 slot) or fullBurstEnter
    // (fires at FB open, not at the cast).
    expect(b.trigger?.kind).toBe('stageEnter');
    expect(b.trigger?.stage).toBe(3);
    expect(b.target?.kind).toBe('self');
  });

  it('fires once per rotation, and the own-cast model fires no more often', () => {
    const grants = selfBuffs(BASE.evs).filter((e) =>
      /atk/i.test(String(e.stat ?? ''))
    );
    const fbs = kind(BASE.evs, 'fullBurstStart').length;
    expect(grants.length).toBe(fbs); // one stage-3 entry per rotation
    expect(grants.every((e) => Number(e.value) > 0)).toBe(true);
    expect(grants.every((e) => Number.isFinite(Number(e.expiresFrame)))).toBe(
      true
    );
    // Discriminator vs the burstCast reading: re-keyed to her OWN cast, the
    // grant can only fire on rotations she bursts — never more often. (Strictly
    // fewer only when helm actually takes a stage-3 slot in this fixture; the
    // count equality above is the primary claim.)
    const cfGrants = selfBuffs(R_ATK_BURSTCAST.evs).filter((e) =>
      /atk/i.test(String(e.stat ?? ''))
    );
    expect(CF_ATK_BURSTCAST.n).toBe(1);
    expect(cfGrants.length).toBeLessThanOrEqual(grants.length);
  });

  it('is load-bearing on her damage and INERT on teammates (self scope)', () => {
    expect(CF_ATK_ZERO.n).toBeGreaterThan(0);
    expect(R_ATK_ZERO.total).toBeLessThan(BASE.total);
    // ATK is damage-only (no gauge/shot-count coupling), so a mis-scope to
    // allies would show up here as moved teammate totals.
    expect(teammates(R_ATK_ZERO.res)).toEqual(teammates(BASE.res));
  });
});

// =============================================================================
describe('S1b — full-charge attack, self: Charge Speed +100%, removed on reload-to-max', () => {
  it('is chargeSpeedPct 100 with removeOnReload and NO time bound', () => {
    const fx = slotEffects(OV, 'skill1').filter(isChargeSpeed);
    expect(fx.length).toBe(1);
    expect(Number(fx[0].value)).toBeCloseTo(100, 6);
    // Duration semantics: the kit gives no seconds — the ONLY terminator is
    // reloading to max. Nearest-wrong: an invented durationSec window.
    expect(fx[0].removeOnReload).toBe(true);
    expect(fx[0].durationSec).toBeUndefined();
    const b = blockFor(OV, 'skill1', isChargeSpeed);
    expect(['shotFired', 'hitCount']).toContain(b.trigger?.kind);
    if (b.trigger?.kind === 'hitCount') {expect(b.trigger.count).toBe(1);}
    expect(b.target?.kind).toBe('self');
  });

  it('re-applies per shot and is stripped at reload (buffRemove cause reload)', () => {
    const applies = BASE.evs.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.stat === 'chargeSpeedPct' &&
        e.targetSlug === SLUG
    );
    expect(applies.length).toBeGreaterThan(10);
    expect(applies.every((e) => Number(e.value) === 100)).toBe(true);
    // The engine emits buffRemove ONLY for removeOnReload buffs at reload-to-max,
    // so its presence here IS the semantics proof.
    const removes = BASE.evs.filter(
      (e) =>
        e.kind === 'buffRemove' &&
        (e.stat === undefined || e.stat === 'chargeSpeedPct')
    );
    expect(removes.length).toBeGreaterThan(0);
    // Nearest-wrong (timed window, no reload strip): zero reload-cause removals.
    expect(CF_CS_TIMED.n).toBeGreaterThan(0);
    const cfRemoves = R_CS_TIMED.evs.filter(
      (e) =>
        e.kind === 'buffRemove' &&
        (e.stat === undefined || e.stat === 'chargeSpeedPct')
    );
    expect(cfRemoves.length).toBe(0);
  });

  it('charge speed IS damage — it gates shots fired', () => {
    // Failure-mode 6: a weapon-state modifier is never "defensive, skip".
    expect(CF_CS_ZERO.n).toBeGreaterThan(0);
    expect(R_CS_ZERO.total).toBeLessThan(BASE.total);
    const herShots = kind(BASE.evs, 'shot').length;
    const cfShots = kind(R_CS_ZERO.evs, 'shot').length;
    expect(cfShots).toBeLessThan(herShots);
  });
});

// =============================================================================
describe('S1c — full-charge HIT on the target: +136.6% of final ATK', () => {
  it('is a 136.6% flat rider on the enemy, with no core strike', () => {
    const fx = slotEffects(OV, 'skill1').filter(isFlat);
    expect(fx.length).toBe(1);
    expect(Number(fx[0].atkPct)).toBeCloseTo(136.6, 6);
    // The text says "additional damage", not "core strike damage" — a rider gets
    // no core bucket. Nearest-wrong: core:true (over-credits at 200% core mult).
    expect(fx[0].core).not.toBe(true);
    expect(blockFor(OV, 'skill1', isFlat).target?.kind).toBe('enemy');
  });

  it('lands per full-charge hit and takes Full Burst by timing', () => {
    expect(CF_RIDER_ZERO.n).toBeGreaterThan(0);
    expect(R_RIDER_ZERO.total).toBeLessThan(BASE.total);
    // Nearest-wrong: noFb:true. A function-damage rider is FB-eligible by
    // landing time (only burst-CAST damage is exempt), so exempting it must
    // strictly lose damage in a fixture that has Full Bursts.
    expect(CF_RIDER_NOFB.n).toBeGreaterThan(0);
    expect(R_RIDER_NOFB.total).toBeLessThan(BASE.total);
  });
});

// =============================================================================
describe('S2a/S2b — Decoy avatars @96% Max HP (continuous)', () => {
  it('the decoy is recorded, not silently dropped, and is not a heal', () => {
    const fx = slotEffects(OV, 'skill2');
    // A decoy is neither a heal nor a recovery event: encoding it as `heal`
    // would fire crown's on-recovery trigger — a cross-unit over-credit.
    expect(fx.some((e: any) => e.kind === 'heal')).toBe(false);
    // No-silent-drops: either it is carried as a shield-style record or it is
    // listed verbatim in `unmodeled.skill2`.
    const recorded =
      fx.some((e: any) => e.kind === 'shield') ||
      (OV?.unmodeled?.skill2 ?? []).length > 0;
    expect(recorded).toBe(true);
  });

  it.skip('GAP: the avatar entity itself (96% Max HP decoy, taunt/HP pool) is unmodelable in v1 — the boss deals no damage and there is no avatar entity, so both decoy lines are damage-inert except as the always-satisfied precondition for S2c', () => {});

  it.skip('GAP: S2b (a SECOND decoy at stage-3 entry) is indistinguishable from S2a in a model with no avatar entity — nothing observable separates one decoy from two', () => {});
});

// =============================================================================
describe('S2c — every 3s while a decoy is present, self: Max HP +1.6%, max 12 stacks', () => {
  it('is a self Max HP buff of 1.6, capped at 12 stacks, with no expiry', () => {
    const fx = slotEffects(OV, 'skill2').filter(isHpBuff);
    expect(fx.length).toBe(1);
    expect(Number(fx[0].value)).toBeCloseTo(1.6, 6);
    // "stacks up to 12 times" — nearest-wrong: no maxStacks (unbounded ramp to
    // 60 stacks over a 180s fight, ~5x the real cap).
    expect(fx[0].maxStacks).toBe(12);
    // "continuously" — nearest-wrong: a durationSec that lets stacks lapse.
    expect(fx[0].durationSec).toBeUndefined();
    const b = blockFor(OV, 'skill2', isHpBuff);
    expect(b.trigger?.kind).toBe('interval');
    expect(Number(b.trigger?.sec)).toBe(3);
    expect(b.target?.kind).toBe('self');
  });

  it('stacks 1..12 in the event log and never exceeds the cap', () => {
    const beautiful = selfBuffs(BASE.evs).filter((e) => e.maxStacks === 12);
    // 180s / 3s => ~60 applications; the cap bounds the STACKS, not the applies.
    expect(beautiful.length).toBeGreaterThanOrEqual(12);
    const stacks = beautiful.map((e) => Number(e.stacks));
    expect(Math.max(...stacks)).toBe(12);
    expect(stacks.every((s) => s >= 1 && s <= 12)).toBe(true);
    // Ramp shape: the first application is a single stack, not an instant cap.
    expect(stacks[0]).toBe(1);
  });

  it('feeds her own S1a HP->ATK conversion, and is INERT on teammates', () => {
    // Whole-picture: Beautiful is not a defensive throwaway — 12 x 1.6% Max HP
    // enlarges the 2.71%-of-Max-HP ATK grant. Zeroing it must lose her damage.
    // (Self-granted Max HP feeds the conversion; ally-granted does not.)
    expect(CF_BEAUTIFUL_ZERO.n).toBeGreaterThan(0);
    expect(R_BEAUTIFUL_ZERO.total).toBeLessThan(BASE.total);
    expect(teammates(R_BEAUTIFUL_ZERO.res)).toEqual(teammates(BASE.res));
  });
});

// =============================================================================
describe('burst — 1365.92% x10 sequential + the Beautiful mirror rider', () => {
  it('is TEN discrete 1365.92% hits, not one merged hit', () => {
    const big = slotEffects(OV, 'burst').filter(isBigBurst);
    expect(big.length).toBe(10);
    expect(big.every((e: any) => near(Number(e.atkPct), 1365.92, 1e-6))).toBe(
      true
    );
    // Nearest-wrong: a single 13659.2% hit — same total, but wrong crit/core
    // granularity and wrong interaction with per-hit riders.
    const b = blockFor(OV, 'burst', isBigBurst);
    expect(b.trigger?.kind).toBe('burstCast');
    expect(b.target?.kind).toBe('enemy');
  });

  it('the sequential volley is sequential-flavored (feeds Sequential Attack Damage)', () => {
    // "Attacks sequentially for 10 time(s)" — spec claim; a missing flavor makes
    // her blind to any sequentialDamagePct / sequentialMultPct support.
    const big = slotEffects(OV, 'burst').filter(isBigBurst);
    expect(big.every((e: any) => e.flavor === 'sequential')).toBe(true);
  });

  it('burst-cast damage is Full-Burst exempt and lands 10x per cast', () => {
    const casts = BASE.evs.filter(
      (e) => e.kind === 'burstCast' && fromHer(e)
    ).length;
    expect(casts).toBeGreaterThan(0);
    const hits = herDamage(BASE.evs).filter((e) => e.srcSlot === 'burst');
    expect(hits.length).toBeGreaterThanOrEqual(10 * casts);
    expect(hits.length % casts).toBe(0);
    // A burst cast resolves before the Full Burst window opens — nearest-wrong:
    // the volley picking up the +50% FB major.
    expect(hits.every((e) => e.fbMajorApplied !== true)).toBe(true);
  });

  it('the mirror rider is a whole multiple of 28.9%, capped at x12 stacks', () => {
    const mirror = slotEffects(OV, 'burst').filter(isMirror);
    expect(mirror.length).toBeGreaterThan(0);
    // "Mirrors the stack count of Beautiful" with Beautiful capped at 12 => the
    // authored magnitude must be 28.9 x k, k in 1..12. Nearest-wrong: an
    // uncapped or arbitrary magnitude (e.g. 28.9 x 60 stacks).
    for (const e of mirror) {
      const k = Number(e.atkPct) / 28.9;
      expect(near(k, Math.round(k), 1e-4)).toBe(true);
      expect(Math.round(k)).toBeGreaterThanOrEqual(1);
      expect(Math.round(k)).toBeLessThanOrEqual(12);
    }
    // Instance count: once per cast (my reading) or once per sequential hit are
    // the two defensible readings; 3 or 7 instances would be neither.
    expect([1, 10]).toContain(mirror.length);
  });

  it('a max-stack-authored mirror must ramp (an early burst mirrors fewer stacks)', () => {
    const mirror = slotEffects(OV, 'burst').filter(isMirror);
    const maxAuthored = Math.max(...mirror.map((e: any) => Number(e.atkPct)));
    expect(CF_MIRROR_ZERO.n).toBeGreaterThan(0);
    expect(R_MIRROR_ZERO.total).toBeLessThan(BASE.total);
    if (maxAuthored >= 289) {
      // Authored at (near) 12 stacks: Beautiful needs 12 x 3s = 36s to cap, so a
      // flat 12-stack rider over-credits every burst before t=36s.
      for (const e of mirror.filter((x: any) => Number(x.atkPct) >= 289)) {
        expect(Number(e.rampSec)).toBeGreaterThanOrEqual(24);
        expect(Number(e.rampSec)).toBeLessThanOrEqual(48);
      }
      // Nearest-wrong: no ramp => the early burst mirrors 12 stacks it does not
      // have => strictly MORE damage.
      expect(CF_MIRROR_NORAMP.n).toBeGreaterThan(0);
      expect(R_MIRROR_NORAMP.total).toBeGreaterThan(BASE.total);
    } else {
      // Authored per-stack: the engine must be supplying the stack count some
      // other way, so a ramp would double-discount.
      expect(mirror.every((e: any) => e.rampSec === undefined)).toBe(true);
    }
  });

  it.skip('GAP (measurement-gated): whether the mirror rider fires ONCE per burst or once per sequential hit, and whether it crits, needs popup counting on a recorded burst — the prose ("Affects the same target(s)") does not settle it', () => {});
});
