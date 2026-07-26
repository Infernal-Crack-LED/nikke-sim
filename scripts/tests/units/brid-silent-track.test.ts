// PER-UNIT KIT SPEC — `brid-silent-track` (Brid: Silent Track, Supporter/SG/Fire, Burst II,
// cd 20s, ammo 9, hitsPerShot 10 pellets, reloadFrames 111). Kit-autonomy gauntlet 2026-07-25.
//
// One assertion group per KIT LINE (B1..B5 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters['brid-silent-track'].skills):
//   S1 ■ entering Full Burst → all Wind Code enemies: Damage Taken ▲15.12% for 10 sec        [B1]
//      ■ entering Full Burst → all enemies: 636% of final ATK as damage                       [B2]
//   S2 ■ after 10 normal attacks → 1 Wind Code enemy (lowest HP): Damage Taken ▲12.12% / 10s  [B3]
//      ■ after 5 normal attacks → 1 enemy (lowest HP): 675% of final ATK as damage            [B4]
//   BU ■ all allies (except self): ATK ▲66.52% of the skill user's ATK for 10 sec              [B5]
//
// Disposition: ALL FIVE lines FAITHFUL. The override is PROMOTED + SOLO-VALIDATED 2026-07-16
// (measured solo read 74,592,500; S2 675% rider measured EXACTLY every 5th pull). This gauntlet
// re-validates the loaded encoding test-first and discriminates each line against its nearest
// wrong model.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   B1/B3  the two Damage-Taken debuffs are GATED on a Wind-Code boss (`bossElementGate:'Wind'`).
//          The scope-lock boss is neutral/Fire, so the faithful model is INERT there: shipped vs
//          debuff-removed must be byte-identical on a Fire boss, and no damageTakenPct event may
//          appear. The counterfactual that DROPS the gate fires the debuff vs the Fire boss (events
//          appear, totals move) — i.e. the shipped inertness is one the ungated model provably
//          fails. A Wind-boss run proves the gate OPENS correctly (events appear at the kit value).
//   B2     636% on fullBurstEnter: fires once per Full Burst window (count == fullBurstStart
//          count), in the skill bucket, and — FB by TIMING (no noFb) — takes the +50% FB major.
//          A burstCast trigger or a noFb model fails one of these.
//   B4     675% on hitCount 50 (5 shots × 10 pellets): the recurring rider. Count == floor(shots/5).
//          The SHOT-vs-PELLET reading (override FLAG b) is discriminated by a hitCount-5 counterfactual
//          (the "5 NA = 5 pellets" misreading) which fires ~10× more often.
//   B5     casterAtkPct (a grant of FLAT ATK = 66.52% of the CASTER's static ATK) on all allies
//          EXCEPT self. excludeSelf is discriminated by an includes-self counterfactual (brid joins
//          her own targets). The 66.52 magnitude is pinned against a 100% counterfactual whose flat
//          grant equals the caster's static ATK exactly (shipped/100% == 0.6652).
//
// UNMODELED (inert in the partless single-boss scope-lock, documented not asserted):
//   - B3/B4 "lowest remaining HP" single-target selection — the engine has no HP pool, so the
//     selector is indeterminate; vs the ONE scope-lock boss it is identical to a plain enemy target.
//     The override targets `enemy`; board-inert today.
//   - SG cadence tuple (pullsPerSec/reloadFrames) + SG spray/core bands (override FLAGS a, c): her
//     OWN SG damage is low-confidence, but every kit LINE is still modeled; these are magnitude
//     ⚑s on the weapon model, not missing kit lines. No assertion (inert stats per gauntlet rule).
//
// Fixture: liter (B1) / brid-silent-track (B2, sole B2 → casts every Full Burst) / ada (B3) /
// helm (B3), focus ada — the 720-kit-audit control core with crown swapped for brid so her burst
// cadence is clean. Deterministic (no seed). Wind-boss run shares the same rotation.
import { describe, expect, it } from 'vitest';
import type { Element, SimEvent } from '../../../src/types.js';
import {
  runComp,
  totals,
  withPatchedOverride,
  type CompOptions,
} from '../lib/harness.js';

const FPS = 60;
const SLUG = 'brid-silent-track';
/** comp slot order: liter 0 / brid 1 / ada 2 / helm 3. */
const BRID = 1;
const COMP_SIZE = 4;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

const bridComp = (bossElement: Element): CompOptions => ({
  slugs: ['liter', SLUG, 'ada', 'helm'],
  bossElement,
  focusSlug: 'ada',
});

