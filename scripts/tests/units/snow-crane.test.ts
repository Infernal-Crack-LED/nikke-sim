// PER-UNIT KIT SPEC — `snow-crane` (Snow Crane, SR/Water/Defender/Burst II, Missilis, ammo 6,
// reloadFrames 141, chargeFrames 60). Kit-autonomy gauntlet 2026-08-04. BASE unit (no variant).
//
// snow-crane is the SR clean-weapon basis cell (scripts/tests/lib/harness.ts
// CLEAN_WEAPON_TEAMS.a): her kit contributes NOTHING to her own damage. Every line is heal /
// shield / Max HP / Pierce — and her Pierce is burst-granted (10s window) while the basis runs
// `disableBursts: true`, so the CW1 damage-neutrality proof holds (owner ruling 2026-08-01,
// marciana precedent: a clean-weapon unit MAY carry an override iff it sims byte-identical to
// the empty kit). Even bursts-ON she stays neutral in v1: `gainPierce` only matters through a
// `pierceDamagePct` buff (none exists on any shipped unit) and PIERCE_CORE_DOUBLE is off (and
// keyed to the STATIC hasPierce flag, never a timed window).
//
// Kit (data/characters.json → characters['snow-crane'].skills, SL10):
//   S1 ■ while NOT Terminated Contract → all allies: Exclusive Recovery Agreement (ERA):
//        Max HP ▲ 10% of the skill user's Max HP, continuously                             [M1/M6]
//      ■ when recovery taken from ANOTHER unit → self: Proof of Violation: outgoing
//        healing ▼ 10%, ≤3 stacks, continuously                                   [UNMODELED, M7]
//   S2 ■ after 3 Full Charge attacks → allies in ERA: Recover 1.32% final Max HP           [M2]
//      ■ entering Full Burst → all allies: Shield = 9.5% final Max HP, 10 sec              [M3]
//      ■ Proof of Violation at max stacks → self: Terminated Contract: immunity to
//        PoV + Recover 0.24% final Max HP every 1 sec, continuously              [UNMODELED, M7]
//   BU ■ all allies: Recover 44.68% of the skill user's final Max HP                       [M4]
//      ■ self: Gain Pierce for 10 sec                                                      [M5]
//
// One assertion group per kit line (M1..M7), asserted against the SHIPPED override loaded from
// disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model each
// assertion must discriminate against) and to ISOLATE a line — never to supply the encoding
// under test.
//
// WHY THESE ASSERTIONS DISCRIMINATE (almost every line is offensively inert, so TOTALS alone
// cannot discriminate; the load-bearing evidence is the EVENT LOG read through CONSUMERS):
//   M1  clean-weapon: her own total is byte-identical with her kit zeroed (in-team AND on the
//       bare-weapon basis, the CW1 contract), and an offensive re-encoding MOVES her total —
//       the inertness is live, not a vacuous "nothing happens".
//   M2  S2a heal fires every 3rd full charge (chargeCounter 3): asuka's recovery consumer fires
//       floor(charges/3) times from S2a; a count:1 counterfactual fires per-charge (more), and
//       omitting countInFb over-fires in the 10s after her OWN burst (the chargeCounter
//       primitive's SBS-baked `countInFb ?? 1` default — the trap this kit must author around).
//   M3  S2b shield is keyed fullBurstEnter, not burstCast: with a SECOND Burst II (folkwang,
//       forced bare) the comp makes more Full Bursts than snow-crane casts. The shield lands at
//       EVERY FB entry (asuka's requiresShielded S2 gate passes every FB); a burstCast-keyed
//       counterfactual expires before entry (the chain holds ~20-38s for the B3 cast) and
//       passes the gate ZERO times.
//   M4  the burst heals (isolate S1+S2 away → recovery firings == her burstCast count).
//   M5  gainPierce is a REAL timed window: probed through an in-memory pierceDamagePct buff
//       (never committed) — no pierce ≡ base damage < 10s window < permanent pierce.
//   M6  S1a aura is a casterMaxHpPct grant on all allies — converted to a flat maxHpFlat at
//       apply time, so 4 buffApply(maxHpFlat) at frame 0 with ONE value equal across targets
//       (a targetMaxHpPct mis-encoding would vary per holder); never an offensive stat —
//       re-encoding it as attackDamagePct MOVES the team.
//   M7  the two unmodelable lines (Proof of Violation, Terminated Contract) live verbatim in
//       `unmodeled`; no `ignored` block; no regen emitter / stack buff is fabricated.
//
// FIXTURE. liter (B1) / folkwang (B2, forced BARE — her shipped override carries shields/heals
// that would contaminate M3) / snow-crane (B2) / asuka (B3, burst lifesteal patched OUT so
// snow-crane is the SOLE recovery source). Boss Fire, focus asuka. Two Burst IIs make FB count
// strictly exceed snow-crane's cast count (the M3 discriminator). asuka is a double consumer:
// her S1 ("when recovery takes effect" → self atkPct 96.98/25s) counts recovery landings on her;
// her S2-1 (FB-enter elemAdvantageDamagePct 30.02, requiresShielded) reports whether she held a
// shield at each Full Burst entry. Deterministic (no seed). Slots: liter 0 / folkwang 1 /
// snow-crane 2 / asuka 3.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import {
  bareWeaponComp,
  bareWeaponOverride,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const SLUGS = ['liter', 'folkwang', 'snow-crane', 'asuka'];
