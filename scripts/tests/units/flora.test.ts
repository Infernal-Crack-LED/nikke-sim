// PER-UNIT KIT SPEC — `flora` (Flora, MG / Supporter / Electric / Burst II, cd 40s, ammo 300).
// Kit-autonomy gauntlet 2026-07-26 (Tier 2). Test-first re-derivation; the override under test is
// src/skills/overrides/flora.json (authored this gauntlet — Flora had no prior override).
//
// Flora is a healer-buffer: her OWN MG damage is minor and her value is TEAM-WIDE — her BURST team
// buffs, her S1 HoT, and an S2 chain that her OWN S1 sets off every burst rotation.
//
// Kit (blablalink prose, data/characters.json → characters.flora.skills; magnitudes = max level):
//   S1 ■ battle-start, self + both adjacent allies:
//        Peace of Mind — Restores HP = 1% of caster final Max HP every 1s continuously      [F4] (recovery cadence)
//        Incoming Healing ▲ 4% continuously, stacks 5x                                      [UNMODELED — no stat / no HP pool]
//      ■ after 100 normal attacks, all Electric allies: +1 stack to stackable buffs         [UNMODELED — no stack primitive ⚑ engine-core]
//      ■ entering Burst Stage 2, Peace-of-Mind allies: Max HP ▲ 15.01% of caster 2s         [UNMODELED as a stat — but see THE S2 CHAIN below]
//   S2 ■ adjacent ally HP drops to <=90%: shield 10.22% caster final Max HP 10s (all allies) [F5]
//      ■ either adjacent ally reaches max HP: True Damage ▲ 30.97% 10s (all allies)         [F7]
//      ■ shield placed in front of self: Peace-of-Mind allies ATK ▲ 45.12% of caster 10s    [F6]
//   BU ■ all allies: Restores HP = 10.45% of caster final Max HP                            [F3] (recovery event)
//      ■ all allies: True Damage ▲ 42.39% for 10 sec                                        [F2] (flavor-gated)
//      ■ all allies: ATK ▲ 85.86% of the skill user's ATK for 10 sec                        [F1] (caster-scaled, load-bearing)
//
// THE S2 CHAIN — why an "HP-gated" slot is deterministically live in a no-HP-pool sim (owner ruling
// 2026-08-03). Flora self-procs her own S2 through her S1, with no boss damage and no HP pool needed:
//   1. Entering Burst Stage 2, S1 grants Peace-of-Mind allies Max HP ▲15.01% of Flora's max HP
//      "(without restoring HP)" for 2 sec. Current HP does NOT rise with max HP, so each affected
//      ally's HP FRACTION drops instantly to 1/1.1501 = 86.95% — below 90%.
//   2. That satisfies S2-1 ("HP of an adjacent ally drops to 90% or below") ⇒ the shield lands
//      immediately at Burst Stage 2 entry.
//   3. The shield landing on Flora satisfies S2-3 ("a shield is placed in front of this unit") ⇒ the
//      45.12%-of-caster-ATK team buff, same frame.
//   4. 2 sec later the Max HP grant expires, allies return to their normal max HP and are therefore
//      at max HP ⇒ S2-2 ("either adjacent ally reaches max HP") fires at entry + 2s.
// So `stageEnter{stage:2}` is a DERIVED-DETERMINISTIC PROXY for the HP-threshold clause, not a
// re-triggering of the kit line: the HP transition it stands in for is caused by Flora's own S1 on
// exactly that frame, every rotation, in every team. Step 4's 2-second offset is the reason
// `Block.delaySec` exists (scripts/tests/engine/block-delay.test.ts) — Full Burst opens ~0.87s after
// Burst Stage 2 entry (30f B2→B3 + 22f B3→FB), so a 10s buff starting at +0s vs +2s covers a
// materially different slice of the Full Burst window.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   F1  casterAtkPct (85.86% of FLORA's ATK, resolved to a FLAT add identical for every ally) vs a
//       generic atkPct (85.86% of each target's OWN ATK). Proven two ways: the shipped buffApply
//       value is the flat resolution (0.8586 × Flora.staticAtk, a large number, identical across all
//       four targets), AND swapping the stat to atkPct MOVES the carry's total (Flora's ATK ≠ the
//       carry's, so the two scalings cannot coincide). Removing the buff entirely drops the carry.
//   F2  trueDamagePct is FLAVOR-GATED (sim.ts:1430): it benefits ONLY true-flavored damage. Proven
//       by contrast — removing it moves ada (true-flavored Flash Grenade dot) but leaves liter,
//       crown and flora BYTE-IDENTICAL (none deal true damage). An unscoped Damage-Up buff would
//       move every unit; the byte-identity of the three non-true units is the discriminator.
//   F3  the burst heal is a RECOVERY EVENT, not a number: with crown's own self-heal and Flora's
//       HoT both removed, crown's "when recovery takes effect" consumer fires exactly once per
//       Flora burst cast, aligned to the burst-cast frames — a cadence no other source produces.
//   F4  the S1 HoT keeps recovery consumers refreshed at ~1s cadence: with crown's self-heal
//       removed, crown's consumer fires on ~every second of the fight; removing the HoT collapses
//       that to the burst-heal-only count (the F3 cadence), isolating the HoT's contribution.
//   F5  the shield has no observable of its own (no HP pool, no shield event kind), so it is pinned
//       through the consumer it is the SOLE cause of in this fixture: deleting ONLY the S2-1 shield
//       block removes every S2-3 ATK application. That discriminates the real chain (stage-2 →
//       shield → shielded → ATK) from the nearest wrong model, an ATK buff keyed straight off
//       `stageEnter` — which would be unmoved by deleting the shield.
//   F6  S2-3 targets "all allies in the Peace of Mind state" = S1's `selfAndAdjacent` set, NOT "all
//       allies" (which is what S2-1 and S2-2 say). The second fixture puts Flora in SLOT 1 so the two
//       target clauses resolve to DIFFERENT sets — 3 units vs 4 — and the assertion is the exact
//       target index set. With Flora mid-team the two are indistinguishable and the test would gate
//       nothing. Magnitude is the caster-scaled flat add (45.12% of FLORA's ATK), distinct in value
//       from her burst's 85.86% line, so the two never alias.
//   F7  S2-2 lands 2 SECONDS AFTER Burst Stage 2 entry (the Max HP grant's expiry is what puts the
//       allies back at max HP). The assertion is that every 30.97% application sits exactly 120
//       frames after a stage-2 cast frame and on NO stage-2 cast frame — which fails under the naive
//       same-frame encoding. The counterfactual runs that same-frame model and shows both the frames
//       and the carry's total move, so the delay is not cosmetic.
//   F8  stripping the whole S2 slot (what the model shipped before this chain was understood) drops
//       the true-damage carry — the slot is load-bearing, not decorative.
//
// Fixture: liter (B1) / flora (B2) / crown (B2) / ada (B3), boss Fire, focus ada. crown is the
// canonical recovery consumer (crown.test.ts / helm.test.ts pattern) and sits adjacent to flora
// (slot 2 ↔ slot 1) so Flora's selfAndAdjacent HoT reaches her; ada is the true-damage carry (her
// S2 Flash Grenade dot is flavor:'true') that makes the F2 flavor gate observable. The two B2s
// (flora/crown, both cd40) alternate casts deterministically — Flora casts 5 bursts in 180s.
// Deterministic (no seed); assertions read the event log + per-unit totals.
//
// SECOND FIXTURE (F5–F8 only): flora (slot 1) / liter (slot 2) / ada (slot 3) / `helm` (slot 4 —
// the SR/Water Helm, NOT `helm-aquamarine`), boss Fire, focus ada. Flora sits at the LEFT EDGE,
// which is what separates "all allies in the Peace of Mind state" (`selfAndAdjacent` → slots 1–3)
// from "all allies" (all four) — the fixture above puts her in the middle and collapses the two.
// crown is deliberately absent from it: she is herself a shielder, and Flora's S2-3 fires on ANY
// shield placed in front of her, so crown's shields would confound the S2-1 → S2-3 isolation.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const SLUGS = ['liter', 'flora', 'crown', 'ada'] as const;
const LITER = 0;
const FLORA = 1;
const CROWN = 2;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [...SLUGS],
    bossElement: 'Fire',
    focusSlug: 'ada',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res), res };
}

