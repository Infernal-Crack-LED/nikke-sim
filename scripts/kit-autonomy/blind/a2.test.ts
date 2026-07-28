/**
 * A2 (`a2`) — BLIND kit spec test (S5 cross-family). Written from the kit prose ALONE.
 *
 * KIT (RL/Fire/Attacker/Burst III, cd 40s, ammo 6, chargeFrames 60, hitsPerShot 1):
 *   skill1 — activation clause: 'when using Burst Skill', affects self.
 *            Charge Damage +110.44% for 15 sec; Explosion Radius +100.74% for 15 sec.
 *   skill2 — activation clause: 'when hitting a target with Full Charge', affects the target.
 *            Deals 30.1% of final ATK as additional damage.
 *          — same activation, affects self: Damage to Parts +40.88% for 3 sec.
 *   burst  — affects self, Mode B: Current HP -3.99% every 1 sec; ATK +15.19%;
 *            Charge Speed +35.88%. Mode B is removed once own HP dips below 40%.
 *
 * FIXTURE: controlComp('a2', true) — liter B1 / crown B2 / a2 B3 / helm B3. B1+B2 are mandatory
 * (a lone Burst III makes ZERO full bursts, so every burst-keyed line would be vacuous). The SECOND
 * Burst III (helm) is deliberately KEPT: it is what makes 'owner casts her burst' and 'the team
 * enters Full Burst' separable, which is the only way the skill1 trigger-identity assertion can
 * discriminate. Deterministic (no seed).
 *
 * DERIVATIONS
 *  - Mode B window (FLAGGED, not in the kit text): the drain is on CURRENT HP, so HP(t) = 0.9601^t
 *    and the stated <40% self-removal is crossed at ln(0.4)/ln(0.9601) ~= 22.5 s. The Mode B buffs
 *    are therefore a FINITE ~22.5 s window — not permanent, and not skill1's 15 s. Asserted as a
 *    band [10,30] s so any honest derivation passes and only a permanent / fight-long model fails.
 *  - v1 models no HP pool, so the -3.99%/s drain itself is unobservable (it.skip); its ONLY
 *    damage-side consequence is that window length, which is asserted above.
 *  - Explosion Radius has no engine primitive and the scope-lock boss is a single partless target,
 *    so it is a GAP (it.skip) — but the test asserts it was NOT laundered into a damage stat.
 *
 * SHAPE DEFENCE: the packet documents two override-file layouts (slot -> Block[] and
 * slot -> { blocks: Block[] }), so blocksOf() accepts both. Every structural assertion reads the
 * COMMITTED override through withPatchedOverride (an in-memory clone; disk untouched).
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

const SLUG = 'a2';

type Comp = ReturnType<typeof controlComp>;
type Slot = 'skill1' | 'skill2' | 'burst';

interface LooseEffect {
  kind: string;
  stat?: string;
  value?: number;
  atkPct?: number;
  durationSec?: number;
  core?: boolean;
  noFb?: boolean;
}
interface LooseBlock {
  trigger?: { kind: string; count?: number };
  target?: { kind: string };
  effects?: LooseEffect[];
}
interface BuffEv {
  kind: string;
  stat?: string;
  value?: number;
  targetSlug?: string;
  expiresFrame?: number;
}

function blocksOf(ov: unknown, slot: Slot): LooseBlock[] {
  const s = (ov as Record<string, unknown>)[slot];
  if (!s) {
    return [];
  }
  if (Array.isArray(s)) {
    return s as LooseBlock[];
  }
  const inner = (s as { blocks?: unknown }).blocks;
  return Array.isArray(inner) ? (inner as LooseBlock[]) : [];
}
const effectsOf = (ov: unknown, slot: Slot): LooseEffect[] =>
  blocksOf(ov, slot).flatMap((b) => b.effects ?? []);
const allEffects = (ov: unknown): LooseEffect[] =>
  (['skill1', 'skill2', 'burst'] as Slot[]).flatMap((s) => effectsOf(ov, s));

const near = (a: number | undefined, b: number, tol = 0.5): boolean =>
  typeof a === 'number' && Math.abs(a - b) <= tol;
const carriesBuff = (b: LooseBlock, v: number): boolean =>
  (b.effects ?? []).some((e) => near(e.value, v));
const carriesFlat = (b: LooseBlock, v: number): boolean =>
  (b.effects ?? []).some((e) => e.kind === 'flatDamage' && near(e.atkPct, v));

/** the committed override, read as an in-memory clone (never mutated on disk) */
const OV = withPatchedOverride(SLUG, () => {});

