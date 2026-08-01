import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

/**
 * julia — Julia (AR / Iron / Attacker / Burst III), cd 40s, ammo 60, reload 93f,
 * hitsPerShot 1, normal mult 14.07, core mult 200.
 *
 * KIT (read literally, line by line):
 *
 * skill1 — "Affects self."
 *   S1a  Critical Rate ▲ 26.04% for 10 sec               → generic critRatePct, self, 10s
 *   S1b  ATK ▲ 20% for 10 sec                            → atkPct, self, 10s
 *   S1c  Normal Attack Critical Rate ▲ 36.16% for 10 sec → critRateNormalPct (SCOPED — normal
 *        attacks only). The nearest-wrong model is encoding this as a second generic critRatePct,
 *        which would over-credit burst/rider crit.
 *   S1 has NO activation clause of its own; it is fired by the skill2 "Forcefully uses Skill 1"
 *   line at battle start, and thereafter on its datamined skill cooldown (interval).
 *
 * skill2 —
 *   S2a  "Activates after landing 6 critical hit(s) with normal attacks. Affects self."
 *        Crescendo: Critical Damage ▲ 24.79%, stacks up to 5, lasts 15 sec
 *        → hitCount-flavored trigger on CRIT normal hits; critDamagePct, maxStacks 5, 15s.
 *        The engine has no crit-hit-only counter primitive (hitCount counts ROUNDS, not crits),
 *        so the trigger threshold is a ⚑ derived count (6 crits ÷ effective normal crit rate).
 *   S2b  "Activates after landing 8 critical hit(s) with normal attacks. Affects the target(s)."
 *        Marcato: 88% of final ATK as additional damage → flatDamage, crit-eligible, no core,
 *        noRange (rider), FB by timing.
 *   S2c  "Activates if Marcato lands as a crit attack. Affects the same target."
 *        100% of final ATK as additional damage → a CONDITIONAL rider on S2b's crit outcome.
 *        The engine has no "previous rider crit" conditional primitive → GAP (see it.skip).
 *   S2d  "Activates at the start of battle. Affects self. Forcefully uses Skill 1."
 *        → S1 first-fires at t=0 (the force-cast convention), not at t=CD.
 *
 * burst —
 *   B1   "Affects random enemies. Deals 544.5% of final ATK as damage. Attacks sequentially 5
 *        times." → 5 × flatDamage 544.5% on burstCast. Burst-cast damage lands BEFORE Full Burst
 *        opens (verified fact) → FB-exempt.
 *   B2   "Activates when Crescendo is at max stacks. Affects the same target. Deals 544.5% of
 *        final ATK as additional damage." → a 6th 544.5% hit, GATED on Crescendo == 5 stacks.
 *        The engine has no "buff at max stacks" block gate → GAP (see it.skip).
 *
 * FIXTURE: controlComp('julia', true) — julia is Burst III, so the fixture MUST supply B1+B2
 * (a lone B3 makes ZERO Full Bursts). Deterministic, no seed. Every assertion below is either
 * (a) a structural event-log claim, or (b) a totals delta against a nearest-wrong counterfactual
 * built with withPatchedOverride, so a GREEN here is RED under the wrong model.
 *
 * RUN BUDGET: 1 control run + 6 counterfactual runs = 7 full 180s sims, all hoisted.
 */

const SLUG = 'julia';

function run(opts: ReturnType<typeof controlComp>) {
  const events: SimEvent[] = [];
  // DRIVER ADAPTATION (2026-07-31): the blind author placed `onEvent` at the CompOptions top
  // level; the harness threads it through `cfg` (scripts/tests/lib/harness.ts runComp). Without
  // this, the event log is empty and every event-log assertion fails vacuously. Assertion logic
  // untouched — only the event plumbing was corrected to the real harness API.
  const res = runComp({
    ...opts,
    cfg: { ...opts.cfg, onEvent: (ev: SimEvent) => events.push(ev) },
  });
  return { res, events };
}

// ---------------------------------------------------------------- control
const control = run(controlComp(SLUG, true));
const juliaEvents = control.events;
const juliaTotal = totals(control.res)[SLUG];

const juliaIdx = unitOf(control.res, SLUG).slotIndex ?? null;

const buffApplies = juliaEvents.filter(
  (e) => e.kind === 'buffApply'
) as Extract<SimEvent, { kind: 'buffApply' }>[];
const damages = juliaEvents.filter((e) => e.kind === 'damage') as Extract<
  SimEvent,
  { kind: 'damage' }
>[];
const burstCasts = juliaEvents.filter((e) => e.kind === 'burstCast');

// Buffs julia applied to HERSELF (all of skill1 + Crescendo are "Affects self").
const selfBuffs = buffApplies.filter(
  (e) => e.targetSlug === SLUG && e.casterIdx !== null
);

