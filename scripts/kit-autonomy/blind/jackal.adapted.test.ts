import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js'; // path fixed by driver (gauntlet S5): blind/ sits under kit-autonomy/, not tests/units/

/**
 * jackal (RL/Iron/Defender/Burst I, cd 20s, ammo 6) — BLIND kit spec test.
 * Written from the kit prose alone; the shipped override was not consulted.
 *
 * KIT, structurally:
 *   S1  gate "when attacked 10 time(s)" -> 1 enemy, highest final Max HP
 *         Damage Taken ▲ 9.09% / 10s      ATK ▼ 9.09% / 10s
 *   S2  gate "start of battle" -> self + 2 allies, highest final ATK
 *         equally shares damage taken / 120s     DEF ▲ 8.27% / 120s
 *   BRS -> all allies
 *         Burst Skill damage of skills scoped "Affects 1 enemy unit(s)" ▲ 38.91% / 15s
 *         DEF ▲ 14.69% / 10s
 *
 * DISPOSITIONS (blind read):
 *   S1 both lines  -> GAP. The trigger counts incoming boss attacks; at scope lock the
 *                     boss deals no damage and the sim models no HP pool, so the
 *                     activation condition is unobservable. Damage Taken ▲ is a REAL
 *                     team-wide damage lever, so how it is gated is load-bearing: a
 *                     `passive` encoding buys permanent uptime for free.
 *   S2 share       -> UNMODELED (no HP pool; purely defensive).
 *   S2 DEF         -> FAITHFUL as a defPct buff (inert in v1 by design, but kept per the
 *                     "keep the stat buff even if the engine treats it inert" rule).
 *   BRS 38.91%     -> GAP. The scope is "burst skills whose description says
 *                     'Affects 1 enemy unit(s)'" and no StatKey expresses it. The
 *                     nearest-wrong model is a generic attackDamagePct, which would
 *                     over-credit EVERY ally's every hit for 15s.
 *   BRS DEF        -> FAITHFUL as a defPct buff on all allies.
 *
 * FIXTURE: controlComp('jackal', true) — liter(I) / crown(II) / jackal / helm(III).
 *   Jackal is Burst I and liter already holds stage 1, so jackal may never cast her own
 *   burst in this comp. `burst line casts at all` is therefore a HARD fixture-validity
 *   gate using an override-independent marker block; if it is RED, every burst-line
 *   assertion below is vacuous and the fixture needs a liter-free comp.
 *
 * WHY THE COUNTERFACTUALS DISCRIMINATE:
 *   Every jackal kit line is either defensively inert or lacks a primitive, so stripping
 *   S2+burst must leave the board byte-identical. That claim is only meaningful if the
 *   fixture COULD see an over-credit — so two nearest-wrong overrides (generic 38.91%
 *   attackDamagePct; permanent 9.09% damageTakenPct) are run and asserted to MOVE the
 *   board. Without those, the inertness assertions would pass vacuously.
 */

const SLUG = 'jackal';

type BuffApply = {
  kind: 'buffApply';
  stat: string;
  key: string;
  value: number;
  stacks?: number;
  casterIdx: number | null;
  targetIdx: number | null;
  targetSlug?: string;
  refresh?: boolean;
  expiresFrame?: number;
  durationShots?: number;
};

const near = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;

const buffApplies = (events: SimEvent[]) =>
  events.filter((e) => e.kind === 'buffApply') as unknown as BuffApply[];

/* The packet ships two contradictory override shapes: slot -> Block[] (OVERRIDE FILE
 * SHAPE) and slot -> { blocks: Block[] } (harness cheat-sheet). Handle both rather than
 * guess, so a shape mismatch cannot masquerade as a kit-faithfulness failure. */

type Slot = 'skill1' | 'skill2' | 'burst';

