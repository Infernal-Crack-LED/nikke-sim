/**
 * vesti (RL / Water / Attacker / Burst III — burst CD 40s, ammo 6, charge 60f) — KIT SPEC.
 *
 * BLIND author: written from the kit prose alone (no sight of the shipped override, the driver's
 * tests, or any truth file). Each assertion states what the kit TEXT requires and the
 * nearest-wrong model it goes RED under.
 *
 * WHAT THE KIT SAYS (structure verbatim, payloads as read):
 *   S1  "Activates when performing a Full Charge attack. Affects self."
 *         Explosion Radius ▲ 15.01% for 10 sec.
 *   S2  "Activates when using Burst Skill. Affects self."  — escalating and CUMULATIVE
 *       ("Each subsequent effect triggers all effects before it"):
 *         Survival Instinct 1  ATK ▲ 5.35%             for 45 sec
 *         Survival Instinct 2  Critical Damage ▲ 22.34% for 45 sec
 *         Survival Instinct 3  Critical Rate ▲ 15.51%   for 45 sec
 *   BURST
 *     a) self       — two Missile Containers, 15.56% of final ATK every 1 sec for 18 sec
 *     b) all enemies— escalating by Survival Instinct stage, same CUMULATIVE sentence:
 *                      SI1 210.62% / SI2 247.25% / SI3 302.19% of final ATK as extra damage
 *     c) all allies — Full Burst Duration ▼ 5 sec
 *
 * FIXTURES (2 base runs + 2 counterfactuals = 4 sims)
 *   `solo`     = controlComp('vesti', false) → liter (B1) / crown (B2) / vesti (B3).
 *                vesti is the SOLE Burst III, so she casts on every rotation — the only way to
 *                climb to Survival Instinct 3 inside 180s and observe all three ladder rungs.
 *                The fixed-B3 `helm` slot is dropped here so her crit/ATK auras cannot confound
 *                the rung readings.
 *   `withHelm` = controlComp('vesti', true) → adds `helm`, a SECOND Burst III. Some Full Bursts
 *                are then opened by helm, not vesti. That gap is the whole trigger-identity test
 *                (taxonomy #3): keying S2 to full-burst-ENTER instead of vesti's own burst CAST
 *                over-credits by exactly the helm-opened rotations. The test asserts the gap is
 *                non-zero first, so the discrimination cannot be vacuous.
 *
 * READING NOTES (declared, not hidden)
 *   ⚑ (a) split-vs-merge: "two Missile Containers that deal 15.56% ... every 1 sec" is read
 *     PER CONTAINER, so the per-second payload is 2 × 15.56 = 31.12% of final ATK. English is
 *     genuinely ambiguous here (taxonomy #5, kit-silent multi-projectile), so that magnitude gets
 *     its OWN named test — a divergence there is one isolated line, not a poisoned file. The
 *     cadence/duration assertions hold under either reading.
 *   ⚑ (b) cumulative-vs-replace: the burst rider carries the SAME "each subsequent effect triggers
 *     all effects before it" sentence as S2, where cumulative is unarguable (three different
 *     stats stack). Read literally, SI3 therefore deals 210.62 + 247.25 + 302.19 = 760.06%.
 *     Nearest-wrong = tiers REPLACE (302.19% alone at SI3).
 *   ⚑ stage alignment: both S2 and the burst rider key off the same cast, so cast N sees stage
 *     min(N,3) INCLUDING that cast (cast 1 → SI1). Asserted directly off the rider's atkPct.
 *   (c) is asserted on the measured Full Burst WINDOW LENGTH, not on a damage direction: a
 *     shorter Full Burst is not unambiguously a nerf, since the rotation restarts sooner and the
 *     fight can fit MORE (shorter) windows. Direction is left to the board, length is structural.
 *   crit-eligibility of the burst rider is NOT asserted — whether a flat-damage rider crits is an
 *     engine-wide policy (RIDERCRIT), not a vesti kit line, so pinning it here would test the
 *     engine under this unit's name.
 */
