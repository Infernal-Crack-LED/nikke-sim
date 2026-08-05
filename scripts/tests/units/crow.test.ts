// PER-UNIT KIT SPEC — `crow` (Crow, Defender/SMG/Fire, Burst III, cd 40s, ammo 120,
// hitsPerShot 2, ROF 1440). Kit-autonomy gauntlet 2026-08-04 (test-first FROM-SCRATCH build).
// NOTE: there was NO shipped override before this gauntlet (simSupported was false), so the
// harness cannot even load her until src/skills/overrides/crow.json exists. The override was
// authored as the faithful encoding under test; every assertion below PINS a kit line GREEN vs
// that override and RED vs the nearest-wrong counterfactual (withPatchedOverride), so the file
// discriminates exactly as a verification gauntlet would.
//
// Kit (blablalink prose, data/characters.json → characters.crow.skills), max level:
//   S1 ■ entering Full Burst → all enemies: ATK ▼ 19.93% for 10 sec.        [UNMODELED — no channel]
//   S2 ■ last bullet hits the target → the target:
//        89.09% of final ATK as additional damage.                          [C1]
//      ■ last bullet hits the target → self:
//        DEF ▲ 12.72% for 5 sec.                                            [C2]
//   BU ■ the enemy with the highest final ATK:
//        915.75% of final ATK as Burst Skill damage.                        [C3]
//
// Modeling posture (see the override note + caveats for the full story):
//   * S1 is UNMODELED (verbatim in `unmodeled`): the engine's enemy-buff channel admits only
//     damageTakenPct/distributedDamagePct > 0 — an enemy ATK▼ is dropped at dispatch
//     (src/engine/sim.ts:2295) and the immortal DEF=0 boss deals no damage, so the line moves
//     nothing. C4 proves the skip damage-neutral (marciana/diesel precedent), never fudges it.
//   * The S2 lines ride the engine's `lastBullet` trigger (magazine fired dry — sim.ts:3930),
//     the exact kit condition ('when the LAST bullet hits'). The rider is a bare flatDamage
//     (crit-eligible, skill bucket, srcSlot skill2 — engine rider convention, helm H6). The
//     DEF▲ is defPct, faithfully encoded but damage-inert in v1 (self DEF never feeds own
//     damage — diesel/sakura/bay precedent); C2 pins the inertness instead of assuming it.
//   * The burst is burstCast -> enemy flatDamage 915.75. 'The enemy with the highest final
//     ATK' collapses to the single scope-lock boss ({kind:'enemy'} documented stand-in;
//     exia/novel precedent). The cast lands BEFORE the Full Burst window opens, so the nuke
//     never takes the +50% FB major (verified fact 2026-07-13).
//
// Nearest-wrong counterfactuals (each assertion must fail under these, or it gates nothing):
//   C1  shotFired trigger — 'additional damage on ANY hit' instead of the last-bullet gate.
//   C2  atkPct misread — DEF▲ read as ATK▲ (would turn an inert line damage-bearing).
//   C3  fullBurstEnter keying — nuke lands at FB entry (wrong frame and/or rides the major),
//       and the level-1 magnitude 541.12 against the max-level 915.75.
//   C4  the S1 line enacted anyway — must be byte-identical (proves nothing was dropped that
//       the sim could observe).
//
// Fixture: controlComp('crow') — liter (B1) / crown (B2) / crow (B3) / helm (B3), boss Fire,
// focus crow. helm shares the B3 slot, so crow casts every other Full Burst (~4 casts / 180s);
// her SMG (20 shots/s quantized off 1440 RPM, ammo 120, reload 121f) cycles a magazine every
// ~8s, so the last-bullet lines fire ~20+ times — ample cadence for both C1 and C2.
// Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { controlComp, runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
/** controlComp slot order: liter 0 / crown 1 / crow 2 / helm 3. */
const CROW = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('crow'),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const crowShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'crow');
const crowCasts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'crow');
/** S2a rider: last-bullet additional damage (srcSlot 'skill2', skill bucket). */
const riders = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'crow' && d.srcSlot === 'skill2');
/** S2b DEF▲ applications (self-held defPct at the kit magnitude). */
const defApplies = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) => b.casterIdx === CROW && b.stat === 'defPct' && b.value === 12.72
  );
/** Burst nuke instances. */
const nukes = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'crow' && d.srcSlot === 'burst');

// ---- counterfactual / isolation patches -------------------------------------------------------
/** C1 counterfactual: the rider fires on EVERY shot, not the last bullet (the ungated
 *  'additional damage on hit' misread). */
