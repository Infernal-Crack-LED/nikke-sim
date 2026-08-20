// PER-UNIT KIT SPEC — `anne-miracle-fairy` (Anne: Miracle Fairy, RL/Wind/Supporter, Burst II,
// cd 60s, ammo 6, chargeFrames 60, reloadFrames 141, Missilis). Kit-autonomy gauntlet
// 2026-08-19 — FROM-SCRATCH unit (no prior override; simSupported false until S9).
// Cross-family: S2b claude-fable-5 review; S5/S6 claude-opus-5 blind roles; S7 kimi-code/k3
// binding judge (results: scripts/kit-autonomy/results/anne-miracle-fairy.json).
//
// Anne is a PURE sustain/support kit and a Burst-II class-scoper: every line is either a
// RECOVERY EVENT (the engine models a heal as an event that fires teammates' on-recovery
// consumers, NOT a number — there is no HP pool / survivability sim), one CLASS-SCOPED ATK buff,
// or an unmodelable sustain line. She has NO damage line of her own.
//
// Kit (blablalink prose, data/characters.json → characters['anne-miracle-fairy'].skills, SL10):
//   S1 ■ after 3 normal attacks → all SUPPORTER allies:
//        Restores HP equal to 6.07% of attack damage. Lasts for 5 sec                [A2 — heal window]
//   S2 ■ all allies, activates when above 90% HP:
//        Incoming Healing ▲ 23.46%                                                     [UNMODELED — HP gate + no StatKey]
//      ■ last bullet hits while own HP ≥ 90% → all enemies:
//        Incoming Healing ▼ 78.93% for 10 sec                                          [UNMODELED — HP gate + no enemy-heal model]
//   BU ■ all ATTACKER allies:
//        Restores HP equal to 38.61% of the skill user's final max HP                  [A3 — heal event]
//        ATK ▲ 77.22% for 10 sec                                                       [A4 — the load-bearing line]
//      ■ 1 incapacitated Attacker ally at random:
//        Revives with 99% HP. Activates once per battle.                               [UNMODELED ⚑ meta-defining]
//
// One assertion group per kit line (A0..A6), asserted against the SHIPPED override loaded from
// disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model each
// assertion must discriminate against) and to ISOLATE a line — never to supply the encoding
// under test.
//
// WHY THESE ASSERTIONS DISCRIMINATE (a test that cannot fail under the nearest wrong model gates
// nothing — and almost all of anne's lines are offensively inert, so TOTALS alone cannot
// discriminate; the load-bearing evidence is the EVENT LOG, read through class scoping and the
// recovery CONSUMERS):
//   A1  clean-weapon: her own total is byte-identical with her kit zeroed (in the SAME comp), and
//       removing the burst ATK line MOVES the two Attackers — so the inertness is live, not a
//       vacuous "nothing happens".
//   A2  the S1 heal is SUPPORTER-scoped: it never feeds an Attacker recovery probe (asuka), while
//       an all-allies counterfactual demonstrably does — the class exclusion is real, not a drop.
//       No Supporter on-recovery consumer exists in the roster, so the channel is faithfully
//       encoded but presently inert (biscuit B7 mirror). The every-3-normals trigger and the
//       5-sec window (ticks:5/intervalSec:1 ≈ one event per RL pull inside the window) are
//       pinned structurally (⚑ the per-second tick spacing approximates the kit's per-ATTACK
//       healing at the ~1-shot/sec RL cadence; no consumer exists to observe it behaviourally).
//   A3  the burst heal is an ATTACKER-scoped recovery event keyed to her OWN burst cast: with
//       asuka as the probe, the recovery delta is exactly one landing per anne burstCast.
//   A4  the burst ATK is class-scoped (the two Attackers only, never the two Supporters),
//       burstCast-keyed (the applications land on her CAST frames — fullBurstEnter would shift
//       them to the FB-window start; the #1 trap for a Burst-II unit), 10-sec timed, and LIVE:
//       removing it drops both Attackers' totals and moves nobody else's.
//   A5  the three unmodelable sustain lines (incoming-healing ▲23.46% HP-gate, enemy
//       incoming-healing ▼78.93%, the 99% revive) live verbatim in `unmodeled`, never an
//       `ignored` drop; none of their magnitudes appears as any buff; atkPct is the ONLY buff
//       stat anne originates.
//   A6  the liter-trap guard (biscuit precedent): neither heal feeds a DEFENDER recovery consumer
//       (crown) — anne's heals are class-scoped away from Defenders, so they cannot spuriously
//       inflate the team via crown.
//
// FIXTURES (all deterministic — no seed; event-log over totals). Anne is B2, so she must be the
// SOLE Burst II in every comp that asserts her burst lines (a second B2 contests the single B2
// slot → 0 burst casts → vacuous burst assertions):
//   MAIN  liter(Sup,B1) / anne(Sup,B2) / asuka(Atk,B3) / ada(Atk,B3), boss Fire, focus ada — two
//         Supporters + two Attackers make both class exclusions observable, and asuka doubles as
//         the Attacker recovery probe ("when recovery takes effect" → self ATK ▲96.98%). liter
//         emits no recovery (her S2 is a cover-HP NO-OP). asuka's own burst lifesteal self-feed
//         cancels in every delta assertion.
//   GUARD liter / crown(Def,B2 recovery consumer) / anne / asuka / ada — the Defender-consumer
//         negative. crown out-rotates anne at B2 here, which is fine: the assertion is that anne
//         contributes ZERO to crown's recovery count either way.
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
import type { CompOptions } from '../lib/harness.js';

