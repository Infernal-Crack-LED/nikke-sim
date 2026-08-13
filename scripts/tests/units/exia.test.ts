// PER-UNIT KIT SPEC — `exia` (Exia (Treasure), Supporter/SR/Electric, Burst I, cd 20s, ammo 6,
// chargeFrames 60). Kit-autonomy gauntlet 2026-07-27; test-first (TDD transition step 3).
//
// FROM-SCRATCH UNIT: exia had NO override on disk before this gauntlet (simSupported:false), so
// there is no "shipped" encoding to go RED against — every kit line is NEW. The suite asserts
// GREEN against the new encoding (src/skills/overrides/exia.json, landed at S3) and RED against
// the nearest-wrong COUNTERFACTUALS built with `withPatchedOverride` — a test that still passes
// under the nearest wrong model gates nothing.
//
// Kit (blablalink prose, data/characters.json → characters.exia.skills — the TREASURE text; the
// datamined skill1/skill2 detail templates in role.skillDetails are the untreasured base kit and
// DISAGREE with the treasure prose on trigger/value/duration, exactly like helm's favorite-item
// sync. Ground truth = the top-level prose):
//   S1 ■ last bullet hits the target, IF the skill user is in Collect Hacking Code → the target:
//        ATK ▼ 13.77% for 5 sec                                                    [X1 UNMODELED]
//        DEF ▼ 13.77% for 5 sec                                                    [X2 → X10]
//      ■ entering Full Burst → self: Reload speed FIXED at 95% increase for 10 sec [X3]
//   S2 ■ landing a Full Charge attack → self: Collect Hacking Code:
//        ATK ▲ 28%, stacks up to 5 times, 5 sec                                    [X4]
//      ■ last round hits, IF the skill user is in Collect Hacking Code →
//        all Electric Code ally units: ATK ▲ 5.8% of the skill user's ATK,
//        stacks up to 5 times, 15 sec                                              [X5]
//   BU ■ the 10 enemies with the highest final DEF: 122.32% of final ATK as damage [X6]
//        DEF ▼ 2.71% for 5 sec                                                     [X7 → X10]
//      ■ Collect Hacking Code at MAX stacks → same targets:
//        122.32% of final ATK as additional damage                                 [X8]
//        Damage Taken ▲ 18.04% for 10 sec                                          [X9]
//
// X1 (enemy ATK ▼) is UNMODELED by design, not dropped: no incoming-damage model, so an enemy
// ATK ▼ moves nothing — it lives VERBATIM in `unmodeled` and carries no assertion. X2/X7 (the
// two DEF ▼ lines) are ENCODED since 2026-08-10 on the enemy defPct channel (bossDefNow scales
// cfg.bossDef; the graded surfaces run DEF 140, so the shave is live but sub-0.1%) — pinned by
// the X10 group; X4's arms strip the shave to keep its baseAtk ramp read clean.
//
// Encoding under test (src/skills/overrides/exia.json):
//   - Collect Hacking Code is a declared RESOURCE POOL `hackingCode` [0..5]: +1 per shotFired
//     (SR = one full charge per pull — helm/liberalio precedent), clamped at 5.
//   - X4 = passive self atkPct buff with perResource {hackingCode, mult:28} — LIVE stacks×28%,
//     so the ramp is observable shot-by-shot (magazine 0 rises for 6 pulls, then plateaus).
//   - X5 = lastBullet → alliesOfElement Electric (self-inclusive: the kit says "ally unit(s)",
//     never "except self"), resourceGate {min:1} ("in Collect Hacking Code"), casterAtkPct 5.8
//     maxStacks 5 / 15s.
//   - X8/X9 = burstCast blocks under resourceGate {min:5} ("at max stacks").
//
// Why each assertion discriminates:
//   X3  a removed-block run must leave her reload gaps untouched — proven behaviourally by the
//       shot COUNT (faster reloads → more pulls in 180s). "Fixed at" clamp semantics ARE encoded,
//       via the dedicated `reloadSpeedClamp` stat that the reload-frame path prefers over any
//       additive `reloadSpeedPct` buff. What these assertions cannot discriminate is clamp vs
//       additive: no other reload buff exists in this fixture, so the two coincide here (⚑).
//   X4  the ramp is the discriminator: an INSTANT-MAX counterfactual (+140% from shot 1) and a
//       NO-STACKS counterfactual (+0% forever) both produce a FLAT magazine-0 baseAtk sequence;
//       only the live perResource pool rises for six pulls and then holds. baseAtk (ATK after
//       the flat boss-DEF subtraction) is read, not amount, so the FB +50% major / Damage Taken
//       windows (Damage-Up / Taken buckets) cannot contaminate the ramp. The 2.4× shot-6/shot-1
//       ratio pins the 28%×5 magnitude. The pool's missing 5-sec per-stack DECAY is ⚑: at her
//       1.37s fire cadence a stack never lapses before the next refresh, so the steady state
//       (permanent max after 6 pulls) is identical to duration-refresh semantics; diverges only
//       if she stops firing >5s, which never occurs in continuous combat.
//   X5  the scope is the discriminator: an all-allies counterfactual must reach crown (Iron) and
//       helm (Water); shipped reaches ONLY exia + ada (the two Electric allies). The gate is the
//       other: NO-STACKS never opens resourceGate{min:1} → zero applications. The asserted VALUE
//       is the flat-resolved grant (0.058×exia staticAtk per stack): casterAtkPct resolves
//       against the caster's static ATK at apply time, so the raw 5.8 never appears in the log.
//   X6  both burst hits share the 122.32 magnitude; the cast lands BEFORE the FB window opens,
//       so neither takes the +50% major (verified fact, 2026-07-13; helm H7 precedent).
//   X8  the gate is the discriminator, and the fixture's opener makes it VISIBLE: pulls 1-5 land
//       at 1.12/2.48/3.85/5.22/6.58s (stacks max at 6.58s) but the focused-SR opener casts at
//       4.37s — so shipped lands ONE hit on the opener (gate closed) and TWO on every later cast
//       (gate open), and NO-STACKS lands ONE on all. A gate keyed to ≥1 stack — or an ungated
//       rider — would double the opener too and fail the first assertion.
//   X9  gated like X8 (same ■ block): one boss debuff per POST-max cast (casts−1 in the fixture),
//       10s window; enemy buffs log with null caster/target indices, so ownership is read off the
//       event key's caster-slot prefix. Proven load-bearing by the team TOTAL delta vs the
//       block-removed run (~18% × ~50% uptime is not small).
//
// Fixture: exia (B1) / crown (B2) / ada (B3) / helm (B3), boss Fire, focus exia (focused SR
// sustains her 20s burst CD). liter is ABSENT — she is also Burst I and would contest the chain
// opener. ada + helm are the Electric/Water B3 pair; only ada is Electric, which is what makes
// the X5 scope check non-trivial (two receivers, two non-Electric non-receivers). Crown's own
// S1 casterAtkPct ATK share is ISOLATED OUT of every run (crownNoShare): it lands on exia
// mid-magazine-0 and would mask the X4 ramp (helm H8 isolation precedent). Deterministic
// (no seed → expected-value pass; per-shot baseAtk is smooth, no crit noise).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
/** Slot order: exia 0 / crown 1 / ada 2 / helm 3. */
const EXIA = 0;
const CROWN = 1;
const ADA = 2;
const HELM = 3;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: ['exia', 'crown', 'ada', 'helm'],
    bossElement: 'Fire',
    focusSlug: 'exia',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res), res };
}

