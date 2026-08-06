// PER-UNIT KIT SPEC — `rapi` (Rapi, Attacker/AR/Fire, Burst III, cd 40s, ammo 60,
// hitsPerShot 1, rate_of_fire 720). Kit-autonomy gauntlet 2026-08-05 (test-first
// re-derivation). ⚠ EXACT SLUG: `rapi` — the AR/Fire BASE unit, NOT `rapi-red-hood`
// (MG/Fire "Rapi: Red Hood", aka rrh/rapipi); lint-slug-disambiguation fires its expected
// advisory on the shared base-name — the exact slug is resolved here (quency/mihara/mary
// precedent).
// NOTE: this is a FROM-SCRATCH unit — there was no shipped override before this gauntlet
// (simSupported was false), so the harness cannot even load her until
// src/skills/overrides/rapi.json exists (the RED state of this suite: every assertion
// fails at load). Every assertion below PINS a kit line GREEN vs that override and RED vs
// the nearest-wrong counterfactual (withPatchedOverride), so the file discriminates exactly
// as a verification gauntlet would (maiden/anis precedent).
//
// Kit (blablalink prose, data/characters.json → characters.rapi.skills, lvl 10):
//   S1 ■ attacked 20× → self: ATK ▲21.81% for 20 sec.                          [UNMODELED — R4]
//   S2 ■ 1 enemy w/ highest final ATK: 528.97% of final ATK damage (cd 20s)    [FAITHFUL — R1]
//      ■ same target: Taunt for 5 sec.                                         [UNMODELED — R5]
//   BU ■ 1 enemy w/ highest final ATK: 657.72% of final ATK as Burst Skill dmg [FAITHFUL — R2]
//      ■ self: ATK ▲60.75% for 10 sec.                                         [FAITHFUL — R3]
//
// THE S1 ATTACKED-CLUSTER IS OUT-OF-DOMAIN. Rapi's S1 fires 'when attacked 20 times' — the
// same kit archetype as maiden's Revenge / anis's attacked-40 / yulha's Calm. The sim has NO
// incoming-damage model (v1 boss is immortal and never acts) and NO 'attacked N times'
// trigger primitive, so the counter can never accrue on this basis. Unlike maiden/anis the
// buff it feeds is OFFENSIVE (self ATK ▲21.81%) — this is a genuine damage lever the sim
// cannot produce, and it is documented UNMODELED + ⚑ rather than fudged with a dealt-hits
// proxy (faithful omission per maiden/anis/yulha precedent; the nearest-wrong hitCount-20-
// on-dealt-hits encoding is pinned out in R4). Her in-game S2 taunt pulls enemy fire onto
// her, feeding that same counter — the tanking half of the loop is likewise out-of-domain
// (R5: no aggro primitive; the single partless boss already takes everyone's attacks).
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model
// gates nothing):
//   R1  the S2 missile is a NO-ACTIVATION-CLAUSE skill on the datamined 20s CD → interval:20
//       (first fire t=20 — the yulha/rosanna-chic-ocean/maiden interval convention), one
//       flatDamage 528.97 in the 'skill' bucket from srcSlot skill2. A wrong magnitude (the
//       lvl-1 308.57), a wrong cadence (interval:40), or a dropped line each produce a
//       DIFFERENT log/total.
//   R2  a burst CAST lands BEFORE the Full Burst window opens, so the nuke must never take
//       the +50% major (verified fact, 2026-07-13) — the fullBurstEnter counterfactual lands
//       in-window, takes the major, AND fires on helm-cast Full Bursts rapi did not cast.
//       The magnitude is the lvl-10 657.72, not the lvl-1 328.86.
//   R3  the burst's self ATK buff is SCOPED to rapi alone on her OWN casts: one buffApply per
//       rapi burstCast (helm co-B3 alternates, so helm-cast FBs must apply nothing), sole
//       holder rapi, value 60.75, 600-frame window. The fullBurstEnter counterfactual applies
//       on EVERY team FB; the allies counterfactual widens the holder set; the lvl-1 30.37 and
//       the 20s duration each move their readings. Removing the buff moves her total (live,
//       not inert — a self ATK buff is load-bearing).
//   R4  S1 is genuinely unmodeled: rapi emits NO atkPct buff besides the burst's 60.75 —
//       specifically NO 21.81 buff. The nearest-wrong encoding (hitCount:20 on hits she DEALS)
//       adds 21.81 buffs in flight — proving the absence is a choice, not a stale fixture.
//   R5  the taunt is out-of-domain: no aggro model, single partless boss — documented
//       verbatim in unmodeled, load-bearing-neutral (no damage assertion).
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / rapi B3 carry / helm B3,
// boss Fire, focus rapi) — rapi needs a real rotation to cast her burst at all (helm is the
// co-B3; they alternate stage-III casts, as in the maiden fixture). Fire vs the Fire control
// boss is elementally neutral (Fire holds its ×1.10 major only vs Wind). Deterministic (no
// seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** controlComp slot order: liter 0 / crown 1 / rapi 2 / helm 3. */
const RAPI = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('rapi'),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches -------------------------------------------------------------------
/** R1 wrong magnitude: the lvl-1 value 308.57 instead of the lvl-10 528.97. */
const rapiWeakS2 = withPatchedOverride('rapi', (ov) => {
  ov.skill2[0].effects[0].atkPct = 308.57;
});
/** R1 wrong cadence: re-fires every 40s instead of 20s. */
const rapiSlowS2 = withPatchedOverride('rapi', (ov) => {
  ov.skill2[0].trigger = { kind: 'interval', sec: 40 };
});
/** R1 reference: the missile removed entirely (proves it is live, not inert). */
const rapiNoS2 = withPatchedOverride('rapi', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'flatDamage')
  );
  if (ov.skill2.length === before) {
    throw new Error('rapi S2 flatDamage block missing — fixture is stale');
  }
});
/** R2 wrong magnitude: the lvl-1 burst 328.86 instead of the lvl-10 657.72. */
const rapiWeakBurst = withPatchedOverride('rapi', (ov) => {
  ov.burst[0].effects[0].atkPct = 328.86;
});
/** R2/R3 wrong trigger: fullBurstEnter (lands in-window, takes the +50% FB major, and fires
 *  on helm-cast Full Bursts) instead of burstCast (rapi's OWN casts, pre-FB snapshot). */
