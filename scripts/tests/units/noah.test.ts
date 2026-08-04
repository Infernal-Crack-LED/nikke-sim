// PER-UNIT KIT SPEC — `noah` (Noah, RL/Wind/Defender/Burst II, Pilgrim, cd 40s, ammo 6,
// reloadFrames 171, chargeFrames 60, hitsPerShot 2, burstGaugePerShot 1.5 (column dropped —
// gauge from data/gauge-per-shot.json RL modal)). Kit-autonomy gauntlet 2026-08-03.
//
// Noah is a PURE TANK kit — taunt / damage-taken / invulnerability / DEF, and NOTHING else:
// zero damage lines and zero weapon-state modifiers in the whole kit. The sim models no HP
// pool, no incoming damage and no enemy targeting, so seven of her eight kit lines are
// out-of-domain (UNMODELED, verbatim); her single in-domain line is the burst all-ally
// DEF ▲ 133.48% for 10 sec, encoded as the inert `defPct` buff (marciana convention —
// marciana's burst DEF line is the same construction; noah's is the LITERAL form, a plain
// self-DEF percentage, so no caster-scaling approximation caveat applies). Unlike marciana's
// fixture (sole B2 → burstCast vs fullBurstEnter only structurally pinnable), this fixture
// fields a COMPETING B2 (naga), so the own-cast pin is discriminated BEHAVIORALLY.
//
// Kit (data/characters.json → characters.noah.skills, SL10):
//   S1 ■ 10% chance when attacked → all allies:
//        Damage Taken ▼ 8% for 10 sec                                                   [U1 gap]
//   S2 ■ Full Charge attack hits the target → the target:
//        Taunt for 2 sec                                                                [U2 gap]
//        ATK ▼ 13.25% for 5 sec                                                         [U2 gap]
//   BU ■ self:
//        Attract: Taunt all enemies for 10 sec                                          [U3 gap]
//      ■ all allies:
//        Invulnerable for 3 sec                                                         [U4 gap]
//        DEF ▲ 133.48% for 10 sec                                                       [D1]
//
// One assertion group per kit line (N1..N4 + structural pins), asserted against the SHIPPED
// override loaded from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS
// (the nearest-wrong model each assertion must discriminate against) — never to supply the
// encoding under test.
//
// WHY THESE ASSERTIONS DISCRIMINATE (noah's one modeled line is offensively inert, so TOTALS
// alone cannot discriminate; the load-bearing evidence is the EVENT LOG — the defPct buffApply
// channel — plus the two neutrality proofs that the rest of the kit moves nothing):
//   N1  damage neutrality: her own total (and the WHOLE team's) is byte-identical with her kit
//       zeroed, in the same comp AND solo on the bare-weapon basis — while a defPct→
//       attackDamagePct counterfactual MOVES the team, so the inertness is live, not a vacuous
//       "nothing happens".
//   N2  the burst DEF channel is kit-complete: one defPct-133.48 buffApply landing per own cast
//       per ALLY (noahBursts × 5), all five slots per cast frame, 600-frame/10s expiry — yet
//       damage-INERT (stripping the line leaves every unit byte-identical).
//   N3  own-cast keying (burstCast, not fullBurstEnter) — the #1 trap for a Burst-II unit —
//       discriminated BEHAVIORALLY: naga (CD-20 B2) opens chains noah does not cast, so
//       fullBursts > noahBursts; a fullBurstEnter encoding fires defPct on every Full Burst and
//       over-fires the channel by exactly those chains. Nearest-wrong also includes target
//       self (1 landing per cast instead of 5).
//   N4  the seven out-of-domain lines live VERBATIM in `unmodeled` (never an `ignored` drop)
//       and are never fabricated: the ONLY buff stat noah originates is defPct — no shield
//       encoding of Invulnerable (that would open shieldedUntilFrame windows and falsely
//       satisfy teammates' requiresShielded gates), no targetStatus for the taunts, no boss
//       debuff for the Damage-Taken / ATK ▼ lines; their magnitudes (8 / 13.25) never surface
//       as buff values from her.
//
// FIXTURE. Slot order: tia 0 / noah 1 / naga 2 / asuka 3 / 2b 4. Boss Fire. 180s,
// deterministic (no seed). tia (B1, 40s CD, self-burstCdr → opens every chain) / noah (B2,
// 40s — the unit under test) / naga (B2, 20s — the COMPETING B2: her chains complete Full
// Bursts noah did not cast, which is what makes N3 behavioral) / asuka (B3, 40s) / 2b (B3,
// 40s — the second B3 so the same-CD pair alternates and every chain completes). NO isolation
// patches are needed: every assertion is either noah-scoped (casterIdx filter) or a totals
// equality across runs in which ONLY noah's override varies — and defPct is provably unread
// by the engine (no consumer exists in v1), so teammates' kits cannot confound either claim.
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
const SLUGS = ['tia', 'noah', 'naga', 'asuka', '2b'];
/** Slot order: tia 0 / noah 1 / naga 2 / asuka 3 / 2b 4. */
const NOAH = 1;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: SLUGS,
    bossElement: 'Fire',
    focusSlug: 'noah',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { res, events };
}

