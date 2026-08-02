// PER-UNIT KIT SPEC — `biscuit` (Biscuit, Supporter/RL/Electric, Burst II, cd 40s, ammo 6,
// chargeFrames 60). Kit-autonomy gauntlet 2026-08-01; test-first re-derivation from kit prose,
// reconciled against the claude-fable-5 blind re-derivation (S2b).
//
// One assertion group per LOAD-BEARING kit line (B1, B2, B6, B7 below), asserted against the
// SHIPPED override loaded from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS
// / isolate a line — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.biscuit.skills):
//   S1 ■ at the END of Full Burst → all ATTACKER allies:
//        Critical Rate OF NORMAL ATTACK ▲5.77% for 10 sec                              [B1]
//        recovers 1.53% of the skill user's final Max HP every 1 sec for 10 sec        [B2 — heal HoT]
//   S2 ■ when a Defender ally's HP falls below 50% → that Defender ally:
//        Invincible for 5 sec (2/battle)                                               [UNMODELED — trigger un-fireable]
//        Recovers 23.26% of the skill user's final Max HP (2/battle)                   [UNMODELED — trigger un-fireable]
//   BU ■ 2 random ally unit(s) whose cover has been destroyed:
//        Rebuild Cover with 93.6% HP                                                   [UNMODELED — cover-HP]
//      ■ all SUPPORTER allies:
//        ATK ▲43.08% for 10 sec                                                        [B6]
//        Recovers 55.44% of attack damage as HP over 10 sec                            [B7 — lifesteal heal]
//
// Biscuit has NO damage line of her own. Four lines carry her sim content: two CLASS-SCOPED buffs
// (B1 Attacker normal-crit, B6 Supporter ATK) and two CLASS-SCOPED heals (B2 Attacker HoT,
// B7 Supporter lifesteal). The heals ARE modeled as `heal` effects (NOT dropped) — per the helm
// precedent (helm's burst lifesteal is a heal ticks:10 intervalSec:1 that drives recovery consumers;
// helm.test.ts H8) and the independent fable re-derivation, which converged on the recovery-stream
// encoding for both. A `heal` models no HP AMOUNT; its only sim content is the recovery event(s) it
// emits to its targets, firing THEIR 'recovery'-triggered blocks. The remaining three lines stay
// UNMODELED: skill2's invincibility + heal share an HP-below-50% trigger that cannot fire in v1
// (no HP pool / damage-taken model — immortal boss), and the burst cover-rebuild has no sim
// representation (liter cover-HP NO-OP class, owner ruling 2026-07-21).
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   B1  TWO axes — CLASS (an all-allies counterfactual reaches the whole team; shipped reaches only
//       the 2 Attackers) and NORMAL-SCOPE (a generic critRatePct moves the skill/burst crit buckets;
//       shipped is byte-identical to buff-removed there). helm is in the comp emitting her OWN
//       all-allies critRateNormalPct 14.64, so the discriminator filters casterIdx === BISCUIT.
//   B2  the S1 HoT is an ATTACKER recovery stream: with asuka (an Attacker 'on-recovery → self ATK
//       ▲96.98%' carrier) as the probe, removing ONLY the S1 heal collapses asuka's recovery-buff
//       count by a multi-tick HoT's worth (≥10 events), while removing the BURST heal changes
//       nothing — proving B2 is Attacker-scoped recovery, not an instant heal and not team-wide.
//   B6  CLASS — the burst ATK reaches only the 2 Supporters (liter + biscuit herself); an all-allies
//       counterfactual reaches the whole team. Live: removing it drops biscuit's + liter's totals.
//   B7  the burst lifesteal is a SUPPORTER recovery stream — the mirror of B2's probe: removing it
//       leaves asuka's (Attacker) recovery count UNCHANGED, so it is NOT an Attacker recovery source
//       (it is Supporter-scoped). No Supporter 'on-recovery' consumer exists in the roster, so the
//       channel is faithfully encoded but presently inert; its scoping is what the probe proves.
//   LITER-TRAP GUARD — neither heal feeds a DEFENDER consumer: in a comp with Crown (the canonical
//       'when recovery takes effect → team ATK ▲20.99%' Defender consumer), Crown's recovery-buff
//       count is IDENTICAL with biscuit's heals present vs removed (biscuit contributes ZERO), even
//       though a genuine all-allies healer (helm) feeds Crown hundreds of times in the control comp.
//       This is the inverse of the liter cover-HP trap: biscuit's heals are real unit heals but are
//       class-scoped AWAY from Defenders, so they cannot spuriously inflate the team via Crown.
//
// Fixtures (all deterministic, no seed; event-log over totals):
//   MAIN  liter(Sup,B1) / biscuit(Sup,B2) / ada(Atk,B3) / helm(Atk,B3), boss Fire, focus ada — the
//         control comp with crown SWAPPED for biscuit so biscuit is the SOLE B2 caster (with crown
//         present she out-rotates biscuit and B6/B7 never fire). Two Supporters + two Attackers make
//         both class exclusions observable. Biscuit's cd-40 burst is the B2 bottleneck → 5 Full
//         Bursts over 180s, every one firing S1 (fullBurstEnd) and her own burst cast (burstCast).
//   PROBE liter / biscuit / asuka(Atk,B3 recovery consumer) / ada — isolates the heal recovery
//         channel on an Attacker consumer (asuka's self-ATK recovery buff is the observable).
//   GUARD liter / crown(Def,B2 recovery consumer) / biscuit / asuka / ada — the Defender-consumer
//         negative (crown out-rotates biscuit at B2 here, which is fine: S1 fires at FB end
//         regardless of who casts, and the burst heal's Defender-exclusion is what's under test).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';
import type { CompOptions } from '../lib/harness.js';

const FPS = 60;
/** MAIN fixture slot order: liter 0 / biscuit 1 / ada 2 / helm 3. */
const LITER = 0;
const BISCUIT = 1;
const ADA = 2;
const HELM = 3;
const TEAM_SIZE = 4;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;

const mainComp: CompOptions = {
  slugs: ['liter', 'biscuit', 'ada', 'helm'],
  bossElement: 'Fire',
  focusSlug: 'ada',
};

function runMain(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...mainComp,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}
function runEvents(slugs: string[], overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  runComp({
    slugs,
    bossElement: 'Fire',
    focusSlug: 'ada',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return events;
}

// ---- counterfactual / isolation patches -------------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);
const stripHeal = (ov: any, slot: 'skill1' | 'burst') => {
  const before = ov[slot].reduce(
    (n: number, b: any) =>
      n + b.effects.filter((e: any) => e.kind === 'heal').length,
    0
  );
  ov[slot].forEach((b: any) => {
    b.effects = b.effects.filter((e: any) => e.kind !== 'heal');
  });
  if (before === 0) {
    throw new Error(`biscuit ${slot} heal effect missing — fixture is stale`);
  }
};

/** B1 reference: her S1 crit line removed entirely. */
const biscuitNoCrit = withPatchedOverride('biscuit', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'critRateNormalPct'));
  if (ov.skill1.length === before) {
    throw new Error(
      'biscuit S1 critRateNormalPct block missing — fixture is stale'
    );
  }
});
/** B1 counterfactual (normal-axis): the same line as a GENERIC (unscoped) crit-rate stat. */
const biscuitGenericCrit = withPatchedOverride('biscuit', (ov) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'critRateNormalPct');
  if (!e) {
    throw new Error(
      'biscuit S1 critRateNormalPct effect missing — fixture is stale'
    );
  }
  e.stat = 'critRatePct';
});
/** B1 counterfactual (class-axis): the same line targeting ALL allies, not Attackers only. */
const biscuitAlliesCrit = withPatchedOverride('biscuit', (ov) => {
  const b = ov.skill1.find((x: any) => hasStat(x, 'critRateNormalPct'));
  if (!b) {
    throw new Error('biscuit S1 crit block missing — fixture is stale');
  }
  b.target = { kind: 'allies' };
});
/** B6 reference: her burst ATK line removed entirely. */
const biscuitNoAtk = withPatchedOverride('biscuit', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasStat(b, 'atkPct'));
  if (ov.burst.length === before) {
    throw new Error('biscuit burst atkPct block missing — fixture is stale');
  }
});
/** B6 counterfactual (class-axis): the burst ATK targeting ALL allies, not Supporters only. */
const biscuitAlliesAtk = withPatchedOverride('biscuit', (ov) => {
  const b = ov.burst.find((x: any) => hasStat(x, 'atkPct'));
  if (!b) {
    throw new Error('biscuit burst atk block missing — fixture is stale');
  }
  b.target = { kind: 'allies' };
});
/** B2 isolation: S1 heal removed (burst heal kept). */
const biscuitNoS1Heal = withPatchedOverride('biscuit', (ov) =>
  stripHeal(ov, 'skill1')
);
/** B7 isolation: burst heal removed (S1 heal kept). */
const biscuitNoBurstHeal = withPatchedOverride('biscuit', (ov) =>
  stripHeal(ov, 'burst')
);
/** Liter-trap guard: BOTH heals removed. */
const biscuitNoHeals = withPatchedOverride('biscuit', (ov) => {
  stripHeal(ov, 'skill1');
  stripHeal(ov, 'burst');
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = runMain();
const noCrit = runMain({ biscuit: biscuitNoCrit });
const genericCrit = runMain({ biscuit: biscuitGenericCrit });
const alliesCrit = runMain({ biscuit: biscuitAlliesCrit });
const noAtk = runMain({ biscuit: biscuitNoAtk });
const alliesAtk = runMain({ biscuit: biscuitAlliesAtk });

const PROBE = ['liter', 'biscuit', 'asuka', 'ada'];
const asukaBase = runEvents(PROBE);
const asukaNoS1Heal = runEvents(PROBE, { biscuit: biscuitNoS1Heal });
const asukaNoBurstHeal = runEvents(PROBE, { biscuit: biscuitNoBurstHeal });

const GUARD = ['liter', 'crown', 'biscuit', 'asuka', 'ada']; // crown = slot 1
const crownBase = runEvents(GUARD);
const crownNoHeals = runEvents(GUARD, { biscuit: biscuitNoHeals });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');

/** biscuit's own buffApply events for a stat (isolates her line from helm's/liter's same-stat buffs). */
const biscuitBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === BISCUIT && b.stat === stat);

/** Distinct crit rates seen per unit on the given buckets — the normal-vs-skill discriminator. */
function critRatesByUnit(
  evs: SimEvent[],
  buckets: Damage['bucket'][]
): Record<string, string> {
  const out: Record<string, Set<string>> = {};
  for (const d of dmg(evs)) {
    if (!buckets.includes(d.bucket)) {
      continue;
    }
    (out[d.slug] ??= new Set()).add(d.critRate.toFixed(9));
  }
  return Object.fromEntries(
    Object.entries(out).map(([k, v]) => [k, [...v].sort().join(',')])
  );
}

/** The distinct holder slots a set of buffApply events reached, per firing frame. */
function holdersPerFrame(applied: BuffApply[]): Map<number, Set<number>> {
  const perFrame = new Map<number, Set<number>>();
  for (const b of applied) {
    if (b.targetIdx == null) {
      continue;
    }
    (
      perFrame.get(b.frame) ?? perFrame.set(b.frame, new Set()).get(b.frame)!
    ).add(b.targetIdx);
  }
  return perFrame;
}

/** asuka's 'on-recovery → self ATK ▲96.98%' buff count — the Attacker recovery probe observable. */
const asukaRecovery = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) =>
      b.targetSlug === 'asuka' &&
      b.stat === 'atkPct' &&
      Math.abs(b.value - 96.98) < 0.01
  ).length;
