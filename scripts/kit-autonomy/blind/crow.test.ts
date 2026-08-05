import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

/**
 * crow — Crow (SMG/Fire/Defender/Burst III), blind kit spec test.
 *
 * KIT (ground truth, read literally):
 *   skill1: "Affects all enemies. Activates when entering Full Burst."
 *           ATK v 19.93% for 10 sec.
 *     -> trigger fullBurstEnter (team-wide FB entry, NOT ownBurstGate: the text
 *        says "entering Full Burst", not "when using Burst Skill"), target enemy,
 *        a BOSS-HELD debuff. In v1 the boss's ATK is not a damage input, so this
 *        line is offensively INERT — but it must still be encoded (completeness),
 *        and it must NOT be mis-encoded as a self/ally atkPct buff (the nearest-
 *        wrong model, which would ADD ~19.93% ATK to the team instead of being a
 *        no-op on the enemy).
 *
 *   skill2 (two blocks, SAME activation clause):
 *     a) "Activates when the last bullet hits the target. Affects the target."
 *        Deals 89.09% of final ATK as additional damage.
 *          -> trigger lastBullet, target enemy, flatDamage atkPct 89.09.
 *             Per-MAGAZINE (ammo 120, reload 121f), NOT per-shot.
 *     b) "Activates when the last bullet hits the target. Affects self."
 *        DEF ^ 12.72% for 5 sec.
 *          -> trigger lastBullet, target self, buff defPct (INERT for damage by
 *             schema note: "self DEF doesn't affect own damage"), 5 sec.
 *
 *   burst: "Affects the enemy with the highest final ATK."
 *          Deals 915.75% of final ATK as Burst Skill damage.
 *     -> trigger burstCast, target enemy (single boss == "the enemy with the
 *        highest final ATK"), flatDamage atkPct 915.75 in the burst bucket.
 *        Burst-cast damage lands BEFORE Full Burst opens (verified project fact),
 *        so it is FB-exempt by timing.
 *
 * FIXTURE: controlComp('crow', true) — Crow is Burst III, so a lone-B3 comp makes
 * ZERO full bursts; the control comp's B1+B2 make her burst actually cast and make
 * fullBurstEnter fire. Deterministic (no seed). Boss is Fire in controlComp; Crow is
 * Fire, so no elemental advantage is in play (a wash for these structural asserts).
 *
 * DISCRIMINATION STRATEGY: every FAITHFUL line gets an assertion that is GREEN under
 * the literal reading and RED under the nearest-wrong model built with
 * withPatchedOverride (a self-buff mis-scope for S1, a shotFired mis-trigger for S2a,
 * a fullBurstEnter mis-trigger for the burst). Inertness assertions pin that
 * teammates are byte-identical and that damage lands in the right bucket only.
 *
 * FLAGGED (⚑ — outside the input domain, NOT asserted as fact):
 *   - cadence tuple (pullsPerSec for the SMG) is datamine-unreliable; every
 *     magazine-count assertion below is written as a RANGE, never an exact count.
 *   - hitsPerShot 2 means "rounds" consumed per trigger pull is 2, so 120 ammo is
 *     ~60 pulls; the exact lastBullet count over 180s is cadence-dependent -> range.
 */

const SLUG = 'crow';

type Ev = SimEvent & Record<string, unknown>;

function run(opts: ReturnType<typeof controlComp>) {
  const events: Ev[] = [];
  const res = runComp({
    ...opts,
    cfg: { ...(opts.cfg ?? {}), onEvent: (ev: SimEvent) => events.push(ev as Ev) },
  });
  return { res, events };
}

const base = controlComp(SLUG, true);

// ---- hoisted runs (each is a full 180s sim) -------------------------------

const BASE = run(base);

// S1 nearest-wrong: the enemy ATK-down mis-encoded as a TEAM ATK buff of the same
// magnitude (the classic "debuff read as buff" scope error).
const S1_ASBUFF = run({
  ...base,
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill1!.blocks) {
        b.target = { kind: 'allies' };
        for (const e of b.effects) {
          if (e.kind === 'buff') {
            e.stat = 'atkPct';
            e.value = Math.abs(e.value);
          }
        }
      }
    }),
  },
});

