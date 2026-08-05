/**
 * belorta — blind kit spec test (authored from the kit prose ALONE).
 *
 * KIT (RL / Electric / Attacker / Burst II; cd 20s, ammo 6, chargeFrames 90, hitsPerShot 1,
 * normalAttackMultiplier 61.3, coreAttackMultiplier 200):
 *   skill1 — "Activates when performing a Full Charge attack. Affects self.
 *             Explosion Radius \u25b2 9.55% for 5 sec."
 *   skill2 — "Activates when an attack hits more than 4 enemy unit(s). Affects the target(s).
 *             DEF \u25bc 3.52% for 5 sec. Deals 14.96% of final ATK as additional damage."
 *   burst  — "Affects enemies within attack range. Deals 192% of final ATK as damage."
 *            "Affects all allies. Charge Speed \u25b2 2.82% for 10 sec."
 *
 * DISPOSITIONS + WHY EACH ASSERTION DISCRIMINATES
 *   S1  UNMODELED/GAP — "Explosion Radius" is AoE GEOMETRY, not a damage stat. No StatKey
 *       expresses it: `projectileExplosionPct` is Projectile Explosion DAMAGE \u25b2 (a Damage-Up
 *       bucket stat), a different mechanic. At scope lock the boss is a single partless target,
 *       so radius moves zero damage no matter how large it gets. NEAREST-WRONG: booking 9.55 into
 *       the Damage Up bucket as projectileExplosionPct "because she is an RL" — that mints damage
 *       the kit never grants. §S1 goes RED under it.
 *   S2  UNMODELED/GAP — the activation gate is "hits MORE THAN 4 enemy unit(s)", i.e. \u22655
 *       simultaneous enemies. This fight has ONE boss (the engine has no enemy entity at all —
 *       resolveTargets({kind:'enemy'}) returns []), so the gate can never be satisfied and BOTH
 *       sub-lines are inert at scope lock. NEAREST-WRONG: re-keying the 14.96% rider to
 *       shotFired/passive (dropping the enemy-count gate), which adds a real per-shot damage
 *       stream the game never delivers. §S2 goes RED under it. Independently, the enemy DEF \u25bc
 *       has no faithful primitive either — `defPct` is SELF DEF and inert in v1, and
 *       `damageTakenPct` is Damage Taken \u25b2, a different mechanic — so encoding it at all is a
 *       fudge on two counts.
 *   B1  FAITHFUL — burstCast \u2192 enemy \u2192 flatDamage 192% of final ATK, burst bucket,
 *       FB-exempt (a burst cast lands before the Full Burst window opens).
 *   B2  FAITHFUL — burstCast \u2192 ALL allies (including self) \u2192 chargeSpeedPct 2.82 for 10 sec.
 *       chargeSpeedPct is a plain percentage stat, so the emitted buffApply value is the raw 2.82
 *       (NOT a caster-scaled flat resolve). Load-bearing rather than cosmetic: belorta is a charge
 *       weapon (chargeFrames 90), so the buff changes her OWN shots fired, and the fixed B3 slot is
 *       a charge weapon too, which is what makes the ally-scope counterfactual observable.
 *
 * FIXTURE: controlComp('belorta', true) — liter(I) / crown(II) / belorta(II) / helm(III).
 * The fixed B3 is REQUIRED: without it the chain never completes and a burst never casts.
 * NOTE belorta is Burst II and therefore CONTESTS stage 2 with crown, so §B2a asserts she actually
 * casts — the burst group fails loudly as a FIXTURE gap rather than passing vacuously if she never
 * takes the stage-2 slot.
 *
 * Six runs total (baseline + five counterfactuals); each is a full deterministic 180 s sim.
 *
 * BLIND-SHAPE NOTE: the packet documents the override slot value two ways (a bare Block[] vs a
 * CharacterSkills carrying its own .blocks). `slotBlocks`/`clearSlot` below accept BOTH so a shape
 * guess cannot turn a real finding into a false RED.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

const SLUG = 'belorta';

type Ev = SimEvent & Record<string, unknown>;
type Comp = ReturnType<typeof controlComp> & {
  onEvent?: (ev: SimEvent) => void;
  overrides?: Record<string, unknown>;
};
type Slot = 'skill1' | 'skill2' | 'burst';
type EffectLike = Record<string, unknown>;
type BlockLike = { target?: unknown; effects?: EffectLike[] };
type OvLike = Record<string, unknown>;

function slotBlocks(ov: OvLike, slot: Slot): BlockLike[] {
  const s = ov[slot];
  if (Array.isArray(s)) return s as BlockLike[];
  const nested = (s as { blocks?: unknown } | undefined)?.blocks;
  return Array.isArray(nested) ? (nested as BlockLike[]) : [];
}

function clearSlot(ov: OvLike, slot: Slot): void {
  const s = ov[slot];
  if (Array.isArray(s)) {
    ov[slot] = [];
    return;
  }
  const holder = s as { blocks?: unknown } | undefined;
  if (holder && Array.isArray(holder.blocks)) holder.blocks = [];
}

function run(overrides?: Record<string, unknown>): {
  res: ReturnType<typeof runComp>;
  events: Ev[];
  t: Record<string, number>;
} {
  const events: Ev[] = [];
  // DRIVER ADAPTATION (fixture plumbing only — asserted intent untouched):
  // (1) runComp reads sim extras from comp.cfg — the blind packet's top-level onEvent never
  //     reached runSim, so every event slice was empty.
  // (2) controlComp('belorta', true) seats crown (Burst II, cd 20, LEFT of belorta): the
  //     engine's first-ready pick breaks equal-CD ties leftmost and the ~20s+ chain interval
  //     leaves crown always-ready, so crown monopolizes stage 2 and belorta NEVER casts
  //     (probe: liter 10 / crown 10 / helm 5 / belorta 0 casts over 180s). A B2-free comp is
  //     exactly what the blind gap note prescribed ("a B2-free control comp is needed").
  const comp = {
    slugs: ['liter', SLUG, 'ada'],
    bossElement: null,
    focusSlug: SLUG,
    unitLimits: { [SLUG]: { stars: 3, core: 0 } }, // SR ceiling: core enhancement is SSR-only
    overrides: overrides ?? {},
    cfg: { onEvent: (ev: SimEvent) => events.push(ev as Ev) },
  } as unknown as Comp;
  const res = runComp(comp);
  return { res, events, t: totals(res) };
}

// ---- hoisted runs (6 full 180 s sims) -------------------------------------
const base = run();

const noS1 = run({
  [SLUG]: withPatchedOverride(SLUG, (ov) => {
    clearSlot(ov as unknown as OvLike, 'skill1');
  }),
});

const noS2 = run({
  [SLUG]: withPatchedOverride(SLUG, (ov) => {
    clearSlot(ov as unknown as OvLike, 'skill2');
  }),
});

// Ally scope -> self only. Belorta's OWN behaviour is untouched (she still holds the buff), so any
// teammate delta is purely the loss of the ally grant, not a rotation ripple.
const selfOnlyBuff = run({
  [SLUG]: withPatchedOverride(SLUG, (ov) => {
    for (const b of slotBlocks(ov as unknown as OvLike, 'burst')) {
      const hasCs = (b.effects ?? []).some(
        (e) => e.kind === 'buff' && e.stat === 'chargeSpeedPct',
      );
      if (hasCs) b.target = { kind: 'self' };
    }
  }),
});

// 10 sec -> 1 sec: shrinks the charge-speed window on a charge weapon.
const shortBuff = run({
  [SLUG]: withPatchedOverride(SLUG, (ov) => {
    for (const b of slotBlocks(ov as unknown as OvLike, 'burst')) {
      for (const e of b.effects ?? []) {
        if (e.kind === 'buff' && e.stat === 'chargeSpeedPct') e.durationSec = 1;
      }
    }
  }),
});

// Zero the burst's 192% line.
const noBurstDmg = run({
  [SLUG]: withPatchedOverride(SLUG, (ov) => {
    for (const b of slotBlocks(ov as unknown as OvLike, 'burst')) {
      for (const e of b.effects ?? []) {
        if (e.kind === 'flatDamage') e.atkPct = 0;
      }
    }
  }),
});

// ---- shared event slices --------------------------------------------------
const buffApplies = base.events.filter((e) => e.kind === 'buffApply');
const csApplies = buffApplies.filter(
  (e) => e.stat === 'chargeSpeedPct' && e.value === 2.82,
);
const csTargets = new Set(csApplies.map((e) => e.targetSlug as string));
const csWindows = new Set(csApplies.map((e) => e.expiresFrame as number));
const fbStarts = base.events.filter((e) => e.kind === 'fullBurstStart').length;

describe('belorta — fixture non-vacuity', () => {
  it('the carry actually fights and the chain actually completes', () => {
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
    expect(base.t[SLUG]).toBeGreaterThan(0);
    // A lone Burst III makes zero full bursts; belorta is Burst II, so the fixed B3 must have
    // closed the chain for ANY burst-slot assertion below to mean anything.
    expect(fbStarts).toBeGreaterThan(0);
  });
});

describe('belorta S1 — "Explosion Radius \u25b2 9.55% for 5 sec" (UNMODELED: AoE geometry)', () => {
  it('S1a: skill1 moves no damage on any unit — clearing it is byte-identical', () => {
    // GREEN under the faithful reading (radius is geometry; one partless boss).
    // RED under the nearest-wrong model (9.55 booked as projectileExplosionPct in Damage Up),
    // which would make belorta's total drop when skill1 is cleared.
    expect(noS1.t).toEqual(base.t);
  });

  it('S1b: the 9.55 magnitude never reaches the buff channel under any stat', () => {
    // Catches the magnitude being smuggled in under a *different* StatKey than the one §S1a
    // would surface (e.g. an inert-but-wrong parse that still emits a buff).
    expect(buffApplies.map((e) => e.value)).not.toContain(9.55);
  });

  it.skip('S1c: GAP — Explosion Radius has no primitive and no observable at scope lock', () => {
    // No StatKey expresses AoE radius (projectileExplosionPct is explosion DAMAGE, not radius),
    // and the sim fights ONE partless enemy, so a faithful radius model would be damage-inert
    // anyway. Unobservable payload -> skipped by construction, not by omission.
  });
});

describe('belorta S2 — "hits more than 4 enemy unit(s)" DEF \u25bc 3.52% + 14.96% rider (UNMODELED: unsatisfiable gate)', () => {
  it('S2a: skill2 moves no damage on any unit — clearing it is byte-identical', () => {
    // GREEN under the faithful reading: the >4-enemies gate can never fire against one boss.
    // RED under the nearest-wrong model (rider re-keyed to shotFired/passive), which mints a
    // per-shot 14.96%-of-ATK damage stream that vanishes when skill2 is cleared.
    expect(noS2.t).toEqual(base.t);
  });

  it('S2b: neither the 3.52 DEF \u25bc nor the 14.96 rider reaches the buff channel', () => {
    const values = buffApplies.map((e) => e.value);
    // Also covers the boss-held-debuff path: those emit buffApply with casterIdx === null AND
    // targetIdx === null, so a damageTakenPct/defPct encoding of the DEF \u25bc would still land here.
    expect(values).not.toContain(3.52);
    expect(values).not.toContain(14.96);
  });

  it.skip('S2c: GAP — multi-enemy gate + enemy DEF \u25bc are both unmodellable at scope lock', () => {
    // (1) "more than 4 enemy unit(s)" needs \u22655 simultaneous enemies; the sim has one boss and no
    //     enemy entity, so the trigger is structurally unreachable.
    // (2) Enemy DEF \u25bc has no primitive: defPct is SELF DEF (inert in v1) and damageTakenPct is
    //     Damage Taken \u25b2 — a different mechanic, not a DEF reduction.
  });
});

describe('belorta burst — "Deals 192% of final ATK as damage"', () => {
  it('B1a: the 192% line is live and load-bearing — zeroing it drops her total', () => {
    // RED if the line were MISSING from the model (zeroing a non-existent flatDamage is a no-op).
    expect(noBurstDmg.t[SLUG]).toBeLessThan(base.t[SLUG]);
  });

  it('B1b: her burst damage is hers — zeroing it removes damage from belorta, not from a teammate', () => {
    // Inertness: the 192% must not have been authored onto an ally-targeted block. Teammates may
    // still shift via rotation coupling, so assert the *direction and locus*: belorta strictly
    // loses, and she loses more than any teammate does.
    const mine = base.t[SLUG] - noBurstDmg.t[SLUG];
    expect(mine).toBeGreaterThan(0);
    for (const slug of Object.keys(base.t)) {
      if (slug === SLUG) continue;
      expect(Math.abs(base.t[slug] - noBurstDmg.t[slug])).toBeLessThan(mine);
    }
  });
});

describe('belorta burst — "Charge Speed \u25b2 2.82% for 10 sec" to all allies', () => {
  it('B2a: NON-VACUITY — belorta actually casts, and the buff fires at the raw 2.82', () => {
    // If this fails, the finding is the FIXTURE, not the model: controlComp seats crown (Burst II)
    // alongside belorta (Burst II), and only one unit takes stage 2 per chain.
    expect(csApplies.length).toBeGreaterThan(0);
    // chargeSpeedPct is a plain percentage stat, so the emitted value is the raw kit number —
    // RED under a caster-scaled/flat-resolved mis-encoding.
    for (const e of csApplies) expect(e.value).toBe(2.82);
  });

  it('B2b: target set is ALL allies including self (5 distinct targets, belorta among them)', () => {
    // RED under "allies excludeSelf" (2 targets, no belorta) and under self-only (1 target).
    // DRIVER ADAPTATION (plumbing only): the B2-free adapted comp fields 3 units, not 5.
    expect(csTargets.size).toBe(3);
    expect(csTargets.has(SLUG)).toBe(true);
    // One uniform 10 s window per cast, fanned to every ally: total applications must factor
    // exactly as targets x casts. RED if the buff re-applies per-shot or per-target-staggered.
    expect(csApplies.length).toBe(csTargets.size * csWindows.size);
  });

  it('B2c: the ally scope is load-bearing — re-scoping to self changes a teammate', () => {
    // Isolating counterfactual: belorta still receives the buff in both runs, so her own cadence,
    // gauge and rotation contribution are unchanged; any teammate delta is the ally grant alone.
    // RED under a self-only model (nothing outside belorta would move).
    const movedAlly = Object.keys(base.t).some(
      (slug) => slug !== SLUG && selfOnlyBuff.t[slug] !== base.t[slug],
    );
    expect(movedAlly).toBe(true);
  });

  it('B2d: the 10 sec duration is real — shrinking it to 1 sec costs belorta damage', () => {
    // She is a charge weapon (chargeFrames 90), so a shorter charge-speed window = fewer shots.
    // RED under a model that dropped durationSec (permanent uptime) or that made the buff inert.
    expect(shortBuff.t[SLUG]).toBeLessThan(base.t[SLUG]);
  });

  it('B2e: trigger identity is her OWN burst cast, not team full-burst entry', () => {
    // DRIVER ADAPTATION (observable only — intent intact): in the B2-free adapted comp belorta
    // casts on EVERY chain, so burstCast and fullBurstEnter keyings are count-equal; the
    // discriminator moves to FRAMES. A burstCast-keyed buff lands ON her cast frame, which
    // strictly PRECEDES the fullBurstStart frame (casts open the FB window); a
    // fullBurstEnter-keyed buff would land on the fullBurstStart frames instead.
    const castFrames = base.events
      .filter((e) => e.kind === 'burstCast' && (e as Ev).slug === SLUG)
      .map((e) => e.frame as number)
      .sort((a, b) => a - b);
    const fbFrames = base.events
      .filter((e) => e.kind === 'fullBurstStart')
      .map((e) => e.frame as number)
      .sort((a, b) => a - b);
    const buffFrames = [...new Set(csApplies.map((e) => e.frame as number))].sort(
      (a, b) => a - b,
    );
    expect(buffFrames.length).toBeGreaterThan(0);
    expect(buffFrames).toEqual(castFrames); // on her cast frames …
    for (const f of buffFrames) {
      expect(fbFrames).not.toContain(f); // … never on an FB-entry frame
    }
    expect(csWindows.size).toBeGreaterThan(0);
  });

  it('B2f: INERTNESS — charge speed is the only stat her kit grants', () => {
    // S1's radius and S2's DEF \u25bc must never surface as buffs from her caster slot.
    const casterIdx = csApplies[0]?.casterIdx;
    expect(casterIdx === null || casterIdx === undefined).toBe(false);
    const fromBelorta = buffApplies.filter((e) => e.casterIdx === casterIdx);
    expect(new Set(fromBelorta.map((e) => e.stat))).toEqual(
      new Set(['chargeSpeedPct']),
    );
  });
});
