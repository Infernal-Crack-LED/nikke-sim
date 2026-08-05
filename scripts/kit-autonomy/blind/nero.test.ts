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
 * nero — Nero (SMG/Fire/Defender/Burst II), blind kit spec.
 *
 * KIT (ground truth, read literally):
 *   skill1a  "Activates when recovery takes effect. Affects the target who cast the skill
 *            with recovery effect on Nero." -> Damage Taken ▼14.14% for 5 sec.
 *   skill1b  "Activates when recovery takes effect. Affects self."
 *            Cat's Repayment: Damage Taken ▼8.43%, up to 5 stacks, 5 sec.
 *   skill2a  30% chance when attacked -> target: Damage Taken ▲8.26% for 5 sec.
 *   skill2b  30% chance when attacked in Grumpy Cat status -> target: 158.05% of final ATK.
 *   skill2c  "Activates at the start of battle. Affects self." Max HP ▲60.28% continuously.
 *   burst1   1 enemy with highest remaining HP: 1104.91% of final ATK as Burst Skill damage.
 *   burst2   self: Attract — taunts all enemies for 15 sec.
 *   burst3   "Activates when Cat's Repayment is at max stacks. Affects self."
 *            Grumpy Cat: Incoming healing ▲60.08% for 15 sec.
 *
 * FIXTURE: controlComp('nero', true) — Nero is Burst II, so she needs a B1 ahead of her and a
 * B3 behind her for the chain to complete and Full Bursts to occur at all. The control comp
 * supplies liter(B1)/crown(B2)/carry(B3)/helm(B3); passing 'nero' as the carry places her in
 * the B3 carry slot, so the fixture is built explicitly rather than via the carry shorthand
 * where the assertion depends on her actually casting a Burst II. All runs are hoisted — each
 * runComp is a full 180 s sim.
 *
 * WHY THE ASSERTIONS DISCRIMINATE — the central trap on this unit:
 * Nero is a Defender whose kit is almost entirely MITIGATION. Four of her nine lines move
 * "Damage Taken", but in two OPPOSITE directions with two DIFFERENT target sets:
 *   - skill1a/skill1b are ▼ on an ALLY (the healer, and self). That is incoming-damage
 *     reduction. The v1 boss deals no damage, so it is offensively inert.
 *   - skill2a is ▲ on THE TARGET (the enemy). That is the classic boss debuff the whole team
 *     rides.
 * The engine has ONE stat key for both spellings: `damageTakenPct`, documented as "debuff on the
 * boss (positive = boss takes more)". So the nearest-wrong model for skill1 is to encode the
 * ally-side ▼14.14%/▼8.43% as `damageTakenPct` at all — with a negative value it would make the
 * boss take LESS (team-wide damage loss), and with a sign flip it would hand the team a free
 * +14% amp off a purely defensive line. The skill1 tests therefore assert BOTH that Nero emits
 * no boss-scoped damageTakenPct, and that patching one in MOVES the board — i.e. the assertion
 * is non-vacuous and the mis-encoding is genuinely reachable.
 */

const NERO = 'nero';

type Ev = SimEvent & Record<string, unknown>;

function run(opts: ReturnType<typeof controlComp>) {
  const events: Ev[] = [];
  const res = runComp({
    ...opts,
    cfg: { ...(opts.cfg ?? {}), onEvent: (ev: SimEvent) => events.push(ev as Ev) },
  });
  return { res, events };
}

const base = controlComp(NERO, true);

// ---------------------------------------------------------------- hoisted runs
const { res: baseRes, events: baseEvents } = run(base);

const buffApplies = baseEvents.filter((e) => e.kind === 'buffApply');
const damages = baseEvents.filter((e) => e.kind === 'damage');
const neroIdx = baseRes.units.findIndex((u) => u.slug === NERO);
const neroDamages = damages.filter((e) => e.srcSlot === neroIdx);

describe('nero — fixture sanity (non-vacuity for everything below)', () => {
  it('nero is in the comp and deals damage', () => {
    expect(neroIdx).toBeGreaterThanOrEqual(0);
    expect(unitOf(baseRes, NERO).totalDamage).toBeGreaterThan(0);
  });

  it('nero actually casts her Burst II at least twice (burst assertions are reachable)', () => {
    const casts = baseEvents.filter(
      (e) => e.kind === 'burstCast' && (e.slot === neroIdx || e.srcSlot === neroIdx),
    );
    expect(casts.length).toBeGreaterThanOrEqual(2);
  });

  it('the fight reaches Full Burst (so FB-timed riders are exercised)', () => {
    expect(baseEvents.filter((e) => e.kind === 'fullBurstStart').length).toBeGreaterThanOrEqual(2);
  });
});