// ADAPTED copy of the S5 blind spec (driver, 2026-08-05): MECHANICAL-ONLY fix A1 — import path '../lib/harness.js' -> '../../tests/lib/harness.js' (blind/ is one level deeper than the unit tests). No assertion value, comparison, or semantic claim changed.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

const SLUG = 'vesti';
const FPS = 60;
const FIGHT_FRAMES = 180 * FPS;

/** Float compare for kit magnitudes (one hundredth of a percentage point). */
const near = (a: number, b: number): boolean => Math.abs(a - b) < 5e-3;

function run(opts: Parameters<typeof runComp>[0]) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...opts,
    cfg: { ...opts.cfg, onEvent: (e: SimEvent) => events.push(e) },
  });
  return { res, events };
}

// ---- override slot access -------------------------------------------------------------
// The override FILE is slot-keyed; a slot is a Block[] (harness `bareWeaponOverride` builds
// exactly that shape). The `.blocks` fallback keeps the counterfactuals working if a slot is
// ever carried as a CharacterSkills wrapper instead — a counterfactual that silently patched
// nothing would turn a nearest-wrong test into a false GREEN, which is the failure to avoid.
const blocksOf = (ov: any, slot: string): any[] => {
  const s = ov?.[slot];
  if (Array.isArray(s)) {
    return s;
  }
  if (s && Array.isArray(s.blocks)) {
    return s.blocks;
  }
  return [];
};
const setBlocks = (ov: any, slot: string, blocks: any[]): void => {
  if (ov[slot] && !Array.isArray(ov[slot]) && Array.isArray(ov[slot].blocks)) {
    ov[slot].blocks = blocks;
  } else {
    ov[slot] = blocks;
  }
};

/** The committed override, unmutated — read-only inspection of the authored prose. */
const OVERRIDE = withPatchedOverride(SLUG, () => {});

// ---- runs (hoisted — each is a full 180s sim) ------------------------------------------
const solo = run(controlComp(SLUG, false));
const withHelm = run(controlComp(SLUG, true));

/** Nearest-wrong for S2: the three rungs land TOGETHER on every cast (no escalation). */
const flatLadder = run({
  ...controlComp(SLUG, false),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
      setBlocks(ov, 'skill2', [
        {
          slot: 'skill2',
          trigger: { kind: 'burstCast' },
          target: { kind: 'self' },
          effects: [
            { kind: 'buff', stat: 'atkPct', value: 5.35, durationSec: 45 },
            { kind: 'buff', stat: 'critDamagePct', value: 22.34, durationSec: 45 },
            { kind: 'buff', stat: 'critRatePct', value: 15.51, durationSec: 45 },
          ],
        },
      ]);
    }),
  },
});

/** Nearest-wrong for the burst's (c): the Full Burst Duration ▼5s line is dropped. */
const noShorten = run({
  ...controlComp(SLUG, false),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
      for (const b of blocksOf(ov, 'burst')) {
        b.effects = (b.effects ?? []).filter(
          (e: any) => e.kind !== 'fullBurstExtend'
        );
      }
    }),
  },
});

// ---- projections ----------------------------------------------------------------------
type DamageEv = Extract<SimEvent, { kind: 'damage' }>;
type BuffEv = Extract<SimEvent, { kind: 'buffApply' }>;
type CastEv = Extract<SimEvent, { kind: 'burstCast' }>;
type FbEv = Extract<SimEvent, { kind: 'fullBurstStart' }>;

const casts = (evs: SimEvent[]): CastEv[] =>
  evs.filter((e): e is CastEv => e.kind === 'burstCast' && e.slug === SLUG);
const buffs = (evs: SimEvent[]): BuffEv[] =>
  evs.filter((e): e is BuffEv => e.kind === 'buffApply');
const fbWindows = (evs: SimEvent[]): FbEv[] =>
  evs.filter(
    (e): e is FbEv => e.kind === 'fullBurstStart' && e.endFrame <= FIGHT_FRAMES
  );