function withOv(patched: unknown): Comp {
  const comp = controlComp(SLUG, true) as unknown as Record<string, unknown>;
  const existing = (comp.overrides as Record<string, unknown>) ?? {};
  return {
    ...comp,
    overrides: { ...existing, [SLUG]: patched },
  } as unknown as Comp;
}

function run(comp: Comp) {
  const events: SimEvent[] = [];
  const cfg = (comp as unknown as { cfg?: Record<string, unknown> }).cfg ?? {};
  const res = runComp({
    ...comp,
    cfg: { ...cfg, onEvent: (ev: SimEvent) => events.push(ev) },
  } as unknown as Comp);
  const kinds = events as unknown as { kind: string }[];
  return {
    res,
    total: totals(res)[SLUG],
    damageEvents: kinds.filter((e) => e.kind === 'damage').length,
    fullBursts: kinds.filter((e) => e.kind === 'fullBurstStart').length,
    buffs: events.filter(
      (e) => (e as unknown as { kind: string }).kind === 'buffApply'
    ) as unknown as BuffEv[],
  };
}

function allies(res: ReturnType<typeof runComp>): Record<string, number> {
  const t = totals(res);
  const out: Record<string, number> = {};
  for (const k of Object.keys(t)) {
    if (k !== SLUG) {
      out[k] = t[k];
    }
  }
  return out;
}

// ---------------------------------------------------------------- hoisted runs (9 sims)
const base = run(controlComp(SLUG, true));

const noChargeDmg = run(
  withOv(
    withPatchedOverride(SLUG, (ov: unknown) => {
      for (const b of blocksOf(ov, 'skill1')) {
        b.effects = (b.effects ?? []).filter((e) => !near(e.value, 110.44));
      }
    })
  )
);

const skill1OnBurstCast = run(
  withOv(
    withPatchedOverride(SLUG, (ov: unknown) => {
      for (const b of blocksOf(ov, 'skill1')) {
        if (carriesBuff(b, 110.44)) {
          b.trigger = {
            ...(b.trigger ?? { kind: 'burstCast' }),
            kind: 'burstCast',
          };
        }
      }
    })
  )
);

const skill1OnFbEnter = run(
  withOv(
    withPatchedOverride(SLUG, (ov: unknown) => {
      for (const b of blocksOf(ov, 'skill1')) {
        if (carriesBuff(b, 110.44)) {
          b.trigger = { kind: 'fullBurstEnter' };
        }
      }
    })
  )
);

const noRider = run(
  withOv(
    withPatchedOverride(SLUG, (ov: unknown) => {
      for (const b of blocksOf(ov, 'skill2')) {
        b.effects = (b.effects ?? []).filter(
          (e) => !(e.kind === 'flatDamage' && near(e.atkPct, 30.1))
        );
      }
    })
  )
);

const riderEvery2 = run(
  withOv(
    withPatchedOverride(SLUG, (ov: unknown) => {
      for (const b of blocksOf(ov, 'skill2')) {
        if (carriesFlat(b, 30.1)) {
          b.trigger = { kind: 'hitCount', count: 2 };
        }
      }
    })
  )
);

const noParts = run(
  withOv(
    withPatchedOverride(SLUG, (ov: unknown) => {
      for (const b of blocksOf(ov, 'skill2')) {
        b.effects = (b.effects ?? []).filter((e) => !near(e.value, 40.88));
      }
    })
  )
);

const noBurstAtk = run(
  withOv(
    withPatchedOverride(SLUG, (ov: unknown) => {
      for (const b of blocksOf(ov, 'burst')) {
        b.effects = (b.effects ?? []).filter((e) => !near(e.value, 15.19));
      }
    })
  )
);

const noChargeSpeed = run(
  withOv(
    withPatchedOverride(SLUG, (ov: unknown) => {
      for (const b of blocksOf(ov, 'burst')) {
        b.effects = (b.effects ?? []).filter((e) => !near(e.value, 35.88));
      }
    })
  )
);

