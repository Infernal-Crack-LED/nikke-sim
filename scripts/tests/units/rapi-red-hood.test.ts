// PER-UNIT KIT SPEC — `rapi-red-hood` (Rapi: Red Hood, Attacker/MG/Fire, Burst III, cd 40s,
// ammo 300). Kit-autonomy gauntlet 2026-07-25 — test-first independent re-derivation.
//
// EXACT SLUG: this is `rapi-red-hood` ("rrh"/"rapipi"), the MG/Fire Overspec variant — NOT base
// `rapi` (AR/Fire) and NOT `red-hood` (the Λ SR unit). The lint flags the bare "Rapi" substring
// inside her full name; every assertion below keys on the exact slug.
//
// She is a TIER-2 unit: her kit is FORMATION-GATED (S1 reads whether the squad has a Burst I ally)
// and STAGE-GATED (her burst does different things at Stage 1 vs Stage 3), and her damage core is a
// STORED-HIT rocket mechanic. Two fixtures exercise the two formation branches:
//
//   hasB1  — liter(B1)/crown(B2)/rrh(B3)/helm(B3), focus rrh.  A B1 ally IS present, so rrh is in
//            "hasB1" formation: she does NOT fill B1, casts her burst at STAGE 3, and S1 self-buffs
//            ATK 95.04% on each Full Burst entry.
//   noB1   — crown(B2)/rrh/ada(B3), focus rrh.  NO B1 ally, so rrh is in "noB1" formation: Combat
//            Assist makes her fill the B1 slot (burstEligibility stage 1), she casts at STAGE 1, and
//            S1 grants the WHOLE TEAM Attack Damage 8.02% + burst CDR on each Full Burst entry.
//
// Kit (blablalink prose, data/characters.json → characters['rapi-red-hood'].skills):
//   S1 ■ noB1: Combat Assist → fills Burst Stage 1 (continuous)                              [RRH2]
//      ■ noB1, entering Full Burst → all allies: Burst CDR ▼7.48s + Attack Damage ▲8.02% 10s  [RRH2]
//      ■ hasB1, entering Full Burst → self: ATK ▲95.04% for 10 sec                          [RRH1]
//      (hasB1 "Damage to Interruption Parts ▲48%" — UNMODELED, inert on the partless boss)
//   S2 ■ passive: Elemental Advantage vs Electric; Projectile Attachment Damage ▲150.72%,
//                 Projectile Explosion Damage ▲100.6% (continuous)                           [RRH3]
//      ■ every 120 normals (60 in FB): attachable rocket — 88.11% attachment (immediate, no
//                 core) + 88.11% explosion (STORED, releases on FB, no core, crits)          [RRH4]
//      (Max Ammo: 1 — UNMODELED, the meter is modeled as a fill threshold not an ammo slot)
//   BU ■ Stage 1 → self: Burst CDR ▼20s; all allies: ATK ▲18.01% of caster ATK for 10 sec    [RRH6]
//      ■ Stage 3 → nearest enemy: 2808% of final ATK as additional damage (flighted ~0.4s,
//                 lands INSIDE the FB window; charge-gated, requires ≥120 pulls)             [RRH5]
//      (Stage 1 & 3 "Explosion Radius ▲100.62%" — UNMODELED, inert on the partless boss;
//       Stage 3 "Projectile Attachment Damage ▲421.2%" — MEASURED-INERT, removed 2026-07-14)
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing). Counterfactuals are built with `withPatchedOverride` ONLY to prove the shipped encoding
// is the one under test, never to supply it:
//   RRH1  the formation gate: 95.04% fires ONLY in hasB1. Proven by its absence in noB1 and by the
//       total dropping when the block is removed. A mis-gated (always-on) buff would appear in both.
//   RRH2  the OTHER side of the gate: 8.02% team buff + a STAGE-1 cast fire ONLY in noB1. A unit
//       that fails to fill B1 could not open the chain at all (zero stage-1 casts).
//   RRH3  the 150.72/100.6 buffs are their OWN multiplicative bucket and route ONLY to the flavored
//       rocket hits — attachment hits carry projFactor 2.5072, explosion hits 2.0060, and removing
//       the buffs collapses both to 1.0 (normals are never touched, projFactor 1.0 throughout).
//   RRH4  the explosion is a STORED hit that crits but does NOT core (skill-damage class — owner
//       footage ruling 2026-08-04 overturns the 2026-07-16 core-⅓ read), the attachment does not
//       core either. Removing the storedHit erases every explosion-flavor instance (projFactor
//       2.0060 gone).
//   RRH5  the 2808% nuke is a flighted burst-bucket hit that takes the +50% FB major (it lands inside
//       the window, ~0.4s after the cast banner), once per cast. Removing the block erases it.
//   RRH6  the Stage-1 ATK grant is caster-scaled flat ATK to ALL allies; the 18.01→11.16 counterfactual
//       moves it by exactly 18.01/11.16, pinning the magnitude without depending on absolute ATK.
//
// Fixture is deterministic (no seed); assertions read the event log, not totals, except where a
// counterfactual's whole point is that the total moves.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const SLUG = 'rapi-red-hood';

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(opts: ReturnType<typeof controlComp> | any) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...opts,
    cfg: { ...opts.cfg, onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

/** hasB1 fixture: the control comp with rrh as the focused B3 carry (liter is the B1 ally). */
const hasB1Comp = controlComp(SLUG);
const HASB1_RRH = 2; // liter 0 / crown 1 / rrh 2 / helm 3

/** noB1 fixture: no Burst I ally, so rrh fills the B1 slot herself via Combat Assist. */
const noB1Comp = {
  slugs: ['crown', SLUG, 'ada'],
  bossElement: 'Fire' as const,
  focusSlug: SLUG,
};
const NOB1_RRH = 1; // crown 0 / rrh 1 / ada 2

// ---- counterfactual patches (nearest-wrong model each assertion must beat) -------------------
/** RRH1: her hasB1 self-ATK line removed. */
const rrhNoAtk = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => b.formation !== 'hasB1');
  if (ov.skill1.length === before) {
    throw new Error('rrh S1 hasB1 block missing — fixture stale');
  }
});
/** RRH3: her S2 passive projectile Attachment/Explosion buffs removed. */
const rrhNoProj = withPatchedOverride(SLUG, (ov) => {
  let n = 0;
  for (const b of ov.skill2) {
    b.effects = b.effects.filter((e: any) => {
      const drop =
        e.stat === 'projectileAttachmentPct' ||
        e.stat === 'projectileExplosionPct';
      if (drop) {
        n++;
      }
      return !drop;
    });
  }
  if (n !== 2) {
    throw new Error('rrh S2 projectile buffs missing — fixture stale');
  }
});
/** RRH4: her S2 stored explosion (storedHit) removed — the attachment flatDamage stays. */
const rrhNoExpl = withPatchedOverride(SLUG, (ov) => {
  let n = 0;
  for (const b of ov.skill2) {
    b.effects = b.effects.filter((e: any) => {
      if (e.kind !== 'storedHit') {
        return true;
      }
      n++;
      return false;
    });
  }
  if (n !== 1) {
    throw new Error('rrh S2 storedHit missing — fixture stale');
  }
});
/** RRH5: her Stage-3 burst nuke removed. */
const rrhNoNuke = withPatchedOverride(SLUG, (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !(b.trigger.kind === 'burstCast' && b.trigger.stage === 3)
  );
  if (ov.burst.length === before) {
    throw new Error('rrh burst stage-3 nuke missing — fixture stale');
  }
});
/** RRH2: her noB1 Full-Burst-enter team block removed. */
const rrhNoAssist = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !(b.formation === 'noB1' && b.trigger.kind === 'fullBurstEnter')
  );
  if (ov.skill1.length === before) {
    throw new Error('rrh S1 noB1 FB-enter block missing — fixture stale');
  }
});
/** RRH6: her Stage-1 casterAtkPct magnitude knocked to the level-1 value (11.16 vs 18.01). */
const rrhCasterWrong = withPatchedOverride(SLUG, (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'casterAtkPct');
  if (!e) {
    throw new Error('rrh burst casterAtkPct missing — fixture stale');
  }
  e.value = 11.16;
});

