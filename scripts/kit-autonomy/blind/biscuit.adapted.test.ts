/**
 * biscuit (RL / Electric / Supporter / Burst II) — BLIND kit spec (cross-family S5).
 * Written from the kit prose ALONE; the driver's override, tests and reasoning were not read.
 *
 * KIT -> SPEC
 *  S1  header: fires "at the end of Full Burst", affects all Attacker allies.
 *      a) "Critical Rate of normal attack" +5.77% / 10s -> critRateNormalPct (SCOPED), trigger
 *         fullBurstEnd, target alliesOfClass Attacker. Nearest-wrong models this test kills:
 *         generic critRatePct (over-credits skill/burst crit), fullBurstEnter keying (shifts the
 *         10s window by the whole FB), an unscoped {allies} target, a permanent/round-count buff.
 *      b) HoT 1.53% of the caster's Max HP every 1s x10 -> heal(ticks:10). The harness exposes no
 *         heal/recovery event kind and the control comp has no Attacker-class recovery consumer,
 *         so the line is unobservable here -> GAP (skipped, not asserted inert).
 *  S2  trigger is an ally HP threshold; v1 has no HP pool and the boss deals no damage, so the
 *      block can never fire. The testable claim is that skill2 is board-INERT (per-slug identity).
 *  BURST
 *      a) cover rebuild on 2 cover-destroyed allies -> no cover model -> UNMODELED (skipped);
 *         guarded by the "no invented buff stats" assertion below.
 *      b) ATK +43.08% / 10s to all Supporter allies -> atkPct, trigger burstCast (it is her own
 *         burst block, and a burst cast lands BEFORE the FB window opens), target alliesOfClass
 *         Supporter WITH self (biscuit is a Supporter). Nearest-wrong: fullBurstEnter keying,
 *         {allies}, self-only, casterAtkPct, or a missing duration.
 *      c) lifesteal 55.44% of attack damage over 10s -> no HP pool -> UNMODELED (skipped).
 *
 * FIXTURE: controlComp('biscuit', true) = liter (B1) / crown (B2) / biscuit / helm (B3, fixed).
 *   The fixed B3 is REQUIRED: a comp with no Burst III makes ZERO Full Bursts, which would make the
 *   whole S1 line unobservable. biscuit is Burst II and shares that stage with crown, so she casts
 *   only on rotations where crown is on cooldown -- the "fixture non-vacuity" test isolates that
 *   risk from the content assertions so a fixture failure is not read as a model failure.
 *   Counterfactuals are built by PREDICATE (locate the buff effect carrying the kit magnitude and
 *   mutate its block in place), so they bind to the kit value rather than the driver's block layout,
 *   and they work whether a slot holds Block[] or { blocks: Block[] }.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

// ADAPTED FIXTURE (driver): the blind test's controlComp('biscuit', true) pins crown at Burst II,
// which out-rotates biscuit so she never casts (the blind non-vacuity guard flags this as 'untested,
// not refuted'). Swap crown -> ada so biscuit is the SOLE B2 caster; liter stays the Supporter ally,
// helm/ada the Attackers, so every class-scope assertion still has its targets.
const biscuitComp = () => ({
  slugs: ['liter', 'biscuit', 'ada', 'helm'],
  bossElement: 'Fire' as const,
  focusSlug: 'ada',
});

const SLUG = 'biscuit';
const S1_CRIT = 5.77;
const BURST_ATK = 43.08;

type EvLike = SimEvent & {
  stat?: string;
  value?: number;
  targetSlug?: string;
  casterIdx?: number | null;
  expiresFrame?: number;
  durationShots?: number;
};

interface EffLike {
  kind: string;
  stat?: string;
  value?: number;
  durationSec?: number;
}

interface BlockLike {
  trigger?: { kind: string };
  target?: { kind: string; cls?: string };
  effects?: EffLike[];
}

const near = (a: number | undefined, b: number): boolean =>
  typeof a === 'number' && Math.abs(a - b) < 1e-6;

function slotBlocks(
  ov: unknown,
  slot: 'skill1' | 'skill2' | 'burst'
): BlockLike[] {
  const raw = (ov as Record<string, unknown>)[slot];
  if (!raw) {
    return [];
  }
  const arr = Array.isArray(raw)
    ? raw
    : ((raw as { blocks?: unknown }).blocks ?? []);
  return (Array.isArray(arr) ? arr : []) as BlockLike[];
}

function allBlocks(ov: unknown): BlockLike[] {
  return [
    ...slotBlocks(ov, 'skill1'),
    ...slotBlocks(ov, 'skill2'),
    ...slotBlocks(ov, 'burst'),
  ];
}

function blocksCarrying(ov: unknown, value: number): BlockLike[] {
  return allBlocks(ov).filter((b) =>
    (b.effects ?? []).some((e) => e.kind === 'buff' && near(e.value, value))
  );
}

function buffEffects(ov: unknown, value: number): EffLike[] {
  return allBlocks(ov).flatMap((b) =>
    (b.effects ?? []).filter((e) => e.kind === 'buff' && near(e.value, value))
  );
}

type Opts = ReturnType<typeof controlComp>;

interface RunOut {
  events: EvLike[];
  per: Record<string, number>;
  team: number;
}

function run(opts: Opts): RunOut {
  const events: EvLike[] = [];
  const o = opts as Opts & { cfg?: Record<string, unknown> };
  const res = runComp({
    ...o,
    cfg: {
      ...(o.cfg ?? {}),
      onEvent: (ev: SimEvent) => {
        events.push(ev as EvLike);
      },
    },
  } as Opts);
  const per = totals(res);
  return { events, per, team: Object.values(per).reduce((a, b) => a + b, 0) };
}

function patchedComp(mutate: (ov: unknown) => void): Opts {
  const base = biscuitComp() as Opts & { overrides?: Record<string, unknown> };
  return {
    ...base,
    overrides: {
      ...(base.overrides ?? {}),
      [SLUG]: withPatchedOverride(SLUG, (ov) => mutate(ov)),
    },
  } as Opts;
}

const applies = (r: RunOut, value: number): EvLike[] =>
  r.events.filter((e) => e.kind === 'buffApply' && near(e.value, value));

/**
 * Frame-free ordering probe: the event stream is chronological, so the last rotation landmark seen
 * before a buffApply identifies its trigger without needing a frame field.
 */
