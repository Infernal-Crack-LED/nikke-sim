import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

/**
 * misato — kit spec test (written from kit prose alone).
 *
 * KIT (Misato, SMG/Iron/Supporter/Burst I; ammo 120, hitsPerShot 1, normalAttackMultiplier 8.1,
 * coreAttackMultiplier 200, reloadFrames 81, chargeFrames 0, burst cd 40s):
 *
 *   S1-a  "Activates after landing 60 normal attack(s). Affects self."
 *         Shooting Manual: Hit Rate ▲ 5.04%, stacks up to 3 time(s), lasts for 5 sec.
 *   S1-b  "Activates after landing 120 normal attack(s). Affects 1 ally unit(s) with the
 *         lowest HP percentage."  Recovers 8.04% of the skill user's final Max HP as HP.
 *   S2-a  "Only activates when in Shooting Manual status. Affects all allies."
 *         Damage dealt to Shield ▲ 150% continuously.
 *   S2-b  "Only activates when Shooting Manual is at max stacks. Affects self."
 *         Outgoing healing ▲ 30.05% continuously.
 *   BURST "Affects all allies." Recovers 5.06% of final Max HP every 1 sec for 5 sec.
 *
 * MODELING READ (the 4 questions, per line):
 *   S1-a  scope: a named self status ("Shooting Manual"), stat = Hit Rate -> hitRatePct (the
 *         engine's core-hit lift, live by default). duration: 5 wall-clock seconds, stack cap 3.
 *         trigger: hitCount 60 ("after landing 60 normal attacks" = a cumulative ROUND counter,
 *         not an interval and not per-pull; hitsPerShot 1 so rounds == pulls here). target: self.
 *   S1-b  trigger: hitCount 120 (a SECOND, independent counter — twice the S1-a period).
 *         target: exactly ONE ally, lowest HP% -> alliesLowestHp{count:1} (v1 has no HP pool, so
 *         the engine resolves this to the leftmost ally = the B1 slot, NOT the B2/crown slot).
 *         effect: a heal — no HP magnitude is modeled, it emits a recovery event, so it is
 *         observable ONLY through a teammate that carries a `recovery` trigger.
 *   S2-a  GAP. There is no shield entity on the scope-lock boss and no shield-damage StatKey.
 *   S2-b  GAP. Heal magnitudes are not modeled at all (heal effects carry no HP amount), so an
 *         "outgoing healing ▲" multiplier has no payload to scale. Both S2 lines belong in
 *         `unmodeled`, not in a block.
 *   BURST trigger: burstCast (her OWN Burst I cast — not fullBurstEnter; a Burst-I heal fires when
 *         SHE casts, and mis-keying it to full-burst entry over-credits on rotations another B1
 *         completes). target: allies (all, self included). duration semantics: a heal-OVER-TIME —
 *         5 discrete ticks at 1s, i.e. heal{ticks:5,intervalSec:1}, NOT one instant heal.
 *
 * WHY THE ASSERTIONS DISCRIMINATE:
 *   - hitRatePct is damage-live (core-hit lift), so S1-a is readable straight off misato's totals:
 *     zeroing it, or capping stacks at 1, or collapsing the 5s window to 1s, each strictly lowers
 *     her damage. It is "Affects self", so it must move NO teammate — the nearest-wrong (an
 *     ally-scoped read) is caught by the byte-identical teammate check.
 *   - The 60-hit threshold is proved cadence-independently: applications must equal
 *     floor(her normal-attack hits / 60), which an interval- or shotFired-keyed model cannot match
 *     (shotFired produces ~60x as many applications).
 *   - Both heals are damage-inert on their own. They are made observable through the control comp's
 *     B2 slot (crown), whose kit consumes recovery events — so heal REACH shows up as a delta in
 *     total buffApply traffic. S1-b's single-target read predicts crown is NOT reached (removing it
 *     is byte-identical) while a widened "all allies" read IS (strictly more buff traffic). The
 *     burst's 5-tick all-ally read predicts strictly MORE traffic than either a 1-tick (instant
 *     heal) or a self-only target read.
 *   - Non-vacuity for the burst: misato is Burst I and the control comp already contains a B1
 *     (liter), so she is not guaranteed to cast. A dedicated probe run appends a damage-inert
 *     marker buff (defPct, documented inert in v1) to her burst block and asserts the marker is
 *     actually emitted — if that probe is RED the fixture, not the model, is at fault.
 *
 * ⚑ FLAGS (outside the kit text — never asserted as values here):
 *   - The Hit-Rate -> core-hit magnitude (hrCoreMult) is a derived engine conversion, measured-only.
 *     These tests assert only its SIGN/monotonicity, never a damage magnitude.
 *   - SMG cadence (rate_of_fire / reloadFrames) is datamine-unreliable, so no assertion pins an
 *     absolute application count — only the ratio to observed hits.
 *
 * FIXTURE: controlComp('misato', true) — liter B1 / crown B2 / misato / helm B3, boss Fire,
 * focus misato. The fixed B1+B2 are required for any burst to cast at all, and crown's on-recovery
 * kit is the only channel that makes a heal observable. Deterministic (no seed). 10 sim runs.
 */

