import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

/**
 * crust — Crust (RL/Water/Supporter/Burst II), blind kit spec test.
 *
 * KIT (structural read of the prose):
 *
 *   skill1
 *     a) Full-Charge attack while self is in Maillard  -> allies: Maillard Duration +2.5s
 *     b) Full-Charge attack while self is in Blanching  -> allies: Blanching Duration +2.5s
 *     c) after 3 normal (non-Full-Charge) attacks       -> allies: Maillard  = ATK +10% OF THE
 *                                                          SKILL USER'S ATK for 10s; removes Blanching
 *     d) after maintaining 3 Full Charge for >1 sec     -> allies: Blanching = ATK +10% OF THE
 *                                                          SKILL USER'S ATK for 10s; removes Maillard
 *
 *   skill2
 *     a) after 3 normal non-Full-Charge attacks         -> allies NOT in Reliable Cooking:
 *                                                          Reliable Cooking = DEF +10% of user's DEF
 *                                                          for 10s; removes 1 debuff
 *     b) after maintaining 3 Full Charge for >=1 sec    -> same Reliable Cooking grant
 *     c) on ENTERING FULL BURST, to all targets in
 *        Maillard or Blanching status                   -> ATK +20% of the skill user's ATK for 10s
 *
 *   burst
 *     a) all allies                                     -> Attack Damage +20% for 10s
 *     b) allies in Maillard status                      -> Distributed Damage +60% for 10s
 *     c) allies in Blanching status                     -> Sustained Damage +10% for 10s
 *
 * FIXTURE: controlComp('crust', true) — Crust is Burst II, so the control comp's B1/B2/B3 slots
 * are what make bursts cast at all; the carry slot is Crust and the fixed B3 stays enabled so a
 * full chain (and therefore Full Burst entry, which skill2c keys on) actually happens.
 * Deterministic: no seed is passed anywhere in this file.
 *
 * WHY THE ASSERTIONS DISCRIMINATE — the traps this kit is shaped to hide:
 *
 *  1. CASTER-SCALED vs PLAIN PERCENT. Every ATK line here says "x% OF THE SKILL USER'S ATK",
 *     i.e. casterAtkPct (flat-resolved at apply time to (value/100) x crust.staticAtk), NOT the
 *     self-scaling atkPct. The nearest-wrong model is atkPct 10 / atkPct 20; under that model the
 *     emitted buffApply value is the raw percentage (10 / 20) rather than a flat ATK number, and a
 *     high-ATK ally gets MORE than Crust's own contribution instead of the same flat add. The
 *     value-magnitude assertions below fail under the atkPct model.
 *
 *  2. STATUS MUTUAL EXCLUSION. Maillard and Blanching each REMOVE the other. Two blocks that both
 *     grant a bare team ATK buff with no exclusion are the nearest-wrong model and would let both
 *     stack; the engine has no named-ally-status primitive, so this is a GAP (see below) rather
 *     than something I can assert green.
 *
 *  3. TRIGGER IDENTITY on skill2c. "Activates when entering Full Burst" is fullBurstEnter (fires
 *     on ANY team Full Burst), NOT burstCast (fires only on rotations Crust herself bursts). With
 *     a multi-burst control comp those two diverge, so the test asserts the count of the 20% ATK
 *     grant tracks Full Burst ENTRIES, and fails under a burstCast-keyed model.
 *
 *  4. TARGET SET. Every block says "Affects all allies" / "all targets in <status>" — team-wide
 *     INCLUDING self, never self-only and never excludeSelf. The nearest-wrong model is
 *     target {kind:'self'}; the distinct-target-count assertions fail under it.
 *
 *  5. DEF IS INERT FOR DAMAGE. skill2a/b grant DEF (defPct) — per the schema, self DEF does not
 *     affect own damage in v1. It is still MODELED (kit completeness / future consumer), and the
 *     inertness assertion pins that removing it moves NO damage, so nobody later "fixes" it into
 *     a damage source.
 */

const SLUG = 'crust';