describe('nero skill1a — healer-side Damage Taken ▼14.14% (defensive, GAP)', () => {
  /*
   * The line targets "the target who cast the skill with recovery effect on Nero" — an ALLY.
   * A Damage Taken ▼ on an ally is incoming-damage mitigation; the v1 boss deals no damage, so
   * it moves nothing. The discriminating claim is NEGATIVE and precise: nero must not emit a
   * boss-scoped damageTakenPct at all. Boss-held debuffs are identified by
   * casterIdx === null && targetIdx === null per the harness contract.
   */
  it('emits NO boss-scoped Damage Taken debuff (the ▼ is ally mitigation, not an enemy amp)', () => {
    const bossDebuffs = buffApplies.filter(
      (e) => e.stat === 'damageTakenPct' && e.casterIdx === null && e.targetIdx === null,
    );
    expect(bossDebuffs).toHaveLength(0);
  });

  it('emits no negative damageTakenPct anywhere (a ▼ encoded as the boss stat would cut team damage)', () => {
    const negative = buffApplies.filter(
      (e) => e.stat === 'damageTakenPct' && (e.value as number) < 0,
    );
    expect(negative).toHaveLength(0);
  });

  it('NON-VACUITY: injecting the mis-encoded ▼14.14% as a boss debuff DOES move the board', () => {
    // Nearest-wrong model: author skill1a as `damageTakenPct` on the enemy. If that were inert,
    // the negative assertions above would prove nothing. It is not inert — it must move totals,
    // which is exactly why mis-encoding this line is dangerous rather than harmless.
    const patched = withPatchedOverride(NERO, (ov) => {
      ov.skill1!.blocks.push({
        slot: 'skill1',
        trigger: { kind: 'passive' },
        target: { kind: 'enemy' },
        effects: [{ kind: 'buff', stat: 'damageTakenPct', value: -14.14 }],
      });
    });
    const wrong = runComp({ ...base, overrides: { [NERO]: patched } });
    const teamBefore = Object.values(totals(baseRes)).reduce((a, b) => a + b, 0);
    const teamAfter = Object.values(totals(wrong)).reduce((a, b) => a + b, 0);
    expect(teamAfter).toBeLessThan(teamBefore * 0.999);
  });
});

describe("nero skill1b — Cat's Repayment ▼8.43% ×5 / 5 sec (defensive, GAP; gates the burst)", () => {
  /*
   * Self-targeted mitigation stacks on a `recovery` trigger. Offensively inert for the same
   * reason as skill1a, and doubly unreachable at scope lock: Nero's own kit contains no `heal`
   * effect, so nothing in a Nero-only reading ever fires her recovery trigger. The stack pool is
   * still load-bearing — it is the stated gate for the burst's Grumpy Cat line — so the test
   * pins WHY it cannot be exercised rather than asserting a stack count that would be fiction.
   */
  it('nero emits no heal effect of her own (her recovery trigger is ally-fed, not self-fed)', () => {
    const heals = baseEvents.filter(
      (e) => (e.kind === 'heal' || e.kind === 'recovery') && e.srcSlot === neroIdx,
    );
    expect(heals).toHaveLength(0);
  });

  it.skip("GAP: Cat's Repayment stack count is unobservable — mitigation stats have no damage-side consumer, and no committed comp pairs nero with a healer whose heal cadence is measured", () => {});
});

describe('nero skill2a — target Damage Taken ▲8.26% / 5 sec, 30% when attacked (GAP: no trigger)', () => {
  /*
   * This one IS a genuine boss debuff and would benefit the whole team — but its trigger is
   * "when attacked", and the v1 boss deals no damage to anyone. There is no `attacked` TriggerDef
   * in the schema, so the line has no faithful encoding: any trigger chosen for it (passive,
   * interval, shotFired) is an INVENTED cadence that would silently amp the entire team. The
   * assertion is that no such invention shipped.
   */
  it('does NOT ship an invented always-on +8.26% boss debuff', () => {
    const amps = buffApplies.filter(
      (e) => e.stat === 'damageTakenPct' && Math.abs((e.value as number) - 8.26) < 0.01,
    );
    expect(amps).toHaveLength(0);
  });

  it.skip('GAP: "30% chance when attacked" has no trigger primitive (no `attacked` kind) and the scope-lock boss deals no damage — the 8.26% team amp is unreachable and must not be faked with passive/interval', () => {});
});

