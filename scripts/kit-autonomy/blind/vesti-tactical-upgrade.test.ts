/**
 * vesti-tactical-upgrade — "Vesti: Tactical Upgrade" (RL / Fire / Attacker / Burst III,
 * cd 40s, ammo 8, chargeFrames 120). BLIND cross-family kit spec: written from the kit prose
 * alone, with no sight of the driver's override, tests, or reasoning.
 *
 * KIT AS READ (line -> reading):
 *   S1a on a Full Charge attack WHILE NOT in Missile Guide, self:
 *         "Charge Speed 100% for 3 round(s)"    -> buff chargeSpeedPct 100,   durationShots 3
 *         "Charge Damage 58.5% for 3 round(s)"  -> buff chargeDamagePct 58.5, durationShots 3
 *   S1b on reloading to max ammunition, self: "Removes Missile Guide"
 *                                             -> removeOnReload on BOTH S1a buffs
 *   S2a on landing Full Charge attacks, target: 266.6% of final ATK as TRUE damage
 *                                             -> flatDamage flavor 'true', one per round
 *   S2b same trigger, gated on SELF in "Battle Formation": ATK 20% / 3s -> GAP (no self-status gate)
 *   S2c same trigger, gated on TARGET in "Explosive Round": Projectile Explosion Damage 20% / 3s
 *                                             -> requiresTargetStatus gate, inert (no carrier)
 *   B1  self: "Explosion Radius 100% / 10s"   -> GAP (no radius primitive)
 *       self: "True Damage 60% / 10s"         -> buff trueDamagePct 60, durationSec 10
 *   B2  all enemies: 492.3% of final ATK as Burst Skill TRUE damage
 *                                             -> flatDamage flavor 'true' on burstCast
 *
 * FIXTURE — controlComp(SLUG, false): liter B1 / crown B2 / vesti B3, fixed-B3 slot OFF.
 *   The fixed B3 is dropped on purpose: she is a charge-damage buffer (her grants land in exactly
 *   the bucket every S1 assertion reads) AND a second Burst III that would contest vesti's
 *   rotations. One extra run KEEPS her (`dual`) solely to ask the trigger-identity question —
 *   burst-cast vs full-burst-enter only diverge when another same-tier unit is on the field.
 *
 * WHY THESE DISCRIMINATE: each withPatchedOverride run deletes exactly ONE kit line's encoding,
 * so green-base + red-counterfactual proves the line is LIVE rather than merely present in JSON;
 * the event-log assertions pin the STRUCTURAL claims (round-count vs seconds, self-only scope,
 * reload removal, gate closure, FB/range eligibility) that a totals delta cannot distinguish.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import type { Block, EffectDef } from '../../../src/skills/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUG = 'vesti-tactical-upgrade';

type CompOpts = Parameters<typeof runComp>[0];
type PatchedOverride = ReturnType<typeof withPatchedOverride>;

/* ---------- structural event views (local shapes; never widen to `any`) ---------- */
type BuffApplyEv = {
  kind: 'buffApply';
  stat: string;
  value: number;
  casterIdx: number | null;
  targetIdx: number | null;
  targetSlug?: string;
  expiresFrame?: number;
  durationShots?: number;
};
type BuffRemoveEv = {
  kind: 'buffRemove';
  stat?: string;
  targetSlug?: string;
  cause?: string;
};
type DamageEv = {
  kind: 'damage';
  bucket?: string;
  srcSlot?: string;
  inFullBurst?: boolean;
  fbMajorApplied?: boolean;
  rangeApplied?: boolean;
};
type BurstCastEv = { kind: 'burstCast' };
type FbStartEv = { kind: 'fullBurstStart' };

function view<T>(events: SimEvent[], kind: string): T[] {
  return events.filter(
    (e) => (e as unknown as { kind: string }).kind === kind
  ) as unknown as T[];
}

/** The event stream's owner-slug channel is not part of the documented API; probe the
 *  plausible field names, and if NOTHING carries a slug fall back to the unfiltered set
 *  (in this control comp liter/crown emit no skill-sourced damage, so the fallback is safe). */
