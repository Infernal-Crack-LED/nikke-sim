// PER-UNIT KIT SPEC — `rei-ayanami` (Rei Ayanami, Attacker/MG/Fire, Burst III, cd 40s, ammo 300,
// reloadFrames 171, hitsPerShot 1, normalMult 5.57). Kit-autonomy gauntlet 2026-07-25
// (driver-authored, test-first). EXACT SLUG: this is `rei-ayanami` (nicknamed "ra") — reason from
// the slug; there is no other Rei variant in the roster.
//
// One assertion group per KIT LINE (RA1..RA5 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters['rei-ayanami'].skills):
//   S1 ■ after 100 normal attacks → self:
//        Elemental Advantage Attack Damage ▲ 30.23% for 3 sec                         [RA1]
//      ■ after landing 100 normal attacks → enemy nearest crosshair:
//        Deals 112.37% of final ATK as damage                                         [RA2]
//   S2 ■ start of battle → self:
//        Damage dealt to Shield ▲ 700.5% continuously                                 [UNMODELED]
//      ■ entering Burst stage 3 → all Fire Code allies:
//        ATK ▲ 25.03% OF THE SKILL USER'S ATK for 10 sec                              [RA3]
//   BU ■ all Fire Code allies:
//        Shield = 13.44% of caster final Max HP for 10 sec                            [⚑ event-only]
//        Attack damage ▲ 48.02% for 10 sec                                            [RA4]
//      ■ all enemies:
//        Deals 990.2% of final ATK as damage                                          [RA5]
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   RA1 elemAdvantageDamagePct 30.23 lives in the ELEMENT bucket and pays ONLY under real Fire
//       advantage (BEATS[Fire]=Wind). Proven three ways: vs a Wind boss removing it changes her
//       total (LIVE); vs an Iron boss (no advantage) removing it changes NOTHING (GATED,
//       byte-identical); and an ungated attackDamagePct counterfactual WOULD change the Iron-boss
//       total (over-credits) — i.e. the shipped gating is one the generic damage buff provably
//       fails. Cadence is the hitCount-100 proc: apply count == floor(her shots / 100) (MG
//       hitsPerShot 1 ⇒ one hit per shot), self-scoped, 3s window.
//   RA2 the hitCount-100 nuke: fires once per 100 landed hits (NOT every shot, NOT once per burst),
//       magnitude 112.37, in the SKILL bucket, crit-eligible (function-type "additional damage"
//       convention), NOT core-eligible (text "as damage", not "core strike damage"). The
//       "enemy nearest crosshair" collapses to the single partless boss (one instance).
//   RA3 casterAtkPct = a FLAT add of HER ATK, never a % of the target's own ATK. Target is
//       element-scoped ("all Fire Code allies"): in this fixture rei is the ONLY Fire unit, so the
//       buff must reach her (targetIdx REI) and EXCLUDE liter/crown (Iron/Iron). Proven two ways:
//       shipped reaches {REI} only, and a generic `allies` counterfactual reaches all three. For
//       the SELF-only Fire target the flat-vs-self-% axis is damage-identical (caster===target ⇒
//       flat 0.2503×herATK == +25.03% of her own ATK), so the mechanic is pinned by the buffApply
//       `stat`/`key` (casterAtkPct, raw 25.03), not a damage delta. Trigger is stageEnter stage 3:
//       rei is the SOLE Burst III unit in the fixture, so it fires precisely on her burstCast
//       frames (apply count == her burst casts), 10s window.
//   RA4 the burst Attack damage ▲48.02% is the load-bearing Damage-Up line: removing it changes her
//       total (LIVE). Element-scoped to Fire allies (reaches {REI} only; generic `allies` reaches
//       all three), burstCast-keyed (once per cast), 10s window. The co-listed Shield (13.44% of
//       caster Max HP) is EVENT-ONLY: the engine models no HP pool, the shield emits NO log event
//       (it only sets a shielded-state window), and no unit in this fixture has a shielded trigger
//       — so it is unobservable here and asserted nowhere (⚑3; documented, not silently dropped).
//   RA5 the burst nuke: 990.2% of final ATK, fires once per burst cast in the BURST bucket,
//       crit-eligible, NOT core-eligible, and FB-EXEMPT — a burst CAST lands BEFORE the Full Burst
//       window opens, so it must never take the +50% major (verified engine fact).
//
// Fixture: liter (B1) / crown (B2) / rei-ayanami (B3), helm OMITTED so rei is the SOLE Burst III
// caster — her stageEnter-3 (RA3) and burstCast (RA4/RA5) blocks then fire exactly on her own burst
// frames, with no second B3 to share the stage. She needs the B1→B2→B3 chain to cast at all (a lone
// Burst III unit makes ZERO Full Bursts). Boss element varies per line: Wind makes rei (Fire) the
// ONLY advantaged unit (RA1 LIVE); Iron makes nobody advantaged (RA1 gating control). Deterministic
// (no seed). Inert UNMODELED stats: S2's "Damage dealt to Shield ▲700.5%" — no shield-damage StatKey
// in the schema and the scope-lock boss is partless (no shield), so it moves no damage; it lives in
// the override's `unmodeled.skill2` and is asserted nowhere.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const SLUG = 'rei-ayanami';
/** controlComp(SLUG, false) slot order: liter 0 / crown 1 / rei-ayanami 2 (helm omitted). */
const REI = 2;
/** controlComp(SLUG, true) slot order: liter 0 / crown 1 / rei-ayanami 2 / helm 3. */
const HELM = 3;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

