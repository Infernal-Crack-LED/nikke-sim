// PER-UNIT KIT SPEC — `liberalio` (Liberalio, Attacker/SR/Wind, Burst III, cd 40s, ammo 6,
// chargeFrames 90, Pilgrim). Kit-autonomy gauntlet 2026-07-26, test-first (S2a).
//
// One assertion group per KIT LINE (L1..L9 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.liberalio.skills):
//   S1 ■ entering Full Burst → self: ATK ▲160% for 3 sec                                    [L1]
//      ■ Full Charge on a target's core → self: Attack Damage ▲20.83% for 60 sec            [L2]
//      ■ Full Charge → the target: 40.5% of final ATK as additional damage, ×5 activations  [L3]
//      ■ entering Full Burst → the 1 lowest-final-ATK Burst-3 ally: Charge Speed ▲12.74%
//        of the skill user's Charge Speed for 10 sec                                        [L4]
//   S2 ■ Full Charge vs the STAGE TARGET → self: Raging Current, Attack Damage ▲231%
//        continuously; removes Gentle Current                                               [L5]
//      ■ Full Charge vs a non-stage-target Rapture → self: Gentle Current, fixes charge
//        time at 1 sec continuously; removes Raging Current                                 [L6]
//      ■ battle start → self: immunity to Increase/Decrease Charge Speed, continuous        [L7]
//   BU ■ self: Attack Damage ▲50% for 10 sec                                                [L8]
//      ■ all enemies: 925% of final ATK as additional damage                                [L9]
//
// Dispositions:
//   L1..L5, L7..L9  FAITHFUL — pinned GREEN vs shipped, RED vs the nearest-wrong counterfactual.
//   L3  MEASURED reading: "Activates 5 times" = 5 hits per full charge = 5×40.5% = 202.5% per
//       pull (user-confirmed; validated vs a real scope-lock run — the single-hit 40.5% read
//       left her 0.70 cold). Its Q1 calibration is also pinned: the proc is RANGE-exempt
//       (noRange) yet takes the +50% FB major when it lands in Full Burst (noFb REMOVED,
//       panel-accepted 2026-07-14 — the cast-instant rule is burst-slot-scoped).
//   L5  domain-scoped FAITHFUL: in a solo raid the single boss IS the stage target, so every
//       full charge maintains Raging Current — modeled as a permanent passive.
//   L6  UNMODELED-inert: Gentle Current can never fire in a solo raid (no non-stage-target
//       Rapture exists), so there is nothing to assert — documented, not dropped.
//   L7  RECEIVING-side rule, enforced at buff application: `charFixes.statImmunities`
//       ['chargeSpeedPct'] strips that stat out of any incoming buff for HER ONLY, from any
//       source and in either direction. The strip is PER STAT and PER TARGET — a stat bundled
//       in the same effects array still lands on her, and the same cast still reaches every
//       other ally. Her own S1 grant is unchanged (excludeSelf, pinned by L4).
//
// S2c reconciliation (driver vs claude-fable-5 S2b): CONVERGED on all nine lines. The reviewer
// independently re-derived every disposition, including the 5-hits-per-landing rider read, the
// lowest-FINAL-ATK Burst-3 selector, the burstCast-vs-fullBurstEnter split, and the FB-exempt
// nuke. Two reviewer nuances reconciled: (i) their L7 framing asks for a behavioral shot-count
// invariance test under an INJECTED external chargeSpeedPct — that is exactly the L7 group below,
// and it is GREEN vs shipped and RED against the no-immunity counterfactual; (ii) their L5
// trigger-identity preference (landing-gated, not passive-from-t0) was ADOPTED — the S5 blind
// test (claude-opus-5) asserted it RED-vs-passive, so the override's Raging Current trigger moved
// passive → shotFired (the passive shortcut over-credited exactly her first charge, ~0.2% of her
// total; allies byte-identical). The reviewer's two extra inertness claims (rider core-ineligible;
// nuke range-exempt + core-ineligible) were verified empirically and added as pins below.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   L1  the skill-level-9 magnitude 152.73 is the nearest authoring error (wrong level row).
//   L2  two independent discriminations: the skill-level-9 value 19.89, AND requiresCore — at
//       coreHitRate 0 the line must go fully dark while her other Attack Damage lines persist.
//   L3  the single-hit 40.5% misread is the documented near-wrong (0.70-cold regression).
//   L4  the OLD misparse targeted the top-3-ATK allies — it spreads the buff across ≥2 holders
//       (and onto herself); shipped reaches helm ALONE (the only other Burst-3 ally).
//   L5  the skill-level-9 magnitude 220.5, and the continuous (null-expiry) encoding.
//   L8  the skill-level-9 magnitude 47.73.
//   L9  the skill-level-9 magnitude 882.95, and cast-before-FB (never takes the +50% major).
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / liberalio B3 / helm B3, boss
// Fire — Wind is neutral vs Fire so no element major interferes; focus liberalio). She needs a
// real rotation to cast her burst at all. Deterministic (no seed). Slot order: liter 0 / crown 1
// / liberalio 2 / helm 3.
import { describe, expect, it } from 'vitest';
import type { SimConfig, SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** controlComp slot order: liter 0 / crown 1 / liberalio 2 / helm 3. */
const LIB = 2;
const HELM = 3;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(
  overrides: Record<string, any> = {},
  cfg: Partial<SimConfig> = {}
) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('liberalio'),
    overrides,
    cfg: { onEvent: (e) => events.push(e), ...cfg },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches (one combined run: every observable is stat/slot-disjoint) --------
const libAllCf = withPatchedOverride('liberalio', (ov) => {
  // L1 cf: FB-entry ATK 160 → 152.73 (skill-level-9 row).
  const l1 = ov.skill1.find((b: any) =>
    b.effects.some((e: any) => e.stat === 'atkPct')
  );
  if (!l1) {
    throw new Error('liberalio S1 atkPct block missing — fixture is stale');
  }
  l1.effects.find((e: any) => e.stat === 'atkPct').value = 152.73;
  // L2 cf: core-hit Attack Damage 20.83 → 19.89 (skill-level-9 row).
  const l2 = ov.skill1.find((b: any) =>
    b.effects.some(
      (e: any) => e.stat === 'attackDamagePct' && e.value === 20.83
    )
  );
  if (!l2) {
    throw new Error('liberalio S1 20.83 block missing — fixture is stale');
  }
  l2.effects.find((e: any) => e.stat === 'attackDamagePct').value = 19.89;
  // L3 cf: rider 202.5 → 40.5 (the single-hit misread; 0.70-cold regression).
  const l3 = ov.skill1.find((b: any) =>
    b.effects.some((e: any) => e.kind === 'flatDamage')
  );
  if (!l3) {
    throw new Error('liberalio S1 rider missing — fixture is stale');
  }
  l3.effects.find((e: any) => e.kind === 'flatDamage').atkPct = 40.5;
  // L4 cf: lowest-final-ATK Burst-3 ally → top-3-ATK allies (the OLD misparse).
  const l4 = ov.skill1.find((b: any) =>
    b.effects.some((e: any) => e.stat === 'chargeSpeedPct')
  );
  if (!l4) {
    throw new Error(
      'liberalio S1 chargeSpeedPct block missing — fixture is stale'
    );
  }
  l4.target = { kind: 'alliesTopAtk', count: 3 };
  // L5 cf: Raging Current 231 → 220.5 (skill-level-9 row).
  const l5 = ov.skill2.find((b: any) =>
    b.effects.some((e: any) => e.stat === 'attackDamagePct')
  );
  if (!l5) {
    throw new Error('liberalio S2 Raging Current missing — fixture is stale');
  }
  l5.effects.find((e: any) => e.stat === 'attackDamagePct').value = 220.5;
  // L8 cf: burst self Attack Damage 50 → 47.73 (skill-level-9 row).
  const l8 = ov.burst.find((b: any) =>
    b.effects.some((e: any) => e.stat === 'attackDamagePct')
  );
  if (!l8) {
    throw new Error(
      'liberalio burst Attack Damage block missing — fixture is stale'
    );
  }
  l8.effects.find((e: any) => e.stat === 'attackDamagePct').value = 47.73;
  // L9 cf: nuke 925 → 882.95 (skill-level-9 row).
  const l9 = ov.burst.find((b: any) =>
    b.effects.some((e: any) => e.kind === 'flatDamage')
  );
  if (!l9) {
    throw new Error('liberalio burst nuke missing — fixture is stale');
  }
  l9.effects.find((e: any) => e.kind === 'flatDamage').atkPct = 882.95;
});

// ---- L7 fixtures: an EXTERNAL Charge Speed source injected into the comp ----------------------
// The control comp has no charge-speed carrier, so the immunity is only observable against an
// injected one. `liter` (slot 0, SMG — no charge weapon of her own) carries a synthetic passive
// that BUNDLES chargeSpeedPct with atkPct in ONE effects array, exactly the shape `maxwell`
// (SR/Iron) ships in the real board comp. Element targeting isolates a single receiver: Wind is
// liberalio alone, Water is `helm` (SR/Water) alone (liter/crown are Iron), so each run changes
// exactly one unit and cannot be confounded by a team-wide rotation shift.
const extSource = (target: any) =>
  withPatchedOverride('liter', (ov) => {
    ov.skill1.push({
      slot: 'skill1',
      trigger: { kind: 'passive' },
      target,
      effects: [
        { kind: 'buff', stat: 'chargeSpeedPct', value: 50 },
        { kind: 'buff', stat: 'atkPct', value: 10 },
      ],
    });
  });
const TO_LIB = { kind: 'alliesOfElement', element: 'Wind' };
const TO_HELM = { kind: 'alliesOfElement', element: 'Water' };

/**
 * L3b arm: credit all FIVE rider sub-hits (`gaugeHits: 5`) — the 2026-08-17 audit's proposed fix,
 * deliberately NOT shipped. Damage is byte-identical either way (one aggregated 202.5 instance),
 * so only the gauge channel moves. Sized in scripts/battery/liberalio-gaugehits-ab.ts.
 */
const libGaugeHits5 = withPatchedOverride('liberalio', (ov) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'flatDamage' && x.atkPct === 202.5);
  if (!e) {
    throw new Error('liberalio S1 202.5 rider missing — fixture is stale');
  }
  e.gaugeHits = 5;
});

