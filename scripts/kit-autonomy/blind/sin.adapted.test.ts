import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js'; // path fixed 2026-08-05 (driver, mechanical): blind/ sits under kit-autonomy/, not tests/units/ — no assertion changed

/**
 * sin — ADAPTED copy of the S5 blind spec (driver, 2026-08-05). The raw evidence file
 * (sin.test.ts) crashes at module load on four RECON_ERROR classes; this copy applies
 * MECHANICAL-ONLY fixes so the blind SPEC assertions actually execute against the driver
 * override. NO assertion value, comparison, or semantic claim was changed. Adaptations:
 *   A1 override shape: the blind model assumed ov.<slot>.blocks containers; the real
 *      OverrideFile shape is a bare block array per slot (ov.skill1 = [...]) — rewired
 *      every patch/iteration accordingly.
 *   A2 sinIdx(): UnitResult has no .slot field — .position is 1-based, so slot = position-1.
 *   A3 unit attribution: burstCast/reload/shot events carry slug/unitIdx, not srcSlot;
 *      damage.srcSlot is the KIT SLOT name ('burst'/'skill1'…), not a unit index —
 *      re-pointed those filters to e.slug === 'sin'.
 *   A4 UnitResult.buckets → .breakdown (the real field name).
 *   A5 FIXTURE: controlComp('sin', true) seats crown (B2, 20s) ahead of sin — same-stage
 *      slot-first selection starves sin to ZERO casts (the blind-fixture artifact the nero
 *      judge classified; S2b predicted it). Swapped to the driver's sole-B2 fixture
 *      ['liter','sin','helm'], boss Water (her Electric major), focus sin. Every spec
 *      assertion runs unchanged on that fixture.
 *
 * BLIND spec test written from kit prose alone (S5 cross-family post-op role).
 *
 * KIT (structural read):
 *
 * skill1 — trigger "Activates when firing the last bullet", target self.
 *   (a) "Duplicate 15.03% Max HP of ally with the highest Max HP, lasts for 5 sec."
 *       → a Max HP grant scaled off the HIGHEST ally's Max HP, 5 sec, self-only.
 *       Schema has NO `highestAllyMaxHpPct` StatKey. The nearest primitives are
 *       casterMaxHpPct (% of CASTER Max HP) and targetMaxHpPct (% of TARGET's own).
 *       Both are the WRONG basis when some other ally is the Max-HP leader.
 *       Sin is a Defender (typically the Max-HP leader herself) so on THIS fixture
 *       caster/target/highest may coincide — that coincidence is exactly why the
 *       assertions below pin the TRIGGER + DURATION + emitted stat ('maxHpFlat')
 *       and NOT the basis identity, and why the basis is filed as a GAP.
 *   (b) "Attract: Taunt all enemies for 5 sec." → defensive aggro. No enemy entity
 *       in v1 (resolveTargets({kind:'enemy'}) returns []); boss deals no damage.
 *       UNMODELED — assert it moves nothing.
 *
 * skill2 — two blocks.
 *   (a) "Activates when Full Burst ends" / self: "Burst Gauge filling speed ▲16.17%
 *       for 5 sec" → fullBurstEnd trigger + burstGenPct 16.17, durationSec 5, self.
 *       Trigger identity matters: fullBurstEnd fires on ANY team Full Burst end, NOT
 *       on Sin's own burst cast. Nearest-wrong = fullBurstEnter / burstCast.
 *   (b) "Activates when using Burst Skill" / self, escalating ("Each subsequent effect
 *       triggers all effects before it"):
 *         Once:  Recover 15.3% of attack damage as HP for 5 sec  → lifesteal, no HP
 *                pool at scope lock; emits recovery (heal) or is unmodeled.
 *         Twice: Incoming healing ▲51% for 5 sec → no schema StatKey; healing amount
 *                is unmodeled in v1. GAP.
 *         Three: DEF ▲43.2% for 5 sec → defPct, documented inert (self DEF does not
 *                affect own damage).
 *       TRIGGER IDENTITY IS THE LOAD-BEARING CLAIM: "when using Burst Skill" = the
 *       OWNER's burstCast, so on a rotation where a DIFFERENT unit bursts, the
 *       counter must NOT advance. The escalating ladder means all three payloads are
 *       damage-inert at scope lock, so the whole block must be board-inert.
 *
 * burst —
 *   (a) "Activates when enemy unit(s) (excluding Nikkes) are more than 4. Affects all
 *       enemies. Damage Taken ▲12.23% for 5 sec." → a >4-enemy count gate. The solo
 *       raid boss is ONE enemy, so the gate is FALSE for the whole fight: this must
 *       be INERT. There is no enemy-count gate primitive in the schema; the faithful
 *       encoding is to omit the block (or author it unreachable) and record the line
 *       in `unmodeled`. Nearest-wrong = shipping an ungated damageTakenPct 12.23 on
 *       the boss, which would inflate the WHOLE TEAM's damage — the highest-leverage
 *       error in this kit, hence the strongest assertion in this file.
 *   (b) "Affects enemies within attack range. Deals 176.32% of final ATK as damage."
 *       → burst-cast flatDamage 176.32, target enemy. Per the noFb/range rider rule,
 *       burst-cast/instant damage is FB-exempt (lands before the FB window opens) and
 *       riders take no +30% range bonus.
 *
 * FIXTURE: controlComp('sin', true) — Sin is Burst II, so the control's B1 + B3 slots
 * supply a castable chain and Full Bursts genuinely occur (a lone unit makes ZERO).
 * Deterministic (no seed). All runs hoisted; 6 runComp calls total.
 */