// ---- counterfactual patches -------------------------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** NO-STACKS: the resource pool never accrues. Kills X4's ramp (perResource reads 0 forever),
 *  and the min:1 / min:5 gates (X5, X8, X9) never open. The nearest wrong model for every
 *  gate/ramp assertion: a Collect Hacking Code that never collects. */
const exiaNoStacks = withPatchedOverride('exia', (ov) => {
  let removed = 0;
  for (const k of ['skill1', 'skill2', 'burst'] as const) {
    for (const b of ov[k]) {
      const before = b.effects.length;
      b.effects = b.effects.filter((e: any) => e.kind !== 'resource');
      removed += before - b.effects.length;
    }
    ov[k] = ov[k].filter((b: any) => b.effects.length > 0);
  }
  if (!removed) {
    throw new Error(
      'exia hackingCode resource effect missing — fixture is stale'
    );
  }
  // keep this arm's baseAtk reads shave-free too (the S1 defPct block is resourceGate-shut
  // here anyway — min:1 with no pool — but the burst −2.71 would still fire per cast)
  ov.skill1 = ov.skill1.filter(
    (b: any) => !b.effects.some((e: any) => e.stat === 'defPct')
  );
  for (const b of ov.burst) {
    b.effects = b.effects.filter((e: any) => e.stat !== 'defPct');
  }
});

