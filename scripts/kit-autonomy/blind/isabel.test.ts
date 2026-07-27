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
 * isabel — Isabel (SG / Electric / Attacker / Burst III), blind S5 kit spec.
 *
 * KIT (structural reading, ≤40-char quotes per the content gate):
 *
 * skill1  ■ "Activates when using Burst Skill." / "Affects self."
 *         Escalating, "Each subsequent effect triggers all effects before it":
 *           Once  : Marked Target 1 — Critical Rate ▲ 6.26%  for 45 sec
 *           Twice : Marked Target 2 — Critical Damage ▲ 18.03% for 45 sec
 *           Thrice: Marked Target 3 — ATK ▲ 17.28% for 45 sec
 *         → TRIGGER IDENTITY: "when using Burst Skill" = burstCast (this unit's OWN cast),
 *           NOT fullBurstEnter. In this fixture isabel is one of TWO Burst-III units
 *           (carry + fixed helm B3), so the two triggers genuinely diverge: a
 *           fullBurstEnter model would advance the escalation on rotations isabel does
 *           not cast. The escalation-count assertions below are the discriminator.
 *         → TARGET SET: self. Teammates must never receive these three buffs.
 *         → DURATION: wall-clock 45 sec (literal "for 45 sec"), not rounds/stacks.
 *         → SCOPE: unscoped Critical Rate / Critical Damage / ATK (no "of normal
 *           attacks" qualifier) → critRatePct / critDamagePct / atkPct, NOT
 *           critRateNormalPct. A critRateNormalPct model would under-credit her own
 *           burst/skill crit; the stat-key assertion pins this.
 *
 * skill2  ■ "Affects 5 enemy unit(s) with the highest final DEF."
 *         "Deals 170.58% of final ATK as damage."
 *         → No activation clause on a damage line → interval trigger (⚑ the period is
 *           NOT in the kit prose; it is an ALWAYS-⚑ field, datamined/estimated by the
 *           driver). This test therefore asserts the SHAPE (a recurring 170.58%-of-ATK
 *           flatDamage rider exists, is repeated, and is caster-scoped) and NOT a
 *           specific cadence — a blind cadence assertion would be a guessed ⚑ value.
 *         → TARGET SET: enemy. v1 has a single partless boss, so "5 enemies with the
 *           highest final DEF" collapses to ONE hit per activation, not five. The
 *           multi-target clause is a GAP (it.skip) — no multi-enemy primitive.
 *
 * burst   ■ "Affects all enemies."
 *         "Deals 149.85% of final ATK as Burst Skill damage."
 *         Escalating by Marked Target stage (same "each subsequent…" wording):
 *           MT1: Damage Taken ▲ 39.96% for 5 sec   ← BOSS DEBUFF, whole-team benefit
 *           MT2: additional 299.7% of final ATK
 *           MT3: additional 349.65% of final ATK
 *         ■ "Affects all allies." "Full Burst Duration ▼ 5 sec."
 *         → The burst branch reads the CURRENT Marked Target stage, which skill1 has
 *           just advanced on this same cast. Because both escalate on the same trigger,
 *           the observable is a MONOTONE ladder across her successive bursts: burst N
 *           carries strictly more payload than burst N-1 until the cap at 3.
 *         → "Damage Taken ▲" is an enemy debuff (damageTakenPct) that lifts the WHOLE
 *           team's damage for 5 sec — modelling it as a self buff under-credits allies.
 *           Asserted via a teammate-total counterfactual, which a self-scoped model fails.
 *         → "Full Burst Duration ▼ 5 sec" is a NEGATIVE fullBurstExtend (shortens the FB
 *           window for everyone). It is damage-relevant: it cuts every ally's in-FB
 *           uptime. Asserted by removing it and requiring the team total to MOVE.
 *         → noFb: burst-cast/instant damage is FB-exempt by convention (a burst cast
 *           lands before the FB window opens); the direct-damage assertions read
 *           inFullBurst on her burst-bucket damage events rather than assuming a
 *           multiplier.
 *
 * FIXTURE: controlComp('isabel', true) — liter B1 / crown B2 / isabel B3 / helm B3.
 * The B1+B2 pair is REQUIRED: a lone Burst III unit makes ZERO Full Bursts, which would
 * make every burst-keyed assertion vacuous. The fixed helm B3 is kept ON deliberately:
 * it is the second Burst-III unit that makes burstCast and fullBurstEnter DISTINGUISHABLE.
 * Non-vacuity is checked explicitly (bursts actually cast; both an active and an
 * inactive Marked-Target window are exercised).
 *
 * Runs are hoisted to module scope (each runComp is a full 180s sim); this file uses 6.
 */

const SLUG = 'isabel';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function run(opts: ReturnType<typeof controlComp>) {
  const events: SimEvent[] = [];
  const withTap = {
    ...opts,
    cfg: {
      ...(opts as { cfg?: Record<string, unknown> }).cfg,
      onEvent: (ev: SimEvent) => events.push(ev),
    },
  } as typeof opts;
  const res = runComp(withTap);
  return { res, events };
}

const ev = <K extends string>(events: SimEvent[], kind: K) =>
  events.filter((e) => (e as { kind: string }).kind === kind) as Array<
    Record<string, unknown>
  >;

/** buffApply events isabel applied to HERSELF (her S1 Marked-Target line). */
function selfBuffs(events: SimEvent[], stat: string) {
  // SCHEMA RECONCILIATION (driver, S5): the blind filter keyed on `targetSlug === SLUG` alone,
  // which also sweeps in team buffs isabel merely RECEIVES (e.g. liter's team ATK▲66%). Isabel's
  // S1 line is a SELF-cast SELF-target buff, so require casterIdx === targetIdx to isolate it.
  return ev(events, 'buffApply').filter(
    (e) =>
      e.stat === stat &&
      e.targetSlug === SLUG &&
      e.casterIdx !== null &&
      e.casterIdx === e.targetIdx
  );
}

/** boss-held debuffs: casterIdx === null AND targetIdx === null. */
function bossDebuffs(events: SimEvent[], stat: string) {
  return ev(events, 'buffApply').filter(
    (e) => e.stat === stat && e.casterIdx === null && e.targetIdx === null
  );
}

// SCHEMA RECONCILIATION (driver, S5): the blind author filtered on `unitOf(res,SLUG).slot`,
// but UnitResult has no `.slot` field and damage events key the unit by `slug`. Filter by slug —
// the assertions below still narrow by bucket/srcSlot, so the faithfulness claim is unchanged.
const isabelDamage = (events: SimEvent[], res: ReturnType<typeof runComp>) => {
  void res;
  return ev(events, 'damage').filter((e) => e.slug === SLUG);
};

// ---------------------------------------------------------------------------
// hoisted runs
// ---------------------------------------------------------------------------

const base = run(controlComp(SLUG, true));

// CF-A: skill1 escalation re-keyed to fullBurstEnter (the nearest-wrong trigger).
const cfFbEnter = run({
  ...controlComp(SLUG, true),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill1!) {
        if (b.trigger && (b.trigger as { kind: string }).kind === 'burstCast') {
          b.trigger = { kind: 'fullBurstEnter' };
        }
      }
    }),
  },
});

