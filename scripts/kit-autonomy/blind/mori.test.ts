import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

/**
 * mori — Mori (AR/Wind/Supporter/Burst II)
 *
 * BLIND kit spec test. Written from the kit prose alone; each group states what the
 * kit says, the fixture, and why the assertion discriminates the faithful reading from
 * the nearest-wrong model.
 *
 * KIT (verbatim structure, paraphrased payloads):
 *   skill1
 *     a) "Activates at the start of battle. Affects self." -> Struggle: Shield = 40.12% of final Max HP,
 *        "continuously" (no duration).
 *     b) "Activates when using Burst Skill. Affects self if not in Struggle status." -> same Shield.
 *     c) "Activates when Struggle status ends. Affects self." -> Max HP +5.06% continuously, up to 5 stacks.
 *   skill2
 *     a) "Activates after landing 60 normal attack(s) when self is in Struggle status. Affects the target."
 *        -> Taunts for 4 sec.
 *     b) "Activates when an ally or self destroys an enemy's part. Affects all allies."
 *        -> Sustained Damage +2.03%, up to 5 stacks, 15 sec.
 *     c) same trigger, "Affects 1 enemy unit(s) with the highest ATK."
 *        -> 23.23% of final ATK as sustained damage every 1 sec for 15 sec.
 *   burst
 *     a) "Activates when self is in Struggle status. Affects self." -> Recovers Shield HP = 15.04% of final Max HP.
 *     b) "Activates when self is not in Struggle status. Affects self." -> Max HP +10.09% for 10 sec.
 *     c) "Affects all allies." -> Sustained Damage +10.16% for 10 sec.
 *
 * FIXTURE: controlComp('mori', true) — mori is Burst II, so the control's B1 + B3 slots are what let
 * a rotation chain at all; the fixed B3 (helm) is kept because mori casts nothing that helm's buffs
 * confound structurally (all mori assertions are event-identity assertions, not magnitude reads).
 *
 * SCOPE-LOCK NOTE THAT DRIVES SEVERAL DISPOSITIONS: the sim's boss is PARTLESS (docs: the scope-lock
 * boss has no destructible parts) and nothing in the engine emits a part-destruction trigger. Both
 * skill2 part-destruction lines are therefore GAP/inert-by-fixture: they can be authored, but no
 * trigger in the schema fires them, so any test that asserts they PRODUCE damage on this fixture is
 * vacuous. They are asserted as INERT (must not fire) + it.skip'd for the active case.
 */

type Ev = SimEvent & Record<string, unknown>;

function run(opts: ReturnType<typeof controlComp>) {
  const events: Ev[] = [];
  const res = runComp({
    ...opts,
    cfg: {
      ...(opts.cfg ?? {}),
      onEvent: (ev: SimEvent) => events.push(ev as Ev),
    },
  } as typeof opts);
  return { res, events };
}

const base = controlComp('mori', true);

// ---- hoisted runs (each is a full 180s sim) ----
const ctl = run(base);

// counterfactual: burst ally-wide Sustained Damage buff stripped
const noBurstSustained = withPatchedOverride('mori', (ov) => {
  ov.burst!.blocks = ov.burst!.blocks.filter(
    (b) =>
      !b.effects.some(
        (e) => e.kind === 'buff' && e.stat === 'sustainedDamagePct'
      )
  );
});
const cfNoBurstSustained = run({
  ...base,
  overrides: { ...(base.overrides ?? {}), mori: noBurstSustained },
});

// nearest-wrong: the ally-wide Sustained Damage buff keyed to fullBurstEnter instead of burstCast
const sustainedOnFbEnter = withPatchedOverride('mori', (ov) => {
  for (const b of ov.burst!.blocks) {
    if (
      b.effects.some(
        (e) => e.kind === 'buff' && e.stat === 'sustainedDamagePct'
      )
    ) {
      b.trigger = { kind: 'fullBurstEnter' };
    }
  }
});
const cfSustainedOnFbEnter = run({
  ...base,
  overrides: { ...(base.overrides ?? {}), mori: sustainedOnFbEnter },
});

