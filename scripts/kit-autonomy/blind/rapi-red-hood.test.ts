/**
 * rapi-red-hood (Rapi: Red Hood) — BLIND per-unit kit spec test.
 *
 * Written from the kit prose ALONE (no sight of the driver's override/tests/reasoning).
 * MG / Fire / Attacker / Burst III. cd 40s, ammo 300, hitsPerShot 1.
 *
 * WHAT THE KIT SAYS (structural read):
 *  skill1 — fires at battle start AND at Full-Burst END; the branch taken depends on a STATIC
 *    squad-formation fact ("no Burst 1 allies" -> Combat Assist / becomes Burst Stage 1;
 *    "there are Burst 1 allies" -> Combat Assist cancelled). Two mutually-exclusive FB-ENTER
 *    riders hang off that state:
 *      - in Combat Assist  -> ALL ALLIES: burst-CD -7.48s, Attack Damage +8.02% / 10s
 *      - not Combat Assist -> SELF:      ATK +95.04% / 10s, Interruption-Part dmg +48% / 10s
 *  skill2 — passive self: elemental advantage vs Electric (boss here is Fire => inert),
 *    Projectile Attachment/Explosion Damage up continuously; and after 120 normal attacks a
 *    projectile ATTACHES (88.11% of final ATK) and EXPLODES on entering Full Burst (88.11%).
 *    Pool capacity 1 round.
 *  burst — stage-1 branch (only reachable in Combat Assist, i.e. a no-B1 squad): self burst-CD
 *    -20s, Explosion Radius +100.62%; all allies ATK +18.01% OF THE CASTER'S ATK / 10s.
 *    stage-3 branch: 2808% of final ATK as additional damage to the nearest enemy, plus self
 *    Explosion Radius / Projectile-Attachment-Damage / threshold-reduction windows.
 *
 * FIXTURE: controlComp(SLUG, /* helm *\/ false) — liter (B1) + crown (B2) + rapi-red-hood (B3).
 *   - helm is DROPPED on purpose: helm is a second Burst III, so she would compete for the B3
 *     slot in the rotation and make "did RRH cast her own burst" non-deterministic. The 2808%
 *     stage-3 line and every burst-keyed assertion below need RRH to be the sole B3.
 *   - liter (B1) is PRESENT, so the squad HAS a Burst 1 ally => Combat Assist is CANCELLED.
 *     This fixture therefore exercises the "not in Combat Assist" half of skill1 and the
 *     stage-3 half of the burst; the Combat-Assist half must be provably INERT (and is proven
 *     non-vacuous by the ungated counterfactual run below).
 *
 * WHY EACH ASSERTION DISCRIMINATES is stated inline per `it`.
 * Runs are hoisted: 5 full 180s sims total.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUG = 'rapi-red-hood';

// ---------------------------------------------------------------- helpers

type AnyEv = SimEvent & Record<string, any>;

function run(overrides?: Record<string, unknown>) {
  const events: AnyEv[] = [];
  const opts = controlComp(SLUG, false) as any;
  opts.cfg = {
    ...(opts.cfg ?? {}),
    onEvent: (ev: SimEvent) => events.push(ev as AnyEv),
  };
  if (overrides) {
    opts.overrides = { ...(opts.overrides ?? {}), ...overrides };
  }
  const res = runComp(opts);
  return { res, events, t: totals(res) };
}

/** every slug in the comp except the unit under test — used for inertness diffs */
function teammates(t: Record<string, number>) {
  return Object.keys(t)
    .filter((s) => s !== SLUG)
    .sort()
    .map((s) => [s, t[s]] as const);
}

function buffs(events: AnyEv[], stat: string, value?: number) {
  return events.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.stat === stat &&
      (value === undefined || Math.abs((e.value as number) - value) < 0.01)
  );
}

function effectsIn(blocks: any[]): any[] {
  return (blocks ?? []).flatMap((b: any) => b.effects ?? []);
}

/** committed override, read-only: withPatchedOverride with a no-op mutator returns the clone */
const OV = withPatchedOverride(SLUG, () => {}) as any;
const ALL_EFFECTS = [
  ...effectsIn(OV.skill1),
  ...effectsIn(OV.skill2),
  ...effectsIn(OV.burst),
];
const UNMODELED_TEXT = JSON.stringify(OV.unmodeled ?? {});

// ---------------------------------------------------------------- hoisted runs

const BASE = run();

// counterfactual 1 — kill the stage-3 burst nuke (2808%)
let nBurstZeroed = 0;
const OV_NO_NUKE = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of ov.burst ?? []) {
    for (const e of b.effects ?? []) {
      if (typeof e.atkPct === 'number' && e.atkPct > 0) {
        e.atkPct = 0;
        nBurstZeroed++;
      }
    }
  }
});
const NO_NUKE = run({ [SLUG]: OV_NO_NUKE });

