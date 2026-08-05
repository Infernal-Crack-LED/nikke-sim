// PER-UNIT KIT SPEC — `misato` (Misato, Supporter/SMG/Iron, Burst I, cd 40s, ammo 120,
// hitsPerShot 1, rate_of_fire 1440 nominal → ~20 pulls/s effective, reloadFrames 81 — SMG
// frame quantization is DEFAULT-ON since 2026-07-23; game-mechanics.md §2). Kit-autonomy
// gauntlet 2026-08-04; test-first (S2a) BEFORE the override exists on disk — the first S2d
// run is expected to fail "no override" (MISSING-unit RED), S3 authors the override to green.
//
// One assertion group per KIT LINE (M1..M5 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) and to ISOLATE a recovery channel whose events would
// otherwise overlap another of her own (or crown's) heal sources.
//
// Kit (blablalink prose, data/characters.json → characters.misato.skills):
//   S1 ■ after landing 60 normal attacks → self: Shooting Manual, Hit Rate ▲5.04%,        [M1]
//        stacks up to 3 times, lasts 5 sec
//      ■ after landing 120 normal attacks → 1 ally with the lowest HP percentage:          [M2]
//        recovers 8.04% of the skill user's final Max HP as HP
//   S2 ■ while in Shooting Manual status → all allies: Damage dealt to Shield ▲150%        [M3]
//        continuously
//      ■ while Shooting Manual is at max stacks → self: Outgoing healing ▲30.05%           [M4]
//        continuously
//   BU ■ all allies: recovers 5.06% of the skill user's final Max HP every 1 sec           [M5]
//        for 5 sec continuously
//
// Dispositions (S0): M1 FAITHFUL — the ONLY damage-live line: hitRatePct feeds the live
//   Hit-Rate→core geometry (UNIGEO uniform-in-circle, the DEFAULT path since 2026-07-22;
//   CONE_DELTA is the fallback arm), so stacks moving 1→3 moves her own damage.
//   M2/M5 FAITHFUL EVENTS-ONLY — the engine `heal` effect emits
//   recovery events with NO HP amount (v1 has no HP pool); both lines are implemented for their
//   TANDEM value (they fire teammates' 'recovery' triggers — crown's is in this fixture).
//   Heal MAGNITUDES (8.04% / 5.06% of caster final Max HP) are recorded in the header only.
//   M2's "lowest HP percentage" target is indeterminate without an HP pool → the engine's
//   documented leftmost-ally stand-in (types.ts alliesLowestHp); the fixture slots misato
//   RIGHTMOST so the stand-in resolves to crown and her consumer observes the channel.
// M3/M4 UNMODELED (verbatim in the override's `unmodeled`, pinned below): M3 needs a
//   boss-shield bar the sim never models (no shieldDamage StatKey; partless/shieldless boss —
//   same out-of-domain class as helm's partsDamagePct) AND a self-status gate ("in Shooting
//   Manual status") the schema has no primitive for; M4 scales heal amounts that are themselves
//   unmodeled (no outgoing-healing StatKey) and needs the max-stacks variant of the same gate.
//   Both are offensively inert in the sim's domain → skips, not NO-GO.
//
// Why each assertion discriminates:
//   M1  value/stacks/duration/target pinned from buffApply events; cadence pinned EXACTLY to
//       floor(shots/60) (hitCount counts hitsPerShot=1 per pull), which a 30/120-threshold
//       encoding provably misses; stacks must PROGRESS 1→2→3 with no apply at t=0 (a passive
//       15.12-at-start encoding is the nearest wrong model). Damage must be LIVE: shipped >
//       block-removed, and the nearest-wrong 1-stack counterfactual must land strictly BETWEEN
//       (stack magnitude is monotone in the σ-shrink). A generic-crit counterfactual is
//       unnecessary — the event's `stat` field pins hitRatePct vs critRatePct directly.
//   M2  recovery firings through crown's consumer at HER cadence (every 120 hits ≈ every ~7.4s
//       incl. reloads at ~20 pulls/s); a burst-only heal produces ~4 firings in 180s, not ~24. ADVERSARIAL
//       (S2b fable): hitCount:120 COINCIDES with lastBullet at her base 120-round magazine —
//       the mis-encoding is invisible until ammo changes, so an extended-magazine patch
//       (+60 rounds via skill2-in-memory block; her real skill2 is empty) must keep the proc
//       cadence pinned to 120 LANDED ROUNDS while a lastBullet re-encoding provably drops to
//       the reload-boundary cadence.
//   M3/M4 the override must contain NO skill2 block and BOTH kit lines VERBATIM in
//       `unmodeled.skill2` — the "no silent drops" audit pin.
//   M5  per cast: 5 recovery ticks spanning ~4s (first at cast, then +1s..+4s), isolated by
//       removing her S1-b heal + crown's own hitCount heal so every firing is attributable.
//
// Fixture: misato IS the Burst I opener — slugs [crown(B2)/ada(B3)/misato(B1)], boss Fire,
// focus ada, 180s. All CDs 40s → Full Burst every ~40s, misato casts every one (~4 casts).
// misato is SR → rarity ceiling 2★/core 0 (claire precedent; scope lock's copies:10 encodes
// an SSR ceiling an SR can never reach). Deterministic (no seed); event-log over totals.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const FIGHT_FRAMES = 180 * FPS;
/** slot order: crown 0 / ada 1 / misato 2 (misato rightmost so the alliesLowestHp stand-in
 *  resolves to crown, whose recovery consumer is this file's heal observable). */
