// PER-UNIT KIT SPEC — `naga` (Naga, Supporter/SG/Electric, Burst II, cd 20s, ammo 9,
// hitsPerShot 10). kit-autonomy gauntlet S2a (driver tests), 2026-07-25.
//
// One assertion group per KIT LINE (N1..N6 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) and to SCAFFOLD a shield window so a shield-gated line
// fires deterministically — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.naga.skills):
//   S1 ■ after 12 normal attacks → all allies: Restores 14.57% of Cover HP                  [UNMODELED — cover repair, not unit HP]
//      ■ when a Shield is set in front of this unit → all allies: core dmg ▲85.17% (10s)     [N1]
//   S2 ■ after 5 normal attacks → 2 highest-ATK allies: core dmg ▲40.07% (5s)                [N2]
//      ■ after 5 normal attacks → 2 lowest-HP allies: recover 9.58% of caster final Max HP   [N5 — tandem recovery feed]
//   BU ■ self: Gains Pierce for 10 sec                                                       [N6 — timed gainPierce]
//      ■ all allies: ATK ▲16.18% of caster ATK (10s)                                         [N3]
//      ■ if a Shield is set in front of this unit → all allies: ATK ▲31.02% of caster ATK    [N4]
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   N1  the trigger is {kind:'shielded'} — it fires off EVERY ally shield event (blanc's
//       hitCount-120 shields land far more often than naga's own bursts), and it fires ZERO times
//       in a shielder-less comp. Proven three ways: shipped fires on all 4 allies at 10s; the
//       no-shielder comp fires 0×; the nearest wrong trigger (burstCast on naga's own 4 casts)
//       produces a DIFFERENT (much smaller) fire count.
//   N2  the target is `alliesTopAtk` count 2 — exactly TWO distinct allies are buffed, not all
//       four. Counterfactual all-allies reaches 4 targets and moves damage.
//   N3  casterAtkPct (16.18% of NAGA's ATK, resolved flat) is UNCONDITIONAL — it fires on every
//       naga burst even with NO shielder present. Counterfactual stat atkPct (% of each target's
//       OWN ATK) shifts ally damage.
//   N4  the 31.02 line carries `requiresShielded`: it is suppressed entirely in a shielder-less
//       comp (naga still casts 12× there — the gate, not the cast cadence, holds it off), fires on
//       EVERY naga burst once a shield window is scaffolded over her, and LEAKS on every burst if
//       the gate is deleted. The flat value is 31.02/16.18 × the N3 flat value (same caster ATK
//       basis). This is the owner-ruled default-off shield gate (2026-07-20).
//   N5  the 9.58% heal is inert as HP (no pool) but LOAD-BEARING via the tandem rule: the heal
//       EVENT fires teammates' on-recovery triggers. In a crown comp it drives crown's recovery
//       buff (team Attack Damage 20.99%) ~1700× vs ~24× off crown's own rare heals; removing naga's
//       heal block collapses it. (Discharged the prior audit's open hard-rule-2 finding; the HP
//       MAGNITUDE stays unencoded — the engine heal carries no amount, prika precedent.) In the
//       graded comp (no recovery consumer) it is byte-identical, so calibration is untouched.
//   N6  self-Pierce is a TIMED gainPierce window (burstCast → self, 10s), not a whole-fight
//       hasPierce flag. Damage-INERT at scope lock (naga is SG; no pierceDamagePct source lands on
//       her) — removing it moves no total — but modeled for kit completeness (alice/prika convention).
//
// Fixtures (all deterministic — no seed):
//   SHIELD COMP   liter B1 / blanc B2(cd60) / naga B2 / ada B3, boss Fire, focus naga. Blanc (not
//                 crown) is the shielder because crown's cd20 + leftmost slot MONOPOLIZES the B2
//                 cast over naga (naga burstCasts 0 with crown present — probe-verified); blanc's
//                 cd60 lets naga win the B2 slot (4 casts) while her hitCount-120 shields drive the
//                 {kind:'shielded'} trigger and (when scaffolded long) the requiresShielded window.
//   NO-SHIELD COMP liter B1 / naga B2 / ada B3 / helm B3, boss Fire, focus naga. Naga is the sole
//                 B2 → casts every cycle (12×); no shield events → both shield-gated lines inert.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const ALLIES = 4;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(
  slugs: string[],
  overrides: Record<string, any> = {},
  focusIdx = 2
) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs,
    bossElement: 'Fire',
    focusSlug: slugs[focusIdx],
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { res, events, t: totals(res) };
}

