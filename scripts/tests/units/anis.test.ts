// PER-UNIT KIT SPEC — `anis` (Anis, Tetra RL Defender, Iron, Burst II, cd 20s, ammo 6,
// chargeFrames 60 / reloadFrames 142, normalMult 65.02 / coreMult 200 / chargeMult 250,
// critRate 15 / critDamage 150, burstGaugePerShot 3.55). Kit-autonomy gauntlet 2026-08-04;
// test-first line-by-line spec.
//
// EXACT SLUG: `anis` = BASE Anis (RL/Iron Defender, Burst II) — never conflated with
// `anis-star` (RL/Electric Burst I) or `anis-sparkling-summer` (SG/Electric Supporter B3).
//
// GREENFIELD NOTE: anis shipped with NO override (simSupported:false) — before this gauntlet
// the unit could not sim at all (resolveSkills throws for prose-without-override). The usual
// "RED vs shipped override" half is therefore degenerate: the pre-override state is "does not
// run". The substance of the gate lives in the COUNTERFACTUAL half — every PIN below is GREEN
// vs the faithful encoding AND the nearest-wrong model (patched via withPatchedOverride)
// provably fails it, so each assertion discriminates rather than rubber-stamps.
//
// Kit (blablalink prose, data/characters.json → characters.anis.skills, lvl-10 values):
//   S1 "D.H. Formation"
//      ■ attacked 40 times → self: DEF ▲120% for 10 sec                          [N3a UNMODELED]
//   S2 "C.H. Formation" (skillCooldownsSec.skill2 = 30)
//      ■ self + 2 highest-FINAL-ATK allies (except user): DEF ▲80% for 5 sec     [N1]
//      ■ (same targets): equally shares damage taken for 10 sec                  [N3b UNMODELED]
//   BU "Pinpoint Missile" (burst, cd 20s)
//      ■ enemies within attack range: 156.73% of final ATK as damage             [N2]
//      ■ (same targets): DEF ▼32% for 5 sec                                      [N4 MODELED]
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model
// gates nothing):
//   N1  scope — the kit names self + the 2 highest-FINAL-ATK allies; with 4 units in the comp
//       that is exactly 3 of 4 holders per firing and NEVER liter (a Supporter's ~98k ATK sits
//       below two Attackers at ~118k). Three nearest-wrong models each provably fail: an
//       all-allies scope reaches 4 holders including liter; a dropped self-block reaches only 2
//       and never anis; and a burstCast re-key rides her ~20s cast frames instead of the 30s
//       interval grid (the datamined skill CD). INERT canary: defPct moves no damage in v1
//       (types.ts — self DEF has no offensive consumer), so removal is byte-identical; if DEF
//       ever gains a consumer this fails loudly and the line must be re-judged.
//   N2  a burst CAST lands BEFORE the Full Burst window opens (burst-cast damage is auto
//       FB-exempt, verified fact 2026-07-13), so the 156.73% nuke must never take the +50%
//       major; removal empties her burst bucket (she has no other burst line). The SL1 datamine
//       magnitude 68.57 is the wrong-skill-level nearest-wrong.
//   N3a S1's attacked-40 line is ENCODED kit-verbatim on the `attacked` trigger (makima/yulha
//       precedent; owner ruling 2026-08-13 — encode for consistency even though it is inert).
//       It is dormant BY MECHANISM, not by fixture: the engine's only caller of recordAttack is
//       the `manualAttacks` test hook, so no production comp can advance the counter. Pinned
//       from BOTH sides, because presence and dormancy are separate claims and a test of only
//       one of them would pass for the wrong reason: (a) the block ships with the kit's shape,
//       (b) it emits zero defPct-120 applications in a normal run, and (c) feeding the hook 40
//       attacks DOES fire it — so (b) proves nothing feeds the trigger, not that the encoding
//       is broken. The nearest-wrong model — hitCount 40 counting hits she DEALS (an RL at
//       ~1 pull/s reaches 40 around t≈50s) — provably produces defPct-120 applications.
//   N3b there is no damage-redistribution primitive (no incoming damage to share; bay
//       precedent) — pinned structurally: every shipped S2 effect is a defPct buff.
//   N3c/N4 the burst's DEF ▼32%/5s is MODELED as a sibling burstCast → enemy defPct block on
//       the live enemy DEF channel (bossDefNow scales cfg.bossDef, floor 0; ~0.04%/hit at the
//       scope-lock 140-DEF basis). N4 pins its cadence/magnitude/window; the channel's damage
//       math is owned by scripts/tests/engine/enemy-def-debuff.test.ts. The nearest-wrong
//       encoding — damageTakenPct 32 (a boss-taken amplifier) — would over-credit the WHOLE
//       team by ~32% during the window; the counterfactual run proves exactly that inflation,
//       and the shipped run carries no damageTakenPct application from her (viper / cocoa /
//       marciana precedent).
//
// UNMODELED ⚑s (inert here; estimate + recipe + tier in the override note/unmodeled):
//   S1 attacked-cluster — out-of-domain (incoming-damage subsystem; maiden/yulha precedent).
//   S2 damage-share   — out-of-domain (no redistribution primitive; bay precedent).
//
// Fixture (deterministic — no seed; event-log over totals where a line is scoping/timing-
// sensitive): COMP ['liter','anis','helm','ada'] — liter (B1, 20s) opens the chain, anis is
// the SOLE B2 (casts every FB cycle; the controlComp seats crown, a second B2 with a 20s cd
// that wins every same-stage selection and would starve anis to zero casts — the fixture trap
// this gauntlet's task note pre-registers; the STARVED comp below IS that probe), helm + ada
// (both B3, 40s) ALTERNATE the stage-3 slot so a Full Burst opens every ~20s. Boss Fire
// (neutral for Iron — her ×1.10 major is Electric-only), focus anis (RL = charge weapon, ×2.5
// gauge on focus). ~8 Full Bursts / anis casts in 180s; S2 fires at t=30/60/90/120/150.
//
// SECOND COMP (cast-starvation lever, aria precedent): STARVED ['liter','crown','anis','helm']
// — crown takes every stage-2 slot while FBs still open (~40s cycle on helm alone), so anis
// casts ZERO bursts: her burstCast nuke (N2) must be SILENT there while her interval S2 (N1)
// keeps firing on the battle clock. The STARVED comp also FLIPS her S2 target set: the top-2
// final ATK of {liter, crown, helm} are helm + liter (Supporter ~98k beats Defender ~78k), so
// the holders become {anis, helm, liter} — proving the byFinalAtk ranking is LIVE per-comp,
// not a static slot list.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type FbStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

