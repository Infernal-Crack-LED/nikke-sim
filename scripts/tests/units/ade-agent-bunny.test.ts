// PER-UNIT KIT SPEC — `ade-agent-bunny` (Ade: Agent Bunny, Supporter/SR/Iron, Burst II, cd 20s,
// ammo 6, chargeFrames 60, reloadFrames 141, hitsPerShot 1). kit-autonomy gauntlet S2a (driver
// tests). EXACT SLUG: this is the SR/Iron variant (aka "aab"/"bade"), NOT `ade` (AR/Wind).
//
// One assertion group per KIT LINE (A1..A4, B1..B3 below), asserted against the SHIPPED override
// loaded from disk. `withPatchedOverride` builds COUNTERFACTUALS (the nearest wrong model each
// assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters['ade-agent-bunny'].skills, lvl10):
//   S1 ■ landing Full Charge in effective range → all allies: ATK ▲15.2% OF CASTER ATK, 5s   [A1]
//      ■ attacking with Full Charge → self: Spy Lens Min Effective Range ▲4.44% ×10 stacks, 5s [A2]
//   S2 ■ landing Full Charge in effective range → all allies: Pierce Damage ▲18.36%, 5s        [A3]
//      ■ only if Spy Lens at max stacks → self: Gains Pierce (continuous) + ATK ▲16% continuous [A4]
//   BU ■ self: Minimum Effective Range ▲55.56% for 10s                                          [B1]
//      ■ all allies: Attack Damage ▲55.04% for 10s                                              [B2]
//                Pierce Damage ▲10.13% for 10s                                                  [B3]
//
// Disposition (S0, verified vs datamine description_value_list last index = lvl10):
//   A1 FAITHFUL+⚑1  casterAtkPct 15.2 dur5; `shotFired` PROXY for "landing Full Charge in
//                   effective range" (no full-charge trigger in types.ts). ⚑1: every SR trigger
//                   pull assumed a landed full-charge hit in range — exact in-engine because an SR
//                   always fires full charge and the engine force-sets noRange (range always true),
//                   but UNMEASURED vs a real fight (could miss / be out of band).
//   A2 UNMODELED    Spy Lens is an inert Min-Effective-Range stat (engine noRange universal — no
//                   shot-count channel for a range buff). Its STACK COUNT is load-bearing though:
//                   it gates A4 via the hitCount:10 step (10 full-charge hits = max stacks).
//   A3 FAITHFUL+⚑1  pierceDamagePct 18.36 dur5; same shotFired proxy as A1.
//   A4 FAITHFUL+⚑2  gainPierce (continuous, no durationSec → pierceUntilFrame→∞) + atkPct 16
//                   (continuous), BOTH on a hitCount:10 trigger = "Spy Lens at max stacks".
//                   ⚑2: count:10 rests on 1 Spy-Lens stack per full-charge SR hit (10th hit ≈
//                   15.9s incl. one reload) — the SR cadence tuple is datamine-default, UNMEASURED.
//   B1 UNMODELED    self Min Effective Range ▲55.56% 10s — inert range stat (hard-rule check: a
//                   range buff shifts the effective-range band, NOT shots fired; no channel).
//   B2 FAITHFUL     attackDamagePct 55.04 dur10 on burstCast.
//   B3 FAITHFUL     pierceDamagePct 10.13 dur10 on burstCast (same burst block as B2).
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   A1  casterAtkPct resolves off the CASTER's ATK to a FLAT value applied identically to every
//       ally — proven by the buff value being one large flat number, uniform across all 4 targets.
//       The nearest wrong model (generic atkPct = % of each target's OWN ATK) stores the raw 15.2
//       and moves the non-caster allies' damage. Trigger fidelity: shotFired fires per SHOT
//       (105×4 = 420 buffs), not per BURST (12×4 = 48) — the burstCast counterfactual collapses
//       the cadence.
//   A3  pierceDamagePct 18.36 is a raw pct (event value === 18.36), per-shot cadence like A1.
//   A4  STEP-GATE, two halves. (i) atkPct:16 first lands on the 10th shot (~15.9s), NOT at t=0 —
//       the always-on counterfactual (trigger→shotFired) lands it on the 1st shot. (ii) gainPierce
//       is load-bearing: remove it and ade loses her own 18.36+10.13 Pierce-Damage self-feed
//       (−12.9% total); the always-on-pierce counterfactual (top-level hasPierce) over-credits the
//       first ~16s (+1.0%). The shipped override carries NO top-level hasPierce (it was removed in
//       favour of the step-gated gainPierce) — pinned structurally.
//   B2/B3  burstCast: the buff is present at the kit magnitude/dur/targets and ABSENT when the
//       burst block is removed; trigger pinned structurally to burstCast.
//
// Fixture: ade is Burst II, so she is the SOLE B2 in a custom comp — liter (B1) / ade-agent-bunny
// (B2) / ada (B3) / helm (B3), boss Wind (ade is Iron → elemental major live, her pierce self-feed
// matters), focus ada. Sole B2 ⇒ she casts every Full Burst cycle (12 casts / 105 shots / shot 10
// at frame 955 ≈ 15.9s). Deterministic (no seed); event-log assertions over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
/** Custom comp slot order: liter 0 / ade-agent-bunny 1 / ada 2 / helm 3. */
const ADE = 1;
const SLUG = 'ade-agent-bunny';

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

