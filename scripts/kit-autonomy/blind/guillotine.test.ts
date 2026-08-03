/**
 * guillotine — MG / Electric / Attacker / Burst III — BLIND kit-spec test.
 *
 * Kit (structural read of the prose; slot -> line):
 *   skill1  hitCount(30 landed normal attacks), self: Critical Rate +9.28% for 10 sec.
 *   skill1  self HP cost 2.01% (v1 has no HP pool -> audit-only, see GAP tests).
 *   skill2  hitCount(150 landed normal attacks), self: Critical Damage +14.69% for 5 sec.
 *   skill2  HP-threshold (below 70%), self: ATK +0.96% continuously per 1% HP lost.
 *   burst   burstCast: 1237.5% of final ATK as Burst Skill damage.
 *   burst   same target, gated on the caster's HP below 50%: a second 1237.5% hit.
 *
 * Fixture: controlComp('guillotine', false) = liter (B1) + crown (B2) + guillotine (B3).
 *   - B1+B2 are mandatory: a lone Burst III unit casts ZERO bursts, which would make every
 *     burst assertion vacuous.
 *   - The fixed 4th B3 slot is dropped (helm=false) because that slot's ally
 *     Critical-Rate-of-normal-attacks grant sits on exactly the stat skill1 moves; dropping
 *     it keeps the crit A/B unconfounded (and avoids any crit-rate saturation).
 *
 * Why each assertion discriminates (nearest-wrong models):
 *   S1  stat/value/window are read off the buffApply event and off the override structure, so
 *       a rescope to critRateNormalPct (scope failure-mode) or a permanent / round-count
 *       window (duration failure-mode) fails.
 *   S1/S2 trigger identity is proven WITHOUT trusting any per-unit event field: both lines are
 *       hit-count triggers on the SAME counter, so the 30-hit line must fire ~5x as often as
 *       the 150-hit line. Keying either to shotFired / interval / fullBurstEnter breaks the
 *       ratio (shotFired would make it ~150:1).
 *   S2a's 5s window is SHORTER than its ~150-round retrigger spacing, so it genuinely lapses
 *       -> the make-it-permanent counterfactual must raise totals (non-vacuity of the 5s
 *       bound). S1 deliberately gets NO such counterfactual: its 10s window is continuously
 *       refreshed at 30-round spacing, so permanent-vs-10s would be a near-no-op and the
 *       assertion would test nothing.
 *   Burst: zeroing the 1237.5% flatDamage must drop guillotine's total (proves she actually
 *       bursts here); ADDING an ungated second copy must raise it (proves the fixture would
 *       DETECT an always-on second HP branch, so the structural gate check is not vacuous).
 *
 * Shape note: the override FILE is slot-keyed; blocksOf() also tolerates a slot object that
 * carries its own blocks[] so the test does not depend on which of the two documented shapes
 * ships. Damage blocks are NOT asserted to carry target 'enemy' — the sim has no enemy entity,
 * so that authoring convention is an engine detail, not a kit-faithfulness claim.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { controlComp, runComp, totals, withPatchedOverride } from '../../tests/lib/harness.js'; // path fixed by driver: blind/ sits under kit-autonomy/, not tests/units/

const SLUG = 'guillotine';

type Opts = Parameters<typeof runComp>[0];
type Res = ReturnType<typeof runComp>;
type Ev = SimEvent & Record<string, unknown>;
type SlotName = 'skill1' | 'skill2' | 'burst';

interface EffectLike {
  kind?: string;
  stat?: string;
  value?: number;
  atkPct?: number;
  durationSec?: number;
  durationShots?: number;
}

interface BlockLike {
  trigger?: { kind?: string; count?: number | number[] };
  target?: { kind?: string };
  effects?: EffectLike[];
  [k: string]: unknown;
}

const SLOTS: SlotName[] = ['skill1', 'skill2', 'burst'];

const GATE_KEYS = [
  'formation',
  'teamHas',
  'mode',
  'everyN',
  'everyNOffset',
  'requiresCore',
  'fbGate',
  'swapGate',
  'requiresShielded',
  'requiresTargetStatus',
  'bossElementGate',
  'ownBurstGate',
  'resourceGate',
];

const near = (v: unknown, want: number): boolean =>
  typeof v === 'number' && Math.abs(v - want) < 1e-6;

function blocksOf(ov: unknown, slot: SlotName): BlockLike[] {
  const bag = ov as Record<string, unknown> | undefined;
  const s = bag?.[slot];
  if (Array.isArray(s)) {
    return s as BlockLike[];
  }
  const inner = (s as Record<string, unknown> | undefined)?.blocks;
  return Array.isArray(inner) ? (inner as BlockLike[]) : [];
}

function effectsOf(ov: unknown, slot: SlotName): EffectLike[] {
  return blocksOf(ov, slot).flatMap((b) => b.effects ?? []);
}

/** every prose field an override can use to record a deliberate skip, flattened + lowercased */
function auditText(ov: unknown): string {
  const bag = ov as Record<string, unknown> | undefined;
  const out: string[] = [];
  const collect = (v: unknown): void => {
    if (typeof v === 'string') {
      out.push(v);
    } else if (Array.isArray(v)) {
      v.forEach(collect);
    } else if (v !== null && typeof v === 'object') {
      Object.values(v as Record<string, unknown>).forEach(collect);
    }
  };
  collect(bag?.unmodeled);
  collect(bag?.note);
  collect(bag?.caveats);
  for (const slot of SLOTS) {
    const s = bag?.[slot];
    if (s !== null && typeof s === 'object' && !Array.isArray(s)) {
      collect((s as Record<string, unknown>).unmodeled);
    }
  }
  return out.join(' | ').toLowerCase();
}