const rapiBurstNukeOnFbEnter = withPatchedOverride('rapi', (ov) => {
  ov.burst[0].trigger = { kind: 'fullBurstEnter' };
});
const rapiBurstBuffOnFbEnter = withPatchedOverride('rapi', (ov) => {
  ov.burst[1].trigger = { kind: 'fullBurstEnter' };
});
/** R3 wrong magnitude: the lvl-1 30.37 instead of the lvl-10 60.75. */
const rapiWeakBurstBuff = withPatchedOverride('rapi', (ov) => {
  ov.burst[1].effects[0].value = 30.37;
});
/** R3 wrong scope: the ATK buff hits all allies, not just herself. */
const rapiBurstBuffAllies = withPatchedOverride('rapi', (ov) => {
  ov.burst[1].target = { kind: 'allies' };
});
/** R3 wrong duration: 20 sec instead of 10. */
const rapiLongBurstBuff = withPatchedOverride('rapi', (ov) => {
  ov.burst[1].effects[0].durationSec = 20;
});
/** R3 reference: the burst ATK buff removed entirely (proves it is live, not inert). */
const rapiNoBurstBuff = withPatchedOverride('rapi', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.stat === 'atkPct')
  );
  if (ov.burst.length === before) {
    throw new Error('rapi burst atkPct block missing — fixture is stale');
  }
});
/** R2b (S2b reviewer reconciliation, note 4 — the ordering trap): the 657.72% nuke and the
 *  +60.75% buff ride the same cast. The shipped override lists the nuke block BEFORE the
 *  buff block, so the nuke snapshots PRE-buff ATK (engine dispatch is array-ordered and
 *  buffs apply inline on the trigger frame). Swapping the order makes the nuke ride its own
 *  fresh buff — the model the shipped ordering deliberately avoids. */
const rapiBurstReordered = withPatchedOverride('rapi', (ov) => {
  const [nuke, buff] = ov.burst;
  ov.burst = [buff, nuke];
});
/** R4 the nearest-wrong S1 model: 'attacked 20 times' proxied as hitCount:20 on hits rapi
 *  DEALS, granting the 21.81% self ATK buff in flight. The immortal-boss sim produces zero
 *  hits TAKEN, so the shipped override deliberately does NOT adopt this proxy. */
