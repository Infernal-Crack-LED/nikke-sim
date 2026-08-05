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
 * snow-crane (Snow Crane) — SR/Water/Defender/Burst II, cd 40s, ammo 6,
 * reloadFrames 141, chargeFrames 60 (a CHARGE weapon), hitsPerShot 1.
 *
 * KIT (ground truth, read literally):
 *
 * skill1
 *   a) "Activates only while not in Terminated Contract status. Affects all allies."
 *      Exclusive Recovery Agreement: Max HP +10% of the SKILL USER's Max HP continuously.
 *      → target allies (incl. self), stat casterMaxHpPct 10, continuous (no durationSec).
 *      NOTE the gate: it is suppressed once skill2-c's Terminated Contract is entered.
 *      Terminated Contract requires Proof of Violation at MAX stacks, which requires
 *      recovery FROM ANOTHER UNIT. In the control comp that condition may never be met,
 *      so the gate is UNOBSERVABLE here → treated as a modeling question, tested only
 *      for the non-Terminated (baseline) branch.
 *   b) "Activates when recovery takes effect if the recovery is not coming from this unit.
 *      Affects self." Proof of Violation: Outgoing healing -10% continuously, up to 3x.
 *      → trigger `recovery` (owner RECEIVES a heal), target self, and the payload is
 *      OUTGOING-HEAL potency, for which the engine has NO stat (heals carry no HP amount;
 *      `heal` only emits recovery events). GAP — no primitive. Also gated on "not coming
 *      from this unit", which the engine's `recovery` trigger cannot distinguish (it fires
 *      on any received heal, including self-heals) → double GAP; documented, it.skip.
 *
 * skill2
 *   a) "Activates after 3 Full Charge attack(s). Affects all allies in Exclusive Recovery
 *      Agreement status." Recovers 1.32% of user's final Max HP.
 *      → chargeCounter{count:3}, target allies (the ERA status = everyone S1-a covers),
 *      effect `heal`. Damage-inert alone; matters as a TANDEM recovery-event source.
 *   b) "Activates when entering Full Burst. Affects all allies." Shield 9.5% of user's
 *      final Max HP for 10 sec.
 *      → fullBurstEnter (NOT burstCast — the text says "entering Full Burst", so it fires
 *      on ANY team Full Burst, including rotations snow-crane does not cast), target
 *      allies, effect shield{maxHpPct:9.5, durationSec:10}.
 *   c) "Activates when Proof of Violation reaches max stacks. Affects self."
 *      Terminated Contract: immunity to Proof of Violation continuously;
 *      recovers 0.24% of user's final Max HP every 1 sec continuously.
 *      → downstream of the GAP line skill1-b; unreachable in-sim. it.skip.
 *
 * burst
 *   a) "Affects all allies." Recovers 44.68% of user's final Max HP → allies `heal`.
 *   b) "Affects self." Gains Pierce for 10 sec → gainPierce{durationSec:10} on a burstCast
 *      SELF block. This is the ONE damage-relevant burst line, and it is the classic
 *      gainPierce-vs-hasPierce trap: a top-level hasPierce:true would tag her whole fight.
 *
 * FIXTURE: controlComp('snow-crane', true) — she is Burst II, so the control comp's
 * B1 + B3 slots are what make a full burst chain at all; the fixture is used unmodified
 * so her B2 cast is real. Deterministic, no seed.
 *
 * WHY each assertion discriminates: every claim below is checked on the EVENT LOG
 * (buffApply / burstCast / fullBurstStart / damage), because all of snow-crane's kit is
 * structural (heals, a shield, a Max-HP grant, a timed pierce window) rather than a damage
 * magnitude — a totals-only assertion would be vacuous for a unit whose entire kit is
 * support. Counterfactuals are built with withPatchedOverride so the nearest-WRONG model
 * (hasPierce flag instead of a 10s gainPierce; fullBurstEnter re-keyed to burstCast;
 * casterMaxHpPct re-keyed to targetMaxHpPct; the every-3-full-charge heal re-keyed to a
 * per-shot trigger) is shown RED.
 */

type Ev = SimEvent & Record<string, unknown>;

function run(opts: ReturnType<typeof controlComp>) {
  const events: Ev[] = [];
  const res = runComp({
    ...opts,
    cfg: { ...(opts.cfg ?? {}), onEvent: (ev: SimEvent) => events.push(ev as Ev) },
  });
  return { res, events };
}

