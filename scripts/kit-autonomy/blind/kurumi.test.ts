/**
 * kurumi — AR / Iron / Supporter / Burst I (ammo 60, reload 81f, normalAtk 13.65).
 * BLIND kit-spec test: written from the kit prose ALONE (no sight of the shipped
 * override, its tests, or any reasoning about it).
 *
 * KIT STRUCTURE (magnitudes only):
 *   S1a  "Activates after landing 36 normal attack(s). Affects the target."
 *        Hacked: 52.24% of final ATK as sustained damage every 1 sec for 5 sec.
 *   S1b  "Activates when using Burst Skill. Affects all enemies."
 *        Hacked: the same 52.24% / 1s / 5s sustained DoT.
 *   S2   "Activates during Full Burst after landing 36 normal attack(s) while the target
 *        is in Hacked status. Affects the target." -> 86.17% as additional damage.
 *   B    "Affects all enemies." Damage Taken up 18.06% for 10 sec.
 *
 * READING (the 4 questions):
 *   scope     - S1a/S2 count NORMAL attacks (hitCount 36, counts rounds); nothing is scoped
 *               to charge or crit. The burst line is a boss DEBUFF (a whole-team damage
 *               amplifier), never a self/ally stat buff.
 *   duration  - every window is wall-clock seconds (5s DoT, 10s debuff): no round counts, no
 *               stacks, no until-reload. The DoT sits on a REPEATING trigger, so each
 *               activation appends its own 5s instance (the engine never dedups) — correct
 *               here, because the kit genuinely re-applies it, not a maintained aura.
 *   trigger   - S1a: hitCount 36. S1b: "when using Burst Skill" = burstCast (this unit
 *               casting her own Burst I), NOT fullBurstEnter — keying it to FB-enter fires on
 *               every team Full Burst and over-credits. S2: hitCount 36 + fbGate 'inFb' +
 *               requiresTargetStatus 'Hacked'. Burst: burstCast.
 *   target    - all four lines are enemy-scoped.
 *
 * "Hacked" is a kit-NAMED enemy status: S1 must open it through the targetStatus effect (the
 * schema's sole enemy-status channel) or S2's gate can never be satisfied. The status WINDOW
 * length is kit-silent (FLAG) — the only defensible read is the DoT's own 5s, so this file
 * asserts >= 5s instead of pinning an unmeasured number.
 *
 * FIXTURE: controlComp('kurumi', true) — liter B1 / crown B2 / kurumi / helm B3, so full
 * bursts actually occur (a lone caster makes zero). CAVEAT: kurumi is Burst I and liter also
 * holds B1, so the control comp may never let kurumi cast her OWN burst. The two
 * burstCast-keyed lines (S1b, the debuff) are therefore covered structurally plus by a
 * provenance relation that holds either way, and the one assertion that genuinely needs her
 * to burst is labelled NON-VACUITY so a RED there reads as a fixture limit, not a defect.
 *
 * Runs: 7 (each a full 180s sim), all hoisted to module scope.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUG = 'kurumi';
const DOT_PCT = 52.24;
const RIDER_PCT = 86.17;
const DT_PCT = 18.06;
const HITS = 36;
const SLOTS = ['skill1', 'skill2', 'burst'] as const;

type Loose = Record<string, unknown>;
type Ov = ReturnType<typeof withPatchedOverride>;

/** Tolerant slot accessor: a slot may be authored as Block[] or as { blocks: Block[] }. */
function blocksOf(ov: unknown, slot: (typeof SLOTS)[number]): Loose[] {
  const s = (ov as Loose)?.[slot];
  if (!s) return [];
  if (Array.isArray(s)) return s as Loose[];
  const inner = (s as Loose).blocks;
  return Array.isArray(inner) ? (inner as Loose[]) : [];
}

function allBlocks(ov: unknown): Loose[] {
  return SLOTS.flatMap((s) => blocksOf(ov, s));
}

function effectsOf(b: Loose): Loose[] {
  return Array.isArray(b.effects) ? (b.effects as Loose[]) : [];
}

function trig(b: Loose): Loose {
  return (b.trigger ?? {}) as Loose;
}

function targ(b: Loose): Loose {
  return (b.target ?? {}) as Loose;
}

