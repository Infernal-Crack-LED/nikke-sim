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
// Singing and Dancing on every one of HER OWN burst casts — kit-literal: "Status 1: if in Dancing,
// gain Singing" / "Status 2: if NOT in Dancing [incl. no part yet], gain Dancing" — so starting from
// no part at battle start, cast 1 leaves her Dancing (Status 2: "not Dancing" is true pre-part), cast
// 2 flips her to Singing (Status 1), cast 3 back to Dancing, etc.: strict alternation between the two
// states, Dancing-FIRST (owner-confirmed 2026-08-03: "she starts with nothing on, which means she goes
// dancing first"; "the alternation is that clean/strict"). Dancing's ONLY effect is the S1 heal
// (defensive, skipped), so a Dancing rotation contributes nothing to damage. ENACTED 2026-08-03
// (owner-directed: "we should actually alternate her buffs and not apply them half all the time"),
// superseding the prior steady-state 50%-uptime HALVING proxy: a `singing` resource (0=Dancing,
// 1=Singing; declared `resources`, initial 0) is driven by two `burst` blocks on Mint's OWN
// `burstCast` (`everyN:2`, `everyNOffset:1` → delta -1 on her odd casts / `everyNOffset:0` → delta +1
// on her even casts — `mode:'solo'` only), and the S1/S2 Singing-gated blocks (M1 casterAtkPct, M2
// crit/projExpl/pierce) carry `resourceGate:{name:'singing',min:1}` at the FULL kit-literal
// magnitude — live only on Singing rotations, silent on Dancing ones. The burst Sing Along buffs (M3)
// are UNCONDITIONAL — not Singing-gated, no resource involvement — so they keep full value every
// rotation in every mode. The `duet (w/ Prika)` mode (Prydwen-confirmed: Prika's S2 locks Mint into
// permanent Singing) is UNCHANGED by this pass — its blocks stay unconditional full-value, no
// resourceGate, no toggle (she never leaves Singing there, so there is nothing to alternate). M4 pins
// that mode split behaviourally: solo = alternating, duet = permanent-full, and the burst Sing Along
// is mode-INVARIANT (proving it is correctly NOT folded into the Singing gate).
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates nothing):
//   M1  nearest-wrong (a) = the raw parser's full-uptime 45.02% on EVERY shot, un-gated. Shipped must
//       fire 45.02% but ONLY on Singing-rotation shots — strictly fewer than the total shot count.
//       (b) = the prior halving proxy (flat 22.51% every shot) — value differs (45.02 vs 22.51) AND
//       firing pattern differs (gated vs unconditional). (c) = REVERSED parity (Singing-FIRST instead
//       of Dancing-first) — the buff would then appear starting in the window right after cast 1, not
//       cast 2; frame-window parity discriminates this exactly. casterAtkPct is carried as a resolved
//       FLAT ATK amount, so the percentage is recovered as value / staticAtk × 100 (exact recovery).
//   M2  same three nearest-wrongs as M1, applied to the stage-3 trio (19.94/50/32.72 full vs
//       9.97/25/16.36 halved vs reversed parity).
//   M3  nearest-wrong = "everything is Singing-gated, so halve the burst too." Shipped must read the
//       FULL unconditional 30.02/40/45.05; a halved-burst counterfactual (15.01/20/22.525) must differ.
//       And these values must be IDENTICAL across solo and duet (mode-invariant) — the positive proof
//       that the burst is correctly outside the Singing gate.
//   M4  selecting `duet (w/ Prika)` must produce full Singing values (M1 -> 45.02%, M2 -> full
//       19.94/50/32.72) UNGATED (every rotation, not just alternating ones) while leaving M3
//       untouched — the mode mechanic is live, not cosmetic.
//
// UNMODELED (inert / out-of-domain — documented, NOT asserted; see override.unmodeled + note):
//   - S1 Dancing heal (1.8% Max HP/1s/3s): defensive; the engine models no HP pool, so it is inert
//     for damage. (It would drive a Crown-style on-recovery consumer if one were present; none is in
//     this fixture; a separate, still-open residual — not touched by this pass.)
//   - S2 "Cancels Singing / Dancing" + burst Assigned Part toggle (Status 1/2 prose): pure mode
//     bookkeeping — the actual toggle EFFECT is now the `singing` resource mechanism above; the prose
//     lines themselves carry no damage/buff payload of their own and stay in `unmodeled`/`caveats`.
//   - Pierce Damage (M2d) is faithfully encoded as a buff VALUE but is damage-INERT in engine v1 on
//     the partless boss (no Pierce tag consumer); M2 pins the buff magnitude, not downstream damage.
//
// RESIDUAL (⚑ estimate + recipe + tier, full in the override note): teammates' damage is not
// perfectly uniform across Mint's Singing/Dancing windows (e.g. reload/cooldown alignment could
// cluster it); if it clusters toward or away from her Singing windows, the true board value differs
// slightly from this alternating model's prediction (estimate: a few % at board level; recipe: a
// Mint-focus recording comparing Singing-window vs Dancing-window team damage; tier 2 — separate from
// the now-resolved parity/strictness question). The duet ROTATION (Prika takes burst 1, Mint every
// burst after) is driven from Prika's side and needs the comp to SELECT both duet modes; M4 isolates
// Mint's mode-block encoding alone (full values under duet selection) without depending on Prika's
// rotation plumbing.
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
/** The shipped solo S1/S2 blocks carry the resourceGate under test. */
const findSoloGated = (blocks: any[]) =>
  blocks.find((b: any) => b.mode === 'solo' && b.resourceGate);

