// PER-UNIT KIT SPEC — `emma` (Emma, MG/Fire/Supporter/Burst I, Elysion, ammo 300,
// hitsPerShot 1, reloadFrames 171, burst CD 40s). Kit-autonomy gauntlet 2026-08-05
// (BASE unit — NOT emma-tactical-upgrade, the environment-setup Burst I variant;
// never the bare base name).
//
// Emma is a PURE HEALER and the MG clean-weapon basis cell (scripts/tests/lib/harness.ts
// CLEAN_WEAPON_TEAMS.b): her kit contributes NOTHING to her own damage. Every line is
// either a RECOVERY EVENT (the engine models a heal as an event that fires teammates'
// on-recovery consumers, NOT a number — there is no HP pool / survivability sim) or an
// out-of-domain sustain line with no engine primitive. Her personal damage is weapon-only;
// her board value is tandem (she refreshes recovery-consumer teammates such as
// Asuka/Crown to near-permanent self/team buffs).
//
// Kit (data/characters.json → characters.emma.skills, SL10):
//   S1 ■ 5% chance to activate when attacked → all allies: Recovers 10.77% of the skill
//      user's final Max HP as HP                                                    [E4 gap]
//   S2 ■ Activates when above 90% HP → all allies: Incoming healing ▲13.33%
//      continuously                                                                 [E4 gap]
//   BU ■ all allies: Recover HP equal to 39.6% of the skill user's final Max HP     [E2]
//      ■ all allies: Recover 39.6% of attack damage as HP over 5 sec               [E3]
//
// One assertion group per kit line (E1..E4), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest
// wrong model each assertion must discriminate against) and to ISOLATE a burst line whose
// effect is otherwise masked by the other — never to supply the encoding under test.
//
// WHY THESE ASSERTIONS DISCRIMINATE (a test that cannot fail under the nearest wrong model
// gates nothing — and ALL of emma's lines are offensively inert, so TOTALS alone cannot
// discriminate; the load-bearing evidence is the EVENT LOG, read through a recovery
// CONSUMER):
//   E1  clean-weapon: her own total is byte-identical with her kit zeroed (in the SAME
//       comp), and a heal→attackDamagePct counterfactual MOVES the team — so the inertness
//       is live, not a vacuous "nothing happens". (CW1's solo damage-neutrality pin in
//       clean-weapons.test.ts covers the bursts-off basis; this is the bursts-on, in-team
//       half.)
//   E2  the burst's instant heal is keyed to her OWN burst cast (burstCast), not
//       fullBurstEnter. The fixture fields TWO Burst I units (emma CD 40s + liter CD 20s)
//       and a 40s-CD Burst III, so the two keyings genuinely diverge IN BOTH DIRECTIONS
//       (calibrated anatomy, 180s: 5 emma casts — 1 opens a Full Burst, 4 stall before the
//       chain completes; 4 Full Bursts — 1 emma-led, 3 opened by liter). A fullBurstEnter
//       encoding heals on the 3 liter-led windows emma never cast in and DROPS her 4
//       stalled-chain casts: a different volley set, and a different firing count, than the
//       faithful model (her burst skill heals when SHE casts, chain completion irrelevant).
//       Isolating the instant line (HoT stripped) leaves recovery firings == her burstCast
//       count, exactly 1 per own cast.
//   E3  the burst's lifesteal line ("over 5 sec") is a 5-tick HoT cadence: asuka's recovery
//       consumer fires 5× per emma cast off that line alone; a ticks:1 counterfactual
//       collapses it to 1 per cast. Both lines together land 6 recoveries per cast.
//   E4  the two unmodelable lines (5%-on-attacked heal 10.77; incoming-healing 13.33) are
//       documented verbatim in `unmodeled`, never an `ignored` drop; emma originates ZERO
//       buffs of any kind (her only in-domain payload is recovery events); none of her kit
//       magnitudes appears as any buff value.
//
// FIXTURE. emma (B1, 40s) / liter (B1, 20s) / admi (B2, 20s) / asuka (B3 recovery
// consumer), boss Fire, focus asuka. Two B1s + a 40s-CD B3 so burstCast-vs-fullBurstEnter
// genuinely diverge (emma casts that stall without a Full Burst; liter-led windows emma
// never casts in — the E2 premise); liter and admi are recovery-silent (no heal effects,
// no recovery triggers, no shields). asuka's own burst lifesteal is patched OUT so emma is
// the SOLE recovery source — every landing of emma's heal on asuka fires asuka's S1 ("when
// recovery takes effect" → self atkPct 96.98), so counting asuka's self atkPct-96.98
// buffApply events counts emma's recovery landings on her. Deterministic (no seed). Slot
// order: emma 0 / liter 1 / admi 2 / asuka 3.
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