function phaseTags(r: RunOut, value: number): string[] {
  const tags: string[] = [];
  let last = 'none';
  for (const e of r.events) {
    if (e.kind === 'fullBurstStart') {
      last = 'fullBurstStart';
    } else if (e.kind === 'fullBurstEnd') {
      last = 'fullBurstEnd';
    } else if (e.kind === 'burstCast') {
      last = 'burstCast';
    } else if (e.kind === 'buffApply' && near(e.value, value)) {
      tags.push(last);
    }
  }
  return tags;
}

// ---- hoisted runs: 7 full 180s sims ----
const control = run(biscuitComp());
const s1Broad = run(
  patchedComp((ov) => {
    for (const b of blocksCarrying(ov, S1_CRIT)) {
      b.target = { kind: 'allies' };
    }
  })
);
const s1Amp = run(
  patchedComp((ov) => {
    for (const e of buffEffects(ov, S1_CRIT)) {
      e.value = 100;
    }
  })
);
const bBroad = run(
  patchedComp((ov) => {
    for (const b of blocksCarrying(ov, BURST_ATK)) {
      b.target = { kind: 'allies' };
    }
  })
);
const bAmp = run(
  patchedComp((ov) => {
    for (const e of buffEffects(ov, BURST_ATK)) {
      e.value = 200;
    }
  })
);
const bLong = run(
  patchedComp((ov) => {
    for (const e of buffEffects(ov, BURST_ATK)) {
      e.durationSec = 60;
    }
  })
);
const s2Off = run(
  patchedComp((ov) => {
    for (const b of slotBlocks(ov, 'skill2')) {
      b.effects = [];
    }
  })
);

describe('biscuit S1 — end-of-Full-Burst crit buff on Attacker allies', () => {
  it('fixture non-vacuity: the control comp holds at least one Attacker ally', () => {
    // If this is the only failure in the file, the divergence is the FIXTURE (no Attacker present),
    // not the model: every S1 assertion below needs a live target to observe.
    expect(applies(control, S1_CRIT).length).toBeGreaterThan(0);
  });

  it('is scoped to normal attacks (critRateNormalPct), never generic crit', () => {
    const ev = applies(control, S1_CRIT);
    expect(ev.length).toBeGreaterThan(0);
    expect(new Set(ev.map((e) => e.stat))).toEqual(
      new Set(['critRateNormalPct'])
    );
    // nearest-wrong: an unscoped critRatePct would also credit skill + burst hits.
    expect(
      control.events.some(
        (e) =>
          e.kind === 'buffApply' &&
          e.stat === 'critRatePct' &&
          near(e.value, S1_CRIT)
      )
    ).toBe(false);
  });

  it('fires at Full Burst END, not at Full Burst entry', () => {
    const tags = phaseTags(control, S1_CRIT);
    expect(tags.length).toBeGreaterThan(0);
    // nearest-wrong: a fullBurstEnter trigger tags every apply 'fullBurstStart'.
    expect(new Set(tags)).toEqual(new Set(['fullBurstEnd']));
  });

  it('is class-scoped to Attackers — the comp Supporters never receive it', () => {
    const targets = new Set(applies(control, S1_CRIT).map((e) => e.targetSlug));
    // biscuit and liter are both Supporters: an {allies} target would include them.
    expect(targets.has('biscuit')).toBe(false);
    expect(targets.has('liter')).toBe(false);
    // counterfactual: widening the target to {allies} must buff strictly MORE units,
    // which proves the shipped target is a proper subset (class-restricted).
    expect(applies(s1Broad, S1_CRIT).length).toBeGreaterThan(
      applies(control, S1_CRIT).length
    );
  });

  it('is a timed 10s buff, not a round-count or permanent one', () => {
    const ev = applies(control, S1_CRIT);
    expect(ev.length).toBeGreaterThan(0);
    for (const e of ev) {
      expect(e.durationShots ?? null).toBeNull();
      expect(Number.isFinite(e.expiresFrame ?? NaN)).toBe(true);
    }
  });

  it('actually moves damage — amplifying the crit line raises team damage', () => {
    // guards against a buff that is applied but lands on a stat no consumer reads.
    expect(s1Amp.team).toBeGreaterThan(control.team);
  });

  it.skip('HoT: 1.53% of caster Max HP every 1s for 10s — GAP: no heal/recovery event kind is exposed by the harness and the control comp has no Attacker-class recovery consumer, so a heal(ticks:10) is unobservable here', () => {});
});

