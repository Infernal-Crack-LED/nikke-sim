import { Fragment, useEffect, useMemo, useState } from 'react';
import { runSim, type SimResult } from '../../src/engine/sim';
import { prepareTeam, type UnitOptions } from '../../src/prepare';
import type { OverrideFile } from '../../src/skills/index';
import type {
  DataFile,
  Element,
  LevelMultiplier,
  SimConfig,
} from '../../src/types';
import {
  drawTeamCard,
  cardHeight,
  CARD_W,
  type Canvas2DLike,
} from '../../src/share/teamCard';
import {
  encodeBuild,
  decodeBuild,
  BUILD_VERSION,
  type Build,
} from '../../src/share/build-code';
import {
  captureTokenFromUrl,
  clearToken,
  deleteTeam,
  fetchMe,
  fetchTeams,
  getToken,
  loginUrl,
  saveTeam,
  type AuthUser,
  type SavedTeam,
} from './auth';
import { makeCalc, type TeamResult } from '../../src/teamcalc';
import { bestOlAtTier, type BestOlAtTierResult } from '../../src/olcalc';
import charactersJson from '../../data/characters.json';
import cubesJson from '../../data/cubes.json';
import multJson from '../../data/level-multiplier.json';
import skillLevelsJson from '../../data/skill-levels.json';
import olLinesJson from '../../data/ol-lines.json';
import olTiersJson from '../../data/ol-tiers.json';

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

// Feature flag: OL line entry + best-OL breakpoints. Damage-ranked best-OL now
// lives in the Character Calc tab (src/olcalc.ts).
const OL_UI_ENABLED = true;

// Feature flag: the tab system + team/roster/character calculators. Backends in
// src/teamcalc.ts + src/olcalc.ts (heuristic search on the shared engine).
const CALC_TABS_ENABLED = true;

// Feature flag: Discord login + saved teams. Wired to the bakery-bot API
// (web/src/auth.ts); backend deployed at appweb-production-a479.up.railway.app.
const AUTH_ENABLED = true;
type CalcTab = 'sim' | 'team' | 'roster' | 'character' | 'dps';
const CALC_TABS: { key: CalcTab; label: string }[] = [
  { key: 'sim', label: 'Sim' },
  { key: 'team', label: 'Team Calc' },
  { key: 'roster', label: 'Roster Calc' },
  { key: 'character', label: 'Character Calc' },
  { key: 'dps', label: 'DPS Test' },
];

