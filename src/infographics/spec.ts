// The render request contract (plan §2 "The API contract" / §6.4) — the ONE
// definition of "what can be rendered on demand" and of the cache key each
// request maps to. Shared by the API's GET query routes AND
// POST /api/v1/img/render (both parse into a RenderSpec and derive the cache
// key from specCacheKey, so the two entry points can never drift), and
// importable by the prebuild script / web code later: this module is
// DOM-free, canvas-free, and dependency-free (no hono, no @napi-rs/canvas).
//
// Cache-key stability is load-bearing: keys are content addresses for files
// already on disk (and already handed to Discord's URL-keyed CDN). The key
// STRINGS below must stay byte-identical — changing one orphans every cached
// render. scripts/tests/share/render-spec.test.ts pins them.
import { decodeBuild } from '../share/build-code.js';

// Bump when the card renderers change in a way that should re-render existing
// specs — it is part of the cache key, so old files simply age out via LRU
// instead of serving stale pixels.
// v2 (2026-07-28): the bar-label column rule (a long NIKKE name now shortens
// the bars instead of being clipped by them), the table-card flex widths +
// ellipsize backstop, and the autofire charge-latency fix — every one of them
// changes the pixels a v1 key already has a file for.
export const RENDERER_VERSION = 'v2';

// Build codes are compact (a 5-slot build is ~300-600 chars; a union roster
// with loadouts is still well under 2 KB). Anything beyond this is garbage.
export const BUILD_CODE_MAX_LEN = 4096;

// dps.png with no cell param renders the site's default chart cell.
export const DEFAULT_DPS_CELL = 'solo.eleweak.c100.8of12';

// The element filter set both link surfaces expose (web DpsChartTab
// ELEMENT_FILTERS pills, bot /dps choices) — request values are lowercase.
export const ELEMENT_FILTERS = ['fire', 'water', 'wind', 'electric', 'iron'];

// One render request. `build` is the share build code; dps fields are
// post-normalization (cell defaulted, element lowercased, unit trimmed —
// absent means "no filter"). `units` is the unit-comparison variant of the
// dps chart (render exactly those bars, in population rank order, NO §6.6
// window) and is mutually exclusive with `unit` (the window target). The
// static pre-rendered kinds (unit cards, rank boards, the OL table) are NOT
// here: this union covers the dynamic, render-on-demand surface only.
export type RenderSpec =
  | { kind: 'team'; build: string }
  | { kind: 'roster'; build: string }
  | {
      kind: 'dps';
      cell: string;
      element?: string;
      unit?: string;
      units?: string[];
    }
  | { kind: 'table'; table: 'max-ammo'; unit: string }
  | { kind: 'table'; table: 'charge-speed'; unit?: string };

// A comparison chart is capped at 10 bars — the same row count the §6.6
// window renders, so the card geometry never changes shape.
export const DPS_COMPARE_MAX = 10;

export type ParseResult =
  { ok: true; spec: RenderSpec } | { ok: false; error: string };

// Optional data the parser can check existence against (the structural rules
// run regardless). The server passes the dpschart artifact's cell/unit keys
// and the characters.json slugs; a caller without data simply skips those
// checks (the server's render resolution re-validates regardless).
export interface RenderSpecData {
  cells?: readonly string[]; // known dpschart cell ids
  units?: readonly string[]; // known unit slugs
}

const trimmed = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() ? v.trim() : undefined;