const FPS = 60;
const SLUG = 'anne-miracle-fairy';

/** MAIN fixture slot order: liter 0 / anne 1 / asuka 2 / ada 3. */
const LITER = 0;
const ANNE = 1;
const ASUKA = 2;
const ADA = 3;
const TEAM_SIZE = 4;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;

const mainComp: CompOptions = {
  slugs: ['liter', SLUG, 'asuka', 'ada'],
  bossElement: 'Fire',
  focusSlug: 'ada',
};

function runMain(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...mainComp,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { res, events, totals: totals(res) };
}

// ---- counterfactual / isolation patches (nearest-wrong models) --------------------------------
const stripHeal = (ov: any, slot: 'skill1' | 'burst') => {
  const before = ov[slot].reduce(
    (n: number, b: any) =>
      n + b.effects.filter((e: any) => e.kind === 'heal').length,
    0
  );
  ov[slot].forEach((b: any) => {
    b.effects = b.effects.filter((e: any) => e.kind !== 'heal');
  });
  if (before === 0) {
    throw new Error(`anne ${slot} heal effect missing — fixture is stale`);
  }
};

/** A2 isolation: S1 removed entirely (burst lines kept). */
const anneNoS1 = withPatchedOverride(SLUG, (ov) => {
  if (!ov.skill1?.length) {
    throw new Error('anne skill1 missing — fixture is stale');
  }
  ov.skill1 = [];
});
/** A2 counterfactual (class-axis): the S1 heal targeting ALL allies, not Supporters only. */
const anneS1Allies = withPatchedOverride(SLUG, (ov) => {
  const b = (ov.skill1 ?? []).find((x: any) =>
    x.effects.some((e: any) => e.kind === 'heal')
  );
  if (!b) {
    throw new Error('anne S1 heal block missing — fixture is stale');
  }
  b.target = { kind: 'allies' };
});
/** A3 isolation: burst heal removed (ATK line kept). */
const anneNoBurstHeal = withPatchedOverride(SLUG, (ov) =>
  stripHeal(ov, 'burst')
);
/** A4 reference: the burst ATK line removed entirely. */
const anneNoAtk = withPatchedOverride(SLUG, (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.stat === 'atkPct')
  );
  if (ov.burst.length === before) {
    throw new Error('anne burst atkPct block missing — fixture is stale');
  }
});
/** A4 counterfactual (class-axis): the burst ATK targeting ALL allies, not Attackers only. */
const anneAlliesAtk = withPatchedOverride(SLUG, (ov) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'atkPct')
  );
  if (!b) {
    throw new Error('anne burst atk block missing — fixture is stale');
  }
  b.target = { kind: 'allies' };
});
/** A4 counterfactual (trigger-axis): burst blocks keyed to fullBurstEnter, not her own cast. */
const anneFBEnter = withPatchedOverride(SLUG, (ov) => {
  if (!ov.burst?.length) {
    throw new Error('anne burst missing — fixture is stale');
  }
  for (const b of ov.burst) {
    b.trigger = { kind: 'fullBurstEnter' };
  }
});
/** A6 guard: BOTH heals removed (S1 + burst). */
const anneNoHeals = withPatchedOverride(SLUG, (ov) => {
  stripHeal(ov, 'skill1');
  stripHeal(ov, 'burst');
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = runMain();
const noS1 = runMain({ [SLUG]: anneNoS1 });
const s1Allies = runMain({ [SLUG]: anneS1Allies });
const noBurstHeal = runMain({ [SLUG]: anneNoBurstHeal });
const noAtk = runMain({ [SLUG]: anneNoAtk });
const alliesAtk = runMain({ [SLUG]: anneAlliesAtk });
const fbEnter = runMain({ [SLUG]: anneFBEnter });
const bareInTeam = runMain({ [SLUG]: bareWeaponOverride(SLUG) });

const GUARD = ['liter', 'crown', SLUG, 'asuka', 'ada']; // crown = slot 1
function runGuard(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  runComp({
    slugs: GUARD,
    bossElement: 'Fire',
    focusSlug: 'ada',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return events;
}
const guardBase = runGuard();
const guardNoHeals = runGuard({ [SLUG]: anneNoHeals });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');

/** anne's own buffApply events for a stat (isolates her lines from liter's/asuka's same-stat buffs). */
const anneBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === ANNE && b.stat === stat);

/** The distinct holder slots a set of buffApply events reached, per firing frame. */
function holdersPerFrame(applied: BuffApply[]): Map<number, Set<number>> {
  const perFrame = new Map<number, Set<number>>();
  for (const b of applied) {
    if (b.targetIdx == null) {
      continue;
    }
    (
      perFrame.get(b.frame) ?? perFrame.set(b.frame, new Set()).get(b.frame)!
    ).add(b.targetIdx);
  }
  return perFrame;
}

/** asuka's 'on-recovery → self ATK ▲96.98%' buff count — the Attacker recovery probe observable. */
const asukaRecovery = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) =>
      b.targetSlug === 'asuka' &&
      b.stat === 'atkPct' &&
      Math.abs(b.value - 96.98) < 0.01
  ).length;

/** crown's 'when recovery takes effect → team ATK ▲20.99%' buff count (crown = caster slot 1 in GUARD). */
const crownRecovery = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === 1 &&
      b.stat === 'attackDamagePct' &&
      Math.abs(b.value - 20.99) < 0.01
  ).length;

