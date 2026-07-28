// PER-UNIT KIT SPEC — `2b` (2B, Defender/AR/Fire, Burst III, cd 40s, ammo 90 / reloadFrames 81;
// NieR:Automata collab, no base counterpart). Kit-autonomy gauntlet 2026-07-28 (from-scratch
// baseline authoring — there was NO shipped override; S3 authored the encoding this file pins).
//
// One assertion group per KIT LINE (B1..B5 below), asserted against the authored override loaded
// from disk. `withPatchedOverride` builds COUNTERFACTUALS only (the nearest wrong model each
// assertion must discriminate against) — never the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters['2b'].skills):
//   S1 ■ using Burst Skill → self: effects vary by # of uses, each subsequent triggers all before: [B1]
//        Once: Max HP ▲10.03% / Twice: ▲20.06% / Three times: ▲57.76% continuously.
//   S2 ■ after firing 300 time(s) → all enemies: 167.45% of final ATK as damage.                [B2]
//      ■ start of battle → self: ATK ▲6.16% of the skill user's FINAL Max HP continuously.        [B3]
//   BU ■ all enemies: 2439.36% of final ATK as DISTRIBUTED damage.                               [B4]
//      ■ 1 enemy with highest remaining HP: 792% of final ATK as additional damage.              [B5]
//
// Her damage identity is ONE load-bearing synergy: B1 stacks Max HP on every burst cast and B3
// converts final Max HP into ATK, so the more she bursts the harder every hit lands. B1 is therefore
// OFFENSIVELY LIVE (not a defensive HP grant) precisely because she is her own B3 consumer.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   B1  escalating additive ladder (10.03+20.06+57.76 = 87.85% at 3 stacks, the Liter-validated
//       reading of "each subsequent effect triggers all effects before it") vs a LATEST-LINE-ONLY
//       model (57.76% cap): base produces THREE distinct self maxHpFlat grants in the exact kit
//       ratio; latest-only produces ONE. The grants must be self-scoped (caster===target===2B) so
//       the engine's e3 rule feeds them into her B3 conversion.
//   B2  RECURRING every-300-shots (engine hitCount) vs a ONE-TIME 300-shot trigger: proc count must
//       equal floor(shots/300) (≈6 in the fight), which a one-time model (exactly 1) provably fails.
//   B3  HP-SCALING atkOfMaxHpPct ("final Max HP") vs a generic atkPct (percent of ATK): with the
//       HP-scaling passive her burst nuke GROWS cast-1 → cast-3+ as B1 stacks accrue, then plateaus
//       at the 3-stack cap; a generic atkPct passive cannot read the HP stacks, so the growth
//       collapses. Removing B3 crashes her total ~71% (the meta-defining line).
//   B4  the 2439.36 hit is DISTRIBUTED-flavoured: a synthetic +50% distributedDamagePct scales THIS
//       hit (mult.distributed 1.5) but NOT the B5 hit (1.0) — proves the flavour encoding, which is
//       otherwise structurally inert on a unit that carries no distributedDamagePct buff.
//   B5  the 792 "additional damage" is a SEPARATE hit at its own magnitude, non-distributed, in the
//       burst bucket; cast lands BEFORE the FB window (instant burst) so neither hit takes +50%.
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / 2b B3 / helm B3, boss Fire, focus
// 2b) — 2B needs a real rotation to cast her burst at all (a lone B3 makes zero Full Bursts). She
// shares B3 with helm and casts ~6× over 180s, enough to reach the 3-stack cap. Deterministic (no
// seed); event-log assertions over totals. controlComp slot order: liter 0 / crown 1 / 2b 2 / helm 3.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const SLOT_2B = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;
type FbStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('2b'),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual / discriminator patches ---------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** B1 reference: her S1 Max HP ladder removed entirely. */
const noS1 = withPatchedOverride('2b', (ov) => {
  if (ov.skill1.length === 0) {
    throw new Error('2b S1 missing — fixture is stale');
  }
  ov.skill1 = [];
});
/** B1 counterfactual: a LATEST-LINE-ONLY model — one non-escalating 57.76% Max HP buff on burst. */
const latestOnly = withPatchedOverride('2b', (ov) => {
  ov.skill1 = [
    {
      slot: 'skill1',
      trigger: { kind: 'burstCast' },
      target: { kind: 'self' },
      effects: [{ kind: 'buff', stat: 'targetMaxHpPct', value: 57.76 }],
    },
  ];
});
/** B2 reference: her cluster bomb removed. */
const noCluster = withPatchedOverride('2b', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'flatDamage')
  );
  if (ov.skill2.length === before) {
    throw new Error('2b S2 cluster bomb missing — fixture is stale');
  }
});
/** B3 reference: her ATK-from-MaxHP passive removed. */
const noConv = withPatchedOverride('2b', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'atkOfMaxHpPct'));
  if (ov.skill2.length === before) {
    throw new Error('2b S2 atkOfMaxHpPct missing — fixture is stale');
  }
});
/** B3 counterfactual: the same line as a GENERIC atkPct (percent of ATK, not of Max HP). */
const genericAtk = withPatchedOverride('2b', (ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'atkOfMaxHpPct');
  if (!e) {
    throw new Error('2b S2 atkOfMaxHpPct effect missing — fixture is stale');
  }
  e.stat = 'atkPct';
});
/** B4 discriminator: a synthetic +50% distributedDamagePct passive — scales distributed hits only. */
const distBuff = withPatchedOverride('2b', (ov) => {
  ov.skill2.push({
    slot: 'skill2',
    trigger: { kind: 'passive' },
    target: { kind: 'self' },
    effects: [{ kind: 'buff', stat: 'distributedDamagePct', value: 50 }],
  });
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const runNoS1 = run({ '2b': noS1 });
const runLatest = run({ '2b': latestOnly });
const runNoCluster = run({ '2b': noCluster });
const runNoConv = run({ '2b': noConv });
const runGeneric = run({ '2b': genericAtk });
const runDist = run({ '2b': distBuff });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const shots2b = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === '2b');
const bursts2b = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === '2b');
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e): e is FbStart => e.kind === 'fullBurstStart');
const cluster = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === '2b' && d.srcSlot === 'skill2');
const burstHits = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === '2b' && d.srcSlot === 'burst');
/** 2439.36 distributed-nuke amounts in cast order. */
const nukeAmounts = (evs: SimEvent[]) =>
  burstHits(evs)
    .filter((d) => d.atkPct === 2439.36)
    .map((d) => d.amount);
