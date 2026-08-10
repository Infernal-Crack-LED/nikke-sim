// PER-UNIT KIT SPEC — `viper` (Viper (Treasure), Attacker/SG/Water, Burst II, cd 20s, ammo 9,
// hitsPerShot 10). Kit-autonomy gauntlet 2026-08-01; test-first re-derivation from the blablalink
// TREASURE prose (data/characters.json → characters.viper.skills — the authoritative favorite-item
// SSOT, DECISIONS 2026-07-17).
//
// One assertion group per KIT LINE (V1..V8 below), asserted against the SHIPPED override loaded from
// disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model each
// assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink treasure prose, characters.viper.skills):
//   S1 ■ stage target appears → all allies: ATK ▲25.98% / Hit Rate ▲11.13% for 10 sec        [V1]
//      ■ attacking in Vamp status → self: Sustained Damage ▲4.4% / Hit Rate ▲1.84%, ×10, 10s  [V2]
//   S2 ■ self: Hit Rate ▲21.96% continuously                                                  [V3]
//      ■ entering Full Burst → self: Vamp (no single-target) + Invulnerable 1 sec  DEFENSIVE   [V8 unmodeled]
//      ■ using Burst Skill → all allies: Re-enters Burst Stage 2                  META-DEFINING [V4]
//   BU ■ 1 designated enemy: 1029.6% of final ATK as damage                                   [V5]
//      ■ stage target: DEF ▼19.83% for 10 sec                                     INERT        [V7 unmodeled]
//      ■ stage target: 105.3% of final ATK as sustained damage every 1 sec for 10 sec          [V6]
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   V1  a SELF-only reading of the stage-start buff would leave the other three allies cold; the
//       shipped line targets ALL ALLIES. Proven by asserting the buff reaches four distinct holders
//       (incl. non-viper allies) at frame 0 for exactly 10s, and that removing the line deletes it.
//   V2  the stacks are GATED to the Vamp status = the Full-Burst window (fbGate:'inFb'). Without the
//       gate they would accrue from battle start; proven by first-apply frame landing AFTER FB entry
//       (shipped) vs BEFORE it (gate-removed counterfactual). sustainedDamagePct is load-bearing: it
//       feeds the sustained-flavored burst DoT (sim.ts:1688), so removing the line drops FB DoT ticks.
//   V3  the continuous self Hit Rate is a distinct line from the two V1/V2 hit-rate grants; pinned by
//       value 21.96 / self / no expiry, and live via the hrCoreMult core-hit lift (⚑ derived).
//   V4  Re-enters Burst Stage 2 is her IDENTITY: after her B2 cast the stage HOLDS so a second B2
//       (crown) casts in the same chain, exactly one STAGE_CAST_GAP (30f) later (Tia T6 pattern).
//       Removed, the stage advances after her and crown gets no chain-1 B2 window.
//   V5  the nuke is the TREASURE prose 1029.6%, NOT the untreasured datamine-table 462.85% (same
//       prose-vs-base split as helm 8236.8 vs 1237.5). A B2 cast lands BEFORE Full Burst opens, so it
//       must never take the +50% major (verified fbMajorApplied=false).
//   V6  the sustained damage is a 10-tick DoT (1/s for 10s), sustained-flavored — proven per-cast tick
//       count for casts whose window fits the fight, and by the V2 coupling (FB ticks shrink without
//       her sustainedDamagePct stacks).
//   V7  DEF ▼ is INERT (enemy DEF is a negligible flat subtractive term at scope-lock; the engine drops
//       enemy DEF debuffs, docs/data/damage-calculation.md). The nearest-wrong model — encoding it as a
//       damageTakenPct team vuln — would over-credit ~19.83% team damage the kit does NOT deliver. Pinned
//       structurally: NO damageTakenPct block, and the line sits VERBATIM in unmodeled.burst.
//   V8  Vamp/invulnerable is DEFENSIVE (no HP pool / targeting / boss damage in v1). Pinned structurally:
//       no shield/invulnerable block, line VERBATIM in unmodeled.skill2; only its offensive GATE (V2's
//       FB window) is modeled.
//
// Fixture: viper is Burst II, so she needs a B1 + a B3 to complete a chain AND a partner B2 for her
// re-entry to be observable. Comp = liter(B1) / viper(B2) / crown(B2) / helm(B3), boss Fire (viper is
// Water → clean ×1.10 advantage, constant across base/counterfactual), focus viper. Viper is the
// LEFTMOST B2, so she wins the stage-2 tie and casts first every chain (probe: viper B2 f251 → crown B2
// f281 re-entry → helm B3 f311); her re-entry is what lets crown cast too. Deterministic (no seed);
// assertions read the event log, not totals, except where a load-bearing coupling needs a damage delta.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const FIGHT_FRAMES = 180 * FPS;
/** comp slot order: liter 0 / viper 1 / crown 2 / helm 3. */
const VIPER = 1;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

