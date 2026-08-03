// Functional test for the "%-of-hit repeat" rider primitive (`hitRepeat`).
//
// THE MECHANIC. Kit text of the form "Deals Fixed Damage ... equal to X% of the damage dealt
// by self" is a first-class NIKKE mechanic, documented in docs/data/nikke-damage-formula.md §3:
// "%-of-hit repeats ('deals X% of the damage dealt') inherit everything from the parent hit
// implicitly." When the carrier's hit lands for final damage `parentDmg`, the rider deals an
// ADDITIONAL function-damage instance of pct% x parentDmg.
//
// WHAT MAKES IT A DIFFERENT PRIMITIVE FROM `flatDamage`. flatDamage is a % of the caster's
// FINAL ATK and composes its OWN multiplier stack (crit at the caster rate, element, Damage Up,
// Full Burst by landing time; never core, never range, never charge). A hitRepeat is a fraction
// of an ALREADY-COMPUTED damage number, so every bucket the parent took is already inside it —
// crit expectation, core, the +30% range bonus, Full Burst, element, the charge multiplier,
// Damage Up, Damage Taken. Re-applying any of them would double-count. The rider therefore
// carries NO multiplier of its own: its whole decomposition is 1s.
//
// FIXTURE. The control comp — `liter` (B1) / `crown` (B2) / `alice` (Alice, SR/Fire — NOT
// `alice-wonderland-bunny`) as the B3 carry / `helm` (Helm, SR/Water — NOT `helm-aquamarine`) —
// on a WIND boss, with `alice`'s kit REPLACED by a single synthetic block. Deliberately
// synthetic: this is a step-2 ENGINE primitive test, not a step-3 unit spec, so the carrier is a
// stand-in and every skill-bucket instance `alice` deals is the rider under test with nothing
// else in the way. `alice` is the right stand-in because she maximises the number of buckets
// that WOULD double-count if the rider re-applied them:
//   - SR, charge weapon (chargeMultiplier 350) -> the parent carries a x3.5 charge bucket
//   - Fire vs a WIND boss -> the parent carries the x1.1 elemental major
//   - SR is range-eligible -> the parent takes the +30% band bonus in some bands and not others
//   - scope lock runs coreHitRate 1 -> the parent carries the core term
//   - a real B1/B2/B3 chain -> the parent takes the +50% Full Burst major inside the windows
// So the "repeat == pct x parent, exactly" identity below is only satisfiable by a model that
// reads the parent's final number; every wrong model breaks it in at least one of those five.
//
// Deterministic (no seed) => expected-value pass => byte-stable totals => equality assertions
// are legal.
//
// INERTNESS FOR NON-CARRIERS is proved two ways: `never fires for a unit that does not carry
// it` below (the whole shipped control comp emits zero rider-shaped instances), and — the real
// proof — the regression snapshot being byte-identical across the commit that added this
// primitive.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { controlComp, runComp, unitOf } from '../lib/harness.js';

const CARRY = 'alice';
const PCT = 58.99;

type DamageEvent = Extract<SimEvent, { kind: 'damage' }>;

/** alice with an EMPTY kit plus `blocks` — nothing of her own confounds the reading. */
const kit = (blocks: unknown[] = []) =>
  ({ slug: CARRY, skill1: [], skill2: blocks, burst: [] }) as never;

/** One synthetic block: `trigger` -> enemy -> `effects`. */
const block = (
  effects: unknown[],
  trigger: unknown = { kind: 'shotFired' }
) => ({
  slot: 'skill2',
  trigger,
  target: { kind: 'enemy' },
  effects,
});

function run(override?: unknown) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp(CARRY),
    bossElement: 'Wind', // alice is Fire => elementally ADVANTAGED, so elem = 1.1 on her parent hits
    ...(override === undefined
      ? {}
      : { overrides: { [CARRY]: override as never } }),
    cfg: { onEvent: (e) => events.push(e) },
  });
  const dmg = events.filter(
    (e): e is DamageEvent => e.kind === 'damage' && e.slug === CARRY
  );
  return {
    res,
    events,
    dmg,
    /** Weapon-fire instances — the PARENTS a rider rides. */
    parents: dmg.filter((e) => e.bucket === 'normal'),
    /** Rider instances: the ONLY instance shape whose entire decomposition is 1s. */
    riders: dmg.filter(
      (e) =>
        e.mult.major === 1 &&
        e.mult.elem === 1 &&
        e.mult.charge === 1 &&
        e.mult.dmgUp === 1 &&
        e.mult.seqMult === 1 &&
        e.mult.projFactor === 1 &&
        e.mult.distributed === 1 &&
        e.bucket !== 'normal'
    ),
  };
}

