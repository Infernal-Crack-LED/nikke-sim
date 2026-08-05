import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

/**
 * ludmilla (ludmilla) - SMG / Water / Defender / Burst I - BLIND kit spec test.
 *
 * Written from the kit prose alone (no sight of the shipped override, the
 * driver's tests, or the driver's reasoning).
 *
 * FIXTURE: controlComp('ludmilla', true) - liter B1 / crown B2 / ludmilla
 * (carry, focus) / helm B3. The fixed B3 is REQUIRED, not optional: every
 * skill2 line is keyed to 'entering Full Burst' and ludmilla is a Burst I
 * unit, so without a Burst III in the comp the chain never completes and
 * those lines would be untestable (a lone B1 makes ZERO full bursts).
 *
 * WHAT THE KIT SAYS (structural read of the header + Affects clause + the
 * stat keyword before the arrow):
 *   skill1  'when the last bullet hits' / affects the target (enemy)
 *           DEF down 8.4% and ATK down 8.4%, 10 sec -> two ENEMY stat cuts
 *   skill2  'when entering Full Burst' (NOT burst-cast; she is B1, so in a
 *           multi-B1 comp the two triggers genuinely diverge)
 *           (a) Attract/Taunt, all enemies, 15.09 sec
 *           (b) Damage Taken down 57.86%, 15 sec, affects SELF
 *   burst   'Affects 10 enemy unit(s) with the highest final ATK',
 *           163.1% of final ATK as damage
 *           + 'above 50% HP', all allies, DEF up 12.93%, 10 sec
 *
 * WHY EACH ASSERTION DISCRIMINATES:
 *
 * 1. skill1 is damage-INERT. StatKey carries no boss-DEF-reduction key and no
 *    boss-ATK key, and the v1 boss deals no damage, so an enemy ATK cut has no
 *    consumer at all. The nearest-wrong model launders 'DEF down 8.4%' into
 *    damageTakenPct +8.4 on the boss - a different mechanic arithmetically
 *    (boss DEF is SUBTRACTIVE in the formula, damage-taken is a MULTIPLIER)
 *    and one that silently pays the entire team. Test: clearing skill1 must
 *    leave every slug byte-identical; the fudged variant must NOT. That second
 *    run is the non-vacuity proof - it simultaneously demonstrates the
 *    last-bullet trigger really fires inside this fixture.
 *
 * 2. skill2 is damage-INERT, and carries the sign/target trap the failure
 *    taxonomy names: 'Damage Taken' DOWN here 'Affects self' - a SELF
 *    defensive buff, not the boss debuff an 'up' arrow would be. Encoding it
 *    as an enemy damageTakenPct inverts both the sign and the target set for a
 *    very large silent gain. Same clear/fudge pair; the fudge also proves Full
 *    Burst is actually entered (non-vacuity for the trigger).
 *
 * 3. burst damage: 'Affects 10 enemy unit(s) with the highest final ATK'
 *    against a single boss resolves to exactly ONE 163.1% instance per cast,
 *    at burst-cast timing, with no core (the text never says 'core strike').
 *    The test compares the shipped burst against a reference override that is
 *    literally one burstCast/enemy flatDamage of 163.1% - a 10-instance
 *    reading, a core:true reading, or an FB-boosted reading each diverge from
 *    that reference by a wide margin.
 *    Non-vacuity uses a GAUGE-PRESERVING zero control: setting atkPct to 0
 *    keeps the damage impact (and therefore the burst-gauge contribution)
 *    while removing the damage. Deleting the effect outright would drop a
 *    gauge impact, shift full-burst timing, and dirty every comparison
 *    downstream of it.
 *
 * 4. burst DEF up 12.93%: schema-documented inert in v1, but the line must
 *    still be CARRIED (a stat buff is kept even when the engine treats it as
 *    inert, for a future consumer/scaler), so it is asserted on the event log
 *    rather than on damage. The 'above 50% HP' gate is scope-trivial - nothing
 *    damages allies at scope lock - so it is always satisfied.
 *
 * SHAPE NOTE: the packet's harness cheat-sheet and its override-file section
 * disagree on whether an override slot is Block[] or { blocks: Block[] }. The
 * helpers below read and write BOTH shapes, so this test cannot fail on that
 * ambiguity alone.
 *
 * RUN BUDGET: 9 hoisted runComp calls, all at module scope.
 */

const SLUG = 'ludmilla';

type Opts = ReturnType<typeof controlComp>;
type Slot = 'skill1' | 'skill2' | 'burst';
type LooseBlock = Record<string, unknown>;
type LooseOv = Record<string, unknown>;
type LooseEvent = {
  kind: string;
  stat?: string;
  value?: number;
  targetSlug?: string;
};

function getBlocks(ov: LooseOv, slot: Slot): LooseBlock[] {
  const s = ov[slot];
  if (Array.isArray(s)) {
    return s as LooseBlock[];
  }
  const inner = (s as { blocks?: unknown } | undefined)?.blocks;
  if (Array.isArray(inner)) {
    return inner as LooseBlock[];
  }
  return [];
}

