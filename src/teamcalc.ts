// Team / roster / character-analysis search. Filesystem-free (takes data
// objects) like runSim, so the web app and CLI share it. It only READS the
// engine (runSim/prepareTeam) — never modifies it.
//
// Team legality mirrors the site's rule: 1×Burst I, 1×Burst II, 2×Burst III +
// 1 flex, with Λ acting as a wildcard for any burst slot. The B1/B2 casters must
// also sustain the rotation: a ≤20s unit solo, or a ≤40s pair alternating — a
// lone 40s/60s B1 or B2 can't burst every Full Burst cycle (see stageCovered).
//
// The search is a heuristic (team optimisation is a big space): price every
// unit by its marginal damage vs a reference core (src/teamvalue.ts), enumerate
// every legal team shape by sim-free proxy score, sim the best few dozen
// candidates, then local-swap-refine the best few on FULL-team sims (which
// capture support synergy). Not guaranteed globally optimal — good and fast.
import { runSim } from './engine/sim.js';
import { prepareTeam, type PrepareDeps, type UnitOptions } from './prepare.js';
import {
  buildValueTable,
  enumerateTeams,
  type ValueTable,
} from './teamvalue.js';
import type {
  CharacterData,
  Element,
  LevelMultiplier,
  SimConfig,
} from './types.js';

type Char = CharacterData & { baseStats: any };

/**
 * Real-world meta popularity, resolved for ONE boss weakness (element the boss
 * is weak to). Lets the search bias toward what top players actually field
 * (enikk top-100 audit; prydwen bossing-tier fallback for units too new to have
 * ranker data). Built from web/src/metaWeights.ts. Omit → pure-damage ranking.
 */
export interface MetaScoring {
  /** unit meta prior in [0,1] for the active weakness (enikk or tier fallback) */
  unitScore(slug: string): number;
  /** exact-comp popularity in [0,1], keyed by sorted-slug join('|') */
  compPop: Record<string, number>;
  /** modeled-complete popular comps (slug arrays) to inject as candidates */
  seedComps: string[][];
  /** blend weight W: score = teamDamage × (1 + W·prior) */
  weight: number;
  /** how much an exact-comp match adds to the prior (on top of the unit mean) */
  comboWeight: number;
}

export interface TeamCalcInput {
  chars: Record<string, Char>; // all characters, keyed by slug
  mult: LevelMultiplier;
  deps: PrepareDeps;
  cfg: Omit<SimConfig, 'slugs'>; // boss weakness/def/core/level/… (no slugs)
  loadout?: UnitOptions; // uniform loadout assumption applied to every unit
  /** Per-unit loadout resolver (e.g. 12/12 lines that differ per unit). Overrides
   *  `loadout` when present; falls back to `loadout` for units it doesn't resolve. */
  loadoutFor?: (slug: string) => UnitOptions;
  /** Serializable alternative to `loadoutFor` (functions don't cross a web-worker
   *  boundary): a materialized per-slug loadout map, resolved on the main thread.
   *  Wins over `loadoutFor`/`loadout` for any slug it contains; falls through to
   *  them for slugs it doesn't. Produces byte-identical sims to the equivalent
   *  `loadoutFor` (parity gate — src/teamcalc.loadouts-parity.test.ts). */
  loadouts?: Record<string, UnitOptions>;
  /** Batch sim evaluator (roster-generator perf plan item 1b). When present, the
   *  search delegates every full-team sim to this async batch instead of running
   *  it in-process — a web-worker pool (web/src/simPool.ts) fans the batch across
   *  cores. It receives ordered teams and returns their TeamResults in the SAME
   *  order (null for a team whose sim threw). Omit → in-process sims (CLI/tests),
   *  in which case bestTeam/topTeams still resolve synchronously under the hood. */
  evaluator?: (teams: string[][]) => Promise<(TeamResult | null)[]>;
  blocked?: string[]; // excluded slugs (don't-own)
  /** DPS-pool prune size (top-N B3 by solo score). Higher = slower, more thorough. */
  poolB3?: number;
  /** Max local-search rounds. */
  rounds?: number;
  /** Meta-popularity bias for the active boss weakness (omit = pure damage). */
  meta?: MetaScoring;
  /** Boss weakness selected in the UI: every team must field ≥1 unit of this
   *  element (an advantaged unit). null/omit → no element requirement. */
  requireElement?: Element | null;
  /** Element-agnostic prydwen bossing-tier meta score per unit (e.g. SSS=5…≤C=0,
   *  from data/bossing-tiers.json). Used only to seed the solo roster generator's
   *  downward-sloped team spread (see topTeams `spreadTargets`); it does NOT change
   *  the damage×enikk ranking score. Omit → no spread shaping. */
  prydwenScore?: (slug: string) => number;
  /** Soft like-tag synergy bias for the ranking score (owner ruling 2026-07-23).
   *  Rewards a team for pairing a damage dealer with its matching damage buffer —
   *  e.g. a Pierce dealer with a Pierce ▲ buffer, a Projectile dealer with a
   *  Projectile ▲ buffer (archetype tags from data/archetype-tags.json). Multiplies
   *  the ranking score by (1 + weight × satisfied pairs); see countSynergyPairs.
   *  Soft — simulated damage and the meta blend still lead. Omit → no synergy. */
  synergy?: {
    /** archetype tags by slug (data/archetype-tags.json `tags`) */
    tags: Record<string, string[]>;
    /** [dealerTag, bufferTag] pairs to reward (e.g. ['pierce','pierce-buffer']) */
    pairs: [string, string][];
    /** score bonus per satisfied pair (e.g. 0.08 → +8% per pair) */
    weight: number;
  };
  /** Cross-run sim cache (perf plan item 5). `'shared'` reuses a process-level
   *  cache bundle keyed by (cfg, loadout, loadouts) — a team's sim depends only on
   *  those (+ static mult/deps), NOT on blocked/meta/synergy — so repeated
   *  generations (re-clicking, tweaking pins/locks, toggling shaping) reuse every
   *  prior sim. `'none'` (default) keeps a per-instance cache so the CLI/tests stay
   *  hermetic. In the web the COORDINATOR passes `'shared'`; pool workers stay
   *  stateless (`'none'`). */
  cache?: 'shared' | 'none';
}

export interface TeamUnit {
  slug: string;
  name: string;
  burst: string;
  weapon: string;
  element: string;
  advantaged: boolean;
  share: number;
  totalDamage: number;
}
export interface TeamResult {
  slugs: string[];
  teamDamage: number;
  teamDps: number;
  fullBursts: number;
  fullBurstUptime: number;
  units: TeamUnit[];
}

const NEED = { I: 1, II: 1, III: 2 } as const;

// Proxy-enumeration search constants (perf plan item 3b). The enumeration keeps
// the top ENUM_TOP_K candidates by sim-free proxy score, sims the best
// ENUM_SIM_TOP of them, and refines the best ENUM_REFINE_TOP by REAL score.
// ADAPTIVE_B3_FRAC widens the B3 pool past the fixed poolB3 rank cut: any B3
// within this fraction of the top solo value stays in (see buildPool).
const ADAPTIVE_B3_FRAC = 0.5;
const ENUM_TOP_K = 150;
const ENUM_SIM_TOP = 40;
const ENUM_REFINE_TOP = 3;