const soloCasts = casts(solo.events);
/** vesti's BURST-SLOT damage instances — srcSlot names the kit line, bucket does not. */
const soloBurstDmg = solo.events.filter(
  (e): e is DamageEv =>
    e.kind === 'damage' && e.slug === SLUG && e.srcSlot === 'burst'
);

/** atkPct multiset of everything the burst slot lands ON the cast frame — the rider. */
const riderPcts = (k: number): number[] =>
  soloBurstDmg
    .filter((e) => e.frame === soloCasts[k].frame)
    .map((e) => e.atkPct)
    .sort((a, b) => a - b);

/** Burst-slot damage landing AFTER the cast frame and before the next cast — the containers. */
const containerTicks = (k: number): DamageEv[] => {
  const from = soloCasts[k].frame;
  const to = Math.min(
    soloCasts[k + 1]?.frame ?? FIGHT_FRAMES + 1,
    from + 30 * FPS
  );
  return soloBurstDmg.filter((e) => e.frame > from && e.frame < to);
};

// =======================================================================================
describe('vesti — fixture sanity (non-vacuity)', () => {
  it('vesti casts her burst at least 3 times, so Survival Instinct 3 is reachable', () => {
    expect(soloCasts.length).toBeGreaterThanOrEqual(3);
  });

  it('event attribution is sound: burst-slot damage is a strict subset of her total', () => {
    const sum = soloBurstDmg.reduce((a, e) => a + e.amount, 0);
    expect(sum).toBeGreaterThan(0);
    expect(sum).toBeLessThan(unitOf(solo.res, SLUG).totalDamage);
  });
});

// =======================================================================================
describe('vesti — S1 Explosion Radius (GAP: no primitive, damage-inert at scope lock)', () => {
  it.skip('GAP — "Explosion Radius ▲ 15.01% for 10 sec" on Full Charge: the effect schema has no explosion-radius / AoE primitive, and hit AREA cannot move damage against the single, partless scope-lock boss. Modelling it needs an area mechanic the engine does not have.', () => {});

  it('does NOT launder explosion radius into a damage stat', () => {
    // Nearest-wrong: encoding radius as projectileExplosionPct / attackDamagePct 15.01,
    // which would silently hand an RL carry a real Damage-Up buff the kit never grants.
    const laundered = buffs(solo.events).filter((e) => near(e.value, 15.01));
    expect(laundered).toEqual([]);
  });

  it('records the line rather than silently dropping it', () => {
    // No-silent-drops: the text must survive somewhere in the authored override prose.
    expect(JSON.stringify(OVERRIDE)).toMatch(/explosion radius/i);
  });
});