type EffectLike = {
  kind: string;
  stat?: string;
  value?: number;
  maxStacks?: number;
  durationSec?: number;
  ticks?: number;
  intervalSec?: number;
};
type BlockLike = {
  trigger: { kind: string; count?: number };
  target: { kind: string; count?: number };
  effects: EffectLike[];
};
type BuffApplyEv = {
  stat: string;
  value: number;
  stacks?: number;
  maxStacks?: number;
  casterIdx: number | null;
  targetIdx: number | null;
  targetSlug?: string;
};
type DamageEv = { srcSlot: number };
type Opts = Parameters<typeof runComp>[0];
type Slot = 'skill1' | 'skill2' | 'burst';

function must<T>(v: T | undefined, msg: string): T {
  if (v === undefined || v === null) {
    throw new Error(`misato spec: ${msg}`);
  }
  return v;
}

// The override FILE is slot-keyed; a slot is either a bare Block[] or a CharacterSkills carrying
// its own blocks[]. Read through both shapes and return the LIVE array so splices land on the clone.
function slotBlocks(ov: unknown, slot: Slot): BlockLike[] {
  const raw = (ov as Record<string, unknown>)[slot] as
    BlockLike[] | { blocks?: BlockLike[] } | undefined;
  if (!raw) {
    return [];
  }
  return Array.isArray(raw) ? raw : (raw.blocks ?? []);
}

function findIn(
  ov: unknown,
  slot: Slot,
  pred: (b: BlockLike) => boolean
): BlockLike {
  return must(
    slotBlocks(ov, slot).find(pred),
    `no ${slot} block matching the spec predicate`
  );
}

function findAnySlot(
  ov: unknown,
  pred: (b: BlockLike) => boolean
): { block: BlockLike; slot: Slot } {
  for (const slot of ['skill1', 'skill2', 'burst'] as Slot[]) {
    const block = slotBlocks(ov, slot).find(pred);
    if (block) {
      return { block, slot };
    }
  }
  throw new Error('misato spec: no block anywhere matching the spec predicate');
}

function dropIn(
  ov: unknown,
  slot: Slot,
  pred: (b: BlockLike) => boolean
): void {
  const blocks = slotBlocks(ov, slot);
  const i = blocks.findIndex(pred);
  if (i < 0) {
    throw new Error(`misato spec: nothing to drop in ${slot}`);
  }
  blocks.splice(i, 1);
}

const isHitRateBuff = (b: BlockLike) =>
  b.effects.some((e) => e.kind === 'buff' && e.stat === 'hitRatePct');
const isHeal = (b: BlockLike) => b.effects.some((e) => e.kind === 'heal');
const hitRateEff = (b: BlockLike) =>
  must(
    b.effects.find((e) => e.kind === 'buff' && e.stat === 'hitRatePct'),
    'hitRatePct buff effect missing'
  );
