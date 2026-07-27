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
 * BLIND per-unit kit spec test — sakura-bloom-in-summer (Sakura: Bloom in Summer)
 * AR / Wind / Attacker / Burst III. cd 40s, ammo 60, reloadFrames 81, hitsPerShot 1.
 *
 * WHAT THE KIT SAYS (structural read of the prose; the ONLY input to this file):
 *
 * skill1:
 *   S1a  "Activates at the start of battle. Affects self." -> "Forcefully uses Skill 2."
 *        => Skill 2 fires at t=0 (a force-cast opener). Per the skill-CD convention this is the
 *           FIRST fire of skill2; skill2 has no "Activates when" clause of its own, so skill2 is
 *           an INTERVAL line whose first fire is t=0 rather than t=CD.
 *   S1b  "Activates when an ally or self destroys an enemy's PART. Affects self."
 *        -> Sustained Damage ▲ 5.1% for 30 sec.
 *   S1c  same PART trigger, self, gated on "Dancing Flower status" -> Dancing Flower Duration ▲ 10.02s.
 *   S1d  same PART trigger, all enemies in "Sakura Petals" status -> Sakura Petals Duration ▲ 10.02s.
 *        => S1b/S1c/S1d ALL hang off DESTROYING AN ENEMY PART. The v1 scope-lock boss is PARTLESS
 *           (memory: "test boss has no parts"; schema: partsDamagePct is "parsed but inert in v1").
 *           There is NO 'partDestroyed' TriggerDef in the schema at all. These three lines are
 *           therefore GAPs: unmodelable primitive AND unreachable on the graded boss. They are
 *           it.skip'd, and this file asserts the CONVERSE — that no sustainedDamagePct 5.1 buff,
 *           and no duration-extension behaviour, appears in the run (a driver that keyed them to
 *           `passive` / `interval` / `hitCount` would OVER-CREDIT and fail these assertions).
 *
 * skill2:
 *   S2a  "Affects self." -> Dancing Flower: Attack Damage ▲ 15.64% for 15 sec.
 *        => attackDamagePct 15.64, durationSec 15, target self. NOT atkPct ("Attack Damage" is the
 *           Damage-Up bucket per the StatKey table), NOT team-wide.
 *   S2b  "Affects the enemy with the highest final ATK." -> Sakura Petals: 256% of final ATK as
 *        SUSTAINED damage every 1 sec for 15 sec.
 *        => dot, atkPct 256, intervalSec 1, durationSec 15, flavor 'sustained'. Single-boss fight,
 *           so "enemy with the highest final ATK" == the boss; target set is not discriminable here.
 *        NOTE (DoT-encoding trap #5): 15s duration on a REPEATING trigger MULTIPLIES. Whether the
 *        engine ends up with one long instance or a re-fired 15s instance every cadence is exactly
 *        the thing the DoT-tick-rate assertion below pins.
 *   ⛑ CADENCE: skill2 carries NO activation clause and NO stated cooldown in the prose given.
 *        The datamined skillCooldownsSec is NOT in this packet, so the interval is OUTSIDE my input
 *        domain -> ALWAYS-⛑ field (2) "a damage line the text gives no trigger for". I do NOT assert
 *        a specific interval length. I assert only what the text DOES fix: first fire at t=0 (forced
 *        by S1a), 1s tick spacing, 256% per tick, 15s per instance, and that the line RECURS.
 *
 * burst:
 *   Ba   "Affects random enemies." -> 457.14% of final ATK as damage, "Attacks sequentially 10 times."
 *        => 10 × flatDamage 457.14 on burst cast. "Sequentially" is FLAVOR-descriptive of the 10-hit
 *           volley. Burst-cast damage is FB-exempt per the noFb/range rules (a cast lands before the
 *           FB window opens) and riders take no core unless the text says "core strike".
 *   Bb   "Affects the same targets." -> 35.16% of final ATK as SUSTAINED damage every 1 sec,
 *        "stacks up to 10 times and lasts for 10 sec."
 *        => a sustained DoT: 35.16%/s, 10s, stacking to 10. The 10 stacks are supplied by the 10
 *           sequential hits of Ba landing on the same targets — i.e. ONE burst cast = 10 concurrent
 *           35.16% instances, each 10s. Nearest-wrong: a single un-stacked 35.16% instance (10× too
 *           small) or a pre-multiplied 351.6% single instance (right total, wrong stack semantics).
 *
 * FIXTURE: controlComp('sakura-bloom-in-summer', true) — liter B1 / crown B2 / sakura B3 / helm B3.
 *   A lone B3 casts ZERO bursts, so B1+B2 are REQUIRED for the burst block to fire at all. Boss is
 *   Fire; sakura is Wind, so she is NOT elementally advantaged — no advantage confound, and no
 *   bossElementGate in this kit. helm=true is kept: her buffs scale magnitudes but every assertion
 *   below is either an EVENT-SHAPE assertion (counts, spacing, stat/value of a buffApply) or a
 *   RATIO between two runs of the SAME fixture, so helm's ATK buffs cancel out.
 *
 * WHY EACH ASSERTION DISCRIMINATES: each group names the nearest-wrong model it goes RED under,
 * built with withPatchedOverride so the committed JSON is never touched.
 */

const SLUG = 'sakura-bloom-in-summer';
const FPS = 60;

type Ev = SimEvent & Record<string, any>;

function run(opts: any): { res: any; events: Ev[] } {
  const events: Ev[] = [];
  const res = runComp({
    ...opts,
    cfg: { ...(opts.cfg ?? {}), onEvent: (ev: Ev) => events.push(ev) },
  });
  return { res, events };
}

function base() {
  return controlComp(SLUG, true);
}

// ---- hoisted runs (each runComp is a full 180s sim; keep the file cheap) -------------------

const BASE = run(base());

const sakuraDamage = BASE.events.filter(
  (e) => e.kind === 'damage' && e.slug === SLUG
);
const sakuraBuffs = BASE.events.filter(
  (e) => e.kind === 'buffApply' && e.targetSlug === SLUG
);
const burstCasts = BASE.events.filter(
  (e) => e.kind === 'burstCast' && e.slug === SLUG
);

// Sustained-flavored damage from sakura only (S2b Sakura Petals + Bb burst DoT both land here).
const sustained = sakuraDamage.filter(
  (e) => e.bucket === 'sustained' || e.flavor === 'sustained'
);

describe('sakura-bloom-in-summer — skill1', () => {
  it('S1a: skill2 is force-cast at the start of battle (first Sakura Petals tick lands in the opening second, not at a cooldown)', () => {
    // "Activates at the start of battle... Forcefully uses Skill 2." The observable consequence of
    // the force-cast is that skill2's payload (the 256%/s Sakura Petals DoT, S2b) begins ticking
    // essentially immediately rather than after one skill-2 cooldown.
    //
    // NEAREST-WRONG: skill2 keyed to a plain {kind:'interval', sec:N} with the convention first-fire
    // at t=N (no force-cast opener). Under that model the first sustained tick lands at t>=N seconds.
    expect(sustained.length).toBeGreaterThan(0);
    const firstTickFrame = Math.min(...sustained.map((e) => e.frame));
    expect(firstTickFrame).toBeLessThanOrEqual(2 * FPS);
  });

  it.skip('S1b: part-destroy -> Sustained Damage +5.1% / 30s — GAP: no part-destruction trigger primitive, and the v1 boss is partless', () => {
    // There is no TriggerDef for "an ally or self destroys an enemy part" in the effect schema, and
    // the scope-lock boss has no destructible parts, so the line is both unmodelable and unreachable.
    // Belongs in the override\'s `unmodeled` field. Asserted NEGATIVELY below instead.
  });

  it.skip('S1c: part-destroy -> Dancing Flower Duration +10.02s — GAP: no part trigger AND no duration-extension primitive for a self buff', () => {
    // Extending an ALREADY-APPLIED buff\'s remaining window is not an expressible effect (there is no
    // "extend buff duration" EffectDef; fullBurstExtend only extends the FB window).
  });

  it.skip('S1d: part-destroy -> Sakura Petals Duration +10.02s — GAP: same, for a DoT instance on the enemy', () => {
    // No primitive extends a live `dot` instance\'s durationSec either.
  });

  it('S1b inertness: NO 5.1% sustainedDamagePct buff is ever applied (the part trigger never fires on a partless boss)', () => {
    // NEAREST-WRONG: a driver that could not express the part trigger and downgraded S1b to
    // {kind:'passive'} (or hitCount/interval) to "keep the stat". That silently grants a permanent
    // +5.1% Damage-Up on every sustained tick this unit deals — pure over-credit on a boss where the
    // real trigger can never fire.
    const s51 = BASE.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.stat === 'sustainedDamagePct' &&
        Math.abs((e.value ?? 0) - 5.1) < 1e-6
    );
    expect(s51).toHaveLength(0);
  });

  it('S1c/S1d inertness: no buff or DoT instance carries a 10.02s duration extension artifact', () => {
    // NEAREST-WRONG: the extensions folded into the base numbers, e.g. Dancing Flower authored as
    // 25.02s (15 + 10.02) or Sakura Petals as a 25.02s DoT. Both are unconditional grants of an
    // effect the kit gates on part destruction.
    const dancing = sakuraBuffs.filter(
      (e) =>
        e.stat === 'attackDamagePct' && Math.abs((e.value ?? 0) - 15.64) < 1e-6
    );
    for (const ev of dancing) {
      if (ev.expiresFrame == null) {continue;}
      const durSec = (ev.expiresFrame - ev.frame) / FPS;
      expect(durSec).toBeLessThan(20); // 15s, not 25.02s
    }
  });
});