const FIX = {
  slugs: ['liter', 'viper', 'crown', 'helm'],
  bossElement: 'Fire' as const,
  focusSlug: 'viper',
};

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...FIX,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual / nearest-wrong patches --------------------------------------------------
const hasStat = (b: any, stat: string, value?: number) =>
  b.effects.some(
    (e: any) => e.stat === stat && (value === undefined || e.value === value)
  );

/** V1 reference: the stage-start team ATK/Hit-Rate line removed. */
const viperNoS1a = withPatchedOverride('viper', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'atkPct', 25.98));
  if (ov.skill1.length === before) {
    throw new Error('viper S1a atkPct 25.98 block missing — fixture stale');
  }
});
/** V2 reference: the Vamp-gated self sustained/hit-rate stacker removed. */
const viperNoS1b = withPatchedOverride('viper', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'sustainedDamagePct'));
  if (ov.skill1.length === before) {
    throw new Error(
      'viper S1b sustainedDamagePct block missing — fixture stale'
    );
  }
});
/** V2 counterfactual: the same stacker with the Vamp (FB) gate removed — accrues from battle start. */
const viperNoFbGate = withPatchedOverride('viper', (ov) => {
  const b = ov.skill1.find((x: any) => hasStat(x, 'sustainedDamagePct'));
  if (!b) {
    throw new Error(
      'viper S1b sustainedDamagePct block missing — fixture stale'
    );
  }
  delete b.fbGate;
});
/** V3 reference: the continuous self Hit-Rate line removed. */
const viperNoS2a = withPatchedOverride('viper', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'hitRatePct', 21.96));
  if (ov.skill2.length === before) {
    throw new Error('viper S2a hitRatePct 21.96 block missing — fixture stale');
  }
});
/** V4 reference: the burst re-entry line removed (stage advances after her). */
const viperNoReenter = withPatchedOverride('viper', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'reenterStage')
  );
  if (ov.skill2.length === before) {
    throw new Error('viper reenterStage block missing — fixture stale');
  }
});
/** V5 counterfactual: the nuke at the UNTREASURED datamine-table value (462.85) instead of treasure 1029.6. */
const viperBaseNuke = withPatchedOverride('viper', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'flatDamage' && x.atkPct === 1029.6);
  if (!e) {
    throw new Error('viper burst nuke 1029.6 missing — fixture stale');
  }
  e.atkPct = 462.85;
});
/** V6 reference: the sustained-damage DoT removed. */
const viperNoDot = withPatchedOverride('viper', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'dot')
  );
  if (ov.burst.length === before) {
    throw new Error('viper burst dot block missing — fixture stale');
  }
});

// ---- runs (hoisted: each is a full 180s sim) -------------------------------------------------
const base = run();
const noS1a = run({ viper: viperNoS1a });
const noS1b = run({ viper: viperNoS1b });
const noFbGate = run({ viper: viperNoFbGate });
const noS2a = run({ viper: viperNoS2a });
const baseNuke = run({ viper: viperBaseNuke });
const noDot = run({ viper: viperNoDot });

// ---- readers ---------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const casts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast');
const viperCasts = (evs: SimEvent[]) =>
  casts(evs).filter((c) => c.slug === 'viper');
const viperDmg = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'viper');
/** viper's burst-bucket hits split by kit line: the nuke (any magnitude ≠ the DoT's 105.3) vs the
 * 105.3 sustained DoT ticks. Value-agnostic on the nuke so the base-value counterfactual is readable. */