// S1 nearest-wrong #2: keyed to burstCast instead of fullBurstEnter.
const S1_BURSTCAST = run({
  ...base,
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill1!.blocks) b.trigger = { kind: 'burstCast' };
    }),
  },
});

// S2a nearest-wrong: the 89.09% rider fired per TRIGGER PULL instead of per MAGAZINE.
const S2A_PERSHOT = run({
  ...base,
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill2!.blocks) {
        if (b.effects.some((e) => e.kind === 'flatDamage')) {
          b.trigger = { kind: 'shotFired' };
        }
      }
    }),
  },
});

// S2a removed entirely — proves the rider is load-bearing (non-vacuity).
const S2A_OFF = run({
  ...base,
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      ov.skill2!.blocks = ov.skill2!.blocks.filter(
        (b) => !b.effects.some((e) => e.kind === 'flatDamage'),
      );
    }),
  },
});

// Burst nearest-wrong: the 915.75% nuke keyed to fullBurstEnter instead of burstCast,
// which would illegitimately collect the +50% Full Burst major.
const BURST_FBENTER = run({
  ...base,
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.burst!.blocks) b.trigger = { kind: 'fullBurstEnter' };
    }),
  },
});

// Burst removed — non-vacuity for the burst bucket.
const BURST_OFF = run({
  ...base,
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      ov.burst!.blocks = ov.burst!.blocks.filter(
        (b) => !b.effects.some((e) => e.kind === 'flatDamage'),
      );
    }),
  },
});

// ---- helpers -------------------------------------------------------------

const crowIdx = (res: ReturnType<typeof runComp>) =>
  unitOf(res, SLUG) && base.units.findIndex((u: { slug: string }) => u.slug === SLUG);

const evs = (r: typeof BASE, kind: string) => r.events.filter((e) => e.kind === kind);

const crowDamage = (r: typeof BASE) =>
  evs(r, 'damage').filter((e) => (e as { srcSlug?: string }).srcSlug === SLUG ||
    (e as { srcSlot?: string }).srcSlot !== undefined);

const teammates = (res: ReturnType<typeof runComp>) => {
  const t = totals(res);
  const out: Record<string, number> = {};
  for (const k of Object.keys(t)) if (k !== SLUG) out[k] = t[k];
  return out;
};

describe('crow — fixture sanity (non-vacuity preconditions)', () => {
  it('the control comp actually casts bursts and enters Full Burst', () => {
    // A lone Burst III makes ZERO full bursts; controlComp(_, true) supplies B1/B2.
    expect(evs(BASE, 'fullBurstStart').length).toBeGreaterThan(0);
    const casts = evs(BASE, 'burstCast');
    expect(casts.length).toBeGreaterThan(0);
    // Crow herself must cast — the burst line's assertions depend on it.
    expect(
      casts.some((e) => (e as { slug?: string }).slug === SLUG ||
        (e as { targetSlug?: string }).targetSlug === SLUG ||
        JSON.stringify(e).includes(SLUG)),
    ).toBe(true);
  });

  it('crow is in the comp and deals damage', () => {
    expect(totals(BASE.res)[SLUG]).toBeGreaterThan(0);
  });

  it('crow reloads at least twice, so lastBullet is genuinely exercised', () => {
    // ammo 120 / hitsPerShot 2 => ~60 pulls per magazine; reload 121 frames.
    // ⚑ cadence is datamine-unreliable, so this is a RANGE, not an exact count.
    expect(evs(BASE, 'reload').length).toBeGreaterThanOrEqual(2);
  });
});

