// PER-UNIT KIT SPEC — `bay` (Bay (Treasure), RL/Fire/Defender/Burst II, Tetra, ammo 6,
// chargeFrames 60, reloadFrames 141, burst CD 40s). Kit-autonomy gauntlet 2026-08-03.
// `treasure: true` variant — the ONLY Bay in the data (no base-bay entry exists).
//
// Bay (Treasure) is a PURE TANK: her entire kit is survivability — damage-taken sharing,
// cover HP (share / heal / rebuild / Max HP), a continuous DEF grant, an ally damage-taken
// reduction, and two HP heals. NONE of her nine kit lines deals damage, buffs damage, or
// touches weapon state. The sim models no HP pool, no incoming damage, and no cover, so her
// load-bearing in-domain surface is exactly TWO lines:
//   (a) S1's continuous DEF grant — an offensively-inert `defPct` buff (kit completeness), and
//   (b) S1's Treasure full-charge ally heal — a RECOVERY EVENT channel (the engine models a heal
//       as an event that fires teammates' on-recovery consumers, NOT a number) that emits one
//       recovery event per full charge, and every RL shot IS a full charge (sim.ts: all dumped
//       rockets dispatch charged=true).
// Her personal damage is weapon-only; her board value is tandem (she refreshes recovery-consumer
// teammates such as Asuka/Crown with every shot).
//
// Kit (data/characters.json → characters.bay.skills, SL10):
//   S1 ■ using Burst Skill (self alive) → all allies: Proportionally shares damage taken, cont. [U1 gap]
//      ■ using Burst Skill (self alive) → all allies: DEF ▲10.13% of user's DEF continuously     [B3]
//      ■ Full Charge attacks → all allies (except self): Recovers 4% of user's final Max HP      [B2]
//   S2 ■ using Burst Skill (self alive) → self's cover: shares damage taken continuously         [U2 gap]
//      ■ Full Burst ends → self: recovers Cover HP 2.88% of final Max HP /1s for 5 sec           [U3 gap]
//      ■ entering Burst Stage 1 + cover destroyed → self: Recovers 20% of final Max HP           [U4 gap]
//   BU ■ self if cover destroyed: Rebuild Cover with 20% HP, once per battle                     [U5 gap]
//      ■ self: Max HP of Cover ▲18% of user's Max HP for 20 sec                                  [U6 gap]
//      ■ all allies: Damage Taken ▼8.87% for 10 sec                                              [U7 gap]
//
// One assertion group per kit line, asserted against the SHIPPED override loaded from disk.
// `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest-wrong model each
// assertion must discriminate against) — never to supply the encoding under test.
//
// WHY THESE ASSERTIONS DISCRIMINATE (almost all of bay's kit is offensively inert, so TOTALS
// alone cannot discriminate; the load-bearing evidence is the EVENT LOG, read through a recovery
// CONSUMER):
//   B1  clean-weapon: her own total is byte-identical with her kit zeroed (in the SAME comp), and
//       a defPct→attackDamagePct counterfactual MOVES the team — so the inertness is live, not a
//       vacuous "nothing happens".
//   B2  the Treasure full-charge heal fires ONE recovery event per full charge == per RL shot:
//       asuka's recovery consumer fires exactly bayShots times. The two nearest-wrong triggers are
//       fullBurstEnter (misreading "Full Charge attacks" as the Full Burst window — collapses the
//       firings to the FB count) and stripping the line entirely (firings 0). excludeSelf is
//       structural (bay has no self recovery-consumer to observe it behaviourally).
//   B3  the DEF line is kit-complete (1 application per own burst × 3 allies) and CONTINUOUS
//       (expiresFrame null — "continuously", no expiry), yet damage-INERT (byte-identical totals
//       with the line stripped).
//   B4/U the seven unmodelable lines (damage-share ×2, cover ×4, damage-taken-down ×1) live
//       VERBATIM in `unmodeled`, never an `ignored` drop; skill2/burst blocks are EMPTY (nothing
//       in those slots is in-domain); the cover heal is NOT encoded as a `heal` effect (cover
//       repair is not a Nikke recovery — it would falsely fire teammates' on-recovery consumers),
//       and the ally Damage-Taken-▼ line is NOT encoded as `damageTakenPct` (that stat is a
//       boss-targeted amplifier — wrong direction and wrong target).
//
// FIXTURE. liter (B1) / bay (B2, the SOLE Burst II, 40s CD) / asuka (B3 recovery consumer), boss
// Fire, focus asuka. asuka's own burst lifesteal is patched OUT so bay's full-charge heal is the
// SOLE recovery source — every landing on asuka fires asuka's S1 ("when recovery takes effect" →
// self atkPct 96.98), so counting asuka's self atkPct-96.98 buffApply events counts bay's
// recovery landings on her. liter emits no recovery (her S2 is a cover-HP NO-OP). Deterministic
// (no seed). Slot order: liter 0 / bay 1 / asuka 2.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import {
  bareWeaponOverride,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUGS = ['liter', 'bay', 'asuka'];
