// PER-UNIT KIT SPEC — `quency-escape-queen` (Quency: Escape Queen, "qeq" — Attacker/SMG/Water,
// Burst III, cd 40s, ammo 120, hitsPerShot 2, rate_of_fire 1440rpm = 24 pulls/s). Kit-autonomy
// gauntlet 2026-07-25. NOT the base `quency` (SMG/Electric) — a different unit; this spec reasons
// from the slug quency-escape-queen throughout.
//
// One assertion group per FAITHFUL kit line (L1..L12 below), asserted against the SHIPPED override
// loaded from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong
// model each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (data/characters.json → characters['quency-escape-queen'].skills, lvl 10/10/10):
//   S1 "Secure Route" — three self permanents, EACH gated on an Explore Route stage at max stacks:
//        ■ Stage 1 max → self: Distributed Damage ▲ 49.58% continuously          [L1 FAITHFUL]
//        ■ Stage 2 max → self: Damage dealt when attacking core ▲ 25.25% cont.   [L2 FAITHFUL*]
//        ■ Stage 3 max → self: Critical Rate ▲ 16.73% continuously               [L3 FAITHFUL*]
//   S2 "Explore Route" — after 2 normal attacks; cascade (each stage triggers all before it):
//        ■ Stage 1: self Hit Rate ▲ 1.36% (x10, 2s) + ATK ▲ 2.45% (x10, 2s)       [L4/L5 FAITHFUL]
//        ■ Stage 2 (gated S1 max): Hit Rate ▲ 2.71% (x10, 1s) + ATK ▲ 4.9% (x10,1s)[L6/L7 FAITHFUL]
//        ■ Stage 3 (gated S2 max): Hit Rate ▲ 4.08% (x5, 0.5s) + ATK ▲ 7.36% (x5,0.5s)[L8/L9 FAITHFUL]
//   BU "The Great Thief" — burstCast:
//        ■ self: Attack Damage ▲ 57.08% for 10 sec                               [L10 FAITHFUL]
//        ■ self: Reload Speed ▲ 25.87% for 10 sec                                [L11 FAITHFUL]
//        ■ all enemies: 1736.31% of final ATK as Distributed Damage              [L12 FAITHFUL]
//
// *L2/L3 magnitudes/durations/self-target are FAITHFUL and pinned. Their STAGE GATE is a
//  firing-tracking PROXY (hitCount 20 = 10 pulls for the stage-2-max gate; hitCount 10 = 5 pulls
//  for the stage-3-max gate), because the engine has no "activate when buff X is at N stacks"
//  trigger. The proxy is continuous-while-firing (the real gate is too, at 24 pulls/s) and lapses
//  on the stage window, so the magnitude/duration pin is the load-bearing faithfulness claim; the
//  exact gate TIMING is not pinned (⚑, out-of-domain — would need an engine stack-count gate).
//
// NOT PINNED (documented proxy, ⚑2): the S2 stage-UNLOCK ORDERING. The kit gates stage 2 behind
//  stage-1-max and stage 3 behind stage-2-max; the shipped override builds all six stacks in
//  PARALLEL from the first pull (one hitCount-2 block). This over-credits stage 2/3 during the
//  ~1s ramp and for ~0.4–0.8s after each reload rebuild — small at 24 pulls/s over 180s. The
//  magnitudes / durations / stack-CAPS (stage 1/2 x10, stage 3 x5) ARE faithful and pinned below;
//  only the unlock ordering is approximate. No engine primitive encodes the cascade order today.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   L1  distributedDamagePct is a DISTRIBUTED-bucket multiplier — it lifts ONLY distributed-flavor
//       damage (her burst nuke), never normals. Proven two ways: the nuke carries mult.distributed
//       1.4958 (= 1 + 0.4958) which collapses to 1.0 when the line is removed, while normals stay
//       1.0 throughout; and the nearest wrong model (a generic attackDamagePct) WOULD lift normals,
//       which the shipped model provably does not.
//   L2  coreDamagePct 25.25 is LIVE because her hit-rate stacks feed core rate (acrForHR) — core
//       hits land, so removing the line drops her total. A dead/innert coreDamagePct would not.
//   L3  critRatePct 16.73 lifts the resolved crit rate on normals; removing it collapses the top
//       crit-rate values (0.3173/0.4637 → 0.15/0.2964).
//   L4-L9 the six distinct stack values, their stack-CAPS (x10/x10/x5) and durations (2s/1s/0.5s)
//       are pinned structurally off the buffApply log; the ATK stacks are load-bearing (removing
//       S2 halves her total) and the hit-rate stacks are LIVE — they feed core rate, so removing
//       ONLY the hit-rate effects (keeping ATK) still drops her total and shifts the core-rate
//       distribution. A wrong cap (stage 3 x10) or a wrong duration would fail the structural pin.
//   L10/L11 burstCast self buffs: exact value + 10s duration + once per cast, self-scoped.
//   L12 the nuke is 1736.31% in the BURST bucket, distributed-flavored (mult.distributed 1.4958),
//       and FB-EXEMPT (burstCast lands before the Full Burst window → never takes the +50% major).
//       Stripping the distributed flavor drops it identically to removing L1 — the two are the two
//       halves of one distributed mechanic.
//
// Fixture: the control comp liter (B1) / crown (B2) / qeq (B3) / helm (B3), boss Fire (Water
// advantage), focus qeq. Two 40s Burst-III casters alternate the ~20s FB cycle, so qeq casts her
// burst ~6x over 180s — enough to exercise every burstCast line. Deterministic (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** controlComp slot order: liter 0 / crown 1 / qeq 2 / helm 3. */
const QEQ = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('quency-escape-queen'),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual / isolation patches -------------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** L1 reference: her distributed-damage line removed entirely. */
const qeqNoDistrib = withPatchedOverride('quency-escape-queen', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'distributedDamagePct'));
  if (ov.skill1.length === before)
    {throw new Error(
      'qeq S1 distributedDamagePct block missing — fixture is stale'
    );}
});
/** L1 counterfactual: the same line as a GENERIC (unscoped) attack-damage buff. */
const qeqDistribAsAtkDmg = withPatchedOverride('quency-escape-queen', (ov) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'distributedDamagePct');
  if (!e)
    {throw new Error(
      'qeq S1 distributedDamagePct effect missing — fixture is stale'
    );}
  e.stat = 'attackDamagePct';
});
/** L2 reference: her core-damage line removed. */
const qeqNoCore = withPatchedOverride('quency-escape-queen', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'coreDamagePct'));
  if (ov.skill1.length === before)
    {throw new Error('qeq S1 coreDamagePct block missing — fixture is stale');}
});
/** L3 reference: her crit-rate line removed. */
const qeqNoCrit = withPatchedOverride('quency-escape-queen', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'critRatePct'));
  if (ov.skill1.length === before)
    {throw new Error('qeq S1 critRatePct block missing — fixture is stale');}
});
/** L4-L9 isolation: strip ONLY the hit-rate effects from S2, keeping the three ATK stacks. */
const qeqNoHitRate = withPatchedOverride('quency-escape-queen', (ov) => {
  let removed = 0;
  for (const b of ov.skill2) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.stat !== 'hitRatePct');
    removed += before - b.effects.length;
  }
  if (removed !== 3)
    {throw new Error('qeq S2 expected 3 hitRatePct effects — fixture is stale');}
});
/** L4-L9 reference: her entire Explore Route block removed. */
const qeqNoS2 = withPatchedOverride('quency-escape-queen', (ov) => {
  if (!ov.skill2.length)
    {throw new Error('qeq S2 block missing — fixture is stale');}
  ov.skill2 = [];
});
/** L12 counterfactual: strip the distributed flavor from the nuke (plain burst damage). */
const qeqPlainNuke = withPatchedOverride('quency-escape-queen', (ov) => {
  let stripped = 0;
  for (const b of ov.burst)
    {for (const e of b.effects)
      {if (e.kind === 'flatDamage' && e.flavor === 'distributed') {
        delete e.flavor;
        stripped++;
      }}}
  if (!stripped)
    {throw new Error(
      'qeq burst distributed flatDamage missing — fixture is stale'
    );}
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noDistrib = run({ 'quency-escape-queen': qeqNoDistrib });
const distribAsAtkDmg = run({ 'quency-escape-queen': qeqDistribAsAtkDmg });
const noCore = run({ 'quency-escape-queen': qeqNoCore });
const noCrit = run({ 'quency-escape-queen': qeqNoCrit });
const noHitRate = run({ 'quency-escape-queen': qeqNoHitRate });
const noS2 = run({ 'quency-escape-queen': qeqNoS2 });
const plainNuke = run({ 'quency-escape-queen': qeqPlainNuke });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const qeqDamage = (evs: SimEvent[], bucket: Damage['bucket']) =>
  dmg(evs).filter(
    (d) => d.slug === 'quency-escape-queen' && d.bucket === bucket
  );
const qeqBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast =>
      e.kind === 'burstCast' && e.slug === 'quency-escape-queen'
  );
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
/** Buffs qeq applied to herself. */
const qeqBuffs = (evs: SimEvent[], stat: string, value?: number) =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === QEQ &&
      b.targetIdx === QEQ &&
      b.stat === stat &&
      (value === undefined || b.value === value)
  );