// ---- runs (hoisted: each is a full 180s sim) -------------------------------------------------
const hBase = run(hasB1Comp);
const hNoAtk = run({ ...hasB1Comp, overrides: { [SLUG]: rrhNoAtk } });
const hNoProj = run({ ...hasB1Comp, overrides: { [SLUG]: rrhNoProj } });
const hNoExpl = run({ ...hasB1Comp, overrides: { [SLUG]: rrhNoExpl } });
const hNoNuke = run({ ...hasB1Comp, overrides: { [SLUG]: rrhNoNuke } });
const nBase = run(noB1Comp);
const nNoAssist = run({ ...noB1Comp, overrides: { [SLUG]: rrhNoAssist } });
const nCasterWrong = run({
  ...noB1Comp,
  overrides: { [SLUG]: rrhCasterWrong },
});

// ---- readers ---------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const rrhDmg = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  dmg(evs).filter((d) => d.slug === SLUG && d.srcSlot === srcSlot);
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const rrhBuffs = (evs: SimEvent[], stat: string, rrhSlot: number) =>
  buffs(evs).filter((b) => b.casterIdx === rrhSlot && b.stat === stat);
const rrhBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === SLUG);

/** Distinct holders a buff reached, per frame — for all-allies assertions. */
function holdersPerFrame(bs: BuffApply[]): Map<number, Set<number | null>> {
  const m = new Map<number, Set<number | null>>();
  for (const b of bs) {
    (m.get(b.frame) ?? m.set(b.frame, new Set()).get(b.frame)!).add(
      b.targetIdx
    );
  }
  return m;
}