type Ev = SimEvent & Record<string, unknown>;

// A5: driver's sole-B2 fixture (see header) — controlComp('sin', true) starves sin to 0 casts.
const COMP = {
  slugs: ['liter', 'sin', 'helm'],
  bossElement: 'Water' as const,
  focusSlug: 'sin',
};

function run(opts: { overrides?: Record<string, unknown> } = {}) {
  const events: Ev[] = [];
  const res = runComp({
    ...COMP,
    overrides: opts.overrides as never,
    cfg: { onEvent: (ev: SimEvent) => events.push(ev as Ev) },
  });
  return { res, events };
}

const SIN = 'sin';

// ---- hoisted runs -----------------------------------------------------------

// Baseline: the shipped override, unmodified.
const base = run();

// Counterfactual A: strip skill1 entirely (isolates the last-bullet Max HP grant).
const noS1 = run({
  overrides: {
    [SIN]: withPatchedOverride(SIN, (ov) => {
      if (ov.skill1) ov.skill1 = []; // A1
    }),
  },
});

// Counterfactual B: strip skill2 entirely (isolates the gauge-speed + escalating ladder).
const noS2 = run({
  overrides: {
    [SIN]: withPatchedOverride(SIN, (ov) => {
      if (ov.skill2) ov.skill2 = []; // A1
    }),
  },
});

// Counterfactual C: strip the burst slot (isolates the 176.32% burst hit).
const noBurst = run({
  overrides: {
    [SIN]: withPatchedOverride(SIN, (ov) => {
      if (ov.burst) ov.burst = []; // A1
    }),
  },
});

// Counterfactual D (NEAREST-WRONG): the >4-enemy Damage Taken debuff shipped UNGATED
// on the boss. This is what a parser that ignored the enemy-count clause would produce.
const wrongDmgTaken = run({
  overrides: {
    [SIN]: withPatchedOverride(SIN, (ov) => {
      ov.burst!.push({ // A1
        slot: 'burst',
        trigger: { kind: 'burstCast' },
        target: { kind: 'enemy' },
        effects: [
          { kind: 'buff', stat: 'damageTakenPct', value: 12.23, durationSec: 5 },
        ],
      } as never);
    }),
  },
});

// Counterfactual E (NEAREST-WRONG): the gauge-speed buff re-keyed from fullBurstEnd
// to fullBurstEnter. Same stat, same value, same duration — only the trigger differs.
const wrongGaugeTrigger = run({
  overrides: {
    [SIN]: withPatchedOverride(SIN, (ov) => {
      for (const b of ov.skill2 ?? []) { // A1
        if (
          b.trigger?.kind === 'fullBurstEnd' &&
          b.effects?.some(
            (e: { kind?: string; stat?: string }) =>
              e.kind === 'buff' && e.stat === 'burstGenPct',
          )
        ) {
          b.trigger = { kind: 'fullBurstEnter' };
        }
      }
    }),
  },
});

