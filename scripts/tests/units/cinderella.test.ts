// PER-UNIT KIT SPEC — `cinderella` (Cinderella, the BASE RL/Defender/Electric unit, aka "cindy";
// NOT the cinderella-crystal-wave MG/Iron variant), Burst III, cd 40s, ammo 24, chargeFrames 60.
// Kit-autonomy gauntlet 2026-07-25 — test-first faithful re-derivation.
//
// One assertion group per KIT LINE (C1..C7 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.cinderella.skills):
//   S1 ■ entering Burst Stage 3 → self: ATK ▲ 2.71% of final Max HP for 10 sec              [C1]
//      ■ attacking with Full Charge → self: Charge Speed ▲ 100%, removed on reload-to-max   [C2]
//      ■ hitting with Full Charge → the target: 136.6% of final ATK as additional damage    [C3]
//   S2 ■ battle start / B3 entry → self: Decoy avatar (96% final Max HP), continuous         [C4]
//      ■ every 3s while a decoy is present → self: Beautiful Max HP ▲ 1.6%, stacks ×12       [C5]
//   BU ■ random enemies: 1365.92% of final ATK, sequential ×10                              [C6]
//      ■ same targets when in Beautiful: 28.9% of final ATK, mirrors Beautiful stack count   [C7]
//
// Encoding under test (src/skills/overrides/cinderella.json, MAG-DUMP REBUILD 2026-07-21):
//   C1 → skill1[0] stageEnter(3) → self buff atkOfMaxHpPct 2.71 / 10s
//   C2 → charFixes.magDumpRof (one ~1.0s charge PRIMES the mag → 24 rockets autofire at the
//        datamined rate_of_fire 180 → ~2.1s reload → re-prime). The kit's "Charge Speed ▲ 100%
//        on full charge, removed on reload" toggle is the game's description of exactly this
//        autofire-after-first-charge cadence — modeled directly, no charge-speed proxy.
//   C3 → skill1[2] shotFired → enemy flatDamage atkPct 136.6
//   C4 → UNMODELED (defensive/aggro summon; the v1 boss deals no damage, so full decoy uptime —
//        and thus full Beautiful uptime — is assumed). Inert for damage; no assertion (header only).
//   C5 → skill1[1] passive → self buff casterMaxHpPct 19.2 rampSec 36 (1.6%×12 = 19.2%, accruing
//        over 3s×12 = 36s). Converted to a self maxHpFlat grant that feeds C1's atkOfMaxHpPct via
//        effectiveAtk — OWN-kit Max HP only (cindy e3 rule: ally Max-HP grants excluded).
//   C6 → burst[0] burstCast → enemy flatDamage atkPct 13659.2 (1365.92 × 10 consolidated)
//   C7 → burst[1] burstCast → enemy flatDamage atkPct 346.8 rampSec 36 (28.9 × 12 stacks, ramping
//        with Beautiful). Snapshotted at cast against battle-elapsed time.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   C1  atkOfMaxHpPct scales with her Max HP (~3.3M), NOT her static ATK (~80k). The nearest wrong
//       model is a generic atkPct (ATK-scaling): it would add ~2.2k ATK where the shipped HP-scaling
//       adds ~90k. Proven two ways: the shipped buff is named atkOfMaxHpPct (the ATK-scaling model
//       emits atkPct and so has NO atkOfMaxHpPct buff), and the shipped nuke baseAtk dwarfs the
//       ATK-scaling counterfactual's.
//   C2  the mag-dump fires the whole magazine at the autofire rate after ONE prime. The nearest
//       wrong model is per-rocket charging (charge before every rocket): it fires ~168 pulls/180s
//       where the dump fires ~434. A cadence assertion that the per-rocket model provably fails.
//   C3  the rider lands once per charged pull at the kit magnitude, in the skill bucket. Removing
//       it zeroes the rider line and drops her total — the buff-removed counterfactual.
//   C5  Beautiful is a RAMP, not a step: the first burst (t≈5.4s) carries PARTIAL Beautiful, a late
//       burst (t≥36s) carries FULL. Proven two ways: removing Beautiful drops the nuke baseAtk and
//       kills the early→late growth; making the ramp INSTANT lifts the first-cast nuke baseAtk to
//       its late value (the gradual-ramp model provably sits below it at the first cast).
//   C6  the nuke is 13659.2 (ten sequential hits consolidated), cast BEFORE the Full Burst window
//       opens, so it never takes the +50% FB major. Pinned against the single-hit 1365.92 and the
//       pre-rebuild baked 14006, and against any fbMajorApplied=true instance.
//   C7  the mirror ramps with Beautiful: the first cast's mirror is partial (≈51.7), a late cast's
//       is full 346.8. Making the mirror ramp INSTANT collapses every cast to 346.8 — the gradual
//       model provably produces a sub-346.8 mirror that the instant model cannot.
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / cinderella B3 [focus] / helm B3,
// boss Fire). Cinderella needs a real rotation to cast her burst at all (a lone B3 makes zero Full
// Bursts); two B3s (cinderella + helm) alternate, giving her six casts over 180s, the first at
// t≈5.4s — early enough that the Beautiful ramp is still partial, which is what makes C5/C7's
// early→late growth observable. Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** controlComp slot order: liter 0 / crown 1 / cinderella 2 / helm 3. */
const CINDY = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('cinderella'),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual / nearest-wrong patches ---------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** G1 pin reference: her stage-3 ATK conversion removed ENTIRELY (no atkOfMaxHpPct buff at all).
 *  Isolates whether the nuke snapshots the live same-cast conversion (burstSnapshotsPreFb:false). */
