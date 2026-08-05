// Precompute the DPS-chart matrix into web/public/dpschart.json (vite's publicDir → served
// at /dpschart.json and copied into dist).
//
// Runs all matrix cells over the full B3 population (SSS–B bossing tier) and writes a
// lean artifact the web tab fetches at runtime and the bakery-bot reads. This is a
// BUILD OUTPUT — regenerated on every build/deploy (`npm run build:deploy`), gitignored, and
// NOT part of verify.sh.
//
// TWO-LEVEL SKIP GATE (2026-07-29, extended 2026-08-01 — DECISIONS): the full recompute is
// minutes (90 cells × the tested population), and most deploys change the numbers of only a
// handful of units. Every input this computation actually depends on is hashed into one of two
// buckets:
//
//   GLOBAL   — the engine, the matrix/run code, the shared data tables, and the CONTROL units'
//              overrides + character entries. A control sits in every cell's team, so changing
//              one moves EVERY tested unit's number. Any global change ⇒ full rebuild, exactly
//              as before.
//   PER-UNIT — one hash per tested slug over its own override + characters.json entry +
//              bossing-tier. Changing it moves only that unit's rows.
//
// Given a prior artifact (a locally pre-built one, else the currently-live
// `${NIKKESIM_SITE_ORIGIN}/dpschart.json`) whose globalHash matches ours, only the units whose
// per-unit hash changed are resimulated; every other unit's dps is carried over verbatim and the
// cells are re-ranked. That is sound because each tested unit is simulated ALONE in a fixed
// control team — its dps does not depend on any other tested unit, so a cell's ranking is just a
// sort over independent numbers. A matching whole-artifact hash still short-circuits to a
// byte-for-byte reuse.
//
// Fails open on anything uncertain (network error, timeout, missing/malformed hash, a reusable
// unit absent from a cell) straight to a full rebuild — never skip on doubt; a stale skip would
// repeat the exact "reports green on an older engine's output" risk that a prior verify.sh
// ruling already rejected for committing this artifact to git.
//
// The per-unit decomposition is also the parallelism axis: each worker owns a set of tested
// units and computes all 90 cells for them, carrying its own optimizer memo, so nothing is
// shared and the merge is a sort. Workers are child processes of this same script (`--rows`),
// which keeps one code path and inherits the tsx loader flags verbatim.
//
//   npx tsx scripts/build-dpschart.ts [--out <path>] [--force] [--workers N]
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  rmSync,
} from 'node:fs';
import { spawn, type ChildProcess } from 'node:child_process';
import { availableParallelism, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DataFile, LevelMultiplier } from '../src/types.js';
import { loadOverride } from '../src/skills/overrides-node.js';
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
import { dpsFor, type RunCtx, type OptMemo } from '../src/dpschart/run.js';
import { NOOP_CHARACTERS } from '../src/dpschart/noop.js';
import {
  buildDpsChartPopulation,
  computeDpsChartInputHashes,
} from './artifact-input-hash.js';

const SCRIPT = fileURLToPath(import.meta.url);

// ---- cli ---------------------------------------------------------------------------

const argValue = (flag: string): string | undefined => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

const FORCE = process.argv.includes('--force');
const out =
  argValue('--out') ??
  fileURLToPath(new URL('../web/public/dpschart.json', import.meta.url));

// Worker mode: `--rows <in.json> --rows-out <out.json>`. The child simulates exactly the
// rows it is handed and writes back `{ "<slug>::<profile>": number[] }`, one dps per cell
// in CELLS order. Not a user-facing flag — the parent spawns it.
const ROWS_IN = argValue('--rows');
const ROWS_OUT = argValue('--rows-out');
// Both or neither: a child given only one would fall through to the full main path —
// re-hashing, re-fetching candidates, simulating every row inline, and overwriting the
// real `out` — instead of doing its slice. The parent always passes both, so this only
// catches a future caller or a hand-run debug invocation.
if ((ROWS_IN === undefined) !== (ROWS_OUT === undefined)) {
  throw new Error(
    'worker mode needs BOTH --rows and --rows-out (got only ' +
      (ROWS_IN !== undefined ? '--rows' : '--rows-out') +
      ')'
  );
}
const IS_WORKER = ROWS_IN !== undefined && ROWS_OUT !== undefined;

