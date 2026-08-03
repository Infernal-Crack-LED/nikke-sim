// PER-UNIT KIT SPEC — `neve` (Neve, SG/Attacker/Water, Burst III, cd 40s, ammo 9, hitsPerShot 10).
// Kit-autonomy gauntlet 2026-08-02 — test-first independent re-derivation.
//
// One assertion group per kit line (N1..N6), asserted against the SHIPPED override loaded from
// disk. `withPatchedOverride` builds COUNTERFACTUALS only (the nearest wrong model each PIN must
// discriminate against) and ISOLATES the damage-inert Pierce line — never the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.neve.skills):
//   S1 "Bear Power" (10s CD) ■ 1 enemy lowest remaining HP: 145.45% of final ATK as damage   [N1,N2]
//   S2 "Hibernation" (on Full Burst enter, self) ■ Gain Pierce for 2 round(s)                [N4]
//                                                ■ ATK ▲124.8% for 2 round(s)                [N3]
//   BU "Roar" (burstCast, self) ■ Critical Rate ▲31.95% for 20 sec                           [N5]
//                               ■ Hit Rate ▲22.04% for 20 sec                                [N6]
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   N1  the S1 magnitude is 145.45% (skill level 10), NOT the level-1 value 63.63 — pinned, with
//       the level-1 counterfactual provably failing the same assertion. The hit is a bare flatDamage
//       rider, so it takes the engine rider defaults (crit-eligible, no core, skill bucket) — the
//       crit-eligibility is pinned (helm H6 convention). Target is {kind:'enemy'}: the kit reads
//       "1 enemy with the lowest remaining HP", but v1 fields a SINGLE immortal boss (no HP pool),
//       so lowest-HP is indeterminate AND moot — exactly one enemy to hit (documented stand-in).
//   N2  S1 is a 10s-CD damage proc (interval 10s — the DATAMINED skill cooldown; first fire t=10,
//       the engine interval phase convention ⚑), NOT a passive. The parser baseline mis-keyed it
//       `passive` (one hit at t=0). Pinned on cadence: ~18 fires on a 600f wall-clock grid,
//       uncorrelated with shot/burst events — the passive model fires exactly once and provably
//       fails. The interval is wall-clock, so the count is invariant to the FB cadence.
//   N3  S2 ATK is a ROUND count (durationShots:2, NO wall-clock expiry), self-scoped, keyed to
//       fullBurstEnter (fires on EVERY team Full Burst). Pinned four ways: value 124.8; durationShots
//       2 with expiresFrame null; target = neve alone; application count === Full Burst count (NOT
//       neve's own cast count). The permanent baseline (durationShots null), a timed-seconds
//       counterfactual (expiresFrame != null), and a burstCast re-key (count collapses to neve's own
//       casts < FB count) all provably fail.
//   N4  "Gain Pierce for 2 round(s)": gainPierce sets pierceUntilFrame but emits NO event, and the
//       only thing a pierce tag feeds (pierceDamagePct) is inert in v1 — so the line is unobservable
//       from the log AND damage-inert at scope lock (neve is Water/SG; helm's kit carries no Pierce
//       Damage ▲ either). Modeled for kit-completeness (naga/alice convention) as a gainPierce effect
//       on the fullBurstEnter block — NEVER a top-level hasPierce (the boolean cannot time-gate a
//       2-round FB window; the ade-agent-bunny failure shape). Proven faithfully inert by
//       byte-identical totals with the effect removed. The 2-rounds→seconds duration is a flagged ⚑
//       estimate (gainPierce has no round granularity).
//   N5  burst Critical Rate is the UNSCOPED critRatePct (lifts every neve hit, incl. the S1 rider's
//       crit roll), self-scoped, 20s, keyed to burstCast (fires ONLY on neve's own casts). Pinned:
//       value 31.95, 20s expiry, self, count === neve's burstCast count (NOT the FB count). A
//       fullBurstEnter re-key over-credits (count === FB count > neve casts) and a scoped
//       critRateNormalPct emits no critRatePct buff — both counterfactuals provably fail.
//   N6  burst Hit Rate ▲22.04% is hitRatePct (a real primitive — sim.ts hrCoreMult core-hit lift,
//       live by default; for an SG it tightens pellet landing/core exposure — NOT defensive, NOT
//       skippable), self-scoped, 20s, burstCast. The parser baseline DROPPED it — pinned red vs
//       shipped, green in S3. The Hit-Rate→core conversion MAGNITUDE is measured-only (⚑), so the
//       test pins the stat application, not a specific core-rate delta.
//
// Fixture: controlComp('neve') = [liter (B1) / crown (B2) / neve (B3) / helm (B3)] — the canonical
// 720-kit-audit control comp with neve as the carry. The co-B3 helm is DELIBERATE: neve and helm
// alternate Full Bursts, so the Full Burst count EXCEEDS neve's own cast count — the only way to
// discriminate S2's fullBurstEnter (fires every FB) from the burst lines' burstCast (fires on neve's
// casts alone). A sole-B3 fixture would make the two triggers count-equal and gate nothing. boss Fire
// (neve Water → advantaged), focus neve. Deterministic (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** controlComp slot order: liter 0 / crown 1 / neve 2 / helm 3. */
const NEVE = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type FbStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('neve'),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactuals / isolation (nearest wrong model each PIN discriminates against) ---------
/** N1 counterfactual: S1 damage at the level-1 magnitude (63.63) instead of level-10 (145.45). */
const neveS1LowLevel = withPatchedOverride('neve', (ov) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'flatDamage');
  if (!e) {
    throw new Error('neve S1 flatDamage missing — fixture is stale');
  }
  e.atkPct = 63.63;
});
/** N3 counterfactual (duration): S2 ATK as a TIMED 20s buff instead of a 2-round count. */
const neveS2Timed = withPatchedOverride('neve', (ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'atkPct');
  if (!e) {
    throw new Error('neve S2 atkPct effect missing — fixture is stale');
  }
  delete e.durationShots;
  e.durationSec = 20;
});
/** N3 counterfactual (trigger): S2 re-keyed fullBurstEnter → burstCast (fires only on neve's own
 *  casts, UNDER-crediting in the dual-B3 comp). */
