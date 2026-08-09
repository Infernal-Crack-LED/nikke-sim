// PER-UNIT KIT SPEC — `rupee` (Rupee, Attacker/AR/Iron, Burst II, cd 20s, ammo 60,
// reloadFrames 81, rate_of_fire 720). Kit-autonomy gauntlet 2026-08-04.
//
// One assertion group per KIT LINE (R1..R6 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.rupee.skills):
//   S1 "Prize" ■ after landing 100 normal attacks → all Iron Code allies:
//        Critical Rate ▲2.24% for 10 sec                                                        [R1]
//      ■ after landing 100 normal attacks → all Iron Code allies:
//        Increases stack count of buffs by 1                                                    [R3/partial]
//   S2 "Mileage" ■ after 30 attacks → self:
//        Mileage: ATK ▲13.8%, stacks up to 5 times, lasts 15 sec                               [R2]
//   BU "Single Payment" ■ enemies within range: 274.28% of final ATK as damage                 [R4]
//      ■ Activates when Mileage is at max stacks → all allies: ATK ▲19.8% for 5 sec            [R5]
//
// Dispositions + why each assertion discriminates:
//   R1 FAITHFUL — hitCount:100 → alliesOfElement Iron → critRatePct 2.24 / 10s. Plain
//      "Critical Rate ▲" with NO "of normal attacks" clause ⇒ unscopec critRatePct (lifts every
//      crit-eligible hit of the Iron allies), NOT critRateNormalPct (the helm-H1 near-miss).
//      The fixture fields TWO Iron allies (liter + rupee) and one non-Iron (ada): the per-firing
//      holder set pins the element scope both ways — liter included (not self-only), ada excluded
//      (not all-allies). "landing" == firing (v1 has no miss model, clay precedent).
//   R2 FAITHFUL — hitCount:30 → self → atkPct 13.8, maxStacks 5, 15s. At sustained AR cadence a
//      proc lands every 30 shots (~2.6s including reload), ~5× faster than the 15s expiry, so the
//      engine's refresh-on-reapply semantics climb to 5 and keep refreshing — asserted directly
//      (post-cap applies carry stacks 5 + refresh). Nearest-wrong: the flat-passive +69% misread
//      (one apply at t=0) — strictly over-damages the ramp.
//   R3 PARTIAL (documented, ⚑ in override) — "Increases stack count of buffs by 1" (word_group
//      10001; the soda/mica-snow-buddy/pepper sentence). SELF slice: rupee's only stackable buff
//      is Mileage, folded as +1 to the `mileage` resource pool on the same hitCount:100 trigger.
//      The pool has NO event channel — it is observable ONLY through R5's gate, and no cast in any
//      legal fixture falls inside the (shot 120, shot 150) window where the S1 +1 changes gate
//      timing (casts are ≥20s apart; the window is ~4s), so the block is behaviorally inert here
//      and carries NO assertion (power-P3 pattern; the acceleration claim lives in the override
//      caveat, measurement-gated ⚑). The CROSS-ALLY slice (+1 to teammates' own stackable buffs)
//      is out-of-domain (no engine primitive, ⚑) and the stack's ATK-buff component is
//      unrepresentable without double-counting (buff instances key on caster+slot+stat+value, ⚑) —
//      both stay verbatim in the override's unmodeled. What IS pinned here: the pool currency stays
//      a RESOURCE — rupee emits buffApply events for exactly her three encoded lines and nothing
//      else, and the Mileage buff is a single keyed instance (a parallel skill1-slot Mileage buff
//      would surface as a second key — the double-count the encoding deliberately avoids).
//   R4 FAITHFUL — burstCast → enemy → flatDamage 274.28. "% of final ATK" is exactly
//      flatDamage's caster-final-ATK scaling; the partless v1 boss is the only enemy, so the AoE
//      "enemies within range" collapses to the boss taking the full value. A burst CAST lands
//      BEFORE the Full Burst window opens (and several of her casts in this fixture fall OUTSIDE
//      any FB window entirely), so no nuke may take the +50% FB major. Nearest-wrong: the stale
//      lv1 magnitude 150.85.
//   R5 FAITHFUL — burstCast + resourceGate{mileage ≥ 5} → allies → atkPct 19.8 / 5s. The engine
//      has no buff-stack gate primitive; the pool mirror is the power/pepper construction. GATE IS
//      LOAD-BEARING: the fixture's FIRST cast lands at frame 570, before the pool can possibly
//      reach 5 (shot 120 = frame 699 even WITH the S1 +1 — provable from the shot log alone), so
//      it must be silent while every later cast fires. Plain "ATK ▲" = each holder's OWN ATK
//      (atkPct), not casterAtkPct. "Affects all allies" = all five… here all three — NOT
//      Iron-scoped (ada gets it).
//   R6 FAITHFUL — the gate keys on burstCast (her OWN casts), not fullBurstEnter. This fixture
//      discriminates it WITHOUT a competing B2: the engine schedules 9 rupee casts but only 5
//      Full Burst windows (ada's 40s B3 cd throttles the chain), so a fullBurstEnter-keyed block
//      fires 4 times and the shipped burstCast-keyed block fires 8. The clay own-cast convention.
//
// Inert UNMODELED magnitudes with no assertions: none beyond the R3 partial (all kit values are
// modeled; the unmodeled quantities are the cross-ally buff-stack slice and the pool's ATK-buff
// component — both documented in the override caveats with estimate/recipe/tier).
//
// Fixture: liter(B1, Iron) / rupee(B2, Iron) / ada(B3, Water), boss Fire (Iron neutral), focus
// ada — rupee OWNS the B2 slot (controlComp seats crown at B2, where a competing B2 would muddy
// the R5/R6 gate pins), and two Iron allies make R1's element scope observable. Deterministic
// (no seed); measured in-fight values: 1644 shots, shot 120 at frame 699, 9 casts at frames
// 570/1816/3016/4328/5528/6835/8035/9240/10440, FB windows opening at 622/3068/5580/8087/10492.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
/** Fixture slot order: liter 0 / rupee 1 / ada 2. */
const LITER = 0;
const RUPEE = 1;
const ADA = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: ['liter', 'rupee', 'ada'],
    bossElement: 'Fire',
    focusSlug: 'ada',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches -------------------------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.kind === 'buff' && e.stat === stat);