const healEff = (b: BlockLike) =>
  must(
    b.effects.find((e) => e.kind === 'heal'),
    'heal effect missing'
  );

const buffApplies = (evs: SimEvent[]) =>
  evs.filter(
    (e) => (e as { kind: string }).kind === 'buffApply'
  ) as unknown as BuffApplyEv[];
const damages = (evs: SimEvent[]) =>
  evs.filter(
    (e) => (e as { kind: string }).kind === 'damage'
  ) as unknown as DamageEv[];
const burstCasts = (evs: SimEvent[]) =>
  evs.filter((e) => (e as { kind: string }).kind === 'burstCast');

function comp(patched?: unknown): Opts {
  const base = controlComp('misato', true) as unknown as Record<
    string,
    unknown
  >;
  if (!patched) {
    return base as unknown as Opts;
  }
  const overrides = {
    ...((base.overrides ?? {}) as Record<string, unknown>),
    misato: patched,
  };
  return { ...base, overrides } as unknown as Opts;
}

function run(opts: Opts) {
  const evs: SimEvent[] = [];
  const onEvent = (ev: SimEvent) => {
    evs.push(ev);
  };
  const o = opts as unknown as Record<string, unknown>;
  const cfg = (o.cfg ?? {}) as Record<string, unknown>;
  const res = runComp({
    ...o,
    onEvent,
    cfg: { ...cfg, onEvent },
  } as unknown as Opts);
  return { res, evs };
}

// --- the committed override, deep-cloned, for STRUCTURAL assertions -------------------------
const shipped = withPatchedOverride('misato', () => {});

// --- hoisted runs (each is a full 180s sim) --------------------------------------------------
const control = run(comp());

const noHitRate = run(
  comp(
    withPatchedOverride('misato', (ov) => {
      hitRateEff(findAnySlot(ov, isHitRateBuff).block).value = 0;
    })
  )
);

const oneStack = run(
  comp(
    withPatchedOverride('misato', (ov) => {
      hitRateEff(findAnySlot(ov, isHitRateBuff).block).maxStacks = 1;
    })
  )
);

const shortWindow = run(
  comp(
    withPatchedOverride('misato', (ov) => {
      hitRateEff(findAnySlot(ov, isHitRateBuff).block).durationSec = 1;
    })
  )
);

const perShot = run(
  comp(
    withPatchedOverride('misato', (ov) => {
      findAnySlot(ov, isHitRateBuff).block.trigger = { kind: 'shotFired' };
    })
  )
);

const noS1Heal = run(
  comp(
    withPatchedOverride('misato', (ov) => {
      dropIn(ov, 'skill1', isHeal);
    })
  )
);

const s1HealAllAllies = run(
  comp(
    withPatchedOverride('misato', (ov) => {
      findIn(ov, 'skill1', isHeal).target = { kind: 'allies' };
    })
  )
);

const burstOneTick = run(
  comp(
    withPatchedOverride('misato', (ov) => {
      healEff(findIn(ov, 'burst', isHeal)).ticks = 1;
    })
  )
);

const burstSelfOnly = run(
  comp(
    withPatchedOverride('misato', (ov) => {
      findIn(ov, 'burst', isHeal).target = { kind: 'self' };
    })
  )
);

// Non-vacuity probe: a damage-inert marker on the burst block. defPct is documented inert in v1,
// so this run exists only to prove misato's burst block actually FIRES in this fixture.
const BURST_PROBE_STAT = 'defPct';
const burstProbe = run(
  comp(
    withPatchedOverride('misato', (ov) => {
      findIn(ov, 'burst', isHeal).effects.push({
        kind: 'buff',
        stat: BURST_PROBE_STAT,
        value: 1,
        durationSec: 1,
      });
    })
  )
);