// F5-F8 fixture: `flora` at the LEFT EDGE, so her `selfAndAdjacent` Peace-of-Mind set (slots 1-3
// => indices 0,1,2) is a STRICT SUBSET of "all allies" and the two target clauses in her S2 are
// separable. `helm` is the SR/Water Helm, NOT `helm-aquamarine`.
// crown is deliberately ABSENT here: her own kit emits a shield, which faithfully fires Flora's
// `shielded` trigger too ("when a shield is placed in front of this unit" names no source), so with
// crown in the comp the S2-1 → S2-3 isolation cannot be read. Every unit in this fixture is a
// non-shielder, making Flora's own S2-1 the only shield source.
const WIDE_SLUGS = ['flora', 'liter', 'ada', 'helm'] as const;
const W_FLORA = 0;

function runWide(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [...WIDE_SLUGS],
    bossElement: 'Fire',
    focusSlug: 'ada',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res), res };
}

// ---- counterfactual / isolation patches -------------------------------------------------------
const hasHeal = (b: any) => b.effects.some((e: any) => e.kind === 'heal');

// Flora's burst is ONE block carrying three effects (heal + trueDamagePct + casterAtkPct), so the
// per-line counterfactuals strip the single named EFFECT from within the block — filtering whole
// blocks would take the other two effects down with it and pollute the isolation.
const stripBurstEffect = (slug: string, stat: string) =>
  withPatchedOverride(slug, (ov) => {
    for (const b of ov.burst) {
      const before = b.effects.length;
      b.effects = b.effects.filter((e: any) => e.stat !== stat);
      if (b.effects.length !== before) {
        return;
      }
    }
    throw new Error(`flora burst ${stat} effect missing — fixture is stale`);
  });
