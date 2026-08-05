import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

/**
 * anchor (Anchor) — per-unit kit spec test.
 *
 * Written BLIND from the kit prose alone (cross-family post-op spec pass) against the
 * shipped src/skills/overrides/anchor.json.
 *
 * KIT (RL / Wind / Defender / Burst I — 6 ammo, 141f reload, normal 61.3%, core 200%):
 *   skill1-a  "Activates when the last bullet hits the target. Affects the target."
 *             Taunt for 5 sec.                       -> GAP: no aggro/taunt primitive exists,
 *                                                       and the scope-lock boss deals no damage,
 *                                                       so the line is unobservable in v1.
 *   skill1-b  "Activates when the last bullet hits the target. Affects self."
 *             DEF ▲ 23.82% for 5 sec.                -> FAITHFUL: lastBullet / self / defPct,
 *                                                       seconds (not rounds), damage-inert in v1.
 *   skill2    "Activates at the start of battle. Affects self. When attacking an enemy
 *             projectile, damage dealt to that projectile ▲ 25.6% continuously."
 *                                                    -> GAP: there is no enemy-projectile entity;
 *                                                       the ONLY faithful model is board-inert.
 *   burst     "Affects all enemies. Deals 304.45% of final ATK as Burst Skill damage."
 *                                                    -> FAITHFUL: burstCast / enemy / flatDamage,
 *                                                       no core strike, pre-Full-Burst by timing.
 *
 * FIXTURE: controlComp('anchor', true) — liter (B1) / crown (B2) / anchor / helm (B3), boss Fire,
 * focus anchor, deterministic (no seed). The fixed B3 is required so bursts chain at all.
 * NOTE: anchor is herself a Burst I and therefore SHARES burst stage 1 with liter in this fixture,
 * so "does her burst ever cast here" is not free — the burst group below carries an explicit
 * NON-VACUITY assertion (a strictly positive burst contribution) that fails loudly, and points at
 * the fixture rather than at the model, if she never gets the stage.
 *
 * SHAPE TOLERANCE: the harness documentation describes the OverrideFile two ways (slot -> Block[]
 * and slot -> { blocks: Block[] }). Every read/patch below goes through blocksOf()/effectsOf() so
 * the spec is true under either shape and a counterfactual can never silently no-op.
 */

type Comp = Parameters<typeof runComp>[0];
type OverrideClone = ReturnType<typeof withPatchedOverride>;
type Slot = 'skill1' | 'skill2' | 'burst';
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;

interface EffectLike {
  kind: string;
  stat?: string;
  value?: number;
  atkPct?: number;
  durationSec?: number;
  durationShots?: number;
  core?: boolean;
}
interface BlockLike {
  trigger?: { kind?: string };
  target?: { kind?: string };
  effects?: EffectLike[];
}
interface RunResult {
  res: ReturnType<typeof runComp>;
  events: SimEvent[];
}

const SLOTS: Slot[] = ['skill1', 'skill2', 'burst'];

function blocksOf(ov: OverrideClone, slot: Slot): BlockLike[] {
  const raw = (ov as unknown as Record<string, unknown>)[slot];
  if (Array.isArray(raw)) return raw as BlockLike[];
  const nested = (raw as { blocks?: unknown } | undefined)?.blocks;
  return Array.isArray(nested) ? (nested as BlockLike[]) : [];
}
function effectsOf(ov: OverrideClone, slot: Slot): EffectLike[] {
  return blocksOf(ov, slot).flatMap((b) => b.effects ?? []);
}
function allEffects(ov: OverrideClone): EffectLike[] {
  return SLOTS.flatMap((s) => effectsOf(ov, s));
}

/** every prose surface an override may record an unmodeled kit line on */
function proseOf(ov: OverrideClone): string {
  const rec = ov as unknown as Record<string, unknown>;
  const parts: string[] = [];
  const collect = (u: unknown): void => {
    if (!u || typeof u !== 'object') return;
    for (const v of Object.values(u as Record<string, unknown>)) {
      if (Array.isArray(v)) parts.push(...v.map(String));
      else if (typeof v === 'string') parts.push(v);
    }
  };
  collect(rec.unmodeled);
  for (const slot of SLOTS) {
    const raw = rec[slot];
    if (raw && !Array.isArray(raw)) collect((raw as { unmodeled?: unknown }).unmodeled);
  }
  for (const key of ['note', 'caveats']) {
    const v = rec[key];
    if (typeof v === 'string') parts.push(v);
    else if (Array.isArray(v)) parts.push(...v.map(String));
  }
  return parts.join(' | ').toLowerCase();
}