describe('biscuit S2 — Defender-HP-threshold branch', () => {
  it('is board-inert: emptying skill2 changes no unit damage', () => {
    // v1 has no HP pool and the boss deals no damage, so "HP falls below 50%" can never fire.
    // nearest-wrong: re-keying it to passive/interval would let its heal drive a teammate's
    // `recovery` trigger and shift damage.
    expect(s2Off.per).toEqual(control.per);
  });

  it.skip('Invincible 5s x2/battle + 23.26% Max HP heal x2/battle — GAP: no HP pool, no invincibility primitive, and the activation condition has no representable trigger in v1', () => {});
});

describe('biscuit burst — ATK buff on Supporter allies', () => {
  it('fixture non-vacuity: biscuit casts her own burst at least once', () => {
    // biscuit is Burst II and shares the stage with crown; if this is the only failure, the
    // rotation never gave her the stage-2 slot and the burst assertions below are untested,
    // not refuted.
    expect(applies(control, BURST_ATK).length).toBeGreaterThan(0);
  });

  it('lands on her BURST CAST, before the Full Burst window opens', () => {
    const tags = phaseTags(control, BURST_ATK);
    expect(tags.length).toBeGreaterThan(0);
    // nearest-wrong: keying it to fullBurstEnter tags every apply 'fullBurstStart' and would
    // also fire on rotations where a DIFFERENT stage-2 unit bursts.
    expect(new Set(tags)).toEqual(new Set(['burstCast']));
  });

  it('scales the target own ATK (atkPct), not caster-flat ATK', () => {
    const ev = applies(control, BURST_ATK);
    expect(ev.length).toBeGreaterThan(0);
    // casterAtkPct / highestAllyAtkPct re-emit a FLAT resolved ATK, so a 43.08 raw value here is
    // itself evidence of the percentage stat; the stat check pins it.
    expect(new Set(ev.map((e) => e.stat))).toEqual(new Set(['atkPct']));
  });

  it('targets all Supporter allies INCLUDING herself, and nobody else', () => {
    const targets = new Set(
      applies(control, BURST_ATK).map((e) => e.targetSlug)
    );
    expect(targets.has('biscuit')).toBe(true); // biscuit is a Supporter: self-inclusion is required
    expect(targets.has('liter')).toBe(true); // liter is a Supporter
    // counterfactual: an unscoped {allies} target must reach strictly more units.
    expect(applies(bBroad, BURST_ATK).length).toBeGreaterThan(
      applies(control, BURST_ATK).length
    );
  });

  it('is live — amplifying the ATK line raises team damage', () => {
    expect(bAmp.team).toBeGreaterThan(control.team);
  });

  it('lasts a bounded 10 sec — extending the window raises team damage', () => {
    // nearest-wrong: a missing durationSec (permanent) makes the control the HIGHER run, so this
    // flips red; a round-count duration would not respond to durationSec at all.
    expect(bLong.team).toBeGreaterThan(control.team);
  });

  it.skip('Rebuild Cover 93.6% HP on 2 cover-destroyed allies — GAP: the sim models no cover state and no HP pool', () => {});

  it.skip('Recovers 55.44% of attack damage as HP over 10s — GAP: lifesteal has no primitive (no HP pool); observable only through a teammate recovery consumer, which this comp does not supply', () => {});
});

describe('biscuit — no invented mechanics', () => {
  it('emits only the two kit stat lines from biscuit as caster', () => {
    const idx = applies(control, BURST_ATK)[0]?.casterIdx;
    expect(typeof idx).toBe('number');
    const mine = control.events.filter(
      (e) => e.kind === 'buffApply' && e.casterIdx === idx
    );
    expect(mine.length).toBeGreaterThan(0);
    // the cover rebuild, the HoT, the lifesteal and the S2 heal are NOT stat buffs; anything
    // outside this pair is an invented stat channel.
    expect(new Set(mine.map((e) => e.stat))).toEqual(
      new Set(['critRateNormalPct', 'atkPct'])
    );
  });
});
