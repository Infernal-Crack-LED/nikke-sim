// PER-UNIT KIT SPEC — `rouge` (Rouge), Supporter/SR/Electric, Burst I, cd 20s, ammo 6, chargeFrames
// 60. kit-autonomy gauntlet 2026-07-25 (driver). Tier 2: positional selfAndAdjacent buff + burstCast
// team ATK + coin-state status gates (absorbed — see UNMODELED).
//
// ⚠ EXACT SLUG `rouge` — the SR/Supporter/Electric/Burst-I coin support. There is no other "rouge"
//   variant; never conflate with a similarly-named unit.
//
// Her kit is a COIN-STATE support: Sword Coin → Shield Coin (30 Full Charges) → Double Sword Coin
// (5 bursts in Shield Coin). The state machine is NOT tracked as engine state; its OFFENSIVE payload
// is exactly ONE permanent line (Sword Coin Attack Damage ▲6.65%) plus the burst's ATK grant. Every
// other line is a Max-HP grant or a Damage-Taken reduction.
//
// HP-SCALING DETERMINATION = OFFENSIVELY INERT. Every "Max HP ▲ X% of the skill user's Max HP" line
// is a `casterMaxHpPct` ally grant. Ally-granted Max HP does NOT feed a consumer's ATK=%-of-Max-HP
// conversion — the conversion counts the consumer's OWN Max HP only (MEASURED: cinderella focus
// video; SSOT docs/data/damage-calculation.md:106-107; engine enforces it via effectiveAtk
// casterIdx===self, src/engine/sim.ts:377). Rouge has no atkOfMaxHpPct line of her own, so even her
// self-grants feed nothing. The engine has no HP pool, so the grants move no damage at all. They are
// therefore documented VERBATIM in the override's `unmodeled` with NO assertion here (inert). The
// 2026-07-13 "Max-HP grants are OFFENSIVE for Cinderella" reading was REFUTED 2026-07-17 (e3 video).
//
// Kit (blablalink prose, data/characters.json → characters.rouge.skills, level 10):
//   S1 ■ attacking with Full Charge ×8 → all allies: Cooldown of Burst Skill ▼7 sec            [R3]
//      ■ (same trigger) all allies: Max HP ▲5% of caster Max HP, no restore, 5 sec   (INERT)   [—]
//   S2 ■ back row, self + 2 allies each side: Sword Coin Attack Damage ▲6.65% continuously     [R1]
//      ■ Full Charge ×30 in Sword Coin: Shield Coin Damage Taken ▼15.2% continuously (defensive)[—]
//      ■ Burst ×5 in Shield Coin: Double Sword Coin Max HP ▲15.08% continuously (INERT)        [—]
//   BU ■ all allies: ATK ▲15.07% of caster ATK for 10 sec                                      [R2]
//      ■ Sword/Shield/Double Sword Coin: Max HP ▲10.15/20.1/30.02% of caster, 10s (INERT)      [—]
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   R1  the Sword Coin Attack Damage buff is POSITIONAL ("self and 2 allies on both sides" =
//       selfAndAdjacent sides:2), NOT all allies. With rouge in slot 0 of a 4-slot comp the buff
//       reaches slots {0,1,2} and must NOT reach slot 3 — a generic all-allies encoding reaches all
//       4, so the held-target count is the discriminator. PIN value 6.65 (level-10), continuous.
//   R2  casterAtkPct surfaces as a FLAT ATK grant (15.07% × caster staticAtk), NOT the raw 15.07 —
//       discriminated by LINEAR SCALING: doubling the override magnitude (15.07→30.14) exactly
//       doubles the applied value, proving 15.07 is operative. burstCast-triggered, all 4 allies,
//       10s window.
//   R3  burstCdr emits no per-buff number to read directly, so it is pinned by its EFFECT on
//       cadence: with the line removed, rouge (and the team) fit FEWER casts into 180s (the 20s CD
//       is no longer shaved by 7s every 8 full charges).
//
// Fixture: rouge as the SOLE Burst I (rouge B1 / crown B2 / ada B3 / helm B3, boss Fire, focus ada)
// so the B1→B2→B3 chain runs and rouge casts. Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const WINDOW = 10 * FPS; // 10 sec buff windows

/** Comp slot order: rouge 0 / crown 1 / ada 2 / helm 3. */
const COMP = ['rouge', 'crown', 'ada', 'helm'] as const;
const ROUGE = 0;
const CARRY = 'ada';

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [...COMP],
    bossElement: 'Fire',
    focusSlug: CARRY,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches (nearest-wrong model each PIN must discriminate against) ----------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** R1 reference: the Sword Coin Attack Damage block removed entirely. */
const noSwordCoin = withPatchedOverride('rouge', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'attackDamagePct'));
  if (ov.skill2.length === before) {
    throw new Error('rouge S2 attackDamagePct block missing — fixture stale');
  }
});
/** R1 counterfactual: the same buff as a GENERIC all-allies buff (loses the positional scope). */
const allAlliesSword = withPatchedOverride('rouge', (ov) => {
  const b = ov.skill2.find((x: any) => hasStat(x, 'attackDamagePct'));
  if (!b) {
    throw new Error('rouge S2 attackDamagePct block missing — fixture stale');
  }
  b.target = { kind: 'allies' };
});
/** R2 reference: the burst caster-ATK block removed entirely. */
const noBurstAtk = withPatchedOverride('rouge', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasStat(b, 'casterAtkPct'));
  if (ov.burst.length === before) {
    throw new Error('rouge burst casterAtkPct block missing — fixture stale');
  }
});
/** R2 counterfactual: double the burst caster-ATK magnitude (15.07 → 30.14). */
const doubleBurstAtk = withPatchedOverride('rouge', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'casterAtkPct');
  if (!e || e.value !== 15.07) {
    throw new Error('rouge burst casterAtkPct 15.07 missing — fixture stale');
  }
  e.value = 30.14;
});
/** R3 reference: the S1 team burst-CDR block removed entirely. */
const noCdr = withPatchedOverride('rouge', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'burstCdr')
  );
  if (ov.skill1.length === before) {
    throw new Error('rouge S1 burstCdr block missing — fixture stale');
  }
});
/** INERT proof: strip EVERY inert stat (casterMaxHpPct grants + the Shield Coin Damage-Taken
 *  reduction) from all three slots. These are the ally-granted Max HP lines + the defensive
 *  Damage-Taken ▼ — all offensively inert (ally Max HP feeds no atkOfMaxHpPct; v1 boss deals no
 *  damage). Removing them must move NO unit's total by a single point. */
