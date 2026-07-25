import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

/**
 * scarlet (Scarlet) - AR / Electric / Attacker / Burst III. ammo 20, reload 159f, 1 hit/shot,
 * normal 27.08%, core 200%. BLIND per-unit kit spec: written from the kit prose ALONE, with no
 * sight of the driver's override, tests or reasoning. Every counterfactual locates its target
 * by PREDICATE (stat + magnitude), never by block index, because this file cannot know how the
 * driver ordered or split blocks.
 *
 * KIT STRUCTURE (activation header + stat keyword only):
 *   S1  [1] 'Activates after landing 10 normal' attack(s) / 'Affects self.'
 *           ATK up 23.15%, 'stacks up to 5 time(s)', 'lasts for 5 sec'
 *           'Current HP down 4.01%'                   -> self HP cost; v1 models no HP pool (GAP)
 *   S2a [1] '30% chance of activating when attacked'
 *           138.24% of final ATK as additional damage -> no on-attacked trigger primitive (GAP)
 *   S2b [1] 'Activates when HP falls below 60%' / 'Affects self.'
 *           Critical Damage up 6.61% 'continuously'
 *   B   [1] 'Affects self.' / 'Activates when HP falls below 50%.'
 *           Critical Rate up 19.57% 'for 10 sec'
 *       [2] 'Affects all enemies.' 849.15% of final ATK as Burst Skill damage
 *
 * HP-THRESHOLD READING (load-bearing). S1's cost shaves CURRENT HP, so HP decays geometrically and
 * never reaches 0: 0.9599^n < 0.60 at n=13 procs, < 0.50 at n=17. One proc = 10 landed normals, so
 * 130 / 170 rounds. With a 20-round magazine and a 159f reload the belt cycles at roughly 4.5
 * rounds/s (cadence is datamine-derived -> flagged, unreliable), i.e. both gates open at about 29s
 * and 38s and then stay open for the remaining ~80% of a 180s fight. The engine has NO HP pool at
 * all, so the faithful encoding keeps BOTH HP-gated buffs live (a passive, optionally with a rampSec
 * haircut for the opening seconds). Silently DROPPING either line because 'HP is unobservable' is the
 * exact failure this file is built to catch - the S2b and burst crit groups go RED on a zero count.
 *
 * FIXTURE: controlComp('scarlet', true) - liter (B1) + crown (B2) complete the chain so a Burst III
 * actually casts (a lone B3 makes ZERO Full Bursts), and helm is kept as a SECOND Burst III ON
 * PURPOSE: team Full Bursts then outnumber scarlet's own burst casts, which is what gives the
 * burstCast-vs-fullBurstEnter counterfactual something to bite on. Every comparison is same-fixture
 * A/B, so helm's ally buffs (incl. critRateNormalPct) cannot confound a direction. Boss is Fire and
 * scarlet's kit carries no elemental-advantage damage line, so nothing here depends on element.
 *
 * 11 runs total (each a full 180s sim).
 */

const SLUG = 'scarlet';
type Ev = Record<string, any>;

const near = (a: any, b: number, eps = 0.01) => typeof a === 'number' && Math.abs(a - b) <= eps;

// --- override readers. Shape-agnostic: a slot may be a Block[] (override FILE shape) or a
// CharacterSkills carrying its own blocks[] - both are handled so the file cannot guess wrong.
function slotBlocks(ov: any, slot: 'skill1' | 'skill2' | 'burst'): any[] {
  const s = ov?.[slot];
  if (!s) return [];
  if (Array.isArray(s)) return s;
  return Array.isArray(s.blocks) ? s.blocks : [];
}
function allBlocks(ov: any): any[] {
  return [...slotBlocks(ov, 'skill1'), ...slotBlocks(ov, 'skill2'), ...slotBlocks(ov, 'burst')];
}
function findEffect(ov: any, label: string, pred: (e: any) => boolean): { block: any; effect: any } {
  for (const b of allBlocks(ov)) {
    for (const e of b.effects ?? []) if (pred(e)) return { block: b, effect: e };
  }
  throw new Error('scarlet override does not represent kit line: ' + label);
}

