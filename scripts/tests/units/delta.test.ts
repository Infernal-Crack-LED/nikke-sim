// PER-UNIT KIT SPEC — `delta` (Delta, Elysion SR Defender, Wind, Burst II, cd 40s, ammo 6,
// chargeFrames 60 / reloadFrames 111, normalMult 65.95 / coreMult 200 / chargeMult 250,
// critRate 15 / critDamage 150, burstGaugePerShot 2.65). Kit-autonomy gauntlet 2026-08-05;
// test-first line-by-line spec.
//
// EXACT SLUG: `delta` = BASE Delta (SR/Wind Elysion Defender, Burst II) — never conflated with
// `delta-ninja-thief` (MG/Water Defender B2, aka "dnt"); the slug-disambiguation lint's
// AMBIGUOUS-base guard was explicitly resolved on the slug.
//
// GREENFIELD NOTE: delta shipped with NO override (simSupported:false) — before this gauntlet
// the unit could not sim at all (resolveSkills throws for prose-without-override). The usual
// "RED vs shipped override" half is therefore degenerate: the pre-override state is "does not
// run". The substance of the gate lives in the COUNTERFACTUAL half — every PIN below is GREEN
// vs the faithful encoding AND the nearest-wrong model (patched via withPatchedOverride)
// provably fails it, so each assertion discriminates rather than rubber-stamps.
//
// Kit (blablalink prose, data/characters.json → characters.delta.skills, lvl-10 values):
//   S1 "Recollection"
//      ■ performing a Full Charge attack → self: Max HP ▲8.82% for 10 sec        [D1]
//   S2 "Last Memory"
//      ■ using Burst Skills → self: DEF ▲51.42% for 20 sec                       [D2]
//   BU "Remember Me" (burst, cd 40s)
//      ■ self: Decoy — avatar with 91.68% of final Max HP for 10 sec             [D3 UNMODELED]
//      ■ self: Attract — taunts all enemies for 10 sec                           [D4 UNMODELED]
//
// A PURE TANK kit: ZERO damage lines, ZERO weapon-state modifiers. Both modeled lines are
// self-targeted inert stats (targetMaxHpPct — she carries no atkOfMaxHpPct and there is no HP
// pool; defPct — self DEF feeds no damage in v1). The burst is pure utility (decoy avatar +
// taunt) against a boss that never acts. Her sim damage is therefore EXACTLY her bare SR
// weapon — pinned byte-for-byte by the whole-kit neutrality assertion below.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model
// gates nothing):
//   D1  cadence — the kit says "when performing a Full Charge attack" and an SR pull IS a full
//       charge (helm/a2 precedent: shotFired == per-full-charge), so applications must track
//       her ~107 pulls/180s, NOT her ~18 magazine-ends: the nearest-wrong trigger (lastBullet)
//       fires at one sixth the cadence and provably fails the count bound. Scope — the kit says
//       "Affects self": an all-allies re-target reaches 4 holders and provably fails the
//       holder-set pin. Conversion — the self Max HP grant surfaces in the log as `maxHpFlat`
//       (targetMaxHpPct is converted at apply time, folkwang C3 precedent): the nearest-wrong
//       encoding is the RAW `maxHpPct` stat, which only the cube path converts — an override
//       buff carrying it LOOKS present in the JSON and silently does nothing (zero maxHpFlat
//       events). The kit magnitude itself is pinned STRUCTURALLY on the shipped JSON. INERT
//       canary: the whole-kit byte-identity assertion (removing the block changes no total by a
//       single point) fails loudly if Max HP ever gains a damage consumer.
//   D2  trigger identity — "when using Burst Skills" = HER OWN cast (marciana/dnt precedent),
//       not fullBurstEnter: the STARVED comp (crown takes every stage-2 slot) is the lever —
//       she casts ZERO there while FBs still open, so a burstCast key is SILENT and a
//       fullBurstEnter key keeps firing on every team FB. The counterfactual run proves the
//       inflation. Value/duration — 51.42 (SL10, not the SL1 datamine 18.36) for 20s
//       (the SL1 datamine duration happens to coincide, so only the magnitude discriminates).
//       INERT canary as D1.
//   D3/D4 both burst lines are out-of-domain (no avatar/threat model, no aggro model, no HP
//       pool — the boss never acts; folkwang/dnt precedent): pinned STRUCTURALLY (ov.burst ==
//       []) and BEHAVIORALLY (no burst-bucket damage, no boss debuff, no alien self-buff from
//       her). The nearest-wrong encodings are provably wrong two ways: a `shield` effect (the
//       closest primitive to a decoy) is unobservable in the event log (no shield SimEvent kind
//       — helm H3 precedent for unassertable observables), and any "make the burst do
//       something" damage-buff fudge (e.g. folding the 91.68 decoy-HP magnitude into an atkPct)
//       MOVES her total, which the whole-kit byte-identity pin forbids.
//
// UNMODELED ⚑s (inert here; estimate + recipe + tier in the override note/unmodeled):
//   D3 Decoy avatar — out-of-domain (no avatar/threat subsystem; HP magnitude has no pool).
//   D4 Attract taunt — out-of-domain (no aggro model; single partless boss).
//
// Fixture (deterministic — no seed; event-log over totals where a line is timing-sensitive;
// forced-NEUTRAL boss — the kit has no elemental line, so the damage pin stays element-blind):
// COMP ['liter','delta','helm','ada'] — liter (B1, 20s) opens the chain, delta is the SOLE B2
// (cd 40s — an FB opens only when she is ready, so she casts EVERY FB, ~4 casts/180s),
// helm + ada (both B3, 40s) alternate the stage-3 slot. Focus delta (SR = charge weapon,
// ×2.5 gauge on focus).
//
// SECOND COMP (cast-starvation lever, anis/aria precedent): STARVED ['liter','crown','delta',
// 'helm'] — crown (B2, 20s) takes every stage-2 slot while FBs still open (~40s cycle on helm
// alone), so delta casts ZERO bursts: her D2 burstCast-keyed DEF buff must be SILENT there
// while the FB window fires — the exact rotation a fullBurstEnter mis-key would over-fire.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type FbStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

