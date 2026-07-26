// PER-UNIT KIT SPEC — `leona` (Leona, Supporter/SG/Water, Burst II, cd 20s, ammo 9,
// hitsPerShot 10). Kit-autonomy gauntlet 2026-07-26.
//
// One assertion group per KIT LINE (L1..L6 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.leona.skills):
//   S1 ■ after 5 normal attacks → all allies: Roar: Critical Rate ▲2.62%, ×5 stacks, 5 sec   [L1]
//      ■ after 15 normal attacks → all SG allies: Maximum Effective Range ▲20% for 10 sec    [L2]
//   S2 ■ entering Full Burst → all allies: Hit Rate ▲20.28% for 10 sec                       [L3]
//      ■ entering Full Burst → 2 highest-final-ATK SG allies: pellets ▲5 for 10 sec          [L4]
//   BU ■ all allies: Critical Damage ▲34.64% for 10 sec                                      [L5]
//      ■ when Roar is at max stacks → all SG allies: Critical Rate ▲21.32% for 10 sec        [L6]
//
// Dispositions:
//   L1 FAITHFUL — "5 normal attacks" = 5 PULLS; the engine's hitCount adds hitsPerShot (=10)
//      per pull (sim.ts:2906), so the encoding is count:50. The nearest wrong model is the
//      literal "5 hits" reading (count:5), which procs on her FIRST pull instead of her fifth.
//   L2 UNMODELED — NO ASSERTION (inert, engine-table-owned): there is no effective-range StatKey,
//      the range bonus is universally force-OFF in the engine, and SG pellet landing is the fixed
//      measured SG_LANDING_BY_BAND table with no range-buff hook. Carried VERBATIM in the
//      override's `unmodeled.skill1`; ⚑5 (real far-band under-model; recipe: SG-ally per-mag
//      landing-fraction deltas at far band ± her 15-attack proc).
//   L3 FAITHFUL — fullBurstEnter (kit-literal "entering Full Burst"); the buff lands on the FB
//      window's start frame, which is AFTER her own B2 cast frame. Nearest wrong: burstCast.
//      hitRatePct is LIVE since CONE_DELTA (feeds acrForHR core rate for AR/SMG/SG recipients);
//      in-game magnitude unmeasured (⚑2) — the event pin is exact regardless of magnitude.
//   L4 FIX + ⚑3 — "Number of pellets ▲5" is the real pelletCountFlat 5 primitive (A4, 2026-07-21:
//      +5 effective SG pellets, 10→15, threaded through the SG landing/gauge path, each pellet =
//      1/10 of the shot; gauge base-capped). The parser baseline shipped the SUPERSEDED proxy
//      normalAttackPct +50% — the encoding dorothy-serendipity and arcana-fortune-mate already
//      migrated off (dorothy's +5 pellets is the exact precedent: damage-neutral, faithful,
//      queryable). The S2b blind reviewer (claude-fable-5) independently derived pelletCountFlat 5
//      with NO sighted context. S3 lands the stat swap. The kit's "2 highest-final-ATK SG allies"
//      cap is NOT expressible — the schema has alliesTopAtk (no weapon facet) and alliesOfWeapon
//      (no ranking) but no combined kind (the blind reviewer confirmed the same schema read), so
//      the encoding targets ALL SG allies — in this 3-SG fixture leona+drake+isabel, an over-
//      application vs the true top-2 (documented ⚑3; bounded within-class wrongness, chosen over a
//      weapon-blind top-2 that would hand a spurious buff to non-SG units). The pin asserts the
//      faithful stat AND the shipped scope: exactly the SG wielders, never the SMG ally.
//   L5 FAITHFUL — no activation clause in her own burst block → burstCast; the cast lands BEFORE
//      the Full Burst window opens, so the buff is live on the cast frame. Nearest wrong:
//      fullBurstEnter (lands on the FB start frame instead).
//   L6 FAITHFUL + ⚑4 — the "when Roar is at max stacks" gate is NOT expressible (no buff-stack-
//      count gate in Block), so the shipped encoding fires UNCONDITIONALLY on every leona cast,
//      assumed satisfied at her burst (⚑4: reload-straddle Roar resets mean the gate may not
//      always hold in game — recipe: buff-icon presence at <5 stacks on cast). The pin asserts
//      the shipped unconditional behaviour: one application per cast per SG wielder, and the
//      exact SG-only scope (never the SMG ally).
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing): each group pairs a GREEN pin on the shipped encoding with a RED check on its named
// counterfactual — count:5 (L1), burstCast timing (L3), unscoped `allies` target (L4, L6),
// fullBurstEnter timing (L5).
//
// Fixture: liter (B1, 20s, SMG) / leona (B2, 20s) / drake (B3, 40s, SG) / isabel (B3, 40s, SG),
// boss Fire, focus drake. Leona is the SOLE B2, so she casts on every Full Burst (~20s cycle;
// the two 40s B3s alternate) — every FB-gated line fires ~9 times in the 180s fight. The comp
// fields THREE shotguns so the alliesOfWeapon scope has both an included set ({1,2,3}) and an
// excluded control (liter, slot 0, SMG). Leona is a PURE BUFFER — no self-damage kit lines — so
// the observables are buffApply events, not her own damage; the closing liveness gate proves the
// whole kit moves her SG allies' totals. Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
/** Slot map: liter 0 / leona 1 / drake 2 / isabel 3. */
const LITER = 0;
const LEONA = 1;
const SG_SLOTS = new Set([1, 2, 3]);
const ALL_SLOTS = new Set([0, 1, 2, 3]);

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;
type FbStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

