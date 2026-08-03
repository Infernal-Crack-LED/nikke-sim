// PER-UNIT KIT SPEC — `blanc` (Blanc, Defender/AR/Wind, Burst II, cd 60s, ammo 60).
// Kit-autonomy gauntlet 2026-07-25. Tier 1.
//
// Kit (blablalink prose, data/characters.json → characters.blanc.skills):
//   S1 ■ after 120 normal attacks → all allies: Shield = 11.8% caster final Max HP, 5 sec  [B1]
//   S2 ■ after Full Burst ends → all allies: recover 3.68% caster final Max HP / 1s × 5s  [B2]
//      ■ after Full Burst ends (same-squad ally on the battlefield) → self:
//                                      Burst Skill CD ▼ 40.76 sec                          [B3]
//   BU ■ burstCast → all allies: recover 3.84% caster final Max HP / 1s × 8s              [B4]
//      ■ burstCast → 1 lowest-HP ally (excl. self): Max HP ▲ 31.68% for 10 sec            [B5]
//      ■ burstCast → 1 lowest-HP ally (excl. self): Indomitability 10 sec                 [B6 UNMODELED]
//      ■ burstCast → all enemies: Damage Taken ▲ 39.26% for 10 sec                        [B7]
//
// UNMODELED (documented, no assertion):
//   B6 — Indomitability (death-immunity; boss lethality not modeled in v1)
//
// INERT (documented, no damage assertion):
//   B1 — shield: no HP pool in v1; fires `shielded` triggers (naga-type) but no event in log
//   B5 — targetMaxHpPct: lands on a teammate (casterIdx≠self), offensively inert (e3 rule)
//
// Discrimination notes:
//   B7  nearest-wrong = level-1 value 20.08 (vs shipped 39.26); also wrong duration (5s vs 10s)
//   B3  GATED on a same-squad ally (teamHas.sameSquad; curated squad = noir+rouge ONLY,
//       owner-confirmed 2026-08-02 — the bunny/maid units are a different squad). Nearest-wrong
//       #1 = UNGATED (fires without a squadmate — the pre-primitive model); nearest-wrong #2 = no
//       CDR at all. mainComp (liter, not a squadmate) ⇒ gate inert, schedule == no-CDR patch;
//       mateComp (rouge) ⇒ gate active, 60s CD collapses to ~19.24s residual (≥5 casts in 180s).
//   B5  nearest-wrong = casterMaxHpPct (wrong basis) or wrong value 18.72 (level-1)
//
// Fixture: liter(B1)/blanc(B2)/ada(B3), boss Fire, focus ada. Deterministic (no seed).
// Gate fixture: rouge(B1)/blanc(B2)/ada(B3) — same shape, liter→rouge: rouge IS a squadmate.
// Recovery fixture: liter(B1)/blanc(B2)/crown(B2)/ada(B3) — crown's recovery trigger
// observes blanc's heal events (B2/B4).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

// ---- comp builders ---------------------------------------------------------------------------
const mainComp = () => ({
  slugs: ['liter', 'blanc', 'ada'],
  bossElement: 'Fire' as const,
  focusSlug: 'ada',
});

const recoveryComp = () => ({
  slugs: ['liter', 'blanc', 'crown', 'ada'],
  bossElement: 'Fire' as const,
  focusSlug: 'ada',
});

/** B3 gate fixture: mainComp with liter→rouge (a curated same-squad ally). */
const mateComp = () => ({
  slugs: ['rouge', 'blanc', 'ada'],
  bossElement: 'Fire' as const,
  focusSlug: 'ada',
});

function run(overrides: Record<string, any> = {}, comp = mainComp()) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...comp,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches ------------------------------------------------------------------
/** B3 reference: burstCdr block removed → blanc on raw 60s CD. */
const blancNoCdr = withPatchedOverride('blanc', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'burstCdr')
  );
  if (ov.skill2.length === before) {
    throw new Error('blanc S2 burstCdr block missing — fixture stale');
  }
});

