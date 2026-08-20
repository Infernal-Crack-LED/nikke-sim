/**
 * anne-miracle-fairy (Anne: Miracle Fairy) — RL/Wind/Supporter/Burst II — BLIND kit spec test.
 * Written from the kit prose ALONE (no sight of the shipped override, the driver's tests, or any
 * truth file). Structural assertions read the SHIPPED override via an unmutated withPatchedOverride
 * clone; behavioural assertions discriminate by counterfactual.
 *
 * KIT SHAPE (magnitudes only):
 *   S1  ■ after 3 normal attacks | all Supporter allies -> heal 6.07% of attack damage, 5 sec
 *   S2a ■ all allies, while HP above 90%      -> Incoming Healing ▲ 23.46%
 *   S2b ■ last bullet hits while HP >= 90% | all enemies -> Incoming Healing ▼ 78.93% for 10 sec
 *   B   ■ all Attacker allies -> heal 38.61% of the skill user's final Max HP; ATK ▲ 77.22% for 10 sec
 *       ■ 1 random incapacitated Attacker ally -> revive at 99% HP, once per battle
 *
 * THE WHOLE KIT CONTAINS ZERO DAMAGE LINES. Her only damage-relevant payload is the burst ATK buff;
 * everything else is heal-channel (tandem-only) or has no StatKey at all. So the spec is mostly
 * about what must NOT have been invented: no damage rider, no Max-HP grant standing in for the
 * burst heal, and no "Incoming Healing" line silently re-encoded as a damage stat.
 *
 * FIXTURE: controlComp('anne-miracle-fairy', true) — liter (B1) / crown (B2) / anne / helm (B3).
 * She is a Burst II sharing the stage with the fixture's own B2, which is DELIBERATE: it makes
 * burst-cast keying distinguishable from full-burst-enter keying (she does not cast on every FB).
 * The fixed B3 is kept so the chain completes and Full Bursts actually happen.
 *
 * WHY THE HEAL PAIR DISCRIMINATES: the fixture's B2 is the on-recovery consumer of the control
 * comp. Under the faithful class scopes (Supporter for S1, Attacker for B) her heals never reach
 * it, so stripping every heal must be byte-identical; widening those same blocks to all allies must
 * NOT be. Under the nearest-wrong model (heals scoped to `allies`) both assertions invert.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import type { Block, EffectDef } from '../../../src/skills/types.js';
import { controlComp, runComp, totals, withPatchedOverride } from '../../tests/lib/harness.js';

const SLUG = 'anne-miracle-fairy';
const SLOTS = ['skill1', 'skill2', 'burst'] as const;
type Slot = (typeof SLOTS)[number];

const BURST_ATK_PCT = 77.22;
const BURST_HEAL_PCT = 38.61;
const INC_HEAL_UP = 23.46;
const INC_HEAL_DOWN = 78.93;
const S1_HEAL_PCT = 6.07;

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;

// The mutate-callback's argument type, lifted straight off the harness signature so the patch
// helpers stay type-safe without importing an OverrideFile type name.
type Ov = Parameters<Parameters<typeof withPatchedOverride>[1]>[0];
type Opts = ReturnType<typeof controlComp>;

/**
 * The override FILE is slot-keyed. Both documented slot shapes (slot -> Block[] and
 * slot -> { blocks: Block[] }) are handled, so every patch below is shape-agnostic and mutates the
 * block array IN PLACE (splice / field assignment) — never by reassigning the slot.
 */
function blocksOf(ov: Ov, slot: Slot): Block[] {
  const s = (ov as unknown as Record<Slot, unknown>)[slot];
  if (Array.isArray(s)) return s as Block[];
  const inner = (s as { blocks?: Block[] } | null | undefined)?.blocks;
  return Array.isArray(inner) ? inner : [];
}
function allBlocks(ov: Ov): Block[] {
  return SLOTS.flatMap((s) => blocksOf(ov, s));
}
function unmodeledText(ov: Ov): string {
  const u = (ov as unknown as { unmodeled?: Record<string, string[]> }).unmodeled ?? {};
  return Object.values(u).flat().join('\n');
}

type AnyEffect = EffectDef & { stat?: string; value?: number; durationSec?: number; atkPct?: number };
const eff = (e: EffectDef) => e as AnyEffect;
const isHeal = (e: EffectDef) => e.kind === 'heal';
const isBurstAtkBuff = (e: EffectDef) =>
  eff(e).kind === 'buff' && eff(e).stat === 'atkPct' && near(eff(e).value ?? -1, BURST_ATK_PCT);

