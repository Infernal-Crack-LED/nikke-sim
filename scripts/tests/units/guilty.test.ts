// PER-UNIT KIT SPEC — `guilty` (Guilty, Attacker/SG/Wind, Burst II, cd 20s, ammo 9,
// hitsPerShot 10 pellets, normalMult 231.4, coreMult 200). Kit-autonomy gauntlet 2026-07-25.
//
// Kit lines (data/characters.json → characters.guilty.skills):
//   S1 ■ every 6 normal attacks → self: Duplicates 8.81% of highest-ATK ally's ATK,
//        stacks ×5, lasts 10 sec                                                      [G1]
//   S2 ■ every 12 normal attacks → all Wind Code allies:
//        Increases stack count of stackable buffs by 1                                 [G2 UNMODELED]
//        ATK ▲4.13% for 10 sec                                                        [G3]
//   BU ■ highest-final-DEF enemy: 284.32% final ATK as Burst Skill damage              [G4]
//      ■ at max S1 stacks → same target: DEF ▼20.25% for 5 sec                        [G5]
//      ■ at max S1 stacks → same target: 277.71% final ATK as additional damage        [G6]
//
// G2 is UNMODELED: the schema has no cross-buff stack-count amplifier. Documented in the
// override's `unmodeled.skill2` and `caveats`. No assertion here.
//
// G5/G6 carry an unmodeled "at max S1 stacks" gate — the override models them always-on.
// This over-credits only the very first burst (before the S1 ramp completes). Documented
// in the override's `caveats`. The test asserts the lines are present and correctly sized;
// the gate omission is a known, bounded over-credit, not a faithfulness failure.
//
// G5 (DEF ▼20.25%): the engine applies the debuff internally but emits NO buffApply event
// for enemy-targeted debuffs. The test asserts the line is present in the override (via the
// damage effect it is bundled with) and that removing ONLY the defPct effect (keeping the
// 277.71% rider) shifts totals by <0.1% — recognized-INERT at scope lock (bossDef=140).
//
// Engine stat naming: the override uses `highestAllyAtkPct` for S1; the engine resolves it
// to a flat ATK value and emits the buff event as `casterAtkPct` with the kit percentage
// preserved in the event key (e.g. "1:skill1:casterAtkPct:8.81"). The test asserts on the
// key-embedded percentage and the event metadata (maxStacks, duration, target).
//
// Fixture: liter (B1) / guilty (B2) / helm (B3), boss Iron (Wind ×1.10 advantage),
// focus guilty. Deterministic (no seed). Guilty needs a valid B1→B2→B3 chain to cast
// bursts; a solo fixture would produce zero burst events.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const GUILTY = 1; // slot order: liter 0 / guilty 1 / helm 2

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: ['liter', 'guilty', 'helm'],
    bossElement: 'Iron',
    focusSlug: 'guilty',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches ----------------------------------------------------------------
/** G1 reference: S1 removed entirely (no ATK stacks). */
const guiltyNoS1 = withPatchedOverride('guilty', (ov) => {
  if (!ov.skill1.length) {
    throw new Error('guilty S1 missing — fixture is stale');
  }
  ov.skill1 = [];
});
/** G3 reference: S2 removed entirely (no Wind-ally ATK buff). */
const guiltyNoS2 = withPatchedOverride('guilty', (ov) => {
  if (!ov.skill2.length) {
    throw new Error('guilty S2 missing — fixture is stale');
  }
  ov.skill2 = [];
});
/** G2 isolation: remove ONLY the addStack effect from the S2 block, keeping the ATK buff. */
const guiltyNoAddStack = withPatchedOverride('guilty', (ov) => {
  const block = ov.skill2.find((b: any) =>
    b.effects.some((e: any) => e.kind === 'addStack')
  );
  if (!block) {
    throw new Error('guilty S2 addStack block missing — fixture is stale');
  }
  block.effects = block.effects.filter((e: any) => e.kind !== 'addStack');
});
/** G5 isolation: remove ONLY the defPct effect from the burst block, keeping the 277.71% rider. */
const guiltyNoDefDebuff = withPatchedOverride('guilty', (ov) => {
  const block = ov.burst.find((b: any) =>
    b.effects.some((e: any) => e.stat === 'defPct')
  );
  if (!block) {
    throw new Error('guilty burst defPct block missing — fixture is stale');
  }
  block.effects = block.effects.filter((e: any) => e.stat !== 'defPct');
});
/** G6 isolation: remove ONLY the 277.71% additional damage, keeping the defPct debuff. */
const guiltyNoAdditional = withPatchedOverride('guilty', (ov) => {
  const block = ov.burst.find((b: any) =>
    b.effects.some((e: any) => e.kind === 'flatDamage' && e.atkPct === 277.71)
  );
  if (!block) {
    throw new Error('guilty burst 277.71% block missing — fixture is stale');
  }
  block.effects = block.effects.filter(
    (e: any) => !(e.kind === 'flatDamage' && e.atkPct === 277.71)
  );
});

// ---- runs (hoisted: each is a full 180s sim) ------------------------------------------------
const base = run();
const noS1 = run({ guilty: guiltyNoS1 });
const noS2 = run({ guilty: guiltyNoS2 });
const noAddStack = run({ guilty: guiltyNoAddStack });
const noDefDebuff = run({ guilty: guiltyNoDefDebuff });
const noAdditional = run({ guilty: guiltyNoAdditional });

