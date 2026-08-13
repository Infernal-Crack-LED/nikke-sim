// Build-time pre-generation of the static infographic set (Phase 2 of
// docs/handoffs/2026-07-27-infographics-centralization-plan.md): renders the
// head-only set (2 headline DPS cells × 6 element variants, 5 rank boards, 2
// static utility tables, 2 cards per unit, one max-ammo table per unit, one
// charge-speed table per charge weapon, one Resource Calculator card per AI
// tier, and one Doll Leveling card per doll rarity) through
// src/infographics/node/render.ts ONLY,
// at scale 2, writing CONTENT-HASHED filenames into dist/img/ plus a mutable
// manifest.json that maps each logical key to its immutable file.
//
//   npx tsx scripts/build-infographics.ts [--limit N] [--out <dir>] [--only <key-prefix>]
//
// --limit N renders only the first N unit cards (sorted by slug) and skips the
// DPS/rank jobs entirely — the fast path for tests, which must not require the
// gitignored web/public data artifacts.
//
// BUILD-ORDER DEPENDENCY: the DPS charts and rank boards read the gitignored
// build outputs web/public/{dpschart,burstgen,burstcdr,sustain,bufferchart,b1b2dps}.json,
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
  copyFileSync,
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
  portraitSourceDir,
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
  drawUnitCardVariant,
  unitCardSize,
  UNIT_CARD_WEBP_QUALITY,
  buildOlTable,
  buildChargeTable,
  buildAmmoTable,
  chargeLatencyFrames,
  GENERIC_BASE_FRAMES,
  buildResourcesCard,
  drawResourcesCard,
  resourcesCardHeight,
  RESOURCES_CARD_W,
  RESOURCES_TITLE_INK_REGION,
  BOSS_TABLES,
  iconBasename,
  loadIcon,
  drawDollCard,
  dollCardHeight,
  DOLL_CARD_W,
  DOLL_TITLE_INK_REGION,
  type ChargeWeaponRow,
  type ResourcesIcons,
  buildBurstGenTable,
  buildBurstCdrTable,
  buildSustainTable,
  buildBufferTable,
  buildB1B2DpsTable,
  unitName,
  type OlDefaultArtifact,
  DPS_TITLE_INK_REGION,
  TABLE_TITLE_INK_REGION,
  UNIT_TITLE_INK_REGION,
  UNIT_PORTRAIT_TITLE_INK_REGION,
  assertIconsLive,
  iconUpscaleAudit,
  type Canvas,
  type Canvas2DLike,
  type DpsChartData,
  type TableCardData,
} from '../src/infographics/node/render.js';
import {
  loadUnitCardSources,
  buildUnitCardRender,
  type UnitCardSourceSet,
} from './lib/unit-card-sources.js';
import {
  PORTRAIT_TIERS,
  fetchPortraitSource,
  missingThumbs,
  portraitUnits,
  renderThumbTiers,
  thumbPath,
} from './lib/portrait-thumbs.js';
import { computeInfographicsInputHash } from './artifact-input-hash.js';
import { parseCellId, cellLabel } from '../src/dpschart/matrix.js';
import {
  RESOURCES_TIER_MIN,
  RESOURCES_TIER_MAX,
  DOLL_RARITIES,
} from '../src/infographics/spec.js';
import {
  buildDollPlan,
  dollCardData,
  type DollData,
} from '../src/doll/card.js';
import type {
  BurstGenArtifact,
  BurstCdrArtifact,
  SustainArtifact,
  BufferChartArtifact,
  B1B2DpsArtifact,
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
// Render only the jobs whose logical key starts with this — for iterating on
// one card kind (`--only table/`) without paying the whole set, and for tests
// that need a real render of a narrow slice. It writes a PARTIAL manifest
// describing just those keys, so it is for a scratch --out dir, never dist/.
const ONLY = argValue('--only') ?? null;

// Both variants are pre-rendered for every unit (ruling 15).
const UNIT_CARD_VARIANTS = ['discord', 'twitter'] as const;

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
  imageUrl: string | null;
}
interface DpsArtifact {
  generatedAt: string;
  units: Record<string, DpsUnitMeta>;
  cells: Record<string, [string, number, string | null][]>;
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
  simSupported?: boolean;
  // Per-unit table inputs — the same flat fields the API's table routes read
  // off this file (src/server/card-from-build.ts CardCharacter).
  ammo?: number;
  chargeFrames?: number;
  role?: { weapon?: unknown } | null;
}