const SLUGS = ['emma', 'liter', 'admi', 'asuka'];
/** Slot order: emma 0 / liter 1 / admi 2 / asuka 3. */
const EMMA = 0;
const ASUKA = 3;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;

/** asuka's burst lifesteal removed → emma is the only recovery source in the fight. */
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

// ---- counterfactual / isolation patches (nearest-wrong models) -------------------------------
/** E2 counterfactual: both burst blocks re-keyed to fullBurstEnter (fires on EVERY Full
 *  Burst window, including the ones liter opens without emma). */
const emmaFullBurstEnter = withPatchedOverride('emma', (ov) => {
  if (!ov.burst?.length) {
    throw new Error('emma burst missing — fixture is stale');
  }
  for (const b of ov.burst) {
    b.trigger = { kind: 'fullBurstEnter' };
  }
});
/** E2 isolation: the HoT block stripped, leaving only the instant heal line. */
const emmaInstantOnly = withPatchedOverride('emma', (ov) => {
  if (!ov.burst?.length) {
    throw new Error('emma burst missing — fixture is stale');
  }
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) =>
      !b.effects.some((e: any) => e.kind === 'heal' && (e.ticks ?? 1) > 1)
  );
  if (ov.burst.length === before) {
    throw new Error('emma burst HoT block missing — fixture is stale');
  }
});
/** E3 counterfactual: the lifesteal HoT collapsed to a single instant tick (nearest wrong
 *  reading of "over 5 sec"). */
const emmaTicks1 = withPatchedOverride('emma', (ov) => {
  let found = false;
  for (const b of ov.burst ?? []) {
    for (const e of b.effects) {
      if (e.kind === 'heal' && (e.ticks ?? 1) > 1) {
        e.ticks = 1;
        found = true;
      }
    }
  }
  if (!found) {
    throw new Error('emma burst HoT heal missing — fixture is stale');
  }
});
/** E1 counterfactual: both burst heals re-encoded as a damage buff — the nearest wrong
 *  "make her burst do something offensive" model (must MOVE totals). */
const emmaHealAsDamage = withPatchedOverride('emma', (ov) => {
  if (!ov.burst?.length) {
    throw new Error('emma burst missing — fixture is stale');
  }
  for (const b of ov.burst) {
    b.effects = [
      { kind: 'buff', stat: 'attackDamagePct', value: 39.6, durationSec: 10 },
    ];
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const bareInTeam = run({ emma: bareWeaponOverride('emma') });
const fullBurstEnter = run({ emma: emmaFullBurstEnter });
const instantOnly = run({ emma: emmaInstantOnly });
const ticks1 = run({ emma: emmaTicks1 });
const healAsDamage = run({ emma: emmaHealAsDamage });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
/** asuka's recovery consumer firings = her self atkPct-96.98 buff (one per recovery landing). */
const recoveryFirings = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) => b.casterIdx === ASUKA && b.stat === 'atkPct' && b.value === 96.98
  ).length;
const emmaBursts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'burstCast' && e.slug === 'emma').length;
const fullBurstStarts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart').length;

