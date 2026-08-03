// PER-UNIT KIT SPEC — `guillotine` (Guillotine, Attacker/MG/Electric, Burst III, cd 40s, ammo 300,
// hitsPerShot 1, chargeFrames 0). Kit-autonomy gauntlet 2026-08-02, test-first re-derivation.
//
// NOT `guillotine-winter-slayer` (Guillotine: Winter Slayer, AR/Water/B3) — a separate Hero-Level kit.
// Slug disambiguation confirmed at S0 (lint flags the bare base name; this spec reasons from the slug
// `guillotine` and the prose in data/characters.json → characters.guillotine.skills).
//
// One assertion group per KIT LINE (G1..G6 below), asserted against the SHIPPED override loaded from
// disk. `withPatchedOverride` appears ONLY to build COUNTERFACTUALS — the nearest wrong model each pin
// must discriminate against — never to supply the encoding under test.
//
// Kit (blablalink prose, level 10):
//   S1 ■ after landing 30 normal attacks → self: Critical Rate ▲9.28% for 10 sec            [G1]
//      ■ (per proc) HP ▼2.01%   — the design ENABLER of the two HP gates below               [G2]
//   S2 ■ after landing 150 normal attacks → self: Critical Damage ▲14.69% for 5 sec         [G3]
//      ■ when HP falls below 70% → self: ATK ▲0.96% continuously for every 1% of HP lost     [G4]
//   BU ■ enemy with the highest final ATK: 1237.5% of final ATK as Burst Skill damage       [G5]
//      ■ same target when the skill user's HP falls below 50%: 1237.5% as additional damage [G6]
//
// THE HP SUBSYSTEM (the kit's design center, modeled on the engine resource-counter primitive — the
// cross-family S2b claude-fable-5 reviewer converged on this; the driver's S0 first under-modeled it as
// UNMODELED/ungated and adopted the reviewer's richer model in S2c). The engine has no HP POOL, but it
// DOES have a resource counter + resourceGate + perResource (soda-twinkling-bunny / phantom / marciana /
// e-h / laplace-ultimate-hero precedent). The self-drain (G2) is the live resource pool 'hpLost'
// (+2.01 per 30-NA proc — the kit's only HP-loss source in the no-boss-damage sim). The two HP gates
// then READ that pool:
//   G4 'HP<70% → ATK ▲0.96% per 1% HP lost' = atkPct perResource{hpLost, 0.96} (live re-read each frame,
//      sim.ts:1483 — ATK% = hpLost×0.96, so +28.8% at the gate growing to the +96% cap as she drains)
//      behind resourceGate{hpLost min:30} (HP<70% == hpLost>=30).
//   G6 'HP<50% → additional 1237.5%' = a resourceGate{hpLost min:50} flatDamage rider (flatDamage has NO
//      perResource field — laplace precedent: a gated rider IS the faithful encoding of a conditional
//      additional hit). burstCast re-fires each cast, so early casts (hpLost<50) deal ONE nuke and later
//      casts deal TWO — faithful gating, not an ungated over-credit.
//
// TRIGGER NOTE (G4): the scaler is hitCount:30-triggered, NOT passive. A passive block fires ONCE at
// frame 0 (sim.ts:2651) where hpLost=0, so passive+resourceGate{min:30} would lock the buff permanently
// OFF (the cross-family reviewer itself flagged this risk). The 30-hit re-trigger re-checks the gate every
// crossing, so the buff switches on at the first crossing after hpLost>=30 (~12.9s in the fixture) and
// refreshes every 30 hits thereafter (10s window bridges the cadence → continuous once open).
//
// Disposition (all six lines FAITHFUL — every kit line is represented; NO unmodeled, NO ignored):
//   G1 FAITHFUL — hitCount:30 → self critRatePct 9.28 /10s. Generic "Critical Rate" (no "of normal
//      attacks" qualifier → critRatePct, not critRateNormalPct). Refreshes every 30 bullets; near-permanent
//      after the first 30 hits.
//   G2 FAITHFUL — hitCount:30 → self resource hpLost +2.01. Inert AS HP (no pool/damage/heal) but
//      load-bearing as the gate enabler; removing it collapses BOTH downstream gates (G4 + G6).
//   G3 FAITHFUL — hitCount:150 → self critDamagePct 14.69 /5s. Independent counter from S1's 30-hit; the
//      150-hit gap >> the 5s window → genuinely partial uptime (the buff lapses between procs).
//   G4 FAITHFUL — hitCount:30 + resourceGate{hpLost min:30} → self atkPct perResource{hpLost,0.96} /10s.
//      The gate MAGNITUDE is kit-exact (0.96 mult); the crossing wall-clock is self-drain-only (real fights
//      cross earlier via boss damage, ⚑2). Observable only behaviorally: the buffApply carries the static
//      value 0 (perResource is live-read off the event), so it is pinned via baseAtk growth + the
//      drain-removal counterfactual.
//   G5 FAITHFUL — burstCast → enemy flatDamage 1237.5 (highest-final-ATK = the single boss). burstCast
//      resolves pre-FB → never takes the +50% FB major (verified fact 2026-07-13); crit-eligible.
//   G6 FAITHFUL — burstCast + resourceGate{hpLost min:50} → enemy flatDamage 1237.5. Gated: first cast
//      (hpLost<50) deals one nuke, later casts deal two. 3-way discriminator: absent = 1/cast, gated =
//      shipped (between), ungated (gate removed) = 2/cast.
//
// Tier 2: HP status-gates (resourceGate on G4 + G6), a live perResource scaler, NA round-counts (hitCount
// 30/150), meta-defining berserker self-drain.
//
// Why each pin discriminates (a test that cannot fail under the nearest wrong model gates nothing):
//   value pins — counterfactual = the WRONG SKILL LEVEL magnitude (level-1 vs level-10).
//   stat pin   — G1 counterfactual mis-keys 9.28 to critRateNormalPct (strictly narrower).
//   gate pins  — G2/G4/G6 counterfactuals remove the drain / the scaler block / the Bb gate, each
//                collapsing the downstream behaviour a wrong model would fake.
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / guillotine B3 / helm B3, boss Fire,
// focus guillotine). Guillotine needs a real rotation to cast her burst at all (a lone B3 makes zero Full
// Bursts); helm is kept as a SECOND B3 so team FBs outnumber her casts, giving the burstCast-vs-
// fullBurstEnter discriminator something to bite on. Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** controlComp('guillotine') slot order: liter 0 / crown 1 / guillotine 2 / helm 3. */
const GUILLOTINE = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('guillotine'),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches (nearest wrong) --------------------------------------------------
const findEffect = (blocks: any[], pred: (e: any) => boolean) =>
  blocks.flatMap((b: any) => b.effects).find(pred);

