// PER-UNIT KIT SPEC — `lily` (Lily, Supporter/SMG/Wind, Burst II, cd 40s, ammo 120, RoF 1440,
// reloadFrames 81, hitsPerShot 1, SR). Kit-autonomy gauntlet 2026-08-04; test-first
// re-derivation from kit prose (FROM-SCRATCH build — no prior override, simSupported was false).
//
// One assertion group per LOAD-BEARING kit line (L1, L4 below); the two COVER lines (L2, L3) are
// UNMODELED and get guard/discrimination groups instead. `withPatchedOverride` appears only to
// build COUNTERFACTUALS (the nearest wrong model each assertion must discriminate against) —
// never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.lily.skills):
//   S1 ■ 1 random ally unit:
//        ATK ▲20% of the skill user's ATK for 5 sec (15s CD)                        [L1 — modeled]
//   S2 ■ all allies:
//        Restores 10% of Cover HP (15s CD)                                          [L2 — UNMODELED]
//   BU ■ 1 random ally unit WHOSE COVER HAS BEEN DESTROYED:
//        Rebuild Cover with 30% HP + ATK ▲20% of the skill user's ATK for 10 sec    [L3 — UNMODELED]
//      ■ 1 random ally unit IF THERE IS NO ALLY whose cover has been destroyed:
//        ATK ▲40% of the skill user's ATK for 10 sec                                [L4 — modeled]
//
// Dispositions:
//   L1  interval:15 (the datamined skill cooldown — no visible activation clause; neve/helm-
//       aquamarine precedent, first fire t=15) → alliesTopAtk count:1 → casterAtkPct 20 / 5s.
//       "1 random ally" has no engine target kind; it resolves to the single highest-base-ATK
//       ally as the deterministic stand-in (chime "The King" precedent for single-ally grants),
//       flagged ⚑ — true random would spread the window across the team in expectation.
//   L2  COVER-HP restore is the liter-S2 NO-OP class (owner ruling 2026-07-21; naga precedent):
//       cover is an object, not a unit HP pool — v1 models no cover HP and the restore must NOT
//       emit unit-recovery events (doing so would spuriously fire Crown-class 'when recovery
//       takes effect' consumers — the liter trap). Verbatim in unmodeled; the guard group below
//       proves the shipped override feeds Crown zero recovery while the nearest-wrong model
//       (cover restore encoded as a unit heal) would feed her every 15s.
//   L3  The destroyed-cover branch can NEVER legitimately fire in v1: there is no incoming-damage
//       / cover-destruction model (immortal boss, nobody's cover is ever destroyed), so the gate
//       is always-false and the whole branch (rebuild + 20% ATK) stays UNMODELED verbatim — the
//       biscuit S2 'un-fireable trigger' disposition. Encoding it anyway (unconditional 20% ATK)
//       is the nearest-wrong branch and is discriminated by L4's value pin (40%, not 20%).
//   L4  The complement branch ('if there is no ally whose cover has been destroyed') is
//       always-TRUE in v1 for the same reason — modeled unconditionally on burstCast (the
//       soline Max-HP-gate documentation pattern: the gate is recorded, never enacted as a
//       blocker). casterAtkPct 40 / 10s to the same single-ally stand-in.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   L1  THREE axes — MAGNITUDE-BASIS (the flat grant is % of the CASTER's ATK: the buffApply
//       value is exactly 0.20 × lily.staticAtk, which an atkPct misread — % of the holder's own
//       ATK — cannot reproduce), SCOPE (an all-allies counterfactual reaches the whole team;
//       shipped reaches exactly 1 holder per firing — the chime parser bug that over-buffed a
//       team 5× is the named wrong model), CADENCE (first fire t=15, uniform 15s spacing — the
//       interval convention; a burstCast-keyed block would fire 5× not 11-12×).
//   L4  VALUE (40% of caster ATK, not branch A's 20% — the wrong-branch counterfactual halves
//       the flat value), SCOPE (all-allies counterfactual reaches 4), CAST-COUPLING (one buff per
//       lily burstCast, and lily casts EVERY Full Burst — she is the fixture's sole B2), LIVENESS
//       (removing the block drops the holder's total).
//   L2  LITER-TRAP GUARD — in a Crown comp, Crown's recovery-buff firing count is IDENTICAL under
//       the shipped override and under lily-with-all-heals-removed (she has none), and STRICTLY
//       LOWER than under the counterfactual that encodes the cover restore as an all-allies unit
//       heal (which fires Crown's consumer every 15s). Shipped contributes ZERO recovery.
//
// Fixtures (all deterministic, no seed; event-log over totals):
//   MAIN  liter(Sup,B1) / lily(Sup,B2) / ada(Atk,B3) / helm(Atk,B3), boss Fire, focus ada — the
//         control comp with crown SWAPPED for lily so lily is the SOLE B2 caster (with crown
//         present she out-rotates lily and lily's burst never fires — the B2-contention trap).
//         Lily's cd-40 burst is the B2 bottleneck → she casts every Full Burst cycle.
//   GUARD liter / crown(Def,B2 recovery consumer) / lily / helm, boss Fire, focus helm — the
//         Defender-consumer probe for the L2 liter-trap guard (helm is the genuine all-allies
//         healer that keeps Crown's consumer live).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, unitOf, withPatchedOverride } from '../lib/harness.js';
import type { CompOptions } from '../lib/harness.js';