function run(opts: ReturnType<typeof controlComp>) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...opts,
    cfg: { ...(opts.cfg ?? {}), onEvent: (ev: SimEvent) => events.push(ev) },
  });
  return { res, events };
}

// ---- hoisted runs (each is a full 180s sim; keep the file cheap) ----------

const base = run(controlComp(SLUG, true));

const baseTotals = totals(base.res);
const crustAtk = unitOf(base.res, SLUG).staticAtk;

const buffApplies = base.events.filter(
  (e) => e.kind === 'buffApply'
) as Extract<SimEvent, { kind: 'buffApply' }>[];

// Crust-cast buffs only: boss-held debuffs carry casterIdx === null, and other units in the
// control comp cast their own buffs. Identify Crust's slot from her own damage events.
const _crustSlot = (
  base.events.filter((e) => e.kind === 'damage') as Extract<
    SimEvent,
    { kind: 'damage' }
  >[]
).find((e) => e.srcSlot !== undefined && unitOf(base.res, SLUG))?.srcSlot;

const byCrust = buffApplies.filter(
  (e) => e.casterIdx !== null && e.targetIdx !== null
);

const fbEnters = base.events.filter((e) => e.kind === 'fullBurstStart');
const crustBurstCasts = base.events.filter((e) => e.kind === 'burstCast');

// ---- counterfactual overrides --------------------------------------------

// Nearest-wrong for the caster-scaling question: model the ATK lines as plain self-scaling atkPct.
const asPlainAtkPct = withPatchedOverride(SLUG, (ov) => {
  for (const slot of ['skill1', 'skill2', 'burst'] as const) {
    for (const b of ov[slot] ?? []) {
      for (const eff of b.effects) {
        if (eff.kind === 'buff' && eff.stat === 'casterAtkPct') {
          (eff as { stat: string }).stat = 'atkPct';
        }
      }
    }
  }
});

// Nearest-wrong for the target-set question: scope every ally buff to self.
const asSelfOnly = withPatchedOverride(SLUG, (ov) => {
  for (const slot of ['skill1', 'skill2', 'burst'] as const) {
    for (const b of ov[slot] ?? []) {
      if (b.target.kind === 'allies') {
        b.target = { kind: 'self' };
      }
    }
  }
});

// Nearest-wrong for skill2c's trigger identity: re-key FB-enter to burst-cast.
const asBurstCast = withPatchedOverride(SLUG, (ov) => {
  for (const b of ov.skill2 ?? []) {
    if (b.trigger.kind === 'fullBurstEnter') {
      b.trigger = { kind: 'burstCast' };
    }
  }
});

// Strip the burst's Attack Damage line (burst a) — isolates its damage footprint.
const noBurstAttackDamage = withPatchedOverride(SLUG, (ov) => {
  for (const b of ov.burst ?? []) {
    b.effects = b.effects.filter(
      (e) => !(e.kind === 'buff' && e.stat === 'attackDamagePct')
    );
  }
});

// Strip the DEF grant (skill2 a/b) — must be damage-inert.
const noDef = withPatchedOverride(SLUG, (ov) => {
  for (const slot of ['skill1', 'skill2', 'burst'] as const) {
    for (const b of ov[slot] ?? []) {
      b.effects = b.effects.filter(
        (e) => !(e.kind === 'buff' && e.stat === 'defPct')
      );
    }
  }
});

// Strip the skill2c FB-enter ATK grant — isolates its damage footprint.
const noFbEnterAtk = withPatchedOverride(SLUG, (ov) => {
  if (ov.skill2) {
    ov.skill2 = ov.skill2.filter((b) => b.trigger.kind !== 'fullBurstEnter');
  }
});

const runPatched = (patched: unknown) =>
  run({
    ...controlComp(SLUG, true),
    overrides: { [SLUG]: patched },
  } as ReturnType<typeof controlComp>);

const plainAtkRun = runPatched(asPlainAtkPct);
const selfOnlyRun = runPatched(asSelfOnly);
const burstCastRun = runPatched(asBurstCast);
const noBurstAdRun = runPatched(noBurstAttackDamage);
const noDefRun = runPatched(noDef);
const noFbEnterAtkRun = runPatched(noFbEnterAtk);

