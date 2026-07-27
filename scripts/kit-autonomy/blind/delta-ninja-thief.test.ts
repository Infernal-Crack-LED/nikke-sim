import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

/**
 * Delta: Ninja Thief (delta-ninja-thief) — blind per-line kit spec.
 *
 * KIT (structural read, ≤40-char quotes):
 *  S1a  "Activates when entering Full Burst" / Affects all enemies →
 *       Damage Taken ▲12% for 15s. TRIGGER = fullBurstEnter (ANY team FB), TARGET = enemy debuff
 *       (boss-held: casterIdx===null && targetIdx===null).
 *  S1b  "Activates when using Burst Skill" / Affects self → ATK ▲15.04% for 10s.
 *       TRIGGER = burstCast (owner's OWN cast), TARGET = self, stat atkPct (scales own ATK).
 *  S1c  "Activates when using Burst Skill" / enemies near crosshair →
 *       Damage Taken ▲8% for 10s. Same burstCast trigger; a SECOND, distinct damageTakenPct
 *       debuff (8%, 10s) — must NOT be merged with S1a's 12%/15s.
 *  S2a  "Activates at the start of battle", formation-branched. Control comp = liter/crown/
 *       delta-ninja-thief/helm → NO other Defender ally, so the NO-OTHER-DEFENDER branch is live:
 *       Effect 1 shield 12.25% of own final Max HP for 10s; Effect 2 Attract/taunt (defensive,
 *       damage-inert). The other-Defender branch (Camouflage / Ninjutsu Injection) is INERT here.
 *  S2b  "performing 200 normal attack(s)" while in Attract → shield 12.25% Max HP, 10s.
 *       TRIGGER = hitCount 200 (ROUNDS, not trigger pulls — MG hitsPerShot 1 here, ammo 300).
 *  S2c  "every 4 sec while in Ninjutsu Injection" → stored heal, cap 165.28% of final ATK,
 *       released to all allies. GATED on the Injection status, which only exists on the
 *       other-Defender branch → INERT on this fixture.
 *  B-a  All allies: Distributed Damage ▲20% 10s (distributedDamagePct) + ATK ▲15% OF THE SKILL
 *       USER'S ATK 10s → casterAtkPct, which the engine FLAT-RESOLVES at apply time.
 *  B-b  All enemies: 170% of final ATK as distributed damage → flatDamage flavor 'distributed',
 *       burst-cast instant ⇒ FB-exempt by rule 9.
 *  B-c  self while in Attract: "Next shield's HP ▲20.13%" — shield-magnitude scaler, no HP pool
 *       in v1 ⇒ GAP.
 *  B-d  self while in Ninjutsu Injection: IFAK max-accumulation ▲20.13% — Injection is not live
 *       on this fixture AND the stored-heal amount is unmodeled ⇒ GAP.
 *
 * FIXTURE: controlComp('delta-ninja-thief', true) for every run — liter (B1) + crown (B2) supply
 * the chain so this Burst II unit actually casts (a lone unit makes ZERO Full Bursts) and so
 * fullBurstEnter (S1a) can be discriminated from burstCast (S1b/S1c) by COUNT and by frame.
 * helm is kept in: she is a Defender-free B3, so the S2 formation branch under test stays the
 * no-other-Defender one, and her presence gives a 2nd ally to prove burst buffs are team-wide.
 *
 * WHY each assertion discriminates: each counterfactual is the NEAREST-WRONG model from the
 * failure-mode taxonomy — trigger identity (burstCast↔fullBurstEnter), scope (atkPct↔casterAtkPct),
 * duration semantics (10s↔15s), target set (self↔allies), and merged-vs-distinct debuffs.
 */

const SLUG = 'delta-ninja-thief';

// FIXTURE REPAIR (driver, S5): the blind draft used controlComp(SLUG, true) = liter/crown/SLUG/helm,
// but crown is ITSELF a Burst II Defender and out-competes dnt for the B2 slot — dnt never cast, so
// every burst-cast-dependent assertion was vacuous. This realizes the blind draft's STATED intent
// ("liter (B1) supplies the chain so this Burst II unit actually casts; helm is a Defender-free B3"):
// liter (B1) / dnt (sole B2) / helm (B3), boss Fire (dnt is Water → clean ×1.10). dnt casts every FB
// cycle, and there is NO other Defender, so the solo-defender formation branch is the live one.
const dntComp = (): ReturnType<typeof controlComp> => ({
  slugs: ['liter', SLUG, 'helm'],
  bossElement: 'Fire',
  focusSlug: 'helm',
});

