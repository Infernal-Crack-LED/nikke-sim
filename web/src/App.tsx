import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  PointerEvent as ReactPointerEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from 'react';
import { runSim, type SimResult } from '../../src/engine/sim';
import { prepareTeam, type UnitOptions } from '../../src/prepare';
import { maxBondLevel } from '../../src/relationship';
import type { OverrideFile } from '../../src/skills/index';
import type {
  DataFile,
  Element,
  LevelMultiplier,
  SimConfig,
} from '../../src/types';
import { DpsChartTab } from './DpsChartTab';
import { navigate } from './router';
import { MatrixChart } from './components/MatrixChart';
import { PillGrid } from './components/PillGrid';
import { MatrixFilter } from './components/MatrixFilter';
import { OlBarChart } from './components/OlBarChart';
import { DpsBarChart } from './components/DpsBarChart';
import { assembleTeam, cellLabel, type Cell } from '../../src/dpschart/matrix';
import { rankFreeLineConfigs, OL_FLOOR, type OlConfigResult } from '../../src/olconfigs';
import { monteCarloBuild, type McSummary } from '../../src/overload/policy';
import type { OlKey, OlProbModel, Target, Piece, Line } from '../../src/overload/model';
import { buildModel as buildDollModel } from '../../src/doll/model';
import type { Rarity as DollRarity, ToolboxTier as DollTier } from '../../src/doll/model';
import { solveDp as dollSolveDp, monteCarlo as dollMc, calibrateWeights as dollCalibrate, costFrom as dollCostFrom } from '../../src/doll/policy';
import type { Calibration as DollCalibration, DpTable as DollDp, DollSummary } from '../../src/doll/policy';
import { copyDpsChartImage } from './shareImage';
import { TabDropdown, useMediaQuery } from './TabDropdown';
import { usePortraitThumbs } from './usePortraitThumbs';
import {
  shareTeamCard,
  shareRosterCard,
  type ShareTeamData,
  type ShareRosterData,
} from './teamShare';
import {
  encodeBuild,
  decodeBuild,
  BUILD_VERSION,
  type Build,
} from '../../src/share/build-code';
import {
  deleteTeam,
  fetchTeams,
  saveTeam,
  type AuthUser,
  type SavedTeam,
} from './auth';
import { makeCalc, type TeamResult, type MetaScoring } from '../../src/teamcalc';
import { META_WEIGHTS } from './metaWeights';
import charactersJson from '../../data/characters.json';
import cubesJson from '../../data/cubes.json';
import multJson from '../../data/level-multiplier.json';
import skillLevelsJson from '../../data/skill-levels.json';
import olLinesJson from '../../data/ol-lines.json';
import olTiersJson from '../../data/ol-tiers.json';
import olProbJson from '../../data/ol-probabilities.json';
import dollEconomyJson from '../../data/doll-economy.json';
import dollProcJson from '../../data/doll-super-success.json';

const data = charactersJson as unknown as DataFile;
const cubes = cubesJson as any;
const mult = multJson as unknown as LevelMultiplier;
// per-skill-level value tables (blablalink), keyed by slug — enables skill
// levels below 10; slugs missing here just stay at max level
const skillLevelData = skillLevelsJson as any;
const olLinesData = olLinesJson as any;
// per-tier OL substat values (from docs/ol-lines.csv)
const olTiers = (olTiersJson as any).tiers as Array<Record<string, number>>;
const olTierValues = (tier: number): Record<string, number> =>
  olTiers.find((t) => t.tier === tier) ?? olTiers.find((t) => t.tier === 11)!;

// Overload Roll Sim: the 9 line types + short labels for the card dropdowns.
const olProbModel = olProbJson as unknown as OlProbModel;

// Doll leveling model + a once-computed throughput calibration (shadow prices).
const dollModel = buildDollModel(dollEconomyJson as any, dollProcJson as any);
let _dollCal: DollCalibration | null = null;
function getDollCalibration(): DollCalibration {
  if (!_dollCal) { _dollCal = dollCalibrate(dollModel, 'SR'); dollModel.kitWeight = _dollCal.weights; }
  return _dollCal;
}
const DOLL_TIER_LABEL: Record<DollTier, string> = { R: 'Blue (R)', SR: 'Purple (SR)', SSR: 'Gold (SSR)' };
const OL_SIM_KEYS: OlKey[] = [
  'elem', 'atk', 'ammo', 'critdmg', 'critrate', 'chargedmg', 'chargespd', 'hitrate', 'def',
];
const OL_KEY_LABEL: Record<OlKey, string> = {
  elem: 'Elem DMG', atk: 'ATK', ammo: 'Max Ammo', critdmg: 'Crit DMG', critrate: 'Crit Rate',
  chargedmg: 'Charge DMG', chargespd: 'Charge Spd', hitrate: 'Hit Rate', def: 'DEF',
};
type OlSimLine = { key: OlKey | ''; tier: number };
const blankLine = (): OlSimLine => ({ key: '' as OlKey | '', tier: 11 });
const desiredDefault = (): OlSimLine[] => [
  { key: 'elem' as OlKey | '', tier: 11 },
  { key: 'atk' as OlKey | '', tier: 11 },
  blankLine(),
];
const defaultOlSimCards = (): OlSimLine[][] => [0, 1, 2, 3].map(desiredDefault);
type OlSimCurrentCard = { current: OlSimLine[]; desired: OlSimLine[] };
const defaultOlSimCurrentCards = (): OlSimCurrentCard[] =>
  [0, 1, 2, 3].map(() => ({ current: [blankLine(), blankLine(), blankLine()], desired: desiredDefault() }));

type CalcTab =
  | 'sim'
  | 'team'
  | 'roster'
  | 'rostersim'
  | 'overload'
  | 'olsim'
  | 'doll'
  | 'dps'
  | 'dpschart'
  | 'charge';
type TabGroup = 'sim' | 'tools';
const CALC_TABS: { key: CalcTab; label: string; group: TabGroup }[] = [
  { key: 'sim', label: 'Team Sim', group: 'sim' },
  { key: 'rostersim', label: 'Roster Sim', group: 'sim' },
  { key: 'dpschart', label: 'DPS Rankings', group: 'sim' },
  { key: 'dps', label: 'Custom DPS Rankings', group: 'sim' },
  { key: 'overload', label: 'Optimize Overload', group: 'sim' },
  { key: 'olsim', label: 'Overload Rolling', group: 'tools' },
  { key: 'doll', label: 'Doll Leveling', group: 'tools' },
  { key: 'charge', label: 'Charge Speed Breakpoints', group: 'tools' },
  { key: 'team', label: 'Optimal Team Generator', group: 'tools' },
  { key: 'roster', label: 'Solo-Raid Roster Generator', group: 'tools' },
];

// Which tab the current URL selects. The first path segment is authoritative
// (/dpschart, /team, …; / = Sim); a legacy `?chart=` deep link (a shared
// DPS-chart cell) still implies the DPS Chart tab; else Sim.
function tabFromLocation(): CalcTab {
  const seg = window.location.pathname.replace(/^\/+|\/+$/g, '').split('/')[0];
  if (seg && CALC_TABS.some((x) => x.key === seg)) return seg as CalcTab;
  return new URLSearchParams(window.location.search).has('chart') ? 'dpschart' : 'sim';
}

// scope-lock loadout (per-unit): no cube, no doll, Base 5 gear, 3★ / 7 core, 10/10/10.
// Applied to every unit in the DPS test so candidates compete on equal footing.
const SCOPE_LOCK_LOADOUT: UnitOptions = {
  ol: 'base5',
  doll: false,
  stars: 3,
  core: 7,
  skillLevels: { skill1: 10, skill2: 10, burst: 10 },
};

// ---- best-OL breakpoint math (pure; damage-ranked selection is backend) ----
const CHARGE_SPEED_BREAKPOINTS = [5, 8, 11, 15, 18, 21]; // %, RL/SR targets

// NIKKE max ammo = floor(base * (1 + totalAmmoPct/100))
function ammoLineRows(base: number, perLinePct: number) {
  return [1, 2, 3, 4].map((lines) => {
    const pct = lines * perLinePct;
    return { lines, pct, ammo: Math.floor(base * (1 + pct / 100)) };
  });
}
function ammoBreakpoints(base: number, perLinePct: number) {
  const maxAmmo = Math.floor(base * (1 + (4 * perLinePct) / 100));
  const out: { ammo: number; minPct: number; linesNeeded: number }[] = [];
  for (let v = base + 1; v <= maxAmmo; v++) {
    const minPct = (v / base - 1) * 100;
    const linesNeeded = Math.ceil(minPct / perLinePct - 1e-9);
    if (linesNeeded <= 4) out.push({ ammo: v, minPct, linesNeeded });
  }
  return out;
}
function chargeSpeedRows(perLinePct: number) {
  return CHARGE_SPEED_BREAKPOINTS.map((target) => {
    const linesNeeded = Math.ceil(target / perLinePct - 1e-9);
    return { target, linesNeeded, actual: linesNeeded * perLinePct };
  });
}

// ---- charge-speed FRAME breakpoints (mirrors the engine's charge math) ----
// The engine fires a charge shot once chargeProgress reaches
//   needed = max(1, round(baseFrames * (1 - cs/100)))   [cs clamped 0..100]
// (src/engine/sim.ts). Because that round() snaps to whole frames, charge speed
// only pays off in discrete jumps: a breakpoint is the least CS% that shaves one
// more frame. For a target of N frames, round(...) = N needs
//   baseFrames*(1 - cs/100) < N + 0.5   →   cs > 100*(1 - (N+0.5)/baseFrames).
// We ceil that infimum to 0.01% so the displayed value, once met, actually lands
// on N frames (the raw boundary rounds UP to N+1 — Math.round ties go up).
const FRAME_MS = 1000 / 60; // engine runs at 60 fps
function chargeFrameBreakpoints(baseFrames: number) {
  const rows: { frames: number; csNeeded: number; seconds: number; ms: number }[] = [];
  for (let n = baseFrames - 1; n >= 1; n--) {
    const infimum = 100 * (1 - (n + 0.5) / baseFrames);
    const csNeeded = Math.ceil((infimum + 1e-9) * 100) / 100; // strictly clears the boundary
    rows.push({ frames: n, csNeeded, seconds: n / 60, ms: n * FRAME_MS });
  }
  return rows;
}

// bundle the hand-verified skill overrides
const overrideModules = import.meta.glob('../../src/skills/overrides/*.json', {
  eager: true,
});
const overrides: Record<string, OverrideFile | undefined> = {};
for (const [path, mod] of Object.entries(overrideModules)) {
  const slug = path.split('/').pop()!.replace('.json', '');
  overrides[slug] = (mod as any).default ?? (mod as any);
}

const ELEMENTS: (Element | null)[] = [
  null,
  'Fire',
  'Water',
  'Wind',
  'Electric',
  'Iron',
];

// The boss's element, given the element it is weak to (i.e. the element the
// user picks). A nikke of the weakness element is elementally advantaged, which
// the engine models as BEATS[nikke.element] === bossElement — so bossElement is
// the element the chosen weakness beats.
const WEAKNESS_TO_BOSS: Record<Element, Element> = {
  Electric: 'Water',
  Iron: 'Electric',
  Wind: 'Iron',
  Fire: 'Wind',
  Water: 'Fire',
};

// Resolve the enikk meta-popularity table (web/src/metaWeights.ts) for the
// chosen boss weakness into the scoring the team/roster generators consume, so
// they bias toward what top-100 rankers actually field for THIS element. Units
// too new for ranker data fall back to their prydwen bossing-tier score. Null
// weakness (no element picked) → no meta bias (pure damage).
function metaScoringFor(weakness: Element | null): MetaScoring | undefined {
  if (!weakness) return undefined;
  const entry = META_WEIGHTS.byWeakness[weakness];
  if (!entry) return undefined;
  const fallback = new Set(META_WEIGHTS.fallbackSlugs);
  const compPop: Record<string, number> = {};
  for (const c of entry.comps) compPop[[...c.slugs].sort().join('|')] = c.pop;
  return {
    unitScore: (slug: string) =>
      fallback.has(slug) ? (META_WEIGHTS.tierPop[slug] ?? 0) : (entry.unitPop[slug] ?? 0),
    compPop,
    seedComps: entry.comps.map((c) => c.slugs),
    weight: META_WEIGHTS.weightDefault,
    comboWeight: META_WEIGHTS.comboWeight,
  };
}
const CUBE_IDS = ['resilience', 'bastion', 'other'] as const;
const CUBE_LEVELS = [7, 10, 15] as const;
const CORE_PRESETS = [
  { label: 'No Core', value: 0 },
  { label: '25%', value: 0.25 },
  { label: '50%', value: 0.5 },
  { label: '75%', value: 0.75 },
  { label: '100%', value: 1 },
] as const;

const allChars = Object.values(data.characters).sort((a, b) =>
  a.name.localeCompare(b.name),
);

// search predicate for the char pickers: slug, name, or an APPROVED community
// nickname (characters.json `nicknames`, sync-derived from bakery-bot aliases)
const charMatchesQuery = (c: (typeof allChars)[number], q: string) =>
  c.slug.includes(q) ||
  c.name.toLowerCase().includes(q) ||
  (c.nicknames ?? []).some((n) => n.includes(q));

// At-a-glance 64×64 portrait strip for a generated team (tight grouping). Shared
// by the Optimal Team result and, later, the Roster generator — keep it prop-only
// (no App state) so both can reuse it. `adv` flags the elementally-advantaged
// slots with a small corner marker.
// A row of the team's 5 portraits. Each portrait is content-aware between 32 and
// 64px (grid minmax); they stay 5-across and shrink to fit until 32px no longer
// fits the container, at which point they snap to a 3:2 split held at 32px (CSS
// `.cols-5` / `.cols-3`). The break is measured off the real container width.
function TeamPortraits({
  slugs,
  advantaged,
}: {
  slugs: string[];
  advantaged?: Set<string>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(5);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const GAP = 4, MIN = 32, N = slugs.length; // fits N-across at the 32px floor?
    const compute = () => setCols(el.clientWidth >= N * MIN + (N - 1) * GAP ? 5 : 3);
    compute();
    if (typeof ResizeObserver === 'undefined') return; // jsdom / SSR
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [slugs.length]);
  // crisp, pre-downscaled + PORTRAIT_CROP_TOP-cropped thumbnails (max chip = 64px)
  const thumbs = usePortraitThumbs(slugs.map((s) => data.characters[s]?.imageUrl), 64);
  return (
    <div ref={ref} className={`team-portraits cols-${cols}`}>
      {slugs.map((slug, i) => {
        const c = data.characters[slug];
        const adv = advantaged?.has(slug);
        return (
          <div
            key={`${slug}-${i}`}
            className={`tp-chip${adv ? ' adv' : ''}`}
            title={c?.name ?? slug}
          >
            {c?.imageUrl ? (
              <img src={thumbs[c.imageUrl] ?? c.imageUrl} alt={c?.name ?? slug} loading='lazy' />
            ) : (
              <span className='tp-init'>{(c?.name?.[0] ?? '?').toUpperCase()}</span>
            )}
            {adv && <span className='tp-adv' title='elemental advantage'>▲</span>}
          </div>
        );
      })}
    </div>
  );
}

// advantaged-slug set for a generated team (used by the portrait strips/grids)
const advSet = (t: TeamResult) =>
  new Set(t.units.filter((u) => u.advantaged).map((u) => u.slug));

// split into rows of n (for centering a partial last row)
function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

// Charge weapons in the roster, so the Charge Speed picker only offers RL/SR
// units that actually have a charge phase.
const CHARGE_CHARS = allChars.filter(
  (c) => (c.weapon === 'RL' || c.weapon === 'SR') && c.chargeFrames > 0,
);

// 'none' = no cube equipped at all (no flat ATK, no elemental damage, no effect);
// distinct from the 'other' cube, which still grants base stats + elemental damage.
type CubeChoice = (typeof CUBE_IDS)[number] | 'none';

interface SlotState {
  slug: string | null;
  cubeId: CubeChoice;
  cubeLevel: number;
  cubeCustom: boolean;
  ol: 'base5' | 0 | 5; // gear level; 'base5' = scope-lock base gear
  doll: boolean;
  lambdaStage: 0 | 1 | 2 | 3; // Λ units only; 0 = auto (any stage)
  stars: number; // Limit Break stars / grade 0-3
  core: number; // Core enhancement 0-7
  dupeCustom: boolean; // show the granular star/core buttons instead of presets
  mode?: string; // kit mode for mode-switch units (undefined = default)
  mpPriority?: boolean; // stackedNuke units: jump the burst queue at max MP
  skill1: number; // skill-1 level 1-10
  skill2: number; // skill-2 level 1-10
  burst: number; // burst-skill level 1-10
  olElem: string; // total Elemental Damage % from OL lines (textbox)
  olAtk: string; // total ATK % from OL lines (textbox)
  olExtra: { type: string; value: string }[]; // additional OL lines
  relationshipLevel: string; // bond level (textbox); blank = the manufacturer's max
}

const STAR_LEVELS = [0, 1, 2, 3] as const;
const CORE_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7] as const;
const SKILL_LEVELS = [4, 7, 10] as const; // common breakpoints
// common dupe presets; "…" expands to the granular star/core buttons
const DUPE_PRESETS = [
  { label: '0', stars: 0, core: 0 },
  { label: 'MLB', stars: 3, core: 0 },
  { label: 'Core 7', stars: 3, core: 7 },
] as const;

// OL line types the user can add (keys match data/ol-lines.json)
const OL_LINE_TYPES = [
  { key: 'ammo', label: 'Max Ammo' },
  { key: 'chargedmg', label: 'Charge DMG' },
  { key: 'chargespd', label: 'Charge Speed' },
  { key: 'critrate', label: 'Crit Rate' },
  { key: 'critdmg', label: 'Crit DMG' },
  { key: 'elem', label: 'Elemental DMG' },
  { key: 'atk', label: 'ATK' },
  { key: 'hitrate', label: 'Hit Rate' },
  { key: 'def', label: 'DEF' },
] as const;
const OL_STAT_BY_TYPE: Record<string, string> = {
  elem: 'elementDamagePct',
  atk: 'atkPct',
  ammo: 'maxAmmoPct',
  chargedmg: 'chargeDamagePct',
  chargespd: 'chargeSpeedPct',
  critrate: 'critRatePct',
  critdmg: 'critDamagePct',
  hitrate: 'hitRatePct',
  def: 'defPct',
};

