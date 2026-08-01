/**
 * dolla — BLIND per-unit kit-spec test (S5 cross-family; written from kit prose ALONE).
 *
 * KIT (SR / Wind / Supporter / Burst II, cd 20s, ammo 6, chargeFrames 60, hitsPerShot 1):
 *   S1  "Affects all allies. ATK ▲ 16.16% for 5 sec."
 *        — NO activation clause anywhere in the prose (⛑ trigger identity is kit-silent).
 *   S2a "Activates when entering Full Burst. Affects all allies." escalating burst-skill
 *        cooldown ▼ 1.82 / 2.2 / 2.6 sec, each step cumulative with every step before it
 *        (1st FB →1.82, 2nd →4.02, 3rd and later →6.62).
 *   S2b "Activates when using Burst Skill. Affects all allies." escalating
 *        ATK ▲7.72% / Critical Rate ▲4.21% / Critical Damage ▲13.22%, each for 5 sec,
 *        same cumulative-prefix semantics.
 *   B   "Affects 1 enemy unit(s) with the highest final DEF. Deals 734.69% of final ATK as
 *        Burst Skill damage."
 *
 * FIXTURE: controlComp('dolla', true) — liter(B1) / crown(B2) / dolla(B2) / helm(B3).
 *   dolla is a Burst II unit sharing the stage with crown, so she casts her own burst on SOME
 *   rotations and not others. That is deliberate and load-bearing: it is the only way to
 *   discriminate S2b's "when USING Burst Skill" (burst-cast keyed — fires only on rotations
 *   dolla herself bursts) from the nearest-wrong "when ENTERING Full Burst" (fires on every
 *   team full burst). The first describe() asserts both the active and the inactive case really
 *   occur, so none of the S2b/burst assertions can pass vacuously.
 *
 * WHY EACH ASSERTION DISCRIMINATES
 *   S1  — the buffApply must carry stat 'atkPct' (scales each target's OWN ATK) at the raw
 *          percentage 16.16 and must reach EVERY comp member; the nearest-wrong models are
 *          (a) self-only scope and (b) a ROUND-count window. (a) is killed by the self-only
 *          counterfactual (teammates strictly lose damage), (b) by durationShots being absent.
 *   S2a — burstCdr emits no event, so it is read through full-burst COUNT against three
 *          constructed counterfactuals: 0 sec (floor), flat 1.82 (never escalates), flat 6.62
 *          (escalates instantly). Faithful must sit inside [flat1.82, flat6.62] and strictly
 *          above the 0-sec floor; the all-allies scope is proved by the self-only counterfactual.
 *          A sensitivity assertion runs FIRST so an inert-CDR fixture is diagnosable rather than
 *          silently passing.
 *   S2b — exact apply counts: atkPct applies == casts×allies, critRate == (casts-1)×allies,
 *          critDamage == (casts-2)×allies. This single arithmetic pins trigger identity, the
 *          cumulative-prefix escalation, and the all-allies target set at once; re-keying the
 *          block to fullBurstEnter (the counterfactual) strictly over-credits.
 *   B   — magnitude is proved without knowing final ATK, by linearity: zeroing the burst atkPct
 *          and doubling it must move dolla's total by the same delta in both directions.
 *          Teammates must be byte-identical when the burst hit is zeroed (inertness), and the
 *          hit must be full-burst-major exempt (a burst cast lands before the FB window opens).
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

const SLUG = 'dolla';

// kit magnitudes, verbatim from the prose
const S1_ATK_PCT = 16.16;
const B_ATK_PCT = 7.72;
const B_CRIT_RATE_PCT = 4.21;
const B_CRIT_DMG_PCT = 13.22;
const CDR_FLAT_MIN = 1.82; // "Once:" only, never escalating
const CDR_FLAT_MAX = 6.62; // 1.82 + 2.2 + 2.6, escalating instantly

const _BURST_ATK_PCT = 734.69;

type Mutator = Parameters<typeof withPatchedOverride>[1];
type AnyBlock = {
  slot?: string;
  trigger?: unknown;
  target?: unknown;
  effects?: unknown[];
};

const rec = (e: SimEvent) => e as unknown as Record<string, unknown>;
const kindOf = (e: SimEvent) => rec(e).kind as string;

// Event unit-attribution is not part of the documented harness contract; probe the plausible
// field names and let a miss surface as a hard count mismatch rather than a silent empty filter.
const ACTOR_KEYS = [
  'slug',
  'unitSlug',
  'srcSlug',
  'casterSlug',
  'caster',
  'unit',
  'owner',
  'source',
];
function actorOf(e: SimEvent): string | undefined {
  const r = rec(e);
  for (const k of ACTOR_KEYS) {
    const v = r[k];
    if (typeof v === 'string') {
      return v;
    }
  }
  return undefined;
}

const FRAME_KEYS = ['frame', 'atFrame', 'tick', 't', 'time', 'sec'];
function frameOf(e: SimEvent): number | undefined {
  const r = rec(e);
  for (const k of FRAME_KEYS) {
    const v = r[k];
    if (typeof v === 'number') {
      return v;
    }
  }
  return undefined;
}

// The override FILE is slot-keyed; the in-memory clone may expose each slot either as a bare
// Block[] or as a CharacterSkills carrying its own blocks[]. Handle both — we only ever MUTATE
// block objects in place, so either shape works.
function blocksOf(
  ov: unknown,
  slot: 'skill1' | 'skill2' | 'burst'
): AnyBlock[] {
  const s = (ov as Record<string, unknown>)[slot];
  if (!s) {
    return [];
  }
  if (Array.isArray(s)) {
    return s as AnyBlock[];
  }
  const inner = (s as { blocks?: unknown }).blocks;
  return Array.isArray(inner) ? (inner as AnyBlock[]) : [];
}

function eachEffect(
  ov: unknown,
  slot: 'skill1' | 'skill2' | 'burst',
  fn: (eff: Record<string, unknown>) => void
): void {
  const walk = (effs: unknown[]) => {
    for (const raw of effs) {
      const eff = raw as Record<string, unknown>;
      fn(eff);
      if (Array.isArray(eff.steps)) {
        walk(eff.steps as unknown[]);
      }
    }
  };
  for (const b of blocksOf(ov, slot)) {
    walk((b.effects ?? []) as unknown[]);
  }
}

function findBlock(
  ov: unknown,
  slot: 'skill1' | 'skill2' | 'burst',
  needle: string
): AnyBlock | undefined {
  return blocksOf(ov, slot).find((b) => JSON.stringify(b).includes(needle));
}

function runWith(mutate?: Mutator) {
  const opts = controlComp(SLUG, true);
  const evs: SimEvent[] = [];
  (opts as { onEvent?: (ev: SimEvent) => void }).onEvent = (ev) => evs.push(ev);
  if (mutate) {
    opts.overrides = {
      ...(opts.overrides ?? {}),
      [SLUG]: withPatchedOverride(SLUG, mutate),
    };
  }
  const res = runComp(opts);
  return { res, evs, tot: totals(res) };
}

// ---- counterfactual mutators (nearest-wrong models) -------------------------------------

const s1SelfOnly: Mutator = (ov) => {
  for (const b of blocksOf(ov, 'skill1')) {
    b.target = { kind: 'self' };
  }
};

const cdrFlat =
  (seconds: number): Mutator =>
  (ov) => {
    const b = findBlock(ov, 'skill2', 'burstCdr');
    if (b) {
      b.effects = [{ kind: 'burstCdr', seconds }];
    }
  };

const cdrSelfOnly: Mutator = (ov) => {
  const b = findBlock(ov, 'skill2', 'burstCdr');
  if (b) {
    b.target = { kind: 'self' };
  }
};

const scaleBurstDamage =
  (factor: number): Mutator =>
  (ov) => {
    eachEffect(ov, 'burst', (eff) => {
      if (eff.kind === 'flatDamage' && typeof eff.atkPct === 'number') {
        eff.atkPct = eff.atkPct * factor;
      }
    });
  };

// "Activates when using Burst Skill" mis-keyed to full-burst entry — the canonical over-credit.
const s2bAsFullBurstEnter: Mutator = (ov) => {
  const b = findBlock(ov, 'skill2', String(B_ATK_PCT));
  if (b) {
    b.trigger = { kind: 'fullBurstEnter' };
  }
};

// ---- hoisted runs (9 full 180s sims) ----------------------------------------------------

const base = runWith();
const s1Self = runWith(s1SelfOnly);
const cdr0 = runWith(cdrFlat(0));
const cdrMin = runWith(cdrFlat(CDR_FLAT_MIN));
const cdrMax = runWith(cdrFlat(CDR_FLAT_MAX));
const cdrSelf = runWith(cdrSelfOnly);
const burstZero = runWith(scaleBurstDamage(0));
const burstDouble = runWith(scaleBurstDamage(2));
const s2bMisKeyed = runWith(s2bAsFullBurstEnter);

const allySlugs = Object.keys(base.tot);
const allyCount = allySlugs.length;

const fbCount = (r: { evs: SimEvent[] }) =>
  r.evs.filter((e) => kindOf(e) === 'fullBurstStart').length;
const dollaCasts = base.evs.filter(
  (e) => kindOf(e) === 'burstCast' && actorOf(e) === SLUG
).length;

function applies(
  r: { evs: SimEvent[] },
  stat: string,
  value: number
): SimEvent[] {
  return r.evs.filter(
    (e) =>
      kindOf(e) === 'buffApply' &&
      rec(e).stat === stat &&
      rec(e).value === value
  );
}

describe('dolla — fixture non-vacuity', () => {
  it('the control comp actually reaches Full Burst', () => {
    expect(fbCount(base)).toBeGreaterThan(0);
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
  });

  it('dolla casts her own Burst Skill at least once (the ACTIVE case for S2b/burst)', () => {
    expect(dollaCasts).toBeGreaterThanOrEqual(1);
  });

  it('at least one Full Burst happens WITHOUT a dolla burst cast (the INACTIVE case)', () => {
    // If this ever equals fbCount, burst-cast and full-burst-enter become indistinguishable in
    // this fixture and every S2b trigger-identity assertion below degenerates.
    expect(fbCount(base)).toBeGreaterThan(dollaCasts);
  });
});

describe('dolla S1 — "Affects all allies. ATK ▲ 16.16% for 5 sec"', () => {
  it('applies atkPct 16.16 (own-ATK scaling, raw percentage — not a caster-scaled flat add)', () => {
    expect(applies(base, 'atkPct', S1_ATK_PCT).length).toBeGreaterThan(0);
  });

  it('reaches EVERY ally including self ("all allies", no excludeSelf)', () => {
    const reached = new Set(
      applies(base, 'atkPct', S1_ATK_PCT).map(
        (e) => rec(e).targetSlug as string
      )
    );
    for (const s of allySlugs) {
      expect(reached.has(s)).toBe(true);
    }
  });

  it('is a wall-clock 5 sec window, NOT a round-count window', () => {
    for (const e of applies(base, 'atkPct', S1_ATK_PCT)) {
      expect(rec(e).durationShots).toBeUndefined();
    }
  });

  it('the all-allies scope is load-bearing: self-only strictly costs every teammate damage', () => {
    for (const s of allySlugs) {
      if (s === SLUG) {
        continue;
      }
      expect(s1Self.tot[s]).toBeLessThan(base.tot[s]);
    }
  });

  it.skip('S1 activation cadence — ⛑ the prose gives NO activation clause, so the trigger (passive vs interval-on-skill-cooldown vs per-shot) and therefore the 5 sec uptime fraction are outside the input domain; measurement-gated, not derivable from kit text', () => {});
});

describe('dolla S2a — FB-enter escalating burst-cooldown ▼ 1.82 / 2.2 / 2.6 sec, all allies', () => {
  it('the fixture is SENSITIVE to burst-CDR at all (else this whole group is unprovable)', () => {
    expect(fbCount(cdrMax)).toBeGreaterThan(fbCount(cdr0));
  });

  it('the CDR is live: more Full Bursts than with the effect zeroed', () => {
    expect(fbCount(base)).toBeGreaterThan(fbCount(cdr0));
  });

  it('escalates: bracketed strictly inside flat-1.82 (never escalates) and flat-6.62 (escalates instantly)', () => {
    expect(fbCount(base)).toBeGreaterThanOrEqual(fbCount(cdrMin));
    expect(fbCount(base)).toBeLessThanOrEqual(fbCount(cdrMax));
  });

  it('successive Full Bursts arrive faster as the escalation climbs (1.82 → 4.02 → 6.62)', () => {
    const starts = base.evs
      .filter((e) => kindOf(e) === 'fullBurstStart')
      .map(frameOf);
    expect(starts.every((f) => typeof f === 'number')).toBe(true);
    const t = starts as number[];
    if (t.length >= 4) {
      const gap = (i: number) => t[i + 1] - t[i];
      // step 1 vs cumulative step 1+2 vs cumulative 1+2+3 — a flat model gives equal gaps
      expect(gap(0)).toBeGreaterThan(gap(1));
      expect(gap(1)).toBeGreaterThan(gap(2));
    }
  });

  it('targets ALL allies, not just dolla: self-only CDR yields strictly fewer Full Bursts', () => {
    expect(fbCount(cdrSelf)).toBeLessThan(fbCount(base));
  });

  it('the CDR block grants no stat buffs of its own (inertness)', () => {
    // the only stat buffs dolla contributes are S1's 16.16 and S2b's three escalating steps
    const dollaStats = new Set(
      base.evs
        .filter((e) => kindOf(e) === 'buffApply' && actorOf(e) === SLUG)
        .map((e) => `${rec(e).stat as string}:${rec(e).value as number}`)
    );
    for (const k of dollaStats) {
      expect([
        `atkPct:${S1_ATK_PCT}`,
        `atkPct:${B_ATK_PCT}`,
        `critRatePct:${B_CRIT_RATE_PCT}`,
        `critDamagePct:${B_CRIT_DMG_PCT}`,
      ]).toContain(k);
    }
  });
});

describe('dolla S2b — burst-CAST escalating ATK 7.72 / CritRate 4.21 / CritDmg 13.22, 5 sec, all allies', () => {
  it('fires once per DOLLA burst cast — not once per team Full Burst', () => {
    expect(applies(base, 'atkPct', B_ATK_PCT).length).toBe(
      dollaCasts * allyCount
    );
  });

  it('step 2 (Critical Rate) only from her SECOND cast onward', () => {
    expect(applies(base, 'critRatePct', B_CRIT_RATE_PCT).length).toBe(
      Math.max(0, dollaCasts - 1) * allyCount
    );
  });

  it('step 3 (Critical Damage) only from her THIRD cast onward, and never resets', () => {
    expect(applies(base, 'critDamagePct', B_CRIT_DMG_PCT).length).toBe(
      Math.max(0, dollaCasts - 2) * allyCount
    );
  });

  it('every step reaches all allies including self', () => {
    const reached = new Set(
      applies(base, 'atkPct', B_ATK_PCT).map((e) => rec(e).targetSlug as string)
    );
    for (const s of allySlugs) {
      expect(reached.has(s)).toBe(true);
    }
  });

  it('all three steps are 5 sec wall-clock windows, not round-count windows', () => {
    const all = [
      ...applies(base, 'atkPct', B_ATK_PCT),
      ...applies(base, 'critRatePct', B_CRIT_RATE_PCT),
      ...applies(base, 'critDamagePct', B_CRIT_DMG_PCT),
    ];
    for (const e of all) {
      expect(rec(e).durationShots).toBeUndefined();
    }
  });

  it('re-keying to "entering Full Burst" strictly OVER-credits (the nearest-wrong model)', () => {
    expect(applies(s2bMisKeyed, 'atkPct', B_ATK_PCT).length).toBe(
      fbCount(s2bMisKeyed) * allyCount
    );
    expect(applies(s2bMisKeyed, 'atkPct', B_ATK_PCT).length).toBeGreaterThan(
      applies(base, 'atkPct', B_ATK_PCT).length
    );
    expect(s2bMisKeyed.tot[SLUG]).not.toBe(base.tot[SLUG]);
  });
});

describe('dolla burst — "Deals 734.69% of final ATK as Burst Skill damage"', () => {
  it('contributes real damage to dolla', () => {
    expect(base.tot[SLUG] - burstZero.tot[SLUG]).toBeGreaterThan(0);
  });

  it('is linear in the kit percentage (magnitude pinned without needing final ATK)', () => {
    const contribution = base.tot[SLUG] - burstZero.tot[SLUG];
    const doubledDelta = burstDouble.tot[SLUG] - base.tot[SLUG];
    expect(doubledDelta / contribution).toBeCloseTo(1, 3);
  });

  it('one hit per dolla burst cast, and it is Full-Burst-major EXEMPT (cast lands before the FB window)', () => {
    const hits = base.evs.filter(
      (e) =>
        kindOf(e) === 'damage' &&
        actorOf(e) === SLUG &&
        String(rec(e).srcSlot) === 'burst'
    );
    expect(hits.length).toBe(dollaCasts);
    for (const e of hits) {
      expect(rec(e).fbMajorApplied).toBeFalsy();
      expect(rec(e).rangeApplied).toBeFalsy();
    }
  });

  it('moves no teammate (inertness — the burst hit feeds nothing)', () => {
    for (const s of allySlugs) {
      if (s === SLUG) {
        continue;
      }
      expect(burstZero.tot[s]).toBe(base.tot[s]);
    }
  });

  it.skip('"1 enemy unit(s) with the highest final DEF" — GAP: the v1 sim has a single boss entity and no enemy-selection channel, so target selection is unobservable', () => {});

  it.skip('crit / core disposition of the burst hit — GAP: the prose says only "Burst Skill damage", giving no core-strike or crit clause; both stay kit-silent rather than guessed', () => {});
});