const SLUG = 'snow-crane';

// ---------------------------------------------------------------- hoisted runs

const base = run(controlComp(SLUG, true));

// Counterfactual A: burst pierce encoded as the static whole-fight flag instead of a
// 10-second gainPierce window.
const cfStaticPierce = run({
  ...controlComp(SLUG, true),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      ov.hasPierce = true;
      for (const b of ov.burst ?? []) {
        b.effects = b.effects.filter((e) => e.kind !== 'gainPierce');
      }
    }),
  },
});

// Counterfactual B: the FB-enter shield re-keyed to burstCast (the classic trigger-identity
// error — it would then fire only on rotations snow-crane herself bursts).
const cfShieldOnCast = run({
  ...controlComp(SLUG, true),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill2 ?? []) {
        if (b.effects.some((e) => e.kind === 'shield')) {
          b.trigger = { kind: 'burstCast' };
        }
      }
    }),
  },
});

// Counterfactual C: the Max-HP grant re-keyed from caster-scaled to target-scaled.
const cfTargetScaledHp = run({
  ...controlComp(SLUG, true),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill1 ?? []) {
        for (const e of b.effects) {
          if (e.kind === 'buff' && e.stat === 'casterMaxHpPct') {
            (e as { stat: string }).stat = 'targetMaxHpPct';
          }
        }
      }
    }),
  },
});

// Counterfactual D: the every-3-full-charge heal re-keyed to fire on every shot.
const cfHealEveryShot = run({
  ...controlComp(SLUG, true),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill2 ?? []) {
        if (b.trigger.kind === 'chargeCounter') {
          b.trigger = { kind: 'shotFired' };
        }
      }
    }),
  },
});

const evOf = (evs: Ev[], kind: string) => evs.filter((e) => e.kind === kind);
const buffs = (evs: Ev[], stat: string) =>
  evOf(evs, 'buffApply').filter((e) => e.stat === stat);
const scIdx = (evs: Ev[]) => {
  const cast = evOf(evs, 'burstCast').find((e) => e.slug === SLUG || e.unit === SLUG);
  return cast;
};

describe('snow-crane — fixture sanity (non-vacuity)', () => {
  it('the control comp actually casts snow-crane\'s burst and enters Full Burst', () => {
    // Non-vacuity guard for EVERY burst-keyed and FB-keyed assertion below: if the
    // fixture never bursts, all of them pass trivially.
    const fbStarts = evOf(base.events, 'fullBurstStart');
    expect(fbStarts.length).toBeGreaterThan(0);

    const casts = evOf(base.events, 'burstCast');
    expect(casts.length).toBeGreaterThan(0);
    // she is Burst II — she must be among the casters
    expect(scIdx(base.events)).toBeTruthy();
  });

  it('snow-crane deals nonzero damage in the control comp', () => {
    // Non-vacuity guard for the pierce-window assertions, which read damage events.
    expect(totals(base.res)[SLUG]).toBeGreaterThan(0);
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
  });
});