const WORKERS = Math.max(
  1,
  Number(argValue('--workers') ?? process.env.DPSCHART_WORKERS ?? 0) ||
    availableParallelism()
);

// ---- data --------------------------------------------------------------------------

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
// Synthetic controls are not roster entries, but their overrides carry the
// framework effects: the no-op B1's 7s team burst-cooldown reduction and the
// no-op B3's mock burst. Load every registered control so a future addition
// cannot be forgotten — the same loop build-bufferchart.ts / build-sustain.ts /
// build-b1b2dps.ts use. Without it the Solo framework silently ran with no
// enabler at all (same defect those three boards carried until 2026-08-03).
for (const slug of Object.keys(NOOP_CHARACTERS)) {
  overrides[slug] = loadOverride(slug);
}

const deps: PrepareDeps = { overrides, skillLevels, cubes, olLines };
const ctx: RunCtx = { characters: data.characters as any, mult, deps };

// ---- tested population -------------------------------------------------------------

// The population + tested-row derivation lives in scripts/artifact-input-hash.ts:
// the hashed unit set and the simulated unit set must come from the SAME rules
// (Step 0 of the artifact-decoupling plan), so the builder imports them instead
// of carrying a second copy.
const { population, tested } = buildDpsChartPopulation(
  data.characters,
  tiersFile.tiers
);

const rowKey = (t: { slug: string; profile?: string | null }): string =>
  `${t.slug}::${t.profile ?? ''}`;

// ---- input hashes ------------------------------------------------------------------
// The two-level input-hash implementation (GLOBAL/PER-UNIT buckets) lives in
// scripts/artifact-input-hash.ts — the SSOT shared with check-board-freshness.ts
// (the artifact-decoupling plan's §5 "one implementation" rule). Note GLOBAL_FILES
// now includes that module, so the extraction itself moves every hash once — one
// unavoidable full rebuild on the next deploy.

// ---- prior-artifact reuse ----------------------------------------------------------

interface Artifact {
  generatedAt?: string;
  cells?: Record<string, [string, number, string | null][]>;
  inputsHash?: unknown;
  globalHash?: unknown;
  unitHashes?: unknown;
}

const SITE_ORIGIN = process.env.NIKKESIM_SITE_ORIGIN ?? 'https://nikkesim.app';

interface Candidate {
  origin: string;
  text: string;
  art: Artifact;
}

function readLocalCandidate(): Candidate | null {
  try {
    if (!existsSync(out)) {
      return null;
    }
    const text = readFileSync(out, 'utf8');
    return { origin: out, text, art: JSON.parse(text) as Artifact };
  } catch {
    return null;
  }
}

async function fetchLiveCandidate(): Promise<Candidate | null> {
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 5000);
    try {
      const res = await fetch(`${SITE_ORIGIN}/dpschart.json`, {
        signal: ctrl.signal,
      });
      if (!res.ok) {
        return null;
      }
      const text = await res.text();
      return {
        origin: `${SITE_ORIGIN}/dpschart.json`,
        text,
        art: JSON.parse(text) as Artifact,
      };
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return null;
  }
}

// Pull every reusable row's per-cell dps out of a prior artifact. Returns null — forcing a
// full rebuild of that row — if ANY cell is missing it, so a truncated or older-format
// artifact can never contribute a partial row.
function carryOver(
  art: Artifact,
  reusable: TestedUnit[]
): Map<string, number[]> | null {
  const cells = art.cells;
  if (!cells || typeof cells !== 'object') {
    return null;
  }
  const byCell: Map<string, number>[] = [];
  for (const cell of CELLS) {
    const rows = cells[cellId(cell as Cell)];
    if (!Array.isArray(rows)) {
      return null;
    }
    const m = new Map<string, number>();
    for (const r of rows) {
      if (
        Array.isArray(r) &&
        typeof r[0] === 'string' &&
        Number.isFinite(r[1])
      ) {
        m.set(rowKey({ slug: r[0], profile: r[2] ?? null }), r[1]);
      }
    }
    byCell.push(m);
  }
  const carried = new Map<string, number[]>();
  for (const t of reusable) {
    const key = rowKey(t);
    const series: number[] = [];
    for (const m of byCell) {
      const v = m.get(key);
      if (v === undefined) {
        return null;
      }
      series.push(v);
    }
    carried.set(key, series);
  }
  return carried;
}