// Predicates key on MAGNITUDE (not stat) where the point of the test is to assert the stat key,
// so a mis-encoded stat is still FOUND and then fails a precise assertion.
const ATK_STACK = (e: any) => e?.kind === 'buff' && e.stat === 'atkPct' && near(e.value, 23.15);
const CRIT_DMG = (e: any) => e?.kind === 'buff' && near(e.value, 6.61);
const CRIT_RATE = (e: any) => e?.kind === 'buff' && near(e.value, 19.57);
const NUKE = (e: any) => e?.kind === 'flatDamage' && near(e.atkPct, 849.15, 0.02);

const OV: any = withPatchedOverride(SLUG, () => {}); // untouched clone, for static shape assertions

function run(patch?: any) {
  const base = controlComp(SLUG, true) as any;
  const events: Ev[] = [];
  const opts: any = {
    ...base,
    cfg: { ...(base.cfg ?? {}), onEvent: (e: SimEvent) => events.push(e as unknown as Ev) },
  };
  if (patch) opts.overrides = { ...(base.overrides ?? {}), [SLUG]: patch };
  const res = runComp(opts);
  return { res, events, total: totals(res)[SLUG] as number, board: totals(res) };
}

const evs = (events: Ev[], kind: string) => events.filter((e) => e.kind === kind);

// scarlet-attributed events: prefer the per-unit result row, fall back to slug fields on the log.
function ownEvents(res: any, events: Ev[], kind: string): Ev[] {
  const row: any = unitOf(res, SLUG);
  const own = Array.isArray(row?.events) ? row.events.filter((e: any) => e?.kind === kind) : [];
  if (own.length) return own as Ev[];
  return evs(events, kind).filter((e) =>
    [e.slug, e.unit, e.srcSlug, e.casterSlug, e.ownerSlug].includes(SLUG),
  );
}

function expectTeammatesIdentical(a: Record<string, number>, b: Record<string, number>) {
  for (const slug of Object.keys(a)) {
    if (slug === SLUG) continue;
    expect(b[slug]).toBe(a[slug]);
  }
}

// --- hoisted runs ---
const FAITHFUL = run();

const S1_EVERY_SHOT = run(
  withPatchedOverride(SLUG, (ov: any) => {
    findEffect(ov, 'S1 ATK stack 23.15%', ATK_STACK).block.trigger = { kind: 'shotFired' };
  }),
);
const S1_NO_STACK = run(
  withPatchedOverride(SLUG, (ov: any) => {
    findEffect(ov, 'S1 ATK stack 23.15%', ATK_STACK).effect.maxStacks = 1;
  }),
);
const S1_LONG = run(
  withPatchedOverride(SLUG, (ov: any) => {
    findEffect(ov, 'S1 ATK stack 23.15%', ATK_STACK).effect.durationSec = 60;
  }),
);
const S2_CD_ZERO = run(
  withPatchedOverride(SLUG, (ov: any) => {
    findEffect(ov, 'S2b crit damage 6.61%', CRIT_DMG).effect.value = 0;
  }),
);
const S2_AS_RATE = run(
  withPatchedOverride(SLUG, (ov: any) => {
    findEffect(ov, 'S2b crit damage 6.61%', CRIT_DMG).effect.stat = 'critRatePct';
  }),
);
const B_CR_ZERO = run(
  withPatchedOverride(SLUG, (ov: any) => {
    findEffect(ov, 'burst crit rate 19.57%', CRIT_RATE).effect.value = 0;
  }),
);
const B_CR_NORMAL_ONLY = run(
  withPatchedOverride(SLUG, (ov: any) => {
    findEffect(ov, 'burst crit rate 19.57%', CRIT_RATE).effect.stat = 'critRateNormalPct';
  }),
);
const B_CR_LONG = run(
  withPatchedOverride(SLUG, (ov: any) => {
    findEffect(ov, 'burst crit rate 19.57%', CRIT_RATE).effect.durationSec = 40;
  }),
);
const B_NUKE_HALF = run(
  withPatchedOverride(SLUG, (ov: any) => {
    findEffect(ov, 'burst 849.15% nuke', NUKE).effect.atkPct = 424.575;
  }),
);
const B_CR_FB_ENTER = run(
  withPatchedOverride(SLUG, (ov: any) => {
    const { block } = findEffect(ov, 'burst crit rate 19.57%', CRIT_RATE);
    block.trigger = { kind: 'fullBurstEnter' };
    delete block.ownBurstGate;
  }),
);

