// PER-UNIT KIT SPEC — `nayuta` (Nayuta, Supporter/SMG/Wind, Burst II, cd 20s, ammo 120, Pilgrim).
// Kit-autonomy gauntlet 2026-07-25 (driver, sighted).
//
// One assertion group per KIT LINE (N1..N9 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest-wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.nayuta.skills, level-10 values):
//   S1 ■ when Memory Absorption takes effect → all allies:                                 [N1]
//        Damage dealt when attacking core ▲25.15% (modeled passive/permanent — fires every 3s)
//      ■ when Memory Absorption takes effect → all allies:                                 [N2]
//        ATK ▲30.16% of the skill user's ATK (casterAtkPct, passive/permanent)
//      ■ when Memory Absorption takes effect → self: recovers 25% final Max HP   [UNMODELED — defensive]
//      ■ (start of battle) Unchanging Heart: Indomitability 9s, 1×               [UNMODELED — defensive]
//      ■ equally shares HP recovery for 5s                                      [UNMODELED — defensive]
//      ■ Full Charge while in Memory Incineration → all enemies: 150% final ATK ┐ [N3]
//      ■ vs the stage target: 380.46% final ATK additional damage              ┘ folded to a
//        single extraHitDamagePct 530.46 rider on burstCast for 10s (one per swapped full charge)
//   S2 ■ every 3s → self: Memory Absorption Hit Rate ▲1.4%, stacks to 30        [UNMODELED — measurement-gated]
//      ■ stack-gated continuous self buffs (ramp time-averaged over 180s):
//        Stage 1 (≥2 stacks @~9s):  ATK ▲15.2%   → 14.4 time-averaged            [N4]
//        Stage 2 (≥10 stacks @~30s): Attack Damage ▲20.27% → 16.8 time-averaged  [N5]
//        Stage 3 (≥30 stacks @~90s): core damage ▲21.05% → 10.5 time-averaged    [N6]
//   BU ■ all allies: Attack Damage ▲35.45% for 15 sec                            [N7]
//      ■ all enemies: 645.33% of final ATK as Burst Skill damage                 [N8]
//      ■ self: Memory Incineration — SR weapon swap (Damage 275.18%, fixed 1.8s charge,
//        Full Charge 250% of Damage, 10s) + Unlimited ammunition 10s             [N9]
//
// Why each assertion discriminates (a test that cannot fail under the nearest-wrong model gates
// nothing). Probed against the live engine (.nayuta-probe.ts, 2026-07-25 — 12 bursts, 44 swap
// full charges, 44 rider hits over the 180s fight):
//   N1  coreDamagePct 25.15 is encoded as a passive/permanent buff (Memory Absorption fires every
//       3s, so the 5s window is always up) reaching ALL four allies (expiresFrame null). Nearest
//       wrong: a self-only model — the event's holder set collapses from 4 allies to nayuta alone.
//   N2  casterAtkPct = a FLAT add of NAYUTA's ATK (0.3016×staticAtk ≈ 30.3k), NOT a % of each
//       ally's own ATK. Nearest wrong: atkPct. Proven by the buffApply stat/key (casterAtkPct, raw
//       30.16 in the key, flat value recorded) + identical value for every ally + a totals delta.
//   N3  the two Memory-Incineration full-charge lines (150% full-screen + 380.46% vs stage target)
//       are folded (post-tier-audit) into ONE extraHitDamagePct 530.46 rider, applied to self on
//       burstCast for 10s; the engine then emits one 530.46% hit per swapped full charge (44 hits =
//       44 swap shots). Nearest wrong: rider removed → every 530.46 hit vanishes and her total drops.
//       RESIDUAL ⚑: the 380.46% block's scope is genuinely ambiguous (one-time vs per-full-charge);
//       the per-full-charge fold is the tier-audit reading, pinned as-is, NOT certified kit-literal.
//   N4/N5/N6  the three stack-gated self buffs ramp (>2 @~9s, >10 @~30s, >30 @~90s of 180s), so the
//       shipped override encodes TIME-AVERAGED values 14.4/16.8/10.5, not the full-from-t0 kit values
//       15.2/20.27/21.05. Nearest wrong: the naive full values — they over-buff and move her total.
//       Each is self-only (target nayuta) and permanent (expiresFrame null).
//   N7  burst Attack Damage 35.45% reaches all four allies for 15s (expiresFrame delta 900), once
//       per cast per ally. Nearest wrong: self-only — holder set collapses to nayuta.
//   N8  a burst CAST lands BEFORE the Full Burst window opens, so the 645.33% nuke must never take
//       the +50% FB major (verified fact). Magnitude 645.33, burst bucket, once per cast.
//   N9  Memory Incineration swaps her to an SR charge weapon: her normal-bucket shots become
//       275.18% × 250% full-charge (charge mult 2.5) inside the 10s window. Removing the swap zeroes
//       every 275.18 shot and drops her total to a fraction — the swap is load-bearing (her main DPS).
//       RESIDUAL ⚑ (kit-status F2): chargeTimeSec is shipped at 2.13 (the 1.8s kit charge + 0.5s SR
//       bolt-recovery cycle folded in, since swaps are exempt from the engine's auto bolt-recovery);
//       the cadence pin records the shipped per-window count, NOT a kit-literal certification.
//
// Inert / unmeasured (documented, NOT asserted): Indomitability, the shared HP recovery, and the
// self 25%-Max-HP heal are defensive (no HP pool / nothing dies at scope lock). The Memory Absorption
// Hit Rate 1.4%/stack (42% at cap) is measurement-gated (hitRatePct feeds her SMG core rate via
// acrForHR; encoding it would move her) — queued, not encoded.
//
// Fixture: liter(SMG B1) / nayuta(SMG B2) / ada(RL B3) / helm(SR B3), boss Iron (Wind-weak, the
// kit-status evidence basis), focus nayuta. nayuta is the Burst-II caster; liter opens the chain and
// ada/helm are the Burst-III casters that let her sustain a Full Burst every ~15s (12 casts over
// 180s). Deterministic (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const COMP = ['liter', 'nayuta', 'ada', 'helm'];
const NAYUTA = 1; // nayuta's slot in COMP

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: COMP,
    bossElement: 'Iron',
    focusSlug: 'nayuta',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res), res };
}