// ---- fixtures ---------------------------------------------------------------------------------
const COMP = ['liter', 'delta', 'helm', 'ada'];
const DELTA = 1; // delta's slot in COMP
/** The starvation probe: crown (B2, 20s) seats the stage-2 slot ahead of delta (cd 40s) on
 *  every rotation — the controlComp-style trap for a Burst II unit under test. */
const STARVED = ['liter', 'crown', 'delta', 'helm'];
const DELTA_STARVED = 2; // delta's slot in STARVED

function runAt(slugs: string[], overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs,
    bossElement: null, // forced-neutral boss: no elemental line in the kit to exercise
    focusSlug: 'delta',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, res, totals: totals(res) };
}
const run = (overrides: Record<string, any> = {}) => runAt(COMP, overrides);

// ---- counterfactual patches (nearest-wrong models each PIN must discriminate against) ---------

const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** D1 nearest-wrong (cadence): S1 re-keyed to lastBullet — fires once per magazine end
 *  (one sixth of her SR pulls) instead of on every full charge. */
const deltaLastBulletS1 = withPatchedOverride('delta', (ov) => {
  const b = ov.skill1.find((x: any) => hasStat(x, 'targetMaxHpPct'));
  if (!b) {
    throw new Error('delta S1 targetMaxHpPct block missing — fixture is stale');
  }
  b.trigger = { kind: 'lastBullet' };
});

/** D1 nearest-wrong (scope): S1 re-targeted to all allies — the kit says "Affects self". */
const deltaAlliesS1 = withPatchedOverride('delta', (ov) => {
  const b = ov.skill1.find((x: any) => hasStat(x, 'targetMaxHpPct'));
  if (!b) {
    throw new Error('delta S1 targetMaxHpPct block missing — fixture is stale');
  }
  b.target = { kind: 'allies' };
});

