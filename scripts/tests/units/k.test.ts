// PER-UNIT KIT SPEC — `k` (K, Attacker/SMG/Electric, Burst III, cd 40s, ammo 120, hitsPerShot 2,
// normalMult 9.1). Kit-autonomy gauntlet 2026-08-02 (driver Qwen). FRESH unit — no prior override;
// the engine does not parse prose at runtime, so src/skills/overrides/k.json IS the encoding under
// test. Every load-bearing line is pinned GREEN vs the shipped override and RED vs its nearest-wrong
// counterfactual (via withPatchedOverride) — a test that cannot fail under the nearest wrong model
// gates nothing.
//
// Kit (blablalink prose, data/characters.json → characters.k.skills):
//   S1 ■ firing the last bullet → self: Tilted Scale, Critical Rate ▲0.75% continuously, stacks   [K4]
//        up to 100 times; Tilted Scale stacks ▲29  (⇒ +21.75% crit per last bullet, cap +75%)
//      ■ pellets land a critical hit 4 times → target: 23.9% of final ATK additional damage       [K7] (UNMODELED)
//      ■ Full Burst ends → self: Removes Tilted Scale                                             [K4] (folded)
//   S2 ■ gaining Tilted Scale → all allies: Max ammunition capacity ▼51.13% for 10s (no stack)    [K6]
//      ■ (same) → all allies: Attack damage ▲10.62% for 10s                                       [K5]
//      ■ Full Burst ends → all allies: Removes Fulfillment of Righteousness                       [K5/K6] (moot)
//   BU ■ self: change weapon — Damage 92.5% of final ATK, Pelletcount 10, Attack speed ▼90%, 10s  [K1]
//      ■ self: ATK ▲63.36% of the skill user's ATK for 10s                                        [K2]
//      ■ self: Attack damage ▲21.12% for 10s                                                      [K3]
//
// Why each assertion discriminates:
//   K1  the burst weapon is the DOMINANT damage — a REAL 10-pellet SG-class weapon swap (weapon:'SG',
//       pelletCount 10), routed through the same accuracy-circle pellet-landing model and near-band-only
//       range eligibility every genuine SG unit gets (sim.ts effectivePellets/bandSg, gated on
//       u.swap.weapon === 'SG'). damagePct 92.5 is the FULL-SHOT total (all 10 pellets landing) — the
//       same convention every SG unit's normalAttackMultiplier uses in this engine — so per-pull atkPct
//       varies BY RANGE BAND (this fixture: 56.1/60.8/65.9/75.2 across its four bands) rather than
//       sitting at one flat value; a landing-model bypass would read a flat 92.5 instead. Proven three
//       ways: removing the swap zeroes the burst-window damage; the pre-fix buggy magnitude (925, a 10x
//       per-pellet misread of the kit's "Damage 92.5%, Pelletcount 10" line) reads roughly 10× higher;
//       and dropping the weapon:'SG' declaration collapses the per-band spread to a flat 92.5 (proving
//       the landing routing — not just the magnitude — is load-bearing). Cadence pinned at pullsPerSec
//       2.4 = the swap weapon's own nominal 144 RPM (10% of the base SMG's datamined 1440 RPM, per the
//       kit's ▼90% applied to the NOMINAL rate), frame-quantized via the engine's existing
//       quantizeToFrames (an exact 25-frame interval, no rounding) — not 20.0/s (the base SMG's own
//       already-quantized effective rate) × 0.10, which undercounts by 20%.
//   K2/K3  the burst's ATK (casterAtkPct 63.36) and Attack Damage (21.12) self-buffs amplify the swap
//       window; removing them drops K's total (they are live, not inert).
//   K4  Tilted Scale's literal stack ramp (+29/trigger, cap 100, wiped on FB end) has NO engine
//       primitive (+1 stack/trigger only, sim.ts:1922; no FB-end removal). The LOAD-BEARING observable
//       — her crit rate DURING the burst window — is encoded as burstCast self critRatePct 75% for 10s
//       (steady-state cap = 100×0.75 = 75%, reached well before each cast). Pinned by the burst-window
//       crit rate reading 0.90 (0.15 base + 0.75); the "didn't reach the cap" counterfactual (21.75,
//       one trigger's worth) reads 0.3675, and removing the line reads 0.15 throughout.
//   K5/K6  S2's trigger is 'when gaining Tilted Scale'; Tilted Scale is ONLY gained on the last bullet,
//       so lastBullet is an EXACT proxy. Pinned at the last-bullet cadence (≫ burst count) reaching all
//       allies for 10s; the ▼51.13% max-ammo cost is the kit's stated downside, modeled faithfully.
//   K7  S1c (every-4-CRITS rider) is deliberately UNMODELED — no crit-gated hit counter (hitCount counts
//       all hits) and the pellet-collapse distorts the per-pellet basis. Pinned as ABSENT: all of K's
//       damage is normal-bucket (no skill/burst rider), so a regression that adds a hitCount rider shows up.
//
// Fixture: liter (B1) / crown (B2) / k (B3, sole), boss Fire, focus k — K needs a real rotation to cast
// her burst at all (a lone B3 makes zero Full Bursts). Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const K = 2; // slot order: liter 0 / crown 1 / k 2

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