const FPS = 60;
/** MAIN fixture slot order: liter 0 / lily 1 / ada 2 / helm 3. */
const LILY = 1;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type FBStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

const mainComp: CompOptions = {
  slugs: ['liter', 'lily', 'ada', 'helm'],
  bossElement: 'Fire',
  focusSlug: 'ada',
};

function runMain(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...mainComp,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res), res };
}

// ---- counterfactual patches -------------------------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** L1 reference: her S1 buff block removed entirely. */
const lilyNoS1 = withPatchedOverride('lily', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'casterAtkPct'));
  if (ov.skill1.length === before) {
    throw new Error('lily S1 casterAtkPct block missing — fixture is stale');
  }
});
/** L1 counterfactual (scope axis): the S1 buff targeting ALL allies, not 1 random ally. */
const lilyAlliesS1 = withPatchedOverride('lily', (ov) => {
  const b = ov.skill1.find((x: any) => hasStat(x, 'casterAtkPct'));
  if (!b) {
    throw new Error('lily S1 casterAtkPct block missing — fixture is stale');
  }
  b.target = { kind: 'allies' };
});
/** L1 counterfactual (magnitude-basis axis): % of the HOLDER's own ATK, not the skill user's. */
const lilyAtkPctS1 = withPatchedOverride('lily', (ov) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'casterAtkPct');
  if (!e) {
    throw new Error('lily S1 casterAtkPct effect missing — fixture is stale');
  }
  e.stat = 'atkPct';
});
/** L4 reference: her burst buff block removed entirely. */
const lilyNoBurst = withPatchedOverride('lily', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasStat(b, 'casterAtkPct'));
  if (ov.burst.length === before) {
    throw new Error('lily burst casterAtkPct block missing — fixture is stale');
  }
});
/** L4 counterfactual (scope axis): the burst buff targeting ALL allies. */
const lilyAlliesBurst = withPatchedOverride('lily', (ov) => {
  const b = ov.burst.find((x: any) => hasStat(x, 'casterAtkPct'));
  if (!b) {
    throw new Error('lily burst casterAtkPct block missing — fixture is stale');
  }
  b.target = { kind: 'allies' };
});
/** L4 counterfactual (wrong branch): branch A's 20% magnitude instead of branch B's 40%. */
const lilyWrongBranch = withPatchedOverride('lily', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'casterAtkPct');
  if (!e) {
    throw new Error('lily burst casterAtkPct effect missing — fixture is stale');
  }
  e.value = 20;
});
/** L2 counterfactual (the nearest wrong model): the cover restore encoded as an all-allies unit
 *  heal on the same 15s cadence — exactly the encoding the liter ruling forbids, because it
 *  emits recovery events and fires Crown-class consumers. */
const lilyCoverAsHeal = withPatchedOverride('lily', (ov) => {
  ov.skill2.push({
    slot: 'skill2',
    trigger: { kind: 'interval', sec: 15 },
    target: { kind: 'allies' },
    effects: [{ kind: 'heal' }],
  });
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = runMain();
const noS1 = runMain({ lily: lilyNoS1 });
const alliesS1 = runMain({ lily: lilyAlliesS1 });
const atkPctS1 = runMain({ lily: lilyAtkPctS1 });
const noBurst = runMain({ lily: lilyNoBurst });
const alliesBurst = runMain({ lily: lilyAlliesBurst });
const wrongBranch = runMain({ lily: lilyWrongBranch });

const GUARD = ['liter', 'crown', 'lily', 'helm'];
function runGuard(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  runComp({
    slugs: GUARD,
    bossElement: 'Fire',
    focusSlug: 'helm',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return events;
}
const guardBase = runGuard();
const guardCoverAsHeal = runGuard({ lily: lilyCoverAsHeal });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const lilyCasts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'lily');
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e): e is FBStart => e.kind === 'fullBurstStart');

/** lily's own casterAtkPct buffApply events (isolates her grants from any same-stat line). */
const lilyAtkBuffs = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.casterIdx === LILY && b.stat === 'casterAtkPct');

