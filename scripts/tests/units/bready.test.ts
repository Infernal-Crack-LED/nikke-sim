// PER-UNIT KIT SPEC — `bready` (Bready, Attacker/SR/Water, Burst III, cd 40s, ammo 6,
// chargeFrames 60 datamine). Kit-autonomy gauntlet 2026-07-25 (Tier 2).
//
// One assertion group per KIT LINE (H1..H10 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears ONLY to build the H2 charge-speed COUNTERFACTUAL (the
// nearest-wrong model — the debuff removed — that the shipped assertion must discriminate against);
// it never supplies the encoding under test.
//
// TASTE-MODE MACHINE. Bready's kit is gated on a mutually-exclusive "Taste" state. In game the taste
// is entered by GAINING a teammate's sustained-damage buff (→ Lingering Taste) or distributed-damage
// buff (→ Recommended Taste); the two cancel each other. The engine has NO buff-gain event primitive,
// so the taste is a user-selectable `modes` pair on the override (["sustained","distributed"],
// first = default = sustained/Lingering). This spec therefore runs the unit in EACH mode and asserts
// every taste-gated line fires in its OWN mode and is INERT in the other — the mode gate is the heart
// of the discrimination. (The tasteless state a no-buff team produces is genuinely unrepresentable —
// charFixes.chargeFrames is unconditional — so there is deliberately no tasteless mode; see the override
// ⚑ MODE caveat. S7 judge gotcha-1 reconciled the modes to this 2-mode pair, default sustained.)
//
// Kit (blablalink prose, data/characters.json → characters.bready.skills):
//   S1 ■ entering Full Burst → self: ATK ▲70.01% for 10 sec                              [H1] (UNCOND)
//      ■ gaining a sustained-dmg buff → Lingering Taste: Charge Speed ▼20%/50s, unremovable;
//        Cancels Recommended Taste                                                       [H2] (UNCOND payload / UNMODELED trigger)
//      ■ gaining a distributed-dmg buff (not sustained) → Recommended Taste: Charge Speed ▼20%/50s,
//        unremovable; Cancels Lingering Taste                                            [H2] (same payload / UNMODELED trigger)
//   S2 ■ after 3 Full Charge hits while Lingering → the target: Damage Taken ▲10.2%/5 sec [H3] (sustained)
//        Aftertaste: 150.04% of final ATK as sustained damage every 1 sec for 5 sec       [H4] (sustained)
//      ■ hitting with Full Charge while Recommended → self: Attack Damage ▲60.01%/5 sec   [H5] (distributed)
//      ■ hitting with Full Charge while Recommended → all enemies: 265.07% final ATK as
//        distributed damage                                                              [H6] (distributed)
//   BU ■ self: Attack Damage ▲60.19% for 10 sec                                          [H7] (UNCOND)
//      ■ while Lingering → self: Aftertaste Effect ▲349.8% for 10 sec (sustainedDamagePct)[H8] (sustained)
//      ■ while Recommended → self: ATK ▲70.09% for 10 sec                                 [H9] (distributed)
//   H10  structural: the mode gate is TOTAL — sustained mode fires NO distributed-family line and vice
//        versa (mutual exclusivity), and the Lingering proc cadence is ~1 per 3 full charges (gotcha-3).
//
// UNMODELED (legitimately out-of-domain — verbatim in override.unmodeled.skill1, no assertion):
//   - the two taste-ENTRY trigger lines ("Activates when gaining a buff that increases sustained/
//     distributed damage") — the engine emits no buff-gain event, so the taste cannot be auto-derived
//     from the team's buff types; it is a manual mode instead.
//   - the two "Cancels …" lines — mutual exclusivity is enforced STRUCTURALLY by the single selected
//     mode (only one taste's blocks are live at a time), so there is nothing to simulate.
//   - the TASTELESS state's missing charge-speed debuff: charFixes.chargeFrames is UNCONDITIONAL, so a
//     team feeding neither buff type would still carry the 72-frame cycle (owner caveat; the sim cannot
//     represent "tasteless ⇒ no debuff"). H10 asserts the gated LINES go inert in `auto`, not the debuff.
//
// MEASUREMENT-GATED ⚑ (encoded faithfully, magnitude unmeasured — documented, NOT asserted exactly):
//   - H2 charge time 72 (subtractive 60×1.20) vs 75 (divisive 60/0.8) — only the DIRECTION is pinned.
//   - H4 Aftertaste DoT stack-vs-refresh / overlap depends on the unmeasured charge cadence.
//   - H8 "Aftertaste Effect ▲349.8%" is an ADDITIVE sustained Damage-Up bucket; a multiplicative
//     DoT-magnitude reading would be ~41% hotter in her window — unmeasured.
//   - the full cadence tuple (charge 72 / reload 141 / 22f bolt gap) is a datamine estimate.
//   - H6 distributed flavor is encoded (flavor:"distributed") but inert at ×1 in THIS fixture (no
//     distributed-damage amp present) — correct engine behavior, not a modeling gap.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates nothing):
//   H1  fullBurstEnter, not burstCast: the buff must land on the Full Burst WINDOW-START frame, which is
//       ~22f AFTER her own burstCast frame (burst-apply delay). Asserted frame == fullBurstStart frame
//       AND != burstCast frame, so a burstCast encoding provably fails. Unconditional ⇒ fires in both modes.
//   H7  burstCast, not fullBurstEnter: the mirror of H1 — the buff lands on the burstCast frame, BEFORE
//       the window. Asserted frame == burstCast frame AND != fullBurstStart frame.
//   H3/H4/H5/H6/H8/H9  the mode gate: each taste-gated line is present in its own mode and ABSENT in the
//       other (the "absent" assertion is the built-in RED a wrong/ungated model fails).
//   H2  the debuff is live: shipped (72f) yields FEWER full-charge shots than the debuff-removed (60f)
//       counterfactual. Exact 72-vs-75 is measurement-gated, so no exact-value assertion.
//
// Fixture: liter (B1) / crown (B2) / bready (B3), boss Fire (Water-strong ⇒ elemental major on), focus
// bready (×2.5 burst gauge on the charge weapon) so her burst actually casts (5 casts / 180s). A lone
// B3 makes zero Full Bursts, so the control core is required to exercise any burst/FB-gated line.
// Deterministic (no seed); mode injected per-unit through prepareTeam (the shared runComp does not
// expose mode, so the runner is built locally here).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runSim } from '../../../src/engine/sim.js';
import { prepareTeam } from '../../../src/prepare.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import { scopeLockCfg } from '../../lib/scope-lock.js';
import {
  data,
  deps,
  mult,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const SLUGS = ['liter', 'crown', 'bready'] as const;
/** slot order: liter 0 / crown 1 / bready 2. */
const BREADY = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;
type FBStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

/** Run the fixture with bready in a chosen taste mode (and optional in-memory override patches). */
function runMode(mode: string, overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const ov: Record<string, any> = {};
  for (const s of SLUGS) {
    ov[s] = overrides[s] ?? loadOverride(s);
  }
  const chars = SLUGS.map((s) => data.characters[s]);
  const prepared = prepareTeam(
    chars,
    SLUGS.map((s) => ({
      doll: false,
      ol: 'base5' as const,
      ...(s === 'bready' ? { mode } : {}),
    })),
    { overrides: ov, ...deps }
  );
  const cfg = scopeLockCfg([...SLUGS], 'Fire', {
    focusSlug: 'bready',
    onEvent: (e) => events.push(e),
  });
  const res = runSim(chars, mult, cfg, prepared);
  return { events, totals: totals(res) };
}

// ---- counterfactual (H2) ---------------------------------------------------------------------
/** Nearest-wrong model for the charge-speed debuff: the Taste ▼20% removed (cycle back to 60f). */
const breadyNoDebuff = withPatchedOverride('bready', (ov) => {
  if (ov.charFixes?.chargeFrames !== 72) {
    throw new Error(
      'bready charFixes.chargeFrames 72 missing — fixture is stale'
    );
  }
  ov.charFixes.chargeFrames = 60;
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const sustained = runMode('sustained');
const distributed = runMode('distributed');
const noDebuff = runMode('sustained', { bready: breadyNoDebuff });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const breadyDmg = (
  evs: SimEvent[],
  srcSlot: Damage['srcSlot'],
  atkPct?: number
) =>
  dmg(evs).filter(
    (d) =>
      d.slug === 'bready' &&
      d.srcSlot === srcSlot &&
      (atkPct === undefined || d.atkPct === atkPct)
  );
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
/** A self buff bready cast on herself (casterIdx == targetIdx == BREADY). */
const selfBuff = (evs: SimEvent[], stat: string, value?: number) =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === BREADY &&
      b.targetIdx === BREADY &&
      b.stat === stat &&
      (value === undefined || b.value === value)
  );
/** A debuff on the boss (targetIdx null). The engine does not attribute a caster to enemy debuffs. */
const bossDebuff = (evs: SimEvent[], stat: string, value?: number) =>
  buffs(evs).filter(
    (b) =>
      b.targetIdx === null &&
      b.stat === stat &&
      (value === undefined || b.value === value)
  );
const breadyShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'bready');
const breadyBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'bready'
  );
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e): e is FBStart => e.kind === 'fullBurstStart');
const frames = (evs: { frame: number }[]) =>
  evs.map((e) => e.frame).sort((a, b) => a - b);

