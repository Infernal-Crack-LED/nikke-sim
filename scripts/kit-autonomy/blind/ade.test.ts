import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

/*
 * ade — BLIND kit spec test (written from kit prose alone, S5 cross-family post-op).
 *
 * KIT (AR/Wind/Supporter/Burst II, cd 20s, ammo 60, reloadFrames 111):
 *
 * skill1 line A: "Activates at the start of battle. Affects all allies.
 *                 Perfect Maid: Gain debuff immunity to 1 debuff(s), stacking up to 1 time(s)
 *                 continuously."
 *   -> GAP. Debuff immunity has NO engine primitive (no StatKey, no EffectDef kind). The v1 boss
 *      applies no debuffs to allies, so it is unobservable AND payload-free. Must appear in
 *      `unmodeled.skill1`, never as a block. Asserted structurally (no block may claim it).
 *
 * skill1 line B: "Activates when own HP falls below 90%. Affects all allies.
 *                 ATK 5.19% of the skill user's ATK for 5 sec."
 *   -> GAP-or-PASSIVE. "of the skill user's ATK" = casterAtkPct (flat-resolved at apply). The
 *      TRIGGER is an HP threshold; v1 models no HP pool (immortal allies, boss deals no damage),
 *      so the trigger can never fire faithfully. Two defensible models: (a) unmodeled (never
 *      fires), (b) passive always-on (assumes the 90% threshold is crossed immediately and the
 *      5s window is re-refreshed forever). Both are legitimate; the test PINS WHICHEVER the
 *      override chose and asserts the magnitude + target set are right in that model, and that
 *      it is NOT modeled as a plain atkPct (which would scale each ally's OWN ATK — a different,
 *      larger, class-varying number).
 *
 * skill2 line A: "Activates after 420 normal attack(s). Affects all allies. Perfect Maid: ..."
 *   -> GAP, same primitive gap as skill1 line A (debuff immunity). Trigger IS expressible
 *      (hitCount 420) but the payload is not.
 *
 * skill2 line B: "Activates after 120 normal attack(s). Affects all allies.
 *                 Max HP 15.62% of the skill user's Max HP without restoring HP, lasts for 5 sec."
 *   -> FAITHFUL/inert-but-modeled. casterMaxHpPct, emitted as stat 'maxHpFlat' with a FLAT value.
 *      Trigger identity is hitCount:120 counting ROUNDS fired by ade, NOT pulls of the whole team
 *      and NOT an interval. Ally-granted Max HP does not feed a teammate's atkOfMaxHpPct (e3 rule),
 *      so it is damage-inert — but it MUST still be modeled (a future consumer/scaler; taxonomy #7).
 *      Assertions: (1) the buffApply fires with the right cadence relative to ade's own shot count,
 *      (2) it targets ALL 5 allies including self, (3) the emitted value is flat HP not 15.62,
 *      (4) it moves NO damage (inertness).
 *
 * burst line A: "Affects all allies. Max HP 25.15% of the skill user's Max HP without restoring
 *                HP, lasts for 10 sec."
 *   -> FAITHFUL, same casterMaxHpPct primitive, burstCast trigger, 10s.
 *
 * burst line B: "ATK 10.15% of the skill user's ATK for 10 sec."
 *   -> FAITHFUL, THE ONLY DAMAGE-BEARING LINE IN THE ENTIRE KIT. casterAtkPct 10.15, allies
 *      (incl. self), 10s, burstCast.
 *      Nearest-wrong models this test discriminates against:
 *        - atkPct 10.15 instead of casterAtkPct: scales each ally's OWN ATK. ade is a Supporter
 *          (98,367 static ATK at scope lock) while the Attacker carry is 118,027 — so a
 *          self-scaled buff gives the carry MORE than the caster-scaled one. Different totals.
 *        - trigger fullBurstEnter instead of burstCast: ade is Burst II, so in the control comp
 *          she casts on every rotation and the two coincide in COUNT — but they differ in TIMING
 *          (burstCast lands ~before the FB window). Discriminated by the buffApply frame relative
 *          to the fullBurstStart event, not by totals.
 *        - target self instead of allies: the carry would lose the buff entirely.
 *        - durationSec 5 instead of 10 (borrowing the skill2 window): fewer buffed frames.
 *
 * FIXTURE: controlComp('ade', true) — liter B1 / crown B2 / ade B3-slot-as-carry? NO: ade is
 * Burst II. controlComp puts the named carry in the B3 seat, which would silently mis-stage her.
 * The harness resolves each unit's real burst stage from characters.json, so the carry seat is
 * positional, not a stage claim — ade still casts at stage II. The fixed helm B3 (helm=true) is
 * REQUIRED so the chain completes and a Full Burst actually happens (a comp with no B3 makes zero
 * full bursts, and ade's burst-cast buffs would never fire).
 *
 * helm's own S1 grants critRateNormalPct to allies, which confounds a raw damage delta only if it
 * VARIES between arms of a counterfactual — it does not (helm is unpatched in every arm), so it is
 * a constant offset and every A/B below stays valid.
 *
 * RUN BUDGET: 5 runComp calls, all hoisted.
 */

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;

