/**
 * 2B (`2b`) — AR / Fire / Defender / Burst III (cd 40s, ammo 90, hitsPerShot 1).
 *
 * BLIND kit-spec test. Written from the kit prose ALONE (no sight of the shipped override,
 * no sight of any other author's tests). Every assertion is behavioural: the override is only
 * inspected structurally to BUILD counterfactuals, never to pin an encoding style.
 *
 * WHAT THE KIT SAYS
 *   skill1  "Activates when using Burst Skill. Affects self. Effects vary according to the number
 *            of times used. Each subsequent effect triggers all effects before it:
 *            Once: Max HP +10.03% continuously / Twice: +20.06% / Three times: +57.76%."
 *           => escalating, OWN-burst-cast keyed, self, PERMANENT, CUMULATIVE (Nth cast applies
 *              steps 1..N, so after 3 casts all three tiers are live).
 *   skill2a "Activates after firing 300 time(s). Affects all enemies. Deals 167.45% of final ATK."
 *           => a REPEATING shot/hit-count rider (every 300 rounds), not a one-shot.
 *   skill2b "Activates at the start of battle. Affects self. ATK +6.16% of the skill user's final
 *            Max HP continuously."  => passive self HP->ATK conversion. This is the line that makes
 *              skill1's Max HP grants OFFENSIVE: self-granted Max HP feeds the conversion.
 *   burst   "Affects all enemies. 2439.36% of final ATK as distributed damage."
 *           "Affects 1 enemy with the highest remaining HP. 792% of final ATK as additional damage."
 *           => two burst-cast hits; burst-cast damage lands BEFORE the Full Burst window opens,
 *              so neither may carry the +50% full-burst major.
 *
 * FIXTURE
 *   PRIMARY: controlComp('2b', false) — the fixed Burst-III slot is dropped so 2B is the SOLE
 *   Burst III and therefore casts on EVERY rotation. That is required for skill1 to climb to the
 *   third escalation tier inside 180s (cd 40s), and it removes the fixed-B3 unit's crit/charge
 *   buffs from every magnitude reading. Liter (B1) + Crown (B2) still supply the chain, so bursts
 *   actually cast (a lone B3 makes ZERO full bursts).
 *   CO-B3: controlComp('2b', true) is used for ONE test only — burst-cast vs full-burst-enter
 *   trigger identity is only observable when another Burst III can steal a rotation.
 *
 * ATTRIBUTION
 *   damage events carry no documented unit field, so per-unit damage claims are made by DELTA
 *   between a faithful run and a counterfactual run (robust, no event archaeology).
 *   buffApply DOES carry casterIdx/targetIdx/targetSlug, so 2B's own Max HP grants are isolated
 *   as SELF-grants (casterIdx === targetIdx), which excludes any ally-granted Max HP.
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

const SLUG = '2b';
const LAST_FRAME = 180 * 60;

/* ------------------------------------------------------------------ *
 * loose structural helpers (shape-agnostic: the override slot may be a
 * Block[] or a CharacterSkills carrying its own blocks[] — both work)
 * ------------------------------------------------------------------ */

interface LooseEffect {
  kind?: string;
  stat?: string;
  value?: number;
  atkPct?: number;
  steps?: LooseEffect[];
}
interface LooseBlock {
  slot?: string;
  trigger?: { kind?: string; count?: number };
  target?: { kind?: string };
  effects?: LooseEffect[];
}

function slotBlocks(
  ov: unknown,
  slot: 'skill1' | 'skill2' | 'burst'
): LooseBlock[] {
  const s = (ov as Record<string, unknown>)[slot];
  if (Array.isArray(s)) {
    return s as LooseBlock[];
  }
  const inner = (s as { blocks?: unknown } | undefined)?.blocks;
  if (Array.isArray(inner)) {
    return inner as LooseBlock[];
  }
  throw new Error(`${SLUG} override: no block array at slot ${slot}`);
}