// counterfactual 2 — kill the whole skill2 projectile channel (attachment + explosion)
let nProjZeroed = 0;
const OV_NO_PROJ = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of ov.skill2 ?? []) {
    for (const e of b.effects ?? []) {
      if (typeof e.atkPct === 'number' && e.atkPct > 0) {
        e.atkPct = 0;
        nProjZeroed++;
      }
    }
  }
});
const NO_PROJ = run({ [SLUG]: OV_NO_PROJ });

// counterfactual 3 — strip the formation gate off skill1 so the Combat-Assist branch fires too.
// This is the NON-VACUITY proof for every "Combat Assist is inert here" assertion.
let nFormationStripped = 0;
const OV_UNGATED = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of ov.skill1 ?? []) {
    if (b.formation) {
      delete b.formation;
      nFormationStripped++;
    }
  }
});
const UNGATED = run({ [SLUG]: OV_UNGATED });

// counterfactual 4 — zero the 95.04% self ATK buff (target-scope + magnitude discriminator)
let nAtkZeroed = 0;
const OV_NO_ATK = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of ov.skill1 ?? []) {
    for (const e of b.effects ?? []) {
      if (
        e.kind === 'buff' &&
        e.stat === 'atkPct' &&
        Math.abs(e.value - 95.04) < 0.01
      ) {
        e.value = 0;
        nAtkZeroed++;
      }
    }
  }
});
const NO_ATK = run({ [SLUG]: OV_NO_ATK });

const FB_STARTS = BASE.events.filter((e) => e.kind === 'fullBurstStart').length;

// ---------------------------------------------------------------- fixture sanity

describe('rapi-red-hood — fixture non-vacuity', () => {
  it('the comp actually reaches Full Burst and RRH deals damage', () => {
    // Every skill1/burst assertion below keys off Full Burst. A lone B3 makes ZERO full
    // bursts; liter (B1) + crown (B2) are what make this fixture non-vacuous.
    expect(FB_STARTS).toBeGreaterThanOrEqual(2);
    expect(unitOf(BASE.res, SLUG).totalDamage).toBeGreaterThan(0);
  });

  it('RRH is the only Burst III in the fixture (helm dropped)', () => {
    expect(Object.keys(BASE.t)).not.toContain('helm');
  });
});

// ---------------------------------------------------------------- skill1

describe('rapi-red-hood skill1 — formation-gated Combat Assist', () => {
  it('both formation branches are encoded as static squad gates', () => {
    // "Affects self if there are no Burst 1 allies" / "...if there are Burst 1 allies" is a
    // STATIC squad fact, not a runtime trigger. Nearest-wrong: one ungated block that always
    // fires (over-credits the team in a hasB1 comp AND the self branch in a noB1 comp).
    const gates = (OV.skill1 ?? [])
      .map((b: any) => b.formation)
      .filter(Boolean);
    expect(gates).toContain('noB1');
    expect(gates).toContain('hasB1');
  });

  it('with a B1 ally present, the SELF branch fires once per Full Burst entry', () => {
    // "Activates when entering Full Burst while not in Combat Assist status. Affects self.
    //  ATK +95.04% for 10 sec."  liter is B1 => Combat Assist cancelled => this branch is live.
    // Nearest-wrong A: keyed to burstCast (would fire pre-FB / not at all on rotations RRH
    // does not cast). Nearest-wrong B: keyed to fullBurstEnd (count would be off by one).
    const hits = buffs(BASE.events, 'atkPct', 95.04);
    expect(hits.length).toBe(FB_STARTS);
  });

  it('the 95.04% ATK buff is SELF-scoped, not an ally buff', () => {
    // Target-set question. Nearest-wrong: target {kind:'allies'} — would show teammate slugs
    // here and would move teammate totals in the zeroed counterfactual below.
    for (const e of buffs(BASE.events, 'atkPct', 95.04)) {
      expect(e.targetSlug).toBe(SLUG);
    }
  });

  it('zeroing the 95.04% buff lowers ONLY RRH (self-scope, second method)', () => {
    expect(nAtkZeroed).toBeGreaterThan(0); // the patch found its target
    expect(NO_ATK.t[SLUG]).toBeLessThan(BASE.t[SLUG]);
    expect(teammates(NO_ATK.t)).toEqual(teammates(BASE.t)); // byte-identical teammates
  });

  it('the Combat-Assist ally rider is INERT in a squad that has a B1', () => {
    // "in Combat Assist -> all allies: Attack Damage +8.02% / 10s". RRH is NOT in Combat
    // Assist here, so this must never apply. Nearest-wrong: dropping the formation gate.
    expect(buffs(BASE.events, 'attackDamagePct', 8.02).length).toBe(0);
  });

  it('...and that inertness is NOT vacuous — ungating the branch makes it appear', () => {
    expect(nFormationStripped).toBeGreaterThan(0);
    expect(
      buffs(UNGATED.events, 'attackDamagePct', 8.02).length
    ).toBeGreaterThan(0);
  });

  it('the Combat-Assist branch carries the 7.48s burst-CD reduction', () => {
    // "Cooldown of Burst Skill -7.48 sec" — a burstCdr EFFECT (no buffApply event), so this is
    // asserted structurally. Nearest-wrong: dropped as "defensive/utility" (it is a real
    // rotation-rate change) or mis-signed.
    const cdr = ALL_EFFECTS.filter(
      (e: any) => e.kind === 'burstCdr' && Math.abs(e.seconds - 7.48) < 0.01
    );
    expect(cdr.length).toBeGreaterThan(0);
  });

  it('Damage to Interruption Parts +48% is modeled or explicitly recorded (no silent drop)', () => {
    // partsDamagePct is inert in v1 (partless boss) but must not vanish silently.
    const asStat = ALL_EFFECTS.some(
      (e: any) => e.stat === 'partsDamagePct' && Math.abs(e.value - 48) < 0.01
    );
    expect(asStat || /Interruption/i.test(UNMODELED_TEXT)).toBe(true);
  });
});

