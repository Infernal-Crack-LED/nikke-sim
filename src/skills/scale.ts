// Skill-level scaling. blablalink roledata gives every skill-description
// placeholder as a 10-entry array (index = skill level - 1). The parser reads
// max-level prose, so to run a skill at level L we match each parsed number
// against index 9 of the arrays and substitute index L-1. Durations are never
// scaled (they are level-constant in practice; matching them would risk
// scaling "for 10 sec" that collides with a 10% value).
import type { Block, EffectDef, SkillSlot } from './types.js';

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

  const scaleVal = (v: number, slot: SkillSlot): number => {
    const lvl = levels[slot];
    if (lvl >= 10 || v === 0) return v;
    const abs = Math.abs(v);
    const arr = (arrays[slot] ?? []).find((a) => Math.abs(a[9] - abs) < 0.005);
    if (!arr) {
      missing.add(`${slot}: no level table match for ${v} — kept at max-level value`);
      return v;
    }
    return arr[lvl - 1] * Math.sign(v);
  };

  const scaleEffect = (e: EffectDef, slot: SkillSlot): EffectDef => {
    switch (e.kind) {
      case 'buff': return { ...e, value: scaleVal(e.value, slot) };
      case 'flatDamage': return { ...e, atkPct: scaleVal(e.atkPct, slot) };
      case 'dot': return { ...e, atkPct: scaleVal(e.atkPct, slot) };
      case 'burstCdr': return { ...e, seconds: scaleVal(e.seconds, slot) };
      case 'escalating': return { ...e, steps: e.steps.map((s) => scaleEffect(s, slot)) };
      default: return e;
    }
  };

  const scaled = blocks.map((b) =>
    levels[b.slot] >= 10 ? b : { ...b, effects: b.effects.map((e) => scaleEffect(e, b.slot)) }
  );
  warnings.push(...missing);
  return scaled;
}