// The committed override, for the static (structural / unmodeled) pins.
const shipped = loadOverride('emma') as any;
if (!shipped) {
  throw new Error('emma has no override on disk — fixture is stale');
}
const allBlocks = [...(shipped.burst ?? [])];

describe('emma — fixture sanity (non-vacuity)', () => {
  it('the comp actually bursts: emma casts her Burst I and Full Bursts occur', () => {
    // Non-vacuity gate for every burst-keyed assertion below: a comp that never completes a
    // chain makes zero Full Bursts and would let the burst groups pass silently on empty sets.
    expect(emmaBursts(base.events)).toBeGreaterThan(0);
    expect(fullBurstStarts(base.events)).toBeGreaterThan(0);
  });

  it('burstCast and fullBurstEnter genuinely diverge here — the E2 discrimination premise', () => {
    // Two B1s + a 40s-CD B3: emma's cast count and the Full Burst count DISAGREE in both
    // directions — some FB windows are liter-led (emma never cast) and most emma casts stall
    // before the chain completes (asuka's B3 CD paces completion). Calibrated anatomy, 180s:
    // emma 5 casts (1 FB-led, 4 stalled) vs 4 Full Bursts (1 emma-led, 3 liter-led). If the
    // two counts ever matched, burstCast-vs-fullBurstEnter would be untestable here.
    expect(fullBurstStarts(base.events)).not.toBe(emmaBursts(base.events));
    expect(emmaBursts(base.events)).toBeGreaterThan(0);
    expect(fullBurstStarts(base.events)).toBeGreaterThan(0);
  });

  it('emma deals weapon damage (MG output) — inertness asserts are not vacuous zeros', () => {
    expect(unitOf(base.res, 'emma').totalDamage).toBeGreaterThan(0);
  });
});

describe('E1 — clean-weapon: her kit contributes nothing to her own damage', () => {
  it('own total is byte-identical with her kit zeroed, in the same comp', () => {
    // The MG clean-weapon basis cell (bursts-on, in-team half; CW1 pins the bursts-off solo
    // half): with emma's kit swapped for the empty kit, her own total must not move a point.
    expect(unitOf(base.res, 'emma').totalDamage).toBe(
      unitOf(bareInTeam.res, 'emma').totalDamage
    );
  });

  it('DISCRIMINATING: re-encoding the heals as a damage buff MOVES the team', () => {
    // Proves the E1 inertness claim is live, not a vacuous "nothing happens": a heal→
    // attackDamagePct swap is the nearest wrong "make the burst do something" model, and it
    // must change totals — i.e. the shipped inertness is one that model provably fails.
    expect(totals(healAsDamage.res)).not.toEqual(totals(base.res));
  });
});

describe('E2 — burst instant heal is keyed to her OWN burst cast (burstCast, not fullBurstEnter)', () => {
  it('isolating the instant line leaves recovery firings == emma\u2019s burstCast count', () => {
    // "Affects all allies. Recover HP equal to 39.6% ... final Max HP" fires on her cast.
    // With the HoT line stripped, the only recovery source is the instant heal — one landing
    // per ally per emma cast. (fullBurstEnter keying would fire one volley per FB window,
    // including the windows liter opens alone — pinned next.)
    expect(recoveryFirings(instantOnly.events)).toBe(
      emmaBursts(instantOnly.events)
    );
    expect(emmaBursts(instantOnly.events)).toBeGreaterThan(0);
  });

  it('DISCRIMINATING: fullBurstEnter keying heals a DIFFERENT volley set', () => {
    // The nearest wrong keying fires one volley (instant + 5 HoT ticks = 6 landings) per FULL
    // BURST window — 3 of the 4 are liter-led rotations emma never cast in — and DROPS her 4
    // stalled-chain casts (no Full Burst ever followed them). Her burst skill heals when SHE
    // casts, chain completion irrelevant: the shipped encoding must produce a strictly
    // different firing count than the window-keyed one.
    expect(recoveryFirings(fullBurstEnter.events)).toBe(
      6 * fullBurstStarts(fullBurstEnter.events)
    );
    expect(recoveryFirings(fullBurstEnter.events)).not.toBe(
      recoveryFirings(base.events)
    );
  });
});

