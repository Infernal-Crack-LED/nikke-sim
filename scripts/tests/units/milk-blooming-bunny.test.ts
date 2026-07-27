// PER-UNIT KIT SPEC — `milk-blooming-bunny` (Milk: Blooming Bunny, Attacker/SR/Iron, Burst III,
// cd 40s, ammo 6, chargeFrames 60). Kit-autonomy gauntlet 2026-07-25. EXACT SLUG: this is the
// Iron bunny variant ("mbb"/"bmilk"), NOT base `milk` (SR/Water) — the lint trips on the "Milk:"
// substring of her full name; the slug is disambiguated.
//
// One assertion group per KIT LINE (MBB1..MBB5), asserted against the SHIPPED override loaded from
// disk. `withPatchedOverride` builds COUNTERFACTUALS only (the nearest wrong model each assertion
// must discriminate against) — never the encoding under test.
//
// THE TIER-2 MECHANIC: Embarrassment is a MANUAL action — it procs only when a Full Charge is HELD
// an extra 0.5s (Prydwen), which the auto-play AI never does. The override is therefore MODE-SPLIT:
//   modes[0] = "auto (no Embarrassment)"  [DEFAULT] — a plain SR + her burst buffs + S2 burst DoT
//   modes[1] = "manual (Embarrassment cycle)"       — the held-charge cycle (1 shot/reload, 290%
//                                                     distributed proc, ATK 118.7%, -50% reload)
// The engine gates each block by `mode` (sim.ts:663 — active iff `!b.mode || b.mode === selected`),
// so the Embarrassment blocks (mode: manual) are FILTERED OUT in the default auto mode. MBB5 pins
// that gate behaviourally.
//
// Kit (blablalink prose, data/characters.json → characters['milk-blooming-bunny'].skills; L10 vals):
//   S1 ■ Full Charge attack → self: Gain Pierce for 6 sec.                                   [MBB1] (both modes)
//      ■ not-in-Embarrassment & Full Charge held ≥0.5s → self: Embarrassment —               [MBB5] (MANUAL only)
//          Eff1 all enemies 290% final ATK Distributed; Eff2 remove 100% ammo;
//          Eff3 reload speed -50% for 1 reload; Eff4 forced reload; Eff5 ATK ▲118.7% 40s.
//   S2 ■ in Embarrassment status → self: Pierce Damage ▲64.7% continuously.                  [UNMODELED]
//      ■ in Overconfident (burst) status → all enemies every 2s: 447.7% final ATK Distrib.   [MBB4]
//   BU ■ self: Overconfident, Huh?! — Immunity to Embarrassment 10s.                         [UNMODELED]
//                Pierce Damage ▲117.64% for 10 sec.                                          [MBB2]
//                ATK ▲220% for 10 sec.                                                       [MBB3]
//
// UNMODELED (inert in the DEFAULT auto mode — documented, no assertion):
//   • S2 "Pierce Damage ▲64.7% continuously" — gated on the Embarrassment STATUS, which auto never
//     enters, so it is inert on the default basis. It WOULD apply in manual mode (a residual there);
//     pierceDamagePct is otherwise live (MBB1/MBB2), so this is a status-gate skip, not a dead prim.
//     (Cross-family S2b reviewer concurs: status-gated, inert in auto.)
//   • Burst "Immunity to Embarrassment for 10s" — inert in auto (she is never in Embarrassment);
//     in manual it would suspend the cycle during the burst window. Documented in override.unmodeled.
//     (S2b: MEASUREMENT-GATED, loadBearing false — trivially satisfied in auto, where no 290% proc
//     or Embarrassment buff ever fires.)
//
// FLAGGED ⚑ (measurement-gated residuals — NOT override fixes; the DEFAULT-mode encoding is faithful):
//   ⚑1 MANUAL-MODE CADENCE / STATE DURATION. The Embarrassment STATE DURATION is nowhere in the prose
//      (the override approximates the cycle as a permanent operating mode in manual: proc-per-shot,
//      maxAmmo floored to 1, passive -50% reload). The "not-in-Embarrassment" gate + the 0.5s held-
//      charge trigger have no engine primitive, so the cycle cadence is an approximation, and Effect 3's
//      "-50% for 1 reload" is a reload-COUNT clamp the override approximates as a passive -50%. MBB5
//      pins the MODE GATE (auto excludes the package; manual includes it) — the load-bearing claim for
//      the validated auto basis — and describes the shipped manual cadence; it does NOT assert the
//      manual cadence is ground-truth cycle spacing. Recipe: a manual-play recording to measure the
//      real Embarrassment state duration + cycle spacing + whether the -50% scopes to one reload.
//   ⚑2 RIDER PIERCE-TAGGING. The engine applies pierceDamagePct to ALL of a pierce-tagged unit's
//      damage (sim.ts:1400), so the 447.7% distributed S2 rider IS pierce-boosted during the burst
//      window (measured: 10.96M → 6.70M per tick when gainPierce is removed). The S2b reviewer reads
//      the kit as "Pierce feeds weapon attacks only" (rider should be unboosted). This is an ENGINE
//      convention, not an override encoding choice — the override carries no primitive to exclude a
//      rider from pierce, and changing the scope is engine-core (S4 NO-GO territory). The unit is
//      validated/tuned COLD (kit-status 0.56–0.73) WITH this behavior, so it is not a hot over-credit
//      driving a wrong ratio. Recipe: measure whether the real 447.7 distributed rider inherits Pierce.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   MBB1  gainPierce emits NO event — it sets pierceUntilFrame (sim.ts:1400), which is the ONLY
//         thing that makes her burst pierceDamagePct live (she has no static hasPierce). Proven by
//         removal: strip gainPierce and the 117.64 buff is still APPLIED but contributes nothing
//         (the pre-2026-07-20 "dead pierce block" bug, kit-status F3) — shipped provably beats it.
//   MBB2  the datamined 117.64 (L10), 10s, self-scoped, once per burst cast — and LIVE (coupled to
//         MBB1's Pierce tag), not a dead buff.
//   MBB3  the datamined 220 (L10, not the L1 130), 10s, self, once per cast; load-bearing (removal
//         collapses her burst-window damage).
//   MBB4  5 ticks per burst window (interval 2s over 10s) at 447.7 — not 1 tick (instant) nor 10
//         (1s interval). Distributed flavor is NOT assertable: dot/damage events carry no flavor
//         field (override note flags this); vs a single partless boss distributed deals full value
//         and she has no distributedDamagePct, so no boost is lost.
//   MBB5  the mode gate itself: in AUTO the manual blocks are inert (stripping them is byte-identical
//         to shipped) and her cadence is a full 6-round magazine (no 290% proc, no ATK 118.7); in
//         MANUAL the cycle activates (proc-per-shot, collapsed cadence, ATK 118.7 present). A
//         permanent-cycle model (the pre-mode-split encoding) would over-count auto damage.
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / mbb B3 / helm B3, boss Fire,
// focus mbb — slot index 2). mbb needs a real B1→B2→B3 rotation to cast her burst at all.
// Deterministic (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const SLUG = 'milk-blooming-bunny';
/** controlComp slot order: liter 0 / crown 1 / mbb 2 / helm 3. */
const MBB = 2;
const FIGHT_FRAMES = 180 * FPS;
const MANUAL = 'manual (Embarrassment cycle)';

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(opts: { mode?: string; overrides?: Record<string, any> } = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp(SLUG),
    modes: opts.mode ? { [SLUG]: opts.mode } : undefined,
    overrides: opts.overrides ?? {},
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, total: totals(res)[SLUG] };
}