/** Slot order: liter 0 / folkwang 1 / snow-crane 2 / asuka 3. */
const SC = 2;
const ASUKA = 3;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;

/** asuka's burst lifesteal removed → snow-crane is the only recovery source in the fight. */
const asukaSoleConsumer = withPatchedOverride('asuka', (ov) => {
  for (const b of ov.burst ?? []) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.kind !== 'heal');
    if (b.effects.length === before) {
      throw new Error('asuka burst heal missing — fixture is stale');
    }
  }
});

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: SLUGS,
    bossElement: 'Fire',
    focusSlug: 'asuka',
    overrides: {
      folkwang: bareWeaponOverride('folkwang'), // bare basis cell — no shields/heals
      asuka: asukaSoleConsumer,
      ...overrides,
    },
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { res, events };
}

// ---- counterfactual / isolation patches (nearest-wrong models) -------------------------------
/** M2 counterfactual: S2a heals on EVERY full charge (nearest wrong "after 3"). */
const scHealEveryCharge = withPatchedOverride('snow-crane', (ov) => {
  for (const b of ov.skill2 ?? []) {
    if (b.trigger?.kind === 'chargeCounter') {
      b.trigger.count = 1;
      b.trigger.countInFb = 1;
    }
  }
});
/** M2 counterfactual: countInFb OMITTED → the primitive's `?? 1` default over-fires the heal
 *  in the 10s after snow-crane's own burst cast (the SBS-baked trap this kit must author around). */
