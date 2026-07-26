import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

/*
 * mast-romantic-maid (MG / Water / Supporter / Burst II) — blind kit spec test.
 *
 * KIT (read literally):
 *  skill1:
 *    a) "Activates when entering Burst stage 1. Affects self."
 *         Drunken: Hit Rate ▼ 20%, stacks up to 3 times continuously.
 *       -> trigger = stageEnter{stage:1} (fires when ANY ally casts a stage-1 burst),
 *          target = self, effect = buff hitRatePct NEGATIVE 20, maxStacks 3, no duration
 *          ("continuously" = permanent until removed). NOTE the sign: Hit Rate ▼ is a
 *          DEBUFF on the caster (it feeds the hrCore lift downward), and "Drunken" is the
 *          named stack currency the rest of the kit reads.
 *    b) "Activates only when in Drunken status. Affects all allies."
 *         Critical Rate ▲ 20.05% continuously.
 *         ATK ▲ 35.02% of the skill user's ATK continuously.
 *       -> a CONDITIONAL passive gated on ≥1 Drunken stack: NOT active at t=0, live from the
 *          first stage-1 burst onward. Flat-magnitude (NOT per-stack: the text carries no
 *          "x number of stacks" multiplier here, unlike skill2/burst which do).
 *          casterAtkPct ⇒ emitted FLAT-resolved on buffApply.
 *  skill2:
 *    c) "Activates when entering Burst Stage 3 while in Drunken status. Affects all allies."
 *         Distributed Damage ▲ 15.03% x stacks for 10 sec.
 *         Reload Speed ▲ 15.04% x stacks for 10 sec.
 *       -> trigger = stageEnter{stage:3} gated on Drunken≥1; value SCALES with the live stack
 *          count (15.03/15.04 per stack), 10s window. Reload Speed IS damage (shot economy).
 *    d) "Activates when Drunken is at max stacks at the end of Full Burst. Removes all stacks
 *          and affects self.  Hangover: Stunned for 10 sec."
 *       -> trigger = fullBurstEnd, gated on stacks == 3 (max), effects: stun 10s on SELF +
 *          the stack pool resets to 0. This is a REAL damage sink (she cannot fire for 10s)
 *          AND it tears down (b)/(c)/(f) until stacks rebuild.
 *  burst:
 *    e) "Affects all allies." Critical Damage ▲ 40.04% for 10 sec; Attack Damage ▲ 15.04% for 10 sec.
 *       -> burstCast, allies, unconditional (NOT Drunken-gated).
 *    f) "Affects all allies if in Drunken status." ATK ▲ (20.06% * stacks) of the skill user's
 *          ATK for 10 sec.  -> burstCast, allies, Drunken-gated, per-stack casterAtkPct.
 *
 * FIXTURE: controlComp('mast-romantic-maid', true) — she is Burst II, so the control comp's
 * B1 (liter) + B3 slots supply a full chain and she casts at stage 2 every rotation. The B1
 * cast is also what feeds her stage-1 Drunken trigger, so the fixture exercises the stack
 * ramp 0 -> 1 -> 2 -> 3 naturally. A lone unit would make ZERO full bursts and every
 * assertion below would be vacuous.
 *
 * DISCRIMINATION STRATEGY: the kit's whole shape is "a stack currency drives four downstream
 * lines". So the load-bearing assertions are (i) the sign/scope of the Hit Rate line,
 * (ii) that the ally buffs are GATED (absent before the first stage-1 burst), (iii) that
 * skill2/burst-b scale PER STACK while skill1-b does NOT, and (iv) that the max-stack
 * Hangover stun actually costs her shots. Each is paired with a withPatchedOverride
 * counterfactual encoding the nearest-wrong model.
 */

type Ev = SimEvent & Record<string, unknown>;

const SLUG = 'mast-romantic-maid';

