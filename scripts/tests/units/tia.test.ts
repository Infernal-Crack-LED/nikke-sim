// PER-UNIT KIT SPEC — `tia` (Tia, Defender/RL/Iron, Burst I, cd 40s, ammo 6, chargeFrames 60;
// standalone unit — no base counterpart). Kit-autonomy gauntlet 2026-07-28, test-first spec.
//
// One assertion group per KIT LINE (T1..T6 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) and to attach SHIELD PROBES (observation blocks that
// make the damage-inert shield events visible — the shield blocks under test are never touched).
//
// Kit (data/characters.json → characters.tia.skills, max level):
//   S1 ■ when recovering Cover's HP → self:  Burst Skill cooldown ▼13 sec, stacks 2×, 12 sec   [T4]
//      ■ when recovering Cover's HP → all allies: Attack damage ▲32.11% for 10 sec             [T1-T3]
//   S2 ■ after 5 normal attacks → self: Cover Max HP ▲32.75% of her Max HP 5s + taunt 5s       [UNMODELED]
//      ■ on burst use → self: Restores Cover HP by 21.41% of final Max HP                      [anchor]
//                           + Recovers 21.96% of attack damage as HP over 10 sec               [UNMODELED]
//   BU ■ self: Shield 35.07% of final Max HP, 10 sec                                           [T5]
//      ■ all allies (except self): Shield 10.21% of final Max HP, 10 sec                       [T5]
//      ■ all allies: Re-enters Burst Stage 1                                                   [T6]
//
// TRIGGER PROXY (the load-bearing modeling judgment — Tier 2): both S1 lines activate "when
// recovering Cover's HP". The sim models no Cover HP pool and the v1 boss deals no damage, so
// the ONLY deterministic Cover-HP recovery in the sim is her OWN S2 line "when using Burst
// Skill → Restores Cover HP" — every burst use restores cover. S1 is therefore keyed to
// `burstCast` (the faithful deterministic proxy for that anchor), NOT to the engine's `recovery`
// trigger: `recovery` fires on ANY heal the unit receives (e.g. Helm's full-charge heal), and
// teammate Nikke-HP heals are NOT Cover-HP recovery — that would over-proc S1. Environmental
// Cover regen (the in-game proc source that brings her effective CD to the observed ~20s, per
// the anis-star probe note 2026-07-13) is unmodelable without boss damage on cover → documented
// COLD residual: the sim grants exactly one S1 proc per burst (effective CD 27s = 40−13; buff
// uptime 10s per ~40s chain), where the real kit procs additionally off passive cover regen.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   T1  the buff is attackDamagePct (Damage-Up bucket) 32.11 on ALL ALLIES — self included
//       ("Affects all allies"). An excludeSelf encoding (the nearest wrong target) drops tia
//       from the target set; a wrong value (e.g. a lower-level 17.46) fails the magnitude pin.
//   T2  burstCast vs fullBurstEnter timing: tia is B1 — she casts at chain START, ~1s (two
//       30f stage gaps) BEFORE the B3 cast opens Full Burst. A fullBurstEnter-keyed encoding
//       lands the buff late: crown's B2 cast-instant damage and the whole early chain window
//       miss it. Pinned frame-exact: every apply frame === her burstCast frame.
//   T3  damage relevance + removal counterfactual: with the buff removed the team total must
//       fall (the buff is the unit's sole offensive contribution) and zero 32.11 applies fire.
//   T4  CDR magnitude and stack count, via cast cadence in the 2-unit isolation [tia, crown]
//       (NO B3 → the chain can never complete → the stage-1 cadence is gated purely by HER
//       cooldown once the gauge is up): 20 < gap < 35 pins exactly ONE 13s reduction per proc
//       (gap ≈ 27s). No CDR → gap ≈ 40s (fails the upper bound); both stacks (26s, the
//       over-credit the real kit reaches via cover regen) → gap ≈ 14s (fails the lower bound).
//   T5  shields are events, not numbers (no HP pool at scope): a 'shielded'-triggered probe
//       block attached to tia (self shield) and crown (ally shield) makes each application
//       visible as a 0.73 atkPct buffApply. Self-shield removed → tia probe silent; ally-shield
//       removed → crown probe silent; ally shield WITHOUT excludeSelf (nearest wrong target) →
//       tia's probe fires TWICE per cast. Probe value 0.73 is unique in every fixture.
//   T6  reenterStage holds stage 1 so a SECOND B1 casts in the same chain: in [tia, liter,
//       crown, ada] the first chain is tia(S1) → liter(S1, exactly 30f later — the frame-pinned
//       STAGE_CAST_GAP) → crown(S2) → ada(S3). With reenterStage removed the stage advances
//       after tia and liter never reaches a stage-1 window in chain 1 (tia wins every later
//       leftmost tie). liter's chain-1 stage-1 cast is the observable.
//
// UNMODELED (inert at the damage-sim scope; documented, no assertions):
//   - S2 line 1 (hitCount 5 → Cover Max HP ▲32.75% 5s + Attract taunt 5s): Cover HP pool and
//     enemy targeting are defensive channels; the v1 boss deals no damage to cover and there is
//     one target to taunt.
//   - S2 line 2b (on burst → Recovers 21.96% of attack damage as HP over 10s): lifesteal; no
//     HP-loss channel exists, damage-inert.
//   - S2 line 2a's Cover-HP NUMBER (21.41% of final Max HP): the pool is unmodeled; the line's
//     ROLE (the deterministic cover-recovery event S1 keys on) is enacted by the burstCast proxy.
//   - S1's second CDR stack + 12s stack window + passive cover-regen procs (environmental —
//     needs boss damage on cover): COLD direction (see trigger-proxy note above).
//
// Fixtures (all deterministic — no seed; bossRange 'near' pins the range band so no unhittable
// window can stretch a cast gap):
//   A = [tia, crown, ada, helm], boss Fire, focus ada — the control comp with liter→tia; buff
//       target/timing + shield probes (5 tia casts over 180s: chains every 40s).
//   B = [tia, liter, crown, ada], boss Fire, focus ada — two B1s: the reentry chain structure.
//   C = [tia, crown], boss Fire, focus tia — no B3: her cooldown alone paces stage 1.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(o: {
  slugs: string[];
  focusSlug: string;
  overrides?: Record<string, any>;
}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: o.slugs,
    bossElement: 'Fire',
    focusSlug: o.focusSlug,
    overrides: o.overrides,
    cfg: { bossRange: 'near', onEvent: (e) => events.push(e) },
  });
  const casts = (slug: string): BurstCast[] =>
    events.filter(
      (e): e is BurstCast => e.kind === 'burstCast' && e.slug === slug
    );
  const applies = (stat: string, value: number): BuffApply[] =>
    events.filter(
      (e): e is BuffApply =>
        e.kind === 'buffApply' && e.stat === stat && e.value === value
    );
  return { events, res, casts, applies, totals: totals(res) };
}

