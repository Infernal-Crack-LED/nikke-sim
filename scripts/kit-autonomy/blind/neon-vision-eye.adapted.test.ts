/**
 * neon-vision-eye — Neon: Vision Eye (RL / Electric / Attacker / Burst III; cd 40 s,
 * 6 rounds, 141-frame reload, 60-frame charge, normal 61.3 / core 200).
 *
 * BLIND spec test — written from the kit prose alone, with no sight of the driver's
 * override, tests or reasoning.
 *
 * STRUCTURAL READ OF THE KIT (header + Affects-clause + stat keyword before the arrow):
 *   S1a  trigger "when attacked", self — invulnerability / debuff immunity / an
 *        incoming-healing status. Purely defensive: the v1 boss deals no damage, there is
 *        no incoming-healing StatKey, and no "when attacked" trigger exists -> GAP (skipped).
 *   S1b  trigger "landing a Full Charge attack", enemy — Firepower Explosion, 437.98% of
 *        final ATK, PLUS 262.79% more while in Super Firepower status.
 *        An RL has a charge weapon: EVERY shot is a full charge, so this is a per-shot
 *        rider (shotFired / chargeCounter:1), NOT an interval or every-N proc.
 *   S2a  battle start, self — Firepower Gauge +100. LOAD-BEARING: the gauge starts FULL,
 *        so the unit's FIRST burst must take the gauge==100 (Super Firepower) branch.
 *   S2b  normal attack while in Firepower Charge, self — gauge +2 (gauge-internal).
 *   S2c  "when Firepower Charge ends", self — gauge +45 (gauge-internal; no status-end
 *        trigger primitive exists) -> GAP (skipped); only observable through the branch cadence.
 *   S2d  "when Full Burst ends" while the gauge is active, self — Burst Gauge filling speed
 *        +5% x gauge for 5 s -> a burstGenPct self-buff keyed to full-burst-END, not enter.
 *   S2e  "when entering Full Burst", self — Maximum Firepower: ATK +80.04% for 10 s, and an
 *        ADDITIONAL ATK +35.05% for 10 s under Super Firepower. Trigger identity matters:
 *        full-burst-ENTER, so the apply frame must coincide with a fullBurstStart frame
 *        (the nearest-wrong, burst-cast keying, applies strictly earlier).
 *   Ba   burst, gauge < 100, self — Firepower Charge for 10 s; gauge +1.
 *   Bb   burst, gauge == 100, self — Super Firepower: Attack Damage +45.03% for 10 s; gauge -100.
 *   Bc   burst, self, NO activation clause — Explosion Radius +200% for 10 s (no radius/hit-
 *        geometry primitive -> GAP, skipped) and Attack Damage +110.21% for 10 s
 *        (UNCONDITIONAL: fires on every one of this unit's casts).
 *
 * FIXTURE: controlComp('neon-vision-eye', true). The B1+B2 are mandatory — a lone Burst III
 * makes ZERO Full Bursts, and five of the lines above are FB- or burst-keyed, so without them
 * every assertion would read vacuously green. Helm is kept: her buffs are crit / charge-
 * flavoured and cannot forge any of the magnitudes asserted here, and no assertion reads a raw
 * damage total except the one counterfactual delta. Deterministic (no seed). Two 180 s runs.
 *
 * WHY THESE ASSERTIONS DISCRIMINATE: they read EVENTS (buffApply stat+value+frame+expiresFrame,
 * damage srcSlot, fullBurstStart/End frames), never the override's shape — so any faithful
 * encoding of the Firepower Gauge (a resource pool, an everyN branch counter, a mode) passes,
 * while each nearest-wrong model named per-test fails.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUG = 'neon-vision-eye';
const FPS = 60;

type Ev = any;

const near = (a: number, b: number, eps = 0.02) => Math.abs(a - b) <= eps;
const F = (e: Ev): number => (typeof e?.frame === 'number' ? e.frame : -1);
// srcSlot is the documented field; fall back defensively rather than silently matching nothing.
const SRC = (e: Ev): string | undefined => e?.srcSlot ?? e?.slot ?? e?.source;

function run(
  opts: ReturnType<typeof controlComp>,
  extra: Record<string, unknown> = {},
) {
  const events: Ev[] = [];
  // ADAPTATION (driver, faithful — harness-API wiring only, NOT an assertion change): the harness
  // reads onEvent from CompOptions.cfg, not the top level. The blind packet wired it top-level,
  // which the harness silently dropped (empty event log → every event assertion read 0). Route it
  // through cfg so the events actually flow; `overrides` stays a top-level CompOptions field.
  const { cfg: extraCfg, ...restExtra } = extra as any;
  const res = runComp({
    ...opts,
    ...restExtra,
    cfg: {
      ...((opts as any).cfg ?? {}),
      ...(extraCfg ?? {}),
      onEvent: (ev: SimEvent) => events.push(ev),
    },
  } as any);
  return { res, events };
}

// The override FILE is slot-keyed; the harness clone may hand back either the raw Block[] per
// slot or a CharacterSkills carrying its own blocks[]. Tolerate both — there is no top-level
// ov.blocks in either shape.
function slotBlocks(ov: Ev, slot: 'skill1' | 'skill2' | 'burst'): Ev[] {
  const s = ov?.[slot];
  return Array.isArray(s) ? s : (s?.blocks ?? []);
}

// ---------------------------------------------------------------- hoisted runs (2 x 180 s)
const BASE = run(controlComp(SLUG, true));

// Nearest-wrong for S1b: the Firepower Explosion rider does not exist at all.
const noRider = withPatchedOverride(SLUG, (ov: Ev) => {
  for (const b of slotBlocks(ov, 'skill1')) {
    for (const e of b.effects ?? []) {
      if (e.kind === 'flatDamage' || e.kind === 'dot' || e.kind === 'storedHit')
        e.atkPct = 0;
    }
  }
});
const NO_RIDER = run(controlComp(SLUG, true), {
  overrides: { [SLUG]: noRider },
});

// ---------------------------------------------------------------- derived event views
const EV: Ev[] = BASE.events;
const FB_START = EV.filter((e) => e.kind === 'fullBurstStart').map(F);
const FB_END = EV.filter((e) => e.kind === 'fullBurstEnd').map(F);
const SELF_BUFFS = EV.filter(
  (e) => e.kind === 'buffApply' && e.targetSlug === SLUG,
);
const pick = (stat: string, value?: number) =>
  SELF_BUFFS.filter(
    (e) => e.stat === stat && (value === undefined || near(e.value, value)),
  );

const B110 = pick('attackDamagePct', 110.21); // Bc, unconditional, once per own cast
const B45 = pick('attackDamagePct', 45.03); // Bb, Super Firepower branch only
const A80 = pick('atkPct', 80.04); // S2e base, every FB enter
const A35 = pick('atkPct', 35.05); // S2e Super Firepower rider only
const BGEN = pick('burstGenPct'); // S2d, FB end
const S1DMG = EV.filter((e) => e.kind === 'damage' && SRC(e) === 'skill1');

describe('neon-vision-eye — fixture non-vacuity', () => {
  it('the control comp actually full-bursts and this unit actually casts (else every FB/burst line reads vacuously)', () => {
    expect(FB_START.length).toBeGreaterThanOrEqual(3);
    expect(FB_END.length).toBeGreaterThanOrEqual(2);
    // 40 s cooldown over a 180 s fight -> at least two of this unit's own casts, which is the
    // minimum needed for the Super-vs-Charge branch alternation to be observable at all.
    expect(B110.length).toBeGreaterThanOrEqual(2);
    // the event log carries real frame numbers (guards every frame-identity assertion below
    // from passing degenerately on an undefined field)
    expect(new Set(EV.map(F)).size).toBeGreaterThan(10);
    expect(F(EV.find((e) => e.kind === 'fullBurstStart'))).toBeGreaterThan(0);
  });
});

describe('neon-vision-eye — burst: unconditional Attack Damage 110.21% / 10 s (Bc)', () => {
  it('applies on every own cast with a 10 s wall-clock window', () => {
    expect(B110.length).toBeGreaterThanOrEqual(2);
    for (const e of B110) {
      // duration semantics: SECONDS, not rounds. A 6-round RL magazine would make a
      // durationShots encoding span a reload and expire at a variable frame instead.
      expect(e.durationShots ?? undefined).toBeUndefined();
      expect(e.expiresFrame - F(e)).toBeGreaterThanOrEqual(10 * FPS - 6);
      expect(e.expiresFrame - F(e)).toBeLessThanOrEqual(10 * FPS + 6);
    }
  });

  it('is Attack Damage (Damage Up bucket), not ATK — the two burst stat lines must not be merged', () => {
    // nearest-wrong: encoding 110.21 as atkPct, or folding Bb's 45.03 into it as a single
    // 155.24 Attack Damage buff (which would also make the conditional branch unconditional).
    expect(pick('atkPct', 110.21)).toHaveLength(0);
    expect(pick('attackDamagePct', 155.24)).toHaveLength(0);
  });
});

describe('neon-vision-eye — burst: Super Firepower branch is CONDITIONAL on a full gauge (Ba/Bb + S2a)', () => {
  it('fires on the FIRST cast (the gauge starts at 100 from the battle-start line)', () => {
    expect(B45.length).toBeGreaterThanOrEqual(1);
    // The battle-start +100 means cast #1 must take the gauge==100 branch, so the conditional
    // 45.03 lands on the same frame as the unconditional 110.21 of that same cast.
    // Nearest-wrong: a gauge modelled as starting EMPTY -> the first Super lands several
    // casts later (or never), and these frames diverge.
    expect(F(B45[0])).toBe(F(B110[0]));
  });

  it('does NOT fire on every cast — the gauge is spent (-100) and must be rebuilt', () => {
    // Non-vacuity for the inactive case: with >= 2 casts observed above, a faithful model
    // must show at least one cast WITHOUT the Super branch.
    // Nearest-wrong: an unconditional 45.03 (branch gate dropped) -> counts become equal.
    expect(B45.length).toBeLessThan(B110.length);
    expect(B45.length).toBeGreaterThanOrEqual(1);
    for (const e of B45) {
      expect(e.expiresFrame - F(e)).toBeGreaterThanOrEqual(10 * FPS - 6);
      expect(e.expiresFrame - F(e)).toBeLessThanOrEqual(10 * FPS + 6);
    }
    // every Super apply coincides with one of this unit's own casts
    const castFrames = new Set(B110.map(F));
    for (const e of B45) expect(castFrames.has(F(e))).toBe(true);
  });
});

describe('neon-vision-eye — skill2: Maximum Firepower ATK 80.04% / 10 s on FULL-BURST ENTER (S2e)', () => {
  it('is keyed to full-burst entry, not to the burst cast', () => {
    expect(A80.length).toBeGreaterThanOrEqual(2);
    const starts = new Set(FB_START);
    // Nearest-wrong: keying "when entering Full Burst" to burstCast. A burst cast resolves
    // BEFORE the Full Burst window opens, so its apply frame would not be in this set.
    for (const e of A80) expect(starts.has(F(e))).toBe(true);
    for (const e of A80) {
      expect(e.expiresFrame - F(e)).toBeGreaterThanOrEqual(10 * FPS - 6);
      expect(e.expiresFrame - F(e)).toBeLessThanOrEqual(10 * FPS + 6);
    }
  });

  it('is ATK, not Attack Damage — the two buckets must not be swapped', () => {
    expect(pick('attackDamagePct', 80.04)).toHaveLength(0);
  });

  it('the Super Firepower rider (+35.05% ATK) fires only on gauge-spent rotations', () => {
    // Both the active and the inactive case must be exercised: at least one FB entry inside a
    // Super Firepower window, and at least one outside it.
    // Nearest-wrong A: the 35.05 line dropped entirely -> length 0.
    // Nearest-wrong B: the 35.05 line merged into the base (115.09) or made unconditional
    //                  -> length equals A80.length.
    expect(A35.length).toBeGreaterThanOrEqual(1);
    expect(A35.length).toBeLessThan(A80.length);
    expect(pick('atkPct', 115.09)).toHaveLength(0);
    const starts = new Set(FB_START);
    for (const e of A35) expect(starts.has(F(e))).toBe(true);
  });
});

describe('neon-vision-eye — skill2: burst-gen speed on FULL-BURST END (S2d)', () => {
  it('applies a burstGenPct self-buff at full-burst end (5 s window)', () => {
    // The magnitude is 5% x live gauge, so a faithful encoding may emit either the resolved
    // number or a perResource placeholder — assert presence + trigger identity + window only.
    // Nearest-wrong A: the line dropped (a weapon/gauge-economy line skipped as "defensive").
    // Nearest-wrong B: keyed to fullBurstEnter -> the apply frames land in FB_START instead.
    expect(BGEN.length).toBeGreaterThanOrEqual(1);
    const ends = new Set(FB_END);
    const starts = new Set(FB_START);
    for (const e of BGEN) {
      expect(ends.has(F(e))).toBe(true);
      expect(starts.has(F(e))).toBe(false);
      expect(e.expiresFrame - F(e)).toBeGreaterThanOrEqual(5 * FPS - 6);
      expect(e.expiresFrame - F(e)).toBeLessThanOrEqual(5 * FPS + 6);
    }
  });
});

describe('neon-vision-eye — skill1: Firepower Explosion 437.98% per full charge (S1b)', () => {
  it('lands once per full-charge attack, not on an interval / every-N cadence', () => {
    // A 6-round RL with a 60-frame charge and a 141-frame reload cycles ~8.4 s per magazine,
    // i.e. ~120+ full charges over 180 s. A per-shot rider must therefore land many dozens of
    // hits; an interval / hitCount:N / every-N encoding lands a small fraction of that.
    expect(S1DMG.length).toBeGreaterThanOrEqual(60);
    expect(new Set(S1DMG.map(F)).size).toBeGreaterThanOrEqual(50);
  });

  it('carries real damage — zeroing it moves this unit a lot (counterfactual)', () => {
    const base = unitOf(BASE.res, SLUG).totalDamage;
    const cf = unitOf(NO_RIDER.res, SLUG).totalDamage;
    expect(base).toBeGreaterThan(0);
    expect(cf).toBeLessThan(base * 0.85);
  });

  it('the Super Firepower rider (+262.79%) co-lands on some charges but not all', () => {
    const frames = S1DMG.map(F);
    // guard: real, distinct frames (so "two hits on one frame" is meaningful)
    expect(new Set(frames).size).toBeGreaterThan(1);
    const counts = new Map<number, number>();
    for (const f of frames) counts.set(f, (counts.get(f) ?? 0) + 1);
    const doubled = [...counts.values()].filter((n) => n >= 2).length;
    // Nearest-wrong A: the 262.79 rider dropped -> doubled === 0.
    // Nearest-wrong B: the rider made unconditional (status gate lost) -> every charge doubles.
    expect(doubled).toBeGreaterThanOrEqual(1);
    expect(doubled).toBeLessThan(counts.size * 0.5);
  });
});

describe('neon-vision-eye — inertness (every kit line says "Affects self" or targets the enemy)', () => {
  it('grants nothing to teammates', () => {
    const leaked = EV.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.targetSlug !== SLUG &&
        [110.21, 45.03, 80.04, 35.05].some((v) => near(e.value, v)),
    );
    expect(leaked).toEqual([]);
  });

  it('zeroing the skill1 rider leaves every teammate byte-identical', () => {
    // The rider is self-sourced damage on the enemy: it cannot feed a teammate. (The burst-gen
    // line is deliberately NOT the counterfactual here — that one legitimately moves rotation
    // timing for everyone.)
    const others = (t: Record<string, number>) =>
      Object.fromEntries(Object.entries(t).filter(([k]) => k !== SLUG));
    expect(others(totals(NO_RIDER.res))).toEqual(others(totals(BASE.res)));
  });
});

describe('neon-vision-eye — GAP lines (no primitive / unobservable payload)', () => {
  it.skip('S1a: invulnerability + debuff immunity, 5x per battle — no "when attacked" trigger, and the v1 boss deals no damage', () => {});
  it.skip('S1a: Healthy Body incoming-healing +10.26% / 20 s — no incoming-healing StatKey; no HP pool to heal', () => {});
  it.skip('S2b/S2c: gauge +2 per normal attack while charging, +45 when the charge status ends — no status-end trigger primitive; observable only through the Super-vs-Charge branch cadence, which the Bb tests already pin', () => {});
  it.skip('Ba: Firepower Charge is a 10 s unremovable self status — no timed-status primitive; its only damage-relevant consequence is the gauge trajectory', () => {});
  it.skip('Bc: Explosion Radius +200% / 10 s — hit-geometry, no radius primitive. FLAGGED: for an RL this plausibly raises landed/core hits, so it is a real (unquantified) damage line, not a defensive skip', () => {});
});