/** The committed override, deep-cloned and unmutated (disk untouched). */
const OV = withPatchedOverride(SLUG, () => undefined);

type Run = { total: number; team: Record<string, number>; events: SimEvent[] };

function run(patched?: Ov): Run {
  const events: SimEvent[] = [];
  const opts = controlComp(SLUG, true);
  const res = runComp({
    ...opts,
    overrides: { ...(opts.overrides ?? {}), [SLUG]: patched },
    onEvent: (ev: SimEvent) => events.push(ev),
  } as typeof opts);
  return { total: unitOf(res, SLUG).totalDamage, team: totals(res), events };
}

// ---------------------------------------------------------------- counterfactuals
// Each is the NEAREST-WRONG model of one kit line; the paired assertion is GREEN under
// the faithful reading and RED under the counterfactual.

/** DoT damage neutralised, Hacked window untouched -> isolates the DoT contribution. */
const CF_DOT_ZERO = withPatchedOverride(SLUG, (ov) => {
  for (const b of allBlocks(ov))
    for (const e of effectsOf(b)) if (e.kind === 'dot') e.atkPct = 0;
});

/** "for 5 sec" mis-read as a 10s window. */
const CF_DOT_10S = withPatchedOverride(SLUG, (ov) => {
  for (const b of allBlocks(ov))
    for (const e of effectsOf(b)) if (e.kind === 'dot') e.durationSec = 10;
});

/** The Hacked status is never inflicted -> S2's gate can never open. */
const CF_NO_HACKED = withPatchedOverride(SLUG, (ov) => {
  for (const b of allBlocks(ov)) {
    const eff = effectsOf(b);
    for (let i = eff.length - 1; i >= 0; i--)
      if (eff[i].kind === 'targetStatus') eff.splice(i, 1);
  }
});

/** S2 removed entirely -> the exact size of the S2 contribution. */
const CF_NO_S2 = withPatchedOverride(SLUG, (ov) => {
  blocksOf(ov, 'skill2').length = 0;
});

/** "during Full Burst" dropped -> the rider fires all fight long. */
const CF_S2_UNGATED = withPatchedOverride(SLUG, (ov) => {
  for (const b of blocksOf(ov, 'skill2')) delete b.fbGate;
});

/** Burst slot removed -> provenance of the Damage Taken debuff. */
const CF_NO_BURST = withPatchedOverride(SLUG, (ov) => {
  blocksOf(ov, 'burst').length = 0;
});

// ------------------------------------------------------------------------- runs
const BASE = run();
const DOT_ZERO = run(CF_DOT_ZERO);
const DOT_10S = run(CF_DOT_10S);
const NO_HACKED = run(CF_NO_HACKED);
const NO_S2 = run(CF_NO_S2);
const S2_UNGATED = run(CF_S2_UNGATED);
const NO_BURST = run(CF_NO_BURST);

function teammates(t: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(t)) if (k !== SLUG) out[k] = v;
  return out;
}

function teamSum(t: Record<string, number>): number {
  return Object.values(t).reduce((a, b) => a + b, 0);
}

/** Boss-held debuffs carry casterIdx === null AND targetIdx === null; filter by stat+value. */
function damageTakenApplies(evs: SimEvent[]): Loose[] {
  return (
    evs.filter((e) => e.kind === 'buffApply') as unknown as Loose[]
  ).filter(
    (e) =>
      e.stat === 'damageTakenPct' && Math.abs(Number(e.value) - DT_PCT) < 0.01,
  );
}

const DOT_DAMAGE = BASE.total - DOT_ZERO.total;

