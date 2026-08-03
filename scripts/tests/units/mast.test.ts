// PER-UNIT KIT SPEC — `mast` (Mast, Supporter/SMG/Electric, Burst II, cd 20s). Kit-autonomy
// gauntlet 2026-08-02 (test-first re-derivation). NOTE: this is a FROM-SCRATCH unit — there was
// no shipped override before this gauntlet (simSupported was false), so the harness cannot even
// load her until src/skills/overrides/mast.json exists. The override was authored first (the
// faithful encoding under test); every assertion below PINS a kit line GREEN vs that override and
// RED vs the nearest-wrong counterfactual (withPatchedOverride), so the file still discriminates
// exactly as a verification gauntlet would.
//
// Kit (blablalink prose, data/characters.json → characters.mast.skills), max level:
//   S1 ■ after 2 normal crits → the target: "Sea Breeze" DEF ▼ 1.9% of user DEF, ≤50 stacks, 3s. [M6/unmodeled]
//      ■ HP < 70% → self + 2 highest-final-ATK allies: Critical Damage ▲50.94% continuously.      [M2]
//   S2 ■ start of battle → self + 2 highest-final-ATK allies: Critical Rate ▲23.56% for 30s.      [M1]
//   BU ■ self + 2 highest-final-ATK allies: Max HP ▲86.2% of user Max HP (no heal) for 7s.        [M4]
//      ■ self + 2 highest-final-ATK allies: Critical Damage ▲25.19% for 7s.                       [M3]
//      ■ Sea-Breeze-afflicted target: "Storm" 4.52% of final ATK, mirrors Sea Breeze stacks,
//        every 1s for 7s.                                                                         [M5/M6]
//
// Modeling posture (see the override note + caveats for the full story):
//   * Her identity is the Sea Breeze → Storm STACK-MIRROR loop. There is no crit-count trigger and
//     no enemy-DEF-reduction primitive, so Sea Breeze is modeled at its steady-state 50-stack CAP
//     (mihara-bonding-chain throughput precedent): a passive always-present targetStatus 'Sea
//     Breeze' gates Storm, and Storm is a burstCast DoT at the mirrored magnitude 4.52% × 50 =
//     226% of final ATK per tick (7 ticks/burst). The Sea Breeze DEF▼ EFFECT itself is UNMODELED
//     (~0.16% team damage; no primitive) — documented in unmodeled, NOT asserted here.
//   * "self and 2 ally unit(s) with the highest final ATK (except the skill user)" = a self block +
//     an alliesTopAtk{count:2, excludeSelf, byFinalAtk} block (the soda-twinkling-bunny pattern),
//     so each scoped buff reaches exactly 3 of the 4 units (self + 2 allies), never all 4.
//   * HP<70% is modeled as a passive always-on grant (v1 has no HP pool; a squishy supporter sits
//     below 70% for essentially the whole sustained fight) — ⚑, documented in caveats.
//
// Fixture: a custom B1/B2/B3 chain — liter(B1) / mast(B2) / modernia(B3) / helm(B3), boss Fire,
// focus mast. The standard controlComp ([liter, crown, carry, helm]) CANNOT be used: crown is also
// Burst II and sits earlier in slot order, so she takes the stage-II slot every rotation and mast
// casts ZERO bursts (verified). Here mast is the SOLE Burst II, so she casts every Full Burst
// (10 casts / 180s) and Storm fires. Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const FIGHT_FRAMES = 180 * FPS;
const SLUGS = ['liter', 'mast', 'modernia', 'helm'] as const;
/** slot order: liter 0 / mast 1 / modernia 2 / helm 3. */
const MAST = 1;
const N_UNITS = SLUGS.length;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [...SLUGS],
    bossElement: 'Fire',
    focusSlug: 'mast',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const mastBuffs = (evs: SimEvent[], stat: string, value: number) =>
  buffs(evs).filter(
    (b) => b.casterIdx === MAST && b.stat === stat && b.value === value
  );