const noInert = withPatchedOverride('rouge', (ov) => {
  const inert = new Set(['casterMaxHpPct', 'damageTakenPct']);
  let stripped = 0;
  for (const slot of ['skill1', 'skill2', 'burst'] as const) {
    for (const b of ov[slot] ?? []) {
      const before = b.effects.length;
      b.effects = b.effects.filter((e: any) => !inert.has(e.stat));
      stripped += before - b.effects.length;
    }
    ov[slot] = (ov[slot] ?? []).filter((b: any) => b.effects.length > 0);
  }
  if (stripped === 0) {
    throw new Error('rouge inert grants missing — fixture stale');
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noSword = run({ rouge: noSwordCoin });
const allAllies = run({ rouge: allAlliesSword });
const noBurst = run({ rouge: noBurstAtk });
const dblBurst = run({ rouge: doubleBurstAtk });
const noCdrRun = run({ rouge: noCdr });
const inertRun = run({ rouge: noInert });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const rougeBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'rouge'
  );
/** rouge-caster buffApply events for a given stat. */
const rougeBuff = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === ROUGE && b.stat === stat);

describe('rouge (Rouge) — kit spec [Tier 2, coin-state support]', () => {
  it('fixture sanity: rouge casts her burst in the control rotation', () => {
    expect(rougeBursts(base.events).length).toBeGreaterThan(0);
  });

  describe('R1 — S2 Sword Coin: Attack Damage ▲6.65%, POSITIONAL (self + 2 each side), continuous', () => {
    const applied = rougeBuff(base.events, 'attackDamagePct');

    it('is exactly 6.65% with no wall-clock expiry (continuous)', () => {
      expect(
        applied.length,
        'no Sword Coin attackDamagePct applied'
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([6.65]);
      expect(
        [...new Set(applied.map((b) => b.expiresFrame))],
        'continuous'
      ).toEqual([null]);
    });

    it('reaches the POSITIONAL targets {0,1,2} and NOT the far slot 3', () => {
      const targets = new Set(applied.map((b) => b.targetIdx));
      // rouge in slot 0, selfAndAdjacent sides:2 → |idx-0|<=2 → {0,1,2}.
      expect(targets).toEqual(new Set([0, 1, 2]));
      expect(targets.has(3), 'slot 3 (helm) is out of positional range').toBe(
        false
      );
    });

    it('DISCRIMINATING: a generic all-allies encoding would also reach slot 3', () => {
      const targets = new Set(
        rougeBuff(allAllies.events, 'attackDamagePct').map((b) => b.targetIdx)
      );
      expect(targets.size, 'all-allies reaches all 4').toBe(4);
      expect(targets.has(3)).toBe(true);
    });

    it('is LIVE: removing it drops the carried adjacent ally (ada, slot 2) damage', () => {
      expect(base.totals[CARRY]).toBeGreaterThan(noSword.totals[CARRY]);
    });

    it('DISCRIMINATING: the buff is absent when the block is removed', () => {
      expect(rougeBuff(noSword.events, 'attackDamagePct').length).toBe(0);
    });
  });

  describe('R2 — Burst: ATK ▲15.07% of caster ATK, all allies, 10s (burstCast)', () => {
    const applied = rougeBuff(base.events, 'casterAtkPct');

    it('surfaces as a FLAT ATK grant from rouge, on all 4 allies, for 10 sec, once per cast', () => {
      expect(applied.length, 'no burst casterAtkPct applied').toBeGreaterThan(
        0
      );
      expect(applied.length).toBe(rougeBursts(base.events).length * 4); // all 4 allies per cast
      expect(new Set(applied.map((b) => b.targetIdx)).size).toBe(4);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(WINDOW);
      }
      const vals = [...new Set(applied.map((b) => b.value))];
      expect(vals.length).toBe(1);
      // FLAT-resolved: value = 0.1507 × rouge.staticAtk, so it is far larger than the raw 15.07.
      // A plain atkPct encoding would emit exactly 15.07 — this bound discriminates caster-scaling
      // on its own (the linear-scaling arm below is also green under atkPct; S5 judge spot-check).
      expect(vals[0]).toBeGreaterThan(15.07);
    });

    it('DISCRIMINATING: the magnitude scales linearly with the kit value (15.07 is operative)', () => {
      const baseVal = applied[0].value;
      const dblVal = rougeBuff(dblBurst.events, 'casterAtkPct')[0]?.value;
      expect(
        dblVal,
        'doubled override produced no casterAtkPct buff'
      ).toBeDefined();
      expect(dblVal! / baseVal).toBeCloseTo(2, 5);
    });

    it('is LIVE: removing it drops the carried ally (ada) damage', () => {
      expect(base.totals[CARRY]).toBeGreaterThan(noBurst.totals[CARRY]);
    });

    it('DISCRIMINATING: the buff is absent when the block is removed', () => {
      expect(rougeBuff(noBurst.events, 'casterAtkPct').length).toBe(0);
    });
  });

  describe('R3 — S1: team Burst CDR ▼7s every 8 Full Charges (all allies)', () => {
    // burstCdr shortens allies' burst cooldowns; it emits no per-buff number to read directly, so it
    // is pinned by its EFFECT on cadence: with the line removed, rouge fits FEWER casts into 180s
    // (her 20s CD is no longer shaved by 7s every 8 full charges).
    it('removing the CDR strictly reduces her cast count over the fight', () => {
      const baseBursts = rougeBursts(base.events).length;
      const noCdrBursts = rougeBursts(noCdrRun.events).length;
      expect(baseBursts).toBeGreaterThan(0);
      expect(
        noCdrBursts,
        'CDR must let her cast more often than the raw 20s CD'
      ).toBeLessThan(baseBursts);
    });
  });

  describe('INERT — Max-HP grants (casterMaxHpPct) + Shield Coin Damage-Taken ▼ move no damage', () => {
    // S1 "Max HP ▲5% / 5s", S2 Double Sword "Max HP ▲15.08%", the burst coin-tier Max-HP grants
    // (10.15/20.1/30.02%) and the Shield Coin "Damage Taken ▼15.2%" are encoded for kit-completeness
    // (cross-family consensus) but are OFFENSIVELY INERT: ally-granted Max HP does NOT feed a
    // consumer's atkOfMaxHpPct conversion (SSOT damage-calculation.md:106; engine casterIdx===self),
    // the engine has no HP pool, and the v1 boss deals no damage. The proof is byte-identical totals
    // with every inert stat stripped.
    it('the inert grants ARE encoded (rouge emits maxHpFlat + a negative ally damageTakenPct)', () => {
      const maxHp = buffs(base.events).filter(
        (b) => b.casterIdx === ROUGE && b.stat === 'maxHpFlat'
      );
      expect(
        maxHp.length,
        'no casterMaxHpPct grant resolved to maxHpFlat'
      ).toBeGreaterThan(0);
      expect(
        new Set(maxHp.map((b) => b.targetIdx)).size,
        'reaches allies'
      ).toBeGreaterThan(1);
      const taken = buffs(base.events).filter(
        (b) => b.casterIdx === ROUGE && b.stat === 'damageTakenPct'
      );
      expect(taken.length, 'no Shield Coin damageTakenPct').toBeGreaterThan(0);
      for (const b of taken) {
        expect(b.value).toBe(-15.2);
      } // a reduction, never a positive boss amp
    });

    it("PROOF: stripping every inert stat moves NO unit's total by a single point", () => {
      expect(inertRun.totals).toEqual(base.totals);
    });
  });
});
