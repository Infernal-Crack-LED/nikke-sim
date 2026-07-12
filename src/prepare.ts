// Turns per-unit loadout choices (cube, OL lines, skill levels) plus data files
// into the engine's PreparedUnit inputs. Shared by the CLI and the web app —
// both pass their own data objects, so this stays filesystem-free.
import type { CharacterData } from './types.js';
import { MAX_SKILL_LEVELS, resolveSkills, type OverrideFile } from './skills/index.js';
import type { SkillLevels, SlotLevelArrays } from './skills/scale.js';
import type { CharacterSkills } from './skills/types.js';

export interface ExtraStat {
  stat: string; // StatKey | 'ammoRefundPerSec' | 'burstGenPct'
  value: number;
}

export interface PreparedUnit {
  skills: CharacterSkills;
  extraStats: ExtraStat[];
  ol?: 0 | 5;      // per-unit overload gear level (falls back to cfg.ol)
  doll?: boolean;  // per-unit doll (falls back to cfg.doll)
  loadout: string[]; // human-readable, for the report
}

export interface LineSelection {
  type: string;   // key in ol-lines.json
  count: number;  // number of lines (max 4 across pieces)
  value?: number; // per-line roll value; default = max roll
}

export interface UnitOptions {
  cube?: { id: string; level: number }; // level 1-15
  ol?: 0 | 5;
  doll?: boolean;
  lines?: LineSelection[];
  skillLevels?: SkillLevels;
}

export interface CubesFile {
  atkByLevel: number[];  // flat ATK all cubes grant, index = level-1
  elemByLevel: number[]; // "damage as strong element" %, index = level-1
  cubes: Record<
    string,
    { name: string; effectStat: string | null; effectByLevel: number[]; image?: string }
  >;
}
export interface OlLinesFile {
  lines: Record<string, { name: string; stat: string; min: number; max: number }>;
}
export interface SkillLevelData {
  [slug: string]: SlotLevelArrays;
}

export interface PrepareDeps {
  overrides: Record<string, OverrideFile | undefined>;
  skillLevels: SkillLevelData;
  cubes: CubesFile;
  olLines: OlLinesFile;
}

export function prepareUnit(
  char: CharacterData,
  opts: UnitOptions | undefined,
  deps: PrepareDeps
): PreparedUnit {
  const levels = opts?.skillLevels ?? MAX_SKILL_LEVELS;
  const arrays = deps.skillLevels[char.slug];
  const skills = resolveSkills(
    char,
    deps.overrides[char.slug],
    arrays ? { arrays, levels } : undefined
  );
  if (!arrays && (levels.skill1 < 10 || levels.skill2 < 10 || levels.burst < 10)) {
    skills.warnings.push('no per-level skill data — values stay at max level');
  }

  const extraStats: ExtraStat[] = [];
  const loadout: string[] = [];
  if (opts?.ol !== undefined) loadout.push(`OL${opts.ol} gear`);
  if (opts?.doll !== undefined && opts.doll) loadout.push('Doll 15');
  if (levels !== MAX_SKILL_LEVELS && (levels.skill1 < 10 || levels.skill2 < 10 || levels.burst < 10)) {
    loadout.push(`skills ${levels.skill1}/${levels.skill2}/${levels.burst}`);
  }

  if (opts?.cube) {
    const cube = deps.cubes.cubes[opts.cube.id];
    if (!cube) throw new Error(`unknown cube "${opts.cube.id}" (see data/cubes.json)`);
    const lvl = Math.min(Math.max(1, opts.cube.level), 15);
    extraStats.push({ stat: 'flatAtk', value: deps.cubes.atkByLevel[lvl - 1] });
    const elem = deps.cubes.elemByLevel[lvl - 1];
    if (elem > 0) extraStats.push({ stat: 'elementDamagePct', value: elem });
    if (cube.effectStat && cube.effectByLevel.length) {
      extraStats.push({ stat: cube.effectStat, value: cube.effectByLevel[lvl - 1] });
    }
    loadout.push(`${cube.name} L${lvl}`);
  }

  for (const sel of opts?.lines ?? []) {
    const line = deps.olLines.lines[sel.type];
    if (!line) throw new Error(`unknown OL line "${sel.type}" (see data/ol-lines.json)`);
    const value = sel.value ?? line.max;
    extraStats.push({ stat: line.stat, value: value * sel.count });
    loadout.push(`${line.name} ×${sel.count} @ ${value}%`);
  }

  return { skills, extraStats, ol: opts?.ol, doll: opts?.doll, loadout };
}

export function prepareTeam(
  chars: CharacterData[],
  unitOpts: (UnitOptions | undefined)[],
  deps: PrepareDeps
): PreparedUnit[] {
  return chars.map((c, i) => prepareUnit(c, unitOpts[i], deps));
}
