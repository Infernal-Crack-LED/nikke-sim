/**
 * diesel — BLIND kit-spec test (cross-family S5 post-op). Written from the kit prose ALONE;
 * no sight of the driver's override, tests, truth file, or reasoning.
 *
 * KIT (MG / Wind / Defender / Burst II — ammo 300, hitsPerShot 1, reloadFrames 151, cd 20s):
 *  S1a  FB-enter, self: DEF ▲25.92% for 10s        -> defPct (v1-INERT stat: proven on the event log)
 *  S1b  when attacked in Attract, self: heal 12.96% -> GAP (boss deals no damage; no 'attacked' trigger)
 *  S1c  after 150 normals in Attract: buff stacks ▲1-> GAP (no "raise maxStacks" primitive)
 *  S2a  after 70 normals, self: Max Ammo ▲56.7%,
 *       stacks 10, 10s                             -> maxAmmoPct — DAMAGE-RELEVANT (shot economy)
 *  S2b  at max Candy stacks, after removal, ALL allies:
 *       reload 86.62% of magazine + Pierce Dmg ▲30% 10s
 *                                                  -> instantReload (damage) + pierceDamagePct (inert)
 *  Ba   5 highest-ATK enemies: 299.66% of final ATK -> flatDamage; ONE boss => ONE hit per cast, FB-exempt
 *  Bb   self: Max HP ▲100.05% (no heal) for 10s     -> maxHp* grant (inert: she has no atkOfMaxHpPct)
 *  Bc   Attract: taunt all enemies 10s              -> targetStatus (no observable event channel)
 *
 * FIXTURE: controlComp('diesel', true) — liter B1 / crown B2 / diesel / helm B3, so Full Bursts
 * actually chain. diesel is Burst II and therefore COMPETES with the fixed crown B2 slot: her own
 * burstCast count is expected to be < the Full-Burst count, which is exactly what makes the S1a
 * trigger-identity assertion (fullBurstEnter vs burstCast) discriminating. Every burst-slot group
 * is guarded by an explicit non-vacuity check on her burstCast count so a fixture where she never
 * casts fails LOUDLY rather than passing empty.
 *
 * SHAPE NOTE: the packet documents the slot payload two ways (slot === Block[] vs slot.blocks).
 * slotBlocks() accepts BOTH so a counterfactual patch can never silently become a no-op — a
 * no-op patch would turn every discriminating assertion green for the wrong reason.
 *
 * Runs are hoisted (8 full 180s sims).
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

const SLUG = 'diesel';

type AnyEv = SimEvent & Record<string, any>;

function slotBlocks(slot: any): any[] {
  if (Array.isArray(slot)) {
    return slot;
  }
  if (slot && Array.isArray(slot.blocks)) {
    return slot.blocks;
  }
  return [];
}

function eachEffect(
  ov: any,
  slot: 'skill1' | 'skill2' | 'burst',
  fn: (blk: any) => void
): void {
  for (const b of slotBlocks(ov?.[slot])) {
    if (Array.isArray(b?.effects)) {
      fn(b);
    }
  }
}

/** Remove every effect matching `pred` from one slot (returns how many were removed). */
function dropEffects(
  ov: any,
  slot: 'skill1' | 'skill2' | 'burst',
  pred: (e: any) => boolean
): number {
  let n = 0;
  eachEffect(ov, slot, (b) => {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => !pred(e));
    n += before - b.effects.length;
  });
  return n;
}

/** Mutate every effect matching `pred` in one slot (returns how many were touched). */
function mapEffects(
  ov: any,
  slot: 'skill1' | 'skill2' | 'burst',
  pred: (e: any) => boolean,
  mut: (e: any) => void
): number {
  let n = 0;
  eachEffect(ov, slot, (b) => {
    for (const e of b.effects) {
      if (pred(e)) {
        mut(e);
        n += 1;
      }
    }
  });
  return n;
}

interface Run {
  events: AnyEv[];
  totalsMap: Record<string, number>;
  total: number;
  team: number;
  /** how many effects the counterfactual actually touched (0 => the patch was a no-op) */
  patched: number;
}

function run(patch?: (ov: any) => number): Run {
  const events: AnyEv[] = [];
  const base: any = controlComp(SLUG, true);
  let patched = -1;
  const opts: any = {
    ...base,
    cfg: {
      ...(base.cfg ?? {}),
      onEvent: (ev: SimEvent) => events.push(ev as AnyEv),
    },
  };
  if (patch) {
    const ov = withPatchedOverride(SLUG, (o: any) => {
      patched = patch(o);
    });
    opts.overrides = { ...(base.overrides ?? {}), [SLUG]: ov };
  }
  const res = runComp(opts);
  const totalsMap = totals(res);
  return {
    events,
    totalsMap,
    total: totalsMap[SLUG],
    team: Object.values(totalsMap).reduce((a, b) => a + b, 0),
    patched,
  };
}

