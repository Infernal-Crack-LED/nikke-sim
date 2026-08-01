/**
 * rapunzel — RL / Iron / Supporter / Burst I — BLIND kit-spec test (kit prose only).
 *
 * KIT AS READ
 *   S1  "Activates when performing a Full Charge attack. Affects the 3 ally unit(s) with the
 *        lowest HP percentage. Recovers 4.03% of the skill user's final Max HP as HP."
 *   S2  "Affects 2 ally unit(s) with the highest final ATK." + Max HP ▲8.19% / Incoming healing
 *        ▲13.65%, both "for 15 sec". No activation clause.
 *   B   "Affects all allies. Recovers 40.83% ... as HP."
 *       + "Affects 1 incapacitated ally ... Resurrect with 81.67% HP."
 *       + "Activates when HP falls below 30%. Affects all enemies. Stun for 1 sec."
 *
 * WHY THESE ASSERTIONS DISCRIMINATE
 *   Rapunzel's entire kit is heals + Max HP + a resurrect + an HP-gated stun. The v1 engine models
 *   NO HP pool and emits NO heal event, so a heal's ONLY observable is that it fires the
 *   RECIPIENT's `recovery` trigger. This file therefore INSTRUMENTS the fixture: a tracer block is
 *   pushed onto a teammate's in-memory override whose sole effect is an inert `partsDamagePct`
 *   buff (documented inert in v1 — the boss has no parts) fired by a `recovery` trigger, so every
 *   heal landing on that teammate becomes exactly one countable buffApply carrying a unique value.
 *   Counting that tracer on crown (INSIDE the leftmost-3 stand-in the engine uses for "lowest HP
 *   percentage") and on helm (OUTSIDE it), each against a heal-stripped baseline run, pins both:
 *     - TRIGGER IDENTITY: a per-full-charge heal fires ~100x over 180s (RL: 6 rounds, 60f charge,
 *       159f reload); a full-burst-enter model fires ~9x, a burst-cast model <=3x, a 15s interval
 *       model 12x. The >40 and >3x-full-burst-count thresholds separate the faithful reading from
 *       every one of those nearest-wrong models, and the FB_TRIGGER counterfactual run proves the
 *       separation is real rather than assumed.
 *     - TARGET SET: "3 allies" vs "all allies" — helm sits 4th in the control comp, so a faithful
 *       3-ally heal never reaches her while an all-allies model reaches her exactly as often as
 *       crown.
 *   A second tracer (a passive SELF partsDamagePct buff with its own unique value) recovers
 *   rapunzel's slot index from the event stream, so her ally-facing buffApply events can be
 *   attributed to her without hard-coding a comp position.
 *
 * FIXTURE: controlComp('rapunzel', true) — liter B1 / crown B2 / rapunzel / helm B3. helm is the
 *   only Attacker-class unit present, so she is the highest-final-ATK ally under both static and
 *   live ranking (liter/crown buff every ally's own ATK, preserving order). rapunzel is Burst I and
 *   shares the B1 slot with liter (20s CD), so she may never cast her own burst here — every
 *   burst-slot claim is asserted STRUCTURALLY (trigger identity + target set), and the burst heal's
 *   reach only has to satisfy an inequality that still holds at zero casts.
 *
 * OVERRIDE-SHAPE NOTE: the harness contract describes the OverrideFile two ways (slot -> Block[]
 *   and slot -> { blocks: Block[] }); every accessor below handles BOTH shapes.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

/* ------------------------------------------------------------------ shapes */

type TEffect = { kind: string; [k: string]: unknown };
type TBlock = {
  slot?: string;
  trigger?: { kind?: string };
  target?: { kind?: string; count?: number; excludeSelf?: boolean };
  effects?: TEffect[];
  [k: string]: unknown;
};
type Ov = Record<string, unknown>;
type OvFile = ReturnType<typeof withPatchedOverride>;
type Ev = {
  kind: string;
  stat?: string;
  value?: number;
  casterIdx?: number | null;
  targetIdx?: number | null;
  targetSlug?: string;
};

const SLOTS = ['skill1', 'skill2', 'burst'] as const;

