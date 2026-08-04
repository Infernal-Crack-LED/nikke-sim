// Input-hash SSOT for the generated board artifacts — extracted VERBATIM from
// build-dpschart.ts by Step 0 of the artifact-decoupling plan
// (docs/handoffs/2026-08-03-artifact-store-decoupling-plan.md §5/§8), then
// generalized to the other builders by Step 1. Consumers, one implementation:
//
//   - scripts/build-dpschart.ts — the two-level skip/carry-over gate.
//   - the five rank-board builders + build-ol-default.ts + build-infographics.ts
//     — embed their bucket's hash into the artifact they write.
//   - scripts/check-board-freshness.ts — PR CI's ADVISORY staleness check of the
//     published artifacts against the committed inputs.
//   - scripts/tests/share/board-hash-parity.test.ts — the HARD gate on locally
//     built / committed artifacts (skip-stale when CI fetched them instead).
//
// Bucket semantics:
//   GLOBAL   — the engine, the matrix/run code, the shared data tables, and the CONTROL
//              units' overrides + character entries. A control sits in every cell's team,
//              so changing one moves EVERY tested unit's number. Any global change ⇒
//              full rebuild.
//   PER-UNIT — one hash per tested slug over its own override + characters.json entry +
//              bossing-tier. Changing it moves only that unit's rows.
//
// The hashed unit set (population/tested below) must stay derived by the SAME rules the
// builder simulates — that is why the population construction lives HERE and the builder
// imports it, not the other way around.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DataFile, Element } from '../src/types.js';
import { unitElements } from '../src/elements.js';
import {
  CELLS,
  assembleTeam,
  CHART_VARIANTS,
  type Cell,
  type TestedUnit,
} from '../src/dpschart/matrix.js';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));

const load = <T>(rel: string): T =>
  JSON.parse(readFileSync(new URL(rel, import.meta.url), 'utf8')) as T;

// ---- tested population -------------------------------------------------------------

// Λ units are pinned to a fixed slot instead of treated as unsupported — see FORCED_BURST
// (same forced mapping as the team generators, src/teamcalc.ts). The chart's top-N windows
// the raw ranked population, tier unrestricted — `tier` is display-only here.
const FORCED_BURST: Record<string, 'III'> = { 'red-hood': 'III' };
const effBurst = (slug: string, burst: string) => FORCED_BURST[slug] ?? burst;

export interface DpsChartUnitMeta {
  slug: string;
  name: string;
  element: Element;
  // every element the unit counts as (own code + any its kit grants — src/elements.ts); the
  // element filter/grouping on the chart matches against this, not the bare `element`
  elements: Element[];
  weapon: string;
  tier: string;
  imageUrl: string | null;
}

// tested population: every B3 with a kit override (simSupported) — no enikk-proven/"meta"
// usage gate; a unit only needs a real override to produce a meaningful damage number.
export function buildDpsChartPopulation(
  characters: DataFile['characters'],
  tiers: Record<string, string>
): { population: DpsChartUnitMeta[]; tested: TestedUnit[] } {
  const population: DpsChartUnitMeta[] = [];
  for (const [slug, c] of Object.entries(characters)) {
    // guard against garbled multi-mode burst strings
    if (effBurst(slug, c.burst) !== 'III') {
      continue;
    }
    if (!c.simSupported) {
      continue;
    }
    const tier = tiers[slug];
    if (!tier) {
      continue;
    }
    population.push({
      slug,
      name: c.name,
      element: c.element as Element,
      elements: unitElements(c),
      weapon: c.weapon,
      tier,
      imageUrl: c.imageUrl ?? null,
    });
  }
  population.sort((a, b) => a.name.localeCompare(b.name));

  // A slug in CHART_VARIANTS is tested TWICE — its plain default row (profile:
  // null) and the variant row — and both compete in the SAME ranking, same
  // convention as the buffer/sustain/burstgen boards (src/ranks/*.ts).
  const tested: TestedUnit[] = population.flatMap((u) => {
    const rows: TestedUnit[] = [
      { slug: u.slug, element: u.element, profile: null },
    ];
    const variant = CHART_VARIANTS[u.slug];
    if (variant) {
      rows.push({ slug: u.slug, element: u.element, profile: variant.id });
    }
    return rows;
  });
  return { population, tested };
}

// ---- input hashes ------------------------------------------------------------------

