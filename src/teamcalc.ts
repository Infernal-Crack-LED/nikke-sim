// Team / roster / character-analysis search. Filesystem-free (takes data
// objects) like runSim, so the web app and CLI share it. It only READS the
// engine (runSim/prepareTeam) — never modifies it.
//
// Team legality mirrors the site's rule: 1×Burst I, 1×Burst II, 2×Burst III +
// 1 flex, with Λ acting as a wildcard for any burst slot.
//
// The search is a heuristic (team optimisation is a big space): rough-score
// every candidate solo to prune the DPS pool, build a legal seed team by role,
// then local-swap-refine on FULL-team sims (which capture support synergy). Not
// guaranteed globally optimal — good and fast.
import { runSim } from './engine/sim.js';
import { prepareTeam, type PrepareDeps, type UnitOptions } from './prepare.js';
import type { CharacterData, LevelMultiplier, SimConfig } from './types.js';

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
  blocked?: string[]; // excluded slugs (don't-own)
  /** DPS-pool prune size (top-N B3 by solo score). Higher = slower, more thorough. */
  poolB3?: number;
  /** Max local-search rounds. */
  rounds?: number;
  /** Meta-popularity bias for the active boss weakness (omit = pure damage). */
  meta?: MetaScoring;
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
const LAMBDA_STAGE: Record<'I' | 'II' | 'III', 1 | 2 | 3> = { I: 1, II: 2, III: 3 };
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

/** 5 distinct units that can cover 1×BI, 1×BII, 2×BIII with Λ as wildcards. */
function isLegal(slugs: string[], chars: Record<string, Char>): boolean {
  if (slugs.length !== 5 || new Set(slugs).size !== 5) return false;
  const c: Record<string, number> = { I: 0, II: 0, III: 0, 'Λ': 0 };
  for (const s of slugs) c[effBurst(s, chars)]++;
  return (c['Λ'] ?? 0) >= deficits(c);
}

export function makeCalc(input: TeamCalcInput) {
  const { chars, mult, deps } = input;
  const loadout = input.loadout ?? {};
  const blocked = new Set(input.blocked ?? []);
  const poolB3 = input.poolB3 ?? 24;
  const rounds = input.rounds ?? 3;
  const meta = input.meta;
  const META_W = meta?.weight ?? 0;

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
  const scoreOf = (r: { teamDamage: number; units: { slug: string }[] }): number =>
    r.teamDamage * (1 + META_W * metaPrior(r.units.map((u) => u.slug)));

  // effective burst class for selection (pins Red Hood → B3; see FORCED_BURST)
  const eb = (s: string) => effBurst(s, chars);
  // per-unit loadout: pin the rotation stage for forced-burst Λ units so the sim
  // rotates Red Hood as a B3, consistent with how selection places her.
  const unitLoadout = (slug: string) => {
    const forced = FORCED_BURST[slug];
    return forced ? { ...loadout, lambdaStage: LAMBDA_STAGE[forced] } : loadout;
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

  // legal seed by role: fill 2×B3, 1×B1, 1×B2 (Λ substitutes), then best flex
  const seedTeam = (pool: string[], mustInclude?: string): string[] => {
    const score = new Map(pool.map((s) => [s, soloScore(s)]));
    const ranked = [...pool].sort(
      (a, b) => (score.get(b) ?? 0) - (score.get(a) ?? 0),
    );
    const team: string[] = [];
    const take = (pred: (s: string) => boolean) => {
      const s = ranked.find((x) => !team.includes(x) && pred(x));
      if (s) team.push(s);
    };
    if (mustInclude && chars[mustInclude]) team.push(mustInclude);
    const isB = (b: string) => (s: string) =>
      eb(s) === b || eb(s) === 'Λ';
    take(isB('III'));
    take(isB('III'));
    take(isB('I'));
    take(isB('II'));
    take(() => true); // flex
    return team.slice(0, 5);
  };

  // local search: swap each slot for a pool alternative, keep improvements
  const refine = (
    start: string[],
    pool: string[],
    locked: Set<string>,
  ): TeamResult => {
    let team = start;
    let best = simTeam(team);
    let bestScore = scoreOf(best);
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
          if (!isLegal(cand, chars)) continue;
          const r = simTeam(cand);
          const sc = scoreOf(r);
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
    mustInclude?: string;
  }): TeamResult | null => {
    const exclude = opts?.exclude ?? new Set<string>();
    const pool = buildPool(exclude);
    const seed = seedTeam(pool, opts?.mustInclude);
    if (!isLegal(seed, chars)) return null; // e.g. everything useful blocked
    const locked = opts?.mustInclude
      ? new Set([opts.mustInclude])
      : new Set<string>();
    let best = refine(seed, pool, locked);
    let bestScore = scoreOf(best);
    // full-team match: evaluate the popular ranker comps directly so a real meta
    // team can win on score even if the local search never assembled it.
    if (meta) {
      for (const comp of meta.seedComps) {
        if (
          comp.length !== 5 ||
          comp.some((s) => !chars[s] || blocked.has(s) || exclude.has(s)) ||
          (opts?.mustInclude && !comp.includes(opts.mustInclude)) ||
          !isLegal(comp, chars)
        ) continue;
        const r = toResult(simTeam(comp));
        const sc = scoreOf(r);
        if (sc > bestScore) { best = r; bestScore = sc; }
      }
    }
    return best;
  };

  return {
    bestTeam,
    /** Top-N teams that share no characters (greedy-sequential). */
    topTeams: (n: number): TeamResult[] => {
      const used = new Set<string>();
      const out: TeamResult[] = [];
      for (let i = 0; i < n; i++) {
        const t = bestTeam({ exclude: used });
        if (!t) break;
        out.push(t);
        t.slugs.forEach((s) => used.add(s));
      }
      return out;
    },
    /** Best team built around a pinned unit + that unit's line in it. */
    characterAnalysis: (slug: string): { team: TeamResult; unit: TeamUnit } | null => {
      const team = bestTeam({ mustInclude: slug });
      if (!team) return null;
      const unit = team.units.find((u) => u.slug === slug)!;
      return { team, unit };
    },
    simTeam,
  };
}