const PROJ_ATTACH = 2.5072; // 1 + 150.72/100
const PROJ_EXPLODE = 2.006; // 1 + 100.6/100
const near = (a: number, b: number, eps = 1e-3) => Math.abs(a - b) < eps;

describe('rapi-red-hood — kit spec', () => {
  describe('RRH1 — S1 hasB1: self ATK ▲95.04% on Full Burst entry (formation-gated)', () => {
    const applied = rrhBuffs(hBase.events, 'atkPct', HASB1_RRH).filter(
      (b) => b.value === 95.04
    );

    it('fires in hasB1, self-scoped, for 10 sec', () => {
      expect(
        applied.length,
        'no hasB1 atkPct 95.04 buff applied'
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([
        HASB1_RRH,
      ]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('is LIVE (removing it drops her total)', () => {
      expect(hNoAtk.totals[SLUG]).toBeLessThan(hBase.totals[SLUG]);
      expect(
        rrhBuffs(hNoAtk.events, 'atkPct', HASB1_RRH).filter(
          (b) => b.value === 95.04
        )
      ).toEqual([]);
    });

    it('DISCRIMINATING: does NOT fire in noB1 formation (the gate is real)', () => {
      expect(
        rrhBuffs(nBase.events, 'atkPct', NOB1_RRH).filter(
          (b) => b.value === 95.04
        )
      ).toEqual([]);
    });
  });

  describe('RRH2 — S1 noB1: Combat Assist fills B1 + team Attack Damage ▲8.02% on FB entry', () => {
    const applied = rrhBuffs(nBase.events, 'attackDamagePct', NOB1_RRH).filter(
      (b) => b.value === 8.02
    );

    it('fills the B1 slot — she casts her burst at STAGE 1 in noB1', () => {
      const stages = rrhBursts(nBase.events).map((b) => b.stage);
      expect(
        stages.length,
        'noB1 chain never opened — rrh did not fill B1'
      ).toBeGreaterThan(0);
      expect([...new Set(stages)]).toEqual([1]);
    });

    it('grants 8.02% Attack Damage to ALL allies for 10 sec on each FB entry', () => {
      expect(
        applied.length,
        'no noB1 attackDamagePct 8.02 buff applied'
      ).toBeGreaterThan(0);
      for (const [, holders] of holdersPerFrame(applied)) {
        expect(holders.size, `reached ${holders.size} allies, expected 3`).toBe(
          3
        );
      }
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('DISCRIMINATING: removing the noB1 FB-enter block erases the team buff', () => {
      expect(
        rrhBuffs(nNoAssist.events, 'attackDamagePct', NOB1_RRH).filter(
          (b) => b.value === 8.02
        )
      ).toEqual([]);
    });

    it('DISCRIMINATING: does NOT fire in hasB1 formation, where she casts STAGE 3', () => {
      expect(
        rrhBuffs(hBase.events, 'attackDamagePct', HASB1_RRH).filter(
          (b) => b.value === 8.02
        )
      ).toEqual([]);
      expect([...new Set(rrhBursts(hBase.events).map((b) => b.stage))]).toEqual(
        [3]
      );
    });
  });

  describe('RRH3 — S2 passive: 150.72% attachment / 100.6% explosion route ONLY to the rocket hits', () => {
    const s2 = rrhDmg(hBase.events, 'skill2');
    const attach = s2.filter((d) => near(d.mult.projFactor, PROJ_ATTACH));
    const explode = s2.filter((d) => near(d.mult.projFactor, PROJ_EXPLODE));

    it('attachment hits carry projFactor 2.5072, explosion hits 2.0060', () => {
      expect(
        attach.length,
        'no attachment-flavored rocket hit'
      ).toBeGreaterThan(0);
      expect(
        explode.length,
        'no explosion-flavored rocket hit'
      ).toBeGreaterThan(0);
    });

    it('normals are never touched by the projectile bucket', () => {
      const normals = rrhDmg(hBase.events, 'normal');
      expect(normals.length).toBeGreaterThan(0);
      expect([
        ...new Set(normals.map((d) => d.mult.projFactor.toFixed(4))),
      ]).toEqual(['1.0000']);
    });

    it('DISCRIMINATING: removing the buffs collapses every rocket projFactor to 1.0', () => {
      const s2p = rrhDmg(hNoProj.events, 'skill2');
      expect(s2p.length).toBeGreaterThan(0);
      expect([
        ...new Set(s2p.map((d) => d.mult.projFactor.toFixed(4))),
      ]).toEqual(['1.0000']);
    });
  });

  describe('RRH4 — S2 rocket: 88.11% attachment (no core) + 88.11% explosion (stored, no core, crits)', () => {
    const s2 = rrhDmg(hBase.events, 'skill2');
    const attach = s2.filter((d) => near(d.mult.projFactor, PROJ_ATTACH));
    const explode = s2.filter((d) => near(d.mult.projFactor, PROJ_EXPLODE));
    const isMultipleOf8811 = (a: number) =>
      Math.abs(a / 88.11 - Math.round(a / 88.11)) < 1e-6;

    it('every rocket instance is an integer multiple of 88.11% of final ATK', () => {
      expect(s2.length).toBeGreaterThan(0);
      for (const d of s2) {
        expect(
          isMultipleOf8811(d.atkPct),
          `atkPct ${d.atkPct} not ×88.11`
        ).toBe(true);
      }
    });

    it('neither flavor cores — the explosion is skill damage (owner footage ruling 2026-08-04)', () => {
      expect(
        attach.every((d) => d.coreEligible === false),
        'attachment must not core'
      ).toBe(true);
      expect(
        explode.every((d) => d.coreEligible === false),
        'explosion must not core'
      ).toBe(true);
    });

    it('both flavors crit-eligible (the stored explosion is NOT crit-exempt)', () => {
      expect(attach.every((d) => d.critEligible)).toBe(true);
      expect(explode.every((d) => d.critEligible)).toBe(true);
    });

    it('DISCRIMINATING: removing the storedHit erases every explosion-flavor instance', () => {
      const explodeGone = rrhDmg(hNoExpl.events, 'skill2').filter((d) =>
        near(d.mult.projFactor, PROJ_EXPLODE)
      );
      expect(explodeGone).toEqual([]);
      expect(hNoExpl.totals[SLUG]).toBeLessThan(hBase.totals[SLUG]);
    });
  });

  describe('RRH5 — burst Stage 3: 2808% of final ATK, flighted INSIDE the FB window, once per cast', () => {
    const nukes = rrhDmg(hBase.events, 'burst');
    const casts = rrhBursts(hBase.events);

    it('fires once per burst cast at the kit magnitude, in the burst bucket', () => {
      expect(casts.length).toBeGreaterThan(0);
      expect(nukes.length).toBe(casts.length);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([2808]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('takes the +50% Full Burst major (it lands ~0.4s after the cast, inside the window)', () => {
      expect(
        nukes.every((d) => d.fbMajorApplied),
        'nuke must land inside FB'
      ).toBe(true);
      expect(nukes.every((d) => d.critEligible)).toBe(true);
    });

    it('DISCRIMINATING: removing the stage-3 block erases her burst-bucket damage', () => {
      expect(rrhDmg(hNoNuke.events, 'burst')).toEqual([]);
      expect(hNoNuke.totals[SLUG]).toBeLessThan(hBase.totals[SLUG]);
    });
  });

  describe('RRH6 — burst Stage 1: ATK ▲18.01% of caster ATK to ALL allies (noB1 only)', () => {
    const applied = rrhBuffs(nBase.events, 'casterAtkPct', NOB1_RRH);

    it('reaches all three allies for 10 sec, in noB1 (stage 1)', () => {
      expect(applied.length, 'no stage-1 casterAtkPct grant').toBeGreaterThan(
        0
      );
      for (const [, holders] of holdersPerFrame(applied)) {
        expect(holders.size, `reached ${holders.size} allies, expected 3`).toBe(
          3
        );
      }
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('is 18.01% of caster ATK (magnitude pinned vs the 11.16 counterfactual)', () => {
      const wrong = rrhBuffs(nCasterWrong.events, 'casterAtkPct', NOB1_RRH);
      expect(wrong.length).toBeGreaterThan(0);
      const ratio = applied[0].value / wrong[0].value;
      expect(ratio).toBeCloseTo(18.01 / 11.16, 4);
    });

    it('DISCRIMINATING: does NOT fire in hasB1 formation (stage-3 cast)', () => {
      expect(rrhBuffs(hBase.events, 'casterAtkPct', HASB1_RRH)).toEqual([]);
    });
  });
});
