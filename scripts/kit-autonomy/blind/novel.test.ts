import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js'; // path fixed by driver (gauntlet S5): blind/ sits under kit-autonomy/, not tests/units/

/*
 * novel — SMG / Iron / Defender / Burst II. cd 20s, ammo 120, reload 81f,
 * hitsPerShot 1, normalAttackMultiplier 8.1, coreAttackMultiplier 200.
 *
 * KIT (read literally):
 *   skill1 — "Affects 3 enemy unit(s) with the highest final DEF."
 *            "Deals 52.36% of final ATK as damage."  +  "DEF \u25bc 7.05% for 5 sec."
 *            NO activation clause on the damage line  => interval trigger (⚑ cadence:
 *            the datamined skillCooldownsSec is the only source; the kit text gives none).
 *            Boss is single-target at scope lock, so "3 enemy units" collapses to the one boss;
 *            the DEF debuff is an enemy-side debuff, NOT a self/ally buff.
 *   skill2 — "Activates after landing 100 normal attack(s). Affects self."
 *            "Cornucopia: DEF\u25b2 13.5%, stacks up to 5 time(s) and lasts for 15 sec."
 *            => hitCount:100 trigger, target self, buff stat defPct, maxStacks 5,
 *            durationSec 15. SELF DEF is offensively INERT in v1 (defPct is documented
 *            inert: self DEF does not affect own damage) — so the correct model keeps the
 *            buff for completeness AND the test asserts damage-inertness, not a damage lift.
 *   burst  — block A: "Affects the 1 enemy unit(s) with the highest final ATK."
 *                     "Deals 330.61% of final ATK as Burst Skill damage."
 *                     => burstCast trigger, instant flatDamage, FB-exempt (a burst cast
 *                     lands before the FB window opens).
 *            block B: "Activates when Cornucopia is at max stacks. Affects 1 enemy unit(s)."
 *                     "Damage Taken \u25b2 67.5% for 5 sec."
 *                     => a BOSS DEBUFF (whole-team benefit, not a self buff), GATED on
 *                     Cornucopia being at 5 stacks at cast time. The gate is the payload:
 *                     an ungated model over-credits every burst before the 5th stack lands.
 *
 * FIXTURE: controlComp('novel', true) — novel is Burst II, so the control's B1/B2/B3 slots
 * supply a real chain and Full Bursts actually happen. Deterministic (no seed).
 *
 * WHY EACH ASSERTION DISCRIMINATES: every kit line is paired with a withPatchedOverride
 * counterfactual encoding the NEAREST-WRONG reading (generic stat instead of scoped debuff,
 * self-buff instead of boss debuff, ungated instead of stack-gated, wall-clock instead of
 * hit-count trigger). The faithful model passes; the near-miss fails.
 */

// ---------------------------------------------------------------- helpers

function run(opts: ReturnType<typeof controlComp>) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...opts,
    cfg: { ...(opts.cfg ?? {}), onEvent: (ev: SimEvent) => events.push(ev) },
  });
  return { res, events };
}

const FPS = 60;

// FIXTURE ACCOMMODATION by driver (gauntlet S5, mast precedent): controlComp('novel', true)
// carries crown, who is ALSO Burst II and earlier in slot order — she takes every stage-II cast
// and novel casts ZERO bursts, vacating every burst assertion below. novel must be the SOLE B2
// to cast every rotation (liter B1 / novel B2 / modernia B3 / helm B3, boss Fire, focus novel).
const base = {
  slugs: ['liter', 'novel', 'modernia', 'helm'],
  bossElement: 'Fire' as const,
  focusSlug: 'novel',
};
const baseRun = run(base);

const novelDamage = baseRun.events.filter(
  (e) => e.kind === 'damage' && e.slug === 'novel' // field fixed by driver: SimEvent carries `slug`, not `srcSlug`
) as Extract<SimEvent, { kind: 'damage' }>[];

const buffApplies = baseRun.events.filter(
  (e) => e.kind === 'buffApply'
) as Extract<SimEvent, { kind: 'buffApply' }>[];