const neveS2BurstCast = withPatchedOverride('neve', (ov) => {
  const b = ov.skill2.find((x: any) => x.trigger?.kind === 'fullBurstEnter');
  if (!b) {
    throw new Error('neve S2 fullBurstEnter block missing — fixture is stale');
  }
  b.trigger = { kind: 'burstCast' };
});
/** N4 isolation: drop the gainPierce effect, leaving the rest of the S2 block intact — proves the
 *  Pierce line is damage-inert at scope lock (byte-identical totals). */
const neveNoPierce = withPatchedOverride('neve', (ov) => {
  for (const b of ov.skill2) {
    b.effects = b.effects.filter((e: any) => e.kind !== 'gainPierce');
  }
  const anyPierce = ov.skill2.some((b: any) =>
    b.effects.some((e: any) => e.kind === 'gainPierce')
  );
  if (anyPierce) {
    throw new Error('neve S2 gainPierce still present — patch failed');
  }
});
/** N5 counterfactual (trigger): burst re-keyed burstCast → fullBurstEnter (fires on EVERY FB,
 *  OVER-crediting via helm's rotations). */
const neveBurstFbEnter = withPatchedOverride('neve', (ov) => {
  const b = ov.burst.find((x: any) => x.trigger?.kind === 'burstCast');
  if (!b) {
    throw new Error('neve burst burstCast block missing — fixture is stale');
  }
  b.trigger = { kind: 'fullBurstEnter' };
});
/** N5 counterfactual (scope): burst crit rate as the SCOPED critRateNormalPct (normals only). */
const neveCritScoped = withPatchedOverride('neve', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'critRatePct');
  if (!e) {
    throw new Error('neve burst critRatePct effect missing — fixture is stale');
  }
  e.stat = 'critRateNormalPct';
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const s1LowLevel = run({ neve: neveS1LowLevel });
const s2Timed = run({ neve: neveS2Timed });
const s2BurstCast = run({ neve: neveS2BurstCast });
const noPierce = run({ neve: neveNoPierce });
const burstFbEnter = run({ neve: neveBurstFbEnter });
const critScoped = run({ neve: neveCritScoped });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const neveS1Damage = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'neve' && d.srcSlot === 'skill1');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const neveBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === NEVE && b.stat === stat);
const neveBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'neve');
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e): e is FbStart => e.kind === 'fullBurstStart');