const sum = (ds: Damage[]) => ds.reduce((a, d) => a + d.amount, 0);
const distinct = (xs: number[], dp = 4) =>
  [...new Set(xs.map((x) => x.toFixed(dp)))].sort();

describe('quency-escape-queen — kit spec', () => {
  describe('L1 — S1 Distributed Damage ▲ 49.58% (passive permanent self; feeds the distributed nuke only)', () => {
    const applied = qeqBuffs(base.events, 'distributedDamagePct', 49.58);

    it('is a permanent self buff at the kit magnitude', () => {
      expect(
        applied.length,
        'no distributedDamagePct buff was applied'
      ).toBeGreaterThan(0);
      for (const b of applied)
        {expect(
          b.expiresFrame,
          'passive must be permanent (no wall-clock expiry)'
        ).toBeNull();}
    });

    it('lifts the distributed multiplier on her burst nuke to 1.4958 (= 1 + 0.4958)', () => {
      expect(
        distinct(qeqDamage(base.events, 'burst').map((d) => d.mult.distributed))
      ).toEqual(['1.4958']);
    });

    it('collapses the nuke multiplier to 1.0 when the line is removed (the buff is live)', () => {
      expect(
        distinct(
          qeqDamage(noDistrib.events, 'burst').map((d) => d.mult.distributed)
        )
      ).toEqual(['1.0000']);
      expect(base.totals['quency-escape-queen']).toBeGreaterThan(
        noDistrib.totals['quency-escape-queen']
      );
    });

    it('does NOT touch normal attacks (distributed-flavor only)', () => {
      expect(
        distinct(
          qeqDamage(base.events, 'normal').map((d) => d.mult.distributed)
        )
      ).toEqual(['1.0000']);
    });

    it('DISCRIMINATING: a generic attackDamagePct would lift normals, which the shipped model does not', () => {
      expect(sum(qeqDamage(distribAsAtkDmg.events, 'normal'))).toBeGreaterThan(
        sum(qeqDamage(base.events, 'normal'))
      );
    });
  });

  describe('L2 — S1 Core Damage ▲ 25.25% (stage-2-max gate, proxied hitCount/1s, self)', () => {
    const applied = qeqBuffs(base.events, 'coreDamagePct', 25.25);

    it('is a self buff at the kit magnitude, 1s window, single stack', () => {
      expect(
        applied.length,
        'no coreDamagePct buff was applied'
      ).toBeGreaterThan(0);
      for (const b of applied) {
        expect(b.maxStacks).toBe(1);
        expect(b.expiresFrame! - b.frame).toBe(1 * FPS);
      }
    });

    it('is LIVE — removing it drops her total (core hits land via the hit-rate→core-rate chain)', () => {
      expect(base.totals['quency-escape-queen']).toBeGreaterThan(
        noCore.totals['quency-escape-queen']
      );
    });
  });

  describe('L3 — S1 Critical Rate ▲ 16.73% (stage-3-max gate, proxied hitCount/0.5s, self)', () => {
    const applied = qeqBuffs(base.events, 'critRatePct', 16.73);

    it('is a self buff at the kit magnitude, 0.5s window, single stack', () => {
      expect(applied.length, 'no critRatePct buff was applied').toBeGreaterThan(
        0
      );
      for (const b of applied) {
        expect(b.maxStacks).toBe(1);
        expect(b.expiresFrame! - b.frame).toBe(0.5 * FPS);
      }
    });

    it('is LIVE — removing it collapses the top resolved crit rates on normals', () => {
      const baseMax = Math.max(
        ...qeqDamage(base.events, 'normal').map((d) => d.critRate)
      );
      const noCritMax = Math.max(
        ...qeqDamage(noCrit.events, 'normal').map((d) => d.critRate)
      );
      expect(baseMax).toBeGreaterThan(noCritMax);
      expect(base.totals['quency-escape-queen']).toBeGreaterThan(
        noCrit.totals['quency-escape-queen']
      );
    });
  });

  describe('L4-L9 — S2 Explore Route staged stacks (after 2 normal attacks; cascade)', () => {
    // [stat, value, maxStacks, durationSec] for each of the six faithful stack lines.
    const STACKS: [string, number, number, number][] = [
      ['atkPct', 2.45, 10, 2], // L5 stage 1
      ['hitRatePct', 1.36, 10, 2], // L4 stage 1
      ['atkPct', 4.9, 10, 1], // L7 stage 2
      ['hitRatePct', 2.71, 10, 1], // L6 stage 2
      ['atkPct', 7.36, 5, 0.5], // L9 stage 3
      ['hitRatePct', 4.08, 5, 0.5], // L8 stage 3
    ];

    it.each(STACKS)(
      '%s ▲ %p%% caps at x%p for %ps, self-scoped',
      (stat, value, maxStacks, durSec) => {
        const applied = qeqBuffs(base.events, stat, value);
        expect(
          applied.length,
          `no ${stat}@${value} buff was applied`
        ).toBeGreaterThan(0);
        for (const b of applied) {
          expect(b.maxStacks).toBe(maxStacks);
          expect(b.expiresFrame! - b.frame).toBe(durSec * FPS);
        }
      }
    );

    it('stage 3 caps at x5 while stages 1/2 cap at x10 (the cap is faithful, not a flat x10)', () => {
      expect(qeqBuffs(base.events, 'atkPct', 7.36)[0].maxStacks).toBe(5);
      expect(qeqBuffs(base.events, 'hitRatePct', 4.08)[0].maxStacks).toBe(5);
      expect(qeqBuffs(base.events, 'atkPct', 2.45)[0].maxStacks).toBe(10);
      expect(qeqBuffs(base.events, 'atkPct', 4.9)[0].maxStacks).toBe(10);
    });

    it('the ATK stacks are load-bearing — removing S2 roughly halves her total', () => {
      expect(base.totals['quency-escape-queen']).toBeGreaterThan(
        noS2.totals['quency-escape-queen'] * 1.5
      );
    });

    it('the hit-rate stacks are LIVE — they feed core rate, so removing ONLY them still drops her total', () => {
      expect(base.totals['quency-escape-queen']).toBeGreaterThan(
        noHitRate.totals['quency-escape-queen']
      );
    });

    it('DISCRIMINATING: removing only the hit-rate stacks shifts the normal core-rate distribution', () => {
      expect(
        distinct(qeqDamage(base.events, 'normal').map((d) => d.coreRate))
      ).not.toEqual(
        distinct(qeqDamage(noHitRate.events, 'normal').map((d) => d.coreRate))
      );
    });
  });

  describe('L10 — burst Attack Damage ▲ 57.08% for 10 sec (burstCast, self)', () => {
    const applied = qeqBuffs(base.events, 'attackDamagePct', 57.08);
    const casts = qeqBursts(base.events);

    it('is the kit magnitude for 10s, self-scoped', () => {
      expect(casts.length, 'qeq never casts her burst').toBeGreaterThan(0);
      expect(applied.length).toBeGreaterThan(0);
      for (const b of applied) {expect(b.expiresFrame! - b.frame).toBe(10 * FPS);}
    });

    it('fires once per burst cast', () => {
      expect([...new Set(applied.map((b) => b.frame))].length).toBe(
        casts.length
      );
    });
  });

  describe('L11 — burst Reload Speed ▲ 25.87% for 10 sec (burstCast, self)', () => {
    const applied = qeqBuffs(base.events, 'reloadSpeedPct', 25.87);
    const casts = qeqBursts(base.events);

    it('is the kit magnitude for 10s, once per cast, self-scoped', () => {
      expect(applied.length).toBeGreaterThan(0);
      for (const b of applied) {expect(b.expiresFrame! - b.frame).toBe(10 * FPS);}
      expect([...new Set(applied.map((b) => b.frame))].length).toBe(
        casts.length
      );
    });
  });

  describe('L12 — burst nuke: 1736.31% of final ATK as Distributed Damage (burstCast, all enemies)', () => {
    const nukes = qeqDamage(base.events, 'burst').filter(
      (d) => d.srcSlot === 'burst'
    );
    const casts = qeqBursts(base.events);

    it('lands once per cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes.length).toBe(casts.length);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([1736.31]);
    });

    it('is distributed-flavored (takes the 1.4958 multiplier from L1)', () => {
      expect(distinct(nukes.map((d) => d.mult.distributed))).toEqual([
        '1.4958',
      ]);
    });

    it('is FB-exempt — the cast lands before the Full Burst window, so it never takes the +50% major', () => {
      expect(nukes.filter((d) => d.fbMajorApplied).map((d) => d.sec)).toEqual(
        []
      );
    });

    it('DISCRIMINATING: stripping the distributed flavor drops the nuke (== removing L1)', () => {
      expect(sum(nukes)).toBeGreaterThan(
        sum(qeqDamage(plainNuke.events, 'burst'))
      );
      expect(
        distinct(
          qeqDamage(plainNuke.events, 'burst').map((d) => d.mult.distributed)
        )
      ).toEqual(['1.0000']);
    });
  });
});
