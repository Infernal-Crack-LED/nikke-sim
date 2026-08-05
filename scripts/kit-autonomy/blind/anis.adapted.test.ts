/**
 * anis (Anis) — RL / Iron / Defender / Burst II — kit spec test.
 *
 * ADAPTED-COPY BANNER (driver-applied, structural-only — assertion intent untouched,
 * ade-agent-bunny / rupee precedent):
 *   1. Import path: '../lib/harness.js' → '../../tests/lib/harness.js' (the pristine artifact
 *      is written as if it lived in scripts/tests/units/).
 *   2. onEvent moved UNDER `cfg` (CompOptions carries no top-level onEvent; the pristine
 *      spread never wired the event capture).
 *   3. FIXTURE FIX — the B2 starvation trap (gauntlet task note / rupee measurement):
 *      controlComp('anis', true) seats crown, a second Burst II with a 20s cd, and first-ready
 *      same-stage selection hands crown EVERY stage-2 slot (measured 0 casts for the unit under
 *      test). The pristine file's own fixture-sanity assertion anticipates this ("demands a
 *      different fixture"). Swapped to the sole-B2 comp ['liter','anis','helm','ada']:
 *      liter (B1 20s) opens the chain, anis is the ONLY B2, helm + ada (both B3 40s) alternate
 *      the stage-3 slot so Full Bursts open every ~20s and anis casts every cycle. Boss Fire,
 *      focus anis — the same basis variables controlComp used.
 *   4. Event keying: damage events are keyed by `slug` + `srcSlot` (a SLOT-NAME string), not a
 *      numeric team index — anisBurstHits now filters on slug === 'anis'. The pristine
 *      resolveAnisSlot/targetIdx path is deleted with it.
 *   5. Tally pair arithmetic: with crown absent from the adapted comp, the "one remainder from
 *      the non-Attacker pair" term is liter + ada (comp membership swap; the assertion's
 *      intent — exactly self + 2 allies, never the whole team — is unchanged).
 *   6. buffApply.durationShots is typed `number | null` (types.ts: null = no round budget),
 *      so the pristine toBeUndefined() reads toBeNull() — same intent: a genuine-seconds
 *      duration carries NO round-count budget.
 *
 * Written BLIND from the kit prose alone (no sight of the shipped override, no sight of any
 * other author's tests). Structural summary of the kit:
 *
 *   skill1  trigger "when attacked 40 time(s)", self:      DEF ▲120% for 10 sec
 *   skill2  self + 2 allies with the highest FINAL ATK (except the skill user):
 *                                                          DEF ▲80% for 5 sec
 *                                                          + "Equally shares damage" 10 sec
 *   burst   enemies within attack range:                    156.73% of final ATK as damage
 *                                                          + DEF ▼32% for 5 sec
 *
 * WHAT THIS UNIT CAN MOVE IN v1
 * -----------------------------
 * Every DEF ▲ line is offensively inert (`defPct` is documented inert in types.ts — self DEF
 * does not affect own damage) and the damage-share line has no HP pool at scope lock (the
 * boss deals no damage). The ONE damage-bearing line in the whole kit is the burst's 156.73%
 * hit. That makes the interesting assertions here mostly NEGATIVE — what this kit must NOT
 * move — plus an exact pin on the single hit that it does.
 *
 * The enemy DEF ▼32% has NO primitive: StatKey carries no enemy-DEF-down key, and boss DEF is
 * a SUBTRACTIVE term in the formula. The nearest-wrong model folds it into `damageTakenPct`,
 * which is a different (multiplicative Damage-Taken bucket) mechanic and would lift the whole
 * team's damage. That fold is pinned out below.
 *
 * FIXTURE
 * -------
 * controlComp('anis', true) → liter (B1) / crown (B2) / anis (carry slot) / helm (B3).
 * anis is Burst II and crown is also Burst II, so crown CONTESTS her burst slot every
 * rotation. Every burst assertion is therefore guarded by an explicit non-vacuity check
 * ("fixture sanity"): if anis never casts, this file fails loudly instead of passing
 * vacuously. Deterministic (no seed).
 *
 * SLOT-SHAPE NOTE
 * ---------------
 * The harness docs describe the OverrideFile two ways — slot → Block[] and slot →
 * { blocks: Block[] }. The accessors below handle BOTH so a doc ambiguity cannot masquerade
 * as a kit failure.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

type Rec = Record<string, unknown>;
type Ev = Rec & { kind: string };
type Opts = ReturnType<typeof controlComp>;
type Overrides = Opts['overrides'];
type SlotName = 'skill1' | 'skill2' | 'burst';

const SLUG = 'anis';
const BURST_ATK_PCT = 156.73;

// --- override accessors (tolerate both documented file shapes) ---------------
function slotBlocks(ov: Rec, slot: SlotName): Rec[] {
  const cur = ov[slot];
  if (Array.isArray(cur)) {
    return cur as Rec[];
  }
  const nested = (cur as Rec | undefined)?.blocks;
  return Array.isArray(nested) ? (nested as Rec[]) : [];
}

function setSlotBlocks(ov: Rec, slot: SlotName, blocks: Rec[]): void {
  const cur = ov[slot];
  if (cur && !Array.isArray(cur) && typeof cur === 'object') {
    (cur as Rec).blocks = blocks;
  } else {
    ov[slot] = blocks;
  }
}

function effectsOf(blocks: Rec[]): Rec[] {
  return blocks.flatMap((b) =>
    Array.isArray(b.effects) ? (b.effects as Rec[]) : []
  );
}

function patch(mutate: (ov: Rec) => void): Overrides {
  const patched = withPatchedOverride(SLUG, (ov) =>
    mutate(ov as unknown as Rec)
  );
  return { [SLUG]: patched } as Overrides;
}

// --- run helper --------------------------------------------------------------
function run(overrides?: Overrides): {
  res: ReturnType<typeof runComp>;
  events: Ev[];
} {
  const events: Ev[] = [];
  // BANNER FIX 3: sole-B2 fixture (controlComp seats crown, a co-B2 that starves anis).
  const opts: Opts = {
    slugs: ['liter', SLUG, 'helm', 'ada'],
    bossElement: 'Fire',
    focusSlug: SLUG,
    // BANNER FIX 2: onEvent lives under `cfg`.
    cfg: { onEvent: (ev: SimEvent) => events.push(ev as unknown as Ev) },
  };
  if (overrides) {
    opts.overrides = { ...(opts.overrides ?? {}), ...overrides };
  }
  return { res: runComp(opts), events };
}

// --- hoisted runs (5 total; each is a full 180s sim) -------------------------
const base = run();

// counterfactual: anis's two defensive skills deleted entirely.
const noDefLines = run(
  patch((ov) => {
    setSlotBlocks(ov, 'skill1', []);
    setSlotBlocks(ov, 'skill2', []);
  })
);

// counterfactual: the burst's damage line removed.
const noBurstHit = run(
  patch((ov) => {
    for (const b of slotBlocks(ov, 'burst')) {
      if (Array.isArray(b.effects)) {
        b.effects = (b.effects as Rec[]).filter((e) => e.kind !== 'flatDamage');
      }
    }
  })
);

// counterfactual: the burst hit forced to core.
const burstHitCores = run(
  patch((ov) => {
    for (const e of effectsOf(slotBlocks(ov, 'burst'))) {
      if (e.kind === 'flatDamage') {
        e.core = true;
      }
    }
  })
);

// counterfactual: the burst hit's atkPct pinned to the kit-stated 156.73.
const burstHitPinned = run(
  patch((ov) => {
    for (const e of effectsOf(slotBlocks(ov, 'burst'))) {
      if (e.kind === 'flatDamage') {
        e.atkPct = BURST_ATK_PCT;
      }
    }
  })
);

// --- event helpers -----------------------------------------------------------
const buffApplies = (r: { events: Ev[] }): Ev[] =>
  r.events.filter((e) => e.kind === 'buffApply');
const damages = (r: { events: Ev[] }): Ev[] =>
  r.events.filter((e) => e.kind === 'damage');

// BANNER FIX 4: damage events are keyed by `slug` (srcSlot is a slot-NAME string, not a
// team index) — the pristine resolveAnisSlot/targetIdx indirection is unnecessary.
const anisBurstHits = (): Ev[] =>
  damages(base).filter((e) => e.bucket === 'burst' && e.slug === SLUG);

const def = (value: number): Ev[] =>
  buffApplies(base).filter((e) => e.stat === 'defPct' && e.value === value);

const tally = (evs: Ev[]): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const e of evs) {
    const s = e.targetSlug as string;
    out[s] = (out[s] ?? 0) + 1;
  }
  return out;
};

// =============================================================================
describe('anis — fixture sanity (non-vacuity)', () => {
  it('anis is in the comp, deals damage, and actually casts her Burst II', () => {
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
    expect(
      anisBurstHits().length,
      'anis landed no burst-bucket hit — either crown (also Burst II) wins the burst slot ' +
        'every rotation, which makes every burst assertion below vacuous and demands a ' +
        "different fixture, or the damage event's srcSlot is not the team-slot index"
    ).toBeGreaterThan(0);
  });
});

describe('skill1 — "when attacked 40 time(s)" → self DEF ▲120% / 10 sec', () => {
  // The activation is a damage-taken counter. The scope-lock boss deals no damage to the
  // team and the engine has no attacked/damage-taken trigger primitive, so the condition is
  // never satisfiable here. Nearest-wrong: re-keying it to `passive` or `interval` so the
  // (inert) buff is emitted anyway — that would show up as defPct=120 applications.
  it('never fires at scope lock: no DEF ▲120% is ever applied to anyone', () => {
    expect(def(120)).toHaveLength(0);
  });
});

describe('skill2 — self + 2 highest-final-ATK allies: DEF ▲80% / 5 sec', () => {
  it('the line is modeled at all (an inert stat is still kept, per schema policy)', () => {
    expect(
      def(80).length,
      'no DEF ▲80% application observed — skill2 stat line MISSING from the model'
    ).toBeGreaterThan(0);
  });

  // Target-set arithmetic, robust to live-ATK reordering within the non-Attacker pair:
  // each activation must cover anis + helm + exactly one of the non-Attacker pair, so counts
  // must satisfy helm == anis and (liter + ada) == anis and total == 3 x anis
  // (BANNER FIX 5: comp membership — the adapted sole-B2 comp fields ada, not crown).
  // helm is an Attacker (class ATK 118,027) vs liter's Supporter 98,367 / anis's Defender
  // 78,707, so helm is a top-ATK ally under BOTH static and final-ATK ranking.
  // Nearest-wrong models this kills: target `allies` (total = 4x), a missing excludeSelf
  // (anis consumes a slice slot, leaving one ally), or dropping the "self and" half (anis = 0).
  it('covers exactly self + 2 allies, never the whole team', () => {
    const t = tally(def(80));
    const a = t[SLUG] ?? 0;
    expect(
      a,
      'anis herself is never granted the buff — the "self and" half is missing'
    ).toBeGreaterThan(0);
    expect(t.helm ?? 0).toBe(a);
    expect((t.liter ?? 0) + (t.ada ?? 0)).toBe(a);
    expect(def(80).length).toBe(3 * a);
  });

  it('lasts 5 SECONDS — not 5 rounds, and not permanently', () => {
    for (const e of def(80)) {
      // BANNER FIX 6: the event field is `number | null` (null = no round budget).
      expect(e.durationShots).toBeNull();
      expect(typeof e.expiresFrame).toBe('number');
      expect(Number.isFinite(e.expiresFrame as number)).toBe(true);
    }
  });

  it('recurs over the fight — a cooldown skill, not a one-shot aura', () => {
    // >= 2 activations x 3 targets. A `passive` one-shot at t=0 yields exactly 3.
    expect(def(80).length).toBeGreaterThanOrEqual(6);
  });
});

describe('anis inertness — the defensive kit moves NO damage', () => {
  // DEF ▲ is inert (defPct) and "Equally shares damage taken" has no HP pool at scope lock.
  // Deleting skill1 + skill2 touches no damage and no gauge, so every unit's total must be
  // byte-identical. Nearest-wrong this kills: encoding either line as an offensive stat
  // (atkPct / damageTakenPct / attackDamagePct) to "make the unit do something".
  it('deleting skill1 + skill2 changes no unit\u2019s total damage', () => {
    expect(totals(noDefLines.res)).toEqual(totals(base.res));
  });
});

describe('burst — 156.73% of final ATK to enemies within attack range', () => {
  it('the hit exists and is the kit\u2019s only damage-bearing line', () => {
    expect(totals(noBurstHit.res)[SLUG]).toBeLessThan(totals(base.res)[SLUG]);
  });

  it('is exactly 156.73% — pinning atkPct to the kit value is a no-op', () => {
    // Exact-equality pin: any other shipped magnitude moves totals.
    expect(totals(burstHitPinned.res)).toEqual(totals(base.res));
  });

  it('lands pre-Full-Burst (no +50% major) and takes no +30% range bonus', () => {
    const hits = anisBurstHits();
    expect(hits.length).toBeGreaterThan(0);
    for (const h of hits) {
      expect(h.fbMajorApplied).toBe(false);
      expect(h.rangeApplied).toBe(false);
    }
  });

  it('does not core (the kit never says core strike)', () => {
    // Forcing core:true must INCREASE anis damage; equality would mean core was already on.
    expect(totals(burstHitCores.res)[SLUG]).toBeGreaterThan(
      totals(base.res)[SLUG]
    );
  });
});

describe('burst — DEF ▼32% / 5 sec on the enemy', () => {
  it('is NOT folded into damageTakenPct (a different, multiplicative mechanic)', () => {
    // DEF ▼ is subtractive in the damage formula; damageTakenPct is a multiplicative bucket
    // that would lift EVERY unit's damage, not just relieve the DEF term.
    const folded = buffApplies(base).filter(
      (e) => e.stat === 'damageTakenPct' && e.value === 32
    );
    expect(folded).toHaveLength(0);
  });

  it.skip('GAP: no enemy-DEF-down primitive — StatKey has no enemy DEF key, so the line cannot be modeled without a new stat + a boss-DEF hook', () => {});
});

describe('skill1 / skill2 unmodelable payloads', () => {
  it.skip('GAP: "Activates when attacked 40 time(s)" — no damage-taken/attacked trigger primitive, and the scope-lock boss deals no damage', () => {});
  it.skip('GAP: "Equally shares damage taken for 10 sec" — no HP pool / no incoming damage modeled at scope lock', () => {});
});

describe('override structure — claims this fixture cannot discriminate behaviourally', () => {
  const shipped = withPatchedOverride(SLUG, () => {}) as unknown as Rec;

  it('the burst hit is keyed to burstCast (not fullBurstEnter) and targets the enemy', () => {
    const carriers = slotBlocks(shipped, 'burst').filter((b) =>
      (Array.isArray(b.effects) ? (b.effects as Rec[]) : []).some(
        (e) => e.kind === 'flatDamage'
      )
    );
    expect(
      carriers.length,
      'no burst block carries a flatDamage effect'
    ).toBeGreaterThan(0);
    for (const b of carriers) {
      expect((b.trigger as Rec).kind).toBe('burstCast');
      expect((b.target as Rec).kind).toBe('enemy');
    }
  });

  it('skill2 ranks allies by FINAL ATK and excludes the skill user', () => {
    // The kit says "highest final ATK" → byFinalAtk: true. In this comp the static and
    // final-ATK orderings agree (helm is top either way), so only the authoring discriminates.
    const tops = slotBlocks(shipped, 'skill2')
      .map((b) => b.target as Rec | undefined)
      .filter((t): t is Rec => t?.kind === 'alliesTopAtk');
    expect(
      tops.length,
      'skill2 has no alliesTopAtk target block'
    ).toBeGreaterThan(0);
    for (const t of tops) {
      expect(t.count).toBe(2);
      expect(t.excludeSelf).toBe(true);
      expect(t.byFinalAtk).toBe(true);
    }
  });
});