// ============================================================================
describe('kurumi S1a — Hacked sustained DoT on every 36 normal attacks', () => {
  it('is a hitCount(36) enemy-targeted 52.24% / 1s / 5s sustained DoT', () => {
    // Nearest-wrong: an interval trigger, a wrong threshold, a flat hit instead of a DoT,
    // or a generic (non-sustained) flavor that a sustainedDamagePct buff would not feed.
    const hit = blocksOf(OV, 'skill1').find((b) => trig(b).kind === 'hitCount');
    expect(hit).toBeDefined();
    expect(trig(hit as Loose).count).toBe(HITS);
    expect(targ(hit as Loose).kind).toBe('enemy');
    const dot = effectsOf(hit as Loose).find((e) => e.kind === 'dot');
    expect(dot).toBeDefined();
    expect(Number((dot as Loose).atkPct)).toBeCloseTo(DOT_PCT, 2);
    expect((dot as Loose).durationSec).toBe(5);
    expect((dot as Loose).intervalSec ?? 1).toBe(1);
    expect((dot as Loose).flavor).toBe('sustained');
  });

  it('is load-bearing: zeroing the DoT percentage drops kurumi damage', () => {
    // Non-vacuity for every DoT assertion below — proves the fixture reaches 36 hits.
    expect(DOT_DAMAGE).toBeGreaterThan(0);
  });

  it('lasts 5 ticks at 1s: doubling durationSec roughly doubles the DoT damage', () => {
    // GREEN under "5 sec, tick every 1 sec"; RED under a longer/maintained window model,
    // where the baseline already carries the larger contribution and the ratio collapses to ~1.
    const doubled = DOT_10S.total - DOT_ZERO.total;
    expect(doubled / DOT_DAMAGE).toBeGreaterThan(1.7);
    expect(doubled / DOT_DAMAGE).toBeLessThan(2.3);
  });
});

// ============================================================================
describe('kurumi S1b — the same Hacked DoT on her own burst cast', () => {
  it('is keyed to burstCast, not fullBurstEnter', () => {
    // "Activates when using Burst Skill" fires only on rotations THIS unit bursts.
    // Nearest-wrong: fullBurstEnter, which fires on ANY team Full Burst — in this comp
    // liter holds B1, so an FB-enter keying would credit her on rotations she never cast.
    const cast = allBlocks(OV).find(
      (b) =>
        trig(b).kind === 'burstCast' &&
        effectsOf(b).some((e) => e.kind === 'dot'),
    );
    expect(cast).toBeDefined();
    expect(targ(cast as Loose).kind).toBe('enemy');
    const dot = effectsOf(cast as Loose).find((e) => e.kind === 'dot');
    expect(Number((dot as Loose).atkPct)).toBeCloseTo(DOT_PCT, 2);
    expect((dot as Loose).durationSec).toBe(5);
    expect((dot as Loose).flavor).toBe('sustained');
  });

  it('no kit line is modelled on a fullBurstEnter trigger', () => {
    expect(allBlocks(OV).some((b) => trig(b).kind === 'fullBurstEnter')).toBe(
      false,
    );
  });
});

// ============================================================================
describe('kurumi — the named Hacked enemy status', () => {
  it('S1 opens a Hacked window via the targetStatus channel', () => {
    // Without this, S2 has no gate to satisfy and the whole S2 line is silently inert.
    const statuses = allBlocks(OV)
      .flatMap(effectsOf)
      .filter((e) => e.kind === 'targetStatus');
    expect(statuses.length).toBeGreaterThan(0);
    for (const s of statuses) {
      expect(String(s.name)).toMatch(/hack/i);
      // FLAG: the window length is kit-silent; 5s (the DoT's own duration) is the only
      // defensible read, so this asserts the floor rather than pinning an unmeasured value.
      expect(Number(s.durationSec)).toBeGreaterThanOrEqual(5);
    }
  });

  it('BOTH Hacked-labelled S1 lines inflict the status (hit-count and burst-cast)', () => {
    const kinds = allBlocks(OV)
      .filter((b) => effectsOf(b).some((e) => e.kind === 'targetStatus'))
      .map((b) => String(trig(b).kind));
    expect(new Set(kinds)).toEqual(new Set(['hitCount', 'burstCast']));
  });

  it('S2 truly depends on it: removing the status source removes EXACTLY the S2 damage', () => {
    // GREEN only if requiresTargetStatus is modelled AND nothing else rides on Hacked.
    // RED if S2 is ungated (dropHacked = 0) or if Hacked leaks into another line.
    const dropS2 = BASE.total - NO_S2.total;
    const dropHacked = BASE.total - NO_HACKED.total;
    expect(dropS2).toBeGreaterThan(0); // non-vacuity: the S2 rider does fire in this fixture
    expect(Math.abs(dropHacked - dropS2) / dropS2).toBeLessThan(0.01);
  });
});