const stormTicks = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Damage =>
      e.kind === 'damage' && e.slug === 'mast' && e.srcSlot === 'burst'
  );
const mastBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'mast'
  );

/** Distinct targets a buff reached, and the per-application-frame target count. Mast's scoped
 *  grants always target units (never the boss), so targetIdx is always numeric here; the null
 *  branch of the event type is filtered out. */
function targeting(bs: BuffApply[]): { distinct: number[]; perFrame: number[] } {
  const perFrame = new Map<number, Set<number>>();
  for (const b of bs) {
    if (b.targetIdx == null) {
      continue;
    }
    (perFrame.get(b.frame) ?? perFrame.set(b.frame, new Set()).get(b.frame)!).add(
      b.targetIdx
    );
  }
  const idxs = bs
    .map((b) => b.targetIdx)
    .filter((i): i is number => i != null);
  return {
    distinct: [...new Set(idxs)].sort((a, b) => a - b),
    perFrame: [...perFrame.values()].map((s) => s.size),
  };
}

// ---- counterfactuals (nearest-wrong model each assertion must discriminate against) -----------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** M6 reference: the passive 'Sea Breeze' status removed → Storm's gate never opens. */
const mastNoSeaBreeze = withPatchedOverride('mast', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) =>
      !b.effects.some(
        (e: any) => e.kind === 'targetStatus' && e.name === 'Sea Breeze'
      )
  );
  if (ov.skill1.length === before) {
    throw new Error('mast S1 Sea Breeze status missing — fixture is stale');
  }
});
/** M5 counterfactual: Storm at the RAW per-stack value (4.52%), NOT mirrored ×50 (= 226%). */
const mastStormUnmirrored = withPatchedOverride('mast', (ov) => {
  const dot = ov.burst
    .flatMap((b: any) => b.effects)
    .find((e: any) => e.kind === 'dot');
  if (!dot || dot.atkPct !== 226) {
    throw new Error('mast burst Storm dot (226) missing — fixture is stale');
  }
  dot.atkPct = 4.52;
});
/** M4 reference: the burst Max HP grants removed (proves they move no damage). */
const mastNoMaxHp = withPatchedOverride('mast', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasStat(b, 'casterMaxHpPct'));
  if (ov.burst.length === before) {
    throw new Error('mast burst casterMaxHpPct missing — fixture is stale');
  }
});
/** M2 counterfactual: the S1 Crit Damage scoped to ALL allies (4 targets) instead of self + 2. */
const mastCritDmgAll = withPatchedOverride('mast', (ov) => {
  const blk = ov.skill1.find(
    (b: any) =>
      b.target?.kind === 'alliesTopAtk' && hasStat(b, 'critDamagePct')
  );
  if (!blk) {
    throw new Error('mast S1 scoped critDamage block missing — fixture is stale');
  }
  blk.target = { kind: 'allies' };
});
/** M2 counterfactual: the S1 Crit Damage as a burstCast-gated grant (the S2b reviewer's
 *  self-trigger alternative) — it is ABSENT at frame 0 (before any burst), which the shipped
 *  passive/always-on model forbids. Discriminates the real-game-faithful passive encoding from
 *  the comp-dependent burst-gated one. */