const isS1Crit = (e: EffectLike): boolean =>
  e.kind === 'buff' && e.stat === 'critRatePct' && near(e.value, 9.28);
const isS2CritDmg = (e: EffectLike): boolean =>
  e.kind === 'buff' && e.stat === 'critDamagePct' && near(e.value, 14.69);
const isBurstNuke = (e: EffectLike): boolean =>
  e.kind === 'flatDamage' && near(e.atkPct, 1237.5);

function run(baseOpts: Opts): { res: Res; events: Ev[] } {
  const events: Ev[] = [];
  const onEvent = (ev: SimEvent): void => {
    events.push(ev as Ev);
  };
  const bag = { ...(baseOpts as unknown as Record<string, unknown>) };
  bag.cfg = { ...((bag.cfg as Record<string, unknown>) ?? {}), onEvent };
  bag.onEvent = onEvent;
  return { res: runComp(bag as unknown as Opts), events };
}

function fixture(patched?: unknown): Opts {
  const f = { ...(controlComp(SLUG, false) as unknown as Record<string, unknown>) };
  if (patched !== undefined) {
    f.overrides = {
      ...((f.overrides as Record<string, unknown>) ?? {}),
      [SLUG]: patched,
    };
  }
  return f as unknown as Opts;
}

function buffApplies(events: Ev[], stat: string, value: number): Ev[] {
  return events.filter(
    (e) => e.kind === 'buffApply' && e.stat === stat && near(e.value, value),
  );
}

function expectTeammatesIdentical(a: Res, b: Res): void {
  const ta = totals(a);
  const tb = totals(b);
  const mates = Object.keys(ta).filter((s) => s !== SLUG);
  expect(mates.length).toBeGreaterThan(0);
  for (const s of mates) {
    expect(tb[s]).toBe(ta[s]);
  }
}

// ---- committed override, read-only clone (no sim run) ----------------------
const OV = withPatchedOverride(SLUG, () => {
  /* read-only structural inspection of the committed override */
});

// ---- runs (hoisted; each is a full 180s sim) --------------------------------
const base = run(fixture());

const s1Zero = run(
  fixture(
    withPatchedOverride(SLUG, (ov) => {
      for (const e of effectsOf(ov, 'skill1')) {
        if (isS1Crit(e)) {
          e.value = 0;
        }
      }
    }),
  ),
);

const s2Zero = run(
  fixture(
    withPatchedOverride(SLUG, (ov) => {
      for (const e of effectsOf(ov, 'skill2')) {
        if (isS2CritDmg(e)) {
          e.value = 0;
        }
      }
    }),
  ),
);

const s2Permanent = run(
  fixture(
    withPatchedOverride(SLUG, (ov) => {
      for (const e of effectsOf(ov, 'skill2')) {
        if (isS2CritDmg(e)) {
          e.durationSec = 300;
        }
      }
    }),
  ),
);

const burstZero = run(
  fixture(
    withPatchedOverride(SLUG, (ov) => {
      for (const e of effectsOf(ov, 'burst')) {
        if (isBurstNuke(e)) {
          e.atkPct = 0;
        }
      }
    }),
  ),
);