/** INSTANT-MAX: X4 as a flat always-on +140% (no ramp). The nearest wrong model for the
 *  stack-ramp assertion — the steady state is right, the opening seconds are not. */
const exiaInstantMax = withPatchedOverride('exia', (ov) => {
  const block = ov.skill2.find((b: any) =>
    b.effects.some((e: any) => e.perResource)
  );
  if (!block) {
    throw new Error('exia perResource ATK block missing — fixture is stale');
  }
  block.effects = [{ kind: 'buff', stat: 'atkPct', value: 140 }];
  // shave-free baseAtk reads for X4's flatness assertion (same reason as exiaNoDefShave)
  ov.skill1 = ov.skill1.filter(
    (b: any) => !b.effects.some((e: any) => e.stat === 'defPct')
  );
  for (const b of ov.burst) {
    b.effects = b.effects.filter((e: any) => e.stat !== 'defPct');
  }
});

/** NO-DEF-SHAVE: the S1 enemy defPct −13.77 block removed (encoded 2026-08-10, DEF ▼ channel).
 *  X4 reads `baseAtk`, which the shave moves during post-lastBullet windows at the harness's
 *  DEF-140 basis — this arm restores X4's uncontaminated ATK-ramp observable. The shave itself
 *  is pinned by its own group below (X10). */
const exiaNoDefShave = withPatchedOverride('exia', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !b.effects.some((e: any) => e.stat === 'defPct')
  );
  if (ov.skill1.length !== before - 1) {
    throw new Error('exia S1 defPct block missing — fixture is stale');
  }
});

/** ALL-ALLIES: X5 un-scoped. The nearest wrong model for the Electric-only scope assertion. */
const exiaAllAllies = withPatchedOverride('exia', (ov) => {
  const block = ov.skill2.find((b: any) => hasStat(b, 'casterAtkPct'));
  if (!block) {
    throw new Error('exia casterAtkPct block missing — fixture is stale');
  }
  block.target = { kind: 'allies' };
});

/** X3 removed: no FB-entry reload-speed clamp. */
const exiaNoReload = withPatchedOverride('exia', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'reloadSpeedClamp'));
  if (ov.skill1.length === before) {
    throw new Error('exia reloadSpeedClamp block missing — fixture is stale');
  }
});

/** X9 removed: no Damage Taken window. */
const exiaNoTaken = withPatchedOverride('exia', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasStat(b, 'damageTakenPct'));
  if (ov.burst.length === before) {
    throw new Error('exia damageTakenPct block missing — fixture is stale');
  }
});

/** ISOLATION (runs in EVERY run, like helm's crownNoHeal): crown's S1 grants a
 *  casterAtkPct ATK share (64.51% of crown's ATK) that lands on exia mid-magazine-0 and would
 *  mask the X4 ramp — a flat +51.8k step between pulls 4 and 5 dwarfs the 28%-of-~99.7k ramp
 *  increments. Removing crown's casterAtkPct effect leaves exia's OWN ATK movement (the
 *  hackingCode ramp + her Electric-ally share) as the only thing moving her baseAtk. Damage-only
 *  — gauge is per-shot, so cast/FB timing is untouched. */
