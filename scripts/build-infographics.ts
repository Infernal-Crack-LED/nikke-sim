// Build-time pre-generation of the static infographic set (Phase 2 of
// docs/handoffs/2026-07-27-infographics-centralization-plan.md): renders the
// head-only set (~208 images — 2 headline DPS cells × 6 element variants, 4
// rank boards, 192 unit cards) through src/infographics/node/render.ts ONLY,
// at scale 2, writing CONTENT-HASHED filenames into dist/img/ plus a mutable
// manifest.json that maps each logical key to its immutable file.
//
//   npx tsx scripts/build-infographics.ts [--limit N] [--out <dir>]
//
// --limit N renders only the first N unit cards (sorted by slug) and skips the
// DPS/rank jobs entirely — the fast path for tests, which must not require the
// gitignored web/public data artifacts.
//
// BUILD-ORDER DEPENDENCY: the DPS charts and rank boards read the gitignored
// build outputs web/public/{dpschart,burstgen,burstcdr,sustain,bufferchart}.json,
// so `npm run dpschart && npm run ranks:all` must have run first (build:deploy
// orders it this way). dist/ is wiped by every vite build (emptyOutDir), so
// this script must run AFTER `npm run build` — never before.
//
// FONT GATE (plan Phase 2 hard requirement): assertFontsLive() runs before
// anything else, then the FIRST card is rendered and ink-checked — a fontless
// host exits non-zero here, before a single file is written. Better a red
// build than 200 textless images under immutable cache headers.
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createCanvas,
  decodeToCanvas,
  loadPortrait,
  assertFontsLive,
  assertTitleInk,
  chartWindow,
  chartHeight,
  drawDpsChart,
  CHART_W,
  visibleRows,
  tableHeight,
  drawTableCard,
  TABLE_W,
  drawUnitCard,
  UNIT_CARD_W,
  UNIT_CARD_H,
  type Canvas,
  type Canvas2DLike,
  type DpsChartData,
  type TableCardData,
  type UnitCardData,
} from '../src/infographics/node/render.js';
import { parseCellId, cellLabel } from '../src/dpschart/matrix.js';
import type {
  BurstGenArtifact,
  BurstCdrArtifact,
  SustainArtifact,
  BufferChartArtifact,
} from '../src/ranks/types.js';

// ---- CLI --------------------------------------------------------------------

const args = process.argv.slice(2);
const argValue = (flag: string): string | undefined => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};
const LIMIT = argValue('--limit') ? Number(argValue('--limit')) : null;
const OUT_DIR = argValue('--out')
  ? resolve(argValue('--out')!)
  : fileURLToPath(new URL('../dist/img/', import.meta.url));

const SCALE = 2; // retina — the manifest's width/height are physical pixels
const CONCURRENCY = 8; // CPU-bound canvas work; overlaps portrait decode only

// ---- head-set derivation (§6.5 "derive the head, don't hardcode it") --------

// The 2 headline cells are exactly the two the bot's /dps command can emit —
// bakery-bot apps/bot/src/lib/nikke-sim/dpschart-cache.ts DEFAULT_CELL_ID /
// NEUTRAL_CELL_ID (the /dps default and its 'neutral' option). The web tab's
// share URLs carry an explicit ?chart=, so they hit the on-demand tail.
const HEADLINE_CELL_IDS = [
  'solo.eleweak.c100.8of12',
  'solo.neutral.c100.8of12',
] as const;
// The element filter set both link surfaces expose: the web tab's
// ELEMENT_FILTERS pills (DpsChartTab.tsx) and the bot /dps element choices.
const ELEMENT_FILTERS = ['Fire', 'Water', 'Wind', 'Electric', 'Iron'] as const;

// ---- data loading ------------------------------------------------------------

function loadJson<T>(url: URL, hint?: string): T {
  if (!existsSync(url)) {
    throw new Error(
      `build-infographics: missing ${fileURLToPath(url)}` +
        (hint ? ` — ${hint}` : '')
    );
  }
  return JSON.parse(readFileSync(url, 'utf8')) as T;
}