// =======================================================================================
describe('vesti — S2 Survival Instinct ladder (escalating, own burst cast, self)', () => {
  const rung = (stat: string, v: number, upToFrame: number): BuffEv[] =>
    buffs(solo.events).filter(
      (e) => e.stat === stat && near(e.value, v) && e.frame <= upToFrame
    );

  it('cast 1 grants ONLY Survival Instinct 1 (ATK ▲5.35%)', () => {
    const f = soloCasts[0].frame;
    expect(rung('atkPct', 5.35, f).length).toBe(1);
    expect(rung('critDamagePct', 22.34, f).length).toBe(0);
    expect(rung('critRatePct', 15.51, f).length).toBe(0);
  });

  it('cast 2 adds Survival Instinct 2 (Crit DMG ▲22.34%) and replays rung 1', () => {
    const f = soloCasts[1].frame;
    expect(rung('atkPct', 5.35, f).length).toBe(2);
    expect(rung('critDamagePct', 22.34, f).length).toBe(1);
    expect(rung('critRatePct', 15.51, f).length).toBe(0);
  });

  it('cast 3 adds Survival Instinct 3 (Crit Rate ▲15.51%) and replays rungs 1-2', () => {
    const f = soloCasts[2].frame;
    expect(rung('atkPct', 5.35, f).length).toBe(3);
    expect(rung('critDamagePct', 22.34, f).length).toBe(2);
    expect(rung('critRatePct', 15.51, f).length).toBe(1);
  });

  it('NEAREST-WRONG: a non-escalating ladder fires all three rungs on cast 1', () => {
    // Proves the fixture can SEE the wrong model — without this the tests above could pass
    // on any encoding that merely happens to be quiet early.
    const f = casts(flatLadder.events)[0].frame;
    const early = buffs(flatLadder.events).filter(
      (e) => e.stat === 'critRatePct' && near(e.value, 15.51) && e.frame <= f
    );
    expect(early.length).toBe(1);
    expect(totals(flatLadder.res)[SLUG]).not.toBe(totals(solo.res)[SLUG]);
  });

  it('every rung lasts 45 sec', () => {
    for (const [stat, v] of [
      ['atkPct', 5.35],
      ['critDamagePct', 22.34],
      ['critRatePct', 15.51],
    ] as const) {
      const applies = buffs(solo.events).filter(
        (e) => e.stat === stat && near(e.value, v)
      );
      expect(applies.length).toBeGreaterThan(0);
      for (const e of applies) {
        expect(e.expiresFrame).not.toBeNull();
        expect((e.expiresFrame as number) - e.frame).toBe(45 * FPS);
        expect(e.durationShots).toBeNull(); // seconds, not a round count (taxonomy #2)
      }
    }
  });

  it('INERTNESS: the ladder is self-only — no teammate ever holds a rung', () => {
    for (const [stat, v] of [
      ['atkPct', 5.35],
      ['critDamagePct', 22.34],
      ['critRatePct', 15.51],
    ] as const) {
      const holders = new Set(
        buffs(withHelm.events)
          .filter((e) => e.stat === stat && near(e.value, v))
          .map((e) => e.targetSlug)
      );
      expect([...holders]).toEqual([SLUG]);
    }
  });

  it('TRIGGER IDENTITY: keyed to vesti’s OWN burst cast, not team Full Burst entry', () => {
    const fbCount = withHelm.events.filter(
      (e) => e.kind === 'fullBurstStart'
    ).length;
    const myCasts = casts(withHelm.events).length;
    // Non-vacuity: helm must actually open some Full Bursts, else the two triggers agree
    // and this fixture proves nothing.
    expect(myCasts).toBeGreaterThan(0);
    expect(fbCount).toBeGreaterThan(myCasts);

    const rung1 = buffs(withHelm.events).filter(
      (e) =>
        e.stat === 'atkPct' && near(e.value, 5.35) && e.targetSlug === SLUG
    );
    expect(rung1.length).toBe(myCasts); // fullBurstEnter would give fbCount — over-credit
  });
});

// =======================================================================================
describe('vesti — burst a) two Missile Containers (15.56% every 1 sec for 18 sec)', () => {
  it('ticks once per second for 18 seconds after the cast', () => {
    const frames = [...new Set(containerTicks(0).map((e) => e.frame))].sort(
      (a, b) => a - b
    );
    expect(frames.length).toBe(18);
    frames.forEach((f, i) => {
      expect(f - soloCasts[0].frame).toBe(FPS * (i + 1));
    });
  });

  it('does NOT multiply across casts (one instance per cast, 40s CD > 18s window)', () => {
    // Taxonomy #5: the engine appends an independent DoT instance per fire and never dedups,
    // so a duration longer than the re-trigger period would stack containers invisibly.
    const second = [...new Set(containerTicks(1).map((e) => e.frame))];
    expect(second.length).toBe(18);
  });

  it('⚑ per-tick payload is TWO containers: 2 × 15.56% = 31.12% of final ATK', () => {
    // ⚑ kit-silent split-vs-merge. Nearest-wrong: 15.56% total (one container’s worth),
    // which halves ~560% of final ATK per burst. Encoding-agnostic: one merged dot at 31.12
    // or two dots at 15.56 both pass; a single 15.56 does not.
    const byFrame = new Map<number, number>();
    for (const e of containerTicks(0)) {
      byFrame.set(e.frame, (byFrame.get(e.frame) ?? 0) + e.atkPct);
    }
    expect(byFrame.size).toBe(18);
    for (const v of byFrame.values()) {
      expect(v).toBeCloseTo(31.12, 2);
    }
  });

  it('container ticks never core (no “core strike” wording in the kit line)', () => {
    for (const e of containerTicks(0)) {
      expect(e.coreEligible).toBe(false);
    }
  });
});