/** R1 reference: her S1 crit line removed entirely. */
const rupeeNoS1Crit = withPatchedOverride('rupee', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'critRatePct'));
  if (ov.skill1.length === before) {
    throw new Error('rupee S1 critRatePct block missing — fixture is stale');
  }
});
/** R1 counterfactual: the same crit line unscoped — "all allies" instead of Iron Code allies. */
const rupeeAllAlliesCrit = withPatchedOverride('rupee', (ov) => {
  const b = ov.skill1.find((x: any) => hasStat(x, 'critRatePct'));
  if (!b) {
    throw new Error('rupee S1 critRatePct block missing — fixture is stale');
  }
  b.target = { kind: 'allies' };
});
/** R1 counterfactual: the same crit line read as SELF-only (the "affects allies" under-read). */
const rupeeSelfOnlyCrit = withPatchedOverride('rupee', (ov) => {
  const b = ov.skill1.find((x: any) => hasStat(x, 'critRatePct'));
  if (!b) {
    throw new Error('rupee S1 critRatePct block missing — fixture is stale');
  }
  b.target = { kind: 'self' };
});
/** R2 counterfactual: Mileage misread as a flat instant +69% (13.8×5, passive, no stacks, no
 *  expiry). The pool block is untouched, so the gate stays intact — this isolates the BUFF SHAPE. */
const rupeeFlatAtk = withPatchedOverride('rupee', (ov) => {
  const b = ov.skill2.find((x: any) => hasStat(x, 'atkPct'));
  if (!b) {
    throw new Error('rupee S2 atkPct stack block missing — fixture is stale');
  }
  b.trigger = { kind: 'passive' };
  const buff = b.effects.find(
    (e: any) => e.kind === 'buff' && e.stat === 'atkPct'
  );
  buff.value = 69;
  buff.maxStacks = 1;
  delete buff.durationSec;
});
/** R4 counterfactual: the lv1 magnitude 150.85 instead of the lv10 kit value 274.28 (the
 *  stale-low-level parse regression). */