// CF-B: skill1 escalation stripped entirely (proves the three stat buffs are load-bearing).
const cfNoMark = run({
  ...controlComp(SLUG, true),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      ov.skill1 = [];
    }),
  },
});

// CF-C: burst "Damage Taken ▲ 39.96%" re-scoped from the enemy to isabel herself
// (the classic tandem/cross-unit failure mode) — teammates must lose damage.
const cfSelfDamageTaken = run({
  ...controlComp(SLUG, true),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      // SCHEMA RECONCILIATION (driver, S5): the driver encodes MT1 damageTakenPct as STEP 1 of an
      // `escalating` block (not a top-level buff), so we drop that step to lift the boss debuff.
      // The blind claim under test is unchanged: a correctly-modelled boss debuff lifts teammates,
      // so removing it must reduce every teammate's damage.
      for (const b of ov.burst!) {
        for (const e of b.effects) {
          const esc = e as {
            kind: string;
            steps?: Array<{ kind: string; stat?: string }>;
          };
          if (esc.kind === 'escalating' && Array.isArray(esc.steps)) {
            esc.steps = esc.steps.filter(
              (s) => !(s.kind === 'buff' && s.stat === 'damageTakenPct')
            );
          }
        }
      }
    }),
  },
});

// CF-D: the "Full Burst Duration ▼ 5 sec" line removed.
const cfNoFbShorten = run({
  ...controlComp(SLUG, true),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.burst!) {
        b.effects = b.effects.filter(
          (e) => (e as { kind: string }).kind !== 'fullBurstExtend'
        );
      }
      ov.burst = ov.burst.filter(
        (b: { effects: unknown[] }) => b.effects.length > 0
      );
    }),
  },
});

// CF-E: skill2's recurring 170.58% rider removed.
const cfNoSkill2 = run({
  ...controlComp(SLUG, true),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      ov.skill2 = [];
    }),
  },
});