const FB_STARTS = evs(FAITHFUL.events, 'fullBurstStart').length;
const buffApplies = (r: { events: Ev[] }, pred: (e: Ev) => boolean) =>
  evs(r.events, 'buffApply').filter(pred);
const CR_APPLIES = buffApplies(
  FAITHFUL,
  (e) => near(e.value, 19.57) && e.targetSlug === SLUG,
);
const NUKE_HITS = ownEvents(FAITHFUL.res, FAITHFUL.events, 'damage').filter(
  (e) => e.srcSlot === 'burst',
);

describe('scarlet S1 - after 10 landed normals: self ATK 23.15%, 5 stacks, 5 sec', () => {
  it('is encoded as a self hitCount:10 atkPct buff with maxStacks 5 and a SECONDS duration', () => {
    // Static shape. Discriminates the two classic traps at once: a round-count duration
    // (durationShots) instead of 'lasts for 5 sec', and a pre-multiplied single 115.75% buff
    // instead of a real 5-stack pool.
    const { block, effect } = findEffect(OV, 'S1 ATK stack 23.15%', ATK_STACK);
    expect(effect.stat).toBe('atkPct');
    expect(effect.maxStacks).toBe(5);
    expect(effect.durationSec).toBe(5);
    expect(effect.durationShots).toBeUndefined();
    expect(block.target.kind).toBe('self');
    expect(block.trigger.kind).toBe('hitCount');
    expect(block.trigger.count).toBe(10);
  });

  it('emits self-scoped 23.15 atkPct applies that actually accrue stacks (non-vacuity)', () => {
    const applies = buffApplies(
      FAITHFUL,
      (e) => e.stat === 'atkPct' && near(e.value, 23.15) && e.targetSlug === SLUG,
    );
    // ~810 rounds in 180s / 10 landed normals per proc -> dozens of applies. A count of 0 means the
    // line is MISSING or mis-scoped to allies.
    expect(applies.length).toBeGreaterThanOrEqual(10);
    for (const a of applies) {
      expect(a.targetSlug).toBe(SLUG);
      expect(a.casterIdx).toBe(a.targetIdx); // 'Affects self.'
      expect(a.maxStacks).toBe(5);
    }
    const stackVals = applies.map((a) => a.stacks).filter((s) => typeof s === 'number');
    if (stackVals.length) expect(Math.max(...stackVals)).toBeGreaterThan(1);
  });

  it('counts 10 LANDED NORMALS, not every trigger pull', () => {
    // Nearest-wrong: shotFired. That fires ~10x as often, pins the pool at 5 stacks permanently and
    // must out-damage the faithful reading. Equality here would mean the trigger is effectively
    // per-shot already.
    expect(S1_EVERY_SHOT.total).toBeGreaterThan(FAITHFUL.total);
  });

  it('the 5-stack cap is load-bearing (single-stack model under-damages)', () => {
    expect(S1_NO_STACK.total).toBeLessThan(FAITHFUL.total);
  });

  it('the 5 sec window really expires between procs (both states exercised)', () => {
    // Non-vacuity for the duration: if the buff were effectively permanent, stretching it to 60s
    // could not move the total. It does -> the fixture exercises BOTH the buffed and lapsed state.
    expect(S1_LONG.total).toBeGreaterThan(FAITHFUL.total);
  });

  it('is inert on teammates (self-scoped: nobody else sees the ATK pool)', () => {
    expectTeammatesIdentical(FAITHFUL.board, S1_NO_STACK.board);
  });
});