// ---- counterfactual / isolation patches -------------------------------------------------------
/** MBB1 counterfactual: her S1 Pierce-tag line removed — the pre-2026-07-20 "pierceDamagePct with
 *  no hasPierce" dead-block bug. The 117.64 buff still applies but contributes nothing. */
const noGainPierce = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'gainPierce')
  );
  if (ov.skill1.length === before)
    {throw new Error('mbb S1 gainPierce block missing — fixture is stale');}
});
/** MBB3 counterfactual: burst ATK ▲220% removed. */
const noAtk220 = withPatchedOverride(SLUG, (ov) => {
  const blk = ov.burst.find((b: any) =>
    b.effects.some((e: any) => e.stat === 'atkPct')
  );
  if (!blk)
    {throw new Error('mbb burst atkPct block missing — fixture is stale');}
  blk.effects = blk.effects.filter((e: any) => e.stat !== 'atkPct');
});
/** MBB4 counterfactual: S2 burst DoT removed. */
const noDot = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'dot')
  );
  if (ov.skill2.length === before)
    {throw new Error('mbb S2 dot block missing — fixture is stale');}
});
/** MBB5 isolation: the manual-gated Embarrassment blocks stripped. In the DEFAULT auto mode the
 *  engine's mode gate already filters these out, so this must be byte-identical to shipped. */
