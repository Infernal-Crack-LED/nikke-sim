// PER-UNIT KIT SPEC — `crust` (Crust, Supporter/RL/Water, Burst II, cd 20s, ammo 6, chargeFrames 60).
// Kit-autonomy gauntlet 2026-07-31 (Tier 2).
//
// One assertion group per KIT LINE (H1..H6 below), asserted against the SHIPPED override loaded from
// disk. `withPatchedOverride` appears ONLY to build COUNTERFACTUALS (the nearest-wrong model each
// assertion must discriminate against) — never to supply the encoding under test.
//
// STANCE-MODE MACHINE. Crust's kit is gated on a mutually-exclusive "stance": Maillard (entered in
// game by landing 3 normal non-Full-Charge attacks) vs Blanching (entered by maintaining 3 Full
// Charges for >1 sec); each REMOVES the other. LOAD-BEARING PREMISE (verified sim.ts:3121 + probe):
// the engine's RL/SR path ALWAYS fires full-charge shots (an RL never tap-fires), so the "3 normal
// non-Full-Charge → Maillard" entry can NEVER fire in-sim — Blanching is the ONLY reachable stance.
// The default mode is therefore BLANCHING (the sim-faithful state); H0 pins that a no-mode run behaves
// as Blanching (Sustained ▲10% present, Distributed ▲60% absent). Maillard is kept as a documented
// opt-in mode for a real tap-fire / distributed-team playstyle. The engine has no stance-entry event
// primitive, so the stance is a user-selectable `modes` pair (["Blanching","Maillard"], first=default).
// This spec runs the unit in EACH mode and asserts every stance-gated line fires in its OWN mode and is
// INERT in the other — the mode gate is the heart of the discrimination. Both stances grant the SAME S1
// ATK buff (10% of caster ATK), so that line is unconditional across modes; only the burst's conditional
// damage buff discriminates Maillard (Distributed ▲60%) from Blanching (Sustained ▲10%).
//
// S2b RECONCILIATION (claude-fable-5): the reviewer's load-bearing premise — RL always full-charges ⇒
// Blanching is the sole live stance, Maillard family dead — was verified correct (sim.ts:3121) and ACCEPTED
// as the default-mode flip (Maillard→Blanching). The Maillard lines are KEPT as mode-gated blocks (not
// unmodeled) to preserve the full kit for a Maillard-played recording; the default no longer ships the 60%
// Distributed over-credit the reviewer flagged as the shared-prior misread.
//
// Kit (blablalink prose, data/characters.json → characters.crust.skills):
//   S1 ■ FC while Maillard → all allies: Maillard Duration ▲2.5 sec                          [UNMODELED] (inert)
//      ■ FC while Blanching → all allies: Blanching Duration ▲2.5 sec                        [UNMODELED] (inert)
//      ■ 3 normal non-FC → all allies: Maillard: ATK ▲10% of caster ATK /10s; Removes Blanching [H1] (Maillard)
//      ■ 3 FC >1s → all allies: Blanching: ATK ▲10% of caster ATK /10s; Removes Maillard      [H1] (Blanching)
//   S2 ■ 3 normal non-FC / 3 FC → all allies not in Reliable Cooking: Reliable Cooking DEF ▲10% of
//        caster DEF /10s (encoded inert defPct 10; caster-DEF approximated, no casterDefPct)   [H-def] (inert)
//        Removes 1 debuff                                                                    [UNMODELED] (inert v1)
//      ■ entering Full Burst → all targets in Maillard/Blanching: ATK ▲20% of caster ATK /10s [H2] (UNCOND)
//   BU ■ all allies: Attack Damage ▲20% /10s                                                 [H3] (UNCOND)
//      ■ all allies in Maillard: Distributed Damage ▲60% /10s                                [H4] (Maillard)
//      ■ all allies in Blanching: Sustained Damage ▲10% /10s                                 [H5] (Blanching)
//   H6  structural: the mode gate is TOTAL — Maillard fires NO sustained-family line and vice versa;
//       the unconditional lines (H1 stance ATK, H2 FB ATK, H3 burst Attack Damage) fire in BOTH modes.
//
// UNMODELED (legitimately out-of-domain — verbatim in override.unmodeled, no assertion):
//   - S1 L1/L2 "Duration ▲2.5 sec" lines: a buff-duration-extension maintenance mechanic. The stance ATK
//     buff is modeled at saturated 100% uptime (a hitCount:3 grant with a 10s window — re-procced every
//     ~3 shots, well inside the window), so extending its duration moves no damage; the engine has no
//     generic buff-duration-extend primitive that would change any total.
//   - S1 "Removes Blanching"/"Removes Maillard": mutual exclusivity enforced STRUCTURALLY by the single
//     selected mode (only one stance's blocks are live at a time), so there is nothing to simulate.
//   - S2 "Reliable Cooking: DEF ▲10% of the skill user's DEF /10s" is ENCODED as an inert defPct 10 block
//     (H-def pins presence + damage-inertness; both blind re-derivations converged on encoding it). The
//     "Removes 1 debuff" cleanse and the "allies not in Reliable Cooking" no-refresh gate remain UNMODELED
//     (no primitive; the scope-lock boss applies no ally debuffs) — documented, not silently dropped.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates nothing):
//   H1  casterAtkPct, NOT atkPct: the kit says "10% of the SKILL USER'S ATK" — a flat grant derived from
//       the CASTER's ATK, identical absolute amount on every ally regardless of their own ATK. Proven two
//       ways: the buffApply stat is 'casterAtkPct' with a flat resolved value (NOT the 10 percent), uniform
//       across all allies; AND the atkPct counterfactual (scales each target's OWN ATK) moves the team
//       total differently. Modeled as a hitCount:3 grant with a 10s window (saturated uptime after the
//       opening ~4.1s proc), so each application carries a finite 600-frame expiry and no round budget.
//   H2  fullBurstEnter, not burstCast: the buff lands on the Full Burst WINDOW-START frame (~22f after the
//       burstCast). Asserted frame == fullBurstStart frame AND != burstCast frame; fires once per Full Burst.
//       casterAtkPct (20% of caster ATK) flat, all allies, 10s. Unconditional ⇒ fires in both modes.
//   H3  burstCast, not fullBurstEnter: the mirror of H2 — the aura lands on the burstCast frame, BEFORE the
//       window. Asserted frame == burstCast frame AND != fullBurstStart frame. attackDamagePct 20, all allies.
//   H4/H5  the mode gate: each stance-gated burst line is present in its own mode and ABSENT in the other
//       (the "absent" assertion is the built-in RED an ungated/stat-swapped model provably fails).
//   H6  structural mutual exclusivity + unconditionality of the non-gated lines.
//
// Fixture: liter (B1) / crust (B2) / ada (B3), boss Fire (Water-strong ⇒ elemental major on), focus crust
// (×2.5 burst gauge on the RL charge weapon) so her burst actually casts. A lone B2 makes zero Full Bursts,
// so the B1+B3 core is required to exercise any burst/FB-gated line. Deterministic (no seed); mode injected
// per-unit through prepareTeam (the shared runComp does not expose mode, so the runner is built locally).
// The Distributed/Sustained buffs are granted to all allies but only move damage on distributed/sustained
// -flavor hits; this fixture has none, so H4/H5 pin the buffApply EVENT (correct stat/value/mode-gating),
// not a totals delta — correct engine behaviour, not a modeling gap (mirrors bready H8/H9).
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
const SLUGS = ['liter', 'crust', 'ada'] as const;
/** slot order: liter 0 / crust 1 / ada 2. */
const CRUST = 1;
const N_ALLIES = SLUGS.length;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type FBStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

