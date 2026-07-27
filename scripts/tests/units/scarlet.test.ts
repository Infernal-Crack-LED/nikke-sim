// PER-UNIT KIT SPEC — `scarlet` (Scarlet, Attacker/AR/Electric, Burst III, cd 40s, ammo 20,
// chargeFrames 0). Kit-autonomy gauntlet 2026-07-25 (test-first re-derivation).
//
// NOT `scarlet-black-shadow` (Scarlet: Black Shadow, RL/B3) — a different unit. This spec reasons
// from the slug `scarlet` and the prose in data/characters.json → characters.scarlet.skills.
//
// One assertion group per KIT LINE (H1..H6 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears ONLY to build COUNTERFACTUALS — the nearest wrong model
// each pin must discriminate against — never to supply the encoding under test.
//
// Kit (blablalink prose, level 10):
//   S1 ■ after landing 10 normal attacks → self: ATK ▲23.15%, stacks up to 5×, lasts 5 sec   [H1]
//      ■ (per proc) Current HP ▼4.01%   — the design ENABLER of the two HP gates below        [H2]
//   S2 ■ 30% chance when attacked → 138.24% of final ATK as additional damage                [H3]
//      ■ when HP falls below 60% → self: Critical Damage ▲6.61% continuously                 [H4]
//   BU ■ when HP falls below 50% → self: Critical Rate ▲19.57% for 10 sec                    [H5]
//      ■ all enemies: 849.15% of final ATK as Burst Skill damage                             [H6]
//
// Disposition (S0 inventory; cross-family reconciliation — see note in the override):
//   H1 FAITHFUL — hitCount:10 → self atkPct 23.15 / maxStacks 5 / 5s. Engine derives the stack
//      level from cadence; the probe shows it reaches 5/5 and holds (the 5s window bridges the
//      159f reload at the datamined cadence).
//   H2 UNMODELED (inert as HP, load-bearing as gate enabler) — "Current HP ▼4.01%" is a self HP
//      COST; the engine has no HP pool, so it is unmodeled as HP. It is NOT a silent drop: it is
//      the mechanism that opens the two HP gates (×0.9599/proc → HP<60% at 13 procs/~28s, HP<50%
//      at 17/~37s), which feeds the H4 rampSec proxy and the H5 over-credit ⚑. Pinned verbatim in
//      the override's `unmodeled`.
//   H3 UNMODELED (sanctioned skip) — "30% when attacked" is the "when this unit is hit" skip class:
//      the v1 sim models no incoming boss attacks, so the trigger NEVER fires in-sim. Pinned verbatim.
//   H4 FAITHFUL (⚑ gate proxy) — passive self critDamagePct 6.61, permanent, rampSec:56 — the
//      equal-integral proxy for the HP<60% step-on at ~28s (a linear ramp over 2T integrates to the
//      same as a step at T). The HP<60% GATE is a status-gate the engine cannot model literally (no
//      HP trigger); the crossing time is ⚑-derived (real fights cross earlier — boss damage).
//   H5 FAITHFUL (⚑ gate proxy) — burstCast self critRatePct 19.57/10s, modeled UNGATED: rampSec is
//      unusable on a per-cast 10s window (its clock would ramp inside the window), so the buff is
//      full-value on every cast and pre-~37s casts are an over-credit ⚑. burstCast (her OWN cast),
//      NOT fullBurstEnter — controlComp carries helm as co-B3, so team FBs (11) ≠ her casts (6).
//   H6 FAITHFUL — burstCast 849.15% Burst Skill damage vs enemy ("all enemies" = the single boss).
//      A burst CAST lands BEFORE the Full Burst window, so it never takes the +50% major (verified
//      fact 2026-07-13) — the burstCast-vs-fullBurstEnter / FB-exemption discriminator.
//
// Tier 2: HP status-gates (H4/H5) approximated via ⚑ proxies + meta-defining Pilgrim attacker.
//
// ENCODING-CHOICE (cross-family): the fable S2b reviewer recommended modeling the gates literally
// via a bloodProc proc-count resource pool + resourceGate; the opus S5/S6 reviewers converged on the
// rampSec/ungated ⚑ proxy shipped here (the proc-count threshold is itself cadence-derived and
// ignores boss damage, so a literal gate would be false precision). The driver adopted the
// opus-convergent proxy; the resource-pool gate is documented in the override note as a legitimate
// future improvement. Both encode the SAME ⚑-derived ~28s/~37s crossing differently.
//
// Why each pin discriminates (a test that cannot fail under the nearest wrong model gates nothing):
//   value pins — counterfactual = the WRONG SKILL LEVEL magnitude (level-1 vs level-10).
//   stat pin   — H4 counterfactual puts the same 6.61 on critRatePct (a strictly larger encoding).
//   trigger pin— H5 counterfactual re-keys to fullBurstEnter (over-fires on helm's rotations).
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / scarlet B3 / helm B3, boss Fire,
// focus scarlet). Scarlet needs a real rotation to cast her burst at all (a lone B3 makes zero Full
// Bursts); helm is kept as a SECOND B3 on purpose so team FBs outnumber her casts, giving the
// burstCast-vs-fullBurstEnter discriminator something to bite on. Deterministic (no seed); event-log
// over totals.
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
/** controlComp('scarlet') slot order: liter 0 / crown 1 / scarlet 2 / helm 3. */
const SCARLET = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('scarlet'),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches (nearest wrong) --------------------------------------------------
const findEffect = (blocks: any[], pred: (e: any) => boolean) =>
  blocks.flatMap((b: any) => b.effects).find(pred);