// turn a slot's manual OL entries into engine LineSelection[] (count 1 per
// entry; the textbox value is the total % for that stat). the sim resolves
// `type` against data/ol-lines.json and adds `value * count` to the stat.
function buildOlLines(
  s: SlotState,
): { type: string; count: number; value: number }[] {
  const out: { type: string; count: number; value: number }[] = [];
  const push = (type: string, raw: string) => {
    const v = Number(raw);
    if (Number.isFinite(v) && v > 0) out.push({ type, count: 1, value: v });
  };
  push('elem', s.olElem);
  push('atk', s.olAtk);
  for (const line of s.olExtra) if (line.type) push(line.type, line.value);
  return out;
}

// SlotState (the per-character card's state) → engine UnitOptions. Shared by the
// Sim tab and the DPS test's variable units.
function slotToUnitOptions(s: SlotState): UnitOptions {
  // bond level: parse the textbox → clamp to [0, manufacturer max]. Blank / NaN →
  // undefined so the engine falls back to the manufacturer max (scope-lock basis).
  const maxBond = maxBondLevel(s.slug ? data.characters[s.slug].manufacturer : null);
  const bondRaw = s.relationshipLevel.trim();
  const bondNum = bondRaw === '' ? NaN : Number(bondRaw);
  const relationshipLevel = Number.isFinite(bondNum)
    ? Math.max(0, Math.min(Math.round(bondNum), maxBond))
    : undefined;
  return {
    relationshipLevel,
    cube:
      s.cubeId === 'none'
        ? undefined
        : { id: s.cubeId, level: Math.min(15, Math.max(1, s.cubeLevel || 15)) },
    ol: s.ol,
    doll: s.doll,
    stars: Math.min(3, Math.max(0, s.stars)),
    core: Math.min(7, Math.max(0, s.core)),
    lambdaStage:
      s.lambdaStage && s.slug && data.characters[s.slug].burst === 'Λ'
        ? s.lambdaStage
        : undefined,
    mode: s.mode,
    mpPriority: s.mpPriority,
    skillLevels: { skill1: s.skill1, skill2: s.skill2, burst: s.burst },
    lines: buildOlLines(s),
  };
}

const defaultSlot = (slug: string | null): SlotState => ({
  slug,
  cubeId: 'resilience',
  cubeLevel: 15,
  cubeCustom: false,
  ol: 0,
  doll: true,
  lambdaStage: 0,
  stars: 3,
  core: 0,
  dupeCustom: false,
  skill1: 10,
  skill2: 10,
  burst: 10,
  olElem: '',
  olAtk: '',
  olExtra: [],
  // show the unit's manufacturer max by default; blank for an empty slot
  relationshipLevel: slug
    ? String(maxBondLevel(data.characters[slug].manufacturer))
    : '',
});

// remember the last team + loadout across refreshes
const TEAM_STORAGE_KEY = 'nikke-sim.team.v1';

const emptyTeam = (): SlotState[] =>
  Array.from({ length: 5 }, () => defaultSlot(null));

function loadStoredTeam(): SlotState[] | null {
  try {
    const raw = localStorage.getItem(TEAM_STORAGE_KEY);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr) || arr.length !== 5) return null;
    // merge over defaults so slots saved before a schema change still load,
    // and drop any slug no longer present in the data
    return arr.map((s) => {
      const slug =
        s && typeof s.slug === 'string' && data.characters[s.slug]
          ? s.slug
          : null;
      // base on defaultSlot(slug) so teams saved before relationshipLevel existed
      // pick up the unit's manufacturer max instead of a blank field
      return { ...defaultSlot(slug), ...s, slug };
    });
  } catch {
    return null;
  }
}

const ELEMENT_SET = new Set(['Fire', 'Water', 'Wind', 'Electric', 'Iron']);
const coerceWeakness = (w: unknown): Element | null =>
  typeof w === 'string' && ELEMENT_SET.has(w) ? (w as Element) : null;

// one slot of a decoded build → a full SlotState (merge over defaults, drop a
// slug that's no longer in the data, reset UI-only expansion flags)
function slotFromBuild(sb: any): SlotState {
  const slug =
    sb && typeof sb.slug === 'string' && data.characters[sb.slug]
      ? sb.slug
      : null;
  return {
    ...defaultSlot(slug),
    ...sb,
    slug,
    cubeCustom: false,
    dupeCustom: false,
    olElem: typeof sb?.olElem === 'string' ? sb.olElem : '',
    olAtk: typeof sb?.olAtk === 'string' ? sb.olAtk : '',
    olExtra: Array.isArray(sb?.olExtra) ? sb.olExtra : [],
  };
}

// full build from the ?b= param, if present and valid
function bootBuild(): Build | null {
  const b = new URLSearchParams(window.location.search).get('b');
  return b ? decodeBuild(b) : null;
}

const fmt = (n: number) =>
  n >= 1e9
    ? `${(n / 1e9).toFixed(2)}B`
    : n >= 1e6
      ? `${(n / 1e6).toFixed(2)}M`
      : n >= 1e3
        ? `${(n / 1e3).toFixed(1)}K`
        : n.toFixed(0);

// ---- team-buff summary (built from the prepared skill blocks) -------------
const STAT_LABELS: Record<string, string> = {
  atkPct: 'ATK ▲',
  casterAtkPct: 'ATK ▲ (of caster ATK)',
  critRatePct: 'Crit Rate ▲',
  critDamagePct: 'Crit DMG ▲',
  coreDamagePct: 'Core DMG ▲',
  elementDamagePct: 'Elemental DMG ▲',
  chargeDamagePct: 'Charge DMG ▲',
  chargeSpeedPct: 'Charge Speed ▲',
  attackDamagePct: 'Attack DMG ▲',
  sustainedDamagePct: 'Sustained DMG ▲',
  partsDamagePct: 'Parts DMG ▲',
  pierceDamagePct: 'Pierce DMG ▲',
  damageTakenPct: 'DMG Taken ▲',
  maxAmmoPct: 'Max Ammo ▲',
  reloadSpeedPct: 'Reload Speed ▲',
  attackSpeedPct: 'Attack Speed ▲',
  fireRatePct: 'Fire Rate ▲',
  extraHitDamagePct: 'Extra Hit DMG',
  trueDamagePct: 'True DMG ▲',
  projectileExplosionPct: 'Proj. Explosion DMG ▲',
  elemAdvantageDamagePct: 'Elem. Advantage DMG ▲',
  distributedDamagePct: 'Distributed DMG ▲',
  projectileAttachmentPct: 'Proj. Attachment DMG ▲',
  normalAttackPct: 'Normal Attack ▲',
  burstGenPct: 'Burst Gen ▲',
  hitRatePct: 'Hit Rate ▲',
  defPct: 'DEF ▲',
};

function targetLabel(t: any): string {
  switch (t?.kind) {
    case 'self': return 'self';
    case 'allies': return 'all allies';
    case 'enemy': return 'boss';
    case 'burstCasters': return 'burst casters';
    case 'nonBurstCasters': return 'non-burst casters';
    case 'alliesTopAtk': return `top ${t.count} ATK allies`;
    case 'alliesOfElement': return `${t.element} allies`;
    case 'alliesOfClass': return `${t.cls} allies`;
    default: return 'allies';
  }
}

function triggerLabel(tr: any): string {
  switch (tr?.kind) {
    case 'passive': return 'always';
    case 'burstCast': return tr.stage ? `on burst ${tr.stage}` : 'on burst';
    case 'fullBurstEnter': return 'full burst';
    case 'fullBurstEnd': return 'full burst end';
    case 'hitCount': return `every ${tr.count} hits`;
    case 'shotFired': return 'per shot';
    case 'lastBullet': return 'last bullet';
    case 'stageEnter': return `stage ${tr.stage} burst`;
    case 'bossElement': return `boss is ${tr.element}`;
    default: return 'conditional';
  }
}

// pull every buff effect out of a block's effects (flattening escalating steps)
function collectBuffs(effects: any[]): any[] {
  const out: any[] = [];
  for (const e of effects ?? []) {
    if (e?.kind === 'buff') out.push(e);
    else if (e?.kind === 'escalating') out.push(...collectBuffs(e.steps));
  }
  return out;
}

function buffLines(blocks: any[]): string[] {
  const lines: string[] = [];
  for (const block of blocks ?? []) {
    for (const e of collectBuffs(block.effects)) {
      const stat = STAT_LABELS[e.stat] ?? e.stat;
      const dur = e.durationSec ? ` · ${e.durationSec}s` : '';
      const stacks = e.maxStacks && e.maxStacks > 1 ? ` ×${e.maxStacks}` : '';
      lines.push(
        `${stat} ${e.value}%${stacks} → ${targetLabel(block.target)}${dur} (${triggerLabel(block.trigger)})`,
      );
    }
  }
  return lines;
}

// react to a media query (used to switch the team into compact/portrait mode)

// pointer-based drag-to-reorder that works for both mouse and touch. items
// register their DOM node by index; the drag element (a handle, or the item
// itself) gets handleProps. A press that moves past a small threshold becomes a
// drag (live-reordering via onMove by nearest item centre); a press that never
// crosses it is treated as a tap (onTap) — lets one chip both expand and drag.
function useDragReorder(
  onMove: (from: number, to: number) => void,
  onTap?: (i: number) => void,
) {
  const items = useRef(new Map<number, HTMLElement>());
  const drag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    index: number;
    moved: boolean;
  } | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const register = (i: number) => (el: HTMLElement | null) => {
    if (el) items.current.set(i, el);
    else items.current.delete(i);
  };

  // index of the item whose centre is nearest the pointer (2D, so it works for
  // a horizontal strip, a single row, or a wrapped grid alike)
  const nearest = (x: number, y: number): number => {
    let best = -1;
    let bestDist = Infinity;
    items.current.forEach((el, idx) => {
      const r = el.getBoundingClientRect();
      const dx = r.left + r.width / 2 - x;
      const dy = r.top + r.height / 2 - y;
      const d = dx * dx + dy * dy;
      if (d < bestDist) {
        bestDist = d;
        best = idx;
      }
    });
    return best;
  };

  // onItemTap overrides the shared onTap for this initiator (e.g. a card's image
  // focuses that card's picker on tap, but reorders on drag)
  const handleProps = (
    i: number,
    onItemTap?: (i: number, e: ReactPointerEvent) => void,
  ) => ({
    onPointerDown: (e: ReactPointerEvent) => {
      if (e.button && e.button !== 0) return;
      drag.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        index: i,
        moved: false,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: ReactPointerEvent) => {
      const st = drag.current;
      if (!st || e.pointerId !== st.pointerId) return;
      if (!st.moved) {
        const dx = e.clientX - st.startX;
        const dy = e.clientY - st.startY;
        if (dx * dx + dy * dy < 36) return; // ~6px threshold before it's a drag
        st.moved = true;
        setDragIndex(st.index);
      }
      const target = nearest(e.clientX, e.clientY);
      if (target >= 0 && target !== st.index) {
        onMove(st.index, target);
        st.index = target;
        setDragIndex(target);
      }
    },
    onPointerUp: (e: ReactPointerEvent) => {
      const st = drag.current;
      if (!st || e.pointerId !== st.pointerId) return;
      if (!st.moved) {
        if (onItemTap) onItemTap(st.index, e);
        else if (onTap) onTap(st.index);
      }
      drag.current = null;
      setDragIndex(null);
    },
    onPointerCancel: () => {
      drag.current = null;
      setDragIndex(null);
    },
  });

  return { register, handleProps, dragIndex };
}

// where an expanded-card index lands after a reorder from→to (so the open card
// in compact mode keeps following the same slot)
function remapIndex(e: number, from: number, to: number): number {
  if (e === from) return to;
  if (from < e && to >= e) return e - 1;
  if (from > e && to <= e) return e + 1;
  return e;
}