function slotBlocks(ov: Ov, slot: string): TBlock[] {
  const s = ov[slot];
  if (Array.isArray(s)) {
    return s as TBlock[];
  }
  if (s && typeof s === 'object') {
    const inner = (s as { blocks?: unknown }).blocks;
    if (Array.isArray(inner)) {
      return inner as TBlock[];
    }
  }
  return [];
}

function allBlocks(ov: Ov): TBlock[] {
  return SLOTS.flatMap((slot) => slotBlocks(ov, slot));
}

function pushBlock(ov: Ov, block: TBlock): boolean {
  for (const slot of SLOTS) {
    if (ov[slot] === undefined) {
      continue;
    }
    slotBlocks(ov, slot).push({ ...block, slot });
    return true;
  }
  return false;
}

/* ---------------------------------------------------------------- tracers */

// partsDamagePct is parsed but INERT in v1 (no parts on the scope-lock boss), so a tracer buff
// built on it cannot move a single damage number — asserted directly in the first test.
const TRACER_STAT = 'partsDamagePct';
const SELF_MARK = 424242; // recovers rapunzel's slot index
const RECOVERY_MARK = 777777; // one emission per heal received by the probed teammate

function rapunzelOverride(extra?: (ov: Ov) => void): OvFile {
  return withPatchedOverride('rapunzel', (ov) => {
    const o = ov as unknown as Ov;
    extra?.(o);
    pushBlock(o, {
      trigger: { kind: 'passive' },
      target: { kind: 'self' },
      effects: [{ kind: 'buff', stat: TRACER_STAT, value: SELF_MARK }],
    });
  });
}

function recoveryProbe(slug: string): OvFile {
  return withPatchedOverride(slug, (ov) => {
    pushBlock(ov as unknown as Ov, {
      trigger: { kind: 'recovery' },
      target: { kind: 'self' },
      effects: [
        {
          kind: 'buff',
          stat: TRACER_STAT,
          value: RECOVERY_MARK,
          durationSec: 1,
        },
      ],
    });
  });
}

/* -------------------------------------------------------------- mutations */

function stripHeals(ov: Ov): void {
  for (const b of allBlocks(ov)) {
    b.effects = (b.effects ?? []).filter((e) => e.kind !== 'heal');
  }
}

function skill1HealToFullBurstEnter(ov: Ov): void {
  for (const b of slotBlocks(ov, 'skill1')) {
    if ((b.effects ?? []).some((e) => e.kind === 'heal')) {
      b.trigger = { kind: 'fullBurstEnter' };
    }
  }
}

function stripSkill2(ov: Ov): void {
  const arr = slotBlocks(ov, 'skill2');
  arr.splice(0, arr.length);
}

/* -------------------------------------------------------------------- run */

interface Run {
  events: Ev[];
  totals: Record<string, number>;
}

function run(rapunzel?: OvFile, probes = true): Run {
  const events: Ev[] = [];
  const onEvent = (ev: SimEvent): void => {
    events.push(ev as unknown as Ev);
  };
  const base = controlComp('rapunzel', true) as unknown as Ov;
  const overrides: Record<string, unknown> = {
    ...((base.overrides as Record<string, unknown> | undefined) ?? {}),
  };
  if (rapunzel) {
    overrides.rapunzel = rapunzel;
  }
  if (probes) {
    overrides.crown = recoveryProbe('crown');
    overrides.helm = recoveryProbe('helm');
  }
  // onEvent is set on both the options object and its cfg sub-object so the collector attaches
  // regardless of which level the harness threads through to the sim config.
  const opts = {
    ...base,
    overrides,
    onEvent,
    cfg: { ...((base.cfg as object | undefined) ?? {}), onEvent },
  };
  const res = runComp(opts as unknown as Parameters<typeof runComp>[0]);
  return { events, totals: totals(res) as unknown as Record<string, number> };
}

const recoveries = (r: Run, slug: string): number =>
  r.events.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.stat === TRACER_STAT &&
      e.value === RECOVERY_MARK &&
      e.targetSlug === slug
  ).length;

const fullBursts = (r: Run): number =>
  r.events.filter((e) => e.kind === 'fullBurstStart').length;