const SHIELD_COMP = ['liter', 'blanc', 'naga', 'ada'];
const NO_SHIELD_COMP = ['liter', 'naga', 'ada', 'helm'];
const NAGA = 2; // slot in SHIELD_COMP
const NAGA_NS = 1; // slot in NO_SHIELD_COMP

// ---- counterfactual / scaffold patches --------------------------------------------------------
/** N4 scaffold: extend blanc's shield window so it covers every naga burst (isolates the gate). */
const blancLongShield = withPatchedOverride('blanc', (ov) => {
  let hit = 0;
  for (const block of (ov as any).skill1) {
    for (const eff of block.effects) {
      if (eff.kind === 'shield') {
        eff.durationSec = 120;
        hit++;
      }
    }
  }
  if (!hit) {
    throw new Error('blanc S1 shield block missing — fixture is stale');
  }
});
/** N4 counterfactual: delete the requiresShielded gate (the 31.02 line becomes unconditional). */
const nagaUngated = withPatchedOverride('naga', (ov) => {
  let had = false;
  for (const block of (ov as any).burst) {
    if (block.requiresShielded) {
      delete block.requiresShielded;
      had = true;
    }
  }
  if (!had) {
    throw new Error(
      'naga burst requiresShielded block missing — fixture is stale'
    );
  }
});
/** N1 counterfactual: the shield-gated core-dmg line re-triggered off naga's OWN burstCast. */
const nagaS1BurstCast = withPatchedOverride('naga', (ov) => {
  let hit = 0;
  for (const block of (ov as any).skill1) {
    if (block.trigger?.kind === 'shielded') {
      block.trigger = { kind: 'burstCast' };
      hit++;
    }
  }
  if (!hit) {
    throw new Error('naga S1 shielded block missing — fixture is stale');
  }
});
/** N2 counterfactual: the top-2-ATK core-dmg line retargeted to ALL allies. */
const nagaS2AllAllies = withPatchedOverride('naga', (ov) => {
  let hit = 0;
  for (const block of (ov as any).skill2) {
    if (block.target?.kind === 'alliesTopAtk') {
      block.target = { kind: 'allies' };
      hit++;
    }
  }
  if (!hit) {
    throw new Error('naga S2 alliesTopAtk block missing — fixture is stale');
  }
});
/** N3 counterfactual: casterAtkPct (% of NAGA's ATK) swapped for generic atkPct (% of target's OWN). */
const nagaGenericAtk = withPatchedOverride('naga', (ov) => {
  let hit = 0;
  for (const block of (ov as any).burst) {
    for (const eff of block.effects) {
      if (eff.stat === 'casterAtkPct') {
        eff.stat = 'atkPct';
        hit++;
      }
    }
  }
  if (!hit) {
    throw new Error(
      'naga burst casterAtkPct effect missing — fixture is stale'
    );
  }
});
/** Damage reference: every naga block removed (her whole kit contribution zeroed). */
const nagaDead = withPatchedOverride('naga', (ov) => {
  (ov as any).skill1 = [];
  (ov as any).skill2 = [];
  (ov as any).burst = [];
});
/** N5 counterfactual: naga's S2 heal block removed (the tandem recovery feed goes silent). */
const nagaNoS2Heal = withPatchedOverride('naga', (ov) => {
  const before = (ov as any).skill2.length;
  (ov as any).skill2 = (ov as any).skill2.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'heal')
  );
  if ((ov as any).skill2.length === before) {
    throw new Error('naga S2 heal block missing — fixture is stale');
  }
});
/** N6 inertness reference: naga's self-Pierce block removed. */
const nagaNoPierce = withPatchedOverride('naga', (ov) => {
  const before = (ov as any).burst.length;
  (ov as any).burst = (ov as any).burst.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'gainPierce')
  );
  if ((ov as any).burst.length === before) {
    throw new Error('naga burst gainPierce block missing — fixture is stale');
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run(SHIELD_COMP); // shipped, shielder present
const noShield = run(NO_SHIELD_COMP); // shipped, NO shielder (gate closed)
const longShield = run(SHIELD_COMP, { blanc: blancLongShield }); // gate open (scaffold)
const ungated = run(NO_SHIELD_COMP, { naga: nagaUngated }, NAGA_NS); // gate deleted (counterfactual)
const s1BurstCast = run(SHIELD_COMP, { naga: nagaS1BurstCast });
const s2AllAllies = run(SHIELD_COMP, { naga: nagaS2AllAllies });
const genericAtk = run(SHIELD_COMP, { naga: nagaGenericAtk });
const dead = run(SHIELD_COMP, { naga: nagaDead });
const noPierce = run(SHIELD_COMP, { naga: nagaNoPierce });
// N5 tandem comp: crown (slot 1) is an on-recovery CONSUMER; naga's S2 heal targets the leftmost 2
// allies (liter, crown) so crown receives it and its recovery-triggered team buff is the observable.
const CROWN_COMP = ['liter', 'crown', 'naga', 'ada'];
const CROWN = 1;
const crownBase = run(CROWN_COMP);
const crownNoHeal = run(CROWN_COMP, { naga: nagaNoS2Heal });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[], casterIdx: number) =>
  evs.filter(
    (e): e is BuffApply => e.kind === 'buffApply' && e.casterIdx === casterIdx
  );
const nagaBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'naga')
    .length;

const coreDmg = (evs: SimEvent[], casterIdx: number, value: number) =>
  buffs(evs, casterIdx).filter(
    (b) => b.stat === 'coreDamagePct' && Math.abs(b.value - value) < 0.01
  );
const casterAtk = (evs: SimEvent[], casterIdx: number) =>
  buffs(evs, casterIdx).filter((b) => b.stat === 'casterAtkPct');

/** Naga's casterAtkPct resolves to FLAT ATK = (pct/100)×staticAtk. The 16.18 line is the smaller
 *  flat value; the 31.02 line the larger. Split on a threshold between the two (~20k; staticAtk
 *  ≈ 99.7k → 16.18% ≈ 16.1k, 31.02% ≈ 30.9k). */
const line16 = (evs: SimEvent[], casterIdx: number) =>
  casterAtk(evs, casterIdx).filter((b) => b.value < 20000);
const line31 = (evs: SimEvent[], casterIdx: number) =>
  casterAtk(evs, casterIdx).filter((b) => b.value > 20000);

const distinctTargets = (list: BuffApply[]) =>
  new Set(list.map((b) => b.targetIdx));
const durations = (list: BuffApply[]) =>
  new Set(list.map((b) => (b.expiresFrame! - b.frame) / FPS));