// Directories hashed WHOLESALE into the GLOBAL bucket (every file inside, recursively) —
// a new file added here needs no update to this list. Scope is deliberately narrower than
// `src/`: it excludes e.g. src/skills/overrides-baselines|legacy (archival, not read by
// loadOverride) and src/ranks|infographics|server|share|cli.ts (unrelated to the
// dps-chart's damage math).
export const GLOBAL_DIRS = [
  'src/dpschart', // matrix.ts/run.ts/noop.ts — cell + team-assembly logic
  'src/engine', // sim.ts + sg-geometry.ts/unigeo*.ts it imports — the damage formula
];

// Individual files: flat under src/ with no isolating subdirectory, so a directory
// scoop would either miss them or drag in unrelated siblings (teamcalc.ts, ranks/,
// share/, …). Hand-listed because there's no cheaper automatic boundary here; all
// of them are foundational/low-churn (team-prep, the OL optimizer, relationship-bonus,
// element helpers, shared types, the skill-scaling/override-loading plumbing) —
// per-unit modeling churn lives in src/skills/overrides/, which is hashed per-unit below.
export const GLOBAL_FILES = [
  'scripts/build-dpschart.ts',
  'scripts/artifact-input-hash.ts', // this module — the hash inputs live here now
  'src/prepare.ts',
  'src/stats.ts', // characterStat — every simulated unit's ATK/DEF/HP. Missed by the
  // original b71af726 bucket and its verbatim extraction; found by the 2026-08-04
  // cross-family review via the transitive import closure (sim.ts:16, prepare.ts:20).
  'src/data/squads.ts', // squadOf — same-squad block gates inside sim (same review find)
  'src/olconfigs.ts',
  'src/relationship.ts',
  'src/elements.ts',
  'src/types.ts',
  'src/skills/index.ts',
  'src/skills/overrides-node.ts',
  'src/skills/scale.ts',
  'src/skills/types.ts',
  'data/level-multiplier.json',
  'data/cubes.json',
  'data/ol-lines.json',
  'data/ol-tiers.json', // OL_TIER's per-line values — matrix.ts imports it statically
  'data/gauge-per-shot.json', // read via a static `with { type: 'json' }` import in sim.ts
  'data/relationship-bonus.json', // read the same way via relationship.ts
  'data/skill-levels.json', // optional (try/catch above) — hashPath skips missing paths
];
// NOTE: data/characters.json and data/bossing-tiers.json are deliberately absent — they are
// hashed PER ENTRY below (globally for controls, per-unit for the tested population), so one
// unit's sync no longer invalidates the whole matrix. An override file that belongs to
// neither a control nor a tested unit is hashed by NEITHER bucket, and correctly so:
// prepareTeam only ever indexes `deps.overrides[<a team member's slug>]` (src/prepare.ts) —
// it never iterates the map — so such a file cannot reach this artifact's numbers.

function walkFiles(absDir: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(p);
      } else {
        out.push(p);
      }
    }
  };
  walk(absDir);
  return out;
}

// (relative path + content) of each path, sorted so the digest is stable regardless of
// directory-read order. A rename/add/remove changes the hash exactly like a content edit.
function hashPaths(h: ReturnType<typeof createHash>, abs: string[]): void {
  for (const p of [...abs].sort()) {
    if (!existsSync(p)) {
      continue;
    }
    h.update(p.slice(REPO_ROOT.length));
    h.update('\0');
    h.update(readFileSync(p));
  }
}

// Every slug that appears in a chart team OTHER than as the tested unit. Derived by
// assembling every (cell × tested row) rather than hand-listed, so adding a control in
// matrix.ts can never silently desynchronize this bucket. assembleTeam is pure and
// sim-free, so the full sweep costs milliseconds.
function controlSlugs(tested: TestedUnit[]): string[] {
  const s = new Set<string>();
  for (const cell of CELLS) {
    for (const t of tested) {
      for (const slug of assembleTeam(cell as Cell, t).slugs) {
        if (slug !== t.slug) {
          s.add(slug);
        }
      }
    }
  }
  return [...s].sort();
}

// A slug's own inputs: its override file + its characters.json entry + its bossing-tier.
function hashUnit(
  h: ReturnType<typeof createHash>,
  slug: string,
  characters: DataFile['characters'],
  tiers: Record<string, string>
): void {
  hashPaths(h, [join(REPO_ROOT, 'src/skills/overrides', `${slug}.json`)]);
  h.update(slug);
  h.update('\0');
  h.update(JSON.stringify(characters[slug] ?? null));
  h.update('\0');
  h.update(JSON.stringify(tiers[slug] ?? null));
}

export interface DpsChartInputHashes {
  globalHash: string;
  unitHashes: Record<string, string>;
  inputsHash: string;
}