const comp = () => ({
  slugs: ['liter', 'crown', 'k'],
  bossElement: 'Fire' as const,
  focusSlug: 'k',
});

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...comp(),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches (nearest-wrong model each line must beat) -------------------------
const hasKind = (b: any, kind: string) =>
  b.effects.some((e: any) => e.kind === kind);
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** K1 reference: the burst weapon swap removed entirely. */
const kNoSwap = withPatchedOverride('k', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasKind(b, 'weaponSwap'));
  if (ov.burst.length === before) {
    throw new Error('k burst weaponSwap block missing — fixture is stale');
  }
});
/** K1 counterfactual: the pre-fix buggy magnitude (925) — a 10x per-pellet misread of the kit's
 *  "Damage 92.5% of final ATK, Pelletcount 10" line. */
const kOldBuggySwap = withPatchedOverride('k', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'weaponSwap');
  if (!e) {
    throw new Error('k weaponSwap effect missing — fixture is stale');
  }
  e.damagePct = 925;
});
/** K1 counterfactual: the swap's weapon:'SG' declaration dropped — bypasses the SG pellet-landing
 *  model entirely (falls back to the engine's default 100%-landing swap path), so atkPct should
 *  collapse to a flat 92.5 instead of varying by range band. */
const kNoSgRouting = withPatchedOverride('k', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'weaponSwap');
  if (!e) {
    throw new Error('k weaponSwap effect missing — fixture is stale');
  }
  delete e.weapon;
});
/** K2/K3 reference: the burst's ATK + Attack Damage self-buffs removed. */
const kNoBurstBuffs = withPatchedOverride('k', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !(hasStat(b, 'casterAtkPct') || hasStat(b, 'attackDamagePct'))
  );
  if (ov.burst.length === before) {
    throw new Error('k burst buff blocks missing — fixture is stale');
  }
});
/** K4 reference: Tilted Scale crit rate removed. */
const kNoTilted = withPatchedOverride('k', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'critRatePct'));
  if (ov.skill1.length === before) {
    throw new Error('k skill1 critRatePct block missing — fixture is stale');
  }
});
/** K4 counterfactual: no addStack — only +1 stack per last bullet, so Tilted Scale ramps slowly. */
const kWeakTilted = withPatchedOverride('k', (ov) => {
  const blk = ov.skill1.find((b: any) =>
    b.effects.some((e: any) => e.kind === 'addStack')
  );
  if (!blk) {
    throw new Error('k addStack block missing — fixture is stale');
  }
  blk.effects = blk.effects.filter((e: any) => e.kind !== 'addStack');
});
/** K5/K6 reference: S2 (Fulfillment of Righteousness) removed. */
const kNoS2 = withPatchedOverride('k', (ov) => {
  if (!ov.skill2.length) {
    throw new Error('k skill2 blocks missing — fixture is stale');
  }
  ov.skill2 = [];
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noSwap = run({ k: kNoSwap });
const oldBuggySwap = run({ k: kOldBuggySwap });
const noSgRouting = run({ k: kNoSgRouting });
const noBurstBuffs = run({ k: kNoBurstBuffs });
const noTilted = run({ k: kNoTilted });
const weakTilted = run({ k: kWeakTilted });
const noS2 = run({ k: kNoS2 });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const kDamage = (evs: SimEvent[]) => dmg(evs).filter((d) => d.slug === 'k');
/** The SG-swap shots: normal-bucket hits well above the 9.1% base SMG multiplier — per-pull atkPct
 *  is 92.5% × landing fraction, which varies by range band (this fixture: 56.1-75.2) but never drops
 *  anywhere near the 9.1 base. Threshold 50 cleanly separates base (9.1) from swap (56.1-75.2). */
const kSwapHits = (evs: SimEvent[]) =>
  kDamage(evs).filter((d) => d.bucket === 'normal' && d.atkPct > 50);
const kBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'k');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const kBuff = (evs: SimEvent[], stat: string, value?: number) =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === K &&
      b.stat === stat &&
      (value === undefined || b.value === value)
  );

