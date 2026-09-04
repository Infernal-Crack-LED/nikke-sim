/**
 * aigis — per-unit kit spec, authored BLIND from the kit prose alone (S5 cross-family).
 *
 * KIT (prose, L10):
 *   S1 Persona - Palladion — 'Activates at the start of battle. Affects self.' Continuous, cannot
 *     be removed. Tarukaja: ATK ▲21.12%. Rakukaja: DEF ▲21.12%.
 *   S2 Papillon Heart — 'Activates when using Burst Skill as long as this unit is still alive.'
 *     Affects ALL ALLIES: Matarukaja ATK ▲21.12% OF THE SKILL USER'S ATK; Marakukaja DEF ▲21.12%
 *     of the skill user's DEF. Deactivation condition: when Full Burst ends.
 *   Burst — Affects all enemies. Deals 396% of final ATK as distributed damage.
 *   Base: SMG/Iron/Supporter/Burst II, cd 20s, ammo 120, hitsPerShot 2.
 *
 * FIXTURE: controlComp('aigis', true) — liter B1 / crown B2 / aigis / helm B3, so the chain
 * completes and aigis (a Burst II) actually gets stage-2 casts. A lone B3 (or a chain with no B3)
 * makes ZERO Full Bursts and every S2 assertion here would be vacuous, so the first test asserts
 * the fixture really exercises both her burst cast AND a Full Burst before anything else runs.
 *
 * WHY EACH ASSERTION DISCRIMINATES (nearest-wrong model in brackets):
 *  - S1 scope: every atkPct/defPct application at 21.12 must land on aigis ONLY [allies-scoped S1].
 *  - S1 liveness + basis: zeroing her S1 ATK drops HER damage and leaves every teammate
 *    byte-identical — which also pins the S2 caster-scaling to STATIC ATK [effective-ATK basis,
 *    where an S1 change would ripple into the team grant].
 *  - S2 stat identity: 'of the skill user's ATK' must emit as casterAtkPct, FLAT-resolved
 *    (a large ATK number), not the raw 21.12 percentage [target-scaled atkPct 21.12].
 *  - S2 trigger identity: her grant must appear in the event stream BEFORE the first
 *    fullBurstStart, because a burst CAST precedes FB entry by the chain gap. The same probe is
 *    run against a patched fullBurstEnter build to prove it has discriminating power (there the
 *    grant lands AFTER the FB opens) [full-burst-enter keying, which over-credits every rotation
 *    some OTHER unit completes the chain].
 *  - S2 duration: 'Deactivation condition: when Full Burst ends' bounds the window on BOTH sides —
 *    a permanent variant must beat the shipped model and a 0.5s variant must lose to it
 *    [the 'continuously / cannot be removed' wording read as whole-fight permanence].
 *  - Burst: zero / shipped / doubled atkPct must be linear, so the 396% is a plain
 *    percent-of-final-ATK instance with no extra term; its hits must resolve OUTSIDE Full Burst
 *    (burst-cast damage lands before the FB window opens, so no +50% major); and a
 *    distributedDamagePct probe injected on her own S1 must lift it, which only happens if the
 *    hit carries the distributed flavor [untagged flatDamage].
 *
 * SHAPE NOTE: the packet documents the override file two ways (slot arrays of Block vs slots as
 * CharacterSkills carrying .blocks). blocksOf() handles both by reference, so the counterfactual
 * patches work under either shape rather than silently mutating nothing.
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

const SLUG = 'aigis';
const KIT_PCT = 21.12;

type Comp = ReturnType<typeof controlComp>;
// ADAPTED (driver, 2026-09-03 — the only change besides one quote fix): the blind fixture
// controlComp('aigis', true) = liter / crown / aigis / helm benches aigis behind crown in the stage-2
// slot (both 20s cd; first-ready → slot order), so she never casts and every S2/burst assertion runs
// against an empty event set. This comp keeps the same shape with her as the sole Burst II and two
// alternating Burst IIIs so every rotation reaches Full Burst.
const aigisComp = (): Comp => ({
  slugs: ['liter', 'aigis', 'scarlet', 'helm'],
  bossElement: 'Fire' as const,
  focusSlug: 'scarlet',
});

interface Ev {
  kind: string;
  stat?: string;
  key?: string;
  value?: number;
  targetSlug?: string;
  casterIdx?: number | null;
  targetIdx?: number | null;
  expiresFrame?: number;
  bucket?: string;
  inFullBurst?: boolean;
}

interface LooseEffect {
  kind: string;
  stat?: string;
  value?: number;
  atkPct?: number;
  durationSec?: number;
}

interface LooseBlock {
  slot?: string;
  trigger?: { kind: string; stage?: number };
  target?: { kind: string };
  effects?: LooseEffect[];
}

function blocksOf(ov: unknown, slot: 'skill1' | 'skill2' | 'burst'): LooseBlock[] {
  const s = (ov as Record<string, unknown>)[slot];
  if (!s) return [];
  if (Array.isArray(s)) return s as LooseBlock[];
  const inner = (s as { blocks?: unknown }).blocks;
  return Array.isArray(inner) ? (inner as LooseBlock[]) : [];
}

function effectsOf(bs: LooseBlock[]): LooseEffect[] {
  return bs.flatMap((b) => b.effects ?? []);
}

function withOv(patched: unknown): Comp {
  const opts = aigisComp() as unknown as Record<string, unknown>;
  opts.overrides = {
    ...((opts.overrides as Record<string, unknown>) ?? {}),
    [SLUG]: patched,
  };
  return opts as unknown as Comp;
}

function collect(opts: Comp) {
  const events: Ev[] = [];
  const o = opts as unknown as Record<string, unknown>;
  o.cfg = {
    ...((o.cfg as Record<string, unknown>) ?? {}),
    onEvent: (ev: SimEvent) => {
      events.push(ev as unknown as Ev);
    },
  };
  const res = runComp(o as unknown as Comp);
  return { res, events, t: totals(res) };
}

const allySum = (t: Record<string, number>) =>
  Object.entries(t)
    .filter(([k]) => k !== SLUG)
    .reduce((a, [, v]) => a + v, 0);

// The S2 team grant: 'x% of the skill user's ATK' must ride the caster-scaled stat, which the
// engine emits FLAT-resolved. No other unit in the control comp grants casterAtkPct, and the
// value-uniformity assertion below would catch it if one did.
const casterAtk = (evs: Ev[]) =>
  evs.filter((e) => e.kind === 'buffApply' && e.stat === 'casterAtkPct');

// ---- hoisted runs (9 x 180s sims) ------------------------------------------------------------
const base = collect(aigisComp());

const s1AtkOff = collect(
  withOv(
    withPatchedOverride(SLUG, (ov) => {
      for (const e of effectsOf(blocksOf(ov, 'skill1'))) {
        if (e.stat === 'atkPct') e.value = 0;
      }
    }),
  ),
);

const defOff = collect(
  withOv(
    withPatchedOverride(SLUG, (ov) => {
      for (const slot of ['skill1', 'skill2', 'burst'] as const) {
        for (const e of effectsOf(blocksOf(ov, slot))) {
          if (e.stat === 'defPct') e.value = 0;
        }
      }
    }),
  ),
);

const s2Permanent = collect(
  withOv(
    withPatchedOverride(SLUG, (ov) => {
      for (const e of effectsOf(blocksOf(ov, 'skill2'))) {
        if (e.kind === 'buff') e.durationSec = 999;
      }
    }),
  ),
);

const s2Short = collect(
  withOv(
    withPatchedOverride(SLUG, (ov) => {
      for (const e of effectsOf(blocksOf(ov, 'skill2'))) {
        if (e.kind === 'buff') e.durationSec = 0.5;
      }
    }),
  ),
);

const s2FbEnter = collect(
  withOv(
    withPatchedOverride(SLUG, (ov) => {
      for (const b of blocksOf(ov, 'skill2')) b.trigger = { kind: 'fullBurstEnter' };
    }),
  ),
);

const burstOff = collect(
  withOv(
    withPatchedOverride(SLUG, (ov) => {
      for (const e of effectsOf(blocksOf(ov, 'burst'))) {
        if (e.kind === 'flatDamage') e.atkPct = 0;
      }
    }),
  ),
);

const burstDouble = collect(
  withOv(
    withPatchedOverride(SLUG, (ov) => {
      for (const e of effectsOf(blocksOf(ov, 'burst'))) {
        if (e.kind === 'flatDamage' && typeof e.atkPct === 'number') e.atkPct *= 2;
      }
    }),
  ),
);

// Distributed-flavor probe: a self-only Distributed Damage buff can only move her total if the
// burst hit is flavored 'distributed'.
const distProbe = collect(
  withOv(
    withPatchedOverride(SLUG, (ov) => {
      blocksOf(ov, 'skill1').push({
        slot: 'skill1',
        trigger: { kind: 'passive' },
        target: { kind: 'self' },
        effects: [{ kind: 'buff', stat: 'distributedDamagePct', value: 100 }],
      });
    }),
  ),
);

describe('aigis — fixture', () => {
  it('exercises BOTH her own burst cast and a Full Burst (non-vacuity gate)', () => {
    expect(base.events.some((e) => e.kind === 'fullBurstStart')).toBe(true);
    // S2 fires only on her own cast, so its presence proves the fixture gives her stage 2.
    expect(casterAtk(base.events).length).toBeGreaterThan(0);
    expect(unitOf(base.res, SLUG).totalDamage).toBe(base.t[SLUG]);
  });
});

describe('aigis — skill1 Persona - Palladion (battle start, self)', () => {
  it('Tarukaja ATK ▲21.12% lands on aigis and on NO teammate', () => {
    const hits = base.events.filter(
      (e) => e.kind === 'buffApply' && e.stat === 'atkPct' && e.value === KIT_PCT,
    );
    expect(hits.length).toBeGreaterThan(0);
    expect(new Set(hits.map((e) => e.targetSlug))).toEqual(new Set([SLUG]));
  });

  it('Tarukaja is LIVE for her own damage and inert for the team (static caster basis)', () => {
    expect(s1AtkOff.t[SLUG]).toBeLessThan(base.t[SLUG]);
    for (const [slug, v] of Object.entries(base.t)) {
      if (slug !== SLUG) expect(s1AtkOff.t[slug]).toBe(v);
    }
  });

  it('Rakukaja DEF ▲21.12% is recorded on self and moves no damage', () => {
    const hits = base.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.stat === 'defPct' &&
        e.value === KIT_PCT &&
        e.targetSlug === SLUG,
    );
    expect(hits.length).toBeGreaterThan(0);
    for (const [slug, v] of Object.entries(base.t)) expect(defOff.t[slug]).toBe(v);
  });
});

describe('aigis — skill2 Papillon Heart (own burst cast, all allies)', () => {
  it('grants ATK of the SKILL USER to every ally including self, flat-resolved', () => {
    const g = casterAtk(base.events);
    const slugs = new Set(g.map((e) => e.targetSlug));
    expect(slugs.has(SLUG)).toBe(true);
    expect(slugs.size).toBe(Object.keys(base.t).length);
    expect(g.length % slugs.size).toBe(0);
    const values = new Set(g.map((e) => e.value));
    expect(values.size).toBe(1);
    const v = g[0].value as number;
    // 21.12% OF THE CASTER'S ATK — a flat ATK add (~2.08e4 at a scope-lock Supporter sheet),
    // never the raw percentage a target-scaled atkPct encoding would emit.
    expect(v).not.toBe(KIT_PCT);
    expect(v).toBeGreaterThan(1000);
  });

  it('is keyed to her OWN burst cast, not Full Burst entry', () => {
    const iBuff = base.events.findIndex(
      (e) => e.kind === 'buffApply' && e.stat === 'casterAtkPct',
    );
    const iFb = base.events.findIndex((e) => e.kind === 'fullBurstStart');
    expect(iBuff).toBeGreaterThanOrEqual(0);
    expect(iFb).toBeGreaterThanOrEqual(0);
    expect(iBuff).toBeLessThan(iFb);

    // the same probe run against the nearest-wrong build: it lands AFTER the FB opens there,
    // which is what makes the ordering above a real discriminator rather than a tautology.
    const jBuff = s2FbEnter.events.findIndex(
      (e) => e.kind === 'buffApply' && e.stat === 'casterAtkPct',
    );
    const jFb = s2FbEnter.events.findIndex((e) => e.kind === 'fullBurstStart');
    expect(jBuff).toBeGreaterThan(jFb);
  });

  it('the window is BOUNDED (deactivates when Full Burst ends), not whole-fight', () => {
    expect(allySum(s2Permanent.t)).toBeGreaterThan(allySum(base.t));
    expect(allySum(s2Short.t)).toBeLessThan(allySum(base.t));
  });

  it.skip('Marakukaja: DEF ▲21.12% of the skill user’s DEF — GAP: no caster-scaled DEF primitive (no casterDefPct StatKey; defPct is target-scaled and offensively inert), so the ally DEF grant is not expressible and is damage-neutral at scope', () => {});
});

describe('aigis — burst (all enemies, 396% of final ATK, distributed)', () => {
  it('is a linear percent-of-final-ATK instance', () => {
    const zero = burstOff.t[SLUG];
    const one = base.t[SLUG];
    const two = burstDouble.t[SLUG];
    expect(one).toBeGreaterThan(zero);
    expect((two - one) / (one - zero)).toBeCloseTo(1, 2);
  });

  it('moves only aigis (no team-side coupling)', () => {
    for (const [slug, v] of Object.entries(base.t)) {
      if (slug !== SLUG) expect(burstDouble.t[slug]).toBe(v);
    }
  });

  it('resolves BEFORE Full Burst opens (no +50% full-burst major)', () => {
    const hits = base.events.filter((e) => e.kind === 'damage' && e.bucket === 'burst');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((e) => e.inFullBurst === false)).toBe(true);
  });

  it('is Distributed-flavored (a Distributed Damage ▲ buff feeds it)', () => {
    expect(distProbe.t[SLUG]).toBeGreaterThan(base.t[SLUG]);
    for (const [slug, v] of Object.entries(base.t)) {
      if (slug !== SLUG) expect(distProbe.t[slug]).toBe(v);
    }
  });
});