// Λ units the generators pin to a fixed burst slot instead of treating as a free
// wildcard. Red Hood is unsupported as a solo B1/B2 over a 180s fight (her 40s
// burst cooldown binds the whole rotation), so the team/roster generators only
// ever field her as a B3 — matching the sim-battery harness. Selection uses
// `effBurst` below; the sim rotation is pinned via lambdaStage in simTeam.
const FORCED_BURST: Record<string, 'I' | 'II' | 'III'> = { 'red-hood': 'III' };
const LAMBDA_STAGE: Record<'I' | 'II' | 'III', 1 | 2 | 3> = {
  I: 1,
  II: 2,
  III: 3,
};
/** Effective burst class for selection — a forced slot for pinned Λ units, else the char's own. */
const effBurst = (slug: string, chars: Record<string, Char>): string =>
  FORCED_BURST[slug] ?? chars[slug].burst;

// --- canonical team order (perf plan item 2) --------------------------------
// A team's sim depends on the slugs-array ORDER two ways (measured — the item-2
// premise probe): (1) the camera-focus unit is the middle slot (index 2), whose
// charge weapon generates ×2.5 burst gauge (~4.9% swing); (2) buff-target ties
// break by slot index (~0.5% swing). So a team is really a SET plus a focus
// choice. canonicalTeamOrder maps any permutation of a set to ONE deterministic
// array — burst class then slug-alpha, with the focus unit moved to index 2 — so
// permutations collapse to a single sim/cache entry AND the focused unit is
// deterministic instead of an accident of search insertion order.
const BURST_RANK: Record<string, number> = { I: 0, II: 1, III: 2, Λ: 3 };
/** Charge weapons (SR/RL) are the only ones the focus ×2.5 gauge bonus applies to. */
export const isChargeWeapon = (
  chars: Record<string, Char>,
  slug: string,
): boolean => {
  const w = chars[slug]?.weapon;
  return w === 'SR' || w === 'RL';
};
/** Deterministic slot order for a SET: burst class (I,II,III,Λ) then slug-alpha,
 *  with `focus` (when supplied) placed at the camera-focus slot (index 2). Pure in
 *  the set + focus, so every permutation of the set yields the SAME array. */
export function canonicalTeamOrder(
  slugs: string[],
  chars: Record<string, Char>,
  focus?: string,
): string[] {
  const rank = (s: string) => BURST_RANK[effBurst(s, chars)] ?? 9;
  const sorted = [...slugs].sort(
    (a, b) => rank(a) - rank(b) || (a < b ? -1 : a > b ? 1 : 0),
  );
  if (!focus || !sorted.includes(focus)) return sorted;
  const rest = sorted.filter((s) => s !== focus);
  if (rest.length !== sorted.length - 1) return sorted; // duplicate-slug guard
  const at = Math.min(2, sorted.length - 1);
  rest.splice(at, 0, focus);
  return rest;
}

function deficits(counts: Record<string, number>): number {
  return (
    Math.max(0, NEED.I - (counts.I ?? 0)) +
    Math.max(0, NEED.II - (counts.II ?? 0)) +
    Math.max(0, NEED.III - (counts.III ?? 0))
  );
}

// Burst cooldowns gate the rotation: a burst stage (B1/B2) must be castable
// every Full Burst cycle (~20s cadence). A ≤20s caster covers every cycle alone;
// a 40s caster only every other cycle, so a lone 40s (or 60s) unit leaves the
// chain gapped unless a second ≤40s caster of the same stage alternates with it.
// Generalizes the Red-Hood "40s cooldown binds the whole rotation" ruling to
// every B1/B2. Λ units never count here — the only Λ (Red Hood) is forced to B3.
const CD_SHORT = 20; // a single caster at/below this covers the stage solo
const CD_PAIR = 40; // two casters at/below this alternate to cover the stage
function stageCovered(
  slugs: string[],
  chars: Record<string, Char>,
  stage: 'I' | 'II',
): boolean {
  let short = 0;
  let pair = 0;
  for (const s of slugs) {
    if (effBurst(s, chars) !== stage) continue;
    const cd = chars[s].burstCooldownSec;
    if (cd <= CD_SHORT) short++;
    else if (cd <= CD_PAIR) pair++;
  }
  return short >= 1 || short + pair >= 2;
}

/**
 * 5 distinct units that can cover 1×BI, 1×BII, 2×BIII with Λ as wildcards, AND
 * whose B1/B2 casters can actually sustain the rotation (stageCovered) — a lone
 * 40s/60s B1 or B2 is illegal because it can't burst every Full Burst cycle.
 */
function isLegal(slugs: string[], chars: Record<string, Char>): boolean {
  if (slugs.length !== 5 || new Set(slugs).size !== 5) return false;
  const c: Record<string, number> = { I: 0, II: 0, III: 0, Λ: 0 };
  for (const s of slugs) c[effBurst(s, chars)]++;
  if ((c['Λ'] ?? 0) < deficits(c)) return false;
  return stageCovered(slugs, chars, 'I') && stageCovered(slugs, chars, 'II');
}

/**
 * Can a PARTIAL locked set still be completed to a legal 5-team? The outstanding
 * burst deficits (deficits() ignores Λ) must be coverable by the locked Λ units
 * plus the (5 − k) free slots still to fill. Used to decide whether a "must-use"
 * unit can be assigned to a team without making it unbuildable.
 */
export function locksFeasible(
  locked: string[],
  chars: Record<string, Char>,
): boolean {
  if (locked.length > 5 || new Set(locked).size !== locked.length) return false;
  const c: Record<string, number> = { I: 0, II: 0, III: 0, Λ: 0 };
  for (const s of locked) {
    if (!chars[s]) return false;
    c[effBurst(s, chars)]++;
  }
  return deficits(c) <= (c['Λ'] ?? 0) + (5 - locked.length);
}

/**
 * Spread generic "must-use" units across teams for the roster generators. Each
 * unit goes to the team with the most free room that stays feasible (so units
 * fan out rather than piling onto team 1). Units already pinned to a team count
 * as used; a unit that fits nowhere is returned in `unplaced` so the UI can warn.
 * `assigned[t]` holds only the must-use units added to team t (pinned units are
 * tracked separately by the caller).
 */
export function assignMustUse(
  mustUse: string[],
  pinnedByTeam: string[][],
  chars: Record<string, Char>,
  teamCount: number,
): { assigned: string[][]; unplaced: string[] } {
  const locked: string[][] = Array.from({ length: teamCount }, (_, t) => [
    ...(pinnedByTeam[t] ?? []),
  ]);
  const assigned: string[][] = Array.from({ length: teamCount }, () => []);
  const unplaced: string[] = [];
  const seen = new Set<string>();
  for (const slug of mustUse) {
    if (seen.has(slug) || !chars[slug]) continue;
    seen.add(slug);
    if (locked.some((team) => team.includes(slug))) continue; // already pinned
    let bestT = -1;
    let bestRoom = -1;
    for (let t = 0; t < teamCount; t++) {
      if (locked[t].length >= 5) continue;
      if (!locksFeasible([...locked[t], slug], chars)) continue;
      const room = 5 - locked[t].length;
      if (room > bestRoom) {
        bestRoom = room;
        bestT = t;
      }
    }
    if (bestT < 0) unplaced.push(slug);
    else {
      locked[bestT].push(slug);
      assigned[bestT].push(slug);
    }
  }
  return { assigned, unplaced };
}