const burstDoubled = run(
  fixture(
    withPatchedOverride(SLUG, (ov) => {
      for (const b of blocksOf(ov, 'burst')) {
        const extra = (b.effects ?? []).filter(isBurstNuke).map((e) => ({ ...e }));
        if (extra.length > 0) {
          b.effects = [...(b.effects ?? []), ...extra];
        }
      }
    }),
  ),
);

describe('guillotine S1 — Critical Rate +9.28% for 10 sec, self, every 30 landed normal attacks', () => {
  it('is one self-scoped hitCount(30) block carrying an UNSCOPED critRatePct 9.28 for 10s', () => {
    const hosts = blocksOf(OV, 'skill1').filter((b) => (b.effects ?? []).some(isS1Crit));
    expect(hosts.length).toBe(1);
    const host = hosts[0];
    // nearest-wrong: interval / shotFired / fullBurstEnter keying, or a 150-hit threshold
    expect(host.trigger?.kind).toBe('hitCount');
    expect(host.trigger?.count).toBe(30);
    expect(host.target?.kind).toBe('self');
    const eff = (host.effects ?? []).find(isS1Crit) as EffectLike;
    // nearest-wrong: permanent (no durationSec) or a round-count window
    expect(eff.durationSec).toBe(10);
    expect(eff.durationShots === undefined || eff.durationShots === null).toBe(true);
  });

  it('never rescopes the plain Critical Rate line to normal-attacks-only', () => {
    // the kit text carries no 'of normal attacks' qualifier, so critRateNormalPct would
    // UNDER-credit her burst/skill crit; the unscoped stat is the faithful encoding
    const all = SLOTS.flatMap((s) => effectsOf(OV, s));
    expect(all.filter((e) => e.stat === 'critRateNormalPct').length).toBe(0);
  });

  it('emits self-targeted buffApply events with the raw 9.28 percentage and a BOUNDED window', () => {
    const applies = buffApplies(base.events, 'critRatePct', 9.28);
    expect(applies.length).toBeGreaterThan(0);
    for (const e of applies) {
      expect(e.targetSlug).toBe(SLUG);
      expect(e.casterIdx).not.toBeNull();
      expect(e.casterIdx).toBe(e.targetIdx);
      // a permanent buff would carry a non-finite / absent expiry
      expect(Number.isFinite(e.expiresFrame as number)).toBe(true);
      expect(e.durationShots === undefined || e.durationShots === null).toBe(true);
    }
  });

  it('fires ~5x as often as the 150-hit line (both ride the same hit counter)', () => {
    const s1 = buffApplies(base.events, 'critRatePct', 9.28);
    const s2 = buffApplies(base.events, 'critDamagePct', 14.69);
    expect(s2.length).toBeGreaterThan(0); // non-vacuity: the 150-hit line DOES fire here
    expect(s1.length).toBeGreaterThanOrEqual(5 * s2.length);
    expect(s1.length).toBeLessThanOrEqual(5 * s2.length + 10);
  });

  it('moves guillotine damage and NOTHING else', () => {
    expect(totals(s1Zero.res)[SLUG]).toBeLessThan(totals(base.res)[SLUG]);
    expectTeammatesIdentical(base.res, s1Zero.res);
  });
});

describe('guillotine S2a — Critical Damage +14.69% for 5 sec, self, every 150 landed normal attacks', () => {
  it('is one self-scoped hitCount(150) block carrying critDamagePct 14.69 for 5s', () => {
    const hosts = blocksOf(OV, 'skill2').filter((b) => (b.effects ?? []).some(isS2CritDmg));
    expect(hosts.length).toBe(1);
    const host = hosts[0];
    expect(host.trigger?.kind).toBe('hitCount');
    expect(host.trigger?.count).toBe(150);
    expect(host.target?.kind).toBe('self');
    const eff = (host.effects ?? []).find(isS2CritDmg) as EffectLike;
    expect(eff.durationSec).toBe(5);
    expect(eff.durationShots === undefined || eff.durationShots === null).toBe(true);
  });

  it('emits self-targeted buffApply events with the raw 14.69 percentage', () => {
    const applies = buffApplies(base.events, 'critDamagePct', 14.69);
    expect(applies.length).toBeGreaterThan(0);
    for (const e of applies) {
      expect(e.targetSlug).toBe(SLUG);
      expect(e.casterIdx).toBe(e.targetIdx);
      expect(Number.isFinite(e.expiresFrame as number)).toBe(true);
    }
  });

  it('contributes damage, and its 5s window genuinely LAPSES between retriggers', () => {
    // 5s < the ~150-round retrigger spacing, so uptime is partial: making it permanent must
    // raise totals. If it were modeled permanent/refresh-locked, this delta would be 0.
    expect(totals(s2Zero.res)[SLUG]).toBeLessThan(totals(base.res)[SLUG]);
    expect(totals(s2Permanent.res)[SLUG]).toBeGreaterThan(totals(base.res)[SLUG]);
    expectTeammatesIdentical(base.res, s2Zero.res);
    expectTeammatesIdentical(base.res, s2Permanent.res);
  });
});