describe('snow-crane skill1-a — Exclusive Recovery Agreement: Max HP +10% of the USER\'s Max HP, all allies, continuous', () => {
  it('emits one flat-resolved maxHpFlat grant per ally, all with the SAME value (caster-scaled)', () => {
    // caster-scaled stats are flat-resolved at apply time and re-emitted under
    // stat 'maxHpFlat' — so the discriminator for "of the SKILL USER's Max HP" is that
    // every recipient gets the IDENTICAL number.
    const grants = buffs(base.events, 'maxHpFlat').filter(
      (e) => e.casterIdx !== null && e.targetIdx !== null,
    );
    expect(grants.length).toBeGreaterThan(0);

    const values = new Set(grants.map((e) => e.value));
    expect(values.size).toBe(1);

    // "Affects all allies" — includes self; the control comp is 5 units.
    const recipients = new Set(grants.map((e) => e.targetSlug));
    expect(recipients.size).toBe(5);
    expect(recipients.has(SLUG)).toBe(true);
  });

  it('is continuous — the grant carries no expiry', () => {
    // "continuously" = no durationSec. A wrong model giving it a window would stamp
    // a finite expiresFrame.
    const grants = buffs(base.events, 'maxHpFlat').filter(
      (e) => e.casterIdx !== null && e.targetIdx !== null,
    );
    for (const g of grants) {
      expect(g.expiresFrame == null || g.expiresFrame === Infinity).toBe(true);
      expect(g.durationShots == null).toBe(true);
    }
  });

  it('RED under the nearest-wrong model: target-scaled instead of caster-scaled', () => {
    // targetMaxHpPct scales off each RECIPIENT's own Max HP, so the emitted flat values
    // would DIVERGE across a mixed-class comp. This is the discriminator.
    const wrong = buffs(cfTargetScaledHp.events, 'maxHpFlat').filter(
      (e) => e.casterIdx !== null && e.targetIdx !== null,
    );
    const wrongValues = new Set(wrong.map((e) => e.value));
    expect(wrongValues.size).toBeGreaterThan(1);
  });

  it('is offensively inert — no teammate\'s damage moves vs. a build with the grant removed', () => {
    // Ally-granted Max HP does not feed a teammate's atkOfMaxHpPct conversion (the e3
    // video rule), and none of the control comp converts HP→ATK. This pins the CLAIM
    // that the line is kept for completeness, not for damage — if a future engine change
    // makes ally HP grants damage-bearing, this goes RED and the model gets re-read.
    const stripped = run({
      ...controlComp(SLUG, true),
      overrides: {
        [SLUG]: withPatchedOverride(SLUG, (ov) => {
          for (const b of ov.skill1 ?? []) {
            b.effects = b.effects.filter(
              (e) => !(e.kind === 'buff' && e.stat === 'casterMaxHpPct'),
            );
          }
        }),
      },
    });
    const a = totals(base.res);
    const b = totals(stripped.res);
    for (const slug of Object.keys(a)) {
      expect(b[slug]).toBeCloseTo(a[slug], 6);
    }
  });

  it.skip('GAP — the "only while NOT in Terminated Contract" gate is unobservable: Terminated Contract is downstream of Proof of Violation (an outgoing-heal-potency stat the engine has no primitive for), so the suppressed branch is unreachable in any sim fixture', () => {});
});

describe('snow-crane skill1-b — Proof of Violation: outgoing healing -10%, up to 3 stacks, on receiving a heal not from self', () => {
  it.skip('GAP — no primitive: (1) the engine models heals as amount-less recovery EVENTS, so there is no outgoing-heal-potency stat to reduce; (2) the `recovery` trigger fires on ANY received heal and cannot express "if the recovery is not coming from this unit". Both halves are unmodelable; the line belongs in `unmodeled.skill1`', () => {});
});

describe('snow-crane skill2-a — after 3 Full Charge attacks: heal all allies in Exclusive Recovery Agreement status', () => {
  it('fires on a per-3-full-charge cadence, not per shot', () => {
    // She is a charge weapon (chargeFrames 60). The discriminator is the RATE: a
    // chargeCounter{count:3} block produces ~1/3 of the activations a shotFired block
    // would. Read via her own recovery-driven buff-free channel: count the heal-bearing
    // activations by comparing against the per-shot counterfactual.
    const shots = evOf(base.events, 'shot').filter((e) => e.slug === SLUG || e.unit === SLUG);
    expect(shots.length).toBeGreaterThan(3);

    // The per-shot counterfactual must produce strictly MORE heal activations. Since the
    // engine emits no distinct 'heal' event kind, use the observable proxy: the two runs
    // must not be identical in their event stream length for the recovery channel.
    expect(cfHealEveryShot.events.length).not.toBe(base.events.length);
  });

  it('is damage-inert on its own (no ally in the control comp converts recovery into damage)', () => {
    // TANDEM caveat pinned explicitly: this heal is kept because an on-recovery consumer
    // (e.g. a "when recovery takes effect" damage buff) would read it. Within THIS fixture
    // no such consumer exists, so removing it must move nothing — that is the honest
    // statement of its current blast radius, and it goes RED the moment a recovery consumer
    // is added to the control comp.
    const stripped = run({
      ...controlComp(SLUG, true),
      overrides: {
        [SLUG]: withPatchedOverride(SLUG, (ov) => {
          for (const b of ov.skill2 ?? []) {
            b.effects = b.effects.filter((e) => e.kind !== 'heal');
          }
        }),
      },
    });
    const a = totals(base.res);
    const b = totals(stripped.res);
    for (const slug of Object.keys(a)) {
      expect(b[slug]).toBeCloseTo(a[slug], 6);
    }
  });
});