const cindyNoS1Buff = withPatchedOverride('cinderella', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'atkOfMaxHpPct'));
  if (ov.skill1.length === before) {
    throw new Error(
      'cinderella S1 atkOfMaxHpPct block missing — fixture is stale'
    );
  }
});
/** C1 nearest-wrong: her S1 ATK conversion as a GENERIC ATK% buff (ATK-scaling, not HP-scaling). */
const cindyAtkNotHp = withPatchedOverride('cinderella', (ov) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'atkOfMaxHpPct');
  if (!e) {
    throw new Error(
      'cinderella S1 atkOfMaxHpPct effect missing — fixture is stale'
    );
  }
  e.stat = 'atkPct';
});
/** C2 nearest-wrong: per-rocket charging (the mag-dump primitive turned off). */
const cindyNoMagDump = withPatchedOverride('cinderella', (ov) => {
  if (!ov.charFixes?.magDumpRof) {
    throw new Error(
      'cinderella charFixes.magDumpRof missing — fixture is stale'
    );
  }
  ov.charFixes.magDumpRof = false;
});
/** C3 reference: her full-charge rider removed. */
const cindyNoRider = withPatchedOverride('cinderella', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) =>
      !(
        b.trigger?.kind === 'fullCharge' &&
        b.effects.some((e: any) => e.kind === 'flatDamage')
      )
  );
  if (ov.skill1.length === before) {
    throw new Error('cinderella S1 rider block missing — fixture is stale');
  }
});
/** C5 reference: Beautiful removed entirely (no Max-HP ramp → no HP-scaling ATK feed). */
const cindyNoBeautiful = withPatchedOverride('cinderella', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'casterMaxHpPct'));
  if (ov.skill1.length === before) {
    throw new Error(
      'cinderella Beautiful (casterMaxHpPct) block missing — fixture is stale'
    );
  }
});
/** C5 nearest-wrong: Beautiful present but INSTANT (ramp removed → full from t=0). */
const cindyInstantBeautiful = withPatchedOverride('cinderella', (ov) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'casterMaxHpPct');
  if (!e || e.rampSec == null) {
    throw new Error('cinderella Beautiful rampSec missing — fixture is stale');
  }
  delete e.rampSec;
});
/** C7 nearest-wrong: the burst mirror present but INSTANT (ramp removed → full 346.8 every cast). */
const cindyInstantMirror = withPatchedOverride('cinderella', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'flatDamage' && x.rampSec != null);
  if (!e) {
    throw new Error(
      'cinderella burst mirror rampSec missing — fixture is stale'
    );
  }
  delete e.rampSec;
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noS1Buff = run({ cinderella: cindyNoS1Buff });
const atkNotHp = run({ cinderella: cindyAtkNotHp });
const noMagDump = run({ cinderella: cindyNoMagDump });
const noRider = run({ cinderella: cindyNoRider });
const noBeautiful = run({ cinderella: cindyNoBeautiful });
const instantBeautiful = run({ cinderella: cindyInstantBeautiful });
const instantMirror = run({ cinderella: cindyInstantMirror });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const cindyDamage = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'cinderella');
const cindyShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'cinderella');
const cindyBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'cinderella'
  );
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');