function evSlug(e: unknown): string | undefined {
  const r = e as {
    slug?: string;
    unitSlug?: string;
    casterSlug?: string;
    srcSlug?: string;
  };
  return r.slug ?? r.unitSlug ?? r.casterSlug ?? r.srcSlug;
}
function slugTagged(evs: unknown[]): boolean {
  return evs.some((e) => evSlug(e) !== undefined);
}
function mine<T>(evs: T[]): T[] {
  return slugTagged(evs) ? evs.filter((e) => evSlug(e) === SLUG) : evs;
}

/* ---------- override patching (shape-tolerant: slot may be Block[] or {blocks}) ---------- */
type SlotHolder = Block[] | { blocks?: Block[] } | undefined;
type OvLike = { skill1?: SlotHolder; skill2?: SlotHolder; burst?: SlotHolder };

function blocksOf(slot: SlotHolder): Block[] {
  if (Array.isArray(slot)) {
    return slot;
  }
  if (slot && Array.isArray(slot.blocks)) {
    return slot.blocks;
  }
  return [];
}
function allBlocks(ov: OvLike): Block[] {
  return [
    ...blocksOf(ov.skill1),
    ...blocksOf(ov.skill2),
    ...blocksOf(ov.burst),
  ];
}
function isBuff(e: EffectDef, stat: string): boolean {
  return e.kind === 'buff' && e.stat === stat;
}
function isFlat(e: EffectDef, atkPct: number): boolean {
  return e.kind === 'flatDamage' && Math.abs(e.atkPct - atkPct) < 0.01;
}
/** Mutates each block's `effects` IN PLACE, so it works whichever container holds the block. */
function dropEffects(blocks: Block[], pred: (e: EffectDef) => boolean): number {
  let n = 0;
  for (const b of blocks) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e) => !pred(e));
    n += before - b.effects.length;
  }
  return n;
}
function patch(mutate: (ov: OvLike) => number): {
  ov: PatchedOverride;
  dropped: number;
} {
  let dropped = 0;
  const ov = withPatchedOverride(SLUG, (o) => {
    dropped = mutate(o as unknown as OvLike);
  });
  return { ov, dropped };
}

/* ---------- runs (each is a full 180s sim — hoisted, 8 total) ---------- */
function runWith(ovr: PatchedOverride | undefined, fixedB3: boolean) {
  const events: SimEvent[] = [];
  const onEvent = (ev: SimEvent) => {
    events.push(ev);
  };
  const c = controlComp(SLUG, fixedB3) as CompOpts & {
    cfg?: Record<string, unknown>;
    overrides?: Record<string, unknown>;
  };
  const opts = {
    ...c,
    overrides: ovr ? { ...(c.overrides ?? {}), [SLUG]: ovr } : c.overrides,
    onEvent,
    cfg: { ...(c.cfg ?? {}), onEvent },
  } as unknown as CompOpts;
  const res = runComp(opts);
  return { events, res, total: totals(res)[SLUG] };
}

const pNoChargeSpeed = patch((ov) =>
  dropEffects(allBlocks(ov), (e) => isBuff(e, 'chargeSpeedPct'))
);
const pNoChargeDmg = patch((ov) =>
  dropEffects(allBlocks(ov), (e) => isBuff(e, 'chargeDamagePct'))
);
const pNoRider = patch((ov) =>
  dropEffects(allBlocks(ov), (e) => isFlat(e, 266.6))
);
const pNoNuke = patch((ov) =>
  dropEffects(allBlocks(ov), (e) => isFlat(e, 492.3))
);
const pNoTrueBuff = patch((ov) =>
  dropEffects(allBlocks(ov), (e) => isBuff(e, 'trueDamagePct'))
);
const pOpenExplosive = patch((ov) => {
  let n = 0;
  for (const b of allBlocks(ov)) {
    if (!b.effects.some((e) => isBuff(e, 'projectileExplosionPct'))) {
      continue;
    }
    const g = b as Block & { requiresTargetStatus?: string };
    if (g.requiresTargetStatus !== undefined) {
      delete g.requiresTargetStatus;
      n += 1;
    }
  }
  return n;
});

