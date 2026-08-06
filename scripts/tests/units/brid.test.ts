// PER-UNIT KIT SPEC — `brid` (Brid, Attacker/AR/Water, Burst III, cd 40s, ammo 60,
// hitsPerShot 1, normalMult 14.29). Kit-autonomy gauntlet 2026-08-05, S2a (tests FIRST).
//
// Brid is a BASE unit (NOT brid-silent-track, the SG/Fire variant). She has NO shipped
// override — every kit line below is MISSING: the whole suite is RED against shipped
// (runComp throws: a unit with prose and no override fails resolveSkills) and goes GREEN
// when S3 lands the faithful override (src/skills/overrides/brid.json).
// `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model each
// assertion must discriminate against).
//
// Kit (blablalink prose, data/characters.json → characters.brid.skills):
//   S1 ■ after 30 normal attacks → self: ATK ▲18.52% for 10 sec                       [B1..B3]
//   S2 ■ highest-final-DEF enemy: 211.2% of final ATK as damage (skill CD 10s)         [B4..B5]
//   BU ■ highest-final-DEF enemy: 1440% of final ATK as Burst Skill damage             [B6..B7]
//      ■ the same target, when at Max HP: additional 1440% of final ATK as damage      [B8..B9]
//
// Encoding rulings (precedents):
//   - S1 counter: hitCount 30 — AR hitsPerShot 1, so 30 normal attacks = 30 hits; no
//     pull-vs-pellet ambiguity (that lever exists only for multi-hit weapons). Repeating
//     counter, snow-white S1 precedent (hitCount 30 self-ATK rider).
//   - S2 visible CD: trigger interval sec:10 (engine convention: first fire t=10s, then
//     every 10s of battle; snow-white S2a owner-ruled precedent for a visible-CD nuke).
//   - Burst: burstCast → enemy flatDamage; burst-cast instant damage is auto-FB-exempt
//     (engine cast-instant rule). TWO separate 1440% instances (2b dual-block precedent),
//     never folded into one 2880% hit (two crit rolls, two popups).
//   - Max-HP gate on the second burst instance: v1 models no HP pool and nobody takes
//     damage at scope lock, so Brid is ALWAYS at Max HP — the gate is deterministically
//     TRUE here and the instance is modeled unconditionally, with the residual flagged for
//     damage-taking content (override caveat + ⚑).
//   - 'highest final DEF' selectors collapse to the sole partless boss — documented
//     stand-in, board-inert (same caveat shape as brid-silent-track's lowest-HP selector).
//   - Rider/nuke defaults per prior 2: crits at sheet rate (default crit ON), no core (no
//     'core strike' text), FB by TIMING for interval riders / cast-exempt for burst casts.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model
// gates nothing):
//   B2  self vs allies: an all-ally buff applies to 4 holders per firing frame.
//   B3  counter 30 vs 60 (or 10): the application count is floor(hits/count).
//   B5  interval (time-based, t=10/20/…) vs a hitCount trigger (fire-rate-coupled) — the
//       firing SECONDS are the discriminator; and 211.2 vs the base-level 124.8.
//   B8  2 instances per cast vs 1 — removing the Max-HP-gated instance (the pessimistic
//       reading) halves the burst-slot damage events.
//   B9  two 1440% instances vs one merged 2880% instance (different popup decomposition).
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / brid B3 / helm B3, boss
// Fire, focus brid) — brid needs a real rotation to cast her burst at all. Deterministic
// (no seed); event-log assertions throughout.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const FIGHT_SEC = 180;
const CARRY = 'brid';
/** controlComp slot order: liter 0 / crown 1 / brid 2 / helm 3. */
const BRID = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp(CARRY),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- helpers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) => evs.filter((e): e is Damage => e.kind === 'damage');
const bridDamage = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  dmg(evs).filter((d) => d.slug === CARRY && d.srcSlot === srcSlot);
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const bridShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === CARRY);
const bridBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === CARRY);

/** Her S1 self-ATK buff applications at the kit magnitude. */
const s1Buffs = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) => b.casterIdx === BRID && b.stat === 'atkPct' && b.value === 18.52
  );

// ---- counterfactual patches (S3+ only: they patch the shipped override) ------------------------
/** B3 counterfactual: S1 counter at 60 normal attacks (half cadence). */
const bridHalfCadence = withPatchedOverride('brid', (ov) => {
  const b = ov.skill1.find((x: any) => x.trigger.kind === 'hitCount');
  if (!b) throw new Error('brid S1 hitCount block missing — fixture is stale');
  b.trigger.count = 60;
});

