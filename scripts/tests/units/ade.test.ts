// PER-UNIT KIT SPEC — `ade` (Ade, Supporter/AR/Wind, Burst II, cd 20s). Kit-autonomy gauntlet
// 2026-08-03 (test-first re-derivation). ⚠ EXACT SLUG: BASE ade (AR/Wind/B2 Supporter) — NOT
// ade-agent-bunny (SR/Iron/B3, aka "aab"/"bade"); shared base name, entirely different kit
// (the slug-disambiguation lint flags bare "Ade" as AMBIGUOUS — expected; everything here
// reasons from characters['ade']).
// NOTE: this is a FROM-SCRATCH unit — there was no shipped override before this gauntlet
// (simSupported was false), so the harness cannot even load her until
// src/skills/overrides/ade.json exists. The RED state of this file is "no override on disk"
// (every run/patch throws at load); after S3 every assertion PINS a kit line GREEN vs the
// shipped override and RED vs the nearest-wrong counterfactual (withPatchedOverride).
//
// Kit (blablalink prose, data/characters.json → characters.ade.skills), max level:
//   S1 ■ Activates at the start of battle. Affects all allies.
//        Perfect Maid: Gain debuff immunity to 1 debuff(s), stacking up to 1 time(s)
//        continuously.                                                              [L1 UNMODELED]
//      ■ Activates when own HP falls below 90%. Affects all allies.
//        ATK ▲ 5.19% of the skill user's ATK for 5 sec.                             [L2]
//   S2 ■ Activates after 420 normal attack(s). Affects all allies.
//        Perfect Maid: Gain debuff immunity to 1 debuff(s), stacking up to 1 time(s)
//        continuously.                                                              [L3 UNMODELED]
//      ■ Activates after 120 normal attack(s). Affects all allies.
//        Max HP ▲ 15.62% of the skill user's Max HP without restoring HP,
//        lasts for 5 sec.                                                           [L4]
//   BU ■ Affects all allies.
//        Max HP ▲ 25.15% of the skill user's Max HP without restoring HP,
//        lasts for 10 sec.                                                          [L5]
//        ATK ▲ 10.15% of the skill user's ATK for 10 sec.                           [L6]
//
// Modeling posture (override note + caveats carry the full story):
//   * L1/L3 "Perfect Maid" debuff immunity — UNMODELED (verbatim in the override's
//     `unmodeled`): defensive debuff immunity; the v1 boss applies no debuffs, so there is
//     nothing to be immune to and no engine primitive (biscuit / diesel-winter-sweets
//     precedent for immunity-class lines). No assertion here by construction; documented
//     only.
//   * L2 "own HP falls below 90%" — STATUS-GATE COLLAPSE (mast precedent, GO 1.0): v1 has no
//     ally HP pool / incoming boss damage, so the gate cannot be literally evaluated; a
//     squishy Supporter sits below the 90% threshold for essentially the whole sustained
//     fight from boss damage. Modeled always-on as an interval:5 refresh (first fire t=5s
//     approximates the first HP crossing a few seconds in; the 5s window then bridges the 5s
//     period exactly, i.e. permanent uptime thereafter). ⚑ flag in the override note — the
//     gate MAGNITUDE is kit-exact (5.19/5s); only the crossing wall-clock is estimated.
//   * "% of the skill user's ATK" = casterAtkPct (flat add of ADE's ATK — the
//     label/delta-ninja-thief convention), NOT atkPct (% of each holder's own ATK).
//   * "% of the skill user's Max HP" = casterMaxHpPct (flat Max HP off Ade's own final Max
//     HP, uniform across holders — the mast convention), NOT targetMaxHpPct (per-holder own
//     Max HP %). Both arrive as maxHpFlat; OFFENSIVELY INERT here — Ade has no
//     atkOfMaxHpPct consumer, and the e3 rule (sim.ts:1525) excludes ally-granted maxHpFlat
//     from any holder's live-Max-HP conversion anyway. Modeled for kit completeness
//     ("without restoring HP" = no heal/recovery event; the engine heal effect is what emits
//     those, and none is used); L4/L5 pin the inertness by byte-identical totals.
//   * "after 120 normal attack(s)" — hitsPerShot 1 (AR, muzzle_count 1), so the pull-vs-hit
//     lever collapses: 120 pulls == 120 hits. hitCount re-fires every threshold crossing
//     (no once-per-battle qualifier in the prose).
//   * Burst is her OWN cast (burstCast, stage 2) — she is the fixture's only B2 and casts
//     every covered chain.
//
// Fixture: liter (B1) / ade (B2) / ada (B3) / helm (B3), boss Fire (Fire BEATS Wind, so ade
// gets NO elemental major — neutral), focus ada (the control-comp carry slot). ade replaces
// crown as the B2 of the 720-kit-audit control comp; the B3 pair alternates so chains come
// every ~20s once gauges fill. Deterministic (no seed); event-log over totals.
// SECOND fixture (the co-B2 discrimination comp, S2b reviewer recommendation): liter /
// biscuit / ade / ada / helm — biscuit (B2, 40s CD) is the earlier-slot second B2, so she
// takes the stage-2 slot on the rotations her cooldown+gauge are up and ade takes the rest:
// ade casts strictly fewer Full Bursts than the team opens. That is the only configuration
// that turns the burstCast-vs-fullBurstEnter misread RED on COUNTS: her burst buffs must ride
// her OWN casts, not every team FB window. (crown was tried first but is a 20s B2 like ade —
// under liter's 8.21s team CDR both CDs collapse below the ~15s FB cycle, so slot priority
// hands ade every cast and no split happens; a 40s-CD B2 is the lever.)
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const SLUGS = ['liter', 'ade', 'ada', 'helm'] as const;
/** slot order: liter 0 / ade 1 / ada 2 / helm 3. */
const ADE = 1;
const N_ALLIES = 4;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [...SLUGS],
    bossElement: 'Fire',
    focusSlug: 'ada',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

