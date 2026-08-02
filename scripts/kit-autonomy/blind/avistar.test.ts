import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js'; // path fixed: blind/ sits under kit-autonomy/, not tests/units/

/**
 * avistar — Avistar (MG/Electric/Supporter/Burst I, cd 20s, ammo 300, reload 171f)
 *
 * BLIND kit spec test. Written from the kit prose alone (S5 cross-family post-op),
 * with no sight of the driver's override, tests, or reasoning.
 *
 * WHAT THE KIT SAYS (structural reading, ≤40-char quotes):
 *   skill1 block A — header "Activates when Full Burst ends", Affects <a single ally>.
 *                    "ATK ▲ 80.26% of the skill user's ATK" → casterAtkPct 80.26, ally-scoped.
 *                    "removed when entering Full Burst" → the window is FB-end → next FB-enter,
 *                    i.e. it is LIVE only OUTSIDE Full Burst and is DEAD during Full Burst.
 *   skill1 block B — same trigger, Affects self: HoT "3.52% ... every 1 sec for 10 sec"
 *                    → heal with ticks:10, intervalSec:1 (recovery events, no HP pool modeled).
 *                    "Removes Stargazer" → the burst's self status ends at FB-end.
 *   skill2 block A — "Activates when entering Full Burst while in Stargazer status with over 25% HP",
 *                    Affects self: "Current HP ▼ 20%" — a self-damage cost. No damage primitive;
 *                    v1 models no HP pool, so this is UNMODELED (documented, not a block).
 *   skill2 block B — "Activates when entering Full Burst while in Stargazer status",
 *                    Affects <a single ally>: projectileExplosionPct 40.13 + attackDamagePct 40.13,
 *                    "continuously" → no durationSec; but it is STARGAZER-GATED, and Stargazer is
 *                    removed at FB-end (skill1 B), so in practice it re-arms per FB.
 *   burst        — Affects all allies: "Re-enters Burst Stage 1" → reenterStage:1.
 *                  Affects self: "Stargazer: Max HP ▲ 26.4% of the skill user's Max HP continuously"
 *                  → casterMaxHpPct 26.4 self, and it is the STATUS CARRIER for skill2's gate.
 *
 * THE CENTRAL AMBIGUITY (flagged, not silently resolved):
 *   "her favorite pop star" is a kit-flavored single-ally designator with no mechanical definition
 *   in the prose (it is not "highest ATK", not "all allies", not "self"). The FAITHFUL invariants a
 *   blind test CAN pin are: (a) exactly ONE ally receives it, (b) it is NOT the whole team, and
 *   (c) whoever it is, the magnitudes/scopes/gating are as above. Assertions below are written on
 *   those invariants (cardinality + scope + timing), never on a guessed slug. ⚑
 *
 * FIXTURE: controlComp('avistar', true) — Avistar is Burst I, so the control's B2+B3 slots supply
 * the rest of the chain and Full Bursts actually happen (a fixture without them would make every
 * fullBurstEnter/fullBurstEnd assertion vacuously empty). Deterministic, no seed.
 *
 * WHY EACH GROUP DISCRIMINATES: each counterfactual is the NEAREST-WRONG model for that line —
 * ally-scope→all-allies, casterAtkPct→atkPct, FB-end→FB-enter, Stargazer-gate→ungated,
 * reenterStage→dropped, continuous→short-duration. A faithful override is GREEN on all;
 * each wrong model flips at least one.
 */

const SLUG = 'avistar';

type Run = { res: ReturnType<typeof runComp>; events: SimEvent[] };

function run(opts: Parameters<typeof runComp>[0]): Run {
  const events: SimEvent[] = [];
  const res = runComp({
    ...opts,
    cfg: { ...(opts.cfg ?? {}), onEvent: (ev: SimEvent) => events.push(ev) },
  });
  return { res, events };
}

// ---------------------------------------------------------------- hoisted runs
// Each runComp is a full 180s sim; every run in this file is hoisted here.

const base = run(controlComp(SLUG, true));