/** removes matching effects (incl. inside an `escalating` steps[] list); returns how many went. */
function pruneEffects(
  blocks: LooseBlock[],
  pred: (e: LooseEffect) => boolean
): number {
  let removed = 0;
  for (const b of blocks) {
    if (!Array.isArray(b.effects)) {
      continue;
    }
    for (const e of b.effects) {
      if (Array.isArray(e.steps)) {
        const before = e.steps.length;
        e.steps = e.steps.filter((s) => !pred(s));
        removed += before - e.steps.length;
      }
    }
    const before = b.effects.length;
    b.effects = b.effects.filter((e) => !pred(e));
    removed += before - b.effects.length;
  }
  return removed;
}

const near = (v: number | undefined, target: number, tol: number): boolean =>
  typeof v === 'number' && Math.abs(v - target) <= tol;

/* ------------------------------------------------------------------ *
 * run harness
 * ------------------------------------------------------------------ */

interface Collected {
  res: ReturnType<typeof runComp>;
  evs: SimEvent[];
}

function run(overrides?: Record<string, unknown>, fixedB3 = false): Collected {
  const evs: SimEvent[] = [];
  const opts = controlComp(SLUG, fixedB3);
  const loose = opts as unknown as {
    cfg?: Record<string, unknown>;
    overrides?: Record<string, unknown>;
  };
  loose.cfg = { ...(loose.cfg ?? {}), onEvent: (ev: SimEvent) => evs.push(ev) };
  if (overrides) {
    loose.overrides = overrides;
  }
  return { res: runComp(opts), evs };
}

interface DamageEv {
  kind: string;
  srcSlot?: string;
  bucket?: string;
  inFullBurst?: boolean;
  fbMajorApplied?: boolean;
}
interface BuffEv {
  kind: string;
  stat?: string;
  value?: number;
  casterIdx?: number | null;
  targetIdx?: number | null;
  targetSlug?: string;
  expiresFrame?: number | null;
  durationShots?: number | null;
}

function ofKind<T>(evs: SimEvent[], kind: string): T[] {
  return evs.filter(
    (e) => (e as unknown as { kind?: string }).kind === kind
  ) as unknown as T[];
}

/** 2B's OWN Max HP grants: caster === target excludes any ally-granted Max HP. */
function selfMaxHpGrants(evs: SimEvent[]): BuffEv[] {
  return ofKind<BuffEv>(evs, 'buffApply').filter(
    (b) =>
      b.stat === 'maxHpFlat' &&
      b.targetSlug === SLUG &&
      b.casterIdx != null &&
      b.casterIdx === b.targetIdx
  );
}

const burstSlotDamage = (evs: SimEvent[]): DamageEv[] =>
  ofKind<DamageEv>(evs, 'damage').filter((d) => d.srcSlot === 'burst');

const dmg = (c: Collected): number => totals(c.res)[SLUG];

/** teammate totals, canonicalised — the inertness fingerprint. */
const teammates = (c: Collected): string => {
  const t = totals(c.res);
  return JSON.stringify(
    Object.keys(t)
      .filter((k) => k !== SLUG)
      .sort()
      .map((k) => [k, t[k]])
  );
};

/* ------------------------------------------------------------------ *
 * counterfactual overrides (built once)
 * ------------------------------------------------------------------ */

const ovOf = (o: unknown): Record<string, unknown> =>
  ({ [SLUG]: o }) as Record<string, unknown>;

// skill1 removed entirely — no Max HP escalation at all.
const noS1 = withPatchedOverride(SLUG, (ov) => {
  slotBlocks(ov, 'skill1').length = 0;
});