/** The co-B2 discrimination comp: biscuit (B2, 40s CD) in the earlier slot splits stage 2. */
const CO_B2_SLUGS = ['liter', 'biscuit', 'ade', 'ada', 'helm'] as const;
const CO_B2_ADE = 2;
function runCoB2() {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [...CO_B2_SLUGS],
    bossElement: 'Fire',
    focusSlug: 'ada',
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const shots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'ade');
const adeCasts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'ade');
/** Trigger pulls (shot events; hitsPerShot 1) fired by ade by (inclusive) a frame. */
const pullsBy = (evs: SimEvent[], frame: number) =>
  shots(evs).filter((s) => s.frame <= frame).length;

// NOTE on values: casterAtkPct / casterMaxHpPct arrive in the log PRE-CONVERTED to flat
// numbers (sim.ts resolves '% of the skill user's ATK/Max HP' at apply time), so the
// buffApply value is NOT the kit percentage — it is 0.0519 × ade.staticAtk etc. The kit
// magnitudes are therefore pinned two ways: (a) the flat values are ONE uniform number
// across all holders (the caster basis), and (b) the flat values of the two ATK lines carry
// EXACTLY the kit ratio 10.15 / 5.19 (same caster basis ⇒ same staticAtk ⇒ the ratio of
// applied flats equals the ratio of kit percentages), and likewise 25.15 / 15.62 for the
// Max HP pair. The two lines of a pair are separated TEMPORALLY (5s vs 10s windows).
const dur = (b: BuffApply) =>
  b.expiresFrame === null ? null : b.expiresFrame - b.frame;
/** L2 — the S1 'HP falls below 90%' team ATK window (5s windows split it from the burst's). */
const s1Atk = (evs: SimEvent[], caster: number = ADE) =>
  buffs(evs).filter(
    (b) =>
      b.stat === 'casterAtkPct' && b.casterIdx === caster && dur(b) === 5 * FPS
  );
/** L4 — the S2 every-120-NA Max HP grants (5s windows). */
const s2MaxHp = (evs: SimEvent[], caster: number = ADE) =>
  buffs(evs).filter(
    (b) =>
      b.stat === 'maxHpFlat' && b.casterIdx === caster && dur(b) === 5 * FPS
  );
/** L5 — the burst Max HP grants (10s windows). */
const burstMaxHp = (evs: SimEvent[], caster: number = ADE) =>
  buffs(evs).filter(
    (b) =>
      b.stat === 'maxHpFlat' && b.casterIdx === caster && dur(b) === 10 * FPS
  );
/** L6 — the burst team ATK buff (10s windows split it from S1's). */
const burstAtk = (evs: SimEvent[], caster: number = ADE) =>
  buffs(evs).filter(
    (b) =>
      b.stat === 'casterAtkPct' && b.casterIdx === caster && dur(b) === 10 * FPS
  );