const DATA_HINT =
  'run the data builders first (npm run dpschart && npm run ranks:all) — ' +
  'build-infographics reads their web/public outputs (build:deploy orders this)';

// ---- portrait gate ------------------------------------------------------------

/**
 * PORTRAIT GATE: fill any thumbnail this build is about to need but doesn't
 * have, before a single image is rendered.
 *
 * loadPortrait() returns null for a missing thumb and every consumer degrades to
 * a placeholder — the unit card to its letter box, the DPS/rank rows to a blank
 * chip — silently, inside content-hashed images that nothing will re-render and
 * that Discord caches by URL indefinitely. That is the same failure the font and
 * icon gates above exist to prevent, and it shipped: four units synced after the
 * last `npm run thumbs` had been serving placeholder cards on /nikke (2026-08-03).
 *
 * So the deploy self-heals instead of relying on someone remembering. Committed
 * thumbs are still canonical — `npm run thumbs -- --check` reports anything filled
 * here, and generating + committing it is what makes this a no-op again.
 *
 * Deliberately NOT fatal: a filled build is strictly better than today's silent
 * placeholder, and a CDN blip must not be able to redden a deploy of unrelated
 * work. It writes to loadPortrait's OWN source dir, and mirrors into the dist
 * copy (vite already put the committed set there) so the runtime server's
 * on-demand renders see the same portraits this build did.
 * Set SKIP_PORTRAIT_FILL=1 for an offline/hermetic build.
 */
async function fillMissingPortraits(): Promise<void> {
  const srcDir = portraitSourceDir();
  const mirrorDir = join(OUT_DIR, 'portraits');
  const units = portraitUnits();
  const missing =
    process.env.SKIP_PORTRAIT_FILL === '1' ? [] : missingThumbs(units, srcDir);

  if (missing.length) {
    console.warn(
      `infographics: ${missing.length} unit(s) have no committed portrait thumb, ` +
        `generating now so their cards aren't placeholders: ${missing.map((u) => u.slug).join(', ')} ` +
        `(commit them with: npm run thumbs)`
    );
    mkdirSync(srcDir, { recursive: true });
    for (const unit of missing) {
      try {
        const tiers = await renderThumbTiers(
          await fetchPortraitSource(unit.url)
        );
        for (const [tier, bytes] of tiers) {
          writeFileSync(thumbPath(srcDir, unit.slug, tier), bytes);
        }
      } catch (e) {
        // Placeholder card — exactly what would have shipped anyway.
        console.warn(
          `infographics: portrait fill failed for ${unit.slug}: ${(e as Error).message}`
        );
      }
    }
  }

  // Mirror into dist/img/portraits when vite has made one: it is what the
  // deployed server reads (NIKKESIM_PORTRAIT_DIR, see src/server/env-defaults.ts),
  // and it was copied BEFORE anything above ran.
  if (!existsSync(mirrorDir) || mirrorDir === srcDir) {
    return;
  }
  let mirrored = 0;
  for (const unit of units) {
    for (const tier of PORTRAIT_TIERS) {
      const from = thumbPath(srcDir, unit.slug, tier);
      const to = thumbPath(mirrorDir, unit.slug, tier);
      if (existsSync(from) && !existsSync(to)) {
        copyFileSync(from, to);
        mirrored++;
      }
    }
  }
  if (mirrored) {
    console.warn(
      `infographics: mirrored ${mirrored} portrait file(s) into dist`
    );
  }
}

// ---- small formatting helpers ------------------------------------------------

// The rank-board row formatting (fmt magnitudes, profile chip labels,
// unitName) lives in src/infographics/core/rankTables.ts — ONE source shared
// with the web share cards, so this script only loads artifacts + renders.

