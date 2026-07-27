/**
 * elegg-boom-and-shock — BLIND per-unit kit-spec test (authored from the kit prose ALONE;
 * the driver's override / tests / reasoning were NOT consulted).
 *
 * KIT (ground truth, read literally):
 *  S1a  "Activates at the start of battle. Affects 1 random enemy." — 6 sec possession, recurring
 *       every 6 sec; 100 hits CUMULATIVE ACROSS ALL ALLIES captures 1 ghost; cap 13 ghosts.
 *       => a currency/resource pool with a ramp. The exact accrual cadence is OUTSIDE the input
 *          domain (⚑): the engine has no "team cumulative HIT count inside a 6s possession window"
 *          trigger (teamAmmo counts ROUNDS consumed; hitCount counts the OWNER's hits only).
 *  S1b  "Affects all Water Code allies", cumulative tiers keyed to the ghost count:
 *         >=1 ghost  : ATK ▲16.2% OF THE SKILL USER'S ATK, continuously  => casterAtkPct 16.2
 *         >=4 ghosts : Elemental Advantage Attack Damage ▲35%, continuously
 *                      => elemAdvantageDamagePct 35 (NOT elementDamagePct / attackDamagePct)
 *  S2a  "Activates when using Burst Skill. Affects self. ATK ▲40% for 10 sec."
 *       => trigger burstCast (NOT fullBurstEnter), target self, atkPct 40, durationSec 10
 *  S2b  "when a ghost is captured while at maximum ghost capacity. Affects all enemies.
 *       Deals 1100% of final ATK" => flatDamage 1100, gated on the pool being AT CAP (13)
 *  Ba   ghosts != 13: 800% of final ATK, sequential x6; ghosts ▼6 (floor 1)
 *  Bb   ghosts == 13: 800% of final ATK, sequential x13; ghosts ▼9
 *
 * FIXTURE — controlComp(SLUG, true) = liter(B1) / crown(B2) / elegg(B3) / helm(B3), Fire boss, 180s.
 *  - TWO Burst-III units + elegg's own 40s burst CD => elegg does NOT cast on every Full Burst, so a
 *    burstCast-keyed self buff and a fullBurstEnter-keyed one have DIFFERENT counts here. That is the
 *    S2a discriminator (keying to FB-enter OVER-CREDITS).
 *  - Fire boss + Water carry => elemental advantage is LIVE, so the S1b tier-2 buff is non-vacuous.
 *  - Mixed-element team => a Water-scoped ally buff must land on a PROPER SUBSET of the comp; the
 *    nearest-wrong model (target {kind:'allies'}) lands on all four. Asserted set-theoretically so the
 *    test never hardcodes which teammate happens to be Water Code.
 *
 * SHAPE NOTES: the override FILE is slot-keyed; a slot is either a Block[] or a CharacterSkills
 * carrying blocks[] — blocksOf() tolerates both so the test measures the KIT, not the wrapper.
 * withPatchedOverride(SLUG, () => {}) is used to read the committed override as an in-memory clone
 * (the JSON on disk is never touched) and to build every counterfactual.
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

const SLUG = 'elegg-boom-and-shock';
const SLOTS = ['skill1', 'skill2', 'burst'] as const;
type Slot = (typeof SLOTS)[number];

const near = (a: unknown, b: number, tol = 1e-6) =>
  typeof a === 'number' && Math.abs(a - b) <= tol;

const blocksOf = (ov: any, slot: Slot): any[] => {
  const s = ov?.[slot];
  if (!s) {
    return [];
  }
  return Array.isArray(s) ? s : (s.blocks ?? []);
};
const allBlocks = (ov: any): Array<{ b: any; slot: Slot }> =>
  SLOTS.flatMap((s) =>
    blocksOf(ov, s).map((b: any) => ({ b, slot: (b.slot ?? s) as Slot }))
  );
const allEffects = (ov: any): Array<{ e: any; b: any; slot: Slot }> =>
  allBlocks(ov).flatMap(({ b, slot }) =>
    (b.effects ?? []).map((e: any) => ({ e, b, slot }))
  );

const OV: any = withPatchedOverride(SLUG, () => {});
const BLOCKS = allBlocks(OV);
const EFFECTS = allEffects(OV);
const fx = (pred: (e: any) => boolean) => EFFECTS.filter(({ e }) => pred(e));
const blocksWith = (pred: (e: any) => boolean) =>
  BLOCKS.filter(({ b }) => (b.effects ?? []).some((e: any) => pred(e)));

const patchEffects = (pred: (e: any) => boolean, mutate: (e: any) => void) =>
  withPatchedOverride(SLUG, (ov: any) => {
    for (const slot of SLOTS) {
      for (const b of blocksOf(ov, slot)) {
        for (const e of b.effects ?? []) {
          if (pred(e)) {
            mutate(e);
          }
        }
      }
    }
  });
const patchBlocks = (pred: (b: any) => boolean, mutate: (b: any) => void) =>
  withPatchedOverride(SLUG, (ov: any) => {
    for (const slot of SLOTS) {
      for (const b of blocksOf(ov, slot)) {
        if (pred(b)) {
          mutate(b);
        }
      }
    }
  });

function run(patched?: any, sink?: SimEvent[]) {
  const opts: any = controlComp(SLUG, true);
  const cfg: any = { ...(opts.cfg ?? {}) };
  const o: any = { ...opts, cfg };
  if (sink) {
    const onEvent = (ev: SimEvent) => sink.push(ev);
    cfg.onEvent = onEvent;
    o.onEvent = onEvent; // belt-and-braces: onEvent lives on cfg, mirrored top-level
  }
  if (patched) {
    o.overrides = { ...(opts.overrides ?? {}), [SLUG]: patched };
  }
  return runComp(o);
}

// ---- hoisted runs (each is a full 180s sim) -------------------------------------------------
const EV: SimEvent[] = [];
const BASE = run(undefined, EV);
const BASE_T = totals(BASE);
const COMP_SLUGS = Object.keys(BASE_T);

const NO_T1 = totals(
  run(
    patchEffects(
      (e) => e.stat === 'casterAtkPct' && near(e.value, 16.2),
      (e) => {
        e.value = 0;
      }
    )
  )
);
const T1_ALL_EV: SimEvent[] = [];
const T1_ALL = totals(
  run(
    patchBlocks(
      (b) => (b.effects ?? []).some((e: any) => e.stat === 'casterAtkPct'),
      (b) => {
        b.target = { kind: 'allies' };
      }
    ),
    T1_ALL_EV
  )
);
const NO_T2 = totals(
  run(
    patchEffects(
      (e) => e.stat === 'elemAdvantageDamagePct',
      (e) => {
        e.value = 0;
      }
    )
  )
);
const NO_B40 = totals(
  run(
    patchEffects(
      (e) => e.kind === 'buff' && e.stat === 'atkPct' && near(e.value, 40),
      (e) => {
        e.value = 0;
      }
    )
  )
);
const NO_NUKE = totals(
  run(
    patchEffects(
      (e) => e.kind === 'flatDamage' && near(e.atkPct, 1100),
      (e) => {
        e.atkPct = 0;
      }
    )
  )
);
const NO_B800 = totals(
  run(
    patchEffects(
      (e) => e.kind === 'flatDamage' && near(e.atkPct, 800),
      (e) => {
        e.atkPct = 0;
      }
    )
  )
);

const changed = (t: Record<string, number>) =>
  COMP_SLUGS.filter((s) => t[s] !== BASE_T[s]);
const unchangedExcept = (t: Record<string, number>, keep: string[]) =>
  COMP_SLUGS.filter((s) => !keep.includes(s)).every((s) => t[s] === BASE_T[s]);

// elegg's unit index, resolved from any self-targeted buffApply she emits (casterIdx === targetIdx).
const ELEGG_IDX: number | undefined = (() => {
  const ev: any = EV.find(
    (x: any) =>
      x.kind === 'buffApply' &&
      x.targetSlug === SLUG &&
      x.casterIdx != null &&
      x.casterIdx === x.targetIdx
  );
  return ev?.casterIdx;
})();
const actorOf = (ev: any): string | undefined =>
  ev.slug ?? ev.unit ?? ev.unitSlug ?? ev.casterSlug ?? ev.srcSlug;
const byElegg = (ev: any) =>
  actorOf(ev) === SLUG ||
  (ELEGG_IDX != null &&
    (ev.idx === ELEGG_IDX ||
      ev.unitIdx === ELEGG_IDX ||
      ev.casterIdx === ELEGG_IDX));
const kind = (k: string, src: SimEvent[] = EV) =>
  src.filter((e: any) => e.kind === k);

describe('elegg-boom-and-shock — harness sanity (guards every event-level claim below)', () => {
  it('the fixture runs, emits events, and elegg is identifiable in them', () => {
    expect(COMP_SLUGS).toContain(SLUG);
    expect(unitOf(BASE, SLUG).totalDamage).toBeGreaterThan(0);
    expect(EV.length).toBeGreaterThan(0);
    // If this is undefined the slug/index accessors below are wrong, not the override.
    expect(typeof ELEGG_IDX).toBe('number');
    expect(kind('fullBurstStart').length).toBeGreaterThan(0);
  });
});

describe('S1b tier-1 — "ATK ▲16.2% of the skill user\'s ATK" to all Water Code allies', () => {
  it('is CASTER-scaled (casterAtkPct 16.2), not a target-scaling atkPct', () => {
    // Nearest-wrong: atkPct 16.2 (scales each ally\'s OWN ATK) or highestAllyAtkPct — different
    // magnitude on every teammate whose base ATK differs from elegg\'s.
    expect(
      fx(
        (e) =>
          e.kind === 'buff' && e.stat === 'casterAtkPct' && near(e.value, 16.2)
      ).length
    ).toBeGreaterThan(0);
    expect(
      fx((e) => e.kind === 'buff' && e.stat === 'atkPct' && near(e.value, 16.2))
    ).toHaveLength(0);
    expect(
      fx(
        (e) =>
          e.kind === 'buff' &&
          e.stat === 'highestAllyAtkPct' &&
          near(e.value, 16.2)
      )
    ).toHaveLength(0);
  });

  it('is ELEMENT-scoped: lands on a proper subset of the comp, including elegg herself', () => {
    const applies = EV.filter(
      (e: any) =>
        e.kind === 'buffApply' &&
        e.stat === 'casterAtkPct' &&
        e.casterIdx === ELEGG_IDX
    );
    expect(applies.length).toBeGreaterThan(0);
    const targets = new Set(applies.map((e: any) => e.targetSlug));
    expect(targets.has(SLUG)).toBe(true); // elegg is Water Code — "all Water Code allies" includes self
    // RED under target {kind:'allies'} (the nearest-wrong): that set covers the whole comp.
    expect(targets.size).toBeLessThan(COMP_SLUGS.length);
  });

  it('the element scope is load-bearing: widening it to {kind:allies} adds targets and moves damage', () => {
    const wideApplies = T1_ALL_EV.filter(
      (e: any) =>
        e.kind === 'buffApply' &&
        e.stat === 'casterAtkPct' &&
        e.casterIdx === ELEGG_IDX
    );
    const wide = new Set(wideApplies.map((e: any) => e.targetSlug));
    const baseTargets = new Set(
      EV.filter(
        (e: any) =>
          e.kind === 'buffApply' &&
          e.stat === 'casterAtkPct' &&
          e.casterIdx === ELEGG_IDX
      ).map((e: any) => e.targetSlug)
    );
    expect(wide.size).toBeGreaterThan(baseTargets.size);
    expect(changed(T1_ALL).length).toBeGreaterThan(0);
  });

  it('is live (zeroing it lowers elegg) and never reaches the non-Water part of the comp', () => {
    expect(NO_T1[SLUG]).toBeLessThan(BASE_T[SLUG]);
    // Element-agnostic inertness: SOME teammate must be untouched — a team-wide buff would move all.
    expect(changed(NO_T1).length).toBeLessThan(COMP_SLUGS.length);
    expect(changed(NO_T1)).toContain(SLUG);
  });
});

describe('S1b tier-2 — "Elemental Advantage Attack Damage ▲35%" at >=4 ghosts', () => {
  it('uses the advantage-gated stat, not a generic element/attack damage stat', () => {
    expect(
      fx(
        (e) =>
          e.kind === 'buff' &&
          e.stat === 'elemAdvantageDamagePct' &&
          near(e.value, 35)
      ).length
    ).toBeGreaterThan(0);
    // Nearest-wrong: elementDamagePct/attackDamagePct 35 pays out with NO advantage requirement.
    expect(
      fx(
        (e) =>
          e.kind === 'buff' &&
          e.stat === 'elementDamagePct' &&
          near(e.value, 35)
      )
    ).toHaveLength(0);
    expect(
      fx(
        (e) =>
          e.kind === 'buff' && e.stat === 'attackDamagePct' && near(e.value, 35)
      )
    ).toHaveLength(0);
  });

  it('is non-vacuous on this fixture (Water carry vs Fire boss) and is live', () => {
    expect(NO_T2[SLUG]).toBeLessThan(BASE_T[SLUG]);
  });

  it('carries the same Water-ally scope as tier-1 (one "Affects all Water Code allies" header)', () => {
    const t1 = blocksWith(
      (e) => e.stat === 'casterAtkPct' && near(e.value, 16.2)
    );
    const t2 = blocksWith((e) => e.stat === 'elemAdvantageDamagePct');
    expect(t1.length).toBeGreaterThan(0);
    expect(t2.length).toBeGreaterThan(0);
    const tk = (x: any) => JSON.stringify(x.b.target);
    expect(new Set(t2.map(tk))).toEqual(new Set(t1.map(tk)));
  });

  it('the 4-ghost tier is gated or ramped — NOT an ungated passive live from t=0', () => {
    // 4 ghosts cannot exist at battle start (>=4 captures required); a bare passive over-credits the
    // opening window. Accepted encodings: a resourceGate, a non-passive accrual trigger, or rampSec.
    const t2 = blocksWith((e) => e.stat === 'elemAdvantageDamagePct');
    const ok = t2.every(
      ({ b }: any) =>
        b.resourceGate != null ||
        b.everyN != null ||
        b.trigger?.kind !== 'passive' ||
        (b.effects ?? []).some((e: any) => e.rampSec != null)
    );
    expect(ok).toBe(true);
  });
});

describe('S2a — "Activates when using Burst Skill. Affects self. ATK ▲40% for 10 sec."', () => {
  it('is authored as a 10-SECOND self atkPct 40 (seconds, not rounds)', () => {
    const hit = fx(
      (e) => e.kind === 'buff' && e.stat === 'atkPct' && near(e.value, 40)
    );
    expect(hit.length).toBeGreaterThan(0);
    expect(hit.some(({ e }) => near(e.durationSec, 10))).toBe(true);
    expect(hit.every(({ e }) => e.durationShots == null)).toBe(true);
    expect(hit.every(({ b }) => b.target?.kind === 'self')).toBe(true);
  });

  it("fires on elegg's OWN burst cast, not on every team Full Burst", () => {
    const eleggBursts = kind('burstCast').filter(byElegg);
    const fbStarts = kind('fullBurstStart');
    const applied = EV.filter(
      (e: any) =>
        e.kind === 'buffApply' &&
        e.stat === 'atkPct' &&
        near(e.value, 40) &&
        e.targetSlug === SLUG
    );
    expect(eleggBursts.length).toBeGreaterThan(1);
    // Fixture non-vacuity: with two B3s + a 40s CD there MUST be Full Bursts elegg did not cast,
    // otherwise burstCast and fullBurstEnter are indistinguishable here and the check below is moot.
    expect(fbStarts.length).toBeGreaterThan(eleggBursts.length);
    expect(applied.length).toBe(eleggBursts.length); // RED if keyed to fullBurstEnter (over-credits)
    expect(applied.length).toBeLessThan(fbStarts.length);
    expect(applied.every((e: any) => e.casterIdx === e.targetIdx)).toBe(true); // self, not an ally grant
  });

  it('is live on elegg and byte-inert on every teammate (target: self)', () => {
    expect(NO_B40[SLUG]).toBeLessThan(BASE_T[SLUG]);
    expect(unchangedExcept(NO_B40, [SLUG])).toBe(true);
  });
});

describe('S2b — "when a ghost is captured while at maximum ghost capacity": 1100% of final ATK', () => {
  it('is modeled as a 1100% flat hit', () => {
    expect(
      fx((e) => e.kind === 'flatDamage' && near(e.atkPct, 1100)).length
    ).toBeGreaterThan(0);
  });

  it('actually fires in a 180s fight (the at-cap condition is reachable) and is elegg-only', () => {
    // RED if the block exists but its gate never opens (modeled-but-inert) or if it was dropped.
    expect(NO_NUKE[SLUG]).toBeLessThan(BASE_T[SLUG]);
    expect(unchangedExcept(NO_NUKE, [SLUG])).toBe(true);
  });

  it('is gated on being AT capacity, not on every capture', () => {
    const nuke = blocksWith(
      (e) => e.kind === 'flatDamage' && near(e.atkPct, 1100)
    );
    expect(nuke.length).toBeGreaterThan(0);
    // Faithful gate: a resource floor at the 13 cap (or an explicit trigger that can only fire at cap).
    const gated = nuke.every(
      ({ b }: any) =>
        (b.resourceGate?.min ?? 0) >= 13 || b.mode != null || b.everyN != null
    );
    expect(gated).toBe(true);
  });
});

describe('burst — two ghost-count branches of 800% sequential hits', () => {
  const burstRiders = EFFECTS.filter(
    ({ e, slot }) => slot === 'burst' && e.kind === 'flatDamage'
  );

  it('each hit is 800% and sequential-flavored — hits are NOT merged into one big number', () => {
    const eight = burstRiders.filter(({ e }) => near(e.atkPct, 800));
    expect(eight.length).toBeGreaterThanOrEqual(6);
    expect(eight.every(({ e }) => e.flavor === 'sequential')).toBe(true);
    // Nearest-wrong: one 4800%/10400% lump (loses per-hit crit rolls).
    expect(
      burstRiders.filter(
        ({ e }) => near(e.atkPct, 4800) || near(e.atkPct, 10400)
      )
    ).toHaveLength(0);
  });

  it('BOTH branches exist: a 6-hit block (ghosts != 13) and a 13-hit block (ghosts == 13)', () => {
    const counts = BLOCKS.filter(({ slot }) => slot === 'burst')
      .map(
        ({ b }) =>
          (b.effects ?? []).filter(
            (e: any) => e.kind === 'flatDamage' && near(e.atkPct, 800)
          ).length
      )
      .filter((n) => n > 0);
    expect(counts).toContain(6);
    expect(counts).toContain(13);
  });

  it('the branches are mutually exclusive on the ghost count (no double-pay)', () => {
    const six = BLOCKS.find(
      ({ b, slot }: any) =>
        slot === 'burst' &&
        (b.effects ?? []).filter(
          (e: any) => e.kind === 'flatDamage' && near(e.atkPct, 800)
        ).length === 6
    );
    const thirteen = BLOCKS.find(
      ({ b, slot }: any) =>
        slot === 'burst' &&
        (b.effects ?? []).filter(
          (e: any) => e.kind === 'flatDamage' && near(e.atkPct, 800)
        ).length === 13
    );
    expect(six && thirteen).toBeTruthy();
    expect((six as any).b.resourceGate?.max).toBeLessThanOrEqual(12);
    expect((thirteen as any).b.resourceGate?.min).toBeGreaterThanOrEqual(13);
  });

  it('spends ghosts (▼6 / ▼9) so the branch condition can actually change between bursts', () => {
    const pools = [OV.resources, ...SLOTS.map((s) => (OV as any)[s]?.resources)]
      .filter(Boolean)
      .flat();
    expect(pools.length).toBeGreaterThan(0);
    expect(pools.some((p: any) => p.max === 13)).toBe(true); // "A maximum of 13 ghost(s)"
    const spends = EFFECTS.filter(
      ({ e, slot }) => slot === 'burst' && e.kind === 'resource' && e.delta < 0
    ).map(({ e }) => e.delta);
    expect(spends).toContain(-6);
    expect(spends).toContain(-9);
  });

  it('the burst riders are live on elegg and byte-inert on teammates', () => {
    expect(NO_B800[SLUG]).toBeLessThan(BASE_T[SLUG]);
    expect(unchangedExcept(NO_B800, [SLUG])).toBe(true);
  });
});

describe('kit-wide hygiene — nothing invented that the prose does not state', () => {
  it('no rider claims a core strike (no "core" wording anywhere in the kit)', () => {
    expect(
      EFFECTS.filter(({ e }) => e.kind === 'flatDamage' && e.core).length
    ).toBe(0);
    expect(BLOCKS.filter(({ b }) => b.requiresCore).length).toBe(0);
  });

  it('no measurement-gated ⚑ knobs are silently switched on (noFb, pierce)', () => {
    expect(
      EFFECTS.filter(({ e }) => e.kind === 'flatDamage' && e.noFb === true)
        .length
    ).toBe(0);
    expect(OV.hasPierce).toBeFalsy(); // the kit carries no Pierce line
    expect(EFFECTS.filter(({ e }) => e.kind === 'gainPierce').length).toBe(0);
  });

  it('carries no `ignored` effect blocks (validator rule) and declares all three slots', () => {
    expect(
      EFFECTS.filter(
        ({ e }) => e.kind === 'ignored' || e.kind === 'unsupported'
      ).length
    ).toBe(0);
    for (const s of SLOTS) {
      expect(Array.isArray(blocksOf(OV, s))).toBe(true);
    }
  });
});

describe('GAPS — ⚑ outside the input domain', () => {
  it.skip('ghost accrual cadence: "100 hits cumulative across ALL allies" per 6s possession window', () => {
    // No engine primitive counts TEAM hits: hitCount is owner-only, teamAmmo counts ROUNDS consumed
    // (an MG round != a landed hit, and infinite-ammo shots do not consume). Any capture cadence is a
    // ⚑ estimate. Recipe: pin the first-13-ghost time from footage (count the burst that fires 13
    // sequential popups) and back-solve captures/sec, then re-key this to a measured cadence.
  });
  it.skip('"Maintains at least 1 ghost" floor on the non-max burst branch', () => {
    // A resource min-clamp expresses the floor, but it is only observable once the pool can drop below
    // 6 — unreachable here if accrual outpaces the spend. Unobservable payload in this fixture.
  });
  it.skip('"Affects 1 random enemy" possession target + 6 sec possession window', () => {
    // Single-boss fixture: enemy selection and the possession window carry no damage payload the sim
    // can observe (resolveTargets({kind:'enemy'}) is empty).
  });
});