const scNoCountInFb = withPatchedOverride('snow-crane', (ov) => {
  for (const b of ov.skill2 ?? []) {
    if (b.trigger?.kind === 'chargeCounter') {
      delete b.trigger.countInFb;
    }
  }
});
/** M3 counterfactual: the shield keyed to her OWN burst cast, not Full Burst entry. */
const scShieldOnBurstCast = withPatchedOverride('snow-crane', (ov) => {
  for (const b of ov.skill2 ?? []) {
    if (b.trigger?.kind === 'fullBurstEnter') {
      b.trigger = { kind: 'burstCast' };
    }
  }
});
/** M4 isolation: S1+S2 stripped, leaving the burst heal as the only recovery source. */
const scNoS1S2 = withPatchedOverride('snow-crane', (ov) => {
  if (!ov.skill1?.length || !ov.skill2?.length) {
    throw new Error('snow-crane skill1/skill2 missing — fixture is stale');
  }
  ov.skill1 = [];
  ov.skill2 = [];
});
/** M5 isolation: the burst's gainPierce removed (it lives in ONE of the two burst blocks). */
const scNoPierce = withPatchedOverride('snow-crane', (ov) => {
  const before = (ov.burst ?? []).flatMap((b: any) => b.effects).length;
  for (const b of ov.burst ?? []) {
    b.effects = b.effects.filter((e: any) => e.kind !== 'gainPierce');
  }
  const after = (ov.burst ?? []).flatMap((b: any) => b.effects).length;
  if (after !== before - 1) {
    throw new Error('snow-crane burst gainPierce missing — fixture is stale');
  }
});
/** M5 counterfactual: Pierce made permanent (nearest wrong reading of a timed grant). */
const scPiercePermanent = withPatchedOverride('snow-crane', (ov) => {
  for (const b of ov.burst ?? []) {
    for (const e of b.effects) {
      if (e.kind === 'gainPierce') {
        delete e.durationSec;
      }
    }
  }
});
/** M1 counterfactual: the nearest wrong "burst does something offensive" model. */
const scOffensive = withPatchedOverride('snow-crane', (ov) => {
  ov.burst.push({
    slot: 'burst',
    trigger: { kind: 'burstCast' },
    target: { kind: 'self' },
    effects: [
      { kind: 'buff', stat: 'attackDamagePct', value: 50, durationSec: 10 },
    ],
  });
});
/** M6 counterfactual: the ERA aura re-encoded as a damage stat (must MOVE the team). */
const scAuraAsDamage = withPatchedOverride('snow-crane', (ov) => {
  const e = ov.skill1
    ?.flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'casterMaxHpPct');
  if (!e) {
    throw new Error('snow-crane ERA buff missing — fixture is stale');
  }
  e.stat = 'attackDamagePct';
});
/** M5 PROBE (never committed): a passive self pierceDamagePct buff so the pierce window becomes
 *  damage-visible. Composed onto the shipped / stripped / permanent variants below. */
const withPierceProbe = (ov: any) => {
  ov.skill1.push({
    slot: 'skill1',
    trigger: { kind: 'passive' },
    target: { kind: 'self' },
    effects: [{ kind: 'buff', stat: 'pierceDamagePct', value: 100 }],
  });
  return ov;
};
const scProbeShipped = withPatchedOverride('snow-crane', withPierceProbe);
const scProbeNoPierce = withPatchedOverride('snow-crane', (ov) =>
  withPierceProbe(
    (() => {
      for (const b of ov.burst ?? []) {
        b.effects = b.effects.filter((e: any) => e.kind !== 'gainPierce');
      }
      return ov;
    })()
  )
);
const scProbePermanent = withPatchedOverride('snow-crane', (ov) =>
  withPierceProbe(
    (() => {
      for (const b of ov.burst ?? []) {
        for (const e of b.effects) {
          if (e.kind === 'gainPierce') {
            delete e.durationSec;
          }
        }
      }
      return ov;
    })()
  )
);

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const healEveryCharge = run({ 'snow-crane': scHealEveryCharge });
const noCountInFb = run({ 'snow-crane': scNoCountInFb });
const shieldOnBurstCast = run({ 'snow-crane': scShieldOnBurstCast });
const noS1S2 = run({ 'snow-crane': scNoS1S2 });
const offensive = run({ 'snow-crane': scOffensive });
const auraAsDamage = run({ 'snow-crane': scAuraAsDamage });
const bareInTeam = run({ 'snow-crane': bareWeaponOverride('snow-crane') });
const probeShipped = run({ 'snow-crane': scProbeShipped });
const probeNoPierce = run({ 'snow-crane': scProbeNoPierce });
const probePermanent = run({ 'snow-crane': scProbePermanent });
// The CW1 contract, restated in-unit: the shipped override on the bare-weapon basis
// (solo, boss Iron, bursts disabled) must be byte-identical to the empty kit.
const shippedForSolo = loadOverride('snow-crane');
const soloBare = runComp(bareWeaponComp(['snow-crane']));
const soloKit = runComp(
  bareWeaponComp(['snow-crane'], {
    overrides: { 'snow-crane': shippedForSolo },
  })
);

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
/** asuka's recovery-consumer firings = her self atkPct-96.98 buff (one per recovery landing). */
const recoveryFirings = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) => b.casterIdx === ASUKA && b.stat === 'atkPct' && b.value === 96.98
  ).length;
/** asuka's shield-gate passes = her FB-enter elemAdvantageDamagePct-30.02 buff applications. */
const shieldGatePasses = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === ASUKA &&
      b.stat === 'elemAdvantageDamagePct' &&
      b.value === 30.02
  ).length;
