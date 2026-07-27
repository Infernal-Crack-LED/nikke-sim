// PER-UNIT KIT SPEC — `mast-romantic-maid` (Mast: Romantic Maid, Supporter/MG/Water, Burst II,
// cd 40s, ammo 300). Kit-autonomy gauntlet 2026-07-26 (driver, sighted).
//
// One assertion group per KIT LINE (M1..M9 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest-wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters['mast-romantic-maid'].skills, L10):
//   S1 ■ entering Burst stage 1 → self: Drunken, Hit Rate ▼20%, stacks ≤3 continuously     [M3 — normalAttackPct -40]
//      ■ while in Drunken → all allies: Critical Rate ▲20.05% continuously                 [M1 — critRatePct, permanent]
//      ■ while in Drunken → all allies: ATK ▲35.02% of caster ATK continuously             [M2 — casterAtkPct, permanent]
//   S2 ■ entering Burst Stage 3 while Drunken → all allies:
//        Distributed Damage ▲15.03% × Drunken stacks for 10s                               [M4 — distributedDamagePct 30.06]
//        Reload Speed ▲15.04% × Drunken stacks for 10s                                     [M5 — reloadSpeedPct 30.08]
//      ■ Drunken at max stacks at end of Full Burst → self: Hangover, Stunned 10s          [M9 — stun, everyN:3 own casts]
//   BU ■ all allies: Critical Damage ▲40.04% for 10s                                       [M6 — critDamagePct]
//      ■ all allies: Attack Damage ▲15.04% for 10s                                         [M7 — attackDamagePct]
//      ■ all allies if Drunken: ATK ▲(20.06% × stacks) of caster ATK for 10s               [M8 — casterAtkPct 40.12]
//
// DOCUMENTED MODELING DECISIONS UNDER TEST (the override is hand-authored / audited / VALIDATED,
// kit-status mean 0.9996 over two board comps; these are the owner-ruled approximations the test
// PINS, not accidents):
//   (a) Drunken is not a live stack counter — its stack-scaled magnitudes are modeled at the
//       CYCLE AVERAGE of 2 stacks (stacks run 1,2,3 then reset on Hangover): S2's 15.03/15.04 ×2
//       = 30.06/30.08, the burst's 20.06 ×2 = 40.12. Exact for a sole-B2 rotation.
//   (b) The "while in Drunken" / "if in Drunken" team gates are dropped to ALWAYS-ON — a slight
//       overcount during the ~1 rotation after each Hangover before she re-stacks. So M1/M2 are
//       permanent passives and M4/M5/M8 fire unconditionally.
//   (c) M3: Drunken's Hit Rate ▼20%/stack is NOT inert for her own MG spray — at avg 2 stacks ~40%
//       of her rounds miss, modeled as normalAttackPct -40 on SELF (validated vs a real sample).
//   (d) M9 Q5 RECALIBRATION (owner-ruled, flagged): the Hangover stun is gated to every 3rd of HER
//       OWN burst casts (burstCast everyN:3), not the literal prose "every 3rd Full-Burst end" —
//       per the owner ("her own Drunken") and the data (a never-bursting Mast must not be stunned).
//
// Why each assertion discriminates (a test that cannot fail under the nearest-wrong model gates
// nothing). Probed against the live engine (.mrm-probe.ts, 2026-07-26 — 5 mrm casts, 12 Full
// Bursts, one 10.05s stun gap over the 180s fight):
//   M1/M2  the team buffs reach ALL ALLIES (4 holders) and are PERMANENT (expiresFrame null, fired
//          at frame 0). Nearest wrong: a self-only model (holder set collapses to mrm).
//   M2/M8  casterAtkPct resolves off the CASTER's ATK to a FLAT grant (0.3502×staticAtk ≈ 34,927
//          permanent; 0.4012×staticAtk ≈ 40,013 for 10s on each cast), NOT the raw percentage and
//          NOT a % of each ally's own ATK. M2 is permanent (S1), M8 is 10s (burst) — split on
//          expiry. Nearest wrong for M8: an x1-stack model (20.06% → ~20,007 flat).
//   M3     normalAttackPct -40 is SELF-only (holders [mrm]) and LIVE: removing it raises her own
//          total (the ~40% miss rate stops biting) while leaving every ally byte-identical.
//   M4/M5  fire on STAGE-3 ENTRY (the B3 carry's cast frame), NOT on her own stage-2 cast — she is
//          Burst II, so her cast precedes the stage-3 entry by the ~0.5s chain gap. Value is the
//          x2 cycle average (30.06/30.08). Nearest wrong: x1 stacks (15.03/15.04).
//   M6/M7  burst grants to all 4 allies for 10s, once per cast. Nearest wrong: self-only.
//   M9     BEHAVIORAL — the stun emits no event; it is read as a ~10s gap in her shot stream. Over
//          5 casts exactly ONE gap lands, right after the 3rd cast (the everyN:3 phase). Removing
//          the stun deletes the gap; an every-cast model would produce 5. Nearest wrong: no stun.
//
// Fixture: liter(B1) / mast-romantic-maid(B2) / ada(RL B3) / helm(SR B3), boss Fire (control
// default), focus ada. mrm is the SOLE Burst-II caster (crown would out-pick her for the stage-2
// slot at an earlier slot index, leaving her 0 casts), so she casts every Full-Burst cycle the
// 40s CD allows — 5 casts / 180s — which is what exercises M6/M7/M8 and the every-3rd Hangover.
// Deterministic (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const SLUG = 'mast-romantic-maid';
const COMP = ['liter', SLUG, 'ada', 'helm'];
const MRM = 1; // mrm's slot in COMP
const N_ALLIES = COMP.length; // 'allies' includes the caster → 4 holders

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: COMP,
    bossElement: 'Fire',
    focusSlug: 'ada',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res), res };
}