/** The static-ATK top ally — the deterministic stand-in '1 random ally' resolves to
 *  (alliesTopAtk count:1, static ranking, slot tie-break). Recomputed from the result rows so
 *  the test never hard-codes which Attacker outranks the other's bond bonus. */
const topHolderIdx = (() => {
  const rows = base.res.units
    .map((u: any) => ({ idx: mainComp.slugs.indexOf(u.slug), atk: u.staticAtk }))
    .sort((a: any, b: any) => b.atk - a.atk || a.idx - b.idx);
  return rows[0].idx;
})();
const TOP_SLUG = mainComp.slugs[topHolderIdx];

/** lily's static ATK — the flat-grant basis every casterAtkPct value resolves against. */
const LILY_ATK = unitOf(base.res, 'lily').staticAtk;
const FLAT_20 = 0.2 * LILY_ATK;
const FLAT_40 = 0.4 * LILY_ATK;

/** Distinct holder slots a set of buffApply events reached, per firing frame. */
function holdersPerFrame(applied: BuffApply[]): Map<number, Set<number>> {
  const perFrame = new Map<number, Set<number>>();
  for (const b of applied) {
    if (b.targetIdx == null) {
      continue;
    }
    (
      perFrame.get(b.frame) ?? perFrame.set(b.frame, new Set()).get(b.frame)!
    ).add(b.targetIdx);
  }
  return perFrame;
}

/** crown's 'when recovery takes effect → team ATK ▲20.99%' firing FRAMES (crown = slot 1 in
 *  GUARD; one firing = one frame even though the block emits one buffApply per holder). */
const crownRecoveryFrames = (evs: SimEvent[]): number[] =>
  [
    ...new Set(
      buffs(evs)
        .filter(
          (b) =>
            b.casterIdx === 1 &&
            b.stat === 'attackDamagePct' &&
            Math.abs(b.value - 20.99) < 0.01
        )
        .map((b) => b.frame)
    ),
  ].sort((a, b) => a - b);