describe('nero skill2b — 158.05% of final ATK, 30% when attacked in Grumpy Cat (GAP)', () => {
  /*
   * Real damage, but doubly gated: on the same unavailable "when attacked" trigger AND on Grumpy
   * Cat status, which itself requires Cat's Repayment at max stacks (skill1b), which requires
   * incoming heals. Two unmodelable conditions stacked. Nearest-wrong: encoding it as a bare
   * shotFired/interval flatDamage, which would hand a Defender a phantom damage stream.
   */
  it('no 158.05% flat-damage rider fires (both gates are unmodelable; an ungated encoding is invented damage)', () => {
    // Her skill bucket must contain no instance carrying the 158.05% signature. Read structurally
    // off the damage events rather than off totals, so a small rider can't hide inside SMG chip.
    const riders = neroDamages.filter(
      (e) => e.bucket === 'skill' && Math.abs(((e.mult as Record<string, number>)?.atkPct ?? 0) - 158.05) < 0.01,
    );
    expect(riders).toHaveLength(0);
  });

  it('nero deals NO skill-bucket damage at all (her entire skill1/skill2 is defensive)', () => {
    const skillDmg = neroDamages
      .filter((e) => e.bucket === 'skill')
      .reduce((a, e) => a + ((e.amount as number) ?? 0), 0);
    expect(skillDmg).toBe(0);
  });

  it.skip('GAP: requires both an `attacked` trigger and a Grumpy-Cat status gate fed by ally heals — neither is reachable at scope lock', () => {});
});

describe('nero skill2c — Max HP ▲60.28% continuously (FAITHFUL, offensively inert)', () => {
  /*
   * "Activates at the start of battle" + "continuously" => a `passive` self-buff, NOT a
   * burstCast/fullBurstEnter keyed one and NOT a timed window. Per schema rule 7 the grant is
   * kept even though Nero has no atkOfMaxHpPct scaler — a self-granted Max HP feeds a future
   * consumer, and dropping it would be a silent loss of kit surface.
   *
   * Self Max HP ▲% is `targetMaxHpPct` (% of the TARGET's own Max HP) with target self — NOT
   * `casterMaxHpPct` (% of the CASTER's Max HP granted outward). For a self-grant the two
   * coincide numerically, so the discriminator is the emitted stat/target, not the value.
   */
  it('applies the self Max HP grant exactly once, at battle start, and never refreshes', () => {
    const hpGrants = buffApplies.filter(
      (e) =>
        (e.stat === 'targetMaxHpPct' || e.stat === 'maxHpFlat') &&
        e.targetSlug === NERO &&
        e.casterIdx === neroIdx,
    );
    expect(hpGrants.length).toBe(1);
    expect(hpGrants[0].frame ?? 0).toBeLessThanOrEqual(1);
  });

  it('the grant is permanent — no expiry frame (nearest-wrong: a 5 s or 15 s window borrowed from her other lines)', () => {
    const hpGrants = buffApplies.filter(
      (e) =>
        (e.stat === 'targetMaxHpPct' || e.stat === 'maxHpFlat') &&
        e.targetSlug === NERO,
    );
    for (const g of hpGrants) {
      expect(g.expiresFrame == null || (g.expiresFrame as number) > 180 * 60).toBe(true);
      expect(g.durationShots).toBeUndefined();
    }
  });

  it('grants Max HP to nero ONLY — it is "Affects self", not a team grant', () => {
    const leaked = buffApplies.filter(
      (e) =>
        (e.stat === 'targetMaxHpPct' || e.stat === 'casterMaxHpPct' || e.stat === 'maxHpFlat') &&
        e.casterIdx === neroIdx &&
        e.targetSlug !== NERO,
    );
    expect(leaked).toHaveLength(0);
  });

  it('INERTNESS: removing the Max HP grant changes no unit\'s damage (nero has no HP→ATK scaler)', () => {
    const patched = withPatchedOverride(NERO, (ov) => {
      for (const slot of ['skill1', 'skill2', 'burst'] as const) {
        const cs = ov[slot];
        if (!cs) continue;
        for (const b of cs.blocks) {
          b.effects = b.effects.filter(
            (e) =>
              !(
                e.kind === 'buff' &&
                (e.stat === 'targetMaxHpPct' || e.stat === 'casterMaxHpPct' || e.stat === 'maxHpPct')
              ),
          );
        }
      }
    });
    const without = runComp({ ...base, overrides: { [NERO]: patched } });
    expect(totals(without)).toEqual(totals(baseRes));
  });
});