// ---- counterfactual / reference patches (nearest-wrong models) -------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** M1 nearest-wrong: the S1 crit-rate line scoped to self instead of all allies. */
const mrmCritSelf = withPatchedOverride(SLUG, (ov) => {
  const b = ov.skill1.find((x: any) => hasStat(x, 'critRatePct'));
  if (!b) {
    throw new Error('mrm S1 critRatePct missing — fixture is stale');
  }
  b.target = { kind: 'self' };
});
/** M2 nearest-wrong: the S1 caster-ATK line scoped to self. */
const mrmS1AtkSelf = withPatchedOverride(SLUG, (ov) => {
  const b = ov.skill1.find((x: any) => hasStat(x, 'casterAtkPct'));
  if (!b) {
    throw new Error('mrm S1 casterAtkPct missing — fixture is stale');
  }
  b.target = { kind: 'self' };
});
/** M3 reference: the self Hit-Rate-down (normalAttackPct -40) removed — must raise HER total only. */
const mrmNoHitDown = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'normalAttackPct'));
  if (ov.skill1.length === before) {
    throw new Error('mrm S1 normalAttackPct missing — fixture is stale');
  }
});
/** M4/M5 nearest-wrong: the x2 cycle-average knocked to x1 stacks (15.03 / 15.04). */
const mrmX1Stacks = withPatchedOverride(SLUG, (ov) => {
  const b = ov.skill2.find((x: any) => hasStat(x, 'distributedDamagePct'));
  if (!b) {
    throw new Error('mrm S2 distributedDamagePct missing — fixture is stale');
  }
  b.effects.find((e: any) => e.stat === 'distributedDamagePct').value = 15.03;
  b.effects.find((e: any) => e.stat === 'reloadSpeedPct').value = 15.04;
});
/** M6 nearest-wrong: the burst crit-damage line scoped to self. */
const mrmBurstSelf = withPatchedOverride(SLUG, (ov) => {
  const b = ov.burst.find((x: any) => hasStat(x, 'critDamagePct'));
  if (!b) {
    throw new Error('mrm burst critDamagePct missing — fixture is stale');
  }
  b.target = { kind: 'self' };
});
/** M8 nearest-wrong: the burst caster-ATK x2 (40.12) knocked to x1 stacks (20.06). */
const mrmBurstX1 = withPatchedOverride(SLUG, (ov) => {
  const b = ov.burst.find((x: any) => hasStat(x, 'casterAtkPct'));
  if (!b) {
    throw new Error('mrm burst casterAtkPct missing — fixture is stale');
  }
  b.effects.find((e: any) => e.stat === 'casterAtkPct').value = 20.06;
});
/** M9 reference: the Hangover stun removed — the 10s shot gap must vanish. */
const mrmNoStun = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'stun')
  );
  if (ov.skill2.length === before) {
    throw new Error('mrm S2 stun missing — fixture is stale');
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const critSelf = run({ [SLUG]: mrmCritSelf });
const s1AtkSelf = run({ [SLUG]: mrmS1AtkSelf });
const noHitDown = run({ [SLUG]: mrmNoHitDown });
const x1Stacks = run({ [SLUG]: mrmX1Stacks });
const burstSelf = run({ [SLUG]: mrmBurstSelf });
const burstX1 = run({ [SLUG]: mrmBurstX1 });
const noStun = run({ [SLUG]: mrmNoStun });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const shots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot');
const holders = (bs: BuffApply[]) => new Set(bs.map((b) => b.targetIdx));

/** mrm-cast buffApply by stat. */
const mrmBuff = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === MRM && b.stat === stat);

