// PER-UNIT KIT SPEC — `emma-tactical-upgrade` (Emma: Tactical Upgrade, Supporter/MG/Fire, Burst I,
// cd 20s, ammo 300, MG 60→4200rpm windup). Kit-autonomy gauntlet 2026-07-27; test-first (TDD
// transition step 3). FROM-SCRATCH build: no override existed before this gauntlet, so the RED
// phase is the whole file failing at load (no override on disk) and GREEN lands with the S3
// override. Variant of base `emma` — never refer to her by the bare base name (P0 disambiguation).
//
// One assertion group per KIT LINE (T1..T7 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) and to ISOLATE the recovery channel (crown's own heal
// removed) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters['emma-tactical-upgrade'].skills):
//   S1 ■ start of battle / Affects self:
//        Environment Setup (recurring interval 30 sec):
//        E1 all enemies (incl. those appearing during): Damage Taken ▲3.9% for 10 sec          [T1]
//        E2 all allies: recovers 2.32% of the skill user's final Max HP every 1 sec for 10 sec [T2]
//        Exposure (Cannot be removed): Attract: Taunt all enemies continuously                 [—]
//   S2 ■ only if self is alive (no death in v1 → unconditional):
//        LT Formation:
//        E1 all allies from the same squad: Critical Damage ▲23.51% continuously               [T3]
//        E2 all allies: Projectile Explosion Damage ▲2.32% continuously                        [T4]
//        Bonus effects when applying AS Formation to self (MODE-GATED, default OFF — the       [T7]
//        formation is applied by eunhwa-tactical-upgrade, who is NOT simSupported, so no board
//        team can ever have it; the mode exists for kit-SSOT completeness, mint-duet precedent):
//        E1 all allies: True Damage ▲30.97% continuously
//        E2 all allies: Projectile Explosion Damage ▲3.09% continuously
//        E3 self: Exposure activation disabled continuously                                    [—]
//        E4 self: Recurring interval of Environment Setup ▼20 sec continuously
//   BU ■ all allies: Battlefield Formation: ATK ▲40.07% OF THE SKILL USER'S ATK for 10 sec      [T5]
//      ■ self while in Environment Setup status: Enhanced Environment Setup (10 sec):
//        E1 all enemies: Damage taken multiplier of Environment Setup scaled by 100%           [T6]
//        E2 all allies: Incoming healing ▲29.04%                                               [—]
//
// UNMODELED lines (documented, no assertion — nothing observable or nothing to represent):
//   [—] Exposure taunt: v1 has a single immortal boss and no targeting model; every unit already
//       attacks the boss, so a taunt moves no damage. Verbatim in the override's unmodeled.
//   [—] AS Formation bonus E3 (Exposure activation disabled): toggles off the already-unmodeled
//       taunt — a no-op on a no-op. Verbatim in unmodeled (even under the AS mode).
//   [—] Incoming healing ▲29.04%: no healing AMOUNTS are modeled (no HP pool, boss deals no
//       damage); the only healing observable is the recovery-event channel, which this line does
//       not touch. Verbatim in unmodeled.
//
// S2b RECONCILIATION (driver vs claude-fable-5, 2026-07-27):
//   (1) Enemy-debuff events carry casterIdx===null AND targetIdx===null (fable was right; the
//       owner is encoded in the buff KEY '0:skill1:…'/'0:burst:…') — the T1/T6 filters are
//       key-based, not casterIdx-based.
//   (2) Same-squad target (T3): driver holds `allies` (the sim IS one deployed squad; AIM
//       precedent encodes her "same squad" lines as plain allies). Fable's "self only" reading
//       would drop her main team contribution; noir's teamHas.slugs ruling is a GATE on named
//       lore-mates, a different construct from a target set. Documented in the override note.
//   (3) T4 fixture: fable assumed an RL-free comp; ada IS RL, and the engine's projExplOnRlNormals
//       default (Q9 A/B, Prydwen-confirmed) feeds the stat into RL NORMALS' Damage Up — so T4
//       asserts LIVE on ada (+0.0232 dmgUp) and INERT on MG normals. Stronger than byte-inert.
//   (4) AS Formation bonus lines: driver ADOPTS fable's modes[] encoding (default = no AS, since
//       the applier eunhwa-tactical-upgrade is off the board) over its original UNMODELED+⚑ plan —
//       converged. T7 pins the mode behaviour (interval 30→10 collapse, trueDamage 30.97,
//       additive projExpl 3.09) and the default-OFF absence.
//   (5) Fixture hazard (fable note 5 — liter outranking Emma for B1 casts): avoided by design —
//       the fixture fields NO liter; Emma is the sole Burst I and T5/T6 assert casts > 0.
//   Converged outright: T1 windows/first-fire-t=0, T2 ticks:10 recovery cadence, T5 flat
//   casterAtkPct on burstCast, T6 gated ×2 co-stacking debuff, taunt + incoming-heal UNMODELED.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   T1  the vulnerability is a BOSS DEBUFF (damageTakenPct, targetIdx null → mult.taken on every
//       ally's damage), NOT an ally ATK buff: the wrong-stat counterfactual (atkPct on the enemy
//       target, which resolves to nobody) never moves mult.taken at all. And it is WINDOWED
//       (10s on / 30s cycle from t=0: applications at frames 0,1800,…,9000), NOT continuous: the
//       duration-stripped counterfactual leaves mult.taken > 1 in the 15–29s gap where shipped
//       reads exactly 1.0.
//   T2  the heal is an event cadence, not a number (no HP pool): with crown's own heal patched
//       out, crown's recovery consumer (team Attack Damage 20.99% / 7s) fires exactly on Emma's
//       HoT ticks — 10 ticks spanning ~9s per window, every firing attributable to a window. The
//       ticks-stripped counterfactual (single instant event) collapses each window to 1 firing.
//       The 2.32%-of-HER-Max-HP magnitude is genuinely unmodeled (heal carries no amount) — the
//       cadence + target coverage is the faithful observable (blanc HoT precedent).
//   T3  the exact kit magnitude 23.51 (not the level-1 13.89), continuous (frame 0, no expiry),
//       on all three allies incl. herself ("same squad" ≡ whole team at single-squad scope), and
//       LIVE: removing it moves every ally's total (expected-value pass is deterministic).
//   T4  Projectile Explosion Damage is its OWN multiplicative bucket on explosion-flavored hits
//       AND (Q9 A/B, Prydwen-confirmed default ON) a Damage-Up addition on RL NORMAL attacks.
//       ada is RL → the line is LIVE on ada's normals: her mult.dmgUp drops by exactly 0.0232
//       when the line is removed. Emma/crown are MG → their normals are byte-identical across the
//       removal (flavored-hits-only rule: MG normals never read the stat). The two assertions
//       together pin the SCOPE, not just the presence.
//   T5  casterAtkPct resolves to a FLAT add of (40.07/100)×HER staticAtk on every ally (crown
//       precedent): the aligned in-window baseAtk diff vs the removed counterfactual is exactly
//       that flat value, and exactly 0 outside the 10s window. The own-% counterfactual (atkPct)
//       would key the diff to each target's OWN ATK — a different magnitude (staticAtks differ).
//   T6  the enhancement is GATED on Environment Setup being live at cast time (targetStatus
//       channel: S1 opens a name-keyed 'Environment Setup' boss window alongside the debuff; the
//       burst block carries requiresTargetStatus). Burst cadence 20s vs windows [0,10)/[30,40)/…
//       means some casts land IN windows (enhancement fires, mult.taken reaches 1.078 in the
//       overlap) and some land in the GAP (no enhancement). The ungated counterfactual fires on
//       EVERY cast — provably more applications, including gap-frame ones shipped never emits.
//       MODELING RULING (driver): the enhanced window carries the doubled multiplier for its OWN
//       full 10s (modeled as a second co-stacking damageTakenPct 3.9 instance, distinct
//       slot-keyed buff per the KR stacking rule), rather than clipping when the base window
//       expires — the kit gives Enhanced Environment Setup its own "Duration: 10 sec". The
//       strict-scale-only reading (bonus ends with the base window) differs by +3.9% taken over
//       ~7s per in-window burst; ⚑ measurement-gated in the override note.
//   T7  the AS Formation mode (default OFF) collapses the Environment Setup interval 30s→10s —
//       18 applications / 180s and a CONTIGUOUS window chain (every steady-state damage instance
//       carries mult.taken ≥ 1.039, vs 1/3 duty in the default mode) — and adds trueDamagePct
//       30.97 + a second projectileExplosionPct 3.09 (additive: ada's RL normals gain a further
//       +0.0309 dmgUp over the default-mode run). The default-OFF absence is pinned too: the
//       default run has zero trueDamagePct applications from Emma and the 30s cadence (T1).
//
// Fixture: emma-tactical-upgrade (B1, 20s) / crown (B2, 20s) / ada (B3, 40s), boss Fire, focus
// ada. Emma is the SOLE Burst I so she casts every Full Burst (~20s cycle → ~9 casts / 180s) —
// required to exercise T5/T6 at all. Crown is the recovery CONSUMER that makes T2 observable; her
// own hitCount self-heal is patched out in EVERY run so the recovery channel is attributable to
// Emma's HoT alone (helm H8 isolation idiom). Boss Fire: nobody is advantaged (ada/emma Fire,
// crown Iron), keeping the element bucket out of every diff. Deterministic (no seed) — event logs
// align index-for-index across counterfactual runs (ATK changes move no cadence: the boss is
// immortal and gauge is per-shot, not per-damage).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const WINDOW_FRAMES = 10 * FPS; // Environment Setup window length
const CYCLE_FRAMES = 30 * FPS; // recurring interval
/** Fixture slot order: emma-tactical-upgrade 0 / crown 1 / ada 2. */
const EMMA = 0;
const CROWN = 1;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