const holdersOf = (applies: BuffApply[], frame: number) =>
  new Set(applies.filter((b) => b.frame === frame).map((b) => b.targetIdx));

// ---- counterfactuals (nearest-wrong model each assertion must discriminate against) -----------
/** L2 counterfactual: '% of the skill user's ATK' read as % of EACH HOLDER'S own ATK. */
const s1OwnPct = withPatchedOverride('ade', (ov) => {
  let n = 0;
  for (const b of ov.skill1) {
    for (const e of b.effects) {
      if (e.stat === 'casterAtkPct' && e.value === 5.19) {
        e.stat = 'atkPct';
        n++;
      }
    }
  }
  if (!n) {
    throw new Error(
      'ade S1 casterAtkPct 5.19 effect missing — fixture is stale'
    );
  }
});
/** L2 counterfactual: 'Affects all allies' read as allies EXCEPT the skill user. */
const s1ExclSelf = withPatchedOverride('ade', (ov) => {
  const b = ov.skill1.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'casterAtkPct' && e.value === 5.19)
  );
  if (!b) {
    throw new Error('ade S1 ATK block missing — fixture is stale');
  }
  b.target = { kind: 'allies', excludeSelf: true };
});
/** L2 isolation: the S1 ATK line removed entirely. */
const s1Removed = withPatchedOverride('ade', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !b.effects.some((e: any) => e.stat === 'casterAtkPct')
  );
  if (ov.skill1.length === before) {
    throw new Error('ade S1 ATK block missing — fixture is stale');
  }
});
/** L4 counterfactual: '% of the skill user's Max HP' read as % of EACH HOLDER'S own Max HP. */
const s2TargetBasis = withPatchedOverride('ade', (ov) => {
  let n = 0;
  for (const b of ov.skill2) {
    for (const e of b.effects) {
      if (e.stat === 'casterMaxHpPct') {
        e.stat = 'targetMaxHpPct';
        n++;
      }
    }
  }
  if (!n) {
    throw new Error('ade S2 casterMaxHpPct effect missing — fixture is stale');
  }
});
/** L4 isolation: the S2 Max HP line removed (inertness check). */
const s2NoMaxHp = withPatchedOverride('ade', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !b.effects.some((e: any) => e.stat === 'casterMaxHpPct')
  );
  if (ov.skill2.length === before) {
    throw new Error('ade S2 maxHp block missing — fixture is stale');
  }
});
/** L5 isolation: the burst Max HP line removed (inertness check). */
const burstNoMaxHp = withPatchedOverride('ade', (ov) => {
  for (const b of ov.burst) {
    b.effects = b.effects.filter((e: any) => e.stat !== 'casterMaxHpPct');
  }
  const remaining = ov.burst
    .map((b: any) => b.effects.length)
    .reduce((a: number, x: number) => a + x, 0);
  if (remaining === 0) {
    throw new Error('ade burst had ONLY the maxHp effect — fixture is stale');
  }
});
/** L5 counterfactual: the burst Max HP window collapsed to 5s. skill2 is stripped in the
 *  SAME patch so its (genuinely 5s) every-120-NA grants cannot pollute the 5s filter —
 *  this isolates the burst line's duration, which is what the test reads. */