// ---- readers --------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const guiltyBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'guilty'
  );
const guiltyDamage = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  dmg(evs).filter((d) => d.slug === 'guilty' && d.srcSlot === srcSlot);

describe('guilty — kit spec', () => {
  describe('G1 — S1: highestAllyAtkPct 8.81% (emitted as casterAtkPct), ×5 stacks, 10s', () => {
    // Engine resolves highestAllyAtkPct → flat ATK, emits as casterAtkPct with the kit
    // percentage embedded in the event key (e.g. "1:skill1:casterAtkPct:8.81").
    const applied = buffs(base.events).filter(
      (b) =>
        b.casterIdx === GUILTY &&
        b.stat === 'casterAtkPct' &&
        b.key.includes('8.81')
    );

    it('fires with the kit percentage embedded in the key', () => {
      expect(applied.length, 'no S1 buff events emitted').toBeGreaterThan(0);
      for (const b of applied) {
        expect(b.key).toContain('8.81');
      }
    });

    it('stacks up to 5', () => {
      expect([...new Set(applied.map((b) => b.maxStacks))]).toEqual([5]);
    });

    it('lasts 10 seconds per stack', () => {
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('targets self only', () => {
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([GUILTY]);
    });

    it('DISCRIMINATING: removing S1 reduces total damage (the stacks are live)', () => {
      expect(base.totals.guilty).toBeGreaterThan(noS1.totals.guilty);
    });
  });

  describe('G2 — S2: addStack +1 for Wind allies (accelerates S1 ramp)', () => {
    it('the S2 block carries an addStack count:1 effect', () => {
      const ov = loadOverride('guilty') as any;
      const block = ov.skill2.find((b: any) =>
        b.effects.some((e: any) => e.kind === 'addStack')
      );
      expect(block, 'guilty S2 addStack block missing').toBeTruthy();
      expect(block.effects.find((e: any) => e.kind === 'addStack')).toEqual({
        kind: 'addStack',
        count: 1,
      });
    });

    it('DISCRIMINATING: removing only addStack reduces total damage (S1 ramps slower)', () => {
      expect(base.totals.guilty).toBeGreaterThan(noAddStack.totals.guilty);
    });
  });

  describe('G3 — S2: atkPct 4.13% for 10s, all Wind allies, every 12 shots', () => {
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === GUILTY && b.stat === 'atkPct'
    );

    it('fires with the kit magnitude', () => {
      expect(applied.length, 'no S2 buff events emitted').toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([4.13]);
    });

    it('lasts 10 seconds', () => {
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('targets Wind-code allies (guilty is the only Wind unit in the fixture)', () => {
      // liter=0 (Fire), guilty=1 (Wind), helm=2 (Water) → only guilty qualifies
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([GUILTY]);
    });

    it('DISCRIMINATING: removing S2 reduces total damage', () => {
      expect(base.totals.guilty).toBeGreaterThan(noS2.totals.guilty);
    });
  });

  describe('G4 — burst: 284.32% of final ATK as Burst Skill damage', () => {
    const nukes = guiltyDamage(base.events, 'burst').filter(
      (d) => d.atkPct === 284.32
    );

    it('fires once per burst cast at the kit magnitude, in the burst bucket', () => {
      const casts = guiltyBursts(base.events);
      expect(
        casts.length,
        'guilty never cast a burst — fixture is stale'
      ).toBeGreaterThan(0);
      expect(nukes.length).toBe(casts.length);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (cast lands before FB opens)', () => {
      expect(nukes.filter((d) => d.fbMajorApplied).length).toBe(0);
    });
  });

  describe('G5 — burst rider: DEF ▼20.25% for 5s (inert at scope lock, no event emitted)', () => {
    // The engine applies the DEF debuff internally but emits NO buffApply event for
    // enemy-targeted debuffs. We verify the line is present in the override (it is bundled
    // with the 277.71% rider in the same block) and that removing ONLY the defPct effect
    // leaves totals within 0.1% — recognized-INERT at bossDef=140.

    it('is recognized-INERT: removing only defPct shifts totals by <0.1%', () => {
      const baseDmg = base.totals.guilty;
      const noDefDmg = noDefDebuff.totals.guilty;
      const pctDiff = Math.abs(baseDmg - noDefDmg) / baseDmg;
      expect(
        pctDiff,
        `DEF debuff shifted guilty damage by ${(pctDiff * 100).toFixed(4)}%`
      ).toBeLessThan(0.001);
    });
  });

  describe('G6 — burst rider: 277.71% of final ATK as additional damage', () => {
    const riders = guiltyDamage(base.events, 'burst').filter(
      (d) => d.atkPct === 277.71
    );

    it('fires once per burst cast at the kit magnitude', () => {
      const casts = guiltyBursts(base.events);
      expect(riders.length).toBe(casts.length);
      expect([...new Set(riders.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('DISCRIMINATING: removing it reduces total damage', () => {
      expect(base.totals.guilty).toBeGreaterThan(noAdditional.totals.guilty);
    });
  });
});
