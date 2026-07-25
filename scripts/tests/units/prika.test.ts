// PER-UNIT KIT SPEC — `prika` (Prika, Supporter/SR/Water, Burst II, cd 40s, ammo 6, chargeFrames 60).
// Kit-autonomy gauntlet 2026-07-25 (driver spec; TDD test-first).
//
// One assertion group per KIT LINE (P1..P6 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` builds COUNTERFACTUALS only (the nearest wrong model each
// assertion must discriminate against) — never the encoding under test.
//
// Prika is a BUFFER: her damage contribution is almost entirely the buffs she puts on the team, so
// every load-bearing line is pinned on the buffApply EVENT LOG (value / duration / target-set /
// cadence), not on a damage total. Deterministic (no seed); event-log over totals.
//
// Kit (blablalink prose, data/characters.json → characters.prika.skills; level-10 magnitudes):
//   S1 ■ on Full Charge attack → all allies:                                                (SR auto-full-charges every shot)
//        Projectile Explosion Damage ▲20% for 3 sec                                          [P1]
//        Pierce Damage ▲13.09% for 3 sec                                                     [P2]
//        ATK ▲20% OF THE SKILL USER'S ATK for 3 sec                                          [P3]
//      ■ only while in Performance → self: Outgoing healing ▲49.92% continuously             [inert — no HP pool]
//      ■ only while in Performance → self: Gains Pierce continuously                         [UNMODELED ⚑ — see header]
//   S2 ■ entering Full Burst → self: Max HP ▲19.98% for 10 sec                               [inert — defensive]
//      ■ Encore (when Sing Along takes effect while in Performance):
//        Effect 1: Assigned Part — Singing                                                   [inert — part assignment]
//        Effect 2: Performance duration ▲21 sec                                              [UNMODELED ⚑ — untracked status]
//        Effect 3: all allies: Attack Damage ▲25.01% for 10 sec                              [P4]
//        Effect 4: self: Cooldown of Burst Skill ▲21 sec  (▲ = INCREASE)                     [P6]
//   BU ■ all allies (Performance):
//        Effect 1: restore 3.04% of caster final max HP / 1 sec for 25 sec                   [P7 — recovery CADENCE modeled (25 ticks); HP magnitude inert]
//        Effect 2: Charge Damage ▲25% for 25 sec                                             [P5]
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   P1  pinned at the level-10 magnitude 20, not the level-1 base 11.82 (a stale-parser regression).
//       Damage-INERT at scope lock (SR has no explosion flavor; the only RL in the fixture, ada, is
//       the sole recipient that could spend it) — so it is pinned on the buff EVENT, not a total.
//   P2  pinned at level-10 13.09, not base 7.73. Damage-INERT at scope: no unit in the fixture is
//       Pierce-tagged (verified byte-identical totals with the effect removed), because Prika's own
//       "Gains Pierce" line is UNMODELED (the F1 cold hypothesis, measurement-gated — see below).
//   P3  "20% of the SKILL USER'S ATK" = casterAtkPct: a FLAT add off Prika's ATK, identical to every
//       recipient. The nearest wrong model is atkPct (20% of each target's OWN ATK), which emits the
//       percentage, not a flat caster-scoped number — the assertion provably fails under it.
//   P4  Encore's team Attack Damage, pinned at level-10 25.01 (not base 14.29), 10s, reaching all
//       three allies, firing once per Full Burst entry (solo-mode trigger = fullBurstEnter).
//   P5  the burst's Charge Damage, pinned at level-10 25 (not base 13.88), 25s, all allies, on cast.
//   P6  Encore Effect 4 "Cooldown of Burst Skill ▲21 sec": the ▲ is an INCREASE. burstCdr seconds:-21
//       ADDS 21s to her 40s cooldown (engine: burstCdFrames -= round(seconds*FPS)), so she re-bursts
//       every ~60s (3 casts / 180s). The nearest wrong reading (▲ = decrease, seconds:+21) drops her
//       to a ~19s cooldown → 9 casts. The cast COUNT discriminates the sign.
//   P7  the burst's HoT is a recovery STREAM, not a single instant heal: heal{ticks:25,intervalSec:1}
//       fires 25 recovery events over 25s per cast, keeping an on-recovery consumer (crown's "when
//       recovery takes effect → team Attack Damage ▲20.99") refreshed across the whole window. The
//       nearest wrong model is ticks:1 (one event per cast → the consumer fires once then lapses). This
//       is judge gotcha 3: both cross-family blinds derived ticks:25 byte-for-byte; nothing about it is
//       measurable (both cadence numbers are printed). Only the HP MAGNITUDE (3.04%) is inert (the heal
//       effect carries no HP amount). Needs a recovery consumer in the comp, so it runs on a SEPARATE
//       fixture (liter/prika/crown/ada) with prika LEFT of crown — leftmost burst-priority makes prika
//       win the B2 cast (crown left of prika would steal it and prika would never cast).
//
// UNMODELED lines (no assertion — documented, not silently dropped):
//   • S1 Outgoing healing ▲49.92% (self, in Performance) — heal-potency stat; no HP pool at scope.
//   • S1 Gains Pierce (self, in Performance) — ⚑ standing OWNER HOLD (the F1 cold hypothesis). Prika
//       carries a pierceDamagePct SOURCE (her own S1, P2) but no Pierce tag, so her own 13.09% cannot
//       land on her SR shots until this line is modeled. NOT modeled here: the in-game Pierce popup was
//       never captured (probe-runs 2026-07-14 inconclusive). CORRECTED per judge gotcha 4: the gate
//       "while in Performance" is Prika's OWN burst's 25s status window (her burst is literally named
//       Performance) — directly expressible as gainPierce durationSec 25 on burstCast (NOT top-level
//       hasPierce:true, which would tag her from frame 0); it is NOT an untracked partner status (that
//       describes Encore's Sing Along). game-mechanics §11 rules Pierce Damage ▲ applies on the partless
//       boss, so the popup VERIFIES the encoding rather than enables it. Estimate: lighting it puts her
//       own 13.09% pierceDamagePct live on her SR fire ≈ +8% personal damage (small — she is a buffer).
//       Recipe: a Prika-focus popup pass confirming she reads Pierce-tagged during Performance + the
//       SR-damage uplift in/out of the window. Tier 2.
//   • S2 Max HP ▲19.98% (self) — defensive HP buff, inert for damage.
//   • S2 Encore Effect 1 (Assigned Part: Singing) — inert part assignment.
//   • S2 Encore Effect 2 (Performance duration ▲21s) — ⚑ Performance is an untracked status; in solo
//       mode the burst's Charge Damage runs 25s, not an extended ~46s when Encore fires.
//   • Burst Effect 1 HP MAGNITUDE (3.04% of caster final max HP) — the heal effect carries no HP amount;
//       only the recovery CADENCE is modeled (P7). Inert at scope (no HP pool).
//   • Encore TRIGGER is a proxy: the real trigger is "Sing Along takes effect while in Performance"
//       (a partner mechanic, e.g. Mint). Solo mode fires it on every Full Burst entry even with no
//       Sing Along caster (over-credits P4 + over-applies P6). Duet mode (w/ Mint) needs explicit mode
//       selection; this harness runs the SOLO default, so the duet-gated blocks are inert here. JUDGE
//       GOTCHA 2 (owner spot-check): both cross-family blinds ruled the Encore should stay wholly
//       UNMODELED; the converged faithful fix is mode-gating BOTH effects to duet-only — owner's call.
//
// Fixtures (deterministic; Prika casts 3× under the shipped CD-increase):
//   • MAIN: liter (B1) / prika (B2) / ada (B3), boss Fire, focus ada — a clean one-per-stage chain so
//     Prika actually casts (a lone B2 makes zero Full Bursts). Prika = slot 1; "all allies" = {0,1,2}.
//     Prika casts ≈ t=9.25/71.0/130.3s.
//   • HEAL (P7 only): liter (B1) / prika (B2) / crown (B2) / ada (B3), boss Fire, focus ada — prika is
//     slot 1, LEFT of crown (slot 2), so leftmost burst-priority lets prika win the B2 cast and crown
//     stays in as the on-recovery consumer. "all allies" = {0,1,2,3}.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const PRIKA = 1;
const ALL_ALLIES = [0, 1, 2];

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: ['liter', 'prika', 'ada'],
    bossElement: 'Fire',
    focusSlug: 'ada',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches ------------------------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** S1 reduced to level-1 BASE magnitudes + the ATK line de-scoped to a generic atkPct. */