const rapiS1OnDealtHits = withPatchedOverride('rapi', (ov) => {
  ov.skill1.push({
    slot: 'skill1',
    trigger: { kind: 'hitCount', count: 20 },
    target: { kind: 'self' },
    effects: [
      { kind: 'buff', stat: 'atkPct', value: 21.81, durationSec: 20 },
    ],
  });
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const weakS2 = run({ rapi: rapiWeakS2 });
const slowS2 = run({ rapi: rapiSlowS2 });
const noS2 = run({ rapi: rapiNoS2 });
const weakBurst = run({ rapi: rapiWeakBurst });
const burstNukeOnFbEnter = run({ rapi: rapiBurstNukeOnFbEnter });
const burstBuffOnFbEnter = run({ rapi: rapiBurstBuffOnFbEnter });
const weakBurstBuff = run({ rapi: rapiWeakBurstBuff });
const burstBuffAllies = run({ rapi: rapiBurstBuffAllies });
const longBurstBuff = run({ rapi: rapiLongBurstBuff });
const noBurstBuff = run({ rapi: rapiNoBurstBuff });
const burstReordered = run({ rapi: rapiBurstReordered });
const s1OnDealtHits = run({ rapi: rapiS1OnDealtHits });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const rapiAtkBuffs = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.casterIdx === RAPI && b.stat === 'atkPct');
const rapiBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'rapi');
const rapiSkillNukes = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Damage =>
      e.kind === 'damage' && e.slug === 'rapi' && e.bucket === 'skill'
  );
const rapiBurstNukes = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Damage =>
      e.kind === 'damage' && e.slug === 'rapi' && e.bucket === 'burst'
  );

