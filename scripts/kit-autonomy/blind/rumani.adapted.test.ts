/**
 * rumani — RL / Fire / Defender / Burst I. ammo 6, reloadFrames 129, chargeFrames 60,
 * hitsPerShot 1, normalAttackMultiplier 56.38, coreAttackMultiplier 200.
 *
 * BLIND spec test written from the kit prose alone (S5 cross-family post-op role).
 *
 * WHAT THE KIT SAYS
 *   skill1-a  "Activates when performing a Full Charge attack. Affects self."
 *             Max HP ▲ 3.04%, stacks up to 5, lasts 2 sec.
 *             → RL is a charge weapon (chargeFrames 60), so EVERY trigger pull is a Full
 *               Charge attack ⇒ per-shot self buff. Max HP on a unit with no HP→ATK scaler
 *               is offensively INERT (schema: targetMaxHpPct re-emits as flat 'maxHpFlat'),
 *               but it is still modeled (taxonomy 7: keep the stat for a future consumer).
 *   skill1-b  "...landing a Full Charge attack during Full Burst. Affects the target. Taunts 5s."
 *             → GAP: no taunt/aggro primitive; boss targeting is unmodeled.
 *   skill2    "...hitting a target's Parts for 5 time(s). Affects all allies.
 *             Damage to Parts ▲ 10.05% for 5 sec."
 *             → GAP: the scope-lock boss is PARTLESS, so the trigger can never fire AND the
 *               payload (partsDamagePct) is inert in v1. Doubly inert.
 *   burst-1   "Affects self. Max HP ▲ 15.13% for 10 sec."          → modeled, inert (as above).
 *   burst-2   "Affects all allies. Normal Attack Damage Multiplier ▲ 10.05% for 10 sec."
 *             → the kit's ONLY damage line. Stat is normalAttackPct (scales the normal-attack
 *               multiplier), NOT generic attackDamagePct (which would also lift skill/burst
 *               damage). Trigger is burstCast (her OWN burst), target = all allies incl. self.
 *   burst-3   "Activates when Muscle Up is at max stacks. Affects self. Damage Taken ▼ 20.06%."
 *             → GAP + inert: purely defensive (no HP pool / boss damage at scope lock), and
 *               there is no "own buff at max stacks" gate primitive.
 *
 * FIXTURE
 *   controlComp('rumani', true) — liter B1 / crown B2 / rumani / helm B3, Fire boss, focus rumani.
 *   Deterministic (no seed). rumani is a Burst I unit sharing the stage-1 slot with liter, so the
 *   control comp CANNOT guarantee she wins the cast (see the skipped fixture note at the bottom).
 *   Every burst-slot claim is therefore proven on a counterfactual run whose burst blocks are
 *   force-keyed to fullBurstEnter — that patch changes only the TRIGGER, so the stat / value /
 *   target-set read off it is valid evidence about the shipped block's encoding, while the
 *   baseline-vs-patched difference is itself the trigger-identity discriminator.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { controlComp, runComp, totals, withPatchedOverride } from '../../tests/lib/harness.js'; // path fixed: blind/ sits under kit-autonomy/, not tests/units/

type BuffEv = {
  kind: 'buffApply';
  stat: string;
  value: number;
  stacks?: number;
  maxStacks?: number;
  casterIdx: number | null;
  targetIdx: number | null;
  targetSlug?: string;
};

type EffectLike = { kind: string; stat?: string; value?: number };
type BlockLike = { trigger?: { kind: string }; effects?: EffectLike[] };
type SlotLike = BlockLike[] | { blocks: BlockLike[] };
type OvLike = { skill1?: SlotLike; skill2?: SlotLike; burst?: SlotLike };

// The override FILE is slot-keyed; a slot is either a raw Block[] or a CharacterSkills
// carrying its own blocks[]. Handle both so the counterfactuals never silently no-op.
const blocksOf = (slot: SlotLike | undefined): BlockLike[] =>
  slot === undefined ? [] : Array.isArray(slot) ? slot : slot.blocks;

const setBlocks = (ov: OvLike, slot: 'skill1' | 'skill2' | 'burst', next: BlockLike[]): void => {
  const cur = ov[slot];
  if (cur === undefined || Array.isArray(cur)) ov[slot] = next;
  else cur.blocks = next;
};

const hasStat = (b: BlockLike, stat: string): boolean =>
  (b.effects ?? []).some((e) => e.stat === stat);

const buffs = (evs: SimEvent[]): BuffEv[] =>
  evs.filter((e) => (e as { kind: string }).kind === 'buffApply') as unknown as BuffEv[];

const sum = (t: Record<string, number>): number => Object.values(t).reduce((a, b) => a + b, 0);

function runWith(patch?: (ov: OvLike) => void) {
  const evs: SimEvent[] = [];
  const opts = {
    ...controlComp('rumani', true),
    ...(patch
      ? {
          overrides: {
            rumani: withPatchedOverride('rumani', (ov) => {
              patch(ov as unknown as OvLike);
            }),
          },
        }
      : {}),
    cfg: {
      onEvent: (e: SimEvent) => {
        evs.push(e);
      },
    },
  };
  const res = runComp(opts);
  return { res, evs, tot: totals(res) };
}

const fbKey = (b: BlockLike): void => {
  b.trigger = { kind: 'fullBurstEnter' };
};

// ---- hoisted runs (7 full 180s sims) -------------------------------------------------
const base = runWith();
const noSkill1 = runWith((ov) => setBlocks(ov, 'skill1', []));
const noSkill2 = runWith((ov) => setBlocks(ov, 'skill2', []));
const fbAll = runWith((ov) => blocksOf(ov.burst).forEach(fbKey));
const fbOnlyNa = runWith((ov) => {
  const kept = blocksOf(ov.burst).filter((b) => hasStat(b, 'normalAttackPct'));
  kept.forEach(fbKey);
  setBlocks(ov, 'burst', kept);
});
const fbNoNa = runWith((ov) => {
  const kept = blocksOf(ov.burst).filter((b) => !hasStat(b, 'normalAttackPct'));
  kept.forEach(fbKey);
  setBlocks(ov, 'burst', kept);
});
const fbAsAtkDmg = runWith((ov) =>
  blocksOf(ov.burst).forEach((b) => {
    fbKey(b);
    (b.effects ?? []).forEach((e) => {
      if (e.stat === 'normalAttackPct') e.stat = 'attackDamagePct';
    });
  })
);

const rumaniIdx = buffs(base.evs).find((e) => e.targetSlug === 'rumani')?.targetIdx ?? -1;

describe('rumani skill1 — Muscle Up (Full Charge → self Max HP, 5 stacks, 2 sec)', () => {
  it('applies once per Full Charge attack, i.e. once per trigger pull (RL is a charge weapon)', () => {
    // Discriminates a per-shot trigger from the nearest-wrong encodings: a `passive`
    // (1 apply), a `burstCast`/`fullBurstEnter` keying (<= ~9 applies over 180s), or an
    // `interval` at burst cadence. rumani fires ~100 charged rockets in 180s.
    const muscle = buffs(base.evs).filter(
      (e) => e.stat === 'maxHpFlat' && e.maxStacks === 5 && e.targetSlug === 'rumani'
    );
    expect(muscle.length).toBeGreaterThan(20);
  });

  it('is capped at 5 stacks and never exceeds the cap', () => {
    // "Stacks up to 5 times" — RED under maxStacks omitted / set to 1 / uncapped.
    const muscle = buffs(base.evs).filter(
      (e) => e.stat === 'maxHpFlat' && e.targetSlug === 'rumani' && e.maxStacks !== undefined
    );
    expect(muscle.length).toBeGreaterThan(0);
    expect(muscle.every((e) => e.maxStacks === 5)).toBe(true);
    const peak = Math.max(...muscle.map((e) => e.stacks ?? 1));
    expect(peak).toBeGreaterThanOrEqual(1);
    expect(peak).toBeLessThanOrEqual(5);
  });

  it('"Affects self" — rumani never grants Max HP to a teammate', () => {
    // RED if the target set were widened to `allies` (a common scope slip on a Defender kit).
    expect(rumaniIdx).toBeGreaterThanOrEqual(0);
    const leaked = buffs(base.evs).filter(
      (e) => e.casterIdx === rumaniIdx && e.stat === 'maxHpFlat' && e.targetSlug !== 'rumani'
    );
    expect(leaked).toEqual([]);
  });

  it('is damage-INERT: removing all of skill1 moves no unit by a single point', () => {
    // rumani carries no atkOfMaxHpPct, so Max HP cannot feed damage. RED if Muscle Up were
    // mis-encoded as atkPct / atkOfMaxHpPct / attackDamagePct to "make the Defender do something",
    // and RED if the (unmodelable) taunt had been given a damage payload.
    expect(noSkill1.tot).toEqual(base.tot);
  });
});

describe('rumani skill2 — Parts trigger + Damage to Parts (doubly inert at scope lock)', () => {
  it('never fires: the scope-lock boss is partless, so "hit Parts 5 times" is unreachable', () => {
    // RED under the nearest-wrong reading that turns "hitting a target's Parts for 5 time(s)"
    // into a plain hitCount:5 trigger — that would fire ~20x/fight and emit partsDamagePct.
    expect(buffs(base.evs).filter((e) => e.stat === 'partsDamagePct')).toEqual([]);
  });

  it('is board-inert: removing all of skill2 moves no unit', () => {
    // Guards against the payload being encoded as a generic ally damage buff instead of
    // partsDamagePct (which is parsed-but-inert in v1).
    expect(noSkill2.tot).toEqual(base.tot);
  });
});

describe('rumani burst — trigger identity (own burst cast, not team Full Burst entry)', () => {
  it('is keyed to her OWN burst, not fullBurstEnter', () => {
    // Trigger-identity trap (taxonomy 3): a self/ally buff sitting in the unit's OWN burst block
    // fires only on rotations SHE bursts. rumani is Burst I sharing the stage-1 slot with liter,
    // so re-keying to fullBurstEnter grants the team buff on every Full Burst regardless of who
    // completed the chain — a strict over-credit. GREEN under the faithful burstCast reading.
    expect(fbAll.tot).not.toEqual(base.tot);
    expect(sum(fbAll.tot)).toBeGreaterThanOrEqual(sum(base.tot));
  });
});

describe('rumani burst — Normal Attack Damage Multiplier ▲ 10.05% (the kit\'s only damage line)', () => {
  it('is scoped to the normal-attack multiplier, at 10.05, on ALL allies including self', () => {
    // Read off the trigger-patched run so the claim is non-vacuous even if rumani loses the
    // stage-1 cast to liter in the control comp. The patch changes ONLY the trigger, so stat /
    // value / target-set are the shipped block's own encoding.
    // RED under the nearest-wrong stat `attackDamagePct` (generic Damage Up, which would also
    // lift skill and burst damage), and RED under a self-only or excludeSelf target set.
    const na = buffs(fbAll.evs).filter((e) => e.stat === 'normalAttackPct');
    expect(na.length).toBeGreaterThan(0);
    expect(na.every((e) => Math.abs(e.value - 10.05) < 1e-9)).toBe(true);
    const targets = new Set(na.map((e) => e.targetSlug));
    expect(targets.has('rumani')).toBe(true);
    expect(targets.size).toBe(4);
  });

  it('the normal-attack scope is not damage-equivalent to a generic Damage Up buff', () => {
    // Magnitude-level confirmation of the scope claim: normalAttackPct scales the normal-attack
    // multiplier, attackDamagePct lands additively in the Damage Up bucket (diluted by co-active
    // support buffs and applied to non-normal damage too). Same 10.05, different board.
    expect(sum(fbAsAtkDmg.tot)).not.toBe(sum(fbAll.tot));
  });

  it('is the ONLY burst line that moves damage (non-vacuity for the inertness test below)', () => {
    expect(sum(fbNoNa.tot)).toBeLessThan(sum(fbAll.tot));
  });
});

describe('rumani burst — self Max HP ▲ 15.13% and Damage Taken ▼ 20.06% are inert', () => {
  it('dropping both defensive burst lines moves nothing, even when they are exercised', () => {
    // Non-vacuous: both runs have the burst blocks force-keyed to fullBurstEnter, so the two
    // defensive lines DO apply in fbAll. RED if the self Max HP grant had been encoded as an
    // ATK-flavoured stat, or if "Damage Taken ▼" (a SELF defensive buff, no HP pool at scope
    // lock) had been encoded as the boss debuff damageTakenPct — which would raise team damage.
    expect(fbOnlyNa.tot).toEqual(fbAll.tot);
  });
});

describe('rumani — GAPs (no primitive / unobservable at scope lock)', () => {
  it.skip('skill1: "Taunts for 5 sec" on a Full Charge hit during Full Burst — GAP: no taunt/aggro primitive; the boss has no targeting model', () => {});

  it.skip('skill2: "Damage to Parts ▲ 10.05%" — GAP: partsDamagePct is parsed-but-inert in v1 (partless boss); the parts-hit trigger is likewise unreachable', () => {});

  it.skip('burst: "Damage Taken ▼ 20.06%" on self — GAP: purely defensive, no HP pool and the boss deals no damage at scope lock', () => {});

  it.skip('burst: "Activates when Muscle Up is at max stacks" — GAP: no own-buff-stack gate primitive (resourceGate reads a resource pool, not a buff\'s stack count)', () => {});

  it.skip('FIXTURE GAP: rumani is Burst I and shares the stage-1 slot with the control comp\'s liter, so controlComp cannot guarantee she ever casts her own burst — every burst-slot claim above is proven on a trigger-patched counterfactual instead', () => {});
});