/** F1 reference: Flora's burst ATK line removed (heal + trueDamagePct kept). */
const floraNoBurstAtk = stripBurstEffect('flora', 'casterAtkPct');
/** F1 counterfactual: the same line as a GENERIC (target-own-ATK) atkPct buff. */
const floraBurstAtkSelf = withPatchedOverride('flora', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'casterAtkPct');
  if (!e) {
    throw new Error(
      'flora burst casterAtkPct effect missing — fixture is stale'
    );
  }
  e.stat = 'atkPct';
});
/** F2 reference: Flora's burst True Damage line removed (heal + casterAtkPct kept). */
const floraNoBurstTrueDmg = stripBurstEffect('flora', 'trueDamagePct');
/** F4 isolation: remove crown's OWN Relax self-heal so Flora is the only recovery source. */
const crownNoSelfHeal = withPatchedOverride('crown', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasHeal(b));
  if (ov.skill2.length === before) {
    throw new Error('crown S2 self-heal block missing — fixture is stale');
  }
});
/** F3 isolation: also remove Flora's S1 HoT, leaving ONLY the burst heal as a recovery source. */
const floraNoHoT = withPatchedOverride('flora', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasHeal(b));
  if (ov.skill1.length === before) {
    throw new Error('flora S1 HoT block missing — fixture is stale');
  }
});

// ---- S2-chain patches (5-unit fixture) ---------------------------------------------------------
/** F5 counterfactual: Flora's S2-1 shield block removed; S2-2/S2-3 untouched. */
const floraNoShield = withPatchedOverride('flora', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'shield')
  );
  if (ov.skill2.length === before) {
    throw new Error('flora S2 shield block missing — fixture is stale');
  }
});
/** F7 counterfactual: the naive same-frame encoding of S2-2 (block delay stripped). */
const floraNoDelay = withPatchedOverride('flora', (ov) => {
  const b = ov.skill2.find((x: any) => x.delaySec != null);
  if (!b) {
    throw new Error('flora S2 delaySec block missing — fixture is stale');
  }
  delete b.delaySec;
});
/** F8 counterfactual: the whole S2 slot removed. */
const floraNoS2 = withPatchedOverride('flora', (ov) => {
  if (ov.skill2.length === 0) {
    throw new Error('flora S2 is empty — fixture is stale');
  }
  ov.skill2 = [];
});