const rupeeNukeLv1 = withPatchedOverride('rupee', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'flatDamage');
  if (!e) {
    throw new Error('rupee burst flatDamage missing — fixture is stale');
  }
  e.atkPct = 150.85;
});
/** R5 counterfactual: the nearest wrong model of the max-stacks condition — the SAME block with
 *  its resourceGate dropped, granting the team ATK window on EVERY cast from the first. */
const rupeeUngatedBuff = withPatchedOverride('rupee', (ov) => {
  const b = ov.burst.find((x: any) => hasStat(x, 'atkPct'));
  if (!b || !b.resourceGate) {
    throw new Error('rupee gated burst ATK block missing — fixture is stale');
  }
  delete b.resourceGate;
});
/** R5 reference: the gated burst ATK line removed entirely. */
const rupeeNoBurstBuff = withPatchedOverride('rupee', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasStat(b, 'atkPct'));
  if (ov.burst.length === before) {
    throw new Error('rupee burst atkPct block missing — fixture is stale');
  }
});
/** R5 counterfactual (gate SOURCE): both pool blocks removed — the `mileage` resource never
 *  fills, so the gate can never open. The 13.8% Mileage BUFF still stacks, isolating the gate
 *  from the damage line (the power-P5 pattern). */
const rupeeNoPool = withPatchedOverride('rupee', (ov) => {
  for (const slot of ['skill1', 'skill2'] as const) {
    const before = ov[slot].length;
    ov[slot] = ov[slot].filter(
      (b: any) => !b.effects.some((e: any) => e.kind === 'resource')
    );
    if (ov[slot].length === before) {
      throw new Error(
        `rupee ${slot} resource block missing — fixture is stale`
      );
    }
  }
});
/** R6 counterfactual: the gated block re-keyed from burstCast to fullBurstEnter — fires on FB
 *  windows the team completes, not on HER casts. */
const rupeeFbeKeyed = withPatchedOverride('rupee', (ov) => {
  const b = ov.burst.find((x: any) => hasStat(x, 'atkPct'));
  if (!b || b.trigger.kind !== 'burstCast') {
    throw new Error(
      'rupee burstCast-keyed ATK block missing — fixture is stale'
    );
  }
  b.trigger = { kind: 'fullBurstEnter' };
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noS1Crit = run({ rupee: rupeeNoS1Crit });
const allAllies = run({ rupee: rupeeAllAlliesCrit });
const selfOnly = run({ rupee: rupeeSelfOnlyCrit });
const flatAtk = run({ rupee: rupeeFlatAtk });
const nukeLv1 = run({ rupee: rupeeNukeLv1 });
const ungated = run({ rupee: rupeeUngatedBuff });
const noBurstBuff = run({ rupee: rupeeNoBurstBuff });
const noPool = run({ rupee: rupeeNoPool });
const fbeKeyed = run({ rupee: rupeeFbeKeyed });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const rupeeShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'rupee');
const rupeeCasts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'rupee'
  );
const fbStarts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Extract<SimEvent, { kind: 'fullBurstStart' }> =>
      e.kind === 'fullBurstStart'
  );
/** rupee's OWN S1 crit applies — one buffApply per holder per firing. */
const critApplies = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) => b.casterIdx === RUPEE && b.stat === 'critRatePct' && b.value === 2.24
  );
/** Distinct frames the S1 crit line fired on (one firing emits one event per holder). */
const critFirings = (evs: SimEvent[]): number[] =>
  [...new Set(critApplies(evs).map((b) => b.frame))].sort((a, b) => a - b);
/** rupee's S2 Mileage applies. */
const mileageApplies = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) => b.casterIdx === RUPEE && b.stat === 'atkPct' && b.value === 13.8
  );
/** rupee's burst ATK-window applies (one per holder per firing). */
const burstAtkApplies = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) => b.casterIdx === RUPEE && b.stat === 'atkPct' && b.value === 19.8
  );
const burstAtkFirings = (evs: SimEvent[]): number[] =>
  [...new Set(burstAtkApplies(evs).map((b) => b.frame))].sort((a, b) => a - b);
const rupeeNukes = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Damage =>
      e.kind === 'damage' && e.slug === 'rupee' && e.bucket === 'burst'
  );