const rapunzelIdx = (r: Run): number | null | undefined =>
  r.events.find(
    (e) =>
      e.kind === 'buffApply' && e.stat === TRACER_STAT && e.value === SELF_MARK
  )?.casterIdx;

/* ------------------------------------------------------------------- runs */

const CLEAN = run(undefined, false); // untouched fixture — the inertness reference
const BASE = run(rapunzelOverride()); // shipped kit + tracers
const NO_HEAL = run(rapunzelOverride(stripHeals)); // heal-sourced baseline (other healers only)
const FB_TRIGGER = run(rapunzelOverride(skill1HealToFullBurstEnter)); // nearest-wrong trigger
const NO_SKILL2 = run(rapunzelOverride(stripSkill2)); // skill2 damage-inertness

const FB = fullBursts(BASE);
const CROWN_HEALS = recoveries(BASE, 'crown') - recoveries(NO_HEAL, 'crown');
const HELM_HEALS = recoveries(BASE, 'helm') - recoveries(NO_HEAL, 'helm');
const CROWN_HEALS_FB =
  recoveries(FB_TRIGGER, 'crown') - recoveries(NO_HEAL, 'crown');

/* ------------------------------------------------------------------ tests */

describe('rapunzel — instrument', () => {
  it('fixture is live and the tracers are damage-neutral', () => {
    // Non-vacuity: she actually fires (the ~100 full charges the S1 assertions rest on) and the
    // comp actually bursts (the full-burst-enter counterfactual needs a non-trivial FB count).
    expect(CLEAN.totals.rapunzel).toBeGreaterThan(0);
    expect(FB).toBeGreaterThan(3);
    // The self tracer resolved -> rapunzel's caster index is attributable from the event stream.
    expect(rapunzelIdx(BASE)).toEqual(expect.any(Number));
    // The recovery probe attached and fired at least once.
    expect(recoveries(BASE, 'crown')).toBeGreaterThan(0);
    // partsDamagePct tracers move NOTHING — every unit's total is byte-identical to the clean run,
    // so every count below is measured on an undisturbed sim.
    expect(BASE.totals).toEqual(CLEAN.totals);
  });
});

describe('rapunzel skill1 — Full Charge heal, 3 lowest-HP allies', () => {
  it('is modelled as a heal at all (structural prerequisite for the counterfactuals)', () => {
    const ov = withPatchedOverride('rapunzel', () => {}) as unknown as Ov;
    const healBlocks = slotBlocks(ov, 'skill1').filter((b) =>
      (b.effects ?? []).some((e) => e.kind === 'heal')
    );
    expect(healBlocks.length).toBeGreaterThan(0);
  });

  it('fires once per full charge — not per Full Burst, burst cast, or fixed interval', () => {
    // Faithful (per full charge): ~100 heals reach crown over 180s.
    // Nearest-wrong models: fullBurstEnter ~= FB (<10), burstCast <= 3, interval 15s = 12.
    expect(CROWN_HEALS).toBeGreaterThan(40);
    expect(CROWN_HEALS).toBeGreaterThan(3 * FB);
    // Whole-picture ceiling: she cannot full-charge more than ~130 times in 180s
    // (60f charge + 22f release latency, 6 rounds per 159f reload).
    expect(CROWN_HEALS).toBeLessThan(220);
  });

  it('collapses under the nearest-wrong full-burst-enter trigger (the threshold is real)', () => {
    expect(CROWN_HEALS_FB).toBeLessThanOrEqual(FB + 2);
    expect(CROWN_HEALS_FB).toBeLessThan(CROWN_HEALS / 3);
  });

  it('reaches only 3 allies — the 4th-slot ally is not healed by skill1', () => {
    // helm sits outside the engine's leftmost-`count` stand-in for "lowest HP percentage".
    // Faithful: helm sees only burst heals (0-3). An all-allies model gives helm === crown.
    expect(HELM_HEALS).toBeGreaterThanOrEqual(0);
    expect(HELM_HEALS).toBeLessThan(CROWN_HEALS / 4);
  });

  it.skip('recovers 4.03% of the caster final Max HP — GAP: no HP pool in v1, the heal effect carries no amount', () => {});
});

