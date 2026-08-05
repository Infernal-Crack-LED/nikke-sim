// PER-UNIT KIT SPEC — `jackal` (Jackal — RL / Defender / Iron / Burst I, cd 20s, ammo 6,
// reloadFrames 142, chargeFrames 60, chargeMult 250, normalMult 65.02). Kit-autonomy
// gauntlet 2026-08-04 (test-first re-derivation). ⚠ EXACT SLUG: `jackal` — the base
// Missilis RL Defender; no variant exists, but the slug-disambiguation lint passes clean
// on the disambiguated full form.
// NOTE: this is a FROM-SCRATCH unit — there was no shipped override before this gauntlet
// (simSupported was false, no kit-status row), so the harness cannot even load her until
// src/skills/overrides/jackal.json exists (the RED state of this suite: every assertion
// fails at load). Every assertion below PINS a kit line GREEN vs that override and RED vs
// the nearest-wrong counterfactual (withPatchedOverride), so the file discriminates exactly
// as a verification gauntlet would (maiden/milk precedent).
//
// Kit (blablalink prose, data/characters.json → characters.jackal.skills, lvl 10):
//   S1 ■ attacked 10× → 1 enemy, highest final Max HP:
//        Damage Taken ▲9.09% for 10 sec + ATK ▼9.09% for 10 sec            [UNMODELED — J1]
//   S2 ■ start of battle → self + 2 allies highest final ATK:
//        Equally shares damage taken for 120 sec                            [UNMODELED — J2]
//        DEF ▲8.27% for 120 sec                                             [FAITHFUL — J3]
//   BU ■ all allies:
//        Burst Skill damage of skills with "Affects 1 enemy unit(s)" in the
//        description ▲38.91% for 15 sec                                     [UNMODELED — J4]
//        DEF ▲14.69% for 10 sec                                             [FAITHFUL — J5]
//
// JACKAL IS A TANK; HER KIT IS ALMOST ENTIRELY OUT-OF-DOMAIN FOR A DAMAGE SIM. Two of the
// five kit lines are modeled, and BOTH are damage-INERT in v1 (defPct — self/team DEF never
// feeds damage dealt; the boss never attacks). The other three are documented omissions:
//
//   • J1 (the whole S1 cluster) is gated on "attacked 10 times" — the sim has NO
//     incoming-damage model and NO attacked-count trigger (v1 boss is immortal and never
//     acts), so the line can never fire. Its Damage-Taken half IS damage-relevant (a 9.09%
//     team amp on the boss while active), but granting it without a fireable trigger would
//     fabricate uptime the sim cannot produce — maiden's Revenge cluster is the identical
//     kit archetype and the binding precedent (faithful omission + ⚑, not a fudge). The
//     ATK▼ half is separately out-of-domain: the engine drops enemy ATK▼ debuffs at
//     dispatch (boss deals no damage).
//   • J2 (damage share) has no redistribution primitive and nothing to redistribute
//     (no incoming damage) — bay/marciana/poli precedent.
//   • J4 (the burst's headline buff) has NO engine vocabulary: the formula SSOT
//     (docs/data/nikke-damage-formula.md) has no Burst-Skill-Damage bucket/stat
//     (StatKey has no burstSkillDamagePct; dealDamage's dmgUp bucket carries no
//     burst-category term), AND the scope is a per-skill DESCRIPTION-TEXT condition
//     ("skills with 'Affects 1 enemy unit(s)' in the description") for which no gate
//     exists. trina carries the SAME mechanic family ("Burst Skill damage of skills with
//     'Affects all enemies'") and her 2026-07-24 gauntlet (GO, cross-family corroborated)
//     ruled it UNMODELED + caveat — teammates' scoped burst nukes read COLD in trina/jackal
//     comps. This spec adopts the binding precedent rather than fake the amp through an
//     unscoped Damage-Up stat (the nearest-wrong counterfactual below, J4c).
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model
// gates nothing):
//   J3  DEF ▲8.27% is defPct (inert) — an atkPct misread would move every holder's damage;
//       a self-only/all-allies mis-scope moves the holder set; a wrong duration (60s) moves
//       the window; removal must leave totals BYTE-IDENTICAL (the inertia proof).
//   J5  DEF ▲14.69% is defPct on burstCast — magnitude pin (lvl-1 8.08 is wrong), all-allies
//       scope (4 holders per cast), 10s window, and TIMING: the buff lands on jackal's OWN
//       cast frame (burstCast), not at Full Burst entry (fullBurstEnter lands later, at the
//       stage-3 completion); removal leaves totals byte-identical.
//   J1  the omission is a CHOICE: zero damageTakenPct applications at baseline, while the
//       'always-up' and 'attacks-misread' counterfactuals both apply the debuff and lift
//       team totals — proving the shipped zero is deliberate, not a stale fixture.
//   J4  the omission is a CHOICE: zero attackDamagePct (or any damage stat) granted by
//       jackal at baseline, while the unscoped-38.91% counterfactual lifts team totals —
//       proving the amp is not implicitly shipped. (The TRUE mechanic would lift only
//       single-target burst damage; even that weaker amp changes totals, so the totals
//       discrimination holds against any encoding of the line.)
//
// Fixture: jackal/crown/ada/helm, boss Fire, focus jackal (milk's B1 fixture mirrored —
// the standard controlComp cannot be used: liter is also Burst I and would take/alternate
// the stage-I slot, halving jackal's casts). jackal is the SOLE B1 (20s CD covers stage I
// alone; crown B2 20s; ada + helm B3 40s alternate), so she casts every Full Burst and the
// focus keeps her RL gauge ahead of the 20s CD (RL = charge weapon, focus ×2.5 gauge).
// Iron vs the Fire boss is elementally neutral. Deterministic (no seed); event-log over
// totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const SLUGS = ['jackal', 'crown', 'ada', 'helm'] as const;
/** slot order: jackal 0 / crown 1 / ada 2 / helm 3. */
const JACKAL = 0;
const CROWN = 1;
const ADA = 2;
const HELM = 3;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [...SLUGS],
    bossElement: 'Fire',
    focusSlug: 'jackal',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