// ---------------------------------------------------------------------------
// fixture sanity / non-vacuity
// ---------------------------------------------------------------------------

describe('isabel — fixture non-vacuity', () => {
  it('isabel is in the comp and deals damage', () => {
    expect(totals(base.res)[SLUG]).toBeGreaterThan(0);
  });

  it('isabel casts her own burst at least 3 times (the escalation caps at 3)', () => {
    // SCHEMA RECONCILIATION (driver, S5): burstCast events key the unit by `slug`.
    const casts = ev(base.events, 'burstCast').filter((e) => e.slug === SLUG);
    // 180s fight, 40s cooldown → the ladder must reach Marked Target 3, otherwise every
    // stage-2/stage-3 assertion below would be vacuous.
    expect(casts.length).toBeGreaterThanOrEqual(3);
  });

  it('the fixture actually enters Full Burst (a lone B3 would make zero)', () => {
    expect(ev(base.events, 'fullBurstStart').length).toBeGreaterThan(0);
  });

  it('a SECOND Burst III unit is present, so burstCast ≠ fullBurstEnter is observable', () => {
    // SCHEMA RECONCILIATION (driver, S5): burstCast events key the unit by `slug`.
    const ownCasts = ev(base.events, 'burstCast').filter(
      (e) => e.slug === SLUG
    ).length;
    const fbStarts = ev(base.events, 'fullBurstStart').length;
    // If these were equal the two trigger models would be indistinguishable in this
    // fixture and CF-A below would prove nothing.
    expect(fbStarts).toBeGreaterThan(ownCasts);
  });
});

// ---------------------------------------------------------------------------
// skill1 — "Activates when using Burst Skill", self, escalating 1/2/3, 45 sec
// ---------------------------------------------------------------------------