// ---- simulation --------------------------------------------------------------------

// One tested row's dps in every cell, in CELLS order. The optimizer memo is per (unit,
// profile) and deterministic, so a row computed in a fresh worker is bit-identical to the
// same row computed inline.
function simulateRows(
  rows: TestedUnit[],
  quiet = false
): Map<string, number[]> {
  const memo: OptMemo = new Map();
  const res = new Map<string, number[]>();
  for (const t of rows) {
    const series = CELLS.map((cell) => dpsFor(cell as Cell, t, ctx, memo));
    res.set(rowKey(t), series);
    if (!quiet) {
      process.stderr.write(`  …${rowKey(t)}\n`);
    }
  }
  return res;
}

// Fan the rows out over child processes of this same script. Round-robin so the expensive
// rows (the per-unit OL optimization is the bulk of a row's cost, and it is paid once per
// row regardless) spread evenly rather than clumping into one worker.
function spawnWorkers(rows: TestedUnit[]): Promise<Map<string, number[]>> {
  const n = Math.min(WORKERS, rows.length);
  const buckets: TestedUnit[][] = Array.from({ length: n }, () => []);
  rows.forEach((t, i) => buckets[i % n].push(t));

  const dir = join(tmpdir(), `dpschart-${process.pid}`);
  mkdirSync(dir, { recursive: true });

  // keep only the loader flags tsx injected (`--require preflight` / `--import loader`);
  // everything else in execArgv belongs to this invocation, not the child's.
  const loaderArgs: string[] = [];
  for (let i = 0; i < process.execArgv.length; i++) {
    const a = process.execArgv[i];
    if (a === '--require' || a === '--import') {
      loaderArgs.push(a, process.execArgv[++i]);
    }
  }

  // `Promise.all` settles on the FIRST rejection, so without this the surviving children
  // keep simulating after the parent has given up — and then crash writing out-*.json into
  // the directory the `.finally()` below just removed. Kill them at the first failure.
  const children: ChildProcess[] = [];
  let aborted = false;
  const abortSiblings = () => {
    if (aborted) {
      return;
    }
    aborted = true;
    for (const c of children) {
      if (c.exitCode === null && c.signalCode === null) {
        c.kill();
      }
    }
  };

  const jobs = buckets.map(
    (bucket, i) =>
      new Promise<Map<string, number[]>>((resolve, rawReject) => {
        // Killing the siblings makes them exit non-zero too; those later rejections are
        // already handled by Promise.all and ignored, so only the first error surfaces.
        const reject = (e: Error) => {
          abortSiblings();
          rawReject(e);
        };
        const inPath = join(dir, `rows-${i}.json`);
        const outPath = join(dir, `out-${i}.json`);
        writeFileSync(inPath, JSON.stringify(bucket));
        const child = spawn(
          process.execPath,
          [...loaderArgs, SCRIPT, '--rows', inPath, '--rows-out', outPath],
          { stdio: ['ignore', 'inherit', 'inherit'] }
        );
        children.push(child);
        child.on('error', reject);
        child.on('exit', (code) => {
          if (code !== 0) {
            reject(new Error(`dpschart worker ${i} exited ${code}`));
            return;
          }
          try {
            resolve(
              new Map(
                Object.entries(
                  JSON.parse(readFileSync(outPath, 'utf8')) as Record<
                    string,
                    number[]
                  >
                )
              )
            );
          } catch (e) {
            reject(e as Error);
          }
        });
      })
  );

  // finally, not the success path: a worker exiting non-zero rejects the Promise.all, and
  // leaving rows-*.json/out-*.json behind would accumulate on a box that fails repeatedly.
  return Promise.all(jobs)
    .then((parts) => {
      const merged = new Map<string, number[]>();
      for (const p of parts) {
        for (const [k, v] of p) {
          merged.set(k, v);
        }
      }
      return merged;
    })
    .finally(() => {
      // Best-effort: on the failure path a throw here (EPERM/EBUSY on a shared build box)
      // would replace `dpschart worker N exited X` — the diagnostic you actually need.
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch (e) {
        process.stderr.write(
          `  (could not remove ${dir}: ${(e as Error).message})\n`
        );
      }
    });
}