function run(opts: Comp): RunResult {
  const events: SimEvent[] = [];
  const prevCfg = (opts as unknown as { cfg?: Record<string, unknown> }).cfg ?? {};
  const cfg = {
    ...prevCfg,
    onEvent: (ev: SimEvent) => {
      events.push(ev);
    },
  };
  return { res: runComp({ ...opts, cfg } as Comp), events };
}

const FIXTURE = controlComp('anchor', true);
function withAnchor(patched: OverrideClone): Comp {
  const prev = (FIXTURE as unknown as { overrides?: Record<string, unknown> }).overrides ?? {};
  return { ...FIXTURE, overrides: { ...prev, anchor: patched } } as Comp;
}

const SHIPPED = withPatchedOverride('anchor', (ov) => {
  void ov;
});

const isDef = (e: EffectLike): boolean => e.kind === 'buff' && e.stat === 'defPct';

// ---- counterfactuals (each one is the NEAREST-WRONG model for exactly one kit line) ----
const defAsAtk = withPatchedOverride('anchor', (ov) => {
  for (const e of effectsOf(ov, 'skill1')) if (isDef(e)) e.stat = 'atkPct';
});
const defRemoved = withPatchedOverride('anchor', (ov) => {
  for (const b of blocksOf(ov, 'skill1')) b.effects = (b.effects ?? []).filter((e) => !isDef(e));
});
const defAsPassive = withPatchedOverride('anchor', (ov) => {
  for (const b of blocksOf(ov, 'skill1'))
    if ((b.effects ?? []).some(isDef)) b.trigger = { kind: 'passive' };
});
const defAsShotFired = withPatchedOverride('anchor', (ov) => {
  for (const b of blocksOf(ov, 'skill1'))
    if ((b.effects ?? []).some(isDef)) b.trigger = { kind: 'shotFired' };
});
const skill2Stripped = withPatchedOverride('anchor', (ov) => {
  for (const b of blocksOf(ov, 'skill2')) b.effects = [];
});
// sensitivity probe: proves a 25.6% Damage-Up buff on anchor WOULD move her total, so the
// "skill2 is board-inert" assertion is a real claim and not an artefact of a numb fixture.
const damageBuffProbe = withPatchedOverride('anchor', (ov) => {
  const target = blocksOf(ov, 'skill1')[0];
  if (target)
    target.effects = [
      ...(target.effects ?? []),
      { kind: 'buff', stat: 'attackDamagePct', value: 25.6 },
    ];
});
const scaleBurst = (ov: OverrideClone, k: number): void => {
  for (const e of effectsOf(ov, 'burst'))
    if (e.kind === 'flatDamage' && typeof e.atkPct === 'number') e.atkPct *= k;
};
const burstHalf = withPatchedOverride('anchor', (ov) => {
  scaleBurst(ov, 0.5);
});
const burstDouble = withPatchedOverride('anchor', (ov) => {
  scaleBurst(ov, 2);
});
const burstAtFbEnter = withPatchedOverride('anchor', (ov) => {
  for (const b of blocksOf(ov, 'burst'))
    if ((b.effects ?? []).some((e) => e.kind === 'flatDamage'))
      b.trigger = { kind: 'fullBurstEnter' };
});

// ---- runs (hoisted: each is a full 180s sim) ----
const BASE = run(FIXTURE);
const R_DEF_ATK = run(withAnchor(defAsAtk));
const R_DEF_OFF = run(withAnchor(defRemoved));
const R_DEF_PASSIVE = run(withAnchor(defAsPassive));
const R_DEF_SHOT = run(withAnchor(defAsShotFired));
const R_S2_OFF = run(withAnchor(skill2Stripped));
const R_DMG_PROBE = run(withAnchor(damageBuffProbe));
const R_B_HALF = run(withAnchor(burstHalf));
const R_B_DOUBLE = run(withAnchor(burstDouble));
const R_B_FBENTER = run(withAnchor(burstAtFbEnter));

const anchorTotal = (r: RunResult): number => totals(r.res).anchor;
const teammates = (r: RunResult): Record<string, number> => {
  const t: Record<string, number> = { ...totals(r.res) };
  delete t.anchor;
  return t;
};
const defApplies = (r: RunResult): BuffApply[] =>
  r.events
    .filter((e): e is BuffApply => e.kind === 'buffApply')
    .filter((e) => e.stat === 'defPct' && e.targetSlug === 'anchor');