const stripManual = withPatchedOverride(SLUG, (ov) => {
  ov.skill1 = ov.skill1.filter((b: any) => b.mode !== MANUAL);
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const manual = run({ mode: MANUAL });
const noPierce = run({ overrides: { [SLUG]: noGainPierce } });
const no220 = run({ overrides: { [SLUG]: noAtk220 } });
const noD = run({ overrides: { [SLUG]: noDot } });
const stripped = run({ overrides: { [SLUG]: stripManual } });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const mbbDamage = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  dmg(evs).filter((d) => d.slug === SLUG && d.srcSlot === srcSlot);
const mbbShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === SLUG);
const mbbBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === SLUG);
/** helm is the co-B3 in the control comp — it leads Full Bursts mbb does NOT cast. This is what makes
 *  the burstCast-vs-fullBurstEnter discriminator LIVE in the fixture: mbb's burst-derived buffs/ticks
 *  must key to HER casts, never helm's. */
const helmBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'helm'
  );
/** buffApply events cast by mbb (slot index), by stat. */
const mbbBuffs = (evs: SimEvent[], stat: string) =>
  evs.filter(
    (e): e is BuffApply =>
      e.kind === 'buffApply' && e.casterIdx === MBB && e.stat === stat
  );
/** Does frame `a` coincide (≤2f cast→buff latency) with any frame in `bs`? */
const near = (a: number, bs: number[]) => bs.some((b) => Math.abs(a - b) <= 2);