// nearest-wrong: burst Sustained Damage buff made permanent (durationSec dropped)
const sustainedPermanent = withPatchedOverride('mori', (ov) => {
  for (const b of ov.burst!.blocks) {
    for (const e of b.effects) {
      if (e.kind === 'buff' && e.stat === 'sustainedDamagePct') {
        delete (e as { durationSec?: number }).durationSec;
      }
    }
  }
});
const cfSustainedPermanent = run({
  ...base,
  overrides: { ...(base.overrides ?? {}), mori: sustainedPermanent },
});

const buffApplies = (evs: Ev[], stat: string) =>
  evs.filter((e) => e.kind === 'buffApply' && e.stat === stat);

describe('mori — skill1: Struggle shield', () => {
  /**
   * skill1a: "Activates at the start of battle. Affects self." — a Shield sized at 40.12% of
   * mori's OWN final Max HP, held "continuously" (no duration in the text).
   *
   * Discriminates: the faithful model is a `shield` effect with maxHpPct 40.12 on a `passive`
   * trigger targeting self. The nearest-wrong models are (i) a heal (fires `recovery` triggers on
   * teammates instead of `shielded`), and (ii) omitting it entirely — which silently breaks any
   * teammate's shield-synergy consumer and mori's own requiresShielded gates.
   */
  it('grants a self shield from battle start (40.12% of own Max HP)', () => {
    const shields = ctl.events.filter((e) => e.kind === 'shield');
    expect(shields.length).toBeGreaterThan(0);
    const first = shields[0];
    expect(first.frame ?? 0).toBeLessThanOrEqual(1);
    expect(first.targetSlug).toBe('mori');
    expect(first.maxHpPct).toBeCloseTo(40.12, 2);
  });

  /**
   * skill1a is NOT a heal — a `heal` effect emits `recovery` events, which drive on-recovery
   * consumers (crown-style "when recovery takes effect"). Encoding the shield as a heal would
   * over-credit any such teammate. This asserts mori emits no recovery event she does not own.
   */
  it('the shield is not modeled as a heal (no recovery events sourced from mori)', () => {
    const recoveries = ctl.events.filter(
      (e) => e.kind === 'recovery' || e.kind === 'heal'
    );
    const fromMori = recoveries.filter(
      (e) => e.casterSlug === 'mori' || e.srcSlug === 'mori'
    );
    expect(fromMori.length).toBe(0);
  });

  /**
   * skill1b: "Activates when using Burst Skill. Affects self IF NOT in Struggle status."
   *
   * TRIGGER IDENTITY + NON-VACUITY: this is a re-arm of the SAME status skill1a already granted at
   * t=0 and which the text says is held "continuously". With no Struggle-expiry mechanic in the
   * prose, mori is in Struggle from frame 0 onward, so the "if not in Struggle" branch is
   * NEVER satisfied — the fixture cannot exercise its active case. Asserting it fires would be
   * vacuous-in-reverse (it would prove the gate is missing). This is the inertness half; the
   * active half is skipped below.
   *
   * Nearest-wrong it fails under: an ungated burstCast shield re-application, which would emit a
   * fresh shield event on every mori burst.
   */
  it('does not re-shield on burst while already in Struggle (gate is real)', () => {
    const bursts = ctl.events.filter(
      (e) => e.kind === 'burstCast' && e.slug === 'mori'
    );
    expect(bursts.length).toBeGreaterThan(0); // non-vacuity: mori actually bursts in this fixture

    const shields = ctl.events.filter(
      (e) => e.kind === 'shield' && e.targetSlug === 'mori'
    );
    // Exactly the battle-start application; no per-burst re-arm.
    expect(shields.length).toBe(1);
  });

  /**
   * skill1c: "Activates when Struggle status ends. Affects self. Max HP +5.06% continuously,
   * stacks up to 5."
   *
   * INERTNESS: Struggle never ends at scope lock (the boss deals no damage, so no shield is ever
   * broken, and the kit gives Struggle no timer). The faithful model therefore produces ZERO
   * stacks of this buff. Nearest-wrong: authoring it as a `passive` self Max HP buff at max stacks,
   * which would hand mori 25.3% Max HP she never earns (and would feed any atkOfMaxHpPct consumer).
   */
  it('Struggle-end Max HP stacks never apply (Struggle never ends at scope lock)', () => {
    const hpBuffs = [
      ...buffApplies(ctl.events, 'maxHpFlat'),
      ...buffApplies(ctl.events, 'targetMaxHpPct'),
      ...buffApplies(ctl.events, 'maxHpPct'),
    ].filter((e) => e.targetSlug === 'mori');
    const struggleEndStacks = hpBuffs.filter((e) => (e.maxStacks ?? 0) === 5);
    expect(struggleEndStacks.length).toBe(0);
  });
});