describe('anchor — skill1: DEF ▲ 23.82% for 5 sec (self, on last bullet)', () => {
  it('is encoded as a self defPct buff of 23.82 for 5 sec on the lastBullet trigger', () => {
    const block = blocksOf(SHIPPED, 'skill1').find((b) => (b.effects ?? []).some(isDef));
    expect(block, 'skill1 must carry the DEF ▲ 23.82% self buff').toBeDefined();
    expect(block?.trigger?.kind).toBe('lastBullet');
    expect(block?.target?.kind).toBe('self');
    const eff = (block?.effects ?? []).find(isDef);
    expect(eff?.value).toBeCloseTo(23.82, 5);
    expect(eff?.durationSec).toBe(5);
  });

  it('fires once per magazine — not once per battle (discriminates vs a passive)', () => {
    const perMag = defApplies(BASE).length;
    const asPassive = defApplies(R_DEF_PASSIVE).length;
    // non-vacuity: the fixture really does exercise the trigger, many times over 180s
    expect(perMag).toBeGreaterThanOrEqual(5);
    // the nearest-wrong "start of battle" reading applies it once and never again
    expect(asPassive).toBeLessThanOrEqual(2);
    expect(perMag).toBeGreaterThan(asPassive);
  });

  it('fires once per magazine — not once per shot (discriminates vs shotFired, ammo 6)', () => {
    const perMag = defApplies(BASE).length;
    const perShot = defApplies(R_DEF_SHOT).length;
    expect(perMag).toBeGreaterThan(0);
    // 6-round magazine: a per-shot trigger fires ~6x as often. Band is cadence-free —
    // it only asserts the shipped model is the per-magazine one.
    expect(perShot / perMag).toBeGreaterThan(3);
    expect(perShot / perMag).toBeLessThan(10);
  });

  it('carries SECONDS semantics — not a round count, not permanent', () => {
    const applies = defApplies(BASE);
    expect(applies.length).toBeGreaterThan(0);
    for (const e of applies) {
      expect(e.durationShots).toBeUndefined(); // "for 5 sec", never "for N round(s)"
      expect(Number.isFinite(e.expiresFrame)).toBe(true); // never a permanent self buff
    }
  });

  it('is damage-inert as shipped, yet genuinely live (stat-swap moves the board)', () => {
    // inertness: self DEF changes no damage in v1 (nobody takes damage)
    expect(anchorTotal(R_DEF_OFF)).toBe(anchorTotal(BASE));
    expect(teammates(R_DEF_OFF)).toEqual(teammates(BASE));
    // non-vacuity: the same buff re-stated as ATK ▲ 23.82% DOES move her — so the inertness
    // above is a property of the STAT, not of a buff that never landed.
    expect(anchorTotal(R_DEF_ATK)).toBeGreaterThan(anchorTotal(BASE));
    // and it is self-scoped: teammates never see it under either encoding
    expect(teammates(R_DEF_ATK)).toEqual(teammates(BASE));
  });
});

describe('anchor — skill1: Taunt for 5 sec (the target)', () => {
  it.skip('GAP: taunt/aggro redirection has no engine primitive, and the scope-lock boss deals no damage — unobservable in v1', () => {
    // Requires an enemy aggro/threat model. Nothing to assert until one exists.
  });

  it('is not fabricated as a stun or any damage-bearing effect', () => {
    // A taunt is not a stun (stun suppresses the target\'s own actions); encoding it as one
    // would be an invented mechanic even though it happens to be inert on this boss.
    expect(allEffects(SHIPPED).some((e) => e.kind === 'stun')).toBe(false);
    expect(allEffects(SHIPPED).some((e) => e.kind === 'targetStatus')).toBe(false);
  });

  it('is recorded as a deliberate no-drop rather than silently omitted', () => {
    expect(proseOf(SHIPPED)).toContain('taunt');
  });
});