// ---- counterfactual / reference patches (nearest-wrong models) -------------------------------
/** N1 nearest-wrong: S1 ally block scoped to self (coreDamagePct no longer reaches the team). */
const nayutaS1Self = withPatchedOverride('nayuta', (ov) => {
  const b = ov.skill1.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'coreDamagePct'),
  );
  if (!b)
    throw new Error('nayuta S1 coreDamagePct block missing — fixture is stale');
  b.target = { kind: 'self' };
});
/** N2 encoding reference: S1 casterAtkPct → atkPct (% of each ally's OWN ATK, not nayuta's flat). */
const nayutaS1AtkPct = withPatchedOverride('nayuta', (ov) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'casterAtkPct');
  if (!e)
    throw new Error('nayuta S1 casterAtkPct effect missing — fixture is stale');
  e.stat = 'atkPct';
});
/** N3 nearest-wrong: the Memory-Incineration full-charge rider removed. */
const nayutaNoRider = withPatchedOverride('nayuta', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !b.effects.some((e: any) => e.stat === 'extraHitDamagePct'),
  );
  if (ov.skill1.length === before)
    throw new Error(
      'nayuta S1 extraHitDamagePct rider missing — fixture is stale',
    );
});
/** N4/N5/N6 nearest-wrong: the naive FULL-from-t0 stack values (ramp ignored). */
const nayutaFullStacks = withPatchedOverride('nayuta', (ov) => {
  const map: Record<string, number> = {
    atkPct: 15.2,
    attackDamagePct: 20.27,
    coreDamagePct: 21.05,
  };
  let patched = 0;
  for (const b of ov.skill2)
    for (const e of b.effects)
      if (e.stat in map) {
        e.value = map[e.stat];
        patched++;
      }
  if (patched < 3)
    throw new Error('nayuta S2 stack-gate buffs missing — fixture is stale');
});
/** N7 nearest-wrong: burst Attack Damage scoped to self. */
const nayutaBurstSelf = withPatchedOverride('nayuta', (ov) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'attackDamagePct'),
  );
  if (!b)
    throw new Error(
      'nayuta burst attackDamagePct block missing — fixture is stale',
    );
  b.target = { kind: 'self' };
});
/** N9 nearest-wrong: Memory Incineration removed. The S1 full-charge rider (extraHitDamagePct
 *  530.46) is kit-gated on "while in Memory Incineration status", so removing the swap WITHOUT the
 *  rider would let the rider mis-fire on every rapid base-SMG shot during the unlimited-ammo window
 *  (a 12× artifact). The faithful "no Memory Incineration" counterfactual removes BOTH the swap and
 *  the rider that depends on it. */