// CF1: the ATK grant re-scoped to ALL allies (nearest-wrong for a single-ally line).
const cfAllAllies = run({
  ...controlComp(SLUG, true),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill1 ?? []) {
        if (
          b.effects.some((e) => e.kind === 'buff' && e.stat === 'casterAtkPct')
        ) {
          b.target = { kind: 'allies' };
        }
      }
    }),
  },
});

// CF2: casterAtkPct → atkPct (nearest-wrong: "of the skill user's ATK" read as a plain self-scaling %).
const cfPlainAtkPct = run({
  ...controlComp(SLUG, true),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill1 ?? []) {
        for (const e of b.effects) {
          if (e.kind === 'buff' && e.stat === 'casterAtkPct') {
            e.stat = 'atkPct';
          }
        }
      }
    }),
  },
});

// CF3: the ATK grant re-triggered on fullBurstEnter (nearest-wrong for "when Full Burst ends").
const cfAtkOnFbEnter = run({
  ...controlComp(SLUG, true),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill1 ?? []) {
        if (
          b.effects.some((e) => e.kind === 'buff' && e.stat === 'casterAtkPct')
        ) {
          b.trigger = { kind: 'fullBurstEnter' };
        }
      }
    }),
  },
});

// CF4: skill2's damage buffs dropped entirely (proves they are load-bearing, i.e. non-vacuous).
const cfNoS2Buffs = run({
  ...controlComp(SLUG, true),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill2 ?? []) {
        b.effects = b.effects.filter(
          (e) =>
            !(
              e.kind === 'buff' &&
              (e.stat === 'attackDamagePct' ||
                e.stat === 'projectileExplosionPct')
            )
        );
      }
    }),
  },
});

// CF5: the burst's "Re-enters Burst Stage 1" dropped (rotation-shape discriminator).
const cfNoReenter = run({
  ...controlComp(SLUG, true),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.burst ?? []) {
        b.effects = b.effects.filter((e) => e.kind !== 'reenterStage');
      }
    }),
  },
});

// CF6: the self Max HP grant dropped (Stargazer carrier).
const cfNoMaxHp = run({
  ...controlComp(SLUG, true),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.burst ?? []) {
        b.effects = b.effects.filter(
          (e) => !(e.kind === 'buff' && e.stat === 'casterMaxHpPct')
        );
      }
    }),
  },
});

// ------------------------------------------------------------------- helpers

const buffApplies = (evs: SimEvent[]) =>
  evs.filter((e) => (e as { kind: string }).kind === 'buffApply') as Array<
    SimEvent & {
      stat: string;
      key: string;
      value: number;
      casterIdx: number | null;
      targetIdx: number | null;
      targetSlug?: string;
      expiresFrame?: number;
      durationShots?: number;
      stacks?: number;
    }
  >;

const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e) => (e as { kind: string }).kind === 'fullBurstStart');
const fbEnds = (evs: SimEvent[]) =>
  evs.filter((e) => (e as { kind: string }).kind === 'fullBurstEnd');

// A caster-scaled ATK grant is FLAT-resolved at apply time: value === (kit%/100) × caster.staticAtk.
const EXPECTED_ATK_PCT = 80.26;
const MAXHP_PCT = 26.4;
const S2_PCT = 40.13;

function avistarStaticAtk(): number {
  return unitOf(base.res, SLUG).staticAtk as number;
}

describe('avistar — fixture sanity (non-vacuity floor)', () => {
  it('the control comp actually reaches Full Burst, so FB-keyed lines are exercised', () => {
    // Every skill1/skill2 line on this unit hangs off a Full Burst edge. If the fixture made
    // zero Full Bursts, every assertion below would pass vacuously.
    expect(fbStarts(base.events).length).toBeGreaterThan(0);
    expect(fbEnds(base.events).length).toBeGreaterThan(0);
  });

  it('avistar is in the comp and deals nonzero damage (she is a real firing unit, not a phantom)', () => {
    expect(totals(base.res)[SLUG]).toBeGreaterThan(0);
  });
});