const sum = (t: Record<string, number>) =>
  SLUGS.reduce((acc, s) => acc + (t[s] ?? 0), 0);

// ---- counterfactual patches -------------------------------------------------------------------
/** J5 wrong magnitude: the lvl-1 value 8.08 instead of the lvl-10 14.69. */
const j5Weak = withPatchedOverride('jackal', (ov) => {
  ov.burst[0].effects[0].value = 8.08;
});
/** J5 wrong trigger: fullBurstEnter (lands at the stage-3 completion) instead of burstCast
 *  (lands on jackal's OWN cast frame, before the FB window opens). */
const j5OnFbEnter = withPatchedOverride('jackal', (ov) => {
  ov.burst[0].trigger = { kind: 'fullBurstEnter' };
});
/** J5 nearest-wrong misread: DEF▲ as an OFFENSIVE atkPct buff (would move every holder's
 *  damage — defPct is the inert-by-construction stat). */
const j5AtkMisread = withPatchedOverride('jackal', (ov) => {
  ov.burst[0].effects[0].stat = 'atkPct';
});
/** J5 wrong duration: 15 sec instead of the kit's 10. */
const j5Long = withPatchedOverride('jackal', (ov) => {
  ov.burst[0].effects[0].durationSec = 15;
});
/** J5 reference: the burst DEF block removed entirely (proves it is inert, not live). */
const j5Removed = withPatchedOverride('jackal', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.stat === 'defPct')
  );
  if (ov.burst.length === before) {
    throw new Error('jackal burst defPct block missing — fixture is stale');
  }
});
/** J3 nearest-wrong misread: both S2 DEF grants as OFFENSIVE atkPct buffs. */
const j3AtkMisread = withPatchedOverride('jackal', (ov) => {
  for (const b of ov.skill2) {
    for (const e of b.effects) {
      if (e.stat === 'defPct') {
        e.stat = 'atkPct';
      }
    }
  }
});
/** J3 wrong scope: the DEF grant hits all allies instead of self + the 2 highest-final-ATK. */
const j3AllAllies = withPatchedOverride('jackal', (ov) => {
  ov.skill2 = ov.skill2.filter((b: any) => b.target.kind !== 'alliesTopAtk');
  ov.skill2.push({
    slot: 'skill2',
    trigger: { kind: 'passive' },
    target: { kind: 'allies' },
    effects: [{ kind: 'buff', stat: 'defPct', value: 8.27, durationSec: 120 }],
  });
});
/** J3 wrong duration: 60 sec instead of the kit's 120. */
const j3Short = withPatchedOverride('jackal', (ov) => {
  for (const b of ov.skill2) {
    for (const e of b.effects) {
      e.durationSec = 60;
    }
  }
});
/** J3 wrong rank direction: the 2 LOWEST-final-ATK allies instead of the 2 highest. */
const j3Lowest = withPatchedOverride('jackal', (ov) => {
  for (const b of ov.skill2) {
    if (b.target.kind === 'alliesTopAtk') {
      b.target.kind = 'alliesLowestAtk';
    }
  }
});
/** J3 reference: both S2 DEF blocks removed entirely (proves them inert, not live). */
const j3Removed = withPatchedOverride('jackal', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !b.effects.some((e: any) => e.stat === 'defPct')
  );
  if (ov.skill2.length === before) {
    throw new Error('jackal skill2 defPct blocks missing — fixture is stale');
  }
});
/** J1 the 'always-up' mis-model: the S1 Damage-Taken debuff granted passively on the boss,
 *  i.e. the uptime fabricated without a fireable attacked-10x trigger. */
