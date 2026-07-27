/**
 * naga (naga) - SG / Electric / Supporter / Burst II. BLIND kit-spec test.
 * Written from the kit prose alone: no sight of the driver's override, tests or reasoning.
 *
 * KIT, structurally (one assertion group per line):
 *   s1a  hitCount 12 / all allies      -> restores Cover HP 14.57%        (defensive; no cover pool in v1)
 *   s1b  'Shield is set' gate / allies  -> core damage +85.17% for 10s     (requiresShielded gate)
 *   s2a  hitCount 5 / 2 highest-ATK     -> core damage +40.07% for 5s
 *   s2b  hitCount 5 / 2 lowest-HP%      -> heal 9.58% of caster final MaxHP (feeds on-recovery consumers)
 *   b1   burstCast / self               -> gainPierce for 10s              (NOT the static hasPierce flag)
 *   b2   burstCast / all allies         -> casterAtkPct 16.18% for 10s
 *   b3   burstCast + shield gate/allies -> casterAtkPct 31.02% for 10s
 *
 * FIXTURE: controlComp('naga', true) = liter(B1) / crown(B2) / naga / helm(B3).
 * helm is REQUIRED here: naga is a Burst II, so without a Burst III the team never reaches
 * Full Burst at all. crown is also load-bearing: she is the on-recovery consumer that makes
 * naga's s2b heal observable in damage (a heal is never 'inert' on isolation).
 * Deterministic (no seed). Every run below is a full 180s sim; all 8 are hoisted at module scope.
 *
 * The override file shape is read defensively (slot -> Block[] OR slot -> {blocks: Block[]}),
 * so the counterfactual patches work under either layout.
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

// ------------------------------------------------------------------ helpers

type AnyRec = Record<string, any>;

const NAGA = 'naga';
// controlComp seating: liter(0, B1) / crown(1, B2) / carry(2) / helm(3, B3).
const NAGA_IDX = 2;

const SLOTS = ['skill1', 'skill2', 'burst'] as const;

function slotBlocks(ov: AnyRec, slot: string): AnyRec[] {
  const s = ov[slot];
  if (!s) {return [];}
  if (Array.isArray(s)) {return s as AnyRec[];}
  return Array.isArray(s.blocks) ? (s.blocks as AnyRec[]) : [];
}

function allBlocks(ov: AnyRec): AnyRec[] {
  return SLOTS.flatMap((s) => slotBlocks(ov, s));
}

function allEffects(ov: AnyRec): AnyRec[] {
  return allBlocks(ov).flatMap((b) =>
    Array.isArray(b.effects) ? (b.effects as AnyRec[]) : []
  );
}

/** note + unmodeled text, whichever layout carries it - the 'no silent drop' audit trail. */
function auditText(ov: AnyRec): string {
  const parts: string[] = [];
  if (typeof ov.note === 'string') {parts.push(ov.note);}
  const collect = (u: AnyRec | undefined) => {
    if (!u) {return;}
    for (const slot of SLOTS)
      {if (Array.isArray(u[slot])) {parts.push(...(u[slot] as string[]));}}
  };
  collect(ov.unmodeled as AnyRec | undefined);
  for (const slot of SLOTS) {
    const s = ov[slot];
    if (s && !Array.isArray(s)) {collect(s.unmodeled as AnyRec | undefined);}
  }
  return parts.join(' | ');
}

const patch = (slug: string, mutate: (ov: AnyRec) => void) =>
  withPatchedOverride(slug, (ov) => {
    mutate(ov as unknown as AnyRec);
  });

function run(opts: AnyRec): {
  res: ReturnType<typeof runComp>;
  events: SimEvent[];
} {
  const events: SimEvent[] = [];
  const withCfg = {
    ...opts,
    cfg: {
      ...((opts.cfg ?? {}) as AnyRec),
      onEvent: (ev: SimEvent) => {
        events.push(ev);
      },
    },
  };
  return { res: runComp(withCfg as Parameters<typeof runComp>[0]), events };
}