function stripEffects(ov: Ov, pred: (e: EffectDef) => boolean): void {
  for (const b of allBlocks(ov)) {
    const keep = b.effects.filter((e) => !pred(e));
    b.effects.splice(0, b.effects.length, ...keep);
  }
}
function retargetBlocksWith(ov: Ov, pred: (e: EffectDef) => boolean): void {
  for (const b of allBlocks(ov)) if (b.effects.some(pred)) b.target = { kind: 'allies' };
}

interface Run {
  res: ReturnType<typeof runComp>;
  events: SimEvent[];
}
function run(opts: Opts): Run {
  const events: SimEvent[] = [];
  const tapped = {
    ...(opts as object),
    cfg: {
      ...((opts as { cfg?: Record<string, unknown> }).cfg ?? {}),
      onEvent: (ev: SimEvent) => events.push(ev),
    },
  } as Opts;
  return { res: runComp(tapped), events };
}
function patchedRun(mutate: (ov: Ov) => void): Run {
  const base = controlComp(SLUG, true);
  const opts = {
    ...(base as object),
    overrides: { [SLUG]: withPatchedOverride(SLUG, mutate) },
  } as Opts;
  return run(opts);
}

interface BuffEv {
  kind: 'buffApply';
  stat: string;
  value: number;
  casterIdx: number | null;
  targetIdx: number | null;
  targetSlug?: string;
  expiresFrame?: number;
}
const buffApplies = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'buffApply') as unknown as BuffEv[];

// ---- hoisted runs (6 full 180 s sims) -------------------------------------------------------
const SHIPPED = withPatchedOverride(SLUG, () => undefined); // read-only clone, nothing mutated

const BASE = run(controlComp(SLUG, true));
const NO_HEALS = patchedRun((ov) => stripEffects(ov, isHeal));
const WIDE_HEALS = patchedRun((ov) => retargetBlocksWith(ov, isHeal));
const WIDE_ATK = patchedRun((ov) => retargetBlocksWith(ov, isBurstAtkBuff));
const SHORT_ATK = patchedRun((ov) => {
  for (const b of allBlocks(ov)) for (const e of b.effects) if (isBurstAtkBuff(e)) eff(e).durationSec = 2;
});
const FB_TRIGGER = patchedRun((ov) => {
  for (const b of allBlocks(ov)) if (b.effects.some(isBurstAtkBuff)) b.trigger = { kind: 'fullBurstEnter' };
});

const BASE_BUFFS = buffApplies(BASE.events);
const ATK_APPLIES = BASE_BUFFS.filter((b) => near(b.value, BURST_ATK_PCT));
const BENEFICIARIES = [...new Set(ATK_APPLIES.map((b) => b.targetSlug).filter(Boolean))] as string[];

describe('anne-miracle-fairy — fixture non-vacuity', () => {
  it('the control comp reaches Full Burst and she casts her own burst at least once', () => {
    // Without both of these every burst-slot assertion below is vacuous.
    expect(BASE.events.filter((e) => e.kind === 'fullBurstStart').length).toBeGreaterThan(0);
    expect(ATK_APPLIES.length).toBeGreaterThan(0);
  });
});

