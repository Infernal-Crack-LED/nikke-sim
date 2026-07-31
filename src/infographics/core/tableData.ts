// TableCardData builders for the breakpoint/economy tables (max-ammo,
// charge-speed, OL roll costs) — the DATA half of bakery-bot's /max-ammo,
// /charge-speed and /ol commands, mirrored formula-for-formula so the site's
// API renders the same rows the bot used to (constants and rounding are
// load-bearing). Pure and DOM-free like the rest of core/: callers attach the
// icon/portrait and render via drawTableCard.
import type { TableCardData } from './tableCard.js';
import type { OlKey, Target } from '../../overload/model.js';
import type { McSummary } from '../../overload/policy.js';

// ---- max ammo ---------------------------------------------------------------

// T11 Max Ammunition Capacity ▲ per OL line (datamined tier-11 value).
export const AMMO_PER_LINE_T11 = 68.93;

// Per-OL-line ammo breakpoints for a weapon with `base` rounds. Mirrors
// bakery-bot apps/bot/src/commands/utility/max-ammo.ts buildAmmoTable: a line
// count that doesn't cross a whole round is omitted (Math.floor), matching the
// bot's rows exactly.
export function buildAmmoTable(base: number, name: string): TableCardData {
  const rows: string[][] = [];
  for (let lines = 1; lines <= 5; lines++) {
    const pct = lines * AMMO_PER_LINE_T11;
    const ammo = Math.floor(base * (1 + pct / 100));
    if (ammo <= base) {
      continue;
    }
    rows.push([`${lines}`, `${pct.toFixed(1)}%`, `${ammo}`, `+${ammo - base}`]);
  }
  return {
    title: `Max Ammo — ${name}`,
    subtitle: `Base ${base} rounds · T11 = ${AMMO_PER_LINE_T11}% ammo/line`,
    columns: [
      { header: 'OL Lines' },
      { header: 'Ammo %', align: 'right' },
      { header: 'Rounds', align: 'right' },
      { header: 'Gain', align: 'right' },
    ],
    rows,
    footer: 'nikkesim.app/charge',
  };
}

// ---- charge speed -----------------------------------------------------------

// T11 Charge Speed ▲ per OL line; frame math mirrors the bot's charge-speed.ts.
export const CS_PER_LINE_T11 = 4.92;
export const RELEASE_LATENCY_FRAMES = 22;
export const FULL_BURST_FRAMES = 600;
// The no-unit generic table's basis (1.0s charge = 60 frames).
export const GENERIC_BASE_FRAMES = 60;
const FRAME_MS = 1000 / 60;

// Release latency is NOT universal: "new-style" AUTOFIRING charge weapons fire
// on press at a baked cadence with no latency, and the split is datamined per
// unit via role.weapon.shot_detail.input_type ('UP' = release-fired, +22f;
// 'DOWN_Charge' = autofire, 0f). This mirrors the engine's isAutofireCharge
// (src/engine/sim.ts) — the same SSOT the site's /charge panel reads — so a
// card can never state a shots-per-Full-Burst the panel it was copied from
// contradicts. An absent role is release-fired (the safe SR/RL default).
// Autofire units in data/characters.json today: anis-star, cinderella,
// liberalio, neon-vision-eye, vesti-tactical-upgrade.
export interface ChargeWeaponRow {
  role?: { weapon?: unknown } | null;
}
export const isAutofireCharge = (char: ChargeWeaponRow | null): boolean =>
  (char?.role?.weapon as { shot_detail?: { input_type?: string } } | undefined)
    ?.shot_detail?.input_type === 'DOWN_Charge';
export const chargeLatencyFrames = (char: ChargeWeaponRow | null): number =>
  isAutofireCharge(char) ? 0 : RELEASE_LATENCY_FRAMES;