describe('sakura-bloom-in-summer — skill2', () => {
  it('S2a: Dancing Flower is a SELF Attack Damage +15.64% buff for 15s (not ATK, not team-wide)', () => {
    const dancing = sakuraBuffs.filter(
      (e) =>
        e.stat === 'attackDamagePct' && Math.abs((e.value ?? 0) - 15.64) < 1e-6
    );
    expect(dancing.length).toBeGreaterThan(0);

    // SCOPE (trap #1 / question 1+4): "Affects self" — the buff must never land on a teammate.
    const onOthers = BASE.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.stat === 'attackDamagePct' &&
        Math.abs((e.value ?? 0) - 15.64) < 1e-6 &&
        e.targetSlug !== SLUG
    );
    expect(onOthers).toHaveLength(0);

    // STAT IDENTITY: "Attack Damage" is the Damage-Up bucket (attackDamagePct), NOT ATK (atkPct).
    // NEAREST-WRONG: atkPct 15.64 — same headline number, different bucket, different dilution and
    // it would feed ATK-scaled ally effects. Assert no such buff exists.
    const asAtk = sakuraBuffs.filter(
      (e) => e.stat === 'atkPct' && Math.abs((e.value ?? 0) - 15.64) < 1e-6
    );
    expect(asAtk).toHaveLength(0);

    // DURATION SEMANTICS (question 2): "for 15 sec" is wall-clock seconds, not rounds.
    const first = dancing[0];
    expect(first.durationShots == null).toBe(true);
    if (first.expiresFrame != null) {
      expect(Math.round((first.expiresFrame - first.frame) / FPS)).toBe(15);
    }
  });

  it('S2a is load-bearing: zeroing Dancing Flower strictly lowers sakura damage and leaves teammates byte-identical', () => {
    // Non-vacuity + inertness in one counterfactual. If the buff were mis-scoped to allies, the
    // teammate-identity check goes RED; if it were never applied at all, the strict inequality does.
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill2?.blocks ?? []) {
        for (const e of b.effects) {
          if (e.kind === 'buff' && e.stat === 'attackDamagePct') {e.value = 0;}
        }
      }
    });
    const { res } = run({ ...base(), overrides: { [SLUG]: patched } });

    expect(totals(res)[SLUG]).toBeLessThan(totals(BASE.res)[SLUG]);
    for (const slug of Object.keys(totals(BASE.res))) {
      if (slug === SLUG) {continue;}
      expect(totals(res)[slug]).toBeCloseTo(totals(BASE.res)[slug], 6);
    }
  });

  it('S2b: Sakura Petals is a 256%-of-final-ATK SUSTAINED DoT ticking every 1 sec (not a one-shot, not a 15-hit instant volley)', () => {
    // TICK SPACING (question 3, "every 1 sec"): consecutive Sakura-Petals ticks must sit ~60 frames
    // apart. Filter to the 256% line by multiplier so the burst\'s 35.16% DoT (Bb) cannot pollute it.
    const petals = sustained.filter((e) => nearPct(e, 256));
    expect(petals.length).toBeGreaterThan(0);

    const frames = [...new Set(petals.map((e) => e.frame))].sort(
      (a, b) => a - b
    );
    const gaps = frames.slice(1).map((f, i) => f - frames[i]);
    // Within one 15s instance the gap is exactly 1s; across instances it may be longer (the recast
    // cadence). The 1s gap must be the DOMINANT spacing — a model that fired the whole 15s payload
    // as a single lump, or ticked at 0.5s/2s, produces no 60-frame mode at all.
    const oneSec = gaps.filter((g) => g === FPS).length;
    expect(oneSec).toBeGreaterThanOrEqual(
      Math.max(5, Math.floor(gaps.length * 0.5))
    );

    // DURATION (question 2): 15 ticks per activation at 1/sec.
    // NEAREST-WRONG: durationSec authored as 15 but intervalSec left at some other value, or the
    // DoT authored as a flatDamage 256% one-shot (then there is exactly one tick per fire).
    expect(frames.length).toBeGreaterThanOrEqual(15);
  });

  it('S2b RECURS: Sakura Petals is re-applied over the fight, not a single 15s opener', () => {
    // The force-cast (S1a) fires skill2 ONCE at t=0; skill2 itself is an interval line, so the DoT
    // must reappear after its window. 15 ticks would mean exactly one instance for the whole 180s.
    //
    // ⛑ The interval LENGTH is not in the kit prose (see header) — deliberately not asserted.
    const petals = sustained.filter((e) => nearPct(e, 256));
    const frames = [...new Set(petals.map((e) => e.frame))].sort(
      (a, b) => a - b
    );
    expect(frames.length).toBeGreaterThan(15);
    // and it is not one continuous whole-fight instance either (trap #5: a duration >= fight length
    // on a repeating trigger multiplies). A real re-fire shows at least one gap > 1s.
    const gaps = frames.slice(1).map((f, i) => f - frames[i]);
    expect(gaps.some((g) => g > FPS)).toBe(true);
  });

  it('S2b inertness: Sakura Petals ticks take NO core (a DoT is never core-boosted) and are sustained-flavored, not normal-bucket', () => {
    const petals = sustained.filter((e) => nearPct(e, 256));
    for (const ev of petals) {
      expect(ev.bucket === 'sustained' || ev.flavor === 'sustained').toBe(true);
      expect(ev.coreRate == null || ev.coreRate === 0).toBe(true);
    }
  });
});

