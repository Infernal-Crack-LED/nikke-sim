/**
 * maiden-ice-rose (Maiden: Ice Rose) - BLIND kit spec test (S5).
 * Written from the kit prose alone: no sight of the driver override, driver tests,
 * or driver reasoning.
 *
 * Kit, per slot (paraphrased):
 *   s1a  entering Burst Stage 1, self, only while MP is 0        -> MP +1 (pool cap 12)
 *   s1b  entering Full Burst,    self, only while MP is above 1  -> MP +1 (pool cap 12)
 *        (both lines restate: all accumulated MP is spent when she uses her Burst Skill)
 *   s1c  every 6 Full-Charge attacks, self -> Max HP 6.34% for 15s, stacking to 10
 *   s2a  when MP is replenished, all Electric allies EXCEPT self ->
 *          Elemental Advantage Attack Damage 40.9% / 10s, ATK 20.9% of caster ATK / 10s
 *   s2b  when MP is used (= her own burst cast), self ->
 *          Elemental Advantage Attack Damage 31.68% / 10s, ATK 3.2% of own final Max HP / 10s
 *   s2c  every 1 Full-Charge attack, nearest enemy -> 547.62% of final ATK
 *   b    nearest enemy -> 1372.8% of (10% of final Max HP + ATK), repeating on current MP
 *
 * FIXTURE: controlComp('maiden-ice-rose', true) - liter B1 / crown B2 / maiden B3 /
 * helm B3 vs the Fire boss, deterministic (no seed). The SECOND Burst III slot is
 * deliberate: it is the only thing that makes own-burst-cast and full-burst-enter
 * diverge in count, which is what discriminates the s2b trigger. A lone B3 would cast
 * zero bursts at all.
 *
 * ELEMENT: she is Electric, the control boss is Fire, so she has NO elemental
 * advantage here. Every elemAdvantageDamagePct point must therefore be damage-INERT in
 * this fixture. That inertness is asserted because the nearest-wrong encoding of the
 * two advantage lines is a generic attackDamagePct (Damage Up) buff, which WOULD move
 * damage against a boss she is not advantaged against.
 *
 * CHAIN: the s1c Max HP stacks are SELF-granted, so they feed her own s2b
 * ATK-of-final-Max-HP conversion (and, per the kit text, the burst formula too).
 * Zeroing the Max HP line must LOWER her damage; a model that reads that line as
 * defensive-only, or grants it from a non-self caster, leaves damage untouched.
 *
 * FLAGS (things the prose does not decide):
 *   - s1b says MP 'above 1'. Taken literally (MP >= 2) the pool would stall at 1 forever,
 *     since s1a only fires at MP == 0. The only self-consistent reading is a floor of
 *     >= 1, so the structural assertion only requires resourceGate.min >= 1.
 *   - the 10-stack cap on s1c is unreachable at RL cadence (~1 stack per magazine cycle
 *     vs a 15s window), so the test asserts stacks <= 10 rather than reaching 10.
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

const SLUG = 'maiden-ice-rose';

type Ev = any;
interface Run {
  res: any;
  evs: Ev[];
}

function run(overrides?: Record<string, any>): Run {
  const evs: Ev[] = [];
  const onEvent = (ev: SimEvent): void => {
    evs.push(ev as Ev);
  };
  const base: any = controlComp(SLUG, true);
  const opts: any = {
    ...base,
    onEvent,
    cfg: { ...(base.cfg ?? {}), onEvent },
  };
  if (overrides) opts.overrides = { ...(base.overrides ?? {}), ...overrides };
  return { res: runComp(opts), evs };
}

// ---- committed-override introspection: a no-op patch hands back the clone ----
const OV: any = withPatchedOverride(SLUG, () => {});

function allBlocks(ov: any): any[] {
  return ([] as any[]).concat(ov.skill1 ?? [], ov.skill2 ?? [], ov.burst ?? []);
}
function effectsOf(blocks: any[]): any[] {
  return blocks.flatMap((b: any) => (b.effects ?? []) as any[]);
}
function buffEffects(ov: any, stat: string): any[] {
  return effectsOf(allBlocks(ov)).filter((e: any) => e.kind === 'buff' && e.stat === stat);
}
function blocksWithBuff(ov: any, stat: string): any[] {
  return allBlocks(ov).filter((b: any) =>
    (b.effects ?? []).some((e: any) => e.kind === 'buff' && e.stat === stat),
  );
}
function blocksWithKind(blocks: any[], kind: string): any[] {
  return blocks.filter((b: any) => (b.effects ?? []).some((e: any) => e.kind === kind));
}
function resourceEffects(blocks: any[]): any[] {
  return effectsOf(blocks).filter((e: any) => e.kind === 'resource');
}
function triggerCount(b: any): number | undefined {
  const c = b?.trigger?.count;
  if (typeof c === 'number') return c;
  if (Array.isArray(c) && c.length > 0) return c[0];
  return undefined;
}
function setTriggerCount(b: any, n: number): void {
  const t: any = b.trigger ?? {};
  t.count = Array.isArray(t.count) ? t.count.map(() => n) : n;
  if (Array.isArray(t.countInFb)) t.countInFb = t.countInFb.map(() => n);
  else if (typeof t.countInFb === 'number') t.countInFb = n;
  b.trigger = t;
}

const MP_POOL: any = (OV.resources ?? []).find((r: any) => r.max === 12);

// ---- hoisted runs (each is a full 180s sim) ----
const BASE = run();

// counterfactual: the 6.34% Max HP stack contributes nothing
const HP0 = run({
  [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
    for (const e of buffEffects(ov, 'targetMaxHpPct')) e.value = 0;
  }),
});

// counterfactual: the Max HP stack fires on EVERY full charge instead of every 6th
const HP_FAST = run({
  [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
    for (const b of blocksWithBuff(ov, 'targetMaxHpPct')) setTriggerCount(b, 1);
  }),
});

// counterfactual: the 547.62% full-charge rider deals nothing
const RIDER0 = run({
  [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
    for (const e of effectsOf(ov.skill2 ?? [])) if (e.kind === 'flatDamage') e.atkPct = 0;
  }),
});

// counterfactual: the rider fires once per 6 full charges instead of every one
const RIDER_SLOW = run({
  [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
    for (const b of blocksWithKind(ov.skill2 ?? [], 'flatDamage')) setTriggerCount(b, 6);
  }),
});

// counterfactual: the burst nuke deals nothing
const BURST0 = run({
  [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
    for (const e of effectsOf(ov.burst ?? [])) if (e.kind === 'flatDamage') e.atkPct = 0;
  }),
});

// counterfactual: both elemental-advantage buffs contribute nothing
const ELEM0 = run({
  [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
    for (const e of buffEffects(ov, 'elemAdvantageDamagePct')) e.value = 0;
  }),
});

// counterfactual: the MP-used self buffs key to ANY team Full Burst instead of her own cast
const MP_USED_AS_FB = run({
  [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
    for (const b of blocksWithBuff(ov, 'atkOfMaxHpPct')) {
      b.trigger = { kind: 'fullBurstEnter' };
      delete b.ownBurstGate;
    }
  }),
});

function applies(r: Run, stat: string, value?: number): Ev[] {
  return r.evs.filter(
    (e: Ev) =>
      e.kind === 'buffApply' &&
      e.stat === stat &&
      (value === undefined || Math.abs(e.value - value) < 1e-6),
  );
}
function selfApplies(r: Run, stat: string, value?: number): Ev[] {
  return applies(r, stat, value).filter((e: Ev) => e.targetSlug === SLUG);
}
function expectAlliesUnmoved(a: Run, b: Run): void {
  const ta: any = totals(a.res);
  const tb: any = totals(b.res);
  for (const slug of Object.keys(ta)) {
    if (slug === SLUG) continue;
    expect(tb[slug], 'teammate ' + slug + ' must not move').toBe(ta[slug]);
  }
}

describe('maiden-ice-rose - fixture sanity', () => {
  it('fires and the team actually reaches Full Burst', () => {
    expect(unitOf(BASE.res, SLUG).totalDamage).toBeGreaterThan(0);
    expect(
      BASE.evs.filter((e: Ev) => e.kind === 'fullBurstStart').length,
      'control comp must chain bursts or every trigger test is vacuous',
    ).toBeGreaterThanOrEqual(2);
  });
});

describe('maiden-ice-rose - skill1 MP economy', () => {
  it('models MP as a pool capped at 12, starting empty', () => {
    expect(MP_POOL, 'kit states MP accumulates to a maximum of 12').toBeTruthy();
    expect(MP_POOL.max).toBe(12);
    expect(MP_POOL.initial ?? 0).toBe(0);
  });

  it('gains MP on Burst Stage 1 entry, gated to MP === 0', () => {
    // Discriminates the literal activation clause from the nearest-wrong readings:
    // her own burstCast (she is B3, not B1) and an ungated every-rotation gain.
    const blocks = (OV.skill1 ?? []).filter(
      (b: any) => b.trigger?.kind === 'stageEnter' && b.trigger?.stage === 1,
    );
    expect(blocks.length, 'stage-1-entry MP block missing').toBeGreaterThan(0);
    const b = blocks[0];
    expect(b.target?.kind).toBe('self');
    expect(resourceEffects([b]).some((e: any) => e.delta > 0)).toBe(true);
    expect(b.resourceGate?.max, 'clause reads: affects self when MP is 0').toBe(0);
  });

  it('gains MP on Full Burst entry behind a non-zero MP floor', () => {
    const blocks = (OV.skill1 ?? []).filter(
      (b: any) => b.trigger?.kind === 'fullBurstEnter' && resourceEffects([b]).length > 0,
    );
    expect(blocks.length, 'full-burst-entry MP block missing').toBeGreaterThan(0);
    const b = blocks[0];
    expect(b.target?.kind).toBe('self');
    expect(resourceEffects([b]).some((e: any) => e.delta > 0)).toBe(true);
    expect(b.resourceGate?.min, 'clause reads: affects self when MP is above 1').toBeGreaterThanOrEqual(1);
  });

  it('spends the whole accumulated pool on her burst', () => {
    const spends = resourceEffects(allBlocks(OV)).filter((e: any) => e.delta < 0);
    expect(spends.length, 'no MP spend modelled').toBeGreaterThan(0);
    expect(
      Math.min(...spends.map((e: any) => e.delta)),
      'ALL accumulated MP is consumed, so the spend must cover the full pool',
    ).toBeLessThanOrEqual(-12);
  });
});

describe('maiden-ice-rose - skill1 Max HP stacks on every 6th Full Charge', () => {
  it('is a self 6.34% Max HP buff, 15s, 10 stacks, on a 6-full-charge counter', () => {
    const blocks = blocksWithBuff(OV, 'targetMaxHpPct');
    expect(blocks.length, 'Max HP stack block missing').toBeGreaterThan(0);
    const b = blocks[0];
    expect(b.target?.kind).toBe('self');
    expect(b.trigger?.kind, 'kit says attacking with Full Charge, not hits/shots').toBe('chargeCounter');
    expect(triggerCount(b)).toBe(6);
    const e = (b.effects ?? []).find((x: any) => x.kind === 'buff' && x.stat === 'targetMaxHpPct');
    expect(e.value).toBeCloseTo(6.34, 5);
    expect(e.durationSec, 'for 15 sec, not permanent').toBe(15);
    expect(e.maxStacks).toBe(10);
  });

  it('applies repeatedly over 180s and never exceeds 10 stacks', () => {
    const evs = selfApplies(BASE, 'maxHpFlat');
    expect(evs.length, 'no self Max HP grant observed - the counter never fires').toBeGreaterThanOrEqual(5);
    expect(evs.some((e: Ev) => e.maxStacks === 10)).toBe(true);
    expect(Math.max(...evs.map((e: Ev) => e.stacks ?? 1))).toBeLessThanOrEqual(10);
  });

  it('fires on every 6th full charge, not on every one', () => {
    // Nearest-wrong: chargeCounter count 1 (or shotFired). Patching the threshold to 1
    // must multiply the grant count; if it does not, the threshold is not being read.
    const slow = selfApplies(BASE, 'maxHpFlat').length;
    const fast = selfApplies(HP_FAST, 'maxHpFlat').length;
    expect(fast).toBeGreaterThan(slow * 2.5);
  });

  it('feeds her own ATK-of-final-Max-HP conversion (the line is not defensive-only)', () => {
    // Nearest-wrong: the Max HP line dropped as defensive, or granted so that the
    // caster is not the target - either way zeroing it would move nothing.
    expect(totals(HP0.res)[SLUG]).toBeLessThan(totals(BASE.res)[SLUG]);
    expectAlliesUnmoved(BASE, HP0);
  });
});

describe('maiden-ice-rose - skill2 on MP replenished (Electric allies except self)', () => {
  const allyBlocks = allBlocks(OV).filter((b: any) =>
    (b.effects ?? []).some(
      (e: any) =>
        e.kind === 'buff' &&
        e.stat === 'elemAdvantageDamagePct' &&
        Math.abs(e.value - 40.9) < 1e-6,
    ),
  );

  it('targets Electric allies excluding self, on an MP-replenish trigger', () => {
    expect(allyBlocks.length, '40.9% Electric-ally block missing').toBeGreaterThan(0);
    const b = allyBlocks[0];
    expect(b.target?.kind).toBe('alliesOfElement');
    expect(b.target?.element).toBe('Electric');
    expect(b.target?.excludeSelf, 'clause reads: except for self').toBe(true);
    // MP is replenished by the stage-1-entry and full-burst-entry lines only -
    // never by her own burst cast (that SPENDS it).
    expect(['stageEnter', 'fullBurstEnter']).toContain(b.trigger?.kind);
  });

  it('carries both 10s payloads, the ATK one scaled off the caster', () => {
    const eff = (allyBlocks[0].effects ?? []) as any[];
    const elem = eff.find((e: any) => e.stat === 'elemAdvantageDamagePct');
    const atk = eff.find((e: any) => e.stat === 'casterAtkPct');
    expect(elem.durationSec).toBe(10);
    expect(atk, 'ATK 20.9% of the skill user ATK missing').toBeTruthy();
    expect(atk.value).toBeCloseTo(20.9, 5);
    expect(atk.durationSec).toBe(10);
  });

  it('never grants the ally buff to herself', () => {
    // Non-vacuous regardless of the comp roster: the nearest-wrong model is
    // target allies without excludeSelf, which would land 40.9% on her.
    expect(selfApplies(BASE, 'elemAdvantageDamagePct', 40.9).length).toBe(0);
  });

  it.skip('grants 40.9% / flat-resolved ATK to a real Electric teammate', () => {
    // GAP (fixture, not model): the control comp roster is fixed and its Electric
    // membership is not knowable from the kit prose, so an ally-side magnitude check
    // cannot be written blind without risking a vacuous assertion.
  });
});

describe('maiden-ice-rose - skill2 on MP used (self, own burst cast)', () => {
  it('is a self block keyed to her own burst cast', () => {
    // MP is used when she uses her Burst Skill. Nearest-wrong: a bare fullBurstEnter,
    // which over-fires on rotations where the OTHER Burst III completes the chain.
    const blocks = blocksWithBuff(OV, 'atkOfMaxHpPct');
    expect(blocks.length, 'MP-used self block missing').toBeGreaterThan(0);
    const b = blocks[0];
    expect(b.target?.kind).toBe('self');
    const t = b.trigger?.kind;
    expect(t === 'burstCast' || (t === 'fullBurstEnter' && b.ownBurstGate === 'cast')).toBe(true);
  });

  it('carries ATK 3.2% of final Max HP and 31.68% advantage damage, both 10s', () => {
    const eff = (blocksWithBuff(OV, 'atkOfMaxHpPct')[0].effects ?? []) as any[];
    const hp = eff.find((e: any) => e.stat === 'atkOfMaxHpPct');
    expect(hp.value).toBeCloseTo(3.2, 5);
    expect(hp.durationSec).toBe(10);
    const elem = eff.find((e: any) => e.stat === 'elemAdvantageDamagePct');
    expect(elem, '31.68% self advantage buff missing').toBeTruthy();
    expect(elem.value).toBeCloseTo(31.68, 5);
    expect(elem.durationSec).toBe(10);
  });

  it('applies both self buffs together, as raw percentages', () => {
    const hp = selfApplies(BASE, 'atkOfMaxHpPct', 3.2);
    const elem = selfApplies(BASE, 'elemAdvantageDamagePct', 31.68);
    expect(hp.length, 'MP-used self buff never fired').toBeGreaterThanOrEqual(1);
    expect(elem.length).toBe(hp.length);
  });

  it('fires per OWN burst cast, not per team Full Burst', () => {
    // Non-vacuity: the control comp has a second Burst III, so the two triggers must
    // diverge in count. If they do not, this fixture cannot discriminate the line.
    const own = selfApplies(BASE, 'atkOfMaxHpPct', 3.2).length;
    const anyFb = selfApplies(MP_USED_AS_FB, 'atkOfMaxHpPct', 3.2).length;
    expect(own).toBeGreaterThanOrEqual(1);
    expect(anyFb, 'fixture does not separate own-cast from team Full Burst').toBeGreaterThan(own);
  });
});

describe('maiden-ice-rose - skill2 547.62% Full Charge rider', () => {
  it('is a per-full-charge enemy hit of 547.62%, with no core strike', () => {
    const blocks = blocksWithKind(OV.skill2 ?? [], 'flatDamage');
    expect(blocks.length, '547.62% rider missing from skill2').toBeGreaterThan(0);
    const b = blocks[0];
    expect(b.target?.kind).toBe('enemy');
    expect(b.trigger?.kind).toBe('chargeCounter');
    expect(triggerCount(b), 'kit says for 1 time(s)').toBe(1);
    const e = (b.effects ?? []).find((x: any) => x.kind === 'flatDamage');
    expect(e.atkPct).toBeCloseTo(547.62, 4);
    expect(e.core === true, 'text says damage, not core strike damage').toBe(false);
  });

  it('carries a large share of her damage', () => {
    // 547.62% per full charge against a 61.3% normal attack: if zeroing it barely
    // moves her, the rider is not firing per charge.
    expect(totals(RIDER0.res)[SLUG]).toBeLessThan(totals(BASE.res)[SLUG] * 0.85);
    expectAlliesUnmoved(BASE, RIDER0);
  });

  it('fires once per full charge, not once per six', () => {
    expect(totals(RIDER_SLOW.res)[SLUG]).toBeLessThan(totals(BASE.res)[SLUG]);
  });
});

describe('maiden-ice-rose - burst nuke', () => {
  it('is an enemy-targeted flat hit of at least 1372.8% of final ATK', () => {
    const eff = effectsOf(OV.burst ?? []).filter((e: any) => e.kind === 'flatDamage');
    expect(eff.length, 'burst damage effect missing').toBeGreaterThan(0);
    expect(Math.max(...eff.map((e: any) => e.atkPct))).toBeGreaterThanOrEqual(1372.8);
    expect(blocksWithKind(OV.burst ?? [], 'flatDamage')[0].target?.kind).toBe('enemy');
  });

  it('materially contributes to her total and moves no teammate', () => {
    expect(totals(BURST0.res)[SLUG]).toBeLessThan(totals(BASE.res)[SLUG]);
    expectAlliesUnmoved(BASE, BURST0);
  });

  it.skip('scales its hit COUNT with current MP at cast time', () => {
    // GAP: flatDamage has no perResource hook, so a live MP-scaled repeat count can only
    // be expressed as N resourceGate-tiered duplicate blocks or baked as a flag-value
    // constant. Both are legitimate; asserting one would test the encoding, not the kit.
    // Reported as spec instead. Flagged: the assumed steady-state MP is outside the
    // input domain of the prose (it depends on rotation count and burst cadence).
  });

  it.skip('adds 10% of her final Max HP to the per-hit ATK term', () => {
    // GAP: flatDamage is a percentage of final ATK only, so the Max-HP addend cannot be
    // expressed faithfully - and it should GROW with the skill1 Max HP stacks, which a
    // static atkPct cannot track. Flagged for measurement.
  });
});

describe('maiden-ice-rose - elemental-advantage scoping', () => {
  it('encodes both advantage lines on the advantage-gated stat, not generic Damage Up', () => {
    const vals = buffEffects(OV, 'elemAdvantageDamagePct').map((e: any) => e.value);
    expect(vals.length).toBeGreaterThanOrEqual(2);
    expect(vals).toContain(31.68);
    expect(vals).toContain(40.9);
    expect(
      buffEffects(OV, 'attackDamagePct').length,
      'Elemental Advantage Attack Damage is advantage-gated, not generic Damage Up',
    ).toBe(0);
  });

  it('is damage-inert against the Fire control boss (Electric holds no advantage there)', () => {
    const ta: any = totals(BASE.res);
    const tb: any = totals(ELEM0.res);
    for (const slug of Object.keys(ta)) {
      expect(tb[slug], slug + ' moved when an inert advantage buff was zeroed').toBe(ta[slug]);
    }
  });
});