// =======================================================================================
describe('vesti — burst b) Survival Instinct rider (all enemies, cumulative)', () => {
  it('rider scales by stage and is CUMULATIVE across stages', () => {
    // Nearest-wrong (tiers REPLACE): [210.62] / [247.25] / [302.19].
    expect(riderPcts(0)).toEqual([210.62]);
    expect(riderPcts(1)).toEqual([210.62, 247.25]);
    expect(riderPcts(2)).toEqual([210.62, 247.25, 302.19]);
  });

  it('stage is INCLUSIVE of the cast that granted it (cast 1 → SI1, not SI0)', () => {
    // Nearest-wrong (stage read PRE-cast): cast 1 lands nothing at all.
    expect(riderPcts(0).length).toBe(1);
  });

  it('rider is burst-cast damage: it does NOT take the +50% Full Burst major', () => {
    // Taxonomy #9: a burst cast lands before the Full Burst window opens.
    const atCast = soloBurstDmg.filter((e) =>
      soloCasts.some((c) => c.frame === e.frame)
    );
    expect(atCast.length).toBeGreaterThan(0);
    for (const e of atCast) {
      expect(e.fbMajorApplied).toBe(false);
    }
  });

  it('rider takes no core and no range bonus (rider convention)', () => {
    for (const e of soloBurstDmg.filter((x) => x.frame === soloCasts[2].frame)) {
      expect(e.coreEligible).toBe(false);
      expect(e.rangeApplied).toBe(false);
    }
  });

  it('INERTNESS: the rider is vesti’s alone — no teammate emits burst-slot damage from it', () => {
    const foreign = withHelm.events.filter(
      (e) =>
        e.kind === 'damage' &&
        e.slug !== SLUG &&
        e.srcSlot === 'burst' &&
        [210.62, 247.25, 302.19].some((p) => near(e.atkPct, p))
    );
    expect(foreign).toEqual([]);
  });
});

// =======================================================================================
describe('vesti — burst c) Full Burst Duration ▼ 5 sec (all allies)', () => {
  it('every Full Burst she opens runs ~5s, not the default ~10s', () => {
    const w = fbWindows(solo.events);
    expect(w.length).toBeGreaterThanOrEqual(3);
    for (const x of w) {
      expect((x.endFrame - x.frame) / FPS).toBeCloseTo(5, 0);
    }
  });

  it('NEAREST-WRONG: dropping the line restores ~10s windows and moves the board', () => {
    const w = fbWindows(noShorten.events);
    expect(w.length).toBeGreaterThanOrEqual(3);
    for (const x of w) {
      expect((x.endFrame - x.frame) / FPS).toBeCloseTo(10, 0);
    }
    // Direction is deliberately unasserted: a shorter window is not obviously a nerf,
    // because the rotation restarts sooner and can fit more Full Bursts.
    expect(totals(noShorten.res)[SLUG]).not.toBe(totals(solo.res)[SLUG]);
  });

  it('the shortening reaches the whole team, not just vesti', () => {
    // "Affects all allies": every ally's in-FB damage must live inside the 5s windows.
    const w = fbWindows(solo.events);
    const inFb = solo.events.filter(
      (e): e is DamageEv => e.kind === 'damage' && e.inFullBurst
    );
    expect(inFb.length).toBeGreaterThan(0);
    expect(new Set(inFb.map((e) => e.slug)).size).toBeGreaterThan(1);
    for (const e of inFb) {
      expect(
        w.some((x) => e.frame >= x.frame && e.frame <= x.endFrame)
      ).toBe(true);
    }
  });
});
