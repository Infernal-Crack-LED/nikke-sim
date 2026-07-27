// PER-UNIT KIT SPEC — `arcana` (BASE Arcana, RL / Supporter / Electric, Burst II, cd 40s, ammo 6,
// chargeFrames 60). Kit-autonomy gauntlet 2026-07-24 (test-first; revised after the gate FIX below).
//
// ⚠ EXACT-SLUG: this is base `arcana` (RL/Electric/B2) — NOT `arcana-fortune-mate` (SG/Fire/B2).
//
// One assertion group per KIT LINE (A0..A9), asserted against the SHIPPED override loaded from disk.
// `withPatchedOverride` builds COUNTERFACTUALS only (the nearest wrong model each assertion must
// discriminate against) — never the encoding under test.
//
// Kit (blablalink prose @ lvl10, data/characters.json → characters.arcana.skills):
//   S1 ■ on Full Burst END, all Burst-3 Electric allies who cast (if self in Wheel of Fortune):
//        The Magician: Cooldown of Skill 2 ▼75% for 15s   → UNMODELED (no skill-CD model; S2 is
//                                                            event-keyed to FB-end, nothing to act on) [A0]
//        Attack damage ▲180% for 15s                       [A4]
//      ■ on Full Burst END, all allies (NO gate): ATK ▲5% of the skill user's ATK for 10s          [A7]
//   S2 ■ on Full Burst END, all Burst-3 Electric allies who cast (if self in Wheel of Fortune):
//        Strength: ATK ▲180% of the skill user's ATK for 15s   [A5]
//      ■ on Full Burst END, all allies (if self in Wheel of Fortune):
//        Death: Cooldown of Burst Skill ▼6s + ATK ▲50% casterATK for 5s   [A6]  (burstCdr event-SILENT)
//      ■ on Full Burst END, all allies (NO gate): Attack damage ▲7.5% for 10s                     [A8]
//   BU ■ all Electric Code allies: Wheel of Fortune: Attack damage ▲10% for 10s                   [A1]
//      ■ all enemies: Deals 300% of final ATK as Burst Skill damage                              [A2]
//                   Judgement: Damage taken ▲10% for 10s                                         [A3]
//
// THE GATE (the heart of this kit + the gauntlet FIX). "if self is in Wheel of Fortune status" gates
// A4/A5/A6. Arcana is the SOLE source of Wheel of Fortune (her own burst grants it), so "self in WoF
// status" ⟺ "arcana cast her burst this rotation". A literal 10s buff-aliveness check at FB-end is
// dead-by-epsilon (cast→FB-end >10s would zero the whole gated half of the kit), so the faithful
// encoding is ownBurstGate:'cast' composed with fullBurstEnd — the engine evaluates it against
// rotationCasters, which is still populated when fullBurstEnd triggers fire (sim.ts resets it AFTER
// fireTriggered). The parser-baseline shipped a round-count proxy (everyN:2 offset:1) that was
// unfaithful in BOTH directions: it OVER-fired when arcana never burst (a faster B2 contests the slot)
// and UNDER-fired when she burst every rotation. The gauntlet replaced it with ownBurstGate:'cast'.
//
// The test pins that gate with TWO fixtures:
//   B = [liter, arcana, ada] — arcana is the SOLE B2 (bursts every rotation) and ada the SOLE B3
//       Electric (casts every rotation, the unambiguous 180-grant target); liter is Iron (non-Electric)
//       so Wheel scoping is falsifiable. Here the gate is ALWAYS satisfied → gated lines fire every
//       FB-end, exactly like the ungated lines.
//   A = [liter, crown, arcana, ada, helm] — crown (B2, cd 20s) contests the Burst-II slot so arcana
//       NEVER bursts (measured 0 casts). Here the gate is NEVER satisfied → the gated lines are perfectly
//       INERT while the ungated lines (A7/A8) still fire every FB-end. That contrast (gated inert /
//       ungated active in the SAME fight) is what proves the gate is cast-dependent (ownBurstGate), not
//       a round-count or an ungated model. Counterfactuals re-introduce the ungated model and the old
//       everyN proxy in fixture A and assert they over-fire there (which the shipped encoding does not).
//
// casterAtkPct is stored by the engine as an ABSOLUTE ATK grant (caster ATK × pct), not a percentage,
// so A5/A6/A7 pin the kit's 180:50:5 ratio (=36:10:1) between the three casterAtk lines. attackDamagePct
// IS stored as a percentage, so A1/A4/A8 pin 10/180/7.5 directly.
//
// Deterministic (no seed). The fixture supplies a B3 Electric caster so the team-conditional 180-grants
// are LIVE (inert without one — ⚑).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
/** Fixture B — arcana sole B2 (bursts every rotation), ada sole B3 Electric, liter Iron (non-Elec). */
const B_SLUGS = ['liter', 'arcana', 'ada'] as const;
const B_ARCANA = 1;
const B_ADA = 2;
const B_ELECTRIC = [1, 2]; // arcana, ada (liter=Iron excluded from Wheel)
/** Fixture A — crown (B2 cd20) contests the slot so arcana never bursts; gate never satisfied. */
const A_SLUGS = ['liter', 'crown', 'arcana', 'ada', 'helm'] as const;
const A_ARCANA = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(
  slugs: readonly string[],
  focus: string,
  overrides: Record<string, any> = {}
) {
  const events: SimEvent[] = [];
  runComp({
    slugs: [...slugs],
    bossElement: 'Fire',
    focusSlug: focus,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return events;
}

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const arcanaBuffs = (evs: SimEvent[], slot: number) =>
  buffs(evs).filter((b) => b.casterIdx === slot);
const arcanaCasts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'arcana'
  );
const fbEnds = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstEnd');
const arcanaDmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage' && e.slug === 'arcana');
const enemyDebuffs = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.targetIdx === null);
/** distinct firing frames of a buffApply stream (one firing = one frame, even multi-holder). */
const firings = (bs: BuffApply[]) =>
  [...new Set(bs.map((b) => b.frame))].sort((a, b) => a - b);

