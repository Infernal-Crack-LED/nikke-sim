// Precompute the DPS-chart matrix into img/dpschart.json (vite's publicDir → served
// at /dpschart.json and copied into dist).
//
// Runs all matrix cells over the full B3 population (SSS–B bossing tier) and writes a
// lean artifact the web tab fetches at runtime and the bakery-bot reads. This is a
// BUILD OUTPUT — regenerated on every build/deploy (npm `prebuild`), gitignored, and
// NOT part of verify.sh. See docs/handoffs/dps-chart-handoff.md.
//
//   npx tsx scripts/build-dpschart.ts [--out <path>]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { DataFile, LevelMultiplier, Element } from '../src/types.js';
import { loadOverride } from '../src/skills/overrides-node.js';
import type { OverrideFile } from '../src/skills/index.js';
import type { CubesFile, OlLinesFile, PrepareDeps, SkillLevelData } from '../src/prepare.js';
import { CELLS, ALL_HEADLINERS, cellId, FRAMEWORKS, ELEADVS, CORES, INVESTS, FRAMEWORK_IDS, ELEADV_IDS, CORE_IDS, INVEST_IDS, type Cell } from '../src/dpschart/matrix.js';
import { runCell, type RunCtx, type OptMemo } from '../src/dpschart/run.js';

const load = <T,>(rel: string): T =>
  JSON.parse(readFileSync(new URL(rel, import.meta.url), 'utf8')) as T;

const data = load<DataFile>('../data/characters.json');
const mult = load<LevelMultiplier>('../data/level-multiplier.json');
const cubes = load<CubesFile>('../data/cubes.json');
const olLines = load<OlLinesFile>('../data/ol-lines.json');
const tiersFile = load<{ tiers: Record<string, string> }>('../data/bossing-tiers.json');
let skillLevels: SkillLevelData = {};
try { skillLevels = load<SkillLevelData>('../data/skill-levels.json'); } catch { /* optional */ }

// overrides for every character (undefined where none) — teams pull controls + carries
const overrides: Record<string, OverrideFile | undefined> = {};
for (const slug of Object.keys(data.characters)) overrides[slug] = loadOverride(slug);

const deps: PrepareDeps = { overrides, skillLevels, cubes, olLines };
const ctx: RunCtx = { characters: data.characters as any, mult, deps };

// tested population: every B3, bossing tier SSS–B. SSS/SS units are the ranked bars;
// S/A/B are selector-only. Guard against garbled multi-mode burst strings.
const CHART_TIERS = new Set(['SSS', 'SS']);
const SELECTOR_TIERS = new Set(['SSS', 'SS', 'S', 'A', 'B']);
interface UnitMeta { slug: string; name: string; element: Element; weapon: string; tier: string; chartPop: boolean; imageUrl: string | null; }
const population: UnitMeta[] = [];
for (const [slug, c] of Object.entries(data.characters)) {
  if (c.burst !== 'III') continue;
  const tier = tiersFile.tiers[slug];
  if (!tier || !SELECTOR_TIERS.has(tier)) continue;
  population.push({ slug, name: c.name, element: c.element as Element, weapon: c.weapon, tier, chartPop: CHART_TIERS.has(tier), imageUrl: c.imageUrl ?? null });
}
population.sort((a, b) => a.name.localeCompare(b.name));

const tested = population.map((u) => ({ slug: u.slug, element: u.element }));

// run all cells, sharing one optimizer memo (keyed by tested×framework×eleadv)
const memo: OptMemo = new Map();
const cells: Record<string, [string, number][]> = {};
let done = 0;
for (const cell of CELLS) {
  const ranked = runCell(cell as Cell, tested, ctx, memo);
  cells[cellId(cell as Cell)] = ranked.map((r) => [r.slug, Math.round(r.dps)]);
  done++;
  if (done % 12 === 0) process.stderr.write(`  …${done}/${CELLS.length} cells\n`);
}

const axis = <T extends { id: string; label: string }>(ids: string[], rec: Record<string, T>) =>
  ids.map((id) => ({ id, label: rec[id].label }));

const artifact = {
  generatedAt: new Date().toISOString(),
  meta: {
    frameworks: axis(FRAMEWORK_IDS, FRAMEWORKS),
    eleadvs: axis(ELEADV_IDS, ELEADVS),
    cores: CORE_IDS.map((id) => ({ id, label: CORES[id].label, rate: CORES[id].rate })),
    invests: axis(INVEST_IDS, INVESTS),
    headliners: ALL_HEADLINERS.map((h) => ({
      slug: h.slug, name: h.name, framework: h.framework, eleadv: h.eleadv, invest: h.invest,
      cellIds: h.cells.map((c) => cellId(c)),
    })),
  },
  units: Object.fromEntries(
    population.map((u) => [u.slug, { name: u.name, element: u.element, weapon: u.weapon, tier: u.tier, chartPop: u.chartPop, imageUrl: u.imageUrl }]),
  ),
  cells,
};

const outArg = process.argv.indexOf('--out');
const out = outArg >= 0 ? process.argv[outArg + 1]
  : new URL('../img/dpschart.json', import.meta.url).pathname;
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(artifact));
process.stderr.write(`dpschart: ${CELLS.length} cells × ${population.length} B3 (${population.filter((u) => u.chartPop).length} charted) → ${out}\n`);