/** Run the fixture with crust in a chosen stance mode (and optional in-memory override patches).
 *  `mode` omitted ⇒ the override's DEFAULT mode (modes[0] = Blanching) is used — the H0 pin. */
function runMode(mode?: string, overrides: Record<string, any> = {}) {
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
      ...(s === 'crust' && mode ? { mode } : {}),
    })),
    { overrides: ov, ...deps }
  );
  const cfg = scopeLockCfg([...SLUGS], 'Fire', {
    focusSlug: 'crust',
    onEvent: (e) => events.push(e),
  });
  const res = runSim(chars, mult, cfg, prepared);
  return { events, totals: totals(res) };
}

// ---- counterfactuals (nearest-wrong models) --------------------------------------------------
/** H1 counterfactual: the stance ATK buff as a GENERIC atkPct (scales each target's OWN ATK) instead
 *  of casterAtkPct (flat, from the caster). Rewrites every skill1 casterAtkPct effect. */
const crustAtkPctS1 = withPatchedOverride('crust', (ov) => {
  const effs = ov.skill1.flatMap((b: any) => b.effects);
  const n = effs.filter((e: any) => e.stat === 'casterAtkPct').length;
  if (n === 0) {
    throw new Error('crust S1 casterAtkPct block missing — fixture is stale');
  }
  for (const e of effs) {
    if (e.stat === 'casterAtkPct') {
      e.stat = 'atkPct';
    }
  }
});
/** H4 counterfactual: the Maillard Distributed buff UNGATED (mode gate removed) — it would then fire in
 *  Blanching too, which the shipped "inert in Blanching" assertion provably fails. */