function leonaComp(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: ['liter', 'leona', 'drake', 'isabel'],
    bossElement: 'Fire',
    focusSlug: 'drake',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches -------------------------------------------------------------------
/** L1: the literal "5 hits" misreading of "after 5 normal attacks". */
const roarCount5 = withPatchedOverride('leona', (ov) => {
  const b = ov.skill1.find((x: any) => x.trigger.kind === 'hitCount');
  if (!b || b.trigger.count !== 50)
    throw new Error('leona S1 hitCount:50 block missing — fixture is stale');
  b.trigger.count = 5;
});
/** L3: her S2 hit-rate line fired on her own cast instead of FB entry. */
const s2OnBurstCast = withPatchedOverride('leona', (ov) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'hitRatePct'),
  );
  if (!b || b.trigger.kind !== 'fullBurstEnter')
    throw new Error('leona S2 hitRatePct block missing — fixture is stale');
  b.trigger.kind = 'burstCast';
});
/** L4 nearest-wrong: the SUPERSEDED normalAttackPct +50% proxy (additive with other normal-mult
 *  buffs, no queryable pellet count). Tolerant of both shapes: post-S3 it degrades the faithful
 *  block to the proxy; pre-S3 the shipped block IS the proxy, so the run is left as-is. */
const pelletProxy = withPatchedOverride('leona', (ov) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'pelletCountFlat'),
  );
  if (b) {
    const e = b.effects.find((x: any) => x.stat === 'pelletCountFlat');
    e.stat = 'normalAttackPct';
    e.value = 50;
  } else if (
    !ov.skill2.some((x: any) =>
      x.effects.some(
        (e: any) => e.stat === 'normalAttackPct' && e.value === 50,
      ),
    )
  ) {
    throw new Error('leona S2 pellet block missing — fixture is stale');
  }
});
/** L4: the pellet line unscoped to `allies` (drops the weapon filter). Tolerant of both stats. */
const pelletsToAll = withPatchedOverride('leona', (ov) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some(
      (e: any) => e.stat === 'pelletCountFlat' || e.stat === 'normalAttackPct',
    ),
  );
  if (!b || b.target.kind !== 'alliesOfWeapon' || b.target.weapon !== 'SG')
    throw new Error('leona S2 pellet block missing — fixture is stale');
  b.target = { kind: 'allies' };
});
/** L5: both burst blocks fired on FB entry instead of her cast. */
const burstOnFbEnter = withPatchedOverride('leona', (ov) => {
  for (const b of ov.burst) {
    if (b.trigger.kind !== 'burstCast')
      throw new Error('leona burst trigger missing — fixture is stale');
    b.trigger.kind = 'fullBurstEnter';
  }
});
/** L6: the 21.32% crit line unscoped to `allies`. */
const critSgToAll = withPatchedOverride('leona', (ov) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'critRatePct'),
  );
  if (!b || b.target.kind !== 'alliesOfWeapon' || b.target.weapon !== 'SG')
    throw new Error('leona burst critRatePct block missing — fixture is stale');
  b.target = { kind: 'allies' };
});
/** Whole-kit zero: proves the buffer is live via her allies' totals, not her own damage. */
const leonaInert = withPatchedOverride('leona', (ov) => {
  ov.skill1 = [];
  ov.skill2 = [];
  ov.burst = [];
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = leonaComp();
const cfRoarCount5 = leonaComp({ leona: roarCount5 });
const cfS2BurstCast = leonaComp({ leona: s2OnBurstCast });
const cfPelletProxy = leonaComp({ leona: pelletProxy });
const cfPelletsAll = leonaComp({ leona: pelletsToAll });
const cfBurstFbEnter = leonaComp({ leona: burstOnFbEnter });
const cfCritAll = leonaComp({ leona: critSgToAll });
const inert = leonaComp({ leona: leonaInert });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
/** Leona-cast buff applications of a stat (optionally at an exact value). */
const leonaBuff = (evs: SimEvent[], stat: string, value?: number) =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === LEONA &&
      b.stat === stat &&
      (value === undefined || b.value === value),
  );
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e): e is FbStart => e.kind === 'fullBurstStart');
const leonaCasts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'leona',
  );
const leonaShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'leona');
/** Distinct holder slots reached by a set of buff applications. */
const holders = (bs: BuffApply[]) => new Set(bs.map((b) => b.targetIdx));
/** Per-application remaining duration in frames (timed buffs only). */
const durations = (bs: BuffApply[]) => bs.map((b) => b.expiresFrame! - b.frame);

describe('leona — kit spec', () => {
  it('fixture sanity: leona (sole B2) casts on every Full Burst, strictly before the window opens', () => {
    const casts = leonaCasts(base.events);
    const starts = fbStarts(base.events);
    expect(casts.length).toBeGreaterThanOrEqual(8);
    expect(starts.length).toBeGreaterThanOrEqual(8);
    expect(casts.length).toBe(starts.length);
    const startFrames = new Set(starts.map((s) => s.frame));
    for (const c of casts)
      expect(
        startFrames.has(c.frame),
        `leona cast at ${c.frame} coincides with the FB start`,
      ).toBe(false);
  });

  describe('L1 — S1 Roar: Critical Rate ▲2.62%, ×5 stacks, 5 sec, all allies, after 5 normal attacks', () => {
    const roar = leonaBuff(base.events, 'critRatePct', 2.62);

    it('first proc lands on her 5th pull — count:50 = 5 pulls × 10 pellets, not 5 hits', () => {
      const shots = leonaShots(base.events);
      expect(roar.length).toBeGreaterThan(0);
      expect(shots.length).toBeGreaterThan(5);
      const first = roar[0].frame;
      // A count:5 encoding procs on pull 1 (10 hits ≥ 5); the shipped count:50 procs on pull 5.
      expect(first, 'first Roar proc must follow her 4th pull').toBeGreaterThan(
        shots[3].frame,
      );
      expect(
        first,
        'first Roar proc must not lag her 5th pull',
      ).toBeLessThanOrEqual(shots[4].frame + 2);
    });

    it('DISCRIMINATING: count:5 (the literal "5 hits" reading) procs on her 1st pull', () => {
      const shots = leonaShots(cfRoarCount5.events);
      const first = leonaBuff(cfRoarCount5.events, 'critRatePct', 2.62)[0]
        ?.frame;
      expect(first).toBeDefined();
      expect(
        first!,
        'the counterfactual must fail the shipped pin above',
      ).toBeLessThanOrEqual(shots[0].frame + 2);
    });

    it('is 2.62% per stack, cap 5, 5-sec duration, reaching all four allies', () => {
      expect([...new Set(roar.map((b) => b.value))]).toEqual([2.62]);
      expect([...new Set(roar.map((b) => b.maxStacks))]).toEqual([5]);
      expect([...new Set(durations(roar))]).toEqual([5 * FPS]);
      expect(holders(roar)).toEqual(ALL_SLOTS);
    });

    it('stacks ratchet while she fires (live stacking) and never exceed the cap', () => {
      const maxObserved = Math.max(...roar.map((b) => b.stacks));
      expect(
        maxObserved,
        'a single-application buff would never refresh past stack 1',
      ).toBeGreaterThanOrEqual(2);
      expect(maxObserved).toBeLessThanOrEqual(5);
    });
  });

  describe('L2 — S1 Maximum Effective Range ▲20% (SG allies, after 15 attacks): UNMODELED', () => {
    it.skip('no assertion — no range StatKey exists and SG pellet landing is the fixed measured table (⚑5)', () => {
      // Carried VERBATIM in the override's unmodeled.skill1. Inert by engine construction: the
      // range bonus is universally force-OFF and the landing table has no range-buff hook.
    });
  });

  describe('L3 — S2 Hit Rate ▲20.28% on Full Burst entry, all allies, 10 sec', () => {
    const hr = leonaBuff(base.events, 'hitRatePct', 20.28);

    it('lands exactly on every Full Burst start frame — fullBurstEnter, not her cast', () => {
      const starts = fbStarts(base.events);
      expect(hr.length).toBeGreaterThan(0);
      const startFrames = new Set(starts.map((s) => s.frame));
      const hrFrames = new Set(hr.map((b) => b.frame));
      for (const s of starts)
        expect(
          hrFrames.has(s.frame),
          `no hit-rate application on the FB start at ${s.frame}`,
        ).toBe(true);
      for (const b of hr)
        expect(
          startFrames.has(b.frame),
          'a hit-rate application landed off the FB start frame',
        ).toBe(true);
    });

    it('reaches all four allies for exactly 10 sec', () => {
      expect(holders(hr)).toEqual(ALL_SLOTS);
      expect([...new Set(durations(hr))]).toEqual([10 * FPS]);
    });

    it('DISCRIMINATING: a burstCast trigger lands on her cast frame, never on the FB start', () => {
      const cf = leonaBuff(cfS2BurstCast.events, 'hitRatePct', 20.28);
      expect(cf.length).toBeGreaterThan(0);
      const startFrames = new Set(
        fbStarts(cfS2BurstCast.events).map((s) => s.frame),
      );
      expect(
        cf.filter((b) => startFrames.has(b.frame)).length,
        'the counterfactual must fail the "lands on the FB start frame" pin',
      ).toBe(0);
    });
  });

  describe('L4 — S2 pellets ▲5 → pelletCountFlat 5 to SG allies on FB entry, 10 sec (FIX; ⚑3: top-2 cap dropped)', () => {
    const pel = leonaBuff(base.events, 'pelletCountFlat', 5);

    it('is the real pellet-count primitive, not the superseded normalAttackPct +50% proxy', () => {
      expect(
        pel.length,
        'no pelletCountFlat 5 application — the encoding is still the normalAttackPct proxy',
      ).toBeGreaterThan(0);
      expect(
        leonaBuff(base.events, 'normalAttackPct', 50).length,
        'the superseded +50% proxy must be gone',
      ).toBe(0);
    });

    it('reaches exactly the shotgun wielders — never the SMG ally', () => {
      expect(holders(pel)).toEqual(SG_SLOTS);
      expect(pel.filter((b) => b.targetIdx === LITER).length).toBe(0);
    });

    it('is +5 pellets for exactly 10 sec, once per FB entry per SG wielder', () => {
      expect([...new Set(pel.map((b) => b.value))]).toEqual([5]);
      expect([...new Set(durations(pel))]).toEqual([10 * FPS]);
      expect(pel.length).toBe(fbStarts(base.events).length * SG_SLOTS.size);
    });

    it('DISCRIMINATING: the proxy encoding emits normalAttackPct 50 and no queryable pellet count', () => {
      expect(
        leonaBuff(cfPelletProxy.events, 'pelletCountFlat', 5).length,
        'the counterfactual must fail the pelletCountFlat pin',
      ).toBe(0);
      expect(
        leonaBuff(cfPelletProxy.events, 'normalAttackPct', 50).length,
      ).toBeGreaterThan(0);
    });

    it('DISCRIMINATING: an unscoped `allies` target would buff liter too', () => {
      const cf = leonaBuff(cfPelletsAll.events, 'pelletCountFlat', 5);
      expect(
        cf.some((b) => b.targetIdx === LITER),
        'the counterfactual must fail the "never the SMG ally" pin',
      ).toBe(true);
    });
  });

  describe('L5 — Burst: Critical Damage ▲34.64% to all allies, 10 sec, on HER cast', () => {
    const cd = leonaBuff(base.events, 'critDamagePct', 34.64);
    const casts = leonaCasts(base.events);

    it("lands on leona's burstCast frame (before the FB window), ×4 allies per cast", () => {
      expect(cd.length).toBe(casts.length * ALL_SLOTS.size);
      const castFrames = new Set(casts.map((c) => c.frame));
      for (const b of cd)
        expect(
          castFrames.has(b.frame),
          `crit-dmg application at ${b.frame} is not a leona cast frame`,
        ).toBe(true);
      expect(holders(cd)).toEqual(ALL_SLOTS);
      expect([...new Set(durations(cd))]).toEqual([10 * FPS]);
    });

    it('DISCRIMINATING: a fullBurstEnter trigger lands on the FB start frame, not the cast frame', () => {
      const cf = leonaBuff(cfBurstFbEnter.events, 'critDamagePct', 34.64);
      expect(cf.length).toBeGreaterThan(0);
      const castFrames = new Set(
        leonaCasts(cfBurstFbEnter.events).map((c) => c.frame),
      );
      expect(
        cf.filter((b) => castFrames.has(b.frame)).length,
        'the counterfactual must fail the "lands on the cast frame" pin',
      ).toBe(0);
    });
  });

  describe('L6 — Burst: Critical Rate ▲21.32% to SG allies, 10 sec, UNCONDITIONAL (⚑4: Roar-max gate not modeled)', () => {
    const cr = leonaBuff(base.events, 'critRatePct', 21.32);
    const casts = leonaCasts(base.events);

    it('fires on EVERY leona cast (the shipped unconditional encoding), SG wielders only', () => {
      expect(cr.length).toBe(casts.length * SG_SLOTS.size);
      expect(holders(cr)).toEqual(SG_SLOTS);
      expect(cr.filter((b) => b.targetIdx === LITER).length).toBe(0);
      expect([...new Set(durations(cr))]).toEqual([10 * FPS]);
    });

    it('DISCRIMINATING: an unscoped target would hand liter the 21.32%', () => {
      const cf = leonaBuff(cfCritAll.events, 'critRatePct', 21.32);
      expect(
        cf.some((b) => b.targetIdx === LITER),
        'the counterfactual must fail the "never the SMG ally" pin',
      ).toBe(true);
    });
  });

  describe("whole-kit liveness — Leona is a pure buffer; her value is her allies' damage", () => {
    it("zeroing every block moves both SG allies' totals (no inert encoding)", () => {
      expect(base.totals.drake).not.toBe(inert.totals.drake);
      expect(base.totals.isabel).not.toBe(inert.totals.isabel);
    });
  });
});