// ---------------------------------------------------------------- skill2

describe('rapi-red-hood skill2 — attachable projectiles', () => {
  it('elemental advantage vs Electric is modeled and inert vs the Fire boss', () => {
    // "Applies Elemental Advantage damage to Electric Code enemies continuously."
    // Nearest-wrong: a flat elementDamagePct that would pay out against ANY boss.
    const adv = ALL_EFFECTS.some(
      (e: any) =>
        e.kind === 'advantageVs' &&
        String(e.element).toLowerCase() === 'electric'
    );
    expect(adv).toBe(true);
  });

  it('the projectile trigger is a 120-ROUND count, not a timer', () => {
    // "Activates after 120 normal attack(s)" — counts rounds fired (MG, hitsPerShot 1).
    // Nearest-wrong: an interval trigger, which would fire on a wall-clock cadence and
    // decouple the channel from fire rate / reloads entirely.
    const t120 = (OV.skill2 ?? []).some(
      (b: any) => (b.trigger ?? {}).count === 120
    );
    expect(t120).toBe(true);
  });

  it('the projectile channel actually pays out damage', () => {
    const s2 = BASE.events.filter(
      (e) => e.kind === 'damage' && e.srcSlot === 'skill2'
    );
    expect(s2.length).toBeGreaterThan(0);
  });

  it('ATTACHMENT damage lands on the 120th round, before the first Full Burst', () => {
    // The kit gives attachment its OWN damage line (88.11% of final ATK) separate from the
    // explosion line. An MG at 300 ammo crosses 120 rounds well before the first FB.
    // Nearest-wrong: folding both 88.11% lines into a single FB-entry release — that model
    // has NO skill2 damage before the first fullBurstStart, so this assertion goes RED.
    const firstFb = BASE.events.findIndex((e) => e.kind === 'fullBurstStart');
    expect(firstFb).toBeGreaterThan(-1);
    const before = BASE.events
      .slice(0, firstFb)
      .some((e) => e.kind === 'damage' && e.srcSlot === 'skill2');
    expect(before).toBe(true);
  });

  it('EXPLOSION damage lands after a Full Burst has opened', () => {
    // "When entering Full Burst, the projectiles explode." Nearest-wrong: releasing the stored
    // charge on the accrual trigger (no FB dependency at all).
    const firstFb = BASE.events.findIndex((e) => e.kind === 'fullBurstStart');
    const after = BASE.events
      .slice(firstFb)
      .some((e) => e.kind === 'damage' && e.srcSlot === 'skill2');
    expect(after).toBe(true);
  });

  it('the projectile pool caps at 1 round (no unbounded stacking)', () => {
    // "Max Ammunition Capacity: 1 round(s)" — at most one stored projectile, so at most one
    // explosion per Full Burst. Nearest-wrong: charges accumulating across the whole fight and
    // dumping N-at-once into a late FB.
    const stored = ALL_EFFECTS.filter(
      (e: any) => typeof e.charges === 'number'
    );
    for (const e of stored) {
      expect(e.charges).toBeLessThanOrEqual(1);
    }
  });

  it('the projectile damage magnitude is at least the kit base of 88.11%', () => {
    // Either the raw 88.11% with the continuous +150.72% / +100.6% modeled separately, or a
    // baked value >= 88.11 (the schema has no projectile-damage StatKey — see gaps). A value
    // BELOW 88.11 means the base line was mis-transcribed.
    const proj = effectsIn(OV.skill2).filter(
      (e: any) => typeof e.atkPct === 'number' && e.atkPct > 0
    );
    expect(proj.length).toBeGreaterThan(0);
    for (const e of proj) {
      expect(e.atkPct).toBeGreaterThanOrEqual(88.11 - 0.01);
    }
  });

  it('zeroing the projectile channel lowers ONLY RRH', () => {
    expect(nProjZeroed).toBeGreaterThan(0);
    expect(NO_PROJ.t[SLUG]).toBeLessThan(BASE.t[SLUG]);
    expect(teammates(NO_PROJ.t)).toEqual(teammates(BASE.t));
  });
});