describe('sakura-bloom-in-summer — burst', () => {
  it('Ba: the burst deals TEN sequential 457.14% hits per cast (not one 4571.4% lump, not 10 hits of some other size)', () => {
    expect(burstCasts.length).toBeGreaterThan(0);

    const volley = sakuraDamage.filter((e) => nearPct(e, 457.14));
    // "Attacks sequentially 10 times" — exactly 10 hits per burst cast.
    expect(volley.length).toBe(burstCasts.length * 10);

    // NEAREST-WRONG: the 10 hits merged into a single 4571.4% hit (same total, wrong hit count —
    // and wrong under any per-hit crit roll or per-hit rider).
    const merged = sakuraDamage.filter((e) => nearPct(e, 4571.4));
    expect(merged).toHaveLength(0);
  });

  it('Ba: burst-cast damage is FB-exempt and range-exempt (a cast lands before the Full Burst window opens)', () => {
    // Per the noFb/range rule: burst-cast/instant damage is always FB-exempt, and the +30% range
    // bonus is universally OFF on riders.
    // NEAREST-WRONG: the volley authored without noFb, picking up the +50% Full-Burst major.
    const volley = sakuraDamage.filter((e) => nearPct(e, 457.14));
    expect(volley.length).toBeGreaterThan(0);
    for (const ev of volley) {
      expect(ev.fbMajorApplied).toBeFalsy();
      expect(ev.rangeApplied).toBeFalsy();
    }
  });

  it('Ba inertness: no core on the volley (the kit never says "core strike damage")', () => {
    const volley = sakuraDamage.filter((e) => nearPct(e, 457.14));
    for (const ev of volley) {
      expect(ev.coreRate == null || ev.coreRate === 0).toBe(true);
    }
  });

  it('Bb: the burst DoT is 35.16%/sec SUSTAINED, TEN concurrent stacks, 10 sec — i.e. 10 ticks-worth of 35.16% per second while live', () => {
    // "stacks up to 10 times" and the volley (Ba) lands 10 sequential hits on the same targets, so a
    // full cast puts the DoT at cap: 10 concurrent 35.16% instances for 10s = 100 tick-events of
    // 35.16% per cast.
    //
    // NEAREST-WRONG A: one un-stacked 35.16% instance -> 10 ticks per cast (10× under).
    // NEAREST-WRONG B: a single pre-multiplied 351.6% instance -> right damage total, but only 10
    //   tick events and the wrong per-tick multiplier (breaks any per-stack interaction).
    const dotTicks = sustained.filter((e) => nearPct(e, 35.16));
    expect(dotTicks.length).toBeGreaterThan(0);

    const preMultiplied = sakuraDamage.filter((e) => nearPct(e, 351.6));
    expect(preMultiplied).toHaveLength(0);

    // Per cast, the stacked model yields ~10 ticks per second while live vs ~1 for the un-stacked
    // model. Measure the busiest second of 35.16% ticks.
    const bySecond = new Map<number, number>();
    for (const ev of dotTicks) {
      const s = Math.floor(ev.frame / FPS);
      bySecond.set(s, (bySecond.get(s) ?? 0) + 1);
    }
    const busiest = Math.max(...bySecond.values());
    expect(busiest).toBeGreaterThanOrEqual(10);
  });

  it('Bb: each burst-DoT instance lasts 10 sec at 1 sec intervals', () => {
    const dotTicks = sustained.filter((e) => nearPct(e, 35.16));
    const frames = [...new Set(dotTicks.map((e) => e.frame))].sort(
      (a, b) => a - b
    );
    const gaps = frames.slice(1).map((f, i) => f - frames[i]);
    // 1s tick spacing dominates within a live window.
    expect(gaps.filter((g) => g === FPS).length).toBeGreaterThanOrEqual(5);

    // 10s duration: ticks must STOP well before the next burst (cd 40s), so there is a silent gap
    // longer than the window. NEAREST-WRONG: durationSec set to the fight length (trap #5) — then
    // the ticks never stop and no long gap exists.
    expect(gaps.some((g) => g > 10 * FPS)).toBe(true);
  });

  it('Bb non-vacuity + inertness: removing the burst DoT lowers ONLY sakura, and the volley is unaffected', () => {
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.burst?.blocks ?? []) {
        b.effects = b.effects.filter(
          (e: any) => !(e.kind === 'dot' && Math.abs(e.atkPct - 35.16) < 1e-6)
        );
      }
    });
    const { res, events } = run({ ...base(), overrides: { [SLUG]: patched } });

    expect(totals(res)[SLUG]).toBeLessThan(totals(BASE.res)[SLUG]);
    for (const slug of Object.keys(totals(BASE.res))) {
      if (slug === SLUG) {continue;}
      expect(totals(res)[slug]).toBeCloseTo(totals(BASE.res)[slug], 6);
    }

    // the 457.14% volley must be untouched by removing the DoT
    const volleyAfter = events.filter(
      (e) => e.kind === 'damage' && e.slug === SLUG && nearPct(e as Ev, 457.14)
    );
    const volleyBefore = sakuraDamage.filter((e) => nearPct(e, 457.14));
    expect(volleyAfter.length).toBe(volleyBefore.length);
  });
});