describe('mori — skill2: taunt + part-destruction lines', () => {
  /**
   * skill2a: "Activates after landing 60 normal attacks while self is in Struggle status.
   * Affects the target. Taunts for 4 sec."
   *
   * DISPOSITION: UNMODELED. A taunt redirects boss aggro; the sim models no incoming damage and
   * has no taunt primitive, so it moves nothing. Asserted as pure inertness: mori's hitCount:60
   * cadence must not be repurposed into a damage or stat effect.
   *
   * Non-vacuity: mori's magazine is 60 and she reloads repeatedly across 180s, so a hitCount:60
   * trigger WOULD fire many times if it carried a payload — the inertness assertion is meaningful.
   */
  it('the 60-hit taunt carries no damage or stat payload', () => {
    const moriDamage = ctl.events.filter(
      (e) => e.kind === 'damage' && e.slug === 'mori'
    );
    const skillBucket = moriDamage.filter((e) => e.bucket === 'skill');
    // Every skill-bucket instance mori produces must come from a modeled damage line, not the taunt.
    // At scope lock the only candidate skill-bucket source (the part-destruction DoT) cannot fire,
    // so mori's skill bucket is empty.
    expect(skillBucket.length).toBe(0);
  });

  /**
   * skill2b: "when an ally or self destroys an enemy's part -> all allies: Sustained Damage +2.03%,
   * 5 stacks, 15 sec."
   * skill2c: same trigger -> "1 enemy with highest ATK: 23.23% of final ATK as sustained damage
   * every 1 sec for 15 sec."
   *
   * GAP: the scope-lock boss is PARTLESS and the trigger vocabulary has no part-destruction kind.
   * Neither line can fire. Faithful handling is to record them (unmodeled / inert block) and assert
   * they contribute nothing — the nearest-wrong is keying them to `passive` or `interval`, which
   * would give mori a permanent 10.15% ally Sustained buff and a free 23.23%/s DoT for the whole
   * fight.
   */
  it('part-destruction lines contribute nothing on a partless boss', () => {
    // (c) no DoT from mori
    const moriDot = ctl.events.filter(
      (e) =>
        e.kind === 'damage' &&
        e.slug === 'mori' &&
        (e.flavor === 'sustained' || e.bucket === 'skill')
    );
    expect(moriDot.length).toBe(0);

    // (b) the only sustainedDamagePct mori applies is the 10.16% burst line, never the 2.03% stack
    const stackBuffs = buffApplies(ctl.events, 'sustainedDamagePct').filter(
      (e) => Math.abs((e.value as number) - 2.03) < 0.005
    );
    expect(stackBuffs.length).toBe(0);
  });

  it.skip('skill2b: 2.03%x5 ally Sustained Damage on part destruction — GAP: no part-destruction trigger exists and the scope-lock boss is partless', () => {});

  it.skip('skill2c: 23.23%/sec sustained DoT on the highest-ATK enemy for 15s on part destruction — GAP: same missing trigger; also single-target boss makes the highest-ATK selection degenerate', () => {});
});