// ---- render jobs --------------------------------------------------------------

interface Rendered {
  key: string; // logical key, e.g. 'dps/solo.eleweak.c100.8of12.fire'
  png: Buffer; // encoded bytes — PNG or WebP, per `ext`
  ext: 'png' | 'webp';
  width: number; // physical pixels (logical × SCALE)
  height: number;
  canvas: Canvas; // kept for the first card's ink assertion
  inkRegion: { x: number; y: number; w: number; h: number }; // physical px
}

// UNIT CARDS EMIT WEBP; every other kind stays PNG (§12).
//
// Measured 2026-07-28: today's PNG unit card is 284 KB at 1280×960, so the ~195
// card set already costs ~53 MB — and the new card is 2x bigger and far denser.
// Re-encoding real rendered cards through sharp gave WebP q90 at −86% vs PNG, so
// the two-variant set lands near the size of the single-variant PNG set instead
// of ~150 MB, which would force the R2 migration immediately. Both Discord
// embeds and Twitter uploads accept WebP.
//
// Scoped to the unit set deliberately: it is the only ~200-file kind, and the
// other kinds' sizes were never measured.
//
// The quality number itself lives on core/unitCard.ts so the browser fallback
// renderer encodes at the SAME quality — see the note there.
const encodeCard = (canvas: Canvas): Buffer =>
  canvas.toBuffer('image/webp', UNIT_CARD_WEBP_QUALITY);
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

// The ink regions come from the card modules' *_TITLE_INK_REGION exports
// (logical px, starting at the title's textX — never padX, or the site icon
// alone satisfies the guard). Scale them to physical pixels here.
const scaleRegionBy = (
  r: { x: number; y: number; w: number; h: number },
  scale: number
) => ({
  x: r.x * scale,
  y: r.y * scale,
  w: r.w * scale,
  h: r.h * scale,
});
// Most jobs render at the module-wide SCALE; the portrait unit card renders at
// dpr 1, so its region scales by its own dpr (see unitJobs).
const scaledRegion = (r: { x: number; y: number; w: number; h: number }) =>
  scaleRegionBy(r, SCALE);

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
// the web's chartBars() (web/src/dpschartData.ts): unfiltered = the raw ranked
// population, tier unrestricted; an element filter ranks ALL B3s of that
// element. Windowed top-10 per §6.6, labels normalized to the population #1 (topDps).
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
          return ele ? (u.elements ?? [u.element]).includes(ele) : true;
        })
        .map(([slug, dps, profile]) => ({
          slug,
          dps,
          profile,
          meta: art.units[slug],
        }));
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
              name: unitName(art.units, p.slug, p.profile),
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
            ext: 'png' as const,
            width: canvas.width,
            height: canvas.height,
            canvas,
            inkRegion: scaledRegion(DPS_TITLE_INK_REGION),
          };
        },
      });
    }
  }
  return jobs;
}

// The 4 rank boards from the same web/public/*.json the site serves, rendered
// via drawTableCard, §6.6 top-10 windowed, ABSOLUTE ranks written by the
// core/rankTables.ts builders (shared with the web share cards). Buffer uses
// the generic board — the site's default view (SupportRankings.tsx
// useState('generic')); the typed board is tail/on-demand.
function rankJobs(): Job[] {
  const specs: { board: string; build: () => TableCardData }[] = [
    {
      board: 'burstgen',
      build: () =>
        buildBurstGenTable(
          loadJson<BurstGenArtifact>(
            new URL('../web/public/burstgen.json', import.meta.url),
            DATA_HINT
          )
        ),
    },
    {
      board: 'burstcdr',
      build: () =>
        buildBurstCdrTable(
          loadJson<BurstCdrArtifact>(
            new URL('../web/public/burstcdr.json', import.meta.url),
            DATA_HINT
          )
        ),
    },
    {
      board: 'sustain',
      build: () =>
        buildSustainTable(
          loadJson<SustainArtifact>(
            new URL('../web/public/sustain.json', import.meta.url),
            DATA_HINT
          )
        ),
    },
    {
      board: 'buffer',
      build: () =>
        buildBufferTable(
          loadJson<BufferChartArtifact>(
            new URL('../web/public/bufferchart.json', import.meta.url),
            DATA_HINT
          )
        ),
    },
    {
      board: 'b1b2dps',
      build: () =>
        buildB1B2DpsTable(
          loadJson<B1B2DpsArtifact>(
            new URL('../web/public/b1b2dps.json', import.meta.url),
            DATA_HINT
          ),
          'c100-eleadv'
        ),
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
        ext: 'png' as const,
        width: canvas.width,
        height: canvas.height,
        canvas,
        inkRegion: scaledRegion(TABLE_TITLE_INK_REGION),
      };
    },
  }));
}