const comp = {
  slugs: ['liter', 'ade-agent-bunny', 'ada', 'helm'],
  bossElement: 'Wind' as const,
  focusSlug: 'ada',
};

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...comp,
    overrides,
    cfg: { onEvent: (e: SimEvent) => events.push(e) },
  } as any);
  return { events, t: totals(res) };
}

// ---- counterfactual patches ------------------------------------------------------------------
/** A4: remove ONLY gainPierce (keep atkPct:16) — kills ade's pierce self-feed. */
const noGainPierce = withPatchedOverride(SLUG, (ov: any) => {
  let removed = 0;
  for (const b of ov.skill2) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.kind !== 'gainPierce');
    removed += before - b.effects.length;
  }
  if (!removed) {
    throw new Error('ade S2 gainPierce effect missing — fixture is stale');
  }
});
/** A4: always-on pierce from t=0 — the pre-2026-07-20 encoding the step-gate replaced. */
const alwaysPierce = withPatchedOverride(SLUG, (ov: any) => {
  ov.hasPierce = true;
});
/** A4: atkPct:16 always-on from the 1st shot (trigger hitCount:10 → shotFired). */
const atkAlwaysOn = withPatchedOverride(SLUG, (ov: any) => {
  const blk = ov.skill2.find((b: any) => b.trigger?.kind === 'hitCount');
  if (!blk) {
    throw new Error('ade S2 hitCount block missing — fixture is stale');
  }
  blk.trigger = { kind: 'shotFired' };
});
/** A1: generic atkPct (% of each target's OWN ATK) in place of casterAtkPct. */
const genericAtk = withPatchedOverride(SLUG, (ov: any) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'casterAtkPct');
  if (!e) {
    throw new Error('ade S1 casterAtkPct effect missing — fixture is stale');
  }
  e.stat = 'atkPct';
});
/** A1/A3: fullCharge → burstCast on the S1 caster block (cadence collapse). */
const s1BurstTrig = withPatchedOverride(SLUG, (ov: any) => {
  const blk = ov.skill1.find((b: any) => b.trigger?.kind === 'fullCharge');
  if (!blk) {
    throw new Error(
      'ade-agent-bunny S1 fullCharge block missing — fixture is stale'
    );
  }
  blk.trigger = { kind: 'burstCast' };
});
/** A3: remove the S2 pierceDamagePct 18.36 block. */
const noS2Pierce = withPatchedOverride(SLUG, (ov: any) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) =>
      !(
        b.trigger?.kind === 'fullCharge' &&
        b.effects.some((e: any) => e.stat === 'pierceDamagePct')
      )
  );
  if (ov.skill2.length === before) {
    throw new Error('ade S2 pierceDamagePct block missing — fixture is stale');
  }
});
/** B2/B3: remove the whole burst block. */
const noBurst = withPatchedOverride(SLUG, (ov: any) => {
  if (!ov.burst.length) {
    throw new Error('ade burst block missing — fixture is stale');
  }
  ov.burst = [];
});
/** B3 inertness: remove ONLY the burst pierceDamagePct 10.13 effect (keep attackDamagePct 55.04). */
const noBurstPierce = withPatchedOverride(SLUG, (ov: any) => {
  let removed = 0;
  for (const b of ov.burst) {
    const before = b.effects.length;
    b.effects = b.effects.filter(
      (e: any) =>
        !(e.stat === 'pierceDamagePct' && Math.abs(e.value - 10.13) < 0.01)
    );
    removed += before - b.effects.length;
  }
  if (!removed) {
    throw new Error(
      'ade burst pierceDamagePct 10.13 effect missing — fixture is stale'
    );
  }
});