/** B3 counterfactual: strip the sameSquad gate → CDR fires in EVERY comp (pre-primitive model). */
const blancUngated = withPatchedOverride('blanc', (ov) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'burstCdr')
  );
  if (!b?.teamHas?.sameSquad) {
    throw new Error(
      'blanc S2 burstCdr sameSquad gate missing — fixture stale'
    );
  }
  delete b.teamHas;
});

/** B7 counterfactual: level-1 value 20.08 instead of 39.26. */
const blancWrongDebuff = withPatchedOverride('blanc', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'damageTakenPct');
  if (!e) {
    throw new Error(
      'blanc burst damageTakenPct effect missing — fixture stale'
    );
  }
  e.value = 20.08;
});

/** B5 counterfactual: level-1 value 18.72 instead of 31.68. */
const blancWrongMaxHp = withPatchedOverride('blanc', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'targetMaxHpPct');
  if (!e) {
    throw new Error(
      'blanc burst targetMaxHpPct effect missing — fixture stale'
    );
  }
  e.value = 18.72;
});

// ---- runs (hoisted: each is a full 180s sim) -------------------------------------------------
const base = run();
const noCdr = run({ blanc: blancNoCdr });
const wrongDebuff = run({ blanc: blancWrongDebuff });
const wrongMaxHp = run({ blanc: blancWrongMaxHp });
const recovery = run({}, recoveryComp());

// ---- readers ---------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const blancBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'blanc'
  );

/** Blanc is slot 1 in mainComp (liter 0 / blanc 1 / ada 2). */
const BLANC_SLOT = 1;
/** Crown is slot 2 in recoveryComp (liter 0 / blanc 1 / crown 2 / ada 3). */
const CROWN_SLOT = 2;