const FIX_A = { slugs: ['tia', 'crown', 'ada', 'helm'], focusSlug: 'ada' };
const FIX_B = { slugs: ['tia', 'liter', 'crown', 'ada'], focusSlug: 'ada' };
const FIX_C = { slugs: ['tia', 'crown'], focusSlug: 'tia' };

/** T1/T2 slot map for fixture A: tia 0 / crown 1 / ada 2 / helm 3. */
const TIA_A = 0;

// ---- counterfactuals (nearest wrong models) ---------------------------------------------------

/** T3 reference: S1's attack-damage line removed entirely. */
const tiaNoBuff = withPatchedOverride('tia', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !b.effects.some((e: any) => e.stat === 'attackDamagePct')
  );
  if (ov.skill1.length !== before - 1) {
    throw new Error('tia S1 attackDamagePct block missing — fixture is stale');
  }
});
/** T2 counterfactual: the same buff keyed to Full Burst ENTRY (lands ~1s late for a B1). */
const tiaBuffOnFbEnter = withPatchedOverride('tia', (ov) => {
  const b = ov.skill1.find((b: any) =>
    b.effects.some((e: any) => e.stat === 'attackDamagePct')
  );
  if (!b) {
    throw new Error('tia S1 attackDamagePct block missing — fixture is stale');
  }
  b.trigger = { kind: 'fullBurstEnter' };
});
/** T1 counterfactual: "all allies" misread as allies-except-self. */
const tiaBuffExcludeSelf = withPatchedOverride('tia', (ov) => {
  const b = ov.skill1.find((b: any) =>
    b.effects.some((e: any) => e.stat === 'attackDamagePct')
  );
  if (!b) {
    throw new Error('tia S1 attackDamagePct block missing — fixture is stale');
  }
  b.target = { kind: 'allies', excludeSelf: true };
});
/** T4 reference: the burst-CDR line removed (her CD stays the datamined 40s). */
const tiaNoCdr = withPatchedOverride('tia', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'burstCdr')
  );
  if (ov.skill1.length !== before - 1) {
    throw new Error('tia S1 burstCdr block missing — fixture is stale');
  }
});
/** T6 reference: the burst re-entry line removed (stage advances after her). */
const tiaNoReenter = withPatchedOverride('tia', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'reenterStage')
  );
  if (ov.burst.length !== before - 1) {
    throw new Error('tia burst reenterStage block missing — fixture is stale');
  }
});