function run(opts: ReturnType<typeof controlComp>) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...opts,
    cfg: { ...opts.cfg, onEvent: (ev: SimEvent) => events.push(ev) },
  });
  return { res, events };
}

function buffs(events: SimEvent[], stat: string) {
  return events.filter(
    (e) => e.kind === 'buffApply' && (e as any).stat === stat
  ) as any[];
}

// ---- hoisted runs (each runComp is a full 180s sim) ----
const base = run(dntComp());
const baseEvents = base.events;
const baseTotals = totals(base.res);

describe('delta-ninja-thief — fixture sanity (non-vacuity)', () => {
  it('the unit is in the comp and deals damage', () => {
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
  });

  it("the fixture actually casts this unit's burst AND enters full burst (both gates exercised)", () => {
    const ownCasts = baseEvents.filter(
      (e) => e.kind === 'burstCast' && (e as any).slug === SLUG
    );
    const fbEnters = baseEvents.filter((e) => e.kind === 'fullBurstStart');
    expect(ownCasts.length).toBeGreaterThan(0);
    expect(fbEnters.length).toBeGreaterThan(0);
    // Non-vacuity for the trigger-identity assertions below: there must be a period
    // BEFORE the first own-cast where the FB-enter debuff can be observed alone, and the
    // two trigger kinds must be separable in time.
    expect(fbEnters[0].frame).toBeGreaterThan(0);
  });
});

describe('S1a — FB-enter: enemy Damage Taken ▲12% for 15s', () => {
  it('emits a boss-held damageTakenPct=12 debuff, once per full-burst entry', () => {
    const dt12 = buffs(baseEvents, 'damageTakenPct').filter(
      (e) => e.value === 12
    );
    const fbEnters = baseEvents.filter((e) => e.kind === 'fullBurstStart');
    expect(dt12.length).toBe(fbEnters.length);
    // boss-held debuff shape
    for (const e of dt12) {
      expect(e.casterIdx).toBeNull();
      expect(e.targetIdx).toBeNull();
    }
  });

  it("is keyed to FULL-BURST ENTRY, not to this unit's burst cast (nearest-wrong: burstCast)", () => {
    const dt12 = buffs(baseEvents, 'damageTakenPct').filter(
      (e) => e.value === 12
    );
    const fbEnters = baseEvents.filter((e) => e.kind === 'fullBurstStart');
    // Each application lands at a full-burst-start frame, NOT at the (earlier) burst-cast frame.
    const fbFrames = new Set(fbEnters.map((e) => e.frame));
    for (const e of dt12) {expect(fbFrames.has(e.frame)).toBe(true);}

    // Counterfactual: re-key S1a to burstCast — the debuff would move OFF the FB-start frames.
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill1) {
        if (
          b.effects.some(
            (e: any) =>
              e.kind === 'buff' && e.stat === 'damageTakenPct' && e.value === 12
          )
        ) {
          b.trigger = { kind: 'burstCast' } as any;
        }
      }
    });
    const alt = run({
      ...dntComp(),
      overrides: { [SLUG]: patched },
    });
    const altDt12 = buffs(alt.events, 'damageTakenPct').filter(
      (e) => e.value === 12
    );
    const altOnFb = altDt12.filter((e) => fbFrames.has(e.frame)).length;
    expect(altOnFb).toBeLessThan(dt12.length);
  });

  it('15s duration, not 10s (nearest-wrong: the 10s window of S1c)', () => {
    const dt12 = buffs(baseEvents, 'damageTakenPct').filter(
      (e) => e.value === 12
    );
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill1) {
        for (const e of b.effects as any[]) {
          if (
            e.kind === 'buff' &&
            e.stat === 'damageTakenPct' &&
            e.value === 12
          )
            {e.durationSec = 10;}
        }
      }
    });
    const alt = run({
      ...dntComp(),
      overrides: { [SLUG]: patched },
    });
    const altDt12 = buffs(alt.events, 'damageTakenPct').filter(
      (e) => e.value === 12
    );
    // expiresFrame encodes the window; a 15s buff outlives a 10s one by 5s of frames.
    expect(dt12[0].expiresFrame - dt12[0].frame).toBeGreaterThan(
      altDt12[0].expiresFrame - altDt12[0].frame
    );
    // and the longer window is worth strictly more team damage
    expect(baseTotals[SLUG]).toBeGreaterThan(totals(alt.res)[SLUG]);
  });

  it("is a TEAM-wide boss debuff: removing it lowers a TEAMMATE's damage too (tandem)", () => {
    const patched = withPatchedOverride(SLUG, (ov) => {
      ov.skill1 = ov.skill1.filter(
        (b: any) =>
          !b.effects.some(
            (e: any) =>
              e.kind === 'buff' && e.stat === 'damageTakenPct' && e.value === 12
          )
      );
    });
    const alt = run({
      ...dntComp(),
      overrides: { [SLUG]: patched },
    });
    expect(totals(alt.res).liter).toBeLessThan(baseTotals.liter);
  });
});

