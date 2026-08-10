// PER-UNIT KIT SPEC — `ram` (Ram, SR/Defender/Fire, Burst I, cd 40s, ammo 6,
// chargeFrames 60, reloadFrames 141, skill2 CD 15s, normalMult 69.04 / chargeMult 250 /
// coreMult 200, critRate 15 / critDamage 150). Kit-autonomy gauntlet 2026-08-05.
//
// Ram is the DEFENSIVE base counterpart of the Re:ZERO collab pair (rem is the Burst-II
// offensive sister) — this is the BASE unit, distinct from any variant. Her kit is almost
// entirely survivability (an enemy ATK debuff, a self Max-HP grant, an ally DEF grant, a
// team shield) plus ONE rotation line: the Full-Burst-end refund of her own burst cooldown.
// In the v1 DPS scope (no HP pool, boss deals no damage, no enemy ATK modeled) only two
// surfaces are observable: (1) the burst CDR moves her cast cadence — she is the fixture's
// stage-1 filler, so her CD gates the whole chain (sim.ts first-ready-with-waiting); and
// (2) the burst shield emits a shield EVENT that fires 'shielded'-trigger consumers.
//
// Kit (blablalink prose, data/characters.json → characters.ram.skills):
//   S1 "Fura" (StateEffect, no CD):
//      ■ after landing 5 normal attacks → the target: ATK ▼7.95% for 5 sec          [R2]
//      ■ when Full Burst ends (ally on battlefield) → self: Burst Skill cooldown
//        ▼20.16 sec                                                                  [R1]
//   S2 "Sister's Authority" (CD 15s — trigger KIT-SILENT, pure internal timer):
//      ■ self: Max HP ▲40.72% WITHOUT restoring HP for 10 sec                       [R3]
//      ■ 2 allies with the lowest remaining HP: DEF ▲11.34% of the skill user's DEF
//        for 5 sec                                                                   [R4]
//   BU "Don't Bother Ram" (Burst I, cd 40s):
//      ■ all allies: Shield with 10.08% of the skill user's final Max HP for 10 sec [R5]
//
// Dispositions + why each assertion discriminates:
//   R1 FAITHFUL (rotation-load-bearing) — fullBurstEnd → self burstCdr 20.16. Her raw CD is
//      40s; the refund lands at each Full Burst END (trigger identity — the kit says "when
//      Full Burst ends", not "enters"), pulling her next-ready to ≈ cast+20s so the team's
//      stage-1 fill cadence doubles once the gauge cycle is below ~20s. Pinned by the
//      cast-1→cast-2 GAP (well inside the raw 40s cooldown) and the 180s CAST COUNT against
//      the no-CDR counterfactual, whose second cast sits at the full ~40s CD. All her casts
//      are stage 1. SAME-SQUAD GATE: the "an ally from the same squad still on the
//      battlefield" clause is modeled ALWAYS-SATISFIED — the engine HAS the primitive
//      (teamHas.sameSquad, fails closed off src/data/squads.ts) but ram's collab squad is
//      UNCONFIRMED (QUEUE.md "same-squad primitive migrations": "collab-unit squad unknown,
//      confirm before authoring"; squad membership is owner-confirmed fact, never derived),
//      so the anchor-innocent-maid precedent ships: gate omitted, caveat + ⚑ carried in the
//      override. "Still on the battlefield" is scope-trivial regardless (nobody dies in v1).
//   R2 UNMODELED — enemy ATK▼: the engine models NO enemy ATK, because the v1 boss deals no
//      damage and so an ATK debuff on it has nothing to scale (enemy DEF ▼ is a separate case
//      with a live channel since 2026-08-10; ATK ▼ is the inert one). Offensively inert by
//      construction; the nearest-wrong mapping (damageTakenPct — "boss takes more damage") is a
//      DIFFERENT mechanic that would silently credit the whole team. Pinned by ABSENCE (zero
//      boss debuffs from ram) + a sensitivity counterfactual proving the pin catches the
//      damageTakenPct reflex. Verbatim in override.unmodeled.
//   R3 FAITHFUL (inert-native) — interval:15 (the datamined skillCooldownsSec.skill2; kit-silent
//      trigger = pure internal timer, pepper/helm-aquamarine convention; first fire t=15) → self
//      targetMaxHpPct 40.72, durationSec 10. 'Max HP ▲ X%' with no 'of the skill user' clause =
//      the TARGET's OWN % (targetMaxHpPct — blanc/maiden/2b precedent; the plain maxHpPct StatKey
//      is cube-only and the validator rejects it in overrides); self-targeted so caster===target
//      and the grant arrives as an OWN-kit maxHpFlat (casterIdx===self). Damage-INERT for ram:
//      the only consumer of own-kit maxHpFlat is atkOfMaxHpPct HP-scaling ATK and she has none —
//      the inertness proof (totals byte-identical with the block removed) is asserted. 'WITHOUT
//      restoring HP' is honored by construction: the engine never emits a recovery event from a
//      Max-HP grant (no HP pool; the nearest-wrong 'Max-HP-up-with-heal' reflex would fire
//      on-recovery consumers, none of which exist in this fixture). 10s expiry pinned off the
//      event's expiresFrame; 15s cadence off the first-fire at t=15.
//   R4 UNMODELED — DEF ▲11.34% OF THE SKILL USER'S DEF: a caster-basis flat DEF add — no such
//      primitive exists (defPct scales the TARGET's own DEF, the wrong basis, and is inert in v1
//      regardless — "self DEF doesn't affect own damage"). The target clause ('2 allies with the
//      lowest remaining HP') HAS a primitive (alliesLowestHp, leftmost stand-in) — the blocker is
//      purely the payload. Second-nearest wrong (S2b): the '% of the skill user's <stat>' template
//      pattern-matching to casterAtkPct — silently flat-ATK-ing two allies. Pinned by ABSENCE
//      (zero defPct AND zero casterAtkPct events sourced from ram) + sensitivity counterfactual.
//      Verbatim in override.unmodeled.
//   R5 FAITHFUL — burstCast → allies → shield maxHpPct 10.08, durationSec 10. No shield HP pool
//      is modeled (v1); the shield primitive emits the shield EVENT channel, opening each
//      target's shield-state window and firing their 'shielded' triggers — observable ONLY
//      through a real consumer: the fixture seats naga, whose S1 is 'shielded → all allies:
//      coreDamagePct 85.17'. Ram is the fixture's SOLE shield source (helm/naga overrides emit
//      zero shield effects), so every naga coreDamagePct application is attributable to a ram
//      burst cast — pinned FRAME-LOCKED (same frame as each ram burstCast). The 10.08% magnitude
//      rides in the effect for kit completeness (engine records it; no HP pool to act on).
//      Counterfactuals: shield removed → zero naga coreDamagePct; shield mis-encoded as heal →
//      recovery channel, not shielded → also zero (wrong-synergy-channel discriminator).
//      R5b (trigger identity, S2b-requested): in a TWO-B1 comp (liter alongside ram), the
//      burstCast keying must emit the shield ONLY on ram-cast chains — never on Full Bursts
//      liter opened while ram sat out. The probe equalizes CDs (CDR removed in-memory) so the
//      engine's earliest-ready pick alternates ram/liter cleanly; the fullBurstEnter-keyed
//      counterfactual lands the shield when the FB window OPENS (after the chain completes —
//      not on the B1 caster's frame), so the consumer fires on frames with no ram cast.
//
// Inert UNMODELED magnitudes with no assertions: the 7.95% ATK▼ and 11.34% DEF payloads
// (damage-inert in v1) and the 10.08% shield HP amount (no HP pool — recorded on the effect).
//
// Fixture: sole-B1 comp ram(B1) / naga(B2) / helm(B3), boss Iron (neutral for Fire ram),
// focus ram — ram OWNS the B1 slot (controlComp seats liter at B1, where ram would cast ZERO
// bursts and every R1/R5 assertion would pass vacuously); naga supplies the B2 + the shielded
// consumer, helm the B3 so the chain completes and fullBurstEnd fires. Deterministic (no seed);
// assertions read the event log, not totals (except R3's inertness proof).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** Fixture slot order: ram 0 / naga 1 / helm 2. */
const RAM = 0;
const NAGA = 1;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: ['ram', 'naga', 'helm'],
    bossElement: 'Iron',
    focusSlug: 'ram',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, res };
}

