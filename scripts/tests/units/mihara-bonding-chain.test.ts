// PER-UNIT KIT SPEC — `mihara-bonding-chain` (Mihara: Bonding Chain, Attacker/MG/Fire, Burst III,
// cd 40s, ammo 300). Kit-autonomy gauntlet 2026-07-26; test-first re-derivation (S2a).
//
// One assertion group per kit LINE cluster (M1..M5 below), asserted against the SHIPPED override
// loaded from disk. `withPatchedOverride` appears ONLY to build COUNTERFACTUALS (the nearest wrong
// model each assertion must discriminate against) — never to supply the encoding under test.
//
// Her kit is a two-currency STACK engine that the override models as steady-state THROUGHPUT (the
// shipped `note` is the source of truth for the decomposition):
//   - Restraint Chains: charged to 10 at battle start and refilled to 10 at each Full Burst end
//     after her own burst, then the S1 "specific timing" attack DUMPS all of them (one 50.06% hit
//     per chain) → modeled as a 500.6% (10 × 50.06%) flatDamage dump at start + once per rotation.
//   - Ensnaring Chains: 25.08%/s sustained DoT stacking to 20; her burst CANCELS it to 0 and it
//     rebuilds (+10 from the next Restraint dump, +1 per 40 normals in FB) to the cap just before
//     her next burst → time-weighted rebuild average ≈ 12 stacks = 301%/s permanent baseline.
//   - Burst Dragging Chain: mirrors the 20 Ensnaring stacks (20 × 50.05% = 1001%/s) for 10s, then
//     CANCELS Ensnaring. Because the burst REPLACES the baseline rather than stacking with it, the
//     override emits the DELTA 700%/s (1001 − 301) for 10s — so the burst window totals the correct
//     1001%/s with NO double-count. The naive "1001 on top of 301" over-counts (the ⚑ in the note).
//
// Kit (blablalink prose, data/characters.json → characters['mihara-bonding-chain'].skills):
//   S1 ■ battle start → self: charge Restraint Chains by 10 (cap 10)                          [M1]
//      ■ Full Burst ends if she just burst → self: charge Restraint Chains by 10 (cap 10)      [M1]
//      ■ random enemy @ specific timing: 50.06% final ATK × every Restraint Chain, ▼1 each     [M1]
//      ■ same enemies: Ensnaring Chains 25.08% final ATK sustained /1s, stack ≤20, unremovable [M2]
//   S2 ■ 40 normals in FB on an Ensnared target → target: Ensnaring stacks ▲1   (FOLDED into M2 avg)
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
//   M2  the baseline is the calibrated 12-stack rebuild average 301%/s, NOT the old permanent-20
//       reading 501.6%/s (which read 1.19–1.51 hot vs the real T3 sample) and NOT a single 25.08%
//       stack (the raw parser miss). It is permanent (ticks the whole fight), not burst-gated.
//   M3  THE decomposition: the burst DoT is the 700%/s DELTA, not the naive 1001%/s stacked on top
//       of the baseline. Shipped total must sit BELOW the naive double-count counterfactual.
//   M4  the stage-3 buff is the L10 value 59.98% for exactly 10s, fires once per burst, and is
//       LIVE (removing it lowers her total — the sustained DoTs inherit it via the Damage-Up bucket).
//   M5  the two inert S2 triggers stay documented VERBATIM in `unmodeled` (guarded, not silently
//       dropped). No behavioural assertion — boss deals no damage and never dies in v1.
//
// Fixture: control core (liter B1 / crown B2) + mihara-bonding-chain as the SOLE B3 carry, boss
// Fire, focus mbc — helm omitted so Full Burst end coincides with her own burst (faithful to the
// S1 gate). Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { CONTROL_CORE, controlComp, runComp, totals, withPatchedOverride } from '../lib/harness.js';

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
    ...controlComp(SLUG, false),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactuals (nearest wrong model per line) ------------------------------------------
