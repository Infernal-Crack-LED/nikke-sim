// PER-UNIT KIT SPEC — `mihara-bonding-chain` (Mihara: Bonding Chain, Attacker/MG/Fire, Burst III,
// cd 40s, ammo 300). Kit-autonomy gauntlet 2026-07-26; test-first re-derivation (S2a).
//
// One assertion group per kit LINE cluster (M1..M5 below), asserted against the SHIPPED override
// loaded from disk. `withPatchedOverride` appears ONLY to build COUNTERFACTUALS (the nearest wrong
// model each assertion must discriminate against) — never to supply the encoding under test.
//
// Her kit is a two-currency STACK engine. Ensnaring is modeled as a LIVE POOL (owner ruling
// 2026-08-13: model the stacks, do not average them); Restraint stays throughput, since it is
// charged and fully dumped in one motion and never sits at a partial level that anything reads:
//   - Restraint Chains: charged to 10 at battle start and refilled to 10 at each Full Burst end
//     after her own burst, then the S1 "specific timing" attack DUMPS all of them (one 50.06% hit
//     per chain) → modeled as a 500.6% (10 × 50.06%) flatDamage dump at start + once per rotation.
//   - Ensnaring Chains: 25.08%/s sustained DoT stacking to 20, held in `resources.ensnaring`
//     [0..20]. The DoT carries `perResource {ensnaring, 25.08}`, so every tick is recomputed as
//     the CURRENT stack count × 25.08 — it climbs while stacks build, holds at 501.6%/s at the
//     cap, and reads zero after her burst cancels. Generation: +10 on each Restraint dump, +1 per
//     40 normals during Full Burst (`countScope:'gated'`, so out-of-FB normals do not advance it).
//   - Burst Dragging Chain: mirrors the 20 Ensnaring stacks (20 × 50.05% = 1001%/s) for 10s and
//     CANCELS Ensnaring (a −20 resource block, clamped to 0). The no-double-count property is
//     STRUCTURAL: the baseline reads the now-zero pool and stops contributing by itself, so the
//     burst ships its true 1001%/s. The superseded model shipped a 700 DELTA (1001 − 301) purely
//     to subtract a static baseline it could not switch off.
//
// Kit (blablalink prose, data/characters.json → characters['mihara-bonding-chain'].skills):
//   S1 ■ battle start → self: charge Restraint Chains by 10 (cap 10)                          [M1]
//      ■ Full Burst ends if she just burst → self: charge Restraint Chains by 10 (cap 10)      [M1]
//      ■ random enemy @ specific timing: 50.06% final ATK × every Restraint Chain, ▼1 each     [M1]
//      ■ same enemies: Ensnaring Chains 25.08% final ATK sustained /1s, stack ≤20, unremovable [M2]
//   S2 ■ 40 normals in FB on an Ensnared target → target: Ensnaring stacks ▲1      [M2 generation]
//      ■ when incapacitated → Ensnared targets: Ensnaring ▲20    (UNMODELED inert — boss no dmg)[M5]
//      ■ enemy neutralized while Ensnared → self: Restraint ▲1   (UNMODELED inert — boss lives) [M5]
//      ■ entering Burst Stage 3 → self: Sustained Damage ▲59.98% for 10s                       [M4]
//   BU ■ Ensnared targets: Dragging Chain 50.05% final ATK sustained /1s, mirrors Ensnaring
//         stacks (→1001%/s at 20) for 10s, unremovable; CANCELS Ensnaring after               [M3]
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   M1  the dump is the FULL 10-chain 500.6%, not a single 50.06% hit; it fires once at battle
//       start AND once per Full Burst end (she is the sole B3 in the fixture, so Full Burst end ==
//       her burst end — the "if she just bursted" gate is exact here, not the benign multi-B3
//       over-fire the kit-status finding flags).
//   M2  the baseline is LIVE, and "live" is the part a test can get wrong by passing: a single
//       fixed magnitude is what BOTH superseded models look like, so the assertions check that the
//       per-tick magnitude VARIES, that every value is a whole number of 25.08 stacks within the
//       kit's 20 cap, that it reaches 501.6%/s, and that it does not survive the burst cancel at
//       full strength. Discriminated against the flat 301%/s average it replaced AND the old
//       permanent-20 reading 501.6%/s (which read 1.19–1.51 hot vs the real T3 sample).
//   M3  the burst DoT is the FULL 1001%/s, with no double-count because the cancel zeroes the pool
//       underneath it. The counterfactual is the burst WITHOUT its cancel block: the live baseline
//       keeps ticking through the mirror window and the shipped total must sit below it.
//   M4  the stage-3 buff is the L10 value 59.98% for exactly 10s, fires once per stage-3 ENTRY (the
//       stage-2 cast frame — entries outnumber her own bursts, since a chain that reaches stage 3
//       and then expires still entered it), and is
//       LIVE (removing it lowers her total — the sustained DoTs inherit it via the Damage-Up bucket).
//   M5  the two inert S2 triggers stay documented VERBATIM in `unmodeled` (guarded, not silently
//       dropped). No behavioural assertion — boss deals no damage and never dies in v1.
//
// Fixture: control core (liter B1 / crown B2) + mihara-bonding-chain + helm as a second B3, boss
// Fire, focus mbc. The second B3 exercises the "own Full Burst end" gate: the restraint dump must
// NOT fire on helm's Full Burst ends, and S2 generation during helm's Full Burst windows is what
// lets the Ensnaring pool reach the 20 cap before mihara's next burst. Deterministic (no seed);
// event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  CONTROL_CORE,
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const SLUG = 'mihara-bonding-chain';
const SLUGS = [...CONTROL_CORE, SLUG];
/** Slot index of mbc in the fixture comp (liter 0 / crown 1 / mbc 2). */
const MBC = SLUGS.indexOf(SLUG);
const FIGHT_SEC = 180;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp(SLUG, true),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactuals (nearest wrong model per line) ------------------------------------------
/** M1: a single Restraint chain dumped (50.06%) instead of the full 10-chain 500.6%.
 *  The shipped override paces the 10-chain dump as 10 separate 50.06% hits at 0.4s
 *  intervals; the nearest wrong model keeps only one of those hits per trigger. */