describe('crow skill1 — "Affects all enemies. Activates when entering Full Burst." ATK v19.93% / 10s', () => {
  it('emits a boss-held ATK-down buffApply at each Full Burst entry', () => {
    // Boss-held debuffs emit buffApply with casterIdx === null AND targetIdx === null,
    // so they are filtered by stat + value, not by index.
    const bossHeld = evs(BASE, 'buffApply').filter(
      (e) => (e as { casterIdx?: number | null }).casterIdx === null &&
        (e as { targetIdx?: number | null }).targetIdx === null,
    );
    const atkDown = bossHeld.filter(
      (e) => Math.abs(Number((e as { value: number }).value) + 19.93) < 1e-6,
    );
    const fbStarts = evs(BASE, 'fullBurstStart').length;
    expect(fbStarts).toBeGreaterThan(0);
    // One application per FB entry (the line has no everyN / no own-burst gate).
    expect(atkDown.length).toBe(fbStarts);
  });

  it('DISCRIMINATES: it is an ENEMY debuff, not a team ATK buff — mis-scoping it inflates the whole comp', () => {
    // Nearest-wrong: same magnitude applied to allies as atkPct. Under the faithful
    // reading the line is offensively inert at scope (boss ATK is not a damage input),
    // so the mis-scoped model must move the board and the faithful one must not.
    const t0 = totals(BASE.res);
    const t1 = totals(S1_ASBUFF.res);
    expect(t1[SLUG]).toBeGreaterThan(t0[SLUG]);
    // and it leaks onto teammates too — the tell-tale of the buff mis-scope
    const m0 = teammates(BASE.res);
    const m1 = teammates(S1_ASBUFF.res);
    expect(Object.keys(m0).some((k) => m1[k] > m0[k])).toBe(true);
  });

  it('DISCRIMINATES: trigger is fullBurstEnter (any team FB), not burstCast (only crow\'s own rotations)', () => {
    const faithful = evs(BASE, 'buffApply').filter(
      (e) => (e as { casterIdx?: number | null }).casterIdx === null &&
        Math.abs(Number((e as { value: number }).value) + 19.93) < 1e-6,
    ).length;
    const wrong = evs(S1_BURSTCAST, 'buffApply').filter(
      (e) => (e as { casterIdx?: number | null }).casterIdx === null &&
        Math.abs(Number((e as { value: number }).value) + 19.93) < 1e-6,
    ).length;
    // burstCast fires only on rotations crow herself bursts, and PRE-FB; the counts
    // and/or frames must differ from the FB-entry keying.
    expect(faithful).toBeGreaterThan(0);
    expect(faithful).not.toBe(wrong);
  });

  it('INERTNESS: the ATK-down moves NO damage at scope (boss ATK is not a sim input)', () => {
    // Removing the whole skill1 slot must leave every unit byte-identical.
    const noS1 = run({
      ...base,
      overrides: {
        [SLUG]: withPatchedOverride(SLUG, (ov) => {
          ov.skill1!.blocks = [];
        }),
      },
    });
    expect(totals(noS1.res)).toEqual(totals(BASE.res));
  });
});

describe('crow skill2a — "when the last bullet hits the target" -> 89.09% of final ATK', () => {
  it('fires once per magazine, matching the reload count (not once per shot)', () => {
    const reloads = evs(BASE, 'reload').length;
    const riders = evs(BASE, 'damage').filter(
      (e) => (e as { bucket?: string }).bucket === 'skill' &&
        (e as { srcSlot?: string }).srcSlot === 'skill2',
    );
    expect(riders.length).toBeGreaterThan(0);
    // lastBullet fires at magazine end; allow +-1 for a partial final magazine at
    // the 180s cutoff. ⚑ exact count is cadence-dependent (datamine-unreliable).
    expect(Math.abs(riders.length - reloads)).toBeLessThanOrEqual(1);
  });

  it('DISCRIMINATES: per-MAGAZINE, not per-PULL — the shotFired mis-trigger fires ~an order of magnitude more often', () => {
    const faithful = evs(BASE, 'damage').filter(
      (e) => (e as { srcSlot?: string }).srcSlot === 'skill2' &&
        (e as { bucket?: string }).bucket === 'skill',
    ).length;
    const wrong = evs(S2A_PERSHOT, 'damage').filter(
      (e) => (e as { srcSlot?: string }).srcSlot === 'skill2' &&
        (e as { bucket?: string }).bucket === 'skill',
    ).length;
    // ~60 pulls per magazine => the wrong model must be many times larger.
    expect(wrong).toBeGreaterThan(faithful * 5);
    expect(totals(S2A_PERSHOT.res)[SLUG]).toBeGreaterThan(totals(BASE.res)[SLUG]);
  });

  it('NON-VACUITY: removing the rider strictly lowers crow\'s total (the fixture exercises it)', () => {
    expect(totals(S2A_OFF.res)[SLUG]).toBeLessThan(totals(BASE.res)[SLUG]);
  });

  it('lands in the SKILL bucket and never cores or takes range (a flat rider, not a normal attack)', () => {
    const riders = evs(BASE, 'damage').filter(
      (e) => (e as { srcSlot?: string }).srcSlot === 'skill2' &&
        (e as { bucket?: string }).bucket === 'skill',
    );
    expect(riders.length).toBeGreaterThan(0);
    for (const r of riders) {
      // riders take no +30% range bonus (engine force-sets noRange on function damage)
      expect((r as { rangeApplied?: boolean }).rangeApplied).toBeFalsy();
      // no core unless the kit says "core strike damage" — this line does not
      expect(Number((r as { coreRate?: number }).coreRate ?? 0)).toBe(0);
    }
  });

  it('INERTNESS: the rider moves no teammate\'s damage', () => {
    expect(teammates(S2A_OFF.res)).toEqual(teammates(BASE.res));
  });
});