/** M1: a single Restraint chain dumped (50.06%) instead of the full 10-chain 500.6%. */
const mbcSingleChain = withPatchedOverride(SLUG, (ov) => {
  const dumps = ov.skill1.filter((b: any) => b.effects.some((e: any) => e.kind === 'flatDamage'));
  if (dumps.length !== 2) throw new Error('mbc S1 expected 2 flatDamage dumps — fixture is stale');
  for (const b of dumps) for (const e of b.effects) if (e.kind === 'flatDamage') e.atkPct = 50.06;
});
/** M2: the OLD permanent-20-stack baseline (501.6%/s) that read 1.19–1.51 hot. */
const mbcHot20Stack = withPatchedOverride(SLUG, (ov) => {
  const dot = ov.skill1.flatMap((b: any) => b.effects).find((e: any) => e.kind === 'dot');
  if (!dot) throw new Error('mbc S1 baseline dot missing — fixture is stale');
  dot.atkPct = 501.6;
});
/** M3: the NAIVE double-count — burst Dragging Chain at the full 1001%/s on top of the baseline. */
const mbcNaiveBurst = withPatchedOverride(SLUG, (ov) => {
  const dot = ov.burst.flatMap((b: any) => b.effects).find((e: any) => e.kind === 'dot');
  if (!dot) throw new Error('mbc burst dot missing — fixture is stale');
  dot.atkPct = 1001;
});
/** M4: the stage-3 sustained-damage buff removed entirely (proves it is live). */
const mbcNoS2Buff = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !b.effects.some((e: any) => e.stat === 'sustainedDamagePct'));
  if (ov.skill2.length === before) throw new Error('mbc S2 sustainedDamagePct block missing — fixture is stale');
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const singleChain = run({ [SLUG]: mbcSingleChain });
const hot20 = run({ [SLUG]: mbcHot20Stack });
const naiveBurst = run({ [SLUG]: mbcNaiveBurst });
const noS2Buff = run({ [SLUG]: mbcNoS2Buff });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) => evs.filter((e): e is Damage => e.kind === 'damage');
const mbcDmg = (evs: SimEvent[], slot: Damage['srcSlot'], atkPct?: number) =>
  dmg(evs).filter((d) => d.slug === SLUG && d.srcSlot === slot && (atkPct == null || d.atkPct === atkPct));
const mbcBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === SLUG);
const fbEnds = (evs: SimEvent[]) => evs.filter((e) => e.kind === 'fullBurstEnd');
const buffs = (evs: SimEvent[]) => evs.filter((e): e is BuffApply => e.kind === 'buffApply');