// ---- addStack isolation (S1 hitCount:100) ------------------------------------------------------
/** Dummy stackable self buff for Flora (Electric) so her S1 addStack has a target to increment. */
const floraDummyStackSelf = withPatchedOverride('flora', (ov) => {
  ov.skill1.unshift({
    slot: 'skill1',
    trigger: { kind: 'passive' },
    target: { kind: 'self' },
    effects: [
      {
        kind: 'buff',
        stat: 'critRatePct',
        value: 10,
        maxStacks: 10,
        durationSec: 180,
      },
    ],
  });
});
/** Dummy stackable self buff for crown (Iron) to prove addStack ignores non-Electric allies. */
const crownDummyStackSelf = withPatchedOverride('crown', (ov) => {
  ov.skill1.unshift({
    slot: 'skill1',
    trigger: { kind: 'passive' },
    target: { kind: 'self' },
    effects: [
      {
        kind: 'buff',
        stat: 'critRatePct',
        value: 10,
        maxStacks: 10,
        durationSec: 180,
      },
    ],
  });
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noBurstAtk = run({ flora: floraNoBurstAtk });
const burstAtkSelf = run({ flora: floraBurstAtkSelf });
const noBurstTrueDmg = run({ flora: floraNoBurstTrueDmg });
const isoHoT = run({ crown: crownNoSelfHeal });
const isoBurstHeal = run({ crown: crownNoSelfHeal, flora: floraNoHoT });
const wide = runWide();
const noShield = runWide({ flora: floraNoShield });
const noDelay = runWide({ flora: floraNoDelay });
const noS2 = runWide({ flora: floraNoS2 });
const stackRun = run({
  flora: floraDummyStackSelf,
  crown: crownDummyStackSelf,
});

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const floraBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'flora'
  );
/** Frames crown's recovery consumer fired (+20.99% Attack Damage), deduped per frame. */
const crownRecoveryFrames = (evs: SimEvent[]): number[] =>
  [
    ...new Set(
      buffs(evs)
        .filter(
          (b) =>
            b.casterIdx === CROWN &&
            b.stat === 'attackDamagePct' &&
            Math.abs(b.value - 20.99) < 0.01
        )
        .map((b) => b.frame)
    ),
  ].sort((a, b) => a - b);

describe('flora — kit spec', () => {
  describe("F1 — burst ATK ▲ 85.86% of FLORA's ATK (caster-scaled flat add) to all allies, 10s", () => {
    const floraStaticAtk = unitOf(base.res, 'flora').staticAtk;
    // Flora casts casterAtkPct from TWO kit lines (burst 85.86%, S2-3 45.12%). They resolve to
    // different flat adds, so the value is what separates the two lines in the log.
    const applied = buffs(base.events).filter(
      (b) =>
        b.casterIdx === FLORA &&
        b.stat === 'casterAtkPct' &&
        Math.abs(b.value - (85.86 / 100) * floraStaticAtk) < 1e-6
    );

    it("is the flat resolution of 85.86% of Flora's static ATK, identical for every ally", () => {
      expect(
        applied.length,
        'no burst casterAtkPct buff was applied'
      ).toBeGreaterThan(0);
      const expected = (85.86 / 100) * floraStaticAtk;
      for (const b of applied) {
        expect(b.value).toBeCloseTo(expected, 3);
      }
      // Caster-scaled => the SAME flat add lands on every target (not % of each target's own ATK).
      expect([...new Set(applied.map((b) => b.targetIdx))].sort()).toEqual([
        LITER,
        FLORA,
        CROWN,
        3,
      ]);
      expect(
        new Set(applied.map((b) => b.value)).size,
        'flat add must be identical across targets'
      ).toBe(1);
    });

    it('reaches all four allies for exactly 10 sec per burst cast', () => {
      expect(applied.length).toBe(floraBursts(base.events).length * 4);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('DISCRIMINATING: a generic atkPct (target-own-ATK) moves the carry differently', () => {
      // Flora's ATK ≠ ada's, so caster-scaled flat add ≠ 85.86% of ada's own ATK.
      expect(base.totals.ada).not.toBeCloseTo(burstAtkSelf.totals.ada, 0);
    });

    it('removing the buff drops the carry (the buff is live, not inert)', () => {
      expect(base.totals.ada).toBeGreaterThan(noBurstAtk.totals.ada);
    });
  });

  describe('F2 — burst True Damage ▲ 42.39% to all allies, 10s, FLAVOR-GATED to true damage', () => {
    // Filtered by value: Flora's S2-2 casts trueDamagePct too (30.97%), from a different kit line.
    const applied = buffs(base.events).filter(
      (b) =>
        b.casterIdx === FLORA &&
        b.stat === 'trueDamagePct' &&
        Math.abs(b.value - 42.39) < 1e-9
    );

    it('is 42.39% for 10 sec, reaching all four allies per burst cast', () => {
      expect(applied.length).toBe(floraBursts(base.events).length * 4);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([42.39]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('moves ada (true-flavored grenades) when removed', () => {
      expect(base.totals.ada).not.toBeCloseTo(noBurstTrueDmg.totals.ada, 0);
    });

    it('DISCRIMINATING: leaves every non-true-damage unit BYTE-IDENTICAL (the flavor gate)', () => {
      // liter / crown / flora deal no true damage, so an inert trueDamagePct must not move them.
      expect(base.totals.liter).toBe(noBurstTrueDmg.totals.liter);
      expect(base.totals.crown).toBe(noBurstTrueDmg.totals.crown);
      expect(base.totals.flora).toBe(noBurstTrueDmg.totals.flora);
    });
  });

  describe("F3 — burst heal emits a recovery event to all allies (drives crown's consumer)", () => {
    // Isolated: crown's own self-heal AND Flora's HoT removed, so the burst heal is the ONLY
    // recovery source. Crown's +20.99% consumer must fire exactly once per Flora burst cast.
    const bursts = floraBursts(isoBurstHeal.events);
    const frames = crownRecoveryFrames(isoBurstHeal.events);

    it('has Flora bursts to measure', () => {
      expect(bursts.length).toBeGreaterThan(0);
    });

    it("fires crown's recovery consumer once per Flora burst, aligned to the cast frames", () => {
      const burstFrames = bursts.map((b) => b.frame);
      expect(
        frames.length,
        `${frames.length} recovery firings vs ${burstFrames.length} Flora bursts`
      ).toBe(burstFrames.length);
      for (const f of burstFrames) {
        expect(
          frames,
          `no recovery firing at Flora burst frame ${f}`
        ).toContain(f);
      }
    });
  });

  describe('F4 — S1 Peace-of-Mind HoT keeps recovery consumers refreshed at ~1s cadence', () => {
    // Isolated: crown's self-heal removed, Flora's HoT live. Crown is adjacent to Flora (slot 2 ↔
    // slot 1) so the selfAndAdjacent HoT reaches her every second.
    const FIGHT_SEC = 180;
    const hotFrames = crownRecoveryFrames(isoHoT.events).length;
    const burstOnlyFrames = crownRecoveryFrames(isoBurstHeal.events).length;

    it("fires crown's consumer on ~every second of the fight (near-permanent)", () => {
      expect(
        hotFrames,
        `${hotFrames} distinct recovery frames over ${FIGHT_SEC}s — a 1s HoT yields ~${FIGHT_SEC}`
      ).toBeGreaterThanOrEqual(Math.floor(FIGHT_SEC * 0.8));
    });

    it('DISCRIMINATING: removing the HoT collapses the cadence to burst-heal-only', () => {
      expect(hotFrames).toBeGreaterThan(burstOnlyFrames * 3);
    });
  });

  describe('F9 — S1 after 100 normal attacks: +1 stack to all Electric allies’ stackable buffs', () => {
    const dummyStackEvents = (casterIdx: number, targetIdx: number) =>
      buffs(stackRun.events).filter(
        (b) =>
          b.casterIdx === casterIdx &&
          b.targetIdx === targetIdx &&
          b.stat === 'critRatePct' &&
          b.value === 10
      );

    it('addStack fires on Flora (Electric) and increments the dummy stack above 1', () => {
      const evs = dummyStackEvents(FLORA, FLORA);
      expect(evs.length).toBeGreaterThan(0);
      expect(Math.max(...evs.map((b) => b.stacks))).toBeGreaterThan(1);
    });

    it('only refreshes the Electric ally; crown (Iron) dummy stacks stay at 1', () => {
      const floraRefreshes = dummyStackEvents(FLORA, FLORA).filter(
        (b) => b.refresh
      );
      const crownEvs = dummyStackEvents(CROWN, CROWN);
      expect(floraRefreshes.length).toBeGreaterThan(0);
      expect(crownEvs.length).toBeGreaterThan(0);
      expect(Math.max(...crownEvs.map((b) => b.stacks))).toBe(1);
    });

    it('fires at roughly the hitCount:100 cadence (multiple times per fight)', () => {
      const refreshes = dummyStackEvents(FLORA, FLORA).filter(
        (b) => b.refresh
      ).length;
      expect(refreshes).toBeGreaterThanOrEqual(3);
    });
  });

  // ---- S2 chain (F5–F8) — the 5-unit, Flora-at-the-left-edge fixture ---------------------------
  describe('S2 chain — self-procced off S1 at Burst Stage 2 entry', () => {
    // Stage-2 ENTRY frames (owner ruling 2026-08-13): the chain enters Burst Stage 2 the moment a
    // stage-1 burst is cast, ~30f before any B2 casts there — and it enters on every rotation that
    // reaches stage 1, including those whose chain later expires before a B2 is ready.
    const stage2Frames = [
      ...new Set(
        wide.events
          .filter(
            (e): e is BurstCast => e.kind === 'burstCast' && e.stage === 1
          )
          .map((e) => e.frame)
      ),
    ].sort((a, b) => a - b);
    const floraStaticAtk = unitOf(wide.res, 'flora').staticAtk;
    const S2_ATK = (45.12 / 100) * floraStaticAtk;

    const s2AtkApplies = (evs: SimEvent[]) =>
      buffs(evs).filter(
        (b) =>
          b.casterIdx === W_FLORA &&
          b.stat === 'casterAtkPct' &&
          Math.abs(b.value - S2_ATK) < 1e-6
      );
    const s2TrueApplies = (evs: SimEvent[]) =>
      buffs(evs).filter(
        (b) =>
          b.casterIdx === W_FLORA &&
          b.stat === 'trueDamagePct' &&
          Math.abs(b.value - 30.97) < 1e-9
      );

    it('has Burst Stage 2 entries to measure', () => {
      expect(stage2Frames.length).toBeGreaterThan(2);
    });

    describe('F5 — S2-1 shield fires at every Burst Stage 2 entry', () => {
      it('drives the S2-3 chain on exactly the stage-2 entry frames', () => {
        const frames = [
          ...new Set(s2AtkApplies(wide.events).map((b) => b.frame)),
        ].sort((a, b) => a - b);
        expect(frames).toEqual(stage2Frames);
      });

      it('DISCRIMINATING: deleting ONLY the shield block kills the whole S2-3 ATK buff', () => {
        // The nearest wrong model — S2-3 keyed straight off `stageEnter` — would be unmoved.
        expect(s2AtkApplies(wide.events).length).toBeGreaterThan(0);
        expect(s2AtkApplies(noShield.events).length).toBe(0);
        expect(noShield.totals.ada).toBeLessThan(wide.totals.ada);
      });

      it("does NOT touch the True Damage line (it is not the shield's consumer)", () => {
        expect(s2TrueApplies(noShield.events).length).toBe(
          s2TrueApplies(wide.events).length
        );
      });
    });

    describe("F6 — S2-3 ATK ▲45.12% of FLORA's ATK to the Peace of Mind state only, 10s", () => {
      const applied = s2AtkApplies(wide.events);

      it('is the caster-scaled flat add, identical on every target', () => {
        expect(applied.length).toBeGreaterThan(0);
        for (const b of applied) {
          expect(b.value).toBeCloseTo(S2_ATK, 3);
        }
        expect(new Set(applied.map((b) => b.value)).size).toBe(1);
      });

      it('DISCRIMINATING: reaches the selfAndAdjacent set (slots 1-3), NOT all four allies', () => {
        expect([...new Set(applied.map((b) => b.targetIdx))].sort()).toEqual([
          0, 1, 2,
        ]);
        expect(applied.length).toBe(stage2Frames.length * 3);
      });

      it('lasts exactly 10 sec', () => {
        for (const b of applied) {
          expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
        }
      });
    });

    describe('F7 — S2-2 True Damage ▲30.97% to ALL allies, 10s, at stage-2 entry + 2 sec', () => {
      const applied = s2TrueApplies(wide.events);
      const TOTAL_FRAMES = 180 * FPS;
      const due = stage2Frames.filter((f) => f + 2 * FPS < TOTAL_FRAMES);

      it('reaches ALL allies (a different target clause from S2-3)', () => {
        expect([...new Set(applied.map((b) => b.targetIdx))].sort()).toEqual([
          0, 1, 2, 3,
        ]);
        expect(applied.length).toBe(due.length * 4);
        for (const b of applied) {
          expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
        }
      });

      it('DISCRIMINATING: every application is 120 frames AFTER a stage-2 entry, on NO entry frame', () => {
        const frames = [...new Set(applied.map((b) => b.frame))].sort(
          (a, b) => a - b
        );
        expect(frames).toEqual(due.map((f) => f + 2 * FPS));
        for (const f of frames) {
          expect(
            stage2Frames,
            `True Damage landed ON the stage-2 entry frame ${f} — the delay is not modeled`
          ).not.toContain(f);
        }
      });

      it('DISCRIMINATING: the same-frame model moves both the frames and the carry', () => {
        const naiveFrames = [
          ...new Set(s2TrueApplies(noDelay.events).map((b) => b.frame)),
        ].sort((a, b) => a - b);
        expect(naiveFrames).toEqual(stage2Frames);
        expect(noDelay.totals.ada).not.toBe(wide.totals.ada);
      });
    });

    describe('F8 — the S2 slot is load-bearing', () => {
      it('stripping all of S2 drops the true-damage carry', () => {
        expect(noS2.totals.ada).toBeLessThan(wide.totals.ada);
      });
    });
  });
});
