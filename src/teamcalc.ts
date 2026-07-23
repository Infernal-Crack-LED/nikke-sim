// Team / roster / character-analysis search. Filesystem-free (takes data
// objects) like runSim, so the web app and CLI share it. It only READS the
// engine (runSim/prepareTeam) — never modifies it.
//
// Team legality mirrors the site's rule: 1×Burst I, 1×Burst II, 2×Burst III +
// 1 flex, with Λ acting as a wildcard for any burst slot. The B1/B2 casters must
// also sustain the rotation: a ≤20s unit solo, or a ≤40s pair alternating — a
// lone 40s/60s B1 or B2 can't burst every Full Burst cycle (see stageCovered).
//
// The search is a heuristic (team optimisation is a big space): rough-score
// every candidate solo to prune the DPS pool, build a legal seed team by role,
// then local-swap-refine on FULL-team sims (which capture support synergy). Not
// guaranteed globally optimal — good and fast.
import { runSim } from './engine/sim.js';
import { prepareTeam, type PrepareDeps, type UnitOptions } from './prepare.js';
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
  /** the caller's pins augmented with same-team combo groups (pairs + resolved oneOf) */
  pinnedByTeam: string[][];
  /** combo singles to merge into the caller's mustUse (spread across teams) */
  singles: string[];
  /** combo groups dropped (a required unit was unavailable, pins conflicted, or
   *  the group fit nowhere) — diagnostic only, never surfaced to the user */
  dropped: string[][];
}

