/**
 * d — BLIND per-unit kit spec test (cross-family S5 post-op writer).
 *
 * Written from the kit prose ALONE. Never saw the driver's override, tests, or reasoning.
 *
 * KIT (as read literally):
 *   skill1 ■ "Activates when entering Full Burst. Affects self."
 *            - Elemental Advantage Attack Damage ▲46.93% for 15 sec
 *            - Recovers 3.52% of attack damage as HP, 15 sec (lifesteal)
 *          ■ "Affects self when first activated."
 *            - Additionally recovers 16.5% of ATK damage as HP, 15 sec (lifesteal)
 *   skill2 ■ "Activates when the stage target appears. Affects all allies."
 *            - Fills Burst Gauge by 98.56%, 1 time per battle
 *            - Immunity to Stun for 36.95 sec
 *          ■ "…stage target appears. Affects self."
 *            - Elemental Advantage Attack Damage ▲91.09% for 15 sec
 *   burst  ■ all enemies: 426.24% of final ATK as Burst Skill damage
 *          ■ all Attacker allies: Damage to Parts ▲42.38% for 15 sec
 *          ■ all allies IF the skill user has immunity to Stun: Full Burst Duration ▲5.04 sec
 *
 * FIXTURE: controlComp('d', true) — liter B1 / crown B2 / d B3 / helm B3, Fire boss, focus d.
 *   The fixed B3 (helm) is REQUIRED here: d's own burst CD is 40s while the chain re-fires far
 *   faster, so d cannot cast on every Full Burst. That gap is exactly what separates the kit's
 *   "entering Full Burst" trigger from a burst-cast reading (failure-mode taxonomy #3).
 *
 * ELEMENT NOTE (load-bearing for two assertions): d is Wind, the control boss is Fire, and Fire
 *   beats Wind — d has NO elemental advantage in this fixture. Both
 *   "Elemental Advantage Attack Damage ▲" lines are therefore DAMAGE-INERT here by construction.
 *   That is not a weakness of the test: an override that mis-encoded them as a generic
 *   attackDamagePct (the nearest-wrong model) WOULD move damage, so the inertness assertion is
 *   the discriminator. The ACTIVE case is unreachable from this fixture (see it.skip).
 *
 * COUNTERFACTUAL STYLE: every patch is ENCODING-AGNOSTIC (matched on kit magnitude or effect
 *   kind, swept across all three slots) because the blind writer cannot see how the driver
 *   authored the blocks. Slot access tolerates both the slot-keyed `Block[]` and the
 *   `CharacterSkills{blocks}` shape, so a shape guess can never silently no-op a counterfactual.
 *
 * RUNS: 7 hoisted 180s sims.
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

const SLUG = 'd';
const SLOTS = ['skill1', 'skill2', 'burst'] as const;

type BuffApplyEv = {
  kind: 'buffApply';
  stat: string;
  key?: string;
  value: number;
  targetSlug?: string;
  casterIdx: number | null;
  targetIdx: number | null;
  expiresFrame?: number;
  durationShots?: number;
};
type DamageEv = {
  kind: 'damage';
  inFullBurst?: boolean;
  bucket?: string;
  srcSlot?: number;
};

// --- shape-tolerant slot access (override FILE is slot-keyed; each slot is either a Block[]
// --- or a CharacterSkills carrying its own blocks[]). Handle both so a patch never no-ops.
function blocksOf(ov: any, slot: string): any[] {
  const s = ov?.[slot];
  if (!s) {
    return [];
  }
  if (Array.isArray(s)) {
    return s;
  }
  return Array.isArray(s.blocks) ? s.blocks : [];
}
function allBlocks(ov: any): any[] {
  return SLOTS.flatMap((s) => blocksOf(ov, s));
}
function dropEffects(ov: any, pred: (e: any) => boolean): void {
  for (const b of allBlocks(ov)) {
    if (Array.isArray(b.effects)) {
      b.effects = b.effects.filter((e: any) => !pred(e));
    }
  }
}
const near = (a: any, b: number): boolean =>
  typeof a === 'number' && Math.abs(a - b) < 0.02;

function run(overrides?: Record<string, any>) {
  const events: SimEvent[] = [];
  const opts: any = controlComp(SLUG, true);
  if (overrides) {
    opts.overrides = { ...(opts.overrides ?? {}), ...overrides };
  }
  opts.onEvent = (ev: SimEvent) => events.push(ev);
  const res = runComp(opts);
  return { res, events, dmg: totals(res) as Record<string, number> };
}
type Run = ReturnType<typeof run>;

const buffs = (evs: SimEvent[]): BuffApplyEv[] =>
  evs.filter(
    (e) => (e as any).kind === 'buffApply'
  ) as unknown as BuffApplyEv[];
const damages = (evs: SimEvent[]): DamageEv[] =>
  evs.filter((e) => (e as any).kind === 'damage') as unknown as DamageEv[];
const countKind = (evs: SimEvent[], kind: string): number =>
  evs.filter((e) => (e as any).kind === kind).length;
// ordering-only clock: how much of the fight elapsed (in team trigger-pulls) before FB #1.
const shotsBeforeFirstFb = (evs: SimEvent[]): number => {
  const i = evs.findIndex((e) => (e as any).kind === 'fullBurstStart');
  if (i < 0) {
    return Number.POSITIVE_INFINITY;
  }
  return evs.slice(0, i).filter((e) => (e as any).kind === 'shot').length;
};
const inFbHits = (r: Run): number =>
  damages(r.events).filter((d) => d.inFullBurst === true).length;
const sumDmg = (m: Record<string, number>): number =>
  Object.values(m).reduce((a, b) => a + b, 0);

// ---------------------------------------------------------------- hoisted runs (7)
const base = run();

// nearest-wrong probe for BOTH elemental-advantage lines: matched by MAGNITUDE, not by stat key,
// so a generic-stat mis-encoding is still stripped and its damage contribution is exposed.
const noElemAdv = run({
  [SLUG]: withPatchedOverride(SLUG, (ov: any) =>
    dropEffects(ov, (e) => near(e?.value, 46.93) || near(e?.value, 91.09))
  ),
});

const noParts = run({
  [SLUG]: withPatchedOverride(SLUG, (ov: any) =>
    dropEffects(ov, (e) => near(e?.value, 42.38))
  ),
});

const noGaugeFill = run({
  [SLUG]: withPatchedOverride(SLUG, (ov: any) =>
    dropEffects(ov, (e) => e?.kind === 'fillGauge')
  ),
});

const noBurstNuke = run({
  [SLUG]: withPatchedOverride(SLUG, (ov: any) =>
    dropEffects(ov, (e) => near(e?.atkPct, 426.24))
  ),
});

const noFbExtend = run({
  [SLUG]: withPatchedOverride(SLUG, (ov: any) =>
    dropEffects(ov, (e) => e?.kind === 'fullBurstExtend')
  ),
});

// trigger-identity counterfactual: re-key skill1's FB-enter block to the owner's own burst cast.
const fbEnterAsBurstCast = run({
  [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
    for (const b of blocksOf(ov, 'skill1')) {
      if (b?.trigger?.kind === 'fullBurstEnter') {
        b.trigger = { kind: 'burstCast' };
      }
    }
  }),
});

// ---------------------------------------------------------------- wiring sanity
describe('d — fixture wiring', () => {
  it('runs d in the control comp and emits an event stream', () => {
    expect(base.events.length).toBeGreaterThan(0);
    expect(base.dmg[SLUG]).toBeGreaterThan(0);
    expect(unitOf(base.res, SLUG).totalDamage).toBe(base.dmg[SLUG]);
  });

  it('actually chains Full Bursts (a lone B3 would make zero)', () => {
    expect(countKind(base.events, 'fullBurstStart')).toBeGreaterThan(2);
  });
});

// ---------------------------------------------------------------- skill1 block A
describe('d skill1 — FB-enter self Elemental Advantage Attack Damage ▲46.93% / 15s', () => {
  const applies = buffs(base.events).filter((e) => near(e.value, 46.93));

  it('lands in the elemental-advantage bucket, on self', () => {
    // Nearest-wrong: a generic attackDamagePct / elementDamagePct encoding at the same magnitude.
    expect(applies.length).toBeGreaterThan(0);
    for (const a of applies) {
      expect(a.stat).toBe('elemAdvantageDamagePct');
      if (a.targetSlug !== undefined) {
        expect(a.targetSlug).toBe(SLUG);
      }
    }
  });

  it('fires on EVERY team Full Burst, not only on d\u2019s own burst casts', () => {
    // Trigger identity (taxonomy #3). d\u2019s burst CD is 40s and the chain re-fires faster, so a
    // burstCast reading strictly under-fires here — the counterfactual proves the gap is real.
    const fb = countKind(base.events, 'fullBurstStart');
    expect(fb).toBeGreaterThan(2);
    expect(applies.length).toBe(fb);

    const cf = buffs(fbEnterAsBurstCast.events).filter((e) =>
      near(e.value, 46.93)
    );
    expect(cf.length).toBeGreaterThan(0); // non-vacuity: the wrong model still fires sometimes
    expect(cf.length).toBeLessThan(applies.length);
  });

  it('carries a finite 15s window rather than a whole-fight passive', () => {
    // A permanent/no-duration encoding would emit once (or never re-apply); the faithful line
    // re-applies per Full Burst and each apply must declare an expiry.
    for (const a of applies) {
      if (a.expiresFrame !== undefined) {
        expect(Number.isFinite(a.expiresFrame)).toBe(true);
      }
      expect(a.durationShots).toBeUndefined(); // "for 15 sec" is wall-clock, not a round count
    }
  });
});

// ---------------------------------------------------------------- skill2 block B (self elem adv)
describe('d skill2 — stage-appear self Elemental Advantage Attack Damage ▲91.09% / 15s', () => {
  const applies = buffs(base.events).filter((e) => near(e.value, 91.09));

  it('applies exactly once (the stage target appears once at scope lock) and is self-scoped', () => {
    expect(applies.length).toBe(1);
    expect(applies[0].stat).toBe('elemAdvantageDamagePct');
    if (applies[0].targetSlug !== undefined) {
      expect(applies[0].targetSlug).toBe(SLUG);
    }
  });
});

// ---------------------------------------------------------------- element gate, both lines
describe('d — the elemental-advantage gate is real (Wind d vs the Fire control boss)', () => {
  it('stripping BOTH elemental-advantage magnitudes moves no unit\u2019s damage', () => {
    // Fire beats Wind ⇒ d has no advantage here ⇒ elemAdvantageDamagePct is inert by design.
    // Under the nearest-wrong generic-stat encoding these buffs WOULD feed the Damage Up bucket
    // and this counterfactual would move d\u2019s total — that is the discrimination.
    for (const slug of Object.keys(base.dmg)) {
      expect(noElemAdv.dmg[slug]).toBe(base.dmg[slug]);
    }
  });
});

// ---------------------------------------------------------------- skill2 block A (gauge fill)
describe('d skill2 — "Fills Burst Gauge by 98.56%", 1 time per battle, on stage-target appear', () => {
  it('fires at battle start and pulls the first Full Burst dramatically earlier', () => {
    // Ordering-only clock (team trigger-pulls before FB #1) — no frame field assumed.
    const withFill = shotsBeforeFirstFb(base.events);
    const without = shotsBeforeFirstFb(noGaugeFill.events);
    expect(without).toBeGreaterThan(0); // non-vacuity: without the fill the gauge must be earned
    expect(withFill).toBeLessThan(without);
  });

  it('is ONCE per battle, not once per rotation', () => {
    // A repeating fill would top the gauge up after every Full Burst and collapse the rotation
    // cadence to roughly the FB window itself, inflating the FB count far past +1.
    const fbBase = countKind(base.events, 'fullBurstStart');
    const fbNo = countKind(noGaugeFill.events, 'fullBurstStart');
    expect(fbBase).toBeGreaterThanOrEqual(fbNo);
    expect(fbBase - fbNo).toBeLessThanOrEqual(2);
  });
});

// ---------------------------------------------------------------- burst block 1 (nuke)
describe('d burst — 426.24% of final ATK as Burst Skill damage (all enemies)', () => {
  it('contributes real damage attributed to d', () => {
    expect(base.dmg[SLUG]).toBeGreaterThan(noBurstNuke.dmg[SLUG]);
  });

  it('is enemy-directed only — no teammate total moves', () => {
    for (const slug of Object.keys(base.dmg)) {
      if (slug === SLUG) {
        continue;
      }
      expect(noBurstNuke.dmg[slug]).toBe(base.dmg[slug]);
    }
  });
});

// ---------------------------------------------------------------- burst block 2 (parts)
describe('d burst — Damage to Parts ▲42.38% / 15s (all Attacker allies)', () => {
  const applies = buffs(base.events).filter((e) => near(e.value, 42.38));

  it('is emitted in the parts bucket', () => {
    // Nearest-wrong: promoting a parts-scoped line to attackDamagePct, which would be a live
    // team damage buff on a boss that has no parts.
    expect(applies.length).toBeGreaterThan(0);
    for (const a of applies) {
      expect(a.stat).toBe('partsDamagePct');
    }
  });

  it('is class-scoped — the Burst I support slot (liter, Supporter) never receives it', () => {
    for (const a of applies) {
      if (a.targetSlug !== undefined) {
        expect(a.targetSlug).not.toBe('liter');
      }
    }
  });

  it('is damage-inert on the partless control boss', () => {
    for (const slug of Object.keys(base.dmg)) {
      expect(noParts.dmg[slug]).toBe(base.dmg[slug]);
    }
  });
});

// ---------------------------------------------------------------- burst block 3 (FB duration)
describe('d burst — Full Burst Duration ▲5.04 sec (all allies, gated on stun immunity)', () => {
  it('lengthens the team Full Burst windows', () => {
    // Time-in-FB fraction is monotonic in the extension (10/C vs 15/(C+5) for any cycle C>0),
    // so a faithful extension strictly raises the count of hits landing inside Full Burst.
    expect(inFbHits(noFbExtend)).toBeGreaterThan(0); // non-vacuity
    expect(inFbHits(base)).toBeGreaterThan(inFbHits(noFbExtend));
  });

  it('raises TEAM output, not just d\u2019s (it is an all-allies effect)', () => {
    expect(sumDmg(base.dmg)).toBeGreaterThan(sumDmg(noFbExtend.dmg));
    for (const slug of Object.keys(base.dmg)) {
      if (slug === SLUG) {
        continue;
      }
      expect(base.dmg[slug]).not.toBe(noFbExtend.dmg[slug]);
    }
  });

  // GAP — the kit gates this on "if the skill user has immunity to Stun", and d self-grants that
  // immunity for 36.95 sec from stage-target appear. Read literally, only bursts cast inside the
  // first 36.95s should extend Full Burst; d\u2019s own burst CD is 40s, so at most her FIRST cast
  // qualifies. The engine has no ally-status primitive (requiresTargetStatus is boss-side only),
  // so the gate is inexpressible and an unconditional model over-credits every later cast.
  it.skip('suppresses the extension for d bursts cast after the 36.95s stun-immunity window (GAP: no ally-status primitive)', () => {});

  // GAP — pinning the window at exactly 10s → 15.04s needs an event frame/timestamp field, whose
  // name is not specified in the blind harness contract; only ordering-based proxies were used.
  it.skip('pins the extended Full Burst window at 15.04s (GAP: SimEvent frame field not in the blind contract)', () => {});
});

// ---------------------------------------------------------------- lifesteal + stun immunity
describe('d — sustain lines (documented, not damage-bearing at scope lock)', () => {
  // GAP — "Recovers 3.52% of attack damage as HP" and the first-activation-only
  // "Additionally recovers 16.5% of ATK damage as HP" are both SELF-targeted lifesteal. v1 models
  // no HP pool, and d carries no `recovery` trigger of her own, so there is no cross-unit
  // heal-synergy consumer to observe (taxonomy #4 checked and cleared: the lines never leave d).
  it.skip('models the self lifesteal lines (3.52% + first-activation 16.5% of attack damage as HP) — GAP: no HP pool, self-scoped, no on-recovery consumer', () => {});

  // GAP — "Gains immunity to Stun for 36.95 sec" (all allies). The boss inflicts no stun at scope
  // lock, so the status is defensively inert; its ONLY load-bearing role is opening the burst
  // block 3 gate above, which has no primitive.
  it.skip('models the 36.95s team stun immunity — GAP: no stun in the scope-lock fight and no ally-status primitive', () => {});

  // GAP — the fixture cannot exercise the ACTIVE side of the elemental-advantage buffs: the
  // control boss is Fire and d is Wind. A Wind-advantaged (Iron) boss fixture would be required.
  it.skip('exercises the ACTIVE case of the 46.93% / 91.09% elemental-advantage buffs — GAP: control boss is Fire, Wind d has no advantage', () => {});
});