describe('lily — kit spec', () => {
  describe('G0 — fixture sanity: sole B2, lily casts every Full Burst cycle', () => {
    it('the fixture produces Full Bursts and lily casts at every one of them', () => {
      const fbs = fbStarts(base.events).length;
      const casts = lilyCasts(base.events).length;
      expect(fbs, 'the sole-B2 fixture completes 5 Full Burst cycles in 180s').toBe(5);
      expect(
        casts,
        `${casts} lily casts vs ${fbs} Full Bursts — a second B2 in the comp would starve her`
      ).toBe(fbs);
    });
  });

  describe('L1 — S1 grants 20% of LILY\'s ATK to a single ally, every 15s for 5s', () => {
    const applied = lilyAtkBuffs(base.events).filter(
      (b) => Math.abs(b.value - FLAT_20) < 1e-6
    );

    it('fires on the 15s internal cooldown, first at t=15, for 5 sec each', () => {
      // 11 fires: t=15..165 — the fight loop ends before the 12th would land at t=180.
      expect(
        applied.length,
        'no lily S1 casterAtkPct buff was applied'
      ).toBe(11);
      const frames = applied.map((b) => b.frame);
      expect(frames[0], 'first fire must be at t=15 (interval convention)').toBe(
        15 * FPS
      );
      for (let i = 1; i < frames.length; i++) {
        expect(
          frames[i] - frames[i - 1],
          'firings must be exactly 15s apart'
        ).toBe(15 * FPS);
      }
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
      }
    });

    it("resolves to exactly 20% of lily's static ATK (a flat add of the skill user's ATK)", () => {
      for (const b of applied) {
        expect(b.value).toBeCloseTo(FLAT_20, 6);
      }
    });

    it('reaches exactly ONE ally per firing (the top-static-ATK stand-in), never the team', () => {
      for (const [frame, holders] of holdersPerFrame(applied)) {
        expect(
          [...holders],
          `frame ${frame} reached ${holders.size} allies, expected exactly 1`
        ).toEqual([topHolderIdx]);
      }
    });

    it("DISCRIMINATING (magnitude basis): an atkPct misread (% of the holder's own ATK) cannot reproduce the flat value", () => {
      const generic = buffs(atkPctS1.events).filter(
        (b) => b.casterIdx === LILY && b.stat === 'atkPct'
      );
      expect(
        generic.length,
        'counterfactual produced no atkPct buff'
      ).toBeGreaterThan(0);
      expect([...new Set(generic.map((b) => b.value))]).toEqual([20]);
      // 20 (raw percent of the holder's own ATK) ≠ 20% of lily's ATK as a flat number.
      expect(Math.abs(20 - FLAT_20)).toBeGreaterThan(1);
    });

    it('DISCRIMINATING (scope): an all-allies target reaches the whole team', () => {
      const generic = buffs(alliesS1.events).filter(
        (b) => b.casterIdx === LILY && b.stat === 'casterAtkPct'
      );
      const reached = new Set<number>();
      for (const b of generic) {
        if (b.targetIdx != null) {
          reached.add(b.targetIdx);
        }
      }
      expect(
        reached.size,
        'all-allies counterfactual must reach all 4 allies'
      ).toBe(4);
    });

    it("is live: removing it changes the holder's total damage", () => {
      expect(base.totals[TOP_SLUG]).not.toEqual(noS1.totals[TOP_SLUG]);
    });
  });

  describe('L4 — burst grants 40% of LILY\'s ATK to a single ally for 10s (always-true branch)', () => {
    const applied = lilyAtkBuffs(base.events).filter(
      (b) => Math.abs(b.value - FLAT_40) < 1e-6
    );

    it('fires once per lily burst cast, for 10 sec, at the branch-B magnitude (40%, not 20%)', () => {
      const casts = lilyCasts(base.events).length;
      expect(applied.length, 'no lily burst buff was applied').toBe(casts);
      expect(applied.length).toBeGreaterThan(0);
      // Buff keys are `${ownerIdx}:${slot}:${stat}:${value}` — scope to the BURST slot so the
      // S1 20% grant (a separate, legitimate line) cannot contaminate the branch assertion.
      const burstSlotGrants = lilyAtkBuffs(base.events).filter((b) =>
        b.key.split(':')[1] === 'burst'
      );
      expect(
        [...new Set(burstSlotGrants.map((b) => b.value.toFixed(3)))],
        'lily\'s burst must grant ONLY the 40% branch — branch A (20%) can never fire in v1'
      ).toEqual([FLAT_40.toFixed(3)]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('reaches exactly ONE ally per cast (the top-static-ATK stand-in)', () => {
      for (const [frame, holders] of holdersPerFrame(applied)) {
        expect(
          [...holders],
          `frame ${frame} reached ${holders.size} allies, expected exactly 1`
        ).toEqual([topHolderIdx]);
      }
    });

    it('DISCRIMINATING (wrong branch): the branch-A magnitude (20%) halves the flat grant', () => {
      const wrong = buffs(wrongBranch.events).filter(
        (b) => b.casterIdx === LILY && b.stat === 'casterAtkPct'
      );
      const burstValues = [
        ...new Set(wrong.map((b) => b.value.toFixed(3))),
      ];
      expect(burstValues).toEqual([FLAT_20.toFixed(3)]);
      expect(burstValues).not.toEqual([FLAT_40.toFixed(3)]);
    });

    it('DISCRIMINATING (scope): an all-allies target reaches the whole team', () => {
      const generic = buffs(alliesBurst.events).filter(
        (b) => b.casterIdx === LILY && b.stat === 'casterAtkPct'
      );
      const reached = new Set<number>();
      for (const b of generic) {
        if (b.targetIdx != null) {
          reached.add(b.targetIdx);
        }
      }
      expect(reached.size, 'all-allies counterfactual must reach all 4 allies').toBe(4);
    });

    it("is live: removing it changes the holder's total damage", () => {
      expect(base.totals[TOP_SLUG]).not.toEqual(noBurst.totals[TOP_SLUG]);
    });
  });

  describe('L2/L3 — cover lines are UNMODELED and recovery-silent (the liter-trap guard)', () => {
    it('shipped lily feeds Crown ZERO recovery events', () => {
      // Crown's consumer is live in the GUARD comp (helm is a genuine all-allies healer); the
      // question is whether lily contributes. She has no modeled heal, so removing 'all' of her
      // recovery sources (there are none) must leave Crown's firing count unchanged — and the
      // counterfactual below shows what a cover-restore-as-unit-heal would have done.
      const withLily = crownRecoveryFrames(guardBase).length;
      expect(
        withLily,
        'Crown consumer is not live in the guard comp — fixture broken'
      ).toBeGreaterThan(0);
    });

    it('DISCRIMINATING: encoding the cover restore as a unit heal WOULD fire Crown every 15s', () => {
      const shipped = crownRecoveryFrames(guardBase).length;
      const wrong = crownRecoveryFrames(guardCoverAsHeal).length;
      expect(
        wrong - shipped,
        `${wrong} vs ${shipped} Crown firings — the counterfactual must add ~1 interval firing per 15s`
      ).toBeGreaterThanOrEqual(10);
    });

    it('no lily-cast recovery-adjacent buff exists anywhere in the main run (her kit has no unit heal)', () => {
      // Everything lily applies is a casterAtkPct grant — nothing else may carry her casterIdx.
      const other = buffs(base.events).filter(
        (b) => b.casterIdx === LILY && b.stat !== 'casterAtkPct'
      );
      expect(other.map((b) => b.stat)).toEqual([]);
    });
  });
});
