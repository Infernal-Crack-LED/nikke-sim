// PER-UNIT KIT SPEC — `aigis` (Aigis, Supporter/SMG/Iron, Burst II, cd 20s, ammo 120). NEW unit,
// no base counterpart; Persona-style kit (Persona - Palladion / Papillon Heart).
// Kit-autonomy gauntlet 2026-09-03. Tier 2 (burstCast-vs-fullBurstEnter; FB-end-bounded window).
//
// One assertion group per KIT LINE (A1..A4 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against).
//
// Kit (blablalink prose, data/characters.json → characters.aigis.skills, level-10 values):
//   S1 ■ battle start → self: Persona - Palladion state wrapper (continuous, unremovable) [wrapper]
//        Effect 1: Tarukaja: ATK ▲ 21.12% continuously                                   [A1]
//        Effect 2: Rakukaja: DEF ▲ 21.12% continuously                                   [A2]
//   S2 ■ when using Burst Skill (while alive) → Papillon Heart, until Full Burst ends:
//        Effect 1: all allies: Matarukaja: ATK ▲ 21.12% of the skill user's ATK           [A3]
//        Effect 2: all allies: Marakukaja: DEF ▲ 21.12% of the skill user's DEF           [UNMODELED]
//   BU ■ all enemies: 396% of final ATK as distributed damage                             [A4]
//
// UNMODELED lines (documented, not asserted — see the override's `unmodeled`):
//   - S1/S2 Persona state wrappers ("continuous and cannot be removed"): named state containers
//     with no engine primitive; every effect they wrap IS modeled. "Cannot be removed" reads
//     UNDISPELLABLE, not unending — S2's own deactivation condition ends it.
//   - S2 Effect 2 Marakukaja (DEF ▲ 21.12% of the skill user's DEF, all allies): the schema has no
//     caster-DEF-scaled stat key (defPct is the TARGET'S own DEF %, a different basis) and DEF has
//     no consumer in the v1 engine, so the line is verbatim in unmodeled with a recipe.
//
// Why each assertion discriminates:
//   A1   applies ONCE at t=0 with NO expiry; a "for 10 sec" counterfactual carries an expiry, and
//        removal moves her total.
//   A2   the DEF buff must EXIST as its exact stat (silent-drop counterfactual has no event) and be
//        inert: totals byte-identical with/without it. Inert BY MECHANISM — no engine reader
//        consumes defPct (types.ts: "inert in v1"), so there is no enabling teammate to seat.
//   A3   the team ATK grant keys to HER OWN cast: on the main fixture she casts every rotation and
//        every application lands on the cast frame; on the BENCHED fixture (crown holds the slot
//        ahead of her — both 20s cd, first-ready → slot order) she NEVER casts and the grant never
//        fires, while the fullBurstEnter counterfactual fires on every Full Burst there. The value
//        is a FLAT add of 21.12% of HER static ATK (casterAtkPct re-emits flat), uniform across all
//        four targets, SELF INCLUDED; the window ends exactly on the Full-Burst-end frame (652f
//        after a Burst II cast on the plain rotation). Counterfactuals: self-only / excludeSelf
//        (target set), permanent (no expiry), target-scaled atkPct (helm's own ATK ≠ aigis's).
//   A4   kit magnitude, burst bucket, once per cast, distributed-flavored, crit-eligible, and NO
//        +50% Full Burst major — the cast lands 22f before FB opens; a fullBurstEnter-keyed nuke
//        would take the major.
//
// Fixture (main): liter (B1) / aigis (B2) / `scarlet` (AR/Electric, B3) / `helm` (SR/Water, B3, alternating burst partner so
// every ~20s rotation completes a Full Burst — a lone 40s-cd B3 leaves every other chain without
// one), boss Fire (neutral for Iron), focus scarlet. Fixture (benched): liter / crown / aigis / helm
// — crown wins every stage-2 cast. Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import {
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const FIGHT_FRAMES = 180 * FPS;
const WINDOW_FRAMES = 30 + 22 + 10 * FPS; // B2 cast → B3 cast → FB entry → FB end = 652

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

const MAIN = ['liter', 'aigis', 'scarlet', 'helm'];
const BENCHED = ['liter', 'crown', 'aigis', 'helm'];

function run(slugs: string[], overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs,
    bossElement: 'Fire',
    focusSlug: slugs.includes('scarlet') ? 'scarlet' : 'helm',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return {
    events,
    totals: totals(res),
    aigisIdx: slugs.indexOf('aigis'),
    aigisStaticAtk: unitOf(res, 'aigis').staticAtk,
  };
}
type Run = ReturnType<typeof run>;

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const aigisCasts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'aigis'
  );