describe('hitRepeat (%-of-hit repeat rider)', () => {
  const bare = run(kit());
  const repeat = run(kit([block([{ kind: 'hitRepeat', pct: PCT }])]));

  it('mechanism is live — the carrier gains damage in the OWNING slot bucket', () => {
    const before = unitOf(bare.res, CARRY);
    const after = unitOf(repeat.res, CARRY);
    expect(
      after.breakdown.skill,
      `skill bucket ${after.breakdown.skill} should exceed the kit-less ${before.breakdown.skill}`
    ).toBeGreaterThan(before.breakdown.skill);
    expect(repeat.riders.length).toBeGreaterThan(0);
  });

  it('fires exactly once per trigger pull', () => {
    expect(repeat.riders.length).toBe(unitOf(repeat.res, CARRY).pulls);
  });

  it('DISCRIMINATING: every instance is exactly pct% of THAT pull’s parent damage', () => {
    // The load-bearing assertion. A static-atkPct model (flatDamage) cannot satisfy it: the
    // parent's amount swings with core, charge, range band, Full Burst and element across the
    // fight, and the rider has to swing with it, one-for-one, on every single pull.
    const byFrame = new Map(repeat.parents.map((p) => [p.frame, p]));
    const bad = repeat.riders
      .map((r) => {
        const p = byFrame.get(r.frame);
        if (!p) {
          return `t=${r.sec.toFixed(2)} no parent instance on this frame`;
        }
        const want = (PCT / 100) * p.amount;
        return Math.abs(r.amount - want) <= 1e-9 * Math.abs(want)
          ? null
          : `t=${r.sec.toFixed(2)} rider ${r.amount.toFixed(2)} != ${PCT}% of parent ${p.amount.toFixed(2)} (= ${want.toFixed(2)})`;
      })
      .filter(Boolean);
    expect(bad.slice(0, 5)).toEqual([]);
  });

  it('the identity is NON-TRIVIAL — the parent hit varies across the fight', () => {
    // If every parent were the same number, the identity above would hold for a static model too.
    const distinct = new Set(repeat.parents.map((p) => p.amount.toFixed(0)));
    expect(
      distinct.size,
      `only ${distinct.size} distinct parent values — the fixture is not exercising FB/band variation`
    ).toBeGreaterThanOrEqual(3);
  });

  it('NEVER cores and NEVER takes the +30% range bonus, in a fight where the parent takes both', () => {
    // scope lock = coreHitRate 1 + rangeBonus true, and alice is a range-eligible SR — so the
    // PARENT genuinely carries core and (in the eligible bands) range. The rider must not.
    expect(repeat.parents.some((p) => p.coreRate > 0)).toBe(true);
    expect(repeat.parents.some((p) => p.rangeApplied)).toBe(true);
    expect(
      repeat.riders.filter((r) => r.coreEligible || r.coreRate > 0)
    ).toEqual([]);
    expect(repeat.riders.filter((r) => r.rangeApplied)).toEqual([]);
  });

  it('inherits crit / element / charge / Damage-Up IMPLICITLY, never re-applied', () => {
    // The parent's decomposition proves each bucket is genuinely live for this carrier...
    expect(repeat.parents.every((p) => p.critEligible && p.critRate > 0)).toBe(
      true
    );
    expect(repeat.parents.every((p) => p.mult.elem > 1)).toBe(true); // Fire vs Wind boss
    expect(repeat.parents.every((p) => p.mult.charge > 1)).toBe(true); // SR full charge
    // ...and the rider re-applies none of them (its own decomposition is all 1s, which is what
    // the `riders` filter asserts) while still tracking the parent, per the identity test above.
    expect(
      repeat.riders.every((r) => !r.critEligible && r.critRate === 0)
    ).toBe(true);
  });

  it('inherits Full Burst through the parent, not on its own account', () => {
    const inFb = repeat.riders.filter((r) => r.inFullBurst);
    const outFb = repeat.riders.filter((r) => !r.inFullBurst);
    expect(inFb.length).toBeGreaterThan(0);
    expect(outFb.length).toBeGreaterThan(0);
    // it never takes the +50% itself...
    expect(inFb.every((r) => !r.fbMajorApplied)).toBe(true);
    // ...but it is still BIGGER inside the window, because its parent took it.
    const byFrame = new Map(repeat.parents.map((p) => [p.frame, p]));
    expect(byFrame.get(inFb[0].frame)!.fbMajorApplied).toBe(true);
    const mean = (xs: DamageEvent[]) =>
      xs.reduce((a, b) => a + b.amount, 0) / xs.length;
    expect(mean(inFb)).toBeGreaterThan(mean(outFb));
  });

  it('lands in the OWNING slot’s bucket (skill1/skill2 -> skill, burst -> burst)', () => {
    expect(
      repeat.riders.every((r) => r.bucket === 'skill' && r.srcSlot === 'skill2')
    ).toBe(true);
    const inBurstSlot = run({
      slug: CARRY,
      skill1: [],
      skill2: [],
      burst: [{ ...block([{ kind: 'hitRepeat', pct: PCT }]), slot: 'burst' }],
    });
    expect(inBurstSlot.riders.length).toBeGreaterThan(0);
    expect(
      inBurstSlot.riders.every(
        (r) => r.bucket === 'burst' && r.srcSlot === 'burst'
      )
    ).toBe(true);
  });

  it('DISCRIMINATING: is NOT the nearest-wrong model (flatDamage with the same number)', () => {
    // The fudge this primitive exists to forbid. flatDamage atkPct:58.99 is 58.99% of final ATK;
    // hitRepeat pct:58.99 is 58.99% of a hit that already carries normalMult x charge x major.
    const flat = run(kit([block([{ kind: 'flatDamage', atkPct: PCT }])]));
    const flatSkill = unitOf(flat.res, CARRY).breakdown.skill;
    const repeatSkill = unitOf(repeat.res, CARRY).breakdown.skill;
    expect(repeatSkill).not.toBe(flatSkill);
    expect(
      repeatSkill / flatSkill,
      `repeat ${(repeatSkill / 1e6).toFixed(1)}M vs flatDamage ${(flatSkill / 1e6).toFixed(1)}M`
    ).toBeGreaterThan(1.5);
  });

  it('cannot ride a STALE hit — a trigger that does not fire on a pull produces nothing', () => {
    // The rider is frame-locked to a damage instance the owner landed on THIS frame, so a
    // trigger that fires away from the weapon path (here: Full Burst entry) yields zero
    // instances rather than silently re-using the last shot's number.
    const stale = run(
      kit([
        block([{ kind: 'hitRepeat', pct: PCT }], { kind: 'fullBurstEnter' }),
      ])
    );
    expect(stale.riders).toEqual([]);
    expect(unitOf(stale.res, CARRY).breakdown.skill).toBe(0);
  });

  it('scales with pct', () => {
    const dbl = run(kit([block([{ kind: 'hitRepeat', pct: 2 * PCT }])]));
    const byFrame = new Map(dbl.parents.map((p) => [p.frame, p]));
    const bad = dbl.riders.filter((r) => {
      const want = ((2 * PCT) / 100) * byFrame.get(r.frame)!.amount;
      return Math.abs(r.amount - want) > 1e-9 * Math.abs(want);
    });
    expect(bad).toEqual([]);
  });

  it('never fires for a unit that does not carry it', () => {
    // The whole control comp on its SHIPPED overrides: no unit emits a rider-shaped instance.
    const events: SimEvent[] = [];
    runComp({
      ...controlComp(CARRY),
      bossElement: 'Wind',
      cfg: { onEvent: (e) => events.push(e) },
    });
    const riderShaped = events.filter(
      (e): e is DamageEvent =>
        e.kind === 'damage' &&
        e.bucket !== 'normal' &&
        e.mult.major === 1 &&
        e.mult.elem === 1 &&
        e.mult.charge === 1 &&
        e.mult.dmgUp === 1 &&
        e.mult.taken === 1
    );
    expect(riderShaped.map((e) => `${e.slug}@${e.sec.toFixed(1)}`)).toEqual([]);
  });
});
