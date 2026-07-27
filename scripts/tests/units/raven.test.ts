// PER-UNIT KIT SPEC — `raven` (Raven, Attacker/RL/Iron, Burst III, cd 40s, ammo 6, chargeFrames 60).
// Kit-autonomy gauntlet 2026-07-25 (test-first; owner-driven spec review).
//
// One assertion group per KIT LINE (R1..R6 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) and references (a line removed to prove it is live /
// to isolate its bucket) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.raven.skills):
//   S1 ■ Full Charge attack → nearest enemy: 68.46% final ATK sustained dmg every 1s,
//                                          stacks ≤10, lasts 5s                          [R1]
//      ■ entering Full Burst → self: ATK ▲47.52% OF THE SKILL USER'S ATK for 10s          [R2]
//   S2 ■ start of battle → self: Vital Attack: Damage to Parts ▲21.12% for 5s             [R3]
//      ■ entering Full Burst → self: Vital Attack: Damage to Parts ▲21.12% for 5s         [R4]
//      ■ ally/self destroys an enemy part → Single Point Attack sustained ▲47.32%/15s
//                                            + Removes Vital Attack          [UNMODELED — parts]
//   BU ■ all enemies: 492.3% final ATK as Burst Skill damage                              [R5]
//      ■ self: A.N. Mode Effect 2: Sustained damage ▲89.44% for 10s                       [R6]
//        (A.N. Mode header + Effect 1 "Removes Single Point Attack" — UNMODELED, no-op v1)
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   R1  the DoT is a STACKING, per-shot APPEND: every full-charge pull spawns an INDEPENDENT 5s
//       instance (kit "stacks up to 10 times"), so total ticks ≈ 5 × shots. A single refreshing
//       / passive instance ticks ~once/sec regardless of shot count and collapses to a handful of
//       ticks — the counterfactual the assertion must beat. The 10-stack cap is NON-BINDING at the
//       datamined cadence (~2.8 concurrent 5s instances, peak ~3.7 < 10 — see override note) so the
//       engine's uncapped append == the capped kit here; the cap itself is a cadence ⚑, not pinned.
//   R2  "OF THE SKILL USER'S ATK" = casterAtkPct, a FLAT add of the caster's STATIC ATK. For a
//       SELF buff this is damage-equivalent to a generic atkPct (both add staticAtk×0.4752 — atkPct
//       multiplies static only, so it does NOT compound), so the total does not discriminate; the
//       faithful encoding is still casterAtkPct, and the discriminator is the buffApply VALUE the
//       engine records — flat ATK (~56.9k) for casterAtkPct vs the raw percent (47.52) for atkPct,
//       which is what diverges the moment such a buff targets another unit (caster≠holder).
//   R3/R4  partsDamagePct must be EXACTLY inert against the partless scope-lock boss — byte-identical
//       totals for every unit, not "small" — while the buffApply events prove the lines are MODELED
//       (present), not silently dropped (hard rule 3: never delete a stat buff a parts boss could use).
//   R5  a burst CAST lands BEFORE the Full Burst window opens, so the nuke must never take the +50%
//       major (verified fact, 2026-07-13), at the kit magnitude 492.3, once per cast.
//   R6  sustainedDamagePct is FLAVOR-SCOPED: it lifts the sustained DoT ticks (R1) during the A.N.
//       window but NOT raven's non-sustained normal RL shots. crown's attackDamagePct is present in
//       every run equally, so it cancels — the only thing that moves the sustained-vs-normal split is
//       the 89.44. A generic attackDamagePct counterfactual WOULD lift the normals, proving shipped
//       is specifically sustained-scoped.
//
// UNMODELED (documented, no assertion — genuinely-skippable "parts" class): S2's part-destroy branch
// (Single Point Attack sustained ▲47.32%/15s + "Removes Vital Attack") can never fire on the partless
// scope-lock boss, and the burst's "A.N. Mode" header + "Effect 1: Removes Single Point Attack" is a
// no-op because Single Point Attack never exists here. Kept VERBATIM in the override's `unmodeled`.
//
// Fixture: [liter B1 / crown B2 / raven B3], boss Fire, focus raven (RL charge → ×2.5 gauge so she
// casts). raven is slot index 2. A lone B3 makes zero Full Bursts, so she needs the liter/crown core
// to cast at all. Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** controlComp('raven', false) slot order: liter 0 / crown 1 / raven 2. */
const RAVEN = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;
type FbStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

function run(overrides: Record<string, any> = {}, helm = false) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('raven', helm),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res), res };
}