// ---- runs (hoisted: each is a full 180s sim) -------------------------------------------------
const base = run();
const cfNoGainPierce = run({ [SLUG]: noGainPierce });
const cfAlwaysPierce = run({ [SLUG]: alwaysPierce });
const cfAtkAlwaysOn = run({ [SLUG]: atkAlwaysOn });
const cfGenericAtk = run({ [SLUG]: genericAtk });
const cfS1BurstTrig = run({ [SLUG]: s1BurstTrig });
const cfNoS2Pierce = run({ [SLUG]: noS2Pierce });
const cfNoBurst = run({ [SLUG]: noBurst });
const cfNoBurstPierce = run({ [SLUG]: noBurstPierce });

/** The three non-pierce teammates — ade is the only pierce-tagged hitter in the fixture. */
const NON_PIERCE = ['liter', 'ada', 'helm'];

// ---- readers ---------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const adeBuffs = (evs: SimEvent[], stat: string, value?: number) =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === ADE &&
      b.stat === stat &&
      (value === undefined || Math.abs(b.value - value) < 0.01)
  );
const adeShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === SLUG);
const adeBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === SLUG);

const N_ALLIES = 4;
const shots = adeShots(base.events);
const bursts = adeBursts(base.events);
/** Frame of ade's 10th shot — the Spy-Lens-max step (hitCount:10). */
const shot10Frame = shots[9]?.frame;