// ---- counterfactual patches (nearest-wrong models) -------------------------------------------
/** N2 inertness baseline: the burst DEF line stripped entirely. */
const noahNoDef = withPatchedOverride('noah', (ov) => {
  if (!ov.burst?.length) {
    throw new Error('noah burst missing — fixture is stale');
  }
  ov.burst = [];
});
/** N1 counterfactual: the inert defPct re-encoded as a damage stat (must MOVE totals). */
const noahDefAsDamage = withPatchedOverride('noah', (ov) => {
  const e = ov.burst
    ?.flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'defPct');
  if (!e) {
    throw new Error('noah burst defPct effect missing — fixture is stale');
  }
  e.stat = 'attackDamagePct';
});
/** N3 counterfactual: the burst block keyed to fullBurstEnter (the Burst-II trap — fires on
 *  every Full Burst regardless of who cast stage 2; naga's chains must over-fire it). */
const noahFbEnter = withPatchedOverride('noah', (ov) => {
  const b = (ov.burst ?? []).find((x: any) =>
    x.effects.some((e: any) => e.stat === 'defPct')
  );
  if (!b) {
    throw new Error('noah burst defPct block missing — fixture is stale');
  }
  b.trigger = { kind: 'fullBurstEnter' };
});
/** N3 counterfactual: the all-ally grant narrowed to SELF (1 landing per cast instead of 5). */
const noahSelfOnly = withPatchedOverride('noah', (ov) => {
  const b = (ov.burst ?? []).find((x: any) =>
    x.effects.some((e: any) => e.stat === 'defPct')
  );
  if (!b) {
    throw new Error('noah burst defPct block missing — fixture is stale');
  }
  b.target = { kind: 'self' };
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noDef = run({ noah: noahNoDef });
const defAsDamage = run({ noah: noahDefAsDamage });
const fbEnter = run({ noah: noahFbEnter });
const selfOnly = run({ noah: noahSelfOnly });
const bareInTeam = run({ noah: bareWeaponOverride('noah') });

// The committed override, for the static (structural / unmodeled) pins.
const shipped = loadOverride('noah') as any;
if (!shipped) {
  throw new Error('noah has no override on disk — fixture is stale');
}
const allBlocks = [
  ...(shipped.skill1 ?? []),
  ...(shipped.skill2 ?? []),
  ...(shipped.burst ?? []),
];

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const noahBuffs = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.casterIdx === NOAH);
/** The D1 channel: noah's defPct 133.48 landings (one per own cast per ally). */
const defLandings = (evs: SimEvent[]) =>
  noahBuffs(evs).filter((b) => b.stat === 'defPct' && b.value === 133.48);
const noahBursts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'burstCast' && e.slug === 'noah').length;
const nagaBursts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'burstCast' && e.slug === 'naga').length;
const fullBursts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart').length;

describe('noah — fixture sanity (non-vacuity)', () => {
  it('the comp actually bursts: both B2s cast, and every chain completes', () => {
    // Non-vacuity gate for every channel below. The dual same-CD B3 pair (asuka/2b) alternates
    // the stage-3 slot, so fullBursts tracks the chain count, and the B2 competition (naga
    // CD 20 vs noah CD 40) splits the chains between them.
    expect(noahBursts(base.events)).toBeGreaterThan(0);
    expect(nagaBursts(base.events)).toBeGreaterThan(0);
    expect(fullBursts(base.events)).toBe(
      noahBursts(base.events) + nagaBursts(base.events)
    );
  });

  it('DIV non-vacuity: at least one Full Burst opens on a chain noah did NOT cast', () => {
    // The burstCast-vs-fullBurstEnter discrimination below needs fullBursts to strictly exceed
    // noah's own casts — naga's chains must complete.
    expect(fullBursts(base.events)).toBeGreaterThan(noahBursts(base.events));
  });

  it('noah charges her RL and deals weapon damage', () => {
    // Her own total > 0 guards the inertness assertions (else "unchanged" would be trivially
    // true on a zero). RL: 6-round charge magazine, hitsPerShot 2 (impact + splash).
    expect(unitOf(base.res, 'noah').totalDamage).toBeGreaterThan(0);
  });
});