describe('scarlet S1 - Current HP down 4.01% (GAP)', () => {
  it.skip('shaves 4.01% of CURRENT HP per proc, opening her own HP<60% / HP<50% gates', () => {
    // GAP: no HP-pool primitive. v1 has an immortal boss that deals no damage and units have no
    // live HP, so a self HP cost has no representation and no consumer. Recorded because it is the
    // MECHANISM behind S2b and the burst crit-rate line: 13 procs (130 rounds, ~29s) crosses 60%,
    // 17 procs (170 rounds, ~38s) crosses 50%, and because the cost is on CURRENT HP she asymptotes
    // and never dies. Belongs verbatim in the override's `unmodeled` (asserted below).
  });
});

describe('scarlet S2a - 30% when attacked: 138.24% additional damage (GAP)', () => {
  it.skip('procs a 138.24% rider on 30% of incoming attacks', () => {
    // GAP twice over: there is no on-attacked TRIGGER in the schema, and the v1 boss deals no
    // damage, so both the trigger and its rate (boss attacks/sec x 0.30) are outside the input
    // domain. Modeling it would require inventing a cadence -> flag, do not ship.
  });

  it('is NOT smuggled in on an invented interval trigger', () => {
    const dmg = ownEvents(FAITHFUL.res, FAITHFUL.events, 'damage');
    expect(dmg.length).toBeGreaterThan(0); // non-vacuity: attribution channel works
    expect(dmg.filter((e) => e.srcSlot === 'skill2').length).toBe(0);
  });
});

describe('scarlet S2b - HP<60%: self Critical Damage 6.61% continuously', () => {
  it('is a self critDamagePct buff with NO duration (continuously = permanent)', () => {
    const { block, effect } = findEffect(OV, 'S2b crit damage 6.61%', CRIT_DMG);
    expect(effect.stat).toBe('critDamagePct'); // not critRatePct, not coreDamagePct
    expect(effect.durationSec).toBeUndefined();
    expect(effect.durationShots).toBeUndefined();
    expect(block.target.kind).toBe('self');
  });

  it('is LIVE in the sim - the HP<60% gate is not treated as unreachable', () => {
    const applies = buffApplies(
      FAITHFUL,
      (e) => near(e.value, 6.61) && e.targetSlug === SLUG,
    );
    expect(applies.length).toBeGreaterThanOrEqual(1);
    for (const a of applies) expect(a.stat).toBe('critDamagePct');
    expect(S2_CD_ZERO.total).toBeLessThan(FAITHFUL.total); // it actually moves damage
  });

  it('is crit DAMAGE, not crit RATE', () => {
    // Nearest-wrong: same 6.61 magnitude on critRatePct. Expected damage is
    // 1 + rate*(0.5 + critDmg): +6.61pp of RATE buys ~0.5x per point, +6.61pp of crit DAMAGE only
    // buys rate (~0.15) per point, so the mis-encoding is strictly LARGER. Equality would mean the
    // driver already used critRatePct.
    expect(FAITHFUL.total).toBeLessThan(S2_AS_RATE.total);
  });

  it('is inert on teammates', () => {
    expectTeammatesIdentical(FAITHFUL.board, S2_CD_ZERO.board);
  });
});

