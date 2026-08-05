import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

/*
 * emma — Emma (MG/Fire/Supporter/Burst I), blind spec test written from kit prose alone.
 *
 * KIT (verbatim structure, quoted short):
 *   skill1: "■ There is a 5% chance to activate when attacked. Affects all allies."
 *           "Recovers 10.77% of the skill user's final Max HP as HP."
 *   skill2: "■ Activates when above 90% HP. Affects all allies."
 *           "Incoming healing ▲ 13.33% continuously."
 *   burst:  "■ Affects all allies."
 *           "Recover HP equal to 39.6% of the skill user's final Max HP."
 *           "Recover 39.6% of attack damage as HP over 5 sec."
 *
 * WHOLE-KIT READ: Emma is a pure sustain unit. Every single line is a HEAL or a
 * heal-amplifier. There is NO damage line, NO ATK/crit/core/element buff, NO weapon-state
 * modifier (no reload/ammo/fire-rate/charge/swap), and NO boss debuff anywhere in the kit.
 * The ONLY sim-relevant payload is the `heal` effect's RECOVERY EVENT, which fires teammates'
 * `recovery` triggers (the tandem/cross-unit rule: a heal inert alone can drive an ally's
 * "on recovery" damage buff — Crown is the canonical consumer). The HP amounts themselves are
 * unmodeled by design (v1 has no HP pool; the boss deals no damage).
 *
 * FIXTURE: controlComp('emma', true) — the standard control comp. Emma is Burst I, so she
 * occupies the B1 slot herself; the fixture still supplies the B2 + B3 units needed for the
 * chain to complete, so her burst actually casts and Full Bursts actually happen. Deterministic
 * (no seed), so event logs and totals are byte-comparable across runs.
 *
 * WHY THE ASSERTIONS DISCRIMINATE — the nearest-wrong models this file is built to fail under:
 *   (a) skill1 keyed to `passive` or `shotFired` instead of a proc that cannot fire at scope
 *       lock. "when attacked" is a DEFENSIVE trigger; the scope-lock boss deals no damage to
 *       the team, so the condition is NEVER satisfied. Encoding it as an always-on/per-shot
 *       recovery emitter would spray recovery events across the whole fight and over-credit any
 *       on-recovery consumer by orders of magnitude. Asserted as an EVENT-COUNT bound, and
 *       discriminated against a patched `passive`+`heal` counterfactual.
 *   (b) burst line 1 keyed to fullBurstEnter instead of burstCast. Trigger identity: the block
 *       lives in Emma's OWN burst slot with no "entering Full Burst" clause, so it is a
 *       burst-cast effect — it fires on rotations EMMA bursts, not on any team Full Burst.
 *       Discriminated by comparing recovery-event frames against burstCast frames.
 *   (c) burst line 2 ("over 5 sec") collapsed into a single instant heal. It is a heal-over-time:
 *       under the `heal` effect's ticks/intervalSec contract it must emit MULTIPLE recovery
 *       events spread over a 5s window, because each tick is what keeps an on-recovery consumer
 *       refreshed. One event = a wrong duty cycle for every downstream consumer.
 *   (d) skill2 "Incoming healing ▲" mis-encoded as a generic offensive stat (attackDamagePct /
 *       atkPct). Scope: it modifies HEALING RECEIVED, not damage. There is no incoming-healing
 *       StatKey in the schema and no HP pool to amplify, so it is a GAP — and critically it must
 *       be OFFENSIVELY INERT. Asserted by comparing Emma's comp against a variant with her whole
 *       skill2 emptied: total damage must be byte-identical for EVERY unit.
 *   (e) any line silently granting damage. A whole-kit inertness assertion pins that no buffApply
 *       Emma casts carries an offensive stat.
 *
 * NON-VACUITY: the fixture is asserted to actually exercise the active case — Emma casts her
 * burst at least twice and at least one Full Burst occurs — before any "fires on burst" claim is
 * read. Without that, an assertion that "recoveries only happen at burst frames" would pass
 * trivially on an empty log.
 *
 * RUN BUDGET: 4 full 180s sims, all hoisted to module scope.
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

const SLUG = 'emma';

// ---- hoisted runs -------------------------------------------------------

// 1. Baseline: Emma with her committed override.
const base = run(controlComp(SLUG, true));

// 2. Counterfactual: Emma's skill2 stripped to nothing. If skill2 is faithfully
//    modeled as an offensively-inert heal-amplifier (or an honest GAP), removing it
//    cannot move a single damage number.
const noSkill2Ov = withPatchedOverride(SLUG, (ov) => {
  if (ov.skill2) ov.skill2.blocks = [];
});
const noSkill2 = run({
  ...controlComp(SLUG, true),
  overrides: { [SLUG]: noSkill2Ov },
});

// 3. Counterfactual: Emma's skill1 stripped. "5% chance when attacked" cannot fire at
//    scope lock (the boss deals no damage), so removing it must also be damage-inert AND
//    must not remove any recovery events — there should be none to remove.
const noSkill1Ov = withPatchedOverride(SLUG, (ov) => {
  if (ov.skill1) ov.skill1.blocks = [];
});
const noSkill1 = run({
  ...controlComp(SLUG, true),
  overrides: { [SLUG]: noSkill1Ov },
});

// 4. Nearest-wrong for skill1: the same heal re-keyed to a `passive` trigger — the mis-read
//    that treats a defensive proc as an always-on emitter. This MUST produce a materially
//    different recovery-event profile than the faithful model; if it doesn't, the baseline is
//    already spraying recoveries.
const passiveS1Ov = withPatchedOverride(SLUG, (ov) => {
  if (ov.skill1) {
    ov.skill1.blocks = [
      {
        slot: 'skill1',
        trigger: { kind: 'passive' },
        target: { kind: 'allies' },
        effects: [{ kind: 'heal', ticks: 1 }],
      },
    ];
  }
});
const passiveS1 = run({
  ...controlComp(SLUG, true),
  overrides: { [SLUG]: passiveS1Ov },
});

// ---- helpers ------------------------------------------------------------

const emmaIdx = (() => {
  const withIdx = base.events.find(
    (e) => e.kind === 'burstCast' && (e as { slug?: string }).slug === SLUG,
  ) as { casterIdx?: number; slot?: number } | undefined;
  return withIdx?.casterIdx ?? withIdx?.slot ?? null;
})();

const burstCastFrames = base.events
  .filter((e) => e.kind === 'burstCast' && (e as { slug?: string }).slug === SLUG)
  .map((e) => Number((e as { frame?: number }).frame ?? 0));

const fullBurstFrames = base.events
  .filter((e) => e.kind === 'fullBurstStart')
  .map((e) => Number((e as { frame?: number }).frame ?? 0));

// recovery events attributable to Emma. The engine's heal effect emits a recovery-flavored
// event; we accept either an explicit 'heal'/'recovery' kind so the assertion does not hinge
// on one spelling, and filter by caster where the field is present.
const emmaRecoveries = base.events.filter((e) => {
  if (e.kind !== 'heal' && e.kind !== 'recovery') return false;
  const caster = (e as { casterIdx?: number | null; casterSlug?: string });
  if (caster.casterSlug !== undefined) return caster.casterSlug === SLUG;
  if (caster.casterIdx !== undefined && caster.casterIdx !== null && emmaIdx !== null) {
    return caster.casterIdx === emmaIdx;
  }
  return true;
});

const recoveryFrames = emmaRecoveries.map((e) => Number((e as { frame?: number }).frame ?? 0));

const OFFENSIVE_STATS = new Set([
  'atkPct',
  'casterAtkPct',
  'highestAllyAtkPct',
  'atkOfMaxHpPct',
  'atkOfCasterMaxHpPct',
  'critRatePct',
  'critRateNormalPct',
  'critDamagePct',
  'coreDamagePct',
  'elementDamagePct',
  'chargeDamagePct',
  'chargeDamageMultPct',
  'attackDamagePct',
  'sustainedDamagePct',
  'sequentialDamagePct',
  'sequentialMultPct',
  'damageTakenPct',
  'trueDamagePct',
  'elemAdvantageDamagePct',
  'extraHitDamagePct',
  'normalAttackPct',
  'maxAmmoPct',
  'maxAmmoFlat',
  'reloadSpeedPct',
  'attackSpeedPct',
  'fireRatePct',
  'chargeSpeedPct',
  'burstGenPct',
  'hitRatePct',
  'pelletCountFlat',
]);

describe('emma — fixture non-vacuity', () => {
  it('the control comp actually casts Emma\'s burst and reaches Full Burst', () => {
    // Without this, every "fires on burst" assertion below would pass on an empty log.
    expect(burstCastFrames.length).toBeGreaterThanOrEqual(2);
    expect(fullBurstFrames.length).toBeGreaterThanOrEqual(2);
  });

  it('Emma is in the comp and deals her own weapon damage', () => {
    const emma = unitOf(base.res, SLUG);
    expect(emma.totalDamage).toBeGreaterThan(0);
  });
});

describe('emma skill1 — "5% chance to activate when attacked" (allies heal)', () => {
  // DISPOSITION: GAP / inert-at-scope. The trigger is DEFENSIVE — it requires the team to be
  // attacked. The scope-lock boss deals no damage to the team and the sim models no incoming
  // damage at all, so the activation condition is never satisfied. There is no "whenAttacked"
  // TriggerDef in the schema, which is consistent with it being unreachable.
  //
  // NEAREST-WRONG: keying it to `passive` (or `shotFired`) so it emits recoveries anyway.
  // That would over-credit any on-recovery consumer massively.

  it('emits no free-running recovery stream (the proc cannot fire at scope lock)', () => {
    // Whatever recoveries exist must be attributable to the burst, not to skill1. Concretely:
    // there must be no recovery in the long stretch before Emma's FIRST burst cast, which is
    // exactly where a mis-keyed passive/per-shot heal would show up.
    const firstBurst = burstCastFrames[0];
    const preBurstRecoveries = recoveryFrames.filter((f) => f < firstBurst);
    expect(preBurstRecoveries).toEqual([]);
  });

  it('removing skill1 entirely changes nothing (it is inert at scope lock)', () => {
    // Damage-inert for every unit...
    expect(totals(noSkill1.res)).toEqual(totals(base.res));
    // ...and it contributes no recovery events either.
    const noS1Recoveries = noSkill1.events.filter(
      (e) => e.kind === 'heal' || e.kind === 'recovery',
    ).length;
    const baseRecoveries = base.events.filter(
      (e) => e.kind === 'heal' || e.kind === 'recovery',
    ).length;
    expect(noS1Recoveries).toBe(baseRecoveries);
  });

  it('DISCRIMINATES against the passive-heal mis-read', () => {
    // The nearest-wrong model sprays a recovery every frame/tick from t=0. If the baseline were
    // already doing that, this counterfactual would be indistinguishable from it.
    const passiveRecoveries = passiveS1.events.filter(
      (e) => e.kind === 'heal' || e.kind === 'recovery',
    ).length;
    const baseRecoveries = base.events.filter(
      (e) => e.kind === 'heal' || e.kind === 'recovery',
    ).length;
    expect(passiveRecoveries).toBeGreaterThan(baseRecoveries);
  });
});

describe('emma skill2 — "Incoming healing ▲ 13.33% continuously" (all allies, >90% HP)', () => {
  // DISPOSITION: GAP. "Incoming healing" amplifies HEALING RECEIVED. There is no incoming-heal
  // StatKey in the schema, no HP pool, and no healing MAGNITUDE modeled (the `heal` effect emits
  // an event, not an amount) — so there is nothing for this to scale. The "above 90% HP" gate is
  // trivially always-true at scope lock (nobody takes damage), so the line is CONTINUOUSLY
  // active and CONTINUOUSLY inert.
  //
  // NEAREST-WRONG: encoding it as a generic offensive stat (attackDamagePct/atkPct 13.33) — a
  // team-wide +13.33% damage buff that the kit never grants. That is the failure this pins.

  it('is offensively inert — removing skill2 moves NO unit\'s damage', () => {
    expect(totals(noSkill2.res)).toEqual(totals(base.res));
  });

  it('grants no offensive stat to anyone', () => {
    const emmaOffensiveBuffs = base.events.filter((e) => {
      if (e.kind !== 'buffApply') return false;
      const b = e as { stat?: string; casterIdx?: number | null; casterSlug?: string };
      if (!b.stat || !OFFENSIVE_STATS.has(b.stat)) return false;
      if (b.casterSlug !== undefined) return b.casterSlug === SLUG;
      if (b.casterIdx !== undefined && b.casterIdx !== null && emmaIdx !== null) {
        return b.casterIdx === emmaIdx;
      }
      return false;
    });
    expect(emmaOffensiveBuffs).toEqual([]);
  });

  it.skip('GAP: "Incoming healing ▲ 13.33%" has no primitive — no incoming-heal StatKey, no HP pool, no heal magnitude modeled. Unobservable payload at scope lock; belongs in `unmodeled.skill2`.', () => {});

  it.skip('GAP: the "above 90% HP" activation gate is unobservable — the sim models no HP loss, so the gate is trivially always-true and has no inactive case to discriminate against.', () => {});
});

describe('emma burst — instant ally heal + 5s heal-over-time (all allies)', () => {
  // Line 1: "Recover HP equal to 39.6% of the skill user's final Max HP." — instant, all allies.
  // Line 2: "Recover 39.6% of attack damage as HP over 5 sec." — a heal-over-TIME window.
  //
  // TRIGGER IDENTITY (the discriminating question): the block sits in Emma's OWN burst slot with
  // NO "entering Full Burst" clause → burstCast, NOT fullBurstEnter. Emma is Burst I, so in this
  // fixture she casts on every rotation and the two frames sit close together — which is exactly
  // why the assertion is written against the burstCast frame ORDERING rather than a count match.
  //
  // TARGET SET: "Affects all allies" — allies INCLUDING self (no "except self" clause).
  //
  // DURATION SEMANTICS: "over 5 sec" is wall-clock, and under the `heal` effect contract a HoT
  // sets ticks:N (intervalSec default 1) so it emits N recovery events across the window. A
  // single instant event is the nearest-wrong model: it gives an on-recovery consumer one refresh
  // instead of five, collapsing the intended duty cycle.

  it('recoveries occur, and every one of them is at or after a burst cast', () => {
    expect(recoveryFrames.length).toBeGreaterThan(0);
    const firstBurst = burstCastFrames[0];
    for (const f of recoveryFrames) {
      expect(f).toBeGreaterThanOrEqual(firstBurst);
    }
  });

  it('the HoT emits MULTIPLE recovery events per burst, spread over ~5 sec', () => {
    // Nearest-wrong: the whole burst modeled as ONE instant heal → exactly one recovery per cast.
    // Faithful: instant heal + a ticking 5s HoT → several, and the last one lands meaningfully
    // after the cast frame.
    const firstBurst = burstCastFrames[0];
    const secondBurst = burstCastFrames[1] ?? Number.POSITIVE_INFINITY;
    const window = recoveryFrames.filter((f) => f >= firstBurst && f < secondBurst);
    expect(window.length).toBeGreaterThan(1);
    // The window must actually STRETCH — a burst of simultaneous events on the cast frame would
    // be a different (also wrong) model.
    const span = Math.max(...window) - Math.min(...window);
    expect(span).toBeGreaterThan(0);
    // "over 5 sec" at 60fps = 300 frames; allow the tick pattern to end anywhere inside it.
    expect(span).toBeLessThanOrEqual(300);
  });

  it('the heal targets ALL allies, not just self', () => {
    // "Affects all allies" with no exclude-self clause. A self-only mis-scope would produce
    // recovery events for exactly one target.
    const targets = new Set(
      emmaRecoveries
        .map((e) => (e as { targetSlug?: string; targetIdx?: number }).targetSlug
          ?? String((e as { targetIdx?: number }).targetIdx ?? ''))
        .filter((t) => t !== ''),
    );
    expect(targets.size).toBeGreaterThan(1);
  });

  it('the burst is damage-inert — Emma\'s kit has no damage line at all', () => {
    // Whole-kit invariant: a pure sustain kit must contribute ZERO burst-bucket damage.
    // If a future edit invents a flatDamage rider to "explain" a board gap, this goes red.
    const emmaBurstDamage = base.events.filter((e) => {
      if (e.kind !== 'damage') return false;
      const d = e as { bucket?: string; srcSlot?: string; srcSlug?: string };
      if (d.srcSlug !== undefined && d.srcSlug !== SLUG) return false;
      return d.srcSlot === 'burst';
    });
    expect(emmaBurstDamage).toEqual([]);
  });

  it.skip('GAP: the healed AMOUNT (39.6% of final Max HP; 39.6% of attack damage) is unobservable — the `heal` effect models no HP quantity, so neither magnitude can be asserted. Both belong in the override note as recorded-for-completeness values.', () => {});
});

describe('emma — whole-kit inertness', () => {
  it('Emma\'s presence changes no teammate\'s damage through any stat channel', () => {
    // Combined counterfactual: with BOTH non-burst skills stripped, the whole board is unmoved.
    // This is the strongest form of the claim — Emma is a sustain unit whose only sim-visible
    // payload is the recovery EVENT (a tandem hook for on-recovery consumers, of which this
    // fixture contains none).
    expect(totals(noSkill1.res)).toEqual(totals(base.res));
    expect(totals(noSkill2.res)).toEqual(totals(base.res));
  });

  it('Emma applies no boss debuff', () => {
    // Boss-held debuffs emit buffApply with casterIdx === null AND targetIdx === null.
    // The kit contains no "Damage Taken ▲" or any enemy-facing line.
    const bossDebuffs = base.events.filter((e) => {
      if (e.kind !== 'buffApply') return false;
      const b = e as { casterIdx?: number | null; targetIdx?: number | null; stat?: string };
      return b.casterIdx === null && b.targetIdx === null && b.stat === 'damageTakenPct';
    });
    expect(bossDebuffs).toEqual([]);
  });

  it('Emma applies no weapon-state modifier (no reload/ammo/fire-rate line in the kit)', () => {
    const weaponStats = new Set([
      'reloadSpeedPct',
      'maxAmmoPct',
      'maxAmmoFlat',
      'fireRatePct',
      'attackSpeedPct',
      'chargeSpeedPct',
    ]);
    const weaponBuffs = base.events.filter((e) => {
      if (e.kind !== 'buffApply') return false;
      const b = e as { stat?: string; casterSlug?: string; casterIdx?: number | null };
      if (!b.stat || !weaponStats.has(b.stat)) return false;
      if (b.casterSlug !== undefined) return b.casterSlug === SLUG;
      if (b.casterIdx !== undefined && b.casterIdx !== null && emmaIdx !== null) {
        return b.casterIdx === emmaIdx;
      }
      return false;
    });
    expect(weaponBuffs).toEqual([]);
  });
});