function CharPicker({
  slot,
  onPick,
}: {
  slot: SlotState;
  onPick: (slug: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const selected = slot.slug ? data.characters[slot.slug] : null;
  const q = query.toLowerCase();
  const matches = q
    ? allChars
        .filter((c) => charMatchesQuery(c, q))
        .slice(0, 12)
    : allChars.slice(0, 12);
  return (
    <div className='picker'>
      <input
        value={open ? query : (selected?.name ?? '')}
        placeholder='search nikke…'
        onFocus={() => {
          setOpen(true);
          setQuery('');
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => setQuery(e.target.value)}
      />
      {open && (
        <div className='picker-list'>
          {matches.map((c) => (
            <button
              key={c.slug}
              onMouseDown={() => {
                onPick(c.slug);
                setOpen(false);
              }}
            >
              {c.imageUrl && <img src={c.imageUrl} alt='' loading='lazy' />}
              <span>{c.name}</span>
              <span className='muted'>
                B{c.burst} · {c.weapon} · {c.element}
              </span>
            </button>
          ))}
          {!matches.length && <div className='muted pad'>no matches</div>}
        </div>
      )}
    </div>
  );
}

// search box that adds a nikke on pick (for blocked list / single-char picks);
// clears after each pick and hides anything already excluded
function CharSearch({
  placeholder,
  exclude,
  onPick,
}: {
  placeholder: string;
  exclude: string[];
  onPick: (slug: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const q = query.toLowerCase();
  const matches = allChars
    .filter((c) => !exclude.includes(c.slug))
    .filter(
      (c) => !q || charMatchesQuery(c, q),
    )
    .slice(0, 12);
  return (
    <div className='picker'>
      <input
        value={query}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => setQuery(e.target.value)}
      />
      {open && (
        <div className='picker-list'>
          {matches.map((c) => (
            <button
              key={c.slug}
              onMouseDown={() => {
                onPick(c.slug);
                setQuery('');
              }}
            >
              {c.imageUrl && <img src={c.imageUrl} alt='' loading='lazy' />}
              <span>{c.name}</span>
              <span className='muted'>
                B{c.burst} · {c.weapon} · {c.element}
              </span>
            </button>
          ))}
          {!matches.length && <div className='muted pad'>no matches</div>}
        </div>
      )}
    </div>
  );
}

export function App({ user }: { user: AuthUser | null }) {
  // a full ?b= build (team + loadout + globals) prefills everything and wins
  // over ?team= / localStorage; computed once on mount
  const boot = useMemo(bootBuild, []);
  const [slots, setSlots] = useState<SlotState[]>(() => {
    if (boot) return boot.s.map(slotFromBuild);
    // shareable prefill: ?team=liter,crown,naga,modernia,alice
    const param = new URLSearchParams(window.location.search).get('team');
    if (param) {
      const team = param
        .split(',')
        .map((s) => (data.characters[s.trim()] ? s.trim() : null));
      return Array.from({ length: 5 }, (_, i) => defaultSlot(team[i] ?? null));
    }
    // otherwise restore the last team from a previous session
    return loadStoredTeam() ?? emptyTeam();
  });
  const [weakness, setWeakness] = useState<Element | null>(
    boot ? coerceWeakness(boot.g.weakness) : null,
  );
  const [bossDef, setBossDef] = useState(boot?.g.bossDef ?? '0');
  const [core, setCore] = useState<number>(boot?.g.core ?? 0);
  const [coreCustom, setCoreCustom] = useState(boot?.g.coreCustom ?? false);
  const [coreCustomVal, setCoreCustomVal] = useState(
    boot?.g.coreCustomVal ?? '10',
  );
  const [level, setLevel] = useState(boot?.g.level ?? '400');
  const [showRotation, setShowRotation] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showBuffs, setShowBuffs] = useState(false);
  const [shared, setShared] = useState(false);
  const [imaged, setImaged] = useState(false);
  const [showOlCalc, setShowOlCalc] = useState(false);
  const [olTier, setOlTier] = useState(11); // best-OL calc tier (default 11)
  const [tab, setTab] = useState<CalcTab>(() => tabFromLocation());
  // Switch tab AND reflect it in the URL path (/dpschart, …) so the view is
  // hyperlinkable and the server can serve tab-specific embed metadata. Uses the
  // same path-based navigate() as the top-level pages (one routing strategy app
  // wide); existing query deep-links (team/chart/cmp/b) are preserved; Sim uses
  // the bare path "/".
  const selectTab = (key: CalcTab) => {
    setTab(key);
    const u = new URL(window.location.href);
    u.pathname = key === 'sim' ? '/' : `/${key}`;
    navigate(u.pathname + u.search + u.hash);
  };
  // Keep the tab in sync when the user navigates back/forward.
  useEffect(() => {
    const onPop = () => setTab(tabFromLocation());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const [blocked, setBlocked] = useState<string[]>(
    boot?.blocked?.filter((s) => data.characters[s]) ?? [],
  ); // don't-own / excluded
  // Charge Speed tab: chosen unit (null = the generic 1s / 60-frame reference)
  // and whether to list the deep, hard-to-reach breakpoints.
  const [chargeChar, setChargeChar] = useState<string | null>(null);
  const [chargeShowAll, setChargeShowAll] = useState(false);
  const [calcBusy, setCalcBusy] = useState(false);
  const [teamResult, setTeamResult] = useState<TeamResult | null>(null);
  const [rosterResults, setRosterResults] = useState<TeamResult[] | null>(null);
  // Roster Sim: 5 teams × 5 slugs (shared loadout), the active slot being picked,
  // and the sim output (reuses rosterView).
  const [rosterSim, setRosterSim] = useState<(string | null)[][]>(() =>
    Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => null)),
  );
  const [rosterActive, setRosterActive] = useState<[number, number] | null>(null);
  const [rosterSimResults, setRosterSimResults] = useState<TeamResult[] | null>(null);
  // Overload Calc: rank one carry's four free OL lines. Matrix mode auto-builds
  // the 8/12 control team from a matrix cell; custom mode pins one carry and pits
  // it against several hand-built support teams (one chart each).
  const [olMode, setOlMode] = useState<'matrix' | 'custom'>('matrix');
  // Overload Roll Sim: 4 cards (one per OL piece), each up to 3 target lines
  // (stat + tier). Reports the reroll/value-reset cost to hit them.
  const [olSimSub, setOlSimSub] = useState<'calc' | 'current' | 'faq'>('calc');
  const [olSimCards, setOlSimCards] = useState<OlSimLine[][]>(defaultOlSimCards);
  const [olSimLockMode, setOlSimLockMode] = useState<'permanent' | 'temp'>('permanent');
  const [olSimResult, setOlSimResult] = useState<{ perPiece: McSummary[]; total: McSummary } | null>(null);
  const [olSimCurrent, setOlSimCurrent] = useState<OlSimCurrentCard[]>(defaultOlSimCurrentCards);
  const [olSimCurrentResult, setOlSimCurrentResult] = useState<{ perPiece: McSummary[]; total: McSummary } | null>(null);
  // Doll leveling tab
  const [dollSub, setDollSub] = useState<'calc' | 'current' | 'faq'>('calc');
  const [dollRarity, setDollRarity] = useState<DollRarity>('SR');
  const [dollFrom, setDollFrom] = useState(0);
  const [dollResult, setDollResult] = useState<{ cal: DollCalibration; dp: DollDp; mc: DollSummary; rarity: DollRarity; from: number } | null>(null);
  const [dollCurRarity, setDollCurRarity] = useState<DollRarity>('SR');
  const [dollCurPhase, setDollCurPhase] = useState(8);
  const [dollCurResult, setDollCurResult] = useState<{ dp: DollDp; mc: DollSummary; rarity: DollRarity; from: number } | null>(null);
  const [dollCal, setDollCal] = useState<DollCalibration | null>(null);
  const [olCell, setOlCell] = useState<Cell>({
    framework: 'standard',
    eleadv: 'neutral',
    core: 'c100',
    invest: '8of12', // pinned — the investment axis is hidden on this tab
  });
  const [olCarry, setOlCarry] = useState<string | null>(null);
  const [olMatrixResult, setOlMatrixResult] = useState<{
    carrySlug: string;
    baseline: number;
    results: OlConfigResult[];
  } | null>(null);
  const [olCustomCarry, setOlCustomCarry] = useState<string | null>(null);
  const [olSupportTeams, setOlSupportTeams] = useState<string[][]>([[]]);
  const [olCustomResults, setOlCustomResults] = useState<
    { teamSlugs: string[]; baseline: number; results: OlConfigResult[] }[] | null
  >(null);
  // DPS test: a scope-locked control group (3 or 4) + variable groups that fill
  // the rest (2 or 1). Each complete group forms a variant team we sim.
  const [dpsControl, setDpsControl] = useState<string[]>([]);
  // custom control-group tool vs the standardized DPS-chart matrix
  const [dpsMode, setDpsMode] = useState<'custom' | 'matrix'>('custom');
  // each variable group holds full per-character SlotStates (configurable cards)
  const [dpsGroups, setDpsGroups] = useState<SlotState[][]>([]);
  const [dpsResults, setDpsResults] = useState<
    | {
        group: string[];
        teamDamage: number;
        teamDps: number;
        fullBurstUptime: number;
        varDamage: number;
        varShare: number;
        varUnits: { slug: string; name: string; totalDamage: number; share: number }[];
      }[]
    | null
  >(null);

  const setSlot = (i: number, patch: Partial<SlotState>) =>
    setSlots((s) =>
      s.map((slot, j) => (j === i ? { ...slot, ...patch } : slot)),
    );

  // compact/portrait team UI: a 5-across portrait strip + one expanded card.
  // Kicks in at the first width where the 5-across card row would otherwise
  // reflow to a second row; above it all five cards show side by side.
  const compactTeam = useMediaQuery('(max-width: 900px)');
  const mobileNav = useMediaQuery('(max-width: 640px)'); // tabs → focused dropdown
  const [expandedSlot, setExpandedSlot] = useState(0);

  // reorder a team slot (drives the sim: position sets camera focus / burst
  // order), keeping the expanded card pointed at the same slot it followed.
  const moveSlot = (from: number, to: number) => {
    if (from === to) return;
    setSlots((s) => {
      const a = [...s];
      const [m] = a.splice(from, 1);
      a.splice(to, 0, m);
      return a;
    });
    setExpandedSlot((e) => remapIndex(e, from, to));
  };
  const teamReorder = useDragReorder(moveSlot, (i) =>
    setExpandedSlot((e) => (e === i ? -1 : i)),
  );

  // bulk-apply a loadout choice at once. On the DPS tab it targets the variable
  // group nikkes (the control stays scope-locked); elsewhere it targets the slots.
  const setAll = (patch: Partial<SlotState>) => {
    if (tab === 'dps') {
      setDpsGroups((gs) => gs.map((g) => g.map((u) => ({ ...u, ...patch }))));
    } else {
      setSlots((s) => s.map((slot) => ({ ...slot, ...patch })));
    }
  };

  // whether every target already matches — drives the "on" look on bulk buttons
  const allHave = (pred: (s: SlotState) => boolean) => {
    if (tab === 'dps') {
      const units = dpsGroups.flat();
      return units.length > 0 && units.every(pred);
    }
    return slots.every(pred);
  };

  // "scope lock" preset: no cubes, no doll, Base 5 gear, 3★/7 core, 400 synchro
  const applyScopeLock = () => {
    // relationshipLevel '' → engine uses each unit's manufacturer max (scope-lock basis)
    setAll({ cubeId: 'none', doll: false, ol: 'base5', stars: 3, core: 7, relationshipLevel: '' });
    setLevel('400');
  };

  // ---- build code (full team + loadout + globals) ----
  const buildFromState = (): Build => ({
    v: BUILD_VERSION,
    g: { weakness, bossDef, core, coreCustom, coreCustomVal, level },
    blocked: blocked.length ? blocked : undefined,
    s: slots.map((s) => ({
      slug: s.slug,
      cubeId: s.cubeId,
      cubeLevel: s.cubeLevel,
      ol: s.ol,
      doll: s.doll,
      stars: s.stars,
      core: s.core,
      skill1: s.skill1,
      skill2: s.skill2,
      burst: s.burst,
      lambdaStage: s.lambdaStage,
      mode: s.mode,
      mpPriority: s.mpPriority,
      olElem: s.olElem,
      olAtk: s.olAtk,
      olExtra: s.olExtra,
    })),
  });
  const applyBuild = (b: Build) => {
    setSlots(b.s.map(slotFromBuild));
    setWeakness(coerceWeakness(b.g.weakness));
    setBossDef(b.g.bossDef ?? '0');
    setCore(typeof b.g.core === 'number' ? b.g.core : 0);
    setCoreCustom(!!b.g.coreCustom);
    setCoreCustomVal(b.g.coreCustomVal ?? '10');
    setLevel(b.g.level ?? '400');
    setBlocked(Array.isArray(b.blocked) ? b.blocked.filter((s) => data.characters[s]) : []);
  };

  // ---- saved teams (Discord auth + login/logout live in the shared header;
  // `user` is passed in as a prop) ----
  const [teams, setTeams] = useState<SavedTeam[]>([]);
  const [showTeams, setShowTeams] = useState(false);
  const [authErr, setAuthErr] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  // when the header logs out (user → null), drop any loaded teams + close modal
  useEffect(() => {
    if (!user) {
      setTeams([]);
      setShowTeams(false);
    }
  }, [user]);

  const refreshTeams = () =>
    fetchTeams()
      .then(setTeams)
      .catch((e) => setAuthErr((e as Error).message ?? String(e)));
  const openTeams = () => {
    setShowTeams(true);
    setAuthErr(null);
    refreshTeams();
  };
  const suggestedName = () => {
    const names = slots
      .map((s) => (s.slug ? data.characters[s.slug].name : null))
      .filter(Boolean) as string[];
    return names.slice(0, 2).join(' / ') || 'My team';
  };
  const onSaveTeam = async () => {
    const name = window.prompt('Save team as:', suggestedName());
    if (!name?.trim()) return;
    try {
      await saveTeam(name.trim(), encodeBuild(buildFromState()));
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
      if (showTeams) refreshTeams();
    } catch (e) {
      window.alert(`Save failed: ${(e as Error).message ?? e}`);
    }
  };
  // Save a Roster Sim roster (25 units + shared loadout + boss options) to the same
  // saved-teams store, tagged by the `roster` field in the build code.
  const onSaveRoster = async () => {
    const first = rosterSim.flat().find(Boolean);
    const def = first ? `${data.characters[first]?.name ?? first} roster` : 'My roster';
    const name = window.prompt('Save roster as:', def);
    if (!name?.trim()) return;
    try {
      await saveTeam(name.trim(), encodeBuild({ ...buildFromState(), roster: rosterSim }));
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
      if (showTeams) refreshTeams();
    } catch (e) {
      window.alert(`Save failed: ${(e as Error).message ?? e}`);
    }
  };
  const onLoadTeam = (t: SavedTeam) => {
    const b = decodeBuild(t.code);
    if (!b) {
      window.alert('This saved team is in an unrecognized format.');
      return;
    }
    applyBuild(b); // restores globals + the shared loadout (slot 1)
    setShowTeams(false);
    if (b.roster) {
      setRosterSim(normalizeRoster(b.roster));
      setRosterSimResults(null);
      setRosterActive(null);
      selectTab('rostersim');
    }
  };
  const onDeleteTeam = async (t: SavedTeam) => {
    if (!window.confirm(`Delete "${t.name}"?`)) return;
    try {
      await deleteTeam(t.id);
      setTeams((ts) => ts.filter((x) => x.id !== t.id));
    } catch (e) {
      window.alert(`Delete failed: ${(e as Error).message ?? e}`);
    }
  };

  // build a shareable link that prefills the team via the ?team= param.
  // positions are preserved (empty slots become empty entries).
  const buildShareUrl = () => {
    const team = slots.map((s) => s.slug ?? '').join(',');
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('team', team);
    return url.toString();
  };

  const onShare = async () => {
    const url = buildShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 1500);
    } catch {
      // clipboard blocked (insecure context / permissions) — show the link
      window.prompt('Copy this team link:', url);
    }
  };

  // persist the team + loadout so it survives a refresh
  useEffect(() => {
    try {
      localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(slots));
    } catch {
      /* storage unavailable (private mode / quota) — skip persistence */
    }
  }, [slots]);

  const sim = useMemo((): {
    result?: SimResult;
    error?: string;
    compWarning?: string;
    teamBuffs?: { name: string; position: number; lines: string[] }[];
  } => {
    if (slots.some((s) => !s.slug))
      return { error: 'pick 5 nikkes to run the sim' };
    const chars = slots.map((s) => data.characters[s.slug!]);
    const counts: Record<string, number> = { I: 0, II: 0, III: 0, Λ: 0 };
    chars.forEach((c) => counts[c.burst]++);
    const compOk =
      (counts.I >= 1 && counts.II >= 1 && counts.III >= 2) || counts['Λ'] > 0;
    const coreRate = coreCustom
      ? Math.min(1, Math.max(0, Number(coreCustomVal) / 100 || 0))
      : core;
    const cfg: SimConfig = {
      slugs: slots.map((s) => s.slug!),
      bossElement: weakness ? WEAKNESS_TO_BOSS[weakness] : null,
      bossDef: Number(bossDef) || 0,
      level: Math.min(1200, Math.max(1, Number(level) || 400)),
      copies: 0, // dupes are per-unit now (stars + core); this global fallback is unused
      doll: false,
      ol: 0,
      coreHitRate: coreRate,
      rangeBonus: true,
      durationSec: 180,
    };
    const unitOpts: UnitOptions[] = slots.map(slotToUnitOptions);
    try {
      const prepared = prepareTeam(chars, unitOpts, {
        overrides,
        skillLevels: skillLevelData,
        cubes,
        olLines: olLinesData,
      });
      const result = runSim(chars as any, mult, cfg, prepared);
      const teamBuffs = result.units.map((u, i) => ({
        name: u.name,
        position: u.position,
        lines: buffLines(prepared[i].skills.blocks),
      }));
      return {
        result,
        teamBuffs,
        compWarning: compOk
          ? undefined
          : `composition is ${counts.I}×BI ${counts.II}×BII ${counts.III}×BIII ${counts['Λ']}×BΛ — expected 1×BI, 1×BII, 2×BIII + flex; rotation may stall`,
      };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [slots, weakness, bossDef, core, coreCustom, coreCustomVal, level]);

  const r = sim.result;

  const coreLabel = () =>
    coreCustom ? `${coreCustomVal}% core` : `${Math.round(core * 100)}% core`;

  // Meta (boss weakness / synchro / core) shared by every share card on the page.
  const shareMeta = () => ({
    weakness,
    level: Math.min(1200, Math.max(1, Number(level) || 400)),
    coreLabel: coreLabel(),
  });
  const imageUrlFor = (slug: string) => data.characters[slug]?.imageUrl ?? undefined;

  const flashImaged = () => {
    setImaged(true);
    setTimeout(() => setImaged(false), 1500);
  };

  // Share the Optimal Team result card (real portraits) via the shared pipeline.
  const shareTeam = async (t: TeamResult) => {
    const share: ShareTeamData = {
      teamDamage: t.teamDamage,
      teamDps: t.teamDps,
      fullBursts: t.fullBursts,
      fullBurstUptime: t.fullBurstUptime,
      units: t.units.map((u) => ({
        slug: u.slug,
        name: u.name,
        burst: u.burst,
        weapon: u.weapon,
        element: u.element,
        advantaged: u.advantaged,
        share: u.share,
        totalDamage: u.totalDamage,
      })),
    };
    const res = await shareTeamCard(share, shareMeta(), imageUrlFor, 'nikke-team.png');
    if (res !== 'unsupported') flashImaged();
  };

  // Share the roster summary card (5 teams: portraits + total-damage bars).
  const shareRoster = async (teams: TeamResult[]) => {
    const share: ShareRosterData = {
      totalDamage: teams.reduce((sum, t) => sum + t.teamDamage, 0),
      teams: teams.map((t) => ({
        teamDamage: t.teamDamage,
        units: t.units.map((u) => ({ slug: u.slug, name: u.name, element: u.element })),
      })),
    };
    const res = await shareRosterCard(share, shareMeta(), imageUrlFor, 'nikke-roster.png');
    if (res !== 'unsupported') flashImaged();
  };

  // Deterministic "Generate link": encode the full build (loadout + globals +
  // blocked) into a ?b= link on the generator's tab path with run=1, so opening
  // it restores the inputs and auto-runs — reproducing the identical result.
  const onGenLink = async (tabKey: 'team' | 'roster') => {
    const u = new URL(window.location.href);
    u.pathname = `/${tabKey}`;
    u.search = '';
    u.searchParams.set('b', encodeBuild(buildFromState()));
    u.searchParams.set('run', '1');
    const url = u.toString();
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 1500);
    } catch {
      window.prompt('Copy this link:', url);
    }
  };

  // Copy the Sim-tab result card (real portraits) to the clipboard via the shared
  // teamShare pipeline (same isomorphic drawTeamCard the bot uses). Falls back to
  // a download where the async clipboard image API isn't available (Firefox).
  const onShareImage = async () => {
    if (!r) return;
    const share: ShareTeamData = {
      teamDamage: r.teamDamage,
      teamDps: r.teamDps,
      fullBursts: r.fullBursts,
      fullBurstUptime: r.fullBurstUptime,
      units: r.units.map((u) => ({
        slug: u.slug,
        name: u.name,
        burst: u.burst,
        weapon: u.weapon,
        element: u.element,
        advantaged: u.advantaged,
        share: u.share,
        totalDamage: u.totalDamage,
      })),
    };
    const res = await shareTeamCard(share, shareMeta(), imageUrlFor, 'nikke-team.png');
    if (res !== 'unsupported') flashImaged();
  };

  // shared blocked-character panel (Team Calc + Roster Calc) — exclude nikkes
  // the user doesn't own from the search
  const blockedPanel = (
    <div className='field'>
      <label title='nikkes you do not own / want excluded from the search'>
        Blocked characters
      </label>
      <CharSearch
        placeholder='block a nikke…'
        exclude={blocked}
        onPick={(slug) => setBlocked((b) => [...b, slug])}
      />
      {blocked.length > 0 && (
        <div className='chips'>
          {blocked.map((slug) => (
            <button
              key={slug}
              className='chip'
              title='remove'
              onClick={() =>
                setBlocked((b) => b.filter((s) => s !== slug))
              }
            >
              {data.characters[slug]?.name ?? slug} ×
            </button>
          ))}
          <button className='chip clear' onClick={() => setBlocked([])}>
            clear all
          </button>
        </div>
      )}
    </div>
  );

  // ---- calc tabs: shared inputs + async runners (Team/Roster/Character) ----
  // Boss options + the "Apply to all" loadout (taken from slot 1) become the
  // uniform assumption the search runs every candidate under.
  const calcCfg = () => ({
    bossElement: weakness ? WEAKNESS_TO_BOSS[weakness] : null,
    bossDef: Number(bossDef) || 0,
    level: Math.min(1200, Math.max(1, Number(level) || 400)),
    copies: 0,
    doll: false,
    ol: 0 as const,
    coreHitRate: coreCustom
      ? Math.min(1, Math.max(0, Number(coreCustomVal) / 100 || 0))
      : core,
    rangeBonus: true,
    durationSec: 180,
  });
  const calcLoadout = (): UnitOptions => {
    const s = slots[0];
    return {
      cube:
        s.cubeId === 'none'
          ? undefined
          : { id: s.cubeId, level: Math.min(15, Math.max(1, s.cubeLevel || 15)) },
      ol: s.ol,
      doll: s.doll,
      stars: Math.min(3, Math.max(0, s.stars)),
      core: Math.min(7, Math.max(0, s.core)),
      skillLevels: { skill1: s.skill1, skill2: s.skill2, burst: s.burst },
    };
  };
  const newCalc = () =>
    makeCalc({
      chars: data.characters as any,
      mult,
      deps: {
        overrides,
        skillLevels: skillLevelData,
        cubes,
        olLines: olLinesData,
      },
      cfg: calcCfg(),
      loadout: calcLoadout(),
      blocked,
      meta: metaScoringFor(weakness),
    });

  // run a (blocking) calc off the paint frame so the "calculating…" state shows
  const runCalc = async (fn: () => void) => {
    setCalcBusy(true);
    await new Promise((r) => setTimeout(r, 30));
    try {
      fn();
    } finally {
      setCalcBusy(false);
    }
  };
  const runBestTeam = () =>
    runCalc(() => {
      setRosterResults(null);
      setTeamResult(newCalc().bestTeam());
    });
  const runTopTeams = () =>
    runCalc(() => {
      setTeamResult(null);
      setRosterResults(newCalc().topTeams(5));
    });

  // Deterministic "Generate link" (run=1): auto-run the generator once on mount so
  // an opened link reproduces the result from the encoded inputs.
  const didAutoRun = useRef(false);
  useEffect(() => {
    if (didAutoRun.current) return;
    didAutoRun.current = true;
    if (new URLSearchParams(window.location.search).get('run') !== '1') return;
    if (tab === 'team') runBestTeam();
    else if (tab === 'roster') runTopTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Roster Sim: sim up to 5 user-entered teams at once (shared loadout) ----
  const rosterSlugsPlaced = rosterSim.flat().filter((s): s is string => !!s);
  const rosterAnyFilled = rosterSlugsPlaced.length > 0;
  // full-roster grand total drives the shared display; each unit is unique across
  // the roster (solo-raid rule) so the active slot's own pick is the only re-pick.
  const assignRosterSlot = (ti: number, ui: number, slug: string | null) => {
    setRosterSim((r) =>
      r.map((team, t) => (t === ti ? team.map((s, u) => (u === ui ? slug : s)) : team)),
    );
    setRosterSimResults(null);
    // on a pick, advance to the next empty slot (fast sequential entry); clear on a clear
    if (!slug) return setRosterActive([ti, ui]);
    let n: [number, number] | null = null;
    for (let k = ti * 5 + ui + 1; k < 25; k++) {
      const [t, u] = [Math.floor(k / 5), k % 5];
      if (!rosterSim[t][u]) { n = [t, u]; break; }
    }
    setRosterActive(n);
  };
  const toTeamResult = (r: SimResult): TeamResult => ({
    slugs: r.units.map((u) => u.slug),
    teamDamage: r.teamDamage,
    teamDps: r.teamDps,
    fullBursts: r.fullBursts,
    fullBurstUptime: r.fullBurstUptime,
    units: r.units.map((u) => ({
      slug: u.slug,
      name: u.name,
      burst: u.burst,
      weapon: u.weapon,
      element: u.element,
      advantaged: u.advantaged,
      share: u.share,
      totalDamage: u.totalDamage,
    })),
  });
  const runRosterSim = () =>
    runCalc(() => {
      const deps = { overrides, skillLevels: skillLevelData, cubes, olLines: olLinesData };
      const cfg = calcCfg();
      const loadout = calcLoadout();
      const results = rosterSim
        .map((team) => team.filter((s): s is string => !!s))
        .filter((slugs) => slugs.length > 0)
        .map((slugs) => {
          const cs = slugs.map((s) => data.characters[s]);
          const prepared = prepareTeam(cs as any, slugs.map(() => loadout), deps as any);
          const r = runSim(cs as any, mult, { ...cfg, slugs } as SimConfig, prepared);
          return toTeamResult(r);
        });
      setRosterSimResults(results);
    });
  // normalize any (string|null)[][] into a strict 5×5 grid of known slugs.
  const normalizeRoster = (raw: (string | null)[][]): (string | null)[][] =>
    Array.from({ length: 5 }, (_, i) =>
      Array.from({ length: 5 }, (_, j) => {
        const s = raw?.[i]?.[j];
        return s && data.characters[s] ? s : null;
      }),
    );
  // Copy the generated roster into the Roster Sim grid and jump there.
  const copyToRosterSim = (teams: TeamResult[]) => {
    setRosterSim(normalizeRoster(teams.map((t) => t.slugs)));
    setRosterSimResults(null);
    setRosterActive(null);
    selectTab('rostersim');
  };

  // ---- Overload Calc: rank one carry's four free OL lines in an 8/12 team ----
  const olDeps = {
    overrides,
    skillLevels: skillLevelData,
    cubes,
    olLines: olLinesData,
  };
  // the 8/12 baseline loadout every unit runs under (OL5 gear, doll, "Other" cube
  // L10, 3★ · core 7); the four floor lines are 4× Elemental DMG + 4× ATK.
  const ol812Loadout = (): UnitOptions => ({
    cube: { id: 'other', level: 10 },
    ol: 5,
    doll: true,
    stars: 3,
    core: 7,
    lines: [...OL_FLOOR],
  });
  // custom mode: one carry vs several hand-built 4-unit support teams
  const olCustomTeamsValid = olSupportTeams.filter((t) => t.length === 4);
  // Overload Roll Sim: cost the current 4 cards. Empty/duplicate lines are dropped
  // (a piece can't hold the same stat twice).
  const runOlSim = () =>
    runCalc(() => {
      const targets: Target[] = olSimCards.map((card) => {
        const seen = new Set<OlKey>();
        const reqs: Target = [];
        for (const l of card) {
          if (!l.key || seen.has(l.key)) continue;
          seen.add(l.key);
          reqs.push({ key: l.key, minTier: l.tier });
        }
        return reqs;
      });
      setOlSimResult(monteCarloBuild(olProbModel, targets, { trials: 10000 }));
    });
  // Roll from Current: same as runOlSim but each card starts from the lines you
  // already hold (fresh=false), so the cost is measured from your current state.
  const runOlSimCurrent = () =>
    runCalc(() => {
      const targets: Target[] = [];
      const starts: (Piece | undefined)[] = [];
      for (const card of olSimCurrent) {
        const seen = new Set<OlKey>();
        const reqs: Target = [];
        for (const l of card.desired) {
          if (!l.key || seen.has(l.key)) continue;
          seen.add(l.key);
          reqs.push({ key: l.key, minTier: l.tier });
        }
        targets.push(reqs);
        const slots: (Line | null)[] = [null, null, null];
        card.current.forEach((l, i) => { if (l.key && i < 3) slots[i] = { key: l.key, tier: l.tier }; });
        starts.push(slots as Piece);
      }
      setOlSimCurrentResult(monteCarloBuild(olProbModel, targets, { trials: 10000, starts, fresh: false }));
    });
  // CTA from Optimize Overload: distribute the #1 config's 12 lines (4× Elem + 4×
  // ATK floor + best free-4) across the 4 cards, all at T11, then jump to the sim.
  const goToOlSim = (results: OlConfigResult[]) => {
    const free = results[0].lines.flatMap((l) => Array(l.count).fill(l.type as OlKey)) as OlKey[];
    const cards: OlSimLine[][] = [0, 1, 2, 3].map((i) => [
      { key: 'elem' as OlKey | '', tier: 11 },
      { key: 'atk' as OlKey | '', tier: 11 },
      { key: (free[i] ?? '') as OlKey | '', tier: 11 },
    ]);
    setOlSimCards(cards);
    setOlSimResult(null);
    setOlSimSub('calc');
    selectTab('olsim');
  };
  const runDollCalc = () =>
    runCalc(() => {
      const cal = getDollCalibration();
      setDollCal(cal);
      const dp = dollSolveDp(dollModel, dollRarity);
      const mc = dollMc(dollModel, dp, dollRarity, dollFrom, 0, { trials: 20000, seed: 20260715 });
      setDollResult({ cal, dp, mc, rarity: dollRarity, from: dollFrom });
    });
  const runDollCurrent = () =>
    runCalc(() => {
      getDollCalibration();
      const dp = dollSolveDp(dollModel, dollCurRarity);
      const mc = dollMc(dollModel, dp, dollCurRarity, dollCurPhase, 0, { trials: 20000, seed: 20260715 });
      setDollCurResult({ dp, mc, rarity: dollCurRarity, from: dollCurPhase });
    });
  // Show the common case by default: OL 8/12 on the Roll Calculator, and the doll
  // 0→15 throughput + per-phase guide on the Doll Calculator (calibration computed once).
  useEffect(() => {
    if (tab === 'doll' && !dollCal && !calcBusy) runCalc(() => setDollCal(getDollCalibration()));
  }, [tab, dollCal]);
  useEffect(() => {
    if (tab === 'doll' && dollSub === 'calc' && dollCal && !dollResult && !calcBusy) runDollCalc();
  }, [tab, dollSub, dollCal]);
  useEffect(() => {
    if (tab === 'olsim' && olSimSub === 'calc' && !olSimResult && !calcBusy) runOlSim();
  }, [tab, olSimSub]);
  const runOlMatrix = () =>
    runCalc(() => {
      setOlCustomResults(null);
      if (!olCarry) {
        setOlMatrixResult(null);
        return;
      }
      const carry = data.characters[olCarry];
      const cell8: Cell = { ...olCell, invest: '8of12' };
      const team = assembleTeam(cell8, { slug: olCarry, element: carry.element });
      const chars = team.slugs.map((s) => data.characters[s]);
      const carryIdx = team.slugs.indexOf(olCarry);
      const { baselineDamage, results } = rankFreeLineConfigs({
        chars: chars as any,
        mult,
        cfg: team.cfg,
        deps: olDeps,
        baseOpts: team.unitOpts,
        carryIdx,
        topN: 10,
      });
      setOlMatrixResult({ carrySlug: olCarry, baseline: baselineDamage, results });
    });
  const runOlCustom = () =>
    runCalc(() => {
      setOlMatrixResult(null);
      if (!olCustomCarry || !olCustomTeamsValid.length) {
        setOlCustomResults(null);
        return;
      }
      const out = olCustomTeamsValid.map((support) => {
        const slugs = [olCustomCarry, ...support];
        const chars = slugs.map((s) => data.characters[s]);
        const baseOpts = slugs.map(() => ol812Loadout());
        const cfg = {
          ...calcCfg(),
          level: 400,
          slugs,
          focusSlug: olCustomCarry,
        } as SimConfig;
        const { baselineDamage, results } = rankFreeLineConfigs({
          chars: chars as any,
          mult,
          cfg,
          deps: olDeps,
          baseOpts,
          carryIdx: 0,
          topN: 10,
        });
        return { teamSlugs: support, baseline: baselineDamage, results };
      });
      setOlCustomResults(out);
    });

  // ---- DPS test: scope-locked control + variable groups ----
  const dpsGroupSize = Math.max(1, 5 - dpsControl.length); // 2 if control=3, 1 if 4
  const dpsControlValid = dpsControl.length === 3 || dpsControl.length === 4;
  const emptyGroup = (size: number): SlotState[] =>
    Array.from({ length: size }, () => defaultSlot(null));
  const setControl = (next: string[]) => {
    setDpsControl(next);
    const size = 5 - next.length;
    // reset variable groups whenever the group size may have changed
    setDpsGroups(next.length === 3 || next.length === 4 ? [emptyGroup(size)] : []);
    setDpsResults(null);
  };
  const setGroupUnit = (gi: number, ui: number, patch: Partial<SlotState>) =>
    setDpsGroups((gs) =>
      gs.map((g, j) =>
        j === gi ? g.map((u, k) => (k === ui ? { ...u, ...patch } : u)) : g,
      ),
    );
  const groupComplete = (g: SlotState[]) => g.every((u) => u.slug);
  const runDpsTest = () =>
    runCalc(() => {
      const deps = {
        overrides,
        skillLevels: skillLevelData,
        cubes,
        olLines: olLinesData,
      };
      const cfg = { ...calcCfg(), level: 400 }; // scope lock = lvl 400
      const results = dpsGroups
        .filter(groupComplete)
        .map((group) => {
          const slugs = [...dpsControl, ...group.map((u) => u.slug!)];
          const cs = slugs.map((s) => data.characters[s]);
          // control = scope-lock; variable units use their configured card
          const opts = [
            ...dpsControl.map(() => SCOPE_LOCK_LOADOUT),
            ...group.map(slotToUnitOptions),
          ];
          const prepared = prepareTeam(cs as any, opts, deps as any);
          const r = runSim(cs as any, mult, { ...cfg, slugs } as SimConfig, prepared);
          const varUnits = r.units.slice(dpsControl.length); // the group's units
          const varDamage = varUnits.reduce((s, u) => s + u.totalDamage, 0);
          return {
            group: group.map((u) => u.slug!),
            teamDamage: r.teamDamage,
            teamDps: r.teamDps,
            fullBurstUptime: r.fullBurstUptime,
            varDamage,
            varShare: r.teamDamage ? varDamage / r.teamDamage : 0,
            varUnits: varUnits.map((u) => ({
              slug: u.slug,
              name: u.name,
              totalDamage: u.totalDamage,
              share: u.share,
            })),
          };
        })
        .sort((a, b) => b.teamDamage - a.teamDamage);
      setDpsResults(results);
    });

  // full result view for the single-team (Optimal Team) generator: portrait
  // strip + summary + per-unit table. (Share/link buttons live in the header.)
  const teamResultView = (t: TeamResult, opts?: { highlight?: string }) => (
    <div className='calc-result'>
      <TeamPortraits slugs={t.slugs} advantaged={advSet(t)} />
      <div className='summary muted'>
        team <b className='big'>{fmt(t.teamDamage)}</b> · {fmt(t.teamDps)} DPS ·{' '}
        {(t.fullBurstUptime * 100).toFixed(0)}% FB uptime
      </div>
      <table>
        <tbody>
          {t.units.map((u) => (
            <tr key={u.slug} className={u.slug === opts?.highlight ? 'hl' : ''}>
              <td className='muted'>B{u.burst}</td>
              <td>
                {u.name}
                {u.advantaged && <span className='adv' title='advantage'> ▲</span>}
              </td>
              <td className='r'>{u.weapon}</td>
              <td className='r share'>{(u.share * 100).toFixed(1)}%</td>
              <td className='r'>{fmt(u.totalDamage)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Roster generator: a 5×5 at-a-glance portrait grid, then 5 compact cards laid
  // out horizontally — each card's compact table is constrained to the width of
  // its own 5-portrait strip.
  const rosterView = (teams: TeamResult[]) => {
    const rosterTotal = teams.reduce((sum, t) => sum + t.teamDamage, 0);
    const maxTeam = Math.max(...teams.map((t) => t.teamDamage), 1);
    return (
      <div className='roster-result'>
        <div className='roster-grid'>
          {teams.map((t, i) => (
            <div className='roster-grid-row' key={`g${i}`}>
              <span className='rg-label muted'>team {i + 1}</span>
              <TeamPortraits slugs={t.slugs} advantaged={advSet(t)} />
              <div className='rg-bar'>
                <span style={{ width: `${(t.teamDamage / maxTeam) * 100}%` }} />
              </div>
              <span className='rg-dmg'>{fmt(t.teamDamage)}</span>
            </div>
          ))}
          <div className='roster-grid-row total'>
            <span className='rg-label muted'>roster total</span>
            <span className='rg-dmg big'>{fmt(rosterTotal)}</span>
          </div>
        </div>
        {/* explicit rows of 3 so a partial last row (the 2 in 3:2) centers under
            the row above instead of sitting left-aligned */}
        <div className='roster-cards'>
          {chunk(teams, 3).map((row, ri) => (
            <div className='roster-cards-row' key={`r${ri}`}>
              {row.map((t, j) => {
                const i = ri * 3 + j;
                return (
                  <div className='roster-card' key={`c${i}`}>
                    <div className='card-group-label'>
                      team {i + 1} · {fmt(t.teamDamage)}
                    </div>
                    <TeamPortraits slugs={t.slugs} advantaged={advSet(t)} />
                    <table className='roster-card-table'>
                      <tbody>
                        {t.units.map((u) => (
                          <tr key={u.slug} className={u.advantaged ? 'adv-row' : ''}>
                            <td className='muted'>B{u.burst}</td>
                            <td className='nm'>{u.name}</td>
                            <td className='r share'>{(u.share * 100).toFixed(0)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Roster Sim input: a 5×5 grid of pick-a-slot chips + one shared picker for the
  // active slot (units are unique across the whole roster).
  const rosterInputThumbs = usePortraitThumbs(
    rosterSim.flat().map((s) => (s ? data.characters[s]?.imageUrl : null)),
    72,
  );
  const rosterInputView = (
    <div className='roster-input'>
      {rosterSim.map((team, ti) => (
        <div className='roster-input-row' key={ti}>
          <span className='rg-label muted'>team {ti + 1}</span>
          <div className='roster-slots'>
            {team.map((slug, ui) => {
              const c = slug ? data.characters[slug] : null;
              const active = rosterActive?.[0] === ti && rosterActive?.[1] === ui;
              return (
                <button
                  key={ui}
                  type='button'
                  className={`team-chip roster-slot${active ? ' active' : ''}`}
                  title={c?.name ?? `team ${ti + 1} · slot ${ui + 1}`}
                  onClick={() => setRosterActive(active ? null : [ti, ui])}
                >
                  {c?.imageUrl ? (
                    <img
                      src={rosterInputThumbs[c.imageUrl] ?? c.imageUrl}
                      alt={c.name}
                      draggable={false}
                    />
                  ) : (
                    <span className='chip-empty'>+</span>
                  )}
                  {slug && (
                    <span
                      className='chip-x'
                      role='button'
                      aria-label='remove'
                      onClick={(e) => {
                        e.stopPropagation();
                        assignRosterSlot(ti, ui, null);
                      }}
                    >
                      ×
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {rosterActive && (
        <div className='roster-picker'>
          <CharSearch
            placeholder={`pick for team ${rosterActive[0] + 1}, slot ${rosterActive[1] + 1}…`}
            exclude={rosterSlugsPlaced.filter(
              (s) => s !== rosterSim[rosterActive[0]][rosterActive[1]],
            )}
            onPick={(slug) => assignRosterSlot(rosterActive[0], rosterActive[1], slug)}
          />
        </div>
      )}
    </div>
  );

  // the full per-character card (portrait, picker, gear/dupes/skills/cube/OL) —
  // reused by the Sim tab and the DPS test's variable units.
  const renderCard = (
    slot: SlotState,
    onChange: (patch: Partial<SlotState>) => void,
    slotLabel: string,
    drag?: {
      register: (el: HTMLElement | null) => void;
      imageHandleProps: Record<string, unknown>;
      dragging: boolean;
    },
    // compact mode already shows the portrait in the strip, so the expanded
    // card omits the big duplicate image
    hidePortrait?: boolean,
  ) => {
    const c = slot.slug ? data.characters[slot.slug] : null;
    const maxBond = maxBondLevel(c?.manufacturer ?? null); // 0 = no bond table
    // clicking the portrait opens+focuses this card's nikke picker (used when the
    // portrait isn't a drag handle — compact expanded card, DPS tab)
    const focusPicker = (e: ReactMouseEvent) => {
      const input = e.currentTarget
        .closest('.card')
        ?.querySelector<HTMLInputElement>('.picker input');
      input?.focus();
    };
    // when draggable, tap focuses the picker and press-drag reorders (handled by
    // imageHandleProps); otherwise a plain click focuses
    const portraitProps = drag
      ? { className: 'portrait draggable', draggable: false, ...drag.imageHandleProps }
      : { className: 'portrait', onClick: focusPicker };
    return (
      <div
        className={'card' + (drag?.dragging ? ' dragging' : '')}
        ref={drag?.register}
      >
        <div className='slot-head'>
          <span className='muted'>{slotLabel}</span>
          {c && (
            <span className='tag'>
              B{c.burst} · {c.weapon} · {c.element}
            </span>
          )}
        </div>
        {hidePortrait ? null : c?.imageUrl ? (
          <img {...portraitProps} src={c.imageUrl} alt={c.name} />
        ) : drag ? (
          <div {...portraitProps} className='portrait empty draggable'>
            ?
          </div>
        ) : (
          <div className='portrait empty' onClick={focusPicker}>
            ?
          </div>
        )}
        <CharPicker
          slot={slot}
          onPick={(slug) =>
            // reset bond to the newly-picked unit's manufacturer max
            onChange({
              slug,
              relationshipLevel: String(
                maxBondLevel(data.characters[slug].manufacturer),
              ),
            })
          }
        />
        {c?.burst === 'Λ' && (
          <div className='pills small'>
            {([0, 1, 2, 3] as const).map((st) => (
              <button
                key={st}
                title='Λ burst: which stage she operates as'
                className={slot.lambdaStage === st ? 'on' : ''}
                onClick={() => onChange({ lambdaStage: st })}
              >
                {st === 0 ? 'Auto' : `as B${st}`}
              </button>
            ))}
          </div>
        )}
        {(() => {
          const modes = slot.slug ? overrides[slot.slug]?.modes : undefined;
          if (!modes?.length) return null;
          return (
            <div className='pills small'>
              {modes.map((m) => (
                <button
                  key={m}
                  title='kit mode (assumed 100% uptime)'
                  className={(slot.mode ?? modes[0]) === m ? 'on' : ''}
                  onClick={() => onChange({ mode: m })}
                >
                  {m}
                </button>
              ))}
            </div>
          );
        })()}
        {slot.slug &&
          JSON.stringify(overrides[slot.slug] ?? {}).includes('"stackedNuke"') && (
            <div className='pills small'>
              <button
                title='override the burst order to cast her burst once MP is fully stacked'
                className={slot.mpPriority ? 'on' : ''}
                onClick={() => onChange({ mpPriority: !slot.mpPriority })}
              >
                {slot.mpPriority ? '☑' : '☐'} burst at 12 MP
              </button>
            </div>
          )}
        <div
          className='card-group-label'
          title='Gear set. Base 5 = scope-lock base gear (the sim’s validation basis); OL 0 / OL 5 = Full T10 overload set at overload level 0 / 5.'
        >
          gear
        </div>
        <div className='pills small'>
          <button
            className={slot.ol === 'base5' ? 'on' : ''}
            onClick={() => onChange({ ol: 'base5' })}
            title='Scope-lock base gear — the real validation basis (lower ATK than OL 0)'
          >
            Base 5
          </button>
          <button
            className={slot.ol === 0 ? 'on' : ''}
            onClick={() => onChange({ ol: 0 })}
            title='Full T10 overload set, 0 overload lines'
          >
            OL 0
          </button>
          <button
            className={slot.ol === 5 ? 'on' : ''}
            onClick={() => onChange({ ol: 5 })}
            title='Full T10 overload set, overload level 5'
          >
            OL 5
          </button>
          <button
            className={slot.doll ? 'on' : ''}
            onClick={() => onChange({ doll: !slot.doll })}
          >
            Doll 15
          </button>
        </div>
        <div className='card-group-label'>dupes</div>
        <div className='pills small'>
          {DUPE_PRESETS.map((p) => (
            <button
              key={p.label}
              className={
                !slot.dupeCustom && slot.stars === p.stars && slot.core === p.core
                  ? 'on'
                  : ''
              }
              onClick={() =>
                onChange({ stars: p.stars, core: p.core, dupeCustom: false })
              }
            >
              {p.label}
            </button>
          ))}
          <button
            title='custom stars / core'
            className={slot.dupeCustom ? 'on' : ''}
            onClick={() => onChange({ dupeCustom: !slot.dupeCustom })}
          >
            …
          </button>
        </div>
        {c && maxBond > 0 && (
          <>
            <div className='card-group-label'>bond</div>
            <div className='pills small'>
              <label>
                <span className='muted pill-label'>Lvl</span>
                <input
                  className='num'
                  value={slot.relationshipLevel}
                  placeholder={String(maxBond)}
                  title={`Relationship (bond) level — blank uses the manufacturer max (${maxBond})`}
                  onChange={(e) =>
                    onChange({ relationshipLevel: e.target.value })
                  }
                />
                <span className='muted'> / {maxBond}</span>
              </label>
            </div>
          </>
        )}
        {slot.dupeCustom && (
          <>
            <div className='pills small' title='Limit Break stars'>
              <span className='muted pill-label'>Stars</span>
              {STAR_LEVELS.map((st) => (
                <button
                  key={st}
                  className={slot.stars === st ? 'on' : ''}
                  onClick={() => onChange({ stars: st })}
                >
                  {st}
                </button>
              ))}
            </div>
            <div className='pills small' title='Core enhancement'>
              <span className='muted pill-label'>Core</span>
              {CORE_LEVELS.map((cr) => (
                <button
                  key={cr}
                  className={slot.core === cr ? 'on' : ''}
                  onClick={() => onChange({ core: cr })}
                >
                  {cr}
                </button>
              ))}
            </div>
          </>
        )}
        <div className='card-group-label'>skills</div>
        {(
          [
            ['S1', 'skill1'],
            ['S2', 'skill2'],
            ['Burst', 'burst'],
          ] as const
        ).map(([label, key]) => {
          const hasData = !!(slot.slug && skillLevelData[slot.slug]);
          return (
            <div
              key={key}
              className='pills small'
              title={
                hasData
                  ? `${label} skill level`
                  : `${label} skill level — no per-level data for this nikke; values stay at max`
              }
            >
              <span className='muted pill-label'>{label}</span>
              {SKILL_LEVELS.map((lv) => (
                <button
                  key={lv}
                  className={slot[key] === lv ? 'on' : ''}
                  onClick={() => onChange({ [key]: lv })}
                >
                  {lv}
                </button>
              ))}
            </div>
          );
        })}
        <div className='card-group-label'>cube</div>
        <div className='cube'>
          {CUBE_IDS.map((id) => {
            const cube = cubes.cubes[id];
            const effect = cube.effectStat
              ? STAT_LABELS[cube.effectStat] ?? cube.effectStat
              : 'base stats + elemental damage';
            return (
              <button
                key={id}
                title={`${cube.name} — ${effect}`}
                className={slot.cubeId === id ? 'on' : ''}
                onClick={() => onChange({ cubeId: id })}
              >
                {cubes.cubes[id].image ? (
                  <img
                    src={'/' + cubes.cubes[id].image.replace('img/', '')}
                    alt={id}
                  />
                ) : (
                  'Other'
                )}
              </button>
            );
          })}
          <button
            title='No cube — no flat ATK, no elemental damage, no effect'
            className={slot.cubeId === 'none' ? 'on' : ''}
            onClick={() => onChange({ cubeId: 'none' })}
          >
            None
          </button>
        </div>
        {slot.cubeId !== 'none' && (
          <div className='pills small'>
            {CUBE_LEVELS.map((l) => (
              <button
                key={l}
                className={!slot.cubeCustom && slot.cubeLevel === l ? 'on' : ''}
                onClick={() => onChange({ cubeLevel: l, cubeCustom: false })}
              >
                L{l}
              </button>
            ))}
            <button
              title='custom cube level'
              className={slot.cubeCustom ? 'on' : ''}
              onClick={() => onChange({ cubeCustom: !slot.cubeCustom })}
            >
              …
            </button>
            {slot.cubeCustom && (
              <input
                className='num'
                value={slot.cubeLevel}
                onChange={(e) =>
                  onChange({ cubeLevel: Number(e.target.value) || 1 })
                }
              />
            )}
          </div>
        )}
        {(
          <div className='ol'>
            <div className='ol-base'>
              <label>
                ELE
                <input
                  className='num'
                  value={slot.olElem}
                  placeholder='%'
                  onChange={(e) => onChange({ olElem: e.target.value })}
                />
              </label>
              <label>
                ATK
                <input
                  className='num'
                  value={slot.olAtk}
                  placeholder='%'
                  onChange={(e) => onChange({ olAtk: e.target.value })}
                />
              </label>
            </div>
            {slot.olExtra.map((line, li) => (
              <div className='ol-line' key={li}>
                <select
                  value={line.type}
                  onChange={(e) =>
                    onChange({
                      olExtra: slot.olExtra.map((l, j) =>
                        j === li ? { ...l, type: e.target.value } : l,
                      ),
                    })
                  }
                >
                  {OL_LINE_TYPES.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <input
                  className='num'
                  value={line.value}
                  placeholder='%'
                  onChange={(e) =>
                    onChange({
                      olExtra: slot.olExtra.map((l, j) =>
                        j === li ? { ...l, value: e.target.value } : l,
                      ),
                    })
                  }
                />
                <button
                  className='ol-rm'
                  title='remove line'
                  onClick={() =>
                    onChange({
                      olExtra: slot.olExtra.filter((_, j) => j !== li),
                    })
                  }
                >
                  ×
                </button>
              </div>
            ))}
            <button
              className='ol-add'
              onClick={() =>
                onChange({
                  olExtra: [...slot.olExtra, { type: 'ammo', value: '' }],
                })
              }
            >
              + OL line
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderCalcTab = () => {
    if (tab === 'dpschart') {
      return <DpsChartTab />;
    }
    if (tab === 'team') {
      return (
        <section className='calc-tab'>
          <h2>Optimal Team</h2>
          <p className='muted'>
            Finds the strongest 5-nikke team for the chosen boss weakness
            {weakness ? ` (${weakness})` : ' (no element selected)'} under the
            teamwide options + “Apply to all” loadout above.
            {weakness && (
              <>
                {' '}Ranking blends simulated damage with real-world popularity —
                how often top-100 solo-raid rankers field each unit and comp
                against a {weakness}-weak boss (new units use their bossing tier).
              </>
            )}
          </p>
          {blockedPanel}
          <button className='calc-run' onClick={runBestTeam} disabled={calcBusy}>
            {calcBusy
              ? 'Calculating…'
              : `Calculate best team${weakness ? ` for ${weakness}` : ''}`}
          </button>
          {teamResult && teamResultView(teamResult)}
        </section>
      );
    }
    if (tab === 'roster') {
      return (
        <section className='calc-tab'>
          <h2>Solo-Raid Roster Generator</h2>
          <p className='muted'>
            Builds the top 5 teams with no character reused across teams (same
            scoring as Optimal Team). Takes a few seconds — it runs hundreds of
            fights.
          </p>
          {blockedPanel}
          <button className='calc-run' onClick={runTopTeams} disabled={calcBusy}>
            {calcBusy ? 'Calculating…' : 'Calculate top 5 teams'}
          </button>
          {rosterResults && (
            <>
              <button
                className='share-btn roster-copy-btn'
                onClick={() => copyToRosterSim(rosterResults)}
                title='send these 5 teams to the Roster Sim tab to edit + re-sim'
              >
                ✎ Copy to Roster Sim
              </button>
              {rosterView(rosterResults)}
            </>
          )}
        </section>
      );
    }
    if (tab === 'rostersim') {
      return (
        <section className='calc-tab'>
          <h2>Roster Sim</h2>
          <p className='muted'>
            Enter up to five teams of five and sim them all at once under the boss
            options + “apply to all” loadout above. Each nikke can be used once
            across the roster (solo-raid rule). Tap a slot to pick a unit.
          </p>
          {rosterInputView}
          <div className='roster-sim-actions'>
            <button
              className='calc-run'
              onClick={runRosterSim}
              disabled={!rosterAnyFilled || calcBusy}
            >
              {calcBusy ? 'Simming…' : 'Sim roster'}
            </button>
            {user && (
              <button
                className='share-btn'
                onClick={onSaveRoster}
                disabled={!rosterAnyFilled}
                title='save this roster to your account'
              >
                {savedFlash ? '✓ Saved' : '💾 Save roster'}
              </button>
            )}
            {rosterSlugsPlaced.length > 0 && (
              <button
                className='share-btn'
                onClick={() => {
                  setRosterSim(Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => null)));
                  setRosterActive(null);
                  setRosterSimResults(null);
                }}
                title='clear all slots'
              >
                Clear
              </button>
            )}
          </div>
          {rosterSimResults && rosterView(rosterSimResults)}
        </section>
      );
    }
    if (tab === 'dps') {
      const canRun = dpsControlValid && dpsGroups.some(groupComplete) && !calcBusy;
      return (
        <section className='calc-tab'>
          <h2>Custom DPS Rankings</h2>
          <div className='pills small dps-mode'>
            <button className={dpsMode === 'custom' ? 'on' : ''} onClick={() => setDpsMode('custom')}>
              Custom control groups
            </button>
            <button className={dpsMode === 'matrix' ? 'on' : ''} onClick={() => setDpsMode('matrix')}>
              Matrix
            </button>
          </div>
          {dpsMode === 'matrix' ? (
            <>
              <p className='muted'>
                The standardized 72-cell matrix (same grid as the DPS Rankings tab) — pick
                a cell for its ranked top-10 infographic.
              </p>
              <MatrixChart />
            </>
          ) : (
          <>
          <p className='muted'>
            A fixed <b>control group</b> (3 or 4 nikkes) — scope-locked (no cube /
            no doll / Base 5 gear / 3★ · 7 core · lvl 400) — plus swap-in variable groups
            you configure with the <b>full per-character cards</b>. Boss options
            come from the teamwide row above.
          </p>

          <div className='field'>
            <label>Control group — pick 3 or 4 ({dpsControl.length}/4)</label>
            <div className='chips'>
              {dpsControl.map((slug) => (
                <button
                  key={slug}
                  className='chip'
                  title='remove'
                  onClick={() =>
                    setControl(dpsControl.filter((s) => s !== slug))
                  }
                >
                  {data.characters[slug]?.name ?? slug} ×
                </button>
              ))}
            </div>
            {dpsControl.length < 4 && (
              <CharSearch
                placeholder='add control nikke…'
                exclude={dpsControl}
                onPick={(slug) => setControl([...dpsControl, slug])}
              />
            )}
          </div>

          {dpsControlValid ? (
            <>
              <div className='card-group-label'>
                variable groups — {dpsGroupSize} nikke
                {dpsGroupSize > 1 ? 's' : ''} each
              </div>
              <div className='dps-groups-row'>
                {dpsGroups.map((group, gi) => (
                  <div className='dps-group-block' key={gi}>
                    <div className='dps-group-head'>
                      <span className='card-group-label'>group {gi + 1}</span>
                      {dpsGroups.length > 1 && (
                        <button
                          className='chip'
                          title='remove group'
                          onClick={() =>
                            setDpsGroups((gs) => gs.filter((_, j) => j !== gi))
                          }
                        >
                          remove group ×
                        </button>
                      )}
                    </div>
                    <div className='dps-cards'>
                      {group.map((unit, ui) => (
                        <Fragment key={ui}>
                          {renderCard(
                            unit,
                            (p) => setGroupUnit(gi, ui, p),
                            `unit ${ui + 1}`,
                          )}
                        </Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button
                className='ol-add'
                onClick={() =>
                  setDpsGroups((gs) => [...gs, emptyGroup(dpsGroupSize)])
                }
              >
                + add group
              </button>
              <button className='calc-run' onClick={runDpsTest} disabled={!canRun}>
                {calcBusy ? 'Running…' : 'Run rankings'}
              </button>
            </>
          ) : (
            <p className='muted'>Pick 3 or 4 control nikkes to begin.</p>
          )}

          {dpsResults && (
            <div className='calc-result'>
              <DpsBarChart
                title='Variable groups'
                subtitle='ranked by group damage · 180s'
                bars={dpsResults.map((res, i) => ({
                  slug: String(i),
                  name: res.varUnits.map((u) => u.name).join(' + '),
                  element: data.characters[res.varUnits[0]?.slug ?? '']?.element ?? '',
                  weapon: '',
                  tier: '',
                  dps: res.varDamage,
                  rank: i + 1,
                }))}
                onShareImage={() =>
                  void copyDpsChartImage({
                    title: 'Custom DPS Rankings — variable groups',
                    bars: dpsResults.map((res) => ({
                      name: res.varUnits.map((u) => u.name).join(' + '),
                      element: data.characters[res.varUnits[0]?.slug ?? '']?.element ?? '',
                      dps: res.varDamage,
                    })),
                    compare: null,
                  })
                }
              />
              <details className='dps-details'>
                <summary className='muted'>details table</summary>
                <table>
                  <thead>
                    <tr>
                      <th></th>
                      <th>variable group</th>
                      <th className='r'>group dmg</th>
                      <th className='r'>group share</th>
                      <th className='r'>team dmg</th>
                      <th className='r'>FB%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dpsResults.map((res, i) => (
                      <tr key={i} className={i === 0 ? 'hl' : ''}>
                        <td className='muted'>{i + 1}</td>
                        <td>{res.varUnits.map((u) => u.name).join(' + ')}</td>
                        <td className='r'>{fmt(res.varDamage)}</td>
                        <td className='r share'>{(res.varShare * 100).toFixed(1)}%</td>
                        <td className='r'>
                          <b>{fmt(res.teamDamage)}</b>
                        </td>
                        <td className='r muted'>{(res.fullBurstUptime * 100).toFixed(0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className='muted'>
                  Ranked by team damage. “Group dmg” is the combined damage of the
                  variable nikke{dpsGroupSize > 1 ? 's' : ''} in each variant.
                </p>
              </details>
            </div>
          )}
          </>
          )}
        </section>
      );
    }
    if (tab === 'charge') {
      const chc = chargeChar ? data.characters[chargeChar] : null;
      const baseFrames = chc ? chc.chargeFrames : 60;
      const allRows = chargeFrameBreakpoints(baseFrames);
      // Deep breakpoints need charge speed most teams never reach; hide them
      // behind a toggle so the default view stays actionable.
      const REACHABLE_CS = 50;
      const rows = chargeShowAll
        ? allRows
        : allRows.filter((r) => r.csNeeded <= REACHABLE_CS);
      const hidden = allRows.length - rows.length;
      // exclude everything that isn't a charge weapon from the picker
      const nonCharge = allChars
        .filter((c) => !CHARGE_CHARS.some((cc) => cc.slug === c.slug))
        .map((c) => c.slug);
      return (
        <section className='calc-tab'>
          <h2>Charge Speed Breakpoints</h2>
          <p className='muted'>
            Charge weapons fire in whole frames (the game runs at 60&nbsp;fps), so
            charge speed only shaves time in discrete steps. A <b>breakpoint</b> is
            the least charge speed&nbsp;% that drops the charge by one more frame —
            anything between two breakpoints is wasted. Pick a nikke for her charge
            time, or read the standard 1-second table below.
          </p>

          <div className='field'>
            <label>Charge weapon</label>
            {chc ? (
              <div className='chips'>
                <button
                  className='chip'
                  title='change'
                  onClick={() => setChargeChar(null)}
                >
                  {chc.name} ({chc.weapon} · {(chc.chargeFrames / 60).toFixed(2)}s
                  charge) ×
                </button>
              </div>
            ) : (
              <CharSearch
                placeholder='pick a charge nikke (RL / SR)…'
                exclude={nonCharge}
                onPick={(slug) => setChargeChar(slug)}
              />
            )}
          </div>

          <p className='muted'>
            {chc ? (
              <>
                <b>{chc.name}</b> charges in <b>{baseFrames} frames</b> (
                {(baseFrames / 60).toFixed(3)}s) at 0% charge speed.
              </>
            ) : (
              <>
                Showing the <b>standard 1-second charge</b> — {baseFrames} frames,
                shared by most rocket launchers and snipers (Cinderella, Maxwell,
                Red Hood, Alice&apos;s base, …).
              </>
            )}
          </p>

          <div className='table-scroll'>
            <table className='breakpoint-table'>
              <thead>
                <tr>
                  <th>Charge speed</th>
                  <th>Charge frames</th>
                  <th>Charge time</th>
                  <th>Saved vs base</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.frames}>
                    <td className='r'>
                      <b>≥ {row.csNeeded.toFixed(2)}%</b>
                    </td>
                    <td className='r'>{row.frames}f</td>
                    <td className='r'>{Math.round(row.ms)} ms</td>
                    <td className='r'>
                      −{baseFrames - row.frames}f (
                      {Math.round((baseFrames - row.frames) * FRAME_MS)} ms)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className='pills small' style={{ marginTop: 10 }}>
            <button
              className={chargeShowAll ? '' : 'on'}
              onClick={() => setChargeShowAll(false)}
            >
              Reachable (≤ {REACHABLE_CS}%)
            </button>
            <button
              className={chargeShowAll ? 'on' : ''}
              onClick={() => setChargeShowAll(true)}
            >
              All breakpoints
            </button>
          </div>
          {!chargeShowAll && hidden > 0 && (
            <p className='muted'>
              {hidden} deeper breakpoint{hidden === 1 ? '' : 's'} hidden (each needs
              more than {REACHABLE_CS}% charge speed). Charge speed caps at 100%,
              which floors the charge at a single frame.
            </p>
          )}

          <div className='notes'>
            <b>How to read this</b>
            <ul>
              <li>
                Charge speed is <b>subtractive on charge time</b>: effective frames
                = round(base × (1 − charge&nbsp;speed)), floored at 1 frame. Sum
                every source — OL lines, cube (Resilience), and in-combat buffs —
                and compare against the “Charge speed” column.
              </li>
              <li>
                This table is the <b>charge phase only</b>. On auto, release-fired
                RLs and snipers add a fixed ~22-frame release/bolt recovery after
                each shot that charge speed does <i>not</i> reduce, so real cadence
                is a little longer than the charge time shown.
              </li>
              <li>
                Charge speed past 100% is wasted (no shot charges faster than one
                frame) except for the few kits that explicitly convert the excess.
              </li>
            </ul>
          </div>
        </section>
      );
    }
    if (tab === 'overload') {
      const carryMx = olCarry ? data.characters[olCarry] : null;
      const carryCu = olCustomCarry ? data.characters[olCustomCarry] : null;
      // compact ranked table beneath a chart
      const olTable = (baseline: number, results: OlConfigResult[]) => (
        <details className='dps-details'>
          <summary className='muted'>details table</summary>
          <table>
            <thead>
              <tr>
                <th></th>
                <th>free 4 overload lines</th>
                <th className='r'>carry dmg</th>
                <th className='r'>vs 8/12</th>
              </tr>
            </thead>
            <tbody>
              {results.map((res, i) => (
                <tr key={res.label} className={i === 0 ? 'hl' : ''}>
                  <td className='muted'>{i + 1}</td>
                  <td>{res.label}</td>
                  <td className='r'>{fmt(res.damage)}</td>
                  <td className='r share'>+{res.gainPct.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className='muted'>
            8/12 baseline (4× Elemental DMG + 4× ATK, four free lines empty):{' '}
            {fmt(baseline)}. Ranked by the carry’s own damage.
          </p>
        </details>
      );
      // custom-mode support-team editing (functional updates; clear stale results)
      const editSupport = (fn: (ts: string[][]) => string[][]) => {
        setOlSupportTeams(fn);
        setOlCustomResults(null);
      };
      return (
        <section className='calc-tab'>
          <h2>Optimize Overload</h2>
          <p className='muted'>
            Ranks how one carry should spend its <b>four free overload lines</b>. The
            8/12 floor — 4× Elemental DMG + 4× ATK — is held fixed on everyone; only
            the carry’s remaining four lines vary, scored by the carry’s own damage
            and the % gain over that plain 8/12 baseline.
          </p>
          <div className='pills small dps-mode'>
            <button
              className={olMode === 'matrix' ? 'on' : ''}
              onClick={() => setOlMode('matrix')}
            >
              Matrix control team
            </button>
            <button
              className={olMode === 'custom' ? 'on' : ''}
              onClick={() => setOlMode('custom')}
            >
              Custom support teams
            </button>
          </div>

          {olMode === 'matrix' ? (
            <>
              <p className='muted'>
                Pick a carry and a matrix cell — the Standard/Anis control team
                auto-fills around it. Investment is pinned to <b>8/12</b>.
              </p>
              <MatrixFilter cell={olCell} onChange={setOlCell} hideInvest />
              <div className='field'>
                <label>Carry — unit to optimize</label>
                {carryMx ? (
                  <div className='chips'>
                    <button
                      className='chip'
                      title='change'
                      onClick={() => {
                        setOlCarry(null);
                        setOlMatrixResult(null);
                      }}
                    >
                      {carryMx.name} ({carryMx.weapon} · {carryMx.element}) ×
                    </button>
                  </div>
                ) : (
                  <CharSearch
                    placeholder='pick a carry…'
                    exclude={[]}
                    onPick={(slug) => {
                      setOlCarry(slug);
                      setOlMatrixResult(null);
                    }}
                  />
                )}
              </div>
              <button
                className='calc-run'
                onClick={runOlMatrix}
                disabled={!carryMx || calcBusy}
              >
                {calcBusy ? 'Running…' : 'Rank overload lines'}
              </button>
              {olMatrixResult && (
                <div className='calc-result'>
                  <OlBarChart
                    title={`${data.characters[olMatrixResult.carrySlug].name} — free OL lines`}
                    subtitle={`${cellLabel({ ...olCell, invest: '8of12' })} · 180s`}
                    element={data.characters[olMatrixResult.carrySlug].element}
                    bars={olMatrixResult.results.map((r) => ({
                      label: r.label,
                      damage: r.damage,
                      gainPct: r.gainPct,
                    }))}
                  />
                  {olTable(olMatrixResult.baseline, olMatrixResult.results)}
                  <button
                    className='calc-run'
                    title='Send these best lines to the Overload Roll Sim at T11 and estimate the roll cost'
                    onClick={() => goToOlSim(olMatrixResult.results)}
                  >
                    Calculate chance to roll →
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <p className='muted'>
                Pick one carry, then build one or more <b>4-nikke support teams</b>.
                Every unit runs the 8/12 loadout; you get one ranked chart per support
                team so you can see how the best overload spread shifts with support.
                Boss options come from the teamwide row above.
              </p>
              <div className='field'>
                <label>Carry — unit to optimize</label>
                {carryCu ? (
                  <div className='chips'>
                    <button
                      className='chip'
                      title='change'
                      onClick={() => {
                        setOlCustomCarry(null);
                        setOlCustomResults(null);
                      }}
                    >
                      {carryCu.name} ({carryCu.weapon} · {carryCu.element}) ×
                    </button>
                  </div>
                ) : (
                  <CharSearch
                    placeholder='pick a carry…'
                    exclude={[]}
                    onPick={(slug) => {
                      setOlCustomCarry(slug);
                      setOlCustomResults(null);
                    }}
                  />
                )}
              </div>

              {olSupportTeams.map((team, ti) => (
                <div className='dps-group-block' key={ti}>
                  <div className='dps-group-head'>
                    <span className='card-group-label'>
                      support team {ti + 1} — {team.length}/4
                    </span>
                    {olSupportTeams.length > 1 && (
                      <button
                        className='chip'
                        title='remove team'
                        onClick={() => editSupport((ts) => ts.filter((_, j) => j !== ti))}
                      >
                        remove team ×
                      </button>
                    )}
                  </div>
                  <div className='chips'>
                    {team.map((slug) => (
                      <button
                        key={slug}
                        className='chip'
                        title='remove'
                        onClick={() =>
                          editSupport((ts) =>
                            ts.map((t, j) =>
                              j === ti ? t.filter((s) => s !== slug) : t,
                            ),
                          )
                        }
                      >
                        {data.characters[slug]?.name ?? slug} ×
                      </button>
                    ))}
                  </div>
                  {team.length < 4 && (
                    <CharSearch
                      placeholder='add support nikke…'
                      exclude={[...(olCustomCarry ? [olCustomCarry] : []), ...team]}
                      onPick={(slug) =>
                        editSupport((ts) =>
                          ts.map((t, j) => (j === ti ? [...t, slug] : t)),
                        )
                      }
                    />
                  )}
                </div>
              ))}
              <button
                className='ol-add'
                onClick={() => editSupport((ts) => [...ts, []])}
              >
                + add support team
              </button>
              <button
                className='calc-run'
                onClick={runOlCustom}
                disabled={!carryCu || !olCustomTeamsValid.length || calcBusy}
              >
                {calcBusy ? 'Running…' : 'Rank overload lines'}
              </button>
              {!olCustomTeamsValid.length && carryCu && (
                <p className='muted'>Fill at least one support team with 4 nikkes.</p>
              )}

              {olCustomResults?.map((res, i) => (
                <div className='calc-result' key={i}>
                  <OlBarChart
                    title={`${carryCu?.name ?? 'Carry'} — support team ${i + 1}`}
                    subtitle={res.teamSlugs
                      .map((s) => data.characters[s]?.name ?? s)
                      .join(' · ')}
                    element={carryCu?.element}
                    bars={res.results.map((r) => ({
                      label: r.label,
                      damage: r.damage,
                      gainPct: r.gainPct,
                    }))}
                  />
                  {olTable(res.baseline, res.results)}
                  <button
                    className='calc-run'
                    title='Send these best lines to the Overload Roll Sim at T11 and estimate the roll cost'
                    onClick={() => goToOlSim(res.results)}
                  >
                    Calculate chance to roll →
                  </button>
                </div>
              ))}
            </>
          )}
        </section>
      );
    }
    if (tab === 'olsim') {
      const fmtN = (n: number) => Math.round(n).toLocaleString();
      // Modules shown to 1 decimal so per-piece values stay additive to the full-build
      // total (whole-number rounding made 66×4 read as 264 but the total shows 265).
      const fmtMod = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      const costCol = (s: McSummary) =>
        olSimLockMode === 'permanent'
          ? `${fmtMod(s.moduleCostPerm.mean)}`
          : `${fmtMod(s.moduleCostTemp.mean)} + ${fmtN(s.tempLocks.mean)}`;
      const modP95 = (s: McSummary) => fmtN(olSimLockMode === 'permanent' ? s.moduleCostPerm.p95 : s.moduleCostTemp.p95);
      const gridStyle = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
        gap: 12,
        marginTop: 12,
      } as const;
      const lineRow = (line: OlSimLine, onKey: (k: OlKey | '') => void, onTier: (t: number) => void) => (
        <div className='field' style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <select value={line.key} style={{ flex: 1 }} onChange={(e) => onKey(e.target.value as OlKey | '')}>
            <option value=''>— none —</option>
            {OL_SIM_KEYS.map((k) => (
              <option key={k} value={k}>{OL_KEY_LABEL[k]}</option>
            ))}
          </select>
          <select value={line.tier} disabled={!line.key} onChange={(e) => onTier(+e.target.value)}>
            {Array.from({ length: 15 }, (_, t) => t + 1).map((t) => (
              <option key={t} value={t}>T{t}</option>
            ))}
          </select>
        </div>
      );
      const lockModePills = (
        <div className='pills small'>
          <span className='muted' style={{ marginRight: 8 }}>Lock mode:</span>
          <button className={olSimLockMode === 'permanent' ? 'on' : ''} onClick={() => setOlSimLockMode('permanent')}>Permanent</button>
          <button className={olSimLockMode === 'temp' ? 'on' : ''} onClick={() => setOlSimLockMode('temp')}>Temp locks</button>
        </div>
      );
      // Smooth bell-curve of the total-rerolls distribution.
      const bellCurve = (total: McSummary) => {
        const d = total.density;
        const W = 620, H = 150, PAD = 6;
        let maxC = 1;
        for (const x of d) if (x.count > maxC) maxC = x.count;
        const maxX = d.length ? d[d.length - 1].hi : 1;
        const X = (v: number) => PAD + (v / maxX) * (W - 2 * PAD);
        const Y = (c: number) => H - PAD - (c / maxC) * (H - 2 * PAD);
        const pts = d.map((x) => [X(x.mid), Y(x.count)] as const);
        const line = pts.length ? 'M ' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L ') : '';
        const area = pts.length
          ? `M ${X(0).toFixed(1)} ${(H - PAD).toFixed(1)} L ` +
            pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L ') +
            ` L ${X(maxX).toFixed(1)} ${(H - PAD).toFixed(1)} Z`
          : '';
        const medX = X(Math.min(total.ops.pctiles.p50, maxX));
        return (
          <div>
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', maxWidth: 660, display: 'block' }}>
              <path d={area} fill='#5b8def' opacity={0.22} />
              <path d={line} fill='none' stroke='#5b8def' strokeWidth={2} />
              <line x1={medX} y1={PAD} x2={medX} y2={H - PAD} stroke='currentColor' strokeDasharray='4 3' opacity={0.5} />
            </svg>
            <div className='muted' style={{ display: 'flex', justifyContent: 'space-between', maxWidth: 660, fontVariantNumeric: 'tabular-nums' }}>
              <span>0 rerolls</span>
              <span>median {total.ops.pctiles.p50}</span>
              <span>p95 {total.ops.pctiles.p95}</span>
            </div>
          </div>
        );
      };
      const resultsBlock = (result: { perPiece: McSummary[]; total: McSummary }) => {
        const total = result.total;
        return (
          <div className='calc-result'>
            <table>
              <thead>
                <tr>
                  <th>piece</th>
                  <th className='r'>exp rolls</th>
                  <th className='r'>p95</th>
                  <th className='r'>phase 1 / 2</th>
                  <th className='r'>{olSimLockMode === 'permanent' ? 'modules' : 'modules + temp-locks'}</th>
                  <th className='r'>p95</th>
                </tr>
              </thead>
              <tbody>
                {result.perPiece.map((s, i) => (
                  <tr key={i}>
                    <td className='muted'>piece {i + 1}</td>
                    <td className='r'>{s.ops.mean.toFixed(1)}</td>
                    <td className='r muted'>{s.ops.pctiles.p95}</td>
                    <td className='r muted'>{s.phase1Rerolls.mean.toFixed(1)} / {s.phase2Resets.mean.toFixed(1)}</td>
                    <td className='r'>{costCol(s)}</td>
                    <td className='r muted'>{modP95(s)}</td>
                  </tr>
                ))}
                <tr className='hl'>
                  <td><b>full build</b></td>
                  <td className='r'><b>{total.ops.mean.toFixed(1)}</b></td>
                  <td className='r'>{total.ops.pctiles.p95}</td>
                  <td className='r'>{total.phase1Rerolls.mean.toFixed(1)} / {total.phase2Resets.mean.toFixed(1)}</td>
                  <td className='r'><b>{costCol(total)}</b></td>
                  <td className='r'>{modP95(total)}</td>
                </tr>
              </tbody>
            </table>
            <p className='muted' style={{ marginTop: 12 }}>
              Distribution — total rerolls to finish the whole build (median {total.ops.pctiles.p50}, p95 {total.ops.pctiles.p95}):
            </p>
            {bellCurve(total)}
            {total.censoredFrac > 0 && (
              <p className='muted'>⚠ {(total.censoredFrac * 100).toFixed(1)}% of trials hit the op cap (mean is a lower bound).</p>
            )}
          </div>
        );
      };

      const setCalcLine = (ci: number, li: number, patch: Partial<OlSimLine>) =>
        setOlSimCards((cards) => cards.map((c, i) => (i === ci ? c.map((l, j) => (j === li ? { ...l, ...patch } : l)) : c)));
      const setCurLine = (ci: number, which: 'current' | 'desired', li: number, patch: Partial<OlSimLine>) =>
        setOlSimCurrent((cards) =>
          cards.map((c, i) => (i === ci ? { ...c, [which]: c[which].map((l, j) => (j === li ? { ...l, ...patch } : l)) } : c)));

      const calcPanel = (
        <>
          <p className='muted'>
            Estimate the reroll cost to hit a target build from scratch. Set up to 3 target lines
            per piece (stat + minimum tier). The sim runs the two-phase T11 method — reroll for the
            right stats, locking as you go, then value-reset each line up to tier.
          </p>
          {lockModePills}
          <div style={gridStyle}>
            {olSimCards.map((card, ci) => (
              <div key={ci} className='dps-group-block'>
                <div className='card-group-label'>OL piece {ci + 1}</div>
                {card.map((line, li) => (
                  <Fragment key={li}>
                    {lineRow(line, (k) => setCalcLine(ci, li, { key: k }), (t) => setCalcLine(ci, li, { tier: t }))}
                  </Fragment>
                ))}
              </div>
            ))}
          </div>
          <button className='calc-run' onClick={runOlSim} disabled={calcBusy}>
            {calcBusy ? 'Running…' : 'Run roll sim'}
          </button>
          {olSimResult && resultsBlock(olSimResult)}
        </>
      );

      const currentPanel = (
        <>
          <p className='muted'>
            Recalc from where you are. For each piece, enter the lines you <b>already have</b> (top,
            with their real tier) and the lines you <b>want</b> (bottom, as a minimum tier). The sim
            measures the remaining reroll cost from your current state.
          </p>
          {lockModePills}
          <div style={gridStyle}>
            {olSimCurrent.map((card, ci) => (
              <div key={ci} className='dps-group-block'>
                <div className='card-group-label'>OL piece {ci + 1}</div>
                <div className='muted' style={{ fontSize: '0.82em', margin: '4px 0 2px' }}>Current lines</div>
                {card.current.map((line, li) => (
                  <Fragment key={'c' + li}>
                    {lineRow(line, (k) => setCurLine(ci, 'current', li, { key: k }), (t) => setCurLine(ci, 'current', li, { tier: t }))}
                  </Fragment>
                ))}
                <div className='muted' style={{ fontSize: '0.82em', margin: '8px 0 2px' }}>Desired (min tier)</div>
                {card.desired.map((line, li) => (
                  <Fragment key={'d' + li}>
                    {lineRow(line, (k) => setCurLine(ci, 'desired', li, { key: k }), (t) => setCurLine(ci, 'desired', li, { tier: t }))}
                  </Fragment>
                ))}
              </div>
            ))}
          </div>
          <button className='calc-run' onClick={runOlSimCurrent} disabled={calcBusy}>
            {calcBusy ? 'Running…' : 'Run from current'}
          </button>
          {olSimCurrentResult && resultsBlock(olSimCurrentResult)}
        </>
      );

      const faqItem = (q: string, tldr: ReactNode, why: ReactNode) => (
        <div style={{ marginBottom: 22 }}>
          <h4 style={{ margin: '0 0 5px' }}>{q}</h4>
          <div>{tldr}</div>
          <div className='muted' style={{ marginTop: 5 }}><b>Why:</b> {why}</div>
        </div>
      );
      const faqPanel = (
        <div style={{ maxWidth: 780 }}>
          {faqItem(
            '1. Best way to roll an 8/12 T11+ set from scratch?',
            'Put Elemental Damage + ATK on all 4 pieces and stop there. Budget roughly 260 modules for the whole set.',
            (<>You only need <b>2 good lines per piece</b>, so ignore the third slot. On each piece, keep
              rerolling until Elem and ATK show up, lock each as it lands, then use value-reset to push
              both up to T11 or higher. In the sim that&rsquo;s about <b>145 rerolls / ~263 modules</b> for
              all four pieces. Locking early is totally fine here — there&rsquo;s no hard-to-get third line
              to wait on. Two good lines per piece is the best bang for your buck.</>),
          )}
          {faqItem(
            '2. Best way to roll a 12/12 T11+ set from scratch?',
            (<>Same plan, but fill all <b>3 lines</b> per piece (Elem + ATK + one kit line). Budget ~585
              modules — a bit over double an 8/12. One key tip: don&rsquo;t lock Line 1 early.</>),
            (<>The third line is what makes this pricey — about <b>2.2× the cost of 8/12</b> (~219 rerolls /
              ~584 modules). The big money-saver: <b>Line 1 is always there and easy to get back, so
              don&rsquo;t waste a lock on it</b> while you&rsquo;re still hunting for lines 2 and 3 — every
              roll you hold that lock quietly costs an extra module for nothing. The sim proves it: lock
              everything as you go = <b>~635 modules</b>; leave a weak Line 1 unlocked = <b>~584</b>; never
              lock Line 1 at all = <b>~557</b>. And whether you lock Line 2 before or after Line 3 barely
              changes anything (about 2 modules either way), so don&rsquo;t sweat that part — the only rule
              that really matters is: don&rsquo;t lock a junk Line 1.</>),
          )}
          {faqItem(
            '3. I hit a T15 (black line) on Line 1 but nothing else yet — lock it?',
            'Yes, lock it. A T15 is basically the jackpot — you almost never want to throw it back.',
            (<>A specific stat hitting T15 happens only about <b>1 in 1,000 rolls</b>, so tossing it and
              hoping to get it again is a bad bet. Keeping it (lock) vs letting it re-roll away (toss),
              cost to finish that one piece:
              <ul style={{ margin: '6px 0' }}>
                <li><b>8/12:</b> keep ~<b>64 modules</b> vs toss ~69 → keeping is actually <i>cheaper</i>, and you get a max line. Easy call.</li>
                <li><b>12/12:</b> keep ~<b>165</b> vs toss ~142 → keeping costs about <b>23 extra modules</b> (you pay to hold that lock while grinding the other two lines). Still worth it for a max line unless you&rsquo;re totally out of modules.</li>
              </ul>
              Bottom line: keep the jackpot line. The sim does this automatically — it holds Line 1 only
              when it&rsquo;s already good enough and leaves a weak Line 1 unlocked.</>),
          )}
          {faqItem(
            '4. What are the odds to roll T11 or higher?',
            'About 1 in 20 (5%) for any single line.',
            (<>Every line that rolls has a <b>5% chance</b> to land in the top tier band (T11–T15). Because
              that&rsquo;s so rare, most of your effort isn&rsquo;t getting the right stat — it&rsquo;s
              value-resetting a line over and over to shove it up into that top band. That&rsquo;s where
              most of the cost goes.</>),
          )}
          {faqItem(
            '5. What are the odds to roll all 3 lines on one item in a single roll?',
            'About 1 in 7 (15%).',
            (<>A piece always shows Line 1, shows Line 2 half the time (<b>50%</b>), and Line 3 only
              <b>30%</b> of the time. Multiply them: 100% × 50% × 30% = <b>15%</b>. That rare third line is
              exactly why 12/12 sets cost so much more than 8/12.</>),
          )}
        </div>
      );

      return (
        <section className='calc-tab'>
          <h2>Overload Roll Sim</h2>
          <div className='pills small dps-mode'>
            <button className={olSimSub === 'calc' ? 'on' : ''} onClick={() => setOlSimSub('calc')}>Roll Calculator</button>
            <button className={olSimSub === 'current' ? 'on' : ''} onClick={() => setOlSimSub('current')}>Roll from Current</button>
            <button className={olSimSub === 'faq' ? 'on' : ''} onClick={() => setOlSimSub('faq')}>FAQ</button>
          </div>
          {olSimSub === 'calc' && calcPanel}
          {olSimSub === 'current' && currentPanel}
          {olSimSub === 'faq' && faqPanel}
        </section>
      );
    }
    if (tab === 'doll') {
      const fmtN = (n: number) => Math.round(n).toLocaleString();
      const tierChip = (t: DollTier) => (
        <span style={{ background: t === 'SSR' ? '#c79a2e' : t === 'SR' ? '#7d5fd0' : '#4f7fe0', color: '#fff', padding: '1px 6px', borderRadius: 9, fontSize: '0.78em', whiteSpace: 'nowrap' }}>{DOLL_TIER_LABEL[t]}</span>
      );
      const usageGuide = (dp: DollDp, from: number) => {
        const cells = Array.from({ length: 15 - from }, (_, i) => {
          const L = from + i; return { L, t: (dp.tier[L]?.[0] ?? 'R') as DollTier };
        });
        const rows = Math.ceil(cells.length / 3);
        // 3 columns, filled top-to-bottom so each column is a checkpoint band (0–5 / 5–10 / 10–15).
        return (
          <div
            style={{
              display: 'grid',
              gridAutoFlow: 'column',
              gridTemplateRows: `repeat(${rows}, auto)`,
              gridTemplateColumns: 'repeat(3, max-content)',
              gap: '5px 28px',
              margin: '8px 0',
            }}
          >
            {cells.map(({ L, t }) => (
              <div key={L} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.86em' }}>
                <span className='muted' style={{ fontVariantNumeric: 'tabular-nums', minWidth: 38 }}>{L}→{L + 1}</span>
                {tierChip(t)}
              </div>
            ))}
          </div>
        );
      };
      const dollBell = (mc: DollSummary) => {
        const d = mc.hist, W = 620, H = 120, PAD = 6;
        let maxC = 1; for (const x of d) if (x.count > maxC) maxC = x.count;
        const maxX = d.length ? d[d.length - 1].hi : 1;
        const X = (v: number) => PAD + (v / maxX) * (W - 2 * PAD);
        const Y = (c: number) => H - PAD - (c / maxC) * (H - 2 * PAD);
        const pts = d.map((x) => [X(x.mid), Y(x.count)] as const);
        const line = pts.length ? 'M ' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L ') : '';
        const area = pts.length ? `M ${X(0).toFixed(1)} ${(H - PAD).toFixed(1)} L ` + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L ') + ` L ${X(maxX).toFixed(1)} ${(H - PAD).toFixed(1)} Z` : '';
        return (
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', maxWidth: 660, display: 'block' }}>
            <path d={area} fill='#5b8def' opacity={0.22} />
            <path d={line} fill='none' stroke='#5b8def' strokeWidth={2} />
          </svg>
        );
      };
      const resultBlock = (rarity: DollRarity, from: number, dp: DollDp, mc: DollSummary) => (
        <div className='calc-result'>
          <p className='muted'>Which kit to feed at each phase ({rarity} doll {from}→15) — the simple one-tier-per-phase guide:</p>
          {usageGuide(dp, from)}
          <p style={{ margin: '8px 0 2px' }}>
            Expected kits to finish: <b>Blue {mc.byTier.R.toFixed(1)}</b> · <b>Purple {mc.byTier.SR.toFixed(1)}</b> · <b>Gold {mc.byTier.SSR.toFixed(1)}</b>{' '}
            <span className='muted'>({mc.feeds.mean.toFixed(0)} kits total)</span>
          </p>
          <p className='muted' style={{ marginTop: 8 }}>Distribution of total cost (median {fmtN(mc.cost.p50)}):</p>
          {dollBell(mc)}
        </div>
      );
      const rarityPills = (val: DollRarity, set: (r: DollRarity) => void) => (
        <div className='pills small'>
          <button className={val === 'R' ? 'on' : ''} onClick={() => set('R')}>R doll</button>
          <button className={val === 'SR' ? 'on' : ''} onClick={() => set('SR')}>SR doll</button>
        </div>
      );
      const phaseSelect = (val: number, set: (n: number) => void) => (
        <select value={val} onChange={(e) => set(+e.target.value)}>
          {Array.from({ length: 15 }, (_, i) => i).map((p) => <option key={p} value={p}>phase {p}</option>)}
        </select>
      );
      const perDoll = (t: DollTier) => (dollCal ? dollModel.kitSupply[t] / (dollCal.dollsPer1000Mixed / 1000) : 0);
      const throughputHeadline = dollCal ? (
        <div className='calc-result' style={{ marginBottom: 10 }}>
          <div style={{ fontSize: '1.05em' }}><b>{dollCal.dollsPer1000Mixed.toFixed(0)} SR dolls per 1000 kit-boxes</b> at best (spend every kit), or <b>{dollCal.dollsPer1000Pure.toFixed(0)}</b> with the simple one-tier-per-phase rule.</div>
          <div className='muted' style={{ marginTop: 4 }}>Best mix ≈ {perDoll('R').toFixed(0)} Blue · {perDoll('SR').toFixed(0)} Purple · {perDoll('SSR').toFixed(0)} Gold per doll. Use every kit — put Gold on the phase 10→15 push.</div>
        </div>
      ) : (<p className='muted'>Computing the optimal plan…</p>);

      const dollCalcPanel = (
        <>
          <p className='muted'>The cheapest way to level a doll to the SR phase-15 target, from your kit boxes. Defaults to a fresh SR doll (0→15).</p>
          {throughputHeadline}
          <div className='field' style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {rarityPills(dollRarity, (r) => { setDollRarity(r); setDollResult(null); })}
            <span className='muted'>from</span>{phaseSelect(dollFrom, (n) => { setDollFrom(n); setDollResult(null); })}
          </div>
          <button className='calc-run' onClick={runDollCalc} disabled={calcBusy}>{calcBusy ? 'Running…' : 'Calculate'}</button>
          {dollResult && resultBlock(dollResult.rarity, dollResult.from, dollResult.dp, dollResult.mc)}
        </>
      );
      const dollCurrentPanel = (
        <>
          <p className='muted'>Enter the doll you have now — see the kits remaining to reach phase 15 and what to feed next.</p>
          <div className='field' style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {rarityPills(dollCurRarity, (r) => { setDollCurRarity(r); setDollCurResult(null); })}
            <span className='muted'>currently at</span>{phaseSelect(dollCurPhase, (n) => { setDollCurPhase(n); setDollCurResult(null); })}
          </div>
          <button className='calc-run' onClick={runDollCurrent} disabled={calcBusy}>{calcBusy ? 'Running…' : 'Calculate from here'}</button>
          {dollCurResult && (
            <>
              <div className='calc-result' style={{ marginBottom: 8 }}>
                <b>Feed next: {DOLL_TIER_LABEL[(dollCurResult.dp.tier[dollCurResult.from]?.[0] ?? 'R') as DollTier]}</b>
              </div>
              {resultBlock(dollCurResult.rarity, dollCurResult.from, dollCurResult.dp, dollCurResult.mc)}
            </>
          )}
        </>
      );
      const dollFaq = (q: string, tldr: ReactNode, why: ReactNode) => (
        <div style={{ marginBottom: 22 }}>
          <h4 style={{ margin: '0 0 5px' }}>{q}</h4>
          <div>{tldr}</div>
          <div className='muted' style={{ marginTop: 5 }}><b>Why:</b> {why}</div>
        </div>
      );
      const mixed = dollCal ? dollCal.dollsPer1000Mixed.toFixed(0) : '~77';
      const pure = dollCal ? dollCal.dollsPer1000Pure.toFixed(0) : '~63';
      const dollFaqPanel = (
        <div style={{ maxWidth: 780 }}>
          {dollFaq('1. What is the overall strategy for leveling dolls?',
            (<>Use <b>all</b> your kits — don&rsquo;t hoard. Blue kits are the workhorse; spend Purple and Gold to relieve the Blue crunch, and put <b>Gold on the phase 10→15 push</b>. Done right that&rsquo;s about <b>{mixed} SR dolls per 1000 kit-boxes</b>.</>),
            (<>Kits come mostly Blue with a little Purple and Gold, and the fastest plan spends <i>every</i> kit — leaving Purple/Gold in your bag just wastes them. The simplest version (one tier per phase) still gets ~<b>{pure}</b> dolls per 1000 boxes: mostly Blue, Purple through the mid-phases, Gold for the final 10→15 climb. Splitting some phases between two tiers recovers the last ~20%, but the simple rule is close and much easier to follow.</>))}
          {dollFaq('2. Better to level rare (R) dolls 0→15 first, or combine them?',
            (<><b>Combine (trade) them.</b> Four spare R dolls traded are worth far more than leveling one to 15 to launder.</>),
            (<>Leveling an R doll to 15 to launder it into an SR nets only about <b>0.9 kit-value</b> — it just skips the short SR 0→5 grind and still consumes the SR doll. Trading 4 R dolls is worth roughly <b>10.6 kit-value each</b> (kits plus a 15% shot at an SR doll). So trade your spares — only launder when you specifically need the guaranteed SR-doll head-start.</>))}
        </div>
      );

      return (
        <section className='calc-tab'>
          <h2>Doll Leveling</h2>
          <div className='pills small dps-mode'>
            <button className={dollSub === 'calc' ? 'on' : ''} onClick={() => setDollSub('calc')}>Doll Calculator</button>
            <button className={dollSub === 'current' ? 'on' : ''} onClick={() => setDollSub('current')}>Level from Current</button>
            <button className={dollSub === 'faq' ? 'on' : ''} onClick={() => setDollSub('faq')}>FAQ</button>
          </div>
          {dollSub === 'calc' && dollCalcPanel}
          {dollSub === 'current' && dollCurrentPanel}
          {dollSub === 'faq' && dollFaqPanel}
        </section>
      );
    }
    return null;
  };

  const inTools = (CALC_TABS.find((t) => t.key === tab)?.group ?? 'sim') === 'tools';
  return (
    <div className='app'>
      <header>
        <div className='header-row'>
          <h1>NIKKE Solo Raid Sim</h1>
          {!inTools && (<div className='share-actions'>
            {user && (
              <>
                <button
                  className='share-btn'
                  onClick={onSaveTeam}
                  disabled={slots.every((s) => !s.slug)}
                  title='save this team + full loadout to your account'
                >
                  {savedFlash ? '✓ Saved' : '💾 Save team'}
                </button>
                <button
                  className='share-btn'
                  onClick={openTeams}
                  title='your saved teams'
                >
                  📋 My teams
                </button>
              </>
            )}
            <button
              className='share-btn'
              onClick={onShare}
              disabled={slots.every((s) => !s.slug)}
              title='copy a link that prefills this team'
            >
              {shared ? '✓ Link copied' : '🔗 Share team'}
            </button>
            <button
              className='share-btn'
              onClick={onShareImage}
              disabled={!r}
              title='copy a summary image of the results to your clipboard'
            >
              {imaged ? '✓ Copied' : '🖼 Copy image'}
            </button>
          </div>)}
          {(tab === 'team' || tab === 'roster') && (
            <div className='share-actions'>
              <button
                className='share-btn'
                onClick={() => void onGenLink(tab)}
                title='copy a link that regenerates this result (boss + loadout + blocked list)'
              >
                {shared ? '✓ Link copied' : '🔗 Generate link'}
              </button>
              <button
                className='share-btn'
                onClick={() =>
                  tab === 'team'
                    ? teamResult && void shareTeam(teamResult)
                    : rosterResults && void shareRoster(rosterResults)
                }
                disabled={tab === 'team' ? !teamResult : !rosterResults}
                title='copy a summary image of the result to your clipboard'
              >
                {imaged ? '✓ Copied' : '🖼 Copy image'}
              </button>
            </div>
          )}
        </div>
        {!inTools && (
          <p className='muted'>
            180s fight · auto-mode
          </p>
        )}
      </header>

      {(() => {
        const groupTabs = CALC_TABS.filter(
          (t) => t.group === (CALC_TABS.find((x) => x.key === tab)?.group ?? 'sim'),
        );
        return mobileNav ? (
          <div className='tabs-dd-wrap'>
            <TabDropdown
              label='Tool'
              items={groupTabs.map((t) => ({
                key: t.key,
                label: t.label,
                active: tab === t.key,
                onSelect: () => selectTab(t.key),
              }))}
            />
          </div>
        ) : (
          <nav className='tabs-bar'>
            {groupTabs.map((t) => (
              <button
                key={t.key}
                className={tab === t.key ? 'on' : ''}
                onClick={() => selectTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        );
      })()}

      {/* Global boss options + Apply-to-all loadout: used by the Sim, DPS Test, and
          Overload Calc custom mode. The DPS Chart tab and the Overload matrix mode are
          self-contained (their own matrix selector defines the boss), and the Charge
          Speed tab is a pure calculator, so hide this block on those. */}
      {tab !== 'dpschart' &&
        tab !== 'charge' &&
        tab !== 'olsim' &&
        tab !== 'doll' &&
        !(tab === 'overload' && olMode === 'matrix') && (<>
      <section className='global'>
        <div className='field'>
          <label title='the element that is strong against the boss'>
            Boss weakness
          </label>
          <PillGrid>
            {ELEMENTS.map((e) => (
              <button
                key={e ?? 'none'}
                className={weakness === e ? 'on' : ''}
                onClick={() => setWeakness(e)}
              >
                {e ?? 'None'}
              </button>
            ))}
          </PillGrid>
        </div>
        <div className='field'>
          <label>Boss DEF</label>
          <input
            className='num'
            value={bossDef}
            onChange={(e) => setBossDef(e.target.value)}
          />
        </div>
        <div className='field'>
          <label>Core visibility</label>
          <PillGrid>
            {CORE_PRESETS.map((p) => (
              <button
                key={p.label}
                className={!coreCustom && core === p.value ? 'on' : ''}
                onClick={() => {
                  setCore(p.value);
                  setCoreCustom(false);
                }}
              >
                {p.label}
              </button>
            ))}
            <button
              className={coreCustom ? 'on' : ''}
              onClick={() => setCoreCustom(true)}
            >
              Custom
            </button>
          </PillGrid>
          {coreCustom && (
            <input
              className='num'
              style={{ marginTop: 6 }}
              value={coreCustomVal}
              onChange={(e) => setCoreCustomVal(e.target.value)}
              placeholder='%'
            />
          )}
        </div>
        <div className='field'>
          <label>Synchro level</label>
          <div className='pills'>
            <input
              className='num'
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              title='synchro level'
            />
          </div>
        </div>
      </section>

      <section className='global bulk'>
        <div className='field'>
          <label>Preset</label>
          <div className='pills small'>
            <button
              className={
                'scope-lock' +
                (allHave(
                  (s) =>
                    s.cubeId === 'none' &&
                    !s.doll &&
                    s.ol === 0 &&
                    s.stars === 3 &&
                    s.core === 7,
                ) && level === '400'
                  ? ' on'
                  : '')
              }
              title='no cubes · no doll · OL0 gear · 3★ / 7 core · 400 synchro'
              onClick={applyScopeLock}
            >
              🔒 Scope Lock
            </button>
          </div>
        </div>
        <div className='field'>
          <label>All cubes</label>
          <PillGrid className='small'>
            {CUBE_IDS.map((id) => (
              <button
                key={id}
                className={allHave((s) => s.cubeId === id) ? 'on' : ''}
                onClick={() => setAll({ cubeId: id })}
              >
                {cubes.cubes[id].name}
              </button>
            ))}
            <button
              className={allHave((s) => s.cubeId === 'none') ? 'on' : ''}
              onClick={() => setAll({ cubeId: 'none' })}
            >
              None
            </button>
          </PillGrid>
        </div>
        <div className='field'>
          <label>All cube levels</label>
          <PillGrid className='small'>
            {CUBE_LEVELS.map((l) => (
              <button
                key={l}
                className={
                  allHave((s) => !s.cubeCustom && s.cubeLevel === l) ? 'on' : ''
                }
                onClick={() => setAll({ cubeLevel: l, cubeCustom: false })}
              >
                L{l}
              </button>
            ))}
          </PillGrid>
        </div>
        <div className='field'>
          <label>All gear</label>
          <PillGrid className='small'>
            <button
              className={allHave((s) => s.ol === 0) ? 'on' : ''}
              onClick={() => setAll({ ol: 0 })}
            >
              OL 0
            </button>
            <button
              className={allHave((s) => s.ol === 5) ? 'on' : ''}
              onClick={() => setAll({ ol: 5 })}
            >
              OL 5
            </button>
          </PillGrid>
        </div>
        <div className='field'>
          <label>All dolls</label>
          <PillGrid className='small'>
            <button
              className={allHave((s) => s.doll) ? 'on' : ''}
              onClick={() => setAll({ doll: true })}
            >
              Doll 15
            </button>
            <button
              className={allHave((s) => !s.doll) ? 'on' : ''}
              onClick={() => setAll({ doll: false })}
            >
              none
            </button>
          </PillGrid>
        </div>
        <div className='field'>
          <label>All stars</label>
          <PillGrid className='small'>
            {STAR_LEVELS.map((st) => (
              <button
                key={st}
                className={allHave((s) => s.stars === st) ? 'on' : ''}
                onClick={() => setAll({ stars: st })}
              >
                {st}
              </button>
            ))}
          </PillGrid>
        </div>
        <div className='field'>
          <label>All cores</label>
          <PillGrid className='small'>
            {CORE_LEVELS.map((cr) => (
              <button
                key={cr}
                className={allHave((s) => s.core === cr) ? 'on' : ''}
                onClick={() => setAll({ core: cr })}
              >
                {cr}
              </button>
            ))}
          </PillGrid>
        </div>
        <div className='field'>
          <label title='sets S1, S2 and Burst for every nikke'>
            All skills
          </label>
          <PillGrid className='small'>
            {SKILL_LEVELS.map((lv) => (
              <button
                key={lv}
                className={
                  allHave(
                    (s) =>
                      s.skill1 === lv && s.skill2 === lv && s.burst === lv,
                  )
                    ? 'on'
                    : ''
                }
                onClick={() => setAll({ skill1: lv, skill2: lv, burst: lv })}
              >
                {lv}/{lv}/{lv}
              </button>
            ))}
          </PillGrid>
        </div>
      </section>
      </>)}

      {tab === 'sim' && (
        <>
      {compactTeam ? (
        <section className='team compact'>
          <div className='team-strip'>
            {slots.map((slot, i) => {
              const c = slot.slug ? data.characters[slot.slug] : null;
              return (
                <button
                  key={i}
                  ref={teamReorder.register(i)}
                  className={
                    'team-chip' +
                    (teamReorder.dragIndex === i ? ' dragging' : '') +
                    (expandedSlot === i ? ' active' : '')
                  }
                  title={c?.name ?? `slot ${i + 1}`}
                  {...teamReorder.handleProps(i)}
                >
                  {c?.imageUrl ? (
                    <img src={c.imageUrl} alt={c.name} draggable={false} />
                  ) : (
                    <span className='chip-empty'>?</span>
                  )}
                  <span className='chip-num'>{i + 1}</span>
                </button>
              );
            })}
          </div>
          {expandedSlot >= 0 &&
            renderCard(
              slots[expandedSlot],
              (p) => setSlot(expandedSlot, p),
              `slot ${expandedSlot + 1}`,
              undefined,
              true,
            )}
        </section>
      ) : (
        <section className='team'>
          {slots.map((slot, i) => (
            <Fragment key={i}>
              {renderCard(slot, (p) => setSlot(i, p), `slot ${i + 1}`, {
                register: teamReorder.register(i),
                imageHandleProps: teamReorder.handleProps(i, (_, e) => {
                  const input = (e.currentTarget as HTMLElement)
                    .closest('.card')
                    ?.querySelector<HTMLInputElement>('.picker input');
                  input?.focus();
                }),
                dragging: teamReorder.dragIndex === i,
              })}
            </Fragment>
          ))}
        </section>
      )}

      {(
        <section className='ol-calc'>
          <div className='toggles'>
            <button onClick={() => setShowOlCalc(!showOlCalc)}>
              {showOlCalc ? 'hide' : 'show'} best-OL calculator
            </button>
            {showOlCalc && (
              <label className='ol-tier'>
                tier
                <input
                  className='num'
                  type='number'
                  min={1}
                  max={15}
                  value={olTier}
                  onChange={(e) =>
                    setOlTier(
                      Math.min(15, Math.max(1, Number(e.target.value) || 11)),
                    )
                  }
                />
              </label>
            )}
          </div>
          {showOlCalc &&
            (() => {
              const tv = olTierValues(olTier);
              const filled = slots
                .map((s) => (s.slug ? data.characters[s.slug] : null))
                .filter(Boolean) as any[];
              if (!filled.length)
                return <div className='notes'>pick nikkes to analyze</div>;
              return (
                <div className='notes'>
                  <p className='muted'>
                    Assumes 8/12 lines are 4× ATK + 4× ELE; the remaining 4 are
                    free. Values shown at tier {olTier} ({tv.ammo}% ammo,{' '}
                    {tv.chargespd}% charge speed per line). For the damage-ranked
                    pick of the best 4 lines, use the <b>Optimize Overload</b> tab.
                  </p>
                  {filled.map((c) => {
                    const isCharge = c.weapon === 'RL' || c.weapon === 'SR';
                    const candidates = [
                      'Max Ammo',
                      'Crit Rate',
                      'Crit DMG',
                      ...(isCharge ? ['Charge Speed', 'Charge DMG'] : []),
                    ];
                    const ammoRows = ammoLineRows(c.ammo, tv.ammo);
                    const bps = ammoBreakpoints(c.ammo, tv.ammo);
                    return (
                      <div key={c.slug} className='ol-calc-unit'>
                        <b>
                          {c.name}{' '}
                          <span className='muted'>
                            ({c.weapon} · base {c.ammo} ammo)
                          </span>
                        </b>
                        <div className='muted'>
                          remaining-4 candidates: {candidates.join(', ')}
                        </div>
                        <div className='ol-calc-cols'>
                          <div>
                            <div className='muted'>max ammo by # of lines</div>
                            <ul>
                              {ammoRows.map((r) => (
                                <li key={r.lines}>
                                  {r.lines}× (+{r.pct.toFixed(1)}%) →{' '}
                                  <b>{r.ammo}</b> ammo
                                </li>
                              ))}
                            </ul>
                            <div className='muted'>ammo breakpoints</div>
                            <ul>
                              {bps.length ? (
                                bps.map((b) => (
                                  <li key={b.ammo}>
                                    <b>{b.ammo}</b> ammo needs ≥
                                    {b.minPct.toFixed(1)}% ({b.linesNeeded} line
                                    {b.linesNeeded > 1 ? 's' : ''})
                                  </li>
                                ))
                              ) : (
                                <li>none within 4 lines</li>
                              )}
                            </ul>
                          </div>
                          {isCharge && (
                            <div>
                              <div className='muted'>
                                charge-speed breakpoints
                              </div>
                              <ul>
                                {chargeSpeedRows(tv.chargespd).map((r) => (
                                  <li key={r.target}>
                                    {r.target}% →{' '}
                                    {r.linesNeeded <= 4 ? (
                                      <>
                                        {r.linesNeeded} line
                                        {r.linesNeeded > 1 ? 's' : ''} (
                                        {r.actual.toFixed(1)}%)
                                      </>
                                    ) : (
                                      <span className='muted'>&gt;4 lines</span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
        </section>
      )}

      {sim.error && <div className='banner'>{sim.error}</div>}
      {sim.compWarning && <div className='banner warn'>{sim.compWarning}</div>}

      {r && (
        <section className='results'>
          <div className='summary muted'>
            team <b className='big'>{fmt(r.teamDamage)}</b> · {fmt(r.teamDps)}{' '}
            DPS · {r.fullBursts} full bursts ·{' '}
            {(r.fullBurstUptime * 100).toFixed(0)}% FB uptime ·{' '}
            {r.rotationStallSec.toFixed(1)}s stalled
          </div>
          <table>
            <thead>
              <tr>
                <th></th>
                <th>nikke</th>
                <th className='r'>damage</th>
                <th className='r'>share</th>
                <th className='r'>DPS</th>
                <th className='r'>normal / skill / burst</th>
                <th className='r'>bursts</th>
              </tr>
            </thead>
            <tbody>
              {r.units.map((u) => (
                <tr key={u.position}>
                  <td className='muted'>{u.position}</td>
                  <td>
                    {u.name}
                    {u.advantaged && (
                      <span className='adv' title='elemental advantage'>
                        {' '}
                        ▲
                      </span>
                    )}
                    {u.warnings.length > 0 && (
                      <span
                        title={`not fully modeled — ${u.warnings.length} skipped/unparsed effect${u.warnings.length > 1 ? 's' : ''} (see modeling notes)`}
                      >
                        {' '}
                        ⚠️
                      </span>
                    )}
                  </td>
                  <td className='r'>{fmt(u.totalDamage)}</td>
                  <td className='r share'>{(u.share * 100).toFixed(1)}%</td>
                  <td className='r'>{fmt(u.dps)}</td>
                  <td className='r muted'>
                    {fmt(u.breakdown.normal)} / {fmt(u.breakdown.skill)} /{' '}
                    {fmt(u.breakdown.burst)}
                  </td>
                  <td className='r'>{u.burstCasts}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className='toggles'>
            <button onClick={() => setShowBuffs(!showBuffs)}>
              {showBuffs ? 'hide' : 'show'} team buffs
            </button>
            <button onClick={() => setShowNotes(!showNotes)}>
              {showNotes ? 'hide' : 'show'} modeling notes
            </button>
            <button onClick={() => setShowRotation(!showRotation)}>
              {showRotation ? 'hide' : 'show'} rotation log
            </button>
          </div>
          {showBuffs && sim.teamBuffs && (
            <div className='notes'>
              {sim.teamBuffs.map((u) => (
                <div key={u.position}>
                  <b>{u.name}</b>
                  <ul>
                    {u.lines.length ? (
                      u.lines.map((n, i) => <li key={i}>{n}</li>)
                    ) : (
                      <li>no team buffs</li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          )}
          {showNotes && (
            <div className='notes'>
              {r.units.map((u) => {
                const notes = [...u.warnings];
                if (u.loadout.length)
                  notes.unshift(`loadout: ${u.loadout.join(' | ')}`);
                return (
                  <div key={u.position}>
                    <b>{u.name}</b>
                    <ul>
                      {notes.length ? (
                        notes.map((n, i) => <li key={i}>{n}</li>)
                      ) : (
                        <li>no notes</li>
                      )}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
          {showRotation && (
            <pre className='rotation'>{r.rotationLog.join('\n')}</pre>
          )}
        </section>
      )}
        </>
      )}

      {tab !== 'sim' && renderCalcTab()}

      {showTeams && (
        <div className='modal-backdrop' onClick={() => setShowTeams(false)}>
          <div className='modal' onClick={(e) => e.stopPropagation()}>
            <div className='modal-head'>
              <h2>My teams &amp; rosters</h2>
              <button className='modal-x' onClick={() => setShowTeams(false)}>
                ×
              </button>
            </div>
            <p className='muted'>
              Each saved team restores the full loadout — cubes, gear, dolls,
              dupes, skill levels and the boss options.
            </p>
            <button className='calc-run' onClick={onSaveTeam}>
              💾 Save current team
            </button>
            {authErr && <div className='banner warn'>{authErr}</div>}
            {teams.length === 0 && !authErr && (
              <div className='muted pad'>no saved teams yet</div>
            )}
            <ul className='team-list'>
              {teams.map((t) => (
                <li key={t.id}>
                  <div className='team-meta'>
                    <b>
                      {t.name}
                      {decodeBuild(t.code)?.roster && (
                        <span className='save-tag'>roster</span>
                      )}
                    </b>
                    <span className='muted'>
                      {(() => {
                        const b = decodeBuild(t.code);
                        if (b?.roster) {
                          const n = b.roster
                            .flat()
                            .filter((s) => s && data.characters[s]).length;
                          return `${n} unit${n === 1 ? '' : 's'} across 5 teams`;
                        }
                        const names = (b?.s ?? [])
                          .map((s) =>
                            s.slug ? (data.characters[s.slug]?.name ?? s.slug) : null,
                          )
                          .filter(Boolean);
                        return names.length ? names.join(' · ') : 'empty';
                      })()}
                    </span>
                  </div>
                  <div className='team-actions'>
                    <button className='load-btn' onClick={() => onLoadTeam(t)}>
                      Load
                    </button>
                    <button
                      className='chip'
                      title='delete'
                      onClick={() => onDeleteTeam(t)}
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <footer className='muted'>
        v1 assumptions: 0 enemy debuffs · full HP · auto-mode enabled · middle
        unit is the focused unit · burst order decided left to right · parts
        &amp; pierce in a later version
      </footer>
    </div>
  );
}