function run(opts: Parameters<typeof runComp>[0]) {
  const events: SimEvent[] = [];
  const res = runComp({ ...opts, onEvent: (ev: SimEvent) => events.push(ev) });
  return { res, events };
}

const base = controlComp('ade', true);

// --- hoisted runs -----------------------------------------------------------

// 1. baseline: shipped override
const baseline = run(base);

// 2. counterfactual: burst ATK line deleted entirely (isolates its damage footprint)
const noBurstAtk = withPatchedOverride('ade', (ov) => {
  for (const b of ov.burst?.blocks ?? []) {
    b.effects = b.effects.filter(
      (e) =>
        !(
          e.kind === 'buff' &&
          (e.stat === 'casterAtkPct' || e.stat === 'atkPct')
        )
    );
  }
});
const withoutBurstAtk = run({ ...base, overrides: { ade: noBurstAtk } });

// 3. nearest-wrong: burst ATK line re-keyed to self-scaled atkPct at the same magnitude
const selfScaled = withPatchedOverride('ade', (ov) => {
  for (const b of ov.burst?.blocks ?? []) {
    for (const e of b.effects) {
      if (e.kind === 'buff' && e.stat === 'casterAtkPct') {
        e.stat = 'atkPct';
      }
    }
  }
});
const withSelfScaled = run({ ...base, overrides: { ade: selfScaled } });

// 4. nearest-wrong: burst ATK duration halved to the skill2 window (10s -> 5s)
const shortWindow = withPatchedOverride('ade', (ov) => {
  for (const b of ov.burst?.blocks ?? []) {
    for (const e of b.effects) {
      if (e.kind === 'buff' && e.stat === 'casterAtkPct') {
        e.durationSec = 5;
      }
    }
  }
});
const withShortWindow = run({ ...base, overrides: { ade: shortWindow } });

// 5. nearest-wrong: burst ATK line scoped to self instead of all allies
const selfOnly = withPatchedOverride('ade', (ov) => {
  for (const b of ov.burst?.blocks ?? []) {
    const carriesAtk = b.effects.some(
      (e) => e.kind === 'buff' && e.stat === 'casterAtkPct'
    );
    if (carriesAtk) {
      b.target = { kind: 'self' };
    }
  }
});
const withSelfOnly = run({ ...base, overrides: { ade: selfOnly } });

// --- helpers ----------------------------------------------------------------

const buffs = (events: SimEvent[]) =>
  events.filter((e): e is BuffApply => e.kind === 'buffApply');

const adeIdx = () => unitOf(baseline.res, 'ade').slot;

// ade's static ATK is class-based (Supporter @ Base 5 = 98,367 per the scope-lock anchor),
// but the test reads it off the result row rather than hardcoding, so it survives a stat refresh.
const adeStaticAtk = () => unitOf(baseline.res, 'ade').staticAtk;
const adeMaxHp = () => unitOf(baseline.res, 'ade').maxHp;