// Every reachable charge-frame count below base, with the infimum CS% that
// reaches it (charge is continuous; frames quantize). Mirrors the bot's
// chargeFrameBreakpoints, including the 1e-9 epsilon + ceil-to-cent rounding.
function chargeFrameBreakpoints(
  baseFrames: number
): { frames: number; csNeeded: number }[] {
  const rows: { frames: number; csNeeded: number }[] = [];
  for (let n = baseFrames - 1; n >= 1; n--) {
    const infimum = 100 * (1 - (n + 0.5) / baseFrames);
    const csNeeded = Math.ceil((infimum + 1e-9) * 100) / 100;
    rows.push({ frames: n, csNeeded });
  }
  return rows;
}

// The best (lowest-frame) breakpoint `lines` OL lines of T11 CS reach.
function bestPerLine(
  baseFrames: number,
  lines: number
): { frames: number; csNeeded: number } | null {
  const totalCs = lines * CS_PER_LINE_T11;
  const bps = chargeFrameBreakpoints(baseFrames);
  let best: { frames: number; csNeeded: number } | null = null;
  for (const bp of bps) {
    if (bp.csNeeded <= totalCs) {
      best = bp;
    }
  }
  return best;
}

// Mirrors the bot's buildChargeTable: rows are the best breakpoint per OL line
// count (skipped when 1–5 lines reach nothing — only degenerate tiny bases).
// `latencyFrames` is the per-shot release latency (chargeLatencyFrames above —
// 0 for autofire units); it only feeds the Shots/FB column.
export function buildChargeTable(
  baseFrames: number,
  label: string,
  latencyFrames: number = RELEASE_LATENCY_FRAMES
): TableCardData {
  const rows: string[][] = [];
  for (let lines = 1; lines <= 5; lines++) {
    const bp = bestPerLine(baseFrames, lines);
    if (!bp) {
      continue;
    }
    const ms = bp.frames * FRAME_MS;
    const shotsFb = FULL_BURST_FRAMES / (bp.frames + latencyFrames);
    rows.push([
      `${lines}`,
      `≥ ${bp.csNeeded.toFixed(2)}%`,
      `${bp.frames}f`,
      `${ms.toFixed(0)} ms`,
      shotsFb.toFixed(2),
    ]);
  }
  return {
    title: `Charge Speed — ${label}`,
    subtitle:
      `Base ${baseFrames}f (${(baseFrames / 60).toFixed(2)}s) · T11 = ${CS_PER_LINE_T11}% CS/line · ` +
      `shots per Full Burst (10s${latencyFrames === 0 ? ', autofire — no release latency' : `, +${latencyFrames}f release`})`,
    columns: [
      { header: 'OL Lines' },
      { header: 'CS Needed', align: 'right' },
      { header: 'Charge', align: 'right' },
      { header: 'Time', align: 'right' },
      { header: 'Shots/FB', align: 'right' },
    ],
    rows,
    footer: 'nikkesim.app/charge',
  };
}

// ---- OL roll costs ----------------------------------------------------------

// web/public/ol-default.json (committed; built by scripts/build-ol-default.ts).
export interface OlPieceResult {
  expRolls: number;
  p50: number;
  p95: number;
  phase1: number;
  phase2: number;
  modules: number;
  modulesP95: number;
}
export interface OlDefaultArtifact {
  generatedAt: string;
  config: { lines: string[]; pieces: number; trials: number };
  perPiece: OlPieceResult[];
  total: OlPieceResult;
}

const OL_ROLL_COLUMNS: TableCardData['columns'] = [
  { header: '' },
  { header: 'Exp Rolls', align: 'right' },
  { header: 'P95', align: 'right' },
  { header: 'Ph1 / Ph2', align: 'right' },
  { header: 'Modules', align: 'right' },
  { header: 'Mod P95', align: 'right' },
];

function olRollRow(label: string, p: OlPieceResult): string[] {
  return [
    label,
    `${p.expRolls}`,
    `${p.p95}`,
    `${p.phase1} / ${p.phase2}`,
    `${p.modules}`,
    `${p.modulesP95}`,
  ];
}
function olRollRows(
  perPiece: OlPieceResult[],
  total: OlPieceResult
): string[][] {
  const rows = perPiece.map((p, i) => olRollRow(`Piece ${i + 1}`, p));
  rows.push(olRollRow('Full Build', total));
  return rows;
}
function trialsLabel(trials: number): string {
  return trials >= 1000 ? `${trials / 1000}k` : `${trials}`;
}

