// The /builder page's state → hosting mapping (pure, DOM-free, fetch-free so
// scripts/tests can pin it): which card types map to a PRE-RENDERED manifest
// image (hand the URL out directly, no render request) and which map to a
// RenderSpec for POST /api/v1/img/render. The manifest keys mirror
// scripts/build-infographics.ts's job keys (`dps/<cell>.<ele|all>`,
// `rank/<board>`, `unit/<slug>`, `table/ol`, `table/charge-speed`) — the
// head-only set; everything else is the on-demand tail.
// (imported with the repo's nodenext .js extension so the vitest suite can
// pull this module in under the root tsconfig — vite resolves it identically)
import type { RenderSpec } from '../../src/infographics/spec.js';

export type BuilderCardType =
  'dps' | 'rank' | 'unit' | 'ol' | 'charge' | 'ammo';
export type BuilderBoard = 'burstgen' | 'burstcdr' | 'sustain' | 'buffer';
export type BuilderDpsMode = 'top' | 'window' | 'compare';

export interface BuilderState {
  card: BuilderCardType;
  cell: string; // dps: cell id
  element: string | null; // dps: lowercase element filter, null = All
  dpsMode: BuilderDpsMode; // dps: top-10 / §6.6 unit window / unit comparison
  unit: string; // dps window target, unit card, per-unit charge/ammo slug ('' = generic charge table)
  units: string[]; // dps compare picks (1–10)
  board: BuilderBoard; // rank board
}

// The two cells build-infographics.ts pre-renders (its HEADLINE_CELL_IDS —
// the bot /dps default + its neutral variant). Any other cell is tail → POST.
export const HEADLINE_CELL_IDS = [
  'solo.eleweak.c100.8of12',
  'solo.neutral.c100.8of12',
] as const;

// The manifest key for a state, or null when no pre-rendered image covers it
// (→ POST a RenderSpec instead). Deliberately conservative: a state maps to
// the manifest ONLY when the pre-rendered image is pixel-for-pixel the same
// card (headline cell, top-10 window, no unit/units; the generic buffer
// board; the generic charge table).
export function manifestKeyFor(s: BuilderState): string | null {
  switch (s.card) {
    case 'dps':
      if (s.dpsMode !== 'top' || !HEADLINE_CELL_IDS.includes(s.cell as never)) {
        return null;
      }
      return `dps/${s.cell}.${s.element ?? 'all'}`;
    case 'rank':
      return `rank/${s.board}`;
    case 'unit':
      return s.unit ? `unit/${s.unit}` : null;
    case 'ol':
      return 'table/ol';
    case 'charge':
      return s.unit ? null : 'table/charge-speed';
    case 'ammo':
      return null; // max-ammo is always per-unit → on-demand
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
    case 'rank':
    case 'unit':
    case 'ol':
      return null; // manifest-only card types
  }
}

// manifest.json shape (scripts/build-infographics.ts's Manifest) — only the
// field the builder reads.
export interface ImgManifest {
  generatedAt: string;
  images: Record<string, { file: string }>;
}
