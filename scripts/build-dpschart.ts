// Precompute the DPS-chart matrix into web/public/dpschart.json (vite's publicDir → served
// at /dpschart.json and copied into dist).
//
// Runs all matrix cells over the full B3 population (SSS–B bossing tier) and writes a
// lean artifact the web tab fetches at runtime and the bakery-bot reads. This is a
// BUILD OUTPUT — regenerated on every build/deploy (`npm run build:deploy`), gitignored, and
// NOT part of verify.sh.
//
// SKIP-IF-UNCHANGED GATE (2026-07-29, DECISIONS): the full recompute takes minutes (90 cells
// × the tested population), and most deploys touch nothing this artifact depends on (web/UI/
// infra work is the bulk of this repo's traffic). Before running any cell, hash every file this
// computation actually depends on (data + kit overrides + engine/dpschart code — see
// computeInputsHash below) and compare against the `inputsHash` embedded in the CURRENTLY LIVE
// `${NIKKESIM_SITE_ORIGIN}/dpschart.json`. On a match, download and reuse that artifact byte-for-
// byte instead of resimulating. This does NOT need the artifact committed to git or a Railway
// build-cache mount — the live production URL IS the cross-deploy persistence, and it survives a
// fresh build container fine. Fails open on anything uncertain (network error, timeout, missing/
// mismatched hash) straight to a full rebuild — never skip on doubt; a stale skip would repeat
// the exact "reports green on an older engine's output" risk that a prior verify.sh ruling
// already rejected for committing this artifact to git.
//
//   npx tsx scripts/build-dpschart.ts [--out <path>] [--force]
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
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
  CELLS,
  ALL_HEADLINERS,
  cellId,
  FRAMEWORKS,
  ELEADVS,
  CORES,
  INVESTS,
  FRAMEWORK_IDS,
  ELEADV_IDS,
  CORE_IDS,
  INVEST_IDS,
  CHART_VARIANTS,
  type Cell,
  type TestedUnit,
} from '../src/dpschart/matrix.js';
import { runCell, type RunCtx, type OptMemo } from '../src/dpschart/run.js';

// ---- input hash (skip-if-unchanged gate) -----------------------------------------

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));

// Directories hashed WHOLESALE (every file inside, recursively) — a new file added
// here needs no update to this list. Scope is deliberately narrower than `src/`: it
// excludes e.g. src/skills/overrides-baselines|legacy (archival, not read by
// loadOverride) and src/ranks|infographics|server|share|cli.ts (unrelated to the
// dps-chart's damage math).
const HASH_DIRS = [
  'src/dpschart', // matrix.ts/run.ts/noop.ts — cell + team-assembly logic
  'src/engine', // sim.ts + sg-geometry.ts/unigeo*.ts it imports — the damage formula
  'src/skills/overrides', // every unit's kit model (~93 files)
];

// Individual files: flat under src/ with no isolating subdirectory, so a directory
// scoop would either miss them or drag in unrelated siblings (teamcalc.ts, ranks/,
// share/, …). Hand-listed because there's no cheaper automatic boundary here; all
// six are foundational/low-churn (team-prep, the OL optimizer, relationship-bonus,
// element helpers, shared types, the skill-scaling/override-loading plumbing) —
// per-unit modeling churn lives in src/skills/overrides/, which IS hashed wholesale.
const HASH_FILES = [
  'scripts/build-dpschart.ts',
  'src/prepare.ts',
  'src/bestol.ts',
  'src/relationship.ts',
  'src/elements.ts',
  'src/types.ts',
  'src/skills/index.ts',
  'src/skills/overrides-node.ts',
  'src/skills/scale.ts',
  'src/skills/types.ts',
  'data/characters.json',
  'data/level-multiplier.json',
  'data/cubes.json',
  'data/ol-lines.json',
  'data/bossing-tiers.json',
  'data/gauge-per-shot.json', // read via a static `with { type: 'json' }` import in sim.ts
  'data/relationship-bonus.json', // read the same way via relationship.ts
  'data/skill-levels.json', // optional (try/catch below) — walkFiles skips missing paths
];

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

// SHA-256 over every hashed path's (relative path + content), sorted so the digest
// is stable regardless of directory-read order. A file rename/add/remove changes
// the hash exactly like a content edit — no separate "did the file list change?"
// check is needed.
function computeInputsHash(): string {
  const abs: string[] = [];
  for (const d of HASH_DIRS) {
    abs.push(...walkFiles(join(REPO_ROOT, d)));
  }
  for (const f of HASH_FILES) {
    const p = join(REPO_ROOT, f);
    if (existsSync(p)) {
      abs.push(p);
    }
  }
  abs.sort();
  const h = createHash('sha256');
  for (const p of abs) {
    h.update(p.slice(REPO_ROOT.length));
    h.update('\0');
    h.update(readFileSync(p));
  }
  return h.digest('hex');
}

const SITE_ORIGIN = process.env.NIKKESIM_SITE_ORIGIN ?? 'https://nikkesim.app';
const FORCE = process.argv.includes('--force');

