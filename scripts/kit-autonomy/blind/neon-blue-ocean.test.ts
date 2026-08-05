/**
 * Neon: Blue Ocean (`neon-blue-ocean`) — MG / Water / Attacker / Burst III, cd 40s, ammo 300,
 * reload 171f, hitsPerShot 1, normal 5.57%, core 200%.
 *
 * BLIND kit-spec test: written from the kit prose ALONE (no sight of the shipped override, its
 * tests, or any prior reasoning). Each assertion group is one kit line.
 *
 * KIT AS READ LITERALLY
 *  skill1 — "Activates when using Burst Skill. Affects self." Escalating Once/Twice/Three times,
 *           each "Damage to Parts \u25b2 12.4% for 20 sec."
 *           => trigger burstCast (the OWNER'S OWN burst — not fullBurstEnter, not stageEnter),
 *              target self, escalating[3 x buff partsDamagePct 12.4 durationSec 20].
 *           partsDamagePct is parsed-but-INERT in v1 (the scope-lock boss is partless), so this
 *           line must move ZERO damage. That inertness IS the assertion: the nearest-wrong model
 *           (mis-scoping "Damage to Parts" as a generic attackDamagePct / elementDamagePct) would
 *           move her total and turn the equality RED.
 *  skill2 — "Activates when entering Burst Stage 3. Affects self." Escalating 20.56% / 20.2% /
 *           20.2% "Elemental Advantage Attack Damage \u25b2 ... for 10 sec."
 *           => trigger stageEnter{stage:3} (fires when ANY ally casts a stage-3 burst), target
 *              self, escalating[3 x buff elemAdvantageDamagePct durationSec 10].
 *           Neon is Water, the control boss is Fire => the elemental-advantage gate is LIVE, so
 *           this buff is damage-bearing here and its removal must COST her damage (non-vacuity).
 *  burst  — "Affects self. Changes the weapon in use: Damage 33% of final ATK, Duration 7 sec."
 *           => weaponSwap { damagePct: 33, durationSec: 7 }.
 *         — "Activates when attacking a Fire Code target. Affects the target. Deals 11% of final
 *           ATK as additional damage."
 *           => per-attack flatDamage { atkPct: 11 } on the enemy, gated on the boss element
 *              (bossElementGate 'Fire'). The control boss IS Fire, so the gate is open here.
 *
 * FIXTURE: controlComp('neon-blue-ocean', true) — liter B1 / crown B2 / neon B3 / helm B3 vs the
 * Fire boss, focus on neon. B1+B2 are MANDATORY: a lone Burst III unit casts ZERO bursts, which
 * would make every assertion below (both escalations, the swap, the rider) vacuous. The second B3
 * (helm) is kept because it is common to the baseline and every counterfactual — all magnitude
 * claims are BASE-vs-patched deltas, so her buffs cancel out — and because a second stage-3 caster
 * is what lets skill2's team-wide stageEnter trigger out-fire skill1's own-burst trigger.
 * Deterministic (no seed).
 *
 * DISCRIMINATION STRATEGY: structural claims (trigger identity, escalation shape, target set,
 * magnitudes) are read off the event log; damage claims are proven by withPatchedOverride()
 * counterfactuals whose direction is monotone-safe (removing damage / weakening a per-shot
 * multiplier), so they hold even though the swap's shot economy is kit-silent (\u2691).
 *
 * SHAPE NOTE: the harness packet documents a slot value two ways (`ov.skill1` as a Block[] vs as a
 * CharacterSkills carrying `.blocks`). slotBlocks/setSlotBlocks accept BOTH so a counterfactual
 * cannot silently no-op. Every patch also counts what it touched, and the tests assert that count
 * is > 0 — a patch that matched nothing fails loudly instead of passing vacuously.
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

const SLUG = 'neon-blue-ocean';

/** Escalating "Nth activation applies steps 1..min(N,3)" => cumulative buffApply counts. */
const ESCALATING_APPLY_COUNTS = [1, 3, 6, 9, 12, 15, 18, 21, 24, 27];

type Opts = Parameters<typeof runComp>[0];
type SlotName = 'skill1' | 'skill2' | 'burst';

interface EffectLike {
  kind: string;
  stat?: string;
  value?: number;
  atkPct?: number;
  damagePct?: number;
  durationSec?: number;
  steps?: EffectLike[];
}
interface BlockLike {
  effects?: EffectLike[];
}
type SlotValue = BlockLike[] | { blocks?: BlockLike[] } | undefined;
type OvLike = Partial<Record<SlotName, SlotValue>>;