/** Raw SimResult (not just events/totals) — `unitOf` needs it for the gauge counters. */
function runResult(
  overrides: Record<string, any> = {},
  cfg: Partial<SimConfig> = {}
) {
  return runComp({ ...controlComp('liberalio'), overrides, cfg });
}

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const cf = run({ liberalio: libAllCf });
/**
 * L3b: bursting disabled so the bar never fills and `gaugeGenerated` accrues uncapped — the
 * gaugeHits difference is then exactly (5-1) extra `skillGauge` calls per full charge.
 */
const noBurstGaugeBase = runResult({}, { disableBursts: true });
const noBurstGaugeFive = runResult(
  { liberalio: libGaugeHits5 },
  { disableBursts: true }
);
/** requiresCore discrimination: identical basis but the boss core is never exposed. */
const noCore = run({}, { coreHitRate: 0 });
/** L7: the bundled external buff aimed at liberalio ALONE. */
const extLib = run({ liter: extSource(TO_LIB) });
/** L7 counterfactual: the same buff with her immunity stripped out of the override. */
const extLibNoImm = run({
  liter: extSource(TO_LIB),
  liberalio: withPatchedOverride('liberalio', (ov) => {
    if (!ov.charFixes?.statImmunities?.includes('chargeSpeedPct')) {
      throw new Error(
        'liberalio charFixes.statImmunities lacks chargeSpeedPct — fixture is stale'
      );
    }
    delete ov.charFixes.statImmunities;
  }),
});
/** L7: the same buff aimed at helm ALONE — a non-immune charge (SR) ally. */
const extHelm = run({ liter: extSource(TO_HELM) });
/** L7: the same buff cast at the WHOLE team in one go (per-target strip). */
const extAll = run({ liter: extSource({ kind: 'allies' }) });