/** Slot order: liter 0 / bay 1 / asuka 2. */
const BAY = 1;
const ASUKA = 2;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;

/** asuka's burst lifesteal removed → bay is the only recovery source in the fight. */
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
    overrides: { asuka: asukaSoleConsumer, ...overrides },
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { res, events };
}

// ---- counterfactual patches (nearest-wrong models) -------------------------------------------
/** B2 counterfactual: the full-charge heal keyed to fullBurstEnter ("Full Charge" misread as the
 *  Full Burst window) — the nearest wrong trigger; collapses per-shot firings to per-FB firings. */
const bayHealPerFB = withPatchedOverride('bay', (ov) => {
  const b = (ov.skill1 ?? []).find((x: any) =>
    x.effects.some((e: any) => e.kind === 'heal')
  );
  if (!b) {
    throw new Error('bay skill1 heal block missing — fixture is stale');
  }
  b.trigger = { kind: 'fullBurstEnter' };
});
/** B2 isolation: the full-charge heal stripped entirely (firings must collapse to 0). */
const bayNoHeal = withPatchedOverride('bay', (ov) => {
  const before = ov.skill1?.length ?? 0;
  ov.skill1 = (ov.skill1 ?? []).filter(
    (x: any) => !x.effects.some((e: any) => e.kind === 'heal')
  );
  if (ov.skill1.length !== before - 1) {
    throw new Error('bay skill1 heal block missing — fixture is stale');
  }
});
/** B3 isolation: the DEF line stripped (inertness baseline). */
const bayNoDef = withPatchedOverride('bay', (ov) => {
  const before = ov.skill1?.length ?? 0;
  ov.skill1 = (ov.skill1 ?? []).filter(
    (x: any) => !x.effects.some((e: any) => e.stat === 'defPct')
  );
  if (ov.skill1.length !== before - 1) {
    throw new Error('bay skill1 defPct block missing — fixture is stale');
  }
});
/** B1 counterfactual: the inert defPct re-encoded as a damage stat (must MOVE totals). */
const bayDefAsDamage = withPatchedOverride('bay', (ov) => {
  const e = ov.skill1
    ?.flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'defPct');
  if (!e) {
    throw new Error('bay skill1 defPct effect missing — fixture is stale');
  }
  e.stat = 'attackDamagePct';
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const healPerFB = run({ bay: bayHealPerFB });
const noHeal = run({ bay: bayNoHeal });
const noDef = run({ bay: bayNoDef });
const defAsDamage = run({ bay: bayDefAsDamage });
const bareInTeam = run({ bay: bareWeaponOverride('bay') });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
/** asuka's recovery consumer firings = her self atkPct-96.98 buff (one per recovery landing). */
const recoveryFirings = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) => b.casterIdx === ASUKA && b.stat === 'atkPct' && b.value === 96.98
  ).length;
const bayBuffs = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.casterIdx === BAY);
/** Every RL shot is a full charge (sim.ts: all dumped rockets dispatch charged=true). */
const bayShots = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'shot' && e.slug === 'bay').length;
const bayBursts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'burstCast' && e.slug === 'bay').length;
const fullBursts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart').length;

// The committed override, for the static (structural / unmodeled) pins.
const shipped = loadOverride('bay') as any;
if (!shipped) {
  throw new Error('bay has no override on disk — fixture is stale');
}
const allBlocks = [
  ...(shipped.skill1 ?? []),
  ...(shipped.skill2 ?? []),
  ...(shipped.burst ?? []),
];

describe('bay — fixture sanity (non-vacuity)', () => {
  it('the comp actually bursts: bay casts her Burst II and Full Bursts occur', () => {
    // Non-vacuity gate for every burst-keyed assertion below: a comp that never completes a chain
    // makes zero Full Bursts and would let the burstCast groups pass silently on empty sets.
    expect(bayBursts(base.events)).toBeGreaterThan(0);
    expect(fullBursts(base.events)).toBeGreaterThan(0);
  });

  it('bay fires many full-charge RL shots and deals weapon damage', () => {
    // RL 6-round magazine over 180s ⇒ many shots; the B2 recovery-channel discrimination needs
    // shot count >> FB count. Her own total > 0 guards the inertness assertions (else "unchanged"
    // would be trivially true on a zero).
    expect(bayShots(base.events)).toBeGreaterThan(10);
    expect(bayShots(base.events)).toBeGreaterThan(fullBursts(base.events));
    expect(unitOf(base.res, 'bay').totalDamage).toBeGreaterThan(0);
  });
});