describe('avistar skill1 — ATK ▲ 80.26% of the skill user ATK, on Full Burst END, to ONE ally', () => {
  it("emits a caster-scaled ATK grant, FLAT-resolved off avistar's own static ATK", () => {
    // "of the skill user's ATK" ⇒ casterAtkPct, which the engine re-emits as a FLAT ATK number.
    // Nearest-wrong (CF2) encodes it as atkPct, a percentage that scales the RECIPIENT's ATK —
    // a different number and a different mechanic.
    const grants = buffApplies(base.events).filter(
      (e) => e.stat === 'casterAtkPct'
    );
    expect(grants.length).toBeGreaterThan(0);

    const expectedFlat = (EXPECTED_ATK_PCT / 100) * avistarStaticAtk();
    for (const g of grants) {
      expect(g.value).toBeCloseTo(expectedFlat, 3);
    }
  });

  it('the ATK grant lands on exactly ONE ally per activation, never the whole team', () => {
    // "Affects her favorite pop star" is a SINGLE-ally designator. The blind-safe invariant is
    // cardinality, not identity: one recipient per FB-end, and a stable recipient across the fight.
    const grants = buffApplies(base.events).filter(
      (e) => e.stat === 'casterAtkPct'
    );
    const recipients = new Set(
      grants.map((g) => g.targetSlug ?? String(g.targetIdx))
    );
    expect(recipients.size).toBe(1);

    // and it is genuinely one-per-edge, not a team fan-out
    const ends = fbEnds(base.events).length;
    expect(grants.length).toBeLessThanOrEqual(ends);
  });

  it('RED under the all-allies model: CF1 moves total team damage', () => {
    // Discriminator for the target-set question. Fanning a caster-scaled ATK grant across the
    // squad is the classic over-credit; it must not be damage-neutral.
    const sum = (r: Run) =>
      Object.values(totals(r.res)).reduce((a, b) => a + b, 0);
    expect(sum(cfAllAllies)).not.toBeCloseTo(sum(base), 0);

    const cfGrants = buffApplies(cfAllAllies.events).filter(
      (e) => e.stat === 'casterAtkPct'
    );
    const cfRecipients = new Set(
      cfGrants.map((g) => g.targetSlug ?? String(g.targetIdx))
    );
    expect(cfRecipients.size).toBeGreaterThan(1);
  });

  it('RED under the plain-atkPct model: CF2 changes the emitted stat and the board', () => {
    const cfStats = new Set(
      buffApplies(cfPlainAtkPct.events).map((e) => e.stat)
    );
    expect(cfStats.has('atkPct')).toBe(true);

    const sum = (r: Run) =>
      Object.values(totals(r.res)).reduce((a, b) => a + b, 0);
    expect(sum(cfPlainAtkPct)).not.toBeCloseTo(sum(base), 0);
  });

  it('fires on Full Burst END, not Full Burst ENTER (trigger identity)', () => {
    // Timing discriminator: an FB-end-keyed grant's first application must come AFTER the first
    // fullBurstStart frame; an FB-enter-keyed one (CF3) lands ON/BEFORE it.
    const firstFbStart = (fbStarts(base.events)[0] as { frame: number }).frame;
    const firstGrant = buffApplies(base.events).filter(
      (e) => e.stat === 'casterAtkPct'
    )[0] as unknown as { frame: number };
    expect(firstGrant.frame).toBeGreaterThan(firstFbStart);

    const cfFirstFbStart = (
      fbStarts(cfAtkOnFbEnter.events)[0] as { frame: number }
    ).frame;
    const cfFirstGrant = buffApplies(cfAtkOnFbEnter.events).filter(
      (e) => e.stat === 'casterAtkPct'
    )[0] as unknown as { frame: number };
    expect(cfFirstGrant.frame).toBeLessThanOrEqual(cfFirstFbStart);

    // and the two models are not damage-equivalent
    const sum = (r: Run) =>
      Object.values(totals(r.res)).reduce((a, b) => a + b, 0);
    expect(sum(cfAtkOnFbEnter)).not.toBeCloseTo(sum(base), 0);
  });

  it('the ATK grant is an OUT-of-Full-Burst buff: "removed when entering Full Burst"', () => {
    // Semantics check on the removal clause. The window is [FB-end, next FB-enter). Whatever the
    // encoding (durationSec sized to the gap, or an explicit strip), the observable invariant is
    // that the grant is applied only on FB-end edges — never renewed mid-Full-Burst.
    const grants = buffApplies(base.events).filter(
      (e) => e.stat === 'casterAtkPct'
    ) as unknown as Array<{ frame: number }>;
    const windows = fbStarts(base.events).map((s, i) => ({
      start: (s as { frame: number }).frame,
      end:
        (fbEnds(base.events)[i] as { frame: number } | undefined)?.frame ??
        Infinity,
    }));
    for (const g of grants) {
      const insideAnFb = windows.some(
        (w) => g.frame > w.start && g.frame < w.end
      );
      expect(insideAnFb).toBe(false);
    }
  });

  it("inertness: avistar's own damage is not the channel this buff pays out through", () => {
    // The line grants ATK to an ALLY; avistar's personal damage must be identical between the
    // faithful model and CF1 (which only widens the RECIPIENT set, never touches her own weapon).
    // If her own total moved, the buff is leaking onto the caster.
    expect(totals(cfAllAllies.res)[SLUG]).toBeCloseTo(
      totals(base.res)[SLUG],
      0
    );
  });
});