// The two fully-static utility tables (bot /ol and the no-param /charge-speed)
// — same core/tableData.ts builders the API's dynamic table routes use, so the
// pre-rendered files and the on-demand renders can't drift.
function tableJobs(): Job[] {
  const specs: { key: string; build: () => TableCardData }[] = [
    {
      key: 'table/ol',
      build: () =>
        buildOlTable(
          loadJson<OlDefaultArtifact>(
            new URL('../web/public/ol-default.json', import.meta.url)
          )
        ),
    },
    {
      key: 'table/charge-speed',
      build: () => buildChargeTable(GENERIC_BASE_FRAMES, 'Generic (1.0s)'),
    },
  ];
  return specs.map(({ key, build }) => ({
    key,
    render: () => renderTable(key, build()),
  }));
}

// A table card, rendered exactly the way the API's dynamic table route renders
// it (src/server/dps-table-cards.ts renderTableCardPng) — same builder, same
// canvas size, so the pre-rendered file and the on-demand render agree.
async function renderTable(
  key: string,
  data: TableCardData
): Promise<Rendered> {
  data.icon = (await loadSiteIcon()) ?? undefined;
  const canvas = scaledCanvas(TABLE_W, tableHeight(data.rows.length));
  drawTableCard(canvas.getContext('2d') as unknown as Canvas2DLike, data);
  return {
    key,
    png: canvas.toBuffer('image/png'),
    ext: 'png' as const,
    width: canvas.width,
    height: canvas.height,
    canvas,
    inkRegion: scaledRegion(TABLE_TITLE_INK_REGION),
  };
}

// PER-UNIT table cards — the bot's /charge-speed <unit> and /max-ammo <unit>.
//
// These were the API's on-demand renders, which meant every one was a URL
// Discord's image proxy had never seen: the message posted and the card
// appeared seconds later. The set is bounded and small (one ammo table per
// unit, one charge table per charge weapon), so pre-rendering puts them on the
// same instant, content-hashed footing as the unit cards.
//
// The eligibility rules mirror the API's (src/server/api.ts resolveRender,
// 'table'): ammo needs a positive base magazine, charge needs positive base
// frames AND an SR/RL weapon. A unit the API would 400 gets no key here, so a
// manifest miss and an API rejection stay the same answer.
function perUnitTableJobs(chars: CharacterRow[]): Job[] {
  const jobs: Job[] = [];
  for (const ch of [...chars].sort((a, b) => a.slug.localeCompare(b.slug))) {
    if ((ch.ammo ?? 0) > 0) {
      const key = `table/max-ammo.${ch.slug}`;
      jobs.push({
        key,
        render: async () => {
          const data = buildAmmoTable(ch.ammo!, ch.name);
          data.portrait = (await loadPortrait(ch.slug)) ?? undefined;
          return renderTable(key, data);
        },
      });
    }
    const baseFrames = ch.chargeFrames ?? 0;
    if (baseFrames > 0 && (ch.weapon === 'SR' || ch.weapon === 'RL')) {
      const key = `table/charge-speed.${ch.slug}`;
      jobs.push({
        key,
        render: async () => {
          const data = buildChargeTable(
            baseFrames,
            ch.name,
            chargeLatencyFrames(ch as ChargeWeaponRow)
          );
          // Every PER-UNIT table carries the unit's portrait, ammo and charge
          // alike — api.ts attaches it on `spec.unit`, without branching on
          // which table it is. Only the generic (unit-less) charge table has none.
          data.portrait = (await loadPortrait(ch.slug)) ?? undefined;
          return renderTable(key, data);
        },
      });
    }
  }
  return jobs;
}