// ---------------------------------------------------------------- fixture non-vacuity
describe('a2 — fixture', () => {
  it('runs a2 as the Burst III carry with real full bursts and real damage', () => {
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
    // B1 + B2 present => the chain actually completes; a lone B3 would give 0.
    expect(base.fullBursts).toBeGreaterThanOrEqual(2);
  });

  it('a2 actually casts her own burst more than once (burst-keyed lines are non-vacuous)', () => {
    const casts = base.buffs.filter(
      (b) => b.stat === 'chargeDamagePct' && near(b.value, 110.44)
    );
    expect(casts.length).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------- skill1
describe('a2 skill1 — Charge Damage +110.44% for 15 sec on own burst cast', () => {
  it('is a chargeDamagePct buff of 110.44 for 15 s, not a charge-damage MULTIPLIER', () => {
    const hits = allEffects(OV).filter((e) => near(e.value, 110.44));
    expect(hits).toHaveLength(1);
    // nearest-wrong: chargeDamageMultPct scales BASE charge damage (a true multiplier) and would
    // be a completely different magnitude than additive charge-bucket points.
    expect(hits[0].stat).toBe('chargeDamagePct');
    expect(hits[0].durationSec).toBe(15);
    expect(allEffects(OV).some((e) => e.stat === 'chargeDamageMultPct')).toBe(
      false
    );
  });

  it('is keyed to a2 OWN burst cast, not to team full-burst entry', () => {
    const carrier = blocksOf(OV, 'skill1').filter((b) =>
      carriesBuff(b, 110.44)
    );
    expect(carrier).toHaveLength(1);
    expect(carrier[0].trigger?.kind).toBe('burstCast');
    expect(carrier[0].target?.kind).toBe('self');
    // behavioural discrimination: shipped == the burstCast variant, and the fixture genuinely
    // separates the two triggers (second B3 in the comp + the pre-FB cast offset).
    expect(base.total).toBe(skill1OnBurstCast.total);
    expect(base.total).not.toBe(skill1OnFbEnter.total);
  });

  it('is live and self-scoped (a2 loses damage without it; allies never receive it)', () => {
    expect(noChargeDmg.total).toBeLessThan(base.total);
    const applied = base.buffs.filter(
      (b) => b.stat === 'chargeDamagePct' && near(b.value, 110.44)
    );
    expect(applied.length).toBeGreaterThanOrEqual(2);
    for (const b of applied) {
      expect(b.targetSlug).toBe(SLUG);
    }
    // inertness: a self charge-damage buff moves no teammate byte.
    expect(allies(noChargeDmg.res)).toEqual(allies(base.res));
  });

  it.skip('GAP: Explosion Radius +100.74% for 15 sec — no radius primitive; boss is a single partless target', () => {
    // Unobservable payload: radius only matters with multiple/AoE targets. Recorded as unmodeled.
  });

  it('does NOT launder Explosion Radius into a damage stat', () => {
    // nearest-wrong: encoding 100.74 as projectileExplosionPct (an RL Damage-Up stat) would be a
    // pure fudge and would inflate every a2 shot for 15 s per burst.
    expect(allEffects(OV).some((e) => near(e.value, 100.74))).toBe(false);
    expect(
      allEffects(OV).some((e) => e.stat === 'projectileExplosionPct')
    ).toBe(false);
  });
});

// ---------------------------------------------------------------- skill2
describe('a2 skill2 — 30.1% of final ATK rider on every Full-Charge hit', () => {
  it('is a flatDamage rider of 30.1% with no core strike and no FB exemption', () => {
    const flats = effectsOf(OV, 'skill2').filter(
      (e) => e.kind === 'flatDamage' && near(e.atkPct, 30.1)
    );
    expect(flats).toHaveLength(1);
    // the text never says 'core strike', so the rider must not take the core bucket;
    // riders take Full Burst by landing timing, so noFb must not be set.
    expect(flats[0].core).not.toBe(true);
    expect(flats[0].noFb).not.toBe(true);
    const carrier = blocksOf(OV, 'skill2').filter((b) => carriesFlat(b, 30.1));
    expect(carrier).toHaveLength(1);
    expect(carrier[0].target?.kind).toBe('enemy');
  });

  it('fires ONCE PER full-charge shot, not per magazine and not per burst', () => {
    // Removing only the flatDamage effect removes exactly its damage events, so the event-count
    // delta IS the rider's fire count (gauge is per-shot, so rotation is untouched).
    const fires = base.damageEvents - noRider.damageEvents;
    const halfFires = riderEvery2.damageEvents - noRider.damageEvents;
    // a2's RL cycle is ~1.37 s/shot + 1.85 s reload per 6 => ~100+ shots in 180 s.
    // lastBullet keying would give ~18, burstCast ~4 — both fail this floor.
    expect(fires).toBeGreaterThan(60);
    expect(halfFires).toBeGreaterThan(20);
    // nearest-wrong cadence check: per-shot must be ~2x an every-2-hits keying.
    expect(fires / halfFires).toBeGreaterThan(1.6);
    expect(fires / halfFires).toBeLessThan(2.4);
  });

  it('is live and touches no teammate', () => {
    expect(noRider.total).toBeLessThan(base.total);
    expect(allies(noRider.res)).toEqual(allies(base.res));
  });
});

describe('a2 skill2 — Damage to Parts +40.88% for 3 sec (self)', () => {
  it('is partsDamagePct for 3 s — kept for completeness, provably inert on a partless boss', () => {
    const hits = allEffects(OV).filter((e) => near(e.value, 40.88));
    expect(hits).toHaveLength(1);
    expect(hits[0].stat).toBe('partsDamagePct');
    expect(hits[0].durationSec).toBe(3);
    // The behavioural half of the same claim: had it been encoded as attackDamagePct /
    // coreDamagePct / critDamagePct (the nearest-wrong readings), deleting it would MOVE damage.
    expect(noParts.total).toBe(base.total);
    expect(allies(noParts.res)).toEqual(allies(base.res));
  });

  it('is applied to a2 herself, repeatedly, off the full-charge trigger', () => {
    const applied = base.buffs.filter(
      (b) => b.stat === 'partsDamagePct' && near(b.value, 40.88)
    );
    expect(applied.length).toBeGreaterThanOrEqual(1);
    for (const b of applied) {
      expect(b.targetSlug).toBe(SLUG);
    }
  });
});

// ---------------------------------------------------------------- burst (Mode B)
describe('a2 burst — Mode B: ATK +15.19% / Charge Speed +35.88% (self)', () => {
  it('grants both stats to a2 only, on her own burst cast', () => {
    const atk = allEffects(OV).filter((e) => near(e.value, 15.19));
    const chs = allEffects(OV).filter((e) => near(e.value, 35.88));
    expect(atk).toHaveLength(1);
    expect(chs).toHaveLength(1);
    // self ATK => atkPct (a plain percentage stat), NOT casterAtkPct/highestAllyAtkPct (which would
    // flat-resolve and be an ally-grant shape).
    expect(atk[0].stat).toBe('atkPct');
    expect(chs[0].stat).toBe('chargeSpeedPct');
    for (const b of blocksOf(OV, 'burst')) {
      if (carriesBuff(b, 15.19) || carriesBuff(b, 35.88)) {
        expect(b.trigger?.kind).toBe('burstCast');
        expect(b.target?.kind).toBe('self');
      }
    }
    const applied = base.buffs.filter(
      (b) => b.stat === 'atkPct' && near(b.value, 15.19)
    );
    expect(applied.length).toBeGreaterThanOrEqual(2);
    for (const b of applied) {
      expect(b.targetSlug).toBe(SLUG);
    }
  });

  it('FLAGGED (derived): Mode B is a FINITE window (~22.5 s), never permanent', () => {
    // HP(t) = 0.9601^t crosses the stated 40% self-removal at ln(0.4)/ln(0.9601) ~= 22.5 s.
    // Band [10,30] accepts any honest derivation; a permanent / passive-mode model fails.
    for (const v of [15.19, 35.88]) {
      const e = allEffects(OV).find((x) => near(x.value, v));
      expect(e?.durationSec).toBeDefined();
      expect(e?.durationSec).toBeGreaterThanOrEqual(10);
      expect(e?.durationSec).toBeLessThanOrEqual(30);
    }
  });

  it('ATK +15.19% is live and self-only (no teammate byte moves)', () => {
    expect(noBurstAtk.total).toBeLessThan(base.total);
    expect(allies(noBurstAtk.res)).toEqual(allies(base.res));
  });

  it('Charge Speed +35.88% is a real weapon-state modifier — it gates shots fired', () => {
    // Charge speed is NOT cosmetic: fewer charges => fewer shots => less damage (and less gauge,
    // so teammate inertness is deliberately NOT asserted here).
    expect(noChargeSpeed.total).toBeLessThan(base.total);
  });

  it.skip('GAP: Current HP -3.99% every 1 sec — v1 models no HP pool', () => {
    // The drain has no damage payload of its own; its only consequence is the Mode B window
    // length, which is asserted above as the derived ~22.5 s.
  });
});