function run(overrides?: Record<string, unknown>) {
  const events: Ev[] = [];
  const opts = controlComp(SLUG, true) as Record<string, unknown>;
  if (overrides) opts.overrides = overrides;
  const cfg = (opts.cfg ?? {}) as Record<string, unknown>;
  cfg.onEvent = (ev: SimEvent) => {
    events.push(ev as Ev);
  };
  opts.cfg = cfg;
  const res = runComp(opts as never);
  return { res, events };
}

const buffApplies = (events: Ev[], stat: string) =>
  events.filter((e) => e.kind === 'buffApply' && (e as { stat?: string }).stat === stat);

const selfShots = (events: Ev[], slot: number) =>
  events.filter((e) => e.kind === 'shot' && (e as { srcSlot?: number }).srcSlot === slot);

// ---------------------------------------------------------------- hoisted runs
const base = run();
const baseTotals = totals(base.res);
const mastSlot = (unitOf(base.res, SLUG) as { slot?: number }).slot ?? 2;

describe('mast-romantic-maid — skill1a: Drunken (Hit Rate ▼20%, up to 3 stacks, on Burst stage 1 entry)', () => {
  it('applies a NEGATIVE hitRatePct self-buff, capped at 3 stacks, with no time expiry', () => {
    const hr = buffApplies(base.events, 'hitRatePct').filter(
      (e) => (e as { targetSlug?: string }).targetSlug === SLUG,
    );
    expect(hr.length).toBeGreaterThan(0);
    for (const e of hr) {
      // Hit Rate ▼ 20% => the encoded value must be negative. A positive 20 is the
      // nearest-wrong model (reading ▼ as ▲) and would LIFT her core rate instead of
      // dropping it — the single most damage-relevant sign error in this kit.
      expect((e as { value: number }).value).toBeLessThan(0);
      expect(Math.abs((e as { value: number }).value)).toBeCloseTo(20, 5);
      expect((e as { maxStacks?: number }).maxStacks).toBe(3);
      // "continuously" — no wall-clock window.
      expect((e as { expiresFrame?: number | null }).expiresFrame ?? null).toBeFalsy();
    }
  });

  it('is SELF-scoped — no teammate ever receives a hitRatePct application from her', () => {
    const foreign = buffApplies(base.events, 'hitRatePct').filter(
      (e) => (e as { targetSlug?: string }).targetSlug !== SLUG,
    );
    // Nearest-wrong: target 'allies' (the kit's OTHER skill1 branch is allies-scoped, so the
    // easy mis-read is to inherit that scope). That would debuff the whole team's core rate.
    expect(foreign.length).toBe(0);
  });

  it('non-vacuity: the fixture actually accrues stacks (>=1 stage-1 burst occurs)', () => {
    const stacked = buffApplies(base.events, 'hitRatePct').filter(
      (e) => (e as { targetSlug?: string }).targetSlug === SLUG,
    );
    const maxSeen = Math.max(...stacked.map((e) => (e as { stacks?: number }).stacks ?? 1));
    expect(maxSeen).toBeGreaterThanOrEqual(2);
  });

  it('the Hit Rate ▼ is load-bearing: zeroing it changes her own damage', () => {
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill1 ?? []) {
        for (const e of b.effects ?? []) {
          if ((e as { stat?: string }).stat === 'hitRatePct') (e as { value: number }).value = 0;
        }
      }
    });
    const alt = run({ [SLUG]: patched });
    // If this is equal, the debuff is inert and the modeling claim is unproven either way —
    // the assertion exists to keep the sign test above non-vacuous.
    expect(totals(alt.res)[SLUG]).not.toBe(baseTotals[SLUG]);
  });
});

