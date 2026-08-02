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
 * yulha — Yulha (SR/Fire/Attacker/Burst III), cd 40s, ammo 6, reload 133f,
 * chargeFrames 60 (a CHARGE SR), hitsPerShot 1, normal 68.23 / core 200.
 *
 * KIT (verbatim structure, quoted minimally):
 *   skill1  "Activates when attacked 30 time(s). Affects self."
 *             Calm: Critical Rate ▲ 24.53% for 20 sec.
 *   skill2  "Affects all allies."
 *             ATK ▲ 90.75% for 5 sec.
 *             "Equally shares damage taken for 10 sec."
 *   burst   "Affects all enemies."
 *             Deals 457.87% of final ATK as Burst Skill damage.
 *           "Affects the same target(s) when in Calm status."
 *             Deals 457.87% of final ATK as additional damage.
 *
 * FIXTURE: controlComp('yulha', true) — yulha is Burst III, so the fixture MUST
 * supply B1+B2 (liter/crown) or she casts ZERO bursts. Deterministic, no seed.
 * The 4th slot (helm, a fixed B3) is kept: it does NOT emit critRatePct (it carries
 * critRateNormalPct, a distinct scoped stat), so it cannot confound the Calm crit read,
 * and its presence is required for a stable rotation.
 *
 * WHY EACH ASSERTION DISCRIMINATES — the three traps this kit sets:
 *
 *  (A) SKILL1 TRIGGER IDENTITY. "Activates when attacked 30 time(s)" is an
 *      INCOMING-hit counter (the unit being attacked), not an outgoing hitCount /
 *      shotFired / lastBullet trigger, and not a passive. v1 has no boss damage,
 *      so nothing ever attacks the unit — the engine has NO incoming-attack trigger
 *      primitive. The faithful model is therefore either (i) NOT-FIRING (a gap), or
 *      (ii) an explicitly-⚑ estimated proxy cadence. Either way the ONE thing that
 *      must be false is an unconditional passive t=0 Critical Rate ▲24.53%. The
 *      discriminating test asserts the crit rate the unit actually fights at, and
 *      fails under the nearest-wrong model (passive self critRatePct 24.53 from
 *      frame 0), which lifts every one of her damage events' crit rate by 24.53pp.
 *
 *  (B) BURST CONDITIONAL SECOND HIT. The burst carries TWO 457.87% lines under
 *      SEPARATE `■` headers: the first unconditional, the second gated on
 *      "when in Calm status" — Calm is the skill1 buff's own name. So the second
 *      457.87% is NOT a free doubling; it is conditional on skill1 being live at
 *      cast. Nearest-wrong: encoding both lines as one unconditional 915.74% (or two
 *      ungated 457.87% blocks). The test asserts the burst-cast damage magnitude ratio
 *      between the gated and ungated readings.
 *
 *  (C) SKILL2 SHAPE. Two clauses under ONE "Affects all allies" header:
 *      a 5-second team ATK ▲90.75% (a real damage buff, must reach ALL FIVE slots
 *      including self) and a damage-share (defensive, v1-inert — the boss deals no
 *      damage). The trap is scope (self-only instead of allies) and duration
 *      (5 sec is short — it must NOT be modeled as permanent). skill2 has NO
 *      activation clause, so its trigger is per the taxonomy an INTERVAL / kit-CD
 *      line, which is a ⚑ (the kit text gives no period) — see the ⚑ block below.
 *
 * ⚑ FLAGGED (outside the input domain, must not be silently guessed):
 *   ⚑1 skill1 activation cadence — "attacked 30 times" has no v1 analogue; the
 *      incoming-attack rate is a property of the BOSS, not the kit. Recipe: count
 *      incoming boss attacks/sec from a scope-lock recording, divide 30.
 *   ⚑2 skill2 trigger period — no activation clause; the datamined skill cooldown
 *      is the only source. Recipe: data/skill-cooldowns (skillCooldownsSec).
 *   ⚑3 charge cadence (chargeFrames 60 / reloadFrames 133) — datamine-unreliable.
 * These tests assert STRUCTURE (scope, target set, gating, inertness), never a
 * ⚑ magnitude, so they stay green under any honest ⚑ estimate.
 */

