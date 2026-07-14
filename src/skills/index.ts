// Resolves a character's skill Blocks: parse the prose, apply a hand-written
// override (if provided), then scale values to the requested skill levels.
// Pure — no filesystem access, so it runs in the browser too. Node callers get
// overrides from ./overrides-node.ts; the web app bundles them via import.meta.glob.
import type { CharacterData } from '../types.js';
import { parseSkill } from './parser.js';
import { scaleBlocks, type SkillLevels, type SlotLevelArrays } from './scale.js';
import type { Block, CharacterSkills, SkillSlot } from './types.js';

const SLOTS: SkillSlot[] = ['skill1', 'skill2', 'burst'];

export interface OverrideFile {
  note?: string;
  modes?: string[]; // user-selectable kit modes (first = default)
  // this unit's attacks are Pierce-tagged (kit says so), so Pierce Damage ▲
  // buffs feed its Damage Up bucket (Q10). Set only on kit-confirmed carriers.
  hasPierce?: boolean; // always pierce (e.g. red-hood)
  pierceModes?: string[]; // pierce only in these modes (e.g. CCW: ["Snipe"])
  // hand-measured corrections to DB weapon data (e.g. real SR fire cycle =
  // charge + bolt recovery, where the DB only records the charge time)
  charFixes?: { chargeFrames?: number; reloadFrames?: number; burstCooldownSec?: number; noBoltRecovery?: boolean; pullsPerSec?: number };
  burstSnapshotsPreFb?: boolean;
  skill1?: Block[];
  skill2?: Block[];
  burst?: Block[];
}

export const MAX_SKILL_LEVELS: SkillLevels = { skill1: 10, skill2: 10, burst: 10 };

export function resolveSkills(
  char: CharacterData,
  override?: OverrideFile,
  scaling?: { arrays: SlotLevelArrays; levels: SkillLevels }
): CharacterSkills {
  const warnings: string[] = [];
  const bySlot: Record<SkillSlot, Block[]> = { skill1: [], skill2: [], burst: [] };

  for (const slot of SLOTS) {
    const { blocks, warnings: w } = parseSkill(char.skills[slot], slot);
    bySlot[slot] = blocks;
    warnings.push(...w);
  }

  let source: CharacterSkills['source'] = 'parser';
  if (override) {
    let replaced = false;
    for (const slot of SLOTS) {
      if (override[slot]) {
        bySlot[slot] = override[slot]!.map((b) => ({ ...b, slot }));
        // override supersedes parser warnings for that slot
        for (let i = warnings.length - 1; i >= 0; i--) {
          if (warnings[i].startsWith(`${slot}:`)) warnings.splice(i, 1);
        }
        replaced = true;
      }
    }
    source = replaced ? (SLOTS.every((s) => override[s]) ? 'override' : 'parser+override') : 'parser';
  }

  let blocks = SLOTS.flatMap((s) => bySlot[s]);
  if (scaling && SLOTS.some((s) => scaling.levels[s] < 10)) {
    blocks = scaleBlocks(blocks, scaling.arrays, scaling.levels, warnings);
  }

  return {
    blocks,
    warnings,
    source,
    modes: override?.modes,
    hasPierce: override?.hasPierce,
    burstSnapshotsPreFb: override?.burstSnapshotsPreFb,
    pierceModes: override?.pierceModes,
  };
}