/** The override's declared AS-Formation mode (second mode; the first/default is no-AS). */
const AS_MODE = 'AS Formation (w/ eunhwa-tactical-upgrade)';

function run(
  overrides: Record<string, any> = {},
  modes?: Record<string, string>
) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: ['emma-tactical-upgrade', 'crown', 'ada'],
    bossElement: 'Fire',
    focusSlug: 'ada',
    overrides,
    modes,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, res, totals: totals(res) };
}

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const emmaBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast =>
      e.kind === 'burstCast' && e.slug === 'emma-tactical-upgrade'
  );

/** Crown's recovery-consumer firings (one per distinct frame) — the T2 HoT observable. */
const recoveryFrames = (evs: SimEvent[]): number[] =>
  [
    ...new Set(
      buffs(evs)
        .filter(
          (b) =>
            b.casterIdx === CROWN &&
            b.stat === 'attackDamagePct' &&
            b.value === 20.99
        )
        .map((b) => b.frame)
    ),
  ].sort((a, b) => a - b);

// ---- counterfactual / isolation patches -------------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** Isolation: crown's own hitCount self-heal removed so the recovery channel is Emma's HoT only. */
const crownNoHeal = withPatchedOverride('crown', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'heal')
  );
  if (ov.skill2.length === before) {
    throw new Error('crown S2 heal block missing — fixture is stale');
  }
});