const casts = (events: SimEvent[]): BurstCast[] =>
  events.filter((e): e is BurstCast => e.kind === 'burstCast');
const buffs = (events: SimEvent[]): BuffApply[] =>
  events.filter((e): e is BuffApply => e.kind === 'buffApply');
const ramCastsOf = (events: SimEvent[]): BurstCast[] =>
  casts(events).filter((e) => e.slug === 'ram');

/** naga's SHIELDED-TRIGGER line only (coreDamagePct 85.17) — her skill2 carries a SECOND,
 *  non-shield coreDamagePct 40.07 line (hitCount 5 → top-ATK allies) that must be excluded. */
const nagaShieldCore = (events: SimEvent[], nagaIdx: number): BuffApply[] =>
  buffs(events).filter(
    (e) =>
      e.stat === 'coreDamagePct' && e.casterIdx === nagaIdx && e.value === 85.17
  );

// ---- counterfactual / sensitivity patches ------------------------------------------------------

const hasCdr = (b: any) => b.effects.some((e: any) => e.kind === 'burstCdr');
const hasShield = (b: any) => b.effects.some((e: any) => e.kind === 'shield');
const hasMaxHp = (b: any) =>
  b.effects.some((e: any) => e.kind === 'buff' && e.stat === 'targetMaxHpPct');

