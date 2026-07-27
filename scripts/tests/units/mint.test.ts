// PER-UNIT KIT SPEC — `mint` (Mint, Supporter/RL/Iron, Burst II, cd 20s, ammo 6, chargeFrames 60).
// Kit-autonomy gauntlet 2026-07-25 (driver: Qwen). Test-FIRST: every FAITHFUL line is pinned GREEN
// vs the shipped override on disk and RED vs its nearest-wrong counterfactual.
//
// Kit (blablalink prose, data/characters.json → characters.mint.skills; level-10 values):
//   S1 ■ Full Charge while Assigned Part: Singing → all allies: ATK ▲45.02% of caster ATK / 3s   [M1]
//      ■ Full Charge while Assigned Part: Dancing → all allies: recover 1.8% caster Max HP/1s/3s  [UNMODELED — defensive heal, no HP pool]
//   S2 ■ entering Burst Stage 3 while NOT Sing Along → self: Cancels Singing / Cancels Dancing    [UNMODELED — mode bookkeeping, no dmg/buff]
//      ■ entering Burst Stage 3 while Singing → all allies: Crit Rate ▲19.94% / 10s               [M2]
//                                                              Projectile Explosion Dmg ▲50% / 10s [M2]
//                                                              Pierce Damage ▲32.72% / 10s         [M2]
//   BU ■ self: Assigned Part toggle (Singing<->Dancing, Status 1/2, "cannot be removed")          [UNMODELED — mode bookkeeping]
//      ■ all allies (Sing Along, UNCONDITIONAL): Attack Damage ▲30.02% / 10s                       [M3]
//                                                 Max Ammo Capacity ▲40% / 10s                     [M3]
//                                                 Critical Damage ▲45.05% / 10s                    [M3]
//
// THE MODE SYSTEM (Tier 2 — the meta-defining mechanic). Mint toggles an Assigned Part between
// Singing and Dancing on every burst (start -> Dancing, then Singing, Dancing, ...), so at steady
// state she is Singing ~50% of the time. Dancing's ONLY effect is the S1 heal (defensive, skipped),
// so the Dancing half contributes nothing to damage. The Singing-gated lines (M1 casterAtkPct, M2
// crit/projExpl/pierce) are therefore modeled at ~50% uptime by HALVING their values in the default
// `solo` mode (a steady-state reduction, NOT the full-uptime the raw parser would assume). The burst
// Sing Along buffs (M3) are UNCONDITIONAL — not Singing-gated — so they keep full value in every mode.
// The `duet (w/ Prika)` mode (Prydwen-confirmed: Prika's S2 locks Mint into permanent Singing) uses
// the FULL Singing values. M4 pins that mode split behaviourally: solo = half, duet = full, and the
// burst Sing Along is mode-INVARIANT (proving it is correctly NOT folded into the Singing gate).
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates nothing):
//   M1  nearest-wrong = the raw parser's full-uptime 45.02% in solo. Shipped solo must read exactly
//       HALF (22.51% of caster ATK); the full-value counterfactual must read 45.02% and so differ.
//       casterAtkPct is carried as a resolved FLAT ATK amount, so the percentage is recovered as
//       value / staticAtk × 100 (staticAtk is the caster's final ATK; the recovery is exact).
//   M2  nearest-wrong = full Singing values (19.94/50/32.72) in solo. Shipped solo must read the
//       halved 9.97/25/16.36; the full-value counterfactual must differ on all three stats.
//   M3  nearest-wrong = "everything is Singing-gated, so halve the burst too." Shipped must read the
//       FULL unconditional 30.02/40/45.05; a halved-burst counterfactual (15.01/20/22.525) must differ.
//       And these values must be IDENTICAL across solo and duet (mode-invariant) — the positive proof
//       that the burst is correctly outside the Singing gate.
//   M4  selecting `duet (w/ Prika)` must DOUBLE every Singing-gated line (M1 -> 45.02%, M2 -> full
//       19.94/50/32.72) while leaving M3 untouched. solo != duet on the gated lines, solo == duet on
//       the burst — the mode mechanic is live, not cosmetic.
//
// UNMODELED (inert / out-of-domain — documented, NOT asserted; see override.unmodeled + note):
//   - S1 Dancing heal (1.8% Max HP/1s/3s): defensive; the engine models no HP pool, so it is inert
//     for damage. (It would drive a Crown-style on-recovery consumer if one were present; none is in
//     this fixture.)
//   - S2 "Cancels Singing / Dancing" + burst Assigned Part toggle (Status 1/2): pure mode
//     bookkeeping with no damage or buff payload — folded into the mode system, not encodable as a
//     stat, and inert on the partless scope-lock boss.
//   - Pierce Damage (M2d) is faithfully encoded as a buff VALUE but is damage-INERT in engine v1 on
//     the partless boss (no Pierce tag consumer); M2 pins the buff magnitude, not downstream damage.
//
// RESIDUAL (⚑ estimate + recipe + tier, full in the override note): the 50%-uptime halving proxy
// assumes teammates' damage is spread evenly across Mint's Singing/Dancing cycles; if their damage
// clusters in windows that align (or misalign) with Singing, the true value differs (estimate: a few
// % at board level; recipe: a Mint-focus recording comparing Singing-window vs Dancing-window team
// damage; tier 2). The duet ROTATION (Prika takes burst 1, Mint every burst after) is driven from
// Prika's side and needs the comp to SELECT both duet modes; M4 isolates Mint's mode-block encoding
// alone (full values under duet selection) without depending on Prika's rotation plumbing.
//
// Fixture: liter (B1) / mint (B2) / ada (B3) / helm (B3), boss Fire, focus ada — the control-comp
// shape with mint swapped for crown so she is the sole B2 and casts every Full Burst cycle (a lone
// B2 unit makes zero Full Bursts, so a solo fixture could never exercise her burst- or stage-3-gated
// lines). Deterministic (no seed) → totals and buff values are byte-stable. MINT slot index = 1.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, unitOf, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const MINT = 1;
const DUET = 'duet (w/ Prika)';
const COMP = {
  slugs: ['liter', 'mint', 'ada', 'helm'],
  bossElement: 'Fire' as const,
  focusSlug: 'ada',
};

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(
  overrides: Record<string, any> = {},
  modes?: Record<string, string>
) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...COMP,
    overrides,
    modes,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, res };
}