function comp(overrides: Record<string, unknown> = {}): AnyRec {
  const opts = controlComp(NAGA, true) as unknown as AnyRec;
  return {
    ...opts,
    overrides: { ...((opts.overrides ?? {}) as AnyRec), ...overrides },
  };
}

const buffApplies = (events: SimEvent[]): AnyRec[] =>
  events.filter(
    (e) => (e as unknown as AnyRec).kind === 'buffApply'
  ) as unknown as AnyRec[];

const near = (a: number, b: number, tol = 0.5) => Math.abs(a - b) <= tol;

const teamTotal = (r: { res: ReturnType<typeof runComp> }) =>
  Object.values(totals(r.res)).reduce((a, b) => a + b, 0);

// ------------------------------------------------- counterfactual overrides

/** read-only clone of the committed override (structural assertions only). */
const OV = patch(NAGA, () => {}) as unknown as AnyRec;

/** nearest-wrong for both shield lines: the gate does not exist (block always fires). */
const OV_UNGATE_SHIELD = patch(NAGA, (ov) => {
  for (const b of allBlocks(ov)) {delete b.requiresShielded;}
});

/** the shield lines removed outright - proves they leak nothing while unshielded. */
const OV_NO_SHIELD_BLOCKS = patch(NAGA, (ov) => {
  for (const slot of SLOTS) {
    const blocks = slotBlocks(ov, slot);
    for (let i = blocks.length - 1; i >= 0; i -= 1)
      {if (blocks[i].requiresShielded) {blocks.splice(i, 1);}}
  }
});

/** nearest-wrong for 'for 10 sec' on the burst ATK line: a window long enough to be permanent. */
const OV_LONG_BURST_ATK = patch(NAGA, (ov) => {
  for (const e of allEffects(ov)) {
    if (
      e.kind === 'buff' &&
      e.stat === 'casterAtkPct' &&
      typeof e.durationSec === 'number'
    ) {
      e.durationSec = 60;
    }
  }
});

/** nearest-wrong for 'after 5 normal attacks': a threshold that essentially never accrues. */
const OV_RARE_CORE_PROC = patch(NAGA, (ov) => {
  for (const b of allBlocks(ov)) {
    const carriesCore = ((b.effects ?? []) as AnyRec[]).some(
      (e) => e.stat === 'coreDamagePct'
    );
    if (carriesCore && b.trigger?.kind === 'hitCount' && b.trigger.count === 5)
      {b.trigger.count = 200;}
  }
});

/** nearest-wrong for 'for 5 sec': the window collapsed - proves the duration is load-bearing seconds. */
const OV_SHORT_CORE = patch(NAGA, (ov) => {
  for (const b of allBlocks(ov)) {
    if (b.requiresShielded) {continue;}
    for (const e of (b.effects ?? []) as AnyRec[]) {
      if (e.kind === 'buff' && e.stat === 'coreDamagePct') {e.durationSec = 0.2;}
    }
  }
});

/** nearest-wrong for the s2b heal: dropped as 'defensive, no damage'. */
const OV_NAGA_NO_HEAL = patch(NAGA, (ov) => {
  for (const b of allBlocks(ov)) {
    b.effects = ((b.effects ?? []) as AnyRec[]).filter(
      (e) => e.kind !== 'heal'
    );
  }
});

/** isolation: strip helm's heals so crown's on-recovery consumer has ONLY naga as a source. */
const OV_HELM_NO_HEAL = patch('helm', (ov) => {
  for (const b of allBlocks(ov)) {
    b.effects = ((b.effects ?? []) as AnyRec[]).filter(
      (e) => e.kind !== 'heal'
    );
  }
});

// --------------------------------------------------------------- hoisted runs

const base = run(comp());
const ungated = run(comp({ [NAGA]: OV_UNGATE_SHIELD }));
const noShieldBlocks = run(comp({ [NAGA]: OV_NO_SHIELD_BLOCKS }));
const longBurstAtk = run(comp({ [NAGA]: OV_LONG_BURST_ATK }));
const rareCoreProc = run(comp({ [NAGA]: OV_RARE_CORE_PROC }));
const shortCore = run(comp({ [NAGA]: OV_SHORT_CORE }));
const helmDry = run(comp({ helm: OV_HELM_NO_HEAL }));
const allDry = run(comp({ helm: OV_HELM_NO_HEAL, [NAGA]: OV_NAGA_NO_HEAL }));