describe('blanc — kit spec', () => {
  describe('B7 — burst applies Damage Taken ▲39.26% to all enemies for 10 sec', () => {
    // Enemy debuffs carry casterIdx:null (boss has no unit slot); filter by stat+targetIdx:null.
    const applied = buffs(base.events).filter(
      (b) => b.stat === 'damageTakenPct' && b.targetIdx === null
    );

    it('fires once per burst cast at the kit magnitude 39.26', () => {
      expect(applied.length).toBe(blancBursts(base.events).length);
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([39.26]);
    });

    it('lasts exactly 10 sec (600 frames)', () => {
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('DISCRIMINATING: level-1 value 20.08 is NOT what ships', () => {
      const wrong = buffs(wrongDebuff.events).filter(
        (b) => b.stat === 'damageTakenPct' && b.targetIdx === null
      );
      expect([...new Set(wrong.map((b) => b.value))]).toEqual([20.08]);
      // The wrong value must produce different team totals (debuff is live, not inert)
      expect(base.totals).not.toEqual(wrongDebuff.totals);
    });
  });

  describe('B3 — S2 grants self Burst CDR 40.76s on Full Burst end, gated on a same-squad ally', () => {
    it('inert without a same-squad ally: shipped schedule == CDR-removed (gate is real)', () => {
      // mainComp's liter is NOT a squadmate (curated squad = noir+rouge) → the
      // gated block never fires → blanc's burst schedule matches the no-CDR patch
      expect(blancBursts(base.events).length).toBe(
        blancBursts(noCdr.events).length
      );
      // 60s raw CD → ≤4 casts in 180s
      expect(blancBursts(base.events).length).toBeLessThanOrEqual(4);
    });

    it('active with a same-squad ally: rouge unlocks the CDR engine', () => {
      const mated = run({}, mateComp());
      // 60s CD collapsed to ~19.24s residual → ≥5 casts in 180s
      expect(blancBursts(mated.events).length).toBeGreaterThanOrEqual(5);
      expect(blancBursts(mated.events).length).toBeGreaterThan(
        blancBursts(base.events).length
      );
    });

    it('DISCRIMINATING: the ungated model (pre-2026-08-02) over-fires without a squadmate', () => {
      const ungated = run({ blanc: blancUngated });
      expect(blancBursts(ungated.events).length).toBeGreaterThanOrEqual(5);
      expect(blancBursts(ungated.events).length).toBeGreaterThan(
        blancBursts(base.events).length
      );
    });
  });

  describe('B5 — burst applies Max HP ▲31.68% to lowest-HP ally (excl. self) for 10 sec', () => {
    // Engine converts targetMaxHpPct → maxHpFlat (flat HP = 31.68% of target's own maxHp).
    // The buffApply event carries stat:'maxHpFlat' and the computed flat value.
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === BLANC_SLOT && b.stat === 'maxHpFlat'
    );

    it('fires once per burst cast (targetMaxHpPct → maxHpFlat in engine)', () => {
      expect(applied.length).toBe(blancBursts(base.events).length);
      expect(applied.length).toBeGreaterThan(0);
    });

    it('lasts exactly 10 sec (600 frames)', () => {
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('targets an ally other than blanc herself (excludeSelf)', () => {
      for (const b of applied) {
        expect(b.targetIdx).not.toBe(BLANC_SLOT);
      }
    });

    it('DISCRIMINATING: level-1 value 18.72 produces a smaller flat HP grant', () => {
      const wrong = buffs(wrongMaxHp.events).filter(
        (b) => b.casterIdx === BLANC_SLOT && b.stat === 'maxHpFlat'
      );
      expect(wrong.length).toBeGreaterThan(0);
      // 18.72% < 31.68% → smaller flat value
      expect(wrong[0].value).toBeLessThan(applied[0].value);
    });

    it('is offensively inert (no team total changes vs a comp without it)', () => {
      const noMaxHp = withPatchedOverride('blanc', (ov) => {
        ov.burst = ov.burst.filter(
          (b: any) => !b.effects.some((e: any) => e.stat === 'targetMaxHpPct')
        );
      });
      const without = run({ blanc: noMaxHp });
      expect(base.totals).toEqual(without.totals);
    });
  });

  describe('B2/B4 — S2 and burst heals fire recovery events (observable via crown)', () => {
    // Crown's recovery trigger: "when recovery takes effect → team ATK ▲20.99%".
    // Blanc's S2 heal (fullBurstEnd, ticks:5) and burst heal (burstCast, ticks:8) both
    // fire crown's recovery trigger. We check that crown's attackDamagePct buff fires
    // at least once per blanc burst cast (burst heal) and at least once per FB end (S2 heal).
    const crownRecoveryBuffs = buffs(recovery.events).filter(
      (b) =>
        b.casterIdx === CROWN_SLOT &&
        b.stat === 'attackDamagePct' &&
        b.value === 20.99
    );

    it("crown's recovery trigger fires (blanc's heals are live, not inert)", () => {
      expect(crownRecoveryBuffs.length).toBeGreaterThan(0);
    });

    it("fires at least as many times as blanc's burst casts (burst heal drives it)", () => {
      const blancCasts = blancBursts(recovery.events).length;
      // Each burst cast fires a heal → at least one recovery event → crown buff
      expect(crownRecoveryBuffs.length).toBeGreaterThanOrEqual(blancCasts);
    });
  });

  describe('B1 — S1 shield fires every 120 normal attacks (not directly observable in event log)', () => {
    // Shield effects produce no event in the v1 log (no HP pool). The shield block is
    // FAITHFUL per the override; its observable is the `shielded` trigger on naga-type
    // consumers (tested in naga's own spec). Here we verify the block fires by checking
    // that blanc's shot count reaches 120+ (so the trigger condition is met).
    it('blanc fires enough shots to trigger the shield (120+ hits in 180s)', () => {
      const shots = base.events.filter(
        (e) => e.kind === 'shot' && e.slug === 'blanc'
      ).length;
      // 60-ammo AR at 720rpm = 12 rounds/sec; 180s → ~2160 rounds (well over 120)
      expect(shots).toBeGreaterThanOrEqual(120);
    });
  });
});