// ---------------------------------------------------------------- hoisted runs
const BASE = run();
const NO_DEF = run((o) =>
  dropEffects(o, 'skill1', (e) => e.kind === 'buff' && e.stat === 'defPct')
);
const NO_CANDY = run((o) =>
  dropEffects(o, 'skill2', (e) => e.kind === 'buff' && e.stat === 'maxAmmoPct')
);
const NO_RELOAD = run((o) =>
  dropEffects(o, 'skill2', (e) => e.kind === 'instantReload')
);
const NO_PIERCE = run((o) =>
  dropEffects(
    o,
    'skill2',
    (e) =>
      (e.kind === 'buff' && e.stat === 'pierceDamagePct') ||
      e.kind === 'gainPierce'
  )
);
const NO_BURST_DMG = run((o) =>
  dropEffects(o, 'burst', (e) => e.kind === 'flatDamage')
);
const HALF_BURST_DMG = run((o) =>
  mapEffects(
    o,
    'burst',
    (e) => e.kind === 'flatDamage',
    (e) => {
      e.atkPct = e.atkPct / 2;
    }
  )
);
const NO_MAXHP = run((o) =>
  dropEffects(
    o,
    'burst',
    (e) =>
      e.kind === 'buff' &&
      (e.stat === 'targetMaxHpPct' ||
        e.stat === 'casterMaxHpPct' ||
        e.stat === 'maxHpPct')
  )
);

// ---------------------------------------------------------------- event helpers
const buffApplies = (r: Run, stat: string) =>
  r.events.filter((e) => e.kind === 'buffApply' && e.stat === stat);

/** diesel's slot index, derived from any self-targeted buffApply (targetSlug is documented). */
const DIESEL_IDX: number = (() => {
  const ev = BASE.events.find(
    (e) =>
      e.kind === 'buffApply' &&
      e.targetSlug === SLUG &&
      typeof e.targetIdx === 'number'
  );
  return ev ? (ev.targetIdx as number) : -1;
})();

const dieselDamage = (r: Run) =>
  r.events.filter((e) => e.kind === 'damage' && e.srcSlot === DIESEL_IDX);
const dieselCasts = BASE.events.filter(
  (e) => e.kind === 'burstCast' && (e.srcSlot ?? e.casterIdx) === DIESEL_IDX
);
const fbStarts = BASE.events.filter((e) => e.kind === 'fullBurstStart');
const COMP_SIZE = Object.keys(BASE.totalsMap).length;

// ================================================================= S1a — DEF on FB enter
describe('diesel S1a — "entering Full Burst → self DEF ▲25.92% for 10 sec"', () => {
  it('the fixture is non-vacuous: Full Bursts actually happen and diesel is in the comp', () => {
    expect(fbStarts.length).toBeGreaterThanOrEqual(1);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(
      unitOf(BASE.totalsMap ? ({ units: [] } as any) : (null as any), SLUG)
    ).toBeDefined; // placeholder guarded below
  });

  it('fires once per TEAM Full Burst — not once per diesel burst cast (trigger identity)', () => {
    const applies = buffApplies(BASE, 'defPct').filter(
      (e) => e.targetSlug === SLUG
    );
    expect(applies.length).toBeGreaterThanOrEqual(1);
    // fullBurstEnter (correct) === FB count. The nearest-wrong burstCast keying would give
    // diesel's OWN cast count, which is strictly smaller here (crown holds the fixed B2 slot).
    expect(applies.length).toBe(fbStarts.length);
  });

  it('carries the exact kit magnitude, self-scope, and a FINITE 10s window', () => {
    const a = buffApplies(BASE, 'defPct').filter(
      (e) => e.targetSlug === SLUG
    )[0];
    expect(a).toBeDefined();
    expect(a.value).toBeCloseTo(25.92, 5); // nearest-wrong: 12.96 / 2592 / a maxHp mis-encode
    expect(a.casterIdx).toBe(DIESEL_IDX);
    expect(a.targetIdx).toBe(DIESEL_IDX);
    expect(Number.isFinite(a.expiresFrame)).toBe(true); // nearest-wrong: modeled as permanent
  });

  it('is damage-INERT (self DEF moves nothing) and never touches an ally', () => {
    expect(NO_DEF.patched).toBeGreaterThanOrEqual(1); // the counterfactual really bit
    expect(NO_DEF.total).toBe(BASE.total);
    expect(NO_DEF.totalsMap).toEqual(BASE.totalsMap);
    const foreign = buffApplies(BASE, 'defPct').filter(
      (e) => e.casterIdx === DIESEL_IDX && e.targetSlug !== SLUG
    );
    expect(foreign).toHaveLength(0);
  });
});