/** mrm's own burst casts, sorted by frame. */
const mrmCasts = (evs: SimEvent[]) =>
  evs
    .filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === SLUG)
    .sort((a, b) => a.frame - b.frame);

/** Every stage-3 cast frame (the B3 carry's casts) — the stageEnter:3 trigger anchor. */
const stage3Frames = (evs: SimEvent[]) =>
  new Set(
    evs
      .filter((e): e is BurstCast => e.kind === 'burstCast' && e.stage === 3)
      .map((c) => c.frame)
  );

/** mrm's normal-bucket total damage. */
const mrmNormalTotal = (evs: SimEvent[]) =>
  dmg(evs)
    .filter((d) => d.slug === SLUG && d.bucket === 'normal')
    .reduce((s, d) => s + d.amount, 0);

/** Consecutive-shot gaps over `threshSec` in mrm's shot stream. */
const shotGaps = (evs: SimEvent[], threshSec: number) => {
  const s = shots(evs)
    .filter((x) => x.slug === SLUG)
    .map((x) => x.sec)
    .sort((a, b) => a - b);
  const gaps: { start: number; dur: number }[] = [];
  for (let i = 1; i < s.length; i++) {
    if (s[i] - s[i - 1] > threshSec) {
      gaps.push({ start: s[i - 1], dur: s[i] - s[i - 1] });
    }
  }
  return gaps;
};

const staticAtk = unitOf(base.res, SLUG).staticAtk;