const s1BaseLevel = withPatchedOverride('prika', (ov) => {
  const eff = ov.skill1.flatMap((b: any) => b.effects);
  const proj = eff.find((e: any) => e.stat === 'projectileExplosionPct');
  const pierce = eff.find((e: any) => e.stat === 'pierceDamagePct');
  const atk = eff.find((e: any) => e.stat === 'casterAtkPct');
  if (!proj || !pierce || !atk)
    throw new Error('prika S1 effects missing — fixture is stale');
  proj.value = 11.82; // level-1 base (kit level-10 = 20)
  pierce.value = 7.73; // level-1 base (kit level-10 = 13.09)
  atk.stat = 'atkPct'; // nearest wrong: 20% of each target's OWN ATK, not the caster's
});
/** S1 removed entirely — the "is S1 live at all" reference. */
const s1Removed = withPatchedOverride('prika', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) =>
      !(
        hasStat(b, 'projectileExplosionPct') ||
        hasStat(b, 'pierceDamagePct') ||
        hasStat(b, 'casterAtkPct')
      ),
  );
  if (ov.skill1.length === before)
    throw new Error('prika S1 block missing — fixture is stale');
});
/** Encore + burst buffs reduced to level-1 BASE magnitudes. */
const s2BurstBaseLevel = withPatchedOverride('prika', (ov) => {
  const enc = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((e: any) => e.stat === 'attackDamagePct');
  const chg = ov.burst
    .flatMap((b: any) => b.effects)
    .find((e: any) => e.stat === 'chargeDamagePct');
  if (!enc || !chg)
    throw new Error('prika Encore/burst buffs missing — fixture is stale');
  enc.value = 14.29; // level-1 base (kit level-10 = 25.01)
  chg.value = 13.88; // level-1 base (kit level-10 = 25)
});
/** Encore Effect 4 mis-read as a cooldown DECREASE (▲ = decrease, seconds:+21). */
const cdrDecrease = withPatchedOverride('prika', (ov) => {
  let hit = 0;
  for (const b of ov.skill2)
    for (const e of b.effects)
      if (e.kind === 'burstCdr' && e.seconds === -21) {
        e.seconds = 21;
        hit++;
      }
  if (!hit)
    throw new Error('prika solo burstCdr -21 missing — fixture is stale');
});