describe('anne-miracle-fairy — burst: ATK ▲ 77.22% for 10 sec, all Attacker allies', () => {
  it('is a raw-percentage atkPct buff, not a caster-scaled flat ATK add', () => {
    // Discriminates atkPct ("ATK ▲ x%", scales the TARGET's own ATK — emitted as the raw 77.22)
    // from casterAtkPct / atkOfCasterMaxHpPct, which flat-resolve at apply time and would emit a
    // five-figure ATK number instead. Fails under either nearest-wrong stat choice.
    expect(ATK_APPLIES.every((b) => b.stat === 'atkPct')).toBe(true);
    expect(BASE_BUFFS.filter((b) => b.stat === 'casterAtkPct' && b.value > 1000).length).toBe(0);
  });

  it('is class-scoped to Attacker allies — never the caster, who is a Supporter', () => {
    expect(BENEFICIARIES.length).toBeGreaterThan(0);
    expect(BENEFICIARIES).not.toContain(SLUG);

    const t = allBlocks(SHIPPED).find((b) => b.effects.some(isBurstAtkBuff))?.target as {
      kind: string;
      cls?: string;
    };
    expect(t.kind).toBe('alliesOfClass');
    expect(/attack/i.test(t.cls ?? '')).toBe(true);
  });

  it('widening the buff to all allies moves damage (the class scope is load-bearing here)', () => {
    // Non-vacuity for the scope assertion above: the fixture contains at least one non-Attacker
    // ally whose damage would move if the kit's "all Attacker allies" clause were read as "allies".
    expect(totals(WIDE_ATK.res)).not.toEqual(totals(BASE.res));
  });

  it('the 10 sec window is real — shortening it costs every beneficiary damage', () => {
    // Duration SEMANTICS: seconds, not rounds/stacks. Under a 2 s window the buff lapses inside
    // the same Full Burst it was cast for, so each Attacker beneficiary strictly loses damage.
    for (const slug of BENEFICIARIES) {
      expect(totals(SHORT_ATK.res)[slug]).toBeLessThan(totals(BASE.res)[slug]);
    }
  });

  it('is keyed to HER OWN burst cast, not to team full-burst entry', () => {
    // TRIGGER IDENTITY. She is a Burst II sharing the stage with the fixture's B2, so she does not
    // cast on every rotation: re-keying the same block to fullBurstEnter over-credits the buff on
    // rotations the other B2 completed. If this comes back equal, the fixture (not the model) is
    // the problem — she cast on every Full Burst and the two keyings coincide.
    expect(totals(FB_TRIGGER.res)).not.toEqual(totals(BASE.res));

    const b = allBlocks(SHIPPED).find((blk) => blk.effects.some(isBurstAtkBuff))!;
    expect(b.trigger.kind).toBe('burstCast');
  });

  it('the 38.61% Max-HP line is a HEAL, never a Max HP grant', () => {
    // Nearest-wrong: reading "Restores HP equal to 38.61% of the skill user's final Max HP" as
    // casterMaxHpPct / targetMaxHpPct / atkOfCasterMaxHpPct. Those are Max-HP or ATK GRANTS that
    // feed HP-scaling ATK consumers; the kit line is a one-shot restore with no stat payload.
    const burstBlocks = blocksOf(SHIPPED, 'burst');
    expect(burstBlocks.some((b) => b.effects.some(isHeal))).toBe(true);

    const hpStats = ['casterMaxHpPct', 'targetMaxHpPct', 'atkOfCasterMaxHpPct', 'maxHpPct', 'maxHpFlat'];
    const badGrant = allBlocks(SHIPPED).flatMap((b) => b.effects).filter(
      (e) => eff(e).kind === 'buff' && hpStats.includes(eff(e).stat ?? ''),
    );
    expect(badGrant.length).toBe(0);
    expect(
      allBlocks(SHIPPED)
        .flatMap((b) => b.effects)
        .filter((e) => near(eff(e).value ?? -1, BURST_HEAL_PCT)).length,
    ).toBe(0);
  });

  it.skip('revive of 1 random incapacitated Attacker ally at 99% HP, once per battle — GAP: no death/HP model at scope lock', () => {
    // Nobody is ever incapacitated in the v1 fight, and the engine has no revive primitive.
    // Recorded as unmodeled text instead (asserted in the kit-wide block below).
  });
});

describe('anne-miracle-fairy — skill1: after 3 normal attacks, Supporter allies, 5 sec', () => {
  it('is modeled on a 3-hit trigger, class-scoped to Supporters, paying out through the heal channel', () => {
    // Trigger identity: "Activates after 3 normal attacks" is hitCount:3 (rounds, hitsPerShot 1 on
    // this RL) — NOT shotFired, NOT an interval. Target set is the Supporter class, which INCLUDES
    // the caster. The payload is a heal so that on-recovery consumers fire; dropping it entirely
    // (the "heals are defensive, skip them" failure mode) would silence that channel.
    const healBlocks = blocksOf(SHIPPED, 'skill1').filter((b) => b.effects.some(isHeal));
    expect(healBlocks.length).toBeGreaterThan(0);

    const b = healBlocks[0];
    expect(b.trigger.kind).toBe('hitCount');
    expect((b.trigger as { count?: number }).count).toBe(3);

    const t = b.target as { kind: string; cls?: string };
    expect(t.kind).toBe('alliesOfClass');
    expect(/support/i.test(t.cls ?? '')).toBe(true);
  });

  it('both heals are damage-inert at this fixture, and would NOT be if they were scoped to all allies', () => {
    // The discriminating PAIR. Faithful class scopes -> the control comp's on-recovery consumer is
    // outside both scopes, so removing every heal changes nothing; widening those same blocks to
    // `allies` reaches it and moves damage. Under the nearest-wrong model (heals targeting all
    // allies) BOTH assertions invert, so a mis-scoped heal cannot pass this pair.
    expect(totals(NO_HEALS.res)).toEqual(totals(BASE.res));
    expect(totals(WIDE_HEALS.res)).not.toEqual(totals(BASE.res));
  });

  it.skip('6.07%-of-attack-damage lifesteal sustained across the 5 sec window — GAP: no HP pool, and the heal AMOUNT is unmodeled by design', () => {
    // ⚑ The number of recovery events emitted across the 5 s window (single pulse vs ticks) is an
    // authoring choice the kit text does not settle and no event carries an HP amount, so nothing
    // here is assertable without a measurement of an on-recovery consumer's proc count.
  });
});

