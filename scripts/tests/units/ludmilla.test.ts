// PER-UNIT KIT SPEC — `ludmilla` (Ludmilla, Defender/SMG/Water, Burst I, cd 20s, ammo 120,
// RoF 1440 (20 shots/s under the engine's default-ON SMG frame quantization), reloadFrames 187,
// hitsPerShot 1, SSR). Kit-autonomy gauntlet 2026-08-04; test-first re-derivation from kit
// prose.
//
// One assertion group per LOAD-BEARING kit line (L5, L6, L7 below); the remaining COVER
// lines (L2..L4) are UNMODELED and get a guard/discrimination group instead.
// `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model each
// assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.ludmilla.skills):
//   S1 ■ when the last bullet hits the target → the target:
//        DEF ▼8.4% for 10 sec                                                            [L1/L7 — modeled]
//        ATK ▼8.4% for 10 sec                                                            [L2 — UNMODELED]
//   S2 ■ entering Full Burst → all enemies:
//        Attract: Taunt all enemies for 15.09 sec                                        [L3 — UNMODELED]
//      ■ entering Full Burst → self:
//        Damage Taken ▼57.86% for 15 sec                                                 [L4 — UNMODELED]
//   BU ■ the 10 enemy unit(s) with the highest final ATK:
//        163.1% of final ATK as damage                                                   [L5 — modeled]
//      ■ when above 50% HP → all allies:
//        DEF ▲12.93% for 10 sec                                                          [L6 — modeled]
//
// Dispositions:
//   L1  Enemy DEF▼ is MODELED (encoded 2026-08-10): lastBullet → enemy defPct -8.4 /10s on
//       the enemy DEF channel (bossDefNow scales cfg.bossDef, floor 0; sub-0.1% at the
//       scope-lock 140-DEF basis, live at web raid DEF defaults; channel damage math owned
//       by scripts/tests/engine/enemy-def-debuff.test.ts). L7 pins its magnitude, cadence,
//       and window. The nearest-wrong encoding — boss Damage Taken ▲8.4% — WOULD move team
//       damage (~8%+), so the guard below proves it is absent while a counterfactual shows
//       what it would have done.
//   L2  Enemy ATK▼: the boss never attacks in the DPS sim — doubly inert (no consumer AND
//       dropped by applyEffect). Verbatim in unmodeled.
//   L3  Taunt/Attract: v1 has no threat/targeting model — the solo boss already "attacks"
//       the team abstraction; there is no aggro state to redirect. Verbatim in unmodeled.
//   L4  Self Damage Taken ▼: no incoming-damage model in v1 (immortal boss, nobody takes
//       damage), so the window has no observable. Verbatim in unmodeled.
//   L5  burstCast → enemy flatDamage 163.1 (the burst CAST lands BEFORE the Full Burst
//       window opens, so it must never take the +50% FB major — verified fact 2026-07-13).
//       The "10 enemy unit(s) with the highest final ATK" targeting collapses to the solo
//       boss (one hit per cast) — the ×10-multiplier misread is discriminated below.
//   L6  burstCast → allies defPct 12.93 / 10s. The "when above 50% HP" gate is CONSTANT in
//       v1: there is no HP pool / incoming-damage model, every unit is always at full HP,
//       so the gate is always-TRUE — modeled unconditionally (the soline Max-HP-gate
//       documentation pattern: the gate is recorded in the note, never enacted as a
//       blocker). defPct is itself inert in v1 ("self DEF doesn't affect own damage"), so
//       the line has no damage observable — pinned entirely on its buffApply events
//       (magnitude / scope / duration / cast-coupling).
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   L5  MAGNITUDE (163.1 — the max-level value, not the lv1 89.7), CAST-COUPLING (exactly one
//       nuke per ludmilla burstCast, in the 'burst' bucket), FB-TIMING (the cast precedes the
//       FB window → fbMajorApplied never set), and the ×10 MULTI-TARGET MISREAD (163.1 × 10 =
//       1631 — folding all ten targets into one boss hit) is counterfactualled apart.
//   L6  VALUE (12.93, not lv1 7.11), SCOPE (all 4 allies per firing, self included — a
//       self-only misread reaches exactly 1), WINDOW (10s timed expiry, no round budget),
//       CAST-COUPLING (one firing = 4 buffApply events per ludmilla cast).
//   GUARD every ludmilla-cast buffApply is either the ally defPct 12.93 grant (targetIdx !=
//       null) or the enemy defPct -8.4 shave (targetIdx == null) — no enemy ATK▼ (L2), no
//       taunt/DR encoding (L3/L4), nothing else. The guard is shown NON-VACUOUS
//       by injecting the nearest-wrong S1 (boss Damage Taken ▲8.4% on lastBullet), which
//       measurably moves team totals. L3/L4 counterfactuals are genuinely invisible to a DPS
//       sim (self damageTakenPct feeds nothing — dmgTakenSum reads enemyBuffs only), so their
//       absence is documented, not behaviorally injectable.
//
// Fixtures (all deterministic, no seed; event-log over totals):
//   MAIN  ludmilla(Def,B1) / crown(Def,B2) / ada(Atk,B3) / helm(Atk,B3), boss Fire, focus ada —
//         the 720-kit-audit control comp with liter SWAPPED for ludmilla so ludmilla is the SOLE
//         B1 (with liter present she out-rotates a co-B1... and without any B1 the chain never
//         opens at all). Ludmilla's cd-20 burst is ready at every Full Burst cycle.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';
import type { CompOptions } from '../lib/harness.js';

const FPS = 60;
/** MAIN fixture slot order: ludmilla 0 / crown 1 / ada 2 / helm 3. */
const LUDMILLA = 0;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type FBStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

const mainComp: CompOptions = {
  slugs: ['ludmilla', 'crown', 'ada', 'helm'],
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
/** L5 counterfactual (magnitude axis): the lv1 magnitude 89.7 instead of max-level 163.1. */
const ludmillaLv1Nuke = withPatchedOverride('ludmilla', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'flatDamage');
  if (!e) {
    throw new Error(
      'ludmilla burst flatDamage effect missing — fixture is stale'
    );
  }
  e.atkPct = 89.7;
});
/** L5 counterfactual (multi-target misread): all ten targets' worth folded into the solo
 *  boss (163.1 × 10). */