/** G1 value: S1 crit rate at level-1 6.28 (kit ships 9.28). */
const s1Wrong = withPatchedOverride('guillotine', (ov) => {
  const e = findEffect(ov.skill1, (x) => x.stat === 'critRatePct');
  if (!e) {
    throw new Error('guillotine S1 critRatePct missing — fixture is stale');
  }
  e.value = 6.28;
});
/** G1 stat: the same 9.28 mis-keyed to critRateNormalPct (strictly narrower — skips skill/burst crit). */
const s1AsNormal = withPatchedOverride('guillotine', (ov) => {
  const e = findEffect(ov.skill1, (x) => x.stat === 'critRatePct');
  if (!e) {
    throw new Error('guillotine S1 critRatePct missing — fixture is stale');
  }
  e.stat = 'critRateNormalPct';
});
/** G2/G4/G6 enabler: remove the hpLost resource effect (the drain). hpLost stays 0 → BOTH gates
 *  (G4 min:30, G6 min:50) never open. The single counterfactual that proves the drain feeds the kit. */
const noDrain = withPatchedOverride('guillotine', (ov) => {
  const before = ov.skill1.flatMap((b: any) => b.effects).length;
  for (const b of ov.skill1) {
    b.effects = b.effects.filter(
      (e: any) => !(e.kind === 'resource' && e.name === 'hpLost')
    );
  }
  if (ov.skill1.flatMap((b: any) => b.effects).length === before) {
    throw new Error('guillotine S1 hpLost resource effect missing — stale');
  }
});
/** G3 value: S2 crit damage at level-1 8.68 (kit ships 14.69). */
const s2Wrong = withPatchedOverride('guillotine', (ov) => {
  const e = findEffect(ov.skill2, (x) => x.stat === 'critDamagePct');
  if (!e) {
    throw new Error('guillotine S2 critDamagePct missing — fixture is stale');
  }
  e.value = 8.68;
});
/** G4 block: remove the perResource atkPct scaler entirely. */
const noScaler = withPatchedOverride('guillotine', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !b.effects.some((e: any) => e.perResource?.name === 'hpLost')
  );
  if (ov.skill2.length === before) {
    throw new Error('guillotine S2 perResource scaler block missing — stale');
  }
});
/** G5 value: BOTH burst nukes at level-1 731.25% (kit ships 1237.5%). */
const burstDmgWrong = withPatchedOverride('guillotine', (ov) => {
  const nukes = ov.burst
    .flatMap((b: any) => b.effects)
    .filter((x: any) => x.kind === 'flatDamage');
  if (nukes.length < 1) {
    throw new Error('guillotine burst flatDamage missing — fixture is stale');
  }
  for (const e of nukes) {
    e.atkPct = 731.25;
  }
});
/** G6 block: remove the SECOND burst flatDamage (the HP<50% additional rider) → 1 nuke/cast. */
const noAdditional = withPatchedOverride('guillotine', (ov) => {
  const flatIdx = ov.burst
    .map((b: any, i: number) =>
      b.effects.some((e: any) => e.kind === 'flatDamage') ? i : -1
    )
    .filter((i: number) => i >= 0);
  if (flatIdx.length < 2) {
    throw new Error('guillotine needs two burst flatDamage blocks — stale');
  }
  ov.burst.splice(flatIdx[flatIdx.length - 1], 1);
});
/** G6 gate: remove the resourceGate on the additional rider → ungated, 2 nukes EVERY cast. */
const noBbGate = withPatchedOverride('guillotine', (ov) => {
  const gated = ov.burst.find(
    (b: any) =>
      b.resourceGate?.name === 'hpLost' &&
      b.effects.some((e: any) => e.kind === 'flatDamage')
  );
  if (!gated) {
    throw new Error('guillotine Bb resourceGate block missing — stale');
  }
  delete gated.resourceGate;
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const rS1Wrong = run({ guillotine: s1Wrong });
const rS1AsNormal = run({ guillotine: s1AsNormal });
const rNoDrain = run({ guillotine: noDrain });
const rS2Wrong = run({ guillotine: s2Wrong });
const rNoScaler = run({ guillotine: noScaler });
const rBurstDmgWrong = run({ guillotine: burstDmgWrong });
const rNoAdditional = run({ guillotine: noAdditional });
const rNoBbGate = run({ guillotine: noBbGate });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const gBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === GUILLOTINE && b.stat === stat);
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const gDamage = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  dmg(evs).filter((d) => d.slug === 'guillotine' && d.srcSlot === srcSlot);
const gNormals = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'guillotine' && d.bucket === 'normal');
const gBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'guillotine'
  );
const gShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'guillotine');
const buffValues = (evs: SimEvent[], stat: string) =>
  [...new Set(gBuffs(evs, stat).map((b) => b.value))].sort((a, b) => a - b);

describe('guillotine — kit spec', () => {
  it('fixture sanity: guillotine casts her burst in the control rotation', () => {
    expect(gBursts(base.events).length).toBeGreaterThan(0);
  });

  describe('G1 — S1 Critical Rate ▲9.28% after 30 normal attacks, 10 sec, self (generic critRatePct)', () => {
    const applied = gBuffs(base.events, 'critRatePct');

    it('is the kit magnitude 9.28%, self-scoped, 10-sec duration', () => {
      expect(applied.length, 'no S1 critRatePct buff was applied').toBeGreaterThan(
        0
      );
      expect(buffValues(base.events, 'critRatePct')).toEqual([9.28]);
      expect(
        [...new Set(applied.map((b) => b.targetIdx))],
        'self-scoped'
      ).toEqual([GUILLOTINE]);
      expect(
        [...new Set(applied.map((b) => b.expiresFrame! - b.frame))],
        '10 sec = 600 frames'
      ).toEqual([10 * FPS]);
    });

    it('fires once per 30 normal attacks (hitCount:30 trigger)', () => {
      const shots = gShots(base.events).length;
      expect(
        applied.length,
        `${applied.length} procs vs ${shots} shots — expected one proc per 30 hits`
      ).toBe(Math.floor(shots / 30));
    });

    it('DISCRIMINATING (value): the level-1 magnitude 6.28 would change the pinned value', () => {
      expect(buffValues(rS1Wrong.events, 'critRatePct')).not.toEqual([9.28]);
      expect(buffValues(rS1Wrong.events, 'critRatePct')).toEqual([6.28]);
    });

    it('DISCRIMINATING (stat): mis-keying to critRateNormalPct leaves NO generic critRatePct buff', () => {
      expect(
        gBuffs(rS1AsNormal.events, 'critRatePct').length,
        'stat moved off critRatePct'
      ).toBe(0);
      expect(
        gBuffs(rS1AsNormal.events, 'critRateNormalPct').length,
        'stat moved onto critRateNormalPct'
      ).toBeGreaterThan(0);
    });
  });

  describe('G2 — S1 "HP ▼2.01%" is the hpLost resource pool that feeds both HP gates', () => {
    it('is modeled as a resource pool + a +2.01 resource effect on the 30-NA proc (not HP/damage/heal)', () => {
      const ov = loadOverride('guillotine') as any;
      expect(
        (ov.resources ?? []).some((r: any) => r.name === 'hpLost'),
        'hpLost resource pool'
      ).toBe(true);
      const drain = ov.skill1
        .flatMap((b: any) => b.effects)
        .find((e: any) => e.kind === 'resource' && e.name === 'hpLost');
      expect(drain, 'hpLost resource effect on skill1').toBeTruthy();
      expect(drain.delta).toBe(2.01);
      // inert AS HP: no skill1 damage channel and no heal block
      expect(gDamage(base.events, 'skill1').length, 'no skill1 damage').toBe(0);
      expect(
        ov.skill1.some((b: any) => b.effects.some((e: any) => e.kind === 'heal')),
        'no heal'
      ).toBe(false);
    });

    it('DISCRIMINATING: removing the drain collapses BOTH gates (G4 scaler off AND G6 additional off)', () => {
      // G4 gate never opens → no atkPct buff
      expect(gBuffs(base.events, 'atkPct').length).toBeGreaterThan(0);
      expect(gBuffs(rNoDrain.events, 'atkPct').length, 'G4 gated off').toBe(0);
      // G6 gate never opens → one nuke per cast (no additional hit)
      const casts = gBursts(rNoDrain.events).length;
      expect(gDamage(rNoDrain.events, 'burst').length, 'G6 gated off').toBe(
        casts
      );
    });
  });

  describe('G3 — S2 Critical Damage ▲14.69% after 150 normal attacks, 5 sec, self', () => {
    const applied = gBuffs(base.events, 'critDamagePct');

    it('is the kit magnitude 14.69%, self-scoped, 5-sec duration', () => {
      expect(
        applied.length,
        'no S2 critDamagePct buff was applied'
      ).toBeGreaterThan(0);
      expect(buffValues(base.events, 'critDamagePct')).toEqual([14.69]);
      expect(
        [...new Set(applied.map((b) => b.targetIdx))],
        'self-scoped'
      ).toEqual([GUILLOTINE]);
      expect(
        [...new Set(applied.map((b) => b.expiresFrame! - b.frame))],
        '5 sec = 300 frames'
      ).toEqual([5 * FPS]);
    });

    it('fires once per 150 normal attacks (hitCount:150, independent of the 30-hit counter)', () => {
      const shots = gShots(base.events).length;
      expect(
        applied.length,
        `${applied.length} procs vs ${shots} shots — expected one proc per 150 hits`
      ).toBe(Math.floor(shots / 150));
    });

    it('DISCRIMINATING (value): the level-1 magnitude 8.68 would change the pinned value', () => {
      expect(buffValues(rS2Wrong.events, 'critDamagePct')).not.toEqual([14.69]);
      expect(buffValues(rS2Wrong.events, 'critDamagePct')).toEqual([8.68]);
    });
  });

  describe('G4 — S2 "HP<70% → ATK ▲0.96% per 1% HP lost" = perResource atkPct, resource-gated', () => {
    const applied = gBuffs(base.events, 'atkPct');

    it('the gate OPENS mid-fight (not a frame-0 passive) and is self-scoped', () => {
      expect(applied.length, 'no S2 atkPct buff was applied').toBeGreaterThan(0);
      expect(
        Math.min(...applied.map((b) => b.frame)),
        'gate opens only once hpLost>=30 — well after battle start, not a t=0 passive'
      ).toBeGreaterThan(5 * FPS);
      expect([...new Set(applied.map((b) => b.targetIdx))], 'self-scoped').toEqual(
        [GUILLOTINE]
      );
    });

    it('is a perResource scaler (static value 0; the live ATK% = hpLost×0.96 is read off the event)', () => {
      const ov = loadOverride('guillotine') as any;
      const e = ov.skill2
        .flatMap((b: any) => b.effects)
        .find((x: any) => x.perResource?.name === 'hpLost');
      expect(e, 'perResource hpLost effect').toBeTruthy();
      expect(e.perResource.mult, 'kit-exact 0.96% per 1% HP lost').toBe(0.96);
      expect([...new Set(applied.map((b) => b.value))], 'static value ignored').toEqual(
        [0]
      );
    });

    it('is LIVE: the scaler raises guillotine total damage AND her peak late-fight baseAtk', () => {
      // Total damage integrates the whole fight (avoids frame-by-frame team-buff confounds).
      expect(base.totals.guillotine).toBeGreaterThan(
        rNoScaler.totals.guillotine
      );
      // Peak late-fight baseAtk (same statistic, both at a peak team-buff moment) is higher
      // with the +96% hpLost scaler than without it.
      const lateMax = (evs: SimEvent[]) =>
        Math.max(
          ...gNormals(evs)
            .filter((d) => d.sec > 150)
            .map((d) => d.baseAtk)
        );
      expect(lateMax(base.events)).toBeGreaterThan(lateMax(rNoScaler.events));
    });

    it('DISCRIMINATING (gate): removing the drain leaves the scaler permanently gated OFF', () => {
      expect(gBuffs(rNoDrain.events, 'atkPct').length).toBe(0);
    });
  });

  describe('G5 — burst deals 1237.5% of final ATK as Burst Skill damage (highest-final-ATK enemy = the boss)', () => {
    const nukes = gDamage(base.events, 'burst');

    it('fires at the kit magnitude, in the burst bucket, crit-eligible, at least once per cast', () => {
      const casts = gBursts(base.events).length;
      expect(nukes.length).toBeGreaterThanOrEqual(casts);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([1237.5]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
      expect(
        nukes.every((d) => d.critEligible),
        'crit-eligible'
      ).toBe(true);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      const took = nukes.filter((d) => d.fbMajorApplied);
      expect(
        took.map((d) => d.sec),
        'burst-cast damage must precede the FB window'
      ).toEqual([]);
    });

    it('DISCRIMINATING: the level-1 magnitude 731.25% would change the pinned value', () => {
      const wrong = gDamage(rBurstDmgWrong.events, 'burst');
      expect([...new Set(wrong.map((d) => d.atkPct))]).not.toEqual([1237.5]);
      expect([...new Set(wrong.map((d) => d.atkPct))]).toEqual([731.25]);
    });
  });

  describe('G6 — burst deals an ADDITIONAL 1237.5% once HP<50% (resourceGate hpLost min:50)', () => {
    const nukes = gDamage(base.events, 'burst');
    const casts = gBursts(base.events).length;

    it('is GATED: total nukes land strictly between 1/cast (absent) and 2/cast (ungated)', () => {
      expect(casts).toBeGreaterThan(0);
      expect(
        nukes.length,
        `${nukes.length} nukes vs ${casts} casts — early casts (hpLost<50) get 1, later get 2`
      ).toBeGreaterThan(casts);
      expect(
        nukes.length,
        'not every cast gets the additional hit (the gate excludes early casts)'
      ).toBeLessThan(2 * casts);
    });

    it('the FIRST cast (hpLost<50) deals exactly one nuke; a late cast deals two', () => {
      const firstCast = gBursts(base.events)[0];
      const atFirst = nukes.filter((d) => Math.abs(d.frame - firstCast.frame) < 30);
      expect(atFirst.length, 'first cast is pre-crossing → 1 nuke').toBe(1);
      const lastCast = gBursts(base.events)[gBursts(base.events).length - 1];
      const atLast = nukes.filter((d) => Math.abs(d.frame - lastCast.frame) < 30);
      expect(atLast.length, 'late cast is post-crossing → 2 nukes').toBe(2);
    });

    it('DISCRIMINATING (absent): removing the additional block collapses to ONE nuke per cast', () => {
      expect(gDamage(rNoAdditional.events, 'burst').length).toBe(
        gBursts(rNoAdditional.events).length
      );
    });

    it('DISCRIMINATING (ungated): removing the gate gives TWO nukes on EVERY cast', () => {
      expect(gDamage(rNoBbGate.events, 'burst').length).toBe(
        2 * gBursts(rNoBbGate.events).length
      );
    });
  });
});
