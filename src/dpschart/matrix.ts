// DPS-chart matrix — the standardized 72-cell comparison grid.
//
// Four axes (4 frameworks × 2 elements × 3 core-exposure × 3 investment = 72),
// each cell producing one ranked infographic of tested B3 carries. This module is
// PURE (no fs / no engine) so it can run in node (the precompute script) and the
// browser (the tester tab's live custom mode) alike; `assembleTeam` returns the
// slugs + per-unit options + SimConfig that run.ts feeds to prepareTeam/runSim.
//
// Control frameworks (see docs/handoffs/dps-chart-handoff.md):
//   Standard             little-mermaid(B1) + Crown(B2) + Helm(B3) + tested        (no Mast)
//   Standard Hyper Carry   …+ Mast:Romantic Maid(B2), bursting in sync with tested
//   Anis Standard        anis-star(B1) + Crown(B2) + Helm(B3) + tested             (no Mast)
//   Anis Standard HC      …+ Mast, sync-bursting
// The tested unit sits in slot 0 so it is the leftmost B3 (wins the stage-3 cast
// every rotation); Mast sits left of Crown so it is the preferred B2 when its
// syncWithFocus gate opens.
import type { Element, SimConfig } from '../types.js';
import type { LineSelection, UnitOptions } from '../prepare.js';

// unit.element beats … (mirror of BEATS in engine/sim.ts). For "ele weak" the boss
// is set to the element the TESTED unit beats, so only the tested unit is advantaged.
const BEATS: Record<Element, Element> = {
  Electric: 'Water', Iron: 'Electric', Wind: 'Iron', Fire: 'Wind', Water: 'Fire',
};

// Fixed control-unit slugs.
const CROWN = 'crown';
const HELM = 'helm';
const MAST = 'mast-romantic-maid';
// When the tested unit IS the control B3 (Helm), swap the control slot for a quiet
// neutral filler B3 so the comp stays valid (B3 ≥ 2) with no duplicate. Snow White is
// a self-contained attacker (no burst-queue quirks, minimal team buffs); Helm's own
// row is therefore not perfectly comparable — a documented edge case for 1 of 13.
const FILLER_B3 = 'snow-white';

// ---- axes -----------------------------------------------------------------

export type FrameworkId = 'standard' | 'standard-hc' | 'anis' | 'anis-hc';
export type EleAdvId = 'neutral' | 'eleweak';
export type CoreId = 'c0' | 'c50' | 'c100';
export type InvestId = 'scope' | '8of12' | '12of12';

export interface Framework {
  id: FrameworkId;
  label: string;
  b1: string;         // burst-1 anchor
  mast: boolean;      // include Mast:Romantic Maid as a sync-bursting B2
  blurb: string;      // one-line explainer for the UI / bot
}
export const FRAMEWORKS: Record<FrameworkId, Framework> = {
  standard: {
    id: 'standard', label: 'Standard', b1: 'little-mermaid', mast: false,
    blurb: 'Little Mermaid (B1) + Crown (B2) + Helm (B3) supporting the tested carry — a lean four-unit control, no Mast. The carry and Helm alternate the Burst-3 cast.',
  },
  'standard-hc': {
    id: 'standard-hc', label: 'Standard Hyper Carry', b1: 'little-mermaid', mast: true,
    blurb: 'Standard, plus Mast: Romantic Maid (B2) bursting alongside the carry to hyper-buff it — she skips ~1 in 4 of the carry’s bursts to her Hangover stun.',
  },
  anis: {
    id: 'anis', label: 'Anis Standard', b1: 'anis-star', mast: false,
    blurb: 'Standard with Anis: Star (B1) anchoring in place of Little Mermaid — no Mast.',
  },
  'anis-hc': {
    id: 'anis-hc', label: 'Anis Standard Hyper Carry', b1: 'anis-star', mast: true,
    blurb: 'Anis: Star anchor plus Mast: Romantic Maid hyper-carry support (same Hangover skip as Standard Hyper Carry).',
  },
};

export const ELEADVS: Record<EleAdvId, { id: EleAdvId; label: string }> = {
  neutral: { id: 'neutral', label: 'Neutral' },
  eleweak: { id: 'eleweak', label: 'Ele Weak' },
};

export const CORES: Record<CoreId, { id: CoreId; label: string; rate: number }> = {
  c0: { id: 'c0', label: 'No Core', rate: 0 },
  c50: { id: 'c50', label: 'Core 50', rate: 0.5 },
  c100: { id: 'c100', label: 'Core 100', rate: 1 },
};

export const INVESTS: Record<InvestId, { id: InvestId; label: string }> = {
  scope: { id: 'scope', label: 'Scope Lock' },
  '8of12': { id: '8of12', label: '8/12' },
  '12of12': { id: '12of12', label: '12/12' },
};

export const FRAMEWORK_IDS: FrameworkId[] = ['standard', 'standard-hc', 'anis', 'anis-hc'];
export const ELEADV_IDS: EleAdvId[] = ['neutral', 'eleweak'];
export const CORE_IDS: CoreId[] = ['c0', 'c50', 'c100'];
export const INVEST_IDS: InvestId[] = ['scope', '8of12', '12of12'];

export interface Cell {
  framework: FrameworkId;
  eleadv: EleAdvId;
  core: CoreId;
  invest: InvestId;
}

export const cellId = (c: Cell): string => `${c.framework}.${c.eleadv}.${c.core}.${c.invest}`;
export const cellLabel = (c: Cell): string =>
  `${FRAMEWORKS[c.framework].label} · ${ELEADVS[c.eleadv].label} · ${CORES[c.core].label} · ${INVESTS[c.invest].label}`;

