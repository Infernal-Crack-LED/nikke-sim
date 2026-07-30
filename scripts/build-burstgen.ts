// Precompute the burst-generation ranking board into web/public/burstgen.json
// (vite's publicDir → served at /burstgen.json and copied into dist).
//
// Ranks every sim-supported unit by gauge-per-second contributed in a standard
// no-op team with bursts enabled (see src/ranks/burstgen.ts). BUILD OUTPUT —
// gitignored, not part of verify.sh.
//
//   npx tsx scripts/build-burstgen.ts [--out <path>]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { DataFile, LevelMultiplier, Element } from '../src/types.js';
import { loadOverride } from '../src/skills/overrides-node.js';
import { unitElements } from '../src/elements.js';
import type { OverrideFile } from '../src/skills/index.js';
import type {
  CubesFile,
  OlLinesFile,
  PrepareDeps,
  SkillLevelData,
} from '../src/prepare.js';
import {
  rankBurstGen,
  BURSTGEN_PROFILES,
  type RanksCtx,
} from '../src/ranks/burstgen.js';
import type { BurstGenArtifact, BurstGenRow } from '../src/ranks/types.js';

const load = <T>(rel: string): T =>
  JSON.parse(readFileSync(new URL(rel, import.meta.url), 'utf8')) as T;

const data = load<DataFile>('../data/characters.json');
const mult = load<LevelMultiplier>('../data/level-multiplier.json');
const cubes = load<CubesFile>('../data/cubes.json');
const olLines = load<OlLinesFile>('../data/ol-lines.json');
let skillLevels: SkillLevelData = {};
try {
  skillLevels = load<SkillLevelData>('../data/skill-levels.json');
} catch {
  /* optional */
}

const overrides: Record<string, OverrideFile | undefined> = {};
for (const slug of Object.keys(data.characters)) {
  overrides[slug] = loadOverride(slug);
}
// Synthetic no-op controls are not roster entries, but their overrides carry
// framework effects (no-op B1 team burst CDR, no-op B3 mock burst damage).
for (const slug of ['noop-b1-ar', 'noop-b3-mg']) {
  overrides[slug] = loadOverride(slug);
}

const deps: PrepareDeps = { overrides, skillLevels, cubes, olLines };
const ctx: RanksCtx = { characters: data.characters as any, mult, deps };

// Population: every sim-supported unit (data-driven, NOT tag-driven — the board
// must catch pure weapon/stat generation monsters the burst-gauge-buffer tag
// misses, e.g. trina/jill/mana).
const population: string[] = [];
for (const [slug, c] of Object.entries(data.characters)) {
  if (!c.simSupported) {
    continue;
  }
  population.push(slug);
}

const ranked = rankBurstGen(population, ctx);
const rankedFocused = rankBurstGen(population, ctx, true);

const artifact: BurstGenArtifact = {
  generatedAt: new Date().toISOString(),
  methodology:
    'No-op team 180s fight, bursts enabled: unit tested in a standard no-op team ' +
    '(B1/B2/B3 slots filled by weapon-modal controls), leftmost in its burst ' +
    'category so it bursts first. The unit is measured UNFOCUSED — camera focus ' +
    'is parked on a non-charge no-op teammate, so charge weapons generate at ×1.0 ' +
    '(the ×2.5 focus bonus is a camera artifact not applied on this board). ' +
    'The no-op B1 control provides a 7 s team burst-cooldown reduction to normalize ' +
    'for the baseline CDR a real B1 enabler would contribute. ' +
    "Ranked by the unit's gauge contribution divided by the time the team bar was " +
    'actively building gauge (gaugeBuildTimeSec). 100 = one full bar. Profiles: ' +
    'little-mermaid runs with two MG B3 partners, cinderella-crystal-wave with one ' +
    'MG B3 partner (their team-ammo fills scale with team ammunition burn). ' +
    'Scope-lock loadout (Base-5, 3★/core 7, 10/10/10).',
  focusedMethodology:
    'Identical setup to the unfocused board above, EXCEPT camera focus is placed ' +
    'on the tested unit itself instead of a non-charge no-op teammate — its ' +
    "realistic ceiling as the team's deliberately-built-around burst-gen carry. " +
    'Charge weapons (SR/RL) generate at ×2.5 instead of ×1.0; non-charge weapons ' +
    '(AR/SMG/SG/MG) see no change, since focus grants them no bonus either way — ' +
    'their focused and unfocused numbers are identical. This is why the unfocused ' +
    'board exists as the default: it is the only apples-to-apples comparison across ' +
    'weapon classes, since a board where everyone is "focused" cannot happen at once ' +
    'in a real 5-unit team (only one camera target). Use this board to answer ' +
    '"how good is this unit if I build my team around it", not for cross-class ranking.',
  units: Object.fromEntries(
    population.map((slug) => {
      const c = data.characters[slug];
      return [
        slug,
        {
          name: c.name,
          element: c.element as Element,
          elements: unitElements(c),
          weapon: c.weapon,
          burst: c.burst,
          imageUrl: c.imageUrl ?? null,
        },
      ];
    })
  ),
  profiles: Object.fromEntries(
    Object.values(BURSTGEN_PROFILES).map((p) => [p.id, p.note])
  ),
  entries: ranked.map((r): BurstGenRow => [
    r.slug,
    Math.round(r.gaugePerSec * 100) / 100,
    Math.round(r.gaugeTotal * 100) / 100,
    r.fullBursts,
    r.profile, // null = plain base-team run
  ]),
  focusedEntries: rankedFocused.map((r): BurstGenRow => [
    r.slug,
    Math.round(r.gaugePerSec * 100) / 100,
    Math.round(r.gaugeTotal * 100) / 100,
    r.fullBursts,
    r.profile,
  ]),
};

const outArg = process.argv.indexOf('--out');
const out =
  outArg >= 0
    ? process.argv[outArg + 1]
    : new URL('../web/public/burstgen.json', import.meta.url).pathname;
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(artifact));
process.stderr.write(
  `burstgen: ${ranked.length} units ranked (unfocused) → ${out}\n` +
    ranked
      .slice(0, 10)
      .map(
        (r) =>
          `  #${r.rank} ${r.slug} ${r.gaugePerSec.toFixed(2)}%/s ${r.gaugeTotal.toFixed(1)} bars ${r.fullBursts.toFixed(1)} FB${r.profile ? ` [${r.profile}]` : ''}`
      )
      .join('\n') +
    '\n' +
    `burstgen: ${rankedFocused.length} units ranked (focused, self-carry) →\n` +
    rankedFocused
      .slice(0, 10)
      .map(
        (r) =>
          `  #${r.rank} ${r.slug} ${r.gaugePerSec.toFixed(2)}%/s ${r.gaugeTotal.toFixed(1)} bars ${r.fullBursts.toFixed(1)} FB${r.profile ? ` [${r.profile}]` : ''}`
      )
      .join('\n') +
    '\n'
);