/** D1 nearest-wrong (conversion): the RAW `maxHpPct` stat — only the CUBE path converts it;
 *  an override buff carrying it is never read, so the line LOOKS present in the JSON and
 *  silently does nothing (zero maxHpFlat events). folkwang C3 precedent. */
const deltaRawMaxHpPctS1 = withPatchedOverride('delta', (ov) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'targetMaxHpPct');
  if (!e) {
    throw new Error('delta S1 targetMaxHpPct effect missing — fixture is stale');
  }
  e.stat = 'maxHpPct';
});

/** D2 nearest-wrong (trigger): S2 re-keyed to fullBurstEnter — fires on EVERY team FB,
 *  including rotations a competing B2 casts (the STARVED comp is the lever). */
const deltaFbEnterS2 = withPatchedOverride('delta', (ov) => {
  const b = ov.skill2.find((x: any) => hasStat(x, 'defPct'));
  if (!b) {
    throw new Error('delta S2 defPct block missing — fixture is stale');
  }
  b.trigger = { kind: 'fullBurstEnter' };
});

/** D2 nearest-wrong (magnitude): the SL1 datamine value 18.36 instead of the SL10 51.42. */
const deltaSl1S2 = withPatchedOverride('delta', (ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'defPct');
  if (!e) {
    throw new Error('delta S2 defPct effect missing — fixture is stale');
  }
  e.value = 18.36;
});

/** D3/D4 nearest-wrong: a "make the burst do something" fudge — the decoy's 91.68% HP
 *  magnitude folded into a self atkPct on cast. Any damage-bearing burst encoding must move
 *  her total; the whole-kit byte-identity pin forbids that. */
const deltaBurstFudge = withPatchedOverride('delta', (ov) => {
  ov.burst = [
    {
      slot: 'burst',
      trigger: { kind: 'burstCast' },
      target: { kind: 'self' },
      effects: [
        { kind: 'buff', stat: 'atkPct', value: 91.68, durationSec: 10 },
      ],
    },
  ];
});

/** Whole-kit reference: every slot emptied — the bare-weapon baseline the shipped override
 *  must match byte-for-byte (all four kit lines are inert or out-of-domain). */
const deltaEmptyKit = withPatchedOverride('delta', (ov) => {
  ov.skill1 = [];
  ov.skill2 = [];
  ov.burst = [];
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const lastBulletS1 = run({ delta: deltaLastBulletS1 });
const alliesS1 = run({ delta: deltaAlliesS1 });
const rawMaxHpPctS1 = run({ delta: deltaRawMaxHpPctS1 });
const fbEnterS2Starved = runAt(STARVED, { delta: deltaFbEnterS2 });
const sl1S2 = run({ delta: deltaSl1S2 });
const burstFudge = run({ delta: deltaBurstFudge });
const emptyKit = run({ delta: deltaEmptyKit });
const starved = runAt(STARVED);

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const casts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast');
const deltaCasts = (evs: SimEvent[]) =>
  casts(evs).filter((c) => c.slug === 'delta');
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e): e is FbStart => e.kind === 'fullBurstStart');
const deltaShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'delta');

/** delta's self Max HP applications from her own S1 (slot differs between comps). The grant
 *  surfaces in the log as `maxHpFlat` — targetMaxHpPct is converted at apply time (folkwang
 *  C3 precedent); the kit magnitude is pinned STRUCTURALLY on the shipped JSON instead. */
const deltaHpBuffs = (evs: SimEvent[], slot: number = DELTA) =>
  buffs(evs).filter((b) => b.casterIdx === slot && b.stat === 'maxHpFlat');
/** delta's defPct applications from her own S2. */
const deltaDefBuffs = (evs: SimEvent[], slot: number = DELTA) =>
  buffs(evs).filter((b) => b.casterIdx === slot && b.stat === 'defPct');