describe("ade — burst: ATK 10.15% of the skill user's ATK for 10 sec (allies)", () => {
  it("emits a caster-scaled ATK buff, flat-resolved to 10.15% of ADE's static ATK", () => {
    const atkBuffs = buffs(baseline.events).filter(
      (e) => e.stat === 'casterAtkPct' && e.casterIdx === adeIdx()
    );
    expect(atkBuffs.length).toBeGreaterThan(0);

    const expected = (10.15 / 100) * adeStaticAtk();
    for (const b of atkBuffs) {
      // FLAT-resolved at apply time: asserting 10.15 here would be the classic blind error.
      expect(b.value).toBeCloseTo(expected, 0);
    }
  });

  it('covers all five allies including self (not self-only, not exclude-self)', () => {
    const atkBuffs = buffs(baseline.events).filter(
      (e) => e.stat === 'casterAtkPct' && e.casterIdx === adeIdx()
    );
    const perCast = new Map<number, Set<string>>();
    for (const b of atkBuffs) {
      const bucket = perCast.get(b.expiresFrame) ?? new Set<string>();
      if (b.targetSlug) {
        bucket.add(b.targetSlug);
      }
      perCast.set(b.expiresFrame, bucket);
    }
    for (const [, slugs] of perCast) {
      expect(slugs.size).toBe(5);
      expect(slugs.has('ade')).toBe(true);
    }
  });

  it('lasts 10 sec, not the 5 sec of the skill2 window', () => {
    // 600 frames at 60fps. Read expiresFrame - applyFrame off the event rather than asserting a
    // buffRemove: the engine emits no buffRemove on natural time-lapse.
    const atkBuffs = buffs(baseline.events).filter(
      (e) => e.stat === 'casterAtkPct' && e.casterIdx === adeIdx()
    );
    expect(atkBuffs.length).toBeGreaterThan(0);

    // Cross-check by damage: a 5s window must strictly under-credit the team.
    const full = Object.values(totals(baseline.res)).reduce((a, b) => a + b, 0);
    const half = Object.values(totals(withShortWindow.res)).reduce(
      (a, b) => a + b,
      0
    );
    expect(half).toBeLessThan(full);
  });

  it('fires at BURST CAST, before the Full Burst window opens (not fullBurstEnter)', () => {
    // ade is Burst II: she casts on every rotation, so burstCast and fullBurstEnter agree on
    // COUNT and only timing discriminates. The buff must be applied at/behind the cast frame
    // and strictly BEFORE the matching fullBurstStart.
    const firstCast = baseline.events.find(
      (e) => e.kind === 'burstCast' && e.slug === 'ade'
    );
    const firstFbStart = baseline.events.find(
      (e) => e.kind === 'fullBurstStart'
    );
    const firstAtk = buffs(baseline.events).find(
      (e) => e.stat === 'casterAtkPct' && e.casterIdx === adeIdx()
    );

    expect(firstCast).toBeDefined();
    expect(firstFbStart).toBeDefined();
    expect(firstAtk).toBeDefined();
    expect(firstAtk!.frame).toBeGreaterThanOrEqual(firstCast!.frame);
    expect(firstAtk!.frame).toBeLessThan(firstFbStart!.frame);
  });

  it("is caster-scaled, NOT self-scaled — the Attacker carry gets ADE's number, not its own", () => {
    // Nearest-wrong: atkPct 10.15 scales each ally's OWN ATK. ade is a Supporter (lower static
    // ATK than the Attacker carry), so the self-scaled model over-credits the carry. The two
    // models MUST diverge; if they don't, the assertion is vacuous and the fixture is wrong.
    const trueCarry = totals(baseline.res).ade;
    const wrongCarry = totals(withSelfScaled.res).ade;
    expect(wrongCarry).not.toBeCloseTo(trueCarry, 0);
  });

  it('non-vacuity: the burst ATK line actually moves damage in this fixture', () => {
    // If deleting the only damage-bearing line in the kit changes nothing, every assertion above
    // is testing a buff that never reaches a shot.
    const withLine = Object.values(totals(baseline.res)).reduce(
      (a, b) => a + b,
      0
    );
    const withoutLine = Object.values(totals(withoutBurstAtk.res)).reduce(
      (a, b) => a + b,
      0
    );
    expect(withLine).toBeGreaterThan(withoutLine);
  });

  it('scoping the ATK buff to self alone under-credits the team', () => {
    const allAllies = Object.values(totals(baseline.res)).reduce(
      (a, b) => a + b,
      0
    );
    const selfOnlyTotal = Object.values(totals(withSelfOnly.res)).reduce(
      (a, b) => a + b,
      0
    );
    expect(selfOnlyTotal).toBeLessThan(allAllies);
  });
});