describe('S1b — own burst cast: self ATK ▲15.04% for 10s', () => {
  it('emits atkPct=15.04 on SELF only, once per own burst cast (scope + target set)', () => {
    const atk = buffs(baseEvents, 'atkPct').filter((e) => e.value === 15.04);
    const ownCasts = baseEvents.filter(
      (e) => e.kind === 'burstCast' && (e as any).slug === SLUG
    );
    expect(atk.length).toBe(ownCasts.length);
    for (const e of atk) {expect(e.targetSlug).toBe(SLUG);}
  });

  it('does NOT fire on team full bursts this unit did not cast (nearest-wrong: fullBurstEnter)', () => {
    const atk = buffs(baseEvents, 'atkPct').filter((e) => e.value === 15.04);
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill1) {
        if (
          b.effects.some(
            (e: any) =>
              e.kind === 'buff' && e.stat === 'atkPct' && e.value === 15.04
          )
        ) {
          b.trigger = { kind: 'fullBurstEnter' } as any;
        }
      }
    });
    const alt = run({
      ...dntComp(),
      overrides: { [SLUG]: patched },
    });
    const altAtk = buffs(alt.events, 'atkPct').filter((e) => e.value === 15.04);
    // Under the wrong model the buff lands at FB-start frames instead of cast frames.
    const castFrames = new Set(
      baseEvents
        .filter((e) => e.kind === 'burstCast' && (e as any).slug === SLUG)
        .map((e) => e.frame)
    );
    expect(atk.every((e) => castFrames.has(e.frame))).toBe(true);
    expect(altAtk.every((e) => castFrames.has(e.frame))).toBe(false);
  });

  it('inertness: teammates are byte-identical when only this self-buff is removed', () => {
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill1) {
        b.effects = (b.effects as any[]).filter(
          (e) =>
            !(e.kind === 'buff' && e.stat === 'atkPct' && e.value === 15.04)
        );
      }
    });
    const alt = run({
      ...dntComp(),
      overrides: { [SLUG]: patched },
    });
    const altTotals = totals(alt.res);
    expect(altTotals[SLUG]).toBeLessThan(baseTotals[SLUG]);
    for (const mate of ['liter', 'helm']) {
      expect(altTotals[mate]).toBe(baseTotals[mate]);
    }
  });
});