describe('nero burst1 — 1104.91% of final ATK as Burst Skill damage (FAITHFUL)', () => {
  /*
   * The only real damage in the whole kit. "Affects the 1 enemy unit(s) with the highest
   * remaining HP" is single-target selection against a single-boss fight — it resolves to the
   * boss, so the target clause carries no modeling content here.
   *
   * Two discriminators that matter:
   *  (a) It lands in the BURST bucket, not the skill bucket.
   *  (b) Burst-cast damage lands BEFORE the Full Burst window opens, so it must NOT take the
   *      +50% Full Burst major (schema rule 9: burst-cast/instant damage is always FB-exempt).
   *      The nearest-wrong model is an FB-boosted burst nuke, worth ~50% on her single largest
   *      damage source.
   */
  const burstHits = neroDamages.filter((e) => e.bucket === 'burst');

  it('emits one burst-bucket hit per burst cast', () => {
    const casts = baseEvents.filter(
      (e) => e.kind === 'burstCast' && (e.slot === neroIdx || e.srcSlot === neroIdx),
    );
    expect(burstHits.length).toBe(casts.length);
    expect(burstHits.length).toBeGreaterThanOrEqual(2);
  });

  it('the burst hit carries the 1104.91% coefficient', () => {
    for (const h of burstHits) {
      const atkPct = (h.mult as Record<string, number>)?.atkPct;
      if (atkPct != null) expect(Math.abs(atkPct - 1104.91)).toBeLessThan(0.01);
    }
  });

  it('burst damage does NOT take the +50% Full Burst major (it lands pre-FB)', () => {
    for (const h of burstHits) {
      expect(h.fbMajorApplied).toBeFalsy();
    }
  });

  it('burst damage is not core-flagged (the kit says no core strike)', () => {
    for (const h of burstHits) {
      expect((h.coreRate as number) ?? 0).toBe(0);
    }
  });

  it('DISCRIMINATING: halving the burst coefficient measurably drops nero\'s total', () => {
    const patched = withPatchedOverride(NERO, (ov) => {
      for (const b of ov.burst!.blocks) {
        for (const e of b.effects) {
          if (e.kind === 'flatDamage' && Math.abs(e.atkPct - 1104.91) < 0.01) e.atkPct = 552.455;
        }
      }
    });
    const halved = runComp({ ...base, overrides: { [NERO]: patched } });
    expect(totals(halved)[NERO]).toBeLessThan(totals(baseRes)[NERO]);
  });

  it('INERTNESS: nero\'s burst damage moves no teammate\'s total', () => {
    const patched = withPatchedOverride(NERO, (ov) => {
      for (const b of ov.burst!.blocks) {
        b.effects = b.effects.filter(
          (e) => !(e.kind === 'flatDamage' && Math.abs(e.atkPct - 1104.91) < 0.01),
        );
      }
    });
    const without = runComp({ ...base, overrides: { [NERO]: patched } });
    const a = totals(baseRes);
    const b = totals(without);
    for (const slug of Object.keys(a)) {
      if (slug === NERO) continue;
      expect(b[slug]).toBe(a[slug]);
    }
  });
});

describe('nero burst2 — Attract: taunts all enemies for 15 sec (GAP)', () => {
  it.skip('GAP: no taunt/aggro primitive exists and the scope-lock boss targets nobody — taunt is unmodelable and damage-neutral', () => {});
});

describe('nero burst3 — Grumpy Cat: incoming healing ▲60.08% for 15 sec (GAP)', () => {
  /*
   * Gated on Cat's Repayment at max stacks (skill1b, ally-heal-fed). Its payload is a HEALING
   * amplifier, and the engine models heals as bare recovery EVENTS with no HP amount — so even
   * if the gate were reachable, a 60.08% multiplier on "no amount" is unobservable. It matters
   * only as the enabler for skill2b's Grumpy-Cat-gated 158.05% rider, which is itself gated on
   * the unavailable "when attacked" trigger.
   */
  it('no incoming-healing amplifier is encoded as a damage-side stat', () => {
    const suspicious = buffApplies.filter(
      (e) => e.casterIdx === neroIdx && Math.abs(((e.value as number) ?? 0) - 60.08) < 0.01,
    );
    expect(suspicious).toHaveLength(0);
  });

  it.skip('GAP: heals carry no HP amount in the engine, so a healing-received multiplier has no observable payload; its only damage-side consumer (skill2b) is itself trigger-gapped', () => {});
});