// ---- helpers ----------------------------------------------------------------

const sinIdx = () => unitOf(base.res, SIN).position - 1; // A2: UnitResult.position is 1-based; no .slot field

function buffApplies(events: Ev[], stat: string) {
  return events.filter((e) => e.kind === 'buffApply' && e.stat === stat);
}

function sinDamageEvents(events: Ev[]) {
  const idx = sinIdx();
  return events.filter((e) => e.kind === 'damage' && (e as { slug?: string }).slug === SIN); // A3: damage.srcSlot is a KIT-SLOT name, not a unit idx
}

// ============================================================================

describe('sin — fixture non-vacuity', () => {
  it('the control comp actually reaches Full Burst and Sin casts her own burst', () => {
    // Every trigger in this kit (fullBurstEnd, burstCast) is dead without these.
    const fbStarts = base.events.filter((e) => e.kind === 'fullBurstStart');
    const fbEnds = base.events.filter((e) => e.kind === 'fullBurstEnd');
    const sinCasts = base.events.filter(
      (e) => e.kind === 'burstCast' && e.slug === SIN, // A3
    );
    expect(fbStarts.length).toBeGreaterThan(1);
    expect(fbEnds.length).toBeGreaterThan(0);
    expect(sinCasts.length).toBeGreaterThanOrEqual(3);
  });

  it('Sin reloads more than once, so the last-bullet trigger fires repeatedly', () => {
    // 60-round magazine over 180s: the last-bullet trigger must be exercised many
    // times, otherwise every skill1 assertion below would be near-vacuous.
    const reloads = base.events.filter(
      (e) => e.kind === 'reload' && e.slug === SIN, // A3
    );
    expect(reloads.length).toBeGreaterThan(2);
  });
});

describe('sin skill1 — last-bullet Max HP duplication (15.03%, 5 sec, self)', () => {
  it('emits a self maxHpFlat grant, and it is keyed to the last bullet (not passive/burst)', () => {
    const idx = sinIdx();
    const grants = buffApplies(base.events, 'maxHpFlat').filter(
      (e) => e.casterIdx === idx && e.targetIdx === idx,
    );
    // Discriminates against: a passive/permanent encoding (which would emit exactly
    // once, at frame 0) and against a burstCast encoding (which would emit at most
    // once per Sin burst). The last-bullet trigger fires once per magazine, so the
    // count must exceed Sin's burst-cast count.
    const sinCasts = base.events.filter(
      (e) => e.kind === 'burstCast' && e.srcSlot === idx,
    ).length;
    expect(grants.length).toBeGreaterThan(1);
    expect(grants.length).toBeGreaterThan(sinCasts);
  });

  it('the grant count equals Sin\u2019s reload count (one per magazine, not per shot)', () => {
    const idx = sinIdx();
    const grants = buffApplies(base.events, 'maxHpFlat').filter(
      (e) => e.casterIdx === idx && e.targetIdx === idx,
    );
    const shots = base.events.filter(
      (e) => e.kind === 'shot' && e.slug === SIN, // A3
    ).length;
    // Discriminates against a shotFired encoding: 60 rounds per magazine means a
    // per-shot trigger would emit ~60x more often than a per-magazine one.
    expect(shots).toBeGreaterThan(grants.length * 10);
  });

  it('the grant carries a 5-second window, not permanent and not \u201Cfor N rounds\u201D', () => {
    const idx = sinIdx();
    const grants = buffApplies(base.events, 'maxHpFlat').filter(
      (e) => e.casterIdx === idx && e.targetIdx === idx,
    );
    const first = grants[0];
    expect(first).toBeDefined();
    // Kit says "lasts for 5 sec" — a wall-clock window. Discriminates against a
    // durationShots (round-count) encoding and against an omitted duration.
    expect(first.durationShots).toBeUndefined();
    expect(typeof first.expiresFrame).toBe('number');
    // 5 sec at 60fps = 300 frames from the apply frame. Allow +/- 2 frames of
    // trigger-dispatch slack; a 10s or permanent encoding fails this outright.
    const applied = (first.frame as number) ?? 0;
    expect((first.expiresFrame as number) - applied).toBeGreaterThanOrEqual(298);
    expect((first.expiresFrame as number) - applied).toBeLessThanOrEqual(302);
  });

  it('the Max HP grant is offensively INERT on this comp (no HP-scaling consumer)', () => {
    // Sin has no atkOfMaxHpPct line, and ally-granted Max HP never feeds a
    // teammate's conversion (e3 rule). So stripping skill1 must not move ANY
    // unit's damage. This is the assertion that would go RED if a future author
    // mis-encoded the HP duplication as an ATK grant.
    expect(totals(noS1.res)).toEqual(totals(base.res));
  });

  it('skill1 moves no teammate byte (self-scoped target set)', () => {
    const idx = sinIdx();
    const grants = buffApplies(base.events, 'maxHpFlat');
    // "Affects self" — every emitted grant from Sin targets Sin. Discriminates
    // against an `allies` target set, which the phrase "of ally with the highest
    // Max HP" invites mis-reading as an ALLY target rather than an ally BASIS.
    for (const g of grants.filter((e) => e.casterIdx === idx)) {
      expect(g.targetIdx).toBe(idx);
    }
  });

  it.skip('GAP: the grant\u2019s basis is the HIGHEST ALLY\u2019s Max HP, not the caster\u2019s or the target\u2019s', () => {
    // No `highestAllyMaxHpPct` StatKey exists (contrast highestAllyAtkPct, which
    // does). casterMaxHpPct and targetMaxHpPct both resolve off the wrong unit
    // whenever some other ally out-HPs Sin. Sin is a Defender and is usually the
    // Max-HP leader, so the three bases coincide on most comps and the divergence
    // is UNOBSERVABLE on this fixture. Un-skip once either (a) a
    // highestAllyMaxHpPct StatKey lands, or (b) a fixture with a higher-Max-HP
    // ally exists to discriminate the basis.
  });

  it.skip('GAP: \u201CAttract: Taunt all enemies for 5 sec\u201D has no observable payload', () => {
    // Aggro/threat is unmodeled: the v1 boss deals no damage and there is no enemy
    // entity to redirect. Purely defensive, correctly recorded in `unmodeled`.
  });
});