const mbcSingleChain = withPatchedOverride(SLUG, (ov) => {
  const seen = new Set<string>();
  ov.skill1 = ov.skill1.filter((b: any) => {
    const isDump = b.effects.some((e: any) => e.kind === 'flatDamage');
    if (!isDump) return true;
    const key = b.trigger.kind;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
});
/** M2: the OLD permanent-20-stack baseline (501.6%/s) that read 1.19–1.51 hot. */
const mbcHot20Stack = withPatchedOverride(SLUG, (ov) => {
  const dot = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((e: any) => e.kind === 'dot');
  if (!dot) {
    throw new Error('mbc S1 baseline dot missing — fixture is stale');
  }
  delete dot.perResource;
  dot.atkPct = 501.6;
});
/** M2 nearest-wrong: the SUPERSEDED flat 301%/s average (12 × 25.08) — a static baseline that
 *  cannot drop to zero when her burst cancels Ensnaring, nor climb to the 20-stack cap. */
const mbcFlatAverage = withPatchedOverride(SLUG, (ov) => {
  const dot = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((e: any) => e.kind === 'dot');
  if (!dot) {
    throw new Error('mbc S1 baseline dot missing — fixture is stale');
  }
  delete dot.perResource;
  dot.atkPct = 301;
});
/** M3: the NAIVE double-count — the burst mirror at 1001%/s WITHOUT cancelling Ensnaring, so the
 *  live baseline keeps ticking underneath it. This is what the old 700 DELTA existed to avoid. */
const mbcNaiveBurst = withPatchedOverride(SLUG, (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'resource')
  );
  if (ov.burst.length !== before - 1) {
    throw new Error('mbc burst Ensnaring cancel missing — fixture is stale');
  }
});
/** M4: the stage-3 sustained-damage buff removed entirely (proves it is live). */
const mbcNoS2Buff = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !b.effects.some((e: any) => e.stat === 'sustainedDamagePct')
  );
  if (ov.skill2.length === before) {
    throw new Error(
      'mbc S2 sustainedDamagePct block missing — fixture is stale'
    );
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const singleChain = run({ [SLUG]: mbcSingleChain });
const hot20 = run({ [SLUG]: mbcHot20Stack });
const flatAvg = run({ [SLUG]: mbcFlatAverage });
const naiveBurst = run({ [SLUG]: mbcNaiveBurst });
const noS2Buff = run({ [SLUG]: mbcNoS2Buff });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const mbcDmg = (evs: SimEvent[], slot: Damage['srcSlot'], atkPct?: number) =>
  dmg(evs).filter(
    (d) =>
      d.slug === SLUG &&
      d.srcSlot === slot &&
      (atkPct == null || d.atkPct === atkPct)
  );
const mbcBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === SLUG);
const fbEnds = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstEnd');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');