// ---- P7 heal fixture (liter/prika/crown/ada — prika LEFT of crown so she wins the B2 cast) ----
const HEAL_COMP = ['liter', 'prika', 'crown', 'ada'];
const CROWN = 2;
function runHeal(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: HEAL_COMP,
    bossElement: 'Fire',
    focusSlug: 'ada',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}
/** Nearest-wrong: the heal collapsed to a single instant tick (ticks:1) — fires one recovery event
 *  per cast instead of 25, so an on-recovery consumer lapses after the first. */
const healOnce = withPatchedOverride('prika', (ov) => {
  let hit = 0;
  for (const b of ov.burst)
    for (const e of b.effects)
      if (e.kind === 'heal') {
        e.ticks = 1;
        hit++;
      }
  if (!hit) throw new Error('prika burst heal missing — fixture is stale');
});
/** Reference: the heal removed entirely (no recovery events from Prika). */
const healRemoved = withPatchedOverride('prika', (ov) => {
  let hit = 0;
  for (const b of ov.burst) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.kind !== 'heal');
    if (b.effects.length !== before) hit++;
  }
  if (!hit) throw new Error('prika burst heal missing — fixture is stale');
});

// ---- runs (hoisted: each is a full 180s sim) -------------------------------------------------
const base = run();
const baseLvl = run({ prika: s1BaseLevel });
const noS1 = run({ prika: s1Removed });
const s2Lvl = run({ prika: s2BurstBaseLevel });
const cdrDown = run({ prika: cdrDecrease });
const healBase = runHeal();
const healOnceRun = runHeal({ prika: healOnce });
const healNoneRun = runHeal({ prika: healRemoved });

// ---- readers ---------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const prikaBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === PRIKA && b.stat === stat);
const targets = (bs: BuffApply[]) =>
  [
    ...new Set(
      bs.map((b) => b.targetIdx).filter((t): t is number => t !== null),
    ),
  ].sort((a, b) => a - b);
const values = (bs: BuffApply[]) => [...new Set(bs.map((b) => b.value))];
const durFrames = (bs: BuffApply[]) => [
  ...new Set(bs.map((b) => b.expiresFrame! - b.frame)),
];
const prikaBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'prika',
  );