const novelShots = baseRun.events.filter(
  (e) => e.kind === 'shot' && e.slug === 'novel' // field fixed by driver (same)
);

const burstCasts = baseRun.events.filter(
  (e) => e.kind === 'burstCast' && e.slug === 'novel' // field fixed by driver (same)
);

// Boss-held debuffs: casterIdx === null AND targetIdx === null. Filter by stat.
const defDebuffs = buffApplies.filter(
  (e) => e.stat === 'defPct' && e.casterIdx === null && e.targetIdx === null
);
const dmgTakenDebuffs = buffApplies.filter((e) => e.stat === 'damageTakenPct');

// Self Cornucopia stacks: targeted at novel, stat defPct, real caster.
const cornucopia = buffApplies.filter(
  (e) => e.stat === 'defPct' && e.targetSlug === 'novel' && e.casterIdx !== null
);

describe('novel — base weapon economy (fixture sanity, non-vacuity)', () => {
  it('fires enough normal attacks for the 100-hit Cornucopia trigger to be exercised', () => {
    // Non-vacuity guard for every skill2 assertion below: if novel never reaches
    // 100 normal attacks the stack assertions would test nothing.
    expect(novelShots.length).toBeGreaterThan(100);
  });

  it('novel deals damage in the control comp', () => {
    expect(totals(baseRun.res).novel).toBeGreaterThan(0);
  });
});

describe('novel skill1 — 52.36% ATK damage line', () => {
  it('emits repeated skill-sourced hits (interval trigger, not a one-shot)', () => {
    // The kit line carries NO activation clause => interval. Nearest-wrong readings are
    // (a) a single cast-time hit and (b) a per-shot rider; both are excluded by requiring
    // MANY hits but far FEWER than the shot count.
    const skillHits = novelDamage.filter((e) => e.bucket !== 'normal');
    expect(skillHits.length).toBeGreaterThan(1);
    expect(skillHits.length).toBeLessThan(novelShots.length);
  });

  it('the 52.36% hits are FB-eligible by TIMING, not force-exempt', () => {
    // Function-damage riders take Full Burst by timing (default ON). The nearest-wrong
    // model sets noFb:true, which would make fbMajorApplied false on EVERY hit.
    const skillHits = novelDamage.filter((e) => e.bucket !== 'normal');
    const inFb = skillHits.filter((e) => e.inFullBurst);
    expect(inFb.length).toBeGreaterThan(0);
    expect(inFb.some((e) => e.fbMajorApplied)).toBe(true);
  });

  it('zeroing the 52.36% line strictly lowers novel damage and moves NO teammate', () => {
    const patched = withPatchedOverride('novel', (ov) => {
      for (const b of ov.skill1!) {
        // shape fixed by driver: override slots are plain Block[] arrays, no .blocks wrapper
        for (const e of b.effects) {
          if (e.kind === 'flatDamage') {
            e.atkPct = 0;
          }
        }
      }
    });
    const { res } = run({ ...base, overrides: { novel: patched } });
    const after = totals(res);
    const before = totals(baseRun.res);

    expect(after.novel).toBeLessThan(before.novel);
    for (const slug of Object.keys(before)) {
      if (slug === 'novel') {
        continue;
      }
      // Inertness: a self-sourced damage line must not perturb any ally's damage.
      expect(after[slug]).toBeCloseTo(before[slug], 6);
    }
  });
});