describe('anne-miracle-fairy — skill2: the two Incoming Healing lines', () => {
  it('Incoming Healing ▲ 23.46% is not re-encoded as any damage-bearing stat', () => {
    // There is no Incoming-Healing StatKey. The failure mode is parking the magnitude on whatever
    // stat is nearest to hand (atkPct / attackDamagePct), which would silently buff the whole team.
    expect(BASE_BUFFS.filter((b) => near(b.value, INC_HEAL_UP)).length).toBe(0);
    expect(
      allBlocks(SHIPPED)
        .flatMap((b) => b.effects)
        .filter((e) => near(eff(e).value ?? -1, INC_HEAL_UP) || near(eff(e).atkPct ?? -1, INC_HEAL_UP)).length,
    ).toBe(0);
  });

  it('Incoming Healing ▼ 78.93% is not re-encoded as a boss damageTaken debuff', () => {
    // The expensive nearest-wrong: an "affects all enemies, ▼78.93%" line read as damageTakenPct is
    // a ~79% team-wide damage amplifier. Boss-held debuffs arrive with casterIdx === targetIdx ===
    // null, so they are filtered by stat+value here.
    const bossHeld = BASE_BUFFS.filter((b) => b.casterIdx === null && b.targetIdx === null);
    expect(bossHeld.filter((b) => near(b.value, INC_HEAL_DOWN)).length).toBe(0);
    expect(BASE_BUFFS.filter((b) => near(b.value, INC_HEAL_DOWN)).length).toBe(0);
    expect(
      allBlocks(SHIPPED)
        .flatMap((b) => b.effects)
        .filter((e) => eff(e).stat === 'damageTakenPct').length,
    ).toBe(0);
  });

  it('no silent drops — both Incoming Healing lines and the revive line are recorded verbatim in unmodeled', () => {
    const txt = unmodeledText(SHIPPED);
    expect(txt).toMatch(/incoming healing/i);
    expect(txt).toContain(String(INC_HEAL_UP));
    expect(txt).toContain(String(INC_HEAL_DOWN));
    expect(txt).toMatch(/reviv/i);
  });

  it.skip('last-bullet + HP >= 90% gating on the ▼ line — GAP: unobservable payload', () => {
    // Even correctly triggered, the effect has no StatKey and the boss never heals, so trigger
    // identity (lastBullet) and the HP gate carry no observable consequence to assert against.
  });

  it.skip('the "above 90% HP" self-gate on the ▲ line — GAP: no HP pool, the gate is trivially always true', () => {
    // The v1 boss deals no damage, so HP is pinned at 100% for the whole fight.
  });
});

describe('anne-miracle-fairy — kit-wide invariants', () => {
  it('adds no damage of its own — the kit contains zero damage lines', () => {
    // She is a pure heal/ATK-buff Supporter: no rider, no DoT, no %-of-hit repeat, no stored hit.
    // This is the guard against a fabricated damage source filling in for the unmodellable heals.
    const damageKinds = ['flatDamage', 'dot', 'hitRepeat', 'storedHit', 'stackedNuke'];
    const invented = allBlocks(SHIPPED)
      .flatMap((b) => b.effects)
      .filter((e) => damageKinds.includes(e.kind));
    expect(invented).toEqual([]);
  });

  it('the S1 magnitude is not smuggled in as a stat buff', () => {
    expect(
      allBlocks(SHIPPED)
        .flatMap((b) => b.effects)
        .filter((e) => eff(e).kind === 'buff' && near(eff(e).value ?? -1, S1_HEAL_PCT)).length,
    ).toBe(0);
  });

  it('teammates outside the buff scope are byte-identical when the heals are removed', () => {
    // Inertness in the strict sense: removing a channel that should reach nobody here must not
    // perturb ANY unit's total, not merely the team aggregate.
    for (const slug of Object.keys(totals(BASE.res))) {
      expect(totals(NO_HEALS.res)[slug]).toBe(totals(BASE.res)[slug]);
    }
  });
});
