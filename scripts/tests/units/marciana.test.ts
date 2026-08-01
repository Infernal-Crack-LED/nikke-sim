// PER-UNIT KIT SPEC — `marciana` (Marciana, SG/Iron/Supporter/Burst II, Elysion, ammo 9,
// hitsPerShot 10, reloadFrames 111). Kit-autonomy gauntlet 2026-08-01 (BASE unit — NOT
// marciana-marine-study, the AR/Iron Attacker variant). Cross-family corroborated GO,
// faithfulness 1.0 (S2b claude-fable-5 / S5+S6 claude-opus-5 / S7 kimi-code/k3 binding judge).
//
// Marciana is a PURE HEALER and the SG clean-weapon basis cell (scripts/tests/lib/harness.ts
// CLEAN_WEAPON_TEAMS.a): her kit contributes NOTHING to her own damage. Every line is either a
// RECOVERY EVENT (the engine models a heal as an event that fires teammates' on-recovery
// consumers, NOT a number — there is no HP pool / survivability sim) or an inert `defPct` buff.
// Her personal damage is weapon-only; her board value is tandem (she refreshes recovery-consumer
// teammates such as Asuka/Crown to near-permanent team Attack Damage).
//
// Kit (data/characters.json → characters.marciana.skills, SL10):
//   S1 ■ last bullet hits → all allies: Recovers 10.95% of attack damage as HP OVER 3 SEC   [M2]
//      ■ last bullet hits → 2 allies highest final ATK: Incoming healing ▲26.98% for 3 sec  [M5 gap]
//   S2 ■ using Burst Skill → all allies: Recovers 28.11% of the skill user's final Max HP   [M3]
//   BU ■ all allies: Storage — store excess healing, ≤27.87% Max HP, 10 sec                 [M5 gap]
//      ■ all allies: DEF ▲20.9% of the skill user's DEF for 10 sec                          [M4]
//
// One assertion group per kit line (M1..M5), asserted against the SHIPPED override loaded from
// disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model each
// assertion must discriminate against) and to ISOLATE a line whose effect is otherwise masked by
// another of her own lines — never to supply the encoding under test.
//
// WHY THESE ASSERTIONS DISCRIMINATE (a test that cannot fail under the nearest wrong model gates
// nothing — and almost all of marciana's lines are offensively inert, so TOTALS alone cannot
// discriminate; the load-bearing evidence is the EVENT LOG, read through a recovery CONSUMER):
//   M1  clean-weapon: her own total is byte-identical with her kit zeroed (in the SAME comp), and
//       a defPct→attackDamagePct counterfactual MOVES the team — so the inertness is live, not a
//       vacuous "nothing happens".
//   M2  the S1 heal is a 3-tick HoT ("over 3 sec"): asuka's recovery consumer fires ≥3× per last
//       bullet; a ticks:1 counterfactual collapses the firings to lastBullets+bursts.
//   M3  the S2 heal is keyed to her OWN burst cast (burstCast), not fullBurstEnter — the #1 trap
//       for a Burst-II unit. Isolating S2 (S1 stripped) leaves recovery firings == her burstCast
//       count (1 per own cast). The burstCast-not-fullBurstEnter pin is also asserted structurally.
//   M4  the burst DEF line is kit-complete (24 applications = 8 bursts × 3 allies, 600-frame/10s
//       expiry) yet damage-INERT (byte-identical totals with the line stripped).
//   M5  the two unmodelable lines (incoming-healing 26.98, Storage 27.87) are documented verbatim
//       in `unmodeled`, never an `ignored` drop; neither value appears as any buff; the only buff
//       stat marciana originates is defPct; and Storage is NOT encoded as a `shield` effect (that
//       would emit shielded events and falsely satisfy teammates' requiresShielded gates).
//
// FIXTURE. liter (B1) / marciana (B2, the SOLE Burst II) / asuka (B3 recovery consumer), boss
// Fire, focus asuka. asuka's own burst lifesteal is patched OUT so marciana is the SOLE recovery
// source — every landing of marciana's heal on asuka fires asuka's S1 ("when recovery takes
// effect" → self atkPct 96.98), so counting asuka's self atkPct-96.98 buffApply events counts
// marciana's recovery landings on her. liter emits no recovery (her S2 is a cover-HP NO-OP).
// Deterministic (no seed). Slot order: liter 0 / marciana 1 / asuka 2.
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

const FPS = 60;
const SLUGS = ['liter', 'marciana', 'asuka'];
/** Slot order: liter 0 / marciana 1 / asuka 2. */
const MARCIANA = 1;
const ASUKA = 2;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;

