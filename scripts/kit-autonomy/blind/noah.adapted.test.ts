// ADAPTED-COPY of blind/noah.test.ts (the pristine S5 artifact, claude-opus-5) for execution
// against the DRIVER override. Structural fixes ONLY (ade-agent-bunny precedent):
//   1. harness import path '../lib/harness.js' -> '../../tests/lib/harness.js'
//   2. fixture-selection predicate keyed to HER buff value (author intent: 'the first that
//      actually shows her burst buff'): crown (CONTROL_CORE) emits her own defPct 37.44 at
//      every Full Burst, so the pristine defApplies.length>0 predicate selected candidate 1
//      even though noah never cast there. Fix: .some(e => e.value === DEF_PCT).
//   3. defApplies reader scoped to noah's casterIdx (author premise 'defPct events originate
//      only from noah' is false: crown's documented non-caster grant fires at every Full Burst).
//      Caster attribution preserves every assertion's intent (all are about HER channel).
// Assertion intent untouched.
/**
 * noah - blind kit spec (S5 cross-family post-op). Written from the kit prose ALONE.
 *
 * KIT PROSE (ground truth):
 *   skill1  '10% chance of activating when attacked' / all allies / 'Damage Taken -8% for 10 sec'
 *   skill2  'when hitting a target with a Full Charge attack' / the target / 'Taunt for 2 sec'
 *           + 'ATK -13.25% for 5 sec'
 *   burst   self:       'Attract: Taunt all enemies for 10 sec'
 *           all allies: 'Invulnerable for 3 sec' + 'DEF +133.48% for 10 sec'
 *   Base: RL / Wind / Defender / Burst II, cd 40s, ammo 6, chargeFrames 60, hitsPerShot 2.
 *
 * noah is a pure-defensive Defender. The ONLY kit line the v1 engine can carry is the burst
 * DEF +133.48% / 10 sec ally buff, and defPct is DAMAGE-INERT in v1 - it is kept for kit
 * completeness / a future HP-or-DEF scaler consumer (failure-mode taxonomy item 7). Every other
 * line is unobservable at scope lock: no incoming boss damage (so 'when attacked' never fires and
 * an ALLY-scoped 'Damage Taken -8%' has no consumer), no enemy entity (so an enemy ATK debuff is
 * inert), no aggro model (Taunt/Attract), no HP pool (Invulnerable).
 *
 * WHAT THIS FILE PROVES
 *  1. EVENT level: the burst emits a defPct buff, value exactly 133.48, to the WHOLE ally set
 *     (incl. self), for a 10 sec window that genuinely lapses - discriminated against the three
 *     nearest-wrong models (self-only target, 3 sec window borrowed from Invulnerable,
 *     full-burst-enter keying instead of own-burst-cast).
 *  2. TOTALS level: noah's kit is damage-inert - stripping every one of her blocks leaves every
 *     unit's total byte-identical, and her buff-event profile is defPct AND NOTHING ELSE.
 *  3. NON-VACUITY: injected damageTakenPct / atkPct blocks on the same fixture DO raise totals, so
 *     'byte-identical' means the channels are silent, not that the fixture is dead. This is the
 *     assertion that catches the two catastrophic mis-encodings available here - reading an ally
 *     'Damage Taken -8%' as a boss 'Damage Taken +' debuff (free team damage), or mis-scoping the
 *     enemy ATK debuff onto allies.
 *
 * FIXTURE: controlComp('noah', true). noah is Burst II while the control comp already carries a
 * fixed Burst II AHEAD of the carry slot, so the carry may never win stage 2 and a burst-cast
 * block would never fire. Three candidate fixtures are therefore run and the first one that
 * actually shows her burst buff becomes BASE; the second candidate appends a burstEligibility:3
 * block purely as a FIXTURE ENABLER (it changes WHICH stage she casts at, never what her burst
 * block does). Provenance is proved independently: strip her blocks and the defPct events vanish.
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

const SLUG = 'noah';
const DEF_PCT = 133.48;
const DEF_SEC = 10;
const CF_DEF_SEC = 3; // the Invulnerable duration - the nearest-wrong window
const FIGHT_FRAMES = 180 * 60;

// ---------------------------------------------------------------------------
// override-shape helpers (a slot is either a bare Block[] or a { blocks: [] })
// ---------------------------------------------------------------------------
type SlotName = 'skill1' | 'skill2' | 'burst';
type BlockLike = Record<string, unknown>;
type SlotVal = BlockLike[] | { blocks?: BlockLike[] } | undefined;
type OvLike = Record<SlotName, SlotVal> & {
  unmodeled?: Record<string, string[]>;
};

const asOv = (ov: unknown): OvLike => ov as OvLike;
const effectsOf = (b: BlockLike): BlockLike[] =>
  (b.effects as BlockLike[] | undefined) ?? [];

function readSlot(ov: unknown, slot: SlotName): BlockLike[] {
  const s = asOv(ov)[slot];
  if (!s) {
    return [];
  }
  return Array.isArray(s) ? s : (s.blocks ?? []);
}

function writeSlot(ov: unknown, slot: SlotName, blocks: BlockLike[]): void {
  const rec = asOv(ov);
  const s = rec[slot];
  if (s && !Array.isArray(s)) {
    s.blocks = blocks;
  } else {
    rec[slot] = blocks;
  }
}

// FIXTURE ENABLER only - lets a Burst II carry actually cast in the control comp.
function addEnabler(ov: unknown): void {
  writeSlot(ov, 'skill1', [
    ...readSlot(ov, 'skill1'),
    {
      slot: 'skill1',
      trigger: { kind: 'passive' },
      target: { kind: 'self' },
      effects: [{ kind: 'burstEligibility', stage: 3 }],
    },
  ]);
}

// ---------------------------------------------------------------------------
// event helpers
// ---------------------------------------------------------------------------
interface BuffApplyLike {
  kind: 'buffApply';
  stat: string;
  value: number;
  targetSlug?: string;
  casterIdx: number | null;
  targetIdx: number | null;
  expiresFrame?: number;
}

const buffApplies = (log: SimEvent[]): BuffApplyLike[] =>
  log.filter((e) => e.kind === 'buffApply') as unknown as BuffApplyLike[];
const NOAH_SLOT = 2; // controlComp slugs: liter / crown / noah / helm
const defApplies = (log: SimEvent[]): BuffApplyLike[] =>
  buffApplies(log).filter(
    (e) => e.stat === 'defPct' && e.casterIdx === NOAH_SLOT
  );

function statCounts(log: SimEvent[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (const e of buffApplies(log)) {
    m[e.stat] = (m[e.stat] ?? 0) + 1;
  }
  return m;
}

const firstIdx = (log: SimEvent[], pred: (e: SimEvent) => boolean): number =>
  log.findIndex(pred);
const isDefApply = (e: SimEvent): boolean =>
  e.kind === 'buffApply' && (e as unknown as BuffApplyLike).stat === 'defPct';
const sum = (m: Record<string, number>): number =>
  Object.values(m).reduce((a, b) => a + b, 0);

// ---------------------------------------------------------------------------
// run helpers (each runComp is a full 180s sim - all runs are hoisted)
// ---------------------------------------------------------------------------
type Opts = Parameters<typeof runComp>[0];
interface Run {
  res: ReturnType<typeof runComp>;
  log: SimEvent[];
}

function run(opts: Opts): Run {
  const log: SimEvent[] = [];
  const cfg = {
    ...(opts as { cfg?: Record<string, unknown> }).cfg,
    onEvent: (ev: SimEvent) => log.push(ev),
  };
  const res = runComp({ ...opts, cfg } as unknown as Opts);
  return { res, log };
}

function withNoahOverride(opts: Opts, ov: unknown): Opts {
  const prev =
    (opts as { overrides?: Record<string, unknown> }).overrides ?? {};
  return {
    ...opts,
    overrides: { ...prev, [SLUG]: ov },
  } as unknown as Opts;
}

const CANDIDATES: { name: string; opts: Opts }[] = [
  { name: 'control+helm', opts: controlComp(SLUG, true) },
  {
    name: 'control+helm+b3enabler',
    opts: withNoahOverride(
      controlComp(SLUG, true),
      withPatchedOverride(SLUG, (ov) => addEnabler(ov))
    ),
  },
  { name: 'control-helm', opts: controlComp(SLUG, false) },
];

const RUNS = CANDIDATES.map((c) => ({ ...c, run: run(c.opts) }));
// data-driven fixture selection (deterministic - no conditional skipping)
const BASE =
  RUNS.find((r) => defApplies(r.run.log).some((e) => e.value === DEF_PCT)) ??
  RUNS[0];
const USE_ENABLER = BASE.name.includes('enabler');

function patchedNoah(mutate: (ov: unknown) => void): unknown {
  return withPatchedOverride(SLUG, (ov) => {
    mutate(ov);
    if (USE_ENABLER) {
      addEnabler(ov);
    } // re-added AFTER mutate so a strip cannot remove it
  });
}
const cfRun = (mutate: (ov: unknown) => void): Run =>
  run(withNoahOverride(BASE.opts, patchedNoah(mutate)));

// nearest-wrong: 'Affects all allies' read as 'Affects self'
const SELF_RUN = cfRun((ov) => {
  for (const b of readSlot(ov, 'burst')) {
    if (effectsOf(b).some((e) => e.stat === 'defPct')) {
      b.target = { kind: 'self' };
    }
  }
});
// nearest-wrong: keyed to full-burst entry instead of her own burst cast
const FBENTER_RUN = cfRun((ov) => {
  for (const b of readSlot(ov, 'burst')) {
    if (effectsOf(b).some((e) => e.stat === 'defPct')) {
      b.trigger = { kind: 'fullBurstEnter' };
    }
  }
});
// nearest-wrong: the 3 sec Invulnerable window applied to the DEF line
const DUR3_RUN = cfRun((ov) => {
  for (const b of readSlot(ov, 'burst')) {
    for (const e of effectsOf(b)) {
      if (e.stat === 'defPct') {
        e.durationSec = CF_DEF_SEC;
      }
    }
  }
});
// whole kit removed - the inertness / provenance baseline
const STRIP_RUN = cfRun((ov) => {
  writeSlot(ov, 'skill1', []);
  writeSlot(ov, 'skill2', []);
  writeSlot(ov, 'burst', []);
});
// non-vacuity probes: these channels DO move totals on this exact fixture
const DT_RUN = cfRun((ov) => {
  writeSlot(ov, 'skill1', [
    ...readSlot(ov, 'skill1'),
    {
      slot: 'skill1',
      trigger: { kind: 'passive' },
      target: { kind: 'enemy' },
      effects: [{ kind: 'buff', stat: 'damageTakenPct', value: 8 }],
    },
  ]);
});
const ATK_RUN = cfRun((ov) => {
  writeSlot(ov, 'skill2', [
    ...readSlot(ov, 'skill2'),
    {
      slot: 'skill2',
      trigger: { kind: 'passive' },
      target: { kind: 'allies' },
      effects: [{ kind: 'buff', stat: 'atkPct', value: 13.25 }],
    },
  ]);
});

const BASE_TOTALS = totals(BASE.run.res);
const ROSTER = Object.keys(BASE_TOTALS);
const COMMITTED = withPatchedOverride(SLUG, () => {});

describe('noah burst: DEF +133.48% for 10 sec, all allies', () => {
  it('fires at all (fixture non-vacuity: she casts and she shoots)', () => {
    expect(defApplies(BASE.run.log).length).toBeGreaterThan(0);
    expect(unitOf(BASE.run.res, SLUG).totalDamage).toBeGreaterThan(0);
  });

  it('emits exactly 133.48 - not the 13.25 / 8 magnitudes elsewhere in the kit', () => {
    const applies = defApplies(BASE.run.log);
    expect(applies.map((e) => e.value)).toEqual(applies.map(() => DEF_PCT));
  });

  it('covers the WHOLE ally set including self (RED under a self-only read)', () => {
    const applies = defApplies(BASE.run.log);
    expect(new Set(applies.map((e) => e.targetIdx)).size).toBe(ROSTER.length);
    expect(applies.map((e) => e.targetSlug)).toContain(SLUG);
    // nearest-wrong: target self -> one distinct target instead of the roster
    expect(new Set(defApplies(SELF_RUN.log).map((e) => e.targetIdx)).size).toBe(
      1
    );
  });

  it('is a 10 sec window, not the 3 sec Invulnerable window', () => {
    const long = defApplies(BASE.run.log)[0];
    const short = defApplies(DUR3_RUN.log)[0];
    expect(long.expiresFrame).toBeGreaterThanOrEqual(DEF_SEC * 60);
    // same cast frame (defPct is damage-inert, so the rotation is unchanged)
    expect((long.expiresFrame ?? 0) - (short.expiresFrame ?? 0)).toBe(
      (DEF_SEC - CF_DEF_SEC) * 60
    );
  });

  it('re-applies once per ally per cast and is NOT permanent (inactive case exists)', () => {
    const applies = defApplies(BASE.run.log);
    expect(applies.length % ROSTER.length).toBe(0);
    const buffedFrames = (applies.length / ROSTER.length) * DEF_SEC * 60;
    expect(buffedFrames).toBeLessThan(FIGHT_FRAMES);
  });
});

describe('noah burst: trigger identity is her OWN burst cast', () => {
  it('applies BEFORE full burst opens (RED under a fullBurstEnter read)', () => {
    const iDef = firstIdx(BASE.run.log, isDefApply);
    const iFb = firstIdx(BASE.run.log, (e) => e.kind === 'fullBurstStart');
    expect(iFb).toBeGreaterThanOrEqual(0); // the fixture really full-bursts
    expect(iDef).toBeGreaterThanOrEqual(0);
    expect(iDef).toBeLessThan(iFb);

    const jDef = firstIdx(FBENTER_RUN.log, isDefApply);
    const jFb = firstIdx(FBENTER_RUN.log, (e) => e.kind === 'fullBurstStart');
    expect(jDef).toBeGreaterThan(jFb); // the nearest-wrong model inverts the order
  });
});

describe('noah: the kit is damage-inert (defensive Defender at scope lock)', () => {
  it('stripping every noah block leaves all totals byte-identical', () => {
    expect(totals(STRIP_RUN.res)).toEqual(BASE_TOTALS);
  });

  it('...and that inertness is not vacuous: injected channels DO move totals', () => {
    // a boss Damage Taken + debuff (the mis-read of an ALLY 'Damage Taken -8%')
    expect(sum(totals(DT_RUN.res))).toBeGreaterThan(sum(BASE_TOTALS));
    // an ally ATK buff (the mis-scope of the enemy-targeted ATK -13.25%)
    expect(sum(totals(ATK_RUN.res))).toBeGreaterThan(sum(BASE_TOTALS));
  });

  it('contributes defPct events and NOTHING else (no damageTakenPct, no atkPct)', () => {
    const withNoah = statCounts(BASE.run.log);
    const without = statCounts(STRIP_RUN.log);
    expect(withNoah.defPct ?? 0).toBeGreaterThan(without.defPct ?? 0);
    delete withNoah.defPct;
    delete without.defPct;
    expect(withNoah).toEqual(without); // every other stat channel is untouched by her
  });
});

describe('noah: override shape + the no-silent-drops record', () => {
  it('burst carries one burst-cast, all-allies defPct 133.48 / 10s block', () => {
    const blocks = readSlot(COMMITTED, 'burst');
    const carriers = blocks.filter((b) =>
      effectsOf(b).some((e) => e.kind === 'buff' && e.stat === 'defPct')
    );
    expect(carriers.length).toBe(1);
    const b = carriers[0];
    expect((b.trigger as BlockLike).kind).toBe('burstCast');
    const target = b.target as BlockLike;
    expect(target.kind).toBe('allies');
    expect(target.excludeSelf ?? false).toBe(false);
    const eff = effectsOf(b).find((e) => e.stat === 'defPct') as BlockLike;
    expect(eff.value).toBe(DEF_PCT);
    expect(eff.durationSec).toBe(DEF_SEC);
  });

  it('skill1 / skill2 carry no damage-moving effect (both lines are scope-inert)', () => {
    const MOVERS = new Set([
      'buff',
      'flatDamage',
      'dot',
      'storedHit',
      'weaponSwap',
      'unlimitedAmmo',
      'instantReload',
      'consumeAmmo',
      'fillGauge',
      'burstCdr',
    ]);
    for (const slot of ['skill1', 'skill2'] as SlotName[]) {
      const kinds = readSlot(COMMITTED, slot).flatMap((b) =>
        effectsOf(b).map((e) => String(e.kind))
      );
      expect(kinds.filter((k) => MOVERS.has(k))).toEqual([]);
    }
  });

  it('records the dropped lines in unmodeled for all three slots', () => {
    const um = asOv(COMMITTED).unmodeled ?? {};
    expect((um.skill1 ?? []).length).toBeGreaterThan(0);
    expect((um.skill2 ?? []).length).toBeGreaterThan(0);
    expect((um.burst ?? []).length).toBeGreaterThanOrEqual(2);
    expect((um.burst ?? []).join(' ')).toMatch(/invulnerab/i);
    expect((um.skill1 ?? []).join(' ')).toMatch(/damage taken/i);
  });
});

describe('noah: GAPs (no engine primitive - nothing to assert)', () => {
  it.skip('skill1 10% chance on being attacked: no incoming-damage model and no probabilistic on-attacked trigger', () => {});
  it.skip('skill1 ally Damage Taken -8%: damageTakenPct is a BOSS debuff channel; an ally-scoped damage reduction has no consumer at scope lock', () => {});
  it.skip('skill2 Full Charge trigger identity: chargeCounter count 1 would express it, but both payloads are unobservable so nothing discriminates', () => {});
  it.skip('skill2 / burst Taunt + Attract: no aggro or threat model in the sim', () => {});
  it.skip('burst Invulnerable 3 sec: no HP pool - the boss deals no damage', () => {});
  it.skip('burst DEF +133.48% damage consequence: defPct is inert in v1 (kept for a future DEF/HP scaler consumer)', () => {});
});