// ==========================================================================

describe('crust — fixture sanity (non-vacuity)', () => {
  it('Crust is in the comp and deals damage', () => {
    expect(baseTotals[SLUG]).toBeGreaterThan(0);
    expect(crustAtk).toBeGreaterThan(0);
  });

  it('the fixture actually reaches Full Burst (skill2c + burst lines are exercised)', () => {
    // A Burst II unit alone never bursts; the control comp supplies the chain. If this is 0 every
    // full-burst-keyed assertion below is vacuous.
    expect(fbEnters.length).toBeGreaterThan(0);
  });

  it('Crust casts her own burst at least once (burst-slot lines are exercised)', () => {
    expect(crustBurstCasts.length).toBeGreaterThan(0);
  });

  it('Crust both full-charges and fires non-full-charge normals (both skill1 branches reachable)', () => {
    // Crust is RL with chargeFrames 60: the fixture must contain shots for the 3-normals branch
    // and charge-flavored damage for the 3-full-charges branch. Without BOTH, skill1 c/d and
    // skill2 a/b are each half-vacuous.
    const shots = base.events.filter((e) => e.kind === 'shot');
    expect(shots.length).toBeGreaterThan(3);
  });
});

describe('crust skill1 c/d — Maillard / Blanching ATK grants are CASTER-scaled and team-wide', () => {
  it('emits ATK grants worth 10% of CRUST\u2019s ATK as a FLAT value, not a raw 10', () => {
    // casterAtkPct flat-resolves to (10/100) x crust.staticAtk at apply time.
    const expected = 0.1 * crustAtk;
    const tenPct = byCrust.filter(
      (e) =>
        e.stat === 'casterAtkPct' &&
        Math.abs(e.value - expected) < expected * 0.02
    );
    expect(tenPct.length).toBeGreaterThan(0);
    // Nearest-wrong (atkPct): the emitted value would be the raw percentage 10, not ~0.1 x ATK.
    expect(expected).toBeGreaterThan(100);
  });

  it('the 10% ATK grant reaches EVERY ally, not just Crust (target = all allies)', () => {
    const expected = 0.1 * crustAtk;
    const targets = new Set(
      byCrust
        .filter(
          (e) =>
            e.stat === 'casterAtkPct' &&
            Math.abs(e.value - expected) < expected * 0.02
        )
        .map((e) => e.targetSlug)
    );
    expect(targets.size).toBeGreaterThan(1);
    expect(targets.has(SLUG)).toBe(true);
  });

  it('is worth real damage: self-only scoping strictly lowers TEAM damage', () => {
    const sum = (t: Record<string, number>) =>
      Object.values(t).reduce((a, b) => a + b, 0);
    expect(sum(totals(selfOnlyRun.res))).toBeLessThan(sum(baseTotals));
  });

  it('plain-atkPct model is DISTINGUISHABLE (nearest-wrong moves the board)', () => {
    // If this were equal, the caster-scaling assertion above would be untestable through damage.
    expect(totals(plainAtkRun.res)[SLUG]).not.toBe(baseTotals[SLUG]);
  });

  it('grants a 10 sec window (durationSec semantics, not rounds/stacks)', () => {
    const expected = 0.1 * crustAtk;
    const ev = byCrust.find(
      (e) =>
        e.stat === 'casterAtkPct' &&
        Math.abs(e.value - expected) < expected * 0.02
    );
    expect(ev).toBeDefined();
    // "for 10 sec" is wall-clock, so a finite expiresFrame must exist and durationShots must NOT.
    expect(ev!.expiresFrame).toBeDefined();
    expect(ev!.durationShots).toBeUndefined();
  });
});