const CROWN = 0;
const MISATO = 2;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

const COMP = {
  slugs: ['crown', 'ada', 'misato'],
  bossElement: 'Fire' as const,
  focusSlug: 'ada',
  unitLimits: { misato: { stars: 2, core: 0 } },
};

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({ ...COMP, overrides, cfg: { onEvent: (e) => events.push(e) } });
  return { events, totals: totals(res) };
}

// ---- counterfactual / isolation patches -------------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);
const hasHeal = (b: any) => b.effects.some((e: any) => e.kind === 'heal');

/** M1 reference: the Shooting Manual line removed entirely. */
const misatoNoManual = withPatchedOverride('misato', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'hitRatePct'));
  if (ov.skill1.length === before) {
    throw new Error('misato S1 hitRatePct block missing — fixture is stale');
  }
});
/** M1 counterfactual: the SAME line but never stacking past 1 (nearest wrong magnitude). */
const misatoSingleStack = withPatchedOverride('misato', (ov) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'hitRatePct');
  if (!e) {
    throw new Error('misato S1 hitRatePct effect missing — fixture is stale');
  }
  e.maxStacks = 1;
});
/** M2 isolation: remove her BURST heal so every recovery firing is an S1-b heal. */
const misatoNoBurstHeal = withPatchedOverride('misato', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasHeal(b));
  if (ov.burst.length === before) {
    throw new Error('misato burst heal block missing — fixture is stale');
  }
});
/** M5 isolation: remove her S1-b heal so every recovery firing is a burst tick. */
const misatoNoS1Heal = withPatchedOverride('misato', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasHeal(b));
  if (ov.skill1.length === before) {
    throw new Error('misato S1 heal block missing — fixture is stale');
  }
});
/** Both isolations need crown's OWN hitCount heal out (helm.test.ts precedent). */
const crownNoHeal = withPatchedOverride('crown', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasHeal(b));
  if (ov.skill2.length === before) {
    throw new Error('crown S2 heal block missing — fixture is stale');
  }
});
/** M2 adversarial: extend her magazine by 60 rounds (her real skill2 is EMPTY, so the
 *  in-memory block parked there cannot collide with any shipped encoding). */
const AMMO_BLOCK = {
  slot: 'skill2',
  trigger: { kind: 'passive' },
  target: { kind: 'self' },
  effects: [{ kind: 'buff', stat: 'maxAmmoFlat', value: 60 }],
};
/** shipped S1-b trigger, +60-round magazine, burst/crown heals isolated away. */
const misatoAmmoExt = withPatchedOverride('misato', (ov) => {
  ov.burst = ov.burst.filter((b: any) => !hasHeal(b));
  ov.skill2 = [...ov.skill2, JSON.parse(JSON.stringify(AMMO_BLOCK))];
});
/** nearest-wrong: S1-b re-keyed to lastBullet, same extended magazine. */
const misatoAmmoExtLastBullet = withPatchedOverride('misato', (ov) => {
  ov.burst = ov.burst.filter((b: any) => !hasHeal(b));
  const b = ov.skill1.find(hasHeal);
  if (!b) {
    throw new Error('misato S1 heal block missing — fixture is stale');
  }
  b.trigger = { kind: 'lastBullet' };
  ov.skill2 = [...ov.skill2, JSON.parse(JSON.stringify(AMMO_BLOCK))];
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noManual = run({ misato: misatoNoManual });
const singleStack = run({ misato: misatoSingleStack });
const s1HealOnly = run({ misato: misatoNoBurstHeal, crown: crownNoHeal });
const burstHealOnly = run({ misato: misatoNoS1Heal, crown: crownNoHeal });
const ammoExt = run({ misato: misatoAmmoExt, crown: crownNoHeal });
const ammoExtLastBullet = run({
  misato: misatoAmmoExtLastBullet,
  crown: crownNoHeal,
});

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const misatoShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'misato');
const misatoBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'misato'
  );