// ---- fixtures ---------------------------------------------------------------------------------
const COMP = ['liter', 'anis', 'helm', 'ada'];
const ANIS = 1; // anis's slot in COMP
/** The starvation probe: crown (B2, 20s) seats the stage-2 slot ahead of anis on every
 *  rotation — the controlComp-style trap for a Burst II unit under test. */
const STARVED = ['liter', 'crown', 'anis', 'helm'];
const ANIS_STARVED = 2; // anis's slot in STARVED

function runAt(slugs: string[], overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs,
    bossElement: 'Fire',
    focusSlug: 'anis',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, res, totals: totals(res) };
}
const run = (overrides: Record<string, any> = {}) => runAt(COMP, overrides);

// ---- counterfactual patches (nearest-wrong models each PIN must discriminate against) ---------

const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** N1 reference: BOTH S2 DEF blocks removed (proves the buff channel is exactly inert). */
const anisNoDef = withPatchedOverride('anis', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'defPct'));
  if (ov.skill2.length !== before - 2) {
    throw new Error('anis S2 defPct blocks missing — fixture is stale');
  }
});

/** N1 nearest-wrong (scope): one UN-SCOPED all-allies DEF block instead of self + top-2. */
const anisAllAlliesDef = withPatchedOverride('anis', (ov) => {
  if (!ov.skill2.some((b: any) => hasStat(b, 'defPct'))) {
    throw new Error('anis S2 defPct blocks missing — fixture is stale');
  }
  ov.skill2 = [
    {
      slot: 'skill2',
      trigger: { kind: 'interval', sec: 30 },
      target: { kind: 'allies' },
      effects: [{ kind: 'buff', stat: 'defPct', value: 80, durationSec: 5 }],
    },
  ];
});