// ---- shield probes (observation devices — shield blocks under test are untouched) --------------
// A 'shielded'-triggered 0.73 atkPct / 2s self-buff: fires once per shield application the unit
// RECEIVES. Value 0.73 appears nowhere else in these fixtures, so every probe firing is cleanly
// attributable. The shield itself has no HP pool at scope — these events are its only observable.
// The probe is COMPOSED onto each counterfactual (probe + variant), so every variant run still
// OBSERVES the shield events it asserts on.
const PROBE_VAL = 0.73;
const PROBE_BLOCK = {
  slot: 'skill1',
  trigger: { kind: 'shielded' },
  target: { kind: 'self' },
  effects: [{ kind: 'buff', stat: 'atkPct', value: PROBE_VAL, durationSec: 2 }],
};
const withProbe = (ov: any) => {
  ov.skill1 = [...ov.skill1, PROBE_BLOCK];
  return ov;
};
const crownProbed = withProbe(
  withPatchedOverride('crown', () => {
    /* clone only */
  })
);

/** T5 references: each shield line removed in turn (probe composed onto each). */
const tiaProbed = withProbe(
  withPatchedOverride('tia', () => {
    /* clone only */
  })
);
const tiaNoSelfShield = withProbe(
  withPatchedOverride('tia', (ov) => {
    const before = ov.burst.length;
    ov.burst = ov.burst.filter(
      (b: any) =>
        !(
          b.target?.kind === 'self' &&
          b.effects.some((e: any) => e.kind === 'shield')
        )
    );
    if (ov.burst.length !== before - 1) {
      throw new Error('tia self-shield block missing — fixture is stale');
    }
  })
);
const tiaNoAllyShield = withProbe(
  withPatchedOverride('tia', (ov) => {
    const before = ov.burst.length;
    ov.burst = ov.burst.filter(
      (b: any) =>
        !(
          b.target?.kind === 'allies' &&
          b.effects.some((e: any) => e.kind === 'shield')
        )
    );
    if (ov.burst.length !== before - 1) {
      throw new Error('tia ally-shield block missing — fixture is stale');
    }
  })
);
/** T5 counterfactual: the ally shield mis-targeted as all allies (self double-shielded). */
const tiaAllyShieldIncludesSelf = withProbe(
  withPatchedOverride('tia', (ov) => {
    const b = ov.burst.find(
      (b: any) =>
        b.target?.kind === 'allies' &&
        b.effects.some((e: any) => e.kind === 'shield')
    );
    if (!b) {
      throw new Error('tia ally-shield block missing — fixture is stale');
    }
    b.target = { kind: 'allies' }; // drops excludeSelf
  })
);