/**
 * Declarative "always include" combo set for the roster generators (the curated
 * meta supports every roster should field — see SOLO_ALWAYS_COMBOS /
 * UNION_ALWAYS_COMBOS in web/src/App.tsx). A combo whose required unit is
 * unavailable to the search (blocked / excluded / not modeled) RELAXES — it is
 * silently dropped rather than failing the whole generation.
 */
export interface AlwaysCombos {
  /** groups that must all share ONE team (e.g. mint+prika) */
  pairs?: string[][];
  /** anchor + first AVAILABLE of `choices` (preference-ordered) share the
   *  anchor's team (e.g. crown + [helm, naga]) */
  oneOf?: { anchor: string; choices: string[] }[];
  /** units that must appear somewhere in the roster (spread across teams) */
  singles?: string[];
}

export interface AlwaysComboAssignment {
  /** the caller's pins augmented with the combo groups AND singles, placed so the
   *  always-included B1s and B2 groups fan out onto distinct teams */
  pinnedByTeam: string[][];
  /** combo singles that fit nowhere when placed burst-aware — the caller spreads
   *  these as a last resort via assignMustUse (empty in practice for the curated sets) */
  singles: string[];
  /** combo groups dropped (a required unit was unavailable, pins conflicted, or
   *  the group fit nowhere) — diagnostic only, never surfaced to the user */
  dropped: string[][];
}

/**
 * Fold an AlwaysCombos set onto `teamCount` teams, honoring the user's own pins.
 * Same-team groups (pairs + resolved oneOf) AND singles are PINNED to a team.
 * Burst roles are spread: the always-included B1s land on distinct teams and the
 * always-included B2 groups land on distinct teams (a B2 pair counts as ONE B2
 * group), so the curated supports never stack a burst stage onto one team — e.g.
 * the 4 solo B1s take 4 teams and the 4 solo B2 groups take 4 teams. Placement
 * PREFERS a non-conflicting team but relaxes to any feasible team if needed, so
 * generation always completes. User pins win over combos: a group split across
 * the user's pinned teams is an unresolvable conflict and relaxes. `available`
 * gates which units the search can field (defaults to "modeled in chars"); the
 * caller layers blocked/excluded/synced-eligibility on top.
 */
export function assignAlwaysCombos(
  combos: AlwaysCombos,
  pinnedByTeam: string[][],
  chars: Record<string, Char>,
  teamCount: number,
  available: (slug: string) => boolean = (s) => !!chars[s],
): AlwaysComboAssignment {
  const pinned: string[][] = Array.from({ length: teamCount }, (_, t) => [
    ...(pinnedByTeam[t] ?? []),
  ]);
  const singles: string[] = [];
  const dropped: string[][] = [];
  const avail = (s: string): boolean => available(s) && !!chars[s];

  // Per-team occupancy of always-included burst classes (B1/B2 only — B3/Λ place
  // freely). Drives the burst-spread so two always-B1s (or two always-B2 groups)
  // never share a team.
  const occ: { I: boolean; II: boolean }[] = Array.from(
    { length: teamCount },
    () => ({ I: false, II: false }),
  );
  const classesOf = (slugs: string[]): ('I' | 'II')[] => {
    const set = new Set<'I' | 'II'>();
    for (const s of slugs) {
      const b = effBurst(s, chars);
      if (b === 'I' || b === 'II') set.add(b);
    }
    return [...set];
  };
  const conflicts = (t: number, classes: ('I' | 'II')[]): boolean =>
    classes.some((c) => occ[t][c]);
  const mark = (t: number, classes: ('I' | 'II')[]): void => {
    for (const c of classes) occ[t][c] = true;
  };
  // Most-room feasible team, preferring one with no burst-class conflict; falls
  // back to a conflicting team if that's all that fits (relax, never fail).
  const pickTeam = (
    classes: ('I' | 'II')[],
    feasible: (t: number) => boolean,
  ): number => {
    let best = -1;
    for (const allowConflict of [false, true]) {
      let bestRoom = -1;
      for (let t = 0; t < teamCount; t++) {
        if (!feasible(t)) continue;
        if (!allowConflict && conflicts(t, classes)) continue;
        const room = 5 - pinned[t].length;
        if (room > bestRoom) {
          bestRoom = room;
          best = t;
        }
      }
      if (best >= 0) return best;
    }
    return best;
  };

  // Seed occupancy from always-units the USER already pinned, so auto-placed
  // supports avoid a burst stage the user pinned to a team.
  const userPinnedAlways = [
    ...(combos.pairs ?? []).flat(),
    ...(combos.oneOf ?? []).flatMap((o) => [o.anchor, ...o.choices]),
    ...(combos.singles ?? []),
  ];
  for (const s of userPinnedAlways) {
    if (!avail(s)) continue;
    const t = pinned.findIndex((team) => team.includes(s));
    if (t >= 0) mark(t, classesOf([s]));
  }

  // Place a same-team group. If any of its units is already pinned, the rest join
  // it on that team (when feasible); pins split across teams relax the group.
  const placeGroup = (group: string[]): void => {
    const uniq = [...new Set(group)];
    if (!uniq.every(avail)) {
      dropped.push(group); // a required unit is unavailable → relax
      return;
    }
    const classes = classesOf(uniq);
    const homes = new Set<number>();
    uniq.forEach((s) =>
      pinned.forEach((team, t) => {
        if (team.includes(s)) homes.add(t);
      }),
    );
    if (homes.size > 1) {
      dropped.push(group); // user pins split the group → relax
      return;
    }
    if (homes.size === 1) {
      const t = [...homes][0];
      const merged = [...new Set([...pinned[t], ...uniq])];
      if (merged.length <= 5 && locksFeasible(merged, chars)) {
        pinned[t] = merged;
        mark(t, classes);
      } else dropped.push(group);
      return;
    }
    // not pinned yet: most-room feasible team, preferring no burst-class conflict
    const t = pickTeam(classes, (t) => {
      const merged = [...new Set([...pinned[t], ...uniq])];
      return merged.length <= 5 && locksFeasible(merged, chars);
    });
    if (t < 0) dropped.push(group);
    else {
      pinned[t] = [...new Set([...pinned[t], ...uniq])];
      mark(t, classes);
    }
  };

  for (const pair of combos.pairs ?? []) placeGroup(pair);
  for (const { anchor, choices } of combos.oneOf ?? []) {
    const partner = choices.find(avail);
    if (!avail(anchor) || partner === undefined) {
      dropped.push([anchor, ...choices]);
      continue;
    }
    placeGroup([anchor, partner]);
  }
  // Singles are placed here (burst-aware) rather than returned for blind spreading,
  // so the always-B1s / always-B2s fan out onto distinct teams. A single that fits
  // nowhere is returned in `singles` for the caller to spread as a last resort.
  for (const s of combos.singles ?? []) {
    if (!avail(s)) {
      dropped.push([s]);
      continue;
    }
    const classes = classesOf([s]);
    const homeT = pinned.findIndex((team) => team.includes(s));
    if (homeT >= 0) {
      mark(homeT, classes); // user-pinned single: occupy its team's burst slot
      continue;
    }
    if (singles.includes(s)) continue;
    const t = pickTeam(
      classes,
      (t) => pinned[t].length < 5 && locksFeasible([...pinned[t], s], chars),
    );
    if (t < 0) singles.push(s);
    else {
      pinned[t] = [...pinned[t], s];
      mark(t, classes);
    }
  }
  return { pinnedByTeam: pinned, singles, dropped };
}