describe('rapunzel skill2 — 2 highest-final-ATK allies', () => {
  it('grants Max HP to exactly 2 allies, including the highest-ATK ally', () => {
    const idx = rapunzelIdx(BASE);
    const applies = BASE.events.filter(
      (e) =>
        e.kind === 'buffApply' && e.stat === 'maxHpFlat' && e.casterIdx === idx
    );
    expect(applies.length).toBeGreaterThan(0);
    const targets = new Set(applies.map((e) => e.targetSlug));
    // count:2 — an "all allies" model gives 4, a self-only model gives 1.
    expect(targets.size).toBe(2);
    // helm is the only Attacker-class unit in the comp, so she is the top final-ATK ally under
    // both static and live ranking — an alliesLowestAtk model excludes her.
    expect(targets.has('helm')).toBe(true);
  });

  it('is damage-inert — ally-granted Max HP feeds no teammate ATK conversion', () => {
    expect(NO_SKILL2.totals).toEqual(BASE.totals);
  });

  it.skip('Incoming healing ▲13.65% for 15 sec — GAP: no incoming-healing StatKey and no HP pool to scale', () => {});
});

describe('rapunzel burst', () => {
  it('heals ALL allies on her OWN burst cast (structural: she may never win the B1 slot here)', () => {
    const ov = withPatchedOverride('rapunzel', () => {}) as unknown as Ov;
    const healBlocks = slotBlocks(ov, 'burst').filter((b) =>
      (b.effects ?? []).some((e) => e.kind === 'heal')
    );
    expect(healBlocks.length).toBeGreaterThan(0);
    for (const b of healBlocks) {
      // Trigger identity: a burst-slot heal fires when SHE casts, never on any team Full Burst.
      expect(b.trigger?.kind).toBe('burstCast');
      // Target set: all allies, self included (the kit says "all allies", not "except self").
      expect(b.target?.kind).toBe('allies');
      expect(b.target?.excludeSelf ?? false).toBe(false);
    }
  });

  it('never stuns an ally — any stun in the kit is enemy-facing', () => {
    const ov = withPatchedOverride('rapunzel', () => {}) as unknown as Ov;
    for (const b of allBlocks(ov)) {
      if ((b.effects ?? []).some((e) => e.kind === 'stun')) {
        expect(b.target?.kind).toBe('enemy');
      }
    }
  });

  it.skip('resurrect 1 incapacitated highest-ATK ally at 81.67% HP — GAP: no HP pool, no incapacitation state, nobody ever dies', () => {});

  it.skip('HP < 30% -> stun all enemies for 1 sec — GAP: HP-threshold trigger unmodellable (no HP pool) and the enemy target resolves to no entity', () => {});
});

describe('rapunzel — kit-wide inertness', () => {
  it('contributes no offensive buff of any kind', () => {
    const idx = rapunzelIdx(BASE);
    const OFFENSIVE = new Set([
      'atkPct',
      'casterAtkPct',
      'highestAllyAtkPct',
      'atkOfMaxHpPct',
      'critRatePct',
      'critRateNormalPct',
      'critDamagePct',
      'coreDamagePct',
      'elementDamagePct',
      'chargeDamagePct',
      'chargeDamageMultPct',
      'chargeSpeedPct',
      'attackDamagePct',
      'sustainedDamagePct',
      'sequentialDamagePct',
      'sequentialMultPct',
      'damageTakenPct',
      'maxAmmoPct',
      'maxAmmoFlat',
      'reloadSpeedPct',
      'attackSpeedPct',
      'fireRatePct',
      'extraHitDamagePct',
      'trueDamagePct',
      'projectileExplosionPct',
      'elemAdvantageDamagePct',
      'distributedDamagePct',
      'projectileAttachmentPct',
      'normalAttackPct',
      'pelletCountFlat',
      'burstGenPct',
      'hitRatePct',
    ]);
    const offensive = BASE.events
      .filter(
        (e) =>
          e.kind === 'buffApply' &&
          e.casterIdx === idx &&
          e.stat !== undefined &&
          OFFENSIVE.has(e.stat)
      )
      .map((e) => e.stat);
    expect(offensive).toEqual([]);
  });
});