const base = runWith(undefined, false);
const dual = runWith(undefined, true);
const noChargeSpeed = runWith(pNoChargeSpeed.ov, false);
const noChargeDmg = runWith(pNoChargeDmg.ov, false);
const noRider = runWith(pNoRider.ov, false);
const noNuke = runWith(pNoNuke.ov, false);
const noTrueBuff = runWith(pNoTrueBuff.ov, false);
const openExplosive = runWith(pOpenExplosive.ov, false);

const buffs = (r: { events: SimEvent[] }) =>
  view<BuffApplyEv>(r.events, 'buffApply');
const self = (r: { events: SimEvent[] }, stat: string) =>
  buffs(r).filter((b) => b.stat === stat && b.targetSlug === SLUG);
const dmg = (r: { events: SimEvent[] }) => view<DamageEv>(r.events, 'damage');
const riders = (r: { events: SimEvent[] }) =>
  mine(dmg(r).filter((d) => d.srcSlot === 'skill2'));
const nukes = (r: { events: SimEvent[] }) =>
  mine(dmg(r).filter((d) => d.srcSlot === 'burst'));

describe('vesti-tactical-upgrade — sanity', () => {
  it('the control fixture actually runs the unit', () => {
    expect(base.total).toBeGreaterThan(0);
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
    // non-vacuity for every counterfactual below: each deleted exactly what it claimed to.
    expect(pNoChargeSpeed.dropped).toBeGreaterThan(0);
    expect(pNoChargeDmg.dropped).toBeGreaterThan(0);
    expect(pNoRider.dropped).toBeGreaterThan(0);
    expect(pNoNuke.dropped).toBeGreaterThan(0);
    expect(pNoTrueBuff.dropped).toBeGreaterThan(0);
  });
});

describe('S1 — Missile Guide (Charge Speed 100% + Charge Damage 58.5%, 3 rounds)', () => {
  it('grants both Missile Guide stats to SELF', () => {
    const cs = self(base, 'chargeSpeedPct');
    const cd = self(base, 'chargeDamagePct');
    expect(cs.length).toBeGreaterThan(0);
    expect(cd.length).toBeGreaterThan(0);
    expect(cs[0].value).toBe(100);
    expect(cd[0].value).toBe(58.5);
  });

  it('scopes both grants by ROUND count (3), not wall-clock seconds', () => {
    // Nearest-wrong: durationSec:3. Her charge cycle under the doubled speed is ~1.4s, so a
    // 3-second window is behaviourally near-identical — totals cannot tell them apart. The
    // buffApply payload can: a rounds-encoding carries durationShots, a seconds-encoding does not.
    for (const b of [
      ...self(base, 'chargeSpeedPct'),
      ...self(base, 'chargeDamagePct'),
    ]) {
      expect(b.durationShots).toBe(3);
    }
  });

  it('re-arms at least once per 3 rounds (the "while not in Missile Guide" cycle)', () => {
    // FAITHFUL: fires on a full charge only when the status is down, i.e. once per 3 rounds,
    // which (because the window is exactly 3 rounds) makes the status continuously live.
    // An ungated per-round encoding is damage-equivalent here; a too-rare encoding
    // (e.g. chargeCounter every 3rd charge with a 3-round window mis-phased, or an
    // interval/lastBullet trigger) is NOT — this bounds the apply rate on both sides.
    const rounds = riders(base).length;
    const applies = self(base, 'chargeDamagePct').length;
    expect(rounds).toBeGreaterThan(0);
    expect(applies).toBeGreaterThanOrEqual(Math.floor(rounds / 3));
    expect(applies).toBeLessThanOrEqual(rounds + 1);
  });

  it('Charge Speed 100% is a real weapon-state modifier: it buys rounds and damage', () => {
    // Charge speed is not cosmetic — halving the 120-frame charge raises shots fired, so the
    // rider count (one per landed full charge) must fall when the buff is removed.
    expect(riders(base).length).toBeGreaterThan(riders(noChargeSpeed).length);
    expect(base.total).toBeGreaterThan(noChargeSpeed.total);
  });

  it('Charge Damage is ADDITIVE chargeDamagePct, not chargeDamageMultPct', () => {
    // Nearest-wrong: chargeDamageMultPct scales BASE charge damage (undiluted) and would
    // over-credit against every co-active support buff.
    expect(self(base, 'chargeDamagePct').length).toBeGreaterThan(0);
    expect(self(base, 'chargeDamageMultPct').length).toBe(0);
    expect(base.total).toBeGreaterThan(noChargeDmg.total);
  });

  it('Missile Guide is REMOVED on reloading to max ammunition', () => {
    // The engine emits buffRemove ONLY for removeOnReload buffs at reload-to-max, so the
    // presence of these events IS the S1b encoding. Nearest-wrong (durationShots alone,
    // no removeOnReload) emits nothing here.
    const removed = view<BuffRemoveEv>(base.events, 'buffRemove').filter(
      (r) => r.targetSlug === SLUG
    );
    expect(removed.length).toBeGreaterThan(0);
    expect(removed.some((r) => r.stat === 'chargeSpeedPct')).toBe(true);
    expect(removed.some((r) => r.stat === 'chargeDamagePct')).toBe(true);
    expect(removed.every((r) => r.cause === 'reload')).toBe(true);
  });

  it('never leaks the Missile Guide grants to teammates ("Affects self")', () => {
    const leaked = buffs(base).filter(
      (b) =>
        (b.stat === 'chargeSpeedPct' || b.stat === 'chargeDamagePct') &&
        b.targetSlug !== undefined &&
        b.targetSlug !== SLUG
    );
    expect(leaked).toEqual([]);
  });
});