// The /ol table: 4 pieces + Full Build. Mirrors the bot's ol.ts buildTable;
// the subtitle is composed from the artifact's config (lines, piece count,
// trial count) instead of the bot's hardcoded string.
export function buildOlTable(art: OlDefaultArtifact): TableCardData {
  return {
    title: 'Overload Roll Calculator — Default 8/12',
    subtitle: `${art.config.lines.join(' + ')} · ${art.config.pieces} pieces · ${trialsLabel(art.config.trials)}-trial Monte Carlo`,
    columns: OL_ROLL_COLUMNS,
    rows: olRollRows(art.perPiece, art.total),
    footer: 'nikkesim.app/olsim',
  };
}

// ---- OL roll costs, live/parameterized (Card Builder) ----------------------

// Round a live Monte Carlo summary into the same shape/precision as the
// static ol-default.json artifact's baked OlPieceResult fields (mirrors
// scripts/build-ol-default.ts's fmt()).
function olPieceResultFrom(s: McSummary): OlPieceResult {
  return {
    expRolls: Math.round(s.ops.mean * 10) / 10,
    p50: s.ops.pctiles.p50,
    p95: s.ops.pctiles.p95,
    phase1: Math.round(s.phase1Rerolls.mean * 10) / 10,
    phase2: Math.round(s.phase2Resets.mean * 10) / 10,
    modules: Math.round(s.moduleCostPerm.mean),
    modulesP95: s.moduleCostPerm.p95,
  };
}

export type OlLinesPreset = '4of12' | '8of12' | '12of12';
export const OL_LINES_PRESETS: OlLinesPreset[] = ['4of12', '8of12', '12of12'];
export const OL_LINES_LABEL: Record<OlLinesPreset, string> = {
  '4of12': '4/12',
  '8of12': '8/12',
  '12of12': '12/12',
};
const OL_LINES_PER_PIECE: Record<OlLinesPreset, number> = {
  '4of12': 1,
  '8of12': 2,
  '12of12': 3,
};
export const OL_PIECES = 4;
// The Monte Carlo needs SOME concrete stat per line slot (roll probability is
// stat-dependent — data/ol-probabilities.json weights differ by key), but the
// card intentionally never names which stats it used (owner ruling — only the
// line COUNT and tier are shown). Elemental DMG + ATK is the sitewide 8/12
// floor (App.tsx's OL_8_12_ELEM/OL_8_12_ATK bulk-apply pill); Crit Rate stands
// in for the unit-specific 4th "12/12" line every real build actually rolls
// (scripts/build-ol-optimal.ts) since this card has no unit to be optimal for.
const OL_REPRESENTATIVE_KEYS: OlKey[] = ['elem', 'atk', 'critrate'];

export function olTargetFor(lines: OlLinesPreset, tier: number): Target {
  return OL_REPRESENTATIVE_KEYS.slice(0, OL_LINES_PER_PIECE[lines]).map(
    (key) => ({ key, minTier: tier })
  );
}

// The generic (no-lines-named) OL roll table for the Card Builder: same shape
// as buildOlTable, sourced from a live monteCarloBuild() result instead of
// the static default artifact. Title/subtitle state only the line count and
// tier — never which stats were simulated.
export function buildOlRollTable(
  lines: OlLinesPreset,
  tier: number,
  mc: { perPiece: McSummary[]; total: McSummary },
  trials: number
): TableCardData {
  return {
    title: `Overload Roll Calculator — ${OL_LINES_LABEL[lines]}`,
    subtitle: `T${tier} · ${OL_PIECES} pieces · ${trialsLabel(trials)}-trial Monte Carlo`,
    columns: OL_ROLL_COLUMNS,
    rows: olRollRows(
      mc.perPiece.map(olPieceResultFrom),
      olPieceResultFrom(mc.total)
    ),
    footer: 'nikkesim.app/olsim',
  };
}