const crownNoShare = withPatchedOverride('crown', (ov) => {
  let removed = 0;
  for (const k of ['skill1', 'skill2', 'burst'] as const) {
    for (const b of ov[k]) {
      const before = b.effects.length;
      b.effects = b.effects.filter((e: any) => e.stat !== 'casterAtkPct');
      removed += before - b.effects.length;
    }
    ov[k] = ov[k].filter((b: any) => b.effects.length > 0);
  }
  if (!removed) {
    throw new Error('crown casterAtkPct block missing — fixture is stale');
  }
});

// ---- runs (hoisted: each is a full 180s EV sim; crown's ATK share isolated out of all) --------
const base = run({ crown: crownNoShare });
const noStacks = run({ exia: exiaNoStacks, crown: crownNoShare });
const instantMax = run({ exia: exiaInstantMax, crown: crownNoShare });
const noDefShave = run({ exia: exiaNoDefShave, crown: crownNoShare });
const allAllies = run({ exia: exiaAllAllies, crown: crownNoShare });
const noReload = run({ exia: exiaNoReload, crown: crownNoShare });
const noTaken = run({ exia: exiaNoTaken, crown: crownNoShare });

/** exia's static ATK on the scope-lock basis — casterAtkPct buffs flat-resolve against it at
 *  apply time (sim.ts `(e.value/100)×owner.staticAtk`), so the emitted buffApply value is
 *  0.058×staticAtk per stack, NOT the kit percentage. Same float expression ⇒ bit-identical. */
const EXIA_STATIC_ATK = (() => {
  const u = base.res.units.find((x) => x.slug === 'exia');
  if (!u) {
    throw new Error('exia missing from her own fixture');
  }
  return u.staticAtk;
})();
const SHARE_PER_STACK = (5.8 / 100) * EXIA_STATIC_ATK;

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const exiaShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'exia');
const exiaNormalDmg = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'exia' && d.bucket === 'normal');
const exiaBurstDmg = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'exia' && d.bucket === 'burst');
const exiaCasts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'exia'
  );
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart');