/** R1 counterfactual: the no-CDR kit — second cast sits at the full 40s cooldown. */
const ramNoCdr = withPatchedOverride('ram', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasCdr(b));
  if (ov.skill1.length === before) {
    throw new Error('ram S1 burstCdr block missing — fixture is stale');
  }
});

/** R2 sensitivity: the damageTakenPct REFLEX mis-encoding of the enemy ATK▼ line. */
const ramAtkDownReflex = withPatchedOverride('ram', (ov) => {
  ov.skill1.push({
    slot: 'skill1',
    trigger: { kind: 'hitCount', count: 5 },
    target: { kind: 'enemy' },
    effects: [
      { kind: 'buff', stat: 'damageTakenPct', value: 7.95, durationSec: 5 },
    ],
  });
});

/** R3 counterfactual: the S2L1 grant removed (also the inertness probe). */
const ramNoMaxHp = withPatchedOverride('ram', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasMaxHp(b));
  if (ov.skill2.length === before) {
    throw new Error('ram S2 targetMaxHpPct block missing — fixture is stale');
  }
});

/** R4 sensitivity: the defPct REFLEX mis-encoding of the caster-basis DEF grant. */
const ramDefReflex = withPatchedOverride('ram', (ov) => {
  ov.skill2.push({
    slot: 'skill2',
    trigger: { kind: 'interval', sec: 15 },
    target: { kind: 'alliesLowestHp', count: 2 },
    effects: [{ kind: 'buff', stat: 'defPct', value: 11.34, durationSec: 5 }],
  });
});

/** R5 counterfactual: the shield block removed — naga's consumer goes silent. */
const ramNoShield = withPatchedOverride('ram', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasShield(b));
  if (ov.burst.length === before) {
    throw new Error('ram burst shield block missing — fixture is stale');
  }
});

/** R5 counterfactual: shield mis-encoded as heal (recovery channel, not shielded). */
const ramShieldAsHeal = withPatchedOverride('ram', (ov) => {
  for (const b of ov.burst) {
    b.effects = b.effects.map((e: any) =>
      e.kind === 'shield' ? { kind: 'heal' } : e
    );
  }
});

/** R5b counterfactual: shield re-keyed burstCast → fullBurstEnter (fires every FB, including
 *  chains ram sat out). Combined with the no-CDR patch so the probe comp alternates B1s. */
const ramNoCdrShieldFbEnter = withPatchedOverride('ram', (ov) => {
  ov.skill1 = ov.skill1.filter((b: any) => !hasCdr(b));
  for (const b of ov.burst) {
    if (hasShield(b)) {
      b.trigger = { kind: 'fullBurstEnter' };
    }
  }
});