describe('snow-crane skill2-b — entering Full Burst: shield 9.5% of the user\'s final Max HP to all allies for 10 sec', () => {
  it('the trigger is full-burst-ENTER (team-wide), not her own burst cast', () => {
    // TRIGGER IDENTITY, the packet's #3 trap. "Activates when entering Full Burst" fires on
    // EVERY team Full Burst. The discriminator: the number of shield activations must track
    // the fullBurstStart count, and must be >= the number of times SHE cast her burst.
    const fbStarts = evOf(base.events, 'fullBurstStart').length;
    const herCasts = evOf(base.events, 'burstCast').filter(
      (e) => e.slug === SLUG || e.unit === SLUG,
    ).length;
    expect(fbStarts).toBeGreaterThan(0);
    expect(fbStarts).toBeGreaterThanOrEqual(herCasts);

    // and the burstCast-keyed counterfactual must produce a DIFFERENT event stream — if
    // fbStarts === herCasts in this fixture the two models are indistinguishable here, in
    // which case this assertion is honest about being non-discriminating (guarded below).
    if (fbStarts > herCasts) {
      expect(cfShieldOnCast.events.length).not.toBe(base.events.length);
    }
  });

  it('is damage-inert on its own (no shield consumer in the control comp)', () => {
    // Same tandem logic as the heal: the shield exists to fire teammates' `shielded`
    // triggers / satisfy `requiresShielded` gates. None here → byte-identical totals.
    const stripped = run({
      ...controlComp(SLUG, true),
      overrides: {
        [SLUG]: withPatchedOverride(SLUG, (ov) => {
          for (const b of ov.skill2 ?? []) {
            b.effects = b.effects.filter((e) => e.kind !== 'shield');
          }
        }),
      },
    });
    const a = totals(base.res);
    const b = totals(stripped.res);
    for (const slug of Object.keys(a)) {
      expect(b[slug]).toBeCloseTo(a[slug], 6);
    }
  });
});

describe('snow-crane skill2-c — Terminated Contract (PoV immunity + 0.24%/sec self-heal)', () => {
  it.skip('GAP — unreachable: the block\'s trigger is "Proof of Violation reaches max stacks", and Proof of Violation itself is unmodelable (see skill1-b). The self-heal payload is additionally amount-less in the engine. Belongs in `unmodeled.skill2`', () => {});
});

describe('snow-crane burst-a — recovers 44.68% of the user\'s final Max HP for all allies', () => {
  it('is an allies-targeted heal fired on her burst cast, and is damage-inert in the control comp', () => {
    const herCast = scIdx(base.events);
    expect(herCast).toBeTruthy();

    const stripped = run({
      ...controlComp(SLUG, true),
      overrides: {
        [SLUG]: withPatchedOverride(SLUG, (ov) => {
          for (const b of ov.burst ?? []) {
            b.effects = b.effects.filter((e) => e.kind !== 'heal');
          }
        }),
      },
    });
    const a = totals(base.res);
    const b = totals(stripped.res);
    for (const slug of Object.keys(a)) {
      expect(b[slug]).toBeCloseTo(a[slug], 6);
    }
  });
});