/**
 * Fold an AlwaysCombos set onto `teamCount` teams, honoring the user's own pins.
 * Same-team groups (pairs + resolved oneOf) are PINNED together to a team; singles
 * are returned for the caller to spread via assignMustUse. User pins win over
 * combos: a group split across the user's pinned teams is an unresolvable conflict
 * and relaxes. `available` gates which units the search can field (defaults to
 * "modeled in chars"); the caller layers blocked/excluded/synced-eligibility on top.
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

  // Place a same-team group. If any of its units is already pinned, the rest join
  // it on that team (when feasible); pins split across teams relax the group.
  const placeGroup = (group: string[]): void => {
    const uniq = [...new Set(group)];
    if (!uniq.every(avail)) {
      dropped.push(group); // a required unit is unavailable → relax
      return;
    }
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
      if (merged.length <= 5 && locksFeasible(merged, chars))
        pinned[t] = merged;
      else dropped.push(group);
      return;
    }
    // not pinned yet: the feasible team with the most free room (fans groups out)
    let bestT = -1;
    let bestRoom = -1;
    for (let t = 0; t < teamCount; t++) {
      const merged = [...new Set([...pinned[t], ...uniq])];
      if (merged.length > 5 || !locksFeasible(merged, chars)) continue;
      const room = 5 - pinned[t].length;
      if (room > bestRoom) {
        bestRoom = room;
        bestT = t;
      }
    }
    if (bestT < 0) dropped.push(group);
    else pinned[bestT] = [...new Set([...pinned[bestT], ...uniq])];
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
  for (const s of combos.singles ?? []) {
    if (!avail(s)) {
      dropped.push([s]);
      continue;
    }
    const alreadyPinned = pinned.some((team) => team.includes(s));
    if (!alreadyPinned && !singles.includes(s)) singles.push(s);
  }
  return { pinnedByTeam: pinned, singles, dropped };
}

export function makeCalc(input: TeamCalcInput) {
  const { chars, mult, deps } = input;
  const loadout = input.loadout ?? {};
  const blocked = new Set(input.blocked ?? []);
  const poolB3 = input.poolB3 ?? 24;
  const rounds = input.rounds ?? 3;
  const meta = input.meta;
  const META_W = meta?.weight ?? 0;
  const prydwenScore = input.prydwenScore;

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
  // Ranking score: strong co-equal blend of simulated damage and meta prior.
  // Reduces to raw teamDamage when no meta is supplied (backwards-compatible).
  const scoreOf = (r: {
    teamDamage: number;
    units: { slug: string }[];
  }): number =>
    r.teamDamage * (1 + META_W * metaPrior(r.units.map((u) => u.slug)));

  // effective burst class for selection (pins Red Hood → B3; see FORCED_BURST)
  const eb = (s: string) => effBurst(s, chars);
  // per-unit loadout: pin the rotation stage for forced-burst Λ units so the sim
  // rotates Red Hood as a B3, consistent with how selection places her. Uses the
  // per-unit resolver (e.g. 12/12 lines) when supplied, else the uniform loadout.
  const baseLoadout = (slug: string): UnitOptions =>
    input.loadoutFor ? input.loadoutFor(slug) : loadout;
  const unitLoadout = (slug: string) => {
    const forced = FORCED_BURST[slug];
    const lo = baseLoadout(slug);
    return forced ? { ...lo, lambdaStage: LAMBDA_STAGE[forced] } : lo;
  };

  // memoize full-team sims (keyed by ordered slugs) and solo scores so repeated
  // bestTeam calls (topTeams) and refine rounds don't re-sim the same teams.
  const teamCache = new Map<string, ReturnType<typeof runSim>>();
  const simTeam = (slugs: string[]) => {
    const key = slugs.join(',');
    const hit = teamCache.get(key);
    if (hit) return hit;
    const cs = slugs.map((s) => chars[s]);
    const prepared = prepareTeam(cs, slugs.map(unitLoadout), deps);
    const r = runSim(cs, mult, { ...input.cfg, slugs } as SimConfig, prepared);
    teamCache.set(key, r);
    return r;
  };

  // rough solo score to prune the (large) B3 DPS pool. Supports (B1/B2) are
  // kept wholesale — they score poorly solo but enable teams.
  const soloCache = new Map<string, number>();
  const soloScore = (slug: string): number => {
    const hit = soloCache.get(slug);
    if (hit !== undefined) return hit;
    let v = 0;
    try {
      v = simTeam([slug, slug, slug, slug, slug]).units[0].totalDamage;
    } catch {
      v = 0;
    }
    soloCache.set(slug, v);
    return v;
  };

  const buildPool = (extraExclude: Set<string>): string[] => {
    const avail = Object.keys(chars).filter(
      (s) => !blocked.has(s) && !extraExclude.has(s),
    );
    const byBurst = (b: string) => avail.filter((s) => eb(s) === b);
    const topB3 = byBurst('III')
      .map((s) => [s, soloScore(s)] as const)
      .sort((a, b) => b[1] - a[1])
      .slice(0, poolB3)
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

  // legal seed by role: fill 2×B3 (Λ substitutes), then satisfy the B1 and B2
  // cooldown rule (stageCovered), then best flex. With locked units
  // (mustInclude), pin them first and fill the outstanding needs around them.
  // The B1/B2 fill is cooldown-aware: a ≤20s caster is taken solo, otherwise a
  // ≤40s pair is fielded to alternate — so the seed never emits a team with a
  // lone 40s/60s B1 or B2 that isLegal would reject (gapped rotation).
  const seedTeam = (
    pool: string[],
    mustInclude?: string[],
    flexStage?: 'I' | 'II',
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
    // Optional double-support flex: seed the flex as an extra B1/B2 so shapes
    // like B1+B2+B2+B3+B3 get explored — the solo-scored flex below rarely picks
    // a support, and refine is role-restricted so it can't promote a B3 flex.
    if (flexStage && team.length < 5) take((s) => eb(s) === flexStage);
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

  // local search: swap each slot for a pool alternative, keep improvements.
  // `scoreFn` overrides the ranking score (the solo spread passes a target-biased
  // score); defaults to scoreOf so other callers are unchanged.
  const refine = (
    start: string[],
    pool: string[],
    locked: Set<string>,
    scoreFn?: (r: { teamDamage: number; units: { slug: string }[] }) => number,
  ): TeamResult => {
    const score = scoreFn ?? scoreOf;
    let team = start;
    let best = simTeam(team);
    let bestScore = score(best);
    for (let round = 0; round < rounds; round++) {
      let improved = false;
      for (let i = 0; i < 5; i++) {
        if (locked.has(team[i])) continue;
        const slotBurst = eb(team[i]);
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
          const r = simTeam(cand);
          const sc = score(r);
          if (sc > bestScore) {
            best = r;
            bestScore = sc;
            team = cand;
            improved = true;
          }
        }
      }
      if (!improved) break;
    }
    return toResult(best);
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

  const bestTeam = (opts?: {
    exclude?: Set<string>;
    mustInclude?: string[];
    /** ranking-score override (solo spread passes a target-biased score) */
    scoreFn?: (r: { teamDamage: number; units: { slug: string }[] }) => number;
    /** soft prydwen meta-sum target the seed biases toward (solo spread) */
    seedTarget?: number;
  }): TeamResult | null => {
    const exclude = opts?.exclude ?? new Set<string>();
    const score = opts?.scoreFn ?? scoreOf;
    // Locked units override the blocked list (an explicit lock wins over a
    // don't-own exclusion), but a unit already used by another team (exclude)
    // can't be locked again. Dedupe + drop unknowns.
    const mustInclude = (opts?.mustInclude ?? []).filter(
      (s, i, a) => chars[s] && !exclude.has(s) && a.indexOf(s) === i,
    );
    const pool = buildPool(exclude);
    const seed = seedTeam(pool, mustInclude, undefined, opts?.seedTarget);
    if (!legal(seed)) return null; // e.g. everything useful blocked
    const locked = new Set(mustInclude);
    let best = refine(seed, pool, locked, score);
    let bestScore = score(best);
    // Double-B2 shapes (B1+B2+B2+2×B3) are common optimal teams, but the
    // solo-scored flex rarely picks a support and refine is role-restricted (it
    // can't turn a B3 flex into a B2). Re-seed with the flex biased to an extra
    // B2 so those shapes compete on score. Burst I is deliberately NOT biased
    // here: it's the scarcest required role, so letting one team hoard a second
    // B1 would starve the rest of a disjoint roster (topTeams-role-bound.test.ts
    // pins that team count tracks the Burst-I count). Double-B1 teams remain
    // reachable via locked units and injected meta comps.
    const b2Seed = seedTeam(pool, mustInclude, 'II', opts?.seedTarget);
    if (legal(b2Seed)) {
      const r = refine(b2Seed, pool, locked, score);
      const sc = score(r);
      if (sc > bestScore) {
        best = r;
        bestScore = sc;
      }
    }
    // full-team match: evaluate the popular ranker comps directly so a real meta
    // team can win on score even if the local search never assembled it.
    if (meta) {
      for (const comp of meta.seedComps) {
        if (
          comp.length !== 5 ||
          comp.some((s) => !chars[s] || blocked.has(s) || exclude.has(s)) ||
          mustInclude.some((s) => !comp.includes(s)) ||
          !legal(comp)
        )
          continue;
        const r = toResult(simTeam(comp));
        const sc = score(r);
        if (sc > bestScore) {
          best = r;
          bestScore = sc;
        }
      }
    }
    return best;
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
    topTeams: (
      n: number,
      opts?: {
        pinnedByTeam?: string[][];
        mustUse?: string[];
        spreadTargets?: number[];
      },
    ): TeamResult[] => {
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
        const t = bestTeam({
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
    characterAnalysis: (
      slug: string,
    ): { team: TeamResult; unit: TeamUnit } | null => {
      const team = bestTeam({ mustInclude: [slug] });
      if (!team) return null;
      const unit = team.units.find((u) => u.slug === slug)!;
      return { team, unit };
    },
    simTeam,
  };
}