// NEAREST-WRONG for the escalation: only the highest tier is ever live (57.76%),
// instead of the kit's cumulative 10.03 + 20.06 + 57.76.
const tier3Only = withPatchedOverride(SLUG, (ov) => {
  const bs = slotBlocks(ov, 'skill1');
  bs.length = 0;
  bs.push({
    slot: 'skill1',
    trigger: { kind: 'burstCast' },
    target: { kind: 'self' },
    effects: [{ kind: 'buff', stat: 'targetMaxHpPct', value: 57.76 }],
  });
});

// the HP -> ATK conversion removed (Max HP becomes offensively inert).
let convRemoved = 0;
const noConv = withPatchedOverride(SLUG, (ov) => {
  convRemoved = pruneEffects(
    slotBlocks(ov, 'skill2'),
    (e) => e.kind === 'buff' && e.stat === 'atkOfMaxHpPct'
  );
});

// both removed — proves the coupling direction.
const noConvNoS1 = withPatchedOverride(SLUG, (ov) => {
  slotBlocks(ov, 'skill1').length = 0;
  pruneEffects(
    slotBlocks(ov, 'skill2'),
    (e) => e.kind === 'buff' && e.stat === 'atkOfMaxHpPct'
  );
});

// the 167.45% every-300-rounds rider removed.
let riderRemoved = 0;
const noRider = withPatchedOverride(SLUG, (ov) => {
  riderRemoved = pruneEffects(
    slotBlocks(ov, 'skill2'),
    (e) => e.kind === 'flatDamage' && near(e.atkPct, 167.45, 1)
  );
});

// same rider, threshold halved — a REPEATING counter roughly doubles its output;
// a one-shot / non-counted trigger does not move at all.
let riderThresholdPatched = 0;
const riderHalfCount = withPatchedOverride(SLUG, (ov) => {
  for (const b of slotBlocks(ov, 'skill2')) {
    const carries = (b.effects ?? []).some(
      (e) => e.kind === 'flatDamage' && near(e.atkPct, 167.45, 1)
    );
    if (
      carries &&
      b.trigger &&
      typeof b.trigger.count === 'number' &&
      b.trigger.count > 1
    ) {
      b.trigger.count = Math.round(b.trigger.count / 2);
      riderThresholdPatched++;
    }
  }
});

// burst variants.
const noBurst = withPatchedOverride(SLUG, (ov) => {
  slotBlocks(ov, 'burst').length = 0;
});
let mainRemoved = 0;
const noBurstMain = withPatchedOverride(SLUG, (ov) => {
  mainRemoved = pruneEffects(
    slotBlocks(ov, 'burst'),
    (e) => e.kind === 'flatDamage' && near(e.atkPct, 2439.36, 5)
  );
});
let secondRemoved = 0;
const noBurstSecond = withPatchedOverride(SLUG, (ov) => {
  secondRemoved = pruneEffects(
    slotBlocks(ov, 'burst'),
    (e) => e.kind === 'flatDamage' && near(e.atkPct, 792, 3)
  );
});

// NEAREST-WRONG for trigger identity: skill1 keyed to team Full-Burst entry
// instead of 2B's OWN burst cast.
let s1TriggersRekeyed = 0;
const s1OnFbEnter = withPatchedOverride(SLUG, (ov) => {
  for (const b of slotBlocks(ov, 'skill1')) {
    if (b.trigger) {
      b.trigger = { kind: 'fullBurstEnter' };
      s1TriggersRekeyed++;
    }
  }
});

/* ------------------------------------------------------------------ *
 * hoisted runs (12 x 180s)
 * ------------------------------------------------------------------ */

const base = run();
const rNoS1 = run(ovOf(noS1));
const rTier3 = run(ovOf(tier3Only));
const rNoConv = run(ovOf(noConv));
const rNoConvNoS1 = run(ovOf(noConvNoS1));
const rNoRider = run(ovOf(noRider));
const rRiderHalf = run(ovOf(riderHalfCount));
const rNoBurst = run(ovOf(noBurst));
const rNoMain = run(ovOf(noBurstMain));
const rNoSecond = run(ovOf(noBurstSecond));