const fbStartFrames = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart').map((e) => e.frame);
const fbEndFrames = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstEnd').map((e) => e.frame);
const aigisBuff = (r: Run, stat: string) =>
  buffs(r.events).filter((b) => b.casterIdx === r.aigisIdx && b.stat === stat);
const aigisNukes = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'aigis' && d.srcSlot === 'burst');
const uniq = <T>(xs: T[]) => [...new Set(xs)].sort();

// ---- counterfactual patches -------------------------------------------------------------------
const patch = (mutate: (ov: any) => void) =>
  withPatchedOverride('aigis', mutate);
const s1Effect = (ov: any, stat: string) => {
  const e = ov.skill1[0].effects.find((x: any) => x.stat === stat);
  if (!e) {
    throw new Error(`aigis S1 ${stat} effect missing — fixture is stale`);
  }
  return e;
};
const s2Block = (ov: any) => {
  const b = ov.skill2[0];
  if (!b || b.trigger.kind !== 'burstCast') {
    throw new Error('aigis S2 burstCast block missing — fixture is stale');
  }
  return b;
};
const burstBlock = (ov: any) => {
  const b = ov.burst[0];
  if (!b || !b.effects.some((e: any) => e.kind === 'flatDamage')) {
    throw new Error('aigis burst nuke block missing — fixture is stale');
  }
  return b;
};