function clearSlot(ov: any, slot: Slot): void {
  const s = ov[slot];
  if (!s) {
    return;
  }
  if (Array.isArray(s)) {
    ov[slot] = [];
  } else {
    s.blocks = [];
  }
}

function pushBlock(ov: any, slot: Slot, block: any): void {
  const s = ov[slot];
  if (!s) {
    ov[slot] = [block];
    return;
  }
  if (Array.isArray(s)) {
    s.push(block);
  } else if (Array.isArray(s.blocks)) {
    s.blocks.push(block);
  } else {
    s.blocks = [block];
  }
}

function run(overrides?: Record<string, unknown>) {
  const events: SimEvent[] = [];
  const opts = controlComp(SLUG, true);
  if (overrides) {
    opts.overrides = { ...(opts.overrides ?? {}), ...overrides };
  }
  opts.cfg = {
    ...(opts.cfg ?? {}),
    onEvent: (ev: SimEvent) => {
      events.push(ev);
    },
  };
  const res = runComp(opts);
  return { res, events, tot: totals(res) };
}

// ---- hoisted runs (each is a full 180s sim) ----------------------------------

const base = run();

// S2 + burst stripped: both slots must be offensively inert.
const noS2Burst = run({
  [SLUG]: withPatchedOverride(SLUG, (ov) => {
    clearSlot(ov, 'skill2');
    clearSlot(ov, 'burst');
  }),
});

// S1 stripped: isolates whatever (if anything) the damage-taken debuff contributes.
const noS1 = run({
  [SLUG]: withPatchedOverride(SLUG, (ov) => {
    clearSlot(ov, 'skill1');
  }),
});

// NEAREST-WRONG A: the 38.91% scoped burst-skill buff encoded as generic Attack Damage.
const wrongGenericBurst = run({
  [SLUG]: withPatchedOverride(SLUG, (ov) => {
    pushBlock(ov, 'burst', {
      slot: 'burst',
      trigger: { kind: 'fullBurstEnter' },
      target: { kind: 'allies' },
      effects: [
        {
          kind: 'buff',
          stat: 'attackDamagePct',
          value: 38.91,
          durationSec: 15,
        },
      ],
    });
  }),
});

// NEAREST-WRONG B: the S1 boss debuff encoded as a permanent passive (free uptime).
const wrongPermanentDt = run({
  [SLUG]: withPatchedOverride(SLUG, (ov) => {
    pushBlock(ov, 'skill1', {
      slot: 'skill1',
      trigger: { kind: 'passive' },
      target: { kind: 'enemy' },
      effects: [{ kind: 'buff', stat: 'damageTakenPct', value: 9.09 }],
    });
  }),
});

// FIXTURE PROBE: an inert marker on jackal's own burstCast — does she ever burst here?
const MARKER = 0.001;
const markerRun = run({
  [SLUG]: withPatchedOverride(SLUG, (ov) => {
    pushBlock(ov, 'burst', {
      slot: 'burst',
      trigger: { kind: 'burstCast' },
      target: { kind: 'self' },
      effects: [{ kind: 'buff', stat: 'defPct', value: MARKER }],
    });
  }),
});

const jackalBursts = buffApplies(markerRun.events).filter((b) =>
  near(b.value, MARKER, 1e-6)
).length;

describe('jackal — fixture validity', () => {
  it('jackal is in the comp', () => {
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
  });

  // Non-vacuity gate for every burst-line assertion. Jackal is Burst I and liter also
  // holds stage 1, so stage-1 selection may never pick her. An inert defPct marker on
  // her own burstCast answers this WITHOUT reading her committed override.
  it('jackal actually casts her own burst in this fixture', () => {
    expect(jackalBursts).toBeGreaterThan(0);
  });
});

