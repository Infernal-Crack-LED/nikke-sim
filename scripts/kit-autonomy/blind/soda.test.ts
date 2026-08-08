/**
 * soda — MG / Fire / Supporter / Burst I. BLIND kit spec test, written from the kit prose alone
 * (no sight of the driver override, the driver tests, or any truth file).
 *
 * KIT (paraphrased; quotes kept short)
 *  S1   'Activates after 180 normal attack(s)' — self. Maid Spirit: Max HP ▲13%, up to 5 stacks, 10 sec.
 *  S2a  all allies, restores HP = 3.23% of the skill user final Max HP. NO activation clause.
 *  S2b  'when Maid Spirit is at max stacks' — all allies, restores 12.71% of the user final Max HP.
 *  B    2 random enemies: 321.28% of final ATK, plus Stun 1 sec; all Fire Code allies: buff stack count ▲1.
 *
 * FIXTURES AND WHY
 *  - control = controlComp('soda', true) → liter B1 / crown B2 / soda / helm B3, Fire boss, focus soda.
 *    Heals carry no HP amount in this engine and emit no dedicated event kind, so a heal is observable
 *    ONLY through a consumer: crown carries an on-recovery block, so soda heals show up as a change in
 *    the run buffApply stream. That tandem channel is what the S2 group reads.
 *  - burst fixture: soda is Burst I and the control fixture already seats liter (also B1, earlier slot)
 *    so soda never casts her own burst there and every burst assertion would be vacuous. The burst group
 *    therefore appends an in-memory burstEligibility stage-3 block so she takes the B3 slot ahead of helm
 *    and actually casts. Both burst runs carry that same block, so every comparison is WITHIN the fixture
 *    and the added block cannot flatter the result.
 *
 * SLOT INDEX: resolved at runtime from a buffApply that targets soda (liter/crown buff all allies), so
 * no hard-coded team ordering is assumed.
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

// ------------------------------------------------------------------ event views
interface BuffApplyEv {
  kind: 'buffApply';
  stat: string;
  key?: string;
  value: number;
  stacks?: number;
  maxStacks?: number;
  casterIdx: number | null;
  targetIdx: number | null;
  targetSlug?: string;
  expiresFrame?: number;
  durationShots?: number;
}
interface DamageEv {
  kind: 'damage';
  bucket: string;
  srcSlot: number;
  inFullBurst?: boolean;
  fbMajorApplied?: boolean;
}

const buffApplies = (evs: SimEvent[]): BuffApplyEv[] =>
  evs.filter((e) => e.kind === 'buffApply') as unknown as BuffApplyEv[];

// ------------------------------------------------------------- override access
// The loaded OverrideFile is slot-keyed; a slot is either a raw Block[] or a
// CharacterSkills carrying .blocks. Both are handled, and every patch below mutates
// the array IN PLACE so the shape question never matters.
type Slot = 'skill1' | 'skill2' | 'burst';
function blocksOf(ov: any, slot: Slot): any[] {
  const s = ov?.[slot];
  if (!s) return [];
  return Array.isArray(s) ? s : (s.blocks ?? []);
}

// withPatchedOverride hands back a deep clone of the committed JSON — capturing it
// is a read of the shipped override (disk untouched).
let committed: any;
withPatchedOverride('soda', (ov: any) => {
  committed = ov;
});

// -------------------------------------------------------------------- the runner
function run(patch?: (ov: any) => void) {
  const evs: SimEvent[] = [];
  const push = (e: SimEvent) => {
    evs.push(e);
  };
  const opts = controlComp('soda', true) as any;
  opts.cfg = { ...(opts.cfg ?? {}), onEvent: push };
  opts.onEvent = push;
  if (patch) {
    opts.overrides = {
      ...(opts.overrides ?? {}),
      soda: withPatchedOverride('soda', patch),
    };
  }
  const res = runComp(opts);
  return { res, evs, total: totals(res) as Record<string, number> };
}

const addBurstEligibility = (ov: any) => {
  blocksOf(ov, 'burst').push({
    slot: 'burst',
    trigger: { kind: 'passive' },
    target: { kind: 'self' },
    effects: [{ kind: 'burstEligibility', stage: 3 }],
  });
};

const stripBurstDamage = (ov: any) => {
  const bs = blocksOf(ov, 'burst');
  const kept = bs
    .map((b: any) => ({
      ...b,
      effects: (b.effects ?? []).filter(
        (e: any) =>
          e.kind !== 'flatDamage' &&
          e.kind !== 'hitRepeat' &&
          e.kind !== 'dot' &&
          e.kind !== 'storedHit',
      ),
    }))
    .filter((b: any) => b.effects.length > 0);
  bs.splice(0, bs.length, ...kept);
};

// ------------------------------------------------------------- runs (5, hoisted)
const base = run();
const doubled = run((ov) => {
  for (const b of blocksOf(ov, 'skill1'))
    for (const e of b.effects ?? [])
      if (e.kind === 'buff' && typeof e.value === 'number') e.value *= 2;
});
const noHeals = run((ov) => {
  blocksOf(ov, 'skill2').splice(0);
});
const burstFix = run(addBurstEligibility);
const burstFixNoDamage = run((ov) => {
  stripBurstDamage(ov);
  addBurstEligibility(ov);
});

const sodaIdx = (() => {
  const hit = buffApplies(base.evs).find(
    (e) => e.targetSlug === 'soda' && e.targetIdx !== null && e.targetIdx !== undefined,
  );
  if (!hit)
    throw new Error('fixture problem: no buffApply targeted soda, cannot resolve her slot index');
  return hit.targetIdx as number;
})();

function damageOf(res: any, evs: SimEvent[], idx: number): DamageEv[] {
  const all = evs.filter((e) => e.kind === 'damage') as unknown as DamageEv[];
  const mine = all.filter((e) => (e as any).srcSlot === idx);
  if (mine.length > 0) return mine;
  // fallback if srcSlot is not the team-slot index in this build
  const row: any = unitOf(res, 'soda');
  return ((row?.events ?? []) as any[]).filter((e) => e.kind === 'damage') as DamageEv[];
}

const spiritOf = (evs: SimEvent[]) =>
  buffApplies(evs).filter(
    (e) =>
      e.stat === 'maxHpFlat' &&
      e.targetSlug === 'soda' &&
      e.casterIdx === sodaIdx &&
      e.targetIdx === sodaIdx,
  );

// =============================================================================
describe('soda — override shape (no silent drops)', () => {
  it('declares all three skill slots with at least one block each', () => {
    expect(blocksOf(committed, 'skill1').length).toBeGreaterThan(0);
    expect(blocksOf(committed, 'skill2').length).toBeGreaterThan(0);
    expect(blocksOf(committed, 'burst').length).toBeGreaterThan(0);
  });

  it('records the burst lines it cannot model in unmodeled.burst', () => {
    // Stun on the boss has no enemy entity to land on, and there is no primitive that
    // raises another buff stack count — at least one of those two must be written down
    // rather than silently dropped.
    const um = committed?.unmodeled?.burst ?? [];
    expect(Array.isArray(um)).toBe(true);
    expect(um.length).toBeGreaterThanOrEqual(1);
  });
});

// =============================================================================
describe('soda S1 — Maid Spirit: 180 normal attacks, self, Max HP ▲13%, 5 stacks, 10 sec', () => {
  const spirit = spiritOf(base.evs);

  it('fires on a hit-count cadence — not once at t=0, and not once per shot', () => {
    // Discriminates the trigger identity. A passive/self mis-model applies exactly once
    // (length 1); a shotFired mis-model applies thousands of times; hitCount:180 over an
    // MG belt economy (300 ammo, ~10 magazines in 180 s) lands roughly 10-20 times.
    expect(spirit.length).toBeGreaterThan(1);
    expect(spirit.length).toBeLessThan(40);
  });

  it('declares a 5-stack cap and never exceeds it', () => {
    expect(spirit[0].maxStacks).toBe(5);
    const peak = Math.max(...spirit.map((e) => e.stacks ?? 1));
    expect(peak).toBeGreaterThanOrEqual(1);
    expect(peak).toBeLessThanOrEqual(5);
  });

  it('is a 10-second timed window — not a round-count buff and not permanent', () => {
    // Taxonomy trap 2. durationShots set would mean the window was read as N rounds.
    expect(spirit[0].durationShots ?? undefined).toBeUndefined();
    // A permanent/whole-fight encoding parks expiresFrame past the end of the fight and
    // never advances; a real 10 s window re-arms 600 frames past each application.
    for (let i = 1; i < spirit.length; i++) {
      expect(spirit[i].expiresFrame as number).toBeGreaterThan(
        spirit[i - 1].expiresFrame as number,
      );
    }
    const last = spirit[spirit.length - 1];
    expect(last.expiresFrame as number).toBeLessThanOrEqual(180 * 60 + 601);
  });

  it('grants to self only — no teammate receives Max HP from soda', () => {
    const leaked = buffApplies(base.evs).filter(
      (e) => e.casterIdx === sodaIdx && e.targetIdx !== sodaIdx && e.stat === 'maxHpFlat',
    );
    expect(leaked).toHaveLength(0);
  });

  it('magnitude is caster-scaled, and the whole line is offensively inert', () => {
    // Doubling the authored percentage must exactly double the flat-resolved Max HP grant
    // (proves the emitted value is (kit%/100) x her own Max HP and is read from the override),
    // while moving ZERO damage anywhere: soda has no HP->ATK conversion and no unit in the
    // control comp scales off Max HP. Nearest-wrong: routing the line through an ATK-ish
    // stat, which would move her total here.
    const dbl = spiritOf(doubled.evs);
    expect(dbl.length).toBeGreaterThan(0);
    expect(dbl[0].value).toBeCloseTo(spirit[0].value * 2, 6);
    expect(doubled.total).toEqual(base.total);
  });
});

// =============================================================================
describe('soda S2 — ally heals (flat line, plus a max-stack-gated line)', () => {
  const healBlocks = blocksOf(committed, 'skill2').filter((b: any) =>
    (b.effects ?? []).some((e: any) => e.kind === 'heal'),
  );

  it('heals ALL allies, not self only', () => {
    // Target set question. Kit says Affects all allies for both lines.
    expect(healBlocks.length).toBeGreaterThanOrEqual(1);
    for (const b of healBlocks) {
      expect(b.target?.kind).toBe('allies');
      expect(b.target?.excludeSelf ?? false).toBe(false);
    }
  });

  it('models BOTH heal lines, with the second one conditioned', () => {
    // Nearest-wrong: encoding the 12.71% max-stack heal as a second unconditional heal on
    // the same cadence, which over-fires every on-recovery consumer in the team. Any real
    // condition counts (a resource/stack gate, an everyN proxy, or a distinct trigger).
    expect(healBlocks.length).toBeGreaterThanOrEqual(2);
    const conditioned = (b: any) =>
      Boolean(
        b.resourceGate ||
          b.everyN ||
          b.requiresTargetStatus ||
          b.fbGate ||
          b.ownBurstGate ||
          b.requiresCore ||
          b.swapGate,
      );
    const distinctTriggers = new Set(healBlocks.map((b: any) => JSON.stringify(b.trigger))).size;
    expect(healBlocks.some(conditioned) || distinctTriggers > 1).toBe(true);
  });

  it('the heals actually reach a consumer — removing S2 changes the run', () => {
    // Tandem check (taxonomy 4): a heal is inert on isolation but crown carries an
    // on-recovery block, so soda heals must show up downstream. If deleting every S2 block
    // changes nothing at all, the heal lines are either missing or wired to nothing.
    const withHeals = buffApplies(base.evs).length;
    const without = buffApplies(noHeals.evs).length;
    const changed =
      without !== withHeals || JSON.stringify(noHeals.total) !== JSON.stringify(base.total);
    expect(changed).toBe(true);
  });
});

// =============================================================================
describe('soda burst — 321.28% to 2 random enemies, stun 1 sec, Fire allies stack count ▲1', () => {
  const dmgWith = damageOf(burstFix.res, burstFix.evs, sodaIdx);
  const dmgWithout = damageOf(burstFixNoDamage.res, burstFixNoDamage.evs, sodaIdx);
  const bucketsWith = new Set(dmgWith.map((e) => e.bucket));
  const bucketsWithout = new Set(dmgWithout.map((e) => e.bucket));
  const removed = [...bucketsWith].filter((b) => !bucketsWithout.has(b));

  it('books the burst hit in its own bucket, separate from her MG normals', () => {
    // Non-vacuity plus bucket placement in one: exactly one damage bucket must vanish when
    // the burst damage effect is stripped. Zero buckets removed means she never cast (the
    // eligibility fixture failed) or the line is missing; more than one means the burst hit
    // is bleeding into the normal-attack bucket.
    expect(dmgWith.length).toBeGreaterThan(0);
    expect(removed).toHaveLength(1);
  });

  it('burst-cast damage is Full-Burst exempt', () => {
    // Verified project fact: burst-cast damage lands BEFORE Full Burst begins, so it never
    // takes the +50% major. Nearest-wrong: keying the damage to fullBurstEnter instead of
    // the owner cast, which would stamp fbMajorApplied on every instance.
    const burstDmg = dmgWith.filter((e) => e.bucket === removed[0]);
    expect(burstDmg.length).toBeGreaterThan(0);
    for (const e of burstDmg) expect(e.fbMajorApplied ?? false).toBe(false);
  });

  it('removing the burst damage effect lowers her total', () => {
    expect(burstFix.total['soda']).toBeGreaterThan(burstFixNoDamage.total['soda']);
  });

  it.skip('⚑ 2 enemy unit(s) randomly against a single-target boss: 1 instance or 2 per cast is a flagged authoring choice, and damage events carry no frame field to group instances per cast — the override note must state which reading it took', () => {});

  it.skip('GAP: Stun for 1 sec — the stun primitive targets a NIKKE and the sim has no enemy entity (enemy targets resolve to an empty set), so a boss stun has no observable', () => {});

  it.skip('GAP: all Fire Code allies Stack count of buffs ▲1 — no effect kind increments an existing buff stack count (maxStacks is per-buff and static), so the line has no primitive', () => {});
});