const scBuffs = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.casterIdx === SC);
const scCharges = (evs: SimEvent[]) =>
  evs.filter(
    (e) => e.kind === 'shot' && e.slug === 'snow-crane' && e.charged
  ).length;
const scBursts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'burstCast' && e.slug === 'snow-crane').length;
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart').length;

// The committed override, for the static (structural / unmodeled) pins.
const shipped = loadOverride('snow-crane') as any;
if (!shipped) {
  throw new Error('snow-crane has no override on disk — fixture is stale');
}
const allBlocks = [
  ...(shipped.skill1 ?? []),
  ...(shipped.skill2 ?? []),
  ...(shipped.burst ?? []),
];

describe('snow-crane — fixture sanity (non-vacuity)', () => {
  it('the comp bursts, and two Burst IIs make FBs strictly outnumber her casts', () => {
    // Non-vacuity gate for every burst-keyed assertion; the strict inequality is the M3
    // discriminator's precondition (folkwang takes the stage-II casts snow-crane sits out).
    expect(scBursts(base.events)).toBeGreaterThan(0);
    expect(fbStarts(base.events)).toBeGreaterThan(0);
    expect(fbStarts(base.events)).toBeGreaterThan(scBursts(base.events));
  });

  it('snow-crane full-charges repeatedly and deals weapon damage', () => {
    // SR: every pull is a full charge; many charges are needed before floor(charges/3) ≥ 1,
    // and her own total > 0 guards the inertness assertions (else "unchanged" is trivially
    // true on a zero).
    expect(scCharges(base.events)).toBeGreaterThan(8);
    expect(unitOf(base.res, 'snow-crane').totalDamage).toBeGreaterThan(0);
  });
});

describe('M1 — clean-weapon: her kit contributes nothing to her own damage', () => {
  it('own total is byte-identical with her kit zeroed, in the same comp', () => {
    expect(unitOf(base.res, 'snow-crane').totalDamage).toBe(
      unitOf(bareInTeam.res, 'snow-crane').totalDamage
    );
  });

  it('CW1 contract: on the bare-weapon basis (bursts off) the override is byte-identical to the empty kit', () => {
    // The SR clean-weapon basis cell. Bursts are disabled there, so the burst-granted Pierce
    // never applies — this is the damage-neutrality proof the clean-weapon landing rides on.
    expect(unitOf(soloKit, 'snow-crane').totalDamage).toBe(
      unitOf(soloBare, 'snow-crane').totalDamage
    );
  });

  it('DISCRIMINATING: an offensive burst re-encoding MOVES her own total', () => {
    // The nearest wrong "the burst does something offensive" model must change her damage —
    // the shipped inertness is one that model provably fails.
    expect(unitOf(offensive.res, 'snow-crane').totalDamage).not.toBe(
      unitOf(base.res, 'snow-crane').totalDamage
    );
  });
});

describe('M2 — S2a: heal every 3rd full charge (chargeCounter 3, incl. countInFb 3)', () => {
  it('recovery firings == floor(charges/3) from S2a + one per burst heal', () => {
    // The kit line is "Activates after 3 Full Charge attack(s)" — recurring. With snow-crane
    // the sole recovery source, asuka's consumer counts every S2a firing (floor(charges/3))
    // plus every burst heal (M4 isolates that share).
    expect(recoveryFirings(base.events)).toBe(
      Math.floor(scCharges(base.events) / 3) + scBursts(base.events)
    );
  });

  it('DISCRIMINATING: a count:1 counterfactual fires the heal on EVERY full charge', () => {
    expect(recoveryFirings(healEveryCharge.events)).toBe(
      scCharges(healEveryCharge.events) + scBursts(healEveryCharge.events)
    );
    expect(recoveryFirings(healEveryCharge.events)).toBeGreaterThan(
      recoveryFirings(base.events)
    );
  });

  it('DISCRIMINATING: omitting countInFb over-fires in the 10s after her own burst', () => {
    // The chargeCounter primitive defaults `countInFb` to 1 inside the 10s post-own-burst
    // window (SBS-specific semantics baked into the engine). Her kit has no such clause, so
    // the override MUST author countInFb: 3 — omitting it heals every charge after each cast.
    expect(recoveryFirings(noCountInFb.events)).toBeGreaterThan(
      recoveryFirings(base.events)
    );
  });
});