const nagaBuffs = (r: { events: SimEvent[] }) =>
  buffApplies(r.events).filter((b) => b.casterIdx === NAGA_IDX);
const coreBuffs = (r: { events: SimEvent[] }, v: number) =>
  nagaBuffs(r).filter((b) => b.stat === 'coreDamagePct' && near(b.value, v));
const atkBuffs = (r: { events: SimEvent[] }) =>
  nagaBuffs(r).filter((b) => b.stat === 'casterAtkPct');

// --------------------------------------------------------------------- tests

describe('naga - fixture sanity', () => {
  it('naga is in the comp and fires', () => {
    expect(unitOf(base.res, NAGA).totalDamage).toBeGreaterThan(0);
  });

  it('naga casts her own burst (non-vacuity for every burst assertion below)', () => {
    // Both burst ATK lines are caster-scaled and target all allies, so one cast emits >=4
    // buffApply events with casterIdx === naga. Zero events would mean crown monopolised the
    // Burst II slot and every burst assertion in this file is vacuous.
    expect(atkBuffs(base).length).toBeGreaterThanOrEqual(4);
  });
});

describe('naga s1a - Cover HP restore every 12 normal attacks', () => {
  it('is either modeled or explicitly recorded - no silent drop', () => {
    const modeled = allBlocks(OV).some(
      (b) => b.trigger?.kind === 'hitCount' && b.trigger.count === 12
    );
    const recorded = /cover/i.test(auditText(OV));
    expect(modeled || recorded).toBe(true);
  });

  it.skip('restores 14.57% of Cover HP - GAP: v1 models no cover-HP pool, and whether COVER recovery (as opposed to unit HP recovery) should fire on-recovery consumers is measurement-gated', () => {});
});

describe('naga s1b - shield-gated core damage +85.17% for 10s (all allies)', () => {
  it('is INERT with no shield source in the comp', () => {
    // Nobody in liter/crown/naga/helm sets a shield, so the gate never opens.
    // Nearest-wrong (gate dropped / modeled as a plain passive) emits these applies - see the next test.
    expect(coreBuffs(base, 85.17).length).toBe(0);
    // ...and it leaks nothing: deleting the blocks entirely is byte-identical, per-slug.
    expect(totals(noShieldBlocks.res)).toEqual(totals(base.res));
  });

  it('exists and is GATED, not absent (ungating fires the buff and lifts the board)', () => {
    // Distinguishes 'faithfully gated' from 'dropped to unmodeled': if the block were absent,
    // deleting requiresShielded would be a no-op and nothing would change.
    expect(coreBuffs(ungated, 85.17).length).toBeGreaterThan(0);
    expect(teamTotal(ungated)).toBeGreaterThan(teamTotal(base));
  });
});

describe('naga s2a - core damage +40.07% for 5s to the 2 highest-ATK allies', () => {
  it('fires, and lands on exactly 2 distinct allies', () => {
    const ev = coreBuffs(base, 40.07);
    expect(ev.length).toBeGreaterThan(0);
    // Nearest-wrong (target {kind:allies}) would give 4 distinct target slugs.
    expect(new Set(ev.map((b) => b.targetSlug)).size).toBe(2);
  });

  it('the trigger counts ROUNDS, not SG pellets', () => {
    // 2 targets per activation. naga is an SG (ammo 9, reloadFrames 111): even an optimistic
    // ~2 rounds/s over 180s caps a 5-ROUND trigger at ~72 activations. A pellet-counting model
    // (hitsPerShot 10) would fire ~10x as often (~320) and blow the ceiling.
    const procs = coreBuffs(base, 40.07).length / 2;
    expect(procs).toBeGreaterThanOrEqual(8);
    expect(procs).toBeLessThanOrEqual(120);
  });

  it('the 5-attack threshold is load-bearing', () => {
    // Nearest-wrong: a trigger that is not really hit-count-5 (interval / passive / wrong count)
    // would be untouched by the patch and score identically.
    expect(teamTotal(rareCoreProc)).toBeLessThan(teamTotal(base));
  });

  it('the 5 sec window is a real wall-clock duration, not permanent', () => {
    // Nearest-wrong: durationSec omitted (buff never expires) - collapsing it would change nothing.
    expect(teamTotal(shortCore)).toBeLessThan(teamTotal(base));
  });
});