describe('sakura-bloom-in-summer — whole-unit sanity', () => {
  it('the fixture actually bursts (a lone B3 would make ZERO full bursts, voiding every burst assertion)', () => {
    expect(burstCasts.length).toBeGreaterThan(0);
    expect(BASE.events.some((e) => e.kind === 'fullBurstStart')).toBe(true);
    // and the unit is in the comp at all
    expect(unitOf(BASE.res, SLUG).totalDamage).toBeGreaterThan(0);
  });

  it('no ally-targeted buffs at all: every line in this kit reads "Affects self" or targets the enemy', () => {
    const leaked = BASE.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.casterIdx != null &&
        e.targetSlug != null &&
        e.targetSlug !== SLUG &&
        casterIsSakura(e, BASE.res)
    );
    expect(leaked).toHaveLength(0);
  });
});

// ---- helpers ------------------------------------------------------------------------------

/** Match a damage event to a kit percentage via its multiplier decomposition. */
function nearPct(ev: Ev, pct: number): boolean {
  const m = ev.mult ?? ev.atkPct ?? ev.multiplier;
  if (m == null) {return false;}
  return Math.abs(m - pct) < 0.01;
}

function casterIsSakura(ev: Ev, res: any): boolean {
  if (ev.casterSlug != null) {return ev.casterSlug === SLUG;}
  const idx = res.units?.findIndex?.((u: any) => u.slug === SLUG);
  return idx != null && idx >= 0 && ev.casterIdx === idx;
}