/** arcana's casterAtkPct lines bucketed by expiry delta — the 5%/50%/180% kit lines fingerprinted
 *  by duration (10s/5s/15s), then magnitude-ratio-checked (casterAtkPct is stored as absolute ATK). */
function casterAtkByDuration(evs: SimEvent[], slot: number) {
  const cas = arcanaBuffs(evs, slot).filter((b) => b.stat === 'casterAtkPct');
  const groups = new Map<number, BuffApply[]>();
  for (const b of cas) {
    const expD = b.expiresFrame != null ? b.expiresFrame - b.frame : -1;
    (groups.get(expD) ?? groups.set(expD, []).get(expD)!).push(b);
  }
  return groups;
}

// ---- counterfactual patches (nearest wrong model each line must beat) -------------------------
const patch = (mutate: (ov: any) => void) =>
  withPatchedOverride('arcana', mutate);

/** A1: Wheel of Fortune retargeted to ALL allies (drops Electric-only scoping). */
const wheelAllies = patch((ov) => {
  if (ov.burst[0]?.effects?.[0]?.stat !== 'attackDamagePct') {
    throw new Error('arcana burst[0] Wheel missing — stale fixture');
  }
  ov.burst[0].target = { kind: 'allies' };
});
/** A2: burst nuke halved (300% → 150%, the lvl-1 magnitude). */
const nukeHalf = patch((ov) => {
  const fd = ov.burst[1]?.effects?.find((e: any) => e.kind === 'flatDamage');
  if (!fd) {
    throw new Error('arcana burst flatDamage missing — stale fixture');
  }
  fd.atkPct = 150;
});
/** A3: Judgement (damage-taken debuff) removed from the burst. */
const noJudgement = patch((ov) => {
  const before = ov.burst[1].effects.length;
  ov.burst[1].effects = ov.burst[1].effects.filter(
    (e: any) => e.stat !== 'damageTakenPct'
  );
  if (ov.burst[1].effects.length === before) {
    throw new Error('arcana Judgement missing — stale fixture');
  }
});
/** A4/A5: the two 180-grants retargeted from "B3 Electric casters" to ALL allies. */
const grantsAllies = patch((ov) => {
  if (ov.skill1[0]?.effects?.[0]?.stat !== 'attackDamagePct') {
    throw new Error('arcana S1 180AD missing — stale fixture');
  }
  if (ov.skill2[0]?.effects?.[0]?.stat !== 'casterAtkPct') {
    throw new Error('arcana S2 Strength missing — stale fixture');
  }
  ov.skill1[0].target = { kind: 'allies' };
  ov.skill2[0].target = { kind: 'allies' };
});
/** GATE→ungated: drop ownBurstGate from the three gated blocks (they then fire every FB-end even
 *  when arcana never bursts — the over-credit the shipped encoding avoids). */