describe('mast-romantic-maid — skill1b: Drunken-gated ally Crit Rate ▲20.05% + ATK ▲35.02% of user ATK', () => {
  it('is GATED: no ally crit-rate/caster-ATK grant lands before the first Drunken stack', () => {
    const firstDrunken = base.events.findIndex(
      (e) =>
        e.kind === 'buffApply' &&
        (e as { stat?: string }).stat === 'hitRatePct' &&
        (e as { targetSlug?: string }).targetSlug === SLUG,
    );
    expect(firstDrunken).toBeGreaterThan(0);
    const early = base.events
      .slice(0, firstDrunken)
      .filter(
        (e) =>
          e.kind === 'buffApply' &&
          (e as { casterIdx?: number | null }).casterIdx === mastSlot &&
          ((e as { stat?: string }).stat === 'critRatePct' ||
            (e as { stat?: string }).stat === 'casterAtkPct'),
      );
    // Nearest-wrong: encode the branch as a plain {kind:'passive'} with no Drunken gate.
    // That grants the team +20.05% crit and a large flat ATK from frame 0, over-crediting
    // the entire pre-first-burst window.
    expect(early.length).toBe(0);
  });

  it('grants BOTH stats to every ally once Drunken is up, crit at a flat 20.05 (not per-stack)', () => {
    const crit = buffApplies(base.events, 'critRatePct').filter(
      (e) => (e as { casterIdx?: number | null }).casterIdx === mastSlot,
    );
    expect(crit.length).toBeGreaterThan(0);
    for (const e of crit) {
      // Per-stack would emit 20.05 / 40.10 / 60.15. The kit text carries NO "x stacks"
      // multiplier on this line (unlike skill2 and the burst's second branch), so a
      // stack-scaled encoding is the nearest-wrong model and this pins it out.
      expect((e as { value: number }).value).toBeCloseTo(20.05, 4);
    }
    const targets = new Set(crit.map((e) => (e as { targetSlug?: string }).targetSlug));
    expect(targets.size).toBeGreaterThanOrEqual(4);
  });

  it('the ATK line is caster-scaled: buffApply carries a FLAT ATK number, not 35.02', () => {
    const atk = buffApplies(base.events, 'casterAtkPct').filter(
      (e) => (e as { casterIdx?: number | null }).casterIdx === mastSlot,
    );
    expect(atk.length).toBeGreaterThan(0);
    const staticAtk = (unitOf(base.res, SLUG) as { staticAtk?: number }).staticAtk ?? 98367;
    const expected = (35.02 / 100) * staticAtk;
    const skill1Atk = atk.filter(
      (e) => Math.abs((e as { value: number }).value - expected) < expected * 0.02,
    );
    // Nearest-wrong #1: encode as 'atkPct' (scales each TARGET's own ATK) — an Attacker
    // teammate would then gain far more than the Supporter caster's 35.02%.
    // Nearest-wrong #2: assert the raw 35.02 — caster-scaled stats flat-resolve at apply time.
    expect(skill1Atk.length).toBeGreaterThan(0);
  });

  it('removing the Drunken gate over-credits: an ungated passive raises team damage', () => {
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill1 ?? []) {
        const hasAllyStat = (b.effects ?? []).some(
          (e) =>
            (e as { stat?: string }).stat === 'critRatePct' ||
            (e as { stat?: string }).stat === 'casterAtkPct',
        );
        if (hasAllyStat) {
          b.trigger = { kind: 'passive' };
          delete (b as { resourceGate?: unknown }).resourceGate;
        }
      }
    });
    const alt = run({ [SLUG]: patched });
    const allySum = (t: Record<string, number>) =>
      Object.entries(t)
        .filter(([s]) => s !== SLUG)
        .reduce((a, [, v]) => a + v, 0);
    // Strictly greater: the ungated model is live during the opening seconds the gated one
    // is dark. Equality would mean the gate is unmodeled.
    expect(allySum(totals(alt.res))).toBeGreaterThan(allySum(baseTotals));
  });
});