describe('ade-agent-bunny — kit spec', () => {
  it('fixture sanity: ade is the sole B2 and casts every FB cycle; reaches 10 shots', () => {
    expect(bursts.length).toBeGreaterThanOrEqual(8);
    expect(shots.length).toBeGreaterThanOrEqual(10);
    expect(shot10Frame, 'ade never reaches her 10th shot').toBeDefined();
  });

  describe('A1 — S1 team ATK is casterAtkPct 15.2 (CASTER-resolved flat), per full-charge shot', () => {
    const applied = adeBuffs(base.events, 'casterAtkPct');

    it('is a single flat value applied identically to all four allies (caster-resolution)', () => {
      expect(applied.length).toBeGreaterThan(0);
      const vals = [...new Set(applied.map((b) => b.value.toFixed(6)))];
      expect(
        vals.length,
        'casterAtkPct must resolve to ONE flat value off the caster ATK'
      ).toBe(1);
      // A flat ATK number (≈15.2% of ade's ~99.7k ATK), NOT the raw 15.2 percentage.
      expect(Number(vals[0])).toBeGreaterThan(1000);
    });

    it('reaches all four allies for exactly 5 sec, once per shot', () => {
      const targets = new Set(applied.map((b) => b.targetIdx));
      expect(targets.size).toBe(N_ALLIES);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
      }
      // shotFired fires once per shot, fanned to 4 allies.
      expect(applied.length).toBe(shots.length * N_ALLIES);
    });

    it('DISCRIMINATING: generic atkPct stores the raw 15.2 and moves a non-caster ally', () => {
      const cfAtk = adeBuffs(cfGenericAtk.events, 'atkPct', 15.2);
      expect(
        cfAtk.length,
        'the swapped line must emit atkPct 15.2'
      ).toBeGreaterThan(0);
      // The generic model stores the raw pct (15.2), not the caster-resolved flat number.
      expect([...new Set(cfAtk.map((b) => b.value))]).toEqual([15.2]);
      // …and a non-caster ally's damage shifts (its own ATK ≠ ade's).
      expect(cfGenericAtk.t.ada).not.toBe(base.t.ada);
    });

    it('DISCRIMINATING: trigger is shotFired (per-shot), not burstCast (per-burst)', () => {
      const cfCount = adeBuffs(cfS1BurstTrig.events, 'casterAtkPct').length;
      expect(cfCount).toBe(bursts.length * N_ALLIES);
      expect(cfCount).not.toBe(applied.length);
    });
  });

  describe('A2 — S1 Spy Lens (self Min Effective Range ▲4.44% ×10) is UNMODELED but stack-gates A4', () => {
    it('is documented verbatim in unmodeled.skill1 (inert range stat)', () => {
      const ov = withPatchedOverride(SLUG, () => {}) as any;
      const joined = (ov.unmodeled?.skill1 ?? []).join(' ');
      expect(joined).toContain('Spy Lens');
      expect(joined).toContain('4.44');
      expect(joined).toContain('10');
    });
  });

  describe('A3 — S2 team Pierce Damage 18.36, per full-charge shot', () => {
    const applied = adeBuffs(base.events, 'pierceDamagePct', 18.36);

    it('is the raw kit magnitude for 5 sec to all four allies, once per shot', () => {
      expect(applied.length).toBe(shots.length * N_ALLIES);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([18.36]);
      expect(new Set(applied.map((b) => b.targetIdx)).size).toBe(N_ALLIES);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
      }
    });

    it('DISCRIMINATING: removing the block deletes the buff', () => {
      expect(
        adeBuffs(cfNoS2Pierce.events, 'pierceDamagePct', 18.36).length
      ).toBe(0);
    });

    it('INERTNESS: provably inert on the three non-pierce teammates, moves only ade (cross-family S2b)', () => {
      // pierceDamagePct feeds the Damage-Up bucket of PIERCE-TAGGED hitters only; liter/ada/helm
      // are never pierce-tagged, so zeroing the line must leave them byte-identical…
      for (const u of NON_PIERCE) {
        expect(cfNoS2Pierce.t[u]).toBe(base.t[u]);
      }
      // …while ade (pierce-tagged after the Spy-Lens step) loses her own 18.36 self-feed.
      expect(cfNoS2Pierce.t[SLUG]).not.toBe(base.t[SLUG]);
    });
  });

  describe('A4 — S2 "Spy Lens at max stacks": step-gated Gains Pierce + ATK 16 (continuous)', () => {
    it('structural: hitCount:10 → self, atkPct 16 (no duration) + gainPierce (no duration)', () => {
      const ov = withPatchedOverride(SLUG, () => {}) as any;
      const blk = ov.skill2.find((b: any) => b.trigger?.kind === 'hitCount');
      expect(blk, 'S2 hitCount block missing').toBeDefined();
      expect(blk.trigger.count).toBe(10);
      expect(blk.target.kind).toBe('self');
      const atk = blk.effects.find((e: any) => e.stat === 'atkPct');
      expect(atk.value).toBe(16);
      expect(
        atk.durationSec,
        'atkPct 16 must be continuous (no duration)'
      ).toBeUndefined();
      const gp = blk.effects.find((e: any) => e.kind === 'gainPierce');
      expect(gp, 'gainPierce effect missing').toBeDefined();
      expect(
        gp.durationSec,
        'gainPierce must be continuous (no duration)'
      ).toBeUndefined();
    });

    it('structural: NO top-level hasPierce (pierce is step-gated, not always-on)', () => {
      const ov = withPatchedOverride(SLUG, () => {}) as any;
      expect(
        ov.hasPierce,
        'shipped override must not carry an always-on hasPierce flag'
      ).toBeFalsy();
    });

    it('atkPct:16 first lands on the 10th shot (the Spy-Lens-max step), self-only, continuous', () => {
      const a16 = buffs(base.events).filter(
        (b) =>
          b.stat === 'atkPct' &&
          Math.abs(b.value - 16) < 0.01 &&
          b.targetIdx === ADE
      );
      expect(a16.length).toBeGreaterThan(0);
      expect(
        a16[0].frame,
        'atkPct:16 must not turn on before the 10th shot'
      ).toBeGreaterThanOrEqual(shot10Frame!);
      expect([...new Set(a16.map((b) => b.targetIdx))]).toEqual([ADE]);
      expect(
        [...new Set(a16.map((b) => b.expiresFrame))],
        'continuous ⇒ no wall-clock expiry'
      ).toEqual([null]);
    });

    it('DISCRIMINATING: always-on atkPct (trigger→shotFired) lands it on the 1st shot, far earlier', () => {
      const a16cf = buffs(cfAtkAlwaysOn.events).filter(
        (b) =>
          b.stat === 'atkPct' &&
          Math.abs(b.value - 16) < 0.01 &&
          b.targetIdx === ADE
      );
      expect(a16cf.length).toBeGreaterThan(0);
      expect(
        a16cf[0].frame,
        'always-on must precede the 10th-shot step'
      ).toBeLessThan(shot10Frame!);
    });

    it('DISCRIMINATING: gainPierce is load-bearing — removing it drops ade total (pierce self-feed)', () => {
      expect(cfNoGainPierce.t[SLUG]).toBeLessThan(base.t[SLUG]);
    });

    it('DISCRIMINATING: always-on pierce (top-level hasPierce) over-credits the early fight', () => {
      expect(cfAlwaysPierce.t[SLUG]).not.toBe(base.t[SLUG]);
    });
  });

  describe('B1 — burst self Min Effective Range ▲55.56% is UNMODELED (inert range stat)', () => {
    it('is documented verbatim in unmodeled.burst', () => {
      const ov = withPatchedOverride(SLUG, () => {}) as any;
      const joined = (ov.unmodeled?.burst ?? []).join(' ');
      expect(joined).toContain('55.56');
      expect(joined).toContain('Minimum Effective Range');
    });
  });

  describe('B2 — burst team Attack Damage 55.04 for 10 sec (burstCast)', () => {
    const applied = adeBuffs(base.events, 'attackDamagePct', 55.04);

    it('is the kit magnitude to all four allies for 10 sec, once per burst cast', () => {
      expect(applied.length).toBe(bursts.length * N_ALLIES);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([55.04]);
      expect(new Set(applied.map((b) => b.targetIdx)).size).toBe(N_ALLIES);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('structural: trigger is burstCast', () => {
      const ov = withPatchedOverride(SLUG, () => {}) as any;
      const blk = ov.burst.find((b: any) =>
        b.effects.some((e: any) => e.stat === 'attackDamagePct')
      );
      expect(blk.trigger.kind).toBe('burstCast');
    });

    it('DISCRIMINATING: removing the burst block deletes the buff', () => {
      expect(adeBuffs(cfNoBurst.events, 'attackDamagePct', 55.04).length).toBe(
        0
      );
    });
  });

  describe('B3 — burst team Pierce Damage 10.13 for 10 sec (burstCast)', () => {
    const applied = adeBuffs(base.events, 'pierceDamagePct', 10.13);

    it('is the kit magnitude to all four allies for 10 sec, once per burst cast', () => {
      expect(applied.length).toBe(bursts.length * N_ALLIES);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([10.13]);
      expect(new Set(applied.map((b) => b.targetIdx)).size).toBe(N_ALLIES);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('DISCRIMINATING: removing the burst block deletes the buff', () => {
      expect(adeBuffs(cfNoBurst.events, 'pierceDamagePct', 10.13).length).toBe(
        0
      );
    });

    it('INERTNESS: zeroing only 10.13 leaves non-pierce teammates byte-identical, moves only ade (cross-family S2b)', () => {
      for (const u of NON_PIERCE) {
        expect(cfNoBurstPierce.t[u]).toBe(base.t[u]);
      }
      expect(cfNoBurstPierce.t[SLUG]).not.toBe(base.t[SLUG]);
    });
  });
});