// ---- spec --------------------------------------------------------------------------------------

describe('tia kit spec', () => {
  it('T1 — S1: attackDamagePct 32.11 lands on ALL allies (self included), per burst', () => {
    const { casts, applies } = run(FIX_A);
    const tiaCasts = casts('tia');
    expect(tiaCasts.length).toBeGreaterThanOrEqual(4); // fixture sanity: she bursts
    const buff = applies('attackDamagePct', 32.11).filter(
      (e) => e.casterIdx === TIA_A
    );
    // every cast applies to all four units — "Affects all allies" includes the skill user
    expect(buff.length).toBe(tiaCasts.length * 4);
    for (const c of tiaCasts) {
      const atCast = buff.filter((b) => b.frame === c.frame);
      const targets = new Set(atCast.map((b) => b.targetSlug));
      expect(targets).toEqual(new Set(['tia', 'crown', 'ada', 'helm']));
    }
    // nearest-wrong target: excludeSelf drops tia herself
    const excl = run({ ...FIX_A, overrides: { tia: tiaBuffExcludeSelf } });
    const exclBuff = excl
      .applies('attackDamagePct', 32.11)
      .filter((e) => e.casterIdx === TIA_A);
    expect(exclBuff.length).toBe(tiaCasts.length * 3);
    expect(exclBuff.some((b) => b.targetSlug === 'tia')).toBe(false);
  });

  it('T2 — S1: the buff fires at her burstCast frame (B1 casts at chain START, not FB entry)', () => {
    const { casts, applies } = run(FIX_A);
    const tiaCasts = casts('tia');
    const buff = applies('attackDamagePct', 32.11).filter(
      (e) => e.casterIdx === TIA_A
    );
    // shipped: every apply is frame-exact with its cast
    for (const b of buff) {
      expect(tiaCasts.some((c) => c.frame === b.frame)).toBe(true);
    }
    // counterfactual: fullBurstEnter lands strictly AFTER her cast (B2 gap + B3 gap later)
    const late = run({ ...FIX_A, overrides: { tia: tiaBuffOnFbEnter } });
    const lateBuff = late
      .applies('attackDamagePct', 32.11)
      .filter((e) => e.casterIdx === TIA_A);
    expect(lateBuff.length).toBeGreaterThan(0);
    for (const b of lateBuff) {
      const own = tiaCasts.reduce(
        (best, c) => (c.frame <= b.frame && c.frame > best ? c.frame : best),
        -1
      );
      expect(b.frame).toBeGreaterThan(own); // strictly late vs the shipped frame-equality
    }
  });

  it('T3 — S1: the buff is the unit offensive contribution (removal drops the team total)', () => {
    const shipped = run(FIX_A);
    const removed = run({ ...FIX_A, overrides: { tia: tiaNoBuff } });
    const sum = (t: Record<string, number>) =>
      Object.values(t).reduce((a, b) => a + b, 0);
    expect(
      removed
        .applies('attackDamagePct', 32.11)
        .filter((e) => e.casterIdx === TIA_A).length
    ).toBe(0);
    expect(sum(shipped.totals)).toBeGreaterThan(sum(removed.totals));
  });

  it('T4 — S1: burstCdr 13 per proc → her stage-1 cadence is ≈27s (one stack; not 40, not 14)', () => {
    const gap = (overrides?: Record<string, any>) => {
      const { casts } = run({ ...FIX_C, overrides });
      const t = casts('tia').map((c) => c.frame / FPS);
      expect(t.length).toBeGreaterThanOrEqual(3); // fixture sanity
      return t[1] - t[0]; // first interval: gauge-up cast → first CD-bound cast
    };
    const shippedGap = gap();
    expect(shippedGap).toBeGreaterThan(20); // both stacks (14s) would fail here
    expect(shippedGap).toBeLessThan(35); // no CDR (40s) would fail here
    const noCdrGap = gap({ tia: tiaNoCdr });
    expect(noCdrGap).toBeGreaterThan(35); // the datamined 40s CD, unreduced
    expect(noCdrGap - shippedGap).toBeGreaterThan(10); // ≈ the 13s reduction
  });

  it('T5 — burst: self shield 35.07 + ally-except-self shield 10.21 (shielded-trigger probes)', () => {
    // Probe events are counted ONLY at tia's burstCast frames: crown's OWN burst also emits
    // an all-allies shield (10.45%) which legitimately fires tia's probe on CROWN's cast frames
    // — frame attribution isolates the shields emitted by TIA's burst (the lines under test).
    const probeRun = (overrides: Record<string, any>) => {
      const { casts, applies } = run({
        ...FIX_A,
        overrides: { tia: overrides.tia, crown: overrides.crown },
      });
      const tiaFrames = new Set(casts('tia').map((c) => c.frame));
      const nCasts = tiaFrames.size;
      const atCast = (targetSlug: string) =>
        applies('atkPct', PROBE_VAL).filter(
          (e) => e.targetSlug === targetSlug && tiaFrames.has(e.frame)
        ).length;
      const tiaProbe = atCast('tia');
      const crownProbe = atCast('crown');
      return { nCasts, tiaProbe, crownProbe };
    };
    // shipped: exactly one shield application per cast on each of self and allies
    const s = probeRun({ tia: tiaProbed, crown: crownProbed });
    expect(s.nCasts).toBeGreaterThanOrEqual(4);
    expect(s.tiaProbe).toBe(s.nCasts); // self shield, once per cast
    expect(s.crownProbe).toBe(s.nCasts); // ally shield reaches crown, once per cast
    // self shield removed → tia probe silent; ally shield still lands
    const noSelf = probeRun({ tia: tiaNoSelfShield, crown: crownProbed });
    expect(noSelf.tiaProbe).toBe(0);
    expect(noSelf.crownProbe).toBe(noSelf.nCasts);
    // ally shield removed → crown probe silent; self shield still lands
    const noAlly = probeRun({ tia: tiaNoAllyShield, crown: crownProbed });
    expect(noAlly.crownProbe).toBe(0);
    expect(noAlly.tiaProbe).toBe(noAlly.nCasts);
    // nearest-wrong target: ally shield WITHOUT excludeSelf double-shields tia
    const incl = probeRun({
      tia: tiaAllyShieldIncludesSelf,
      crown: crownProbed,
    });
    expect(incl.tiaProbe).toBe(incl.nCasts * 2);
  });

  it('T6 — burst: re-enters Burst Stage 1 → a second B1 casts inside the same chain', () => {
    const chain1 = (overrides?: Record<string, any>) => {
      const { casts } = run({ ...FIX_B, overrides });
      const tia1 = casts('tia')[0];
      const liter1 = casts('liter')[0];
      const crown1 = casts('crown')[0];
      const ada1 = casts('ada')[0];
      expect(tia1).toBeDefined();
      expect(crown1).toBeDefined();
      expect(ada1).toBeDefined();
      expect(tia1.stage).toBe(1);
      expect(crown1.stage).toBe(2);
      expect(ada1.stage).toBe(3);
      return { tia1, liter1, crown1 };
    };
    // shipped: liter fills stage 1 in chain 1, exactly one stage-gap (30f) after tia
    const s = chain1();
    expect(s.liter1).toBeDefined();
    expect(s.liter1.stage).toBe(1);
    expect(s.liter1.frame - s.tia1.frame).toBe(30); // STAGE_CAST_GAP_FRAMES, no rng (unseeded)
    expect(s.liter1.frame).toBeLessThan(s.crown1.frame);
    // counterfactual: stage advances after tia → liter gets no chain-1 stage-1 window
    const c = chain1({ tia: tiaNoReenter });
    const literInChain1 =
      c.liter1 !== undefined && c.liter1.frame < c.crown1.frame;
    expect(literInChain1).toBe(false);
  });
});