// ---------------------------------------------------- counterfactual runs
// Each patched override is the NEAREST-WRONG reading of one kit line.

// CF1 — S1c encoded as a second GENERIC critRatePct instead of the normal-scoped stat.
// Wrong model over-credits burst + rider crit; totals must differ.
const cfNormalCritGeneric = run(
  controlComp(SLUG, true) &&
    ({
      ...controlComp(SLUG, true),
      overrides: {
        [SLUG]: withPatchedOverride(SLUG, (ov) => {
          for (const b of ov.skill1 ?? []) {
            for (const e of b.effects) {
              if (e.kind === 'buff' && e.stat === 'critRateNormalPct') {
                (e as { stat: string }).stat = 'critRatePct';
              }
            }
          }
        }),
      },
    } as ReturnType<typeof controlComp>)
);

// CF2 — skill1 stripped entirely (no crit, no ATK). Proves skill1 is live and load-bearing,
// and is the non-vacuity anchor for the whole slot.
const cfNoSkill1 = run({
  ...controlComp(SLUG, true),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      ov.skill1 = [];
    }),
  },
} as ReturnType<typeof controlComp>);

// CF3 — S1b ATK ▲20% dropped only. Isolates the ATK line from the crit lines.
const cfNoAtk = run({
  ...controlComp(SLUG, true),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill1 ?? []) {
        b.effects = b.effects.filter(
          (e) => !(e.kind === 'buff' && e.stat === 'atkPct')
        );
      }
    }),
  },
} as ReturnType<typeof controlComp>);

// CF4 — Crescendo capped at 1 stack instead of 5. Proves the stack cap is actually reached
// and actually pays (a maxStacks that never accrues would make the line vacuous).
const cfCrescendo1Stack = run({
  ...controlComp(SLUG, true),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill2 ?? []) {
        for (const e of b.effects) {
          if (e.kind === 'buff' && e.stat === 'critDamagePct') {
            (e as { maxStacks?: number }).maxStacks = 1;
          }
        }
      }
    }),
  },
} as ReturnType<typeof controlComp>);

// CF5 — Marcato (88%) removed. Isolates the skill2 rider from the burst.
const cfNoMarcato = run({
  ...controlComp(SLUG, true),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill2 ?? []) {
        b.effects = b.effects.filter(
          (e) => !(e.kind === 'flatDamage' && Math.abs(e.atkPct - 88) < 0.01)
        );
      }
    }),
  },
} as ReturnType<typeof controlComp>);

// CF6 — burst reduced from 5 sequential hits to 1. Proves the "sequentially 5 times" count.
const cfBurstOneHit = run({
  ...controlComp(SLUG, true),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.burst ?? []) {
        let seen = 0;
        b.effects = b.effects.filter((e) => {
          if (e.kind === 'flatDamage' && Math.abs(e.atkPct - 544.5) < 0.01) {
            seen += 1;
            return seen === 1;
          }
          return true;
        });
      }
    }),
  },
} as ReturnType<typeof controlComp>);