// The Resource Calculator card (bot /ai), one per Anomaly Interception tier.
// Nine tiers, nine images — small enough that the whole space is pre-rendered
// rather than rendered per request.
function resourcesJobs(): Job[] {
  return Array.from(
    { length: RESOURCES_TIER_MAX - RESOURCES_TIER_MIN + 1 },
    (_, i) => {
      const tier = RESOURCES_TIER_MIN + i;
      const key = `resources/t${tier}`;
      return {
        key,
        render: async (): Promise<Rendered> => {
          const data = buildResourcesCard(tier, await resourcesIcons());
          data.icon = (await loadSiteIcon()) ?? undefined;
          const canvas = scaledCanvas(
            RESOURCES_CARD_W,
            resourcesCardHeight(data.sections.length)
          );
          drawResourcesCard(
            canvas.getContext('2d') as unknown as Canvas2DLike,
            data
          );
          return {
            key,
            png: canvas.toBuffer('image/png'),
            ext: 'png' as const,
            width: canvas.width,
            height: canvas.height,
            canvas,
            inkRegion: scaledRegion(RESOURCES_TITLE_INK_REGION),
          };
        },
      };
    }
  );
}

// The Doll Leveling card (bot /doll) — the per-phase feeding plan the /doll
// page shows by default.
//
// Pre-rendered from phase 0 ONLY, for each doll rarity: that is the whole
// journey, which is what the page defaults to and the only thing the command
// asks for. The API renders any other starting phase on demand — 14 more cards
// per rarity that nothing currently requests do not belong in every deploy.
function dollJobs(): Job[] {
  const data: DollData = {
    economy: loadJson(new URL('../data/doll-economy.json', import.meta.url)),
    proc: loadJson(new URL('../data/doll-super-success.json', import.meta.url)),
  };
  return DOLL_RARITIES.map((rarity) => {
    const key = `doll/${rarity.toLowerCase()}.0`;
    return {
      key,
      render: async (): Promise<Rendered> => {
        const card = dollCardData(
          buildDollPlan(data.economy, data.proc, rarity, 0)
        );
        card.icon = (await loadSiteIcon()) ?? undefined;
        const canvas = scaledCanvas(
          DOLL_CARD_W,
          dollCardHeight(card.steps.length)
        );
        drawDollCard(canvas.getContext('2d') as unknown as Canvas2DLike, card);
        return {
          key,
          png: canvas.toBuffer('image/png'),
          ext: 'png' as const,
          width: canvas.width,
          height: canvas.height,
          canvas,
          inkRegion: scaledRegion(DOLL_TITLE_INK_REGION),
        };
      },
    };
  });
}

// The card's icon strip, loaded once and shared by all nine tiers (loadIcon is
// per-process cached, but the fan-out below is explicit either way).
let resourcesIconsCache: Promise<ResourcesIcons> | null = null;
function resourcesIcons(): Promise<ResourcesIcons> {
  resourcesIconsCache ??= (async () => {
    const RES_ICON_SIZE = 26; // matches web's .res-stat-icon (styles.css)
    const [moduleIcon, gearIcon, lockIcon, fodderIcon, ...fragIcons] =
      await Promise.all([
        loadIcon('res_module', RES_ICON_SIZE),
        loadIcon('res_t9_gear', RES_ICON_SIZE),
        loadIcon('res_lock', RES_ICON_SIZE),
        loadIcon('res_xp_fodder', RES_ICON_SIZE),
        ...BOSS_TABLES.map((t) =>
          loadIcon(iconBasename(t.fragmentIcon), RES_ICON_SIZE)
        ),
      ]);
    const fragmentByBoss: ResourcesIcons['fragmentByBoss'] = {};
    BOSS_TABLES.forEach((t, i) => {
      fragmentByBoss[t.key] = fragIcons[i] ?? undefined;
    });
    return {
      module: moduleIcon ?? undefined,
      gear: gearIcon ?? undefined,
      lock: lockIcon ?? undefined,
      fodder: fodderIcon ?? undefined,
      fragmentByBoss,
    };
  })();
  return resourcesIconsCache;
}