// --- derived readings -------------------------------------------------------------------------
const smApplies = buffApplies(control.evs).filter(
  (e) => e.stat === 'hitRatePct' && e.targetSlug === 'misato'
);
const misatoIdx = must(
  smApplies[0],
  'no Shooting Manual application observed at all'
).casterIdx;
const misatoHits = damages(control.evs).filter(
  (d) => d.srcSlot === misatoIdx
).length;

describe('misato S1-a — Shooting Manual: 60 hits -> Hit Rate ▲5.04%, ≤3 stacks, 5 sec, self', () => {
  it('is authored as a self-scoped hitRatePct buff at the kit magnitude, cap and window', () => {
    const { block } = findAnySlot(shipped, isHitRateBuff);
    const eff = hitRateEff(block);
    // Nearest-wrong: Hit Rate re-encoded as generic crit/core damage, an unbounded stack, or a
    // "continuously" (permanent) read. Each of the three fields below rules one of those out.
    expect(eff.value).toBeCloseTo(5.04, 2);
    expect(eff.maxStacks).toBe(3);
    expect(eff.durationSec).toBe(5);
    expect(block.target.kind).toBe('self');
    expect(block.trigger.kind).toBe('hitCount');
    expect(block.trigger.count).toBe(60);
  });

  it('emits the buff live, capped at 3 stacks, ramping from 1 (both cases exercised)', () => {
    expect(smApplies.length).toBeGreaterThan(0);
    expect(smApplies[0].value).toBeCloseTo(5.04, 2);
    expect(smApplies[0].maxStacks).toBe(3);
    const stacks = smApplies.map((e) => e.stacks ?? 0);
    // Non-vacuity: the fixture must exercise BOTH the pre-cap and the at-cap state, else the
    // stack cap is untested.
    expect(stacks[0]).toBe(1);
    expect(Math.max(...stacks)).toBe(3);
    expect(stacks.every((s) => s <= 3)).toBe(true);
  });

  it('fires on a cumulative 60-hit counter, not per trigger pull and not on an interval', () => {
    // Cadence-independent: whatever the SMG's real rate of fire is, applications must track
    // floor(hits / 60). A shotFired-keyed model cannot satisfy this (it fires ~60x as often).
    expect(misatoHits).toBeGreaterThan(60);
    const expected = Math.floor(misatoHits / 60);
    expect(Math.abs(smApplies.length - expected)).toBeLessThanOrEqual(1);

    const perShotApplies = buffApplies(perShot.evs).filter(
      (e) => e.stat === 'hitRatePct' && e.targetSlug === 'misato'
    );
    expect(perShotApplies.length).toBeGreaterThan(smApplies.length * 10);
  });

  it('is damage-live on misato and moves NO teammate (Affects self)', () => {
    const base = totals(control.res);
    const off = totals(noHitRate.res);
    expect(unitOf(control.res, 'misato').totalDamage).toBeGreaterThan(0);
    // Hit Rate lifts the core-hit rate, so zeroing it strictly lowers her own damage.
    expect(base.misato).toBeGreaterThan(off.misato);
    // Nearest-wrong: an allies-scoped read of "Affects self". Every teammate must be untouched.
    for (const slug of Object.keys(base).filter((s) => s !== 'misato')) {
      expect(off[slug]).toBe(base[slug]);
    }
  });

  it('the 3-stack cap and the 5-sec window are both load-bearing', () => {
    const base = totals(control.res).misato;
    // Nearest-wrong #1: a single-stack read ("stacks up to 3" dropped) — strictly less core lift.
    expect(base).toBeGreaterThan(totals(oneStack.res).misato);
    // Nearest-wrong #2: a much shorter window — the buff lapses between 60-hit refreshes and can
    // never reach the cap. (NOTE: at this unit's cadence a 60-hit period is < 5 sec, so 5 sec and
    // a PERMANENT read have near-identical uptime; the wall-clock window is pinned structurally
    // in the authoring test above rather than behaviourally here.)
    expect(base).toBeGreaterThan(totals(shortWindow.res).misato);
  });
});