describe('julia — skill1 (self buffs, 10 sec)', () => {
  it('S1a: applies generic Critical Rate ▲ 26.04% to self', () => {
    const hits = selfBuffs.filter(
      (e) => e.stat === 'critRatePct' && Math.abs(e.value - 26.04) < 0.01
    );
    expect(hits.length).toBeGreaterThan(0);
  });

  it('S1b: applies ATK ▲ 20% to self as a plain percentage (atkPct, not casterAtkPct)', () => {
    // "ATK ▲ 20%" with no "of the skill user's ATK" qualifier scales the TARGET's own ATK.
    // Nearest-wrong: casterAtkPct, which would emit a FLAT resolved ATK number instead of 20.
    const hits = selfBuffs.filter(
      (e) => e.stat === 'atkPct' && Math.abs(e.value - 20) < 0.01
    );
    expect(hits.length).toBeGreaterThan(0);
    const flatMisencoding = selfBuffs.filter((e) => e.stat === 'casterAtkPct');
    expect(flatMisencoding).toHaveLength(0);
  });

  it('S1c: Normal Attack Critical Rate ▲ 36.16% is SCOPED (critRateNormalPct), not generic', () => {
    const scoped = selfBuffs.filter(
      (e) => e.stat === 'critRateNormalPct' && Math.abs(e.value - 36.16) < 0.01
    );
    expect(scoped.length).toBeGreaterThan(0);

    // Discriminator: no generic critRatePct carries the 36.16 magnitude.
    const genericAt36 = selfBuffs.filter(
      (e) => e.stat === 'critRatePct' && Math.abs(e.value - 36.16) < 0.01
    );
    expect(genericAt36).toHaveLength(0);
  });

  it('S1c: the scoped model is NOT damage-equivalent to the generic model (non-vacuity)', () => {
    // If julia had no crit-eligible non-normal damage, scoped-vs-generic would be a no-op and
    // the assertion above would be cosmetic. Her burst (544.5% ×5) and Marcato are crit-eligible,
    // so the generic mis-encoding MUST move her total upward.
    const wrong = totals(cfNormalCritGeneric.res)[SLUG];
    expect(wrong).not.toBeCloseTo(juliaTotal, 0);
    expect(wrong).toBeGreaterThan(juliaTotal);
  });

  it('S1a/S1c: buffs carry a 10 sec window (expiresFrame set, not permanent)', () => {
    const crit = selfBuffs.find(
      (e) => e.stat === 'critRatePct' && Math.abs(e.value - 26.04) < 0.01
    )!;
    expect(crit.expiresFrame).toBeGreaterThan(0);
    expect(crit.expiresFrame).toBeLessThan(180 * 60);
    // 10 sec = 600 frames from apply; the buff is windowed, so it re-applies over the fight.
    const critApplies = selfBuffs.filter(
      (e) => e.stat === 'critRatePct' && Math.abs(e.value - 26.04) < 0.01
    );
    expect(critApplies.length).toBeGreaterThan(1);
  });

  it('skill1 is load-bearing: stripping it lowers julia damage and leaves teammates alone', () => {
    const stripped = totals(cfNoSkill1.res)[SLUG];
    expect(stripped).toBeLessThan(juliaTotal);

    // Inertness: skill1 is "Affects self" — no teammate total may move.
    const base = totals(control.res);
    const cf = totals(cfNoSkill1.res);
    for (const slug of Object.keys(base)) {
      if (slug === SLUG) {
        continue;
      }
      expect(cf[slug]).toBeCloseTo(base[slug], 6);
    }
  });

  it('S1b: the ATK line alone is load-bearing (isolated from the crit lines)', () => {
    expect(totals(cfNoAtk.res)[SLUG]).toBeLessThan(juliaTotal);
  });
});

describe('julia — skill1 first-fire (S2d: "Forcefully uses Skill 1" at battle start)', () => {
  it('skill1 fires at t=0, not at t=cooldown', () => {
    // Force-cast convention: a kit line "Forcefully uses Skill N" first-fires at frame 0.
    // Nearest-wrong: a plain interval trigger, whose first apply would be at t=CD (>0).
    const first = selfBuffs
      .filter((e) => e.stat === 'atkPct' && Math.abs(e.value - 20) < 0.01)
      .map((e) => e.frame)
      .sort((a, b) => a - b)[0];
    expect(first).toBeLessThanOrEqual(1);
  });

  it('skill1 re-fires on an interval thereafter (more than the single forced cast)', () => {
    const applies = selfBuffs.filter(
      (e) => e.stat === 'atkPct' && Math.abs(e.value - 20) < 0.01
    );
    expect(applies.length).toBeGreaterThan(1);
  });
});

describe('julia — skill2 Crescendo (Critical Damage ▲ 24.79%, ≤5 stacks, 15 sec)', () => {
  it('applies critDamagePct 24.79% to self with maxStacks 5', () => {
    const cres = selfBuffs.filter(
      (e) => e.stat === 'critDamagePct' && Math.abs(e.value - 24.79) < 0.01
    );
    expect(cres.length).toBeGreaterThan(0);
    expect(cres[0].maxStacks).toBe(5);
  });

  it('Crescendo actually accrues past 1 stack (non-vacuity of the stack cap)', () => {
    const cres = selfBuffs.filter(
      (e) => e.stat === 'critDamagePct' && Math.abs(e.value - 24.79) < 0.01
    );
    const maxSeen = Math.max(...cres.map((e) => e.stacks ?? 1));
    expect(maxSeen).toBeGreaterThan(1);

    // And the cap pays: capping at 1 stack must lower julia's damage.
    expect(totals(cfCrescendo1Stack.res)[SLUG]).toBeLessThan(juliaTotal);
  });

  it('Crescendo is self-only (no teammate receives critDamagePct 24.79%)', () => {
    const leaked = buffApplies.filter(
      (e) =>
        e.targetSlug !== SLUG &&
        e.stat === 'critDamagePct' &&
        Math.abs(e.value - 24.79) < 0.01
    );
    expect(leaked).toHaveLength(0);
  });

  it('Crescendo is windowed (15 sec), not permanent', () => {
    const cres = selfBuffs.find(
      (e) => e.stat === 'critDamagePct' && Math.abs(e.value - 24.79) < 0.01
    )!;
    expect(cres.expiresFrame).toBeGreaterThan(0);
    expect(cres.expiresFrame).toBeLessThan(180 * 60);
  });
});