/** N1 nearest-wrong (self inclusion): only the top-2 block — the kit's "self and 2 allies"
 *  split drops her own share. */
const anisNoSelfDef = withPatchedOverride('anis', (ov) => {
  const top2 = ov.skill2.find(
    (b: any) => b.target?.kind === 'alliesTopAtk' && hasStat(b, 'defPct')
  );
  if (!top2) {
    throw new Error(
      'anis S2 alliesTopAtk defPct block missing — fixture is stale'
    );
  }
  ov.skill2 = [top2];
});

/** N1 nearest-wrong (trigger): both blocks re-keyed to HER OWN burstCast. The kit carries a
 *  30s skill cooldown and no activation clause tied to her burst; the interval encoding fires
 *  at t=30/60/90/120/150, a burstCast encoding rides her ~20s cast frames instead. */
const anisBurstKeyedDef = withPatchedOverride('anis', (ov) => {
  const blocks = ov.skill2.filter((b: any) => hasStat(b, 'defPct'));
  if (blocks.length !== 2) {
    throw new Error('anis S2 defPct blocks missing — fixture is stale');
  }
  for (const b of blocks) {
    b.trigger = { kind: 'burstCast' };
  }
});

/** N2 reference: the burst nuke removed (proves it is her burst-bucket damage source).
 *  Filters by flatDamage presence, so the sibling defPct shave block survives untouched —
 *  the counterfactual stays surgical to the nuke. */
const anisNoNuke = withPatchedOverride('anis', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'flatDamage')
  );
  if (ov.burst.length !== before - 1) {
    throw new Error('anis burst flatDamage block missing — fixture is stale');
  }
});

/** N2 nearest-wrong: the SL1 datamine magnitude 68.57 instead of the SL10 156.73. */
const anisSl1Nuke = withPatchedOverride('anis', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'flatDamage');
  if (!e) {
    throw new Error('anis burst flatDamage effect missing — fixture is stale');
  }
  e.atkPct = 68.57;
});

/** N3a nearest-wrong: S1 modeled as a hitCount-40 counter over hits she DEALS (the sim's
 *  hitCounter) — the closest available trigger to "attacked 40 times", and the wrong source:
 *  an RL at ~1 pull/s reaches 40 dealt hits mid-fight, so this encoding WOULD emit
 *  defPct-120 applications that the faithful (untriggerable) line never can. */
const anisDealtHitS1 = withPatchedOverride('anis', (ov) => {
  ov.skill1 = [
    {
      slot: 'skill1',
      trigger: { kind: 'hitCount', count: 40 },
      target: { kind: 'self' },
      effects: [{ kind: 'buff', stat: 'defPct', value: 120, durationSec: 10 }],
    },
  ];
});

/** N3c nearest-wrong: the burst's enemy DEF▼32% folded into damageTakenPct (the boss-taken
 *  amplifier bucket) — wrong mechanic AND wrong direction-of-fit: it over-credits the whole
 *  team instead of shaving the (now channel-fed) DEF subtraction. */
const anisVulnBurst = withPatchedOverride('anis', (ov) => {
  ov.burst = [
    ...ov.burst,
    {
      slot: 'burst',
      trigger: { kind: 'burstCast' },
      target: { kind: 'enemy' },
      effects: [
        { kind: 'buff', stat: 'damageTakenPct', value: 32, durationSec: 5 },
      ],
    },
  ];
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noDef = run({ anis: anisNoDef });
const allAlliesDef = run({ anis: anisAllAlliesDef });
const noSelfDef = run({ anis: anisNoSelfDef });
const burstKeyedDef = run({ anis: anisBurstKeyedDef });
const noNuke = run({ anis: anisNoNuke });
const sl1Nuke = run({ anis: anisSl1Nuke });
const dealtHitS1 = run({ anis: anisDealtHitS1 });
const vulnBurst = run({ anis: anisVulnBurst });
const starved = runAt(STARVED);

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const casts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast');
const anisCasts = (evs: SimEvent[]) =>
  casts(evs).filter((c) => c.slug === 'anis');
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e): e is FbStart => e.kind === 'fullBurstStart');

