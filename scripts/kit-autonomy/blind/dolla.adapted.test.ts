/**
 * dolla — ADAPTED BLIND kit-spec test (S5 cross-family reconciliation).
 *
 * This is the claude-opus-5 S5 blind test (scripts/kit-autonomy/blind/dolla.test.ts), reconciled
 * to the real harness so it runs GREEN against the driver override. The blind writer's KIT-LINE
 * CLAIMS and counterfactual designs are preserved verbatim; only three harness/physics artifacts
 * are adapted (each documented inline). KIT (SR / Wind / Supporter / Burst II, cd 20s):
 *   S1  "Affects all allies. ATK ▲ 16.16% for 5 sec." (no activation clause → interval:10)
 *   S2a "Entering Full Burst → all allies" escalating burst-CDR ▼ 1.82 / 2.2 / 2.6 (cumulative)
 *   S2b "Using Burst Skill → all allies" escalating ATK 7.72 / CritRate 4.21 / CritDmg 13.22, 5s
 *   B   "1 enemy highest final DEF: 734.69% of final ATK as Burst Skill damage"
 *
 * ADAPTATIONS (blind-test artifact → fix; the kit claims are unchanged):
 *   A1. The blind test set `opts.onEvent` directly; runComp reads it from `opts.cfg`. Moved into
 *       cfg so events are actually captured (without this, every event count reads 0).
 *   A2. The blind test asserted `durationShots` is `undefined` for timed buffs; the engine emits
 *       `null`. Relaxed to `toBeFalsy()` — same intent ("a wall-clock window, NOT a round count").
 *   A3. FIXTURE. The blind test used controlComp('dolla', true) = liter/crown/dolla/helm. Crown
 *       takes EVERY Burst II slot there, so dolla casts 0 bursts and the whole S2b/burst group is
 *       vacuous (the blind test's own non-vacuity guard flags this). Swapped the co-B2 to blanc
 *       (liter/blanc/dolla/helm, focus helm): dolla casts 4 of 5 Full Bursts — she casts (active
 *       case) AND at least one Full Burst happens without her cast (inactive case), preserving the
 *       burstCast-vs-fullBurstEnter discrimination the blind writer designed.
 *   A4. S2a INSTRUMENT. The blind test read the CDR through Full Burst COUNT — but the count is
 *       ceiling-bound (5 FBs for EVERY arm: base / cdr0 / flat1.82 / flat6.62 / self-only), exactly
 *       the ceiling the liter gauntlet documented and switched to TIMING for. S2a is adapted to the
 *       timing instrument on a sole-B2 vehicle (miranda/dolla/helm) where dolla's 2nd cast is
 *       cooldown-bound (gap = exactly 20s − 1.82s) and the ladder's tiers are readable. Same claims
 *       (live / escalating / cumulative / all-ally), discriminating instrument.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  data,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
  type CompOptions,
} from '../../tests/lib/harness.js';

const SLUG = 'dolla';
const FPS = 60;

// kit magnitudes, verbatim from the prose
const S1_ATK_PCT = 16.16;
const B_ATK_PCT = 7.72;
const B_CRIT_RATE_PCT = 4.21;
const B_CRIT_DMG_PCT = 13.22;
const CDR_FLAT_MIN = 1.82; // "Once:" only, never escalating
const CDR_FLAT_MAX = 6.62; // 1.82 + 2.2 + 2.6, escalating instantly
const BURST_ATK_PCT = 734.69;

type Mutator = Parameters<typeof withPatchedOverride>[1];

// A3: dual-B2 fixture where dolla actually casts (4 of 5 FBs) — preserves trigger-identity discrim.
const MAIN_COMP: CompOptions = {
  slugs: ['liter', 'blanc', 'dolla', 'helm'],
  bossElement: 'Fire',
  focusSlug: 'helm',
};
// A4: sole-B2 timing vehicle — dolla's 2nd cast is cooldown-bound (gap = 20s − 1.82s exactly).
const CDR_COMP: CompOptions = {
  slugs: ['miranda', 'dolla', 'helm'],
  bossElement: 'Fire',
  focusSlug: 'helm',
};

const rec = (e: SimEvent) => e as unknown as Record<string, unknown>;
const kindOf = (e: SimEvent) => rec(e).kind as string;

function runWith(comp: CompOptions, mutate?: Mutator) {
  const events: SimEvent[] = [];
  const overrides = mutate ? { [SLUG]: withPatchedOverride(SLUG, mutate) } : {};
  const res = runComp({
    ...comp,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  }); // A1
  return { res, evs: events, tot: totals(res) };
}

// ---- counterfactual mutators (nearest-wrong models) -------------------------------------
const s1SelfOnly: Mutator = (ov) => {
  for (const b of ov.skill1) {
    b.target = { kind: 'self' };
  }
};
const cdrBlock = (ov: any) =>
  ov.skill2.find((b: any) => b.trigger.kind === 'fullBurstEnter');
const cdrFlat =
  (seconds: number): Mutator =>
  (ov) => {
    cdrBlock(ov).effects = [{ kind: 'burstCdr', seconds }];
  };
const cdrRemove: Mutator = (ov) => {
  ov.skill2 = ov.skill2.filter((b: any) => b.trigger.kind !== 'fullBurstEnter');
};
const cdrSelfOnly: Mutator = (ov) => {
  cdrBlock(ov).target = { kind: 'self' };
};
const scaleBurstDamage =
  (factor: number): Mutator =>
  (ov) => {
    for (const b of ov.burst) {
      for (const eff of b.effects) {
        if (eff.kind === 'flatDamage') {
          eff.atkPct = eff.atkPct * factor;
        }
      }
    }
  };
// "Activates when using Burst Skill" mis-keyed to full-burst entry — the canonical over-credit.
const s2bAsFullBurstEnter: Mutator = (ov) => {
  ov.skill2.find((b: any) => b.trigger.kind === 'burstCast').trigger = {
    kind: 'fullBurstEnter',
  };
};

// ---- hoisted runs -----------------------------------------------------------------------
const base = runWith(MAIN_COMP);
const s1Self = runWith(MAIN_COMP, s1SelfOnly);
const burstZero = runWith(MAIN_COMP, scaleBurstDamage(0));
const burstDouble = runWith(MAIN_COMP, scaleBurstDamage(2));
const s2bMisKeyed = runWith(MAIN_COMP, s2bAsFullBurstEnter);

// CDR timing vehicle arms (A4)
const cBase = runWith(CDR_COMP);
const cNoCdr = runWith(CDR_COMP, cdrRemove);
const cFlatTier1 = runWith(CDR_COMP, cdrFlat(CDR_FLAT_MIN));
const cNonCumulative = runWith(CDR_COMP, cdrFlat(2.6)); // 3rd tier REPLACES, not adds
const cSaturated = runWith(CDR_COMP, cdrFlat(CDR_FLAT_MAX)); // instant max from entry 1
const cSelf = runWith(CDR_COMP, cdrSelfOnly);

const allySlugs = Object.keys(base.tot);
const allyCount = allySlugs.length;

const fbCount = (r: { evs: SimEvent[] }) =>
  r.evs.filter((e) => kindOf(e) === 'fullBurstStart').length;
const fbFrames = (r: { evs: SimEvent[] }) =>
  r.evs
    .filter((e) => kindOf(e) === 'fullBurstStart')
    .map((e) => rec(e).frame as number);
const dollaCasts = (r: { evs: SimEvent[] }) =>
  r.evs.filter((e) => kindOf(e) === 'burstCast' && rec(e).slug === SLUG).length;
const dollaCastFrames = (r: { evs: SimEvent[] }) =>
  r.evs
    .filter((e) => kindOf(e) === 'burstCast' && rec(e).slug === SLUG)
    .map((e) => rec(e).frame as number);
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
  it('the comp reaches Full Burst and dolla deals damage', () => {
    expect(fbCount(base)).toBeGreaterThan(0);
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
  });
  it('dolla casts her own Burst Skill at least once (ACTIVE case for S2b/burst)', () => {
    expect(dollaCasts(base)).toBeGreaterThanOrEqual(1);
  });
  it('at least one Full Burst happens WITHOUT a dolla cast (INACTIVE case)', () => {
    expect(fbCount(base)).toBeGreaterThan(dollaCasts(base));
  });
});

describe('dolla S1 — "Affects all allies. ATK ▲ 16.16% for 5 sec"', () => {
  it('applies atkPct 16.16 (own-ATK scaling raw percentage)', () => {
    expect(applies(base, 'atkPct', S1_ATK_PCT).length).toBeGreaterThan(0);
  });
  it('reaches EVERY ally including self ("all allies", no excludeSelf)', () => {
    const reached = new Set(
      applies(base, 'atkPct', S1_ATK_PCT).map((e) => rec(e).targetSlug)
    );
    for (const s of allySlugs) {
      expect(reached.has(s)).toBe(true);
    }
  });
  it('is a wall-clock 5 sec window, NOT a round-count window', () => {
    for (const e of applies(base, 'atkPct', S1_ATK_PCT)) {
      expect(rec(e).durationShots).toBeFalsy(); // A2: engine emits null for timed buffs
      expect((rec(e).expiresFrame as number) - (rec(e).frame as number)).toBe(
        5 * FPS
      );
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
  it.skip('S1 activation cadence — ⛑ kit-silent (no activation clause); measurement-gated. Driver sources interval:10 from skillCooldownsSec.skill1=10 (datamined); the blind writer guessed 20 (the burst CD) and flagged it.', () => {});
});

describe('dolla S2a — FB-enter escalating burst-CDR ▼ 1.82 / 2.2 / 2.6, all allies (timing instrument, A4)', () => {
  it('EXACT: the first activation grants the FIRST TIER ALONE (1.82s)', () => {
    const casts = dollaCastFrames(cBase);
    expect(casts.length).toBeGreaterThan(1);
    const gap = casts[1] - casts[0];
    const baseCd = data.characters.dolla.burstCooldownSec * FPS;
    const tier1 = Math.round(1.82 * FPS);
    expect(gap).toBe(baseCd - tier1); // 20s − 1.82s; cumulative/flat-2.6/flat-6.62 would be shorter
  });
  it('the CDR is LIVE: Full Bursts arrive earlier than with the effect removed', () => {
    const ship = fbFrames(cBase);
    const no = fbFrames(cNoCdr);
    const k = Math.min(ship.length, no.length);
    expect(k).toBeGreaterThan(2);
    expect(no.slice(0, k).every((f, i) => f >= ship[i])).toBe(true);
    expect(no.slice(0, k).some((f, i) => f > ship[i])).toBe(true);
  });
  it('ESCALATES past flat tier-1: later Full Bursts arrive earlier than a stuck-at-1.82 ladder', () => {
    const ship = fbFrames(cBase);
    const flat = fbFrames(cFlatTier1);
    const k = Math.min(ship.length, flat.length);
    expect(k).toBeGreaterThanOrEqual(3);
    expect(ship.slice(2, k).some((f, i) => f < flat[i + 2])).toBe(true);
  });
  it('CUMULATIVE: from the 3rd FB on, beats a non-cumulative flat-2.6 ladder (tiers ADD UP)', () => {
    const ship = fbFrames(cBase);
    const nc = fbFrames(cNonCumulative);
    const k = Math.min(ship.length, nc.length);
    expect(k).toBeGreaterThanOrEqual(3);
    expect(ship.slice(2, k).every((f, i) => f <= nc[i + 2])).toBe(true);
    expect(ship.slice(2, k).some((f, i) => f < nc[i + 2])).toBe(true);
  });
  it('RAMPS: a saturated flat-6.62 ladder reaches every FB no later than the real ramp', () => {
    const ramp = fbFrames(cBase);
    const sat = fbFrames(cSaturated);
    const k = Math.min(ramp.length, sat.length);
    expect(k).toBeGreaterThan(2);
    expect(sat.slice(0, k).every((f, i) => f <= ramp[i])).toBe(true);
    expect(sat.slice(0, k).some((f, i) => f < ramp[i])).toBe(true);
  });
  it('targets ALL allies, not just dolla: self-only CDR yields strictly LATER Full Bursts', () => {
    const ship = fbFrames(cBase);
    const self = fbFrames(cSelf);
    const k = Math.min(ship.length, self.length);
    expect(k).toBeGreaterThan(2);
    expect(self.slice(0, k).every((f, i) => f >= ship[i])).toBe(true);
    expect(self.slice(0, k).some((f, i) => f > ship[i])).toBe(true);
  });
  it('the CDR block grants no stat buffs of its own (inertness)', () => {
    const DOLLA_IDX = MAIN_COMP.slugs.indexOf(SLUG);
    const dollaStats = new Set(
      base.evs
        .filter(
          (e) => kindOf(e) === 'buffApply' && rec(e).casterIdx === DOLLA_IDX
        )
        .map((e) => `${rec(e).stat}:${rec(e).value}`)
    );
    // dolla's only stat buffs are S1 16.16 and S2b's three steps; the CDR block adds none
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

describe('dolla S2b — burst-CAST escalating ATK 7.72 / CritRate 4.21 / CritDmg 13.22, 5s, all allies', () => {
  it('fires once per DOLLA burst cast — not once per team Full Burst', () => {
    expect(applies(base, 'atkPct', B_ATK_PCT).length).toBe(
      dollaCasts(base) * allyCount
    );
  });
  it('step 2 (Critical Rate) only from her SECOND cast onward', () => {
    expect(applies(base, 'critRatePct', B_CRIT_RATE_PCT).length).toBe(
      Math.max(0, dollaCasts(base) - 1) * allyCount
    );
  });
  it('step 3 (Critical Damage) only from her THIRD cast onward, and never resets', () => {
    expect(applies(base, 'critDamagePct', B_CRIT_DMG_PCT).length).toBe(
      Math.max(0, dollaCasts(base) - 2) * allyCount
    );
  });
  it('every step reaches all allies including self', () => {
    const reached = new Set(
      applies(base, 'atkPct', B_ATK_PCT).map((e) => rec(e).targetSlug)
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
      expect(rec(e).durationShots).toBeFalsy();
    } // A2
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
  it('one hit per dolla burst cast, at the kit magnitude, Full-Burst-major EXEMPT (cast lands before the FB window)', () => {
    const hits = base.evs.filter(
      (e) =>
        kindOf(e) === 'damage' &&
        rec(e).slug === SLUG &&
        String(rec(e).srcSlot) === 'burst'
    );
    expect(hits.length).toBe(dollaCasts(base));
    for (const e of hits) {
      expect(rec(e).atkPct).toBe(BURST_ATK_PCT);
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
  it.skip('"1 enemy with the highest final DEF" — GAP: single-boss sim, target selection unobservable', () => {});
  it.skip('crit/core disposition of the burst hit — GAP: prose says only "Burst Skill damage"; kit-silent', () => {});
});