describe('julia — skill2 Marcato (88% of final ATK, additional damage)', () => {
  it('emits an 88%-of-ATK rider hit that is crit-eligible and takes no core', () => {
    // "additional damage" riders: crit at the caster's rate, NO core unless the text says
    // "core strike" (it does not), and no +30% range bonus.
    const marcato = damages.filter(
      (e) =>
        e.srcSlot === 'skill2' &&
        e.mult !== undefined &&
        Math.abs((e.atkPct ?? 0) - 88) < 0.01
    );
    expect(marcato.length).toBeGreaterThan(0);
    expect(marcato.every((e) => e.rangeApplied === false)).toBe(true);
    expect(marcato.every((e) => (e.coreRate ?? 0) === 0)).toBe(true);
  });

  it('Marcato is load-bearing and self-sourced (teammates unmoved)', () => {
    expect(totals(cfNoMarcato.res)[SLUG]).toBeLessThan(juliaTotal);

    const base = totals(control.res);
    const cf = totals(cfNoMarcato.res);
    for (const slug of Object.keys(base)) {
      if (slug === SLUG) {
        continue;
      }
      expect(cf[slug]).toBeCloseTo(base[slug], 6);
    }
  });

  it('Marcato takes the Full Burst major by TIMING (not FB-exempt)', () => {
    // A skill-2 rider is a function-damage hit: default FB-eligible by landing timing.
    // Nearest-wrong: noFb:true, which would leave every instance fbMajorApplied === false.
    const marcato = damages.filter(
      (e) => e.srcSlot === 'skill2' && Math.abs((e.atkPct ?? 0) - 88) < 0.01
    );
    const inFb = marcato.filter((e) => e.inFullBurst);
    expect(inFb.length).toBeGreaterThan(0);
    expect(inFb.every((e) => e.fbMajorApplied)).toBe(true);
  });
});

describe('julia — burst (544.5% of final ATK, sequentially 5 times)', () => {
  it('julia actually casts her burst in the fixture (non-vacuity)', () => {
    expect(burstCasts.length).toBeGreaterThan(0);
  });

  it('emits exactly 5 sequential 544.5% hits per burst cast', () => {
    const burstHits = damages.filter(
      (e) => e.srcSlot === 'burst' && Math.abs((e.atkPct ?? 0) - 544.5) < 0.01
    );
    expect(burstHits.length).toBe(burstCasts.length * 5);
  });

  it('burst damage is Full-Burst-exempt (it lands before the FB window opens)', () => {
    // Verified project fact: burst-cast damage lands BEFORE Full Burst begins — no +50%.
    // Nearest-wrong: keying the 5 hits to fullBurstEnter, which would stamp fbMajorApplied.
    const burstHits = damages.filter(
      (e) => e.srcSlot === 'burst' && Math.abs((e.atkPct ?? 0) - 544.5) < 0.01
    );
    expect(burstHits.every((e) => e.fbMajorApplied === false)).toBe(true);
  });

  it('the 5-hit count is load-bearing (a single hit lowers damage materially)', () => {
    expect(totals(cfBurstOneHit.res)[SLUG]).toBeLessThan(juliaTotal);
  });

  it('burst hits are enemy-directed only — no teammate buff is emitted by the burst slot', () => {
    const burstBuffs = buffApplies.filter(
      (e) => e.targetSlug !== SLUG && e.casterIdx === juliaIdx
    );
    expect(burstBuffs).toHaveLength(0);
  });
});

describe('julia — GAPs (missing engine primitives)', () => {
  it.skip('S2a trigger identity: "after landing 6 CRITICAL hits with normal attacks" — the engine has no crit-hit counter (hitCount counts ROUNDS, not crits), so the threshold is a ⚑ derived value (6 ÷ effective normal crit rate), not a kit-stated one', () => {});

  it.skip('S2b trigger identity: "after landing 8 CRITICAL hits with normal attacks" — same missing primitive; Marcato\'s cadence is a ⚑ derived round-count, unverifiable from the kit text alone', () => {});

  it.skip("S2c: \"Activates if Marcato lands as a crit attack → 100% of final ATK\" — there is no conditional-on-a-prior-rider's-crit-outcome primitive; the faithful model is a probabilistic 100% rider weighted by julia's crit rate at Marcato's landing frame, which no block gate expresses", () => {});

  it.skip('burst line 2: "Activates when Crescendo is at max stacks → additional 544.5%" — there is no buff-at-max-stacks block gate (resourceGate reads named resources, not buff stacks), so the 6th hit cannot be conditioned faithfully', () => {});
});