describe('sin skill2a — Burst Gauge filling speed \u25B216.17% for 5s on Full Burst END', () => {
  it('emits a self burstGenPct buff of exactly 16.17 with a 5-second window', () => {
    const idx = sinIdx();
    const gauge = buffApplies(base.events, 'burstGenPct').filter(
      (e) => e.casterIdx === idx && e.targetIdx === idx,
    );
    expect(gauge.length).toBeGreaterThan(0);
    // burstGenPct is a plain percentage stat — the raw kit number is emitted, NOT
    // a flat-resolved value (contrast casterAtkPct). Discriminates a magnitude slip.
    expect(gauge[0].value).toBeCloseTo(16.17, 5);
    const applied = (gauge[0].frame as number) ?? 0;
    expect((gauge[0].expiresFrame as number) - applied).toBeGreaterThanOrEqual(298);
    expect((gauge[0].expiresFrame as number) - applied).toBeLessThanOrEqual(302);
  });

  it('fires at Full Burst END, never at Full Burst START (trigger identity)', () => {
    const idx = sinIdx();
    const gauge = buffApplies(base.events, 'burstGenPct').filter(
      (e) => e.casterIdx === idx && e.targetIdx === idx,
    );
    const fbEndFrames = new Set(
      base.events
        .filter((e) => e.kind === 'fullBurstEnd')
        .map((e) => e.frame as number),
    );
    const fbStartFrames = new Set(
      base.events
        .filter((e) => e.kind === 'fullBurstStart')
        .map((e) => e.frame as number),
    );
    // Every application must coincide with an END frame and none with a START
    // frame. This is the assertion that goes RED under the fullBurstEnter mis-key.
    for (const g of gauge) {
      expect(fbEndFrames.has(g.frame as number)).toBe(true);
      expect(fbStartFrames.has(g.frame as number)).toBe(false);
    }
  });

  it('the fullBurstEnter mis-key is DISCRIMINATED (different frames, and it fires first)', () => {
    const idx = sinIdx();
    const good = buffApplies(base.events, 'burstGenPct')
      .filter((e) => e.casterIdx === idx)
      .map((e) => e.frame as number);
    const bad = buffApplies(wrongGaugeTrigger.events, 'burstGenPct')
      .filter((e) => e.casterIdx === idx)
      .map((e) => e.frame as number);
    expect(bad.length).toBeGreaterThan(0);
    // The nearest-wrong model applies the SAME stat at the SAME magnitude — only
    // the frames differ (enter precedes end by the full-burst duration). If these
    // frame lists were equal, the trigger assertion above would be vacuous.
    expect(bad).not.toEqual(good);
    expect(bad[0]).toBeLessThan(good[0]);
  });

  it('the gauge buff is self-scoped \u2014 no teammate receives burstGenPct from Sin', () => {
    const idx = sinIdx();
    for (const g of buffApplies(base.events, 'burstGenPct').filter(
      (e) => e.casterIdx === idx,
    )) {
      expect(g.targetIdx).toBe(idx);
    }
  });
});