const nayutaNoSwap = withPatchedOverride('nayuta', (ov) => {
  let swapped = 0;
  for (const b of ov.burst) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.kind !== 'weaponSwap');
    if (b.effects.length !== before) swapped++;
  }
  const beforeS1 = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !b.effects.some((e: any) => e.stat === 'extraHitDamagePct'),
  );
  if (!swapped || ov.skill1.length === beforeS1)
    throw new Error(
      'nayuta Memory Incineration blocks missing — fixture is stale',
    );
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const s1Self = run({ nayuta: nayutaS1Self });
const s1AtkPct = run({ nayuta: nayutaS1AtkPct });
const noRider = run({ nayuta: nayutaNoRider });
const fullStacks = run({ nayuta: nayutaFullStacks });
const burstSelf = run({ nayuta: nayutaBurstSelf });
const noSwap = run({ nayuta: nayutaNoSwap });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const nayutaCasts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'nayuta',
  );
/** nayuta-cast buffApply by exact key (key carries the raw kit magnitude; value is the resolved stat). */
const nayutaBuff = (evs: SimEvent[], key: string) =>
  buffs(evs).filter((b) => b.casterIdx === NAYUTA && b.key === key);
const holders = (bs: BuffApply[]) => new Set(bs.map((b) => b.targetIdx));
/** nayuta's swapped full-charge shots: normal bucket at the swap's 275.18% (base SMG is 8.73%). */
const swapShots = (evs: SimEvent[]) =>
  dmg(evs).filter(
    (d) =>
      d.slug === 'nayuta' &&
      d.bucket === 'normal' &&
      Math.abs(d.atkPct - 275.18) < 1e-6,
  );
/** nayuta's Memory-Incineration rider hits (150% + 380.46% folded). */
const riderHits = (evs: SimEvent[]) =>
  dmg(evs).filter(
    (d) => d.slug === 'nayuta' && Math.abs(d.atkPct - 530.46) < 1e-6,
  );

const S1_CORE_KEY = `${NAYUTA}:skill1:coreDamagePct:25.15`;
const S1_CASTER_KEY = `${NAYUTA}:skill1:casterAtkPct:30.16`;
const S1_RIDER_KEY = `${NAYUTA}:skill1:extraHitDamagePct:530.46`;
const S2_ATK_KEY = `${NAYUTA}:skill2:atkPct:14.4`;
const S2_DMG_KEY = `${NAYUTA}:skill2:attackDamagePct:16.8`;
const S2_CORE_KEY = `${NAYUTA}:skill2:coreDamagePct:10.5`;
const BU_DMG_KEY = `${NAYUTA}:burst:attackDamagePct:35.45`;