describe('jackal skill1 — "when attacked 10 time(s)" -> 1 enemy', () => {
  // The activation counts incoming boss attacks. The scope-lock boss deals no damage and
  // the sim models no HP pool, so there is no primitive that can observe the trigger.
  it.skip('GAP: no incoming-attack counter exists to gate the 10-hit trigger', () => {
    // Requires an incoming-damage / attacked-count channel the engine does not have.
  });

  // Damage Taken ▲ is a genuine team-wide damage lever, so the FAILURE MODE that matters
  // is granting it permanently. Faithful readings: either the line is a GAP (zero
  // applications) or it rides an honest proxy trigger that re-fires (many applications).
  // A SINGLE application is the permanent-passive over-credit. Nearest-wrong B is asserted
  // separately to prove this fixture can actually see the difference.
  it('damage-taken debuff is never a single permanent grant', () => {
    const dt = buffApplies(base.events).filter(
      (b) => b.stat === 'damageTakenPct'
    );
    expect(dt.length === 0 || dt.length > 1).toBe(true);
    for (const b of dt) {
      expect(near(b.value, 9.09)).toBe(true);
    }
  });

  // "Modeled but silently inert" is a real failure mode (debuff authored onto a trigger
  // that never fires, or mis-targeted at an ally instead of the boss). Tie the two
  // observables together: the debuff moves the board IF AND ONLY IF it is applied.
  it('S1 moves the board exactly when the debuff is applied', () => {
    const dt = buffApplies(base.events).filter(
      (b) => b.stat === 'damageTakenPct'
    );
    const identical = JSON.stringify(base.tot) === JSON.stringify(noS1.tot);
    expect(identical).toBe(dt.length === 0);
  });

  // The ATK ▼ rides the SAME "Affects 1 enemy unit(s)" target clause as the Damage Taken
  // ▲ — it debuffs the BOSS, and the boss has no ATK the sim reads. The nearest-wrong is
  // a sign/target slip that lands -9.09% atkPct on an ALLY, which would cut team damage.
  it('the enemy ATK debuff never lands on an ally', () => {
    const allyAtkDown = buffApplies(base.events).filter(
      (b) => (b.stat === 'atkPct' || b.stat === 'casterAtkPct') && b.value < 0
    );
    expect(allyAtkDown).toEqual([]);
  });
});

describe('jackal skill2 — start of battle -> self + 2 highest final ATK', () => {
  const defBuffs = buffApplies(base.events).filter(
    (b) => b.stat === 'defPct' && near(b.value, 8.27)
  );

  // Discriminates against dropping the line as "DEF is inert in v1, skip it": the
  // taxonomy requires keeping the stat buff for future consumers/scalers.
  it('grants DEF 8.27% at battle start', () => {
    expect(defBuffs.length).toBeGreaterThan(0);
  });

  // Target set: self + 2 allies = exactly 3 recipients. Nearest-wrong is `allies`
  // (all 5) or self-only (1).
  it('covers exactly 3 units, including jackal', () => {
    const slugs = new Set(defBuffs.map((b) => b.targetSlug));
    expect(slugs.size).toBe(3);
    expect(slugs.has(SLUG)).toBe(true);
  });

  // Duration semantics: 120s is SHORTER than the 180s fight, so it genuinely lapses.
  // Applied by a start-of-battle (frame 0) trigger => expiresFrame ~ 120*60 = 7200.
  // Nearest-wrong: authored permanent (no durationSec) or stretched to fight length.
  it('the DEF window is 120s, not permanent', () => {
    for (const b of defBuffs) {
      expect(b.expiresFrame).toBeDefined();
      expect(Number.isFinite(b.expiresFrame as number)).toBe(true);
      expect(b.expiresFrame as number).toBeGreaterThan(7140);
      expect(b.expiresFrame as number).toBeLessThan(7260);
    }
  });

  // "Equally shares damage taken" — no HP pool, no boss damage: purely defensive.
  it.skip('GAP: damage-sharing needs an HP pool the v1 sim does not model', () => {
    // Requires incoming-damage routing between allies.
  });
});