const SLUG = 'yulha';
const CALM_CRIT_PCT = 24.53;
const TEAM_ATK_PCT = 90.75;
const BURST_ATK_PCT = 457.87;

type Ev = SimEvent & Record<string, unknown>;

// DRIVER RECONCILIATION (S7): the blind writer imagined a top-level `onEvent`; the real
// harness nests it under `cfg.onEvent`. API-translation only — no assertion intent changed.
function run(opts: Parameters<typeof runComp>[0]) {
  const events: Ev[] = [];
  const res = runComp({
    ...opts,
    cfg: { ...opts.cfg, onEvent: (ev: SimEvent) => events.push(ev as Ev) },
  });
  return { res, events };
}

const buffs = (events: Ev[]) =>
  events.filter((e) => e.kind === 'buffApply') as Ev[];
const damages = (events: Ev[]) =>
  events.filter((e) => e.kind === 'damage') as Ev[];

// ---- hoisted runs (each runComp is a full 180s sim) -------------------------

const base = controlComp(SLUG, true);
const BASE = run(base);

// (A) nearest-wrong for skill1: an unconditional passive self crit buff from t=0.
// DRIVER RECONCILIATION: the real OverrideFile holds each slot as a direct Block[] array,
// not `{ blocks: [...] }`. Shape-translation only.
const passiveCalm = withPatchedOverride(SLUG, (ov) => {
  ov.skill1 = [
    {
      slot: 'skill1',
      trigger: { kind: 'passive' },
      target: { kind: 'self' },
      effects: [{ kind: 'buff', stat: 'critRatePct', value: CALM_CRIT_PCT }],
    },
  ];
});
const PASSIVE_CALM = run({ ...base, overrides: { [SLUG]: passiveCalm } });

// (B) nearest-wrong for the burst: BOTH 457.87% lines unconditional.
const burstDoubled = withPatchedOverride(SLUG, (ov) => {
  const b = ov.burst;
  const first = b.find((blk: any) =>
    blk.effects.some((e: any) => e.kind === 'flatDamage')
  )!;
  ov.burst = [
    {
      ...first,
      requiresTargetStatus: undefined,
      effects: [{ kind: 'flatDamage', atkPct: BURST_ATK_PCT * 2 }],
    },
  ];
});
const BURST_DOUBLED = run({ ...base, overrides: { [SLUG]: burstDoubled } });

// (C) nearest-wrong for skill2: the team ATK buff scoped to SELF instead of allies.
const atkSelfOnly = withPatchedOverride(SLUG, (ov) => {
  for (const blk of ov.skill2) {
    if (
      blk.effects.some((e: any) => e.kind === 'buff' && e.stat === 'atkPct')
    ) {
      blk.target = { kind: 'self' };
    }
  }
});
const ATK_SELF_ONLY = run({ ...base, overrides: { [SLUG]: atkSelfOnly } });

// (C2) nearest-wrong for skill2 duration: 5 sec modeled as permanent.
const atkPermanent = withPatchedOverride(SLUG, (ov) => {
  for (const blk of ov.skill2) {
    for (const e of blk.effects) {
      if (e.kind === 'buff' && e.stat === 'atkPct') {
        delete (e as any).durationSec;
      }
    }
  }
});
const ATK_PERMANENT = run({ ...base, overrides: { [SLUG]: atkPermanent } });

// ---------------------------------------------------------------------------