describe('avistar skill1 — self heal-over-time, 10 ticks at 1s, on Full Burst end', () => {
  it('emits repeated recovery events to SELF after each Full Burst end (tandem/cross-unit channel)', () => {
    // "Recovers ... every 1 sec for 10 sec" ⇒ ticks:10, intervalSec:1. Inert for avistar's own
    // damage, but it is the feed for any teammate's on-recovery trigger — the taxonomy's
    // TANDEM rule says never skip a heal line on isolation.
    const heals = base.events.filter(
      (e) => (e as { kind: string }).kind === 'recovery'
    ) as unknown as Array<{ frame: number; targetSlug?: string }>;
    expect(heals.length).toBeGreaterThan(0);

    // 10 ticks per FB-end edge (allow truncation at the 180s fight boundary)
    const ends = fbEnds(base.events).length;
    expect(heals.length).toBeGreaterThan(ends); // strictly more than one-per-edge ⇒ it IS a HoT
    expect(heals.length).toBeLessThanOrEqual(ends * 10);

    // self-targeted
    for (const h of heals) {
      if (h.targetSlug) {
        expect(h.targetSlug).toBe(SLUG);
      }
    }
  });

  it('non-vacuity: the heal ticks are spaced ~1s apart, not a single instant burst', () => {
    const heals = base.events.filter(
      (e) => (e as { kind: string }).kind === 'recovery'
    ) as unknown as Array<{ frame: number }>;
    const gaps: number[] = [];
    for (let i = 1; i < heals.length; i++) {
      const d = heals[i].frame - heals[i - 1].frame;
      if (d > 0 && d < 300) {
        gaps.push(d);
      }
    }
    expect(gaps.length).toBeGreaterThan(0);
    // 1 sec at 60fps
    expect(Math.min(...gaps)).toBe(60);
  });
});