/** H1 value: S1 ATK at level-1 17.48 (kit ships 23.15). */
const scarletS1Wrong = withPatchedOverride('scarlet', (ov) => {
  const e = findEffect(ov.skill1, (x) => x.stat === 'atkPct');
  if (!e) {
    throw new Error('scarlet S1 atkPct missing — fixture is stale');
  }
  e.value = 17.48;
});
/** H4 value: S2 crit damage at level-1 4.13 (kit ships 6.61). */
const scarletS2Wrong = withPatchedOverride('scarlet', (ov) => {
  const e = findEffect(ov.skill2, (x) => x.stat === 'critDamagePct');
  if (!e) {
    throw new Error('scarlet S2 critDamagePct missing — fixture is stale');
  }
  e.value = 4.13;
});
/** H4 stat: the same 6.61 mis-keyed to critRatePct (rate buys ~0.5x/pt vs damage ~0.15x/pt → strictly larger). */
const scarletS2AsRate = withPatchedOverride('scarlet', (ov) => {
  const e = findEffect(ov.skill2, (x) => x.kind === 'buff');
  if (!e) {
    throw new Error('scarlet S2 buff missing — fixture is stale');
  }
  e.stat = 'critRatePct';
});
/** H5 value: burst crit rate at level-1 12.23 (kit ships 19.57). */
const scarletBurstCritWrong = withPatchedOverride('scarlet', (ov) => {
  const e = findEffect(ov.burst, (x) => x.stat === 'critRatePct');
  if (!e) {
    throw new Error('scarlet burst critRatePct missing — fixture is stale');
  }
  e.value = 12.23;
});
/** H5 trigger: re-key the burst crit-rate to fullBurstEnter (fires on helm's rotations too). */
const scarletBurstCritFBEnter = withPatchedOverride('scarlet', (ov) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'critRatePct')
  );
  if (!b) {
    throw new Error(
      'scarlet burst critRatePct block missing — fixture is stale'
    );
  }
  b.trigger = { kind: 'fullBurstEnter' };
});
/** H6 value: burst nuke at level-1 530.71% (kit ships 849.15%). */
const scarletBurstDmgWrong = withPatchedOverride('scarlet', (ov) => {
  const e = findEffect(ov.burst, (x) => x.kind === 'flatDamage');
  if (!e) {
    throw new Error('scarlet burst flatDamage missing — fixture is stale');
  }
  e.atkPct = 530.71;
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const s1Wrong = run({ scarlet: scarletS1Wrong });
const s2Wrong = run({ scarlet: scarletS2Wrong });
const s2AsRate = run({ scarlet: scarletS2AsRate });
const burstCritWrong = run({ scarlet: scarletBurstCritWrong });
const burstCritFBEnter = run({ scarlet: scarletBurstCritFBEnter });
const burstDmgWrong = run({ scarlet: scarletBurstDmgWrong });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const scarletBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === SCARLET && b.stat === stat);
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const scarletDamage = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  dmg(evs).filter((d) => d.slug === 'scarlet' && d.srcSlot === srcSlot);
const scarletBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'scarlet'
  );
const scarletShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'scarlet');
const buffValues = (evs: SimEvent[], stat: string) =>
  [...new Set(scarletBuffs(evs, stat).map((b) => b.value))].sort(
    (a, b) => a - b
  );

describe('scarlet — kit spec', () => {
  describe('H1 — S1 ATK ▲23.15% after 10 normal attacks, stacks to 5, 5 sec, self', () => {
    const applied = scarletBuffs(base.events, 'atkPct');

    it('is the kit magnitude 23.15%, self-scoped, 5-sec duration', () => {
      expect(applied.length, 'no S1 atkPct buff was applied').toBeGreaterThan(
        0
      );
      expect(buffValues(base.events, 'atkPct')).toEqual([23.15]);
      expect(
        [...new Set(applied.map((b) => b.targetIdx))],
        'self-scoped'
      ).toEqual([SCARLET]);
      expect(
        [...new Set(applied.map((b) => b.expiresFrame! - b.frame))],
        '5 sec = 300 frames'
      ).toEqual([5 * FPS]);
    });

    it('stacks up to 5 and reaches full stacks during the fight', () => {
      expect(
        [...new Set(applied.map((b) => b.maxStacks))],
        'maxStacks'
      ).toEqual([5]);
      expect(Math.max(...applied.map((b) => b.stacks)), 'reaches 5/5').toBe(5);
    });

    it('fires once per 10 normal attacks (hitCount:10 trigger)', () => {
      const shots = scarletShots(base.events).length;
      expect(
        applied.length,
        `${applied.length} procs vs ${shots} shots — expected one proc per 10 hits`
      ).toBe(Math.floor(shots / 10));
    });

    it('DISCRIMINATING: the level-1 magnitude 17.48 would change the pinned value', () => {
      expect(buffValues(s1Wrong.events, 'atkPct')).not.toEqual([23.15]);
      expect(buffValues(s1Wrong.events, 'atkPct')).toEqual([17.48]);
    });
  });

  describe('H2 — S1 "Current HP ▼4.01%" is UNMODELED as HP (engine has no HP pool) but is the gate enabler', () => {
    it('is documented verbatim in the override unmodeled block (not silently dropped)', () => {
      const ov = loadOverride('scarlet') as any;
      expect(ov.unmodeled.skill1).toContain('Current HP ▼ 4.01%.');
    });
  });

  describe('H3 — S2 "30% when attacked → 138.24% additional damage" is UNMODELED (no incoming attacks in-sim)', () => {
    it('is documented verbatim in the override unmodeled block (sanctioned skip)', () => {
      const ov = loadOverride('scarlet') as any;
      expect(ov.unmodeled.skill2).toContain(
        'There is a 30% chance of activating when attacked.'
      );
      expect(ov.unmodeled.skill2).toContain(
        'Deals 138.24% of final ATK as additional damage.'
      );
    });

    it('is NOT smuggled in on an invented trigger (no skill2 damage in-sim)', () => {
      expect(
        scarletDamage(base.events, 'skill2').length,
        'no skill2 damage channel'
      ).toBe(0);
    });
  });

  describe('H4 — S2 Critical Damage ▲6.61% continuously (HP<60% gate ≈ rampSec:56 proxy)', () => {
    const applied = scarletBuffs(base.events, 'critDamagePct');

    it('is the kit magnitude 6.61%, passive (live from frame 0), permanent, self-scoped', () => {
      expect(
        applied.length,
        'no S2 critDamagePct buff was applied'
      ).toBeGreaterThan(0);
      expect(buffValues(base.events, 'critDamagePct')).toEqual([6.61]);
      expect(
        [...new Set(applied.map((b) => b.targetIdx))],
        'self-scoped'
      ).toEqual([SCARLET]);
      expect(
        [...new Set(applied.map((b) => b.expiresFrame))],
        'permanent — no expiry'
      ).toEqual([null]);
      expect(applied[0].frame, 'passive: live from the start').toBe(0);
    });

    it('carries the rampSec gate proxy (the HP<60% step-on ≈ 28s, equal-integral ramp 56s)', () => {
      const ov = loadOverride('scarlet') as any;
      const e = ov.skill2
        .flatMap((b: any) => b.effects)
        .find((x: any) => x.stat === 'critDamagePct');
      expect(e.rampSec, 'rampSec proxy for the HP gate').toBe(56);
    });

    it('DISCRIMINATING (value): the level-1 magnitude 4.13 would change the pinned value', () => {
      expect(buffValues(s2Wrong.events, 'critDamagePct')).not.toEqual([6.61]);
      expect(buffValues(s2Wrong.events, 'critDamagePct')).toEqual([4.13]);
    });

    it('DISCRIMINATING (stat): mis-keying 6.61 to critRatePct leaves NO critDamagePct buff', () => {
      expect(
        scarletBuffs(s2AsRate.events, 'critDamagePct').length,
        'stat moved off critDamagePct'
      ).toBe(0);
      expect(
        scarletBuffs(s2AsRate.events, 'critRatePct').length,
        'stat moved onto critRatePct'
      ).toBeGreaterThan(0);
    });
  });

  describe('H5 — burst Critical Rate ▲19.57% for 10 sec (HP<50% gate ≈ ungated over-credit ⚑)', () => {
    const applied = scarletBuffs(base.events, 'critRatePct');

    it('is the kit magnitude 19.57%, 10-sec duration, self-scoped, once per burst cast', () => {
      const bursts = scarletBursts(base.events).length;
      expect(bursts, 'scarlet cast no bursts in the fixture').toBeGreaterThan(
        0
      );
      expect(
        applied.length,
        'one crit-rate buff per burst cast (ungated)'
      ).toBe(bursts);
      expect(buffValues(base.events, 'critRatePct')).toEqual([19.57]);
      expect(
        [...new Set(applied.map((b) => b.targetIdx))],
        'self-scoped'
      ).toEqual([SCARLET]);
      expect(
        [...new Set(applied.map((b) => b.expiresFrame! - b.frame))],
        '10 sec = 600 frames'
      ).toEqual([10 * FPS]);
    });

    it('DISCRIMINATING (value): the level-1 magnitude 12.23 would change the pinned value', () => {
      expect(buffValues(burstCritWrong.events, 'critRatePct')).not.toEqual([
        19.57,
      ]);
      expect(buffValues(burstCritWrong.events, 'critRatePct')).toEqual([12.23]);
    });

    it("DISCRIMINATING (trigger): fullBurstEnter would over-fire on helm's rotations (co-B3)", () => {
      const fbEnter = scarletBuffs(
        burstCritFBEnter.events,
        'critRatePct'
      ).length;
      expect(
        fbEnter,
        `${fbEnter} fullBurstEnter applies vs ${applied.length} burstCast — helm shares the FB chain`
      ).toBeGreaterThan(applied.length);
    });
  });

  describe('H6 — burst deals 849.15% of final ATK as Burst Skill damage (all enemies)', () => {
    const nukes = scarletDamage(base.events, 'burst');

    it('fires once per burst cast at the kit magnitude, in the burst bucket', () => {
      const bursts = scarletBursts(base.events).length;
      expect(nukes.length, 'one nuke per burst cast').toBe(bursts);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([849.15]);
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

    it('DISCRIMINATING: the level-1 magnitude 530.71% would change the pinned value', () => {
      const wrong = scarletDamage(burstDmgWrong.events, 'burst');
      expect([...new Set(wrong.map((d) => d.atkPct))]).not.toEqual([849.15]);
      expect([...new Set(wrong.map((d) => d.atkPct))]).toEqual([530.71]);
    });
  });
});