const j1AlwaysUp = withPatchedOverride('jackal', (ov) => {
  ov.skill1.push({
    slot: 'skill1',
    trigger: { kind: 'passive' },
    target: { kind: 'enemy' },
    effects: [{ kind: 'buff', stat: 'damageTakenPct', value: 9.09 }],
  });
});
/** J1 the 'attacks-misread' mis-model: "attacked 10 times" read as "attacks 10 times"
 *  (hitCount on jackal's OWN shots) — the nearest-wrong trigger encoding. */
const j1AttacksMisread = withPatchedOverride('jackal', (ov) => {
  ov.skill1.push({
    slot: 'skill1',
    trigger: { kind: 'hitCount', count: 10 },
    target: { kind: 'enemy' },
    effects: [
      { kind: 'buff', stat: 'damageTakenPct', value: 9.09, durationSec: 10 },
    ],
  });
});
/** J4 the unscoped-amp mis-model: the burst's 38.91% encoded as an all-allies Attack
 *  Damage buff — wrong bucket (Damage Up, not a Burst-Skill-Damage bucket) AND wrong scope
 *  (all damage, not single-target burst skills). The optimistic encoding the shipped
 *  override deliberately DOES NOT adopt (trina precedent). */
const j4UnscopedAmp = withPatchedOverride('jackal', (ov) => {
  ov.burst.push({
    slot: 'burst',
    trigger: { kind: 'burstCast' },
    target: { kind: 'allies' },
    effects: [
      { kind: 'buff', stat: 'attackDamagePct', value: 38.91, durationSec: 15 },
    ],
  });
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const weak = run({ jackal: j5Weak });
const onFbEnter = run({ jackal: j5OnFbEnter });
const j5atk = run({ jackal: j5AtkMisread });
const long = run({ jackal: j5Long });
const j5removed = run({ jackal: j5Removed });
const j3atk = run({ jackal: j3AtkMisread });
const j3allies = run({ jackal: j3AllAllies });
const j3short = run({ jackal: j3Short });
const j3lowest = run({ jackal: j3Lowest });
const j3removed = run({ jackal: j3Removed });
const alwaysUp = run({ jackal: j1AlwaysUp });
const attacksMisread = run({ jackal: j1AttacksMisread });
const unscopedAmp = run({ jackal: j4UnscopedAmp });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const jackalBuff = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === JACKAL && b.stat === stat);
const jackalBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'jackal'
  );