const anneBursts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'burstCast' && e.slug === SLUG);
const anneShots = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'shot' && e.slug === SLUG);

// The committed override, for the static (structural / unmodeled) pins.
const shipped = loadOverride(SLUG) as any;
if (!shipped) {
  throw new Error('anne-miracle-fairy has no override on disk — fixture is stale');
}

describe('anne-miracle-fairy — fixture sanity (non-vacuity)', () => {
  it('the comp actually bursts: anne casts her Burst II and Full Bursts occur', () => {
    // Non-vacuity gate for every burst-keyed assertion below: anne is the SOLE B2, so a comp that
    // never completes a chain would make zero Full Bursts and let A3/A4 pass on empty sets.
    expect(anneBursts(base.events).length).toBeGreaterThan(0);
    expect(
      base.events.filter((e) => e.kind === 'fullBurstStart').length
    ).toBeGreaterThan(0);
  });

  it('anne fires enough normals for multiple S1 procs and deals weapon damage', () => {
    // 6-shot RL over 180s ⇒ many pulls; every 3 of them is an S1 proc. If this were <3 the A2
    // scoping discrimination would be untestable.
    expect(anneShots(base.events).length).toBeGreaterThanOrEqual(9);
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
  });
});

describe('A1 — clean-weapon: her kit contributes nothing to her own damage', () => {
  it('own total is byte-identical with her kit zeroed, in the same comp', () => {
    // Anne has no damage line: with her kit swapped for the empty kit, her own total must not move
    // a point (the in-team bare run keeps liter/asuka/ada identical, so this isolates anne's own
    // contribution rather than comparing solo vs team).
    expect(unitOf(base.res, SLUG).totalDamage).toBe(
      unitOf(bareInTeam.res, SLUG).totalDamage
    );
  });

  it('DISCRIMINATING: removing the burst ATK line MOVES both Attackers (the team channel is live)', () => {
    // Proves the A1 inertness is not a vacuous "nothing happens": the burst ATK grant is a real
    // damage channel into the Attacker class, and stripping it must change their totals.
    expect(noAtk.totals.asuka).not.toEqual(base.totals.asuka);
    expect(noAtk.totals.ada).not.toEqual(base.totals.ada);
  });
});

