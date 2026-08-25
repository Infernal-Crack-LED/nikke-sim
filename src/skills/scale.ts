// Skill-level scaling. blablalink roledata gives every skill-description
// placeholder as a 10-entry array (index = skill level - 1). The parser reads
// max-level prose, so to run a skill at level L we match each parsed number
// against index 9 of the arrays and substitute index L-1. Durations are never
// scaled (they are level-constant in practice; matching them would risk
// scaling "for 10 sec" that collides with a 10% value).
//
// Two ways a value used to silently stay at max level while the player lowered the level:
//
//  1. The effect KIND had no case below, so its magnitude was returned untouched AND no warning
//     was emitted. `weaponSwap.damagePct` was the worst of these — the per-shot multiplier of a
//     burst weapon mode is often the carrier's single largest damage term (nayuta's Memory
//     Incineration), so her burst level moved her damage by only ~7% instead of ~40%.
//  2. The authored number is DERIVED — two kit lines folded into one rider, a time-averaged stack
//     ramp, a stack-cap product — so it matches no table entry. That case DID warn
//     ("no level table match for N"), and is now fixed per-value by the `levelScale` annotation
//     (src/skills/types.ts), which names the table anchor(s) the number was derived from.
import type { Block, EffectDef, LevelScale, SkillSlot } from './types.js';

export interface SlotLevelArrays {
  skill1: number[][];
  skill2: number[][];
  burst: number[][];
}
export interface SkillLevels {
  skill1: number;
  skill2: number;
  burst: number;
}

export function scaleBlocks(
  blocks: Block[],
  arrays: SlotLevelArrays,
  levels: SkillLevels,
  warnings: string[]
): Block[] {
  const missing = new Set<string>();

  /** index-9 lookup: the max-level entry of the array this value was parsed from. */
  const findArr = (v: number, slot: SkillSlot): number[] | undefined =>
    (arrays[slot] ?? []).find((a) => Math.abs(a[9] - Math.abs(v)) < 0.005);

  /**
   * Scale one authored number to `levels[slot]`.
   *
   * With a `levelScale` annotation the value is DERIVED, so it is rescaled by the ratio the named
   * anchors move: `v × (Σ anchors@L) / (Σ anchors@10)`. For a fold (Σ anchors@10 === v) that
   * reproduces the exact per-level sum; for a time-average or stack-cap product it scales
   * proportionally, which is what those derivations require.
   */
  const scaleVal = (
    v: number,
    slot: SkillSlot,
    field?: string,
    levelScale?: LevelScale
  ): number => {
    const lvl = levels[slot];
    if (lvl >= 10 || v === 0) {
      return v;
    }
    const anchors = field ? levelScale?.[field] : undefined;
    if (anchors?.length) {
      let atL = 0;
      let atMax = 0;
      for (const anchor of anchors) {
        const arr = findArr(anchor, slot);
        if (!arr) {
          missing.add(
            `${slot}: levelScale anchor ${anchor} is not in the level table — ${v} kept at max-level value`
          );
          return v;
        }
        atL += arr[lvl - 1];
        atMax += arr[9];
      }
      return atMax === 0 ? v : (v * atL) / atMax;
    }
    const arr = findArr(v, slot);
    if (!arr) {
      missing.add(
        `${slot}: no level table match for ${v} — kept at max-level value`
      );
      return v;
    }
    return arr[lvl - 1] * Math.sign(v);
  };

  const scaleEffect = (e: EffectDef, slot: SkillSlot): EffectDef => {
    const constFields = ('levelConst' in e ? e.levelConst : undefined) ?? [];
    const s = (v: number, field: string) =>
      constFields.includes(field)
        ? v
        : scaleVal(
            v,
            slot,
            field,
            'levelScale' in e ? e.levelScale : undefined
          );
    switch (e.kind) {
      case 'buff':
        return { ...e, value: s(e.value, 'value') };
      case 'flatDamage':
        return { ...e, atkPct: s(e.atkPct, 'atkPct') };
      case 'dot':
        return { ...e, atkPct: s(e.atkPct, 'atkPct') };
      case 'hitRepeat':
        return { ...e, pct: s(e.pct, 'pct') };
      case 'burstCdr':
        return { ...e, seconds: s(e.seconds, 'seconds') };
      case 'weaponSwap':
        // `damagePct` is the swap weapon's per-shot multiplier — a skill value that scales, EXCEPT
        // on a `sameWeapon` swap, where the gun is not replaced and damagePct is by construction
        // the base weapon's own normalAttackMultiplier (a WEAPON stat, level-invariant).
        //
        // `chargeMultPct` is deliberately NOT scaled: every one of the 8 carriers in the tree
        // authors a round kit constant ("Full Charge Damage: 250% of damage" — 250/300/1750) and
        // not one of them resolves to a level-table entry, so scaling it would only emit warnings
        // nobody can act on. Revisit if a carrier ever ships a table-backed value.
        return e.sameWeapon
          ? e
          : { ...e, damagePct: s(e.damagePct, 'damagePct') };
      case 'fillGauge':
        return { ...e, pct: s(e.pct, 'pct') };
      case 'shield':
        return e.maxHpPct === undefined
          ? e
          : { ...e, maxHpPct: s(e.maxHpPct, 'maxHpPct') };
      case 'stackedNuke':
        return {
          ...e,
          atkPct: s(e.atkPct, 'atkPct'),
          ...(e.hpPct === undefined ? {} : { hpPct: s(e.hpPct, 'hpPct') }),
        };
      case 'storedHit':
        return { ...e, atkPct: s(e.atkPct, 'atkPct') };
      case 'escalating':
        return { ...e, steps: e.steps.map((st) => scaleEffect(st, slot)) };
      default:
        return e;
    }
  };

  const scaled = blocks.map((b) =>
    levels[b.slot] >= 10
      ? b
      : { ...b, effects: b.effects.map((e) => scaleEffect(e, b.slot)) }
  );
  warnings.push(...missing);
  return scaled;
}