describe('scarlet burst - HP<50%: self Critical Rate 19.57% for 10 sec', () => {
  it('is a self critRatePct buff, durationSec 10, keyed to HER OWN burst cast', () => {
    const { block, effect } = findEffect(OV, 'burst crit rate 19.57%', CRIT_RATE);
    expect(effect.stat).toBe('critRatePct'); // unscoped in the kit text -> generic, not *NormalPct
    expect(effect.durationSec).toBe(10);
    expect(block.target.kind).toBe('self');
    expect(block.slot).toBe('burst');
    // Trigger identity: a burst-slot self buff with a 10s window rides her OWN cast. Accepts the
    // behaviourally-equivalent fullBurstEnter + ownBurstGate:'cast' encoding; rejects a bare
    // fullBurstEnter (over-credits in this 2x-B3 comp) and a passive (always-on).
    const t = block.trigger.kind;
    const ok = t === 'burstCast' || (t === 'fullBurstEnter' && block.ownBurstGate === 'cast');
    expect(ok).toBe(true);
  });

  it('is LIVE and fires exactly once per scarlet burst - not once per team Full Burst', () => {
    expect(CR_APPLIES.length).toBeGreaterThanOrEqual(1); // HP<50% gate not dropped as unreachable
    expect(NUKE_HITS.length).toBeGreaterThanOrEqual(1);
    // Both burst-slot blocks are keyed to the same cast, so their counts must match exactly.
    expect(CR_APPLIES.length).toBe(NUKE_HITS.length);
    expect(FB_STARTS).toBeGreaterThanOrEqual(CR_APPLIES.length);
    const patched = buffApplies(
      B_CR_FB_ENTER,
      (e) => near(e.value, 19.57) && e.targetSlug === SLUG,
    ).length;
    expect(patched).toBeGreaterThanOrEqual(CR_APPLIES.length);
    if (FB_STARTS > NUKE_HITS.length) {
      // helm (the co-B3) took some rotations, so the two triggers genuinely diverge here.
      expect(patched).toBeGreaterThan(CR_APPLIES.length);
    }
  });

  it('the 10 sec window expires (both states exercised)', () => {
    expect(B_CR_LONG.total).toBeGreaterThan(FAITHFUL.total);
  });

  it('the 19.57% is load-bearing and unscoped', () => {
    expect(B_CR_ZERO.total).toBeLessThan(FAITHFUL.total);
    // Nearest-wrong scope: critRateNormalPct would deny the crit lift to her 849% burst hit.
    // Weaker (>=) on purpose: the two coincide if the nuke resolves before the buff applies on the
    // cast frame. The static stat assertion above carries the scope call.
    expect(FAITHFUL.total).toBeGreaterThanOrEqual(B_CR_NORMAL_ONLY.total);
  });

  it('is inert on teammates', () => {
    expectTeammatesIdentical(FAITHFUL.board, B_CR_ZERO.board);
  });
});

describe('scarlet burst - 849.15% of final ATK to all enemies', () => {
  it('is one burst-cast flatDamage hit, FB-major-exempt and range-exempt', () => {
    const { block, effect } = findEffect(OV, 'burst 849.15% nuke', NUKE);
    expect(effect.kind).toBe('flatDamage');
    expect(near(effect.atkPct, 849.15, 0.02)).toBe(true);
    expect(block.trigger.kind).toBe('burstCast');
    expect(block.target.kind).toBe('enemy'); // 'Affects all enemies' - single boss in v1
    expect(effect.core).not.toBe(true); // no 'core strike' wording in the kit text
    for (const h of NUKE_HITS) {
      // A burst cast lands before the FB window opens, so the +50% FB major must never apply.
      expect(!!h.fbMajorApplied).toBe(false);
      expect(!!h.rangeApplied).toBe(false); // riders are force-set no-range
    }
  });

  it('the 849.15% magnitude is load-bearing (halving it drops only scarlet)', () => {
    expect(B_NUKE_HALF.total).toBeLessThan(FAITHFUL.total);
    expectTeammatesIdentical(FAITHFUL.board, B_NUKE_HALF.board);
  });
});

describe('scarlet - no silent drops', () => {
  it('records the two unmodelable kit lines in unmodeled/note, and uses no ignored effects', () => {
    const text = JSON.stringify([OV.unmodeled ?? {}, OV.note ?? '']);
    expect(text).toContain('4.01'); // self current-HP cost
    expect(text).toContain('138.24'); // 30%-when-attacked rider
    for (const b of allBlocks(OV)) {
      for (const e of b.effects ?? []) expect(e.kind).not.toBe('ignored');
    }
  });

  it('declares all three slots', () => {
    for (const slot of ['skill1', 'skill2', 'burst'] as const) {
      expect(OV[slot]).toBeDefined();
    }
  });
});