describe('mori — burst', () => {
  /**
   * burst-a: "Activates when self is in Struggle status. Affects self. Recovers Shield HP equal to
   * 15.04% of the skill user's final Max HP."
   *
   * DISPOSITION: recorded-for-completeness. The sim models no shield HP POOL (the boss deals no
   * damage), so a top-up of an unconsumed shield moves nothing offensively. What it MUST NOT do is
   * emit a `heal`/recovery event: "Recovers Shield HP" is shield restoration, not healing, and
   * mis-encoding it as a heal would fire teammates' on-recovery consumers on every mori burst.
   *
   * Non-vacuity: mori bursts multiple times in this fixture (asserted above), and she is in Struggle
   * the whole fight, so the gated branch IS the live branch.
   */
  it('shield top-up on burst is not a heal (fires no recovery consumers)', () => {
    const recoveries = ctl.events.filter((e) => e.kind === 'recovery');
    const fromMori = recoveries.filter(
      (e) => e.casterSlug === 'mori' || e.srcSlug === 'mori'
    );
    expect(fromMori.length).toBe(0);
  });

  /**
   * burst-b: "Activates when self is NOT in Struggle status. Affects self. Max HP +10.09% for 10s."
   *
   * The mirror of skill1b's gate: mori is always in Struggle at scope lock, so this branch is dead.
   * Nearest-wrong: dropping the gate and granting the Max HP buff on every burst — visible as a
   * self maxHpFlat/targetMaxHpPct buffApply on mori's burst frames.
   */
  it('the not-in-Struggle Max HP branch never fires', () => {
    const selfHp = [
      ...buffApplies(ctl.events, 'maxHpFlat'),
      ...buffApplies(ctl.events, 'targetMaxHpPct'),
      ...buffApplies(ctl.events, 'maxHpPct'),
    ].filter((e) => e.targetSlug === 'mori');
    const tenPct = selfHp.filter(
      (e) => Math.abs((e.value as number) - 10.09) < 0.005
    );
    expect(tenPct.length).toBe(0);
  });

  /**
   * burst-c: "Affects all allies. Sustained Damage +10.16% for 10 sec."
   *
   * This is mori's ONE live damage contribution. Four things must hold:
   *   1. it fires (non-vacuity),
   *   2. it targets ALL allies including self (5 buffApply events per cast),
   *   3. it is keyed to mori's OWN burst cast, not team full-burst entry,
   *   4. it is a 10-second window, not permanent.
   */
  it("grants Sustained Damage +10.16% to all allies on mori's burst", () => {
    const bursts = ctl.events.filter(
      (e) => e.kind === 'burstCast' && e.slug === 'mori'
    );
    expect(bursts.length).toBeGreaterThan(0);

    const sus = buffApplies(ctl.events, 'sustainedDamagePct').filter(
      (e) => Math.abs((e.value as number) - 10.16) < 0.005
    );
    expect(sus.length).toBe(bursts.length * 5); // all 5 allies, incl. self, per cast

    const targets = new Set(sus.map((e) => e.targetSlug));
    expect(targets.has('mori')).toBe(true);
    expect(targets.size).toBe(5);

    // duration semantics: seconds, not permanent / not round-count
    for (const e of sus) {
      expect(e.durationShots).toBeUndefined();
      expect(e.expiresFrame).toBeGreaterThan(0);
      expect(e.expiresFrame).toBeLessThan(Number.MAX_SAFE_INTEGER);
    }
  });

  /**
   * TRIGGER IDENTITY (the taxonomy's #3 trap): "Affects all allies" inside mori's OWN burst block
   * is a BURST-CAST effect — it fires only on rotations where mori bursts. Re-keying it to
   * fullBurstEnter fires it on every team Full Burst, including ones mori sits out. In a comp with
   * another Burst II unit those diverge; here the discriminator is the EVENT COUNT + frame
   * alignment: burstCast applications land on mori's cast frames, fullBurstEnter applications land
   * on FB-start frames (strictly later, after the chain completes).
   */
  it("the ally Sustained buff is keyed to mori's burst cast, not full-burst entry", () => {
    const castFrames = new Set(
      ctl.events
        .filter((e) => e.kind === 'burstCast' && e.slug === 'mori')
        .map((e) => e.frame)
    );
    const sus = buffApplies(ctl.events, 'sustainedDamagePct').filter(
      (e) => Math.abs((e.value as number) - 10.16) < 0.005
    );
    expect(sus.length).toBeGreaterThan(0);
    for (const e of sus) {
      expect(castFrames.has(e.frame)).toBe(true);
    }

    // the nearest-wrong model puts them on FB-start frames instead
    const fbFrames = new Set(
      ctl.events.filter((e) => e.kind === 'fullBurstStart').map((e) => e.frame)
    );
    const wrong = buffApplies(
      cfSustainedOnFbEnter.events,
      'sustainedDamagePct'
    ).filter((e) => Math.abs((e.value as number) - 10.16) < 0.005);
    expect(wrong.length).toBeGreaterThan(0);
    const anyOnFbFrame = wrong.some((e) => fbFrames.has(e.frame));
    expect(anyOnFbFrame).toBe(true);
  });

  /**
   * DURATION SEMANTICS: "for 10 sec" is a real window. If it were authored permanent, allies with
   * sustained-flavored damage would keep the bonus for the whole fight. The counterfactual with
   * durationSec removed must produce STRICTLY MORE team damage than the control — this is what
   * proves the window is load-bearing rather than decorative.
   *
   * NON-VACUITY GUARD: this only discriminates if some ally in the control comp actually deals
   * sustained-flavored damage. If nobody does, the buff is inert and both runs tie — that is
   * reported, not silently passed, by asserting the control has sustained damage first.
   */
  it('the 10s window is load-bearing (permanent variant deals strictly more)', () => {
    const sustainedHits = ctl.events.filter(
      (e) => e.kind === 'damage' && e.flavor === 'sustained'
    );
    if (sustainedHits.length === 0) {
      // No sustained-flavored carrier in the control comp -> the buff is inert here and the
      // duration cannot be discriminated by totals. Assert the structural claim instead.
      const sus = buffApplies(ctl.events, 'sustainedDamagePct').filter(
        (e) => Math.abs((e.value as number) - 10.16) < 0.005
      );
      const perm = buffApplies(
        cfSustainedPermanent.events,
        'sustainedDamagePct'
      ).filter((e) => Math.abs((e.value as number) - 10.16) < 0.005);
      expect(sus.every((e) => (e.expiresFrame as number) < 180 * 60)).toBe(
        true
      );
      expect(perm.some((e) => (e.expiresFrame as number) >= 180 * 60)).toBe(
        true
      );
      return;
    }

    const teamOf = (r: { res: ReturnType<typeof runComp> }) =>
      Object.values(totals(r.res)).reduce((a, b) => a + b, 0);
    expect(teamOf(cfSustainedPermanent)).toBeGreaterThan(teamOf(ctl));
  });

  /**
   * INERTNESS / SCOPE: the buff is Sustained Damage only. It must not leak into generic Attack
   * Damage. Stripping the burst Sustained line must not change mori's OWN normal-attack output
   * (she has no sustained-flavored normals), which proves the buff is scoped to the sustained
   * channel rather than encoded as a generic attackDamagePct.
   */
  it("is scoped to Sustained Damage — mori's own normal-attack damage is unchanged without it", () => {
    const moriCtl = unitOf(ctl.res, 'mori');
    const moriCf = unitOf(cfNoBurstSustained.res, 'mori');
    expect(moriCf.totalDamage).toBeCloseTo(moriCtl.totalDamage, 6);

    const generic = buffApplies(ctl.events, 'attackDamagePct').filter(
      (e) => Math.abs((e.value as number) - 10.16) < 0.005
    );
    expect(generic.length).toBe(0);
  });
});