/**
 * Count the like-tag synergy pairs a team satisfies (owner ruling 2026-07-23).
 * A pair [dealerTag, bufferTag] is satisfied when the team fields ≥1 unit carrying
 * the dealer tag AND ≥1 (other or same) unit carrying the buffer tag — e.g. a
 * Pierce dealer plus a Pierce ▲ buffer, or a Projectile dealer plus a Projectile ▲
 * buffer. A single unit that carries BOTH halves (rapi-red-hood deals AND self-buffs
 * projectile explosion damage) satisfies the pair on its own. Pure over the tag map;
 * the generator folds the count into the ranking score as a soft (1 + weight·pairs)
 * multiplier so simulated damage still leads. Tags come from data/archetype-tags.json.
 */
export function countSynergyPairs(
  slugs: string[],
  tags: Record<string, string[]>,
  pairs: [string, string][],
): number {
  let n = 0;
  for (const [dealer, buffer] of pairs) {
    let hasDealer = false;
    let hasBuffer = false;
    for (const s of slugs) {
      const t = tags[s];
      if (!t) continue;
      if (t.includes(dealer)) hasDealer = true;
      if (t.includes(buffer)) hasBuffer = true;
    }
    if (hasDealer && hasBuffer) n++;
  }
  return n;
}

// --- cross-run sim cache (perf plan item 5) ---------------------------------
// A team's sim result depends ONLY on (cfg, loadout, loadouts) plus static
// mult/deps — not on blocked/meta/synergy (those drive selection/scoring, which
// read cached sims). So a process-level bundle keyed by those inputs lets repeated
// generations reuse every prior sim. LRU keeps the last 3 configs; a soft entry cap
// bounds the biggest maps. Opt-in via `cache: 'shared'` (web coordinator only).
interface CacheBundle {
  teamCache: Map<string, ReturnType<typeof runSim>>;
  resultCache: Map<string, TeamResult | null>;
  soloCache: Map<string, number>;
  /** item 3a: value tables keyed by (pool + per-slug meta prior) — see getValueTable */
  valueTables: Map<string, ValueTable>;
}
const SHARED_BUNDLES = new Map<string, CacheBundle>();
const MAX_BUNDLES = 3;
const MAX_TEAM_ENTRIES = 5000;

/** Deterministic JSON with recursively sorted object keys, so two configs built the
 *  same way hash identically regardless of key insertion order. */
function stableStringify(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null';
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  const keys = Object.keys(v as Record<string, unknown>).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify((v as any)[k])}`)
    .join(',')}}`;
}

function getBundle(hash: string): CacheBundle {
  const hit = SHARED_BUNDLES.get(hash);
  if (hit) {
    SHARED_BUNDLES.delete(hash); // LRU touch
    SHARED_BUNDLES.set(hash, hit);
    return hit;
  }
  const bundle: CacheBundle = {
    teamCache: new Map(),
    resultCache: new Map(),
    soloCache: new Map(),
    valueTables: new Map(),
  };
  SHARED_BUNDLES.set(hash, bundle);
  while (SHARED_BUNDLES.size > MAX_BUNDLES) {
    const oldest = SHARED_BUNDLES.keys().next().value;
    if (oldest === undefined) break;
    SHARED_BUNDLES.delete(oldest);
  }
  return bundle;
}

/** Soft entry cap: evict oldest (Map insertion order) once past `cap`. */
function capMap(m: Map<unknown, unknown>, cap: number): void {
  while (m.size > cap) {
    const k = m.keys().next().value;
    if (k === undefined) break;
    m.delete(k);
  }
}