/** T1 counterfactual: the vulnerability with NO duration (continuous, not 10s windows). */
const emmaVulnAlways = withPatchedOverride('emma-tactical-upgrade', (ov) => {
  let n = 0;
  for (const b of ov.skill1) {
    for (const e of b.effects) {
      if (e.stat === 'damageTakenPct') {
        delete e.durationSec;
        n++;
      }
    }
  }
  if (!n) {
    throw new Error(
      'emma-tu S1 damageTakenPct effect missing — fixture is stale'
    );
  }
});

/** T1 counterfactual: the same line as an ally-style ATK buff on the enemy target (inert — the
 *  enemy target resolves to no entity). mult.taken must never move under it. */
const emmaVulnWrongStat = withPatchedOverride('emma-tactical-upgrade', (ov) => {
  let n = 0;
  for (const b of ov.skill1) {
    for (const e of b.effects) {
      if (e.stat === 'damageTakenPct') {
        e.stat = 'atkPct';
        n++;
      }
    }
  }
  if (!n) {
    throw new Error(
      'emma-tu S1 damageTakenPct effect missing — fixture is stale'
    );
  }
});

/** T2 counterfactual: the HoT as a single instant heal event (ticks stripped). */
const emmaHotNoTicks = withPatchedOverride('emma-tactical-upgrade', (ov) => {
  let n = 0;
  for (const b of ov.skill1) {
    for (const e of b.effects) {
      if (e.kind === 'heal') {
        delete e.ticks;
        n++;
      }
    }
  }
  if (!n) {
    throw new Error('emma-tu S1 heal effect missing — fixture is stale');
  }
});

/** T3 reference: the crit-damage line removed entirely. */
const emmaNoCritDmg = withPatchedOverride('emma-tactical-upgrade', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'critDamagePct'));
  if (ov.skill2.length === before) {
    throw new Error(
      'emma-tu S2 critDamagePct block missing — fixture is stale'
    );
  }
});