// dpschart.json shape (mirror of web/src/dpschartData.ts — scripts can't
// import the web module, which uses import.meta.env).
interface DpsUnitMeta {
  name: string;
  element: string;
  elements?: string[];
  weapon: string;
  tier: string;
  chartPop: boolean;
  imageUrl: string | null;
}
interface DpsArtifact {
  generatedAt: string;
  units: Record<string, DpsUnitMeta>;
  cells: Record<string, [string, number][]>;
}
interface CharacterRow {
  slug: string;
  name: string;
  element: string;
  weapon: string;
  burst: string;
  class: string;
  manufacturer: string;
  burstCooldownSec: number | null;
}

const DATA_HINT =
  'run the data builders first (npm run dpschart && npm run ranks:all) — ' +
  'build-infographics reads their web/public outputs (build:deploy orders this)';

// ---- small formatting helpers (ported from the web boards) -------------------

// K/M/B magnitude formatting, same shape as SupportRankings.tsx's fmt.
const fmt = (n: number): string =>
  n >= 1e9
    ? `${(n / 1e9).toFixed(2)}B`
    : n >= 1e6
      ? `${(n / 1e6).toFixed(2)}M`
      : n >= 1e3
        ? `${(n / 1e3).toFixed(1)}K`
        : n.toFixed(0);

// Comp-profile chip labels — ported from SupportRankings.tsx PROFILE_LABELS
// (keep in sync; tooltip text stays on the site, the card needs the short tag).
const PROFILE_LABELS: Record<string, string> = {
  'with-2mg': 'w/ 2 MG',
  'with-1mg': 'w/ 1 MG',
  'with-mg': 'w/ MG',
  'with-mint': 'w/ Mint',
  'with-healer': 'w/ Healer',
  'with-mast-rm': 'w/ Mast RM',
  'with-shielder': 'w/ Shielder',
};
function profileLabel(id: string): string {
  if (PROFILE_LABELS[id]) {
    return PROFILE_LABELS[id];
  }
  if (id.startsWith('w/ ')) {
    return id;
  }
  const rest = id.startsWith('with-') ? id.slice(5) : id;
  return `w/ ${rest.replace(/-/g, ' ')}`;
}
const unitName = (
  units: Record<string, { name: string }>,
  slug: string,
  profile: string | null
): string => {
  const name = units[slug]?.name ?? slug;
  return profile ? `${name} (${profileLabel(profile)})` : name;
};

// ---- render jobs --------------------------------------------------------------

interface Rendered {
  key: string; // logical key, e.g. 'dps/solo.eleweak.c100.8of12.fire'
  png: Buffer;
  width: number; // physical pixels (logical × SCALE)
  height: number;
  canvas: Canvas; // kept for the first card's ink assertion
  inkRegion: { x: number; y: number; w: number; h: number }; // physical px
}
interface Job {
  key: string;
  render: () => Promise<Rendered>;
}

// Create a scale-2 canvas and return it with a ctx pre-scaled to logical
// coordinates (the core renderers draw at logical px).
function scaledCanvas(w: number, h: number): Canvas {
  const canvas = createCanvas(w * SCALE, h * SCALE);
  canvas.getContext('2d').scale(SCALE, SCALE);
  return canvas;
}

const SITE_ICON_PATH = new URL(
  '../src/infographics/assets/nikkesim-icon.png',
  import.meta.url
);
let siteIcon: Promise<Canvas | null> | null = null;
const loadSiteIcon = (): Promise<Canvas | null> => {
  siteIcon ??= decodeToCanvas(SITE_ICON_PATH);
  return siteIcon;
};