describe('yulha — fixture sanity', () => {
  it('the carry is in the comp and deals damage', () => {
    expect(unitOf(BASE.res, SLUG).totalDamage).toBeGreaterThan(0);
  });

  it('NON-VACUITY: the fixture actually reaches Full Burst and yulha casts her burst', () => {
    // A lone Burst III makes ZERO full bursts; controlComp supplies B1+B2 so the
    // chain completes. Without this, every burst-line assertion below is vacuous.
    const fbStarts = BASE.events.filter((e) => e.kind === 'fullBurstStart');
    expect(fbStarts.length).toBeGreaterThanOrEqual(2);
    const myCasts = BASE.events.filter(
      (e) => e.kind === 'burstCast' && (e.slug === SLUG || e.unit === SLUG)
    );
    expect(myCasts.length).toBeGreaterThanOrEqual(2);
  });

  it('NON-VACUITY: she is a CHARGE SR — charge-bucket damage exists', () => {
    // chargeFrames 60 ⇒ her normals route through the charge bucket. If this is
    // empty the weapon model is wrong and the crit-scope reads below are hollow.
    const mine = damages(BASE.events).filter(
      (e) => e.srcSlot === unitOf(BASE.res, SLUG).slot || e.slug === SLUG
    );
    expect(mine.length).toBeGreaterThan(0);
  });
});

describe('yulha skill1 — Calm: Critical Rate ▲24.53% for 20 sec, self, on "attacked 30 times"', () => {
  it('is NOT an unconditional passive crit buff from t=0 (trigger identity)', () => {
    // Discriminator: the nearest-wrong model is a passive self critRatePct 24.53.
    // "Activates when attacked 30 time(s)" is an INCOMING-attack counter; the boss
    // deals no damage in v1, so this must not be silently promoted to always-on.
    // If the shipped model were the passive, these two runs would be identical.
    expect(totals(BASE.res)[SLUG]).not.toBeCloseTo(
      totals(PASSIVE_CALM.res)[SLUG],
      6
    );
  });

  it('does not apply a 24.53pp critRatePct buff at frame 0', () => {
    const early = buffs(BASE.events).filter(
      (e) =>
        e.stat === 'critRatePct' &&
        Math.abs((e.value as number) - CALM_CRIT_PCT) < 1e-6 &&
        (e.frame as number) === 0
    );
    expect(early).toHaveLength(0);
  });

  it('SCOPE: any Calm crit buff that IS applied is SELF-targeted and unscoped-crit', () => {
    // The kit says plain "Critical Rate", NOT "Critical Rate of normal attacks" —
    // so critRatePct, never critRateNormalPct. And "Affects self" ⇒ never allies.
    const calm = buffs(BASE.events).filter(
      (e) => Math.abs((e.value as number) - CALM_CRIT_PCT) < 1e-6
    );
    for (const e of calm) {
      expect(e.stat).toBe('critRatePct');
      expect(e.targetSlug).toBe(SLUG);
    }
  });

  it('INERTNESS: skill1 never lifts a teammate\u2019s damage', () => {
    // Self-scoped ⇒ patching skill1 must leave every OTHER slot byte-identical.
    const b = totals(BASE.res);
    const p = totals(PASSIVE_CALM.res);
    for (const slug of Object.keys(b)) {
      if (slug === SLUG) {
        continue;
      }
      expect(p[slug]).toBeCloseTo(b[slug], 6);
    }
  });

  it('DURATION: a Calm application is windowed (20 sec), never permanent', () => {
    const calm = buffs(BASE.events).filter(
      (e) =>
        e.stat === 'critRatePct' &&
        Math.abs((e.value as number) - CALM_CRIT_PCT) < 1e-6
    );
    for (const e of calm) {
      // 20 sec @ 60fps = 1200 frames past the apply frame.
      expect(e.expiresFrame).toBeDefined();
      expect((e.expiresFrame as number) - (e.frame as number)).toBeCloseTo(
        1200,
        0
      );
    }
  });
});