// Validate a request-shaped input (the POST body verbatim, or an object the
// GET handlers build from query params) into a normalized RenderSpec. The
// rules are exactly the ones the GET query routes enforce today: build code
// present/short/decodable, element in the filter enum, unit required for
// max-ammo, and — when `data` is given — cell/unit existence. Error strings
// match the GET 400 bodies where those are pinned by tests.
export function parseRenderSpec(
  input: unknown,
  data?: RenderSpecData
): ParseResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'invalid render spec' };
  }
  const raw = input as Record<string, unknown>;
  switch (raw.kind) {
    case 'team':
    case 'roster': {
      const code = typeof raw.build === 'string' ? raw.build.trim() : '';
      if (!code || code.length > BUILD_CODE_MAX_LEN || !decodeBuild(code)) {
        return { ok: false, error: 'invalid build code' };
      }
      return { ok: true, spec: { kind: raw.kind, build: code } };
    }
    case 'dps': {
      const cell = trimmed(raw.cell) ?? DEFAULT_DPS_CELL;
      const element = trimmed(raw.element)?.toLowerCase();
      const unit = trimmed(raw.unit);
      // units: the comparison variant — an array of slugs (the GET route
      // comma-splits its query param into one). Trimmed, empties dropped,
      // deduped; an all-empty array means "absent", same as the query param.
      let units: string[] | undefined;
      if (raw.units !== undefined) {
        if (!Array.isArray(raw.units)) {
          return { ok: false, error: 'units must be an array of unit slugs' };
        }
        units = [
          ...new Set(
            raw.units
              .map((u) => (typeof u === 'string' ? u.trim() : ''))
              .filter((u) => u)
          ),
        ];
        if (units.length === 0) {
          units = undefined;
        } else if (units.length > DPS_COMPARE_MAX) {
          return {
            ok: false,
            error: `units is capped at ${DPS_COMPARE_MAX}`,
          };
        }
      }
      if (unit && units) {
        return { ok: false, error: 'unit and units are mutually exclusive' };
      }
      if (data?.cells && !data.cells.includes(cell)) {
        return { ok: false, error: `unknown cell '${cell}'` };
      }
      if (element && !ELEMENT_FILTERS.includes(element)) {
        return { ok: false, error: `unknown element '${element}'` };
      }
      if (unit && data?.units && !data.units.includes(unit)) {
        return { ok: false, error: `unknown unit '${unit}'` };
      }
      if (units && data?.units) {
        for (const u of units) {
          if (!data.units.includes(u)) {
            return { ok: false, error: `unknown unit '${u}'` };
          }
        }
      }
      return {
        ok: true,
        spec: {
          kind: 'dps',
          cell,
          ...(element ? { element } : {}),
          ...(unit ? { unit } : {}),
          ...(units ? { units } : {}),
        },
      };
    }
    case 'table': {
      const unit = trimmed(raw.unit);
      if (raw.table !== 'max-ammo' && raw.table !== 'charge-speed') {
        return { ok: false, error: `unknown table '${String(raw.table)}'` };
      }
      if (raw.table === 'max-ammo') {
        if (!unit) {
          return { ok: false, error: 'unit is required' };
        }
        if (data?.units && !data.units.includes(unit)) {
          return { ok: false, error: `unknown unit '${unit}'` };
        }
        return { ok: true, spec: { kind: 'table', table: 'max-ammo', unit } };
      }
      if (unit && data?.units && !data.units.includes(unit)) {
        return { ok: false, error: `unknown unit '${unit}'` };
      }
      return {
        ok: true,
        spec: {
          kind: 'table',
          table: 'charge-speed',
          ...(unit ? { unit } : {}),
        },
      };
    }
    default:
      return { ok: false, error: `unknown render kind '${String(raw.kind)}'` };
  }
}

// The content-address key string for a spec — the EXISTING `v1|...` format
// (see the module header: never change these strings). sha256(key)[:16] is
// the hash in the cache filename.
export function specCacheKey(spec: RenderSpec): string {
  switch (spec.kind) {
    case 'team':
    case 'roster':
      return `${RENDERER_VERSION}|${spec.kind}|${spec.build}`;
    case 'dps':
      // The 5-field `v1|dps|cell|element|unit` string is pinned for every
      // pre-units spec (cache compatibility). A comparison appends a 6th
      // field — the SORTED slug list, so request order can't fork the cache
      // (unit is always '-' then: the two are mutually exclusive).
      return (
        `${RENDERER_VERSION}|dps|${spec.cell}|${spec.element ?? '-'}|${spec.unit ?? '-'}` +
        (spec.units?.length ? `|${[...spec.units].sort().join(',')}` : '')
      );
    case 'table':
      return `${RENDERER_VERSION}|table|${spec.table}|${spec.unit ?? 'generic'}`;
  }
}

// The cache-filename prefix for a spec (`<type>.<hash>.png` — both table
// variants share the `table` prefix, matching the existing files).
export function specCacheType(
  spec: RenderSpec
): 'team' | 'roster' | 'dps' | 'table' {
  return spec.kind === 'table' ? 'table' : spec.kind;
}