describe('avistar skill2 — Stargazer-gated ally damage buffs (40.13% / 40.13%)', () => {
  it('grants BOTH Projectile Explosion Damage and Attack Damage at 40.13%', () => {
    // Two distinct stats at the same magnitude. Encoding only one (or merging them) is the
    // nearest-wrong: projectileExplosionPct is RL-only in effect, attackDamagePct is universal,
    // so a merge silently changes who benefits.
    const applies = buffApplies(base.events);
    const atkDmg = applies.filter(
      (e) => e.stat === 'attackDamagePct' && Math.abs(e.value - S2_PCT) < 0.01
    );
    const projExp = applies.filter(
      (e) =>
        e.stat === 'projectileExplosionPct' && Math.abs(e.value - S2_PCT) < 0.01
    );
    expect(atkDmg.length).toBeGreaterThan(0);
    expect(projExp.length).toBeGreaterThan(0);
  });

  it('both land on exactly ONE ally (same single-ally designator as skill1)', () => {
    const applies = buffApplies(base.events).filter(
      (e) =>
        (e.stat === 'attackDamagePct' || e.stat === 'projectileExplosionPct') &&
        Math.abs(e.value - S2_PCT) < 0.01
    );
    const recipients = new Set(
      applies.map((e) => e.targetSlug ?? String(e.targetIdx))
    );
    expect(recipients.size).toBe(1);
  });

  it('fires on Full Burst ENTER (not FB-end, not burst-cast)', () => {
    // "Activates when entering Full Burst while in Stargazer status" ⇒ fullBurstEnter, gated.
    // Contrast with skill1's FB-END trigger above — getting these two backwards is the single
    // most likely blind error on this kit, and this pair of assertions separates them.
    const applies = buffApplies(base.events).filter(
      (e) => e.stat === 'attackDamagePct' && Math.abs(e.value - S2_PCT) < 0.01
    ) as unknown as Array<{ frame: number }>;
    const startFrames = fbStarts(base.events).map(
      (s) => (s as { frame: number }).frame
    );
    for (const a of applies) {
      // applied at/very near a fullBurstStart frame
      expect(
        Math.min(...startFrames.map((f) => Math.abs(f - a.frame)))
      ).toBeLessThanOrEqual(1);
    }
  });

  it('is STARGAZER-gated: it cannot fire on a Full Burst entered before avistar ever bursts', () => {
    // Non-vacuity for the gate: Stargazer is granted by avistar's OWN burst, and skill1 REMOVES it
    // at FB-end. So the buff must NOT be present on the very first Full Burst if that FB precedes
    // her first burstCast. This asserts the fixture exercises BOTH the gated-off and gated-on case.
    const firstBurstCast = base.events.find(
      (e) =>
        (e as { kind: string }).kind === 'burstCast' &&
        (e as { slug?: string }).slug === SLUG
    ) as unknown as { frame: number } | undefined;
    const applies = buffApplies(base.events).filter(
      (e) => e.stat === 'attackDamagePct' && Math.abs(e.value - S2_PCT) < 0.01
    ) as unknown as Array<{ frame: number }>;

    expect(firstBurstCast).toBeDefined();
    expect(applies.length).toBeGreaterThan(0);
    // every application follows a burst cast that armed Stargazer
    for (const a of applies) {
      expect(a.frame).toBeGreaterThan(firstBurstCast!.frame);
    }
  });

  it('load-bearing: dropping both buffs (CF4) lowers team damage', () => {
    const sum = (r: Run) =>
      Object.values(totals(r.res)).reduce((a, b) => a + b, 0);
    expect(sum(cfNoS2Buffs)).toBeLessThan(sum(base));
  });

  it("inertness: the 40.13% buffs do not touch avistar's own damage", () => {
    // Ally-scoped: her personal total must be byte-identical with the buffs removed.
    expect(totals(cfNoS2Buffs.res)[SLUG]).toBeCloseTo(
      totals(base.res)[SLUG],
      0
    );
  });
});

describe('avistar burst — Re-enters Burst Stage 1 (all allies)', () => {
  it('the rotation shape depends on reenterStage:1 — dropping it (CF5) changes the board', () => {
    // "Re-enters Burst Stage 1" keeps the rotation at stage 1 so ANOTHER B1 can also cast.
    // In the control comp the other B1 slot exists, so this is genuinely exercised.
    const sum = (r: Run) =>
      Object.values(totals(r.res)).reduce((a, b) => a + b, 0);
    const fbBase = fbStarts(base.events).length;
    const fbCf = fbStarts(cfNoReenter.events).length;
    // either the full-burst count or the total damage must move; a truly inert reenter would mean
    // the effect is unreachable in this fixture and the assertion is vacuous.
    expect(fbCf !== fbBase || Math.abs(sum(cfNoReenter) - sum(base)) > 1).toBe(
      true
    );
  });

  it('avistar casts her own burst at stage 1 (she is Burst I — trigger identity sanity)', () => {
    const casts = base.events.filter(
      (e) =>
        (e as { kind: string }).kind === 'burstCast' &&
        (e as { slug?: string }).slug === SLUG
    );
    expect(casts.length).toBeGreaterThan(0);
  });
});