describe('misato S1-b — 120 hits -> heal 1 lowest-HP% ally (8.04% of caster final Max HP)', () => {
  it('is authored as a 120-hit-count heal to exactly one lowest-HP ally', () => {
    const block = findIn(shipped, 'skill1', isHeal);
    // Nearest-wrong: sharing S1-a's 60-hit counter, or an "all allies" target read.
    expect(block.trigger.kind).toBe('hitCount');
    expect(block.trigger.count).toBe(120);
    expect(block.target.kind).toBe('alliesLowestHp');
    expect(block.target.count).toBe(1);
    expect(healEff(block).kind).toBe('heal');
  });

  it('is board-inert at scope lock: the single target never reaches the on-recovery consumer', () => {
    // v1 resolves "lowest remaining HP" to the leftmost ally (the B1 slot), which carries no
    // recovery trigger — so dropping the block entirely must not move a single unit.
    expect(totals(noS1Heal.res)).toEqual(totals(control.res));
  });

  it('non-vacuity: widening the target set DOES reach an on-recovery consumer', () => {
    // Proves the inertness above is a property of the TARGET SET, not of a dead/unreachable
    // trigger: the same block aimed at all allies reaches the B2 slot's on-recovery kit and
    // produces strictly more buff traffic.
    expect(buffApplies(s1HealAllAllies.evs).length).toBeGreaterThan(
      buffApplies(control.evs).length
    );
  });
});

describe('misato S2 — Shooting Manual riders (both GAP: no engine primitive)', () => {
  it.skip('S2-a "Damage dealt to Shield ▲150%" while in Shooting Manual — GAP: the scope-lock boss has no shield and there is no shield-damage StatKey; belongs in `unmodeled`', () => {
    // no-op
  });

  it.skip('S2-b "Outgoing healing ▲30.05%" at max Shooting Manual stacks — GAP: heal effects carry no HP magnitude, so a healing multiplier has no payload to scale; belongs in `unmodeled`', () => {
    // no-op
  });
});

describe('misato Burst — all allies, recover 5.06% of final Max HP every 1 sec for 5 sec', () => {
  it('is authored as an own-burst-cast heal-over-time: 5 ticks, 1 sec apart, all allies', () => {
    const block = findIn(shipped, 'burst', isHeal);
    const eff = healEff(block);
    // Nearest-wrong #1: keyed to fullBurstEnter (fires on ANY team full burst — over-credits
    // whenever the other Burst I completes the chain instead of misato).
    expect(block.trigger.kind).toBe('burstCast');
    // Nearest-wrong #2: a single instant heal ("recovers X%") instead of 5 discrete ticks —
    // the tick count is what keeps an on-recovery consumer refreshed across the window.
    expect(eff.ticks).toBe(5);
    expect(eff.intervalSec ?? 1).toBe(1);
    expect(block.target.kind).toBe('allies');
  });

  it('non-vacuity: misato actually casts her burst in this fixture', () => {
    // She is Burst I and the control comp already holds a Burst I unit, so this is NOT free.
    // A damage-inert marker appended to her burst block proves the block fires; if this is the
    // only red test in the file, the FIXTURE is wrong, not the model.
    expect(burstCasts(control.evs).length).toBeGreaterThan(0);
    const marker = buffApplies(burstProbe.evs).filter(
      (e) => e.stat === BURST_PROBE_STAT && e.value === 1
    );
    expect(marker.length).toBeGreaterThan(0);
  });

  it('5 ticks to ALL allies drives strictly more on-recovery traffic than the nearest-wrong reads', () => {
    const base = buffApplies(control.evs).length;
    // 1 tick instead of 5 -> the on-recovery consumer is refreshed once per cast, not five times.
    expect(base).toBeGreaterThan(buffApplies(burstOneTick.evs).length);
    // self-only instead of all allies -> the consumer is never reached by this line at all.
    expect(base).toBeGreaterThan(buffApplies(burstSelfOnly.evs).length);
  });
});