// ---- L7c fixtures: iron-sweep comp context (maxwell-style bundled grant to liberalio) --------
// The real iron-sweep roster has maxwell targeting the top-2 static-ATK allies, which currently
// does NOT include liberalio, so the immunity is not exercised there. This fixture injects a
// maxwell-style bundled chargeSpeedPct+atkPct buff aimed at the one Wind ally (liberalio alone)
// so the receiving-side strip is tested inside the real comp's rotation.
const IRON_SWEEP = [
  'd-killer-wife',
  'milk-blooming-bunny',
  'maxwell',
  'takina',
  'liberalio',
] as const;
function runIronSweep(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [...IRON_SWEEP],
    bossElement: 'Electric',
    focusSlug: 'maxwell',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}
const ironSweepBase = runIronSweep();
const ironSweepImm = runIronSweep({
  maxwell: withPatchedOverride('maxwell', (ov) => {
    ov.skill1.push({
      slot: 'skill1',
      trigger: { kind: 'passive' },
      target: { kind: 'alliesOfElement', element: 'Wind' },
      effects: [
        { kind: 'buff', stat: 'chargeSpeedPct', value: 50, durationSec: 10 },
        { kind: 'buff', stat: 'atkPct', value: 10, durationSec: 10 },
      ],
    });
  }),
});
const ironSweepNoImm = runIronSweep({
  maxwell: withPatchedOverride('maxwell', (ov) => {
    ov.skill1.push({
      slot: 'skill1',
      trigger: { kind: 'passive' },
      target: { kind: 'alliesOfElement', element: 'Wind' },
      effects: [
        { kind: 'buff', stat: 'chargeSpeedPct', value: 50, durationSec: 10 },
        { kind: 'buff', stat: 'atkPct', value: 10, durationSec: 10 },
      ],
    });
  }),
  liberalio: withPatchedOverride('liberalio', (ov) => {
    if (!ov.charFixes?.statImmunities?.includes('chargeSpeedPct')) {
      throw new Error(
        'liberalio charFixes.statImmunities lacks chargeSpeedPct — fixture is stale'
      );
    }
    ov.charFixes.statImmunities = ov.charFixes.statImmunities.filter(
      (s: string) => s !== 'chargeSpeedPct'
    );
  }),
});

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const libDamage = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  dmg(evs).filter((d) => d.slug === 'liberalio' && d.srcSlot === srcSlot);
const libShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'liberalio');
const libBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'liberalio'
  );
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart');
const libBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === LIB && b.stat === stat);