describe('jackal — kit spec', () => {
  describe('fixture sanity — the B1 chain actually runs', () => {
    it('jackal is the sole B1 and casts every Full Burst (>= 6 casts / 180s)', () => {
      const casts = jackalBursts(base.events).length;
      expect(casts).toBeGreaterThanOrEqual(6);
    });
    it('her RL weapon deals damage (bare-weapon baseline; her kit grants herself nothing)', () => {
      expect(base.totals.jackal).toBeGreaterThan(0);
    });
  });

  describe('J3 — S2 battle-start DEF ▲8.27% for 120s to self + 2 highest-final-ATK allies', () => {
    const applied = jackalBuff(base.events, 'defPct').filter(
      (b) => b.frame === 0
    );

    it('fires once at battle start (passive, frame 0) with the lvl-10 magnitude', () => {
      expect(applied.length).toBe(3); // self + 2 allies, excludeSelf on the top-2 block
      expect([...new Set(applied.map((b) => b.value))]).toEqual([8.27]);
      expect([...new Set(applied.map((b) => b.frame))]).toEqual([0]);
    });

    it('reaches jackal herself + exactly 2 allies (self + top-2 final ATK, not all allies)', () => {
      const holders = new Set(applied.map((b) => b.targetIdx));
      expect(holders.size).toBe(3);
      expect(holders.has(JACKAL)).toBe(true);
      // The all-allies counterfactual widens the holder set to all four units.
      const widened = new Set(
        jackalBuff(j3allies.events, 'defPct')
          .filter((b) => b.frame === 0)
          .map((b) => b.targetIdx)
      );
      expect(widened.size, 'all-allies scope must widen the holder set').toBe(
        4
      );
    });

    it('ranks by HIGHEST final ATK — the lowest-2 counterfactual swaps a holder', () => {
      const holders = new Set(
        applied.filter((b) => b.targetIdx !== JACKAL).map((b) => b.targetIdx)
      );
      const lowestHolders = new Set(
        jackalBuff(j3lowest.events, 'defPct')
          .filter((b) => b.frame === 0 && b.targetIdx !== JACKAL)
          .map((b) => b.targetIdx)
      );
      expect(
        lowestHolders,
        'lowest-2 ranking must select a different ally pair than highest-2'
      ).not.toEqual(holders);
    });

    it('lasts exactly 120 sec (7200 frames), not 60', () => {
      expect([
        ...new Set(applied.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([120 * FPS]);
      expect(
        [
          ...new Set(
            jackalBuff(j3short.events, 'defPct')
              .filter((b) => b.frame === 0)
              .map((b) => b.expiresFrame! - b.frame)
          ),
        ],
        'the 60s counterfactual must shrink the window'
      ).toEqual([60 * FPS]);
    });

    it('is INERT in v1: an atkPct misread would move damage, defPct removal changes nothing', () => {
      // The offensive misread changes team totals (DEF is not ATK).
      expect(sum(j3atk.totals)).not.toEqual(sum(base.totals));
      // defPct itself is damage-neutral: removal leaves EVERY unit byte-identical.
      for (const s of SLUGS) {
        expect(j3removed.totals[s], `${s} total with J3 removed`).toEqual(
          base.totals[s]
        );
      }
    });
  });

  describe('J5 — burst DEF ▲14.69% for 10s to all allies on her OWN cast', () => {
    const casts = jackalBursts(base.events);
    const castFrames = new Set(casts.map((c) => c.frame));
    const applied = jackalBuff(base.events, 'defPct').filter(
      (b) => b.frame !== 0
    );

    it('fires once per burst cast at the lvl-10 magnitude (not the lvl-1 8.08)', () => {
      expect(casts.length).toBeGreaterThan(0);
      expect(applied.length).toBe(casts.length * 4); // all allies incl. jackal
      expect([...new Set(applied.map((b) => b.value))]).toEqual([14.69]);
      expect([
        ...new Set(
          jackalBuff(weak.events, 'defPct')
            .filter((b) => b.frame !== 0)
            .map((b) => b.value)
        ),
      ]).toEqual([8.08]);
    });

    it('reaches ALL four allies on every cast', () => {
      for (const cf of castFrames) {
        const holders = new Set(
          applied.filter((b) => b.frame === cf).map((b) => b.targetIdx)
        );
        expect(holders).toEqual(new Set([JACKAL, CROWN, ADA, HELM]));
      }
    });

    it('lands on her own burstCast frames (burstCast, not fullBurstEnter)', () => {
      for (const b of applied) {
        expect(castFrames.has(b.frame), 'buff frame must be a cast frame').toBe(
          true
        );
      }
      // The fullBurstEnter counterfactual lands at the stage-3 completion, NOT the cast frame.
      const fbEnterApplied = jackalBuff(onFbEnter.events, 'defPct').filter(
        (b) => b.frame !== 0
      );
      expect(fbEnterApplied.length).toBeGreaterThan(0);
      expect(
        fbEnterApplied.every((b) => !castFrames.has(b.frame)),
        'fullBurstEnter applications must land off the cast frames'
      ).toBe(true);
    });

    it('lasts exactly 10 sec (600 frames), not 15', () => {
      expect([
        ...new Set(applied.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([10 * FPS]);
      expect(
        [
          ...new Set(
            jackalBuff(long.events, 'defPct')
              .filter((b) => b.frame !== 0)
              .map((b) => b.expiresFrame! - b.frame)
          ),
        ],
        'the 15s counterfactual must widen the window'
      ).toEqual([15 * FPS]);
    });

    it('is INERT in v1: an atkPct misread would move damage, defPct removal changes nothing', () => {
      expect(sum(j5atk.totals)).not.toEqual(sum(base.totals));
      for (const s of SLUGS) {
        expect(j5removed.totals[s], `${s} total with J5 removed`).toEqual(
          base.totals[s]
        );
      }
    });
  });

  describe('J1 — S1 (attacked-10× → Damage Taken ▲9.09% + ATK ▼9.09%) is genuinely unmodeled', () => {
    it('applies NO damageTakenPct debuff — the attacked-10x trigger cannot fire in-sim', () => {
      expect(
        buffs(base.events).filter((b) => b.stat === 'damageTakenPct')
      ).toHaveLength(0);
    });

    it('the omission is a choice: both fireable-counterpart counterfactuals apply the debuff and lift team totals', () => {
      const alwaysUpDt = buffs(alwaysUp.events).filter(
        (b) => b.stat === 'damageTakenPct'
      );
      const misreadDt = buffs(attacksMisread.events).filter(
        (b) => b.stat === 'damageTakenPct'
      );
      expect(alwaysUpDt.length).toBeGreaterThan(0);
      expect(misreadDt.length).toBeGreaterThan(0);
      expect(sum(alwaysUp.totals)).toBeGreaterThan(sum(base.totals));
      expect(sum(attacksMisread.totals)).toBeGreaterThan(sum(base.totals));
    });
  });

  describe('J4 — the burst Burst-Skill-damage amp is genuinely unmodeled (trina precedent)', () => {
    it('jackal grants NO damage stat — her only buffs are the two inert defPct lines', () => {
      const granted = new Set(
        buffs(base.events)
          .filter((b) => b.casterIdx === JACKAL)
          .map((b) => b.stat)
      );
      expect(granted).toEqual(new Set(['defPct']));
    });

    it('the omission is a choice: the unscoped-38.91% counterfactual lifts team totals', () => {
      expect(
        buffs(unscopedAmp.events).filter(
          (b) => b.stat === 'attackDamagePct' && b.casterIdx === JACKAL
        ).length
      ).toBeGreaterThan(0);
      expect(sum(unscopedAmp.totals)).toBeGreaterThan(sum(base.totals));
    });
  });

  describe('J2 — S2 damage-share is out-of-domain (documented, no damage assertion)', () => {
    it('the sim models no incoming damage and no redistribution — recorded verbatim in unmodeled', () => {
      // Nothing to assert behaviorally: v1 boss deals no damage, so there is nothing to
      // share. The line sits verbatim in unmodeled.skill2 (bay/marciana/poli precedent);
      // this test documents that the omission is load-bearing-neutral.
      expect(base.totals.jackal).toBeGreaterThan(0);
    });
  });
});
