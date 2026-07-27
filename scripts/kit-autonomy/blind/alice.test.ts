// S5 BLIND TEST (cross-family, claude-opus-4-8) — `alice`, materialized to the live harness.
//
// Provenance: the blind writer's raw JSON output is cross-family/alice/s5-result.json (written
// from kit prose ALONE, blind to the driver's test/override/reasoning). This file is the driver's
// MECHANICAL adaptation of that output so it runs against the real harness API and the committed
// (driver) override — assertion INTENT is preserved verbatim; only the API calls and the
// blind-side stat-key GUESSES are corrected, each correction noted inline and adjudicated by S7.
//
// Blind-side corrections (all forced by the de-contaminated/redacted schema the blind writer saw):
//   * charge-damage key: blind asserted `chargeDamageMultPct` ≈ 7. The live engine has TWO charge
//     stats — chargeDamagePct = "additive percentage points in the charge bucket" (types.ts:23,
//     sim.ts:1385) and chargeDamageMultPct = "scales by BASE charge damage" (types.ts:24, Helm
//     treasure). "Charge Damage ▲7%" is the additive bucket → chargeDamagePct. Corrected here.
//   * harness API: the blind writer hallucinated a 3-arg thunk `withPatchedOverride(slug,mutate,run)`
//     and a `.t` event field; the real API is 2-arg (returns a clone) + `.frame`. Corrected here.
//   * "a buffRemove is emitted for the 10s charge-damage buff": the engine emits NO buffRemove for
//     time/round expiry (types.ts: "buffRemove fires only for a genuine REMOVAL (today:
//     removeOnReload)"). That blind assertion is unsatisfiable by design and is dropped here.
//   * "EXACTLY 2 distinct allies" (union over the whole fight): the kit says "2 allies with the
//     highest FINAL ATK" PER APPLICATION, and final ATK is re-ranked at apply time (the S2b fable
//     reviewer flagged this: alice's own +55.12% burst ATK changes whether she ranks top-2), so the
//     top-2 set ROTATES across the 11 FB entries (union {liter, alice, helm} = 3) while each firing
//     hits exactly 2. The faithful formalization of "affects 2 ally units" is per-firing count === 2,
//     not fight-wide union === 2. Corrected here (matches the driver spec).
//   * charge-speed lines: the blind writer saw no charge-speed StatKey (it was redacted as an answer
//     token) and disposed them GAP/it.skip. The driver models them on the LIVE chargeSpeedPct
//     (sim.ts:2557 shortens charge time → load-bearing). The skips are kept as the blind's honest
//     disposition; S7 notes the driver is strictly more complete here, not divergent.
//
// Run vs the committed driver override: `npx vitest run scripts/kit-autonomy/blind/alice.test.ts`.
import { beforeAll, describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;

function collect(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('alice'),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { res, events, totals: totals(res) };
}

const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');

/** alice's slot, derived blind-style from her self ATK ▲55.12% burst buff (caster === target). */
function aliceIdx(evs: SimEvent[]): number {
  const self = buffs(evs).find(
    (b) =>
      b.stat === 'atkPct' &&
      Math.abs(b.value - 55.12) < 1 &&
      b.casterIdx === b.targetIdx
  );
  if (self == null || self.casterIdx == null) {
    throw new Error('alice self ATK 55.12 buff not found');
  }
  return self.casterIdx;
}

// ---- runs (hoisted: each a full 180s sim) -----------------------------------------------------
let base: ReturnType<typeof collect>;
let noBurstAtk: ReturnType<typeof collect>;

beforeAll(() => {
  base = collect();
  const patched = withPatchedOverride('alice', (ov: any) => {
    const before = ov.burst[0].effects.length;
    ov.burst[0].effects = ov.burst[0].effects.filter(
      (e: any) =>
        !(
          e.kind === 'buff' &&
          e.stat === 'atkPct' &&
          Math.abs(e.value - 55.12) < 1
        )
    );
    if (ov.burst[0].effects.length === before) {
      throw new Error('burst atkPct 55.12 missing — stale');
    }
  });
  noBurstAtk = collect({ alice: patched });
});

describe('alice (S5 blind) — fixture non-vacuity', () => {
  it('the team actually enters Full Burst (a lone B3 makes zero)', () => {
    expect(
      base.events.filter((e) => e.kind === 'fullBurstStart').length
    ).toBeGreaterThan(0);
  });
  it('alice deals nonzero damage', () => {
    expect(unitOf(base.res, 'alice').totalDamage).toBeGreaterThan(0);
  });
});

describe('alice (S5 blind) — burst ATK ▲55.12% self /10s', () => {
  it('is applied to alice herself (self-scoped), never to a teammate', () => {
    const idx = aliceIdx(base.events);
    const applies = buffs(base.events).filter(
      (b) => b.stat === 'atkPct' && Math.abs(b.value - 55.12) < 1
    );
    expect(applies.length).toBeGreaterThan(0);
    for (const a of applies) {
      expect(a.targetIdx).toBe(idx);
    }
  });

  it('raises alice damage vs the nearest-wrong inert model; teammates byte-identical', () => {
    expect(base.totals.alice).toBeGreaterThan(noBurstAtk.totals.alice);
    for (const slug of ['liter', 'crown', 'helm']) {
      expect(noBurstAtk.totals[slug]).toBe(base.totals[slug]);
    }
    const cf = buffs(noBurstAtk.events).filter(
      (b) => b.stat === 'atkPct' && Math.abs(b.value - 55.12) < 1
    );
    expect(cf.length).toBe(0);
  });
});

describe('alice (S5 blind) — skill1 Charge Damage ▲7% to 2 highest-ATK allies on FB enter', () => {
  it('applies to EXACTLY 2 allies per firing (highest final ATK), cast by alice', () => {
    const idx = aliceIdx(base.events);
    const applies = buffs(base.events).filter(
      (b) =>
        b.stat === 'chargeDamagePct' &&
        b.casterIdx === idx &&
        Math.abs(b.value - 7) < 1
    );
    expect(applies.length).toBeGreaterThan(0);
    // per-firing count === 2 (the top-2 rotates across firings as final ATK is re-ranked).
    const perFrame = new Map<number, Set<number | null>>();
    for (const b of applies) {
      (
        perFrame.get(b.frame) ?? perFrame.set(b.frame, new Set()).get(b.frame)!
      ).add(b.targetIdx);
    }
    for (const [, holders] of perFrame) {
      expect(holders.size).toBe(2);
    }
  });

  it('fires at Full Burst enter, never before the first Full Burst window opens', () => {
    const idx = aliceIdx(base.events);
    const firstFb = base.events.find((e) => e.kind === 'fullBurstStart')!;
    const early = buffs(base.events).filter(
      (b) =>
        b.stat === 'chargeDamagePct' &&
        b.casterIdx === idx &&
        Math.abs(b.value - 7) < 1 &&
        b.frame < firstFb.frame
    );
    expect(early.length).toBe(0);
  });
});

describe('alice (S5 blind) — GAP / inert-in-v1 lines (blind disposition, documented)', () => {
  it.skip('skill1 Charge Speed ▲11.67% — blind saw no charge-speed StatKey (redacted); driver models it on live chargeSpeedPct (sim.ts:2557)', () => {});
  it.skip('burst Charge Speed ▲80.15% — same; driver models on chargeSpeedPct (load-bearing charge-time shortening)', () => {});
  it.skip('skill2 >80%HP continuous Pierce — inert in v1 (partless boss, gate always true); driver models the tag via hasPierce', () => {});
  it.skip('skill2 <80%HP recover 8.12% — unreachable in v1 (no incoming damage / HP pool); unmodeled', () => {});
});