/** crown's 'when recovery takes effect → team ATK ▲20.99%' buff count (crown = caster slot 1 in GUARD). */
const crownRecovery = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === 1 &&
      b.stat === 'attackDamagePct' &&
      Math.abs(b.value - 20.99) < 0.01
  ).length;

describe('biscuit — kit spec', () => {
  describe('B1 — S1 crit rate is scoped to NORMAL ATTACKS and to ATTACKER allies', () => {
    const applied = biscuitBuffs(base.events, 'critRateNormalPct');

    it('is 5.77% for 10 sec, fired by biscuit at the end of Full Burst', () => {
      expect(
        applied.length,
        'no biscuit critRateNormalPct buff was applied'
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([5.77]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('reaches ONLY the Attacker allies (ada + helm), never the non-Attackers', () => {
      for (const [, holders] of holdersPerFrame(applied)) {
        expect([...holders].sort(), 'a firing reached a non-Attacker').toEqual([
          ADA,
          HELM,
        ]);
      }
    });

    it('DISCRIMINATING (class): an all-allies target would reach the whole team', () => {
      const generic = biscuitBuffs(alliesCrit.events, 'critRateNormalPct');
      const reached = new Set<number>();
      for (const b of generic) {
        if (b.targetIdx != null) {
          reached.add(b.targetIdx);
        }
      }
      expect(
        reached.size,
        'all-allies counterfactual must reach more than the 2 Attackers'
      ).toBe(TEAM_SIZE);
    });

    it('does NOT lift crit on any skill or burst damage (normal-scoped stat)', () => {
      expect(critRatesByUnit(base.events, ['skill', 'burst'])).toEqual(
        critRatesByUnit(noCrit.events, ['skill', 'burst'])
      );
    });

    it('DOES lift crit on normal attacks (the buff is live, not inert)', () => {
      expect(critRatesByUnit(base.events, ['normal'])).not.toEqual(
        critRatesByUnit(noCrit.events, ['normal'])
      );
    });

    it('DISCRIMINATING (normal-axis): a generic critRatePct would move the skill/burst buckets', () => {
      expect(
        critRatesByUnit(genericCrit.events, ['skill', 'burst'])
      ).not.toEqual(critRatesByUnit(noCrit.events, ['skill', 'burst']));
    });
  });

  describe('B2 — S1 heal-over-time is an ATTACKER-scoped recovery stream', () => {
    it('feeds an Attacker on-recovery consumer (asuka) as a multi-tick HoT, not an instant heal', () => {
      const withHeal = asukaRecovery(asukaBase);
      const without = asukaRecovery(asukaNoS1Heal);
      expect(withHeal, 'asuka received no recovery at all').toBeGreaterThan(
        without
      );
      expect(
        withHeal - without,
        `${withHeal - without} recovery events from the S1 HoT — a single instant heal yields ~1 per FB end`
      ).toBeGreaterThanOrEqual(10);
    });

    it('is the S1 heal, not the burst lifesteal, that feeds the Attacker probe', () => {
      // Removing the BURST heal (Supporter-scoped) must leave asuka's recovery count unchanged.
      expect(asukaRecovery(asukaNoBurstHeal)).toBe(asukaRecovery(asukaBase));
    });
  });

  describe('B6 — burst ATK is scoped to SUPPORTER allies', () => {
    const applied = biscuitBuffs(base.events, 'atkPct').filter(
      (b) => b.value === 43.08
    );

    it("is 43.08% for 10 sec on biscuit's burst cast", () => {
      expect(
        applied.length,
        'no biscuit burst atkPct buff was applied'
      ).toBeGreaterThan(0);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('reaches ONLY the Supporter allies (liter + biscuit herself)', () => {
      for (const [, holders] of holdersPerFrame(applied)) {
        expect([...holders].sort(), 'a firing reached a non-Supporter').toEqual(
          [LITER, BISCUIT]
        );
      }
    });

    it('DISCRIMINATING (class): an all-allies target would reach the whole team', () => {
      const generic = biscuitBuffs(alliesAtk.events, 'atkPct').filter(
        (b) => b.value === 43.08
      );
      const reached = new Set<number>();
      for (const b of generic) {
        if (b.targetIdx != null) {
          reached.add(b.targetIdx);
        }
      }
      expect(
        reached.size,
        'all-allies counterfactual must reach more than the 2 Supporters'
      ).toBe(TEAM_SIZE);
    });

    it("is live: removing it drops biscuit's and liter's total damage", () => {
      expect(base.totals.biscuit).not.toEqual(noAtk.totals.biscuit);
      expect(base.totals.liter).not.toEqual(noAtk.totals.liter);
    });
  });

  describe('B7 — burst lifesteal is a SUPPORTER-scoped recovery stream (not Attacker, not Defender)', () => {
    it('does NOT feed the Attacker probe (asuka) — it is Supporter-scoped', () => {
      // The mirror of B2: the burst heal removed, asuka's recovery count is unchanged, so the burst
      // lifesteal is not an Attacker recovery source. (No Supporter on-recovery consumer exists in
      // the roster, so the positive Supporter channel is faithfully encoded but presently inert.)
      expect(asukaRecovery(asukaNoBurstHeal)).toBe(asukaRecovery(asukaBase));
    });
  });

  describe('liter-trap guard — neither heal feeds a DEFENDER recovery consumer', () => {
    it("crown's recovery buff count is identical with biscuit's heals present vs removed", () => {
      // biscuit contributes ZERO recovery to crown (a Defender): her heals are class-scoped away
      // from Defenders. A genuine all-allies healer (helm) feeds crown hundreds of times in the
      // control comp, so crown's consumer is live — biscuit's scoped heals simply don't reach it.
      expect(crownRecovery(crownBase)).toBe(crownRecovery(crownNoHeals));
    });
  });
});