/** Shooting Manual applications (her own hitRatePct buff, self-targeted). */
const manualApplies = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) => b.casterIdx === MISATO && b.stat === 'hitRatePct'
  );

/** Distinct frames at which crown's recovery-triggered team buff fired. */
const recoveryFrames = (evs: SimEvent[]): number[] =>
  [
    ...new Set(
      buffs(evs)
        .filter(
          (b) =>
            b.casterIdx === CROWN &&
            b.stat === 'attackDamagePct' &&
            b.value === 20.99
        )
        .map((b) => b.frame)
    ),
  ].sort((a, b) => a - b);

describe('misato — kit spec', () => {
  describe('M1 — S1 Shooting Manual: Hit Rate ▲5.04%, 3 stacks, 5 sec, every 60 hits', () => {
    const applied = manualApplies(base.events);
    const shots = misatoShots(base.events).length;

    it('is the kit magnitude on the hitRatePct stat, self-targeted', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([5.04]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([MISATO]);
      expect([...new Set(applied.map((b) => b.maxStacks))]).toEqual([3]);
    });

    it('reaches max stacks (3) and each application lasts exactly 5 sec', () => {
      expect(
        Math.max(...applied.map((b) => b.stacks)),
        'stacks must accrue to the 3-stack cap at her firing cadence'
      ).toBe(3);
      expect(
        [...new Set(applied.map((b) => b.expiresFrame! - b.frame))]
      ).toEqual([5 * FPS]);
    });

    it('fires exactly once per 60 landed hits (the threshold is 60, not 30/120)', () => {
      expect(shots, 'misato never fired — fixture is broken').toBeGreaterThan(
        600
      );
      expect(applied.length).toBe(Math.floor(shots / 60));
    });

    it('stacks PROGRESS 1→2→3 across the opening hits (never instant-to-max at t=0)', () => {
      const progression = applied.slice(0, 3).map((b) => b.stacks);
      expect(progression).toEqual([1, 2, 3]);
      expect(
        applied[0].frame,
        'the first stack cannot exist before any hit has landed'
      ).toBeGreaterThan(0);
      const shotFrames = misatoShots(base.events).map((s) => s.frame);
      expect(applied[0].frame).toBeGreaterThanOrEqual(shotFrames[59]);
    });

    it('is damage-LIVE: removing it lowers her own total (hitRate feeds the core model)', () => {
      expect(base.totals.misato).toBeGreaterThan(noManual.totals.misato);
    });

    it('DISCRIMINATING: a 1-stack encoding lands strictly between removed and shipped', () => {
      // stack magnitude is monotone in the reticle σ-shrink — 5.04pp < 15.12pp lift
      expect(singleStack.totals.misato).toBeGreaterThan(
        noManual.totals.misato
      );
      expect(base.totals.misato).toBeGreaterThan(singleStack.totals.misato);
    });
  });

  describe('M2 — S1-b: every 120 hits, heal on the lowest-HP ally (recovery event)', () => {
    it('drives crown\u2019s recovery consumer at the 120-hit cadence, not a burst cadence', () => {
      const frames = recoveryFrames(s1HealOnly.events);
      const shots = misatoShots(s1HealOnly.events).length;
      const expected = Math.floor(shots / 120);
      const bursts = misatoBursts(s1HealOnly.events).length;
      expect(
        expected,
        'fixture must produce many more 120-hit heals than bursts'
      ).toBeGreaterThan(bursts * 2);
      expect(
        frames.length,
        `${frames.length} recovery firings vs ${expected} expected S1-b heals — ` +
          'a burst-only or wrong-threshold encoding cannot hit this count'
      ).toBe(expected);
    });

    it('SPLIT from lastBullet: +60-round magazine keeps the cadence at 120 LANDED rounds', () => {
      // hitCount:120 and lastBullet COINCIDE at her base 120-round magazine, so the base
      // fixture cannot tell them apart. Extending the magazine to 180 forces divergence:
      // the shipped trigger still fires every 120 rounds, a lastBullet encoding only at
      // each reload boundary (~every 180 rounds). (S2b adversarial note, claude-fable-5.)
      const shots = misatoShots(ammoExt.events).length;
      const expected = Math.floor(shots / 120);
      const frames = recoveryFrames(ammoExt.events);
      expect(
        expected,
        'extended magazine must produce strictly more procs than reloads'
      ).toBeGreaterThan(Math.floor(shots / 180));
      expect(frames.length).toBe(expected);
    });

    it('DISCRIMINATING: a lastBullet re-encoding provably drops firings on the 180-round mag', () => {
      const shipped = recoveryFrames(ammoExt.events).length;
      const wrong = recoveryFrames(ammoExtLastBullet.events).length;
      expect(
        wrong,
        'lastBullet on a 180-round magazine must fire strictly less often than every 120 hits'
      ).toBeLessThan(shipped);
    });
  });

  describe('M3/M4 — S2 lines are deliberate, documented skips (no silent drops)', () => {
    // The sim models no boss shield bar (M3's Damage dealt to Shield is out of domain, same
    // class as helm's partsDamagePct) and no heal-magnitude channel (M4's Outgoing healing
    // scales nothing); both lines ALSO need a self-status gate the schema has no primitive
    // for. They must appear VERBATIM in the override's `unmodeled.skill2`, sourced here from
    // the kit prose itself, and must NOT be encoded as blocks.
    const prose = JSON.parse(
      readFileSync(
        new URL('../../../data/characters.json', import.meta.url),
        'utf8'
      )
    ).characters.misato.skills.skill2 as string;
    const lines = prose
      .split('■')
      .map((s) => s.trim())
      .filter(Boolean);

    it('the kit prose yields exactly the two S2 lines', () => {
      expect(lines.length).toBe(2);
      expect(lines[0]).toContain('Damage dealt to Shield');
      expect(lines[1]).toContain('Outgoing healing');
    });

    it('both lines are verbatim in unmodeled.skill2 and no skill2 block exists', async () => {
      const { loadOverride } = await import(
        '../../../src/skills/overrides-node.js'
      );
      const ov = loadOverride('misato') as any;
      expect(ov, 'misato override missing on disk').toBeTruthy();
      expect(ov.skill2, 'S2 must have NO encoded blocks').toEqual([]);
      expect(ov.unmodeled?.skill2).toEqual(lines);
    });
  });

  describe('M5 — burst: team HoT, 5 recovery ticks at 1s spacing per cast', () => {
    const casts = misatoBursts(burstHealOnly.events);

    it('the fixture casts her burst at least 3 times (40s CD over 180s)', () => {
      expect(casts.length).toBeGreaterThanOrEqual(3);
    });

    it('each full-window cast keeps recovery firing for the whole 5s HoT', () => {
      const frames = recoveryFrames(burstHealOnly.events);
      const full = casts.filter((c) => c.frame + 5 * FPS <= FIGHT_FRAMES);
      expect(
        full.length,
        'no misato burst has a full 5s window inside the fight'
      ).toBeGreaterThanOrEqual(3);
      for (const cast of full) {
        // ticks land at cast, +1s, +2s, +3s, +4s (first instant, N-1 scheduled)
        const inWindow = frames.filter(
          (f) => f >= cast.frame && f <= cast.frame + 4 * FPS
        );
        const spanSec = inWindow.length
          ? (inWindow[inWindow.length - 1] - cast.frame) / FPS
          : 0;
        expect(
          inWindow.length,
          `burst at ${cast.sec.toFixed(2)}s produced ${inWindow.length} recovery firing(s) ` +
            '— an instant single-tick heal produces exactly 1 at the cast frame'
        ).toBe(5);
        expect(
          spanSec,
          'the HoT must reach ~4s after the cast frame, not collapse to it'
        ).toBeGreaterThanOrEqual(3.9);
      }
    });
  });
});