interface BuffApplyEv {
  kind: string;
  stat?: string;
  value?: number;
  targetSlug?: string;
  casterIdx?: number | null;
  targetIdx?: number | null;
}

function slotBlocks(ov: OvLike, slot: SlotName): BlockLike[] {
  const v = ov[slot];
  if (!v) {
    return [];
  }
  return Array.isArray(v) ? v : (v.blocks ?? []);
}

function setSlotBlocks(ov: OvLike, slot: SlotName, blocks: BlockLike[]): void {
  const v = ov[slot];
  if (Array.isArray(v)) {
    ov[slot] = blocks;
  } else if (v) {
    v.blocks = blocks;
  }
}

/** Every effect in a slot, including the steps nested inside an `escalating` effect. */
function allEffects(blocks: BlockLike[]): EffectLike[] {
  const out: EffectLike[] = [];
  for (const b of blocks) {
    for (const e of b.effects ?? []) {
      out.push(e);
      for (const s of e.steps ?? []) {
        out.push(s);
      }
    }
  }
  return out;
}

function patched(mutate: (ov: OvLike) => void) {
  return withPatchedOverride(SLUG, (o) => mutate(o as unknown as OvLike));
}

function buffApplies(events: SimEvent[], stat: string): BuffApplyEv[] {
  return (events as unknown as BuffApplyEv[]).filter(
    (e) => e.kind === 'buffApply' && e.stat === stat
  );
}

function countKind(events: SimEvent[], kind: string): number {
  return (events as unknown as { kind: string }[]).filter(
    (e) => e.kind === kind
  ).length;
}

/** One full 180s sim. `ov` (optional) replaces neon's override in memory only. */
function run(ov?: unknown) {
  const base = controlComp(SLUG, true) as Opts & {
    overrides?: Record<string, unknown>;
    cfg?: Record<string, unknown>;
  };
  const events: SimEvent[] = [];
  const res = runComp({
    ...base,
    overrides: ov ? { ...(base.overrides ?? {}), [SLUG]: ov } : base.overrides,
    cfg: { ...(base.cfg ?? {}), onEvent: (ev: SimEvent) => events.push(ev) },
  } as unknown as Opts);
  const map = totals(res);
  return { res, events, totalsMap: map, total: map[SLUG] };
}

// ---------------------------------------------------------------------------
// Hoisted runs (each is a full 180s sim) + their patch-hit counters.
// ---------------------------------------------------------------------------
let s1Removed = 0;
const OV_NO_S1 = patched((ov) => {
  s1Removed = slotBlocks(ov, 'skill1').length;
  setSlotBlocks(ov, 'skill1', []);
});

let s2Removed = 0;
const OV_NO_S2 = patched((ov) => {
  s2Removed = slotBlocks(ov, 'skill2').length;
  setSlotBlocks(ov, 'skill2', []);
});

let s2DurationsStripped = 0;
const OV_S2_PERMANENT = patched((ov) => {
  for (const e of allEffects(slotBlocks(ov, 'skill2'))) {
    if (e.kind === 'buff' && e.durationSec !== undefined) {
      delete e.durationSec;
      s2DurationsStripped++;
    }
  }
});

let swapWeakened = 0;
const OV_SWAP_WEAK = patched((ov) => {
  for (const e of allEffects(slotBlocks(ov, 'burst'))) {
    if (e.kind === 'weaponSwap') {
      e.damagePct = 3.3; // decimal-slip nearest-wrong
      swapWeakened++;
    }
  }
});

let swapLengthened = 0;
const OV_SWAP_LONG = patched((ov) => {
  for (const e of allEffects(slotBlocks(ov, 'burst'))) {
    if (e.kind === 'weaponSwap') {
      e.durationSec = 60; // "7 sec" ignored
      swapLengthened++;
    }
  }
});

let riderBlocksRemoved = 0;
const OV_NO_RIDER = patched((ov) => {
  const blocks = slotBlocks(ov, 'burst');
  const kept = blocks.filter(
    (b) => !(b.effects ?? []).some((e) => e.kind === 'flatDamage')
  );
  riderBlocksRemoved = blocks.length - kept.length;
  setSlotBlocks(ov, 'burst', kept);
});