describe('sin skill2b — escalating burst-cast ladder (Once/Twice/Three times)', () => {
  it('the ladder is keyed to Sin\u2019s OWN burst cast, not to team Full Burst entry', () => {
    const idx = sinIdx();
    // Any buff Sin applies to herself from the escalating ladder (defPct is the
    // only damage-schema-visible payload) must land on a frame where Sin cast.
    const castFrames = new Set(
      base.events
        .filter((e) => e.kind === 'burstCast' && e.slug === SIN) // A3
        .map((e) => e.frame as number),
    );
    const def = buffApplies(base.events, 'defPct').filter(
      (e) => e.casterIdx === idx && e.targetIdx === idx,
    );
    // Non-vacuity: the ladder must have reached step 3 at least once in 180s.
    expect(def.length).toBeGreaterThan(0);
    for (const d of def) {
      expect(castFrames.has(d.frame as number)).toBe(true);
    }
  });

  it('escalation is monotone: DEF (step 3) never precedes the first burst cast, and appears strictly later than step 1', () => {
    const idx = sinIdx();
    const casts = base.events
      .filter((e) => e.kind === 'burstCast' && e.slug === SIN) // A3
      .map((e) => e.frame as number)
      .sort((a, b) => a - b);
    const def = buffApplies(base.events, 'defPct')
      .filter((e) => e.casterIdx === idx && e.targetIdx === idx)
      .map((e) => e.frame as number)
      .sort((a, b) => a - b);
    // "Three times" cannot land on the 1st or 2nd cast. Discriminates against a
    // flattened (non-escalating) encoding that applies all three payloads at once.
    expect(def[0]).toBeGreaterThanOrEqual(casts[2]);
  });

  it('the DEF buff carries 43.2 for 5 sec and is damage-inert (defPct is inert in v1)', () => {
    const idx = sinIdx();
    const def = buffApplies(base.events, 'defPct').filter(
      (e) => e.casterIdx === idx && e.targetIdx === idx,
    );
    expect(def[0].value).toBeCloseTo(43.2, 5);
    const applied = (def[0].frame as number) ?? 0;
    expect((def[0].expiresFrame as number) - applied).toBeGreaterThanOrEqual(298);
    expect((def[0].expiresFrame as number) - applied).toBeLessThanOrEqual(302);
  });

  it('the ENTIRE skill2 slot is board-inert on damage (gauge-speed aside, all payloads are defensive)', () => {
    // NOTE: this is a DIRECTIONAL assertion, not an equality one. The gauge-speed
    // buff legitimately changes burst timing, which CAN shift damage. What must
    // hold is that no skill2 payload adds an offensive multiplier: stripping
    // skill2 may only change totals via rotation, never via a damage bucket.
    // Concretely — Sin's own per-bucket skill damage must be unchanged.
    const withS2 = unitOf(base.res, SIN);
    const withoutS2 = unitOf(noS2.res, SIN);
    const skillBucket = (u: { breakdown?: Record<string, number> }) =>
      u.breakdown?.skill ?? 0; // A4: UnitResult.breakdown, not .buckets
    // Neither run may attribute skill-bucket damage to skill2 (it has no damage
    // effect at all). Goes RED if the lifesteal/heal line were mis-encoded as a
    // flatDamage rider.
    expect(skillBucket(withS2 as never)).toBe(skillBucket(withoutS2 as never));
  });

  it.skip('GAP: \u201CRecover 15.3% of attack damage as HP\u201D (lifesteal) has no observable payload', () => {
    // No HP pool at scope lock (immortal boss, nobody takes damage). The only
    // reason to model it at all is the tandem case — a teammate with an \u201Con
    // recovery\u201D trigger (Crown-style). If encoded as a `heal` effect it emits
    // recovery events; that is a cross-unit assertion this fixture cannot make
    // because the control comp carries no recovery consumer. Un-skip with a
    // recovery-consumer fixture.
  });

  it.skip('GAP: \u201CIncoming healing \u25B251%\u201D has no StatKey and no consumer', () => {
    // Heal MAGNITUDES are not modeled (the `heal` effect carries no HP amount),
    // so a healing-received multiplier has nothing to scale. Correctly `unmodeled`.
  });
});