describe('liberalio — kit spec', () => {
  describe('L1 — S1 grants self ATK ▲160% for 3 sec on Full Burst entry', () => {
    const applied = libBuffs(base.events, 'atkPct');

    it('is 160%, self-scoped, 3 sec, once per Full Burst entry', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect(applied.length).toBe(fbStarts(base.events).length);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([160]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([LIB]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(3 * FPS);
      }
    });

    it('DISCRIMINATING: the skill-level-9 magnitude 152.73 is not the shipped value', () => {
      const vals = [
        ...new Set(libBuffs(cf.events, 'atkPct').map((b) => b.value)),
      ];
      expect(vals).toContain(152.73);
      expect(vals).not.toContain(160);
    });
  });

  describe('L2 — S1 core full-charges grant self Attack Damage ▲20.83% for 60 sec', () => {
    const applied = libBuffs(base.events, 'attackDamagePct').filter(
      (b) => b.value === 20.83
    );

    it('fires on core exposure and the 60s duration keeps it up permanently', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([LIB]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(60 * FPS);
      }
    });

    it('DISCRIMINATING (requiresCore): at coreHitRate 0 the line is fully dark', () => {
      const dark = libBuffs(noCore.events, 'attackDamagePct').filter(
        (b) => b.value === 20.83
      );
      expect(dark).toEqual([]);
      // ...while her un-gated Attack Damage lines persist (Raging Current still applies).
      expect(
        libBuffs(noCore.events, 'attackDamagePct').filter(
          (b) => b.value === 231
        ).length
      ).toBeGreaterThan(0);
    });

    it('DISCRIMINATING: the skill-level-9 magnitude 19.89 is not the shipped value', () => {
      const vals = [
        ...new Set(libBuffs(cf.events, 'attackDamagePct').map((b) => b.value)),
      ];
      expect(vals).toContain(19.89);
      expect(vals).not.toContain(20.83);
    });
  });

  describe('L3 — S1 rider: 5 × 40.5% = 202.5% of final ATK per full charge (MEASURED 5-hit read)', () => {
    const riders = libDamage(base.events, 'skill1');

    it('lands once per full charge at 202.5%, in the skill bucket', () => {
      expect(riders.length).toBeGreaterThan(0);
      expect(riders.length).toBe(libShots(base.events).length);
      expect([...new Set(riders.map((d) => d.atkPct))]).toEqual([202.5]);
      expect([...new Set(riders.map((d) => d.bucket))]).toEqual(['skill']);
    });

    it('is range-exempt (noRange) while her normals take the range major', () => {
      expect(riders.every((d) => !d.rangeApplied)).toBe(true);
      expect(libDamage(base.events, 'normal').some((d) => d.rangeApplied)).toBe(
        true
      );
    });

    it('is crit-eligible but NOT core-eligible (the kit grants no core strike on the rider)', () => {
      expect(riders.every((d) => d.critEligible)).toBe(true);
      expect(riders.every((d) => !d.coreEligible)).toBe(true);
    });

    it('takes the +50% FB major when it lands in Full Burst (noFb REMOVED, panel-accepted)', () => {
      const inFb = riders.filter((d) => d.inFullBurst);
      expect(inFb.length).toBeGreaterThan(0);
      expect(inFb.every((d) => d.fbMajorApplied)).toBe(true);
      expect(
        riders.filter((d) => !d.inFullBurst).every((d) => !d.fbMajorApplied)
      ).toBe(true);
    });

    it('DISCRIMINATING: the single-hit 40.5% misread is not the shipped magnitude', () => {
      expect([
        ...new Set(libDamage(cf.events, 'skill1').map((d) => d.atkPct)),
      ]).toEqual([40.5]);
    });
  });

  describe('L3b — the rider credits ONE gauge impact per full charge (KNOWN GAP, measurement-gated)', () => {
    // The kit's "Activates 5 times" is one aggregated damage instance of 202.5 but FIVE physical
    // impacts, and `docs/data/burst-gauge.md` §5 credits gauge per skill-damage impact at the
    // caster's target per-trigger value with no focus bonus (measured on `maiden-ice-rose`'s rider
    // at exactly 364). An aggregated multi-hit therefore needs `flatDamage.gaugeHits` to declare
    // its count — and HERS DELIBERATELY DOES NOT CARRY IT (audit 2026-08-17).
    //
    // This group pins the SHIPPED state (1 credit) so it cannot drift silently in either
    // direction, and pins what the fix would move. It is NOT an endorsement of 1: the count
    // evidence is strong (kit-literal, and rl3 33.6 = 2 triggers × 6 impacts × 2.8 base — exact,
    // 1 bullet + 5 sub-hits), but crediting all five pushes refill-from-zero BELOW the measured
    // refill on the same footage while improving Full-Burst counts, so two measured observables
    // disagree about the magnitude (the compensating-errors shape). Whoever settles it flips the
    // shipped side and this group's expectation together.
    // Sizing arm: scripts/battery/liberalio-gaugehits-ab.ts.
    const libBase = unitOf(noBurstGaugeBase, 'liberalio');
    const libFive = unitOf(noBurstGaugeFive, 'liberalio');

    // This assertion also pins the SHIPPED side: were `gaugeHits: 5` already on the rider, the two
    // arms would be identical and the difference would read 0 instead of 4 × pulls × 5.6.
    it('DISCRIMINATING (gauge): the 5-sub-hit arm would add 4 skillGauge calls per full charge', () => {
      expect(libBase.pulls).toBeGreaterThan(0);
      // her targetPerTrigger is 560 ⇒ each skillGauge call feeds 5.6 gauge-percent
      const expectedDiff = 4 * libBase.pulls * 5.6;
      expect(libFive.gaugeGenerated - libBase.gaugeGenerated).toBeCloseTo(
        expectedDiff,
        -1
      );
    });

    it('the sub-hit credit is gauge-ONLY — damage is identical in both arms', () => {
      expect(totals(noBurstGaugeFive).liberalio).toBeCloseTo(
        totals(noBurstGaugeBase).liberalio,
        6
      );
    });
  });

  describe('L4 — S1 grants the lowest-final-ATK Burst-3 ally Charge Speed ▲12.74% for 10 sec', () => {
    const applied = libBuffs(base.events, 'chargeSpeedPct');

    it('reaches helm ALONE (the only other B3; excludeSelf bars self-targeting)', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect(applied.length).toBe(fbStarts(base.events).length);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([12.74]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([HELM]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('DISCRIMINATING: the old top-3-ATK-allies misparse spreads the buff across ≥2 holders', () => {
      const targets = new Set(
        libBuffs(cf.events, 'chargeSpeedPct').map((b) => b.targetIdx)
      );
      expect(targets.size).toBeGreaterThan(1);
    });
  });

  describe('L5 — S2 Raging Current: continuous self Attack Damage ▲231% (solo-raid stage target)', () => {
    const applied = libBuffs(base.events, 'attackDamagePct').filter(
      (b) => b.value === 231
    );

    it('is self-scoped with NO wall-clock expiry, earned on her first landed charge', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([LIB]);
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
      // Trigger identity (fixed 2026-07-26, S5-driven): 'Activates when LANDING a Full Charge
      // attack against the stage target' — NOT a t=0 passive. First apply lands after her first
      // shot resolves (chargeFrames 90 ⇒ frame ≥ 90), never at frame 0.
      expect(applied[0].frame).toBeGreaterThanOrEqual(90);
    });

    it('DISCRIMINATING: the skill-level-9 magnitude 220.5 is not the shipped value', () => {
      const vals = [
        ...new Set(libBuffs(cf.events, 'attackDamagePct').map((b) => b.value)),
      ];
      expect(vals).toContain(220.5);
      expect(vals).not.toContain(231);
    });
  });

  describe('L7 — S2 immunity to Increase/Decrease Charge Speed effects (continuous)', () => {
    const shotsOf = (evs: SimEvent[], slug: string) =>
      evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === slug).length;
    const csTargets = (evs: SimEvent[]) =>
      new Set(
        buffs(evs)
          .filter((b) => b.stat === 'chargeSpeedPct' && b.value === 50)
          .map((b) => b.targetIdx)
      );

    it('an EXTERNAL Charge Speed ▲50% aimed at her leaves her fire cycle untouched', () => {
      // sole receiver ⇒ nothing else in the comp moves, so equality is exact, not approximate
      expect(shotsOf(extLib.events, 'liberalio')).toBe(
        shotsOf(base.events, 'liberalio')
      );
      expect(
        libShots(extLib.events)
          .map((s) => s.frame)
          .join(',')
      ).toBe(
        libShots(base.events)
          .map((s) => s.frame)
          .join(',')
      );
      expect(csTargets(extLib.events).has(LIB)).toBe(false);
    });

    it('the stat is stripped PER STAT: the atkPct bundled in the same buff still lands on her', () => {
      const bundled = buffs(extLib.events).filter(
        (b) => b.stat === 'atkPct' && b.value === 10
      );
      expect(bundled.length).toBeGreaterThan(0);
      expect([...new Set(bundled.map((b) => b.targetIdx))]).toEqual([LIB]);
    });

    it('DISCRIMINATING: without the immunity the SAME buff speeds her up', () => {
      expect(csTargets(extLibNoImm.events).has(LIB)).toBe(true);
      expect(shotsOf(extLibNoImm.events, 'liberalio')).toBeGreaterThan(
        shotsOf(base.events, 'liberalio')
      );
    });

    it('the same buff DOES speed up a non-immune charge ally (helm, SR/Water)', () => {
      expect(csTargets(extHelm.events).has(HELM)).toBe(true);
      expect(shotsOf(extHelm.events, 'helm')).toBeGreaterThan(
        shotsOf(base.events, 'helm')
      );
    });

    it('is PER TARGET: one team-wide cast reaches every ally but her', () => {
      const targets = csTargets(extAll.events);
      expect(targets.has(LIB)).toBe(false);
      expect(targets.has(HELM)).toBe(true);
      expect(targets.size).toBe(3); // liter, crown, helm
    });

    it('her OWN S1 Charge Speed grant to an ally is unaffected (excludeSelf intact)', () => {
      const own = libBuffs(base.events, 'chargeSpeedPct');
      expect(own.length).toBeGreaterThan(0);
      expect([...new Set(own.map((b) => b.targetIdx))]).toEqual([HELM]);
      expect([...new Set(own.map((b) => b.value))]).toEqual([12.74]);
    });

    it('L7c: the unmodified iron-sweep comp never grants liberalio chargeSpeedPct', () => {
      const csToLib = buffs(ironSweepBase.events).filter(
        (b) => b.stat === 'chargeSpeedPct' && b.targetSlug === 'liberalio'
      );
      expect(csToLib).toHaveLength(0);
    });

    it('L7c: in the iron-sweep comp, a maxwell-style bundled grant to liberalio leaves her fire cycle untouched', () => {
      // Wind is unique to liberalio in this roster, so the injected buff targets her alone.
      expect(shotsOf(ironSweepImm.events, 'liberalio')).toBe(
        shotsOf(ironSweepBase.events, 'liberalio')
      );
      expect(
        libShots(ironSweepImm.events)
          .map((s) => s.frame)
          .join(',')
      ).toBe(
        libShots(ironSweepBase.events)
          .map((s) => s.frame)
          .join(',')
      );
      const csToLib = buffs(ironSweepImm.events).filter(
        (b) =>
          b.stat === 'chargeSpeedPct' &&
          b.value === 50 &&
          b.targetSlug === 'liberalio'
      );
      expect(csToLib).toHaveLength(0);
    });

    it('L7c: the bundled atkPct still lands on her in the iron-sweep comp', () => {
      const bundled = buffs(ironSweepImm.events).filter(
        (b) => b.stat === 'atkPct' && b.value === 10
      );
      expect(bundled.length).toBeGreaterThan(0);
      expect([...new Set(bundled.map((b) => b.targetSlug))]).toEqual([
        'liberalio',
      ]);
    });

    it('L7c: without the immunity the same bundled grant speeds her up', () => {
      const csToLib = buffs(ironSweepNoImm.events).filter(
        (b) =>
          b.stat === 'chargeSpeedPct' &&
          b.value === 50 &&
          b.targetSlug === 'liberalio'
      );
      expect(csToLib.length).toBeGreaterThan(0);
      expect(shotsOf(ironSweepNoImm.events, 'liberalio')).toBeGreaterThan(
        shotsOf(ironSweepBase.events, 'liberalio')
      );
    });
  });

  describe('L8 — burst grants self Attack Damage ▲50% for 10 sec', () => {
    const applied = libBuffs(base.events, 'attackDamagePct').filter(
      (b) => b.value === 50
    );

    it('fires once per burst cast, self-scoped, 10 sec', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect(applied.length).toBe(libBursts(base.events).length);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([LIB]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('DISCRIMINATING: the skill-level-9 magnitude 47.73 is not the shipped value', () => {
      const vals = [
        ...new Set(libBuffs(cf.events, 'attackDamagePct').map((b) => b.value)),
      ];
      expect(vals).toContain(47.73);
      expect(vals).not.toContain(50);
    });
  });

  describe('L9 — burst nuke: 925% of final ATK to all enemies, cast BEFORE the FB window', () => {
    const nukes = libDamage(base.events, 'burst');

    it('fires once per cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes.length).toBeGreaterThan(0);
      expect(nukes.length).toBe(libBursts(base.events).length);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([925]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      expect(nukes.filter((d) => d.fbMajorApplied)).toEqual([]);
    });

    it('is range-exempt and core-ineligible (a burst skill, not a ranged weapon hit)', () => {
      expect(nukes.every((d) => !d.rangeApplied)).toBe(true);
      expect(nukes.every((d) => !d.coreEligible)).toBe(true);
      expect(nukes.every((d) => d.critEligible)).toBe(true);
    });

    it('DISCRIMINATING: the skill-level-9 magnitude 882.95 is not the shipped value', () => {
      expect([
        ...new Set(libDamage(cf.events, 'burst').map((d) => d.atkPct)),
      ]).toEqual([882.95]);
    });
  });
});