describe('nayuta — kit spec', () => {
  describe('N1 — S1 core damage ▲25.15% to ALL allies, passive/permanent (Memory Absorption cadence)', () => {
    const applied = nayutaBuff(base.events, S1_CORE_KEY);

    it('is 25.15% reaching all four allies, with no expiry (always-up passive)', () => {
      expect(
        applied.length,
        'no S1 coreDamagePct 25.15 buff was applied',
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([25.15]);
      expect(
        holders(applied).size,
        `reached ${holders(applied).size} allies, expected 4`,
      ).toBe(4);
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
    });

    it('DISCRIMINATING: a self-only model collapses the holder set to nayuta alone', () => {
      const cf = nayutaBuff(s1Self.events, S1_CORE_KEY);
      expect(
        [...holders(cf)],
        'self-only counterfactual must reach only nayuta',
      ).toEqual([NAYUTA]);
    });
  });

  describe("N2 — S1 ATK ▲30.16% of NAYUTA's ATK to all allies (casterAtkPct, flat caster add)", () => {
    const applied = nayutaBuff(base.events, S1_CASTER_KEY);
    const expectedFlat = 0.3016 * unitOf(base.res, 'nayuta').staticAtk;

    it("is a FLAT add of nayuta's ATK (value ≈ 0.3016×staticAtk, >> a percentage)", () => {
      expect(
        applied.length,
        'no S1 casterAtkPct buff was applied',
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.stat))]).toEqual([
        'casterAtkPct',
      ]);
      for (const b of applied) {
        expect(
          b.value,
          'casterAtkPct must record a flat ATK grant, not the raw 30.16',
        ).toBeGreaterThan(1000);
        expect(b.value).toBeCloseTo(expectedFlat, 4);
      }
    });

    it('reaches all four allies with the SAME flat value, no expiry', () => {
      expect(
        holders(applied).size,
        `reached ${holders(applied).size} allies, expected 4`,
      ).toBe(4);
      expect(
        [...new Set(applied.map((b) => b.value))].length,
        'value must be identical for every ally',
      ).toBe(1);
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
    });

    it('ENCODING: shipped logs casterAtkPct; the atkPct counterfactual logs atkPct (distinct mechanic)', () => {
      expect(
        buffs(s1AtkPct.events).filter(
          (b) =>
            b.casterIdx === NAYUTA &&
            b.key.startsWith(`${NAYUTA}:skill1:casterAtkPct`),
        ).length,
      ).toBe(0);
      expect(
        buffs(s1AtkPct.events).filter(
          (b) =>
            b.casterIdx === NAYUTA &&
            b.stat === 'atkPct' &&
            b.key.startsWith(`${NAYUTA}:skill1:`),
        ).length,
      ).toBeGreaterThan(0);
    });

    it('DISCRIMINATING + LIVE: casterAtkPct vs atkPct change team damage differently', () => {
      expect(base.totals).not.toEqual(s1AtkPct.totals);
    });
  });

  describe('N3 — S1 Memory-Incineration full-charge rider: extraHitDamagePct 530.46 (150+380.46), 10s', () => {
    const applied = nayutaBuff(base.events, S1_RIDER_KEY);

    it('is applied to self on every burst cast, for 10 sec', () => {
      expect(
        applied.length,
        'no S1 extraHitDamagePct 530.46 buff was applied',
      ).toBe(nayutaCasts(base.events).length);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([530.46]);
      expect([...holders(applied)]).toEqual([NAYUTA]);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('emits one 530.46% hit per swapped full charge (rider is live, not inert)', () => {
      const hits = riderHits(base.events);
      const shots = swapShots(base.events);
      expect(hits.length, 'no 530.46% rider hits').toBeGreaterThan(0);
      expect(
        hits.length,
        `${hits.length} rider hits vs ${shots.length} swap shots — expected one rider per full charge`,
      ).toBe(shots.length);
    });

    it('DISCRIMINATING: removing the rider zeroes every 530.46 hit and drops her total', () => {
      expect(riderHits(noRider.events).length).toBe(0);
      expect(noRider.totals.nayuta).toBeLessThan(base.totals.nayuta * 0.95);
    });
  });

  describe('N4/N5/N6 — S2 stack-gated self buffs, time-averaged over the ramp (14.4 / 16.8 / 10.5)', () => {
    it('encodes the TIME-AVERAGED values, self-only, permanent (not the full-from-t0 kit values)', () => {
      for (const [key, value] of [
        [S2_ATK_KEY, 14.4],
        [S2_DMG_KEY, 16.8],
        [S2_CORE_KEY, 10.5],
      ] as const) {
        const applied = nayutaBuff(base.events, key);
        expect(applied.length, `no S2 ${key} buff was applied`).toBeGreaterThan(
          0,
        );
        expect([...new Set(applied.map((b) => b.value))]).toEqual([value]);
        expect([...holders(applied)], `${key} must be self-only`).toEqual([
          NAYUTA,
        ]);
        expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([
          null,
        ]);
      }
    });

    it('DISCRIMINATING: the naive full-from-t0 values (15.2/20.27/21.05) over-buff and move her total', () => {
      // The shipped time-averaging is a deliberate modeling of the stack ramp; the full values are
      // the nearest-wrong model. They must NOT be byte-identical to shipped.
      expect(fullStacks.totals.nayuta).not.toBe(base.totals.nayuta);
      expect(fullStacks.totals.nayuta).toBeGreaterThan(base.totals.nayuta);
    });
  });

  describe('N7 — burst grants Attack Damage ▲35.45% to ALL allies for 15 sec', () => {
    const applied = nayutaBuff(base.events, BU_DMG_KEY);

    it('reaches all four allies, once per cast per ally, for 15 sec', () => {
      const casts = nayutaCasts(base.events).length;
      expect(
        applied.length,
        'no burst attackDamagePct 35.45 buff was applied',
      ).toBe(casts * 4);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([35.45]);
      expect(
        holders(applied).size,
        `reached ${holders(applied).size} allies, expected 4`,
      ).toBe(4);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(15 * FPS);
    });

    it('DISCRIMINATING: a self-only model collapses the holder set to nayuta alone', () => {
      const cf = nayutaBuff(burstSelf.events, BU_DMG_KEY);
      expect(
        [...holders(cf)],
        'self-only counterfactual must reach only nayuta',
      ).toEqual([NAYUTA]);
    });
  });

  describe('N8 — burst nuke: 645.33% of final ATK to all enemies, cast BEFORE the FB window', () => {
    const nukes = dmg(base.events).filter(
      (d) => d.slug === 'nayuta' && d.srcSlot === 'burst',
    );

    it('fires once per burst cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes.length).toBe(nayutaCasts(base.events).length);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([645.33]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      expect(nukes.filter((d) => d.fbMajorApplied).map((d) => d.sec)).toEqual(
        [],
      );
    });
  });

  describe('N9 — burst Memory Incineration: SR weapon swap (275.18% × 250% full charge), 10s + unlimited ammo', () => {
    it('her normal-bucket shots become 275.18% at charge mult 2.5 inside the swap window', () => {
      const shots = swapShots(base.events);
      expect(
        shots.length,
        'no swapped full-charge shots — Memory Incineration never fired',
      ).toBeGreaterThan(0);
      expect(
        [...new Set(shots.map((d) => d.mult.charge))],
        'swap full charge = 250% of damage → ×2.5',
      ).toEqual([2.5]);
    });

    it('DISCRIMINATING: removing Memory Incineration zeroes every 275.18 shot and drops her total', () => {
      expect(swapShots(noSwap.events).length).toBe(0);
      expect(riderHits(noSwap.events).length).toBe(0);
      // Swap full charges + their rider are ~87% of her base damage; removing both must collapse it.
      expect(noSwap.totals.nayuta).toBeLessThan(base.totals.nayuta * 0.5);
    });

    // RESIDUAL (kit-status F2, MEASUREMENT-GATED): chargeTimeSec is shipped at 2.13 (1.8s kit charge
    // + 0.5s SR bolt-recovery folded in; swaps are exempt from the engine's auto bolt-recovery). This
    // pin records the CURRENT shipped per-window cadence so any change is visible — it does NOT
    // certify the count as kit-literal. Resolving it needs swap-cycle footage (manual-review/nayuta.md).
    it('PIN (current shipped cadence, F2 residual): ≥1 swapped full charge per full burst window', () => {
      // Only casts whose full 10s window fits inside the 180s fight are measurable — the last cast
      // lands at ~178s and its first full charge (~2s into the window) falls past fight-end, a
      // property of the fixture, not the kit (mirrors helm H8).
      const FIGHT_FRAMES = 180 * FPS;
      const casts = nayutaCasts(base.events).filter(
        (c) => c.frame + 10 * FPS <= FIGHT_FRAMES,
      );
      const shots = swapShots(base.events);
      expect(
        casts.length,
        'fixture produced no burst with a full window',
      ).toBeGreaterThan(0);
      for (const cast of casts) {
        const inWindow = shots.filter(
          (s) => s.frame >= cast.frame && s.frame <= cast.frame + 10 * FPS,
        );
        expect(
          inWindow.length,
          `burst at ${(cast.frame / FPS).toFixed(1)}s produced no swapped full charge`,
        ).toBeGreaterThanOrEqual(1);
      }
    });

    it('encodes unlimitedAmmo alongside the swap (10s)', () => {
      const ov: any = withPatchedOverride('nayuta', () => {});
      const blk = ov.burst.find((b: any) =>
        b.effects.some((e: any) => e.kind === 'unlimitedAmmo'),
      );
      expect(blk, 'no burst unlimitedAmmo block').toBeTruthy();
      expect(
        blk.effects.find((e: any) => e.kind === 'unlimitedAmmo').durationSec,
      ).toBe(10);
    });
  });
});