const gateUngated = patch((ov) => {
  let n = 0;
  for (const b of [...ov.skill1, ...ov.skill2]) {
    if (b.ownBurstGate) {
      delete b.ownBurstGate;
      n++;
    }
  }
  if (n !== 3) {
    throw new Error(
      'arcana: expected 3 ownBurstGate blocks, found ' + n + ' — stale fixture'
    );
  }
});
/** GATE→old proxy: replace ownBurstGate with the parser-baseline everyN:2 offset:1 round-count,
 *  which fires on odd FB-ends regardless of whether arcana burst. */
const gateEveryN = patch((ov) => {
  let n = 0;
  for (const b of [...ov.skill1, ...ov.skill2]) {
    if (b.ownBurstGate) {
      delete b.ownBurstGate;
      b.everyN = 2;
      b.everyNOffset = 1;
      n++;
    }
  }
  if (n !== 3) {
    throw new Error(
      'arcana: expected 3 ownBurstGate blocks, found ' + n + ' — stale fixture'
    );
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const B = run(B_SLUGS, 'ada'); // arcana bursts every rotation (gate always ON)
const A = run(A_SLUGS, 'ada'); // arcana never bursts (gate always OFF)
const rWheelAllies = run(B_SLUGS, 'ada', { arcana: wheelAllies });
const rNukeHalf = run(B_SLUGS, 'ada', { arcana: nukeHalf });
const rNoJudgement = run(B_SLUGS, 'ada', { arcana: noJudgement });
const rGrantsAllies = run(B_SLUGS, 'ada', { arcana: grantsAllies });
const rGateUngatedA = run(A_SLUGS, 'ada', { arcana: gateUngated });
const rGateEveryNA = run(A_SLUGS, 'ada', { arcana: gateEveryN });

// ---- derived constants (from the SHIPPED runs, not hardcoded) ---------------------------------
const B_CASTS = arcanaCasts(B).length;
const B_FB = fbEnds(B).length;
const A_FB = fbEnds(A).length;
const A_CASTS = arcanaCasts(A).length;

describe('arcana (BASE, RL/Electric/B2) — kit spec', () => {
  it('fixture sanity: B arcana bursts every FB; A arcana never bursts (gate ON vs OFF)', () => {
    expect(B_CASTS, 'fixture B: arcana should burst').toBeGreaterThan(0);
    expect(B_CASTS).toBeGreaterThanOrEqual(B_FB);
    expect(
      A_FB,
      'fixture A: Full Bursts should still happen (crown closes the chain)'
    ).toBeGreaterThan(1);
    expect(
      A_CASTS,
      'fixture A: crown must contest the B2 slot so arcana never bursts'
    ).toBe(0);
  });

  describe('A1 — burst: Wheel of Fortune grants 10% Attack Damage to ELECTRIC allies only, per cast', () => {
    const wheel = arcanaBuffs(B, B_ARCANA).filter(
      (b) => b.stat === 'attackDamagePct' && b.value === 10
    );
    it('is 10% for 10s, once per cast per Electric ally', () => {
      expect([...new Set(wheel.map((b) => b.value))]).toEqual([10]);
      expect(wheel.length).toBe(B_CASTS * B_ELECTRIC.length);
      for (const b of wheel) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });
    it('reaches exactly the Electric allies (arcana/ada), never the Iron ally (liter)', () => {
      expect(
        [...new Set(wheel.map((b) => b.targetIdx))].sort((a, b) => a! - b!)
      ).toEqual(B_ELECTRIC);
    });
    it('DISCRIMINATING: an all-allies retarget would also reach liter', () => {
      const cf = arcanaBuffs(rWheelAllies, B_ARCANA).filter(
        (b) => b.stat === 'attackDamagePct' && b.value === 10
      );
      expect(
        new Set(cf.map((b) => b.targetIdx)).has(0),
        'liter (Iron) must NOT get Wheel under the shipped scoping'
      ).toBe(true);
      expect(cf.length).toBe(B_CASTS * B_SLUGS.length);
    });
  });

  describe('A2 — burst: deals 300% of final ATK as Burst Skill damage, once per cast', () => {
    const nukes = arcanaDmg(B).filter((d) => d.bucket === 'burst');
    it('fires once per cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes.length).toBe(B_CASTS);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([300]);
    });
    it('DISCRIMINATING: the lvl-1 magnitude (150%) is a different number', () => {
      const cf = arcanaDmg(rNukeHalf).filter((d) => d.bucket === 'burst');
      expect([...new Set(cf.map((d) => d.atkPct))]).toEqual([150]);
    });
  });

  describe('A3 — burst: Judgement raises enemy Damage Taken 10% for 10s, per cast', () => {
    const judge = enemyDebuffs(B).filter(
      (b) => b.stat === 'damageTakenPct' && b.value === 10
    );
    it('applies a 10% damage-taken debuff to the boss once per cast', () => {
      expect(judge.length).toBe(B_CASTS);
      for (const b of judge) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });
    it('DISCRIMINATING: removing Judgement leaves no 10% damage-taken debuff', () => {
      expect(
        enemyDebuffs(rNoJudgement).filter(
          (b) => b.stat === 'damageTakenPct' && b.value === 10
        ).length
      ).toBe(0);
    });
  });

  describe('A4 — S1: 180% Attack Damage to B3 Electric casters, ownBurstGate (fires iff arcana cast)', () => {
    const ad180B = arcanaBuffs(B, B_ARCANA).filter(
      (b) => b.stat === 'attackDamagePct' && b.value === 180
    );
    const ad180A = arcanaBuffs(A, A_ARCANA).filter(
      (b) => b.stat === 'attackDamagePct' && b.value === 180
    );
    it('fixture B (arcana bursts): 180% for 15s on the B3 Electric caster (ada), every FB-end', () => {
      expect([...new Set(ad180B.map((b) => b.value))]).toEqual([180]);
      expect(
        firings(ad180B).length,
        'gate satisfied every rotation → fires every FB-end'
      ).toBe(B_FB);
      expect([...new Set(ad180B.map((b) => b.targetIdx))]).toEqual([B_ADA]);
      for (const b of ad180B) {
        expect(b.expiresFrame! - b.frame).toBe(15 * FPS);
      }
    });
    it('fixture A (arcana never bursts): perfectly INERT — she is never in Wheel of Fortune', () => {
      expect(
        ad180A.length,
        'ownBurstGate must hold the 180% AD when arcana did not cast'
      ).toBe(0);
    });
    it('DISCRIMINATING: an all-allies retarget leaks 180% AD onto liter & arcana in fixture B', () => {
      const cf = arcanaBuffs(rGrantsAllies, B_ARCANA).filter(
        (b) => b.stat === 'attackDamagePct' && b.value === 180
      );
      expect(
        [...new Set(cf.map((b) => b.targetIdx))].sort((a, b) => a! - b!)
      ).toEqual([0, 1, 2]);
    });
    it('DISCRIMINATING: the ungated model over-fires in fixture A (shipped stays inert)', () => {
      const cf = arcanaBuffs(rGateUngatedA, A_ARCANA).filter(
        (b) => b.stat === 'attackDamagePct' && b.value === 180
      );
      expect(
        cf.length,
        'ungated 180% AD fires in A despite 0 arcana casts'
      ).toBeGreaterThan(0);
    });
    it('DISCRIMINATING: the old everyN:2 proxy also over-fires in fixture A (shipped stays inert)', () => {
      const cf = arcanaBuffs(rGateEveryNA, A_ARCANA).filter(
        (b) => b.stat === 'attackDamagePct' && b.value === 180
      );
      expect(
        cf.length,
        'everyN proxy fires on odd FB-ends in A despite 0 arcana casts'
      ).toBeGreaterThan(0);
    });
  });

  describe('A5 — S2: Strength grants 180% casterATK to B3 Electric casters, ownBurstGate', () => {
    const gB = casterAtkByDuration(B, B_ARCANA);
    const v5 = gB.get(10 * FPS)![0].value; // ungated 5% line (10s)
    const line = gB.get(15 * FPS)!; // 180% Strength (15s, ada-only)
    it('fixture B: 180% casterATK (36× the 5% line), ada-only, every FB-end, 15s', () => {
      expect([...new Set(line.map((b) => b.targetIdx))]).toEqual([B_ADA]);
      expect(firings(line).length).toBe(B_FB);
      expect(line[0].value / v5).toBeCloseTo(36, 6); // 180 / 5
    });
    it('fixture A (arcana never bursts): perfectly INERT', () => {
      const gA = casterAtkByDuration(A, A_ARCANA);
      expect(gA.has(15 * FPS) ? gA.get(15 * FPS)!.length : 0).toBe(0);
    });
    it('DISCRIMINATING: an all-allies retarget leaks Strength onto all three in fixture B', () => {
      const cf = casterAtkByDuration(rGrantsAllies, B_ARCANA).get(15 * FPS)!;
      expect(
        [...new Set(cf.map((b) => b.targetIdx))].sort((a, b) => a! - b!)
      ).toEqual([0, 1, 2]);
    });
  });

  describe('A6 — S2: Death grants burstCdr 6 + 50% casterATK to all allies, ownBurstGate', () => {
    // 50% casterATK = the 5s casterAtk line, all allies. (burstCdr is event-silent — it mutates
    // burstCdFrames directly — so the gate is pinned via this observable sibling.)
    const gB = casterAtkByDuration(B, B_ARCANA);
    const v5 = gB.get(10 * FPS)![0].value;
    const line = gB.get(5 * FPS)!;
    it('fixture B: 50% casterATK (10× the 5% line), all allies, every FB-end, 5s', () => {
      expect(
        [...new Set(line.map((b) => b.targetIdx))].sort((a, b) => a! - b!)
      ).toEqual([0, 1, 2]);
      expect(firings(line).length).toBe(B_FB);
      expect(line[0].value / v5).toBeCloseTo(10, 6); // 50 / 5
    });
    it('fixture A (arcana never bursts): perfectly INERT', () => {
      const gA = casterAtkByDuration(A, A_ARCANA);
      expect(gA.has(5 * FPS) ? gA.get(5 * FPS)!.length : 0).toBe(0);
    });
    it('DISCRIMINATING: un-gating Death makes it fire in fixture A (shipped stays inert)', () => {
      const gAcf = casterAtkByDuration(rGateUngatedA, A_ARCANA);
      expect(gAcf.has(5 * FPS) && firings(gAcf.get(5 * FPS)!).length > 0).toBe(
        true
      );
    });
  });

  describe('A7 — S1: 5% casterATK to all allies, UNGATED (fires every FB-end WHETHER OR NOT arcana burst)', () => {
    it('fixture B: all three allies on every FB-end, 10s', () => {
      const line = casterAtkByDuration(B, B_ARCANA).get(10 * FPS)!;
      expect(
        [...new Set(line.map((b) => b.targetIdx))].sort((a, b) => a! - b!)
      ).toEqual([0, 1, 2]);
      expect(firings(line).length).toBe(B_FB);
    });
    it('fixture A: STILL fires every FB-end (ungated) — the contrast with the inert gated lines', () => {
      const line = casterAtkByDuration(A, A_ARCANA).get(10 * FPS)!;
      expect(
        firings(line).length,
        'ungated 5% must fire on every FB-end even though arcana never bursts'
      ).toBe(A_FB);
    });
  });

  describe('A8 — S2: 7.5% Attack Damage to all allies, UNGATED (every FB-end whether or not arcana burst)', () => {
    it('fixture B: 7.5% for 10s on all three allies, every FB-end', () => {
      const g = arcanaBuffs(B, B_ARCANA).filter(
        (b) => b.stat === 'attackDamagePct' && b.value === 7.5
      );
      expect([...new Set(g.map((b) => b.value))]).toEqual([7.5]);
      expect(
        [...new Set(g.map((b) => b.targetIdx))].sort((a, b) => a! - b!)
      ).toEqual([0, 1, 2]);
      expect(firings(g).length).toBe(B_FB);
      for (const b of g) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });
    it('fixture A: STILL fires every FB-end (ungated)', () => {
      const g = arcanaBuffs(A, A_ARCANA).filter(
        (b) => b.stat === 'attackDamagePct' && b.value === 7.5
      );
      expect(firings(g).length).toBe(A_FB);
    });
  });

  describe('A0 — The Magician (S2 CD ▼75%) is an honest UNMODELED skip', () => {
    it('the override documents the skip verbatim in unmodeled.skill1 (engine has no skill-CD model)', async () => {
      const { readFileSync } = await import('node:fs');
      const ov = JSON.parse(
        readFileSync(
          new URL('../../../src/skills/overrides/arcana.json', import.meta.url),
          'utf8'
        )
      );
      expect(ov.unmodeled.skill1.join(' ')).toMatch(
        /Cooldown of Skill 2 ▼ 75% for 15 sec/
      );
      expect(
        JSON.stringify(ov),
        'validator forbids ignored-effect blocks'
      ).not.toMatch(/"ignored"/);
    });
  });
});