describe('jackal burst — all allies', () => {
  const defBuffs = buffApplies(base.events).filter(
    (b) => b.stat === 'defPct' && near(b.value, 14.69)
  );

  it('grants DEF 14.69% to all four allies', () => {
    expect(jackalBursts).toBeGreaterThan(0); // non-vacuity
    expect(defBuffs.length).toBeGreaterThan(0);
    // ADAPTED by driver (gauntlet S5): controlComp fields FOUR units (liter/crown/jackal/helm),
    // not five — the blind author assumed a 5-slot team. Assertion shape unchanged.
    expect(new Set(defBuffs.map((b) => b.targetSlug)).size).toBe(4);
  });

  // Applications should scale with the number of casts (5 allies per cast), not be a
  // one-shot grant. Discriminates a burstCast trigger from a passive.
  it('DEF 14.69% is re-granted per burst cast, not once', () => {
    // ADAPTED by driver (gauntlet S5): 4 allies per cast on the 4-unit controlComp.
    expect(defBuffs.length).toBe(jackalBursts * 4);
  });

  // The 38.91% line is scoped to burst skills whose description reads
  // "Affects 1 enemy unit(s)". No StatKey expresses that scope, so the faithful
  // disposition is GAP; the enactable failure is encoding it generically.
  it.skip('GAP: no StatKey scopes a buff to single-target burst skills', () => {
    // Needs a burst-skill-damage bucket keyed on the target-clause scope.
  });

  // The over-credit guard. A generic encoding boosts every ally hit for 15s per rotation.
  it('38.91% never appears as a generic damage buff', () => {
    const generic = new Set([
      'attackDamagePct',
      'atkPct',
      'casterAtkPct',
      'trueDamagePct',
      'elementDamagePct',
      'critDamagePct',
      'sustainedDamagePct',
    ]);
    const bad = buffApplies(base.events).filter(
      (b) => generic.has(b.stat) && near(b.value, 38.91)
    );
    expect(bad).toEqual([]);
  });
});

describe('jackal — inertness of the modeled kit', () => {
  // Every S2/burst line is defensive (DEF, damage-share) or unscoped-GAP, so removing
  // both slots must not shift a single unit's damage.
  it('stripping skill2 + burst leaves the board byte-identical', () => {
    expect(noS2Burst.tot).toEqual(base.tot);
  });

  // Proves the assertion above is NOT vacuous: the fixture demonstrably detects the
  // generic-encoding over-credit it is guarding against.
  it('the generic 38.91% mis-encoding WOULD move the board', () => {
    expect(wrongGenericBurst.tot).not.toEqual(base.tot);
  });

  // Same non-vacuity proof for the permanent damage-taken debuff.
  it('a permanent 9.09% damage-taken debuff WOULD move the board', () => {
    expect(wrongPermanentDt.tot).not.toEqual(base.tot);
  });

  // Teammates must be untouched by jackal's own damage output changing: her kit grants
  // no offensive buff at all, so her slot's presence in the buff graph is DEF-only.
  it('jackal contributes no offensive buff to any teammate', () => {
    const offensive = new Set([
      'atkPct',
      'casterAtkPct',
      'highestAllyAtkPct',
      'attackDamagePct',
      'critRatePct',
      'critDamagePct',
      'coreDamagePct',
      'elementDamagePct',
      'chargeDamagePct',
      'fireRatePct',
      'reloadSpeedPct',
      'maxAmmoPct',
      'maxAmmoFlat',
      'burstGenPct',
    ]);
    const jackalIdx = base.res.units?.findIndex?.(
      (u: { slug: string }) => u.slug === SLUG
    );
    const bad = buffApplies(base.events).filter(
      (b) =>
        offensive.has(b.stat) &&
        jackalIdx !== undefined &&
        jackalIdx >= 0 &&
        b.casterIdx === jackalIdx
    );
    expect(bad).toEqual([]);
  });
});
