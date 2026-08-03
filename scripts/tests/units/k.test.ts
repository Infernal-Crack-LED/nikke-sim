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
//   K1  the burst weapon is the DOMINANT damage. The engine's weaponSwap fires ONE dealDamage per
//       pull for a non-SG base (effectivePellets is SG-only AND swap-off, sim.ts:1386), so the kit's
//       10 pellets × 92.5% are COLLAPSED to a single 925%-of-final-ATK hit per pull — EV-exact under
//       the deterministic (expected-value, no damage seed) crit model. Proven two ways: removing the
//       swap zeroes the burst-window damage, and the naive per-pellet magnitude (92.5, forgetting the
//       ×10) cuts it ~10×. Cadence pinned at pullsPerSec 2 = SMG 20/s × 0.10 (the kit's ▼90%).
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
  if (ov.burst.length === before)
    throw new Error('k burst weaponSwap block missing — fixture is stale');
});
/** K1 counterfactual: the naive per-pellet magnitude (92.5) — forgets the ×10 pellet collapse. */
const kWeakSwap = withPatchedOverride('k', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'weaponSwap');
  if (!e) throw new Error('k weaponSwap effect missing — fixture is stale');
  e.damagePct = 92.5;
});
/** K2/K3 reference: the burst's ATK + Attack Damage self-buffs removed. */
const kNoBurstBuffs = withPatchedOverride('k', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !(hasStat(b, 'casterAtkPct') || hasStat(b, 'attackDamagePct'))
  );
  if (ov.burst.length === before)
    throw new Error('k burst buff blocks missing — fixture is stale');
});
/** K4 reference: Tilted Scale crit rate removed. */
const kNoTilted = withPatchedOverride('k', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'critRatePct'));
  if (ov.skill1.length === before)
    throw new Error('k skill1 critRatePct block missing — fixture is stale');
});
/** K4 counterfactual: one trigger's worth (21.75) — the "never reached the 100-stack cap" error. */
const kWeakTilted = withPatchedOverride('k', (ov) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'critRatePct');
  if (!e) throw new Error('k critRatePct effect missing — fixture is stale');
  e.value = 21.75;
});
/** K5/K6 reference: S2 (Fulfillment of Righteousness) removed. */
const kNoS2 = withPatchedOverride('k', (ov) => {
  if (!ov.skill2.length)
    throw new Error('k skill2 blocks missing — fixture is stale');
  ov.skill2 = [];
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noSwap = run({ k: kNoSwap });
const weakSwap = run({ k: kWeakSwap });
const noBurstBuffs = run({ k: kNoBurstBuffs });
const noTilted = run({ k: kNoTilted });
const weakTilted = run({ k: kWeakTilted });
const noS2 = run({ k: kNoS2 });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const kDamage = (evs: SimEvent[]) => dmg(evs).filter((d) => d.slug === 'k');
/** The collapsed swap shots: normal-bucket hits well above the 9.1% base SMG multiplier — the
 *  925% per-pull magnitude (or 92.5% in the naive-per-pellet counterfactual). Threshold 50 cleanly
 *  separates base (9.1) from swap (≥92.5). */
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
  describe('K1 — burst swaps to a 10-pellet 92.5% shotgun (collapsed to 925%/pull) at -90% speed', () => {
    it('fires the collapsed 925%-of-final-ATK hit per pull, in the normal bucket', () => {
      const hits = kSwapHits(base.events);
      expect(hits.length, 'no swap-window damage was dealt').toBeGreaterThan(0);
      expect([...new Set(hits.map((d) => d.atkPct))]).toEqual([925]);
      expect([...new Set(hits.map((d) => d.bucket))]).toEqual(['normal']);
    });

    it('runs at ~2 pulls/s (SMG 20/s × 0.10) for 10s per burst window', () => {
      const hits = kSwapHits(base.events);
      const bursts = kBursts(base.events);
      expect(bursts.length).toBeGreaterThan(0);
      // ~20 pulls per 10s window; allow frame-quantization + fight-end truncation slack.
      expect(
        hits.length,
        `${hits.length} swap hits over ${bursts.length} bursts — expected ~20/window`
      ).toBeGreaterThanOrEqual(bursts.length * 15);
    });

    it('DISCRIMINATING: removing the swap zeroes the burst-window damage', () => {
      expect(kSwapHits(noSwap.events).length).toBe(0);
      expect(base.totals.k).toBeGreaterThan(noSwap.totals.k * 2);
    });

    it('DISCRIMINATING: the naive per-pellet magnitude (92.5, no ×10) cuts it ~10×', () => {
      const weak = kSwapHits(weakSwap.events);
      expect([...new Set(weak.map((d) => d.atkPct))]).toEqual([92.5]);
      // 925 vs 92.5 is a 10× per-pull gap; total damage drops by more than half.
      expect(base.totals.k).toBeGreaterThan(weakSwap.totals.k * 5);
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
      expect([...new Set(applied.map((b) => b.value.toFixed(3)))]).toHaveLength(1);
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
      for (const b of applied)
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
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

    it('DISCRIMINATING: one trigger\'s worth (21.75, "never capped") reads 0.3675, not 0.90', () => {
      expect(kCritRates(weakTilted.events)).not.toContain((0.9).toFixed(6));
      expect(kCritRates(weakTilted.events)).toContain((0.3675).toFixed(6));
    });
  });

  describe('K5 — S2 grants all allies Attack Damage ▲10.62% for 10s on gaining Tilted Scale (≈ lastBullet)', () => {
    const applied = kBuff(base.events, 'attackDamagePct', 10.62);
    it('reaches all three allies for 10s', () => {
      expect(applied.length, 'no S2 attackDamagePct buff applied').toBeGreaterThan(0);
      const perFrame = new Map<number, Set<number | null>>();
      for (const b of applied)
        (perFrame.get(b.frame) ?? perFrame.set(b.frame, new Set()).get(b.frame)!).add(
          b.targetIdx
        );
      for (const [, holders] of perFrame)
        expect(holders.size, 'S2 must reach all 3 allies').toBe(3);
      for (const b of applied)
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
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

  describe('K6 — S2 costs all allies Max ammunition capacity ▼51.13% for 10s (the kit\'s stated downside)', () => {
    const applied = kBuff(base.events, 'maxAmmoPct', -51.13);
    it('is -51.13%, from K, reaching all allies for 10s', () => {
      expect(applied.length, 'no maxAmmoPct debuff applied').toBeGreaterThan(0);
      for (const b of applied)
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      expect([...new Set(applied.map((b) => b.targetIdx))].sort()).toEqual([
        0, 1, 2,
      ]);
    });
    it('DISCRIMINATING: removing S2 removes the ammo debuff', () => {
      expect(kBuff(noS2.events, 'maxAmmoPct', -51.13).length).toBe(0);
    });
  });

  describe('K7 — S1c (every-4-critical-hits rider) is deliberately UNMODELED', () => {
    it('all of K\'s damage is normal-bucket (no skill/burst rider is encoded)', () => {
      const buckets = [...new Set(kDamage(base.events).map((d) => d.bucket))];
      expect(buckets).toEqual(['normal']);
    });
  });
});