/** asuka's burst lifesteal removed → marciana is the only recovery source in the fight. */
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
/** M2 counterfactual: the S1 HoT collapsed to a single instant tick (nearest wrong "over 3 sec"). */
const marcianaTicks1 = withPatchedOverride('marciana', (ov) => {
  for (const b of ov.skill1 ?? []) {
    for (const e of b.effects) {
      if (e.kind === 'heal') {
        e.ticks = 1;
      }
    }
  }
});
/** M3 isolation: S1 stripped entirely, leaving S2 (burstCast heal) as the only recovery source. */
const marcianaNoS1 = withPatchedOverride('marciana', (ov) => {
  if (!ov.skill1?.length) {
    throw new Error('marciana skill1 missing — fixture is stale');
  }
  ov.skill1 = [];
});
/** M4 reference: the burst DEF line stripped (inertness baseline). */
const marcianaNoDef = withPatchedOverride('marciana', (ov) => {
  if (!ov.burst?.length) {
    throw new Error('marciana burst missing — fixture is stale');
  }
  ov.burst = [];
});
/** M1 counterfactual: the inert defPct re-encoded as a damage stat (must MOVE totals). */
const marcianaDefAsDamage = withPatchedOverride('marciana', (ov) => {
  const e = ov.burst
    ?.flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'defPct');
  if (!e) {
    throw new Error('marciana burst defPct effect missing — fixture is stale');
  }
  e.stat = 'attackDamagePct';
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const ticks1 = run({ marciana: marcianaTicks1 });
const noS1 = run({ marciana: marcianaNoS1 });
const noDef = run({ marciana: marcianaNoDef });
const defAsDamage = run({ marciana: marcianaDefAsDamage });
const bareInTeam = run({ marciana: bareWeaponOverride('marciana') });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
/** asuka's recovery consumer firings = her self atkPct-96.98 buff (one per recovery landing). */
const recoveryFirings = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) => b.casterIdx === ASUKA && b.stat === 'atkPct' && b.value === 96.98
  ).length;
const marcianaBuffs = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.casterIdx === MARCIANA);
const lastBullets = (evs: SimEvent[]) =>
  evs.filter(
    (e) => e.kind === 'shot' && e.slug === 'marciana' && e.ammoAfter === 0
  ).length;
const marcianaBursts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'burstCast' && e.slug === 'marciana').length;

// The committed override, for the static (structural / unmodeled) pins.
const shipped = loadOverride('marciana') as any;
if (!shipped) {
  throw new Error('marciana has no override on disk — fixture is stale');
}
const allBlocks = [
  ...(shipped.skill1 ?? []),
  ...(shipped.skill2 ?? []),
  ...(shipped.burst ?? []),
];

describe('marciana — fixture sanity (non-vacuity)', () => {
  it('the comp actually bursts: marciana casts her Burst II and Full Bursts occur', () => {
    // Non-vacuity gate for every burst-keyed assertion below: a comp that never completes a chain
    // makes zero Full Bursts and would let the S2 / burst groups pass silently on empty sets.
    expect(marcianaBursts(base.events)).toBeGreaterThan(0);
    expect(
      base.events.filter((e) => e.kind === 'fullBurstStart').length
    ).toBeGreaterThan(0);
  });

  it('marciana reloads repeatedly (last bullet fires often) and deals weapon damage', () => {
    // 9-round SG magazine over 180s ⇒ many magazines; if this were ≤1 the M2 HoT discrimination
    // would be untestable. Her own total > 0 guards the inertness assertions (else "unchanged"
    // would be trivially true on a zero).
    expect(lastBullets(base.events)).toBeGreaterThan(1);
    expect(unitOf(base.res, 'marciana').totalDamage).toBeGreaterThan(0);
  });
});

describe('M1 — clean-weapon: her kit contributes nothing to her own damage', () => {
  it('own total is byte-identical with her kit zeroed, in the same comp', () => {
    // The SG clean-weapon basis cell: with marciana's kit swapped for the empty kit, her own total
    // must not move a point (the in-team bare run keeps liter/asuka identical, so this isolates
    // marciana's own contribution rather than comparing solo vs team).
    expect(unitOf(base.res, 'marciana').totalDamage).toBe(
      unitOf(bareInTeam.res, 'marciana').totalDamage
    );
  });

  it('DISCRIMINATING: re-encoding the inert defPct as a damage stat MOVES the team', () => {
    // Proves the M4 inertness claim is live, not a vacuous "nothing happens": a defPct→
    // attackDamagePct swap is the nearest wrong "make the burst do something" model, and it must
    // change totals — i.e. the shipped inertness is one that model provably fails.
    expect(totals(defAsDamage.res)).not.toEqual(totals(base.res));
  });
});