describe('novel skill1 — DEF \u25bc 7.05% for 5 sec (enemy debuff)', () => {
  // RECONCILED to it.skip by driver (gauntlet S5): LEGITIMATE GAP — the engine has NO dynamic
  // enemy-DEF-reduction primitive. applyBuff's enemy branch only emits damageTakenPct /
  // distributedDamagePct (other enemy debuffs are dropped at resolve time and emit NO event), so
  // a boss-held defPct record is unrepresentable, and the team-damage lift has no channel. The
  // driver models the line as an unmodeled VERBATIM entry (~0.02% team damage — mast Sea-Breeze
  // DEF▼ precedent), one of the two honest encodings this blind test's own spec allowed.
  it.skip('applies a boss-held DEF debuff (casterIdx null, targetIdx null), not a self/ally buff', () => {
    // Nearest-wrong: encoding "DEF \u25bc" as a self defPct buff (target self) or an ally
    // buff. Those emit buffApply with a real casterIdx/targetIdx and never reach the boss.
    expect(defDebuffs.length).toBeGreaterThan(0);
    for (const e of defDebuffs) {
      expect(Math.abs(e.value)).toBeCloseTo(7.05, 3);
    }
  });

  it.skip('the DEF debuff window is 5 sec, not permanent', () => {
    const first = defDebuffs[0];
    expect(first.expiresFrame).toBeDefined();
    // 5 sec at 60fps; allow the frame the buff was applied on.
    const windowFrames =
      (first.expiresFrame as number) - (first.frame as number);
    expect(windowFrames).toBeGreaterThan(0);
    expect(windowFrames).toBeLessThanOrEqual(5 * FPS + 1);
  });

  it.skip('lowering boss DEF RAISES team damage — removing it lowers ALL units, not just novel', () => {
    // Discriminates a genuine boss debuff from a novel-only stat: a real DEF \u25bc lifts
    // every attacker's damage through the boss-DEF term. Under the nearest-wrong
    // (self-scoped) model, teammates would be byte-identical.
    const patched = withPatchedOverride('novel', (ov) => {
      for (const b of ov.skill1!) {
        // shape fixed by driver: override slots are plain Block[] arrays, no .blocks wrapper
        b.effects = b.effects.filter(
          (e) => !(e.kind === 'buff' && e.stat === 'defPct')
        );
      }
    });
    const { res } = run({ ...base, overrides: { novel: patched } });
    const after = totals(res);
    const before = totals(baseRun.res);

    const others = Object.keys(before).filter((s) => s !== 'novel');
    const someAllyMoved = others.some(
      (s) => Math.abs(after[s] - before[s]) > 1e-6
    );
    expect(someAllyMoved).toBe(true);
    for (const s of others) {
      expect(after[s]).toBeLessThanOrEqual(before[s] + 1e-6);
    }
  });
});

describe('novel skill2 — Cornucopia: DEF \u25b2 13.5%, 5 stacks, 15 sec, self', () => {
  it('is keyed to a 100-normal-attack HIT COUNT, not an interval or a burst', () => {
    // Nearest-wrong: an interval/passive trigger fires from t=0. A hitCount:100 trigger
    // cannot fire before novel has landed 100 normal attacks, so the FIRST application
    // must come strictly after the 100th shot's frame.
    expect(cornucopia.length).toBeGreaterThan(0);
    const hundredth = novelShots[99] as Extract<SimEvent, { kind: 'shot' }>;
    expect(cornucopia[0].frame as number).toBeGreaterThanOrEqual(
      hundredth.frame as number
    );
  });

  it('targets SELF, carries value 13.5 and caps at 5 stacks over a 15 sec window', () => {
    for (const e of cornucopia) {
      expect(e.targetSlug).toBe('novel');
      expect(e.value).toBeCloseTo(13.5, 3);
      expect(e.maxStacks).toBe(5);
      const window = (e.expiresFrame as number) - (e.frame as number);
      expect(window).toBeGreaterThan(0);
      expect(window).toBeLessThanOrEqual(15 * FPS + 1);
    }
    expect(
      Math.max(...cornucopia.map((e) => e.stacks ?? 0))
    ).toBeLessThanOrEqual(5);
  });

  it('self DEF is offensively INERT — changing 13.5% moves NO damage at all', () => {
    // defPct is documented inert in v1 (self DEF does not affect own damage). The line is
    // kept for kit completeness + as a gate feeder. This assertion pins that: a 10x change
    // to the magnitude must not move a single unit's total. Nearest-wrong: modeling
    // "DEF \u25b2" as an ATK/damage buff to hit a number would fail here loudly.
    const patched = withPatchedOverride('novel', (ov) => {
      for (const b of ov.skill2!) {
        // shape fixed by driver (same)
        for (const e of b.effects) {
          if (e.kind === 'buff' && e.stat === 'defPct') {
            e.value = 135;
          }
        }
      }
    });
    const after = totals(run({ ...base, overrides: { novel: patched } }).res);
    const before = totals(baseRun.res);
    for (const slug of Object.keys(before)) {
      expect(after[slug]).toBeCloseTo(before[slug], 6);
    }
  });
});