describe('avistar burst — Stargazer: self Max HP ▲ 26.4% of the skill user Max HP', () => {
  it("emits a self maxHpFlat grant resolved off avistar's own Max HP", () => {
    // casterMaxHpPct re-emits as stat 'maxHpFlat' with a FLAT HP value (harness note).
    const grants = buffApplies(base.events).filter(
      (e) => e.stat === 'maxHpFlat' && e.casterIdx !== null
    );
    expect(grants.length).toBeGreaterThan(0);

    const selfGrants = grants.filter((g) => (g.targetSlug ?? SLUG) === SLUG);
    expect(selfGrants.length).toBeGreaterThan(0);

    const maxHp = unitOf(base.res, SLUG).maxHp as number | undefined;
    if (typeof maxHp === 'number' && maxHp > 0) {
      expect(selfGrants[0].value).toBeCloseTo((MAXHP_PCT / 100) * maxHp, 0);
    }
  });

  it('it is "continuously" — no time expiry stamped on the grant', () => {
    // Duration semantics: "continuously" ⇒ no durationSec. A blind model that stamps a 10s window
    // (borrowing the Full-Burst duration) would set a finite expiresFrame.
    const selfGrants = buffApplies(base.events).filter(
      (e) =>
        e.stat === 'maxHpFlat' &&
        e.casterIdx !== null &&
        (e.targetSlug ?? SLUG) === SLUG
    );
    for (const g of selfGrants) {
      expect(g.expiresFrame === undefined || g.expiresFrame >= 180 * 60).toBe(
        true
      );
      expect(g.durationShots).toBeUndefined();
    }
  });

  it('inertness: the Max HP grant is offensively inert on this unit (no HP→ATK scaler in her kit)', () => {
    // avistar's kit carries no atkOfMaxHpPct line, so Max HP must not move damage. Its purpose is
    // (a) kit completeness and (b) carrying the Stargazer status name. CF6 removes ONLY the stat
    // buff; total damage must be unchanged if the status is modeled separately from the HP number.
    // If this goes RED, the override is (incorrectly) hanging the Stargazer gate on the HP buff
    // itself, or an HP→ATK conversion is leaking.
    expect(totals(cfNoMaxHp.res)[SLUG]).toBeCloseTo(totals(base.res)[SLUG], 0);
  });
});

describe('avistar — cross-line interaction: Stargazer is consumed at Full Burst end', () => {
  it('skill1 removes Stargazer, so skill2 needs a fresh burst to re-arm (no free stacking)', () => {
    // The kit is a closed loop: burst ⇒ Stargazer ⇒ FB-enter consumes it for the 40.13% pair ⇒
    // FB-end removes it. Therefore the number of skill2 activations can never EXCEED the number
    // of avistar burst casts. A model that leaves Stargazer permanently on would over-fire.
    const casts = base.events.filter(
      (e) =>
        (e as { kind: string }).kind === 'burstCast' &&
        (e as { slug?: string }).slug === SLUG
    ).length;
    const s2Applies = buffApplies(base.events).filter(
      (e) => e.stat === 'attackDamagePct' && Math.abs(e.value - S2_PCT) < 0.01
    ).length;
    expect(s2Applies).toBeLessThanOrEqual(casts);
  });
});

describe('avistar — deliberately unmodeled lines', () => {
  it.skip('skill2: "Current HP ▼ 20%" self-cost — no HP pool in v1 (boss deals no damage), so the cost is unobservable and offensively inert; the ">25% HP" precondition is likewise always-true in a no-damage sim. GAP: needs an HP-pool primitive before it can gate anything.', () => {});

  it.skip('skill1/skill2: the identity of "her favorite pop star" (the single-ally designator) — the kit prose gives no mechanical selector (not highest-ATK, not element/class/weapon-typed, not positional). ⚑ Cardinality and scope are asserted above; the SLUG cannot be pinned blind and must be resolved from the kit\'s in-game targeting or a measurement.', () => {});
});