/** The consolidated 10-hit nuke (atkPct 13659.2), in cast order. */
const nukes = (evs: SimEvent[]) =>
  cindyDamage(evs)
    .filter((d) => d.bucket === 'burst' && d.atkPct === 13659.2)
    .sort((a, b) => a.frame - b.frame);
/** The Beautiful-stack mirror (the sub-1000 burst instance), in cast order. */
const mirrors = (evs: SimEvent[]) =>
  cindyDamage(evs)
    .filter((d) => d.bucket === 'burst' && d.atkPct < 1000)
    .sort((a, b) => a.frame - b.frame);
/** The full-charge rider (skill1 flatDamage), one per charged pull. */
const riders = (evs: SimEvent[]) =>
  cindyDamage(evs).filter((d) => d.srcSlot === 'skill1');

const maxBaseAtk = (ds: Damage[]) => Math.max(...ds.map((d) => d.baseAtk));

describe('cinderella — kit spec', () => {
  describe('C1 — S1 ATK = 2.71% of final Max HP on B3 entry (HP-scaling, self, 10s)', () => {
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === CINDY && b.stat === 'atkOfMaxHpPct'
    );

    it('is emitted as atkOfMaxHpPct 2.71, self-scoped, for 10 sec', () => {
      expect(
        applied.length,
        'no atkOfMaxHpPct buff was applied'
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([2.71]);
      expect(
        [...new Set(applied.map((b) => b.targetIdx))],
        'must be self-scoped'
      ).toEqual([CINDY]);
      expect([
        ...new Set(applied.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([10 * FPS]);
    });

    it('is HP-SCALING: the shipped nuke baseAtk dwarfs the ATK-scaling counterfactual', () => {
      // atkOfMaxHpPct adds 2.71% of ~3.3M Max HP (~90k ATK); a generic atkPct would add 2.71% of
      // ~80k static ATK (~2.2k). The shipped nuke must sit far above the ATK-scaling model.
      expect(maxBaseAtk(nukes(base.events))).toBeGreaterThan(
        maxBaseAtk(nukes(atkNotHp.events)) * 1.5
      );
    });

    it('DISCRIMINATING: the ATK-scaling model emits NO atkOfMaxHpPct buff', () => {
      // Proves the first assertion is one the generic atkPct model provably fails.
      expect(
        buffs(atkNotHp.events).filter(
          (b) => b.casterIdx === CINDY && b.stat === 'atkOfMaxHpPct'
        )
      ).toEqual([]);
    });
  });

  describe('C2 — S1 Charge-Speed toggle = a whole-magazine dump (one prime → autofire the mag)', () => {
    it('fires a mag-dump cadence, far faster than per-rocket charging', () => {
      const dumped = cindyShots(base.events).length;
      const perRocket = cindyShots(noMagDump.events).length;
      expect(
        dumped,
        'mag-dump should fire well over 300 pulls/180s'
      ).toBeGreaterThan(300);
      expect(
        dumped,
        `${dumped} dumped vs ${perRocket} per-rocket — the dump must fire the mag at the autofire ` +
          'rate after one prime, not charge before every rocket'
      ).toBeGreaterThan(perRocket * 2);
    });

    it('DISCRIMINATING: intra-mag shots land at the autofire rate (~20f), not a charge cycle', () => {
      // Within a single magazine the dumped rockets are ~magDumpRofFrames (round(3600/180)=20f)
      // apart; a per-rocket-charge model would space them by a full charge (~60f+). Measure the
      // median inter-shot gap inside the first magazine.
      const firstMag = cindyShots(base.events)
        .filter((s) => s.magIndex === 0)
        .sort((a, b) => a.frame - b.frame);
      expect(
        firstMag.length,
        'first magazine should hold a full 24-rocket dump'
      ).toBeGreaterThanOrEqual(20);
      const gaps = firstMag.slice(1).map((s, i) => s.frame - firstMag[i].frame);
      const median = [...gaps].sort((a, b) => a - b)[
        Math.floor(gaps.length / 2)
      ];
      expect(
        median,
        'intra-mag gap must be the ~20f autofire rate, not a charge cycle'
      ).toBeLessThanOrEqual(25);
    });
  });

  describe('C3 — S1 full-charge rider deals 136.6% of final ATK, once per charged pull', () => {
    it('lands exactly once per pull, in the skill bucket, crit-eligible', () => {
      const rs = riders(base.events);
      expect(rs.length).toBe(cindyShots(base.events).length);
      expect([...new Set(rs.map((d) => d.atkPct))]).toEqual([136.6]);
      expect([...new Set(rs.map((d) => d.bucket))]).toEqual(['skill']);
      expect(rs.every((d) => d.critEligible)).toBe(true);
    });

    it('DISCRIMINATING: removing the rider zeroes the line and drops her total', () => {
      expect(riders(noRider.events)).toEqual([]);
      expect(base.totals.cinderella).toBeGreaterThan(noRider.totals.cinderella);
    });
  });

  // C4 — S2 Decoy avatar (96% final Max HP) is UNMODELED: a defensive/aggro summon. The v1 boss
  // deals no damage, so full decoy uptime — and thus full Beautiful uptime — is assumed. Inert for
  // damage; deliberately no assertion (documented in the header + override unmodeled.skill2).

  describe('C5 — S2 Beautiful is a 36s Max-HP RAMP that feeds her HP-scaling ATK', () => {
    const maxHpFlat = buffs(base.events).filter(
      (b) => b.casterIdx === CINDY && b.stat === 'maxHpFlat'
    );

    it('is a self-scoped, always-on Max-HP grant (converted from casterMaxHpPct 19.2)', () => {
      expect(
        maxHpFlat.length,
        'no Beautiful maxHpFlat buff was applied'
      ).toBeGreaterThan(0);
      expect(
        [...new Set(maxHpFlat.map((b) => b.targetIdx))],
        'must be self-scoped'
      ).toEqual([CINDY]);
      expect(
        [...new Set(maxHpFlat.map((b) => b.expiresFrame))],
        'Beautiful is continuous — no wall-clock expiry'
      ).toEqual([null]);
      for (const b of maxHpFlat) {
        expect(b.value).toBeGreaterThan(0);
      }
    });

    it('FEEDS her ATK: the shipped nuke baseAtk exceeds the no-Beautiful counterfactual', () => {
      expect(maxBaseAtk(nukes(base.events))).toBeGreaterThan(
        maxBaseAtk(nukes(noBeautiful.events))
      );
    });

    it('is GRADUAL: the first-cast nuke sits below the instant-ramp counterfactual', () => {
      // The first burst (t≈5.4s) carries only ~5.4/36 of Beautiful; an INSTANT ramp would already
      // be full there. The shipped first-cast nuke baseAtk must sit below the instant-ramp model's.
      const shippedFirst = nukes(base.events)[0];
      const instantFirst = nukes(instantBeautiful.events)[0];
      expect(shippedFirst.baseAtk).toBeLessThan(instantFirst.baseAtk);
    });

    it('DISCRIMINATING: the gradual ramp adds MORE early→late growth than an instant ramp', () => {
      // The early→late nuke growth has two sources: the Beautiful ramp (present shipped, absent
      // under instant ramp) and an ally-buff-timing baseline (present in BOTH). The gradual model
      // must therefore grow strictly MORE across the fight than the instant model — the extra being
      // exactly the Beautiful still accruing at the first cast.
      const shipped = nukes(base.events);
      const instant = nukes(instantBeautiful.events);
      const shippedGrowth =
        shipped[shipped.length - 1].baseAtk - shipped[0].baseAtk;
      const instantGrowth =
        instant[instant.length - 1].baseAtk - instant[0].baseAtk;
      expect(shippedGrowth).toBeGreaterThan(instantGrowth);
    });
  });

  describe('C6 — burst nuke: 1365.92% × 10 = 13659.2%, cast BEFORE the Full Burst window', () => {
    it('fires once per burst cast at the consolidated magnitude, in the burst bucket', () => {
      const nk = nukes(base.events);
      expect(nk.length).toBe(cindyBursts(base.events).length);
      expect(nk.length).toBeGreaterThan(0);
      expect([...new Set(nk.map((d) => d.atkPct))]).toEqual([13659.2]);
      expect([...new Set(nk.map((d) => d.bucket))]).toEqual(['burst']);
      expect([...new Set(nk.map((d) => d.srcSlot))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      const took = nukes(base.events).filter((d) => d.fbMajorApplied);
      expect(
        took.map((d) => d.sec),
        'burst-cast damage must precede the FB window'
      ).toEqual([]);
    });

    it('G1 PIN: the nuke snapshots her live same-cast stage-3 ATK conversion (burstSnapshotsPreFb:false)', () => {
      // burstSnapshotsPreFb:false ⇒ stage blocks run BEFORE burstCast blocks (stage-3 ENTRY is the stage-2 cast, 30f earlier still), so the nuke
      // resolves with her own same-cast atkOfMaxHpPct 2.71 conversion live. Removing that conversion
      // entirely must drop the nuke baseAtk. This PINS the SHIPPED behavior. ⚑ Whether the flag SHOULD
      // be false is gauntlet gotcha G1 (OWNER-RESOLUTION-REQUIRED): the [HISTORICAL] BURST TIMING note
      // claims the nuke must LOSE the same-cast stack (flag true). This assertion pins what the shipped
      // file DOES — not which reading is correct (the driver cannot view the e3 footage; see the
      // override caveat for the one-popup resolution recipe).
      expect(maxBaseAtk(nukes(base.events))).toBeGreaterThan(
        maxBaseAtk(nukes(noS1Buff.events)) * 1.3
      );
    });

    it('G2: the consolidated nuke carries the sequential flavor (routes the SSOT seqMult bucket)', () => {
      // Kit: "Attacks sequentially for 10 time(s)." The consolidated 13659.2 packet must be
      // sequential-flavored so it routes the seqMult bucket / sequentialDamagePct support.
      const ov: any = withPatchedOverride('cinderella', () => {});
      const nukeEffect = ov.burst
        .flatMap((b: any) => b.effects)
        .find((e: any) => e.kind === 'flatDamage' && e.atkPct === 13659.2);
      expect(nukeEffect?.flavor).toBe('sequential');
      // Board-inert in this comp (no sequential buffer): the seqMult bucket engages at exactly 1.
      expect([
        ...new Set(nukes(base.events).map((d) => d.mult.seqMult)),
      ]).toEqual([1]);
    });
  });

  describe('C7 — burst mirror: 28.9% × Beautiful stacks (346.8 full), ramping with Beautiful', () => {
    it('fires one mirror per cast, ramping up to the full 346.8', () => {
      const mr = mirrors(base.events);
      expect(mr.length, 'one mirror per burst cast').toBe(
        cindyBursts(base.events).length
      );
      const values = [...new Set(mr.map((d) => +d.atkPct.toFixed(3)))].sort(
        (a, b) => a - b
      );
      expect(
        values[values.length - 1],
        'late casts reach full 28.9% × 12'
      ).toBe(346.8);
      expect(
        values[0],
        'the first cast is still ramping (partial Beautiful)'
      ).toBeLessThan(346.8);
    });

    it('DISCRIMINATING: an instant-ramp mirror collapses every cast to 346.8', () => {
      // The gradual model produces a sub-346.8 mirror (the partial first cast) that the instant
      // model cannot — proving the ramp is a property of the encoding, not coincidence.
      const shippedValues = new Set(
        mirrors(base.events).map((d) => +d.atkPct.toFixed(3))
      );
      const instantValues = new Set(
        mirrors(instantMirror.events).map((d) => +d.atkPct.toFixed(3))
      );
      expect([...instantValues]).toEqual([346.8]);
      expect(
        [...shippedValues].some((v) => v < 346.8),
        'shipped must have a partial mirror'
      ).toBe(true);
    });
  });
});