describe('crow skill2b — "when the last bullet hits the target. Affects self." DEF ^12.72% / 5s', () => {
  it('emits a SELF defPct buffApply on the same lastBullet trigger', () => {
    const defBuffs = evs(BASE, 'buffApply').filter(
      (e) => (e as { stat?: string }).stat === 'defPct' &&
        (e as { targetSlug?: string }).targetSlug === SLUG,
    );
    expect(defBuffs.length).toBeGreaterThan(0);
    for (const b of defBuffs) {
      expect(Number((b as { value: number }).value)).toBeCloseTo(12.72, 6);
      // self-targeted: caster and target are the same unit
      expect((b as { casterIdx?: number | null }).casterIdx).not.toBeNull();
      expect((b as { casterIdx?: number }).casterIdx).toBe(
        (b as { targetIdx?: number }).targetIdx,
      );
    }
  });

  it('shares the lastBullet cadence with the 89.09% rider (same activation clause)', () => {
    const defBuffs = evs(BASE, 'buffApply').filter(
      (e) => (e as { stat?: string }).stat === 'defPct' &&
        (e as { targetSlug?: string }).targetSlug === SLUG,
    ).length;
    const riders = evs(BASE, 'damage').filter(
      (e) => (e as { srcSlot?: string }).srcSlot === 'skill2' &&
        (e as { bucket?: string }).bucket === 'skill',
    ).length;
    expect(defBuffs).toBe(riders);
  });

  it('INERTNESS: defPct is offensively inert — removing it changes no damage anywhere', () => {
    const noDef = run({
      ...base,
      overrides: {
        [SLUG]: withPatchedOverride(SLUG, (ov) => {
          for (const b of ov.skill2!.blocks) {
            b.effects = b.effects.filter(
              (e) => !(e.kind === 'buff' && e.stat === 'defPct'),
            );
          }
          ov.skill2!.blocks = ov.skill2!.blocks.filter((b) => b.effects.length > 0);
        }),
      },
    });
    expect(totals(noDef.res)).toEqual(totals(BASE.res));
  });

  it('carries a 5-second window, not a permanent grant', () => {
    const first = evs(BASE, 'buffApply').find(
      (e) => (e as { stat?: string }).stat === 'defPct' &&
        (e as { targetSlug?: string }).targetSlug === SLUG,
    );
    expect(first).toBeDefined();
    const exp = Number((first as { expiresFrame: number }).expiresFrame);
    const frame = Number((first as { frame: number }).frame ?? 0);
    // 5 sec at 60fps = 300 frames. There is no buffRemove on natural lapse, so the
    // window is read off expiresFrame.
    expect(exp - frame).toBe(300);
    // and it is NOT a round-count duration
    expect((first as { durationShots?: number }).durationShots).toBeUndefined();
  });
});