/** Normal-bucket crit rates seen per unit, as fixed-precision strings (the R1 live-effect read). */
const normalCritRates = (evs: SimEvent[], slug: string): string[] =>
  [
    ...new Set(
      evs
        .filter(
          (e): e is Damage =>
            e.kind === 'damage' && e.slug === slug && e.bucket === 'normal'
        )
        .map((d) => d.critRate.toFixed(9))
    ),
  ].sort();

describe('rupee — kit spec', () => {
  describe('R1 — S1 Prize: crit rate to ALL IRON CODE allies every 100 hits', () => {
    it('fires once per 100 landed shots', () => {
      const shots = rupeeShots(base.events).length;
      expect(
        shots,
        'fixture sanity: sustained AR fire in 180s'
      ).toBeGreaterThan(1500);
      expect(critFirings(base.events).length).toBe(Math.floor(shots / 100));
    });

    it('reaches exactly the Iron Code allies (liter + herself), never the non-Iron ally', () => {
      const applies = critApplies(base.events);
      expect(applies.length).toBeGreaterThan(0);
      for (const frame of critFirings(base.events)) {
        const holders = applies
          .filter((b) => b.frame === frame)
          .map((b) => b.targetIdx)
          .sort();
        expect(holders, `firing at frame ${frame}`).toEqual([LITER, RUPEE]);
      }
      expect(
        applies.some((b) => b.targetIdx === ADA),
        'ada is Water — an unscoped encoding would reach her'
      ).toBe(false);
    });

    it('is 2.24% for 10 sec', () => {
      for (const b of critApplies(base.events)) {
        expect(b.value).toBe(2.24);
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('is LIVE: it lifts the normal crit rate, and removing it collapses the rate to base', () => {
      const lifted = normalCritRates(base.events, 'rupee');
      const baseline = normalCritRates(noS1Crit.events, 'rupee');
      expect(
        lifted.length,
        'base run must show both the bare and the lifted rate'
      ).toBe(2);
      expect(baseline.length, 'removed-crit run must be flat').toBe(1);
      expect(baseline[0]).toBe(lifted[0]);
      expect(Number(lifted[1]) - Number(lifted[0])).toBeCloseTo(0.0224, 6);
      // liter is Iron, so HER normal crit rate lifts too:
      expect(normalCritRates(base.events, 'liter').length).toBe(2);
    });

    it('DISCRIMINATING: an all-allies reading reaches ada; a self-only reading drops liter', () => {
      for (const frame of critFirings(allAllies.events)) {
        const holders = critApplies(allAllies.events)
          .filter((b) => b.frame === frame)
          .map((b) => b.targetIdx)
          .sort();
        expect(holders, 'unscoped: every firing reaches all three').toEqual([
          LITER,
          RUPEE,
          ADA,
        ]);
      }
      const selfHolders = new Set(
        critApplies(selfOnly.events).map((b) => b.targetIdx)
      );
      expect(selfHolders, 'self-only: liter never receives the buff').toEqual(
        new Set([RUPEE])
      );
      expect(
        normalCritRates(selfOnly.events, 'liter'),
        'self-only: liter keeps her bare crit rate'
      ).toEqual(normalCritRates(noS1Crit.events, 'liter'));
    });
  });

  describe('R2 — S2 Mileage: self ATK stacks, every 30 hits, to 5, with a 15s refresh', () => {
    // The S1 cross-slot merge (addStack{stat:'atkPct'}, enacted 2026-08-09) bumps the live
    // Mileage instance at the shot-100 S1 proc while stacks are below cap — one extra
    // buffApply that inherits the ORIGINAL expiry (a bump, not a refresh window).
    const s2ProcFrames = (evs: SimEvent[]) =>
      new Set(
        rupeeShots(evs)
          .filter((_, i) => (i + 1) % 30 === 0)
          .map((x) => x.frame)
      );

    it('applies once per 30 landed shots (plus the pre-cap S1 merge bumps), self-scoped', () => {
      const shots = rupeeShots(base.events).length;
      const procs = s2ProcFrames(base.events);
      const applies = mileageApplies(base.events);
      const s2Applies = applies.filter((b) => procs.has(b.frame));
      const mergeBumps = applies.filter((b) => !procs.has(b.frame));
      expect(s2Applies.length).toBe(Math.floor(shots / 30));
      expect(
        mergeBumps.length,
        'the S1 cross-slot merge must bump at least once pre-cap'
      ).toBeGreaterThan(0);
      expect([...new Set(applies.map((b) => b.targetIdx))]).toEqual([RUPEE]);
    });

    it('is 13.8% per stack, max 5 stacks, reaching max, with a 15 sec expiry', () => {
      const procs = s2ProcFrames(base.events);
      const applies = mileageApplies(base.events);
      expect([...new Set(applies.map((b) => b.value))]).toEqual([13.8]);
      expect([...new Set(applies.map((b) => b.maxStacks))]).toEqual([5]);
      expect(
        Math.max(...applies.map((b) => b.stacks)),
        'stacks must actually climb to the 5-stack cap mid-fight'
      ).toBe(5);
      for (const b of applies.filter((x) => procs.has(x.frame))) {
        expect(b.expiresFrame! - b.frame).toBe(15 * FPS);
      }
    });

    it('keeps refreshing at the cap — stacks never lapse while she keeps firing', () => {
      const applies = mileageApplies(base.events);
      expect(applies.length).toBeGreaterThan(5);
      const atCap = applies.filter((b) => b.stacks === 5);
      expect(atCap.length, 'post-cap procs must re-apply').toBeGreaterThan(10);
      expect(
        atCap.every((b) => b.refresh),
        'every post-cap apply refreshes the shared instance (refresh-on-reapply)'
      ).toBe(true);
    });

    it('DISCRIMINATING: a flat instant +69% would apply once and over-credit the ramp', () => {
      const selfAtk = buffs(flatAtk.events).filter(
        (b) =>
          b.casterIdx === RUPEE && b.stat === 'atkPct' && b.targetIdx === RUPEE
      );
      // The 19.8 burst-window buff (rupee holds her own) is untouched by this patch — filter
      // by value: exactly ONE passive 69% apply, and the 13.8% stack buff is gone.
      expect(selfAtk.filter((b) => b.value === 69).length).toBe(1);
      expect(selfAtk.filter((b) => b.value === 13.8).length).toBe(0);
      expect(
        flatAtk.totals.rupee,
        'flat +69% from t=0 must strictly out-damage the faithful 5x13.8% ramp'
      ).toBeGreaterThan(base.totals.rupee);
    });
  });

  describe('R3 — the Mileage stack is a resource pool, not a buff (gate currency for R5)', () => {
    it('rupee emits buffApply events for EXACTLY her three encoded lines — no stray stack-buff', () => {
      const fromRupee = buffs(base.events).filter((b) => b.casterIdx === RUPEE);
      expect(
        fromRupee.length,
        'fixture sanity: rupee buffs exist'
      ).toBeGreaterThan(0);
      expect(
        [...new Set(fromRupee.map((b) => `${b.stat}:${b.value}`))].sort()
      ).toEqual(['atkPct:13.8', 'atkPct:19.8', 'critRatePct:2.24']);
    });

    it('the Mileage buff is ONE keyed instance — no parallel skill1-slot copy (double-count)', () => {
      const keys = new Set(mileageApplies(base.events).map((b) => b.key));
      expect(
        keys.size,
        'a second Mileage instance would key separately and double the stacks'
      ).toBe(1);
    });
  });

  describe('R4 — burst Single Payment: 274.28% of final ATK, once per cast, pre-FB', () => {
    const nukes = rupeeNukes(base.events);

    it('fires once per burst cast at the kit magnitude, in the burst bucket', () => {
      const casts = rupeeCasts(base.events);
      expect(
        casts.length,
        'fixture sanity: rupee casts in 180s'
      ).toBeGreaterThan(5);
      expect(nukes.length).toBe(casts.length);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([274.28]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
      expect([...new Set(nukes.map((d) => d.srcSlot))]).toEqual(['burst']);
      expect(nukes.every((d) => d.critEligible)).toBe(true);
    });

    it('never takes the +50% Full Burst major (casts precede — or fall outside — FB windows)', () => {
      const took = nukes.filter((d) => d.fbMajorApplied);
      expect(
        took.map((d) => d.sec),
        'burst-cast damage must never carry the FB major'
      ).toEqual([]);
    });

    it('DISCRIMINATING: the lv1 magnitude 150.85 is not the shipped value', () => {
      expect([
        ...new Set(rupeeNukes(nukeLv1.events).map((d) => d.atkPct)),
      ]).toEqual([150.85]);
    });
  });

  describe('R5 — burst team ATK is GATED on Mileage at max stacks (the pool mirror)', () => {
    it('fixture sanity: cast 1 precedes the earliest possible pool-max, later casts follow it', () => {
      const casts = rupeeCasts(base.events);
      const shots = rupeeShots(base.events);
      // Pool cannot reach 5 before shot 120 even WITH the S1 +1 (S2 at 30/60/90 = 3, S1 at 100
      // = 1 → 4; the fifth unit lands at shot 120). First cast before it ⇒ gate closed; every
      // later cast after it ⇒ pool 5 (no decay) ⇒ gate open.
      expect(casts[0].frame).toBeLessThan(shots[119].frame);
      expect(casts[1].frame).toBeGreaterThan(shots[119].frame);
    });

    it('is silent on the gate-closed first cast and fires on every later cast', () => {
      const casts = rupeeCasts(base.events);
      const firings = burstAtkFirings(base.events);
      expect(firings).toEqual(casts.slice(1).map((c) => c.frame));
    });

    it('reaches ALL allies with 19.8% for 5 sec when it fires', () => {
      const applies = burstAtkApplies(base.events);
      expect(applies.length).toBeGreaterThan(0);
      for (const frame of burstAtkFirings(base.events)) {
        const holders = applies
          .filter((b) => b.frame === frame)
          .map((b) => b.targetIdx)
          .sort();
        expect(
          holders,
          `firing at frame ${frame} must reach all three allies`
        ).toEqual([LITER, RUPEE, ADA]);
      }
      for (const b of applies) {
        expect(b.value).toBe(19.8);
        expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
      }
    });

    it('DISCRIMINATING: gate REMOVED fires every cast; line REMOVED fires none', () => {
      const casts = rupeeCasts(ungated.events);
      expect(
        burstAtkFirings(ungated.events),
        'ungated: the window fires on EVERY cast, including the first'
      ).toEqual(casts.map((c) => c.frame));
      expect(burstAtkApplies(noBurstBuff.events)).toEqual([]);
    });

    it('DISCRIMINATING (gate SOURCE): zeroing the pool never fires the window, nukes intact', () => {
      const casts = rupeeCasts(noPool.events);
      expect(
        casts.length,
        'fixture sanity: rupee still casts without the pool'
      ).toBe(rupeeCasts(base.events).length);
      expect(
        burstAtkApplies(noPool.events),
        'with the pool at 0 the Mileage gate must never open'
      ).toEqual([]);
      expect(
        rupeeNukes(noPool.events).length,
        'the 274.28% hit is unconditional — the gate isolates from the damage line'
      ).toBe(casts.length);
      expect(
        Math.max(...mileageApplies(noPool.events).map((b) => b.stacks)),
        'the Mileage BUFF still stacks without the pool (gate isolated from the ramp)'
      ).toBe(5);
    });
  });

  describe('R6 — the gate keys on HER OWN burstCast, not on Full Burst entry', () => {
    it('fires on her casts OUTSIDE FB windows too — windows alone cannot explain the cadence', () => {
      const windows = fbStarts(base.events).map((f) => [f.frame, f.endFrame]);
      const outside = burstAtkFirings(base.events).filter(
        (frame) => !windows.some(([s, e]) => frame >= s && frame <= e)
      );
      expect(
        outside.length,
        'the engine schedules more rupee casts than FB windows; a window-keyed block cannot fire there'
      ).toBeGreaterThan(0);
    });

    it('DISCRIMINATING: fullBurstEnter keying fires on the windows, not on her casts', () => {
      const shots = rupeeShots(fbeKeyed.events);
      const windows = fbStarts(fbeKeyed.events);
      const expectFirings = windows
        .filter((w) => w.frame > shots[119].frame) // pool 5 before the window ⇒ gate open
        .map((w) => w.frame);
      expect(burstAtkFirings(fbeKeyed.events)).toEqual(expectFirings);
      expect(
        burstAtkFirings(fbeKeyed.events).length,
        'fewer windows than casts in this fixture — the keying is observable'
      ).toBeLessThan(burstAtkFirings(base.events).length);
    });
  });
});