describe('delta (base) — kit spec', () => {
  describe('fixture sanity', () => {
    it('delta is the sole B2 and casts her burst on every Full Burst cycle', () => {
      const cs = deltaCasts(base.events);
      // cd 40s sole B2 → an FB opens only when she is ready: ~4 casts/180s.
      expect(cs.length).toBeGreaterThanOrEqual(3);
      expect([...new Set(cs.map((c) => c.stage))], 'delta is Burst II').toEqual(
        [2]
      );
    });

    it('the CAST comp opens Full Bursts for the whole fight', () => {
      expect(fbStarts(base.events).length).toBeGreaterThanOrEqual(3);
      expect(fbStarts(base.events).length).toBe(deltaCasts(base.events).length);
    });

    it('she shoots like an SR (~100+ charged pulls in 180s)', () => {
      expect(deltaShots(base.events).length).toBeGreaterThanOrEqual(90);
    });
  });

  describe('D1 — S1 grants Max HP ▲8.82% for 10s to HERSELF on every full charge', () => {
    const applied = deltaHpBuffs(base.events);

    it('is a self targetMaxHpPct 8.82 / 10s block on shotFired (structural, shipped JSON)', () => {
      const ov = loadOverride('delta')!;
      const blocks = (ov.skill1 as any[]).filter((b) =>
        hasStat(b, 'targetMaxHpPct')
      );
      expect(blocks.length).toBe(1);
      const [b] = blocks;
      expect(b.trigger).toEqual({ kind: 'shotFired' });
      expect(b.target).toEqual({ kind: 'self' });
      const e = b.effects.find((x: any) => x.stat === 'targetMaxHpPct');
      expect(e.value).toBe(8.82);
      expect(e.durationSec).toBe(10);
    });

    it('converts to maxHpFlat at apply time: constant positive flat value, 10s window, self-held', () => {
      expect(applied.length).toBeGreaterThan(0);
      const values = [...new Set(applied.map((b) => b.value))];
      expect(values.length).toBe(1);
      expect(values[0]).toBeGreaterThan(0); // the converted flat Max HP
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
      expect([...new Set(applied.map((b) => b.targetSlug))]).toEqual(['delta']);
    });

    it('fires on EVERY charged pull (shotFired cadence, not once per magazine)', () => {
      const shots = deltaShots(base.events).length;
      expect(
        applied.length,
        `${applied.length} applications vs ${shots} pulls — a magazine-end ` +
          'or burst-only trigger lands near shots/6 or the cast count'
      ).toBeGreaterThanOrEqual(Math.floor(shots * 0.9));
    });

    it('is INERT: it lives inside the whole-kit byte-identity pin (no Max HP damage consumer in v1)', () => {
      expect(emptyKit.totals).toEqual(base.totals);
    });

    it('DISCRIMINATING (cadence): a lastBullet key fires at one sixth the cadence', () => {
      const wrong = deltaHpBuffs(lastBulletS1.events);
      const shots = deltaShots(lastBulletS1.events).length;
      expect(wrong.length).toBeGreaterThan(0);
      expect(
        wrong.length,
        `${wrong.length} applications vs ${shots} pulls`
      ).toBeLessThanOrEqual(Math.ceil(shots / 2));
    });

    it('DISCRIMINATING (scope): an all-allies key reaches the whole team', () => {
      const wrong = buffs(alliesS1.events).filter(
        (b) => b.stat === 'maxHpFlat' && b.casterIdx === DELTA
      );
      expect(wrong.length).toBeGreaterThan(0);
      const holders = new Set(wrong.map((b) => b.targetSlug));
      expect(holders.size).toBe(4);
      expect(holders).not.toEqual(new Set(['delta']));
    });

    it('DISCRIMINATING (conversion): the raw maxHpPct stat never converts — zero maxHpFlat events', () => {
      // Only the cube path converts maxHpPct→maxHpFlat; an override buff with the raw stat
      // LOOKS present in the JSON and silently does nothing (folkwang C3 precedent).
      expect(deltaHpBuffs(rawMaxHpPctS1.events).length).toBe(0);
    });
  });

  describe('D2 — S2 grants DEF ▲51.42% for 20s to HERSELF, keyed to HER OWN burst cast', () => {
    const applied = deltaDefBuffs(base.events);

    it('fires exactly once per burst SHE casts', () => {
      const cs = deltaCasts(base.events);
      expect(applied.length).toBe(cs.length);
      expect(applied.length).toBeGreaterThan(0);
    });

    it('is 51.42% (SL10) for exactly 20 sec, held by delta alone', () => {
      expect([...new Set(applied.map((b) => b.value))]).toEqual([51.42]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(20 * FPS);
      }
      expect([...new Set(applied.map((b) => b.targetSlug))]).toEqual(['delta']);
    });

    it('DISCRIMINATING (magnitude): the SL1 datamine 18.36 is not the shipped value', () => {
      const wrong = deltaDefBuffs(sl1S2.events);
      expect([...new Set(wrong.map((b) => b.value))]).toEqual([18.36]);
      expect([...new Set(applied.map((b) => b.value))]).not.toEqual([18.36]);
    });
  });

  describe('D3/D4 — the burst is pure utility: Decoy + Attract are unmodeled, and the burst moves nothing', () => {
    it('the shipped override carries NO burst blocks (decoy/taunt are out-of-domain)', () => {
      const ov = loadOverride('delta')!;
      expect(ov.burst).toEqual([]);
    });

    it('her burst emits NO damage and NO boss debuff', () => {
      const burstDmg = dmg(base.events).filter(
        (d) => d.slug === 'delta' && d.srcSlot === 'burst'
      );
      expect(burstDmg).toEqual([]);
      const bossDebuffs = buffs(base.events).filter(
        (b) => b.casterIdx === DELTA && b.targetIdx === null
      );
      expect(bossDebuffs).toEqual([]);
    });

    it('her modeled buffs are EXACTLY the two kit stats (no alien burst encoding)', () => {
      const stats = new Set(
        buffs(base.events)
          .filter((b) => b.casterIdx === DELTA)
          .map((b) => b.stat)
      );
      expect([...stats].sort()).toEqual(['defPct', 'maxHpFlat']);
    });

    it('DISCRIMINATING: any damage-bearing burst fudge moves her total (byte-identity forbids it)', () => {
      expect(burstFudge.totals.delta).toBeGreaterThan(base.totals.delta);
    });
  });

  describe('whole kit — a pure tank: every line inert or out-of-domain', () => {
    it('shipped totals are BYTE-IDENTICAL to the empty kit (bare SR weapon)', () => {
      expect(emptyKit.totals).toEqual(base.totals);
    });

    it('her damage is weapon-only: every instance is a normal-bucket shot', () => {
      const hers = dmg(base.events).filter((d) => d.slug === 'delta');
      expect(hers.length).toBeGreaterThan(0);
      expect([...new Set(hers.map((d) => d.bucket))]).toEqual(['normal']);
      expect([...new Set(hers.map((d) => d.srcSlot))]).toEqual(['normal']);
    });
  });

  describe('the STARVED comp — own-cast key silent, fullBurstEnter mis-key over-fires', () => {
    it('fixture: crown takes every stage-2 slot, delta casts nothing, FBs still open', () => {
      expect(deltaCasts(starved.events).length).toBe(0);
      expect(
        casts(starved.events).filter((c) => c.slug === 'crown').length
      ).toBeGreaterThanOrEqual(3);
      expect(fbStarts(starved.events).length).toBeGreaterThanOrEqual(3);
    });

    it('D2 is SILENT: no DEF application on rotations she did not cast', () => {
      expect(deltaDefBuffs(starved.events, DELTA_STARVED)).toEqual([]);
    });

    it('D2 DISCRIMINATING (trigger): a fullBurstEnter key fires on every team FB despite zero casts', () => {
      const wrong = deltaDefBuffs(fbEnterS2Starved.events, DELTA_STARVED);
      expect(wrong.length).toBeGreaterThanOrEqual(
        fbStarts(fbEnterS2Starved.events).length
      );
      expect(wrong.length).toBeGreaterThan(0);
    });
  });
});