describe('N1 — damage neutrality: her kit contributes nothing to any unit\u2019s damage', () => {
  it('own total is byte-identical with her kit zeroed, in the same comp', () => {
    // Zero damage lines and zero weapon-state modifiers in the whole kit: with noah's kit
    // swapped for the empty kit, her own total must not move a point (the in-team bare run
    // keeps tia/naga/asuka/2b identical, so this isolates noah's own contribution).
    expect(unitOf(base.res, 'noah').totalDamage).toBe(
      unitOf(bareInTeam.res, 'noah').totalDamage
    );
  });

  it('the WHOLE TEAM is byte-identical with her kit zeroed (defPct has no consumer in v1)', () => {
    // Stronger than the own-total claim: her only modeled effect is defPct, which the engine
    // reads nowhere (no incoming damage, no DEF-scaling stat), so not even her tandem surface
    // can move a teammate. The faithful claim for this kit is total damage-neutrality.
    expect(totals(bareInTeam.res)).toEqual(totals(base.res));
  });

  it('own total is byte-identical on the solo bare-weapon basis (file-level neutrality)', () => {
    // noah is NOT one of the six clean-weapon basis cells (harness CLEAN_WEAPON_SLUGS), so this
    // is a per-unit mirror of that pin rather than a CW1 membership claim: the committed
    // override sims byte-identical to the empty kit solo on the neutral-Iron basis.
    const bare = unitOf(runComp(bareWeaponComp(['noah'])), 'noah').totalDamage;
    const withKit = unitOf(
      runComp(bareWeaponComp(['noah'], { overrides: { noah: shipped } })),
      'noah'
    ).totalDamage;
    expect(withKit).toBe(bare);
  });

  it('DISCRIMINATING: re-encoding the inert defPct as a damage stat MOVES the team', () => {
    // Proves the neutrality above is live, not a vacuous "nothing happens": a defPct→
    // attackDamagePct swap is the nearest wrong "make the burst do something" model, and it
    // must change totals — i.e. the shipped inertness is one that model provably fails.
    expect(totals(defAsDamage.res)).not.toEqual(totals(base.res));
  });
});

describe('N2 — D1 burst DEF \u25b2 133.48% for 10s, all allies: kit-complete yet damage-inert', () => {
  it('lands once per own cast per ALLY (noahBursts \u00d7 5), all five slots per cast frame', () => {
    const defBuffs = defLandings(base.events);
    expect(defBuffs.length).toBe(noahBursts(base.events) * SLUGS.length);
    const perFrame = new Map<number, Set<number | null>>();
    for (const b of defBuffs) {
      (
        perFrame.get(b.frame) ?? perFrame.set(b.frame, new Set()).get(b.frame)!
      ).add(b.targetIdx);
    }
    expect(perFrame.size).toBe(noahBursts(base.events));
    for (const [frame, holders] of perFrame) {
      expect(
        holders.size,
        `frame ${frame} reached ${holders.size} allies`
      ).toBe(SLUGS.length);
    }
  });

  it('is time-bounded at 10 sec (600 frames), not permanent or round-counted', () => {
    const defBuffs = defLandings(base.events);
    expect(defBuffs.length).toBeGreaterThan(0);
    for (const b of defBuffs) {
      expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      expect(b.durationShots).toBeNull();
    }
  });

  it('is damage-INERT: stripping the burst line leaves every unit byte-identical', () => {
    // defPct is inert in v1 (self DEF never enters damage dealt; there is no incoming damage).
    expect(totals(noDef.res)).toEqual(totals(base.res));
  });
});