describe('M3 — S2b: Full-Burst-entry shield on all allies (9.5% final Max HP, 10s)', () => {
  it('asuka is shielded at EVERY Full Burst entry (gate passes == FB count)', () => {
    // fullBurstEnter keying lands the shield on every chain completion, including the FBs
    // where folkwang (not snow-crane) took the stage-II cast.
    expect(shieldGatePasses(base.events)).toBe(fbStarts(base.events));
  });

  it('DISCRIMINATING: burstCast keying leaves NO Full Burst entry shielded', () => {
    // Stronger than "fewer": the stage-II cast precedes Full Burst entry by the whole stage-III
    // wait (the chain holds for asuka's 40s cooldown — ~20-38s here), so a 10s shield granted
    // at HER CAST has always expired by FB entry. The fullBurstEnter keying lands it exactly
    // at entry — the two keyings differ by the whole comp, not an edge case.
    expect(shieldGatePasses(shieldOnBurstCast.events)).toBe(0);
    expect(shieldGatePasses(base.events)).toBeGreaterThan(0);
  });

  it('structurally: fullBurstEnter trigger, allies target, 9.5 / 10s magnitudes', () => {
    const b = (shipped.skill2 ?? []).find(
      (x: any) => x.trigger?.kind === 'fullBurstEnter'
    );
    expect(b).toBeDefined();
    expect(b.target).toEqual({ kind: 'allies' });
    const s = b.effects.find((e: any) => e.kind === 'shield');
    expect(s).toEqual({ kind: 'shield', maxHpPct: 9.5, durationSec: 10 });
  });
});

describe('M4 — burst: team heal (44.68% of her final Max HP, as a recovery event)', () => {
  it('isolating the burst (S1+S2 stripped) leaves recovery firings == her burstCast count', () => {
    expect(recoveryFirings(noS1S2.events)).toBe(scBursts(noS1S2.events));
    expect(scBursts(noS1S2.events)).toBeGreaterThan(0);
  });

  it('the burst heal share in the base run equals her cast count', () => {
    // Cross-check of the M2 decomposition: base firings − S2a firings = burst heal firings.
    expect(
      recoveryFirings(base.events) -
        Math.floor(scCharges(base.events) / 3)
    ).toBe(scBursts(base.events));
  });
});

describe('M5 — burst: Gain Pierce for 10 sec — a real timed window (probed, damage-visible)', () => {
  it('the probe alone adds nothing: pierceDamagePct is inert without a pierce tag', () => {
    // With gainPierce stripped, the in-memory pierceDamagePct probe never enters damage —
    // her total is exactly the base total. This is the control that makes the next two
    // inequalities evidence instead of noise.
    expect(unitOf(probeNoPierce.res, 'snow-crane').totalDamage).toBe(
      unitOf(base.res, 'snow-crane').totalDamage
    );
  });

  it('the shipped gainPierce window is LIVE: probe + shipped > probe + no pierce', () => {
    expect(
      unitOf(probeShipped.res, 'snow-crane').totalDamage
    ).toBeGreaterThan(unitOf(probeNoPierce.res, 'snow-crane').totalDamage);
  });

  it('the window is TIME-BOUNDED: permanent pierce out-damages the 10s window', () => {
    expect(
      unitOf(probePermanent.res, 'snow-crane').totalDamage
    ).toBeGreaterThan(unitOf(probeShipped.res, 'snow-crane').totalDamage);
  });

  it('structurally: burstCast trigger, self target, gainPierce durationSec 10', () => {
    const pierce = (shipped.burst ?? [])
      .flatMap((b: any) => b.effects)
      .find((e: any) => e.kind === 'gainPierce');
    expect(pierce).toEqual({ kind: 'gainPierce', durationSec: 10 });
    for (const b of shipped.burst ?? []) {
      expect(b.trigger?.kind).toBe('burstCast');
    }
  });
});