// ---- R1: S1L2 — Full-Burst-end self burst CDR (rotation-load-bearing) --------------------------
describe('ram R1 — S1 "when Full Burst ends → own Burst Skill cooldown ▼20.16s"', () => {
  it('casts are stage 1, and the CDR pulls the second cast well inside the raw 40s CD', () => {
    const { events } = run();
    const ramCasts = ramCastsOf(events);
    expect(ramCasts.length).toBeGreaterThanOrEqual(2);
    expect(ramCasts.every((e) => e.stage === 1)).toBe(true);
    const gapSec = (ramCasts[1].frame - ramCasts[0].frame) / FPS;
    // cast sets a 40s CD; the FB-end refund (20.16s) lands ≈10s later at FB end,
    // so the second cast must land well before the raw-CD 40s mark.
    expect(gapSec).toBeLessThan(35);
  });

  it('discriminates the no-CDR counterfactual: later second cast, fewer 180s casts', () => {
    const shipped = run();
    const noCdr = run({ ram: ramNoCdr });
    const sCasts = ramCastsOf(shipped.events);
    const nCasts = ramCastsOf(noCdr.events);
    expect(nCasts.length).toBeGreaterThanOrEqual(2);
    const sGap = (sCasts[1].frame - sCasts[0].frame) / FPS;
    const nGap = (nCasts[1].frame - nCasts[0].frame) / FPS;
    expect(nGap).toBeGreaterThan(sGap + 5); // ≈40s raw CD vs ≈20s refunded
    // 180s count is secondary (the team gauge cycle co-limits cadence) but must
    // still favor the refunded CD.
    expect(sCasts.length).toBeGreaterThan(nCasts.length);
  });
});

// ---- R2: S1L1 — enemy ATK▼7.95% (UNMODELED: no enemy-ATK primitive) -----------------------------
describe('ram R2 — S1 "after 5 normal attacks → target ATK ▼7.95%" (UNMODELED)', () => {
  // Boss-debuff events carry casterIdx null (the enemy branch passes no owner), so
  // attribution rides stat+value directly; neither naga nor helm carries a
  // damageTakenPct line, so any such application in these runs is ram's.
  it('shipped emits ZERO boss debuffs from ram', () => {
    const { events } = run();
    expect(
      buffs(events).filter(
        (e) => e.stat === 'damageTakenPct' && e.value === 7.95
      )
    ).toHaveLength(0);
  });

  it('sensitivity: the damageTakenPct reflex WOULD register (and inflate team damage)', () => {
    const shipped = run();
    const reflex = run({ ram: ramAtkDownReflex });
    expect(
      buffs(reflex.events).filter(
        (e) => e.stat === 'damageTakenPct' && e.value === 7.95
      ).length
    ).toBeGreaterThanOrEqual(1);
    expect(totals(reflex.res).helm).toBeGreaterThan(totals(shipped.res).helm);
  });
});

// ---- R3: S2L1 — self Max HP ▲40.72% / 10s, no heal (inert-native grant) -------------------------
describe('ram R3 — S2 "self Max HP ▲40.72% without restoring HP for 10s"', () => {
  it('grants an OWN-kit maxHpFlat at the 15s internal cadence, 10s expiry', () => {
    const { events, res } = run();
    const grants = buffs(events).filter(
      (e) =>
        e.stat === 'maxHpFlat' && e.targetIdx === RAM && e.casterIdx === RAM
    );
    // interval:15 — fires at t=15,30,…,165 ⇒ 11 applications in a 180s fight.
    expect(grants.length).toBe(11);
    expect(grants[0].sec).toBeCloseTo(15, 1);
    const expected = (40.72 / 100) * unitOf(res, 'ram').maxHp;
    for (const g of grants) {
      expect(g.value).toBeCloseTo(expected, 6);
      expect(g.expiresFrame! - g.frame).toBe(10 * FPS);
    }
  });

  it('is damage-inert: removing the block moves NO total (no HP-scaling consumer)', () => {
    const shipped = run();
    const removed = run({ ram: ramNoMaxHp });
    expect(totals(removed.res)).toEqual(totals(shipped.res));
  });
});

// ---- R4: S2L2 — DEF ▲11.34% of caster DEF to 2 lowest-HP allies (UNMODELED) ---------------------
describe('ram R4 — S2 "DEF ▲11.34% of user DEF to 2 lowest-HP allies" (UNMODELED)', () => {
  it('shipped emits ZERO defPct events and ZERO casterAtkPct from ram', () => {
    const { events } = run();
    expect(buffs(events).filter((e) => e.stat === 'defPct')).toHaveLength(0);
    expect(
      buffs(events).filter(
        (e) => e.stat === 'casterAtkPct' && e.casterIdx === RAM
      )
    ).toHaveLength(0);
  });

  it('sensitivity: the defPct reflex WOULD register', () => {
    const reflex = run({ ram: ramDefReflex });
    expect(
      buffs(reflex.events).filter((e) => e.stat === 'defPct').length
    ).toBeGreaterThanOrEqual(1);
  });
});

