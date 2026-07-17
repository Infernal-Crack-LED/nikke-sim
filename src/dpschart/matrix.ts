// DPS-chart matrix — the standardized comparison grid.
//
// Four axes (5 frameworks × 2 elements × 3 core-exposure × 3 investment = 90 cells),
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
//   Solo                 no-op B1(AR) + no-op B2(SR) + tested + no-op B3(RL) — pure
//                        isolation: zero-damage/zero-buff synthetic controls that only
//                        generate weapon-default gauge and fill burst stages. Everyone
//                        gets 7s burst CDR (no-ops 13/13/33s; a 40s tested B3 → 33s),
//                        so the tested unit and the no-op B3 alternate the stage-3 cast
//                        — the tested unit bursts every OTHER full burst.
// In the named-control frameworks the tested unit sits in slot 0 so it is the
// leftmost B3 (wins the stage-3 cast every rotation); Mast sits left of Crown so
// it is the preferred B2 when its syncWithFocus gate opens. In Solo the tested
// unit sits in slot 3 (index 2, the camera-focus slot) LEFT of the no-op B3, so
// it wins the stage-3 cast whenever its cooldown allows.
import type { Element, GearLevel, SimConfig } from '../types.js';
import type { LineSelection, UnitOptions } from '../prepare.js';
import { NOOP_B1, NOOP_B2, NOOP_B3 } from './noop.js';

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

export type FrameworkId = 'standard' | 'standard-hc' | 'anis' | 'anis-hc' | 'solo';
export type EleAdvId = 'neutral' | 'eleweak';
export type CoreId = 'c0' | 'c50' | 'c100';
export type InvestId = 'scope' | '8of12' | '12of12';

export interface Framework {
  id: FrameworkId;
  label: string;
  b1: string;         // burst-1 anchor (a no-op synthetic in the Solo framework)
  mast: boolean;      // include Mast:Romantic Maid as a sync-bursting B2
  solo?: boolean;     // synthetic no-op controls instead of named supports
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
  solo: {
    id: 'solo', label: 'Solo', b1: NOOP_B1, mast: false, solo: true,
    blurb: 'The tested carry in total isolation: three synthetic no-op units (AR B1, SR B2, RL B3) that deal zero damage and give zero buffs — they only generate weapon-default burst gauge and fill chain stages. With the framework’s 7-second burst CDR the carry bursts every other Full Burst, alternating with the no-op B3.',
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

// Solo leads (owner 2026-07-16: the isolation control is the primary B3 ranking basis).
export const FRAMEWORK_IDS: FrameworkId[] = ['solo', 'standard', 'standard-hc', 'anis', 'anis-hc'];
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

// all cells (frameworks × eleadv × core × invest), deterministic order
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
// Team-framework headliners (named-support control comps, Prydwen-style).
export const HEADLINERS: Headliner[] = [
  headliner('standard-scope-lock', 'Standard Scope Lock', 'standard', 'neutral', 'scope'),
  headliner('hyper-carry-8-12-ele-adv', 'Hyper Carry 8/12 Elemental Advantage', 'standard-hc', 'eleweak', '8of12'),
  headliner('anis-hyper-carry-8-12-ele-adv', 'Anis Hyper Carry 8/12 Elemental Advantage', 'anis-hc', 'eleweak', '8of12'),
];
// Solo-framework headliners (the isolation control across the three investment tiers;
// owner 2026-07-16). Scope Lock is neutral (its measured validation basis); the invested
// tiers assume elemental advantage. Each group is the 3 core-exposure variants (0/50/100).
export const SOLO_HEADLINERS: Headliner[] = [
  headliner('solo-scope-lock-neutral', 'Scope Lock Neutral', 'solo', 'neutral', 'scope'),
  headliner('solo-8-12-ele-adv', '8/12 Elemental Advantage', 'solo', 'eleweak', '8of12'),
  headliner('solo-12-12-ele-adv', '12/12 Elemental Advantage', 'solo', 'eleweak', '12of12'),
];
// Bot/artifact handle: every named group, both modes.
export const ALL_HEADLINERS: Headliner[] = [...SOLO_HEADLINERS, ...HEADLINERS];

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
  ol: GearLevel;
  doll: boolean;
  lines: LineSelection[];
}
function tierLoadout(
  invest: InvestId,
  role: 'tested' | 'control',
  optimizedTestedLines?: LineSelection[],
): TierOpts {
  const cube = TIER_CUBE[invest];
  if (invest === 'scope') return { cube, ol: 'base5', doll: false, lines: [] };
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
  testedIndex: number; // slot of the tested unit (0 in named-control frameworks, 2 in Solo)
}

// Solo framework: flat burst-cooldown reduction applied to EVERY unit (no-ops 20/20/40
// → 13/13/33s; the tested B3s are all 40s-cooldown → 33s). With a full-burst cycle of
// ~17-22s the tested unit (leftmost B3) is never ready two chains in a row but always
// ready by the one after — it alternates the stage-3 cast with the no-op B3, i.e.
// bursts every OTHER full burst (contract pinned in scripts/regression.ts).
export const SOLO_BURST_CDR_SEC = 7;

export interface TestedUnit {
  slug: string;
  element: Element;
}

// Per-unit chart profiles: extra UnitOptions applied to a slug WHEN it is the tested
// carry, encoding a modeling choice the plain defaults don't capture. Documented for
// players in the "Custom Profiles" disclosure on the DPS Rankings tab. Keep the two in sync.
//   bready          — run in her Distributed taste (Recommended Taste; the distributed-buff branch)
// NOTE (backend TODO): diesel-winter-sweets "bursts second / Highlight" is NOT encoded here
// yet — it needs real burst-order/Highlight modeling; see NEXT INCREMENT. It is documented in
// the Custom Profiles note only, so the chart keeps her faithful Intro numbers for now.
export const CHART_PROFILES: Record<string, Partial<UnitOptions>> = {
  bready: { mode: 'distributed' },
};

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
  // Solo: b1, b2, tested, b3 — the tested unit holds slot 3 (the camera-focus slot)
  // and is the leftmost B3. The no-ops never take the tested unit's loadout paths.
  const slugs = fw.solo
    ? [NOOP_B1, NOOP_B2, tested.slug, NOOP_B3]
    : fw.mast
      ? [tested.slug, MAST, CROWN, controlB3, fw.b1]
      : [tested.slug, CROWN, controlB3, fw.b1];
  const testedIndex = fw.solo ? 2 : 0;