/** B2 counterfactual: the S1 buff granted to ALL allies instead of self. */
const bridAlliesBuff = withPatchedOverride('brid', (ov) => {
  const b = ov.skill1.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'atkPct')
  );
  if (!b) throw new Error('brid S1 atkPct block missing — fixture is stale');
  b.target = { kind: 'allies' };
});

/** B5 counterfactual: S2 as a hit-count trigger (fire-rate-coupled) instead of a 10s CD. */
const bridHitCountS2 = withPatchedOverride('brid', (ov) => {
  const b = ov.skill2.find((x: any) => x.trigger.kind === 'interval');
  if (!b) throw new Error('brid S2 interval block missing — fixture is stale');
  b.trigger = { kind: 'hitCount', count: 120 };
});

/** B5 counterfactual: the base-level (un-upgraded) 124.8% magnitude. */
const bridBaseValueS2 = withPatchedOverride('brid', (ov) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'flatDamage')
  );
  if (!b) throw new Error('brid S2 flatDamage block missing — fixture is stale');
  b.effects.find((e: any) => e.kind === 'flatDamage').atkPct = 124.8;
});

/** B8 counterfactual: the Max-HP-gated second instance removed (pessimistic reading). */
const bridNoAdditional = withPatchedOverride('brid', (ov) => {
  const fdIndexes: number[] = [];
  ov.burst.forEach((b: any, i: number) => {
    if (b.effects.some((e: any) => e.kind === 'flatDamage')) {
      fdIndexes.push(i);
    }
  });
  if (fdIndexes.length !== 2) {
    throw new Error('brid burst needs two flatDamage blocks — fixture is stale');
  }
  const dropIndex = fdIndexes[1]; // keep the main instance, drop the gated one
  ov.burst = ov.burst.filter((_: any, i: number) => i !== dropIndex);
});

/** B9 counterfactual: the two 1440% instances merged into one 2880% hit. */
const bridMergedNuke = withPatchedOverride('brid', (ov) => {
  const keep = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'flatDamage')
  );
  keep.push({
    slot: 'burst',
    trigger: { kind: 'burstCast' },
    target: { kind: 'enemy' },
    effects: [{ kind: 'flatDamage', atkPct: 2880 }],
  });
  ov.burst = keep;
});

// ---- runs (hoisted: each is a full 180s sim) ---------------------------------------------------
const base = run();
const halfCadence = run({ brid: bridHalfCadence });
const alliesBuff = run({ brid: bridAlliesBuff });
const hitCountS2 = run({ brid: bridHitCountS2 });
const baseValueS2 = run({ brid: bridBaseValueS2 });
const noAdditional = run({ brid: bridNoAdditional });
const mergedNuke = run({ brid: bridMergedNuke });