describe('A2 — S1 every-3-normals heal is a SUPPORTER-scoped recovery window', () => {
  it('does NOT feed the Attacker recovery probe (asuka) — it is Supporter-scoped', () => {
    // The biscuit-B7 mirror: removing the S1 heal leaves asuka's recovery count unchanged, so the
    // S1 channel is not an Attacker recovery source. (No Supporter on-recovery consumer exists in
    // the roster, so the positive Supporter channel is faithfully encoded but presently inert.)
    expect(asukaRecovery(noS1.events)).toBe(asukaRecovery(base.events));
  });

  it('DISCRIMINATING (class): an all-allies S1 heal WOULD feed the Attacker probe', () => {
    // The nearest wrong reading — team-wide Fairy Dance — must measurably inflate asuka's recovery
    // count (every proc's window lands on her), i.e. the shipped class exclusion is one that the
    // generic model provably fails.
    expect(asukaRecovery(s1Allies.events)).toBeGreaterThan(
      asukaRecovery(base.events)
    );
  });

  it('stripping S1 leaves every total unchanged (event-only, no consumer to move)', () => {
    expect(noS1.totals).toEqual(base.totals);
  });

  it('structural pin: hitCount 3 → alliesOfClass Supporter → 5-tick/1s window', () => {
    // Behaviourally unobservable today (no Supporter recovery consumer exists), so the encoding's
    // shape is pinned statically: the every-3-normals trigger, the Supporter class scope, and the
    // 5-sec window approximated as one recovery event per second (⚑ the kit heals per ATTACK
    // inside the window; at the ~1-shot/sec RL cadence the two coincide).
    const s1 = shipped.skill1 ?? [];
    expect(s1.length).toBe(1);
    expect(s1[0].trigger).toEqual({ kind: 'hitCount', count: 3 });
    expect(s1[0].target).toEqual({ kind: 'alliesOfClass', cls: 'Supporter' });
    const heal = s1[0].effects.find((e: any) => e.kind === 'heal');
    expect(heal).toBeDefined();
    expect(heal.ticks).toBe(5);
    expect(heal.intervalSec).toBe(1);
  });
});

describe('A3 — burst heal is an ATTACKER-scoped recovery event on her OWN burst cast', () => {
  it('feeds the Attacker probe exactly one recovery landing per anne burstCast', () => {
    // With S1 scoped away from Attackers, the ONLY anne-sourced recovery asuka can receive is the
    // burst heal (one instant event per cast — the kit's burst line carries no "for N sec"
    // clause), so the delta against the heal-removed run is exactly the cast count.
    const delta =
      asukaRecovery(base.events) - asukaRecovery(noBurstHeal.events);
    const casts = anneBursts(base.events).length;
    expect(casts).toBeGreaterThan(0);
    expect(
      delta,
      `${delta} recovery landings vs ${casts} casts — a windowed/mistargeted heal diverges`
    ).toBe(casts);
  });

  it('structural pin: burstCast → alliesOfClass Attacker → single heal event', () => {
    const healBlocks = (shipped.burst ?? []).filter((b: any) =>
      b.effects.some((e: any) => e.kind === 'heal')
    );
    expect(healBlocks.length).toBe(1);
    expect(healBlocks[0].trigger).toEqual({ kind: 'burstCast' });
    expect(healBlocks[0].target).toEqual({
      kind: 'alliesOfClass',
      cls: 'Attacker',
    });
  });
});

describe('A4 — burst ATK ▲77.22% for 10s is Attacker-scoped and own-cast keyed', () => {
  const applied = anneBuffs(base.events, 'atkPct').filter(
    (b) => b.value === 77.22
  );

  it('is 77.22% with a 10-sec timed expiry, fired by her burst casts', () => {
    expect(
      applied.length,
      'no anne burst atkPct buff was applied'
    ).toBeGreaterThan(0);
    // One FIRING per own cast, each reaching both Attackers — so the distinct firing frames are
    // exactly the cast frames (holders-per-frame is asserted below).
    expect([...new Set(applied.map((b) => b.frame))].length).toBe(
      anneBursts(base.events).length
    );
    for (const b of applied) {
      expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      expect(b.durationShots).toBeNull();
    }
  });

  it('reaches ONLY the Attacker allies (asuka + ada), never the Supporters', () => {
    for (const [, holders] of holdersPerFrame(applied)) {
      expect([...holders].sort(), 'a firing reached a non-Attacker').toEqual([
        ASUKA,
        ADA,
      ]);
    }
  });

  it('lands on her CAST frames (burstCast, not fullBurstEnter)', () => {
    // The Burst-II trap: fullBurstEnter would shift the applications to the FB-window start (after
    // the stage-3 cast). Every application frame must be one of anne's burstCast frames.
    const castFrames = new Set(anneBursts(base.events).map((c: any) => c.frame));
    for (const b of applied) {
      expect(
        castFrames.has(b.frame),
        `atkPct application at frame ${b.frame} is not an anne cast frame`
      ).toBe(true);
    }
  });

  it('DISCRIMINATING (class): an all-allies target would reach the whole team', () => {
    const generic = anneBuffs(alliesAtk.events, 'atkPct').filter(
      (b) => b.value === 77.22
    );
    const reached = new Set<number>();
    for (const b of generic) {
      if (b.targetIdx != null) {
        reached.add(b.targetIdx);
      }
    }
    expect(
      reached.size,
      'all-allies counterfactual must reach more than the 2 Attackers'
    ).toBe(TEAM_SIZE);
  });

  it('DISCRIMINATING (trigger): fullBurstEnter applications do NOT land on her cast frames', () => {
    const castFrames = new Set(anneBursts(base.events).map((c: any) => c.frame));
    const generic = anneBuffs(fbEnter.events, 'atkPct').filter(
      (b) => b.value === 77.22
    );
    expect(generic.length).toBeGreaterThan(0);
    const offFrames = generic.filter((b) => !castFrames.has(b.frame));
    expect(
      offFrames.length,
      'a fullBurstEnter keying must shift the application frames off the casts'
    ).toBeGreaterThan(0);
  });

  it('is live and cleanly scoped: removing it drops ONLY the two Attackers', () => {
    expect(noAtk.totals.asuka).not.toEqual(base.totals.asuka);
    expect(noAtk.totals.ada).not.toEqual(base.totals.ada);
    expect(noAtk.totals.liter).toEqual(base.totals.liter);
    expect(noAtk.totals[SLUG]).toEqual(base.totals[SLUG]);
  });
});