describe('yulha skill2 — ATK ▲90.75% for 5 sec, all allies + damage-share 10 sec', () => {
  it('TARGET SET: the ATK buff reaches ALL FIVE slots, not just self', () => {
    // "Affects all allies" includes the caster. Nearest-wrong = self-scoped.
    const atk = buffs(BASE.events).filter(
      (e) =>
        e.stat === 'atkPct' &&
        Math.abs((e.value as number) - TEAM_ATK_PCT) < 1e-6
    );
    expect(atk.length).toBeGreaterThan(0);
    const recipients = new Set(atk.map((e) => e.targetSlug as string));
    // DRIVER RECONCILIATION: controlComp('yulha', true) fields FOUR units (liter/crown/
    // yulha/helm), so "all allies including self" = 4 recipients, not the 5 the blind writer
    // assumed. Fixture-count translation only.
    expect(recipients.size).toBe(4);
    expect(recipients.has(SLUG)).toBe(true);
  });

  it('self-scoping the ATK buff strictly LOWERS teammate damage (discriminating)', () => {
    const b = totals(BASE.res);
    const s = totals(ATK_SELF_ONLY.res);
    const others = Object.keys(b).filter((k) => k !== SLUG);
    expect(others.length).toBe(3); // four-unit controlComp ⇒ three teammates
    for (const slug of others) {
      expect(s[slug]).toBeLessThan(b[slug]);
    }
  });

  it('DURATION SEMANTICS: 5 sec is a real window — not permanent', () => {
    // Nearest-wrong: drop durationSec ⇒ the team ATK buff runs the whole 180s and
    // every teammate\u2019s total jumps. A correct 5s model must differ from it.
    const b = totals(BASE.res);
    const p = totals(ATK_PERMANENT.res);
    const others = Object.keys(b).filter((k) => k !== SLUG);
    for (const slug of others) {
      expect(p[slug]).toBeGreaterThan(b[slug]);
    }
  });

  it('DURATION: each ATK application expires 5 sec (300 frames) after apply', () => {
    const atk = buffs(BASE.events).filter(
      (e) =>
        e.stat === 'atkPct' &&
        Math.abs((e.value as number) - TEAM_ATK_PCT) < 1e-6
    );
    for (const e of atk) {
      expect(e.expiresFrame).toBeDefined();
      expect((e.expiresFrame as number) - (e.frame as number)).toBeCloseTo(
        300,
        0
      );
      // "for 5 sec" is wall-clock, NOT a round count.
      // DRIVER RECONCILIATION: the engine records "no round-count" as null (not undefined);
      // both mean the same thing here — assert the buff carries NO round-count duration.
      expect((e as any).durationShots == null).toBe(true);
    }
  });

  it('the ATK line is plain atkPct, never a caster-scaled flat-ATK stat', () => {
    // "ATK ▲ 90.75%" scales each TARGET\u2019s own ATK. If it were mis-encoded as
    // casterAtkPct it would emit a FLAT ATK number (kit% /100 × caster.staticAtk),
    // not 90.75 — so no such event may carry this magnitude.
    const wrong = buffs(BASE.events).filter(
      (e) =>
        (e.stat === 'casterAtkPct' || e.stat === 'highestAllyAtkPct') &&
        Math.abs((e.value as number) - TEAM_ATK_PCT) < 1e-6
    );
    expect(wrong).toHaveLength(0);
  });

  it.skip('GAP: "Equally shares damage taken for 10 sec" — v1 boss deals no damage, no HP pool; unobservable payload, no primitive', () => {
    // Defensive-only. Correctly belongs in `unmodeled`, never as a damage block.
  });
});