function run(bossElement: Element, overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...bridComp(bossElement),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual / isolation patches -------------------------------------------------------
const hasFlat = (b: any, atkPct: number) =>
  b.effects.some((e: any) => e.kind === 'flatDamage' && e.atkPct === atkPct);
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** B2 reference: her S1 636% nuke removed entirely. */
const noS1Nuke = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasFlat(b, 636));
  if (ov.skill1.length === before)
    throw new Error('brid S1 636% block missing — fixture is stale');
});
/** B4 reference: her S2 675% rider removed entirely. */
const noS2Nuke = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasFlat(b, 675));
  if (ov.skill2.length === before)
    throw new Error('brid S2 675% block missing — fixture is stale');
});
/** B1 counterfactual: the S1 Wind debuff with its element gate DROPPED (fires vs any boss). */
const ungateS1 = withPatchedOverride(SLUG, (ov) => {
  const b = ov.skill1.find((x: any) => hasStat(x, 'damageTakenPct'));
  if (!b || !b.bossElementGate)
    throw new Error(
      'brid S1 gated damageTakenPct block missing — fixture is stale',
    );
  delete b.bossElementGate;
});
/** B3 counterfactual: the S2 Wind debuff with its element gate DROPPED. */
const ungateS2 = withPatchedOverride(SLUG, (ov) => {
  const b = ov.skill2.find((x: any) => hasStat(x, 'damageTakenPct'));
  if (!b || !b.bossElementGate)
    throw new Error(
      'brid S2 gated damageTakenPct block missing — fixture is stale',
    );
  delete b.bossElementGate;
});
/** B4 counterfactual: the SHOT-vs-PELLET misreading — hitCount 5 instead of 50 (≈10× the riders). */
const s2PelletMisread = withPatchedOverride(SLUG, (ov) => {
  const b = ov.skill2.find((x: any) => hasFlat(x, 675));
  if (!b || b.trigger.count !== 50)
    throw new Error('brid S2 hitCount-50 rider missing — fixture is stale');
  b.trigger.count = 5;
});
/** B5 counterfactual: the burst buff INCLUDES self (excludeSelf dropped). */
const burstInclSelf = withPatchedOverride(SLUG, (ov) => {
  const b = ov.burst.find((x: any) => hasStat(x, 'casterAtkPct'));
  if (!b || b.target.excludeSelf !== true)
    throw new Error(
      'brid burst excludeSelf casterAtkPct block missing — fixture is stale',
    );
  delete b.target.excludeSelf;
});
/** B5 magnitude reference: 100% of caster ATK → the flat grant equals the caster's static ATK. */
const burst100 = withPatchedOverride(SLUG, (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'casterAtkPct');
  if (!e)
    throw new Error(
      'brid burst casterAtkPct effect missing — fixture is stale',
    );
  e.value = 100;
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run('Fire');
const wind = run('Wind');
const noS1 = run('Fire', { [SLUG]: noS1Nuke });
const noS2 = run('Fire', { [SLUG]: noS2Nuke });
const ungS1 = run('Fire', { [SLUG]: ungateS1 });
const ungS2 = run('Fire', { [SLUG]: ungateS2 });
const pelletMisread = run('Fire', { [SLUG]: s2PelletMisread });
const inclSelf = run('Fire', { [SLUG]: burstInclSelf });
const b100 = run('Fire', { [SLUG]: burst100 });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const bridDamage = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  dmg(evs).filter((d) => d.slug === SLUG && d.srcSlot === srcSlot);
const bridShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === SLUG);
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart');
/** boss debuff events at an exact kit value (brid-specific magnitudes isolate her lines). */
const takenDebuff = (evs: SimEvent[], value: number) =>
  buffs(evs).filter((b) => b.stat === 'damageTakenPct' && b.value === value);
/** brid's casterAtkPct grants (the burst support line). */
const casterAtkGrants = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.stat === 'casterAtkPct' && b.casterIdx === BRID);