// ============================================================================
describe('kurumi S2 — 86.17% additional-damage rider', () => {
  it('is one hitCount(36) block, FB-gated, Hacked-gated, enemy-targeted', () => {
    const s2 = blocksOf(OV, 'skill2');
    expect(s2.length).toBe(1);
    const b = s2[0];
    expect(trig(b).kind).toBe('hitCount');
    expect(trig(b).count).toBe(HITS);
    expect(b.fbGate).toBe('inFb');
    expect(String(b.requiresTargetStatus)).toMatch(/hack/i);
    expect(targ(b).kind).toBe('enemy');
    const fd = effectsOf(b).find((e) => e.kind === 'flatDamage');
    expect(fd).toBeDefined();
    expect(Number((fd as Loose).atkPct)).toBeCloseTo(RIDER_PCT, 2);
    // The text says neither "core strike damage" nor anything FB-exempt: a rider takes
    // Full Burst by timing, and per-kit noFb is measured-only.
    expect((fd as Loose).core).not.toBe(true);
    expect((fd as Loose).noFb).not.toBe(true);
  });

  it('the Full Burst gate is load-bearing: dropping it over-credits', () => {
    expect(S2_UNGATED.total).toBeGreaterThan(BASE.total);
  });
});

// ============================================================================
describe('kurumi burst — Damage Taken up 18.06% for 10 sec on the boss', () => {
  it('is a burstCast enemy debuff and nothing else (no self/ally grant)', () => {
    const bb = blocksOf(OV, 'burst');
    expect(bb.length).toBe(1);
    expect(trig(bb[0]).kind).toBe('burstCast');
    expect(targ(bb[0]).kind).toBe('enemy');
    const eff = effectsOf(bb[0]);
    expect(eff.length).toBe(1);
    expect(eff[0].kind).toBe('buff');
    expect(eff[0].stat).toBe('damageTakenPct');
    expect(Number(eff[0].value)).toBeCloseTo(DT_PCT, 2);
    expect(eff[0].durationSec).toBe(10);
  });

  it('the debuff exists only while the burst block does, and is boss-held', () => {
    // Holds whether or not the fixture lets kurumi burst: provenance + shape.
    expect(damageTakenApplies(NO_BURST.events).length).toBe(0);
    for (const ev of damageTakenApplies(BASE.events)) {
      expect(ev.casterIdx ?? null).toBeNull();
      expect(ev.targetIdx ?? null).toBeNull();
    }
  });

  it('NON-VACUITY / fixture probe: kurumi casts her Burst I and the debuff amplifies the whole team (RED here = fixture limit, liter also holds B1 — not an override defect)', () => {
    expect(damageTakenApplies(BASE.events).length).toBeGreaterThan(0);
    expect(teamSum(BASE.team)).toBeGreaterThan(teamSum(NO_BURST.team));
  });
});

// ============================================================================
describe('kurumi — inertness and completeness', () => {
  it('her damage lines are enemy-scoped: teammates are byte-identical under every damage counterfactual', () => {
    for (const r of [DOT_ZERO, NO_HACKED, NO_S2, S2_UNGATED]) {
      expect(teammates(r.team)).toEqual(teammates(BASE.team));
    }
  });

  it('every kit line is represented: 2 S1 blocks, 1 S2 block, 1 burst block', () => {
    expect(blocksOf(OV, 'skill1').length).toBeGreaterThanOrEqual(2);
    expect(blocksOf(OV, 'skill2').length).toBe(1);
    expect(blocksOf(OV, 'burst').length).toBe(1);
  });

  it.skip('FLAG: exact Hacked window length — the kit never states it; 5s (the DoT duration) is inferred, and only a popup/footage measurement of the last S2 proc after the final 36th hit can pin it', () => {
    // Intentionally unasserted: guessing a precise unmeasurable value would be worse than flagging it.
  });

  it.skip('FLAG: "landing 36 normal attacks" counts LANDED hits; the sim has no miss model, so rounds fired stands in for hits landed', () => {
    // Unobservable from prose; recorded so a later measurement can revisit the threshold cadence.
  });
});