const BASE = run();
const NO_S1 = run(OV_NO_S1);
const NO_S2 = run(OV_NO_S2);
const S2_PERMANENT = run(OV_S2_PERMANENT);
const SWAP_WEAK = run(OV_SWAP_WEAK);
const SWAP_LONG = run(OV_SWAP_LONG);
const NO_RIDER = run(OV_NO_RIDER);

const PARTS = buffApplies(BASE.events, 'partsDamagePct');
const ELEM = buffApplies(BASE.events, 'elemAdvantageDamagePct');

describe('neon-blue-ocean — fixture sanity (nothing below is vacuous)', () => {
  it('the control comp actually bursts and reaches Full Burst', () => {
    // A lone B3 makes ZERO full bursts; liter/crown exist precisely so this holds.
    expect(countKind(BASE.events, 'burstCast')).toBeGreaterThan(0);
    expect(countKind(BASE.events, 'fullBurstStart')).toBeGreaterThan(0);
    expect(unitOf(BASE.res, SLUG).totalDamage).toBeGreaterThan(0);
  });

  it('every counterfactual patch matched something', () => {
    expect(s1Removed).toBeGreaterThan(0);
    expect(s2Removed).toBeGreaterThan(0);
    expect(s2DurationsStripped).toBeGreaterThan(0);
    expect(swapWeakened).toBeGreaterThan(0);
    expect(swapLengthened).toBeGreaterThan(0);
    expect(riderBlocksRemoved).toBeGreaterThan(0);
  });
});

describe('skill1 — "when using Burst Skill": escalating Damage to Parts 12.4% / 20s (self)', () => {
  it('emits partsDamagePct at 12.4, self-only', () => {
    expect(PARTS.length).toBeGreaterThan(0);
    // Nearest-wrong: a mis-read magnitude, or a per-step ramp (12.4 / 24.8 / 37.2).
    for (const ev of PARTS) {
      expect(ev.value).toBeCloseTo(12.4, 6);
    }
    // "Affects self" — never a teammate, never the boss (boss debuffs carry null idxs).
    expect(new Set(PARTS.map((e) => e.targetSlug))).toEqual(new Set([SLUG]));
    for (const ev of PARTS) {
      expect(ev.targetIdx).not.toBeNull();
    }
  });

  it('escalates (Nth cast applies steps 1..N), not one flat application per cast', () => {
    // Escalating apply-counts are 1, 3, 6, 9, ...; a flat non-escalating model yields
    // 1, 2, 3, 4, ... — the two sets diverge from the 2nd activation onward.
    expect(PARTS.length).toBeGreaterThanOrEqual(3);
    expect(ESCALATING_APPLY_COUNTS).toContain(PARTS.length);
  });

  it('is INERT: Damage to Parts moves no damage on the partless scope-lock boss', () => {
    // The discriminator for SCOPE. If "Damage to Parts" were mis-encoded as a generic
    // attackDamagePct / elementDamagePct / atkPct, neon's total would move and this fails.
    // Teammate equality is asserted at the same time: the line is self-scoped.
    expect(NO_S1.totalsMap).toEqual(BASE.totalsMap);
  });
});

describe('skill2 — "entering Burst Stage 3": escalating Elemental Advantage Damage / 10s (self)', () => {
  it('emits elemAdvantageDamagePct at 20.56 then 20.2, self-only', () => {
    expect(ELEM.length).toBeGreaterThan(0);
    // Step 1 is the odd magnitude — proves the three steps were read individually and
    // not collapsed to a single repeated value.
    expect(ELEM[0].value).toBeCloseTo(20.56, 6);
    expect(ELEM.some((e) => Math.abs((e.value ?? 0) - 20.2) < 1e-6)).toBe(true);
    for (const ev of ELEM) {
      expect([20.56, 20.2]).toContainEqual(
        Math.round((ev.value ?? 0) * 1e6) / 1e6
      );
    }
    expect(new Set(ELEM.map((e) => e.targetSlug))).toEqual(new Set([SLUG]));
  });

  it('escalates (Nth entry applies steps 1..N)', () => {
    expect(ELEM.length).toBeGreaterThanOrEqual(3);
    expect(ESCALATING_APPLY_COUNTS).toContain(ELEM.length);
  });

  it('is keyed to stage-3 ENTRY (team-wide), never rarer than her own burst casts', () => {
    // TRIGGER IDENTITY: "entering Burst Stage 3" fires whenever ANY ally casts a stage-3
    // burst, so with a second B3 in the comp its activation count is >= skill1's own-burst
    // count. Keying it to a rarer trigger (own burstCast gated, fullBurstEnd, lastBullet)
    // drives this below the skill1 count and fails.
    expect(ELEM.length).toBeGreaterThanOrEqual(PARTS.length);
  });

  it('is damage-bearing here (Water vs the Fire control boss) — removing it costs damage', () => {
    // Non-vacuity for the elemental-advantage gate: the fixture genuinely exercises the
    // ACTIVE case, so the buff is not silently inert.
    expect(NO_S2.total).toBeLessThan(BASE.total);
  });

  it('is self-scoped: removing it moves no teammate', () => {
    for (const slug of Object.keys(BASE.totalsMap)) {
      if (slug === SLUG) {
        continue;
      }
      expect(NO_S2.totalsMap[slug]).toBe(BASE.totalsMap[slug]);
    }
  });

  it('lasts 10 sec, not the whole fight', () => {
    // DURATION SEMANTICS. There is no buffRemove on natural lapse, so expiry is proven by
    // the counterfactual: stripping durationSec makes the buff permanent, which must be
    // strictly better than a 10s window per stage-3 entry.
    expect(S2_PERMANENT.total).toBeGreaterThan(BASE.total);
  });
});