describe('bready — kit spec', () => {
  describe('H1 — S1 FB-enter self ATK ▲70.01%/10s is fullBurstEnter (UNCONDITIONAL)', () => {
    const applied = selfBuff(sustained.events, 'atkPct', 70.01);

    it('lands on the Full Burst WINDOW-START frame, not her burstCast frame', () => {
      expect(applied.length, 'no S1 ATK buff applied').toBeGreaterThan(0);
      expect(frames(applied)).toEqual(frames(fbStarts(sustained.events)));
      expect(frames(applied)).not.toEqual(
        frames(breadyBursts(sustained.events))
      );
    });

    it('is 70.01% self-scoped for 10 sec, once per Full Burst', () => {
      expect([...new Set(applied.map((b) => b.value))]).toEqual([70.01]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([BREADY]);
      expect(applied.length).toBe(fbStarts(sustained.events).length);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('is UNCONDITIONAL — fires in both sustained and distributed modes', () => {
      expect(selfBuff(distributed.events, 'atkPct', 70.01).length).toBe(
        fbStarts(distributed.events).length
      );
    });
  });

  describe('H2 — Taste Charge Speed ▼20% is a live, unconditional charge-time increase (charFixes 72f)', () => {
    it('fewer full-charge shots than the debuff-removed (60f) counterfactual', () => {
      const shipped = breadyShots(sustained.events).length;
      const removed = breadyShots(noDebuff.events).length;
      expect(
        shipped,
        `shipped ${shipped} shots vs debuff-removed ${removed} — the ▼20% must slow her cycle`
      ).toBeLessThan(removed);
    });
    // Exact 72 (subtractive) vs 75 (divisive) is MEASUREMENT-GATED — deliberately no exact-value assert.
  });

  describe('H3 — S2 Lingering: boss Damage Taken ▲10.2%/5s after 3 full charges (sustained-gated)', () => {
    it('applies the boss debuff in sustained mode', () => {
      const debuffs = bossDebuff(sustained.events, 'damageTakenPct', 10.2);
      expect(
        debuffs.length,
        'no Damage Taken debuff in sustained mode'
      ).toBeGreaterThan(0);
      expect([...new Set(debuffs.map((b) => b.value))]).toEqual([10.2]);
      for (const b of debuffs) {
        expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
      }
    });

    it('is INERT in distributed mode (the mode gate)', () => {
      expect(
        bossDebuff(distributed.events, 'damageTakenPct', 10.2).length
      ).toBe(0);
    });

    it('procs ~once per 3 full charges (hitCount:3 counts WEAPON hits, not dot ticks/rider) — gotcha-3', () => {
      // A count:1 encoding, or a hitCount that also counted her own Aftertaste dot ticks / distributed
      // rider, would inflate the proc count far past floor(shots/3). Pinning the cadence proves the
      // counter increments on full-charge weapon hits ONLY (S2b + blind ratio test, never run blind).
      const procs = bossDebuff(sustained.events, 'damageTakenPct', 10.2).length;
      const shots = breadyShots(sustained.events).length;
      expect(
        procs,
        `${procs} DT procs vs ${shots} full-charge shots — expected one proc per 3 hits`
      ).toBe(Math.floor(shots / 3));
    });
  });

  describe('H4 — S2 Lingering: Aftertaste sustained DoT 150.04%/tick, 1s interval (sustained-gated)', () => {
    const ticks = breadyDmg(sustained.events, 'skill2', 150.04);

    it('ticks at the kit magnitude on a 1-second interval in sustained mode', () => {
      expect(
        ticks.length,
        'no Aftertaste DoT in sustained mode'
      ).toBeGreaterThan(0);
      expect([...new Set(ticks.map((d) => d.atkPct))]).toEqual([150.04]);
      // Within a proc the ticks are exactly 60f (1s) apart; new procs restart the cadence, so check
      // the modal gap rather than every consecutive pair.
      const gaps = frames(ticks)
        .slice(1)
        .map((f, i) => f - frames(ticks)[i]);
      const modal = gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)];
      expect(modal, 'modal tick gap should be 1s (60f)').toBe(1 * FPS);
    });

    it('emits exactly 5 ticks per proc (a fresh 5s/1s instance each 3-charge proc) — gotcha-3', () => {
      // Pairs with H3's proc cadence: total ticks == 5 × proc count, save possibly the last proc whose
      // 5s window can be truncated by the 180s fight end. A continuous/deduped DoT (one fight-long
      // instance) or a wrong tick count would break this band.
      const procs = bossDebuff(sustained.events, 'damageTakenPct', 10.2).length;
      expect(ticks.length).toBeGreaterThan(5 * (procs - 1));
      expect(ticks.length).toBeLessThanOrEqual(5 * procs);
    });

    it('is INERT in distributed mode (the mode gate)', () => {
      expect(breadyDmg(distributed.events, 'skill2', 150.04).length).toBe(0);
    });
  });

  describe('H5 — S2 Recommended: self Attack Damage ▲60.01%/5s per full charge (distributed-gated)', () => {
    it('refreshes on (nearly) every full-charge shot in distributed mode', () => {
      const applied = selfBuff(distributed.events, 'attackDamagePct', 60.01);
      const shots = breadyShots(distributed.events).length;
      expect(
        applied.length,
        'no Attack Damage self-buff in distributed mode'
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([60.01]);
      expect(
        applied.length,
        `${applied.length} applications vs ${shots} shots`
      ).toBeGreaterThanOrEqual(shots * 0.9);
    });

    it('is INERT in sustained mode (the mode gate)', () => {
      expect(selfBuff(sustained.events, 'attackDamagePct', 60.01).length).toBe(
        0
      );
    });
  });

  describe('H6 — S2 Recommended: 265.07% distributed rider to all enemies per full charge (distributed-gated)', () => {
    const riders = breadyDmg(distributed.events, 'skill2', 265.07);

    it('lands once per full-charge shot at the kit magnitude in distributed mode', () => {
      expect(
        riders.length,
        'no distributed rider in distributed mode'
      ).toBeGreaterThan(0);
      expect([...new Set(riders.map((d) => d.atkPct))]).toEqual([265.07]);
      expect(riders.length).toBe(breadyShots(distributed.events).length);
    });

    it('follows the rider convention: crit-eligible, NO core, NO range bonus', () => {
      // Text lacks "core strike" ⇒ coreEligible false; flatDamage riders are universal (noRange) ⇒
      // rangeApplied false; crit at caster rate ⇒ critEligible true. A wrong model granting core or
      // range provably fails these.
      expect([...new Set(riders.map((d) => d.critEligible))]).toEqual([true]);
      expect([...new Set(riders.map((d) => d.coreEligible))]).toEqual([false]);
      expect([...new Set(riders.map((d) => d.rangeApplied))]).toEqual([false]);
    });

    it('is INERT in sustained mode (the mode gate)', () => {
      expect(breadyDmg(sustained.events, 'skill2', 265.07).length).toBe(0);
    });
    // Distributed FLAVOR is encoded (flavor:"distributed") but inert at ×1 here — no distributed amp in
    // this fixture — so mult.distributed is not asserted (see header). FB major is taken by LANDING
    // timing (noFb default OFF), so fbMajorApplied legitimately varies and is not pinned.
  });

  describe('H7 — burst self Attack Damage ▲60.19%/10s is burstCast (UNCONDITIONAL)', () => {
    const applied = selfBuff(sustained.events, 'attackDamagePct', 60.19);

    it('lands on the burstCast frame, BEFORE the Full Burst window', () => {
      expect(
        applied.length,
        'no burst Attack Damage buff applied'
      ).toBeGreaterThan(0);
      expect(frames(applied)).toEqual(frames(breadyBursts(sustained.events)));
      expect(frames(applied)).not.toEqual(frames(fbStarts(sustained.events)));
    });

    it('is 60.19% self-scoped for 10 sec, once per burst cast', () => {
      expect([...new Set(applied.map((b) => b.value))]).toEqual([60.19]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([BREADY]);
      expect(applied.length).toBe(breadyBursts(sustained.events).length);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('is UNCONDITIONAL — fires in both sustained and distributed modes', () => {
      expect(
        selfBuff(distributed.events, 'attackDamagePct', 60.19).length
      ).toBe(breadyBursts(distributed.events).length);
    });
  });

  describe('H8 — burst Lingering: Aftertaste Effect ▲349.8%/10s → sustainedDamagePct (sustained-gated)', () => {
    it('applies 349.8% once per burst cast in sustained mode', () => {
      const applied = selfBuff(sustained.events, 'sustainedDamagePct', 349.8);
      expect(
        applied.length,
        'no Aftertaste Effect buff in sustained mode'
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([349.8]);
      expect(applied.length).toBe(breadyBursts(sustained.events).length);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('is INERT in distributed mode (the mode gate)', () => {
      expect(
        selfBuff(distributed.events, 'sustainedDamagePct', 349.8).length
      ).toBe(0);
    });
    // ADDITIVE sustained Damage-Up bucket; a multiplicative DoT-magnitude reading is measurement-gated.
  });

  describe('H9 — burst Recommended: ATK ▲70.09%/10s (distributed-gated)', () => {
    it('applies 70.09% once per burst cast in distributed mode', () => {
      const applied = selfBuff(distributed.events, 'atkPct', 70.09);
      expect(
        applied.length,
        'no burst ATK buff in distributed mode'
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([70.09]);
      expect(applied.length).toBe(breadyBursts(distributed.events).length);
    });

    it('is INERT in sustained mode (the mode gate)', () => {
      expect(selfBuff(sustained.events, 'atkPct', 70.09).length).toBe(0);
    });
  });

  describe('H10 — structural: the mode gate is TOTAL (the two Tastes are mutually exclusive)', () => {
    it('sustained mode fires NO distributed-family line', () => {
      expect(selfBuff(sustained.events, 'attackDamagePct', 60.01).length).toBe(
        0
      ); // S2b
      expect(breadyDmg(sustained.events, 'skill2', 265.07).length).toBe(0); // S2c rider
      expect(selfBuff(sustained.events, 'atkPct', 70.09).length).toBe(0); // burst Recommended
    });

    it('distributed mode fires NO sustained-family line', () => {
      expect(
        bossDebuff(distributed.events, 'damageTakenPct', 10.2).length
      ).toBe(0); // S2a DT
      expect(breadyDmg(distributed.events, 'skill2', 150.04).length).toBe(0); // S2a Aftertaste DoT
      expect(
        selfBuff(distributed.events, 'sustainedDamagePct', 349.8).length
      ).toBe(0); // burst Lingering
    });

    it('the UNCONDITIONAL lines fire in BOTH modes (they are not taste-gated)', () => {
      for (const run of [sustained, distributed]) {
        expect(selfBuff(run.events, 'atkPct', 70.01).length).toBe(
          fbStarts(run.events).length
        );
        expect(selfBuff(run.events, 'attackDamagePct', 60.19).length).toBe(
          breadyBursts(run.events).length
        );
      }
    });
    // There is deliberately NO tasteless mode: a no-buff team leaves her tasteless, but charFixes is
    // unconditional, so that state cannot be represented faithfully (override ⚑ MODE caveat).
  });
});