describe('crust skill2 a/b — Reliable Cooking DEF grant is modeled and damage-INERT', () => {
  it('grants DEF to allies (kit completeness: the line is present, not dropped)', () => {
    const defGrants = byCrust.filter((e) => e.stat === 'defPct');
    expect(defGrants.length).toBeGreaterThan(0);
    const targets = new Set(defGrants.map((e) => e.targetSlug));
    expect(targets.size).toBeGreaterThan(1);
  });

  it('moves ZERO damage for anyone (defPct is inert in v1 — per-slug byte-identical)', () => {
    // Nearest-wrong: someone models DEF as a damage source (or as atkPct by copy-paste). Then this
    // strip-the-DEF counterfactual would change totals.
    expect(totals(noDefRun.res)).toEqual(baseTotals);
  });
});

describe('crust skill2 c — the +20% ATK grant keys on FULL BURST ENTRY, not on Crust\u2019s burst cast', () => {
  it('emits a 20%-of-Crust-ATK flat grant', () => {
    const expected = 0.2 * crustAtk;
    const hits = byCrust.filter(
      (e) =>
        e.stat === 'casterAtkPct' &&
        Math.abs(e.value - expected) < expected * 0.02
    );
    expect(hits.length).toBeGreaterThan(0);
  });

  it('fires once per FULL BURST entry, matching the fullBurstStart count', () => {
    const expected = 0.2 * crustAtk;
    const applyFrames = new Set(
      byCrust
        .filter(
          (e) =>
            e.stat === 'casterAtkPct' &&
            Math.abs(e.value - expected) < expected * 0.02
        )
        .map((e) => e.frame)
    );
    // fullBurstEnter fires on ANY team Full Burst; burstCast would fire on Crust's casts only.
    expect(applyFrames.size).toBe(fbEnters.length);
  });

  it('the burstCast-keyed nearest-wrong model produces a DIFFERENT board', () => {
    expect(totals(burstCastRun.res)[SLUG]).not.toBe(baseTotals[SLUG]);
  });

  it('is load-bearing: removing it lowers team damage (non-vacuous)', () => {
    const sum = (t: Record<string, number>) =>
      Object.values(t).reduce((a, b) => a + b, 0);
    expect(sum(totals(noFbEnterAtkRun.res))).toBeLessThan(sum(baseTotals));
  });
});

describe('crust burst a — Attack Damage +20% for 10s, all allies', () => {
  it('emits attackDamagePct 20 as a RAW percentage (plain stat, not caster-scaled)', () => {
    const hits = byCrust.filter(
      (e) => e.stat === 'attackDamagePct' && e.value === 20
    );
    expect(hits.length).toBeGreaterThan(0);
  });

  it('reaches every ally including Crust', () => {
    const targets = new Set(
      byCrust
        .filter((e) => e.stat === 'attackDamagePct' && e.value === 20)
        .map((e) => e.targetSlug)
    );
    expect(targets.size).toBeGreaterThan(1);
    expect(targets.has(SLUG)).toBe(true);
  });

  it('fires on CRUST\u2019S OWN burst cast (burst-slot trigger identity), not on every Full Burst', () => {
    const frames = new Set(
      byCrust
        .filter((e) => e.stat === 'attackDamagePct' && e.value === 20)
        .map((e) => e.frame)
    );
    expect(frames.size).toBe(crustBurstCasts.length);
  });

  it('is worth real team damage (removing it strictly lowers the board)', () => {
    const sum = (t: Record<string, number>) =>
      Object.values(t).reduce((a, b) => a + b, 0);
    expect(sum(totals(noBurstAdRun.res))).toBeLessThan(sum(baseTotals));
  });
});