// scope-lock loadout (per-unit): no cube, no doll, OL0, 3★ / 7 core, 10/10/10.
// Applied to every unit in the DPS test so candidates compete on equal footing.
const SCOPE_LOCK_LOADOUT: UnitOptions = {
  ol: 0,
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

// 'none' = no cube equipped at all (no flat ATK, no elemental damage, no effect);
// distinct from the 'other' cube, which still grants base stats + elemental damage.
type CubeChoice = (typeof CUBE_IDS)[number] | 'none';

interface SlotState {
  slug: string | null;
  cubeId: CubeChoice;
  cubeLevel: number;
  cubeCustom: boolean;
  ol: 0 | 5;
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
  return {
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
    lines: OL_UI_ENABLED ? buildOlLines(s) : undefined,
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
      return { ...defaultSlot(null), ...s, slug };
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
        .filter((c) => c.slug.includes(q) || c.name.toLowerCase().includes(q))
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
      (c) => !q || c.slug.includes(q) || c.name.toLowerCase().includes(q),
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

export function App() {
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
  const [tab, setTab] = useState<CalcTab>('sim');
  const [blocked, setBlocked] = useState<string[]>([]); // don't-own / excluded
  const [calcChar, setCalcChar] = useState<string | null>(null); // Character Calc
  const [calcBusy, setCalcBusy] = useState(false);
  const [teamResult, setTeamResult] = useState<TeamResult | null>(null);
  const [rosterResults, setRosterResults] = useState<TeamResult[] | null>(null);
  const [charResult, setCharResult] = useState<{
    team: TeamResult;
    unitSlug: string;
    ol: BestOlAtTierResult;
  } | null>(null);
  // DPS test: a scope-locked control group (3 or 4) + variable groups that fill
  // the rest (2 or 1). Each complete group forms a variant team we sim.
  const [dpsControl, setDpsControl] = useState<string[]>([]);
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

  // "scope lock" preset: no cubes, no doll, OL0 gear, 3★/7 core, 400 synchro
  const applyScopeLock = () => {
    setAll({ cubeId: 'none', doll: false, ol: 0, stars: 3, core: 7 });
    setLevel('400');
  };

  // ---- build code (full team + loadout + globals) ----
  const buildFromState = (): Build => ({
    v: BUILD_VERSION,
    g: { weakness, bossDef, core, coreCustom, coreCustomVal, level },
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
  };

  // ---- Discord auth + saved teams (behind AUTH_ENABLED) ----
  const [user, setUser] = useState<AuthUser | null>(null);
  const [teams, setTeams] = useState<SavedTeam[]>([]);
  const [showTeams, setShowTeams] = useState(false);
  const [authErr, setAuthErr] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!AUTH_ENABLED) return;
    captureTokenFromUrl();
    if (getToken()) fetchMe().then(setUser).catch(() => setUser(null));
  }, []);

  const refreshTeams = () =>
    fetchTeams()
      .then(setTeams)
      .catch((e) => setAuthErr((e as Error).message ?? String(e)));
  const openTeams = () => {
    setShowTeams(true);
    setAuthErr(null);
    refreshTeams();
  };
  const onLogout = () => {
    clearToken();
    setUser(null);
    setTeams([]);
    setShowTeams(false);
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
  const onLoadTeam = (t: SavedTeam) => {
    const b = decodeBuild(t.code);
    if (!b) {
      window.alert('This saved team is in an unrecognized format.');
      return;
    }
    applyBuild(b);
    setShowTeams(false);
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

  // Render the summary card to a PNG via the shared, isomorphic drawTeamCard
  // (same code the bot uses). This wrapper is the browser-specific part: create
  // + size the canvas, scale for DPR, and export a blob.
  const buildShareImage = async (): Promise<Blob | null> => {
    if (!r) return null;
    const dpr = 2;
    const cv = document.createElement('canvas');
    cv.width = CARD_W * dpr;
    cv.height = cardHeight(r.units.length) * dpr;
    const ctx = cv.getContext('2d');
    if (!ctx) return null; // jsdom / no canvas support
    ctx.scale(dpr, dpr);
    drawTeamCard(
      ctx as unknown as Canvas2DLike,
      {
        teamDamage: r.teamDamage,
        teamDps: r.teamDps,
        fullBursts: r.fullBursts,
        fullBurstUptime: r.fullBurstUptime,
        units: r.units.map((u) => ({
          name: u.name,
          burst: u.burst,
          weapon: u.weapon,
          element: u.element,
          advantaged: u.advantaged,
          share: u.share,
          totalDamage: u.totalDamage,
        })),
      },
      {
        weakness,
        level: Math.min(1200, Math.max(1, Number(level) || 400)),
        coreLabel: coreLabel(),
      },
    );
    return new Promise((resolve) => cv.toBlob((b) => resolve(b), 'image/png'));
  };

  const onShareImage = async () => {
    const blob = await buildShareImage();
    if (!blob) return;
    // Copy the PNG straight to the clipboard (Chromium/Safari). Falls back to a
    // download where the async clipboard image API isn't available (e.g. Firefox).
    const nav = navigator as any;
    try {
      if (nav.clipboard?.write && (window as any).ClipboardItem) {
        await nav.clipboard.write([
          new (window as any).ClipboardItem({ 'image/png': blob }),
        ]);
        setImaged(true);
        setTimeout(() => setImaged(false), 1500);
        return;
      }
    } catch {
      /* clipboard image write blocked/unsupported — download instead */
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'nikke-team.png';
    a.click();
    URL.revokeObjectURL(a.href);
    setImaged(true);
    setTimeout(() => setImaged(false), 1500);
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
      setCharResult(null);
      setTeamResult(newCalc().bestTeam());
    });
  const runTopTeams = () =>
    runCalc(() => {
      setTeamResult(null);
      setCharResult(null);
      setRosterResults(newCalc().topTeams(5));
    });
  const runCharacter = () =>
    runCalc(() => {
      setTeamResult(null);
      setRosterResults(null);
      if (!calcChar) return;
      const analysis = newCalc().characterAnalysis(calcChar);
      if (!analysis) {
        setCharResult(null);
        return;
      }
      // best-OL for the pinned unit inside its generated team
      const cs = analysis.team.slugs.map((s) => data.characters[s]);
      const idx = analysis.team.slugs.indexOf(calcChar);
      const prepared = prepareTeam(
        cs as any,
        analysis.team.slugs.map(() => calcLoadout()),
        {
          overrides,
          skillLevels: skillLevelData,
          cubes,
          olLines: olLinesData,
        },
      );
      const ol = bestOlAtTier(
        cs as any,
        mult,
        { ...calcCfg(), slugs: analysis.team.slugs } as SimConfig,
        prepared,
        idx,
        olTiers as any,
        olTier,
      );
      setCharResult({ team: analysis.team, unitSlug: calcChar, ol });
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

  // compact result table for a generated team
  const teamResultView = (t: TeamResult, highlight?: string) => (
    <div className='calc-result'>
      <div className='summary muted'>
        team <b className='big'>{fmt(t.teamDamage)}</b> · {fmt(t.teamDps)} DPS ·{' '}
        {(t.fullBurstUptime * 100).toFixed(0)}% FB uptime
      </div>
      <table>
        <tbody>
          {t.units.map((u) => (
            <tr key={u.slug} className={u.slug === highlight ? 'hl' : ''}>
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

  // the full per-character card (portrait, picker, gear/dupes/skills/cube/OL) —
  // reused by the Sim tab and the DPS test's variable units.
  const renderCard = (
    slot: SlotState,
    onChange: (patch: Partial<SlotState>) => void,
    slotLabel: string,
  ) => {
    const c = slot.slug ? data.characters[slot.slug] : null;
    return (
      <div className='card'>
        <div className='slot-head'>
          <span className='muted'>{slotLabel}</span>
          {c && (
            <span className='tag'>
              B{c.burst} · {c.weapon} · {c.element}
            </span>
          )}
        </div>
        {c?.imageUrl ? (
          <img className='portrait' src={c.imageUrl} alt={c.name} />
        ) : (
          <div className='portrait empty'>?</div>
        )}
        <CharPicker slot={slot} onPick={(slug) => onChange({ slug })} />
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
        <div className='card-group-label'>gear</div>
        <div className='pills small'>
          <button
            className={slot.ol === 0 ? 'on' : ''}
            onClick={() => onChange({ ol: 0 })}
          >
            OL 0
          </button>
          <button
            className={slot.ol === 5 ? 'on' : ''}
            onClick={() => onChange({ ol: 5 })}
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
        {OL_UI_ENABLED && (
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
    if (tab === 'team') {
      return (
        <section className='calc-tab'>
          <h2>Team Calc</h2>
          <p className='muted'>
            Finds the strongest 5-nikke team for the chosen boss weakness
            {weakness ? ` (${weakness})` : ' (no element selected)'} under the
            teamwide options + “Apply to all” loadout above.
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
          <h2>Roster Calc</h2>
          <p className='muted'>
            Builds the top 5 teams with no character reused across teams (same
            scoring as Team Calc). Takes a few seconds — it runs hundreds of
            fights.
          </p>
          {blockedPanel}
          <button className='calc-run' onClick={runTopTeams} disabled={calcBusy}>
            {calcBusy ? 'Calculating…' : 'Calculate top 5 teams'}
          </button>
          {rosterResults?.map((t, i) => (
            <div key={i}>
              <div className='card-group-label'>team {i + 1}</div>
              {teamResultView(t)}
            </div>
          ))}
        </section>
      );
    }
    if (tab === 'dps') {
      const canRun = dpsControlValid && dpsGroups.some(groupComplete) && !calcBusy;
      return (
        <section className='calc-tab'>
          <h2>DPS Test</h2>
          <p className='muted'>
            A fixed <b>control group</b> (3 or 4 nikkes) — scope-locked (no cube /
            no doll / OL0 / 3★ · 7 core · lvl 400) — plus swap-in variable groups
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
              <button
                className='ol-add'
                onClick={() =>
                  setDpsGroups((gs) => [...gs, emptyGroup(dpsGroupSize)])
                }
              >
                + add group
              </button>
              <button className='calc-run' onClick={runDpsTest} disabled={!canRun}>
                {calcBusy ? 'Running…' : 'Run DPS test'}
              </button>
            </>
          ) : (
            <p className='muted'>Pick 3 or 4 control nikkes to begin.</p>
          )}

          {dpsResults && (
            <div className='calc-result'>
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
                      <td>
                        {res.varUnits.map((u) => u.name).join(' + ')}
                      </td>
                      <td className='r'>{fmt(res.varDamage)}</td>
                      <td className='r share'>
                        {(res.varShare * 100).toFixed(1)}%
                      </td>
                      <td className='r'>
                        <b>{fmt(res.teamDamage)}</b>
                      </td>
                      <td className='r muted'>
                        {(res.fullBurstUptime * 100).toFixed(0)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className='muted'>
                Ranked by team damage. “Group dmg” is the combined damage of the
                variable nikke{dpsGroupSize > 1 ? 's' : ''} in each variant.
              </p>
            </div>
          )}
        </section>
      );
    }
    // character
    const cc = calcChar ? data.characters[calcChar] : null;
    return (
      <section className='calc-tab'>
        <h2>Character Calc</h2>
        <p className='muted'>
          Pick one nikke; the best supporting team is generated around them, then
          their best-OL is computed inside it. Workhorse for best-OL + new chars.
        </p>
        <div className='field'>
          <label>Character</label>
          {cc ? (
            <div className='chips'>
              <button
                className='chip'
                title='change'
                onClick={() => {
                  setCalcChar(null);
                  setCharResult(null);
                }}
              >
                {cc.name} ({cc.weapon} · {cc.element}) ×
              </button>
            </div>
          ) : (
            <CharSearch
              placeholder='pick a nikke…'
              exclude={[]}
              onPick={(slug) => setCalcChar(slug)}
            />
          )}
        </div>
        <button
          className='calc-run'
          onClick={runCharacter}
          disabled={!cc || calcBusy}
        >
          {calcBusy ? 'Calculating…' : 'Generate team & analyze'}
        </button>
        {charResult && (
          <>
            {teamResultView(charResult.team, charResult.unitSlug)}
            <div className='notes'>
              <b>{data.characters[charResult.unitSlug].name} — best OL</b> (tier{' '}
              {charResult.ol.tier}): fixed{' '}
              {charResult.ol.fixed.map((l) => `${l.count}×${l.label}`).join(' + ')}
              {' + '}
              <b>
                {charResult.ol.free.length
                  ? charResult.ol.free
                      .map((l) => `${l.count}×${l.label}`)
                      .join(' + ')
                  : '(none)'}
              </b>{' '}
              <span className='muted'>
                (+{charResult.ol.gainPct.toFixed(1)}% over the 8 fixed lines)
              </span>
            </div>
          </>
        )}
      </section>
    );
  };

  return (
    <div className='app'>
      <header>
        <div className='header-row'>
          <h1>NIKKE Solo Raid Sim</h1>
          <div className='share-actions'>
            {AUTH_ENABLED &&
              (user ? (
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
                  <span className='user-chip' title='logged in'>
                    {user.username}
                    <button className='logout' onClick={onLogout} title='log out'>
                      ⏻
                    </button>
                  </span>
                </>
              ) : (
                <button
                  className='share-btn discord'
                  onClick={() => (window.location.href = loginUrl())}
                  title='save teams to your Discord account'
                >
                  Log in with Discord
                </button>
              ))}
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
          </div>
        </div>
        <p className='muted'>
          180s fight · all skills factored at 10/10/10 · leftmost burst priority
          · gear + doll from your recorded stats
        </p>
      </header>

      {CALC_TABS_ENABLED && (
        <nav className='tabs-bar'>
          {CALC_TABS.map((t) => (
            <button
              key={t.key}
              className={tab === t.key ? 'on' : ''}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      )}

      <section className='global'>
        <div className='field'>
          <label title='the element that is strong against the boss'>
            Boss weakness
          </label>
          <div className='pills'>
            {ELEMENTS.map((e) => (
              <button
                key={e ?? 'none'}
                className={weakness === e ? 'on' : ''}
                onClick={() => setWeakness(e)}
              >
                {e ?? 'None'}
              </button>
            ))}
          </div>
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
          <div className='pills'>
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
            {coreCustom && (
              <input
                className='num'
                value={coreCustomVal}
                onChange={(e) => setCoreCustomVal(e.target.value)}
                placeholder='%'
              />
            )}
          </div>
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
          <div className='pills small'>
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
          </div>
        </div>
        <div className='field'>
          <label>All cube levels</label>
          <div className='pills small'>
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
          </div>
        </div>
        <div className='field'>
          <label>All gear</label>
          <div className='pills small'>
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
          </div>
        </div>
        <div className='field'>
          <label>All dolls</label>
          <div className='pills small'>
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
          </div>
        </div>
        <div className='field'>
          <label>All stars</label>
          <div className='pills small'>
            {STAR_LEVELS.map((st) => (
              <button
                key={st}
                className={allHave((s) => s.stars === st) ? 'on' : ''}
                onClick={() => setAll({ stars: st })}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
        <div className='field'>
          <label>All cores</label>
          <div className='pills small'>
            {CORE_LEVELS.map((cr) => (
              <button
                key={cr}
                className={allHave((s) => s.core === cr) ? 'on' : ''}
                onClick={() => setAll({ core: cr })}
              >
                {cr}
              </button>
            ))}
          </div>
        </div>
        <div className='field'>
          <label title='sets S1, S2 and Burst for every nikke'>
            All skills
          </label>
          <div className='pills small'>
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
          </div>
        </div>
      </section>

      {(!CALC_TABS_ENABLED || tab === 'sim') && (
        <>
      <section className='team'>
        {slots.map((slot, i) => (
          <Fragment key={i}>
            {renderCard(slot, (p) => setSlot(i, p), `slot ${i + 1}`)}
          </Fragment>
        ))}
      </section>

      {OL_UI_ENABLED && (
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
                    pick of the best 4 lines, use the <b>Character Calc</b> tab.
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

      {CALC_TABS_ENABLED && tab !== 'sim' && renderCalcTab()}

      {AUTH_ENABLED && showTeams && (
        <div className='modal-backdrop' onClick={() => setShowTeams(false)}>
          <div className='modal' onClick={(e) => e.stopPropagation()}>
            <div className='modal-head'>
              <h2>My teams</h2>
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
                    <b>{t.name}</b>
                    <span className='muted'>
                      {(() => {
                        const b = decodeBuild(t.code);
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
        v1 assumptions: 0 enemy debuffs · full HP · expected-value crits ·
        always in effective range · damage-taken debuffs from allies modeled ·
        parts &amp; pierce in a later version
      </footer>
    </div>
  );
}