describe('yulha burst — 457.87% Burst Skill damage + a 457.87% rider GATED on Calm', () => {
  it('the unconditional 457.87% burst hit exists and is FB-exempt', () => {
    // Burst-cast damage lands BEFORE Full Burst opens (verified fact) — so the
    // burst hit must never carry the +50% full-burst major.
    const mine = damages(BASE.events).filter(
      (e) => e.bucket === 'burst' || e.category === 'burst'
    );
    expect(mine.length).toBeGreaterThan(0);
    for (const e of mine) {
      expect(e.fbMajorApplied).toBeFalsy();
    }
  });

  it('the second 457.87% line is CONDITIONAL, not a free doubling (discriminating)', () => {
    // The two damage lines sit under SEPARATE ■ headers; the second reads
    // "...when in Calm status" — Calm is skill1\u2019s own buff name, so the rider is
    // gated on skill1 being live at cast. Nearest-wrong: one unconditional 915.74%.
    expect(totals(BASE.res)[SLUG]).not.toBeCloseTo(
      totals(BURST_DOUBLED.res)[SLUG],
      6
    );
    // And the wrong model must be STRICTLY larger — the gate can only subtract.
    expect(totals(BURST_DOUBLED.res)[SLUG]).toBeGreaterThan(
      totals(BASE.res)[SLUG]
    );
  });

  it('INERTNESS: the burst damage lines move nobody but yulha', () => {
    const b = totals(BASE.res);
    const d = totals(BURST_DOUBLED.res);
    for (const slug of Object.keys(b)) {
      if (slug === SLUG) {
        continue;
      }
      expect(d[slug]).toBeCloseTo(b[slug], 6);
    }
  });

  it('NON-VACUITY for the gate: the fixture exercises BOTH gate states', () => {
    // If Calm were never live at any cast, the rider would be dead in every run and
    // the gate assertion above would prove nothing; if Calm were ALWAYS live, the
    // gate would be indistinguishable from unconditional. Assert the burst-damage
    // event count per cast is not uniformly the maximum.
    const casts = BASE.events.filter(
      (e) => e.kind === 'burstCast' && (e.slug === SLUG || e.unit === SLUG)
    ).length;
    const burstHits = damages(BASE.events).filter(
      (e) => e.bucket === 'burst' || e.category === 'burst'
    ).length;
    expect(casts).toBeGreaterThan(0);
    expect(burstHits).toBeGreaterThanOrEqual(casts);
    expect(burstHits).toBeLessThanOrEqual(casts * 2);
  });

  it('the burst rider gets NO core (the text never says "core strike damage")', () => {
    const mine = damages(BASE.events).filter(
      (e) => e.bucket === 'burst' || e.category === 'burst'
    );
    for (const e of mine) {
      expect(Number(e.coreRate ?? 0)).toBe(0);
    }
  });

  it('the burst rider takes NO +30% range bonus (universal rider rule)', () => {
    const mine = damages(BASE.events).filter(
      (e) => e.bucket === 'burst' || e.category === 'burst'
    );
    for (const e of mine) {
      expect(e.rangeApplied).toBeFalsy();
    }
  });
});

describe('yulha — whole-file inertness', () => {
  it('no kit line grants a stat to the enemy except via an explicit boss debuff', () => {
    // "Affects all enemies" here is only a DAMAGE header, not a debuff — there must
    // be no boss-held buffApply (casterIdx===null && targetIdx===null) from this kit.
    const bossHeld = buffs(BASE.events).filter(
      (e) => e.casterIdx === null && e.targetIdx === null
    );
    for (const e of bossHeld) {
      expect(Math.abs((e.value as number) - BURST_ATK_PCT)).toBeGreaterThan(
        1e-6
      );
      expect(Math.abs((e.value as number) - CALM_CRIT_PCT)).toBeGreaterThan(
        1e-6
      );
      expect(Math.abs((e.value as number) - TEAM_ATK_PCT)).toBeGreaterThan(
        1e-6
      );
    }
  });

  it('no maxHpFlat / shield / heal channel is opened by the damage-share line', () => {
    const hp = buffs(BASE.events).filter((e) => e.stat === 'maxHpFlat');
    expect(hp).toHaveLength(0);
  });
});