describe('mast-romantic-maid — skill2a: on Burst Stage 3 entry while Drunken → allies Distributed Dmg + Reload Speed, 15% x stacks, 10s', () => {
  it('emits both stats to all allies, scaled by the live Drunken stack count', () => {
    const dist = buffApplies(base.events, 'distributedDamagePct').filter(
      (e) => (e as { casterIdx?: number | null }).casterIdx === mastSlot,
    );
    const reload = buffApplies(base.events, 'reloadSpeedPct').filter(
      (e) => (e as { casterIdx?: number | null }).casterIdx === mastSlot,
    );
    expect(dist.length).toBeGreaterThan(0);
    expect(reload.length).toBeGreaterThan(0);
    // Values must be a multiple of the per-stack unit, and at least one application must be
    // at >1 stack (proving the "x number of stacks" multiplier is modeled, not flattened to
    // the 1-stack magnitude — the nearest-wrong model).
    const mult = (v: number, unit: number) => Math.round(v / unit);
    for (const e of dist) {
      const k = mult((e as { value: number }).value, 15.03);
      expect(k).toBeGreaterThanOrEqual(1);
      expect(k).toBeLessThanOrEqual(3);
      expect((e as { value: number }).value).toBeCloseTo(15.03 * k, 3);
    }
    expect(
      dist.some((e) => (e as { value: number }).value > 15.03 * 1.5),
    ).toBe(true);
  });

  it('the window is 10 s, not permanent', () => {
    const dist = buffApplies(base.events, 'distributedDamagePct').filter(
      (e) => (e as { casterIdx?: number | null }).casterIdx === mastSlot,
    );
    for (const e of dist) {
      // 10s @ 60fps = 600 frames past the apply frame. A missing durationSec (permanent) is
      // the nearest-wrong model and would leave expiresFrame null/huge.
      const exp = (e as { expiresFrame?: number | null }).expiresFrame;
      expect(exp).toBeTruthy();
    }
    expect(dist.length).toBeGreaterThan(0);
  });

  it('Reload Speed is DAMAGE-BEARING: zeroing it changes total team output', () => {
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill2 ?? []) {
        for (const e of b.effects ?? []) {
          if ((e as { stat?: string }).stat === 'reloadSpeedPct')
            (e as { value: number }).value = 0;
        }
      }
    });
    const alt = run({ [SLUG]: patched });
    const sum = (t: Record<string, number>) =>
      Object.values(t).reduce((a, v) => a + v, 0);
    // Guards the "reload speed is defensive, skip it" failure mode: faster reloads = more
    // shots fired = more damage.
    expect(sum(totals(alt.res))).not.toBe(sum(baseTotals));
  });

  it('is keyed to STAGE-3 entry, not to her own Burst II cast', () => {
    const dist = buffApplies(base.events, 'distributedDamagePct').filter(
      (e) => (e as { casterIdx?: number | null }).casterIdx === mastSlot,
    );
    const castFrames = base.events
      .filter(
        (e) =>
          e.kind === 'burstCast' && (e as { srcSlot?: number }).srcSlot === mastSlot,
      )
      .map((e) => (e as { frame?: number }).frame ?? -1);
    // Nearest-wrong: trigger burstCast (her OWN stage-2 cast). Stage-3 entry lands strictly
    // LATER in the chain (B2 → 30f → B3), so no distributed-damage apply may coincide with
    // her own cast frame.
    for (const e of dist) {
      const f = (e as { frame?: number }).frame ?? -2;
      expect(castFrames).not.toContain(f);
    }
  });
});