const crustUngatedDistributed = withPatchedOverride('crust', (ov) => {
  const blk = ov.burst.find((b: any) =>
    b.effects.some((e: any) => e.stat === 'distributedDamagePct')
  );
  if (!blk) {
    throw new Error(
      'crust burst distributedDamagePct block missing — fixture is stale'
    );
  }
  delete blk.mode;
});
/** H-def counterfactual: the Reliable Cooking DEF grant removed — totals must be byte-identical
 *  (defPct is damage-inert in v1), proving the block is present-but-inert, not a hidden damage source. */
const crustNoDef = withPatchedOverride('crust', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !b.effects.some((e: any) => e.stat === 'defPct')
  );
  if (ov.skill2.length === before) {
    throw new Error('crust S2 defPct block missing — fixture is stale');
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const defaultRun = runMode(); // no mode ⇒ override default (modes[0] = Blanching)
const maillard = runMode('Maillard');
const blanching = runMode('Blanching');
const atkPctS1 = runMode('Maillard', { crust: crustAtkPctS1 });
const ungatedDist = runMode('Blanching', { crust: crustUngatedDistributed });
const noDef = runMode('Blanching', { crust: crustNoDef });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
/** A buff crust cast (casterIdx == CRUST) carrying the given stat/value, optionally on a specific target. */
const crustBuff = (
  evs: SimEvent[],
  stat: string,
  value?: number,
  targetIdx?: number | null
) =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === CRUST &&
      b.stat === stat &&
      (value === undefined || b.value === value) &&
      (targetIdx === undefined || b.targetIdx === targetIdx)
  );
const crustBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'crust'
  );
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e): e is FBStart => e.kind === 'fullBurstStart');
const frames = (evs: { frame: number }[]) =>
  evs.map((e) => e.frame).sort((a, b) => a - b);
/** Distinct frames (an all-ally buff emits one event PER target per cast, so the raw frame list
 *  repeats each cast frame N_ALLIES times — dedupe before comparing against per-cast event lists). */
const uniqFrames = (evs: { frame: number }[]) =>
  [...new Set(frames(evs))].sort((a, b) => a - b);
/** Distinct target indices a set of buff applies reached. */
const reached = (bs: BuffApply[]) => [...new Set(bs.map((b) => b.targetIdx))];