describe('E3 — burst lifesteal line "over 5 sec" is a 5-tick recovery cadence', () => {
  it('both lines together land 6 recoveries per ally per emma cast', () => {
    // Instant heal (1) + lifesteal HoT (5 ticks over 5s) = 6 recovery landings per cast,
    // read through asuka's consumer. Exact multiple: no cast's HoT is truncated by the 180s
    // end in this fixture (calibrated; see the per-cast derivation).
    expect(recoveryFirings(base.events)).toBe(6 * emmaBursts(base.events));
  });

  it('DISCRIMINATING: a ticks:1 counterfactual collapses the cadence to 2 per cast', () => {
    // The nearest wrong reading of "over 5 sec" is one instant tick. It must produce exactly
    // one landing per line per cast (2), strictly fewer than the shipped 6 — proving the
    // 5-tick cadence is the one that fits the prose.
    expect(recoveryFirings(ticks1.events)).toBe(2 * emmaBursts(ticks1.events));
    expect(recoveryFirings(ticks1.events)).toBeLessThan(
      recoveryFirings(base.events)
    );
  });
});

describe('E4 — the two unmodelable lines are documented, not dropped or fabricated', () => {
  it('emma originates ZERO buffs — her only in-domain payload is recovery events', () => {
    // Her kit text has no ▲ damage stat for allies: S1/S2 are sustain lines without engine
    // primitives and the burst is pure recovery. Any buff carrying her slot index is an
    // invented offensive contribution.
    expect(
      buffs(base.events).filter((b) => b.casterIdx === EMMA)
    ).toHaveLength(0);
  });

  it('her kit magnitudes never appear as any buff value', () => {
    // 10.77 (S1 heal), 13.33 (incoming healing), 39.6 (burst) are recovery amounts or
    // unmodelable multipliers — none may surface as a buff stat value anywhere in the log.
    for (const v of [10.77, 13.33, 39.6]) {
      expect(buffs(base.events).some((b) => b.value === v)).toBe(false);
    }
  });

  it('both gap lines live verbatim in `unmodeled` (never an `ignored` drop)', () => {
    expect(shipped.unmodeled?.skill1?.length).toBeGreaterThan(0);
    expect(shipped.unmodeled?.skill2?.length).toBeGreaterThan(0);
    expect(shipped.unmodeled.skill1.join(' ')).toContain('10.77');
    expect(shipped.unmodeled.skill1.join(' ')).toContain('5%');
    expect(shipped.unmodeled.skill2.join(' ')).toContain('13.33');
    expect(shipped.unmodeled.skill2.join(' ')).toContain('90%');
    expect((shipped as any).ignored).toBeUndefined();
  });
});

describe('structural pins (S2b-pre-registered traps, adopted at S2c)', () => {
  it('every burst block is keyed to burstCast, never fullBurstEnter', () => {
    // Load-bearing for a Burst-I unit beside another B1: fullBurstEnter over-fires on the
    // windows the other B1 opens. Asserted statically so it holds regardless of fixture.
    for (const b of allBlocks) {
      expect(b.trigger?.kind).toBe('burstCast');
    }
  });

  it('heal is the ONLY effect kind in the kit — no buff, no damage, no shield', () => {
    // A shield would emit shielded events and falsely satisfy teammates' requiresShielded
    // gates (asuka's S2); a buff/damage effect would move damage. Both are forbidden for a
    // clean-weapon healer whose entire payload is recovery events.
    const kinds = allBlocks.flatMap((b: any) => b.effects.map((e: any) => e.kind));
    expect(kinds.length).toBeGreaterThan(0);
    expect([...new Set(kinds)]).toEqual(['heal']);
  });

  it('every burst block targets all allies', () => {
    for (const b of allBlocks) {
      expect(b.target?.kind).toBe('allies');
    }
  });
});