  const unitOpts: UnitOptions[] = slugs.map((slug, i) => {
    const isTested = i === testedIndex;
    // no-op controls: zero damage / zero skills — loadout is inert, only the
    // framework CDR matters. Skip cubes/lines/gear entirely.
    if (fw.solo && !isTested) return { burstCdrSec: SOLO_BURST_CDR_SEC };
    const t = tierLoadout(cell.invest, isTested ? 'tested' : 'control', optimizedTestedLines);
    const opt: UnitOptions = {
      cube: t.cube,
      ol: t.ol,
      doll: t.doll,
      stars: 3,
      core: 7,
      lines: t.lines,
    };
    if (fw.solo) {
      opt.burstCdrSec = SOLO_BURST_CDR_SEC;
      // the framework contract: the tested unit bursts every OTHER full burst. The
      // cooldown arithmetic already alternates it with the no-op B3 in the common
      // case; the gate pins it against FB-extending kits (e.g. Modernia's burst
      // stretches FB to 15s, which would let the leftmost-wait rule hand her
      // consecutive stage-3 casts with an 8s rotation stall).
      opt.burstGate = 'everyOther';
    }
    if (slug === MAST) opt.burstGate = 'syncWithFocus';
    if (isTested) Object.assign(opt, CHART_PROFILES[tested.slug] ?? {});
    return opt;
  });

  const cfg: SimConfig = {
    slugs,
    bossElement: cell.eleadv === 'neutral' ? null : BEATS[tested.element],
    bossDef: 0,
    level: 400,
    copies: 0, // per-unit stars/core win
    doll: false,
    ol: cell.invest === 'scope' ? 'base5' : 5, // fallback; per-unit opt.ol wins
    coreHitRate: CORES[cell.core].rate,
    rangeBonus: true,
    durationSec: 180,
    focusSlug: tested.slug,
    // no seed → deterministic expected-value (stable chart, no Monte-Carlo noise)
  };

  return { slugs, unitOpts, cfg, testedIndex };
}