describe('crow burst — "the enemy with the highest final ATK" -> 915.75% of final ATK', () => {
  it('emits one burst-bucket instance per crow burst cast', () => {
    const bursts = evs(BASE, 'damage').filter(
      (e) => (e as { bucket?: string }).bucket === 'burst' &&
        (e as { srcSlot?: string }).srcSlot === 'burst',
    );
    expect(bursts.length).toBeGreaterThan(0);
    // Crow's cd is 40s over a 180s fight -> a handful of casts. ⚑ the exact count is
    // rotation arithmetic, not a kit fact, so this is a RANGE.
    expect(bursts.length).toBeGreaterThanOrEqual(3);
    expect(bursts.length).toBeLessThanOrEqual(6);
  });

  it('burst damage is FB-EXEMPT by timing (the cast lands before Full Burst opens)', () => {
    const bursts = evs(BASE, 'damage').filter(
      (e) => (e as { bucket?: string }).bucket === 'burst' &&
        (e as { srcSlot?: string }).srcSlot === 'burst',
    );
    for (const b of bursts) {
      expect((b as { fbMajorApplied?: boolean }).fbMajorApplied).toBeFalsy();
    }
  });

  it('DISCRIMINATES: keyed to burstCast, not fullBurstEnter — the wrong keying collects the +50% FB major', () => {
    const wrong = evs(BURST_FBENTER, 'damage').filter(
      (e) => (e as { bucket?: string }).bucket === 'burst' &&
        (e as { srcSlot?: string }).srcSlot === 'burst',
    );
    expect(wrong.some((e) => (e as { fbMajorApplied?: boolean }).fbMajorApplied)).toBe(true);
    expect(totals(BURST_FBENTER.res)[SLUG]).toBeGreaterThan(totals(BASE.res)[SLUG]);
  });

  it('NON-VACUITY: removing the burst nuke strictly lowers crow\'s total', () => {
    expect(totals(BURST_OFF.res)[SLUG]).toBeLessThan(totals(BASE.res)[SLUG]);
  });

  it('INERTNESS: the burst nuke is single-target enemy damage — no teammate is moved', () => {
    expect(teammates(BURST_OFF.res)).toEqual(teammates(BASE.res));
  });
});

describe('crow — cross-line inertness / no invented mechanics', () => {
  it('crow grants NO ally offensive buff (her kit has no ally-facing line)', () => {
    const allyBuffs = BASE.events.filter(
      (e) => e.kind === 'buffApply' &&
        (e as { targetSlug?: string }).targetSlug !== undefined &&
        (e as { targetSlug?: string }).targetSlug !== SLUG &&
        (e as { casterIdx?: number | null }).casterIdx === crowIdx(BASE.res),
    );
    expect(allyBuffs).toHaveLength(0);
  });

  it('crow declares no weapon swap, no pierce, no DoT — nothing the kit text does not state', () => {
    const kinds = new Set(
      BASE.events
        .filter((e) => e.kind === 'damage')
        .map((e) => String((e as { bucket?: string }).bucket)),
    );
    // only normal / skill / burst buckets appear for crow's kit
    for (const k of kinds) {
      expect(['normal', 'core', 'skill', 'burst']).toContain(k);
    }
  });
});

describe.skip('crow — GAPS (unobservable / outside the input domain)', () => {
  it.skip('S1 boss ATK-down magnitude is unverifiable: v1 models no boss offense, so 19.93% has no observable consequence', () => {
    // GAP: the engine has no boss-ATK consumer. The line is encoded for completeness
    // and asserted only via its buffApply event + a strict damage-inertness check.
  });

  it.skip('SMG cadence tuple (pulls/sec) is datamine-unreliable — no exact shot/magazine count is asserted', () => {
    // GAP (ALWAYS-⚑ #1): rate_of_fire is a known-unreliable datamine field, and the
    // effective rate is frame-quantized (60/ceil(60/nominal)). Every count assertion
    // above is therefore a range or a relative comparison, never an exact number.
  });

  it.skip('"the enemy with the highest final ATK" is untestable at scope — the fight has exactly one enemy', () => {
    // GAP: single-boss scope collapses the target-selection clause to target:enemy.
    // A multi-enemy fixture would be needed to discriminate the selection rule.
  });
});