describe('rapi — kit spec', () => {
  describe('R1 — S2 missile: 528.97% of final ATK to the boss every 20s (no activation clause)', () => {
    const nukes = rapiSkillNukes(base.events);

    it('is the lvl-10 magnitude 528.97 (not the lvl-1 308.57), skill bucket, srcSlot skill2', () => {
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([528.97]);
      expect([...new Set(nukes.map((d) => d.srcSlot))]).toEqual(['skill2']);
      expect(
        [...new Set(rapiSkillNukes(weakS2.events).map((d) => d.atkPct))],
        'the lvl-1 counterfactual must read 308.57'
      ).toEqual([308.57]);
    });

    it('re-fires on the 20s CD: t=20/40/.../160, first fire at the CD (no force-cast to t=0)', () => {
      const frames = [...new Set(nukes.map((d) => d.frame))].sort(
        (a, b) => a - b
      );
      expect(frames).toEqual([
        20 * FPS,
        40 * FPS,
        60 * FPS,
        80 * FPS,
        100 * FPS,
        120 * FPS,
        140 * FPS,
        160 * FPS,
      ]);
      expect(
        new Set(rapiSkillNukes(slowS2.events).map((d) => d.frame)).size,
        'interval:40 must produce fewer distinct fire frames than interval:20'
      ).toBeLessThan(frames.length);
    });

    it('is crit-eligible at the caster sheet rate (engine flatDamage default)', () => {
      expect(nukes.every((d) => d.critEligible === true)).toBe(true);
    });

    it("is live, not inert: removing it moves rapi's total", () => {
      expect(base.totals.rapi).not.toEqual(noS2.totals.rapi);
    });
  });

  describe('R2 — burst nuke: 657.72% of final ATK, cast BEFORE the FB window on rapi casts only', () => {
    const nukes = rapiBurstNukes(base.events);

    it('fires once per rapi burst cast at the lvl-10 magnitude, in the burst bucket', () => {
      expect(nukes.length).toBe(rapiBursts(base.events).length);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([657.72]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
      expect([
        ...new Set(rapiBurstNukes(weakBurst.events).map((d) => d.atkPct)),
      ]).toEqual([328.86]);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      expect(nukes.every((d) => d.fbMajorApplied === false)).toBe(true);
      // The fullBurstEnter counterfactual lands in-window and takes the major.
      expect(
        rapiBurstNukes(burstNukeOnFbEnter.events).some(
          (d) => d.fbMajorApplied === true
        ),
        'a fullBurstEnter nuke must take the +50% FB major — proving burstCast is the FB-exempt trigger'
      ).toBe(true);
    });

    it('fires ONLY on rotations rapi herself casts — helm-cast Full Bursts produce no nuke', () => {
      // helm is the co-B3 and casts the other stage-III windows; a fullBurstEnter nuke
      // fires on those too, so it strictly out-fires rapi's own casts.
      expect(
        rapiBurstNukes(burstNukeOnFbEnter.events).length,
        'fullBurstEnter must over-fire vs burstCast (helm casts half the FBs)'
      ).toBeGreaterThan(nukes.length);
    });

    it('is crit-eligible at the caster sheet rate (engine flatDamage default)', () => {
      expect(nukes.every((d) => d.critEligible === true)).toBe(true);
    });

    it('snapshots PRE-buff ATK: the nuke block dispatches before the same-cast buff block', () => {
      // The nuke and the +60.75% buff ride the same burstCast. Shipped order = nuke first,
      // so the hit must NOT include the fresh buff. Swapping the block order (buff first)
      // makes the same hit strictly harder — proving the shipped ordering is load-bearing.
      const baseAtks = nukes.map((d) => d.baseAtk);
      const reorderedAtks = rapiBurstNukes(burstReordered.events).map(
        (d) => d.baseAtk
      );
      expect(baseAtks.length).toBeGreaterThan(0);
      expect(reorderedAtks.length).toBe(baseAtks.length);
      const a = [...baseAtks].sort((x, y) => x - y);
      const b = [...reorderedAtks].sort((x, y) => x - y);
      expect(b.every((v, i) => v > a[i])).toBe(true);
    });
  });

  describe('R3 — burst grants SELF ATK ▲60.75% for 10s on rapi casts only', () => {
    const applied = rapiAtkBuffs(base.events);

    it('applies once per rapi burst cast at the lvl-10 magnitude', () => {
      expect(applied.length).toBe(rapiBursts(base.events).length);
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([60.75]);
      expect([
        ...new Set(rapiAtkBuffs(weakBurstBuff.events).map((b) => b.value)),
      ]).toEqual([30.37]);
    });

    it('reaches ONLY herself (not all allies)', () => {
      expect(new Set(applied.map((b) => b.targetIdx))).toEqual(
        new Set([RAPI])
      );
      const allyHolders = new Set(
        rapiAtkBuffs(burstBuffAllies.events).map((b) => b.targetIdx)
      );
      expect(
        allyHolders.size,
        'allies scope must widen the holder set to all four'
      ).toBe(4);
    });

    it('lasts exactly 10 sec (600 frames), not 20', () => {
      expect([
        ...new Set(applied.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([10 * FPS]);
      expect(
        [
          ...new Set(
            rapiAtkBuffs(longBurstBuff.events).map(
              (b) => b.expiresFrame! - b.frame
            )
          ),
        ],
        'the 20s counterfactual must move the window'
      ).toEqual([20 * FPS]);
    });

    it('applies ONLY on rotations rapi herself casts (helm-cast FBs apply nothing)', () => {
      expect(
        rapiAtkBuffs(burstBuffOnFbEnter.events).length,
        'fullBurstEnter must apply on EVERY team FB, out-firing rapi casts'
      ).toBeGreaterThan(applied.length);
    });

    it("is live, not inert: removing it moves rapi's total", () => {
      expect(base.totals.rapi).not.toEqual(noBurstBuff.totals.rapi);
    });
  });

  describe('R4 — S1 (attacked-20 self ATK buff) is genuinely unmodeled', () => {
    it('emits NO 21.81 atkPct buff — the only rapi atkPct is the burst 60.75', () => {
      const atkBuffs = rapiAtkBuffs(base.events);
      expect(atkBuffs.length).toBe(rapiBursts(base.events).length);
      expect(atkBuffs.every((b) => b.value === 60.75)).toBe(true);
      expect(atkBuffs.some((b) => b.value === 21.81)).toBe(false);
      // The nearest-wrong dealt-hits proxy produces 21.81 buffs in flight — the shipped
      // override deliberately does NOT adopt it (20 hits TAKEN can never accrue).
      expect(
        rapiAtkBuffs(s1OnDealtHits.events).filter((b) => b.value === 21.81)
          .length,
        'the hitCount-20-on-dealt-hits counterfactual must produce 21.81 buffs — proving the omission is a choice'
      ).toBeGreaterThan(0);
    });
  });

  describe('R5 — S2 taunt is out-of-domain (documented, no damage assertion)', () => {
    it('the sim models no enemy targeting/aggro, so the taunt moves nothing — recorded in unmodeled', () => {
      // No aggro model in v1: there is nothing to assert behaviorally. The line sits
      // verbatim in unmodeled.skill2; its omission is load-bearing-neutral.
      expect(base.totals.rapi).toBeGreaterThan(0);
    });
  });
});