// ---- R5: Burst — all-ally shield, 10.08% of final Max HP / 10s ----------------------------------
describe('ram R5 — burst "Shield = 10.08% of final Max HP, all allies, 10s"', () => {
  it('every ram burst cast fires naga shielded consumer, FRAME-LOCKED', () => {
    const { events } = run();
    const ramCasts = ramCastsOf(events);
    expect(ramCasts.length).toBeGreaterThanOrEqual(1);
    const nagaCore = nagaShieldCore(events, NAGA);
    expect(nagaCore.length).toBeGreaterThanOrEqual(1);
    for (const c of ramCasts) {
      expect(
        nagaCore.some((e) => e.frame === c.frame),
        `no naga coreDamagePct application at ram cast frame ${c.frame}`
      ).toBe(true);
    }
  });

  it('counterfactuals: shield removed OR shield-as-heal both silence the consumer', () => {
    const removed = run({ ram: ramNoShield });
    expect(nagaShieldCore(removed.events, NAGA)).toHaveLength(0);
    const asHeal = run({ ram: ramShieldAsHeal });
    expect(nagaShieldCore(asHeal.events, NAGA)).toHaveLength(0);
  });
});

// ---- R5b: trigger identity under two-B1 alternation (burstCast, NOT fullBurstEnter) ------------
describe('ram R5b — shield keyed to ram OWN burstCast (two-B1 alternation probe)', () => {
  const NAGA_IDX = 2; // probe comp: ram 0 / liter 1 / naga 2 / helm 3
  function runAlt(overrides: Record<string, any> = {}) {
    const events: SimEvent[] = [];
    const res = runComp({
      slugs: ['ram', 'liter', 'naga', 'helm'],
      bossElement: 'Iron',
      focusSlug: 'ram',
      overrides,
      cfg: { onEvent: (e) => events.push(e) },
    });
    return { events, res };
  }

  it('shipped: consumer fires on EVERY ram-cast chain and NO liter-cast chain', () => {
    // CDR removed in-memory: equal 40s CDs make the earliest-ready pick alternate
    // ram/liter cleanly (round-robin property) — the probe isolates KEYING, not cadence.
    const { events } = runAlt({ ram: ramNoCdr });
    const ramCasts = ramCastsOf(events);
    const literCasts = casts(events).filter((e) => e.slug === 'liter');
    expect(ramCasts.length).toBeGreaterThanOrEqual(2);
    expect(literCasts.length).toBeGreaterThanOrEqual(1); // alternation really happened
    const nagaCore = nagaShieldCore(events, NAGA_IDX);
    for (const rc of ramCasts) {
      expect(
        nagaCore.some((e) => e.frame === rc.frame),
        `consumer silent on ram cast frame ${rc.frame}`
      ).toBe(true);
    }
    for (const lc of literCasts) {
      expect(
        nagaCore.some((e) => e.frame === lc.frame),
        `consumer fired on liter-cast frame ${lc.frame} (ram sat out)`
      ).toBe(false);
    }
  });

  it('counterfactual: fullBurstEnter keying fires the consumer OUTSIDE ram casts', () => {
    // fullBurstEnter lands when the FB window opens (after the chain completes), not on
    // the B1 caster's frame — so the mis-keyed shield reaches Full Bursts liter opened
    // while ram sat out: consumer events appear on frames with NO ram cast.
    const { events } = runAlt({ ram: ramNoCdrShieldFbEnter });
    expect(
      casts(events).filter((e) => e.slug === 'liter').length
    ).toBeGreaterThanOrEqual(1);
    const nagaCore = nagaShieldCore(events, NAGA_IDX);
    const ramFrames = new Set(ramCastsOf(events).map((e) => e.frame));
    expect(nagaCore.some((e) => !ramFrames.has(e.frame))).toBe(true);
  });
});