// TWO cards per character (ruling 15): `discord` 2:1 landscape for the bot embed
// and the site, `twitter` 3:4 portrait for the X launch post. Both come from the
// same buildUnitCardData join, so they can never disagree about a rank.
//
// Keys carry the variant (`unit/<slug>.<variant>`) — a shared key would serve
// the landscape card to a portrait request out of an immutable cache.
// `skipped` is an OUT param: the deliberately-cardless slugs go into the
// manifest so a consumer can tell "no card on purpose" from "no card yet".
function unitJobs(
  chars: CharacterRow[],
  sources: UnitCardSourceSet,
  limit: number | null,
  skipped: string[]
): Job[] {
  // A B3/Λ card's whole left column is its two DPS charts, and those come from
  // the DPS chart, which ranks every sim-supported B3 (scripts/build-dpschart.ts —
  // no enikk-proven/"meta" gate). An unsupported B3 therefore renders two large
  // "Not ranked on this board" plates and nothing else — so it gets NO CARD
  // rather than a second-class fallback layout (owner, 2026-07-28; this is the
  // answer to the "large empty plates" question in QUEUE.md). B1/B2 units are
  // unaffected: they draw buffer/sustain/burst-CDR, which rank unsupported
  // units too.
  const eligible = chars.filter(
    (c) => !(c.burst === 'III' || c.burst === 'Λ') || c.simSupported !== false
  );
  for (const c of chars) {
    if (!eligible.includes(c)) {
      skipped.push(c.slug);
    }
  }
  const sorted = [...eligible].sort((a, b) => a.slug.localeCompare(b.slug));
  const picked = limit === null ? sorted : sorted.slice(0, limit);
  const jobs: Job[] = [];
  for (const c of picked) {
    for (const variant of UNIT_CARD_VARIANTS) {
      const key = `unit/${c.slug}.${variant}`;
      jobs.push({
        key,
        render: async (): Promise<Rendered> => {
          const data = await buildUnitCardRender(sources, c.slug, variant);
          const { w, h, dpr } = unitCardSize(variant);
          // Portrait is deliberately NOT dpr-2: X shows it ~500-600px wide, so
          // 1200×1600 is already ~2x the display width (§12).
          const canvas = createCanvas(w * dpr, h * dpr);
          canvas.getContext('2d').scale(dpr, dpr);
          drawUnitCardVariant(
            canvas.getContext('2d') as unknown as Canvas2DLike,
            data,
            variant
          );
          return {
            key,
            png: encodeCard(canvas),
            ext: 'webp' as const,
            width: canvas.width,
            height: canvas.height,
            canvas,
            inkRegion: scaleRegionBy(
              variant === 'twitter'
                ? UNIT_PORTRAIT_TITLE_INK_REGION
                : UNIT_TITLE_INK_REGION,
              dpr
            ),
          };
        },
      });
    }
  }
  return jobs;
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
  // Input-hash of everything this set was rendered from (renderer code +
  // committed art + the seven board artifacts' stripped content —
  // scripts/artifact-input-hash.ts). Provenance for a future decoupled image
  // store (plan Step 3); absent in --limit mode, where the boards don't exist.
  inputsHash?: string;
  images: Record<string, ManifestImage>;
  // Slugs with NO unit card ON PURPOSE (unsupported B3/Λ — see unitJobs). A
  // consumer cannot otherwise tell this apart from the other ways a card can be
  // missing (manifest outage, a unit synced after the last deploy), which are
  // transient and mean something different to a user. bakery-bot's /nikke uses
  // it to say "not sim supported" only when that is actually true.
  notSimSupported: string[];
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
  // ICON GATE: the same contract for the unit card's icon strip. A missing icon
  // degrades to a blank slot in an immutable, content-hashed image that nothing
  // will re-render — so fail the build instead.
  await assertIconsLive();
  // PORTRAIT GATE: same contract, but fillable — see fillMissingPortraits.
  // Runs before any render, since loadPortrait caches its misses per process.
  await fillMissingPortraits();

  const chars = loadJson<{ characters: Record<string, CharacterRow> }>(
    new URL('../data/characters.json', import.meta.url)
  );
  const sources = loadUnitCardSources();
  if (sources.missing.length) {
    // Not fatal — every field is nullable and the card draws an absent-state —
    // but it silently THINS every card, which is invisible in the output.
    console.warn(
      `infographics: ${sources.missing.length} board artifact(s) missing, unit cards will ` +
        `render 'Unranked' for them: ${sources.missing.join(', ')} (${DATA_HINT})`
    );
  }
  const notSimSupported: string[] = [];
  let jobs: Job[] = unitJobs(
    Object.values(chars.characters),
    sources,
    LIMIT,
    notSimSupported
  );
  if (LIMIT === null) {
    // full set: DPS charts + rank boards (needs the web/public artifacts)
    const dpschart = loadJson<DpsArtifact>(
      new URL('../web/public/dpschart.json', import.meta.url),
      DATA_HINT
    );
    jobs.unshift(
      ...dpsJobs(dpschart),
      ...rankJobs(),
      ...tableJobs(),
      ...perUnitTableJobs(Object.values(chars.characters)),
      ...resourcesJobs(),
      ...dollJobs()
    );
  }
  if (ONLY) {
    jobs = jobs.filter((j) => j.key.startsWith(ONLY));
  }
  if (jobs.length === 0) {
    throw new Error(
      ONLY
        ? `build-infographics: --only '${ONLY}' matched no job keys`
        : 'build-infographics: empty job list'
    );
  }

  mkdirSync(OUT_DIR, { recursive: true });
  // Content-addressed names mean a stale image from a previous run would linger
  // forever. Clean only the dirs this script owns (derived from the job keys) —
  // dist/img/ also holds Vite-copied assets (portraits) that are not ours.
  for (const dir of new Set(jobs.map((j) => j.key.split('/')[0]))) {
    rmSync(join(OUT_DIR, dir), { recursive: true, force: true });
  }
  rmSync(join(OUT_DIR, 'manifest.json'), { force: true });
  const manifest: Manifest = {
    generatedAt: '',
    images: {},
    notSimSupported: [...notSimSupported].sort(),
  };
  let totalBytes = 0;
  let totalPx = 0;

  const emit = (r: Rendered): void => {
    const hash = hash8(r.png);
    const file = `${r.key}.${hash}.${r.ext}`;
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
  const infographicsInputsHash = computeInfographicsInputHash();
  if (infographicsInputsHash !== null) {
    manifest.inputsHash = infographicsInputsHash;
  }
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
  // Per-kind sizes: the WebP ruling (§12) was made on a MEASUREMENT, so the
  // build reports the number that justified it rather than leaving a projection
  // in a doc to rot.
  const byKind: Record<string, { n: number; bytes: number }> = {};
  for (const [key, img] of Object.entries(manifest.images)) {
    const kind = key.split('/')[0];
    byKind[kind] ??= { n: 0, bytes: 0 };
    byKind[kind].n++;
    byKind[kind].bytes += img.bytes;
  }
  for (const [kind, v] of Object.entries(byKind).sort()) {
    console.log(
      `  ${kind}: ${v.n} images, ${(v.bytes / 1e6).toFixed(1)} MB ` +
        `(${Math.round(v.bytes / v.n / 1024)} KB avg)`
    );
  }
  // Which icons are still raster-bound, and how hard they are being upscaled.
  // Visible every build so the quality gap can't quietly become permanent;
  // empties out once the missing SVGs land.
  const audit = await iconUpscaleAudit(unitCardSize('discord').dpr * 44);
  if (audit.length) {
    console.log(
      `  icons: ${audit.length} raster-bound (no vector source) — worst ` +
        audit
          .slice(0, 3)
          .map((a) => `${a.name} ${a.native}px→${a.factor}x`)
          .join(', ')
    );
  }
}

await main();