export function parseCellId(id: string): Cell | null {
  const [framework, eleadv, core, invest] = id.split('.');
  if (!(framework in FRAMEWORKS) || !(eleadv in ELEADVS) || !(core in CORES) || !(invest in INVESTS)) {
    return null;
  }
  return { framework, eleadv, core, invest } as Cell;
}

// all 72 cells, deterministic order
export const CELLS: Cell[] = FRAMEWORK_IDS.flatMap((framework) =>
  ELEADV_IDS.flatMap((eleadv) =>
    CORE_IDS.flatMap((core) => INVEST_IDS.map((invest) => ({ framework, eleadv, core, invest }))),
  ),
);

// ---- headliners (named groups the bot can pull) ---------------------------

export interface Headliner {
  slug: string;           // stable bot handle
  name: string;           // display title
  framework: FrameworkId;
  eleadv: EleAdvId;
  invest: InvestId;
  cells: Cell[];          // the 3 core variants, in {0,50,100} order
}
const headliner = (
  slug: string, name: string, framework: FrameworkId, eleadv: EleAdvId, invest: InvestId,
): Headliner => ({
  slug, name, framework, eleadv, invest,
  cells: CORE_IDS.map((core) => ({ framework, eleadv, core, invest })),
});
export const HEADLINERS: Headliner[] = [
  headliner('standard-scope-lock', 'Standard Scope Lock', 'standard', 'neutral', 'scope'),
  headliner('hyper-carry-8-12-ele-adv', 'Hyper Carry 8/12 Elemental Advantage', 'standard-hc', 'eleweak', '8of12'),
  headliner('anis-hyper-carry-8-12-ele-adv', 'Anis Hyper Carry 8/12 Elemental Advantage', 'anis-hc', 'eleweak', '8of12'),
];

// ---- loadout per investment tier ------------------------------------------

// Cube per tier (owner-set 2026-07-14): Scope Lock stays no-cube (its measured
// validation basis); the invested tiers run the "Other" cube — L10 at 8/12, L15 at 12/12.
const TIER_CUBE: Record<InvestId, { id: string; level: number } | undefined> = {
  scope: undefined,
  '8of12': { id: 'other', level: 10 },
  '12of12': { id: 'other', level: 15 },
};

const FLOOR_LINES: LineSelection[] = [
  { type: 'elem', count: 4 },
  { type: 'atk', count: 4 },
];
// controls' filler for the last 4 lines of 12/12 (a quiet crit spread; their exact
// remainder barely moves their team buffs — only the tested unit gets the optimizer).
const CONTROL_REMAINDER: LineSelection[] = [
  { type: 'critrate', count: 2 },
  { type: 'critdmg', count: 2 },
];

// counts to seed the tested unit's 12/12 optimizer so it never exceeds 4/type
export const FLOOR_SEED_COUNTS: Record<string, number> = { elem: 4, atk: 4 };

interface TierOpts {
  cube?: { id: string; level: number };
  ol: 0 | 5;
  doll: boolean;
  lines: LineSelection[];
}
function tierLoadout(
  invest: InvestId,
  role: 'tested' | 'control',
  optimizedTestedLines?: LineSelection[],
): TierOpts {
  const cube = TIER_CUBE[invest];
  if (invest === 'scope') return { cube, ol: 0, doll: false, lines: [] };
  if (invest === '8of12') return { cube, ol: 5, doll: true, lines: [...FLOOR_LINES] };
  // 12of12
  const extra =
    role === 'tested'
      ? (optimizedTestedLines ?? []) // undefined during the provisional optimizer run
      : CONTROL_REMAINDER;
  return { cube, ol: 5, doll: true, lines: [...FLOOR_LINES, ...extra] };
}

// ---- team assembly --------------------------------------------------------

export interface AssembledTeam {
  slugs: string[];
  unitOpts: UnitOptions[];
  cfg: SimConfig;
}

export interface TestedUnit {
  slug: string;
  element: Element;
}

// Build the 4- or 5-unit control team for one cell + tested unit. Pass
// `optimizedTestedLines` (from run.ts's bestOl pass) for the 12/12 tier's tested unit;
// omit it for 8/12, scope, or the provisional optimizer run (tested gets the 8-line floor).
export function assembleTeam(
  cell: Cell,
  tested: TestedUnit,
  optimizedTestedLines?: LineSelection[],
): AssembledTeam {
  const fw = FRAMEWORKS[cell.framework];
  const controlB3 = tested.slug === HELM ? FILLER_B3 : HELM;
  const slugs = fw.mast
    ? [tested.slug, MAST, CROWN, controlB3, fw.b1]
    : [tested.slug, CROWN, controlB3, fw.b1];

  const unitOpts: UnitOptions[] = slugs.map((slug) => {
    const role = slug === tested.slug ? 'tested' : 'control';
    const t = tierLoadout(cell.invest, role, optimizedTestedLines);
    const opt: UnitOptions = {
      cube: t.cube,
      ol: t.ol,
      doll: t.doll,
      stars: 3,
      core: 7,
      lines: t.lines,
    };
    if (slug === MAST) opt.burstGate = 'syncWithFocus';
    return opt;
  });

  const cfg: SimConfig = {
    slugs,
    bossElement: cell.eleadv === 'neutral' ? null : BEATS[tested.element],
    bossDef: 0,
    level: 400,
    copies: 0, // per-unit stars/core win
    doll: false,
    ol: 0,
    coreHitRate: CORES[cell.core].rate,
    rangeBonus: true,
    durationSec: 180,
    focusSlug: tested.slug,
    // no seed → deterministic expected-value (stable chart, no Monte-Carlo noise)
  };

  return { slugs, unitOpts, cfg };
}