describe('M6 — S1a: ERA is a casterMaxHpPct aura on all allies (offensively inert)', () => {
  // casterMaxHpPct is converted to a FLAT Max HP grant at apply time (sim.ts: the buff arrives
  // as maxHpFlat), so the buffApply events carry stat 'maxHpFlat' with the converted value —
  // %-of-CASTER scaling reads as one flat amount, EQUAL across every target. Under the nearest
  // wrong stat (targetMaxHpPct — % of each target's OWN Max HP) the values would differ per
  // holder, which is what the all-equal pin discriminates.
  const eraBuffs = scBuffs(base.events).filter((b) => b.stat === 'maxHpFlat');

  it('applies once at fight start to all four allies, with no expiry', () => {
    expect(eraBuffs.length).toBe(SLUGS.length);
    for (const b of eraBuffs) {
      expect(b.frame).toBe(0);
      expect(b.expiresFrame).toBeNull();
      expect(b.durationShots).toBeNull();
    }
    expect(new Set(eraBuffs.map((b) => b.targetIdx)).size).toBe(SLUGS.length);
  });

  it('the grant is caster-scaled: one flat value, equal on every ally', () => {
    expect(eraBuffs[0].value).toBeGreaterThan(0);
    for (const b of eraBuffs) {
      expect(b.value).toBe(eraBuffs[0].value);
    }
  });

  it('is damage-INERT: re-encoding the aura as attackDamagePct MOVES the team', () => {
    expect(totals(auraAsDamage.res)).not.toEqual(totals(base.res));
  });
});

describe('M7 — the unmodelable lines are documented, not dropped or fabricated', () => {
  it('Proof of Violation + Terminated Contract live verbatim in `unmodeled`', () => {
    expect(shipped.unmodeled?.skill1?.length).toBeGreaterThan(0);
    expect(shipped.unmodeled?.skill2?.length).toBeGreaterThan(0);
    expect(shipped.unmodeled.skill1.join(' ')).toContain('Proof of Violation');
    expect(shipped.unmodeled.skill2.join(' ')).toContain(
      'Terminated Contract'
    );
    expect((shipped as any).ignored).toBeUndefined();
  });

  it('no fabricated sustain: her only buff stat is the ERA Max HP grant (maxHpFlat at apply time), and no interval/per-second regen block exists', () => {
    expect([...new Set(scBuffs(base.events).map((b) => b.stat))]).toEqual([
      'maxHpFlat',
    ]);
    for (const b of allBlocks) {
      expect(b.trigger?.kind).not.toBe('interval');
    }
  });

  it('no stack buff is invented for Proof of Violation (no maxStacks anywhere)', () => {
    for (const b of allBlocks) {
      for (const e of b.effects) {
        expect((e as any).maxStacks).toBeUndefined();
      }
    }
  });
});

describe('structural pins (S2b-pre-registered traps, adopted at S2c)', () => {
  it('S2a is a chargeCounter with count 3 AND countInFb 3 (the SBS-default trap authored around)', () => {
    const cc = (shipped.skill2 ?? []).find(
      (b: any) => b.trigger?.kind === 'chargeCounter'
    );
    expect(cc?.trigger).toEqual({ kind: 'chargeCounter', count: 3, countInFb: 3 });
    expect(cc?.target).toEqual({ kind: 'allies' });
    expect(cc?.effects).toEqual([{ kind: 'heal', ticks: 1 }]);
  });

  it('S1a is a passive casterMaxHpPct aura on allies', () => {
    const b = (shipped.skill1 ?? []).find(
      (x: any) => x.trigger?.kind === 'passive'
    );
    expect(b?.target).toEqual({ kind: 'allies' });
    expect(b?.effects).toEqual([
      { kind: 'buff', stat: 'casterMaxHpPct', value: 10 },
    ]);
  });

  it('no damage effects anywhere — the kit is heal/shield/MaxHP/pierce only', () => {
    const kinds = allBlocks.flatMap((b: any) =>
      b.effects.map((e: any) => e.kind)
    );
    for (const k of kinds) {
      expect(['buff', 'heal', 'shield', 'gainPierce']).toContain(k);
    }
  });
});