describe('brid-silent-track — kit spec', () => {
  describe('B1 — S1 Wind-Code Damage Taken ▲15.12% (Full Burst entry, 10s) is element-GATED', () => {
    it('is INERT vs the non-Wind (Fire) scope-lock boss — no debuff event appears', () => {
      expect(takenDebuff(base.events, 15.12).length).toBe(0);
    });

    it("removing it changes NO unit's total vs the Fire boss (it contributes nothing there)", () => {
      // The ungated counterfactual fires the debuff vs Fire and MOVES totals; shipped does not.
      expect(ungS1.totals).not.toEqual(base.totals);
    });

    it('DISCRIMINATING: dropping the gate fires the 15.12% debuff vs the Fire boss', () => {
      expect(takenDebuff(ungS1.events, 15.12).length).toBeGreaterThan(0);
    });

    it('OPENS vs a Wind boss at the kit value, on the boss, for 10 sec', () => {
      const applied = takenDebuff(wind.events, 15.12);
      expect(
        applied.length,
        'no 15.12% debuff vs a Wind boss — the gate never opened',
      ).toBeGreaterThan(0);
      for (const b of applied) {
        expect(
          b.targetIdx,
          'the debuff must land on the boss (targetIdx null)',
        ).toBeNull();
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });
  });

  describe('B2 — S1 636% final-ATK nuke on Full Burst entry, FB by timing', () => {
    const nukes = bridDamage(base.events, 'skill1');

    it('fires once per Full Burst window at the kit magnitude, in the skill bucket', () => {
      expect(nukes.length, 'no S1 nuke fired').toBeGreaterThan(0);
      expect(nukes.length).toBe(fbStarts(base.events).length);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([636]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['skill']);
    });

    it('takes the +50% Full Burst major (FB by TIMING — no noFb on this rider)', () => {
      expect(
        nukes.every((d) => d.fbMajorApplied),
        'a noFb model would drop the FB major',
      ).toBe(true);
    });

    it('DISCRIMINATING: removing it deletes the skill1 nuke entirely', () => {
      expect(bridDamage(noS1.events, 'skill1').length).toBe(0);
    });
  });

  describe('B3 — S2 Wind-Code Damage Taken ▲12.12% (every 10 NA = hitCount 100, 10s) is element-GATED', () => {
    it('is INERT vs the non-Wind (Fire) scope-lock boss — no debuff event appears', () => {
      expect(takenDebuff(base.events, 12.12).length).toBe(0);
    });

    it('DISCRIMINATING: dropping the gate fires the 12.12% debuff vs the Fire boss', () => {
      expect(takenDebuff(ungS2.events, 12.12).length).toBeGreaterThan(0);
      expect(ungS2.totals).not.toEqual(base.totals);
    });

    it('OPENS vs a Wind boss at the kit value, on the boss, for 10 sec', () => {
      const applied = takenDebuff(wind.events, 12.12);
      expect(
        applied.length,
        'no 12.12% debuff vs a Wind boss — the gate never opened',
      ).toBeGreaterThan(0);
      for (const b of applied) {
        expect(b.targetIdx).toBeNull();
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('counts ROUNDS not pellets: one proc per 10 shots (hitCount 100 at 10 pellets/shot)', () => {
      // The reviewer's biggest quantitative trap: a pellet-counting model crosses hitCount 100
      // every SINGLE pull (10 pellet-hits), firing ~10× too often. Round counting fires floor(shots/10).
      const shots = bridShots(wind.events).length;
      const procs = takenDebuff(wind.events, 12.12).length;
      expect(procs).toBe(Math.floor(shots / 10));
    });
  });

  describe('B4 — S2 675% final-ATK rider every 5 normal attacks (hitCount 50 at 10 pellets/shot)', () => {
    const riders = bridDamage(base.events, 'skill2');
    const shots = bridShots(base.events).length;

    it('fires at the measured every-5th-pull cadence (floor(shots/5)) at the kit magnitude', () => {
      expect(riders.length, 'no S2 rider fired').toBeGreaterThan(0);
      expect(riders.length).toBe(Math.floor(shots / 5));
      expect([...new Set(riders.map((d) => d.atkPct))]).toEqual([675]);
      expect([...new Set(riders.map((d) => d.bucket))]).toEqual(['skill']);
      expect(riders.every((d) => d.critEligible)).toBe(true);
    });

    it('DISCRIMINATING: the pellet misreading (hitCount 5) fires ~10× more riders', () => {
      const misread = bridDamage(pelletMisread.events, 'skill2').length;
      expect(misread).toBeGreaterThan(riders.length * 2);
    });

    it('DISCRIMINATING: removing it deletes the skill2 rider entirely', () => {
      expect(bridDamage(noS2.events, 'skill2').length).toBe(0);
    });
  });

  describe('B5 — burst ATK ▲66.52% of caster ATK on all allies EXCEPT self, 10s', () => {
    const grants = casterAtkGrants(base.events);

    it('reaches every ally except brid herself', () => {
      expect(grants.length, 'no casterAtkPct grant fired').toBeGreaterThan(0);
      const targets = new Set(grants.map((b) => b.targetIdx));
      expect(
        targets.has(BRID),
        'excludeSelf violated — brid is among her own targets',
      ).toBe(false);
      expect(targets.size, 'must reach the other 3 allies').toBe(COMP_SIZE - 1);
    });

    it('DISCRIMINATING: dropping excludeSelf adds brid to her own targets', () => {
      const targets = new Set(
        casterAtkGrants(inclSelf.events).map((b) => b.targetIdx),
      );
      expect(targets.has(BRID)).toBe(true);
      expect(targets.size).toBe(COMP_SIZE);
    });

    it("is 66.52% of the caster's static ATK (a flat-ATK grant, not a raw percentage)", () => {
      const shipped = [...new Set(grants.map((b) => b.value))];
      const ref = [
        ...new Set(casterAtkGrants(b100.events).map((b) => b.value)),
      ];
      expect(
        shipped.length,
        'the flat grant must be a single constant value',
      ).toBe(1);
      expect(ref.length).toBe(1);
      // 100% counterfactual grant == caster static ATK; shipped == 0.6652 × that.
      expect(shipped[0] / ref[0]).toBeCloseTo(0.6652, 6);
    });

    it('lasts 10 sec', () => {
      for (const b of grants) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });
  });
});