describe('N3 — own-cast keying: burstCast, not fullBurstEnter (the Burst-II trap)', () => {
  it('fires on noah\u2019s OWN casts only (landings track noahBursts, not fullBursts)', () => {
    expect(defLandings(base.events)).toHaveLength(
      noahBursts(base.events) * SLUGS.length
    );
  });

  it('DISCRIMINATING: a fullBurstEnter encoding over-fires by exactly naga\u2019s chains', () => {
    // naga opens chains noah did not cast (fixture sanity above proves at least one), so the
    // trap encoding grants defPct on EVERY Full Burst: landings jump to fullBursts × 5.
    expect(defLandings(fbEnter.events)).toHaveLength(
      fullBursts(fbEnter.events) * SLUGS.length
    );
    expect(defLandings(fbEnter.events).length).toBeGreaterThan(
      defLandings(base.events).length
    );
  });

  it('DISCRIMINATING: a self-only target narrows the channel to 1 landing per cast', () => {
    expect(defLandings(selfOnly.events)).toHaveLength(
      noahBursts(selfOnly.events)
    );
  });
});

describe('N4 — the seven out-of-domain lines are documented, not dropped or fabricated', () => {
  it('S1 lives VERBATIM in `unmodeled` (10% attacked clause + Damage Taken \u25bc 8%)', () => {
    const s1 = shipped.unmodeled?.skill1?.join(' ') ?? '';
    expect(s1).toContain('10% chance of activating when attacked');
    expect(s1).toContain('Damage Taken ▼ 8% for 10 sec');
  });

  it('S2 lives VERBATIM in `unmodeled` (Taunt 2s + ATK \u25bc 13.25% for 5s)', () => {
    const s2 = shipped.unmodeled?.skill2?.join(' ') ?? '';
    expect(s2).toContain('Taunt for 2 sec');
    expect(s2).toContain('ATK ▼ 13.25% for 5 sec');
  });

  it('the burst Attract + Invulnerable lines live VERBATIM in `unmodeled`', () => {
    const bu = shipped.unmodeled?.burst?.join(' ') ?? '';
    expect(bu).toContain('Attract: Taunt all enemies for 10 sec');
    expect(bu).toContain('Invulnerable for 3 sec');
  });

  it('never an `ignored` drop, and nothing fabricated in place of the gaps', () => {
    expect((shipped as any).ignored).toBeUndefined();
    // The ONLY buff stat noah originates is defPct: no shield encoding of Invulnerable (that
    // would open shieldedUntilFrame windows and falsely satisfy requiresShielded gates), no
    // targetStatus for the taunts, no boss debuff for Damage Taken ▼ / ATK ▼.
    expect([...new Set(noahBuffs(base.events).map((b) => b.stat))]).toEqual([
      'defPct',
    ]);
  });

  it('the gap magnitudes never surface as buff values from noah', () => {
    expect(noahBuffs(base.events).some((b) => b.value === 8)).toBe(false);
    expect(noahBuffs(base.events).some((b) => b.value === 13.25)).toBe(false);
  });

  it('133.48 never surfaces as an atkPct buff from ANY caster (S2b stat-confusion head)', () => {
    // The nearest-wrong twin of the defPct line is emitting it as atkPct — a catastrophic
    // +133% team-ATK over-credit. 133.48 is distinctive enough to pin globally.
    expect(
      buffs(base.events).some((b) => b.stat === 'atkPct' && b.value === 133.48)
    ).toBe(false);
  });
});

describe('structural pins (kit-shape invariants)', () => {
  it('exactly ONE block in the whole override — the burst DEF grant', () => {
    expect(allBlocks.length).toBe(1);
    expect(allBlocks[0].slot).toBe('burst');
    expect(allBlocks[0].effects.length).toBe(1);
    expect(allBlocks[0].trigger).toEqual({ kind: 'burstCast' });
    expect(allBlocks[0].target).toEqual({ kind: 'allies' });
    expect(allBlocks[0].effects[0]).toEqual({
      kind: 'buff',
      stat: 'defPct',
      value: 133.48,
      durationSec: 10,
    });
  });

  it('skill1 and skill2 are empty (every line in them is out-of-domain in v1)', () => {
    expect(shipped.skill1 ?? []).toEqual([]);
    expect(shipped.skill2 ?? []).toEqual([]);
  });

  it('no damage or weapon-state effect kind exists anywhere in the override', () => {
    for (const b of allBlocks) {
      for (const e of b.effects) {
        expect(e.kind).toBe('buff');
        expect(e.stat).toBe('defPct');
      }
    }
  });
});