describe('sin burst — the 176.32% hit', () => {
  it('deals burst-bucket damage on Sin\u2019s burst casts', () => {
    const idx = sinIdx();
    const burstDmg = sinDamageEvents(base.events).filter(
      (e) => e.bucket === 'burst',
    );
    expect(burstDmg.length).toBeGreaterThan(0);
    // Non-vacuity paired with the strip counterfactual below.
    expect(totals(base.res)[SIN]).toBeGreaterThan(totals(noBurst.res)[SIN]);
    void idx;
  });

  it('the burst hit is Full-Burst EXEMPT (it lands before the FB window opens)', () => {
    const burstDmg = sinDamageEvents(base.events).filter(
      (e) => e.bucket === 'burst',
    );
    // Verified fact: burst-cast damage lands before Full Burst begins (no +50%).
    // Discriminates against a fullBurstEnter-keyed encoding, which would ride the
    // +50% major and inflate every instance.
    for (const d of burstDmg) {
      expect(d.fbMajorApplied).toBeFalsy();
    }
  });

  it('the burst hit takes no +30% range bonus', () => {
    const burstDmg = sinDamageEvents(base.events).filter(
      (e) => e.bucket === 'burst',
    );
    // Rider convention: function damage is force-set no-range.
    for (const d of burstDmg) {
      expect(d.rangeApplied).toBeFalsy();
    }
  });

  it('stripping the burst slot moves ONLY Sin \u2014 teammates are byte-identical', () => {
    const b = totals(base.res);
    const n = totals(noBurst.res);
    for (const slug of Object.keys(b)) {
      if (slug === SIN) continue;
      // The 176.32% line targets "enemies within attack range" \u2014 it is pure
      // self-sourced damage and carries no team buff. Any teammate movement means
      // a debuff/buff leaked into the burst slot.
      expect(n[slug]).toBe(b[slug]);
    }
  });
});

describe('sin burst \u2014 the >4-enemy Damage Taken \u25B212.23% gate (HIGHEST-LEVERAGE)', () => {
  it('NO Damage Taken debuff is applied to the boss (the solo raid boss is ONE enemy)', () => {
    // "Activates when enemy unit(s) (excluding Nikkes) are more than 4" \u2014 the
    // gate is FALSE for the entire scope-lock fight. Boss-held debuffs emit
    // buffApply with casterIdx === null AND targetIdx === null, so filter by
    // stat + value rather than by caster.
    const dt = base.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.stat === 'damageTakenPct' &&
        e.casterIdx === null &&
        e.targetIdx === null &&
        Math.abs((e.value as number) - 12.23) < 1e-6,
    );
    expect(dt).toHaveLength(0);
  });

  it('the ungated mis-encoding is DISCRIMINATED \u2014 it would inflate the WHOLE TEAM', () => {
    const good = totals(base.res);
    const bad = totals(wrongDmgTaken.res);
    // Damage Taken \u25B2 is a boss debuff: every unit benefits. If the faithful
    // model and the ungated model produced the same board, this whole gate would
    // be untestable \u2014 so assert the mis-encoding is strictly, broadly hotter.
    let hotter = 0;
    for (const slug of Object.keys(good)) {
      if (bad[slug] > good[slug]) hotter += 1;
    }
    expect(hotter).toBeGreaterThanOrEqual(3);
    expect(bad[SIN]).toBeGreaterThan(good[SIN]);
  });
});