export function computeDpsChartInputHashes(): DpsChartInputHashes {
  const data = load<DataFile>('../data/characters.json');
  const tiersFile = load<{ tiers: Record<string, string> }>(
    '../data/bossing-tiers.json'
  );
  const { population, tested } = buildDpsChartPopulation(
    data.characters,
    tiersFile.tiers
  );

  const g = createHash('sha256');
  const abs: string[] = [];
  for (const d of GLOBAL_DIRS) {
    abs.push(...walkFiles(join(REPO_ROOT, d)));
  }
  for (const f of GLOBAL_FILES) {
    abs.push(join(REPO_ROOT, f));
  }
  hashPaths(g, abs);
  // controls move every tested unit's number, so they belong to the global bucket
  for (const slug of controlSlugs(tested)) {
    hashUnit(g, slug, data.characters, tiersFile.tiers);
  }
  const globalHash = g.digest('hex');

  const unitHashes: Record<string, string> = {};
  for (const u of population) {
    const h = createHash('sha256');
    hashUnit(h, u.slug, data.characters, tiersFile.tiers);
    unitHashes[u.slug] = h.digest('hex');
  }

  // whole-artifact digest — the fast path when literally nothing changed
  const all = createHash('sha256');
  all.update(globalHash);
  for (const slug of Object.keys(unitHashes).sort()) {
    all.update('\0');
    all.update(slug);
    all.update('\0');
    all.update(unitHashes[slug]);
  }
  return { globalHash, unitHashes, inputsHash: all.digest('hex') };
}

// ---- rank boards (Step 1) ----------------------------------------------------------

// The five rank boards (burstgen/burstcdr/sustain/bufferchart/b1b2dps) share ONE
// global bucket. Plan §5 sketched a bucket per builder, but the refresh unit is
// `npm run ranks:all` — all five rebuild unconditionally, there is no per-board
// carry-over to key a finer granularity to — so a single bucket over all five can
// never mislead a decision the hash drives, and over-enumerating kills the
// dangerous failure mode (a missed input reading FRESH). Every input any board
// reads is in here: src/ranks imports only engine/sim, prepare, elements, types,
// skills/index and dpschart/noop — and that TRANSITIVE closure is covered too:
// sim.ts's own stats.ts + data/squads.ts imports are listed below (found by the
// 2026-08-04 cross-family review; the first cut scanned only direct imports).
// Plus the data tables the builders load and the static JSON imports of that dep
// tree (gauge-per-shot via sim.ts, relationship-bonus via relationship.ts).
export const RANKS_GLOBAL_DIRS = [
  'src/engine', // sim.ts — every board simulates
  'src/ranks', // board logic + curated tables + artifact types
];

export const RANKS_GLOBAL_FILES = [
  'scripts/build-burstgen.ts',
  'scripts/build-burstcdr.ts',
  'scripts/build-sustain.ts',
  'scripts/build-bufferchart.ts',
  'scripts/build-b1b2dps.ts',
  'scripts/artifact-input-hash.ts', // this module — the hash inputs live here
  'src/prepare.ts',
  'src/stats.ts', // characterStat — every simulated unit's ATK/DEF/HP
  'src/data/squads.ts', // squadOf — same-squad block gates inside sim
  'src/olconfigs.ts',
  'src/relationship.ts',
  'src/elements.ts',
  'src/types.ts',
  'src/skills/index.ts',
  'src/skills/overrides-node.ts',
  'src/skills/scale.ts',
  'src/skills/types.ts',
  'src/dpschart/noop.ts', // the synthetic no-op controls' registry
  'data/characters.json', // population + unit metadata, wholesale (no per-unit split here)
  'data/archetype-tags.json', // burstcdr/sustain/bufferchart populations are tag-driven
  'data/bossing-tiers.json',
  'data/level-multiplier.json',
  'data/cubes.json',
  'data/ol-lines.json',
  'data/ol-tiers.json',
  'data/skill-levels.json', // optional at load — hashPaths skips missing paths
  'data/gauge-per-shot.json', // static `with { type: 'json' }` import in sim.ts
  'data/relationship-bonus.json', // static import in relationship.ts
];

// Every board loads overrides for every simSupported character (plus the NOOP
// controls), so the whole directory is one input — per-unit decomposition would
// buy nothing at the ranks:all refresh unit.
export function computeRanksInputHash(): string {
  const h = createHash('sha256');
  const abs: string[] = [];
  for (const d of RANKS_GLOBAL_DIRS) {
    abs.push(...walkFiles(join(REPO_ROOT, d)));
  }
  for (const f of RANKS_GLOBAL_FILES) {
    abs.push(join(REPO_ROOT, f));
  }
  abs.push(...walkFiles(join(REPO_ROOT, 'src/skills/overrides')));
  hashPaths(h, abs);
  return h.digest('hex');
}

