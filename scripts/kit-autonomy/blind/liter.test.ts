/**
 * liter - BLIND kit-spec test (S5 post-op author). Written from the kit prose ALONE:
 * no sight of the driver's override, the driver's tests, or any truth file.
 *
 * KIT LINES (structure as read off the prose)
 *  s1-A  header 'Activates when entering Full Burst' + 'Affects all allies'.
 *        Cumulative burst-cooldown reduction, tiered by entry count, and the prose says
 *        'Each subsequent effect triggers all effects before it' => the tiers ADD, they do
 *        NOT replace: entry 1 = -2.34s, entry 2 = -2.34-2.7 = -5.04s, entry 3+ = -8.21s.
 *  s1-B  header 'Activates when using Burst Skill' + 'Affects all allies'. Cumulative again,
 *        every tier 'for 5 sec': cast 1 = Max Ammunition +45.17%; cast 2 = that PLUS Critical
 *        Damage +12.46%; cast 3 and later = that PLUS ATK +14.42%.
 *  s2    'Affects 2 ally unit(s) with the lowest remaining cover HP' / 'Restores 52.5% of Cover HP.'
 *  burst 'Affects all allies.' / 'ATK 66% for 5 sec.'
 *
 * FIXTURE
 *  controlComp('rapi-red-hood', true). liter OCCUPIES THE B1 SLOT OF controlComp BY
 *  CONSTRUCTION, so the carry argument must be a DIFFERENT unit - a Burst III carry is required
 *  anyway (a lone B3 makes zero Full Bursts) and a long-cooldown B3 is what makes liter's burst-CD
 *  reduction actually bite. helm=true keeps the 4-unit team so the gauge fills fast enough that the
 *  BURST COOLDOWN, not the gauge, is the binding constraint - otherwise a CDR test cannot discriminate.
 *  Deterministic (no seed). Every counterfactual below is damage-only (shot counts and rotation are
 *  untouched, so strict damage inequalities are safe) EXCEPT the two CDR patches, which are expected
 *  to move the rotation and are therefore judged on Full-Burst counts.
 *
 * WHY EACH ASSERTION DISCRIMINATES - see the per-test comments. The recurring nearest-wrong models
 * covered here: tiers-replace instead of tiers-accumulate; all tiers from cast 1 (no tiering);
 * the s1-B tiers keyed to full-burst-enter instead of the owner's OWN burst cast (over-credits in
 * any multi-burst comp); 'all allies' narrowed to self; 'for 5 sec' encoded as permanent; a plain
 * percentage stat encoded as a caster-scaled one (which would emit a flat ATK number instead of 66).
 *
 * SHAPE DEFENSE: the two harness briefs disagree on whether an override slot is a bare Block[] or a
 * CharacterSkills carrying .blocks, so blocksOf() handles both rather than guessing. Likewise the
 * event sink is wired on BOTH opts.onEvent and opts.cfg.onEvent into SEPARATE arrays, and the cfg
 * one wins when populated - so if the engine honours both, events are never double-counted (the
 * count arithmetic below would silently break if they were).
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

const LITER = 'liter';
const CARRY = 'rapi-red-hood';

const SLOTS = ['skill1', 'skill2', 'burst'] as const;

const near = (a: number, b: number) =>
  typeof a === 'number' && Math.abs(a - b) < 0.005;

const blocksOf = (ov: any, slot: string): any[] => {
  const s = ov?.[slot];
  if (!s) {return [];}
  if (Array.isArray(s)) {return s;}
  if (Array.isArray(s.blocks)) {return s.blocks;}
  return [];
};

const eachBlock = (ov: any, fn: (b: any) => void) => {
  for (const slot of SLOTS) {for (const b of blocksOf(ov, slot)) {fn(b);}}
};

const eachEffect = (ov: any, fn: (eff: any, block: any) => void) => {
  eachBlock(ov, (b) => {
    for (const e of b?.effects ?? []) {fn(e, b);}
  });
};

type Run = { res: any; events: any[] };

function run(patch?: Record<string, any>): Run {
  const base: any = controlComp(CARRY, true);
  const viaTop: any[] = [];
  const viaCfg: any[] = [];
  const opts: any = {
    ...base,
    overrides: { ...(base.overrides ?? {}), ...(patch ?? {}) },
    onEvent: (ev: SimEvent) => viaTop.push(ev),
    cfg: { ...(base.cfg ?? {}), onEvent: (ev: SimEvent) => viaCfg.push(ev) },
  };
  const res = runComp(opts);
  return { res, events: viaCfg.length ? viaCfg : viaTop };
}

const evOf = (r: Run, kind: string) =>
  r.events.filter((e: any) => e.kind === kind);
const buffsOf = (r: Run) => evOf(r, 'buffApply');
const fbStarts = (r: Run) => evOf(r, 'fullBurstStart');

// ---------------------------------------------------------------- counterfactual overrides

// Reader clone: an empty mutate returns an untouched deep clone of the committed override.
const literOv: any = withPatchedOverride(LITER, () => {});

// s1-A: strip every burst-cooldown reduction.
const ovNoCdr = withPatchedOverride(LITER, (ov: any) => {
  eachBlock(ov, (b) => {
    if (Array.isArray(b?.effects))
      {b.effects = b.effects.filter((e: any) => e.kind !== 'burstCdr');}
  });
});

// s1-A nearest-wrong: 'Affects all allies' narrowed to the caster.
const ovCdrSelfOnly = withPatchedOverride(LITER, (ov: any) => {
  eachBlock(ov, (b) => {
    if ((b?.effects ?? []).some((e: any) => e.kind === 'burstCdr'))
      {b.target = { kind: 'self' };}
  });
});

// burst: neutralise the 66% ATK.
const ovBurstAtkZero = withPatchedOverride(LITER, (ov: any) => {
  eachEffect(ov, (e: any) => {
    if (e.kind === 'buff' && e.stat === 'atkPct' && near(e.value, 66))
      {e.value = 0;}
  });
});

// burst nearest-wrong: 'all allies' narrowed to self.
const ovBurstAtkSelfOnly = withPatchedOverride(LITER, (ov: any) => {
  eachEffect(ov, (e: any, b: any) => {
    if (e.kind === 'buff' && e.stat === 'atkPct' && near(e.value, 66))
      {b.target = { kind: 'self' };}
  });
});

// burst nearest-wrong: 'for 5 sec' encoded as permanent.
const ovBurstAtkPermanent = withPatchedOverride(LITER, (ov: any) => {
  eachEffect(ov, (e: any) => {
    if (e.kind === 'buff' && e.stat === 'atkPct' && near(e.value, 66)) {
      delete e.durationSec;
      delete e.durationShots;
    }
  });
});

// s1-B tier 3: neutralise the 14.42% ATK.
const ovTierAtkZero = withPatchedOverride(LITER, (ov: any) => {
  eachEffect(ov, (e: any) => {
    if (e.kind === 'buff' && e.stat === 'atkPct' && near(e.value, 14.42))
      {e.value = 0;}
  });
});

// s2: remove the cover-HP restore entirely.
const ovNoSkill2 = withPatchedOverride(LITER, (ov: any) => {
  if (Array.isArray(ov.skill2)) {ov.skill2 = [];}
  else if (ov.skill2 && Array.isArray(ov.skill2.blocks)) {ov.skill2.blocks = [];}
});

// ---------------------------------------------------------------- hoisted runs (8 sims)

const base = run();
const rNoCdr = run({ [LITER]: ovNoCdr });
const rCdrSelf = run({ [LITER]: ovCdrSelfOnly });
const rBurstZero = run({ [LITER]: ovBurstAtkZero });
const rBurstSelf = run({ [LITER]: ovBurstAtkSelfOnly });
const rBurstPerm = run({ [LITER]: ovBurstAtkPermanent });
const rTierZero = run({ [LITER]: ovTierAtkZero });
const rNoS2 = run({ [LITER]: ovNoSkill2 });

const teamSize = Object.keys(totals(base.res)).length;
const baseBuffs = buffsOf(base);
const ammoEvents = baseBuffs.filter(
  (e: any) => e.stat === 'maxAmmoPct' && near(e.value, 45.17)
);
const literIdx = ammoEvents[0]?.casterIdx;
const literBuffs = baseBuffs.filter((e: any) => e.casterIdx === literIdx);
const critEvents = literBuffs.filter(
  (e: any) => e.stat === 'critDamagePct' && near(e.value, 12.46)
);
const tierAtkEvents = literBuffs.filter(
  (e: any) => e.stat === 'atkPct' && near(e.value, 14.42)
);
const burstAtkEvents = literBuffs.filter(
  (e: any) => e.stat === 'atkPct' && near(e.value, 66)
);
const literCasts = teamSize > 0 ? ammoEvents.length / teamSize : 0;

describe('liter - fixture sanity (non-vacuity guards)', () => {
  it('the event sink is wired and liter is in the comp', () => {
    // If this fails, every count assertion below would pass vacuously.
    expect(base.events.length).toBeGreaterThan(0);
    expect(unitOf(base.res, LITER).totalDamage).toBeGreaterThan(0);
    expect(teamSize).toBeGreaterThanOrEqual(4);
  });

  it('liter casts her burst at least 3 times, so all three cumulative tiers are exercised', () => {
    // Tier 3 ('Three times') is unreachable in a fixture with fewer than 3 casts; without this
    // guard the tier-3 assertions would test nothing.
    expect(ammoEvents.length).toBeGreaterThan(0);
    expect(Number.isInteger(literCasts)).toBe(true);
    expect(literCasts).toBeGreaterThanOrEqual(3);
  });

  it('the team enters Full Burst at least 3 times, so all three CDR tiers are exercised', () => {
    expect(fbStarts(base).length).toBeGreaterThanOrEqual(3);
  });
});

describe("liter s1-A - 'Activates when entering Full Burst' burst-cooldown reduction, all allies", () => {
  it('is modelled as burstCdr on a fullBurstEnter trigger targeting all allies', () => {
    // Trigger identity is the taxonomy trap here and it is NOT behaviourally separable in this
    // fixture (liter is the B1, so every one of her casts leads to a Full Burst - burstCast and
    // fullBurstEnter fire the same number of times, ~1.5s apart). The primitive choice is
    // therefore asserted structurally: 'entering Full Burst' has exactly one right trigger.
    const carriers: any[] = [];
    eachBlock(literOv, (b) => {
      if ((b?.effects ?? []).some((e: any) => e.kind === 'burstCdr'))
        {carriers.push(b);}
    });
    expect(carriers.length).toBeGreaterThan(0);
    for (const b of carriers) {
      expect(b.trigger?.kind).toBe('fullBurstEnter');
      expect(b.target?.kind).toBe('allies');
      expect(b.target?.excludeSelf ?? false).toBe(false);
    }
  });

  it('uses only magnitudes from the kit ladder and is not a once-per-battle effect', () => {
    // The ladder is 2.34 / 2.7 / 3.17 as increments, or 2.34 / 5.04 / 8.21 as running totals -
    // both are legitimate authorings of the same behaviour, so the assertion is that EVERY
    // authored magnitude comes from that set (catches a fudged or rounded number) and that the
    // top tier is present. RED under a flat-2.34-forever model, which never reaches 3.17.
    const secs: number[] = [];
    eachEffect(literOv, (e: any) => {
      if (e.kind === 'burstCdr') {
        secs.push(e.seconds);
        expect(e.oncePerBattle ?? false).toBe(false); // fires on EVERY Full Burst entry
      }
    });
    expect(secs.length).toBeGreaterThan(0);
    const ladder = [2.34, 2.7, 3.17, 5.04, 8.21];
    for (const s of secs) {expect(ladder.some((l) => near(s, l))).toBe(true);}
    expect(secs.some((s) => s >= 3.17 - 0.005)).toBe(true);
  });

  it('actually accelerates the rotation - stripping it costs Full Bursts', () => {
    // The headline claim. GREEN when the CDR binds the rotation; RED if the reduction is absent,
    // inert, or applied to a target set that never gates the chain.
    expect(fbStarts(base).length).toBeGreaterThan(fbStarts(rNoCdr).length);
  });

  it("reaches TEAMMATES - 'all allies', not the caster alone", () => {
    // Nearest-wrong: target {kind:'self'}. liter's own 20s cooldown is not what gates the chain
    // (the Burst III carry's is), so a self-only CDR must yield strictly fewer Full Bursts.
    expect(fbStarts(rCdrSelf).length).toBeLessThan(fbStarts(base).length);
  });

  it.skip('exact cumulative ladder 2.34 / 5.04 / 8.21 per entry index - UNOBSERVABLE', () => {
    // burstCdr emits no event; only its downstream effect on rotation timing is visible, and the
    // per-entry magnitude cannot be separated from the gauge/chain constraints. The magnitude set
    // + the accumulate-vs-replace shape are covered structurally above; pinning the per-entry
    // value needs either a burstCdr event kind or a measured Full-Burst timeline.
  });
});

describe("liter s1-B - 'Activates when using Burst Skill' cumulative 5s buffs, all allies", () => {
  it('is keyed to the OWNER-S OWN burst cast, not to full-burst entry', () => {
    // Taxonomy trap 3: 'when using Burst Skill' is burstCast. Keying it to fullBurstEnter
    // over-credits in any comp where another unit completes the chain. Structural, for the same
    // reason as s1-A: the two triggers are behaviourally degenerate in this fixture.
    const carriers: any[] = [];
    eachBlock(literOv, (b) => {
      const hit = (b?.effects ?? []).some(
        (e: any) =>
          e.kind === 'buff' &&
          ((e.stat === 'maxAmmoPct' && near(e.value, 45.17)) ||
            (e.stat === 'critDamagePct' && near(e.value, 12.46)) ||
            (e.stat === 'atkPct' && near(e.value, 14.42)))
      );
      if (hit) {carriers.push(b);}
    });
    expect(carriers.length).toBeGreaterThan(0);
    for (const b of carriers) {
      expect(b.trigger?.kind).toBe('burstCast');
      expect(b.target?.kind).toBe('allies');
      expect(b.target?.excludeSelf ?? false).toBe(false);
    }
  });

  it('tier 1 Max Ammunition 45.17% fires on EVERY cast, to every ally including liter', () => {
    // 'Each subsequent effect triggers all effects before it' => tier 1 never stops firing.
    // RED under replace-semantics (ammo only on cast 1) and under an excludeSelf target.
    expect(ammoEvents.length).toBe(literCasts * teamSize);
    const targets = new Set(ammoEvents.map((e: any) => e.targetIdx));
    expect(targets.size).toBe(teamSize);
    expect(targets.has(literIdx)).toBe(true);
    for (const e of ammoEvents) {expect(e.stat).toBe('maxAmmoPct');} // %, not maxAmmoFlat rounds
  });

  it('tier 2 Critical Damage 12.46% starts one cast LATER and then never stops', () => {
    // The cumulative shape encoded as arithmetic: casts 2..n => exactly one cast fewer than ammo.
    // RED under 'all three from cast 1' (counts would be equal) and under replace-semantics
    // (crit would fire on cast 2 only, i.e. exactly teamSize events).
    expect(critEvents.length).toBe(ammoEvents.length - teamSize);
    expect(critEvents.length).toBeGreaterThan(0);
    const targets = new Set(critEvents.map((e: any) => e.targetIdx));
    expect(targets.size).toBe(teamSize);
  });

  it('tier 3 ATK 14.42% starts two casts later and then never stops', () => {
    // casts 3..n. RED under replace-semantics, under no-tiering, and under an off-by-one gate
    // (e.g. a resource counter incremented AFTER the gated blocks read it).
    expect(tierAtkEvents.length).toBe(ammoEvents.length - 2 * teamSize);
    expect(tierAtkEvents.length).toBeGreaterThan(0);
    const targets = new Set(tierAtkEvents.map((e: any) => e.targetIdx));
    expect(targets.size).toBe(teamSize);
  });

  it('tier 3 ATK is a plain percentage buff that moves teammate damage', () => {
    // Nearest-wrong 1: casterAtkPct/highestAllyAtkPct, which would re-emit as a FLAT ATK number
    // (thousands), not 14.42. Nearest-wrong 2: authored but inert.
    for (const e of tierAtkEvents) {expect(e.value).toBeCloseTo(14.42, 3);}
    expect(
      literBuffs.filter((e: any) => e.stat === 'casterAtkPct')
    ).toHaveLength(0);
    expect(totals(rTierZero.res)[CARRY]).toBeLessThan(totals(base.res)[CARRY]);
  });

  it('all three tiers are second-based windows, not round-count windows', () => {
    // Taxonomy trap 2: 'for 5 sec' is wall-clock. durationShots must be absent, and a finite
    // expiry must exist (a permanent encoding would carry no finite expiresFrame).
    for (const e of [...ammoEvents, ...critEvents, ...tierAtkEvents]) {
      expect(e.durationShots).toBeUndefined();
      expect(Number.isFinite(e.expiresFrame)).toBe(true);
    }
  });
});

describe("liter s2 - 'Restores 52.5% of Cover HP' to the 2 lowest-cover-HP allies", () => {
  it('is offensively inert in the control comp', () => {
    // v1 models no HP pool and no cover, so the restore itself moves nothing. This assertion is
    // ALSO the deliberate adjudication probe for the tandem trap: the control comp contains an
    // on-recovery consumer, so if this line were modelled as a `heal` effect it would fire that
    // consumer's recovery trigger every cycle and this test goes RED. FLAG: cover-HP restoration
    // is read here as NOT an HP recovery (cover HP is a separate resource in game), so it must
    // not emit recovery events. If the owner rules the opposite, this is the line to revisit.
    const b = totals(base.res);
    const n = totals(rNoS2.res);
    for (const slug of Object.keys(b)) {expect(n[slug]).toBe(b[slug]);}
  });

  it.skip('cover-HP restore amount (52.5%) and the 2-lowest-cover-HP target set - GAP', () => {
    // No cover-HP pool exists in v1 and there is no target kind for 'lowest remaining COVER HP'
    // (alliesLowestHp is the HP-pool analogue, itself a documented stand-in). Unobservable payload.
  });

  it.skip('s2 firing cadence - FLAG: the prose carries NO activation clause', () => {
    // Per the no-activation-clause convention this is an interval trigger at the datamined skill
    // cooldown, but that cooldown is not in this packet (the 20s quoted is the BURST cooldown).
    // Cadence is therefore an always-flag field; it is damage-inert here either way.
  });
});

describe("liter burst - 'ATK 66% for 5 sec' to all allies", () => {
  it('applies ATK 66% once per cast to every ally, as a plain percentage', () => {
    // Same cast count as the tier-1 ammo buff - a cross-check that both ride the same cast.
    // 66 (not a flat ATK number) rules out casterAtkPct / highestAllyAtkPct mis-encoding.
    expect(burstAtkEvents.length).toBe(ammoEvents.length);
    for (const e of burstAtkEvents) {
      expect(e.stat).toBe('atkPct');
      expect(e.value).toBeCloseTo(66, 3);
      expect(e.durationShots).toBeUndefined();
      expect(Number.isFinite(e.expiresFrame)).toBe(true);
    }
    const targets = new Set(burstAtkEvents.map((e: any) => e.targetIdx));
    expect(targets.size).toBe(teamSize);
    expect(targets.has(literIdx)).toBe(true);
  });

  it('moves both teammate and self damage (all allies INCLUDES the caster)', () => {
    // Damage-only patch: shot counts and rotation are unchanged, so both inequalities are strict.
    expect(totals(rBurstZero.res)[CARRY]).toBeLessThan(totals(base.res)[CARRY]);
    expect(totals(rBurstZero.res)[LITER]).toBeLessThan(totals(base.res)[LITER]);
  });

  it("narrowing it to self costs the carry but leaves liter's own damage byte-identical", () => {
    // The clean discriminator for the target set: self-only removes the teammate half and nothing
    // else. If liter's own total moved too, the buff is not reaching her under the faithful model.
    expect(totals(rBurstSelf.res)[CARRY]).toBeLessThan(totals(base.res)[CARRY]);
    expect(totals(rBurstSelf.res)[LITER]).toBe(totals(base.res)[LITER]);
  });

  it('the 5s window is real - a permanent encoding over-credits', () => {
    // Duration semantics. RED if 'for 5 sec' were dropped (buff already permanent => no delta).
    expect(totals(rBurstPerm.res)[CARRY]).toBeGreaterThan(
      totals(base.res)[CARRY]
    );
  });
});