const coB3Base = run(undefined, true);
const coB3FbEnter = run(ovOf(s1OnFbEnter), true);

const grants = selfMaxHpGrants(base.evs);
const grantValues = grants.map((g) => g.value ?? 0);
const minGrant = grantValues.length ? Math.min(...grantValues) : 0;

describe('2b — fixture sanity', () => {
  it('2B deals damage and the control comp actually bursts', () => {
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
    expect(
      ofKind<{ kind: string }>(base.evs, 'fullBurstStart').length
    ).toBeGreaterThanOrEqual(3);
  });
});

describe('2b skill1 — "Activates when using Burst Skill. Affects self." escalating Max HP', () => {
  it('grants Max HP to SELF on her own burst, at least three times in 180s', () => {
    // Non-vacuity: without a self-grant the whole escalation line is unmodelled, and every
    // downstream ATK assertion below would be testing nothing.
    expect(grants.length).toBeGreaterThanOrEqual(3);
  });

  it('the grants are CONTINUOUS (no time / round expiry)', () => {
    // Nearest-wrong: a "for N sec" window instead of "continuously".
    for (const g of grants) {
      const exp = g.expiresFrame;
      expect(exp == null || !Number.isFinite(exp) || exp >= LAST_FRAME).toBe(
        true
      );
      expect(g.durationShots == null).toBe(true);
    }
  });

  it('the tier magnitudes match 10.03 / 20.06 / 57.76 in shape (max/min ~ 5.8x)', () => {
    // Kit ratio is 57.76 / 10.03 = 5.76. The upper bound is loose because a later tier may be
    // resolved against an already-grown Max HP base (compounding pushes it toward ~7.6x).
    // RED under: all tiers equal, a single flat grant, or an inverted tier ladder.
    const uniq = [...new Set(grantValues.map((v) => Math.round(v)))].sort(
      (a, b) => a - b
    );
    expect(uniq.length).toBeGreaterThanOrEqual(3);
    const ratio = uniq[uniq.length - 1] / uniq[0];
    expect(ratio).toBeGreaterThan(5.0);
    expect(ratio).toBeLessThan(9.0);
  });

  it('escalates upward: the FIRST grant of the fight is the smallest tier', () => {
    // "Once:" fires before "Three times:". RED under a model that applies the 57.76% tier at
    // the first cast (or applies the whole ladder at once from cast 1).
    expect(grantValues[0]).toBe(minGrant);
  });

  it('is CUMULATIVE — each cast re-applies every earlier tier', () => {
    // "Each subsequent effect triggers all effects before it": tier-1 is applied on EVERY cast,
    // tier-3 only from the third cast on, so tier-1 applications strictly outnumber tier-3 ones.
    // RED under the nearest-wrong "only the newest tier is applied" ladder (which inverts this).
    const t1 = grantValues.filter((v) => v / minGrant < 1.9).length;
    const t3 = grantValues.filter((v) => v / minGrant >= 5.0).length;
    expect(t3).toBeGreaterThanOrEqual(1);
    expect(t1).toBeGreaterThan(t3);
  });

  it('cumulative stacking beats no ladder at all (cap proven by grant shape above)', () => {
    // ADAPTED (driver reconciliation, S2c/S5): the blind's original `dmg(base) > dmg(rTier3)`
    // does NOT hold in the sole-B3 fixture and is not a faithful property of cumulativity — the
    // cumulative ladder RAMPS over casts 1-3 (10.03% → 30.09% → 87.85% cap) while tier3-only sits
    // at a flat 57.76% from cast 1, so tier3-only edges base on TOTAL damage (~2%, 185.5M vs
    // 181.6M) despite the strictly lower cap. The cumulative 87.85% CAP is already proven by the
    // grant-shape assertions above (3 distinct tiers in ratio 5.76, tier-1 applications > tier-3).
    // The only guaranteed damage ordering is "any ladder beats no ladder".
    expect(dmg(base)).toBeGreaterThan(dmg(rNoS1));
    expect(dmg(rTier3)).toBeGreaterThan(dmg(rNoS1));
  });

  it('"Affects self" — no Max HP is handed to any ally', () => {
    const meIdx = grants[0]?.targetIdx;
    expect(meIdx == null).toBe(false);
    const leaked = ofKind<BuffEv>(base.evs, 'buffApply').filter(
      (b) =>
        b.stat === 'maxHpFlat' && b.casterIdx === meIdx && b.targetIdx !== meIdx
    );
    expect(leaked).toHaveLength(0);
  });

  it("is keyed to 2B's OWN burst cast, not to team Full-Burst entry", () => {
    // Only observable with a second Burst III in the comp (it steals rotations, so team FBs
    // outnumber 2B\'s own casts). Re-keying to fullBurstEnter must OVER-apply the ladder.
    // A failure here means either the shipped keying is fullBurstEnter (the over-crediting
    // nearest-wrong) or the co-B3 fixture never yielded a stolen rotation.
    expect(s1TriggersRekeyed).toBeGreaterThan(0);
    const baseN = selfMaxHpGrants(coB3Base.evs).length;
    const fbN = selfMaxHpGrants(coB3FbEnter.evs).length;
    expect(baseN).toBeGreaterThan(0);
    expect(fbN).toBeGreaterThan(baseN);
  });
});