// Fetch the currently-live artifact and reuse it verbatim if its embedded inputsHash
// matches ours. Any failure (network, timeout, bad JSON, missing/mismatched hash)
// returns false — always fails open to the full rebuild below, never skips on doubt.
async function trySkip(inputsHash: string, out: string): Promise<boolean> {
  if (FORCE) {
    return false;
  }
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 5000);
    let text: string;
    try {
      const res = await fetch(`${SITE_ORIGIN}/dpschart.json`, {
        signal: ctrl.signal,
      });
      if (!res.ok) {
        return false;
      }
      text = await res.text();
    } finally {
      clearTimeout(timeout);
    }
    const live = JSON.parse(text) as { inputsHash?: unknown };
    if (typeof live.inputsHash !== 'string' || live.inputsHash !== inputsHash) {
      return false;
    }
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, text);
    process.stderr.write(
      `dpschart: inputs unchanged vs live ${SITE_ORIGIN}/dpschart.json ` +
        `(hash ${inputsHash.slice(0, 12)}…) — reused, skipped the full rebuild\n`
    );
    return true;
  } catch {
    return false;
  }
}

const inputsHash = computeInputsHash();
const outArg = process.argv.indexOf('--out');
const out =
  outArg >= 0
    ? process.argv[outArg + 1]
    : new URL('../web/public/dpschart.json', import.meta.url).pathname;

if (await trySkip(inputsHash, out)) {
  process.exit(0);
}

// ---- full rebuild -----------------------------------------------------------------

const load = <T>(rel: string): T =>
  JSON.parse(readFileSync(new URL(rel, import.meta.url), 'utf8')) as T;

const data = load<DataFile>('../data/characters.json');
const mult = load<LevelMultiplier>('../data/level-multiplier.json');
const cubes = load<CubesFile>('../data/cubes.json');
const olLines = load<OlLinesFile>('../data/ol-lines.json');
const tiersFile = load<{ tiers: Record<string, string> }>(
  '../data/bossing-tiers.json'
);
let skillLevels: SkillLevelData = {};
try {
  skillLevels = load<SkillLevelData>('../data/skill-levels.json');
} catch {
  /* optional */
}

// overrides for every character (undefined where none) — teams pull controls + carries
const overrides: Record<string, OverrideFile | undefined> = {};
for (const slug of Object.keys(data.characters)) {
  overrides[slug] = loadOverride(slug);
}
// The no-op B3 (MG) is a synthetic control, not a roster entry, so it is not in
// characters.json. Load its mock-B3 override explicitly so the Solo framework
// gives it a damage profile during its stage-3 casts.
overrides['noop-b3-mg'] = loadOverride('noop-b3-mg');

const deps: PrepareDeps = { overrides, skillLevels, cubes, olLines };
const ctx: RunCtx = { characters: data.characters as any, mult, deps };

// tested population: every B3 with a kit override (simSupported) — no enikk-proven/"meta"
// usage gate; a unit only needs a real override to produce a meaningful damage number.
// Λ units are pinned to a fixed slot instead of treated as unsupported — see FORCED_BURST
// (same forced mapping as the team generators, src/teamcalc.ts). The chart's top-N windows
// the raw ranked population, tier unrestricted — `tier` is display-only here.
const FORCED_BURST: Record<string, 'III'> = { 'red-hood': 'III' };
const effBurst = (slug: string, burst: string) => FORCED_BURST[slug] ?? burst;
interface UnitMeta {
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
const population: UnitMeta[] = [];
for (const [slug, c] of Object.entries(data.characters)) {
  // guard against garbled multi-mode burst strings
  if (effBurst(slug, c.burst) !== 'III') {
    continue;
  }
  if (!c.simSupported) {
    continue;
  }
  const tier = tiersFile.tiers[slug];
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

// run all cells, sharing one optimizer memo (keyed by tested×framework×eleadv)
const memo: OptMemo = new Map();
const cells: Record<string, [string, number, string | null][]> = {};
let done = 0;
for (const cell of CELLS) {
  const ranked = runCell(cell as Cell, tested, ctx, memo);
  cells[cellId(cell as Cell)] = ranked.map((r) => [
    r.slug,
    Math.round(r.dps),
    r.profile,
  ]);
  done++;
  if (done % 12 === 0) {
    process.stderr.write(`  …${done}/${CELLS.length} cells\n`);
  }
}

// player-facing note per profile id, surfaced on the DPS Rankings tab (mirrors
// the other boards' `profiles` map — src/ranks/types.ts).
const profiles: Record<string, string> = Object.fromEntries(
  Object.values(CHART_VARIANTS).map((v) => [v.id, v.note])
);

const axis = <T extends { id: string; label: string }>(
  ids: string[],
  rec: Record<string, T>
) => ids.map((id) => ({ id, label: rec[id].label }));

const artifact = {
  generatedAt: new Date().toISOString(),
  meta: {
    frameworks: axis(FRAMEWORK_IDS, FRAMEWORKS),
    eleadvs: axis(ELEADV_IDS, ELEADVS),
    cores: CORE_IDS.map((id) => ({
      id,
      label: CORES[id].label,
      rate: CORES[id].rate,
    })),
    invests: axis(INVEST_IDS, INVESTS),
    headliners: ALL_HEADLINERS.map((h) => ({
      slug: h.slug,
      name: h.name,
      framework: h.framework,
      eleadv: h.eleadv,
      invest: h.invest,
      cellIds: h.cells.map((c) => cellId(c)),
    })),
  },
  units: Object.fromEntries(
    population.map((u) => [
      u.slug,
      {
        name: u.name,
        element: u.element,
        elements: u.elements,
        weapon: u.weapon,
        tier: u.tier,
        imageUrl: u.imageUrl,
      },
    ])
  ),
  profiles,
  cells,
  inputsHash,
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(artifact));
process.stderr.write(
  `dpschart: ${CELLS.length} cells × ${population.length} B3 ` +
    `(${tested.length - population.length} profiled variant rows) → ${out}\n`
);