describe('mihara-bonding-chain — kit spec', () => {
  it('fixture sanity: mbc is the sole B3 and actually casts bursts', () => {
    expect(MBC).toBe(2);
    expect(mbcBursts(base.events).length, 'mbc never burst — fixture cannot exercise her kit').toBeGreaterThan(0);
  });

  describe('M1 — S1 Restraint dump: full 10-chain 500.6%, at start + once per her Full Burst end', () => {
    const dumps = mbcDmg(base.events, 'skill1', 500.6);

    it('is the full 500.6% (10 × 50.06%), not a single 50.06% chain', () => {
      expect([...new Set(dumps.map((d) => d.atkPct))]).toEqual([500.6]);
      expect(dumps.length, 'no Restraint dump landed').toBeGreaterThan(0);
    });

    it('fires exactly once at battle start and once per Full Burst end (sole-B3 gate is exact)', () => {
      const startDumps = dumps.filter((d) => d.sec < 2);
      expect(startDumps.length, 'battle-start passive dump').toBe(1);
      // Sole B3 → every Full Burst end is hers, so dumps == 1 (start) + #FB-ends.
      expect(dumps.length).toBe(1 + fbEnds(base.events).length);
    });

    it('DISCRIMINATING: a single-chain model lands 50.06% and deals less', () => {
      expect([...new Set(mbcDmg(singleChain.events, 'skill1', 50.06).map((d) => d.atkPct))]).toEqual([50.06]);
      expect(base.totals[SLUG]).toBeGreaterThan(singleChain.totals[SLUG]);
    });
  });

  describe('M2 — S1 Ensnaring baseline: calibrated 12-stack rebuild average, 301%/s permanent', () => {
    const ticks = mbcDmg(base.events, 'skill1', 301);

    it('is 301%/s (12 × 25.08), not the hot 501.6%/s 20-stack nor a single 25.08% stack', () => {
      expect([...new Set(ticks.map((d) => d.atkPct))]).toEqual([301]);
    });

    it('is permanent (ticks the whole fight), not burst-gated', () => {
      expect(ticks.length, 'a permanent 1/s DoT should tick ~180× over the fight').toBeGreaterThanOrEqual(170);
      expect(ticks.length, 'permanent baseline must vastly out-number the burst dumps').toBeGreaterThan(
        mbcDmg(base.events, 'skill1', 500.6).length * 5,
      );
      expect(ticks[0].sec, 'first tick should land early').toBeLessThan(3);
      expect(ticks[ticks.length - 1].sec, 'last tick should reach the end of the fight').toBeGreaterThan(FIGHT_SEC - 5);
    });

    it('DISCRIMINATING: the old 20-stack baseline (501.6%/s) over-counts vs shipped', () => {
      expect([...new Set(mbcDmg(hot20.events, 'skill1', 501.6).map((d) => d.atkPct))]).toEqual([501.6]);
      expect(base.totals[SLUG], 'shipped 12-stack avg must read below the hot 20-stack model').toBeLessThan(
        hot20.totals[SLUG],
      );
    });
  });

  describe('M3 — Burst Dragging Chain: the 700%/s DELTA for 10s (decomposed, no double-count)', () => {
    const ticks = mbcDmg(base.events, 'burst', 700);
    const bursts = mbcBursts(base.events);

    it('is the 700%/s delta (1001 − 301), not the naive full 1001%/s', () => {
      expect([...new Set(ticks.map((d) => d.atkPct))]).toEqual([700]);
      expect(ticks.length, 'no Dragging Chain tick landed').toBeGreaterThan(0);
    });

    it('runs ~10s per burst (one tick per second across the mirror window)', () => {
      // Only bursts whose full 10s window fits inside the fight are measurable.
      const fullWindow = bursts.filter((c) => c.frame + 10 * FPS <= FIGHT_SEC * FPS);
      expect(fullWindow.length, 'no burst has a full 10s window to measure').toBeGreaterThan(0);
      for (const c of fullWindow) {
        const inWindow = ticks.filter((t) => t.frame > c.frame && t.frame <= c.frame + 10 * FPS);
        expect(inWindow.length, `burst at ${c.sec.toFixed(1)}s produced ${inWindow.length} tick(s)`).toBeGreaterThanOrEqual(8);
      }
    });

    it('DISCRIMINATING: the naive 1001%/s-on-top double-count over-counts vs shipped', () => {
      expect([...new Set(mbcDmg(naiveBurst.events, 'burst', 1001).map((d) => d.atkPct))]).toEqual([1001]);
      expect(base.totals[SLUG], 'decomposed 700 delta must read below the naive double-count').toBeLessThan(
        naiveBurst.totals[SLUG],
      );
    });
  });

  describe('M4 — S2 stage-3 Sustained Damage buff: +59.98% for 10s, live on her DoTs', () => {
    const applied = buffs(base.events).filter((b) => b.casterIdx === MBC && b.stat === 'sustainedDamagePct');

    it('is the L10 value 59.98% for exactly 10 sec, once per burst', () => {
      expect(applied.length, 'no stage-3 sustainedDamagePct buff applied').toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([59.98]);
      for (const b of applied) expect(b.expiresFrame! - b.frame, '10s duration').toBe(10 * FPS);
      expect(applied.length, 'fires once per Burst Stage 3 entry').toBe(mbcBursts(base.events).length);
    });

    it('DISCRIMINATING: removing the buff lowers her total (the sustained DoTs inherit it)', () => {
      expect(base.totals[SLUG]).toBeGreaterThan(noS2Buff.totals[SLUG]);
    });
  });

  describe('M5 — inert S2 triggers stay documented verbatim (not silently dropped)', () => {
    it('unmodeled.skill2 carries the incapacitated +20 and enemy-neutralized +1 lines', () => {
      const ov = withPatchedOverride(SLUG, () => {});
      const unmodeled = (ov as any).unmodeled?.skill2 ?? [];
      expect(unmodeled).toContain('Activates when the skill user is incapacitated. Affects targets in the Ensnaring Chains state.');
      expect(unmodeled).toContain('Ensnaring Chains stacks ▲ 20.');
      expect(unmodeled).toContain('Activates when an enemy is neutralized while in the Ensnaring Chains state. Affects self.');
      expect(unmodeled).toContain('Restraint Chain ▲ 1, up to 10.');
    });
  });
});