const ludmillaTenfoldNuke = withPatchedOverride('ludmilla', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'flatDamage');
  if (!e) {
    throw new Error(
      'ludmilla burst flatDamage effect missing — fixture is stale'
    );
  }
  e.atkPct = 1631;
});
/** L6 counterfactual (scope axis): the DEF buff self-scoped instead of all allies. */
const ludmillaSelfDef = withPatchedOverride('ludmilla', (ov) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'defPct')
  );
  if (!b) {
    throw new Error('ludmilla burst defPct block missing — fixture is stale');
  }
  b.target = { kind: 'self' };
});
/** GUARD counterfactual (the nearest-wrong S1): the DEF▼ debuff encoded as boss Damage
 *  Taken ▲8.4% on lastBullet — the one enemy-stat form the engine would actually honor. */
const ludmillaS1AsDmgTaken = withPatchedOverride('ludmilla', (ov) => {
  ov.skill1.push({
    slot: 'skill1',
    trigger: { kind: 'lastBullet' },
    target: { kind: 'enemy' },
    effects: [
      { kind: 'buff', stat: 'damageTakenPct', value: 8.4, durationSec: 10 },
    ],
  });
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = runMain();
const lv1Nuke = runMain({ ludmilla: ludmillaLv1Nuke });
const tenfoldNuke = runMain({ ludmilla: ludmillaTenfoldNuke });
const selfDef = runMain({ ludmilla: ludmillaSelfDef });
const s1AsDmgTaken = runMain({ ludmilla: ludmillaS1AsDmgTaken });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const ludmillaCasts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'ludmilla'
  );
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e): e is FBStart => e.kind === 'fullBurstStart');

/** ludmilla's burst nuke hits (burst-bucket damage sourced from her burst slot). */
const ludmillaNukes = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'ludmilla' && d.srcSlot === 'burst');

/** Every buffApply ludmilla herself casters (any stat, any target). */
const ludmillaBuffs = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.casterIdx === LUDMILLA);

/** ludmilla's DEF grants (her only modeled buff line). */
const ludmillaDefBuffs = (evs: SimEvent[]) =>
  ludmillaBuffs(evs).filter((b) => b.stat === 'defPct');

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