describe('B1 — clean-weapon: her kit contributes nothing to her own damage', () => {
  it('own total is byte-identical with her kit zeroed, in the same comp', () => {
    // With bay's kit swapped for the empty kit, her own total must not move a point (the in-team
    // bare run keeps liter/asuka identical, so this isolates bay's own contribution rather than
    // comparing solo vs team). Zero damage lines and zero weapon-state modifiers in the whole kit.
    expect(unitOf(base.res, 'bay').totalDamage).toBe(
      unitOf(bareInTeam.res, 'bay').totalDamage
    );
  });

  it('DISCRIMINATING: re-encoding the inert defPct as a damage stat MOVES the team', () => {
    // Proves the B3 inertness claim is live, not a vacuous "nothing happens": a defPct→
    // attackDamagePct swap is the nearest wrong "make the kit do something" model, and it must
    // change totals — i.e. the shipped inertness is one that model provably fails.
    expect(totals(defAsDamage.res)).not.toEqual(totals(base.res));
  });
});

describe('B2 — S1 Treasure full-charge heal: one recovery event per full charge, allies except self', () => {
  it('drives the recovery consumer exactly once per bay full charge (== per RL shot)', () => {
    // "Activates when performing Full Charge attacks" — every RL shot is a full charge, so the
    // heal lands on each ally-except-self once per shot; asuka (a target) fires her on-recovery
    // consumer once per landing. bay is the SOLE recovery source in this fixture.
    expect(recoveryFirings(base.events)).toBe(bayShots(base.events));
  });

  it('DISCRIMINATING: a fullBurstEnter trigger collapses the firings to the FB count', () => {
    // The nearest wrong reading of "Full Charge attacks" is the Full Burst window. It must produce
    // strictly fewer firings — exactly one per Full Burst entry — proving the shipped per-shot
    // chargeCounter encoding is the one that fits the prose cadence.
    const collapsed = recoveryFirings(healPerFB.events);
    expect(collapsed).toBeLessThan(recoveryFirings(base.events));
    expect(collapsed).toBe(fullBursts(healPerFB.events));
  });

  it('DISCRIMINATING: stripping the line zeroes the recovery channel', () => {
    // bay has no other recovery source (S2/burst are empty; liter emits none), so removing the
    // line must leave asuka's consumer silent.
    expect(recoveryFirings(noHeal.events)).toBe(0);
  });

  it('stripping the heal leaves bay\u2019s OWN total unchanged (tandem-only channel)', () => {
    // The heal has no HP amount in v1 and no self-buff; it can only matter via a teammate's
    // on-recovery consumer. Removing it cannot move her own weapon output.
    expect(totals(noHeal.res).bay).toBe(totals(base.res).bay);
  });
});

describe('B3 — S1 DEF ▲10.13% of the skill user\u2019s DEF, continuously: kit-complete yet damage-inert', () => {
  const defBuffs = bayBuffs(base.events).filter(
    (b) => b.stat === 'defPct' && b.value === 10.13
  );

  it('applies once per own burst cast to all three allies (bursts × 3)', () => {
    expect(defBuffs.length).toBe(bayBursts(base.events) * SLUGS.length);
    const perFrame = new Map<number, Set<number | null>>();
    for (const b of defBuffs) {
      (
        perFrame.get(b.frame) ?? perFrame.set(b.frame, new Set()).get(b.frame)!
      ).add(b.targetIdx);
    }
    for (const [frame, holders] of perFrame) {
      expect(
        holders.size,
        `frame ${frame} reached ${holders.size} allies`
      ).toBe(SLUGS.length);
    }
  });

  it('is CONTINUOUS (no expiry), not time-bounded or round-counted', () => {
    // "DEF ▲ … continuously" — the grant never expires; re-casts refresh an already-live buff.
    expect(defBuffs.length).toBeGreaterThan(0);
    for (const b of defBuffs) {
      expect(b.expiresFrame).toBeNull();
      expect(b.durationShots).toBeNull();
    }
  });

  it('is damage-INERT: stripping the line leaves every unit byte-identical', () => {
    // defPct is inert in v1 (self DEF never enters damage dealt; there is no incoming damage).
    // The faithful claim for this line is precisely that it moves NO unit's total.
    expect(totals(noDef.res)).toEqual(totals(base.res));
  });
});