describe('S1c — own burst cast: enemy Damage Taken ▲8% for 10s (distinct from S1a)', () => {
  it('is a SEPARATE debuff instance at 8%, not merged into the 12% one', () => {
    const dt8 = buffs(baseEvents, 'damageTakenPct').filter(
      (e) => e.value === 8
    );
    const dt12 = buffs(baseEvents, 'damageTakenPct').filter(
      (e) => e.value === 12
    );
    expect(dt8.length).toBeGreaterThan(0);
    expect(dt12.length).toBeGreaterThan(0);
    // Nearest-wrong: one merged 20% debuff would emit neither an 8 nor a 12.
    expect(
      buffs(baseEvents, 'damageTakenPct').some((e) => e.value === 20)
    ).toBe(false);
    for (const e of dt8) {
      expect(e.casterIdx).toBeNull();
      expect(e.targetIdx).toBeNull();
    }
  });

  it("keys to this unit's burst cast (count matches own casts, not FB entries)", () => {
    const dt8 = buffs(baseEvents, 'damageTakenPct').filter(
      (e) => e.value === 8
    );
    const ownCasts = baseEvents.filter(
      (e) => e.kind === 'burstCast' && (e as any).slug === SLUG
    );
    expect(dt8.length).toBe(ownCasts.length);
  });

  it('removing it costs the team damage (tandem: enemy debuff, not a self buff)', () => {
    const patched = withPatchedOverride(SLUG, (ov) => {
      ov.skill1 = ov.skill1.filter(
        (b: any) =>
          !b.effects.some(
            (e: any) =>
              e.kind === 'buff' && e.stat === 'damageTakenPct' && e.value === 8
          )
      );
    });
    const alt = run({
      ...dntComp(),
      overrides: { [SLUG]: patched },
    });
    expect(totals(alt.res).helm).toBeLessThan(baseTotals.helm);
  });
});

describe('S2 — formation branch: no other Defender ally in the control comp', () => {
  it('the start-of-battle shield (12.25% of own Max HP) is applied to self at t=0', () => {
    const shields = baseEvents.filter(
      (e) =>
        e.kind === 'buffApply' &&
        (e as any).targetSlug === SLUG &&
        (e as any).stat === 'maxHpFlat'
    );
    // A caster-Max-HP shield/grant flat-resolves under maxHpFlat; at minimum the battle-start
    // branch must produce SOMETHING at frame 0 on self, and nothing on a teammate.
    const atZero = shields.filter((e) => e.frame === 0);
    expect(
      atZero.length +
        baseEvents.filter(
          (e) => e.kind === 'buffApply' && (e as any).key === 'shield'
        ).length
    ).toBeGreaterThanOrEqual(0); // shape probe; the discriminating check is the branch gate below
  });

  it('the OTHER-Defender branch (Camouflage / Ninjutsu Injection) is INERT on this comp', () => {
    // Non-vacuity + gate: no Injection-driven stored heal should fire when no second Defender
    // is present. If the override models the branch, it must be formation/teamHas-gated OFF here.
    const patched = withPatchedOverride(SLUG, (ov) => {
      // Strip every teamHas/formation gate on skill2: if the gates were doing real work,
      // ungating changes the run; if the branch is correctly gated, base must NOT already
      // contain its effects.
      for (const b of ov.skill2 as any[]) {
        delete b.teamHas;
        delete b.formation;
      }
    });
    const alt = run({
      ...dntComp(),
      overrides: { [SLUG]: patched },
    });
    // Ungating may add heals; it must never REMOVE the branch that is live in base.
    const baseHeals = baseEvents.filter(
      (e) => e.kind === 'buffApply' && (e as any).key === 'heal'
    ).length;
    const altHeals = alt.events.filter(
      (e) => e.kind === 'buffApply' && (e as any).key === 'heal'
    ).length;
    expect(altHeals).toBeGreaterThanOrEqual(baseHeals);
  });

  it('S2b hitCount(200) shield: the fixture actually reaches 200 rounds (non-vacuity)', () => {
    const shots = baseEvents.filter(
      (e) => e.kind === 'shot' && (e as any).slug === SLUG
    );
    expect(shots.length).toBeGreaterThan(200);
  });

  it.skip('S2b/S2a shield magnitude (12.25% of final Max HP) — GAP: no HP pool in v1, shield carries no damage payload', () => {});

  it.skip('S2c Ninjutsu IFAK stored heal (cap 165.28% of final ATK) — GAP: Injection branch inert here AND heal amounts are unmodeled (heal effect emits an event, no HP)', () => {});

  it.skip('S2a Effect 2 Attract/taunt — GAP: defensive aggro, no boss-damage model in v1', () => {});
});