function setBlocks(ov: LooseOv, slot: Slot, blocks: LooseBlock[]): void {
  const s = ov[slot];
  if (
    s &&
    !Array.isArray(s) &&
    Array.isArray((s as { blocks?: unknown }).blocks)
  ) {
    (s as { blocks: LooseBlock[] }).blocks = blocks;
    return;
  }
  ov[slot] = blocks;
}

const patch = (fn: (ov: LooseOv) => void): unknown =>
  withPatchedOverride(SLUG, (ov) => {
    fn(ov as unknown as LooseOv);
  });

function run(ov?: unknown): {
  events: SimEvent[];
  tot: Record<string, number>;
} {
  const opts = controlComp(SLUG, true) as Opts & {
    overrides?: Record<string, unknown>;
    cfg?: { onEvent?: (e: SimEvent) => void };
  };
  if (ov !== undefined) {
    opts.overrides = { ...(opts.overrides ?? {}), [SLUG]: ov };
  }
  const events: SimEvent[] = [];
  opts.cfg = { ...(opts.cfg ?? {}), onEvent: (e: SimEvent) => events.push(e) };
  return { events, tot: totals(runComp(opts as Opts)) };
}

function zeroDamage(b: LooseBlock): LooseBlock {
  const effects = Array.isArray(b.effects)
    ? (b.effects as Record<string, unknown>[])
    : [];
  return {
    ...b,
    effects: effects.map((e) => ('atkPct' in e ? { ...e, atkPct: 0 } : e)),
  };
}

function buffApplies(
  events: SimEvent[],
  stat: string,
  value: number
): LooseEvent[] {
  return (events as unknown as LooseEvent[]).filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.stat === stat &&
      typeof e.value === 'number' &&
      Math.abs(e.value - value) < 1e-6
  );
}

const rel = (a: number, b: number): number =>
  b === 0 ? (a === 0 ? 0 : 1) : Math.abs(a - b) / Math.abs(b);

// --- counterfactual blocks -------------------------------------------------

// The single faithful reading of the burst damage line, built from scratch.
const NUKE = (extra: Record<string, unknown> = {}): LooseBlock => ({
  slot: 'burst',
  trigger: { kind: 'burstCast' },
  target: { kind: 'enemy' },
  effects: [{ kind: 'flatDamage', atkPct: 163.1, ...extra }],
});

// Nearest-wrong for skill1: an enemy DEF cut laundered into a damage-taken buff.
const S1_FUDGE: LooseBlock = {
  slot: 'skill1',
  trigger: { kind: 'lastBullet' },
  target: { kind: 'enemy' },
  effects: [
    { kind: 'buff', stat: 'damageTakenPct', value: 8.4, durationSec: 10 },
  ],
};

// Nearest-wrong for skill2: a SELF damage-reduction read as a boss debuff.
const S2_FUDGE: LooseBlock = {
  slot: 'skill2',
  trigger: { kind: 'fullBurstEnter' },
  target: { kind: 'enemy' },
  effects: [
    { kind: 'buff', stat: 'damageTakenPct', value: 57.86, durationSec: 15 },
  ],
};

// --- hoisted runs (9 total) ------------------------------------------------

const SHIPPED = run();
const S1_CLEARED = run(patch((ov) => setBlocks(ov, 'skill1', [])));
const S1_FUDGED = run(
  patch((ov) => setBlocks(ov, 'skill1', [...getBlocks(ov, 'skill1'), S1_FUDGE]))
);
const S2_CLEARED = run(patch((ov) => setBlocks(ov, 'skill2', [])));
const S2_FUDGED = run(
  patch((ov) => setBlocks(ov, 'skill2', [...getBlocks(ov, 'skill2'), S2_FUDGE]))
);
const BURST_ZEROED = run(
  patch((ov) => setBlocks(ov, 'burst', getBlocks(ov, 'burst').map(zeroDamage)))
);
const BURST_REF = run(patch((ov) => setBlocks(ov, 'burst', [NUKE()])));
const BURST_REF_CORE = run(
  patch((ov) => setBlocks(ov, 'burst', [NUKE({ core: true })]))
);
const BURST_REF_NOFB = run(
  patch((ov) => setBlocks(ov, 'burst', [NUKE({ noFb: true })]))
);

// --- skill1 ----------------------------------------------------------------