describe('ludmilla — kit spec', () => {
  describe('G0 — fixture sanity: sole B1, ludmilla casts at every Full Burst', () => {
    it('the fixture completes Full Burst cycles and ludmilla casts at every one', () => {
      const fbs = fbStarts(base.events).length;
      const casts = ludmillaCasts(base.events).length;
      expect(
        fbs,
        'the sole-B1 fixture must complete multiple Full Burst cycles in 180s'
      ).toBeGreaterThanOrEqual(3);
      expect(
        casts,
        `${casts} ludmilla casts vs ${fbs} Full Bursts — her cd-20 burst must be ready at every cycle`
      ).toBe(fbs);
    });
  });

  describe('L5 — burst nuke: 163.1% of final ATK, once per cast, before the FB window', () => {
    const nukes = ludmillaNukes(base.events);

    it('fires exactly once per burst cast, in the burst bucket, at the kit magnitude', () => {
      const casts = ludmillaCasts(base.events).length;
      expect(nukes.length).toBe(casts);
      expect(nukes.length).toBeGreaterThan(0);
      expect(
        [...new Set(nukes.map((d) => d.atkPct))],
        'the max-level magnitude 163.1 — not the lv1 89.7 and not the ×10 multi-target fold'
      ).toEqual([163.1]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      const took = nukes.filter((d) => d.fbMajorApplied);
      expect(
        took.map((d) => d.sec),
        'burst-cast damage must precede the FB window'
      ).toEqual([]);
    });

    it('DISCRIMINATING (magnitude): the lv1 magnitude (89.7) moves her total', () => {
      expect(lv1Nuke.totals.ludmilla).not.toEqual(base.totals.ludmilla);
    });

    it('DISCRIMINATING (multi-target misread): folding all ten targets into the boss (×10) moves her total', () => {
      expect(tenfoldNuke.totals.ludmilla).not.toEqual(base.totals.ludmilla);
    });
  });

  describe('L6 — burst DEF ▲12.93% to ALL allies for 10s (HP>50% gate always-true in v1)', () => {
    const applied = ludmillaDefBuffs(base.events);

    it('fires once per cast — one buffApply per ally, all 4 allies, self included', () => {
      const casts = ludmillaCasts(base.events).length;
      expect(applied.length, 'no ludmilla defPct buff was applied').toBe(
        casts * 4
      );
      for (const [frame, holders] of holdersPerFrame(applied)) {
        expect(
          holders.size,
          `frame ${frame} reached ${holders.size} allies, expected 4`
        ).toBe(4);
      }
    });

    it('is the kit magnitude 12.93 for a 10-second timed window', () => {
      expect([...new Set(applied.map((b) => b.value))]).toEqual([12.93]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
        expect(b.durationShots).toBeNull();
      }
    });

    it('DISCRIMINATING (scope): a self-only misread reaches exactly 1 holder per firing', () => {
      const wrong = buffs(selfDef.events).filter(
        (b) => b.casterIdx === LUDMILLA && b.stat === 'defPct'
      );
      expect(wrong.length).toBeGreaterThan(0);
      for (const [, holders] of holdersPerFrame(wrong)) {
        expect(holders.size).toBe(1);
      }
    });
  });

  describe('L2-L4 — the remaining cover lines are UNMODELED (inert in v1) and pinned absent', () => {
    it('every ludmilla-cast buff is the ally DEF grant or the enemy DEF shave — nothing else', () => {
      const other = ludmillaBuffs(base.events).filter(
        (b) =>
          !(b.stat === 'defPct' && b.targetIdx != null && b.value === 12.93) &&
          !(b.stat === 'defPct' && b.targetIdx == null && b.value === -8.4)
      );
      expect(
        other.map((b) => `${b.stat}:${b.value}@${b.targetIdx}`),
        'L2 enemy ATK▼ and L3/L4 taunt/DR must have no encoding'
      ).toEqual([]);
    });

    it('ludmilla sources no skill-slot damage (no riders invented for S1/S2)', () => {
      const riders = dmg(base.events).filter(
        (d) =>
          d.slug === 'ludmilla' &&
          (d.srcSlot === 'skill1' || d.srcSlot === 'skill2')
      );
      expect(riders).toEqual([]);
    });

    it('ZERO damageTakenPct buffApply anywhere in the run (the shared-prior sign/channel trap)', () => {
      // The kit has NO boss Damage-Taken line. 'Damage Taken ▼57.86%' on SELF pattern-matches
      // the boss damageTakenPct channel; either sign of that misread moves the board by tens
      // of percent, so the whole run must be damageTakenPct-silent (S2b reviewer guard).
      const any = buffs(base.events).filter((b) => b.stat === 'damageTakenPct');
      expect(any.map((b) => `${b.value}@${b.targetIdx}`)).toEqual([]);
    });

    it('DISCRIMINATING (non-vacuous guard): the nearest-wrong S1 (boss Damage Taken ▲8.4%) WOULD move team totals', () => {
      const moved = mainComp.slugs.filter(
        (s) => s1AsDmgTaken.totals[s] !== base.totals[s]
      );
      expect(
        moved.length,
        "injecting S1 as damageTakenPct must change somebody's total"
      ).toBeGreaterThan(0);
    });
  });

  describe('L7 — S1 DEF ▼8.4%/10s per magazine-end, on the enemy defPct channel (encoded 2026-08-10)', () => {
    // channel damage math owned by scripts/tests/engine/enemy-def-debuff.test.ts
    // (reuse-before-derive) — this group pins only her magnitude, cadence, and window.
    const shaves = buffs(base.events).filter(
      (b) => b.stat === 'defPct' && b.value === -8.4
    );

    it('fires on the last-bullet cadence (~one per 9.1s magazine cycle), boss-held, 10s window', () => {
      // 120 ammo @ 20 shots/s (6.0s) + 187f reload (~3.1s) → ~19 magazine cycles in 180s.
      expect(shaves.length).toBeGreaterThanOrEqual(15);
      for (const b of shaves) {
        expect(b.key.startsWith(`${LUDMILLA}:skill1:`)).toBe(true);
        expect(b.targetIdx == null).toBe(true);
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });
  });
});