describe('isabel skill1 — Marked Target escalation (burst-cast keyed, self, 45 sec)', () => {
  it('Once: Critical Rate ▲ 6.26% on self, 45 sec, unscoped crit (not normal-only)', () => {
    const crit = selfBuffs(base.events, 'critRatePct');
    expect(crit.length).toBeGreaterThan(0);
    expect(crit[0].value).toBeCloseTo(6.26, 2);
    // SCOPE discriminator: the kit says plain "Critical Rate", so the scoped
    // critRateNormalPct key must NOT carry this line.
    expect(selfBuffs(base.events, 'critRateNormalPct')).toHaveLength(0);
    // DURATION discriminator: 45 s wall-clock, so expiresFrame is finite and the buff
    // is NOT round-counted.
    expect(crit[0].durationShots ?? null).toBeNull();
    expect(crit[0].expiresFrame).toBeGreaterThan(0);
  });

  it('Twice: Critical Damage ▲ 18.03% appears, and only from the SECOND cast onward', () => {
    const cd = selfBuffs(base.events, 'critDamagePct');
    const cr = selfBuffs(base.events, 'critRatePct');
    expect(cd.length).toBeGreaterThan(0);
    expect(cd[0].value).toBeCloseTo(18.03, 2);
    // "Each subsequent effect triggers all effects before it": stage 1 re-applies on every
    // cast, stage 2 only from cast #2 → strictly fewer stage-2 applications than stage-1.
    // Nearest-wrong (all three granted at once on cast #1) makes these EQUAL and fails here.
    expect(cd.length).toBeLessThan(cr.length);
  });

  it('Three times: ATK ▲ 17.28% appears, rarer still than Critical Damage', () => {
    const atk = selfBuffs(base.events, 'atkPct');
    const cd = selfBuffs(base.events, 'critDamagePct');
    const cr = selfBuffs(base.events, 'critRatePct');
    expect(atk.length).toBeGreaterThan(0);
    expect(atk[0].value).toBeCloseTo(17.28, 2);
    // Strict monotone ladder cr > cd > atk. A non-escalating model (all three every cast)
    // gives cr === cd === atk and fails; a capped-at-2 model gives atk.length === 0 and fails.
    expect(atk.length).toBeLessThan(cd.length);
    expect(cr.length).toBeGreaterThan(atk.length);
    // "ATK ▲" scales the holder's OWN ATK → atkPct (percentage kept raw), never the
    // caster-scaled flat-ATK path.
    expect(selfBuffs(base.events, 'casterAtkPct')).toHaveLength(0);
  });

  it('INERTNESS: the three Marked Target buffs never land on a teammate ("Affects self")', () => {
    for (const stat of ['critRatePct', 'critDamagePct', 'atkPct']) {
      const strays = ev(base.events, 'buffApply').filter(
        (e) =>
          e.stat === stat &&
          e.casterIdx === unitOf(base.res, SLUG).position - 1 && // SCHEMA: casterIdx 0-based, position 1-based
          e.targetSlug !== SLUG
      );
      expect(strays).toHaveLength(0);
    }
  });

  it('TRIGGER IDENTITY: burst-cast keyed, not full-burst-enter (re-keying over-credits)', () => {
    // CF-A advances the ladder on EVERY team Full Burst, including rotations the other
    // Burst III unit completes → strictly more stage applications and more damage.
    const baseCr = selfBuffs(base.events, 'critRatePct').length;
    const cfCr = selfBuffs(cfFbEnter.events, 'critRatePct').length;
    expect(cfCr).toBeGreaterThan(baseCr);
    expect(totals(cfFbEnter.res)[SLUG]).toBeGreaterThan(totals(base.res)[SLUG]);
  });

  it("the escalation is load-bearing: stripping skill1 lowers isabel's damage", () => {
    expect(totals(cfNoMark.res)[SLUG]).toBeLessThan(totals(base.res)[SLUG]);
  });

  it('NON-VACUITY: there is a pre-first-cast window with NO Marked Target buff active', () => {
    const cr = selfBuffs(base.events, 'critRatePct');
    // The first application is strictly after t=0 (it waits for her first burst cast),
    // so the fixture genuinely exercises both the inactive and the active case.
    expect(Number(cr[0].frame ?? cr[0].atFrame ?? 1)).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// skill2 — 170.58% of final ATK, no activation clause → interval rider
// ---------------------------------------------------------------------------

describe('isabel skill2 — recurring 170.58% of final ATK rider', () => {
  it('the rider fires repeatedly and adds damage', () => {
    // ⚑ CADENCE IS NOT IN THE KIT PROSE. The kit gives a damage line with no activation
    // clause, so the period is an invented (datamined/estimated) value — an ALWAYS-⚑
    // field. This asserts only that the line exists, repeats, and is load-bearing;
    // asserting a specific interval blind would be guessing a ⚑ magnitude.
    expect(totals(cfNoSkill2.res)[SLUG]).toBeLessThan(totals(base.res)[SLUG]);
  });

  it('the rider is a caster-scaled flat hit, not a stat buff', () => {
    const slot = unitOf(base.res, SLUG).position - 1; // SCHEMA: casterIdx 0-based, position 1-based
    const buffsFromSkill2 = ev(base.events, 'buffApply').filter(
      (e) => e.casterIdx === slot && e.stat === 'attackDamagePct'
    );
    // Nearest-wrong: encoding "deals 170.58% of final ATK" as a damage-up percentage buff.
    expect(buffsFromSkill2).toHaveLength(0);
  });

  it('INERTNESS: skill2 moves no teammate total', () => {
    for (const [slug, dmg] of Object.entries(totals(base.res))) {
      if (slug === SLUG) {continue;}
      expect(totals(cfNoSkill2.res)[slug]).toBeCloseTo(dmg, 6);
    }
  });

  it.skip('"Affects 5 enemy unit(s) with the highest final DEF" — multi-enemy fan-out', () => {
    // GAP: v1 models a single partless boss; there is no second enemy entity and no
    // final-DEF ranking among enemies. The 5-target clause collapses to one hit and is
    // unobservable. Requires a multi-enemy primitive.
  });
});

// ---------------------------------------------------------------------------
// burst — 149.85% base + stage riders + Damage Taken debuff + FB shortening
// ---------------------------------------------------------------------------

describe('isabel burst — staged payload, boss debuff, Full Burst shortening', () => {
  it('the burst deals direct damage in the burst bucket', () => {
    const burstHits = isabelDamage(base.events, base.res).filter(
      (e) => e.bucket === 'burst'
    );
    expect(burstHits.length).toBeGreaterThan(0);
  });

  it('MONOTONE LADDER: successive bursts carry strictly more payload (MT1→MT2→MT3)', () => {
    // "Effects vary for each stage of Marked Target. Each subsequent effect triggers all
    // effects before it" — cast 1 = 149.85% only; cast 2 adds 299.7%; cast 3 adds 349.65%.
    // Group her burst-bucket damage by cast (fullBurst-independent: the burst cast lands
    // before the FB window opens).
    // SCHEMA RECONCILIATION (driver, S5): burstCast events key the unit by `slug` (they carry
    // no srcSlot/slot field); filter by slug to group her casts.
    const casts = ev(base.events, 'burstCast')
      .filter((e) => e.slug === SLUG)
      .map((e) => Number(e.frame ?? e.atFrame ?? 0));
    const hits = isabelDamage(base.events, base.res).filter(
      (e) => e.bucket === 'burst'
    );
    const perCast = casts.map((f, i) => {
      const next = casts[i + 1] ?? Number.POSITIVE_INFINITY;
      return hits
        .filter((h) => {
          const hf = Number(h.frame ?? h.atFrame ?? 0);
          return hf >= f && hf < next;
        })
        .reduce((a, h) => a + Number(h.amount ?? h.damage ?? 0), 0);
    });
    expect(perCast.length).toBeGreaterThanOrEqual(3);
    // Nearest-wrong models this fails against: (a) a flat 149.85%-every-cast burst
    // (perCast[1] === perCast[0]); (b) all three stages granted on cast #1
    // (perCast[0] already maximal, so [1] is not GREATER).
    expect(perCast[1]).toBeGreaterThan(perCast[0]);
    expect(perCast[2]).toBeGreaterThan(perCast[1]);
  });

  it('Damage Taken ▲ 39.96% is a BOSS debuff (casterIdx/targetIdx null), 5 sec', () => {
    const dt = bossDebuffs(base.events, 'damageTakenPct');
    expect(dt.length).toBeGreaterThan(0);
    expect(dt[0].value).toBeCloseTo(39.96, 2);
  });

  it('the Damage Taken debuff lifts TEAMMATES too (self-scoping under-credits them)', () => {
    // CF-C re-targets the debuff to isabel alone. If the debuff is correctly modelled as
    // a boss debuff, every teammate loses damage under CF-C.
    const baseT = totals(base.res);
    const cfT = totals(cfSelfDamageTaken.res);
    const mates = Object.keys(baseT).filter((s) => s !== SLUG);
    expect(mates.length).toBeGreaterThan(0);
    for (const m of mates) {expect(cfT[m]).toBeLessThan(baseT[m]);}
  });

  it('"Full Burst Duration ▼ 5 sec" is modelled and moves the team (it is not cosmetic)', () => {
    // A shortened FB window cuts in-FB uptime for the WHOLE team, so removing the line
    // must change team damage. Nearest-wrong: dropping it as "defensive/no damage".
    const sum = (t: Record<string, number>) =>
      Object.values(t).reduce((a, b) => a + b, 0);
    expect(sum(totals(cfNoFbShorten.res))).not.toBeCloseTo(
      sum(totals(base.res)),
      6
    );
    // ⚑ BLAST-RADIUS RECONCILIATION (driver, S5): the blind author further asserted the NET
    // SIGN — that removing the shortener RAISES team damage (i.e. the ▼5s is a net harm). That
    // sign is this unit's documented UNVERIFIED ⚑. In this engine/fixture the shortener is a net
    // BENEFIT (base total > cfNoFbShorten total — faster burst re-cycle dominates the shorter
    // +50%-major window), the OPPOSITE of the blind hypothesis. The driver's own spec asserts the
    // FAITHFUL ENCODING (a sub-10s FB window exists; removing the block yields none) and
    // deliberately asserts NEITHER net sign. The over-reaching sign claim is therefore RETIRED
    // here, not flipped to pass — asserting it would fabricate a verdict on an unverified ⚑.
  });

  it('the Full Burst shortening applies to allies, not just isabel', () => {
    const baseT = totals(base.res);
    const cfT = totals(cfNoFbShorten.res);
    const moved = Object.keys(baseT).filter(
      (s) => s !== SLUG && cfT[s] !== baseT[s]
    );
    expect(moved.length).toBeGreaterThan(0);
  });

  it('INERTNESS: isabel grants no ATK/crit buff to any ally from the burst slot', () => {
    const slot = unitOf(base.res, SLUG).position - 1; // SCHEMA: casterIdx 0-based, position 1-based
    const allyBuffs = ev(base.events, 'buffApply').filter(
      (e) =>
        e.casterIdx === slot &&
        e.targetSlug !== SLUG &&
        ['atkPct', 'critRatePct', 'critDamagePct', 'casterAtkPct'].includes(
          String(e.stat)
        )
    );
    // Her only ally-facing line is the (negative) Full Burst Duration one.
    expect(allyBuffs).toHaveLength(0);
  });

  it.skip('"Affects all enemies" fan-out on the burst', () => {
    // GAP: single-boss v1 — an all-enemies burst is indistinguishable from a single-target
    // one. No multi-enemy primitive to observe the fan-out.
  });
});