const nukes = (evs: SimEvent[]) =>
  viperDmg(evs).filter((d) => d.srcSlot === 'burst' && d.atkPct !== 105.3);
const dotTicks = (evs: SimEvent[]) =>
  viperDmg(evs).filter((d) => d.srcSlot === 'burst' && d.atkPct === 105.3);
/** First Full-Burst opening = helm's first stage-3 cast (helm is the comp's sole B3). */
const firstFbFrame = (evs: SimEvent[]) =>
  casts(evs).find((c) => c.slug === 'helm' && c.stage === 3)?.frame ?? Infinity;

describe('viper (Treasure) — kit spec', () => {
  describe('V1 — S1 stage-start team ATK + Hit Rate (all allies, 10 sec)', () => {
    const atkApplies = buffs(base.events).filter(
      (b) => b.casterIdx === VIPER && b.stat === 'atkPct' && b.value === 25.98
    );
    const hrApplies = buffs(base.events).filter(
      (b) =>
        b.casterIdx === VIPER && b.stat === 'hitRatePct' && b.value === 11.13
    );

    it('grants ATK ▲25.98% to ALL FOUR allies at battle start, for exactly 10 sec', () => {
      expect(atkApplies.length).toBeGreaterThan(0);
      expect([...new Set(atkApplies.map((b) => b.targetIdx))].sort()).toEqual([
        0, 1, 2, 3,
      ]);
      for (const b of atkApplies) {
        expect(b.frame, 'stage-start buff must apply at t=0').toBe(0);
        expect(b.expiresFrame! - b.frame, '10 sec window').toBe(10 * FPS);
      }
    });

    it('grants the matching Hit Rate ▲11.13% to all four allies on the same window', () => {
      expect([...new Set(hrApplies.map((b) => b.targetIdx))].sort()).toEqual([
        0, 1, 2, 3,
      ]);
      for (const b of hrApplies) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('DISCRIMINATING: removing the line deletes the team buff (it is live, not inert)', () => {
      const gone = buffs(noS1a.events).filter(
        (b) => b.casterIdx === VIPER && b.stat === 'atkPct' && b.value === 25.98
      );
      expect(gone).toEqual([]);
    });
  });

  describe('V2 — S1 Vamp-gated self Sustained Damage + Hit Rate stacks (×10, FB window)', () => {
    const sdApplies = buffs(base.events).filter(
      (b) => b.casterIdx === VIPER && b.stat === 'sustainedDamagePct'
    );
    const hrApplies = buffs(base.events).filter(
      (b) =>
        b.casterIdx === VIPER && b.stat === 'hitRatePct' && b.value === 1.84
    );

    it('is Sustained Damage ▲4.4% / Hit Rate ▲1.84%, self-scoped, stacking to 10', () => {
      expect([...new Set(sdApplies.map((b) => b.value))]).toEqual([4.4]);
      expect([...new Set(sdApplies.map((b) => b.maxStacks))]).toEqual([10]);
      expect([...new Set(sdApplies.map((b) => b.targetIdx))]).toEqual([VIPER]);
      expect(
        Math.max(...sdApplies.map((b) => b.stacks)),
        'ramps to the 10-stack cap'
      ).toBe(10);
      expect([...new Set(hrApplies.map((b) => b.value))]).toEqual([1.84]);
      expect([...new Set(hrApplies.map((b) => b.maxStacks))]).toEqual([10]);
    });

    it('is GATED to the Full-Burst (Vamp) window — first stack lands AFTER FB entry, not at battle start', () => {
      const fb = firstFbFrame(base.events);
      const firstApply = Math.min(...sdApplies.map((b) => b.frame));
      expect(
        firstApply,
        'Vamp gate: no stack before Full Burst'
      ).toBeGreaterThan(fb);
    });

    it('DISCRIMINATING: without the gate the stacks accrue from battle start (pre-FB)', () => {
      const fb = firstFbFrame(noFbGate.events);
      const ungated = buffs(noFbGate.events).filter(
        (b) => b.casterIdx === VIPER && b.stat === 'sustainedDamagePct'
      );
      const firstUngated = Math.min(...ungated.map((b) => b.frame));
      expect(
        firstUngated,
        'gate removed → a stack lands before FB entry'
      ).toBeLessThan(fb);
    });

    it('DISCRIMINATING: sustainedDamagePct is LOAD-BEARING — it feeds the sustained burst DoT in FB', () => {
      const fbDots = (evs: SimEvent[]) =>
        dotTicks(evs)
          .filter((d) => d.inFullBurst)
          .reduce((s, d) => s + d.amount, 0);
      expect(
        fbDots(base.events),
        'FB DoT ticks lose the sustainedDamagePct boost without S1b'
      ).toBeGreaterThan(fbDots(noS1b.events));
    });
  });

  describe('V3 — S2 continuous self Hit Rate ▲21.96%', () => {
    const applies = buffs(base.events).filter(
      (b) =>
        b.casterIdx === VIPER && b.stat === 'hitRatePct' && b.value === 21.96
    );

    it('is 21.96%, self-scoped, with NO expiry (continuous)', () => {
      expect(applies.length).toBeGreaterThan(0);
      expect([...new Set(applies.map((b) => b.targetIdx))]).toEqual([VIPER]);
      expect([...new Set(applies.map((b) => b.expiresFrame))]).toEqual([null]);
    });

    it('DISCRIMINATING: removing the line deletes the 21.96 buff (distinct from the V1/V2 hit-rate grants)', () => {
      const gone = buffs(noS2a.events).filter(
        (b) =>
          b.casterIdx === VIPER && b.stat === 'hitRatePct' && b.value === 21.96
      );
      expect(gone).toEqual([]);
      // the other two hit-rate lines survive (this is a distinct line, not a shared block)
      expect(
        buffs(noS2a.events).some(
          (b) =>
            b.casterIdx === VIPER &&
            b.stat === 'hitRatePct' &&
            b.value === 11.13
        )
      ).toBe(true);
    });
  });

  describe('V4 — S2 Re-enters Burst Stage 2 (meta-defining B2 re-entry)', () => {
    // The chain-1 anatomy: the B2 casts that land before the first B3 (helm) opens Full Burst.
    const chain1 = (overrides?: Record<string, any>) => {
      const evs = run(overrides).events;
      const viper1 = casts(evs).find((c) => c.slug === 'viper');
      const crown1 = casts(evs).find((c) => c.slug === 'crown');
      const helm1 = casts(evs).find((c) => c.slug === 'helm' && c.stage === 3);
      const b2BeforeHelm = casts(evs)
        .filter((c) => c.stage === 2 && helm1 && c.frame < helm1.frame)
        .map((c) => c.slug);
      return { viper1, crown1, helm1, b2BeforeHelm };
    };

    it('viper casts Stage 2, then re-entry lets crown cast Stage 2 one stage-gap later, before the B3', () => {
      const { viper1, crown1, helm1, b2BeforeHelm } = chain1();
      expect(viper1!.stage).toBe(2);
      expect(
        crown1,
        're-entry must let the partner B2 cast in chain 1'
      ).toBeDefined();
      expect(crown1!.stage).toBe(2);
      expect(helm1!.stage).toBe(3);
      expect(
        b2BeforeHelm,
        'both B2s cast before the B3 only with re-entry'
      ).toEqual(['viper', 'crown']);
      expect(
        crown1!.frame - viper1!.frame,
        'STAGE_CAST_GAP_FRAMES, no rng (unseeded)'
      ).toBe(30);
    });

    it('DISCRIMINATING: without re-entry only viper casts B2 in chain 1 (the stage advances after her)', () => {
      const { viper1, b2BeforeHelm } = chain1({ viper: viperNoReenter });
      expect(viper1).toBeDefined();
      expect(
        b2BeforeHelm,
        'crown loses the B2 tie once re-entry is removed'
      ).toEqual(['viper']);
    });
  });

  describe('V5 — burst nuke: 1029.6% of final ATK (TREASURE), cast BEFORE Full Burst', () => {
    it('fires once per burst cast at the TREASURE magnitude, in the burst bucket', () => {
      const n = nukes(base.events);
      expect(n.length).toBe(viperCasts(base.events).length);
      expect(n.length).toBeGreaterThan(0);
      expect([...new Set(n.map((d) => d.atkPct))]).toEqual([1029.6]);
      expect([...new Set(n.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the B2 cast lands before FB opens)', () => {
      expect(
        nukes(base.events)
          .filter((d) => d.fbMajorApplied)
          .map((d) => d.frame)
      ).toEqual([]);
    });

    it('DISCRIMINATING: the untreasured datamine-table value (462.85) is a different, wrong model', () => {
      expect([...new Set(nukes(baseNuke.events).map((d) => d.atkPct))]).toEqual(
        [462.85]
      );
      expect([...new Set(nukes(base.events).map((d) => d.atkPct))]).not.toEqual(
        [462.85]
      );
    });
  });

  describe('V6 — burst sustained damage: 105.3% of final ATK every 1 sec for 10 sec (stage target)', () => {
    it('is a 10-tick DoT per cast (for casts whose full 10s window fits the fight)', () => {
      const measurable = viperCasts(base.events).filter(
        (c) => c.frame + 10 * FPS <= FIGHT_FRAMES
      );
      expect(
        measurable.length,
        'no burst has a full 10s window inside the fight'
      ).toBeGreaterThan(0);
      for (const c of measurable) {
        const ticks = dotTicks(base.events).filter(
          (d) => d.frame > c.frame && d.frame <= c.frame + 10 * FPS
        );
        expect(
          ticks.length,
          `burst at f${c.frame} produced ${ticks.length} ticks, expected 10`
        ).toBe(10);
      }
    });

    it('DISCRIMINATING: removing the DoT deletes the 105.3 ticks', () => {
      expect(dotTicks(noDot.events)).toEqual([]);
      expect(dotTicks(base.events).length).toBeGreaterThan(0);
    });
  });

  describe('V7 — burst DEF ▼19.83% is INERT (not a damageTakenPct vuln) and recorded verbatim', () => {
    const ov: any = loadOverride('viper');

    it('is NOT modeled as a damageTakenPct block (the nearest-wrong over-credit)', () => {
      const all = [...ov.skill1, ...ov.skill2, ...ov.burst];
      const taken = all
        .flatMap((b: any) => b.effects)
        .filter((e: any) => e.stat === 'damageTakenPct');
      expect(taken, 'DEF▼ must not become a team damage-taken vuln').toEqual(
        []
      );
    });

    it('is ENCODED on the enemy defPct channel (2026-08-10): its own burstCast block, -19.83 for 10s', () => {
      const defBlocks = ov.burst.filter((b: any) =>
        b.effects.some((e: any) => e.stat === 'defPct')
      );
      expect(defBlocks.length).toBe(1);
      const b = defBlocks[0];
      expect(b.trigger.kind).toBe('burstCast');
      expect(b.target.kind).toBe('enemy');
      const e = b.effects.find((x: any) => x.stat === 'defPct');
      expect(e.value).toBe(-19.83);
      expect(e.durationSec).toBe(10);
      // and the line no longer sits in unmodeled — it is modeled, not silently dropped
      expect(
        ov.unmodeled.burst.some((s: string) => s.includes('DEF ▼ 19.83'))
      ).toBe(false);
    });

    it('DISCRIMINATING: a damageTakenPct model would change team totals; the inert model does not', () => {
      // sanity: the shipped fight carries no enemy damage-taken debuff event at all
      const bossVuln = buffs(base.events).filter(
        (b) => b.targetIdx === null && b.stat === 'damageTakenPct'
      );
      expect(bossVuln).toEqual([]);
    });
  });

  describe('V8 — S2 Vamp/Invulnerable is DEFENSIVE and recorded verbatim (only its offensive gate is modeled)', () => {
    const ov: any = loadOverride('viper');

    it('is NOT modeled as a shield/invulnerable block', () => {
      const all = [...ov.skill1, ...ov.skill2, ...ov.burst];
      const defensive = all
        .flatMap((b: any) => b.effects)
        .filter((e: any) => e.kind === 'shield');
      expect(
        defensive,
        'no HP pool / targeting model in v1 — Vamp/invulnerable moves nothing'
      ).toEqual([]);
    });

    it('sits VERBATIM in unmodeled.skill2 (no silent drop)', () => {
      expect(
        ov.unmodeled.skill2.some(
          (s: string) =>
            s.includes('Vamp') && s.includes('Invulnerable for 1 sec')
        )
      ).toBe(true);
    });
  });
});