describe('k — kit spec', () => {
  describe('K1 — burst swaps to a real 10-pellet SG shotgun (92.5% total, landing-modeled) at 2.4 pulls/s', () => {
    it('fires a per-pull hit in the normal bucket, atkPct varying by range band (never a flat 92.5)', () => {
      const hits = kSwapHits(base.events);
      expect(hits.length, 'no swap-window damage was dealt').toBeGreaterThan(0);
      expect([...new Set(hits.map((d) => d.bucket))]).toEqual(['normal']);
      const values = [
        ...new Set(hits.map((d) => Number(d.atkPct.toFixed(3)))),
      ].sort((a, b) => a - b);
      // This fixture's four range bands land 92.5% × {0.606, 0.657, 0.712, 0.813} of the shot.
      expect(values).toEqual([56.123, 60.753, 65.905, 75.234]);
      for (const v of values) {
        expect(v).toBeLessThan(92.5);
      } // landing loss, never 100%
    });

    it('runs at ~2.4 pulls/s (144 RPM, frame-quantized) for 10s per burst window', () => {
      const hits = kSwapHits(base.events);
      const bursts = kBursts(base.events);
      expect(bursts.length).toBeGreaterThan(0);
      // ~24 pulls per 10s window; allow frame-quantization + fight-end/boss-transition truncation slack.
      expect(
        hits.length,
        `${hits.length} swap hits over ${bursts.length} bursts — expected ~24/window`
      ).toBeGreaterThanOrEqual(bursts.length * 18);
    });

    it('DISCRIMINATING: removing the swap zeroes swap-bucket damage and is a modest net loss', () => {
      expect(kSwapHits(noSwap.events).length).toBe(0);
      // The swap's self ATK/Attack-Damage buffs apply regardless of which weapon fires (a separate
      // burstCast block), so this isolates the weapon choice alone: continuous buffed SMG fire loses
      // ~2.15s/10s to reload downtime (ammo 120 @ 20/s), while the swap's landing-derated 92.5% total
      // (56-75% effective per pull at this fixture's bands) still nets ahead — a real but MODEST margin
      // (~11% on this fixture), not the ~10x the pre-fix 925 misread implied.
      expect(base.totals.k).toBeGreaterThan(noSwap.totals.k);
      expect(base.totals.k).toBeLessThan(noSwap.totals.k * 1.5);
    });

    it('DISCRIMINATING: the pre-fix buggy magnitude (925, a 10x per-pellet misread) reads ~10x higher', () => {
      const buggy = kSwapHits(oldBuggySwap.events);
      const values = [
        ...new Set(buggy.map((d) => Number(d.atkPct.toFixed(3)))),
      ];
      for (const v of values) {
        expect(v).toBeGreaterThan(500);
      }
      expect(oldBuggySwap.totals.k).toBeGreaterThan(base.totals.k * 5);
    });

    it("DISCRIMINATING: dropping weapon:'SG' bypasses the landing model — flat 92.5, no band spread", () => {
      const bypassed = kSwapHits(noSgRouting.events);
      expect([...new Set(bypassed.map((d) => d.atkPct))]).toEqual([92.5]);
    });
  });

  describe('K2 — burst grants self ATK ▲63.36% of caster ATK for 10s', () => {
    // casterAtkPct resolves to a FLAT ATK add at apply time, so the buffApply event carries the
    // resolved flat value (≈63.36% of K's caster ATK), not the percent. The 63.36% magnitude itself
    // is authored in the validated override JSON; here we pin the buff's PRESENCE/shape/load-bearing.
    const applied = kBuff(base.events, 'casterAtkPct');
    it('applies a caster-scaled flat ATK add to self, once per burst, for 10s', () => {
      expect(applied.length, 'no casterAtkPct buff applied').toBe(
        kBursts(base.events).length
      );
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([K]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
        expect(b.value, 'flat ATK add must be positive').toBeGreaterThan(0);
      }
      // Deterministic caster ATK at cast ⇒ the same flat add every burst (not noise/per-pellet).
      expect([...new Set(applied.map((b) => b.value.toFixed(3)))]).toHaveLength(
        1
      );
    });
    it('is load-bearing: removing the burst buffs drops K total', () => {
      expect(base.totals.k).toBeGreaterThan(noBurstBuffs.totals.k);
    });
  });

  describe('K3 — burst grants self Attack Damage ▲21.12% for 10s', () => {
    const applied = kBuff(base.events, 'attackDamagePct', 21.12);
    it('is 21.12%, self-targeted, once per burst, for 10s', () => {
      expect(applied.length, 'no burst attackDamagePct buff applied').toBe(
        kBursts(base.events).length
      );
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([K]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });
  });

  describe('K4 — Tilted Scale: burst-window Critical Rate = 75% (100 stacks × 0.75%)', () => {
    const kCritRates = (evs: SimEvent[]) =>
      [...new Set(kDamage(evs).map((d) => d.critRate.toFixed(6)))].sort();

    it('reads 0.90 in the burst window (0.15 base + 0.75 Tilted Scale)', () => {
      expect(kCritRates(base.events)).toContain((0.9).toFixed(6));
    });

    it('DISCRIMINATING: removing Tilted Scale leaves only the 0.15 base rate', () => {
      expect(kCritRates(noTilted.events)).toEqual([(0.15).toFixed(6)]);
      expect(base.totals.k).toBeGreaterThan(noTilted.totals.k);
    });

    it('DISCRIMINATING: without addStack Tilted Scale ramps slowly and never reaches the 75% cap', () => {
      const maxCrit = Math.max(...kCritRates(weakTilted.events).map(Number));
      expect(kCritRates(weakTilted.events)).not.toContain((0.9).toFixed(6));
      expect(maxCrit, 'slow ramp should stay well below 0.90').toBeLessThan(
        0.35
      );
    });
  });

  describe('K5 — S2 grants all allies Attack Damage ▲10.62% for 10s on gaining Tilted Scale (≈ lastBullet)', () => {
    const applied = kBuff(base.events, 'attackDamagePct', 10.62);
    it('reaches all three allies for 10s', () => {
      expect(
        applied.length,
        'no S2 attackDamagePct buff applied'
      ).toBeGreaterThan(0);
      const perFrame = new Map<number, Set<number | null>>();
      for (const b of applied) {
        (
          perFrame.get(b.frame) ??
          perFrame.set(b.frame, new Set()).get(b.frame)!
        ).add(b.targetIdx);
      }
      for (const [, holders] of perFrame) {
        expect(holders.size, 'S2 must reach all 3 allies').toBe(3);
      }
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });
    it('fires at LAST-BULLET cadence (many times per fight), not once per burst', () => {
      const distinctFrames = new Set(applied.map((b) => b.frame));
      expect(
        distinctFrames.size,
        `${distinctFrames.size} S2 firings vs ${kBursts(base.events).length} bursts — a burst-keyed trigger lands near the burst count`
      ).toBeGreaterThan(kBursts(base.events).length * 2);
    });
    it('DISCRIMINATING: removing S2 drops the team Attack Damage buff', () => {
      expect(kBuff(noS2.events, 'attackDamagePct', 10.62).length).toBe(0);
    });
  });

  describe("K6 — S2 costs all allies Max ammunition capacity ▼51.13% for 10s (the kit's stated downside)", () => {
    const applied = kBuff(base.events, 'maxAmmoPct', -51.13);
    it('is -51.13%, from K, reaching all allies for 10s', () => {
      expect(applied.length, 'no maxAmmoPct debuff applied').toBeGreaterThan(0);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
      expect([...new Set(applied.map((b) => b.targetIdx))].sort()).toEqual([
        0, 1, 2,
      ]);
    });
    it('DISCRIMINATING: removing S2 removes the ammo debuff', () => {
      expect(kBuff(noS2.events, 'maxAmmoPct', -51.13).length).toBe(0);
    });
  });

  describe('K7 — S1c (every-4-critical-hits rider) is deliberately UNMODELED', () => {
    it("all of K's damage is normal-bucket (no skill/burst rider is encoded)", () => {
      const buckets = [...new Set(kDamage(base.events).map((d) => d.bucket))];
      expect(buckets).toEqual(['normal']);
    });
  });
});