type Boss = 'Wind' | 'Iron';

/** Primary fixture: boss Wind ⇒ rei (Fire) is the ONLY advantaged unit (BEATS[Fire]=Wind; liter and
 *  crown are Iron, not advantaged). `Iron` is the no-advantage control for RA1. helm is OMITTED so
 *  rei is the sole Burst III caster — her stageEnter-3 and burstCast blocks then fire exactly on her
 *  own burst frames (clean per-line cadence). */
function run(overrides: Record<string, any> = {}, bossElement: Boss = 'Wind') {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp(SLUG, false),
    bossElement,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

/** Trigger-identity fixture: helm RESTORED as a second Burst III caster. Now "entering stage 3"
 *  (stageEnter) fires on EVERY B3 cast — rei's AND helm's — while rei's OWN burstCast blocks fire on
 *  rei's casts only. The divergent cadences are the stageEnter-vs-burstCast discriminator (RA3 vs
 *  RA4/RA5). Boss Wind keeps rei the only advantaged unit. */
function runHelm(
  overrides: Record<string, any> = {},
  bossElement: Boss = 'Wind',
) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp(SLUG, true),
    bossElement,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual / reference patches -------------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** RA1 reference: her S1 elemental-advantage line removed. */
const reiNoElemAdv = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill1.flatMap((b: any) => b.effects).length;
  for (const b of ov.skill1)
    b.effects = b.effects.filter(
      (e: any) => e.stat !== 'elemAdvantageDamagePct',
    );
  if (ov.skill1.flatMap((b: any) => b.effects).length === before)
    throw new Error(
      'rei S1 elemAdvantageDamagePct effect missing — fixture is stale',
    );
});
/** RA1 counterfactual: the same line as an UNGATED Damage-Up buff (over-credits when not advantaged). */
const reiUngatedElemAdv = withPatchedOverride(SLUG, (ov) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'elemAdvantageDamagePct');
  if (!e)
    throw new Error(
      'rei S1 elemAdvantageDamagePct effect missing — fixture is stale',
    );
  e.stat = 'attackDamagePct';
});
/** RA2/RA5 encoding reference: both flatDamage riders made core-eligible (text says "as damage"). */
const reiCoreRider = withPatchedOverride(SLUG, (ov) => {
  let patched = 0;
  for (const slot of ['skill1', 'burst'] as const)
    for (const b of ov[slot])
      for (const e of b.effects)
        if (e.kind === 'flatDamage') {
          e.core = true;
          patched++;
        }
  if (patched !== 2)
    throw new Error(
      'rei expected 2 flatDamage riders (S1 + burst) — fixture is stale',
    );
});
/** RA3 encoding reference: casterAtkPct → atkPct (self-scaling % instead of flat caster add). */
const reiAtkPct = withPatchedOverride(SLUG, (ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'casterAtkPct');
  if (!e)
    throw new Error('rei S2 casterAtkPct effect missing — fixture is stale');
  e.stat = 'atkPct';
});
/** RA3/RA4 counterfactual: re-target every Fire-element-scoped block to ALL allies. */
const reiGenericAllies = withPatchedOverride(SLUG, (ov) => {
  let patched = 0;
  for (const slot of ['skill2', 'burst'] as const)
    for (const b of ov[slot])
      if (b.target?.kind === 'alliesOfElement') {
        b.target = { kind: 'allies' };
        patched++;
      }
  if (patched !== 2)
    throw new Error(
      'rei expected 2 alliesOfElement blocks (S2 + burst) — fixture is stale',
    );
});
/** RA4 reference: her burst Attack-damage line removed (the load-bearing Damage-Up buff). */
const reiNoBurstDmgUp = withPatchedOverride(SLUG, (ov) => {
  const before = ov.burst.flatMap((b: any) => b.effects).length;
  for (const b of ov.burst)
    b.effects = b.effects.filter((e: any) => e.stat !== 'attackDamagePct');
  if (ov.burst.flatMap((b: any) => b.effects).length === before)
    throw new Error(
      'rei burst attackDamagePct effect missing — fixture is stale',
    );
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run(); // boss Wind, shipped
const noElemAdv = run({ [SLUG]: reiNoElemAdv });
const coreRider = run({ [SLUG]: reiCoreRider });
const atkPct = run({ [SLUG]: reiAtkPct });
const genericAllies = run({ [SLUG]: reiGenericAllies });
const noBurstDmgUp = run({ [SLUG]: reiNoBurstDmgUp });
const baseIron = run({}, 'Iron'); // no advantage control
const noElemAdvIron = run({ [SLUG]: reiNoElemAdv }, 'Iron');
const ungatedElemAdvIron = run({ [SLUG]: reiUngatedElemAdv }, 'Iron');
const withHelm = runHelm(); // 2nd B3 ⇒ trigger-identity triangle

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const reiDamage = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  dmg(evs).filter((d) => d.slug === SLUG && d.srcSlot === srcSlot);
const reiShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === SLUG);
const reiBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === SLUG);
const helmBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'helm',
  );
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
/** Buffs emitted by rei's own kit on the given stat. */
const reiBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === REI && b.stat === stat);
/** Distinct holder slot indices a given rei buff key reached. */
const holdersOf = (evs: SimEvent[], key: string): Set<number> =>
  new Set(
    buffs(evs)
      .filter((b) => b.key === key)
      .map((b) => b.targetIdx as number),
  );