describe('guillotine S2b — ATK +0.96% per 1% HP lost, below 70% HP (GAP: no HP pool)', () => {
  it('does not SILENTLY drop the HP-scaled ATK line', () => {
    const modeled = effectsOf(OV, 'skill2').some(
      (e) => e.kind === 'buff' && (e.stat === 'atkPct' || e.stat === 'casterAtkPct'),
    );
    expect(modeled || auditText(OV).includes('hp')).toBe(true);
  });

  it.skip('ATK ramps 0.96% per 1% HP lost once HP < 70% — GAP: the sim has no HP pool, so HP-lost is unobservable. The only self-loss source is S1 (2.01% per 30 landed rounds), so the threshold would land ~15 procs = ~450 landed rounds in, at ~28.8% ATK and rising; that trajectory is a derivation, not a measurement, and needs an HP-pool primitive to enact.', () => {});

  it.skip('S1 self HP cost 2.01% — GAP: no HP pool; it is offensively inert on its own and only matters as the driver of S2b + the burst HP branch.', () => {});
});

describe('guillotine burst — 1237.5% of final ATK (+ a second 1237.5% below 50% HP)', () => {
  it('carries a burstCast-triggered 1237.5% flatDamage', () => {
    const hosts = blocksOf(OV, 'burst').filter((b) => (b.effects ?? []).some(isBurstNuke));
    expect(hosts.length).toBeGreaterThan(0);
    for (const b of hosts) {
      expect(b.trigger?.kind).toBe('burstCast');
    }
  });

  it('the nuke is live in this fixture and is worth real damage', () => {
    // also proves the fixture is non-vacuous for burst: she DOES cast (B1+B2 present)
    expect(totals(burstZero.res)[SLUG]).toBeLessThan(totals(base.res)[SLUG]);
    expectTeammatesIdentical(base.res, burstZero.res);
  });

  it('an extra ungated copy of the nuke WOULD show up in totals (detector non-vacuity)', () => {
    expect(totals(burstDoubled.res)[SLUG]).toBeGreaterThan(totals(base.res)[SLUG]);
    expectTeammatesIdentical(base.res, burstDoubled.res);
  });

  it('does not ship an ungated always-on duplicate of the 1237.5% hit', () => {
    // HP starts at 100%, so the second branch can NEVER fire on the opening burst; an
    // ungated duplicate would double every burst from t=0 (the detector test above shows
    // that is visible in totals).
    const copies = effectsOf(OV, 'burst').filter(isBurstNuke);
    if (copies.length >= 2) {
      const gated = blocksOf(OV, 'burst')
        .filter((b) => (b.effects ?? []).some(isBurstNuke))
        .some((b) => GATE_KEYS.some((k) => b[k] !== undefined));
      expect(gated).toBe(true);
    } else {
      const t = auditText(OV);
      expect(t.includes('hp') || t.includes('50%')).toBe(true);
    }
  });

  it.skip('second 1237.5% hit once the skill user is below 50% HP — GAP: no HP pool. Self-loss only (2.01% per 30 landed rounds) puts the crossing ~25 procs = ~750 landed rounds in; enacting it needs an HP-pool primitive plus a measured HP trajectory.', () => {});
});

describe('guillotine — cross-cutting inertness', () => {
  it('every kit block is self- or enemy-scoped: she buffs no teammate', () => {
    for (const slot of SLOTS) {
      for (const b of blocksOf(OV, slot)) {
        expect(['self', 'enemy']).toContain(b.target?.kind);
      }
    }
  });
});