const crowRiderEveryShot = withPatchedOverride('crow', (ov) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'flatDamage')
  );
  if (!b || b.trigger.kind !== 'lastBullet') {
    throw new Error('crow S2 rider block missing — fixture is stale');
  }
  b.trigger = { kind: 'shotFired' };
});
/** C2 isolation: the DEF▲ line removed — defPct is inert in v1, so this must move NO unit's
 *  total by a single point (proves inertness, not assumes it; novel N2 precedent). */
const crowNoDefBuff = withPatchedOverride('crow', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) =>
    !b.effects.some((e: any) => e.stat === 'defPct')
  );
  if (ov.skill2.length === before) {
    throw new Error('crow S2 defPct block missing — fixture is stale');
  }
});
/** C2 counterfactual: DEF▲ misread as ATK▲ (turns the inert line damage-bearing). */
const crowDefAsAtk = withPatchedOverride('crow', (ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'defPct');
  if (!e) {
    throw new Error('crow S2 defPct effect missing — fixture is stale');
  }
  e.stat = 'atkPct';
});
/** C3 counterfactual: the nuke keyed to fullBurstEnter instead of her own burstCast. */
const crowNukeOnFbEnter = withPatchedOverride('crow', (ov) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'flatDamage')
  );
  if (!b || b.trigger.kind !== 'burstCast') {
    throw new Error('crow burst nuke block missing — fixture is stale');
  }
  b.trigger = { kind: 'fullBurstEnter' };
});
/** C3 counterfactual: the level-1 magnitude (541.12) instead of the max-level kit value. */
const crowL1Nuke = withPatchedOverride('crow', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'flatDamage');
  if (!e || e.atkPct !== 915.75) {
    throw new Error('crow burst nuke effect missing — fixture is stale');
  }
  e.atkPct = 541.12;
});
/** C4 counterfactual: the UNMODELED S1 enemy ATK▼ enacted anyway through the only encoding
 *  available (enemy-targeted buff). The engine drops it at dispatch — totals must not move. */