describe('M2 — S1 last-bullet heal is a 3-tick HoT ("over 3 sec"), all allies', () => {
  it('drives the recovery consumer ≥3× per last bullet (3 ticks across the window)', () => {
    // "over 3 sec" = heal-over-time → 3 recovery events per last bullet, keeping on-recovery
    // consumers refreshed. A single instant heal produces only lastBullets+bursts firings.
    expect(recoveryFirings(base.events)).toBeGreaterThanOrEqual(
      3 * lastBullets(base.events)
    );
  });

  it('DISCRIMINATING: a ticks:1 counterfactual collapses the firings to lastBullets+bursts', () => {
    // The nearest wrong reading of "over 3 sec" is one instant tick. It must produce strictly
    // fewer firings — exactly one per last bullet plus one per burst — proving the shipped 3-tick
    // encoding is the one that fits the prose cadence.
    const collapsed = recoveryFirings(ticks1.events);
    expect(collapsed).toBeLessThan(recoveryFirings(base.events));
    expect(collapsed).toBe(
      lastBullets(base.events) + marcianaBursts(base.events)
    );
  });

  it('stripping S1 leaves marciana\u2019s OWN total unchanged (tandem-only channel)', () => {
    // Her heal has no HP amount in v1 and no self-buff; it can only matter via a teammate's
    // on-recovery consumer. Removing it cannot move her own weapon output.
    expect(totals(noS1.res).marciana).toBe(totals(base.res).marciana);
  });
});

describe('M3 — S2 burst heal is keyed to her OWN burst cast (burstCast, not fullBurstEnter)', () => {
  it('isolating S2 (S1 stripped) leaves recovery firings == marciana\u2019s burstCast count', () => {
    // "Activates when using Burst Skill" is own-cast keyed. With S1 gone, the only recovery source
    // is S2's one heal per marciana burst, so the consumer fires exactly once per marciana cast.
    // (Keying to fullBurstEnter would over-fire on Full Bursts another Burst II took — the #1 trap
    // for this Burst-II unit; the structural pin below also asserts burstCast on every S2 block.)
    expect(recoveryFirings(noS1.events)).toBe(marcianaBursts(noS1.events));
    expect(marcianaBursts(noS1.events)).toBeGreaterThan(0);
  });
});

describe('M4 — burst DEF ▲20.9% for 10s: kit-complete yet damage-inert', () => {
  const defBuffs = marcianaBuffs(base.events).filter(
    (b) => b.stat === 'defPct' && b.value === 20.9
  );

  it('applies once per burst to all three allies (8 bursts × 3 allies = 24)', () => {
    expect(defBuffs.length).toBe(marcianaBursts(base.events) * SLUGS.length);
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

  it('is time-bounded at 10 sec (600 frames), not permanent or round-counted', () => {
    expect(defBuffs.length).toBeGreaterThan(0);
    for (const b of defBuffs) {
      expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      expect(b.durationShots).toBeNull();
    }
  });

  it('is damage-INERT: stripping the burst line leaves every unit byte-identical', () => {
    // defPct is inert in v1 (self DEF never enters damage dealt; there is no incoming damage). The
    // faithful claim for this line is precisely that it moves NO unit's total.
    expect(totals(noDef.res)).toEqual(totals(base.res));
  });
});

describe('M5 — the two unmodelable lines are documented, not dropped or fabricated', () => {
  it('the only buff stat marciana originates is defPct (no offensive buff is invented)', () => {
    // Her kit text has exactly one ▲ stat (incoming healing) and one DEF ▲ line; the incoming-
    // healing line is unmodelable (no StatKey), so defPct is the ONLY buff she should ever emit.
    expect([...new Set(marcianaBuffs(base.events).map((b) => b.stat))]).toEqual(
      ['defPct']
    );
  });

  it('26.98 (incoming healing) never appears as any buff value', () => {
    expect(buffs(base.events).some((b) => b.value === 26.98)).toBe(false);
  });

  it('27.87 (Storage) never appears as any buff value', () => {
    expect(buffs(base.events).some((b) => b.value === 27.87)).toBe(false);
  });

  it('both gap lines live verbatim in `unmodeled` (never an `ignored` drop)', () => {
    expect(shipped.unmodeled?.skill1?.length).toBeGreaterThan(0);
    expect(shipped.unmodeled?.burst?.length).toBeGreaterThan(0);
    expect(shipped.unmodeled.skill1.join(' ')).toContain('26.98');
    expect(shipped.unmodeled.burst.join(' ')).toContain('27.87');
    expect((shipped as any).ignored).toBeUndefined();
  });
});

describe('structural pins (S2b-pre-registered traps, adopted at S2c)', () => {
  it('every skill2 and burst block is keyed to burstCast, never fullBurstEnter', () => {
    // The load-bearing trap for a Burst-II unit beside another B2: fullBurstEnter would over-fire
    // on rotations another Burst II took. Asserted statically so it holds regardless of fixture.
    for (const b of [...(shipped.skill2 ?? []), ...(shipped.burst ?? [])]) {
      expect(b.trigger?.kind).toBe('burstCast');
    }
  });

  it('no `shield` effect anywhere — Storage is NOT encoded as a shield', () => {
    // A shield would emit shielded events and falsely satisfy teammates' requiresShielded gates
    // (e.g. asuka's S2). Storage is a distinct, unmodelable mechanic — kept out of the effects.
    const kinds = allBlocks.flatMap((b: any) =>
      b.effects.map((e: any) => e.kind)
    );
    expect(kinds).not.toContain('shield');
  });
});