describe('anchor — skill2: damage to enemy projectiles ▲ 25.6% (start of battle, self)', () => {
  it.skip('GAP: the sim has no enemy-projectile entity, so intercept damage is out of the engine domain', () => {
    // Requires modeling boss projectiles as damageable targets. Not a v1 surface.
  });

  it('is not re-scoped into a generic or RL-flavored damage buff', () => {
    // The trap: "damage dealt to that projectile" reads like an RL line, so the nearest-wrong
    // model is projectileExplosionPct/attackDamagePct 25.6 — which boosts HER OWN rockets, a
    // completely different mechanic that would inflate every normal attack.
    const numeric = allEffects(SHIPPED).filter(
      (e) => e.value === 25.6 || e.atkPct === 25.6,
    );
    expect(numeric).toEqual([]);
    const s2Stats = effectsOf(SHIPPED, 'skill2').map((e) => e.stat);
    expect(s2Stats).not.toContain('projectileExplosionPct');
    expect(s2Stats).not.toContain('attackDamagePct');
    expect(s2Stats).not.toContain('atkPct');
  });

  it('leaves skill2 board-inert, and the check is non-vacuous', () => {
    // stripping skill2 entirely must change nothing at all
    expect(totals(R_S2_OFF.res)).toEqual(totals(BASE.res));
    // sensitivity: a 25.6% Damage-Up buff on anchor WOULD have moved her, so the equality
    // above is a real constraint on the model rather than a numb fixture.
    expect(anchorTotal(R_DMG_PROBE)).toBeGreaterThan(anchorTotal(BASE));
  });

  it('is recorded as a deliberate no-drop rather than silently omitted', () => {
    expect(proseOf(SHIPPED)).toContain('projectile');
  });
});

describe('anchor — burst: 304.45% of final ATK as Burst Skill damage (all enemies)', () => {
  it('is a burstCast flatDamage of 304.45% on the enemy, with no core strike', () => {
    const block = blocksOf(SHIPPED, 'burst').find((b) =>
      (b.effects ?? []).some((e) => e.kind === 'flatDamage'),
    );
    expect(block, 'burst must carry the 304.45% damage instance').toBeDefined();
    expect(block?.trigger?.kind).toBe('burstCast');
    expect(block?.target?.kind).toBe('enemy');
    const hits = (block?.effects ?? []).filter((e) => e.kind === 'flatDamage');
    expect(hits).toHaveLength(1); // one boss => one instance; "all enemies" is not a multiplier
    expect(hits[0]?.atkPct).toBeCloseTo(304.45, 5);
    expect(hits[0]?.core).not.toBe(true); // the kit never says "core strike damage"
  });

  it('actually fires in this fixture and scales exactly linearly with atkPct', () => {
    // Scaling (never removing) the hit keeps the impact COUNT — and therefore burst-gauge
    // generation, rotation and FB timing — byte-identical across all three runs, so the
    // deltas isolate the burst instance itself.
    const up = anchorTotal(R_B_DOUBLE) - anchorTotal(BASE); // = 1.0x the shipped contribution
    const down = anchorTotal(BASE) - anchorTotal(R_B_HALF); // = 0.5x the shipped contribution
    // NON-VACUITY: anchor is a Burst I sharing stage 1 with liter — this fails if she never casts.
    expect(down).toBeGreaterThan(0);
    expect(up / down).toBeCloseTo(2, 4);
  });

  it('does not take the Full Burst major — a burst cast lands before the window opens', () => {
    // Nearest-wrong: keying the damage to fullBurstEnter. That both over-fires (any team FB,
    // including rotations anchor never bursts on) and adds the +50% FB major.
    expect(anchorTotal(R_B_FBENTER)).toBeGreaterThan(anchorTotal(BASE));
  });

  it('burst magnitude is self-contained — teammates unmoved', () => {
    expect(teammates(R_B_DOUBLE)).toEqual(teammates(BASE));
    expect(teammates(R_B_HALF)).toEqual(teammates(BASE));
  });
});

describe('anchor — kit hygiene', () => {
  it('declares no whole-fight Pierce and no unmodelable effect kinds', () => {
    expect((SHIPPED as unknown as { hasPierce?: boolean }).hasPierce).not.toBe(true);
    const kinds = allEffects(SHIPPED).map((e) => e.kind);
    expect(kinds).not.toContain('ignored'); // validator rejects these; skips belong in `unmodeled`
    expect(kinds).not.toContain('unsupported');
  });

  it('models exactly three damage-relevant surfaces: the self DEF buff and the burst hit', () => {
    // Anchor is a Defender whose whole offensive footprint is her weapon + one burst nuke.
    // Anything else in the override is an invention this spec did not derive from the kit.
    const kinds = allEffects(SHIPPED).map((e) => e.kind).sort();
    for (const k of kinds) expect(['buff', 'flatDamage']).toContain(k);
    expect(allEffects(SHIPPED).filter((e) => e.kind === 'flatDamage')).toHaveLength(1);
  });
});