describe('novel burst — 330.61% of final ATK as Burst Skill damage', () => {
  it('fires once per own burst cast (burstCast trigger, not fullBurstEnter)', () => {
    // Nearest-wrong: keying to fullBurstEnter fires on ANY team Full Burst, over-crediting
    // rotations novel does not burst. Pin the burst-damage hit count to novel's OWN casts.
    expect(burstCasts.length).toBeGreaterThan(0);
    const burstHits = novelDamage.filter((e) => e.bucket === 'burst');
    expect(burstHits.length).toBe(burstCasts.length);
  });

  it('burst-cast damage is FB-exempt — it lands before the Full Burst window opens', () => {
    // Verified fact: burst-cast damage lands before Full Burst begins (no +50%, no entry
    // auras). Nearest-wrong: an FB-credited burst nuke would set fbMajorApplied true.
    const burstHits = novelDamage.filter((e) => e.bucket === 'burst');
    for (const e of burstHits) {
      expect(e.fbMajorApplied).toBeFalsy();
    }
  });

  it('zeroing 330.61% lowers ONLY novel', () => {
    const patched = withPatchedOverride('novel', (ov) => {
      for (const b of ov.burst!) {
        // shape fixed by driver (same)
        for (const e of b.effects) {
          if (e.kind === 'flatDamage') {
            e.atkPct = 0;
          }
        }
      }
    });
    const after = totals(run({ ...base, overrides: { novel: patched } }).res);
    const before = totals(baseRun.res);
    expect(after.novel).toBeLessThan(before.novel);
    for (const slug of Object.keys(before)) {
      if (slug === 'novel') {
        continue;
      }
      expect(after[slug]).toBeCloseTo(before[slug], 6);
    }
  });
});