const S1_ELEMADV_KEY = `${REI}:skill1:elemAdvantageDamagePct:30.23`;
const S2_ATK_KEY = `${REI}:skill2:casterAtkPct:25.03`;
const BU_DMGUP_KEY = `${REI}:burst:attackDamagePct:48.02`;

describe('rei-ayanami — kit spec', () => {
  it('fixture sanity: rei actually casts her burst (needs the B1→B2→B3 chain)', () => {
    expect(
      reiBursts(base.events).length,
      'no rei burst was cast — fixture cannot exercise burst lines',
    ).toBeGreaterThan(0);
  });

  describe('RA1 — S1 Elemental Advantage Attack Damage ▲30.23%, hitCount 100, self, gated on advantage', () => {
    const applied = buffs(base.events).filter((b) => b.key === S1_ELEMADV_KEY);
    const procsExpected = Math.floor(reiShots(base.events).length / 100);

    it('is 30.23% on herself, one proc per 100 landed hits, 3 sec window', () => {
      expect(
        applied.length,
        'no S1 elemAdvantageDamagePct buff was applied',
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.stat))]).toEqual([
        'elemAdvantageDamagePct',
      ]);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([30.23]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([REI]);
      expect(
        applied.length,
        `${applied.length} procs vs ${procsExpected} = floor(shots/100)`,
      ).toBe(procsExpected);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(3 * FPS);
    });

    it('is LIVE under Fire advantage (Wind boss): removing it changes her total', () => {
      expect(base.totals[SLUG]).not.toEqual(noElemAdv.totals[SLUG]);
    });

    it('is GATED with no advantage (Iron boss): removing it changes NOTHING (byte-identical)', () => {
      expect(baseIron.totals).toEqual(noElemAdvIron.totals);
    });

    it('DISCRIMINATING: an ungated Damage-Up buff WOULD change the no-advantage total', () => {
      expect(baseIron.totals[SLUG]).not.toEqual(
        ungatedElemAdvIron.totals[SLUG],
      );
    });
  });

  describe('RA2 — S1 hitCount-100 nuke: 112.37% of final ATK, skill bucket, crit not core', () => {
    const riders = reiDamage(base.events, 'skill1');
    const procsExpected = Math.floor(reiShots(base.events).length / 100);

    it('lands once per 100 hits (NOT every shot, NOT once per burst)', () => {
      expect(riders.length, 'no S1 nuke landed').toBeGreaterThan(0);
      expect(
        riders.length,
        `${riders.length} procs vs ${procsExpected} = floor(shots/100)`,
      ).toBe(procsExpected);
      expect(riders.length).toBeLessThan(reiShots(base.events).length);
    });

    it('is the kit magnitude, crit-eligible, NOT core-eligible, in the skill bucket', () => {
      expect([...new Set(riders.map((d) => d.atkPct))]).toEqual([112.37]);
      expect([...new Set(riders.map((d) => d.bucket))]).toEqual(['skill']);
      expect(riders.every((d) => d.critEligible)).toBe(true);
      expect(riders.every((d) => !d.coreEligible)).toBe(true);
    });

    it('DISCRIMINATING: a core:true rider would become core-eligible (text says "as damage")', () => {
      expect(
        reiDamage(coreRider.events, 'skill1').every((d) => d.coreEligible),
      ).toBe(true);
    });

    it('is FB-by-timing, NOT noFb: procs landing inside Full Burst take the +50% major', () => {
      // The rider has no noFb flag, so a proc that lands while the FB window is open is FB-eligible.
      // Over 180s several procs land in-window; a wrongly-set noFb would make this empty.
      expect(riders.some((d) => d.fbMajorApplied)).toBe(true);
    });
  });

  describe('RA3 — S2 entering Burst Stage 3: ATK ▲25.03% of HER ATK, Fire allies, 10 sec (stageEnter)', () => {
    const applied = buffs(base.events).filter((b) => b.key === S2_ATK_KEY);

    it("is casterAtkPct (flat add of the skill user's ATK), magnitude 25.03, for 10 sec", () => {
      expect(
        applied.length,
        'no stageEnter-3 casterAtkPct buff was applied',
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.stat))]).toEqual([
        'casterAtkPct',
      ]);
      for (const b of applied) expect(b.key).toBe(S2_ATK_KEY);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('fires on her burstCast frames (sole B3 in fixture ⇒ once per burst cast)', () => {
      expect(applied.length).toBe(reiBursts(base.events).length);
    });

    it('reaches the Fire ally (herself) and EXCLUDES every non-Fire ally', () => {
      expect([...holdersOf(base.events, S2_ATK_KEY)].sort()).toEqual([REI]);
    });

    it('DISCRIMINATING: a generic `allies` target would reach all three units', () => {
      expect([...holdersOf(genericAllies.events, S2_ATK_KEY)].sort()).toEqual([
        0,
        1,
        REI,
      ]);
    });

    it('ENCODING: shipped logs casterAtkPct, the atkPct counterfactual logs atkPct (distinct mechanic)', () => {
      expect(reiBuffs(base.events, 'casterAtkPct').length).toBeGreaterThan(0);
      expect(
        reiBuffs(atkPct.events, 'casterAtkPct').filter((b) =>
          b.key.startsWith(`${REI}:skill2:`),
        ).length,
      ).toBe(0);
      expect(reiBuffs(atkPct.events, 'atkPct').length).toBeGreaterThan(0);
    });
  });

  describe('RA4 — burst Attack damage ▲48.02%, Fire allies, 10 sec (the load-bearing Damage-Up line)', () => {
    const applied = buffs(base.events).filter((b) => b.key === BU_DMGUP_KEY);

    it('is 48.02% for 10 sec, burstCast-keyed (once per cast)', () => {
      expect(
        applied.length,
        'no burst attackDamagePct buff was applied',
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([48.02]);
      expect(applied.length).toBe(reiBursts(base.events).length);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('reaches the Fire ally (herself) and EXCLUDES every non-Fire ally', () => {
      expect([...holdersOf(base.events, BU_DMGUP_KEY)].sort()).toEqual([REI]);
    });

    it('DISCRIMINATING: a generic `allies` target would reach all three units', () => {
      expect([...holdersOf(genericAllies.events, BU_DMGUP_KEY)].sort()).toEqual(
        [0, 1, REI],
      );
    });

    it('is LIVE: removing it changes her total (the FB-window Damage-Up is not inert)', () => {
      expect(base.totals[SLUG]).not.toEqual(noBurstDmgUp.totals[SLUG]);
    });
  });

  describe('RA5 — burst nuke: 990.2% of final ATK, cast BEFORE the Full Burst window', () => {
    const nukes = reiDamage(base.events, 'burst');

    it('fires once per burst cast at the kit magnitude, in the burst bucket, crit not core', () => {
      expect(nukes.length).toBe(reiBursts(base.events).length);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([990.2]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
      expect(nukes.every((d) => d.critEligible)).toBe(true);
      expect(nukes.every((d) => !d.coreEligible)).toBe(true);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      const took = nukes.filter((d) => d.fbMajorApplied);
      expect(
        took.map((d) => d.sec),
        'burst-cast damage must precede the FB window',
      ).toEqual([]);
    });

    it('DISCRIMINATING: a core:true nuke would become core-eligible (text says "as damage")', () => {
      expect(
        reiDamage(coreRider.events, 'burst').every((d) => d.coreEligible),
      ).toBe(true);
    });
  });

  describe("trigger identity — stageEnter:3 (RA3) fires on ANY B3 cast; burstCast (RA4/RA5) on rei's own", () => {
    // helm is a second Burst III caster in this fixture. "Entering Burst stage 3" happens on EVERY
    // chain (whoever casts the B3), so rei's stageEnter-3 block (RA3) fires on both rei's AND
    // helm's casts; her burstCast blocks (RA4 Attack damage, RA5 nuke) fire on her OWN casts only.
    // The divergent cadences are the stageEnter-vs-burstCast discriminator.
    const reiCasts = reiBursts(withHelm.events).length;
    const helmCasts = helmBursts(withHelm.events).length;

    it('fixture sanity: both B3 casters actually burst', () => {
      expect(reiCasts).toBeGreaterThan(0);
      expect(helmCasts).toBeGreaterThan(0);
    });

    it("RA3 (stageEnter:3) fires on EVERY B3 cast — rei's AND helm's rotations", () => {
      const applied = buffs(withHelm.events).filter(
        (b) => b.key === S2_ATK_KEY,
      );
      expect(applied.length).toBe(reiCasts + helmCasts);
      expect(
        applied.length,
        'strictly more than rei-only ⇒ stageEnter, not burstCast',
      ).toBeGreaterThan(reiCasts);
    });

    it("RA4 (burstCast Attack damage) fires on rei's casts ONLY, not helm's", () => {
      const applied = buffs(withHelm.events).filter(
        (b) => b.key === BU_DMGUP_KEY,
      );
      expect(applied.length).toBe(reiCasts);
    });

    it("RA5 (burstCast nuke) fires on rei's casts ONLY — count == rei casts, not all B3 casts", () => {
      const nukes = reiDamage(withHelm.events, 'burst');
      expect(nukes.length).toBe(reiCasts);
      expect(
        nukes.length,
        'a stageEnter-keyed nuke would fire on helm rotations too',
      ).toBeLessThan(reiCasts + helmCasts);
    });
  });
});