// ---- ol-default (Step 1) -------------------------------------------------------------

// ol-default.json is COMMITTED (not gitignored like the boards), built by the
// seeded Monte-Carlo in build-ol-default.ts — so its parity gate is hard
// everywhere: a drift is always locally fixable (rebuild + commit).
export const OL_DEFAULT_GLOBAL_DIRS = ['src/overload'];

export const OL_DEFAULT_GLOBAL_FILES = [
  'scripts/build-ol-default.ts',
  'scripts/artifact-input-hash.ts', // this module — the hash inputs live here
  'data/ol-probabilities.json',
];

export function computeOlDefaultInputHash(): string {
  const h = createHash('sha256');
  const abs: string[] = [];
  for (const d of OL_DEFAULT_GLOBAL_DIRS) {
    abs.push(...walkFiles(join(REPO_ROOT, d)));
  }
  for (const f of OL_DEFAULT_GLOBAL_FILES) {
    abs.push(join(REPO_ROOT, f));
  }
  hashPaths(h, abs);
  return h.digest('hex');
}

// ---- infographics (Step 1) -----------------------------------------------------------

// The infographic set renders the boards + characters + committed art, so its
// inputs are the renderer code, those committed dirs, and the SEVEN artifacts'
// CONTENT (hashed stripped, below). The hash embeds in dist/img/manifest.json.
export const INFOGRAPHICS_GLOBAL_DIRS = [
  'src/infographics', // core/unitCardData.ts + node/render.ts + table data
  'web/public/img/portraits', // committed thumbs — every unit card embeds one
  'web/public/nikke-icons', // committed icon set — icons.ts reads it DIRECTLY at render
  'web/public/fonts', // self-hosted Roboto subsets — the text-layout input
];

export const INFOGRAPHICS_GLOBAL_FILES = [
  'scripts/build-infographics.ts',
  'scripts/lib/unit-card-sources.ts',
  'scripts/lib/portrait-thumbs.ts',
  'scripts/artifact-input-hash.ts', // this module — the hash inputs live here
  'src/dpschart/matrix.ts', // parseCellId/cellLabel — runtime import of build-infographics
  'data/characters.json',
];

const INFOGRAPHICS_ARTIFACT_INPUTS = [
  'web/public/dpschart.json',
  'web/public/burstgen.json',
  'web/public/burstcdr.json',
  'web/public/sustain.json',
  'web/public/bufferchart.json',
  'web/public/b1b2dps.json',
  'web/public/ol-default.json',
];

// Fields that change on every rebuild without changing what downstream consumers
// render — they must not leak into an artifact-as-INPUT hash, or rebuilding an
// otherwise-identical board would move the infographics hash.
const VOLATILE_ARTIFACT_KEYS = new Set([
  'generatedAt',
  'inputsHash',
  'globalHash',
  'unitHashes',
]);

function hashStrippedArtifact(h: ReturnType<typeof createHash>, abs: string): void {
  const parsed = JSON.parse(readFileSync(abs, 'utf8')) as Record<
    string,
    unknown
  >;
  const stable: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed)) {
    if (!VOLATILE_ARTIFACT_KEYS.has(k)) {
      stable[k] = v;
    }
  }
  // JSON.stringify over the parse result keeps the builder's key order — stable
  // because the builders write fixed object shapes.
  h.update(JSON.stringify(stable));
}

// null = the boards are not built (--limit test mode / fresh worktree) — the
// builder then omits inputsHash from the manifest instead of embedding a lie.
export function computeInfographicsInputHash(): string | null {
  for (const rel of INFOGRAPHICS_ARTIFACT_INPUTS) {
    if (!existsSync(join(REPO_ROOT, rel))) {
      return null;
    }
  }
  const h = createHash('sha256');
  const abs: string[] = [];
  for (const d of INFOGRAPHICS_GLOBAL_DIRS) {
    abs.push(...walkFiles(join(REPO_ROOT, d)));
  }
  for (const f of INFOGRAPHICS_GLOBAL_FILES) {
    abs.push(join(REPO_ROOT, f));
  }
  hashPaths(h, abs);
  for (const rel of INFOGRAPHICS_ARTIFACT_INPUTS) {
    h.update(rel);
    h.update('\0');
    hashStrippedArtifact(h, join(REPO_ROOT, rel));
  }
  return h.digest('hex');
}