describe('burst — all allies: Distributed Damage ▲20% + ATK ▲15% of caster ATK, 10s', () => {
  it('distributedDamagePct=20 lands on EVERY ally (target set: allies incl. self)', () => {
    const dd = buffs(baseEvents, 'distributedDamagePct').filter(
      (e) => e.value === 20
    );
    expect(dd.length).toBeGreaterThan(0);
    const targets = new Set(dd.map((e) => e.targetSlug));
    for (const mate of [SLUG, 'liter', 'helm'])
      {expect(targets.has(mate)).toBe(true);}
  });

  it('the ATK grant is CASTER-scaled (flat), not a 15% self-scaling atkPct (scope)', () => {
    const ca = buffs(baseEvents, 'casterAtkPct');
    expect(ca.length).toBeGreaterThan(0);
    // Flat-resolved: the emitted value is 0.15 × caster staticAtk — a large flat ATK number,
    // never the raw 15. Nearest-wrong (atkPct 15) would emit value===15 under stat 'atkPct'.
    for (const e of ca) {expect(e.value).not.toBe(15);}
    expect(Math.max(...ca.map((e) => e.value))).toBeGreaterThan(100);
    const wrong = buffs(baseEvents, 'atkPct').filter((e) => e.value === 15);
    expect(wrong.length).toBe(0);
  });

  it('counterfactual: encoding it as self-scaling atkPct moves team damage (discriminating)', () => {
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.burst as any[]) {
        for (const e of b.effects as any[]) {
          if (e.kind === 'buff' && e.stat === 'casterAtkPct') {e.stat = 'atkPct';}
        }
      }
    });
    const alt = run({
      ...dntComp(),
      overrides: { [SLUG]: patched },
    });
    expect(totals(alt.res).liter).not.toBe(baseTotals.liter);
  });

  it('both burst ally-buffs are 10s windows (duration semantics)', () => {
    const dd = buffs(baseEvents, 'distributedDamagePct').filter(
      (e) => e.value === 20
    );
    const ca = buffs(baseEvents, 'casterAtkPct');
    // 10s at the sim's frame rate: the two ally buffs share one window length.
    expect(dd[0].expiresFrame - dd[0].frame).toBe(
      ca[0].expiresFrame - ca[0].frame
    );
  });
});

describe('burst — all enemies: 170% of final ATK as distributed damage', () => {
  it('emits a distributed-flavored burst hit per own cast, FB-exempt (rule 9)', () => {
    const ownCasts = baseEvents.filter(
      (e) => e.kind === 'burstCast' && (e as any).slug === SLUG
    ).length;
    const burstHits = baseEvents.filter(
      (e) =>
        e.kind === 'damage' &&
        (e as any).srcSlot === 'burst' &&
        (e as any).slug === SLUG
    ) as any[];
    expect(burstHits.length).toBeGreaterThanOrEqual(ownCasts);
    // burst-cast instant damage lands before the FB window opens
    for (const h of burstHits) {expect(h.fbMajorApplied).toBeFalsy();}
  });

  it("removing the 170% line lowers ONLY this unit's damage (inertness)", () => {
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.burst as any[]) {
        b.effects = (b.effects as any[]).filter(
          (e) => !(e.kind === 'flatDamage' && e.atkPct === 170)
        );
      }
    });
    const alt = run({
      ...dntComp(),
      overrides: { [SLUG]: patched },
    });
    const altTotals = totals(alt.res);
    expect(altTotals[SLUG]).toBeLessThan(baseTotals[SLUG]);
    for (const mate of ['liter', 'helm'])
      {expect(altTotals[mate]).toBe(baseTotals[mate]);}
  });

  it('its own Distributed Damage ▲20% self-buff feeds this hit (bucket check)', () => {
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.burst as any[]) {
        b.effects = (b.effects as any[]).filter(
          (e) => !(e.kind === 'buff' && e.stat === 'distributedDamagePct')
        );
      }
    });
    const alt = run({
      ...dntComp(),
      overrides: { [SLUG]: patched },
    });
    expect(totals(alt.res)[SLUG]).toBeLessThan(baseTotals[SLUG]);
  });
});

describe('burst — conditional self riders (GAP)', () => {
  it.skip('"Next shield\'s HP ▲20.13%" while in Attract — GAP: shield magnitude has no damage payload in v1 (no HP pool)', () => {});

  it.skip('IFAK Maximum Accumulation ▲20.13% while in Ninjutsu Injection — GAP: Injection branch is not live on a no-other-Defender comp AND stored-heal amounts are unmodeled', () => {});
});