describe('burst — weapon swap: 33% of final ATK for 7 sec (self)', () => {
  it('the swap shots are real: weakening damagePct 33 -> 3.3 costs damage', () => {
    // Monotone in damagePct regardless of whether the swap is a net DPS gain over her base
    // MG, so this direction is safe even though the swap's shot economy is kit-silent (F).
    // Nearest-wrong caught: a decimal slip, or a swap that never actually fires (0 shots
    // would make the two totals identical).
    expect(SWAP_WEAK.total).toBeLessThan(BASE.total);
  });

  it('durationSec 7 is load-bearing', () => {
    // Stretching the window to 60s must change her output. Direction is deliberately not
    // asserted: swap-vs-base DPS depends on the kit-silent swap cadence/core behaviour (F).
    expect(SWAP_LONG.total).not.toBe(BASE.total);
  });
});

describe('burst — "attacking a Fire Code target": +11% of final ATK to the target', () => {
  it('fires against the Fire control boss and adds damage', () => {
    // Removing the rider strictly removes damage instances -> monotone-safe direction.
    // Non-vacuity for the boss-element gate's ACTIVE branch.
    expect(NO_RIDER.total).toBeLessThan(BASE.total);
  });

  it('is enemy-targeted damage, not a self stat buff', () => {
    // A nearest-wrong that models "Deals 11% of final ATK as additional damage" as an
    // extraHitDamagePct / attackDamagePct self-buff would surface as a buffApply.
    expect(buffApplies(BASE.events, 'extraHitDamagePct')).toHaveLength(0);
    expect(buffApplies(BASE.events, 'trueDamagePct')).toHaveLength(0);
  });
});

describe('neon-blue-ocean — GAPS (unobservable in this fixture)', () => {
  it.skip('rider is INERT vs a non-Fire boss (bossElementGate closed branch)', () => {
    // GAP: controlComp fixes a Fire boss and the packet documents no CompOptions knob for
    // the boss element, so the gate's CLOSED branch cannot be exercised here. Needs a
    // fixture that swaps the boss element; until then only the open branch is pinned.
  });

  it.skip('skill2 scope: elemAdvantageDamagePct vs a generic attackDamagePct', () => {
    // GAP: against an advantaged (Fire) boss the two encodings are numerically identical.
    // Discriminating them requires a NON-advantaged boss, where the faithful encoding is
    // inert and the generic one still buffs. Same fixture limitation as above.
  });

  it.skip('skill1 magnitude: Damage to Parts 12.4% has no observable payload in v1', () => {
    // GAP: the scope-lock boss is partless and partsDamagePct is parsed-but-inert, so only
    // the buff's existence/shape/inertness is assertable — never its 12.4% effect size.
    // Would need destructible-part modeling.
  });

  it.skip('swap shot economy: cadence / ammo / core behaviour while swapped', () => {
    // GAP (F, ALWAYS-flag field 3): the kit states only "Damage: 33% of final ATK" and
    // "Duration: 7 sec" — it is silent on the swap weapon's pulls/sec, magazine, and
    // whether swap shots core. Any assertion on swap shot COUNT would be pinning a guess.
  });
});