/** M1/M2 nearest-wrong (a): FULL kit-literal values but UNGATED — fires on every shot/burst
 *  regardless of Singing/Dancing, i.e. ignores the alternation entirely (the raw-parser reading). */
const mintUngated = withPatchedOverride('mint', (ov) => {
  const s1 = findSoloGated(ov.skill1);
  const s2 = findSoloGated(ov.skill2);
  if (!s1 || !s2) {
    throw new Error(
      'mint solo resourceGate-carrying S1/S2 blocks missing — fixture is stale'
    );
  }
  delete s1.resourceGate;
  delete s2.resourceGate;
});
/** M1/M2 nearest-wrong (b): REVERSED parity — Singing-FIRST instead of Dancing-first (swap the two
 *  `singing` toggle blocks' everyNOffset). Discriminates the owner-confirmed "she starts with
 *  nothing on" (= Dancing-first) parity. */
const mintReversedParity = withPatchedOverride('mint', (ov) => {
  const toggles = ov.burst.filter(
    (b: any) => b.mode === 'solo' && b.everyN === 2
  );
  if (toggles.length !== 2) {
    throw new Error(
      'mint solo singing-toggle blocks missing — fixture is stale'
    );
  }
  for (const b of toggles) {
    b.everyNOffset = b.everyNOffset === 1 ? 0 : 1;
  }
});
/** M1/M2 nearest-wrong (c): the toggle removed entirely — `singing` stays at its initial 0
 *  (Dancing) forever, so the Singing-gated blocks NEVER fire (the pre-alternation "always Dancing"
 *  degenerate case — distinct from the old flat-halving proxy, which fired every shot/burst). */
const mintNoToggle = withPatchedOverride('mint', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !(b.mode === 'solo' && b.everyN === 2)
  );
  if (ov.burst.length === before) {
    throw new Error(
      'mint solo singing-toggle blocks missing — fixture is stale'
    );
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
const ungated = run({ mint: mintUngated });
const reversedParity = run({ mint: mintReversedParity });
const noToggle = run({ mint: mintNoToggle });
const halvedBurst = run({ mint: mintHalvedBurst });
const duet = run({}, { mint: DUET });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const mintBuff = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === MINT && b.stat === stat);
const mintShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'mint');
const mintBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Extract<SimEvent, { kind: 'burstCast' }> =>
      e.kind === 'burstCast' && e.slug === 'mint'
  );