// ---------------------------------------------------------------- burst

describe('rapi-red-hood burst — stage-3 branch', () => {
  it('the 2808% additional-damage line is encoded', () => {
    const nuke = effectsIn(OV.burst).some(
      (e: any) => typeof e.atkPct === 'number' && Math.abs(e.atkPct - 2808) < 1
    );
    expect(nuke).toBe(true);
  });

  it('the burst nuke moves ONLY RRH', () => {
    // "Affects the enemy nearest to the crosshair. Deals 2808% of final ATK as additional
    // damage." Target set is the enemy, so no ally total may move.
    expect(nBurstZeroed).toBeGreaterThan(0);
    expect(NO_NUKE.t[SLUG]).toBeLessThan(BASE.t[SLUG]);
    expect(teammates(NO_NUKE.t)).toEqual(teammates(BASE.t));
  });

  it('the stage-1 branch exists but is INERT in a squad with a B1', () => {
    // "When used in Stage 1" is only reachable via Combat Assist (no-B1 squad). liter is B1,
    // so RRH stays Burst III and the stage-1 ATK grant (+18.01% OF THE CASTER'S ATK, all
    // allies) must never apply. Nearest-wrong: an ungated ally ATK grant that pays out in
    // every comp. Non-vacuity: the 95.04% self buff fires above, which is the mutually
    // exclusive not-in-Combat-Assist branch — so the fixture demonstrably resolves the gate.
    const stage1 = (OV.burst ?? []).filter(
      (b: any) =>
        (b.trigger ?? {}).stage === 1 || b.formation === 'noB1' || b.mode
    );
    expect(stage1.length).toBeGreaterThan(0);
    const flatFromCaster = BASE.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.stat === 'casterAtkPct' &&
        e.targetSlug !== undefined &&
        e.casterIdx !== null &&
        e.targetSlug !== SLUG
    );
    // no caster-scaled ATK grant sourced from RRH's stage-1 branch reaches an ally here
    expect(
      flatFromCaster.filter(
        (e) =>
          Math.abs(e.value as number) > 0 &&
          e.key &&
          /18\.01|stage1|squadSupport/i.test(String(e.key))
      ).length
    ).toBe(0);
  });

  it('the 20s stage-1 burst-CD reduction is recorded', () => {
    const cdr = effectsIn(OV.burst).some(
      (e: any) => e.kind === 'burstCdr' && Math.abs(e.seconds - 20) < 0.01
    );
    expect(cdr).toBe(true);
  });

  it('Explosion Radius +100.62% is explicitly recorded as unmodeled (no silent drop)', () => {
    // No StatKey expresses explosion radius and the sim has no spatial model — it must live in
    // `unmodeled`, not disappear.
    expect(/Explosion Radius/i.test(UNMODELED_TEXT)).toBe(true);
  });

  // GAP — no primitive exists for a scoped "Projectile Attachment Damage" multiplier. The
  // continuous skill2 lines (+150.72% / +100.6%) can be baked into the stored-hit atkPct, but
  // the burst's +421.2% is a 10-SECOND window and cannot be baked without over-crediting the
  // whole fight. Needs a projectileAttachmentDamagePct StatKey (or a flavor-scoped Damage-Up
  // bucket) before it can be asserted.
  it.skip('burst: Projectile Attachment Damage +421.2% for 10 sec [GAP: no flavor-scoped StatKey]', () => {});

  // GAP — "Skill 2's requirement for triggering attachable projectiles -60 for 10 sec" mutates
  // a TRIGGER THRESHOLD (120 -> 60) for a window. No primitive scales a trigger's `count`; the
  // nearest expressible model (a second block at count 60, time-gated) does not exist in the
  // schema either. Modeling it as a permanently-lower threshold would over-credit.
  it.skip('burst: skill2 trigger requirement -60 for 10 sec [GAP: no trigger-threshold primitive]', () => {});
});