describe('naga s2b - heal 9.58% of caster final Max HP to the 2 lowest-HP allies', () => {
  it('is modeled as a heal effect (heals are never skipped on isolation)', () => {
    expect(allEffects(OV).some((e) => e.kind === 'heal')).toBe(true);
  });

  it('drives crown on-recovery damage once helm heals are stripped', () => {
    // Isolation: with helm's heals removed, naga's heal is the ONLY recovery source for crown's
    // 'when recovery takes effect' consumer. Removing naga's heal too must cost the team damage.
    // Nearest-wrong (heal dropped as 'defensive') scores these two runs identically.
    expect(teamTotal(helmDry)).toBeGreaterThan(teamTotal(allDry));
  });
});

describe('naga burst - ATK 16.18% of the skill user ATK for 10s (all allies)', () => {
  it('is caster-scaled, one magnitude, and covers all 4 allies including self', () => {
    const ev = atkBuffs(base);
    const vals = new Set(ev.map((b) => Math.round(b.value * 100) / 100));
    // Caster-scaled buffs flat-resolve at apply time, so the emitted value is an ATK number.
    expect([...vals].every((v) => (v as number) > 0)).toBe(true);
    // Exactly ONE magnitude unshielded: the 31.02% branch must not be live.
    expect(vals.size).toBe(1);
    // Nearest-wrong (excludeSelf) gives 3 target slugs.
    expect(new Set(ev.map((b) => b.targetSlug)).size).toBe(4);
  });

  it('the shield-gated 31.02% branch is absent unshielded and appears at 1.917x when ungated', () => {
    const v = atkBuffs(base)[0].value as number;
    const expectedShielded = (v * 31.02) / 16.18;
    expect(
      atkBuffs(base).some((b) =>
        near(b.value, expectedShielded, Math.max(1, v * 0.02))
      )
    ).toBe(false);

    // Ungated, BOTH branches apply: two distinct flat magnitudes in the kit ratio 31.02/16.18.
    // This pins the two magnitudes relative to each other without needing naga's sheet ATK.
    const uv = [
      ...new Set(atkBuffs(ungated).map((b) => b.value as number)),
    ].sort((a, b) => a - b);
    expect(uv.length).toBe(2);
    expect(uv[1] / uv[0]).toBeCloseTo(31.02 / 16.18, 1);
  });

  it('the 10 sec window is load-bearing', () => {
    // Nearest-wrong: no durationSec / a much longer window - a 60s window must outscore 10s.
    expect(teamTotal(longBurstAtk)).toBeGreaterThan(teamTotal(base));
  });
});

describe('naga burst - Gains Pierce for 10 sec (self)', () => {
  it('is a timed gainPierce effect, not the static whole-fight hasPierce flag', () => {
    const pierceEffects = allEffects(OV).filter((e) => e.kind === 'gainPierce');
    expect(pierceEffects.length).toBeGreaterThan(0);
    // 'for 10 sec' - an absent durationSec means continuous/permanent pierce, the nearest-wrong.
    expect(pierceEffects.some((e) => near(e.durationSec, 10, 0.01))).toBe(true);
    // The other nearest-wrong: encoding a 10s window as the whole-fight boolean.
    const staticFlags = [
      OV.hasPierce,
      ...SLOTS.map((s) =>
        Array.isArray(OV[s]) ? undefined : OV[s]?.hasPierce
      ),
    ];
    expect(staticFlags.some((f) => f === true)).toBe(false);
  });

  it.skip('pierce raises damage - GAP: pierceDamagePct is inert in v1 and no unit in the control comp carries a Pierce Damage buff, so the 10s window has no damage-side observable; the structural assertion above is the only available check', () => {});
});