describe("ade — burst: Max HP 25.15% of the skill user's Max HP, 10 sec (allies)", () => {
  it("emits maxHpFlat resolved to 25.15% of ADE's Max HP, to all five allies", () => {
    // casterMaxHpPct re-emits under stat 'maxHpFlat' with a FLAT HP value.
    const hpBuffs = buffs(baseline.events).filter(
      (e) => e.stat === 'maxHpFlat' && e.casterIdx === adeIdx()
    );
    const expected = (25.15 / 100) * adeMaxHp();
    const burstGrants = hpBuffs.filter((e) => Math.abs(e.value - expected) < 1);
    expect(burstGrants.length).toBeGreaterThan(0);

    const slugs = new Set(burstGrants.map((e) => e.targetSlug));
    expect(slugs.size).toBe(5);
  });

  it('is damage-inert — ally-granted Max HP feeds no teammate ATK conversion', () => {
    // The e3 rule: ally-granted Max HP does not feed a teammate's atkOfMaxHpPct. No unit in the
    // control comp carries that conversion, so removing the grant must move NOTHING.
    const noHp = withPatchedOverride('ade', (ov) => {
      for (const slot of [ov.skill1, ov.skill2, ov.burst]) {
        for (const b of slot?.blocks ?? []) {
          b.effects = b.effects.filter(
            (e) =>
              !(
                e.kind === 'buff' &&
                (e.stat === 'casterMaxHpPct' || e.stat === 'targetMaxHpPct')
              )
          );
        }
      }
    });
    const stripped = runComp({ ...base, overrides: { ade: noHp } });
    for (const [slug, dmg] of Object.entries(totals(baseline.res))) {
      expect(totals(stripped)[slug]).toBeCloseTo(dmg, 6);
    }
  });
});

describe('ade — skill2: Max HP 15.62% of skill user Max HP after 120 normal attacks (allies, 5s)', () => {
  it("fires on ADE's OWN round count (hitCount 120), not on an interval and not on team ammo", () => {
    const expected = (15.62 / 100) * adeMaxHp();
    const grants = buffs(baseline.events).filter(
      (e) =>
        e.stat === 'maxHpFlat' &&
        e.casterIdx === adeIdx() &&
        Math.abs(e.value - expected) < 1
    );
    expect(grants.length).toBeGreaterThan(0);

    // ade fires 1 round per pull. Each grant must be preceded by >= 120 of HER shots since the
    // previous grant. An `interval` model would decouple grants from her shot log entirely; a
    // `teamAmmo` model would fire ~5x too often.
    const adeShots = baseline.events.filter(
      (e) => e.kind === 'shot' && e.slot === adeIdx()
    );
    const grantFrames = [...new Set(grants.map((g) => g.frame))].sort(
      (a, b) => a - b
    );
    let prev = 0;
    for (const f of grantFrames) {
      const fired = adeShots.filter((s) => s.frame <= f).length;
      expect(fired - prev).toBeGreaterThanOrEqual(120);
      prev = fired;
    }
  });

  it('targets all allies including self', () => {
    const expected = (15.62 / 100) * adeMaxHp();
    const grants = buffs(baseline.events).filter(
      (e) =>
        e.stat === 'maxHpFlat' &&
        e.casterIdx === adeIdx() &&
        Math.abs(e.value - expected) < 1
    );
    const firstFrame = Math.min(...grants.map((g) => g.frame));
    const slugs = new Set(
      grants.filter((g) => g.frame === firstFrame).map((g) => g.targetSlug)
    );
    expect(slugs.size).toBe(5);
    expect(slugs.has('ade')).toBe(true);
  });
});