/** Ascending frames of Mint's OWN burst casts — each one flips the `singing` resource. */
const mintBurstFrames = (evs: SimEvent[]) =>
  mintBursts(evs)
    .map((e) => e.frame)
    .sort((a, b) => a - b);
/** 0-indexed position of the LAST mint cast at/before `frame` (-1 = before her first cast). Per
 *  the shipped toggle (odd casts → Dancing/0, even casts → Singing/1), the currently-active state
 *  is Singing iff this index is ODD (index 1 = her 2nd cast = the first even/Singing-setting cast). */
const castIndexBefore = (frame: number, bursts: number[]) => {
  let idx = -1;
  for (let i = 0; i < bursts.length; i++) {
    if (bursts[i] <= frame) {
      idx = i;
    } else {
      break;
    }
  }
  return idx;
};
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
  describe('M1 — S1 Singing Effect: ATK ▲45.02% of caster ATK, gated on the alternation (solo)', () => {
    const applied = mintBuff(base.events, 'casterAtkPct');
    const bursts = mintBurstFrames(base.events);

    it('fires at the FULL kit-literal 45.02% (never the old halved 22.51%), for 3s, on every ally', () => {
      expect(applied.length, 'no S1 casterAtkPct buff fired').toBeGreaterThan(
        0
      );
      expect(pctOfCasterAtk(applied, mintAtk)).toEqual([45.02]);
      expect(durations(applied)).toEqual([3]);
      expect(reachesAllAllies(applied)).toEqual([0, 1, 2, 3]);
    });

    it('fires on every full-charge pull DURING Singing rotations only — strictly fewer than her total shot count', () => {
      const shotCount = mintShots(base.events).length;
      expect(shotCount).toBeGreaterThan(0);
      expect(applied.length).toBeLessThan(shotCount * 4);
      expect(applied.length).toBeGreaterThan(0);
    });

    it('DISCRIMINATING (parity): every firing falls in an ODD cast-index window — the 2nd/4th/6th... cast onward, never the 1st/3rd/5th (Dancing-first)', () => {
      expect(bursts.length).toBeGreaterThan(1);
      const idxs = new Set(
        applied.map((b) => castIndexBefore(b.frame, bursts))
      );
      for (const idx of idxs) {
        expect(
          idx,
          `buff fired in cast-index window ${idx}`
        ).toBeGreaterThanOrEqual(1);
        expect(
          idx % 2,
          `cast-index window ${idx} should be ODD (Singing)`
        ).toBe(1);
      }
    });

    it('DISCRIMINATING: ungated full-value (raw-parser reading, no alternation) fires on EVERY shot, not just Singing ones', () => {
      const cf = mintBuff(ungated.events, 'casterAtkPct');
      expect(pctOfCasterAtk(cf, mintAtk)).toEqual([45.02]);
      expect(cf.length).toBe(mintShots(ungated.events).length * 4);
      expect(cf.length).toBeGreaterThan(applied.length);
    });

    it('DISCRIMINATING: REVERSED parity (Singing-first) fires starting in an EVEN cast-index window instead', () => {
      const cfBursts = mintBurstFrames(reversedParity.events);
      const cf = mintBuff(reversedParity.events, 'casterAtkPct');
      expect(cf.length).toBeGreaterThan(0);
      const idxs = new Set(cf.map((b) => castIndexBefore(b.frame, cfBursts)));
      for (const idx of idxs) {
        expect(idx % 2, `reversed-parity window ${idx} should be EVEN`).toBe(0);
      }
    });

    it('DISCRIMINATING: removing the toggle leaves `singing` stuck at its initial 0 (Dancing) — the buff NEVER fires', () => {
      expect(mintBuff(noToggle.events, 'casterAtkPct').length).toBe(0);
    });
  });

  describe('M2 — S2 Singing-gated stage-3 trio, gated on the alternation (10s, all allies, solo)', () => {
    const crit = mintBuff(base.events, 'critRatePct');
    const proj = mintBuff(base.events, 'projectileExplosionPct');
    const pierce = mintBuff(base.events, 'pierceDamagePct');
    const bursts = mintBurstFrames(base.events);

    it('fires the FULL 19.94 / 50 / 32.72 (never the old halved 9.97/25/16.36) on Singing rotations, on every ally', () => {
      expect(distinct(crit)).toEqual([19.94]);
      expect(distinct(proj)).toEqual([50]);
      expect(distinct(pierce)).toEqual([32.72]);
      for (const bs of [crit, proj, pierce]) {
        expect(bs.length, 'a stage-3 trio buff did not fire').toBeGreaterThan(
          0
        );
        expect(durations(bs)).toEqual([10]);
        expect(reachesAllAllies(bs)).toEqual([0, 1, 2, 3]);
      }
    });

    it('fires on STRICTLY FEWER than her total burst casts — silent on Dancing rotations', () => {
      expect(bursts.length).toBeGreaterThan(1);
      expect(crit.length).toBeLessThan(bursts.length * 4);
      expect(crit.length).toBeGreaterThan(0);
    });

    it('DISCRIMINATING (parity): every firing falls in an ODD cast-index window (Singing), same alternation as M1', () => {
      const idxs = new Set(crit.map((b) => castIndexBefore(b.frame, bursts)));
      for (const idx of idxs) {
        expect(idx).toBeGreaterThanOrEqual(1);
        expect(idx % 2).toBe(1);
      }
    });

    it('DISCRIMINATING: ungated full-value fires on EVERY burst cast, not just Singing ones', () => {
      const cf = mintBuff(ungated.events, 'critRatePct');
      const cfBursts = mintBurstFrames(ungated.events);
      expect(distinct(cf)).toEqual([19.94]);
      expect(cf.length).toBe(cfBursts.length * 4);
      expect(cf.length).toBeGreaterThan(crit.length);
    });

    it('DISCRIMINATING: removing the toggle leaves the trio permanently silent', () => {
      expect(mintBuff(noToggle.events, 'critRatePct').length).toBe(0);
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

  describe('M4 — the mode system: duet (w/ Prika) is UNGATED full-value every rotation, solo alternates', () => {
    it('S1 Singing buff peaks at the SAME 45.02% in both modes, but duet fires on EVERY full-charge shot while solo fires only on Singing-rotation shots', () => {
      const soloApplied = mintBuff(base.events, 'casterAtkPct');
      const duetApplied = mintBuff(duet.events, 'casterAtkPct');
      const soloPct = pctOfCasterAtk(soloApplied, mintAtk);
      const duetPct = pctOfCasterAtk(duetApplied, mintAtkDuet);
      expect(duetPct).toEqual([45.02]);
      expect(soloPct).toEqual([45.02]); // same peak value — only the GATING differs by mode
      // duet: unconditional, one firing per shot per ally
      expect(duetApplied.length).toBe(mintShots(duet.events).length * 4);
      // solo: gated, strictly fewer firings than her total shot count (Dancing rotations silent)
      expect(soloApplied.length).toBeLessThan(
        mintShots(base.events).length * 4
      );
    });

    it('S2 stage-3 trio reads the SAME full 19.94 / 50 / 32.72 in both modes, but duet fires on EVERY burst cast while solo fires only on Singing-rotation casts', () => {
      const duetCrit = mintBuff(duet.events, 'critRatePct');
      const soloCrit = mintBuff(base.events, 'critRatePct');
      const duetBursts = mintBurstFrames(duet.events);
      const soloBursts = mintBurstFrames(base.events);
      expect(distinct(duetCrit)).toEqual([19.94]);
      expect(distinct(soloCrit)).toEqual([19.94]);
      expect(distinct(mintBuff(duet.events, 'projectileExplosionPct'))).toEqual(
        [50]
      );
      expect(distinct(mintBuff(duet.events, 'pierceDamagePct'))).toEqual([
        32.72,
      ]);
      // duet: unconditional, one firing per burst cast per ally
      expect(duetCrit.length).toBe(duetBursts.length * 4);
      // solo: gated, strictly fewer firings than her total burst-cast count
      expect(soloCrit.length).toBeLessThan(soloBursts.length * 4);
    });
  });
});