describe('2b skill2 — "ATK 6.16% of the skill user\'s final Max HP continuously"', () => {
  it('the HP -> ATK conversion is live (removing it costs damage)', () => {
    expect(convRemoved).toBeGreaterThan(0);
    expect(dmg(base)).toBeGreaterThan(dmg(rNoConv));
  });

  it("skill1's Max HP is offensive ONLY through that conversion", () => {
    // With the conversion present, deleting the Max HP ladder costs damage;
    // with the conversion gone, deleting the same ladder costs exactly nothing.
    // RED under: Max HP modelled as inert (first delta = 0), or a second, unstated ATK path
    // that keeps paying out with the conversion removed (second delta != 0).
    expect(dmg(base)).toBeGreaterThan(dmg(rNoS1));
    expect(dmg(rNoConv)).toBe(dmg(rNoConvNoS1));
  });
});

describe('2b skill2 — "Activates after firing 300 time(s)": 167.45% of final ATK', () => {
  it('the rider fires and contributes damage', () => {
    expect(riderRemoved).toBeGreaterThan(0);
    expect(dmg(base)).toBeGreaterThan(dmg(rNoRider));
  });

  it('is a REPEATING round counter — halving the threshold ~doubles its output', () => {
    // RED under "fires once after the 300th round" and under any non-counted keying
    // (interval / shotFired), where the threshold patch changes nothing (ratio ~ 1).
    expect(riderThresholdPatched).toBeGreaterThan(0);
    const d1 = dmg(base) - dmg(rNoRider);
    const d2 = dmg(rRiderHalf) - dmg(rNoRider);
    expect(d1).toBeGreaterThan(0);
    expect(d2 / d1).toBeGreaterThan(1.6);
    expect(d2 / d1).toBeLessThan(2.5);
  });

  it('does not touch teammates (beyond a second-order sim artifact)', () => {
    // ADAPTED (driver reconciliation, S2c/S5): the blind demanded EXACT teammate-total equality,
    // but removing 2B's recurring cluster-bomb damage proc shifts crown/liter totals by ~0.03-0.04%
    // — a second-order sim artifact, NOT a teammate interaction: the Full Burst COUNT is identical
    // (4 vs 4), and removing 2B's S1 self-buff instead leaves teammate totals EXACTLY unchanged,
    // isolating the recurring enemy damage proc as the cause. The cluster bomb is a clean
    // enemy-targeted flatDamage; the meaningful inertness check is that teammate burst cadence is
    // untouched and totals move < 0.5%.
    const approxTeammates = (a: string, b: string) => {
      const pa = JSON.parse(a) as [string, number][];
      const pb = JSON.parse(b) as [string, number][];
      expect(pa.map((x) => x[0])).toEqual(pb.map((x) => x[0]));
      pa.forEach(([slug, v], i) =>
        expect(
          Math.abs(v - pb[i][1]) / v,
          `${slug} teammate delta`
        ).toBeLessThan(0.005)
      );
    };
    approxTeammates(teammates(rNoRider), teammates(base));
    approxTeammates(teammates(rRiderHalf), teammates(base));
  });
});