describe('neve — kit spec', () => {
  // The fixture's dual-B3 divergence is what makes the trigger pins meaningful — guard it once.
  it('fixture: Full Bursts outnumber neve\'s own casts (co-B3 helm alternates)', () => {
    const fb = fbStarts(base.events).length;
    const casts = neveBursts(base.events).length;
    expect(fb).toBeGreaterThan(0);
    expect(casts).toBeGreaterThan(0);
    expect(
      fb,
      `${fb} Full Bursts vs ${casts} neve casts — the co-B3 must make FB count exceed neve's casts`
    ).toBeGreaterThan(casts);
  });

  describe('N1 — S1 deals 145.45% of final ATK to the (single) enemy, as a crit-eligible rider', () => {
    it('is the level-10 magnitude, in the skill bucket, crit-eligible (rider default)', () => {
      const hits = neveS1Damage(base.events);
      expect(hits.length).toBeGreaterThan(0);
      expect([...new Set(hits.map((d) => d.atkPct))]).toEqual([145.45]);
      expect([...new Set(hits.map((d) => d.bucket))]).toEqual(['skill']);
      expect(hits.every((d) => d.critEligible)).toBe(true);
    });

    it('DISCRIMINATING: the level-1 magnitude (63.63) fails the same pin', () => {
      expect(
        [...new Set(neveS1Damage(s1LowLevel.events).map((d) => d.atkPct))]
      ).toEqual([63.63]);
    });
  });

  describe('N2 — S1 is a 10s-CD damage proc (interval), not a one-shot passive', () => {
    it('fires on a wall-clock 10s grid starting at t=10, ~18 times over 180s', () => {
      const hits = neveS1Damage(base.events);
      const frames = [...new Set(hits.map((d) => d.frame))].sort(
        (a, b) => a - b
      );
      expect(
        hits.length,
        `${hits.length} S1 hits — a passive fires exactly once (t=0); the 10s CD fires ~18×`
      ).toBeGreaterThanOrEqual(16);
      expect(frames[0], 'first fire must be at t=10s (the CD), not t=0').toBe(
        10 * FPS
      );
      for (let i = 1; i < frames.length; i++) {
        expect(
          frames[i] - frames[i - 1],
          `gap ${frames[i] - frames[i - 1]}f between fires ${i - 1}/${i} — expected 600f (10s)`
        ).toBe(10 * FPS);
      }
    });
  });

  describe('N3 — S2 ATK ▲124.8% is a 2-ROUND count, self-scoped, on EVERY Full Burst entry', () => {
    const atk = neveBuffs(base.events, 'atkPct');

    it('is 124.8% for 2 rounds (durationShots 2, NO wall-clock expiry)', () => {
      expect(atk.length).toBeGreaterThan(0);
      expect([...new Set(atk.map((b) => b.value))]).toEqual([124.8]);
      expect([...new Set(atk.map((b) => b.durationShots))]).toEqual([2]);
      expect(
        [...new Set(atk.map((b) => b.expiresFrame))],
        'a round-count buff must not also carry a timed expiry'
      ).toEqual([null]);
    });

    it('fires on every Full Burst entry (fullBurstEnter), held by neve alone', () => {
      const fb = fbStarts(base.events).length;
      expect(atk.length, 'fullBurstEnter fires once per FB, not per neve cast').toBe(
        fb
      );
      expect([...new Set(atk.map((b) => b.targetIdx))]).toEqual([NEVE]);
    });

    it('DISCRIMINATING (duration): a timed-seconds encoding carries a wall-clock expiry', () => {
      const timed = neveBuffs(s2Timed.events, 'atkPct');
      expect(timed.length).toBeGreaterThan(0);
      expect(
        timed.every((b) => b.expiresFrame != null),
        'the timed counterfactual must carry an expiry the round-count model lacks'
      ).toBe(true);
      expect([...new Set(timed.map((b) => b.durationShots))]).toEqual([null]);
    });

    it('DISCRIMINATING (trigger): a burstCast re-key collapses the count to neve\'s own casts', () => {
      const rekeyed = neveBuffs(s2BurstCast.events, 'atkPct');
      const casts = neveBursts(base.events).length;
      const fb = fbStarts(base.events).length;
      expect(rekeyed.length).toBe(casts);
      expect(rekeyed.length).toBeLessThan(fb);
    });
  });

  describe('N4 — S2 "Gain Pierce for 2 round(s)" is faithfully inert at scope lock', () => {
    it('removing the gainPierce effect changes NO unit total by a single point', () => {
      // gainPierce emits no event and pierceDamagePct is inert in v1, so the line's only correct
      // observable is exactly this: byte-identical totals with the effect present vs removed.
      expect(base.totals).toEqual(noPierce.totals);
    });
  });

  describe('N5 — burst Critical Rate ▲31.95% is the UNSCOPED critRatePct, self, 20s, on burstCast', () => {
    const crit = neveBuffs(base.events, 'critRatePct');

    it('is 31.95% for 20 sec on neve, once per neve burst cast (NOT every FB)', () => {
      const casts = neveBursts(base.events).length;
      expect(crit.length, 'burstCast fires on neve\'s own casts only').toBe(casts);
      expect([...new Set(crit.map((b) => b.value))]).toEqual([31.95]);
      expect([...new Set(crit.map((b) => b.targetIdx))]).toEqual([NEVE]);
      for (const b of crit) {
        expect(b.expiresFrame! - b.frame).toBe(20 * FPS);
      }
    });

    it('DISCRIMINATING (trigger): a fullBurstEnter re-key over-credits to the FB count', () => {
      const rekeyed = neveBuffs(burstFbEnter.events, 'critRatePct');
      const fb = fbStarts(base.events).length;
      const casts = neveBursts(base.events).length;
      expect(rekeyed.length).toBe(fb);
      expect(rekeyed.length).toBeGreaterThan(casts);
    });

    it('DISCRIMINATING (scope): a scoped critRateNormalPct emits no critRatePct buff', () => {
      expect(neveBuffs(critScoped.events, 'critRatePct').length).toBe(0);
      expect(
        neveBuffs(critScoped.events, 'critRateNormalPct').length
      ).toBeGreaterThan(0);
    });
  });

  describe('N6 — burst Hit Rate ▲22.04% is hitRatePct, self-scoped, 20s, on burstCast', () => {
    const hr = neveBuffs(base.events, 'hitRatePct');

    it('is 22.04% for 20 sec on neve, once per neve burst cast', () => {
      const casts = neveBursts(base.events).length;
      expect(
        hr.length,
        'no hitRatePct buff was applied — the line is still unmodeled'
      ).toBe(casts);
      expect([...new Set(hr.map((b) => b.value))]).toEqual([22.04]);
      expect([...new Set(hr.map((b) => b.targetIdx))]).toEqual([NEVE]);
      for (const b of hr) {
        expect(b.expiresFrame! - b.frame).toBe(20 * FPS);
      }
    });
  });
});