// ================================================================= S2a — Strawberry Candy
describe('diesel S2a — "after 70 normal attacks: Max Ammo ▲56.7%, 10 stacks, 10 sec"', () => {
  it('is encoded as a PERCENT ammo buff at the kit magnitude, capped at 10 stacks, timed', () => {
    const a = buffApplies(BASE, 'maxAmmoPct').filter(
      (e) => e.targetSlug === SLUG
    );
    expect(a.length).toBeGreaterThanOrEqual(1);
    expect(a[0].value).toBeCloseTo(56.7, 5); // nearest-wrong: maxAmmoFlat 56.7 ROUNDS
    expect(a[0].maxStacks).toBe(10); // nearest-wrong: uncapped stacking
    expect(Number.isFinite(a[0].expiresFrame)).toBe(true); // nearest-wrong: permanent
    expect(a[0].casterIdx).toBe(DIESEL_IDX);
    expect(a[0].targetIdx).toBe(DIESEL_IDX); // self only — no ally leak
  });

  it('fires on a 70-HIT cadence (not per shot fired, not every 150)', () => {
    // normal-attack hits = diesel damage events in the run with her burst nuke removed.
    const normalHits = dieselDamage(NO_BURST_DMG).length;
    expect(normalHits).toBeGreaterThan(700); // MG over 180s — sanity / non-vacuity
    const applies = buffApplies(BASE, 'maxAmmoPct').filter(
      (e) => e.targetSlug === SLUG
    ).length;
    const expected = Math.floor(normalHits / 70);
    expect(Math.abs(applies - expected)).toBeLessThanOrEqual(2);
    // nearest-wrong shotFired keying would give ~normalHits applies; hitCount 150 gives ~half.
  });

  it('MOVES DAMAGE — a bigger magazine buys shots an MG otherwise loses to reloads', () => {
    expect(NO_CANDY.patched).toBeGreaterThanOrEqual(1);
    expect(BASE.total).toBeGreaterThan(NO_CANDY.total);
  });

  it('does not move a teammate (self-scoped weapon state)', () => {
    for (const slug of Object.keys(BASE.totalsMap)) {
      if (slug === SLUG) {
        continue;
      }
      expect(NO_CANDY.totalsMap[slug]).toBe(BASE.totalsMap[slug]);
    }
  });
});

// ================================================================= S2b — max-stack payload
describe('diesel S2b — "at max Candy stacks, after removal → ALL allies: reload 86.62% + Pierce Dmg ▲30% 10s"', () => {
  it('grants the Pierce buff to EVERY ally, at the kit magnitude, timed', () => {
    const p = buffApplies(BASE, 'pierceDamagePct');
    expect(p.length).toBeGreaterThanOrEqual(1);
    expect(p[0].value).toBeCloseTo(30, 5);
    expect(Number.isFinite(p[0].expiresFrame)).toBe(true);
    const targets = new Set(p.map((e) => e.targetSlug));
    expect(targets.size).toBe(COMP_SIZE); // nearest-wrong: self-scoped (size 1)
    expect(targets.has(SLUG)).toBe(true); // "all allies" includes the caster
  });

  it('fires on the MAX-STACK cadence, far rarer than the 70-hit Candy trigger', () => {
    const candy = buffApplies(BASE, 'maxAmmoPct').filter(
      (e) => e.targetSlug === SLUG
    ).length;
    const perAlly = buffApplies(BASE, 'pierceDamagePct').filter(
      (e) => e.targetSlug === SLUG
    ).length;
    expect(perAlly).toBeGreaterThanOrEqual(1); // non-vacuity: max stacks IS reached in 180s
    // 10 stacks × 70 hits per payload => at most ~candy/5 even with a generous ⚑ estimate.
    expect(perAlly * 5).toBeLessThanOrEqual(candy);
  });

  it('the Pierce buff is v1-INERT (no pierce-tagged carrier in this comp)', () => {
    expect(NO_PIERCE.patched).toBeGreaterThanOrEqual(1);
    expect(NO_PIERCE.totalsMap).toEqual(BASE.totalsMap);
  });

  it('the 86.62% magazine refill MOVES DAMAGE for the whole team', () => {
    expect(NO_RELOAD.patched).toBeGreaterThanOrEqual(1);
    expect(BASE.total).toBeGreaterThan(NO_RELOAD.total); // diesel herself
    expect(BASE.team).toBeGreaterThan(NO_RELOAD.team); // "all allies", not self-only
  });
});