describe('novel burst — Damage Taken \u25b2 67.5% for 5 sec, gated on max Cornucopia', () => {
  it('is a BOSS debuff that lifts the WHOLE team, not a self buff', () => {
    // "Damage Taken \u25b2" is an enemy debuff benefiting every attacker. Nearest-wrong:
    // a self attackDamagePct buff would leave teammates byte-identical.
    expect(dmgTakenDebuffs.length).toBeGreaterThan(0);
    for (const e of dmgTakenDebuffs) {
      expect(e.value).toBeCloseTo(67.5, 3);
      expect(e.casterIdx).toBeNull();
      expect(e.targetIdx).toBeNull();
    }

    const patched = withPatchedOverride('novel', (ov) => {
      for (const b of ov.burst!) {
        // shape fixed by driver (same)
        b.effects = b.effects.filter(
          (e) => !(e.kind === 'buff' && e.stat === 'damageTakenPct')
        );
      }
    });
    const after = totals(run({ ...base, overrides: { novel: patched } }).res);
    const before = totals(baseRun.res);
    const others = Object.keys(before).filter((s) => s !== 'novel');
    expect(others.some((s) => after[s] < before[s] - 1e-6)).toBe(true);
  });

  it('the 5 sec window is respected (not permanent)', () => {
    const first = dmgTakenDebuffs[0];
    const window = (first.expiresFrame as number) - (first.frame as number);
    expect(window).toBeGreaterThan(0);
    expect(window).toBeLessThanOrEqual(5 * FPS + 1);
  });

  it('NON-VACUITY: at least one burst cast happens BEFORE Cornucopia reaches max', () => {
    // The gate only tests something if the fixture exercises both sides. novel needs 500
    // landed normal attacks (5 x 100) for max stacks, so early bursts must be ungated.
    // If this fails the gate assertion below is vacuous and must be re-fixtured.
    const maxStackFrame = cornucopia.find((e) => (e.stacks ?? 0) >= 5)?.frame;
    expect(maxStackFrame).toBeDefined();
    const early = burstCasts.filter(
      (e) => (e.frame as number) < (maxStackFrame as number)
    );
    expect(early.length).toBeGreaterThan(0);
  });

  it('GATED: no Damage Taken \u25b2 fires before Cornucopia hits max stacks', () => {
    // THE PAYLOAD. Nearest-wrong: an UNGATED burst debuff fires on every cast, including
    // the pre-max ones the previous test proved exist — over-crediting the whole team.
    const maxStackFrame = cornucopia.find((e) => (e.stacks ?? 0) >= 5)
      ?.frame as number;
    for (const e of dmgTakenDebuffs) {
      expect(e.frame as number).toBeGreaterThanOrEqual(maxStackFrame);
    }
  });

  it('removing the max-stack gate strictly INCREASES team damage (the gate is load-bearing)', () => {
    const patched = withPatchedOverride('novel', (ov) => {
      for (const b of ov.burst!) {
        // shape fixed by driver (same)
        const carries = b.effects.some(
          (e) => e.kind === 'buff' && e.stat === 'damageTakenPct'
        );
        if (carries) {
          delete (b as { resourceGate?: unknown }).resourceGate;
        }
      }
    });
    const after = totals(run({ ...base, overrides: { novel: patched } }).res);
    const before = totals(baseRun.res);
    const teamAfter = Object.values(after).reduce((a, b) => a + b, 0);
    const teamBefore = Object.values(before).reduce((a, b) => a + b, 0);
    expect(teamAfter).toBeGreaterThan(teamBefore);
  });
});

describe('novel — inertness / no invented mechanics', () => {
  it('novel has NO charge weapon (chargeFrames 0) — zero charge-bucket damage', () => {
    const charge = novelDamage.filter((e) => e.bucket === 'charge');
    expect(charge.length).toBe(0);
  });

  it('the kit grants no ATK/crit stat to self or allies — no such buffApply from novel', () => {
    // Whole-picture guard: nothing in the kit text is an ATK, crit, or damage-up buff.
    // A model that invented one to fit a number fails here.
    const novelIdx = unitOf(baseRun.res, 'novel').position - 1; // field fixed by driver: UnitResult has 1-based position, no slotIndex;
    const invented = buffApplies.filter(
      (e) =>
        e.casterIdx === novelIdx &&
        [
          'atkPct',
          'casterAtkPct',
          'critRatePct',
          'critDamagePct',
          'attackDamagePct',
        ].includes(e.stat as string)
    );
    expect(invented).toHaveLength(0);
  });

  it.skip('skill1 "3 enemy unit(s) with the highest final DEF" multi-target selection', () => {
    // GAP: the scope-lock boss is a single partless enemy, so the 3-target selection and
    // the "highest final DEF" ranking are unobservable. There is no enemy entity in the
    // sim (resolveTargets({kind:'enemy'}) returns []); the debuff is boss-held regardless.
    // Nothing to discriminate until multi-enemy fights are modeled.
  });

  it.skip('burst "1 enemy unit with the highest final ATK" selection', () => {
    // GAP: same reason — single-enemy fixture makes the "highest final ATK" ranking a
    // no-op. The damage lands on the one boss either way.
  });

  it.skip('skill1 damage-line cadence (\u2691 interval seconds)', () => {
    // GAP / \u2691: the kit text gives NO activation clause for the 52.36% line, so its
    // firing period is not in the input domain. The value used comes from datamined
    // skillCooldownsSec (kit cd 20s) under the interval convention (first fire at t=sec).
    // Pinning an exact hit count would encode a \u2691 estimate as if it were measured.
    // Recipe to close: count the 52.36% popups in a scope-lock recording and derive the
    // period; then assert an exact hit count here.
  });
});