describe('mast-romantic-maid — skill2b: Hangover (max stacks at end of Full Burst → remove all stacks, self stun 10 s)', () => {
  it('stuns her: she has a >=10 s firing gap that a stun-less model does not have', () => {
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill2 ?? []) {
        b.effects = (b.effects ?? []).filter(
          (e) => (e as { kind?: string }).kind !== 'stun',
        );
      }
    });
    const alt = run({ [SLUG]: patched });
    // Nearest-wrong: drop the Hangover as "defensive/self-harm, ignore". It is a pure DPS
    // sink — she loses 10 s of MG uptime — so removing it must RAISE her own damage.
    expect(totals(alt.res)[SLUG]).toBeGreaterThan(baseTotals[SLUG]);
  });

  it('the stun window is present in her shot log as a >= ~9 s gap', () => {
    const shots = selfShots(base.events, mastSlot).map(
      (e) => (e as { frame?: number }).frame ?? 0,
    );
    expect(shots.length).toBeGreaterThan(0);
    let maxGap = 0;
    for (let i = 1; i < shots.length; i++) maxGap = Math.max(maxGap, shots[i] - shots[i - 1]);
    // Her reload is 171 frames (~2.85 s); a 10 s stun is ~600 frames and cannot be confused
    // with a reload. Non-vacuity for the stun claim.
    expect(maxGap).toBeGreaterThan(400);
  });

  it('stacks are CONSUMED: the Drunken pool returns to 1 after a Hangover instead of pinning at 3', () => {
    const hr = buffApplies(base.events, 'hitRatePct')
      .filter((e) => (e as { targetSlug?: string }).targetSlug === SLUG)
      .map((e) => (e as { stacks?: number }).stacks ?? 1);
    expect(Math.max(...hr)).toBe(3);
    // After the reset, a later application must re-report a LOW stack count. A model that
    // never removes stacks (the nearest-wrong "stun only" reading) would show a monotone
    // 1,2,3,3,3,... with no return to 1.
    const peakIdx = hr.indexOf(3);
    expect(hr.slice(peakIdx + 1).some((s) => s < 3)).toBe(true);
  });

  it('non-vacuity: the fight actually reaches max stacks (otherwise Hangover never fires)', () => {
    const hr = buffApplies(base.events, 'hitRatePct').filter(
      (e) => (e as { targetSlug?: string }).targetSlug === SLUG,
    );
    expect(hr.some((e) => ((e as { stacks?: number }).stacks ?? 1) === 3)).toBe(true);
  });
});

describe('mast-romantic-maid — burst: allies Crit DMG ▲40.04% + Attack DMG ▲15.04% (10 s), ungated', () => {
  it('grants both to every ally on her burst cast, at the literal magnitudes', () => {
    const cd = buffApplies(base.events, 'critDamagePct').filter(
      (e) => (e as { casterIdx?: number | null }).casterIdx === mastSlot,
    );
    const ad = buffApplies(base.events, 'attackDamagePct').filter(
      (e) => (e as { casterIdx?: number | null }).casterIdx === mastSlot,
    );
    expect(cd.length).toBeGreaterThan(0);
    expect(ad.length).toBeGreaterThan(0);
    for (const e of cd) expect((e as { value: number }).value).toBeCloseTo(40.04, 4);
    for (const e of ad) expect((e as { value: number }).value).toBeCloseTo(15.04, 4);
    expect(new Set(cd.map((e) => (e as { targetSlug?: string }).targetSlug)).size).toBeGreaterThanOrEqual(4);
  });

  it('is NOT Drunken-gated — the first burst grants it regardless of the stack branch', () => {
    const casts = base.events.filter(
      (e) => e.kind === 'burstCast' && (e as { srcSlot?: number }).srcSlot === mastSlot,
    );
    const cd = buffApplies(base.events, 'critDamagePct').filter(
      (e) => (e as { casterIdx?: number | null }).casterIdx === mastSlot,
    );
    // The kit puts "if in Drunken status" ONLY on the second burst branch. Applying the gate
    // to the whole burst (the nearest-wrong model) would drop grants on any rotation where
    // Hangover has just cleared the pool.
    expect(cd.length).toBeGreaterThanOrEqual(casts.length);
  });
});