describe('naga — kit spec', () => {
  describe('N1 — S1 shield-gated core damage 85.17% ({kind:shielded}, all allies, 10s)', () => {
    it('fires off ally shield events, reaching all four allies for 10s', () => {
      const list = coreDmg(base.events, NAGA, 85.17);
      expect(list.length, 'no 85.17 core-dmg buff was applied').toBeGreaterThan(
        0
      );
      expect(distinctTargets(list).size, 'must reach all 4 allies').toBe(
        ALLIES
      );
      expect([...durations(list)], 'duration must be 10s').toEqual([10]);
    });

    it('GATE: fires ZERO times with no shielder in the comp', () => {
      expect(coreDmg(noShield.events, NAGA_NS, 85.17).length).toBe(0);
    });

    it("DISCRIMINATES the trigger: re-triggering off naga's own burstCast changes the fire count", () => {
      // blanc's shields land far more often than naga's own 4 casts → shielded fires more.
      expect(coreDmg(s1BurstCast.events, NAGA, 85.17).length).not.toBe(
        coreDmg(base.events, NAGA, 85.17).length
      );
    });
  });

  describe('N2 — S2 core damage 40.07% to the 2 highest-ATK allies (hitCount 5, 5s)', () => {
    it('buffs exactly TWO distinct allies (not all four), for 5s', () => {
      const list = coreDmg(base.events, NAGA, 40.07);
      expect(list.length, 'no 40.07 core-dmg buff was applied').toBeGreaterThan(
        0
      );
      expect(
        distinctTargets(list).size,
        'alliesTopAtk count 2 must reach exactly 2 allies'
      ).toBe(2);
      expect([...durations(list)], 'duration must be 5s').toEqual([5]);
    });

    it('is encoded as alliesTopAtk count 2 off hitCount 5 (structural pin)', () => {
      const ov = withPatchedOverride('naga', () => {}) as any;
      const block = ov.skill2.find((b: any) =>
        b.effects.some((e: any) => e.stat === 'coreDamagePct')
      );
      expect(block.trigger).toEqual({ kind: 'hitCount', count: 5 });
      expect(block.target).toEqual({ kind: 'alliesTopAtk', count: 2 });
    });

    it('DISCRIMINATES the count: retargeting to all allies reaches 4 and moves damage', () => {
      expect(
        distinctTargets(coreDmg(s2AllAllies.events, NAGA, 40.07)).size
      ).toBe(ALLIES);
      // The two EXTRA targets (blanc, naga — not in the top-2 ATK) gain the core-dmg buff, so the
      // comp total moves even though ada/liter (the real top-2) are unchanged.
      const sum = (t: Record<string, number>) =>
        SHIELD_COMP.reduce((a, s) => a + t[s], 0);
      expect(sum(s2AllAllies.t)).not.toBe(sum(base.t));
    });
  });

  describe('N3 — burst ATK ▲16.18% of caster ATK (burstCast, all allies, 10s, UNCONDITIONAL)', () => {
    it('fires once per naga burst, reaching all four allies for 10s', () => {
      const bursts = nagaBursts(base.events);
      const list = line16(base.events, NAGA);
      expect(bursts).toBeGreaterThan(0);
      expect(list.length, 'one 16.18 application per ally per burst').toBe(
        bursts * ALLIES
      );
      expect(distinctTargets(list).size).toBe(ALLIES);
      expect([...durations(list)], 'duration must be 10s').toEqual([10]);
    });

    it('is UNCONDITIONAL: still fires on every burst with NO shielder present', () => {
      const bursts = nagaBursts(noShield.events);
      expect(bursts).toBeGreaterThan(0);
      expect(line16(noShield.events, NAGA_NS).length).toBe(bursts * ALLIES);
    });

    it('DISCRIMINATES the stat: casterAtkPct ≠ generic atkPct (moves carry damage)', () => {
      expect(genericAtk.t.ada).not.toBe(base.t.ada);
    });
  });

  describe('N4 — burst ATK ▲31.02% of caster ATK (burstCast + requiresShielded, all allies, 10s)', () => {
    it('GATE CLOSED: suppressed entirely with no shielder, though naga still casts every cycle', () => {
      expect(
        nagaBursts(noShield.events),
        'naga must still cast in the no-shielder comp'
      ).toBeGreaterThan(0);
      expect(
        line31(noShield.events, NAGA_NS).length,
        'the gate, not the cast cadence, holds it off'
      ).toBe(0);
    });

    it('GATE OPEN: fires on every naga burst once a shield window covers her (scaffold)', () => {
      const bursts = nagaBursts(longShield.events);
      expect(bursts).toBeGreaterThan(0);
      expect(line31(longShield.events, NAGA).length).toBe(bursts * ALLIES);
      expect(distinctTargets(line31(longShield.events, NAGA)).size).toBe(
        ALLIES
      );
    });

    it('DISCRIMINATES the gate: deleting requiresShielded leaks the line on every burst (no shielder)', () => {
      const bursts = nagaBursts(ungated.events);
      expect(
        line31(ungated.events, NAGA_NS).length,
        'ungated 31.02 must fire on every burst'
      ).toBe(bursts * ALLIES);
    });

    it('is 31.02/16.18 × the N3 flat value (same caster-ATK basis)', () => {
      const v16 = line16(base.events, NAGA)[0]?.value;
      const v31 = line31(longShield.events, NAGA)[0]?.value;
      expect(v16, 'N3 flat value missing').toBeGreaterThan(0);
      expect(v31, 'N4 flat value missing').toBeGreaterThan(0);
      expect(Math.abs(v31! / v16! - 31.02 / 16.18)).toBeLessThan(1e-6);
    });
  });

  describe('kit contribution is damage-load-bearing (not inert)', () => {
    it("zeroing naga's whole kit drops the carry's damage", () => {
      expect(base.t.ada).toBeGreaterThan(dead.t.ada);
    });
  });

  describe('N5 — S2 heal is a tandem RECOVERY FEED (hitCount 5 → 2 lowest-HP allies → heal)', () => {
    // The kit's "recover 9.58% final Max HP" is offensively inert as HP (no HP pool), but it is
    // LOAD-BEARING via the tandem rule: the heal EVENT fires teammates' on-recovery triggers.
    // Crown ("when recovery takes effect" → team Attack Damage 20.99%) is the observable consumer.
    const crownRecovery = (evs: SimEvent[]) =>
      evs.filter(
        (e): e is BuffApply =>
          e.kind === 'buffApply' &&
          e.casterIdx === CROWN &&
          e.stat === 'attackDamagePct' &&
          Math.abs(e.value - 20.99) < 0.01
      );

    it('is encoded as a heal off hitCount 5 to the 2 lowest-HP allies (structural pin)', () => {
      const ov = withPatchedOverride('naga', () => {}) as any;
      const heal = ov.skill2.find((b: any) =>
        b.effects.some((e: any) => e.kind === 'heal')
      );
      expect(heal, 'naga S2 heal block missing').toBeDefined();
      expect(heal.trigger).toEqual({ kind: 'hitCount', count: 5 });
      expect(heal.target).toEqual({ kind: 'alliesLowestHp', count: 2 });
    });

    it("feeds crown's recovery consumer at naga's heal cadence (not crown's own rare heals)", () => {
      const withHeal = crownRecovery(crownBase.events).length;
      const withoutHeal = crownRecovery(crownNoHeal.events).length;
      expect(
        withHeal,
        "naga's S2 heal must drive crown's recovery buff"
      ).toBeGreaterThan(100);
      expect(
        withHeal,
        `removing naga's heal leaves only crown's own ${withoutHeal} self-heal procs`
      ).toBeGreaterThan(withoutHeal * 5);
    });

    it("the recovery feed reaches all four allies (crown's buff is team-wide)", () => {
      const targets = new Set(
        crownRecovery(crownBase.events).map((b) => b.targetIdx)
      );
      expect(targets.size).toBe(ALLIES);
    });
  });

  describe('N6 — burst self-Pierce is a timed gainPierce window (burstCast → self, 10s)', () => {
    it('is encoded as gainPierce durationSec 10 on burstCast/self (structural pin)', () => {
      const ov = withPatchedOverride('naga', () => {}) as any;
      const pierce = ov.burst.find((b: any) =>
        b.effects.some((e: any) => e.kind === 'gainPierce')
      );
      expect(pierce, 'naga burst gainPierce block missing').toBeDefined();
      expect(pierce.trigger).toEqual({ kind: 'burstCast' });
      expect(pierce.target).toEqual({ kind: 'self' });
      expect(
        pierce.effects.find((e: any) => e.kind === 'gainPierce').durationSec
      ).toBe(10);
      // a TIMED window, not a whole-fight top-level flag
      expect(ov.hasPierce ?? false).toBe(false);
    });

    it('is damage-INERT at scope lock (no pierceDamagePct source lands on SG naga)', () => {
      // SHIELD_COMP has no Pierce Damage ▲ buffer reaching naga → removing the tag moves nothing.
      for (const s of SHIELD_COMP) {
        expect(noPierce.t[s]).toBe(base.t[s]);
      }
    });
  });

  describe('unmodeled lines (structural pins)', () => {
    it('documents the cover restore as skipped (cover-object repair, not a unit heal)', () => {
      const ov = withPatchedOverride('naga', () => {}) as any;
      expect(ov.unmodeled.skill1.join(' ')).toContain('Cover');
      // The S2 heal EVENT and the self-Pierce are modelled. Since the 2026-08-11 owner ruling
      // (DECISIONS — unmodeled behaviour is recorded, not left to prose) the S2 heal's MAGNITUDE
      // is filed: the amount has no engine consumer (no HP pool), only the event does.
      expect(ov.unmodeled.skill2.join(' ')).toContain(
        'Recovers 9.58% of the skill user'
      );
      expect(ov.unmodeled.skill2.length).toBe(1);
      expect(ov.unmodeled.burst).toEqual([]);
    });
  });
});