describe('crust burst b/c — status-gated Distributed / Sustained buffs', () => {
  it('emits distributedDamagePct 60 when modeled', () => {
    const hits = byCrust.filter(
      (e) => e.stat === 'distributedDamagePct' && e.value === 60
    );
    expect(hits.length).toBeGreaterThan(0);
  });

  it('emits sustainedDamagePct 10 when modeled', () => {
    const hits = byCrust.filter(
      (e) => e.stat === 'sustainedDamagePct' && e.value === 10
    );
    expect(hits.length).toBeGreaterThan(0);
  });

  it('does NOT emit a generic attackDamagePct for the status-gated lines (scope trap)', () => {
    // Nearest-wrong: fold the 60% Distributed / 10% Sustained into the generic Damage-Up bucket,
    // which would over-credit every damage flavor instead of only distributed/sustained hits.
    const generic = byCrust.filter(
      (e) => e.stat === 'attackDamagePct' && (e.value === 60 || e.value === 10)
    );
    expect(generic.length).toBe(0);
  });

  it('teammate inertness: the Distributed/Sustained lines never move a unit with no such damage', () => {
    // Any ally whose damage is entirely normal-attack flavored must be byte-identical between the
    // base run and a run with the two status-gated buffs stripped.
    const noFlavor = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.burst ?? []) {
        b.effects = b.effects.filter(
          (e) =>
            !(
              e.kind === 'buff' &&
              (e.stat === 'distributedDamagePct' ||
                e.stat === 'sustainedDamagePct')
            )
        );
      }
    });
    const r = runPatched(noFlavor);
    const after = totals(r.res);
    // At least one unit must be unchanged (proves the buffs are flavor-scoped, not global).
    const unchanged = Object.keys(baseTotals).filter(
      (s) => after[s] === baseTotals[s]
    );
    expect(unchanged.length).toBeGreaterThan(0);
  });
});

describe('crust — GAPs (no engine primitive; documented, not silently dropped)', () => {
  it.skip('skill1 a/b: Full-Charge attack extends Maillard/Blanching duration by +2.5s', () => {
    // GAP: there is no ally-side NAMED-STATUS primitive and no duration-EXTENSION effect kind.
    // `targetStatus` is enemy-only (the schema states the target is implicitly the enemy and the
    // engine ignores block.target for it), and buff `refresh` re-applies a full window rather than
    // adding 2.5s. Modeling this as a plain re-apply would OVER-CREDIT (a full 10s refresh instead
    // of +2.5s on the remaining window).
  });

  it.skip('skill1 c/d: Maillard REMOVES Blanching and vice versa (mutual exclusion)', () => {
    // GAP: no effect kind removes a specific named ally buff. Both grants are the same stat
    // (casterAtkPct 10% of Crust ATK) from the same caster slot, so same-caster-slot overwrite
    // happens to keep the magnitude correct by accident — but the STATUS identity that burst b/c
    // and skill2 c gate on is not represented, so the exclusion itself is untestable.
  });

  it.skip('skill2 a/b: "Affects all allies NOT in Reliable Cooking status" (no-refresh gate)', () => {
    // GAP: no target filter for "allies lacking a named status". Since the grant is damage-inert
    // DEF, the mis-scope costs zero damage today — but it would matter if defPct ever gains a
    // consumer.
  });

  it.skip('skill2 a/b: "Removes 1 debuff"', () => {
    // GAP: no debuff-cleanse primitive, and the scope-lock boss applies no ally debuffs, so there
    // is nothing to cleanse. Unobservable payload in v1.
  });

  it.skip('skill2 c / burst b/c: status gating on Maillard / Blanching membership', () => {
    // GAP: the gate needs ally-held named statuses (see above). The nearest available primitive,
    // requiresTargetStatus, gates on a BOSS status, which is the wrong entity. Modeling the buffs
    // as ungated is the only option and OVER-CREDITS whenever the status is genuinely absent —
    // this must be stated in the override note, not silently assumed.
  });

  it.skip('skill1 d / skill2 b trigger fidelity: "maintaining 3 Full Charge for >1 sec"', () => {
    // \u26d1 The engine has chargeCounter (per-full-charge phase counter) which captures the COUNT of
    // 3 full charges, but not the "held for more than 1 second" dwell qualifier. With Crust's
    // 60-frame charge time the dwell is plausibly always satisfied in practice, but that is a
    // HYPOTHESIS, not a measured fact — flag, do not encode a dwell threshold.
  });

  it.skip('cadence tuple (RL pulls/sec, reloadFrames 141) is datamine-unreliable', () => {
    // \u26d1 ALWAYS-FLAG field. The 3-normal-attacks and 3-full-charges thresholds convert to wall
    // clock through the cadence, so every grant's UPTIME inherits the datamine's error bars.
    // Recipe: read Crust's ammo counter frame-by-frame off a recording to get true shots/sec.
  });
});