describe('exia (Treasure) — kit spec', () => {
  describe('fixture health — she bursts, and Full Bursts happen', () => {
    it('exia casts her burst and chains complete, repeatedly', () => {
      expect(exiaCasts(base.events).length).toBeGreaterThanOrEqual(4);
      expect(fbStarts(base.events).length).toBeGreaterThanOrEqual(4);
      expect(exiaShots(base.events).length).toBeGreaterThan(60);
    });

    it('one normal-bucket damage instance per SR pull (the zip basis)', () => {
      expect(exiaNormalDmg(base.events).length).toBe(
        exiaShots(base.events).length
      );
    });
  });

  describe('X3 — S1 FB-entry reload speed is clamped at 95% for 10s, self-only', () => {
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === EXIA && b.stat === 'reloadSpeedClamp'
    );

    it('fires once per Full Burst, at the kit magnitude, on herself, for 10s', () => {
      expect(applied.length).toBe(fbStarts(base.events).length);
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([95]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([EXIA]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('is load-bearing: removing it costs her shots across the fight', () => {
      expect(exiaShots(base.events).length).toBeGreaterThan(
        exiaShots(noReload.events).length
      );
    });
  });

  describe('X4 — S2 Collect Hacking Code ramps self ATK +28% per stack to 5', () => {
    // baseAtk (ATK after the flat boss-DEF subtraction), NOT amount: the FB major and the
    // Damage Taken window live in other buckets and must not contaminate the ramp read.
    // All X4 arms run WITHOUT the S1/burst enemy defPct blocks (encoded 2026-08-10): the DEF ▼
    // shave moves baseAtk during its windows at the harness's DEF-140 basis, which would
    // contaminate exactly this observable. The shave has its own pin group (X10).
    const mag0Base = exiaNormalDmg(noDefShave.events)
      .slice(0, 6)
      .map((d) => d.baseAtk);

    it('rises for six pulls (stacks 0→5), then plateaus within the next magazine', () => {
      for (let k = 1; k < 6; k++) {
        expect(
          mag0Base[k],
          `pull ${k + 1} baseAtk ${mag0Base[k]} did not exceed pull ${k} baseAtk ${mag0Base[k - 1]}`
        ).toBeGreaterThan(mag0Base[k - 1]);
      }
      const shots = exiaShots(noDefShave.events);
      const normals = exiaNormalDmg(noDefShave.events);
      const mag1 = shots
        .map((s, i) => (s.magIndex === 1 ? normals[i].baseAtk : null))
        .filter((v): v is number => v != null);
      expect(mag1.length).toBeGreaterThanOrEqual(6);
      expect(
        new Set(mag1.map((v) => v.toFixed(6))).size,
        'magazine-1 pulls must all sit at the capped stack value'
      ).toBe(1);
    });

    it('the shot-6/shot-1 ratio is 2.4 (28% × 5 stacks)', () => {
      const ratio = mag0Base[5] / mag0Base[0];
      expect(ratio).toBeGreaterThan(2.35);
      expect(ratio).toBeLessThan(2.45);
    });

    it('DISCRIMINATING: instant-max and no-stacks models produce a FLAT magazine 0', () => {
      const flat = (evs: SimEvent[]) =>
        new Set(
          exiaNormalDmg(evs)
            .slice(0, 6)
            .map((d) => d.baseAtk.toFixed(6))
        ).size;
      expect(flat(instantMax.events)).toBe(1);
      expect(flat(noStacks.events)).toBe(1);
      expect(flat(noDefShave.events)).toBe(6);
    });
  });

  describe('X5 — S2 last-bullet ATK share reaches ONLY Electric allies, CHC-gated', () => {
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === EXIA && b.stat === 'casterAtkPct'
    );

    it('is 5.8% of exia static ATK per stack (flat-resolved), 5-stack cap, 15s duration', () => {
      expect(applied.length).toBeGreaterThan(0);
      // the engine flat-resolves caster-scaled grants at apply time — the event carries
      // 0.058×staticAtk, not the kit percentage; that flat value IS the 5.8%-of-caster line
      expect([...new Set(applied.map((b) => b.value))]).toEqual([
        SHARE_PER_STACK,
      ]);
      expect([...new Set(applied.map((b) => b.maxStacks))]).toEqual([5]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(15 * FPS);
      }
    });

    it('reaches exia + ada (the Electric allies) and NOBODY else, stacking to cap', () => {
      expect([...new Set(applied.map((b) => b.targetIdx))].sort()).toEqual([
        EXIA,
        ADA,
      ]);
      for (const t of [EXIA, ADA]) {
        expect(
          Math.max(
            ...applied.filter((b) => b.targetIdx === t).map((b) => b.stacks)
          ),
          `target ${t} never reached the 5-stack cap`
        ).toBe(5);
      }
    });

    it('DISCRIMINATING (scope): an un-scoped buff would reach crown and helm', () => {
      const wide = buffs(allAllies.events).filter(
        (b) => b.casterIdx === EXIA && b.stat === 'casterAtkPct'
      );
      expect([...new Set(wide.map((b) => b.targetIdx))].sort()).toEqual([
        EXIA,
        CROWN,
        ADA,
        HELM,
      ]);
    });

    it('DISCRIMINATING (gate): without Collect Hacking Code it never fires', () => {
      expect(
        buffs(noStacks.events).filter(
          (b) => b.casterIdx === EXIA && b.stat === 'casterAtkPct'
        ).length
      ).toBe(0);
    });
  });

  describe('X6 — burst deals 122.32% of final ATK, pre-FB', () => {
    const nukes = exiaBurstDmg(base.events);
    const casts = exiaCasts(base.events).length;

    it('every cast lands at the kit magnitude in the burst bucket', () => {
      expect(casts).toBeGreaterThan(0);
      expect(nukes.length).toBeGreaterThanOrEqual(casts);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([122.32]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      expect(
        nukes.filter((d) => d.fbMajorApplied).map((d) => d.sec),
        'burst-cast damage must precede the FB window'
      ).toEqual([]);
    });
  });

  describe('X8 — max-stack additional damage fires only once stacks are at max', () => {
    // Hits land on the cast frame; group the burst damage under its cast.
    const hitsPerCast = (evs: SimEvent[]) =>
      exiaCasts(evs).map(
        (c) =>
          exiaBurstDmg(evs).filter((d) => Math.abs(d.frame - c.frame) <= 3)
            .length
      );

    it('the opener casts PRE-max (one hit); every later cast lands TWO', () => {
      // Fixture anatomy (deterministic): pulls 1-5 land at 1.12/2.48/3.85/5.22/6.58s, so
      // stacks hit max at 6.58s; the focused-SR opener casts at 4.37s — three pulls too
      // early. The gate doing exactly that (closed for the opener, open forever after) IS
      // the line under test.
      const perCast = hitsPerCast(base.events);
      expect(perCast.length).toBeGreaterThan(4);
      expect(perCast[0], 'the opener must cast before stacks max').toBe(1);
      expect(
        perCast.slice(1).every((n) => n === 2),
        `post-max casts must all land both hits, got [${perCast}]`
      ).toBe(true);
    });

    it('DISCRIMINATING: without stacks every cast lands only the unconditional nuke', () => {
      expect(hitsPerCast(noStacks.events).every((n) => n === 1)).toBe(true);
    });
  });

  describe('X9 — max-stack Damage Taken 18.04% for 10s on the boss', () => {
    // Enemy buffs emit with targetIdx/casterIdx null (the boss has no unit) — ownership is
    // carried by the key's caster-slot prefix. Same max-stack gate as X8: the 4.37s opener
    // casts pre-max, so exactly casts-1 debuffs land.
    const takenFrom = (evs: SimEvent[]) =>
      buffs(evs).filter(
        (b) =>
          b.stat === 'damageTakenPct' &&
          b.targetIdx === null &&
          b.key.startsWith(`${EXIA}:burst:`)
      );
    const applied = takenFrom(base.events);

    it('one boss debuff per post-max cast at the kit magnitude, 10s window', () => {
      expect(applied.length).toBe(exiaCasts(base.events).length - 1);
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([18.04]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('DISCRIMINATING: removing it moves the team total (the window is load-bearing)', () => {
      expect(takenFrom(noTaken.events).length).toBe(0);
      const sum = (t: Record<string, number>) =>
        Object.values(t).reduce((a, b) => a + b, 0);
      expect(sum(base.totals)).toBeGreaterThan(sum(noTaken.totals));
    });
  });

  describe('X10 — the two enemy DEF ▼ lines ride the defPct channel (encoded 2026-08-10)', () => {
    const defBuffs = (evs: SimEvent[], value: number) =>
      evs.filter(
        (e): e is BuffApply =>
          e.kind === 'buffApply' && e.stat === 'defPct' && e.value === value
      );

    it('S1 -13.77/5s fires per exia magazine-empty, gated on Collect Hacking Code (min 1)', () => {
      const s1 = defBuffs(base.events, -13.77).filter((b) =>
        b.key.startsWith(`${EXIA}:skill1:`)
      );
      expect(s1.length).toBeGreaterThan(0);
      for (const b of s1) {
        expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
      }
      // gate proof: with no stacks the resourceGate {min:1} never opens
      expect(
        defBuffs(noStacks.events, -13.77).filter((b) =>
          b.key.startsWith(`${EXIA}:skill1:`)
        )
      ).toEqual([]);
    });

    it('burst -2.71/5s fires once per cast INCLUDING the opener (ungated — contrast X9 casts-1)', () => {
      const bu = defBuffs(base.events, -2.71).filter((b) =>
        b.key.startsWith(`${EXIA}:burst:`)
      );
      expect(bu.length).toBe(exiaCasts(base.events).length);
      for (const b of bu) {
        expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
      }
    });
  });
});