/** T4 reference: the projectile-explosion line removed entirely. */
const emmaNoProjExpl = withPatchedOverride('emma-tactical-upgrade', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !hasStat(b, 'projectileExplosionPct')
  );
  if (ov.skill2.length === before) {
    throw new Error(
      'emma-tu S2 projectileExplosionPct block missing — fixture is stale'
    );
  }
});

/** T5 reference: the burst ATK line removed entirely. */
const emmaNoCasterAtk = withPatchedOverride('emma-tactical-upgrade', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasStat(b, 'casterAtkPct'));
  if (ov.burst.length === before) {
    throw new Error(
      'emma-tu burst casterAtkPct block missing — fixture is stale'
    );
  }
});

/** T5 counterfactual: the same line as % of each target's OWN ATK (atkPct), not the caster's. */
const emmaOwnAtkPct = withPatchedOverride('emma-tactical-upgrade', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'casterAtkPct');
  if (!e) {
    throw new Error(
      'emma-tu burst casterAtkPct effect missing — fixture is stale'
    );
  }
  e.stat = 'atkPct';
});

/** T6 counterfactual: the enhancement UNGATED (fires on every burst, Environment Setup or not). */
const emmaEnhUngated = withPatchedOverride('emma-tactical-upgrade', (ov) => {
  const b = ov.burst.find((x: any) => x.requiresTargetStatus);
  if (!b) {
    throw new Error(
      'emma-tu burst requiresTargetStatus block missing — fixture is stale'
    );
  }
  delete b.requiresTargetStatus;
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run({ crown: crownNoHeal });
const rVulnAlways = run({
  crown: crownNoHeal,
  'emma-tactical-upgrade': emmaVulnAlways,
});
const rWrongStat = run({
  crown: crownNoHeal,
  'emma-tactical-upgrade': emmaVulnWrongStat,
});
const rNoTicks = run({
  crown: crownNoHeal,
  'emma-tactical-upgrade': emmaHotNoTicks,
});
const rNoCrit = run({
  crown: crownNoHeal,
  'emma-tactical-upgrade': emmaNoCritDmg,
});
const rNoProj = run({
  crown: crownNoHeal,
  'emma-tactical-upgrade': emmaNoProjExpl,
});
const rNoCaster = run({
  crown: crownNoHeal,
  'emma-tactical-upgrade': emmaNoCasterAtk,
});
const rOwnAtk = run({
  crown: crownNoHeal,
  'emma-tactical-upgrade': emmaOwnAtkPct,
});
const rUngated = run({
  crown: crownNoHeal,
  'emma-tactical-upgrade': emmaEnhUngated,
});
const rAS = run({ crown: crownNoHeal }, { 'emma-tactical-upgrade': AS_MODE });

// ---- derived constants ------------------------------------------------------------------------
const emmaStaticAtk = unitOf(base.res, 'emma-tactical-upgrade').staticAtk;
const adaStaticAtk = unitOf(base.res, 'ada').staticAtk;
const FLAT_ATK_GRANT = (40.07 / 100) * emmaStaticAtk;

/** Boss-debuff buff keys: ownerIdx (Emma = slot 0) + slot + stat + value — the KR stacking key.
 *  Enemy debuffs carry casterIdx===null AND targetIdx===null, so the owner is read off the KEY. */
const VULN_BASE_KEY = `${EMMA}:skill1:damageTakenPct:3.9`;
const VULN_ENH_KEY = `${EMMA}:burst:damageTakenPct:3.9`;

/** Base Environment Setup vulnerability applications (skill1-keyed boss debuffs). */
const baseVulnApps = buffs(base.events).filter((b) => b.key === VULN_BASE_KEY);
/** Enhanced (burst-keyed) vulnerability applications. */
const enhVulnApps = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.key === VULN_ENH_KEY);
const baseWindows = baseVulnApps.map((b) => b.frame);
const inSomeWindow = (frame: number) =>
  baseWindows.some((w) => frame >= w && frame < w + WINDOW_FRAMES);

describe('emma-tactical-upgrade (Emma: Tactical Upgrade) — kit spec', () => {
  describe('T1 — S1 Environment Setup: Damage Taken ▲3.9% on the boss, 10s windows every 30s from t=0', () => {
    it('applies at frame 0 and recurs on the 30s interval (6 windows / 180s), each 10s long', () => {
      expect(baseVulnApps.map((b) => b.frame)).toEqual([
        0,
        CYCLE_FRAMES,
        2 * CYCLE_FRAMES,
        3 * CYCLE_FRAMES,
        4 * CYCLE_FRAMES,
        5 * CYCLE_FRAMES,
      ]);
      for (const b of baseVulnApps) {
        expect(b.value).toBe(3.9);
        expect(b.targetIdx, 'a boss debuff has no unit holder').toBeNull();
        expect(b.expiresFrame! - b.frame).toBe(WINDOW_FRAMES);
      }
    });

    it('mult.taken tracks the coverage map: 1.0 uncovered, 1.039 one instance, 1.078 overlap', () => {
      // The burst enhancement (T6) co-stacks a second instance from some cast frames, so the
      // taken value at any frame is a pure function of which instances cover it — assert the
      // full map, not a hand-picked band (an enhanced window legitimately extends past the base
      // window it was cast inside, so e.g. t=15s correctly still reads 1.039).
      const enhFrames = enhVulnApps(base.events).map((b) => b.frame);
      const inEnh = (f: number) =>
        enhFrames.some((h) => f >= h && f < h + WINDOW_FRAMES);
      let sawUncovered = 0;
      let sawSingle = 0;
      let sawOverlap = 0;
      for (const d of dmg(base.events)) {
        const b = inSomeWindow(d.frame);
        const e = inEnh(d.frame);
        if (!b && !e) {
          sawUncovered++;
          expect(d.mult.taken, `uncovered damage at ${d.sec}s`).toBe(1);
        } else if (b && e) {
          sawOverlap++;
          expect(d.mult.taken, `overlap damage at ${d.sec}s`).toBeCloseTo(
            1.078,
            9
          );
        } else {
          sawSingle++;
          expect(
            d.mult.taken,
            `single-instance damage at ${d.sec}s`
          ).toBeCloseTo(1.039, 9);
        }
      }
      expect(
        sawUncovered,
        'no uncovered damage — 10/30 windows cannot tile the timeline'
      ).toBeGreaterThan(0);
      expect(sawSingle, 'no single-instance damage').toBeGreaterThan(0);
      expect(
        sawOverlap,
        'no overlap damage — the enhancement never co-stacked'
      ).toBeGreaterThan(0);
    });

    it('DISCRIMINATING: the duration-stripped counterfactual stays live in the 15–29s gap', () => {
      const gapLifted = dmg(rVulnAlways.events).filter(
        (d) => d.frame >= 15 * FPS && d.frame < 29 * FPS && d.mult.taken > 1
      );
      expect(gapLifted.length).toBeGreaterThan(0);
    });

    it('DISCRIMINATING: boss DEBUFF channel — under the wrong-stat counterfactual the base windows contribute nothing', () => {
      // The counterfactual still opens the targetStatus window (only the buff stat flipped), so
      // the burst enhancement can still fire — the discriminator is the BASE windows alone:
      // frames inside a base window but outside every enhanced window.
      const enhFrames = enhVulnApps(base.events).map((b) => b.frame);
      const baseOnly = (f: number) =>
        inSomeWindow(f) &&
        !enhFrames.some((h) => f >= h && f < h + WINDOW_FRAMES);
      expect(
        dmg(base.events).some((d) => baseOnly(d.frame) && d.mult.taken > 1.03),
        'shipped base windows must lift mult.taken on their own'
      ).toBe(true);
      expect(
        dmg(rWrongStat.events).some(
          (d) => baseOnly(d.frame) && d.mult.taken > 1.0001
        ),
        'atkPct on the enemy target resolves to nobody — base windows must stay at 1.0'
      ).toBe(false);
    });
  });

  describe('T2 — S1 Environment Setup: ally HoT as a 10-tick recovery cadence per window', () => {
    const frames = recoveryFrames(base.events);

    it('every recovery firing is attributable to an Environment Setup window', () => {
      expect(frames.length, 'no recovery firings at all').toBeGreaterThan(40);
      const stray = frames.filter((f) => !inSomeWindow(f));
      expect(
        stray,
        `recovery firings outside every window: ${stray.map((f) => (f / FPS).toFixed(1)).join(',')}`
      ).toEqual([]);
    });

    it('ticks every ~1s across the whole window (>=9 ticks spanning >=8s), not one instant event', () => {
      const w = CYCLE_FRAMES; // the t=30s window, fully inside the fight
      const inWin = frames.filter((f) => f >= w && f < w + WINDOW_FRAMES);
      expect(inWin.length).toBeGreaterThanOrEqual(9);
      expect(inWin[inWin.length - 1] - inWin[0]).toBeGreaterThanOrEqual(
        8 * FPS
      );
    });

    it('DISCRIMINATING: the ticks-stripped counterfactual collapses each window to a single firing', () => {
      const w = CYCLE_FRAMES;
      const inWin = recoveryFrames(rNoTicks.events).filter(
        (f) => f >= w && f < w + WINDOW_FRAMES
      );
      expect(inWin.length).toBeLessThanOrEqual(2);
    });
  });

  describe('T3 — S2 LT Formation: Critical Damage ▲23.51% continuously, all allies (same squad)', () => {
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === EMMA && b.stat === 'critDamagePct'
    );

    it('is the kit magnitude, from frame 0, with no expiry, on all three allies incl. herself', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([23.51]);
      expect([...new Set(applied.map((b) => b.frame))]).toEqual([0]);
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
      expect([...new Set(applied.map((b) => b.targetIdx))].sort()).toEqual([
        EMMA,
        CROWN,
        2,
      ]);
    });

    it("is LIVE: removing it lowers every ally's total", () => {
      for (const slug of ['ada', 'crown', 'emma-tactical-upgrade']) {
        expect(
          base.totals[slug],
          `${slug} total must exceed the crit-damage-removed world`
        ).toBeGreaterThan(rNoCrit.totals[slug]);
      }
    });
  });

  describe('T4 — S2 LT Formation: Projectile Explosion Damage ▲2.32% continuously, all allies', () => {
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === EMMA && b.stat === 'projectileExplosionPct'
    );

    it('is 2.32% from frame 0, no expiry, on all three allies', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([2.32]);
      expect([...new Set(applied.map((b) => b.frame))]).toEqual([0]);
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
      expect([...new Set(applied.map((b) => b.targetIdx))].sort()).toEqual([
        EMMA,
        CROWN,
        2,
      ]);
    });

    it("is LIVE on ada's RL normals: her mult.dmgUp drops by exactly 0.0232 when the line is removed", () => {
      const adaNormalsBase = dmg(base.events).filter(
        (d) => d.slug === 'ada' && d.bucket === 'normal'
      );
      const adaNormalsNoProj = dmg(rNoProj.events).filter(
        (d) => d.slug === 'ada' && d.bucket === 'normal'
      );
      expect(adaNormalsBase.length).toBeGreaterThan(0);
      expect(adaNormalsNoProj.length).toBe(adaNormalsBase.length);
      for (let i = 0; i < adaNormalsBase.length; i++) {
        expect(
          adaNormalsBase[i].mult.dmgUp - adaNormalsNoProj[i].mult.dmgUp,
          `event ${i} at ${adaNormalsBase[i].sec}s`
        ).toBeCloseTo(0.0232, 9);
      }
    });

    it('is INERT on MG normals (flavored-hits-only rule): emma and crown are byte-identical across the removal', () => {
      for (const slug of ['emma-tactical-upgrade', 'crown']) {
        const baseNormals = dmg(base.events).filter(
          (d) => d.slug === slug && d.bucket === 'normal'
        );
        const noProjNormals = dmg(rNoProj.events).filter(
          (d) => d.slug === slug && d.bucket === 'normal'
        );
        expect(noProjNormals.length).toBe(baseNormals.length);
        for (let i = 0; i < baseNormals.length; i++) {
          expect(noProjNormals[i].mult.dmgUp).toBe(baseNormals[i].mult.dmgUp);
        }
      }
    });
  });

  describe('T5 — Burst Battlefield Formation: ATK ▲40.07% of HER ATK, 10s, all allies', () => {
    const casts = emmaBursts(base.events);
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === EMMA && b.stat === 'casterAtkPct'
    );

    it('fires once per burst cast at the flat resolution of 40.07% of her staticAtk, for 10s, on all allies', () => {
      expect(casts.length).toBeGreaterThan(0);
      // One buffApply event per HOLDER (3 allies) per cast.
      expect(applied.length).toBe(casts.length * 3);
      for (const b of applied) {
        expect(b.value).toBeCloseTo(FLAT_ATK_GRANT, 6);
        expect(b.expiresFrame! - b.frame).toBe(WINDOW_FRAMES);
      }
      const perFrame = new Map<number, Set<number | null>>();
      for (const b of applied) {
        (
          perFrame.get(b.frame) ??
          perFrame.set(b.frame, new Set()).get(b.frame)!
        ).add(b.targetIdx);
      }
      for (const [, holders] of perFrame) {
        expect([...holders].sort()).toEqual([EMMA, CROWN, 2]);
      }
    });

    it('the flat add is keyed to HER ATK and confined to the 10s window (aligned baseAtk diffs)', () => {
      const castFrames = casts.map((c) => c.frame);
      const inWindow = (f: number) =>
        castFrames.some((c) => f >= c && f < c + WINDOW_FRAMES);
      const adaBase = dmg(base.events).filter(
        (d) => d.slug === 'ada' && d.bucket === 'normal'
      );
      const adaNoCaster = dmg(rNoCaster.events).filter(
        (d) => d.slug === 'ada' && d.bucket === 'normal'
      );
      expect(adaNoCaster.length).toBe(adaBase.length);
      let sawInWindow = false;
      for (let i = 0; i < adaBase.length; i++) {
        const diff = adaBase[i].baseAtk - adaNoCaster[i].baseAtk;
        if (inWindow(adaBase[i].frame)) {
          sawInWindow = true;
          expect(diff, `in-window event at ${adaBase[i].sec}s`).toBeCloseTo(
            FLAT_ATK_GRANT,
            4
          );
        } else {
          expect(diff, `out-of-window event at ${adaBase[i].sec}s`).toBe(0);
        }
      }
      expect(sawInWindow, 'no ada normals landed inside a burst window').toBe(
        true
      );
    });

    it("DISCRIMINATING: the own-% counterfactual keys the diff to the TARGET'S ATK, not hers", () => {
      expect(emmaStaticAtk).not.toBe(adaStaticAtk);
      const adaBase = dmg(base.events).filter(
        (d) => d.slug === 'ada' && d.bucket === 'normal'
      );
      const adaOwn = dmg(rOwnAtk.events).filter(
        (d) => d.slug === 'ada' && d.bucket === 'normal'
      );
      expect(adaOwn.length).toBe(adaBase.length);
      // Under atkPct, removing it shrinks ada's baseAtk by ada's OWN 40.07% — a different
      // magnitude than the shipped caster-scaled flat add.
      let checked = 0;
      for (let i = 0; i < adaBase.length; i++) {
        if (adaBase[i].baseAtk === adaOwn[i].baseAtk) {
          continue; // out-of-window events coincide
        }
        checked++;
        expect(
          Math.abs(adaBase[i].baseAtk - adaOwn[i].baseAtk),
          `in-window event at ${adaBase[i].sec}s`
        ).not.toBeCloseTo(0, 4);
      }
      expect(
        checked,
        'the own-% model must diverge somewhere in-window'
      ).toBeGreaterThan(0);
    });
  });

  describe('T6 — Burst Enhanced Environment Setup: vulnerability ×2, gated on Environment Setup live at cast', () => {
    const casts = emmaBursts(base.events);
    const enh = enhVulnApps(base.events);

    it('fires ONLY on burst casts that land inside an Environment Setup window (and at least one does)', () => {
      const castFrames = new Set(casts.map((c) => c.frame));
      expect(enh.length).toBeGreaterThan(0);
      expect(
        enh.length,
        'the gate must exclude at least one gap-frame cast'
      ).toBeLessThan(casts.length);
      for (const b of enh) {
        expect(
          castFrames.has(b.frame),
          `enh app at ${b.frame} is not a cast frame`
        ).toBe(true);
        expect(b.value).toBe(3.9);
        expect(b.targetIdx).toBeNull();
        expect(b.expiresFrame! - b.frame).toBe(WINDOW_FRAMES);
        expect(
          inSomeWindow(b.frame),
          `enh app at ${(b.frame / FPS).toFixed(1)}s is outside every window`
        ).toBe(true);
      }
    });

    it('the overlap stacks the boss debuff to mult.taken 1.078', () => {
      const doubled = dmg(base.events).filter(
        (d) => Math.abs(d.mult.taken - 1.078) < 1e-9
      );
      expect(
        doubled.length,
        'no damage instance saw both vulnerability instances co-active'
      ).toBeGreaterThan(0);
      const maxTaken = dmg(base.events).reduce(
        (m, d) => Math.max(m, d.mult.taken),
        0
      );
      expect(maxTaken).toBeCloseTo(1.078, 9);
    });

    it('DISCRIMINATING: the ungated counterfactual fires on EVERY cast, including gap frames', () => {
      const enhU = enhVulnApps(rUngated.events);
      expect(enhU.length).toBe(casts.length);
      expect(
        enhU.some((b) => !inSomeWindow(b.frame)),
        'with ~9 casts vs 10/30 windows, some gap-frame casts are guaranteed'
      ).toBe(true);
    });
  });

  describe('T7 — AS Formation mode (default OFF): interval collapse + True Damage + additive Projectile Explosion', () => {
    it('collapses the Environment Setup interval 30s→10s: 18 applications, contiguous duty cycle', () => {
      const asApps = buffs(rAS.events).filter((b) => b.key === VULN_BASE_KEY);
      expect(asApps.length).toBe(18);
      expect(asApps.map((b) => b.frame)).toEqual(
        Array.from({ length: 18 }, (_, i) => i * 10 * FPS)
      );
      // Windows [0,10),[10,20),… tile the fight: every damage instance is in-window.
      const uncovered = dmg(rAS.events).filter((d) => d.mult.taken < 1.039);
      expect(
        uncovered.length,
        'the AS cadence must leave no gap in the vulnerability duty cycle'
      ).toBe(0);
    });

    it('grants True Damage ▲30.97% to all allies under AS — and NOTHING under the default mode', () => {
      const asTD = buffs(rAS.events).filter(
        (b) => b.casterIdx === EMMA && b.stat === 'trueDamagePct'
      );
      expect(asTD.length).toBeGreaterThan(0);
      expect([...new Set(asTD.map((b) => b.value))]).toEqual([30.97]);
      expect([...new Set(asTD.map((b) => b.frame))]).toEqual([0]);
      expect([...new Set(asTD.map((b) => b.expiresFrame))]).toEqual([null]);
      expect([...new Set(asTD.map((b) => b.targetIdx))].sort()).toEqual([
        EMMA,
        CROWN,
        2,
      ]);
      const baseTD = buffs(base.events).filter(
        (b) => b.casterIdx === EMMA && b.stat === 'trueDamagePct'
      );
      expect(
        baseTD.length,
        'the default (no-AS) mode must emit no trueDamagePct at all'
      ).toBe(0);
    });

    it('Projectile Explosion ▲3.09% is ADDITIVE on top of the base 2.32% (ada RL normals: +0.0309 dmgUp vs default)', () => {
      // Compare only inside the first HoT window band [0,7s): crown's recovery consumer is
      // continuously active in BOTH runs there (identical opening cadence — the AS interval
      // collapse first diverges at t=10s), so the dmgUp diff isolates exactly the extra 3.09.
      // Later frames diverge in consumer UPTIME (the tripled cadence refreshes it to ~100%),
      // which is T7d's territory, not this assertion's.
      const BAND = 7 * FPS;
      const adaAs = dmg(rAS.events).filter(
        (d) => d.slug === 'ada' && d.bucket === 'normal' && d.frame < BAND
      );
      const adaBase = dmg(base.events).filter(
        (d) => d.slug === 'ada' && d.bucket === 'normal' && d.frame < BAND
      );
      expect(adaAs.length).toBe(adaBase.length);
      expect(adaAs.length).toBeGreaterThan(0);
      for (let i = 0; i < adaAs.length; i++) {
        expect(
          adaAs[i].mult.dmgUp - adaBase[i].mult.dmgUp,
          `event ${i} at ${adaAs[i].sec}s`
        ).toBeCloseTo(0.0309, 9);
      }
      // Buff-level pin: the 3.09 instance reaches all three allies under AS and never ships
      // under the default mode.
      const as309 = buffs(rAS.events).filter(
        (b) =>
          b.casterIdx === EMMA &&
          b.stat === 'projectileExplosionPct' &&
          b.value === 3.09
      );
      expect([...new Set(as309.map((b) => b.targetIdx))].sort()).toEqual([
        EMMA,
        CROWN,
        2,
      ]);
      expect(
        buffs(base.events).filter(
          (b) =>
            b.casterIdx === EMMA &&
            b.stat === 'projectileExplosionPct' &&
            b.value === 3.09
        ).length
      ).toBe(0);
    });

    it('triples the HoT recovery cadence (one tick-set per 10s instead of per 30s)', () => {
      const asCount = recoveryFrames(rAS.events).length;
      const baseCount = recoveryFrames(base.events).length;
      expect(asCount).toBeGreaterThanOrEqual(150);
      expect(asCount).toBeGreaterThan(2.5 * baseCount);
    });
  });
});