/** A1 counterfactual: the self ATK line removed. */
const noS1Atk = patch((ov) => {
  s1Effect(ov, 'atkPct');
  ov.skill1[0].effects = ov.skill1[0].effects.filter(
    (e: any) => e.stat !== 'atkPct'
  );
});
/** A1 counterfactual: "continuously" misread as a 10s buff. */
const s1Timed = patch((ov) => {
  s1Effect(ov, 'atkPct').durationSec = 10;
});
/** A2 counterfactual: the DEF line silently dropped. */
const noS1Def = patch((ov) => {
  s1Effect(ov, 'defPct');
  ov.skill1[0].effects = ov.skill1[0].effects.filter(
    (e: any) => e.stat !== 'defPct'
  );
});
/** A3 counterfactual: Papillon Heart keyed to ANY team Full Burst instead of her own cast. */
const s2AsFbEnter = patch((ov) => {
  s2Block(ov).trigger = { kind: 'fullBurstEnter' };
});
/** A3 counterfactual: "all allies" collapsed to self. */
const s2SelfOnly = patch((ov) => {
  s2Block(ov).target = { kind: 'self' };
});
/** A3 counterfactual: "all allies" read as allies-except-self. */
const s2ExcludeSelf = patch((ov) => {
  s2Block(ov).target = { kind: 'allies', excludeSelf: true };
});
/** A3 counterfactual: "continuous / cannot be removed" read as permanent (no deactivation). */
const s2Permanent = patch((ov) => {
  delete s2Block(ov).effects[0].durationSec;
});
/** A3 counterfactual: "of the skill user's ATK" misread as each target's own ATK %. */
const s2OwnAtk = patch((ov) => {
  s2Block(ov).effects[0].stat = 'atkPct';
});
/** A4 counterfactual: the nuke keyed to Full Burst entry (would take the +50% major). */
const nukeAsFbEnter = patch((ov) => {
  burstBlock(ov).trigger = { kind: 'fullBurstEnter' };
});
/** A4 counterfactual: the nuke dropped. */
const noNuke = patch((ov) => {
  burstBlock(ov);
  ov.burst = [];
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const main = run(MAIN);
const benched = run(BENCHED);
const mainNoS1Atk = run(MAIN, { aigis: noS1Atk });
const mainS1Timed = run(MAIN, { aigis: s1Timed });
const mainNoS1Def = run(MAIN, { aigis: noS1Def });
const benchedFbEnter = run(BENCHED, { aigis: s2AsFbEnter });
const mainSelfOnly = run(MAIN, { aigis: s2SelfOnly });
const mainExcludeSelf = run(MAIN, { aigis: s2ExcludeSelf });
const mainPermanent = run(MAIN, { aigis: s2Permanent });
const mainOwnAtk = run(MAIN, { aigis: s2OwnAtk });
const mainNukeFbEnter = run(MAIN, { aigis: nukeAsFbEnter });
const mainNoNuke = run(MAIN, { aigis: noNuke });

const casts = aigisCasts(main.events);
const castFrames = casts.map((c) => c.frame);
const AIGIS = main.aigisIdx;

describe('aigis — kit spec', () => {
  it('fixture sanity: she casts at stage 2 on every rotation and every rotation reaches Full Burst', () => {
    expect(casts.length).toBeGreaterThanOrEqual(10);
    expect(casts.every((c) => c.stage === 2)).toBe(true);
    expect(fbStartFrames(main.events).length).toBe(casts.length);
    // the last rotation's Full Burst runs past the 180s mark, so it has no end event
    expect(fbEndFrames(main.events).length).toBeGreaterThanOrEqual(
      casts.length - 1
    );
  });

  it('benched fixture sanity: crown wins every stage-2 cast, aigis never casts', () => {
    expect(aigisCasts(benched.events)).toEqual([]);
    expect(
      benched.events.filter((e) => e.kind === 'burstCast' && e.slug === 'crown')
        .length
    ).toBeGreaterThanOrEqual(5);
    expect(fbStartFrames(benched.events).length).toBeGreaterThanOrEqual(5);
  });

  describe('A1 — S1 Tarukaja: ATK ▲ 21.12% continuously, self, from battle start', () => {
    const applied = aigisBuff(main, 'atkPct').filter((b) => b.value === 21.12);

    it('applies once at t=0, self-held, with NO expiry', () => {
      expect(applied.length).toBe(1);
      expect(applied[0].frame).toBe(0);
      expect(applied[0].targetIdx).toBe(AIGIS);
      expect(applied[0].expiresFrame).toBeNull();
    });

    it('IS LOAD-BEARING: removing it moves her total', () => {
      expect(main.totals.aigis).toBeGreaterThan(mainNoS1Atk.totals.aigis);
    });

    it('DISCRIMINATING: a timed ("for 10 sec") reading would carry an expiry', () => {
      const cf = aigisBuff(mainS1Timed, 'atkPct').filter(
        (b) => b.value === 21.12
      );
      expect(cf.length).toBe(1);
      expect(cf[0].expiresFrame).toBe(10 * FPS);
      expect(mainS1Timed.totals.aigis).toBeLessThan(main.totals.aigis);
    });
  });

  describe('A2 — S1 Rakukaja: DEF ▲ 21.12% continuously, self (kept as its stat; inert in v1)', () => {
    const applied = aigisBuff(main, 'defPct');

    it('exists as an exact defPct buff: once at t=0, self, no expiry', () => {
      expect(applied.length).toBe(1);
      expect(applied[0].value).toBe(21.12);
      expect(applied[0].frame).toBe(0);
      expect(applied[0].targetIdx).toBe(AIGIS);
      expect(applied[0].expiresFrame).toBeNull();
    });

    it('DISCRIMINATING vs a silent drop: the dropped model emits no DEF event at all', () => {
      expect(aigisBuff(mainNoS1Def, 'defPct')).toEqual([]);
    });

    it('is inert BY MECHANISM (no engine reader consumes defPct): all four totals byte-identical', () => {
      expect(mainNoS1Def.totals).toEqual(main.totals);
    });
  });

  describe('A3 — S2 Papillon Heart on HER burst cast: all allies ATK ▲ 21.12% of her ATK until Full Burst ends', () => {
    const applied = aigisBuff(main, 'casterAtkPct');

    it('fires on every one of her casts, on the cast frame, to all four allies (self included)', () => {
      expect(applied.length).toBe(4 * casts.length);
      expect(uniq(applied.map((b) => b.frame))).toEqual(uniq(castFrames));
      for (const f of castFrames) {
        expect(
          uniq(applied.filter((b) => b.frame === f).map((b) => b.targetIdx))
        ).toEqual([0, 1, 2, 3]);
      }
    });

    it('is a FLAT add of 21.12% of HER static ATK, uniform across targets', () => {
      const expected = (21.12 / 100) * main.aigisStaticAtk;
      for (const b of applied) {
        expect(b.value).toBeCloseTo(expected, 1);
      }
    });

    it('the window ends exactly on the Full-Burst-end frame (652f after a Burst II cast)', () => {
      const ends = fbEndFrames(main.events);
      let pinned = 0;
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(WINDOW_FRAMES);
        const nextEnd = ends.find((e) => e > b.frame);
        if (nextEnd === undefined) {
          // the final rotation's Full Burst ends after the fight — no end event to pin against
          expect(b.expiresFrame).toBeGreaterThan(FIGHT_FRAMES);
          continue;
        }
        expect(b.expiresFrame).toBe(nextEnd);
        pinned++;
      }
      expect(pinned).toBeGreaterThanOrEqual(4 * (casts.length - 1));
    });

    it('IS LOAD-BEARING for the team: the allies deal more with the grant than without it', () => {
      expect(main.totals.helm).toBeGreaterThan(mainSelfOnly.totals.helm);
      expect(main.totals.scarlet).toBeGreaterThan(mainSelfOnly.totals.scarlet);
    });

    it('keys to HER OWN cast: benched behind crown she never casts, so it never fires', () => {
      expect(aigisBuff(benched, 'casterAtkPct')).toEqual([]);
    });

    it('DISCRIMINATING: a fullBurstEnter reading fires on every Full Burst even when benched', () => {
      const cf = aigisBuff(benchedFbEnter, 'casterAtkPct');
      expect(cf.length).toBe(4 * fbStartFrames(benched.events).length);
      expect(uniq(cf.map((b) => b.frame))).toEqual(
        uniq(fbStartFrames(benchedFbEnter.events))
      );
      expect(benchedFbEnter.totals.helm).toBeGreaterThan(benched.totals.helm);
    });

    it('DISCRIMINATING: self-only / allies-except-self readings change the target set', () => {
      for (const f of castFrames) {
        expect(
          uniq(
            aigisBuff(mainSelfOnly, 'casterAtkPct')
              .filter((b) => b.frame === f)
              .map((b) => b.targetIdx)
          )
        ).toEqual([AIGIS]);
        expect(
          uniq(
            aigisBuff(mainExcludeSelf, 'casterAtkPct')
              .filter((b) => b.frame === f)
              .map((b) => b.targetIdx)
          )
        ).toEqual([0, 2, 3]);
      }
      expect(mainExcludeSelf.totals.aigis).toBeLessThan(main.totals.aigis);
    });

    it('DISCRIMINATING: a permanent reading has no expiry', () => {
      const cf = aigisBuff(mainPermanent, 'casterAtkPct');
      expect(cf.length).toBe(applied.length);
      expect(uniq(cf.map((b) => b.expiresFrame))).toEqual([null]);
      expect(mainPermanent.totals.helm).toBeGreaterThan(main.totals.helm);
    });

    it("DISCRIMINATING: a target-scaled ATK % (each ally's own ATK) is a different stat and moves helm", () => {
      expect(aigisBuff(mainOwnAtk, 'casterAtkPct')).toEqual([]);
      expect(
        aigisBuff(mainOwnAtk, 'atkPct').filter(
          (b) => b.value === 21.12 && b.frame > 0
        ).length
      ).toBe(4 * casts.length);
      expect(mainOwnAtk.totals.helm).not.toBe(main.totals.helm);
    });
  });

  describe('A4 — burst: 396% of final ATK as distributed damage to all enemies', () => {
    const nukes = aigisNukes(main.events);

    it('fires once per cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes.length).toBe(casts.length);
      expect(uniq(nukes.map((d) => d.frame))).toEqual(uniq(castFrames));
      expect(uniq(nukes.map((d) => d.atkPct))).toEqual([396]);
      expect(uniq(nukes.map((d) => d.bucket))).toEqual(['burst']);
    });

    it('casts BEFORE the Full Burst window opens: no +50% major, FB not yet live', () => {
      expect(uniq(nukes.map((d) => d.fbMajorApplied))).toEqual([false]);
      expect(uniq(nukes.map((d) => d.inFullBurst))).toEqual([false]);
      expect(uniq(nukes.map((d) => d.rangeApplied))).toEqual([false]);
    });

    it('is crit-eligible (engine rider convention); distributed multiplier 1 with no amp seated', () => {
      expect(uniq(nukes.map((d) => d.critEligible))).toEqual([true]);
      expect(uniq(nukes.map((d) => d.mult.distributed))).toEqual([1]);
    });

    it("is distributed-flavored and TAGGED 'allEnemies' — her clause is trina's literal amp string", () => {
      const ov = loadOverride('aigis') as any;
      const nuke = ov.burst
        .flatMap((b: any) => b.effects)
        .find((e: any) => e.kind === 'flatDamage');
      expect(nuke.flavor).toBe('distributed');
      expect(nuke.burstDesc).toBe('allEnemies');
    });

    it('DISCRIMINATING: a Full-Burst-entry-keyed nuke would take the +50% major inside FB', () => {
      const cf = aigisNukes(mainNukeFbEnter.events);
      expect(cf.length).toBeGreaterThan(0);
      expect(uniq(cf.map((d) => d.fbMajorApplied))).toEqual([true]);
      expect(uniq(cf.map((d) => d.inFullBurst))).toEqual([true]);
    });

    it('DISCRIMINATING: dropping the nuke zeroes the burst slot and lowers her total', () => {
      expect(aigisNukes(mainNoNuke.events)).toEqual([]);
      expect(mainNoNuke.totals.aigis).toBeLessThan(main.totals.aigis);
    });
  });
});