const crowWithS1Debuff = withPatchedOverride('crow', (ov) => {
  ov.skill1.push({
    slot: 'skill1',
    trigger: { kind: 'fullBurstEnter' },
    target: { kind: 'enemy' },
    effects: [
      { kind: 'buff', stat: 'atkPct', value: -19.93, durationSec: 10 },
    ],
  });
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const riderEveryShot = run({ crow: crowRiderEveryShot });
const noDefBuff = run({ crow: crowNoDefBuff });
const defAsAtk = run({ crow: crowDefAsAtk });
const nukeFbEnter = run({ crow: crowNukeOnFbEnter });
const l1Nuke = run({ crow: crowL1Nuke });
const withS1Debuff = run({ crow: crowWithS1Debuff });

describe('crow — kit spec', () => {
  it('fixture sanity: crow shares B3 with helm and casts every other Full Burst', () => {
    expect(crowCasts(base.events).length).toBeGreaterThanOrEqual(3);
  });

  describe('C1 — S2 rider: 89.09% of final ATK when the LAST bullet hits', () => {
    const hits = riders(base.events);
    const emptyShots = crowShots(base.events).filter(
      (s) => s.ammoAfter === 0
    );

    it('fires once per empty magazine (the last-bullet gate, both directions)', () => {
      expect(hits.length).toBeGreaterThanOrEqual(15);
      expect(hits.length, 'every dry shot produces exactly one rider').toBe(
        emptyShots.length
      );
      const riderFrames = hits.map((d) => d.frame).sort((a, b) => a - b);
      const dryFrames = emptyShots.map((s) => s.frame).sort((a, b) => a - b);
      expect(riderFrames, 'rider rides the dry shot frame').toEqual(dryFrames);
    });

    it('is the kit magnitude, skill bucket, crits but never cores and never takes range (function-damage rules)', () => {
      expect([...new Set(hits.map((d) => d.atkPct))]).toEqual([89.09]);
      expect([...new Set(hits.map((d) => d.bucket))]).toEqual(['skill']);
      expect([...new Set(hits.map((d) => d.critEligible))]).toEqual([true]);
      expect(
        [...new Set(hits.map((d) => d.coreEligible))],
        'text says nothing about core strike — function damage never cores (U1, 2026-07-13)'
      ).toEqual([false]);
      expect([...new Set(hits.map((d) => d.rangeApplied))]).toEqual([false]);
    });

    it('DISCRIMINATING: an ungated (every-shot) rider fires on every pull, not just the last bullet', () => {
      const all = riders(riderEveryShot.events);
      expect(all.length).toBe(crowShots(riderEveryShot.events).length);
      expect(all.length).toBeGreaterThan(hits.length * 5);
    });
  });

  describe('C2 — S2 self DEF ▲12.72% for 5s on the same last-bullet trigger', () => {
    const applies = defApplies(base.events);

    it('fires paired with the rider: same trigger, same frames', () => {
      const hits = riders(base.events);
      expect(applies.length).toBe(hits.length);
      const defFrames = applies.map((b) => b.frame).sort((a, b) => a - b);
      const riderFrames = hits.map((d) => d.frame).sort((a, b) => a - b);
      expect(defFrames).toEqual(riderFrames);
    });

    it('is self-scoped, 12.72%, a 5-second window', () => {
      expect([...new Set(applies.map((b) => b.targetIdx))]).toEqual([CROW]);
      for (const b of applies) {
        expect(b.expiresFrame! - b.frame, '5s duration').toBe(5 * FPS);
      }
    });

    it('is damage-INERT in v1 (self DEF never feeds own damage): removing it moves no total', () => {
      expect(base.totals).toEqual(noDefBuff.totals);
    });

    it('DISCRIMINATING: a DEF▲-as-ATK▲ misread WOULD move totals (the pin above bites)', () => {
      expect(defAsAtk.totals).not.toEqual(base.totals);
    });
  });

  describe('C3 — burst nuke: 915.75% of final ATK on HER cast, before the Full Burst window', () => {
    const hits = nukes(base.events);
    const casts = crowCasts(base.events);

    it('fires once per crow cast, at the max-level kit magnitude, in the burst bucket', () => {
      expect(hits.length).toBe(casts.length);
      expect(hits.length).toBeGreaterThan(0);
      expect([...new Set(hits.map((d) => d.atkPct))]).toEqual([915.75]);
      expect([...new Set(hits.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('fires on HER casts only: strictly fewer than the team Full Burst count (helm takes rotations)', () => {
      const fbStarts = base.events.filter(
        (e) => e.kind === 'fullBurstStart'
      ).length;
      expect(hits.length).toBeLessThan(fbStarts);
    });

    it('lands on her own burstCast frames (stage 3), one instance per cast (single-target collapse)', () => {
      const castFrames = new Set(casts.map((c) => c.frame));
      for (const d of hits) {
        expect(castFrames.has(d.frame), 'nuke rides her own cast').toBe(true);
        expect(casts.filter((c) => c.frame === d.frame).length).toBe(1);
      }
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      expect(hits.filter((d) => d.fbMajorApplied)).toEqual([]);
    });

    it('DISCRIMINATING: a fullBurstEnter-keyed nuke fires on EVERY team Full Burst (incl. helm rotations)', () => {
      const moved = nukes(nukeFbEnter.events);
      const fbStarts = nukeFbEnter.events.filter(
        (e) => e.kind === 'fullBurstStart'
      ).length;
      expect(moved.length, 'one nuke per FB entry').toBe(fbStarts);
      expect(moved.length).toBeGreaterThan(nukes(base.events).length);
    });

    it('DISCRIMINATING: the level-1 magnitude is not the shipped value', () => {
      const l1 = nukes(l1Nuke.events);
      expect(l1.length).toBeGreaterThan(0);
      expect([...new Set(l1.map((d) => d.atkPct))]).toEqual([541.12]);
    });
  });

  describe('C4 — S1 enemy ATK▼ 19.93%/10s is UNMODELED and provably damage-neutral', () => {
    it('shipped emits no skill1 damage and no skill1 buffs from crow', () => {
      expect(
        dmg(base.events).filter(
          (d) => d.slug === 'crow' && d.srcSlot === 'skill1'
        )
      ).toEqual([]);
      expect(
        buffs(base.events).filter(
          (b) =>
            b.casterIdx === CROW &&
            (b.targetIdx === null || b.stat === 'atkPct')
        ),
        'crow applies no enemy debuff and no atkPct buff of any kind'
      ).toEqual([]);
    });

    it('enacting it anyway moves NOTHING (dropped at dispatch on the DEF=0 basis)', () => {
      expect(withS1Debuff.totals).toEqual(base.totals);
      expect(
        buffs(withS1Debuff.events).filter(
          (b) =>
            b.casterIdx === CROW && b.stat === 'atkPct' && b.value < 0
        ),
        'the dropped debuff must not even reach the enemy-buff list'
      ).toEqual([]);
    });
  });
});