// ---- counterfactual / reference patches --------------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);
const hasKind = (b: any, kind: string) =>
  b.effects.some((e: any) => e.kind === kind);

/** R1 counterfactual: her S1 DoT as a SINGLE passive instance (fires once at t=0), not a
 *  per-shot append. The nearest wrong reading of "stacks up to 10 times" is a single refreshing
 *  sustained buff; a one-shot passive dot is its cleanest proxy (ticks ~5× total, never stacks). */
const ravenSingleDot = withPatchedOverride('raven', (ov) => {
  const b = ov.skill1.find((x: any) => hasKind(x, 'dot'));
  if (!b) {
    throw new Error('raven S1 dot block missing — fixture is stale');
  }
  b.trigger.kind = 'passive';
});
/** R2 counterfactual: the FB-enter ATK buff as a GENERIC (compounding) atkPct, not the flat
 *  caster-ATK add the kit's "of the skill user's ATK" demands. */
const ravenAtkPctS1 = withPatchedOverride('raven', (ov) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'casterAtkPct');
  if (!e) {
    throw new Error('raven S1 casterAtkPct effect missing — fixture is stale');
  }
  e.stat = 'atkPct';
});
/** R3/R4 reference: both Vital Attack parts-damage lines removed — totals must be byte-identical
 *  (inert vs the partless boss). */
const ravenNoParts = withPatchedOverride('raven', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'partsDamagePct'));
  if (ov.skill2.length !== before - 2) {
    throw new Error(
      'raven S2 expected 2 partsDamagePct blocks — fixture is stale'
    );
  }
});
/** R6 reference: the burst's sustainedDamagePct buff removed — isolates what the 89.44 feeds. */
const ravenNoSustained = withPatchedOverride('raven', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasStat(b, 'sustainedDamagePct'));
  if (ov.burst.length !== before - 1) {
    throw new Error(
      'raven burst sustainedDamagePct block missing — fixture is stale'
    );
  }
});
/** R6 counterfactual: the same buff as a GENERIC attackDamagePct — would lift her normal shots too,
 *  which the sustained-scoped shipped encoding must NOT. */
const ravenSustainedAsAttack = withPatchedOverride('raven', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'sustainedDamagePct');
  if (!e) {
    throw new Error(
      'raven burst sustainedDamagePct effect missing — fixture is stale'
    );
  }
  e.stat = 'attackDamagePct';
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const singleDot = run({ raven: ravenSingleDot });
const atkPctS1 = run({ raven: ravenAtkPctS1 });
const noParts = run({ raven: ravenNoParts });
const noSustained = run({ raven: ravenNoSustained });
const sustainedAsAttack = run({ raven: ravenSustainedAsAttack });
// Co-B3 comp [liter / crown / raven / helm]: helm is a second Burst III, so the team completes
// Full Bursts that RAVEN did NOT cast. This is the only fixture that separates a `burstCast`
// trigger (fires on raven's own casts only) from a `fullBurstEnter` trigger (fires on EVERY team
// FB) — the canonical over-credit the S2b reviewer flagged for R6 (and the mirror misread for R2).
const coB3 = run({}, true);

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const ravenDmg = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'raven');
/** R1 sustained DoT ticks (skill1 bucket). */
const s1Ticks = (evs: SimEvent[]) =>
  ravenDmg(evs).filter((d) => d.srcSlot === 'skill1');
const ravenNormals = (evs: SimEvent[]) =>
  ravenDmg(evs).filter((d) => d.bucket === 'normal');
const ravenNukes = (evs: SimEvent[]) =>
  ravenDmg(evs).filter((d) => d.srcSlot === 'burst');
const sum = (ds: Damage[]) => ds.reduce((a, d) => a + d.amount, 0);
const maxDmgUp = (ds: Damage[]) => Math.max(...ds.map((d) => d.mult.dmgUp));

const ravenShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'raven');
const ravenBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'raven'
  );
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e): e is FbStart => e.kind === 'fullBurstStart');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const ravenBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === RAVEN && b.stat === stat);

const RAVEN_STATIC_ATK = unitOf(base.res, 'raven').staticAtk;