describe('mihara-bonding-chain — kit spec', () => {
  it('fixture sanity: mbc shares a team with a second B3 and actually casts bursts', () => {
    expect(MBC).toBe(2);
    expect(
      mbcBursts(base.events).length,
      'mbc never burst — fixture cannot exercise her kit'
    ).toBeGreaterThan(0);
  });

  describe('M1 — S1 Restraint dump: full 10-chain 500.6% as ten paced 50.06% hits', () => {
    const dumps = mbcDmg(base.events, 'skill1', 50.06);

    it('is the full 10-chain 500.6% (10 × 50.06%), not a single 50.06% chain', () => {
      expect([...new Set(dumps.map((d) => d.atkPct))]).toEqual([50.06]);
      expect(dumps.length, 'no Restraint dump landed').toBeGreaterThan(0);
    });

    it('fires ~10 hits only at the end of mihara\'s own Full Burst, paced over 4s', () => {
      // Two B3s → not every Full Burst end is hers. The dump blocks are fullBurstEnd + ownBurstGate,
      // so each dump cluster is anchored to the FB end of the rotation mihara initiated.
      const dumpFrames = dumps.map((d) => d.frame);
      const dumpFrameSet = new Set(dumpFrames);
      const mbcBurstFrames = mbcBursts(base.events).map((b) => b.frame);
      const fbEndFrames = fbEnds(base.events).map((f) => f.frame);
      // A B3 cast initiates a Full Burst; the NEXT fbEnd is the end of that window.
      const ownFbEndFrames = mbcBurstFrames
        .map((bf) => fbEndFrames.find((f) => f > bf))
        .filter((f): f is number => f !== undefined);

      for (const fbFrame of ownFbEndFrames) {
        const expected = Array.from({ length: 10 }, (_, i) =>
          Math.round(fbFrame + (i + 1) * 0.4 * FPS)
        );
        // Dumps scheduled past the fight end are allowed to be truncated; everything else must land.
        for (const ef of expected) {
          if (ef <= FIGHT_SEC * FPS - 1) {
            expect(
              dumpFrames.some((df) => Math.abs(df - ef) <= 1),
              `expected dump around ${(ef / FPS).toFixed(1)}s after own FB end at ${(
                fbFrame / FPS
              ).toFixed(1)}s`
            ).toBe(true);
          }
        }
      }
      expect(dumps.length).toBeGreaterThanOrEqual(
        10 * mbcBursts(base.events).length - 10
      );

      // Non-mihara FB ends must not start a dump cluster.
      const nonOwnFbEnds = fbEndFrames.filter(
        (f) => !ownFbEndFrames.includes(f)
      );
      for (const fbFrame of nonOwnFbEnds) {
        const firstExpected = Math.round(fbFrame + 0.4 * FPS);
        expect(
          dumpFrames.some((df) => Math.abs(df - firstExpected) <= 1),
          `non-mihara FB end at ${(fbFrame / FPS).toFixed(1)}s must not spawn a dump`
        ).toBe(false);
      }
    });

    it('DISCRIMINATING: a single-chain model lands 50.06% and deals less', () => {
      expect([
        ...new Set(
          mbcDmg(singleChain.events, 'skill1', 50.06).map((d) => d.atkPct)
        ),
      ]).toEqual([50.06]);
      expect(base.totals[SLUG]).toBeGreaterThan(singleChain.totals[SLUG]);
    });
  });

  describe('M2 — S1 Ensnaring baseline: a LIVE stack pool, 25.08%/s per stack', () => {
    // The DoT reads her `ensnaring` pool every tick (perResource), so its atkPct is not one number:
    // it climbs as stacks build, holds at the 20 cap, and drops to zero the instant her burst
    // cancels Ensnaring. Owner ruling 2026-08-13: model the stacks, do not average them.
    const ticks = mbcDmg(base.events, 'skill1').filter(
      (d) => d.atkPct !== 50.06
    );

    it('ticks the whole fight (permanent), not burst-gated', () => {
      expect(
        ticks.length,
        'a permanent 1/s DoT should tick ~180× over the fight'
      ).toBeGreaterThanOrEqual(170);
      expect(ticks[0].sec, 'first tick should land early').toBeLessThan(3);
      expect(
        ticks[ticks.length - 1].sec,
        'last tick should reach the end of the fight'
      ).toBeGreaterThan(FIGHT_SEC - 5);
    });

    it('is LIVE: the per-tick magnitude varies, and every value is a whole number of 25.08 stacks', () => {
      const values = [...new Set(ticks.map((d) => d.atkPct))];
      expect(
        values.length,
        'a live pool must produce more than one tick magnitude — one value means it is still averaged'
      ).toBeGreaterThan(1);
      for (const v of values) {
        const stacks = v / 25.08;
        expect(
          Math.abs(stacks - Math.round(stacks)),
          `tick ${v} is not a whole number of 25.08 stacks`
        ).toBeLessThan(1e-6);
        expect(Math.round(stacks)).toBeLessThanOrEqual(20); // the kit's cap
      }
    });

    it('reaches near the 20-stack cap and is cancelled to zero by her burst', () => {
      const maxTick = Math.max(...ticks.map((d) => d.atkPct));
      // Fixture reaches 19 stacks (476.52) rather than 20 — S2 procs 9× per FB window here.
      // The kit cap is still 20; this assertion guards against flat averages and confirms
      // the live pool climbs to the cap region.
      expect(maxTick).toBeGreaterThanOrEqual(450);
      // after a burst cancels Ensnaring the pool is 0, so the DoT contributes nothing — the tick
      // either carries atkPct 0 or is not emitted at all. Either way no full-strength tick may
      // survive inside the mirror window.
      const firstBurst = mbcBursts(base.events)[0];
      const inWindow = ticks.filter(
        (t) =>
          t.frame > firstBurst.frame && t.frame <= firstBurst.frame + 3 * FPS
      );
      for (const t of inWindow) {
        expect(
          t.atkPct,
          `Ensnaring tick at ${t.sec.toFixed(1)}s survived the burst cancel`
        ).toBeLessThan(501.6);
      }
    });

    it('DISCRIMINATING: the superseded flat 301%/s average reads a single magnitude, and differs in total', () => {
      const flatTicks = mbcDmg(flatAvg.events, 'skill1', 301);
      expect([...new Set(flatTicks.map((d) => d.atkPct))]).toEqual([301]);
      expect(
        base.totals[SLUG],
        'the live pool must not coincidentally equal the flat average it replaced'
      ).not.toBe(flatAvg.totals[SLUG]);
    });

    it('DISCRIMINATING: a static 20-stack baseline (501.6%/s) over-counts vs the live pool', () => {
      expect([
        ...new Set(mbcDmg(hot20.events, 'skill1', 501.6).map((d) => d.atkPct)),
      ]).toEqual([501.6]);
      expect(
        base.totals[SLUG],
        'shipped live pool must read below a permanently-capped 20-stack model'
      ).toBeLessThan(hot20.totals[SLUG]);
    });
  });

  describe('M3 — Burst Dragging Chain: the FULL 1001%/s for 10s, with Ensnaring cancelled', () => {
    const ticks = mbcDmg(base.events, 'burst', 1001);
    const bursts = mbcBursts(base.events);

    // Dragging Chain mirrors the 20 Ensnaring stacks (20 × 50.05 = 1001%/s) and CANCELS Ensnaring.
    // With a live pool the cancel is structural — the baseline reads the now-zero pool and stops
    // contributing on its own — so the burst ships its true kit magnitude. The superseded model
    // shipped 700 (= 1001 − 301) purely to subtract a static baseline it could not switch off.
    it('is the full kit magnitude 1001%/s, not the superseded 700 delta', () => {
      expect([...new Set(ticks.map((d) => d.atkPct))]).toEqual([1001]);
      expect(ticks.length, 'no Dragging Chain tick landed').toBeGreaterThan(0);
    });

    it('runs ~10s per burst (one tick per second across the mirror window)', () => {
      // Only bursts whose full 10s window fits inside the fight are measurable.
      const fullWindow = bursts.filter(
        (c) => c.frame + 10 * FPS <= FIGHT_SEC * FPS
      );
      expect(
        fullWindow.length,
        'no burst has a full 10s window to measure'
      ).toBeGreaterThan(0);
      for (const c of fullWindow) {
        const inWindow = ticks.filter(
          (t) => t.frame > c.frame && t.frame <= c.frame + 10 * FPS
        );
        expect(
          inWindow.length,
          `burst at ${c.sec.toFixed(1)}s produced ${inWindow.length} tick(s)`
        ).toBeGreaterThanOrEqual(8);
      }
    });

    it('DISCRIMINATING: without the cancel, Ensnaring keeps ticking under the mirror and double-counts', () => {
      // Same 1001%/s burst, but the resource block that zeroes Ensnaring is removed. The pool stays
      // at its cap through the window, so the baseline pays out on top of the mirror — exactly the
      // over-count the kit's "burst cancels Ensnaring" clause prevents.
      const stillTicking = mbcDmg(naiveBurst.events, 'skill1')
        .filter((d) => d.atkPct !== 500.6)
        .filter((d) => {
          const c = mbcBursts(naiveBurst.events)[0];
          return d.frame > c.frame && d.frame <= c.frame + 10 * FPS;
        });
      // Not pinned at the 20-stack cap: whether she has capped by her FIRST burst is a property of
      // this fixture's rotation, not of the kit. The claim under test is that the baseline keeps
      // paying out AT ALL underneath the mirror, which is what the cancel exists to stop.
      expect(
        stillTicking.some((d) => d.atkPct > 0),
        'without the cancel the live baseline should keep ticking through the mirror window'
      ).toBe(true);
      expect(
        base.totals[SLUG],
        'the shipped cancel must read below the uncancelled double-count'
      ).toBeLessThan(naiveBurst.totals[SLUG]);
    });
  });

  describe('M4 — S2 stage-3 Sustained Damage buff: +59.98% for 10s, live on her DoTs', () => {
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === MBC && b.stat === 'sustainedDamagePct'
    );

    it('is the L10 value 59.98% for exactly 10 sec, once per burst', () => {
      expect(
        applied.length,
        'no stage-3 sustainedDamagePct buff applied'
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([59.98]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame, '10s duration').toBe(10 * FPS);
      }
      // ENTRY, not cast (owner ruling 2026-08-13): stage 3 is entered when the stage-2 unit casts,
      // ~30f ahead of her own B3 — so the buff is live for her own burst, and entries outnumber her
      // casts because a chain that reaches stage 3 and expires still entered it.
      const entries = base.events
        .filter((e) => e.kind === 'burstCast' && e.stage === 2)
        .map((e) => e.frame);
      expect(
        applied.map((b) => b.frame),
        'fires on every stage-3 entry'
      ).toEqual(entries);
      expect(applied.length).toBeGreaterThanOrEqual(
        mbcBursts(base.events).length
      );
    });

    it('DISCRIMINATING: removing the buff lowers her total (the sustained DoTs inherit it)', () => {
      expect(base.totals[SLUG]).toBeGreaterThan(noS2Buff.totals[SLUG]);
    });
  });

  describe('M5 — inert S2 triggers stay documented verbatim (not silently dropped)', () => {
    it('unmodeled.skill2 carries the incapacitated +20 and enemy-neutralized +1 lines', () => {
      const ov = withPatchedOverride(SLUG, () => {});
      const unmodeled = (ov as any).unmodeled?.skill2 ?? [];
      expect(unmodeled).toContain(
        'Activates when the skill user is incapacitated. Affects targets in the Ensnaring Chains state.'
      );
      expect(unmodeled).toContain('Ensnaring Chains stacks ▲ 20.');
      expect(unmodeled).toContain(
        'Activates when an enemy is neutralized while in the Ensnaring Chains state. Affects self.'
      );
      expect(unmodeled).toContain('Restraint Chain ▲ 1, up to 10.');
    });
  });
});
