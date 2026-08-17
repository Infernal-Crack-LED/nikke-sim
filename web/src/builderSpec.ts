// The /builder page's state → hosting mapping (pure, DOM-free, fetch-free so
// scripts/tests can pin it): which card types map to a PRE-RENDERED manifest
// image (hand the URL out directly, no render request) and which map to a
// RenderSpec for POST /api/v1/img/render. The manifest keys mirror
// scripts/build-infographics.ts's job keys (`dps/<cell>.<ele|all>`,
// `rank/<board>`, `unit/<slug>`, `table/ol`, `table/charge-speed`) — the
// head-only set; everything else is the on-demand tail.
// (imported with the repo's nodenext .js extension so the vitest suite can
// pull this module in under the root tsconfig — vite resolves it identically)
import {
  PULL_PRERENDER_COUNTS,
  type RenderSpec,
} from '../../src/infographics/spec.js';
import type { B1B2DpsCell } from '../../src/ranks/b1b2-cells.js';

export type BuilderCardType =
  'dps' | 'rank' | 'unit' | 'ol' | 'charge' | 'ammo' | 'pull';
export type BuilderBoard =
  'burstgen' | 'burstcdr' | 'sustain' | 'buffer' | 'b1b2dps';
export type BuilderDpsMode = 'top' | 'window' | 'compare';
export type OlLinesPreset = '4of12' | '8of12' | '12of12';
export type BufferBoard = 'generic' | 'typed';
export type BurstGenBoard = 'unfocused' | 'focused';

// The exact (lines, tier) the static ol-default.json artifact was built at —
// the ONE OL combo manifestKeyFor can still serve from the pre-rendered
// manifest (see below).
export const OL_DEFAULT_LINES: OlLinesPreset = '8of12';
export const OL_DEFAULT_TIER = 11;

export interface BuilderState {
  card: BuilderCardType;
  cell: string; // dps: cell id
  element: string | null; // dps: lowercase element filter, null = All
  dpsMode: BuilderDpsMode; // dps: top-10 / §6.6 unit window / unit comparison
  unit: string; // dps window target, unit card, per-unit charge/ammo slug ('' = generic charge table)
  units: string[]; // dps compare picks (1–10)
  board: BuilderBoard; // rank board
  bufferBoard: BufferBoard; // rank/buffer sub-mode
  burstGenBoard: BurstGenBoard; // rank/burstgen sub-mode
  b1b2DpsBoard: B1B2DpsCell; // rank/b1b2dps sub-mode
  olLines: OlLinesPreset; // ol: desired line count
  olTier: number; // ol: desired tier (1-15)
  pulls: number; // pull: planned Advanced Recruit pull count
  // unit card: which variant to preview. 'discord' is the 2:1 landscape card the
  // bot embeds; 'twitter' is the 3:4 portrait launch asset. Both are
  // pre-rendered, so both map to the manifest.
  unitVariant: UnitCardVariant;
}

export type UnitCardVariant = 'discord' | 'twitter';

// The two cells build-infographics.ts pre-renders (its HEADLINE_CELL_IDS —
// the bot /dps default + its neutral variant). Any other cell is tail → POST.
export const HEADLINE_CELL_IDS = [
  'solo.eleweak.c100.8of12',
  'solo.neutral.c100.8of12',
] as const;

// The manifest key for a state, or null when no pre-rendered image covers it
// (→ POST a RenderSpec instead, or — for 'rank'/a non-default 'ol' — nothing
// hosted at all yet; see renderSpecFor). Deliberately conservative: a state
// maps to the manifest ONLY when the pre-rendered image is pixel-for-pixel
// the same card (headline cell, top-10 window, no unit/units; the generic
// charge table; the exact default OL combo).
export function manifestKeyFor(s: BuilderState): string | null {
  switch (s.card) {
    case 'dps':
      if (s.dpsMode !== 'top' || !HEADLINE_CELL_IDS.includes(s.cell as never)) {
        return null;
      }
      return `dps/${s.cell}.${s.element ?? 'all'}`;
    case 'rank':
      // rank/<board> pre-renders the old plain-text table (build-infographics
      // .ts's rankJobs, unfocused/generic only) — the Builder card is now the
      // portrait bar chart with the chosen sub-mode, a different image, so
      // nothing in the manifest matches any state here.
      return null;
    case 'unit':
      // Keyed by variant: the two cards are different images of the same unit,
      // and a shared key would serve the landscape card to a portrait request
      // out of an immutable cache.
      return s.unit ? `unit/${s.unit}.${s.unitVariant}` : null;
    case 'ol':
      // table/ol pre-renders ONE specific combo (scripts/build-ol-default.ts:
      // 8/12 · T11) — only that exact selection matches it.
      return s.olLines === OL_DEFAULT_LINES && s.olTier === OL_DEFAULT_TIER
        ? 'table/ol'
        : null;
    case 'charge':
      return s.unit ? null : 'table/charge-speed';
    case 'ammo':
      return null; // max-ammo is always per-unit → on-demand
    case 'pull':
      // build-infographics.ts pre-renders only PULL_PRERENDER_COUNTS (the
      // /pull page's presets); every other count is the on-demand tail.
      return (PULL_PRERENDER_COUNTS as readonly number[]).includes(s.pulls)
        ? `pull/${s.pulls}`
        : null;
  }
}

// The RenderSpec to POST for a state, or null when the state is fully covered
// by the manifest (or carries no renderable request — e.g. a compare mode
// with no picks). dps 'top' mode on a non-headline cell is a plain
// { kind:'dps' } spec — the API's §6.6 top-10 default.
export function renderSpecFor(s: BuilderState): RenderSpec | null {
  switch (s.card) {
    case 'dps': {
      if (manifestKeyFor(s)) {
        return null;
      }
      const base = {
        kind: 'dps' as const,
        cell: s.cell,
        ...(s.element ? { element: s.element } : {}),
      };
      if (s.dpsMode === 'window' && s.unit) {
        return { ...base, unit: s.unit };
      }
      if (s.dpsMode === 'compare') {
        return s.units.length > 0 ? { ...base, units: s.units } : null;
      }
      return base;
    }
    case 'charge':
      return s.unit
        ? { kind: 'table', table: 'charge-speed', unit: s.unit }
        : null; // generic → manifest
    case 'ammo':
      return s.unit ? { kind: 'table', table: 'max-ammo', unit: s.unit } : null;
    case 'unit':
      return null; // manifest-only card type
    case 'pull':
      // Any count the manifest doesn't already cover renders on demand — the
      // API's pull kind takes the count directly.
      return manifestKeyFor(s) ? null : { kind: 'pull', pulls: s.pulls };
    case 'rank':
    case 'ol':
      // No server RenderSpec support yet for the portrait bar chart or a
      // non-default OL combo — 'unit' cards render on demand via the API;
      // these don't, so onGetUrl falls through to its "use Copy image
      // instead" message for anything manifestKeyFor doesn't cover.
      return null;
  }
}

// manifest.json shape (scripts/build-infographics.ts's Manifest) — only the
// field the builder reads.
export interface ImgManifest {
  generatedAt: string;
  images: Record<string, { file: string }>;
}