describe('raven — kit spec', () => {
  describe('R1 — S1 full-charge sustained DoT STACKS per shot (68.46%/s, 5s, append)', () => {
    it('ticks ~5× per shot (an independent 5s instance per full-charge pull)', () => {
      const ticks = s1Ticks(base.events).length;
      const shots = ravenShots(base.events).length;
      expect(shots).toBeGreaterThan(0);
      expect(
        ticks,
        `${ticks} skill1 ticks vs ${shots} shots — a per-shot 5s instance ticks ~5× (fight-end ` +
          'truncation shaves the ratio slightly below 5); a single refreshing instance ticks ~1/s'
      ).toBeGreaterThanOrEqual(4 * shots);
    });

    it('DISCRIMINATING: a single passive instance collapses the tick count', () => {
      const stacked = s1Ticks(base.events).length;
      const single = s1Ticks(singleDot.events).length;
      expect(
        single,
        `${single} ticks for the single-instance model — one 5s passive dot ticks ~5× total`
      ).toBeLessThan(20);
      expect(stacked).toBeGreaterThan(4 * single);
    });

    it('is the kit magnitude on every tick, in the skill bucket', () => {
      const ticks = s1Ticks(base.events);
      expect(ticks.length).toBeGreaterThan(0);
      expect([...new Set(ticks.map((d) => d.atkPct))]).toEqual([68.46]);
      expect([...new Set(ticks.map((d) => d.bucket))]).toEqual(['skill']);
    });
  });

  describe('R2 — S1 FB-enter ATK buff is a FLAT caster-ATK add ("of the skill user\'s ATK")', () => {
    const applied = ravenBuffs(base.events, 'casterAtkPct');

    it('fires once per Full Burst, self-scoped, for 10 sec', () => {
      expect(
        applied.length,
        'no FB-entry casterAtkPct buff applied'
      ).toBeGreaterThan(0);
      expect(applied.length).toBe(fbStarts(base.events).length);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([RAVEN]);
      expect([
        ...new Set(applied.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([10 * FPS]);
    });

    it('is 47.52% of her STATIC ATK as a flat add (constant across every cast)', () => {
      const expected = (47.52 / 100) * RAVEN_STATIC_ATK;
      for (const b of applied) {
        expect(b.value).toBeCloseTo(expected, 1);
      }
      // A flat add of static ATK does not vary with the team's buff state at cast time.
      expect(new Set(applied.map((b) => b.value.toFixed(4))).size).toBe(1);
    });

    it('is keyed to fullBurstEnter — fires even on Full Bursts raven did NOT cast', () => {
      const fb = fbStarts(coB3.events).length;
      const ownCasts = ravenBursts(coB3.events).length;
      const appliedCoB3 = ravenBuffs(coB3.events, 'casterAtkPct');
      expect(
        ownCasts,
        'co-B3 fixture must produce FBs raven sat out'
      ).toBeLessThan(fb);
      // "when entering Full Burst" = fullBurstEnter (any team FB); a burstCast misread would
      // match only her own casts and under-fire here.
      expect(appliedCoB3.length).toBe(fb);
      expect(appliedCoB3.length).toBeGreaterThan(ownCasts);
    });

    it('DISCRIMINATING: a generic atkPct stores the PERCENT, casterAtkPct stores the FLAT ATK', () => {
      // For a SELF-targeting ATK buff the two are damage-equivalent (effectiveAtk adds
      // staticAtk×(atkPct/100) and casterAtkPct flat — both equal staticAtk×0.4752 here), so the
      // total does NOT move; the faithful "of the skill user's ATK" encoding is nonetheless
      // casterAtkPct, and the discriminator is the buffApply VALUE the engine records: the flat
      // ATK (~56.9k) for casterAtkPct vs the raw percent (47.52) for atkPct. That representation
      // is what diverges the moment such a buff targets ANOTHER unit (caster≠holder).
      const asAtkPct = ravenBuffs(atkPctS1.events, 'atkPct');
      expect(asAtkPct.length).toBeGreaterThan(0);
      expect([...new Set(asAtkPct.map((b) => b.value))]).toEqual([47.52]); // percent form
      expect(applied[0].value).toBeGreaterThan(1000); // flat-ATK scale, not a percent
      expect(base.totals.raven).toBeCloseTo(atkPctS1.totals.raven, 3); // self-buff ⇒ equivalent
    });
  });

  describe('R3/R4 — S2 Vital Attack (Damage to Parts ▲21.12%) is modeled but exactly inert', () => {
    it("removing BOTH parts-damage lines changes NO unit's total by a single point", () => {
      expect(base.totals).toEqual(noParts.totals);
    });

    it('is present (battle-start + per-FB), self-scoped, 5 sec — modeled, not dropped', () => {
      const applied = ravenBuffs(base.events, 'partsDamagePct');
      // 1 battle-start (passive) + one per Full Burst entry.
      expect(applied.length).toBe(fbStarts(base.events).length + 1);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([21.12]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([RAVEN]);
      expect([
        ...new Set(applied.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([5 * FPS]);
    });
  });

  describe('R5 — burst nuke: 492.3% of final ATK, cast BEFORE the Full Burst window', () => {
    const nukes = ravenNukes(base.events);

    it('fires once per burst cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes.length).toBe(ravenBursts(base.events).length);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([492.3]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      const took = nukes.filter((d) => d.fbMajorApplied);
      expect(
        took.map((d) => d.sec),
        'burst-cast damage must precede the FB window'
      ).toEqual([]);
    });
  });

  describe('R6 — burst A.N. Mode sustainedDamagePct 89.44% is FLAVOR-SCOPED (feeds the DoT, not normals)', () => {
    const applied = ravenBuffs(base.events, 'sustainedDamagePct');

    it('is 89.44% for 10 sec, self-scoped, once per burst cast', () => {
      expect(applied.length).toBe(ravenBursts(base.events).length);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([89.44]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([RAVEN]);
      expect([
        ...new Set(applied.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([10 * FPS]);
    });

    it('is keyed to burstCast (her OWN casts only), NOT fullBurstEnter', () => {
      const fb = fbStarts(coB3.events).length;
      const ownCasts = ravenBursts(coB3.events).length;
      const appliedCoB3 = ravenBuffs(coB3.events, 'sustainedDamagePct');
      expect(
        ownCasts,
        'co-B3 fixture must produce FBs raven sat out'
      ).toBeLessThan(fb);
      // A.N. Mode is granted inside her OWN burst block → burstCast. The canonical over-credit is
      // keying it to fullBurstEnter, which would also fire on helm-cast rotations (count == FBs).
      expect(appliedCoB3.length).toBe(ownCasts);
      expect(appliedCoB3.length).toBeLessThan(fb);
    });

    it('feeds the sustained DoT: in-window ticks carry exactly +0.8944 dmgUp', () => {
      // crown's attackDamagePct is present in BOTH runs, so it cancels in the delta — the only
      // thing that changes the sustained-tick dmgUp here is the 89.44 sustainedDamagePct.
      const delta =
        maxDmgUp(s1Ticks(base.events)) - maxDmgUp(s1Ticks(noSustained.events));
      expect(delta).toBeCloseTo(0.8944, 2);
      expect(sum(s1Ticks(base.events))).toBeGreaterThan(
        sum(s1Ticks(noSustained.events))
      );
    });

    it('does NOT touch her normal RL shots (sustained-scoped, not a generic damage buff)', () => {
      // Normal-bucket damage is byte-identical with the buff present vs removed.
      expect(sum(ravenNormals(base.events))).toBe(
        sum(ravenNormals(noSustained.events))
      );
      expect(maxDmgUp(ravenNormals(base.events))).toBe(
        maxDmgUp(ravenNormals(noSustained.events))
      );
    });

    it('DISCRIMINATING: a generic attackDamagePct WOULD lift the normal shots', () => {
      expect(maxDmgUp(ravenNormals(sustainedAsAttack.events))).toBeGreaterThan(
        maxDmgUp(ravenNormals(base.events))
      );
    });
  });

  describe('UNMODELED — part-destroy Single Point Attack (sustained ▲47.32%) is correctly ABSENT', () => {
    // "when an ally or self destroys an enemy's part" can never fire on the partless scope-lock
    // boss, so Single Point Attack must NOT be modeled. The reviewer's most-damaging plausible
    // misread is "rescuing" it as an always-on/FB-keyed sustained ▲47.32% — a ~47pp Damage-Up
    // over-credit on every DoT tick. Pin that its magnitude never appears anywhere.
    it("no sustainedDamagePct 47.32 buff is ever applied (only the burst's 89.44)", () => {
      const sustValues = new Set(
        ravenBuffs(base.events, 'sustainedDamagePct').map((b) => b.value)
      );
      expect(sustValues).toEqual(new Set([89.44]));
      expect(
        ravenBuffs(base.events, 'sustainedDamagePct').some(
          (b) => b.value === 47.32
        )
      ).toBe(false);
    });

    it('no raven buff of any stat carries the 47.32 magnitude', () => {
      const any47 = buffs(base.events).filter(
        (b) => b.casterIdx === RAVEN && b.value === 47.32
      );
      expect(any47).toEqual([]);
    });
  });
});