describe('B4/U — the seven unmodelable lines are documented, not dropped or fabricated', () => {
  it('skill2 and burst blocks are EMPTY — every line there is out-of-domain', () => {
    // S2: damage-share (cover), cover-HP heal on FB end, cover-destroyed-gated self heal.
    // Burst: cover rebuild once/battle, cover Max HP grant, ally Damage-Taken-▼.
    // The sim models no cover, no HP pool, no incoming damage — nothing in these slots can have
    // an in-domain effect, so the faithful encoding is empty blocks + verbatim `unmodeled`.
    expect(shipped.skill2 ?? []).toEqual([]);
    expect(shipped.burst ?? []).toEqual([]);
  });

  it('the only buff stat bay originates is defPct (no offensive buff is invented)', () => {
    expect([...new Set(bayBuffs(base.events).map((b) => b.stat))]).toEqual([
      'defPct',
    ]);
  });

  it('cover/damage-taken magnitudes never appear as any buff value', () => {
    // 2.88 (cover HoT), 8.87 (Damage Taken ▼) — the two unambiguous unmodeled magnitudes must not
    // surface as buffs anywhere in the event log.
    expect(buffs(base.events).some((b) => b.value === 2.88)).toBe(false);
    expect(buffs(base.events).some((b) => b.value === 8.87)).toBe(false);
  });

  it('the ally Damage-Taken-▼ line is NOT a damageTakenPct boss debuff (S2b pre-registered trap)', () => {
    // The highest-risk shared-prior misread: "Damage Taken" reflex-mapped to the damageTakenPct
    // stat — but that stat is a boss-targeted AMPLIFIER (positive = boss takes MORE damage). The
    // kit line targets ALL ALLIES with ▼ (defensive mitigation). An 8.87% boss debuff per bay
    // burst would inflate every unit's total each rotation; no such buffApply may exist anywhere.
    expect(
      buffs(base.events).some(
        (b) => b.stat === 'damageTakenPct' && b.value === 8.87
      )
    ).toBe(false);
    expect(bayBuffs(base.events).some((b) => b.stat === 'damageTakenPct')).toBe(
      false
    );
  });

  it('all seven gap lines live verbatim in `unmodeled` (never an `ignored` drop)', () => {
    expect(shipped.unmodeled?.skill1?.length).toBe(1);
    expect(shipped.unmodeled?.skill2?.length).toBe(3);
    expect(shipped.unmodeled?.burst?.length).toBe(3);
    expect(shipped.unmodeled.skill1.join(' ')).toContain(
      'Proportionally shares damage taken continuously'
    );
    const s2 = shipped.unmodeled.skill2.join(' ');
    expect(s2).toContain('shares damage taken continuously');
    expect(s2).toContain('2.88%');
    expect(s2).toContain('cover has been destroyed');
    const bu = shipped.unmodeled.burst.join(' ');
    expect(bu).toContain('Rebuild Cover');
    expect(bu).toContain('18%');
    expect(bu).toContain('8.87%');
    expect(shipped.ignored).toBeUndefined();
  });

  it('no `heal`/`shield` effect anywhere — cover repair is NOT a Nikke recovery', () => {
    // Encoding the S2 cover-HP heal or the cover rebuild as a `heal`/`shield` would emit
    // recovery/shielded events and falsely satisfy teammates' on-recovery/requiresShielded gates.
    // bay's ONLY legitimate heal is the S1 Treasure line targeting allies — one block, skill1.
    const heals = allBlocks.filter((b: any) =>
      b.effects.some((e: any) => e.kind === 'heal')
    );
    expect(heals.length).toBe(1);
    expect(heals[0].slot).toBe('skill1');
    const kinds = allBlocks.flatMap((b: any) =>
      b.effects.map((e: any) => e.kind)
    );
    expect(kinds).not.toContain('shield');
  });
});

describe('structural pins (S2b-pre-registered traps, adopted at S2c)', () => {
  it('the DEF line is keyed to burstCast (own cast), never fullBurstEnter', () => {
    // "Activates when using Burst Skill, only if self is alive" — own-cast keyed. fullBurstEnter
    // would re-apply on every team FB regardless of who cast; asserted statically so it holds
    // regardless of fixture.
    const defBlock = (shipped.skill1 ?? []).find((b: any) =>
      b.effects.some((e: any) => e.stat === 'defPct')
    );
    expect(defBlock?.trigger?.kind).toBe('burstCast');
  });

  it('the heal line is keyed to the full-charge counter with allies-except-self targeting', () => {
    const healBlock = (shipped.skill1 ?? []).find((b: any) =>
      b.effects.some((e: any) => e.kind === 'heal')
    );
    expect(healBlock?.trigger?.kind).toBe('chargeCounter');
    expect(healBlock?.target).toEqual({ kind: 'allies', excludeSelf: true });
  });
});