export function makeCalc(input: TeamCalcInput) {
  const { chars, mult, deps } = input;
  const loadout = input.loadout ?? {};
  const blocked = new Set(input.blocked ?? []);
  const poolB3 = input.poolB3 ?? 24;
  const rounds = input.rounds ?? 3;
  // Sim caches: shared process-level bundle (keyed by the sim-determining inputs)
  // when opted in, else per-instance (hermetic). See CacheBundle / item 5.
  const bundle =
    input.cache === 'shared'
      ? getBundle(
          stableStringify({
            cfg: input.cfg,
            loadout: input.loadout,
            loadouts: input.loadouts,
          }),
        )
      : null;
  const meta = input.meta;
  const META_W = meta?.weight ?? 0;
  const prydwenScore = input.prydwenScore;
  // Soft like-tag synergy (owner ruling 2026-07-23): a team that pairs a damage
  // dealer with its matching damage buffer (pierce↔pierce ▲, projectile↔projectile ▲)
  // gets a small multiplicative bonus on the ranking score. Folds into scoreOf so
  // every search path (seed refine, injected meta comps, the solo spread) sees it.
  // Inert when no synergy config is supplied.
  const synergy = input.synergy;
  const synergyFactor = (slugs: string[]): number =>
    synergy
      ? 1 +
        synergy.weight * countSynergyPairs(slugs, synergy.tags, synergy.pairs)
      : 1;

  // Soft team-spread helpers (solo roster generator). A team's prydwen meta sum
  // and a gentle closeness-to-target factor (1 at the target, falling off with σ).
  // These only SEED/bias each team toward its intended meta score — the ranking
  // score (scoreOf) is untouched. Inert when no prydwenScore is supplied.
  const SPREAD_SIGMA = 3;
  const teamMetaSum = (slugs: string[]): number => {
    if (!prydwenScore) return 0;
    let s = 0;
    for (const u of slugs) s += prydwenScore(u);
    return s;
  };
  const closeness = (sum: number, target: number): number =>
    Math.exp(-((sum - target) ** 2) / (2 * SPREAD_SIGMA * SPREAD_SIGMA));

  // Boss-weakness rule: when an elemental weakness is selected, a team must
  // field ≥1 advantaged (weakness-element) unit. Folded into `legal` so the seed
  // gate, refine swaps, and injected meta comps all enforce it alongside the
  // burst-class + cooldown rules.
  const reqEl = input.requireElement ?? null;
  const elementOk = (slugs: string[]): boolean =>
    !reqEl || slugs.some((s) => chars[s].element === reqEl);
  const legal = (slugs: string[]): boolean =>
    isLegal(slugs, chars) && elementOk(slugs);

  // Meta prior for a team in [0,1]: mean unit popularity, plus an exact-comp
  // bonus when the 5-unit set matches a popular ranker comp. 0 when no meta.
  const metaPrior = (slugs: string[]): number => {
    if (!meta) return 0;
    let sum = 0;
    for (const s of slugs) sum += meta.unitScore(s);
    const unitComp = slugs.length ? sum / slugs.length : 0;
    const combo = meta.compPop[[...slugs].sort().join('|')] ?? 0;
    return Math.min(1, unitComp + meta.comboWeight * combo);
  };
  // Ranking score: strong co-equal blend of simulated damage and meta prior, with
  // a soft like-tag synergy multiplier on top. Reduces to raw teamDamage when no
  // meta and no synergy are supplied (backwards-compatible).
  const scoreOf = (r: {
    teamDamage: number;
    units: { slug: string }[];
  }): number => {
    const slugs = r.units.map((u) => u.slug);
    return (
      r.teamDamage * (1 + META_W * metaPrior(slugs)) * synergyFactor(slugs)
    );
  };

  // effective burst class for selection (pins Red Hood → B3; see FORCED_BURST)
  const eb = (s: string) => effBurst(s, chars);
  // per-unit loadout: pin the rotation stage for forced-burst Λ units so the sim
  // rotates Red Hood as a B3, consistent with how selection places her. Uses the
  // per-unit resolver (e.g. 12/12 lines) when supplied, else the uniform loadout.
  const loadouts = input.loadouts;
  const baseLoadout = (slug: string): UnitOptions =>
    loadouts && slug in loadouts
      ? loadouts[slug]
      : input.loadoutFor
        ? input.loadoutFor(slug)
        : loadout;
  const unitLoadout = (slug: string) => {
    const forced = FORCED_BURST[slug];
    const lo = baseLoadout(slug);
    return forced ? { ...lo, lambdaStage: LAMBDA_STAGE[forced] } : lo;
  };

  // memoize full-team sims (keyed by ordered slugs) and solo scores so repeated
  // bestTeam calls (topTeams) and refine rounds don't re-sim the same teams. Maps
  // come from the shared bundle when opted in (item 5), else are per-instance.
  const teamCache = bundle?.teamCache ?? new Map<string, ReturnType<typeof runSim>>();
  const simTeam = (slugs: string[]) => {
    const key = slugs.join(',');
    const hit = teamCache.get(key);
    if (hit) return hit;
    const cs = slugs.map((s) => chars[s]);
    const prepared = prepareTeam(cs, slugs.map(unitLoadout), deps);
    const r = runSim(cs, mult, { ...input.cfg, slugs } as SimConfig, prepared);
    teamCache.set(key, r);
    capMap(teamCache, MAX_TEAM_ENTRIES);
    return r;
  };

  const toResult = (r: ReturnType<typeof simTeam>): TeamResult => ({
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

  // In-process sim → TeamResult (never throws to the batch layer; caught → null).
  const localEval = (team: string[]): TeamResult | null => {
    try {
      return toResult(simTeam(team));
    } catch {
      return null;
    }
  };

  // Batch-evaluate teams to TeamResults, memoized by ordered slugs (perf plan 1b).
  // Cache hits are served immediately; misses go to `input.evaluator` (a worker
  // pool) when present, else run in-process. Order-preserving; null = sim error.
  const resultCache = bundle?.resultCache ?? new Map<string, TeamResult | null>();
  const evalTeams = async (
    teams: string[][],
  ): Promise<(TeamResult | null)[]> => {
    const out: (TeamResult | null)[] = new Array(teams.length);
    const missTeams: string[][] = [];
    const missIdx: number[] = [];
    teams.forEach((t, i) => {
      const k = t.join(',');
      if (resultCache.has(k)) out[i] = resultCache.get(k)!;
      else {
        missTeams.push(t);
        missIdx.push(i);
      }
    });
    if (missTeams.length) {
      const got = input.evaluator
        ? await input.evaluator(missTeams)
        : missTeams.map(localEval);
      got.forEach((r, k) => {
        resultCache.set(missTeams[k].join(','), r ?? null);
        out[missIdx[k]] = r ?? null;
      });
      capMap(resultCache, MAX_TEAM_ENTRIES);
    }
    return out;
  };

  // rough solo score to prune the (large) B3 DPS pool. Supports (B1/B2) are
  // kept wholesale — they score poorly solo but enable teams. DELIBERATELY the
  // 5-COPY sim, not a 1-unit sim (item 3a revisited): the plan drafted 1-unit
  // (22/24 identical top-24, ~3× cheaper), but a unit's ally-buffs apply to its
  // own copies, so the 5-copy metric prices support-B3s' self-synergy — with
  // 1-unit ranks the legacy seed never reaches the support-B3 basin and bestTeam
  // measurably lost 5.7% score on the no-meta bench. A failed sim warns once
  // instead of silently caching 0.
  const soloCache = bundle?.soloCache ?? new Map<string, number>();
  const soloWarned = new Set<string>();
  const warnSolo = (slug: string): void => {
    if (soloWarned.has(slug)) return;
    soloWarned.add(slug);
    console.warn(`teamcalc: solo sim failed for ${slug} — score 0`);
  };
  // Warm solo scores for `slugs` in ONE batch (through the evaluator when present)
  // so buildPool/canonicalFocus can read them synchronously without blocking.
  const warmSolo = async (slugs: string[]): Promise<void> => {
    const miss = slugs.filter((s) => !soloCache.has(s) && chars[s]);
    if (!miss.length) return;
    const results = await evalTeams(miss.map((s) => [s, s, s, s, s]));
    results.forEach((r, i) => {
      if (!r) warnSolo(miss[i]);
      soloCache.set(miss[i], r ? r.units[0].totalDamage : 0);
    });
  };
  const soloScore = (slug: string): number => {
    const hit = soloCache.get(slug);
    if (hit !== undefined) return hit;
    let v = 0;
    try {
      v = simTeam([slug, slug, slug, slug, slug]).units[0].totalDamage;
    } catch {
      warnSolo(slug);
      v = 0;
    }
    soloCache.set(slug, v);
    return v;
  };

  // --- canonical focus + set-keyed evaluation (perf plan item 2) -------------
  // The search's focus for a team: the highest-solo-score charge unit (SR/RL) in
  // the set, else none (no charge unit → focus bonus is inert). Deterministic and
  // order-independent — replaces "whoever landed in the middle slot". soloScore
  // must be warmed first (warmSolo), so this never re-enters the sim.
  const canonicalFocus = (set: string[]): string | undefined => {
    let best: string | undefined;
    let bestV = -Infinity;
    for (const s of set) {
      if (!isChargeWeapon(chars, s)) continue;
      const v = soloScore(s);
      if (v > bestV) {
        bestV = v;
        best = s;
      }
    }
    return best;
  };
  // Evaluate SETS: canonicalize each to its (order + search-focus) representative
  // before simming, so every permutation of a set collapses to ONE cache entry and
  // the focused unit is deterministic. The search uses this everywhere (refine,
  // seed comps); warmSolo bypasses it (5-copy solo arrays are already canonical).
  const evalSets = async (
    sets: string[][],
  ): Promise<(TeamResult | null)[]> =>
    evalTeams(sets.map((s) => canonicalTeamOrder(s, chars, canonicalFocus(s))));
  // Final polish on a WINNING team only (≤5 sims): try each charge unit as the
  // camera focus (+ a no-charge-focus arrangement), keep the highest-scoring, and
  // return that arrangement so TeamResult.slugs is the recommended slot order (focus
  // at index 2). The set is unchanged, so meta/synergy/spread factors are constant —
  // maximizing scoreOf picks the best focus. Guarantees score ≥ the search's pick.
  const focusFinalize = async (team: TeamResult): Promise<TeamResult> => {
    const set = team.units.map((u) => u.slug);
    const charge = set.filter((s) => isChargeWeapon(chars, s));
    if (!charge.length) return team; // focus inert — canonical order already final
    const focuses: (string | undefined)[] = [...charge, undefined];
    const arrs = focuses.map((f) => canonicalTeamOrder(set, chars, f));
    const results = await evalTeams(arrs);
    let best = team;
    let bestScore = scoreOf(team);
    for (const r of results) {
      if (!r) continue;
      const sc = scoreOf(r);
      if (sc > bestScore) {
        best = r;
        bestScore = sc;
      }
    }
    return best;
  };

  // --- value table + proxy enumeration (perf plan item 3) --------------------
  // Memoized per (pool + per-slug meta prior); the bundle carries the map so
  // repeated generations reuse it (the marginal sims also hit teamCache). The
  // prior is part of the key because the reference-core support pick depends on
  // it and the shared bundle is keyed only by (cfg, loadout, loadouts).
  const valueTables = bundle?.valueTables ?? new Map<string, ValueTable>();
  const getValueTable = async (pool: string[]): Promise<ValueTable> => {
    const key = [...pool]
      .sort()
      .map((s) => `${s}:${meta ? meta.unitScore(s) : ''}`)
      .join(',');
    const hit = valueTables.get(key);
    if (hit) return hit;
    const vt = await buildValueTable({
      pool,
      effBurst: eb,
      cooldownOf: (s) => chars[s].burstCooldownSec,
      soloValue: soloScore,
      unitPrior: meta ? (s) => meta.unitScore(s) : undefined,
      evalSets,
      cdShort: CD_SHORT,
    });
    valueTables.set(key, vt);
    capMap(valueTables, 8);
    return vt;
  };

  // Enumerate top-K candidate SETS for a pool by sim-free proxy score (item 3b).
  // mustInclude units are guaranteed a spot in their class pool (they may be
  // blocked or pruned out of the B3 cut — an explicit lock wins). Returns [] when
  // the locks don't fit the enumerated shapes (e.g. a pinned double-B1 team) —
  // the caller falls back to the legacy role-fill seed.
  const enumerateCandidates = (
    pool: string[],
    vt: ValueTable,
    mustInclude: string[],
    seedTarget?: number,
  ): string[][] => {
    const poolOf = (b: string) => pool.filter((s) => eb(s) === b);
    const b1s = poolOf('I');
    const b2s = poolOf('II');
    // Λ units go in the B3 dimension (the only Λ, red-hood, is force-pinned to
    // III by effBurst; a future free wildcard would still be fielded as a B3).
    const b3s = [...poolOf('III'), ...poolOf('Λ')];
    for (const s of mustInclude) {
      const b = eb(s);
      const dim = b === 'I' ? b1s : b === 'II' ? b2s : b3s;
      if (!dim.includes(s)) dim.push(s);
    }
    return enumerateTeams({
      poolB1: b1s,
      poolB2: b2s,
      poolB3: b3s,
      cooldownOf: (s) => chars[s].burstCooldownSec,
      value: (s) => vt.values.get(s) ?? soloScore(s),
      mustInclude,
      advantaged: reqEl ? (s) => chars[s].element === reqEl : undefined,
      unitPrior: meta ? (s) => meta.unitScore(s) : undefined,
      metaWeight: META_W,
      synergy,
      spread:
        seedTarget !== undefined && prydwenScore
          ? { unitScore: prydwenScore, target: seedTarget, sigma: SPREAD_SIGMA }
          : undefined,
      cdShort: CD_SHORT,
      cdPair: CD_PAIR,
      topK: ENUM_TOP_K,
    }).map((c) => c.team);
  };

  const buildPool = (extraExclude: Set<string>): string[] => {
    const avail = Object.keys(chars).filter(
      (s) => !blocked.has(s) && !extraExclude.has(s),
    );
    const byBurst = (b: string) => avail.filter((s) => eb(s) === b);
    // Adaptive B3 prune (item 3b): keep the top-`poolB3` by rank PLUS any B3
    // within ADAPTIVE_B3_FRAC of the best solo value — so the pool tracks the
    // roster's actual damage spread instead of a fixed count as it grows.
    const rankedB3 = byBurst('III')
      .map((s) => [s, soloScore(s)] as const)
      .sort((a, b) => b[1] - a[1]);
    const topVal = rankedB3[0]?.[1] ?? 0;
    const topB3 = rankedB3
      .filter(([, v], i) => i < poolB3 || v >= topVal * ADAPTIVE_B3_FRAC)
      .map(([s]) => s);
    // meta-relevant B3s the solo-damage prune drops but top players field anyway
    // (a popular support-DPS can score low solo yet belong in the pool)
    if (meta) {
      const inPool = new Set(topB3);
      for (const s of byBurst('III')) {
        if (!inPool.has(s) && meta.unitScore(s) >= 0.15) topB3.push(s);
      }
    }
    // keep all supports + all Λ (few, often enablers or flex DPS)
    return [...topB3, ...byBurst('I'), ...byBurst('II'), ...byBurst('Λ')];
  };

  // Legacy role-fill seed — since item 3b this is the FALLBACK only, for lock
  // sets the proxy enumeration's shapes can't express (e.g. a pinned double-B1
  // team). Fill 2×B3 (Λ substitutes), then satisfy the B1 and B2 cooldown rule
  // (stageCovered), then best flex. With locked units (mustInclude), pin them
  // first and fill the outstanding needs around them. The B1/B2 fill is
  // cooldown-aware: a ≤20s caster is taken solo, otherwise a ≤40s pair is
  // fielded to alternate — so the seed never emits a team with a lone 40s/60s
  // B1 or B2 that isLegal would reject (gapped rotation).
  const seedTeam = (
    pool: string[],
    mustInclude?: string[],
    target?: number,
  ): string[] => {
    const score = new Map(pool.map((s) => [s, soloScore(s)]));
    const ranked = [...pool].sort(
      (a, b) => (score.get(b) ?? 0) - (score.get(a) ?? 0),
    );
    const team: string[] = [];
    const take = (pred: (s: string) => boolean): string | undefined => {
      // No spread target → unchanged: highest solo score matching the role.
      if (target === undefined || !prydwenScore) {
        const s = ranked.find((x) => !team.includes(x) && pred(x));
        if (s) team.push(s);
        return s;
      }
      // Spread-biased pick: solo score weighted by closeness of the resulting
      // team meta sum to this team's target (soft — damage still leads).
      let bestS: string | undefined;
      let bestK = -Infinity;
      for (const x of pool) {
        if (team.includes(x) || !pred(x)) continue;
        const k =
          (score.get(x) ?? 0) * closeness(teamMetaSum([...team, x]), target);
        if (k > bestK) {
          bestK = k;
          bestS = x;
        }
      }
      if (bestS) team.push(bestS);
      return bestS;
    };
    const isB = (b: string) => (s: string) => eb(s) === b || eb(s) === 'Λ';
    const countStage = (stage: 'I' | 'II' | 'III') =>
      team.filter((s) => eb(s) === stage).length;
    // Fill one burst stage's cooldown need from pool units not yet on the team.
    // Prefers a ≤20s solo caster (leaves the flex free); else a ≤40s pair. When
    // no full cover fits the remaining slots, takes a best-effort single caster
    // and lets isLegal reject the seed rather than emit a gapped rotation.
    const coverStage = (stage: 'I' | 'II') => {
      if (team.length >= 5 || stageCovered(team, chars, stage)) return;
      const cands = ranked.filter((s) => !team.includes(s) && eb(s) === stage);
      const short = cands.filter((s) => chars[s].burstCooldownSec <= CD_SHORT);
      const pair = cands.filter((s) => chars[s].burstCooldownSec <= CD_PAIR);
      if (short.length) team.push(short[0]);
      else if (pair.length >= 2 && team.length + 2 <= 5)
        team.push(pair[0], pair[1]);
      else if (pair.length && team.length + 1 <= 5) team.push(pair[0]);
      else if (cands.length && team.length + 1 <= 5) team.push(cands[0]);
    };
    const locked = (mustInclude ?? []).filter(
      (s, i, a) => chars[s] && a.indexOf(s) === i,
    );
    for (const s of locked) team.push(s);
    while (countStage('III') < NEED.III && team.length < 5) {
      if (!take(isB('III'))) break;
    }
    coverStage('I');
    coverStage('II');
    while (team.length < 5) {
      if (!take(() => true)) break; // flex
    }
    // Boss-weakness rule: if no advantaged (weakness-element) unit made the team,
    // swap the least-critical non-locked slot (flex first) for an advantaged unit
    // that keeps burst coverage legal — so the seed meets the element requirement
    // whenever the pool allows it (else bestTeam rejects it rather than emit a
    // team with no advantaged unit). Each slot tries the advantaged candidates in
    // score order: trying only the single best unit can fail when its burst class
    // fits no open slot (dense always-combo pins can leave only e.g. a B1 and a B3
    // slot open while the best advantaged unit is a B3 — a lower-scored advantaged
    // B1 then fits the B1 slot), so search candidates per slot rather than give up.
    if (reqEl && !team.some((s) => chars[s].element === reqEl)) {
      const want = ranked.filter(
        (s) => !team.includes(s) && chars[s].element === reqEl,
      );
      if (want.length) {
        let swapped = false;
        for (let i = team.length - 1; i >= 0 && !swapped; i--) {
          if (locked.includes(team[i])) continue;
          const orig = team[i];
          for (const w of want) {
            team[i] = w;
            if (isLegal(team, chars)) {
              swapped = true;
              break;
            }
          }
          if (!swapped) team[i] = orig;
        }
      }
    }
    return team.slice(0, 5);
  };

  // local search: swap each slot for a pool alternative, keep improvements. Per
  // slot it now evaluates ALL legal same-class candidates in one batch and applies
  // the single BEST improvement (per-slot argmax), rather than the first one found
  // mid-scan — deterministic (stable tie-break = pool order) and it fans out to the
  // worker pool one slot at a time (perf plan item 1b). `scoreFn` overrides the
  // ranking score (the solo spread passes a target-biased score); defaults to scoreOf.
  const refine = async (
    start: string[],
    pool: string[],
    locked: Set<string>,
    scoreFn?: (r: { teamDamage: number; units: { slug: string }[] }) => number,
  ): Promise<TeamResult> => {
    const score = scoreFn ?? scoreOf;
    let team = start;
    let best =
      (await evalSets([team]))[0] ??
      toResult(simTeam(canonicalTeamOrder(team, chars, canonicalFocus(team))));
    let bestScore = score(best);
    for (let round = 0; round < rounds; round++) {
      let improved = false;
      for (let i = 0; i < 5; i++) {
        if (locked.has(team[i])) continue;
        const slotBurst = eb(team[i]);
        // collect every legal same-class candidate for this slot, then batch-sim
        const cands: string[][] = [];
        for (const alt of pool) {
          if (team.includes(alt)) continue;
          // role-restrict: only swap for the same burst class (or Λ either way)
          // — keeps the search cheap without losing meaningful moves
          const altBurst = eb(alt);
          if (altBurst !== slotBurst && altBurst !== 'Λ' && slotBurst !== 'Λ')
            continue;
          const cand = team.slice();
          cand[i] = alt;
          if (!legal(cand)) continue;
          cands.push(cand);
        }
        if (!cands.length) continue;
        const results = await evalSets(cands);
        // argmax over improvements; first candidate (pool order) wins ties
        let pickScore = bestScore;
        let pick: TeamResult | null = null;
        let pickTeam: string[] | null = null;
        for (let k = 0; k < cands.length; k++) {
          const r = results[k];
          if (!r) continue;
          const sc = score(r);
          if (sc > pickScore) {
            pickScore = sc;
            pick = r;
            pickTeam = cands[k];
          }
        }
        if (pick && pickTeam) {
          best = pick;
          bestScore = pickScore;
          team = pickTeam;
          improved = true;
        }
      }
      if (!improved) break;
    }
    return best;
  };

  const bestTeam = async (opts?: {
    exclude?: Set<string>;
    mustInclude?: string[];
    /** ranking-score override (solo spread passes a target-biased score) */
    scoreFn?: (r: { teamDamage: number; units: { slug: string }[] }) => number;
    /** soft prydwen meta-sum target the seed biases toward (solo spread) */
    seedTarget?: number;
  }): Promise<TeamResult | null> => {
    const exclude = opts?.exclude ?? new Set<string>();
    const score = opts?.scoreFn ?? scoreOf;
    // Locked units override the blocked list (an explicit lock wins over a
    // don't-own exclusion), but a unit already used by another team (exclude)
    // can't be locked again. Dedupe + drop unknowns.
    const mustInclude = (opts?.mustInclude ?? []).filter(
      (s, i, a) => chars[s] && !exclude.has(s) && a.indexOf(s) === i,
    );
    // Warm every candidate's solo score in ONE batch first, so buildPool's B3
    // prune + seedTeam's ranking read soloCache synchronously (perf plan 1b).
    await warmSolo(
      Object.keys(chars).filter((s) => !blocked.has(s) && !exclude.has(s)),
    );
    const pool = buildPool(exclude);
    const locked = new Set(mustInclude);
    // Proxy-enumeration pipeline (item 3b): value table → enumerate every legal
    // shape and keep the top-K by sim-free proxy → sim the best ENUM_SIM_TOP →
    // refine the best ENUM_REFINE_TOP by REAL score. Replaces the role-fill
    // seed + the old b2Seed special case: double-B2 shapes are a first-class
    // enumeration dimension now, competing on proxy score instead of needing a
    // biased re-seed. Double-B1 stays excluded from the shapes (Burst I is the
    // scarcest required role — topTeams-role-bound.test.ts pins that team count
    // tracks the Burst-I count); double-B1 teams remain reachable via locks.
    let best: TeamResult | null = null;
    let bestScore = -Infinity;
    const vt = await getValueTable(pool);
    const cands = enumerateCandidates(pool, vt, mustInclude, opts?.seedTarget);
    if (cands.length) {
      // SHAPE STRATIFICATION: refine is role-restricted (a B2 slot only swaps
      // to a B2), so it can never move between the two legal shapes — and an
      // additive proxy can't price a second support's diminishing return, so
      // one shape crowds the other out of a plain top-N cut entirely (measured
      // both directions on the no-meta bench as the value metric varied). Split
      // the sim budget between the shapes and refine the best of EACH, so both
      // basins are always explored (the data-driven form of the old seed +
      // b2Seed pair).
      const shapeOf = (set: string[]): number =>
        set.filter((s) => eb(s) === 'II').length; // 1 or 2
      const byShape = [1, 2].map((n) => cands.filter((c) => shapeOf(c) === n));
      const half = Math.ceil(ENUM_SIM_TOP / 2);
      const sets: string[][] = [];
      for (const [i, of1] of byShape.entries()) {
        const other = byShape[1 - i];
        const quota = half + Math.max(0, half - other.length);
        sets.push(...of1.slice(0, quota));
      }
      const results = await evalSets(sets);
      const ranked = results
        .map((r, i) => ({ r, set: sets[i] }))
        .filter((x): x is { r: TeamResult; set: string[] } => !!x.r)
        .sort((a, b) => score(b.r) - score(a.r));
      // Refine starts: the best simmed candidate of each shape, plus the legacy
      // role-fill seed as a third, deliberately DIFFERENT basin. The additive
      // proxy can't price complementarity (a support-B3's value only realizes
      // next to the right dealers), so its top candidates cluster in one
      // neighborhood; the greedy seed starts from solo-damage logic instead and
      // measurably rescues teams the proxy buries (no-meta bench: the winning
      // 3-B3 team was outside the proxy's top-150).
      const starts: string[][] = [];
      for (const n of [1, 2]) {
        const top = ranked.find((x) => shapeOf(x.set) === n);
        if (top) starts.push(top.set);
      }
      const legacySeed = seedTeam(pool, mustInclude, opts?.seedTarget);
      const key = (t: string[]) => [...t].sort().join(',');
      if (
        legal(legacySeed) &&
        !starts.some((s) => key(s) === key(legacySeed))
      )
        starts.push(legacySeed);
      for (const { set } of ranked) {
        if (starts.length >= ENUM_REFINE_TOP) break;
        if (!starts.includes(set)) starts.push(set);
      }
      for (const set of starts) {
        const r = await refine(set, pool, locked, score);
        const sc = score(r);
        if (sc > bestScore) {
          best = r;
          bestScore = sc;
        }
      }
    }
    // Fallback: locks that fit no enumerated shape (e.g. a pinned double-B1
    // team) or every candidate sim failing → the legacy role-fill seed.
    if (!best) {
      const seed = seedTeam(pool, mustInclude, opts?.seedTarget);
      if (!legal(seed)) return null; // e.g. everything useful blocked
      best = await refine(seed, pool, locked, score);
      bestScore = score(best);
    }
    // full-team match: evaluate the popular ranker comps directly (one batch) so a
    // real meta team can win on score even if the local search never assembled it.
    if (meta) {
      const comps = meta.seedComps.filter(
        (comp) =>
          comp.length === 5 &&
          !comp.some((s) => !chars[s] || blocked.has(s) || exclude.has(s)) &&
          !mustInclude.some((s) => !comp.includes(s)) &&
          legal(comp),
      );
      if (comps.length) {
        const results = await evalSets(comps);
        for (const r of results) {
          if (!r) continue;
          const sc = score(r);
          if (sc > bestScore) {
            best = r;
            bestScore = sc;
          }
        }
      }
    }
    // Focus post-pass on the winner: re-focus for the best camera slot (item 2).
    return focusFinalize(best);
  };

  return {
    bestTeam,
    /**
     * Top-N teams that share no characters (greedy-sequential). Optionally pin
     * units to specific teams (`pinnedByTeam[t]` must appear in team t) and/or
     * require generic "must-use" units somewhere (`mustUse`, spread across teams
     * by assignMustUse). Units reserved for a later team are excluded from the
     * earlier teams' pools so team 1 can't consume a unit team 3 pinned.
     *
     * `spreadTargets` (solo roster generator, needs `prydwenScore` on the input):
     * a soft prydwen meta-sum target per team slot. Team i's seed + local search
     * bias toward `spreadTargets[i]` so the roster slopes gently downward (e.g.
     * 19/18/17/17/15) instead of stacking. Soft — damage, legality and pinned
     * locks outrank the target. Omit → unchanged greedy (no shaping).
     */
    topTeams: async (
      n: number,
      opts?: {
        pinnedByTeam?: string[][];
        mustUse?: string[];
        spreadTargets?: number[];
      },
    ): Promise<TeamResult[]> => {
      const pinned = opts?.pinnedByTeam ?? [];
      const assigned = assignMustUse(opts?.mustUse ?? [], pinned, chars, n);
      const reserved: string[][] = Array.from({ length: n }, (_, i) => [
        ...(pinned[i] ?? []),
        ...assigned.assigned[i],
      ]);
      const targets = opts?.spreadTargets;
      const used = new Set<string>();
      const out: TeamResult[] = [];
      for (let i = 0; i < n; i++) {
        const exclude = new Set(used);
        for (let j = i + 1; j < n; j++)
          for (const s of reserved[j]) exclude.add(s);
        const target = targets?.[i];
        const shaped = target !== undefined && prydwenScore;
        const scoreFn = shaped
          ? (r: { teamDamage: number; units: { slug: string }[] }) =>
              scoreOf(r) *
              closeness(teamMetaSum(r.units.map((u) => u.slug)), target)
          : undefined;
        const t = await bestTeam({
          exclude,
          mustInclude: reserved[i],
          scoreFn,
          seedTarget: shaped ? target : undefined,
        });
        if (!t) break;
        out.push(t);
        t.slugs.forEach((s) => used.add(s));
      }
      return out;
    },
    /** Best team built around a pinned unit + that unit's line in it. */
    characterAnalysis: async (
      slug: string,
    ): Promise<{ team: TeamResult; unit: TeamUnit } | null> => {
      const team = await bestTeam({ mustInclude: [slug] });
      if (!team) return null;
      const unit = team.units.find((u) => u.slug === slug)!;
      return { team, unit };
    },
    simTeam,
    /** In-process sim → TeamResult (null on error). The pool worker's leaf op —
     *  a stateless sim executor calls this per team (perf plan item 1b). */
    simTeamResult: (team: string[]): TeamResult | null => localEval(team),
    /** Canonical SET sim (perf plan item 2): TeamResult for a set, order-independent
     *  — every permutation maps to one representative (canonical order + the set's
     *  canonical charge focus) and hits a single cache entry. Warms solo scores so
     *  the focus pick is stable. */
    async simSet(set: string[]): Promise<TeamResult | null> {
      await warmSolo(set);
      return (await evalSets([set]))[0];
    },
  };
}
