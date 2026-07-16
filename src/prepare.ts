// Turns per-unit loadout choices (cube, OL lines, skill levels) plus data files
// into the engine's PreparedUnit inputs. Shared by the CLI and the web app —
// both pass their own data objects, so this stays filesystem-free.
import type { CharacterData, GearLevel } from './types.js';
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
  ol?: GearLevel;  // per-unit gear level (falls back to cfg.ol)
  doll?: boolean;  // per-unit doll (falls back to cfg.doll)
  lambdaStage?: 1 | 2 | 3; // Λ units only: burst ONLY at this stage (Red Hood "operating as BX")
  stars?: number;  // per-unit Limit Break stars / grade 0-3 (falls back to cfg.copies)
  core?: number;   // per-unit Core enhancement 0-7 (falls back to cfg.copies)
  relationshipLevel?: number; // per-unit bond level (falls back to cfg.relationshipLevel, then the
                              // unit's manufacturer max). See src/relationship.ts, open-questions U18.
  mode?: string;   // selected kit mode (from the override's `modes`; default = first)
  mpPriority?: boolean; // stackedNuke units (Maiden:IR): jump the burst queue at max MP stacks
  burstGate?: 'syncWithFocus' | 'everyOther'; // sync: only cast when the focus unit bursts; everyOther: never take stage 3 twice in a row (Solo framework)
  chargeFrames?: number; // override charFixes: hand-measured real fire cycle (charge + recovery)
  reloadFrames?: number; // override charFixes: hand-measured real reload (e.g. padded animations)
  burstCooldownSec?: number; // override charFixes: corrected burst cooldown (bad DB data)
  noBoltRecovery?: boolean; // charFixes: this SR's DB chargeFrames already includes the bolt recovery
  pullsPerSec?: number; // charFixes: datamined per-unit rate_of_fire deviating from the weapon-class rate
  loadout: string[]; // human-readable, for the report
}

export interface LineSelection {
  type: string;   // key in ol-lines.json
  count: number;  // number of lines (max 4 across pieces)
  value?: number; // per-line roll value; default = max roll
}

export interface UnitOptions {
  cube?: { id: string; level: number }; // level 1-15
  ol?: GearLevel;
  doll?: boolean;
  lambdaStage?: 1 | 2 | 3;
  stars?: number; // Limit Break stars / grade 0-3
  core?: number;  // Core enhancement 0-7
  relationshipLevel?: number; // bond level (undefined = the manufacturer's max)
  mode?: string;  // kit mode (must match an entry in the override's `modes`)
  mpPriority?: boolean;
  burstGate?: 'syncWithFocus' | 'everyOther'; // sync: only cast when the focus unit bursts; everyOther: never take stage 3 twice in a row (Solo framework)
  // flat burst-cooldown reduction in seconds (e.g. the Solo control framework's 7s CDR);
  // applied on top of any charFixes-corrected cooldown, floor 1s
  burstCdrSec?: number;
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
  if (opts?.ol !== undefined) loadout.push(opts.ol === 'base5' ? 'Base 5 gear' : `OL${opts.ol} gear`);
  if (opts?.doll !== undefined && opts.doll) loadout.push('Doll 15');
  if (opts?.lambdaStage) loadout.push(`bursts as B${opts.lambdaStage}`);
  const mode = skills.modes?.length
    ? (opts?.mode && skills.modes.includes(opts.mode) ? opts.mode : skills.modes[0])
    : undefined;
  if (mode) loadout.push(`mode: ${mode}`);
  if (opts?.mpPriority) loadout.push('bursts at max MP');
  if (opts?.burstGate === 'syncWithFocus') loadout.push('bursts in sync with focus');
  if (opts?.burstGate === 'everyOther') loadout.push('bursts every other full burst');
  if (opts?.stars !== undefined || opts?.core !== undefined)
    loadout.push(`${opts?.stars ?? 0}★ · core ${opts?.core ?? 0}`);
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

  // burst CDR: subtract from the charFixes-corrected (or DB) cooldown, floor 1s
  const cdBase = deps.overrides[char.slug]?.charFixes?.burstCooldownSec ?? char.burstCooldownSec;
  const burstCooldownSec = opts?.burstCdrSec
    ? Math.max(1, cdBase - opts.burstCdrSec)
    : deps.overrides[char.slug]?.charFixes?.burstCooldownSec;
  if (opts?.burstCdrSec) loadout.push(`burst CDR ${opts.burstCdrSec}s (→${burstCooldownSec}s)`);

  return {
    skills,
    extraStats,
    ol: opts?.ol,
    doll: opts?.doll,
    lambdaStage: opts?.lambdaStage,
    stars: opts?.stars,
    core: opts?.core,
    relationshipLevel: opts?.relationshipLevel,
    mode,
    mpPriority: opts?.mpPriority,
    burstGate: opts?.burstGate,
    chargeFrames: deps.overrides[char.slug]?.charFixes?.chargeFrames,
    reloadFrames: deps.overrides[char.slug]?.charFixes?.reloadFrames,
    burstCooldownSec,
    noBoltRecovery: deps.overrides[char.slug]?.charFixes?.noBoltRecovery,
    pullsPerSec: deps.overrides[char.slug]?.charFixes?.pullsPerSec,
    loadout,
  };
}

export function prepareTeam(
  chars: CharacterData[],
  unitOpts: (UnitOptions | undefined)[],
  deps: PrepareDeps
): PreparedUnit[] {
  return chars.map((c, i) => prepareUnit(c, unitOpts[i], deps));
}