describe('ludmilla skill1 - last-bullet enemy DEF/ATK reduction, 10 sec', () => {
  it('is damage-inert for the entire team', () => {
    // No boss-DEF-reduction StatKey and no boss-ATK model exist, so a faithful
    // encoding moves nothing. Byte-identical across every slug, not just hers.
    expect(S1_CLEARED.tot).toEqual(SHIPPED.tot);
  });

  it('never launders the DEF cut into a damageTakenPct buff of the kit magnitude', () => {
    expect(buffApplies(SHIPPED.events, 'damageTakenPct', 8.4)).toHaveLength(0);
  });

  it('NON-VACUITY: the last-bullet trigger fires here, so the fudge would be visible', () => {
    // If this fails, the inertness assertion above is testing nothing - either
    // she never reloads in the fixture or damageTakenPct is not wired.
    expect(S1_FUDGED.tot[SLUG]).toBeGreaterThan(SHIPPED.tot[SLUG]);
  });

  it('NON-VACUITY: the fudge would also pay teammates - which is why it is wrong', () => {
    const mates = Object.keys(SHIPPED.tot).filter((s) => s !== SLUG);
    expect(mates.length).toBeGreaterThan(0);
    expect(mates.some((s) => S1_FUDGED.tot[s] > SHIPPED.tot[s])).toBe(true);
  });

  it.skip('GAP: DEF down 8.4% on the boss - no boss-DEF-reduction StatKey exists; boss DEF is a subtractive formula term, so damageTakenPct is not an equivalent primitive', () => {});

  it.skip('GAP: ATK down 8.4% on the boss - boss offence is unmodeled at scope lock (the boss deals no damage), so the line has no observable payload', () => {});
});

// --- skill2 ----------------------------------------------------------------

describe('ludmilla skill2 - Full-Burst-enter taunt + self damage reduction', () => {
  it('is damage-inert for the entire team', () => {
    expect(S2_CLEARED.tot).toEqual(SHIPPED.tot);
  });

  it('does not invert the SELF damage reduction into a boss damage-taken debuff', () => {
    // 'Damage Taken down 57.86% ... Affects self' is defensive. A boss-side
    // damageTakenPct of this size would be one of the largest buffs on the
    // roster and would inflate every unit in the comp.
    expect(buffApplies(SHIPPED.events, 'damageTakenPct', 57.86)).toHaveLength(
      0
    );
  });

  it('NON-VACUITY: Full Burst is entered in this fixture, so the fudge would be visible', () => {
    expect(S2_FUDGED.tot[SLUG]).toBeGreaterThan(SHIPPED.tot[SLUG]);
  });

  it.skip('GAP: Attract/Taunt for 15.09 sec - no aggro/threat primitive exists and the boss targets nothing, so the line is unobservable', () => {});

  it.skip('GAP: self Damage Taken down 57.86% for 15 sec - no incoming-damage model at scope lock (nobody takes damage), so the line is unobservable', () => {});
});

// --- burst -----------------------------------------------------------------

describe('ludmilla burst - 163.1% of final ATK', () => {
  it('NON-VACUITY: she actually casts, and her burst damage is non-zero', () => {
    // BURST_ZEROED keeps the impact (and its gauge) but nulls the damage, so
    // this isolates the damage without perturbing rotation timing.
    expect(SHIPPED.tot[SLUG]).toBeGreaterThan(BURST_ZEROED.tot[SLUG]);
  });

  it('is exactly ONE 163.1% instance per cast, not one per "10 enemy unit(s)"', () => {
    // The reference is a hand-built single burstCast/enemy flatDamage of
    // 163.1%. A 10-target reading against the single boss lands ~10x this.
    expect(rel(SHIPPED.tot[SLUG], BURST_REF.tot[SLUG])).toBeLessThan(0.001);
  });

  it('does not core-strike (the kit text never says core strike damage)', () => {
    // First half is the non-vacuity check: core must be observable in this
    // fixture at all, otherwise the second half proves nothing.
    expect(rel(BURST_REF_CORE.tot[SLUG], BURST_REF.tot[SLUG])).toBeGreaterThan(
      1e-6
    );
    expect(rel(SHIPPED.tot[SLUG], BURST_REF_CORE.tot[SLUG])).toBeGreaterThan(
      1e-6
    );
  });

  it('takes no Full Burst major - burst-cast damage lands before the FB window opens', () => {
    // If burst-cast damage were FB-eligible, the explicit noFb flag would
    // change the number. It must be a strict no-op here.
    expect(BURST_REF_NOFB.tot[SLUG]).toBe(BURST_REF.tot[SLUG]);
  });

  it('carries the ally DEF up 12.93% line even though defPct is inert in v1', () => {
    const defBuffs = buffApplies(SHIPPED.events, 'defPct', 12.93);
    expect(defBuffs.length).toBeGreaterThan(0);
    // 'Affects all allies' includes self.
    const targets = new Set(defBuffs.map((e) => e.targetSlug));
    expect(targets.has(SLUG)).toBe(true);
    expect(targets.size).toBeGreaterThan(1);
  });

  it('the ally DEF buff moves no damage', () => {
    // BURST_REF drops the DEF block entirely; if defPct were feeding damage,
    // the single-instance equality above could not hold. Asserted explicitly
    // so a future defPct consumer fails loudly here rather than silently.
    expect(rel(SHIPPED.tot[SLUG], BURST_REF.tot[SLUG])).toBeLessThan(0.001);
    const mates = Object.keys(SHIPPED.tot).filter((s) => s !== SLUG);
    for (const s of mates) {
      expect(rel(SHIPPED.tot[s], BURST_REF.tot[s])).toBeLessThan(0.001);
    }
  });

  it.skip('GAP: the above-50%-HP gate is scope-trivial - allies take no damage at scope lock, so the gate is permanently satisfied and cannot be discriminated', () => {});
});