// 2 headline cells × (all + 5 element filters). Population semantics mirror
// the web's chartBars() (web/src/dpschartData.ts): unfiltered = the SSS/SS
// chart population; an element filter ranks ALL B3s of that element. Windowed
// top-10 per §6.6, labels normalized to the population #1 (topDps).
function dpsJobs(art: DpsArtifact): Job[] {
  const jobs: Job[] = [];
  for (const id of HEADLINE_CELL_IDS) {
    const cell = parseCellId(id);
    const ranked = art.cells[id];
    if (!cell || !ranked?.length) {
      throw new Error(
        `build-infographics: dpschart.json has no rows for headline cell ` +
          `${id} — is the artifact current? (${DATA_HINT})`
      );
    }
    for (const ele of [null, ...ELEMENT_FILTERS] as (string | null)[]) {
      const population = ranked
        .filter(([slug]) => {
          const u = art.units[slug];
          if (!u) {
            return false;
          }
          return ele ? (u.elements ?? [u.element]).includes(ele) : u.chartPop;
        })
        .map(([slug, dps]) => ({ slug, dps, meta: art.units[slug] }));
      if (population.length === 0) {
        continue; // an element with no B3s — skip, never publish an empty chart
      }
      const key = `dps/${id}.${ele ? ele.toLowerCase() : 'all'}`;
      jobs.push({
        key,
        render: async (): Promise<Rendered> => {
          const data: DpsChartData = {
            title: cellLabel(cell) + (ele ? ` · ${ele} only` : ''),
            topDps: population[0].dps,
            bars: population.map((p) => ({
              name: p.meta.name,
              element: p.meta.element,
              dps: p.dps,
              slug: p.slug,
            })),
            window: {}, // §6.6 top-10
            footer: 'nikkesim.app/dpschart',
            icon: (await loadSiteIcon()) ?? undefined,
          };
          const win = chartWindow(data);
          for (const bar of data.bars.slice(win.start, win.end)) {
            bar.img = (await loadPortrait(bar.slug!)) ?? undefined;
          }
          const canvas = scaledCanvas(
            CHART_W,
            chartHeight(win.end - win.start, false)
          );
          drawDpsChart(
            canvas.getContext('2d') as unknown as Canvas2DLike,
            data
          );
          return {
            key,
            png: canvas.toBuffer('image/png'),
            width: canvas.width,
            height: canvas.height,
            canvas,
            inkRegion: {
              x: 36 * SCALE,
              y: 24 * SCALE,
              w: 500 * SCALE,
              h: 36 * SCALE,
            },
          };
        },
      });
    }
  }
  return jobs;
}