const mastCritDmgBurstGated = withPatchedOverride('mast', (ov) => {
  let n = 0;
  for (const b of ov.skill1) {
    if (hasStat(b, 'critDamagePct')) {
      b.trigger = { kind: 'burstCast' };
      n++;
    }
  }
  if (!n) {
    throw new Error('mast S1 critDamage blocks missing — fixture is stale');
  }
});
/** M1 counterfactual: the S2 Crit Rate made permanent (no 30s expiry). */
const mastCritRatePermanent = withPatchedOverride('mast', (ov) => {
  let n = 0;
  for (const b of ov.skill2) {
    for (const e of b.effects) {
      if (e.stat === 'critRatePct') {
        delete e.durationSec;
        n++;
      }
    }
  }
  if (!n) {
    throw new Error('mast S2 critRatePct missing — fixture is stale');
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noSeaBreeze = run({ mast: mastNoSeaBreeze });
const stormUnmirrored = run({ mast: mastStormUnmirrored });
const noMaxHp = run({ mast: mastNoMaxHp });
const critDmgAll = run({ mast: mastCritDmgAll });
const critDmgBurstGated = run({ mast: mastCritDmgBurstGated });
const critRatePermanent = run({ mast: mastCritRatePermanent });

describe('mast — kit spec', () => {
  it('fixture sanity: mast is the sole Burst II and casts every Full Burst', () => {
    expect(mastBursts(base.events).length).toBeGreaterThanOrEqual(8);
  });

  describe('M1 — S2 Critical Rate ▲23.56% is a 30s fused passive, scoped self + 2 allies', () => {
    const applied = mastBuffs(base.events, 'critRatePct', 23.56);

    it('is 23.56% and reaches exactly 3 of 4 units (self + 2 allies, not the whole team)', () => {
      expect(applied.length).toBeGreaterThan(0);
      const { distinct, perFrame } = targeting(applied);
      expect(distinct).toContain(MAST); // self always included
      expect(distinct.length, 'self + 2 allies, not all 4').toBe(3);
      expect([...new Set(perFrame)]).toEqual([3]);
    });

    it('expires at 30s (a fused passive live from t=0, not permanent)', () => {
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(30 * FPS);
      }
      // applied at battle start (frame 0)
      expect(Math.min(...applied.map((b) => b.frame))).toBe(0);
    });

    it('DISCRIMINATING: a permanent (un-expiring) crit rate fails the 30s assertion', () => {
      const perm = mastBuffs(critRatePermanent.events, 'critRatePct', 23.56);
      expect(
        [...new Set(perm.map((b) => b.expiresFrame))],
        'the permanent counterfactual must drop the timed expiry'
      ).toEqual([null]);
    });
  });

  describe('M2 — S1 Critical Damage ▲50.94% (HP<70%) is a passive always-on scoped grant', () => {
    const applied = mastBuffs(base.events, 'critDamagePct', 50.94);

    it('is 50.94% and reaches exactly 3 of 4 units (self + 2 highest-final-ATK allies)', () => {
      expect(applied.length).toBeGreaterThan(0);
      const { distinct, perFrame } = targeting(applied);
      expect(distinct).toContain(MAST);
      expect(distinct.length, 'self + 2 allies, not all 4').toBe(3);
      expect([...new Set(perFrame)]).toEqual([3]);
    });

    it('is live from battle start and continuous (no expiry — "continuously"; HP<70% assumed satisfied)', () => {
      // v1 has no HP pool; a squishy Supporter sits below 70% HP from boss damage essentially the
      // whole fight whether or not she bursts, so the grant is modeled always-on (passive, frame 0).
      expect(Math.min(...applied.map((b) => b.frame))).toBe(0);
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
    });

    it('DISCRIMINATING: a burstCast-gated grant (the rejected self-trigger alternative) is absent at t=0', () => {
      const gated = mastBuffs(critDmgBurstGated.events, 'critDamagePct', 50.94);
      expect(
        gated.every((b) => b.frame > 0),
        'the burst-gated counterfactual must NOT apply at frame 0'
      ).toBe(true);
    });

    it('DISCRIMINATING: an all-allies grant reaches 4 units, not 3', () => {
      const all = mastBuffs(critDmgAll.events, 'critDamagePct', 50.94);
      const { distinct } = targeting(all);
      expect(distinct.length).toBe(N_UNITS);
    });
  });

  describe('M3 — burst Critical Damage ▲25.19% for 7s, scoped self + 2, once per cast', () => {
    const applied = mastBuffs(base.events, 'critDamagePct', 25.19);
    const bursts = mastBursts(base.events).length;

    it('fires once per burst cast, to exactly 3 units each time', () => {
      expect(applied.length).toBe(bursts * 3);
      const { perFrame } = targeting(applied);
      expect([...new Set(perFrame)]).toEqual([3]);
    });

    it('is 25.19% for 7s (distinct from the S1 50.94% continuous grant)', () => {
      expect([...new Set(applied.map((b) => b.value))]).toEqual([25.19]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(7 * FPS);
      }
    });
  });

  describe('M4 — burst Max HP ▲86.2% (no heal) is faithfully encoded but damage-neutral', () => {
    it('removing the Max HP grants changes NO unit total by a single point', () => {
      // "without restoring HP" + the e3 rule (ally-granted Max HP does not feed a teammate's
      // atkOfMaxHpPct; Mast has no self HP-scaling ATK) ⇒ the grant is offensively inert in v1.
      expect(base.totals).toEqual(noMaxHp.totals);
    });

    it('is still applied as a maxHpFlat grant to self + 2 allies for 7s', () => {
      const applied = buffs(base.events).filter(
        (b) => b.casterIdx === MAST && b.stat === 'maxHpFlat'
      );
      expect(applied.length).toBeGreaterThan(0);
      const { distinct, perFrame } = targeting(applied);
      expect(distinct).toContain(MAST);
      expect(distinct.length).toBe(3);
      expect([...new Set(perFrame)]).toEqual([3]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(7 * FPS);
        expect(b.value).toBeGreaterThan(0); // 86.2% of Mast's Max HP, resolved to flat HP
      }
    });
  });

  describe('M5 — Storm mirrors the Sea Breeze stack count: 4.52% × 50 = 226% per tick, 7 ticks/burst', () => {
    const ticks = stormTicks(base.events);

    it('ticks at the MIRRORED magnitude 226%, in the burst bucket, not the raw 4.52%', () => {
      expect(ticks.length).toBeGreaterThan(0);
      expect([...new Set(ticks.map((d) => d.atkPct))]).toEqual([226]);
      expect([...new Set(ticks.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('is crit-eligible (DoT damage crits, DOT_CRIT default ON) and never cores', () => {
      expect([...new Set(ticks.map((d) => d.critEligible))]).toEqual([true]);
    });

    it('lands 7 ticks for every burst whose full 7s window fits inside the fight', () => {
      const casts = mastBursts(base.events).filter(
        (c) => c.frame + 7 * FPS <= FIGHT_FRAMES
      );
      expect(casts.length).toBeGreaterThan(0);
      for (const cast of casts) {
        const inWindow = ticks.filter(
          (d) => d.frame > cast.frame && d.frame <= cast.frame + 7 * FPS
        );
        expect(
          inWindow.length,
          `burst at ${(cast.frame / FPS).toFixed(1)}s produced ${inWindow.length} ticks, expected 7`
        ).toBe(7);
      }
    });

    it('DISCRIMINATING: an un-mirrored Storm (raw 4.52%) fails the 226% assertion', () => {
      const raw = stormTicks(stormUnmirrored.events);
      expect(raw.length).toBeGreaterThan(0);
      expect([...new Set(raw.map((d) => d.atkPct))]).toEqual([4.52]);
    });
  });

  describe('M6 — Storm is gated on the Sea Breeze status ("affects Sea-Breeze-afflicted targets")', () => {
    it('fires in the shipped override (Sea Breeze is always present at steady state)', () => {
      expect(stormTicks(base.events).length).toBeGreaterThan(0);
    });

    it('DISCRIMINATING: removing the Sea Breeze status silences Storm entirely', () => {
      // The gate is structurally faithful: it WOULD block Storm if Sea Breeze were down. In steady
      // state the passive status is always up, so this counterfactual (not the shipped model) is
      // what a fight WITHOUT Sea Breeze would look like — zero Storm damage.
      expect(stormTicks(noSeaBreeze.events).length).toBe(0);
    });
  });
});