/** anis's defPct applications from her own S2 (slot differs between comps). */
const anisDefBuffs = (evs: SimEvent[], slot: number = ANIS) =>
  buffs(evs).filter(
    (b) => b.casterIdx === slot && b.stat === 'defPct' && b.value === 80
  );
const holdersAt = (bs: BuffApply[], frame: number): string[] =>
  [
    ...new Set(
      bs
        .filter((b) => b.frame === frame)
        .map((b) => b.targetSlug)
        .filter((s): s is string => s !== null)
    ),
  ].sort();
const anisNukes = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'anis' && d.srcSlot === 'burst');

describe('anis (base) — kit spec', () => {
  describe('fixture sanity', () => {
    it('anis is the sole B2 and casts her burst on every Full Burst cycle', () => {
      const cs = anisCasts(base.events);
      // ~20s FB cadence (liter 20s + anis 20s + helm/ada alternating the B3 slot) → ~8 casts;
      // the starvation trap (a second B2 seated beside her) would read 0 here.
      expect(cs.length).toBeGreaterThanOrEqual(6);
      expect([...new Set(cs.map((c) => c.stage))], 'anis is Burst II').toEqual([
        2,
      ]);
    });

    it('the comp opens Full Bursts for the whole fight', () => {
      expect(fbStarts(base.events).length).toBeGreaterThanOrEqual(6);
    });
  });

  describe('N1 — S2 grants DEF ▲80% for 5s every 30s to self + the 2 highest-FINAL-ATK allies', () => {
    const applied = anisDefBuffs(base.events);
    const firingFrames = [...new Set(applied.map((b) => b.frame))].sort(
      (a, b) => a - b
    );

    it('fires on the 30s skill-CD grid from t=30 (interval cadence)', () => {
      expect(firingFrames).toEqual([30, 60, 90, 120, 150].map((s) => s * FPS));
    });

    it('is 80% for exactly 5 sec', () => {
      expect([...new Set(applied.map((b) => b.value))]).toEqual([80]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
      }
    });

    it('reaches exactly 3 of 4 units per firing: anis + helm + ada, never liter', () => {
      expect(firingFrames.length).toBeGreaterThan(0);
      for (const f of firingFrames) {
        expect(holdersAt(applied, f), `frame ${f} holder set`).toEqual([
          'ada',
          'anis',
          'helm',
        ]);
      }
    });

    it('is INERT: removing both blocks changes NO unit\u2019s total by a single point (defPct is offensively inert in v1)', () => {
      expect(noDef.totals).toEqual(base.totals);
    });

    it('DISCRIMINATING (scope): an all-allies encoding reaches 4 holders including liter', () => {
      const wrong = anisDefBuffs(allAlliesDef.events);
      const wrongFrames = [...new Set(wrong.map((b) => b.frame))];
      expect(wrongFrames.length).toBeGreaterThan(0);
      for (const f of wrongFrames) {
        expect(holdersAt(wrong, f)).toEqual(['ada', 'anis', 'helm', 'liter']);
      }
    });

    it('DISCRIMINATING (self inclusion): a top-2-only encoding drops anis herself', () => {
      const wrong = anisDefBuffs(noSelfDef.events);
      const wrongFrames = [...new Set(wrong.map((b) => b.frame))];
      expect(wrongFrames.length).toBeGreaterThan(0);
      for (const f of wrongFrames) {
        const holders = holdersAt(wrong, f);
        expect(holders).toHaveLength(2);
        expect(holders).not.toContain('anis');
      }
    });

    it('DISCRIMINATING (trigger): a burstCast re-key rides her cast frames, not the 30s grid', () => {
      const wrong = anisDefBuffs(burstKeyedDef.events);
      const wrongFrames = [...new Set(wrong.map((b) => b.frame))].sort(
        (a, b) => a - b
      );
      const castFrames = anisCasts(base.events).map((c) => c.frame);
      expect(wrongFrames.length).toBeGreaterThanOrEqual(6);
      expect(wrongFrames.length).not.toBe(5);
      for (const f of wrongFrames) {
        expect(
          castFrames.some((cf) => Math.abs(cf - f) <= 2),
          `burst-keyed application at ${f} has no nearby anis cast`
        ).toBe(true);
      }
      // …and at least one of those frames is NOT on the 30s grid.
      expect(
        wrongFrames.some((f) => f % (30 * FPS) !== 0),
        'burst-cast frames should not all coincide with the interval grid'
      ).toBe(true);
    });
  });

  describe('N2 — burst deals 156.73% of final ATK, once per cast, BEFORE the Full Burst window', () => {
    const nukes = anisNukes(base.events);

    it('fires once per burst cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes.length).toBe(anisCasts(base.events).length);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([156.73]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      expect(
        nukes.filter((d) => d.fbMajorApplied).map((d) => d.sec),
        'burst-cast damage must precede the FB window'
      ).toEqual([]);
    });

    it('is LIVE: removing it empties her burst bucket and lowers her total', () => {
      expect(anisNukes(noNuke.events)).toEqual([]);
      expect(noNuke.totals.anis).toBeLessThan(base.totals.anis);
    });

    it('DISCRIMINATING (magnitude): the SL1 datamine 68.57 is not the shipped value', () => {
      const wrong = anisNukes(sl1Nuke.events);
      expect([...new Set(wrong.map((d) => d.atkPct))]).toEqual([68.57]);
      expect([...new Set(nukes.map((d) => d.atkPct))]).not.toEqual([68.57]);
    });
  });

  describe('N3 — UNMODELED lines are absent, and their nearest-wrong encodings provably fail', () => {
    it('N3a S1: the shipped override encodes attacked-40 → self DEF ▲120%/10s kit-verbatim', () => {
      const ov = loadOverride('anis')!;
      expect(ov.skill1).toEqual([
        {
          slot: 'skill1',
          trigger: { kind: 'attacked', count: 40 },
          target: { kind: 'self' },
          effects: [
            { kind: 'buff', stat: 'defPct', value: 120, durationSec: 10 },
          ],
        },
      ]);
    });

    it('N3a S1: no DEF-120 application appears in a normal run — nothing feeds the counter', () => {
      const fired = buffs(base.events).filter(
        (b) => b.casterIdx === ANIS && b.stat === 'defPct' && b.value === 120
      );
      expect(fired).toEqual([]);
    });

    it('N3a S1 DORMANT-NOT-BROKEN: feeding 40 attacks via the manualAttacks hook DOES fire it', () => {
      const events: SimEvent[] = [];
      const attackFrames = Array.from({ length: 40 }, (_, i) => 60 + i);
      const manualAttacks = COMP.map((_, i) =>
        i === ANIS ? attackFrames : []
      );
      runComp({
        slugs: COMP,
        bossElement: 'Fire',
        focusSlug: 'anis',
        cfg: { manualAttacks, onEvent: (e) => events.push(e) },
      });
      const fired = buffs(events).filter(
        (b) => b.casterIdx === ANIS && b.stat === 'defPct' && b.value === 120
      );
      expect(fired.length).toBe(1);
      expect(fired[0].targetIdx).toBe(ANIS);
    });

    it('N3a DISCRIMINATING: a hitCount-40 (hits DEALT) mis-model would emit DEF-120 applies', () => {
      const fired = buffs(dealtHitS1.events).filter(
        (b) => b.stat === 'defPct' && b.value === 120
      );
      expect(fired.length).toBeGreaterThan(0);
    });

    it('N3b S2 damage-share: every shipped S2 effect is a defPct buff (no redistribution primitive encoded)', () => {
      const ov = loadOverride('anis')!;
      const blocks: any[] = ov.skill2 as any[];
      expect(blocks.length).toBeGreaterThan(0);
      for (const b of blocks) {
        for (const e of b.effects) {
          expect(e.kind).toBe('buff');
          expect(e.stat).toBe('defPct');
        }
      }
    });

    it('N3c burst DEF▼32%: no damageTakenPct application from anis in the shipped run', () => {
      const vulns = buffs(base.events).filter(
        (b) => b.casterIdx === ANIS && b.stat === 'damageTakenPct'
      );
      expect(vulns).toEqual([]);
    });

    it('N3c DISCRIMINATING: a damageTakenPct-32 encoding inflates every ally\u2019s total', () => {
      for (const slug of COMP) {
        expect(
          vulnBurst.totals[slug],
          `${slug} total under the vuln counterfactual`
        ).toBeGreaterThan(base.totals[slug]);
      }
    });
  });

  describe('N4 — burst DEF ▼32%/5s rides the enemy defPct channel (encoded 2026-08-10)', () => {
    // boss-held debuff: emitted with anis's burst key prefix, 5s window, one per cast.
    // The channel's damage math is pinned by scripts/tests/engine/enemy-def-debuff.test.ts
    // (reuse-before-derive) — this group pins only her magnitude, cadence, and window.
    const shaves = buffs(base.events).filter(
      (b) => b.stat === 'defPct' && b.value === -32
    );

    it('one -32 boss debuff per burst cast, same frames, 5s window, from the burst slot', () => {
      const castFrames = anisCasts(base.events).map((c) => c.frame);
      expect(shaves.length).toBe(castFrames.length);
      expect(shaves.length).toBeGreaterThanOrEqual(6);
      expect(shaves.map((b) => b.frame)).toEqual(castFrames);
      for (const b of shaves) {
        expect(b.key.startsWith(`${ANIS}:burst:`)).toBe(true);
        expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
      }
    });

    it('is SILENT in the STARVED comp (cast-gated, like the nuke)', () => {
      const starvedShaves = buffs(starved.events).filter(
        (b) => b.stat === 'defPct' && b.value === -32
      );
      expect(starvedShaves).toEqual([]);
    });
  });

  describe('the STARVED comp — cast-gated lines silent, interval lines live, ranking flips', () => {
    it('fixture: crown takes every stage-2 slot, anis casts nothing, FBs still open', () => {
      expect(anisCasts(starved.events).length).toBe(0);
      expect(
        casts(starved.events).filter((c) => c.slug === 'crown').length
      ).toBeGreaterThan(3);
      expect(fbStarts(starved.events).length).toBeGreaterThanOrEqual(3);
    });

    it('N2 is SILENT: no burst-bucket damage on rotations she did not cast', () => {
      expect(anisNukes(starved.events)).toEqual([]);
    });

    it('N1 STILL fires on the 30s battle clock (interval, not cast-keyed)', () => {
      const applied = anisDefBuffs(starved.events, ANIS_STARVED);
      const frames = [...new Set(applied.map((b) => b.frame))].sort(
        (a, b) => a - b
      );
      expect(frames).toEqual([30, 60, 90, 120, 150].map((s) => s * FPS));
    });

    it('N1 holders FLIP with the comp: helm + liter now outrank crown (live byFinalAtk ranking)', () => {
      const applied = anisDefBuffs(starved.events, ANIS_STARVED);
      const frames = [...new Set(applied.map((b) => b.frame))];
      expect(frames.length).toBeGreaterThan(0);
      for (const f of frames) {
        // Supporter base ATK (~98k) beats Defender (~78k), so liter takes crown's slot.
        expect(
          holdersAt(applied, f),
          `frame ${f} holder set in the starved comp`
        ).toEqual(['anis', 'helm', 'liter']);
      }
    });
  });
});