// The 4 rank boards from the same web/public/*.json the site serves, rendered
// via drawTableCard, §6.6 top-10 windowed, ABSOLUTE ranks written by the
// caller. Buffer uses the generic board — the site's default view
// (SupportRankings.tsx useState('generic')); the typed board is tail/on-demand.
function rankJobs(): Job[] {
  const specs: { board: string; build: () => TableCardData }[] = [
    {
      board: 'burstgen',
      build: () => {
        const art = loadJson<BurstGenArtifact>(
          new URL('../web/public/burstgen.json', import.meta.url),
          DATA_HINT
        );
        return {
          title: 'Burst Generation Ranking',
          subtitle: 'no-op team · 180s · unfocused · scope-lock loadout',
          columns: [
            { header: '#' },
            { header: 'Unit' },
            { header: 'Gauge %/s', align: 'right' },
            { header: 'Bars (180s)', align: 'right' },
          ],
          rows: art.entries.map(([slug, gps, gtotal, , profile], i) => [
            `#${i + 1}`,
            unitName(art.units, slug, profile),
            `${gps.toFixed(2)}%/s`,
            (gtotal / 100).toFixed(1),
          ]),
          window: {},
          footer: 'nikkesim.app/ranks',
        };
      },
    },
    {
      board: 'burstcdr',
      build: () => {
        const art = loadJson<BurstCdrArtifact>(
          new URL('../web/public/burstcdr.json', import.meta.url),
          DATA_HINT
        );
        return {
          title: 'Burst CDR Ranking',
          subtitle: 'team CDR seconds per 20s Full Burst · 180s average',
          columns: [
            { header: '#' },
            { header: 'Unit' },
            { header: 'CDR s/20s', align: 'right' },
          ],
          rows: art.entries.map(([slug, cdr, , , , profile], i) => [
            `#${i + 1}`,
            unitName(art.units, slug, profile),
            `${cdr.toFixed(1)}s`,
          ]),
          window: {},
          footer: 'nikkesim.app/ranks',
        };
      },
    },
    {
      board: 'sustain',
      build: () => {
        const art = loadJson<SustainArtifact>(
          new URL('../web/public/sustain.json', import.meta.url),
          DATA_HINT
        );
        return {
          title: 'Sustain Ranking',
          subtitle: 'effective HP restored + shielded · 180s team total',
          columns: [
            { header: '#' },
            { header: 'Unit' },
            { header: 'Sustain', align: 'right' },
            { header: '% max HP', align: 'right' },
          ],
          rows: art.entries.map(([slug, totalHp, totalPct, , , , p], i) => [
            `#${i + 1}`,
            unitName(art.units, slug, p),
            fmt(totalHp),
            `${totalPct.toFixed(0)}%`,
          ]),
          window: {},
          footer: 'nikkesim.app/ranks',
        };
      },
    },
    {
      board: 'buffer',
      build: () => {
        const art = loadJson<BufferChartArtifact>(
          new URL('../web/public/bufferchart.json', import.meta.url),
          DATA_HINT
        );
        return {
          title: 'Buffer Ranking — Generic',
          subtitle: 'team damage increase vs the no-op baseline',
          columns: [
            { header: '#' },
            { header: 'Unit' },
            { header: 'Added DMG', align: 'right' },
          ],
          rows: art.cells.generic.map(([slug, addedPct, , profile], i) => [
            `#${i + 1}`,
            unitName(art.units, slug, profile),
            `${addedPct >= 0 ? '+' : '-'}${Math.abs(addedPct).toFixed(1)}%`,
          ]),
          window: {},
          footer: 'nikkesim.app/ranks',
        };
      },
    },
  ];
  return specs.map(({ board, build }) => ({
    key: `rank/${board}`,
    render: async (): Promise<Rendered> => {
      const data = build();
      data.icon = (await loadSiteIcon()) ?? undefined;
      const rows = visibleRows(data.rows, data.window).rows.length;
      const canvas = scaledCanvas(TABLE_W, tableHeight(rows));
      drawTableCard(canvas.getContext('2d') as unknown as Canvas2DLike, data);
      return {
        key: `rank/${board}`,
        png: canvas.toBuffer('image/png'),
        width: canvas.width,
        height: canvas.height,
        canvas,
        inkRegion: {
          x: 32 * SCALE,
          y: 16 * SCALE,
          w: 400 * SCALE,
          h: 34 * SCALE,
        },
      };
    },
  }));
}

// One identity card per character in data/characters.json (READ-only source).
function unitJobs(chars: CharacterRow[], limit: number | null): Job[] {
  const sorted = [...chars].sort((a, b) => a.slug.localeCompare(b.slug));
  const picked = limit === null ? sorted : sorted.slice(0, limit);
  return picked.map((c) => ({
    key: `unit/${c.slug}`,
    render: async (): Promise<Rendered> => {
      const data: UnitCardData = {
        name: c.name,
        element: c.element,
        weapon: c.weapon,
        burst: c.burst,
        class: c.class,
        manufacturer: c.manufacturer,
        burstCooldownSec: c.burstCooldownSec,
        img: (await loadPortrait(c.slug)) ?? undefined,
      };
      const canvas = scaledCanvas(UNIT_CARD_W, UNIT_CARD_H);
      drawUnitCard(canvas.getContext('2d') as unknown as Canvas2DLike, data);
      return {
        key: `unit/${c.slug}`,
        png: canvas.toBuffer('image/png'),
        width: canvas.width,
        height: canvas.height,
        canvas,
        inkRegion: {
          x: 36 * SCALE,
          y: 34 * SCALE,
          w: 400 * SCALE,
          h: 34 * SCALE,
        },
      };
    },
  }));
}