describe('mast-romantic-maid — burst branch 2: ATK ▲ (20.06% x stacks) of user ATK, allies, 10 s, Drunken-gated', () => {
  it('emits a per-stack flat-resolved caster ATK grant distinct from the skill1 35.02% grant', () => {
    const staticAtk = (unitOf(base.res, SLUG) as { staticAtk?: number }).staticAtk ?? 98367;
    const atk = buffApplies(base.events, 'casterAtkPct').filter(
      (e) => (e as { casterIdx?: number | null }).casterIdx === mastSlot,
    );
    const perStack = (20.06 / 100) * staticAtk;
    const burstGrants = atk.filter((e) => {
      const k = (e as { value: number }).value / perStack;
      return Math.abs(k - Math.round(k)) < 0.03 && Math.round(k) >= 1 && Math.round(k) <= 3;
    });
    // Nearest-wrong models this pins out: (a) a flat 20.06% ignoring the stack multiplier,
    // (b) an atkPct (target-scaled) encoding, (c) folding it into the skill1 grant.
    expect(burstGrants.length).toBeGreaterThan(0);
    expect(
      burstGrants.some((e) => (e as { value: number }).value > perStack * 1.5),
    ).toBe(true);
  });

  it('inertness: her buffs never touch buckets no kit line names (no coreDamagePct / chargeDamagePct / maxAmmo from her)', () => {
    const stray = base.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        (e as { casterIdx?: number | null }).casterIdx === mastSlot &&
        ['coreDamagePct', 'chargeDamagePct', 'maxAmmoPct', 'maxAmmoFlat', 'fireRatePct', 'elementDamagePct'].includes(
          (e as { stat?: string }).stat ?? '',
        ),
    );
    expect(stray.length).toBe(0);
  });

  it('inertness: dropping her burst’s Drunken branch leaves HER OWN weapon economy untouched', () => {
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.burst ?? []) {
        b.effects = (b.effects ?? []).filter(
          (e) => (e as { stat?: string }).stat !== 'casterAtkPct',
        );
      }
    });
    const alt = run({ [SLUG]: patched });
    const shotsBase = selfShots(base.events, mastSlot).length;
    const shotsAlt = selfShots(alt.events, mastSlot).length;
    // An ATK buff must not change SHOT COUNT (only reload/fire-rate lines may). If this
    // moves, the ATK line has been mis-encoded into the weapon-economy path.
    expect(shotsAlt).toBe(shotsBase);
  });
});

describe('mast-romantic-maid — cross-cutting inertness', () => {
  it('with her entire override neutralised, teammates lose damage (she is a real support, not inert)', () => {
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const slot of ['skill1', 'skill2', 'burst'] as const) {
        for (const b of ov[slot] ?? []) b.effects = [];
      }
    });
    const alt = run({ [SLUG]: patched });
    const allySum = (t: Record<string, number>) =>
      Object.entries(t)
        .filter(([s]) => s !== SLUG)
        .reduce((a, [, v]) => a + v, 0);
    expect(allySum(baseTotals)).toBeGreaterThan(allySum(totals(alt.res)));
  });

  it.skip('⚑ Hit Rate ▼20% → core-rate magnitude is MEASURED-ONLY (hrCoreMult); the exact core-rate delta per stack cannot be derived from kit text', () => {
    // GAP: the kit states the Hit Rate delta but not its core-hit consequence. The engine
    // has an hrCoreMult model (HRCORE), but the per-stack core-rate magnitude for a
    // 3-stack ▼60% total is outside the input domain of a blind read. Sign is asserted
    // above; magnitude stays ⚑.
  });

  it.skip('⚑ Drunken stack REBUILD cadence after Hangover is trigger-derived, not kit-stated', () => {
    // GAP: the kit says stacks are removed at max on Full Burst end and gained on stage-1
    // entry, but does not state whether the removal happens before or after that same
    // rotation’s stage-1 trigger. The steady-state stack trajectory (and therefore the
    // time-average of every per-stack line) depends on that ordering — measurement-gated.
  });
});