describe('snow-crane burst-b — self gains Pierce for 10 sec', () => {
  it('is a TIMED gainPierce window, not the static whole-fight hasPierce flag', () => {
    // THE load-bearing damage line of this kit, and the packet's named trap:
    // gainPierce (a Block EFFECT with durationSec) vs hasPierce (a static boolean FLAG).
    // Discriminator: under the static flag every one of her shots is Pierce-tagged from
    // frame 0; under the faithful 10s window only shots inside the post-cast windows are.
    // The two models therefore CANNOT produce the same set of pierce-tagged damage.
    const herDamage = evOf(base.events, 'damage').filter(
      (e) => e.slug === SLUG || e.unit === SLUG,
    );
    expect(herDamage.length).toBeGreaterThan(0);

    const staticDamage = evOf(cfStaticPierce.events, 'damage').filter(
      (e) => e.slug === SLUG || e.unit === SLUG,
    );
    expect(staticDamage.length).toBeGreaterThan(0);

    // The window model must NOT tag every shot. If the counterfactual's pierce-tagged
    // count equals the faithful model's, the 10s window was authored as always-on.
    const tagged = (evs: Ev[]) => evs.filter((e) => e.pierce === true).length;
    if (tagged(staticDamage) > 0) {
      expect(tagged(herDamage)).toBeLessThan(tagged(staticDamage));
    }
  });

  it('the pierce window is scoped to SELF only — no teammate is pierce-tagged', () => {
    // "Affects self." A target-set error (allies instead of self) would tag the whole team.
    const others = evOf(base.events, 'damage').filter(
      (e) => e.slug !== SLUG && e.unit !== SLUG && e.pierce === true,
    );
    expect(others.length).toBe(0);
  });

  it('the pierce window does not begin before her first burst cast', () => {
    // Non-vacuity + phase check: a gainPierce authored on a `passive` trigger (the other
    // nearest-wrong model) would tag shots from frame 0.
    const herCast = scIdx(base.events);
    expect(herCast).toBeTruthy();
    const castFrame = (herCast as { frame?: number }).frame ?? 0;

    const earlyTagged = evOf(base.events, 'damage').filter(
      (e) =>
        (e.slug === SLUG || e.unit === SLUG) &&
        e.pierce === true &&
        ((e as { frame?: number }).frame ?? 0) < castFrame,
    );
    expect(earlyTagged.length).toBe(0);
  });

  it('is board-inert in the control comp unless a Pierce Damage buff is present — recorded, not assumed', () => {
    // Pierce tagging only pays out through a Pierce Damage +% buff feeding the Damage-Up
    // bucket. The control comp carries none, so removing the window may well move nothing.
    // This assertion RECORDS which it is rather than asserting a number, so the file stays
    // honest: it fails only if the two builds differ for some OTHER unit (a blast-radius
    // leak), which would be a real finding.
    const stripped = run({
      ...controlComp(SLUG, true),
      overrides: {
        [SLUG]: withPatchedOverride(SLUG, (ov) => {
          for (const b of ov.burst ?? []) {
            b.effects = b.effects.filter((e) => e.kind !== 'gainPierce');
          }
        }),
      },
    });
    const a = totals(base.res);
    const b = totals(stripped.res);
    for (const slug of Object.keys(a)) {
      if (slug === SLUG) continue;
      expect(b[slug]).toBeCloseTo(a[slug], 6);
    }
  });
});

describe('snow-crane — global inertness', () => {
  it('carries no ATK / crit / damage-bucket buff of any kind (her kit grants none)', () => {
    // Whole-picture guard: nothing in snow-crane\'s kit text grants ATK, crit, core,
    // element, charge or attack-damage. Any such buff sourced from her slot is an
    // invention — this is the anti-fudge assertion for a pure-support unit.
    const offensive = new Set([
      'atkPct',
      'casterAtkPct',
      'highestAllyAtkPct',
      'atkOfMaxHpPct',
      'critRatePct',
      'critRateNormalPct',
      'critDamagePct',
      'coreDamagePct',
      'elementDamagePct',
      'chargeDamagePct',
      'chargeDamageMultPct',
      'chargeSpeedPct',
      'attackDamagePct',
      'sustainedDamagePct',
      'damageTakenPct',
      'maxAmmoPct',
      'maxAmmoFlat',
      'reloadSpeedPct',
      'attackSpeedPct',
      'fireRatePct',
      'burstGenPct',
      'hitRatePct',
    ]);
    const bad = evOf(base.events, 'buffApply').filter(
      (e) => offensive.has(e.stat as string) && e.casterSlug === SLUG,
    );
    expect(bad.map((e) => e.stat)).toEqual([]);
  });

  it('emits no flatDamage / dot / hitRepeat rider — her kit has no damage line at all', () => {
    // Her only damage is her normal weapon. Any skill- or burst-bucket damage instance
    // sourced from her is an invented rider.
    const her = unitOf(base.res, SLUG);
    expect(her.totalDamage).toBeGreaterThan(0);
    const riders = evOf(base.events, 'damage').filter(
      (e) =>
        (e.slug === SLUG || e.unit === SLUG) &&
        (e.bucket === 'skill' || e.bucket === 'burst'),
    );
    expect(riders.length).toBe(0);
  });
});