// ---- main ---------------------------------------------------------------------

interface ManifestImage {
  file: string; // path relative to /img/ (e.g. 'unit/liter.1a2b3c4d.png')
  hash: string; // sha256(png)[0:8] — also embedded in `file`
  bytes: number;
  width: number;
  height: number;
}
interface Manifest {
  generatedAt: string;
  images: Record<string, ManifestImage>;
}

const hash8 = (png: Buffer): string =>
  createHash('sha256').update(png).digest('hex').slice(0, 8);

// Bounded-concurrency pool over the job list.
async function pool<T>(items: T[], n: number, fn: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (next < items.length) {
        await fn(items[next++]);
      }
    })
  );
}

async function main(): Promise<void> {
  const t0 = performance.now();

  // FONT GATE, part 1: registration must be live before any render.
  assertFontsLive();

  const chars = loadJson<{ characters: Record<string, CharacterRow> }>(
    new URL('../data/characters.json', import.meta.url)
  );
  const jobs: Job[] = unitJobs(Object.values(chars.characters), LIMIT);
  if (LIMIT === null) {
    // full set: DPS charts + rank boards (needs the web/public artifacts)
    const dpschart = loadJson<DpsArtifact>(
      new URL('../web/public/dpschart.json', import.meta.url),
      DATA_HINT
    );
    jobs.unshift(...dpsJobs(dpschart), ...rankJobs());
  }
  if (jobs.length === 0) {
    throw new Error('build-infographics: empty job list');
  }

  mkdirSync(OUT_DIR, { recursive: true });
  // Content-addressed names mean a stale image from a previous run would linger
  // forever. Clean only the dirs this script owns (derived from the job keys) —
  // dist/img/ also holds Vite-copied assets (portraits) that are not ours.
  for (const dir of new Set(jobs.map((j) => j.key.split('/')[0]))) {
    rmSync(join(OUT_DIR, dir), { recursive: true, force: true });
  }
  rmSync(join(OUT_DIR, 'manifest.json'), { force: true });
  const manifest: Manifest = { generatedAt: '', images: {} };
  let totalBytes = 0;
  let totalPx = 0;

  const emit = (r: Rendered): void => {
    const hash = hash8(r.png);
    const file = `${r.key}.${hash}.png`;
    const dest = join(OUT_DIR, file);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, r.png);
    manifest.images[r.key] = {
      file,
      hash,
      bytes: r.png.length,
      width: r.width,
      height: r.height,
    };
    totalBytes += r.png.length;
    totalPx += r.width * r.height;
  };

  // FONT GATE, part 2: render the FIRST card and ink-check it before anything
  // is written — a fontless host dies here, not after 200 immutable PNGs.
  const first = await jobs[0].render();
  assertTitleInk(first.canvas.getContext('2d'), first.key, first.inkRegion);
  console.log(
    `infographics: first render ${first.key} — ${first.width}×${first.height}px, ` +
      `${first.png.length} B (${(first.png.length / (first.width * first.height)).toFixed(3)} B/px)`
  );
  emit(first);

  await pool(jobs.slice(1), CONCURRENCY, async (job) => {
    emit(await job.render());
  });

  // Stable key order so the manifest is diff-friendly.
  manifest.generatedAt = new Date().toISOString();
  manifest.images = Object.fromEntries(
    Object.entries(manifest.images).sort(([a], [b]) => a.localeCompare(b))
  );
  writeFileSync(
    join(OUT_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  const secs = ((performance.now() - t0) / 1000).toFixed(1);
  console.log(
    `infographics: ${jobs.length} images, ${(totalBytes / 1e6).toFixed(1)} MB ` +
      `(${(totalBytes / totalPx).toFixed(3)} B/px avg) in ${secs}s → ${OUT_DIR}`
  );
}

await main();