describe('A5 — the unmodelable sustain lines are documented, not dropped or fabricated', () => {
  it('the only buff stat anne originates is atkPct (no sustain stat is invented)', () => {
    // Her kit text carries two Incoming-Healing lines and a revive; none is representable in v1,
    // so atkPct is the ONLY buff she should ever emit.
    expect([...new Set(anneBuffsAll(base.events).map((b) => b.stat))]).toEqual([
      'atkPct',
    ]);
  });

  it('23.46 / 78.93 (incoming healing) never appear as any buff value', () => {
    expect(buffs(base.events).some((b) => b.value === 23.46)).toBe(false);
    expect(buffs(base.events).some((b) => b.value === 78.93)).toBe(false);
  });

  it('all gap lines live verbatim in `unmodeled` (never an `ignored` drop)', () => {
    expect(shipped.unmodeled?.skill2?.length).toBe(2);
    expect(shipped.unmodeled.skill2.join(' ')).toContain('23.46');
    expect(shipped.unmodeled.skill2.join(' ')).toContain('78.93');
    expect(shipped.unmodeled.burst.join(' ')).toContain('Revives with 99% HP');
    expect(shipped.unmodeled.burst.join(' ')).toContain('38.61');
    expect(shipped.unmodeled.skill1.join(' ')).toContain('6.07');
    expect((shipped as any).ignored).toBeUndefined();
  });
});

describe('A6 — liter-trap guard: no anne heal feeds a DEFENDER recovery consumer', () => {
  it("crown's recovery buff count is identical with anne's heals present vs removed", () => {
    // crown (a Defender) IS fed in this comp — her own hitCount heal self-feeds her consumer — so
    // the equality below is not vacuous; anne's class-scoped heals simply never reach a Defender.
    expect(crownRecovery(guardBase)).toBeGreaterThan(0);
    expect(crownRecovery(guardBase)).toBe(crownRecovery(guardNoHeals));
  });
});

describe('structural B2 pins (S2b-pre-registered traps)', () => {
  it('every burst block is keyed to burstCast, never fullBurstEnter', () => {
    // The load-bearing trap for a Burst-II unit beside another B2: fullBurstEnter would over-fire
    // on rotations another Burst II took. Asserted statically so it holds regardless of fixture.
    for (const b of shipped.burst ?? []) {
      expect(b.trigger?.kind).toBe('burstCast');
    }
  });

  it('no `shield` effect anywhere — no sustain line is laundered into shielded events', () => {
    // A shield would emit shielded events and falsely satisfy teammates' requiresShielded gates
    // (e.g. asuka's S2). Anne's kit grants no shield; the sustain lines are heals or unmodeled.
    const kinds = [
      ...(shipped.skill1 ?? []),
      ...(shipped.skill2 ?? []),
      ...(shipped.burst ?? []),
    ].flatMap((b: any) => b.effects.map((e: any) => e.kind));
    expect(kinds).not.toContain('shield');
  });
});

/** All of anne's buffApply events (any stat). */
function anneBuffsAll(evs: SimEvent[]) {
  return buffs(evs).filter((b) => b.casterIdx === ANNE);
}