const growthRatio = (evs: SimEvent[]) => {
  const a = nukeAmounts(evs);
  return a.length >= 2 ? a[a.length - 1] / a[0] : 1;
};

describe('2b — kit spec', () => {
  describe('B1 — S1 Max HP ladder is an escalating ADDITIVE self-buff keyed on burst cast', () => {
    const maxHpGrants = buffs(base.events).filter(
      (b) => b.casterIdx === SLOT_2B && b.stat === 'maxHpFlat'
    );
    const distinct = [...new Set(maxHpGrants.map((b) => b.value))].sort(
      (a, b) => a - b
    );

    it('grants THREE distinct Max HP steps (not one latest line)', () => {
      expect(
        distinct.length,
        `expected 3 escalating steps, got ${distinct.length}`
      ).toBe(3);
    });

    it('the three steps are in the exact kit ratio 10.03 : 20.06 : 57.76', () => {
      const [v1, v2, v3] = distinct;
      expect(v2 / v1).toBeCloseTo(20.06 / 10.03, 4);
      expect(v3 / v1).toBeCloseTo(57.76 / 10.03, 4);
    });

    it('is self-scoped (caster === target === 2B) so the e3 rule feeds her ATK conversion', () => {
      expect([...new Set(maxHpGrants.map((b) => b.targetIdx))]).toEqual([
        SLOT_2B,
      ]);
    });

    it('is keyed to her OWN burstCast, NOT fullBurstEnter (helm shares B3, so team FBs out-number her casts)', () => {
      // The smallest step (10.03%) re-applies on EVERY 2B burst cast, so its application count
      // equals her burstCast count. A fullBurstEnter encoding would fire on every TEAM Full Burst
      // (helm carries some rotations), inflating the count to the fullBurstStart count instead.
      const step0 = Math.min(...distinct);
      const step0Count = maxHpGrants.filter(
        (b) => Math.abs(b.value - step0) < 1
      ).length;
      const casts = bursts2b(base.events).length;
      const fbs = fbStarts(base.events).length;
      expect(
        casts,
        'fixture must let helm out-cast 2B for this to discriminate'
      ).toBeLessThan(fbs);
      expect(
        step0Count,
        `${step0Count} step-0 grants vs ${casts} 2B casts / ${fbs} team FBs`
      ).toBe(casts);
    });

    it('DISCRIMINATING: a latest-line-only model produces a single grant, not three', () => {
      const latestGrants = buffs(runLatest.events).filter(
        (b) => b.casterIdx === SLOT_2B && b.stat === 'maxHpFlat'
      );
      expect([...new Set(latestGrants.map((b) => b.value))].length).toBe(1);
    });

    it('is offensively live: removing the ladder drops her total (the HP feeds her ATK)', () => {
      expect(base.totals['2b']).toBeGreaterThan(runNoS1.totals['2b'] * 1.2);
    });
  });

  describe('B2 — S2 cluster bomb fires RECURRING every 300 shots at 167.45% (skill bucket)', () => {
    it('is the kit magnitude in the skill bucket', () => {
      const procs = cluster(base.events);
      expect(procs.length).toBeGreaterThan(0);
      expect([...new Set(procs.map((d) => d.atkPct))]).toEqual([167.45]);
      expect([...new Set(procs.map((d) => d.bucket))]).toEqual(['skill']);
    });

    it('proc count equals floor(shots/300) — recurring, not a one-time trigger', () => {
      const shots = shots2b(base.events).length;
      const procs = cluster(base.events).length;
      expect(procs).toBeGreaterThanOrEqual(2);
      expect(procs, `${procs} procs vs ${shots} shots`).toBe(
        Math.floor(shots / 300)
      );
    });

    it('contributes damage (removing it drops her total)', () => {
      expect(base.totals['2b']).toBeGreaterThan(runNoCluster.totals['2b']);
    });
  });

  describe('B3 — S2 passive converts FINAL Max HP into ATK (atkOfMaxHpPct 6.16, self)', () => {
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === SLOT_2B && b.stat === 'atkOfMaxHpPct'
    );

    it('is 6.16% and self-scoped', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([6.16]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([SLOT_2B]);
    });

    it('is the meta-defining line: removing it crashes her total', () => {
      expect(base.totals['2b']).toBeGreaterThan(runNoConv.totals['2b'] * 2);
    });

    it('is HP-SCALING: her burst nuke grows across casts as B1 stacks accrue, then plateaus', () => {
      const amounts = nukeAmounts(base.events);
      expect(amounts.length).toBeGreaterThanOrEqual(3);
      // grows from cast 1 to the 3-stack cap
      expect(amounts[amounts.length - 1]).toBeGreaterThan(amounts[0] * 1.3);
    });

    it('DISCRIMINATING: a generic atkPct passive cannot read the HP stacks, so the growth collapses', () => {
      expect(growthRatio(base.events)).toBeGreaterThan(
        growthRatio(runGeneric.events) + 0.2
      );
    });
  });

  describe('B4 — burst distributed nuke: 2439.36% of final ATK, distributed-flavoured', () => {
    it('fires once per cast at the kit magnitude in the burst bucket', () => {
      const nukes = burstHits(base.events).filter((d) => d.atkPct === 2439.36);
      expect(nukes.length).toBe(bursts2b(base.events).length);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('DISCRIMINATING: a +50% distributedDamagePct scales THIS hit (mult 1.5)…', () => {
      const scaled = burstHits(runDist.events).filter(
        (d) => d.atkPct === 2439.36
      );
      expect([...new Set(scaled.map((d) => d.mult.distributed))]).toEqual([
        1.5,
      ]);
    });
  });

  describe('B5 — burst additional damage: 792% to the highest-HP enemy, separate + non-distributed', () => {
    it('fires once per cast at the kit magnitude in the burst bucket', () => {
      const addl = burstHits(base.events).filter((d) => d.atkPct === 792);
      expect(addl.length).toBe(bursts2b(base.events).length);
      expect(addl.length).toBeGreaterThan(0);
      expect([...new Set(addl.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('…but NOT the 792 hit (mult 1.0) — proves only the 2439.36 line is distributed', () => {
      const unscaled = burstHits(runDist.events).filter(
        (d) => d.atkPct === 792
      );
      expect([...new Set(unscaled.map((d) => d.mult.distributed))]).toEqual([
        1,
      ]);
    });

    it('neither burst hit takes the +50% FB major (instant cast lands before FB opens)', () => {
      const took = burstHits(base.events).filter((d) => d.fbMajorApplied);
      expect(
        took.map((d) => d.atkPct),
        'burst hits must precede the FB window'
      ).toEqual([]);
    });
  });
});