describe('crust — kit spec', () => {
  // crust emits TWO casterAtkPct buffs: the S1 stance buff (10% of caster ATK, the smaller flat
  // value, hitCount:3 + 10s window) and the S2 FB-entry buff (20%, the larger, 10s window). Split on
  // magnitude so each group asserts the right line.
  const allCaster = crustBuff(maillard.events, 'casterAtkPct');
  const s1Value = Math.min(...allCaster.map((b) => b.value));
  const s2Value = Math.max(...allCaster.map((b) => b.value));

  describe('H0 — the DEFAULT mode is Blanching (the only stance the sim can reach)', () => {
    // The engine's RL always full-charges (sim.ts:3121), so the non-Full-Charge Maillard entry never
    // fires in-sim: a no-mode run must behave as Blanching. This pins the S2b reconciliation — a default
    // that shipped the Maillard 60% Distributed buff (the shared-prior misread) provably fails it.
    it('grants the Blanching Sustained ▲10% burst buff and NEVER the Maillard Distributed ▲60%', () => {
      expect(
        crustBuff(defaultRun.events, 'sustainedDamagePct', 10).length,
        'default must carry the Blanching Sustained buff'
      ).toBeGreaterThan(0);
      expect(
        crustBuff(defaultRun.events, 'distributedDamagePct', 60).length,
        'default must NOT carry the Maillard Distributed buff'
      ).toBe(0);
    });

    it('matches the explicit Blanching run exactly (damage-neutral stance swap on this comp)', () => {
      expect(defaultRun.totals).toEqual(blanching.totals);
    });
  });

  describe('H1 — S1 stance ATK buff: casterAtkPct 10 (flat, from caster) to all allies, both stances', () => {
    const applied = allCaster.filter((b) => b.value === s1Value);

    it('is the flat caster-derived stat, NOT a percent-of-target atkPct', () => {
      expect(applied.length, 'no S1 stance ATK buff applied').toBeGreaterThan(
        0
      );
      // casterAtkPct resolves to (10/100)×caster.staticAtk — a flat ATK number, never the raw 10 percent.
      expect([...new Set(applied.map((b) => b.value))]).not.toContain(10);
      for (const b of applied) {
        expect(b.value, 'flat grant must be positive').toBeGreaterThan(100);
      }
    });

    it('reaches every ally with ONE uniform flat value (caster-derived, not per-target)', () => {
      expect(
        reached(applied).sort(),
        'the stance ATK buff must reach all three allies'
      ).toEqual([0, 1, 2].sort());
      // A flat grant from the caster is the SAME absolute number on every holder.
      expect(new Set(applied.map((b) => b.value)).size).toBe(1);
    });

    it('resolves as a caster-ATK fraction: the S2 20% flat is exactly 2× the S1 10% flat', () => {
      // Both buffs derive from the SAME caster.staticAtk (casterAtkPct → (value/100)×staticAtk), so the
      // 20% grant is exactly double the 10% grant. A percent-of-target (atkPct) or a mis-scaled flat would
      // break the ratio. (Fixture staticAtk ≈ 99,734 ⇒ s1 ≈ 9,973.4, s2 ≈ 19,946.8 — not hardcoded.)
      expect(s2Value).toBe(s1Value * 2);
    });

    it('is a 10-SEC window (durationSec, not rounds) and fires in BOTH stances', () => {
      // hitCount:3 re-procs every ~3 of crust's hits against a 10s window ⇒ saturated uptime after the
      // opening proc; each application carries a finite 10s expiry and NO round-count budget.
      expect(
        applied.length,
        'the stance buff procs repeatedly'
      ).toBeGreaterThan(N_ALLIES);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
        expect(
          b.durationShots,
          'a timed buff must not also be round-counted'
        ).toBeNull();
      }
      expect(
        crustBuff(blanching.events, 'casterAtkPct').length,
        'both stances grant the same 10% ATK buff'
      ).toBeGreaterThan(0);
    });

    it('DISCRIMINATING: an atkPct encoding moves the team total differently', () => {
      // Flat-from-caster (shipped) vs percent-of-own-ATK (counterfactual) differ for allies whose ATK
      // differs from crust's — so the team total moves. Proves H1 is one the generic model provably fails.
      expect(maillard.totals).not.toEqual(atkPctS1.totals);
      expect(
        crustBuff(atkPctS1.events, 'atkPct', 10).length,
        'the counterfactual emits the raw 10 percent under atkPct'
      ).toBeGreaterThan(0);
    });
  });

  describe('H-def — S2 Reliable Cooking DEF ▲10% grant is encoded (kit-complete) but damage-INERT', () => {
    // The kit is caster-DEF-derived but there is no casterDefPct StatKey, so it is approximated by an
    // inert defPct 10 block (both blind re-derivations converged on encoding it rather than dropping it).
    it('grants defPct 10 to all three allies (the line is present, not silently dropped)', () => {
      const applied = crustBuff(blanching.events, 'defPct', 10);
      expect(
        applied.length,
        'no Reliable Cooking DEF grant applied'
      ).toBeGreaterThan(0);
      expect(reached(applied).sort()).toEqual([0, 1, 2].sort());
    });

    it('moves ZERO damage for anyone (defPct is inert in v1 — totals byte-identical when stripped)', () => {
      expect(noDef.totals).toEqual(blanching.totals);
    });
  });

  describe('H2 — S2 Full-Burst-entry ATK ▲20% of caster ATK to all allies (UNCONDITIONAL)', () => {
    const applied = allCaster.filter((b) => b.value === s2Value);

    it('lands on the Full Burst WINDOW-START frame, not her burstCast frame', () => {
      expect(applied.length, 'no S2 FB-entry ATK buff applied').toBeGreaterThan(
        0
      );
      expect(uniqFrames(applied)).toEqual(
        uniqFrames(fbStarts(maillard.events))
      );
      expect(uniqFrames(applied)).not.toEqual(
        uniqFrames(crustBursts(maillard.events))
      );
    });

    it('is the flat 20%-of-caster grant to all three allies, once per Full Burst, for 10 sec', () => {
      expect(new Set(applied.map((b) => b.value)).size).toBe(1);
      expect(reached(applied).sort()).toEqual([0, 1, 2].sort());
      expect(applied.length / N_ALLIES).toBe(fbStarts(maillard.events).length);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('is UNCONDITIONAL — fires in both Maillard and Blanching stances', () => {
      const blCaster = crustBuff(blanching.events, 'casterAtkPct');
      const blS2 = Math.max(...blCaster.map((b) => b.value));
      const blApplied = blCaster.filter((b) => b.value === blS2);
      expect(blApplied.length / N_ALLIES).toBe(
        fbStarts(blanching.events).length
      );
    });
  });

  describe('H3 — burst Attack Damage ▲20% to all allies, 10s (UNCONDITIONAL, burstCast)', () => {
    const applied = crustBuff(maillard.events, 'attackDamagePct', 20);

    it('lands on the burstCast frame, BEFORE the Full Burst window', () => {
      expect(
        applied.length,
        'no burst Attack Damage aura applied'
      ).toBeGreaterThan(0);
      expect(uniqFrames(applied)).toEqual(
        uniqFrames(crustBursts(maillard.events))
      );
      expect(uniqFrames(applied)).not.toEqual(
        uniqFrames(fbStarts(maillard.events))
      );
    });

    it('is 20% to all three allies, once per burst cast, for 10 sec', () => {
      expect([...new Set(applied.map((b) => b.value))]).toEqual([20]);
      expect(reached(applied).sort()).toEqual([0, 1, 2].sort());
      expect(applied.length / N_ALLIES).toBe(
        crustBursts(maillard.events).length
      );
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('is UNCONDITIONAL — fires in both stances', () => {
      expect(
        crustBuff(blanching.events, 'attackDamagePct', 20).length / N_ALLIES
      ).toBe(crustBursts(blanching.events).length);
    });
  });

  describe('H4 — burst Distributed Damage ▲60% to all allies, 10s (Maillard-gated)', () => {
    it('applies 60% once per burst cast to all three allies in Maillard stance', () => {
      const applied = crustBuff(maillard.events, 'distributedDamagePct', 60);
      expect(
        applied.length,
        'no Distributed Damage buff in Maillard stance'
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([60]);
      expect(reached(applied).sort()).toEqual([0, 1, 2].sort());
      expect(applied.length / N_ALLIES).toBe(
        crustBursts(maillard.events).length
      );
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('is INERT in Blanching stance (the mode gate)', () => {
      expect(
        crustBuff(blanching.events, 'distributedDamagePct', 60).length
      ).toBe(0);
    });

    it('DISCRIMINATING: an ungated encoding would leak the buff into Blanching', () => {
      // The mode-removed counterfactual fires the Distributed buff in Blanching — proving the shipped
      // "inert in Blanching" assertion is one the ungated model provably fails.
      expect(
        crustBuff(ungatedDist.events, 'distributedDamagePct', 60).length
      ).toBeGreaterThan(0);
    });
  });

  describe('H5 — burst Sustained Damage ▲10% to all allies, 10s (Blanching-gated)', () => {
    it('applies 10% once per burst cast to all three allies in Blanching stance', () => {
      const applied = crustBuff(blanching.events, 'sustainedDamagePct', 10);
      expect(
        applied.length,
        'no Sustained Damage buff in Blanching stance'
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([10]);
      expect(reached(applied).sort()).toEqual([0, 1, 2].sort());
      expect(applied.length / N_ALLIES).toBe(
        crustBursts(blanching.events).length
      );
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('is INERT in Maillard stance (the mode gate)', () => {
      expect(crustBuff(maillard.events, 'sustainedDamagePct', 10).length).toBe(
        0
      );
    });
  });

  describe('H6 — structural: the stance gate is TOTAL (Maillard and Blanching are mutually exclusive)', () => {
    it('Maillard fires NO sustained-family line', () => {
      expect(crustBuff(maillard.events, 'sustainedDamagePct', 10).length).toBe(
        0
      );
    });

    it('Blanching fires NO distributed-family line', () => {
      expect(
        crustBuff(blanching.events, 'distributedDamagePct', 60).length
      ).toBe(0);
    });

    it('the UNCONDITIONAL lines fire in BOTH stances', () => {
      for (const run of [maillard, blanching]) {
        // S1 stance ATK buff (casterAtkPct) is up.
        expect(crustBuff(run.events, 'casterAtkPct').length).toBeGreaterThan(0);
        // burst Attack Damage 20 aura fires once per burst cast.
        expect(
          crustBuff(run.events, 'attackDamagePct', 20).length / N_ALLIES
        ).toBe(crustBursts(run.events).length);
      }
    });

    it('crust actually casts her burst in this fixture (the gated lines are exercised)', () => {
      expect(crustBursts(maillard.events).length).toBeGreaterThan(0);
      expect(fbStarts(maillard.events).length).toBeGreaterThan(0);
    });
  });
});