describe('prika — kit spec', () => {
  describe('P1 — S1 Projectile Explosion Damage ▲20% / 3s to all allies on full charge', () => {
    const applied = prikaBuffs(base.events, 'projectileExplosionPct');
    it('is the level-10 magnitude 20 (not base 11.82), 3s, reaching all three allies', () => {
      expect(values(applied)).toEqual([20]);
      expect(durFrames(applied)).toEqual([3 * FPS]);
      expect(targets(applied)).toEqual(ALL_ALLIES);
      expect(
        applied.length,
        'no Projectile Explosion buff was applied',
      ).toBeGreaterThan(0);
    });
    it('DISCRIMINATING: base-level parser would emit 11.82', () => {
      expect(
        values(prikaBuffs(baseLvl.events, 'projectileExplosionPct')),
      ).not.toEqual([20]);
    });
    it('is live (removing S1 deletes the buff entirely)', () => {
      expect(prikaBuffs(noS1.events, 'projectileExplosionPct').length).toBe(0);
    });
  });

  describe('P2 — S1 Pierce Damage ▲13.09% / 3s to all allies (inert at scope — no Pierce recipient)', () => {
    const applied = prikaBuffs(base.events, 'pierceDamagePct');
    it('is the level-10 magnitude 13.09 (not base 7.73), 3s, all three allies', () => {
      expect(values(applied)).toEqual([13.09]);
      expect(durFrames(applied)).toEqual([3 * FPS]);
      expect(targets(applied)).toEqual(ALL_ALLIES);
    });
    it('DISCRIMINATING: base-level parser would emit 7.73', () => {
      expect(values(prikaBuffs(baseLvl.events, 'pierceDamagePct'))).not.toEqual(
        [13.09],
      );
    });
    it('is damage-INERT at scope lock (no Pierce-tagged recipient until "Gains Pierce" is modeled)', () => {
      // Removing ONLY this effect leaves every unit's total byte-identical — the buff applies but no
      // recipient is Pierce-tagged, so it spends nothing. This is exactly the F1 ⚑: modeling Prika's
      // "Gains Pierce" would light it up on her own SR fire.
      const noPierce = withPatchedOverride('prika', (ov) => {
        for (const b of ov.skill1)
          b.effects = b.effects.filter(
            (e: any) => e.stat !== 'pierceDamagePct',
          );
      });
      expect(run({ prika: noPierce }).totals).toEqual(base.totals);
    });
  });

  describe("P3 — S1 ATK ▲20% of the SKILL USER'S ATK (casterAtkPct) / 3s to all allies", () => {
    const applied = prikaBuffs(base.events, 'casterAtkPct');
    it('is a flat caster-scoped add, identical to every recipient (not a per-target %)', () => {
      expect(
        applied.length,
        'no casterAtkPct buff was applied',
      ).toBeGreaterThan(0);
      const vals = values(applied);
      expect(
        vals.length,
        'caster-scoped buff must be ONE flat value shared by all allies',
      ).toBe(1);
      expect(
        vals[0],
        'a flat ATK add (~20% of Prika ATK), not the percentage 20',
      ).toBeGreaterThan(1000);
      expect(targets(applied)).toEqual(ALL_ALLIES);
      expect(durFrames(applied)).toEqual([3 * FPS]);
    });
    it('DISCRIMINATING: a generic atkPct emits the percentage (20), not a flat caster-scoped add', () => {
      // Under the counterfactual the casterAtkPct stat is gone (re-typed to atkPct = 20 per target).
      expect(prikaBuffs(baseLvl.events, 'casterAtkPct').length).toBe(0);
      const asAtkPct = prikaBuffs(baseLvl.events, 'atkPct');
      expect(values(asAtkPct)).toEqual([20]);
    });
  });

  describe('P4 — S2 Encore: all allies Attack Damage ▲25.01% / 10s, once per Full Burst entry (solo)', () => {
    const applied = prikaBuffs(base.events, 'attackDamagePct');
    it('is the level-10 magnitude 25.01 (not base 14.29), 10s, reaching all three allies', () => {
      expect(values(applied)).toEqual([25.01]);
      expect(durFrames(applied)).toEqual([10 * FPS]);
      expect(targets(applied)).toEqual(ALL_ALLIES);
    });
    it('fires once per Full Burst entry (one application per ally per Prika burst)', () => {
      const nBursts = prikaBursts(base.events).length;
      expect(nBursts).toBeGreaterThan(0);
      expect(
        applied.length,
        `${applied.length} applications vs ${nBursts} bursts × 3 allies`,
      ).toBe(nBursts * ALL_ALLIES.length);
    });
    it('DISCRIMINATING: base-level parser would emit 14.29', () => {
      expect(values(prikaBuffs(s2Lvl.events, 'attackDamagePct'))).not.toEqual([
        25.01,
      ]);
    });
  });

  describe('P5 — Burst: all allies Charge Damage ▲25% / 25s on cast (solo)', () => {
    const applied = prikaBuffs(base.events, 'chargeDamagePct');
    it('is the level-10 magnitude 25 (not base 13.88), 25s, reaching all three allies', () => {
      expect(values(applied)).toEqual([25]);
      expect(durFrames(applied)).toEqual([25 * FPS]);
      expect(targets(applied)).toEqual(ALL_ALLIES);
    });
    it('fires once per burst cast (one application per ally per cast)', () => {
      const nBursts = prikaBursts(base.events).length;
      expect(applied.length).toBe(nBursts * ALL_ALLIES.length);
    });
    it('DISCRIMINATING: base-level parser would emit 13.88', () => {
      expect(values(prikaBuffs(s2Lvl.events, 'chargeDamagePct'))).not.toEqual([
        25,
      ]);
    });
  });

  describe('P6 — S2 Encore Effect 4: "Cooldown of Burst Skill ▲21 sec" is an INCREASE (burstCdr -21)', () => {
    it('lengthens her cooldown to ~60s → exactly 3 casts in 180s (not a 19s cooldown)', () => {
      const casts = prikaBursts(base.events);
      expect(
        casts.length,
        'CD-increase cadence: ~60s between casts → 3 casts / 180s',
      ).toBe(3);
      // Gaps between consecutive casts are ~60s (40 base + 21 increase), within rotation slack.
      const gaps: number[] = [];
      for (let i = 1; i < casts.length; i++)
        gaps.push((casts[i].frame - casts[i - 1].frame) / FPS);
      for (const g of gaps)
        expect(
          g,
          `cast gap ${g.toFixed(1)}s should be ~60s (40+21)`,
        ).toBeGreaterThan(50);
    });
    it('DISCRIMINATING: mis-reading ▲ as a DECREASE (+21) yields strictly more casts', () => {
      const shipped = prikaBursts(base.events).length;
      const decreased = prikaBursts(cdrDown.events).length;
      expect(
        decreased,
        'a cooldown DECREASE must produce more casts than the shipped increase',
      ).toBeGreaterThan(shipped);
    });
  });

  describe('P7 — Burst HoT is a 25-tick recovery STREAM (heal ticks:25 / 1s), driving on-recovery consumers', () => {
    // Crown's "when recovery takes effect → team Attack Damage ▲20.99" is the observable: one firing
    // per recovery event that reaches her. Distinct frames per Prika cast window = recovery cadence.
    const crownRecoveryFrames = (evs: SimEvent[]): number[] =>
      [
        ...new Set(
          buffs(evs)
            .filter(
              (b) =>
                b.casterIdx === CROWN &&
                b.stat === 'attackDamagePct' &&
                Math.abs(b.value - 20.99) < 0.01,
            )
            .map((b) => b.frame),
        ),
      ].sort((a, b) => a - b);

    /** Distinct crown-recovery frames falling in the 25s window after each Prika cast. */
    const perCastWindowFrames = (evs: SimEvent[]): number[] => {
      const frames = crownRecoveryFrames(evs);
      const casts = prikaBursts(evs);
      const out: number[] = [];
      for (const c of casts)
        out.push(
          frames.filter((f) => f >= c.frame && f <= c.frame + 25 * FPS).length,
        );
      return out;
    };

    it('non-vacuity: prika wins the B2 cast (left of crown) and Performance actually fires', () => {
      expect(
        prikaBursts(healBase.events).length,
        'prika (slot 1, left of crown) must win the B2 cast',
      ).toBeGreaterThan(0);
      expect(
        prikaBuffs(healBase.events, 'chargeDamagePct').length,
      ).toBeGreaterThan(0);
    });

    it("keeps crown's recovery consumer firing across the whole 25s after each cast (~25 ticks)", () => {
      const windows = perCastWindowFrames(healBase.events);
      expect(windows.length).toBeGreaterThan(0);
      for (const n of windows)
        expect(
          n,
          `${n} recovery frames in a 25s window — a 25-tick stream lands ~25, a single instant lands 1`,
        ).toBeGreaterThanOrEqual(20);
    });

    it('DISCRIMINATING: collapsing to ticks:1 starves the consumer (one firing per cast, then lapse)', () => {
      const shipped = perCastWindowFrames(healBase.events);
      const once = perCastWindowFrames(healOnceRun.events);
      const sum = (a: number[]) => a.reduce((s, x) => s + x, 0);
      expect(
        sum(once),
        'ticks:1 must produce far fewer recovery firings than the 25-tick stream',
      ).toBeLessThan(sum(shipped) / 2);
    });

    it('is live: removing the heal drops crown to its self-proc baseline (strictly fewer firings)', () => {
      expect(crownRecoveryFrames(healNoneRun.events).length).toBeLessThan(
        crownRecoveryFrames(healBase.events).length,
      );
    });
  });
});