// ---- counterfactual patches (nearest-wrong model each assertion must discriminate) ------------
/** M1 nearest-wrong: the raw parser's FULL-uptime Singing value in solo (45.02%, not halved). */
const mintFullS1 = withPatchedOverride('mint', (ov) => {
  const solo = ov.skill1.find((b: any) => b.mode === 'solo');
  const e = solo?.effects.find((x: any) => x.stat === 'casterAtkPct');
  if (!e) {
    throw new Error(
      'mint solo S1 casterAtkPct effect missing — fixture is stale'
    );
  }
  e.value = 45.02;
});
/** M2 nearest-wrong: FULL Singing values on the solo stage-3 trio (19.94 / 50 / 32.72). */
const mintFullS2 = withPatchedOverride('mint', (ov) => {
  const solo = ov.skill2.find((b: any) => b.mode === 'solo');
  if (!solo) {
    throw new Error('mint solo S2 block missing — fixture is stale');
  }
  const full: Record<string, number> = {
    critRatePct: 19.94,
    projectileExplosionPct: 50,
    pierceDamagePct: 32.72,
  };
  for (const e of solo.effects) {
    if (e.stat in full) {
      e.value = full[e.stat];
    }
  }
});
/** M3 nearest-wrong: "the burst is Singing-gated too" → halve the Sing Along trio. */
const mintHalvedBurst = withPatchedOverride('mint', (ov) => {
  const b = ov.burst[0];
  if (!b) {
    throw new Error('mint burst block missing — fixture is stale');
  }
  const half: Record<string, number> = {
    attackDamagePct: 15.01,
    maxAmmoPct: 20,
    critDamagePct: 22.525,
  };
  for (const e of b.effects) {
    if (e.stat in half) {
      e.value = half[e.stat];
    }
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run(); // solo (default mode)
const fullS1 = run({ mint: mintFullS1 });
const fullS2 = run({ mint: mintFullS2 });
const halvedBurst = run({ mint: mintHalvedBurst });
const duet = run({}, { mint: DUET });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const mintBuff = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === MINT && b.stat === stat);
const mintShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'mint');
const distinct = (bs: BuffApply[]) => [...new Set(bs.map((b) => b.value))];
/** casterAtkPct is carried as a resolved flat ATK amount → recover the kit percentage. */
const pctOfCasterAtk = (bs: BuffApply[], atk: number) => [
  ...new Set(bs.map((b) => +((b.value / atk) * 100).toFixed(6))),
];
const reachesAllAllies = (bs: BuffApply[]) =>
  [
    ...new Set(
      bs.map((b) => b.targetIdx).filter((x): x is number => x != null)
    ),
  ].sort((a, b) => a - b);
const durations = (bs: BuffApply[]) => [
  ...new Set(bs.map((b) => (b.expiresFrame! - b.frame) / FPS)),
];

const mintAtk = unitOf(base.res, 'mint').staticAtk;
const mintAtkDuet = unitOf(duet.res, 'mint').staticAtk;

describe('mint — kit spec', () => {
  describe('M1 — S1 Singing Effect: ATK ▲45.02% of caster ATK, ~50% uptime in solo', () => {
    const applied = mintBuff(base.events, 'casterAtkPct');

    it('reads exactly HALF (22.51%) in the default solo mode, for 3s, on every ally', () => {
      expect(applied.length, 'no S1 casterAtkPct buff fired').toBeGreaterThan(
        0
      );
      expect(pctOfCasterAtk(applied, mintAtk)).toEqual([22.51]);
      expect(durations(applied)).toEqual([3]);
      expect(reachesAllAllies(applied)).toEqual([0, 1, 2, 3]);
    });

    it('fires on every full-charge pull (one application per ally per shot)', () => {
      expect(applied.length).toBe(mintShots(base.events).length * 4);
    });

    it("DISCRIMINATING: the raw parser's full-uptime 45.02% is NOT what ships", () => {
      const cf = pctOfCasterAtk(
        mintBuff(fullS1.events, 'casterAtkPct'),
        mintAtk
      );
      expect(cf).toEqual([45.02]);
      expect(cf).not.toEqual(pctOfCasterAtk(applied, mintAtk));
    });
  });

  describe('M2 — S2 Singing-gated stage-3 trio, ~50% uptime in solo (10s, all allies)', () => {
    it('reads the HALVED 9.97 / 25 / 16.36 in solo, once per burst, on every ally', () => {
      const crit = mintBuff(base.events, 'critRatePct');
      const proj = mintBuff(base.events, 'projectileExplosionPct');
      const pierce = mintBuff(base.events, 'pierceDamagePct');
      expect(distinct(crit)).toEqual([9.97]);
      expect(distinct(proj)).toEqual([25]);
      expect(distinct(pierce)).toEqual([16.36]);
      for (const bs of [crit, proj, pierce]) {
        expect(bs.length, 'a stage-3 trio buff did not fire').toBeGreaterThan(
          0
        );
        expect(durations(bs)).toEqual([10]);
        expect(reachesAllAllies(bs)).toEqual([0, 1, 2, 3]);
      }
      // one application per ally per burst cast
      const bursts =
        buffs(base.events).filter(
          (b) => b.casterIdx === MINT && b.stat === 'attackDamagePct'
        ).length / 4;
      expect(crit.length).toBe(bursts * 4);
    });

    it('DISCRIMINATING: full Singing values (19.94 / 50 / 32.72) are NOT what ships in solo', () => {
      expect(distinct(mintBuff(fullS2.events, 'critRatePct'))).toEqual([19.94]);
      expect(
        distinct(mintBuff(fullS2.events, 'projectileExplosionPct'))
      ).toEqual([50]);
      expect(distinct(mintBuff(fullS2.events, 'pierceDamagePct'))).toEqual([
        32.72,
      ]);
      expect(distinct(mintBuff(fullS2.events, 'critRatePct'))).not.toEqual(
        distinct(mintBuff(base.events, 'critRatePct'))
      );
    });
  });

  describe('M3 — burst Sing Along trio is UNCONDITIONAL (full value, mode-invariant)', () => {
    const atk = mintBuff(base.events, 'attackDamagePct');
    const ammo = mintBuff(base.events, 'maxAmmoPct');
    const cd = mintBuff(base.events, 'critDamagePct');

    it('reads the FULL 30.02 / 40 / 45.05 in solo, for 10s, on every ally', () => {
      expect(distinct(atk)).toEqual([30.02]);
      expect(distinct(ammo)).toEqual([40]);
      expect(distinct(cd)).toEqual([45.05]);
      for (const bs of [atk, ammo, cd]) {
        expect(bs.length, 'a Sing Along buff did not fire').toBeGreaterThan(0);
        expect(durations(bs)).toEqual([10]);
        expect(reachesAllAllies(bs)).toEqual([0, 1, 2, 3]);
      }
    });

    it('is mode-INVARIANT: identical values under duet selection (NOT Singing-gated)', () => {
      expect(distinct(mintBuff(duet.events, 'attackDamagePct'))).toEqual([
        30.02,
      ]);
      expect(distinct(mintBuff(duet.events, 'maxAmmoPct'))).toEqual([40]);
      expect(distinct(mintBuff(duet.events, 'critDamagePct'))).toEqual([45.05]);
    });

    it('DISCRIMINATING: a Singing-gated (halved) burst 15.01 / 20 / 22.525 is NOT what ships', () => {
      expect(distinct(mintBuff(halvedBurst.events, 'attackDamagePct'))).toEqual(
        [15.01]
      );
      expect(
        distinct(mintBuff(halvedBurst.events, 'attackDamagePct'))
      ).not.toEqual(distinct(atk));
    });
  });

  describe('M4 — the mode system: duet (w/ Prika) uses FULL Singing values, solo halves', () => {
    it('DOUBLES the S1 Singing buff under duet (45.02% of caster ATK)', () => {
      const soloPct = pctOfCasterAtk(
        mintBuff(base.events, 'casterAtkPct'),
        mintAtk
      );
      const duetPct = pctOfCasterAtk(
        mintBuff(duet.events, 'casterAtkPct'),
        mintAtkDuet
      );
      expect(duetPct).toEqual([45.02]);
      expect(soloPct).toEqual([22.51]);
      expect(duetPct).not.toEqual(soloPct);
    });

    it('DOUBLES the S2 stage-3 trio under duet (full 19.94 / 50 / 32.72)', () => {
      expect(distinct(mintBuff(duet.events, 'critRatePct'))).toEqual([19.94]);
      expect(distinct(mintBuff(duet.events, 'projectileExplosionPct'))).toEqual(
        [50]
      );
      expect(distinct(mintBuff(duet.events, 'pierceDamagePct'))).toEqual([
        32.72,
      ]);
      expect(distinct(mintBuff(duet.events, 'critRatePct'))).not.toEqual(
        distinct(mintBuff(base.events, 'critRatePct'))
      );
    });
  });
});