describe('brid — kit spec', () => {
  it('fixture sanity: the control rotation lets her burst and fire', () => {
    expect(bridBursts(base.events).length).toBeGreaterThan(0);
    expect(bridShots(base.events).length).toBeGreaterThan(100);
  });

  describe('B1 — S1 ATK buff fires (kit magnitude, 10 sec)', () => {
    it('applies ATK ▲18.52% for 10 sec', () => {
      const applied = s1Buffs(base.events);
      expect(applied.length, 'no S1 ATK buff ever applied').toBeGreaterThan(0);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });
  });

  describe('B2 — S1 affects SELF only', () => {
    it('is held by brid alone, never the team', () => {
      const applied = s1Buffs(base.events);
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([BRID]);
    });

    it('DISCRIMINATING: an all-ally buff would reach 4 holders per firing frame', () => {
      const applied = s1Buffs(alliesBuff.events);
      const perFrame = new Map<number, Set<number | null>>();
      for (const b of applied) {
        (perFrame.get(b.frame) ?? perFrame.set(b.frame, new Set()).get(b.frame)!).add(
          b.targetIdx
        );
      }
      const maxHolders = Math.max(0, ...[...perFrame.values()].map((s) => s.size));
      expect(maxHolders).toBeGreaterThan(1);
    });
  });

  describe('B3 — S1 counter is 30 normal attacks (hitsPerShot 1 → hitCount 30)', () => {
    it('applies once per 30 shots, exactly', () => {
      const shots = bridShots(base.events).length;
      const applied = s1Buffs(base.events).length;
      expect(applied, `${applied} applications vs ${shots} shots`).toBe(
        Math.floor(shots / 30)
      );
    });

    it('first application lands AT the 30th shot — never a passive t=0 buff', () => {
      const shots = bridShots(base.events)
        .map((s) => s.frame)
        .sort((a, b) => a - b);
      const first = s1Buffs(base.events)
        .map((b) => b.frame)
        .sort((a, b) => a - b)[0];
      expect(shots.length).toBeGreaterThanOrEqual(30);
      expect(first, 'first S1 apply must not precede the 30th shot').toBeGreaterThanOrEqual(
        shots[29]
      );
    });

    it('DISCRIMINATING: a 60-attack counter halves the application count', () => {
      expect(s1Buffs(halfCadence.events).length).not.toBe(
        s1Buffs(base.events).length
      );
    });
  });

  describe('B4 — S2 nuke at the kit magnitude, skill bucket, crit-eligible', () => {
    const riders = bridDamage(base.events, 'skill2');

    it('is 211.2% of final ATK (not the base-level 124.8%)', () => {
      expect(riders.length).toBeGreaterThan(0);
      expect([...new Set(riders.map((d) => d.atkPct))]).toEqual([211.2]);
      expect([...new Set(riders.map((d) => d.bucket))]).toEqual(['skill']);
    });

    it('is crit-eligible (engine rider convention) and never takes the range bonus', () => {
      expect(riders.every((d) => d.critEligible)).toBe(true);
      // skills never get the +30% range bonus (settled engine rule — noRange is universal)
      expect(riders.every((d) => !d.rangeApplied)).toBe(true);
    });

    it('DISCRIMINATING: the base-level value would read 124.8%', () => {
      expect([
        ...new Set(bridDamage(baseValueS2.events, 'skill2').map((d) => d.atkPct)),
      ]).not.toEqual([211.2]);
    });
  });

  describe('B5 — S2 fires on a 10 sec cooldown (interval), not on hit count', () => {
    it('fires at t = 10s, 20s, … on the wall clock, first fire at t=10s', () => {
      const secs = bridDamage(base.events, 'skill2')
        .map((d) => Math.round(d.sec))
        .sort((a, b) => a - b);
      const expected: number[] = [];
      for (let t = 10; t < FIGHT_SEC; t += 10) expected.push(t);
      expect(secs, `S2 firing seconds ${secs.join(',')}`).toEqual(expected);
    });

    it('DISCRIMINATING: a hit-count trigger fires on the shot cadence, not the clock', () => {
      const secs = bridDamage(hitCountS2.events, 'skill2')
        .map((d) => Math.round(d.sec))
        .sort((a, b) => a - b);
      const expected: number[] = [];
      for (let t = 10; t < FIGHT_SEC; t += 10) expected.push(t);
      expect(secs).not.toEqual(expected);
    });
  });

  describe('B6 — burst nuke: 1440% per instance, burst bucket, one cast pair per cast', () => {
    const nukes = bridDamage(base.events, 'burst');
    const bursts = bridBursts(base.events);

    it('fires in the burst bucket at the kit magnitude', () => {
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([1440]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });
  });

  describe('B7 — burst cast lands BEFORE the Full Burst window (no +50% major)', () => {
    it('never takes the FB major', () => {
      const nukes = bridDamage(base.events, 'burst');
      expect(nukes.filter((d) => d.fbMajorApplied)).toEqual([]);
    });
  });

  describe('B8 — the Max-HP-gated additional instance is modeled (always at Max HP at scope)', () => {
    it('lands TWO 1440% instances per burst cast', () => {
      const nukes = bridDamage(base.events, 'burst');
      const bursts = bridBursts(base.events);
      expect(nukes.length, 'burst nuke count').toBe(2 * bursts.length);
    });

    it('DISCRIMINATING: dropping the gated instance halves the burst damage events', () => {
      const nukes = bridDamage(noAdditional.events, 'burst');
      const bursts = bridBursts(noAdditional.events);
      expect(nukes.length).toBe(bursts.length);
      expect(nukes.length).not.toBe(bridDamage(base.events, 'burst').length);
    });
  });

  describe('B9 — two SEPARATE 1440% instances, never one merged 2880% hit', () => {
    it('DISCRIMINATING: the merged model reads 2880% once per cast', () => {
      const nukes = bridDamage(mergedNuke.events, 'burst');
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([2880]);
      expect(nukes.length).toBe(bridBursts(mergedNuke.events).length);
    });
  });
});