describe('mast-romantic-maid — kit spec', () => {
  describe('M1 — S1 while-Drunken team Critical Rate ▲20.05% (permanent passive, all allies)', () => {
    const applied = mrmBuff(base.events, 'critRatePct');

    it('is 20.05% to all four allies, permanent (no expiry), fired at battle start', () => {
      expect(applied.length, 'no S1 critRatePct applied').toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([20.05]);
      expect(
        holders(applied).size,
        `reached ${holders(applied).size}, expected ${N_ALLIES}`
      ).toBe(N_ALLIES);
      for (const b of applied) {
        expect(
          b.expiresFrame,
          'the while-Drunken gate is modeled always-on → permanent'
        ).toBeNull();
        expect(b.frame, 'passive fires at battle start').toBe(0);
      }
    });

    it('DISCRIMINATING: a self-only model collapses the holder set to mrm alone', () => {
      expect([...holders(mrmBuff(critSelf.events, 'critRatePct'))]).toEqual([
        MRM,
      ]);
    });
  });

  describe('M2 — S1 while-Drunken team ATK ▲35.02% of caster ATK (casterAtkPct, permanent, all allies)', () => {
    // Permanent (S1) casterAtkPct — split from the burst line (M8) on the null expiry.
    const applied = mrmBuff(base.events, 'casterAtkPct').filter(
      (b) => b.expiresFrame === null
    );
    const expectedFlat = 0.3502 * staticAtk;

    it("is a FLAT add of mrm's ATK (≈0.3502×staticAtk) to all four allies, permanent", () => {
      expect(
        applied.length,
        'no permanent S1 casterAtkPct applied'
      ).toBeGreaterThan(0);
      for (const b of applied) {
        expect(
          b.value,
          'casterAtkPct records a flat grant, not the raw 35.02'
        ).toBeGreaterThan(1000);
        expect(b.value).toBeCloseTo(expectedFlat, 4);
      }
      expect(
        holders(applied).size,
        `reached ${holders(applied).size}, expected ${N_ALLIES}`
      ).toBe(N_ALLIES);
    });

    it('DISCRIMINATING: a self-only model collapses the holder set to mrm alone', () => {
      const cf = mrmBuff(s1AtkSelf.events, 'casterAtkPct').filter(
        (b) => b.expiresFrame === null
      );
      expect([...holders(cf)]).toEqual([MRM]);
    });
  });

  describe('M3 — S1 Drunken Hit Rate ▼20%/stack on SELF (modeled normalAttackPct -40, the ~40% miss rate)', () => {
    const applied = mrmBuff(base.events, 'normalAttackPct');

    it('is -40 on herself alone, permanent', () => {
      expect(
        applied.length,
        'no normalAttackPct debuff applied'
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([-40]);
      expect(
        [...holders(applied)],
        'the miss rate bites HER spray only'
      ).toEqual([MRM]);
      for (const b of applied) {
        expect(b.expiresFrame).toBeNull();
      }
    });

    it('is LIVE: removing it raises her own normal total, leaving every ally byte-identical', () => {
      expect(
        mrmNormalTotal(noHitDown.events),
        'without the miss rate her MG spray must deal MORE'
      ).toBeGreaterThan(mrmNormalTotal(base.events) * 1.3);
      // Self-only: no ally's total moves a single point.
      for (const s of COMP.filter((x) => x !== SLUG)) {
        expect(noHitDown.totals[s], `${s} total must be unchanged`).toBe(
          base.totals[s]
        );
      }
    });
  });

  describe('M4 — S2 Distributed Damage ▲15.03%×stacks (=30.06) to all allies, 10s, on STAGE-3 entry', () => {
    const applied = mrmBuff(base.events, 'distributedDamagePct');

    it('is the x2 cycle-average 30.06% to all four allies for 10 sec', () => {
      expect(applied.length, 'no distributedDamagePct applied').toBeGreaterThan(
        0
      );
      expect([...new Set(applied.map((b) => b.value))]).toEqual([30.06]);
      expect(
        holders(applied).size,
        `reached ${holders(applied).size}, expected ${N_ALLIES}`
      ).toBe(N_ALLIES);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('fires on the B3 stage-3 cast frame, NOT on her own stage-2 cast', () => {
      const s3 = stage3Frames(base.events);
      const own = new Set(mrmCasts(base.events).map((c) => c.frame));
      for (const b of applied) {
        expect(
          s3.has(b.frame),
          `buff frame ${b.frame} is not a stage-3 entry`
        ).toBe(true);
        expect(
          own.has(b.frame),
          'must not coincide with her own stage-2 cast'
        ).toBe(false);
      }
    });

    it('DISCRIMINATING: an x1-stack model would grant 15.03%, not 30.06%', () => {
      expect([
        ...new Set(
          mrmBuff(x1Stacks.events, 'distributedDamagePct').map((b) => b.value)
        ),
      ]).toEqual([15.03]);
    });
  });

  describe('M5 — S2 Reload Speed ▲15.04%×stacks (=30.08) to all allies, 10s, on STAGE-3 entry', () => {
    const applied = mrmBuff(base.events, 'reloadSpeedPct');

    it('is the x2 cycle-average 30.08% to all four allies for 10 sec', () => {
      expect(applied.length, 'no reloadSpeedPct applied').toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([30.08]);
      expect(
        holders(applied).size,
        `reached ${holders(applied).size}, expected ${N_ALLIES}`
      ).toBe(N_ALLIES);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('DISCRIMINATING: an x1-stack model would grant 15.04%, not 30.08%', () => {
      expect([
        ...new Set(
          mrmBuff(x1Stacks.events, 'reloadSpeedPct').map((b) => b.value)
        ),
      ]).toEqual([15.04]);
    });
  });

  describe('M6 — burst Critical Damage ▲40.04% to all allies for 10s', () => {
    const applied = mrmBuff(base.events, 'critDamagePct');

    it('is 40.04% to all four allies for 10 sec, once per cast', () => {
      expect(applied.length, 'no burst critDamagePct applied').toBe(
        mrmCasts(base.events).length * N_ALLIES
      );
      expect([...new Set(applied.map((b) => b.value))]).toEqual([40.04]);
      expect(
        holders(applied).size,
        `reached ${holders(applied).size}, expected ${N_ALLIES}`
      ).toBe(N_ALLIES);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('DISCRIMINATING: a self-only model collapses the holder set to mrm alone', () => {
      expect([...holders(mrmBuff(burstSelf.events, 'critDamagePct'))]).toEqual([
        MRM,
      ]);
    });
  });

  describe('M7 — burst Attack Damage ▲15.04% to all allies for 10s', () => {
    const applied = mrmBuff(base.events, 'attackDamagePct');

    it('is 15.04% to all four allies for 10 sec, once per cast', () => {
      expect(applied.length, 'no burst attackDamagePct applied').toBe(
        mrmCasts(base.events).length * N_ALLIES
      );
      expect([...new Set(applied.map((b) => b.value))]).toEqual([15.04]);
      expect(
        holders(applied).size,
        `reached ${holders(applied).size}, expected ${N_ALLIES}`
      ).toBe(N_ALLIES);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });
  });

  describe('M8 — burst ATK ▲20.06%×stacks (=40.12) of caster ATK to all allies, 10s (casterAtkPct)', () => {
    // 10s (burst) casterAtkPct — split from the permanent S1 line (M2) on the timed expiry.
    const applied = mrmBuff(base.events, 'casterAtkPct').filter(
      (b) => b.expiresFrame !== null
    );
    const expectedFlat = 0.4012 * staticAtk;

    it("is a FLAT add of mrm's ATK (≈0.4012×staticAtk) to all four allies for 10s, once per cast", () => {
      expect(applied.length, 'no burst casterAtkPct applied').toBe(
        mrmCasts(base.events).length * N_ALLIES
      );
      for (const b of applied) {
        expect(
          b.value,
          'casterAtkPct records a flat grant, not the raw 40.12'
        ).toBeGreaterThan(1000);
        expect(b.value).toBeCloseTo(expectedFlat, 4);
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
      expect(
        holders(applied).size,
        `reached ${holders(applied).size}, expected ${N_ALLIES}`
      ).toBe(N_ALLIES);
    });

    it('DISCRIMINATING: an x1-stack model would grant ≈0.2006×staticAtk, not 0.4012×', () => {
      const cf = mrmBuff(burstX1.events, 'casterAtkPct').filter(
        (b) => b.expiresFrame !== null
      );
      expect(
        cf.length,
        'x1 counterfactual produced no burst casterAtkPct'
      ).toBeGreaterThan(0);
      for (const b of cf) {
        expect(b.value).toBeCloseTo(0.2006 * staticAtk, 4);
      }
      expect(Math.abs(cf[0].value - expectedFlat)).toBeGreaterThan(1000);
    });
  });

  describe('M9 — S2 Hangover: stun SELF 10s at max Drunken (every 3rd of her OWN burst casts)', () => {
    const casts = mrmCasts(base.events);
    const gaps = shotGaps(base.events, 9);

    it('she casts more than 3 times so the every-3rd phase is exercised', () => {
      expect(
        casts.length,
        'fixture must produce ≥3 mrm casts'
      ).toBeGreaterThanOrEqual(3);
    });

    it('produces exactly ONE ~10s shot gap, right after the 3rd cast', () => {
      expect(
        gaps.length,
        `${gaps.length} gaps over 5 casts — expected exactly 1 (everyN:3)`
      ).toBe(1);
      const third = casts[2].sec;
      expect(gaps[0].dur, 'the stun is 10 sec').toBeGreaterThanOrEqual(9);
      expect(gaps[0].dur).toBeLessThanOrEqual(11.5);
      expect(
        Math.abs(gaps[0].start - third),
        `gap starts ${gaps[0].start.toFixed(2)}s vs 3rd cast ${third.toFixed(2)}s`
      ).toBeLessThan(1.5);
    });

    it('no gap follows casts 1, 2, 4, 5 (the stun is NOT every cast)', () => {
      for (const idx of [0, 1, 3, 4]) {
        if (idx >= casts.length) {
          continue;
        }
        const c = casts[idx].sec;
        const near = gaps.filter((g) => Math.abs(g.start - c) < 1.5);
        expect(
          near.length,
          `a stun gap landed after non-3rd cast ${idx + 1}`
        ).toBe(0);
      }
    });

    it('DISCRIMINATING: removing the stun deletes the gap (it is live, not cosmetic)', () => {
      expect(
        shotGaps(noStun.events, 9).length,
        'noStun must fire continuously'
      ).toBe(0);
    });
  });
});