function computeRows(rows: TestedUnit[]): Promise<Map<string, number[]>> {
  if (rows.length === 0) {
    return Promise.resolve(new Map());
  }
  if (WORKERS <= 1 || rows.length === 1) {
    return Promise.resolve(simulateRows(rows));
  }
  return spawnWorkers(rows);
}

// ---- worker entry ------------------------------------------------------------------

if (IS_WORKER) {
  const rows = JSON.parse(readFileSync(ROWS_IN!, 'utf8')) as TestedUnit[];
  const res = simulateRows(rows);
  writeFileSync(ROWS_OUT!, JSON.stringify(Object.fromEntries(res)));
  process.exit(0);
}

// ---- main --------------------------------------------------------------------------

const { globalHash, unitHashes, inputsHash } = computeDpsChartInputHashes();

// Prefer a locally pre-built artifact, then fall back to the live site. On the deploy box the
// local file is essentially never there — `railway up` respects .gitignore and web/public/
// dpschart.json is gitignored — so the live URL is the real cross-deploy persistence; the local
// candidate is what makes repeated dev-box runs cheap.
const candidates: Candidate[] = [];
if (!FORCE) {
  const local = readLocalCandidate();
  if (local) {
    candidates.push(local);
  }
  const live = await fetchLiveCandidate();
  if (live) {
    candidates.push(live);
  }
}

// exact match — reuse the artifact byte-for-byte
const exact = candidates.find((c) => c.art.inputsHash === inputsHash);
if (exact) {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, exact.text);
  process.stderr.write(
    `dpschart: inputs unchanged vs ${exact.origin} ` +
      `(hash ${inputsHash.slice(0, 12)}…) — reused, skipped the full rebuild\n`
  );
  process.exit(0);
}

// partial match — same global inputs, so only the units whose own inputs moved need work
let carried: Map<string, number[]> = new Map();
let staleRows: TestedUnit[] = tested;
const partialSrc = candidates.find(
  (c) =>
    c.art.globalHash === globalHash &&
    c.art.unitHashes !== null &&
    typeof c.art.unitHashes === 'object'
);
if (partialSrc) {
  const prior = partialSrc.art.unitHashes as Record<string, unknown>;
  const fresh = tested.filter((t) => prior[t.slug] === unitHashes[t.slug]);
  const got = carryOver(partialSrc.art, fresh);
  if (got) {
    carried = got;
    staleRows = tested.filter((t) => !carried.has(rowKey(t)));
    const changed = [...new Set(staleRows.map((t) => t.slug))];
    process.stderr.write(
      `dpschart: global inputs unchanged vs ${partialSrc.origin} — ` +
        `carrying over ${carried.size}/${tested.length} rows, resimulating ` +
        `${staleRows.length} (${changed.join(', ') || 'none'})\n`
    );
  } else {
    process.stderr.write(
      `dpschart: ${partialSrc.origin} matched globalHash but is not carry-over ` +
        `usable — full rebuild\n`
    );
  }
}

const t0 = Date.now();
const computed = await computeRows(staleRows);
for (const [k, v] of computed) {
  carried.set(k, v);
}

// rank each cell: round first, then sort descending, ties broken by `tested` order (which is
// name-sorted). Rounding before the sort is what makes a carried-over row — which only has
// the prior artifact's already-rounded value — rank identically to a freshly simulated one.
const cells: Record<string, [string, number, string | null][]> = {};
CELLS.forEach((cell, i) => {
  const scored = tested.map((t, idx) => {
    const series = carried.get(rowKey(t));
    if (!series) {
      throw new Error(`dpschart: no dps for ${rowKey(t)}`);
    }
    return {
      slug: t.slug,
      dps: Math.round(series[i]),
      profile: t.profile ?? null,
      idx,
    };
  });
  scored.sort((a, b) => b.dps - a.dps || a.idx - b.idx);
  cells[cellId(cell as Cell)] = scored.map((s) => [s.slug, s.dps, s.profile]);
});

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
      exposure: CORES[id].exposure,
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
  globalHash,
  unitHashes,
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(artifact));
process.stderr.write(
  `dpschart: ${CELLS.length} cells × ${population.length} B3 ` +
    `(${tested.length - population.length} profiled variant rows) — ` +
    `${staleRows.length} rows simulated on ${Math.min(WORKERS, Math.max(staleRows.length, 1))} ` +
    `worker(s) in ${((Date.now() - t0) / 1000).toFixed(1)}s → ${out}\n`
);