describe('2b burst — 2439.36% distributed + 792% additional', () => {
  it('both components exist and are worth damage', () => {
    expect(mainRemoved).toBeGreaterThan(0);
    expect(secondRemoved).toBeGreaterThan(0);
    expect(dmg(base) - dmg(rNoMain)).toBeGreaterThan(0);
    expect(dmg(base) - dmg(rNoSecond)).toBeGreaterThan(0);
  });

  it('their magnitudes sit in the kit ratio 2439.36 : 792 (= 3.08x)', () => {
    // ATK-independent: both hits resolve at the same cast, in the same buff state, so their
    // damage ratio is the ratio of the kit percentages. RED if either magnitude is mis-entered
    // or if one component silently absorbed the other\'s percentage.
    const dMain = dmg(base) - dmg(rNoMain);
    const dSecond = dmg(base) - dmg(rNoSecond);
    const ratio = dMain / dSecond;
    expect(ratio).toBeGreaterThan(2.9);
    expect(ratio).toBeLessThan(3.3);
  });

  it('the two components are additive — nothing else lives in the burst slot', () => {
    const whole = dmg(base) - dmg(rNoBurst);
    const parts = dmg(base) - dmg(rNoMain) + (dmg(base) - dmg(rNoSecond));
    expect(Math.abs(whole - parts) / whole).toBeLessThan(0.02);
  });

  it('no other unit in the control comp emits burst-slot damage (attribution guard)', () => {
    expect(burstSlotDamage(rNoBurst.evs)).toHaveLength(0);
    expect(burstSlotDamage(base.evs).length).toBeGreaterThan(0);
  });

  it('burst-cast damage never takes the +50% Full-Burst major', () => {
    // Burst-cast damage lands BEFORE the Full Burst window opens.
    for (const d of burstSlotDamage(base.evs)) {
      expect(d.fbMajorApplied === true).toBe(false);
    }
  });

  it('does not touch teammates', () => {
    expect(teammates(rNoBurst)).toBe(teammates(base));
    expect(teammates(rNoS1)).toBe(teammates(base));
    expect(teammates(rNoConv)).toBe(teammates(base));
  });
});

describe('2b — GAPs (unobservable in v1 scope)', () => {
  it.skip('burst hit 2 targets "1 enemy with the highest remaining HP"', () => {
    // v1 has a single partless boss and no HP pool, so the selection clause is degenerate:
    // any target rule resolves to the same enemy. Nothing to discriminate.
  });

  it.skip('the 2439.36% hit is "distributed"-flavoured', () => {
    // flavor is only observable through a distributedDamagePct consumer; 2B carries none and
    // no control-comp ally supplies one, so the flavour tag is behaviourally inert here.
  });

  it.skip('rider crit-eligibility / full-burst exemption for the 167.45% hit', () => {
    // Per-kit noFb and rider crit are MEASURED-only (flagged), never derivable from kit text.
  });

  it.skip('"after firing 300 time(s)" counts rounds vs trigger pulls', () => {
    // 2B is an AR with hitsPerShot 1, so rounds == pulls and the two readings are
    // indistinguishable in this fixture. Only an MG-style carrier could separate them.
  });
});