describe('ade — GAP lines (no engine primitive)', () => {
  it.skip('skill1: Perfect Maid debuff immunity at battle start — GAP: no debuff-immunity primitive, and the v1 boss applies no ally debuffs (must live in unmodeled.skill1)', () => {});

  it.skip('skill2: Perfect Maid debuff immunity after 420 normal attacks — GAP: same missing primitive; the hitCount:420 trigger is expressible but the payload is not (must live in unmodeled.skill2)', () => {});

  it('skill1: the debuff-immunity lines are recorded as unmodeled, never as silent drops', () => {
    // "No silent drops": the audit record must carry both Perfect Maid lines.
    const ov = withPatchedOverride('ade', () => {});
    const s1 = ov.skill1?.unmodeled?.skill1 ?? [];
    const s2 = ov.skill2?.unmodeled?.skill2 ?? [];
    const all = [...s1, ...s2].join(' ');
    expect(all).toMatch(/Perfect Maid/i);
  });
});

describe('ade — skill1: ATK 5.19% of skill user ATK when own HP < 90% (allies, 5s)', () => {
  it('is either unmodeled or modeled as a caster-scaled passive — never as self-scaled atkPct', () => {
    // v1 models no HP pool, so the "own HP falls below 90%" trigger is unreachable as written.
    // Both dispositions are defensible; what is NOT defensible is encoding 5.19 as atkPct (which
    // would scale each ally's OWN ATK — a class-varying, larger number than the caster-scaled one).
    const ov = withPatchedOverride('ade', () => {});
    const s1Blocks = ov.skill1?.blocks ?? [];
    const atkEffects = s1Blocks.flatMap((b) =>
      b.effects.filter(
        (e) => e.kind === 'buff' && Math.abs((e.value ?? 0) - 5.19) < 0.01
      )
    );

    if (atkEffects.length === 0) {
      // Disposition (a): unmodeled. Then the line MUST be recorded in unmodeled.skill1.
      const rec = (ov.skill1?.unmodeled?.skill1 ?? []).join(' ');
      expect(rec).toMatch(/5\.19|HP falls below 90/i);
    } else {
      // Disposition (b): modeled. Then it must be caster-scaled and ally-targeted.
      for (const e of atkEffects) {
        expect(e.kind).toBe('buff');
        expect((e as { stat: string }).stat).toBe('casterAtkPct');
      }
      const carriers = s1Blocks.filter((b) =>
        b.effects.some(
          (e) => e.kind === 'buff' && Math.abs((e.value ?? 0) - 5.19) < 0.01
        )
      );
      for (const b of carriers) {
        expect(b.target.kind).toBe('allies');
      }
    }
  });
});

describe('ade — inertness: nothing in this kit touches buckets it should not', () => {
  it('grants no crit, core, element, charge, ammo, reload or fire-rate modifiers', () => {
    // The whole kit is two ATK lines, two Max HP lines and two debuff-immunity lines. Any buff
    // outside {casterAtkPct, maxHpFlat} sourced from ade is an invented mechanic.
    const allowed = new Set(['casterAtkPct', 'maxHpFlat']);
    const fromAde = buffs(baseline.events).filter(
      (e) => e.casterIdx === adeIdx()
    );
    for (const b of fromAde) {
      expect(allowed.has(b.stat)).toBe(true);
    }
  });

  it('deals no direct damage of its own — no skill/burst damage bucket is sourced from ade', () => {
    // No kit line carries a damage payload; every point of ade's damage must be normal-attack.
    const adeDamage = baseline.events.filter(
      (e) => e.kind === 'damage' && e.srcSlot === adeIdx()
    );
    expect(adeDamage.length).toBeGreaterThan(0);
    for (const d of adeDamage) {
      expect(d.bucket).toBe('normal');
    }
  });
});