describe('S2 — full-charge riders', () => {
  it('fires one 266.6% true-damage rider per landed full charge', () => {
    // Trigger identity: "when landing Full Charge attacks" = once per round. Nearest-wrong
    // encodings (hitCount / interval / lastBullet) decouple the rider count from the round count.
    const r = riders(base);
    expect(r.length).toBeGreaterThan(20);
    expect(riders(noRider).length).toBe(0);
  });

  it('the rider is range-exempt and takes the Full Burst major by TIMING', () => {
    const r = riders(base);
    // +30% full-range bonus is universally OFF on function-damage riders.
    expect(r.every((d) => d.rangeApplied === false)).toBe(true);
    // ...but a rider that lands inside Full Burst DOES take the +50% major (no noFb).
    const inFb = r.filter((d) => d.inFullBurst === true);
    expect(inFb.length).toBeGreaterThan(0);
    expect(inFb.every((d) => d.fbMajorApplied === true)).toBe(true);
  });

  it('the rider is real damage, and moves ONLY vesti', () => {
    expect(noRider.total).toBeLessThan(base.total);
    expect(totals(noRider).liter).toBe(totals(base).liter);
    expect(totals(noRider).crown).toBe(totals(base).crown);
  });

  it('"Battle Formation" ATK 20% is NOT credited ungated', () => {
    // No line in this kit puts self into Battle Formation and the schema has no self-status
    // gate, so the conservative reading is INERT. An ungated encoding would show a flat
    // atkPct=20 self-buff on every round — that is the over-credit this pins down.
    const bf = self(base, 'atkPct').filter((b) => b.value === 20);
    expect(bf).toEqual([]);
  });

  it('"Explosive Round" gate is CLOSED on the scope-lock boss', () => {
    // Nothing in this kit (or the control comp) inflicts Explosive Round, so the
    // Projectile Explosion Damage 20% rider must never fire.
    expect(self(base, 'projectileExplosionPct')).toEqual([]);
  });

  it('...and the target-status GATE is what suppresses it (non-vacuity)', () => {
    // Proves the block exists, is wired to a real per-round trigger, and is silenced by
    // requiresTargetStatus rather than being absent/mis-gated (mode, resourceGate, dropped).
    expect(pOpenExplosive.dropped).toBeGreaterThan(0);
    expect(
      self(openExplosive, 'projectileExplosionPct').length
    ).toBeGreaterThan(0);
    expect(self(openExplosive, 'projectileExplosionPct')[0].value).toBe(20);
  });

  it.skip('GAP: "if self is in Battle Formation status" has no engine primitive', () => {
    // requiresTargetStatus is boss-scoped; requiresShielded is shields; `mode` is a user
    // choice, not a combat status. Until a carrier/measurement exists this line stays
    // unmodeled (documented in `unmodeled`), not silently always-on.
  });
});