describe('milk-blooming-bunny — kit spec', () => {
  describe('MBB1 — S1 "Gain Pierce for 6 sec" lights her burst pierceDamagePct (both modes)', () => {
    it('the burst Pierce Damage buff is applied at the datamined 117.64%, once per cast', () => {
      const applied = mbbBuffs(base.events, 'pierceDamagePct');
      expect(applied.length).toBe(mbbBursts(base.events).length);
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([117.64]);
    });

    it('is LIVE: removing the Pierce tag (gainPierce) reduces her damage', () => {
      // gainPierce emits no event; its only observable is that pierceDamagePct goes live (sim.ts:1400).
      expect(base.total).toBeGreaterThan(noPierce.total);
    });

    it('DISCRIMINATING: the no-gainPierce model (the old dead-pierce bug) provably under-counts', () => {
      // The 117.64 buff is still APPLIED in the counterfactual, but dead — proves the shipped
      // encoding is one the pre-enactment model provably fails.
      const cfApplied = mbbBuffs(noPierce.events, 'pierceDamagePct');
      expect(
        cfApplied.length,
        'counterfactual still applies the buff'
      ).toBeGreaterThan(0);
      expect(noPierce.total).toBeLessThan(base.total);
    });
  });

  describe('MBB2 — burst "Pierce Damage ▲117.64% for 10 sec", self-scoped', () => {
    const applied = mbbBuffs(base.events, 'pierceDamagePct');

    it('is 117.64% for exactly 10 sec, held by mbb alone', () => {
      expect([...new Set(applied.map((b) => b.value))]).toEqual([117.64]);
      for (const b of applied) {expect(b.expiresFrame! - b.frame).toBe(10 * FPS);}
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([MBB]);
    });

    it('DISCRIMINATING: keyed to HER OWN burstCast — never to a helm-led Full Burst (co-B3)', () => {
      // A fullBurstEnter encoding would also fire on the 6 Full Bursts helm leads (different frames).
      const mbbFrames = mbbBursts(base.events).map((c) => c.frame);
      const helmFrames = helmBursts(base.events).map((c) => c.frame);
      expect(
        helmFrames.length,
        'fixture must field helm-led bursts to discriminate'
      ).toBeGreaterThan(0);
      for (const b of applied) {
        expect(
          near(b.frame, mbbFrames),
          `buff at ${b.frame} not at an mbb cast`
        ).toBe(true);
        expect(
          near(b.frame, helmFrames),
          `buff at ${b.frame} leaked onto a helm-led burst`
        ).toBe(false);
      }
    });
  });

  describe('MBB3 — burst "ATK ▲220% for 10 sec", self-scoped, load-bearing', () => {
    const applied = mbbBuffs(base.events, 'atkPct').filter(
      (b) => b.value === 220
    );

    it('is the L10 magnitude 220 (not the L1 130), once per cast, for 10 sec, self only', () => {
      expect(applied.length).toBe(mbbBursts(base.events).length);
      expect(applied.length).toBeGreaterThan(0);
      for (const b of applied) {expect(b.expiresFrame! - b.frame).toBe(10 * FPS);}
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([MBB]);
    });

    it('DISCRIMINATING: removing it collapses her burst-window damage', () => {
      expect(no220.total).toBeLessThan(base.total);
    });

    it('DISCRIMINATING: keyed to HER OWN burstCast, never a helm-led Full Burst', () => {
      const mbbFrames = mbbBursts(base.events).map((c) => c.frame);
      const helmFrames = helmBursts(base.events).map((c) => c.frame);
      for (const b of applied) {
        expect(
          near(b.frame, mbbFrames),
          `buff at ${b.frame} not at an mbb cast`
        ).toBe(true);
        expect(
          near(b.frame, helmFrames),
          `buff at ${b.frame} leaked onto a helm-led burst`
        ).toBe(false);
      }
    });
  });

  describe('MBB4 — S2 Overconfident DoT: 447.7% every 2s for 10s during each burst window', () => {
    const ticks = mbbDamage(base.events, 'skill2');
    const bursts = mbbBursts(base.events);
    const fullWindow = bursts.filter((c) => c.frame + 10 * FPS <= FIGHT_FRAMES);

    it('lands at the kit magnitude 447.7 in the skill bucket', () => {
      expect(ticks.length).toBeGreaterThan(0);
      expect([...new Set(ticks.map((d) => d.atkPct))]).toEqual([447.7]);
      expect([...new Set(ticks.map((d) => d.bucket))]).toEqual(['skill']);
    });

    it('ticks 5× per full burst window (interval 2s over 10s) — not 1 (instant) nor 10 (1s)', () => {
      expect(
        fullWindow.length,
        'no burst has a full 10s window inside the fight'
      ).toBeGreaterThan(0);
      for (const cast of fullWindow) {
        const inWindow = ticks.filter(
          (d) => d.frame >= cast.frame && d.frame <= cast.frame + 10 * FPS
        );
        expect(
          inWindow.length,
          `burst at ${cast.sec.toFixed(2)}s produced ${inWindow.length} ticks`
        ).toBe(5);
      }
    });

    it('DISCRIMINATING: removing the DoT removes a load-bearing damage source', () => {
      expect(mbbDamage(noD.events, 'skill2').length).toBe(0);
      expect(noD.total).toBeLessThan(base.total);
    });

    it('DISCRIMINATING: ticks only inside HER OWN burst windows — none follow a helm-led burst', () => {
      // burstCast keying (correct) vs fullBurstEnter (would tick after helm-led Full Bursts too).
      const mbbWindows = mbbBursts(base.events).map(
        (c) => [c.frame, c.frame + 10 * FPS] as const
      );
      const helmFrames = helmBursts(base.events).map((c) => c.frame);
      for (const t of ticks) {
        expect(
          mbbWindows.some(([lo, hi]) => t.frame >= lo && t.frame <= hi),
          `tick at ${t.frame} outside every mbb burst window`
        ).toBe(true);
        expect(
          near(t.frame, helmFrames),
          `tick at ${t.frame} sits on a helm-led cast`
        ).toBe(false);
      }
    });
  });

  describe('MBB5 — Embarrassment is MANUAL-gated (the Tier-2 mode split)', () => {
    it('AUTO (default): the manual blocks are inert — stripping them is byte-identical to shipped', () => {
      expect(stripped.total).toBe(base.total);
    });

    it('AUTO (default): no 290% Embarrassment proc and no ATK 118.7% — she is a plain SR', () => {
      expect(mbbDamage(base.events, 'skill1').length).toBe(0);
      expect(
        mbbBuffs(base.events, 'atkPct').filter((b) => b.value === 118.7).length
      ).toBe(0);
      expect(mbbBuffs(base.events, 'maxAmmoPct').length).toBe(0);
    });

    it('MANUAL: the Embarrassment cycle activates (ATK 118.7, ammo dump, slow reload)', () => {
      expect(
        mbbBuffs(manual.events, 'atkPct').filter((b) => b.value === 118.7)
          .length
      ).toBeGreaterThan(0);
      expect([
        ...new Set(mbbBuffs(manual.events, 'maxAmmoPct').map((b) => b.value)),
      ]).toEqual([-100]);
      expect([
        ...new Set(
          mbbBuffs(manual.events, 'reloadSpeedPct').map((b) => b.value)
        ),
      ]).toEqual([-50]);
    });

    it('MANUAL: the 290% distributed proc fires once per shot, and cadence collapses to 1 shot/cycle', () => {
      const procs = mbbDamage(manual.events, 'skill1');
      const shots = mbbShots(manual.events).length;
      expect(procs.length).toBe(shots);
      expect([...new Set(procs.map((d) => d.atkPct))]).toEqual([290]);
      // The -100 max-ammo cap floors the magazine to 1 → far fewer shots than the auto 6-round cadence.
      expect(shots).toBeLessThan(mbbShots(base.events).length);
    });

    it('DISCRIMINATING: the two modes produce different totals (a permanent-cycle model would not)', () => {
      expect(manual.total).not.toBe(base.total);
    });
  });
});