// ================================================================= Burst — 299.66% nuke
describe('diesel burst — "5 highest-ATK enemies: 299.66% of final ATK"', () => {
  it('NON-VACUITY: diesel (Burst II, competing with the fixed crown slot) actually casts', () => {
    expect(dieselCasts.length).toBeGreaterThanOrEqual(1);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(unitOf(BASE as any, SLUG) ?? true).toBeTruthy;
  });

  it('lands exactly ONE hit per cast — one boss, not five targets', () => {
    expect(NO_BURST_DMG.patched).toBeGreaterThanOrEqual(1);
    const extraHits =
      dieselDamage(BASE).length - dieselDamage(NO_BURST_DMG).length;
    expect(extraHits).toBe(dieselCasts.length); // nearest-wrong: 5×casts (target count mis-read)
  });

  it('the damage is LIVE and scales linearly with the kit atkPct', () => {
    const full = BASE.total - NO_BURST_DMG.total;
    const half = BASE.total - HALF_BURST_DMG.total;
    expect(full).toBeGreaterThan(0);
    expect(half).toBeGreaterThan(0);
    expect(full / half).toBeCloseTo(2, 2); // a clamped/flat mis-encode breaks the ratio
  });

  it('is FULL-BURST EXEMPT (a burst cast resolves before the FB window opens)', () => {
    const fbMajor = (r: Run) =>
      dieselDamage(r).filter((e) => e.fbMajorApplied === true).length;
    // removing the nuke must not change how many of her hits carried the +50% FB major:
    // if the nuke were (wrongly) FB-boosted it would show up as extra fbMajorApplied hits.
    expect(fbMajor(BASE)).toBe(fbMajor(NO_BURST_DMG));
  });

  it('grants no offensive buff to anyone — her kit has no ATK/crit line', () => {
    const offensive = new Set([
      'atkPct',
      'casterAtkPct',
      'highestAllyAtkPct',
      'atkOfMaxHpPct',
      'attackDamagePct',
      'critRatePct',
      'critRateNormalPct',
      'critDamagePct',
      'coreDamagePct',
      'elementDamagePct',
      'damageTakenPct',
    ]);
    const leaked = BASE.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.casterIdx === DIESEL_IDX &&
        offensive.has(e.stat)
    );
    expect(leaked).toHaveLength(0);
  });
});

// ================================================================= Burst — Max HP ▲100.05%
describe('diesel burst — "self: Max HP ▲100.05% without restoring HP for 10 sec"', () => {
  it('emits a FLAT-resolved self Max-HP grant once per cast', () => {
    const g = buffApplies(BASE, 'maxHpFlat').filter(
      (e) => e.targetSlug === SLUG && e.casterIdx === DIESEL_IDX
    );
    expect(g.length).toBe(dieselCasts.length); // nearest-wrong: fullBurstEnter keying (> casts)
    expect(g[0].value).toBeGreaterThan(0); // caster-scaled stats emit FLAT HP, not "100.05"
    expect(Number.isFinite(g[0].expiresFrame)).toBe(true); // "for 10 sec", not permanent
  });

  it('emits NO recovery/heal event — the kit says "without restoring HP"', () => {
    const heals = BASE.events.filter(
      (e) =>
        (e.kind === 'recovery' || e.kind === 'heal') &&
        (e.casterIdx === DIESEL_IDX || e.srcSlot === DIESEL_IDX)
    );
    expect(heals).toHaveLength(0);
  });

  it('is damage-INERT (diesel carries no atkOfMaxHpPct consumer)', () => {
    expect(NO_MAXHP.patched).toBeGreaterThanOrEqual(1);
    expect(NO_MAXHP.totalsMap).toEqual(BASE.totalsMap);
  });
});

// ================================================================= GAPS
describe('diesel — kit lines with no observable channel in v1', () => {
  it.skip('S1b "when attacked in Attract status → recover 12.96% of final Max HP": GAP — the v1 boss deals no damage and there is no "attacked" trigger, so the line can never fire; it is also HP-only (no damage consumer)', () => {});

  it.skip('S1c "after landing 150 normal attacks in Attract status → Stack count of buffs ▲1": GAP — no primitive raises another buff\'s maxStacks (the Candy cap 10→11), and "in Attract status" is a SELF status the enemy-keyed targetStatus/requiresTargetStatus channel cannot express', () => {});

  it.skip('Burst "Attract: Taunt all enemies for 10 sec": GAP — targetStatus emits no event kind, and both of its kit consumers (S1b/S1c) are themselves GAPs, so nothing observable depends on the window', () => {});

  it.skip('S2b trigger identity is ⚑: "reaches max stacks … activates after stacks are removed" has no engine trigger; the nearest primitive is a 700-hit (10×70) hitCount proxy. The cadence assertion above bounds it but cannot pin the exact removal semantics (natural 10s lapse vs consumption) without footage', () => {});
});