describe('Burst — True Damage 60% / 10s + 492.3% true nuke', () => {
  it('grants True Damage 60% to self', () => {
    const td = self(base, 'trueDamagePct');
    expect(td.length).toBeGreaterThan(0);
    expect(td[0].value).toBe(60);
    const leaked = buffs(base).filter(
      (b) =>
        b.stat === 'trueDamagePct' &&
        b.targetSlug !== undefined &&
        b.targetSlug !== SLUG
    );
    expect(leaked).toEqual([]);
  });

  it('the True Damage buff is TIME-bounded (10s), not round-bounded', () => {
    // Nearest-wrong: durationShots. "for 10 sec" is wall-clock; a rounds encoding would
    // stretch across her slow charge cycle and roughly double the live window.
    for (const b of self(base, 'trueDamagePct')) {
      expect(b.durationShots).toBeUndefined();
      expect(b.expiresFrame).toBeDefined();
    }
  });

  it('the True Damage buff is live damage (it feeds her true-flavored output)', () => {
    expect(noTrueBuff.total).toBeLessThan(base.total);
    expect(totals(noTrueBuff).liter).toBe(totals(base).liter);
    expect(totals(noTrueBuff).crown).toBe(totals(base).crown);
  });

  it('deals a 492.3% true-damage nuke, once per own burst cast', () => {
    const n = nukes(base);
    expect(n.length).toBeGreaterThan(0);
    expect(n.length).toBe(self(base, 'trueDamagePct').length);
    expect(noNuke.total).toBeLessThan(base.total);
    expect(totals(noNuke).liter).toBe(totals(base).liter);
  });

  it('the nuke is FB-major-exempt and range-exempt (burst-cast lands before the FB window)', () => {
    const n = nukes(base);
    expect(n.every((d) => d.fbMajorApplied === false)).toBe(true);
    expect(n.every((d) => d.rangeApplied === false)).toBe(true);
  });

  it('the self True Damage buff is applied BEFORE the nuke resolves', () => {
    // Ordering within the burst slot is a real damage decision the prose leaves implicit;
    // the faithful reading is that the burst's own self-buffs are live for its own damage,
    // i.e. the buff block is ordered ahead of the damage block.
    const idxBuff = base.events.findIndex(
      (e) =>
        (e as unknown as BuffApplyEv).kind === 'buffApply' &&
        (e as unknown as BuffApplyEv).stat === 'trueDamagePct'
    );
    const idxNuke = base.events.findIndex(
      (e) =>
        (e as unknown as DamageEv).kind === 'damage' &&
        (e as unknown as DamageEv).srcSlot === 'burst'
    );
    expect(idxBuff).toBeGreaterThanOrEqual(0);
    expect(idxNuke).toBeGreaterThanOrEqual(0);
    expect(idxBuff).toBeLessThan(idxNuke);
  });

  it('trigger identity: keyed to vesti\u2019s OWN burst cast, not team full-burst entry', () => {
    // Burst-cast and full-burst-enter only diverge with a competing same-tier unit, so this
    // one assertion uses the fixed-B3 fixture. A fullBurstEnter mis-key over-credits every
    // rotation the other Burst III takes.
    const casts = view<BurstCastEv>(dual.events, 'burstCast');
    const applies = self(dual, 'trueDamagePct').length;
    const fbs = view<FbStartEv>(dual.events, 'fullBurstStart').length;
    if (slugTagged(casts)) {
      expect(applies).toBe(mine(casts).length);
    } else {
      expect(applies).toBeLessThanOrEqual(fbs);
    }
    expect(nukes(dual).length).toBe(applies);
  });

  it.skip('GAP: "Explosion Radius 100% for 10 sec" has no engine primitive', () => {
    // No radius/AoE geometry is modeled and the scope-lock boss is a single partless target,
    // so the line carries no damage payload. Belongs in `unmodeled`, not in a stat buff.
  });
});
