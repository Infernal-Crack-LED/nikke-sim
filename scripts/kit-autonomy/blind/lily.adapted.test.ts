/**
 * lily (Lily) — per-unit kit spec test.
 * Written BLIND from the kit prose alone (cross-family S5): no sight of the driver's tests,
 * override, or reasoning.
 *
 * KIT AS GIVEN
 *   S1  ■ Affects 1 random ally unit. ATK ▲20% of the skill user's ATK for 5 sec.
 *       NOTE: the prose carries NO activation clause — trigger + cadence are OUTSIDE the input
 *       domain and are a ⚑ (datamined skill cooldown / interval convention). Nothing here
 *       asserts a specific cadence; only that the line RECURS (a 'for 5 sec' window on a
 *       one-shot passive would have ~zero uptime).
 *   S2  ■ Affects all allies. Restores 10% of Cover HP.
 *   BRS ■ 1 random ally whose cover has been destroyed: rebuild cover 30% HP,
 *         ATK ▲20% of the skill user's ATK for 10 sec.
 *       ■ 1 random ally if NO ally's cover is destroyed: ATK ▲40% of the skill user's ATK
 *         for 10 sec.
 *
 * SCOPE-LOCK READING (the load-bearing claim this file pins)
 *   v1 has no HP/cover pool and the boss deals no damage, so no ally's cover is ever destroyed.
 *   The burst's SECOND branch (40%) is the only reachable one. The nearest-wrong models are:
 *     (a) modeling the destroyed-cover branch instead  → burst grant halved (ratio 1:1 vs S1);
 *     (b) modeling BOTH branches                        → burst double-counts (two grants/cast);
 *     (c) 'random ally' widened to all allies           → ~4-5× over-credit.
 *   Each has a discriminating assertion below.
 *
 * CASTER-SCALED VALUES: casterAtkPct re-emits FLAT (kit%/100 × caster staticAtk), so the tests
 * assert the flat magnitude and the 2:1 RATIO between the burst grant and the S1 grant — the
 * ratio is config-independent and survives a non-round datamined magnitude (20.71 / 41.42).
 *
 * FIXTURE: controlComp('lily', true) — liter B1 / crown B2 / lily / helm B3, so a burst chain
 * actually completes (a comp with no B1+B2 casts nothing).
 *   ⚠ KNOWN FIXTURE HAZARD: lily is Burst II and so is crown, so both compete for stage 2. The
 *   first non-vacuity test is a guard for exactly that: if 'fixture exercises the burst' goes
 *   RED while the S1 tests stay GREEN, the FIXTURE is at fault (crown wins stage 2 every
 *   rotation) and the comp must be rebuilt without a competing Burst II — not the model.
 *
 * lily's caster index is DERIVED, not hardcoded: a fully-silenced-lily run is differenced
 * against the control run, and the casterIdx that disappears is hers.
 *
 * The override FILE shape is documented two ways in the harness notes (slot → Block[] vs
 * slot → { blocks: Block[] }); blocksOf() below tolerates BOTH and mutates in place, so the
 * counterfactuals cannot silently no-op on the wrong shape.
 *
 * 6 hoisted sim runs.
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

const SLUG = 'lily';

type Comp = ReturnType<typeof controlComp>;
type Patched = ReturnType<typeof withPatchedOverride>;
type SlotName = 'skill1' | 'skill2' | 'burst';

interface BuffEv {
  stat: string;
  value: number;
  casterIdx: number | null;
  targetIdx: number | null;
  targetSlug?: string;
  expiresFrame?: number;
  durationShots?: number;
}

interface EffLike {
  kind: string;
  stat?: string;
  value?: number;
  durationSec?: number;
}

interface BlockLike {
  effects: EffLike[];
  target: { kind: string; count?: number };
}

type SlotLike = BlockLike[] | { blocks: BlockLike[] };

function blocksOf(ov: unknown, slot: SlotName): BlockLike[] {
  const s = (ov as Record<SlotName, SlotLike | undefined>)[slot];
  if (!s) throw new Error(`lily override: slot ${slot} is missing`);
  return Array.isArray(s) ? s : s.blocks;
}

function atkGrants(ov: unknown, slot: SlotName): EffLike[] {
  return blocksOf(ov, slot).flatMap((b) =>
    b.effects.filter((e) => e.kind === 'buff' && e.stat === 'casterAtkPct'),
  );
}

function atkGrantBlock(ov: unknown, slot: SlotName): BlockLike {
  const blk = blocksOf(ov, slot).find((b) =>
    b.effects.some((e) => e.kind === 'buff' && e.stat === 'casterAtkPct'),
  );
  if (!blk) throw new Error(`lily override: no casterAtkPct grant in ${slot}`);
  return blk;
}

interface Captured {
  res: ReturnType<typeof runComp>;
  buffs: BuffEv[];
  per: Record<string, number>;
  sum: number;
}

function run(comp: Comp): Captured {
  const buffs: BuffEv[] = [];
  const res = runComp({
    ...comp,
    cfg: {
      ...(comp.cfg ?? {}),
      onEvent: (ev: SimEvent) => {
        if (ev.kind === 'buffApply') buffs.push(ev as unknown as BuffEv);
      },
    },
  });
  const per = totals(res);
  const sum = Object.values(per).reduce((a, b) => a + b, 0);
  return { res, buffs, per, sum };
}

function compWith(patched: Patched): Comp {
  const c = SOLE_B2_COMP;
  return { ...c, overrides: { ...(c.overrides ?? {}), [SLUG]: patched } };
}

// The committed model, cloned read-only (structural assertions read this).
const shipped = withPatchedOverride(SLUG, (ov) => {
  if (!ov) throw new Error('lily override did not load');
});


// ADAPT #3 (structural, fixture): the pristine fixture controlComp('lily', true) seats crown
// (B2) beside lily (B2) — crown wins stage 2 every rotation and lily never casts, which is the
// exact hazard this file's header pre-diagnosed ("the comp must be rebuilt without a competing
// Burst II — not the model"). Rebuilt as the sole-B2 shape: liter B1 / lily B2 / ada B3 / helm B3.
const SOLE_B2_COMP: Comp = {
  slugs: ['liter', 'lily', 'ada', 'helm'],
  bossElement: 'Fire',
  focusSlug: 'ada',
};

// ---- hoisted runs (6) -------------------------------------------------------
const control = run(SOLE_B2_COMP);

// lily fully silenced: derives her caster index + proves her kit moves the board at all.
const silenced = run(
  compWith(
    withPatchedOverride(SLUG, (ov) => {
      (['skill1', 'skill2', 'burst'] as SlotName[]).forEach((s) => {
        blocksOf(ov, s).length = 0;
      });
    }),
  ),
);

// nearest-wrong (c): '1 random ally' widened to the whole team.
const burstToAllies = run(
  compWith(
    withPatchedOverride(SLUG, (ov) => {
      atkGrantBlock(ov, 'burst').target = { kind: 'allies' };
    }),
  ),
);

// nearest-wrong: the 10 sec window is unbounded / much longer.
const burstLongWindow = run(
  compWith(
    withPatchedOverride(SLUG, (ov) => {
      atkGrants(ov, 'burst').forEach((e) => {
        e.durationSec = (e.durationSec ?? 10) * 6;
      });
    }),
  ),
);

// nearest-wrong (a): the destroyed-cover branch magnitude (half of the live branch).
const burstHalved = run(
  compWith(
    withPatchedOverride(SLUG, (ov) => {
      atkGrants(ov, 'burst').forEach((e) => {
        e.value = (e.value ?? 0) / 2;
      });
    }),
  ),
);

// S2 removed entirely: Cover-HP restore must be damage-inert at scope lock.
const s2Removed = run(
  compWith(
    withPatchedOverride(SLUG, (ov) => {
      blocksOf(ov, 'skill2').length = 0;
    }),
  ),
);

// ---- derived: lily's caster index + her own buff applications ---------------
const silencedCasters = new Set(silenced.buffs.map((b) => b.casterIdx));
const lilyCasterIdxs = [...new Set(control.buffs.map((b) => b.casterIdx))]
  .filter((i): i is number => i !== null)
  .filter((i) => !silencedCasters.has(i));
const lilyIdx = lilyCasterIdxs.length === 1 ? lilyCasterIdxs[0] : null;
const lilyBuffs =
  lilyIdx === null ? [] : control.buffs.filter((b) => b.casterIdx === lilyIdx);

const byExpiry = new Map<number, BuffEv[]>();
for (const b of lilyBuffs) {
  const k = b.expiresFrame ?? -1;
  const arr = byExpiry.get(k) ?? [];
  arr.push(b);
  byExpiry.set(k, arr);
}
const maxSimultaneous = Math.max(
  0,
  ...[...byExpiry.values()].map((g) => g.length),
);
const uniqueMagnitudes = [
  ...new Set(lilyBuffs.map((b) => Math.round(b.value))),
].sort((a, b) => a - b);

describe('lily — fixture + kit liveness', () => {
  it('lily deals damage and her kit moves the board (non-vacuity)', () => {
    expect(unitOf(control.res, SLUG).totalDamage).toBeGreaterThan(0);
    // If this is equal, none of lily's blocks reach the engine and every assertion
    // below is vacuous.
    expect(control.sum).toBeGreaterThan(silenced.sum);
  });

  it('lily is the only caster removed by silencing her (index derivation)', () => {
    expect(lilyCasterIdxs).toHaveLength(1);
    expect(lilyBuffs.length).toBeGreaterThan(0);
  });

  it('fixture exercises BOTH the S1 grant and the burst grant', () => {
    // Two distinct flat magnitudes = S1 (20%) and the burst (40%) both fired.
    // RED with one magnitude = lily never cast her burst in this comp (crown, the other
    // Burst II, is winning stage 2) — a FIXTURE fault, not a model fault.
    expect(uniqueMagnitudes).toHaveLength(2);
  });
});

describe('lily S1 — ATK ▲20% of the skill user ATK, 1 random ally, 5 sec', () => {
  it('grants the CASTER-scaled ATK stat, not a target-scaled percentage', () => {
    // Nearest-wrong: atkPct (scales the TARGET's own ATK) or highestAllyAtkPct.
    expect(lilyBuffs.length).toBeGreaterThan(0);
    for (const b of lilyBuffs) expect(b.stat).toBe('casterAtkPct');
  });

  it('values are FLAT-resolved, not the raw kit percentage', () => {
    // 20 / 40 would mean the engine kept the percentage; a caster-scaled grant re-emits
    // (kit%/100) × caster staticAtk, which is in the thousands at scope lock.
    for (const b of lilyBuffs) expect(b.value).toBeGreaterThan(1000);
  });

  it('duration is SECONDS, never a round count', () => {
    // Failure-mode 2: 'for N sec' mis-encoded as durationShots.
    for (const b of lilyBuffs) expect(b.durationShots ?? null).toBeNull(); // ADAPT: engine emits null, not undefined
  });

  it('the S1 grant RECURS over the fight', () => {
    // A 'for 5 sec' line encoded as a one-shot passive applies once at frame 0 and lapses
    // for the remaining ~175 sec. Cadence itself is a ⚑ (see the skipped trigger test).
    const low = Math.min(...uniqueMagnitudes);
    const s1Applications = lilyBuffs.filter(
      (b) => Math.round(b.value) === low,
    );
    expect(s1Applications.length).toBeGreaterThanOrEqual(2);
  });

  it('S1 is authored as a single-ally grant, not a team grant', () => {
    const blk = atkGrantBlock(shipped, 'skill1');
    expect(blk.target.kind).not.toBe('allies');
    if (blk.target.count !== undefined) expect(blk.target.count).toBe(1);
    expect(atkGrants(shipped, 'skill1')).toHaveLength(1);
  });
});

describe('lily burst — the no-destroyed-cover branch is the ONLY live branch', () => {
  it('models ONE branch, not both', () => {
    // Nearest-wrong (b): both branches authored, so one cast emits a 20% AND a 40% grant.
    expect(atkGrants(shipped, 'burst')).toHaveLength(1);
  });

  it('the burst grant is exactly 2x the S1 grant (40% vs 20%)', () => {
    // Pins the 40% branch. RED under nearest-wrong (a) — the destroyed-cover 20% branch
    // would give a 1:1 ratio. Ratio-based so a non-round datamined magnitude still passes.
    const s1 = atkGrants(shipped, 'skill1')[0].value ?? 0;
    const brs = atkGrants(shipped, 'burst')[0].value ?? 0;
    expect(s1).toBeGreaterThan(0);
    expect(brs).toBeCloseTo(2 * s1, 5);
    // …and the same 1:2 relation must survive into the emitted flat values.
    const [lo, hi] = uniqueMagnitudes;
    expect(hi).toBeCloseTo(2 * lo, -1);
  });

  it('the burst magnitude is load-bearing (RED under the 20% cover branch)', () => {
    expect(burstHalved.sum).toBeLessThan(control.sum);
  });

  it('exactly one ally is buffed per activation, never the whole team', () => {
    // Grants sharing an expiry frame are one activation's targets. Faithful: 1 (a rare
    // S1/burst expiry collision can make 2). Nearest-wrong (c) 'allies': every group is 4-5.
    expect(maxSimultaneous).toBeGreaterThan(0);
    expect(maxSimultaneous).toBeLessThanOrEqual(2);
    // Behavioural half of the same claim, immune to expiry collisions.
    expect(burstToAllies.sum).toBeGreaterThan(control.sum);
  });

  it('the 10 sec window is real and bounded', () => {
    // RED if the grant were authored permanent / windowless — stretching it would then
    // change nothing.
    expect(burstLongWindow.sum).toBeGreaterThan(control.sum);
  });
});

describe('lily S2 + cover mechanics — inert at scope lock', () => {
  it('S2 (Restores 10% of Cover HP) moves NO damage, on lily or any teammate', () => {
    // Cover HP is not a modeled pool, and cover restoration is not unit-HP recovery — so
    // S2 must not be encoded as a heal, which would fire teammates' on-recovery triggers
    // (crown is in this fixture). Removing S2 entirely must be byte-identical.
    expect(s2Removed.per).toEqual(control.per);
  });

  it('lily grants nothing but the two ATK windows', () => {
    // Inertness: no shield/heal-adjacent stat, no debuff, nothing in a second bucket.
    const stats = new Set(lilyBuffs.map((b) => b.stat));
    expect([...stats]).toEqual(['casterAtkPct']);
  });

  it.skip('burst branch 1 (cover destroyed) — unobservable: no cover/HP pool, boss deals no damage, so the branch can never fire at scope lock', () => {
    expect(atkGrants(shipped, 'burst').length).toBeGreaterThan(0);
  });

  it.skip('Rebuild Cover with 30% HP — no primitive: cover is not a modeled resource', () => {
    expect(blocksOf(shipped, 'burst').length).toBeGreaterThan(0);
  });

  it.skip('1 RANDOM ally — no random-target primitive in the schema; any deterministic stand-in (leftmost / top-ATK / self) over-credits vs a uniform random draw and is a documented modeling gap', () => {
    expect(atkGrantBlock(shipped, 'burst').target.kind).toBeDefined();
  });

  it.skip('S1 + burst trigger cadence — ⚑ the kit prose gives NO activation clause for S1; the trigger/first-fire phase comes from the datamined skill cooldown convention, not the text, and is measurement-gated', () => {
    expect(blocksOf(shipped, 'skill1').length).toBeGreaterThan(0);
  });
});