const burstMaxHp5s = withPatchedOverride('ade', (ov) => {
  let n = 0;
  for (const b of ov.burst) {
    for (const e of b.effects) {
      if (e.stat === 'casterMaxHpPct') {
        e.durationSec = 5;
        n++;
      }
    }
  }
  if (!n) {
    throw new Error(
      'ade burst casterMaxHpPct effect missing — fixture is stale'
    );
  }
  ov.skill2 = [];
});
/** L6 counterfactual: '% of the skill user's ATK' read as % of EACH HOLDER'S own ATK. */
const burstOwnPct = withPatchedOverride('ade', (ov) => {
  let n = 0;
  for (const b of ov.burst) {
    for (const e of b.effects) {
      if (e.stat === 'casterAtkPct' && e.value === 10.15) {
        e.stat = 'atkPct';
        n++;
      }
    }
  }
  if (!n) {
    throw new Error(
      'ade burst casterAtkPct 10.15 effect missing — fixture is stale'
    );
  }
});
/** L6 isolation: the burst ATK line removed entirely. */
const burstNoAtk = withPatchedOverride('ade', (ov) => {
  for (const b of ov.burst) {
    b.effects = b.effects.filter((e: any) => e.stat !== 'casterAtkPct');
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const ownPct = run({ ade: s1OwnPct });
const exclSelf = run({ ade: s1ExclSelf });
const noS1Atk = run({ ade: s1Removed });
const targetBasis = run({ ade: s2TargetBasis });
const noS2MaxHp = run({ ade: s2NoMaxHp });
const noBurstMaxHp = run({ ade: burstNoMaxHp });
const burstHp5s = run({ ade: burstMaxHp5s });
const burstOwn = run({ ade: burstOwnPct });
const noBurstAtk = run({ ade: burstNoAtk });
const coB2 = runCoB2();

describe('ade — kit spec', () => {
  it('fixture sanity: ade is the sole B2 and casts every covered chain at stage 2', () => {
    const casts = adeCasts(base.events);
    expect(casts.length).toBeGreaterThanOrEqual(4);
    expect([...new Set(casts.map((c) => c.stage))]).toEqual([2]);
  });

  describe('L2 — S1: HP-below-90% gate collapses always-on: team ATK ▲5.19% of ADE ATK, 5s, refreshed', () => {
    const applies = s1Atk(base.events);

    it('refreshes on a 5s period from t=5s (interval proxy for the always-satisfied gate)', () => {
      expect(applies.length).toBeGreaterThanOrEqual(N_ALLIES * 30);
      const frames = [...new Set(applies.map((b) => b.frame))].sort(
        (a, b) => a - b
      );
      expect(frames[0], 'first crossing approximation: t=5s, not t=0').toBe(
        5 * FPS
      );
      for (let i = 1; i < frames.length; i++) {
        expect(frames[i] - frames[i - 1], '5s refresh period').toBe(5 * FPS);
      }
    });

    it('reaches all four allies including ade herself, each window exactly 5s', () => {
      const frames = [...new Set(applies.map((b) => b.frame))];
      for (const f of frames.slice(0, 3)) {
        expect(holdersOf(applies, f).size).toBe(N_ALLIES);
        expect(holdersOf(applies, f).has(ADE)).toBe(true);
      }
      for (const b of applies.slice(0, 8)) {
        expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
      }
    });

    it("is the CASTER basis: one uniform flat value, and the burst ATK line carries exactly the kit's value ratio", () => {
      expect([...new Set(applies.map((b) => b.value))].length).toBe(1);
      const s1Val = applies[0].value;
      const burstVal = burstAtk(base.events)[0]?.value;
      expect(s1Val).toBeGreaterThan(0);
      expect(
        burstVal,
        'burst ATK line must exist to compare the basis'
      ).toBeGreaterThan(0);
      // same caster basis ⇒ flat ratio == kit-% ratio, exact
      expect(burstVal / s1Val).toBeCloseTo(10.15 / 5.19, 9);
    });

    it('is load-bearing: every ally deals strictly more damage with the line live', () => {
      for (const s of SLUGS) {
        expect(
          base.totals[s],
          `${s}: base ${base.totals[s]} vs no-S1 ${noS1Atk.totals[s]}`
        ).toBeGreaterThan(noS1Atk.totals[s]);
      }
    });

    it("DISCRIMINATING: an own-ATK% reading (atkPct) leaves ade's own total byte-identical and moves the carries", () => {
      // '% of ade's ATK' applied TO ADE is the same flat either way — her damage cannot move;
      // the holders whose own ATK differs from ade's must.
      expect(ownPct.totals.ade).toBe(base.totals.ade);
      const moved = SLUGS.filter(
        (s) => Math.abs(ownPct.totals[s] - base.totals[s]) > 1
      );
      expect(moved.length).toBeGreaterThanOrEqual(1);
      const cfApplies = buffs(ownPct.events).filter(
        (b) => b.stat === 'atkPct' && b.value === 5.19 && b.casterIdx === ADE
      );
      expect(
        cfApplies.length,
        'the misread emits raw atkPct 5.19 instead of a flat'
      ).toBeGreaterThan(0);
      expect(s1Atk(ownPct.events).length).toBe(0);
    });

    it('DISCRIMINATING: excludeSelf drops ade herself out of the window', () => {
      const appliesExcl = s1Atk(exclSelf.events);
      const frames = [...new Set(appliesExcl.map((b) => b.frame))];
      expect(frames.length).toBeGreaterThan(0);
      expect(holdersOf(appliesExcl, frames[0]).has(ADE)).toBe(false);
      expect(holdersOf(appliesExcl, frames[0]).size).toBe(N_ALLIES - 1);
    });
  });

  describe('L4 — S2: every 120 NA, all allies Max HP ▲15.62% of ADE Max HP, 5s (offensively inert)', () => {
    const applies = s2MaxHp(base.events);

    it('the kth grant rides the 120k-th trigger pull (hitsPerShot 1: pulls == hits)', () => {
      expect(applies.length).toBeGreaterThanOrEqual(N_ALLIES * 4);
      const frames = [...new Set(applies.map((b) => b.frame))].sort(
        (a, b) => a - b
      );
      for (let k = 1; k <= Math.min(3, frames.length); k++) {
        const fired = pullsBy(base.events, frames[k - 1]);
        expect(fired, `grant ${k} at ${fired} pulls, expected ${120 * k}`).toBe(
          120 * k
        );
      }
    });

    it('re-fires indefinitely (no once-per-battle qualifier) and reaches all four allies', () => {
      const frames = [...new Set(applies.map((b) => b.frame))].sort(
        (a, b) => a - b
      );
      expect(frames.length).toBeGreaterThanOrEqual(4);
      expect(frames[frames.length - 1]).toBeGreaterThan(120 * FPS);
      for (const f of frames.slice(0, 3)) {
        expect(holdersOf(applies, f).size).toBe(N_ALLIES);
      }
    });

    it("is the CASTER-basis: one uniform flat value across all holders ('skill user's Max HP')", () => {
      expect([...new Set(applies.map((b) => b.value))].length).toBe(1);
      expect(applies[0].value).toBeGreaterThan(0);
    });

    it('DISCRIMINATING: a per-holder own-Max-HP% basis (targetMaxHpPct) scatters the values', () => {
      const cf = buffs(targetBasis.events).filter(
        (b) =>
          b.stat === 'maxHpFlat' && b.casterIdx === ADE && b.refresh === false
      );
      expect(cf.length).toBeGreaterThan(0);
      expect(
        [...new Set(cf.map((b) => b.value))].length,
        'per-holder basis must produce >1 distinct flat values'
      ).toBeGreaterThan(1);
    });

    it("is OFFENSIVELY INERT: removing it changes NO unit's total by a single point", () => {
      expect(base.totals).toEqual(noS2MaxHp.totals);
    });
  });

  describe('L5 — burst line 1: all allies Max HP ▲25.15% of ADE Max HP, 10s (offensively inert)', () => {
    const casts = adeCasts(base.events);
    const applies = burstMaxHp(base.events);

    it('fires once per ade cast, reaching all four allies on the cast frame', () => {
      expect(applies.length).toBe(N_ALLIES * casts.length);
      const castFrames = new Set(casts.map((c) => c.frame));
      for (const b of applies) {
        expect(castFrames.has(b.frame)).toBe(true);
      }
      for (const c of casts) {
        expect(holdersOf(applies, c.frame).size).toBe(N_ALLIES);
      }
    });

    it("is one uniform caster-basis flat value with the kit's 10s window, and carries exactly the kit's value ratio vs the S2 grant", () => {
      expect([...new Set(applies.map((b) => b.value))].length).toBe(1);
      for (const b of applies.slice(0, 4)) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
      const s2Val = s2MaxHp(base.events)[0]?.value;
      expect(
        s2Val,
        'S2 maxHp grant must exist to compare the basis'
      ).toBeGreaterThan(0);
      // same caster basis ⇒ flat ratio == kit-% ratio, exact
      expect(applies[0].value / s2Val).toBeCloseTo(25.15 / 15.62, 9);
    });

    it("is OFFENSIVELY INERT: removing it changes NO unit's total by a single point", () => {
      expect(base.totals).toEqual(noBurstMaxHp.totals);
    });

    it('DISCRIMINATING: a 5s window counterfactual expires 5s early', () => {
      const cf = burstMaxHp(burstHp5s.events); // filters 10s windows → none survive
      expect(cf.length).toBe(0);
      const short = buffs(burstHp5s.events).filter(
        (b) =>
          b.stat === 'maxHpFlat' &&
          b.casterIdx === ADE &&
          b.expiresFrame !== null &&
          b.expiresFrame - b.frame === 5 * FPS
      );
      expect(short.length).toBe(N_ALLIES * adeCasts(burstHp5s.events).length);
    });
  });

  describe('L6 — burst line 2: all allies ATK ▲10.15% of ADE ATK for 10s (the load-bearing team buff)', () => {
    const casts = adeCasts(base.events);
    const applies = burstAtk(base.events);

    it('fires once per ade cast, on the cast frame, one uniform caster-basis flat value', () => {
      expect(casts.length).toBeGreaterThan(0);
      expect(applies.length).toBe(N_ALLIES * casts.length);
      const castFrames = new Set(casts.map((c) => c.frame));
      for (const b of applies) {
        expect(castFrames.has(b.frame)).toBe(true);
      }
      expect([...new Set(applies.map((b) => b.value))].length).toBe(1);
      expect(applies[0].value).toBeGreaterThan(0);
    });

    it('reaches all four allies including ade herself, for exactly 10s', () => {
      for (const c of casts.slice(0, 3)) {
        const holders = holdersOf(applies, c.frame);
        expect(holders.size).toBe(N_ALLIES);
        expect(holders.has(ADE)).toBe(true);
      }
      for (const b of applies.slice(0, 8)) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('is load-bearing: every ally deals strictly more damage with the line live', () => {
      for (const s of SLUGS) {
        expect(
          base.totals[s],
          `${s}: base ${base.totals[s]} vs no-burst-ATK ${noBurstAtk.totals[s]}`
        ).toBeGreaterThan(noBurstAtk.totals[s]);
      }
    });

    it("DISCRIMINATING: an own-ATK% reading (atkPct) leaves ade's own total byte-identical and moves the carries", () => {
      expect(burstOwn.totals.ade).toBe(base.totals.ade);
      const moved = SLUGS.filter(
        (s) => Math.abs(burstOwn.totals[s] - base.totals[s]) > 1
      );
      expect(moved.length).toBeGreaterThanOrEqual(1);
      const cfApplies = buffs(burstOwn.events).filter(
        (b) => b.stat === 'atkPct' && b.value === 10.15 && b.casterIdx === ADE
      );
      expect(
        cfApplies.length,
        'the misread emits raw atkPct 10.15 instead of a flat'
      ).toBeGreaterThan(0);
      expect(burstAtk(burstOwn.events).length).toBe(0);
    });
  });

  describe('X1 — burst keying is her OWN cast (burstCast), not every team Full Burst (co-B2 comp)', () => {
    const fbStarts = coB2.events.filter((e) => e.kind === 'fullBurstStart');
    const casts = adeCasts(coB2.events);
    const atkVolleys = new Set(
      burstAtk(coB2.events, CO_B2_ADE).map((b) => b.frame)
    );
    const hpVolleys = new Set(
      burstMaxHp(coB2.events, CO_B2_ADE).map((b) => b.frame)
    );

    it('the comp splits the B2 slot: the team opens more Full Bursts than ade casts', () => {
      expect(fbStarts.length).toBeGreaterThanOrEqual(3);
      expect(casts.length).toBeGreaterThanOrEqual(1);
      expect(casts.length).toBeLessThan(fbStarts.length);
    });

    it('her burst buffs ride exactly her own casts — strictly fewer windows than FBs opened', () => {
      expect(atkVolleys.size).toBe(casts.length);
      expect(hpVolleys.size).toBe(casts.length);
      const castFrames = new Set(casts.map((c) => c.frame));
      for (const f of [...atkVolleys, ...hpVolleys]) {
        expect(castFrames.has(f)).toBe(true);
      }
    });

    it('DISCRIMINATING: fullBurstEnter keying would over-fire to every team FB window', () => {
      // Counterfactual built inline on the co-B2 comp: rekey both burst blocks to
      // fullBurstEnter — volley count then equals the FB count, which is strictly MORE
      // than her cast count here.
      const cf = withPatchedOverride('ade', (ov) => {
        for (const b of ov.burst) {
          b.trigger = { kind: 'fullBurstEnter' };
        }
      });
      const evs: SimEvent[] = [];
      runComp({
        slugs: [...CO_B2_SLUGS],
        bossElement: 'Fire',
        focusSlug: 'ada',
        overrides: { ade: cf },
        cfg: { onEvent: (e) => evs.push(e) },
      });
      const cfAtk = new Set(burstAtk(evs, CO_B2_ADE).map((b) => b.frame));
      expect(cfAtk.size).toBeGreaterThanOrEqual(fbStarts.length);
      expect(cfAtk.size).toBeGreaterThan(casts.length);
    });
  });
});
